// api/proxy-imagem.js
// Proxy de Imagens e Evidências Fotográficas para o DOCX e Dashboard
// Permite download seguro de imagens externas (Google Drive, Supabase Storage, CDN)
// sem bloqueios de CORS no navegador para embutir no documento Word (.docx).

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ erro: 'Método não permitido. Use GET.' });
    }

    let urlAlvo = req.query.url;
    const driveId = req.query.drive_id || req.query.id;

    if (driveId && !urlAlvo) {
        urlAlvo = `https://lh3.googleusercontent.com/d/${encodeURIComponent(driveId)}`;
    }

    if (!urlAlvo) {
        return res.status(400).json({ erro: 'Parâmetro url ou drive_id é obrigatório.' });
    }

    // Se for URL do Google Drive web link, converte para visualização direta lh3
    if (urlAlvo.includes('drive.google.com/file/d/')) {
        const match = urlAlvo.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            urlAlvo = `https://lh3.googleusercontent.com/d/${encodeURIComponent(match[1])}`;
        }
    } else if (urlAlvo.includes('drive.google.com') && (urlAlvo.includes('id=') || urlAlvo.includes('open?id='))) {
        const match = urlAlvo.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            urlAlvo = `https://lh3.googleusercontent.com/d/${encodeURIComponent(match[1])}`;
        }
    }

    try {
        const resp = await fetch(urlAlvo, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });

        if (!resp.ok) {
            // Se falhar no lh3 e tivermos credenciais do Google Drive, tenta via Drive API
            const matchId = urlAlvo.match(/\/d\/([a-zA-Z0-9_-]+)/);
            const fileId = driveId || (matchId ? matchId[1] : null);
            if (fileId && (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_API_KEY_LEITURA)) {
                try {
                    let token = null;
                    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
                        const tokenParams = new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET,
                            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
                            grant_type: 'refresh_token'
                        });
                        const tResp = await fetch('https://oauth2.googleapis.com/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: tokenParams.toString()
                        });
                        const tDados = await tResp.json();
                        token = tDados.access_token;
                    }

                    const driveUrl = token
                        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
                        : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${process.env.GOOGLE_DRIVE_API_KEY_LEITURA}`;

                    const driveHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const driveResp = await fetch(driveUrl, { headers: driveHeaders });
                    if (driveResp.ok) {
                        const buf = await driveResp.arrayBuffer();
                        const ct = driveResp.headers.get('content-type') || 'image/jpeg';
                        res.setHeader('Content-Type', ct);
                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        return res.status(200).send(Buffer.from(buf));
                    }
                } catch (_) {}
            }

            return res.status(resp.status).json({ erro: `Falha ao obter imagem remota: HTTP ${resp.status}` });
        }

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const buffer = await resp.arrayBuffer();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
        console.error('Erro no proxy de imagem:', e);
        return res.status(502).json({ erro: 'Erro interno ao repassar imagem: ' + (e?.message || e) });
    }
}
