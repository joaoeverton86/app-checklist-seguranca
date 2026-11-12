const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const espree = require('espree');
const cache = new Map();
function func(arquivo, nome) {
    if (!cache.has(arquivo)) {
        const texto = fs.readFileSync(arquivo, 'utf8');
        cache.set(arquivo, { texto, ast: espree.parse(texto, { ecmaVersion: 2021, range: true }) });
    }
    const { texto, ast } = cache.get(arquivo);
    const no = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === nome);
    assert.ok(no, `${nome} precisa existir em ${arquivo}`);
    return texto.slice(...no.range);
}
const core = 'dashboard/dashboard.js';
const epi = 'dashboard/modules/epi_estoque.js';
const efetivo = 'dashboard/modules/efetivo_ferias.js';
const ghe = 'dashboard/modules/ghe_os.js';






test('terceiros: lista e exportação usam utilitário real, com datas ISO/legadas e ausentes', () => {
    for (const data of ['2026-11-01', '2026-11-01T23:00:00Z', '1/11/2026', null]) {
        const celulas = {};
        let rows;
        const ctx = vm.createContext({
            document: { getElementById: id => celulas[id] ||= {} },
            obterTerceirosLista: () => [{ id: '300', nome: 'Pessoa Fictícia', status: 'ATIVO', dt_admissao: data, dt_demissao: data }],
            obterDadosVinculoTerceiro: () => ({ modalidade: 'PJ', empresa: 'Empresa Fictícia' }), escapeHTML: String,
            XLSX: { utils: { json_to_sheet: r => { rows = r; }, book_new: () => ({}), book_append_sheet() {} }, writeFile() {} }
        });
        vm.runInContext(func(core, 'formatSimpleDate') + func(efetivo, 'renderTabelaTerceiros') + func(efetivo, 'exportarExcelTerceiros'), ctx);
        ctx.renderTabelaTerceiros();
        ctx.exportarExcelTerceiros();
        const esperado = data ? '01/11/2026' : '';
        assert.equal(rows[0]['Data de Início / Mobilização'], esperado);
        assert.equal(rows[0]['Data de Saída / Desmobilização'], esperado);
        if (data) assert.ok(celulas.tabelaTerceirosBody.innerHTML.includes(esperado));
    }
});
test('PGR: navega ao Psicossocial global; cancelamento mantém draft; confirmação descarta antes de navegar', () => {
    for (const modo of ['limpo', 'cancelar', 'confirmar']) {
        const eventos = {}, log = [];
        const ctx = vm.createContext({
            isPgrDocBaseDirty: () => modo !== 'limpo',
            confirm: () => modo === 'confirmar',
            restaurarDraftPgrDocBaseParaUltimoSalvo: () => log.push('descartar'),
            showDbPage: pagina => log.push(pagina), showPsicossocialSubtab: aba => log.push(aba)
        });
        vm.runInContext(func(ghe, 'vincularEventosDelegadosPgrDocBase'), ctx);
        ctx.vincularEventosDelegadosPgrDocBase({ addEventListener: (tipo, cb) => { eventos[tipo] = cb; } });
        const btn = { getAttribute: n => n === 'data-pgr-docbase-action' ? 'abrir-psico-ghe' : 'ghe-ficticio' };
        eventos.click({ target: { closest: () => btn } });
        assert.deepEqual(log, modo === 'cancelar' ? [] : modo === 'confirmar' ? ['descartar', 'psicossocial', 'visao'] : ['psicossocial', 'visao']);
    }
    assert.match(fs.readFileSync(ghe, 'utf8'), /data-pgr-docbase-action="abrir-psico-ghe"[^>]*>🧠 Psicossocial global/);
});
test('SMS: autoria vem de getUser; erro/ausência não atribui identidade de armazenamento local', async () => {
    const sms = 'dashboard/modules/relatorio_sms_nc.js';
    const ctx = vm.createContext({
        console: { warn() {} },
        localStorage: { getItem: () => JSON.stringify({ email: 'nao-verificado@example.invalid' }) }
    });
    vm.runInContext(func(sms, 'relSmsIdentificarAutorAtual'), ctx);
    assert.equal(await ctx.relSmsIdentificarAutorAtual(), 'Autoria não verificada');
    ctx.sbAuth = { auth: { getUser: async () => ({ data: { user: { id: 'uid-fixture', email: 'verificado@example.invalid' } }, error: null }) } };
    assert.equal(await ctx.relSmsIdentificarAutorAtual(), 'verificado@example.invalid');
    ctx.sbAuth.auth.getUser = async () => ({ data: { user: { id: 'uid-fixture' } }, error: null });
    assert.equal(await ctx.relSmsIdentificarAutorAtual(), 'uid-fixture');
    ctx.sbAuth.auth.getUser = async () => ({ data: { user: { id: 'uid-antigo' } }, error: new Error('sessão inválida') });
    assert.equal(await ctx.relSmsIdentificarAutorAtual(), 'Autoria não verificada');
    ctx.sbAuth.auth.getUser = async () => { throw new Error('falha de rede simulada'); };
    assert.equal(await ctx.relSmsIdentificarAutorAtual(), 'Autoria não verificada');
    assert.equal((fs.readFileSync(sms, 'utf8').match(/await relSmsIdentificarAutorAtual\(\)/g) || []).length, 3);
});
test('compatibilidade: SHA-256 com host Node; fallback sem require; buffers sem Node', async () => {
    const ctx = vm.createContext({ require, structuredClone });
    vm.runInContext(func('dashboard/modules/relatorio_sms_nc.js', 'relSmsCalcularHash'), ctx);
    assert.equal((await ctx.relSmsCalcularHash('fixture')).tipo, 'sha256');
    delete ctx.require;
    assert.equal((await ctx.relSmsCalcularHash('fixture')).tipo, 'fnv1a_64_fallback');
    vm.runInContext(func('dashboard/modules/relatorio_sms_fotos.js', 'relSmsFotosGarantirBuffers'), ctx);
    await vm.runInContext('relSmsFotosGarantirBuffers({grupos:[{fotos:[{img:{buffer:new Uint8Array([1])}}]}]})', ctx);
});
test('GHE: atalho inline também abre visão global existente, sem handler ausente', () => {
    const texto = fs.readFileSync(ghe, 'utf8');
    assert.ok(!texto.includes('abrirGestaoPsicossocialPorGhe('));
    const botao = texto.match(/<button class="db-apply-btn"[^>]*>🛡️ Abrir Psicossocial global<\/button>/)?.[0];
    assert.ok(botao);
    const destinos = [];
    vm.runInNewContext(botao.match(/onclick="([^"]+)"/)[1], {
        showDbPage: x => destinos.push(x), showPsicossocialSubtab: x => destinos.push(x)
    });
    assert.deepEqual(destinos, ['psicossocial', 'visao']);
});
test('Kits: presença confirmada renova status, invalida prontidão e não repete gravação', async () => {
    const treinos = 'dashboard/modules/treinamentos_ddsma.js';
    const modos = ['sucesso', 'leitura_falha', 'formato_invalido', 'gravacao_falha', 'cancelar'];
    for (const [modo, implementacao] of modos.flatMap(m => [core, treinos].map(arquivo => [m, arquivo]))) {
        const msg = { style: {}, textContent: '' }, eventos = [];
        const statusNovos = [{ matricula: '100', treinamento_cod: 'CURSO', data_proxima_reciclagem: '2027-11-01' }];
        const ctx = vm.createContext({
            document: { getElementById: () => msg },
            contextoKits: () => ({ colaboradores: [{ matricula: '100', nome: 'Pessoa Fictícia' }], codigo: 'CURSO', data: '2026-11-01', campos: {} }),
            allEfetivo: [{ id: '100', status: 'ATIVO' }], allTreinamentosCatalogo: [{ id: 'CURSO', nome: 'Curso Fictício', meses_validade: null }],
            allTreinamentosRealizados: [], allTreinamentosStatus: [{ antigo: true }], prontidaoDadosCalculadosCache: [{ antigo: true }],
            obterTituloECargaSessao: () => ({ titulo: 'Curso Fictício', cargaHoraria: 4 }),
            formatSimpleDate: x => x, confirm: () => modo !== 'cancelar',
            supabaseUpsert: async () => { eventos.push('salvar'); if (modo === 'gravacao_falha') throw Error('falha simulada'); },
            supabaseFetch: async (tabela) => {
                assert.equal(tabela, 'treinamentos_status'); eventos.push('consultar');
                if (modo === 'leitura_falha') throw Error('leitura indisponível');
                return modo === 'formato_invalido' ? {} : statusNovos;
            },
            invalidarCacheTabela: tabela => eventos.push('invalidar:' + tabela),
            renderKitsEquipeList() {}, renderKitsDocsIndividuaisList() {}, console: { error() {}, warn() {} }
        });
        ctx.window = ctx;
        vm.runInContext(func(treinos, 'atualizarStatusTreinamentosAposPresenca') + func(implementacao, 'salvarPresencaTurmaDiretoKits'), ctx);
        await ctx.salvarPresencaTurmaDiretoKits();
        assert.equal(eventos.filter(x => x === 'salvar').length, modo === 'cancelar' ? 0 : 1);
        if (['sucesso', 'leitura_falha', 'formato_invalido'].includes(modo)) {
            assert.equal(ctx.prontidaoDadosCalculadosCache, null);
            assert.equal(ctx.allTreinamentosRealizados.length, 1);
            assert.ok(eventos.includes('invalidar:treinamentos_status'));
            assert.ok(eventos.includes('invalidar:treinamentos_realizados'));
        }
        if (modo === 'sucesso') {
            assert.equal(ctx.allTreinamentosStatus, statusNovos);
            assert.match(msg.textContent, /sucesso/);
        } else if (modo === 'leitura_falha' || modo === 'formato_invalido') {
            assert.match(msg.textContent, /Presença salva.*indicadores.*não.*atualiz/i);
            assert.equal(ctx.allTreinamentosStatus[0].antigo, true);
        } else {
            assert.equal(ctx.allTreinamentosRealizados.length, 0);
            assert.equal(eventos.includes('consultar'), false);
        }
    }
});
