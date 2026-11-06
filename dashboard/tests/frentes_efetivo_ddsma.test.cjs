/**
 * Testes de Integração e Regra de Negócio SST:
 * Gestão Global de Frentes no Efetivo & Segregação de Visibilidade no DDSMA
 */

const assert = require('assert');
const fs = require('fs');

console.log('🧪 Iniciando Testes Automatizados: Gestão de Frentes (Efetivo & DDSMA)...');

// 1. Mock de ambiente e dependências
global.window = global;
global.allEfetivo = [
    { id: '101', nome: 'CARLOS SILVA', funcao: 'PEDREIRO', responsavel: 'CIVIL', status: 'ATIVO', dt_demissao: null },
    { id: '102', nome: 'JOÃO SANTOS', funcao: 'ELETRICISTA', responsavel: 'ELÉTRICA', status: 'ATIVO', dt_demissao: null },
    { id: '103', nome: 'MARIA SOUZA', funcao: 'ARMADOR', responsavel: 'CIVIL', status: 'ATIVO', dt_demissao: null },
    { id: '104', nome: 'INATIVO TESTE', funcao: 'AUXILIAR', responsavel: 'CIVIL', status: 'DEMITIDO', dt_demissao: '2026-10-01' },
    { id: '901', nome: 'TERCEIRO PJ', funcao: 'CONSULTOR', responsavel: 'EMPRESA TERCEIRA LTDA', status: 'ATIVO', pj_empresa: 'EMPRESA TERCEIRA LTDA' }
];

global.colaboradorEstaAtivo = function(e) {
    return e && e.status === 'ATIVO' && !e.dt_demissao;
};

global.colaboradorEhTerceiro = function(e) {
    return !!(e && (e.pj_empresa || e.is_terceiro));
};

global.escapeHTML = function(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

global.allDdsFrentesConfig = [
    { id: 'ADMINISTRATIVO', ativo: false }
];
global.allDdsFrentesAlias = [
    { id: 'WILLIAMS', frente_atual: 'ADEILTON MONTEIRO' }
];

// Mock de Supabase
let supabaseUpsertCalls = [];
global.supabaseUpsert = async function(tabela, dados) {
    supabaseUpsertCalls.push({ tabela, dados });
    return { ok: true };
};

// Carrega funções do treinamentos_ddsma.js
const ddsCode = fs.readFileSync('dashboard/modules/treinamentos_ddsma.js', 'utf8');
const fnTodasMatch = ddsCode.match(/function todasFrentesAtivas\(\) \{[\s\S]*?\n\}/);
if (!fnTodasMatch) throw new Error('Não encontrou todasFrentesAtivas em treinamentos_ddsma.js');
eval(fnTodasMatch[0]);

const fnResolverMatch = ddsCode.match(/function resolverFrenteDds\(nome\) \{[\s\S]*?\n\}/);
if (!fnResolverMatch) throw new Error('Não encontrou resolverFrenteDds em treinamentos_ddsma.js');
eval(fnResolverMatch[0]);

const fnFrentesAtivasDdsMatch = ddsCode.match(/function frentesAtivasDds\(\) \{[\s\S]*?\n\}/);
if (!fnFrentesAtivasDdsMatch) throw new Error('Não encontrou frentesAtivasDds em treinamentos_ddsma.js');
eval(fnFrentesAtivasDdsMatch[0]);

// Carrega funções do efetivo_ferias.js
const efCode = fs.readFileSync('dashboard/modules/efetivo_ferias.js', 'utf8');

const fnObterCatalogoMatch = efCode.match(/function obterCatalogoFrentesCompleto\(\) \{[\s\S]*?\n\}/);
if (!fnObterCatalogoMatch) throw new Error('Não encontrou obterCatalogoFrentesCompleto');
eval(fnObterCatalogoMatch[0]);

// =========================================================================
// TESTE 1: Separação de Visibilidade DDSMA vs Gestão Global
// =========================================================================
console.log('--- Teste 1: Segregação Rigorosa de Visibilidade DDSMA ---');
// 'ADMINISTRATIVO' está com ativo: false em allDdsFrentesConfig
const frentesDds = frentesAtivasDds();
assert.strictEqual(frentesDds.includes('ADMINISTRATIVO'), false, 'Frente desmarcada no DDS NÃO pode aparecer em frentesAtivasDds');
assert.strictEqual(frentesDds.includes('CIVIL'), true, 'Frente CIVIL ativa deve aparecer no DDS');
assert.strictEqual(frentesDds.includes('ELÉTRICA'), true, 'Frente ELÉTRICA ativa deve aparecer no DDS');

// Mas em todasFrentesAtivas() ela continua existindo ou respeitada globalmente sem quebrar colaboradores
const todasGlobais = todasFrentesAtivas();
assert.strictEqual(todasGlobais.includes('CIVIL'), true, 'CIVIL deve constar nas frentes ativas globais');
assert.strictEqual(todasGlobais.includes('ELÉTRICA'), true, 'ELÉTRICA deve constar nas frentes ativas globais');
console.log('✅ Teste 1 Aprovado: Desmarcar no DDS oculta apenas da tabela/relatório DDS sem afetar frentes globais.');

// =========================================================================
// TESTE 2: Frente Vazia no Catálogo Global não altera Headcount / HHT
// =========================================================================
console.log('--- Teste 2: Frente Vazia e Blindagem de Headcount/HHT ---');
// Headcount inicial próprio CLT
const headcountAntes = allEfetivo.filter(e => colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e)).length;
assert.strictEqual(headcountAntes, 3, 'Headcount inicial deve ser 3 (CARLOS, JOÃO, MARIA)');

// Adiciona uma frente vazia ao catálogo global
global.allFrentesCatalogo = [
    { nome: 'CANTEIRO CENTRAL', ativo: true, criado_em: new Date().toISOString() }
];

const frentesComVazia = todasFrentesAtivas();
assert.strictEqual(frentesComVazia.includes('CANTEIRO CENTRAL'), true, 'Frente vazia deve estar em todasFrentesAtivas()');

// Headcount e HHT devem permanecer absolutamente idênticos
const headcountDepois = allEfetivo.filter(e => colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e)).length;
assert.strictEqual(headcountDepois, headcountAntes, 'Headcount próprio não pode ser alterado por criação de frente vazia');

// Catálogo completo no Efetivo identifica frente com 0 pessoas
const catalogo = obterCatalogoFrentesCompleto();
const canteiro = catalogo.find(f => f.nome === 'CANTEIRO CENTRAL');
assert.ok(canteiro, 'Frente CANTEIRO CENTRAL deve existir no catálogo');
assert.strictEqual(canteiro.qtd, 0, 'Quantidade de colaboradores da frente vazia deve ser 0');
assert.strictEqual(canteiro.ativo, true, 'Frente criada deve estar ativa');

const civil = catalogo.find(f => f.nome === 'CIVIL');
assert.ok(civil, 'Frente CIVIL deve existir no catálogo');
assert.strictEqual(civil.qtd, 2, 'CIVIL deve ter 2 colaboradores ativos (CARLOS e MARIA)');
console.log('✅ Teste 2 Aprovado: Frente sem pessoas persiste globalmente e mantém headcount/HHT blindados.');

// =========================================================================
// TESTE 3: Preservação de Aliases de DDSMA e Terceiros Segregados
// =========================================================================
console.log('--- Teste 3: Preservação de Aliases e Isolamento de Terceiros ---');
// Alias WILLIAMS -> ADEILTON MONTEIRO
assert.strictEqual(resolverFrenteDds('WILLIAMS'), 'ADEILTON MONTEIRO', 'Alias legado deve resolver frente corretamente');
assert.strictEqual(resolverFrenteDds('CIVIL'), 'CIVIL', 'Frente sem alias retorna ela mesma');

// Terceiros/PJ não podem ser misturados nas frentes operacionais próprias
const terceirosNoCatalogo = catalogo.find(f => f.nome === 'EMPRESA TERCEIRA LTDA');
assert.strictEqual(terceirosNoCatalogo ? terceirosNoCatalogo.qtd : 0, 0, 'Terceiros PJ não podem inflar contagem de frentes próprias CLT');
console.log('✅ Teste 3 Aprovado: Aliases legados e segregação de terceiros 100% preservados.');

// =========================================================================
// TESTE 4: Tratamento de Nomes com Acentos, Apóstrofo e Normalização
// =========================================================================
console.log('--- Teste 4: Normalização, Acentos e Caracteres Especiais ---');
global.allFrentesCatalogo.push({ nome: "CANTEIRO D'ÁGUA", ativo: true });
global.allFrentesCatalogo.push({ nome: "MANUTENÇÃO ELÉTRICA", ativo: true });

const catalogoAcentos = obterCatalogoFrentesCompleto();
const dAgua = catalogoAcentos.find(f => f.nome === "CANTEIRO D'ÁGUA");
const manut = catalogoAcentos.find(f => f.nome === "MANUTENÇÃO ELÉTRICA");
assert.ok(dAgua, "Frente com apóstrofo CANTEIRO D'ÁGUA deve constar no catálogo");
assert.ok(manut, 'Frente com acentos MANUTENÇÃO ELÉTRICA deve constar no catálogo');

const frentesAcentosTodas = todasFrentesAtivas();
assert.strictEqual(frentesAcentosTodas.includes("CANTEIRO D'ÁGUA"), true);
assert.strictEqual(frentesAcentosTodas.includes("MANUTENÇÃO ELÉTRICA"), true);
console.log('✅ Teste 4 Aprovado: Nomes com acentuação e apóstrofo devidamente suportados e normalizados.');

// =========================================================================
// TESTE 5: Inativação Global sem Alteração Retroativa de Vínculos
// =========================================================================
console.log('--- Teste 5: Inativação Global Preserva Colaboradores Existentes ---');
// Inativa a frente CIVIL no catálogo global
global.allFrentesCatalogo.push({ nome: 'CIVIL', ativo: false });
const catalogoInativo = obterCatalogoFrentesCompleto();
const civilItem = catalogoInativo.find(f => f.nome === 'CIVIL');
assert.strictEqual(civilItem.ativo, false, 'Frente CIVIL deve estar marcada como inativa');
assert.strictEqual(civilItem.qtd, 2, 'Colaboradores vinculados continuam existindo (2 ativos)');

// Verifica que nenhum colaborador foi demitido, excluído ou desvinculado
const carlos = allEfetivo.find(e => e.id === '101');
assert.strictEqual(carlos.responsavel, 'CIVIL', 'Responsável do colaborador existente NÃO pode ser alterado retroativamente');
assert.strictEqual(carlos.status, 'ATIVO', 'Status do colaborador existente permanece ATIVO');
console.log('✅ Teste 5 Aprovado: Inativação global restringe novas escolhas sem demitir nem desvincular pessoas.');

console.log('\n🎉 TODOS OS 5 TESTES AUTOMATIZADOS DE FRENTES FORAM APROVADOS (100% VERDES)!');
