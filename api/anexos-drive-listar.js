// api/anexos-drive-listar.js
// Lista arquivos e pastas do acervo no Google Drive para o módulo "Acervo (Drive)"
// do painel. Suporta Treinamentos (SCAN), DDSMA (SCAN - DDS), Checklists SST e SMS_COP.
// Utiliza OAuth Bearer Token quando disponível (para acesso total) e faz fallback
// para a Chave de API de leitura (GOOGLE_DRIVE_API_KEY_LEITURA) para pastas públicas.

const RAIZES_ESTATICAS = {
    treinamentos: '1gIjh4Cea8mU_X8hnpgOXkIe8Q1ZnOnCA', // SCAN (Treinamentos)
    dds: '1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms'            // SCAN - DDS (DDSMA)
};

const cacheRaizesDinamicas = {};

async function obterAccessToken() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) return null;
    try {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const dados = await res.json();
        return dados.access_token || null;
    } catch {
        return null;
    }
}

async function chamarDrive(caminho, params, accessToken) {
    const url = new URL(`https://www.googleapis.com/drive/v3/${caminho}`);
    Object.entries(params).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null) url.searchParams.set(chave, valor);
    });
    const headers = {};
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
        url.searchParams.set('key', process.env.GOOGLE_DRIVE_API_KEY_LEITURA);
    }
    const res = await fetch(url.toString(), { headers });
    const dados = await res.json();
    if (!res.ok) throw new Error((dados.error && dados.error.message) || `Erro Drive API (${res.status})`);
    return dados;
}

async function encontrarPastaPorNome(nome, idPai, accessToken) {
    const chaveCache = `${idPai}_${nome}`;
    if (cacheRaizesDinamicas[chaveCache]) return cacheRaizesDinamicas[chaveCache];
    const nomeEscapado = nome.replace(/'/g, "\\'");
    const q = `name='${nomeEscapado}' and mimeType='application/vnd.google-apps.folder' and '${idPai}' in parents and trashed=false`;
    const busca = await chamarDrive('files', { q, fields: 'files(id,name)' }, accessToken);
    if (busca.files && busca.files.length > 0) {
        cacheRaizesDinamicas[chaveCache] = busca.files[0].id;
        return busca.files[0].id;
    }
    return null;
}

async function pastaEhPermitida(pastaId, raizId, accessToken) {
    if (pastaId === raizId) return true;
    const MAX_PROFUNDIDADE = 5;
    let nivelAtual = [raizId];
    for (let profundidade = 0; profundidade < MAX_PROFUNDIDADE; profundidade++) {
        const listas = await Promise.all(nivelAtual.map((id) => chamarDrive('files', {
            q: `'${id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)',
            pageSize: 1000
        }, accessToken)));
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
        const accessToken = await obterAccessToken();

        let raizId = RAIZES_ESTATICAS[categoria] || null;

        if (!raizId && accessToken) {
            if (categoria === 'checklists') {
                raizId = await encontrarPastaPorNome('Checklists SST', 'root', accessToken);
                if (!raizId) {
                    // Fallback 1: pasta SMS_COP/Checklists
                    const smsCopId = await encontrarPastaPorNome('SMS_COP', 'root', accessToken);
                    if (smsCopId) raizId = await encontrarPastaPorNome('Checklists', smsCopId, accessToken);
                }
                if (!raizId) {
                    // Fallback 2: pasta Checklists_PDFs na raiz
                    raizId = await encontrarPastaPorNome('Checklists_PDFs', 'root', accessToken);
                }
                if (!raizId) {
                    // Fallback 3: pasta Checklists na raiz
                    raizId = await encontrarPastaPorNome('Checklists', 'root', accessToken);
                }
            } else if (categoria === 'sms_cop' || categoria === 'documentos') {
                raizId = await encontrarPastaPorNome('SMS_COP', 'root', accessToken);
            }
        }

        if (!raizId) {
            res.status(400).json({ erro: `Categoria não localizada ou sem pasta configurada no Drive: ${categoria}` });
            return;
        }

        const idAlvo = pastaId || raizId;
        if (idAlvo !== raizId) {
            const permitida = await pastaEhPermitida(idAlvo, raizId, accessToken);
            if (!permitida) {
                res.status(403).json({ erro: 'Pasta fora do acervo permitido.' });
                return;
            }
        }

        let usuarioDrive = null;
        if (accessToken) {
            try {
                const about = await chamarDrive('about', { fields: 'user(displayName,emailAddress)' }, accessToken);
                if (about && about.user) {
                    usuarioDrive = about.user.emailAddress || about.user.displayName;
                }
            } catch (eAbout) {
                // Silencioso se escopo de about não estiver aberto
            }
        }

        let pastaNome = categoria;
        let pastaUrl = `https://drive.google.com/drive/folders/${idAlvo}`;
        try {
            const info = await chamarDrive(`files/${idAlvo}`, { fields: 'id,name,webViewLink' }, accessToken);
            if (info) {
                if (info.name) pastaNome = info.name;
                if (info.webViewLink) pastaUrl = info.webViewLink;
            }
        } catch (eInfo) {
            // Ignora falha em obter nome específico da pasta
        }

        const q = `'${idAlvo}' in parents and trashed = false`;
        const dados = await chamarDrive('files', {
            q,
            fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,modifiedTime)',
            orderBy: 'folder,name desc',
            pageSize: 100,
            pageToken
        }, accessToken);

        res.status(200).json({
            categoria,
            pastaId: idAlvo,
            pastaNome,
            pastaUrl,
            raizId,
            usuarioDrive,
            itens: dados.files || [],
            nextPageToken: dados.nextPageToken || null
        });
    } catch (err) {
        console.error('Erro em /api/anexos-drive-listar:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao listar Drive' });
    }
}
