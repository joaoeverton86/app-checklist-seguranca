// ==============================================================================
// MODULO: SAUDE OCUPACIONAL, ASOS, ACIDENTABILIDADE E MUTIRAO PSICOSSOCIAL
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================


// ============================================
// ACIDENTABILIDADE (NR-01 / NBR 14280) - TF/TG usam o mesmo HHT normativo (efetivo ×
// 220h) já usado no painel Efetivo. Tabela isolada (acidentes), só lida/escrita aqui.
// ============================================

var allAcidentes = [];
var acidentesLoaded = false;
var acidentesFilter = 'mes';
var acidentesFiltroAno = '';
var acidentesFiltroMes = '';
var hhtDiasTrabalhadosMap = {}; // 'YYYY-MM' -> { dias_trabalhados, horas_por_dia }

// Ano/mês específico pra comparar períodos distantes - mesmo raciocínio do filtro
// equivalente em Treinamentos ([[popularFiltroAnoTreinamentos]]). Usa os anos já
// configurados em hht_dias_trabalhados (cobre todo o histórico do contrato) em vez de só
// os anos com acidente registrado, já que "ver 2024" deve funcionar mesmo com 0 acidentes.
function popularFiltroAnoAcidentes() {
    const anos = new Set([new Date().getFullYear()]);
    Object.values(hhtDiasTrabalhadosMap).forEach(c => anos.add(c.ano));
    allAcidentes.forEach(a => { if (a.data_acidente) anos.add(parseLocalDate(a.data_acidente).getFullYear()); });
    popularSelectAnos('acidFiltroAno', anos);
}

// HHT de Exposição real (Efetivo × Dias Trabalhados no Mês × Horas por Dia), igual à
// planilha oficial "Índices de Segurança e Saúde Ocupacional" do usuário - mais precisa
// que o hht220DoMes() (aproximação fixa) usado no painel Efetivo. Retorna null quando o
// mês TEM efetivo mas ainda não foi configurado em hhtDiasTrabalhadosMap (não dá pra
// calcular TF/TG sem esse dado, então melhor mostrar "indisponível" do que um número
// fabricado) - mas retorna 0 (não null) quando o efetivo do mês é zero (mês anterior ao
// início do contrato, por exemplo), já que aí não há exposição real a configurar e isso
// não deve travar o cálculo de um período maior que inclua esse mês.
function hhtExposicaoDoMes(ano, mesIndex0) {
    const headcount = headcountAsOf(new Date(ano, mesIndex0 + 1, 0));
    if (headcount === 0) return 0;
    const key = `${ano}-${String(mesIndex0 + 1).padStart(2, '0')}`;
    const config = hhtDiasTrabalhadosMap[key];
    if (!config || !config.dias_trabalhados) return null;
    return headcount * config.dias_trabalhados * (config.horas_por_dia || 8);
}

function getAcidentesDateRange() {
    const tituloEl = document.getElementById('acidPeriodoTitulo');
    if (acidentesFiltroAno) {
        const ano = parseInt(acidentesFiltroAno, 10);
        if (acidentesFiltroMes !== '') {
            const mes = parseInt(acidentesFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (acidentesFilter === 'trimestre') {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        titulo = 'Últimos 3 meses';
    } else if (acidentesFilter === 'ano') {
        inicio = new Date(now.getFullYear(), 0, 1);
        titulo = `Ano ${now.getFullYear()} (até hoje)`;
    } else if (acidentesFilter === 'todos') {
        inicio = new Date(2000, 0, 1);
        titulo = 'Todo o histórico';
    } else {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        titulo = 'Este mês';
    }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setAcidentesFilter(filter) {
    acidentesFilter = filter;
    acidentesFiltroAno = '';
    acidentesFiltroMes = '';
    const anoSel = document.getElementById('acidFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('acidFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroAcidMes', 'btnFiltroAcidTrimestre', 'btnFiltroAcidAno', 'btnFiltroAcidTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroAcidMes', trimestre: 'btnFiltroAcidTrimestre', ano: 'btnFiltroAcidAno', todos: 'btnFiltroAcidTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderAcidentesPanel();
}

function onAcidentesFiltroAnoMesChange() {
    acidentesFiltroAno = document.getElementById('acidFiltroAno').value;
    acidentesFiltroMes = document.getElementById('acidFiltroMes').value;
    if (acidentesFiltroAno) {
        ['btnFiltroAcidMes', 'btnFiltroAcidTrimestre', 'btnFiltroAcidAno', 'btnFiltroAcidTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderAcidentesPanel();
}

async function loadAcidentesData() {
    try {
        allAcidentes = await supabaseFetch('acidentes', '?select=*');
        // Precisa do efetivo pra calcular a HHT de exposição e pra sugerir/autocompletar
        // o colaborador no formulário - carrega mesmo se o usuário nunca abriu Efetivo.
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }
        const diasTrabalhadosRows = await supabaseFetch('hht_dias_trabalhados', '?select=*');
        hhtDiasTrabalhadosMap = {};
        diasTrabalhadosRows.forEach(r => { hhtDiasTrabalhadosMap[r.id] = r; });
        popularAcidentesColabDatalist();
        renderAcidentesPanel();
    } catch (err) {
        console.error('Erro ao carregar dados de acidentes:', err);
    }
}

function popularAcidentesColabDatalist() {
    const dl = document.getElementById('acidentesColabList');
    if (!dl || dl.options.length > 0) return;
    allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.id} - ${e.nome}`;
        dl.appendChild(opt);
    });
}

function onAcidColaboradorChange() {
    const raw = document.getElementById('acidForm_matricula').value;
    const matricula = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
    const colab = allEfetivo.find(e => e.id === matricula);
    if (colab && colab.setor) {
        document.getElementById('acidForm_setor').value = colab.setor;
    }
}

// Dias corridos desde o último acidente daquele tipo (com ou sem afastamento) até
// hoje - null quando não há nenhum registro desse tipo ainda (não dá pra calcular
// "dias sem" sem uma data de referência).
function diasSemAcidente(comAfastamento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const relevantes = allAcidentes.filter(a => !!a.com_afastamento === comAfastamento && a.data_acidente);
    if (relevantes.length === 0) return null;
    const ultimo = relevantes.reduce((max, a) => {
        const d = parseLocalDate(a.data_acidente);
        return d > max ? d : max;
    }, new Date(0));
    ultimo.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((hoje.getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24)));
}

function renderAcidentesPanel() {
    popularFiltroAnoAcidentes();
    const { inicio, fim } = getAcidentesDateRange();
    const periodoTodos = allAcidentes.filter(a => {
        if (!a.data_acidente) return false;
        const d = parseLocalDate(a.data_acidente);
        return d >= inicio && d <= fim;
    });
    // NBR 14280 exige segregar acidente Típico de acidente de Trajeto e de ocorrência Sem
    // Lesão (impessoal/dano material) - só o Típico entra no TF/TG e nos gráficos de
    // tipologia/parte do corpo/agente causador, porque só ele usa o HHT de exposição real
    // ao trabalho como base de cálculo. Registro antigo sem essa classificação (campo
    // novo, adicionado depois) é tratado como Típico - ver DEFAULT da coluna no banco -
    // pra não zerar o histórico de TF/TG já calculado antes desta mudança.
    const periodo = periodoTodos.filter(a => (a.classificacao_nbr || 'Típico') === 'Típico');
    const periodoOutras = periodoTodos.filter(a => (a.classificacao_nbr || 'Típico') !== 'Típico');

    // HHT do período: soma a HHT de exposição real (efetivo × dias trabalhados × horas/dia)
    // de cada mês coberto. Se algum mês do período ainda não tiver dias trabalhados
    // configurados, TF/TG ficam indisponíveis (evita fabricar um número errado).
    let hhtPeriodo = 0;
    let periodoCompleto = true;
    let cursorHht = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const limiteHht = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursorHht <= limiteHht) {
        const hhtMes = hhtExposicaoDoMes(cursorHht.getFullYear(), cursorHht.getMonth());
        if (hhtMes === null) periodoCompleto = false;
        else hhtPeriodo += hhtMes;
        cursorHht = new Date(cursorHht.getFullYear(), cursorHht.getMonth() + 1, 1);
    }

    const numAcidentes = periodo.length;
    // TF segregado por com/sem afastamento (TF_CA/TF_SA), como a NBR 14280 exige, além do
    // TF Global (soma dos dois) que já existia - pedido do usuário depois de ver as
    // fórmulas oficiais da norma.
    const numAcidentesCA = periodo.filter(a => a.com_afastamento).length;
    const numAcidentesSA = periodo.filter(a => !a.com_afastamento).length;
    const diasPerdidosTotal = periodo.reduce((s, a) => s + (parseInt(a.dias_perdidos, 10) || 0), 0);
    const diasDebitadosTotal = periodo.reduce((s, a) => s + (parseInt(a.dias_debitados, 10) || 0), 0);

    const tfDisponivel = periodoCompleto && hhtPeriodo > 0;
    const tfCA = tfDisponivel ? (numAcidentesCA * 1000000 / hhtPeriodo) : 0;
    const tfSA = tfDisponivel ? (numAcidentesSA * 1000000 / hhtPeriodo) : 0;
    const tfG = tfDisponivel ? (numAcidentes * 1000000 / hhtPeriodo) : 0;
    const tg = tfDisponivel ? ((diasPerdidosTotal + diasDebitadosTotal) * 1000000 / hhtPeriodo) : 0;

    // TF_CA e TF_SA viraram o gráfico "TF por Categoria no Período" mais abaixo (pedido do
    // usuário pra economizar espaço na tela) - só o TF_G continua como card, por ser o
    // número "resumo" mais olhado no dia a dia. tfCA e tfSA continuam calculados acima,
    // só não viram mais card - agora alimentam o gráfico novo.
    document.getElementById('kpiAcidTFG').textContent = tfDisponivel ? tfG.toFixed(2) : '—';
    document.getElementById('kpiAcidTG').textContent = tfDisponivel ? tg.toFixed(2) : '—';
    document.getElementById('kpiAcidTotal').textContent = numAcidentes;
    document.getElementById('kpiAcidOutras').textContent = periodoOutras.length;

    // Taxa de Incidência (acidentes por 1.000 colaboradores) - complementa o TF (que usa
    // HHT como base) com uma leitura por efetivo, comum em relatório gerencial. Usa o
    // efetivo "retrato no fim do período" (headcountAsOf), mesmo critério já usado em
    // outros pontos do sistema (ex: Mão de Obra Local).
    const efetivoFimPeriodo = headcountAsOf(fim);
    const taxaIncidencia = efetivoFimPeriodo > 0 ? (numAcidentes * 1000 / efetivoFimPeriodo) : 0;
    document.getElementById('kpiAcidTaxaIncidencia').textContent = efetivoFimPeriodo > 0 ? taxaIncidencia.toFixed(2) : '—';

    const diasCPT = diasSemAcidente(true);
    const diasSPT = diasSemAcidente(false);
    document.getElementById('kpiAcidDiasSemCPT').textContent = diasCPT === null ? '—' : diasCPT;
    document.getElementById('kpiAcidDiasSemSPT').textContent = diasSPT === null ? '—' : diasSPT;

    // A lista de histórico continua mostrando TODOS os registros do período (Típico,
    // Trajeto e Sem Lesão) - só os cálculos de TF/TG/gráficos acima é que segregam. Um
    // registro que não é Típico ganha uma etiqueta na lista, pra ficar claro por que ele
    // não entra nos indicadores oficiais.
    const listaEl = document.getElementById('listAcidentesHistorico');
    const periodoOrdenado = periodoTodos.slice().sort((a, b) => (b.data_acidente || '').localeCompare(a.data_acidente || ''));
    if (periodoOrdenado.length === 0) {
        listaEl.innerHTML = '<div class="db-list-empty">✅ Nenhum acidente registrado no período</div>';
    } else {
        listaEl.innerHTML = periodoOrdenado.map(a => {
            const cls = a.com_afastamento ? 'db-item-danger' : 'db-item-warning';
            const classifTag = (a.classificacao_nbr && a.classificacao_nbr !== 'Típico') ? ` — ${escapeHTML(a.classificacao_nbr)}` : '';
            return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="abrirFormAcidente('${escapeHTML(a.id)}')">
                <div class="db-list-item-title">${escapeHTML(a.tipo_acidente || 'Não especificado')} ${a.com_afastamento ? '(CPT)' : '(SPT)'}${classifTag}</div>
                <div class="db-list-item-sub">${escapeHTML(a.nome_colaborador || 'Não identificado')} — ${formatSimpleDate(a.data_acidente)}${a.setor ? ' — ' + escapeHTML(a.setor) : ''}</div>
            </div>`;
        }).join('');
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.acidTFCategoria) chartInstances.acidTFCategoria.destroy();
    if (chartInstances.acidTFTG) chartInstances.acidTFTG.destroy();
    if (chartInstances.acidTipologia) chartInstances.acidTipologia.destroy();
    if (chartInstances.acidSetor) chartInstances.acidSetor.destroy();
    if (chartInstances.acidParteCorpo) chartInstances.acidParteCorpo.destroy();
    if (chartInstances.acidAgenteCausador) chartInstances.acidAgenteCausador.destroy();

    // Gráfico pequeno comparando TF_CA, TF_SA e TF_G do período selecionado - substitui os
    // cards de TF_CA/TF_SA que existiam antes (o usuário pediu pra virar gráfico, pra
    // sobrar menos cards na tela). Continua mostrando os 3 juntos, só que como barrinhas em
    // vez de números separados. Usa tfCA/tfSA/tfG, já calculados mais acima nesta função.
    chartInstances.acidTFCategoria = new Chart(document.getElementById('chartAcidTFCategoria'), {
        type: 'bar',
        data: {
            labels: ['TF_CA', 'TF_SA', 'TF_G'],
            datasets: [{
                label: 'TF no período',
                data: tfDisponivel ? [tfCA, tfSA, tfG] : [0, 0, 0],
                backgroundColor: ['#4f46e5', '#818cf8', '#1e1b4b'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // TF/TG por mês e os gráficos de tipologia/parte do corpo/agente causador abaixo só
    // consideram acidente Típico - mesmo critério da segregação NBR 14280 usada acima nos
    // KPIs do período.
    const acidentesTipicos = allAcidentes.filter(a => (a.classificacao_nbr || 'Típico') === 'Típico');
    const hoje = new Date();
    const datasAdmissao = allEfetivo.filter(e => e.dt_admissao).map(e => parseLocalDate(e.dt_admissao));
    const primeiraData = datasAdmissao.length > 0 ? new Date(Math.min(...datasAdmissao.map(d => d.getTime()))) : hoje;
    const mesesAcid = [], tfPorMes = [], tgPorMes = [];
    let cursorAcid = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
    const limiteAcid = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    while (cursorAcid <= limiteAcid) {
        const ano = cursorAcid.getFullYear(), mes = cursorAcid.getMonth();
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        mesesAcid.push(cursorAcid.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const acidDoMes = acidentesTipicos.filter(a => a.data_acidente && parseLocalDate(a.data_acidente) >= inicioMes && parseLocalDate(a.data_acidente) <= fimMes);
        const hhtMes = hhtExposicaoDoMes(ano, mes);
        const dPerdidosMes = acidDoMes.reduce((s, a) => s + (parseInt(a.dias_perdidos, 10) || 0), 0);
        const dDebitadosMes = acidDoMes.reduce((s, a) => s + (parseInt(a.dias_debitados, 10) || 0), 0);
        // hhtMes null = mês sem "dias trabalhados" configurado - plota como gap (null),
        // não como 0, pra não sugerir visualmente "TF/TG medido igual a zero".
        tfPorMes.push(hhtMes ? Math.round((acidDoMes.length * 1000000 / hhtMes) * 100) / 100 : null);
        tgPorMes.push(hhtMes ? Math.round(((dPerdidosMes + dDebitadosMes) * 1000000 / hhtMes) * 100) / 100 : null);
        cursorAcid = new Date(ano, mes + 1, 1);
    }

    chartInstances.acidTFTG = new Chart(document.getElementById('chartAcidTFTG'), {
        type: 'line',
        data: {
            labels: mesesAcid,
            datasets: [
                { label: 'TF', data: tfPorMes, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.08)', fill: true, tension: 0.25, yAxisID: 'y' },
                { label: 'TG', data: tgPorMes, borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.25, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'TF' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'TG' } }
            }
        }
    });

    const tipoCounts = {};
    acidentesTipicos.forEach(a => { const t = a.tipo_acidente || 'Não especificado'; tipoCounts[t] = (tipoCounts[t] || 0) + 1; });
    const tipoSorted = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    const tipoLabels = tipoSorted.map(t => wrapChartLabel(t[0]));
    ajustarAlturaBarrasHorizontais('chartAcidTipologia', tipoLabels);
    chartInstances.acidTipologia = new Chart(document.getElementById('chartAcidTipologia'), {
        type: 'bar',
        data: { labels: tipoLabels, datasets: [{ label: 'Acidentes', data: tipoSorted.map(t => t[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    const setorCounts = {};
    acidentesTipicos.forEach(a => { const s = a.setor || 'Não informado'; setorCounts[s] = (setorCounts[s] || 0) + 1; });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    const setorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartAcidSetor', setorLabels);
    chartInstances.acidSetor = new Chart(document.getElementById('chartAcidSetor'), {
        type: 'bar',
        data: { labels: setorLabels, datasets: [{ label: 'Acidentes', data: setorSorted.map(s => s[1]), backgroundColor: '#ef4444', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // NOVO: Parte do Corpo Atingida e Agente Causador - o formulário de registro já
    // captura os dois campos há tempos, mas nenhum gráfico usava esse dado até agora.
    const parteCorpoCounts = {};
    acidentesTipicos.forEach(a => { const p = a.parte_corpo || 'Não informado'; parteCorpoCounts[p] = (parteCorpoCounts[p] || 0) + 1; });
    const parteCorpoSorted = Object.entries(parteCorpoCounts).sort((a, b) => b[1] - a[1]);
    const parteCorpoLabels = parteCorpoSorted.map(p => wrapChartLabel(p[0]));
    ajustarAlturaBarrasHorizontais('chartAcidParteCorpo', parteCorpoLabels);
    chartInstances.acidParteCorpo = new Chart(document.getElementById('chartAcidParteCorpo'), {
        type: 'bar',
        data: { labels: parteCorpoLabels, datasets: [{ label: 'Acidentes', data: parteCorpoSorted.map(p => p[1]), backgroundColor: '#0ea5e9', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    const agenteCounts = {};
    acidentesTipicos.forEach(a => { const ag = a.agente_causador || 'Não informado'; agenteCounts[ag] = (agenteCounts[ag] || 0) + 1; });
    const agenteSorted = Object.entries(agenteCounts).sort((a, b) => b[1] - a[1]);
    const agenteLabels = agenteSorted.map(ag => wrapChartLabel(ag[0]));
    ajustarAlturaBarrasHorizontais('chartAcidAgenteCausador', agenteLabels);
    chartInstances.acidAgenteCausador = new Chart(document.getElementById('chartAcidAgenteCausador'), {
        type: 'bar',
        data: { labels: agenteLabels, datasets: [{ label: 'Acidentes', data: agenteSorted.map(ag => ag[1]), backgroundColor: '#8b5cf6', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Snapshot dos números/gráficos/lista que acabaram de ser calculados acima, pra
    // alimentar a aba "📄 Relatório" sem duplicar nenhuma lógica de cálculo.
    window.acidReportData = {
        periodoLabel: document.getElementById('acidPeriodoTitulo')?.textContent || '',
        kpis: [
            { key: 'tfg', label: 'TF Global (TF_CA + TF_SA)', value: tfDisponivel ? tfG.toFixed(2) : '—' },
            { key: 'tg', label: 'Taxa de Gravidade (TG)', value: tfDisponivel ? tg.toFixed(2) : '—' },
            { key: 'taxaIncidencia', label: 'Taxa de Incidência (por 1.000 colaboradores)', value: efetivoFimPeriodo > 0 ? taxaIncidencia.toFixed(2) : '—' },
            { key: 'diasSemCpt', label: 'Dias sem Acidente c/ Afastamento (CPT)', value: diasCPT === null ? '—' : diasCPT },
            { key: 'diasSemSpt', label: 'Dias sem Acidente s/ Afastamento (SPT)', value: diasSPT === null ? '—' : diasSPT },
            { key: 'total', label: 'Acidentes Típicos no Período', value: numAcidentes },
            { key: 'outras', label: 'Trajeto / Sem Lesão no Período', value: periodoOutras.length }
        ],
        graficos: {
            graficoTfCategoria: { titulo: 'TF por Categoria no Período', labels: ['TF_CA', 'TF_SA', 'TF_G'], valores: tfDisponivel ? [tfCA, tfSA, tfG] : [0, 0, 0] },
            graficoTfTg: {
                titulo: 'TF e TG por Mês (Histórico Completo)',
                labels: mesesAcid,
                series: [
                    { nome: 'TF', valores: tfPorMes },
                    { nome: 'TG', valores: tgPorMes }
                ]
            },
            graficoTipologia: { titulo: 'Acidentes por Tipologia', labels: tipoSorted.map(t => t[0]), valores: tipoSorted.map(t => t[1]) },
            graficoSetor: { titulo: 'Acidentes por Setor', labels: setorSorted.map(s => s[0]), valores: setorSorted.map(s => s[1]) },
            graficoParteCorpo: { titulo: 'Acidentes por Parte do Corpo Atingida', labels: parteCorpoSorted.map(p => p[0]), valores: parteCorpoSorted.map(p => p[1]) },
            graficoAgenteCausador: { titulo: 'Acidentes por Agente Causador', labels: agenteSorted.map(ag => ag[0]), valores: agenteSorted.map(ag => ag[1]) }
        },
        listas: {
            listaHistorico: {
                titulo: 'Histórico de Acidentes no Período',
                colunas: ['Data', 'Colaborador', 'Setor', 'Tipo', 'Afastamento', 'Classificação'],
                linhas: periodoOrdenado.map(a => [
                    formatSimpleDate(a.data_acidente), a.nome_colaborador || 'Não identificado', a.setor || '—',
                    a.tipo_acidente || 'Não especificado', a.com_afastamento ? 'CPT' : 'SPT', a.classificacao_nbr || 'Típico'
                ])
            }
        }
    };
    if (document.getElementById('acidentesSubtabBtn-relatorio')?.classList.contains('active')) renderAcidentesRelatorioChecklist();
}

function abrirFormAcidente(id) {
    const form = document.getElementById('acidenteFormCard');
    const title = document.getElementById('acidenteFormTitle');
    const btnExcluir = document.getElementById('acidForm_btnExcluir');
    document.getElementById('acidenteFormStatus').textContent = '';
    popularAcidentesColabDatalist();

    if (id) {
        const a = allAcidentes.find(x => x.id === id);
        if (!a) return;
        title.textContent = '✏️ Editar Acidente';
        form.dataset.editId = id;
        document.getElementById('acidForm_data').value = a.data_acidente || '';
        document.getElementById('acidForm_classificacao').value = a.classificacao_nbr || 'Típico';
        document.getElementById('acidForm_matricula').value = a.matricula ? `${a.matricula} - ${a.nome_colaborador || ''}` : (a.nome_colaborador || '');
        document.getElementById('acidForm_setor').value = a.setor || '';
        document.getElementById('acidForm_tipo').value = a.tipo_acidente || '';
        document.getElementById('acidForm_afastamento').value = a.com_afastamento ? 'sim' : 'nao';
        document.getElementById('acidForm_diasPerdidos').value = a.dias_perdidos || 0;
        document.getElementById('acidForm_diasDebitados').value = a.dias_debitados || 0;
        document.getElementById('acidForm_parteCorpo').value = a.parte_corpo || '';
        document.getElementById('acidForm_agenteCausador').value = a.agente_causador || '';
        document.getElementById('acidForm_local').value = a.local || '';
        document.getElementById('acidForm_descricao').value = a.descricao || '';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '🚑 Registrar Acidente';
        delete form.dataset.editId;
        document.getElementById('acidForm_data').value = new Date().toISOString().split('T')[0];
        document.getElementById('acidForm_classificacao').value = 'Típico';
        document.getElementById('acidForm_matricula').value = '';
        document.getElementById('acidForm_setor').value = '';
        document.getElementById('acidForm_tipo').value = '';
        document.getElementById('acidForm_afastamento').value = 'nao';
        document.getElementById('acidForm_diasPerdidos').value = 0;
        document.getElementById('acidForm_diasDebitados').value = 0;
        document.getElementById('acidForm_parteCorpo').value = '';
        document.getElementById('acidForm_agenteCausador').value = '';
        document.getElementById('acidForm_local').value = '';
        document.getElementById('acidForm_descricao').value = '';
        btnExcluir.style.display = 'none';
    }

    showAcidentesSubtab('registrar');
}

function fecharFormAcidente() {
    showAcidentesSubtab('visao');
}

async function salvarAcidente() {
    if (bloquearEdicaoSeNaoAutorizado('acidentes')) return;
    const statusEl = document.getElementById('acidenteFormStatus');
    const data = document.getElementById('acidForm_data').value;
    const tipo = document.getElementById('acidForm_tipo').value;

    if (!data || !tipo) {
        statusEl.textContent = '❌ Data e tipo de acidente são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const rawColab = document.getElementById('acidForm_matricula').value.trim();
    let matricula = '', nomeColaborador = '', funcao = '';
    if (rawColab) {
        matricula = rawColab.includes(' - ') ? rawColab.split(' - ')[0].trim() : rawColab;
        const colab = allEfetivo.find(e => e.id === matricula);
        if (colab) {
            nomeColaborador = colab.nome || '';
            funcao = colab.funcao || '';
        } else {
            // Não bateu com nenhuma matrícula cadastrada - trata como nome livre
            // (terceiro/visitante sem cadastro no efetivo).
            nomeColaborador = rawColab;
            matricula = '';
        }
    }

    const form = document.getElementById('acidenteFormCard');
    const editId = form.dataset.editId;
    const id = editId || ('ACID_' + Date.now());

    const row = {
        id,
        data_acidente: data,
        classificacao_nbr: document.getElementById('acidForm_classificacao').value || 'Típico',
        matricula: matricula || null,
        nome_colaborador: nomeColaborador || null,
        funcao: funcao || null,
        setor: document.getElementById('acidForm_setor').value.trim() || null,
        tipo_acidente: tipo,
        com_afastamento: document.getElementById('acidForm_afastamento').value === 'sim',
        dias_perdidos: parseInt(document.getElementById('acidForm_diasPerdidos').value, 10) || 0,
        dias_debitados: parseInt(document.getElementById('acidForm_diasDebitados').value, 10) || 0,
        parte_corpo: document.getElementById('acidForm_parteCorpo').value.trim() || null,
        agente_causador: document.getElementById('acidForm_agenteCausador').value.trim() || null,
        local: document.getElementById('acidForm_local').value.trim() || null,
        descricao: document.getElementById('acidForm_descricao').value.trim() || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('acidentes', [row]);
        const idx = allAcidentes.findIndex(a => a.id === id);
        if (idx >= 0) allAcidentes[idx] = { ...allAcidentes[idx], ...row };
        else allAcidentes.push(row);

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormAcidente(), 900);
    } catch (err) {
        console.error('Erro ao salvar acidente:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirAcidenteAtual() {
    if (bloquearEdicaoSeNaoAutorizado('acidentes')) return;
    const form = document.getElementById('acidenteFormCard');
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm('Excluir este registro de acidente? Essa ação não pode ser desfeita.')) return;

    const statusEl = document.getElementById('acidenteFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('acidentes', id);
        allAcidentes = allAcidentes.filter(a => a.id !== id);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormAcidente(), 900);
    } catch (err) {
        console.error('Erro ao excluir acidente:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// SAÚDE OCUPACIONAL (NR-07 / PCMSO) - Controle de ASO (vencido/vencendo/em dia/sem
// registro, calculado a partir do exame mais recente de cada colaborador ativo) e Taxa
// de Absenteísmo Ocupacional (horas perdidas por atestado de doença ocupacional OU
// acidente de trabalho, sobre a mesma HHT de exposição já usada em Acidentabilidade).
// ============================================

var allAsoExames = window.allAsoExames || [];
var allAtestadosOcupacionais = window.allAtestadosOcupacionais || [];
var allPressaoArterial = [];
var saudeLoaded = false;
var saudeFilter = 'mes';
var saudeFiltroAno = '';
var saudeFiltroMes = '';

var ASO_TIPO_LABELS = {
    admissional: 'Admissional',
    periodico: 'Periódico',
    demissional: 'Demissional',
    retorno_trabalho: 'Retorno ao Trabalho',
    mudanca_risco: 'Mudança de Risco'
};

function popularFiltroAnoSaude() {
    const anos = new Set([new Date().getFullYear()]);
    Object.values(hhtDiasTrabalhadosMap).forEach(c => anos.add(c.ano));
    allAsoExames.forEach(a => { if (a.data_exame) anos.add(parseLocalDate(a.data_exame).getFullYear()); });
    popularSelectAnos('saudeFiltroAno', anos);
}

function getSaudeDateRange() {
    const tituloEl = document.getElementById('saudePeriodoTitulo');
    if (saudeFiltroAno) {
        const ano = parseInt(saudeFiltroAno, 10);
        if (saudeFiltroMes !== '') {
            const mes = parseInt(saudeFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (saudeFilter === 'trimestre') {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        titulo = 'Últimos 3 meses';
    } else if (saudeFilter === 'ano') {
        inicio = new Date(now.getFullYear(), 0, 1);
        titulo = `Ano ${now.getFullYear()} (até hoje)`;
    } else if (saudeFilter === 'todos') {
        inicio = new Date(2000, 0, 1);
        titulo = 'Todo o histórico';
    } else {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        titulo = 'Este mês';
    }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setSaudeFilter(filter) {
    saudeFilter = filter;
    saudeFiltroAno = '';
    saudeFiltroMes = '';
    const anoSel = document.getElementById('saudeFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('saudeFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroSaudeMes', 'btnFiltroSaudeTrimestre', 'btnFiltroSaudeAno', 'btnFiltroSaudeTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroSaudeMes', trimestre: 'btnFiltroSaudeTrimestre', ano: 'btnFiltroSaudeAno', todos: 'btnFiltroSaudeTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderSaudePanel();
}

function onSaudeFiltroAnoMesChange() {
    saudeFiltroAno = document.getElementById('saudeFiltroAno').value;
    saudeFiltroMes = document.getElementById('saudeFiltroMes').value;
    if (saudeFiltroAno) {
        ['btnFiltroSaudeMes', 'btnFiltroSaudeTrimestre', 'btnFiltroSaudeAno', 'btnFiltroSaudeTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderSaudePanel();
}

async function loadSaudeData() {
    try {
        // A matriz do PCMSO precisa estar aplicada ANTES de qualquer render da saúde,
        // porque PCMSO_EXAMES_POR_GHE é lida de forma síncrona por várias funções.
        // Sem a tabela no Supabase, esta chamada não falha: mantém a matriz do código.
        if (typeof carregarMatrizPcmsoExames === 'function') {
            await carregarMatrizPcmsoExames();
        }
        const [asoRows, atestadoRows, pressaoRows] = await Promise.all([
            supabaseFetch('aso_exames', '?select=*'),
            supabaseFetch('atestados_ocupacionais', '?select=*'),
            supabaseFetch('pressao_arterial', '?select=*')
        ]);
        allAsoExames = asoRows;
        allAtestadosOcupacionais = atestadoRows;
        allPressaoArterial = pressaoRows;
        // Precisa do efetivo (quem está ativo hoje), da configuração de dias trabalhados
        // (denominador da HHT) e dos acidentes (dias perdidos por acidente também contam
        // no absenteísmo ocupacional) - carrega tudo que ainda não tiver sido carregado.
        if (allEfetivo.length === 0) allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        if (Object.keys(hhtDiasTrabalhadosMap).length === 0) {
            const diasTrabalhadosRows = await supabaseFetch('hht_dias_trabalhados', '?select=*');
            diasTrabalhadosRows.forEach(r => { hhtDiasTrabalhadosMap[r.id] = r; });
        }
        if (allAcidentes.length === 0) allAcidentes = await supabaseFetch('acidentes', '?select=*');
        if (!allColaboradoresFerias || allColaboradoresFerias.length === 0) {
            try {
                allColaboradoresFerias = await supabaseFetch('colaboradores_ferias', '?select=*&order=limite_concessivo_fatal.asc');
                window.allColaboradoresFerias = allColaboradoresFerias;
            } catch (errF) {
                console.warn('Aviso ao carregar colaboradores_ferias na saúde:', errF);
            }
        }
        window.allAsoExames = allAsoExames;
        window.allAtestadosOcupacionais = allAtestadosOcupacionais;
        window.allEfetivo = allEfetivo;
        window.allColaboradoresFerias = allColaboradoresFerias;

        popularSaudeColabDatalists();
        renderSaudePanel();

        // Se a subaba de recomendações/exames estiver ativa, re-renderiza com os dados atualizados
        const btnRecActive = document.getElementById('saudeSubtabBtn-recomendacoes')?.classList.contains('active');
        const tabRecVisible = document.getElementById('saudeSubtab-recomendacoes')?.style.display !== 'none';
        if (btnRecActive || tabRecVisible) {
            if (typeof renderRecomendacaoPsicossocial === 'function') {
                renderRecomendacaoPsicossocial();
            }
        }
    } catch (err) {
        console.error('Erro ao carregar dados de saúde ocupacional:', err);
    }
}

function popularSaudeColabDatalists() {
    ['asoColabList', 'atestadoColabList', 'pressaoColabList'].forEach(dlId => {
        const dl = document.getElementById(dlId);
        if (!dl || dl.options.length > 0) return;
        allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
            const opt = document.createElement('option');
            opt.value = `${e.id} - ${e.nome}`;
            dl.appendChild(opt);
        });
    });
}

function buscarColaboradorPorInput(inputId) {
    const raw = document.getElementById(inputId).value;
    const matricula = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
    return { matricula, colab: allEfetivo.find(e => e.id === matricula) };
}

// ============================================
// EXAMES EXIGIDOS POR GHE, extraídos do relatório oficial da clínica responsável pelo
// PCMSO (Clinica Engmed, "EXAMES RECOMENDADOS" por Cargo/Função - fonte mais granular e
// precisa que o próprio corpo do PCMSO, que só mostra a tabela agregada por grupo).
// Conferido cargo a cargo dentro de cada grupo: dentro do mesmo GHE, todo cargo faz a
// mesma lista de exames (a tabela é por grupo de risco, não por cargo individual) -
// confirmado comparando vários cargos do mesmo grupo entre si. `periodicidade` em
// meses (null = só no admissional, sem ciclo periódico próprio). `demissional` indica
// se o exame também é exigido no desligamento. Validado ainda contra um ASO real
// emitido (Grupo 13 - Engenheiro de segurança do trabalho: Avaliação clínica +
// Audiometria + Glicose + Hemograma, todos 12 meses) - bateu exatamente.
// ============================================

var PCMSO_EXAMES_POR_GHE = {
    G01: { nome: 'Vigilância Patrimonial', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true }
    ]},
    G02: { nome: 'Almoxarifado', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true }
    ]},
    G03: { nome: 'Administrativo', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 24, demissional: true }
    ]},
    G04: { nome: 'Analista de Sistemas Mecânicos e Elétricos', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G05: { nome: 'Manutenção Elétrica', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: false }
    ]},
    G06: { nome: 'Manutenção Mecânica', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: false }
    ]},
    G07: { nome: 'Manutenção Civil', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: false },
        { nome: 'IgE Específica - Abelha', periodicidade: null, demissional: false },
        { nome: 'Raio X de Tórax (Padrão OIT)', periodicidade: 60, demissional: true }
    ]},
    G08: { nome: 'Motosserras e Roçadeiras', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: false },
        { nome: 'IgE Específica - Abelha', periodicidade: null, demissional: false }
    ]},
    G09: { nome: 'Motorista de Veículos Leve', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G10: { nome: 'Operador de Sistemas Hídricos', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G11: { nome: 'Operador de Máquinas', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: null, demissional: false }
    ]},
    G12: { nome: 'Motorista Pesado', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: null, demissional: false }
    ]},
    G13: { nome: 'Segurança do Trabalho', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G14: { nome: 'Serviços Gerais', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G15: { nome: 'Motorista de Caminhão Comboio', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: true }
    ]},
    G16: { nome: 'Medicina do Trabalho', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 24, demissional: true }
    ]},
    G17: { nome: 'Lava Jato', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G18: { nome: 'Oficina de Pintura', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G19: { nome: 'Carpintaria', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 12, demissional: true },
        { nome: 'Raio X de Tórax (Padrão OIT)', periodicidade: 60, demissional: true }
    ]},
    G20: { nome: 'Segurança de Barragem', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G21: { nome: 'Topografia', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G22: { nome: 'PCM', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true }
    ]},
    G23: { nome: 'Planejamento Civil', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true }
    ]},
    G24: { nome: 'Sala Técnica', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true }
    ]},
    G25: { nome: 'Operador de Subestação', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true }
    ]},
    G26: { nome: 'Conservação e Limpeza Substação e Faixa de Servidão', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
        { nome: 'Espirometria', periodicidade: 24, demissional: true },
        { nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: true }
    ]},
    G27: { nome: 'Inspeção e Monitoramento de Estruturas', exames: [
        { nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true },
        { nome: 'Audiometria', periodicidade: 12, demissional: true },
        { nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
        { nome: 'Glicose', periodicidade: 12, demissional: true },
        { nome: 'IgE Específica - Abelha', periodicidade: null, demissional: false }
    ]}
};

// Mapa (setor + função reais do cadastro de efetivo) -> GHE do PCMSO. Não dá pra
// resolver isso só pelo campo "setor": setores como "OPERAÇÃO" e "TRANSPORTE" no
// cadastro do efetivo, na prática, misturam colaboradores de GHEs bem diferentes do
// PCMSO (ex: "OPERAÇÃO" tem tanto Operador de Sistemas Hídricos quanto Operador de
// Subestação - grupos com exames diferentes) - confirmado cruzando setor+função reais
// via SQL antes de montar este mapa. Chave normalizada "SETOR||FUNÇÃO" (maiúsculas).
var PCMSO_SETOR_FUNCAO_GHE = {
    'ADMINISTRATIVO||AUX. ADMINISTRATIVO': 'G03',
    'ADMINISTRATIVO||AUX. SERVIÇOS GERAIS': 'G03',
    'ADMINISTRATIVO||AUXILIAR DE ALMOXARIFADO': 'G02',
    'ADMINISTRATIVO||AUXILIAR DE INFORMÁTICA': 'G03',
    'ADMINISTRATIVO||SECRETARIA': 'G03',
    'ANALISTA DE SISTEMAS MECÂNICOS E ELÉTRICOS||ENGENHEIRO MECÂNICO': 'G04',
    'CONSERVAÇÃO E LIMPEZA||ENCARREGADO DE CAMPO': 'G26',
    'CONSERVAÇÃO E LIMPEZA||MOTORISTA DE VEICULO PESADO': 'G12',
    'CONSERVAÇÃO E LIMPEZA||OPERADOR DE MOTOSSERRA': 'G08',
    'CONSERVAÇÃO E LIMPEZA||SERVENTE': 'G26',
    'MANUTENÇÃO CIVIL||ENC. DE CAMPO': 'G07',
    'MANUTENÇÃO CIVIL||ENCARREGADO DE CAMPO': 'G07',
    'MANUTENÇÃO CIVIL||ENGENHEIRO CIVIL': 'G23',
    'MANUTENÇÃO CIVIL||MOTORISTA DE VEICULO PESADO': 'G12',
    'MANUTENÇÃO CIVIL||OPERADOR DE MAQUINAS': 'G11',
    'MANUTENÇÃO CIVIL||PEDREIRO': 'G07',
    'MANUTENÇÃO CIVIL||SERVENTE': 'G07',
    'MANUTENÇÃO ELÉTRICA||ASSISTENTE DE CAMPO': 'G05',
    'MANUTENÇÃO ELÉTRICA||SERVENTE': 'G05',
    'MANUTENÇÃO ELÉTRICA||TÉCNICO DE MANUTENÇÃO ELÉTRICA': 'G05',
    'MANUTENÇÃO MECÂNICA||ASSISTENTE DE CAMPO': 'G06',
    'MANUTENÇÃO MECÂNICA||ENC. DE MANUTENÇÃO MECÂNICA': 'G06',
    'MANUTENÇÃO MECÂNICA||TÉCNICO DE MANUTENÇÃO ELÉTRICA': 'G06',
    'MANUTENÇÃO MECÂNICA||TECNICO MANUTENÇÃO MECÂNICA': 'G06',
    'MEDICINA DO TRABALHO||TEC. ENFERMEIRO DO TRABALHO': 'G16',
    'OPERAÇÃO||ENC. DE OPERAÇÃO': 'G10',
    'OPERAÇÃO||OPERADOR DE SISTEMAS HIDRICOS': 'G10',
    'OPERAÇÃO||OPERADOR DE SUBESTAÇÃO': 'G25',
    'OPERADOR DE SISTEMAS HIDRICOS||OPERADOR DE SISTEMAS HIDRICOS': 'G10',
    'OPERADOR DE SUBESTAÇÃO||OPERADOR DE SUBESTAÇÃO': 'G25',
    'PCM||ANALISTA DE SISTEMAS ELÉTRICOS': 'G22',
    'PCM||ASSISTENTE DE CAMPO': 'G22',
    'PCM||TECNICO': 'G22',
    'PLANEJAMENTO||ANALISTA DE PLANEJAMENTO JUNIOR': 'G23',
    'PLANEJAMENTO||ENGENHEIRO CIVIL': 'G23',
    'SALA TECNICA||TECNICO': 'G24',
    'SEG. BARRAGEM||ASSISTENTE SOCIAL': 'G20',
    'SEG. BARRAGEM||AUXILIAR DE TOPOGRAFIA': 'G20',
    'SEG. BARRAGEM||LEITURISTA': 'G20',
    'SEGURANÇA DO TRABALHO||ASSISTENTE DE CAMPO': 'G13',
    'SEGURANÇA DO TRABALHO||ENGENHEIRO DE SEGURANÇA DO TRABALHO': 'G13',
    'SEGURANÇA DO TRABALHO||TÉC. SEG. TRABALHO': 'G13',
    'TOPOGRAFIA||AUXILIAR DE TOPOGRAFIA': 'G21',
    'TOPOGRAFIA||LEITURISTA': 'G21',
    'TOPOGRAFIA||TOPÓGRAFO': 'G21',
    'TRANSPORTE||MOTORISTA DE VEICULO PESADO': 'G12',
    'TRANSPORTE||OPERADOR DE MAQUINAS': 'G11',
    'VIGILÂNCIA||VIGIA - DIURNO': 'G01',
    'VIGILÂNCIA||VIGIA - NOTURNO': 'G01'
};

// Resolve os exames exigidos pelo PCMSO pra um colaborador. Prioriza o campo
// colaboradores_efetivo.ghe (mantido corretamente no cadastro) - só cai no fallback por
// setor+função (PCMSO_SETOR_FUNCAO_GHE) quando esse campo está vazio, pra manter
// compatibilidade com cadastros antigos ainda não preenchidos. Isso é necessário porque
// a equipe/setor atual do colaborador nem sempre bate com o GHE real dele: equipes podem
// ser formadas com colaboradores de vários setores/funções diferentes (ex: alguém
// classificado como GHE 14 - Serviços Gerais, mas hoje atuando na equipe de Manutenção
// Elétrica), então inferir o GHE por setor+função erra nesses casos.
// Retorna null quando não dá pra resolver de nenhuma forma (colab.ghe vazio e a
// combinação setor+função também não está mapeada ainda) - nesse caso a tela deve avisar
// que precisa mapear manualmente, não fabricar um GHE genérico.
function examesGheColaborador(colab) {
    if (!colab) return null;
    const gheRaw = String(colab.ghe || '').trim().toUpperCase();
    if (gheRaw) {
        const numero = gheRaw.startsWith('G') ? gheRaw.slice(1) : gheRaw;
        const grupoId = `G${normalizarGhe(numero)}`;
        return PCMSO_EXAMES_POR_GHE[grupoId] ? { grupoId, ...PCMSO_EXAMES_POR_GHE[grupoId] } : null;
    }
    const chave = `${(colab.setor || '').trim().toUpperCase()}||${(colab.funcao || '').trim().toUpperCase()}`;
    const grupoId = PCMSO_SETOR_FUNCAO_GHE[chave];
    if (!grupoId) return null;
    return { grupoId, ...PCMSO_EXAMES_POR_GHE[grupoId] };
}

// Periodicidade do exame periódico (Avaliação clínica ocupacional) pro colaborador -
// resolve pela lista de exames do GHE dele quando setor+função estão mapeados
// (PCMSO_SETOR_FUNCAO_GHE); cai no fallback binário (24 meses só pra Administrativo e
// Medicina do Trabalho, 12 pro resto) quando a combinação setor+função ainda não foi
// mapeada - evitando travar o formulário pra um colaborador novo com cargo/setor não
// visto antes, mas sem fingir uma precisão que não existe nesse caso.
function periodicidadeAsoPeriodico(colab) {
    const ghe = examesGheColaborador(colab);
    if (ghe) {
        const avalClinica = ghe.exames.find(e => e.nome === 'Avaliação clínica ocupacional');
        if (avalClinica && avalClinica.periodicidade) return avalClinica.periodicidade;
    }
    const setor = (colab?.setor || '').trim().toUpperCase();
    return (setor === 'ADMINISTRATIVO' || setor === 'MEDICINA DO TRABALHO') ? 24 : 12;
}

function addMeses(dataStr, meses) {
    if (!dataStr) return '';
    const d = parseLocalDate(dataStr);
    const resultado = new Date(d.getFullYear(), d.getMonth() + meses, d.getDate());
    return resultado.toISOString().split('T')[0];
}

function addDias(dataStr, dias) {
    if (!dataStr) return '';
    const d = parseLocalDate(dataStr);
    d.setDate(d.getDate() + dias);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterFimDoMes(dataStr) {
    if (!dataStr) return '';
    const d = parseLocalDate(dataStr);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
}

function onAsoColaboradorChange() {
    const { colab } = buscarColaboradorPorInput('asoForm_matricula');
    document.getElementById('asoForm_colabPreview').textContent = colab ? `✓ ${colab.nome} — ${colab.funcao || ''} — ${colab.setor || ''}` : '';
    renderExamesExigidosAso(colab);
    onAsoTipoOuDataChange();
}

// Mostra a lista completa de exames que o PCMSO exige pro GHE/função do colaborador
// selecionado (não só a Avaliação clínica) - ajuda o admin a saber quais exames
// complementares pedir/conferir ao agendar o ASO, não só a data de vencimento.
// Renderiza os exames exigidos pelo GHE como checklist (não só texto) - cada checkbox
// controla se aquele exame específico entra no exames_detalhe salvo (ver salvarAso()),
// que registra a data de vencimento de CADA exame individualmente. Sem isso, a Previsão
// de Exames só conseguia assumir que todos os exames do GHE vencem juntos (quando na
// prática exames com periodicidade > 12 meses, como Espirometria a cada 24, vencem no
// próprio ciclo, não a cada ASO periódico) - usuário pediu explicitamente por isso depois
// de ver a Previsão superestimando exames de ciclo mais longo. Todos marcados por padrão
// (mantém o comportamento assumido até aqui); desmarque só quando um exame específico
// não foi feito nessa consulta.
function renderExamesExigidosAso(colab) {
    const el = document.getElementById('asoForm_examesExigidos');
    if (!el) return;
    if (!colab) { el.innerHTML = ''; return; }
    const ghe = examesGheColaborador(colab);
    if (!ghe) {
        el.innerHTML = `<div style="font-size:11.5px; color:var(--warning);">⚠️ GHE não identificado pra "${escapeHTML(colab.setor || '—')} / ${escapeHTML(colab.funcao || '—')}" - lista de exames do PCMSO não disponível pra esse cargo ainda.</div>`;
        return;
    }
    const linhas = ghe.exames.map(e => {
        const periodicidadeTxt = e.periodicidade ? `a cada ${e.periodicidade} meses` : 'só no admissional';
        return `<label style="display:flex; align-items:center; gap:6px; padding:2px 0; cursor:pointer;">
            <input type="checkbox" class="asoExameCheckbox" data-nome="${escapeHTML(e.nome)}" data-periodicidade="${e.periodicidade || ''}" checked style="width:15px; height:15px; flex-shrink:0;">
            <span>${escapeHTML(e.nome)} (${periodicidadeTxt}${e.demissional ? ', também no demissional' : ''})</span>
        </label>`;
    }).join('');
    el.innerHTML = `<div style="font-size:11.5px; color:var(--text-light); margin-top:6px; padding:8px 10px; background:var(--bg); border-radius:8px;">
        <strong>📋 Exames desta consulta — GHE ${escapeHTML(ghe.grupoId)}: ${escapeHTML(ghe.nome)}</strong>
        <div style="font-size:10.5px; margin: 2px 0 6px;">Desmarque se algum exame não foi feito nesta consulta específica - isso ajuda a Previsão de Exames a saber exatamente quando cada um vence.</div>
        <div style="margin-top:4px;">${linhas}</div>
    </div>`;
}

// Ao editar um exame ASO já salvo com exames_detalhe (feature nova - registros antigos
// não têm isso), desmarca as caixinhas dos exames que NÃO estavam na lista salva. Se o
// registro é antigo (exames_detalhe null/vazio), deixa tudo marcado - mesma suposição já
// usada antes dessa feature existir, sem regressão pros dados históricos.
function aplicarExamesDetalheAoForm(examesDetalhe) {
    if (!Array.isArray(examesDetalhe) || examesDetalhe.length === 0) return;
    const nomesSalvos = new Set(examesDetalhe.map(e => e.nome));
    document.querySelectorAll('#asoForm_examesExigidos .asoExameCheckbox').forEach(cb => {
        cb.checked = nomesSalvos.has(cb.dataset.nome);
    });
}

// Sugere a data de vencimento (próximo exame devido) automaticamente a partir da
// periodicidade real do GHE do colaborador - não se aplica ao demissional, que é
// terminal (não há "próximo exame" a aguardar). O campo continua editável manualmente
// pra cobrir os casos em que o médico responsável decidiu antecipar/postergar (a
// própria NR-07 permite até 45 dias de ajuste a critério médico).
function onAsoTipoOuDataChange() {
    const tipo = document.getElementById('asoForm_tipo').value;
    const dataExame = document.getElementById('asoForm_dataExame').value;
    const hintEl = document.getElementById('asoForm_periodicidadeHint');
    if (!dataExame || !tipo || tipo === 'demissional') {
        if (hintEl) hintEl.textContent = '';
        return;
    }
    const { colab } = buscarColaboradorPorInput('asoForm_matricula');
    if (!colab) {
        if (hintEl) hintEl.textContent = '';
        return;
    }
    const meses = periodicidadeAsoPeriodico(colab);
    document.getElementById('asoForm_dataVencimento').value = addMeses(dataExame, meses);
    const ghe = examesGheColaborador(colab);
    hintEl && (hintEl.textContent = ghe
        ? `GHE ${ghe.grupoId} - ${ghe.nome}: periodicidade de ${meses} meses (PCMSO)`
        : `GHE não mapeado pra "${colab.setor || '—'}" - usando periodicidade padrão de ${meses} meses`);
}

function onAtestadoColaboradorChange() {
    const { colab } = buscarColaboradorPorInput('atestadoForm_matricula');
    document.getElementById('atestadoForm_colabPreview').textContent = colab ? `✓ ${colab.nome} — ${colab.funcao || ''} — ${colab.setor || ''}` : '';
}

function onAtestadoDatasChange() {
    const inicio = document.getElementById('atestadoForm_dataInicio').value;
    const fim = document.getElementById('atestadoForm_dataFim').value;
    if (!inicio || !fim) return;
    const dIni = parseLocalDate(inicio), dFim = parseLocalDate(fim);
    const dias = Math.round((dFim.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (dias > 0) document.getElementById('atestadoForm_dias').value = dias;
}

// Status de ASO do colaborador = calculado a partir do exame mais recente (qualquer
// tipo) por data_exame. "sem_registro" cobre tanto quem nunca teve exame lançado quanto
// quem tem exame mas sem data de vencimento preenchida (não dá pra avaliar sem isso).
function ehRegistroAsoGeralPcmso(a) {
    if (!a || !a.data_exame) return false;
    const t = String(a.tipo_aso || '').toLowerCase();
    const id = String(a.id || '');
    if (t.includes('psico') || id.startsWith('ASO_PSICO_')) return false;
    return true;
}

function calcularStatusAsoColaborador(matricula) {
    const matStr = String(matricula || '').trim();
    const todos = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === matStr && a.data_exame);
    const gerais = todos.filter(ehRegistroAsoGeralPcmso);
    const exames = gerais.length > 0 ? gerais : todos;
    if (exames.length === 0) return { status: 'sem_registro', ultimoExame: null, diffDays: null };
    const ultimo = exames.reduce((max, a) => parseLocalDate(a.data_exame) > parseLocalDate(max.data_exame) ? a : max, exames[0]);
    if (!ultimo.data_vencimento) return { status: 'sem_registro', ultimoExame: ultimo, diffDays: null };

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = parseLocalDate(ultimo.data_vencimento); venc.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const status = diffDays < 0 ? 'vencido' : (diffDays <= 30 ? 'vencendo' : 'em_dia');
    return { status, ultimoExame: ultimo, diffDays };
}

// ============================================
// PREVISÃO DE EXAMES DO MÊS - pra responder "quantos exames e quais tipos" quando o
// financeiro pergunta, sem precisar contar GHE por GHE na mão. Reaproveita a mesma
// data_vencimento já usada no bucket vencido/vencendo/em_dia (calcularStatusAsoColaborador)
// e a lista de exames por GHE (examesGheColaborador/PCMSO_EXAMES_POR_GHE) - a mesma lógica
// que já mostra "exames exigidos" no formulário de registro de ASO, só que agregada por
// mês em vez de por colaborador individual.
// ============================================

var previsaoExamesAno = null;
var previsaoExamesMes = null;
// Guarda o último resultado calculado por renderPrevisaoExames (mesma lista que já
// alimenta "Colaboradores e Exames Exigidos") pro relatório de líderes reaproveitar sem
// recalcular vencimento nenhum - só reagrupa (por líder ou setor) e reformata como texto/PDF.
var previsaoExamesUltimoResultado = null;

function popularFiltroPrevisaoExames() {
    const hoje = new Date();
    if (previsaoExamesAno === null) previsaoExamesAno = hoje.getFullYear();
    if (previsaoExamesMes === null) previsaoExamesMes = hoje.getMonth();
    const selAno = document.getElementById('previsaoExamesAno');
    const selMes = document.getElementById('previsaoExamesMes');
    if (selAno && !selAno.value) selAno.value = String(previsaoExamesAno);
    if (selMes && selMes.value === '') selMes.value = String(previsaoExamesMes);
}

function onPrevisaoExamesFiltroChange() {
    const selAno = document.getElementById('previsaoExamesAno');
    const selMes = document.getElementById('previsaoExamesMes');
    previsaoExamesAno = parseInt(selAno.value, 10);
    previsaoExamesMes = parseInt(selMes.value, 10);
    renderPrevisaoExames();
}

// Pra cada exame de um GHE, procura no histórico de aso_exames do colaborador (mais
// recente primeiro) um exames_detalhe com esse nome - ou seja, uma consulta anterior onde
// esse exame específico foi de fato marcado como realizado. Isso dá o vencimento REAL
// daquele exame (data_exame + periodicidade dele mesmo), em vez de assumir que ele vence
// junto com o ciclo geral do ASO. Retorna null se não há histórico detalhado ainda -
// nesse caso quem chama cai de volta pro vencimento geral do ASO (ver renderPrevisaoExames).
function vencimentoRealDoExame(matricula, nomeExame) {
    const historico = allAsoExames
        .filter(a => a.matricula === matricula && a.data_exame && Array.isArray(a.exames_detalhe))
        .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));
    for (const registro of historico) {
        const encontrado = registro.exames_detalhe.find(e => e.nome === nomeExame && e.data_vencimento);
        if (encontrado) return encontrado.data_vencimento;
    }
    return null;
}

function renderPrevisaoExames() {
    popularFiltroPrevisaoExames();
    const ano = previsaoExamesAno, mes = previsaoExamesMes;
    document.getElementById('previsaoExamesTitulo').textContent = `${NOMES_MESES[mes]} de ${ano}`;

    const ativos = allEfetivo.filter(colaboradorEstaAtivo);
    const comGhe = []; // colaboradores com GHE - exames vencendo calculados individualmente
    let semGheCount = 0;

    ativos.forEach(colab => {
        const { ultimoExame } = calcularStatusAsoColaborador(colab.id);
        const vencimentoGeral = ultimoExame?.data_vencimento || null;
        const ghe = examesGheColaborador(colab);

        if (!ghe) {
            // Sem GHE identificado não dá pra saber quais exames específicos aplicam - só
            // conta pro aviso, igual antes, usando o vencimento geral do ASO como sinal de
            // que esse colaborador tem algo pendente nesse mês.
            if (vencimentoGeral) {
                const venc = parseLocalDate(vencimentoGeral);
                if (venc.getFullYear() === ano && venc.getMonth() === mes) semGheCount++;
            }
            return;
        }

        // periodicidade null = exame só no admissional (ex: IgE Específica - Abelha) - não
        // se repete num ciclo periódico, não entra na previsão de um ASO periódico.
        const examesDoMes = [];
        ghe.exames.filter(e => e.periodicidade).forEach(exameReq => {
            const vencReal = vencimentoRealDoExame(colab.id, exameReq.nome);
            const vencimentoUsado = vencReal || vencimentoGeral;
            if (!vencimentoUsado) return;
            const venc = parseLocalDate(vencimentoUsado);
            if (venc.getFullYear() !== ano || venc.getMonth() !== mes) return;
            examesDoMes.push({ nome: exameReq.nome, periodicidade: exameReq.periodicidade, certeza: !!vencReal, vencimento: vencimentoUsado });
        });

        if (examesDoMes.length > 0) comGhe.push({ colab, ghe, exames: examesDoMes });
    });
    comGhe.sort((a, b) => (a.colab.nome || '').localeCompare(b.colab.nome || ''));

    // certezaCount < count = pelo menos um colaborador não tem histórico detalhado desse
    // exame específico ainda (registro antigo, ou consulta anterior sem exames_detalhe) -
    // aí a contagem cai de volta pro vencimento geral do ASO como estimativa, sinalizada
    // visualmente em vez de apresentada com a mesma certeza dos exames já rastreados.
    const contagemExames = {};
    comGhe.forEach(({ exames }) => {
        exames.forEach(e => {
            if (!contagemExames[e.nome]) contagemExames[e.nome] = { count: 0, certezaCount: 0, periodicidade: e.periodicidade };
            contagemExames[e.nome].count++;
            if (e.certeza) contagemExames[e.nome].certezaCount++;
        });
    });
    const totalExameSlots = Object.values(contagemExames).reduce((s, info) => s + info.count, 0);

    document.getElementById('kpiPrevisaoColaboradores').textContent = comGhe.length;
    document.getElementById('kpiPrevisaoTiposExame').textContent = Object.keys(contagemExames).length;
    document.getElementById('kpiPrevisaoTotalExames').textContent = totalExameSlots;

    const tabelaEl = document.getElementById('previsaoExamesTabela');
    const examesSorted = Object.entries(contagemExames).sort((a, b) => b[1].count - a[1].count);
    if (examesSorted.length === 0) {
        tabelaEl.innerHTML = '<div class="db-list-empty">Nenhum exame previsto para este mês.</div>';
    } else {
        tabelaEl.innerHTML = examesSorted.map(([nome, info]) => {
            const semCerteza = info.count - info.certezaCount;
            return `<div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div class="db-list-item-title" style="margin-bottom:0;">${escapeHTML(nome)}</div>
                    ${semCerteza > 0 ? `<div class="db-list-item-sub" style="color:var(--warning);">${semCerteza} de ${info.count} sem histórico detalhado (ciclo de ${info.periodicidade} meses) — confirmar antes de agendar</div>` : ''}
                </div>
                <div style="font-size: 16px; font-weight: 700; color: var(--primary);">${info.count}</div>
            </div>`;
        }).join('');
    }

    const detalheEl = document.getElementById('previsaoExamesDetalhe');
    if (comGhe.length === 0 && semGheCount === 0) {
        detalheEl.innerHTML = '<div class="db-list-empty">Nenhum colaborador com exame vencendo neste mês.</div>';
    } else {
        detalheEl.innerHTML = comGhe.map(({ colab, ghe, exames }) => {
            const examesTxt = exames.map(e => e.certeza ? e.nome : `${e.nome} (a confirmar)`).join(', ');
            return `<div class="db-list-item">
                <div class="db-list-item-title">${escapeHTML(colab.nome)} — ${escapeHTML(colab.funcao || '')}</div>
                <div class="db-list-item-sub">GHE ${escapeHTML(ghe.grupoId)}: ${escapeHTML(ghe.nome)}</div>
                <div class="db-list-item-sub">${escapeHTML(examesTxt)}</div>
            </div>`;
        }).join('');
    }

    if (semGheCount > 0) {
        document.getElementById('previsaoExamesAviso').textContent = `⚠️ ${semGheCount} colaborador(es) sem GHE identificado - não entram na contagem por tipo de exame acima.`;
    } else {
        document.getElementById('previsaoExamesAviso').textContent = '';
    }

    previsaoExamesUltimoResultado = { ano, mes, comGhe };
    // Fecha o modal de relatório se estiver aberto - trocar o mês/ano invalida o conteúdo
    // gerado antes, então é mais seguro fechar do que arriscar mostrar dado de outro mês.
    fecharRelatorioLideresModal();
}

// ============================================
// RELATÓRIO PARA LÍDERES - agrupa a mesma lista já calculada acima (previsaoExamesUltimoResultado)
// pelo líder (colaboradores_efetivo.responsavel) ou pelo setor de cada colaborador, pra
// gerar o aviso mensal que o engenheiro de segurança hoje escreve à mão pra cada líder.
// Não recalcula vencimento nem GHE - só reagrupa e reformata o que renderPrevisaoExames já
// resolveu. Dois modos: "individual" (um bloco/PDF por líder, pra e-mails separados) e
// "geral" (um único documento com todas as seções, pra um e-mail com todos os líderes em
// cópia - nesse modo o usuário escolhe se agrupa por líder ou por setor).
// ============================================

var RELATORIO_CAMPO_INFO = {
    responsavel: {
        rotulo: 'líder',
        avisoSemValorTitulo: '⚠️ Sem líder definido - revisar cadastro',
        avisoSemValorTexto: 'sem líder/responsável definido no cadastro (revisar em Efetivo)'
    },
    setor: {
        rotulo: 'setor',
        avisoSemValorTitulo: '⚠️ Sem setor definido - revisar cadastro',
        avisoSemValorTexto: 'sem setor definido no cadastro (revisar em Efetivo)'
    }
};

var previsaoExamesRelatorioModo = 'individual'; // 'individual' | 'geral'
var previsaoExamesRelatorioCriterio = 'responsavel'; // 'responsavel' | 'setor' - só usado no modo geral
var previsaoExamesLideresGrupos = []; // grupos do modo individual, indexados pros botões copiar/baixar
var previsaoExamesRelatorioGeral = null; // { texto, mesLabel, campo, grupos, aberturaTopo } do modo geral

// Colaboradores sem o campo escolhido preenchido caem num grupo à parte em vez de sumir
// da lista - usuário pediu explicitamente pra não perder esses casos silenciosamente.
function agruparPrevisaoExamesPorCampo(comGhe, campo) {
    const grupos = new Map();
    comGhe.forEach(({ colab, exames }) => {
        const valor = (colab[campo] || '').trim();
        const chave = valor || '__sem_valor__';
        if (!grupos.has(chave)) grupos.set(chave, { nome: valor, semValor: !valor, colaboradores: [] });
        grupos.get(chave).colaboradores.push({
            nome: colab.nome || '',
            funcao: colab.funcao || '',
            setor: colab.setor || '',
            exames: exames.map(e => ({ nome: e.nome, vencimento: e.vencimento }))
        });
    });
    const semValor = grupos.get('__sem_valor__');
    grupos.delete('__sem_valor__');
    const ordenados = Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    if (semValor) ordenados.push(semValor);
    return ordenados;
}

function linhasColaboradoresTexto(colaboradores) {
    return colaboradores.map(c => {
        const examesTxt = c.exames.map(e => `${e.nome} — vence em ${formatSimpleDate(e.vencimento)}`).join('; ');
        return `- ${c.nome} — ${c.funcao || '—'} — ${c.setor || '—'} — ${examesTxt}`;
    }).join('\n');
}

function linhasParaTabelaPdf(colaboradores) {
    const linhas = [];
    colaboradores.forEach(c => {
        c.exames.forEach(e => linhas.push({ nome: c.nome, funcao: c.funcao, setor: c.setor, exame: e.nome, vencimento: formatSimpleDate(e.vencimento) }));
    });
    return linhas;
}

function formatarTextoGrupoIndividual(grupo, mesLabel) {
    const info = RELATORIO_CAMPO_INFO.responsavel;
    const abertura = grupo.semValor
        ? `⚠️ Colaboradores ${info.avisoSemValorTexto} — exame periódico previsto para ${mesLabel}:`
        : `Prezado(a) ${grupo.nome}, segue a relação de colaboradores da sua equipe com exame periódico previsto para ${mesLabel}. Favor se programar para a ausência do(s) colaborador(es) no dia do exame.`;
    return `${abertura}\n\n${linhasColaboradoresTexto(grupo.colaboradores)}`;
}

function formatarSecaoTexto(titulo, colaboradores) {
    const linha = '─'.repeat(44);
    return `${linha}\n${titulo}\n${linha}\n${linhasColaboradoresTexto(colaboradores)}`;
}

// Mesmo padrão de blob+<a>+window.print() de gerarPdfEfetivo() - "PDF" é o navegador
// imprimindo/salvando essa página HTML, não uma lib de PDF (o painel não carrega jsPDF).
// `secoes` é um array de { titulo, abertura?, linhas } - uma por líder/setor; no modo
// individual vem só uma seção, no modo geral vêm todas em sequência (com quebra de página
// entre elas, pra cada líder achar a página dele fácil se imprimir o PDF inteiro).
function construirHtmlRelatorioPdf(tituloDoc, mesLabel, aberturaTopo, secoes) {
    const agora = new Date();
    const blocos = secoes.map((s, i) => `
        <div class="secao"${i > 0 ? ' style="page-break-before:always;"' : ''}>
            <div class="secao-titulo">${escapeHTML(s.titulo)}</div>
            ${s.abertura ? `<div class="abertura">${escapeHTML(s.abertura)}</div>` : ''}
            <table>
                <thead><tr><th>Colaborador</th><th>Função</th><th>Setor</th><th>Exame</th><th>Vencimento</th></tr></thead>
                <tbody>${s.linhas.map(l => `<tr><td>${escapeHTML(l.nome)}</td><td>${escapeHTML(l.funcao || '—')}</td><td>${escapeHTML(l.setor || '—')}</td><td>${escapeHTML(l.exame)}</td><td>${escapeHTML(l.vencimento)}</td></tr>`).join('')}</tbody>
            </table>
        </div>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${escapeHTML(tituloDoc)} - ${escapeHTML(mesLabel)}</title>
<style>
    @page { size: portrait; margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 20px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:15px; text-align:center; flex:1; }
    .info-geracao { font-size:10.5px; color:#444; margin-bottom:12px; }
    .abertura-topo { font-size:11.5px; margin-bottom:16px; white-space:pre-wrap; padding-bottom:10px; border-bottom:1px dashed #999; }
    .secao { margin-bottom:22px; }
    .secao-titulo { font-weight:700; font-size:13px; background:#eef0ff; padding:6px 10px; border-radius:6px; margin-bottom:6px; }
    .abertura { font-size:11.5px; margin-bottom:10px; white-space:pre-wrap; }
    table { width:100%; border-collapse:collapse; font-size:10.5px; }
    th, td { border:1px solid #999; padding:5px 7px; text-align:left; }
    th { background:#e5e5e5; }
    tbody tr:nth-child(even) { background:#f7f7f7; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    @media print { .no-print { display:none; } body { margin:0; } thead { display: table-header-group; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo">${escapeHTML(tituloDoc)}</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Referência: ${escapeHTML(mesLabel)} — Gerado em ${formatSimpleDate(agora.toISOString().slice(0, 10))} às ${agora.toLocaleTimeString('pt-BR')}</div>
    ${aberturaTopo ? `<div class="abertura-topo">${escapeHTML(aberturaTopo)}</div>` : ''}
    ${blocos}
</body></html>`;
}

function abrirRelatorioLideresModal() {
    const overlay = document.getElementById('relatorioLideresModalOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    const dados = previsaoExamesUltimoResultado;
    document.getElementById('relatorioLideresModalMes').textContent = dados ? `${NOMES_MESES[dados.mes]} de ${dados.ano}` : '';
    renderRelatorioLideresConteudo();
}

function fecharRelatorioLideresModal() {
    const overlay = document.getElementById('relatorioLideresModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// MODAL DE ANEXOS (DDSMA/Treinamentos) - Google Drive
// Anexa PDFs escaneados (com assinaturas de campo) e fotos de comprovação
// guardando o arquivo no Google Drive do responsável (integração via OAuth -
// ver claude/guia-integracao-google-drive.md no projeto SMS_COP) e só o link
// na tabela anexos_sms do Supabase. Upload em 2 passos direto navegador->Google
// (api/anexo-iniciar.js + PUT direto pro Drive + api/anexo-finalizar.js) pra
// não esbarrar no limite de 4,5 MB por requisição das functions do Vercel.
// ============================================
var anexoModalTabela = null;
var anexoModalChave = null;

function abrirAnexoModal(tabela, chave, tituloRegistro) {
    anexoModalTabela = tabela;
    anexoModalChave = chave;
    document.getElementById('anexoModalTitulo').textContent = tituloRegistro || '';
    document.getElementById('anexoModalStatus').textContent = '';
    document.getElementById('anexoArquivoInput').value = '';
    garantirAnexosSmsCarregados(() => {
        renderAnexoModalLista();
    });
    renderAnexoModalLista();
    document.getElementById('anexoModalOverlay').style.display = 'flex';
}

function fecharAnexoModal() {
    const overlay = document.getElementById('anexoModalOverlay');
    if (overlay) overlay.style.display = 'none';
    anexoModalTabela = null;
    anexoModalChave = null;
    atualizarBotoesAnexosAposMudanca();
}

function renderAnexoModalLista() {
    const el = document.getElementById('anexoModalLista');
    if (!el) return;
    const lista = anexosDoRegistro(anexoModalTabela, anexoModalChave);
    if (lista.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum anexo ainda.</div>';
        return;
    }
    el.innerHTML = lista.map(a => `
        <div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <a href="${escapeHTML(a.drive_view_link)}" target="_blank" rel="noopener">📄 ${escapeHTML(a.nome_arquivo)}</a>
            <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirAnexo('${escapeHTML(a.id)}')">🗑️</button>
        </div>`).join('');
}

// Lê um Blob/File como base64 puro (sem o prefixo "data:...;base64," que o
// FileReader inclui) - usado pra mandar cada pedaço do arquivo dentro de um
// JSON pro /api/anexo-enviar-pedaco (ver enviarArquivoEmPedacos logo abaixo).
function lerComoBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const resultado = reader.result || '';
            const virgula = resultado.indexOf(',');
            resolve(virgula >= 0 ? resultado.slice(virgula + 1) : resultado);
        };
        reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(blob);
    });
}

// Plano B do envio de anexo (o navegador não fala mais direto com o Google -
// CORS bloqueado mesmo depois de mandar o header Origin na abertura da sessão
// em anexo-iniciar.js, confirmado em produção). Em vez de um único PUT do
// navegador pro Drive, o arquivo é fatiado em pedaços de 2,5 MiB (múltiplo de
// 256 KiB, exigido pelo protocolo de upload retomável do Google - só o
// último pedaço pode ser menor) e cada pedaço é mandado em base64 (~3,3 MB,
// dentro do limite de 4,5 MB por requisição do Vercel) pra
// /api/anexo-enviar-pedaco, que repassa servidor-a-servidor pro Google.
var ANEXO_TAMANHO_PEDACO = 2.5 * 1024 * 1024;

async function enviarArquivoEmPedacos(file, uploadUrl, statusEl) {
    const total = file.size;
    const totalPedacos = Math.max(1, Math.ceil(total / ANEXO_TAMANHO_PEDACO));
    let offset = 0;
    while (offset < total) {
        const fim = Math.min(offset + ANEXO_TAMANHO_PEDACO, total);
        const pedaco = file.slice(offset, fim);
        const chunkBase64 = await lerComoBase64(pedaco);
        const numeroPedaco = Math.floor(offset / ANEXO_TAMANHO_PEDACO) + 1;
        if (statusEl) statusEl.textContent = `Enviando pro Google Drive... (parte ${numeroPedaco}/${totalPedacos})`;

        const resp = await fetch('/api/anexo-enviar-pedaco', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadUrl, chunkBase64, offset, tamanhoTotal: total, mimeType: file.type || 'application/octet-stream' })
        });
        const dados = await resp.json();
        if (!resp.ok) throw new Error(dados.erro || `HTTP ${resp.status}`);
        if (dados.completo) return dados;
        offset = fim;
    }
    throw new Error('Upload não foi concluído pelo Google (resposta inesperada).');
}

async function enviarAnexoSelecionado() {
    const input = document.getElementById('anexoArquivoInput');
    const statusEl = document.getElementById('anexoModalStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo primeiro.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const file = input.files[0];
    if (file.size > 20 * 1024 * 1024) {
        statusEl.textContent = '❌ Arquivo muito grande (máx. 20 MB).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    statusEl.textContent = 'Preparando envio...';
    statusEl.style.color = 'var(--text-light)';
    try {
        const iniciarResp = await fetch('/api/anexo-iniciar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tabela: anexoModalTabela,
                registroChave: anexoModalChave,
                nomeArquivo: file.name,
                mimeType: file.type || 'application/octet-stream'
            })
        });
        const iniciarDados = await iniciarResp.json();
        if (!iniciarResp.ok) throw new Error(iniciarDados.erro || `HTTP ${iniciarResp.status}`);

        const arquivo = await enviarArquivoEmPedacos(file, iniciarDados.uploadUrl, statusEl);

        try {
            await fetch('/api/anexo-finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driveFileId: arquivo.id })
            });
        } catch (finalErr) {
            console.error('Falha ao tornar o anexo público por link:', finalErr);
        }

        const novoAnexo = {
            id: crypto.randomUUID(),
            tabela_origem: anexoModalTabela,
            registro_chave: anexoModalChave,
            nome_arquivo: file.name,
            drive_file_id: arquivo.id,
            drive_view_link: arquivo.webViewLink,
            enviado_por: null
        };
        await supabaseUpsert('anexos_sms', [novoAnexo]);
        allAnexosSms.push(novoAnexo);

        if (anexoModalTabela === 'ordens_servico') {
            try {
                const hojeStr = new Date().toISOString().split('T')[0];
                await supabaseUpsert('colaboradores_efetivo', [{
                    id: anexoModalChave,
                    os_anexo_url: arquivo.webViewLink,
                    os_status: 'entregue',
                    os_data_entrega: hojeStr
                }]);
                const idxColab = allEfetivo.findIndex(e => e.id === anexoModalChave);
                if (idxColab >= 0) {
                    allEfetivo[idxColab].os_anexo_url = arquivo.webViewLink;
                    allEfetivo[idxColab].os_status = 'entregue';
                    if (!allEfetivo[idxColab].os_data_entrega) {
                        allEfetivo[idxColab].os_data_entrega = hojeStr;
                    }
                }
            } catch (eUp) {
                console.warn('Aviso ao sincronizar anexo de OS no efetivo:', eUp.message);
            }
        }
        input.value = '';
        statusEl.textContent = '✅ Anexo enviado com sucesso.';
        statusEl.style.color = 'var(--success)';
        renderAnexoModalLista();
        atualizarBotoesAnexosAposMudanca();
    } catch (err) {
        console.error('Erro ao enviar anexo:', err);
        statusEl.textContent = '❌ Falha ao enviar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function atualizarBotoesAnexosAposMudanca() {
    if (typeof renderDdsLancamentosRecentes === 'function') {
        try { renderDdsLancamentosRecentes(); } catch (_) {}
    }
    if (typeof renderTreinHistLista === 'function') {
        try { renderTreinHistLista(); } catch (_) {}
    }
    if (typeof renderCipaReunioesLista === 'function') {
        try { renderCipaReunioesLista(); } catch (_) {}
    }
    const cipaReuniaoCard = document.getElementById('cipaReuniaoFormCard');
    if (cipaReuniaoCard && cipaReuniaoCard.dataset.id) {
        const btn = document.getElementById('cipaReuniaoForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos da Reunião${labelContagemAnexos('cipa_reunioes', cipaReuniaoCard.dataset.id)}`;
    }
    const cipaProcCard = document.getElementById('cipaProcessoFormCard');
    if (cipaProcCard && cipaProcCard.dataset.id) {
        const btn = document.getElementById('cipaProcessoForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos da Eleição${labelContagemAnexos('cipa_processos_eleitorais', cipaProcCard.dataset.id)}`;
    }
    const extForm = document.getElementById('extintorFormCard');
    if (extForm && extForm.dataset.editId) {
        const btn = document.getElementById('extForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos (Laudos / NF)${labelContagemAnexos('extintores_catalogo', extForm.dataset.editId)}`;
    }
    // Módulo APR
    if (typeof renderAprHistoricoLista === 'function') {
        try { renderAprHistoricoLista(); } catch (_) {}
    }
    const aprId = document.getElementById('aprForm_id')?.value;
    if (aprId) {
        const btn = document.getElementById('aprForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos (Assinaturas)${labelContagemAnexos('apr_registros', aprId)}`;
    }
    // Módulo Brigada de Incêndio
    if (typeof renderBrigadaMembrosLista === 'function') {
        try { renderBrigadaMembrosLista(); } catch (_) {}
    }
    if (typeof renderTabelaControleOs === 'function') {
        try { renderTabelaControleOs(); } catch (_) {}
    }
    if (typeof atualizarAnexosModalOs === 'function') {
        try { atualizarAnexosModalOs(); } catch (_) {}
    }
    if (typeof renderBrigadaControleTreinados === 'function') {
        try { renderBrigadaControleTreinados(); } catch (_) {}
    }
    const brigadaMembroCard = document.getElementById('brigadaMembroFormCard');
    if (brigadaMembroCard && brigadaMembroCard.dataset.id) {
        const btn = document.getElementById('brigadaMembroForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos (Certificado / Atas)${labelContagemAnexos('brigada_membros', brigadaMembroCard.dataset.id)}`;
    }
    const btnSimulados = document.getElementById('btnBrigadaSimuladosGeral');
    if (btnSimulados) {
        btnSimulados.textContent = `📎 Atas de Simulados${labelContagemAnexos('brigada_membros', 'SIMULADOS_GERAL')}`;
    }
    // Módulo Saúde Ocupacional
    if (typeof filterAsoLista === 'function') {
        try { filterAsoLista(document.getElementById('asoSearchInput')?.value || ''); } catch (_) {}
    }
    if (typeof filterAtestadoLista === 'function') {
        try { filterAtestadoLista(document.getElementById('atestadoSearchInput')?.value || ''); } catch (_) {}
    }
    const asoForm = document.getElementById('asoFormCard');
    if (asoForm && asoForm.dataset.editId) {
        const btn = document.getElementById('asoForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexar Ficha Clínica / ASO${labelContagemAnexos('aso_exames', asoForm.dataset.editId)}`;
    }
    const atestadoForm = document.getElementById('atestadoFormCard');
    if (atestadoForm && atestadoForm.dataset.editId) {
        const btn = document.getElementById('atestadoForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexo (Atestado Médico Físico)${labelContagemAnexos('atestados_ocupacionais', atestadoForm.dataset.editId)}`;
    }
    // Módulo Meio Ambiente
    if (typeof renderResiduosRefeicoesConfig === 'function') {
        try { renderResiduosRefeicoesConfig(); } catch (_) {}
    }
    if (typeof filterManutencaoLista === 'function') {
        try { filterManutencaoLista(); } catch (_) {}
    }
    if (typeof renderManifestoResiduosResumo === 'function') {
        try { renderManifestoResiduosResumo(); } catch (_) {}
    }
    const manutForm = document.getElementById('manutencaoFormCard');
    if (manutForm && manutForm.dataset.id) {
        const btn = document.getElementById('manutForm_btnAnexos');
        if (btn) btn.textContent = `📎 Anexos (Comprovante / O.S.)${labelContagemAnexos('manutencao_veicular', manutForm.dataset.id)}`;
    }
}

// Funções de atalho para abertura de modal de anexos nos formulários
function abrirAnexosAprAtual() {
    const id = document.getElementById('aprForm_id')?.value || document.getElementById('aprForm_numero')?.value;
    if (!id) return;
    const a = (typeof allAprRegistros !== 'undefined' && Array.isArray(allAprRegistros)) ? allAprRegistros.find(x => x.id === id) : null;
    const tit = a ? (a.titulo || a.descricao_atividade || id) : id;
    abrirAnexoModal('apr_registros', id, `APR ${id} — Folha Física de Assinaturas (${tit})`);
}

function abrirAnexosBrigadaMembroAtual() {
    const id = document.getElementById('brigadaMembroFormCard')?.dataset?.id;
    if (!id) return;
    const m = (typeof allBrigadaMembros !== 'undefined' && Array.isArray(allBrigadaMembros)) ? allBrigadaMembros.find(x => x.id === id) : null;
    const nome = m ? m.nome : id;
    abrirAnexoModal('brigada_membros', id, `Certificado / Designação — ${nome}`);
}

function abrirAnexosBrigadaTreinAtual() {
    const matricula = document.getElementById('brigadaTreinForm_matricula')?.value;
    const m = (typeof allBrigadaMembros !== 'undefined' && Array.isArray(allBrigadaMembros)) ? allBrigadaMembros.find(x => x.matricula === matricula) : null;
    const id = m ? m.id : (matricula ? `BRIGADA_${matricula}` : null);
    if (!id) return;
    const nome = m ? m.nome : matricula;
    abrirAnexoModal('brigada_membros', id, `Certificado de Brigadista — ${nome}`);
}

function abrirAnexosAsoAtual() {
    const id = document.getElementById('asoFormCard')?.dataset?.editId;
    if (!id) return;
    const a = (typeof allAsoExames !== 'undefined' && Array.isArray(allAsoExames)) ? allAsoExames.find(x => x.id === id) : null;
    const nome = a ? (a.nome_colaborador || a.matricula) : id;
    abrirAnexoModal('aso_exames', id, `ASO / Ficha Clínica — ${nome}`);
}

function abrirAnexosAtestadoAtual() {
    const id = document.getElementById('atestadoFormCard')?.dataset?.editId;
    if (!id) return;
    const a = (typeof allAtestadosOcupacionais !== 'undefined' && Array.isArray(allAtestadosOcupacionais)) ? allAtestadosOcupacionais.find(x => x.id === id) : null;
    const nome = a ? (a.nome_colaborador || a.matricula) : id;
    abrirAnexoModal('atestados_ocupacionais', id, `Atestado Médico Físico — ${nome}`);
}

function abrirAnexosManutAtual() {
    const id = document.getElementById('manutencaoFormCard')?.dataset?.id;
    if (!id) return;
    const m = (typeof allManutencaoVeicular !== 'undefined' && Array.isArray(allManutencaoVeicular)) ? allManutencaoVeicular.find(x => x.id === id) : null;
    const tit = m ? (m.ativo || m.equipamento || id) : id;
    abrirAnexoModal('manutencao_veicular', id, `Manutenção / Destinação de Óleo — ${tit}`);
}

function abrirAnexosManifestoMesAtual() {
    if (typeof popularSelectAnoManifesto === 'function') popularSelectAnoManifesto();
    const ano = parseInt(document.getElementById('manifestoAno')?.value, 10);
    const mes = parseInt(document.getElementById('manifestoMes')?.value, 10);
    if (isNaN(ano) || isNaN(mes)) return;
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const nomeMes = (typeof NOMES_MESES !== 'undefined' && NOMES_MESES[mes]) ? NOMES_MESES[mes] : (mes + 1);
    abrirAnexoModal('residuos_refeicoes', key, `Manifesto MTR e Destinação de Resíduos — ${nomeMes}/${ano}`);
}

async function excluirAnexo(id) {
    if (!confirm('Excluir este anexo do painel? (o arquivo continua salvo no Google Drive, só o link some daqui)')) return;
    try {
        await supabaseDeleteMany('anexos_sms', [id]);
        allAnexosSms = allAnexosSms.filter(a => a.id !== id);
        renderAnexoModalLista();
        atualizarBotoesAnexosAposMudanca();
    } catch (err) {
        alert('Falha ao excluir anexo: ' + err.message);
    }
}

function setRelatorioLideresModo(modo) {
    previsaoExamesRelatorioModo = modo;
    document.getElementById('relatorioLideresModoBtn-individual').classList.toggle('active', modo === 'individual');
    document.getElementById('relatorioLideresModoBtn-geral').classList.toggle('active', modo === 'geral');
    document.getElementById('relatorioLideresCriterioWrap').style.display = modo === 'geral' ? 'flex' : 'none';
    renderRelatorioLideresConteudo();
}

function onRelatorioLideresCriterioChange() {
    const marcado = document.querySelector('input[name="relatorioLideresCriterio"]:checked');
    previsaoExamesRelatorioCriterio = marcado ? marcado.value : 'responsavel';
    renderRelatorioLideresConteudo();
}

function renderRelatorioLideresConteudo() {
    const conteudoEl = document.getElementById('relatorioLideresConteudo');
    if (!conteudoEl) return;
    const dados = previsaoExamesUltimoResultado;
    if (!dados || dados.comGhe.length === 0) {
        conteudoEl.innerHTML = '<div class="db-list-empty">Nenhum colaborador com exame previsto para este mês.</div>';
        previsaoExamesLideresGrupos = [];
        previsaoExamesRelatorioGeral = null;
        return;
    }
    const mesLabel = `${NOMES_MESES[dados.mes]} de ${dados.ano}`;
    if (previsaoExamesRelatorioModo === 'geral') {
        renderRelatorioLideresModoGeral(dados, mesLabel, conteudoEl);
    } else {
        renderRelatorioLideresModoIndividual(dados, mesLabel, conteudoEl);
    }
}

// Modo A - um bloco (texto + botões) por líder, sempre agrupado por responsável (é o que
// "Individual por Líder" significa - quem quer por setor usa o Modo Geral).
function renderRelatorioLideresModoIndividual(dados, mesLabel, conteudoEl) {
    const grupos = agruparPrevisaoExamesPorCampo(dados.comGhe, 'responsavel');
    previsaoExamesLideresGrupos = grupos.map(g => ({ ...g, mesLabel, texto: formatarTextoGrupoIndividual(g, mesLabel) }));

    conteudoEl.innerHTML = previsaoExamesLideresGrupos.map((g, idx) => `
        <div class="db-list-item${g.semValor ? ' db-item-warning' : ''}">
            <div class="db-list-item-title">${g.semValor ? escapeHTML(RELATORIO_CAMPO_INFO.responsavel.avisoSemValorTitulo) : escapeHTML(g.nome)}</div>
            <div class="db-list-item-sub" style="margin-bottom:6px;">${g.colaboradores.length} colaborador(es)</div>
            <textarea readonly style="width:100%; min-height:90px; font-size:11.5px; font-family:inherit; padding:8px; border:1px solid var(--border); border-radius:6px; resize:vertical; box-sizing:border-box; background:white;">${escapeHTML(g.texto)}</textarea>
            <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button class="db-clear-btn" onclick="copiarRelatorioLider(${idx}, this)">📋 Copiar texto</button>
                <button class="db-clear-btn" onclick="baixarPdfRelatorioLider(${idx})">📄 Baixar PDF</button>
            </div>
        </div>`).join('');
}

// Modo B - um único texto/PDF com todas as seções (líder ou setor, conforme o rádio),
// pra mandar num e-mail só com todos os líderes em cópia.
function renderRelatorioLideresModoGeral(dados, mesLabel, conteudoEl) {
    const campo = previsaoExamesRelatorioCriterio;
    const info = RELATORIO_CAMPO_INFO[campo];
    const grupos = agruparPrevisaoExamesPorCampo(dados.comGhe, campo);
    const aberturaTopo = `Prezados líderes, segue a relação de colaboradores com exame periódico previsto para ${mesLabel}, organizada por ${info.rotulo}. Cada um deve localizar abaixo os colaboradores da sua equipe e se programar para a ausência no dia do exame.`;
    const secoesTexto = grupos.map(g => formatarSecaoTexto(g.semValor ? info.avisoSemValorTitulo : g.nome, g.colaboradores)).join('\n\n');
    const texto = `${aberturaTopo}\n\n${secoesTexto}`;

    previsaoExamesRelatorioGeral = { texto, mesLabel, campo, grupos, aberturaTopo };

    conteudoEl.innerHTML = `
        <div class="db-list-item">
            <div class="db-list-item-sub" style="margin-bottom:6px;">${grupos.length} grupo(s) — ${dados.comGhe.length} colaborador(es) no total</div>
            <textarea readonly style="width:100%; min-height:260px; font-size:11.5px; font-family:inherit; padding:8px; border:1px solid var(--border); border-radius:6px; resize:vertical; box-sizing:border-box; background:white;">${escapeHTML(texto)}</textarea>
            <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <button class="db-clear-btn" onclick="copiarRelatorioGeral(this)">📋 Copiar texto</button>
                <button class="db-clear-btn" onclick="baixarPdfRelatorioGeral()">📄 Baixar PDF</button>
            </div>
        </div>`;
}

function copiarTextoComFeedback(texto, btnEl) {
    navigator.clipboard.writeText(texto).then(() => {
        const original = btnEl.textContent;
        btnEl.textContent = '✅ Copiado!';
        setTimeout(() => { btnEl.textContent = original; }, 2000);
    }).catch(() => {
        alert('Não foi possível copiar automaticamente - selecione o texto na caixa e copie manualmente (Ctrl+C).');
    });
}

function copiarRelatorioLider(idx, btnEl) {
    const grupo = previsaoExamesLideresGrupos[idx];
    if (!grupo) return;
    copiarTextoComFeedback(grupo.texto, btnEl);
}

function baixarPdfRelatorioLider(idx) {
    const grupo = previsaoExamesLideresGrupos[idx];
    if (!grupo) return;
    const titulo = grupo.semValor ? 'SEM LÍDER DEFINIDO - REVISAR CADASTRO' : grupo.nome.toUpperCase();
    const aberturaIndividual = grupo.texto.split('\n\n')[0];
    const html = construirHtmlRelatorioPdf(`EXAMES PERIÓDICOS PREVISTOS — ${titulo}`, grupo.mesLabel, null,
        [{ titulo, abertura: aberturaIndividual, linhas: linhasParaTabelaPdf(grupo.colaboradores) }]);
    abrirDocumentoBlob(html);
}

function copiarRelatorioGeral(btnEl) {
    if (!previsaoExamesRelatorioGeral) return;
    copiarTextoComFeedback(previsaoExamesRelatorioGeral.texto, btnEl);
}

function baixarPdfRelatorioGeral() {
    const dados = previsaoExamesRelatorioGeral;
    if (!dados) return;
    const info = RELATORIO_CAMPO_INFO[dados.campo];
    const secoes = dados.grupos.map(g => ({
        titulo: g.semValor ? info.avisoSemValorTitulo : g.nome,
        linhas: linhasParaTabelaPdf(g.colaboradores)
    }));
    const html = construirHtmlRelatorioPdf('EXAMES PERIÓDICOS PREVISTOS — RELATÓRIO GERAL', dados.mesLabel, dados.aberturaTopo, secoes);
    abrirDocumentoBlob(html);
}

// Taxa de Absenteísmo Ocupacional = horas perdidas (atestados de doença ocupacional +
// dias_perdidos de acidentes com afastamento) × 1.000.000/... não, aqui é simplesmente
// horas perdidas / HHT do período × 100 (percentual, não taxa por milhão como TF/TG).
function calcularAbsenteismoPeriodo(inicio, fim) {
    let horasPerdidas = 0;
    let hhtPeriodo = 0;
    let periodoCompleto = true;
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const config = hhtDiasTrabalhadosMap[key];
        const horasPorDia = config ? (config.horas_por_dia || 8) : 8;
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);

        const diasAtestados = allAtestadosOcupacionais
            .filter(a => a.data_inicio && parseLocalDate(a.data_inicio) >= inicioMes && parseLocalDate(a.data_inicio) <= fimMes)
            .reduce((s, a) => s + (parseInt(a.dias_afastamento, 10) || 0), 0);
        const diasAcidentes = allAcidentes
            .filter(a => a.com_afastamento && a.data_acidente && parseLocalDate(a.data_acidente) >= inicioMes && parseLocalDate(a.data_acidente) <= fimMes)
            .reduce((s, a) => s + (parseInt(a.dias_perdidos, 10) || 0), 0);
        horasPerdidas += (diasAtestados + diasAcidentes) * horasPorDia;

        const hhtMes = hhtExposicaoDoMes(ano, mes);
        if (hhtMes === null) periodoCompleto = false;
        else hhtPeriodo += hhtMes;

        cursor = new Date(ano, mes + 1, 1);
    }
    const disponivel = periodoCompleto && hhtPeriodo > 0;
    return { taxa: disponivel ? (horasPerdidas / hhtPeriodo * 100) : null, horasPerdidas, hhtPeriodo, disponivel };
}

function renderSaudePanel() {
    popularFiltroAnoSaude();
    const { inicio, fim } = getSaudeDateRange();

    const ativos = (allEfetivo || []).filter(colaboradorEstaAtivo);
    let vencidos = 0, vencendo30 = 0, vencendo60 = 0, emDia = 0, semRegistro = 0;
    const alertList = [];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    ativos.forEach(e => {
        // Cálculo com regra NR-07 / PCMSO: 1 ano para operacionais, 2 anos para administrativos
        const r = calcularValidadeAsoPcmso(e);
        if (r.status === 'vencido') { 
            vencidos++; 
            alertList.push({ e, r }); 
        } else if (r.status === 'vencendo30') { 
            vencendo30++; 
            alertList.push({ e, r }); 
        } else if (r.status === 'vencendo60') { 
            vencendo60++; 
            alertList.push({ e, r }); 
        } else if (r.status === 'em_dia') { 
            emDia++; 
        } else { 
            semRegistro++; 
            alertList.push({ e, r }); 
        }
    });

    listaAlertasAsoCache = alertList.sort((a, b) => (a.r.diffDays ?? -99999) - (b.r.diffDays ?? -99999));

    // Atualização dos KPIs na tela
    const elVencidos = document.getElementById('kpiAsoVencidos');
    const elVencendo30 = document.getElementById('kpiAsoVencendo');
    const elVencendo60 = document.getElementById('kpiAsoVencendo60');
    const elEmDia = document.getElementById('kpiAsoEmDia');
    const elSemReg = document.getElementById('kpiAsoSemRegistro');
    const elAbsen = document.getElementById('kpiAbsenteismo');

    if (elVencidos) elVencidos.textContent = vencidos;
    if (elVencendo30) elVencendo30.textContent = vencendo30;
    if (elVencendo60) elVencendo60.textContent = vencendo60;
    if (elEmDia) elEmDia.textContent = emDia;
    if (elSemReg) elSemReg.textContent = semRegistro;

    const absen = calcularAbsenteismoPeriodo(inicio, fim);
    if (elAbsen) elAbsen.textContent = absen.disponivel ? absen.taxa.toFixed(2) + '%' : '—';

    // Contadores das pílulas de filtro rápido de alertas
    const cTodos = document.getElementById('countAsoAlertaTodos');
    const cVenc = document.getElementById('countAsoAlertaVencidos');
    const c30 = document.getElementById('countAsoAlerta30');
    const c60 = document.getElementById('countAsoAlerta60');
    const cSemReg = document.getElementById('countAsoAlertaSemReg');

    if (cTodos) cTodos.textContent = alertList.length;
    if (cVenc) cVenc.textContent = vencidos;
    if (c30) c30.textContent = vencendo30;
    if (c60) c60.textContent = vencendo60;
    if (cSemReg) cSemReg.textContent = semRegistro;

    renderListaAsoAlertasFiltrada();

    // Atualização dos Gráficos
    if (typeof Chart === 'undefined') return;
    if (chartInstances.asoStatus) chartInstances.asoStatus.destroy();
    if (chartInstances.asoTipo) chartInstances.asoTipo.destroy();
    if (chartInstances.absenteismoMes) chartInstances.absenteismoMes.destroy();

    const canvasAsoStatus = document.getElementById('chartAsoStatus');
    if (canvasAsoStatus) {
        chartInstances.asoStatus = new Chart(canvasAsoStatus, {
            type: 'doughnut',
            data: {
                labels: ['Vencidos', 'Vencendo (30d)', 'Vencendo (60d)', 'Em Dia (>60d)', 'Sem Registro'],
                datasets: [{ 
                    data: [vencidos, vencendo30, vencendo60, emDia, semRegistro], 
                    backgroundColor: ['#ef4444', '#ea580c', '#d97706', '#10b981', '#94a3b8'], 
                    borderWidth: 2, 
                    borderColor: '#fff' 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
        });
    }

    const tipoCounts = {};
    (allAsoExames || []).forEach(a => { const t = ASO_TIPO_LABELS[a.tipo_aso] || a.tipo_aso || 'Não especificado'; tipoCounts[t] = (tipoCounts[t] || 0) + 1; });
    const tipoSorted = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    const tipoLabels = tipoSorted.map(t => wrapChartLabel(t[0]));
    ajustarAlturaBarrasHorizontais('chartAsoTipo', tipoLabels);
    
    const canvasAsoTipo = document.getElementById('chartAsoTipo');
    if (canvasAsoTipo) {
        chartInstances.asoTipo = new Chart(canvasAsoTipo, {
            type: 'bar',
            data: { labels: tipoLabels, datasets: [{ label: 'Exames', data: tipoSorted.map(t => t[1]), backgroundColor: '#4f46e5', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
        });
    }

    const datasAdmissao = (allEfetivo || []).filter(e => e.dt_admissao).map(e => parseLocalDate(e.dt_admissao));
    const primeiraData = datasAdmissao.length > 0 ? new Date(Math.min(...datasAdmissao.map(d => d.getTime()))) : hoje;
    const mesesAbs = [], taxaPorMes = [];
    let cursorAbs = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
    const limiteAbs = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    while (cursorAbs <= limiteAbs) {
        mesesAbs.push(cursorAbs.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const r = calcularAbsenteismoPeriodo(cursorAbs, cursorAbs);
        taxaPorMes.push(r.disponivel ? Math.round(r.taxa * 100) / 100 : null);
        cursorAbs = new Date(cursorAbs.getFullYear(), cursorAbs.getMonth() + 1, 1);
    }
    
    const canvasAbs = document.getElementById('chartAbsenteismoMes');
    if (canvasAbs) {
        chartInstances.absenteismoMes = new Chart(canvasAbs, {
            type: 'line',
            data: { labels: mesesAbs, datasets: [{ label: 'Absenteísmo Ocupacional (%)', data: taxaPorMes, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.25 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: '%' } } } }
        });
    }

    // Snapshot para o Relatório Geral
    window.saudeReportData = {
        periodoLabel: document.getElementById('saudePeriodoTitulo')?.textContent || '',
        kpis: [
            { key: 'asoVencidos', label: 'ASO Vencidos', value: vencidos },
            { key: 'asoVencendo', label: 'ASO Vencendo em 30 dias', value: vencendo30 },
            { key: 'asoVencendo60', label: 'ASO Vencendo em 31 a 60 dias', value: vencendo60 },
            { key: 'asoEmDia', label: 'ASO Em Dia', value: emDia },
            { key: 'asoSemRegistro', label: 'Sem ASO Registrado', value: semRegistro },
            { key: 'absenteismo', label: 'Taxa de Absenteísmo Ocupacional', value: absen.disponivel ? absen.taxa.toFixed(2) + '%' : '—' }
        ],
        graficos: {
            graficoStatusAso: {
                titulo: 'Status de ASO (Efetivo Ativo)',
                labels: ['Vencidos', 'Vencendo (30d)', 'Vencendo (60d)', 'Em Dia', 'Sem Registro'],
                valores: [vencidos, vencendo30, vencendo60, emDia, semRegistro]
            },
            graficoExamesTipo: {
                titulo: 'Exames Realizados por Tipo (Histórico Completo)',
                labels: tipoSorted.map(t => t[0]),
                valores: tipoSorted.map(t => t[1])
            },
            graficoAbsenteismoMes: {
                titulo: 'Absenteísmo Ocupacional por Mês (Histórico Completo)',
                labels: mesesAbs,
                valores: taxaPorMes.map(v => v === null ? '—' : v + '%')
            }
        },
        listaPendencias: alertList.map(({ e, r }) => {
            const situacao = r.status === 'vencido' ? 'Vencido' : r.status === 'vencendo30' ? 'Vencendo em 30d' : r.status === 'vencendo60' ? 'Vencendo em 60d' : 'Sem Registro';
            let detalhe;
            if (r.status === 'sem_registro') {
                detalhe = r.ultimoExame ? 'Último ASO sem data de vencimento preenchida' : 'Nenhum ASO registrado';
            } else {
                detalhe = r.status === 'vencido' ? `Vencido há ${Math.abs(r.diffDays)} dia(s)` : (r.diffDays === 0 ? 'Vence hoje' : `Vence em ${r.diffDays} dia(s)`);
            }
            return { nome: e.nome || e.id, setor: e.setor || '—', situacao, detalhe };
        })
    };
    if (document.getElementById('saudeSubtabBtn-relatorio')?.classList.contains('active')) renderSaudeRelatorioChecklist();
}

// Filtro e Renderização da Lista de Alertas de ASO na Visão Geral
var asoAlertFilterAtual = 'todos';
var listaAlertasAsoCache = [];

function filtrarListaAsoAlertas(status, btn) {
    asoAlertFilterAtual = status;
    document.querySelectorAll('#pillsFiltroAsoAlertaContainer .sector-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderListaAsoAlertasFiltrada();
}

function renderListaAsoAlertasFiltrada() {
    const listaEl = document.getElementById('listAsoVencendo');
    if (!listaEl) return;

    let filtrados = listaAlertasAsoCache;
    if (asoAlertFilterAtual === 'vencido') filtrados = listaAlertasAsoCache.filter(item => item.r.status === 'vencido');
    else if (asoAlertFilterAtual === 'vencendo30') filtrados = listaAlertasAsoCache.filter(item => item.r.status === 'vencendo30');
    else if (asoAlertFilterAtual === 'vencendo60') filtrados = listaAlertasAsoCache.filter(item => item.r.status === 'vencendo60');
    else if (asoAlertFilterAtual === 'sem_registro') filtrados = listaAlertasAsoCache.filter(item => item.r.status === 'sem_registro');

    if (filtrados.length === 0) {
        listaEl.innerHTML = '<div class="db-list-empty" style="padding:16px; text-align:center; color:var(--text-light); font-size:12px;">✅ Nenhum colaborador neste filtro de alerta</div>';
        return;
    }

    listaEl.innerHTML = filtrados.map(({ e, r }) => {
        let cls = 'db-item-warning';
        let badge = '';
        if (r.status === 'vencido') {
            cls = 'db-item-danger';
            badge = `<span style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10.5px;">🔴 Vencido há ${Math.abs(r.diffDays)}d</span>`;
        } else if (r.status === 'vencendo30') {
            cls = 'db-item-warning';
            badge = `<span style="background:#ffedd5; color:#c2410c; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10.5px;">🟠 Vence em ${r.diffDays === 0 ? 'HOJE' : r.diffDays + 'd'}</span>`;
        } else if (r.status === 'vencendo60') {
            cls = 'db-item-warning';
            badge = `<span style="background:#fef9c3; color:#854d0e; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10.5px;">🟡 Vence em ${r.diffDays}d</span>`;
        } else {
            cls = 'db-item-warning';
            badge = `<span style="background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10.5px;">⚪ Sem Registro ASO</span>`;
        }

        let msg = r.status === 'sem_registro'
            ? (r.ultimoExame ? 'Último ASO sem data de vencimento preenchida' : 'Nenhum ASO cadastrado')
            : (r.status === 'vencido' ? `Vencido há ${Math.abs(r.diffDays)} dia(s)` : `Vence em ${r.diffDays} dia(s) (${formatSimpleDate(r.dataVencimento)})`);

        const tipoLabel = ASO_TIPO_LABELS[r.ultimoExame?.tipo_aso] || r.ultimoExame?.tipo_aso || 'ASO';
        const subLabel = `${escapeHTML(e.setor || '—')} • GHE ${normalizarGhe(e.ghe)} • ${escapeHTML(tipoLabel)} • ${msg}`;

        return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(e.id)}')">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div class="db-list-item-title">${escapeHTML(e.nome || e.id)}</div>
                ${badge}
            </div>
            <div class="db-list-item-sub">${subLabel}</div>
        </div>`;
    }).join('');
}

// ============================================
// REGRA LEGAL DE VALIDADE DE ASOs (NR-07 / PCMSO)
// Periodicidade: 12 meses (1 ano) para funções operacionais ou expostas a riscos;
// 24 meses para funções puramente administrativas (GHE 03, GHE 16, GHE 22, GHE 23, GHE 24).
// Se o colaborador não tem vencimento digitado, calcula: data_exame + periodicidade
// Se não tem nenhum ASO registrado, calcula: dt_admissao + periodicidade
// ============================================
function calcularValidadeAsoPcmso(colaborador) {
    const matricula = String(colaborador.id || '').trim();
    const todos = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === matricula && a.data_exame);
    const gerais = todos.filter(ehRegistroAsoGeralPcmso);
    const exames = gerais.length > 0 ? gerais : todos;
    const gheNum = normalizarGhe(colaborador.ghe);
    const isAdministrativo = ['03', '16', '22', '23', '24'].includes(gheNum);
    const periodicidadeMeses = isAdministrativo ? 24 : 12;

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    if (exames.length === 0) {
        // Se nunca teve ASO registrado, avalia com base na data de admissão
        if (colaborador.dt_admissao) {
            const adm = parseLocalDate(colaborador.dt_admissao);
            const vencEstimado = addMeses(colaborador.dt_admissao, periodicidadeMeses);
            const vencDate = parseLocalDate(vencEstimado); vencDate.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((vencDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            
            // Se foi admitido há mais de 1 ano sem exame, está vencido; se foi admitido há 10-11 meses, está vencendo
            if (diffDays < 0) {
                return { status: 'vencido', ultimoExame: null, diffDays, dataVencimento: vencEstimado, periodicidadeMeses, motivo: 'Admissão sem ASO periódico há >1 ano' };
            } else if (diffDays <= 30) {
                return { status: 'vencendo30', ultimoExame: null, diffDays, dataVencimento: vencEstimado, periodicidadeMeses, motivo: '1º Periódico vence em 30d da admissão' };
            } else if (diffDays <= 60) {
                return { status: 'vencendo60', ultimoExame: null, diffDays, dataVencimento: vencEstimado, periodicidadeMeses, motivo: '1º Periódico vence em 60d da admissão' };
            }
        }
        return { status: 'sem_registro', ultimoExame: null, diffDays: null, dataVencimento: null, periodicidadeMeses, motivo: 'Sem ASO cadastrado' };
    }

    const ultimo = exames.reduce((max, a) => parseLocalDate(a.data_exame) > parseLocalDate(max.data_exame) ? a : max, exames[0]);
    let dataVencimento = ultimo.data_vencimento;
    
    // Se a data de vencimento não foi preenchida na mão, aplica a regra de 1 ano (ou 2 anos adm)
    if (!dataVencimento && ultimo.data_exame) {
        dataVencimento = addMeses(ultimo.data_exame, periodicidadeMeses);
    }

    if (!dataVencimento) {
        return { status: 'sem_registro', ultimoExame: ultimo, diffDays: null, dataVencimento: null, periodicidadeMeses, motivo: 'Último ASO sem data de validade' };
    }

    const venc = parseLocalDate(dataVencimento); venc.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    let status = 'em_dia';
    if (diffDays < 0) status = 'vencido';
    else if (diffDays <= 30) status = 'vencendo30';
    else if (diffDays <= 60) status = 'vencendo60';

    // Isenção Operacional de SST: colaboradores com ASO com vencimento durante o afastamento
    // recebem a tag "Regularizar no Retorno de Férias" sem rebaixar a taxa de conformidade geral da obra
    const emFeriasHoje = typeof colaboradorEstaEmFerias === 'function' && colaboradorEstaEmFerias(matricula, hoje);
    const regFerias = typeof obterRegistroFeriasAtivo === 'function' ? obterRegistroFeriasAtivo(matricula, dataVencimento || hoje) : null;
    const isencaoFerias = (status === 'vencido' || status === 'vencendo30') && (emFeriasHoje || regFerias);

    let motivo = ultimo.tipo_aso ? `ASO ${ultimo.tipo_aso.toUpperCase()}` : 'ASO';
    if (isencaoFerias) {
        motivo = 'Regularizar no Retorno de Férias';
    }

    return { 
        status, 
        ultimoExame: ultimo, 
        diffDays, 
        dataVencimento, 
        periodicidadeMeses, 
        isencaoFerias: !!isencaoFerias, 
        motivo 
    };
}

// ============================================
// MODAL DE GESTÃO DE VALIDADE DE ASOs (30 e 60 dias)
// ============================================
var valAsoFiltroAtual = 'todos'; // 'todos' | 'vencidos' | 'vencendo30' | 'vencendo60' | 'emDia' | 'semRegistro'
var dadosValidadeAsosCache = [];

function abrirModalGestaoValidadeAsos() {
    valAsoFiltroAtual = 'todos';
    document.querySelectorAll('#filtroValAsoPills .sector-pill').forEach(b => b.classList.remove('active'));
    const btnTodos = document.querySelector('#filtroValAsoPills .sector-pill');
    if (btnTodos) btnTodos.classList.add('active');

    const inputBusca = document.getElementById('valAsoBuscaInput');
    if (inputBusca) inputBusca.value = '';

    calcularEAtualizarValidadeAsos();
    const modal = document.getElementById('modalGestaoValidadeAsos');
    if (modal) modal.style.display = 'flex';
}

function fecharModalGestaoValidadeAsos() {
    const modal = document.getElementById('modalGestaoValidadeAsos');
    if (modal) modal.style.display = 'none';
}

function filtrarTabelaValidadeAsos(filtro, btn) {
    valAsoFiltroAtual = filtro;
    document.querySelectorAll('#filtroValAsoPills .sector-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTabelaValidadeAsos();
}

function calcularEAtualizarValidadeAsos() {
    const ativos = (allEfetivo || []).filter(colaboradorEstaAtivo);
    dadosValidadeAsosCache = ativos.map(c => {
        const r = calcularValidadeAsoPcmso(c);
        const gNum = normalizarGhe(c.ghe);
        return {
            colaborador: c,
            matricula: c.id,
            nome: c.nome || '',
            cpf: c.cpf || '',
            ghe: gNum,
            gheNome: obterNomeGheCompleto(gNum),
            setor: c.setor || '',
            funcao: c.funcao || '',
            dt_admissao: c.dt_admissao || '',
            ultimoAsoData: r.ultimoExame?.data_exame || null,
            ultimoAsoTipo: r.ultimoExame?.tipo_aso || null,
            periodicidadeMeses: r.periodicidadeMeses,
            dataVencimento: r.dataVencimento,
            diffDays: r.diffDays,
            statusKey: r.status,
            isencaoFerias: r.isencaoFerias || false,
            motivo: r.motivo
        };
    });

    // Ordenação: 1º Vencidos (mais dias de atraso), 2º Vencendo 30d, 3º Vencendo 60d, 4º Sem Registro, 5º Em dia
    const prioridade = { 'vencido': 1, 'vencendo30': 2, 'vencendo60': 3, 'sem_registro': 4, 'em_dia': 5 };
    dadosValidadeAsosCache.sort((a, b) => {
        const pA = prioridade[a.statusKey] || 9;
        const pB = prioridade[b.statusKey] || 9;
        if (pA !== pB) return pA - pB;
        if (a.diffDays !== null && b.diffDays !== null) return a.diffDays - b.diffDays;
        return a.nome.localeCompare(b.nome);
    });

    // Contadores KPIs
    const vencidos = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencido').length;
    const v30 = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencendo30').length;
    const v60 = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencendo60').length;
    const emDia = dadosValidadeAsosCache.filter(d => d.statusKey === 'em_dia').length;
    const semReg = dadosValidadeAsosCache.filter(d => d.statusKey === 'sem_registro').length;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('valAsoKpi_vencidos', vencidos);
    setTxt('valAsoKpi_vencendo30', v30);
    setTxt('valAsoKpi_vencendo60', v60);
    setTxt('valAsoKpi_emDia', emDia);
    setTxt('valAsoKpi_semRegistro', semReg);

    setTxt('valAsoCount_todos', dadosValidadeAsosCache.length);
    setTxt('valAsoCount_vencidos', vencidos);
    setTxt('valAsoCount_30', v30);
    setTxt('valAsoCount_60', v60);
    setTxt('valAsoCount_emDia', emDia);
    setTxt('valAsoCount_semReg', semReg);

    renderTabelaValidadeAsos();
}

function renderTabelaValidadeAsos() {
    const tbody = document.getElementById('tabelaValidadeAsosCorpo');
    if (!tbody) return;

    const busca = (document.getElementById('valAsoBuscaInput')?.value || '').toLowerCase().trim();

    let filtrados = dadosValidadeAsosCache.filter(d => {
        if (valAsoFiltroAtual === 'vencidos' && d.statusKey !== 'vencido') return false;
        if (valAsoFiltroAtual === 'vencendo30' && d.statusKey !== 'vencendo30') return false;
        if (valAsoFiltroAtual === 'vencendo60' && d.statusKey !== 'vencendo60') return false;
        if (valAsoFiltroAtual === 'emDia' && d.statusKey !== 'em_dia') return false;
        if (valAsoFiltroAtual === 'semRegistro' && d.statusKey !== 'sem_registro') return false;

        if (busca) {
            const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.gheNome} ${d.funcao} ${d.setor}`.toLowerCase();
            if (!txt.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding: 24px; text-align: center; color: var(--text-light);">Nenhum colaborador encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(d => {
        let badgeStatus = '';
        let badgePrazo = '—';
        if (d.isencaoFerias) {
            badgeStatus = '<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;" title="Em gozo de férias. Regularizar no retorno sem rebaixar conformidade geral.">🏖️ RETORNO FÉRIAS</span>';
            badgePrazo = `<span style="color:#0284c7; font-weight:700;">Regularizar no Retorno</span>`;
        } else if (d.statusKey === 'vencido') {
            badgeStatus = '<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🔴 VENCIDO</span>';
            badgePrazo = `<span style="color:#b91c1c; font-weight:700;">Há ${Math.abs(d.diffDays)} dia(s)</span>`;
        } else if (d.statusKey === 'vencendo30') {
            badgeStatus = '<span style="background:#ffedd5; color:#c2410c; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🟠 ATÉ 30 DIAS</span>';
            badgePrazo = `<span style="color:#ea580c; font-weight:700;">${d.diffDays === 0 ? 'Vence HOJE' : 'Em ' + d.diffDays + ' dia(s)'}</span>`;
        } else if (d.statusKey === 'vencendo60') {
            badgeStatus = '<span style="background:#fef9c3; color:#854d0e; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🟡 31 A 60 DIAS</span>';
            badgePrazo = `<span style="color:#ca8a04; font-weight:700;">Em ${d.diffDays} dia(s)</span>`;
        } else if (d.statusKey === 'em_dia') {
            badgeStatus = '<span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🟢 EM DIA</span>';
            badgePrazo = `<span style="color:#16a34a;">Em ${d.diffDays} dia(s)</span>`;
        } else {
            badgeStatus = '<span style="background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">⚪ SEM REGISTRO</span>';
            badgePrazo = '<span style="color:var(--text-light);">Urgente regularizar</span>';
        }

        const dataAdmFmt = d.dt_admissao ? formatSimpleDate(d.dt_admissao) : '—';
        const ultimoAsoFmt = d.ultimoAsoData 
            ? `<div>${formatSimpleDate(d.ultimoAsoData)}</div><div style="font-size:10px; color:var(--text-light); text-transform:uppercase;">${d.ultimoAsoTipo || 'ASO'}</div>`
            : '<span style="color:var(--text-light);">Nenhum</span>';
        const vencFmt = d.dataVencimento ? `<b>${formatSimpleDate(d.dataVencimento)}</b>` : '<span style="color:#b91c1c;">Pendente</span>';

        return `
            <tr style="border-bottom: 1px solid var(--border); font-size: 11.5px; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(2,132,199,0.03)'" onmouseout="this.style.background=''">
                <td style="padding: 8px 12px; font-weight: 700; color: var(--primary);">${escapeHTML(d.matricula)}</td>
                <td style="padding: 8px 12px;">
                    <div style="font-weight: 700; color: var(--text); cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(d.matricula)}')" title="Ver prontuário">${escapeHTML(d.nome)}</div>
                    ${d.cpf ? `<div style="font-size: 10.5px; color: var(--text-light);">CPF: ${escapeHTML(d.cpf)}</div>` : ''}
                </td>
                <td style="padding: 8px 12px;">
                    <div style="font-weight:600; color:var(--text);">${escapeHTML(d.gheNome)}</div>
                    <div style="font-size:10.5px; color:var(--text-light);">${escapeHTML(d.setor)}</div>
                </td>
                <td style="padding: 8px 12px; color: var(--text);">${escapeHTML(d.funcao)}</td>
                <td style="padding: 8px 12px; color: var(--text-light);">${dataAdmFmt}</td>
                <td style="padding: 8px 12px;">${ultimoAsoFmt}</td>
                <td style="padding: 8px 12px; font-size:11px;">
                    <span style="background:var(--bg); border:1px solid var(--border); padding:2px 6px; border-radius:4px;">${d.periodicidadeMeses} meses</span>
                </td>
                <td style="padding: 8px 12px;">${vencFmt}</td>
                <td style="padding: 8px 12px; text-align: center;">${badgePrazo}</td>
                <td style="padding: 8px 12px; text-align: center;">${badgeStatus}</td>
            </tr>
        `;
    }).join('');
}

// Impressão da Relação de Validade de ASOs para a Clínica Médica (Blob URL — 100% livre de bloqueador de popups)
function imprimirRelacaoValidadeAsos() {
    const prioritarios = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencido' || d.statusKey === 'vencendo30' || d.statusKey === 'vencendo60' || d.statusKey === 'sem_registro');
    const hojeStr = new Date().toLocaleDateString('pt-BR');

    const linhasHtml = prioritarios.map((c, i) => {
        let sit = 'Vencido';
        if (c.statusKey === 'vencendo30') sit = `Vence em ${c.diffDays}d`;
        else if (c.statusKey === 'vencendo60') sit = `Vence em ${c.diffDays}d`;
        else if (c.statusKey === 'sem_registro') sit = 'Sem ASO';

        return `
            <tr>
                <td style="text-align:center; font-weight:700;">${i + 1}</td>
                <td style="text-align:center; font-weight:700;">${escapeHTML(c.matricula)}</td>
                <td>
                    <b>${escapeHTML(c.nome)}</b>
                    <div style="font-size:9px; color:#555;">CPF: ${escapeHTML(c.cpf || '—')}</div>
                </td>
                <td>${escapeHTML(c.gheNome)}</td>
                <td>${escapeHTML(c.funcao)}</td>
                <td style="text-align:center;">${c.ultimoAsoData ? formatSimpleDate(c.ultimoAsoData) : '—'}</td>
                <td style="text-align:center; font-weight:700;">${c.dataVencimento ? formatSimpleDate(c.dataVencimento) : 'Pendente'}</td>
                <td style="text-align:center;">${sit}</td>
                <td style="width:120px; border-bottom:1px solid #000;">&nbsp;</td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Previsão e Validade de ASOs Periódicos — NR-07 / PCMSO (${hojeStr})</title>
    <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 15px; }
        .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:10px; }
        .cabecalho img { max-height:46px; }
        .titulo-doc { text-align:center; flex:1; }
        .titulo-doc h2 { margin:0; font-size:14px; font-weight:800; }
        .titulo-doc p { margin:2px 0 0; font-size:10.5px; color:#444; }
        table { width:100%; border-collapse:collapse; margin-top:8px; font-size:9.5px; }
        th, td { border:1px solid #444; padding:5px 6px; }
        th { background:#f1f5f9; font-weight:700; text-align:left; text-transform:uppercase; }
        .rodape-assinaturas { margin-top:24px; display:flex; justify-content:space-around; text-align:center; }
        .linha-assinatura { width:260px; border-top:1px solid #000; padding-top:4px; font-size:10px; }
        .no-print { text-align:center; margin-bottom:12px; }
        .no-print button { padding:8px 18px; font-size:12px; font-weight:700; background:#0284c7; color:#fff; border:none; border-radius:6px; cursor:pointer; }
        @media print { .no-print { display:none; } body { margin:0; } }
    </style>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir Relação Oficial para Agendamento Clínico</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo-doc">
            <h2>RELAÇÃO DE VENCIMENTOS E PREVISÃO DE ASOs PERIÓDICOS (NR-07 / PCMSO)</h2>
            <p>Controle Preventivo de Agendamentos — Vencidos e a Vencer em 30 e 60 Dias</p>
            <p><b>Posição em: ${hojeStr}</b> — Consórcio Operador PISF Ramal do Agreste</p>
        </div>
        <div style="width:46px;"></div>
    </div>

    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; margin-bottom:8px; font-size:10px;">
        <strong>Total Convocados para Agendamento: ${prioritarios.length}</strong> (Prioridade Máxima: Vencidos e Janela de 30/60 dias da NR-07)
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:25px; text-align:center;">#</th>
                <th style="width:50px; text-align:center;">Matr.</th>
                <th>Colaborador / CPF</th>
                <th>GHE / Setor</th>
                <th>Função</th>
                <th style="text-align:center;">Último ASO</th>
                <th style="text-align:center;">Vencimento</th>
                <th style="text-align:center;">Janela</th>
                <th>Data Agendada / Clínica</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml}
        </tbody>
    </table>

    <div class="rodape-assinaturas">
        <div class="linha-assinatura">
            <b>João Everton de Souza Limeira</b><br>
            Engenheiro de Segurança do Trabalho<br>
            CREA 12345/D-PE — Consórcio COP
        </div>
        <div class="linha-assinatura">
            <b>Médico do Trabalho / Clínica Conveniada</b><br>
            Responsável pelo PCMSO<br>
            CRM: _______________________
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Validade_ASOs_30_60_dias_${hojeStr.replace(/\//g, '-')}`);
}

function exportarExcelValidadeAsos() {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada.');
        return;
    }
    const rows = dadosValidadeAsosCache.map(d => ({
        'Matrícula': d.matricula,
        'Nome do Colaborador': d.nome,
        'CPF': d.cpf,
        'GHE': d.ghe,
        'Descrição GHE': d.gheNome,
        'Setor': d.setor,
        'Função': d.funcao,
        'Admissão': d.dt_admissao ? formatSimpleDate(d.dt_admissao) : '',
        'Último ASO (Data)': d.ultimoAsoData ? formatSimpleDate(d.ultimoAsoData) : '',
        'Último ASO (Tipo)': d.ultimoAsoTipo || '',
        'Periodicidade PCMSO (Meses)': d.periodicidadeMeses,
        'Data de Vencimento': d.dataVencimento ? formatSimpleDate(d.dataVencimento) : '',
        'Dias para Vencer': d.diffDays !== null ? d.diffDays : '',
        'Status de Validade': d.statusKey === 'vencido' ? 'VENCIDO' : d.statusKey === 'vencendo30' ? 'VENCE EM ATÉ 30 DIAS' : d.statusKey === 'vencendo60' ? 'VENCE EM 31 A 60 DIAS' : d.statusKey === 'em_dia' ? 'EM DIA' : 'SEM REGISTRO'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validade ASOs');
    const hoje = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Validade_ASOs_Periodicos_NR07_${hoje}.xlsx`);
}

function copiarAlertaValidadeAsosWhatsApp() {
    const vencidos = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencido');
    const v30 = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencendo30');
    const v60 = dadosValidadeAsosCache.filter(d => d.statusKey === 'vencendo60');

    let txt = `🚨 *ALERTA DE VALIDADE DE ASOs PERIÓDICOS (NR-07 / PCMSO)* 📅\n`;
    txt += `_Consórcio COP — Ramal do Agreste_\n\n`;
    txt += `📊 *Panorama Geral de Vencimentos:*\n`;
    txt += `🔴 *ASOs Já Vencidos:* ${vencidos.length} colaboradores\n`;
    txt += `🟠 *Vencendo nos próximos 30 dias:* ${v30.length} colaboradores\n`;
    txt += `🟡 *Vencendo entre 31 e 60 dias:* ${v60.length} colaboradores\n\n`;

    if (vencidos.length > 0) {
        txt += `⚠️ *URGENTE — JÁ VENCIDOS (${vencidos.length}):*\n`;
        vencidos.slice(0, 15).forEach((c, idx) => {
            txt += `   ${idx + 1}. ${c.nome} (Matr. ${c.matricula} - ${c.funcao}) - Vencido há ${Math.abs(c.diffDays)}d\n`;
        });
        if (vencidos.length > 15) txt += `   ... e mais ${vencidos.length - 15} colaboradores.\n`;
        txt += `\n`;
    }

    if (v30.length > 0) {
        txt += `🟠 *ATENÇÃO — VENCENDO EM ATÉ 30 DIAS (${v30.length}):*\n`;
        v30.slice(0, 15).forEach((c, idx) => {
            txt += `   ${idx + 1}. ${c.nome} (Matr. ${c.matricula} - ${c.funcao}) - Vence em ${c.diffDays}d (${formatSimpleDate(c.dataVencimento)})\n`;
        });
        if (v30.length > 15) txt += `   ... e mais ${v30.length - 15} colaboradores.\n`;
        txt += `\n`;
    }

    txt += `Solicitamos alinhamento com a Engenharia de Segurança para agendamento dos exames clínicos e complementares na clínica credenciada.\n`;
    txt += `_Engenharia de Segurança do Trabalho — Consórcio COP_`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => {
            alert('✅ Mensagem de alerta de vencimento de ASOs copiada para o WhatsApp!');
        }).catch(() => {
            prompt('Copie o texto abaixo:', txt);
        });
    } else {
        prompt('Copie o texto abaixo:', txt);
    }
}

// ============================================
// RECOMENDAÇÃO DE EXAMES E COMPLEMENTARES PCMSO MULTI-EXAMES
// ============================================
var exameComplementarFocoAtual = 'psicossocial';

// Marco temporal inicial oficial de implantação do programa estruturado de Avaliação Psicossocial
// (NR-01, NR-33, NR-35 e NR-10) no Consórcio Operador do PISF Ramal do Agreste (Julho/2026).
// Apenas admissões e exames realizados a partir de 01/07/2026 são considerados para fins de conformidade e renovação periódica.
var DATA_IMPLANTACAO_PSICOSSOCIAL = '2026-07-01';

var CATALOGO_EXAMES_COMPLEMENTARES = {
    psicossocial: {
        id: 'psicossocial',
        nomeExame: 'Avaliação Psicossocial',
        termosBusca: ['psicossocial', 'psico'],
        tituloHeader: '🧠 Recomendação de Exames — Avaliação Psicossocial (PGR & PCMSO)',
        descricaoBase: 'Exigência mandatória para atividades de risco crítico: Trabalho em Altura (NR-35), Espaço Confinado (NR-33) e Sistema Elétrico de Potência - SEP (NR-10).',
        ghesPadrao: ['05', '06', '07', '08', '10', '25', '26'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Psicóloga Responsável',
        tipoProfissional: 'CRP',
        localPadrao: 'Ambulatório / Sala Médica da Obra'
    },
    audiometria: {
        id: 'audiometria',
        nomeExame: 'Audiometria Ocupacional',
        termosBusca: ['audiometria', 'audio'],
        tituloHeader: '👂 Recomendação de Exames — Audiometria Tonal e Vocal (NR-07 Anexo II)',
        descricaoBase: 'Controle audiológico obrigatório para trabalhadores expostos a níveis de ruído contínuo ou intermitente acima dos limites de tolerância (NR-09 e NR-15).',
        ghesPadrao: ['01', '04', '05', '06', '07', '08', '10', '11', '12', '13', '17', '18', '19', '21', '25', '26', '27'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Fonoaudióloga Ocupacional',
        tipoProfissional: 'CRFa',
        localPadrao: 'Cabine Audiométrica / Ambulatório da Obra'
    },
    ecg: {
        id: 'ecg',
        nomeExame: 'Eletrocardiograma (ECG)',
        termosBusca: ['eletrocardiograma', 'ecg'],
        tituloHeader: '🫀 Recomendação de Exames — Eletrocardiograma (ECG)',
        descricaoBase: 'Rastreamento de arritmias e cardiopatias prévias obrigatório para atividades em altura (NR-35), eletricidade (NR-10) e manuseio de máquinas.',
        ghesPadrao: ['05', '06', '07', '08', '10', '15', '19', '25', '26'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Cardiologista / Clínico Responsável',
        tipoProfissional: 'CRM',
        localPadrao: 'Ambulatório da Obra / Clínica Credenciada'
    },
    espirometria: {
        id: 'espirometria',
        nomeExame: 'Espirometria Ocupacional',
        termosBusca: ['espirometria', 'espiro'],
        tituloHeader: '🫁 Recomendação de Exames — Espirometria Ocupacional (Função Pulmonar)',
        descricaoBase: 'Avaliação da integridade respiratória para operadores e frentes de manutenção com exposição a poeiras minerais, fumos e aerodispersóides.',
        ghesPadrao: ['05', '06', '07', '08', '10', '11', '12', '15', '19', '21', '25', '26'],
        periodicidadeMeses: 24,
        profissionalPadrao: 'Médico Pneumologista / Medicina do Trabalho',
        tipoProfissional: 'CRM',
        localPadrao: 'Ambulatório da Obra / Clínica Credenciada'
    },
    acuidade: {
        id: 'acuidade',
        nomeExame: 'Acuidade Visual',
        termosBusca: ['acuidade visual', 'acuidade'],
        tituloHeader: '👁️ Recomendação de Exames — Teste de Acuidade Visual (Snellen)',
        descricaoBase: 'Avaliação de acuidade e campo visual obrigatória para motoristas, operadores de máquinas e equipamentos, motosserras/roçadeiras e demais funções com exigência de vigilância visual para o trabalho.',
        ghesPadrao: ['08', '09', '10', '11', '12', '15', '25'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Médico Oftalmologista / Examinador Credenciado',
        tipoProfissional: 'CRM',
        localPadrao: 'Ambulatório da Obra / Clínica Credenciada'
    },
    rx_coluna: {
        id: 'rx_coluna',
        nomeExame: 'Raio X da Coluna Lombo Sacra',
        termosBusca: ['coluna lombo', 'raio x da coluna', 'rx coluna'],
        tituloHeader: '🦴 Recomendação de Exames — Raio X Coluna Lombo-Sacra (NR-17 Ergonomia)',
        descricaoBase: 'Acompanhamento preventivo osteomuscular para atividades que envolvem movimentação manual de peso, esforço postural e manutenção pesada.',
        ghesPadrao: ['05', '06', '07', '08', '11', '12', '15', '19', '26'],
        periodicidadeMeses: 24,
        profissionalPadrao: 'Médico Radiologista',
        tipoProfissional: 'CRM',
        localPadrao: 'Clínica de Diagnóstico por Imagem'
    },
    rx_torax: {
        id: 'rx_torax',
        nomeExame: 'Raio X de Tórax (Padrão OIT)',
        termosBusca: ['tórax', 'torax', 'padrão oit'],
        tituloHeader: '🫁 Recomendação de Exames — Raio X de Tórax Padrão OIT',
        descricaoBase: 'Rastreamento de pneumoconioses em colaboradores expostos a poeiras minerais, carpintaria / corte de madeira e atividades de manutenção civil com geração de poeira.',
        ghesPadrao: ['07', '19'],
        periodicidadeMeses: 60,
        profissionalPadrao: 'Médico Radiologista / Leitor OIT',
        tipoProfissional: 'CRM',
        localPadrao: 'Clínica de Imagem Credenciada'
    },
    glicose: {
        id: 'glicose',
        nomeExame: 'Glicemia de Jejum (Glicose)',
        termosBusca: ['glicose', 'glicemia'],
        tituloHeader: '🩸 Recomendação de Exames — Glicemia de Jejum / Glicose (Laboratorial)',
        descricaoBase: 'Controle metabólico para prevenção de mal súbito, vertigens e síncopes em trabalhadores executantes de atividades operacionais, em altura e espaços confinados.',
        ghesPadrao: ['04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '17', '18', '19', '20', '21', '25', '26', '27'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Laboratório de Análises Clínicas',
        tipoProfissional: 'CRF / CRBM',
        localPadrao: 'Posto de Coleta Ambulatorial da Obra'
    },
    hemograma: {
        id: 'hemograma',
        nomeExame: 'Hemograma Completo',
        termosBusca: ['hemograma'],
        tituloHeader: '🩸 Recomendação de Exames — Hemograma Completo (Laboratorial)',
        descricaoBase: 'Avaliação hematológica abrangente para rastreamento de anemias e respostas infecciosas nos trabalhadores de frente de obra.',
        ghesPadrao: ['04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '17', '18', '19', '20', '21', '25', '26', '27'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Laboratório de Análises Clínicas',
        tipoProfissional: 'CRF / CRBM',
        localPadrao: 'Posto de Coleta Ambulatorial da Obra'
    },
    ige_abelha: {
        id: 'ige_abelha',
        nomeExame: 'IgE Específica - Abelha',
        termosBusca: ['ige específica', 'ige especifica', 'abelha'],
        tituloHeader: '🐝 Recomendação de Exames — IgE Específica - Veneno de Abelha (Risco Biológico)',
        descricaoBase: 'Identificação admissional de hipersensibilidade e risco de choque anafilático para equipes de campo, manutenção civil, motosserristas, roçadeiras e inspeção de estruturas.',
        ghesPadrao: ['07', '08', '27'],
        periodicidadeMeses: null,
        profissionalPadrao: 'Laboratório de Análises Clínicas',
        tipoProfissional: 'CRF / CRBM',
        localPadrao: 'Posto de Coleta Ambulatorial da Obra'
    },
    matriz_geral: {
        id: 'matriz_geral',
        nomeExame: 'Matriz Geral de Exames do PCMSO',
        termosBusca: [],
        tituloHeader: '📋 Matriz Geral de Exames Complementares do PCMSO (Consolidado)',
        descricaoBase: 'Visão consolidada de todas as exigências clínicas e complementares do PCMSO para os 27 Grupos Homogêneos de Exposição (GHEs) da obra.',
        ghesPadrao: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27'],
        periodicidadeMeses: 12,
        profissionalPadrao: 'Médico Coordenador do PCMSO',
        tipoProfissional: 'CRM',
        localPadrao: 'Consórcio COP / Clínica Credenciada'
    }
};

function aoMudarExameComplementarFoco() {
    const sel = document.getElementById('selExameComplementarFoco');
    if (sel) {
        exameComplementarFocoAtual = sel.value;
    }
    selecionadosPsicoConvocacao.clear();
    renderRecomendacaoPsicossocial();
}

// Capacidade sugerida de atendimentos por dia (vagas)
function obterCapacidadeMutiraoPsico() {
    return parseInt(localStorage.getItem('psico_capacidade_vagas') || '20', 10);
}

function salvarCapacidadeMutiraoPsico(vagas) {
    const v = parseInt(vagas, 10) || 20;
    localStorage.setItem('psico_capacidade_vagas', String(v));
    supabaseUpsert('configuracoes_sistema', [{
        id: 'psico_capacidade_vagas',
        valor: String(v),
        descricao: 'Capacidade sugerida de atendimentos da psicóloga por dia (vagas).',
        atualizado_em: new Date().toISOString(),
        atualizado_por: usuarioDashboardAtual() || 'painel'
    }]).catch(err => console.warn('Erro ao sincronizar capacidade no banco:', err));
}

// Conjunto de matrículas selecionadas para convocação na tabela principal
var selecionadosPsicoConvocacao = new Set();

// Data do próximo mutirão / visita clínica para o exame em foco
function obterDataMutiraoPsico() {
    const chave = `exame_data_mutirao_${exameComplementarFocoAtual}`;
    return localStorage.getItem(chave) || localStorage.getItem('psico_data_mutirao') || '2026-10-27';
}

function salvarDataMutiraoPsico(novaData) {
    if (novaData) {
        localStorage.setItem(`exame_data_mutirao_${exameComplementarFocoAtual}`, novaData);
        if (exameComplementarFocoAtual === 'psicossocial') {
            localStorage.setItem('psico_data_mutirao', novaData);
            supabaseUpsert('configuracoes_sistema', [{
                id: 'psico_data_mutirao',
                valor: novaData,
                descricao: 'Data prevista para o mutirão/atendimento da Avaliação Psicossocial.',
                atualizado_em: new Date().toISOString(),
                atualizado_por: usuarioDashboardAtual() || 'painel'
            }]).catch(err => console.warn('Erro ao sincronizar data mutirão no banco:', err));
        }
    }
}

// Verificação de Exame Psicossocial Efetivamente Realizado (Anti-Falso Positivo)
function verificarExamePsicossocialRealizado(matricula, asosDoColab) {
    const MARCO = DATA_IMPLANTACAO_PSICOSSOCIAL || '2026-07-01';

    for (const a of asosDoColab) {
        const tipoAsoLower = (a.tipo_aso || '').toLowerCase();
        const dataAso = a.data_exame || '';

        // 1. Registro dedicado de Avaliação Psicossocial realizado a partir do marco
        if (tipoAsoLower.includes('psico') || tipoAsoLower.includes('psicossocial')) {
            if (dataAso && dataAso >= MARCO) {
                const venc = a.data_vencimento || (typeof addMeses === 'function' ? addMeses(dataAso, 12) : null);
                return {
                    realizado: true,
                    dataExame: dataAso,
                    dataVencimento: venc,
                    resultado: a.resultado || 'Apto',
                    profissional: a.medico_responsavel || 'Psicóloga Responsável',
                    tipoAso: a.tipo_aso,
                    asoId: a.id
                };
            }
        }

        // 2. Registro em exames_detalhe com realização efetiva confirmada
        if (Array.isArray(a.exames_detalhe)) {
            for (const item of a.exames_detalhe) {
                const nomeItem = (item.nome || '').toLowerCase();
                if (nomeItem.includes('psico')) {
                    const dtItem = item.data_avaliacao || (item.resultado ? (item.data_exame || dataAso) : null);
                    const temResultadoOuTipo = !!(item.resultado || item.tipo === 'psicossocial' || item.crp || (item.obs && item.obs.toLowerCase().includes('psico')));

                    if (dtItem && dtItem >= MARCO && temResultadoOuTipo) {
                        const venc = item.data_vencimento || (typeof addMeses === 'function' ? addMeses(dtItem, 12) : a.data_vencimento);
                        return {
                            realizado: true,
                            dataExame: dtItem,
                            dataVencimento: venc,
                            resultado: item.resultado || a.resultado || 'Apto',
                            profissional: item.profissional || a.medico_responsavel || 'Psicóloga Responsável',
                            tipoAso: a.tipo_aso,
                            asoId: a.id
                        };
                    }
                }
            }
        }

        // 3. Anotação explícita no campo obs de que foi realizada no mutirão/visita
        if (a.obs && a.obs.toLowerCase().includes('avaliação psicossocial em')) {
            const matchData = a.obs.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (matchData) {
                const dtIso = `${matchData[3]}-${matchData[2]}-${matchData[1]}`;
                if (dtIso >= MARCO) {
                    return {
                        realizado: true,
                        dataExame: dtIso,
                        dataVencimento: typeof addMeses === 'function' ? addMeses(dtIso, 12) : null,
                        resultado: 'Apto',
                        profissional: a.medico_responsavel || 'Psicóloga Responsável',
                        tipoAso: a.tipo_aso,
                        asoId: a.id
                    };
                }
            }
        }
    }

    return { realizado: false };
}

// Verifica se um nome de exame bate com o exameCfg selecionado no catálogo
function nomeExameCorrespondeAoCatalogo(nomeItem, exameCfg) {
    if (!nomeItem || !exameCfg) return false;
    const nLower = String(nomeItem).toLowerCase().trim();
    const termos = Array.isArray(exameCfg.termosBusca) && exameCfg.termosBusca.length > 0
        ? exameCfg.termosBusca
        : [String(exameCfg.nomeExame || '').toLowerCase().slice(0, 6)];
    return termos.some(t => t && nLower.includes(t.toLowerCase()));
}

// GHEs obrigatórios para o exame selecionado
function obterGhesObrigatoriosPsicossocial() {
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;

    // Fonte única da matriz: PCMSO_EXAMES_POR_GHE, já sobreposta pelo banco em
    // carregarMatrizPcmsoExames(). O override por navegador (localStorage
    // 'exame_ghes_custom_*') foi desativado no v228: ele vencia a detecção e fazia
    // cada máquina enxergar uma matriz diferente da do banco.
    if (exameComplementarFocoAtual === 'matriz_geral') {
        return new Set(exameCfg.ghesPadrao || []);
    }

    // Detecta dinamicamente no catálogo PCMSO_EXAMES_POR_GHE usando termosBusca precisos
    const detectados = new Set();
    if (typeof PCMSO_EXAMES_POR_GHE === 'object') {
        Object.entries(PCMSO_EXAMES_POR_GHE).forEach(([gId, info]) => {
            const num = gId.startsWith('G') ? gId.slice(1) : gId;
            if (Array.isArray(info.exames) && info.exames.some(e => nomeExameCorrespondeAoCatalogo(e.nome, exameCfg))) {
                detectados.add(normalizarGhe(num));
            }
        });
    }

    if (detectados.size === 0) {
        (exameCfg.ghesPadrao || []).forEach(g => detectados.add(g));
    }
    return detectados;
}

function obterNomeGheCompleto(gheId) {
    const num = normalizarGhe(gheId);
    if (typeof allGheCatalogo === 'object' && Array.isArray(allGheCatalogo)) {
        const item = allGheCatalogo.find(g => normalizarGhe(g.id) === num);
        if (item && item.nome) return item.nome;
    }
    const chaveG = `G${num}`;
    if (typeof PCMSO_EXAMES_POR_GHE === 'object' && PCMSO_EXAMES_POR_GHE[chaveG]) {
        return `GHE ${num} - ${PCMSO_EXAMES_POR_GHE[chaveG].nome}`;
    }
    const fallbackNomes = {
        '05': 'GHE 05 - Manutenção Elétrica',
        '06': 'GHE 06 - Manutenção Mecânica',
        '07': 'GHE 07 - Manutenção Civil',
        '08': 'GHE 08 - Motosserras e Roçadeiras',
        '10': 'GHE 10 - Operador de SH',
        '25': 'GHE 25 - Operador de Subestação',
        '26': 'GHE 26 - Conservação e Limpeza'
    };
    return fallbackNomes[num] || `GHE ${num}`;
}

function obterNomeCurtoSetorGhe(gheId) {
    const nome = obterNomeGheCompleto(gheId);
    return nome.replace(/^GRUPO\s*\d+\s*-\s*/i, '').replace(/^GHE\s*\d+\s*-\s*/i, '').trim();
}

var psicoFiltroStatusAtual = 'todos'; // 'todos' | 'pendentes' | 'vencendo' | 'em_dia' | 'ferias'

// ==============================================================
// HELPERS DE FÉRIAS E AFASTAMENTOS (NR-07 / GESTÃO OPERACIONAL)
// ==============================================================
function obterRegistroFeriasColab(matricula, dataRefIso) {
    if (!matricula) return null;
    if (typeof obterRegistroFeriasAtivo === 'function') {
        const r = obterRegistroFeriasAtivo(matricula, dataRefIso);
        if (r) return r;
    }
    const feriasLista = (Array.isArray(allColaboradoresFerias) && allColaboradoresFerias.length > 0)
        ? allColaboradoresFerias
        : (Array.isArray(window.allColaboradoresFerias) ? window.allColaboradoresFerias : []);
    if (feriasLista.length === 0) return null;
    const ref = dataRefIso || new Date().toISOString().split('T')[0];
    const matStr = String(matricula).trim();
    return feriasLista.find(f => {
        if (String(f.matricula || '').trim() !== matStr || f.status === 'cancelada') return false;
        if (f.data_inicio && f.data_fim) {
            return ref >= f.data_inicio && ref <= f.data_fim;
        }
        return f.status === 'em_gozo';
    }) || null;
}

function obterRegistroAtestadoAtivo(matricula, dataRefIso) {
    if (!matricula) return null;
    const atestadosLista = (Array.isArray(allAtestadosOcupacionais) && allAtestadosOcupacionais.length > 0)
        ? allAtestadosOcupacionais
        : (Array.isArray(window.allAtestadosOcupacionais) ? window.allAtestadosOcupacionais : []);
    if (atestadosLista.length === 0) return null;
    const ref = dataRefIso || new Date().toISOString().split('T')[0];
    const matStr = String(matricula).trim();
    return atestadosLista.find(a => {
        if (String(a.matricula || '').trim() !== matStr) return false;
        const dtIni = a.data_inicio || '';
        if (!dtIni) return false;
        let dtFim = a.data_fim || '';
        if (!dtFim && a.dias_afastamento) {
            dtFim = addDias(dtIni, Math.max(1, parseInt(a.dias_afastamento, 10)) - 1);
        }
        if (!dtFim) dtFim = dtIni;
        return ref >= dtIni && ref <= dtFim;
    }) || null;
}

// Popular dinamicamente os filtros de Equipe / Encarregado e Setor (Zero Hardcode - Regra de Ouro)
function popularFiltrosEquipeRecomendacaoExames() {
    const selLider = document.getElementById('psicoFiltroLider');
    const selSetor = document.getElementById('psicoFiltroSetor');
    const resumoEl = document.getElementById('psicoResumoFiltrosEquipe');

    try {
        if (!selLider) return;

        const valLiderAtual = selLider.value;
        const valSetorAtual = selSetor ? selSetor.value : '';

        // Sincroniza allEfetivo com escopo global se necessário
        if ((!allEfetivo || allEfetivo.length === 0) && Array.isArray(window.allEfetivo) && window.allEfetivo.length > 0) {
            allEfetivo = window.allEfetivo;
        }

        // Se ainda estiver vazio, dispara consulta assíncrona ao Supabase sem travar o painel
        if ((!allEfetivo || allEfetivo.length === 0) && typeof supabaseFetch === 'function' && !window._buscandoEfetivoPsico) {
            window._buscandoEfetivoPsico = true;
            supabaseFetch('colaboradores_efetivo', '?select=*').then(rows => {
                window._buscandoEfetivoPsico = false;
                if (Array.isArray(rows) && rows.length > 0) {
                    allEfetivo = rows;
                    window.allEfetivo = rows;
                    popularFiltrosEquipeRecomendacaoExames();
                    renderTabelaRecomendacaoPsicossocial();
                }
            }).catch(err => {
                window._buscandoEfetivoPsico = false;
                console.warn('Aviso ao carregar colaboradores_efetivo para filtros de equipe:', err);
            });
        }

        const efetivoBase = Array.isArray(allEfetivo) ? allEfetivo : [];
        const ativos = efetivoBase.filter(e => {
            try {
                return (typeof colaboradorEstaAtivo === 'function') ? colaboradorEstaAtivo(e) : (String(e.status || '').toLowerCase().startsWith('ativo'));
            } catch (_) {
                return true;
            }
        });

        const regexLider = /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i;

        // 1. Mapear responsáveis e líderes a partir de colaboradores_efetivo com proteção rigorosa a nulos
        const lideresMap = new Map();

        efetivoBase.forEach(e => {
            if (!e) return;
            const resp = (e.responsavel || '').trim();
            if (!resp || resp === '-' || resp === '—') return;
            const respKey = resp.toUpperCase();
            if (!lideresMap.has(respKey)) {
                lideresMap.set(respKey, {
                    valor: resp,
                    nome: resp,
                    nomeCompleto: '',
                    funcao: 'Equipe / Frente de Campo',
                    setor: (e.setor || '').trim(),
                    totalAtivos: 0
                });
            }
            const estaAtivo = (typeof colaboradorEstaAtivo === 'function') ? colaboradorEstaAtivo(e) : (String(e.status || '').toLowerCase().startsWith('ativo'));
            if (estaAtivo) {
                lideresMap.get(respKey).totalAtivos++;
            }
        });

        // Vincula colaboradores com funções de liderança formal às frentes ou cria opção individual
        efetivoBase.forEach(e => {
            if (!e) return;
            const func = (e.funcao || '').trim();
            const ehLider = regexLider.test(func);
            if (!ehLider) return;
            const nomeStr = (e.nome || '').trim();
            if (!nomeStr) return;
            const nomeUpper = nomeStr.toUpperCase();
            const respUpper = (e.responsavel || '').trim().toUpperCase();

            let achou = false;
            for (let [k, item] of lideresMap.entries()) {
                if (nomeUpper.includes(k) || k.includes(nomeUpper) || (respUpper && respUpper === k)) {
                    item.nomeCompleto = nomeStr;
                    item.funcao = func || item.funcao;
                    if (e.setor) item.setor = (e.setor || '').trim();
                    achou = true;
                    break;
                }
            }

            const estaAtivo = (typeof colaboradorEstaAtivo === 'function') ? colaboradorEstaAtivo(e) : (String(e.status || '').toLowerCase().startsWith('ativo'));
            if (!achou && estaAtivo) {
                const val = `NOME:${nomeStr}`;
                lideresMap.set(val.toUpperCase(), {
                    valor: val,
                    nome: nomeStr,
                    nomeCompleto: nomeStr,
                    funcao: func || 'Líder / Encarregado',
                    setor: (e.setor || '').trim(),
                    totalAtivos: 1
                });
            }
        });

        const listaLideres = Array.from(lideresMap.values()).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        let htmlLider = '<option value="">Todos os Encarregados / Equipes</option>';
        listaLideres.forEach(item => {
            const qtdTxt = item.totalAtivos > 0 ? ` (${item.totalAtivos} ativos)` : '';
            const descTxt = item.nomeCompleto ? `${item.nome} — ${item.nomeCompleto} [${item.funcao}]${qtdTxt}` : `${item.nome} [${item.funcao}]${qtdTxt}`;
            htmlLider += `<option value="${escapeHTML(item.valor)}">${escapeHTML(descTxt)}</option>`;
        });
        selLider.innerHTML = htmlLider;
        if (valLiderAtual && Array.from(selLider.options).some(o => o.value === valLiderAtual)) {
            selLider.value = valLiderAtual;
        }

        // 2. Mapear setores dinamicamente com proteção a nulos
        if (selSetor) {
            const setoresSet = new Set();
            ativos.forEach(e => {
                const s = (e && e.setor ? String(e.setor) : '').trim();
                if (s) setoresSet.add(s);
            });
            const setores = Array.from(setoresSet).sort((a, b) => a.localeCompare(b));
            let htmlSetor = '<option value="">Todos os Setores / Frentes</option>';
            setores.forEach(s => {
                htmlSetor += `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`;
            });
            selSetor.innerHTML = htmlSetor;
            if (valSetorAtual && Array.from(selSetor.options).some(o => o.value === valSetorAtual)) {
                selSetor.value = valSetorAtual;
            }
        }
    } catch (err) {
        console.error('Erro ao popular filtros de equipe/encarregados:', err);
        if (selLider && (!selLider.options || selLider.options.length <= 1)) {
            selLider.innerHTML = '<option value="">Todos os Encarregados / Equipes</option>';
        }
        if (selSetor && (!selSetor.options || selSetor.options.length <= 1)) {
            selSetor.innerHTML = '<option value="">Todos os Setores / Frentes</option>';
        }
    } finally {
        // Remove rigorosamente o indicador visual travado "Carregando dados da equipe..."
        if (resumoEl && resumoEl.textContent.includes('Carregando dados da equipe')) {
            const totalColabs = (typeof obterDadosRecomendacaoPsicossocial === 'function')
                ? (obterDadosRecomendacaoPsicossocial() || []).length
                : (allEfetivo ? allEfetivo.length : 0);
            resumoEl.innerHTML = totalColabs > 0
                ? `Visão Geral da Obra (${totalColabs} colaboradores monitorados)`
                : `Visão Geral da Obra`;
        }
    }
}

function aoMudarFiltroEquipePsico() {
    renderTabelaRecomendacaoPsicossocial();
}

function obterDadosRecomendacaoPsicossocial() {
    // Sincroniza arrays com o escopo global do window
    if ((!allEfetivo || allEfetivo.length === 0) && Array.isArray(window.allEfetivo) && window.allEfetivo.length > 0) {
        allEfetivo = window.allEfetivo;
    }
    if ((!allColaboradoresFerias || allColaboradoresFerias.length === 0) && Array.isArray(window.allColaboradoresFerias) && window.allColaboradoresFerias.length > 0) {
        allColaboradoresFerias = window.allColaboradoresFerias;
    }
    if ((!allAtestadosOcupacionais || allAtestadosOcupacionais.length === 0) && Array.isArray(window.allAtestadosOcupacionais) && window.allAtestadosOcupacionais.length > 0) {
        allAtestadosOcupacionais = window.allAtestadosOcupacionais;
    }
    if ((!allAsoExames || allAsoExames.length === 0) && Array.isArray(window.allAsoExames) && window.allAsoExames.length > 0) {
        allAsoExames = window.allAsoExames;
    }

    if ((!allAsoExames || allAsoExames.length === 0) && typeof supabaseFetch === 'function' && !window._buscandoAsoPsico) {
        window._buscandoAsoPsico = true;
        supabaseFetch('aso_exames', '?select=*').then(rows => {
            window._buscandoAsoPsico = false;
            if (Array.isArray(rows)) {
                allAsoExames = rows;
                window.allAsoExames = rows;
                renderRecomendacaoPsicossocial();
            }
        }).catch(err => {
            window._buscandoAsoPsico = false;
            console.warn('Aviso ao carregar aso_exames sob demanda:', err);
        });
    }

    // Se férias ou atestados ainda não estiverem carregados na memória, dispara consulta assíncrona sob demanda
    if ((!allColaboradoresFerias || allColaboradoresFerias.length === 0) && typeof supabaseFetch === 'function' && !window._buscandoFeriasPsico) {
        window._buscandoFeriasPsico = true;
        supabaseFetch('colaboradores_ferias', '?select=*&order=limite_concessivo_fatal.asc').then(rows => {
            window._buscandoFeriasPsico = false;
            if (Array.isArray(rows)) {
                allColaboradoresFerias = rows;
                window.allColaboradoresFerias = rows;
                renderRecomendacaoPsicossocial();
            }
        }).catch(err => {
            window._buscandoFeriasPsico = false;
            console.warn('Aviso ao carregar colaboradores_ferias sob demanda:', err);
        });
    }

    if ((!allAtestadosOcupacionais || allAtestadosOcupacionais.length === 0) && typeof supabaseFetch === 'function' && !window._buscandoAtestadosPsico) {
        window._buscandoAtestadosPsico = true;
        supabaseFetch('atestados_ocupacionais', '?select=*').then(rows => {
            window._buscandoAtestadosPsico = false;
            if (Array.isArray(rows)) {
                allAtestadosOcupacionais = rows;
                window.allAtestadosOcupacionais = rows;
                renderRecomendacaoPsicossocial();
            }
        }).catch(err => {
            window._buscandoAtestadosPsico = false;
            console.warn('Aviso ao carregar atestados_ocupacionais sob demanda:', err);
        });
    }

    const ativos = (allEfetivo || []).filter(e => {
        try {
            return (typeof colaboradorEstaAtivo === 'function') ? colaboradorEstaAtivo(e) : (String(e.status || '').toLowerCase().startsWith('ativo'));
        } catch (_) {
            return true;
        }
    });
    const hojeStr = new Date().toISOString().split('T')[0];
    const dataMutirao = obterDataMutiraoPsico();
    const dataRefChecagem = (dataMutirao && dataMutirao >= hojeStr) ? dataMutirao : hojeStr;
    const ghesObrigatorios = obterGhesObrigatoriosPsicossocial();
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const ehPsico = (exameComplementarFocoAtual === 'psicossocial' || exameCfg.id === 'psicossocial');
    const ehMatrizGeral = (exameComplementarFocoAtual === 'matriz_geral' || exameCfg.id === 'matriz_geral');
    const ghesPsicoSet = new Set(CATALOGO_EXAMES_COMPLEMENTARES.psicossocial.ghesPadrao || ['05', '06', '07', '08', '10', '25', '26']);
    const MARCO = DATA_IMPLANTACAO_PSICOSSOCIAL || '2026-07-01';
    const lista = [];

    const dataLimiteVencendo = addMeses(hojeStr, 2);

    ativos.forEach(c => {
        const g = normalizarGhe(c.ghe);
        if (!ghesObrigatorios.has(g)) return;

        const dtAdm = c.dt_admissao || c.data_admissao || '';
        const admitidoAposMarco = !!(dtAdm && dtAdm >= MARCO);

        const asos = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === String(c.id || '').trim())
            .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));

        // Separa os ASOs Gerais (Admissional, Periódico, etc.) dos lançamentos avulsos de Avaliação Psicossocial
        const asosGerais = asos.filter(ehRegistroAsoGeralPcmso);
        const ultimoAso = asosGerais[0] || asos[0] || null;
        const aguardandoResultadoClinica = !!(ultimoAso && ultimoAso.obs && String(ultimoAso.obs).toLowerCase().includes('aguardando resultado'));

        // Identificar o último ASO Periódico do colaborador
        const asosPeriodicos = asosGerais.filter(a => (a.tipo_aso || '').toLowerCase().includes('period'));
        const ultimoPeriodico = asosPeriodicos[0] || null;
        const dataUltimoPeriodico = ultimoPeriodico ? (ultimoPeriodico.data_exame || '') : '';
        const periodicoAposMarco = !!(dataUltimoPeriodico && dataUltimoPeriodico >= MARCO);

        // Exames do GHE exigidos pelo PCMSO
        const infoGheColab = typeof examesGheColaborador === 'function' ? examesGheColaborador(c) : null;
        const examesPcmsoGhe = (infoGheColab && Array.isArray(infoGheColab.exames))
            ? infoGheColab.exames.map(e => e.nome)
            : [exameCfg.nomeExame];

        let temExame = false;
        let dataExame = null;
        let vencExame = null;
        let tipoAsoExame = null;
        let asoIdExame = null;
        let statusKey = 'EM_DIA';
        let statusLabel = '🟢 EM DIA';
        let statusBadge = '';
        let motivoDetalhado = '';
        let resumoMatrizHtml = '';

        if (ehPsico) {
            // Lógica específica com matriz anti-falso positivo da Avaliação Psicossocial
            const infoPsico = verificarExamePsicossocialRealizado(c.id, asos);

            if (infoPsico.realizado) {
                temExame = true;
                dataExame = infoPsico.dataExame;
                vencExame = infoPsico.dataVencimento || (dataExame ? addMeses(dataExame, 12) : null);
                tipoAsoExame = infoPsico.tipoAso;
                asoIdExame = infoPsico.asoId;

                if (vencExame && vencExame < hojeStr) {
                    statusKey = 'VENCIDO';
                    statusLabel = '🔴 VENCIDO (Renovação Periódica)';
                    statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 VENCIDO</span>';
                    motivoDetalhado = `Renovação Periódica (Vencido em ${formatSimpleDate(vencExame)})`;
                } else if (vencExame && vencExame <= dataLimiteVencendo) {
                    statusKey = 'VENCENDO';
                    statusLabel = `🟡 VENCENDO EM BREVE (Aproveitar Atendimento)`;
                    statusBadge = `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟡 VENCE EM ${formatSimpleDate(vencExame)}</span>`;
                    motivoDetalhado = `Renovação Periódica (Vence em ${formatSimpleDate(vencExame)})`;
                } else {
                    statusKey = 'EM_DIA';
                    statusLabel = '🟢 EM DIA';
                    statusBadge = '<span style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟢 EM DIA</span>';
                    motivoDetalhado = `Avaliação Válida até ${formatSimpleDate(vencExame)}`;
                }
            } else {
                temExame = false;

                if (admitidoAposMarco) {
                    statusKey = 'PENDENTE';
                    statusLabel = '🔴 Pendente (Admissional)';
                    statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 PENDENTE (ADMISSIONAL)</span>';
                    motivoDetalhado = 'Pendente de Inclusão (Admitido após 01/07/2026 sem Avaliação Psicossocial)';
                } else if (periodicoAposMarco) {
                    statusKey = 'PENDENTE';
                    statusLabel = '🔴 Pendente (Periódico)';
                    statusBadge = '<span style="background:#fee2e2; color:#b91c1c; border:1px solid #f87171; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px; box-shadow: 0 1px 2px rgba(185,28,28,0.15);">🔴 PENDENTE (PERIÓDICO)</span>';
                    motivoDetalhado = `Pendente (Periódico realizado em ${formatSimpleDate(dataUltimoPeriodico)} sem Psicossocial)`;
                } else {
                    const vencAso = ultimoAso ? ultimoAso.data_vencimento : null;
                    if (vencAso && vencAso < hojeStr) {
                        statusKey = 'VENCIDO';
                        statusLabel = '🔴 VENCIDO (ASO Geral Vencido)';
                        statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 VENCIDO (ASO)</span>';
                        motivoDetalhado = `ASO Geral Vencido em ${formatSimpleDate(vencAso)} (Exigirá Psicossocial na Renovação)`;
                    } else if (vencAso && vencAso <= dataLimiteVencendo) {
                        statusKey = 'VENCENDO';
                        statusLabel = `🟡 VENCENDO (Próximo Periódico em ${formatSimpleDate(vencAso)})`;
                        statusBadge = `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟡 VENCE EM ${formatSimpleDate(vencAso)}</span>`;
                        motivoDetalhado = `Renovação Periódica Próxima em ${formatSimpleDate(vencAso)} (Incluir Psicossocial)`;
                    } else {
                        statusKey = 'EM_DIA';
                        statusLabel = '🟢 REGULAR (Aguardando Próximo Periódico)';
                        statusBadge = '<span style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Admitido antes de 01/07/2026. Psicossocial será obrigatório no próximo periódico.">🟢 REGULAR (PCMSO)</span>';
                        motivoDetalhado = `Regular (Admissão Pré-Julho/2026 — Psicossocial no Próximo Periódico)`;
                    }
                }
            }
        } else if (ehMatrizGeral) {
            // ==============================================================
            // MATRIZ GERAL DE EXAMES DO PCMSO (CONSOLIDADO POR GHE)
            // Avalia o ASO Geral do colaborador + todos os exames exigidos pelo seu GHE
            // ==============================================================
            const totalExamesGhe = examesPcmsoGhe.length;
            const exigePsicoNoGhe = ghesPsicoSet.has(g);
            const infoPsico = exigePsicoNoGhe ? verificarExamePsicossocialRealizado(c.id, asos) : { realizado: true };
            const pendenciaPsicoPosMarco = exigePsicoNoGhe && !infoPsico.realizado && (admitidoAposMarco || periodicoAposMarco);

            if (ultimoAso && ultimoAso.data_exame) {
                temExame = true;
                dataExame = ultimoAso.data_exame;
                const perAso = typeof periodicidadeAsoPeriodico === 'function' ? periodicidadeAsoPeriodico(c) : 12;
                vencExame = ultimoAso.data_vencimento || addMeses(dataExame, perAso);
                tipoAsoExame = ultimoAso.tipo_aso;
                asoIdExame = ultimoAso.id;

                if (pendenciaPsicoPosMarco) {
                    const qtdOk = Math.max(0, totalExamesGhe - 1);
                    resumoMatrizHtml = `<div style="font-size:10.5px; color:#b91c1c; font-weight:700; margin-top:2px;" title="Exames clínicos e laboratoriais realizados em ${formatSimpleDate(dataExame)}. Pendente apenas Avaliação Psicossocial.">⚠️ ${qtdOk}/${totalExamesGhe} OK (Pend. Psicossocial)</div>`;
                    statusKey = 'PENDENTE';
                    statusLabel = '🔴 Pendente (Avaliação Psicossocial)';
                    statusBadge = '<span style="background:#fee2e2; color:#b91c1c; border:1px solid #f87171; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Exames periódicos realizados; pendente apenas a Avaliação Psicossocial">🔴 PEND. PSICOSSOCIAL</span>';
                    motivoDetalhado = `Exames periódicos realizados em ${formatSimpleDate(dataExame)} — Pendente apenas Avaliação Psicossocial`;
                } else if (vencExame && vencExame < hojeStr) {
                    resumoMatrizHtml = `<div style="font-size:10.5px; color:#b91c1c; font-weight:700; margin-top:2px;">🔴 Ciclo Periódico Vencido (${totalExamesGhe} exames)</div>`;
                    statusKey = 'VENCIDO';
                    statusLabel = '🔴 VENCIDO (Renovação Periódica PCMSO)';
                    statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 VENCIDO</span>';
                    motivoDetalhado = `Renovação Periódica PCMSO (Vencido em ${formatSimpleDate(vencExame)})`;
                } else if (vencExame && vencExame <= dataLimiteVencendo) {
                    resumoMatrizHtml = `<div style="font-size:10.5px; color:#b45309; font-weight:700; margin-top:2px;" title="Exames do GHE: ${escapeHTML(examesPcmsoGhe.join(', '))}">🟡 ${totalExamesGhe}/${totalExamesGhe} Exames (Renovação Próxima)</div>`;
                    statusKey = 'VENCENDO';
                    statusLabel = `🟡 VENCENDO EM BREVE (${formatSimpleDate(vencExame)})`;
                    statusBadge = `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟡 VENCE EM ${formatSimpleDate(vencExame)}</span>`;
                    motivoDetalhado = `Renovação Periódica PCMSO em ${formatSimpleDate(vencExame)} (${examesPcmsoGhe.join(', ')})`;
                } else {
                    resumoMatrizHtml = `<div style="font-size:10.5px; color:#047857; font-weight:700; margin-top:2px;" title="Exames em dia: ${escapeHTML(examesPcmsoGhe.join(', '))}">✅ ${totalExamesGhe}/${totalExamesGhe} Exames GHE OK</div>`;
                    statusKey = 'EM_DIA';
                    statusLabel = '🟢 EM DIA (PCMSO Regular)';
                    statusBadge = '<span style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟢 EM DIA</span>';
                    motivoDetalhado = `Matriz PCMSO em dia até ${formatSimpleDate(vencExame)}`;
                }
            } else {
                temExame = false;
                statusKey = 'PENDENTE';
                statusLabel = '🔴 Pendente (Sem ASO Registrado)';
                statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 PENDENTE</span>';
                motivoDetalhado = 'Colaborador sem registro de ASO no sistema';
            }
        } else {
            // ==============================================================
            // EXAMES COMPLEMENTARES ESPECÍFICOS DO CATÁLOGO
            // (Audiometria, ECG, Espirometria, Acuidade, RX Coluna, RX Tórax, Glicose, Hemograma, IgE Abelha)
            // ==============================================================
            for (const a of asosGerais) {
                if (Array.isArray(a.exames_detalhe)) {
                    const item = a.exames_detalhe.find(ex => nomeExameCorrespondeAoCatalogo(ex.nome, exameCfg));
                    if (item) {
                        temExame = true;
                        dataExame = item.data_avaliacao || item.data_exame || a.data_exame;
                        if (exameCfg.periodicidadeMeses === null) {
                            vencExame = null; // Exame exclusivamente admissional (ex: IgE Específica - Abelha)
                        } else {
                            vencExame = item.data_vencimento || (dataExame ? addMeses(dataExame, exameCfg.periodicidadeMeses || 12) : a.data_vencimento);
                        }
                        tipoAsoExame = a.tipo_aso;
                        asoIdExame = a.id;
                        break;
                    }
                }
            }

            // Fallback inteligente: se o colaborador possui ASO Geral válido mas o registro antigo não detalhou exames_detalhe item a item
            if (!temExame && ultimoAso && ultimoAso.data_exame) {
                temExame = true;
                dataExame = ultimoAso.data_exame;
                vencExame = (exameCfg.periodicidadeMeses === null)
                    ? null
                    : ( addMeses(dataExame, exameCfg.periodicidadeMeses || 12) || ultimoAso.data_vencimento );
                tipoAsoExame = ultimoAso.tipo_aso;
                asoIdExame = ultimoAso.id;
            }

            if (!temExame) {
                statusKey = 'PENDENTE';
                statusLabel = `🔴 PENDENTE (Convocação ${formatSimpleDate(dataMutirao)})`;
                statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 PENDENTE</span>';
                motivoDetalhado = `Exame complementar pendente de realização`;
            } else if (exameCfg.periodicidadeMeses === null) {
                statusKey = 'EM_DIA';
                statusLabel = '🟢 REALIZADO (Exigência Admissional)';
                statusBadge = '<span style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟢 REALIZADO (ADMISSIONAL)</span>';
                motivoDetalhado = `Realizado em ${formatSimpleDate(dataExame)} (Exigência Admissional Única)`;
            } else if (vencExame && vencExame < hojeStr) {
                statusKey = 'VENCIDO';
                statusLabel = '🔴 VENCIDO (Renovação Periódica)';
                statusBadge = '<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🔴 VENCIDO</span>';
                motivoDetalhado = `Renovação Periódica (Vencido em ${formatSimpleDate(vencExame)})`;
            } else if (vencExame && vencExame <= dataLimiteVencendo) {
                statusKey = 'VENCENDO';
                statusLabel = `🟡 VENCENDO EM BREVE (${formatSimpleDate(vencExame)})`;
                statusBadge = `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟡 VENCE EM ${formatSimpleDate(vencExame)}</span>`;
                motivoDetalhado = `Vencendo em Breve (${formatSimpleDate(vencExame)})`;
            } else {
                statusKey = 'EM_DIA';
                statusLabel = '🟢 EM DIA';
                statusBadge = '<span style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; padding:3px 9px; border-radius:999px; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:4px;">🟢 EM DIA</span>';
                motivoDetalhado = `Em Dia (Validade: ${formatSimpleDate(vencExame)})`;
            }
        }

        const badgeAguardandoResultado = (aguardandoResultadoClinica && !ehPsico)
            ? `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; font-weight:700; font-size:10px; display:inline-flex; align-items:center; gap:3px;" title="Exames periódicos realizados em Outubro/2026 — Aguardando envio dos resultados pela clínica">⏳ Realizado Out/26 (Aguard. Resultado)</span>`
            : '';

        // ==============================================================
        // CHECAGEM DE FÉRIAS E AFASTAMENTOS ATIVOS (NR-07)
        // ==============================================================
        const regFerias = obterRegistroFeriasColab(c.id, dataRefChecagem) || obterRegistroFeriasColab(c.id, hojeStr);
        const emFerias = !!regFerias;
        const dtFimFerias = regFerias ? regFerias.data_fim : null;
        const dtRetornoFerias = dtFimFerias ? addDias(dtFimFerias, 1) : null;

        const regAtestado = obterRegistroAtestadoAtivo(c.id, dataRefChecagem) || obterRegistroAtestadoAtivo(c.id, hojeStr);
        const emAfastamento = !!regAtestado;
        const diasAfastamento = regAtestado ? (parseInt(regAtestado.dias_afastamento, 10) || 1) : 0;
        const exigeRetornoNr07 = diasAfastamento >= 30; // NR-07 item 7.5.9
        let dtFimAfastamento = null;
        if (regAtestado) {
            dtFimAfastamento = regAtestado.data_fim || addDias(regAtestado.data_inicio, Math.max(1, diasAfastamento) - 1);
        }
        const dtRetornoAfastamento = dtFimAfastamento ? addDias(dtFimAfastamento, 1) : null;

        let badgeFeriasOuAfastamento = '';
        let sugestaoRetorno = '';

        if (emFerias) {
            badgeFeriasOuAfastamento = `<span class="badge-status-ferias" title="Colaborador em gozo de férias">🏖️ Em Férias${dtFimFerias ? ' até ' + formatSimpleDate(dtFimFerias) : ''}</span>`;
            const venceDuranteFerias = !!(vencExame && dtFimFerias && vencExame <= dtFimFerias);
            if (statusKey === 'PENDENTE' || statusKey === 'VENCIDO' || (statusKey === 'VENCENDO' && venceDuranteFerias)) {
                sugestaoRetorno = dtRetornoFerias ? `📅 Agendar para retorno: ${formatSimpleDate(dtRetornoFerias)}` : '📅 Agendar no retorno';
            }
        } else if (emAfastamento) {
            badgeFeriasOuAfastamento = `<span class="badge-status-afastado" title="Colaborador com atestado/afastamento médico">${exigeRetornoNr07 ? '🏥 Afastado (>30d NR-07)' : '🏥 Afastado'}${dtFimAfastamento ? ' até ' + formatSimpleDate(dtFimAfastamento) : ''}</span>`;
            if (exigeRetornoNr07) {
                sugestaoRetorno = `⚠️ Exame de Retorno ao Trabalho no 1º dia (${dtRetornoAfastamento ? formatSimpleDate(dtRetornoAfastamento) : 'retorno'})`;
            } else if (statusKey === 'PENDENTE' || statusKey === 'VENCIDO') {
                sugestaoRetorno = dtRetornoAfastamento ? `📅 Agendar para retorno: ${formatSimpleDate(dtRetornoAfastamento)}` : '📅 Agendar no retorno';
            }
        }

        // CICLOS DE FÉRIAS CLT & APTIDÃO OPERACIONAL NR-07
        const resumoCiclos = typeof obterResumoCiclosFeriasColab === 'function' ? obterResumoCiclosFeriasColab(c.id) : null;
        const cicloRotulo = resumoCiclos ? resumoCiclos.cicloAtualRotulo : '1º Ciclo';
        const ciclo1Fechado = resumoCiclos ? resumoCiclos.ciclo1Fechado : false;
        const ciclo2Fechado = resumoCiclos ? resumoCiclos.ciclo2Fechado : false;
        let badgeCiclo = resumoCiclos ? resumoCiclos.badgeCicloHtml : '';
        // Evitar duplicidade visual do badge "🏖️ Em Férias" quando badgeFeriasOuAfastamento já exibe a data de término das férias
        if ((emFerias || emAfastamento) && badgeCiclo && (badgeCiclo.includes('Férias') || badgeCiclo.includes('Afastado'))) {
            badgeCiclo = '';
        }

        // Liderança / Encarregado da frente de serviço
        const respCadastrado = (c.responsavel || '').trim();
        const liderNome = (respCadastrado && respCadastrado !== '-' && respCadastrado !== '—') ? respCadastrado : '';

        lista.push({
            matricula: c.id,
            nome: c.nome || '',
            cpf: c.cpf || '',
            funcao: c.funcao || '',
            setor: c.setor || '',
            responsavel: respCadastrado,
            liderNome: liderNome,
            ghe: g,
            gheNome: obterNomeGheCompleto(g),
            dt_admissao: dtAdm,
            ultimoAsoData: ultimoAso ? ultimoAso.data_exame : null,
            ultimoAsoTipo: ultimoAso ? ultimoAso.tipo_aso : null,
            ultimoAsoVenc: ultimoAso ? ultimoAso.data_vencimento : null,
            ultimoPeriodicoData: dataUltimoPeriodico || null,
            aguardandoResultadoClinica,
            badgeAguardandoResultado,
            resumoMatrizHtml,
            temPsico: temExame,
            dataPsico: dataExame,
            vencPsico: vencExame,
            tipoAsoPsico: tipoAsoExame,
            asoIdPsico: asoIdExame,
            statusKey,
            statusLabel,
            statusBadge,
            motivoDetalhado,
            emFerias,
            dtFimFerias,
            dtRetornoFerias,
            emAfastamento,
            diasAfastamento,
            exigeRetornoNr07,
            dtFimAfastamento,
            dtRetornoAfastamento,
            badgeFeriasOuAfastamento,
            sugestaoRetorno,
            resumoCiclos,
            cicloRotulo,
            ciclo1Fechado,
            ciclo2Fechado,
            badgeCiclo,
            examesPcmsoGhe
        });
    });

    lista.sort((a, b) => {
        const prioridade = { 'PENDENTE': 1, 'VENCIDO': 2, 'VENCENDO': 3, 'EM_DIA': 4 };
        const pA = prioridade[a.statusKey] || 5;
        const pB = prioridade[b.statusKey] || 5;
        if (pA !== pB) return pA - pB;
        if (a.ghe !== b.ghe) return a.ghe.localeCompare(b.ghe);
        return a.nome.localeCompare(b.nome);
    });

    return lista;
}

function filtrarStatusPsicossocial(status, btn) {
    psicoFiltroStatusAtual = status;
    document.querySelectorAll('#psicoStatusPills .sector-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTabelaRecomendacaoPsicossocial();
}

function renderBannerMutiraoPsico() {
    const container = document.getElementById('psicoBannerMutiraoContainer');
    if (!container) return;

    const dataMutirao = obterDataMutiraoPsico();
    const dataFmt = formatSimpleDate(dataMutirao);
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const capacidadeVagas = obterCapacidadeMutiraoPsico();

    // Calcular dias restantes
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dMut = parseLocalDate(dataMutirao); dMut.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil((dMut.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const ehDataPassada = diffDias < 0;

    let bannerHtml = '';

    if (ehDataPassada) {
        bannerHtml = `
            <div style="background: var(--card); border: 1px solid var(--border); border-left: 5px solid #10b981; border-radius: 8px; padding: 12px 18px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="font-size: 26px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">✅</div>
                    <div>
                        <div style="font-weight: 800; font-size: 13.5px; color: var(--text); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span>Último Atendimento Presencial: ${dataFmt} (${exameCfg.nomeExame})</span>
                            <span style="background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;">Atendimento Concluído</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">
                            Profissional: <b>${exameCfg.profissionalPadrao}</b> • Capacidade padrão: <b>${capacidadeVagas} vagas/dia</b> • Alinhe previamente com os líderes as próximas liberações de campo.
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button type="button" onclick="abrirModalReprogramarDataMutirao()" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-weight: 800; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(124,58,237,0.25);">
                        📅 + Agendar Próximo Atendimento
                    </button>
                    <button type="button" onclick="abrirModalBaixaLoteMutirao()" style="background: #10b981; color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-weight: 800; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                        ✅ Baixa em Lote
                    </button>
                </div>
            </div>
        `;
    } else {
        let bannerStatusHtml = '';
        if (diffDias > 1) {
            bannerStatusHtml = `<span style="background: rgba(255,255,255,0.25); padding: 4px 10px; border-radius: 999px; font-weight: 800; font-size: 11.5px; border: 1px solid rgba(255,255,255,0.4);">⏳ Faltam ${diffDias} dias</span>`;
        } else if (diffDias === 1) {
            bannerStatusHtml = '<span style="background: #ea580c; color: #fff; padding: 4px 10px; border-radius: 999px; font-weight: 800; font-size: 11.5px;">⏰ É AMANHÃ!</span>';
        } else {
            bannerStatusHtml = '<span style="background: #10b981; color: #fff; padding: 4px 10px; border-radius: 999px; font-weight: 800; font-size: 11.5px;">🎯 É HOJE!</span>';
        }

        bannerHtml = `
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #fff; border-radius: 8px; padding: 12px 18px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 2px 6px rgba(124,58,237,0.25);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-size: 26px;">🗓️</div>
                    <div>
                        <div style="font-weight: 800; font-size: 13.5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span>Atendimento Programado: ${dataFmt} (${exameCfg.nomeExame})</span>
                            ${bannerStatusHtml}
                        </div>
                        <div style="font-size: 11.5px; opacity: 0.95; margin-top: 2px;">
                            Profissional: <b>${exameCfg.profissionalPadrao}</b> • Capacidade: <b>${capacidadeVagas} vagas sugeridas</b> • Local: ${exameCfg.localPadrao}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button type="button" onclick="abrirModalReprogramarDataMutirao()" style="background: rgba(255,255,255,0.92); color: #6b21a8; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                        📅 Alterar Data / Vagas
                    </button>
                    <button type="button" onclick="abrirModalBaixaLoteMutirao()" style="background: #10b981; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: 800; font-size: 11.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
                        ✅ Baixa em Lote
                    </button>
                </div>
            </div>
        `;
    }

    container.innerHTML = bannerHtml;

    const btnImp = document.getElementById('btnImprimirConvocacaoPsico');
    if (btnImp) btnImp.textContent = `🖨️ Imprimir Convocação (${dataFmt})`;
}

function renderTextoGruposObrigatoriosPsico() {
    const el = document.getElementById('psicoGruposObrigatoriosTexto');
    if (!el) return;

    const ghes = Array.from(obterGhesObrigatoriosPsicossocial()).sort();
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const ehPsico = (exameComplementarFocoAtual === 'psicossocial' || exameCfg.id === 'psicossocial');

    const listaHtml = ghes.map(g => {
        const nomeCurto = obterNomeCurtoSetorGhe(g);
        return `<b style="color:var(--text);">GHE ${g}</b> (${escapeHTML(nomeCurto)})`;
    }).join(' • ');

    const infoMarcoTemporal = ehPsico
        ? `<div style="margin-top: 4px; font-size: 11.5px; color: #4338ca; background: #eef2ff; border: 1px solid #c7d2fe; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
            <span>🗓️</span> <span><b>Marco Temporal do Programa:</b> Implantação oficial em <b>${formatSimpleDate(DATA_IMPLANTACAO_PSICOSSOCIAL)}</b> • Validade Periódica: <b>12 meses</b> (renovações a partir de 07/2027)</span>
           </div>`
        : '';

    el.innerHTML = `
        <div>${exameCfg.descricaoBase}</div>
        ${infoMarcoTemporal}
        <div style="margin-top: 5px;">
            <span style="font-weight:700; color:var(--text);">Grupos Monitorados (${ghes.length}):</span> ${listaHtml}
        </div>
    `;

    const thNome = document.getElementById('thExameFocoNome');
    if (thNome) thNome.textContent = exameCfg.nomeExame;
}

function popularSelectGhesFiltroPsico() {
    const sel = document.getElementById('psicoGheSelect') || document.getElementById('psicoFiltroGhe');
    if (!sel) return;

    const ghesObrig = Array.from(obterGhesObrigatoriosPsicossocial()).sort();
    const valAtual = sel.value;

    sel.innerHTML = '<option value="">Todos os GHEs Monitorados</option>' + ghesObrig.map(g => {
        const nomeCompleto = obterNomeGheCompleto(g);
        return `<option value="${g}">${escapeHTML(nomeCompleto)}</option>`;
    }).join('');

    if (ghesObrig.includes(valAtual)) sel.value = valAtual;
}

function renderRecomendacaoPsicossocial() {
    popularFiltrosEquipeRecomendacaoExames();
    popularSelectGhesFiltroPsico();
    renderTextoGruposObrigatoriosPsico();
    renderBannerMutiraoPsico();

    const dados = obterDadosRecomendacaoPsicossocial();
    const chkOcultar = document.getElementById('psicoOcultarEmFerias');
    const ocultarFerias = chkOcultar ? chkOcultar.checked : true;

    const totalAfastados = dados.filter(d => d.emFerias || d.emAfastamento).length;

    const dadosOperacionais = (ocultarFerias && psicoFiltroStatusAtual !== 'ferias')
        ? dados.filter(d => !d.emFerias && !d.emAfastamento)
        : dados;

    const total = dadosOperacionais.length;
    const pendentes = dadosOperacionais.filter(d => d.statusKey === 'PENDENTE').length;
    const vencendo = dadosOperacionais.filter(d => d.statusKey === 'VENCENDO' || d.statusKey === 'VENCIDO').length;
    const emDia = dadosOperacionais.filter(d => d.statusKey === 'EM_DIA').length;
    const conformidade = total > 0 ? ((emDia / total) * 100).toFixed(1) : 100;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('kpiPsicoTotalElegiveis', total);
    setTxt('kpiPsicoPendentes', pendentes);
    setTxt('kpiPsicoVencendo', vencendo);
    setTxt('kpiPsicoEmDia', emDia);
    setTxt('kpiPsicoConformidade', `${conformidade}%`);

    const lblPendentes = document.getElementById('lblKpiPsicoPendentes');
    if (lblPendentes) {
        lblPendentes.textContent = (exameComplementarFocoAtual === 'psicossocial') ? '🔴 Pendentes de Inclusão' : '🔴 Pendentes (Convocação)';
    }

    setTxt('psicoCountTodos', total);
    setTxt('psicoCountPendentes', pendentes);
    setTxt('psicoCountVencendo', vencendo);
    setTxt('psicoCountEmDia', emDia);

    setTxt('pillCountPsicoTodos', total);
    setTxt('pillCountPsicoPendentes', pendentes);
    setTxt('pillCountPsicoVencendo', vencendo);
    setTxt('pillCountPsicoEmDia', emDia);
    setTxt('pillCountPsicoFerias', totalAfastados);

    renderTabelaRecomendacaoPsicossocial();
}

function aoAlternarOcultarFeriasPsico() {
    renderRecomendacaoPsicossocial();
}
window.aoAlternarOcultarFeriasPsico = aoAlternarOcultarFeriasPsico;

function atualizarBarraSelecaoConvocacaoPsico() {
    const contadorEl = document.getElementById('contadorSelecionadosPsicoMain');
    const metaEl = document.getElementById('metaVagasPsicoMain');
    const badgeEl = document.getElementById('badgeCapacidadePsicoMain');
    const chkMaster = document.getElementById('chkTodosRecomendacaoPsico');

    const total = selecionadosPsicoConvocacao.size;
    const meta = obterCapacidadeMutiraoPsico();
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const ehPsico = (exameComplementarFocoAtual === 'psicossocial' || exameCfg.id === 'psicossocial');

    if (contadorEl) contadorEl.textContent = total;
    if (metaEl) metaEl.textContent = meta;

    if (badgeEl) {
        if (total > meta) {
            badgeEl.style.background = '#fef3c7';
            badgeEl.style.color = '#b45309';
            badgeEl.style.borderColor = '#fde68a';
            badgeEl.textContent = `⚠️ ${total} selecionados (acima da capacidade diária de ${meta} — alinhar com lideranças)`;
        } else if (total >= 18 && total <= meta) {
            badgeEl.style.background = '#d1fae5';
            badgeEl.style.color = '#065f46';
            badgeEl.style.borderColor = '#a7f3d0';
            badgeEl.textContent = `🎯 Capacidade ideal atingida (${total} de ${meta} vagas)`;
        } else {
            badgeEl.style.background = '#e0e7ff';
            badgeEl.style.color = '#4338ca';
            badgeEl.style.borderColor = '#c7d2fe';
            badgeEl.textContent = ehPsico
                ? `Capacidade da psicóloga: 18 a ${meta} atendimentos/dia`
                : `Capacidade sugerida (${exameCfg.profissionalPadrao}): ${meta} atendimentos/dia`;
        }
    }

    if (chkMaster) {
        const checks = document.querySelectorAll('.chk-colab-psico-main');
        if (checks.length > 0) {
            chkMaster.checked = Array.from(checks).every(c => c.checked);
        } else {
            chkMaster.checked = false;
        }
    }
}

function aoAlternarCheckboxColabMain(matricula, checked) {
    if (checked) {
        selecionadosPsicoConvocacao.add(matricula);
    } else {
        selecionadosPsicoConvocacao.delete(matricula);
    }
    atualizarBarraSelecaoConvocacaoPsico();

    const tr = document.getElementById(`trPsicoColab_${matricula}`);
    if (tr) {
        tr.style.background = checked ? 'rgba(124,58,237,0.06)' : '';
    }
}

function alternarSelecaoTodosRecomendacao(checked) {
    const checks = document.querySelectorAll('.chk-colab-psico-main');
    checks.forEach(chk => {
        chk.checked = checked;
        const mat = chk.value;
        if (checked) {
            selecionadosPsicoConvocacao.add(mat);
        } else {
            selecionadosPsicoConvocacao.delete(mat);
        }
        const tr = document.getElementById(`trPsicoColab_${mat}`);
        if (tr) tr.style.background = checked ? 'rgba(124,58,237,0.06)' : '';
    });
    atualizarBarraSelecaoConvocacaoPsico();
}

function selecionarTodosFiltradosPsico() {
    const tbody = document.getElementById('tabelaRecomendacaoPsicoCorpo') || document.getElementById('tabelaPsicossocialCorpo');
    if (!tbody) return;
    const checks = tbody.querySelectorAll('.chk-colab-psico-main');
    if (checks.length === 0) {
        if (typeof mostrarFeedbackToast === 'function') {
            mostrarFeedbackToast('Nenhum colaborador visível na listagem atual.', 'aviso');
        } else {
            alert('Nenhum colaborador visível na listagem atual.');
        }
        return;
    }
    const todosMarcados = Array.from(checks).every(c => c.checked);
    checks.forEach(chk => {
        chk.checked = !todosMarcados;
        const mat = chk.value;
        if (!todosMarcados) {
            selecionadosPsicoConvocacao.add(mat);
        } else {
            selecionadosPsicoConvocacao.delete(mat);
        }
        const tr = document.getElementById(`trPsicoColab_${mat}`);
        if (tr) {
            tr.style.background = !todosMarcados ? 'rgba(124,58,237,0.06)' : '';
        }
    });
    atualizarBarraSelecaoConvocacaoPsico();
    if (typeof mostrarFeedbackToast === 'function') {
        mostrarFeedbackToast(!todosMarcados ? `👥 ${checks.length} colaboradores da equipe selecionados!` : 'Seleção desmarcada.', 'sucesso');
    }
}

function selecionarPrimeirosPendentesPsico(limite = 20) {
    const dados = obterDadosRecomendacaoPsicossocial();
    const pendentes = dados.filter(d => d.statusKey === 'PENDENTE' || d.statusKey === 'VENCIDO' || d.statusKey === 'VENCENDO');
    selecionadosPsicoConvocacao.clear();

    const selecionados = pendentes.slice(0, limite);
    selecionados.forEach(c => selecionadosPsicoConvocacao.add(c.matricula));

    renderTabelaRecomendacaoPsicossocial();
    atualizarBarraSelecaoConvocacaoPsico();

    if (typeof mostrarFeedbackToast === 'function') {
        mostrarFeedbackToast(`🎯 ${selecionados.length} colaboradores prioritários selecionados (capacidade: ${limite} vagas)!`, 'sucesso');
    }
}

function limparSelecaoConvocacaoPsicoMain() {
    selecionadosPsicoConvocacao.clear();
    renderTabelaRecomendacaoPsicossocial();
    atualizarBarraSelecaoConvocacaoPsico();
}

window.aoAlternarCheckboxColabMain = aoAlternarCheckboxColabMain;
window.alternarSelecaoTodosRecomendacao = alternarSelecaoTodosRecomendacao;
window.selecionarTodosFiltradosPsico = selecionarTodosFiltradosPsico;
window.selecionarPrimeirosPendentesPsico = selecionarPrimeirosPendentesPsico;
window.limparSelecaoConvocacaoPsicoMain = limparSelecaoConvocacaoPsicoMain;

function renderTabelaRecomendacaoPsicossocial() {
    const tbody = document.getElementById('tabelaRecomendacaoPsicoCorpo') || document.getElementById('tabelaPsicossocialCorpo');
    const msgVazia = document.getElementById('psicoTabelaVazia');
    if (!tbody) return;

    const dados = obterDadosRecomendacaoPsicossocial();
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const filtroStatus = psicoFiltroStatusAtual;
    const filtroLider = (document.getElementById('psicoFiltroLider')?.value || '').trim();
    const filtroSetor = (document.getElementById('psicoFiltroSetor')?.value || '').trim();
    const filtroGhe = (document.getElementById('psicoGheSelect') || document.getElementById('psicoFiltroGhe'))?.value || '';
    const filtroCiclo = (document.getElementById('psicoFiltroCiclo')?.value || '').trim();
    const busca = (document.getElementById('psicoBuscaInput')?.value || '').toLowerCase().trim();
    const ocultarFerias = document.getElementById('psicoOcultarEmFerias')?.checked ?? true;

    const resumoEl = document.getElementById('psicoResumoFiltrosEquipe');
    if (resumoEl) {
        const partes = [];
        if (filtroLider) {
            const opt = document.getElementById('psicoFiltroLider')?.selectedOptions[0]?.text || filtroLider;
            partes.push(`Equipe: <b>${escapeHTML(opt.replace(/\s*\(\d+\s*ativos\)/i, '').split(' [')[0])}</b>`);
        }
        if (filtroSetor) {
            partes.push(`Setor: <b>${escapeHTML(filtroSetor)}</b>`);
        }
        if (filtroGhe) {
            partes.push(`GHE: <b>${escapeHTML(filtroGhe)}</b>`);
        }
        if (filtroCiclo) {
            const cicloDesc = (filtroCiclo === '1_ok') ? '1º Ciclo Fechado (OK)' : (filtroCiclo === '2_ok' ? '2º Ciclo Fechado (OK)' : 'Ciclo em Aberto');
            partes.push(`Ciclo: <b>${escapeHTML(cicloDesc)}</b>`);
        }
        if (ocultarFerias && filtroStatus !== 'ferias') {
            partes.push(`<span style="color:#b45309;">🏖️ Ocultando colaboradores em férias/afastamento</span>`);
        }
        resumoEl.innerHTML = partes.length > 0 ? partes.join(' • ') : `Visão Geral da Obra (${dados.length} colaboradores monitorados)`;
    }

    let filtrados = dados.filter(d => {
        if (filtroStatus === 'pendentes' && d.statusKey !== 'PENDENTE') return false;
        if (filtroStatus === 'vencendo' && d.statusKey !== 'VENCENDO' && d.statusKey !== 'VENCIDO') return false;
        if (filtroStatus === 'em_dia' && d.statusKey !== 'EM_DIA') return false;
        if (filtroStatus === 'ferias' && !d.emFerias && !d.emAfastamento) return false;

        if (ocultarFerias && filtroStatus !== 'ferias' && (d.emFerias || d.emAfastamento)) {
            return false;
        }

        if (filtroCiclo === '1_ok' && !d.ciclo1Fechado) return false;
        if (filtroCiclo === '2_ok' && !d.ciclo2Fechado) return false;
        if (filtroCiclo === 'aberto' && d.ciclo1Fechado && d.ciclo2Fechado) return false;

        if (filtroLider) {
            const respUpper = (d.responsavel || '').toUpperCase();
            const liderUpper = (d.liderNome || '').toUpperCase();
            const nomeUpper = (d.nome || '').toUpperCase();
            if (filtroLider.startsWith('NOME:')) {
                const buscaNome = filtroLider.substring(5).toUpperCase();
                if (nomeUpper !== buscaNome && !respUpper.includes(buscaNome) && !liderUpper.includes(buscaNome)) {
                    return false;
                }
            } else {
                const fUpper = filtroLider.toUpperCase();
                if (respUpper !== fUpper && !respUpper.includes(fUpper) && !liderUpper.includes(fUpper) && !nomeUpper.includes(fUpper)) {
                    return false;
                }
            }
        }

        if (filtroSetor && (d.setor || '').trim().toLowerCase() !== filtroSetor.toLowerCase()) {
            return false;
        }

        if (filtroGhe && d.ghe !== filtroGhe) return false;

        if (busca) {
            const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.funcao} ${d.setor} ${d.ghe} ${d.responsavel} ${d.liderNome} ${d.cicloRotulo || ''}`.toLowerCase();
            if (!txt.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '';
        if (msgVazia) msgVazia.style.display = 'block';
        atualizarBarraSelecaoConvocacaoPsico();
        return;
    }
    if (msgVazia) msgVazia.style.display = 'none';

    tbody.innerHTML = filtrados.map(d => {
        const dataAdmFmt = d.dt_admissao ? formatSimpleDate(d.dt_admissao) : '—';
        const ultimoAsoFmt = d.ultimoAsoData 
            ? `<div>${formatSimpleDate(d.ultimoAsoData)}</div><div style="font-size:10.5px; color:var(--text-light); text-transform:uppercase;">${escapeHTML(d.ultimoAsoTipo || 'ASO')}</div>`
            : '<span style="color:var(--text-light);">Sem registro</span>';

        const rotuloNaoRealizada = (exameComplementarFocoAtual === 'psicossocial') ? 'Pendente' : 'Não realizada';
        const dataPsicoFmt = d.dataPsico
            ? `<div style="font-weight:700; color:#4338ca;">${formatSimpleDate(d.dataPsico)}</div>${d.resumoMatrizHtml || ''}`
            : `<span style="color:#b91c1c; font-weight:600; font-size:11.5px;">${rotuloNaoRealizada}</span>${d.resumoMatrizHtml || ''}`;

        let vencPsicoFmt = '<span style="color:var(--text-light);">—</span>';
        if (d.vencPsico) {
            vencPsicoFmt = `<div>${formatSimpleDate(d.vencPsico)}</div>`;
        } else if (d.temPsico && exameCfg.periodicidadeMeses === null) {
            vencPsicoFmt = '<span style="color:#065f46; font-size:11px; font-weight:700;">Admissional (Único)</span>';
        }

        const estaMarcado = selecionadosPsicoConvocacao.has(d.matricula);
        let rowCls = '';
        let rowInlineBg = '';
        if (estaMarcado) {
            rowInlineBg = 'background:rgba(124,58,237,0.06);';
        } else if (d.emFerias) {
            rowCls = 'linha-colab-ferias';
        } else if (d.emAfastamento) {
            rowCls = 'linha-colab-afastado';
        }

        const liderHtml = (d.liderNome || d.responsavel)
            ? `<div style="font-size:10.5px; color:#4338ca; font-weight:700; margin-top:3px; display:inline-flex; align-items:center; gap:3px;">👷 Equipe: ${escapeHTML(d.liderNome || d.responsavel)}</div>`
            : '';

        return `
            <tr id="trPsicoColab_${escapeHTML(d.matricula)}" class="${rowCls}" style="border-bottom: 1px solid var(--border); transition: background 0.15s ease; ${rowInlineBg}" onmouseover="if(!selecionadosPsicoConvocacao.has('${escapeHTML(d.matricula)}')) this.style.opacity='0.85'" onmouseout="if(!selecionadosPsicoConvocacao.has('${escapeHTML(d.matricula)}')) this.style.opacity='1'">
                <td style="padding: 10px 10px; text-align: center;">
                    <input type="checkbox" class="chk-colab-psico-main" value="${escapeHTML(d.matricula)}" ${estaMarcado ? 'checked' : ''} onchange="aoAlternarCheckboxColabMain('${escapeHTML(d.matricula)}', this.checked)" style="cursor: pointer; width: 16px; height: 16px; accent-color: #6d28d9;">
                </td>
                <td style="padding: 10px 14px; font-weight: 700; color: var(--primary);">${escapeHTML(d.matricula)}</td>
                <td style="padding: 10px 14px;">
                    <div style="font-weight: 700; color: var(--text); cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(d.matricula)}')" title="Ver ficha completa">${escapeHTML(d.nome)}</div>
                    ${d.cpf ? `<div style="font-size: 11px; color: var(--text-light);">CPF: ${escapeHTML(d.cpf)}</div>` : ''}
                </td>
                <td style="padding: 10px 14px;">
                    <span style="font-weight:600; font-size:11.5px; color:var(--text); background:var(--bg); border:1px solid var(--border); padding:2px 6px; border-radius:4px;">${escapeHTML(d.gheNome)}</span>
                    <div style="font-size:11px; color:var(--text-light); margin-top:2px;">${escapeHTML(d.setor || '')}</div>
                    ${liderHtml}
                </td>
                <td style="padding: 10px 14px; font-weight: 600; color: var(--text);">${escapeHTML(d.funcao || '—')}</td>
                <td style="padding: 10px 14px; color: var(--text-light);">${dataAdmFmt}</td>
                <td style="padding: 10px 14px;">${ultimoAsoFmt}</td>
                <td style="padding: 10px 14px;">${dataPsicoFmt}</td>
                <td style="padding: 10px 14px; font-weight:600;">${vencPsicoFmt}</td>
                <td style="padding: 10px 14px; text-align: center;">
                    <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                        ${d.badgeCiclo ? `<div style="margin-bottom:2px;">${d.badgeCiclo}</div>` : ''}
                        ${d.statusBadge}
                        ${d.badgeAguardandoResultado || ''}
                        ${d.badgeFeriasOuAfastamento || ''}
                        ${d.sugestaoRetorno ? `<div style="font-size:10px; color:#9a3412; font-weight:700; background:#fff7ed; border:1px solid #fed7aa; padding:2px 6px; border-radius:4px; max-width:210px; text-align:center;">${escapeHTML(d.sugestaoRetorno)}</div>` : ''}
                    </div>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <button class="db-clear-btn" style="padding: 4px 8px; font-size: 11.5px; border-color: #8b5cf6; color: #7c3aed; font-weight:700;" onclick="abrirModalRegistrarPsicoRapido('${escapeHTML(d.matricula)}')" title="Registrar atendimento individual">
                        ✍️ Registrar
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    atualizarBarraSelecaoConvocacaoPsico();
}

// ---- Modal de Reprogramação de Data de Mutirão ----
function abrirModalReprogramarDataMutirao() {
    const inputData = document.getElementById('reprogPsico_data');
    if (inputData) {
        const dMut = obterDataMutiraoPsico();
        const hojeIso = new Date().toISOString().split('T')[0];
        if (dMut && dMut >= hojeIso) {
            inputData.value = dMut;
        } else {
            const d = new Date(); d.setDate(d.getDate() + 1);
            inputData.value = d.toISOString().split('T')[0];
        }
    }
    const inputVagas = document.getElementById('reprogPsico_vagas');
    if (inputVagas) inputVagas.value = obterCapacidadeMutiraoPsico();

    const modal = document.getElementById('modalReprogramarDataMutirao');
    if (modal) modal.style.display = 'flex';
}

function fecharModalReprogramarDataMutirao() {
    const modal = document.getElementById('modalReprogramarDataMutirao');
    if (modal) modal.style.display = 'none';
}

function salvarReprogramacaoDataMutirao() {
    const novaData = document.getElementById('reprogPsico_data')?.value;
    const novasVagas = document.getElementById('reprogPsico_vagas')?.value || 20;

    if (!novaData) {
        alert('Por favor, informe a data para o próximo atendimento.');
        return;
    }
    salvarDataMutiraoPsico(novaData);
    salvarCapacidadeMutiraoPsico(novasVagas);

    fecharModalReprogramarDataMutirao();
    renderRecomendacaoPsicossocial();
    atualizarBarraSelecaoConvocacaoPsico();
    alert(`✅ Atendimento agendado com sucesso para ${formatSimpleDate(novaData)} com capacidade de ${novasVagas} vagas sugeridas!`);
}

// ============================================
// MATRIZ DE EXAMES DO PCMSO — EDIÇÃO PELO PAINEL (v228)
// Fonte única: tabela pcmso_matriz_exames (Supabase). Quando ela tem pelo menos uma
// linha, substitui PCMSO_EXAMES_POR_GHE em memória; quando está vazia ou não existe,
// a matriz hardcoded continua valendo (fallback seguro — nada quebra sem a migração).
// Duas abas: "por GHE" (escolhe o GHE e marca os exames) e "por exame" (escolhe o
// exame e marca os GHEs). As duas gravam na mesma tabela, então o resultado é sempre
// o mesmo, independente do caminho usado para editar.
// ============================================

// Exames que podem entrar/sair da matriz na tela. 'clinico' é o ASO geral: existe na
// matriz mas não tem aba própria no catálogo, e é obrigatório em todo GHE.
var PCMSO_EXAMES_EDITAVEIS = [
    { id: 'clinico', nome: 'Avaliação clínica ocupacional', periodicidade: 12, demissional: true, obrigatorio: true },
    { id: 'psicossocial', nome: 'Avaliação Psicossocial', periodicidade: 12, demissional: false },
    { id: 'audiometria', nome: 'Audiometria', periodicidade: 12, demissional: true },
    { id: 'ecg', nome: 'Eletrocardiograma (ECG)', periodicidade: 12, demissional: true },
    { id: 'espirometria', nome: 'Espirometria', periodicidade: 24, demissional: true },
    { id: 'acuidade', nome: 'Acuidade Visual', periodicidade: 12, demissional: false },
    { id: 'rx_coluna', nome: 'Raio X da Coluna Lombo Sacra', periodicidade: 24, demissional: false },
    { id: 'rx_torax', nome: 'Raio X de Tórax (Padrão OIT)', periodicidade: 60, demissional: true },
    { id: 'glicose', nome: 'Glicose', periodicidade: 12, demissional: true },
    { id: 'hemograma', nome: 'Hemograma Completo', periodicidade: 12, demissional: true },
    { id: 'ige_abelha', nome: 'IgE Específica - Abelha', periodicidade: null, demissional: false }
];

var pcmsoMatrizCarregada = false;
var pcmsoMatrizDisponivel = false;   // a tabela existe no Supabase?
var pcmsoMatrizLinhas = [];          // linhas cruas da tabela (inclusive ativo = false)
var pcmsoMatrizPromessa = null;
var matrizPcmsoAbaAtual = 'ghe';
var matrizPcmsoGheAtual = '01';
var matrizPcmsoExameAtual = 'acuidade';
var matrizPcmsoSalvando = false;
var matrizPcmsoSujo = false;   // há edição na tela ainda não salva?

// normalizarGhe() só trata string puramente numérica; aqui as chaves vêm como 'G05'.
function normalizarGheMatriz(valor) {
    const bruto = String(valor == null ? '' : valor).trim();
    const num = bruto.replace(/^G/i, '');
    return /^\d+$/.test(num) ? num.padStart(2, '0') : '';
}

function obterMetaExameMatrizPcmso(exameId) {
    return PCMSO_EXAMES_EDITAVEIS.find(e => e.id === exameId)
        || { id: exameId, nome: exameId, periodicidade: 12, demissional: true };
}

// Nome livre da matriz (vindo do banco ou do código) -> exame_id estável.
function obterExameIdPorNomeMatriz(nome) {
    const alvo = String(nome || '').toLowerCase().trim();
    if (!alvo) return null;
    const direto = PCMSO_EXAMES_EDITAVEIS.find(e => e.nome.toLowerCase() === alvo);
    if (direto) return direto.id;
    const porCatalogo = Object.values(CATALOGO_EXAMES_COMPLEMENTARES || {}).find(cfg =>
        cfg && cfg.id !== 'matriz_geral' && nomeExameCorrespondeAoCatalogo(nome, cfg)
    );
    if (porCatalogo) return porCatalogo.id;
    if (alvo.includes('clínica') || alvo.includes('clinica') || alvo.includes('aso')) return 'clinico';
    return null;
}

// Aplica as linhas do banco sobre PCMSO_EXAMES_POR_GHE e sobre ghesPadrao. Só é
// chamada quando a tabela tem alguma linha (mesmo inativa): a partir daí o banco é a
// verdade e o código passa a ser apenas o estado inicial.
function aplicarMatrizPcmsoExames(linhas) {
    const nomesGhe = {};
    Object.entries(PCMSO_EXAMES_POR_GHE || {}).forEach(([chave, info]) => {
        const num = normalizarGheMatriz(chave);
        if (num && info && info.nome) nomesGhe[num] = info.nome;
    });

    const porGhe = {};
    const porExame = {};
    (linhas || []).forEach(linha => {
        if (!linha || linha.ativo === false) return;
        const ghe = normalizarGheMatriz(linha.ghe);
        const exameId = linha.exame_id || obterExameIdPorNomeMatriz(linha.exame_nome);
        if (!ghe || !exameId) return;
        (porGhe[ghe] = porGhe[ghe] || []).push({ linha, exameId });
        (porExame[exameId] = porExame[exameId] || []).push(ghe);
    });

    const novaMatriz = {};
    Object.keys(nomesGhe).sort().forEach(ghe => {
        const itens = (porGhe[ghe] || []).slice()
            .sort((a, b) => (Number(a.linha.ordem) || 0) - (Number(b.linha.ordem) || 0));
        novaMatriz['G' + ghe] = {
            nome: nomesGhe[ghe],
            exames: itens.map(({ linha, exameId }) => ({
                nome: linha.exame_nome || obterMetaExameMatrizPcmso(exameId).nome,
                periodicidade: linha.periodicidade_meses == null ? null : Number(linha.periodicidade_meses),
                demissional: linha.demissional !== false,
                exame_id: exameId
            }))
        };
    });
    PCMSO_EXAMES_POR_GHE = novaMatriz;

    // Sem realinhar ghesPadrao, um exame removido "voltaria" pela detecção vazia
    // (obterGhesObrigatoriosPsicossocial cai no padrão quando não detecta nada).
    Object.entries(CATALOGO_EXAMES_COMPLEMENTARES || {}).forEach(([id, cfg]) => {
        if (!cfg || id === 'matriz_geral') return;
        cfg.ghesPadrao = (porExame[id] || []).slice().sort();
    });
}

// Carrega a matriz do banco uma única vez por sessão (exceto quando forçado, depois de
// salvar). Nunca lança: sem a tabela, o app segue com a matriz do código.
async function carregarMatrizPcmsoExames(forcarAtualizacao) {
    if (forcarAtualizacao) pcmsoMatrizPromessa = null;
    if (!pcmsoMatrizPromessa) {
        pcmsoMatrizPromessa = (async () => {
            try {
                const linhas = await supabaseFetchCacheado(
                    'pcmso_matriz_exames',
                    '?select=*&order=ghe.asc,ordem.asc',
                    !!forcarAtualizacao
                );
                pcmsoMatrizDisponivel = true;
                pcmsoMatrizLinhas = Array.isArray(linhas) ? linhas : [];
                if (pcmsoMatrizLinhas.length > 0) aplicarMatrizPcmsoExames(pcmsoMatrizLinhas);
            } catch (err) {
                console.warn('Matriz PCMSO: tabela pcmso_matriz_exames indisponível — usando a matriz do código.', err);
                pcmsoMatrizDisponivel = false;
                pcmsoMatrizLinhas = [];
            }
            pcmsoMatrizCarregada = true;
            return pcmsoMatrizDisponivel;
        })();
    }
    return pcmsoMatrizPromessa;
}

// chave 'ghe|exame_id' -> linha do banco
function matrizPcmsoMapaLinhas() {
    const mapa = {};
    (pcmsoMatrizLinhas || []).forEach(linha => {
        const ghe = normalizarGheMatriz(linha.ghe);
        if (!ghe || !linha.exame_id) return;
        mapa[ghe + '|' + linha.exame_id] = linha;
    });
    return mapa;
}

// Estado exibido na tela: banco quando ele é a fonte; senão, a matriz do código.
function matrizPcmsoEstadoEfetivo() {
    const estado = {};
    const bancoManda = pcmsoMatrizLinhas && pcmsoMatrizLinhas.length > 0;

    if (bancoManda) {
        pcmsoMatrizLinhas.forEach(linha => {
            if (!linha || linha.ativo === false) return;
            const ghe = normalizarGheMatriz(linha.ghe);
            if (!ghe || !linha.exame_id) return;
            estado[ghe + '|' + linha.exame_id] = {
                ghe,
                exame_id: linha.exame_id,
                nome: linha.exame_nome || obterMetaExameMatrizPcmso(linha.exame_id).nome,
                periodicidade: linha.periodicidade_meses == null ? null : Number(linha.periodicidade_meses),
                demissional: linha.demissional !== false,
                ordem: Number(linha.ordem) || 0
            };
        });
        return estado;
    }

    Object.entries(PCMSO_EXAMES_POR_GHE || {}).forEach(([chave, info]) => {
        const ghe = normalizarGheMatriz(chave);
        if (!ghe || !info || !Array.isArray(info.exames)) return;
        info.exames.forEach((exame, idx) => {
            const exameId = exame.exame_id || obterExameIdPorNomeMatriz(exame.nome);
            if (!exameId) return;
            estado[ghe + '|' + exameId] = {
                ghe,
                exame_id: exameId,
                nome: exame.nome,
                periodicidade: exame.periodicidade == null ? null : Number(exame.periodicidade),
                demissional: exame.demissional !== false,
                ordem: idx
            };
        });
    });
    return estado;
}

function abrirEditorMatrizPcmso(aba) {
    matrizPcmsoSujo = false;
    matrizPcmsoAbaAtual = (aba === 'exame') ? 'exame' : 'ghe';
    if (exameComplementarFocoAtual && exameComplementarFocoAtual !== 'matriz_geral'
        && PCMSO_EXAMES_EDITAVEIS.some(e => e.id === exameComplementarFocoAtual)) {
        matrizPcmsoExameAtual = exameComplementarFocoAtual;
    }
    const modal = document.getElementById('modalMatrizPcmso');
    if (modal) modal.style.display = 'flex';
    renderMatrizPcmso();
    // Revalida no banco em segundo plano: a tabela pode ter sido criada/alterada
    // depois do login, e a tela deve abrir com o estado mais recente.
    carregarMatrizPcmsoExames(true).then(() => { if (!matrizPcmsoSujo) renderMatrizPcmso(); }).catch(() => {});
}

function fecharEditorMatrizPcmso() {
    if (matrizPcmsoSujo && !confirm('Você tem alterações não salvas na matriz do PCMSO. Fechar mesmo assim?')) return;
    matrizPcmsoSujo = false;
    const modal = document.getElementById('modalMatrizPcmso');
    if (modal) modal.style.display = 'none';
}

function podeDescartarEdicaoMatrizPcmso() {
    if (!matrizPcmsoSujo) return true;
    if (!confirm('Você tem alterações não salvas na matriz do PCMSO. Descartar e continuar?')) return false;
    matrizPcmsoSujo = false;
    return true;
}

function trocarAbaMatrizPcmso(aba) {
    if (!podeDescartarEdicaoMatrizPcmso()) return;
    matrizPcmsoAbaAtual = (aba === 'exame') ? 'exame' : 'ghe';
    renderMatrizPcmso();
}

function aoTrocarGheMatrizPcmso(ghe) {
    if (!podeDescartarEdicaoMatrizPcmso()) { renderMatrizPcmso(); return; }
    matrizPcmsoGheAtual = normalizarGheMatriz(ghe) || '01';
    renderMatrizPcmso();
}

function aoTrocarExameMatrizPcmso(exameId) {
    if (!podeDescartarEdicaoMatrizPcmso()) { renderMatrizPcmso(); return; }
    matrizPcmsoExameAtual = exameId;
    renderMatrizPcmso();
}

// Marcar/desmarcar um exame habilita/desabilita periodicidade e demissional da linha.
function aoAlternarExameMatrizPcmso(checkbox) {
    const linha = checkbox ? checkbox.closest('tr') : null;
    if (!linha) return;
    const desabilitar = !checkbox.checked;
    linha.querySelectorAll('.inp-matriz-periodicidade, .chk-matriz-demissional').forEach(campo => {
        campo.disabled = desabilitar;
    });
}

function renderMatrizPcmso() {
    const container = document.getElementById('matrizPcmsoConteudo');
    if (!container) return;

    [['ghe', 'matrizPcmsoTabGhe'], ['exame', 'matrizPcmsoTabExame']].forEach(([aba, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const ativo = matrizPcmsoAbaAtual === aba;
        btn.style.background = ativo ? '#0f766e' : 'transparent';
        btn.style.color = ativo ? '#fff' : 'var(--text)';
        btn.style.borderColor = ativo ? '#0f766e' : 'var(--border)';
    });

    const aviso = document.getElementById('matrizPcmsoAviso');
    if (aviso) {
        aviso.innerHTML = (!pcmsoMatrizCarregada || pcmsoMatrizDisponivel) ? '' : `
            <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:8px; padding:8px 10px; font-size:12px; margin-bottom:10px;">
                ⚠️ A tabela <strong>pcmso_matriz_exames</strong> ainda não existe no Supabase. Peça para rodar
                <code>supabase/migrations/20261028_pcmso_matriz_exames.sql</code> no SQL Editor do Supabase.
                Enquanto isso, a tela mostra a matriz que está no código, <strong>somente para consulta</strong>.
            </div>`;
    }

    const btnSalvar = document.getElementById('matrizPcmsoBtnSalvar');
    if (btnSalvar) {
        btnSalvar.disabled = !pcmsoMatrizDisponivel || matrizPcmsoSalvando;
        btnSalvar.style.opacity = btnSalvar.disabled ? '0.5' : '1';
    }

    const status = document.getElementById('matrizPcmsoStatus');
    if (status) {
        if (!pcmsoMatrizDisponivel) {
            status.textContent = 'Origem: matriz do código (somente leitura)';
        } else if (pcmsoMatrizLinhas.length === 0) {
            status.textContent = 'Origem: banco vazio — ao salvar, a matriz do código é copiada para o banco';
        } else {
            status.textContent = `Origem: banco de dados (${pcmsoMatrizLinhas.filter(l => l.ativo !== false).length} exames ativos em 27 GHEs)`;
        }
    }

    if (matrizPcmsoAbaAtual === 'exame') renderMatrizPcmsoAbaExame();
    else renderMatrizPcmsoAbaGhe();
}

function renderMatrizPcmsoAbaGhe() {
    const container = document.getElementById('matrizPcmsoConteudo');
    if (!container) return;
    const estado = matrizPcmsoEstadoEfetivo();
    const efetivoAtivo = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    const ghe = matrizPcmsoGheAtual;

    const opcoes = [];
    for (let i = 1; i <= 27; i++) {
        const num = String(i).padStart(2, '0');
        const qtd = efetivoAtivo.filter(e => normalizarGheMatriz(e.ghe) === num).length;
        opcoes.push(`<option value="${num}"${num === ghe ? ' selected' : ''}>${escapeHTML(obterNomeGheCompleto(num))} — ${qtd} ativo(s)</option>`);
    }

    const linhas = PCMSO_EXAMES_EDITAVEIS.map(meta => {
        const item = estado[ghe + '|' + meta.id];
        const marcado = !!item;
        const periodicidade = item && item.periodicidade != null ? item.periodicidade : '';
        const demissional = item ? item.demissional : meta.demissional;
        const travado = !!meta.obrigatorio;
        const desabilitado = marcado ? '' : 'disabled';
        return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:5px 6px;">
                    <label style="display:flex; align-items:center; gap:7px; font-size:12px; cursor:${travado ? 'not-allowed' : 'pointer'}; color:var(--text);">
                        <input type="checkbox" class="chk-matriz-exame" data-exame="${meta.id}"
                            ${marcado || travado ? 'checked' : ''} ${travado ? 'disabled' : ''}
                            onchange="aoAlternarExameMatrizPcmso(this)">
                        <span>${escapeHTML(meta.nome)}${travado ? ' <span style="font-size:10px; color:var(--text-light);">(obrigatório)</span>' : ''}</span>
                    </label>
                </td>
                <td style="padding:5px 6px; text-align:center; width:120px;">
                    <input type="number" min="1" max="120" class="inp-matriz-periodicidade" value="${periodicidade}"
                        placeholder="—" ${desabilitado}
                        style="width:70px; padding:3px 6px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                </td>
                <td style="padding:5px 6px; text-align:center; width:80px;">
                    <input type="checkbox" class="chk-matriz-demissional" ${demissional ? 'checked' : ''} ${desabilitado}>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
            <label style="font-size:12px; font-weight:700; color:var(--text);">GHE:</label>
            <select onchange="aoTrocarGheMatrizPcmso(this.value)"
                style="flex:1; min-width:260px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; background:var(--card); color:var(--text); font-size:12px; font-weight:600;">
                ${opcoes.join('')}
            </select>
        </div>
        <div style="max-height:380px; overflow:auto; border:1px solid var(--border); border-radius:8px;">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="position:sticky; top:0; background:var(--bg); z-index:1;">
                    <tr style="font-size:11px; text-transform:uppercase; color:var(--text-light);">
                        <th style="text-align:left; padding:6px;">Exame exigido neste GHE</th>
                        <th style="padding:6px;">Periodicidade (meses)</th>
                        <th style="padding:6px;">Demissional</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>
        <div style="font-size:11.5px; color:var(--text-light); margin-top:8px;">
            Desmarque para <strong>remover</strong> o exame deste GHE; marque para <strong>incluir</strong>. A alteração vale
            para todos os usuários depois de salvar. O ASO (avaliação clínica) é obrigatório em qualquer GHE.
        </div>`;

    container.querySelectorAll('input').forEach(campo => {
        campo.addEventListener('change', () => { matrizPcmsoSujo = true; });
    });
}

function renderMatrizPcmsoAbaExame() {
    const container = document.getElementById('matrizPcmsoConteudo');
    if (!container) return;
    const estado = matrizPcmsoEstadoEfetivo();
    const exameId = matrizPcmsoExameAtual;
    const meta = obterMetaExameMatrizPcmso(exameId);

    const opcoes = PCMSO_EXAMES_EDITAVEIS
        .filter(e => !e.obrigatorio)
        .map(e => `<option value="${e.id}"${e.id === exameId ? ' selected' : ''}>${escapeHTML(e.nome)}</option>`)
        .join('');

    const caixas = [];
    for (let i = 1; i <= 27; i++) {
        const num = String(i).padStart(2, '0');
        const marcado = !!estado[num + '|' + exameId];
        caixas.push(`
            <label style="display:flex; align-items:flex-start; gap:6px; padding:5px 7px; border:1px solid var(--border); border-radius:6px; background:var(--card); font-size:11.5px; cursor:pointer;">
                <input type="checkbox" class="chk-matriz-ghe" data-ghe="${num}" ${marcado ? 'checked' : ''} style="margin-top:2px;">
                <span>${escapeHTML(obterNomeGheCompleto(num))}</span>
            </label>`);
    }

    // Periodicidade/demissional exibidos: o valor mais comum entre os GHEs marcados;
    // se não houver nenhum, o padrão do exame.
    const marcados = [];
    for (let i = 1; i <= 27; i++) {
        const num = String(i).padStart(2, '0');
        const item = estado[num + '|' + exameId];
        if (item) marcados.push(item);
    }
    let periodicidade = meta.periodicidade;
    let demissional = meta.demissional;
    if (marcados.length > 0) {
        periodicidade = marcados[0].periodicidade;
        demissional = marcados[0].demissional;
        const uniforme = marcados.every(m => m.periodicidade === periodicidade && m.demissional === demissional);
        if (!uniforme) periodicidade = ''; // deixa claro que há valores diferentes
    }

    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
            <label style="font-size:12px; font-weight:700; color:var(--text);">Exame:</label>
            <select onchange="aoTrocarExameMatrizPcmso(this.value)"
                style="flex:1; min-width:240px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; background:var(--card); color:var(--text); font-size:12px; font-weight:600;">
                ${opcoes}
            </select>
            <label style="font-size:11.5px; color:var(--text-light);">Periodicidade:</label>
            <input type="number" id="matrizPcmsoExamePeriodicidade" min="1" max="120" value="${periodicidade}" placeholder="—"
                style="width:70px; padding:4px 6px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
            <label style="display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--text-light);">
                <input type="checkbox" id="matrizPcmsoExameDemissional" ${demissional ? 'checked' : ''}> demissional
            </label>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:6px; max-height:360px; overflow:auto; padding:2px;">
            ${caixas.join('')}
        </div>
        <div style="font-size:11.5px; color:var(--text-light); margin-top:8px;">
            Marque os GHEs que exigem <strong>${escapeHTML(meta.nome)}</strong>. A periodicidade e a flag demissional acima
            são aplicadas a <strong>todos</strong> os GHEs marcados ao salvar. Para valores diferentes por GHE, use a aba
            “Por GHE”.
        </div>`;

    container.querySelectorAll('input').forEach(campo => {
        campo.addEventListener('change', () => { matrizPcmsoSujo = true; });
    });
}

async function salvarMatrizPcmso() {
    if (!pcmsoMatrizDisponivel) {
        alert('A tabela pcmso_matriz_exames ainda não existe no Supabase. Rode a migração 20261028_pcmso_matriz_exames.sql antes de salvar.');
        return;
    }
    if (matrizPcmsoSalvando) return;
    matrizPcmsoSalvando = true;
    const btnSalvar = document.getElementById('matrizPcmsoBtnSalvar');
    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = '⏳ Salvando...'; }

    try {
        // Estado de partida: banco (ou matriz do código, quando o banco ainda está vazio).
        const desejado = {};
        Object.entries(matrizPcmsoEstadoEfetivo()).forEach(([chave, item]) => { desejado[chave] = Object.assign({}, item); });

        if (matrizPcmsoAbaAtual === 'ghe') {
            const ghe = matrizPcmsoGheAtual;
            // exame novo entra no fim da lista deste GHE (ordem de exibição/impressão)
            const maiorOrdemGhe = Object.values(desejado)
                .filter(item => item.ghe === ghe)
                .reduce((maior, item) => Math.max(maior, Number(item.ordem) || 0), -1);
            document.querySelectorAll('#matrizPcmsoConteudo tr').forEach(tr => {
                const chk = tr.querySelector('.chk-matriz-exame');
                if (!chk) return;
                const exameId = chk.dataset.exame;
                const chave = ghe + '|' + exameId;
                if (!chk.checked) { delete desejado[chave]; return; }
                const meta = obterMetaExameMatrizPcmso(exameId);
                const campoPeriodicidade = tr.querySelector('.inp-matriz-periodicidade');
                const campoDemissional = tr.querySelector('.chk-matriz-demissional');
                const valorPeriodicidade = campoPeriodicidade && campoPeriodicidade.value !== ''
                    ? parseInt(campoPeriodicidade.value, 10) : null;
                desejado[chave] = {
                    ghe,
                    exame_id: exameId,
                    nome: (desejado[chave] && desejado[chave].nome) || meta.nome,
                    periodicidade: Number.isFinite(valorPeriodicidade) ? valorPeriodicidade : null,
                    demissional: campoDemissional ? campoDemissional.checked : meta.demissional,
                    ordem: (desejado[chave] && desejado[chave].ordem != null) ? desejado[chave].ordem : maiorOrdemGhe + 1
                };
            });
        } else {
            const exameId = matrizPcmsoExameAtual;
            const meta = obterMetaExameMatrizPcmso(exameId);
            const campoPeriodicidade = document.getElementById('matrizPcmsoExamePeriodicidade');
            const campoDemissional = document.getElementById('matrizPcmsoExameDemissional');
            const valorPeriodicidade = campoPeriodicidade && campoPeriodicidade.value !== ''
                ? parseInt(campoPeriodicidade.value, 10) : null;
            const periodicidade = Number.isFinite(valorPeriodicidade) ? valorPeriodicidade : null;
            const demissional = campoDemissional ? campoDemissional.checked : meta.demissional;

            document.querySelectorAll('#matrizPcmsoConteudo .chk-matriz-ghe').forEach(chk => {
                const ghe = normalizarGheMatriz(chk.dataset.ghe);
                if (!ghe) return;
                const chave = ghe + '|' + exameId;
                if (!chk.checked) { delete desejado[chave]; return; }
                const maiorOrdemGhe = Object.values(desejado)
                    .filter(item => item.ghe === ghe)
                    .reduce((maior, item) => Math.max(maior, Number(item.ordem) || 0), -1);
                desejado[chave] = {
                    ghe,
                    exame_id: exameId,
                    nome: (desejado[chave] && desejado[chave].nome) || meta.nome,
                    periodicidade,
                    demissional,
                    ordem: (desejado[chave] && desejado[chave].ordem != null) ? desejado[chave].ordem : maiorOrdemGhe + 1
                };
            });
        }

        const mapaBanco = matrizPcmsoMapaLinhas();
        const inserir = [];
        const atualizar = [];
        const agora = new Date().toISOString();

        Object.entries(desejado).forEach(([chave, item]) => {
            const atual = mapaBanco[chave];
            const payload = {
                ghe: item.ghe,
                exame_id: item.exame_id,
                exame_nome: item.nome,
                periodicidade_meses: item.periodicidade,
                demissional: !!item.demissional,
                ativo: true,
                ordem: Number(item.ordem) || 0,
                updated_at: agora
            };
            if (!atual) {
                inserir.push(payload);
                return;
            }
            const mudou = atual.ativo === false
                || (atual.periodicidade_meses == null ? null : Number(atual.periodicidade_meses)) !== payload.periodicidade_meses
                || (atual.demissional !== false) !== payload.demissional
                || atual.exame_nome !== payload.exame_nome
                || (Number(atual.ordem) || 0) !== payload.ordem;
            if (mudou) atualizar.push({ id: atual.id, payload });
        });

        Object.entries(mapaBanco).forEach(([chave, atual]) => {
            if (atual.ativo === false) return;
            if (desejado[chave]) return;
            atualizar.push({ id: atual.id, payload: { ativo: false, updated_at: agora } });
        });

        if (inserir.length === 0 && atualizar.length === 0) {
            matrizPcmsoSujo = false;
            alert('Nenhuma alteração para salvar.');
            return;
        }

        if (inserir.length > 0) await supabaseInsert('pcmso_matriz_exames', inserir);
        for (const alteracao of atualizar) {
            await supabasePatch('pcmso_matriz_exames', `id=eq.${encodeURIComponent(alteracao.id)}`, alteracao.payload);
        }
        invalidarCacheTabela('pcmso_matriz_exames');

        await carregarMatrizPcmsoExames(true);
        matrizPcmsoSujo = false;
        renderMatrizPcmso();
        if (typeof renderRecomendacaoPsicossocial === 'function') renderRecomendacaoPsicossocial();

        const resumo = [];
        if (inserir.length) resumo.push(`${inserir.length} inclusão(ões)`);
        if (atualizar.length) resumo.push(`${atualizar.length} alteração(ões)`);
        alert(`✅ Matriz do PCMSO atualizada: ${resumo.join(' e ')}.\n\nA mudança vale para todos os usuários do painel.`);
    } catch (err) {
        console.error('Erro ao salvar matriz PCMSO:', err);
        alert('❌ Não foi possível salvar a matriz: ' + (err && err.message ? err.message : err));
    } finally {
        matrizPcmsoSalvando = false;
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '💾 Salvar alterações'; }
    }
}

// ---- Modal de Registro Individual / Exames Complementares e Psicossocial ----
function abrirModalPsicossocial(colaboradorOuMatricula) {
    let matricula = '';
    let colab = null;

    if (typeof colaboradorOuMatricula === 'object' && colaboradorOuMatricula !== null) {
        matricula = String(colaboradorOuMatricula.matricula || colaboradorOuMatricula.id || '').trim();
        colab = colaboradorOuMatricula;
    } else {
        matricula = String(colaboradorOuMatricula || '').trim();
    }

    if (!colab && matricula) {
        colab = (allEfetivo || []).find(e => String(e.id || '').trim() === matricula);
    }

    if (!colab && !matricula) {
        console.warn('abrirModalPsicossocial: colaborador não informado.');
        return;
    }

    const modal = document.getElementById('modalRegistrarPsicoRapido') || document.getElementById('modalRegistrarPsicossocial');
    if (!modal) return;

    modal.dataset.matricula = matricula;

    const dataMutirao = (typeof obterDataMutiraoPsico === 'function') 
        ? obterDataMutiraoPsico() 
        : new Date().toISOString().split('T')[0];

    let exameCfg = (typeof CATALOGO_EXAMES_COMPLEMENTARES !== 'undefined' && CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual]) 
        || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;

    // Se estiver na Matriz Geral e o colaborador for de GHE Psicossocial pendente, sugere Avaliação Psicossocial
    const gNum = normalizarGhe(colab?.ghe);
    const ghesPsico = new Set(CATALOGO_EXAMES_COMPLEMENTARES.psicossocial.ghesPadrao || []);
    const asosColab = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === matricula);
    const infoPsico = ghesPsico.has(gNum) ? verificarExamePsicossocialRealizado(matricula, asosColab) : { realizado: true };
    if (exameComplementarFocoAtual === 'matriz_geral' && ghesPsico.has(gNum) && !infoPsico.realizado) {
        exameCfg = CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setVal('psicoColaboradorMatricula', matricula);
    setVal('modalPsico_matricula', matricula);
    setVal('regPsico_matricula', matricula);

    const nomeColab = colab?.nome || 'Colaborador';
    const funcColab = colab?.funcao || '—';
    const gheColab = colab?.ghe 
        ? (typeof obterNomeGheCompleto === 'function' ? obterNomeGheCompleto(colab.ghe) : colab.ghe)
        : '—';

    setText('modalPsico_nome', nomeColab);
    setText('psicoColaboradorNome', nomeColab);
    setText('modalPsico_lblMatricula', matricula || '—');
    setText('psicoColaboradorMatriculaLbl', matricula || '—');
    setText('modalPsico_lblFuncao', funcColab);
    setText('modalPsico_lblGhe', gheColab);

    setVal('regPsico_colaboradorNome', `${nomeColab} (Matrícula ${matricula})`);
    setVal('regPsico_ghe', gheColab);

    const dataInicial = (dataMutirao && dataMutirao <= new Date().toISOString().split('T')[0])
        ? dataMutirao
        : new Date().toISOString().split('T')[0];
    setVal('psicoDataAvaliacao', dataInicial);
    setVal('modalPsico_data', dataInicial);
    setVal('data_avaliacao', dataInicial);
    setVal('regPsico_dataExame', dataInicial);

    setVal('modalPsico_resultado', 'Apto');
    setVal('regPsico_resultado', 'Apto');

    const profPadrao = exameCfg.profissionalPadrao || 'Psicóloga Responsável';
    setVal('modalPsico_profissional', profPadrao);
    setVal('regPsico_psicologaNome', profPadrao);
    setVal('modalPsico_crp', '');
    setVal('regPsico_crp', '');

    const obsPadrao = (exameCfg.id === 'psicossocial')
        ? 'Avaliação psicossocial realizada conforme diretrizes de NR-35/NR-33/NR-10.'
        : `${exameCfg.nomeExame} realizado conforme cronograma do PCMSO (NR-07).`;
    setVal('modalPsico_obs', obsPadrao);
    setVal('regPsico_obs', obsPadrao);

    const statusMsg = document.getElementById('modalPsico_statusMsg') 
        || document.getElementById('regPsico_statusMsg');
    if (statusMsg) statusMsg.innerHTML = '';

    modal.style.display = 'flex';
}

function abrirModalRegistrarPsicoRapido(matricula) {
    return abrirModalPsicossocial(matricula);
}

function fecharModalRegistrarPsicoRapido() {
    const modal = document.getElementById('modalRegistrarPsicoRapido') || document.getElementById('modalRegistrarPsicossocial');
    if (modal) modal.style.display = 'none';
}

function fecharModalPsicossocial() {
    return fecharModalRegistrarPsicoRapido();
}

async function salvarRegistroPsicoRapido() {
    const modal = document.getElementById('modalRegistrarPsicoRapido') || document.getElementById('modalRegistrarPsicossocial');

    const matricula = (document.getElementById('psicoColaboradorMatricula')?.value ||
                       document.getElementById('modalPsico_matricula')?.value ||
                       document.getElementById('regPsico_matricula')?.value ||
                       modal?.dataset?.matricula || '').trim();

    const inputData = (document.getElementById('psicoDataAvaliacao')?.value 
                    || document.getElementById('data_avaliacao')?.value 
                    || document.getElementById('psicoData')?.value
                    || document.getElementById('modalPsico_data')?.value
                    || document.getElementById('regPsico_dataExame')?.value 
                    || '').trim();

    const resultado = document.getElementById('modalPsico_resultado')?.value ||
                      document.getElementById('regPsico_resultado')?.value || 'Apto';

    const nomeProfissional = (document.getElementById('modalPsico_profissional')?.value ||
                              document.getElementById('regPsico_psicologaNome')?.value || 'Psicóloga Responsável').trim();

    const crp = (document.getElementById('modalPsico_crp')?.value ||
                 document.getElementById('regPsico_crp')?.value || '').trim();

    const parecerObs = (document.getElementById('modalPsico_obs')?.value ||
                        document.getElementById('regPsico_obs')?.value || '').trim();

    const statusMsg = document.getElementById('modalPsico_statusMsg') ||
                      document.getElementById('regPsico_statusMsg');

    const btnSalvar = document.getElementById('btnSalvarPsicoModal') ||
                      modal?.querySelector('.db-apply-btn');

    if (!inputData) {
        if (statusMsg) {
            statusMsg.innerHTML = '<span style="color:var(--danger); font-weight:700;">⚠️ Por favor, informe a Data da Avaliação.</span>';
        } else {
            alert('Por favor, informe a Data da Avaliação.');
        }
        return;
    }

    if (!matricula) {
        if (statusMsg) {
            statusMsg.innerHTML = '<span style="color:var(--danger); font-weight:700;">⚠️ Colaborador não identificado para o registro.</span>';
        } else {
            alert('Colaborador não identificado para o registro.');
        }
        return;
    }

    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '⏳ Salvando...';
    }
    if (statusMsg) {
        statusMsg.innerHTML = '<span style="color:var(--primary); font-weight:700;">Salvando no prontuário ocupacional...</span>';
    }

    try {
        const colab = (allEfetivo || []).find(e => String(e.id || '').trim() === matricula);
        const nomeColaborador = colab?.nome || document.getElementById('modalPsico_nome')?.textContent || 'Colaborador';
        const funcaoColaborador = colab?.funcao || '';
        const setorColaborador = colab?.setor || '';

        let exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
        const gNum = normalizarGhe(colab?.ghe);
        const ghesPsico = new Set(CATALOGO_EXAMES_COMPLEMENTARES.psicossocial.ghesPadrao || []);
        const asosColab = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === matricula)
            .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));
        const infoPsico = ghesPsico.has(gNum) ? verificarExamePsicossocialRealizado(matricula, asosColab) : { realizado: true };

        // Se estiver na Matriz Geral e o colaborador tiver pendência de Psicossocial, registra a Avaliação Psicossocial
        const registrarComoPsico = (exameCfg.id === 'psicossocial') ||
            (exameCfg.id === 'matriz_geral' && ghesPsico.has(gNum) && !infoPsico.realizado) ||
            nomeProfissional.toLowerCase().includes('psic');

        if (registrarComoPsico) {
            const periodicidadeMeses = 12;
            const dataVencimento = typeof addMeses === 'function' ? addMeses(inputData, periodicidadeMeses) : inputData;
            const profBase = nomeProfissional.includes('Médico Coordenador') ? 'Psicóloga Responsável' : nomeProfissional;
            const profFormatado = crp ? `${profBase} (${crp})` : profBase;

            const itemExame = {
                nome: 'Avaliação Psicossocial',
                tipo: 'psicossocial',
                data_avaliacao: inputData,
                data_exame: inputData,
                periodicidade: periodicidadeMeses,
                data_vencimento: dataVencimento,
                resultado: resultado,
                profissional: profFormatado,
                crp: crp,
                obs: parecerObs
            };

            const obsTexto = crp ? `CRP: ${crp} | Parecer: ${parecerObs}` : (parecerObs || 'Avaliação Psicossocial (PGR/PCMSO)');
            const idAsoPsico = `ASO_PSICO_${Date.now()}_${matricula}`;

            const payloadAso = {
                id: idAsoPsico,
                matricula: matricula,
                nome_colaborador: nomeColaborador,
                funcao: funcaoColaborador,
                setor: setorColaborador,
                tipo_aso: 'AVALIAÇÃO PSICOSSOCIAL',
                data_exame: inputData,
                data_vencimento: dataVencimento,
                resultado: resultado.toLowerCase().includes('inapto') ? 'inapto' : 'apto',
                medico_responsavel: profFormatado,
                obs: obsTexto,
                exames_detalhe: [itemExame]
            };

            await supabaseUpsert('aso_exames', [payloadAso]);

            const asosGerais = asosColab.filter(ehRegistroAsoGeralPcmso);
            const ultimoAso = asosGerais[0] || null;

            if (ultimoAso && (!DATA_IMPLANTACAO_PSICOSSOCIAL || (ultimoAso.data_exame && ultimoAso.data_exame >= DATA_IMPLANTACAO_PSICOSSOCIAL))) {
                let examesDetalhe = Array.isArray(ultimoAso.exames_detalhe) ? [...ultimoAso.exames_detalhe] : [];
                const idx = examesDetalhe.findIndex(e => e.nome && e.nome.toLowerCase().includes('psico'));
                if (idx >= 0) {
                    examesDetalhe[idx] = { ...examesDetalhe[idx], ...itemExame };
                } else {
                    examesDetalhe.push(itemExame);
                }

                const payloadUpdateUltimoAso = {
                    id: ultimoAso.id,
                    matricula: ultimoAso.matricula || matricula,
                    data_exame: ultimoAso.data_exame || inputData,
                    exames_detalhe: examesDetalhe,
                    obs: parecerObs ? `${ultimoAso.obs ? ultimoAso.obs + ' | ' : ''}Avaliação Psicossocial em ${formatSimpleDate(inputData)}: ${parecerObs}` : ultimoAso.obs
                };
                try {
                    await supabaseUpsert('aso_exames', [payloadUpdateUltimoAso]);
                    ultimoAso.exames_detalhe = examesDetalhe;
                } catch (errSync) {
                    console.warn('Aviso ao sincronizar exame detalhado no ASO anterior:', errSync);
                }
            }

            invalidarCacheTabela('aso_exames');
            allAsoExames.unshift(payloadAso);
        } else {
            // Registro de Exame Complementar específico ou Atualização da Matriz Geral (ASO Periódico)
            const periodicidadeMeses = exameCfg.periodicidadeMeses;
            const dataVencimento = periodicidadeMeses ? addMeses(inputData, periodicidadeMeses) : null;
            const profFormatado = crp ? `${nomeProfissional} (${crp})` : nomeProfissional;

            const asosGerais = asosColab.filter(ehRegistroAsoGeralPcmso);
            const ultimoAso = asosGerais[0] || null;

            const itemExame = {
                nome: exameCfg.nomeExame,
                data_avaliacao: inputData,
                data_exame: inputData,
                periodicidade: periodicidadeMeses,
                data_vencimento: dataVencimento,
                resultado: resultado,
                profissional: profFormatado,
                obs: parecerObs
            };

            if (ultimoAso) {
                let examesDetalhe = Array.isArray(ultimoAso.exames_detalhe) ? [...ultimoAso.exames_detalhe] : [];
                const idx = examesDetalhe.findIndex(e => nomeExameCorrespondeAoCatalogo(e.nome, exameCfg));
                if (idx >= 0) {
                    examesDetalhe[idx] = { ...examesDetalhe[idx], ...itemExame };
                } else {
                    examesDetalhe.push(itemExame);
                }
                const payloadUpdate = {
                    id: ultimoAso.id,
                    matricula: matricula,
                    data_exame: ultimoAso.data_exame || inputData,
                    exames_detalhe: examesDetalhe,
                    obs: parecerObs ? `${ultimoAso.obs ? ultimoAso.obs + ' | ' : ''}${exameCfg.nomeExame} em ${formatSimpleDate(inputData)}: ${parecerObs}` : ultimoAso.obs
                };
                await supabaseUpsert('aso_exames', [payloadUpdate]);
                ultimoAso.exames_detalhe = examesDetalhe;
                ultimoAso.obs = payloadUpdate.obs;
            } else {
                const idNovo = `ASO_${Date.now()}_${matricula}`;
                const novoAso = {
                    id: idNovo,
                    matricula: matricula,
                    nome_colaborador: nomeColaborador,
                    funcao: funcaoColaborador,
                    setor: setorColaborador,
                    tipo_aso: 'periodico',
                    data_exame: inputData,
                    data_vencimento: dataVencimento || addMeses(inputData, 12),
                    resultado: resultado.toLowerCase().includes('inapto') ? 'inapto' : 'apto',
                    medico_responsavel: profFormatado,
                    obs: parecerObs,
                    exames_detalhe: [itemExame]
                };
                await supabaseUpsert('aso_exames', [novoAso]);
                allAsoExames.unshift(novoAso);
            }
            invalidarCacheTabela('aso_exames');
        }

        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color:var(--success); font-weight:700;">✅ Registro salvo com sucesso!</span>`;
        }

        if (typeof mostrarFeedbackToast === 'function') {
            mostrarFeedbackToast('Registro ocupacional salvo com sucesso!', 'sucesso');
        } else if (typeof showToast === 'function') {
            showToast('Registro ocupacional salvo com sucesso!', 'success');
        }

        setTimeout(() => {
            fecharModalRegistrarPsicoRapido();
            if (btnSalvar) {
                btnSalvar.disabled = false;
                btnSalvar.innerHTML = '💾 Salvar e Regularizar';
            }
            if (typeof renderRecomendacaoPsicossocial === 'function') renderRecomendacaoPsicossocial();
            if (typeof renderSaudePanel === 'function') renderSaudePanel();
        }, 600);

    } catch (err) {
        console.error('Erro ao salvar registro ocupacional:', err);
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '💾 Salvar e Regularizar';
        }
        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color:var(--danger); font-weight:700;">❌ Falha ao salvar: ${err.message}</span>`;
        }
        alert('Erro ao salvar no banco de dados: ' + err.message);
    }
}

window.abrirModalPsicossocial = abrirModalPsicossocial;
window.abrirModalRegistrarPsicoRapido = abrirModalRegistrarPsicoRapido;
window.fecharModalPsicossocial = fecharModalPsicossocial;
window.fecharModalRegistrarPsicoRapido = fecharModalRegistrarPsicoRapido;
window.salvarRegistroPsicoRapido = salvarRegistroPsicoRapido;

// ============================================
// BAIXA EM LOTE PÓS-MUTIRÃO DE EXAMES
// ============================================
function abrirModalBaixaLoteMutirao() {
    const modal = document.getElementById('modalBaixaLoteMutiraoPsico');
    if (!modal) return;

    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const dataMutirao = obterDataMutiraoPsico();

    const subtitulo = document.getElementById('modalBaixaLoteSubtitulo');
    if (subtitulo) subtitulo.textContent = `Registrar realização em lote de ${exameCfg.nomeExame} para os colaboradores que compareceram`;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setVal('baixaLote_data', dataMutirao);
    setVal('baixaLote_resultado', 'Apto');
    setVal('baixaLote_profissional', exameCfg.profissionalPadrao);
    setVal('baixaLote_obs', `Atendimento realizado no mutirão de ${formatSimpleDate(dataMutirao)}`);

    const statusMsg = document.getElementById('baixaLote_statusMsg');
    if (statusMsg) statusMsg.innerHTML = '';

    // Carregar colaboradores elegíveis
    const dados = obterDadosRecomendacaoPsicossocial();
    const container = document.getElementById('listaColaboradoresBaixaLote');
    if (container) {
        container.innerHTML = dados.map(c => {
            const isPendente = c.statusKey === 'PENDENTE' || c.statusKey === 'VENCENDO' || c.statusKey === 'VENCIDO';
            const checked = isPendente ? 'checked' : '';
            return `
                <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 10px; border-radius:6px; background:var(--card); border:1px solid var(--border); font-size:12px; cursor:pointer;" onmouseover="this.style.background='rgba(5,150,105,0.05)'" onmouseout="this.style.background='var(--card)'">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" class="chk-baixa-colab" value="${c.matricula}" data-pendente="${isPendente}" ${checked} onchange="atualizarContadorBaixaLote()">
                        <div>
                            <strong style="color:var(--text);">${escapeHTML(c.nome)}</strong> (Matr. ${c.matricula})
                            <div style="font-size:11px; color:var(--text-light);">${escapeHTML(c.gheNome)} • ${escapeHTML(c.funcao)}</div>
                        </div>
                    </div>
                    <div>${c.statusBadge}</div>
                </label>
            `;
        }).join('');
    }

    atualizarContadorBaixaLote();
    modal.style.display = 'flex';
}

function fecharModalBaixaLoteMutirao() {
    const modal = document.getElementById('modalBaixaLoteMutiraoPsico');
    if (modal) modal.style.display = 'none';
}

function marcarTodosBaixaLote(marcar) {
    document.querySelectorAll('.chk-baixa-colab').forEach(chk => chk.checked = marcar);
    atualizarContadorBaixaLote();
}

function marcarSomentePendentesBaixaLote() {
    document.querySelectorAll('.chk-baixa-colab').forEach(chk => {
        chk.checked = (chk.getAttribute('data-pendente') === 'true');
    });
    atualizarContadorBaixaLote();
}

function atualizarContadorBaixaLote() {
    const total = document.querySelectorAll('.chk-baixa-colab:checked').length;
    const el = document.getElementById('baixaLote_contadorSel');
    if (el) el.textContent = `${total} colaborador(es) selecionado(s)`;
}

async function salvarBaixaLoteMutirao() {
    const selecionados = Array.from(document.querySelectorAll('.chk-baixa-colab:checked')).map(chk => chk.value);
    if (selecionados.length === 0) {
        alert('Por favor, selecione ao menos um colaborador que compareceu para dar baixa.');
        return;
    }

    const dataExame = document.getElementById('baixaLote_data')?.value;
    const resultado = document.getElementById('baixaLote_resultado')?.value || 'Apto';
    const profissional = document.getElementById('baixaLote_profissional')?.value || 'Psicóloga Responsável';
    const obs = document.getElementById('baixaLote_obs')?.value || '';
    const statusMsg = document.getElementById('baixaLote_statusMsg');
    const btnConfirmar = document.getElementById('btnConfirmarBaixaLote');

    if (!dataExame) {
        alert('Informe a data de realização do exame.');
        return;
    }

    if (btnConfirmar) btnConfirmar.disabled = true;
    if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--primary); font-weight:700;">Salvando baixa de ${selecionados.length} colaboradores...</span>`;

    try {
        const exameCfg = (typeof CATALOGO_EXAMES_COMPLEMENTARES !== 'undefined' && CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual]) 
            || (typeof CATALOGO_EXAMES_COMPLEMENTARES !== 'undefined' ? CATALOGO_EXAMES_COMPLEMENTARES.psicossocial : {
                nomeExame: 'Avaliação Psicossocial',
                profissionalPadrao: 'Psicóloga Responsável',
                periodicidadeMeses: 12
            });

        const periodicidadeMeses = exameCfg.periodicidadeMeses || 12;
        const dataVencimento = typeof addMeses === 'function' ? addMeses(dataExame, periodicidadeMeses) : dataExame;

        const itemExame = {
            nome: exameCfg.nomeExame,
            tipo: 'psicossocial',
            data_avaliacao: dataExame,
            data_exame: dataExame,
            periodicidade: periodicidadeMeses,
            data_vencimento: dataVencimento,
            resultado: resultado,
            profissional: profissional,
            obs: obs
        };

        const payloadsUpsert = [];

        for (const matricula of selecionados) {
            const colab = (allEfetivo || []).find(e => String(e.id || '').trim() === matricula);
            const nomeColab = colab?.nome || '';
            const funcColab = colab?.funcao || '';
            const setorColab = colab?.setor || '';

            // Cada avaliação realizada no mutirão gera um registro em aso_exames com data_exame OBRIGATÓRIA (NOT NULL)
            const idAsoPsico = `ASO_PSICO_${Date.now()}_${matricula}_${Math.floor(Math.random() * 1000)}`;
            const novoAso = {
                id: idAsoPsico,
                matricula: matricula,
                nome_colaborador: nomeColab,
                funcao: funcColab,
                setor: setorColab,
                tipo_aso: 'AVALIAÇÃO PSICOSSOCIAL',
                data_exame: dataExame, // <-- CAMPO OBRIGATÓRIO (NOT NULL)
                data_vencimento: dataVencimento,
                resultado: resultado.toLowerCase().includes('inapto') ? 'inapto' : 'apto',
                medico_responsavel: profissional,
                obs: obs || `${exameCfg.nomeExame} realizada no mutirão de ${formatSimpleDate(dataExame)}`,
                exames_detalhe: [itemExame]
            };
            allAsoExames.push(novoAso);
            payloadsUpsert.push(novoAso);

            // Se o colaborador possuir um ASO ocupacional anterior, também atualiza o exames_detalhe com data_exame SEMPRE presente
            const asos = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === matricula)
                .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));
            const ultimoAso = asos.find(a => a.id !== idAsoPsico);

            if (ultimoAso && (!DATA_IMPLANTACAO_PSICOSSOCIAL || (ultimoAso.data_exame && ultimoAso.data_exame >= DATA_IMPLANTACAO_PSICOSSOCIAL))) {
                let examesDetalhe = Array.isArray(ultimoAso.exames_detalhe) ? [...ultimoAso.exames_detalhe] : [];
                const idx = examesDetalhe.findIndex(e => e.nome && e.nome.toLowerCase().includes(exameCfg.nomeExame.toLowerCase().slice(0, 5)));
                if (idx >= 0) {
                    examesDetalhe[idx] = { ...examesDetalhe[idx], ...itemExame };
                } else {
                    examesDetalhe.push(itemExame);
                }

                ultimoAso.exames_detalhe = examesDetalhe;
                payloadsUpsert.push({
                    id: ultimoAso.id,
                    matricula: ultimoAso.matricula || matricula,
                    data_exame: ultimoAso.data_exame || dataExame, // <-- CAMPO OBRIGATÓRIO (NUNCA NULL)
                    data_vencimento: ultimoAso.data_vencimento || dataVencimento,
                    tipo_aso: ultimoAso.tipo_aso || 'periodico',
                    resultado: ultimoAso.resultado || 'apto',
                    medico_responsavel: ultimoAso.medico_responsavel || profissional,
                    nome_colaborador: ultimoAso.nome_colaborador || nomeColab,
                    funcao: ultimoAso.funcao || funcColab,
                    setor: ultimoAso.setor || setorColab,
                    exames_detalhe: examesDetalhe,
                    obs: obs ? `${ultimoAso.obs ? ultimoAso.obs + ' | ' : ''}${exameCfg.nomeExame} em ${formatSimpleDate(dataExame)}: ${obs}` : ultimoAso.obs
                });
            }
        }

        if (payloadsUpsert.length > 0) {
            await supabaseUpsert('aso_exames', payloadsUpsert);
            invalidarCacheTabela('aso_exames');
        }

        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color:var(--success); font-weight:700;">✅ Baixa concluída com sucesso para ${selecionados.length} colaborador(es)!</span>`;
        }

        if (typeof mostrarFeedbackToast === 'function') {
            mostrarFeedbackToast(`Baixa em lote de ${selecionados.length} colaborador(es) concluída com sucesso!`, 'sucesso');
        }

        setTimeout(() => {
            if (btnConfirmar) btnConfirmar.disabled = false;
            fecharModalBaixaLoteMutirao();
            renderRecomendacaoPsicossocial();
            renderSaudePanel();
            alert(`🎉 Pronto! ${selecionados.length} colaboradores tiveram a realização de ${exameCfg.nomeExame} confirmada e estão 100% regulares no PCMSO.`);
        }, 800);

    } catch (err) {
        console.error('Erro na baixa em lote:', err);
        if (btnConfirmar) btnConfirmar.disabled = false;
        if (statusMsg) statusMsg.innerHTML = `<span style="color:var(--danger); font-weight:700;">❌ Falha na baixa: ${err.message}</span>`;
    }
}

// Impressão da Convocação / Ficha do Exame Atual (Blob URL — 100% à prova de bloqueio HTTPS no Vercel)
function imprimirConvocacaoExameAtual() {
    imprimirConvocacaoSelecionados();
}

function imprimirConvocacaoSelecionados() {
    const dados = obterDadosRecomendacaoPsicossocial();
    let lista = [];

    if (selecionadosPsicoConvocacao && selecionadosPsicoConvocacao.size > 0) {
        lista = dados.filter(d => selecionadosPsicoConvocacao.has(d.matricula));
    } else {
        // Se nenhum estiver marcado, seleciona automaticamente os pendentes prioritários respeitando a capacidade da psicóloga
        const cap = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;
        const pendentes = dados.filter(d => d.statusKey === 'PENDENTE' || d.statusKey === 'VENCIDO' || d.statusKey === 'VENCENDO');
        if (pendentes.length === 0) {
            alert('Não há colaboradores pendentes ou selecionados para emissão da convocação.');
            return;
        }
        lista = pendentes.slice(0, cap);
        lista.forEach(c => selecionadosPsicoConvocacao.add(c.matricula));
        renderTabelaRecomendacaoPsicossocial();
        atualizarBarraSelecaoConvocacaoPsico();
    }

    if (lista.length === 0) {
        alert('Nenhum colaborador selecionado para impressão.');
        return;
    }

    const dataMutirao = obterDataMutiraoPsico();
    const dataAtendimentoFmt = formatSimpleDate(dataMutirao);
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const meta = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;

    // Ordenação alfabética
    const listaOrdenada = [...lista].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    const linhasHtml = listaOrdenada.map((c, i) => {
        let motivo = '';
        if (c.statusKey === 'PENDENTE') {
            motivo = c.ehAdmissaoAposMarco ? 'Inclusão PCMSO (Admissional)' : 'Inclusão PCMSO (Pendente)';
        } else if (c.statusKey === 'VENCIDO') {
            motivo = `Renovação Periódica (Vencido em ${formatSimpleDate(c.vencPsico)})`;
        } else if (c.statusKey === 'VENCENDO') {
            motivo = `Renovação Periódica (Vence em ${formatSimpleDate(c.vencPsico)})`;
        } else {
            motivo = c.statusLabel || 'Avaliação Periódica';
        }

        return `
            <tr>
                <td style="text-align:center; font-weight:700;">${i + 1}</td>
                <td style="text-align:center; font-weight:700;">${escapeHTML(c.matricula)}</td>
                <td>
                    <b>${escapeHTML(c.nome)}</b>
                    <div style="font-size:9.5px; color:#555;">CPF: ${formatarCpfExibicao(c.cpf)}</div>
                </td>
                <td>${escapeHTML(c.gheNome)}</td>
                <td>${escapeHTML(c.funcao)}</td>
                <td style="font-size:9.5px;">${escapeHTML(motivo)}</td>
                <td style="width:140px; border-bottom:1px solid #000;">&nbsp;</td>
                <td style="width:80px; text-align:center; font-size:10px;">[ &nbsp; ] Apto<br>[ &nbsp; ] Inapto</td>
                <td style="width:100px; border-bottom:1px solid #000;">&nbsp;</td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Lista de Convocação e Atendimento — ${exameCfg.nomeExame} (${dataAtendimentoFmt})</title>
    <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; margin: 15px; }
        .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:10px; }
        .cabecalho img { max-height:48px; }
        .titulo-doc { text-align:center; flex:1; }
        .titulo-doc h2 { margin:0; font-size:14px; font-weight:800; text-transform:uppercase; }
        .titulo-doc p { margin:3px 0 0; font-size:11px; color:#444; }
        table { width:100%; border-collapse:collapse; margin-top:8px; font-size:10px; }
        th, td { border:1px solid #444; padding:6px 6px; }
        th { background:#f1f5f9; font-weight:700; text-align:left; font-size:10px; text-transform:uppercase; }
        .rodape-assinaturas { margin-top:28px; display:flex; justify-content:space-around; text-align:center; }
        .linha-assinatura { width:280px; border-top:1px solid #000; padding-top:5px; font-size:10.5px; }
        .no-print { text-align:center; margin-bottom:14px; }
        .no-print button { padding:9px 20px; font-size:13px; font-weight:700; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer; }
        @media print { .no-print { display:none; } body { margin:0; } }
    </style>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir Lista Oficial para o Atendimento / Mutirão</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo-doc">
            <h2>LISTA DE CONVOCAÇÃO & REGISTRO DE ATENDIMENTO — ${exameCfg.nomeExame.toUpperCase()}</h2>
            <p>${exameCfg.descricaoBase}</p>
            <p><b>Data Prevista para os Atendimentos: ${dataAtendimentoFmt}</b> — Consórcio Operador PISF Ramal do Agreste</p>
        </div>
        <div style="width:48px;"></div>
    </div>

    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; margin-bottom:8px; font-size:10.5px;">
        <strong>Total de Colaboradores Selecionados: ${listaOrdenada.length}</strong> (Capacidade sugerida: ${meta} atendimentos/dia)
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:30px; text-align:center;">Item</th>
                <th style="width:50px; text-align:center;">Matr.</th>
                <th>Colaborador / CPF</th>
                <th>GHE / Frente</th>
                <th>Função Contratual</th>
                <th>Motivo Convocação</th>
                <th>Assinatura do Empregado</th>
                <th style="text-align:center;">Parecer</th>
                <th>Rubrica ${exameCfg.tipoProfissional || 'Profissional'}</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml}
        </tbody>
    </table>

    <div class="rodape-assinaturas">
        <div class="linha-assinatura">
            <b>João Everton de Souza Limeira</b><br>
            Engenheiro de Segurança do Trabalho<br>
            CREA 12345/D-PE — Consórcio COP
        </div>
        <div class="linha-assinatura">
            <b>${exameCfg.profissionalPadrao}</b><br>
            ${exameCfg.nomeExame}<br>
            ${exameCfg.tipoProfissional || 'Registro'}: _______________________
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Convocacao_${exameCfg.id}_${dataAtendimentoFmt.replace(/\//g, '-')}`);
}

function imprimirConvocacaoPsicossocial() {
    abrirModalConvocacaoPsicossocial();
}

// ==============================================================================
// CONVOCAÇÃO POR EQUIPE / ENCARREGADO & ENCAMINHAMENTO CLÍNICO EM LOTE (NR-07)
// ==============================================================================

function imprimirConvocacaoPorEquipe() {
    const dados = obterDadosRecomendacaoPsicossocial();
    const filtroLider = (document.getElementById('psicoFiltroLider')?.value || '').trim();
    const filtroSetor = (document.getElementById('psicoFiltroSetor')?.value || '').trim();
    const filtroGhe = (document.getElementById('psicoGheSelect') || document.getElementById('psicoFiltroGhe'))?.value || '';
    const filtroCiclo = (document.getElementById('psicoFiltroCiclo')?.value || '').trim();
    const busca = (document.getElementById('psicoBuscaInput')?.value || '').toLowerCase().trim();
    const ocultarFerias = document.getElementById('psicoOcultarEmFerias')?.checked ?? true;

    let lista = [];
    if (selecionadosPsicoConvocacao && selecionadosPsicoConvocacao.size > 0) {
        lista = dados.filter(d => selecionadosPsicoConvocacao.has(d.matricula));
    } else {
        // Aplica os filtros ativos na tela
        lista = dados.filter(d => {
            if (ocultarFerias && (d.emFerias || d.emAfastamento)) return false;

            // Filtro por Ciclo de Férias
            if (filtroCiclo === '1_ok' && !d.ciclo1Fechado) return false;
            if (filtroCiclo === '2_ok' && !d.ciclo2Fechado) return false;
            if (filtroCiclo === 'aberto' && d.ciclo1Fechado && d.ciclo2Fechado) return false;

            if (filtroLider) {
                const respUpper = (d.responsavel || '').toUpperCase();
                const liderUpper = (d.liderNome || '').toUpperCase();
                const nomeUpper = (d.nome || '').toUpperCase();
                if (filtroLider.startsWith('NOME:')) {
                    const buscaNome = filtroLider.substring(5).toUpperCase();
                    if (nomeUpper !== buscaNome && !respUpper.includes(buscaNome) && !liderUpper.includes(buscaNome)) return false;
                } else {
                    const fUpper = filtroLider.toUpperCase();
                    if (respUpper !== fUpper && !respUpper.includes(fUpper) && !liderUpper.includes(fUpper) && !nomeUpper.includes(fUpper)) return false;
                }
            }
            if (filtroSetor && (d.setor || '').trim().toLowerCase() !== filtroSetor.toLowerCase()) return false;
            if (filtroGhe && d.ghe !== filtroGhe) return false;
            if (busca) {
                const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.funcao} ${d.setor} ${d.ghe} ${d.responsavel} ${d.cicloRotulo || ''}`.toLowerCase();
                if (!txt.includes(busca)) return false;
            }
            return true;
        });

        if (lista.length === 0) {
            alert('Não há colaboradores filtrados ou selecionados para emissão da convocação por equipe.');
            return;
        }

        // Se nenhum filtro restrito de encarregado estiver ativo e houver muitos colaboradores, prioriza pendentes e vencendo
        if (!filtroLider && lista.length > 50) {
            const priorizados = lista.filter(d => d.statusKey === 'PENDENTE' || d.statusKey === 'VENCIDO' || d.statusKey === 'VENCENDO');
            if (priorizados.length > 0) {
                lista = priorizados;
            }
        }
    }

    if (lista.length === 0) {
        alert('Nenhum colaborador encontrado para gerar a convocação por equipe.');
        return;
    }

    // Identificação do Encarregado / Liderança no cabeçalho
    let nomeLiderHeader = 'Todas as Lideranças / Equipes de Campo';
    if (filtroLider) {
        const selEl = document.getElementById('psicoFiltroLider');
        const txtOpt = selEl ? selEl.selectedOptions[0]?.text : filtroLider;
        nomeLiderHeader = txtOpt.replace(/\s*\(\d+\s*ativos\)/i, '').trim();
    } else if (selecionadosPsicoConvocacao.size > 0) {
        const lideresDistintos = Array.from(new Set(lista.map(c => c.liderNome || c.responsavel).filter(Boolean)));
        if (lideresDistintos.length === 1) {
            nomeLiderHeader = `Equipe do Encarregado: ${lideresDistintos[0]}`;
        } else if (lideresDistintos.length > 1) {
            nomeLiderHeader = `Múltiplas Equipes (${lideresDistintos.slice(0, 3).join(', ')}${lideresDistintos.length > 3 ? '...' : ''})`;
        }
    }

    let filtroCicloHeader = 'Todos os Ciclos';
    if (filtroCiclo === '1_ok') filtroCicloHeader = '1º Ciclo Fechado (OK)';
    else if (filtroCiclo === '2_ok') filtroCicloHeader = '2º Ciclo Fechado (OK)';
    else if (filtroCiclo === 'aberto') filtroCicloHeader = 'Ciclo em Aberto / Pendente';

    const setorHeader = filtroSetor || 'Todas as Frentes de Obra / Canteiro';
    const dataMutirao = typeof obterDataMutiraoPsico === 'function' ? obterDataMutiraoPsico() : new Date().toISOString().split('T')[0];
    const dataAtendimentoFmt = formatSimpleDate(dataMutirao);
    const dataHojeExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;

    // Ordenação alfabética por Encarregado, depois GHE, depois Nome
    const listaOrdenada = [...lista].sort((a, b) => {
        const lidA = a.liderNome || a.responsavel || '';
        const lidB = b.liderNome || b.responsavel || '';
        if (lidA !== lidB) return lidA.localeCompare(lidB);
        if (a.ghe !== b.ghe) return a.ghe.localeCompare(b.ghe);
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    const linhasHtml = listaOrdenada.map((c, i) => {
        let situacaoEscala = 'Ativo em Campo';
        let dtSugerida = dataAtendimentoFmt;
        if (c.emFerias) {
            situacaoEscala = `<span style="color:#b45309; font-weight:700;">🏖️ Férias até ${formatSimpleDate(c.dtFimFerias)}</span><br><small style="color:#047857; font-weight:700;">Retorno: ${formatSimpleDate(c.dtRetornoFerias)}</small>`;
            dtSugerida = c.dtRetornoFerias ? formatSimpleDate(c.dtRetornoFerias) : dataAtendimentoFmt;
        } else if (c.emAfastamento) {
            const rotAfast = c.exigeRetornoNr07 ? '⚠️ Retorno ao Trabalho (NR-07 >30d)' : `Afastado até ${formatSimpleDate(c.dtFimAfastamento)}`;
            situacaoEscala = `<span style="color:#b91c1c; font-weight:700;">🏥 ${rotAfast}</span><br><small style="color:#047857; font-weight:700;">Retorno: ${formatSimpleDate(c.dtRetornoAfastamento)}</small>`;
            dtSugerida = c.dtRetornoAfastamento ? formatSimpleDate(c.dtRetornoAfastamento) : dataAtendimentoFmt;
        } else {
            let cicloTag = '<span style="color:#475569; font-size:9px; background:#f1f5f9; padding:1px 4px; border-radius:3px;">1º Ciclo Aberto</span>';
            if (c.ciclo2Fechado) cicloTag = '<span style="color:#3730a3; font-weight:700; font-size:9.5px; background:#e0e7ff; padding:1px 5px; border-radius:3px;">2º Ciclo OK</span>';
            else if (c.ciclo1Fechado) cicloTag = '<span style="color:#166534; font-weight:700; font-size:9.5px; background:#dcfce7; padding:1px 5px; border-radius:3px;">1º Ciclo OK</span>';

            situacaoEscala = `<div style="margin-bottom:2px;">${cicloTag}</div><span style="color:#065f46; font-weight:700;">✅ Em Atividade</span>`;
        }

        const examesListaStr = (c.examesPcmsoGhe && c.examesPcmsoGhe.length > 0)
            ? c.examesPcmsoGhe.join(', ')
            : (exameCfg ? exameCfg.nomeExame : 'Exame Clínico Ocupacional (ASO)');

        return `
            <tr>
                <td style="text-align:center; font-weight:700;">${i + 1}</td>
                <td style="text-align:center; font-weight:700; color:#1e1b4b;">${escapeHTML(c.matricula)}</td>
                <td>
                    <b>${escapeHTML(c.nome)}</b>
                    <div style="font-size:9.5px; color:#555;">CPF: ${formatarCpfExibicao(c.cpf)}</div>
                </td>
                <td>
                    <b>${escapeHTML(c.funcao)}</b>
                    <div style="font-size:9.5px; color:#555;">${escapeHTML(c.setor || '')}</div>
                </td>
                <td style="font-size:10px;">
                    <span style="font-weight:700; background:#f1f5f9; padding:2px 5px; border-radius:3px; border:1px solid #cbd5e1;">${escapeHTML(c.ghe)}</span>
                    <div style="font-size:9px; color:#555; margin-top:2px;">${escapeHTML(c.gheNome || '')}</div>
                </td>
                <td style="font-size:10px;">
                    <b>${escapeHTML(c.liderNome || c.responsavel || '—')}</b>
                </td>
                <td style="font-size:9.5px; line-height:1.25;">
                    <div style="font-weight:700; color:#1e3a8a;">${escapeHTML(examesListaStr)}</div>
                    <div style="font-size:8.5px; color:#64748b; margin-top:2px;">Status: ${escapeHTML(c.statusLabel || c.statusKey)}</div>
                </td>
                <td style="text-align:center; font-size:9.5px; line-height:1.2;">
                    ${situacaoEscala}
                    <div style="font-size:9px; font-weight:800; color:#4338ca; margin-top:3px; background:#e0e7ff; border-radius:3px; padding:1px 3px;">Prev: ${dtSugerida}</div>
                </td>
                <td style="width:130px; border-bottom:1px solid #000;">&nbsp;</td>
                <td style="width:75px; text-align:center; font-size:9.5px; line-height:1.3;">
                    [ &nbsp; ] Apto<br>[ &nbsp; ] Inapto
                </td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Guia de Convocação Ocupacional (NR-07) — Equipe / Frente de Campo</title>
    <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 10px; line-height: 1.3; }
        .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:8px; }
        .cabecalho img { max-height:45px; }
        .titulo-doc { text-align:center; flex:1; margin:0 12px; }
        .titulo-doc h2 { margin:0; font-size:13.5px; font-weight:800; text-transform:uppercase; color:#0f172a; }
        .titulo-doc p { margin:2px 0 0; font-size:10.5px; color:#334155; }
        .bloco-info { display:grid; grid-template-columns: 2fr 1.5fr 1fr; gap:8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:8px; font-size:10.5px; }
        .bloco-info div { display:flex; flex-direction:column; }
        .bloco-info label { font-size:9px; text-transform:uppercase; color:#64748b; font-weight:700; margin-bottom:1px; }
        .bloco-info span { font-weight:700; color:#0f172a; }
        table { width:100%; border-collapse:collapse; margin-top:6px; font-size:9.5px; }
        th, td { border:1px solid #64748b; padding:5px 6px; }
        th { background:#f1f5f9; font-weight:700; text-align:left; font-size:9px; text-transform:uppercase; color:#1e293b; }
        .rodape-assinaturas { margin-top:24px; display:flex; justify-content:space-between; text-align:center; gap:20px; page-break-inside:avoid; }
        .linha-assinatura { flex:1; border-top:1px solid #000; padding-top:4px; font-size:9.5px; }
        .no-print { text-align:center; margin-bottom:12px; }
        .no-print button { padding:8px 18px; font-size:12px; font-weight:700; background:#4338ca; color:#fff; border:none; border-radius:6px; cursor:pointer; }
        @media print { .no-print { display:none; } body { margin:0; } }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir Guia Oficial de Convocação & Encaminhamento (NR-07)</button>
    </div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo-doc">
            <h2>GUIA DE CONVOCAÇÃO OCUPACIONAL & ENCAMINHAMENTO DE EXAMES (NR-07)</h2>
            <p><b>Programa de Controle Médico de Saúde Ocupacional (PCMSO)</b> — Cronograma de Exames Periódicos e Complementares</p>
            <p>Consórcio Operador PISF Ramal do Agreste (COP) • Contrato de Gestão e Operação</p>
        </div>
        <div style="font-size:9px; text-align:right; color:#475569; width:110px;">
            <b>Emissão:</b><br>${dataHojeExtenso}
        </div>
    </div>

    <div class="bloco-info">
        <div>
            <label>Encarregado / Liderança de Campo Responsável</label>
            <span>${escapeHTML(nomeLiderHeader)}</span>
        </div>
        <div>
            <label>Frente de Trabalho / Setor Operacional</label>
            <span>${escapeHTML(setorHeader)}</span>
        </div>
        <div>
            <label>Data Programada do Atendimento</label>
            <span style="color:#4338ca;">${dataAtendimentoFmt}</span>
        </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:10px;">
        <div><b>Total de Colaboradores Convocados:</b> ${listaOrdenada.length} empregados</div>
        <div style="color:#64748b;"><i>NR-07 Item 7.5.8: Exames periódicos planejados conforme cronograma e grau de risco do GHE.</i></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:25px; text-align:center;">#</th>
                <th style="width:45px; text-align:center;">Matr.</th>
                <th style="width:170px;">Colaborador / CPF</th>
                <th style="width:140px;">Função / Setor</th>
                <th style="width:110px;">GHE</th>
                <th style="width:110px;">Encarregado</th>
                <th>Exames PCMSO Requeridos (NR-07)</th>
                <th style="width:115px; text-align:center;">Escala & Data Sugerida</th>
                <th style="width:130px; text-align:center;">Ciente do Colaborador</th>
                <th style="width:75px; text-align:center;">Parecer</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml}
        </tbody>
    </table>

    <div class="rodape-assinaturas">
        <div class="linha-assinatura">
            <b>João Everton de Souza Limeira</b><br>
            Engenheiro de Segurança do Trabalho<br>
            CREA 12345/D-PE — Consórcio COP
        </div>
        <div class="linha-assinatura">
            <b>${escapeHTML(nomeLiderHeader.split(' — ')[0])}</b><br>
            Encarregado / Liderança de Campo<br>
            Ciente do Cronograma & Escala de Transporte
        </div>
        <div class="linha-assinatura">
            <b>Médico Examinador / Clínica de Saúde</b><br>
            Clínica de Medicina do Trabalho Prestadora<br>
            CRM: ____________________ / Parecer PCMSO
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Convocacao_Equipe_${dataAtendimentoFmt.replace(/\//g, '-')}`);
}

function exportarRelacaoClinica() {
    const dados = obterDadosRecomendacaoPsicossocial();
    const filtroLider = (document.getElementById('psicoFiltroLider')?.value || '').trim();
    const filtroSetor = (document.getElementById('psicoFiltroSetor')?.value || '').trim();
    const filtroGhe = (document.getElementById('psicoGheSelect') || document.getElementById('psicoFiltroGhe'))?.value || '';
    const busca = (document.getElementById('psicoBuscaInput')?.value || '').toLowerCase().trim();
    const ocultarFerias = document.getElementById('psicoOcultarEmFerias')?.checked ?? true;

    let lista = [];
    if (selecionadosPsicoConvocacao && selecionadosPsicoConvocacao.size > 0) {
        lista = dados.filter(d => selecionadosPsicoConvocacao.has(d.matricula));
    } else {
        lista = dados.filter(d => {
            if (ocultarFerias && (d.emFerias || d.emAfastamento)) return false;
            if (filtroLider) {
                const respUpper = (d.responsavel || '').toUpperCase();
                const liderUpper = (d.liderNome || '').toUpperCase();
                const nomeUpper = (d.nome || '').toUpperCase();
                if (filtroLider.startsWith('NOME:')) {
                    const buscaNome = filtroLider.substring(5).toUpperCase();
                    if (nomeUpper !== buscaNome && !respUpper.includes(buscaNome) && !liderUpper.includes(buscaNome)) return false;
                } else {
                    const fUpper = filtroLider.toUpperCase();
                    if (respUpper !== fUpper && !respUpper.includes(fUpper) && !liderUpper.includes(fUpper) && !nomeUpper.includes(fUpper)) return false;
                }
            }
            if (filtroSetor && (d.setor || '').trim().toLowerCase() !== filtroSetor.toLowerCase()) return false;
            if (filtroGhe && d.ghe !== filtroGhe) return false;
            if (busca) {
                const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.funcao} ${d.setor} ${d.ghe} ${d.responsavel}`.toLowerCase();
                if (!txt.includes(busca)) return false;
            }
            return true;
        });
    }

    if (lista.length === 0) {
        alert('Nenhum colaborador encontrado para exportação da relação clínica.');
        return;
    }

    const dataMutirao = typeof obterDataMutiraoPsico === 'function' ? obterDataMutiraoPsico() : new Date().toISOString().split('T')[0];
    const dataMutiraoFmt = formatSimpleDate(dataMutirao);

    const cabecalhos = [
        'Item',
        'Matrícula',
        'Nome do Colaborador',
        'CPF',
        'Função Contratual',
        'Setor / Frente',
        'Encarregado / Liderança',
        'GHE',
        'Nome do GHE',
        'Exames PCMSO (NR-07)',
        'Status do Exame',
        'Situação de Escala (Férias/Afastamento)',
        'Data Sugerida para Atendimento'
    ];

    const rows = lista.map((c, idx) => {
        let escala = 'Ativo em Campo';
        let dataSugerida = dataMutiraoFmt;
        if (c.emFerias) {
            escala = `Em Férias até ${formatSimpleDate(c.dtFimFerias)} (Retorno em ${formatSimpleDate(c.dtRetornoFerias)})`;
            dataSugerida = c.dtRetornoFerias ? formatSimpleDate(c.dtRetornoFerias) : dataMutiraoFmt;
        } else if (c.emAfastamento) {
            escala = `Afastado até ${formatSimpleDate(c.dtFimAfastamento)} (${c.exigeRetornoNr07 ? 'Exame de Retorno ao Trabalho NR-07' : 'Retorno em ' + formatSimpleDate(c.dtRetornoAfastamento)})`;
            dataSugerida = c.dtRetornoAfastamento ? formatSimpleDate(c.dtRetornoAfastamento) : dataMutiraoFmt;
        }

        const examesStr = (c.examesPcmsoGhe && c.examesPcmsoGhe.length > 0)
            ? c.examesPcmsoGhe.join('; ')
            : 'Exame Clínico Ocupacional (ASO)';

        return [
            idx + 1,
            c.matricula,
            c.nome,
            formatarCpfExibicao(c.cpf),
            c.funcao || '',
            c.setor || '',
            c.liderNome || c.responsavel || 'Não Informado',
            c.ghe || '',
            c.gheNome || '',
            examesStr,
            c.statusLabel || c.statusKey,
            escala,
            dataSugerida
        ];
    });

    const dataSlug = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `RELACAO_CLINICA_EXAMES_NR07_${dataSlug}`;

    if (typeof XLSX !== 'undefined') {
        const aoa = [cabecalhos, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [
            { wch: 6 },  // Item
            { wch: 12 }, // Matrícula
            { wch: 32 }, // Nome
            { wch: 16 }, // CPF
            { wch: 24 }, // Função
            { wch: 20 }, // Setor
            { wch: 22 }, // Encarregado
            { wch: 8 },  // GHE
            { wch: 28 }, // Nome GHE
            { wch: 38 }, // Exames
            { wch: 20 }, // Status
            { wch: 30 }, // Escala
            { wch: 18 }  // Data Sugerida
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ENCAMINHAMENTO_NR07');
        XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
    } else {
        // Fallback para CSV UTF-8
        let csvContent = '\uFEFF' + cabecalhos.map(h => `"${h}"`).join(';') + '\n';
        rows.forEach(r => {
            csvContent += r.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(';') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (typeof mostrarFeedbackToast === 'function') {
        mostrarFeedbackToast(`📊 Relação clínica exportada com sucesso (${lista.length} colaboradores)!`, 'sucesso');
    }
}

function exportarExcelExameAtual() {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada.');
        return;
    }
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const dados = obterDadosRecomendacaoPsicossocial();
    const rows = dados.map(d => ({
        'Matrícula': d.matricula,
        'Nome do Colaborador': d.nome,
        'CPF': d.cpf,
        'GHE': d.ghe,
        'Descrição do GHE': d.gheNome,
        'Setor': d.setor,
        'Função Contratual': d.funcao,
        'Data de Admissão': d.dt_admissao ? formatSimpleDate(d.dt_admissao) : '',
        'Último ASO (Data)': d.ultimoAsoData ? formatSimpleDate(d.ultimoAsoData) : '',
        'Último ASO (Tipo)': d.ultimoAsoTipo || '',
        [`${exameCfg.nomeExame} Realizada`]: d.temPsico ? 'SIM' : 'NÃO',
        [`Data ${exameCfg.nomeExame}`]: d.dataPsico ? formatSimpleDate(d.dataPsico) : '',
        [`Vencimento ${exameCfg.nomeExame}`]: d.vencPsico ? formatSimpleDate(d.vencPsico) : '',
        'Status da Convocação': d.statusLabel
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exameCfg.nomeExame.slice(0, 31));
    const hoje = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Recomendacao_${exameCfg.id}_COP_${hoje}.xlsx`);
}

function exportarExcelPsicossocial() {
    exportarExcelExameAtual();
}

function copiarConvocacaoExameWhatsApp() {
    copiarConvocacaoSelecionadosWhatsApp();
}

function copiarConvocacaoSelecionadosWhatsApp() {
    const dados = obterDadosRecomendacaoPsicossocial();
    let lista = [];

    if (selecionadosPsicoConvocacao && selecionadosPsicoConvocacao.size > 0) {
        lista = dados.filter(d => selecionadosPsicoConvocacao.has(d.matricula));
    } else {
        const cap = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;
        const pendentes = dados.filter(d => d.statusKey === 'PENDENTE' || d.statusKey === 'VENCIDO' || d.statusKey === 'VENCENDO');
        if (pendentes.length === 0) {
            alert('Não há colaboradores pendentes ou selecionados para convocação via WhatsApp.');
            return;
        }
        lista = pendentes.slice(0, cap);
        lista.forEach(c => selecionadosPsicoConvocacao.add(c.matricula));
        renderTabelaRecomendacaoPsicossocial();
        atualizarBarraSelecaoConvocacaoPsico();
    }

    if (lista.length === 0) {
        alert('Nenhum colaborador selecionado para envio via WhatsApp.');
        return;
    }

    const dataMutiraoFmt = formatSimpleDate(obterDataMutiraoPsico());
    const exameCfg = CATALOGO_EXAMES_COMPLEMENTARES[exameComplementarFocoAtual] || CATALOGO_EXAMES_COMPLEMENTARES.psicossocial;
    const cap = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;

    let txt = `📢 *CONVOCAÇÃO SESMT — ATENDIMENTO DE ${exameCfg.nomeExame.toUpperCase()}* 🩺\n`;
    txt += `📅 *Data do Atendimento:* ${dataMutiraoFmt}\n`;
    txt += `📍 *Local:* ${exameCfg.localPadrao}\n`;
    txt += `👥 *Total de Colaboradores Selecionados:* ${lista.length} de ${cap} vagas diárias sugeridas\n`;
    txt += `🎯 *Objetivo:* Regularização obrigatória do PGR & PCMSO (${exameCfg.descricaoBase})\n\n`;
    txt += `Solicitamos aos Srs. Encarregados e Líderes que liberem pontualmente os seguintes colaboradores previamente alinhados:\n\n`;

    const porGhe = {};
    lista.forEach(c => {
        const gheNome = c.gheNome || `GHE ${c.ghe}`;
        if (!porGhe[gheNome]) porGhe[gheNome] = [];
        porGhe[gheNome].push(c);
    });

    for (const [gheNome, colabs] of Object.entries(porGhe)) {
        txt += `🔹 *${gheNome.toUpperCase()}* (${colabs.length} vagas convocadas):\n`;
        colabs.forEach((c, idx) => {
            const tag = c.statusKey === 'PENDENTE' 
                ? '🔴 [Inclusão PCMSO]' 
                : (c.statusKey === 'VENCIDO' ? '🔴 [Renovação Vencida]' : '🟡 [Renovação Periódica]');
            txt += `   ${idx + 1}. ${c.nome} (Matrícula ${c.matricula} - ${c.funcao}) ${tag}\n`;
        });
        txt += `\n`;
    }

    txt += `⚠️ *Importante:* A presença e pontualidade são indispensáveis para a manutenção dos ASOs e regularidade técnica das frentes de serviço.\n`;
    txt += `_Engenharia de Segurança do Trabalho — Consórcio COP_`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => {
            alert(`✅ Mensagem de convocação com ${lista.length} colaboradores selecionados copiada para o WhatsApp! Cole diretamente no grupo dos encarregados.`);
        }).catch(() => {
            prompt('Copie o texto da convocação abaixo:', txt);
        });
    } else {
        prompt('Copie o texto da convocação abaixo:', txt);
    }
}

function copiarConvocacaoPsicoWhatsAppModal() {
    const selecionados = (convocacaoPsicoLista || []).filter(c => c.selecionado);
    if (selecionados.length === 0) {
        alert('Por favor, selecione ao menos um colaborador na triagem antes de copiar a convocação.');
        return;
    }

    const inputData = document.getElementById('convocPsico_dataAtendimento');
    const dataAtendimentoStr = inputData?.value || new Date().toISOString().split('T')[0];
    const dataAtendimentoFmt = formatSimpleDate(dataAtendimentoStr);
    const cap = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;

    let txt = `📢 *CONVOCAÇÃO SESMT — AVALIAÇÃO PSICOSSOCIAL (PCMSO)* 🩺\n`;
    txt += `📅 *Data Prevista:* ${dataAtendimentoFmt}\n`;
    txt += `📍 *Local:* Ambulatório / Canteiro de Obras Ramal do Agreste\n`;
    txt += `👥 *Total Convocado:* ${selecionados.length} colaboradores (${cap} vagas diárias)\n`;
    txt += `🎯 *Objetivo:* Conformidade com PGR & PCMSO (NR-01, NR-33, NR-35 e NR-10)\n\n`;
    txt += `Solicitamos aos Srs. Encarregados e Líderes que liberem pontualmente os seguintes colaboradores:\n\n`;

    const porGhe = {};
    selecionados.forEach(c => {
        const gheNome = c.gheNome || `GHE ${c.ghe}`;
        if (!porGhe[gheNome]) porGhe[gheNome] = [];
        porGhe[gheNome].push(c);
    });

    for (const [gheNome, colabs] of Object.entries(porGhe)) {
        txt += `🔹 *${gheNome.toUpperCase()}* (${colabs.length} convocados):\n`;
        colabs.forEach((c, idx) => {
            let rotulo = '';
            if (c.avulso) {
                rotulo = '➕ [Convocação Especial]';
            } else if (c.tipoConvocacao === 'inclusao') {
                rotulo = '🔴 [Inclusão PCMSO]';
            } else if (c.vencPsico && c.vencPsico < new Date().toISOString().split('T')[0]) {
                rotulo = '🔴 [Renovação Vencida]';
            } else {
                rotulo = '🟡 [Renovação Periódica]';
            }
            txt += `   ${idx + 1}. ${c.nome} (Matrícula ${c.matricula} - ${c.funcao}) ${rotulo}\n`;
        });
        txt += `\n`;
    }

    txt += `⚠️ *Importante:* A presença é obrigatória para a manutenção da aptidão clínica nas atividades de risco.\n`;
    txt += `_Engenharia de Segurança do Trabalho — Consórcio COP_`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(() => {
            alert(`✅ Mensagem com ${selecionados.length} colaboradores convocados copiada para o WhatsApp! Cole no grupo das lideranças.`);
        }).catch(() => {
            prompt('Copie o texto da convocação abaixo:', txt);
        });
    } else {
        prompt('Copie o texto da convocação abaixo:', txt);
    }
}

function copiarConvocacaoPsicoWhatsApp() {
    copiarConvocacaoSelecionadosWhatsApp();
}

window.imprimirConvocacaoSelecionados = imprimirConvocacaoSelecionados;
window.imprimirConvocacaoPorEquipe = imprimirConvocacaoPorEquipe;
window.exportarRelacaoClinica = exportarRelacaoClinica;
window.popularFiltrosEquipeRecomendacaoExames = popularFiltrosEquipeRecomendacaoExames;
window.aoMudarFiltroEquipePsico = aoMudarFiltroEquipePsico;
window.copiarConvocacaoSelecionadosWhatsApp = copiarConvocacaoSelecionadosWhatsApp;
window.copiarConvocacaoPsicoWhatsAppModal = copiarConvocacaoPsicoWhatsAppModal;
window.imprimirConvocacaoExameAtual = imprimirConvocacaoExameAtual;
window.copiarConvocacaoExameWhatsApp = copiarConvocacaoExameWhatsApp;
window.imprimirConvocacaoPsicossocial = imprimirConvocacaoPsicossocial;
window.copiarConvocacaoPsicoWhatsApp = copiarConvocacaoPsicoWhatsApp;
window.toggleHeaderCheckboxConvocacao = marcarTodosConvocacaoPsico;

// ============================================================
// MÓDULO: PARAMETRIZAÇÃO E TRIAGEM DE CONVOCAÇÃO — PSICOSSOCIAL
// ============================================================

var convocacaoPsicoLista = [];
var convocacaoPsicoAvulsos = [];

function aoClicarEmitirConvocacaoExame() {
    if (exameComplementarFocoAtual === 'psicossocial') {
        abrirModalConvocacaoPsicossocial();
    } else {
        imprimirConvocacaoExameAtual();
    }
}

function formatarCpfExibicao(cpf) {
    if (!cpf) return '—';
    const limpo = String(cpf).replace(/\D/g, '');
    if (limpo.length === 11) {
        return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
    }
    return String(cpf);
}

async function abrirModalConvocacaoPsicossocial() {
    try {
        if (!allEfetivo || allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }
        if (!allAsoExames || allAsoExames.length === 0) {
            allAsoExames = await supabaseFetch('aso_exames', '?select=*');
        }
        if (!allGheCatalogo || allGheCatalogo.length === 0) {
            allGheCatalogo = await supabaseFetch('ghe_catalogo', '?select=*');
        }
    } catch (e) {
        console.warn('Erro ao carregar dados para convocação psicossocial:', e);
    }

    const modal = document.getElementById('modalConvocacaoPsicossocial');
    if (!modal) return;

    // Preencher data prevista do atendimento: padrão amanhã ou data salva se >= hoje
    const inputData = document.getElementById('convocPsico_dataAtendimento');
    if (inputData) {
        const dataSalva = obterDataMutiraoPsico();
        const hojeIso = new Date().toISOString().split('T')[0];
        if (dataSalva && dataSalva >= hojeIso) {
            inputData.value = dataSalva;
        } else {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            const ano = d.getFullYear();
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            inputData.value = `${ano}-${mes}-${dia}`;
        }
    }

    // Popular opções do seletor de períodos
    popularSelectPeriodosConvocacaoPsico();

    // Popular select de GHEs monitorados
    popularSelectGhesConvocacaoPsico();

    // Popular datalist para adicionar colaboradores avulsos
    popularDatalistColabsAvulsosPsico();

    // Limpar busca
    const buscaInput = document.getElementById('convocPsico_buscaInput');
    if (buscaInput) buscaInput.value = '';

    // Resetar novos filtros de triagem
    const selStatus = document.getElementById('convocPsico_filtroStatusTriagem');
    if (selStatus) selStatus.value = 'pendentes_periodo';
    const chkLegado = document.getElementById('convocPsico_chkExibirLegado');
    if (chkLegado) chkLegado.checked = false;

    // Fechar painel avulso caso esteja aberto
    alternarPainelAdicionarAvulsoPsico(false);

    // Carregar os colaboradores pela triagem inicial
    carregarColaboradoresTriagemPsicossocial();

    modal.style.display = 'flex';
}

function fecharModalConvocacaoPsicossocial() {
    const modal = document.getElementById('modalConvocacaoPsicossocial');
    if (modal) modal.style.display = 'none';
}

function popularSelectPeriodosConvocacaoPsico() {
    const sel = document.getElementById('convocPsico_filtroPeriodo');
    if (!sel) return;

    const hoje = new Date();
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const mesAtualNome = nomesMeses[hoje.getMonth()];
    const anoAtual = hoje.getFullYear();

    const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const proxMesNome = nomesMeses[proxMes.getMonth()];
    const proxMesAno = proxMes.getFullYear();

    const mesSub2 = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 1);
    const mesSub2Nome = nomesMeses[mesSub2.getMonth()];

    sel.innerHTML = `
        <option value="mes_atual" selected>🎯 Mês Atual (${mesAtualNome}/${anoAtual})</option>
        <option value="60d">⏱️ Mês Atual + Próximo (60d: ${mesAtualNome} e ${proxMesNome})</option>
        <option value="90d">🗓️ Próximos 90 dias (${mesAtualNome} a ${mesSub2Nome})</option>
        <option value="apenas_inclusoes">🔴 Inclusões PCMSO (Implantação do Programa)</option>
        <option value="todos">🌐 Todos os Colaboradores Monitorados</option>
    `;
}

function popularSelectGhesConvocacaoPsico() {
    const sel = document.getElementById('convocPsico_filtroGhe');
    if (!sel) return;

    const ghesObrig = Array.from(obterGhesObrigatoriosPsicossocial()).sort();
    sel.innerHTML = '<option value="">Todos os GHEs Monitorados</option>' + ghesObrig.map(g => {
        const nome = obterNomeGheCompleto(g);
        return `<option value="${g}">${escapeHTML(nome)}</option>`;
    }).join('');
}

function popularDatalistColabsAvulsosPsico() {
    const dl = document.getElementById('convocPsico_colabsList');
    if (!dl) return;

    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    dl.innerHTML = ativos.map(c => {
        const gheNome = c.ghe ? ` (GHE ${c.ghe})` : '';
        return `<option value="${escapeHTML(c.id)} — ${escapeHTML(c.nome)}">${escapeHTML(c.funcao || '')}${gheNome}</option>`;
    }).join('');
}

function aoMudarFiltroPeriodoConvocacao() {
    carregarColaboradoresTriagemPsicossocial();
}

function aoMudarFiltroStatusTriagem() {
    carregarColaboradoresTriagemPsicossocial();
}

function carregarColaboradoresTriagemPsicossocial() {
    const filtroPeriodo = document.getElementById('convocPsico_filtroPeriodo')?.value || 'mes_atual';
    const filtroStatus = document.getElementById('convocPsico_filtroStatusTriagem')?.value || 'pendentes_periodo';
    const exibirLegado = !!document.getElementById('convocPsico_chkExibirLegado')?.checked;

    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    const ghesObrigatorios = obterGhesObrigatoriosPsicossocial();
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    // Limites de data para os filtros de período
    const dFimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const ultimoDiaMesAtual = dFimMesAtual.toISOString().split('T')[0];

    const dFim60d = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
    const ultimoDia60d = dFim60d.toISOString().split('T')[0];

    const dFim90d = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
    const ultimoDia90d = dFim90d.toISOString().split('T')[0];

    // Preservar seleções anteriores feitas pelo usuário
    const selecaoAnteriorMap = new Map();
    (convocacaoPsicoLista || []).forEach(item => {
        selecaoAnteriorMap.set(item.matricula, item.selecionado);
    });

    const MARCO = DATA_IMPLANTACAO_PSICOSSOCIAL || '2026-07-01';
    const novaLista = [];

    ativos.forEach(c => {
        const g = normalizarGhe(c.ghe);
        if (!ghesObrigatorios.has(g)) return;

        const dtAdm = c.dt_admissao || c.data_admissao || '';
        const admitidoAposMarco = !!(dtAdm && dtAdm >= MARCO);
        const ehAdmissaoLegada = !admitidoAposMarco;

        const asos = (allAsoExames || []).filter(a => String(a.matricula || '').trim() === String(c.id || '').trim())
            .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));
        const ultimoAso = asos[0] || null;

        const asosPeriodicos = asos.filter(a => (a.tipo_aso || '').toLowerCase().includes('period'));
        const ultimoPeriodico = asosPeriodicos[0] || null;
        const dataUltimoPeriodico = ultimoPeriodico ? (ultimoPeriodico.data_exame || '') : '';
        const periodicoAposMarco = !!(dataUltimoPeriodico && dataUltimoPeriodico >= MARCO);

        const infoPsico = verificarExamePsicossocialRealizado(c.id, asos);
        const temPsico = infoPsico.realizado;
        const dataPsico = infoPsico.dataExame || null;
        const vencPsico = infoPsico.dataVencimento || (dataPsico ? addMeses(dataPsico, 12) : null);

        // Determinar se vence dentro da competência/período selecionado
        let venceNoPeriodo = false;
        if (!vencPsico || vencPsico <= ultimoDiaMesAtual) {
            venceNoPeriodo = true;
        } else if (filtroPeriodo === '60d' && vencPsico <= ultimoDia60d) {
            venceNoPeriodo = true;
        } else if (filtroPeriodo === '90d' && vencPsico <= ultimoDia90d) {
            venceNoPeriodo = true;
        } else if (filtroPeriodo === 'todos') {
            venceNoPeriodo = true;
        }

        let deveEntrar = false;
        let motivo = '';
        let tipoConvocacao = 'inclusao';
        let selecaoPadrao = true;

        if (!temPsico) {
            tipoConvocacao = 'inclusao';

            if (admitidoAposMarco) {
                // Admitido a partir de 01/07/2026 sem psicossocial
                motivo = '🔴 Inclusão PCMSO (Admissional)';
                if (filtroStatus === 'pendentes_periodo' || filtroStatus === 'apenas_inclusoes' || filtroStatus === 'todos') {
                    deveEntrar = true;
                    selecaoPadrao = true;
                }
            } else if (periodicoAposMarco) {
                // Periódico realizado a partir de 01/07/2026 sem psicossocial (Gleison, Jose Leandro, Luis Eduardo)
                motivo = '🔴 Pendente (Periódico realizado sem Psicossocial)';
                if (filtroStatus === 'pendentes_periodo' || filtroStatus === 'apenas_inclusoes' || filtroStatus === 'todos') {
                    deveEntrar = true;
                    selecaoPadrao = true;
                }
            } else {
                // Admitido antes de 01/07/2026 e último periódico anterior ao marco: mantido regular até o próximo periódico
                motivo = 'Inclusão PCMSO (Admissão Pré-Julho/2026 — Regular até próx. Periódico)';
                if (ehAdmissaoLegada && !exibirLegado) {
                    deveEntrar = false;
                } else {
                    if (filtroStatus === 'pendentes_periodo' || filtroStatus === 'apenas_inclusoes' || filtroStatus === 'todos') {
                        deveEntrar = true;
                        selecaoPadrao = false; // Não pré-seleciona legado a menos que solicitado
                    }
                }
            }
        } else {
            // Possui avaliação psicossocial válida registrada
            if (venceNoPeriodo) {
                tipoConvocacao = 'renovacao';
                if (vencPsico && vencPsico < hojeStr) {
                    motivo = `Renovação Periódica (🔴 Vencido em ${formatSimpleDate(vencPsico)})`;
                } else if (vencPsico) {
                    motivo = `Renovação Periódica (🟡 Vence em ${formatSimpleDate(vencPsico)})`;
                } else {
                    motivo = 'Renovação Periódica';
                }

                if (filtroStatus === 'pendentes_periodo' || filtroStatus === 'apenas_renovacoes' || filtroStatus === 'todos') {
                    deveEntrar = true;
                    selecaoPadrao = true;
                }
            } else {
                // Está em dia com validade futura
                tipoConvocacao = 'em_dia';
                motivo = `Exame em Dia (Validade: ${formatSimpleDate(vencPsico)})`;

                if (filtroStatus === 'em_dia' || filtroStatus === 'todos') {
                    deveEntrar = true;
                    selecaoPadrao = false;
                }
            }
        }

        if (deveEntrar) {
            const jaEstavaSel = selecaoAnteriorMap.has(c.id) ? selecaoAnteriorMap.get(c.id) : selecaoPadrao;
            novaLista.push({
                matricula: c.id,
                nome: c.nome || '',
                cpf: c.cpf || '',
                funcao: c.funcao || '—',
                setor: c.setor || '—',
                ghe: g,
                gheNome: obterNomeGheCompleto(g),
                dt_admissao: dtAdm,
                ehLegado: ehAdmissaoLegada,
                temPsico: temPsico,
                dataPsico: dataPsico,
                vencPsico: vencPsico,
                tipoConvocacao: tipoConvocacao,
                motivo: motivo,
                selecionado: jaEstavaSel,
                avulso: false
            });
        }
    });

    // Manter colaboradores avulsos adicionados manualmente
    (convocacaoPsicoAvulsos || []).forEach(av => {
        if (!novaLista.some(item => item.matricula === av.matricula)) {
            novaLista.push(av);
        }
    });

    // Ordenação técnica: Inclusões primeiro, depois por vencimento mais antigo, e por nome
    novaLista.sort((a, b) => {
        if (a.tipoConvocacao === 'inclusao' && b.tipoConvocacao !== 'inclusao') return -1;
        if (a.tipoConvocacao !== 'inclusao' && b.tipoConvocacao === 'inclusao') return 1;
        if (a.vencPsico && b.vencPsico && a.vencPsico !== b.vencPsico) {
            return a.vencPsico.localeCompare(b.vencPsico);
        }
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
    });

    convocacaoPsicoLista = novaLista;
    renderTabelaConvocacaoPsicossocial();
}

function renderTabelaConvocacaoPsicossocial() {
    const tbody = document.getElementById('convocPsico_tabelaCorpo');
    const msgVazia = document.getElementById('convocPsico_tabelaVazia');
    const thCheckAll = document.getElementById('convocPsico_thCheckAll');
    if (!tbody) return;

    const busca = (document.getElementById('convocPsico_buscaInput')?.value || '').toLowerCase().trim();
    const filtroGhe = document.getElementById('convocPsico_filtroGhe')?.value || '';

    const filtrados = (convocacaoPsicoLista || []).filter(c => {
        if (filtroGhe && c.ghe !== filtroGhe) return false;
        if (busca) {
            const txt = `${c.matricula} ${c.nome} ${c.cpf} ${c.funcao} ${c.setor} ${c.ghe}`.toLowerCase();
            if (!txt.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '';
        if (msgVazia) msgVazia.style.display = 'block';
        if (thCheckAll) thCheckAll.checked = false;
        atualizarContadorDinamicoConvocacao();
        return;
    }
    if (msgVazia) msgVazia.style.display = 'none';

    tbody.innerHTML = filtrados.map(c => {
        const checked = c.selecionado ? 'checked' : '';
        const vencFmt = c.vencPsico ? formatSimpleDate(c.vencPsico) : '<span style="color:var(--text-light);">—</span>';
        
        let motivoBadge = '';
        if (c.avulso) {
            motivoBadge = `<span style="background:#f3e8ff; color:#7e22ce; border:1px solid #d8b4fe; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">➕ Avulso / SESMT</span>`;
        } else if (c.tipoConvocacao === 'inclusao') {
            const rotuloInc = c.ehLegado ? '🔴 Inclusão (Legado)' : '🔴 Inclusão PCMSO';
            motivoBadge = `<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">${rotuloInc}</span>`;
        } else if (c.tipoConvocacao === 'em_dia') {
            motivoBadge = `<span style="background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🟢 Em Dia</span>`;
        } else if (c.vencPsico && c.vencPsico < new Date().toISOString().split('T')[0]) {
            motivoBadge = `<span style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🔴 Vencido (${vencFmt})</span>`;
        } else {
            motivoBadge = `<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">🟡 Renovação Periódica</span>`;
        }

        const btnAcao = `
            <div style="display:inline-flex; align-items:center; justify-content:center; gap:5px;">
                <button type="button" class="db-clear-btn" style="padding:3px 7px; font-size:11px; font-weight:700; color:#059669; border-color:#10b981; background:#ecfdf5; border-radius:6px; cursor:pointer;" onclick="abrirModalSinalizarPsicoEmDia('${escapeHTML(c.matricula)}')" title="Sinalizar que colaborador possui avaliação válida e regularizar no sistema">
                    🩺 Em Dia
                </button>
                ${c.avulso ? `<button type="button" class="db-clear-btn" style="padding:2px 6px; font-size:11px; color:var(--danger); border-color:var(--danger);" onclick="removerColaboradorAvulsoConvocacao('${escapeHTML(c.matricula)}')" title="Remover da convocação">✕</button>` : ''}
            </div>
        `;

        return `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(109,40,217,0.03)'" onmouseout="this.style.background=''">
                <td style="padding: 8px 12px; text-align: center;">
                    <input type="checkbox" class="chk-convoc-psico" value="${escapeHTML(c.matricula)}" ${checked} onchange="onCheckboxConvocacaoIndividual(this, '${escapeHTML(c.matricula)}')" style="cursor: pointer; width: 16px; height: 16px; accent-color: #6d28d9;">
                </td>
                <td style="padding: 8px 12px; font-weight: 700; color: var(--primary); text-align: center;">
                    ${escapeHTML(c.matricula)}
                </td>
                <td style="padding: 8px 12px;">
                    <strong style="color: var(--text);">${escapeHTML(c.nome)}</strong>
                    <div style="font-size: 11px; color: var(--text-light);">CPF: ${formatarCpfExibicao(c.cpf)}</div>
                </td>
                <td style="padding: 8px 12px;">
                    <span style="font-size: 11.5px; font-weight: 600; color: var(--text);">${escapeHTML(c.gheNome)}</span>
                </td>
                <td style="padding: 8px 12px; color: var(--text); font-weight: 500;">
                    ${escapeHTML(c.funcao)}
                </td>
                <td style="padding: 8px 12px;">
                    ${motivoBadge}
                </td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600;">
                    ${vencFmt}
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    ${btnAcao}
                </td>
            </tr>
        `;
    }).join('');

    if (thCheckAll) {
        const todosMarcados = filtrados.length > 0 && filtrados.every(c => c.selecionado);
        thCheckAll.checked = todosMarcados;
    }

    atualizarContadorDinamicoConvocacao();
}

// ---- Modal de Regularização Rápida: Sinalizar Avaliação em Dia ----
function abrirModalSinalizarPsicoEmDia(matricula) {
    const colab = (convocacaoPsicoLista || []).find(c => c.matricula === matricula)
        || (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    const modal = document.getElementById('modalSinalizarPsicoEmDia');
    if (!modal) return;

    const matriculaVal = colab.matricula || colab.id;
    document.getElementById('sinPsico_matricula').value = matriculaVal;
    document.getElementById('sinPsico_colabNome').textContent = `${colab.nome} (Matrícula: ${matriculaVal})`;
    document.getElementById('sinPsico_colabDetalhe').textContent = `GHE: ${colab.gheNome || colab.ghe || '—'} | Função: ${colab.funcao || '—'}`;

    // Sugestão de data: hoje ou data existente
    const hojeStr = new Date().toISOString().split('T')[0];
    document.getElementById('sinPsico_dataExame').value = colab.dataPsico || hojeStr;
    document.getElementById('sinPsico_resultado').value = 'Apto';
    document.getElementById('sinPsico_crp').value = '';
    document.getElementById('sinPsico_obs').value = 'Regularização de laudo pré-existente (SESMT)';
    document.getElementById('sinPsico_statusMsg').innerHTML = '';

    const btnConfirmar = document.getElementById('sinPsico_btnConfirmar');
    if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = '💾 Confirmar & Regularizar';
    }

    modal.style.display = 'flex';
}

function fecharModalSinalizarPsicoEmDia() {
    const modal = document.getElementById('modalSinalizarPsicoEmDia');
    if (modal) modal.style.display = 'none';
}

async function confirmarSinalizarPsicoEmDia() {
    const matricula = document.getElementById('sinPsico_matricula')?.value;
    const dataExame = document.getElementById('sinPsico_dataExame')?.value;
    const resultado = document.getElementById('sinPsico_resultado')?.value || 'Apto';
    const crp = (document.getElementById('sinPsico_crp')?.value || '').trim();
    const obs = (document.getElementById('sinPsico_obs')?.value || '').trim();
    const statusMsg = document.getElementById('sinPsico_statusMsg');
    const btnConfirmar = document.getElementById('sinPsico_btnConfirmar');

    if (!matricula || !dataExame) {
        alert('Por favor, informe a data em que a avaliação foi realizada.');
        return;
    }

    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = '⏳ Salvando...';
    }
    if (statusMsg) {
        statusMsg.innerHTML = '<span style="color:var(--primary); font-weight:700;">Gravando regularização no banco de dados...</span>';
    }

    try {
        const colab = (allEfetivo || []).find(e => e.id === matricula);
        const dataVencimento = addMeses(dataExame, 12);
        const profissionalTexto = crp ? `Psicóloga Responsável (${crp})` : 'Psicóloga Responsável';

        const itemExame = {
            nome: 'Avaliação Psicossocial',
            periodicidade: 12,
            data_vencimento: dataVencimento,
            resultado: resultado,
            profissional: profissionalTexto
        };

        const asos = (allAsoExames || []).filter(a => a.matricula === matricula)
            .sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));
        const ultimoAso = asos[0];

        if (ultimoAso) {
            let examesDetalhe = Array.isArray(ultimoAso.exames_detalhe) ? [...ultimoAso.exames_detalhe] : [];
            const idx = examesDetalhe.findIndex(e => e.nome && e.nome.toLowerCase().includes('psico'));
            if (idx >= 0) {
                examesDetalhe[idx] = { ...examesDetalhe[idx], ...itemExame };
            } else {
                examesDetalhe.push(itemExame);
            }

            const payload = {
                id: ultimoAso.id,
                matricula: ultimoAso.matricula || matricula,
                data_exame: ultimoAso.data_exame || dataExame,
                exames_detalhe: examesDetalhe,
                obs: obs ? `${ultimoAso.obs ? ultimoAso.obs + ' | ' : ''}Psicossocial regularizado em ${formatSimpleDate(dataExame)}: ${obs}` : ultimoAso.obs
            };

            await supabaseUpsert('aso_exames', [payload]);
            ultimoAso.exames_detalhe = examesDetalhe;
        } else {
            const novoAso = {
                id: `ASO_${Date.now()}_${matricula}`,
                matricula: matricula,
                nome_colaborador: colab?.nome || '',
                funcao: colab?.funcao || '',
                setor: colab?.setor || '',
                tipo_aso: 'periodico',
                data_exame: dataExame,
                data_vencimento: dataVencimento,
                resultado: resultado.toLowerCase().includes('inapto') ? 'inapto' : 'apto',
                medico_responsavel: profissionalTexto,
                obs: obs || 'Avaliação Psicossocial (PGR/PCMSO)',
                exames_detalhe: [itemExame]
            };
            await supabaseUpsert('aso_exames', [novoAso]);
            allAsoExames.push(novoAso);
        }

        // Tentar gravar também na tabela auxiliar avaliacoes_psicossociais se existir
        try {
            await supabaseUpsert('avaliacoes_psicossociais', [{
                id: `AVAL_PSICO_${matricula}_${dataExame}`,
                matricula: matricula,
                data_avaliacao: dataExame,
                data_vencimento: dataVencimento,
                resultado: resultado,
                parecer: resultado,
                profissional: profissionalTexto,
                observacoes: obs || 'Regularização de laudo pré-existente (SESMT)',
                atualizado_em: new Date().toISOString()
            }]);
        } catch (ePsico) {
            console.warn('Registro em avaliacoes_psicossociais dispensado:', ePsico);
        }

        // Atualizar imediatamente a linha correspondente na lista de convocação
        const colabConvoc = (convocacaoPsicoLista || []).find(c => c.matricula === matricula);
        if (colabConvoc) {
            colabConvoc.temPsico = true;
            colabConvoc.dataPsico = dataExame;
            colabConvoc.vencPsico = dataVencimento;
            colabConvoc.tipoConvocacao = 'em_dia';
            colabConvoc.motivo = `Regularizado em Dia (Validade: ${formatSimpleDate(dataVencimento)})`;
            colabConvoc.selecionado = false; // Desmarcar pois acabou de ser regularizado
        }

        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color:var(--success); font-weight:700;">✅ Regularizado com sucesso! Validade anual estendida até ${formatSimpleDate(dataVencimento)}.</span>`;
        }

        setTimeout(() => {
            fecharModalSinalizarPsicoEmDia();
            renderTabelaConvocacaoPsicossocial();
            atualizarContadorDinamicoConvocacao();
            if (typeof renderRecomendacaoPsicossocial === 'function') renderRecomendacaoPsicossocial();
            if (typeof renderSaudePanel === 'function') renderSaudePanel();
        }, 700);

    } catch (err) {
        console.error('Erro ao salvar regularização psicossocial:', err);
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = '💾 Confirmar & Regularizar';
        }
        if (statusMsg) {
            statusMsg.innerHTML = `<span style="color:var(--danger); font-weight:700;">❌ Falha ao salvar: ${err.message}</span>`;
        }
    }
}

function onCheckboxConvocacaoIndividual(chk, matricula) {
    const item = (convocacaoPsicoLista || []).find(c => c.matricula === matricula);
    if (item) {
        item.selecionado = chk.checked;
    }
    atualizarContadorDinamicoConvocacao();

    const thCheckAll = document.getElementById('convocPsico_thCheckAll');
    if (thCheckAll) {
        const todosMarcados = convocacaoPsicoLista.length > 0 && convocacaoPsicoLista.every(c => c.selecionado);
        thCheckAll.checked = todosMarcados;
    }
}

function marcarTodosConvocacaoPsico(marcar) {
    const busca = (document.getElementById('convocPsico_buscaInput')?.value || '').toLowerCase().trim();
    const filtroGhe = document.getElementById('convocPsico_filtroGhe')?.value || '';

    (convocacaoPsicoLista || []).forEach(c => {
        let visivel = true;
        if (filtroGhe && c.ghe !== filtroGhe) visivel = false;
        if (busca) {
            const txt = `${c.matricula} ${c.nome} ${c.cpf} ${c.funcao} ${c.setor} ${c.ghe}`.toLowerCase();
            if (!txt.includes(busca)) visivel = false;
        }
        if (visivel) {
            c.selecionado = marcar;
        }
    });

    renderTabelaConvocacaoPsicossocial();
}

function selecionarLimiteVagasConvocacaoPsico(limite = 20) {
    let count = 0;
    (convocacaoPsicoLista || []).forEach(c => {
        if (count < limite) {
            c.selecionado = true;
            count++;
        } else {
            c.selecionado = false;
        }
    });
    renderTabelaConvocacaoPsicossocial();
    atualizarContadorDinamicoConvocacao();
}
window.selecionarLimiteVagasConvocacaoPsico = selecionarLimiteVagasConvocacaoPsico;

function atualizarContadorDinamicoConvocacao() {
    const el = document.getElementById('convocPsico_contadorDinamico');
    if (!el) return;

    const selecionados = (convocacaoPsicoLista || []).filter(c => c.selecionado);
    const total = selecionados.length;
    const inclusoes = selecionados.filter(c => c.tipoConvocacao === 'inclusao').length;
    const renovacoes = selecionados.filter(c => c.tipoConvocacao !== 'inclusao').length;
    const meta = typeof obterCapacidadeMutiraoPsico === 'function' ? obterCapacidadeMutiraoPsico() : 20;

    let badgeCapacidade = '';
    if (total > meta) {
        badgeCapacidade = `<span style="background:#fef3c7; color:#92400e; font-size:11px; padding:2px 8px; border-radius:999px; margin-left:6px; font-weight:700; border:1px solid #fde68a;">⚠️ ${total} selecionados (acima da capacidade diária de ${meta})</span>`;
    } else if (total >= 18 && total <= meta) {
        badgeCapacidade = `<span style="background:#d1fae5; color:#065f46; font-size:11px; padding:2px 8px; border-radius:999px; margin-left:6px; font-weight:700; border:1px solid #a7f3d0;">🎯 Capacidade ideal (${total} de ${meta} vagas)</span>`;
    }

    el.innerHTML = `<strong>${total}</strong> de <strong>${meta} vagas sugeridas</strong> (${inclusoes} inclusões/pendências + ${renovacoes} renovações)${badgeCapacidade}`;
}

function alternarPainelAdicionarAvulsoPsico(forcar) {
    const painel = document.getElementById('convocPsico_painelAvulso');
    if (!painel) return;
    if (typeof forcar === 'boolean') {
        painel.style.display = forcar ? 'block' : 'none';
    } else {
        painel.style.display = painel.style.display === 'none' ? 'block' : 'none';
    }
    if (painel.style.display === 'block') {
        document.getElementById('convocPsico_inputAvulso')?.focus();
    }
}

function adicionarColaboradorAvulsoConvocacao() {
    const input = document.getElementById('convocPsico_inputAvulso');
    const valor = (input?.value || '').trim();
    if (!valor) {
        alert('Por favor, informe a matrícula ou nome do colaborador ativo.');
        return;
    }

    const matriculaMatch = valor.split('—')[0].trim();
    const colab = (allEfetivo || []).find(e => e.id === matriculaMatch || e.id === valor || (e.nome && e.nome.toLowerCase() === valor.toLowerCase()));

    if (!colab) {
        alert('Colaborador não encontrado no efetivo ativo. Verifique a matrícula ou selecione na lista.');
        return;
    }

    const existente = convocacaoPsicoLista.find(c => c.matricula === colab.id);
    if (existente) {
        existente.selecionado = true;
        renderTabelaConvocacaoPsicossocial();
        alternarPainelAdicionarAvulsoPsico(false);
        if (input) input.value = '';
        alert(`O colaborador ${colab.nome} (Matrícula ${colab.id}) já estava na grade e foi marcado como selecionado!`);
        return;
    }

    const g = normalizarGhe(colab.ghe);
    const novoAvulso = {
        matricula: colab.id,
        nome: colab.nome || '',
        cpf: colab.cpf || '',
        funcao: colab.funcao || '—',
        setor: colab.setor || '—',
        ghe: g,
        gheNome: obterNomeGheCompleto(g),
        temPsico: false,
        dataPsico: null,
        vencPsico: null,
        tipoConvocacao: 'avulso',
        motivo: 'Convocação Avulsa / SESMT',
        selecionado: true,
        avulso: true
    };

    convocacaoPsicoAvulsos.push(novoAvulso);
    convocacaoPsicoLista.unshift(novoAvulso);

    if (input) input.value = '';
    alternarPainelAdicionarAvulsoPsico(false);
    renderTabelaConvocacaoPsicossocial();
}

function removerColaboradorAvulsoConvocacao(matricula) {
    convocacaoPsicoAvulsos = (convocacaoPsicoAvulsos || []).filter(c => c.matricula !== matricula);
    convocacaoPsicoLista = (convocacaoPsicoLista || []).filter(c => c.matricula !== matricula);
    renderTabelaConvocacaoPsicossocial();
}

function gerarListaOficialConvocacaoPsicossocial() {
    const selecionados = (convocacaoPsicoLista || []).filter(c => c.selecionado);
    if (selecionados.length === 0) {
        alert('Por favor, selecione ao menos um colaborador antes de gerar a lista oficial.');
        return;
    }

    const inputData = document.getElementById('convocPsico_dataAtendimento');
    const dataAtendimentoStr = inputData?.value || new Date().toISOString().split('T')[0];
    const dataAtendimentoFmt = formatSimpleDate(dataAtendimentoStr);

    const hoje = new Date();
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const competenciaFmt = `${nomesMeses[hoje.getMonth()]} / ${hoje.getFullYear()}`;

    const totalInclusoes = selecionados.filter(c => c.tipoConvocacao === 'inclusao').length;
    const totalRenovacoes = selecionados.filter(c => c.tipoConvocacao !== 'inclusao').length;

    const logoCop = (typeof LOGO_COP_BASE64 !== 'undefined' && LOGO_COP_BASE64) ? LOGO_COP_BASE64 : '';

    // Ordenação estritamente alfabética pelo nome completo
    const convocadosOrdenados = [...selecionados].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    const linhasHtml = convocadosOrdenados.map((c, idx) => {
        let motivoTexto = c.motivo;
        if (c.avulso) {
            motivoTexto = 'Convocação Avulsa (SESMT)';
        } else if (c.tipoConvocacao === 'inclusao') {
            motivoTexto = 'Inclusão PCMSO (Implantação do Programa)';
        } else if (c.vencPsico) {
            motivoTexto = `Renovação Periódica (Venc: ${formatSimpleDate(c.vencPsico)})`;
        }

        return `
            <tr>
                <td style="text-align: center; font-weight: 700; width: 28px;">${idx + 1}</td>
                <td style="text-align: center; font-weight: 700; width: 48px;">${escapeHTML(c.matricula)}</td>
                <td style="width: 200px;">
                    <div style="font-weight: 700; font-size: 10px;">${escapeHTML(c.nome)}</div>
                    <div style="font-size: 8.5px; color: #444;">CPF: ${formatarCpfExibicao(c.cpf)}</div>
                </td>
                <td style="width: 145px; font-size: 9.5px;">${escapeHTML(c.gheNome)}</td>
                <td style="width: 140px; font-size: 9.5px;">${escapeHTML(c.funcao)}</td>
                <td style="width: 130px; font-size: 9px;">${escapeHTML(motivoTexto)}</td>
                <td style="min-width: 160px; height: 38px; border-bottom: 1px solid #333; padding: 0;">&nbsp;</td>
                <td style="width: 75px; text-align: center; font-size: 9px; line-height: 1.4;">
                    <div>[ &nbsp; ] Apto</div>
                    <div>[ &nbsp; ] Inapto</div>
                </td>
                <td style="width: 85px; border-bottom: 1px solid #333; padding: 0;">&nbsp;</td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Lista de Convocação Oficial — Avaliação Psicossocial (${dataAtendimentoFmt})</title>
    <style>
        @page { size: landscape; margin: 8mm 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 10px; background: #fff; }
        .cabecalho { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 8px; }
        .cabecalho img { max-height: 48px; max-width: 120px; object-fit: contain; }
        .titulo-doc { text-align: center; flex: 1; padding: 0 10px; }
        .titulo-doc h2 { margin: 0; font-size: 13.5px; font-weight: 800; text-transform: uppercase; color: #000; letter-spacing: 0.3px; }
        .titulo-doc .subtitulo { margin: 3px 0 0; font-size: 10.5px; font-weight: 700; color: #222; text-transform: uppercase; }
        .titulo-doc .normas { margin: 2px 0 0; font-size: 9.5px; color: #444; }
        .info-consorcio { text-align: right; font-size: 9px; color: #333; line-height: 1.3; }
        .info-bar { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; margin-bottom: 8px; font-size: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; }
        th, td { border: 1px solid #333; padding: 5px 6px; }
        th { background: #f1f5f9; font-weight: 700; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.2px; }
        .rodape-assinaturas { margin-top: 26px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; page-break-inside: avoid; }
        .linha-assinatura { border-top: 1px solid #111; padding-top: 6px; font-size: 9.5px; line-height: 1.35; }
        .no-print { text-align: center; margin-bottom: 12px; }
        .no-print button { padding: 9px 22px; font-size: 13px; font-weight: 700; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
        @media print {
            .no-print { display: none; }
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir Lista Oficial para o Atendimento / Mutirão</button>
    </div>

    <div class="cabecalho">
        <img src="${logoCop}" alt="Consórcio COP">
        <div class="titulo-doc">
            <h2>LISTA DE CONVOCAÇÃO & REGISTRO DE ATENDIMENTO — AVALIAÇÃO PSICOSSOCIAL</h2>
            <div class="subtitulo">PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL (PCMSO) &amp; PGR</div>
            <div class="normas">Mandatória para Atividades de Riscos Críticos — NR-01, NR-33 (Espaço Confinado), NR-35 (Trabalho em Altura) e NR-10 (Elétrica)</div>
        </div>
        <div class="info-consorcio">
            <strong>Consórcio COP</strong><br>
            PISF Ramal do Agreste<br>
            SESMT Corporativo
        </div>
    </div>

    <div class="info-bar">
        <div><strong>Data Prevista para os Atendimentos:</strong> ${dataAtendimentoFmt}</div>
        <div><strong>Competência:</strong> ${competenciaFmt}</div>
        <div><strong>Total de Convocados:</strong> <strong>${convocadosOrdenados.length} colaboradores</strong> (${totalInclusoes} inclusões do programa + ${totalRenovacoes} renovações periódicas)</div>
        <div><strong>Local:</strong> Ambulatório / Canteiro de Obras Ramal do Agreste</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 28px; text-align: center;">Item</th>
                <th style="width: 48px; text-align: center;">Matr.</th>
                <th>Colaborador / CPF</th>
                <th>GHE / Frente de Serviço</th>
                <th>Função Contratual</th>
                <th>Motivo Convocação</th>
                <th style="text-align: center;">Assinatura do Empregado</th>
                <th style="text-align: center;">Parecer</th>
                <th style="text-align: center;">Rubrica CRP</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml}
        </tbody>
    </table>

    <div class="rodape-assinaturas">
        <div class="linha-assinatura">
            <strong>João Everton de Souza Limeira</strong><br>
            Engenheiro de Segurança do Trabalho<br>
            CREA 12345/D-PE — Consórcio COP
        </div>
        <div class="linha-assinatura">
            <strong>Amanda Freire dos Santos</strong><br>
            Técnica de Enfermagem do Trabalho<br>
            Ambulatório — Consórcio COP
        </div>
        <div class="linha-assinatura">
            <strong>Psicólogo(a) Responsável</strong><br>
            Avaliação Psicossocial (NR-33 / NR-35 / NR-10)<br>
            CRP: ____________________
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, 'Convocacao_Psicossocial_COP');
}

// Exportações explícitas no window para garantia de funcionamento em onclick
window.gerarListaOficialConvocacaoPsicossocial = gerarListaOficialConvocacaoPsicossocial;
window.abrirModalConvocacaoPsicossocial = abrirModalConvocacaoPsicossocial;
window.fecharModalConvocacaoPsicossocial = fecharModalConvocacaoPsicossocial;
window.marcarTodosConvocacaoPsico = marcarTodosConvocacaoPsico;
window.onCheckboxConvocacaoIndividual = onCheckboxConvocacaoIndividual;
window.abrirModalSinalizarPsicoEmDia = abrirModalSinalizarPsicoEmDia;
window.fecharModalSinalizarPsicoEmDia = fecharModalSinalizarPsicoEmDia;
window.confirmarSinalizarPsicoEmDia = confirmarSinalizarPsicoEmDia;
window.alternarPainelAdicionarAvulsoPsico = alternarPainelAdicionarAvulsoPsico;
window.adicionarColaboradorAvulsoConvocacao = adicionarColaboradorAvulsoConvocacao;
window.removerColaboradorAvulsoConvocacao = removerColaboradorAvulsoConvocacao;
window.abrirModalReprogramarDataMutirao = abrirModalReprogramarDataMutirao;
window.fecharModalReprogramarDataMutirao = fecharModalReprogramarDataMutirao;
window.salvarReprogramacaoDataMutirao = salvarReprogramacaoDataMutirao;
window.abrirModalBaixaLoteMutirao = abrirModalBaixaLoteMutirao;
window.fecharModalBaixaLoteMutirao = fecharModalBaixaLoteMutirao;
window.marcarTodosBaixaLote = marcarTodosBaixaLote;
window.marcarSomentePendentesBaixaLote = marcarSomentePendentesBaixaLote;
window.salvarBaixaLoteMutirao = salvarBaixaLoteMutirao;
window.renderRecomendacaoPsicossocial = renderRecomendacaoPsicossocial;
window.renderTabelaRecomendacaoPsicossocial = renderTabelaRecomendacaoPsicossocial;
window.filtrarStatusPsicossocial = filtrarStatusPsicossocial;
window.aoMudarFiltroPeriodoConvocacao = aoMudarFiltroPeriodoConvocacao;
window.aoMudarFiltroStatusTriagem = aoMudarFiltroStatusTriagem;
window.filtrarTabelaConvocacaoPsicossocial = renderTabelaConvocacaoPsicossocial;

function showSaudeSubtab(tab) {
    ['visao', 'aso', 'atestado', 'pressao', 'previsao', 'recomendacoes', 'relatorio'].forEach(t => {
        const content = document.getElementById('saudeSubtab-' + t);
        const btn = document.getElementById('saudeSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    popularSaudeColabDatalists();
    if (tab === 'visao') renderSaudePanel();
    if (tab === 'aso') { renderAsoResumo(); filterAsoLista(document.getElementById('asoSearchInput')?.value || ''); }
    if (tab === 'atestado') { renderAtestadoResumo(); filterAtestadoLista(document.getElementById('atestadoSearchInput')?.value || ''); }
    if (tab === 'pressao') { renderPressaoResumo(); filterPressaoLista(document.getElementById('pressaoSearchInput')?.value || ''); }
    if (tab === 'previsao') renderPrevisaoExames();
    if (tab === 'recomendacoes') renderRecomendacaoPsicossocial();
    // A aba de Relatório usa os mesmos números já calculados pela Visão Geral
    // (window.saudeReportData) - por isso, ao abrir ela, força um recálculo da Visão Geral
    // (com o período que já estava selecionado) pra garantir que o relatório nunca fique
    // com números desatualizados, mesmo que o usuário nunca tenha clicado em "Visão Geral".
    if (tab === 'relatorio') { renderSaudePanel(); renderSaudeRelatorioChecklist(); }
}

// ============================================
// RELATÓRIO CONFIGURÁVEL DE SAÚDE OCUPACIONAL - o usuário escolhe (via checkbox) quais
// KPIs/gráficos/lista entram no relatório antes de gerar, pra poder tirar informação
// sensível (ex: ASO Vencidos, ou a lista com nome de quem está vencido) quando o relatório
// vai pra fiscalização, e manter tudo quando é só uso interno. Os números vêm de
// window.saudeReportData, preenchido no fim de renderSaudePanel() - nunca recalcula nada
// aqui, só lê o que já está na tela.
// ============================================

function renderSaudeRelatorioChecklist() {
    const el = document.getElementById('saudeRelPeriodo');
    if (el && window.saudeReportData) el.textContent = window.saudeReportData.periodoLabel || '—';
}

function marcarTodosRelatorioSaude(valor) {
    ['relSaudeChk_asoVencidos', 'relSaudeChk_asoVencendo', 'relSaudeChk_asoEmDia', 'relSaudeChk_asoSemRegistro', 'relSaudeChk_absenteismo',
     'relSaudeChk_graficoStatusAso', 'relSaudeChk_graficoExamesTipo', 'relSaudeChk_graficoAbsenteismoMes', 'relSaudeChk_listaPendencias'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.checked = valor;
    });
}

function lerSelecaoRelatorioSaude() {
    return {
        asoVencidos: document.getElementById('relSaudeChk_asoVencidos').checked,
        asoVencendo: document.getElementById('relSaudeChk_asoVencendo').checked,
        asoEmDia: document.getElementById('relSaudeChk_asoEmDia').checked,
        asoSemRegistro: document.getElementById('relSaudeChk_asoSemRegistro').checked,
        absenteismo: document.getElementById('relSaudeChk_absenteismo').checked,
        graficoStatusAso: document.getElementById('relSaudeChk_graficoStatusAso').checked,
        graficoExamesTipo: document.getElementById('relSaudeChk_graficoExamesTipo').checked,
        graficoAbsenteismoMes: document.getElementById('relSaudeChk_graficoAbsenteismoMes').checked,
        listaPendencias: document.getElementById('relSaudeChk_listaPendencias').checked
    };
}

async function gerarExcelSaude() {
    const statusEl = document.getElementById('relatorioSaudeStatus');
    const dados = window.saudeReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioSaude();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [];
    aoa.push([`RELATÓRIO DE SAÚDE OCUPACIONAL — ${dados.periodoLabel}`]);
    aoa.push([`Gerado em ${new Date().toLocaleDateString('pt-BR')}`]);
    aoa.push([]);

    const kpisMarcados = dados.kpis.filter(k => marcados[k.key]);
    if (kpisMarcados.length > 0) {
        aoa.push(['INDICADORES (KPIs)']);
        aoa.push(['Indicador', 'Valor']);
        kpisMarcados.forEach(k => aoa.push([k.label, k.value]));
        aoa.push([]);
    }

    Object.entries(dados.graficos).forEach(([key, g]) => {
        if (!marcados[key]) return;
        aoa.push([g.titulo.toUpperCase()]);
        aoa.push(['Categoria', 'Valor']);
        g.labels.forEach((label, i) => aoa.push([label, g.valores[i]]));
        aoa.push([]);
    });

    if (marcados.listaPendencias) {
        aoa.push(['COLABORADORES COM ASO VENCIDO, VENCENDO OU SEM REGISTRO']);
        aoa.push(['Nome', 'Setor', 'Situação', 'Detalhe']);
        if (dados.listaPendencias.length === 0) {
            aoa.push(['Nenhum colaborador nessa situação', '', '', '']);
        } else {
            dados.listaPendencias.forEach(p => aoa.push([p.nome, p.setor, p.situacao, p.detalhe]));
        }
        aoa.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 16 }, { wch: 34 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SAUDE OCUPACIONAL');

    const dataSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RELATORIO_SAUDE_OCUPACIONAL_${dataSlug}.xlsx`);

    statusEl.textContent = `✅ Excel gerado com ${Object.values(marcados).filter(Boolean).length} item(ns) selecionado(s).`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfSaude() {
    const statusEl = document.getElementById('relatorioSaudeStatus');
    const dados = window.saudeReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioSaude();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const kpisMarcados = dados.kpis.filter(k => marcados[k.key]);
    const kpisHtml = kpisMarcados.length === 0 ? '' : `
    <h3>Indicadores (KPIs)</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
        <tbody>${kpisMarcados.map(k => `<tr><td style="text-align:left;">${escapeHTML(k.label)}</td><td>${escapeHTML(String(k.value))}</td></tr>`).join('')}</tbody>
    </table>`;

    const graficosHtml = Object.entries(dados.graficos).filter(([key]) => marcados[key]).map(([key, g]) => `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td><td>${escapeHTML(String(g.valores[i]))}</td></tr>`).join('')}</tbody>
    </table>`).join('');

    const listaHtml = !marcados.listaPendencias ? '' : `
    <h3>Colaboradores com ASO Vencido, Vencendo ou Sem Registro</h3>
    <p style="font-size:10px; color:#a00; margin-bottom:6px;">⚠️ Esta seção contém nomes de colaboradores — avalie antes de enviar a órgãos externos.</p>
    <table style="width:100%; margin-bottom:14px;">
        <thead><tr><th>Nome</th><th>Setor</th><th>Situação</th><th>Detalhe</th></tr></thead>
        <tbody>${dados.listaPendencias.length === 0
            ? '<tr><td colspan="4">Nenhum colaborador nessa situação</td></tr>'
            : dados.listaPendencias.map(p => `<tr><td style="text-align:left;">${escapeHTML(p.nome)}</td><td>${escapeHTML(p.setor)}</td><td>${escapeHTML(p.situacao)}</td><td style="text-align:left;">${escapeHTML(p.detalhe)}</td></tr>`).join('')}</tbody>
    </table>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Saúde Ocupacional</title>
<style>
    @page { size: portrait; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:14px; text-align:center; flex:1; }
    .info-geracao { font-size:11px; color:#444; margin-bottom:10px; }
    h3 { font-size:12px; margin:18px 0 6px; }
    table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:10px; }
    th, td { border:1px solid #999; padding:5px 6px; text-align:center; }
    th { background:#d9d9d9; font-weight:700; }
    tbody tr:nth-child(even) { background:#f7f7f7; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    @media print { .no-print { display:none; } body { margin:0; } thead { display: table-header-group; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo">RELATÓRIO DE SAÚDE OCUPACIONAL</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Período: ${escapeHTML(dados.periodoLabel)} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    ${kpisHtml}
    ${graficosHtml}
    ${listaHtml}
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// ---- CRUD: Exames ASO ----

function renderAsoResumo() {
    const el = document.getElementById('asoResumo');
    if (el) el.textContent = `${allAsoExames.length} exame(s) registrado(s)`;
}

function filterAsoLista(query) {
    const resultsEl = document.getElementById('asoSearchResults');
    if (!resultsEl) return;
    const q = (query || '').trim().toLowerCase();
    let lista = allAsoExames.slice();
    if (q.length >= 2) {
        lista = lista.filter(a => (a.matricula || '').toLowerCase().includes(q) || (a.nome_colaborador || '').toLowerCase().includes(q));
    }
    lista.sort((a, b) => (b.data_exame || '').localeCompare(a.data_exame || ''));

    if (lista.length === 0) {
        resultsEl.innerHTML = '<div class="db-list-empty">Nenhum exame encontrado</div>';
        return;
    }
    resultsEl.innerHTML = lista.map(a => `
        <div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px; cursor:pointer;" onclick="abrirFormAso('${escapeHTML(a.id)}')">
                <div class="db-list-item-title">${escapeHTML(a.nome_colaborador || 'Não identificado')} — ${escapeHTML(ASO_TIPO_LABELS[a.tipo_aso] || a.tipo_aso || '—')}</div>
                <div class="db-list-item-sub">${formatSimpleDate(a.data_exame)}${a.data_vencimento ? ' — vence ' + formatSimpleDate(a.data_vencimento) : ' — sem vencimento definido'}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11.5px;" onclick="event.stopPropagation(); abrirAnexoModal('aso_exames', '${escapeHTML(a.id)}', 'ASO / Ficha Clínica — ${escapeHTML(a.nome_colaborador || a.matricula)}')">📎 Ficha / ASO${labelContagemAnexos('aso_exames', a.id)}</button>
            </div>
        </div>
    `).join('');
}

function limparBuscaAso() {
    const input = document.getElementById('asoSearchInput');
    if (input) { input.value = ''; input.focus(); }
    filterAsoLista('');
}

function abrirFormAso(id) {
    const form = document.getElementById('asoFormCard');
    const title = document.getElementById('asoFormTitle');
    const btnExcluir = document.getElementById('asoForm_btnExcluir');
    document.getElementById('asoFormStatus').textContent = '';
    document.getElementById('asoForm_colabPreview').textContent = '';
    document.getElementById('asoForm_examesExigidos').innerHTML = '';
    popularSaudeColabDatalists();

    if (id) {
        const a = allAsoExames.find(x => x.id === id);
        if (!a) return;
        title.textContent = '✏️ Editar Exame ASO';
        form.dataset.editId = id;
        document.getElementById('asoForm_matricula').value = a.matricula ? `${a.matricula} - ${a.nome_colaborador || ''}` : (a.nome_colaborador || '');
        onAsoColaboradorChange();
        aplicarExamesDetalheAoForm(a.exames_detalhe);
        document.getElementById('asoForm_tipo').value = a.tipo_aso || '';
        document.getElementById('asoForm_dataExame').value = a.data_exame || '';
        document.getElementById('asoForm_dataVencimento').value = a.data_vencimento || '';
        document.getElementById('asoForm_resultado').value = a.resultado || '';
        document.getElementById('asoForm_medico').value = a.medico_responsavel || '';
        document.getElementById('asoForm_obs').value = a.obs || '';
        btnExcluir.style.display = 'inline-block';
        const btnAnexos = document.getElementById('asoForm_btnAnexos');
        if (btnAnexos) {
            btnAnexos.style.display = 'inline-block';
            btnAnexos.textContent = `📎 Anexar Ficha Clínica / ASO${labelContagemAnexos('aso_exames', id)}`;
        }
    } else {
        title.textContent = '🩺 Novo Exame ASO';
        delete form.dataset.editId;
        document.getElementById('asoForm_matricula').value = '';
        document.getElementById('asoForm_tipo').value = '';
        document.getElementById('asoForm_dataExame').value = new Date().toISOString().split('T')[0];
        document.getElementById('asoForm_dataVencimento').value = '';
        document.getElementById('asoForm_resultado').value = '';
        document.getElementById('asoForm_medico').value = '';
        document.getElementById('asoForm_obs').value = '';
        btnExcluir.style.display = 'none';
        const btnAnexos = document.getElementById('asoForm_btnAnexos');
        if (btnAnexos) btnAnexos.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormAso() {
    document.getElementById('asoFormCard').style.display = 'none';
}

async function salvarAso() {
    const statusEl = document.getElementById('asoFormStatus');
    const data = document.getElementById('asoForm_dataExame').value;
    const tipo = document.getElementById('asoForm_tipo').value;

    if (!data || !tipo) {
        statusEl.textContent = '❌ Data do exame e tipo são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const { matricula, colab } = buscarColaboradorPorInput('asoForm_matricula');
    if (!colab) {
        statusEl.textContent = '❌ Colaborador não encontrado. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const form = document.getElementById('asoFormCard');
    const editId = form.dataset.editId;
    const id = editId || ('ASO_' + Date.now());

    // Um registro por exame efetivamente marcado nesta consulta, cada um com SEU PRÓPRIO
    // vencimento (data_exame + periodicidade daquele exame específico) - é isso que permite
    // a Previsão de Exames saber com certeza quando cada exame vence, em vez de assumir que
    // tudo vence junto com o ciclo de 12 meses da Avaliação clínica.
    const examesDetalhe = Array.from(document.querySelectorAll('#asoForm_examesExigidos .asoExameCheckbox'))
        .filter(cb => cb.checked)
        .map(cb => {
            const periodicidade = cb.dataset.periodicidade ? parseInt(cb.dataset.periodicidade, 10) : null;
            return {
                nome: cb.dataset.nome,
                periodicidade,
                data_vencimento: periodicidade ? addMeses(data, periodicidade) : null
            };
        });

    const row = {
        id,
        matricula,
        nome_colaborador: colab.nome || null,
        funcao: colab.funcao || null,
        setor: colab.setor || null,
        tipo_aso: tipo,
        data_exame: data,
        data_vencimento: document.getElementById('asoForm_dataVencimento').value || null,
        resultado: document.getElementById('asoForm_resultado').value || null,
        medico_responsavel: document.getElementById('asoForm_medico').value.trim() || null,
        obs: document.getElementById('asoForm_obs').value.trim() || null,
        exames_detalhe: examesDetalhe.length > 0 ? examesDetalhe : null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('aso_exames', [row]);
        const idx = allAsoExames.findIndex(a => a.id === id);
        if (idx >= 0) allAsoExames[idx] = { ...allAsoExames[idx], ...row };
        else allAsoExames.push(row);

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormAso(); showSaudeSubtab('aso'); }, 900);
    } catch (err) {
        console.error('Erro ao salvar exame ASO:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirAsoAtual() {
    const form = document.getElementById('asoFormCard');
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm('Excluir este exame ASO? Essa ação não pode ser desfeita.')) return;

    const statusEl = document.getElementById('asoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('aso_exames', id);
        allAsoExames = allAsoExames.filter(a => a.id !== id);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormAso(); showSaudeSubtab('aso'); }, 900);
    } catch (err) {
        console.error('Erro ao excluir exame ASO:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- CRUD: Aferições de Pressão Arterial ----
// Classificação de referência (adulto, aferição de triagem/acompanhamento ocupacional -
// não substitui avaliação clínica do PCMSO). Usa o maior dos dois valores (sistólica ou
// diastólica) pra definir o nível. Mesma paleta de cores já usada na Matriz de Risco da
// APR (nivelRiscoApr), pra manter a linguagem visual consistente em todo o painel.
function classificarPressaoArterial(sistolica, diastolica) {
    if (sistolica == null || diastolica == null || isNaN(sistolica) || isNaN(diastolica)) {
        return { nivel: '—', cor: 'var(--text-light)', bg: 'transparent' };
    }
    if (sistolica >= 180 || diastolica >= 120) return { nivel: 'Crise Hipertensiva', cor: '#c0392b', bg: '#fdf2f2' };
    if (sistolica >= 140 || diastolica >= 90) return { nivel: 'Hipertensão Estágio 2', cor: '#c2650a', bg: '#fef1e0' };
    if (sistolica >= 130 || diastolica >= 80) return { nivel: 'Hipertensão Estágio 1', cor: '#b78a00', bg: '#fff9e6' };
    if (sistolica >= 120) return { nivel: 'Elevada', cor: '#b78a00', bg: '#fff9e6' };
    return { nivel: 'Normal', cor: '#1a7f4b', bg: '#e6f7ee' };
}

function renderPressaoResumo() {
    const el = document.getElementById('pressaoResumo');
    if (!el) return;
    const total = allPressaoArterial.length;
    const alteradas = allPressaoArterial.filter(p => {
        const c = classificarPressaoArterial(p.pressao_sistolica, p.pressao_diastolica);
        return c.nivel !== 'Normal' && c.nivel !== '—';
    }).length;
    el.textContent = `${total} aferição(ões) registrada(s)${alteradas > 0 ? ` — ${alteradas} com pressão alterada (recomenda-se encaminhar ao médico do trabalho / PCMSO)` : ''}`;
}

function filterPressaoLista(query) {
    const resultsEl = document.getElementById('pressaoSearchResults');
    if (!resultsEl) return;
    const q = (query || '').trim().toLowerCase();
    let lista = allPressaoArterial.slice();
    if (q.length >= 2) {
        lista = lista.filter(p => (p.matricula || '').toLowerCase().includes(q) || (p.nome_colaborador || '').toLowerCase().includes(q));
    }
    lista.sort((a, b) => (b.data_afericao || '').localeCompare(a.data_afericao || ''));

    if (lista.length === 0) {
        resultsEl.innerHTML = '<div class="db-list-empty">Nenhuma aferição encontrada</div>';
        return;
    }
    resultsEl.innerHTML = lista.map(p => {
        const c = classificarPressaoArterial(p.pressao_sistolica, p.pressao_diastolica);
        return `
        <div class="db-list-item" style="cursor:pointer;" onclick="abrirFormPressao('${escapeHTML(p.id)}')">
            <div class="db-list-item-title">${escapeHTML(p.nome_colaborador || 'Não identificado')} — ${p.pressao_sistolica ?? '—'}/${p.pressao_diastolica ?? '—'} mmHg
                <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:10px; margin-left:6px; color:${c.cor}; background:${c.bg};">${escapeHTML(c.nivel)}</span>
            </div>
            <div class="db-list-item-sub">${formatSimpleDate(p.data_afericao)}${p.hora_afericao ? ' às ' + escapeHTML(p.hora_afericao) : ''}${p.responsavel_afericao ? ' — aferido por ' + escapeHTML(p.responsavel_afericao) : ''}</div>
        </div>`;
    }).join('');
}

function limparBuscaPressao() {
    const input = document.getElementById('pressaoSearchInput');
    if (input) { input.value = ''; input.focus(); }
    filterPressaoLista('');
}

function onPressaoColaboradorChange() {
    const { colab } = buscarColaboradorPorInput('pressaoForm_matricula');
    document.getElementById('pressaoForm_colabPreview').textContent = colab ? `✓ ${colab.nome} — ${colab.funcao || ''} — ${colab.setor || ''}` : '';
}

function atualizarPreviewClassificacaoPressao() {
    const el = document.getElementById('pressaoForm_classificacaoPreview');
    if (!el) return;
    const sistolica = parseInt(document.getElementById('pressaoForm_sistolica').value, 10);
    const diastolica = parseInt(document.getElementById('pressaoForm_diastolica').value, 10);
    const c = classificarPressaoArterial(sistolica, diastolica);
    if (c.nivel === '—') { el.innerHTML = ''; return; }
    el.innerHTML = `Classificação: <span style="font-weight:700; padding:2px 8px; border-radius:10px; color:${c.cor}; background:${c.bg};">${escapeHTML(c.nivel)}</span>${c.nivel !== 'Normal' ? ' — recomenda-se encaminhar ao médico do trabalho / PCMSO' : ''}`;
}

function abrirFormPressao(id) {
    const form = document.getElementById('pressaoFormCard');
    const title = document.getElementById('pressaoFormTitle');
    const btnExcluir = document.getElementById('pressaoForm_btnExcluir');
    document.getElementById('pressaoFormStatus').textContent = '';
    document.getElementById('pressaoForm_colabPreview').textContent = '';
    document.getElementById('pressaoForm_classificacaoPreview').innerHTML = '';
    popularSaudeColabDatalists();

    if (id) {
        const p = allPressaoArterial.find(x => x.id === id);
        if (!p) return;
        title.textContent = '✏️ Editar Aferição de Pressão Arterial';
        form.dataset.editId = id;
        document.getElementById('pressaoForm_matricula').value = p.matricula ? `${p.matricula} - ${p.nome_colaborador || ''}` : (p.nome_colaborador || '');
        onPressaoColaboradorChange();
        document.getElementById('pressaoForm_data').value = p.data_afericao || '';
        document.getElementById('pressaoForm_hora').value = p.hora_afericao || '';
        document.getElementById('pressaoForm_sistolica').value = p.pressao_sistolica ?? '';
        document.getElementById('pressaoForm_diastolica').value = p.pressao_diastolica ?? '';
        document.getElementById('pressaoForm_responsavel').value = p.responsavel_afericao || '';
        document.getElementById('pressaoForm_obs').value = p.observacoes || '';
        atualizarPreviewClassificacaoPressao();
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '💉 Nova Aferição de Pressão Arterial';
        delete form.dataset.editId;
        document.getElementById('pressaoForm_matricula').value = '';
        document.getElementById('pressaoForm_data').value = new Date().toISOString().split('T')[0];
        document.getElementById('pressaoForm_hora').value = '';
        document.getElementById('pressaoForm_sistolica').value = '';
        document.getElementById('pressaoForm_diastolica').value = '';
        document.getElementById('pressaoForm_responsavel').value = '';
        document.getElementById('pressaoForm_obs').value = '';
        btnExcluir.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormPressao() {
    document.getElementById('pressaoFormCard').style.display = 'none';
}

async function salvarPressao() {
    const statusEl = document.getElementById('pressaoFormStatus');
    const data = document.getElementById('pressaoForm_data').value;
    const sistolica = parseInt(document.getElementById('pressaoForm_sistolica').value, 10);
    const diastolica = parseInt(document.getElementById('pressaoForm_diastolica').value, 10);

    if (!data || isNaN(sistolica) || isNaN(diastolica)) {
        statusEl.textContent = '❌ Data e os dois valores de pressão (sistólica e diastólica) são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const { matricula, colab } = buscarColaboradorPorInput('pressaoForm_matricula');
    if (!colab) {
        statusEl.textContent = '❌ Colaborador não encontrado. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const form = document.getElementById('pressaoFormCard');
    const editId = form.dataset.editId;
    const id = editId || ('PA_' + Date.now());
    const classificacao = classificarPressaoArterial(sistolica, diastolica).nivel;

    const row = {
        id,
        matricula,
        nome_colaborador: colab.nome || null,
        funcao: colab.funcao || null,
        setor: colab.setor || null,
        data_afericao: data,
        hora_afericao: document.getElementById('pressaoForm_hora').value || null,
        pressao_sistolica: sistolica,
        pressao_diastolica: diastolica,
        classificacao,
        responsavel_afericao: document.getElementById('pressaoForm_responsavel').value.trim() || null,
        observacoes: document.getElementById('pressaoForm_obs').value.trim() || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('pressao_arterial', [row]);
        const idx = allPressaoArterial.findIndex(p => p.id === id);
        if (idx >= 0) allPressaoArterial[idx] = { ...allPressaoArterial[idx], ...row };
        else allPressaoArterial.push(row);

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormPressao(); showSaudeSubtab('pressao'); }, 900);
    } catch (err) {
        console.error('Erro ao salvar aferição de pressão arterial:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirPressaoAtual() {
    const form = document.getElementById('pressaoFormCard');
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm('Excluir esta aferição de pressão arterial? Essa ação não pode ser desfeita.')) return;

    const statusEl = document.getElementById('pressaoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('pressao_arterial', id);
        allPressaoArterial = allPressaoArterial.filter(p => p.id !== id);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormPressao(); showSaudeSubtab('pressao'); }, 900);
    } catch (err) {
        console.error('Erro ao excluir aferição de pressão arterial:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- CRUD: Atestados Ocupacionais ----

function renderAtestadoResumo() {
    const el = document.getElementById('atestadoResumo');
    if (!el) return;
    const totalDias = allAtestadosOcupacionais.reduce((s, a) => s + (parseInt(a.dias_afastamento, 10) || 0), 0);
    el.textContent = `${allAtestadosOcupacionais.length} atestado(s) registrado(s) — ${totalDias} dia(s) de afastamento no total`;
}

function filterAtestadoLista(query) {
    const resultsEl = document.getElementById('atestadoSearchResults');
    if (!resultsEl) return;
    const q = (query || '').trim().toLowerCase();
    let lista = allAtestadosOcupacionais.slice();
    if (q.length >= 2) {
        lista = lista.filter(a => (a.matricula || '').toLowerCase().includes(q) || (a.nome_colaborador || '').toLowerCase().includes(q));
    }
    lista.sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || ''));

    if (lista.length === 0) {
        resultsEl.innerHTML = '<div class="db-list-empty">Nenhum atestado encontrado</div>';
        return;
    }
    resultsEl.innerHTML = lista.map(a => `
        <div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px; cursor:pointer;" onclick="abrirFormAtestado('${escapeHTML(a.id)}')">
                <div class="db-list-item-title">${escapeHTML(a.nome_colaborador || 'Não identificado')} — ${a.dias_afastamento || 0} dia(s)</div>
                <div class="db-list-item-sub">${formatSimpleDate(a.data_inicio)}${a.data_fim ? ' a ' + formatSimpleDate(a.data_fim) : ''}${a.motivo ? ' — ' + escapeHTML(a.motivo) : ''}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11.5px;" onclick="event.stopPropagation(); abrirAnexoModal('atestados_ocupacionais', '${escapeHTML(a.id)}', 'Atestado Médico — ${escapeHTML(a.nome_colaborador || a.matricula)}')">📎 Atestado Físico${labelContagemAnexos('atestados_ocupacionais', a.id)}</button>
            </div>
        </div>
    `).join('');
}

function limparBuscaAtestado() {
    const input = document.getElementById('atestadoSearchInput');
    if (input) { input.value = ''; input.focus(); }
    filterAtestadoLista('');
}

function abrirFormAtestado(id) {
    const form = document.getElementById('atestadoFormCard');
    const title = document.getElementById('atestadoFormTitle');
    const btnExcluir = document.getElementById('atestadoForm_btnExcluir');
    document.getElementById('atestadoFormStatus').textContent = '';
    document.getElementById('atestadoForm_colabPreview').textContent = '';
    popularSaudeColabDatalists();

    if (id) {
        const a = allAtestadosOcupacionais.find(x => x.id === id);
        if (!a) return;
        title.textContent = '✏️ Editar Atestado';
        form.dataset.editId = id;
        document.getElementById('atestadoForm_matricula').value = a.matricula ? `${a.matricula} - ${a.nome_colaborador || ''}` : (a.nome_colaborador || '');
        onAtestadoColaboradorChange();
        document.getElementById('atestadoForm_dataInicio').value = a.data_inicio || '';
        document.getElementById('atestadoForm_dataFim').value = a.data_fim || '';
        document.getElementById('atestadoForm_dias').value = a.dias_afastamento || 0;
        document.getElementById('atestadoForm_motivo').value = a.motivo || '';
        document.getElementById('atestadoForm_obs').value = a.obs || '';
        btnExcluir.style.display = 'inline-block';
        const btnAnexos = document.getElementById('atestadoForm_btnAnexos');
        if (btnAnexos) {
            btnAnexos.style.display = 'inline-block';
            btnAnexos.textContent = `📎 Anexo (Atestado Médico Físico)${labelContagemAnexos('atestados_ocupacionais', id)}`;
        }
    } else {
        title.textContent = '🤒 Novo Atestado';
        delete form.dataset.editId;
        document.getElementById('atestadoForm_matricula').value = '';
        document.getElementById('atestadoForm_dataInicio').value = new Date().toISOString().split('T')[0];
        document.getElementById('atestadoForm_dataFim').value = '';
        document.getElementById('atestadoForm_dias').value = 0;
        document.getElementById('atestadoForm_motivo').value = '';
        document.getElementById('atestadoForm_obs').value = '';
        btnExcluir.style.display = 'none';
        const btnAnexos = document.getElementById('atestadoForm_btnAnexos');
        if (btnAnexos) btnAnexos.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormAtestado() {
    document.getElementById('atestadoFormCard').style.display = 'none';
}

async function salvarAtestado() {
    const statusEl = document.getElementById('atestadoFormStatus');
    const dataInicio = document.getElementById('atestadoForm_dataInicio').value;

    if (!dataInicio) {
        statusEl.textContent = '❌ Data de início é obrigatória.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const { matricula, colab } = buscarColaboradorPorInput('atestadoForm_matricula');
    if (!colab) {
        statusEl.textContent = '❌ Colaborador não encontrado. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const form = document.getElementById('atestadoFormCard');
    const editId = form.dataset.editId;
    const id = editId || ('ATEST_' + Date.now());

    const row = {
        id,
        matricula,
        nome_colaborador: colab.nome || null,
        funcao: colab.funcao || null,
        setor: colab.setor || null,
        data_inicio: dataInicio,
        data_fim: document.getElementById('atestadoForm_dataFim').value || null,
        dias_afastamento: parseInt(document.getElementById('atestadoForm_dias').value, 10) || 0,
        motivo: document.getElementById('atestadoForm_motivo').value.trim() || null,
        obs: document.getElementById('atestadoForm_obs').value.trim() || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('atestados_ocupacionais', [row]);
        const idx = allAtestadosOcupacionais.findIndex(a => a.id === id);
        if (idx >= 0) allAtestadosOcupacionais[idx] = { ...allAtestadosOcupacionais[idx], ...row };
        else allAtestadosOcupacionais.push(row);

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormAtestado(); showSaudeSubtab('atestado'); }, 900);
    } catch (err) {
        console.error('Erro ao salvar atestado:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirAtestadoAtual() {
    const form = document.getElementById('atestadoFormCard');
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm('Excluir este atestado? Essa ação não pode ser desfeita.')) return;

    const statusEl = document.getElementById('atestadoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('atestados_ocupacionais', id);
        allAtestadosOcupacionais = allAtestadosOcupacionais.filter(a => a.id !== id);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => { fecharFormAtestado(); showSaudeSubtab('atestado'); }, 900);
    } catch (err) {
        console.error('Erro ao excluir atestado:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

