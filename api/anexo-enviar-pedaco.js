// api/anexo-enviar-pedaco.js
// Plano B do envio de anexo: o navegador não fala mais direto com o Google (a
// URL de sessão retomável devolvida por anexo-iniciar.js não libera CORS pro
// domínio do painel - confirmado em produção mesmo depois de mandar o header
// Origin na abertura da sessão). Em vez disso, o navegador manda cada pedaço
// do arquivo (em base64, dentro do limite de 4,5 MB por requisição do Vercel)
// pra esta function, que repassa pro Google via PUT servidor-a-servidor - sem
// CORS, porque CORS só existe entre navegador e servidor, nunca entre dois
// servidores - usando o cabeçalho Content-Range exigido pelo protocolo de
// upload retomável do Drive. Chamada uma vez por pedaço, em sequência, pelo
// navegador (ver enviarArquivoEmPedacos em dashboard.js).

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }

    const { uploadUrl, chunkBase64, offset, tamanhoTotal, mimeType } = req.body || {};
    if (!uploadUrl || chunkBase64 === undefined || chunkBase64 === null || offset === undefined || !tamanhoTotal) {
        res.status(400).json({ erro: 'Campos obrigatórios: uploadUrl, chunkBase64, offset, tamanhoTotal' });
        return;
    }

    try {
        const buffer = Buffer.from(chunkBase64, 'base64');
        const fim = offset + buffer.length - 1;

        const pedacoRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': String(buffer.length),
                'Content-Range': `bytes ${offset}-${fim}/${tamanhoTotal}`,
                'Content-Type': mimeType || 'application/octet-stream'
            },
            body: buffer
        });

        // 308 = "Resume Incomplete" - o Google recebeu este pedaço e está esperando
        // o próximo, ainda não devolve os metadados do arquivo.
        if (pedacoRes.status === 308) {
            res.status(200).json({ completo: false });
            return;
        }
        // 200/201 = último pedaço recebido, upload concluído - o corpo vem com os
        // campos pedidos na abertura da sessão (fields=id,webViewLink).
        if (pedacoRes.status === 200 || pedacoRes.status === 201) {
            const arquivo = await pedacoRes.json();
            res.status(200).json({ completo: true, id: arquivo.id, webViewLink: arquivo.webViewLink });
            return;
        }

        const erroTexto = await pedacoRes.text();
        throw new Error(`Falha ao enviar pedaço pro Drive (HTTP ${pedacoRes.status}): ${erroTexto}`);
    } catch (err) {
        console.error('Erro em /api/anexo-enviar-pedaco:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao enviar pedaço' });
    }
}
