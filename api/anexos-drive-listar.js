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

// Confirma que a pasta pedida é a raiz permitida ou está dentro dela,
// subindo pela árvore de pais - evita que este endpoint vire um "proxy
// aberto" pra ler qualquer pasta pública do Google Drive por fora do
// acervo autorizado.
async function pastaEhPermitida(pastaId, raizId) {
    if (pastaId === raizId) return true;
    let atual = pastaId;
    for (let i = 0; i < 6; i++) {
        const meta = await chamarDrive(`files/${atual}`, { fields: 'id,parents' });
        const pais = meta.parents || [];
        if (pais.includes(raizId)) return true;
        if (pais.length === 0) return false;
        atual = pais[0];
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
