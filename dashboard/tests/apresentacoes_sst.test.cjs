const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..', '..');
const painel = path.join(raiz, 'dashboard');
const html = fs.readFileSync(path.join(painel, 'index.html'), 'utf8');
const codigoApres = fs.readFileSync(path.join(painel, 'modules', 'apresentacoes_sst.js'), 'utf8');
const codigoIa = fs.readFileSync(path.join(painel, 'modules', 'ia_aprendizado.js'), 'utf8');
const codigoMapa = fs.readFileSync(path.join(painel, 'modules', 'ia_mapa_mental.js'), 'utf8');
const codigoNucleo = fs.readFileSync(path.join(painel, 'dashboard.js'), 'utf8');
const codigoEpi = fs.readFileSync(path.join(painel, 'modules', 'epi_estoque.js'), 'utf8');

function criarAmbienteIntegrado(opcoes = {}) {
    const store = opcoes.sharedStore || new Map();
    const elementos = new Map();
    const alertas = [];
    const impressoes = [];
    const paginasNavegadas = [];
    const keydownListeners = [];

    let sessaoAtual = opcoes.sessao !== undefined ? opcoes.sessao : {
        uid: 'uid_joao_76',
        matricula: '76',
        nome: 'João Everton',
        role: 'Admin',
        tipo: 'interno',
        validador_ia_sst: true
    };
    let podeGravar = opcoes.podeGravar !== undefined ? opcoes.podeGravar : true;
    let permitido = opcoes.permitido !== undefined ? opcoes.permitido : true;
    let falhaQuota = false;

    function obterEl(id) {
        if (!elementos.has(id)) {
            elementos.set(id, {
                id,
                value: '',
                innerHTML: '',
                textContent: '',
                checked: false,
                style: {},
                dataset: {},
                classList: {
                    add() {},
                    remove() {},
                    toggle() {},
                    contains(cls) { return cls === 'active'; }
                },
                select() {},
                focus() {},
                requestFullscreen() { this._fullscreen = true; }
            });
        }
        return elementos.get(id);
    }

    const localStorage = {
        getItem(k) { return store.has(k) ? store.get(k) : null; },
        setItem(k, v) {
            if (falhaQuota) {
                const err = new Error('QuotaExceededError');
                err.name = 'QuotaExceededError';
                throw err;
            }
            store.set(k, String(v));
        },
        removeItem(k) { store.delete(k); }
    };

    const gheSnapshotInicial = [
        {
            id: 'GHE-07',
            codigo: 'GHE-07',
            nome: 'Manutenção Civil, Estruturas e Trabalho em Altura',
            cargos: ['Servente', 'Carpinteiro', 'Encarregado de Campo', 'Motorista de Veículo Pesado'],
            riscos: [
                {
                    tipo_agente: 'Acidentes',
                    agente: 'Queda de diferença de nível (> 2,0 m) em talude e estrutura',
                    fonte_geradora: 'Andaime, escada e borda de canal/bueiro',
                    epi_recomendado: 'Cinto paraquedista com talabarte duplo e capacete com jugular',
                    epcs_recomendados: 'Linha de vida e guarda-corpo',
                    probabilidade: 3,
                    severidade: 5
                }
            ],
            agentes_risco: ['Queda de diferença de nível (> 2,0 m)', 'Projeção de partículas'],
            epis: ['Cinto paraquedista com talabarte duplo', 'Capacete com jugular', 'Perneira de segurança']
        }
    ];

    const catalogoSnapshotInicial = [
        {
            id: 'NR35-01',
            codigo: 'NR35-01',
            nome: 'NR-35 Trabalho em Altura — Operação e Resgate',
            carga_horaria: 8,
            meses_validade: 24,
            conteudo_programatico: 'Normas e regulamentos aplicáveis ao trabalho em altura; análise de risco e condições impeditivas; sistemas de proteção coletiva e individual para altura; acidentes típicos e condutas em emergências.'
        },
        {
            id: 'NR01-INT',
            codigo: 'NR01-INT',
            nome: 'NR-01 Integração de Segurança e GRO na Obra',
            carga_horaria: 6,
            meses_validade: 12,
            conteudo_programatico: 'Diretrizes do PGR/GRO, direitos e deveres, diferenciação de riscos por função e etapa na APR e fluxo de emergência (PAE).'
        }
    ];

    const aprModelosInicial = [
        {
            id: 'MOD-ALT-01',
            titulo: 'Manutenção de Estruturas e Taludes em Altura',
            riscos: [
                {
                    passo_tarefa: 'Acesso e montagem em estrutura elevada (> 2,0 m)',
                    perigo_fonte: 'Trabalho em altura com desnível',
                    evento_risco: 'Queda de pessoa de diferença de nível',
                    medidas_prevencao: 'Uso de cinto paraquedista ancorado em linha de vida validada e isolamento inferior'
                }
            ]
        }
    ];

    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        Error,
        Promise,
        TextEncoder,
        setTimeout,
        clearTimeout,
        localStorage,
        LOGO_COP_BASE64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        COP_LOGO_BASE64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        SUPER_ADMIN_MATRICULAS: ['76', 'TESTE'],
        allGheCatalogo: JSON.parse(JSON.stringify(gheSnapshotInicial)),
        allTreinamentosCatalogo: JSON.parse(JSON.stringify(catalogoSnapshotInicial)),
        allAprModelos: JSON.parse(JSON.stringify(aprModelosInicial)),
        allAprRegistros: [],
        addEventListener(tipo, fn) {
            if (tipo === 'keydown') keydownListeners.push(fn);
        },
        escapeHTML(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        sessaoDashboardAtual() { return sessaoAtual; },
        moduloPermitidoPainel() { return permitido; },
        usuarioPodeGravarModulo() { return podeGravar; },
        abrirDocumentoHtmlParaImpressao(htmlDoc, titulo) {
            impressoes.push({ html: htmlDoc, titulo });
        },
        showDbPage(pageId) {
            paginasNavegadas.push(pageId);
        },
        showTreinamentosSubtab(sub) {
            paginasNavegadas.push('treinamentos:' + sub);
        },
        alert(msg) { alertas.push(String(msg)); },
        confirm() { return true; },
        document: {
            fullscreenElement: null,
            exitFullscreen() { this.fullscreenElement = null; },
            body: { appendChild() {}, removeChild() {} },
            createElement() { return { click() {}, style: {} }; },
            getElementById(id) { return obterEl(id); },
            querySelectorAll() { return []; }
        },
        Blob: function (partes) { this.partes = partes; },
        URL: {
            createObjectURL() { return 'blob:apresentacoes-local'; },
            revokeObjectURL() {}
        }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigoMapa, sandbox, { filename: 'ia_mapa_mental.js' });
    vm.runInContext(codigoIa, sandbox, { filename: 'ia_aprendizado.js' });
    vm.runInContext(codigoApres, sandbox, { filename: 'apresentacoes_sst.js' });

    return {
        sandbox,
        store,
        elementos,
        alertas,
        impressoes,
        paginasNavegadas,
        keydownListeners,
        gheSnapshotInicial,
        catalogoSnapshotInicial,
        setSessao(nova) { sessaoAtual = nova; },
        setPermissoes({ gravar, acesso }) {
            if (gravar !== undefined) podeGravar = gravar;
            if (acesso !== undefined) permitido = acesso;
        },
        setFalhaQuota(v) { falhaQuota = !!v; }
    };
}

function revisarTodosSlidesDaApresentacao(sandbox, apId) {
    const ap = sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === apId);
    ap.slides.forEach(sl => {
        sandbox.salvarSlideApresentacao(apId, {
            id: sl.id,
            titulo: sl.titulo,
            topicos: sl.topicos
        });
    });
}

test('1. Verificações estáticas, rota Opção 2 no menu lateral, cache-busters e governança', () => {
    assert.match(html, /id="navApresentacoesSst"/, 'Botão navApresentacoesSst deve existir no menu lateral');
    assert.match(html, /id="page-apresentacoes_sst"/, 'Seção page-apresentacoes_sst deve existir no HTML');
    assert.match(html, /modules\/apresentacoes_sst\.js\?v=1/, 'apresentacoes_sst.js?v=1 deve estar carregado no HTML');
    assert.match(html, /modules\/ia_mapa_mental\.js\?v=2/, 'ia_mapa_mental.js?v=2 deve estar carregado');
    assert.match(html, /modules\/ia_aprendizado\.js\?v=5/, 'ia_aprendizado.js?v=5 deve estar carregado');
    assert.match(html, /dashboard\.js\?v=303\.15/, 'dashboard.js?v=303.15 deve estar atualizado');
    assert.match(html, /modules\/epi_estoque\.js\?v=303\.4/, 'epi_estoque.js?v=303.4 deve estar atualizado');
    assert.match(html, /modules\/apr_cipa\.js\?v=296/, 'apr_cipa.js?v=296 deve permanecer intacto');

    const posMapa = html.indexOf('modules/ia_mapa_mental.js?v=2');
    const posIa = html.indexOf('modules/ia_aprendizado.js?v=5');
    const posApres = html.indexOf('modules/apresentacoes_sst.js?v=1');
    assert.ok(posMapa > 0 && posIa > posMapa && posApres > posIa, 'Ordem de carregamento: Mapa Mental -> Inteligência SST -> Apresentações SST');

    assert.match(codigoNucleo, /apresentacoes_sst:\s*'navApresentacoesSst'/);
    assert.match(codigoEpi, /apresentacoes_sst:\s*'navApresentacoesSst'/);
    assert.match(codigoNucleo, /apresentacoes_sst:\s*'seguranca'/);
    assert.match(codigoEpi, /apresentacoes_sst:\s*'seguranca'/);
    assert.match(codigoNucleo, /renderApresentacoesSstPanel/);
    assert.match(codigoEpi, /renderApresentacoesSstPanel/);

    assert.match(html, /abrirApresentacoesDoCatalogoUI/);
    assert.match(codigoIa, /abrirApresentacoesDaContextoIaUI/);
    assert.match(codigoMapa, /abrirApresentacoesDoMapaMentalUI/);

    assert.doesNotMatch(codigoApres, /window\.open\s*\(/, 'Proibido usar window.open');
    assert.doesNotMatch(codigoApres, /configuracoes_sistema/, 'Proibido usar configuracoes_sistema');
    assert.doesNotMatch(codigoApres, /engmed/i, 'Proibido citar clínica externa');
    assert.doesNotMatch(codigoApres, /generativelanguage\.googleapis\.com|api\.groq\.com|api\.openai\.com/, 'Sem chamadas de API de LLM no navegador');
    assert.doesNotMatch(codigoApres, /loadAprData\s*\(|carregarAprModelos\s*\(/, 'Não deve chamar carregadores com efeito colateral de UI');
});

test('2. Piloto NR-35 sem texto normativo fabricado e sem fallback arbitrário (P1-B & Bloqueios 1 e 2 Grok)', () => {
    const env = criarAmbienteIntegrado();
    const { sandbox } = env;

    // Cenário adverso da sonda do Codex: Catálogo "Higiene de alimentos" e Cenário "Cozinheiros/Cozinha"
    sandbox.allTreinamentosCatalogo = [{ id: 'CURSO-ALIMENTO', nome: 'Higiene de alimentos', conteudo_programatico: 'Cozinha industrial' }];
    sandbox.allGheCatalogo = [{ id: 'GHE-COZ', nome: 'Cozinha e Refeitório', cargos: ['Cozinheiro'], riscos: [{ agente: 'Calor', epi_recomendado: 'Avental' }] }];
    const cenCozinha = sandbox.salvarContextoOperacional({
        cargo_equipe: 'Cozinheiros',
        frente_servico: 'Cozinha',
        rotina_detalhada: 'Preparo de alimentos'
    });

    const apIncompativel = sandbox.carregarApresentacaoPilotoConectada();
    assert.equal(apIncompativel.curso_catalogo_id, '', 'Não deve vincular curso incompatível por fallback catalogo[0]');
    assert.equal(apIncompativel.cenario_ia_id, '', 'Não deve vincular cenário incompatível por fallback cenario[0]');
    assert.equal(apIncompativel.fontes_vinculadas.length, 0, 'Nenhuma fonte incompatível nem fonte normativa fabricada deve ser vinculada');
    assert.ok(apIncompativel.slides.every(s => s.status_revisao_slide === 'RASCUNHO_PENDENTE_REVISAO'), 'Todos os slides do molde piloto devem nascer pendentes de revisão');

    // Agora com fontes reais de NR-35 / Trabalho em Altura
    const envAltura = criarAmbienteIntegrado();
    const apNr35 = envAltura.sandbox.carregarApresentacaoPilotoConectada();
    assert.equal(apNr35.curso_catalogo_id, 'NR35-01', 'Deve vincular curso NR-35 compatível');
    assert.ok(apNr35.fontes_vinculadas.some(f => f.tipo === 'ghe' && f.origem_id === 'GHE-07'), 'Deve vincular GHE com risco de altura');
    assert.ok(!apNr35.fontes_vinculadas.some(f => f.status_origem_na_captura === 'NORMA_PROCEDIMENTO'), 'Não deve fabricar fonte_colada normativa sintética sem ação de João');

    // Não permite homologar enquanto os slides do molde estiverem em RASCUNHO_PENDENTE_REVISAO
    assert.throws(
        () => envAltura.sandbox.alterarStatusApresentacao(apNr35.id, 'APROVADO_ENGENHARIA'),
        /pendentes de revisão/i
    );
});

test('3. Preservação imutável de revisão aprovada (P1-A & Ponto 4 Grok): editar slide, adicionar/remover fonte ou dispensar preserva snapshot aprovado original', () => {
    const env = criarAmbienteIntegrado();
    const { sandbox } = env;

    const ap = sandbox.criarOuAtualizarApresentacao({ titulo: 'Aula Oficial NR-35' });
    const sl = sandbox.salvarSlideApresentacao(ap.id, {
        titulo: 'CONTEUDO ORIGINAL HOMOLOGADO',
        topicos: ['Tópico original homologado pela Engenharia']
    });
    const apHomologada = sandbox.alterarStatusApresentacao(ap.id, 'APROVADO_ENGENHARIA');
    assert.equal(apHomologada.status, 'APROVADO_ENGENHARIA');
    assert.equal(apHomologada.revisao_id, 'R1');
    assert.ok(apHomologada.aprovado_por);

    // Edita o slide após aprovação -> deve guardar R1 em revisoes_aprovadas, mudar status para EM_REVISAO (R2) e limpar aprovado_por da revisão em aberto
    sandbox.salvarSlideApresentacao(ap.id, {
        id: sl.id,
        titulo: 'CONTEUDO SUBSTITUTO EM REVISAO',
        topicos: ['Novo tópico em elaboração']
    });

    const apPosEdicao = sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id);
    assert.equal(apPosEdicao.status, 'EM_REVISAO');
    assert.equal(apPosEdicao.revisao_id, 'R2');
    assert.equal(apPosEdicao.aprovado_por, '', 'Revisão aberta não pode manter carimbo aprovado_por');
    assert.equal(apPosEdicao.revisoes_aprovadas.length, 1);
    assert.equal(apPosEdicao.revisoes_aprovadas[0].revisao_id, 'R1');
    assert.equal(apPosEdicao.revisoes_aprovadas[0].slides[0].titulo, 'CONTEUDO ORIGINAL HOMOLOGADO');

    const bkp = sandbox.gerarBackupApresentacoesLocais();
    assert.ok(bkp.json.includes('CONTEUDO ORIGINAL HOMOLOGADO'), 'Backup completo deve preservar a versão homologada original');

    // Re-homologa em R2 e testa adição/remoção de fonte na bibliografia
    sandbox.alterarStatusApresentacao(ap.id, 'APROVADO_ENGENHARIA');
    assert.equal(sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id).status, 'APROVADO_ENGENHARIA');

    const fonteNova = sandbox.vincularFonteNaApresentacao(ap.id, {
        tipo: 'fonte_colada',
        titulo: 'NR-35 Item 35.5',
        texto: 'Sistemas de ancoragem inspecionados'
    });
    const apPosVincular = sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id);
    assert.equal(apPosVincular.status, 'EM_REVISAO', 'Adicionar fonte após aprovação deve abrir revisão EM_REVISAO');
    assert.equal(apPosVincular.aprovado_por, '');

    // Re-homologa e testa remoção de fonte
    sandbox.alterarStatusApresentacao(ap.id, 'APROVADO_ENGENHARIA');
    sandbox.removerFonteVinculada(ap.id, fonteNova.id_vinculo);
    const apPosRemover = sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id);
    assert.equal(apPosRemover.status, 'EM_REVISAO', 'Remover fonte após aprovação deve abrir revisão EM_REVISAO');
});

test('4. Conector GHE completo com riscos[] e EPIs (P1-C): mudança de risco/EPI altera hash e sinaliza slides dependentes', () => {
    const env = criarAmbienteIntegrado();
    const { sandbox } = env;

    sandbox.allGheCatalogo = [{
        id: 'GHE-X',
        nome: 'GHE Soldagem e Estruturas',
        cargos: ['Soldador', 'Montador'],
        riscos: [{ tipo_agente: 'Químico', agente: 'Fumos metálicos', epi_recomendado: 'Respirador PFF2' }]
    }];

    const antes = sandbox.lerFontesDisponiveisNosModulosSst().ghe[0];
    assert.match(antes.trecho_capturado, /Fumos metálicos/);
    assert.match(antes.trecho_capturado, /Respirador PFF2/);

    // Vincula GHE-X em uma aula e cita no Slide 1
    const ap = sandbox.criarOuAtualizarApresentacao({ titulo: 'Aula GHE Solda' });
    const vinc = sandbox.vincularFonteNaApresentacao(ap.id, { tipo: 'ghe', origem_id: 'GHE-X' });
    sandbox.salvarSlideApresentacao(ap.id, {
        titulo: 'Riscos do GHE-X',
        topicos: [antes.trecho_capturado],
        id_vinculos_referencia: [vinc.id_vinculo]
    });

    // Altera riscos/EPIs no GHE real
    sandbox.allGheCatalogo[0].riscos = [{
        tipo_agente: 'Físico',
        agente: 'Ruído contínuo',
        epi_recomendado: 'Protetor auricular tipo concha'
    }];

    const depois = sandbox.lerFontesDisponiveisNosModulosSst().ghe[0];
    assert.notEqual(antes.hash_canonico, depois.hash_canonico, 'Mudança em riscos[]/EPIs deve alterar o hash canônico do GHE');

    const diag = sandbox.diagnosticarEvolucaoApresentacao(ap.id);
    assert.equal(diag.indicadores.total_fontes_alteradas_ou_revogadas, 1);
    assert.equal(diag.fontes_alteradas_ou_revogadas[0].slides_dependentes.length, 1);
});

test('5. Citação por slide e revisão individual (P1-D): atualizar snapshot da fonte mantém slides dependentes pendentes até revisão individual de cada slide', () => {
    const env = criarAmbienteIntegrado();
    const { sandbox } = env;

    const ap = sandbox.criarOuAtualizarApresentacao({ titulo: 'Aula com Dois Slides na Mesma Fonte' });
    const f = sandbox.vincularFonteNaApresentacao(ap.id, { tipo: 'catalogo', origem_id: 'NR35-01' });
    const slA = sandbox.salvarSlideApresentacao(ap.id, {
        titulo: 'Slide A',
        topicos: ['CONTEUDO ANTIGO A'],
        id_vinculos_referencia: [f.id_vinculo]
    });
    const slB = sandbox.salvarSlideApresentacao(ap.id, {
        titulo: 'Slide B',
        topicos: ['CONTEUDO ANTIGO B'],
        id_vinculos_referencia: [f.id_vinculo]
    });

    // Muda a fonte no Catálogo
    sandbox.allTreinamentosCatalogo[0].conteudo_programatico = 'CONTEUDO NOVO ATUALIZADO NO CATALOGO NR-35';

    const diagAntes = sandbox.diagnosticarEvolucaoApresentacao(ap.id);
    assert.equal(diagAntes.indicadores.total_fontes_alteradas_ou_revogadas, 1);
    assert.equal(diagAntes.indicadores.total_slides_pendentes_revisao, 2);

    // Captura novo snapshot da fonte -> ambos os slides A e B devem continuar pendentes de revisão!
    sandbox.aplicarDecisaoEvolucaoNaApresentacao(ap.id, {
        acao: 'ATUALIZAR_SNAPSHOT_FONTE',
        id_vinculo: f.id_vinculo,
        slide_id: slA.id
    });

    const diagPosSnapshot = sandbox.diagnosticarEvolucaoApresentacao(ap.id);
    assert.equal(diagPosSnapshot.indicadores.total_fontes_alteradas_ou_revogadas, 1, 'Alerta da fonte continua ativo enquanto houver slide dependente não revisado');
    assert.equal(diagPosSnapshot.indicadores.total_slides_pendentes_revisao, 2, 'Ambos os slides A e B devem permanecer pendentes de revisão');

    // Revisa Slide A atualizando o conteúdo
    sandbox.aplicarDecisaoEvolucaoNaApresentacao(ap.id, {
        acao: 'REVISAR_CITACAO_SLIDE',
        id_vinculo: f.id_vinculo,
        slide_id: slA.id,
        novo_texto_slide: 'Tópico atualizado conforme nova ementa NR-35',
        substituir_topicos: true
    });

    const diagPosSlideA = sandbox.diagnosticarEvolucaoApresentacao(ap.id);
    assert.equal(diagPosSlideA.indicadores.total_slides_pendentes_revisao, 1, 'Slide B ainda deve constar como pendente de revisão');
    assert.equal(diagPosSlideA.slides_pendentes_revisao[0].slide_id, slB.id);

    // Revisa Slide B optando por manter o texto com justificativa
    sandbox.aplicarDecisaoEvolucaoNaApresentacao(ap.id, {
        acao: 'MANTER_TEXTO_SLIDE_ATUALIZAR_CITACAO',
        id_vinculo: f.id_vinculo,
        slide_id: slB.id,
        justificativa: 'Slide B trata apenas da introdução geral, texto permanece válido'
    });

    const diagFinal = sandbox.diagnosticarEvolucaoApresentacao(ap.id);
    assert.equal(diagFinal.indicadores.total_slides_pendentes_revisao, 0, 'Somente após revisar A e B as pendências zeram');
    assert.equal(diagFinal.indicadores.total_fontes_alteradas_ou_revogadas, 0);
});

test('6. Bloqueio de incorporação de regra revogada e concorrência entre duas abas compartilhando localStorage (P1-D & P1-E)', () => {
    const sharedStore = new Map();
    const abaA = criarAmbienteIntegrado({ sharedStore });
    const abaB = criarAmbienteIntegrado({ sharedStore });

    // Aba A cria apresentação e slide
    const ap = abaA.sandbox.criarOuAtualizarApresentacao({ titulo: 'Teste Concorrência Duas Abas' });
    const sl = abaA.sandbox.salvarSlideApresentacao(ap.id, {
        titulo: 'Título Inicial',
        topicos: ['Tópico 1']
    });

    // Aba B carrega o estado na versão atual
    abaB.sandbox.obterEstadoApresentacoesSst();

    // Aba A salva uma edição nova no slide (incrementando a versão no storage)
    abaA.sandbox.salvarSlideApresentacao(ap.id, {
        id: sl.id,
        titulo: 'Edição Recente da Aba A',
        topicos: ['Novo A']
    });

    // Aba B (com estado defasado em memória) tenta salvar por cima -> DEVE SER BLOQUEADA!
    assert.throws(
        () => abaB.sandbox.salvarSlideApresentacao(ap.id, {
            id: sl.id,
            titulo: 'Edição Antiga da Aba B',
            topicos: ['Velho B']
        }),
        /Conflito de concorrência/i
    );

    const estadoFinal = abaA.sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id);
    assert.equal(estadoFinal.slides[0].titulo, 'Edição Recente da Aba A');

    // Testa também bloqueio de confirmação de importação externa quando a versão ou sessão mudou após a prévia
    const previaIa = abaA.sandbox.analisarImportacaoExternaApresentacao(ap.id, JSON.stringify({
        slides: [{ titulo: 'Slide IA', topicos: ['Tópico IA'] }]
    }));
    assert.equal(previaIa.total_itens, 1);

    // Outra edição muda a versão da apresentação antes de confirmar a prévia
    abaA.sandbox.salvarSlideApresentacao(ap.id, {
        id: sl.id,
        titulo: 'Edição Posterior à Prévia',
        topicos: ['Mudou versão']
    });
    assert.throws(
        () => abaA.sandbox.confirmarImportacaoExternaApresentacao(ap.id, {}),
        /Conflito de concorrência/i
    );

    // Testa bloqueio de incorporação de regra revogada
    const cen = abaA.sandbox.salvarContextoOperacional({
        cargo_equipe: 'Equipe Altura',
        frente_servico: 'Canal',
        perigos_observados: ['Queda de ferramenta']
    });
    abaA.sandbox.executarVarreduraRiscosOcultos({ contextoId: cen.id });
    const sug = abaA.sandbox.obterEstadoIaAprendizadoSomenteLeitura().sugestoesFila[0];
    abaA.sandbox.aprovarSugestaoIa(sug.id, { criarRegraAprendida: true });
    const regra = abaA.sandbox.obterEstadoIaAprendizadoSomenteLeitura().regrasAprendidas[0];

    abaA.sandbox.vincularFonteNaApresentacao(ap.id, { tipo: 'regra', origem_id: regra.id });
    abaA.sandbox.revogarRegraAprendida(regra.id, 'Regra revogada para teste');

    assert.throws(
        () => abaA.sandbox.aplicarDecisaoEvolucaoNaApresentacao(ap.id, {
            acao: 'INCORPORAR_EM_SLIDE',
            id_vinculo: 'regra:' + regra.id
        }),
        /revogada\/não aprovada/i
    );
});

test('7. Layouts visuais distintos 16:9, teclado ArrowLeft/ArrowRight, fullscreen, pacote externo com separação validada vs rascunho e impressão A4', () => {
    const env = criarAmbienteIntegrado();
    const { sandbox, impressoes, keydownListeners } = env;

    const ap = sandbox.carregarApresentacaoPilotoConectada();
    revisarTodosSlidesDaApresentacao(sandbox, ap.id);

    const apAtualizada = sandbox.obterEstadoApresentacoesSst().apresentacoes.find(a => a.id === ap.id);

    // Verifica que os 4 layouts geram classes/estruturas visuais distintas e geometria 16:9
    const htmlLayout1 = sandbox.renderizarMoldeSlideInstitucionalHtml(apAtualizada, apAtualizada.slides[0], 4, { modoProjetor16x9: true });
    const htmlLayout2 = sandbox.renderizarMoldeSlideInstitucionalHtml(apAtualizada, apAtualizada.slides[1], 4, { modoProjetor16x9: true });
    const htmlLayout3 = sandbox.renderizarMoldeSlideInstitucionalHtml(apAtualizada, apAtualizada.slides[2], 4, { modoProjetor16x9: true });
    assert.match(htmlLayout1, /aspect-ratio:\s*16\s*\/\s*9/);
    assert.match(htmlLayout1, /ap-layout-normativo/);
    assert.match(htmlLayout2, /ap-layout-grid-2col/);
    assert.match(htmlLayout3, /ap-layout-debate/);

    // Navegação por teclado ArrowRight / ArrowLeft na aba projetor (posiciona no Slide 1 primeiro)
    sandbox.selecionarSlideApresentacaoUI(apAtualizada.slides[0].id);
    sandbox.selecionarAbaApresentacoesSstUI('projetor');
    assert.ok(keydownListeners.length >= 1, 'Listener de teclado do projetor deve estar instalado');
    const slideInicialId = sandbox.obterEstadoApresentacoesSst().slideSelecionadoId;
    keydownListeners[0]({ key: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault() {} });
    const slideAposDireitaId = sandbox.obterEstadoApresentacoesSst().slideSelecionadoId;
    assert.notEqual(slideAposDireitaId, slideInicialId, 'ArrowRight deve avançar o slide no projetor');
    keydownListeners[0]({ key: 'ArrowLeft', target: { tagName: 'DIV' }, preventDefault() {} });
    assert.equal(sandbox.obterEstadoApresentacoesSst().slideSelecionadoId, slideInicialId, 'ArrowLeft deve voltar ao slide anterior');

    // Tela cheia (requestFullscreen)
    assert.equal(sandbox.alternarTelaCheiaProjetorSstUI(), true);

    // Impressão A4 Paisagem e Guia/Apostila
    sandbox.imprimirApresentacaoSst(ap.id, 'slides');
    sandbox.imprimirApresentacaoSst(ap.id, 'apostila');
    assert.equal(impressoes.length, 2);
    assert.match(impressoes[0].html, /@page \{ size: A4 landscape;/);
    assert.match(impressoes[1].html, /Nota Exclusiva do Instrutor/);
});

test('8. Reauditoria P1-F, P1-A remanescente e P2 Logo/Fullscreen: fonte colada por editor não é validada, bloqueio antes de descartar 11ª revisão aprovada (R1 intacta) e LOGO_COP_BASE64 real', () => {
    // 1. P1-F: Editor comum (matrícula 99) cola hipótese -> não pode entrar em somenteFontesValidadas=true
    const envEditor = criarAmbienteIntegrado({
        sessao: { uid: 'editor99', matricula: '99', nome: 'Editor', tipo: 'interno', validador_ia_sst: false }
    });
    const apEd = envEditor.sandbox.criarOuAtualizarApresentacao({ titulo: 'Trecho sem validação' });
    envEditor.sandbox.vincularFonteNaApresentacao(apEd.id, {
        tipo: 'fonte_colada',
        titulo: 'Anotação não revisada',
        texto: 'HIPOTESE NAO VALIDADA'
    });
    const pacFiltrado = envEditor.sandbox.gerarPacoteExternoApresentacao(apEd.id, '', { somenteFontesValidadas: true });
    assert.equal(envEditor.sandbox.obterPapelApresentacoesSst(), 'editor');
    assert.equal(pacFiltrado.total_fontes_validadas, 0, 'Fonte colada por editor não pode contar como formalmente validada');
    assert.equal(pacFiltrado.prompt.includes('HIPOTESE NAO VALIDADA'), false, 'Hipótese não validada não pode sair no pacote filtrado');

    // 2. P1-A remanescente: Bloqueia abrir/homologar 11ª revisão sem descartar R1 silenciosamente
    const envVal = criarAmbienteIntegrado();
    const s = envVal.sandbox;
    const apHist = s.criarOuAtualizarApresentacao({ titulo: 'Histórico Imutável' });
    const slHist = s.salvarSlideApresentacao(apHist.id, { titulo: 'ORIGINAL_R1', topicos: ['Primeira revisão'] });
    s.alterarStatusApresentacao(apHist.id, 'APROVADO_ENGENHARIA');
    for (let i = 2; i <= 10; i++) {
        s.salvarSlideApresentacao(apHist.id, { id: slHist.id, titulo: 'Revisão ' + i, topicos: ['Revisão ' + i] });
        s.alterarStatusApresentacao(apHist.id, 'APROVADO_ENGENHARIA');
    }
    // Tentar homologar uma 11ª revisão após atingir 10 revisões homologadas preservadas deve bloquear sem descartar R1!
    s.salvarSlideApresentacao(apHist.id, { id: slHist.id, titulo: 'Revisão 11', topicos: ['Revisão 11'] });
    assert.throws(
        () => s.alterarStatusApresentacao(apHist.id, 'APROVADO_ENGENHARIA'),
        /Limite de 10 revisões homologadas preservadas atingido/
    );
    const estadoHist = s.obterEstadoApresentacoesSst().apresentacoes[0];
    assert.equal(estadoHist.revisoes_aprovadas.length, 10);
    assert.equal(estadoHist.revisoes_aprovadas.some(r => r.revisao_id === 'R1'), true, 'R1 deve permanecer preservada sem descarte silencioso');
    assert.equal(s.gerarBackupApresentacoesLocais().json.includes('ORIGINAL_R1'), true, 'ORIGINAL_R1 deve permanecer no backup completo');

    // 3. P2 Logo real: window.LOGO_COP_BASE64
    delete s.COP_LOGO_BASE64;
    s.LOGO_COP_BASE64 = 'data:image/png;base64,LOGO_REAL_TESTE';
    const htmlLogo = s.renderizarMoldeSlideInstitucionalHtml(estadoHist, estadoHist.slides[0], 1, {});
    assert.equal(htmlLogo.includes('LOGO_REAL_TESTE'), true, 'Deve usar window.LOGO_COP_BASE64 real');
    assert.equal(htmlLogo.includes('SST • PISF'), false);
});

