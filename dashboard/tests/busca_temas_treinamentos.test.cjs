const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(raiz, 'dashboard', 'index.html'), 'utf8');
const codigoTrein = fs.readFileSync(path.join(raiz, 'dashboard', 'modules', 'treinamentos_ddsma.js'), 'utf8');
const codigoPgr = fs.readFileSync(path.join(raiz, 'dashboard', 'modules', 'ergonomia_periculosidade_pgr.js'), 'utf8');

function criarAmbiente() {
    const elements = new Map();
    function makeEl(id, tag = 'div') {
        const el = {
            id,
            tagName: tag.toUpperCase(),
            value: '',
            checked: true,
            disabled: false,
            textContent: '',
            _innerHTML: '',
            style: { display: '' },
            children: [],
            classList: {
                _set: new Set(),
                toggle(cls, force) {
                    if (force === undefined) {
                        if (this._set.has(cls)) this._set.delete(cls);
                        else this._set.add(cls);
                    } else if (force) this._set.add(cls);
                    else this._set.delete(cls);
                },
                contains(cls) { return this._set.has(cls); }
            },
            appendChild(child) { this.children.push(child); },
            focus() {}
        };
        Object.defineProperty(el, 'innerHTML', {
            get() { return this._innerHTML; },
            set(v) {
                this._innerHTML = String(v);
                if (v === '') {
                    this.children = [];
                } else {
                    const opts = [];
                    const re = /<option\s+value="([^"]*)">([\s\S]*?)<\/option>/g;
                    let m;
                    while ((m = re.exec(this._innerHTML)) !== null) {
                        opts.push({ value: m[1], textContent: m[2] });
                    }
                    if (opts.length > 0) {
                        this.children = opts;
                        if (!opts.some(o => o.value === this.value)) {
                            this.value = opts[0].value;
                        }
                    }
                }
            }
        });
        elements.set(id, el);
        return el;
    }

    [
        'modalSugestaoTemasPat', 'modalSugestaoMesAlvo', 'modalSugestaoBuscaInput',
        'btnSugFiltro-recomendados', 'btnSugFiltro-ineditos', 'btnSugFiltro-liberados',
        'btnSugFiltro-bloqueados', 'btnSugFiltro-todos', 'conteudoSugestoesTemasModal',
        'modalAdicionarAcaoPat', 'patAdd_mesIdx', 'patAddModalTitulo', 'patAdd_statusMsg',
        'patAdd_data', 'patAdd_atalhosDatas', 'patAdd_diaSemanaBadge',
        'patAdd_buscaTreinamento', 'patAdd_resultadosRapidos', 'patAdd_treinamento',
        'patAdd_contagemTemas', 'patAdd_carenciaFeedback',
        'modalReprogramarCronograma', 'reprog_itemId', 'reprog_temaNome', 'reprog_dataAtualInfo',
        'reprog_novaData', 'reprog_atalhosDatas', 'reprog_substitutoTemaSelect',
        'reprog_buscaSubstitutoTema', 'reprog_contagemTemas', 'reprog_statusMsg',
        'reprog_painelDestino', 'reprog_btnAcaoPrincipal', 'reprog_diaSemanaBadge',
        'modalTreinamentoRegra', 'modalTreinamentoRegraTitulo', 'formRegra_btnExcluir',
        'formRegra_statusMsg', 'formRegra_id', 'formRegra_tipo', 'formRegra_alvoGhe',
        'formRegra_alvoFuncao', 'formRegra_alvoColaborador', 'formRegra_treinamentoCod',
        'formRegra_buscaTreinamento', 'formRegra_treinamentoInfo', 'formRegra_periodicidade',
        'formRegra_obrigatorioAdmissao', 'formRegra_ativo', 'formRegra_alvoTodosNotice',
        'formRegra_alvoLabel'
    ].forEach(id => makeEl(id));

    const sandbox = {
        window: {},
        document: {
            getElementById: (id) => elements.get(id) || null,
            createElement: (tag) => ({ tagName: tag.toUpperCase(), value: '', textContent: '', style: {} }),
            addEventListener: () => {}
        },
        console,
        Date,
        Math,
        Set,
        Map,
        Promise,
        setTimeout: () => 1,
        clearTimeout: () => {},
        escapeHTML: (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
        parseLocalDate: (iso) => {
            const [y, m, d] = String(iso).split('-').map(Number);
            return new Date(y, (m || 1) - 1, d || 1);
        },
        formatSimpleDate: (iso) => iso ? iso.split('-').reverse().join('/') : '',
        colaboradorEstaAtivo: () => true,
        supabaseFetchCacheado: async () => []
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigoTrein, sandbox, { filename: 'dashboard/modules/treinamentos_ddsma.js' });
    vm.runInContext(codigoPgr, sandbox, { filename: 'dashboard/modules/ergonomia_periculosidade_pgr.js' });

    const catalogoMock = [
        { id: '13', nome: 'NR.17 - TRANSPORTE MANUAL DE CARGA', carga_horaria: 2, meses_validade: 12, objetivo: 'Ergonomia no transporte manual' },
        { id: '53', nome: "INSPEÇÃO DE EPI'S", carga_horaria: 2, meses_validade: 12, objetivo: 'Conservação e higienização de equipamentos' },
        { id: '79', nome: 'DIREÇÃO DEFENSIVA - (LIMITES DE VELOCIDADE DENTRO DA OBRA E VIAS DE ACESSO)', carga_horaria: 2, meses_validade: 24, objetivo: 'Prevenção de sinistros viários' },
        { id: '133', nome: 'UTILIZAÇÃO DO PROTETOR SOLAR', carga_horaria: 2, meses_validade: 12, objetivo: 'Prevenção contra radiação solar UV' },
        { id: '193', nome: 'DIA NACIONAL DE DOAÇÃO DE ÓRGÃOS', carga_horaria: 2, objetivo: 'Conscientização em saúde pública' }
    ];
    for (let i = 200; i < 395; i++) {
        catalogoMock.push({ id: String(i), nome: `TEMA OPERACIONAL EXTRA ${i}`, carga_horaria: 2, objetivo: 'Capacitação operacional' });
    }

    sandbox.allTreinamentosCatalogo = catalogoMock;
    sandbox.allTreinamentosCronograma = [
        { id: 'crono_1', data_prevista: '2026-11-10', treinamento_cod: '133', status: 'planejado' }
    ];
    sandbox.allDdsRealizados = [];
    sandbox.allDdsTemasCronograma = [];
    sandbox.allTreinamentosRealizados = [];
    sandbox.allGheCatalogo = [];
    sandbox.allEfetivo = [];
    sandbox.allTreinamentosRegras = [];

    return { sandbox, elements, catalogoMock };
}

test('HTML declara campos de pesquisa nos 4 modais de seleção de temas', () => {
    assert.match(html, /id="modalSugestaoBuscaInput"/);
    assert.match(html, /id="btnSugFiltro-todos"/);
    assert.match(html, /id="patAdd_buscaTreinamento"/);
    assert.match(html, /id="patAdd_resultadosRapidos"/);
    assert.match(html, /id="reprog_buscaSubstitutoTema"/);
    assert.match(html, /id="formRegra_buscaTreinamento"/);
});

test('Busca textual aceita código, palavras sem acento, apóstrofo e variações de NR', () => {
    const { sandbox } = criarAmbiente();
    assert.equal(sandbox.correspondeBuscaTemaPat(['193', 'DIA NACIONAL DE DOAÇÃO DE ÓRGÃOS'], 'doacao orgaos'), true);
    assert.equal(sandbox.correspondeBuscaTemaPat(['13', 'NR.17 - TRANSPORTE MANUAL DE CARGA'], 'nr-17 carga'), true);
    assert.equal(sandbox.correspondeBuscaTemaPat(['13', 'NR.17 - TRANSPORTE MANUAL DE CARGA'], 'nr17'), true);
    assert.equal(sandbox.correspondeBuscaTemaPat(['53', "INSPEÇÃO DE EPI'S"], 'inspecao epis'), true);
    assert.equal(sandbox.correspondeBuscaTemaPat(['79', 'DIREÇÃO DEFENSIVA'], '79 direcao'), true);
    assert.equal(sandbox.correspondeBuscaTemaPat(['79', 'DIREÇÃO DEFENSIVA'], 'soldagem'), false);
});

test('Assistente de Temas renderiza mais de 60 itens, filtra sem acento e sugere busca em todo o catálogo', () => {
    const { sandbox, elements } = criarAmbiente();
    sandbox.abrirModalSugestaoTemas(11);
    const htmlInicial = elements.get('conteudoSugestoesTemasModal').innerHTML;
    assert.ok(htmlInicial.includes('TEMA OPERACIONAL EXTRA 394'));

    elements.get('modalSugestaoBuscaInput').value = 'doacao orgaos';
    sandbox.renderSugestoesTemasModal();
    const htmlFiltrado = elements.get('conteudoSugestoesTemasModal').innerHTML;
    assert.ok(htmlFiltrado.includes('[193] DIA NACIONAL DE DOAÇÃO DE ÓRGÃOS'));
    assert.ok(!htmlFiltrado.includes('DIREÇÃO DEFENSIVA'));

    sandbox.filtrarAbaSugestaoTemas('bloqueados');
    const htmlCrossTab = elements.get('conteudoSugestoesTemasModal').innerHTML;
    assert.ok(htmlCrossTab.includes('Todo o Catálogo'));

    sandbox.filtrarAbaSugestaoTemas('todos');
    assert.ok(elements.get('conteudoSugestoesTemasModal').innerHTML.includes('[193] DIA NACIONAL DE DOAÇÃO DE ÓRGÃOS'));
});

test('Agendamento PAT, Reprogramação e Regras NR-01 filtram cursos preservando regras de negócio', async () => {
    const { sandbox, elements, catalogoMock } = criarAmbiente();

    sandbox.abrirModalAdicionarAcaoPat(10); // Novembro (133 já está agendado no mês)
    assert.ok(!elements.get('patAdd_treinamento').innerHTML.includes('[133]'));
    sandbox.filtrarPatAddTreinamentos('nr 17');
    assert.equal(elements.get('patAdd_treinamento').value, '13');
    assert.equal(elements.get('patAdd_resultadosRapidos').style.display, 'block');
    sandbox.selecionarPatAddTreinamentoRapido('13');
    assert.equal(elements.get('patAdd_resultadosRapidos').style.display, 'none');

    sandbox.abrirModalReprogramarCronograma('crono_1');
    sandbox.filtrarReprogSubstitutoTema('direcao 79');
    assert.equal(elements.get('reprog_substitutoTemaSelect').value, '79');

    await sandbox.abrirModalNovaRegra();
    assert.equal(elements.get('formRegra_treinamentoCod').value, '');
    sandbox.filtrarRegraTreinamentoSelect('epis');
    assert.equal(elements.get('formRegra_treinamentoCod').value, '53');
    sandbox.limparBuscaRegraTreinamento();
    assert.equal(elements.get('formRegra_treinamentoCod').value, '53');
    assert.equal(elements.get('formRegra_treinamentoCod').children.length, catalogoMock.length + 1);
});

test('Desempenho antitravamento: 200 cursos x 10.000 registros históricos não travam na digitação', () => {
    const { sandbox, elements } = criarAmbiente();
    const ddsMassa = [];
    const treinMassa = [];
    for (let i = 0; i < 5000; i++) {
        ddsMassa.push({ data_dds: '2026-08-15', tema: `TEMA OPERACIONAL EXTRA ${200 + (i % 100)}`, frente_responsavel: 'EB-01' });
        treinMassa.push({ data_treinamento: '2026-07-10', treinamento_nome: `TEMA OPERACIONAL EXTRA ${200 + (i % 150)}` });
    }
    sandbox.allDdsRealizados = ddsMassa;
    sandbox.allTreinamentosRealizados = treinMassa;

    // 1ª abertura constrói índice memoizado; 10 teclas consecutivas devem rodar instantaneamente
    sandbox.abrirModalSugestaoTemas(10);
    sandbox.abrirModalAdicionarAcaoPat(10);

    const inicio = Date.now();
    const consultas = ['d', 'di', 'dir', 'dire', 'direc', 'direca', 'direcao', 'nr', 'nr 17', '193'];
    for (const q of consultas) {
        elements.get('modalSugestaoBuscaInput').value = q;
        sandbox.renderSugestoesTemasModal();
        sandbox.filtrarPatAddTreinamentos(q);
    }
    const duracaoMs = Date.now() - inicio;
    assert.ok(duracaoMs < 250, `10 pesquisas consecutivas sobre 10.000 registros levaram ${duracaoMs}ms (esperado < 250ms)`);
});
