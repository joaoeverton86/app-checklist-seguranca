// api/anexo-finalizar.js
// Passo 2 do envio de anexo: depois que o navegador já enviou o arquivo direto
// pro Google Drive (ver anexo-iniciar.js), esta function marca o arquivo como
// "qualquer um com o link pode visualizar" - assim quem abrir o painel
// consegue ver o PDF/foto sem precisar estar logado na mesma conta Google
// usada na integração. Se isso falhar, o arquivo continua salvo normalmente
// no Drive, só não fica acessível por link até alguém compartilhar manualmente.

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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }
    const { driveFileId } = req.body || {};
    if (!driveFileId) {
        res.status(400).json({ erro: 'Campo obrigatório: driveFileId' });
        return;
    }
    try {
        const accessToken = await obterAccessToken();
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
        if (!permRes.ok) {
            const erroTexto = await permRes.text();
            throw new Error('Falha ao tornar o arquivo público por link: ' + erroTexto);
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Erro em /api/anexo-finalizar:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao finalizar anexo' });
    }
}
