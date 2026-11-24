const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const painel = path.resolve(__dirname, '..');
const codigo = fs.readFileSync(path.join(painel, 'modules', 'apr_cipa.js'), 'utf8');
const html = fs.readFileSync(path.join(painel, 'index.html'), 'utf8');
const nucleo = fs.readFileSync(path.join(painel, 'dashboard.js'), 'utf8');

assert.match(html, /modules\/apr_cipa\.js\?v=299/);
assert.match(html, /id="aprFormAvulsosContainer"/);
assert.match(html, />Colaborador avulso</);
assert.match(html, /Nome de quem vai na atividade e não está na equipe\. Ex\.: motorista emprestado\./);
assert.match(html, /id="aprForm_riscoNovo"/);
assert.match(html, />Novo risco identificado</);
assert.match(html, /Escreva o risco que ainda não está na APR\. Ele fica aguardando revisão\./);
assert.match(html, /id="aprForm_riscoNovoAviso"[^>]*>Aguardando revisão</);
const impressaoApr = codigo.slice(codigo.indexOf('function imprimirApr('), codigo.indexOf('// CIPA (Comissão Interna'));
assert.match(impressaoApr, /NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO/);
assert.match(impressaoApr, /risco_novo_identificado/);
assert.match(impressaoApr, /MIN_LINHAS_RISCO_NOVO = 6/);
assert.match(impressaoApr, /ALTURA_LINHA_RISCO_NOVO = 32/);
assert.match(impressaoApr, /Math\.max\(MIN_LINHAS_RISCO_NOVO, linhasTextoRiscoNovo\)/);
assert.match(impressaoApr, /line-height:32px/);
assert.match(impressaoApr, /repeating-linear-gradient/);
assert.doesNotMatch(impressaoApr.slice(impressaoApr.indexOf('const linhasRisco'), impressaoApr.indexOf('const ALTURA_LINHA_EQUIPE')), /risco_novo_identificado/);
assert.doesNotMatch(codigo.slice(codigo.indexOf('var BIBLIOTECA_RISCOS_OBRA'), codigo.indexOf('function inserirPacoteRiscosDaBiblioteca')), /risco_novo_identificado/);
const migracaoRiscoNovo = fs.readFileSync(path.join(painel, '..', 'supabase', 'migrations', '20261123_apr_risco_novo_identificado.sql'), 'utf8');
assert.match(migracaoRiscoNovo, /ADD COLUMN IF NOT EXISTS risco_novo_identificado TEXT/);
assert.doesNotMatch(migracaoRiscoNovo, /POLICY|ROW LEVEL|GRANT|REVOKE/i);
assert.match(html, /modules\/ia_aprendizado\.js\?v=5/);
assert.doesNotMatch(html, /ia_aprendizado\.js\?v=[1234]\b/);
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
    assert.equal(gravacoes[0].linhas[0].risco_novo_identificado, null);
    assert.equal(gravacoes[0].linhas[0].riscos.length, 1);

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
        }],
        risco_novo_identificado: 'Buraco sem sinalização na lateral da vala'
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
    assert.match(htmlImpresso, /NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO/);
    assert.match(htmlImpresso, /Buraco sem sinalização na lateral da vala/);
    assert.match(htmlImpresso, /min-height:192px/);
    assert.match(htmlImpresso, /line-height:32px/);
    const matriz42 = htmlImpresso.slice(htmlImpresso.indexOf('<tbody>'), htmlImpresso.indexOf('NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE'));
    assert.doesNotMatch(matriz42, /Buraco sem sinalização na lateral da vala/);
    const depoisDaFaixa42 = htmlImpresso.split('NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO').slice(1).join('');
    assert.doesNotMatch(depoisDaFaixa42.slice(depoisDaFaixa42.indexOf('EQUIPAMENTOS DE PROTEÇÃO')), /Buraco sem sinalização na lateral da vala/);
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
    assert.equal(campo('aprForm_riscoNovo').value, 'Buraco sem sinalização na lateral da vala');
    assert.equal(campo('aprForm_riscoNovoAviso').style.display, 'block');
    assert.equal(sandbox.aprRiscosForm.some(item => JSON.stringify(item).includes('Buraco sem sinalização')), false);
    assert.equal(sandbox.allAprRegistros.find(item => item.id === '42').riscos[0].s_residual, 4);

    const frase = 'Cabo solto na borda da escavação';
    sandbox.confirm = () => true;
    sandbox.aprRiscosForm = [{
        passo_tarefa: 'escavação',
        perigo_fonte: 'talude',
        evento_risco: 'desabamento',
        danos_provaveis: 'soterramento',
        p_puro: '',
        s_puro: '',
        medidas_prevencao: 'escoramento',
        p_residual: '',
        s_residual: '',
        responsavel: 'encarregado'
    }];
    campo('aprForm_riscoNovo').value = '   ';
    preencherMinimo('903', 'Campo de risco novo vazio');
    await sandbox.salvarApr();
    assert.equal(gravacoes.at(-1).linhas[0].id, '903');
    assert.equal(gravacoes.at(-1).linhas[0].risco_novo_identificado, null);
    assert.equal(gravacoes.at(-1).linhas[0].riscos.length, 1);

    campo('aprForm_riscoNovo').value = '  ' + frase + '  ';
    preencherMinimo('904', 'Risco escrito à mão');
    await sandbox.salvarApr();
    const salvo = gravacoes.at(-1).linhas[0];
    assert.equal(salvo.id, '904');
    assert.equal(salvo.risco_novo_identificado, frase);
    assert.equal(salvo.riscos.length, 1);
    assert.equal(JSON.stringify(salvo.riscos).includes(frase), false);
    sandbox.editarApr('904');
    assert.equal(campo('aprForm_id').value, '904');
    assert.equal(campo('aprForm_riscoNovo').value, frase);
    assert.equal(campo('aprForm_riscoNovoAviso').style.display, 'block');
    assert.equal(sandbox.aprRiscosForm.some(item => JSON.stringify(item).includes(frase)), false);

    sandbox.aprItemExpandidoId = '904';
    sandbox.renderAprHistoricoLista();
    const bloco = campo('listAprHistorico').innerHTML.split('APR 904')[1].split('APR ')[0];
    assert.match(bloco, /Cabo solto na borda da escavação/);
    assert.match(bloco, /Aguardando revisão/);
    const listaOficial = bloco.slice(bloco.indexOf('Riscos ('), bloco.indexOf('Novo risco identificado'));
    assert.doesNotMatch(listaOficial, /Cabo solto na borda da escavação/);

    let htmlReaberto = '';
    sandbox.Blob = class BlobReaberto {
        constructor(partes) { htmlReaberto = partes.join(''); }
    };
    sandbox.imprimirApr('904');
    assert.match(htmlReaberto, /desabamento/);
    assert.match(htmlReaberto, /NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO/);
    assert.match(htmlReaberto, /Cabo solto na borda da escavação/);
    assert.match(htmlReaberto, /min-height:192px/);
    assert.match(htmlReaberto, /line-height:32px/);
    const matriz904 = htmlReaberto.slice(htmlReaberto.indexOf('<tbody>'), htmlReaberto.indexOf('NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE'));
    assert.doesNotMatch(matriz904, /Cabo solto na borda da escavação/);
    const depoisDaFaixa904 = htmlReaberto.split('NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO').slice(1).join('');
    assert.doesNotMatch(depoisDaFaixa904.slice(depoisDaFaixa904.indexOf('EQUIPAMENTOS DE PROTEÇÃO')), /Cabo solto na borda da escavação/);

    let htmlVazio = '';
    sandbox.Blob = class BlobVazio {
        constructor(partes) { htmlVazio = partes.join(''); }
    };
    sandbox.imprimirApr('902');
    assert.match(htmlVazio, /NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE — AGUARDANDO REVISÃO/);
    assert.match(htmlVazio, /min-height:192px/);
    assert.match(htmlVazio, /class="faixa-risco-novo" style="min-height:192px;"><\/div>/);

    sandbox.allAprRegistros.push({
        id: '905',
        titulo: 'Texto longo',
        riscos: [{
            evento_risco: 'desabamento',
            medidas_prevencao: 'escoramento',
            p_puro: 1,
            s_puro: 1,
            p_residual: 1,
            s_residual: 1,
            responsavel: 'encarregado'
        }],
        risco_novo_identificado: 'linha 1\nlinha 2\nlinha 3\nlinha 4\nlinha 5\nlinha 6\nlinha 7'
    });
    let htmlLongo = '';
    sandbox.Blob = class BlobLongo {
        constructor(partes) { htmlLongo = partes.join(''); }
    };
    sandbox.imprimirApr('905');
    assert.match(htmlLongo, /min-height:224px/);
    assert.match(htmlLongo, /linha 1\nlinha 2\nlinha 3\nlinha 4\nlinha 5\nlinha 6\nlinha 7/);
    const matriz905 = htmlLongo.slice(htmlLongo.indexOf('<tbody>'), htmlLongo.indexOf('NOVO RISCO IDENTIFICADO PELO RESPONSÁVEL DA FRENTE'));
    assert.doesNotMatch(matriz905, /linha 7/);
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

function riscoMinimoAvulso() {
    return {
        passo_tarefa: 'transporte',
        perigo_fonte: 'veículo',
        evento_risco: 'desabamento',
        danos_provaveis: 'atropelamento',
        p_puro: '',
        s_puro: '',
        medidas_prevencao: 'isolamento',
        p_residual: '',
        s_residual: '',
        responsavel: 'encarregado'
    };
}

function prepararAprAvulso(numero, titulo) {
    campo('aprForm_id').value = '';
    campo('aprForm_numero').value = numero;
    campo('aprForm_dataEmissao').value = '2026-11-24';
    campo('aprForm_titulo').value = titulo;
    campo('aprForm_validadeDias').value = '15';
    campo('aprForm_validadeAte').value = '';
    campo('aprForm_riscoNovo').value = 'Buraco na via';
    campo('aprForm_responsavel').value = 'Frente Civil';
    sandbox.aprRiscosForm = [riscoMinimoAvulso()];
    sandbox.aprAvulsosForm = [];
}

function cienciaImpressa(htmlFolha) {
    const inicio = htmlFolha.indexOf('CIÊNCIA E TREINAMENTO DOS EXECUTANTES DA TAREFA');
    const fim = htmlFolha.indexOf('RESPONSÁVEIS PELA APROVAÇÃO');
    assert.ok(inicio > 0 && fim > inicio);
    return htmlFolha.slice(inicio, fim);
}

function capturarImpressaoApr(id) {
    let htmlFolha = '';
    sandbox.Blob = class BlobAvulso {
        constructor(partes) { htmlFolha = partes.join(''); }
    };
    sandbox.imprimirApr(id);
    return htmlFolha;
}

async function provarColaboradorAvulso() {
    const efetivo = [{ id: '101', nome: 'Servente da Civil', funcao: 'Servente', responsavel: 'Frente Civil' }];
    sandbox.allEfetivo = efetivo;
    sandbox.equipeDaFrente = () => [
        { matricula: '101', nome: 'Servente da Civil', funcao: 'Servente' },
        { matricula: '102', nome: 'Encarregado da Civil', funcao: 'Encarregado' }
    ];
    sandbox.confirm = () => { throw new Error('avulso não pede confirmação de nota'); };
    sandbox.setTimeout = () => {};
    sandbox.URL = { createObjectURL: () => 'blob:apr-avulso', revokeObjectURL() {} };
    sandbox.document.createElement = () => ({ href: '', target: '', rel: '', click() {} });
    sandbox.document.body = { appendChild() {}, removeChild() {} };

    prepararAprAvulso('910', 'Só a equipe');
    await sandbox.salvarApr();
    const soEquipe = gravacoes.at(-1).linhas[0];
    assert.equal(soEquipe.id, '910');
    assert.equal(soEquipe.observacoes, null);
    assert.equal(soEquipe.risco_novo_identificado, 'Buraco na via');
    assert.equal(JSON.stringify(soEquipe.riscos).includes('Servente da Civil'), false);
    const folhaSoEquipe = capturarImpressaoApr('910');
    const cienciaSoEquipe = cienciaImpressa(folhaSoEquipe);
    assert.match(cienciaSoEquipe, /Servente da Civil/);
    assert.match(cienciaSoEquipe, /Encarregado da Civil/);
    assert.equal(cienciaSoEquipe.indexOf('Servente da Civil') < cienciaSoEquipe.indexOf('Encarregado da Civil'), true);
    assert.doesNotMatch(cienciaSoEquipe, /Motorista Emprestado|Ajudante Emprestado/);
    assert.doesNotMatch(folhaSoEquipe.slice(folhaSoEquipe.indexOf('<tbody>'), folhaSoEquipe.indexOf('NOVO RISCO IDENTIFICADO')), /Servente da Civil/);

    sandbox.aprAvulsosForm = [
        { nome: '  ', matricula: '9', funcao: '' }
    ];
    const antesDoBloqueio = gravacoes.length;
    prepararAprAvulso('919', 'Nome obrigatório');
    sandbox.aprAvulsosForm = [{ nome: '   ', matricula: '9', funcao: '' }];
    await sandbox.salvarApr();
    assert.equal(gravacoes.length, antesDoBloqueio);
    assert.match(campo('aprFormStatus').textContent, /Informe o nome de cada colaborador avulso/);

    prepararAprAvulso('911', 'Equipe e dois avulsos');
    sandbox.aprAvulsosForm = [
        { nome: 'Quem Sai', matricula: '', funcao: '' },
        { nome: 'Motorista Emprestado', matricula: '555', funcao: 'Motorista' },
        { nome: 'Ajudante Emprestado', matricula: '', funcao: '' }
    ];
    sandbox.removerAvulsoAprForm(0);
    assert.deepEqual(sandbox.aprAvulsosForm.map(pessoa => pessoa.nome), ['Motorista Emprestado', 'Ajudante Emprestado']);
    campo('aprForm_id').value = '';
    sandbox.allAprRegistros = sandbox.allAprRegistros.filter(item => item.id !== '911');
    const notaAntiga = 'Nota da frente sobre o acesso.';
    sandbox.allAprRegistros.push({
        id: '911',
        titulo: 'Equipe e dois avulsos',
        observacoes: notaAntiga,
        riscos: [riscoMinimoAvulso()],
        risco_novo_identificado: 'texto antigo'
    });
    campo('aprForm_id').value = '911';
    campo('aprForm_numero').value = '911';
    await sandbox.salvarApr();
    const comAvulsos = gravacoes.at(-1).linhas[0];
    assert.equal(comAvulsos.id, '911');
    assert.equal(comAvulsos.risco_novo_identificado, 'Buraco na via');
    assert.equal(comAvulsos.riscos.length, 1);
    assert.equal(JSON.stringify(comAvulsos.riscos).includes('Motorista Emprestado'), false);
    assert.equal(JSON.stringify(comAvulsos.riscos).includes('Ajudante Emprestado'), false);
    assert.match(comAvulsos.observacoes, /Nota da frente sobre o acesso\./);
    assert.match(comAvulsos.observacoes, /\[\[apr_colaboradores_avulsos_v1\]\]/);
    assert.equal(comAvulsos.observacoes.includes('Quem Sai'), false);
    const lidos = sandbox.avulsosDoRegistroApr(comAvulsos);
    assert.equal(lidos.length, 2);
    assert.equal(lidos[0].nome, 'Motorista Emprestado');
    assert.equal(lidos[0].matricula, '555');
    assert.equal(lidos[0].funcao, 'Motorista');
    assert.equal(lidos[1].nome, 'Ajudante Emprestado');
    assert.equal(lidos[1].matricula, '');
    sandbox.editarApr('911');
    assert.equal(campo('aprForm_id').value, '911');
    assert.equal(sandbox.aprAvulsosForm.length, 2);
    assert.equal(sandbox.aprAvulsosForm[0].nome, 'Motorista Emprestado');
    assert.equal(sandbox.aprAvulsosForm[1].nome, 'Ajudante Emprestado');
    assert.equal(sandbox.aprRiscosForm.some(item => JSON.stringify(item).includes('Motorista Emprestado')), false);
    assert.equal(campo('aprForm_riscoNovo').value, 'Buraco na via');
    const folhaComAvulsos = capturarImpressaoApr('911');
    const cienciaAvulsos = cienciaImpressa(folhaComAvulsos);
    assert.match(cienciaAvulsos, /Servente da Civil/);
    assert.match(cienciaAvulsos, /Encarregado da Civil/);
    assert.match(cienciaAvulsos, /Motorista Emprestado/);
    assert.match(cienciaAvulsos, /Ajudante Emprestado/);
    assert.equal(cienciaAvulsos.indexOf('Encarregado da Civil') < cienciaAvulsos.indexOf('Motorista Emprestado'), true);
    assert.equal(cienciaAvulsos.indexOf('Motorista Emprestado') < cienciaAvulsos.indexOf('Ajudante Emprestado'), true);
    assert.match(cienciaAvulsos, /<td style="text-align:center;">555<\/td>\s*<td>Motorista Emprestado<\/td>\s*<td>Motorista<\/td>\s*<td><\/td>/);
    assert.match(cienciaAvulsos, /<td style="text-align:center;"><\/td>\s*<td>Ajudante Emprestado<\/td>\s*<td><\/td>\s*<td><\/td>/);
    const matriz911 = folhaComAvulsos.slice(folhaComAvulsos.indexOf('<tbody>'), folhaComAvulsos.indexOf('NOVO RISCO IDENTIFICADO'));
    assert.doesNotMatch(matriz911, /Motorista Emprestado|Ajudante Emprestado/);
    assert.match(folhaComAvulsos, /Buraco na via/);
    assert.match(folhaComAvulsos, /MIN_LINHAS|min-height:192px/);
    assert.equal((cienciaAvulsos.match(/Servente da Civil/g) || []).length, 1);
    assert.equal((cienciaAvulsos.match(/Encarregado da Civil/g) || []).length, 1);

    prepararAprAvulso('912', 'Avulso sem matrícula');
    sandbox.aprAvulsosForm = [{ nome: 'Motorista Emprestado', matricula: '', funcao: '' }];
    await sandbox.salvarApr();
    const semMatricula = gravacoes.at(-1).linhas[0];
    assert.equal(semMatricula.id, '912');
    assert.equal(sandbox.avulsosDoRegistroApr(semMatricula)[0].matricula, '');
    assert.equal(sandbox.avulsosDoRegistroApr(semMatricula)[0].funcao, '');
    assert.equal(JSON.stringify(semMatricula.riscos).includes('Motorista Emprestado'), false);
    sandbox.editarApr('912');
    assert.equal(sandbox.aprAvulsosForm.length, 1);
    assert.equal(sandbox.aprAvulsosForm[0].nome, 'Motorista Emprestado');
    assert.equal(sandbox.aprAvulsosForm[0].matricula, '');
    const folhaSemMatricula = capturarImpressaoApr('912');
    const cienciaSemMatricula = cienciaImpressa(folhaSemMatricula);
    assert.match(cienciaSemMatricula, /Servente da Civil/);
    assert.match(cienciaSemMatricula, /Encarregado da Civil/);
    assert.match(cienciaSemMatricula, /<td style="text-align:center;">03<\/td>\s*<td style="text-align:center;"><\/td>\s*<td>Motorista Emprestado<\/td>\s*<td><\/td>\s*<td><\/td>/);
    assert.equal(cienciaSemMatricula.indexOf('Encarregado da Civil') < cienciaSemMatricula.indexOf('Motorista Emprestado'), true);
    assert.doesNotMatch(folhaSemMatricula.slice(0, folhaSemMatricula.indexOf('CIÊNCIA E TREINAMENTO DOS EXECUTANTES')), /Motorista Emprestado/);
    assert.match(folhaSemMatricula, /min-height:192px/);
    assert.match(folhaSemMatricula, /Buraco na via/);

    sandbox.editarApr('911');
    sandbox.aprAvulsosForm = [];
    await sandbox.salvarApr();
    const semAvulsoDepois = gravacoes.at(-1).linhas[0];
    assert.equal(semAvulsoDepois.id, '911');
    assert.equal(semAvulsoDepois.observacoes, 'Nota da frente sobre o acesso.');
    assert.equal(sandbox.avulsosDoRegistroApr(semAvulsoDepois).length, 0);
    const folhaSemAvulsoDepois = capturarImpressaoApr('911');
    assert.doesNotMatch(cienciaImpressa(folhaSemAvulsoDepois), /Motorista Emprestado|Ajudante Emprestado/);
    assert.match(cienciaImpressa(folhaSemAvulsoDepois), /Servente da Civil/);
    assert.match(cienciaImpressa(folhaSemAvulsoDepois), /Encarregado da Civil/);

    sandbox.duplicarAprComoNova('912');
    assert.equal(sandbox.aprAvulsosForm.length, 0);
    assert.equal(campo('aprForm_id').value, '');

    assert.equal(sandbox.allEfetivo, efetivo);
    assert.equal(sandbox.allEfetivo.length, 1);
    assert.equal(sandbox.allEfetivo[0].nome, 'Servente da Civil');
    assert.equal(gravacoes.every(item => item.tabela === 'apr_registros'), true);
}

provarQueOModuloSubstituiONucleo();
provarGravacao().then(() => provarColaboradorAvulso()).then(() => {
    console.log('apr_nota_manual.test.cjs: a nota da APR permanece com o engenheiro');
}).catch(erro => {
    console.error(erro);
    process.exitCode = 1;
});
