import { createHash, createHmac, randomUUID } from 'node:crypto';
import { autenticarAnexos, exigirModulo, responderErroAnexo } from '../lib/autorizacao-anexos.js';
import { falhaRemota, idDriveValido } from '../lib/urls-remotas.js';

const PROTOCOLO = 'pastas-assinadas-v1';
const SCAN_TREINAMENTOS = '1gIjh4Cea8mU_X8hnpgOXkIe8Q1ZnOnCA';
const SCAN_DDS = '1283y-rY2ePFUGi2FGX26aOUhDY9jz5Ms';
const CATEGORIAS = { '01_Treinamentos': 'treinamentos', '02_DDSMA': 'ddsma', '03_Boas Praticas': 'relatoriosms', '04_Nao Conformidades': 'relatoriosms' };
function texto(v, max = 200) {
    if (typeof v !== 'string' || !v.trim() || v.length > max || /[\x00-\x1f]/.test(v)) throw falhaRemota(400, 'Há campo de pasta inválido.');
    return v.trim();
}
function editar(acesso, modulo) {
    if (acesso.saude) throw falhaRemota(403, 'Este perfil não pode preparar pastas de fotos ou escaneados.');
    try { exigirModulo(acesso, modulo, true); }
    catch (e) { if (e.status !== 403) throw e; exigirModulo(acesso, 'relatoriosms', true); }
}
export function prepararPedidoPastas(body, acesso, raiz) {
    if (!idDriveValido(raiz)) throw falhaRemota(503, 'Raiz oficial de fotos não configurada.');
    const action = body?.action;
    if (action === 'diagnostico') { exigirModulo(acesso, 'relatoriosms', false); return { action }; }
    if (action === 'listarFotosSubpastas') {
        exigirModulo(acesso, 'relatoriosms', false);
        if (!idDriveValido(body.pastaId)) throw falhaRemota(400, 'Informe a pasta do mês.');
        return { action, pastaId: body.pastaId };
    }
    const ano = String(body?.ano || '');
    if (!/^\d{4}$/.test(ano) || Number(ano) < 2000 || Number(ano) > 2100) throw falhaRemota(400, 'Informe um ano válido.');
    const mes = texto(body.mes, 60);
    if (action === 'criar_pasta_fotos') {
        if (body.rootFolderId !== raiz) throw falhaRemota(403, 'Escolha a raiz oficial de fotos.');
        const categoria = texto(body.categoria, 60);
        if (!Object.hasOwn(CATEGORIAS, categoria)) throw falhaRemota(400, 'Categoria de fotos inválida.');
        editar(acesso, CATEGORIAS[categoria]);
        const nome = texto(body.nomePastaFinal);
        if (!new RegExp('^' + ano + '-(0[1-9]|1[0-2]) - ').test(mes)
            || !new RegExp('^' + ano + '-(0[1-9]|1[0-2])-\\d{2} - ').test(nome)
            || mes.slice(0, 7) !== nome.slice(0, 7)) throw falhaRemota(400, 'Confira ano, mês e data da pasta.');
        const dia = nome.slice(0, 10);
        const data = new Date(dia + 'T12:00:00Z');
        if (Number.isNaN(data.valueOf()) || data.toISOString().slice(0, 10) !== dia) throw falhaRemota(400, 'Data de pasta inválida.');
        return { action, rootFolderId: raiz, ano, mes, categoria, nomePastaFinal: nome };
    }
    if (action === 'criarEstruturaCronograma') {
        const root = body.pastaRaizId;
        const modulo = root === SCAN_TREINAMENTOS ? 'treinamentos' : root === SCAN_DDS ? 'ddsma' : root === raiz ? 'relatoriosms' : null;
        if (!modulo) throw falhaRemota(403, 'Raiz de pastas não autorizada.');
        editar(acesso, modulo);
        if (!Array.isArray(body.temas) || !body.temas.length || body.temas.length > 200) throw falhaRemota(400, 'Informe de 1 a 200 temas.');
        const mesNumero = Number(mes.match(/^(\d{2})/)?.[1]);
        if (mesNumero < 1 || mesNumero > 12 || !Number.isInteger(mesNumero)) throw falhaRemota(400, 'Mês inválido.');
        const temas = body.temas.map(t => {
            if (!t || typeof t !== 'object' || Array.isArray(t)) throw falhaRemota(400, 'Há tema inválido no pedido.');
            const dia = texto(t.dia, 10);
            const partes = dia.match(/^(\d{2})\/(\d{2})$/);
            if (!partes || Number(partes[2]) !== mesNumero) throw falhaRemota(400, 'Há tema sem data válida para o mês.');
            const data = `${ano}-${partes[2]}-${partes[1]}`;
            const d = new Date(data + 'T12:00:00Z');
            if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== data) throw falhaRemota(400, 'Data de tema inválida.');
            return { id: typeof t.id === 'string' || Number.isSafeInteger(t.id) ? String(t.id).slice(0, 150) : null, dia, codigo: typeof t.codigo === 'string' ? t.codigo.slice(0, 80) : '', tema: texto(t.tema) };
        });
        return { action, pastaRaizId: root, ano, mes, temas };
    }
    throw falhaRemota(400, 'Ação de pastas inválida.');
}
function destinoScript() {
    const url = process.env.GOOGLE_APPS_SCRIPT_PASTAS_URL;
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url || '')) throw falhaRemota(503, 'Integração de pastas não configurada no servidor.');
    return url;
}
async function lerJson(resposta) {
    if (!resposta.ok || !resposta.body) throw falhaRemota(502, 'Não foi possível consultar a integração de pastas.');
    const reader = resposta.body.getReader(); const partes = []; let bytes = 0;
    try { while (true) { const r = await reader.read(); if (r.done) break; bytes += r.value.byteLength; if (bytes > 2000000) throw falhaRemota(413, 'Pasta muito grande. Consulte uma pasta mensal menor.'); partes.push(Buffer.from(r.value)); } }
    catch (e) { await reader.cancel().catch(() => {}); throw e; }
    finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(partes).toString('utf8')); } catch { throw falhaRemota(502, 'Resposta inválida da integração de pastas.'); }
}
async function chamarScript(url, opcoes) {
    let r = await fetch(url, { ...opcoes, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    // ContentService responde por GET em googleusercontent, sem reapresentar envelope.
    if ([302, 303].includes(r.status)) {
        const destino = new URL(r.headers.get('location'), url);
        await r.body?.cancel();
        if (destino.protocol !== 'https:' || destino.hostname !== 'script.googleusercontent.com' || destino.port || destino.username || destino.password || destino.pathname !== '/macros/echo') throw falhaRemota(502, 'Redirecionamento inesperado da integração.');
        r = await fetch(destino, { redirect: 'error', signal: AbortSignal.timeout(60000) });
    }
    return lerJson(r);
}
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });
    try {
        const acesso = await autenticarAnexos(req);
        const raiz = process.env.GOOGLE_DRIVE_FOTOS_ROOT_ID;
        const data = prepararPedidoPastas(req.body, acesso, raiz);
        const url = destinoScript();
        const segredo = process.env.DRIVE_PASTAS_SIGNING_SECRET;
        if (!segredo || segredo.length < 32) throw falhaRemota(503, 'Autorização da integração ainda não configurada.');
        const protocolo = await chamarScript(url, { method: 'GET' });
        const raizHash = createHash('sha256').update(raiz).digest('hex');
        if (protocolo.protocolo !== PROTOCOLO || protocolo.assinaturaObrigatoria !== true || protocolo.assinaturaConfigurada !== true || protocolo.raizHash !== raizHash) throw falhaRemota(503, 'A integração de pastas aguarda ativação coordenada. Nenhuma pasta foi criada.');
        const envelope = JSON.stringify({ v: 1, uid: acesso.uid, exp: Date.now() + 60000, nonce: randomUUID(), raiz, raizes: [raiz, SCAN_TREINAMENTOS, SCAN_DDS], data });
        const assinatura = createHmac('sha256', segredo).update(envelope).digest('hex');
        // Uma réplica antiga deve cair apenas na consulta de ID inválido, nunca
        // no roteamento legado que cria pastas quando não reconhece a ação.
        const resultado = await chamarScript(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'listarFotosSubpastas', pastaId: 'assinatura:obrigatoria', envelope, assinatura }) });
        if (resultado.status !== 'sucesso') throw falhaRemota(502, 'A integração recusou a operação. Consulte novamente antes de repetir.');
        if (data.action === 'listarFotosSubpastas' && (resultado.somenteLeitura !== true || !Array.isArray(resultado.subpastas))) throw falhaRemota(502, 'Listagem de fotos não confirmada.');
        return res.status(200).json(resultado);
    } catch (e) { return responderErroAnexo(res, e); }
}
