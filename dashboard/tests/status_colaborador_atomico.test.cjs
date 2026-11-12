const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), espree = require('espree');
const arquivos = ['dashboard/dashboard.js', 'dashboard/modules/epi_estoque.js'];
const fontes = new Map(arquivos.map(arquivo => {
    const src = fs.readFileSync(arquivo, 'utf8');
    return [arquivo, { src, ast: espree.parse(src, { ecmaVersion: 2021, range: true }) }];
}));
function func(arquivo, nome) {
    const { src, ast } = fontes.get(arquivo);
    const no = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === nome);
    assert.ok(no, nome); return src.slice(...no.range);
}
function ambiente(arquivo = arquivos[1]) {
    const logs = { chamadas: [], alertas: [], caches: [], auditoria: [], resposta: { id: '100', ativo: false, efetivo_presente: true, efetivo_status: 'INATIVO' }, http: 200 };
    const c = vm.createContext({
        allColaboradoresInternos: [{ id: '100', nome: 'Pessoa Fictícia', ativo: true }],
        allEfetivo: [{ id: '100', status: 'ATIVO' }, { id: '200', status: 'ATIVO' }],
        matricula: '200', _headcountMemoMap: new Map([['antigo', 2]]),
        SUPABASE_URL: 'https://fixture.invalid', SUPABASE_KEY: 'fake',
        authTokenDashboard: async () => 'fake', confirm: () => true,
        fetch: async (url, op) => {
            logs.chamadas.push({ url, metodo: op.method, body: JSON.parse(op.body) });
            assert.match(url, /\/rpc\/alterar_status_colaborador_atomico$/);
            assert.equal(op.method, 'POST');
            return { ok: logs.http === 200, status: logs.http, json: async () => logs.resposta };
        },
        supabaseUpsert: async () => { throw Error('Fallback não permitido'); },
        invalidarCacheTabela: t => logs.caches.push(t),
        registrarAuditLogDashboard: async (...args) => logs.auditoria.push(args),
        renderEfetivoPanel() {}, renderEfetivoResumo() {}, carregarColaboradoresInternos: async () => {},
        alert: msg => logs.alertas.push(msg), console: { error() {} }
    });
    c.window = c;
    vm.runInContext(func(arquivos[1], 'alterarStatusColaboradorAtomico') + '\n' + func(arquivo, 'alternarAtivoColaborador'), c);
    return { c, logs };
}
test('núcleo e módulo: uma única RPC, mesmo id, sem PATCH/upsert separado', async () => {
    for (const arquivo of arquivos) for (const atual of [true, false]) {
        const { c, logs } = ambiente(arquivo);
        logs.resposta.ativo = !atual; logs.resposta.efetivo_status = atual ? 'INATIVO' : 'ATIVO';
        await c.alternarAtivoColaborador('100', atual);
        assert.equal(logs.chamadas.length, 1);
        assert.deepEqual(logs.chamadas[0].body, { p_id: '100', p_ativo_esperado: atual, p_ativo_novo: !atual });
        assert.equal(c.allEfetivo[0].status, logs.resposta.efetivo_status);
        assert.equal(c.allEfetivo[1].status, 'ATIVO');
        assert.equal(c.allColaboradoresInternos[0].ativo, !atual);
        assert.equal(c._headcountMemoMap.size, 0);
        assert.deepEqual(logs.caches, ['colaboradores_checklist', 'colaboradores_efetivo']);
        assert.equal(logs.alertas.length, 0);
    }
});
test('cancelar não chama RPC; Efetivo ausente não é criado', async () => {
    const { c, logs } = ambiente(); c.confirm = () => false;
    await c.alternarAtivoColaborador('100', true); assert.equal(logs.chamadas.length, 0);
    c.confirm = () => true; c.allEfetivo = [];
    logs.resposta.efetivo_presente = false; logs.resposta.efetivo_status = null;
    await c.alternarAtivoColaborador('100', true);
    assert.equal(logs.chamadas.length, 1); assert.equal(c.allEfetivo.length, 0);
});
test('cache do Efetivo vazio não impede chamada transacional ao servidor', async () => {
    const { c, logs } = ambiente(); c.allEfetivo = [];
    await c.alternarAtivoColaborador('100', true);
    assert.equal(logs.chamadas.length, 1); assert.equal(c.allEfetivo.length, 0);
    assert.equal(logs.alertas.length, 0);
});
test('status DEMITIDO vem do servidor e não altera data de demissão local', async () => {
    const { c, logs } = ambiente(); c.allEfetivo[0].dt_demissao = '2026-11-01';
    logs.resposta.efetivo_status = 'DEMITIDO';
    await c.alternarAtivoColaborador('100', true);
    assert.equal(c.allEfetivo[0].status, 'DEMITIDO');
    assert.equal(c.allEfetivo[0].dt_demissao, '2026-11-01');
});
test('conflito, permissão e RPC ausente não acionam fallback nem alteram cache', async () => {
    for (const http of [403, 409, 404]) {
        const { c, logs } = ambiente(); logs.http = http;
        logs.resposta = { code: http === 409 ? '40001' : http === 404 ? 'PGRST202' : '42501' };
        await c.alternarAtivoColaborador('100', true);
        assert.equal(logs.chamadas.length, 1); assert.equal(c.allEfetivo[0].status, 'ATIVO');
        assert.equal(c.allColaboradoresInternos[0].ativo, true);
        assert.equal(logs.caches.length, 0); assert.equal(logs.auditoria.length, 0);
        assert.equal(logs.alertas.length, 1);
    }
});
test('resposta de outro id, tipo inválido ou status incompatível não contamina cache', async () => {
    for (const patch of [{ id: '200' }, { ativo: 'false' }, { efetivo_status: 'INVALIDO' }, { efetivo_presente: false }]) {
        const { c, logs } = ambiente(); Object.assign(logs.resposta, patch);
        await c.alternarAtivoColaborador('100', true);
        assert.equal(c.allEfetivo[0].status, 'ATIVO'); assert.equal(c.allColaboradoresInternos[0].ativo, true);
        assert.equal(logs.caches.length, 0); assert.match(logs.alertas[0], /não confirmada/);
    }
});
test('falha de rede tem resultado incerto, sem nova tentativa automática', async () => {
    const { c, logs } = ambiente(); let chamadas = 0;
    c.fetch = async () => { chamadas++; throw Error('Conexão interrompida'); };
    await c.alternarAtivoColaborador('100', true);
    assert.equal(chamadas, 1); assert.equal(logs.caches.length, 0);
    assert.match(logs.alertas[0], /Não foi possível confirmar/);
});
test('falha de atualização da tela distingue confirmação no servidor', async () => {
    const { c, logs } = ambiente(); c.carregarColaboradoresInternos = async () => { throw Error('UI indisponível'); };
    await c.alternarAtivoColaborador('100', true);
    assert.equal(logs.chamadas.length, 1); assert.match(logs.alertas[0], /confirmada no servidor/);
});
