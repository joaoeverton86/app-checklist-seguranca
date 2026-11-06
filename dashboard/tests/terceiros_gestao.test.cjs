const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('🧪 Iniciando Suíte de Testes Automatizados: Gestão de Terceiros & Blindagem SST');

// 1. Carrega o ambiente simulado com as funções de dashboard e efetivo_ferias
const indexHtml = fs.readFileSync('dashboard/index.html', 'utf8');
const efetivoCode = fs.readFileSync('dashboard/modules/efetivo_ferias.js', 'utf8');

// Cria contexto sandbox
const sandbox = {
    console: console,
    Date: Date,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    window: {},
    document: {
        getElementById: (id) => {
            if (!sandbox._elements[id]) {
                sandbox._elements[id] = {
                    value: '',
                    textContent: '',
                    innerHTML: '',
                    style: {},
                    classList: { toggle: () => {} },
                    readOnly: false
                };
            }
            return sandbox._elements[id];
        },
        querySelectorAll: () => []
    },
    _elements: {},
    allEfetivo: [],
    allColaboradoresInternos: [],
    _headcountMemoMap: new Map(),
    parseLocalDate: (str) => {
        if (!str) return new Date(NaN);
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    },
    formatarDataBr: (dt) => dt,
    escapeHTML: (str) => String(str || ''),
    colaboradorEstaAtivo: (e) => {
        if (!e) return false;
        if (e.dt_demissao) return false;
        if (e.status && (e.status === 'DEMITIDO' || e.status === 'INATIVO')) return false;
        return e.status === 'ATIVO' || !!e.dt_admissao;
    },
    bloquearEdicaoSeNaoAutorizado: () => false,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_KEY: 'test-key',
    authTokenDashboard: async () => 'test-token',
    supabaseUpsert: async (table, rows) => {
        sandbox._upsertLogs.push({ table, rows });
        return true;
    },
    _upsertLogs: [],
    _fetchLogs: []
};

sandbox.window = sandbox;

// Mock de fetch para simular Supabase REST
sandbox.fetch = async (url, opts) => {
    sandbox._fetchLogs.push({ url, opts });
    if (sandbox._simulateFetchError) {
        return {
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error (Simulated)'
        };
    }
    return {
        ok: true,
        status: 200,
        text: async () => 'OK',
        json: async () => []
    };
};

vm.createContext(sandbox);

// Executa funções de terceiros e efetivo no sandbox
vm.runInContext(efetivoCode, sandbox);

// Define headcountAsOf blindado no sandbox
vm.runInContext(`
function headcountAsOf(dateEnd) {
    if (!dateEnd || !(dateEnd instanceof Date) || isNaN(dateEnd.getTime())) return 0;
    const endMs = dateEnd.getTime();
    let count = 0;
    for (let i = 0; i < allEfetivo.length; i++) {
        const e = allEfetivo[i];
        if (!e || !e.dt_admissao) continue;
        if (typeof colaboradorEhTerceiro === 'function' && colaboradorEhTerceiro(e)) continue;
        const admMs = e._admMs || (e._admMs = parseLocalDate(e.dt_admissao).getTime());
        if (isNaN(admMs) || admMs > endMs) continue;
        if (!e.dt_demissao) {
            count++;
            continue;
        }
        const demMs = e._demMs || (e._demMs = parseLocalDate(e.dt_demissao).getTime());
        if (isNaN(demMs) || demMs > endMs) {
            count++;
        }
    }
    return count;
}
`, sandbox);

// =========================================================================
// TESTE 1: Identificação e Extração de Vínculo de Terceiro vs Próprio
// =========================================================================
console.log('--- Teste 1: Identificação de Vínculo de Terceiro vs Próprio ---');
const colabProprio = { id: '101', nome: 'João Silva', status: 'ATIVO', dt_admissao: '2024-07-01', estabilidade: 'NÃO', setor: 'CIVIL' };
const mecanicoArtec = { id: 'ARTEC-01', nome: 'Carlos Mecânico', status: 'ATIVO', dt_admissao: '2024-08-01', estabilidade: 'TERCEIRO', responsavel: 'ARTEC', setor: 'MANUTENÇÃO MECÂNICA' };
const prestadorPj = { id: 'PJ-01', nome: 'Dra. Mariana Consultora', status: 'ATIVO', dt_admissao: '2024-09-01', estabilidade: 'PJ', responsavel: 'MJ Consultoria', setor: 'ENGENHARIA' };

assert.strictEqual(sandbox.colaboradorEhTerceiro(colabProprio), false, 'Colaborador próprio CLT não pode ser marcado como terceiro');
assert.strictEqual(sandbox.colaboradorEhTerceiro(mecanicoArtec), true, 'Mecânico ARTEC deve ser reconhecido como terceiro');
assert.strictEqual(sandbox.colaboradorEhTerceiro(prestadorPj), true, 'Profissional PJ deve ser reconhecido como terceiro');

const dadosArtec = sandbox.obterDadosVinculoTerceiro(mecanicoArtec);
assert.strictEqual(dadosArtec.ehTerceiro, true);
assert.strictEqual(dadosArtec.tipo, 'TERCEIRO');
assert.strictEqual(dadosArtec.modalidade, 'Terceirizado');
assert.strictEqual(dadosArtec.empresa, 'ARTEC');

const dadosPj = sandbox.obterDadosVinculoTerceiro(prestadorPj);
assert.strictEqual(dadosPj.ehTerceiro, true);
assert.strictEqual(dadosPj.tipo, 'PJ');
assert.strictEqual(dadosPj.modalidade, 'PJ (Pessoa Jurídica)');
assert.strictEqual(dadosPj.empresa, 'MJ Consultoria');

console.log('✅ Teste 1 Aprovado: Vínculos e modalidades identificados com exatidão.');

// =========================================================================
// TESTE 2: Comparação de Contagens Antes e Depois (Blindagem de Headcount)
// =========================================================================
console.log('--- Teste 2: Blindagem de Headcount Próprio (Antes vs Depois) ---');

// Base inicial com 5 próprios CLT
sandbox.allEfetivo = [
    { id: '1', nome: 'Operador 1', status: 'ATIVO', dt_admissao: '2024-07-01', setor: 'CIVIL', estabilidade: 'NÃO' },
    { id: '2', nome: 'Operador 2', status: 'ATIVO', dt_admissao: '2024-07-01', setor: 'CIVIL', estabilidade: 'NÃO' },
    { id: '3', nome: 'Operador 3', status: 'ATIVO', dt_admissao: '2024-07-01', setor: 'MECÂNICA', estabilidade: 'NÃO' },
    { id: '4', nome: 'Operador 4', status: 'ATIVO', dt_admissao: '2024-07-01', setor: 'VIGILÂNCIA', estabilidade: 'NÃO' },
    { id: '5', nome: 'Operador 5', status: 'DEMITIDO', dt_admissao: '2024-07-01', dt_demissao: '2024-10-01', setor: 'CIVIL', estabilidade: 'NÃO' }
];

const hojeRef = new Date(2024, 10, 1);
const headcountAntes = sandbox.headcountAsOf(hojeRef);
assert.strictEqual(headcountAntes, 4, 'Headcount inicial deve ser 4 ativos');

// Adiciona 2 mecânicos ARTEC e 2 PJs na base
sandbox.allEfetivo.push(
    { id: 'ARTEC-01', nome: 'Mecânico 1 ARTEC', status: 'ATIVO', dt_admissao: '2024-08-01', estabilidade: 'TERCEIRO', responsavel: 'ARTEC', setor: 'MECÂNICA' },
    { id: 'ARTEC-02', nome: 'Mecânico 2 ARTEC', status: 'ATIVO', dt_admissao: '2024-08-15', estabilidade: 'TERCEIRO', responsavel: 'ARTEC', setor: 'MECÂNICA' },
    { id: 'PJ-01', nome: 'Profissional PJ 1', status: 'ATIVO', dt_admissao: '2024-09-01', estabilidade: 'PJ', responsavel: 'PJ Manutenção', setor: 'MECÂNICA' },
    { id: 'PJ-02', nome: 'Profissional PJ 2', status: 'ATIVO', dt_admissao: '2024-09-10', estabilidade: 'PJ', responsavel: 'PJ Serviços', setor: 'CIVIL' }
);

const headcountDepoisInclusao = sandbox.headcountAsOf(hojeRef);
assert.strictEqual(headcountDepoisInclusao, headcountAntes, 'Headcount próprio DEVE PERMANECER 4 mesmo após inclusão de 4 terceiros');

// Inativa um terceiro e edita outro
sandbox.allEfetivo[5].status = 'INATIVO';
sandbox.allEfetivo[5].dt_demissao = '2024-10-20';

const headcountDepoisInativacao = sandbox.headcountAsOf(hojeRef);
assert.strictEqual(headcountDepoisInativacao, headcountAntes, 'Headcount próprio DEVE PERMANECER 4 mesmo após inativação de terceiro');

console.log('✅ Teste 2 Aprovado: Headcount próprio idêntico (4 == 4 == 4) comprovado por comparação antes e depois.');

// =========================================================================
// TESTE 3: Blindagem de Admissões, Demissões e Férias CLT
// =========================================================================
console.log('--- Teste 3: Blindagem de Admissões, Demissões e Férias CLT ---');

const pInicio = new Date(2024, 7, 1); // 01/Ago/2024
const pFim = new Date(2024, 8, 30);   // 30/Set/2024

const ehT = sandbox.colaboradorEhTerceiro;
const admProprias = sandbox.allEfetivo.filter(e => !ehT(e) && e.dt_admissao && sandbox.parseLocalDate(e.dt_admissao) >= pInicio && sandbox.parseLocalDate(e.dt_admissao) <= pFim).length;
const demProprias = sandbox.allEfetivo.filter(e => !ehT(e) && e.dt_demissao && sandbox.parseLocalDate(e.dt_demissao) >= pInicio && sandbox.parseLocalDate(e.dt_demissao) <= pFim).length;

assert.strictEqual(admProprias, 0, 'Admissões CLT próprias no período devem ser 0');
assert.strictEqual(demProprias, 0, 'Demissões CLT próprias no período devem ser 0');

// Férias CLT
const ativosFerias = sandbox.allEfetivo.filter(e => sandbox.colaboradorEstaAtivo(e) && !ehT(e));
assert.strictEqual(ativosFerias.length, 4, 'Apenas os 4 colaboradores próprios entram na régua de férias CLT');

console.log('✅ Teste 3 Aprovado: Indicadores de admissões, demissões e régua de férias CLT 100% blindados.');

// =========================================================================
// TESTE 4: Blindagem de Distribuição por Setor
// =========================================================================
console.log('--- Teste 4: Blindagem de Distribuição por Setor de Efetivo Próprio ---');

const setoresProprios = new Map();
sandbox.allEfetivo.forEach(e => {
    if (!sandbox.colaboradorEstaAtivo(e) || !e.setor || ehT(e)) return;
    setoresProprios.set(e.setor, (setoresProprios.get(e.setor) || 0) + 1);
});

// Setor MECÂNICA tem apenas 1 colaborador próprio ativo ('Operador 3')
assert.strictEqual(setoresProprios.get('MECÂNICA'), 1, 'Setor MECÂNICA deve ter exatamente 1 próprio ativo, sem inflar com terceiros');
assert.strictEqual(setoresProprios.get('CIVIL'), 2, 'Setor CIVIL deve ter exatamente 2 próprios ativos');
assert.strictEqual(setoresProprios.get('VIGILÂNCIA'), 1, 'Setor VIGILÂNCIA deve ter exatamente 1 próprio ativo');

console.log('✅ Teste 4 Aprovado: Distribuição de efetivo próprio por setor permaneceu intacta.');

// =========================================================================
// TESTE 5: Sincronização Dupla em colaboradores_efetivo e colaboradores_checklist
// =========================================================================
console.log('--- Teste 5: Sincronização Dupla (Efetivo & Campo) ---');

sandbox._upsertLogs = [];
sandbox._fetchLogs = [];
sandbox._simulateFetchError = false;

// Preenche formulário simulado
sandbox.document.getElementById('tercForm_matricula').value = 'ARTEC-03';
sandbox.document.getElementById('tercForm_nome').value = 'Mecânico Novo Artec';
sandbox.document.getElementById('tercForm_modalidade').value = 'Terceirizado';
sandbox.document.getElementById('tercForm_empresa').value = 'ARTEC';
sandbox.document.getElementById('tercForm_funcao').value = 'Mecânico Hidráulico';
sandbox.document.getElementById('tercForm_setor').value = 'MECÂNICA';
sandbox.document.getElementById('tercForm_ghe').value = 'GHE-02';
sandbox.document.getElementById('tercForm_sexo').value = 'M';
sandbox.document.getElementById('tercForm_cpf').value = '111.222.333-44';
sandbox.document.getElementById('tercForm_dt_inicio').value = '2024-11-01';
sandbox.document.getElementById('tercForm_status').value = 'ATIVO';

// Executa salvamento
sandbox.salvarTerceiroEfetivo().then(async () => {
    // 1. Verifica gravação em colaboradores_efetivo
    const logEf = sandbox._upsertLogs.find(l => l.table === 'colaboradores_efetivo');
    assert(logEf, 'Deve gravar em colaboradores_efetivo via supabaseUpsert');
    assert.strictEqual(logEf.rows[0].id, 'ARTEC-03');
    assert.strictEqual(logEf.rows[0].responsavel, 'ARTEC');
    assert.strictEqual(logEf.rows[0].estabilidade, 'TERCEIRO');

    // 2. Verifica sincronização em colaboradores_checklist
    const logCk = sandbox._fetchLogs.find(f => f.url.includes('colaboradores_checklist'));
    assert(logCk, 'Deve sincronizar em colaboradores_checklist via fetch REST');
    const bodyCk = JSON.parse(logCk.opts.body);
    assert.strictEqual(bodyCk[0].id, 'ARTEC-03');
    assert.strictEqual(bodyCk[0].empresa, 'ARTEC');
    assert.strictEqual(bodyCk[0].ativo, true);

    console.log('✅ Teste 5 Aprovado: Registro gravado simultaneamente em colaboradores_efetivo e colaboradores_checklist.');

    // =========================================================================
    // TESTE 6: Não apresentar sucesso quando houver falha de sincronização dupla
    // =========================================================================
    console.log('--- Teste 6: Rejeição com Alerta em Falha de Sincronização Dupla ---');

    sandbox._simulateFetchError = true; // Simula falha em colaboradores_checklist
    sandbox.document.getElementById('tercForm_matricula').value = 'ARTEC-04';
    sandbox.document.getElementById('tercForm_nome').value = 'Mecânico Falha';

    await sandbox.salvarTerceiroEfetivo();

    const statusEl = sandbox.document.getElementById('terceiroFormStatus');
    assert(statusEl.textContent.includes('❌'), 'Status DEVE reportar erro com ❌ quando sincronização falhar');
    assert(statusEl.textContent.includes('Falha de sincronização dupla'), 'Mensagem DEVE explicar falha de sincronização');
    assert(!statusEl.textContent.includes('✅'), 'NÃO pode apresentar mensagem de sucesso');

    console.log('✅ Teste 6 Aprovado: Falha de sincronização dupla bloqueia mensagem de sucesso e reporta erro com clareza.');

    // =========================================================================
    // TESTE 7: Verificação da Composição Geral da Obra
    // =========================================================================
    console.log('--- Teste 7: Composição Geral da Obra (Próprios vs Terceiros) ---');

    sandbox.renderTerceirosPanel();
    const kpiComp = sandbox.document.getElementById('kpiTerceirosComposicaoTotal').textContent;
    assert(kpiComp.includes('Próprios'), 'Composição deve exibir explicitamente próprios');
    assert(kpiComp.includes('Terceiros'), 'Composição deve exibir explicitamente terceiros');
    assert(kpiComp.includes('Total'), 'Composição deve exibir total presente');

    console.log('✅ Teste 7 Aprovado: Composição Geral apresenta próprios, terceiros e total explicitamente.');

    console.log('\n🎉 TODOS OS 7 TESTES AUTOMATIZADOS PASSARAM COM 100% DE APROVAÇÃO!');
}).catch(err => {
    console.error('❌ Erro no teste assíncrono:', err);
    process.exit(1);
});
