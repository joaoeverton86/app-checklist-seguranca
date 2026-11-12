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

import { falhaRemota, idDriveValido, MAX_PEDACO, validarUrlUpload } from '../lib/urls-remotas.js';
import { autenticarAnexos, exigirModulo, moduloTabela, validarSessaoAnexo } from '../lib/autorizacao-anexos.js';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }

    try {
        const { uploadUrl, chunkBase64, offset, tamanhoTotal, mimeType } = req.body || {};
        const destino = validarUrlUpload(uploadUrl);
        if (typeof chunkBase64 !== 'string' || !chunkBase64.length || chunkBase64.length > Math.ceil(MAX_PEDACO/3)*4
            || chunkBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(chunkBase64)
            || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(tamanhoTotal) || tamanhoTotal <= 0
            || (mimeType !== undefined && (typeof mimeType !== 'string' || mimeType.length > 127 || !/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)))) {
            throw falhaRemota(400, 'Pedaço, posição, tamanho total ou tipo de arquivo inválido.');
        }
        const buffer = Buffer.from(chunkBase64, 'base64');
        if (!buffer.length || buffer.length > MAX_PEDACO || buffer.toString('base64') !== chunkBase64 || offset > tamanhoTotal - buffer.length) {
            throw falhaRemota(400, 'O pedaço não corresponde ao intervalo informado.');
        }
        const fim = offset + buffer.length - 1;
        const acesso=await autenticarAnexos(req), sessao=validarSessaoAnexo(req.body.sessionTicket,acesso.uid);
        exigirModulo(acesso,moduloTabela(sessao.tabela),true);
        if (validarUrlUpload(sessao.uploadUrl).href!==destino.href) throw falhaRemota(403,'A URL não pertence à sessão de envio.');

        const pedacoRes = await fetch(destino.href, {
            method: 'PUT',
            redirect: 'manual',
            signal: AbortSignal.timeout(15000),
            headers: {
                'Content-Length': String(buffer.length),
                'Content-Range': `bytes ${offset}-${fim}/${tamanhoTotal}`,
                'Content-Type': mimeType || 'application/octet-stream'
            },
            body: buffer
        });

        // 308 = "Resume Incomplete" - o Google recebeu este pedaço e está esperando
        // o próximo, ainda não devolve os metadados do arquivo.
        if (pedacoRes.status === 308 && !pedacoRes.headers.get('location')) {
            await pedacoRes.body?.cancel();
            res.status(200).json({ completo: false });
            return;
        }
        // 200/201 = último pedaço recebido, upload concluído - o corpo vem com os
        // campos pedidos na abertura da sessão (fields=id,webViewLink).
        if (pedacoRes.status === 200 || pedacoRes.status === 201) {
            const arquivo = await pedacoRes.json();
            if (!idDriveValido(arquivo?.id)) throw falhaRemota(502, 'Resposta final do Drive sem identificador válido.');
            res.status(200).json({ completo: true, id: arquivo.id, webViewLink: arquivo.webViewLink });
            return;
        }

        await pedacoRes.body?.cancel();
        throw falhaRemota(502, 'Resposta inesperada do Drive ao enviar o pedaço.');
    } catch (err) {
        res.status(err.status || 502).json({ erro: err.status ? err.message : 'Não foi possível enviar o pedaço ao Drive.' });
    }
}
