const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const painel = path.resolve(__dirname, '..');
const codigo = fs.readFileSync(path.join(painel, 'modules', 'apr_cipa.js'), 'utf8');
const html = fs.readFileSync(path.join(painel, 'index.html'), 'utf8');
const nucleo = fs.readFileSync(path.join(painel, 'dashboard.js'), 'utf8');

assert.match(html, /modules\/apr_cipa\.js\?v=296/);
assert.doesNotMatch(html, /autoCalibrarTodosRiscosApr/);
assert.doesNotMatch(codigo, /Sugerir P\/S|Ajustar Automaticamente/);
assert.ok(html.indexOf('dashboard.js') < html.indexOf('modules/apr_cipa.js'), 'o módulo da APR carrega depois do núcleo');

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

console.log('apr_nota_manual.test.cjs: a nota da APR permanece com o engenheiro');
