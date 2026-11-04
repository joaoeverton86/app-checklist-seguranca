const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('dashboard/modules/relatorio_sms_nc.js', 'utf8');

function func(nome) {
    let inicio = src.indexOf('async function ' + nome + '(');
    if (inicio < 0) {
        inicio = src.indexOf('function ' + nome + '(');
    }
    const idxFunc = src.indexOf('\nfunction ', inicio + 1);
    const idxAsync = src.indexOf('\nasync function ', inicio + 1);
    let fim = -1;
    if (idxFunc >= 0 && idxAsync >= 0) fim = Math.min(idxFunc, idxAsync);
    else if (idxFunc >= 0) fim = idxFunc;
    else if (idxAsync >= 0) fim = idxAsync;
    return src.slice(inicio, fim < 0 ? undefined : fim);
}

function contexto() {
    const coletor = func('coletarDadosCompletosRelatorioMensalSms');
    const c = {
        Date, console, Number, Math, Map, Set, NOMES_MESES: Array(12).fill('Outubro'), NIVEIS_RISCO_ORDEM: [],
        parseLocalDate: x => new Date(String(x).slice(0, 10) + 'T12:00:00'),
        toISODateLocal: d => d.toISOString().slice(0, 10),
        headcountAsOf: () => 0, semanasUteisDoMes: () => [1, 2, 3, 4], hhtDiasTrabalhadosMap: {},
        colaboradorEstaAtivo: () => true, todosRiscosGhe: () => [], diasSemAcidente: () => 0,
        montarLinhasRelatorioMensal: () => ({ totais: { hht: { geral: 0, dds: 0 }, participantes: { geral: 0 } }, categorias: [] }),
        montarQuadrosMaoDeObra: () => ({}), coletarDadosMeioAmbienteRelSms: () => ({ linhaResiduos: { pesoKg: 0 }, residuosConfirmados: false, manutRegistrosMes: 0, trocasOleoMes: 0, litrosOleoMes: 0 }), coletarDadosFase4RelSms: () => ({}),
        fmtPct: x => String(x), statusApr: () => ({}), nivelRiscoApr: () => ({}), calcularStatusAsoColaborador: () => ({ status: 'sem_registro' }),
        escapeHTML: x => String(x ?? ''), r2: x => Number(x || 0).toFixed(2)
    };
    for (const nome of new Set(coletor.match(/\ball[A-Z]\w*/g))) c[nome] = [];
    vm.createContext(c);
    for (const nome of ['relSmsHhtCompetencia', 'relSmsPercentual', 'relSmsDiasAtestadoNaCompetencia', 'coletarDadosCompletosRelatorioMensalSms']) {
        vm.runInContext(func(nome), c);
    }
    return c;
}

test('mês vazio não presume conformidade, inspeção ou HHT atual', () => {
    const c = contexto(), d = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    assert.equal(d.checklists.taxaConformidade, null);
    assert.equal(d.extintores.inspecionados, 0);
    assert.equal(d.extintores.totalAtivos, 0);
    assert.equal(d.extintores.percConformidade, null);
    assert.equal(d.hht.hhtMes, 0);
    assert.match(d.kpisRapidos.checklistsConformePct, /Sem base/);
});

test('resultado clínico ausente ou desconhecido permanece separado de aptos', () => {
    const c = contexto();
    c.allAsoExames = [null, '', 'pendente', 'apto', 'inapto', 'apto com restrição'].map(resultado => ({ data_exame: '2026-10-10', resultado }));
    const d = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    assert.equal(d.saude.aptos, 1);
    assert.equal(d.saude.inaptos, 1);
    assert.equal(d.saude.restricoes, 1);
    assert.equal(d.saude.semResultado, 3);
});

test('atestados: mês/ano, bissexto, duração, sobreposição e intervalo ausente com recorte da competência', () => {
    const c = contexto(), dias = c.relSmsDiasAtestadoNaCompetencia;
    assert.equal(dias({ data_inicio: '2026-09-30', data_fim: '2026-10-02' }, 9, 2026), 2);
    assert.equal(dias({ data_inicio: '2026-10-30', dias_afastamento: 5 }, 9, 2026), 2);
    assert.equal(dias({ data_inicio: '2026-12-31', dias_afastamento: 3 }, 0, 2027), 2);
    assert.equal(dias({ data_inicio: '2024-02-28', dias_afastamento: 3 }, 1, 2024), 2);
    assert.equal(dias({ data_inicio: '2026-10-01' }, 9, 2026), null);

    // Atestado de outro mês (ex: 2025) sem data_fim/dias NÃO pode contaminar atestadosSemIntervalo de outubro/2026 (Achado 5)
    c.allAtestadosOcupacionais = [
        { data_inicio: '2026-09-30', data_fim: '2026-10-02' },
        { data_inicio: '2026-10-01', dias_afastamento: 2 },
        { data_inicio: '2025-05-10' }, // sem intervalo, mas de 2025
        { data_inicio: '2026-10-15' }  // sem intervalo, de outubro/2026 -> este deve ser contado
    ];
    const dados = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    assert.equal(dados.saude.diasAfastamento, 4);
    assert.equal(dados.saude.atestadosSemIntervalo, 1);
});

test('HHT: efetivo x 220h padronizado, zero explícito e estimativa operacional aprovada por João', () => {
    const c = contexto();
    c.headcountAsOf = () => 10;
    c.hhtDiasTrabalhadosMap = { '2026-01': { dias_trabalhados: 0 } };

    // Mês paralisado com zero configurado (janeiro) -> valor = 0, estimado = false
    assert.equal(c.relSmsHhtCompetencia(2026, 0).valor, 0);
    assert.equal(c.relSmsHhtCompetencia(2026, 0).estimado, false);

    // Mês ativo (março, index 2) -> efetivo (10) * 220h = 2200h, estimado = true (Achado 2)
    const d = c.coletarDadosCompletosRelatorioMensalSms(2, 2026);
    assert.equal(d.hht.hhtMes, 2200);
    assert.equal(d.hht.hhtEstimado, true);
    // Acumulado até março: jan(0) + fev(2200) + mar(2200) = 4400
    assert.equal(d.hht.hhtAcumuladoAno, 4400);
    assert.equal(d.hht.hhtAcumuladoEstimado, true);
});

test('HTML completo: sigilo psicossocial, ausência de acidentes e atrasos ocultos', () => {
    const c = contexto();
    c.document = { getElementById: () => null };
    c.escapeHTML = x => String(x ?? '');
    c.gerarBarraCabecalhoInstitucionalRelSmsHtml = () => '';
    c.gerarCabecalhoPadraoRelSmsHtml = () => '<header>AMOSTRA DE TESTE</header>';
    for (const n of ['gerarGraficoBarrasRiscosSVG', 'gerarGraficoBarrasHHTSVG', 'gerarGraficoDonutADASVG', 'gerarGraficoStatusASOSVG']) c[n] = () => '';
    c.EMPRESA_INFO = {};
    c.r2 = x => Number(x || 0).toFixed(2);
    c.montarQuadrosMaoDeObra = () => ({ linhasQuadro2: [], totalFuncionarios: 0, pctAda: 0, totalAda: 0 });
    c.obterLogoCopBase64RelSms = () => '';
    c.formatSimpleDate = x => x || '—';
    c.RESIDUO_KG_POR_EPI = 0.5; c.RESIDUO_KG_POR_QUENTINHA = 0.0239; c.RESIDUO_KG_POR_COPO = 0.0018;
    c.coletarDadosMeioAmbienteRelSms = () => ({ linhaResiduos: { pesoKg: 0 }, residuosConfirmados: false, manutRegistrosMes: 0, trocasOleoMes: 0, litrosOleoMes: 0 });
    c.montarLinhasRelatorioMensal = () => ({ totais: { percHhtEfetivo: 0, hht: { geral: 0, dds: 0, integracao: 0, seguranca: 0, adicionais: 0 }, participantes: { geral: 0, dds: 0, integracao: 0, seguranca: 0, adicionais: 0 } }, categorias: [] });
    for (const n of ['sanitizarCelulaTabelaRelSms', 'relSmsTabelaGenericaHtml', 'construirHtmlDossieOficialRelSms']) {
        vm.runInContext(func(n), c);
    }

    const d = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    d.pgr.atrasadas = 7;
    d.psicossocial = {
        totalEscalas: 10,
        fortes: [{ escala: 'Clima', pct_risco: 10 }],
        criticas: [{ escala: 'Ritmo', pct_risco: 85 }],
        aplicacao: { taxa_participacao: 85 }
    };

    // Modo Oficial Executivo (fiscalizacao = true)
    const htmlExecutivo = c.construirHtmlDossieOficialRelSms(d, true);
    assert(!htmlExecutivo.includes('Ações em Atraso frente ao Cronograma'));
    // Achado 1: Sigilo no modo oficial - NÃO pode conter 'Escalas com Alerta Preventivo'
    assert(!htmlExecutivo.includes('Escalas com Alerta Preventivo'));
    // Achado 3: Ausência de acidentes NÃO pode declarar '✅ Meta Atingida'
    assert(!htmlExecutivo.includes('Meta Atingida'));
    assert(!htmlExecutivo.includes('null%'));
    assert(!htmlExecutivo.includes('undefined'));
    assert(htmlExecutivo.includes('Sem base de cálculo'));
    assert(!htmlExecutivo.includes('37/37'));

    // Modo Dossiê Completo (fiscalizacao = false)
    const htmlDossie = c.construirHtmlDossieOficialRelSms(d, false);
    // No dossiê interno, as escalas críticas aparecem
    assert(htmlDossie.includes('Escalas com Alerta Preventivo'));
});

test('Prévia do painel: sem inspeções não declara 100% Conforme (Achado 4)', () => {
    const c = contexto();
    const fakeEl = { innerHTML: '' };
    c.document = {
        getElementById: id => (id === 'relSmsPainelPreview' ? fakeEl : null)
    };
    c.escapeHTML = x => String(x ?? '');
    c.fmtPct = x => String(x);
    c.r2 = x => Number(x || 0).toFixed(2);
    for (const n of ['gerarGraficoBarrasHHTSVG', 'gerarGraficoDonutADASVG', 'gerarGraficoStatusASOSVG', 'gerarGraficoBarrasRiscosSVG']) {
        c[n] = () => '';
    }
    vm.runInContext(func('renderRelSmsPainel'), c);

    const d = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    d.checklists = { total: 0, conformes: 0, naoConformes: 0, taxaConformidade: null };
    d.ada = { totalAda: 0, pctAda: 0, linhasQuadro2: [], totalFuncionarios: 0 };
    c.renderRelSmsPainel(d, false);

    // Achado 4: Card 1 sem checklists deve exibir 'Sem inspeções registradas' e NÃO '100% Conforme'
    assert(fakeEl.innerHTML.includes('Sem inspeções registradas'));
    assert(!fakeEl.innerHTML.includes('100% Conforme'));
});

test('Sigilo e privacidade médica: CIDs, diagnósticos e nomes de atestados não vazam para o relatório', () => {
    const c = contexto();
    c.document = { getElementById: () => null };
    c.escapeHTML = x => String(x ?? '');
    c.gerarBarraCabecalhoInstitucionalRelSmsHtml = () => '';
    c.gerarCabecalhoPadraoRelSmsHtml = () => '<header>AMOSTRA DE TESTE</header>';
    for (const n of ['gerarGraficoBarrasRiscosSVG', 'gerarGraficoBarrasHHTSVG', 'gerarGraficoDonutADASVG', 'gerarGraficoStatusASOSVG']) c[n] = () => '';
    c.EMPRESA_INFO = {};
    c.r2 = x => Number(x || 0).toFixed(2);
    c.montarQuadrosMaoDeObra = () => ({ linhasQuadro2: [], totalFuncionarios: 0, pctAda: 0, totalAda: 0 });
    c.obterLogoCopBase64RelSms = () => '';
    c.formatSimpleDate = x => x || '—';
    c.RESIDUO_KG_POR_EPI = 0.5; c.RESIDUO_KG_POR_QUENTINHA = 0.0239; c.RESIDUO_KG_POR_COPO = 0.0018;
    c.coletarDadosMeioAmbienteRelSms = () => ({ linhaResiduos: { pesoKg: 0 }, residuosConfirmados: false, manutRegistrosMes: 0, trocasOleoMes: 0, litrosOleoMes: 0 });
    c.montarLinhasRelatorioMensal = () => ({ totais: { percHhtEfetivo: 0, hht: { geral: 0, dds: 0, integracao: 0, seguranca: 0, adicionais: 0 }, participantes: { geral: 0, dds: 0, integracao: 0, seguranca: 0, adicionais: 0 } }, categorias: [] });
    for (const n of ['sanitizarCelulaTabelaRelSms', 'relSmsTabelaGenericaHtml', 'construirHtmlDossieOficialRelSms']) {
        vm.runInContext(func(n), c);
    }

    c.allAtestadosOcupacionais = [
        {
            data_inicio: '2026-10-05',
            dias_afastamento: 4,
            cid: 'M54.5',
            diagnostico: 'Lombalgia Baixa Aguda',
            motivo: 'Patologia Confidencial',
            funcionario_nome: 'Colaborador Teste Sigilo'
        }
    ];

    const d = c.coletarDadosCompletosRelatorioMensalSms(9, 2026);
    assert.equal(d.saude.atestadosTotal, 1);
    assert.equal(d.saude.diasAfastamento, 4);

    const htmlExecutivo = c.construirHtmlDossieOficialRelSms(d, true);
    assert(!htmlExecutivo.includes('M54.5'), 'CID M54.5 não pode aparecer no relatório');
    assert(!htmlExecutivo.includes('Lombalgia Baixa Aguda'), 'Diagnóstico não pode aparecer no relatório');
    assert(!htmlExecutivo.includes('Patologia Confidencial'), 'Motivo médico não pode aparecer no relatório');
    assert(!htmlExecutivo.includes('Colaborador Teste Sigilo'), 'Nome do colaborador não pode vazar');
    assert(htmlExecutivo.includes('4 dias'));

    const htmlDossie = c.construirHtmlDossieOficialRelSms(d, false);
    assert(!htmlDossie.includes('M54.5'), 'CID M54.5 não pode aparecer no HTML do relatório');
    assert(!htmlDossie.includes('Lombalgia Baixa Aguda'), 'Diagnóstico não pode aparecer no HTML do relatório');
    assert(!htmlDossie.includes('Colaborador Teste Sigilo'), 'Nome do colaborador não pode vazar no HTML');
});

test('SMS-06: carregamento resiliente por fonte permite retry em falhas e compartilha promessa em voo', async () => {
    const c = contexto();
    c.window = {};
    c._relSmsPromisesInFlight = {};
    for (const n of ['relSmsCarregarFonteSegura']) vm.runInContext(func(n), c);

    let chamadas = 0;
    const fnComFalha = async () => {
        chamadas++;
        throw new Error('Falha transitória de rede');
    };

    // 1ª tentativa falha: retorna false e NÃO marca flag como true
    const res1 = await c.relSmsCarregarFonteSegura('FonteTeste', 'fonteTesteLoaded', fnComFalha);
    assert.equal(res1, false);
    assert.equal(c.window.fonteTesteLoaded, false);
    assert.equal(chamadas, 1);

    // 2ª tentativa (retry) com sucesso: deve tentar de novo e marcar true
    const fnSucesso = async () => {
        chamadas++;
        return true;
    };
    const res2 = await c.relSmsCarregarFonteSegura('FonteTeste', 'fonteTesteLoaded', fnSucesso);
    assert.equal(res2, true);
    assert.equal(c.window.fonteTesteLoaded, true);
    assert.equal(chamadas, 2);

    // 3ª chamada com flag já true: não chama de novo
    const res3 = await c.relSmsCarregarFonteSegura('FonteTeste', 'fonteTesteLoaded', fnSucesso);
    assert.equal(res3, true);
    assert.equal(chamadas, 2);
});

test('SMS-07: extração de dados de EPI em memória não depende de renderEpiPanel nem altera filtros', () => {
    const c = contexto();
    c.renderEpiPanel = () => {
        throw new Error('renderEpiPanel não deve ser chamado durante a extração de dados!');
    };
    c.allEpiEntregas = [
        { data_entrega: '2026-10-05', quantidade: 3, matricula: 'COLAB1' },
        { data_entrega: '2026-10-12', quantidade: 2, matricula: 'COLAB2' },
        { data_entrega: '2026-09-20', quantidade: 1, matricula: 'COLAB3' } // outro mês
    ];
    c.allEpiCatalogo = [
        { ativo: true, ca_validade: '2026-10-01' }
    ];
    c.allEpiEstoque = [];
    c.allTreinamentosStatus = [];
    c.allEfetivo = [];

    for (const n of ['coletarDadosSecao1RelSms']) vm.runInContext(func(n), c);

    const secao1 = c.coletarDadosSecao1RelSms(9, 2026);
    const entregasKpi = secao1.epiKpis.find(k => k.key === 'entregas');
    const totalItensKpi = secao1.epiKpis.find(k => k.key === 'totalItens');
    const colabsKpi = secao1.epiKpis.find(k => k.key === 'colaboradores');

    assert.equal(entregasKpi.value, 2, 'Deve contar apenas entregas do mês');
    assert.equal(totalItensKpi.value, 5, 'Deve somar a quantidade do mês');
    assert.equal(colabsKpi.value, 2, 'Deve contar colaboradores únicos atendidos');
});

test('SMS-03, SMS-04 e SMS-12: chave de fechamento, hash canônico recursivo e persistência de snapshot histórico', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsFechamentoChave', 'relSmsFechamentoChaveRevisao', 'relSmsCanonicalStringify', 'relSmsCalcularHash', 'relSmsSalvarSnapshotFechamento', 'relSmsObterSnapshotFechamento']) {
        vm.runInContext(func(n), c);
    }

    // 1. Chaves canônicas de competência e de revisão
    assert.equal(c.relSmsFechamentoChave(9, 2026), 'rel_sms_fechamento_2026_10');
    assert.equal(c.relSmsFechamentoChave(0, 2026), 'rel_sms_fechamento_2026_01');
    assert.equal(c.relSmsFechamentoChaveRevisao(9, 2026, 1), 'rel_sms_fechamento_2026_10_rev1');
    assert.equal(c.relSmsFechamentoChaveRevisao(9, 2026, 2), 'rel_sms_fechamento_2026_10_rev2');

    // 2. Hash canônico determinístico com cobertura estrita de propriedades aninhadas (Bloqueio 4)
    const objA = { x: 1, nested: { a: 1, b: 2 } };
    const objB = { nested: { b: 2, a: 1 }, x: 1 }; // Chaves reordenadas na raiz e no aninhado
    const objC = { x: 1, nested: { a: 9, b: 8 } }; // Valores internos diferentes

    const stringA = c.relSmsCanonicalStringify(objA);
    const stringB = c.relSmsCanonicalStringify(objB);
    const stringC = c.relSmsCanonicalStringify(objC);

    assert.equal(stringA, stringB, 'Serialização canônica deve ser idêntica mesmo com chaves reordenadas na raiz e internamente');
    assert.notEqual(stringA, stringC, 'Serialização canônica DEVE diferenciar alterações em propriedades aninhadas');
    assert.equal(stringA, '{"nested":{"a":1,"b":2},"x":1}');
    assert.equal(stringC, '{"nested":{"a":9,"b":8},"x":1}');

    const resHashA = await c.relSmsCalcularHash(objA);
    const resHashB = await c.relSmsCalcularHash(objB);
    const resHashC = await c.relSmsCalcularHash(objC);

    assert.equal(resHashA.hash, resHashB.hash, 'Hashes devem ser idênticos para objetos semanticamente equivalentes');
    assert.notEqual(resHashA.hash, resHashC.hash, 'Hashes DEVEM ser diferentes quando qualquer campo aninhado for modificado');
    assert.equal(resHashA.tipo, 'sha256', 'Tipo do hash deve ser identificado explicitamente como sha256');

    // 3. Mock de banco configuracoes_sistema para persistência e recuperação
    const tabelaMock = new Map();
    c.supabaseFetch = async (tabela, query) => {
        if (tabela !== 'configuracoes_sistema') return [];
        const match = query.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : null;
        if (id && tabelaMock.has(id)) {
            const row = tabelaMock.get(id);
            return [{ id: row.id, valor: row.valor, atualizado_em: row.atualizado_em }];
        }
        return [];
    };
    c.supabaseInsert = async (tabela, rows) => {
        for (const r of rows) tabelaMock.set(r.id, r);
        return rows;
    };
    c.supabasePatch = async (tabela, query, payload) => {
        const match = query.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : null;
        if (id && tabelaMock.has(id)) {
            const atual = tabelaMock.get(id);
            const atualizado = { ...atual, ...payload };
            tabelaMock.set(id, atualizado);
            return [atualizado];
        }
        return [];
    };

    // 4. Salvar snapshot fechado da Rev. 1
    const snapshotRev1 = {
        versao: 2,
        status: 'fechado',
        mes: 9,
        ano: 2026,
        fechado_em: '2026-11-04T12:00:00Z',
        fechado_por: 'gestor@cop.com.br',
        revisao: 1,
        hash: resHashA.hash,
        hash_tipo: resHashA.tipo,
        dados: { hht: 2200, efetivo: 10 },
        arquivo_acervo: {
            driveFileId: 'drive123',
            webViewLink: 'https://drive.google.com/file/d/drive123/view',
            nomeArquivo: 'Relatorio_Mensal_SMS_Outubro_2026_Rev1.docx'
        }
    };

    await c.relSmsSalvarSnapshotFechamento(9, 2026, snapshotRev1);

    // 5. Recuperar snapshot fechado
    const snapRecuperado = await c.relSmsObterSnapshotFechamento(9, 2026);
    assert.ok(snapRecuperado, 'Snapshot deve ser recuperado com sucesso');
    assert.equal(snapRecuperado.status, 'fechado');
    assert.equal(snapRecuperado.revisao, 1);
    assert.equal(snapRecuperado.hash, resHashA.hash);
    assert.equal(snapRecuperado.hash_tipo, 'sha256');
    assert.equal(snapRecuperado.dados.hht, 2200);
    assert.equal(snapRecuperado.arquivo_acervo.driveFileId, 'drive123');

    // Comprova que a chave dedicada da revisão 1 também foi gravada imutavelmente
    const chaveRev1 = c.relSmsFechamentoChaveRevisao(9, 2026, 1);
    assert.ok(tabelaMock.has(chaveRev1), 'Chave dedicada da Rev 1 deve existir no banco');
    const snapRev1Dedicado = tabelaMock.get(chaveRev1);
    assert.equal(snapRev1Dedicado.valor.revisao, 1);
});

test('SMS-03 (Bloqueio 3): relSmsObterSnapshotFechamento diferencia competência em aberto de falha de conexão/permissão', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsFechamentoChave', 'relSmsObterSnapshotFechamento']) {
        vm.runInContext(func(n), c);
    }

    // Cenário A: competência legitimamente em aberto (banco responde normalmente com lista vazia)
    c.supabaseFetch = async () => [];
    const resAberto = await c.relSmsObterSnapshotFechamento(9, 2026);
    assert.equal(resAberto, null, 'Quando não há registro no banco, deve retornar null legitimamente');

    // Cenário B: falha de rede/banco (rejeição de promessa / 500 / timeout)
    c.supabaseFetch = async () => {
        throw new Error('503 Service Unavailable / Supabase network timeout');
    };

    // Deve LANÇAR EXCEÇÃO explícita e NÃO retornar null
    await assert.rejects(
        async () => {
            await c.relSmsObterSnapshotFechamento(9, 2026);
        },
        /Falha de conectividade ou banco ao consultar fechamento da competência/,
        'Erro de rede no Supabase DEVE lançar exceção explícita para evitar fallback silencioso para cálculo ao vivo'
    );
});

test('SMS-03 e SMS-12 (Bloqueio 5): histórico de revisões múltiplas e confirmação de persistência', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsFechamentoChave', 'relSmsFechamentoChaveRevisao', 'relSmsCanonicalStringify', 'relSmsCalcularHash', 'relSmsSalvarSnapshotFechamento', 'relSmsObterSnapshotFechamento']) {
        vm.runInContext(func(n), c);
    }

    const tabelaMock = new Map();
    c.supabaseFetch = async (tabela, query) => {
        if (tabela !== 'configuracoes_sistema') return [];
        const match = query.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : null;
        if (id && tabelaMock.has(id)) {
            const row = tabelaMock.get(id);
            return [{ id: row.id, valor: row.valor, atualizado_em: row.atualizado_em }];
        }
        return [];
    };
    c.supabaseInsert = async (tabela, rows) => {
        for (const r of rows) tabelaMock.set(r.id, r);
        return rows;
    };
    c.supabasePatch = async (tabela, query, payload) => {
        const match = query.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : null;
        if (id && tabelaMock.has(id)) {
            const atual = tabelaMock.get(id);
            const atualizado = { ...atual, ...payload };
            tabelaMock.set(id, atualizado);
            return [atualizado];
        }
        return [];
    };

    // 1. Homologação da Revisão 1
    const snapRev1 = {
        status: 'fechado',
        revisao: 1,
        fechado_em: '2026-11-01T10:00:00Z',
        fechado_por: 'gestor1@cop.com.br',
        hash: 'hash_rev1',
        hash_tipo: 'sha256',
        dados: { hht: 2200 }
    };
    await c.relSmsSalvarSnapshotFechamento(9, 2026, snapRev1);

    // 2. Reabertura da competência (status: 'aberto')
    const snapReaberto = {
        status: 'aberto',
        revisao: 1,
        reaberto_em: '2026-11-02T14:00:00Z',
        reaberto_por: 'gestor1@cop.com.br',
        hash: 'hash_rev1',
        hash_tipo: 'sha256',
        dados: { hht: 2200 }
    };
    await c.relSmsSalvarSnapshotFechamento(9, 2026, snapReaberto);

    // Verificação crítica (Ponto 1): A chave dedicada da Rev. 1 NUNCA pode ser sobrescrita pela reabertura
    const chaveRev1 = c.relSmsFechamentoChaveRevisao(9, 2026, 1);
    assert.ok(tabelaMock.has(chaveRev1), 'Chave da Rev 1 deve continuar existindo');
    assert.equal(tabelaMock.get(chaveRev1).valor.status, 'fechado', 'Chave dedicada da Rev 1 DEVE permanecer com status fechado imutável');
    assert.equal(tabelaMock.get(chaveRev1).valor.revisao, 1);
    assert.equal(tabelaMock.get(chaveRev1).valor.hash, 'hash_rev1');

    // 3. Homologação da Revisão 2 (após reabertura)
    const snapRev2 = {
        status: 'fechado',
        revisao: 2,
        fechado_em: '2026-11-04T15:00:00Z',
        fechado_por: 'gestor2@cop.com.br',
        hash: 'hash_rev2',
        hash_tipo: 'sha256',
        dados: { hht: 2420 }
    };
    await c.relSmsSalvarSnapshotFechamento(9, 2026, snapRev2);

    // Verificação da chave dedicada da Rev. 1: continua com snapshot original preservado
    assert.equal(tabelaMock.get(chaveRev1).valor.revisao, 1);
    assert.equal(tabelaMock.get(chaveRev1).valor.status, 'fechado');
    assert.equal(tabelaMock.get(chaveRev1).valor.hash, 'hash_rev1');

    // Verificação da chave dedicada da Rev. 2: snapshot da nova revisão gravado
    const chaveRev2 = c.relSmsFechamentoChaveRevisao(9, 2026, 2);
    assert.ok(tabelaMock.has(chaveRev2), 'Chave da Rev 2 deve existir');
    assert.equal(tabelaMock.get(chaveRev2).valor.revisao, 2);
    assert.equal(tabelaMock.get(chaveRev2).valor.hash, 'hash_rev2');

    // Verificação da chave principal da competência: reflete Rev 2 e contém histórico
    const chavePrincipal = c.relSmsFechamentoChave(9, 2026);
    const snapFinal = tabelaMock.get(chavePrincipal).valor;
    assert.equal(snapFinal.revisao, 2);
    assert.ok(Array.isArray(snapFinal.historico_revisoes), 'Deve conter array de histórico de revisões');
    assert.equal(snapFinal.historico_revisoes.length, 2);
    assert.equal(snapFinal.historico_revisoes[0].revisao, 1);
    assert.equal(snapFinal.historico_revisoes[1].revisao, 2);

    // Verificação de falha de confirmação de persistência
    c.supabaseFetch = async () => []; // Simula retorno vazio na checagem pós-gravação
    await assert.rejects(
        async () => {
            await c.relSmsSalvarSnapshotFechamento(9, 2026, { status: 'fechado', revisao: 3 });
        },
        /Falha crítica de persistência/,
        'Deve falhar explicitamente se o registro não for confirmado no banco após escrita'
    );
});

test('SMS-11 e SMS-12 (Bloqueio 1): relSmsArquivarNoAcervo preserva sigilo por padrão e valida response.ok', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsArquivarNoAcervo']) {
        vm.runInContext(func(n), c);
    }

    let chamadaFinalizarOcorreu = false;
    let urlFinalizarChamada = null;

    c.fetch = async (url, opts) => {
        if (url === '/api/anexo-iniciar') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ uploadUrl: 'https://upload.google.com/session123' })
            };
        }
        if (url === 'https://upload.google.com/session123') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'drive_arq_123', webViewLink: 'https://drive.google.com/file/d/drive_arq_123/view' })
            };
        }
        if (url === '/api/anexo-finalizar') {
            chamadaFinalizarOcorreu = true;
            urlFinalizarChamada = url;
            return { ok: true, status: 200, json: async () => ({ ok: true }) };
        }
        throw new Error(`URL inesperada no mock: ${url}`);
    };

    // 1. Arquivamento padrão (sem autorização de tornar público)
    const resPadrao = await c.relSmsArquivarNoAcervo(9, 2026, Buffer.from('test'), 'Relatorio_Rev1.docx', 'application/docx');
    assert.equal(resPadrao.driveFileId, 'drive_arq_123');
    assert.equal(resPadrao.acesso_publico, false, 'Por padrão, acesso_publico deve ser false');
    assert.equal(chamadaFinalizarOcorreu, false, 'NÃO deve chamar /api/anexo-finalizar por padrão para não tornar público a anyone');

    // 2. Arquivamento com tornarPublico: true mas falha HTTP no endpoint de permissão
    c.fetch = async (url, opts) => {
        if (url === '/api/anexo-iniciar') {
            return { ok: true, status: 200, json: async () => ({ uploadUrl: 'https://upload.google.com/session456' }) };
        }
        if (url === 'https://upload.google.com/session456') {
            return { ok: true, status: 200, json: async () => ({ id: 'drive_arq_456' }) };
        }
        if (url === '/api/anexo-finalizar') {
            return {
                ok: false,
                status: 500,
                text: async () => 'Quota de permissões excedida no Google Drive'
            };
        }
        throw new Error(`URL inesperada: ${url}`);
    };

    await assert.rejects(
        async () => {
            await c.relSmsArquivarNoAcervo(9, 2026, Buffer.from('test'), 'Relatorio_Rev2.docx', 'application/docx', { tornarPublico: true });
        },
        /Falha ao conceder permissão pública no Drive/,
        'Deve lançar exceção explícita se o endpoint /api/anexo-finalizar retornar erro HTTP'
    );
});

test('SMS-03: renderização de competência fechada preserva snapshot imutável e exibe badge de fechamento', () => {
    const c = contexto();
    for (const n of ['gerarGraficoBarrasHHTSVG', 'gerarGraficoDonutADASVG', 'gerarGraficoStatusASOSVG', 'gerarGraficoBarrasRiscosSVG']) {
        c[n] = () => '';
    }
    for (const n of ['relSmsEscape', 'atualizarBotaoFechamentoToolbar', 'renderRelSmsPainel']) {
        vm.runInContext(func(n), c);
    }

    let innerHtmlContent = '';
    c.document = {
        getElementById: id => {
            if (id === 'relSmsPainelPreview') {
                return {
                    set innerHTML(val) { innerHtmlContent = val; },
                    get innerHTML() { return innerHtmlContent; }
                };
            }
            if (id === 'btnRelSmsFecharHomologar') {
                return { innerHTML: '', style: {}, onclick: null };
            }
            return null;
        }
    };

    const dadosCongelados = {
        meta: { nomeMes: 'Outubro', ano: 2026, responsavelTecnico: 'João Everton', crea: 'CREA/PE', codigoRev: 'REL.SMS.001', dataEmissao: '04/11/2026' },
        efetivo: { totalAtivo: 45 },
        hht: { hhtMes: 9900, hhtAcumuladoAno: 9900 },
        kpisRapidos: { tfGlobal: '0,00', tfCa: '0,00', tfSa: '0,00', tg: '0', checklistsTotal: 10, checklistsConformePct: '100%', hhtTreinamento: '50h', treinamentosParticipantes: 30, ddsEfetuados: 22, ddsDias: 22, extintoresConformePct: '100%', diasSemCpt: 300, diasSemSpt: 300, pgrEficaciaPct: '100%' },
        checklists: { total: 10, conformes: 10, naoConformes: 0, taxaConformidade: 100 },
        naoConformidades: { total: 0, porRisco: { critico_alto: 0, medio: 0, baixo: 0 } },
        relatos: { total: 0, statusCounts: { resolvido: 0 }, abertosAtual: 0 },
        apr: { emitidasNoMes: 2, situacaoAtual: { ativas: 2 } },
        matrizRisco: { total: 15, totalGhes: 4 },
        treinamentos: { historicoHht: [], dados: { totais: { participantes: { dds: 0, geral: 0 }, hht: { dds: 0, geral: 0 } }, categorias: [] }, cronograma: { taxa: 100 } },
        acidentes: { diasPerdidos: 0, diasSemCpt: 300, diasSemSpt: 300, tipicosTotal: 0, outrosTotal: 0, taxaIncidencia: 0 },
        pgr: { totalAcoes: 5, concluidas: 5, custoTotal: 0 },
        saude: { totalAsos: 10, aptos: 10, restricoes: 0, inaptos: 0, semResultado: 0, porTipo: { admissional: 5, periodico: 5, demissional: 0 }, atestadosTotal: 0, diasAfastamento: 0, taxaAbsenteismo: 0 },
        ergonomia: { totalAep: 2, riscoBaixo: 2, riscoMedio: 0, riscoAlto: 0, aetNecessaria: 0, planoConcluido: 2, planoTotal: 2 },
        psicossocial: null,
        periculosidade: { totalAnalises: 1, funcoesPerigosas: 1, colaboradoresExpostos: 5 },
        extintores: { conf: 10, inspecionados: 10, fracaoTexto: '10 de 10', totalAtivos: 10 },
        brigada: { membrosAtivos: 4 },
        cipa: { reunioesMes: 1, membrosAtivos: 2, pendencias: 0 },
        epi: { totalItens: 20, colaboradoresAtendidos: 10 },
        ada: {},
        meioAmbiente: { residuosConfirmados: false, linhaResiduos: { pesoKg: 0, quentinhas: 0, copos: 0 }, manutRegistrosMes: 0, trocasOleoMes: 0, litrosOleoMes: 0 },
        fotos: []
    };

    const snapshot = {
        status: 'fechado',
        revisao: 2,
        fechado_em: '2026-11-04T14:00:00Z',
        fechado_por: 'gestor@cop.com.br',
        hash: 'a1b2c3d4e5f6789012345678',
        arquivo_acervo: {
            driveFileId: 'drive999',
            webViewLink: 'https://drive.google.com/file/d/drive999/view',
            nomeArquivo: 'Relatorio_Mensal_SMS_Outubro_2026_Rev2.docx'
        }
    };

    c.renderRelSmsPainel(dadosCongelados, false, snapshot);

    assert.ok(innerHtmlContent.includes('COMPETÊNCIA HOMOLOGADA E FECHADA — SNAPSHOT HISTÓRICO IMUTÁVEL'), 'Deve renderizar banner de snapshot imutável');
    assert.ok(innerHtmlContent.includes('Rev. 2'), 'Deve indicar revisão correspondente');
    assert.ok(innerHtmlContent.includes('a1b2c3d4e5f67890'), 'Deve exibir hash de integridade');
    assert.ok(innerHtmlContent.includes('https://drive.google.com/file/d/drive999/view'), 'Deve conter link direto para o arquivo oficial no Drive');
    assert.ok(innerHtmlContent.includes('Reabrir Competência'), 'Deve oferecer opção de reabertura para gestores');
});

test('SMS-03 (Bloqueio 2): congelamento integral do snapshot em montarDocRelSms elimina consultas ao vivo', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['montarDocRelSms']) {
        vm.runInContext(func(n), c);
    }

    let buscaControleChamada = false;
    let buscaSecao1Chamada = false;
    let buscaSecoes23Chamada = false;
    let buscaMeioAmbienteChamada = false;
    let fotosPrepararChamada = false;

    c.garantirDocumentosControleCarregados = async () => { buscaControleChamada = true; };
    c.garantirDadosSecao1RelSms = async () => { buscaSecao1Chamada = true; };
    c.garantirDadosSecoes23RelSms = async () => { buscaSecoes23Chamada = true; };
    c.garantirDadosSecaoMeioAmbienteRelSms = async () => { buscaMeioAmbienteChamada = true; };
    c.relSmsFotosPreparar = async () => { fotosPrepararChamada = true; return []; };

    c.carregarBufferLogoCop = async () => null;
    c.gerarGraficoBarrasHHTSVG = () => '';
    c.converterSvgParaPngBuffer = async () => null;
    c.codigoRevisaoDocumento = () => 'REL.SMS.001';
    c.EMPRESA_INFO = { cnpj: '55.623.017/0001-97' };
    c.docx = {
        AlignmentType: { CENTER: 'center', LEFT: 'left', RIGHT: 'right' },
        BorderStyle: { SINGLE: 'single', NONE: 'none' },
        WidthType: { PERCENTAGE: 'pct' },
        VerticalAlign: { CENTER: 'center' },
        PageNumber: { CURRENT: 'current', TOTAL_PAGES: 'totalPages' },
        Paragraph: class { constructor(opts) { Object.assign(this, opts); } },
        TextRun: class { constructor(opts) { Object.assign(this, opts); } },
        ImageRun: class { constructor(opts) { Object.assign(this, opts); } },
        TableCell: class { constructor(opts) { Object.assign(this, opts); } },
        TableRow: class { constructor(opts) { Object.assign(this, opts); } },
        Table: class { constructor(opts) { Object.assign(this, opts); } },
        Header: class { constructor(opts) { Object.assign(this, opts); } },
        Footer: class { constructor(opts) { Object.assign(this, opts); } },
        PageBreak: class {},
        TableOfContents: class { constructor(title, opts) { this.title = title; this.opts = opts; } },
        Document: class { constructor(opts) { Object.assign(this, opts); } }
    };
    for (const n of ['relSmsH1', 'relSmsH2', 'relSmsP', 'relSmsNota']) {
        c[n] = txt => ({ txt });
    }
    c.construirSecao1RelSms = () => [];
    c.construirSecaoPgrDocx = () => [];
    c.construirSecao2RelSms = () => [];
    c.construirSecao3RelSms = () => [];
    c.construirSecaoErgonomiaDocx = () => [];
    c.construirSecaoPericulosidadeDocx = () => [];
    c.construirSecaoMeioAmbienteRelSms = () => [];
    c.construirSecao4RelSms = () => [];
    c.relSmsFotosDocx = () => [];
    c.construirAnexosRelSms = () => [];
    c.RELSMS_NAVY = '002060';
    c.RELSMS_BLUE = '418AB3';
    c.RELSMS_GREY = '595959';

    const snapshotCompleto = {
        status: 'fechado',
        revisao: 1,
        fechado_em: '2026-11-04T12:00:00Z',
        fechado_por: 'gestor@cop.com.br',
        hash: 'hash_integral_123',
        dados: {
            hht: { hhtMes: 2200, hhtAcumuladoAno: 2200, hhtEstimado: true },
            treinamentos: { historicoHht: [] },
            destaques: []
        },
        dadosSecao1: { acidentes: [] },
        dadosSecoes23: { cipa: [] },
        dadosMeioAmbiente: { residuos: [] },
        fotos: [{ id: 'f1', legenda: 'Foto 1' }],
        anexos: [{ id: 'a1', titulo: 'Anexo 1' }]
    };

    await c.montarDocRelSms(9, 2026, true, null, snapshotCompleto);

    assert.equal(buscaControleChamada, false, 'Documentos de controle vivos NÃO devem ser consultados em mês fechado');
    assert.equal(buscaSecao1Chamada, false, 'Dados da Seção 1 vivos NÃO devem ser consultados em mês fechado');
    assert.equal(buscaSecoes23Chamada, false, 'Dados das Seções 2 e 3 vivos NÃO devem ser consultados em mês fechado');
    assert.equal(buscaMeioAmbienteChamada, false, 'Dados de Meio Ambiente vivos NÃO devem ser consultados em mês fechado');
    assert.equal(fotosPrepararChamada, false, 'Fotos vivas NÃO devem ser consultadas em mês fechado quando o snapshot já contém fotos');
});

test('SMS v288 (Ponto 2): hash canônico cobre fotos e modalidade (perfil)', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsCanonicalStringify', 'relSmsCalcularHash']) {
        vm.runInContext(func(n), c);
    }

    const payloadBase = {
        mes: 9, ano: 2026, revisao: 1, fiscalizacao: true, perfil_emissao: 'oficial_executivo',
        dados: { hht: 2200 }, fotos: [{ id: 'f1', legenda: 'DDS 1' }]
    };

    const payloadFotoDiferente = {
        ...payloadBase,
        fotos: [{ id: 'f2', legenda: 'DDS 2' }]
    };

    const payloadModalidadeDiferente = {
        ...payloadBase,
        fiscalizacao: false,
        perfil_emissao: 'auditoria_interna'
    };

    const hashBase = await c.relSmsCalcularHash(payloadBase);
    const hashFoto = await c.relSmsCalcularHash(payloadFotoDiferente);
    const hashModalidade = await c.relSmsCalcularHash(payloadModalidadeDiferente);

    assert.notEqual(hashBase.hash, hashFoto.hash, 'Alterar fotos DEVE alterar o hash');
    assert.notEqual(hashBase.hash, hashModalidade.hash, 'Alterar a modalidade fiscalização DEVE alterar o hash');
});

test('SMS v288 (Ponto 4): garantirDadosCompletosRelatorioMensalSms bloqueia fechamento com dados incompletos', async () => {
    const c = contexto();
    c.window = {};
    c._relSmsPromisesInFlight = {};
    for (const n of ['relSmsCarregarFonteSegura', 'garantirDadosCompletosRelatorioMensalSms']) {
        vm.runInContext(func(n), c);
    }

    c.loadTreinamentosData = async () => true;
    c.loadAcidentesData = async () => { throw new Error('Falha de conexão com banco de Acidentes'); };
    c.loadEpiData = async () => true;

    // Sem exigirSucesso, apenas registra aviso
    await c.garantirDadosCompletosRelatorioMensalSms();

    // Com exigirSucesso: true (usado no fechamento), DEVE lançar exceção
    await assert.rejects(
        async () => {
            await c.garantirDadosCompletosRelatorioMensalSms({ exigirSucesso: true });
        },
        /Falha ao carregar as seguintes fontes obrigatórias de SST: Acidentes/,
        'Deve bloquear o fechamento se uma fonte obrigatória falhar'
    );
});

test('SMS v288 (Pontos 3 e 5): montarDocRelSms respeita modalidade e bloqueia snapshot incompleto', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['montarDocRelSms']) {
        vm.runInContext(func(n), c);
    }

    // Ponto 5: Snapshot fechado sem dadosSecao1 deve falhar explicitamente
    const snapshotIncompleto = {
        status: 'fechado',
        revisao: 1,
        fiscalizacao: true,
        dados: { hht: 2200 },
        // dadosSecao1 ausente!
        dadosSecoes23: {},
        dadosMeioAmbiente: {},
        fotos: [],
        anexos: []
    };

    await assert.rejects(
        async () => {
            await c.montarDocRelSms(9, 2026, false, null, snapshotIncompleto);
        },
        /Snapshot corrompido ou incompleto/,
        'Snapshot incompleto marcado como fechado DEVE lançar erro e não cair em dados dinâmicos'
    );
});

test('SMS v288 (Ponto 6): falha na leitura do histórico aborta relSmsSalvarSnapshotFechamento', async () => {
    const c = contexto();
    c.require = require;
    for (const n of ['relSmsFechamentoChave', 'relSmsFechamentoChaveRevisao', 'relSmsSalvarSnapshotFechamento']) {
        vm.runInContext(func(n), c);
    }

    c.supabaseFetch = async () => {
        throw new Error('Timeout crítico ao ler configuracoes_sistema');
    };

    await assert.rejects(
        async () => {
            await c.relSmsSalvarSnapshotFechamento(9, 2026, { status: 'fechado', revisao: 1, hash: 'h1' });
        },
        /Falha ao ler histórico de revisões anteriores no banco/,
        'Erro na leitura do histórico DEVE abortar o salvamento para não apagar o histórico'
    );
});
