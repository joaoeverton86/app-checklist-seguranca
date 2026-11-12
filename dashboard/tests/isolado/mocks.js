// Somente para a página de homologação local. Não é carregado pelo produto.
(() => {
    if (location.origin !== 'http://127.0.0.1:32408') throw Error('Mock permitido somente na origem local de homologação.');
    const usuario = { id: 'fixture-auth-user', email: 'pessoa@example.invalid' };
    const seed = {
        colaboradores_efetivo: [
            { id: 'FIX001', nome: 'Pessoa Própria Fictícia', funcao: 'Função de teste', setor: 'Setor fictício', ghe: 'GHE-FICTICIO', status: 'ATIVO', dt_admissao: '2026-11-01' },
            { id: 'FIX002', nome: 'Pessoa Terceira Fictícia', funcao: 'Função de teste', setor: 'Setor fictício', ghe: 'GHE-FICTICIO', status: 'ATIVO', dt_admissao: '2026-11-02', estabilidade: 'PJ', empresa: 'Empresa Fictícia' }
        ],
        colaboradores_checklist: [{ id: 'FIX001', matricula: 'FIX001', nome: 'Pessoa Própria Fictícia', nivel_acesso: 'Tecnico', ativo: true }],
        ghe_catalogo: [{ id: 'GHE-FICTICIO', nome: 'GHE Fictício — somente teste', setor: 'Setor fictício', riscos: [], cargos: [], conclusoes: {} }],
        treinamentos_catalogo: [{ id: 'CURSO-FICTICIO', nome: 'Curso Fictício — sem valor operacional', meses_validade: null, carga_horaria: 1 }]
    };
    const salvo = localStorage.getItem('__homologacao_banco');
    const banco = salvo ? JSON.parse(salvo) : seed;
    window.__homologacao = { banco, chamadas: [], erros: [], consoleErros: [], recusados: [], exportacoes: [] };
    const consoleOriginal = console.error;
    console.error = (...args) => {
        window.__homologacao.consoleErros.push(args.map(v => v?.message || String(v)).join(' '));
        consoleOriginal(...args);
    };
    localStorage.setItem('active_session', JSON.stringify({ matricula: 'TESTE', nome: 'Homologação local simulada', role: 'Admin', ver_todos: true, modulos_edicao: null, loginTime: Date.now() }));
    window.addEventListener('error', e => window.__homologacao.erros.push(e.message));
    window.addEventListener('unhandledrejection', e => window.__homologacao.erros.push(String(e.reason?.message || e.reason)));
    window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: { user: usuario, access_token: 'fixture-token' } }, error: null }),
        getUser: async () => ({ data: { user: usuario }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: async () => ({ error: null })
    } }) };
    window.Chart = class {
        constructor(ctx, config) { this.data = config?.data || {}; this.options = config?.options || {}; }
        destroy() {} update() {} resize() {} toBase64Image() { return ''; }
        static getChart() { return null; }
        static register() {}
    };
    window.Chart.defaults = { font: {}, plugins: { legend: {} } };
    window.XLSX = { utils: { json_to_sheet: rows => structuredClone(rows), book_new: () => ({}), book_append_sheet: (wb, rows) => { wb.rows = rows; } }, writeFile: wb => window.__homologacao.exportacoes.push(wb.rows) };
    window.Swal = { fire: async () => ({ isConfirmed: false }), showLoading() {}, close() {}, showValidationMessage() {}, DismissReason: { cancel: 'cancel' } };
    window.docx = {};
    window.fetch = async (entrada, opcoes = {}) => {
        const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.href);
        const metodo = opcoes.method || 'GET';
        if (url.hostname.endsWith('.supabase.co') && url.pathname === '/rest/v1/rpc/alterar_status_colaborador_atomico' && metodo === 'POST') {
            const p = JSON.parse(opcoes.body);
            const ck = banco.colaboradores_checklist.find(r => r.id === p.p_id);
            window.__homologacao.chamadas.push({ tabela: 'rpc/alterar_status_colaborador_atomico', metodo });
            if (!ck || (ck.ativo !== false) !== p.p_ativo_esperado) return new Response(JSON.stringify({ code: '40001' }), { status: 409 });
            const ef = banco.colaboradores_efetivo.find(r => r.id === p.p_id);
            const status = ef ? (p.p_ativo_novo ? 'ATIVO' : ef.dt_demissao ? 'DEMITIDO' : 'INATIVO') : null;
            ck.ativo = p.p_ativo_novo;
            if (ef) ef.status = status;
            localStorage.setItem('__homologacao_banco', JSON.stringify(banco));
            return new Response(JSON.stringify({ id: p.p_id, ativo: ck.ativo, efetivo_presente: !!ef, efetivo_status: status }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const tabela = url.pathname.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
        if (!tabela || !url.hostname.endsWith('.supabase.co')) {
            window.__homologacao.recusados.push({ caminho: url.pathname, metodo });
            throw Error('Endpoint não simulado na homologação local: ' + url.pathname);
        }
        window.__homologacao.chamadas.push({ tabela, metodo });
        banco[tabela] ||= [];
        const filtros = [...url.searchParams].filter(([, v]) => v.startsWith('eq.'));
        const corresponde = row => filtros.every(([k, v]) => String(row[k]) === v.slice(3));
        let retorno;
        if (metodo === 'GET') retorno = banco[tabela].filter(corresponde);
        else if (metodo === 'PATCH') {
            retorno = banco[tabela].filter(corresponde);
            const patch = JSON.parse(opcoes.body);
            retorno.forEach(row => Object.assign(row, patch));
        } else if (metodo === 'POST') {
            const payload = JSON.parse(opcoes.body);
            retorno = Array.isArray(payload) ? payload : [payload];
            retorno.forEach(row => {
                const i = row.id ? banco[tabela].findIndex(r => r.id === row.id) : -1;
                if (i >= 0) Object.assign(banco[tabela][i], row);
                else banco[tabela].push(structuredClone(row));
            });
        } else throw Error('Método não autorizado no mock: ' + metodo);
        localStorage.setItem('__homologacao_banco', JSON.stringify(banco));
        return new Response(JSON.stringify(retorno), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(0, retorno.length - 1)}/${retorno.length}` } });
    };
    navigator.sendBeacon = () => false;
    document.addEventListener('DOMContentLoaded', () => {
        const aviso = document.createElement('div');
        aviso.textContent = 'HOMOLOGAÇÃO LOCAL — dados e autenticação simulados';
        aviso.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:99999;background:#ffe49b;color:#392c00;padding:6px;border:1px solid #b08900;font:12px Arial';
        document.body.append(aviso);
    });
})();
