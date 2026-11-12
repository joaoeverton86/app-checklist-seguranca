// Proxy de imagens do Drive e Storage deste projeto; não é um proxy de URLs livre.
import { buscarImagem, falhaRemota, lerImagemLimitada, resolverImagem } from '../lib/urls-remotas.js';
import { autenticarAnexos } from '../lib/autorizacao-anexos.js';
import { autorizarImagemPrivada } from '../lib/drive-anexos.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
    res.setHeader('Vary','Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido. Use GET.' });
    try {
        const { url, fileId } = resolverImagem(req.query);
        const acesso=await autenticarAnexos(req);
        const signal = AbortSignal.timeout(15000);
        let resposta = await buscarImagem(url, signal);
        if (!resposta.ok && fileId && (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_DRIVE_API_KEY_LEITURA)) {
            await resposta.body?.cancel();
            let token;
            if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
                const r = await fetch('https://oauth2.googleapis.com/token', { method:'POST', redirect:'manual', signal,
                    headers:{'Content-Type':'application/x-www-form-urlencoded'},
                    body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,
                        refresh_token:process.env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}).toString() });
                if (r.ok) token = (await r.json()).access_token;
            }
            if (token) await autorizarImagemPrivada(fileId,acesso,token);
            const api = new URL('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId));
            api.searchParams.set('alt','media');
            if (!token && process.env.GOOGLE_DRIVE_API_KEY_LEITURA) api.searchParams.set('key',process.env.GOOGLE_DRIVE_API_KEY_LEITURA);
            // Não encaminhar Bearer aos saltos de um redirecionamento.
            resposta = await fetch(api,{redirect:'manual',signal,headers:token ? {Authorization:'Bearer '+token} : {}});
            if (resposta.status >= 300 && resposta.status < 400) {
                await resposta.body?.cancel(); throw falhaRemota(502,'Redirecionamento inesperado da API do Drive.');
            }
        }
        if (!resposta.ok) {
            await resposta.body?.cancel();
            throw falhaRemota(502,'Não foi possível obter a imagem no serviço de origem.');
        }
        const { buffer, tipo } = await lerImagemLimitada(resposta);
        res.setHeader('Content-Type',tipo);
        res.setHeader('Cache-Control','private, no-store');
        return res.status(200).send(buffer);
    } catch (erro) {
        return res.status(erro.status || 502).json({erro:erro.status ? erro.message : 'Falha ao obter imagem no serviço de origem.'});
    }
}
