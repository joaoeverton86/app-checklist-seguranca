const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const painel = path.resolve(__dirname, '..');
const codigo = fs.readFileSync(path.join(painel, 'modules', 'apr_cipa.js'), 'utf8');
const html = fs.readFileSync(path.join(painel, 'index.html'), 'utf8');
const nucleo = fs.readFileSync(path.join(painel, 'dashboard.js'), 'utf8');

assert.match(html, /modules\/apr_cipa\.js\?v=296/);
assert.match(html, /modules\/ia_aprendizado\.js\?v=3/);
assert.doesNotMatch(html, /ia_aprendizado\.js\?v=[12]\b/);
assert.doesNotMatch(html, /autoCalibrarTodosRiscosApr|Sugerir P\/S/);
assert.match(html, /Detectar Riscos Ocultos \(IA SST\)/);
assert.doesNotMatch(codigo, /Sugerir P\/S|Ajustar Automaticamente|Ajuste a nota|Salvar mesmo assim/);
assert.match(codigo, /Redução não é presumida/);
assert.match(codigo, /residual\.valor > puro\.valor/);
assert.doesNotMatch(codigo, /residual\.valor >= puro\.valor/);
const ordemNucleo = html.indexOf('dashboard.js');
const ordemApr = html.indexOf('modules/apr_cipa.js');
const ordemIa = html.indexOf('modules/ia_aprendizado.js');
assert.ok(ordemNucleo >= 0 && ordemNucleo < ordemApr && ordemApr < ordemIa, 'núcleo, APR e Inteligência publicada carregam nessa ordem');
const mudancaPuro = codigo.slice(codigo.indexOf('function onMudarPuroApr'), codigo.indexOf('// 2. Biblioteca'));
assert.doesNotMatch(mudancaPuro, /p_residual|s_residual|inferirPsApr/);

const elementos = new Map();
function campo(id) {
    if (!elementos.has(id)) {
        elementos.set(id, { id, value: '', textContent: '', style: {}, scrollIntoView() {} });
    }
    return elementos.get(id);
}

const sandbox = {
    console,
    confirm: () => true,
    alert() {},
    setTimeout,
    clearTimeout,
    escapeHTML: valor => String(valor == null ? '' : valor),
    document: {
        getElementById: id => campo(id),
        querySelectorAll: () => []
    }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(codigo, sandbox, { filename: 'apr_cipa.js' });

sandbox.aprRiscosForm = [{
    passo_tarefa: 'trabalho em altura no andaime',
    perigo_fonte: 'queda de altura',
    evento_risco: 'queda',
    danos_provaveis: 'óbito',
    p_puro: '',
    s_puro: '',
    medidas_prevencao: 'cinto',
    p_residual: '',
    s_residual: '',
    responsavel: ''
}];
sandbox.autoCalibrarTodosRiscosApr();
sandbox.autoCalibrarRiscoIndividual(0);
assert.equal(sandbox.aprRiscosForm[0].p_puro, '');
assert.equal(sandbox.aprRiscosForm[0].s_puro, '');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '');

sandbox.onMudarPuroApr(0, 'p_puro', '4');
sandbox.onMudarPuroApr(0, 's_puro', '5');
assert.equal(sandbox.aprRiscosForm[0].p_puro, '4');
assert.equal(sandbox.aprRiscosForm[0].s_puro, '5');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '');

const antes = sandbox.aprRiscosForm.length;
sandbox.inserirPacoteRiscosDaBiblioteca(0);
const incluidos = sandbox.aprRiscosForm.slice(antes);
assert.ok(incluidos.length >= 2);
incluidos.forEach(pacote => {
    assert.equal(pacote.p_puro, '');
    assert.equal(pacote.s_puro, '');
    assert.equal(pacote.p_residual, '');
    assert.equal(pacote.s_residual, '');
    assert.ok(String(pacote.medidas_prevencao || '').trim());
});
assert.match(incluidos[0].medidas_prevencao, /talude|escoramento/i);

sandbox.allAprModelos = [{
    id: 7,
    titulo: 'Roçada',
    riscos: [{
        passo_tarefa: 'roçada',
        perigo_fonte: 'foice',
        evento_risco: 'corte',
        danos_provaveis: 'corte na perna',
        p_puro: 3,
        s_puro: 4,
        medidas_prevencao: 'perneira e distância da ferramenta',
        p_residual: 1,
        s_residual: 2,
        responsavel: 'encarregado'
    }],
    atividades_criticas: [],
    epis_basicos: [],
    epis_especificos: []
}];
const abrirFormNovaAprReal = sandbox.abrirFormNovaApr;
const renderEquipeAprPreviewReal = sandbox.renderEquipeAprPreview;
sandbox.abrirFormNovaApr = () => {};
sandbox.showAprSubtab = () => {};
sandbox.renderEquipeAprPreview = () => {};
sandbox.usarModeloComoBase(7);
assert.equal(sandbox.aprRiscosForm[0].perigo_fonte, 'foice');
assert.match(sandbox.aprRiscosForm[0].medidas_prevencao, /perneira/);
assert.equal(sandbox.aprRiscosForm[0].p_puro, '');
assert.equal(sandbox.aprRiscosForm[0].s_puro, '');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '');

assert.match(nucleo, /function autoCalibrarTodosRiscosApr/);
assert.match(codigo, /function autoCalibrarTodosRiscosApr/);

const critico = sandbox.nivelRiscoApr(4, 5);
const baixo = sandbox.nivelRiscoApr(2, 2);
assert.equal(critico.valor, 20);
assert.equal(critico.label, 'Crítico');
assert.equal(baixo.valor, 4);
assert.equal(baixo.label, 'Baixo');
assert.equal(sandbox.nivelRiscoApr('', 5).valor, null);

sandbox.aprRiscosForm[0].p_residual = '4';
sandbox.aprRiscosForm[0].s_residual = '5';
sandbox.onMudarPuroApr(0, 'p_puro', '2');
sandbox.onMudarPuroApr(0, 's_puro', '2');
assert.equal(sandbox.aprRiscosForm[0].p_puro, '2');
assert.equal(sandbox.aprRiscosForm[0].s_puro, '2');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '4');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '5');
assert.match(campo('aprFormRiscosLista').innerHTML, /Redução não é presumida/);
assert.doesNotMatch(campo('aprFormRiscosLista').innerHTML, /Ajuste a nota/);

sandbox.aprRiscosForm[0].p_residual = '2';
sandbox.aprRiscosForm[0].s_residual = '2';
sandbox.onMudarPuroApr(0, 'p_puro', '2');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '2');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '2');
sandbox.renderRiscosAprForm();
assert.doesNotMatch(campo('aprFormRiscosLista').innerHTML, /Redução não é presumida/);

sandbox.aprRiscosForm[0].p_residual = '';
sandbox.aprRiscosForm[0].s_residual = '';
sandbox.onMudarPuroApr(0, 's_puro', '5');
assert.equal(sandbox.aprRiscosForm[0].p_residual, '');
assert.equal(sandbox.aprRiscosForm[0].s_residual, '');

function dataLocal(iso) {
    const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}
sandbox.parseLocalDate = dataLocal;
sandbox.formatSimpleDate = valor => String(valor || '');
sandbox.equipeDaFrente = () => [];
sandbox.codigoRevisaoDocumento = () => '';
sandbox.LOGO_COP_BASE64 = '';
sandbox.labelContagemAnexos = () => '';
sandbox.bloquearEdicaoSeNaoAutorizado = () => false;
sandbox.registrarAuditLogDashboard = () => {};
sandbox.registrarEmissaoDocumento = () => {};
sandbox.allAprAuditLog = [];

const gravacoes = [];
sandbox.supabaseUpsert = async (tabela, linhas) => {
    gravacoes.push({ tabela, linhas: JSON.parse(JSON.stringify(linhas)) });
};

function preencherMinimo(numero, titulo) {
    campo('aprForm_id').value = '';
    campo('aprForm_numero').value = numero;
    campo('aprForm_dataEmissao').value = '2026-11-18';
    campo('aprForm_titulo').value = titulo;
    campo('aprForm_validadeAte').value = '';
}

async function provarGravacao() {
    sandbox.confirm = () => { throw new Error('nota igual ou vazia não pede confirmação'); };
    sandbox.aprRiscosForm = [{
        passo_tarefa: 'corte',
        perigo_fonte: 'serra',
        evento_risco: 'corte na madeira',
        danos_provaveis: 'corte',
        p_puro: '',
        s_puro: '',
        medidas_prevencao: 'luva',
        p_residual: '',
        s_residual: '',
        responsavel: 'encarregado'
    }];
    preencherMinimo('902', 'Nota ainda em branco');
    await sandbox.salvarApr();
    assert.equal(gravacoes.length, 1);
    assert.equal(gravacoes[0].linhas[0].riscos[0].p_puro, '');
    assert.equal(gravacoes[0].linhas[0].riscos[0].s_residual, '');

    sandbox.aprRiscosForm = [{
        passo_tarefa: 'altura',
        perigo_fonte: 'queda',
        evento_risco: 'queda de nível',
        danos_provaveis: 'fratura',
        p_puro: '3',
        s_puro: '3',
        medidas_prevencao: 'guarda-corpo',
        p_residual: '3',
        s_residual: '3',
        responsavel: 'encarregado'
    }];
    preencherMinimo('901', 'Residual igual');
    await sandbox.salvarApr();
    assert.equal(gravacoes.length, 2);
    assert.equal(gravacoes[1].linhas[0].riscos[0].p_puro, '3');
    assert.equal(gravacoes[1].linhas[0].riscos[0].p_residual, '3');
    sandbox.editarApr('901');
    assert.equal(sandbox.aprRiscosForm[0].p_puro, '3');
    assert.equal(sandbox.aprRiscosForm[0].s_puro, '3');
    assert.equal(sandbox.aprRiscosForm[0].p_residual, '3');
    assert.equal(sandbox.aprRiscosForm[0].s_residual, '3');
    assert.match(sandbox.aprRiscosForm[0].medidas_prevencao, /guarda-corpo/);

    sandbox.aprRiscosForm[0].p_residual = '5';
    sandbox.aprRiscosForm[0].s_residual = '5';
    campo('aprForm_id').value = '901';
    campo('aprForm_numero').value = '901';
    const perguntas = [];
    sandbox.confirm = mensagem => {
        perguntas.push(mensagem);
        return false;
    };
    await sandbox.salvarApr();
    assert.equal(gravacoes.length, 2);
    assert.equal(perguntas.length, 1);
    assert.match(perguntas[0], /Redução não é presumida/);
    assert.match(perguntas[0], /não é um erro/);
    assert.doesNotMatch(perguntas[0], /Ajuste a nota|Salvar mesmo assim|baixar a nota/i);

    sandbox.confirm = mensagem => {
        perguntas.push(mensagem);
        return true;
    };
    await sandbox.salvarApr();
    assert.equal(gravacoes.length, 3);
    assert.equal(gravacoes[2].linhas[0].riscos[0].p_residual, '5');
    assert.equal(gravacoes[2].linhas[0].riscos[0].s_residual, '5');
    assert.equal(gravacoes[2].linhas[0].riscos[0].p_puro, '3');

    sandbox.allAprRegistros.push({
        id: '42',
        titulo: 'Vala',
        validade_dias: 15,
        data_emissao: '2026-11-18',
        riscos: [{
            passo_tarefa: 'escavação',
            perigo_fonte: 'talude',
            evento_risco: 'desabamento',
            danos_provaveis: 'soterramento',
            p_puro: 4,
            s_puro: 5,
            medidas_prevencao: 'escoramento',
            p_residual: 2,
            s_residual: 4,
            responsavel: 'encarregado'
        }]
    });
    sandbox.setTimeout = () => {};
    let htmlImpresso = '';
    sandbox.Blob = class BlobCapturado {
        constructor(partes) { htmlImpresso = partes.join(''); }
    };
    sandbox.URL = { createObjectURL: () => 'blob:apr-teste', revokeObjectURL() {} };
    sandbox.document.createElement = () => ({ href: '', target: '', rel: '', click() {} });
    sandbox.document.body = { appendChild() {}, removeChild() {} };
    sandbox.imprimirApr('42');
    assert.match(htmlImpresso, />4<\/td>\s*<td style="text-align:center;">5<\/td>\s*<td style="text-align:center;[^"]*">20<\/td>\s*<td>escoramento<\/td>\s*<td style="text-align:center;">2<\/td>\s*<td style="text-align:center;">4<\/td>\s*<td style="text-align:center;[^"]*">8<\/td>/);
    assert.equal(sandbox.allAprRegistros.find(item => item.id === '42').riscos[0].p_puro, 4);

    sandbox.abrirFormNovaApr = abrirFormNovaAprReal;
    sandbox.renderEquipeAprPreview = renderEquipeAprPreviewReal;
    sandbox.duplicarAprComoNova('42');
    assert.equal(campo('aprForm_id').value, '');
    assert.equal(sandbox.aprRiscosForm[0].p_puro, 4);
    assert.equal(sandbox.aprRiscosForm[0].s_puro, 5);
    assert.equal(sandbox.aprRiscosForm[0].p_residual, 2);
    assert.equal(sandbox.aprRiscosForm[0].s_residual, 4);
    assert.match(sandbox.aprRiscosForm[0].medidas_prevencao, /escoramento/);
    assert.equal(sandbox.allAprRegistros.find(item => item.id === '42').riscos[0].s_residual, 4);
}

function provarQueOModuloSubstituiONucleo() {
    const inicio = nucleo.indexOf('function inferirPsApr(');
    const fim = nucleo.indexOf('function inserirPacoteRiscosDaBiblioteca(');
    assert.ok(inicio > 0 && fim > inicio);
    const antigo = nucleo.slice(inicio, fim);
    const contexto = {
        console,
        setTimeout,
        clearTimeout,
        escapeHTML: valor => String(valor == null ? '' : valor),
        renderRiscosAprForm() {},
        aprRiscosForm: [],
        document: {
            getElementById: id => campo(id),
            querySelectorAll: () => []
        }
    };
    contexto.window = contexto;
    vm.createContext(contexto);
    vm.runInContext(antigo, contexto, { filename: 'dashboard.js#nota-antiga' });

    const queda = contexto.inferirPsApr('trabalho', 'queda de altura', 'queda', '');
    assert.equal(queda.pPuro, 3);
    assert.equal(queda.sPuro, 4);
    assert.equal(queda.pResidual, 1);
    assert.equal(queda.sResidual, 3);
    const morte = contexto.inferirPsApr('', 'morte', '', '');
    assert.equal(morte.pPuro, 3);
    assert.equal(morte.sPuro, 5);
    assert.equal(morte.pResidual, 1);
    assert.equal(morte.sResidual, 3);
    const semPalavra = contexto.inferirPsApr('transporte', 'caixa', 'manuseio', 'carga');
    assert.equal(semPalavra.pPuro, 3);
    assert.equal(semPalavra.sPuro, 3);
    assert.equal(semPalavra.pResidual, 1);
    assert.equal(semPalavra.sResidual, 2);

    contexto.aprRiscosForm = [{
        passo_tarefa: 'trabalho em altura',
        perigo_fonte: 'queda de altura',
        evento_risco: 'queda',
        danos_provaveis: 'fratura',
        p_puro: '',
        s_puro: '',
        medidas_prevencao: 'cinto',
        p_residual: '',
        s_residual: ''
    }];
    contexto.autoCalibrarTodosRiscosApr();
    assert.equal(contexto.aprRiscosForm[0].p_puro, 3);
    assert.equal(contexto.aprRiscosForm[0].s_puro, 4);
    assert.equal(contexto.aprRiscosForm[0].p_residual, 1);
    assert.equal(contexto.aprRiscosForm[0].s_residual, 3);

    contexto.aprRiscosForm[0].p_puro = '3';
    contexto.aprRiscosForm[0].s_puro = '4';
    contexto.aprRiscosForm[0].p_residual = '3';
    contexto.aprRiscosForm[0].s_residual = '5';
    contexto.onMudarPuroApr(0, 'p_puro', '3');
    assert.equal(Number(contexto.aprRiscosForm[0].p_residual), 1);
    assert.equal(Number(contexto.aprRiscosForm[0].s_residual), 3);

    vm.runInContext(codigo, contexto, { filename: 'apr_cipa.js' });
    contexto.aprRiscosForm = [{
        passo_tarefa: 'trabalho em altura',
        perigo_fonte: 'queda de altura',
        evento_risco: 'queda',
        danos_provaveis: 'fratura',
        p_puro: '2',
        s_puro: '2',
        medidas_prevencao: 'cinto',
        p_residual: '4',
        s_residual: '5'
    }];
    contexto.autoCalibrarTodosRiscosApr();
    contexto.autoCalibrarRiscoIndividual(0);
    contexto.onMudarPuroApr(0, 'p_puro', '3');
    assert.equal(contexto.aprRiscosForm[0].p_puro, '3');
    assert.equal(contexto.aprRiscosForm[0].s_puro, '2');
    assert.equal(contexto.aprRiscosForm[0].p_residual, '4');
    assert.equal(contexto.aprRiscosForm[0].s_residual, '5');
    assert.equal(campo('aprFormStatus').textContent, 'A probabilidade e a gravidade ficam com o engenheiro.');
}

provarQueOModuloSubstituiONucleo();
provarGravacao().then(() => {
    console.log('apr_nota_manual.test.cjs: a nota da APR permanece com o engenheiro');
}).catch(erro => {
    console.error(erro);
    process.exitCode = 1;
});
