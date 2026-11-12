// api/anexo-iniciar.js
// Passo 1 do envio de anexo pro Google Drive: garante que a pasta de destino
// (SMS_COP/<DDSMA ou Treinamentos>/<ano>/<mês>) existe e abre uma "sessão de
// envio retomável" (resumable upload) direto com o Google Drive. O painel
// então envia o arquivo em si direto do navegador pro Google (ver o PUT feito
// em dashboard.js e a function anexo-finalizar.js), sem o arquivo inteiro
// passar por esta function - o limite de 4,5 MB por requisição do Vercel só
// vale pra function em si, não pro envio direto navegador -> Google.

import { randomUUID } from 'node:crypto';
import { autenticarAnexos, criarSessaoAnexo, exigirModulo, moduloTabela, responderErroAnexo } from '../lib/autorizacao-anexos.js';
import { descendenteDaPasta, exigirPastaRestrita, metadadosDrive, tokenGoogle } from '../lib/drive-anexos.js';
import { falhaRemota, idDriveValido, validarUrlUpload } from '../lib/urls-remotas.js';
const PASTA_RAIZ = 'SMS_COP';
const SUBPASTA_POR_TABELA = {
    acervo: 'Acervo',
    documentos: 'Documentos',
    checklists: 'Checklists',
    dds_realizados: 'DDSMA',
    treinamentos_realizados: 'Treinamentos',
    treinamentos: 'Treinamentos',
    dds: 'DDSMA',
    cipa_reunioes: 'CIPA',
    cipa_processos_eleitorais: 'CIPA',
    epi_entregas: 'EPI',
    extintores_inspecoes: 'Extintores',
    extintores_catalogo: 'Extintores',
    brigada_treinados: 'Brigada_Incendio',
    brigada_membros: 'Brigada_Incendio',
    apr_registros: 'APR',
    saude_ambulatorio: 'Saude_Ocupacional',
    atestados_ocupacionais: 'Saude_Ocupacional',
    aso_exames: 'Saude_Ocupacional',
    residuos_manifestos: 'Meio_Ambiente',
    residuos_refeicoes: 'Meio_Ambiente',
    manutencao_veicular: 'Meio_Ambiente',
    relatorios_mensais: 'Relatorios_Mensais',
    ordens_servico: 'Ordens_de_Servico',
    ordens_servico_entregas: 'Ordens_de_Servico',
    colaboradores_efetivo_os: 'Ordens_de_Servico'
};

function sanitizarNome(texto) {
    return String(texto).replace(/[\\/:*?"<>|]/g, '_');
}



async function encontrarOuCriarPasta(nome, idPai, accessToken, criar = true) {
    if (!idPai) return null;
    const nomeEscapado = nome.replace(/'/g, "\\'");
    const q = encodeURIComponent(`name='${nomeEscapado}' and mimeType='application/vnd.google-apps.folder' and '${idPai}' in parents and trashed=false`);
    const buscaRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` }, redirect:'error', signal:AbortSignal.timeout(15000)
    });
    const busca = await buscaRes.json();
    if (!buscaRes.ok || !Array.isArray(busca.files)) throw falhaRemota(502,'Falha ao consultar pasta no Drive.');
    if (busca.files.length > 1) throw falhaRemota(409,'Mais de uma pasta com o mesmo nome. Confira a configuração do acervo.');
    if (busca.files && busca.files.length > 0) return busca.files[0].id;
    if (!criar) return null;

    const criarRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST', redirect:'error', signal:AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, mimeType: 'application/vnd.google-apps.folder', parents: [idPai] })
    });
    const criada = await criarRes.json();
    if (!criarRes.ok || !idDriveValido(criada.id)) throw falhaRemota(502,'Falha ao criar pasta no Drive.');
    return criada.id;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control','no-store');
    if (req.method !== 'POST') {
        res.status(405).json({ erro: 'Método não permitido' });
        return;
    }

    const { 
        tabela = 'acervo', 
        registroChave, 
        nomeArquivo, 
        mimeType, 
        ano: customAno, 
        mes: customMes, 
        pastaRaiz: customPastaRaiz, 
        nomeFinal: customNomeFinal,
        pastaDestinoId 
    } = req.body || {};

    if (!nomeArquivo && !req.body?.infoOnly) {
        res.status(400).json({ erro: 'Campo obrigatório: nomeArquivo' });
        return;
    }
    const subpasta = SUBPASTA_POR_TABELA[tabela] || 'Acervo';

    try {
        const acesso=await autenticarAnexos(req), modulo=moduloTabela(tabela);
        exigirModulo(acesso,modulo,true);
        if (req.body?.infoOnly && !acesso.admin) throw falhaRemota(403,'Somente o administrador pode consultar a conexão do Drive.');
        if ((!req.body?.infoOnly && (typeof nomeArquivo!=='string' || !nomeArquivo.trim() || nomeArquivo.length>255))
            || (mimeType!==undefined && (typeof mimeType!=='string' || mimeType.length>127 || !/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)))
            || (customNomeFinal!==undefined && (typeof customNomeFinal!=='string' || customNomeFinal.length>255))
            || (customPastaRaiz!==undefined && (typeof customPastaRaiz!=='string' || !customPastaRaiz.trim() || customPastaRaiz.length>120))
            || (registroChave!==undefined && (typeof registroChave!=='string' || registroChave.length>200))
            || (pastaDestinoId!=null && !idDriveValido(pastaDestinoId))) throw falhaRemota(400,'Dados do anexo inválidos.');
        const accessToken = await tokenGoogle();
        const agora = new Date();
        const ano = customAno ? String(customAno) : String(agora.getFullYear());
        const mes = customMes ? String(customMes) : String(agora.getMonth() + 1).padStart(2, '0');
        const pastaRaiz = customPastaRaiz || PASTA_RAIZ;
        if (!/^20\d{2}$/.test(ano) || !/^(?:0?[1-9]|1[0-2])(?:\s*-\s*[A-Za-zÀ-ú ]{1,40})?$/.test(mes)) throw falhaRemota(400,'Competência inválida.');
        if (!acesso.admin && pastaRaiz!=='SMS_COP' && !(modulo==='checklists' && pastaRaiz==='Checklists SST')) throw falhaRemota(403,'Raiz de acervo não autorizada para este perfil.');
        if (pastaDestinoId && !acesso.admin) {
            const raiz=await encontrarOuCriarPasta(pastaRaiz,'root',accessToken,false);
            const base=raiz && (pastaRaiz==='SMS_COP' ? await encontrarOuCriarPasta(subpasta,raiz,accessToken,false) : raiz);
            const legadas={treinamentos:'1gIjh4Cea8mU_X8hnpgOXkIe8Q1ZnOnCA',ddsma:'1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms'};
            const bases=[base,legadas[modulo],modulo==='relatoriosms'?process.env.GOOGLE_DRIVE_FOTOS_ROOT_ID:null].filter(Boolean);
            let permitida=false;
            for (const candidata of bases) if (await descendenteDaPasta(pastaDestinoId,candidata,accessToken)) {permitida=true;break;}
            if (!permitida) throw falhaRemota(403,'Pasta de destino fora do módulo autorizado.');
        }
        if (pastaDestinoId && (await metadadosDrive(pastaDestinoId,accessToken)).mimeType!=='application/vnd.google-apps.folder') throw falhaRemota(400,'O destino não é uma pasta.');

        let idPastaAlvo = pastaDestinoId;
        let idRaizAlvo = null;
        const localizarPasta=async(nome,pai)=>{
            const id=await encontrarOuCriarPasta(nome,pai,accessToken,!req.body?.infoOnly);
            if(id && modulo==='saude')await exigirPastaRestrita(id,accessToken);
            return id;
        };

        if (!idPastaAlvo) {
            if (pastaRaiz === 'SMS_COP') {
                // Hierarquia padrão SMS_COP / {subpasta} / {ano} / {mes}
                const idRaiz = await localizarPasta(pastaRaiz, 'root');
                idRaizAlvo = idRaiz;
                const idSubpasta = await localizarPasta(subpasta, idRaiz);
                const idAno = await localizarPasta(ano, idSubpasta);
                idPastaAlvo = await localizarPasta(mes, idAno);
            } else {
                // Hierarquia dedicada (ex: Checklists SST / {ano} / {mes})
                const idRaiz = await localizarPasta(pastaRaiz, 'root');
                idRaizAlvo = idRaiz;
                const idAno = await localizarPasta(ano, idRaiz);
                idPastaAlvo = await localizarPasta(mes, idAno);
            }
        }

        // Identifica o e-mail da conta Google conectada para diagnóstico
        let emailConta = null;
        try {
            const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (aboutRes.ok) {
                const aboutData = await aboutRes.json();
                emailConta = aboutData.user?.emailAddress || null;
            }
        } catch (_) {}

        // Se for apenas consulta de informações/teste de conexão
        if (req.body && req.body.infoOnly) {
            res.status(200).json({
                ok: true,
                emailConta,
                pastaDestinoId: idPastaAlvo,
                pastaDestinoUrl: idPastaAlvo ? `https://drive.google.com/drive/folders/${idPastaAlvo}` : null,
                pastaRaizId: idRaizAlvo,
                pastaRaizUrl: idRaizAlvo ? `https://drive.google.com/drive/folders/${idRaizAlvo}` : null
            });
            return;
        }

        const nomeFinal = customNomeFinal || (registroChave && registroChave !== 'ACERVO' 
            ? `${sanitizarNome(registroChave)}_${sanitizarNome(nomeArquivo)}` 
            : sanitizarNome(nomeArquivo));
        
        const nonce=randomUUID();
        if(modulo==='saude')await exigirPastaRestrita(idPastaAlvo,accessToken);
        const appProperties={checklist_uid:acesso.uid,checklist_nonce:nonce,checklist_tabela:tabela};
        let metadata = { name: nomeFinal, parents: [idPastaAlvo], appProperties };

        const origemNavegador = req.headers.origin || `https://${req.headers.host}`;

        let sessaoRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
            method: 'POST', redirect:'error', signal:AbortSignal.timeout(15000),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': mimeType || 'application/octet-stream',
                'Origin': origemNavegador
            },
            body: JSON.stringify(metadata)
        });

        // Se falhar ao tentar salvar na pasta direta (ex: permissão na pasta legada), faz fallback pra hierarquia padrão SMS_COP
        if (!sessaoRes.ok && pastaDestinoId) {
            console.warn('Tentativa em pastaDestinoId falhou. Tentando hierarquia padrão SMS_COP...');
            const idRaiz = await localizarPasta(pastaRaiz, 'root');
            idRaizAlvo = idRaiz;
            const idSubpasta = await localizarPasta(subpasta, idRaiz);
            const idAno = await localizarPasta(ano, idSubpasta);
            const idMes = await localizarPasta(mes, idAno);
            idPastaAlvo = idMes;
            metadata = { name: nomeFinal, parents: [idMes], appProperties };

            sessaoRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
                method: 'POST', redirect:'error', signal:AbortSignal.timeout(15000),
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': mimeType || 'application/octet-stream',
                    'Origin': origemNavegador
                },
                body: JSON.stringify(metadata)
            });
        }

        if (!sessaoRes.ok) {
            throw falhaRemota(502,'Falha ao abrir sessão de envio no Drive.');
        }
        const uploadUrl = sessaoRes.headers.get('location');
        if (!uploadUrl) throw new Error('O Google não devolveu a URL de envio (Location).');
        validarUrlUpload(uploadUrl);
        const sessao=criarSessaoAnexo(acesso.uid,tabela,uploadUrl,idPastaAlvo,nonce);

        res.status(200).json({ 
            uploadUrl,
            sessionTicket:sessao.ticket,
            compartilhamentoPublicoPermitido:modulo!=='saude',
            emailConta,
            pastaDestinoId: idPastaAlvo,
            pastaDestinoUrl: idPastaAlvo ? `https://drive.google.com/drive/folders/${idPastaAlvo}` : null,
            pastaRaizId: idRaizAlvo,
            pastaRaizUrl: idRaizAlvo ? `https://drive.google.com/drive/folders/${idRaizAlvo}` : null
        });
    } catch (err) {
        responderErroAnexo(res,err);
    }
}
