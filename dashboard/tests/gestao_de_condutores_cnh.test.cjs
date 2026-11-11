/**
 * dashboard/tests/gestao_de_condutores_cnh.test.cjs
 * =============================================================================
 * SUÍTE DE TESTES COMPORTAMENTAIS E DE INTEGRAÇÃO DOM — GESTÃO DE CONDUTORES CNH
 * =============================================================================
 * Nota metodológica e limites explícitos:
 * - Executa o código REAL de `dashboard/modules/gestao_de_condutores_cnh.js` e os
 *   roteadores reais de `dashboard/dashboard.js` e `dashboard/modules/epi_estoque.js`.
 * - Instrumentação estritamente confinada à VM de teste: o arquivo de produto
 *   `dashboard/modules/gestao_de_condutores_cnh.js` NÃO possui callbacks de teste
 *   (`__testHarnessCallback`) nem parâmetros de data simulada (`dataReferenciaSp`).
 * - Estes testes rodam em memória (`node:vm`) com transporte HTTP/DOM simulado:
 *   NÃO substituem nem comprovam execução em PostgreSQL isolado (constraints SQL,
 *   RLS real e lock `FOR UPDATE`), Auth real no Supabase ou validação visual em
 *   navegador real (que permanecem reportados separadamente como BLOQUEADOS/PENDENTES).
 */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
console.log('🧪 Iniciando Suíte Comportamental: Gestão de Condutores – CNH (v301)');
// -----------------------------------------------------------------------------
// 1. Relógio Controlável no Sandbox (America/Sao_Paulo) e Ambiente DOM Simulado
// -----------------------------------------------------------------------------
let relogioIsoAtual = '2026-11-09T15:00:00.000Z'; // 2026-11-09 12:00:00 em America/Sao_Paulo
const RealDate = Date;
class MockDate extends RealDate {
    constructor(...args) {
        if (args.length === 0) {
            super(relogioIsoAtual);
        } else {
            super(...args);
        }
    }
    static now() {
        return new RealDate(relogioIsoAtual).getTime();
    }
}
function definirRelogioSandbox(isoStr) {
    relogioIsoAtual = isoStr;
    if (typeof dbSimulado !== 'undefined' && dbSimulado.sessaoJwt) {
        dbSimulado.sessaoJwt.expires_at = Math.floor(MockDate.now() / 1000) + 86400 * 30;
    }
}
function obterHojeSpNoSimulador() {
    const d = new MockDate();
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${day}`;
}
const elements = {};
function criarElementoMock(id, tagName = 'div') {
    const el = {
        id: id || '',
        tagName: String(tagName || 'div').toUpperCase(),
        style: { display: '', color: '' },
        dataset: {},
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        textContent: '',
        _innerHTML: '',
        _listeners: {},
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            toggle(c, force) {
                const deveTer = force !== undefined ? Boolean(force) : !this._set.has(c);
                if (deveTer) this._set.add(c);
                else this._set.delete(c);
            },
            contains(c) { return this._set.has(c); }
        },
        getAttribute(attr) {
            if (attr === 'id') return this.id;
            return this._attrs ? this._attrs[attr] || null : null;
        },
        setAttribute(attr, val) {
            if (!this._attrs) this._attrs = {};
            this._attrs[attr] = String(val);
        },
        querySelector(sel) {
            if (sel && sel.startsWith('#')) {
                return elements[sel.slice(1)] || null;
            }
            return null;
        },
        addEventListener(type, fn) {
            if (!this._listeners[type]) this._listeners[type] = [];
            this._listeners[type].push(fn);
        },
        dispatchEvent(ev) {
            const lista = this._listeners[ev.type] || [];
            for (const fn of lista) fn(ev);
        }
    };
    Object.defineProperty(el, 'innerHTML', {
        get() { return this._innerHTML; },
        set(v) {
            this._innerHTML = String(v ?? '');
            sincronizarIdsDoInnerHtml(this._innerHTML, this.id);
        }
    });
    if (id) elements[id] = el;
    return el;
}
function sincronizarIdsDoInnerHtml(html, containerId) {
    const regexTag = /<([a-zA-Z0-9]+)([^>]*?\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)([^>]*?\bid="([^"]+)"[^>]*)\/?>/g;
    let m;
    while ((m = regexTag.exec(html)) !== null) {
        const tag = m[1] || m[5];
        const attrs = m[2] || m[6] || '';
        const id = m[3] || m[7];
        const inner = m[4] || '';
        if (id === containerId) continue;
        // Se estamos apenas sincronizando #condutoresListaContainer ou #condSlotAlteracaoValidadeCnh,
        // cria/atualiza os elementos internos desse slot; se for render completo do page-gestao_de_condutores,
        // recria a instância de elementos de filtro para simular fielmente a perda de referência DOM quando o container inteiro é reescrito!
        let el = elements[id];
        if (!el || containerId === 'page-gestao_de_condutores') {
            el = criarElementoMock(id, tag);
        }
        el._innerHTML = inner;
        el.textContent = inner.replace(/<[^>]+>/g, '').trim();
        el._attrs = {};
        const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
        let am;
        while ((am = attrRegex.exec(attrs)) !== null) {
            el._attrs[am[1]] = am[2];
        }
        const valMatch = attrs.match(/\bvalue="([^"]*)"/);
        if (valMatch) {
            el.value = valMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
        }
    }
}
const pageIds = [
    'checklists', 'extintores', 'relatos', 'treinamentos', 'ddsma', 'efetivo',
    'matrizrisco', 'planoacao', 'acidentes', 'saude', 'psicossocial', 'epi',
    'apr', 'placarlideres', 'ambiental', 'compras', 'cipa', 'brigada',
    'documentos', 'acervodrive', 'relatoriosms', 'importexport', 'config',
    'usuariospainel', 'ergonomia', 'periculosidade', 'geradorprompts', 'gestao_de_condutores'
];
pageIds.forEach(pid => {
    const sec = criarElementoMock('page-' + pid, 'section');
    sec.classList.add('db-page');
});
const navMapIds = [
    'navChecklists', 'navExtintores', 'navRelatos', 'navTreinamentos', 'navDdsma',
    'navEfetivo', 'navMatrizRisco', 'navPlanoAcao', 'navAcidentes', 'navSaude',
    'navPsicossocial', 'navEpi', 'navApr', 'navPlacarLideres', 'navAmbiental',
    'navCompras', 'navCipa', 'navBrigada', 'navDocumentos', 'navAcervoDrive',
    'navRelatorioSms', 'navImportExport', 'navConfig', 'navUsuariosPainel',
    'navErgonomia', 'navPericulosidade', 'navGeradorPrompts', 'navGestaoDeCondutores'
];
navMapIds.forEach(nid => {
    const btn = criarElementoMock(nid, 'button');
    btn.classList.add('db-nav-item');
});
criarElementoMock('pageTitle', 'div');
criarElementoMock('epiSubtabBtn-visao', 'button').classList.add('active');
const dbSimulado = {
    condutores: new Map(),
    tabelasEscritas: [],
    forcarErroConsulta: null,
    forcarErroEscrita: null,
    forcarPodeLerBanco: undefined,
    forcarPodeEscreverBanco: undefined,
    interceptarGetCondutores: null,
    sessaoVisual: {
        matricula: '76',
        nome: 'João Everton',
        email: 'joao@coppisf.com.br',
        auth_user_id: '11111111-2222-4333-8444-555555555555',
        role: 'Admin',
        ver_todos: true,
        modulos_edicao: null
    },
    sessaoJwt: {
        access_token: 'jwt-valido-123',
        expires_at: Math.floor(RealDate.now() / 1000) + 36000,
        user: {
            id: '11111111-2222-4333-8444-555555555555',
            email: 'joao@coppisf.com.br'
        }
    }
};
function assinaturaRequisitosNoSimulador(av) {
    const codigoAtiv = String(av?.atividade_codigo || '').trim().toUpperCase();
    const exigeCnh = String(av?.exige_cnh || 'INDEFINIDO').trim().toUpperCase();
    const cats = Array.from(new Set((Array.isArray(av?.categorias_aceitas) ? av.categorias_aceitas : []).map(c => String(c || '').trim().toUpperCase()))).sort();
    const reqsTrein = (Array.isArray(av?.treinamentos) ? av.treinamentos : [])
        .map(t => ({
            codigo: String(t?.codigo || '').trim().toUpperCase(),
            status_aplicabilidade: String(t?.status_aplicabilidade || 'PENDENTE_REGRA').trim().toUpperCase(),
            exige_validade: String(t?.exige_validade || 'INDEFINIDO').trim().toUpperCase()
        }))
        .sort((a, b) => a.codigo.localeCompare(b.codigo));
    return JSON.stringify({
        atividade_codigo: codigoAtiv,
        exige_cnh: exigeCnh,
        categorias_aceitas: cats,
        requisitos_treinamentos: reqsTrein
    });
}
function protegerEMesclarAvaliacoesNoSimulador(avaliacoesNovas, avaliacoesAtuais, hojeSp, agoraIso) {
    const finais = [];
    const idsNovos = new Set();
    const listaAtuais = Array.isArray(avaliacoesAtuais) ? avaliacoesAtuais : [];
    for (const av of (Array.isArray(avaliacoesNovas) ? avaliacoesNovas : [])) {
        const id = String(av.avaliacao_id || '').trim();
        idsNovos.add(id);
        for (const tr of (Array.isArray(av.treinamentos) ? av.treinamentos : [])) {
            if (tr.data_realizacao && tr.data_realizacao > hojeSp) {
                throw new Error(`TREINAMENTO_DATA_FUTURA: A data de realização (${tr.data_realizacao}) não pode ser futura em relação a ${hojeSp}.`);
            }
            if (tr.conferido_em && String(tr.conferido_em).slice(0, 10) > hojeSp) {
                throw new Error(`CONFERENCIA_DATA_FUTURA: A data de conferência (${tr.conferido_em}) não pode ser futura em relação a ${hojeSp}.`);
            }
        }
        const antiga = listaAtuais.find(x => String(x.avaliacao_id || '').trim() === id);
        if (!antiga) {
            if (av.regra_aprovada === true) {
                throw new Error('APROVACAO_REGRA_NAO_AUTORIZADA: Não há matriz SST aprovada ativa para aprovar regras diretamente pelo cliente.');
            }
            finais.push({
                ...av,
                regra_aprovada: false,
                regra_versao: null,
                regra_aprovada_por_uid: null,
                regra_aprovada_por_nome: null,
                regra_aprovada_em: null,
                regras_historico: []
            });
        } else {
            const histAntigo = Array.isArray(antiga.regras_historico) ? [...antiga.regras_historico] : [];
            if (assinaturaRequisitosNoSimulador(av) === assinaturaRequisitosNoSimulador(antiga)) {
                if (av.regra_aprovada === true && !antiga.regra_aprovada) {
                    throw new Error('APROVACAO_REGRA_NAO_AUTORIZADA: Proibido forjar aprovação de regra pendente.');
                }
                finais.push({
                    ...av,
                    regra_aprovada: Boolean(antiga.regra_aprovada === true),
                    regra_versao: antiga.regra_versao || null,
                    regra_aprovada_por_uid: antiga.regra_aprovada_por_uid || null,
                    regra_aprovada_por_nome: antiga.regra_aprovada_por_nome || null,
                    regra_aprovada_em: antiga.regra_aprovada_em || null,
                    regras_historico: histAntigo
                });
            } else {
                if (av.regra_aprovada === true) {
                    throw new Error('APROVACAO_REGRA_NAO_AUTORIZADA: Alteração de requisitos da atividade exige aprovação formal na matriz SST; proibido aprovar pelo cliente.');
                }
                histAntigo.push({
                    regra_versao: antiga.regra_versao || 'NAO_APROVADA',
                    regra_aprovada: Boolean(antiga.regra_aprovada === true),
                    regra_aprovada_por_uid: antiga.regra_aprovada_por_uid || null,
                    regra_aprovada_por_nome: antiga.regra_aprovada_por_nome || null,
                    regra_aprovada_em: antiga.regra_aprovada_em || null,
                    exige_cnh: antiga.exige_cnh,
                    categorias_aceitas: antiga.categorias_aceitas || [],
                    requisitos_treinamentos: JSON.parse(assinaturaRequisitosNoSimulador(antiga)).requisitos_treinamentos,
                    arquivada_em: agoraIso
                });
                finais.push({
                    ...av,
                    regra_aprovada: false,
                    regra_versao: null,
                    regra_aprovada_por_uid: null,
                    regra_aprovada_por_nome: null,
                    regra_aprovada_em: null,
                    regras_historico: histAntigo
                });
            }
        }
    }
    const removidas = listaAtuais.filter(x => !idsNovos.has(String(x.avaliacao_id || '').trim()));
    return { finais, removidas };
}
let clipboardTexto = '';
const sandbox = {
    console,
    Date: MockDate,
    Math,
    Intl,
    JSON,
    Promise,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    addEventListener: () => {},
    crypto: { randomUUID: () => crypto.randomUUID() },
    navigator: {
        clipboard: {
            writeText: async (t) => { clipboardTexto = String(t); }
        }
    },
    alertMsgs: [],
    alert: (m) => { sandbox.alertMsgs.push(String(m)); },
    SUPABASE_URL: 'https://simulado.supabase.co',
    SUPABASE_KEY: 'anon-key-simulada',
    SUPER_ADMIN_MATRICULAS: ['76', 'TESTE'],
    escapeHTML: (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    sessaoDashboardAtual: () => dbSimulado.sessaoVisual,
    sbAuth: {
        auth: {
            getSession: async () => ({ data: { session: dbSimulado.sessaoJwt }, error: null })
        }
    },
    epiLoaded: true,
    renderEpiPanel: () => { elements['page-epi'].innerHTML = '<div id="epiMockRendered">Painel EPI</div>'; },
    abrirGrupoNavPagina: () => {},
    destacarGrupoAtivo: () => {},
    atualizarAvisosPermissaoPagina: () => {},
    document: {
        readyState: 'complete',
        visibilityState: 'visible',
        addEventListener: () => {},
        getElementById: (id) => elements[id] || null,
        createElement: (tag) => criarElementoMock('', tag),
        querySelector: (sel) => {
            if (sel === '.db-page.active') {
                return pageIds.map(p => elements['page-' + p]).find(e => e.classList.contains('active')) || null;
            }
            return null;
        },
        querySelectorAll: (sel) => {
            if (sel === '.db-page') return pageIds.map(p => elements['page-' + p]);
            if (sel === '.db-nav-item') return navMapIds.map(n => elements[n]);
            if (sel === '.db-nav-group') return [];
            if (sel === '.db-nav-group-header') return [];
            if (sel === '.db-nav-group-items:not(.collapsed)') return [];
            return [];
        }
    },
    localStorage: {
        _s: {},
        getItem(k) { return this._s[k] || null; },
        setItem(k, v) { this._s[k] = String(v); },
        removeItem(k) { delete this._s[k]; }
    },
    fetch: async (url, opts = {}) => {
        const u = String(url);
        const method = opts.method || 'GET';
        const authHeader = opts.headers?.Authorization || '';
        if (authHeader === `Bearer ${sandbox.SUPABASE_KEY}`) {
            return {
                ok: false,
                status: 401,
                text: async () => JSON.stringify({ message: 'Anon key bloqueada pela RLS' })
            };
        }
        if (u.includes('/rest/v1/rpc/condutores_cnh_usuario_pode_ler') && method === 'POST') {
            if (typeof dbSimulado.forcarRespostaBrutaPodeLer === 'function') {
                return await dbSimulado.forcarRespostaBrutaPodeLer(u, opts);
            }
            const podeLer = dbSimulado.forcarPodeLerBanco !== undefined
                ? Boolean(dbSimulado.forcarPodeLerBanco)
                : true;
            return { ok: true, status: 200, text: async () => JSON.stringify(podeLer) };
        }
        if (u.includes('/rest/v1/rpc/condutores_cnh_usuario_pode_escrever') && method === 'POST') {
            if (typeof dbSimulado.forcarRespostaBrutaPodeEscrever === 'function') {
                return await dbSimulado.forcarRespostaBrutaPodeEscrever(u, opts);
            }
            const podeEscrever = dbSimulado.forcarPodeEscreverBanco !== undefined
                ? Boolean(dbSimulado.forcarPodeEscreverBanco)
                : (dbSimulado.sessaoVisual?.perfil_id !== 'modulo_saude' && dbSimulado.sessaoVisual?.matricula !== '98');
            return { ok: true, status: 200, text: async () => JSON.stringify(podeEscrever) };
        }
        if (method !== 'GET') {
            dbSimulado.tabelasEscritas.push({ url: u, method });
        }
        if (u.includes('/rest/v1/gestao_de_condutores_cnh') && method === 'GET') {
            if (typeof dbSimulado.interceptarGetCondutores === 'function') {
                return await dbSimulado.interceptarGetCondutores(u, opts);
            }
            if (dbSimulado.forcarErroConsulta) {
                return {
                    ok: false,
                    status: 500,
                    text: async () => JSON.stringify({ message: dbSimulado.forcarErroConsulta })
                };
            }
            const todos = Array.from(dbSimulado.condutores.values())
                .map(r => JSON.parse(JSON.stringify(r)))
                .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
            const limitMatch = u.match(/[?&]limit=(\d+)/);
            const offsetMatch = u.match(/[?&]offset=(\d+)/);
            const limit = limitMatch ? Number(limitMatch[1]) : 1000;
            const offset = offsetMatch ? Number(offsetMatch[1]) : 0;
            const pagina = todos.slice(offset, offset + limit);
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify(pagina)
            };
        }
        if (u.includes('/rest/v1/rpc/salvar_condutor_cnh_atomico') && method === 'POST') {
            if (dbSimulado.forcarErroEscrita) {
                return {
                    ok: false,
                    status: 500,
                    text: async () => JSON.stringify({ message: dbSimulado.forcarErroEscrita })
                };
            }
            const body = JSON.parse(opts.body);
            const agora = new MockDate().toISOString();
            const hojeSp = obterHojeSpNoSimulador();
            if (!body.p_id) {
                let protegidas;
                try {
                    protegidas = protegerEMesclarAvaliacoesNoSimulador(body.p_avaliacoes || [], [], hojeSp, agora);
                } catch (errVal) {
                    return { ok: false, status: 400, text: async () => JSON.stringify({ message: errVal.message }) };
                }
                const novoId = crypto.randomUUID();
                const novoCiclo = body.p_cnh_validade ? crypto.randomUUID() : null;
                const row = {
                    id: novoId,
                    nome: body.p_nome,
                    vinculo: body.p_vinculo,
                    empresa: body.p_empresa,
                    funcao: body.p_funcao,
                    setor_frente: body.p_setor_frente,
                    ativo: true,
                    inativado_em: null,
                    inativado_motivo: null,
                    observacoes: body.p_observacoes,
                    cnh_categoria: body.p_cnh_categoria,
                    cnh_validade: body.p_cnh_validade,
                    cnh_ciclo_id: novoCiclo,
                    antecedencia_alerta_dias: body.p_antecedencia_alerta_dias || 30,
                    avaliacoes: protegidas.finais,
                    comunicacoes: [],
                    ciclos_cnh_historico: [],
                    historico_eventos: [
                        {
                            evento_id: crypto.randomUUID(),
                            tipo: 'CADASTRO_INICIAL',
                            em: agora,
                            responsavel_uid: dbSimulado.sessaoJwt.user.id,
                            responsavel_nome: dbSimulado.sessaoVisual.nome,
                            cnh_ciclo_id: novoCiclo,
                            cnh_validade: body.p_cnh_validade
                        }
                    ],
                    versao: 1,
                    created_at: agora,
                    updated_at: agora,
                    created_by_uid: dbSimulado.sessaoJwt.user.id,
                    created_by_nome: dbSimulado.sessaoVisual.nome,
                    updated_by_uid: dbSimulado.sessaoJwt.user.id,
                    updated_by_nome: dbSimulado.sessaoVisual.nome
                };
                dbSimulado.condutores.set(novoId, row);
                return { ok: true, status: 200, text: async () => JSON.stringify(row) };
            }
            const atual = dbSimulado.condutores.get(body.p_id);
            if (!atual) {
                return { ok: false, status: 404, text: async () => JSON.stringify({ message: 'NAO_ENCONTRADO' }) };
            }
            if (atual.versao !== body.p_versao_esperada) {
                return {
                    ok: false,
                    status: 409,
                    text: async () => JSON.stringify({
                        message: `CONFLITO_CONCORRENCIA: O registro foi modificado por outro usuário (versão atual: ${atual.versao}, versão enviada: ${body.p_versao_esperada}).`
                    })
                };
            }
            let protegidas;
            try {
                protegidas = protegerEMesclarAvaliacoesNoSimulador(
                    body.p_avaliacoes || atual.avaliacoes,
                    atual.avaliacoes,
                    hojeSp,
                    agora
                );
            } catch (errVal) {
                return { ok: false, status: 400, text: async () => JSON.stringify({ message: errVal.message }) };
            }
            let novoCicloId = atual.cnh_ciclo_id;
            const ciclosHist = [...(atual.ciclos_cnh_historico || [])];
            const histEventos = [...(atual.historico_eventos || [])];
            if (atual.cnh_validade !== body.p_cnh_validade) {
                if (!atual.cnh_validade && body.p_cnh_validade) {
                    novoCicloId = crypto.randomUUID();
                } else if (atual.cnh_validade && !body.p_cnh_validade) {
                    ciclosHist.push({
                        cnh_ciclo_id: atual.cnh_ciclo_id,
                        cnh_validade: atual.cnh_validade,
                        cnh_categoria: atual.cnh_categoria,
                        status_ciclo: 'ENCERRADO_POR_REMOCAO_CNH',
                        encerrado_em: agora,
                        encerrado_por_uid: dbSimulado.sessaoJwt.user.id,
                        encerrado_por_nome: dbSimulado.sessaoVisual.nome
                    });
                    novoCicloId = null;
                } else if (body.p_modo_alteracao_cnh === 'RENOVACAO') {
                    novoCicloId = crypto.randomUUID();
                    ciclosHist.push({
                        cnh_ciclo_id: atual.cnh_ciclo_id,
                        cnh_validade: atual.cnh_validade,
                        cnh_categoria: atual.cnh_categoria,
                        status_ciclo: 'SUBSTITUIDO_POR_RENOVACAO',
                        substituido_por_ciclo_id: novoCicloId,
                        nova_validade: body.p_cnh_validade,
                        encerrado_em: agora,
                        encerrado_por_uid: dbSimulado.sessaoJwt.user.id,
                        encerrado_por_nome: dbSimulado.sessaoVisual.nome,
                        justificativa: body.p_justificativa_alteracao_cnh || 'Renovação de CNH'
                    });
                } else if (body.p_modo_alteracao_cnh === 'CORRECAO_DATA') {
                    // Mantém o mesmo ciclo UUID
                } else {
                    return {
                        ok: false,
                        status: 400,
                        text: async () => JSON.stringify({ message: 'VALIDACAO_CNH: Modo de alteração inválido' })
                    };
                }
            }
            if (protegidas.removidas.length > 0) {
                histEventos.push({
                    evento_id: crypto.randomUUID(),
                    tipo: 'AVALIACOES_ARQUIVADAS_POR_REMOCAO',
                    em: agora,
                    responsavel_uid: dbSimulado.sessaoJwt.user.id,
                    responsavel_nome: dbSimulado.sessaoVisual.nome,
                    avaliacoes_removidas: protegidas.removidas
                });
            }
            histEventos.push({
                evento_id: crypto.randomUUID(),
                tipo: atual.cnh_validade !== body.p_cnh_validade
                    ? `ALTERACAO_CNH_${body.p_modo_alteracao_cnh}`
                    : 'EDICAO_CADASTRAL',
                em: agora,
                responsavel_uid: dbSimulado.sessaoJwt.user.id,
                responsavel_nome: dbSimulado.sessaoVisual.nome,
                cnh_ciclo_id_anterior: atual.cnh_ciclo_id,
                cnh_validade_anterior: atual.cnh_validade,
                cnh_ciclo_id_novo: novoCicloId,
                cnh_validade_nova: body.p_cnh_validade,
                justificativa: body.p_justificativa_alteracao_cnh || null
            });
            const atualizado = Object.assign({}, atual, {
                nome: body.p_nome,
                vinculo: body.p_vinculo,
                empresa: body.p_empresa,
                funcao: body.p_funcao,
                setor_frente: body.p_setor_frente,
                observacoes: body.p_observacoes,
                cnh_categoria: body.p_cnh_categoria,
                cnh_validade: body.p_cnh_validade,
                cnh_ciclo_id: novoCicloId,
                antecedencia_alerta_dias: body.p_antecedencia_alerta_dias || atual.antecedencia_alerta_dias,
                avaliacoes: protegidas.finais,
                comunicacoes: atual.comunicacoes,
                ciclos_cnh_historico: ciclosHist,
                historico_eventos: histEventos,
                versao: atual.versao + 1,
                updated_at: agora,
                updated_by_uid: dbSimulado.sessaoJwt.user.id,
                updated_by_nome: dbSimulado.sessaoVisual.nome
            });
            dbSimulado.condutores.set(atual.id, atualizado);
            return { ok: true, status: 200, text: async () => JSON.stringify(atualizado) };
        }
        if (u.includes('/rest/v1/rpc/alterar_status_condutor_cnh_atomico') && method === 'POST') {
            const body = JSON.parse(opts.body);
            const atual = dbSimulado.condutores.get(body.p_condutor_id);
            if (!atual) return { ok: false, status: 404, text: async () => 'Not found' };
            if (atual.versao !== body.p_versao_esperada) {
                return { ok: false, status: 409, text: async () => JSON.stringify({ message: 'CONFLITO_CONCORRENCIA' }) };
            }
            const agora = new MockDate().toISOString();
            const atualizado = Object.assign({}, atual, {
                ativo: Boolean(body.p_novo_ativo),
                inativado_em: body.p_novo_ativo ? null : agora,
                inativado_motivo: body.p_novo_ativo ? null : body.p_motivo,
                inativado_por_uid: body.p_novo_ativo ? null : dbSimulado.sessaoJwt.user.id,
                inativado_por_nome: body.p_novo_ativo ? null : dbSimulado.sessaoVisual.nome,
                historico_eventos: [
                    ...(atual.historico_eventos || []),
                    {
                        evento_id: crypto.randomUUID(),
                        tipo: body.p_novo_ativo ? 'REATIVACAO' : 'INATIVACAO',
                        em: agora,
                        responsavel_uid: dbSimulado.sessaoJwt.user.id,
                        responsavel_nome: dbSimulado.sessaoVisual.nome,
                        motivo: body.p_motivo
                    }
                ],
                versao: atual.versao + 1
            });
            dbSimulado.condutores.set(atual.id, atualizado);
            return { ok: true, status: 200, text: async () => JSON.stringify(atualizado) };
        }
        if (u.includes('/rest/v1/rpc/registrar_comunicacao_cnh_atomica') && method === 'POST') {
            const body = JSON.parse(opts.body);
            const atual = dbSimulado.condutores.get(body.p_condutor_id);
            if (!atual) return { ok: false, status: 404, text: async () => 'Not found' };
            if (
                atual.cnh_ciclo_id !== body.p_cnh_ciclo_id_esperado ||
                atual.cnh_validade !== body.p_vencimento_comunicado
            ) {
                if (!body.p_permitir_ciclo_historico) {
                    return {
                        ok: false,
                        status: 409,
                        text: async () => JSON.stringify({
                            message: 'CICLO_CNH_ALTERADO: O ciclo/validade da CNH mudou entre a abertura do modal e o salvamento.'
                        })
                    };
                }
                const achouHist = (atual.ciclos_cnh_historico || []).some(
                    ch => ch.cnh_ciclo_id === body.p_cnh_ciclo_id_esperado && ch.cnh_validade === body.p_vencimento_comunicado
                );
                if (!achouHist) {
                    return {
                        ok: false,
                        status: 400,
                        text: async () => JSON.stringify({ message: 'CICLO_HISTORICO_INVALIDO' })
                    };
                }
            }
            // Calcula o estágio no servidor pela data civil atual em America/Sao_Paulo (nunca confia no cliente!)
            const agora = new MockDate().toISOString();
            const hojeSp = obterHojeSpNoSimulador();
            const [yV, mV, dV] = String(body.p_vencimento_comunicado).split('-').map(Number);
            const [yH, mH, dH] = hojeSp.split('-').map(Number);
            const diffDias = Math.round((RealDate.UTC(yV, mV - 1, dV) - RealDate.UTC(yH, mH - 1, dH)) / (1000 * 60 * 60 * 24));
            let estagioServidor;
            if (diffDias < 0) estagioServidor = 'VENCIDA';
            else if (diffDias === 0) estagioServidor = 'VENCE_HOJE';
            else if (diffDias <= (atual.antecedencia_alerta_dias || 30)) estagioServidor = 'A_VENCER';
            else {
                return {
                    ok: false,
                    status: 400,
                    text: async () => JSON.stringify({ message: 'COMUNICACAO_FORA_DA_JANELA' })
                };
            }
            const novaCom = {
                comunicacao_id: crypto.randomUUID(),
                cnh_ciclo_id: body.p_cnh_ciclo_id_esperado,
                vencimento_comunicado: body.p_vencimento_comunicado,
                estagio_no_momento: estagioServidor,
                canal: body.p_canal,
                motivo: body.p_motivo,
                registrado_em: agora,
                responsavel_uid: dbSimulado.sessaoJwt.user.id,
                responsavel_matricula: dbSimulado.sessaoVisual.matricula,
                responsavel_nome: dbSimulado.sessaoVisual.nome,
                referencia_ciclo_historico: Boolean(body.p_permitir_ciclo_historico && atual.cnh_ciclo_id !== body.p_cnh_ciclo_id_esperado),
                status_registro: 'REGISTRADA'
            };
            const atualizado = Object.assign({}, atual, {
                comunicacoes: [...(atual.comunicacoes || []), novaCom],
                historico_eventos: [
                    ...(atual.historico_eventos || []),
                    {
                        evento_id: crypto.randomUUID(),
                        tipo: 'COMUNICACAO_REGISTRADA',
                        em: agora,
                        responsavel_uid: dbSimulado.sessaoJwt.user.id,
                        responsavel_nome: dbSimulado.sessaoVisual.nome,
                        cnh_ciclo_id: body.p_cnh_ciclo_id_esperado,
                        vencimento_comunicado: body.p_vencimento_comunicado,
                        estagio_no_momento: estagioServidor,
                        canal: body.p_canal
                    }
                ]
            });
            dbSimulado.condutores.set(atual.id, atualizado);
            return { ok: true, status: 200, text: async () => JSON.stringify(atualizado) };
        }
        throw new Error(`URL não esperada no teste: ${u}`);
    }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const codeDashboard = fs.readFileSync('dashboard/dashboard.js', 'utf8');
const codeEpi = fs.readFileSync('dashboard/modules/epi_estoque.js', 'utf8');
const codeCondutores = fs.readFileSync('dashboard/modules/gestao_de_condutores_cnh.js', 'utf8');
function extrairBloco(codigo, regex) {
    const m = codigo.match(regex);
    if (!m) throw new Error(`Bloco não encontrado: ${regex}`);
    return m[0];
}
vm.runInContext(extrairBloco(codeDashboard, /var MODULOS_PAINEL_DISPONIVEIS = \[[\s\S]*?\n\];/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /function moduloPermitidoPainel\(pageId\) \{[\s\S]*?\n\}/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /function usuarioPodeGravarModulo\(modulo\) \{[\s\S]*?\n\}/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /function aplicarRestricaoModulosPainelNoMenu\(\) \{[\s\S]*?\n\}/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /var DB_PAGE_TITLES = \{[\s\S]*?\n\};/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /var NAV_GROUP_POR_PAGINA = \{[\s\S]*?\n\};/), sandbox);
vm.runInContext(extrairBloco(codeDashboard, /function showDbPage\(pageId\) \{[\s\S]*?\n\}/), sandbox);
const showDbPageCore = sandbox.showDbPage;
vm.runInContext(extrairBloco(codeEpi, /var DB_PAGE_TITLES = \{[\s\S]*?\n\};/), sandbox);
vm.runInContext(extrairBloco(codeEpi, /var NAV_GROUP_POR_PAGINA = \{[\s\S]*?\n\};/), sandbox);
vm.runInContext(extrairBloco(codeEpi, /function showDbPage\(pageId\) \{[\s\S]*?\n\}/), sandbox);
const showDbPageEpi = sandbox.showDbPage;
// 1. Verifica que o arquivo de produto REAL sem instrumentação expõe APENAS window.renderGestaoDeCondutoresPanel
assert.ok(!codeCondutores.includes('__testHarnessCallback'), 'O arquivo de produto NÃO pode conter __testHarnessCallback');
assert.ok(!codeCondutores.includes('dataReferenciaSp'), 'O arquivo de produto NÃO pode conter dataReferenciaSp simulável');
// 2. Instrumenta a string de código APENAS em memória na VM de teste para inspecionar funções internas sem tocá-las no produto
let harness = null;
Object.defineProperty(sandbox, '__capturarHarnessVmSomenteTeste', {
    value: (h) => { harness = h; },
    enumerable: false,
    configurable: true
});
const chavesAntesModulo = new Set(Object.keys(sandbox));
const codeCondutoresVm = codeCondutores.replace(
    'window.renderGestaoDeCondutoresPanel = renderGestaoDeCondutoresPanel;',
    `window.renderGestaoDeCondutoresPanel = renderGestaoDeCondutoresPanel;
     __capturarHarnessVmSomenteTeste({
         state,
         obterDataCivilSaoPauloHoje,
         calcularDiferencaDiasCivis,
         calcularSituacaoCnh,
         avaliarTreinamentoAtividade,
         avaliarAtividadeCondutor,
         avaliarAlertaEComunicacaoCondutor,
         avaliarCondutorCompleto,
         gerarTextoComunicacaoPtBr,
         calcularIndicadoresGerais,
         filtrarAvaliados,
         verificarSessaoEAutorizacaoModulo,
         carregarCondutoresDoBanco,
         obterAssinaturaRequisitosAvaliacao,
         normalizarAvaliacoesParaPersistencia,
         persistirCadastroOuEdicaoCondutor,
         persistirAlteracaoStatusCondutor,
         persistirComunicacaoExplicita,
         abrirModalCadastroCondutor,
         abrirModalStatusCondutor,
         abrirModalComunicacaoCondutor,
         fecharModalAtivo,
         executarCopiaMensagemAlerta,
         submeterModalCadastro,
         submeterModalStatus,
         submeterModalComunicacao,
         revalidarAoRetomarFocoOuVisibilidade,
         atualizarListaEKpisParcialNoDom,
         renderizarInterfaceNoContainer,
         carregarBaseColaboradoresDoEfetivo,
         obterSugestoesBaseColaborador,
         selecionarColaboradorDaBase,
         textoStatusBaseColaborador
     });`
);
vm.runInContext(codeCondutoresVm, sandbox);
delete sandbox.__capturarHarnessVmSomenteTeste;
const chavesNovasModulo = Object.keys(sandbox).filter(k => !chavesAntesModulo.has(k));
assert.deepStrictEqual(
    chavesNovasModulo,
    ['renderGestaoDeCondutoresPanel'],
    'O módulo deve expor exclusivamente window.renderGestaoDeCondutoresPanel no escopo global'
);
assert.ok(harness, 'Harness deve ser capturado pela instrumentação exclusiva da VM');
console.log('✅ Teste 1: IIFE estrita verificada — expõe somente window.renderGestaoDeCondutoresPanel e sem __testHarnessCallback no produto');
(async () => {
    // -------------------------------------------------------------------------
    // TESTE 2: Cálculo civil de datas (America/Sao_Paulo) e virada de data
    // -------------------------------------------------------------------------
    const refBase = '2026-11-09';
    const cVencidaOntem = harness.calcularSituacaoCnh({ cnh_categoria: 'C', cnh_validade: '2026-11-08', cnh_ciclo_id: 'c1' }, refBase);
    assert.strictEqual(cVencidaOntem.vencida, true);
    assert.strictEqual(cVencidaOntem.vigente, false);
    assert.strictEqual(cVencidaOntem.statusCodigo, 'VENCIDA');
    const cVenceHoje = harness.calcularSituacaoCnh({ cnh_categoria: 'B', cnh_validade: '2026-11-09', cnh_ciclo_id: 'c2' }, refBase);
    assert.strictEqual(cVenceHoje.vigente, true, 'Validade hoje deve ser considerada vigente');
    assert.strictEqual(cVenceHoje.vencida, false, 'Validade hoje NÃO está vencida');
    assert.strictEqual(cVenceHoje.venceHoje, true, 'Deve sinalizar aviso Vence hoje');
    assert.strictEqual(cVenceHoje.aVencer, true, 'Proposta inclui hoje em A vencer');
    assert.strictEqual(cVenceHoje.statusCodigo, 'VENCE_HOJE');
    const cViradaDiaSeguinte = harness.calcularSituacaoCnh({ cnh_categoria: 'B', cnh_validade: '2026-11-09', cnh_ciclo_id: 'c2' }, '2026-11-10');
    assert.strictEqual(cViradaDiaSeguinte.vencida, true, 'Na virada para o dia seguinte passa a Vencida sem recadastrar');
    assert.strictEqual(cViradaDiaSeguinte.vigente, false);
    const c30Dias = harness.calcularSituacaoCnh({ cnh_categoria: 'D', cnh_validade: '2026-12-09', cnh_ciclo_id: 'c3', antecedencia_alerta_dias: 30 }, refBase);
    assert.strictEqual(c30Dias.aVencer, true);
    assert.strictEqual(c30Dias.diasRestantes, 30);
    assert.strictEqual(c30Dias.statusCodigo, 'A_VENCER');
    const c31DiasFora = harness.calcularSituacaoCnh({ cnh_categoria: 'D', cnh_validade: '2026-12-10', cnh_ciclo_id: 'c4', antecedencia_alerta_dias: 30 }, refBase);
    assert.strictEqual(c31DiasFora.aVencer, false);
    assert.strictEqual(c31DiasFora.vigente, true);
    assert.strictEqual(c31DiasFora.statusCodigo, 'FORA_DA_JANELA');
    const c31ComAntecedencia45 = harness.calcularSituacaoCnh({ cnh_categoria: 'D', cnh_validade: '2026-12-10', cnh_ciclo_id: 'c4', antecedencia_alerta_dias: 45 }, refBase);
    assert.strictEqual(c31ComAntecedencia45.aVencer, true);
    const cAusente = harness.calcularSituacaoCnh({ cnh_categoria: '', cnh_validade: null }, refBase);
    assert.strictEqual(cAusente.possuiCnh, false);
    assert.strictEqual(cAusente.statusCodigo, 'AUSENTE');
    console.log('✅ Teste 2: Datas civis (America/Sao_Paulo), vencida/hoje/30 dias/fora da janela/ausente e virada de data aprovados');
    // -------------------------------------------------------------------------
    // TESTE 3: Treinamentos (vigente, vencido, sem comprovação, sem conferência,
    //          sem exigência de validade definida, não aplicável explícito e data futura)
    // -------------------------------------------------------------------------
    const trVigente = harness.avaliarTreinamentoAtividade({
        codigo: 'NR-11',
        nome: 'Operação de Empilhadeira / Munck',
        status_aplicabilidade: 'OBRIGATORIO',
        exige_validade: 'SIM',
        data_realizacao: '2026-01-15',
        validade: '2027-01-15',
        comprovacao_ref: 'FOR.001-TURMA-12',
        conferido_por: 'João Everton',
        conferido_em: '2026-01-16'
    }, refBase, 30);
    assert.strictEqual(trVigente.situacao, 'APTO');
    const trVencidoMesmoSemConferencia = harness.avaliarTreinamentoAtividade({
        codigo: 'NR-11',
        nome: 'Operação de Empilhadeira',
        status_aplicabilidade: 'OBRIGATORIO',
        exige_validade: 'INDEFINIDO',
        data_realizacao: '2024-01-10',
        validade: '2026-11-01',
        comprovacao_ref: '',
        conferido_por: '',
        conferido_em: ''
    }, refBase, 30);
    assert.strictEqual(trVencidoMesmoSemConferencia.situacao, 'INAPTO');
    const trSemComprovacao = harness.avaliarTreinamentoAtividade({
        codigo: 'DIR-DEF',
        nome: 'Direção Defensiva',
        status_aplicabilidade: 'OBRIGATORIO',
        exige_validade: 'SIM',
        data_realizacao: '2026-05-01',
        validade: '2027-05-01',
        comprovacao_ref: '',
        conferido_por: 'João Everton',
        conferido_em: '2026-05-02'
    }, refBase, 30);
    assert.strictEqual(trSemComprovacao.situacao, 'PENDENTE');
    const trSemValidadeQuandoNaoExige = harness.avaliarTreinamentoAtividade({
        codigo: 'INT-OBRA',
        nome: 'Integração de Segurança',
        status_aplicabilidade: 'OBRIGATORIO',
        exige_validade: 'NAO',
        data_realizacao: '2026-03-10',
        validade: null,
        comprovacao_ref: 'LISTA-INT-09',
        conferido_por: 'João Everton',
        conferido_em: '2026-03-10'
    }, refBase, 30);
    assert.strictEqual(trSemValidadeQuandoNaoExige.situacao, 'APTO');
    const trFuturo = harness.avaliarTreinamentoAtividade({
        codigo: 'FUT',
        nome: 'Treinamento Futuro Fictício',
        status_aplicabilidade: 'OBRIGATORIO',
        exige_validade: 'NAO',
        data_realizacao: '2027-01-01',
        comprovacao_ref: 'LISTA-FUT',
        conferido_por: 'João Everton',
        conferido_em: '2026-11-09'
    }, refBase, 30);
    assert.strictEqual(trFuturo.situacao, 'PENDENTE', 'Data de realização futura NUNCA pode contar como treinamento realizado/APTO');
    const trNaoAplicavelExplicito = harness.avaliarTreinamentoAtividade({
        codigo: 'NR-35',
        nome: 'Trabalho em Altura',
        status_aplicabilidade: 'NAO_APLICAVEL',
        exige_validade: 'INDEFINIDO'
    }, refBase, 30);
    assert.strictEqual(trNaoAplicavelExplicito.situacao, 'NAO_APLICAVEL');
    console.log('✅ Teste 3: Regras de treinamento (vigente, vencido prevalente, sem comprovação/conferência, futuro bloqueado e não aplicável explícito) aprovadas');
    // -------------------------------------------------------------------------
    // TESTE 4: Prioridade (Inativo > Inapto > Pendente > Apto), 2 Atividades
    //          distintas na mesma pessoa e distinção entre regra aprovada vs não aprovada
    // -------------------------------------------------------------------------
    const condutorDuasAtividades = {
        id: 'cond-duas-ativ',
        nome: 'Marcos Operador Polivalente',
        vinculo: 'TERCEIRO',
        empresa: 'ARTEC',
        funcao: 'Motorista / Operador',
        setor_frente: 'FRENTE 02',
        ativo: true,
        cnh_categoria: 'B',
        cnh_validade: '2027-06-01',
        cnh_ciclo_id: crypto.randomUUID(),
        avaliacoes: [
            {
                avaliacao_id: 'av-leve',
                atividade_codigo: 'VEICULO_LEVE',
                atividade_nome: 'Caminhonete / Veículo Leve',
                exige_cnh: 'SIM',
                categorias_aceitas: ['B', 'C', 'D', 'E'],
                regra_aprovada: true,
                regra_versao: 'v1.0',
                regra_aprovada_por_uid: '11111111-2222-4333-8444-555555555555',
                regra_aprovada_por_nome: 'João Everton',
                regra_aprovada_em: '2026-11-01',
                treinamentos: [
                    {
                        codigo: 'DIR-DEF',
                        nome: 'Direção Defensiva',
                        status_aplicabilidade: 'OBRIGATORIO',
                        exige_validade: 'SIM',
                        data_realizacao: '2026-02-01',
                        validade: '2027-02-01',
                        comprovacao_ref: 'CERT-001',
                        conferido_por: 'João Everton',
                        conferido_em: '2026-02-02'
                    }
                ]
            },
            {
                avaliacao_id: 'av-munck',
                atividade_codigo: 'CAMINHAO_MUNCK',
                atividade_nome: 'Caminhão Munck / Guindauto',
                exige_cnh: 'SIM',
                categorias_aceitas: ['C', 'D', 'E'],
                regra_aprovada: true, // Regra aprovada define C/D/E, mas treinamentos ainda estão vazios (Pendente coexistente)
                regra_versao: 'v1.0',
                regra_aprovada_por_uid: '11111111-2222-4333-8444-555555555555',
                regra_aprovada_por_nome: 'João Everton',
                regra_aprovada_em: '2026-11-01',
                treinamentos: []
            },
            {
                avaliacao_id: 'av-nao-aprovada',
                atividade_codigo: 'TRATOR_AGRICOLA',
                atividade_nome: 'Trator Agrícola',
                exige_cnh: 'SIM',
                categorias_aceitas: ['C', 'D', 'E'],
                regra_aprovada: false, // Regra NÃO aprovada: lista de categorias não impõe incompatibilidade definitiva -> fica PENDENTE!
                regra_versao: null,
                regra_aprovada_em: null,
                treinamentos: []
            }
        ]
    };
    const avaliadoPolivalente = harness.avaliarCondutorCompleto(condutorDuasAtividades, refBase);
    assert.strictEqual(avaliadoPolivalente.avaliacoesCalculadas.length, 3);
    const avLeve = avaliadoPolivalente.avaliacoesCalculadas[0];
    const avMunck = avaliadoPolivalente.avaliacoesCalculadas[1];
    const avNaoAprovada = avaliadoPolivalente.avaliacoesCalculadas[2];
    assert.strictEqual(avLeve.statusPrioritario, 'APTO');
    assert.strictEqual(avLeve.statusLabel, 'Apto nos requisitos cadastrados');
    assert.strictEqual(avMunck.statusPrioritario, 'INAPTO', 'Incompatibilidade comprovada por regra aprovada prevalece sobre Pendente');
    assert.ok(avMunck.motivosInapto.some(m => m.includes('incompatível')), 'Deve listar motivo de categoria incompatível');
    assert.ok(avMunck.motivosPendente.some(m => m.includes('Requisitos de treinamento não definidos')), 'Deve preservar e exibir pendências coexistentes junto com o motivo de Inapto');
    assert.strictEqual(avNaoAprovada.statusPrioritario, 'PENDENTE', 'Lista de categorias em regra não aprovada NÃO deve impor INAPTO definitivo');
    const avaliadoInativo = harness.avaliarCondutorCompleto(Object.assign({}, condutorDuasAtividades, { ativo: false }), refBase);
    assert.strictEqual(avaliadoInativo.avaliacoesCalculadas[0].statusPrioritario, 'INATIVO');
    assert.strictEqual(avaliadoInativo.avaliacoesCalculadas[1].statusPrioritario, 'INATIVO');
    console.log('✅ Teste 4: Prioridade (Inativo > Inapto > Pendente > Apto), motivos coexistentes e distinção de regra aprovada vs pendente aprovados');
    // -------------------------------------------------------------------------
    // TESTE 5: Ciclo UUID de CNH — Duas pessoas com mesma data têm ciclos
    //          distintos; Renovação A -> B -> A gera 3 ciclos distintos;
    //          Correção de data preserva o ciclo atual e registra trilha
    // -------------------------------------------------------------------------
    definirRelogioSandbox('2026-11-09T15:00:00.000Z');
    dbSimulado.condutores.clear();
    await sandbox.renderGestaoDeCondutoresPanel({ forcarRecarregamento: true });
    const p1 = await harness.persistirCadastroOuEdicaoCondutor({
        nome: 'Condutor Alfa <script>alert(1)</script>',
        vinculo: 'PROPRIO',
        empresa: 'COP',
        funcao: 'Motorista',
        setor_frente: 'FRENTE 01',
        cnh_categoria: 'C',
        cnh_validade: '2026-11-20',
        antecedencia_alerta_dias: 30,
        avaliacoes: [
            {
                avaliacao_id: 'av-alfa-1',
                atividade_codigo: 'VEICULO_LEVE',
                atividade_nome: 'Caminhonete / Veículo Leve',
                exige_cnh: 'SIM',
                categorias_aceitas: ['B', 'C'],
                treinamentos: [
                    {
                        codigo: 'NR-11',
                        nome: 'Direção Preventiva',
                        status_aplicabilidade: 'NAO_APLICAVEL',
                        exige_validade: 'NAO'
                    }
                ]
            }
        ]
    });
    const p2 = await harness.persistirCadastroOuEdicaoCondutor({
        nome: 'Condutor Beta',
        vinculo: 'TERCEIRO',
        empresa: 'ARTEC',
        funcao: 'Mecânico Condutor',
        setor_frente: 'OFICINA CENTRAL',
        cnh_categoria: 'C',
        cnh_validade: '2026-11-20',
        antecedencia_alerta_dias: 30,
        avaliacoes: []
    });
    assert.ok(p1.cnh_ciclo_id && p2.cnh_ciclo_id, 'Ambos devem receber UUID de ciclo');
    assert.notStrictEqual(p1.cnh_ciclo_id, p2.cnh_ciclo_id, 'Duas pessoas com a mesma validade de CNH devem possuir cnh_ciclo_id UUID distintos');
    const cicloA1 = p1.cnh_ciclo_id;
    const p1Corrigido = await harness.persistirCadastroOuEdicaoCondutor({
        id: p1.id,
        versao_esperada: p1.versao,
        nome: p1.nome,
        vinculo: p1.vinculo,
        empresa: p1.empresa,
        funcao: p1.funcao,
        setor_frente: p1.setor_frente,
        cnh_categoria: 'C',
        cnh_validade: '2026-11-25',
        modo_alteracao_cnh: 'CORRECAO_DATA',
        justificativa_alteracao_cnh: 'Erro material de digitação do dia na CNH física',
        antecedencia_alerta_dias: 30,
        avaliacoes: p1.avaliacoes
    });
    assert.strictEqual(p1Corrigido.cnh_ciclo_id, cicloA1, 'Correção de data deve manter o mesmo UUID de ciclo');
    assert.strictEqual(p1Corrigido.ciclos_cnh_historico.length, 0);
    assert.ok(p1Corrigido.historico_eventos.some(e => e.tipo === 'ALTERACAO_CNH_CORRECAO_DATA'));
    const p1RenovadoB = await harness.persistirCadastroOuEdicaoCondutor({
        id: p1Corrigido.id,
        versao_esperada: p1Corrigido.versao,
        nome: p1Corrigido.nome,
        vinculo: p1Corrigido.vinculo,
        empresa: p1Corrigido.empresa,
        funcao: p1Corrigido.funcao,
        setor_frente: p1Corrigido.setor_frente,
        cnh_categoria: 'C',
        cnh_validade: '2027-11-25',
        modo_alteracao_cnh: 'RENOVACAO',
        justificativa_alteracao_cnh: 'Renovação DETRAN ciclo B',
        antecedencia_alerta_dias: 30,
        avaliacoes: p1Corrigido.avaliacoes
    });
    const cicloB = p1RenovadoB.cnh_ciclo_id;
    assert.notStrictEqual(cicloB, cicloA1);
    const p1RenovadoA2 = await harness.persistirCadastroOuEdicaoCondutor({
        id: p1RenovadoB.id,
        versao_esperada: p1RenovadoB.versao,
        nome: p1RenovadoB.nome,
        vinculo: p1RenovadoB.vinculo,
        empresa: p1RenovadoB.empresa,
        funcao: p1RenovadoB.funcao,
        setor_frente: p1RenovadoB.setor_frente,
        cnh_categoria: 'C',
        cnh_validade: '2026-11-25',
        modo_alteracao_cnh: 'RENOVACAO',
        justificativa_alteracao_cnh: 'Retorno à data A em novo ciclo',
        antecedencia_alerta_dias: 30,
        avaliacoes: p1RenovadoB.avaliacoes
    });
    const cicloA2 = p1RenovadoA2.cnh_ciclo_id;
    assert.notStrictEqual(cicloA2, cicloB);
    assert.notStrictEqual(cicloA2, cicloA1, 'Alteração A -> B -> A nunca reutiliza o ciclo A original');
    assert.strictEqual(p1RenovadoA2.ciclos_cnh_historico.length, 2);
    console.log('✅ Teste 5: Ciclo UUID de CNH (duas pessoas na mesma data, correção vs renovação e transição A->B->A) aprovado');
    // -------------------------------------------------------------------------
    // TESTE 6: Comunicações — Copiar não baixa pendência; Registro explícito
    //          baixa apenas o ciclo+validade corretos; Renovação preserva comunicação
    //          original como REGISTRADA (imutável) e bloqueia gravação em ciclo trocado
    // -------------------------------------------------------------------------
    await harness.executarCopiaMensagemAlerta(p2.id);
    assert.ok(clipboardTexto.includes('Olá, Condutor'), 'Texto copiado deve estar em pt-BR com primeiro nome');
    assert.ok(clipboardTexto.includes('20/11/2026'), 'Texto copiado deve incluir a data de validade');
    assert.ok(!/\b\d{11}\b/.test(clipboardTexto), 'Texto copiado não pode conter número de documento pessoal');
    const avP2AposCopia = harness.avaliarCondutorCompleto(dbSimulado.condutores.get(p2.id), refBase);
    assert.strictEqual(avP2AposCopia.alertaCom.comunicacaoPendente, true, 'Copiar texto NUNCA baixa a pendência de comunicação');
    const p2ComComunicacao = await harness.persistirComunicacaoExplicita({
        condutor_id: p2.id,
        cnh_ciclo_id_esperado: p2.cnh_ciclo_id,
        vencimento_comunicado: p2.cnh_validade,
        canal: 'WHATSAPP',
        motivo: 'Condutor orientado via WhatsApp a agendar exame de renovação no DETRAN.'
    });
    const avP2AposRegistro = harness.avaliarCondutorCompleto(p2ComComunicacao, refBase);
    assert.strictEqual(avP2AposRegistro.alertaCom.comunicacaoPendente, false);
    assert.strictEqual(p2ComComunicacao.comunicacoes.length, 1);
    assert.strictEqual(p2ComComunicacao.comunicacoes[0].status_registro, 'REGISTRADA');
    assert.strictEqual(p2ComComunicacao.comunicacoes[0].estagio_no_momento, 'A_VENCER');
    const avP2AposVencer = harness.avaliarCondutorCompleto(p2ComComunicacao, '2026-11-25');
    assert.strictEqual(avP2AposVencer.situacaoCnh.vencida, true);
    assert.strictEqual(avP2AposVencer.alertaCom.comunicacaoPendente, true);
    assert.strictEqual(avP2AposVencer.alertaCom.decisaoPendenteReavisoVencida, false);
    assert.strictEqual(harness.calcularIndicadoresGerais([avP2AposVencer]).comunicacoesPendentes, 1);
    assert.strictEqual(harness.avaliarCondutorCompleto(p2ComComunicacao, '2026-11-20').alertaCom.comunicacaoPendente, false, 'Aviso anterior vale ate o dia de vencimento');
    assert.strictEqual(harness.avaliarCondutorCompleto(p2ComComunicacao, '2026-11-21').alertaCom.comunicacaoPendente, true, 'No dia seguinte exige reaviso');
    const comSnapshot = JSON.stringify(p2ComComunicacao.comunicacoes);
    const comReaviso = { ...p2ComComunicacao, comunicacoes: [...p2ComComunicacao.comunicacoes, { ...p2ComComunicacao.comunicacoes[0], estagio_no_momento: 'VENCIDA' }] };
    assert.strictEqual(harness.avaliarCondutorCompleto(comReaviso, '2026-11-25').alertaCom.comunicacaoPendente, false, 'Novo aviso como vencida encerra pendencia');
    assert.strictEqual(JSON.stringify(p2ComComunicacao.comunicacoes), comSnapshot, 'Avaliacao nao altera historico');
    assert.strictEqual(harness.avaliarCondutorCompleto({ ...p2ComComunicacao, ativo: false }, '2026-11-25').alertaCom.comunicacaoPendente, false, 'Inativo nao gera reaviso');
    definirRelogioSandbox('2026-11-25T15:00:00.000Z');
    await Promise.all([
        harness.persistirComunicacaoExplicita({
            condutor_id: p2.id,
            cnh_ciclo_id_esperado: p2.cnh_ciclo_id,
            vencimento_comunicado: p2.cnh_validade,
            canal: 'DDS_PRESENCIAL',
            motivo: 'Orientação presencial no DDS.'
        }),
        harness.persistirComunicacaoExplicita({
            condutor_id: p2.id,
            cnh_ciclo_id_esperado: p2.cnh_ciclo_id,
            vencimento_comunicado: p2.cnh_validade,
            canal: 'EMAIL',
            motivo: 'Notificação por e-mail ao preposto da ARTEC.'
        })
    ]);
    definirRelogioSandbox('2026-11-09T15:00:00.000Z');
    const p2AposConcorrenciaCom = dbSimulado.condutores.get(p2.id);
    assert.strictEqual(p2AposConcorrenciaCom.comunicacoes.length, 3);
    const cicloAntigoP2 = p2.cnh_ciclo_id;
    const p2Renovado = await harness.persistirCadastroOuEdicaoCondutor({
        id: p2.id,
        versao_esperada: p2AposConcorrenciaCom.versao,
        nome: p2.nome,
        vinculo: p2.vinculo,
        empresa: p2.empresa,
        funcao: p2.funcao,
        setor_frente: p2.setor_frente,
        cnh_categoria: 'C',
        cnh_validade: '2029-11-20',
        modo_alteracao_cnh: 'RENOVACAO',
        justificativa_alteracao_cnh: 'CNH renovada por 3 anos',
        antecedencia_alerta_dias: 30,
        avaliacoes: []
    });
    assert.strictEqual(p2Renovado.comunicacoes.length, 3);
    assert.ok(p2Renovado.comunicacoes.every(c => c.status_registro === 'REGISTRADA' && c.cnh_ciclo_id === cicloAntigoP2));
    assert.strictEqual(p2Renovado.ciclos_cnh_historico[0].status_ciclo, 'SUBSTITUIDO_POR_RENOVACAO');
    let erroCicloTrocado = null;
    try {
        await harness.persistirComunicacaoExplicita({
            condutor_id: p2.id,
            cnh_ciclo_id_esperado: cicloAntigoP2,
            vencimento_comunicado: '2026-11-20',
            canal: 'TELEFONE',
            motivo: 'Tentativa atrasada sem flag de ciclo histórico',
            permitir_ciclo_historico: false
        });
    } catch (e) {
        erroCicloTrocado = e;
    }
    assert.ok(erroCicloTrocado && erroCicloTrocado.message.includes('CICLO_CNH_ALTERADO'));
    console.log('✅ Teste 6: Comunicações imutáveis, cópia sem baixa, concorrência de comunicações e bloqueio de ciclo trocado aprovados');
    // -------------------------------------------------------------------------
    // TESTE 7: Conflito de Edição Concorrente (versão otimista) e Falha de
    //          Persistência mantendo modal aberto sem falso sucesso
    // -------------------------------------------------------------------------
    harness.abrirModalCadastroCondutor(p2.id);
    assert.strictEqual(harness.state.modalAtivo, 'CADASTRO');
    await harness.persistirCadastroOuEdicaoCondutor({
        id: p2.id,
        versao_esperada: p2Renovado.versao,
        nome: 'Condutor Beta Editado Concorrente',
        vinculo: p2.vinculo,
        empresa: p2.empresa,
        funcao: p2.funcao,
        setor_frente: p2.setor_frente,
        cnh_categoria: 'C',
        cnh_validade: '2029-11-20',
        modo_alteracao_cnh: 'MANTIDO',
        antecedencia_alerta_dias: 30,
        avaliacoes: []
    });
    harness.state.modalDados.funcao = 'Tentativa Sobrescrita';
    await harness.submeterModalCadastro();
    assert.strictEqual(harness.state.modalAtivo, 'CADASTRO');
    assert.ok(harness.state.erroModal.includes('CONFLITO_CONCORRENCIA'));
    assert.strictEqual(harness.state.avisoToastInterno.includes('salvo com sucesso'), false);
    harness.fecharModalAtivo();
    assert.strictEqual(harness.state.modalAtivo, null);
    harness.abrirModalCadastroCondutor(p1.id);
    assert.strictEqual(harness.state.modalDados.id, p1.id);
    assert.ok(harness.state.modalDados.nome.includes('Condutor Alfa'));
    harness.fecharModalAtivo();
    console.log('✅ Teste 7: Conflito de edição concorrente, erro de persistência sem falso sucesso e cancelar/trocar registro aprovados');
    // -------------------------------------------------------------------------
    // TESTE 8: Escape XSS no DOM, Filtros, KPIs e Inativação sem exclusão
    // -------------------------------------------------------------------------
    harness.renderizarInterfaceNoContainer();
    const htmlLista = elements['page-gestao_de_condutores'].innerHTML;
    assert.ok(!htmlLista.includes('<script>alert(1)</script>'));
    assert.ok(htmlLista.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    harness.abrirModalStatusCondutor(p1.id);
    harness.state.modalDados.motivo = 'Desmobilizado do contrato';
    await harness.submeterModalStatus();
    const p1Inativo = dbSimulado.condutores.get(p1.id);
    assert.strictEqual(p1Inativo.ativo, false);
    assert.strictEqual(elements['kpiCondutoresAtivosDistintos'].textContent, '1');
    let erroCopiaInativo = null;
    try {
        harness.gerarTextoComunicacaoPtBr(p1Inativo);
    } catch (e) {
        erroCopiaInativo = e;
    }
    assert.ok(erroCopiaInativo);
    console.log('✅ Teste 8: Escape XSS, KPIs dinâmicos e inativação preservando histórico aprovados');
    // -------------------------------------------------------------------------
    // TESTE 9: Falha de consulta nunca vira lista vazia de sucesso + Bloqueio
    //          de Conta Teste / Sessão Auth ausente ou divergente
    // -------------------------------------------------------------------------
    dbSimulado.forcarErroConsulta = 'Timeout simulado de conexão com Supabase';
    await harness.carregarCondutoresDoBanco();
    const htmlErro = elements['page-gestao_de_condutores'].innerHTML;
    assert.ok(htmlErro.includes('condutoresEstadoErro'));
    assert.ok(!htmlErro.includes('condutoresEstadoVazio'));
    dbSimulado.forcarErroConsulta = null;
    const jwtBackup = dbSimulado.sessaoJwt;
    dbSimulado.sessaoJwt = null;
    dbSimulado.sessaoVisual = { matricula: 'TESTE', nome: 'Conta Teste', role: 'Admin', ver_todos: true };
    await harness.carregarCondutoresDoBanco();
    const htmlSemJwt = elements['page-gestao_de_condutores'].innerHTML;
    assert.ok(htmlSemJwt.includes('condutoresEstadoSemPermissao'));
    assert.ok(htmlSemJwt.includes('CONTA_TESTE_SEM_JWT_AUTH'));
    dbSimulado.sessaoJwt = jwtBackup;
    dbSimulado.sessaoVisual = {
        matricula: '76',
        nome: 'João Everton',
        email: 'joao@coppisf.com.br',
        auth_user_id: '11111111-2222-4333-8444-555555555555',
        role: 'Admin',
        ver_todos: true
    };
    await harness.carregarCondutoresDoBanco();
    console.log('✅ Teste 9: Falha de consulta com retry e bloqueio estrito sem JWT (sem fallback anon) aprovados');
    // -------------------------------------------------------------------------
    // TESTE 10: Navegação cruzada EPI <-> Gestão de Condutores em AMBOS os
    //           roteadores (dashboard.js e epi_estoque.js) e Zero escrita em
    //           colaboradores_efetivo / colaboradores_checklist
    // -------------------------------------------------------------------------
    for (const [nomeRoteador, fnShowPage] of [['dashboard.js', showDbPageCore], ['epi_estoque.js', showDbPageEpi]]) {
        sandbox.showDbPage = fnShowPage;
        sandbox.showDbPage('epi');
        assert.ok(elements['page-epi'].classList.contains('active'));
        assert.strictEqual(elements['pageTitle'].textContent, 'EPI');
        sandbox.showDbPage('gestao_de_condutores');
        assert.ok(elements['page-gestao_de_condutores'].classList.contains('active'));
        assert.ok(!elements['page-epi'].classList.contains('active'));
        assert.ok(elements['navGestaoDeCondutores'].classList.contains('active'));
        assert.strictEqual(elements['pageTitle'].textContent, 'GESTÃO DE CONDUTORES - CNH');
        sandbox.showDbPage('epi');
        assert.ok(elements['page-epi'].classList.contains('active'));
        assert.ok(!elements['page-gestao_de_condutores'].classList.contains('active'));
    }
    const escritasProibidas = dbSimulado.tabelasEscritas.filter(
        e => e.url.includes('colaboradores_efetivo') || e.url.includes('colaboradores_checklist')
    );
    assert.strictEqual(escritasProibidas.length, 0);
    console.log('✅ Teste 10: Navegação cruzada EPI <-> Condutores nos 2 roteadores e isolamento de colaboradores_efetivo/checklist aprovados');
    // -------------------------------------------------------------------------
    // TESTE 11: Regressões obrigatórias da Auditoria Codex (7 sondas + identidade residual)
    // -------------------------------------------------------------------------
    const pessoaAuditoria = {
        id: 'auditoria-A',
        nome: 'Pessoa Fictícia',
        ativo: true,
        cnh_categoria: 'B',
        cnh_validade: '2026-11-08',
        cnh_ciclo_id: 'ciclo-A',
        avaliacoes: [],
        comunicacoes: [],
        ciclos_cnh_historico: []
    };
    const cnhAud = harness.calcularSituacaoCnh(pessoaAuditoria, '2026-11-09');
    const semAtivAud = harness.avaliarCondutorCompleto(pessoaAuditoria, '2026-11-09');
    assert.strictEqual(semAtivAud.avaliacoesCalculadas[0].statusPrioritario, 'PENDENTE', 'Sem atividade cadastrada deve permanecer PENDENTE mesmo com CNH vencida');
    const msgAud = harness.gerarTextoComunicacaoPtBr(pessoaAuditoria, cnhAud);
    assert.strictEqual(msgAud.includes('está bloqueada'), false, 'Mensagem de comunicação não pode inventar bloqueio operacional geral');
    let estadoExtraidoPublico;
    await sandbox.renderGestaoDeCondutoresPanel({
        __apenasInspecionarHarness: true,
        __testHarnessCallback: (h) => { estadoExtraidoPublico = h.state; }
    });
    assert.strictEqual(Boolean(estadoExtraidoPublico), false, 'Entrada pública window.renderGestaoDeCondutoresPanel não pode expor estado privado');
    // Caso 11.4a: Conta Teste COM JWT residual ativo no navegador -> deve bloquear!
    dbSimulado.sessaoVisual = { matricula: 'TESTE', nome: 'Teste', role: 'Admin' };
    const authTesteComJwtResidual = await harness.verificarSessaoEAutorizacaoModulo();
    assert.strictEqual(authTesteComJwtResidual.autorizadoLeitura, false, 'Conta Teste nunca pode reutilizar JWT residual');
    assert.strictEqual(authTesteComJwtResidual.uid, null);
    // Caso 11.4b: Outro usuário sem e-mail/auth_user_id na sessão visual COM JWT residual do usuário anterior -> deve bloquear!
    dbSimulado.sessaoVisual = { matricula: '99', nome: 'Outro Usuário Sem Email', role: 'Admin' };
    const authOutroSemEmail = await harness.verificarSessaoEAutorizacaoModulo();
    assert.strictEqual(authOutroSemEmail.autorizadoLeitura, false, 'Sessão visual sem vínculo verificável não pode herdar JWT residual');
    assert.strictEqual(authOutroSemEmail.divergenciaIdentidade, true);
    // Caso 11.5: Trocar UID invalida imediatamente dados/cache do usuário anterior
    harness.state.condutores = [pessoaAuditoria];
    harness.state.carregadoUmaVez = true;
    dbSimulado.sessaoVisual = {
        matricula: 'outra',
        nome: 'Outra Pessoa',
        email: 'outra@example.invalid',
        auth_user_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        role: 'Admin',
        ver_todos: true
    };
    dbSimulado.sessaoJwt.user = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', email: 'outra@example.invalid' };
    await sandbox.renderGestaoDeCondutoresPanel();
    assert.strictEqual(
        harness.state.condutores.some(c => c.id === 'auditoria-A'),
        false,
        'Trocar UID deve invalidar imediatamente o cache de condutores do usuário anterior'
    );
    // Caso 11.6: Correção de validade mantendo ciclo não baixa automaticamente pendência da nova data
    const corrigidaAud = {
        ...pessoaAuditoria,
        cnh_validade: '2026-11-07',
        comunicacoes: [
            {
                cnh_ciclo_id: 'ciclo-A',
                vencimento_comunicado: '2026-11-08',
                estagio_no_momento: 'VENCIDA',
                registrado_em: '2026-11-09T10:00:00Z',
                canal: 'EMAIL'
            }
        ]
    };
    const alertaCorrigida = harness.avaliarAlertaEComunicacaoCondutor(
        corrigidaAud,
        harness.calcularSituacaoCnh(corrigidaAud, '2026-11-09')
    );
    assert.strictEqual(alertaCorrigida.comunicacaoPendente, true, 'Aviso para validade antiga não baixa pendência da nova data corrigida');
    assert.strictEqual(alertaCorrigida.comunicacoesCicloAtual.length, 1, 'Comunicação antiga permanece preservada no histórico do ciclo');
    // Restaura sessão principal
    dbSimulado.sessaoVisual = {
        matricula: '76',
        nome: 'João Everton',
        email: 'joao@coppisf.com.br',
        auth_user_id: '11111111-2222-4333-8444-555555555555',
        role: 'Admin',
        ver_todos: true
    };
    dbSimulado.sessaoJwt.user = { id: '11111111-2222-4333-8444-555555555555', email: 'joao@coppisf.com.br' };
    console.log('✅ Teste 11: Todas as 7 sondas de regressão do Codex + bloqueio de identidade residual aprovados');
    // -------------------------------------------------------------------------
    // TESTE 12: Resposta atrasada de sessão anterior descartada, distinção entre
    //           negação do banco e lista vazia, e revogação de escrita antes de salvar
    // -------------------------------------------------------------------------
    let resolverGetAtrasadoA = null;
    const getAIniciado = new Promise(notificarInicio => {
        dbSimulado.interceptarGetCondutores = () => new Promise(resolve => {
            resolverGetAtrasadoA = resolve;
            notificarInicio();
        });
    });
    // Inicia carregamento lento sob Usuário A (João) e aguarda chegar no GET HTTP
    const promessaCargaA = harness.carregarCondutoresDoBanco();
    await getAIniciado;
    dbSimulado.interceptarGetCondutores = null;
    // Enquanto o GET de A está pendente em rede, troca para Usuário B com leitura NEGADA no banco
    dbSimulado.sessaoVisual = {
        matricula: '50',
        nome: 'Usuário B Sem Permissão',
        email: 'userb@coppisf.com.br',
        auth_user_id: '22222222-3333-4444-8555-666666666666',
        role: 'Visitante',
        ver_todos: true
    };
    dbSimulado.sessaoJwt.user = { id: '22222222-3333-4444-8555-666666666666', email: 'userb@coppisf.com.br' };
    dbSimulado.forcarPodeLerBanco = false;
    await sandbox.renderGestaoDeCondutoresPanel();
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('condutoresEstadoSemPermissao'), 'Negação do banco deve exibir tela de falta de permissão, nunca lista vazia');
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('PERMISSAO_NEGADA_PELO_BANCO'));
    // Agora a resposta atrasada de A chega!
    dbSimulado.interceptarGetCondutores = null;
    resolverGetAtrasadoA({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'vazamento-A', nome: 'Registro Secreto de A', ativo: true }])
    });
    await promessaCargaA;
    assert.strictEqual(harness.state.condutores.length, 0, 'Resposta atrasada do usuário A deve ser descartada após troca para usuário B');
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('condutoresEstadoSemPermissao'));
    // Restaura Usuário A e testa revogação de escrita antes de gravar no modal
    dbSimulado.forcarPodeLerBanco = true;
    dbSimulado.forcarPodeEscreverBanco = true;
    dbSimulado.sessaoVisual = {
        matricula: '76',
        nome: 'João Everton',
        email: 'joao@coppisf.com.br',
        auth_user_id: '11111111-2222-4333-8444-555555555555',
        role: 'Admin',
        ver_todos: true
    };
    dbSimulado.sessaoJwt.user = { id: '11111111-2222-4333-8444-555555555555', email: 'joao@coppisf.com.br' };
    await harness.carregarCondutoresDoBanco();
    harness.abrirModalCadastroCondutor(p2.id);
    // Revoga escrita no banco com o modal já aberto
    dbSimulado.forcarPodeEscreverBanco = false;
    await harness.submeterModalCadastro();
    assert.ok(harness.state.erroModal.includes('permissão de escrita'), 'Revogação de escrita antes de salvar deve bloquear a gravação');
    harness.fecharModalAtivo();
    dbSimulado.forcarPodeEscreverBanco = undefined;
    console.log('✅ Teste 12: Descarte de respostas atrasadas entre usuários, distinção RLS vs [] e revogação ao gravar aprovados');
    // -------------------------------------------------------------------------
    // TESTE 13: Preservação de aprovação/histórico de regra ao editar evidência
    //           individual vs arquivamento ao mudar requisito + bloqueio de forja na RPC
    // -------------------------------------------------------------------------
    // Simula no banco um registro que já possui uma avaliação com regra formalmente aprovada
    const idComRegraAprovada = crypto.randomUUID();
    dbSimulado.condutores.set(idComRegraAprovada, {
        id: idComRegraAprovada,
        nome: 'Condutor Com Regra Aprovada',
        vinculo: 'PROPRIO',
        empresa: 'COP',
        funcao: 'Operador de Munck',
        setor_frente: 'FRENTE 03',
        ativo: true,
        cnh_categoria: 'D',
        cnh_validade: '2027-08-10',
        cnh_ciclo_id: crypto.randomUUID(),
        antecedencia_alerta_dias: 30,
        avaliacoes: [
            {
                avaliacao_id: 'av-aprovada-1',
                atividade_codigo: 'CAMINHAO_MUNCK',
                atividade_nome: 'Caminhão Munck',
                exige_cnh: 'SIM',
                categorias_aceitas: ['C', 'D', 'E'],
                regra_aprovada: true,
                regra_versao: 'v2.1-SST',
                regra_aprovada_por_uid: '11111111-2222-4333-8444-555555555555',
                regra_aprovada_por_nome: 'João Everton',
                regra_aprovada_em: '2026-10-15',
                regras_historico: [],
                treinamentos: [
                    {
                        codigo: 'NR-11',
                        nome: 'Operação de Guindauto',
                        status_aplicabilidade: 'OBRIGATORIO',
                        exige_validade: 'SIM',
                        data_realizacao: '2025-06-01',
                        validade: '2026-06-01',
                        comprovacao_ref: 'CERT-ANTIGO',
                        conferido_por: 'João Everton',
                        conferido_em: '2025-06-02'
                    }
                ]
            }
        ],
        comunicacoes: [],
        ciclos_cnh_historico: [],
        historico_eventos: [],
        versao: 1
    });
    await harness.carregarCondutoresDoBanco();
    // 13.1: Editar apenas o setor_frente e a evidência individual do treinamento (nova data_realizacao/validade/comprovacao_ref),
    // sem alterar os requisitos da regra -> DEVE PRESERVAR regra_aprovada=true e regra_versao='v2.1-SST'!
    const regAprov = dbSimulado.condutores.get(idComRegraAprovada);
    const avEditadaEvidencia = JSON.parse(JSON.stringify(regAprov.avaliacoes));
    avEditadaEvidencia[0].treinamentos[0].data_realizacao = '2026-06-01';
    avEditadaEvidencia[0].treinamentos[0].validade = '2027-06-01';
    avEditadaEvidencia[0].treinamentos[0].comprovacao_ref = 'CERT-RENOVADO-2026';
    const salvoPreservandoRegra = await harness.persistirCadastroOuEdicaoCondutor({
        id: idComRegraAprovada,
        versao_esperada: regAprov.versao,
        nome: regAprov.nome,
        vinculo: regAprov.vinculo,
        empresa: regAprov.empresa,
        funcao: regAprov.funcao,
        setor_frente: 'FRENTE 04 (TRANSFERIDO)',
        cnh_categoria: regAprov.cnh_categoria,
        cnh_validade: regAprov.cnh_validade,
        modo_alteracao_cnh: 'MANTIDO',
        antecedencia_alerta_dias: 30,
        avaliacoes: avEditadaEvidencia
    });
    assert.strictEqual(salvoPreservandoRegra.avaliacoes[0].regra_aprovada, true, 'Edição de evidência individual/cadastro sem mudar requisito deve preservar regra_aprovada=true');
    assert.strictEqual(salvoPreservandoRegra.avaliacoes[0].regra_versao, 'v2.1-SST');
    // 13.2: Alterar requisito do treinamento (exige_validade de SIM para NAO) -> arquiva regra anterior em regras_historico e torna a atual pendente (false)
    const avMudouRequisito = JSON.parse(JSON.stringify(salvoPreservandoRegra.avaliacoes));
    avMudouRequisito[0].treinamentos[0].exige_validade = 'NAO';
    const salvoMudouRequisito = await harness.persistirCadastroOuEdicaoCondutor({
        id: idComRegraAprovada,
        versao_esperada: salvoPreservandoRegra.versao,
        nome: salvoPreservandoRegra.nome,
        vinculo: salvoPreservandoRegra.vinculo,
        empresa: salvoPreservandoRegra.empresa,
        funcao: salvoPreservandoRegra.funcao,
        setor_frente: salvoPreservandoRegra.setor_frente,
        cnh_categoria: salvoPreservandoRegra.cnh_categoria,
        cnh_validade: salvoPreservandoRegra.cnh_validade,
        modo_alteracao_cnh: 'MANTIDO',
        antecedencia_alerta_dias: 30,
        avaliacoes: avMudouRequisito
    });
    assert.strictEqual(salvoMudouRequisito.avaliacoes[0].regra_aprovada, false, 'Mudança em requisito de treinamento deve tornar a regra pendente');
    assert.strictEqual(salvoMudouRequisito.avaliacoes[0].regras_historico.length, 1, 'Regra anterior deve ser arquivada em regras_historico');
    assert.strictEqual(salvoMudouRequisito.avaliacoes[0].regras_historico[0].regra_versao, 'v2.1-SST');
    // 13.3: Tentativa direta via RPC de forjar regra_aprovada=true deve ser rejeitada pelo servidor
    const respForja = await sandbox.fetch('https://simulado.supabase.co/rest/v1/rpc/salvar_condutor_cnh_atomico', {
        method: 'POST',
        headers: {
            apikey: sandbox.SUPABASE_KEY,
            Authorization: `Bearer ${dbSimulado.sessaoJwt.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            p_id: idComRegraAprovada,
            p_versao_esperada: salvoMudouRequisito.versao,
            p_nome: salvoMudouRequisito.nome,
            p_vinculo: salvoMudouRequisito.vinculo,
            p_empresa: salvoMudouRequisito.empresa,
            p_funcao: salvoMudouRequisito.funcao,
            p_setor_frente: salvoMudouRequisito.setor_frente,
            p_cnh_categoria: salvoMudouRequisito.cnh_categoria,
            p_cnh_validade: salvoMudouRequisito.cnh_validade,
            p_modo_alteracao_cnh: 'MANTIDO',
            p_antecedencia_alerta_dias: 30,
            p_avaliacoes: [
                {
                    ...salvoMudouRequisito.avaliacoes[0],
                    regra_aprovada: true,
                    regra_versao: 'v99-FORJADA',
                    regra_aprovada_por_uid: '11111111-2222-4333-8444-555555555555',
                    regra_aprovada_por_nome: 'João Everton',
                    regra_aprovada_em: '2026-11-09'
                }
            ]
        })
    });
    assert.strictEqual(respForja.ok, false, 'RPC deve rejeitar tentativa direta de forjar aprovação de regra pelo cliente');
    const txtForja = await respForja.text();
    assert.ok(txtForja.includes('APROVACAO_REGRA_NAO_AUTORIZADA'));
    console.log('✅ Teste 13: Preservação de aprovação ao editar evidência, arquivamento ao mudar requisito e bloqueio de forja na RPC aprovados');
    // -------------------------------------------------------------------------
    // TESTE 14: Comunicação atravessando meia-noite SP, Paginação > 1.000 linhas,
    //           Preservação de foco ao digitar nos filtros/modal e Throw síncrono no roteador
    // -------------------------------------------------------------------------
    // 14.1: Comunicação atravessando a meia-noite em America/Sao_Paulo
    definirRelogioSandbox('2026-11-09T15:00:00.000Z'); // 2026-11-09 em SP
    const condMeiaNoite = await harness.persistirCadastroOuEdicaoCondutor({
        nome: 'Condutor Virada Meia-Noite',
        vinculo: 'PROPRIO',
        empresa: 'COP',
        funcao: 'Motorista',
        setor_frente: 'FRENTE 01',
        cnh_categoria: 'B',
        cnh_validade: '2026-11-09', // Vence hoje em 2026-11-09
        antecedencia_alerta_dias: 30,
        avaliacoes: []
    });
    harness.abrirModalComunicacaoCondutor(condMeiaNoite.id);
    assert.strictEqual(harness.state.modalDados.estagio_no_momento, 'VENCE_HOJE');
    // Avança o relógio para 2026-11-10 00:05:00 em America/Sao_Paulo (03:05 UTC) ANTES de clicar em salvar
    definirRelogioSandbox('2026-11-10T03:05:00.000Z');
    harness.state.modalDados.canal = 'WHATSAPP';
    harness.state.modalDados.motivo = 'Aviso enviado logo após a meia-noite';
    await harness.submeterModalComunicacao();
    const condAposMeiaNoite = dbSimulado.condutores.get(condMeiaNoite.id);
    assert.strictEqual(
        condAposMeiaNoite.comunicacoes[0].estagio_no_momento,
        'VENCIDA',
        'O banco deve gravar o estágio real calculado no servidor no momento do registro (VENCIDA após meia-noite), não o estágio antigo da abertura do modal'
    );
    definirRelogioSandbox('2026-11-09T15:00:00.000Z');
    // 14.2: Preservação da instância DOM e foco/cursor ao digitar nome letra por letra no filtro
    harness.renderizarInterfaceNoContainer();
    const inputBuscaInicial = elements['condFiltroBuscaNome'];
    assert.ok(inputBuscaInicial, 'Input de busca deve existir');
    const containerModulo = elements['page-gestao_de_condutores'];
    const textoDigitado = 'Condutor Virada';
    for (let i = 1; i <= textoDigitado.length; i++) {
        inputBuscaInicial.value = textoDigitado.slice(0, i);
        inputBuscaInicial.selectionStart = i;
        inputBuscaInicial.selectionEnd = i;
        containerModulo.dispatchEvent({ type: 'input', target: inputBuscaInicial });
        assert.strictEqual(
            elements['condFiltroBuscaNome'],
            inputBuscaInicial,
            `Digitar a letra #${i} NÃO pode recriar o elemento #condFiltroBuscaNome nem perder foco`
        );
        assert.strictEqual(elements['condFiltroBuscaNome'].selectionStart, i);
    }
    assert.ok(elements['condutoresListaContainer'].innerHTML.includes('Condutor Virada Meia-Noite'));
    inputBuscaInicial.value = '';
    containerModulo.dispatchEvent({ type: 'input', target: inputBuscaInicial });
    // Preservação do modal ao alterar a validade da CNH em edição
    harness.abrirModalCadastroCondutor(condMeiaNoite.id);
    const inputValidadeModal = elements['condFormCnhValidade'];
    inputValidadeModal.value = '2028-11-09';
    containerModulo.dispatchEvent({ type: 'input', target: inputValidadeModal });
    assert.strictEqual(
        elements['condFormCnhValidade'],
        inputValidadeModal,
        'Alterar a data de validade da CNH no modal deve atualizar apenas o sub-bloco de justificativa sem recriar o input'
    );
    assert.ok(elements['condSlotAlteracaoValidadeCnh'].innerHTML.includes('condFormModoAlteracaoCnh'));
    harness.fecharModalAtivo();
    // 14.3: Paginação PostgREST > 1.000 registros (ex.: 1.250 registros em 2 páginas)
    dbSimulado.condutores.clear();
    for (let i = 1; i <= 1250; i++) {
        const idPag = `pag-id-${String(i).padStart(4, '0')}`;
        dbSimulado.condutores.set(idPag, {
            id: idPag,
            nome: `Condutor Paginado ${String(i).padStart(4, '0')}`,
            vinculo: 'TERCEIRO',
            empresa: 'ARTEC',
            funcao: 'Motorista',
            setor_frente: 'FRENTE 01',
            ativo: true,
            cnh_categoria: 'B',
            cnh_validade: '2027-12-01',
            cnh_ciclo_id: `ciclo-${idPag}`,
            antecedencia_alerta_dias: 30,
            avaliacoes: [],
            comunicacoes: [],
            ciclos_cnh_historico: [],
            historico_eventos: [],
            versao: 1
        });
    }
    await harness.carregarCondutoresDoBanco();
    assert.strictEqual(harness.state.condutores.length, 1250, 'Paginação deve carregar todos os 1.250 registros (> 1000)');
    assert.strictEqual(elements['kpiCondutoresAtivosDistintos'].textContent, '1250');
    // 14.4: Proteção contra throw síncrono em showDbPage nos dois roteadores
    const renderOriginal = sandbox.renderGestaoDeCondutoresPanel;
    sandbox.renderGestaoDeCondutoresPanel = () => {
        throw new Error('Falha síncrona simulada no render');
    };
    for (const fnShow of [showDbPageCore, showDbPageEpi]) {
        sandbox.showDbPage = fnShow;
        sandbox.showDbPage('gestao_de_condutores');
        await new Promise(r => setImmediate(r));
        assert.ok(
            elements['page-gestao_de_condutores'].innerHTML.includes('Falha síncrona simulada no render'),
            'Roteador deve capturar throw síncrono sem quebrar a navegação'
        );
    }
    sandbox.renderGestaoDeCondutoresPanel = renderOriginal;
    console.log('✅ Teste 14: Comunicação na virada da meia-noite SP, paginação >1000, preservação de foco nos inputs e captura de throw síncrono aprovados');
    // -------------------------------------------------------------------------
    // TESTE 15: Auditoria estática complementar da minuta SQL (Nota: NÃO substitui
    //           execução em PostgreSQL real isolado, que permanece bloqueada)
    // -------------------------------------------------------------------------
    const sqlText = fs.readFileSync('supabase/migrations/20261109_modulo_gestao_condutores_cnh.sql', 'utf8');
    const sqlSemComentarios = sqlText.replace(/--.*$/gm, '');
    assert.ok(!sqlSemComentarios.includes('REVOKE ALL ON SCHEMA app_private'), 'SQL não deve revogar USAGE de app_private dos owners de funções');
    assert.ok(!/condutores_cnh_is_iso_date[\s\S]{0,120}STRICT/i.test(sqlSemComentarios), 'condutores_cnh_is_iso_date não deve ser STRICT para não retornar NULL');
    assert.ok(sqlSemComentarios.includes("COALESCE(jsonb_typeof(v_item->'avaliacao_id'), 'missing') <> 'string'"), 'Validador de avaliações deve ser à prova de NULL com COALESCE(jsonb_typeof)');
    assert.ok(sqlSemComentarios.includes("COALESCE(jsonb_typeof(v_trein->'codigo'), 'missing') <> 'string'"), 'Validador de treinamentos deve ser à prova de NULL com COALESCE(jsonb_typeof)');
    assert.ok(sqlSemComentarios.includes("COALESCE(jsonb_typeof(v_item->'comunicacao_id'), 'missing') <> 'string'"), 'Validador de comunicações deve ser à prova de NULL com COALESCE(jsonb_typeof)');
    assert.ok(sqlSemComentarios.includes('condutores_cnh_validar_historico_eventos(historico_eventos)'), 'Constraint de historico_eventos deve validar os itens com condutores_cnh_validar_historico_eventos');
    assert.ok(!sqlSemComentarios.includes("ILIKE 'tecnico%'") && !sqlSemComentarios.includes("LIKE '%ENFERMEIR%'"), 'SQL não deve usar heurísticas amplas ILIKE tecnico% ou LIKE %ENFERMEIR%');
    assert.ok(sqlSemComentarios.includes('proteger_e_mesclar_avaliacoes_condutor'), 'RPC deve proteger regras/histórico de avaliações e validar datas futuras no servidor');
    assert.ok(sqlSemComentarios.includes('v_diff_dias := (p_vencimento_comunicado - v_hoje_sp)'), 'RPC registrar_comunicacao_cnh_atomica deve calcular estágio no servidor em America/Sao_Paulo');
    console.log('✅ Teste 15: Auditoria estática complementar da minuta SQL aprovada (execução em PostgreSQL isolado permanece reportada como bloqueada)');

    // -------------------------------------------------------------------------
    // TESTE 16: Regressões da Reauditoria Codex (B1, B2 e B3)
    //  - B1: Resposta atrasada de gravação (cadastro, status e comunicação),
    //        sair da sessão durante gravação, B abrir outro modal antes da
    //        resposta de A, erro atrasado de A não aparecer em B, e cancelamento
    //        de operação antiga se a sessão mudar durante auth assíncrono.
    //  - B2: Revalidação de leitura ao retornar ao módulo sem forcarRecarregamento
    //        e ao retomar foco/visibilidade (permissão de escrita não substitui leitura).
    //  - B3: Falha fechada (fail-closed) para contratos inválidos ({}, [], "false",
    //        "true", null, [1]) e distinção entre erro de contrato/rede e permissão.
    // -------------------------------------------------------------------------
    const restaurarSessaoJoao = () => {
        dbSimulado.forcarPodeLerBanco = true;
        dbSimulado.forcarPodeEscreverBanco = true;
        dbSimulado.forcarRespostaBrutaPodeLer = null;
        dbSimulado.forcarRespostaBrutaPodeEscrever = null;
        dbSimulado.forcarErroEscrita = null;
        dbSimulado.sessaoVisual = {
            matricula: '76',
            nome: 'João Everton',
            email: 'joao@coppisf.com.br',
            auth_user_id: '11111111-2222-4333-8444-555555555555',
            role: 'Admin',
            ver_todos: true
        };
        dbSimulado.sessaoJwt = {
            access_token: 'jwt-valido-123',
            expires_at: Math.floor(MockDate.now() / 1000) + 86400 * 30,
            user: {
                id: '11111111-2222-4333-8444-555555555555',
                email: 'joao@coppisf.com.br'
            }
        };
    };
    const ativarSessaoUsuarioB = () => {
        dbSimulado.sessaoVisual = {
            matricula: 'outra',
            nome: 'Outra Pessoa',
            email: 'outra@example.invalid',
            role: 'Admin',
            ver_todos: true
        };
        dbSimulado.sessaoJwt = {
            access_token: 'jwt-valido-b',
            expires_at: Math.floor(MockDate.now() / 1000) + 86400 * 30,
            user: {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                email: 'outra@example.invalid'
            }
        };
    };

    // 16.1 (B1): Resposta atrasada de CADASTRO de A não entra no cache de B e orienta recarregamento
    restaurarSessaoJoao();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    const fetchPadrao = sandbox.fetch;
    let liberarCadA, entrouCadA;
    const chegouCadA = new Promise(r => { entrouCadA = r; });
    const esperaCadA = new Promise(r => { liberarCadA = r; });
    sandbox.fetch = async (url, opts) => {
        const resp = await fetchPadrao(url, opts);
        if (String(url).includes('/rpc/salvar_condutor_cnh_atomico')) {
            entrouCadA();
            await esperaCadA;
        }
        return resp;
    };
    const promCadA = harness.persistirCadastroOuEdicaoCondutor({
        nome: 'Registro da sessão A',
        vinculo: 'PROPRIO',
        empresa: 'Ficticia',
        funcao: 'Ficticia',
        setor_frente: 'Ficticia',
        cnh_categoria: 'B',
        cnh_validade: '2026-11-20',
        avaliacoes: []
    });
    await chegouCadA;
    ativarSessaoUsuarioB();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    assert.strictEqual(harness.state.condutores.length, 0);
    liberarCadA();
    const resCadA = await promCadA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.condutores.some(c => c.nome === 'Registro da sessão A'), false, 'Cadastro atrasado de A nunca deve entrar no cache de B');
    assert.strictEqual(resCadA.__descartadoPorTrocaSessao, true, 'Gravação confirmada no banco não é desfeita, mas marca descarte local e orientação');
    assert.ok(harness.state.ultimoResultadoDescartadoSessaoAnterior.orientacao.includes('Recarregue'));

    // 16.2 (B1): Resposta atrasada de STATUS de A não entra no cache de B
    restaurarSessaoJoao();
    await harness.carregarCondutoresDoBanco();
    const alvoStatusId = resCadA.id;
    const alvoStatusVersao = dbSimulado.condutores.get(alvoStatusId).versao;
    let liberarStatA, entrouStatA;
    const chegouStatA = new Promise(r => { entrouStatA = r; });
    const esperaStatA = new Promise(r => { liberarStatA = r; });
    sandbox.fetch = async (url, opts) => {
        const resp = await fetchPadrao(url, opts);
        if (String(url).includes('/rpc/alterar_status_condutor_cnh_atomico')) {
            entrouStatA();
            await esperaStatA;
        }
        return resp;
    };
    const promStatA = harness.persistirAlteracaoStatusCondutor(alvoStatusId, alvoStatusVersao, true, 'Reativação por A');
    await chegouStatA;
    ativarSessaoUsuarioB();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    assert.strictEqual(harness.state.condutores.length, 0);
    liberarStatA();
    const resStatA = await promStatA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.condutores.length, 0, 'Status atrasado de A nunca deve entrar no cache de B');
    assert.strictEqual(resStatA.__descartadoPorTrocaSessao, true);

    // 16.3 (B1): Resposta atrasada de COMUNICAÇÃO de A não entra no cache de B
    restaurarSessaoJoao();
    await harness.carregarCondutoresDoBanco();
    const p1Atual = dbSimulado.condutores.get(resCadA.id);
    let liberarComA, entrouComA;
    const chegouComA = new Promise(r => { entrouComA = r; });
    const esperaComA = new Promise(r => { liberarComA = r; });
    sandbox.fetch = async (url, opts) => {
        const resp = await fetchPadrao(url, opts);
        if (String(url).includes('/rpc/registrar_comunicacao_cnh_atomica')) {
            entrouComA();
            await esperaComA;
        }
        return resp;
    };
    const promComA = harness.persistirComunicacaoExplicita({
        condutor_id: p1Atual.id,
        cnh_ciclo_id_esperado: p1Atual.cnh_ciclo_id,
        vencimento_comunicado: p1Atual.cnh_validade,
        canal: 'WHATSAPP',
        motivo: 'Aviso atrasado de A'
    });
    await chegouComA;
    ativarSessaoUsuarioB();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    liberarComA();
    const resComA = await promComA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.condutores.length, 0, 'Comunicação atrasada de A nunca deve entrar no cache de B');
    assert.strictEqual(resComA.__descartadoPorTrocaSessao, true);

    // 16.4 (B1): Sair da sessão (logout) durante gravação via modal + B abrir outro modal antes da resposta de A + erro atrasado de A não aparecer em B
    restaurarSessaoJoao();
    await harness.carregarCondutoresDoBanco();
    harness.abrirModalCadastroCondutor(null);
    harness.state.modalDados.nome = 'Submetido no Modal de A';
    harness.state.modalDados.empresa = 'COP';
    harness.state.modalDados.funcao = 'Motorista';
    harness.state.modalDados.setor_frente = 'SEDE';
    let liberarModalA, entrouModalA;
    const chegouModalA = new Promise(r => { entrouModalA = r; });
    const esperaModalA = new Promise(r => { liberarModalA = r; });
    sandbox.fetch = async (url, opts) => {
        const resp = await fetchPadrao(url, opts);
        if (String(url).includes('/rpc/salvar_condutor_cnh_atomico')) {
            entrouModalA();
            await esperaModalA;
        }
        return resp;
    };
    const promSubModalA = harness.submeterModalCadastro();
    await chegouModalA;
    // B assume a sessão e abre seu próprio modal antes da resposta de A chegar
    ativarSessaoUsuarioB();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    harness.abrirModalCadastroCondutor(null);
    harness.state.modalDados.nome = 'Rascunho Exclusivo de B';
    liberarModalA();
    await promSubModalA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.modalAtivo, 'CADASTRO', 'Resposta atrasada de A não pode fechar o modal aberto por B');
    assert.strictEqual(harness.state.modalDados.nome, 'Rascunho Exclusivo de B', 'Dados do modal de B devem permanecer intactos');
    assert.strictEqual(harness.state.condutores.length, 0, 'Cache de B permanece sem o registro de A');
    harness.fecharModalAtivo();

    // Agora testa erro atrasado de A não aparecer em B e logout durante gravação
    restaurarSessaoJoao();
    await harness.carregarCondutoresDoBanco();
    harness.abrirModalCadastroCondutor(null);
    harness.state.modalDados.nome = 'Modal A Vai Falhar';
    harness.state.modalDados.empresa = 'COP';
    harness.state.modalDados.funcao = 'Motorista';
    harness.state.modalDados.setor_frente = 'SEDE';
    let liberarErroA, entrouErroA;
    const chegouErroA = new Promise(r => { entrouErroA = r; });
    const esperaErroA = new Promise(r => { liberarErroA = r; });
    sandbox.fetch = async (url, opts) => {
        if (String(url).includes('/rpc/salvar_condutor_cnh_atomico')) {
            entrouErroA();
            await esperaErroA;
            return { ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro exclusivo da sessão A' }) };
        }
        return fetchPadrao(url, opts);
    };
    const promErroModalA = harness.submeterModalCadastro();
    await chegouErroA;
    ativarSessaoUsuarioB();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    harness.abrirModalCadastroCondutor(null);
    harness.state.modalDados.nome = 'Modal Limpo de B';
    liberarErroA();
    await promErroModalA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.erroModal, '', 'Erro atrasado de A NUNCA deve aparecer no modal de B');
    assert.strictEqual(harness.state.modalAtivo, 'CADASTRO');
    assert.strictEqual(harness.state.modalDados.nome, 'Modal Limpo de B');
    harness.fecharModalAtivo();

    // Logout durante gravação
    restaurarSessaoJoao();
    await harness.carregarCondutoresDoBanco();
    let liberarLogoutA, entrouLogoutA;
    const chegouLogoutA = new Promise(r => { entrouLogoutA = r; });
    const esperaLogoutA = new Promise(r => { liberarLogoutA = r; });
    sandbox.fetch = async (url, opts) => {
        const resp = await fetchPadrao(url, opts);
        if (String(url).includes('/rpc/salvar_condutor_cnh_atomico')) {
            entrouLogoutA();
            await esperaLogoutA;
        }
        return resp;
    };
    const promLogoutA = harness.persistirCadastroOuEdicaoCondutor({
        nome: 'Salvo Antes de Sair',
        vinculo: 'PROPRIO',
        empresa: 'COP',
        funcao: 'Motorista',
        setor_frente: 'SEDE',
        avaliacoes: []
    });
    await chegouLogoutA;
    dbSimulado.sessaoVisual = null;
    dbSimulado.sessaoJwt = null;
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    liberarLogoutA();
    await promLogoutA;
    sandbox.fetch = fetchPadrao;
    assert.strictEqual(harness.state.condutores.length, 0, 'Após sair da sessão, resposta atrasada não popula o cache');

    // Troca de sessão durante verificarSessaoEAutorizacaoModulo assíncrono cancela a operação antiga antes do POST
    restaurarSessaoJoao();
    await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    let chamouPostIndevido = false;
    dbSimulado.forcarRespostaBrutaPodeLer = async () => {
        // Durante a checagem de capacidade de A, a sessão muda para B!
        ativarSessaoUsuarioB();
        return { ok: true, status: 200, text: async () => 'true' };
    };
    sandbox.fetch = async (url, opts) => {
        if (String(url).includes('/rpc/salvar_condutor_cnh_atomico')) {
            chamouPostIndevido = true;
        }
        return fetchPadrao(url, opts);
    };
    let erroCanceladaTroca = null;
    try {
        await harness.persistirCadastroOuEdicaoCondutor({
            nome: 'Nao Pode Executar Como B',
            vinculo: 'PROPRIO',
            empresa: 'COP',
            funcao: 'Motorista',
            setor_frente: 'SEDE',
            avaliacoes: []
        });
    } catch (e) {
        erroCanceladaTroca = e;
    }
    sandbox.fetch = fetchPadrao;
    dbSimulado.forcarRespostaBrutaPodeLer = null;
    assert.ok(erroCanceladaTroca && erroCanceladaTroca.canceladaPorTrocaSessao === true, 'Operação antiga deve ser cancelada se a sessão mudar durante a autenticação assíncrona');
    assert.strictEqual(chamouPostIndevido, false, 'POST da operação antiga não pode prosseguir sob o novo usuário');

    // 16.5 (B2): Revogação de leitura após primeiro carregamento é detectada ao retornar sem forcarRecarregamento e no foco/visibilidade
    restaurarSessaoJoao();
    await sandbox.renderGestaoDeCondutoresPanel({ forcarRecarregamento: true });
    assert.ok(harness.state.condutores.length > 0);
    harness.abrirModalCadastroCondutor(null);
    assert.strictEqual(harness.state.modalAtivo, 'CADASTRO');
    // Revoga leitura mantendo escrita true (prova que permissão de escrita não substitui leitura!)
    dbSimulado.forcarPodeLerBanco = false;
    dbSimulado.forcarPodeEscreverBanco = true;
    await sandbox.renderGestaoDeCondutoresPanel(); // SEM forcarRecarregamento!
    assert.strictEqual(harness.state.statusAuth.autorizadoLeitura, false, 'Retornar ao módulo sem forcarRecarregamento deve revalidar leitura');
    assert.strictEqual(harness.state.statusAuth.autorizadoEscrita, false, 'Permissão de escrita não substitui verificação de leitura');
    assert.strictEqual(harness.state.condutores.length, 0, 'Revogação de leitura deve limpar os condutores em memória');
    assert.strictEqual(harness.state.modalAtivo, null, 'Revogação de leitura deve fechar qualquer modal aberto');
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('condutoresEstadoSemPermissao'));

    // Testa também revogação via evento de foco/visibilidade
    restaurarSessaoJoao();
    await sandbox.renderGestaoDeCondutoresPanel({ forcarRecarregamento: true });
    assert.ok(harness.state.condutores.length > 0);
    harness.abrirModalCadastroCondutor(null);
    dbSimulado.forcarPodeLerBanco = false;
    await harness.revalidarAoRetomarFocoOuVisibilidade();
    assert.strictEqual(harness.state.statusAuth.autorizadoLeitura, false);
    assert.strictEqual(harness.state.condutores.length, 0);
    assert.strictEqual(harness.state.modalAtivo, null);

    // 16.6 (B3): Formatos inesperados de resposta de capacidade falham fechado (fail-closed) e distinguem contrato/rede de falta de permissão
    restaurarSessaoJoao();
    for (const payloadInvalido of ['{}', '[]', '"false"', '"true"', 'null', '[1]', '{"outro":true}', 'texto-nao-json']) {
        dbSimulado.forcarRespostaBrutaPodeLer = async () => ({
            ok: true,
            status: 200,
            text: async () => payloadInvalido
        });
        const authInvalido = await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
        assert.strictEqual(authInvalido.autorizadoLeitura, false, `Formato inesperado (${payloadInvalido}) deve falhar fechado na leitura`);
        assert.strictEqual(authInvalido.autorizadoEscrita, false, `Formato inesperado (${payloadInvalido}) deve falhar fechado na escrita`);
        assert.strictEqual(
            authInvalido.motivoBloqueio,
            'RESPOSTA_CAPACIDADE_CONTRATO_INVALIDO',
            `Formato inesperado (${payloadInvalido}) deve ser distinguido como RESPOSTA_CAPACIDADE_CONTRATO_INVALIDO`
        );
    }
    dbSimulado.forcarRespostaBrutaPodeLer = async () => ({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway'
    });
    const authErroRede = await harness.verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
    assert.strictEqual(authErroRede.autorizadoLeitura, false);
    assert.strictEqual(authErroRede.autorizadoEscrita, false);
    assert.strictEqual(authErroRede.motivoBloqueio, 'ERRO_VERIFICACAO_CAPACIDADE_REDE', 'Falha HTTP/rede na capacidade deve ser distinguida de falta de permissão');
    restaurarSessaoJoao();
    await sandbox.renderGestaoDeCondutoresPanel({ forcarRecarregamento: true });
    // 16.7: Responsividade interna do módulo (estilo escopado + classes responsivas na lista e nos 4 modais)
    const htmlBase = elements['page-gestao_de_condutores'].innerHTML;
    assert.ok(htmlBase.includes('id="condutoresCnhEstiloInterno"'), 'Estilo responsivo interno escopado deve estar presente');
    assert.ok(htmlBase.includes('cond-filtros-grid'), 'Grade de filtros deve possuir classe responsiva cond-filtros-grid');
    assert.ok(htmlBase.includes('cond-cnh-status-grid'), 'Grade de status CNH deve possuir classe responsiva cond-cnh-status-grid');
    const idResp = harness.state.condutores[0].id;
    harness.abrirModalCadastroCondutor(idResp);
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('id="modalCondutorCadastro"'));
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('cond-modal-form-grid'));
    harness.abrirModalComunicacaoCondutor(idResp);
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('id="modalCondutorComunicacao"'));
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('cond-modal-actions'));
    harness.abrirModalStatusCondutor(idResp);
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('id="modalCondutorStatus"'));
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('cond-modal-actions'));
    harness.state.modalAtivo = 'HISTORICO';
    harness.state.modalDados = { condutor_id: idResp };
    harness.renderizarInterfaceNoContainer();
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('id="modalCondutorHistorico"'));
    assert.ok(elements['page-gestao_de_condutores'].innerHTML.includes('cond-modal-header'));
    harness.fecharModalAtivo();
    console.log('✅ Teste 16: Segregação de respostas de escrita atrasadas (B1), revalidação de leitura ao retornar/focar (B2), fail-closed de formato RPC (B3) e responsividade interna dos 4 modais aprovados');
    // -------------------------------------------------------------------------
    // TESTE 17: Busca na base do Efetivo (somente leitura) — autocompletar
    //           nome/função/setor, tolerância a acentos, filtro de ativos,
    //           aviso de duplicidade e degradação sem bloquear o cadastro
    // -------------------------------------------------------------------------
    let consultasBase = 0;
    harness.state.baseColaboradoresStatus = 'NAO_CARREGADA';
    harness.state.baseColaboradores = [];
    sandbox.supabaseFetch = async (tabela) => {
        consultasBase += 1;
        assert.strictEqual(tabela, 'colaboradores_efetivo', 'A base consultada deve ser a do Efetivo');
        return [
            {
                id: '1042',
                nome: 'João Éverton de Souza',
                funcao: 'Motorista Carreteiro',
                setor: 'Logística',
                status: 'ATIVO',
                dt_admissao: '2024-02-01',
                dt_demissao: null
            },
            {
                id: '2087',
                nome: 'José Cláudio da Silva',
                funcao: 'Operador de Munck',
                setor: 'Frentes de Serviço',
                status: 'ATIVO',
                dt_admissao: '2023-05-10',
                dt_demissao: null
            },
            {
                id: '3099',
                nome: 'Colaborador Inativo Teste',
                funcao: 'Auxiliar',
                setor: 'Campo',
                status: 'INATIVO',
                dt_admissao: '2020-01-01',
                dt_demissao: null
            },
            {
                id: '4001',
                nome: 'Colaborador Demitido Teste',
                funcao: 'Auxiliar',
                setor: 'Campo',
                status: 'ATIVO',
                dt_admissao: '2020-01-01',
                dt_demissao: '2025-01-10'
            },
            {
                id: '5002',
                nome: 'Sem Função Cadastrada',
                funcao: '',
                setor: '',
                status: 'ATIVO',
                dt_admissao: '2024-01-01',
                dt_demissao: null
            }
        ];
    };
    await harness.carregarBaseColaboradoresDoEfetivo();
    assert.strictEqual(consultasBase, 1, 'Base do Efetivo deve ser consultada apenas uma vez por sessão');
    assert.strictEqual(harness.state.baseColaboradoresStatus, 'PRONTA');
    assert.strictEqual(harness.state.baseColaboradores.length, 3, 'Somente colaboradores ativos entram na sugestão');
    assert.deepStrictEqual(
        harness.state.baseColaboradores.map(c => c.nome),
        ['João Éverton de Souza', 'José Cláudio da Silva', 'Sem Função Cadastrada'],
        'Sugestões devem vir ordenadas por nome (pt-BR)'
    );
    await harness.carregarBaseColaboradoresDoEfetivo();
    assert.strictEqual(consultasBase, 1, 'Base já carregada não deve ser reconsultada a cada abertura');
    harness.state.buscaBaseColaborador = 'joao everton';
    const sugestoesSemAcento = harness.obterSugestoesBaseColaborador(harness.state.buscaBaseColaborador);
    assert.strictEqual(sugestoesSemAcento.length, 1, 'Busca sem acento deve localizar nome acentuado');
    assert.strictEqual(sugestoesSemAcento[0].id, '1042');
    const sugestoesPorMatricula = harness.obterSugestoesBaseColaborador('2087');
    assert.strictEqual(sugestoesPorMatricula[0]?.id, '2087', 'Busca pela matrícula deve funcionar');
    const sugestoesPorFuncao = harness.obterSugestoesBaseColaborador('munck');
    assert.strictEqual(sugestoesPorFuncao[0]?.id, '2087', 'Busca pela função deve funcionar');
    // Seleção da base preenche nome/função/setor no cadastro sem gravar nada
    harness.abrirModalCadastroCondutor(null);
    assert.strictEqual(harness.state.modalDados.nome, '', 'Cadastro novo começa vazio');
    harness.state.sugestoesBaseAtuais = [harness.state.baseColaboradores[1]];
    harness.selecionarColaboradorDaBase(0);
    assert.strictEqual(harness.state.modalDados.nome, 'José Cláudio da Silva');
    assert.strictEqual(harness.state.modalDados.funcao, 'Operador de Munck');
    assert.strictEqual(harness.state.modalDados.setor_frente, 'Frentes de Serviço');
    assert.strictEqual(harness.state.modalDados.empresa, 'COP');
    assert.strictEqual(harness.state.buscaBaseColaborador, '', 'Busca é limpa após a seleção');
    assert.strictEqual(dbSimulado.tabelasEscritas.filter(e => e.url.includes('colaboradores_')).length, 0, 'Selecionar na base NÃO pode gravar no Efetivo');
    // Aviso de duplicidade ao escolher alguém que já existe na Gestão de Condutores
    const idDuplicado = harness.state.condutores[0].id;
    harness.state.condutores[0].nome = 'José Cláudio da Silva';
    harness.state.sugestoesBaseAtuais = [harness.state.baseColaboradores[1]];
    harness.selecionarColaboradorDaBase(0);
    assert.ok(harness.state.avisoBaseColaborador.includes('Já existe um condutor'), 'Deve avisar quando o nome já existe no módulo');
    assert.ok(harness.state.avisoBaseColaborador.includes(idDuplicado) === false);
    // Base indisponível não bloqueia o cadastro manual
    harness.state.baseColaboradoresStatus = 'NAO_CARREGADA';
    harness.state.baseColaboradores = [];
    sandbox.supabaseFetch = async () => { throw new Error('sem rede simulada'); };
    await harness.carregarBaseColaboradoresDoEfetivo();
    assert.strictEqual(harness.state.baseColaboradoresStatus, 'INDISPONIVEL');
    assert.ok(harness.state.baseColaboradoresErro.includes('sem rede simulada'));
    harness.abrirModalCadastroCondutor(null);
    const htmlBaseIndisponivel = elements['page-gestao_de_condutores'].innerHTML;
    assert.ok(htmlBaseIndisponivel.includes('id="condFormBuscaBase"'), 'Campo de busca deve continuar presente');
    assert.ok(htmlBaseIndisponivel.includes('id="condBaseColaboradorStatus"'), 'Status da base deve ser exibido');
    assert.ok(htmlBaseIndisponivel.includes('id="condFormNome"'), 'Nome continua digitável manualmente quando a base falha');
    assert.ok(harness.textoStatusBaseColaborador().includes('indisponível'));
    harness.fecharModalAtivo();
    delete sandbox.supabaseFetch;
    console.log('✅ Teste 17: Busca na base do Efetivo (leitura), autopreenchimento, tolerância a acentos, aviso de duplicidade e degradação sem bloqueio aprovados');

    console.log('\n🎉 TODOS OS 17 BLOCOS DE TESTES COMPORTAMENTAIS, DE REGRESSÃO E ESTÁTICOS PASSARAM COM SUCESSO!');
})().catch(err => {
    console.error('❌ Falha na suíte de testes:', err);
    process.exit(1);
});
