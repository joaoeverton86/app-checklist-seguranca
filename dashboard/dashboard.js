// ============================================
// PAINEL GERENCIAL - Somente leitura, lê direto do Supabase.
// Site separado do app de campo (app.js) - não compartilha código/tabelas com
// ele por decisão de projeto, só reaproveita os mesmos cálculos já usados na
// tela "Relatórios" do app, portados aqui pra funcionar sem IndexedDB.
// ============================================

const SUPABASE_URL = 'https://qqtcwxvbjmybyzubocgd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdGN3eHZiam15Ynl6dWJvY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODczNDUsImV4cCI6MjEwMDE2MzM0NX0.T6Nm-lUD2I_mRULsEXCDQBkJe2cEpl6_z7hUNR30yTk';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

async function supabaseFetch(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${table}`);
    return res.json();
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
    chartInstances.tipo = new Chart(document.getElementById('chartPorTipo'), {
        type: 'bar',
        data: { labels: typeSorted.map(t => t[0]), datasets: [{ label: 'Checklists', data: typeSorted.map(t => t[1]), backgroundColor: colors.primaryLight, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
    chartInstances.itens = new Chart(document.getElementById('chartItensNC'), {
        type: 'bar',
        data: { labels: itemsSorted.map(i => i[0]), datasets: [{ label: 'Ocorrências', data: itemsSorted.map(i => i[1]), backgroundColor: itemsSorted.map((_, idx) => `rgba(239, 68, 68, ${1 - idx * 0.07})`), borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
    chartInstances.equip = new Chart(document.getElementById('chartEquipNC'), {
        type: 'bar',
        data: { labels: equipSorted.map(e => e[0]), datasets: [{ label: 'Não Conformidades', data: equipSorted.map(e => e[1]), backgroundColor: colors.danger, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
    chartInstances.empresa = new Chart(document.getElementById('chartEmpresaNC'), {
        type: 'bar',
        data: { labels: empresaSorted.map(e => e[0]), datasets: [{ label: 'Não Conformidades', data: empresaSorted.map(e => e[1]), backgroundColor: colors.warning || '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
        chartInstances.relatosTipo = new Chart(document.getElementById('chartRelatosTipo'), {
            type: 'bar',
            data: { labels: tipoSorted.map(t => t[0]), datasets: [{ label: 'Relatos', data: tipoSorted.map(t => t[1]), backgroundColor: '#818cf8', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
// INICIALIZAÇÃO
// ============================================

function init() {
    setReportFilter('mes');
    loadData();
    refreshTimer = setInterval(loadData, REFRESH_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', init);
