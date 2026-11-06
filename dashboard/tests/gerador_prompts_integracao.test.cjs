const assert = require('assert');
const fs = require('fs');

console.log('🧪 Iniciando Suíte de Testes: Integração do Gerador de Prompts SST');

// 1. Mock de DOM básico
const elements = {};
function mockElement(id, tagName = 'div') {
    if (!elements[id]) {
        elements[id] = {
            id,
            tagName: tagName.toUpperCase(),
            style: { display: '' },
            dataset: {},
            value: '',
            textContent: '',
            innerHTML: '',
            classList: {
                _classes: new Set(),
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); },
                contains(c) { return this._classes.has(c); }
            }
        };
    }
    return elements[id];
}

// Preparando elementos da barra de navegação e páginas
const pageIds = [
    'checklists', 'extintores', 'relatos', 'treinamentos', 'ddsma', 'efetivo', 
    'matrizrisco', 'planoacao', 'acidentes', 'saude', 'psicossocial', 'epi', 
    'apr', 'placarlideres', 'ambiental', 'compras', 'cipa', 'brigada', 
    'documentos', 'acervodrive', 'relatoriosms', 'importexport', 'config', 
    'usuariospainel', 'ergonomia', 'periculosidade', 'geradorprompts'
];

pageIds.forEach(id => {
    mockElement('page-' + id);
    const navBtn = mockElement('nav' + id.charAt(0).toUpperCase() + id.slice(1));
    navBtn.classList.add('db-nav-item');
});
mockElement('navGeradorPrompts');
mockElement('pageTitle');
mockElement('wrapCentralAlertas');

global.document = {
    getElementById(id) {
        return elements[id] || null;
    },
    querySelector(selector) {
        if (selector === '.db-page.active') {
            return pageIds.map(id => elements['page-' + id]).find(el => el && el.classList.contains('active')) || null;
        }
        return null;
    },
    querySelectorAll(selector) {
        if (selector === '.db-page') {
            return pageIds.map(id => elements['page-' + id]).filter(Boolean);
        }
        if (selector === '.db-nav-item') {
            return Object.values(elements).filter(el => el.classList.contains('db-nav-item'));
        }
        return [];
    }
};

const localStorageMock = {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
};

global.window = {
    document: global.document,
    localStorage: localStorageMock
};
global.localStorage = localStorageMock;

// Funções dummy necessárias de layout/render do core
global.abrirGrupoNavPagina = () => {};
global.destacarGrupoAtivo = () => {};
global.renderBannerCorDoMes = () => {};
global.renderAll = () => {};
global.atualizarAvisosPermissaoPagina = () => {};
global.SUPER_ADMIN_MATRICULAS = ['1001'];

// Leitura e avaliação do gerador de prompts
const codeGerador = fs.readFileSync('dashboard/modules/gerador_prompts.js', 'utf8');
eval(codeGerador);

assert.strictEqual(typeof window.inicializarGeradorPrompts, 'function', 'window.inicializarGeradorPrompts deve estar exportada');
console.log('✅ Verificação 1: Módulo gerador_prompts.js exporta inicializarGeradorPrompts');

// Leitura de showDbPage e DB_PAGE_TITLES de dashboard.js
const codeDashboard = fs.readFileSync('dashboard/dashboard.js', 'utf8');

// Avalia DB_PAGE_TITLES
const titlesMatch = codeDashboard.match(/var DB_PAGE_TITLES = \{[\s\S]*?\n\};/);
if (!titlesMatch) throw new Error('DB_PAGE_TITLES não encontrado em dashboard.js');
eval(titlesMatch[0]);

// Avalia MODULOS_PAINEL_DISPONIVEIS
const modulosMatch = codeDashboard.match(/var MODULOS_PAINEL_DISPONIVEIS = \[[\s\S]*?\n\];/);
if (!modulosMatch) throw new Error('MODULOS_PAINEL_DISPONIVEIS não encontrado em dashboard.js');
eval(modulosMatch[0]);

assert.strictEqual(DB_PAGE_TITLES['geradorprompts'], 'Gerador de Prompts IA', 'Título de geradorprompts deve estar registrado');
console.log('✅ Verificação 2: DB_PAGE_TITLES contém geradorprompts');

const moduloCadastrado = MODULOS_PAINEL_DISPONIVEIS.find(m => m.key === 'geradorprompts');
assert.ok(moduloCadastrado, 'MODULOS_PAINEL_DISPONIVEIS deve conter geradorprompts');
console.log('✅ Verificação 3: MODULOS_PAINEL_DISPONIVEIS registrado para gestão de usuários');

// Extrai moduloPermitidoPainel de dashboard.js
const permMatch = codeDashboard.match(/function moduloPermitidoPainel\(pageId\) \{[\s\S]*?\n\}/);
if (!permMatch) throw new Error('moduloPermitidoPainel não encontrada em dashboard.js');
eval(permMatch[0]);

// Extrai showDbPage de dashboard.js
const showPageMatch = codeDashboard.match(/function showDbPage\(pageId\) \{[\s\S]*?\n\}/);
if (!showPageMatch) throw new Error('showDbPage não encontrada em dashboard.js');
eval(showPageMatch[0]);

// Extrai aplicarRestricaoModulosPainelNoMenu de dashboard.js
const restricoesMatch = codeDashboard.match(/function aplicarRestricaoModulosPainelNoMenu\(\) \{[\s\S]*?\n\}/);
if (!restricoesMatch) throw new Error('aplicarRestricaoModulosPainelNoMenu não encontrada em dashboard.js');
eval(restricoesMatch[0]);

// =========================================================================
// TESTE 1: Navegação para a nova página do Gerador
// =========================================================================
let mockSession = { tipo: 'colaborador_interno', ver_todos: true };
global.sessaoDashboardAtual = () => mockSession;

showDbPage('geradorprompts');

const pageGerador = elements['page-geradorprompts'];
const navBtnGerador = elements['navGeradorPrompts'];
const pageTitle = elements['pageTitle'];

assert.ok(pageGerador.classList.contains('active'), 'A página #page-geradorprompts deve estar com a classe active');
assert.ok(navBtnGerador.classList.contains('active'), 'O botão #navGeradorPrompts deve estar ativo');
assert.strictEqual(pageTitle.textContent, 'Gerador de Prompts IA', 'O título deve ser Gerador de Prompts IA');
assert.strictEqual(pageGerador.dataset.inicializado, 'true', 'A página deve ter sido inicializada');
console.log('✅ Teste 1 Aprovado: showDbPage(\'geradorprompts\') ativa página, botão e título com perfeição');

// =========================================================================
// TESTE 2: Simulação de navegação cruzada (sai e volta) preservando dados
// =========================================================================
// Simula preenchimento de dados pelo usuário
const mockInputDesc = mockElement('promptDescricaoTarefa', 'textarea');
mockInputDesc.value = 'Criar novo fluxo de fiscalização de terceiros com tabela própria';

// Navega para Checklists
showDbPage('checklists');
assert.ok(!pageGerador.classList.contains('active'), 'A página do gerador não deve estar ativa');
assert.ok(elements['page-checklists'].classList.contains('active'), 'Checklists deve estar ativa');

// Volta para o Gerador
showDbPage('geradorprompts');
assert.ok(pageGerador.classList.contains('active'), 'Gerador deve voltar a ficar ativo');
assert.strictEqual(mockInputDesc.value, 'Criar novo fluxo de fiscalização de terceiros com tabela própria', 'Os dados digitados não podem ser apagados na reabertura');
console.log('✅ Teste 2 Aprovado: Alternância entre páginas preserva o estado e os dados em andamento');

// =========================================================================
// TESTE 3: Regras de Perfil e Visibilidade (aplicarRestricaoModulosPainelNoMenu)
// =========================================================================
// Cenário A: Usuário interno (ver_todos = true)
mockSession = { tipo: 'colaborador_interno', ver_todos: true };
aplicarRestricaoModulosPainelNoMenu();
assert.strictEqual(navBtnGerador.style.display, '', 'Usuário interno deve ver o botão do gerador');

// Cenário B: Usuário externo com permissão explícita
mockSession = { tipo: 'painel_externo', ver_todos: false, modulos: ['checklists', 'geradorprompts'] };
aplicarRestricaoModulosPainelNoMenu();
assert.strictEqual(navBtnGerador.style.display, '', 'Usuário externo com geradorprompts liberado deve ver o botão');
assert.strictEqual(moduloPermitidoPainel('geradorprompts'), true, 'Usuário com módulo atribuído deve poder acessar');

// Cenário C: Usuário externo sem permissão
mockSession = { tipo: 'painel_externo', ver_todos: false, modulos: ['checklists', 'treinamentos'] };
aplicarRestricaoModulosPainelNoMenu();
assert.strictEqual(navBtnGerador.style.display, 'none', 'Usuário externo sem geradorprompts NÃO deve ver o botão');
assert.strictEqual(moduloPermitidoPainel('geradorprompts'), false, 'Usuário sem módulo atribuído deve ter acesso negado');
console.log('✅ Teste 3 Aprovado: Visibilidade por perfil respeitada com blindagem de acesso');

// =========================================================================
// TESTE 4: Espelho em epi_estoque.js
// =========================================================================
const codeEpiEstoque = fs.readFileSync('dashboard/modules/epi_estoque.js', 'utf8');
const titlesEpiMatch = codeEpiEstoque.match(/var DB_PAGE_TITLES = \{[\s\S]*?\n\};/);
assert.ok(titlesEpiMatch[0].includes("geradorprompts: 'Gerador de Prompts IA'"), 'epi_estoque.js deve conter geradorprompts em DB_PAGE_TITLES');

const showPageEpiMatch = codeEpiEstoque.match(/function showDbPage\(pageId\) \{[\s\S]*?\n\}/);
assert.ok(showPageEpiMatch[0].includes("geradorprompts: 'navGeradorPrompts'"), 'epi_estoque.js deve conter geradorprompts no navMap');
assert.ok(showPageEpiMatch[0].includes("inicializarGeradorPrompts"), 'epi_estoque.js deve invocar inicializarGeradorPrompts');
console.log('✅ Teste 4 Aprovado: Duplicação homônima em epi_estoque.js devidamente sincronizada');

// =========================================
// TESTE 5: Geração de Prompt e Cópia
// =========================================
// Simula elementos do formulário de geração
const selInt = mockElement('promptSelectIntencao', 'select');
selInt.value = 'inclusao_funcao';
const selMod = mockElement('promptSelectModulo', 'select');
selMod.value = 'efetivo_ferias';
const resArea = mockElement('promptResultadoGerado', 'textarea');
const badgeTam = mockElement('badgeTamanhoPrompt');
const btnModoNovo = mockElement('btnModoNovoModulo');
const btnModoExistente = mockElement('btnModoModuloExistente');
const blocoNovo = mockElement('blocoModoNovoModulo');
const blocoExistente = mockElement('blocoModoModuloExistente');

// Testa execução de geração
window.selecionarModoOperacao('modulo_existente');
assert.strictEqual(window._modoOperacaoGerador, 'modulo_existente');

mockElement('promptDescricaoTexto', 'textarea').value = 'Adicionar campo de observação médica no histórico';
window.executarGeracaoPrompt();

assert.ok(resArea.value.length > 50, 'O prompt gerado deve conter conteúdo substancial');
assert.ok(resArea.value.includes('Regras de Ouro') || resArea.value.includes('João Everton'), 'O prompt gerado deve conter regras de ouro de SST');
console.log('✅ Teste 5 Aprovado: Geração de prompt técnico SST executada com sucesso');

// =========================================================================
// TESTE 6: Persistência na Base de Conhecimento e Simulação de Recarregamento
// =========================================================================
// Salva novo conhecimento
window.gerenciadorConhecimentoSST.adicionarRegraOuro('Férias de menores aprendizes devem coincidir com recesso escolar.');
const salvoNoStorage = localStorage.getItem('sst_gerador_prompts_conhecimento_v1');
assert.ok(salvoNoStorage, 'Conhecimento deve ser persistido no localStorage');
assert.ok(salvoNoStorage.includes('menores aprendizes'), 'Regra adicionada deve estar gravada no localStorage');

// Simula recarregamento da página (nova instância do gerenciador a partir do storage)
const novoGerenciador = new window.gerenciadorConhecimentoSST.constructor();
assert.ok(novoGerenciador.dados.regrasOuroGlobais.some(r => r.includes('menores aprendizes')), 'Dados persistidos devem ser recuperados no recarregamento da página');
console.log('✅ Teste 6 Aprovado: Persistência local e recarregamento da base de conhecimento validados');

console.log('\n🎉 TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO (100% VERDES)!');
