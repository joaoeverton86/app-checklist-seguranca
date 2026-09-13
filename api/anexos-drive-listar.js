// api/anexos-drive-listar.js
// Lista arquivos/pastas do acervo HISTÓRICO do Google Drive (pastas SCAN e
// SCAN - DDS, já compartilhadas como "qualquer pessoa com o link"), pro
// módulo de navegação "Acervo (Drive)" do painel. Somente LEITURA: nunca
// cria, edita ou apaga nada no Drive. Usa uma Chave de API do Google
// (env var GOOGLE_DRIVE_API_KEY_LEITURA), separada das credenciais OAuth
// usadas pro upload de anexos novos (essas continuam 100% intactas).

const RAIZES_PERMITIDAS = {
    treinamentos: '1gIjh4Cea8mU_X8hnpgOXkIe8Q1ZnOnCA', // SCAN (Treinamentos)
    dds: '1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms'            // SCAN - DDS (DDSMA)
};

async function chamarDrive(caminho, params) {
    const url = new URL(`https://www.googleapis.com/drive/v3/${caminho}`);
    Object.entries(params).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null) url.searchParams.set(chave, valor);
    });
    url.searchParams.set('key', process.env.GOOGLE_DRIVE_API_KEY_LEITURA);
    const res = await fetch(url.toString());
    const dados = await res.json();
    if (!res.ok) throw new Error((dados.error && dados.error.message) || `Erro Drive API (${res.status})`);
    return dados;
}

// Confirma que a pasta pedida está dentro do acervo permitido, descendo a
// árvore de pastas A PARTIR DA RAIZ (em vez de subir a partir do arquivo) -
// o Google Drive não devolve o campo "parents" de forma confiável em
// chamadas anônimas (só com Chave de API), então validar subindo não
// funciona. A estrutura real só tem 2 níveis abaixo da raiz (ano → mês),
// então essa busca é rápida. Evita que este endpoint vire um "proxy
// aberto" pra ler qualquer pasta pública do Google Drive por fora do
// acervo autorizado.
async function pastaEhPermitida(pastaId, raizId) {
    if (pastaId === raizId) return true;
    const MAX_PROFUNDIDADE = 2;
    let nivelAtual = [raizId];
    for (let profundidade = 0; profundidade < MAX_PROFUNDIDADE; profundidade++) {
        const listas = await Promise.all(nivelAtual.map((id) => chamarDrive('files', {
            q: `'${id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)',
            pageSize: 1000
        })));
        const proximosIds = [];
        for (const lista of listas) {
            for (const item of (lista.files || [])) {
                if (item.id === pastaId) return true;
                proximosIds.push(item.id);
            }
        }
        if (proximosIds.length === 0) return false;
        nivelAtual = proximosIds;
    }
    return false;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }
    try {
        const { categoria, pastaId, pageToken } = req.query;
        const raizId = RAIZES_PERMITIDAS[categoria];
        if (!raizId) {
            res.status(400).json({ erro: `Categoria desconhecida: ${categoria}` });
            return;
        }

        const idAlvo = pastaId || raizId;
        if (idAlvo !== raizId) {
            const permitida = await pastaEhPermitida(idAlvo, raizId);
            if (!permitida) {
                res.status(403).json({ erro: 'Pasta fora do acervo permitido.' });
                return;
            }
        }

        const q = `'${idAlvo}' in parents and trashed = false`;
        const dados = await chamarDrive('files', {
            q,
            fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,modifiedTime)',
            orderBy: 'folder,name desc',
            pageSize: 100,
            pageToken
        });

        res.status(200).json({
            categoria,
            pastaId: idAlvo,
            raizId,
            itens: dados.files || [],
            nextPageToken: dados.nextPageToken || null
        });
    } catch (err) {
        console.error('Erro em /api/anexos-drive-listar:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao listar Drive' });
    }
}
