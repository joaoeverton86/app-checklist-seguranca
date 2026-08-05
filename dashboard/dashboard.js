// ============================================
// PAINEL GERENCIAL - Somente leitura, lê direto do Supabase.
// Site separado do app de campo (app.js) - não compartilha código/tabelas com
// ele por decisão de projeto, só reaproveita os mesmos cálculos já usados na
// tela "Relatórios" do app, portados aqui pra funcionar sem IndexedDB.
// ============================================

const SUPABASE_URL = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdGN3eHZiam15Ynl6dWJvY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODczNDUsImV4cCI6MjEwMDE2MzM0NX0.T6Nm-lUD2I_mRULsEXCDQBkJe2cEpl6_z7hUNR30yTk';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// Pagina automaticamente via Range/Content-Range. O PostgREST corta em 1000 linhas por
// padrão - sem isso, o relatório de treinamentos (13 mil+ linhas de histórico) mostrava
// só a primeira página em silêncio, sem erro nenhum (achado testando com a planilha real).
// Pra tabelas com poucas linhas isso não muda nada (uma página só, mesmo custo de antes).
async function supabaseFetch(table, query = '') {
    const PAGE_SIZE = 1000;
    let allRows = [];
    let offset = 0;

    while (true) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Range: `${offset}-${offset + PAGE_SIZE - 1}`,
                Prefer: 'count=exact'
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${table}`);
        const page = await res.json();
        allRows = allRows.concat(page);

        const contentRange = res.headers.get('content-range');
        const total = contentRange && contentRange.includes('/') ? parseInt(contentRange.split('/')[1], 10) : null;
        offset += PAGE_SIZE;

        if (page.length < PAGE_SIZE || (total !== null && allRows.length >= total)) break;
    }

    return allRows;
}

async function supabaseUpsert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(rows)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
}

async function supabaseDelete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
}

function formatSimpleDate(dateStr) {
    if (!dateStr) return '—';
    if (dateStr.includes('T')) {
        try { return new Date(dateStr).toLocaleDateString('pt-BR'); }
        catch (e) { dateStr = dateStr.split('T')[0]; }
    }
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Chart.js corta (não quebra nem reticências) rótulos do eixo de categoria quando não
// cabem na largura disponível - achado real num card estreito com nomes de treinamento
// longos. Devolver um array de strings em vez de uma string faz o Chart.js desenhar
// cada item como uma linha própria do tick, então isso quebra o texto em várias linhas
// curtas ao invés de cortar. Usado em todo gráfico de barra horizontal (indexAxis: 'y').
function wrapChartLabel(label, maxCharsPerLine = 28) {
    const str = String(label || '');
    if (str.length <= maxCharsPerLine) return str;
    const words = str.split(' ');
    const lines = [];
    let current = '';
    words.forEach(word => {
        const tentativa = current ? current + ' ' + word : word;
        if (tentativa.length > maxCharsPerLine && current) {
            lines.push(current);
            current = word;
        } else {
            current = tentativa;
        }
    });
    if (current) lines.push(current);
    return lines;
}

// wrapChartLabel evita cortar texto, mas rótulos de várias linhas ocupam mais altura por
// barra - sem isso, o Chart.js (autoSkip padrão) escondia ticks inteiros pra não deixar
// sobrepor, dando a falsa impressão de categoria faltando (achado real: "ADMINISTRATIVO"
// sumiu do eixo do gráfico de Função). Aqui calcula a altura real necessária somando o
// espaço de cada barra (mais linhas = mais altura) e aplica no wrapper do canvas antes de
// criar o gráfico; os options de cada gráfico também desligam autoSkip explicitamente.
//
// Duas correções sobre a primeira tentativa (achadas ao vivo pelo usuário):
// 1) O Chart.js divide a altura do canvas em bandas IGUAIS entre as categorias - não
//    proporcional ao tamanho de cada rótulo. Somar alturas variáveis por barra
//    sub-dimensionava a banda das barras com rótulo mais longo, e o texto ficava
//    sobreposto ao da barra vizinha mesmo a altura total "parecendo" suficiente. Agora
//    usa a MESMA altura (baseada no rótulo com mais linhas) pra todas as barras.
// 2) Sem limite, um gráfico com muitas categorias (ex: 19 setores) esticava a LINHA
//    INTEIRA do grid (o Chart.js Grid/CSS Grid alinha a altura da linha pela maior
//    célula, align-items:start só evita esticar os itens mais curtos DENTRO da linha,
//    não evita a linha em si crescer) - sobrava um vão em branco enorme nos cards
//    vizinhos mais curtos. Acima de um teto, em vez de crescer o card, o gráfico passa
//    a rolar por dentro (um "sizer" interno com a altura total real, dentro de um
//    wrapper com altura travada e overflow-y:auto) - nada fica escondido, só passa a
//    precisar de scroll dentro do próprio card.
function ajustarAlturaBarrasHorizontais(canvasId, labels) {
    const canvas = document.getElementById(canvasId);
    const outerWrap = canvas ? canvas.closest('.db-chart-canvas-wrap') : null;
    if (!outerWrap) return;

    // .db-chart-canvas-wrap normalmente cresce (flex-grow) pra acompanhar um card
    // vizinho mais alto na mesma linha do grid (evita vão em branco) - mas esse
    // gráfico já tem uma altura calculada especificamente pro conteúdo dele, então
    // trava flex-grow/shrink em 0 pra não ser esticado nem comprimido além do que foi
    // calculado aqui.
    outerWrap.style.flexGrow = '0';
    outerWrap.style.flexShrink = '0';

    const maxLinhas = labels.reduce((max, l) => Math.max(max, Array.isArray(l) ? l.length : 1), 1);
    const alturaPorBarra = Math.max(28, maxLinhas * 15 + 14);
    const alturaNecessaria = Math.max(280, labels.length * alturaPorBarra + 40);
    const ALTURA_MAX_VISIVEL = 480;

    if (alturaNecessaria > ALTURA_MAX_VISIVEL) {
        outerWrap.style.height = ALTURA_MAX_VISIVEL + 'px';
        outerWrap.style.overflowY = 'auto';
        outerWrap.style.overflowX = 'hidden';
        let sizer = canvas.parentElement;
        if (sizer === outerWrap) {
            sizer = document.createElement('div');
            sizer.className = 'db-chart-inner-sizer';
            sizer.style.position = 'relative';
            sizer.style.width = '100%';
            outerWrap.appendChild(sizer);
            sizer.appendChild(canvas);
        }
        sizer.style.height = alturaNecessaria + 'px';
    } else {
        outerWrap.style.height = alturaNecessaria + 'px';
        outerWrap.style.overflowY = 'visible';
        const sizer = canvas.parentElement;
        if (sizer !== outerWrap && sizer.classList.contains('db-chart-inner-sizer')) {
            sizer.style.height = '100%';
        }
    }
}

// Portado de app.js (parseLocalDate) - mesma lógica de parsing tolerante a
// formato ISO/BR, pra bater exatamente com o que o app de campo já mostra.
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr !== 'string') {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    const str = dateStr.trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }
    if (str.includes('/')) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (!isNaN(d.getTime())) return d;
        }
    }
    if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (!isNaN(d.getTime())) return d;
        }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
}

// Portado de app.js (recalcularStatsChecklist) - recalcula sempre a partir do
// JSONB "items" pra bater com o que o app mostra (mais confiável que confiar
// nas colunas conformes/nao_conformes/na, que podem estar desatualizadas se o
// checklist foi editado localmente antes de sincronizar).
function recalcularStatsChecklist(checklist) {
    let conformes = 0, naoConformes = 0, na = 0;
    if (checklist.items && typeof checklist.items === 'object') {
        const keys = Object.keys(checklist.items).filter(k => k !== '_form');
        keys.forEach(k => {
            const item = checklist.items[k];
            if (item && item.status === 'C') conformes++;
            else if (item && item.status === 'NC') naoConformes++;
            else if (item && item.status === 'NA') na++;
        });
        if (keys.length > 0) return { conformes, naoConformes, na, total: conformes + naoConformes + na };
    }
    conformes = parseInt(checklist.conformes) || 0;
    naoConformes = parseInt(checklist.nao_conformes) || 0;
    na = parseInt(checklist.na) || 0;
    return { conformes, naoConformes, na, total: conformes + naoConformes + na };
}

// Portado de app.js (normalizarStatusChecklist), simplificado.
function normalizarStatusChecklist(val, checklist) {
    const str = String(val || '').toLowerCase().trim();
    if (str.includes('interditad') || str.includes('interdicao') || str.includes('interdição')) return 'interditado';
    if (str.includes('restri')) return 'liberado_restricao';
    if (str.includes('liberad') || str.includes('conforme') || str.includes('ok')) return 'liberado';

    if (checklist) {
        const stats = recalcularStatsChecklist(checklist);
        if (stats.naoConformes > 0) {
            const hasHighRiskNC = checklist.items && Object.entries(checklist.items).some(([k, v]) =>
                v && v.status === 'NC' && (k.includes('interdicao') || k.includes('freio') || k.includes('cinto'))
            );
            return hasHighRiskNC ? 'interditado' : 'liberado_restricao';
        }
        return 'liberado';
    }
    return 'liberado';
}

// ============================================
// ESTADO E FILTROS
// ============================================

let allChecklists = [];
let allCadastros = [];
let allExtintores = [];
let allInspecoesExtintores = [];
let allRelatos = [];
let reportFilter = 'mes';
let customFrom = null;
let customTo = null;
let chartInstances = {};
let refreshTimer = null;

function getDateRange() {
    const now = new Date();
    const fimAjustado = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 59, 999);
    if (reportFilter === 'semana') {
        const inicio = new Date(now);
        inicio.setDate(now.getDate() - 7);
        inicio.setHours(0, 0, 0, 0);
        return { inicio, fim: fimAjustado };
    }
    if (reportFilter === 'custom' && customFrom && customTo) {
        return { inicio: new Date(customFrom + 'T00:00:00'), fim: new Date(customTo + 'T23:59:59') };
    }
    if (reportFilter === 'todos') {
        return { inicio: new Date(2000, 0, 1), fim: fimAjustado };
    }
    return { inicio: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), fim: fimAjustado };
}

function setReportFilter(filter) {
    reportFilter = filter;
    ['btnFiltroMes', 'btnFiltroSemana', 'btnFiltroTodos', 'btnFiltroCustom'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroMes', semana: 'btnFiltroSemana', todos: 'btnFiltroTodos', custom: 'btnFiltroCustom' };
    document.getElementById(map[filter])?.classList.add('active');

    const customDiv = document.getElementById('customDateRange');
    if (customDiv) customDiv.style.display = filter === 'custom' ? 'flex' : 'none';

    if (filter !== 'custom') renderAll();
}

function applyCustomRange() {
    const from = document.getElementById('filterDateFrom').value;
    const to = document.getElementById('filterDateTo').value;
    if (from && to) {
        customFrom = from;
        customTo = to;
        renderAll();
    }
}

function clearFilters() {
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterEmpresa').value = '';
    setReportFilter('mes');
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function loadData() {
    setStatus('Carregando dados...');
    try {
        const [checklists, cadastros, extintores, inspecoes, relatos] = await Promise.all([
            supabaseFetch('checklists', '?select=*'),
            supabaseFetch('cadastros', '?select=*'),
            supabaseFetch('extintores', '?select=*'),
            supabaseFetch('inspecoes_extintores', '?select=*'),
            supabaseFetch('relatos', '?select=*')
        ]);
        allChecklists = checklists;
        allCadastros = cadastros;
        allExtintores = extintores;
        allInspecoesExtintores = inspecoes;
        allRelatos = relatos;
        populateFilterOptions();
        renderAll();
        renderExtintorPanel();
        renderRelatosPanel();
        setStatus('Atualizado às ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
        setStatus('❌ Falha ao carregar dados. Tentando de novo em 5 min...');
    }
}

function setStatus(text) {
    const el = document.getElementById('statusText');
    if (el) el.textContent = text;
}

function populateFilterOptions() {
    const ativos = allCadastros.filter(c => c.ativo !== false);

    const selCategoria = document.getElementById('filterCategoria');
    const valCat = selCategoria.value;
    const categorias = Array.from(new Set(ativos.map(c => c.categoria).filter(Boolean))).sort();
    selCategoria.innerHTML = '<option value="">Todas as Categorias</option>' +
        categorias.map(catId => {
            let catName = catId;
            if (typeof EQUIPMENT_TYPES !== 'undefined') {
                for (const list of Object.values(EQUIPMENT_TYPES)) {
                    const found = list.find(e => e.id === catId);
                    if (found) { catName = found.name; break; }
                }
            }
            return `<option value="${escapeHTML(catId)}">${escapeHTML(catName)}</option>`;
        }).join('');
    selCategoria.value = valCat;

    const selEmpresa = document.getElementById('filterEmpresa');
    const valEmp = selEmpresa.value;
    const empresas = Array.from(new Set(ativos.map(c => (c.empresa || '').trim()).filter(Boolean))).sort();
    selEmpresa.innerHTML = '<option value="">Todas as Empresas</option>' +
        empresas.map(e => `<option value="${escapeHTML(e)}">${escapeHTML(e)}</option>`).join('');
    selEmpresa.value = valEmp;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderAll() {
    const selectedCategoria = document.getElementById('filterCategoria').value;
    const selectedEmpresa = document.getElementById('filterEmpresa').value;

    const equipamentosAtivos = allCadastros.filter(c => c.ativo !== false);
    const cadastroByPatr = {};
    equipamentosAtivos.forEach(c => { if (c.patrimonio) cadastroByPatr[c.patrimonio.toUpperCase()] = c; });

    let filteredEquips = [...equipamentosAtivos];
    if (selectedCategoria) filteredEquips = filteredEquips.filter(e => e.categoria === selectedCategoria);
    if (selectedEmpresa) filteredEquips = filteredEquips.filter(e => (e.empresa || '') === selectedEmpresa);

    function filterChecklistArray(arr) {
        let result = arr;
        if (selectedCategoria) {
            result = result.filter(c => {
                const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
                return cad && cad.categoria === selectedCategoria;
            });
        }
        if (selectedEmpresa) {
            result = result.filter(c => {
                const cad = c.patrimonio ? cadastroByPatr[c.patrimonio.toUpperCase()] : null;
                return cad ? (cad.empresa || '') === selectedEmpresa : (c.empresa || '') === selectedEmpresa;
            });
        }
        return result;
    }

    const { inicio, fim } = getDateRange();
    let checklistsPeriodo = allChecklists.filter(c => { const d = parseLocalDate(c.date); return d >= inicio && d <= fim; });
    checklistsPeriodo = filterChecklistArray(checklistsPeriodo);

    renderTituloPeriodo();
    renderKPIs(filteredEquips, checklistsPeriodo);
    renderCharts(checklistsPeriodo, filterChecklistArray);
}

function renderTituloPeriodo() {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const agora = new Date();
    const el = document.getElementById('periodoTitulo');
    if (!el) return;
    if (reportFilter === 'semana') el.textContent = 'Última Semana';
    else if (reportFilter === 'todos') el.textContent = 'Todos os Dados';
    else if (reportFilter === 'custom') el.textContent = 'Período Personalizado';
    else el.textContent = `${meses[agora.getMonth()]} ${agora.getFullYear()}`;
}

function renderKPIs(filteredEquips, checklistsPeriodo) {
    const patrimoniosVerificados = new Set(checklistsPeriodo.map(c => c.patrimonio));
    const pendentes = filteredEquips.filter(e => !patrimoniosVerificados.has(e.patrimonio));
    const realizados = filteredEquips.filter(e => patrimoniosVerificados.has(e.patrimonio));

    const statusCounts = { interditado: 0, liberado_restricao: 0, liberado: 0 };
    let totalC = 0, totalNC = 0, totalNA = 0;
    checklistsPeriodo.forEach(c => {
        const stats = recalcularStatsChecklist(c);
        totalC += stats.conformes; totalNC += stats.naoConformes; totalNA += stats.na;
        const st = normalizarStatusChecklist(c.status_checklist, c);
        if (statusCounts[st] !== undefined) statusCounts[st]++;
    });

    const totalItens = totalC + totalNC + totalNA;
    const pctConformidade = totalItens > 0 ? Math.round((totalC / totalItens) * 100) : 0;

    document.getElementById('kpiEquipamentos').textContent = filteredEquips.length;
    document.getElementById('kpiConformidade').textContent = pctConformidade + '%';
    document.getElementById('kpiInterditados').textContent = statusCounts.interditado;
    document.getElementById('kpiRestricao').textContent = statusCounts.liberado_restricao;
    document.getElementById('kpiLiberados').textContent = statusCounts.liberado;
    document.getElementById('kpiPendentes').textContent = pendentes.length;
    document.getElementById('kpiRealizados').textContent = realizados.length;
}

function destroyCharts() {
    Object.values(chartInstances).forEach(c => c && c.destroy());
    chartInstances = {};
}

function renderCharts(checklistsPeriodo, filterChecklistArray) {
    destroyCharts();
    if (typeof Chart === 'undefined') return;

    const colors = { success: '#10b981', danger: '#ef4444', gray: '#94a3b8', primary: '#4f46e5', primaryLight: '#818cf8' };

    // Conformidade (doughnut)
    let totalC = 0, totalNC = 0, totalNA = 0;
    checklistsPeriodo.forEach(c => {
        const s = recalcularStatsChecklist(c);
        totalC += s.conformes; totalNC += s.naoConformes; totalNA += s.na;
    });
    chartInstances.conformidade = new Chart(document.getElementById('chartConformidade'), {
        type: 'doughnut',
        data: { labels: ['Conformes', 'Não Conformes', 'N/A'], datasets: [{ data: [totalC, totalNC, totalNA], backgroundColor: [colors.success, colors.danger, colors.gray], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
    });

    // Checklists por tipo de equipamento
    const typeCounts = {};
    checklistsPeriodo.forEach(c => { const t = c.equipment?.name || c.nome || 'Desconhecido'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    const typeSorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const typeLabels = typeSorted.map(t => wrapChartLabel(t[0]));
    ajustarAlturaBarrasHorizontais('chartPorTipo', typeLabels);
    chartInstances.tipo = new Chart(document.getElementById('chartPorTipo'), {
        type: 'bar',
        data: { labels: typeLabels, datasets: [{ label: 'Checklists', data: typeSorted.map(t => t[1]), backgroundColor: colors.primaryLight, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Volume de checklists nos últimos 6 meses
    const meses = [], contagens = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const ini = new Date(d.getFullYear(), d.getMonth(), 1);
        const fimMes = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        let sublist = allChecklists.filter(c => { const dt = parseLocalDate(c.date); return dt >= ini && dt <= fimMes; });
        sublist = filterChecklistArray(sublist);
        contagens.push(sublist.length);
    }
    chartInstances.meses = new Chart(document.getElementById('chartPorMes'), {
        type: 'line',
        data: { labels: meses, datasets: [{ label: 'Checklists', data: contagens, borderColor: colors.primary, backgroundColor: 'rgba(79,70,229,0.1)', fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: colors.primary }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // Top 10 itens com mais não conformidade
    const itemCounts = {};
    checklistsPeriodo.forEach(c => {
        if (!c.items) return;
        for (const [itemId, data] of Object.entries(c.items)) {
            if (itemId === '_form' || !data || data.status !== 'NC') continue;
            const nome = (typeof ITEM_NAMES !== 'undefined' && ITEM_NAMES[itemId]) || data.customText || itemId;
            itemCounts[nome] = (itemCounts[nome] || 0) + 1;
        }
    });
    const itemsSorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const itemsLabels = itemsSorted.map(i => wrapChartLabel(i[0]));
    ajustarAlturaBarrasHorizontais('chartItensNC', itemsLabels);
    chartInstances.itens = new Chart(document.getElementById('chartItensNC'), {
        type: 'bar',
        data: { labels: itemsLabels, datasets: [{ label: 'Ocorrências', data: itemsSorted.map(i => i[1]), backgroundColor: itemsSorted.map((_, idx) => `rgba(239, 68, 68, ${1 - idx * 0.07})`), borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Top 10 equipamentos com mais não conformidade
    const equipCounts = {};
    checklistsPeriodo.forEach(c => {
        const s = recalcularStatsChecklist(c);
        if (s.naoConformes > 0) {
            const key = (c.patrimonio || 'Sem patrimônio').toUpperCase();
            equipCounts[key] = (equipCounts[key] || 0) + s.naoConformes;
        }
    });
    const equipSorted = Object.entries(equipCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const equipLabels = equipSorted.map(e => wrapChartLabel(e[0]));
    ajustarAlturaBarrasHorizontais('chartEquipNC', equipLabels);
    chartInstances.equip = new Chart(document.getElementById('chartEquipNC'), {
        type: 'bar',
        data: { labels: equipLabels, datasets: [{ label: 'Não Conformidades', data: equipSorted.map(e => e[1]), backgroundColor: colors.danger, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Top empresas com mais não conformidade
    const empresaCounts = {};
    checklistsPeriodo.forEach(c => {
        const s = recalcularStatsChecklist(c);
        if (s.naoConformes > 0) {
            const key = (c.empresa || 'Sem empresa').trim() || 'Sem empresa';
            empresaCounts[key] = (empresaCounts[key] || 0) + s.naoConformes;
        }
    });
    const empresaSorted = Object.entries(empresaCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const empresaLabels = empresaSorted.map(e => wrapChartLabel(e[0]));
    ajustarAlturaBarrasHorizontais('chartEmpresaNC', empresaLabels);
    chartInstances.empresa = new Chart(document.getElementById('chartEmpresaNC'), {
        type: 'bar',
        data: { labels: empresaLabels, datasets: [{ label: 'Não Conformidades', data: empresaSorted.map(e => e[1]), backgroundColor: colors.warning || '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });
}

// ============================================
// EXTINTORES (Fase 2)
// Espelha os cálculos de renderExtintorAlerts()/atualizarPendentesMesExtintores()
// do app.js, lendo direto do Supabase em vez do IndexedDB.
// ============================================

function renderExtintorPanel() {
    const ativos = allExtintores.filter(e => e.ativo !== false);
    document.getElementById('kpiExtintoresAtivos').textContent = ativos.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let vencidos = 0, vencendo = 0;
    const alertList = [];
    ativos.forEach(e => {
        if (!e.proxima_recarga) return;
        const deadline = parseLocalDate(e.proxima_recarga);
        deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) { vencidos++; alertList.push({ e, diffDays }); }
        else if (diffDays <= 30) { vencendo++; alertList.push({ e, diffDays }); }
    });
    document.getElementById('kpiExtintoresVencidos').textContent = vencidos;
    document.getElementById('kpiExtintoresVencendo').textContent = vencendo;

    alertList.sort((a, b) => a.diffDays - b.diffDays);
    const listEl = document.getElementById('listExtintorVencendo');
    if (alertList.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">✅ Nenhum extintor vencido ou vencendo nos próximos 30 dias</div>';
    } else {
        listEl.innerHTML = alertList.map(({ e, diffDays }) => {
            const cls = diffDays < 0 ? 'db-item-danger' : 'db-item-warning';
            const msg = diffDays < 0 ? `Vencido há ${Math.abs(diffDays)} dia(s)` : (diffDays === 0 ? 'Vence hoje' : `Vence em ${diffDays} dia(s)`);
            return `<div class="db-list-item ${cls}">
                <div class="db-list-item-title">${escapeHTML(e.id)} (${escapeHTML(e.tipo || '')})</div>
                <div class="db-list-item-sub">${escapeHTML(e.setor || '—')} — ${msg}</div>
            </div>`;
        }).join('');
    }

    // Última inspeção deste mês por extintor (dedupe), pra conformidade + pendentes do mês
    const now = new Date();
    const anoMes = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const ultimaInspecaoMes = {};
    allInspecoesExtintores.forEach(i => {
        if (!(i.date || '').startsWith(anoMes)) return;
        const existing = ultimaInspecaoMes[i.extintor_id];
        if (!existing || new Date(i.created_at || 0) > new Date(existing.created_at || 0)) {
            ultimaInspecaoMes[i.extintor_id] = i;
        }
    });

    let conf = 0, naoConf = 0, pendentes = 0;
    ativos.forEach(e => {
        const insp = ultimaInspecaoMes[e.id];
        if (!insp) pendentes++;
        else if (insp.status_geral === 'nao_conforme') naoConf++;
        else conf++;
    });
    document.getElementById('kpiExtintoresInspecionados').textContent = conf + naoConf;
    document.getElementById('kpiExtintoresPendentes').textContent = pendentes;

    if (typeof Chart !== 'undefined') {
        chartInstances.extintorInspecao = new Chart(document.getElementById('chartExtintorInspecao'), {
            type: 'doughnut',
            data: { labels: ['Conforme', 'Não Conforme', 'Pendente'], datasets: [{ data: [conf, naoConf, pendentes], backgroundColor: ['#10b981', '#ef4444', '#94a3b8'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
        });
    }
}

// ============================================
// RELATOS DE PROBLEMAS (Fase 2)
// ============================================

function renderRelatosPanel() {
    const counts = { aberto: 0, em_andamento: 0, resolvido: 0 };
    allRelatos.forEach(r => {
        const st = (r.status || 'aberto').toLowerCase();
        if (counts[st] !== undefined) counts[st]++;
    });
    document.getElementById('kpiRelatosAbertos').textContent = counts.aberto;
    document.getElementById('kpiRelatosAndamento').textContent = counts.em_andamento;
    document.getElementById('kpiRelatosResolvidos').textContent = counts.resolvido;

    const tipoCounts = {};
    allRelatos.forEach(r => { const t = r.tipo || 'Outro'; tipoCounts[t] = (tipoCounts[t] || 0) + 1; });
    const tipoSorted = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    if (typeof Chart !== 'undefined') {
        const tipoLabels = tipoSorted.map(t => wrapChartLabel(t[0]));
        ajustarAlturaBarrasHorizontais('chartRelatosTipo', tipoLabels);
        chartInstances.relatosTipo = new Chart(document.getElementById('chartRelatosTipo'), {
            type: 'bar',
            data: { labels: tipoLabels, datasets: [{ label: 'Relatos', data: tipoSorted.map(t => t[1]), backgroundColor: '#818cf8', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
        });
    }

    const abertos = allRelatos
        .filter(r => (r.status || 'aberto').toLowerCase() !== 'resolvido')
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 15);
    const listEl = document.getElementById('listRelatosAbertos');
    if (abertos.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">✅ Nenhum relato aberto ou em andamento</div>';
    } else {
        listEl.innerHTML = abertos.map(r => {
            const cls = (r.status || '').toLowerCase() === 'em_andamento' ? 'db-item-warning' : 'db-item-danger';
            return `<div class="db-list-item ${cls}">
                <div class="db-list-item-title">${escapeHTML(r.identificacao || r.tipo || 'Relato')}</div>
                <div class="db-list-item-sub">${escapeHTML(r.reporter || '—')} — ${formatSimpleDate(r.date)}</div>
            </div>`;
        }).join('');
    }
}

// ============================================
// TREINAMENTOS (Fase 1 - importação + relatório de HHT)
// Tabelas isoladas (treinamentos_catalogo/treinamentos_realizados/treinamentos_status),
// só lidas aqui no painel - o histórico completo nunca vai pro app de campo (ver plano).
// Carregado sob demanda (só quando a página é aberta), já que são ~14 mil linhas de
// histórico - nada a ver com o app mobile, mas não faz sentido puxar isso a cada 5 min
// em segundo plano se ninguém está olhando a página.
// ============================================

let allTreinamentosRealizados = [];
let allTreinamentosCatalogo = [];
let allTreinamentosStatus = [];
let treinamentosFilter = 'mes';
let treinamentosFiltroAno = '';
let treinamentosFiltroMes = '';
let treinamentosLoaded = false;

const NR_PATTERN = /\bNR[\s.]?\d/i;
const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Reconstrói as opções de ano de um <select> a partir do conjunto de anos calculado,
// preservando a seleção atual quando ela continua válida. Só reconstrói quando o
// conjunto de anos realmente mudou (evita perder foco/seleção à toa a cada render).
// Existe porque um "só popula uma vez" (guarda por options.length) é frágil quando os
// dados ainda estão chegando de forma paginada (ex: 13k+ linhas de treinamentos, várias
// idas ao Supabase) - se esse popular acontecer cedo demais (ex: usuário revisita a
// página enquanto o carregamento anterior ainda está em andamento), a lista fica presa
// incompleta pro resto da sessão.
function popularSelectAnos(selectId, anosSet) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const anosOrdenados = Array.from(anosSet).sort((a, b) => b - a);
    const anosAtuais = Array.from(sel.options).slice(1).map(o => o.value);
    const jaCompleto = anosAtuais.length === anosOrdenados.length && anosAtuais.every((v, i) => Number(v) === anosOrdenados[i]);
    if (jaCompleto) return;
    const valorSelecionado = sel.value;
    sel.innerHTML = '<option value="">Ano específico...</option>';
    anosOrdenados.forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        sel.appendChild(opt);
    });
    if (valorSelecionado && anosOrdenados.some(a => String(a) === valorSelecionado)) {
        sel.value = valorSelecionado;
    }
}

// Ano/mês específico pra comparar períodos distantes (ex: 2024 vs 2026) - os botões
// rápidos (Este Mês/Últimos 3 Meses/Este Ano/Todos) só cobrem janelas relativas a hoje.
function popularFiltroAnoTreinamentos() {
    const anos = new Set([new Date().getFullYear()]);
    allTreinamentosRealizados.forEach(r => { if (r.data_treinamento) anos.add(parseLocalDate(r.data_treinamento).getFullYear()); });
    popularSelectAnos('treinFiltroAno', anos);
}

function getTreinamentosDateRange() {
    const tituloEl = document.getElementById('treinPeriodoTitulo');
    if (treinamentosFiltroAno) {
        const ano = parseInt(treinamentosFiltroAno, 10);
        if (treinamentosFiltroMes !== '') {
            const mes = parseInt(treinamentosFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (treinamentosFilter === 'trimestre') {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        titulo = 'Últimos 3 meses';
    } else if (treinamentosFilter === 'ano') {
        inicio = new Date(now.getFullYear(), 0, 1);
        titulo = `Ano ${now.getFullYear()} (até hoje)`;
    } else if (treinamentosFilter === 'todos') {
        inicio = new Date(2000, 0, 1);
        titulo = 'Todo o histórico';
    } else {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        titulo = 'Este mês';
    }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setTreinamentosFilter(filter) {
    treinamentosFilter = filter;
    treinamentosFiltroAno = '';
    treinamentosFiltroMes = '';
    const anoSel = document.getElementById('treinFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('treinFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroTreinMes', 'btnFiltroTreinTrimestre', 'btnFiltroTreinAno', 'btnFiltroTreinTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroTreinMes', trimestre: 'btnFiltroTreinTrimestre', ano: 'btnFiltroTreinAno', todos: 'btnFiltroTreinTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderTreinamentosPanel();
}

function onTreinamentosFiltroAnoMesChange() {
    treinamentosFiltroAno = document.getElementById('treinFiltroAno').value;
    treinamentosFiltroMes = document.getElementById('treinFiltroMes').value;
    if (treinamentosFiltroAno) {
        ['btnFiltroTreinMes', 'btnFiltroTreinTrimestre', 'btnFiltroTreinAno', 'btnFiltroTreinTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderTreinamentosPanel();
}

async function loadTreinamentosData() {
    const statusEl = document.getElementById('treinamentosImportStatus');
    try {
        const [realizados, catalogo, status] = await Promise.all([
            supabaseFetch('treinamentos_realizados', '?select=*'),
            supabaseFetch('treinamentos_catalogo', '?select=*'),
            supabaseFetch('treinamentos_status', '?select=*')
        ]);
        allTreinamentosRealizados = realizados;
        allTreinamentosCatalogo = catalogo;
        allTreinamentosStatus = status;
        // Precisa do efetivo pra saber quem realmente está ativo hoje (ver comentário
        // em renderTreinamentosPanel) - carrega mesmo se o usuário nunca abriu a página
        // Efetivo nesta sessão.
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }
        renderTreinamentosPanel();
        renderCatalogoResumo();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput')?.value || '');
        // Popula datalist/select da aba "Lançar Treinamento" assim que os dados chegam,
        // sem depender do usuário abrir essa aba primeiro (ambos são idempotentes -
        // só preenchem se ainda estiverem vazios).
        popularCatalogoDatalist();
        popularResponsavelSelect();
    } catch (err) {
        console.error('Erro ao carregar dados de treinamentos:', err);
        if (statusEl) statusEl.textContent = '❌ Falha ao carregar dados de treinamentos.';
    }
}

// Abas da página Treinamentos (Visão Geral / Lançar Treinamento / Catálogo). Sempre
// re-renderiza a Visão Geral ao entrar nela (mesmo raciocínio do self-heal de
// showDbPage - se o gráfico foi criado com o canvas escondido em outra aba, sem isso
// ficaria em branco pra sempre).
function showTreinSubtab(tab) {
    ['visao', 'lancar', 'catalogo'].forEach(t => {
        const content = document.getElementById('treinSubtab-' + t);
        const btn = document.getElementById('treinSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderTreinamentosPanel();
}

function renderTreinamentosPanel() {
    popularFiltroAnoTreinamentos();
    const { inicio, fim } = getTreinamentosDateRange();
    const periodo = allTreinamentosRealizados.filter(r => {
        if (!r.data_treinamento) return false;
        const d = parseLocalDate(r.data_treinamento);
        return d >= inicio && d <= fim;
    });

    document.getElementById('kpiTreinSessoes').textContent = periodo.length;
    const totalHoras = periodo.reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0);
    document.getElementById('kpiTreinHHT').textContent = totalHoras.toLocaleString('pt-BR');
    document.getElementById('kpiTreinColaboradores').textContent = new Set(periodo.map(r => r.matricula)).size;

    // NRs vencidas/vencendo - baseado no status atual (não no período filtrado acima,
    // que é só pra sessões realizadas), só colaboradores ativos, só treinamentos que
    // parecem NR formal (nome contém "NR" + número - heurística simples).
    //
    // "Ativo" aqui usa o cadastro de efetivo (colaboradores_efetivo.dt_demissao) como
    // fonte de verdade, não o status_colaborador de treinamentos_status - esse último é
    // só uma foto do status no momento em que a sessão de treinamento foi lançada, então
    // fica desatualizado assim que alguém é demitido depois do último treinamento
    // registrado (achado real: colaborador demitido em 2026-05 continuava aparecendo
    // como "ATIVO" nessa lista porque o treinamento dele foi lançado antes da demissão).
    // Cai de volta pro status_colaborador só se a matrícula não existir no efetivo.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const efetivoPorMatricula = new Map(allEfetivo.map(e => [e.id, e]));
    const nrAlerts = [];
    const matriculasComNRVencida = new Set();
    allTreinamentosStatus.forEach(s => {
        const efetivo = efetivoPorMatricula.get(s.matricula);
        const estaAtivo = efetivo ? (!!efetivo.dt_admissao && !efetivo.dt_demissao) : (s.status_colaborador === 'ATIVO');
        if (!estaAtivo) return;
        if (!NR_PATTERN.test(s.treinamento_nome || '')) return;
        if (!s.data_proxima_reciclagem) return;
        const deadline = parseLocalDate(s.data_proxima_reciclagem);
        deadline.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
            nrAlerts.push({ s, diffDays });
            if (diffDays < 0) matriculasComNRVencida.add(s.matricula);
        }
    });
    document.getElementById('kpiTreinVencidos').textContent = matriculasComNRVencida.size;

    nrAlerts.sort((a, b) => a.diffDays - b.diffDays);
    const listEl = document.getElementById('listTreinVencendo');
    if (nrAlerts.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">✅ Nenhuma NR vencida ou vencendo nos próximos 30 dias</div>';
    } else {
        listEl.innerHTML = nrAlerts.slice(0, 30).map(({ s, diffDays }) => {
            const cls = diffDays < 0 ? 'db-item-danger' : 'db-item-warning';
            const msg = diffDays < 0 ? `Vencida há ${Math.abs(diffDays)} dia(s)` : (diffDays === 0 ? 'Vence hoje' : `Vence em ${diffDays} dia(s)`);
            return `<div class="db-list-item ${cls}">
                <div class="db-list-item-title">${escapeHTML(s.nome || s.matricula)}</div>
                <div class="db-list-item-sub">${escapeHTML(s.treinamento_nome || '')} — ${msg}</div>
            </div>`;
        }).join('');
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.treinHHTMes) chartInstances.treinHHTMes.destroy();
    if (chartInstances.treinSetor) chartInstances.treinSetor.destroy();
    if (chartInstances.treinTopTemas) chartInstances.treinTopTemas.destroy();

    // HHT por mês - histórico completo, da primeira sessão registrada até hoje (não só
    // os últimos 12 meses: com "Todos" selecionado o usuário espera ver 2024 também).
    const meses = [], horasPorMes = [];
    const now = new Date();
    const datasTreino = allTreinamentosRealizados.filter(r => r.data_treinamento).map(r => parseLocalDate(r.data_treinamento));
    const primeiraDataTreino = datasTreino.length > 0 ? new Date(Math.min(...datasTreino.map(d => d.getTime()))) : now;
    let cursorMes = new Date(primeiraDataTreino.getFullYear(), primeiraDataTreino.getMonth(), 1);
    const limiteMes = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursorMes <= limiteMes) {
        const ano = cursorMes.getFullYear(), mes = cursorMes.getMonth();
        meses.push(cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const ini = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        const sublist = allTreinamentosRealizados.filter(r => {
            if (!r.data_treinamento) return false;
            const dt = parseLocalDate(r.data_treinamento);
            return dt >= ini && dt <= fimMes;
        });
        horasPorMes.push(sublist.reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0));
        cursorMes = new Date(ano, mes + 1, 1);
    }
    chartInstances.treinHHTMes = new Chart(document.getElementById('chartTreinHHTMes'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'HHT', data: horasPorMes, backgroundColor: '#4f46e5', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // HHT por setor no período filtrado
    const setorCounts = {};
    periodo.forEach(r => { const s = r.setor || 'Sem setor'; setorCounts[s] = (setorCounts[s] || 0) + (parseFloat(r.carga_horaria) || 0); });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    const treinSetorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartTreinSetor', treinSetorLabels);
    chartInstances.treinSetor = new Chart(document.getElementById('chartTreinSetor'), {
        type: 'bar',
        data: { labels: treinSetorLabels, datasets: [{ label: 'HHT', data: setorSorted.map(s => s[1]), backgroundColor: '#818cf8', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } } }
    });

    // Top 10 temas mais realizados no período filtrado
    const temaCounts = {};
    periodo.forEach(r => { const t = r.treinamento_nome || 'Desconhecido'; temaCounts[t] = (temaCounts[t] || 0) + 1; });
    const temaSorted = Object.entries(temaCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const temaLabels = temaSorted.map(t => wrapChartLabel(t[0]));
    ajustarAlturaBarrasHorizontais('chartTreinTopTemas', temaLabels);
    chartInstances.treinTopTemas = new Chart(document.getElementById('chartTreinTopTemas'), {
        type: 'bar',
        data: { labels: temaLabels, datasets: [{ label: 'Sessões', data: temaSorted.map(t => t[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });
}

// ============================================
// IMPORTAÇÃO DA PLANILHA (CSV no formato atual)
// ============================================

function parseDataBR(str) {
    if (!str) return null;
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length < 4) return null;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function importarTreinamentosCSV() {
    const input = document.getElementById('treinamentosFileInput');
    const statusEl = document.getElementById('treinamentosImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo CSV primeiro.';
        return;
    }

    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const rawText = await file.text();
        const text = rawText.replace(/^﻿/, ''); // remove BOM
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            statusEl.textContent = '❌ Arquivo vazio ou sem linhas de dados.';
            return;
        }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });

        function col(parts, name) {
            const i = idx[name.toUpperCase()];
            return i !== undefined ? (parts[i] || '').trim() : '';
        }

        const catalogoMap = new Map();
        const realizadosMap = new Map();
        let puladas = 0;

        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const matricula = col(parts, 'MATRICULA').toUpperCase();
            const treinamento = col(parts, 'TREINAMENTO');
            const dataTreino = parseDataBR(col(parts, 'Data do Treinamento'));

            if (!matricula || !treinamento || !dataTreino) {
                puladas++;
                continue;
            }

            // Nem toda sessão de DDS tem código atribuído na planilha (~3.700 linhas reais
            // da base atual estão nesse caso) - sem isso, essas sessões (com matrícula, nome
            // e data completos) eram descartadas do relatório de HHT por engano. Quando falta
            // o código, usa o próprio nome do treinamento, normalizado, como identificador.
            let cod = col(parts, 'COD');
            if (!cod) {
                cod = 'NOME_' + treinamento.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').slice(0, 60);
            }

            const cargaH = parseFloat((col(parts, 'CARGA_H') || '0').replace(',', '.')) || 0;
            const mesesStr = col(parts, 'Meses');
            const meses = mesesStr ? parseInt(mesesStr, 10) : null;
            const dataReciclagem = parseDataBR(col(parts, 'Data da Próxima Reciclagem'));

            if (!catalogoMap.has(cod)) {
                catalogoMap.set(cod, { id: cod, nome: treinamento, carga_horaria: cargaH, meses_validade: meses });
            }

            const id = `${matricula}_${cod}_${dataTreino}`;
            realizadosMap.set(id, {
                id,
                matricula,
                nome: col(parts, 'NOME'),
                funcao: col(parts, 'FUNCAO'),
                setor: col(parts, 'SETOR'),
                status_colaborador: col(parts, 'STATUS'),
                treinamento_cod: cod,
                treinamento_nome: treinamento,
                carga_horaria: cargaH,
                data_treinamento: dataTreino,
                meses_validade: meses,
                data_proxima_reciclagem: dataReciclagem,
                observacoes: col(parts, 'Obs.')
            });
        }

        const catalogoArr = Array.from(catalogoMap.values());
        const realizadosArr = Array.from(realizadosMap.values());

        statusEl.textContent = `Enviando ${catalogoArr.length} tipos de treinamento...`;
        await supabaseUpsert('treinamentos_catalogo', catalogoArr);

        const BATCH_SIZE = 500;
        let enviados = 0;
        for (let i = 0; i < realizadosArr.length; i += BATCH_SIZE) {
            const batch = realizadosArr.slice(i, i + BATCH_SIZE);
            await supabaseUpsert('treinamentos_realizados', batch);
            enviados += batch.length;
            statusEl.textContent = `Enviando sessões... ${enviados}/${realizadosArr.length}`;
        }

        statusEl.textContent = `✅ Importação concluída! ${enviados} sessões e ${catalogoArr.length} tipos de treinamento importados/atualizados. ${puladas} linha(s) pulada(s) por dado incompleto (matrícula, código, treinamento ou data faltando).`;
        treinamentosLoaded = true;
        await loadTreinamentosData();
    } catch (err) {
        console.error('Erro ao importar planilha de treinamentos:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ============================================
// LANÇAMENTO EM MASSA DE TREINAMENTO - substitui o fluxo atual do usuário em Excel
// (digitar matrícula → nome/função/setor aparecem via VLOOKUP, digitar código →
// tema aparece, digitar data). Aqui: escolhe o treinamento (código com carga horária
// e validade já vindos do catálogo) e a data uma única vez, depois marca/desmarca
// presença numa lista - "carregar equipe do responsável" resolve o caso comum descrito
// pelo usuário (cada lista já é uma equipe fixa por encarregado, só tira quem faltou).
// ============================================

let lancTreinEquipe = new Map(); // matricula -> {nome, funcao, setor, checked}

// A página de Treinamentos é dividida em abas (Visão Geral/Lançar/Catálogo) - esse
// form vive sempre visível dentro da própria aba "Lançar", então essa função virou
// puramente um reset (chamada pelo botão "Novo Lançamento" e uma vez no carregamento
// inicial), não abre/fecha mais um card escondido.
function abrirFormLancarTreinamento() {
    document.getElementById('lancTreinCodigo').value = '';
    document.getElementById('lancTreinData').value = new Date().toISOString().split('T')[0];
    document.getElementById('lancTreinInfo').style.display = 'none';
    document.getElementById('lancTreinStatus').textContent = '';
    document.getElementById('lancTreinAddColab').value = '';
    document.getElementById('lancTreinAddColabResults').innerHTML = '';
    document.getElementById('lancTreinResponsavel').value = '';

    popularCatalogoDatalist();
    popularResponsavelSelect();

    lancTreinEquipe = new Map();
    renderListaPresencaEquipe();
}

function fecharFormLancarTreinamento() {
    showTreinSubtab('visao');
}

function refreshCatalogoDatalist() {
    const dl = document.getElementById('lancTreinCatalogoList');
    if (!dl) return;
    dl.innerHTML = '';
    allTreinamentosCatalogo.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = `${c.id} - ${c.nome}`;
        dl.appendChild(opt);
    });
}

function popularCatalogoDatalist() {
    const dl = document.getElementById('lancTreinCatalogoList');
    if (!dl || dl.options.length > 0) return;
    refreshCatalogoDatalist();
}

function popularResponsavelSelect() {
    const sel = document.getElementById('lancTreinResponsavel');
    if (!sel || sel.options.length > 1) return;
    const responsaveis = new Set();
    allEfetivo.forEach(e => { if (e.status === 'ATIVO' && e.responsavel) responsaveis.add(e.responsavel); });
    Array.from(responsaveis).sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
}

// Datalist devolve "CODIGO - Nome do treinamento" quando escolhido da lista, mas
// aceita digitar só o código direto (fluxo que o usuário já usa no Excel) - o split
// pega sempre o primeiro pedaço, então funciona mesmo se o nome do treinamento tiver
// " - " no meio (ex: "NR.10 - SEGURANÇA...").
function extrairCodigoTreinamento(raw) {
    return raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
}

function onLancTreinCodigoChange() {
    const codigo = extrairCodigoTreinamento(document.getElementById('lancTreinCodigo').value);
    const infoEl = document.getElementById('lancTreinInfo');
    if (!codigo) { infoEl.style.display = 'none'; return; }

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    infoEl.style.display = 'block';
    if (!cat) {
        infoEl.style.color = 'var(--danger)';
        infoEl.innerHTML = '❌ Código não encontrado no catálogo de treinamentos.';
        return;
    }
    infoEl.style.color = 'var(--text)';
    infoEl.innerHTML = `<strong>${escapeHTML(cat.nome)}</strong> — Carga horária: ${cat.carga_horaria || 0}h — ${cat.meses_validade ? `Validade: ${cat.meses_validade} meses` : 'Sem validade (não recicla)'}`;
}

function carregarEquipeResponsavel() {
    const responsavel = document.getElementById('lancTreinResponsavel').value;
    if (!responsavel) return;
    allEfetivo.filter(e => e.status === 'ATIVO' && e.responsavel === responsavel).forEach(e => {
        if (!lancTreinEquipe.has(e.id)) {
            lancTreinEquipe.set(e.id, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
        }
    });
    renderListaPresencaEquipe();
}

function filterAddColabLista(query) {
    const container = document.getElementById('lancTreinAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    const matches = allEfetivo.filter(e =>
        e.status === 'ATIVO' && !lancTreinEquipe.has(e.id) &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarColabAvulso('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}</div>
        </div>`).join('');
}

function adicionarColabAvulso(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    lancTreinEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
    document.getElementById('lancTreinAddColab').value = '';
    document.getElementById('lancTreinAddColabResults').innerHTML = '';
    renderListaPresencaEquipe();
}

function removerColabLista(matricula) {
    lancTreinEquipe.delete(matricula);
    renderListaPresencaEquipe();
}

function toggleColabPresenca(matricula, checked) {
    const c = lancTreinEquipe.get(matricula);
    if (c) c.checked = checked;
    atualizarContagemPresenca();
}

function atualizarContagemPresenca() {
    const count = Array.from(lancTreinEquipe.values()).filter(c => c.checked).length;
    document.getElementById('lancTreinContagem').textContent = count;
}

function renderListaPresencaEquipe() {
    const container = document.getElementById('lancTreinEquipeList');
    if (lancTreinEquipe.size === 0) {
        container.innerHTML = '<div class="db-list-empty">Selecione um responsável ou adicione colaboradores avulsos acima</div>';
        atualizarContagemPresenca();
        return;
    }
    const entries = Array.from(lancTreinEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    container.innerHTML = entries.map(([matricula, c]) => `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="toggleColabPresenca('${escapeHTML(matricula)}', this.checked)" style="width:17px; height:17px; flex-shrink:0; cursor:pointer;">
            <div style="flex:1;">
                <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
                <div class="db-list-item-sub">${escapeHTML(c.funcao || '')}${c.setor ? ' — ' + escapeHTML(c.setor) : ''} — Matrícula ${escapeHTML(matricula)}</div>
            </div>
            <button onclick="removerColabLista('${escapeHTML(matricula)}')" title="Remover da lista" style="background:none; border:none; color: var(--danger); cursor:pointer; font-size: 16px; padding: 4px;">✕</button>
        </div>`).join('');
    atualizarContagemPresenca();
}

async function salvarLancamentoTreinamento() {
    const statusEl = document.getElementById('lancTreinStatus');
    const codigo = extrairCodigoTreinamento(document.getElementById('lancTreinCodigo').value);
    const data = document.getElementById('lancTreinData').value;

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) {
        statusEl.textContent = '❌ Informe um código de treinamento válido do catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    if (!data) {
        statusEl.textContent = '❌ Informe a data do treinamento.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const selecionados = Array.from(lancTreinEquipe.entries()).filter(([, c]) => c.checked);
    if (selecionados.length === 0) {
        statusEl.textContent = '❌ Selecione ao menos um colaborador na lista de presença.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    // Próxima reciclagem = data + meses_validade do catálogo, calculado aqui (sem
    // planilha por trás desta vez) - monta a string manualmente a partir dos
    // componentes locais da data pra não arriscar um deslocamento de fuso horário
    // que toISOString() poderia introduzir.
    let dataProximaReciclagem = null;
    if (cat.meses_validade) {
        const d = parseLocalDate(data);
        const alvo = new Date(d.getFullYear(), d.getMonth() + cat.meses_validade, d.getDate());
        dataProximaReciclagem = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
    }

    const rows = selecionados.map(([matricula, c]) => {
        const efetivo = allEfetivo.find(e => e.id === matricula);
        return {
            id: `${matricula}_${codigo}_${data}`,
            matricula,
            nome: c.nome,
            funcao: c.funcao,
            setor: c.setor,
            status_colaborador: efetivo ? efetivo.status : 'ATIVO',
            treinamento_cod: codigo,
            treinamento_nome: cat.nome,
            carga_horaria: cat.carga_horaria,
            data_treinamento: data,
            meses_validade: cat.meses_validade,
            data_proxima_reciclagem: dataProximaReciclagem,
            observacoes: ''
        };
    });

    statusEl.textContent = `Enviando ${rows.length} registro(s)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_realizados', rows);
        statusEl.textContent = `✅ ${rows.length} colaborador(es) lançado(s) em "${cat.nome}" (${formatSimpleDate(data)}).`;
        statusEl.style.color = 'var(--success)';
        treinamentosLoaded = true;
        await loadTreinamentosData();
        setTimeout(() => fecharFormLancarTreinamento(), 1800);
    } catch (err) {
        console.error('Erro ao lançar treinamento:', err);
        statusEl.textContent = '❌ Falha ao lançar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// CATÁLOGO DE TREINAMENTOS - cadastro/edição de tipo de treinamento (código, nome,
// carga horária, validade). Sem isso, a única forma de criar um código era a
// importação por CSV; agora dá pra criar/corrigir um treinamento direto no painel.
// Sem exclusão de propósito - códigos já usados em treinamentos_realizados/status não
// devem sumir do catálogo.
// ============================================

// Visão geral: total cadastrado, quantos têm validade (reciclagem) x quantos não
// (DDS pontuais) e a carga horária somada de todo o catálogo.
function renderCatalogoResumo() {
    const el = document.getElementById('catalogoResumo');
    if (!el) return;
    const total = allTreinamentosCatalogo.length;
    const comValidade = allTreinamentosCatalogo.filter(c => c.meses_validade).length;
    const cargaTotal = allTreinamentosCatalogo.reduce((sum, c) => sum + (parseFloat(c.carga_horaria) || 0), 0);
    el.textContent = total === 0 ? '' :
        `${total} treinamento(s) cadastrado(s) — ${comValidade} com validade (reciclagem), ${total - comValidade} sem validade — ${cargaTotal.toLocaleString('pt-BR')}h de carga horária somada`;
}

function filterCatalogoTreinamentos(query) {
    const container = document.getElementById('catalogoSearchResults');
    const q = (query || '').toLowerCase().trim();

    // Sem busca, mostra o catálogo inteiro (visão geral) em vez de ficar vazio até o
    // usuário digitar algo - a busca só entra pra estreitar a lista.
    const base = q.length < 2
        ? allTreinamentosCatalogo
        : allTreinamentosCatalogo.filter(c => (c.nome && c.nome.toLowerCase().includes(q)) || (c.id && c.id.toLowerCase().includes(q)));
    const matches = base.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (matches.length === 0) {
        container.innerHTML = q.length < 2
            ? '<div class="db-list-empty">Nenhum treinamento cadastrado ainda</div>'
            : `<div class="db-list-empty">Nenhum treinamento encontrado para "${escapeHTML(query)}"</div>`;
        return;
    }
    container.innerHTML = matches.map(c => `
        <div class="db-list-item" style="cursor:pointer;" onclick="abrirFormCatalogoTreinamento('${escapeHTML(c.id)}')">
            <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
            <div class="db-list-item-sub">Código ${escapeHTML(c.id)} — ${c.carga_horaria || 0}h — ${c.meses_validade ? c.meses_validade + ' meses de validade' : 'sem validade'}</div>
        </div>`).join('');
}

function abrirFormCatalogoTreinamento(codigo) {
    const form = document.getElementById('catalogoFormCard');
    const title = document.getElementById('catalogoFormTitle');
    const codigoInput = document.getElementById('catForm_codigo');
    const btnExcluir = document.getElementById('catForm_btnExcluir');
    document.getElementById('catalogoFormStatus').textContent = '';
    document.getElementById('catForm_mesclarPanel').style.display = 'none';

    if (codigo) {
        const c = allTreinamentosCatalogo.find(x => x.id === codigo);
        if (!c) return;
        title.textContent = '✏️ Editar Treinamento';
        codigoInput.value = c.id || '';
        codigoInput.readOnly = true;
        codigoInput.style.background = 'var(--bg)';
        document.getElementById('catForm_nome').value = c.nome || '';
        document.getElementById('catForm_cargaHoraria').value = c.carga_horaria != null ? c.carga_horaria : '';
        document.getElementById('catForm_mesesValidade').value = c.meses_validade != null ? c.meses_validade : '';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '🎓 Novo Treinamento';
        codigoInput.value = '';
        codigoInput.readOnly = false;
        codigoInput.style.background = '';
        document.getElementById('catForm_nome').value = '';
        document.getElementById('catForm_cargaHoraria').value = '';
        document.getElementById('catForm_mesesValidade').value = '';
        btnExcluir.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormCatalogoTreinamento() {
    document.getElementById('catalogoFormCard').style.display = 'none';
    document.getElementById('catForm_mesclarPanel').style.display = 'none';
}

function toggleExpandirCatalogo() {
    const el = document.getElementById('catalogoSearchResults');
    const btn = document.getElementById('btnExpandirCatalogo');
    const expandido = el.style.maxHeight === 'none';
    el.style.maxHeight = expandido ? '420px' : 'none';
    btn.textContent = expandido ? '⛶ Expandir Lista' : '⛶ Recolher Lista';
}

function limparBuscaCatalogo() {
    const input = document.getElementById('catalogoSearchInput');
    input.value = '';
    filterCatalogoTreinamentos('');
    input.focus();
}

// Exclusão (a pedido do usuário, após um caso real de código duplicado por erro de
// digitação: "79" e "128" com o mesmo conteúdo). Se o código nunca foi usado em nenhuma
// sessão, exclui direto. Se já foi usado, não dá pra simplesmente apagar - migra as
// sessões pro treinamento de destino escolhido primeiro (mesmo padrão da reconciliação
// de códigos sintéticos feita manualmente antes), senão o histórico dessas sessões
// ficaria com um treinamento_cod órfão, sem entrada correspondente no catálogo.
function iniciarExclusaoCatalogo() {
    const codigo = document.getElementById('catForm_codigo').value.trim();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) return;
    const emUso = allTreinamentosRealizados.filter(r => r.treinamento_cod === codigo).length;

    if (emUso === 0) {
        if (!confirm(`Excluir "${cat.nome}" (código ${codigo}) do catálogo? Essa ação não pode ser desfeita.`)) return;
        excluirCatalogoDireto(codigo);
        return;
    }

    document.getElementById('catForm_mesclarAviso').innerHTML =
        `⚠️ <strong>"${escapeHTML(cat.nome)}"</strong> tem ${emUso} sessão(ões) já registrada(s). Pra excluir, escolha outro treinamento do catálogo pra migrar essas sessões antes (ex: se cadastrou duplicado por engano, migre pro código correto).`;
    document.getElementById('catForm_mesclarAlvo').value = '';
    document.getElementById('catForm_mesclarPanel').style.display = 'block';
}

async function excluirCatalogoDireto(codigo) {
    const statusEl = document.getElementById('catalogoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('treinamentos_catalogo', codigo);
        allTreinamentosCatalogo = allTreinamentosCatalogo.filter(c => c.id !== codigo);
        refreshCatalogoDatalist();
        renderCatalogoResumo();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput').value);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCatalogoTreinamento(), 900);
    } catch (err) {
        console.error('Erro ao excluir treinamento do catálogo:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function confirmarMesclarExcluir() {
    const statusEl = document.getElementById('catalogoFormStatus');
    const origCodigo = document.getElementById('catForm_codigo').value.trim();
    const alvoCodigo = extrairCodigoTreinamento(document.getElementById('catForm_mesclarAlvo').value);

    if (!alvoCodigo || alvoCodigo === origCodigo) {
        statusEl.textContent = '❌ Escolha um treinamento de destino diferente do atual.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const catAlvo = allTreinamentosCatalogo.find(c => c.id === alvoCodigo);
    if (!catAlvo) {
        statusEl.textContent = '❌ Treinamento de destino não encontrado no catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const afetadas = allTreinamentosRealizados.filter(r => r.treinamento_cod === origCodigo);
    const linhasAtualizadas = afetadas.map(r => {
        let novaReciclagem = null;
        if (catAlvo.meses_validade && r.data_treinamento) {
            const d = parseLocalDate(r.data_treinamento);
            const alvo = new Date(d.getFullYear(), d.getMonth() + catAlvo.meses_validade, d.getDate());
            novaReciclagem = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
        }
        return {
            ...r,
            treinamento_cod: alvoCodigo,
            treinamento_nome: catAlvo.nome,
            carga_horaria: catAlvo.carga_horaria,
            meses_validade: catAlvo.meses_validade,
            data_proxima_reciclagem: novaReciclagem
        };
    });

    statusEl.textContent = `Migrando ${linhasAtualizadas.length} sessão(ões)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        if (linhasAtualizadas.length > 0) {
            await supabaseUpsert('treinamentos_realizados', linhasAtualizadas);
        }
        await supabaseDelete('treinamentos_catalogo', origCodigo);

        document.getElementById('catForm_mesclarPanel').style.display = 'none';
        statusEl.textContent = `✅ ${linhasAtualizadas.length} sessão(ões) migrada(s) para "${catAlvo.nome}" e treinamento antigo excluído.`;
        statusEl.style.color = 'var(--success)';

        treinamentosLoaded = true;
        await loadTreinamentosData();
        setTimeout(() => fecharFormCatalogoTreinamento(), 1800);
    } catch (err) {
        console.error('Erro ao mesclar/excluir treinamento:', err);
        statusEl.textContent = '❌ Falha ao mesclar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarCatalogoTreinamento() {
    const statusEl = document.getElementById('catalogoFormStatus');
    const codigoInput = document.getElementById('catForm_codigo');
    const codigo = codigoInput.value.trim();
    const nome = document.getElementById('catForm_nome').value.trim();
    const cargaStr = document.getElementById('catForm_cargaHoraria').value;
    const mesesStr = document.getElementById('catForm_mesesValidade').value;

    if (!codigo || !nome || cargaStr === '') {
        statusEl.textContent = '❌ Código, nome e carga horária são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const isNovo = !codigoInput.readOnly;
    if (isNovo && allTreinamentosCatalogo.some(c => c.id === codigo)) {
        statusEl.textContent = '❌ Já existe um treinamento com esse código - busque por ele na lista acima pra editar.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const row = {
        id: codigo,
        nome,
        carga_horaria: parseFloat(cargaStr),
        meses_validade: mesesStr !== '' ? parseInt(mesesStr, 10) : null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_catalogo', [row]);
        const idx = allTreinamentosCatalogo.findIndex(c => c.id === codigo);
        if (idx >= 0) allTreinamentosCatalogo[idx] = { ...allTreinamentosCatalogo[idx], ...row };
        else allTreinamentosCatalogo.push(row);

        refreshCatalogoDatalist();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput').value);
        renderCatalogoResumo();

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCatalogoTreinamento(), 900);
    } catch (err) {
        console.error('Erro ao salvar treinamento no catálogo:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// EFETIVO (Parte B) - replica as fórmulas já usadas na aba TBs_DINAMICAS da
// planilha TREINAMENTOS_EFETIVO.xlsx: admissões/demissões por COUNTIF de mês,
// efetivo real como headcount na data, índice = HHT do mês ÷ efetivo do mês × 100.
// ============================================

let allEfetivo = [];
let efetivoLoaded = false;

async function loadEfetivoData() {
    const statusEl = document.getElementById('efetivoImportStatus');
    try {
        allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        if (!treinamentosLoaded) {
            treinamentosLoaded = true;
            await loadTreinamentosData();
        }
        renderEfetivoPanel();
        renderEfetivoResumo();
        filterEfetivoColaboradores(document.getElementById('efetivoSearchInput')?.value || '');
    } catch (err) {
        console.error('Erro ao carregar dados de efetivo:', err);
        if (statusEl) statusEl.textContent = '❌ Falha ao carregar dados de efetivo.';
    }
}

// Abas da página Efetivo (Visão Geral / Colaboradores) - mesmo raciocínio de
// self-heal do showTreinSubtab: sempre re-renderiza a Visão Geral ao entrar nela.
function showEfetivoSubtab(tab) {
    ['visao', 'colaboradores'].forEach(t => {
        const content = document.getElementById('efetivoSubtab-' + t);
        const btn = document.getElementById('efetivoSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderEfetivoPanel();
}

// ============================================
// EFETIVO - busca de colaborador (ativo/inativo, admissão/demissão, tempo de casa,
// aniversário e situação de treinamentos), a pedido do cliente.
// ============================================

// Resumo geral da lista de colaboradores (visão geral rápida, mesmo espírito do
// catalogoResumo): total, quantos ativos x inativos.
function renderEfetivoResumo() {
    const el = document.getElementById('efetivoResumo');
    if (!el) return;
    const total = allEfetivo.length;
    const ativos = allEfetivo.filter(e => e.dt_admissao && !e.dt_demissao).length;
    el.textContent = total === 0 ? '' : `${total} colaborador(es) cadastrado(s) — ${ativos} ativo(s), ${total - ativos} inativo(s)`;
}

function limparBuscaEfetivo() {
    const input = document.getElementById('efetivoSearchInput');
    input.value = '';
    filterEfetivoColaboradores('');
    input.focus();
}

function filterEfetivoColaboradores(query) {
    const container = document.getElementById('efetivoSearchResults');
    const detail = document.getElementById('efetivoColabDetail');
    const q = (query || '').toLowerCase().trim();

    // Sem busca, mostra todo mundo (visão geral) em vez de ficar vazio - a busca só
    // entra pra estreitar a lista, mesmo padrão já usado no Catálogo de Treinamentos.
    const base = q.length < 2
        ? allEfetivo
        : allEfetivo.filter(e => (e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)));
    const matches = base.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (matches.length === 0) {
        container.innerHTML = q.length < 2
            ? '<div class="db-list-empty">Nenhum colaborador cadastrado ainda</div>'
            : `<div class="db-list-empty">Nenhum colaborador encontrado para "${escapeHTML(query)}"</div>`;
        return;
    }

    container.innerHTML = matches.map(e => {
        const ativo = e.dt_admissao && !e.dt_demissao;
        const cls = ativo ? '' : 'db-item-danger';
        return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '(sem nome)')}</div>
            <div class="db-list-item-sub">Matrícula ${escapeHTML(e.id)} — ${escapeHTML(e.funcao || '')}${ativo ? '' : ' (Inativo)'}</div>
        </div>`;
    }).join('');
}

function calcularIdade(dataNascimento, hoje) {
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const aindaNaoFezAniversario = (hoje.getMonth() < dataNascimento.getMonth()) ||
        (hoje.getMonth() === dataNascimento.getMonth() && hoje.getDate() < dataNascimento.getDate());
    if (aindaNaoFezAniversario) idade--;
    return idade;
}

function diasProximoAniversario(dataNascimento, hoje) {
    let prox = new Date(hoje.getFullYear(), dataNascimento.getMonth(), dataNascimento.getDate());
    if (prox < hoje) prox = new Date(hoje.getFullYear() + 1, dataNascimento.getMonth(), dataNascimento.getDate());
    return Math.ceil((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

let colabTreinamentosDetalhe = [];
let colabTreinBadgeAberto = null;

// Mostra/esconde a lista de treinamentos por trás de um badge (vencido/vencendo/
// válido/sem validade) clicado no card de detalhe do colaborador.
function toggleTreinamentosBadge(status) {
    const container = document.getElementById('colabTreinDetalheLista');
    if (!container) return;

    if (colabTreinBadgeAberto === status) {
        container.style.display = 'none';
        colabTreinBadgeAberto = null;
        return;
    }
    colabTreinBadgeAberto = status;

    const itens = colabTreinamentosDetalhe.filter(t => t.status === status).sort((a, b) => {
        if (a.diff === null || b.diff === null) return (a.treinamento_nome || '').localeCompare(b.treinamento_nome || '');
        return a.diff - b.diff;
    });

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum treinamento nessa categoria</div>';
        container.style.display = 'block';
        return;
    }

    container.innerHTML = itens.map(t => {
        let statusTxt;
        if (t.status === 'vencido') statusTxt = `Venceu há ${Math.abs(t.diff)} dia(s)`;
        else if (t.status === 'vencendo') statusTxt = t.diff === 0 ? 'Vence hoje' : `Vence em ${t.diff} dia(s)`;
        else if (t.status === 'valido') statusTxt = `Válido (${t.diff} dias restantes)`;
        else statusTxt = 'Sem validade / não recicla';
        return `
            <div class="db-list-item" style="font-size: 12.5px;">
                <div class="db-list-item-title">${escapeHTML(t.treinamento_nome || t.treinamento_cod || '')}</div>
                <div class="db-list-item-sub">${statusTxt} — Última realização: ${t.data_treinamento ? formatSimpleDate(t.data_treinamento) : '—'}${t.data_proxima_reciclagem ? ' • Válido até: ' + formatSimpleDate(t.data_proxima_reciclagem) : ''}</div>
            </div>`;
    }).join('');
    container.style.display = 'block';
}

function mostrarDetalheColaborador(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const admissao = e.dt_admissao ? parseLocalDate(e.dt_admissao) : null;
    const demissao = e.dt_demissao ? parseLocalDate(e.dt_demissao) : null;
    const ativo = admissao && !demissao;

    const statusBadge = ativo
        ? `<span style="font-size: 11px; padding: 3px 10px; border-radius: 8px; background: #d1fae5; color: #047857; font-weight: 700;">🟢 ATIVO</span>`
        : `<span style="font-size: 11px; padding: 3px 10px; border-radius: 8px; background: #fee2e2; color: #b91c1c; font-weight: 700;">🔴 ${escapeHTML(e.status || 'INATIVO')}</span>`;

    let tempoCasaTxt = '—';
    if (admissao) {
        const fimRef = demissao || hoje;
        const totalMeses = Math.floor((fimRef.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const anos = Math.floor(totalMeses / 12);
        const mesesResto = totalMeses % 12;
        tempoCasaTxt = anos > 0 ? `${anos} ano(s) e ${mesesResto} mês(es)` : `${mesesResto} mês(es)`;
        if (demissao) tempoCasaTxt += ' (até a demissão)';
    }

    let aniversarioTxt = '—';
    if (e.dt_nascimento) {
        const dn = parseLocalDate(e.dt_nascimento);
        const idade = calcularIdade(dn, hoje);
        const diffDias = diasProximoAniversario(dn, hoje);
        aniversarioTxt = `${dn.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} (${idade} anos)`;
        if (diffDias === 0) aniversarioTxt += ' — 🎂 é hoje!';
        else if (diffDias <= 30) aniversarioTxt += ` — 🎂 em ${diffDias} dia(s)`;
    }

    // Situação de treinamentos, se já carregada (loadEfetivoData sempre garante o carregamento).
    // Nem todo treinamento tem validade (DDS pontuais têm meses_validade nulo) - esses
    // entram no bucket "sem validade" pra não sumir da contagem total. Os badges são
    // clicáveis (toggleTreinamentosBadge) pra mostrar quais treinamentos exatamente caem
    // em cada categoria - antes só dava pra ver a contagem, sem saber quais.
    let treinHtml = '';
    const regs = allTreinamentosStatus.filter(t => t.matricula === matricula);
    colabTreinamentosDetalhe = [];
    colabTreinBadgeAberto = null;
    if (regs.length > 0) {
        let vencidos = 0, vencendo = 0, validos = 0, semValidade = 0;
        regs.forEach(t => {
            let diff = null, status;
            if (!t.data_proxima_reciclagem) {
                status = 'sem_validade';
                semValidade++;
            } else {
                const d = parseLocalDate(t.data_proxima_reciclagem);
                diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                if (diff < 0) { status = 'vencido'; vencidos++; }
                else if (diff <= 30) { status = 'vencendo'; vencendo++; }
                else { status = 'valido'; validos++; }
            }
            colabTreinamentosDetalhe.push({ ...t, diff, status });
        });
        treinHtml = `
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border);">
                <div style="font-size: 11px; color: var(--text-light); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Situação de Treinamentos (${regs.length}) <span style="font-weight: 400; text-transform: none;">— clique numa categoria pra ver quais</span></div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button style="font-size: 11px; padding: 4px 10px; border-radius: 6px; background: #fee2e2; color: #b91c1c; font-weight: 600; border: 1px solid #fecaca; cursor: pointer;" onclick="toggleTreinamentosBadge('vencido')">🔴 ${vencidos} vencido(s)</button>
                    <button style="font-size: 11px; padding: 4px 10px; border-radius: 6px; background: #fef3c7; color: #92400e; font-weight: 600; border: 1px solid #fde68a; cursor: pointer;" onclick="toggleTreinamentosBadge('vencendo')">🟡 ${vencendo} vencendo</button>
                    <button style="font-size: 11px; padding: 4px 10px; border-radius: 6px; background: #d1fae5; color: #047857; font-weight: 600; border: 1px solid #a7f3d0; cursor: pointer;" onclick="toggleTreinamentosBadge('valido')">🟢 ${validos} válido(s)</button>
                    <button style="font-size: 11px; padding: 4px 10px; border-radius: 6px; background: #e0e7ff; color: #3730a3; font-weight: 600; border: 1px solid #c7d2fe; cursor: pointer;" onclick="toggleTreinamentosBadge('sem_validade')">🔵 ${semValidade} sem validade</button>
                </div>
                <div id="colabTreinDetalheLista" class="db-list" style="display:none; margin-top: 10px; max-height: 280px;"></div>
            </div>`;
    }

    const detail = document.getElementById('efetivoColabDetail');
    detail.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-size: 16px; font-weight: 700;">${escapeHTML(e.nome || '')}</div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">${escapeHTML(e.funcao || '')}${e.setor ? ' — ' + escapeHTML(e.setor) : ''}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                ${statusBadge}
                <button class="db-clear-btn" onclick="abrirFormEfetivo('${escapeHTML(matricula)}')">✏️ Editar</button>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 14px; font-size: 12.5px;">
            <div><strong>Matrícula:</strong> ${escapeHTML(e.id)}</div>
            <div><strong>Admissão:</strong> ${admissao ? formatSimpleDate(e.dt_admissao) : '—'}</div>
            <div><strong>Demissão:</strong> ${demissao ? formatSimpleDate(e.dt_demissao) : '—'}</div>
            <div><strong>Tempo de casa:</strong> ${tempoCasaTxt}</div>
            <div><strong>Aniversário:</strong> ${aniversarioTxt}</div>
            <div><strong>Responsável:</strong> ${escapeHTML(e.responsavel || '—')}</div>
            <div><strong>Cidade/UF:</strong> ${escapeHTML(e.cidade || '—')}${e.estado ? '/' + escapeHTML(e.estado) : ''}</div>
            <div><strong>Estabilidade:</strong> ${escapeHTML(e.estabilidade || '—')}</div>
            <div><strong>GHE:</strong> ${escapeHTML(e.ghe || '—')}</div>
            <div><strong>CPF:</strong> ${escapeHTML(e.cpf || '—')}</div>
            <div><strong>Uniforme:</strong> Calça ${escapeHTML(e.calca || '—')} / Camisa ${escapeHTML(e.camisa || '—')} / Bota ${escapeHTML(e.bota || '—')}</div>
            <div><strong>Sexo:</strong> ${escapeHTML(e.sexo || '—')}</div>
        </div>
        ${treinHtml}
    `;
    detail.style.display = 'block';
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Cadastro/edição manual de colaborador, complementando a importação em massa por CSV -
// depois que a base estiver preenchida, o dia a dia (admissão/demissão/correção pontual)
// não precisa mais passar por planilha.
function abrirFormEfetivo(matricula) {
    const form = document.getElementById('efetivoFormCard');
    const title = document.getElementById('efetivoFormTitle');
    const matriculaInput = document.getElementById('efForm_matricula');
    document.getElementById('efetivoFormStatus').textContent = '';

    if (matricula) {
        const e = allEfetivo.find(x => x.id === matricula);
        if (!e) return;
        title.textContent = '✏️ Editar Colaborador';
        matriculaInput.value = e.id || '';
        matriculaInput.readOnly = true;
        matriculaInput.style.background = 'var(--bg)';
        document.getElementById('efForm_nome').value = e.nome || '';
        document.getElementById('efForm_status').value = e.status || 'ATIVO';
        document.getElementById('efForm_funcao').value = e.funcao || '';
        document.getElementById('efForm_setor').value = e.setor || '';
        document.getElementById('efForm_responsavel').value = e.responsavel || '';
        document.getElementById('efForm_dt_admissao').value = e.dt_admissao || '';
        document.getElementById('efForm_dt_demissao').value = e.dt_demissao || '';
        document.getElementById('efForm_dt_nascimento').value = e.dt_nascimento || '';
        document.getElementById('efForm_cpf').value = e.cpf || '';
        document.getElementById('efForm_cidade').value = e.cidade || '';
        document.getElementById('efForm_estado').value = e.estado || '';
        document.getElementById('efForm_estabilidade').value = e.estabilidade || 'NÃO';
        document.getElementById('efForm_ghe').value = e.ghe || '';
        document.getElementById('efForm_sexo').value = e.sexo || 'MASCULINO';
        document.getElementById('efForm_calca').value = e.calca || '';
        document.getElementById('efForm_camisa').value = e.camisa || '';
        document.getElementById('efForm_bota').value = e.bota || '';
    } else {
        title.textContent = '👤 Novo Colaborador';
        ['matricula', 'nome', 'funcao', 'setor', 'responsavel', 'dt_admissao', 'dt_demissao', 'dt_nascimento', 'cpf', 'cidade', 'estado', 'ghe', 'calca', 'camisa', 'bota']
            .forEach(f => { const el = document.getElementById('efForm_' + f); if (el) el.value = ''; });
        document.getElementById('efForm_status').value = 'ATIVO';
        document.getElementById('efForm_estabilidade').value = 'NÃO';
        document.getElementById('efForm_sexo').value = 'MASCULINO';
        matriculaInput.readOnly = false;
        matriculaInput.style.background = '';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormEfetivo() {
    document.getElementById('efetivoFormCard').style.display = 'none';
}

async function salvarColaboradorEfetivo() {
    const statusEl = document.getElementById('efetivoFormStatus');
    const matricula = document.getElementById('efForm_matricula').value.trim();
    const nome = document.getElementById('efForm_nome').value.trim();

    if (!matricula || !nome) {
        statusEl.textContent = '❌ Matrícula e nome são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const row = {
        id: matricula,
        status: document.getElementById('efForm_status').value,
        nome,
        funcao: document.getElementById('efForm_funcao').value.trim(),
        setor: document.getElementById('efForm_setor').value.trim(),
        responsavel: document.getElementById('efForm_responsavel').value.trim(),
        dt_admissao: document.getElementById('efForm_dt_admissao').value || null,
        dt_demissao: document.getElementById('efForm_dt_demissao').value || null,
        dt_nascimento: document.getElementById('efForm_dt_nascimento').value || null,
        cpf: document.getElementById('efForm_cpf').value.trim(),
        cidade: document.getElementById('efForm_cidade').value.trim(),
        estado: document.getElementById('efForm_estado').value.trim(),
        estabilidade: document.getElementById('efForm_estabilidade').value,
        ghe: document.getElementById('efForm_ghe').value.trim(),
        sexo: document.getElementById('efForm_sexo').value,
        calca: document.getElementById('efForm_calca').value.trim(),
        camisa: document.getElementById('efForm_camisa').value.trim(),
        bota: document.getElementById('efForm_bota').value.trim()
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('colaboradores_efetivo', [row]);
        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) allEfetivo[idx] = { ...allEfetivo[idx], ...row };
        else allEfetivo.push(row);

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        renderEfetivoPanel();
        renderEfetivoResumo();
        filterEfetivoColaboradores(document.getElementById('efetivoSearchInput').value);
        setTimeout(() => {
            fecharFormEfetivo();
            mostrarDetalheColaborador(matricula);
        }, 600);
    } catch (err) {
        console.error('Erro ao salvar colaborador:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function headcountAsOf(dateEnd) {
    return allEfetivo.filter(e => {
        if (!e.dt_admissao) return false;
        if (parseLocalDate(e.dt_admissao) > dateEnd) return false;
        if (!e.dt_demissao) return true;
        return parseLocalDate(e.dt_demissao) > dateEnd;
    }).length;
}

// HHT normativo (Efetivo do mês × 220h) - denominador padrão de exposição usado tanto
// no índice HHT/Efetivo quanto nas taxas de frequência/gravidade (módulo de
// Acidentabilidade). Extraído aqui pra ser reutilizável fora do render do Efetivo.
function hht220DoMes(ano, mesIndex0) {
    const fimMes = new Date(ano, mesIndex0 + 1, 0);
    return headcountAsOf(fimMes) * 220;
}

function hhtDoMes(ano, mesIndex0) {
    const ini = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    return allTreinamentosRealizados
        .filter(r => { if (!r.data_treinamento) return false; const d = parseLocalDate(r.data_treinamento); return d >= ini && d <= fim; })
        .reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0);
}

let efetivoFiltroAno = '';
let efetivoFiltroMes = '';

// Popula o select de anos com base nos dados reais (admissão/demissão), não uma lista
// fixa - "dinâmico" a pedido do usuário, então acompanha a base automaticamente.
function popularFiltroAnoEfetivo() {
    const anos = new Set([new Date().getFullYear()]);
    allEfetivo.forEach(e => {
        if (e.dt_admissao) anos.add(parseLocalDate(e.dt_admissao).getFullYear());
        if (e.dt_demissao) anos.add(parseLocalDate(e.dt_demissao).getFullYear());
    });
    popularSelectAnos('efetivoFiltroAno', anos);
}

function onEfetivoFiltroChange() {
    efetivoFiltroAno = document.getElementById('efetivoFiltroAno').value;
    efetivoFiltroMes = document.getElementById('efetivoFiltroMes').value;
    renderEfetivoPanel();
}

function limparFiltroEfetivo() {
    document.getElementById('efetivoFiltroAno').value = '';
    document.getElementById('efetivoFiltroMes').value = '';
    efetivoFiltroAno = '';
    efetivoFiltroMes = '';
    renderEfetivoPanel();
}

function renderEfetivoPanel() {
    if (allEfetivo.length === 0) return;
    popularFiltroAnoEfetivo();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Mês sem ano selecionado não tem sentido sozinho (mês de qual ano?), então só
    // entra em vigor quando o ano também está selecionado.
    const anoSel = efetivoFiltroAno ? parseInt(efetivoFiltroAno, 10) : null;
    const mesSel = (anoSel !== null && efetivoFiltroMes !== '') ? parseInt(efetivoFiltroMes, 10) : null;
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // periodoInicio/periodoFim definem a janela usada nos KPIs de admissões/demissões/
    // turnover; dataRef é o "hoje" usado pro efetivo atual e tempo de casa - sem filtro,
    // os dois continuam exatamente como antes (hoje / últimos 12 meses).
    let periodoInicio, periodoFim, dataRef, tituloPeriodo;
    if (anoSel !== null && mesSel !== null) {
        periodoInicio = new Date(anoSel, mesSel, 1);
        const fimMesCalc = new Date(anoSel, mesSel + 1, 0);
        periodoFim = fimMesCalc > hoje ? hoje : fimMesCalc;
        dataRef = periodoFim;
        tituloPeriodo = `${nomesMeses[mesSel]} de ${anoSel}`;
    } else if (anoSel !== null) {
        periodoInicio = new Date(anoSel, 0, 1);
        const fimAnoCalc = new Date(anoSel, 11, 31);
        periodoFim = fimAnoCalc > hoje ? hoje : fimAnoCalc;
        dataRef = periodoFim;
        tituloPeriodo = `Ano de ${anoSel}`;
    } else {
        periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
        periodoFim = hoje;
        dataRef = hoje;
        tituloPeriodo = 'Últimos 12 meses';
    }
    const periodoTituloEl = document.getElementById('efetivoPeriodoTitulo');
    if (periodoTituloEl) periodoTituloEl.textContent = tituloPeriodo;

    const efetivoAtual = headcountAsOf(dataRef);
    document.getElementById('kpiEfetivoAtual').textContent = efetivoAtual;

    const admissoesPeriodo = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= periodoInicio && parseLocalDate(e.dt_admissao) <= periodoFim).length;
    const demissoesPeriodo = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= periodoInicio && parseLocalDate(e.dt_demissao) <= periodoFim).length;
    document.getElementById('kpiEfetivoAdmissoes').textContent = admissoesPeriodo;
    document.getElementById('kpiEfetivoDemissoes').textContent = demissoesPeriodo;

    const efetivoInicioPeriodo = headcountAsOf(new Date(periodoInicio.getFullYear(), periodoInicio.getMonth(), 0));
    const efetivoMedioPeriodo = (efetivoAtual + efetivoInicioPeriodo) / 2;
    const turnover = efetivoMedioPeriodo > 0 ? (demissoesPeriodo / efetivoMedioPeriodo * 100) : 0;
    document.getElementById('kpiEfetivoTurnover').textContent = turnover.toFixed(1) + '%';

    const ativosNaData = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) <= dataRef && (!e.dt_demissao || parseLocalDate(e.dt_demissao) > dataRef));
    let tempoCasaTotalMeses = 0;
    ativosNaData.forEach(e => {
        const adm = parseLocalDate(e.dt_admissao);
        tempoCasaTotalMeses += (dataRef.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    });
    document.getElementById('kpiEfetivoTempoCasa').textContent = ativosNaData.length > 0 ? Math.round(tempoCasaTotalMeses / ativosNaData.length) : 0;

    // Evolução mensal: com um ano selecionado, mostra só os 12 meses daquele ano (ou até
    // o mês atual, se for o ano corrente); sem filtro, mantém o histórico completo de
    // sempre (da primeira admissão registrada até hoje).
    const meses = [], admissoesPorMes = [], demissoesPorMes = [], efetivoPorMes = [], indicePorMes = [];
    // hht220PorMes: "Horas Homens Trabalhadas" no sentido normativo (efetivo do mês × 220h
    // mês-padrão) - metrica DIFERENTE do HHT de treinamento usado no índice acima; a
    // planilha do cliente rastreia as duas separadamente (confirmado batendo o valor de
    // jul/2024: efetivo 35 × 220 = 7700, exatamente o que a planilha mostra).
    // admArcoverdePorMes/admSertaniaPorMes: admissões do mês por município da ADA (Área
    // Diretamente Afetada) - as duas únicas cidades que contam pra esse indicador.
    const hht220PorMes = [], admArcoverdePorMes = [], admSertaniaPorMes = [];
    let cursor, limite;
    if (anoSel !== null) {
        cursor = new Date(anoSel, 0, 1);
        limite = anoSel === hoje.getFullYear() ? new Date(hoje.getFullYear(), hoje.getMonth(), 1) : new Date(anoSel, 11, 1);
    } else {
        const datasAdmissao = allEfetivo.filter(e => e.dt_admissao).map(e => parseLocalDate(e.dt_admissao));
        const primeiraData = datasAdmissao.length > 0 ? new Date(Math.min(...datasAdmissao.map(d => d.getTime()))) : hoje;
        cursor = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
        limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        meses.push(cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const admDoMes = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= inicioMes && parseLocalDate(e.dt_admissao) <= fimMes);
        const dem = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= inicioMes && parseLocalDate(e.dt_demissao) <= fimMes).length;
        const eft = headcountAsOf(fimMes);
        const hht = hhtDoMes(ano, mes);
        admissoesPorMes.push(admDoMes.length);
        demissoesPorMes.push(dem);
        efetivoPorMes.push(eft);
        indicePorMes.push(eft > 0 ? Math.round((hht / eft) * 100) : 0);
        hht220PorMes.push(eft * 220);
        admArcoverdePorMes.push(admDoMes.filter(e => (e.cidade || '').toUpperCase().trim() === 'ARCOVERDE').length);
        admSertaniaPorMes.push(admDoMes.filter(e => (e.cidade || '').toUpperCase().trim() === 'SERTÂNIA').length);
        cursor = new Date(ano, mes + 1, 1);
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.efetivoEvolucao) chartInstances.efetivoEvolucao.destroy();
    if (chartInstances.efetivoIndice) chartInstances.efetivoIndice.destroy();
    if (chartInstances.efetivoSetor) chartInstances.efetivoSetor.destroy();
    if (chartInstances.efetivoFuncao) chartInstances.efetivoFuncao.destroy();
    if (chartInstances.efetivoHHT220) chartInstances.efetivoHHT220.destroy();
    if (chartInstances.efetivoSexo) chartInstances.efetivoSexo.destroy();
    if (chartInstances.adaAtual) chartInstances.adaAtual.destroy();
    if (chartInstances.adaAdmissoes) chartInstances.adaAdmissoes.destroy();

    chartInstances.efetivoEvolucao = new Chart(document.getElementById('chartEfetivoEvolucao'), {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                { label: 'Efetivo', data: efetivoPorMes, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.08)', fill: true, tension: 0.25, yAxisID: 'y' },
                { label: 'Admissões', data: admissoesPorMes, borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.25, yAxisID: 'y1' },
                { label: 'Demissões', data: demissoesPorMes, borderColor: '#ef4444', backgroundColor: 'transparent', tension: 0.25, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Efetivo' } },
                y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Adm/Dem' } }
            }
        }
    });

    chartInstances.efetivoIndice = new Chart(document.getElementById('chartEfetivoIndice'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'Índice HHT/Efetivo × 100', data: indicePorMes, backgroundColor: '#818cf8', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const setorCounts = {};
    ativosNaData.forEach(e => { const s = e.setor || 'Sem setor'; setorCounts[s] = (setorCounts[s] || 0) + 1; });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    const efetivoSetorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartEfetivoSetor', efetivoSetorLabels);
    chartInstances.efetivoSetor = new Chart(document.getElementById('chartEfetivoSetor'), {
        type: 'bar',
        data: { labels: efetivoSetorLabels, datasets: [{ label: 'Efetivo', data: setorSorted.map(s => s[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    const funcaoCounts = {};
    ativosNaData.forEach(e => { const f = e.funcao || 'Sem função'; funcaoCounts[f] = (funcaoCounts[f] || 0) + 1; });
    const funcaoSorted = Object.entries(funcaoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const efetivoFuncaoLabels = funcaoSorted.map(f => wrapChartLabel(f[0]));
    ajustarAlturaBarrasHorizontais('chartEfetivoFuncao', efetivoFuncaoLabels);
    chartInstances.efetivoFuncao = new Chart(document.getElementById('chartEfetivoFuncao'), {
        type: 'bar',
        data: { labels: efetivoFuncaoLabels, datasets: [{ label: 'Efetivo', data: funcaoSorted.map(f => f[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Horas Homens Trabalhadas normativo (efetivo × 220h/mês) - indicador de exposição
    // usado pra taxas de frequência/gravidade, diferente do HHT de treinamento acima.
    chartInstances.efetivoHHT220 = new Chart(document.getElementById('chartEfetivoHHT220'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'HHT (Efetivo × 220)', data: hht220PorMes, backgroundColor: '#4f46e5', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const sexoCounts = { MASCULINO: 0, FEMININO: 0 };
    ativosNaData.forEach(e => {
        const s = (e.sexo || '').toUpperCase().trim();
        if (sexoCounts[s] !== undefined) sexoCounts[s]++;
    });
    chartInstances.efetivoSexo = new Chart(document.getElementById('chartEfetivoSexo'), {
        type: 'doughnut',
        data: {
            labels: ['Masculino', 'Feminino'],
            datasets: [{ data: [sexoCounts.MASCULINO, sexoCounts.FEMININO], backgroundColor: ['#4f46e5', '#ec4899'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
    });

    // ADA (Área Diretamente Afetada): as duas únicas cidades que contam pro indicador -
    // todo o resto do efetivo (outras cidades de origem) entra em "Outros".
    const adaCounts = { ARCOVERDE: 0, 'SERTÂNIA': 0, OUTROS: 0 };
    ativosNaData.forEach(e => {
        const c = (e.cidade || '').toUpperCase().trim();
        if (c === 'ARCOVERDE') adaCounts.ARCOVERDE++;
        else if (c === 'SERTÂNIA') adaCounts['SERTÂNIA']++;
        else adaCounts.OUTROS++;
    });
    chartInstances.adaAtual = new Chart(document.getElementById('chartAdaAtual'), {
        type: 'doughnut',
        data: {
            labels: ['Arcoverde', 'Sertânia', 'Outros'],
            datasets: [{ data: [adaCounts.ARCOVERDE, adaCounts['SERTÂNIA'], adaCounts.OUTROS], backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'], borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '55%' }
    });

    const totalAda = ativosNaData.length;
    const resumoEl = document.getElementById('adaResumo');
    if (resumoEl) {
        const pct = n => totalAda > 0 ? ((n / totalAda) * 100).toFixed(1) : '0.0';
        resumoEl.innerHTML = `Arcoverde: <strong>${adaCounts.ARCOVERDE}</strong> (${pct(adaCounts.ARCOVERDE)}%) — Sertânia: <strong>${adaCounts['SERTÂNIA']}</strong> (${pct(adaCounts['SERTÂNIA'])}%) — Outros: <strong>${adaCounts.OUTROS}</strong> (${pct(adaCounts.OUTROS)}%)`;
    }

    chartInstances.adaAdmissoes = new Chart(document.getElementById('chartAdaAdmissoes'), {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Arcoverde', data: admArcoverdePorMes, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Sertânia', data: admSertaniaPorMes, backgroundColor: '#f59e0b', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

async function importarEfetivoCSV() {
    const input = document.getElementById('efetivoFileInput');
    const statusEl = document.getElementById('efetivoImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo CSV primeiro.';
        return;
    }

    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const rawText = await file.text();
        const text = rawText.replace(/^﻿/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            statusEl.textContent = '❌ Arquivo vazio ou sem linhas de dados.';
            return;
        }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });
        function col(parts, name) {
            const i = idx[name.toUpperCase()];
            return i !== undefined ? (parts[i] || '').trim() : '';
        }

        const efetivoMap = new Map();
        let puladas = 0;
        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const matricula = col(parts, 'MATRICULA').toUpperCase();
            const nome = col(parts, 'NOME');
            if (!matricula || !nome) { puladas++; continue; }

            efetivoMap.set(matricula, {
                id: matricula,
                status: col(parts, 'STATUS'),
                cpf: col(parts, 'CPF'),
                nome,
                funcao: col(parts, 'FUNCAO'),
                setor: col(parts, 'SETOR'),
                responsavel: col(parts, 'RESPONSAVEL'),
                dt_admissao: parseDataBR(col(parts, 'DT_ADMISSAO')),
                dt_demissao: parseDataBR(col(parts, 'DT_DEMISSAO')),
                dt_nascimento: parseDataBR(col(parts, 'DT_NASCIMENTO')),
                cidade: col(parts, 'CIDADE'),
                estado: col(parts, 'ESTADO'),
                estabilidade: col(parts, 'ESTABILIDADE'),
                ghe: col(parts, 'GHE'),
                calca: col(parts, 'CALCA'),
                camisa: col(parts, 'CAMISA'),
                bota: col(parts, 'BOTA'),
                sexo: col(parts, 'SEXO')
            });
        }

        const efetivoArr = Array.from(efetivoMap.values());
        statusEl.textContent = `Enviando ${efetivoArr.length} colaboradores...`;
        await supabaseUpsert('colaboradores_efetivo', efetivoArr);

        statusEl.textContent = `✅ Importação concluída! ${efetivoArr.length} colaboradores importados/atualizados. ${puladas} linha(s) pulada(s) por dado incompleto.`;
        efetivoLoaded = true;
        await loadEfetivoData();
    } catch (err) {
        console.error('Erro ao importar planilha de efetivo:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ============================================
// ACIDENTABILIDADE (NR-01 / NBR 14280) - TF/TG usam o mesmo HHT normativo (efetivo ×
// 220h) já usado no painel Efetivo. Tabela isolada (acidentes), só lida/escrita aqui.
// ============================================

let allAcidentes = [];
let acidentesLoaded = false;
let acidentesFilter = 'mes';
let acidentesFiltroAno = '';
let acidentesFiltroMes = '';
let hhtDiasTrabalhadosMap = {}; // 'YYYY-MM' -> { dias_trabalhados, horas_por_dia }

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
    allEfetivo.filter(e => e.status === 'ATIVO').sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
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
    const periodo = allAcidentes.filter(a => {
        if (!a.data_acidente) return false;
        const d = parseLocalDate(a.data_acidente);
        return d >= inicio && d <= fim;
    });

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
    const diasPerdidosTotal = periodo.reduce((s, a) => s + (parseInt(a.dias_perdidos, 10) || 0), 0);
    const diasDebitadosTotal = periodo.reduce((s, a) => s + (parseInt(a.dias_debitados, 10) || 0), 0);

    const tfDisponivel = periodoCompleto && hhtPeriodo > 0;
    const tf = tfDisponivel ? (numAcidentes * 1000000 / hhtPeriodo) : 0;
    const tg = tfDisponivel ? ((diasPerdidosTotal + diasDebitadosTotal) * 1000000 / hhtPeriodo) : 0;

    document.getElementById('kpiAcidTF').textContent = tfDisponivel ? tf.toFixed(2) : '—';
    document.getElementById('kpiAcidTG').textContent = tfDisponivel ? tg.toFixed(2) : '—';
    document.getElementById('kpiAcidTotal').textContent = numAcidentes;

    const diasCPT = diasSemAcidente(true);
    const diasSPT = diasSemAcidente(false);
    document.getElementById('kpiAcidDiasSemCPT').textContent = diasCPT === null ? '—' : diasCPT;
    document.getElementById('kpiAcidDiasSemSPT').textContent = diasSPT === null ? '—' : diasSPT;

    const listaEl = document.getElementById('listAcidentesHistorico');
    const periodoOrdenado = periodo.slice().sort((a, b) => (b.data_acidente || '').localeCompare(a.data_acidente || ''));
    if (periodoOrdenado.length === 0) {
        listaEl.innerHTML = '<div class="db-list-empty">✅ Nenhum acidente registrado no período</div>';
    } else {
        listaEl.innerHTML = periodoOrdenado.map(a => {
            const cls = a.com_afastamento ? 'db-item-danger' : 'db-item-warning';
            return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="abrirFormAcidente('${escapeHTML(a.id)}')">
                <div class="db-list-item-title">${escapeHTML(a.tipo_acidente || 'Não especificado')} ${a.com_afastamento ? '(CPT)' : '(SPT)'}</div>
                <div class="db-list-item-sub">${escapeHTML(a.nome_colaborador || 'Não identificado')} — ${formatSimpleDate(a.data_acidente)}${a.setor ? ' — ' + escapeHTML(a.setor) : ''}</div>
            </div>`;
        }).join('');
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.acidTFTG) chartInstances.acidTFTG.destroy();
    if (chartInstances.acidTipologia) chartInstances.acidTipologia.destroy();
    if (chartInstances.acidSetor) chartInstances.acidSetor.destroy();

    // TF/TG por mês - histórico completo desde a primeira admissão registrada (não só
    // desde o primeiro acidente - "0 acidentes" também é um dado válido pra mostrar).
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
        const acidDoMes = allAcidentes.filter(a => a.data_acidente && parseLocalDate(a.data_acidente) >= inicioMes && parseLocalDate(a.data_acidente) <= fimMes);
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
    allAcidentes.forEach(a => { const t = a.tipo_acidente || 'Não especificado'; tipoCounts[t] = (tipoCounts[t] || 0) + 1; });
    const tipoSorted = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    const tipoLabels = tipoSorted.map(t => wrapChartLabel(t[0]));
    ajustarAlturaBarrasHorizontais('chartAcidTipologia', tipoLabels);
    chartInstances.acidTipologia = new Chart(document.getElementById('chartAcidTipologia'), {
        type: 'bar',
        data: { labels: tipoLabels, datasets: [{ label: 'Acidentes', data: tipoSorted.map(t => t[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    const setorCounts = {};
    allAcidentes.forEach(a => { const s = a.setor || 'Não informado'; setorCounts[s] = (setorCounts[s] || 0) + 1; });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    const setorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartAcidSetor', setorLabels);
    chartInstances.acidSetor = new Chart(document.getElementById('chartAcidSetor'), {
        type: 'bar',
        data: { labels: setorLabels, datasets: [{ label: 'Acidentes', data: setorSorted.map(s => s[1]), backgroundColor: '#ef4444', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });
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
// NAVEGAÇÃO ENTRE PÁGINAS (barra lateral)
// ============================================

const DB_PAGE_TITLES = {
    checklists: 'Checklists',
    extintores: 'Extintores',
    relatos: 'Relatos de Problemas',
    treinamentos: 'Treinamentos',
    efetivo: 'Efetivo',
    acidentes: 'Acidentabilidade',
    config: 'Configurações'
};

function showDbPage(pageId) {
    document.querySelectorAll('.db-page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId)?.classList.add('active');

    document.querySelectorAll('.db-nav-item').forEach(el => el.classList.remove('active'));
    const navMap = { checklists: 'navChecklists', extintores: 'navExtintores', relatos: 'navRelatos', treinamentos: 'navTreinamentos', efetivo: 'navEfetivo', acidentes: 'navAcidentes', config: 'navConfig' };
    document.getElementById(navMap[pageId])?.classList.add('active');

    document.getElementById('pageTitle').textContent = DB_PAGE_TITLES[pageId] || '';

    // Sempre re-renderiza os gráficos ao entrar na página (não só na primeira vez) -
    // se o Chart.js criou os gráficos em algum momento em que o canvas ainda não tinha
    // um tamanho real (ex: troca de aba muito rápida logo após o carregamento), eles
    // ficam em branco pra sempre até a página ser recarregada, já que nada mais dispara
    // um redesenho depois disso. Recriar o gráfico do zero a cada visita é barato (não
    // busca nada de novo no Supabase, só usa os dados já carregados em memória) e
    // corrige isso sozinho.
    if (pageId === 'treinamentos') {
        if (!treinamentosLoaded) { treinamentosLoaded = true; loadTreinamentosData(); }
        else renderTreinamentosPanel();
    }
    if (pageId === 'efetivo') {
        if (!efetivoLoaded) { efetivoLoaded = true; loadEfetivoData(); }
        else renderEfetivoPanel();
    }
    if (pageId === 'acidentes') {
        if (!acidentesLoaded) { acidentesLoaded = true; loadAcidentesData(); }
        else renderAcidentesPanel();
    }
}

function showAcidentesSubtab(tab) {
    ['visao', 'registrar', 'hht'].forEach(t => {
        const content = document.getElementById('acidentesSubtab-' + t);
        const btn = document.getElementById('acidentesSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderAcidentesPanel();
    if (tab === 'hht') renderDiasTrabalhadosConfig();
}

// Contrato começou em 12/07/2024 - mês inicial fixo pra listar a configuração de "dias
// trabalhados" desde o começo, mesmo que ainda não haja nenhum efetivo/acidente antes disso.
const ACIDENTES_MES_INICIO_CONTRATO = { ano: 2024, mes: 6 }; // mes 0-indexado (6 = julho)

function renderDiasTrabalhadosConfig() {
    const container = document.getElementById('diasTrabalhadosLista');
    if (!container) return;

    const hoje = new Date();
    const linhas = [];
    let cursor = new Date(ACIDENTES_MES_INICIO_CONTRATO.ano, ACIDENTES_MES_INICIO_CONTRATO.mes, 1);
    const limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const config = hhtDiasTrabalhadosMap[key] || {};
        const headcount = headcountAsOf(new Date(ano, mes + 1, 0));
        const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        linhas.push({ key, ano, mes, label, headcount, dias: config.dias_trabalhados ?? '', horas: config.horas_por_dia ?? 8 });
        cursor = new Date(ano, mes + 1, 1);
    }

    // Mais recente primeiro - é o mês que normalmente precisa de atenção.
    linhas.reverse();

    container.innerHTML = linhas.map(l => `
        <div style="display: grid; grid-template-columns: 1.4fr 0.7fr 0.7fr 0.7fr auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; background: var(--bg); font-size: 12.5px;">
            <div style="font-weight: 600; text-transform: capitalize;">${escapeHTML(l.label)}</div>
            <div style="color: var(--text-light);">Efetivo: <strong>${l.headcount}</strong></div>
            <input type="number" min="0" step="1" placeholder="Dias" value="${l.dias}" id="hhtDias_${l.key}"
                   style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box;">
            <input type="number" min="0" step="1" value="${l.horas}" id="hhtHoras_${l.key}"
                   style="width: 100%; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box;">
            <button class="db-apply-btn" style="padding: 6px 12px;" onclick="salvarDiasTrabalhadoMes('${l.key}', ${l.ano}, ${l.mes + 1})">💾</button>
        </div>
    `).join('');
}

async function salvarDiasTrabalhadoMes(key, ano, mes) {
    const dias = parseInt(document.getElementById(`hhtDias_${key}`).value, 10);
    const horas = parseInt(document.getElementById(`hhtHoras_${key}`).value, 10) || 8;
    if (!dias || dias < 0) {
        alert('Informe um número válido de dias trabalhados.');
        return;
    }
    try {
        await supabaseUpsert('hht_dias_trabalhados', [{ id: key, ano, mes, dias_trabalhados: dias, horas_por_dia: horas }]);
        hhtDiasTrabalhadosMap[key] = { id: key, ano, mes, dias_trabalhados: dias, horas_por_dia: horas };
    } catch (err) {
        console.error('Erro ao salvar dias trabalhados:', err);
        alert('Falha ao salvar: ' + err.message);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
    setReportFilter('mes');
    loadData();
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', init);

// Depois de um tempo sem interação, o navegador pode limitar (throttle) o loop de
// desenho do Chart.js numa aba parada, e o gráfico fica com o canvas em branco até
// algo forçar um novo desenho - mesma classe de bug já corrigida pra troca de página/
// aba interna (self-heal a cada visita), agora também disparada quando a aba volta a
// ficar visível ou em foco, sem depender do usuário clicar em nada.
function rerenderGraficosDaPaginaAtiva() {
    const paginaAtivaBtn = document.querySelector('.db-nav-item.active');
    const paginaAtiva = paginaAtivaBtn ? paginaAtivaBtn.id : null;
    if (paginaAtiva === 'navChecklists') {
        renderAll();
    } else if (paginaAtiva === 'navExtintores') {
        renderExtintorPanel();
    } else if (paginaAtiva === 'navRelatos') {
        renderRelatosPanel();
    } else if (paginaAtiva === 'navTreinamentos') {
        if (document.getElementById('treinSubtabBtn-visao')?.classList.contains('active')) {
            renderTreinamentosPanel();
        }
    } else if (paginaAtiva === 'navEfetivo') {
        if (document.getElementById('efetivoSubtabBtn-visao')?.classList.contains('active')) {
            renderEfetivoPanel();
        }
    } else if (paginaAtiva === 'navAcidentes') {
        if (document.getElementById('acidentesSubtabBtn-visao')?.classList.contains('active')) {
            renderAcidentesPanel();
        }
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') rerenderGraficosDaPaginaAtiva();
});
window.addEventListener('focus', rerenderGraficosDaPaginaAtiva);
