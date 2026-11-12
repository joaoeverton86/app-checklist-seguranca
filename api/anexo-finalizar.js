// api/anexo-finalizar.js
// Passo 2 do envio de anexo: depois que o navegador já enviou o arquivo direto
// pro Google Drive (ver anexo-iniciar.js), esta function marca o arquivo como
// "qualquer um com o link pode visualizar" - assim quem abrir o painel
// consegue ver o PDF/foto sem precisar estar logado na mesma conta Google
// usada na integração. Se isso falhar, o arquivo continua salvo normalmente
// no Drive, só não fica acessível por link até alguém compartilhar manualmente.

import { autenticarAnexos, exigirModulo, moduloTabela, responderErroAnexo, validarSessaoAnexo } from '../lib/autorizacao-anexos.js';
import { metadadosDrive, tokenGoogle } from '../lib/drive-anexos.js';
import { falhaRemota, idDriveValido } from '../lib/urls-remotas.js';

async function obterAccessToken() { return tokenGoogle(); }

export default async function handler(req, res) {
    res.setHeader('Cache-Control','no-store');
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }
    const { driveFileId, sessionTicket, confirmarCompartilhamento } = req.body || {};
    if (!idDriveValido(driveFileId)) {
        res.status(400).json({ erro: 'Campo obrigatório: driveFileId' });
        return;
    }
    try {
        const acesso=await autenticarAnexos(req), sessao=validarSessaoAnexo(sessionTicket,acesso.uid);
        const modulo=moduloTabela(sessao.tabela);exigirModulo(acesso,modulo,true);
        if (modulo==='saude') throw falhaRemota(403,'Anexos de Saúde permanecem restritos; compartilhamento público não permitido.');
        if (confirmarCompartilhamento!==true) throw falhaRemota(400,'Confirme explicitamente o compartilhamento público deste arquivo.');
        const accessToken = await obterAccessToken();
        const meta=await metadadosDrive(driveFileId,accessToken), props=meta.appProperties;
        if (meta.mimeType==='application/vnd.google-apps.folder' || !meta.parents?.includes(sessao.pastaId)
            || props?.checklist_uid!==acesso.uid || props?.checklist_nonce!==sessao.nonce || props?.checklist_tabela!==sessao.tabela) {
            throw falhaRemota(403,'Arquivo sem vínculo com esta sessão de envio.');
        }
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
            method: 'POST',
            redirect:'error', signal:AbortSignal.timeout(15000),
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false })
        });
        if (!permRes.ok) {
            throw falhaRemota(502,'Não foi possível compartilhar o arquivo no Drive.');
        }
        res.status(200).json({ ok: true, compartilhado: true });
    } catch (err) {
        responderErroAnexo(res,err);
    }
}
