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

async function chamarDrive(caminho, params = {}, token = null) {
    const url = new URL(`https://www.googleapis.com/drive/v3/${caminho}`);
    Object.entries(params).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null) url.searchParams.set(chave, valor);
    });
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (process.env.GOOGLE_DRIVE_API_KEY_LEITURA) {
        url.searchParams.set('key', process.env.GOOGLE_DRIVE_API_KEY_LEITURA);
    }

    let res = await fetch(url.toString(), { headers });

    // Fallback: se a chamada com Bearer Token falhar e temos a Chave de Leitura pública, tenta via Chave
    if (!res.ok && token && process.env.GOOGLE_DRIVE_API_KEY_LEITURA) {
        const urlFallback = new URL(url.toString());
        urlFallback.searchParams.set('key', process.env.GOOGLE_DRIVE_API_KEY_LEITURA);
        const resFallback = await fetch(urlFallback.toString());
        if (resFallback.ok) {
            return await resFallback.json();
        }
    }

    const dados = await res.json();
    if (!res.ok) throw new Error((dados.error && dados.error.message) || `Erro Drive API (${res.status})`);
    return dados;
}

async function encontrarPastaPorNome(nome, idPai, token) {
    const chaveCache = `${idPai}_${nome}`;
    if (cacheRaizesDinamicas[chaveCache]) return cacheRaizesDinamicas[chaveCache];
    const nomeEscapado = nome.replace(/'/g, "\\'");
    const q = `name='${nomeEscapado}' and mimeType='application/vnd.google-apps.folder' and '${idPai}' in parents and trashed=false`;
    const busca = await chamarDrive('files', { q, fields: 'files(id,name)' }, token);
    if (busca.files && busca.files.length > 0) {
        cacheRaizesDinamicas[chaveCache] = busca.files[0].id;
        return busca.files[0].id;
    }
    return null;
}

async function pastaEhPermitida(pastaId, raizId, token) {
    if (!pastaId || pastaId === raizId) return true;

    // 1. Tenta validação rápida subindo pelos pais (direto e sem varredura em massa)
    try {
        let atual = pastaId;
        for (let i = 0; i < 6; i++) {
            const meta = await chamarDrive(`files/${atual}`, { fields: 'id,parents' }, token);
            const pais = meta.parents || [];
            if (pais.includes(raizId)) return true;
            if (pais.length === 0) break;
            atual = pais[0];
        }
    } catch {
        // Segue para a validação descendo caso o campo parents não esteja exposto
    }

    // 2. Validação descendo a partir da raiz (até 6 níveis)
    const MAX_PROFUNDIDADE = 6;
    let nivelAtual = [raizId];
    for (let profundidade = 0; profundidade < MAX_PROFUNDIDADE; profundidade++) {
        const listas = await Promise.all(nivelAtual.map((id) => chamarDrive('files', {
            q: `'${id}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
            fields: 'files(id)',
            pageSize: 1000
        }, token)));
        const proximosIds = [];
        for (const lista of listas) {
            for (const item of (lista.files || [])) {
                if (item.id === pastaId) return true;
                proximosIds.push(item.id);
            }
        }
        if (proximosIds.length === 0) break;
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

        // Categorias públicas históricas (treinamentos e dds) utilizam a Chave de API de Leitura.
        // Categorias da conta do usuário (checklists, sms_cop, etc.) utilizam o OAuth Bearer Token.
        const ehCategoriaPublica = (categoria === 'treinamentos' || categoria === 'dds');
        const tokenParaUsar = ehCategoriaPublica ? null : accessToken;

        let raizId = RAIZES_ESTATICAS[categoria] || null;

        if (!raizId && accessToken) {
            if (categoria === 'checklists') {
                raizId = await encontrarPastaPorNome('Checklists SST', 'root', accessToken);
                if (!raizId) {
                    const smsCopId = await encontrarPastaPorNome('SMS_COP', 'root', accessToken);
                    if (smsCopId) raizId = await encontrarPastaPorNome('Checklists', smsCopId, accessToken);
                }
                if (!raizId) {
                    raizId = await encontrarPastaPorNome('Checklists_PDFs', 'root', accessToken);
                }
                if (!raizId) {
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
            const permitida = await pastaEhPermitida(idAlvo, raizId, tokenParaUsar);
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
            } catch {
                // Silencioso se escopo de about não estiver aberto
            }
        }

        let pastaNome = categoria;
        let pastaUrl = `https://drive.google.com/drive/folders/${idAlvo}`;
        try {
            const info = await chamarDrive(`files/${idAlvo}`, { fields: 'id,name,webViewLink' }, tokenParaUsar);
            if (info) {
                if (info.name) pastaNome = info.name;
                if (info.webViewLink) pastaUrl = info.webViewLink;
            }
        } catch {
            // Ignora falha em obter nome específico da pasta
        }

        const q = `'${idAlvo}' in parents and trashed = false`;
        const dados = await chamarDrive('files', {
            q,
            fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,modifiedTime)',
            orderBy: 'folder,name desc',
            pageSize: 100,
            pageToken
        }, tokenParaUsar);

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
