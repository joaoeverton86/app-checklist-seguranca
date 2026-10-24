// ==============================================================================
// MODULO: GESTAO DE EPIS (NR-06), ESTOQUE, ENTREGAS, CONSUMO E PERFIS DE ACESSO
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// MÓDULO DE EPI (NR-06) - Cadastro, Estoque, Lançamento de entregas.
// Fonte histórica: TB_LACAMENTO.csv (export SharePoint, 6.520 entregas desde
// 2024-07-12). É só um log de saídas - não existe contagem de estoque anterior,
// por isso epi_estoque nasce sempre zerado e só passa a existir pra um item
// quando alguém registra a primeira Entrada.
// ============================================

var allEpiCatalogo = [];
var allEpiEstoque = [];
var allEpiEntregas = [];
var allEpiEntradas = [];
var epiModoVisaoEstoque = 'grade'; // 'grade' (Modo Família/Grade) ou 'lista' (Modo Detalhado)
var epiLoaded = false;
var epiFilter = 'mes';
var epiFiltroAno = '';
var epiFiltroMes = '';

var EPI_TIPO_LABELS = { maos: 'Mãos', pes: 'Pés', cabeca: 'Cabeça', olhos: 'Olhos', rosto: 'Rosto', respiratorio: 'Respiratório', corpo: 'Corpo', altura: 'Altura', audicao: 'Audição', outro: 'Outro' };

// Status do CA (Certificado de Aprovação) de um item do catálogo - mesma janela de 30
// dias e mesmos buckets já usados pra vencimento de ASO (calcularStatusAsoColaborador) e
// de reciclagem de NR em Treinamentos, pra manter o padrão visual/textual do painel.
function calcularStatusCaEpi(item) {
    if (!item.ca_validade) return { status: 'sem_data', diffDays: null };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const venc = parseLocalDate(item.ca_validade); venc.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const status = diffDays < 0 ? 'vencido' : (diffDays <= 30 ? 'vencendo' : 'em_dia');
    return { status, diffDays };
}

// epi_estoque usa epi_catalogo_id (não "id") como chave primária - supabaseUpsert
// genérico assume on_conflict=id, então essa tabela precisa do próprio upsert.
async function supabaseUpsertEstoque(rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/epi_estoque?on_conflict=epi_catalogo_id`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rows)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
}

async function loadEpiData() {
    try {
        const [catalogo, estoque, entregas] = await Promise.all([
            supabaseFetchCacheado('epi_catalogo', '?select=*'),
            supabaseFetchCacheado('epi_estoque', '?select=*'),
            supabaseFetchCacheado('epi_entregas', '?select=*')
        ]);
        allEpiCatalogo = catalogo;
        allEpiEstoque = estoque;
        allEpiEntregas = entregas;
        try {
            allEpiEntradas = await supabaseFetchCacheado('epi_entradas', '?select=*&order=data_entrada.desc');
        } catch (_) {
            allEpiEntradas = [];
        }
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*');
        }
        renderEpiPanel();
        renderEpiCatalogoResumo();
        filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput')?.value || '');
        renderEpiEstoquePanel();
        renderEpiEntregasResumo();
        filterEpiEntregasLista(document.getElementById('epiEntregasSearchInput')?.value || '');
        popularEpiCatalogoDatalist();
        popularEpiColabDatalist();
    } catch (err) {
        console.error('Erro ao carregar dados de EPI:', err);
    }
}

function showEpiSubtab(tab) {
    ['visao', 'lancamentos', 'estoque', 'consumo', 'cadastro', 'diretrizes', 'matriz', 'historico', 'relatorio'].forEach(t => {
        const content = document.getElementById('epiSubtab-' + t);
        const btn = document.getElementById('epiSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderEpiPanel();
    if (tab === 'estoque') renderEpiEstoquePanel();
    if (tab === 'consumo') renderEpiConsumoComprasPanel();
    if (tab === 'cadastro') { renderEpiCatalogoResumo(); filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput')?.value || ''); }
    if (tab === 'lancamentos') { renderEpiEntregasResumo(); filterEpiEntregasLista(document.getElementById('epiEntregasSearchInput')?.value || ''); }
    if (tab === 'matriz') {
        if (!matrizEpiLoaded) { matrizEpiLoaded = true; loadMatrizEpiData(); }
        else { renderMatrizEpiCards(); filterMatrizEpi(document.getElementById('mepiSearchInput')?.value || ''); }
    }
    if (tab === 'historico') { popularEpiColabDatalist(); renderEpiHistoricoColaborador(); }
    // A aba de Relatório usa os números da Visão Geral (window.epiReportData) - por isso, ao
    // abrir ela, força um recálculo da Visão Geral, garantindo que o relatório nunca fique
    // desatualizado mesmo que o usuário nunca tenha aberto essa outra sub-aba antes.
    if (tab === 'relatorio') { renderEpiPanel(); renderEpiRelatorioChecklist(); renderEpiRelatorioSemanaLabel(); }
}

// ============================================
// RELATÓRIO CONFIGURÁVEL DE EPI - mesmo padrão já usado em Saúde e Efetivo: o usuário
// escolhe via checkbox quais KPIs/gráficos/listas entram no relatório antes de gerar. Os
// dados vêm de window.epiReportData (preenchido no fim de renderEpiPanel - nunca
// recalculado aqui).
// ============================================

function renderEpiRelatorioChecklist() {
    const el = document.getElementById('epiRelPeriodo');
    if (el && window.epiReportData) el.textContent = window.epiReportData.periodoLabel || '—';
}

function marcarTodosRelatorioEpi(valor) {
    ['relEpiChk_entregas', 'relEpiChk_colaboradores', 'relEpiChk_itens', 'relEpiChk_estoqueBaixo', 'relEpiChk_caVencidos',
     'relEpiChk_caVencendo', 'relEpiChk_totalItens', 'relEpiChk_coberturaEpi', 'relEpiChk_taxaReposicao',
     'relEpiChk_graficoPorMes', 'relEpiChk_graficoPorTipo', 'relEpiChk_graficoMotivoReposicao', 'relEpiChk_graficoPorSetor',
     'relEpiChk_listaMaisEntregues', 'relEpiChk_listaEstoqueBaixo', 'relEpiChk_listaCaVencimento', 'relEpiChk_listaSemEntrega'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.checked = valor;
    });
}

function lerSelecaoRelatorioEpi() {
    return {
        entregas: document.getElementById('relEpiChk_entregas').checked,
        colaboradores: document.getElementById('relEpiChk_colaboradores').checked,
        itens: document.getElementById('relEpiChk_itens').checked,
        estoqueBaixo: document.getElementById('relEpiChk_estoqueBaixo').checked,
        caVencidos: document.getElementById('relEpiChk_caVencidos').checked,
        caVencendo: document.getElementById('relEpiChk_caVencendo').checked,
        totalItens: document.getElementById('relEpiChk_totalItens').checked,
        coberturaEpi: document.getElementById('relEpiChk_coberturaEpi').checked,
        taxaReposicao: document.getElementById('relEpiChk_taxaReposicao').checked,
        graficoPorMes: document.getElementById('relEpiChk_graficoPorMes').checked,
        graficoPorTipo: document.getElementById('relEpiChk_graficoPorTipo').checked,
        graficoMotivoReposicao: document.getElementById('relEpiChk_graficoMotivoReposicao').checked,
        graficoPorSetor: document.getElementById('relEpiChk_graficoPorSetor').checked,
        listaMaisEntregues: document.getElementById('relEpiChk_listaMaisEntregues').checked,
        listaEstoqueBaixo: document.getElementById('relEpiChk_listaEstoqueBaixo').checked,
        listaCaVencimento: document.getElementById('relEpiChk_listaCaVencimento').checked,
        listaSemEntrega: document.getElementById('relEpiChk_listaSemEntrega').checked
    };
}

async function gerarExcelEpi() {
    const statusEl = document.getElementById('relatorioEpiStatus');
    const dados = window.epiReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioEpi();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [];
    aoa.push([`RELATÓRIO DE EPI — ${dados.periodoLabel}`]);
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

    Object.entries(dados.listas).forEach(([key, l]) => {
        if (!marcados[key]) return;
        aoa.push([l.titulo.toUpperCase()]);
        aoa.push(l.colunas);
        if (l.linhas.length === 0) aoa.push(['Nenhum item nessa lista no momento']);
        else l.linhas.forEach(linha => aoa.push(linha));
        aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 34 }, { wch: 20 }, { wch: 16 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EPI');

    const dataSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RELATORIO_EPI_${dataSlug}.xlsx`);

    statusEl.textContent = `✅ Excel gerado com ${Object.values(marcados).filter(Boolean).length} item(ns) selecionado(s).`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfEpi() {
    const statusEl = document.getElementById('relatorioEpiStatus');
    const dados = window.epiReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioEpi();
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

    const listasHtml = Object.entries(dados.listas).filter(([key]) => marcados[key]).map(([key, l]) => `
    <h3>${escapeHTML(l.titulo)}</h3>
    <table style="width:100%; margin-bottom:14px;">
        <thead><tr>${l.colunas.map(c => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead>
        <tbody>${l.linhas.length === 0
            ? `<tr><td colspan="${l.colunas.length}">Nenhum item nessa lista no momento</td></tr>`
            : l.linhas.map(linha => `<tr>${linha.map((v, i) => `<td${i === 0 ? ' style="text-align:left;"' : ''}>${escapeHTML(String(v))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de EPI</title>
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
        <div class="titulo">RELATÓRIO DE EPI</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Período: ${escapeHTML(dados.periodoLabel)} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    ${kpisHtml}
    ${graficosHtml}
    ${listasHtml}
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// ============================================
// RELATÓRIO SEMANAL DE ENTREGA - lista bruta (não agregada) de todas as entregas de uma
// semana (Segunda a Domingo), pra virar documento/prova de entrega. Diferente do checklist
// acima: não é configurável por item, é sempre "a semana inteira" - só a semana em si que
// navega (anterior/atual/próxima), guardada em epiRelatorioSemanaOffset (0 = semana atual,
// -1 = semana passada, +1 = semana que vem, etc.).
// ============================================

var epiRelatorioSemanaOffset = 0;

function calcularEpiSemana(offset) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
    const diffParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segundaAtual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + diffParaSegunda);
    const inicio = new Date(segundaAtual.getFullYear(), segundaAtual.getMonth(), segundaAtual.getDate() + offset * 7);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59, 999);
    return { inicio, fim };
}

function renderEpiRelatorioSemanaLabel() {
    const { inicio, fim } = calcularEpiSemana(epiRelatorioSemanaOffset);
    const el = document.getElementById('epiRelatorioSemanaLabel');
    if (el) el.textContent = `${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}` + (epiRelatorioSemanaOffset === 0 ? ' (semana atual)' : '');
}

function mudarEpiRelatorioSemana(delta) {
    epiRelatorioSemanaOffset += delta;
    renderEpiRelatorioSemanaLabel();
}

function irParaEpiSemanaAtual() {
    epiRelatorioSemanaOffset = 0;
    renderEpiRelatorioSemanaLabel();
}

function montarLinhasEpiSemanal() {
    const { inicio, fim } = calcularEpiSemana(epiRelatorioSemanaOffset);
    const catalogoPorId = new Map(allEpiCatalogo.map(c => [c.id, c]));
    const entregas = allEpiEntregas
        .filter(e => e.data_entrega && parseLocalDate(e.data_entrega) >= inicio && parseLocalDate(e.data_entrega) <= fim)
        .slice()
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '') || (a.data_entrega || '').localeCompare(b.data_entrega || ''));
    return { inicio, fim, catalogoPorId, entregas };
}

var TIPO_ENTREGA_LABELS_EPI = { inicial: 'Inicial', reposicao: 'Reposição', troca: 'Troca' };
var MOTIVO_REPOSICAO_LABELS_EPI_SEMANAL = { perda: 'Perda', dano: 'Dano/Rompimento', desgaste: 'Desgaste Natural', troca_tamanho: 'Troca de Tamanho', vencimento: 'Vencimento (CA)' };

async function gerarExcelEpiSemanal() {
    const statusEl = document.getElementById('epiRelatorioSemanalStatus');
    const { inicio, fim, catalogoPorId, entregas } = montarLinhasEpiSemanal();
    if (entregas.length === 0) {
        statusEl.textContent = '❌ Nenhuma entrega registrada nessa semana.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [
        [`RELATÓRIO SEMANAL DE ENTREGA DE EPI — ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`],
        [`Gerado em ${new Date().toLocaleDateString('pt-BR')} — ${entregas.length} entrega(s)`],
        [],
        ['Data', 'Matrícula', 'Colaborador', 'Função', 'Setor', 'Item', 'Quantidade', 'Tipo', 'Motivo', 'Entregue por']
    ];
    entregas.forEach(e => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        aoa.push([
            formatSimpleDate(e.data_entrega), e.matricula, e.nome, e.funcao || '', e.setor || '',
            cat?.descricao || e.epi_catalogo_id, e.quantidade || 1,
            TIPO_ENTREGA_LABELS_EPI[e.tipo_entrega] || e.tipo_entrega || '',
            MOTIVO_REPOSICAO_LABELS_EPI_SEMANAL[e.motivo_reposicao] || e.motivo_reposicao || '',
            e.entregue_por || ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ENTREGAS DA SEMANA');

    XLSX.writeFile(wb, `RELATORIO_SEMANAL_EPI_${inicio.toISOString().slice(0, 10)}_a_${fim.toISOString().slice(0, 10)}.xlsx`);

    statusEl.textContent = `✅ Excel gerado — ${entregas.length} entrega(s) na semana.`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfEpiSemanal() {
    const statusEl = document.getElementById('epiRelatorioSemanalStatus');
    const { inicio, fim, catalogoPorId, entregas } = montarLinhasEpiSemanal();
    if (entregas.length === 0) {
        statusEl.textContent = '❌ Nenhuma entrega registrada nessa semana.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const linhasHtml = entregas.map(e => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        return `<tr>
            <td>${formatSimpleDate(e.data_entrega)}</td>
            <td style="text-align:left;">${escapeHTML(e.nome || '')} (${escapeHTML(e.matricula || '')})</td>
            <td style="text-align:left;">${escapeHTML(e.setor || '—')}</td>
            <td style="text-align:left;">${escapeHTML(cat?.descricao || e.epi_catalogo_id || '')}</td>
            <td>${e.quantidade || 1}</td>
            <td>${escapeHTML(TIPO_ENTREGA_LABELS_EPI[e.tipo_entrega] || e.tipo_entrega || '—')}</td>
            <td style="text-align:left;">${escapeHTML(MOTIVO_REPOSICAO_LABELS_EPI_SEMANAL[e.motivo_reposicao] || e.motivo_reposicao || '—')}</td>
            <td style="text-align:left;">${escapeHTML(e.entregue_por || '—')}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Semanal de Entrega de EPI</title>
<style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; margin: 16px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:14px; text-align:center; flex:1; }
    .info-geracao { font-size:11px; color:#444; margin-bottom:10px; }
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
        <div class="titulo">RELATÓRIO SEMANAL DE ENTREGA DE EPI</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Semana: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')} — ${entregas.length} entrega(s) — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    <table>
        <thead><tr><th>Data</th><th>Colaborador</th><th>Setor</th><th>Item</th><th>Qtd</th><th>Tipo</th><th>Motivo</th><th>Entregue por</th></tr></thead>
        <tbody>${linhasHtml}</tbody>
    </table>
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// ---- Visão Geral: filtro de período (mesmo padrão de Treinamentos/Saúde) ----

function popularFiltroAnoEpi() {
    const anos = new Set([new Date().getFullYear()]);
    allEpiEntregas.forEach(e => { if (e.data_entrega) anos.add(parseLocalDate(e.data_entrega).getFullYear()); });
    popularSelectAnos('epiFiltroAno', anos);
}

function getEpiDateRange() {
    const tituloEl = document.getElementById('epiPeriodoTitulo');
    if (epiFiltroAno) {
        const ano = parseInt(epiFiltroAno, 10);
        if (epiFiltroMes !== '') {
            const mes = parseInt(epiFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }
    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (epiFilter === 'trimestre') { inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1); titulo = 'Últimos 3 meses'; }
    else if (epiFilter === 'ano') { inicio = new Date(now.getFullYear(), 0, 1); titulo = `Ano ${now.getFullYear()} (até hoje)`; }
    else if (epiFilter === 'todos') { inicio = new Date(2000, 0, 1); titulo = 'Todo o histórico'; }
    else { inicio = new Date(now.getFullYear(), now.getMonth(), 1); titulo = 'Este mês'; }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setEpiFilter(filter) {
    epiFilter = filter;
    epiFiltroAno = '';
    epiFiltroMes = '';
    const anoSel = document.getElementById('epiFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('epiFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroEpiMes', 'btnFiltroEpiTrimestre', 'btnFiltroEpiAno', 'btnFiltroEpiTodos'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    const map = { mes: 'btnFiltroEpiMes', trimestre: 'btnFiltroEpiTrimestre', ano: 'btnFiltroEpiAno', todos: 'btnFiltroEpiTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderEpiPanel();
}

function onEpiFiltroAnoMesChange() {
    epiFiltroAno = document.getElementById('epiFiltroAno').value;
    epiFiltroMes = document.getElementById('epiFiltroMes').value;
    if (epiFiltroAno) {
        ['btnFiltroEpiMes', 'btnFiltroEpiTrimestre', 'btnFiltroEpiAno', 'btnFiltroEpiTodos'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    }
    renderEpiPanel();
}

function sanitizarSetorDemandaEpi(setorRaw) {
    if (!setorRaw) return 'NÃO INFORMADO';
    const s = setorRaw.trim().toUpperCase();
    const mapa = {
        'CIVIL': 'MANUTENÇÃO CIVIL',
        'MANUTENCAO CIVIL': 'MANUTENÇÃO CIVIL',
        'MANUTENÇÃO CIVIL': 'MANUTENÇÃO CIVIL',
        'ELETROMECÂNICA': 'MANUTENÇÃO MECÂNICA',
        'ELETROMECANICA': 'MANUTENÇÃO MECÂNICA',
        'MECÂNICA': 'MANUTENÇÃO MECÂNICA',
        'MECANICA': 'MANUTENÇÃO MECÂNICA',
        'MANUTENCAO MECANICA': 'MANUTENÇÃO MECÂNICA',
        'MANUTENÇÃO MECÂNICA': 'MANUTENÇÃO MECÂNICA',
        'ELÉTRICA': 'MANUTENÇÃO ELÉTRICA',
        'ELETRICA': 'MANUTENÇÃO ELÉTRICA',
        'MANUTENCAO ELETRICA': 'MANUTENÇÃO ELÉTRICA',
        'MANUTENÇÃO ELÉTRICA': 'MANUTENÇÃO ELÉTRICA'
    };
    return mapa[s] || s;
}

function renderEpiPanel() {
    popularFiltroAnoEpi();
    const { inicio, fim } = getEpiDateRange();
    const periodo = allEpiEntregas.filter(e => {
        if (!e.data_entrega) return false;
        const d = parseLocalDate(e.data_entrega);
        return d >= inicio && d <= fim;
    });

    document.getElementById('kpiEpiEntregas').textContent = periodo.length;
    document.getElementById('kpiEpiColaboradores').textContent = new Set(periodo.map(e => e.matricula)).size;
    document.getElementById('kpiEpiItens').textContent = allEpiCatalogo.filter(c => c.ativo !== false).length;

    // Total de Itens Entregues (Período): soma as QUANTIDADES entregues, diferente de
    // "Entregas no Período" (que conta registros/lançamentos, não unidades de EPI).
    const totalItensEntregues = periodo.reduce((s, e) => s + (e.quantidade || 1), 0);
    document.getElementById('kpiEpiTotalItens').textContent = totalItensEntregues;

    // Taxa de Reposição (Período): % das entregas que NÃO são "inicial" (ou seja, reposição
    // ou troca) - um número alto pode indicar perda, dano ou desgaste acima do esperado.
    const reposicoesPeriodo = periodo.filter(e => e.tipo_entrega && e.tipo_entrega !== 'inicial').length;
    const taxaReposicaoEpi = periodo.length > 0 ? (reposicoesPeriodo / periodo.length * 100) : 0;
    document.getElementById('kpiEpiTaxaReposicao').textContent = periodo.length > 0 ? taxaReposicaoEpi.toFixed(1) + '%' : '—';

    // Cobertura de EPI: colaboradores ATIVOS hoje que nunca tiveram NENHUMA entrega
    // registrada (em todo o histórico, não só no período) - checagem de conformidade
    // "quem pode estar sem EPI documentado", não um recorte de período.
    const matriculasComEntregaEpi = new Set(allEpiEntregas.map(e => e.matricula));
    const colaboradoresSemEpi = allEfetivo.filter(e => colaboradorEstaAtivo(e) && !matriculasComEntregaEpi.has(e.id));
    document.getElementById('kpiEpiSemEntrega').textContent = colaboradoresSemEpi.length;
    const listSemEpi = document.getElementById('listEpiSemEntrega');
    if (listSemEpi) {
        listSemEpi.innerHTML = colaboradoresSemEpi.length === 0
            ? '<div class="db-list-empty">✅ Todos os colaboradores ativos têm ao menos 1 entrega registrada</div>'
            : colaboradoresSemEpi
                .slice()
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                .map(e => `<div class="db-list-item db-item-warning">
                    <div class="db-list-item-title">${escapeHTML(e.nome || e.id)}</div>
                    <div class="db-list-item-sub">${escapeHTML(e.funcao || '—')} — ${escapeHTML(e.setor || '—')}</div>
                </div>`).join('');
    }

    const catalogoPorId = new Map(allEpiCatalogo.map(c => [c.id, c]));
    const estoqueBaixo = allEpiEstoque.filter(es => (es.quantidade_atual || 0) <= (es.quantidade_minima || 0) && catalogoPorId.get(es.epi_catalogo_id)?.ativo !== false);
    document.getElementById('kpiEpiEstoqueBaixo').textContent = estoqueBaixo.length;

    const listBaixo = document.getElementById('listEpiEstoqueBaixo');
    if (estoqueBaixo.length === 0) {
        listBaixo.innerHTML = '<div class="db-list-empty">✅ Nenhum item com estoque abaixo do mínimo</div>';
    } else {
        listBaixo.innerHTML = estoqueBaixo
            .sort((a, b) => (a.quantidade_atual || 0) - (b.quantidade_atual || 0))
            .map(es => {
                const cat = catalogoPorId.get(es.epi_catalogo_id);
                return `<div class="db-list-item db-item-danger">
                    <div class="db-list-item-title">${escapeHTML(cat?.descricao || es.epi_catalogo_id)}</div>
                    <div class="db-list-item-sub">Saldo: ${es.quantidade_atual || 0} — Mínimo: ${es.quantidade_minima || 0}</div>
                </div>`;
            }).join('');
    }

    const itensComCa = allEpiCatalogo
        .filter(c => c.ativo !== false)
        .map(c => ({ item: c, ...calcularStatusCaEpi(c) }))
        .filter(x => x.status === 'vencido' || x.status === 'vencendo');
    document.getElementById('kpiEpiCaVencidos').textContent = itensComCa.filter(x => x.status === 'vencido').length;
    document.getElementById('kpiEpiCaVencendo').textContent = itensComCa.filter(x => x.status === 'vencendo').length;

    const listCa = document.getElementById('listEpiCaVencimento');
    if (itensComCa.length === 0) {
        listCa.innerHTML = '<div class="db-list-empty">✅ Nenhum CA vencido ou vencendo nos próximos 30 dias</div>';
    } else {
        // Botão "✏️ Editar" em cada item - pula direto pro Cadastro do item já aberto pra
        // edição (mesma tela que já existe em EPI > Cadastro, com o campo "Ativo" e o
        // botão Excluir), em vez do usuário ter que ir até lá e procurar o item na mão.
        // Resolve o caso comum de item com CA vencido que já nem tem mais estoque de
        // verdade (produto descontinuado) - editando e desmarcando "Ativo" ali, o item
        // some desta lista sozinho (que já só considera itens com ativo !== false).
        listCa.innerHTML = itensComCa
            .sort((a, b) => a.diffDays - b.diffDays)
            .map(x => {
                const msg = x.diffDays < 0 ? `Vencido há ${Math.abs(x.diffDays)} dia(s)` : x.diffDays === 0 ? 'Vence hoje' : `Vence em ${x.diffDays} dia(s)`;
                return `<div class="db-list-item ${x.status === 'vencido' ? 'db-item-danger' : 'db-item-warning'}" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:180px;">
                        <div class="db-list-item-title">${escapeHTML(x.item.descricao || '')}${x.item.ca ? ' — CA ' + escapeHTML(x.item.ca) : ''}</div>
                        <div class="db-list-item-sub">${msg} — Validade: ${formatSimpleDate(x.item.ca_validade)}</div>
                    </div>
                    <button class="db-clear-btn" style="padding:4px 9px; font-size:11px;" title="Editar este item (ex: desmarcar 'Ativo' se não tem mais em estoque)" onclick="editarItemEpiDoAlerta('${escapeHTML(x.item.id)}')">✏️ Editar</button>
                </div>`;
            }).join('');
    }

    const itemCounts = {};
    periodo.forEach(e => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        const label = cat?.descricao || e.epi_catalogo_id || 'Item desconhecido';
        itemCounts[label] = (itemCounts[label] || 0) + (e.quantidade || 1);
    });
    const itemSorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const listItens = document.getElementById('listEpiMaisEntregues');
    listItens.innerHTML = itemSorted.length === 0
        ? '<div class="db-list-empty">Nenhuma entrega no período</div>'
        : itemSorted.map(([label, qtd]) => `
            <div class="db-list-item">
                <div class="db-list-item-title">${escapeHTML(label)}</div>
                <div class="db-list-item-sub">${qtd} unidade(s) entregue(s)</div>
            </div>`).join('');

    if (typeof Chart === 'undefined') return;
    if (chartInstances.epiPorMes) chartInstances.epiPorMes.destroy();
    if (chartInstances.epiPorTipo) chartInstances.epiPorTipo.destroy();
    if (chartInstances.epiMotivoReposicao) chartInstances.epiMotivoReposicao.destroy();
    if (chartInstances.epiPorSetor) chartInstances.epiPorSetor.destroy();

    const meses = [], qtdPorMes = [];
    const now = new Date();
    const datasEntrega = allEpiEntregas.filter(e => e.data_entrega).map(e => parseLocalDate(e.data_entrega));
    const primeiraData = datasEntrega.length > 0 ? new Date(Math.min(...datasEntrega.map(d => d.getTime()))) : now;
    let cursorMes = new Date(primeiraData.getFullYear(), primeiraData.getMonth(), 1);
    const limiteMes = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursorMes <= limiteMes) {
        const ano = cursorMes.getFullYear(), mes = cursorMes.getMonth();
        meses.push(cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        const ini = new Date(ano, mes, 1);
        const fimMes = new Date(ano, mes + 1, 0);
        const sublist = allEpiEntregas.filter(e => {
            if (!e.data_entrega) return false;
            const dt = parseLocalDate(e.data_entrega);
            return dt >= ini && dt <= fimMes;
        });
        qtdPorMes.push(sublist.reduce((sum, e) => sum + (e.quantidade || 1), 0));
        cursorMes = new Date(ano, mes + 1, 1);
    }
    chartInstances.epiPorMes = new Chart(document.getElementById('chartEpiPorMes'), {
        type: 'bar',
        data: { labels: meses, datasets: [{ label: 'Entregas', data: qtdPorMes, backgroundColor: '#4f46e5', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const tipoCounts = {};
    periodo.forEach(e => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        const tipo = EPI_TIPO_LABELS[cat?.tipo_protecao] || 'Outro';
        tipoCounts[tipo] = (tipoCounts[tipo] || 0) + (e.quantidade || 1);
    });
    const tipoSorted = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
    chartInstances.epiPorTipo = new Chart(document.getElementById('chartEpiPorTipo'), {
        type: 'doughnut',
        data: { labels: tipoSorted.map(t => t[0]), datasets: [{ data: tipoSorted.map(t => t[1]), backgroundColor: ['#4f46e5', '#818cf8', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16', '#64748b'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Motivo das Reposições (Período): só entregas que TÊM motivo_reposicao preenchido
    // (reposição/troca) - ajuda a ver se perda/dano está recorrente.
    const MOTIVO_REPOSICAO_LABELS_EPI = { perda: 'Perda', dano: 'Dano/Rompimento', desgaste: 'Desgaste Natural', troca_tamanho: 'Troca de Tamanho', vencimento: 'Vencimento (CA)' };
    const motivoCounts = {};
    periodo.forEach(e => {
        if (!e.motivo_reposicao) return;
        const label = MOTIVO_REPOSICAO_LABELS_EPI[e.motivo_reposicao] || e.motivo_reposicao;
        motivoCounts[label] = (motivoCounts[label] || 0) + (e.quantidade || 1);
    });
    const motivoSorted = Object.entries(motivoCounts).sort((a, b) => b[1] - a[1]);
    chartInstances.epiMotivoReposicao = new Chart(document.getElementById('chartEpiMotivoReposicao'), {
        type: 'bar',
        data: { labels: motivoSorted.map(m => m[0]), datasets: [{ label: 'Reposições', data: motivoSorted.map(m => m[1]), backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    // Entregas por Setor (Período): quantidade entregue por setor - útil pra planejamento
    // de compra/estoque por frente de trabalho.
    const setorCountsEpi = {};
    periodo.forEach(e => { const s = sanitizarSetorDemandaEpi(e.setor); setorCountsEpi[s] = (setorCountsEpi[s] || 0) + (e.quantidade || 1); });
    const setorSortedEpi = Object.entries(setorCountsEpi).sort((a, b) => b[1] - a[1]);
    const epiSetorLabels = setorSortedEpi.map(s => wrapChartLabel(s[0]));
    ajustarAlturaBarrasHorizontais('chartEpiPorSetor', epiSetorLabels);
    chartInstances.epiPorSetor = new Chart(document.getElementById('chartEpiPorSetor'), {
        type: 'bar',
        data: { labels: epiSetorLabels, datasets: [{ label: 'Itens entregues', data: setorSortedEpi.map(s => s[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });

    // Snapshot dos números/gráficos/listas que acabaram de ser calculados acima, pra
    // alimentar a aba "📄 Relatório" sem duplicar nenhuma lógica de cálculo.
    window.epiReportData = {
        periodoLabel: document.getElementById('epiPeriodoTitulo')?.textContent || '',
        kpis: [
            { key: 'entregas', label: 'Entregas no Período', value: periodo.length },
            { key: 'colaboradores', label: 'Colaboradores Atendidos no Período', value: new Set(periodo.map(e => e.matricula)).size },
            { key: 'itens', label: 'Itens Cadastrados no Catálogo', value: allEpiCatalogo.filter(c => c.ativo !== false).length },
            { key: 'estoqueBaixo', label: 'Itens com Estoque Baixo', value: estoqueBaixo.length },
            { key: 'caVencidos', label: "CA's Vencidos", value: itensComCa.filter(x => x.status === 'vencido').length },
            { key: 'caVencendo', label: "CA's Vencendo (30 dias)", value: itensComCa.filter(x => x.status === 'vencendo').length },
            { key: 'totalItens', label: 'Total de Itens Entregues (Período)', value: totalItensEntregues },
            { key: 'coberturaEpi', label: 'Ativos sem Entrega Registrada', value: colaboradoresSemEpi.length },
            { key: 'taxaReposicao', label: 'Taxa de Reposição (Período)', value: periodo.length > 0 ? taxaReposicaoEpi.toFixed(1) + '%' : '—' }
        ],
        graficos: {
            graficoPorMes: { titulo: 'Entregas por Mês (Histórico Completo)', labels: meses, valores: qtdPorMes },
            graficoPorTipo: { titulo: 'Entregas por Tipo de Proteção (Período)', labels: tipoSorted.map(t => t[0]), valores: tipoSorted.map(t => t[1]) },
            graficoMotivoReposicao: { titulo: 'Motivo das Reposições (Período)', labels: motivoSorted.map(m => m[0]), valores: motivoSorted.map(m => m[1]) },
            graficoPorSetor: { titulo: 'Entregas por Setor (Período)', labels: setorSortedEpi.map(s => s[0]), valores: setorSortedEpi.map(s => s[1]) }
        },
        listas: {
            listaMaisEntregues: { titulo: 'Itens Mais Entregues (Período)', colunas: ['Item', 'Quantidade'], linhas: itemSorted.map(([label, qtd]) => [label, qtd]) },
            listaEstoqueBaixo: {
                titulo: 'Alertas de Estoque Baixo', colunas: ['Item', 'Saldo', 'Mínimo'],
                linhas: estoqueBaixo.map(es => { const cat = catalogoPorId.get(es.epi_catalogo_id); return [cat?.descricao || es.epi_catalogo_id, es.quantidade_atual || 0, es.quantidade_minima || 0]; })
            },
            listaCaVencimento: {
                titulo: "CA's Vencidos / Vencendo (30 dias)", colunas: ['Item', 'CA', 'Status', 'Validade'],
                linhas: itensComCa.map(x => [x.item.descricao || '', x.item.ca || '—', x.status === 'vencido' ? 'Vencido' : 'Vencendo', formatSimpleDate(x.item.ca_validade)])
            },
            listaSemEntrega: {
                titulo: 'Colaboradores Ativos sem Entrega Registrada', colunas: ['Nome', 'Função', 'Setor'],
                linhas: colaboradoresSemEpi.map(e => [e.nome || e.id, e.funcao || '—', e.setor || '—'])
            }
        }
    };
    if (document.getElementById('epiSubtabBtn-relatorio')?.classList.contains('active')) renderEpiRelatorioChecklist();
}

// ---- Cadastro: CRUD do catálogo de EPI ----

function renderEpiCatalogoResumo() {
    const el = document.getElementById('epiCatalogoResumo');
    if (!el) return;
    const total = allEpiCatalogo.length;
    const ativos = allEpiCatalogo.filter(c => c.ativo !== false).length;
    el.textContent = total === 0 ? '' : `${total} item(ns) cadastrado(s) — ${ativos} ativo(s)`;
}

function filterEpiCatalogoLista(query) {
    const container = document.getElementById('epiCatalogoSearchResults');
    const q = (query || '').toLowerCase().trim();
    const base = q.length < 2
        ? allEpiCatalogo
        : allEpiCatalogo.filter(c =>
            (c.descricao && c.descricao.toLowerCase().includes(q)) ||
            (c.marca && c.marca.toLowerCase().includes(q)) ||
            (c.ca && c.ca.toLowerCase().includes(q)) ||
            (c.id && c.id.toLowerCase().includes(q)));
    const matches = base.slice().sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));

    if (matches.length === 0) {
        container.innerHTML = q.length < 2
            ? '<div class="db-list-empty">Nenhum item cadastrado ainda</div>'
            : `<div class="db-list-empty">Nenhum item encontrado para "${escapeHTML(query)}"</div>`;
        return;
    }
    container.innerHTML = matches.map(c => {
        const caStatus = calcularStatusCaEpi(c);
        const caBadge = caStatus.status === 'vencido' ? ' ⚠️ CA vencido'
            : caStatus.status === 'vencendo' ? ' ⚠️ CA vence em breve'
            : '';
        return `
        <div class="db-list-item" style="cursor:pointer; ${c.ativo === false ? 'opacity:0.55;' : ''}" onclick="abrirFormEpiCatalogo('${escapeHTML(c.id)}')">
            <div class="db-list-item-title">${escapeHTML(c.descricao || '')}${c.ativo === false ? ' (inativo)' : ''}</div>
            <div class="db-list-item-sub">${EPI_TIPO_LABELS[c.tipo_protecao] || 'Outro'}${c.ca ? ' — CA ' + escapeHTML(c.ca) : ''}${c.tamanho ? ' — Tam. ' + escapeHTML(c.tamanho) : ''}<span style="color: var(--danger); font-weight:600;">${caBadge}</span></div>
        </div>`;
    }).join('');
}

function toggleExpandirEpiCatalogo() {
    const el = document.getElementById('epiCatalogoSearchResults');
    const btn = document.getElementById('btnExpandirEpiCatalogo');
    const expandido = el.style.maxHeight === 'none';
    el.style.maxHeight = expandido ? '420px' : 'none';
    btn.textContent = expandido ? '⛶ Expandir Lista' : '⛶ Recolher Lista';
}

function limparBuscaEpiCatalogo() {
    const input = document.getElementById('epiCatalogoSearchInput');
    input.value = '';
    filterEpiCatalogoLista('');
    input.focus();
}

function popularEpiCatalogoDatalist() {
    const dl = document.getElementById('epiCatalogoList');
    if (!dl) return;
    dl.innerHTML = '';
    allEpiCatalogo.filter(c => c.ativo !== false).sort((a, b) => (a.descricao || '').localeCompare(b.descricao || '')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = `${c.id} - ${c.descricao}`;
        dl.appendChild(opt);
    });
}

function buscarEpiCatalogoPorInput(inputId) {
    const raw = document.getElementById(inputId).value;
    const id = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
    return { id, cat: allEpiCatalogo.find(c => c.id === id) };
}

// Maior código puramente numérico já cadastrado + 1 - ignora variantes tipo "158-2"
// (mesmo código base com sufixo, usado pra tamanho/cor alternativos) de propósito, já
// que essas não fazem parte da sequência principal.
function proximoCodigoEpiCatalogo() {
    let maior = 0;
    allEpiCatalogo.forEach(c => {
        if (/^\d+$/.test(c.id)) {
            const n = parseInt(c.id, 10);
            if (n > maior) maior = n;
        }
    });
    return String(maior + 1);
}

// Vem do botão "✏️ Editar" nos alertas de "CA's Vencidos / Vencendo" (EPI > Visão Geral) -
// pula direto pra aba Cadastro já com o item aberto pra edição, em vez do usuário ter que
// trocar de aba e procurar o item na lista na mão. Não duplica nenhuma lógica de
// cadastro/edição - só chama, na ordem certa, as duas funções que já existem
// (showEpiSubtab pra trocar de aba, abrirFormEpiCatalogo pra abrir o item certo).
function editarItemEpiDoAlerta(id) {
    showEpiSubtab('cadastro');
    abrirFormEpiCatalogo(id);
}

function abrirFormEpiCatalogo(id) {
    const form = document.getElementById('epiCatalogoFormCard');
    const title = document.getElementById('epiCatalogoFormTitle');
    const idInput = document.getElementById('epiCatForm_id');
    const idHint = document.getElementById('epiCatForm_idHint');
    const btnExcluir = document.getElementById('epiCatForm_btnExcluir');
    document.getElementById('epiCatalogoFormStatus').textContent = '';
    document.getElementById('epiCatForm_mesclarPanel').style.display = 'none';

    if (id) {
        const c = allEpiCatalogo.find(x => x.id === id);
        if (!c) return;
        title.textContent = '✏️ Editar Item de EPI';
        idInput.value = c.id || '';
        idInput.readOnly = true;
        idInput.style.background = 'var(--bg)';
        idHint.textContent = '';
        document.getElementById('epiCatForm_descricao').value = c.descricao || '';
        document.getElementById('epiCatForm_tipoProtecao').value = c.tipo_protecao || 'outro';
        document.getElementById('epiCatForm_marca').value = c.marca || '';
        document.getElementById('epiCatForm_tamanho').value = c.tamanho || '';
        document.getElementById('epiCatForm_ca').value = c.ca || '';
        document.getElementById('epiCatForm_caValidade').value = c.ca_validade || '';
        const custoEl = document.getElementById('epiCatForm_custoUnitario');
        if (custoEl) custoEl.value = c.custo_unitario != null ? c.custo_unitario : '';
        document.getElementById('epiCatForm_ativo').checked = c.ativo !== false;
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '🦺 Novo Item de EPI';
        idInput.value = proximoCodigoEpiCatalogo();
        idInput.readOnly = false;
        idInput.style.background = '';
        idHint.textContent = '💡 Próximo código livre sugerido automaticamente - pode trocar se quiser outro.';
        document.getElementById('epiCatForm_descricao').value = '';
        document.getElementById('epiCatForm_tipoProtecao').value = 'outro';
        document.getElementById('epiCatForm_marca').value = '';
        document.getElementById('epiCatForm_tamanho').value = '';
        document.getElementById('epiCatForm_ca').value = '';
        document.getElementById('epiCatForm_caValidade').value = '';
        const custoEl = document.getElementById('epiCatForm_custoUnitario');
        if (custoEl) custoEl.value = '';
        document.getElementById('epiCatForm_ativo').checked = true;
        btnExcluir.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormEpiCatalogo() {
    document.getElementById('epiCatalogoFormCard').style.display = 'none';
    document.getElementById('epiCatForm_mesclarPanel').style.display = 'none';
}

async function salvarEpiCatalogo() {
    if (bloquearEdicaoSeNaoAutorizado('epi')) return;
    const statusEl = document.getElementById('epiCatalogoFormStatus');
    const idInput = document.getElementById('epiCatForm_id');
    const id = idInput.value.trim();
    const descricao = document.getElementById('epiCatForm_descricao').value.trim();

    if (!id || !descricao) {
        statusEl.textContent = '❌ Código e descrição são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const isNovo = !idInput.readOnly;
    if (isNovo && allEpiCatalogo.some(c => c.id === id)) {
        statusEl.textContent = '❌ Já existe um item com esse código - busque por ele na lista acima pra editar.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const custoVal = document.getElementById('epiCatForm_custoUnitario')?.value;
    const row = {
        id,
        descricao,
        tipo_protecao: document.getElementById('epiCatForm_tipoProtecao').value,
        marca: document.getElementById('epiCatForm_marca').value.trim() || null,
        tamanho: document.getElementById('epiCatForm_tamanho').value.trim() || null,
        ca: document.getElementById('epiCatForm_ca').value.trim() || null,
        ca_validade: document.getElementById('epiCatForm_caValidade').value || null,
        custo_unitario: (custoVal !== '' && !isNaN(parseFloat(custoVal))) ? parseFloat(custoVal) : null,
        ativo: document.getElementById('epiCatForm_ativo').checked
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('epi_catalogo', [row]);
        const idx = allEpiCatalogo.findIndex(c => c.id === id);
        if (idx >= 0) allEpiCatalogo[idx] = { ...allEpiCatalogo[idx], ...row };
        else allEpiCatalogo.push(row);

        popularEpiCatalogoDatalist();
        filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput').value);
        renderEpiCatalogoResumo();

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiCatalogo(), 900);
    } catch (err) {
        console.error('Erro ao salvar item de EPI:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Sem exclusão direta quando o item já tem entregas registradas - apagar quebraria a
// referência (epi_entregas.epi_catalogo_id) e o histórico dessas entregas. Nesse caso o
// usuário escolhe entre mesclar com outro item do catálogo (migra entregas + estoque,
// mesmo raciocínio já usado pra reconciliar código duplicado no catálogo de
// Treinamentos) ou só desativar (sem tocar no histórico).
function iniciarExclusaoEpiCatalogo() {
    const id = document.getElementById('epiCatForm_id').value.trim();
    const cat = allEpiCatalogo.find(c => c.id === id);
    if (!cat) return;
    const emUso = allEpiEntregas.some(e => e.epi_catalogo_id === id);

    if (!emUso) {
        if (!confirm(`Excluir "${cat.descricao}" do catálogo? Essa ação não pode ser desfeita.`)) return;
        excluirEpiCatalogoDireto(id);
        return;
    }

    const qtd = allEpiEntregas.filter(e => e.epi_catalogo_id === id).length;
    document.getElementById('epiCatForm_mesclarAviso').innerHTML =
        `⚠️ <strong>"${escapeHTML(cat.descricao)}"</strong> tem ${qtd} entrega(s) já registrada(s). Pra excluir, escolha outro item do catálogo pra migrar entregas e estoque antes (ex: item duplicado com o mesmo CA), ou apenas desative sem mesclar.`;
    document.getElementById('epiCatForm_mesclarAlvo').value = '';
    document.getElementById('epiCatForm_mesclarPanel').style.display = 'block';
}

async function excluirEpiCatalogoDireto(id) {
    if (bloquearEdicaoSeNaoAutorizado('epi')) return;
    const statusEl = document.getElementById('epiCatalogoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('epi_catalogo', id);
        allEpiCatalogo = allEpiCatalogo.filter(c => c.id !== id);
        popularEpiCatalogoDatalist();
        filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput').value);
        renderEpiCatalogoResumo();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiCatalogo(), 900);
    } catch (err) {
        console.error('Erro ao excluir item de EPI:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function desativarEpiCatalogoAtual() {
    const id = document.getElementById('epiCatForm_id').value.trim();
    const cat = allEpiCatalogo.find(c => c.id === id);
    if (!cat) return;
    const statusEl = document.getElementById('epiCatalogoFormStatus');
    statusEl.textContent = 'Desativando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        const row = { ...cat, ativo: false };
        await supabaseUpsert('epi_catalogo', [row]);
        const idx = allEpiCatalogo.findIndex(c => c.id === id);
        allEpiCatalogo[idx] = row;
        document.getElementById('epiCatForm_mesclarPanel').style.display = 'none';
        popularEpiCatalogoDatalist();
        filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput').value);
        renderEpiCatalogoResumo();
        statusEl.textContent = '✅ Item desativado.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiCatalogo(), 900);
    } catch (err) {
        console.error('Erro ao desativar item de EPI:', err);
        statusEl.textContent = '❌ Falha: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Migra entregas (epi_entregas.epi_catalogo_id) e soma o estoque físico real do item de
// origem no destino ANTES de excluir - epi_estoque tem ON DELETE CASCADE em
// epi_catalogo_id, então excluir sem migrar primeiro apagaria silenciosamente a contagem
// de estoque do item de origem junto com o catálogo.
async function confirmarMesclarExcluirEpi() {
    const statusEl = document.getElementById('epiCatalogoFormStatus');
    const origId = document.getElementById('epiCatForm_id').value.trim();
    const alvoRaw = document.getElementById('epiCatForm_mesclarAlvo').value;
    const alvoId = alvoRaw.includes(' - ') ? alvoRaw.split(' - ')[0].trim() : alvoRaw.trim();

    if (!alvoId || alvoId === origId) {
        statusEl.textContent = '❌ Escolha um item de destino diferente do atual.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const catAlvo = allEpiCatalogo.find(c => c.id === alvoId);
    if (!catAlvo) {
        statusEl.textContent = '❌ Item de destino não encontrado no catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const afetadas = allEpiEntregas.filter(e => e.epi_catalogo_id === origId);
    statusEl.textContent = `Migrando ${afetadas.length} entrega(s)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        if (afetadas.length > 0) {
            const linhas = afetadas.map(e => ({ ...e, epi_catalogo_id: alvoId }));
            await supabaseUpsert('epi_entregas', linhas);
        }

        const estoqueOrigem = allEpiEstoque.find(s => s.epi_catalogo_id === origId);
        if (estoqueOrigem && estoqueOrigem.quantidade_atual) {
            const estoqueAlvo = allEpiEstoque.find(s => s.epi_catalogo_id === alvoId);
            const novaQtd = (estoqueAlvo?.quantidade_atual || 0) + estoqueOrigem.quantidade_atual;
            await supabaseUpsertEstoque([{
                epi_catalogo_id: alvoId,
                quantidade_atual: novaQtd,
                quantidade_minima: estoqueAlvo?.quantidade_minima || 0
            }]);
        }

        await supabaseDelete('epi_catalogo', origId);

        afetadas.forEach(e => { e.epi_catalogo_id = alvoId; });
        if (estoqueOrigem && estoqueOrigem.quantidade_atual) {
            const idxAlvo = allEpiEstoque.findIndex(s => s.epi_catalogo_id === alvoId);
            const novaQtd = (allEpiEstoque[idxAlvo]?.quantidade_atual || 0) + estoqueOrigem.quantidade_atual;
            if (idxAlvo >= 0) allEpiEstoque[idxAlvo] = { ...allEpiEstoque[idxAlvo], quantidade_atual: novaQtd };
            else allEpiEstoque.push({ epi_catalogo_id: alvoId, quantidade_atual: novaQtd, quantidade_minima: 0 });
        }
        allEpiEstoque = allEpiEstoque.filter(s => s.epi_catalogo_id !== origId);
        allEpiCatalogo = allEpiCatalogo.filter(c => c.id !== origId);

        document.getElementById('epiCatForm_mesclarPanel').style.display = 'none';
        popularEpiCatalogoDatalist();
        filterEpiCatalogoLista(document.getElementById('epiCatalogoSearchInput').value);
        renderEpiCatalogoResumo();
        renderEpiEstoquePanel();
        statusEl.textContent = `✅ ${afetadas.length} entrega(s) migrada(s) para "${catAlvo.descricao}" e item antigo excluído.`;
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiCatalogo(), 1800);
    } catch (err) {
        console.error('Erro ao mesclar/excluir item de EPI:', err);
        statusEl.textContent = '❌ Falha ao mesclar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Estoque Inteligente (Consumo, Cobertura, Famílias de Tamanhos e Sugestão de Compras) ----

var epiEstoqueFiltroAtual = 'todos';

function setEpiModoVisualizacao(modo) {
    epiModoVisaoEstoque = modo;
    const btnGrade = document.getElementById('epiModoVisaoBtn-grade');
    const btnLista = document.getElementById('epiModoVisaoBtn-lista');
    if (btnGrade) btnGrade.classList.toggle('active', modo === 'grade');
    if (btnLista) btnLista.classList.toggle('active', modo === 'lista');
    filterEpiEstoqueLista(document.getElementById('epiEstoqueSearchInput')?.value || '');
}

function renderEpiEstoquePanel() {
    filterEpiEstoqueLista(document.getElementById('epiEstoqueSearchInput')?.value || '');
}

var EPI_ESTOQUE_FILTRO_LABELS = { todos: 'Todos', com: 'Com saldo', sem: 'Sem saldo' };

function filtrarEpiEstoquePorSaldo(filtro) {
    epiEstoqueFiltroAtual = filtro;
    ['todos', 'com', 'sem'].forEach(f => {
        const btn = document.getElementById('epiEstoqueFiltroBtn-' + f);
        if (btn) btn.classList.toggle('active', f === filtro);
    });
    const btnRelatorio = document.getElementById('epiEstoqueRelatorioBtn');
    if (btnRelatorio) btnRelatorio.textContent = `🖨️ Relatório de Estoque (${EPI_ESTOQUE_FILTRO_LABELS[filtro]})`;
    filterEpiEstoqueLista(document.getElementById('epiEstoqueSearchInput')?.value || '');
}

// Extrai o nome da "Família / Modelo" de um EPI para agrupar as grades de tamanhos (ex: Botas, Calças, Macacões)
function extrairFamiliaEpi(cat) {
    if (!cat) return 'Outros';
    if (cat.modelo_base && cat.modelo_base.trim()) return cat.modelo_base.trim();
    const desc = (cat.descricao || '').trim();
    let base = desc
        .replace(/\s*-\s*TAMANHO\s*:\s*([0-9]+|[PPMGp-z]+|ÚNICO|UNICO)[^\-]*/i, '')
        .replace(/\s*TAMANHO\s*:\s*([0-9]+|[PPMGp-z]+|ÚNICO|UNICO)[^\-]*/i, '')
        .replace(/\s*-\s*TAM\s*:\s*([0-9]+|[PPMGp-z]+)[^\-]*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    return base || desc;
}

// Calcula métricas de consumo mensal (últimos 90 dias), dias de cobertura restante e sugestão de compras
function calcularMetricasEpi(catalogoId) {
    const hoje = new Date();
    const data90 = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);
    const limite90Str = toISODateLocal(data90);

    const entregas90 = allEpiEntregas.filter(e => e.epi_catalogo_id === catalogoId && e.data_entrega >= limite90Str);
    const qtdTotal90 = entregas90.reduce((acc, e) => acc + (Number(e.quantidade) || 1), 0);
    const consumoMensal = qtdTotal90 > 0 ? (qtdTotal90 / 3) : 0;
    const consumoDiario = consumoMensal / 30;

    const es = allEpiEstoque.find(x => x.epi_catalogo_id === catalogoId);
    const cat = allEpiCatalogo.find(x => x.id === catalogoId);
    const saldo = es ? (es.quantidade_atual || 0) : 0;
    const minimo = es ? (es.quantidade_minima || 0) : 0;
    const custoUnit = Number(cat?.custo_unitario) || 0;
    const valorEstoque = saldo * custoUnit;

    let coberturaDias = 0;
    if (consumoDiario > 0) {
        coberturaDias = Math.round(saldo / consumoDiario);
    } else {
        coberturaDias = saldo > 0 ? 999 : 0;
    }

    let nivel = 'seguro';
    let badgeHtml = '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">🟢 Seguro</span>';
    let label = '🟢 Seguro';

    if (saldo <= 0) {
        nivel = 'zerado';
        badgeHtml = '<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">🚫 Sem Saldo</span>';
        label = '🚫 Sem Saldo';
    } else if (coberturaDias < 15 || (minimo > 0 && saldo <= minimo)) {
        nivel = 'critico';
        badgeHtml = `<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">🔴 Crítico (${coberturaDias}d)</span>`;
        label = `🔴 Crítico (${coberturaDias}d)`;
    } else if (coberturaDias <= 30) {
        nivel = 'reposicao';
        badgeHtml = `<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">🟡 Reposição (${coberturaDias}d)</span>`;
        label = `🟡 Reposição (${coberturaDias}d)`;
    } else if (coberturaDias > 90 && consumoDiario > 0) {
        nivel = 'excesso';
        badgeHtml = `<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">🔵 Excesso (${coberturaDias}d)</span>`;
        label = `🔵 Excesso (${coberturaDias}d)`;
    } else {
        const dStr = coberturaDias >= 999 ? 'Estável' : `${coberturaDias}d`;
        badgeHtml = `<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">🟢 ${dStr}</span>`;
        label = `🟢 ${dStr}`;
    }

    // Sugestão de compra p/ 45 dias de cobertura (ou cobrir o estoque mínimo)
    const alvoQtd = Math.ceil(consumoDiario * 45);
    const difMinimo = minimo > saldo ? (minimo - saldo) : 0;
    const sugestaoQtd = (saldo <= minimo || coberturaDias <= 30) ? Math.max(0, alvoQtd - saldo, difMinimo) : 0;
    const valorSugestao = sugestaoQtd * custoUnit;

    return {
        catalogoId,
        cat,
        es,
        saldo,
        minimo,
        custoUnit,
        valorEstoque,
        consumoMensal,
        consumoDiario,
        coberturaDias,
        nivel,
        badgeHtml,
        label,
        sugestaoQtd,
        valorSugestao
    };
}

function filterEpiEstoqueLista(query) {
    const container = document.getElementById('epiEstoqueSearchResults');
    if (!container) return;
    const q = (query || '').toLowerCase().trim();
    const estoquePorId = new Map(allEpiEstoque.map(es => [es.epi_catalogo_id, es]));
    const ativos = allEpiCatalogo.filter(c => c.ativo !== false);

    // 1. Atualizar os 4 KPIs no topo do Estoque
    let totalComSaldo = 0;
    let totalCriticos = 0;
    let totalReposicao = 0;
    let valorTotalEstoque = 0;

    ativos.forEach(c => {
        const m = calcularMetricasEpi(c.id);
        if (m.saldo > 0) totalComSaldo++;
        if (m.nivel === 'zerado' || m.nivel === 'critico') totalCriticos++;
        else if (m.nivel === 'reposicao') totalReposicao++;
        valorTotalEstoque += m.valorEstoque;
    });

    const kpiTotal = document.getElementById('kpiEpiEstoqueTotalItens');
    if (kpiTotal) kpiTotal.textContent = `${totalComSaldo} / ${ativos.length}`;
    const kpiCrit = document.getElementById('kpiEpiEstoqueCritico');
    if (kpiCrit) kpiCrit.textContent = totalCriticos;
    const kpiRep = document.getElementById('kpiEpiEstoqueReposicao');
    if (kpiRep) kpiRep.textContent = totalReposicao;
    const kpiValor = document.getElementById('kpiEpiEstoqueValorTotal');
    if (kpiValor) kpiValor.textContent = 'R$ ' + valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 2. Filtragem de itens por busca e saldo
    let itens = ativos.slice();
    if (q.length >= 2) {
        itens = itens.filter(c => (c.descricao || '').toLowerCase().includes(q) || (c.ca || '').toLowerCase().includes(q) || (c.marca || '').toLowerCase().includes(q));
    }
    if (epiEstoqueFiltroAtual === 'com') {
        itens = itens.filter(c => (estoquePorId.get(c.id)?.quantidade_atual || 0) > 0);
    } else if (epiEstoqueFiltroAtual === 'sem') {
        itens = itens.filter(c => (estoquePorId.get(c.id)?.quantidade_atual || 0) <= 0);
    }

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum item encontrado para este filtro</div>';
        return;
    }

    // 3. Renderização no MODO FAMÍLIA (GRADE COMPACTA)
    if (epiModoVisaoEstoque === 'grade') {
        const familiasMap = new Map();
        itens.forEach(c => {
            const famNome = extrairFamiliaEpi(c);
            if (!familiasMap.has(famNome)) {
                familiasMap.set(famNome, []);
            }
            familiasMap.get(famNome).push(c);
        });

        const familias = Array.from(familiasMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        container.innerHTML = familias.map(([famNome, itensDaFamilia]) => {
            let saldoTotalFam = 0;
            let consumoMensalFam = 0;
            let valorEstoqueFam = 0;
            let temCritico = false;
            let temZerado = false;

            itensDaFamilia.sort((a, b) => {
                const tamA = a.tamanho || '';
                const tamB = b.tamanho || '';
                const numA = parseInt(tamA, 10);
                const numB = parseInt(tamB, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return tamA.localeCompare(tamB);
            });

            const gradeBotoesHtml = itensDaFamilia.map(c => {
                const m = calcularMetricasEpi(c.id);
                saldoTotalFam += m.saldo;
                consumoMensalFam += m.consumoMensal;
                valorEstoqueFam += m.valorEstoque;
                if (m.nivel === 'zerado') temZerado = true;
                if (m.nivel === 'critico') temCritico = true;

                let btnBg = 'var(--bg)';
                let btnBorder = 'var(--border)';
                let btnColor = 'var(--text)';
                let statusIcon = '';

                if (m.saldo <= 0) {
                    btnBg = '#fdf2f2'; btnBorder = '#f87171'; btnColor = '#c0392b'; statusIcon = '🚫 ';
                } else if (m.nivel === 'critico') {
                    btnBg = '#fff5f5'; btnBorder = '#ef4444'; btnColor = '#c0392b'; statusIcon = '🔴 ';
                } else if (m.nivel === 'reposicao') {
                    btnBg = '#fffdf0'; btnBorder = '#f59e0b'; btnColor = '#b78a00'; statusIcon = '🟡 ';
                }

                const tamLabel = c.tamanho ? c.tamanho : (c.descricao.match(/TAMANHO:\s*([^\s\-]+)/i)?.[1] || 'Único');
                const tooltip = `Item ${c.id} - ${c.descricao}\nSaldo: ${m.saldo} un (Mín: ${m.minimo})\nConsumo: ${m.consumoMensal.toFixed(1)}/mês\nCobertura: ${m.coberturaDias} dias\nClique p/ registrar entrada ou ajuste`;

                return `<button onclick="abrirFormEpiEntrada('${escapeHTML(c.id)}')" title="${escapeHTML(tooltip)}"
                    style="padding: 6px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; background: ${btnBg}; border: 1px solid ${btnBorder}; color: ${btnColor}; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;">
                    ${statusIcon}<span>${escapeHTML(tamLabel)}</span>: <b>${m.saldo}</b>
                </button>`;
            }).join('');

            const consumoDiarioFam = consumoMensalFam / 30;
            const cobFamDias = consumoDiarioFam > 0 ? Math.round(saldoTotalFam / consumoDiarioFam) : (saldoTotalFam > 0 ? 999 : 0);
            const statusGeralBadge = temZerado
                ? '<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">⚠️ Há tamanho zerado</span>'
                : (temCritico
                    ? '<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">⚠️ Tamanho em risco</span>'
                    : '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">✅ Grade OK</span>');

            const caExemplo = itensDaFamilia[0]?.ca ? `CA: ${escapeHTML(itensDaFamilia[0].ca)}` : '';
            const marcaExemplo = itensDaFamilia[0]?.marca ? ` · Marca: ${escapeHTML(itensDaFamilia[0].marca)}` : '';
            const valorFamStr = valorEstoqueFam > 0 ? ` · Valor: R$ ${valorEstoqueFam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';

            return `
            <div class="db-list-item" style="padding: 12px 14px; margin-bottom: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--card);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
                    <div>
                        <div style="font-weight: 700; font-size: 13.5px; color: var(--text);">${escapeHTML(famNome)}</div>
                        <div style="font-size: 11.5px; color: var(--text-light); margin-top: 2px;">
                            ${caExemplo}${marcaExemplo} · Total: <b>${saldoTotalFam} un</b> · Consumo: <b>${consumoMensalFam.toFixed(1)}/mês</b> · Cobertura: <b>${cobFamDias >= 999 ? 'Estável' : cobFamDias + ' dias'}</b>${valorFamStr}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button onclick="event.stopPropagation(); abrirConsumoEpiFamilia('${escapeHTML(famNome)}')" title="Ver consumo mensal, média e justificativa de compras desta família" class="db-clear-btn" style="padding:4px 8px; font-size:11px; background:rgba(79, 70, 229, 0.08); color:var(--primary); border-color:rgba(79, 70, 229, 0.3);">📊 Consumo</button>
                        ${statusGeralBadge}
                    </div>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; padding-top: 4px; border-top: 1px dashed var(--border);">
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-light); margin-right: 4px;">Grade de Tamanhos:</span>
                    ${gradeBotoesHtml}
                </div>
            </div>`;
        }).join('');

    } else {
        // 4. Renderização no MODO DETALHADO (LISTA ITEM A ITEM)
        container.innerHTML = itens.map(c => {
            const m = calcularMetricasEpi(c.id);
            const caStr = c.ca ? ` · CA: ${escapeHTML(c.ca)}` : '';
            const custoStr = m.custoUnit > 0 ? ` · R$ ${m.custoUnit.toFixed(2)}/un` : '';
            const valorTotalItemStr = m.valorEstoque > 0 ? ` · Total: R$ ${m.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';

            return `
            <div class="db-list-item ${m.nivel === 'critico' || m.nivel === 'zerado' ? 'db-item-danger' : (m.nivel === 'reposicao' ? 'db-item-warning' : '')}"
                 style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;"
                 onclick="abrirFormEpiEntrada('${escapeHTML(c.id)}')">
                <div style="flex:1; min-width:240px;">
                    <div class="db-list-item-title">${escapeHTML(c.descricao || '')}</div>
                    <div class="db-list-item-sub">
                        Saldo: <b>${m.saldo}</b> (Mín: ${m.minimo}) · Consumo: <b>${m.consumoMensal.toFixed(1)}/mês</b> · Cobertura: <b>${m.coberturaDias >= 999 ? 'Estável' : m.coberturaDias + ' dias'}</b>${caStr}${custoStr}${valorTotalItemStr}
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button onclick="event.stopPropagation(); abrirConsumoEpiItem('${escapeHTML(c.id)}')" title="Ver consumo mensal e justificativa de compras deste item" class="db-clear-btn" style="padding:4px 8px; font-size:11px; background:rgba(79, 70, 229, 0.08); color:var(--primary); border-color:rgba(79, 70, 229, 0.3);">📊 Consumo</button>
                    ${m.badgeHtml}
                </div>
            </div>`;
        }).join('');
    }
}

function limparBuscaEpiEstoque() {
    const input = document.getElementById('epiEstoqueSearchInput');
    if (input) { input.value = ''; input.focus(); }
    filterEpiEstoqueLista('');
}

// ---- Sugestão de Compras Interativa (Ponto de Pedido) ----

var epiItensSolicitacaoCompras = [];

function toggleFormAdicionarItemCompras() {
    const p = document.getElementById('formAdicionarItemComprasPanel');
    if (!p) return;
    const abrindo = p.style.display === 'none';
    p.style.display = abrindo ? 'block' : 'none';
    if (abrindo) {
        const input = document.getElementById('addCompras_itemInput');
        if (input) { input.value = ''; input.focus(); }
    }
}

function confirmarAdicionarItemCompras() {
    const itemInput = document.getElementById('addCompras_itemInput');
    const qtdInput = document.getElementById('addCompras_qtdInput');
    if (!itemInput) return;
    const { id, cat } = buscarEpiCatalogoPorInput('addCompras_itemInput');
    if (!cat) {
        alert('Selecione um item válido do catálogo.');
        return;
    }
    const qtd = parseInt(qtdInput?.value, 10);
    if (isNaN(qtd) || qtd <= 0) {
        alert('Informe uma quantidade válida maior que zero.');
        return;
    }

    const jaExiste = epiItensSolicitacaoCompras.find(i => i.catalogoId === id);
    if (jaExiste) {
        jaExiste.sugestaoQtd += qtd;
        jaExiste.valorSugestao = jaExiste.sugestaoQtd * jaExiste.custoUnit;
    } else {
        const m = calcularMetricasEpi(id);
        m.sugestaoQtd = qtd;
        m.valorSugestao = qtd * m.custoUnit;
        epiItensSolicitacaoCompras.unshift(m);
    }

    toggleFormAdicionarItemCompras();
    renderEpiTabelaItensCompras();
}

function alterarQtdItemCompras(id, novaQtdStr) {
    const item = epiItensSolicitacaoCompras.find(i => i.catalogoId === id);
    if (!item) return;
    const qtd = parseInt(novaQtdStr, 10);
    if (isNaN(qtd) || qtd <= 0) return;
    item.sugestaoQtd = qtd;
    item.valorSugestao = qtd * item.custoUnit;
    atualizarResumoTotaisCompras();
}

function removerItemSolicitacaoCompras(id) {
    epiItensSolicitacaoCompras = epiItensSolicitacaoCompras.filter(i => i.catalogoId !== id);
    renderEpiTabelaItensCompras();
}

function atualizarResumoTotaisCompras() {
    let valorTotal = 0;
    let totalPecas = 0;
    epiItensSolicitacaoCompras.forEach(i => {
        valorTotal += (i.valorSugestao || 0);
        totalPecas += (i.sugestaoQtd || 0);
    });

    const totalItensEl = document.getElementById('comprasResumo_totalItens');
    if (totalItensEl) totalItensEl.textContent = `${epiItensSolicitacaoCompras.length} modelos (${totalPecas} peças)`;
    const totalValorEl = document.getElementById('comprasResumo_totalValor');
    if (totalValorEl) totalValorEl.textContent = 'R$ ' + valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    // Atualiza subtotais de cada linha
    epiItensSolicitacaoCompras.forEach(i => {
        const subEl = document.getElementById(`subtotalCompra_${i.catalogoId}`);
        if (subEl) {
            subEl.textContent = i.valorSugestao > 0 ? `R$ ${i.valorSugestao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
        }
    });
}

function abrirEpiSugestaoComprasModal() {
    const modal = document.getElementById('epiSugestaoComprasModal');
    if (!modal) return;

    // Regra Inteligente: só sugere automaticamente itens que estão em giro real ou com estoque mínimo configurado
    // Itens antigos/descontinuados de lotes anteriores com saldo zerado e consumo zero NÃO entram
    const ativos = allEpiCatalogo.filter(c => c.ativo !== false);
    epiItensSolicitacaoCompras = [];

    ativos.forEach(c => {
        const m = calcularMetricasEpi(c.id);
        const temGiroRecente = m.consumoMensal > 0.4; // Pelo menos 1 saída a cada 2 meses
        const temMinimoConfigurado = m.minimo > 0;

        if (temGiroRecente || temMinimoConfigurado) {
            if (m.coberturaDias <= 30 || (temMinimoConfigurado && m.saldo <= m.minimo)) {
                if (m.sugestaoQtd > 0) {
                    epiItensSolicitacaoCompras.push(m);
                }
            }
        }
    });

    // Ordena priorizando menor cobertura (mais urgente primeiro)
    epiItensSolicitacaoCompras.sort((a, b) => (a.coberturaDias - b.coberturaDias) || (b.valorSugestao - a.valorSugestao));

    renderEpiTabelaItensCompras();
    modal.style.display = 'block';
    modal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderEpiTabelaItensCompras() {
    const container = document.getElementById('epiSugestaoComprasList');
    if (!container) return;

    if (epiItensSolicitacaoCompras.length === 0) {
        container.innerHTML = `
        <div style="text-align:center; padding: 24px 10px; color: var(--success); font-weight:600;">
            🎉 Nenhum item pendente de reposição! Todos os EPIs ativos possuem estoque seguro para mais de 30 dias de trabalho.
            <div style="margin-top: 8px; font-weight: normal; font-size: 12px; color: var(--text-light);">
                Se desejar cotar algum item manualmente, clique em <b>"+ Adicionar Item"</b> acima.
            </div>
        </div>`;
        return;
    }

    let valorTotalEstimado = 0;
    let totalPecasSugeridas = 0;
    epiItensSolicitacaoCompras.forEach(i => {
        valorTotalEstimado += i.valorSugestao;
        totalPecasSugeridas += i.sugestaoQtd;
    });

    const linhasHtml = epiItensSolicitacaoCompras.map((m, idx) => {
        const cat = m.cat;
        const tamStr = cat.tamanho || (cat.descricao.match(/TAMANHO:\s*([^\s\-]+)/i)?.[1] || 'Único');
        const custoStr = m.custoUnit > 0 ? `R$ ${m.custoUnit.toFixed(2)}` : '<span style="color:var(--text-light);">—</span>';
        const totalStr = m.valorSugestao > 0 ? `R$ ${m.valorSugestao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

        return `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 6px; text-align: center; white-space: nowrap;">
                <button onclick="removerItemSolicitacaoCompras('${escapeHTML(m.catalogoId)}')" title="Remover este item da solicitação de compras"
                        style="background: transparent; border: none; cursor: pointer; color: var(--danger); font-size: 14px; padding: 2px 3px;">🗑️</button>
                <button onclick="abrirConsumoEpiItem('${escapeHTML(m.catalogoId)}')" title="Ver consumo médio mensal e parecer técnico deste item"
                        style="background: transparent; border: none; cursor: pointer; color: var(--primary); font-size: 14px; padding: 2px 3px;">📊</button>
            </td>
            <td style="padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px;"><b>${escapeHTML(cat.descricao)}</b></td>
            <td style="padding: 6px; text-align: center;">${escapeHTML(tamStr)}</td>
            <td style="padding: 6px; text-align: center;">${escapeHTML(cat.ca || '—')}</td>
            <td style="padding: 6px; text-align: center;">${m.saldo}</td>
            <td style="padding: 6px; text-align: center;">${m.consumoMensal.toFixed(1)}</td>
            <td style="padding: 6px; text-align: center;">${m.badgeHtml}</td>
            <td style="padding: 6px; text-align: center;">
                <input type="number" min="1" step="1" value="${m.sugestaoQtd}" id="qtdCompra_${m.catalogoId}"
                       oninput="alterarQtdItemCompras('${m.catalogoId}', this.value)"
                       style="width: 70px; text-align: center; padding: 5px 6px; font-weight: 700; font-size: 13px; color: #2563eb; border: 1px solid #2563eb; border-radius: 6px; background: rgba(37,99,235,0.06);">
            </td>
            <td style="padding: 6px; text-align: right; color: var(--text-light); font-size: 11px;">${custoStr}</td>
            <td style="padding: 6px; text-align: right; font-weight: 600;" id="subtotalCompra_${m.catalogoId}">${totalStr}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
    <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12.5px; background: var(--bg); padding: 8px 12px; border-radius: 8px;">
        <div><b>Itens na Solicitação:</b> <span id="comprasResumo_totalItens">${epiItensSolicitacaoCompras.length} modelos (${totalPecasSugeridas} peças)</span></div>
        <div><b>Estimativa Interna (R$):</b> <b style="color:var(--success); font-size:14px;" id="comprasResumo_totalValor">R$ ${valorTotalEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
        <thead>
            <tr style="background: var(--bg); text-align: left; border-bottom: 2px solid var(--border);">
                <th style="padding: 6px; width: 30px; text-align: center;">Excluir</th>
                <th style="padding: 6px; width: 25px; text-align: center;">#</th>
                <th style="padding: 6px;">Item de EPI (Descrição Técnica)</th>
                <th style="padding: 6px; width: 55px; text-align: center;">Tam</th>
                <th style="padding: 6px; width: 65px; text-align: center;">CA Ref.</th>
                <th style="padding: 6px; width: 50px; text-align: center;">Saldo</th>
                <th style="padding: 6px; width: 65px; text-align: center;">Giro/mês</th>
                <th style="padding: 6px; width: 85px; text-align: center;">Cobertura</th>
                <th style="padding: 6px; width: 85px; text-align: center; color: #2563eb;">Qtd Pedida</th>
                <th style="padding: 6px; width: 75px; text-align: right; color: var(--text-light);">Custo Est.</th>
                <th style="padding: 6px; width: 90px; text-align: right;">Total Est.</th>
            </tr>
        </thead>
        <tbody>${linhasHtml}</tbody>
    </table>`;
}

function fecharEpiSugestaoComprasModal() {
    const modal = document.getElementById('epiSugestaoComprasModal');
    if (modal) modal.style.display = 'none';
    const formAdd = document.getElementById('formAdicionarItemComprasPanel');
    if (formAdd) formAdd.style.display = 'none';
}

function imprimirSugestaoComprasEpi() {
    if (epiItensSolicitacaoCompras.length === 0) {
        alert('A lista de compras está vazia.');
        return;
    }

    const incluirValores = !!document.getElementById('chkImprimirValoresCompras')?.checked;
    const dataHoje = formatSimpleDate(toISODateLocal(new Date()));

    let totalPecas = 0;
    let totalValor = 0;
    epiItensSolicitacaoCompras.forEach(i => {
        totalPecas += (i.sugestaoQtd || 0);
        totalValor += (i.valorSugestao || 0);
    });

    const linhas = epiItensSolicitacaoCompras.map((m, i) => {
        const cat = m.cat;
        const tamStr = cat.tamanho || (cat.descricao.match(/TAMANHO:\s*([^\s\-]+)/i)?.[1] || 'Único');
        const caStr = cat.ca ? `CA ${escapeHTML(cat.ca)}` : 'Conforme especificação';
        const colunasValoresHtml = incluirValores ? `
            <td style="text-align:right;">${m.custoUnit > 0 ? 'R$ ' + m.custoUnit.toFixed(2) : '—'}</td>
            <td style="text-align:right; font-weight:600;">${m.valorSugestao > 0 ? 'R$ ' + m.valorSugestao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
        ` : `<td style="text-align:center; color:#555;">${m.saldo} un (cobertura: ${m.coberturaDias}d)</td>
             <td style="color:#777; font-size:8.5px;">Aguardando cotação de suprimentos</td>`;

        return `<tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><b>${escapeHTML(cat.descricao)}</b></td>
            <td style="text-align:center;"><b>${escapeHTML(tamStr)}</b></td>
            <td style="text-align:center;">${caStr}</td>
            <td style="text-align:center; font-weight:700; font-size:11px; background:#f0f4ff;">${m.sugestaoQtd}</td>
            ${colunasValoresHtml}
        </tr>`;
    }).join('');

    const cabecalhoValoresTh = incluirValores ? `
        <th style="width:75px;">Custo Unit. Est.</th>
        <th style="width:85px;">Total Est.</th>
    ` : `
        <th style="width:110px;">Estoque Atual</th>
        <th style="width:130px;">Observações da Cotação</th>
    `;

    const resumoOrcamentoHtml = incluirValores ? `
        <div class="campo" style="flex:1.5;"><b>ORÇAMENTO TOTAL ESTIMADO:</b> R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
    ` : '';

    const tituloDoc = incluirValores ? 'ESTIMATIVA DE COMPRAS DE EPI (ORÇAMENTO INTERNO)' : 'REQUISIÇÃO DE COMPRA DE EPI / MATERIAL (SESMT)';

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${tituloDoc} - ${escapeHTML(EMPRESA_INFO.razaoSocial)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .folha { max-width: 1400px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 200px; padding: 6px 10px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo { flex: 1; text-align: center; font-weight: 700; font-size: 14px; padding: 8px; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 5px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px 6px; font-size: 9.5px; vertical-align: top; }
    th { background: #e5e5e5; text-align: center; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #2563eb; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <img class="logo" src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:48px; object-fit:contain;">
            <div class="titulo">${tituloDoc}<br><span style="font-weight:400; font-size:11px;">Solicitação de Suprimentos para Atendimento ao Canteiro de Obras</span></div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
            <div class="campo"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</div>
            <div class="campo"><b>DATA DE EMISSÃO:</b> ${dataHoje}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>TOTAL DE ITENS:</b> ${epiItensSolicitacaoCompras.length} modelos</div>
            <div class="campo"><b>QUANTIDADE TOTAL DE PEÇAS:</b> ${totalPecas} un/pares</div>
            ${resumoOrcamentoHtml}
        </div>
        <table>
            <thead><tr>
                <th style="width:25px;">#</th>
                <th>Especificação Técnica do EPI</th>
                <th style="width:45px;">Tam</th>
                <th style="width:85px;">CA Referência</th>
                <th style="width:80px; background:#e0e7ff;">Qtd Solicitada</th>
                ${cabecalhoValoresTh}
            </tr></thead>
            <tbody>${linhas}</tbody>
        </table>
        <div style="padding: 16px; margin-top: 24px; display: flex; justify-content: space-around; border-top: 1px solid #000; text-align: center; font-size: 11px;">
            <div>____________________________________________<br><b>Engenharia de Segurança do Trabalho / Solicitante</b></div>
            <div>____________________________________________<br><b>Setor de Compras / Aprovação de Cotação</b></div>
        </div>
    </div>
</body></html>`;

    abrirDocumentoBlob(html);
}

// Relatório de Estoque de EPI (2026-09-19)
function gerarRelatorioEstoqueEpi() {
    const estoquePorId = new Map(allEpiEstoque.map(es => [es.epi_catalogo_id, es]));
    let itens = allEpiCatalogo.filter(c => c.ativo !== false);
    if (epiEstoqueFiltroAtual === 'com') {
        itens = itens.filter(c => (estoquePorId.get(c.id)?.quantidade_atual || 0) > 0);
    } else if (epiEstoqueFiltroAtual === 'sem') {
        itens = itens.filter(c => (estoquePorId.get(c.id)?.quantidade_atual || 0) <= 0);
    }
    itens = itens.slice().sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));
    const filtroLabel = EPI_ESTOQUE_FILTRO_LABELS[epiEstoqueFiltroAtual] || 'Todos';

    let comSaldo = 0, semSaldo = 0, abaixoMinimo = 0;
    const linhas = itens.map((c, i) => {
        const es = estoquePorId.get(c.id);
        const atual = es ? (es.quantidade_atual || 0) : 0;
        const minimo = es ? (es.quantidade_minima || 0) : 0;
        let statusTxt = '🟢 OK';
        if (atual <= 0) { statusTxt = '🚫 Sem saldo'; semSaldo++; }
        else {
            comSaldo++;
            if (atual <= minimo) { statusTxt = '🟡 Abaixo do mínimo'; abaixoMinimo++; }
        }
        return `<tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${escapeHTML(c.descricao || '')}</td>
            <td style="text-align:center;">${escapeHTML(c.ca || '')}</td>
            <td style="text-align:center;">${atual}</td>
            <td style="text-align:center;">${minimo}</td>
            <td style="text-align:center;">${statusTxt}</td>
            <td></td>
            <td></td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Estoque de EPI (${escapeHTML(filtroLabel)}) - ${escapeHTML(EMPRESA_INFO.razaoSocial)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .folha { max-width: 1400px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 200px; padding: 6px 10px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo { flex: 1; text-align: center; font-weight: 700; font-size: 14px; padding: 8px; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 5px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px 5px; font-size: 9.5px; vertical-align: top; }
    th { background: #e5e5e5; text-align: center; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <img class="logo" src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:48px; object-fit:contain;">
            <div class="titulo">RELATÓRIO DE ESTOQUE DE EPI<br><span style="font-weight:400; font-size:11px;">Emitido em ${formatSimpleDate(toISODateLocal(new Date()))} — para conferência com a contagem física</span></div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
            <div class="campo"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</div>
            <div class="campo"><b>FILTRO APLICADO:</b> ${escapeHTML(filtroLabel)}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>TOTAL DE ITENS NESTE RELATÓRIO:</b> ${itens.length}</div>
            <div class="campo"><b>COM SALDO:</b> ${comSaldo}</div>
            <div class="campo"><b>SEM SALDO:</b> ${semSaldo}</div>
            <div class="campo"><b>ABAIXO DO MÍNIMO:</b> ${abaixoMinimo}</div>
        </div>
        <table>
            <thead><tr>
                <th style="width:30px;">Nº</th><th>Descrição</th><th style="width:70px;">CA</th><th style="width:70px;">Saldo Sistema</th><th style="width:60px;">Mínimo</th><th style="width:100px;">Status</th><th style="width:90px;">Contagem Física</th><th style="width:140px;">Observações</th>
            </tr></thead>
            <tbody>${linhas || '<tr><td colspan="8" style="text-align:center;">Nenhum item encontrado para este filtro.</td></tr>'}</tbody>
        </table>
    </div>
</body></html>`;

    abrirDocumentoBlob(html);
}

// Formulário de Entrada de Estoque / Compra
function abrirFormEpiEntrada(catalogoId) {
    const form = document.getElementById('epiEntradaFormCard');
    const itemInput = document.getElementById('epiEntradaForm_item');
    const qtdInput = document.getElementById('epiEntradaForm_quantidade');
    const qtdLabel = document.getElementById('epiEntradaForm_quantidadeLabel');
    const minInput = document.getElementById('epiEntradaForm_minimo');
    const dataInput = document.getElementById('epiEntradaForm_data');
    const nfInput = document.getElementById('epiEntradaForm_nf');
    const fornecInput = document.getElementById('epiEntradaForm_fornecedor');
    const custoInput = document.getElementById('epiEntradaForm_custo');
    const title = document.getElementById('epiEntradaFormTitle');
    const btnSalvar = document.getElementById('epiEntradaForm_btnSalvar');
    document.getElementById('epiEntradaFormStatus').textContent = '';

    const hojeStr = toISODateLocal(new Date());
    if (dataInput) dataInput.value = hojeStr;

    if (catalogoId) {
        const cat = allEpiCatalogo.find(c => c.id === catalogoId);
        if (!cat) return;
        const es = allEpiEstoque.find(x => x.epi_catalogo_id === catalogoId);
        form.dataset.editCatalogoId = catalogoId;
        title.textContent = '✏️ Editar Estoque: ' + cat.descricao;
        itemInput.value = `${cat.id} - ${cat.descricao}`;
        itemInput.readOnly = true;
        itemInput.style.background = 'var(--bg)';
        qtdLabel.textContent = 'Saldo Atual (corrija o número direto) *';
        qtdInput.min = 0;
        qtdInput.value = es ? es.quantidade_atual : 0;
        minInput.value = es ? es.quantidade_minima : 0;
        if (custoInput) custoInput.value = cat.custo_unitario != null ? cat.custo_unitario : '';
        if (nfInput) nfInput.value = '';
        if (fornecInput) fornecInput.value = 'NEOBETEL EPI';
        btnSalvar.textContent = '💾 Salvar Correção';
    } else {
        delete form.dataset.editCatalogoId;
        title.textContent = '📥 Entrada de Estoque / Nova Compra';
        itemInput.value = '';
        itemInput.readOnly = false;
        itemInput.style.background = '';
        qtdLabel.textContent = 'Quantidade a Adicionar *';
        qtdInput.min = 1;
        qtdInput.value = '';
        minInput.value = '';
        if (custoInput) custoInput.value = '';
        if (nfInput) nfInput.value = '';
        if (fornecInput) fornecInput.value = 'NEOBETEL EPI';
        btnSalvar.textContent = '💾 Adicionar ao Estoque';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormEpiEntrada() {
    document.getElementById('epiEntradaFormCard').style.display = 'none';
}

async function salvarEpiEntrada() {
    if (bloquearEdicaoSeNaoAutorizado('epi')) return;
    const statusEl = document.getElementById('epiEntradaFormStatus');
    const form = document.getElementById('epiEntradaFormCard');
    const editCatalogoId = form.dataset.editCatalogoId;
    const valor = parseInt(document.getElementById('epiEntradaForm_quantidade').value, 10);
    const minimoStr = document.getElementById('epiEntradaForm_minimo').value;
    const dataEntrada = document.getElementById('epiEntradaForm_data')?.value || toISODateLocal(new Date());
    const notaFiscal = document.getElementById('epiEntradaForm_nf')?.value.trim() || null;
    const fornecedor = document.getElementById('epiEntradaForm_fornecedor')?.value.trim() || null;
    const custoStr = document.getElementById('epiEntradaForm_custo')?.value;
    const custoUnit = (custoStr !== '' && !isNaN(parseFloat(custoStr))) ? parseFloat(custoStr) : null;

    let catalogoId, cat;
    if (editCatalogoId) {
        catalogoId = editCatalogoId;
        cat = allEpiCatalogo.find(c => c.id === catalogoId);
    } else {
        ({ id: catalogoId, cat } = buscarEpiCatalogoPorInput('epiEntradaForm_item'));
    }

    if (!cat) {
        statusEl.textContent = '❌ Item não encontrado no catálogo. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    if (isNaN(valor) || valor < 0) {
        statusEl.textContent = '❌ Informe uma quantidade válida.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const existente = allEpiEstoque.find(es => es.epi_catalogo_id === catalogoId);
    const novoSaldo = editCatalogoId ? valor : ((existente?.quantidade_atual || 0) + valor);
    const row = {
        epi_catalogo_id: catalogoId,
        quantidade_atual: novoSaldo,
        quantidade_minima: minimoStr !== '' ? parseInt(minimoStr, 10) : (existente?.quantidade_minima || 0)
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsertEstoque([row]);
        const idx = allEpiEstoque.findIndex(es => es.epi_catalogo_id === catalogoId);
        if (idx >= 0) allEpiEstoque[idx] = { ...allEpiEstoque[idx], ...row };
        else allEpiEstoque.push(row);

        // Se for registro de compra/entrada real (e não correção direta de saldo)
        if (!editCatalogoId && valor > 0) {
            const entradaRow = {
                id: 'ENT_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                epi_catalogo_id: catalogoId,
                quantidade: valor,
                data_entrada: dataEntrada,
                nota_fiscal: notaFiscal,
                fornecedor: fornecedor,
                custo_unitario: custoUnit,
                valor_total: custoUnit != null ? (valor * custoUnit) : null,
                observacoes: 'Entrada registrada via Painel Gerencial',
                registrado_por: (typeof usuarioLogadoNome === 'function' ? usuarioLogadoNome() : null) || 'SESMT'
            };
            try {
                await supabaseUpsert('epi_entradas', [entradaRow]);
                allEpiEntradas.unshift(entradaRow);
            } catch (errEntrada) {
                console.warn('Aviso ao registrar histórico de entrada:', errEntrada);
            }
        }

        // Se o usuário informou ou atualizou o custo unitário, memoriza no catálogo
        if (custoUnit != null && custoUnit !== cat.custo_unitario) {
            try {
                await supabaseUpsert('epi_catalogo', [{ id: catalogoId, custo_unitario: custoUnit }]);
                cat.custo_unitario = custoUnit;
            } catch (errCusto) {
                console.warn('Aviso ao atualizar custo no catálogo:', errCusto);
            }
        }

        filterEpiEstoqueLista(document.getElementById('epiEstoqueSearchInput')?.value || '');
        statusEl.textContent = '✅ Estoque atualizado com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiEntrada(), 900);
    } catch (err) {
        console.error('Erro ao salvar estoque:', err);
        statusEl.textContent = '❌ Falha: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Lançamentos: entregas individuais (mesmo padrão de Atestados Ocupacionais) ----

function popularEpiColabDatalist() {
    const dl = document.getElementById('epiColabList');
    if (!dl || dl.options.length > 0) return;
    allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.id} - ${e.nome}`;
        dl.appendChild(opt);
    });
}

// ---- Histórico por colaborador (mesma visão que o app de campo mostra ao escanear o QR) ----

var EPI_FICHA_BTN_IDS = ['epiFichaBtnHoje', 'epiFichaBtnMes', 'epiFichaBtnTrimestre', 'epiFichaBtnAno', 'epiFichaBtnTodos'];

// Preenche De/Até a partir de um atalho - os campos continuam editáveis na mão depois,
// pro caso de um recorte que não bate com nenhum atalho (ver comentário em
// renderEpiHistoricoColaborador).
function setEpiFichaPeriodo(tipo) {
    const inicioEl = document.getElementById('epiFichaDataInicio');
    const fimEl = document.getElementById('epiFichaDataFim');
    if (!inicioEl || !fimEl) return;
    const hoje = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (tipo === 'todos') {
        inicioEl.value = '';
        fimEl.value = '';
    } else if (tipo === 'hoje') {
        inicioEl.value = fmt(hoje);
        fimEl.value = fmt(hoje);
    } else if (tipo === 'mes') {
        inicioEl.value = fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
        fimEl.value = fmt(hoje);
    } else if (tipo === 'trimestre') {
        inicioEl.value = fmt(new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1));
        fimEl.value = fmt(hoje);
    } else if (tipo === 'ano') {
        inicioEl.value = fmt(new Date(hoje.getFullYear(), 0, 1));
        fimEl.value = fmt(hoje);
    }

    EPI_FICHA_BTN_IDS.forEach(id => document.getElementById(id)?.classList.remove('active'));
    const map = { hoje: 'epiFichaBtnHoje', mes: 'epiFichaBtnMes', trimestre: 'epiFichaBtnTrimestre', ano: 'epiFichaBtnAno', todos: 'epiFichaBtnTodos' };
    document.getElementById(map[tipo])?.classList.add('active');
}

// Edição manual das datas não corresponde mais a nenhum atalho fixo - desmarca todos
// pra não mostrar um atalho "ativo" que já não bate com o que está nos campos.
function onEpiFichaDataManualChange() {
    EPI_FICHA_BTN_IDS.forEach(id => document.getElementById(id)?.classList.remove('active'));
}

function renderEpiHistoricoColaborador() {
    const { matricula, colab } = buscarColaboradorPorInput('epiHistoricoColabInput');
    const content = document.getElementById('epiHistoricoColabContent');
    if (!content) return;
    if (!colab) {
        content.innerHTML = matricula ? '<div class="db-list-empty">Colaborador não encontrado - selecione um da lista.</div>' : '';
        return;
    }

    const catalogoPorId = new Map(allEpiCatalogo.map(c => [c.id, c]));
    const entregas = allEpiEntregas
        .filter(e => e.matricula === matricula)
        .sort((a, b) => (b.data_entrega || '').localeCompare(a.data_entrega || ''));

    // Colaboradores antigos acumulam dezenas de entregas - imprimir sempre o histórico
    // inteiro fica impraticável (achado relatado pelo usuário). Um "ano" sozinho é
    // granularidade grossa demais (não cobre "hoje" ou "este mês") - filtro real de
    // período (De/Até), com botões de atalho que só preenchem os mesmos campos de data,
    // deixando o intervalo sempre editável na mão pra qualquer recorte.
    let html = `
        <div class="db-chart-card" style="margin-bottom: 12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
                <div>
                    <div class="db-chart-title" style="margin-bottom: 4px;">${escapeHTML(colab.nome || '')}</div>
                    <div style="font-size: 12.5px; color: var(--text-light);">
                        ${colab.funcao ? escapeHTML(colab.funcao) + ' — ' : ''}${escapeHTML(colab.setor || '')}<br>
                        Matrícula: ${escapeHTML(matricula)} — ${entregas.length} entrega(s) no total
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="db-apply-btn" onclick="abrirFichaEpiColaborador('${escapeHTML(matricula)}', false, document.getElementById('epiFichaDataInicio').value, document.getElementById('epiFichaDataFim').value)">🖨️ Gerar Ficha de EPI</button>
                    <button class="db-apply-btn" style="background: var(--text-light);" onclick="abrirFichaEpiColaborador('${escapeHTML(matricula)}', true)" title="Gera a ficha sem listar as entregas já registradas, com linhas em branco pra preencher na mão">🖨️ Gerar Ficha em Branco</button>
                    <button class="db-clear-btn" onclick="abrirAnexoModal('epi_entregas', '${escapeHTML(matricula)}', 'Ficha Assinada — ${escapeHTML(colab.nome || matricula)}')">📎 Anexos (Ficha Assinada)${labelContagemAnexos('epi_entregas', matricula)}</button>
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border);">
                <label style="display:block; margin-bottom: 6px; color: var(--text-light); font-weight: 600; font-size: 12px;">Período da Ficha de EPI</label>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 8px;">
                    <button id="epiFichaBtnHoje" class="db-filter-btn" onclick="setEpiFichaPeriodo('hoje')">Hoje</button>
                    <button id="epiFichaBtnMes" class="db-filter-btn" onclick="setEpiFichaPeriodo('mes')">Este Mês</button>
                    <button id="epiFichaBtnTrimestre" class="db-filter-btn" onclick="setEpiFichaPeriodo('trimestre')">Últimos 3 Meses</button>
                    <button id="epiFichaBtnAno" class="db-filter-btn" onclick="setEpiFichaPeriodo('ano')">Este Ano</button>
                    <button id="epiFichaBtnTodos" class="db-filter-btn active" onclick="setEpiFichaPeriodo('todos')">Todos os Períodos</button>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; font-size: 12.5px;">
                    <label style="color: var(--text-light);">De:</label>
                    <input type="date" id="epiFichaDataInicio" onchange="onEpiFichaDataManualChange()" style="padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px;">
                    <label style="color: var(--text-light);">Até:</label>
                    <input type="date" id="epiFichaDataFim" onchange="onEpiFichaDataManualChange()" style="padding: 6px 8px; border: 1px solid var(--border); border-radius: 8px;">
                    <span style="color: var(--text-light);">(em branco = histórico completo)</span>
                </div>
            </div>
        </div>
    `;

    if (entregas.length === 0) {
        html += '<div class="db-list-empty">Nenhuma entrega de EPI registrada para este colaborador</div>';
    } else {
        html += `<div class="db-list" style="max-height: 480px;">` + entregas.map(e => {
            const cat = catalogoPorId.get(e.epi_catalogo_id);
            const descricao = cat?.descricao || e.epi_catalogo_id || 'Item removido do catálogo';
            return `<div class="db-list-item">
                <div class="db-list-item-title">${escapeHTML(descricao)}${e.quantidade > 1 ? ' — ' + e.quantidade + ' un.' : ''}</div>
                <div class="db-list-item-sub">${formatSimpleDate(e.data_entrega)}${e.tipo_entrega ? ' • ' + escapeHTML(e.tipo_entrega) : ''}${e.origem === 'IMPORT_HISTORICO' ? ' • histórico importado' : ''}</div>
            </div>`;
        }).join('') + `</div>`;
    }
    content.innerHTML = html;
}

// Réplica impressa/exportável em PDF da ficha física já usada pra entrega de EPI
// (FOR.M.ST-57 R01) - texto e campos copiados fiel ao modelo que o usuário já usa em
// papel, preenchidos automaticamente com os dados reais do colaborador e sua entrega
// (evita digitar tudo de novo à mão toda vez que precisa arquivar/imprimir uma ficha).
// Sem biblioteca de PDF aqui (o painel não carrega jsPDF, só o app de campo) - gera uma
// página HTML pronta pra impressão numa aba nova, e "Salvar como PDF" no diálogo de
// impressão do navegador já entrega exatamente o mesmo resultado.

// Logo oficial do consórcio, embutida como data URI pra a Ficha de EPI ser um HTML
// autocontido (funciona mesmo aberta numa aba/popup em branco, sem depender de
// carregar um arquivo externo).
if (typeof LOGO_COP_BASE64 === 'undefined') { window.LOGO_COP_BASE64 = 'data:image/png;base64,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'; }

async function abrirFichaEpiColaborador(matricula, forcarBranco, dataInicio, dataFim) {
    const colab = allEfetivo.find(e => e.id === matricula);
    if (!colab) { alert('Colaborador não encontrado.'); return; }
    await garantirDocumentosControleCarregados();

    // data_entrega é DATE no formato ISO (YYYY-MM-DD), então comparação de string
    // funciona direto pra filtrar por período, sem precisar converter pra Date.
    const catalogoPorId = new Map(allEpiCatalogo.map(c => [c.id, c]));
    const entregas = forcarBranco ? [] : allEpiEntregas
        .filter(e => e.matricula === matricula)
        .filter(e => !dataInicio || (e.data_entrega && e.data_entrega >= dataInicio))
        .filter(e => !dataFim || (e.data_entrega && e.data_entrega <= dataFim))
        .sort((a, b) => (a.data_entrega || '').localeCompare(b.data_entrega || ''));

    const periodoLabel = dataInicio && dataFim
        ? (dataInicio === dataFim ? formatSimpleDate(dataInicio) : `${formatSimpleDate(dataInicio)} a ${formatSimpleDate(dataFim)}`)
        : dataInicio ? `A partir de ${formatSimpleDate(dataInicio)}`
        : dataFim ? `Até ${formatSimpleDate(dataFim)}`
        : '';

    // Uma imagem real da assinatura capturada (base64, do QR no app de campo) é prova
    // visível de verdade - o texto "✓ assinado digitalmente" sozinho não vale nada
    // juridicamente numa ficha impressa, é só uma alegação não verificável (apontado
    // pelo usuário). Sem assinatura capturada, fica em branco pra assinar na mão mesmo.
    const linhasReais = entregas.map((e, i) => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        const assinaturaCel = e.assinatura
            ? `<img src="${escapeHTML(e.assinatura)}" alt="Assinatura" style="max-width:100%; max-height:28px; object-fit:contain;">`
            : '';
        return `<tr>
            <td style="text-align:center;">${String(i + 1).padStart(2, '0')}</td>
            <td>${escapeHTML(cat?.descricao || e.epi_catalogo_id || '—')}</td>
            <td style="text-align:center;">${e.quantidade || 1}</td>
            <td style="text-align:center;">${escapeHTML(cat?.tamanho || '')}</td>
            <td style="text-align:center;">${escapeHTML(cat?.ca || '')}</td>
            <td>${escapeHTML(cat?.marca || '')}</td>
            <td style="text-align:center;">${formatSimpleDate(e.data_entrega)}</td>
            <td></td>
            <td style="text-align:center;">${assinaturaCel}</td>
        </tr>`;
    });

    // Sempre completa até um mínimo de linhas numeradas em branco, tenha ou não entregas
    // reais - uma ficha com só 2 itens não pode terminar a tabela na linha 02 e deixar o
    // resto da folha vazio (mesmo problema já resolvido pro Registro de Treinamento,
    // reaberto aqui porque a ficha de EPI tinha sua própria lógica separada). 16 linhas
    // é o mesmo total já validado cabendo numa página só quando a ficha sai 100% em
    // branco - continua cabendo aqui porque o cabeçalho da Ficha de EPI é mais enxuto
    // que o do Registro de Treinamento (sem objetivo/conteúdo programático).
    const FICHA_EPI_MIN_LINHAS = 16;
    const linhasVazias = [];
    for (let i = entregas.length; i < FICHA_EPI_MIN_LINHAS; i++) {
        linhasVazias.push(`<tr style="height: 23px;">
            <td style="text-align:center;">${String(i + 1).padStart(2, '0')}</td>
            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
        </tr>`);
    }
    const linhasTabela = linhasReais.concat(linhasVazias).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha de EPI${forcarBranco ? ' (Em Branco)' : periodoLabel ? ' - ' + periodoLabel : ''} - ${escapeHTML(colab.nome || matricula)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    .folha { max-width: 1000px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 220px; padding: 6px 10px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo { flex: 1; text-align: center; font-weight: 700; font-size: 15px; padding: 8px; }
    .cabecalho .codigo { width: 120px; padding: 8px; border-left: 2px solid #000; text-align: center; font-weight: 700; font-size: 11px; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 5px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 4px; }
    .termo { padding: 6px 14px; font-style: italic; font-size: 10.5px; line-height: 1.35; border-bottom: 1px solid #000; }
    .assinaturas { display: flex; border-bottom: 2px solid #000; }
    .assinaturas .campo { padding: 4px 10px 6px; text-align: center; }
    .assinaturas .linha-assinatura { border-top: 1px solid #000; margin: 14px 30px 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
    th { background: #e5e5e5; font-size: 10.5px; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:52px; object-fit:contain;">
            <div class="titulo">FICHA DE CONTROLE DE EQUIPAMENTO DE<br>PROTEÇÃO INDIVIDUAL - EPI E UNIFORME</div>
            <div class="codigo">${escapeHTML(codigoRevisaoDocumento('ficha_epi') || 'FOR.M.ST-57')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA:</b> CONSÓRCIO OPERADOR RAMAL DO AGRESTE</div>
            <div class="campo"><b>OBRA:</b> RAMAL DO AGRESTE</div>
        </div>
        <div class="linha">
            <div class="campo"><b>NOME DO FUNCIONÁRIO:</b> ${escapeHTML(colab.nome || '')}</div>
            ${periodoLabel ? `<div class="campo" style="flex:0 0 260px;"><b>PERÍODO DESTA FICHA:</b> ${escapeHTML(periodoLabel)}</div>` : ''}
        </div>
        <div class="linha">
            <div class="campo"><b>FUNÇÃO:</b> ${escapeHTML(colab.funcao || '')}</div>
            <div class="campo"><b>CPF:</b> ${escapeHTML(colab.cpf || '')}</div>
            <div class="campo"><b>SETOR:</b> ${escapeHTML(colab.setor || '')}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>DATA DE ADMISSÃO:</b> ${colab.dt_admissao ? formatSimpleDate(colab.dt_admissao) : ''}</div>
            <div class="campo" style="flex:2;"><b>Data de entrada na unidade</b> (em caso de transferência):</div>
            <div class="campo"><b>DATA DE DEMISSÃO:</b> ${colab.dt_demissao ? formatSimpleDate(colab.dt_demissao) : ''}</div>
        </div>
        <div class="termo">
            Afirmo através deste que fui orientado e treinado sobre o uso adequado, guarda e conservação EPI's abaixo especificados a serem usados no
            desempenho de minhas funções. Assumi o compromisso de usá-los durante a jornada de trabalho, zelar pela conservação dos mesmos, informar o
            meu supervisor ou setor de Segurança quando necessário trocas ou reposição e devolvê-los à empresa quando do meu desligamento. Em caso de
            perda ou extravio ou inutilização proposital, reembolsarei à Empresa o valor correspondente do EPI. Estou ciente também que o não uso desses
            EPI's implicará em insubordinação sujeito às sanções disciplinares prevista na legislação trabalhista vigente. Minha assinatura ou rubrica
            posta no local indicado na ficha confirmam minha concordância.
        </div>
        <div class="assinaturas">
            <div class="campo"><div class="linha-assinatura"></div>(Assinatura do Empregado)</div>
            <div class="campo"><div class="linha-assinatura"></div>(Rubrica do Empregado)</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ITEM</th><th>EQUIPAMENTO</th><th>QTD</th><th>TAMANHO</th><th>C.A</th><th>FABRICANTE</th>
                    <th>DATA<br>RECEBIMENTO</th><th>DATA<br>DEVOLUÇÃO</th><th>ASSINATURA/RUBRICA</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>
    </div>
</body></html>`;

    // window.open('', '_blank') + document.write cai no bloqueador de pop-up de
    // vários navegadores/extensões mesmo saindo de um clique real (achado ao testar
    // ao vivo) - abrir via um <a target="_blank"> clicado programaticamente não conta
    // como pop-up pro navegador (é o mesmo truque usado por qualquer site pra "abrir/
    // baixar" um arquivo gerado na hora), então é bem mais confiável.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    registrarEmissaoDocumento('ficha_epi', colab.nome);
}

function onEpiColaboradorChange() {
    const { colab } = buscarColaboradorPorInput('epiEntregaForm_matricula');
    document.getElementById('epiEntregaForm_colabPreview').textContent = colab ? `✓ ${colab.nome} — ${colab.funcao || ''} — ${colab.setor || ''}` : '';
}

function renderEpiEntregasResumo() {
    const el = document.getElementById('epiEntregasResumo');
    if (el) el.textContent = `${allEpiEntregas.length} entrega(s) registrada(s) no total`;
}

function filterEpiEntregasLista(query) {
    const container = document.getElementById('epiEntregasSearchResults');
    if (!container) return;
    const q = (query || '').toLowerCase().trim();
    const catalogoPorId = new Map(allEpiCatalogo.map(c => [c.id, c]));
    let lista = allEpiEntregas.slice();
    if (q.length >= 2) {
        lista = lista.filter(e => {
            const cat = catalogoPorId.get(e.epi_catalogo_id);
            return (e.matricula || '').toLowerCase().includes(q) ||
                   (e.nome || '').toLowerCase().includes(q) ||
                   (cat?.descricao || '').toLowerCase().includes(q);
        });
    }
    lista.sort((a, b) => (b.data_entrega || '').localeCompare(a.data_entrega || ''));
    const limitado = q.length >= 2 ? lista : lista.slice(0, 100);

    if (limitado.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma entrega encontrada</div>';
        return;
    }
    container.innerHTML = limitado.map(e => {
        const cat = catalogoPorId.get(e.epi_catalogo_id);
        return `<div class="db-list-item" style="cursor:pointer;" onclick="abrirFormEpiEntrega('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || e.matricula)} — ${escapeHTML(cat?.descricao || e.epi_catalogo_id || 'Item removido')}</div>
            <div class="db-list-item-sub">${formatSimpleDate(e.data_entrega)}${e.quantidade > 1 ? ' — ' + e.quantidade + ' un.' : ''}${e.origem === 'IMPORT_HISTORICO' ? ' — histórico importado' : ''}</div>
        </div>`;
    }).join('');
}

function limparBuscaEpiEntregas() {
    const input = document.getElementById('epiEntregasSearchInput');
    if (input) { input.value = ''; input.focus(); }
    filterEpiEntregasLista('');
}

function abrirFormEpiEntrega(id) {
    const form = document.getElementById('epiEntregaFormCard');
    const title = document.getElementById('epiEntregaFormTitle');
    const btnExcluir = document.getElementById('epiEntregaForm_btnExcluir');
    document.getElementById('epiEntregaFormStatus').textContent = '';
    document.getElementById('epiEntregaForm_colabPreview').textContent = '';
    popularEpiColabDatalist();
    popularEpiCatalogoDatalist();

    if (id) {
        const e = allEpiEntregas.find(x => x.id === id);
        if (!e) return;
        title.textContent = '✏️ Editar Entrega';
        form.dataset.editId = id;
        document.getElementById('epiEntregaForm_matricula').value = e.matricula ? `${e.matricula} - ${e.nome || ''}` : (e.nome || '');
        onEpiColaboradorChange();
        const cat = allEpiCatalogo.find(c => c.id === e.epi_catalogo_id);
        document.getElementById('epiEntregaForm_item').value = cat ? `${cat.id} - ${cat.descricao}` : (e.epi_catalogo_id || '');
        document.getElementById('epiEntregaForm_quantidade').value = e.quantidade || 1;
        document.getElementById('epiEntregaForm_data').value = e.data_entrega || '';
        document.getElementById('epiEntregaForm_tipo').value = e.tipo_entrega || 'inicial';
        document.getElementById('epiEntregaForm_motivo').value = e.motivo_reposicao || '';
        document.getElementById('epiEntregaForm_entreguePor').value = e.entregue_por || '';
        document.getElementById('epiEntregaForm_obs').value = e.observacoes || '';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '📝 Nova Entrega';
        delete form.dataset.editId;
        document.getElementById('epiEntregaForm_matricula').value = '';
        document.getElementById('epiEntregaForm_item').value = '';
        document.getElementById('epiEntregaForm_quantidade').value = 1;
        document.getElementById('epiEntregaForm_data').value = new Date().toISOString().split('T')[0];
        document.getElementById('epiEntregaForm_tipo').value = 'inicial';
        document.getElementById('epiEntregaForm_motivo').value = '';
        document.getElementById('epiEntregaForm_entreguePor').value = '';
        document.getElementById('epiEntregaForm_obs').value = '';
        btnExcluir.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormEpiEntrega() {
    document.getElementById('epiEntregaFormCard').style.display = 'none';
}

async function salvarEpiEntrega() {
    if (bloquearEdicaoSeNaoAutorizado('epi')) return;
    const statusEl = document.getElementById('epiEntregaFormStatus');
    const data = document.getElementById('epiEntregaForm_data').value;
    const qtd = parseInt(document.getElementById('epiEntregaForm_quantidade').value, 10) || 1;

    if (!data) {
        statusEl.textContent = '❌ Data da entrega é obrigatória.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const { matricula, colab } = buscarColaboradorPorInput('epiEntregaForm_matricula');
    if (!colab) {
        statusEl.textContent = '❌ Colaborador não encontrado. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const { id: catalogoId, cat } = buscarEpiCatalogoPorInput('epiEntregaForm_item');
    if (!cat) {
        statusEl.textContent = '❌ Item de EPI não encontrado no catálogo. Selecione um da lista.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const form = document.getElementById('epiEntregaFormCard');
    const editId = form.dataset.editId;
    const id = editId || ('EPI_' + Date.now());

    const row = {
        id,
        matricula,
        nome: colab.nome || null,
        funcao: colab.funcao || null,
        setor: colab.setor ? sanitizarSetorDemandaEpi(colab.setor) : null,
        epi_catalogo_id: catalogoId,
        quantidade: qtd,
        data_entrega: data,
        tipo_entrega: document.getElementById('epiEntregaForm_tipo').value || null,
        motivo_reposicao: document.getElementById('epiEntregaForm_motivo').value || null,
        entregue_por: document.getElementById('epiEntregaForm_entreguePor').value.trim() || null,
        observacoes: document.getElementById('epiEntregaForm_obs').value.trim() || null,
        origem: 'APP'
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('epi_entregas', [row]);
        const idx = allEpiEntregas.findIndex(e => e.id === id);
        if (idx >= 0) allEpiEntregas[idx] = { ...allEpiEntregas[idx], ...row };
        else allEpiEntregas.push(row);

        // Só desconta do saldo quando o item já tem controle de estoque ativo (uma linha
        // em epi_estoque criada por uma Entrada anterior) - itens nunca estocados não
        // ganham uma linha "negativa" implícita só por causa de uma entrega, e o saldo
        // pode ficar negativo sem travar o lançamento (o técnico tem o item na mão de
        // qualquer forma; negativo aqui só sinaliza que o estoque está desatualizado).
        if (!editId) {
            const estoqueExistente = allEpiEstoque.find(es => es.epi_catalogo_id === catalogoId);
            if (estoqueExistente) {
                const novoSaldo = { ...estoqueExistente, quantidade_atual: (estoqueExistente.quantidade_atual || 0) - qtd };
                await supabaseUpsertEstoque([novoSaldo]);
                const esIdx = allEpiEstoque.findIndex(es => es.epi_catalogo_id === catalogoId);
                allEpiEstoque[esIdx] = novoSaldo;
            }
        }

        renderEpiEntregasResumo();
        filterEpiEntregasLista(document.getElementById('epiEntregasSearchInput')?.value || '');
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiEntrega(), 900);
    } catch (err) {
        console.error('Erro ao salvar entrega de EPI:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirEpiEntregaAtual() {
    if (bloquearEdicaoSeNaoAutorizado('epi')) return;
    const form = document.getElementById('epiEntregaFormCard');
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm('Excluir esta entrega? Essa ação não pode ser desfeita.')) return;

    const statusEl = document.getElementById('epiEntregaFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('epi_entregas', id);
        allEpiEntregas = allEpiEntregas.filter(e => e.id !== id);
        renderEpiEntregasResumo();
        filterEpiEntregasLista(document.getElementById('epiEntregasSearchInput')?.value || '');
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormEpiEntrega(), 900);
    } catch (err) {
        console.error('Erro ao excluir entrega de EPI:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Importação do histórico (TB_LACAMENTO.csv exportado do SharePoint) ----
// Formato separado por vírgula com campos entre aspas (diferente do CSV de Treinamentos,
// que é ;) - por isso usa seu próprio parser em vez de um split(',') ingênuo, já que
// "Modificado por" e outros campos livres podem conter vírgula.
function parseCSVLineQuoted(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = false;
            } else cur += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { result.push(cur); cur = ''; }
            else cur += c;
        }
    }
    result.push(cur);
    return result;
}

function normalizarDescricaoEpi(str) {
    return (str || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

// TAMANHO e CA aparecem rotulados dentro da própria DESCRICAO ("... - TAMANHO: G - CA:
// 19224" ou variações como "CA.39828" sem espaço) - só isso é extraído com confiança.
// "Marca" fica em branco na importação (formato livre demais pra separar com segurança
// sem arriscar dado errado) - editável manualmente depois em Cadastro se for útil.
function extrairTamanhoCA(descricao) {
    const tamanhoMatch = descricao.match(/TAMANHO:\s*([^-]+)/i);
    const caMatch = descricao.match(/\bCA[.:]?\s*(\d{3,6})/i);
    return {
        tamanho: tamanhoMatch ? tamanhoMatch[1].trim() : null,
        ca: caMatch ? caMatch[1].trim() : null
    };
}

// Classificação automática por palavra-chave, só uma estimativa inicial pra já deixar o
// gráfico "por tipo de proteção" com algum dado - a planilha de origem não tem essa
// coluna. Revisável item a item na aba Cadastro.
function classificarTipoProtecao(descricao) {
    const d = (descricao || '').toUpperCase();
    if (/LUVA/.test(d)) return 'maos';
    if (/BOTA|CALÇAD|CALCAD|T[ÊE]NIS/.test(d)) return 'pes';
    if (/CAPACETE|CARNEIRA/.test(d)) return 'cabeca';
    if (/[ÓO]CULOS|VISEIRA/.test(d)) return 'olhos';
    if (/PROTETOR AURICULAR|ABAFADOR|PLUG/.test(d)) return 'audicao';
    if (/M[ÁA]SCARA|RESPIRADOR|FILTRO/.test(d)) return 'respiratorio';
    if (/CINTO|TALABARTE|TRAVA.?QUEDA/.test(d)) return 'altura';
    if (/AVENTAL|CAL[ÇC]A|CAMISA|UNIFORME|MACAC[ÃA]O|COLETE|PROTETOR SOLAR/.test(d)) return 'corpo';
    return 'outro';
}

async function importarEpiCSV() {
    const input = document.getElementById('epiFileInput');
    const statusEl = document.getElementById('epiImportStatus');
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

        const headers = parseCSVLineQuoted(lines[0]).map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });
        function col(parts, name) {
            const i = idx[name.toUpperCase()];
            return i !== undefined ? (parts[i] || '').trim() : '';
        }

        const catalogoMap = new Map();
        const idEpiToDescMap = new Map();
        const entregasMap = new Map();
        let puladas = 0;

        for (let li = 1; li < lines.length; li++) {
            const parts = parseCSVLineQuoted(lines[li]);
            const rowId = col(parts, 'ID');
            const idEpi = col(parts, 'ID_EPI');
            const matricula = col(parts, 'MATRICULA').toUpperCase();
            const descricaoRaw = col(parts, 'DESCRICAO');
            const dataEntrega = parseDataBR(col(parts, 'DATA_ENTREGA'));

            if (!rowId || !idEpi || !matricula || !descricaoRaw || !dataEntrega) {
                puladas++;
                continue;
            }

            // O mesmo ID_EPI foi reusado no SharePoint pra itens com CA/marca diferentes
            // ao longo do tempo (achado real: 8 dos 155 códigos) - dentro de cada ID_EPI,
            // descrições diferentes viram entradas de catálogo separadas (sufixo -2, -3...),
            // já que CA é o que importa pra compliance, não o código antigo.
            const descricaoNorm = normalizarDescricaoEpi(descricaoRaw);
            if (!idEpiToDescMap.has(idEpi)) idEpiToDescMap.set(idEpi, new Map());
            const descMap = idEpiToDescMap.get(idEpi);
            let catalogId;
            if (descMap.has(descricaoNorm)) {
                catalogId = descMap.get(descricaoNorm);
            } else {
                const n = descMap.size;
                catalogId = n === 0 ? idEpi : `${idEpi}-${n + 1}`;
                descMap.set(descricaoNorm, catalogId);
            }

            if (!catalogoMap.has(catalogId)) {
                const { tamanho, ca } = extrairTamanhoCA(descricaoRaw);
                catalogoMap.set(catalogId, {
                    id: catalogId,
                    tipo_protecao: classificarTipoProtecao(descricaoRaw),
                    descricao: descricaoRaw,
                    marca: null,
                    tamanho,
                    ca,
                    ativo: true
                });
            }

            const tipoEntregaRaw = col(parts, 'TIPO_DE_ENTREGA').toUpperCase();
            const tipoEntrega = tipoEntregaRaw === 'INICIAL' ? 'inicial'
                : (tipoEntregaRaw.startsWith('REPOSI') ? 'reposicao' : null);

            const entregaId = 'LEGACY_' + rowId;
            entregasMap.set(entregaId, {
                id: entregaId,
                matricula,
                nome: col(parts, 'NOME') || null,
                funcao: col(parts, 'FUNCAO') || null,
                setor: col(parts, 'SETOR') || null,
                epi_catalogo_id: catalogId,
                quantidade: 1,
                data_entrega: dataEntrega,
                tipo_entrega: tipoEntrega,
                entregue_por: null,
                origem: 'IMPORT_HISTORICO'
            });
        }

        const catalogoArr = Array.from(catalogoMap.values());
        const entregasArr = Array.from(entregasMap.values());

        statusEl.textContent = `Enviando ${catalogoArr.length} itens de catálogo...`;
        await supabaseUpsert('epi_catalogo', catalogoArr);

        const BATCH_SIZE = 500;
        let enviados = 0;
        for (let i = 0; i < entregasArr.length; i += BATCH_SIZE) {
            const batch = entregasArr.slice(i, i + BATCH_SIZE);
            await supabaseUpsert('epi_entregas', batch);
            enviados += batch.length;
            statusEl.textContent = `Enviando entregas... ${enviados}/${entregasArr.length}`;
        }

        statusEl.textContent = `✅ Importação concluída! ${enviados} entregas e ${catalogoArr.length} itens de catálogo importados/atualizados. ${puladas} linha(s) pulada(s) por dado incompleto. O tipo de proteção foi classificado automaticamente por palavra-chave - revise e corrija na aba Cadastro se necessário.`;
        epiLoaded = true;
        await loadEpiData();
    } catch (err) {
        console.error('Erro ao importar histórico de EPI:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ================================================================
// MÓDULO OFICIAL: INTELIGÊNCIA DE CONSUMO & JUSTIFICATIVA DE COMPRAS DE EPI
// Responde à demanda executiva: "Quantas saem por mês?" (Run Rate, Giro de Almoxarifado
// e Justificativa Técnica NR-06 para Suprimentos e Diretoria)
// ================================================================

var epiConsumoEstado = {
    diasHorizonte: 60,
    dadosCalculados: null
};

function popularEpiCatalogoConsumoDatalist() {
    const dl = document.getElementById('epiCatalogoConsumoList');
    if (!dl) return;
    const itensAtivos = (allEpiCatalogo || []).filter(c => c.ativo !== false);
    dl.innerHTML = itensAtivos.map(c => {
        const caStr = c.ca ? ` (CA: ${c.ca})` : '';
        const tamStr = c.tamanho ? ` - Tam. ${c.tamanho}` : '';
        return `<option value="${escapeHTML(c.descricao + caStr + tamStr)}" data-id="${escapeHTML(c.id)}"></option>`;
    }).join('');
}

function aoMudarFiltroConsumoEpi(limparItem) {
    if (limparItem) {
        const itemInp = document.getElementById('epiConsumo_filtroItem');
        if (itemInp) itemInp.value = '';
    }
    renderEpiConsumoComprasPanel();
}

function abrirConsumoEpiItem(catalogoId) {
    const cat = (allEpiCatalogo || []).find(c => c.id === catalogoId);
    if (!cat) return;
    showEpiSubtab('consumo');
    const tipoSel = document.getElementById('epiConsumo_filtroTipo');
    const itemInp = document.getElementById('epiConsumo_filtroItem');
    if (tipoSel) tipoSel.value = cat.tipo_protecao || 'todos';
    if (itemInp) {
        const caStr = cat.ca ? ` (CA: ${cat.ca})` : '';
        const tamStr = cat.tamanho ? ` - Tam. ${cat.tamanho}` : '';
        itemInp.value = `${cat.descricao}${caStr}${tamStr}`;
    }
    renderEpiConsumoComprasPanel();
    const subtab = document.getElementById('epiSubtab-consumo');
    if (subtab) subtab.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function abrirConsumoEpiFamilia(famNome) {
    showEpiSubtab('consumo');
    const itemInp = document.getElementById('epiConsumo_filtroItem');
    if (itemInp) itemInp.value = famNome;
    renderEpiConsumoComprasPanel();
    const subtab = document.getElementById('epiSubtab-consumo');
    if (subtab) subtab.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function calcularConsumoComprasEpi() {
    const tipoFiltro = document.getElementById('epiConsumo_filtroTipo')?.value || 'maos';
    const termoFiltro = (document.getElementById('epiConsumo_filtroItem')?.value || '').trim().toLowerCase();
    const janelaMesesVal = document.getElementById('epiConsumo_filtroJanela')?.value || '6';

    const estoquePorId = new Map((allEpiEstoque || []).map(es => [es.epi_catalogo_id, es]));
    const todosAtivos = (allEpiCatalogo || []).filter(c => c.ativo !== false);

    // 1. Filtragem do Catálogo
    let itensFiltrados = [];
    let nomeSelecao = '';

    if (termoFiltro.length >= 2) {
        itensFiltrados = todosAtivos.filter(c => {
            const desc = (c.descricao || '').toLowerCase();
            const ca = (c.ca || '').toLowerCase();
            const id = (c.id || '').toLowerCase();
            const fam = extrairFamiliaEpi(c).toLowerCase();
            return desc.includes(termoFiltro) || ca.includes(termoFiltro) || id.includes(termoFiltro) || fam.includes(termoFiltro);
        });
        if (itensFiltrados.length === 0) itensFiltrados = todosAtivos;
        nomeSelecao = itensFiltrados.length === 1 ? itensFiltrados[0].descricao : `Itens filtrados por "${termoFiltro}"`;
    } else {
        if (tipoFiltro === 'todos') {
            itensFiltrados = todosAtivos;
            nomeSelecao = 'Todos os EPIs do Catálogo';
        } else {
            itensFiltrados = todosAtivos.filter(c => c.tipo_protecao === tipoFiltro);
            const rotulosBonitos = {
                maos: 'Luvas (Proteção das Mãos)',
                pes: 'Calçados / Botas (Proteção dos Pés)',
                olhos: 'Óculos e Viseiras (Proteção Ocular)',
                audicao: 'Protetores Auriculares (Proteção Auditiva)',
                respiratorio: 'Máscaras e Respiradores (Proteção Respiratória)',
                cabeca: 'Capacetes (Proteção da Cabeça)',
                corpo: 'Vestimentas e Uniformes (Proteção do Corpo)',
                altura: 'Cintos e Trava-quedas (Trabalho em Altura)',
                outro: 'Outros Equipamentos'
            };
            nomeSelecao = rotulosBonitos[tipoFiltro] || EPI_TIPO_LABELS[tipoFiltro] || 'EPIs';
        }
    }

    const catIdsSet = new Set(itensFiltrados.map(c => c.id));

    // 2. Janela de Cálculo de Datas
    const hoje = new Date();
    let dataInicio;
    let mesesJanela = 6;

    if (janelaMesesVal === 'todos') {
        const datasValidas = (allEpiEntregas || [])
            .filter(e => catIdsSet.has(e.epi_catalogo_id) && e.data_entrega)
            .map(e => parseLocalDate(e.data_entrega));
        if (datasValidas.length > 0) {
            dataInicio = new Date(Math.min(...datasValidas.map(d => d.getTime())));
            dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
            mesesJanela = Math.max(1, Math.round((hoje.getTime() - dataInicio.getTime()) / (30.4375 * 24 * 60 * 60 * 1000)));
        } else {
            mesesJanela = 6;
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
        }
    } else {
        mesesJanela = parseInt(janelaMesesVal, 10) || 6;
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - mesesJanela, 1);
    }

    const dataInicioStr = toISODateLocal(dataInicio);
    const dataFimStr = toISODateLocal(hoje);

    // 3. Entregas filtradas na janela
    const entregasJanela = (allEpiEntregas || []).filter(e => {
        if (!e.data_entrega || !catIdsSet.has(e.epi_catalogo_id)) return false;
        return e.data_entrega >= dataInicioStr && e.data_entrega <= dataFimStr;
    });

    const qtdTotal = entregasJanela.reduce((acc, e) => acc + (Number(e.quantidade) || 1), 0);
    const consumoMensal = mesesJanela > 0 ? (qtdTotal / mesesJanela) : 0;
    const consumoDiario = consumoMensal / 30;

    // 4. Saldo somado do almoxarifado
    let saldoTotal = 0;
    let valorEstoqueTotal = 0;
    let somaCustos = 0;
    let itensComCusto = 0;

    itensFiltrados.forEach(c => {
        const es = estoquePorId.get(c.id);
        const s = es ? (es.quantidade_atual || 0) : 0;
        saldoTotal += s;
        const cu = Number(c.custo_unitario) || 0;
        if (cu > 0) {
            valorEstoqueTotal += s * cu;
            somaCustos += cu;
            itensComCusto++;
        }
    });

    const custoMedioUnitario = itensComCusto > 0 ? (somaCustos / itensComCusto) : 0;

    // 5. Cobertura Restante (Run Rate)
    let coberturaDias = 0;
    if (consumoDiario > 0) {
        coberturaDias = Math.floor(saldoTotal / consumoDiario);
    } else {
        coberturaDias = saldoTotal > 0 ? 999 : 0;
    }

    let nivelCobertura = 'seguro';
    let coberturaBadgeHtml = '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc; font-size:12px; padding:4px 8px;">🟢 Estoque Seguro</span>';

    if (saldoTotal <= 0) {
        nivelCobertura = 'zerado';
        coberturaBadgeHtml = '<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6; font-size:12px; padding:4px 8px;">🚫 Estoque Desabastecido (Zerado)</span>';
    } else if (coberturaDias < 15) {
        nivelCobertura = 'critico';
        coberturaBadgeHtml = `<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6; font-size:12px; padding:4px 8px;">🔴 Crítico (${coberturaDias} dias restantes)</span>`;
    } else if (coberturaDias <= 30) {
        nivelCobertura = 'reposicao';
        coberturaBadgeHtml = `<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1; font-size:12px; padding:4px 8px;">🟡 Ponto de Pedido (${coberturaDias} dias restantes)</span>`;
    } else {
        const dStr = coberturaDias >= 999 ? 'Estável (sem saídas no período)' : `${coberturaDias} dias de estoque`;
        coberturaBadgeHtml = `<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc; font-size:12px; padding:4px 8px;">🟢 ${dStr}</span>`;
    }

    // Taxa de reposição
    const reposicoes = entregasJanela.filter(e => e.tipo_entrega && e.tipo_entrega !== 'inicial').length;
    const taxaReposicao = entregasJanela.length > 0 ? (reposicoes / entregasJanela.length * 100) : 0;

    // 6. Evolução mês a mês
    const mesesGrafico = [];
    let cursorMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    const limiteMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    while (cursorMes <= limiteMes) {
        const a = cursorMes.getFullYear();
        const m = cursorMes.getMonth();
        const rotulo = cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        const iniMes = new Date(a, m, 1);
        const fimMes = new Date(a, m + 1, 0);

        const sub = entregasJanela.filter(e => {
            const dt = parseLocalDate(e.data_entrega);
            return dt >= iniMes && dt <= fimMes;
        });

        const q = sub.reduce((sum, e) => sum + (Number(e.quantidade) || 1), 0);
        const colabs = new Set(sub.map(e => e.matricula)).size;
        const rep = sub.filter(e => e.tipo_entrega && e.tipo_entrega !== 'inicial').length;

        mesesGrafico.push({ rotulo, ano: a, mes: m, quantidade: q, colaboradores: colabs, reposicoes: rep });
        cursorMes = new Date(a, m + 1, 1);
    }

    // 7. Saídas por Setor
    const setorMap = new Map();
    entregasJanela.forEach(e => {
        const s = sanitizarSetorDemandaEpi(e.setor);
        setorMap.set(s, (setorMap.get(s) || 0) + (Number(e.quantidade) || 1));
    });
    const setoresArray = Array.from(setorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([nome, qtd]) => ({
            nome,
            quantidade: qtd,
            percentual: qtdTotal > 0 ? (qtd / qtdTotal * 100) : 0,
            mediaMensal: mesesJanela > 0 ? (qtd / mesesJanela) : 0
        }));

    // 8. Desdobramento por Modelo da seleção
    const modelosArray = itensFiltrados.map(cat => {
        const es = estoquePorId.get(cat.id);
        const saldo = es ? (es.quantidade_atual || 0) : 0;
        const minimo = es ? (es.quantidade_minima || 0) : 0;
        const subEntregas = entregasJanela.filter(e => e.epi_catalogo_id === cat.id);
        const subQtd = subEntregas.reduce((acc, e) => acc + (Number(e.quantidade) || 1), 0);
        const subMediaMensal = mesesJanela > 0 ? (subQtd / mesesJanela) : 0;
        const subDiario = subMediaMensal / 30;
        const subCobDias = subDiario > 0 ? Math.floor(saldo / subDiario) : (saldo > 0 ? 999 : 0);

        let subNivel = 'seguro';
        let subBadge = '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">🟢 Seguro</span>';
        if (saldo <= 0) {
            subNivel = 'zerado';
            subBadge = '<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">🚫 Zerado</span>';
        } else if (subCobDias < 15 || (minimo > 0 && saldo <= minimo)) {
            subNivel = 'critico';
            subBadge = `<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">🔴 ${subCobDias}d</span>`;
        } else if (subCobDias <= 30) {
            subNivel = 'reposicao';
            subBadge = `<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">🟡 ${subCobDias}d</span>`;
        }

        return {
            cat,
            saldo,
            minimo,
            qtdEntregue: subQtd,
            consumoMensal: subMediaMensal,
            coberturaDias: subCobDias,
            nivel: subNivel,
            badgeHtml: subBadge
        };
    }).sort((a, b) => (b.consumoMensal - a.consumoMensal) || (a.saldo - b.saldo));

    return {
        tipoFiltro,
        termoFiltro,
        nomeSelecao,
        itensFiltrados,
        mesesJanela,
        dataInicioStr,
        dataFimStr,
        entregasJanelaCount: entregasJanela.length,
        qtdTotal,
        consumoMensal,
        consumoDiario,
        saldoTotal,
        valorEstoqueTotal,
        custoMedioUnitario,
        coberturaDias,
        nivelCobertura,
        coberturaBadgeHtml,
        taxaReposicao,
        mesesGrafico,
        setoresArray,
        modelosArray
    };
}

function renderEpiConsumoComprasPanel() {
    popularEpiCatalogoConsumoDatalist();
    const d = calcularConsumoComprasEpi();
    epiConsumoEstado.dadosCalculados = d;

    // 1. Banner Principal de Resposta Executiva
    const banner = document.getElementById('epiConsumoBannerResposta');
    if (banner) {
        let icone = '📦';
        if (d.tipoFiltro === 'maos') icone = '🧤';
        else if (d.tipoFiltro === 'pes') icone = '🥾';
        else if (d.tipoFiltro === 'olhos') icone = '👓';
        else if (d.tipoFiltro === 'audicao') icone = '🎧';
        else if (d.tipoFiltro === 'respiratorio') icone = '😷';
        else if (d.tipoFiltro === 'cabeca') icone = '🪖';
        else if (d.tipoFiltro === 'corpo') icone = '🛡️';
        else if (d.tipoFiltro === 'altura') icone = '🧗';

        banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
            <div style="flex:1; min-width:280px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span style="font-size:18px;">${icone}</span>
                    <span style="font-size:11.5px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Resposta Executiva para Compras &amp; Diretoria</span>
                </div>
                <div style="font-size:22px; font-weight:800; color:var(--text); line-height:1.2;">
                    Saem em média <span style="color:#2563eb; background:rgba(37,99,235,0.08); padding:2px 8px; border-radius:8px;">${d.consumoMensal.toFixed(1)} unidades/mês</span> de ${escapeHTML(d.nomeSelecao)}
                </div>
                <div style="font-size:12.5px; color:var(--text-light); margin-top:6px; line-height:1.4;">
                    Ritmo diário de <b>${d.consumoDiario.toFixed(1)} un/dia</b> · Base histórica real: <b>${d.qtdTotal} unidades entregues</b> em <b>${d.entregasJanelaCount} retiradas</b> nos últimos <b>${d.mesesJanela} meses</b> (${formatSimpleDate(d.dataInicioStr)} a ${formatSimpleDate(d.dataFimStr)}).
                </div>
            </div>
            <div style="text-align:right; min-width:180px; padding:10px 14px; background:var(--bg); border-radius:8px; border:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-light); text-transform:uppercase; font-weight:600;">Saldo Atual no Almoxarifado:</div>
                <div style="font-size:20px; font-weight:800; color:var(--text); margin:2px 0;">${d.saldoTotal} unidades</div>
                <div style="margin-top:4px;">${d.coberturaBadgeHtml}</div>
            </div>
        </div>`;
    }

    // 2. Atualizar 4 KPIs
    const kpiMedia = document.getElementById('kpiConsumoMediaMensal');
    if (kpiMedia) kpiMedia.textContent = `${d.consumoMensal.toFixed(1)} un/mês`;
    const kpiSaldo = document.getElementById('kpiConsumoSaldoAtual');
    if (kpiSaldo) kpiSaldo.textContent = `${d.saldoTotal} un`;
    const kpiCob = document.getElementById('kpiConsumoCoberturaDias');
    if (kpiCob) {
        kpiCob.textContent = d.coberturaDias >= 999 ? 'Estável' : `${d.coberturaDias} dias`;
        const cardCob = document.getElementById('kpiCardConsumoCobertura');
        if (cardCob) {
            cardCob.className = 'db-kpi-card ' + (d.nivelCobertura === 'critico' || d.nivelCobertura === 'zerado' ? 'db-kpi-danger' : (d.nivelCobertura === 'reposicao' ? 'db-kpi-warning' : 'db-kpi-success'));
        }
    }
    const kpiTaxa = document.getElementById('kpiConsumoTaxaReposicao');
    if (kpiTaxa) kpiTaxa.textContent = `${d.taxaReposicao.toFixed(1)}%`;

    // 3. Gráfico de Evolução Mês a Mês (com linha de média)
    const mediaLabelEl = document.getElementById('epiConsumoMediaLinhaLabel');
    if (mediaLabelEl) mediaLabelEl.textContent = `Média: ${d.consumoMensal.toFixed(1)}/mês`;

    if (typeof Chart !== 'undefined') {
        if (chartInstances.epiConsumoMensal) chartInstances.epiConsumoMensal.destroy();
        if (chartInstances.epiConsumoPorSetor) chartInstances.epiConsumoPorSetor.destroy();

        const canvasMes = document.getElementById('chartEpiConsumoMensal');
        if (canvasMes) {
            const rotulos = d.mesesGrafico.map(m => m.rotulo);
            const dadosQtd = d.mesesGrafico.map(m => m.quantidade);
            const linhaMedia = d.mesesGrafico.map(() => Number(d.consumoMensal.toFixed(1)));

            chartInstances.epiConsumoMensal = new Chart(canvasMes, {
                type: 'bar',
                data: {
                    labels: rotulos,
                    datasets: [
                        {
                            label: 'Saídas Reais (unidades)',
                            data: dadosQtd,
                            backgroundColor: '#4f46e5',
                            borderRadius: 6,
                            order: 2
                        },
                        {
                            label: 'Consumo Médio Mensal',
                            data: linhaMedia,
                            type: 'line',
                            borderColor: '#ef4444',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false,
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                footer: function(items) {
                                    const idx = items[0]?.dataIndex;
                                    const mesInfo = d.mesesGrafico[idx];
                                    if (!mesInfo) return '';
                                    return `Colaboradores atendidos: ${mesInfo.colaboradores}\nReposições: ${mesInfo.reposicoes}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        // Gráfico de Saídas por Setor
        const canvasSetor = document.getElementById('chartEpiConsumoPorSetor');
        if (canvasSetor) {
            const setoresLabels = d.setoresArray.map(s => wrapChartLabel(s.nome));
            ajustarAlturaBarrasHorizontais('chartEpiConsumoPorSetor', setoresLabels);
            chartInstances.epiConsumoPorSetor = new Chart(canvasSetor, {
                type: 'bar',
                data: {
                    labels: setoresLabels,
                    datasets: [{
                        label: 'Unidades Retiradas',
                        data: d.setoresArray.map(s => s.quantidade),
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                afterLabel: function(item) {
                                    const s = d.setoresArray[item.dataIndex];
                                    return `${s.percentual.toFixed(1)}% do total (${s.mediaMensal.toFixed(1)} un/mês)`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1 } },
                        y: { ticks: { autoSkip: false } }
                    }
                }
            });
        }
    }

    // 4. Tabela de Desdobramento por Modelo
    const contagemModelosEl = document.getElementById('epiConsumoContagemModelos');
    if (contagemModelosEl) contagemModelosEl.textContent = `${d.modelosArray.length} modelo(s) cadastrado(s)`;

    const tabModelos = document.getElementById('epiConsumoTabelaModelos');
    if (tabModelos) {
        if (d.modelosArray.length === 0) {
            tabModelos.innerHTML = '<div class="db-list-empty">Nenhum item encontrado para esta seleção.</div>';
        } else {
            const linhasMod = d.modelosArray.map((m, idx) => {
                const cat = m.cat;
                const tamStr = cat.tamanho || (cat.descricao.match(/TAMANHO:\s*([^\s\-]+)/i)?.[1] || 'Único');
                const cobTexto = m.coberturaDias >= 999 ? 'Estável' : `${m.coberturaDias} dias`;
                return `
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:7px 8px; text-align:center;">${idx + 1}</td>
                    <td style="padding:7px 8px;">
                        <b>${escapeHTML(cat.descricao)}</b>
                        ${cat.marca ? ` <span style="font-size:11px; color:var(--text-light);">(Marca: ${escapeHTML(cat.marca)})</span>` : ''}
                    </td>
                    <td style="padding:7px 8px; text-align:center;">${escapeHTML(tamStr)}</td>
                    <td style="padding:7px 8px; text-align:center;">${escapeHTML(cat.ca || '—')}</td>
                    <td style="padding:7px 8px; text-align:center; font-weight:700;">${m.saldo}</td>
                    <td style="padding:7px 8px; text-align:center; color:#2563eb; font-weight:700;">${m.consumoMensal.toFixed(1)}</td>
                    <td style="padding:7px 8px; text-align:center;">${m.badgeHtml}</td>
                    <td style="padding:7px 8px; text-align:center; white-space:nowrap;">
                        <button onclick="abrirConsumoEpiItem('${escapeHTML(cat.id)}')" title="Focar a análise e simulador de compras exclusivamente neste item"
                                class="db-clear-btn" style="padding:3px 7px; font-size:11px; color:#2563eb; border-color:#2563eb;">🔍 Focar Item</button>
                    </td>
                </tr>`;
            }).join('');

            tabModelos.innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:var(--bg); text-align:left; border-bottom:2px solid var(--border);">
                        <th style="padding:7px 8px; width:30px; text-align:center;">#</th>
                        <th style="padding:7px 8px;">Item de EPI (Modelo / Descrição)</th>
                        <th style="padding:7px 8px; width:65px; text-align:center;">Tam</th>
                        <th style="padding:7px 8px; width:75px; text-align:center;">CA</th>
                        <th style="padding:7px 8px; width:60px; text-align:center;">Saldo</th>
                        <th style="padding:7px 8px; width:80px; text-align:center; color:#2563eb;">Média/mês</th>
                        <th style="padding:7px 8px; width:100px; text-align:center;">Cobertura</th>
                        <th style="padding:7px 8px; width:85px; text-align:center;">Ações</th>
                    </tr>
                </thead>
                <tbody>${linhasMod}</tbody>
            </table>`;
        }
    }

    // 5. Atualizar Simulador de Pedido
    recalcularSimuladorCompraEpi();
}

function definirHorizonteCompra(dias) {
    epiConsumoEstado.diasHorizonte = dias;
    ['30', '60', '90'].forEach(h => {
        const btn = document.getElementById('btnHorizonte' + h);
        if (btn) btn.classList.toggle('active', parseInt(h, 10) === dias);
    });
    const inp = document.getElementById('epiSimulador_diasPersonalizados');
    if (inp) inp.value = dias;
    recalcularSimuladorCompraEpi();
}

function aoMudarDiasPersonalizados(val) {
    const d = parseInt(val, 10);
    if (!isNaN(d) && d > 0) {
        epiConsumoEstado.diasHorizonte = d;
        ['30', '60', '90'].forEach(h => {
            const btn = document.getElementById('btnHorizonte' + h);
            if (btn) btn.classList.toggle('active', parseInt(h, 10) === d);
        });
        recalcularSimuladorCompraEpi();
    }
}

function recalcularSimuladorCompraEpi() {
    const d = epiConsumoEstado.dadosCalculados;
    if (!d) return;

    const diasHorizonte = epiConsumoEstado.diasHorizonte || 60;
    const adicionais = parseInt(document.getElementById('epiSimulador_adicionais')?.value, 10) || 0;
    const totalEfetivo = Math.max(1, (allEfetivo || []).length);
    const fatorExpansao = adicionais > 0 ? (1 + (adicionais / totalEfetivo)) : 1;

    // Cálculo da necessidade operacional
    const demandaBruta = Math.ceil(d.consumoDiario * diasHorizonte * fatorExpansao);
    const loteSugerido = Math.max(0, demandaBruta - d.saldoTotal);
    const estoqueProjetadoFinal = d.saldoTotal + loteSugerido;
    const diasCoberturaFinal = d.consumoDiario > 0 ? Math.round(estoqueProjetadoFinal / d.consumoDiario) : diasHorizonte;

    // Custo financeiro estimado
    const valorEstimado = loteSugerido * (d.custoMedioUnitario || 0);

    // Box de Resultados do Simulador
    const boxRes = document.getElementById('epiSimuladorResultadoBox');
    if (boxRes) {
        boxRes.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; align-items:center;">
            <div style="padding:8px 12px; background:var(--bg); border-radius:6px; border:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-light); font-weight:600; text-transform:uppercase;">1. Demanda para ${diasHorizonte} dias:</div>
                <div style="font-size:17px; font-weight:700; color:var(--text);">${demandaBruta} unidades</div>
                <div style="font-size:11px; color:var(--text-light);">${(demandaBruta / (diasHorizonte / 30)).toFixed(1)} un/mês no período</div>
            </div>
            <div style="padding:8px 12px; background:var(--bg); border-radius:6px; border:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-light); font-weight:600; text-transform:uppercase;">2. Saldo Atual Deduzido:</div>
                <div style="font-size:17px; font-weight:700; color:#10b981;">- ${d.saldoTotal} unidades</div>
                <div style="font-size:11px; color:var(--text-light);">Já em almoxarifado</div>
            </div>
            <div style="padding:10px 14px; background:#eff6ff; border-radius:8px; border:2px solid #2563eb;">
                <div style="font-size:11px; color:#1d4ed8; font-weight:700; text-transform:uppercase;">3. Lote Sugerido para Compra:</div>
                <div style="font-size:24px; font-weight:800; color:#2563eb;">${loteSugerido} unidades</div>
                <div style="font-size:11.5px; color:#1e40af; font-weight:600;">Garante ${diasCoberturaFinal} dias de operação</div>
            </div>
            <div style="padding:8px 12px; background:var(--bg); border-radius:6px; border:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-light); font-weight:600; text-transform:uppercase;">4. Investimento Estimado:</div>
                <div style="font-size:17px; font-weight:700; color:var(--text);">${valorEstimado > 0 ? 'R$ ' + valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'Aguardando cotação'}</div>
                <div style="font-size:11px; color:var(--text-light);">${d.custoMedioUnitario > 0 ? `Ref: R$ ${d.custoMedioUnitario.toFixed(2)}/un` : 'Sem custo unitário cadastrado'}</div>
            </div>
        </div>`;
    }

    // Texto Oficial da Justificativa Técnica
    const textarea = document.getElementById('epiSimuladorTextoJustificativa');
    if (textarea) {
        const dataHojeStr = formatSimpleDate(toISODateLocal(new Date()));
        const casArray = Array.from(new Set(d.itensFiltrados.map(c => c.ca).filter(Boolean)));
        const casStr = casArray.length > 0 ? casArray.join(', ') : 'Conforme especificações técnicas cadastradas';
        const setoresStr = d.setoresArray.slice(0, 4).map(s => `  • ${s.nome}: ${s.quantidade} retiradas (${s.percentual.toFixed(1)}% do consumo)`).join('\n') || '  • Frentes gerais da obra';

        const textoParecer = `PARECER TÉCNICO DE JUSTIFICATIVA DE COMPRA DE EPI (NR-06)
EMPRESA: ${EMPRESA_INFO.razaoSocial} | CNPJ: ${EMPRESA_INFO.cnpj}
DATA DA EMISSÃO: ${dataHojeStr}
ITEM / CATEGORIA: ${d.nomeSelecao}
CERTIFICADOS DE APROVAÇÃO (CA DE REFERÊNCIA): ${casStr}

1. FINALIDADE E ENQUADRAMENTO LEGAL:
Aquisição necessária para reposição preventiva e atendimento contínuo às frentes de trabalho, em estrito cumprimento à Norma Regulamentadora NR-06 do Ministério do Trabalho e Emprego (Portaria MTP nº 2.175/2022) e Art. 166 da CLT, que determinam o fornecimento obrigatório e gratuito de EPI adequado ao risco, em perfeito estado de conservação e funcionamento.

2. DIAGNÓSTICO DE CONSUMO REAL E RUN RATE (TAXA DE SAÍDA):
- Consumo Médio Mensal Comprovado: ${d.consumoMensal.toFixed(1)} unidades/mês (média dos últimos ${d.mesesJanela} meses);
- Ritmo de Consumo Diário: ${d.consumoDiario.toFixed(1)} unidades/dia;
- Saldo Físico Disponível em Almoxarifado: ${d.saldoTotal} unidades;
- Cobertura Operacional do Saldo Atual: ${d.coberturaDias >= 999 ? 'Estável' : d.coberturaDias + ' dias'} (${d.nivelCobertura === 'critico' || d.nivelCobertura === 'zerado' ? 'SITUAÇÃO CRÍTICA DE RISCO DE DESABASTECIMENTO' : 'Ponto de reposição atingido'});
- Taxa de Reposição por Desgaste/Troca: ${d.taxaReposicao.toFixed(1)}% das retiradas.

3. MEMÓRIA DE CÁLCULO DO LOTE SOLICITADO:
- Prazo de Cobertura Planejado: ${diasHorizonte} dias corridos (horizonte de segurança de suprimentos);
- Consumo Projetado para o Período: ${demandaBruta} unidades;
- Dedução do Estoque Físico Existente: - ${d.saldoTotal} unidades;
- QUANTIDADE SOLICITADA PARA COMPRA: ${loteSugerido} UNIDADES.
${valorEstimado > 0 ? `- Orçamento Interno Estimado de Referência: R$ ${valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (com base no custo histórico médio)` : ''}

4. PRINCIPAIS SETORES E FRENTES DE TRABALHO ATENDIDAS:
${setoresStr}

5. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA:
A quantidade de ${loteSugerido} unidades solicitada é estritamente aderente ao histórico real de consumo auditado no sistema. A aquisição no prazo indicado é indispensável para impedir a ruptura de estoque no almoxarifado, o que acarretaria na interrupção de atividades operacionais por impedimento legal de segurança do trabalho. Parecer FAVORÁVEL à autorização de compra.

Responsável Técnico: Engenharia de Segurança do Trabalho - SESMT`;

        textarea.value = textoParecer;
    }
}

function copiarJustificativaCompraEpi() {
    const textarea = document.getElementById('epiSimuladorTextoJustificativa');
    if (!textarea) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
        const fb = document.getElementById('epiCopiadoFeedback');
        if (fb) {
            fb.style.display = 'inline';
            setTimeout(() => { fb.style.display = 'none'; }, 3500);
        }
    }).catch(err => {
        console.error('Erro ao copiar texto:', err);
        alert('Não foi possível copiar automaticamente. Por favor, selecione o texto e use Ctrl+C.');
    });
}

function imprimirDossieConsumoEpi() {
    const d = epiConsumoEstado.dadosCalculados;
    if (!d) {
        alert('Dados de consumo não disponíveis.');
        return;
    }

    const diasHorizonte = epiConsumoEstado.diasHorizonte || 60;
    const demandaBruta = Math.ceil(d.consumoDiario * diasHorizonte);
    const loteSugerido = Math.max(0, demandaBruta - d.saldoTotal);
    const valorEstimado = loteSugerido * (d.custoMedioUnitario || 0);
    const dataHojeStr = formatSimpleDate(toISODateLocal(new Date()));

    const linhasMesesHtml = d.mesesGrafico.map(m => `
        <tr>
            <td style="text-align:center; padding:5px;">${m.rotulo}</td>
            <td style="text-align:center; font-weight:700; padding:5px;">${m.quantidade}</td>
            <td style="text-align:center; padding:5px;">${m.colaboradores}</td>
            <td style="text-align:center; padding:5px;">${m.reposicoes}</td>
        </tr>
    `).join('');

    const linhasSetoresHtml = d.setoresArray.map(s => `
        <tr>
            <td style="padding:5px;">${escapeHTML(s.nome)}</td>
            <td style="text-align:center; font-weight:700; padding:5px;">${s.quantidade}</td>
            <td style="text-align:center; padding:5px;">${s.percentual.toFixed(1)}%</td>
            <td style="text-align:center; padding:5px;">${s.mediaMensal.toFixed(1)}/mês</td>
        </tr>
    `).join('');

    const linhasModelosHtml = d.modelosArray.slice(0, 15).map(m => `
        <tr>
            <td style="padding:5px;">${escapeHTML(m.cat.descricao)}</td>
            <td style="text-align:center; padding:5px;">${escapeHTML(m.cat.ca || '—')}</td>
            <td style="text-align:center; font-weight:700; padding:5px;">${m.saldo}</td>
            <td style="text-align:center; padding:5px;">${m.consumoMensal.toFixed(1)}</td>
            <td style="text-align:center; padding:5px;">${m.coberturaDias >= 999 ? 'Estável' : m.coberturaDias + ' dias'}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Dossiê Executivo de Consumo e Justificativa de Compra - ${escapeHTML(d.nomeSelecao)}</title>
    <style>
        @page { size: A4; margin: 12mm 15mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111; margin: 0; line-height: 1.35; }
        .folha { max-width: 900px; margin: 0 auto; }
        .cabecalho { border: 2px solid #000; padding: 10px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .cabecalho-texto { text-align: center; flex: 1; }
        .cabecalho-texto h1 { font-size: 13px; font-weight: 700; margin: 0 0 3px 0; text-transform: uppercase; }
        .cabecalho-texto h2 { font-size: 11px; font-weight: 700; margin: 0 0 2px 0; color: #222; }
        .cabecalho-texto p { font-size: 9.5px; margin: 0; color: #444; }
        .secao { border: 1px solid #000; margin-bottom: 10px; }
        .secao-titulo { background: #e5e7eb; padding: 5px 8px; font-weight: 700; font-size: 10.5px; border-bottom: 1px solid #000; text-transform: uppercase; }
        .secao-corpo { padding: 8px 10px; }
        .grid-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-bottom: 8px; }
        .card-kpi { border: 1px solid #ccc; padding: 6px; border-radius: 4px; background: #fafafa; }
        .card-kpi .val { font-size: 15px; font-weight: 800; color: #1e3a8a; }
        .card-kpi .rot { font-size: 9px; color: #555; text-transform: uppercase; font-weight: 600; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 4px; }
        th, td { border: 1px solid #bbb; padding: 4px 6px; }
        th { background: #f3f4f6; font-weight: 700; text-align: left; }
        .grid-duplo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .bloco-calculo { background: #eff6ff; border: 1px solid #93c5fd; padding: 8px 12px; border-radius: 4px; margin-top: 6px; }
        .bloco-calculo .destaque { font-size: 14px; font-weight: 800; color: #1d4ed8; }
        .assinaturas { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center; font-size: 9.5px; }
        .linha-assinatura { border-top: 1px solid #000; padding-top: 4px; font-weight: 700; }
    </style>
</head>
<body>
    <div class="folha">
        <div class="cabecalho">
            <div style="font-weight:900; font-size:16px; color:#1e3a8a; letter-spacing:1px;">COP</div>
            <div class="cabecalho-texto">
                <h1>${escapeHTML(EMPRESA_INFO.razaoSocial)}</h1>
                <h2>DEPARTAMENTO DE ENGENHARIA DE SEGURANÇA DO TRABALHO (SESMT)</h2>
                <p>CNPJ: ${escapeHTML(EMPRESA_INFO.cnpj)} · GESTÃO TÉCNICA DE COMPRAS &amp; ALMOXARIFADO DE EPI (NR-06)</p>
            </div>
            <div style="font-size:9.5px; text-align:right;">
                <b>Data:</b> ${dataHojeStr}<br>
                <b>Emissão:</b> Painel SST
            </div>
        </div>

        <div class="secao">
            <div class="secao-titulo">1. Objeto &amp; Resposta Executiva de Demanda</div>
            <div class="secao-corpo">
                <div style="font-size:12px; font-weight:700; color:#1e3a8a; margin-bottom:6px;">
                    EQUIPAMENTO / CATEGORIA: ${escapeHTML(d.nomeSelecao)}
                </div>
                <div class="grid-kpis">
                    <div class="card-kpi">
                        <div class="val">${d.consumoMensal.toFixed(1)} un/mês</div>
                        <div class="rot">Consumo Médio Mensal</div>
                    </div>
                    <div class="card-kpi">
                        <div class="val">${d.saldoTotal} un</div>
                        <div class="rot">Saldo Físico Atual</div>
                    </div>
                    <div class="card-kpi">
                        <div class="val">${d.coberturaDias >= 999 ? 'Estável' : d.coberturaDias + ' dias'}</div>
                        <div class="rot">Cobertura do Estoque</div>
                    </div>
                    <div class="card-kpi">
                        <div class="val">${d.taxaReposicao.toFixed(1)}%</div>
                        <div class="rot">Taxa de Reposição</div>
                    </div>
                </div>
                <div style="font-size:9.5px; color:#444;">
                    * Cálculo baseado em <b>${d.qtdTotal} unidades retiradas</b> nos últimos <b>${d.mesesJanela} meses</b> (${formatSimpleDate(d.dataInicioStr)} a ${formatSimpleDate(d.dataFimStr)}). Ritmo médio diário de <b>${d.consumoDiario.toFixed(1)} unidades/dia</b>.
                </div>
            </div>
        </div>

        <div class="grid-duplo">
            <div class="secao">
                <div class="secao-titulo">2. Histórico Mês a Mês (Giro Real)</div>
                <div class="secao-corpo">
                    <table>
                        <thead><tr><th>Mês</th><th style="text-align:center;">Saídas</th><th style="text-align:center;">Colabs</th><th style="text-align:center;">Trocas</th></tr></thead>
                        <tbody>${linhasMesesHtml}</tbody>
                    </table>
                </div>
            </div>

            <div class="secao">
                <div class="secao-titulo">3. Setores que Demandam o Equipamento</div>
                <div class="secao-corpo">
                    <table>
                        <thead><tr><th>Setor</th><th style="text-align:center;">Total</th><th style="text-align:center;">%</th><th style="text-align:center;">Média/mês</th></tr></thead>
                        <tbody>${linhasSetoresHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="secao">
            <div class="secao-titulo">4. Desdobramento por Modelo no Almoxarifado</div>
            <div class="secao-corpo">
                <table>
                    <thead><tr><th>Modelo / Especificação</th><th style="text-align:center;">CA</th><th style="text-align:center;">Saldo</th><th style="text-align:center;">Média/mês</th><th style="text-align:center;">Cobertura</th></tr></thead>
                    <tbody>${linhasModelosHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="secao">
            <div class="secao-titulo">5. Dimensionamento do Pedido &amp; Parecer Técnico Oficial</div>
            <div class="secao-corpo">
                <div class="bloco-calculo">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <div><b>Horizonte de Suprimento:</b> ${diasHorizonte} dias corridos</div>
                            <div><b>Demanda Operacional Projetada:</b> ${demandaBruta} unidades</div>
                            <div><b>Saldo Físico a Descontar:</b> - ${d.saldoTotal} unidades</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px; color:#1e40af; font-weight:700; text-transform:uppercase;">Lote Sugerido de Compra:</div>
                            <div class="destaque">${loteSugerido} UNIDADES</div>
                            ${valorEstimado > 0 ? `<div style="font-size:10px; color:#555;">Estimativa: R$ ${valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>` : ''}
                        </div>
                    </div>
                </div>

                <div style="margin-top:8px; font-size:9.5px; text-align:justify; color:#222;">
                    <b>Justificativa Técnica NR-06:</b> A quantidade de ${loteSugerido} unidades solicitada é dimensionada com base estrita no histórico de consumo comprovado acima. A reposição no prazo solicitado é mandatória para evitar a ruptura de estoque no almoxarifado e consequente paralisação de frentes de trabalho por falta de EPI obrigatório, atendendo integralmente ao Art. 166 da CLT e à Portaria MTP nº 2.175/2022. Parecer favorável à aprovação da requisição.
                </div>
            </div>
        </div>

        <div class="assinaturas">
            <div>
                <div class="linha-assinatura">Engenharia de Segurança (SESMT)</div>
                <div>Elaboração Técnica / Dimensionamento</div>
            </div>
            <div>
                <div class="linha-assinatura">Encarregado de Almoxarifado</div>
                <div>Conferência Física de Saldo</div>
            </div>
            <div>
                <div class="linha-assinatura">Gerência / Diretoria de Operações</div>
                <div>Aprovação de Suprimentos</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Dossie_Compra_EPI_${d.nomeSelecao.replace(/[^a-zA-Z0-9]/g, '_')}`);
}

// ============================================
// NAVEGAÇÃO ENTRE PÁGINAS (barra lateral)
// ============================================

var DB_PAGE_TITLES = {
    relatoriosms: 'Relatório Mensal SMS',
    checklists: 'Checklists',
    extintores: 'Extintores',
    relatos: 'Relatos de Problemas',
    treinamentos: 'Treinamentos',
    ddsma: 'DDSMA',
    efetivo: 'Efetivo',
    matrizrisco: 'Matriz de Risco (AIHA)',
    acidentes: 'Acidentabilidade',
    saude: 'Saúde Ocupacional',
    psicossocial: 'Avaliação Psicossocial (COPSOQ II)',
    epi: 'EPI',
    apr: 'Análise Preliminar de Risco (APR)',
    ambiental: 'Gestão Ambiental',
    compras: 'Compras',
    cipa: 'CIPA',
    brigada: 'Brigada de Incêndio',
    documentos: 'Controle de Documentos',
    acervodrive: 'Acervo (Drive)',
    importexport: 'Central de Backup & Importação de Dados',
    config: 'Configurações',
    usuariospainel: 'Usuários do Painel',
    ergonomia: 'Ergonomia (NR-17)',
    periculosidade: 'Periculosidade (NR-16) - Laudo Técnico (LTP)',
    planoacao: 'Plano de Ação Integrado (5W2H) — NR-01 / GRO',
    placarlideres: '🏆 Placar das Lideranças & Rotinas de Encarregados'
};

// ============================================
// USUÁRIOS DO PAINEL (RBAC piloto, 2026-09-14) - ver claude/bloco-notas-melhorias.md
// Contas SEPARADAS dos colaboradores internos (colaboradores_checklist) - pra gente de
// fora do time (cliente, fiscalização etc.) que só deve ver alguns módulos, nunca lançar
// nada. Cada uma tem um "perfil" (painel_perfis) com a lista de módulos liberados. A trava
// de verdade é no banco (RLS via usuario_tem_acesso_modulo) - esta tela só gerencia quem
// tem qual perfil, não implementa nenhuma trava por conta própria.
// ============================================
var allPainelPerfis = [];
var allPainelUsuarios = [];
var usuariosPainelLoaded = false;
var painelPerfilEditandoId = null;

var allColaboradoresInternos = [];
var filtroColabsInternosTexto = '';

function showUsuariosPainelSubtab(subtab) {
    const btnColabs = document.getElementById('usuariosSubtabBtn-colabs');
    const btnConvidados = document.getElementById('usuariosSubtabBtn-convidados');
    const btnPerfis = document.getElementById('usuariosSubtabBtn-perfis');
    const tabColabs = document.getElementById('usuariosSubtab-colabs');
    const tabConvidados = document.getElementById('usuariosSubtab-convidados');
    const tabPerfis = document.getElementById('usuariosSubtab-perfis');

    if (btnColabs) btnColabs.classList.toggle('active', subtab === 'colabs');
    if (btnConvidados) btnConvidados.classList.toggle('active', subtab === 'convidados');
    if (btnPerfis) btnPerfis.classList.toggle('active', subtab === 'perfis');

    if (tabColabs) tabColabs.style.display = subtab === 'colabs' ? 'block' : 'none';
    if (tabConvidados) tabConvidados.style.display = subtab === 'convidados' ? 'block' : 'none';
    if (tabPerfis) tabPerfis.style.display = subtab === 'perfis' ? 'block' : 'none';

    if (subtab === 'colabs' && allColaboradoresInternos.length === 0) {
        carregarColaboradoresInternos();
    }
}

async function carregarColaboradoresInternos() {
    const statusEl = document.getElementById('colabsInternosStatus');
    const tbody = document.getElementById('tabelaColaboradoresInternosBody');
    if (statusEl) statusEl.textContent = '⏳ Carregando colaboradores...';
    try {
        const rows = await supabaseFetch('colaboradores_checklist', '?select=id,nome,funcao,setor,matricula,email,nivel_acesso,ativo&order=nome');
        allColaboradoresInternos = Array.isArray(rows) ? rows : [];
        if (statusEl) statusEl.textContent = '';
        renderColaboradoresInternos();
        atualizarKpisColaboradoresInternos();
    } catch (e) {
        console.error('Erro ao carregar colaboradores internos:', e);
        if (statusEl) statusEl.textContent = '❌ Erro ao carregar colaboradores: ' + e.message;
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="padding:20px; text-align:center; color:var(--danger);">Falha ao carregar: ${escapeHTML(e.message)}</td></tr>`;
    }
}

function atualizarKpisColaboradoresInternos() {
    const kpiTotal = document.getElementById('kpiColabsTotal');
    const kpiAdmins = document.getElementById('kpiColabsAdmins');
    const kpiTecnicos = document.getElementById('kpiColabsTecnicos');
    const kpiEmail = document.getElementById('kpiColabsComEmail');

    const total = allColaboradoresInternos.length;
    const admins = allColaboradoresInternos.filter(c => (c.nivel_acesso || '').toLowerCase().includes('admin')).length;
    const tecnicos = total - admins;
    const comEmail = allColaboradoresInternos.filter(c => c.email && c.email.trim() !== '').length;

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiAdmins) kpiAdmins.textContent = admins;
    if (kpiTecnicos) kpiTecnicos.textContent = tecnicos;
    if (kpiEmail) kpiEmail.textContent = comEmail;
}

function filtrarColaboradoresInternos(texto) {
    filtroColabsInternosTexto = (texto || '').trim().toLowerCase();
    renderColaboradoresInternos();
}

function renderColaboradoresInternos() {
    const tbody = document.getElementById('tabelaColaboradoresInternosBody');
    if (!tbody) return;

    let lista = allColaboradoresInternos;
    if (filtroColabsInternosTexto) {
        lista = lista.filter(c => 
            (c.nome || '').toLowerCase().includes(filtroColabsInternosTexto) ||
            (c.matricula || '').toLowerCase().includes(filtroColabsInternosTexto) ||
            (c.funcao || '').toLowerCase().includes(filtroColabsInternosTexto) ||
            (c.setor || '').toLowerCase().includes(filtroColabsInternosTexto) ||
            (c.email || '').toLowerCase().includes(filtroColabsInternosTexto)
        );
    }

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding:24px; text-align:center; color:var(--text-light);">Nenhum colaborador encontrado com os critérios de busca.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const isAdmin = (c.nivel_acesso || '').toLowerCase().includes('admin');
        const badgeNivel = isAdmin
            ? `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600; background:rgba(59,130,246,0.15); color:var(--primary); border:1px solid rgba(59,130,246,0.3);">🛡️ Admin</span>`
            : `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:600; background:rgba(100,116,139,0.12); color:var(--text); border:1px solid rgba(100,116,139,0.25);">👷 Técnico</span>`;

        const isAtivo = c.ativo !== false;
        const badgeStatus = isAtivo
            ? `<span style="display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:rgba(16,185,129,0.15); color:#10b981;">Ativo</span>`
            : `<span style="display:inline-block; padding:2px 7px; border-radius:10px; font-size:11px; font-weight:600; background:rgba(239,68,68,0.15); color:var(--danger);">Inativo</span>`;

        const emailExibido = c.email && c.email.trim()
            ? `<span style="color:var(--text);">${escapeHTML(c.email)}</span>`
            : `<span style="color:var(--text-light); font-style:italic;">⚠️ Sem e-mail</span>`;

        return `
            <tr style="border-bottom:1px solid var(--border); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding:9px 8px; font-weight:700; font-family:monospace; color:var(--primary);">${escapeHTML(c.matricula || c.id)}</td>
                <td style="padding:9px 8px; font-weight:600; color:var(--text);">${escapeHTML(c.nome || '-')}</td>
                <td style="padding:9px 8px; color:var(--text); font-size:12px;">${escapeHTML(c.funcao || '-')}</td>
                <td style="padding:9px 8px; color:var(--text-light); font-size:12px;">${escapeHTML(c.setor || '-')}</td>
                <td style="padding:9px 8px; font-size:12px;">${emailExibido}</td>
                <td style="padding:9px 8px; text-align:center;">${badgeNivel}</td>
                <td style="padding:9px 8px; text-align:center;">${badgeStatus}</td>
                <td style="padding:9px 8px; text-align:right; white-space:nowrap;">
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="abrirModalRedefinirSenhaColaborador('${escapeHTML(c.id)}')" title="Redefinir senha de acesso">🔑 Senha</button>
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="abrirModalEditarColaborador('${escapeHTML(c.id)}')" title="Editar dados cadastrais">✏️ Editar</button>
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="alternarAtivoColaborador('${escapeHTML(c.id)}', ${isAtivo})" title="${isAtivo ? 'Desativar acesso' : 'Reativar acesso'}">${isAtivo ? '🚫' : '✅'}</button>
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; color:var(--danger); border-color:rgba(239,68,68,0.3);" onclick="excluirColaboradorInterno('${escapeHTML(c.id)}')" title="Excluir cadastro permanentemente">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function alternarVisibilidadeSenha(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🔒';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁️';
    }
}

function abrirModalRedefinirSenhaColaborador(id) {
    const colab = allColaboradoresInternos.find(c => String(c.id) === String(id));
    if (!colab) return;

    const modal = document.getElementById('modalRedefinirSenhaColab');
    const targetInput = document.getElementById('redefSenhaTargetId');
    const infoDiv = document.getElementById('redefSenhaColabInfo');
    const novaInput = document.getElementById('redefSenhaNova');
    const confInput = document.getElementById('redefSenhaConfirma');
    const adminPassInput = document.getElementById('redefSenhaAdminPass');
    const statusDiv = document.getElementById('redefSenhaStatus');

    if (targetInput) targetInput.value = colab.id;
    if (infoDiv) {
        infoDiv.innerHTML = `
            <strong>Colaborador:</strong> ${escapeHTML(colab.nome)}<br>
            <strong>Matrícula:</strong> ${escapeHTML(colab.matricula || colab.id)} | <strong>Função:</strong> ${escapeHTML(colab.funcao || '-')}
        `;
    }
    if (novaInput) { novaInput.value = ''; novaInput.type = 'password'; }
    if (confInput) { confInput.value = ''; confInput.type = 'password'; }
    if (adminPassInput) adminPassInput.value = '';
    if (statusDiv) { statusDiv.textContent = ''; statusDiv.style.color = ''; }

    if (modal) modal.style.display = 'flex';
}

function fecharModalRedefinirSenha() {
    const modal = document.getElementById('modalRedefinirSenhaColab');
    if (modal) modal.style.display = 'none';
}

async function salvarNovaSenhaColaborador() {
    const id = document.getElementById('redefSenhaTargetId').value;
    const novaSenha = document.getElementById('redefSenhaNova').value;
    const confirma = document.getElementById('redefSenhaConfirma').value;
    const adminPass = document.getElementById('redefSenhaAdminPass').value;
    const statusEl = document.getElementById('redefSenhaStatus');
    const btn = document.getElementById('btnSalvarRedefSenha');

    if (!novaSenha || novaSenha.length < 4) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ A nova senha deve ter no mínimo 4 caracteres.'; }
        return;
    }
    if (novaSenha !== confirma) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ A nova senha e a confirmação não conferem.'; }
        return;
    }
    if (!adminPass) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Digite sua senha de Administrador para autorizar a operação.'; }
        return;
    }

    const sessionStr = localStorage.getItem('active_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const adminMatricula = (session && session.matricula) || '76';

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }
    if (statusEl) { statusEl.style.color = 'var(--text)'; statusEl.textContent = '⏳ Redefinindo senha no servidor...'; }

    try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redefinir_senha_por_admin`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_admin_matricula: adminMatricula,
                p_admin_senha: adminPass,
                p_target_id: id,
                p_nova_senha: novaSenha
            })
        });

        if (!rpcRes.ok) {
            const errTxt = await rpcRes.text();
            throw new Error(`Falha ao redefinir senha (${rpcRes.status}): ${errTxt}`);
        }

        await registrarAuditLogDashboard('update', 'colaboradores_checklist', id, `Colaborador ${id}`, 'Senha redefinida pelo Administrador no Painel');

        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.textContent = '✅ Senha redefinida com sucesso!';
        }

        setTimeout(() => {
            fecharModalRedefinirSenha();
            carregarColaboradoresInternos();
        }, 1200);
    } catch (e) {
        console.error('Erro ao redefinir senha:', e);
        if (statusEl) {
            statusEl.style.color = 'var(--danger)';
            statusEl.textContent = '❌ Erro: ' + e.message;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Nova Senha'; }
    }
}

function abrirModalEditarColaborador(id) {
    const colab = allColaboradoresInternos.find(c => String(c.id) === String(id));
    if (!colab) return;

    const modal = document.getElementById('modalEditarColab');
    document.getElementById('editColabId').value = colab.id;
    document.getElementById('editColabMatricula').value = colab.matricula || colab.id;
    document.getElementById('editColabNome').value = colab.nome || '';
    document.getElementById('editColabFuncao').value = colab.funcao || '';
    document.getElementById('editColabSetor').value = colab.setor || '';
    document.getElementById('editColabEmail').value = colab.email || '';
    
    const nivel = (colab.nivel_acesso || '').toLowerCase().includes('admin') ? 'Admin' : 'Tecnico';
    document.getElementById('editColabNivel').value = nivel;

    document.getElementById('wrapEditColabAdminPass').style.display = 'none';
    document.getElementById('editColabAdminPass').value = '';
    const statusDiv = document.getElementById('editColabStatus');
    if (statusDiv) statusDiv.textContent = '';

    if (modal) modal.style.display = 'flex';
}

function aoMudarNivelColabEdit(novoNivel) {
    const id = document.getElementById('editColabId').value;
    const colabAtual = allColaboradoresInternos.find(c => String(c.id) === String(id));
    const nivelAtual = (colabAtual && (colabAtual.nivel_acesso || '').toLowerCase().includes('admin')) ? 'Admin' : 'Tecnico';
    const wrap = document.getElementById('wrapEditColabAdminPass');
    if (wrap) wrap.style.display = novoNivel !== nivelAtual ? 'block' : 'none';
}

function fecharModalEditarColab() {
    const modal = document.getElementById('modalEditarColab');
    if (modal) modal.style.display = 'none';
}

async function salvarEdicaoColaborador() {
    const id = document.getElementById('editColabId').value;
    const nome = document.getElementById('editColabNome').value.trim();
    const funcao = document.getElementById('editColabFuncao').value.trim();
    const setor = sanitizarSetorDemandaEpi(document.getElementById('editColabSetor').value.trim());
    const email = document.getElementById('editColabEmail').value.trim().toLowerCase();
    const nivel = document.getElementById('editColabNivel').value;
    const adminPass = document.getElementById('editColabAdminPass').value;
    const statusEl = document.getElementById('editColabStatus');
    const btn = document.getElementById('btnSalvarEditColab');

    if (!nome) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ O nome é obrigatório.'; }
        return;
    }

    const colabAtual = allColaboradoresInternos.find(c => String(c.id) === String(id));
    const nivelAtual = (colabAtual && (colabAtual.nivel_acesso || '').toLowerCase().includes('admin')) ? 'Admin' : 'Tecnico';
    const nivelMudou = nivelAtual !== nivel;

    if (nivelMudou && !adminPass) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Digite sua senha de Administrador para confirmar a alteração do nível de acesso.'; }
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }
    if (statusEl) { statusEl.style.color = 'var(--text)'; statusEl.textContent = '⏳ Salvando dados do colaborador...'; }

    try {
        const updatePayload = { nome, funcao, setor, email };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            },
            body: JSON.stringify(updatePayload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

        if (nivelMudou) {
            const sessionStr = localStorage.getItem('active_session');
            const session = sessionStr ? JSON.parse(sessionStr) : null;
            const adminMatricula = (session && session.matricula) || '76';

            const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verificar_login`, {
                method: 'POST',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_login: adminMatricula, p_senha: adminPass })
            });
            const adminData = await rpcRes.json().catch(() => null);
            if (!rpcRes.ok || !Array.isArray(adminData) || adminData.length === 0) {
                throw new Error('Senha de Administrador incorreta ao tentar alterar nível de acesso.');
            }
            const adminRow = adminData[0];
            const rpcNivel = await fetch(`${SUPABASE_URL}/rest/v1/rpc/alterar_nivel_acesso`, {
                method: 'POST',
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    p_admin_matricula: adminRow.matricula || adminRow.id,
                    p_admin_senha_hash: adminRow.senha,
                    p_target_id: id,
                    p_novo_nivel: nivel
                })
            });
            if (!rpcNivel.ok) throw new Error(`Falha ao alterar nível de acesso: ${await rpcNivel.text()}`);
        }

        await registrarAuditLogDashboard('update', 'colaboradores_checklist', id, `${nome} (Mat. ${id})`, `Dados atualizados. Nível: ${nivel}`);

        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.textContent = '✅ Colaborador atualizado com sucesso!';
        }

        setTimeout(() => {
            fecharModalEditarColab();
            carregarColaboradoresInternos();
        }, 1200);
    } catch (e) {
        console.error('Erro ao salvar colaborador:', e);
        if (statusEl) {
            statusEl.style.color = 'var(--danger)';
            statusEl.textContent = '❌ Erro: ' + e.message;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Alterações'; }
    }
}

async function alternarAtivoColaborador(id, ativoAtual) {
    const novoStatus = !ativoAtual;
    const acaoTexto = novoStatus ? 'reativar' : 'desativar';
    const colab = allColaboradoresInternos.find(c => String(c.id) === String(id));
    const nome = colab ? colab.nome : id;

    if (!confirm(`Deseja realmente ${acaoTexto} o acesso de "${nome}" (Matrícula ${id})?`)) return;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ativo: novoStatus })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        await registrarAuditLogDashboard('update', 'colaboradores_checklist', id, `${nome} (Mat. ${id})`, `Status alterado para ${novoStatus ? 'Ativo' : 'Inativo'}`);

        // Sincroniza em colaboradores_efetivo se o colaborador existir no cadastro de efetivo
        try {
            const efColab = (allEfetivo || []).find(e => String(e.id) === String(matricula));
            if (efColab) {
                const novoStatusEfetivo = novoStatus ? 'ATIVO' : (efColab.dt_demissao ? 'DEMITIDO' : 'INATIVO');
                await supabaseUpsert('colaboradores_efetivo', [{
                    id: efColab.id,
                    status: novoStatusEfetivo
                }]);
                efColab.status = novoStatusEfetivo;
                renderEfetivoPanel();
                renderEfetivoResumo();
            }
        } catch (errEfSync) {
            console.warn('Aviso ao sincronizar colaboradores_efetivo a partir de colaboradores_checklist:', errEfSync);
        }

        await carregarColaboradoresInternos();
    } catch (e) {
        console.error('Erro ao alterar status:', e);
        alert('❌ Falha ao alterar status do colaborador: ' + e.message);
    }
}

async function excluirColaboradorInterno(id) {
    const colab = allColaboradoresInternos.find(c => String(c.id) === String(id));
    const nome = colab ? colab.nome : id;
    const matricula = colab ? (colab.matricula || colab.id) : id;

    if (!confirm(`Deseja realmente EXCLUIR permanentemente o cadastro de "${nome}" (Matrícula ${matricula})?\n\n⚠️ Esta ação removerá o colaborador da lista. (Checklists e inspeções antigas já salvas manterão o nome registrado).`)) {
        return;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`HTTP ${res.status}: ${errTxt}`);
        }

        await registrarAuditLogDashboard('delete', 'colaboradores_checklist', id, `${nome} (Mat. ${matricula})`, 'Colaborador excluído pelo Administrador no Painel');
        await carregarColaboradoresInternos();
    } catch (e) {
        console.error('Erro ao excluir colaborador:', e);
        alert('❌ Falha ao excluir colaborador: ' + e.message);
    }
}

function abrirModalNovoColaborador() {
    const modal = document.getElementById('modalNovoColab');
    document.getElementById('novoColabMatricula').value = '';
    document.getElementById('novoColabNome').value = '';
    document.getElementById('novoColabFuncao').value = '';
    document.getElementById('novoColabSetor').value = '';
    document.getElementById('novoColabEmail').value = '';
    document.getElementById('novoColabSenha').value = '';
    document.getElementById('novoColabNivel').value = 'Tecnico';
    const statusDiv = document.getElementById('novoColabStatus');
    if (statusDiv) statusDiv.textContent = '';
    if (modal) modal.style.display = 'flex';
}

function fecharModalNovoColab() {
    const modal = document.getElementById('modalNovoColab');
    if (modal) modal.style.display = 'none';
}

async function salvarNovoColaboradorInterno() {
    const matricula = document.getElementById('novoColabMatricula').value.trim().toUpperCase();
    const nome = document.getElementById('novoColabNome').value.trim();
    const funcao = document.getElementById('novoColabFuncao').value.trim();
    const setor = sanitizarSetorDemandaEpi(document.getElementById('novoColabSetor').value.trim());
    const email = document.getElementById('novoColabEmail').value.trim().toLowerCase();
    const nivel = document.getElementById('novoColabNivel').value;
    const senha = document.getElementById('novoColabSenha').value;
    const statusEl = document.getElementById('novoColabStatus');
    const btn = document.getElementById('btnSalvarNovoColab');

    if (!matricula || !nome || !senha) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Matrícula, Nome e Senha são obrigatórios.'; }
        return;
    }
    if (senha.length < 4) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ A senha deve ter pelo menos 4 caracteres.'; }
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Cadastrando...'; }
    if (statusEl) { statusEl.style.color = 'var(--text)'; statusEl.textContent = '⏳ Criando cadastro...'; }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cadastrar_conta`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_matricula: matricula,
                p_nome: nome,
                p_funcao: funcao,
                p_setor: setor,
                p_email: email || '',
                p_senha: senha
            })
        });

        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(errTxt);
        }

        if (nivel === 'Admin') {
            await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(matricula)}`, {
                method: 'PATCH',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${await authTokenDashboard()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nivel_acesso: 'Admin' })
            }).catch(() => null);
        }

        await registrarAuditLogDashboard('create', 'colaboradores_checklist', matricula, `${nome} (Mat. ${matricula})`, `Novo colaborador criado. Nível: ${nivel}`);

        if (statusEl) {
            statusEl.style.color = '#10b981';
            statusEl.textContent = '✅ Colaborador cadastrado com sucesso!';
        }

        setTimeout(() => {
            fecharModalNovoColab();
            carregarColaboradoresInternos();
        }, 1200);
    } catch (e) {
        console.error('Erro ao cadastrar novo colaborador:', e);
        if (statusEl) {
            statusEl.style.color = 'var(--danger)';
            statusEl.textContent = '❌ Erro ao cadastrar: ' + e.message;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '➕ Cadastrar Colaborador'; }
    }
}

async function loadUsuariosPainelData() {
    const statusEl = document.getElementById('usuariosPainelStatus');
    if (statusEl) statusEl.textContent = '⏳ Carregando...';
    try {
        await Promise.all([
            carregarColaboradoresInternos(),
            (async () => {
                const [perfis, usuarios] = await Promise.all([
                    supabaseFetch('painel_perfis', '?select=*&order=nome'),
                    supabaseFetch('painel_usuarios', '?select=*&order=nome')
                ]);
                allPainelPerfis = perfis || [];
                allPainelUsuarios = usuarios || [];
                renderPainelPerfisLista();
                renderPainelUsuariosLista();
                popularSelectPerfisPainel();
            })()
        ]);
        if (statusEl) statusEl.textContent = '';
    } catch (e) {
        console.error('Erro ao carregar Usuários do Painel:', e);
        if (statusEl) statusEl.textContent = '❌ Erro ao carregar: ' + e.message;
    }
}

function renderPainelPerfisLista() {
    const el = document.getElementById('listPainelPerfis');
    if (!el) return;
    if (allPainelPerfis.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum perfil cadastrado ainda.</div>';
        return;
    }
    el.innerHTML = allPainelPerfis.map(p => `
        <div class="db-list-item" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
                <div class="db-list-item-title">${escapeHTML(p.nome)}${p.ativo === false ? ' <span style="color:var(--danger); font-weight:600;">(inativo)</span>' : ''}</div>
                <div class="db-list-item-sub">${(p.modulos || []).map(m => (MODULOS_PAINEL_DISPONIVEIS.find(x => x.key === m) || {}).label || m).join(', ') || '(nenhum módulo)'}</div>
            </div>
            <button class="db-clear-btn" style="padding:4px 9px; font-size:11px;" onclick="abrirEdicaoPerfilPainel('${escapeHTML(p.id)}')">✏️ Editar</button>
        </div>
    `).join('');
}

function popularSelectPerfisPainel() {
    const sel = document.getElementById('painelConvitePerfil');
    if (!sel) return;
    const atual = sel.value;
    sel.innerHTML = allPainelPerfis.filter(p => p.ativo !== false).map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)}</option>`).join('');
    if (atual) sel.value = atual;
}

function renderPainelUsuariosLista() {
    const el = document.getElementById('listPainelUsuarios');
    if (!el) return;
    if (allPainelUsuarios.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum usuário convidado ainda.</div>';
        return;
    }
    el.innerHTML = allPainelUsuarios.map(u => {
        // Seletor de perfil - troca na hora que o usuário escolhe outra opção (sem botão
        // "Salvar" separado), chamando alterarPerfilPainelUsuario logo abaixo.
        const opcoesPerfil = allPainelPerfis.map(p => `<option value="${escapeHTML(p.id)}" ${p.id === u.perfil_id ? 'selected' : ''}>${escapeHTML(p.nome)}</option>`).join('');
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
                <div class="db-list-item-title">${escapeHTML(u.nome)}${u.ativo === false ? ' <span style="color:var(--danger); font-weight:600;">(desativado)</span>' : ''}</div>
                <div class="db-list-item-sub">${escapeHTML(u.email)}</div>
            </div>
            <select style="padding:5px 8px; border:1px solid var(--border); border-radius:6px; font-size:12px;" onchange="alterarPerfilPainelUsuario('${u.id}', this.value)" title="Trocar perfil">${opcoesPerfil}</select>
            <button class="db-clear-btn" style="padding:4px 9px; font-size:11px;" onclick="alternarAtivoPainelUsuario('${u.id}', ${u.ativo === false})">${u.ativo === false ? '✅ Reativar' : '🚫 Desativar'}</button>
            <button class="db-clear-btn" style="padding:4px 9px; font-size:11px; color:var(--danger); border-color:rgba(239,68,68,0.3);" onclick="excluirPainelUsuario('${u.id}')" title="Excluir usuário convidado permanentemente">🗑️ Excluir</button>
        </div>`;
    }).join('');
}

async function convidarUsuarioPainel() {
    const nomeInput = document.getElementById('painelConviteNome');
    const emailInput = document.getElementById('painelConviteEmail');
    const perfilSelect = document.getElementById('painelConvitePerfil');
    const statusEl = document.getElementById('painelConviteStatus');
    const btn = document.getElementById('painelConviteBtn');
    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const perfil_id = perfilSelect.value;

    if (!nome || !email || !perfil_id) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Preencha nome, e-mail e perfil.'; }
        return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando convite...'; }
    if (statusEl) { statusEl.style.color = 'var(--text)'; statusEl.textContent = '⏳ Enviando convite...'; }
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/convidar-usuario-painel`, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, email, perfil_id })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);

        if (statusEl) { statusEl.style.color = 'var(--success, #16a34a)'; statusEl.textContent = '✅ Convite enviado! A pessoa recebe um e-mail pra criar a própria senha.'; }
        nomeInput.value = '';
        emailInput.value = '';
        await loadUsuariosPainelData();
        registrarAuditLogDashboard('create', 'painel_usuarios', email, `Convite enviado para ${nome} (${email})`);
    } catch (e) {
        console.error('Erro ao convidar usuário do painel:', e);
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ ' + e.message; }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✉️ Enviar convite'; }
    }
}

async function alternarAtivoPainelUsuario(id, novoAtivo) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/painel_usuarios?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ ativo: novoAtivo })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        await loadUsuariosPainelData();
        registrarAuditLogDashboard('update', 'painel_usuarios', id, novoAtivo ? 'Usuário do painel reativado' : 'Usuário do painel desativado');
    } catch (e) {
        alert('Erro ao atualizar: ' + e.message);
    }
}

async function excluirPainelUsuario(id) {
    const usuario = allPainelUsuarios.find(u => String(u.id) === String(id));
    const nome = usuario ? usuario.nome : id;
    const email = usuario ? usuario.email : '';

    if (!confirm(`Deseja realmente EXCLUIR o usuário convidado "${nome}" (${email})?\n\nEsta ação é definitiva e removerá o acesso desta pessoa ao painel.`)) {
        return;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/painel_usuarios?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`HTTP ${res.status}: ${errTxt}`);
        }

        await registrarAuditLogDashboard('delete', 'painel_usuarios', id, `${nome} (${email})`, 'Usuário convidado excluído pelo Administrador');
        await loadUsuariosPainelData();
    } catch (e) {
        console.error('Erro ao excluir usuário convidado:', e);
        alert('❌ Falha ao excluir usuário: ' + e.message);
    }
}

// Troca o perfil (pacote de módulos) de um usuário convidado - ex: de "Visualizador" pra
// "Editor" e vice-versa. Só muda o vínculo (perfil_id); a conta e o e-mail continuam os
// mesmos. Efeito imediato: da próxima vez que a pessoa carregar o painel (ou relogar), o
// menu já reflete os módulos do novo perfil.
async function alterarPerfilPainelUsuario(id, novoPerfilId) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/painel_usuarios?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${await authTokenDashboard()}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
            },
            body: JSON.stringify({ perfil_id: novoPerfilId })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const usuario = allPainelUsuarios.find(u => u.id === id);
        const perfilNovo = allPainelPerfis.find(p => p.id === novoPerfilId);
        registrarAuditLogDashboard('update', 'painel_usuarios', id, `Perfil de ${usuario ? usuario.nome : id} alterado para "${perfilNovo ? perfilNovo.nome : novoPerfilId}"`);
        await loadUsuariosPainelData();
    } catch (e) {
        alert('Erro ao trocar perfil: ' + e.message);
        await loadUsuariosPainelData(); // recarrega pra desfazer a troca visual se salvar falhou
    }
}

function abrirEdicaoPerfilPainel(id) {
    const p = id ? allPainelPerfis.find(x => x.id === id) : null;
    painelPerfilEditandoId = p ? p.id : null;
    document.getElementById('painelPerfilFormTitulo').textContent = p ? `Editar perfil: ${p.nome}` : 'Novo perfil';
    document.getElementById('painelPerfilNome').value = p ? p.nome : '';
    document.getElementById('painelPerfilIdInput').value = p ? p.id : '';
    document.getElementById('painelPerfilIdInput').disabled = !!p;
    document.getElementById('painelPerfilAtivo').checked = p ? p.ativo !== false : true;
    const modulosAtuais = new Set(p ? (p.modulos || []) : []);
    document.getElementById('painelPerfilModulos').innerHTML = MODULOS_PAINEL_DISPONIVEIS.map(m => `
        <label style="display:flex; align-items:center; gap:6px; font-size:13px; padding:3px 0;">
            <input type="checkbox" value="${m.key}" ${modulosAtuais.has(m.key) ? 'checked' : ''}> ${escapeHTML(m.label)}
        </label>
    `).join('');
    document.getElementById('painelPerfilFormStatus').textContent = '';
    document.getElementById('painelPerfilFormCard').style.display = 'block';
    document.getElementById('painelPerfilFormCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharEdicaoPerfilPainel() {
    document.getElementById('painelPerfilFormCard').style.display = 'none';
    painelPerfilEditandoId = null;
}

async function salvarPerfilPainel() {
    const nome = document.getElementById('painelPerfilNome').value.trim();
    const idInput = document.getElementById('painelPerfilIdInput').value.trim();
    const ativo = document.getElementById('painelPerfilAtivo').checked;
    const modulos = Array.from(document.querySelectorAll('#painelPerfilModulos input[type=checkbox]:checked')).map(cb => cb.value);
    const statusEl = document.getElementById('painelPerfilFormStatus');

    if (!nome || (!painelPerfilEditandoId && !idInput)) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Preencha nome e identificador do perfil.'; }
        return;
    }
    const id = painelPerfilEditandoId || idInput.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    try {
        await supabaseUpsert('painel_perfis', [{ id, nome, modulos, ativo }]);
        fecharEdicaoPerfilPainel();
        await loadUsuariosPainelData();
        registrarAuditLogDashboard(painelPerfilEditandoId ? 'update' : 'create', 'painel_perfis', id, `Perfil "${nome}" - módulos: ${modulos.join(', ') || '(nenhum)'}`);
    } catch (e) {
        if (statusEl) { statusEl.style.color = 'var(--danger)'; statusEl.textContent = '❌ Erro ao salvar: ' + e.message; }
    }
}

// ================================================================
// MENU LATERAL EM GRUPOS (accordion por pilar de SSMA)
// ================================================================
var NAV_GROUP_POR_PAGINA = {
    checklists: 'seguranca', treinamentos: 'seguranca', ddsma: 'seguranca', apr: 'seguranca', matrizrisco: 'seguranca', planoacao: 'seguranca',
    epi: 'seguranca', periculosidade: 'seguranca', extintores: 'seguranca', acidentes: 'seguranca', relatos: 'seguranca', cipa: 'seguranca', brigada: 'seguranca',
    saude: 'saude', psicossocial: 'saude', ergonomia: 'saude',
    ambiental: 'ambiente',
    efetivo: 'pessoas',
    compras: 'gestao', documentos: 'gestao', acervodrive: 'gestao', importexport: 'gestao',
    relatoriosms: 'relatorios'
    // 'config' fica de fora de propósito - não pertence a nenhum grupo, fica solto no menu.
};

function toggleNavGroup(grupo) {
    const itemsEl = document.getElementById('navGroupItems-' + grupo);
    const headerEl = document.querySelector(`.db-nav-group[data-group="${grupo}"] .db-nav-group-header`);
    if (!itemsEl || !headerEl) return;
    const vaiAbrir = itemsEl.classList.contains('collapsed');
    itemsEl.classList.toggle('collapsed', !vaiAbrir);
    headerEl.classList.toggle('open', vaiAbrir);
    salvarGruposNavAbertos();
}

// Abre (sem fechar os outros) o grupo que contém a página informada - chamado sempre
// que showDbPage() navega pra algum lugar, pra garantir que o item nunca fique
// "escondido" atrás de um grupo fechado.
function abrirGrupoNavPagina(pageId) {
    const grupo = NAV_GROUP_POR_PAGINA[pageId];
    if (!grupo) return;
    const itemsEl = document.getElementById('navGroupItems-' + grupo);
    const headerEl = document.querySelector(`.db-nav-group[data-group="${grupo}"] .db-nav-group-header`);
    if (itemsEl) itemsEl.classList.remove('collapsed');
    if (headerEl) headerEl.classList.add('open');
    salvarGruposNavAbertos();
}

// Destaca (texto roxo) o cabeçalho da categoria que contém a página atualmente ativa, e
// tira o destaque de todas as outras - chamada sempre que a página muda (showDbPage) e
// uma vez na inicialização (pra já nascer com "Segurança do Trabalho" destacado, já que
// Checklists é a página inicial). 'config' fica de fora de propósito - é um item solto no
// menu, não pertence a nenhuma categoria, então nenhum cabeçalho fica destacado nesse caso.
function destacarGrupoAtivo(pageId) {
    document.querySelectorAll('.db-nav-group-header').forEach(el => el.classList.remove('grupo-ativo'));
    const grupo = NAV_GROUP_POR_PAGINA[pageId];
    if (!grupo) return;
    const headerEl = document.querySelector(`.db-nav-group[data-group="${grupo}"] .db-nav-group-header`);
    if (headerEl) headerEl.classList.add('grupo-ativo');
}

function salvarGruposNavAbertos() {
    const abertos = Array.from(document.querySelectorAll('.db-nav-group-items:not(.collapsed)'))
        .map(el => el.id.replace('navGroupItems-', ''));
    try { localStorage.setItem('dbNavGruposAbertos', JSON.stringify(abertos)); } catch (e) { /* localStorage indisponível - sem problema, só não lembra na próxima visita */ }
}

// Restaura, ao carregar a página, quais grupos estavam abertos na última visita - padrão
// (primeira vez, ou localStorage vazio) é só "Segurança do Trabalho" aberto, já que é
// onde fica a maioria das páginas e a página inicial (Checklists).
function restaurarGruposNavAbertos() {
    let abertos;
    try { abertos = JSON.parse(localStorage.getItem('dbNavGruposAbertos')); } catch (e) { abertos = null; }
    if (!Array.isArray(abertos)) abertos = ['seguranca'];
    // Checklists é sempre a página que já carrega ativa (marcada direto no HTML) -
    // garante que o grupo dela também esteja aberto mesmo que o localStorage salvo não
    // inclua 'seguranca', senão o item ativo fica escondido atrás de um grupo fechado
    // logo na primeira tela que o usuário vê.
    if (!abertos.includes('seguranca')) abertos = [...abertos, 'seguranca'];
    document.querySelectorAll('.db-nav-group').forEach(grupoEl => {
        const grupo = grupoEl.dataset.group;
        const itemsEl = document.getElementById('navGroupItems-' + grupo);
        const headerEl = grupoEl.querySelector('.db-nav-group-header');
        const deveAbrir = abertos.includes(grupo);
        if (itemsEl) itemsEl.classList.toggle('collapsed', !deveAbrir);
        if (headerEl) headerEl.classList.toggle('open', deveAbrir);
    });
}

function showDbPage(pageId) {
    // RBAC piloto (2026-09-14) - trava de front pra usuário só-painel (a trava de verdade
    // é no banco via RLS; isso aqui só evita abrir uma tela que ia vir vazia/dar erro).
    // Colaborador interno nunca é bloqueado aqui.
    if (!moduloPermitidoPainel(pageId)) {
        alert('Você não tem acesso a este módulo. Fale com o administrador do painel se precisar dele.');
        return;
    }

    document.querySelectorAll('.db-page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + pageId)?.classList.add('active');

    document.querySelectorAll('.db-nav-item').forEach(el => el.classList.remove('active'));
    const navMap = { checklists: 'navChecklists', extintores: 'navExtintores', relatos: 'navRelatos', treinamentos: 'navTreinamentos', ddsma: 'navDdsma', efetivo: 'navEfetivo', matrizrisco: 'navMatrizRisco', planoacao: 'navPlanoAcao', acidentes: 'navAcidentes', saude: 'navSaude', psicossocial: 'navPsicossocial', epi: 'navEpi', apr: 'navApr', placarlideres: 'navPlacarLideres', ambiental: 'navAmbiental', compras: 'navCompras', cipa: 'navCipa', brigada: 'navBrigada', documentos: 'navDocumentos', acervodrive: 'navAcervoDrive', relatoriosms: 'navRelatorioSms', importexport: 'navImportExport', config: 'navConfig', usuariospainel: 'navUsuariosPainel', ergonomia: 'navErgonomia', periculosidade: 'navPericulosidade' };
    document.getElementById(navMap[pageId])?.classList.add('active');
    abrirGrupoNavPagina(pageId);
    destacarGrupoAtivo(pageId);

    document.getElementById('pageTitle').textContent = DB_PAGE_TITLES[pageId] || '';

    // Sempre re-renderiza os gráficos ao entrar na página (não só na primeira vez) -
    // se o Chart.js criou os gráficos em algum momento em que o canvas ainda não tinha
    // um tamanho real (ex: troca de aba muito rápida logo após o carregamento), eles
    // ficam em branco pra sempre até a página ser recarregada, já que nada mais dispara
    // um redesenho depois disso. Recriar o gráfico do zero a cada visita é barato (não
    // busca nada de novo no Supabase, só usa os dados já carregados em memória) e
    // corrige isso sozinho.
    if (pageId === 'placarlideres') {
        if (typeof abrirPaginaPlacarLideres === 'function') abrirPaginaPlacarLideres();
    }
    if (pageId === 'checklists') {
        renderBannerCorDoMes();
        if (document.getElementById('checklistsSubtabBtn-visao')?.classList.contains('active')) renderAll();
    }
    if (pageId === 'extintores') {
        if (document.getElementById('extintoresSubtabBtn-visao')?.classList.contains('active')) renderExtintorPanel();
    }
    if (pageId === 'relatos') {
        if (document.getElementById('relatosSubtabBtn-visao')?.classList.contains('active')) renderRelatosPanel();
        else if (document.getElementById('relatosSubtabBtn-gestao')?.classList.contains('active')) renderRelatosGestaoLista(document.getElementById('relGestaoSearchInput')?.value || '');
    }
    if (pageId === 'treinamentos') {
        if (!treinamentosLoaded) { treinamentosLoaded = true; loadTreinamentosData(); }
        else renderTreinamentosPanel();
    }
    if (pageId === 'usuariospainel') {
        if (!usuariosPainelLoaded) { usuariosPainelLoaded = true; loadUsuariosPainelData(); }
        else renderPainelPerfisLista(), renderPainelUsuariosLista();
    }
    if (pageId === 'config') {
        renderConfigGeral();
    }
    // DDSMA usa os MESMOS dados já carregados pra Treinamentos (dds_realizados,
    // dds_historico_agregado etc. já vêm juntos em loadTreinamentosData) - só muda a
    // TELA, não a fonte de dados. Por isso reaproveita o mesmo treinamentosLoaded em
    // vez de criar uma busca nova no Supabase.
    if (pageId === 'ddsma') {
        carregarConfiguracoesDdsDoSupabase();
        if (!treinamentosLoaded) { treinamentosLoaded = true; loadTreinamentosData(); }
        else if (document.getElementById('ddsmaSubtabBtn-visao')?.classList.contains('active')) renderDdsPanel();
    }
    if (pageId === 'efetivo') {
        if (!efetivoLoaded) { 
            efetivoLoaded = true; 
            loadEfetivoData().then(() => {
                if (document.getElementById('efetivoSubtabBtn-ferias')?.classList.contains('active')) renderFeriasPanel();
            }); 
        } else {
            if (document.getElementById('efetivoSubtabBtn-ferias')?.classList.contains('active')) renderFeriasPanel();
            else renderEfetivoPanel();
        }
    }
    if (pageId === 'matrizrisco') {
        if (!matrizRiscoLoaded) {
            matrizRiscoLoaded = true;
            (allGheCatalogo.length === 0 ? supabaseFetch('ghe_catalogo', '?select=*').then(rows => { allGheCatalogo = rows; }) : Promise.resolve())
                .then(renderMatrizRiscoPanel);
        } else {
            renderMatrizRiscoPanel();
        }
    }
    if (pageId === 'acidentes') {
        if (!acidentesLoaded) { acidentesLoaded = true; loadAcidentesData(); }
        else renderAcidentesPanel();
    }
    if (pageId === 'saude') {
        if (!saudeLoaded) { saudeLoaded = true; loadSaudeData(); }
        else if (document.getElementById('saudeSubtabBtn-visao')?.classList.contains('active')) renderSaudePanel();
    }
    if (pageId === 'psicossocial') {
        if (!psicossocialLoaded) { psicossocialLoaded = true; loadPsicossocialData(); }
        else if (document.getElementById('psicossocialSubtabBtn-visao')?.classList.contains('active')) renderPsicossocialPanel();
    }
    if (pageId === 'epi') {
        if (!epiLoaded) { epiLoaded = true; loadEpiData(); }
        else if (document.getElementById('epiSubtabBtn-visao')?.classList.contains('active')) renderEpiPanel();
    }
    if (pageId === 'ambiental') {
        if (!ambientalLoaded) { ambientalLoaded = true; loadAmbientalData(); }
        else if (document.getElementById('ambientalSubtabBtn-visao')?.classList.contains('active')) renderAmbientalPanel();
    }
    if (pageId === 'apr') {
        if (!aprLoaded) { aprLoaded = true; loadAprData(); }
        else if (document.getElementById('aprSubtabBtn-visao')?.classList.contains('active')) renderAprPanel();
    }
    if (pageId === 'compras') {
        if (!comprasLoaded) { comprasLoaded = true; loadComprasData(); }
        else if (document.getElementById('comprasSubtabBtn-visao')?.classList.contains('active')) renderComprasPanel();
    }
    if (pageId === 'cipa') {
        if (!cipaLoaded) { cipaLoaded = true; loadCipaData(); }
        else if (document.getElementById('cipaSubtabBtn-visao')?.classList.contains('active')) renderCipaVisaoGeral();
    }
    if (pageId === 'brigada') {
        if (!brigadaLoaded) { brigadaLoaded = true; loadBrigadaData(); }
        else if (document.getElementById('brigadaSubtabBtn-dimensionamento')?.classList.contains('active')) renderBrigadaDimensionamento();
    }
    if (pageId === 'documentos') {
        if (!documentosControleLoaded) { documentosControleLoaded = true; loadDocumentosControleData(); }
        else renderListaMestraDocumentos();
    }
    if (pageId === 'relatoriosms') {
        popularRelSmsDefaults();
    }
    if (pageId === 'ergonomia') {
        if (!ergonomiaLoaded) { ergonomiaLoaded = true; loadErgonomiaData(); }
        else if (document.getElementById('ergonomiaSubtabBtn-visao')?.classList.contains('active')) renderErgonomiaVisao();
        else if (document.getElementById('ergonomiaSubtabBtn-plano')?.classList.contains('active')) renderErgonomiaPlano();
    }
    if (pageId === 'periculosidade') {
        if (!periculosidadeLoaded) { periculosidadeLoaded = true; loadPericulosidadeData(); }
        else renderPericulosidadePanel();
    }
    if (pageId === 'planoacao') {
        if (!planoAcaoPgrLoaded) { planoAcaoPgrLoaded = true; loadPlanoAcaoPgrData(); }
        else renderPlanoAcaoPgrVisaoAtual();
    }
    // Sempre reinicia na tela de escolha de categoria (Treinamentos/DDSMA) ao entrar
    // nesta página - é uma navegação ao vivo no Drive, sem estado pra preservar/cachear
    // entre visitas (diferente dos outros módulos, que guardam dados já carregados).
    if (pageId === 'acervodrive') {
        resetAcervoDrive();
    }
    atualizarAvisosPermissaoPagina(pageId);
}

// ============================================
// ACERVO (DRIVE) - navegação somente-leitura pelo acervo HISTÓRICO de
// digitalizações (Treinamentos/DDSMA) já guardadas manualmente no Google Drive, via
// /api/anexos-drive-listar (Chave de API do Google, separada do OAuth usado pro upload
