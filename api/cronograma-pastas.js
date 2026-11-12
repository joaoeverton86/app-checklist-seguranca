import { createHash } from 'node:crypto';
import { autenticarAnexos, exigirModulo } from '../lib/autorizacao-anexos.js';

const MIME = 'application/vnd.google-apps.folder';
const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const hash = valor => createHash('sha256').update(JSON.stringify(valor)).digest('hex');
const normalizar = nome => String(nome).normalize('NFC').toLocaleUpperCase('pt-BR').replace(/\s+[—–-]\s+/g, ' - ').replace(/\s+/g, ' ').trim();
const falha = (status, mensagem) => Object.assign(new Error(mensagem), { status });

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });
    try {
        const { mes, ano, fonte, pastaId, confirmar = false, assinatura } = req.body || {};
        if (!Number.isInteger(mes) || mes < 0 || mes > 11 || !Number.isInteger(ano) || ano < 2000 || ano > 2100 || !['ddsma', 'treinamentos'].includes(fonte) || !/^[\w-]{10,150}$/.test(pastaId || '') || typeof confirmar !== 'boolean') throw falha(400, 'Informe competência, calendário e pasta do mês válidos.');
        const acesso = await autenticarAnexos(req);
        if (acesso.saude) throw falha(403, 'Perfil restrito ao módulo de saúde.');
        try { exigirModulo(acesso, 'relatoriosms', true); }
        catch (err) {
            if (err.status !== 403) throw err;
            exigirModulo(acesso, fonte, true);
        }
        const authorization = req.headers.authorization || '';
        const apikey = process.env.SUPABASE_ANON_KEY || req.headers.apikey;
        if (!authorization.startsWith('Bearer ') || !apikey) throw falha(401, 'Entre com uma conta autenticada para preparar pastas.');
        const base = process.env.SUPABASE_URL || 'https://qqtcwxvbjmybyzubocgd.supabase.co';
        async function banco(caminho, opcoes = {}) {
            const r = await fetch(base + caminho, { ...opcoes, redirect: 'error', headers: { apikey, Authorization: authorization, 'Content-Type': 'application/json', ...opcoes.headers }, signal: AbortSignal.timeout(15000) });
            if (!r.ok) throw falha(r.status === 401 || r.status === 403 ? r.status : 502, 'Não foi possível consultar ou reservar a pasta no sistema.');
            return r.status === 204 ? null : r.json();
        }

        const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const inicio = prefixo + '-01';
        const fim = prefixo + '-' + new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
        const tabela = fonte === 'ddsma' ? 'dds_temas_cronograma' : 'treinamentos_cronograma';
        const data = fonte === 'ddsma' ? 'data' : 'data_prevista';
        const rows = await banco(`/rest/v1/${tabela}?select=*&${data}=gte.${inicio}&${data}=lte.${fim}&order=${data}.asc&limit=201`);
        if (rows.length > 200) throw falha(400, 'Há mais de 200 eventos no mês. Divida a preparação antes de prosseguir.');
        const catalogo = fonte === 'treinamentos' ? await banco('/rest/v1/treinamentos_catalogo?select=id,nome&limit=1000') : [];
        const grupos = new Map();
        for (const row of rows) {
            if (['cancelado', 'cancelada'].includes(String(row.status || '').toLowerCase())) continue;
            const dia = String(row[data] || '').slice(0, 10);
            const tema = String(fonte === 'ddsma' ? row.tema || '' : catalogo.find(c => String(c.id) === String(row.treinamento_cod))?.nome || '').trim();
            if (!tema || tema.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || new Date(dia + 'T12:00:00Z').toISOString().slice(0, 10) !== dia) throw falha(400, 'Há evento com tema ou data inválida. Corrija o cronograma antes de gerar as pastas.');
            const nome = dia.split('-').reverse().join('.') + ' — ' + tema;
            const chave = normalizar(nome);
            if (!grupos.has(chave)) grupos.set(chave, { nome, data: dia, tema, eventos: [] });
            grupos.get(chave).eventos.push(String(row.id));
        }
        const plano = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        plano.forEach(item => item.eventos.sort());
        const versao = hash([pastaId, fonte, mes, ano, plano]);
        if (confirmar && assinatura !== versao) throw falha(409, 'O cronograma mudou. Gere e confira uma nova prévia.');
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) throw falha(503, 'A integração de escrita com o Drive não está configurada.');
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: process.env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }), signal: AbortSignal.timeout(15000) });
        const token = await tokenResp.json();
        if (!tokenResp.ok || !token.access_token) throw falha(503, 'Reconecte a integração com o Google Drive para permitir a criação de pastas.');
        async function drive(caminho, parametros = {}, opcoes = {}) {
            const url = new URL('https://www.googleapis.com/drive/v3/' + caminho);
            for (const [k, v] of Object.entries(parametros)) url.searchParams.set(k, v);
            const r = await fetch(url, { ...opcoes, redirect: 'error', headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000) });
            if (!r.ok) throw falha(r.status === 409 ? 409 : 502, 'Não foi possível consultar ou criar a pasta no Drive.');
            return r.json();
        }
        const listar = async q => {
            const itens = []; let pageToken;
            do {
                const r = await drive('files', { q, fields: 'files(id,name,parents,mimeType,trashed),nextPageToken', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(pageToken ? { pageToken } : {}) });
                itens.push(...r.files); pageToken = r.nextPageToken;
                if (itens.length > 2000) throw falha(400, 'Pasta com muitos itens para esta operação.');
            } while (pageToken);
            return itens;
        };
        let raiz = process.env.GOOGLE_DRIVE_FOTOS_ROOT_ID;
        if (!raiz) {
            const roots = await listar(`name='SST - Fotos & Evidências' and mimeType='${MIME}' and trashed=false`);
            if (roots.length !== 1) throw falha(400, 'Configure a pasta raiz oficial de fotos antes de gerar pastas.');
            raiz = roots[0].id;
        }
        const destino = await drive('files/' + pastaId, { fields: 'id,name,mimeType,parents,trashed', supportsAllDrives: 'true' });
        const esperado = `${String(mes + 1).padStart(2, '0')}_${MESES[mes]}_${ano}`;
        if (destino.mimeType !== MIME || destino.trashed || normalizar(destino.name) !== normalizar(esperado)) throw falha(400, `Escolha a pasta do mês ${esperado}.`);
        let atual = destino; let dentro = false;
        for (let i = 0; i < 12; i++) {
            if (atual.id === raiz || (atual.parents || []).includes(raiz)) { dentro = true; break; }
            if (!atual.parents?.length) break;
            atual = await drive('files/' + atual.parents[0], { fields: 'id,parents', supportsAllDrives: 'true' });
        }
        if (!dentro) throw falha(403, 'A pasta está fora do acervo oficial de fotos.');
        const existentes = await listar(`'${pastaId}' in parents and mimeType='${MIME}' and trashed=false`);
        const resultados = [];
        for (const item of plano) {
            const iguais = existentes.filter(f => normalizar(f.name) === normalizar(item.nome));
            if (iguais.length > 1) throw falha(409, 'Há pastas duplicadas para ' + item.nome + '. Confira no Drive antes de continuar.');
            resultados.push({ ...item, id: iguais[0]?.id || null, situacao: iguais.length ? 'existente' : 'criar' });
        }
        if (!confirmar) return res.status(200).json({ assinatura: versao, pasta: destino.name, itens: resultados });
        // Reserva durável no cadastro existente: chamadas concorrentes usam o mesmo ID Drive.
        for (const item of resultados) {
            if (item.id) continue;
            const id = 'drivepasta_' + hash([pastaId, normalizar(item.nome)]);
            const caminho = '/rest/v1/configuracoes_sistema?id=eq.' + id + '&select=valor';
            let reservas = await banco(caminho);
            if (!reservas.length) {
                const gerado = await drive('files/generateIds', { count: '1', space: 'drive', type: 'files' });
                const valor = { driveId: gerado.ids[0], pastaId, nome: item.nome };
                const gravar = await fetch(base + '/rest/v1/configuracoes_sistema', { method: 'POST', redirect: 'error', headers: { apikey, Authorization: authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, valor, descricao: 'Reserva de pasta do cronograma no Drive', atualizado_em: new Date().toISOString() }), signal: AbortSignal.timeout(15000) });
                if (!gravar.ok && gravar.status !== 409) throw falha(403, 'Não foi possível reservar a pasta. Confira sua permissão de gravação.');
                reservas = await banco(caminho);
            }
            const reserva = reservas[0]?.valor;
            if (!/^[\w-]{10,150}$/.test(reserva?.driveId || '') || reserva.pastaId !== pastaId || normalizar(reserva.nome) !== normalizar(item.nome)) throw falha(409, 'Reserva de pasta inconsistente. Solicite conferência administrativa.');
            try {
                await drive('files', { supportsAllDrives: 'true', fields: 'id' }, { method: 'POST', body: JSON.stringify({ id: reserva.driveId, name: item.nome, mimeType: MIME, parents: [pastaId] }) });
                item.situacao = 'criada';
            } catch (err) {
                // Conflito ou resposta perdida: confirma o mesmo ID, sem criar outro.
                const encontrada = await drive('files/' + reserva.driveId, { fields: 'id,name,parents,trashed,mimeType', supportsAllDrives: 'true' });
                if (encontrada.trashed || encontrada.mimeType !== MIME || !encontrada.parents?.includes(pastaId) || normalizar(encontrada.name) !== normalizar(item.nome)) throw err;
                item.situacao = 'existente';
            }
            item.id = reserva.driveId;
        }
        return res.status(200).json({ assinatura: versao, pasta: destino.name, itens: resultados });
    } catch (err) {
        return res.status(err.status || 502).json({ erro: err.message && err.status ? err.message : 'Falha na preparação. Algumas pastas podem ter sido criadas; consulte a prévia novamente para continuar com segurança.' });
    }
}
