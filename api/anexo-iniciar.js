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
    acervo: 'Acervo',
    documentos: 'Documentos',
    checklists: 'Checklists',
    dds_realizados: 'DDSMA',
    treinamentos_realizados: 'Treinamentos',
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
        const accessToken = await obterAccessToken();
        const agora = new Date();
        const ano = customAno ? String(customAno) : String(agora.getFullYear());
        const mes = customMes ? String(customMes) : String(agora.getMonth() + 1).padStart(2, '0');
        const pastaRaiz = customPastaRaiz || PASTA_RAIZ;

        let idPastaAlvo = pastaDestinoId;
        let idRaizAlvo = null;

        if (!idPastaAlvo) {
            if (pastaRaiz === 'SMS_COP') {
                // Hierarquia padrão SMS_COP / {subpasta} / {ano} / {mes}
                const idRaiz = await encontrarOuCriarPasta(pastaRaiz, 'root', accessToken);
                idRaizAlvo = idRaiz;
                const idSubpasta = await encontrarOuCriarPasta(subpasta, idRaiz, accessToken);
                const idAno = await encontrarOuCriarPasta(ano, idSubpasta, accessToken);
                idPastaAlvo = await encontrarOuCriarPasta(mes, idAno, accessToken);
            } else {
                // Hierarquia dedicada (ex: Checklists SST / {ano} / {mes})
                const idRaiz = await encontrarOuCriarPasta(pastaRaiz, 'root', accessToken);
                idRaizAlvo = idRaiz;
                const idAno = await encontrarOuCriarPasta(ano, idRaiz, accessToken);
                idPastaAlvo = await encontrarOuCriarPasta(mes, idAno, accessToken);
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
        
        let metadata = { name: nomeFinal, parents: [idPastaAlvo] };

        const origemNavegador = req.headers.origin || `https://${req.headers.host}`;

        let sessaoRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
            method: 'POST',
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
            const idRaiz = await encontrarOuCriarPasta(pastaRaiz, 'root', accessToken);
            idRaizAlvo = idRaiz;
            const idSubpasta = await encontrarOuCriarPasta(subpasta, idRaiz, accessToken);
            const idAno = await encontrarOuCriarPasta(ano, idSubpasta, accessToken);
            const idMes = await encontrarOuCriarPasta(mes, idAno, accessToken);
            idPastaAlvo = idMes;
            metadata = { name: nomeFinal, parents: [idMes] };

            sessaoRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
                method: 'POST',
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
            const erroTexto = await sessaoRes.text();
            throw new Error('Falha ao abrir sessão de envio no Drive: ' + erroTexto);
        }
        const uploadUrl = sessaoRes.headers.get('location');
        if (!uploadUrl) throw new Error('O Google não devolveu a URL de envio (Location).');

        res.status(200).json({ 
            uploadUrl,
            emailConta,
            pastaDestinoId: idPastaAlvo,
            pastaDestinoUrl: idPastaAlvo ? `https://drive.google.com/drive/folders/${idPastaAlvo}` : null,
            pastaRaizId: idRaizAlvo,
            pastaRaizUrl: idRaizAlvo ? `https://drive.google.com/drive/folders/${idRaizAlvo}` : null
        });
    } catch (err) {
        console.error('Erro em /api/anexo-iniciar:', err);
        res.status(500).json({ erro: err.message || 'Erro desconhecido ao iniciar envio' });
    }
}
