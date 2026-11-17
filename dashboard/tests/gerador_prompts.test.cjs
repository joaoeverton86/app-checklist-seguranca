const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const arquivo = path.join(__dirname, '..', 'modules', 'gerador_prompts.js');
const codigo = fs.readFileSync(arquivo, 'utf8');

assert.doesNotMatch(codigo, /\?v=296/, 'o gerador não pode congelar o cache 296');
assert.doesNotMatch(codigo, /\?v=297/, 'o gerador não pode congelar o cache 297');
assert.doesNotMatch(codigo, /cpf_ou_documento/, 'o gerador não pode inventar coluna de CPF');
assert.doesNotMatch(codigo, /value="Gestão de Terceiros/, 'a tela não pode abrir já preenchida com terceiros');
assert.doesNotMatch(codigo, /!inputNome\.value[\s\S]{0,180}Gestão de Terceiros/, 'campo vazio não pode receber o exemplo de terceiros sozinho');

function carregar(storageInicial) {
    const storage = new Map(Object.entries(storageInicial || {}));
    const elementos = new Map();

    function garantir(id) {
        if (!elementos.has(id)) {
            elementos.set(id, {
                id,
                value: '',
                innerHTML: '',
                textContent: '',
                style: {},
                dataset: {},
                focus() {},
                select() {}
            });
        }
        return elementos.get(id);
    }

    [
        'novoModuloNome', 'novoModuloArquivo', 'novoModuloTabela', 'novoModuloChave',
        'novoModuloGrupo', 'promptDescricaoTexto', 'promptResultadoGerado',
        'promptSelectIntencao', 'promptSelectModulo', 'promptSelectSubmodulo',
        'badgeTamanhoPrompt', 'btnCopiarPrompt', 'toastCopiadoSucesso',
        'labelPromptDescricao', 'ctxModuloArquivo', 'ctxModuloTabelas', 'ctxModuloDescricao'
    ].forEach(id => garantir(id));
    garantir('novoModuloGrupo').value = 'seguranca';

    const janela = {};
    const document = {
        readyState: 'loading',
        getElementById: id => elementos.get(id) || null,
        querySelector(seletor) {
            if (String(seletor).includes('gerador_prompts.js')) {
                return { getAttribute: () => 'modules/gerador_prompts.js?v=298' };
            }
            return null;
        },
        addEventListener() {},
        createElement() {
            return { href: '', download: '', style: {}, click() {} };
        },
        body: { appendChild() {}, removeChild() {} },
        execCommand() { return true; }
    };

    const sandbox = {
        window: janela,
        document,
        localStorage: {
            getItem: chave => (storage.has(chave) ? storage.get(chave) : null),
            setItem: (chave, valor) => storage.set(chave, String(valor))
        },
        console,
        JSON,
        Date,
        Math,
        Object,
        String,
        Array,
        RegExp,
        Number,
        Error,
        Promise,
        setTimeout: () => 0,
        clearTimeout() {},
        alert() {},
        confirm: () => false,
        navigator: {
            clipboard: {
                writeText: () => Promise.resolve()
            }
        },
        URL,
        Blob
    };
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox, { filename: arquivo });
    return { janela, storage, garantir };
}

const antigo = {
    versao: '2.6.0',
    regrasOuroGlobais: ['Regra extra do João'],
    modulos: [
        {
            id: 'apr',
            submodulos: [{ id: 'nova_apr', regrasNegocio: 'P/S automatico' }]
        },
        { id: 'modulo_do_joao', nome: 'EXTRA DO JOÃO', submodulos: [] }
    ]
};

const baseAntiga = carregar({
    sst_gerador_prompts_conhecimento_v1: JSON.stringify(antigo)
});
const dados = baseAntiga.janela.gerenciadorConhecimentoSST.dados;
assert.equal(dados.versao, '2.7.0');
const apr = dados.modulos.find(m => m.id === 'apr');
assert.ok(apr, 'o módulo APR oficial precisa permanecer');
assert.match(apr.submodulos[0].regrasNegocio, /em branco/);
assert.doesNotMatch(apr.submodulos[0].regrasNegocio, /P\/S automatico/);
assert.ok(dados.modulos.some(m => m.id === 'modulo_do_joao'), 'módulo extra do usuário permanece');
assert.ok(dados.regrasOuroGlobais.some(r => r.includes('Não preencher probabilidade')));
assert.ok(dados.regrasOuroGlobais.includes('Regra extra do João'));

const { janela, storage, garantir } = carregar();
const gerar = janela.construirPromptGeradorPrompts;

const vazio = gerar({
    intencaoId: 'novo_modulo_completo',
    moduloId: '__novo_modulo__',
    descricaoUsuario: 'medir ruído na frente',
    campos: {
        novoModuloNome: '',
        novoModuloArquivo: '',
        novoModuloTabela: '',
        novoModuloChave: '',
        novoModuloGrupo: ''
    }
});
assert.match(vazio, /ainda não foi preenchido/);
assert.doesNotMatch(vazio, /Gestão de Terceiros|terceiros_prestadores|cpf_ou_documento|ARTEC|\?v=296/);

const higiene = gerar({
    intencaoId: 'novo_modulo_completo',
    moduloId: '__novo_modulo__',
    descricaoUsuario: 'Registrar dosimetria de ruído e calor por frente e GHE.',
    campos: {
        novoModuloNome: 'Higiene Ocupacional',
        novoModuloArquivo: 'dashboard/modules/higiene_ocupacional.js',
        novoModuloTabela: 'higiene_medicoes',
        novoModuloChave: 'higiene_ocupacional',
        novoModuloGrupo: 'seguranca'
    }
});
assert.match(higiene, /public\.higiene_medicoes/);
assert.match(higiene, /NAV_GROUP_POR_PAGINA/);
assert.match(higiene, /não é cadastro de pessoas/);
assert.doesNotMatch(higiene, /cpf_ou_documento|empresa_parceira|Terceiro_PJ|empresa_ou_origem|\?v=296|\?v=297/);

const pessoas = gerar({
    intencaoId: 'novo_modulo_completo',
    moduloId: '__novo_modulo__',
    descricaoUsuario: 'Cadastrar prestadores PJ da obra sem misturar com o efetivo.',
    campos: {
        novoModuloNome: 'Gestão de Terceiros',
        novoModuloArquivo: 'dashboard/modules/terceiros_prestadores.js',
        novoModuloTabela: 'terceiros_prestadores',
        novoModuloChave: 'terceiros_prestadores',
        novoModuloGrupo: 'pessoas'
    }
});
assert.match(pessoas, /colaboradores_efetivo/);
assert.match(pessoas, /empresa_ou_origem/);
assert.doesNotMatch(pessoas, /cpf_ou_documento/);

const sumido = gerar({
    intencaoId: 'correcao_funcao',
    moduloId: 'modulo_inexistente',
    submoduloId: 'qualquer',
    descricaoUsuario: 'ajustar um botão'
});
assert.match(sumido, /não está na base/);
assert.doesNotMatch(sumido, /treinamentos_ddsma\.js/);

const correcao = gerar({
    intencaoId: 'correcao_funcao',
    moduloId: 'apr',
    submoduloId: 'nova_apr',
    descricaoUsuario: 'o botão salvar não grava o título'
});
assert.match(correcao, /Não aproveitar a correção para incluir tela/);

const regra = gerar({
    intencaoId: 'regra_sst',
    moduloId: 'apr',
    submoduloId: 'nova_apr',
    descricaoUsuario: 'incluir o texto da declaração que eu escrever'
});
assert.match(regra, /Não inventar CA, CBO, limite/);

const fantasma = gerar({
    intencaoId: 'inclusao_funcao',
    moduloId: 'apr',
    submoduloId: 'submodulo_fantasma',
    descricaoUsuario: 'incluir um campo'
});
assert.match(fantasma, /não está na base/);
assert.doesNotMatch(fantasma, /salvarApr/);
assert.doesNotMatch(fantasma, /abrirFormNovaApr/);

janela.selecionarModoOperacao('novo_modulo');
assert.equal(garantir('novoModuloNome').value, '');
assert.doesNotMatch(garantir('promptResultadoGerado').value, /Gestão de Terceiros|cpf_ou_documento/);
assert.equal(storage.get('sst_gerador_prompts_historico_v1') || '', '');

garantir('novoModuloNome').value = 'Higiene Ocupacional';
garantir('novoModuloArquivo').value = 'dashboard/modules/caminho_manual.js';
janela.aoDigitarNomeNovoModulo();
assert.equal(garantir('novoModuloArquivo').value, 'dashboard/modules/caminho_manual.js');

garantir('novoModuloArquivo').value = '';
garantir('novoModuloTabela').value = '';
garantir('novoModuloChave').value = '';
janela.aoDigitarNomeNovoModulo();
assert.equal(garantir('novoModuloArquivo').value, 'dashboard/modules/higiene_ocupacional.js');
assert.equal(garantir('novoModuloTabela').value, 'higiene_ocupacional');

janela._sstSugestoesAtuais = [{
    nome: 'Gestão de Terceiros, PJ & Temporários',
    arquivo: 'dashboard/modules/terceiros_prestadores.js',
    tabela: 'terceiros_prestadores',
    grupo: 'pessoas',
    texto: 'Cadastrar prestadores PJ sem usar o efetivo.'
}];
janela.aplicarExemploSugerido(0);
assert.equal(garantir('novoModuloArquivo').value, 'dashboard/modules/terceiros_prestadores.js');
assert.equal(garantir('novoModuloTabela').value, 'terceiros_prestadores');
assert.match(garantir('promptResultadoGerado').value, /colaboradores_efetivo/);
assert.doesNotMatch(garantir('promptResultadoGerado').value, /cpf_ou_documento/);

async function conferirCopia() {
    garantir('novoModuloNome').value = 'Higiene Ocupacional';
    garantir('novoModuloArquivo').value = 'dashboard/modules/higiene_ocupacional.js';
    garantir('novoModuloTabela').value = 'higiene_medicoes';
    garantir('novoModuloChave').value = 'higiene_ocupacional';
    garantir('promptDescricaoTexto').value = 'Registrar dosimetria de ruído por frente.';
    janela.executarGeracaoPrompt();
    assert.equal(storage.get('sst_gerador_prompts_historico_v1') || '', '');
    janela.copiarPromptGerado();
    await Promise.resolve();
    const historico = JSON.parse(storage.get('sst_gerador_prompts_historico_v1') || '[]');
    assert.equal(historico.length, 1);
    assert.equal(historico[0].intencaoId, 'novo_modulo_completo');
}

conferirCopia().then(() => {
    console.log('gerador_prompts.test.cjs: geração, mesclagem e histórico aprovados');
}).catch(erro => {
    console.error(erro);
    process.exit(1);
});
