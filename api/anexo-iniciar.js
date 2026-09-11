// api/anexo-iniciar.js
// Passo 1 do envio de anexo pro Google Drive: garante que a pasta de destino
// (SMS_COP/<DDSMA ou Treinamentos>/<ano>/<mês>) existe e abre uma "sessão de
// envio retomável" (resumable upload) direto com o Google Drive. O painel
// então envia o arquivo em si direto do navegador pro Google (ver o PUT feito
// em dashboard.js e a function anexo-finalizar.js), sem o arquivo inteiro
// passar por esta function - o limite de 4,5 MB por requisição do Vercel só
// vale pra function em si, não pro envio direto navegador -> Google.

const PASTA_RAIZ = 'SMS_COP';
const SUBPASTA_POR_TABELA = {
    dds_realizados: 'DDSMA',
    treinamentos_realizados: 'Treinamentos'
};

function sanitizarNome(texto) {
    return String(texto).replace(/[\\/:*?"<>|]/g, '_');
}

async function obterAccessToken() {
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
    if (!res.ok) throw new Error('Falha ao renovar access token do Google: ' + (dados.error_description || dados.error || res.status));
    return dados.access_token;
}

async function encontrarOuCriarPasta(nome, idPai, accessToken) {
    const nomeEscapado = nome.replace(/'/g, "\\'");
    const q = encodeURIComponent(`name='${nomeEscapado}' and mimeType='application/vnd.google-apps.folder' and '${idPai}' in parents and trashed=false`);
    const buscaRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const busca = await buscaRes.json();
    if (!buscaRes.ok) throw new Error('Falha ao buscar pasta no Drive: ' + JSON.stringify(busca));
    if (busca.files && busca.files.length > 0) return busca.files[0].id;

    const criarRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder', parents: [idPai] })
    });
    const criada = await criarRes.json();
    if (!criarRes.ok) throw new Error('Falha ao criar pasta no Drive: ' + JSON.stringify(criada));
    return criada.id;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }

    const { tabela, registroChave, nomeArquivo, mimeType } = req.body || {};
    if (!tabela || !registroChave || !nomeArquivo) {
        res.status(400).json({ erro: 'Campos obrigatórios: tabela, registroChave, nomeArquivo' });
        return;
    }
    const subpasta = SUBPASTA_POR_TABELA[tabela];
    if (!subpasta) {
        res.status(400).json({ erro: `Tabela desconhecida: ${tabela}` });
        return;
    }

    try {
        const accessToken = await obterAccessToken();
        const agora = new Date();
        const ano = String(agora.getFullYear());
        const mes = String(agora.getMonth() + 1).padStart(2, '0');

        const idRaiz = await encontrarOuCriarPasta(PASTA_RAIZ, 'root', accessToken);
        const idSubpasta = await encontrarOuCriarPasta(subpasta, idRaiz, accessToken);
        const idAno = await encontrarOuCriarPasta(ano, idSubpasta, accessToken);
        const idMes = await encontrarOuCriarPasta(mes, idAno, accessToken);

        const nomeFinal = `${sanitizarNome(registroChave)}_${sanitizarNome(nomeArquivo)}`;
        const metadata = { name: nomeFinal, parents: [idMes] };

        // A origem que vai fazer o PUT direto pro Google (navegador do usuário).
        // É preciso mandar esse header 'Origin' já nesta requisição de abertura
        // da sessão retomável - é isso que faz o Google liberar CORS pra essa
        // origem na URL de sessão (Location) devolvida logo abaixo. Sem isso, o
        // navegador recebe "blocked by CORS policy" ao tentar enviar o arquivo.
        const origemNavegador = req.headers.origin || `https://${req.headers.host}`;

        const sessaoRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': mimeType || 'application/octet-stream',
                'Origin': origemNavegador
            },
            body: JSON.stringify(metadata)
        });

        if (!sessaoRes.ok) {
            const erroTexto = await sessaoRes.text();
            throw new Error('Falha ao abrir sessão de envio no Drive: ' + erroTexto);
        }
        const uploadUrl = sessaoRes.headers.get('location');
        if (!uploadUrl) throw new Error('O Google não devolveu a URL de envio (Location).');

        res.status(200).json({ uploadUrl });
    } catch (err) {
        console.error('Erro em /api/anexo-iniciar:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao iniciar envio' });
    }
}
