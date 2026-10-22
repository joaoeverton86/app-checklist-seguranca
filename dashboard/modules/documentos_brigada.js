// ==============================================================================
// MODULO: CONTROLE DOCUMENTAL E BRIGADA DE INCENDIO (DIMENSIONAMENTO/PLANO)
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// emissões pros documentos gerados pelo sistema. A lista mestra (documentos_controle)
// é a fonte real lida pelos geradores (gerarRegistroTreinamento, abrirFichaEpiColaborador
// etc, via codigoRevisaoDocumento()) - mudar a revisão aqui reflete automaticamente no
// próximo PDF impresso, sem tocar em nenhuma função geradora.
// ============================================

let allDocumentosControle = [];
let allDocumentosRevisoes = [];
let allDocumentosEmissoes = [];
let documentosControleLoaded = false;

const DOC_STATUS_LABELS = { vigente: '✅ Vigente', em_elaboracao: '🛠️ Em Elaboração', obsoleto: '🚫 Obsoleto' };

async function loadDocumentosControleData() {
    try {
        const [docs, revisoes, emissoes] = await Promise.all([
            supabaseFetch('documentos_controle', '?select=*'),
            supabaseFetch('documentos_revisoes', '?select=*'),
            supabaseFetch('documentos_emissoes', '?select=*')
        ]);
        allDocumentosControle = docs;
        allDocumentosRevisoes = revisoes;
        allDocumentosEmissoes = emissoes;
        renderListaMestraDocumentos();
        popularFiltroDocumentosEmissoes();
        renderRegistroEmissoes();
    } catch (err) {
        console.error('Erro ao carregar controle de documentos:', err);
    }
}

function showDocumentosSubtab(tab) {
    ['lista', 'emissoes'].forEach(t => {
        const content = document.getElementById('documentosSubtab-' + t);
        const btn = document.getElementById('documentosSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'lista') { fecharFormDocumento(); renderListaMestraDocumentos(); }
    if (tab === 'emissoes') { popularFiltroDocumentosEmissoes(); renderRegistroEmissoes(); }
}

function renderListaMestraDocumentos() {
    const container = document.getElementById('documentosLista');
    if (!container) return;
    const linhas = allDocumentosControle.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum documento cadastrado.</div>';
        return;
    }
    container.innerHTML = linhas.map(d => `<div class="db-list-item" style="cursor:pointer;" onclick="abrirFormDocumento('${escapeHTML(d.id)}')">
        <div class="db-list-item-title">${escapeHTML(d.nome)}${d.codigo ? ' — ' + escapeHTML(d.codigo) + (d.revisao_atual ? ' ' + escapeHTML(d.revisao_atual) : '') : ' — (sem código definido)'}</div>
        <div class="db-list-item-sub">${DOC_STATUS_LABELS[d.status] || d.status || ''}${d.modulo_relacionado ? ' — ' + escapeHTML(d.modulo_relacionado) : ''}</div>
    </div>`).join('');
}

function abrirFormDocumento(id) {
    const d = allDocumentosControle.find(x => x.id === id);
    if (!d) return;
    const form = document.getElementById('documentoFormCard');
    document.getElementById('documentoFormStatus').textContent = '';
    form.dataset.id = id;

    document.getElementById('documentoFormTitle').textContent = `📄 ${d.nome}`;
    document.getElementById('docForm_nome').value = d.nome || '';
    document.getElementById('docForm_codigo').value = d.codigo || '';
    document.getElementById('docForm_status').value = d.status || 'vigente';
    document.getElementById('docForm_modulo').value = d.modulo_relacionado || '';
    document.getElementById('docForm_elaboradoPor').value = d.elaborado_por || '';
    document.getElementById('docForm_aprovadoPor').value = d.aprovado_por || '';
    document.getElementById('docForm_observacoes').value = d.observacoes || '';
    document.getElementById('docForm_revisaoAtualLabel').textContent = d.revisao_atual || '—';

    document.getElementById('revForm_revisao').value = '';
    document.getElementById('revForm_data').value = new Date().toISOString().slice(0, 10);
    document.getElementById('revForm_descricao').value = '';
    document.getElementById('revForm_responsavel').value = '';

    renderHistoricoRevisoes(id);
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormDocumento() {
    const form = document.getElementById('documentoFormCard');
    if (form) form.style.display = 'none';
}

function renderHistoricoRevisoes(documentoId) {
    const container = document.getElementById('documentoHistoricoRevisoes');
    if (!container) return;
    const linhas = allDocumentosRevisoes
        .filter(r => r.documento_id === documentoId)
        .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.created_at || '').localeCompare(a.created_at || ''));
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma revisão registrada ainda.</div>';
        return;
    }
    container.innerHTML = linhas.map(r => `<div style="padding:8px; border:1px solid var(--border); border-radius:8px; font-size:12.5px;">
        <b>${escapeHTML(r.revisao)}</b> — ${formatSimpleDate(r.data)}${r.responsavel ? ' — ' + escapeHTML(r.responsavel) : ''}
        ${r.descricao_alteracao ? `<div style="color:var(--text-light); margin-top:2px;">${escapeHTML(r.descricao_alteracao)}</div>` : ''}
    </div>`).join('');
}

async function salvarDocumento() {
    if (bloquearEdicaoSeNaoAutorizado('documentos')) return;
    const statusEl = document.getElementById('documentoFormStatus');
    const id = document.getElementById('documentoFormCard').dataset.id;
    const existente = allDocumentosControle.find(d => d.id === id);
    if (!existente) return;
    const nome = document.getElementById('docForm_nome').value.trim();
    if (!nome) {
        statusEl.textContent = '❌ Informe o nome do documento.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const row = {
        ...existente,
        nome,
        codigo: document.getElementById('docForm_codigo').value.trim() || null,
        status: document.getElementById('docForm_status').value,
        modulo_relacionado: document.getElementById('docForm_modulo').value.trim() || null,
        elaborado_por: document.getElementById('docForm_elaboradoPor').value.trim() || null,
        aprovado_por: document.getElementById('docForm_aprovadoPor').value.trim() || null,
        observacoes: document.getElementById('docForm_observacoes').value.trim() || null
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('documentos_controle', [row]);
        const idx = allDocumentosControle.findIndex(d => d.id === id);
        if (idx >= 0) allDocumentosControle[idx] = row;
        renderListaMestraDocumentos();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao salvar documento:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function adicionarRevisaoDocumento() {
    const statusEl = document.getElementById('documentoFormStatus');
    const documentoId = document.getElementById('documentoFormCard').dataset.id;
    const existente = allDocumentosControle.find(d => d.id === documentoId);
    if (!existente) return;

    const revisao = document.getElementById('revForm_revisao').value.trim();
    const data = document.getElementById('revForm_data').value;
    if (!revisao || !data) {
        statusEl.textContent = '❌ Informe a revisão e a data.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const descricao = document.getElementById('revForm_descricao').value.trim() || null;
    const responsavel = document.getElementById('revForm_responsavel').value.trim() || null;

    const revRow = {
        id: `REV_${documentoId}_${Date.now()}`,
        documento_id: documentoId,
        revisao,
        data,
        descricao_alteracao: descricao,
        responsavel
    };
    const docRow = {
        ...existente,
        revisao_atual: revisao,
        data_revisao_atual: data,
        motivo_revisao_atual: descricao
    };

    statusEl.textContent = 'Registrando revisão...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('documentos_revisoes', [revRow]);
        await supabaseUpsert('documentos_controle', [docRow]);
        allDocumentosRevisoes.push(revRow);
        const idx = allDocumentosControle.findIndex(d => d.id === documentoId);
        if (idx >= 0) allDocumentosControle[idx] = docRow;

        document.getElementById('docForm_revisaoAtualLabel').textContent = revisao;
        document.getElementById('revForm_revisao').value = '';
        document.getElementById('revForm_descricao').value = '';
        document.getElementById('revForm_responsavel').value = '';
        renderHistoricoRevisoes(documentoId);
        renderListaMestraDocumentos();
        statusEl.textContent = '✅ Nova revisão registrada.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao registrar revisão:', err);
        statusEl.textContent = '❌ Falha ao registrar revisão: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function popularFiltroDocumentosEmissoes() {
    const sel = document.getElementById('emissoesFiltroDocumento');
    if (!sel) return;
    const valorAtual = sel.value;
    sel.innerHTML = '<option value="">Todos os documentos</option>' +
        allDocumentosControle.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
            .map(d => `<option value="${escapeHTML(d.id)}">${escapeHTML(d.nome)}</option>`).join('');
    if (valorAtual) sel.value = valorAtual;
}

function renderRegistroEmissoes() {
    const container = document.getElementById('documentosEmissoesLista');
    if (!container) return;
    const filtro = document.getElementById('emissoesFiltroDocumento')?.value || '';
    const docsPorId = new Map(allDocumentosControle.map(d => [d.id, d]));

    let linhas = allDocumentosEmissoes.slice().sort((a, b) => (b.gerado_em || '').localeCompare(a.gerado_em || ''));
    if (filtro) linhas = linhas.filter(e => e.documento_id === filtro);

    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma emissão registrada ainda.</div>';
        return;
    }
    container.innerHTML = linhas.map(e => {
        const doc = docsPorId.get(e.documento_id);
        const desatualizado = doc && doc.revisao_atual && e.revisao_no_momento && doc.revisao_atual !== e.revisao_no_momento;
        return `<div class="db-list-item">
            <div class="db-list-item-title">${desatualizado ? '⚠️ ' : ''}${escapeHTML(doc?.nome || e.documento_id)}${e.referencia ? ' — ' + escapeHTML(e.referencia) : ''}</div>
            <div class="db-list-item-sub">${e.gerado_em ? new Date(e.gerado_em).toLocaleString('pt-BR') : ''} — Revisão usada: ${escapeHTML(e.revisao_no_momento || '—')}${desatualizado ? ` — revisão atual do documento: ${escapeHTML(doc.revisao_atual)}` : ''}</div>
        </div>`;
    }).join('');
}

// ---- Helpers reutilizados pelos geradores (gerarRegistroTreinamento, gerarCertificadoIndividual,
// gerarKitIntegracao, abrirFichaEpiColaborador, gerarAtaCipa) ----

// Garante que a lista mestra esteja carregada mesmo se o usuário nunca abriu a página
// "Documentos" - mesmo padrão de lazy-load-if-empty já usado em loadCipaData pra allAcidentes.
async function garantirDocumentosControleCarregados() {
    if (allDocumentosControle.length === 0) {
        allDocumentosControle = await supabaseFetch('documentos_controle', '?select=*');
    }
}

function codigoRevisaoDocumento(id) {
    const d = allDocumentosControle.find(x => x.id === id);
    if (!d || !d.codigo) return '';
    return d.revisao_atual ? `${d.codigo} ${d.revisao_atual}` : d.codigo;
}

// Fire-and-forget: não deve travar a geração do PDF se a rede falhar.
function registrarEmissaoDocumento(documentoId, referencia) {
    const d = allDocumentosControle.find(x => x.id === documentoId);
    const row = {
        id: `EMISSAO_${documentoId}_${Date.now()}`,
        documento_id: documentoId,
        revisao_no_momento: d?.revisao_atual || null,
        referencia: referencia || null
    };
    allDocumentosEmissoes.push(row);
    supabaseUpsert('documentos_emissoes', [row]).catch(err => {
        console.error('Erro ao registrar emissão do documento:', err);
    });
}

// ============================================
// AVALIAÇÃO PSICOSSOCIAL (NR-01 / COPSOQ II) - dado agregado/anônimo por "aplicação"
// (rodada do questionário). Sem vínculo com colaboradores_efetivo por natureza do
// instrumento (não existe resposta individual rastreável). Seed inicial (aplicação
// 2026-06, 17/06 a 17/09/2026) importado direto do PGR real (seção 27) - 26 escalas +
// 41 perguntas, números conferidos um a um contra o texto extraído do PDF.
// ============================================

let allAvaliacoesPsicossociais = [];
let allEscalasPsicossociais = [];
let allPerguntasPsicossociais = [];
let psicossocialLoaded = false;
let psicossocialAplicacaoAtivaId = null;
let psicoPerguntasAbertas = false;
let chartPsicoEscalas = null;

let PSICO_LIMIAR_RISCO_CRITICO = 40; // % - limiar só de UI (não vem do PGR/instrumento) - valor
// padrão; pode ser sobrescrito por configuracoes_sistema (ver carregarConfiguracoesSistema)
let PSICO_LIMIAR_FAVORAVEL_FORTE = 90; // % - mesma observação acima

const PSICO_ESCALAS_PADRAO = [
    'Apoio social de superiores', 'Auto-eficácia', 'Comportamentos ofensivos', 'Compromisso face ao local de trabalho',
    'Comunidade social no trabalho', 'Confiança vertical', 'Conflito trabalho/vida', 'Estresse', 'Exigências cognitivas',
    'Exigências emocionais', 'Exigências quantitativas', 'Extenuação', 'Influência no trabalho', 'Insegurança laboral',
    'Justiça e respeito', 'Possibilidades de desenvolvimento', 'Previsibilidade', 'Problemas em dormir',
    'Qualidade da liderança', 'Recompensas', 'Ritmo de trabalho', 'Satisfação no trabalho', 'Saúde',
    'Significado do trabalho', 'Sintomas depressivos', 'Transparência do papel laboral desempenhado'
];

function slugPsico(nome) {
    return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function fmtPct(v) {
    return v == null || v === '' ? '—' : `${Number(v).toFixed(1)}%`;
}

function formatarPeriodoPsicossocial(a) {
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '?';
    return `${fmt(a.periodo_inicio)} a ${fmt(a.periodo_fim)}`;
}

async function loadPsicossocialData() {
    try {
        const [aplicacoes, escalas, perguntas] = await Promise.all([
            supabaseFetch('avaliacoes_psicossociais', '?select=*'),
            supabaseFetch('avaliacoes_psicossociais_escalas', '?select=*'),
            supabaseFetch('avaliacoes_psicossociais_perguntas', '?select=*')
        ]);
        allAvaliacoesPsicossociais = aplicacoes;
        allEscalasPsicossociais = escalas;
        allPerguntasPsicossociais = perguntas;
        if (!psicossocialAplicacaoAtivaId || !aplicacoes.some(a => a.id === psicossocialAplicacaoAtivaId)) {
            const ordenadas = aplicacoes.slice().sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
            psicossocialAplicacaoAtivaId = ordenadas[0]?.id || null;
        }
        renderPsicossocialPanel();
        renderListaAplicacoesPsicossociais();
    } catch (err) {
        console.error('Erro ao carregar avaliação psicossocial:', err);
    }
}

function showPsicossocialSubtab(tab) {
    ['visao', 'gerenciar'].forEach(t => {
        const content = document.getElementById('psicossocialSubtab-' + t);
        const btn = document.getElementById('psicossocialSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderPsicossocialPanel();
    if (tab === 'gerenciar') { fecharFormAplicacaoPsicossocial(); renderListaAplicacoesPsicossociais(); }
}

function onPsicossocialAplicacaoChange(id) {
    psicossocialAplicacaoAtivaId = id;
    renderPsicossocialPanel();
}

function renderPsicossocialPanel() {
    const seletorWrap = document.getElementById('psicossocialSeletorWrap');
    const seletor = document.getElementById('psicossocialSeletorAplicacao');
    if (!seletorWrap || !seletor) return;

    if (allAvaliacoesPsicossociais.length > 1) {
        seletorWrap.style.display = '';
        const ordenadas = allAvaliacoesPsicossociais.slice().sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
        seletor.innerHTML = ordenadas.map(a => `<option value="${escapeHTML(a.id)}" ${a.id === psicossocialAplicacaoAtivaId ? 'selected' : ''}>${formatarPeriodoPsicossocial(a)}</option>`).join('');
    } else {
        seletorWrap.style.display = 'none';
    }

    const aplicacao = allAvaliacoesPsicossociais.find(a => a.id === psicossocialAplicacaoAtivaId);
    const conteudo = document.getElementById('psicossocialConteudo');
    if (!aplicacao) {
        if (conteudo) conteudo.innerHTML = '<div class="db-list-empty">Nenhuma aplicação do questionário cadastrada ainda.</div>';
        return;
    }

    const escalas = allEscalasPsicossociais.filter(e => e.aplicacao_id === psicossocialAplicacaoAtivaId);
    const perguntas = allPerguntasPsicossociais.filter(p => p.aplicacao_id === psicossocialAplicacaoAtivaId).sort((a, b) => a.numero - b.numero);

    document.getElementById('kpiPsicoParticipacao').textContent = fmtPct(aplicacao.taxa_participacao);
    const criticas = escalas.filter(e => Number(e.pct_risco) >= PSICO_LIMIAR_RISCO_CRITICO).sort((a, b) => Number(b.pct_risco) - Number(a.pct_risco));
    const atencao = escalas.filter(e => Number(e.pct_risco) >= 20 && Number(e.pct_risco) < PSICO_LIMIAR_RISCO_CRITICO);
    const fortes = escalas.filter(e => Number(e.pct_favoravel) >= PSICO_LIMIAR_FAVORAVEL_FORTE).sort((a, b) => Number(b.pct_favoravel) - Number(a.pct_favoravel));
    document.getElementById('kpiPsicoCriticas').textContent = criticas.length;
    document.getElementById('kpiPsicoAtencao').textContent = atencao.length;
    document.getElementById('kpiPsicoFortes').textContent = fortes.length;

    renderPsicoCards('psicoCardsCriticas', criticas, 'risco');
    renderPsicoCards('psicoCardsFortes', fortes, 'favoravel');

    const resumoEl = document.getElementById('psicossocialResumo');
    if (aplicacao.resumo_analise) {
        resumoEl.style.display = 'block';
        resumoEl.textContent = aplicacao.resumo_analise;
    } else {
        resumoEl.style.display = 'none';
    }

    renderChartEscalasPsicossociais(escalas);
    renderListaPerguntasPsicossociais(perguntas);
}

function renderPsicoCards(containerId, lista, campo) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (lista.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma escala nessa categoria.</div>';
        return;
    }
    container.innerHTML = lista.map(e => `
        <div class="db-list-item ${campo === 'risco' ? 'db-item-danger' : ''}">
            <div class="db-list-item-title">${escapeHTML(e.escala)}</div>
            <div class="db-list-item-sub">Favorável ${fmtPct(e.pct_favoravel)} · Intermediário ${fmtPct(e.pct_intermediario)} · Risco ${fmtPct(e.pct_risco)}</div>
        </div>
    `).join('');
}

function renderChartEscalasPsicossociais(escalas) {
    const canvasId = 'chartPsicoEscalas';
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const ordenadas = escalas.slice().sort((a, b) => Number(b.pct_risco) - Number(a.pct_risco));
    const labels = ordenadas.map(e => wrapChartLabel(e.escala));
    ajustarAlturaBarrasHorizontais(canvasId, labels);

    if (chartPsicoEscalas) chartPsicoEscalas.destroy();
    chartPsicoEscalas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Situação Favorável', data: ordenadas.map(e => Number(e.pct_favoravel)), backgroundColor: '#10b981' },
                { label: 'Intermediário', data: ordenadas.map(e => Number(e.pct_intermediario)), backgroundColor: '#f59e0b' },
                { label: 'Risco para a Saúde', data: ordenadas.map(e => Number(e.pct_risco)), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, min: 0, max: 100, ticks: { callback: v => v + '%' } },
                y: { stacked: true, ticks: { autoSkip: false } }
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(1)}%` } }
            }
        }
    });
}

function togglePerguntasPsicossociais() {
    psicoPerguntasAbertas = !psicoPerguntasAbertas;
    document.getElementById('psicoPerguntasLista').style.display = psicoPerguntasAbertas ? 'block' : 'none';
    document.getElementById('btnTogglePerguntasPsico').textContent = psicoPerguntasAbertas ? '▲ Ocultar perguntas detalhadas' : '▼ Ver as 41 perguntas detalhadas';
}

function renderListaPerguntasPsicossociais(perguntas) {
    const container = document.getElementById('psicoPerguntasLista');
    if (!container) return;
    if (perguntas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Sem perguntas detalhadas cadastradas para esta aplicação.</div>';
        return;
    }
    container.innerHTML = perguntas.map(p => `
        <div class="db-list-item" style="font-size:12.5px;">
            <div class="db-list-item-title">${p.numero}. ${escapeHTML(p.pergunta)}</div>
            <div class="db-list-item-sub">${Object.entries(p.opcoes || {}).map(([k, v]) => `${escapeHTML(k)}: ${fmtPct(v)}`).join(' · ')}</div>
        </div>
    `).join('');
}

// ---- Gerenciar Aplicações (CRUD - segue a convenção do projeto de sempre oferecer
// editar, não só criar/importar) ----

function renderListaAplicacoesPsicossociais() {
    const container = document.getElementById('psicoAplicacoesLista');
    if (!container) return;
    if (allAvaliacoesPsicossociais.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma aplicação cadastrada.</div>';
        return;
    }
    const ordenadas = allAvaliacoesPsicossociais.slice().sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
    container.innerHTML = ordenadas.map(a => {
        const nEscalas = allEscalasPsicossociais.filter(e => e.aplicacao_id === a.id).length;
        const nPerguntas = allPerguntasPsicossociais.filter(p => p.aplicacao_id === a.id).length;
        return `
        <div class="db-list-item" style="cursor:pointer;" onclick="abrirFormAplicacaoPsicossocial('${escapeHTML(a.id)}')">
            <div class="db-list-item-title">${formatarPeriodoPsicossocial(a)}</div>
            <div class="db-list-item-sub">Participação ${fmtPct(a.taxa_participacao)} · ${nEscalas} escalas · ${nPerguntas} perguntas</div>
        </div>`;
    }).join('');
}

function abrirFormAplicacaoPsicossocial(id) {
    const form = document.getElementById('psicoAplicacaoFormCard');
    document.getElementById('psicoAplicacaoFormStatus').textContent = '';
    form.dataset.id = id || '';

    const aplicacao = id ? allAvaliacoesPsicossociais.find(a => a.id === id) : null;
    document.getElementById('psicoFormTitle').textContent = aplicacao ? `✏️ Editar Aplicação (${formatarPeriodoPsicossocial(aplicacao)})` : '+ Nova Aplicação';
    document.getElementById('psicoFormPeriodoInicio').value = aplicacao?.periodo_inicio || '';
    document.getElementById('psicoFormPeriodoFim').value = aplicacao?.periodo_fim || '';
    document.getElementById('psicoFormTaxaParticipacao').value = aplicacao?.taxa_participacao ?? '';
    document.getElementById('psicoFormResumo').value = aplicacao?.resumo_analise || '';

    const escalasExistentes = aplicacao ? allEscalasPsicossociais.filter(e => e.aplicacao_id === id) : [];
    const nomesEscalas = escalasExistentes.length > 0 ? escalasExistentes.map(e => e.escala) : PSICO_ESCALAS_PADRAO;
    document.getElementById('psicoFormEscalasWrap').innerHTML = nomesEscalas.map(nome => {
        const existente = escalasExistentes.find(e => e.escala === nome);
        const slug = slugPsico(nome);
        return `
        <div style="display:grid; grid-template-columns: 1.6fr 0.7fr 0.7fr 0.7fr; gap:8px; align-items:center; padding:6px 8px; border-radius:6px; background:var(--bg); font-size:12.5px;">
            <div>${escapeHTML(nome)}</div>
            <input type="number" step="0.1" min="0" max="100" placeholder="Favorável %" value="${existente?.pct_favoravel ?? ''}" id="psicoEscala_${slug}_fav" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">
            <input type="number" step="0.1" min="0" max="100" placeholder="Intermed. %" value="${existente?.pct_intermediario ?? ''}" id="psicoEscala_${slug}_int" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">
            <input type="number" step="0.1" min="0" max="100" placeholder="Risco %" value="${existente?.pct_risco ?? ''}" id="psicoEscala_${slug}_risco" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">
        </div>`;
    }).join('');
    form.dataset.escalaNomes = JSON.stringify(nomesEscalas);

    // As 41 perguntas são um instrumento fixo (COPSOQ II Versão Curta) - texto e opções
    // de resposta não mudam entre rodadas, só os %. Uma aplicação nova reaproveita as
    // perguntas/opções da aplicação mais recente já cadastrada como modelo, com os
    // valores em branco pra preencher - evita ter que digitar 41 perguntas do zero.
    let perguntasTemplate = aplicacao ? allPerguntasPsicossociais.filter(p => p.aplicacao_id === id).sort((a, b) => a.numero - b.numero) : [];
    if (perguntasTemplate.length === 0) {
        const outraAplicacao = allAvaliacoesPsicossociais.filter(a => a.id !== id).sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''))[0];
        if (outraAplicacao) {
            perguntasTemplate = allPerguntasPsicossociais.filter(p => p.aplicacao_id === outraAplicacao.id).sort((a, b) => a.numero - b.numero)
                .map(p => ({ numero: p.numero, pergunta: p.pergunta, opcoes: Object.fromEntries(Object.keys(p.opcoes || {}).map(k => [k, ''])) }));
        }
    }
    document.getElementById('psicoFormPerguntasWrap').innerHTML = perguntasTemplate.length === 0
        ? '<div class="db-list-empty">Sem modelo de perguntas disponível ainda (nenhuma aplicação anterior cadastrada). Salve a aplicação com as escalas primeiro.</div>'
        : perguntasTemplate.map(p => `
        <div style="padding:8px; border-radius:6px; background:var(--bg); font-size:12.5px; margin-bottom:6px;">
            <div style="font-weight:600; margin-bottom:4px;">${p.numero}. ${escapeHTML(p.pergunta)}</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${Object.entries(p.opcoes || {}).map(([k, v]) => `
                    <label style="display:flex; align-items:center; gap:4px;">${escapeHTML(k)}
                        <input type="number" step="0.1" min="0" max="100" value="${v === '' || v == null ? '' : v}" data-pergunta="${p.numero}" data-opcao="${escapeHTML(k)}" class="psico-pergunta-opcao" style="width:60px; padding:4px 6px; border:1px solid var(--border); border-radius:4px;">
                    </label>
                `).join('')}
            </div>
        </div>`).join('');

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharFormAplicacaoPsicossocial() {
    const form = document.getElementById('psicoAplicacaoFormCard');
    if (form) form.style.display = 'none';
}

async function salvarAplicacaoPsicossocial() {
    const form = document.getElementById('psicoAplicacaoFormCard');
    const idExistente = form.dataset.id;
    const periodoInicio = document.getElementById('psicoFormPeriodoInicio').value;
    const periodoFim = document.getElementById('psicoFormPeriodoFim').value;
    const taxa = document.getElementById('psicoFormTaxaParticipacao').value;
    const resumo = document.getElementById('psicoFormResumo').value;
    const statusEl = document.getElementById('psicoAplicacaoFormStatus');

    if (!periodoInicio || !periodoFim) {
        statusEl.textContent = 'Informe o período (início e fim).';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const id = idExistente || periodoInicio.slice(0, 7);

    try {
        await supabaseUpsert('avaliacoes_psicossociais', [{
            id, periodo_inicio: periodoInicio, periodo_fim: periodoFim,
            taxa_participacao: taxa === '' ? null : parseFloat(taxa),
            resumo_analise: resumo || null
        }]);

        const nomesEscalas = JSON.parse(form.dataset.escalaNomes || '[]');
        const escalaRows = nomesEscalas.map(nome => {
            const slug = slugPsico(nome);
            const fav = document.getElementById(`psicoEscala_${slug}_fav`)?.value;
            const int = document.getElementById(`psicoEscala_${slug}_int`)?.value;
            const risco = document.getElementById(`psicoEscala_${slug}_risco`)?.value;
            return {
                id: `${id}_${slug}`, aplicacao_id: id, escala: nome,
                pct_favoravel: fav === '' || fav == null ? null : parseFloat(fav),
                pct_intermediario: int === '' || int == null ? null : parseFloat(int),
                pct_risco: risco === '' || risco == null ? null : parseFloat(risco)
            };
        });
        if (escalaRows.length > 0) await supabaseUpsert('avaliacoes_psicossociais_escalas', escalaRows);

        const opcaoInputs = form.querySelectorAll('.psico-pergunta-opcao');
        if (opcaoInputs.length > 0) {
            const porPergunta = {};
            opcaoInputs.forEach(inp => {
                const numero = inp.dataset.pergunta;
                const opcao = inp.dataset.opcao;
                if (!porPergunta[numero]) porPergunta[numero] = {};
                porPergunta[numero][opcao] = parseFloat(inp.value) || 0;
            });
            const perguntaRows = Object.entries(porPergunta).map(([numero, opcoes]) => {
                let original = allPerguntasPsicossociais.find(p => p.aplicacao_id === id && String(p.numero) === numero);
                if (!original) original = allPerguntasPsicossociais.find(p => String(p.numero) === numero);
                return { id: `${id}_q${numero}`, aplicacao_id: id, numero: parseInt(numero, 10), pergunta: original?.pergunta || '', opcoes };
            });
            if (perguntaRows.length > 0) await supabaseUpsert('avaliacoes_psicossociais_perguntas', perguntaRows);
        }

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        await loadPsicossocialData();
        psicossocialAplicacaoAtivaId = id;
        renderPsicossocialPanel();
    } catch (err) {
        console.error('Erro ao salvar aplicação psicossocial:', err);
        statusEl.textContent = 'Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirAplicacaoPsicossocial() {
    const form = document.getElementById('psicoAplicacaoFormCard');
    const id = form.dataset.id;
    if (!id) { alert('Selecione uma aplicação já salva para excluir.'); return; }
    if (!confirm('Excluir esta aplicação e todas as escalas/perguntas associadas? Essa ação não pode ser desfeita.')) return;
    try {
        await supabaseDelete('avaliacoes_psicossociais', id);
        fecharFormAplicacaoPsicossocial();
        await loadPsicossocialData();
    } catch (err) {
        console.error('Erro ao excluir aplicação psicossocial:', err);
        alert('Falha ao excluir: ' + err.message);
    }
}

// ============================================
// CONFIGURAÇÕES GERAIS DO SISTEMA (2026-09-21) - itens que antes ficavam fixos no
// código (EMPRESA_INFO, CRONOGRAMA_DEFAULTS_SESSAO, ACIDENTES_MES_INICIO_CONTRATO,
// PSICO_LIMIAR_*, RESIDUO_KG_POR_*, REFRESH_INTERVAL_MS, LOGO_COP_BASE64) e passam a
// vir do banco (tabela configuracoes_sistema), editáveis na tela "Configurações". Se a
// tabela ainda não tiver a linha de um item (banco novo, ou item nunca editado), o valor
// fixo que já existia no código continua valendo como padrão - por isso os objetos/
// constantes originais continuam existindo normalmente, só são sobrescritos quando há
// algo salvo. Módulo "Importar/Exportar Planilhas" (antigos cards de import/export que
// moravam dentro de "Configurações") não precisa de nada disso - são só as mesmas
// funções de sempre (importarTreinamentosCSV etc.), com card/página nova no menu.
// ============================================
let configuracoesSistemaCarregadas = false;

async function carregarConfiguracoesSistema() {
    try {
        const linhas = await supabaseFetch('configuracoes_sistema', '?select=*');
        const porId = {};
        linhas.forEach(l => { porId[l.id] = l.valor; });

        if (porId.empresa_info) Object.assign(EMPRESA_INFO, porId.empresa_info);
        if (porId.cronograma_defaults) Object.assign(CRONOGRAMA_DEFAULTS_SESSAO, porId.cronograma_defaults);
        if (porId.contrato_inicio) Object.assign(ACIDENTES_MES_INICIO_CONTRATO, porId.contrato_inicio);
        if (porId.psico_limiares) {
            if (typeof porId.psico_limiares.risco_critico === 'number') PSICO_LIMIAR_RISCO_CRITICO = porId.psico_limiares.risco_critico;
            if (typeof porId.psico_limiares.favoravel_forte === 'number') PSICO_LIMIAR_FAVORAVEL_FORTE = porId.psico_limiares.favoravel_forte;
        }
        if (porId.data_implantacao_psicossocial) {
            DATA_IMPLANTACAO_PSICOSSOCIAL = typeof porId.data_implantacao_psicossocial === 'string'
                ? porId.data_implantacao_psicossocial
                : (porId.data_implantacao_psicossocial.data || '2026-07-01');
        }
        if (porId.psico_data_mutirao) {
            const dtMut = typeof porId.psico_data_mutirao === 'string' ? porId.psico_data_mutirao : (porId.psico_data_mutirao.data || '2026-10-06');
            localStorage.setItem('psico_data_mutirao', dtMut);
            localStorage.setItem('exame_data_mutirao_psicossocial', dtMut);
        }
        if (porId.residuos_fatores) {
            if (typeof porId.residuos_fatores.kg_por_quentinha === 'number') RESIDUO_KG_POR_QUENTINHA = porId.residuos_fatores.kg_por_quentinha;
            if (typeof porId.residuos_fatores.kg_por_copo === 'number') RESIDUO_KG_POR_COPO = porId.residuos_fatores.kg_por_copo;
            if (typeof porId.residuos_fatores.kg_por_epi === 'number') RESIDUO_KG_POR_EPI = porId.residuos_fatores.kg_por_epi;
        }
        if (typeof porId.painel_refresh_minutos === 'number' && porId.painel_refresh_minutos > 0) {
            REFRESH_INTERVAL_MS = porId.painel_refresh_minutos * 60 * 1000;
        }
        if (typeof porId.logo_base64 === 'string' && porId.logo_base64.indexOf('data:image/') === 0) {
            LOGO_COP_BASE64 = porId.logo_base64;
        }
        if (porId.brigada_parametros) Object.assign(BRIGADA_PARAMETROS, porId.brigada_parametros);

        configuracoesSistemaCarregadas = true;
        iniciarAutoRefresh(); // reaplica o intervalo (pode ter mudado desde a última visita)
        if (document.getElementById('page-config')?.classList.contains('active')) renderConfigGeral();
        if (document.getElementById('page-brigada')?.classList.contains('active') && brigadaLoaded) renderBrigadaDimensionamento();
    } catch (e) {
        console.error('Erro ao carregar configurações do sistema (mantendo os valores padrão do código):', e);
    }
}

function renderConfigGeral() {
    document.getElementById('cfgEmpresaRazaoSocial').value = EMPRESA_INFO.razaoSocial || '';
    document.getElementById('cfgEmpresaCnpj').value = EMPRESA_INFO.cnpj || '';
    document.getElementById('cfgEmpresaGrauRisco').value = EMPRESA_INFO.grauRisco || '';
    document.getElementById('cfgEmpresaCnae').value = EMPRESA_INFO.cnaePrincipal || '';
    document.getElementById('cfgEmpresaNatureza').value = EMPRESA_INFO.naturezaJuridica || '';

    document.getElementById('cfgLogoPreview').src = LOGO_COP_BASE64;

    document.getElementById('cfgInstrutorNome').value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_nome || '';
    document.getElementById('cfgInstrutorQualificacao').value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_qualificacao || '';
    document.getElementById('cfgInstrutorRegistro').value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_registro || '';
    document.getElementById('cfgRespTecnicoNome').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome || '';
    document.getElementById('cfgRespTecnicoQualificacao').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_qualificacao || '';
    document.getElementById('cfgRespTecnicoRegistro').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_registro || '';

    const selMes = document.getElementById('cfgContratoMes');
    if (selMes && selMes.options.length === 0) {
        selMes.innerHTML = NOMES_MESES.map((nome, i) => `<option value="${i}">${nome}</option>`).join('');
    }
    selMes.value = String(ACIDENTES_MES_INICIO_CONTRATO.mes);
    document.getElementById('cfgContratoAno').value = ACIDENTES_MES_INICIO_CONTRATO.ano;

    document.getElementById('cfgPsicoCritico').value = PSICO_LIMIAR_RISCO_CRITICO;
    document.getElementById('cfgPsicoFavoravel').value = PSICO_LIMIAR_FAVORAVEL_FORTE;
    const inputDtImplantacao = document.getElementById('cfgPsicoDataImplantacao');
    if (inputDtImplantacao) inputDtImplantacao.value = DATA_IMPLANTACAO_PSICOSSOCIAL;

    document.getElementById('cfgResiduoQuentinha').value = RESIDUO_KG_POR_QUENTINHA;
    document.getElementById('cfgResiduoCopo').value = RESIDUO_KG_POR_COPO;
    document.getElementById('cfgResiduoEpi').value = RESIDUO_KG_POR_EPI;

    document.getElementById('cfgRefreshMinutos').value = Math.round(REFRESH_INTERVAL_MS / 60000);
}

async function salvarConfigEmpresa() {
    const statusEl = document.getElementById('cfgEmpresaStatus');
    const valor = {
        razaoSocial: document.getElementById('cfgEmpresaRazaoSocial').value.trim(),
        cnpj: document.getElementById('cfgEmpresaCnpj').value.trim(),
        cnaePrincipal: document.getElementById('cfgEmpresaCnae').value.trim(),
        naturezaJuridica: document.getElementById('cfgEmpresaNatureza').value.trim(),
        grauRisco: document.getElementById('cfgEmpresaGrauRisco').value.trim()
    };
    if (!valor.razaoSocial || !valor.cnpj) {
        statusEl.textContent = '❌ Preencha ao menos Razão Social e CNPJ.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'empresa_info', valor, descricao: 'Dados da empresa usados nos documentos gerados pelo sistema.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        Object.assign(EMPRESA_INFO, valor);
        statusEl.textContent = '✅ Salvo. Já vale a partir de agora.';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar dados da empresa:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigLogo() {
    const statusEl = document.getElementById('cfgLogoStatus');
    const input = document.getElementById('cfgLogoFileInput');
    const arquivo = input.files && input.files[0];
    if (!arquivo) { statusEl.textContent = '❌ Escolha uma imagem primeiro.'; statusEl.style.color = 'var(--danger)'; return; }
    if (arquivo.size > 1.5 * 1024 * 1024) { statusEl.textContent = '❌ Imagem muito grande (máx. 1,5 MB). Use uma versão menor.'; statusEl.style.color = 'var(--danger)'; return; }
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(arquivo);
        });
        await supabaseUpsert('configuracoes_sistema', [{ id: 'logo_base64', valor: base64, descricao: 'Logo da empresa usada nos documentos gerados pelo sistema.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        LOGO_COP_BASE64 = base64;
        document.getElementById('cfgLogoPreview').src = LOGO_COP_BASE64;
        input.value = '';
        statusEl.textContent = '✅ Logo atualizada. Já vale para os próximos documentos gerados.';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar logo:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigCronograma() {
    const statusEl = document.getElementById('cfgCronogramaStatus');
    const valor = {
        instrutor_nome: document.getElementById('cfgInstrutorNome').value.trim(),
        instrutor_qualificacao: document.getElementById('cfgInstrutorQualificacao').value.trim(),
        instrutor_registro: document.getElementById('cfgInstrutorRegistro').value.trim(),
        responsavel_tecnico_nome: document.getElementById('cfgRespTecnicoNome').value.trim(),
        responsavel_tecnico_qualificacao: document.getElementById('cfgRespTecnicoQualificacao').value.trim(),
        responsavel_tecnico_registro: document.getElementById('cfgRespTecnicoRegistro').value.trim()
    };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'cronograma_defaults', valor, descricao: 'Instrutor e responsável técnico padrão do cronograma de treinamentos.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        Object.assign(CRONOGRAMA_DEFAULTS_SESSAO, valor);
        statusEl.textContent = '✅ Salvo. Já vale para os próximos treinamentos lançados.';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar padrão de treinamentos:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigContrato() {
    const statusEl = document.getElementById('cfgContratoStatus');
    const mes = parseInt(document.getElementById('cfgContratoMes').value, 10);
    const ano = parseInt(document.getElementById('cfgContratoAno').value, 10);
    if (isNaN(mes) || isNaN(ano) || ano < 2000 || ano > 2100) {
        statusEl.textContent = '❌ Confira o mês e o ano informados.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const valor = { ano, mes };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'contrato_inicio', valor, descricao: 'Mês/ano de início do contrato (mês 0-indexado) - usado no cálculo do índice de acidentabilidade.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        Object.assign(ACIDENTES_MES_INICIO_CONTRATO, valor);
        statusEl.textContent = '✅ Salvo.';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar início do contrato:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigPsico() {
    const statusEl = document.getElementById('cfgPsicoStatus');
    const critico = parseFloat(document.getElementById('cfgPsicoCritico').value);
    const favoravel = parseFloat(document.getElementById('cfgPsicoFavoravel').value);
    const dtImplantacao = document.getElementById('cfgPsicoDataImplantacao')?.value || DATA_IMPLANTACAO_PSICOSSOCIAL;

    if (isNaN(critico) || isNaN(favoravel) || critico < 0 || critico > 100 || favoravel < 0 || favoravel > 100) {
        statusEl.textContent = '❌ Informe valores entre 0 e 100 para os limiares.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const valor = { risco_critico: critico, favoravel_forte: favoravel };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [
            { id: 'psico_limiares', valor, descricao: 'Limiares (%) de destaque visual da Avaliação Psicossocial (COPSOQ II).', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' },
            { id: 'data_implantacao_psicossocial', valor: dtImplantacao, descricao: 'Marco temporal inicial oficial do programa de avaliação psicossocial.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }
        ]);
        PSICO_LIMIAR_RISCO_CRITICO = critico;
        PSICO_LIMIAR_FAVORAVEL_FORTE = favoravel;
        DATA_IMPLANTACAO_PSICOSSOCIAL = dtImplantacao;
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        if (typeof renderRecomendacaoPsicossocial === 'function') renderRecomendacaoPsicossocial();
    } catch (e) {
        console.error('Erro ao salvar configurações do Psicossocial:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigResiduos() {
    const statusEl = document.getElementById('cfgResiduosStatus');
    const quentinha = parseFloat(document.getElementById('cfgResiduoQuentinha').value);
    const copo = parseFloat(document.getElementById('cfgResiduoCopo').value);
    const epi = parseFloat(document.getElementById('cfgResiduoEpi').value);
    if ([quentinha, copo, epi].some(v => isNaN(v) || v < 0)) {
        statusEl.textContent = '❌ Informe valores numéricos válidos (maiores ou iguais a zero).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const valor = { kg_por_quentinha: quentinha, kg_por_copo: copo, kg_por_epi: epi };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'residuos_fatores', valor, descricao: 'Fatores de conversão (kg) usados na estimativa de geração de resíduos.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        RESIDUO_KG_POR_QUENTINHA = quentinha;
        RESIDUO_KG_POR_COPO = copo;
        RESIDUO_KG_POR_EPI = epi;
        statusEl.textContent = '✅ Salvo.';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar fatores de resíduos:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarConfigRefresh() {
    const statusEl = document.getElementById('cfgRefreshStatus');
    const minutos = parseInt(document.getElementById('cfgRefreshMinutos').value, 10);
    if (isNaN(minutos) || minutos < 1) {
        statusEl.textContent = '❌ Informe um número de minutos válido (mínimo 1).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'painel_refresh_minutos', valor: minutos, descricao: 'Intervalo (minutos) de atualização automática do painel.', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        REFRESH_INTERVAL_MS = minutos * 60 * 1000;
        iniciarAutoRefresh();
        statusEl.textContent = '✅ Salvo. O painel já passa a atualizar a cada ' + minutos + ' minuto(s).';
        statusEl.style.color = 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar intervalo de atualização:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// BRIGADA DE INCÊNDIO (2026-09-21) - módulo novo: Dimensionamento, Organograma e
// Controle de Treinados, com base na NR-23 (Proteção Contra Incêndios, Portaria MTP nº
// 2.769/2022) e na ABNT NBR 14276 (Brigada de Incêndio). AVISO IMPORTANTE pra quem for
// mexer aqui depois: o texto oficial da NBR 14276:2020 é uma norma paga e não pôde ser
// consultado na íntegra nesta entrega - os parâmetros de dimensionamento abaixo
// (BRIGADA_PARAMETROS, espelhado em configuracoes_sistema/brigada_parametros) são
// valores de referência SIMPLIFICADOS (percentual do efetivo + mínimo de pessoas),
// editáveis na própria tela de Dimensionamento, pro João calibrar contra a norma vigente
// aplicável (NBR 14276 e/ou Instrução Técnica do Corpo de Bombeiros Militar de
// Pernambuco - CBMPE/COSCIP - já que o canteiro é obra linear a céu aberto, não
// edificação, e a aplicabilidade exata de uma IT de bombeiro precisa ser julgada por ele
// como responsável técnico). Treinamento/Controle de Treinados NÃO cria nenhuma tabela
// nova: reaproveita 100% o treinamento id='15' ("NR 23 - PROTEÇÃO CONTRA INCÊNDIO
// (BRIGADA DE EMERGÊNCIA)") já cadastrado em treinamentos_catalogo e a mesma
// treinamentos_status que o módulo Treinamentos usa - lançar ou renovar uma sessão de
// treinamento continua sendo feito em Treinamentos > Kits e Documentos; este módulo só
// oferece um atalho (abrirProgramacaoTreinamentoBrigada) que já leva pra lá com a
// equipe certa marcada.
// ============================================

async function loadBrigadaData() {
    const tarefas = [];
    if (!efetivoLoaded) { efetivoLoaded = true; tarefas.push(loadEfetivoData()); }
    if (!treinamentosLoaded) { treinamentosLoaded = true; tarefas.push(loadTreinamentosData()); }
    if (tarefas.length) await Promise.all(tarefas);
    try {
        allBrigadaMembros = await supabaseFetch('brigada_membros', '?select=*');
    } catch (err) {
        console.error('Erro ao carregar organograma da Brigada de Incêndio:', err);
        allBrigadaMembros = [];
    }
    showBrigadaSubtab('dimensionamento');
}

function showBrigadaSubtab(tab) {
    ['dimensionamento', 'organograma', 'treinamento'].forEach(t => {
        const content = document.getElementById('brigadaSubtab-' + t);
        const btn = document.getElementById('brigadaSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'dimensionamento') renderBrigadaDimensionamento();
    if (tab === 'organograma') { fecharFormBrigadaMembro(); renderBrigadaMembrosLista(); renderBrigadaOrganograma(); }
    if (tab === 'treinamento') { fecharFormTreinamentoBrigada(); renderBrigadaControleTreinados(); }
}

// ---- Dimensionamento ----

function brigadistasDesignadosAtivos() {
    return allBrigadaMembros.filter(m => m.ativo);
}

function calcularBrigadistasNecessarios(efetivoAtivo) {
    const percentual = Number(BRIGADA_PARAMETROS.percentual_efetivo) || 0;
    const minimo = Number(BRIGADA_PARAMETROS.minimo_brigadistas) || 0;
    return Math.max(minimo, Math.ceil(efetivoAtivo * percentual / 100));
}

function renderBrigadaDimensionamento() {
    if (!document.getElementById('kpiBrigadaEfetivoAtivo')) return;
    const efetivoAtivo = allEfetivo.filter(colaboradorEstaAtivo).length;
    const necessarios = calcularBrigadistasNecessarios(efetivoAtivo);
    const designados = brigadistasDesignadosAtivos();
    const matriculasStatus15 = new Set(
        allTreinamentosStatus.filter(s => s.treinamento_cod === '15').map(s => s.matricula)
    );
    const designadosTreinados = designados.filter(m => m.matricula && matriculasStatus15.has(m.matricula)).length;

    document.getElementById('kpiBrigadaEfetivoAtivo').textContent = efetivoAtivo;
    document.getElementById('kpiBrigadaNecessarios').textContent = necessarios;
    document.getElementById('kpiBrigadaDesignados').textContent = designados.length;
    document.getElementById('kpiBrigadaTreinados').textContent = designadosTreinados;

    const statusEl = document.getElementById('brigadaDimensionamentoStatus');
    if (statusEl) {
        if (designados.length >= necessarios) {
            statusEl.innerHTML = `✅ Efetivo de brigada suficiente (${designados.length} designado(s) para um mínimo calculado de ${necessarios}).`;
            statusEl.style.color = 'var(--success)';
        } else {
            const faltam = necessarios - designados.length;
            statusEl.innerHTML = `⚠️ Faltam designar ${faltam} brigadista(s) (${designados.length} de ${necessarios} necessário(s)).`;
            statusEl.style.color = 'var(--warning)';
        }
    }

    document.getElementById('cfgBrigadaGrauRisco').value = BRIGADA_PARAMETROS.grau_risco || 'medio';
    document.getElementById('cfgBrigadaPercentual').value = BRIGADA_PARAMETROS.percentual_efetivo;
    document.getElementById('cfgBrigadaMinimo').value = BRIGADA_PARAMETROS.minimo_brigadistas;
}

// Só sugere valores diferentes ao trocar o grau de risco (não trava o usuário num
// percentual fixo - ele pode ajustar livremente antes de salvar). O "minimo" sugerido
// aqui (2/2/4) é o piso real da ABNT NBR 14276:2020, item 4.1.3 (conferido em
// 2026-09-22) - o "percentual" continua sendo estimativa nossa, pois a norma não define
// percentual (ver aviso no topo deste bloco e salvarBrigadaParametros/
// BRIGADA_PISO_NORMATIVO_NBR14276 para a validação desse piso).
function onBrigadaGrauRiscoChange() {
    const grau = document.getElementById('cfgBrigadaGrauRisco').value;
    const sugestoes = { baixo: { percentual: 5, minimo: 2 }, medio: { percentual: 10, minimo: 2 }, alto: { percentual: 12, minimo: 4 } };
    const s = sugestoes[grau];
    if (s) {
        document.getElementById('cfgBrigadaPercentual').value = s.percentual;
        document.getElementById('cfgBrigadaMinimo').value = s.minimo;
    }
}

// Piso mínimo de brigadistas por grau de risco, conforme ABNT NBR 14276:2020, item 4.1.3
// (verificado no texto oficial da norma em 2026-09-21): baixo/médio risco = mínimo 2
// brigadistas (para população > 4 na área); alto risco = mínimo 4 brigadistas (para
// população > 10 na área). Isto é o piso normativo por equipe/área de resposta - aqui
// aplicado, por simplificação já acordada com o usuário, ao efetivo total da obra.
const BRIGADA_PISO_NORMATIVO_NBR14276 = { baixo: 2, medio: 2, alto: 4 };

async function salvarBrigadaParametros() {
    const statusEl = document.getElementById('cfgBrigadaStatus');
    const percentual = parseFloat(document.getElementById('cfgBrigadaPercentual').value);
    const minimo = parseInt(document.getElementById('cfgBrigadaMinimo').value, 10);
    const grauRisco = document.getElementById('cfgBrigadaGrauRisco').value;
    if (!(percentual > 0) || !(minimo >= 1)) {
        statusEl.textContent = '❌ Informe um percentual maior que zero e um mínimo de ao menos 1.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const pisoNormativo = BRIGADA_PISO_NORMATIVO_NBR14276[grauRisco];
    const avisoPiso = (pisoNormativo && minimo < pisoNormativo)
        ? ` ⚠️ Abaixo do piso da ABNT NBR 14276:2020 (item 4.1.3), que prevê mínimo de ${pisoNormativo} brigadistas para grau de risco "${grauRisco}" - salvo mesmo assim, mas registre a justificativa técnica.`
        : '';
    const valor = {
        grau_risco: grauRisco,
        percentual_efetivo: percentual,
        minimo_brigadistas: minimo
    };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('configuracoes_sistema', [{ id: 'brigada_parametros', valor, descricao: 'Parâmetros de dimensionamento da Brigada de Incêndio (referência - ajustar conforme NBR 14276 e norma local do Corpo de Bombeiros).', atualizado_em: new Date().toISOString(), atualizado_por: usuarioDashboardAtual() || 'painel' }]);
        Object.assign(BRIGADA_PARAMETROS, valor);
        renderBrigadaDimensionamento();
        statusEl.textContent = '✅ Salvo. Já vale a partir de agora.' + avisoPiso;
        statusEl.style.color = avisoPiso ? 'var(--warning)' : 'var(--success)';
    } catch (e) {
        console.error('Erro ao salvar parâmetros da Brigada de Incêndio:', e);
        statusEl.textContent = '❌ Falha ao salvar: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Organograma ----

const BRIGADA_NIVEL_LABELS = {
    basico: 'Nível Básico',
    intermediario: 'Nível Intermediário',
    avancado: 'Nível Avançado'
};

function renderBrigadaMembrosLista() {
    const container = document.getElementById('brigadaMembrosLista');
    if (!container) return;
    const linhas = allBrigadaMembros.slice().sort((a, b) =>
        (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0) ||
        (BRIGADA_CARGO_ORDEM[a.cargo_brigada] ?? 9) - (BRIGADA_CARGO_ORDEM[b.cargo_brigada] ?? 9) ||
        (a.nome || '').localeCompare(b.nome || '')
    );
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum membro da brigada cadastrado.</div>';
        return;
    }
    container.innerHTML = linhas.map(m => {
        const datasStr = m.data_designacao 
            ? ` — Designado em ${formatSimpleDate(m.data_designacao)}${m.data_fim ? ' até ' + formatSimpleDate(m.data_fim) : ''}`
            : (m.data_fim ? ` — Vigência até ${formatSimpleDate(m.data_fim)}` : '');
        const turnoStr = m.turno ? ` — Turno: ${escapeHTML(m.turno)}` : '';
        const telStr = m.telefone ? ` — Contato: ${escapeHTML(m.telefone)}` : '';
        const nivelStr = m.nivel ? ` — ${BRIGADA_NIVEL_LABELS[m.nivel] || m.nivel}` : '';
        return `<div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;${m.ativo ? '' : ' opacity:0.55;'}">
            <div style="flex:1; min-width:220px; cursor:pointer;" onclick="abrirFormBrigadaMembro('${escapeHTML(m.id)}')">
                <div class="db-list-item-title">${escapeHTML(m.nome)}${m.ativo ? '' : ' (inativo)'}</div>
                <div class="db-list-item-sub">${BRIGADA_CARGO_LABELS[m.cargo_brigada] || m.cargo_brigada || ''} — ${escapeHTML(m.funcao || '')} — ${escapeHTML(m.setor || '')}${m.area ? ' — Área: ' + escapeHTML(m.area) : ''}${turnoStr}${nivelStr}${datasStr}${telStr}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11.5px;" onclick="event.stopPropagation(); abrirAnexoModal('brigada_membros', '${escapeHTML(m.id)}', 'Certificado / Designação — ${escapeHTML(m.nome)}')">📎 Anexos${labelContagemAnexos('brigada_membros', m.id)}</button>
            </div>
        </div>`;
    }).join('');
}

function renderBrigadaOrganograma() {
    const container = document.getElementById('brigadaOrganogramaChart');
    if (!container) return;
    const ativos = brigadistasDesignadosAtivos();
    if (ativos.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Cadastre membros abaixo para ver o organograma.</div>';
        return;
    }
    const grupos = { coordenador_geral: [], chefe_brigada: [], lider_area: [], brigadista: [] };
    ativos.forEach(m => { (grupos[m.cargo_brigada] || grupos.brigadista).push(m); });

    const caixa = (m) => `<div onclick="abrirFormBrigadaMembro('${escapeHTML(m.id)}')" title="Clique para editar este membro da brigada" style="display:inline-block; border:2px solid var(--primary); border-radius:8px; padding:10px 14px; margin:5px; background:var(--card-bg,#fff); font-size:12px; text-align:center; vertical-align:top; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; box-shadow:0 1px 3px rgba(0,0,0,0.08);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 8px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.08)'">
        <div style="font-weight:700; color:var(--text, #1e293b);">${escapeHTML(m.nome)}</div>
        <div style="color:var(--text-light); font-size:11px; margin-top:2px;">${escapeHTML(m.funcao || '')}${m.area ? ' — ' + escapeHTML(m.area) : ''}${m.turno ? ' (' + escapeHTML(m.turno) + ')' : ''}</div>
        ${m.data_designacao ? `<div style="color:var(--primary); font-size:10.5px; margin-top:3px; font-weight:600;">📅 Desde: ${formatSimpleDate(m.data_designacao)}</div>` : ''}
        ${m.telefone ? `<div style="color:var(--text-light); font-size:10.5px; margin-top:2px;">📞 ${escapeHTML(m.telefone)}</div>` : ''}
    </div>`;

    const nivel = (titulo, itens) => itens.length === 0 ? '' : `<div style="margin-bottom:14px;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-light); margin-bottom:4px;">${titulo}</div>
        <div style="text-align:center;">${itens.map(caixa).join('')}</div>
    </div>`;

    container.innerHTML = `<div style="text-align:center;">
        ${nivel('Coordenação Geral', grupos.coordenador_geral)}
        ${nivel('Chefia de Brigada', grupos.chefe_brigada)}
        ${nivel('Líderes de Área/Turno', grupos.lider_area)}
        ${nivel('Brigadistas', grupos.brigadista)}
    </div>`;
}

function popularBrigadaMembroColabDatalist() {
    const dl = document.getElementById('brigadaMembroColabList');
    if (!dl) return;
    dl.innerHTML = '';
    allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.id} - ${e.nome}`;
        dl.appendChild(opt);
    });
}

function onBrigadaMembroMatriculaChange() {
    const { colab } = buscarColaboradorPorInput('brigadaMembroForm_matricula');
    if (colab) {
        document.getElementById('brigadaMembroForm_nome').value = colab.nome || '';
        document.getElementById('brigadaMembroForm_funcao').value = colab.funcao || '';
        document.getElementById('brigadaMembroForm_setor').value = colab.setor || '';
    }
}

function abrirFormBrigadaMembro(id) {
    const form = document.getElementById('brigadaMembroFormCard');
    const title = document.getElementById('brigadaMembroFormTitle');
    const btnExcluir = document.getElementById('brigadaMembroForm_btnExcluir');
    document.getElementById('brigadaMembroFormStatus').textContent = '';
    form.dataset.id = id || '';
    popularBrigadaMembroColabDatalist();

    if (id) {
        const m = allBrigadaMembros.find(x => x.id === id);
        if (!m) return;
        title.textContent = '✏️ Editar Membro da Brigada';
        document.getElementById('brigadaMembroForm_matricula').value = m.matricula ? `${m.matricula} - ${m.nome}` : '';
        document.getElementById('brigadaMembroForm_nome').value = m.nome || '';
        document.getElementById('brigadaMembroForm_funcao').value = m.funcao || '';
        document.getElementById('brigadaMembroForm_setor').value = m.setor || '';
        document.getElementById('brigadaMembroForm_cargo').value = m.cargo_brigada || 'brigadista';
        document.getElementById('brigadaMembroForm_nivel').value = m.nivel || 'basico';
        document.getElementById('brigadaMembroForm_dataDesignacao').value = m.data_designacao || '';
        document.getElementById('brigadaMembroForm_dataFim').value = m.data_fim || '';
        document.getElementById('brigadaMembroForm_turno').value = m.turno || 'Diurno';
        document.getElementById('brigadaMembroForm_telefone').value = m.telefone || '';
        document.getElementById('brigadaMembroForm_area').value = m.area || '';
        document.getElementById('brigadaMembroForm_ativo').value = m.ativo === false ? 'false' : 'true';
        btnExcluir.style.display = 'inline-block';
        const btnAnexos = document.getElementById('brigadaMembroForm_btnAnexos');
        if (btnAnexos) {
            btnAnexos.style.display = 'inline-block';
            btnAnexos.textContent = `📎 Anexos (Certificado / Atas)${labelContagemAnexos('brigada_membros', id)}`;
        }
    } else {
        title.textContent = '🚨 Novo Membro da Brigada';
        document.getElementById('brigadaMembroForm_matricula').value = '';
        document.getElementById('brigadaMembroForm_nome').value = '';
        document.getElementById('brigadaMembroForm_funcao').value = '';
        document.getElementById('brigadaMembroForm_setor').value = '';
        document.getElementById('brigadaMembroForm_cargo').value = 'brigadista';
        document.getElementById('brigadaMembroForm_nivel').value = 'basico';
        document.getElementById('brigadaMembroForm_dataDesignacao').value = new Date().toISOString().slice(0, 10);
        document.getElementById('brigadaMembroForm_dataFim').value = '';
        document.getElementById('brigadaMembroForm_turno').value = 'Diurno';
        document.getElementById('brigadaMembroForm_telefone').value = '';
        document.getElementById('brigadaMembroForm_area').value = '';
        document.getElementById('brigadaMembroForm_ativo').value = 'true';
        btnExcluir.style.display = 'none';
        const btnAnexos = document.getElementById('brigadaMembroForm_btnAnexos');
        if (btnAnexos) btnAnexos.style.display = 'none';
    }
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormBrigadaMembro() {
    const form = document.getElementById('brigadaMembroFormCard');
    if (form) form.style.display = 'none';
}

async function salvarBrigadaMembro() {
    if (bloquearEdicaoSeNaoAutorizado('brigada')) return;
    const statusEl = document.getElementById('brigadaMembroFormStatus');
    const idAtual = document.getElementById('brigadaMembroFormCard').dataset.id;
    const nome = document.getElementById('brigadaMembroForm_nome').value.trim();
    if (!nome) {
        statusEl.textContent = '❌ Informe o nome do membro.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const matriculaRaw = document.getElementById('brigadaMembroForm_matricula').value.trim();
    const matricula = matriculaRaw.includes(' - ') ? matriculaRaw.split(' - ')[0].trim() : (matriculaRaw || null);
    const id = idAtual || (matricula ? `BRIGADA_${matricula}` : `BRIGADA_${Date.now()}`);
    if (!idAtual && matricula && allBrigadaMembros.some(m => m.id === id)) {
        statusEl.textContent = '❌ Essa matrícula já está cadastrada na Brigada. Edite o registro existente em vez de criar um novo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const cargo = document.getElementById('brigadaMembroForm_cargo').value;
    // Coordenador Geral é um papel único no organograma - sem essa checagem dois
    // membros poderiam ficar marcados como Coordenador Geral ao mesmo tempo.
    if (cargo === 'coordenador_geral') {
        const conflito = allBrigadaMembros.find(m => m.id !== id && m.ativo && m.cargo_brigada === 'coordenador_geral');
        if (conflito) {
            statusEl.textContent = `❌ Já existe um Coordenador Geral da Brigada (${conflito.nome}). Altere o cargo dele(a) antes de atribuir a outra pessoa.`;
            statusEl.style.color = 'var(--danger)';
            return;
        }
    }
    const row = {
        id,
        matricula,
        nome,
        funcao: document.getElementById('brigadaMembroForm_funcao').value.trim() || null,
        setor: document.getElementById('brigadaMembroForm_setor').value.trim() || null,
        cargo_brigada: cargo,
        nivel: document.getElementById('brigadaMembroForm_nivel').value || 'basico',
        data_designacao: document.getElementById('brigadaMembroForm_dataDesignacao').value || null,
        data_fim: document.getElementById('brigadaMembroForm_dataFim').value || null,
        turno: document.getElementById('brigadaMembroForm_turno').value || null,
        telefone: document.getElementById('brigadaMembroForm_telefone').value.trim() || null,
        area: document.getElementById('brigadaMembroForm_area').value.trim() || null,
        ativo: document.getElementById('brigadaMembroForm_ativo').value === 'true'
    };
    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('brigada_membros', [row]);
        document.getElementById('brigadaMembroFormCard').dataset.id = id;
        const idx = allBrigadaMembros.findIndex(m => m.id === id);
        if (idx >= 0) allBrigadaMembros[idx] = { ...allBrigadaMembros[idx], ...row };
        else allBrigadaMembros.push(row);
        renderBrigadaMembrosLista();
        renderBrigadaOrganograma();
        renderBrigadaDimensionamento();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormBrigadaMembro(), 900);
    } catch (err) {
        console.error('Erro ao salvar membro da Brigada de Incêndio:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirBrigadaMembroAtual() {
    const id = document.getElementById('brigadaMembroFormCard').dataset.id;
    if (!id) return;
    if (!confirm('Excluir este membro da Brigada de Incêndio? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('brigadaMembroFormStatus');
    statusEl.textContent = '⏳ Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('brigada_membros', id);
        allBrigadaMembros = allBrigadaMembros.filter(m => m.id !== id);
        renderBrigadaMembrosLista();
        renderBrigadaOrganograma();
        renderBrigadaDimensionamento();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormBrigadaMembro(), 900);
    } catch (err) {
        console.error('Erro ao excluir membro da Brigada de Incêndio:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Treinamento / Controle de Treinados ----

function buscarUltimoTreinamentoBrigada(matricula) {
    if (!matricula) return null;
    return allTreinamentosRealizados
        .filter(r => r.matricula === matricula && r.treinamento_cod === '15')
        .sort((a, b) => (b.data_treinamento || '').localeCompare(a.data_treinamento || ''))[0] || null;
}

function statusTreinamentoBrigadaDoMembro(m) {
    if (!m.matricula) return { situacao: 'sem_matricula', label: 'Sem matrícula vinculada ao efetivo' };
    const status = allTreinamentosStatus.find(s => s.matricula === m.matricula && s.treinamento_cod === '15');
    if (!status || !status.data_proxima_reciclagem) return { situacao: 'nunca_treinado', label: 'Nunca treinado nesta NR' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const deadline = parseLocalDate(status.data_proxima_reciclagem); deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { situacao: 'vencido', label: `Vencido há ${Math.abs(diffDays)} dia(s)` };
    if (diffDays <= 30) return { situacao: 'vencendo', label: `Vence em ${diffDays} dia(s)` };
    return { situacao: 'em_dia', label: `Em dia (válido até ${formatSimpleDate(status.data_proxima_reciclagem)})` };
}

function renderBrigadaControleTreinados() {
    const designados = brigadistasDesignadosAtivos();
    const situacoes = designados.map(m => {
        const reg = buscarUltimoTreinamentoBrigada(m.matricula);
        return { m, st: statusTreinamentoBrigadaDoMembro(m), reg };
    });

    const contagem = { em_dia: 0, vencendo: 0, vencido: 0, nunca_treinado: 0, sem_matricula: 0 };
    situacoes.forEach(({ st }) => { contagem[st.situacao] = (contagem[st.situacao] || 0) + 1; });

    document.getElementById('kpiBrigadaTreinEmDia').textContent = contagem.em_dia;
    document.getElementById('kpiBrigadaTreinVencendo').textContent = contagem.vencendo;
    document.getElementById('kpiBrigadaTreinVencido').textContent = contagem.vencido + contagem.nunca_treinado;

    const listEl = document.getElementById('listBrigadaControleTreinados');
    if (designados.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">Nenhum membro da brigada cadastrado ainda (cadastre na aba Organograma).</div>';
        const btn = document.getElementById('btnBrigadaProgramarTreinamento');
        if (btn) btn.style.display = 'none';
        brigadaMatriculasPendentesTreinamento = [];
        return;
    }
    const ordem = { vencido: 0, nunca_treinado: 1, sem_matricula: 2, vencendo: 3, em_dia: 4 };
    const ordenados = situacoes.slice().sort((a, b) => (ordem[a.st.situacao] ?? 9) - (ordem[b.st.situacao] ?? 9));
    const pendentes = ordenados.filter(({ st }) => st.situacao === 'vencido' || st.situacao === 'nunca_treinado' || st.situacao === 'vencendo');

    listEl.innerHTML = ordenados.map(({ m, st, reg }) => {
        const cls = (st.situacao === 'vencido' || st.situacao === 'nunca_treinado') ? 'db-item-danger' : (st.situacao === 'vencendo' ? 'db-item-warning' : '');
        const dataTreinStr = reg?.data_treinamento ? `Realizado em: ${formatSimpleDate(reg.data_treinamento)}` : 'Sem data informada';
        const validadeStr = reg?.data_proxima_reciclagem ? ` • Vence em: ${formatSimpleDate(reg.data_proxima_reciclagem)}` : '';
        const cargaStr = reg?.carga_horaria ? ` • ${reg.carga_horaria}h` : '';
        const instrutorStr = reg?.instrutor_nome ? ` • Instrutor: ${escapeHTML(reg.instrutor_nome)}` : '';

        return `<div class="db-list-item ${cls}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;" onclick="abrirFormTreinamentoBrigada('${escapeHTML(m.matricula || '')}')">
            <div style="flex:1; min-width:260px;">
                <div class="db-list-item-title" style="font-weight:600; font-size:13px;">
                    ${escapeHTML(m.nome)} — <span style="font-weight:normal; color:var(--text-light);">${BRIGADA_CARGO_LABELS[m.cargo_brigada] || m.cargo_brigada}</span>
                </div>
                <div class="db-list-item-sub" style="margin-top:3px; font-size:12px;">
                    <strong style="color:${st.situacao === 'em_dia' ? 'var(--success)' : (st.situacao === 'vencendo' ? 'var(--warning)' : 'var(--danger)')};">${escapeHTML(st.label)}</strong>
                    <span style="color:var(--text-light); margin-left:6px;">(${dataTreinStr}${validadeStr}${cargaStr}${instrutorStr})</span>
                </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <button class="db-clear-btn" style="padding:6px 10px; font-size:11.5px; white-space:nowrap;" onclick="event.stopPropagation(); abrirAnexoModal('brigada_membros', '${escapeHTML(m.id)}', 'Certificado — ${escapeHTML(m.nome)}')">📎 Certificado${labelContagemAnexos('brigada_membros', m.id)}</button>
                <button class="db-apply-btn" style="padding:6px 12px; font-size:11.5px; white-space:nowrap;" onclick="event.stopPropagation(); abrirFormTreinamentoBrigada('${escapeHTML(m.matricula || '')}')">
                    ✏️ Editar Treinamento
                </button>
            </div>
        </div>`;
    }).join('');

    const btnPrograma = document.getElementById('btnBrigadaProgramarTreinamento');
    if (btnPrograma) btnPrograma.style.display = pendentes.length > 0 ? 'inline-block' : 'none';
    brigadaMatriculasPendentesTreinamento = pendentes.map(({ m }) => m.matricula).filter(Boolean);
}

function onBrigadaTreinDataChange() {
    const dataTrein = document.getElementById('brigadaTreinForm_data').value;
    const meses = parseInt(document.getElementById('brigadaTreinForm_meses').value, 10) || 12;
    if (dataTrein) {
        const d = parseLocalDate(dataTrein);
        if (!isNaN(d.getTime())) {
            const alvo = new Date(d.getFullYear(), d.getMonth() + meses, d.getDate());
            document.getElementById('brigadaTreinForm_reciclagem').value = 
                `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
        }
    }
}

function abrirFormTreinamentoBrigada(matricula) {
    if (!matricula) {
        alert('Este membro não possui matrícula vinculada ao efetivo. Acesse a aba Organograma, vincule a matrícula do colaborador e tente novamente.');
        return;
    }
    const membro = allBrigadaMembros.find(m => m.matricula === matricula);
    if (!membro) return;

    const form = document.getElementById('brigadaTreinamentoFormCard');
    const title = document.getElementById('brigadaTreinFormTitle');
    const statusEl = document.getElementById('brigadaTreinFormStatus');
    statusEl.textContent = '';
    
    document.getElementById('brigadaTreinForm_matricula').value = matricula;
    document.getElementById('brigadaTreinForm_colabNome').textContent = membro.nome || '-';
    document.getElementById('brigadaTreinForm_colabMatricula').textContent = matricula;
    document.getElementById('brigadaTreinForm_colabCargo').textContent = BRIGADA_CARGO_LABELS[membro.cargo_brigada] || membro.cargo_brigada;

    const reg = buscarUltimoTreinamentoBrigada(matricula);
    const cat = allTreinamentosCatalogo.find(c => c.id === '15');
    const mesesPadrao = cat?.meses_validade || 12;
    const cargaPadrao = cat?.carga_horaria || 20;

    if (reg) {
        title.textContent = '✏️ Editar Treinamento NR-23 da Brigada';
        form.dataset.regId = reg.id;
        document.getElementById('brigadaTreinForm_data').value = reg.data_treinamento || '';
        document.getElementById('brigadaTreinForm_meses').value = reg.meses_validade || mesesPadrao;
        document.getElementById('brigadaTreinForm_reciclagem').value = reg.data_proxima_reciclagem || '';
        document.getElementById('brigadaTreinForm_carga').value = reg.carga_horaria || cargaPadrao;
        document.getElementById('brigadaTreinForm_instrutor').value = reg.instrutor_nome || '';
        document.getElementById('brigadaTreinForm_local').value = reg.local_realizacao || '';
        document.getElementById('brigadaTreinForm_turma').value = reg.numero_turma || '';
        document.getElementById('brigadaTreinForm_obs').value = reg.observacoes || '';
    } else {
        title.textContent = '🎓 Registrar Novo Treinamento NR-23 da Brigada';
        form.dataset.regId = '';
        const hojeStr = new Date().toISOString().slice(0, 10);
        document.getElementById('brigadaTreinForm_data').value = hojeStr;
        document.getElementById('brigadaTreinForm_meses').value = mesesPadrao;
        document.getElementById('brigadaTreinForm_carga').value = cargaPadrao;
        document.getElementById('brigadaTreinForm_instrutor').value = 'MARIA GESSICA DA SILVA ROQUE';
        document.getElementById('brigadaTreinForm_local').value = 'Canteiro de Obras / Frente';
        document.getElementById('brigadaTreinForm_turma').value = '';
        document.getElementById('brigadaTreinForm_obs').value = 'Treinamento de Brigada de Incêndio (NR-23)';
        onBrigadaTreinDataChange();
    }

    const btnAnexosTrein = document.getElementById('brigadaTreinForm_btnAnexos');
    if (btnAnexosTrein) {
        btnAnexosTrein.style.display = 'inline-block';
        btnAnexosTrein.textContent = `📎 Anexo (Certificado)${labelContagemAnexos('brigada_membros', membro.id)}`;
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormTreinamentoBrigada() {
    const form = document.getElementById('brigadaTreinamentoFormCard');
    if (form) form.style.display = 'none';
}

async function salvarTreinamentoBrigada() {
    const statusEl = document.getElementById('brigadaTreinFormStatus');
    const matricula = document.getElementById('brigadaTreinForm_matricula').value;
    const form = document.getElementById('brigadaTreinamentoFormCard');
    const regIdAtual = form.dataset.regId;
    const dataTrein = document.getElementById('brigadaTreinForm_data').value;
    const dataReciclagem = document.getElementById('brigadaTreinForm_reciclagem').value;
    const meses = parseInt(document.getElementById('brigadaTreinForm_meses').value, 10) || null;
    const carga = parseFloat(document.getElementById('brigadaTreinForm_carga').value) || null;
    const instrutor = document.getElementById('brigadaTreinForm_instrutor').value.trim() || null;
    const local = document.getElementById('brigadaTreinForm_local').value.trim() || null;
    const turma = document.getElementById('brigadaTreinForm_turma').value.trim() || null;
    const obs = document.getElementById('brigadaTreinForm_obs').value.trim() || null;

    if (!dataTrein) {
        statusEl.textContent = '❌ Informe a data do treinamento.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    if (!dataReciclagem) {
        statusEl.textContent = '❌ Informe a data de próxima reciclagem / validade.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const membro = allBrigadaMembros.find(m => m.matricula === matricula);
    const colabEfetivo = allEfetivo.find(e => e.id === matricula);
    const nome = membro?.nome || colabEfetivo?.nome || '';
    const funcao = membro?.funcao || colabEfetivo?.funcao || null;
    const setor = membro?.setor || colabEfetivo?.setor || null;
    const cat = allTreinamentosCatalogo.find(c => c.id === '15');
    const treinamentoNome = cat?.nome || 'NR 23 - PROTEÇÃO CONTRA INCÊNDIO (BRIGADA DE EMERGÊNCIA)';

    const id = regIdAtual || `${matricula}_15_${dataTrein}`;

    const row = {
        id,
        matricula,
        nome,
        funcao,
        setor,
        status_colaborador: 'Ativo',
        treinamento_cod: '15',
        treinamento_nome: treinamentoNome,
        carga_horaria: carga,
        data_treinamento: dataTrein,
        meses_validade: meses,
        data_proxima_reciclagem: dataReciclagem,
        instrutor_nome: instrutor,
        local_realizacao: local,
        numero_turma: turma,
        observacoes: obs
    };

    statusEl.textContent = '⏳ Salvando...';
    statusEl.style.color = 'var(--text-light)';

    try {
        await supabaseUpsert('treinamentos_realizados', [row]);
        form.dataset.regId = id;

        // Atualiza memória local de allTreinamentosRealizados
        const idxReal = allTreinamentosRealizados.findIndex(r => r.id === id);
        if (idxReal >= 0) allTreinamentosRealizados[idxReal] = { ...allTreinamentosRealizados[idxReal], ...row };
        else allTreinamentosRealizados.push(row);

        // Atualiza memória local de allTreinamentosStatus
        const statusRow = {
            id: `${matricula}_15`,
            matricula,
            nome,
            funcao,
            setor,
            status_colaborador: 'Ativo',
            treinamento_cod: '15',
            treinamento_nome: treinamentoNome,
            carga_horaria: carga,
            data_treinamento: dataTrein,
            meses_validade: meses,
            data_proxima_reciclagem: dataReciclagem,
            created_at: new Date().toISOString()
        };
        const idxStatus = allTreinamentosStatus.findIndex(s => s.matricula === matricula && s.treinamento_cod === '15');
        if (idxStatus >= 0) allTreinamentosStatus[idxStatus] = { ...allTreinamentosStatus[idxStatus], ...statusRow };
        else allTreinamentosStatus.push(statusRow);

        // Re-renderiza interface da Brigada instantaneamente
        renderBrigadaControleTreinados();
        renderBrigadaDimensionamento();

        statusEl.textContent = '✅ Treinamento salvo com sucesso!';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormTreinamentoBrigada(), 900);
    } catch (err) {
        console.error('Erro ao salvar treinamento da Brigada:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function abrirProgramacaoTreinamentoBrigada() {
    if (brigadaMatriculasPendentesTreinamento.length === 0) return;
    showDbPage('treinamentos');
    programarRenovacaoNR('15', brigadaMatriculasPendentesTreinamento);
}
