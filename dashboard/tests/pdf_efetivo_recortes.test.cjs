const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const painel = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(painel, 'modules', 'ghe_os.js'), 'utf8');
const core = fs.readFileSync(path.join(painel, 'dashboard.js'), 'utf8');

function extrair(texto, nome) {
    const m = texto.match(new RegExp('function ' + nome + '\\([^]*?\\n\\}'));
    assert.ok(m, 'função não encontrada: ' + nome);
    return m[0];
}

const iguais = [
    'gerarPdfEfetivo',
    'popularFiltrosRelatorioEquipe',
    'descreverRecorteRelatorioEquipe',
    'atualizarPreviaRelatorioEquipe'
];
for (const nome of iguais) {
    assert.equal(extrair(src, nome), extrair(core, nome), nome + ' divergiu entre núcleo e módulo');
}
assert.notEqual(
    extrair(src, 'imprimirRelatorioEquipeEncarregado'),
    extrair(core, 'imprimirRelatorioEquipeEncarregado'),
    'a diferença de férias do módulo não pode ser apagada'
);
assert.match(extrair(src, 'imprimirRelatorioEquipeEncarregado'), /obterResumoCiclosFeriasColab/);
assert.doesNotMatch(extrair(core, 'imprimirRelatorioEquipeEncarregado'), /obterResumoCiclosFeriasColab/);

function montar(origem) {
    const els = {};
    function campo(id, value = '') {
        return els[id] = { value, style: {}, checked: true, textContent: '', innerHTML: '' };
    }
    campo('efetivoPdfCard').style.display = 'none';
    campo('efetivoSearchInput');
    campo('filtroEfetivoSituacao', 'ativos');
    campo('efetivoPdfStatus');
    campo('relEquipeFiltroLider');
    campo('relEquipeFiltroSetor');
    campo('relEquipeFiltroSituacao', 'ativos');
    campo('relEquipePreviaTexto');
    campo('relEquipePreviaBadge');
    campo('modalRelatorioEquipeEncarregado');
    const contexto = vm.createContext({
        document: {
            getElementById: id => els[id] || null,
            querySelectorAll: seletor => {
                if (seletor === '.efetivoPdfColunaCheckbox:checked') {
                    return (contexto.colunasMarcadas || []).map(valor => ({ value: valor }));
                }
                return [];
            }
        },
        allEfetivo: [],
        colaboradorEstaAtivo: item => item.status === 'ATIVO',
        colaboradorEhTerceiro: item => !!item.pj_empresa,
        escapeHTML: valor => String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
        EMPRESA_INFO: { razaoSocial: 'Empresa fictícia' },
        efetivoPdfStatusFiltro: 'ativos',
        EFETIVO_PDF_COLUNAS: [{ id: 'nome', label: 'Nome', get: item => item.nome }],
        EFETIVO_PDF_COLUNAS_PADRAO: new Set(['nome']),
        obterAsoColaboradorRelatorio: () => ({ status: 'sem_data', dataVencFmt: 'Não Informado' }),
        alert: msg => { contexto.alerta = msg; },
        abrirDocumentoHtmlParaImpressao: (html, titulo) => {
            contexto.html = html;
            contexto.titulo = titulo;
            contexto.aberturas++;
        },
        aberturas: 0,
        colunasMarcadas: [],
        els
    });
    contexto.window = contexto;
    const nomes = [
        'obterEfetivoFiltrado',
        'gerarPdfEfetivo',
        'popularFiltrosRelatorioEquipe',
        'obterListaEquipeFiltrada',
        'descreverRecorteRelatorioEquipe',
        'atualizarPreviaRelatorioEquipe',
        'imprimirRelatorioEquipeEncarregado',
        'aoMudarLiderRelatorioEquipe',
        'fecharModalRelatorioEquipeEncarregado'
    ];
    vm.runInContext(nomes.map(nome => extrair(origem, nome)).join('\n'), contexto);
    contexto.els = els;
    return contexto;
}

function assinatura(html) {
    const marca = 'class="secao-assinaturas"';
    const inicio = String(html).lastIndexOf(marca);
    assert.ok(inicio >= 0, 'bloco de assinatura ausente');
    return String(html).slice(inicio);
}

for (const origem of [src, core]) {
    const proprio = { id: '1', nome: 'ALFA PROPRIO', status: 'ATIVO', funcao: 'PEDREIRO', setor: 'A' };
    const terceiro = { id: '2', nome: 'BETA TERCEIRO', status: 'ATIVO', funcao: 'CONSULTOR', pj_empresa: 'PJ', setor: 'B' };
    const c = montar(origem);
    c.allEfetivo = [proprio, terceiro];

    if (origem === src) assert.equal(c.obterEfetivoFiltrado().length, 1);
    c.gerarPdfEfetivo();
    assert.equal(c.aberturas, 1);
    assert.match(c.html, /ALFA PROPRIO/);
    assert.doesNotMatch(c.html, /BETA TERCEIRO/);
    assert.match(c.html, /efetivo próprio, sem terceiros\/PJ/);
    assert.match(c.html, /situação da tela/);

    c.els.efetivoSearchInput.value = 'ALFA';
    c.gerarPdfEfetivo();
    assert.match(c.titulo, /busca "ALFA"/);
    assert.doesNotMatch(c.html, /BETA TERCEIRO/);

    c.els.efetivoPdfCard.style.display = 'block';
    c.efetivoPdfStatusFiltro = 'completo';
    c.colunasMarcadas = ['nome'];
    const antesBusca = c.aberturas;
    c.gerarPdfEfetivo();
    assert.equal(c.aberturas, antesBusca + 1);
    assert.match(c.titulo, /busca "ALFA"/);
    assert.match(c.titulo, /situação escolhida na personalização/);
    assert.match(c.html, /Completo \(Ativos \+ Demitidos\)/);
    assert.doesNotMatch(c.html, /BETA TERCEIRO/);

    c.colunasMarcadas = [];
    const antesVazio = c.aberturas;
    c.gerarPdfEfetivo();
    assert.equal(c.aberturas, antesVazio);
    assert.match(c.alerta, /pelo menos uma coluna/);

    c.els.efetivoPdfCard.style.display = 'none';
    c.els.efetivoSearchInput.value = 'ZZZ';
    c.gerarPdfEfetivo();
    assert.equal(c.aberturas, antesVazio);
    assert.match(c.alerta, /Nenhum colaborador/);

    c.allEfetivo = [proprio, terceiro];
    c.els.relEquipeFiltroLider.value = '';
    c.els.relEquipeFiltroSetor.value = 'A';
    c.imprimirRelatorioEquipeEncarregado();
    assert.doesNotMatch(c.titulo, /Todas as Frentes/);
    assert.match(c.titulo, /Setor: A/);
    assert.match(c.titulo, /Ativos/);
    assert.match(c.html, /ALFA PROPRIO/);
    assert.doesNotMatch(c.html, /BETA TERCEIRO/);

    c.els.relEquipeFiltroSetor.value = '';
    c.imprimirRelatorioEquipeEncarregado();
    assert.match(c.titulo, /Todas as Frentes/);
    assert.match(assinatura(c.html), /Assinatura da Liderança da Frente de Serviço/);

    c.atualizarPreviaRelatorioEquipe();
    assert.match(c.els.relEquipePreviaTexto.innerHTML, /sem data de ASO/);
    assert.doesNotMatch(c.els.relEquipePreviaTexto.innerHTML, /ASOs em dia/);
    assert.match(c.els.relEquipePreviaTexto.innerHTML, /Situação: Ativos/);
    assert.match(c.els.relEquipePreviaTexto.innerHTML, /Efetivo geral de todas as frentes/);

    c.obterAsoColaboradorRelatorio = () => ({ status: 'valido', dataVencFmt: '01/01/2030' });
    c.atualizarPreviaRelatorioEquipe();
    assert.match(c.els.relEquipePreviaTexto.innerHTML, /ASOs em dia/);

    c.els.relEquipeFiltroSetor.value = 'A';
    c.atualizarPreviaRelatorioEquipe();
    assert.doesNotMatch(c.els.relEquipePreviaTexto.innerHTML, /Efetivo geral de todas as frentes/);
    assert.match(c.els.relEquipePreviaTexto.innerHTML, /Setor: A/);

    const joao = { id: '10', nome: 'JOAO SILVA', status: 'ATIVO', funcao: 'ENCARREGADO', responsavel: 'JOAO SILVA', setor: 'A' };
    const ana = { id: '11', nome: 'ANA SUPERVISORA', status: 'ATIVO', funcao: 'SUPERVISOR', responsavel: 'JOAO SILVA', setor: 'A' };
    c.allEfetivo = [joao, ana];
    c.popularFiltrosRelatorioEquipe();
    assert.match(c.els.relEquipeFiltroLider.innerHTML, /JOAO SILVA — JOAO SILVA/);
    assert.doesNotMatch(c.els.relEquipeFiltroLider.innerHTML, /JOAO SILVA — ANA/);

    c.els.relEquipeFiltroLider.value = 'JOAO SILVA';
    c.els.relEquipeFiltroSetor.value = '';
    c.imprimirRelatorioEquipeEncarregado();
    assert.match(assinatura(c.html), /<b>JOAO SILVA<\/b>/);
    assert.doesNotMatch(assinatura(c.html), /ANA SUPERVISORA/);

    c.els.relEquipeFiltroLider.value = 'NOME:JOAO SILVA';
    c.imprimirRelatorioEquipeEncarregado();
    assert.match(assinatura(c.html), /<b>JOAO SILVA<\/b>/);

    c.allEfetivo = [
        joao,
        { ...joao, id: '12', nome: 'JOAO SILVA', funcao: 'ENCARREGADO' },
        ana
    ];
    c.els.relEquipeFiltroLider.value = 'JOAO SILVA';
    c.imprimirRelatorioEquipeEncarregado();
    assert.match(assinatura(c.html), /Assinatura da Liderança da Frente de Serviço/);
    assert.doesNotMatch(assinatura(c.html), /<b>JOAO SILVA<\/b>/);
    assert.doesNotMatch(assinatura(c.html), /ANA SUPERVISORA/);

    c.allEfetivo = [
        { id: '20', nome: 'CARLOS LIMA', status: 'ATIVO', funcao: 'SUPERVISOR', responsavel: 'FRENTE NORTE', setor: 'A' }
    ];
    c.els.relEquipeFiltroLider.value = 'FRENTE NORTE';
    c.imprimirRelatorioEquipeEncarregado();
    assert.match(c.titulo, /FRENTE NORTE/);
    assert.doesNotMatch(c.titulo, /Todas as Frentes/);
    assert.match(assinatura(c.html), /Assinatura da Liderança da Frente de Serviço/);
    assert.doesNotMatch(assinatura(c.html), /CARLOS LIMA/);

    c.allEfetivo.push({ ...joao, id: '99', nome: 'JOAO SILVA JUNIOR', responsavel: 'JOAO' });
    c.els.relEquipeFiltroLider.value = 'JOAO SILVA';
    assert.equal(c.obterListaEquipeFiltrada().length, 0, 'nomes e responsáveis parciais não devem vazar para equipe');
    c.els.relEquipeFiltroLider.value = 'FRENTE NORTE';
    c.els.relEquipeFiltroSetor.value = '<img src=x onerror=alert(1)>';
    c.allEfetivo[0].setor = c.els.relEquipeFiltroSetor.value;
    c.imprimirRelatorioEquipeEncarregado();
    assert.doesNotMatch(c.html, /<img src=x/);
    assert.match(c.html, /&lt;IMG SRC=X/);
    c.els.relEquipeFiltroSetor.value = '';
    c.els.relEquipeFiltroLider.value = 'INEXISTENTE';
    const antesImpressao = c.aberturas;
    c.imprimirRelatorioEquipeEncarregado();
    assert.equal(c.aberturas, antesImpressao);

    c.els.relEquipeFiltroLider.value = 'JOAO SILVA';
    c.allEfetivo = [joao, ana];
    c.aoMudarLiderRelatorioEquipe();
    assert.equal(c.els.relEquipePreviaBadge.textContent, '2 colab.');
    c.fecharModalRelatorioEquipeEncarregado();
    assert.equal(c.els.modalRelatorioEquipeEncarregado.style.display, 'none');
    assert.equal(c.aberturas, antesImpressao);
}

const html = fs.readFileSync(path.join(painel, 'index.html'), 'utf8');
assert.match(html, /dashboard\.js\?v=303\.10/);
assert.match(html, /modules\/ghe_os\.js\?v=303\.4/);
assert.match(html, /sem setor escolhido/);

console.log('pdf_efetivo_recortes: núcleo e módulo aprovados');
