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
let treinamentosLoaded = false;

const NR_PATTERN = /\bNR[\s.]?\d/i;

function getTreinamentosDateRange() {
    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    if (treinamentosFilter === 'trimestre') {
        return { inicio: new Date(now.getFullYear(), now.getMonth() - 2, 1), fim };
    }
    if (treinamentosFilter === 'ano') {
        return { inicio: new Date(now.getFullYear(), 0, 1), fim };
    }
    if (treinamentosFilter === 'todos') {
        return { inicio: new Date(2000, 0, 1), fim };
    }
    return { inicio: new Date(now.getFullYear(), now.getMonth(), 1), fim };
}

function setTreinamentosFilter(filter) {
    treinamentosFilter = filter;
    ['btnFiltroTreinMes', 'btnFiltroTreinTrimestre', 'btnFiltroTreinAno', 'btnFiltroTreinTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroTreinMes', trimestre: 'btnFiltroTreinTrimestre', ano: 'btnFiltroTreinAno', todos: 'btnFiltroTreinTodos' };
    document.getElementById(map[filter])?.classList.add('active');
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
        renderTreinamentosPanel();
    } catch (err) {
        console.error('Erro ao carregar dados de treinamentos:', err);
        if (statusEl) statusEl.textContent = '❌ Falha ao carregar dados de treinamentos.';
    }
}

function renderTreinamentosPanel() {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nrAlerts = [];
    const matriculasComNRVencida = new Set();
    allTreinamentosStatus.forEach(s => {
        if (s.status_colaborador !== 'ATIVO') return;
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
    chartInstances.treinSetor = new Chart(document.getElementById('chartTreinSetor'), {
        type: 'bar',
        data: { labels: setorSorted.map(s => s[0]), datasets: [{ label: 'HHT', data: setorSorted.map(s => s[1]), backgroundColor: '#818cf8', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });

    // Top 10 temas mais realizados no período filtrado
    const temaCounts = {};
    periodo.forEach(r => { const t = r.treinamento_nome || 'Desconhecido'; temaCounts[t] = (temaCounts[t] || 0) + 1; });
    const temaSorted = Object.entries(temaCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    chartInstances.treinTopTemas = new Chart(document.getElementById('chartTreinTopTemas'), {
        type: 'bar',
        data: { labels: temaSorted.map(t => t[0]), datasets: [{ label: 'Sessões', data: temaSorted.map(t => t[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
    } catch (err) {
        console.error('Erro ao carregar dados de efetivo:', err);
        if (statusEl) statusEl.textContent = '❌ Falha ao carregar dados de efetivo.';
    }
}

// ============================================
// EFETIVO - busca de colaborador (ativo/inativo, admissão/demissão, tempo de casa,
// aniversário e situação de treinamentos), a pedido do cliente.
// ============================================

function filterEfetivoColaboradores(query) {
    const container = document.getElementById('efetivoSearchResults');
    const detail = document.getElementById('efetivoColabDetail');
    const q = (query || '').toLowerCase().trim();

    if (q.length < 2) {
        container.innerHTML = '';
        detail.style.display = 'none';
        detail.innerHTML = '';
        return;
    }

    const matches = allEfetivo.filter(e =>
        (e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q))
    ).slice(0, 20);

    if (matches.length === 0) {
        container.innerHTML = `<div class="db-list-empty">Nenhum colaborador encontrado para "${escapeHTML(query)}"</div>`;
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
    // entram no bucket "sem validade" pra não sumir da contagem total.
    let treinHtml = '';
    const regs = allTreinamentosStatus.filter(t => t.matricula === matricula);
    if (regs.length > 0) {
        let vencidos = 0, vencendo = 0, validos = 0, semValidade = 0;
        regs.forEach(t => {
            if (!t.data_proxima_reciclagem) { semValidade++; return; }
            const d = parseLocalDate(t.data_proxima_reciclagem);
            const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 0) vencidos++;
            else if (diff <= 30) vencendo++;
            else validos++;
        });
        treinHtml = `
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border);">
                <div style="font-size: 11px; color: var(--text-light); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Situação de Treinamentos (${regs.length})</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #fee2e2; color: #b91c1c; font-weight: 600;">🔴 ${vencidos} vencido(s)</span>
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #fef3c7; color: #92400e; font-weight: 600;">🟡 ${vencendo} vencendo</span>
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #d1fae5; color: #047857; font-weight: 600;">🟢 ${validos} válido(s)</span>
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #e0e7ff; color: #3730a3; font-weight: 600;">🔵 ${semValidade} sem validade</span>
                </div>
            </div>`;
    }

    const detail = document.getElementById('efetivoColabDetail');
    detail.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-size: 16px; font-weight: 700;">${escapeHTML(e.nome || '')}</div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">${escapeHTML(e.funcao || '')}${e.setor ? ' — ' + escapeHTML(e.setor) : ''}</div>
            </div>
            ${statusBadge}
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

function headcountAsOf(dateEnd) {
    return allEfetivo.filter(e => {
        if (!e.dt_admissao) return false;
        if (parseLocalDate(e.dt_admissao) > dateEnd) return false;
        if (!e.dt_demissao) return true;
        return parseLocalDate(e.dt_demissao) > dateEnd;
    }).length;
}

function hhtDoMes(ano, mesIndex0) {
    const ini = new Date(ano, mesIndex0, 1);
    const fim = new Date(ano, mesIndex0 + 1, 0);
    return allTreinamentosRealizados
        .filter(r => { if (!r.data_treinamento) return false; const d = parseLocalDate(r.data_treinamento); return d >= ini && d <= fim; })
        .reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0);
}

function renderEfetivoPanel() {
    if (allEfetivo.length === 0) return;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const efetivoAtual = headcountAsOf(hoje);
    document.getElementById('kpiEfetivoAtual').textContent = efetivoAtual;

    const doze = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    const admissoes12 = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= doze).length;
    const demissoes12 = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= doze).length;
    document.getElementById('kpiEfetivoAdmissoes').textContent = admissoes12;
    document.getElementById('kpiEfetivoDemissoes').textContent = demissoes12;

    const efetivoHa12Meses = headcountAsOf(new Date(doze.getFullYear(), doze.getMonth(), 0));
    const efetivoMedio12 = (efetivoAtual + efetivoHa12Meses) / 2;
    const turnover = efetivoMedio12 > 0 ? (demissoes12 / efetivoMedio12 * 100) : 0;
    document.getElementById('kpiEfetivoTurnover').textContent = turnover.toFixed(1) + '%';

    const ativosAgora = allEfetivo.filter(e => e.dt_admissao && (!e.dt_demissao || parseLocalDate(e.dt_demissao) > hoje));
    let tempoCasaTotalMeses = 0;
    ativosAgora.forEach(e => {
        const adm = parseLocalDate(e.dt_admissao);
        tempoCasaTotalMeses += (hoje.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    });
    document.getElementById('kpiEfetivoTempoCasa').textContent = ativosAgora.length > 0 ? Math.round(tempoCasaTotalMeses / ativosAgora.length) : 0;

    // Evolução mensal desde a primeira admissão registrada até o mês atual
    const datasAdmissao = allEfetivo.filter(e => e.dt_admissao).map(e => parseLocalDate(e.dt_admissao));
    const primeiraData = datasAdmissao.length > 0 ? new Date(Math.min(...datasAdmissao.map(d => d.getTime()))) : hoje;
    const meses = [], admissoesPorMes = [], demissoesPorMes = [], efetivoPorMes = [], indicePorMes = [];
    let cursor = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
    const limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    while (cursor <= limite) {
        const ano = cursor.getFullYear(), mes = cursor.getMonth();
        const inicioMes = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        meses.push(cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const adm = allEfetivo.filter(e => e.dt_admissao && parseLocalDate(e.dt_admissao) >= inicioMes && parseLocalDate(e.dt_admissao) <= fimMes).length;
        const dem = allEfetivo.filter(e => e.dt_demissao && parseLocalDate(e.dt_demissao) >= inicioMes && parseLocalDate(e.dt_demissao) <= fimMes).length;
        const eft = headcountAsOf(fimMes);
        const hht = hhtDoMes(ano, mes);
        admissoesPorMes.push(adm);
        demissoesPorMes.push(dem);
        efetivoPorMes.push(eft);
        indicePorMes.push(eft > 0 ? Math.round((hht / eft) * 100) : 0);
        cursor = new Date(ano, mes + 1, 1);
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.efetivoEvolucao) chartInstances.efetivoEvolucao.destroy();
    if (chartInstances.efetivoIndice) chartInstances.efetivoIndice.destroy();
    if (chartInstances.efetivoSetor) chartInstances.efetivoSetor.destroy();
    if (chartInstances.efetivoFuncao) chartInstances.efetivoFuncao.destroy();

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
    ativosAgora.forEach(e => { const s = e.setor || 'Sem setor'; setorCounts[s] = (setorCounts[s] || 0) + 1; });
    const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
    chartInstances.efetivoSetor = new Chart(document.getElementById('chartEfetivoSetor'), {
        type: 'bar',
        data: { labels: setorSorted.map(s => s[0]), datasets: [{ label: 'Efetivo', data: setorSorted.map(s => s[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const funcaoCounts = {};
    ativosAgora.forEach(e => { const f = e.funcao || 'Sem função'; funcaoCounts[f] = (funcaoCounts[f] || 0) + 1; });
    const funcaoSorted = Object.entries(funcaoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    chartInstances.efetivoFuncao = new Chart(document.getElementById('chartEfetivoFuncao'), {
        type: 'bar',
        data: { labels: funcaoSorted.map(f => f[0]), datasets: [{ label: 'Efetivo', data: funcaoSorted.map(f => f[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
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
// NAVEGAÇÃO ENTRE PÁGINAS (barra lateral)
// ============================================

const DB_PAGE_TITLES = {
    checklists: 'Checklists',
    extintores: 'Extintores',
    relatos: 'Relatos de Problemas',
    treinamentos: 'Treinamentos',
    efetivo: 'Efetivo'
};

function showDbPage(pageId) {
    document.querySelectorAll('.db-page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId)?.classList.add('active');

    document.querySelectorAll('.db-nav-item').forEach(el => el.classList.remove('active'));
    const navMap = { checklists: 'navChecklists', extintores: 'navExtintores', relatos: 'navRelatos', treinamentos: 'navTreinamentos', efetivo: 'navEfetivo' };
    document.getElementById(navMap[pageId])?.classList.add('active');

    document.getElementById('pageTitle').textContent = DB_PAGE_TITLES[pageId] || '';

    if (pageId === 'treinamentos' && !treinamentosLoaded) {
        treinamentosLoaded = true;
        loadTreinamentosData();
    }
    if (pageId === 'efetivo' && !efetivoLoaded) {
        efetivoLoaded = true;
        loadEfetivoData();
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
