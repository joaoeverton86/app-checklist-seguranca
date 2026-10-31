// ==============================================================================
// MODULO: CONTROLE DOCUMENTAL E BRIGADA DE INCENDIO (DIMENSIONAMENTO/PLANO)
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// emissões pros documentos gerados pelo sistema. A lista mestra (documentos_controle)
// é a fonte real lida pelos geradores (gerarRegistroTreinamento, abrirFichaEpiColaborador
// etc, via codigoRevisaoDocumento()) - mudar a revisão aqui reflete automaticamente no
// próximo PDF impresso, sem tocar em nenhuma função geradora.
// ============================================

var allDocumentosControle = [];
var allDocumentosRevisoes = [];
var allDocumentosEmissoes = [];
var documentosControleLoaded = false;

var DOC_STATUS_LABELS = { vigente: '✅ Vigente', em_elaboracao: '🛠️ Em Elaboração', obsoleto: '🚫 Obsoleto' };

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

var allAvaliacoesPsicossociais = [];
var allEscalasPsicossociais = [];
var allPerguntasPsicossociais = [];
var psicossocialLoaded = false;
var psicossocialAplicacaoAtivaId = null;
var psicoPerguntasAbertas = false;
var chartPsicoEscalas = null;

var PSICO_LIMIAR_RISCO_CRITICO = 40; // % - limiar só de UI (não vem do PGR/instrumento) - valor
// padrão; pode ser sobrescrito por configuracoes_sistema (ver carregarConfiguracoesSistema)
var PSICO_LIMIAR_FAVORAVEL_FORTE = 90; // % - mesma observação acima

var PSICO_ESCALAS_PADRAO = [
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
        allAvaliacoesPsicossociais = Array.isArray(aplicacoes) ? aplicacoes : [];
        allEscalasPsicossociais = Array.isArray(escalas) ? escalas : [];
        allPerguntasPsicossociais = Array.isArray(perguntas) ? perguntas : [];
        psicossocialLoaded = true;

        if (!psicossocialAplicacaoAtivaId || !allAvaliacoesPsicossociais.some(a => a.id === psicossocialAplicacaoAtivaId)) {
            const ordenadas = allAvaliacoesPsicossociais.slice().sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
            psicossocialAplicacaoAtivaId = ordenadas[0]?.id || null;
        }
        renderPsicossocialPanel();
        renderListaAplicacoesPsicossociais();
        return true;
    } catch (err) {
        console.error('Erro ao carregar avaliação psicossocial:', err);
        psicossocialLoaded = false;
        const conteudo = document.getElementById('psicossocialConteudo');
        const conteudoVazio = document.getElementById('psicossocialConteudoVazio');
        const conteudoAtivo = document.getElementById('psicossocialConteudoAtivo');
        if (allAvaliacoesPsicossociais.length === 0) {
            if (conteudoVazio) {
                conteudoVazio.style.display = 'block';
                conteudoVazio.innerHTML = `
                    <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                    <div style="font-size:14px; font-weight:700; color:var(--danger); margin-bottom:6px;">Falha ao carregar dados psicossociais</div>
                    <div style="font-size:12.5px; color:var(--text-light); margin-bottom:14px;">${escapeHTML(err.message || String(err))}</div>
                    <button class="db-apply-btn" onclick="loadPsicossocialData()" style="font-size:12px; padding:6px 14px;">🔄 Tentar Novamente</button>
                `;
            }
            if (conteudoAtivo) conteudoAtivo.style.display = 'none';
        }
        return false;
    }
}

function showPsicossocialSubtab(tab) {
    ['visao', 'gerenciar', 'ghe'].forEach(t => {
        const content = document.getElementById('psicossocialSubtab-' + t);
        const btn = document.getElementById('psicossocialSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderPsicossocialPanel();
    if (tab === 'gerenciar') {
        const form = document.getElementById('psicoAplicacaoFormCard');
        if (!form || form.style.display !== 'block') {
            fecharFormAplicacaoPsicossocial();
        }
        renderListaAplicacoesPsicossociais();
    }
    if (tab === 'ghe') {
        garantirDadosGestaoPsicoGhe();
    }
}

function onPsicossocialAplicacaoChange(id) {
    psicossocialAplicacaoAtivaId = id;
    renderPsicossocialPanel();
}

function editarAplicacaoPsicossocialAtiva() {
    if (!psicossocialAplicacaoAtivaId) return;
    showPsicossocialSubtab('gerenciar');
    abrirFormAplicacaoPsicossocial(psicossocialAplicacaoAtivaId);
}

function abrirFormNovaAplicacaoPsicossocial() {
    showPsicossocialSubtab('gerenciar');
    abrirFormAplicacaoPsicossocial(null);
}

function renderPsicossocialPanel() {
    const seletorWrap = document.getElementById('psicossocialSeletorWrap');
    const seletor = document.getElementById('psicossocialSeletorAplicacao');
    const btnEditar = document.getElementById('btnEditarAplicacaoPsicoAtiva');
    const conteudoVazio = document.getElementById('psicossocialConteudoVazio');
    const conteudoAtivo = document.getElementById('psicossocialConteudoAtivo');

    if (allAvaliacoesPsicossociais.length > 1) {
        if (seletorWrap) seletorWrap.style.display = 'flex';
        if (seletor) {
            const ordenadas = allAvaliacoesPsicossociais.slice().sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''));
            seletor.innerHTML = ordenadas.map(a => `<option value="${escapeHTML(a.id)}" ${a.id === psicossocialAplicacaoAtivaId ? 'selected' : ''}>${formatarPeriodoPsicossocial(a)}</option>`).join('');
        }
    } else if (allAvaliacoesPsicossociais.length === 1) {
        if (seletorWrap) seletorWrap.style.display = 'flex';
        if (seletor) {
            seletor.innerHTML = `<option value="${escapeHTML(allAvaliacoesPsicossociais[0].id)}" selected>${formatarPeriodoPsicossocial(allAvaliacoesPsicossociais[0])}</option>`;
        }
    } else {
        if (seletorWrap) seletorWrap.style.display = 'none';
    }

    const aplicacao = allAvaliacoesPsicossociais.find(a => a.id === psicossocialAplicacaoAtivaId);
    if (!aplicacao) {
        if (conteudoVazio) conteudoVazio.style.display = 'block';
        if (conteudoAtivo) conteudoAtivo.style.display = 'none';
        if (btnEditar) btnEditar.style.display = 'none';
        return;
    }

    if (conteudoVazio) conteudoVazio.style.display = 'none';
    if (conteudoAtivo) conteudoAtivo.style.display = 'block';
    if (btnEditar) btnEditar.style.display = 'inline-flex';

    const escalas = allEscalasPsicossociais.filter(e => e.aplicacao_id === psicossocialAplicacaoAtivaId);
    const perguntas = allPerguntasPsicossociais.filter(p => p.aplicacao_id === psicossocialAplicacaoAtivaId).sort((a, b) => a.numero - b.numero);

    const kpiPart = document.getElementById('kpiPsicoParticipacao');
    if (kpiPart) kpiPart.textContent = fmtPct(aplicacao.taxa_participacao);

    const limiarCritico = (typeof PSICO_LIMIAR_RISCO_CRITICO !== 'undefined') ? PSICO_LIMIAR_RISCO_CRITICO : 40;
    const limiarForte = (typeof PSICO_LIMIAR_FAVORAVEL_FORTE !== 'undefined') ? PSICO_LIMIAR_FAVORAVEL_FORTE : 90;

    const criticas = escalas.filter(e => e.pct_risco != null && Number(e.pct_risco) >= limiarCritico).sort((a, b) => Number(b.pct_risco) - Number(a.pct_risco));
    const atencao = escalas.filter(e => e.pct_risco != null && Number(e.pct_risco) >= 20 && Number(e.pct_risco) < limiarCritico);
    const fortes = escalas.filter(e => e.pct_favoravel != null && Number(e.pct_favoravel) >= limiarForte).sort((a, b) => Number(b.pct_favoravel) - Number(a.pct_favoravel));

    const elCriticas = document.getElementById('kpiPsicoCriticas');
    const elAtencao = document.getElementById('kpiPsicoAtencao');
    const elFortes = document.getElementById('kpiPsicoFortes');
    if (elCriticas) elCriticas.textContent = criticas.length;
    if (elAtencao) elAtencao.textContent = atencao.length;
    if (elFortes) elFortes.textContent = fortes.length;

    // Rótulos dinâmicos vinculados estritamente aos limiares configurados
    const lblCriticas = document.getElementById('lblKpiPsicoCriticas');
    const lblAtencao = document.getElementById('lblKpiPsicoAtencao');
    const lblFortes = document.getElementById('lblKpiPsicoFortes');
    if (lblCriticas) lblCriticas.textContent = `Escalas em Risco Crítico (≥${limiarCritico}%)`;
    if (lblAtencao) lblAtencao.textContent = `Escalas em Atenção (20–${limiarCritico}% risco)`;
    if (lblFortes) lblFortes.textContent = `Pontos Fortes (≥${limiarForte}% favorável)`;

    renderPsicoCards('psicoCardsCriticas', criticas, 'risco');
    renderPsicoCards('psicoCardsFortes', fortes, 'favoravel');

    const resumoEl = document.getElementById('psicossocialResumo');
    if (resumoEl) {
        if (aplicacao.resumo_analise) {
            resumoEl.style.display = 'block';
            resumoEl.textContent = aplicacao.resumo_analise;
        } else {
            resumoEl.style.display = 'none';
        }
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

    // Ordenação segura: escalas com dados válidos de risco ordenadas por risco decrescente; dados ausentes no fim
    const ordenadas = escalas.slice().sort((a, b) => {
        const valA = a.pct_risco != null ? Number(a.pct_risco) : -1;
        const valB = b.pct_risco != null ? Number(b.pct_risco) : -1;
        return valB - valA;
    });

    const labels = ordenadas.map(e => {
        const preenchidos = [e.pct_favoravel != null, e.pct_intermediario != null, e.pct_risco != null].filter(Boolean).length;
        if (preenchidos === 0) return wrapChartLabel(e.escala + ' (Sem dados)');
        if (preenchidos < 3) return wrapChartLabel(e.escala + ' (Incompleta)');
        return wrapChartLabel(e.escala);
    });
    ajustarAlturaBarrasHorizontais(canvasId, labels);

    if (chartPsicoEscalas) chartPsicoEscalas.destroy();
    chartPsicoEscalas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Situação Favorável',
                    data: ordenadas.map(e => e.pct_favoravel != null ? Number(e.pct_favoravel) : null),
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Intermediário',
                    data: ordenadas.map(e => e.pct_intermediario != null ? Number(e.pct_intermediario) : null),
                    backgroundColor: '#f59e0b'
                },
                {
                    label: 'Risco para a Saúde',
                    data: ordenadas.map(e => e.pct_risco != null ? Number(e.pct_risco) : null),
                    backgroundColor: '#ef4444'
                }
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
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            if (ctx.parsed.x == null || isNaN(ctx.parsed.x)) return `${ctx.dataset.label}: Não informado`;
                            return `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(1)}%`;
                        }
                    }
                }
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

function gerarIdPsicossocial(periodoInicio) {
    const prefixo = (periodoInicio && periodoInicio.length >= 7) ? periodoInicio.slice(0, 7) : new Date().toISOString().slice(0, 7);
    let uuid = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        uuid = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        uuid = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    } else {
        uuid = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    }
    return `${prefixo}_${uuid}`;
}

function gerarSessionIdPsicossocial() {
    let token = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        token = crypto.randomUUID();
    } else {
        token = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }
    return 'sess_' + token;
}

async function tentarRecarregarAposSave(id, sessionId) {
    const statusEl = document.getElementById('psicoAplicacaoFormStatus');
    if (statusEl) {
        statusEl.textContent = 'Recarregando visualização...';
        statusEl.style.color = 'var(--text-light)';
    }
    const ok = await loadPsicossocialData();
    if (ok !== false) {
        if (statusEl) {
            statusEl.textContent = '✅ Visualização atualizada com sucesso.';
            statusEl.style.color = 'var(--success)';
        }
        const form = document.getElementById('psicoAplicacaoFormCard');
        if (form && form.dataset.sessionId === sessionId && form.dataset.id === id) {
            psicossocialAplicacaoAtivaId = id;
            fecharFormAplicacaoPsicossocial(id, sessionId);
            showPsicossocialSubtab('visao');
        }
    } else if (statusEl) {
        statusEl.innerHTML = `❌ Falha persistente ao atualizar tela.<br>
        <button type="button" class="db-apply-btn" onclick="tentarRecarregarAposSave('${id}', '${sessionId}')" style="margin-top:4px; font-size:12px; padding:4px 10px;">🔄 Tentar Novamente</button>`;
        statusEl.style.color = 'var(--danger)';
    }
}

function abrirFormAplicacaoPsicossocial(id) {
    const form = document.getElementById('psicoAplicacaoFormCard');
    if (!form) return false;

    // Proteção contra descarte silencioso de rascunho não salvo (dirty state)
    if (form.style && form.style.display === 'block' && form.dataset.initialSnapshot) {
        const snapshotAtual = capturarSnapshotInputsFormPsico();
        if (snapshotAtual !== form.dataset.initialSnapshot) {
            if (typeof confirm === 'function' && !confirm('Existem alterações não salvas no formulário atual. Deseja descartá-las?')) {
                return false;
            }
        }
    }

    document.getElementById('psicoAplicacaoFormStatus').textContent = '';
    form.dataset.id = id || '';
    // Token de sessão único para identificar o ciclo de vida desta edição específica
    form.dataset.sessionId = typeof gerarSessionIdPsicossocial === 'function' ? gerarSessionIdPsicossocial() : ('sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));

    const btnExcluir = document.getElementById('btnExcluirAplicacaoPsico');
    if (btnExcluir) btnExcluir.style.display = id ? 'inline-flex' : 'none';

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

    // Snapshot fiel do modelo carregado nesta edicao (evita fallback cruzado ao salvar)
    form.dataset.perguntasSnapshot = JSON.stringify(perguntasTemplate);

    form.style.display = 'block';
    form.dataset.initialSnapshot = capturarSnapshotInputsFormPsico();
    if (typeof form.scrollIntoView === 'function') {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return true;
}

function capturarSnapshotInputsFormPsico() {
    const form = document.getElementById('psicoAplicacaoFormCard');
    if (!form) return '';
    const pIni = document.getElementById('psicoFormPeriodoInicio')?.value ?? '';
    const pFim = document.getElementById('psicoFormPeriodoFim')?.value ?? '';
    const taxa = document.getElementById('psicoFormTaxaParticipacao')?.value ?? '';
    const resumo = document.getElementById('psicoFormResumo')?.value ?? '';
    let nomesEscalas = [];
    try { nomesEscalas = JSON.parse(form.dataset.escalaNomes || '[]'); } catch (_) { nomesEscalas = []; }
    const escalasVals = nomesEscalas.map(nome => {
        const slug = typeof slugPsico === 'function' ? slugPsico(nome) : String(nome);
        return [
            document.getElementById(`psicoEscala_${slug}_fav`)?.value ?? '',
            document.getElementById(`psicoEscala_${slug}_int`)?.value ?? '',
            document.getElementById(`psicoEscala_${slug}_risco`)?.value ?? ''
        ].join(':');
    }).join('|');
    const opcaoInputs = typeof form.querySelectorAll === 'function' ? Array.from(form.querySelectorAll('.psico-pergunta-opcao')) : [];
    const perguntasVals = opcaoInputs.map(inp => `${inp.dataset?.pergunta}_${inp.dataset?.opcao}=${inp.value ?? ''}`).join('|');
    return JSON.stringify({ pIni, pFim, taxa, resumo, escalasVals, perguntasVals });
}

function fecharFormAplicacaoPsicossocial(idParaFechar, sessionIdParaFechar) {
    const form = document.getElementById('psicoAplicacaoFormCard');
    if (form) {
        // Se sessionIdParaFechar for informado, não fecha se uma nova sessão de edição já tiver sido aberta
        if (sessionIdParaFechar && form.dataset.sessionId !== sessionIdParaFechar) return;
        // Se idParaFechar for informado, não fecha se o form pertencer a outra aplicação
        if (idParaFechar && form.dataset.id !== idParaFechar) return;

        form.style.display = 'none';
        form.dataset.id = '';
        form.dataset.sessionId = '';
        form.dataset.initialSnapshot = '';
    }
}

async function salvarAplicacaoPsicossocial() {
    const form = document.getElementById('psicoAplicacaoFormCard');
    if (!form) return false;
    const saveSessionId = form.dataset.sessionId || ('sess_' + Date.now().toString(36));
    const idExistente = form.dataset.id;
    const statusEl = document.getElementById('psicoAplicacaoFormStatus');
    const btnSalvar = document.getElementById('btnSalvarAplicacaoPsico');

    // Guarda lógica de envio concorrente na mesma sessão (bloqueia duplo clique)
    if (form.dataset.salvandoSessionId && form.dataset.salvandoSessionId === saveSessionId) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('Gravação já em andamento para esta sessão.');
        }
        return false;
    }

    const periodoInicio = document.getElementById('psicoFormPeriodoInicio').value;
    const periodoFim = document.getElementById('psicoFormPeriodoFim').value;
    const taxa = document.getElementById('psicoFormTaxaParticipacao').value;
    const resumo = document.getElementById('psicoFormResumo').value;

    const restaurarBotao = () => {
        if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = '💾 Salvar Aplicação'; }
        habilitarInputsFormulario(form);
    };

    // Funções para desabilitar/habilitar todos os inputs do formulário durante save
    function desabilitarInputsFormulario(f) {
        if (!f) return;
        f.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (el.type !== 'hidden') el.disabled = true;
        });
    }
    function habilitarInputsFormulario(f) {
        if (!f) return;
        f.querySelectorAll('input, select, textarea, button').forEach(el => {
            if (el.type !== 'hidden') el.disabled = false;
        });
    }

    // 1. Validação de período
    if (!periodoInicio || !periodoFim) {
        statusEl.textContent = 'Informe o período completo (data de início e término).';
        statusEl.style.color = 'var(--danger)';
        return false;
    }
    if (periodoInicio > periodoFim) {
        statusEl.textContent = 'A data de início não pode ser posterior à data de término.';
        statusEl.style.color = 'var(--danger)';
        return false;
    }

    // 2. Validação da taxa de participação (finito entre 0 e 100)
    let taxaNum = null;
    if (taxa !== '' && taxa != null) {
        taxaNum = parseFloat(taxa);
        if (isNaN(taxaNum) || !isFinite(taxaNum) || taxaNum < 0 || taxaNum > 100) {
            statusEl.textContent = 'A taxa de participação deve ser um número válido entre 0% e 100%.';
            statusEl.style.color = 'var(--danger)';
            return false;
        }
    }

    // 3. Fixação imediata do ID no draft (estabilidade em retry e ID collision-resistant com UUID)
    const id = idExistente || (typeof gerarIdPsicossocial === 'function'
        ? gerarIdPsicossocial(periodoInicio)
        : (periodoInicio.slice(0, 7) + '_' + ((typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : (Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10))))
    );
    form.dataset.id = id;

    // 4. Validação e congelamento das escalas COPSOQ II em snapshot imutável ANTES de qualquer await
    const nomesEscalas = JSON.parse(form.dataset.escalaNomes || '[]');
    const escalaRows = [];
    for (const nome of nomesEscalas) {
        const slug = slugPsico(nome);
        const favVal = document.getElementById(`psicoEscala_${slug}_fav`)?.value ?? '';
        const intVal = document.getElementById(`psicoEscala_${slug}_int`)?.value ?? '';
        const riscoVal = document.getElementById(`psicoEscala_${slug}_risco`)?.value ?? '';

        const validarPct = (v) => {
            if (v === '' || v == null) return true;
            const n = parseFloat(v);
            return !isNaN(n) && isFinite(n) && n >= 0 && n <= 100;
        };
        if (!validarPct(favVal) || !validarPct(intVal) || !validarPct(riscoVal)) {
            statusEl.textContent = `Os percentuais da escala "${nome}" devem ser números válidos entre 0% e 100%.`;
            statusEl.style.color = 'var(--danger)';
            return false;
        }

        const preenchidos = [favVal !== '', intVal !== '', riscoVal !== ''].filter(Boolean).length;
        if (preenchidos > 0 && preenchidos < 3) {
            statusEl.textContent = `A escala "${nome}" está parcialmente preenchida. Preencha as três categorias (Favorável, Intermediário e Risco) somando 100%, ou deixe todas vazias.`;
            statusEl.style.color = 'var(--danger)';
            return false;
        }

        if (preenchidos === 3) {
            const soma = parseFloat(favVal) + parseFloat(intVal) + parseFloat(riscoVal);
            if (Math.abs(soma - 100) > 1.0) {
                statusEl.textContent = `A soma dos percentuais da escala "${nome}" totaliza ${soma.toFixed(1)}% (deve totalizar 100% ±1%). Ajuste os valores.`;
                statusEl.style.color = 'var(--danger)';
                return false;
            }
        }

        escalaRows.push({
            id: `${id}_${slug}`,
            aplicacao_id: id,
            escala: nome,
            pct_favoravel: (favVal === '' || favVal == null) ? null : parseFloat(favVal),
            pct_intermediario: (intVal === '' || intVal == null) ? null : parseFloat(intVal),
            pct_risco: (riscoVal === '' || riscoVal == null) ? null : parseFloat(riscoVal)
        });
    }

    // 5. Validação e congelamento das perguntas detalhadas em snapshot imutável ANTES de qualquer await
    const opcaoInputs = form.querySelectorAll('.psico-pergunta-opcao');
    const porPergunta = {};
    for (const inp of opcaoInputs) {
        const v = inp.value;
        if (v !== '' && v != null) {
            const n = parseFloat(v);
            if (isNaN(n) || !isFinite(n) || n < 0 || n > 100) {
                statusEl.textContent = 'Os percentuais das perguntas devem ser números válidos entre 0% e 100%.';
                statusEl.style.color = 'var(--danger)';
                return false;
            }
        }
        const numero = inp.dataset.pergunta;
        const opcao = inp.dataset.opcao;
        if (!porPergunta[numero]) porPergunta[numero] = {};
        porPergunta[numero][opcao] = (v === '' || v == null) ? null : parseFloat(v);
    }

    const perguntasSnapshot = JSON.parse(form.dataset.perguntasSnapshot || '[]');
    const perguntaRows = Object.entries(porPergunta).map(([numero, opcoes]) => {
        let modelo = perguntasSnapshot.find(p => String(p.numero) === numero);
        if (!modelo) modelo = allPerguntasPsicossociais.find(p => p.aplicacao_id === id && String(p.numero) === numero);
        return {
            id: `${id}_q${numero}`,
            aplicacao_id: id,
            numero: parseInt(numero, 10),
            pergunta: modelo?.pergunta || '',
            opcoes
        };
    });

    // 6. Preparação do payload da aplicação principal (snapshot imutável)
    const aplicacaoRow = {
        id,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        taxa_participacao: taxaNum,
        resumo_analise: resumo || null
    };

    const lerSnapshotInputsFormLocal = () => {
        if (typeof capturarSnapshotInputsFormPsico === 'function') {
            return capturarSnapshotInputsFormPsico();
        }
        const pIni = document.getElementById('psicoFormPeriodoInicio')?.value ?? '';
        const pFim = document.getElementById('psicoFormPeriodoFim')?.value ?? '';
        const tx = document.getElementById('psicoFormTaxaParticipacao')?.value ?? '';
        const res = document.getElementById('psicoFormResumo')?.value ?? '';
        const esc = nomesEscalas.map(nome => {
            const slug = slugPsico(nome);
            return [
                document.getElementById(`psicoEscala_${slug}_fav`)?.value ?? '',
                document.getElementById(`psicoEscala_${slug}_int`)?.value ?? '',
                document.getElementById(`psicoEscala_${slug}_risco`)?.value ?? ''
            ].join(':');
        }).join('|');
        const ops = typeof form.querySelectorAll === 'function' ? Array.from(form.querySelectorAll('.psico-pergunta-opcao')) : [];
        const perg = ops.map(inp => `${inp.dataset?.pergunta}_${inp.dataset?.opcao}=${inp.value ?? ''}`).join('|');
        return JSON.stringify({ pIni, pFim, taxa: tx, resumo: res, escalasVals: esc, perguntasVals: perg });
    };
    const snapshotSalvo = lerSnapshotInputsFormLocal();
    form.dataset.initialSnapshot = snapshotSalvo;

    // 7. Fila de serialização por registro (per-ID queue) + geração monotônica (sem mutação retroativa em voo)
    // Garante que uma gravação anterior em andamento para o mesmo ID termine antes de iniciar a próxima escrita.
    if (!form._saveQueueById) form._saveQueueById = {};
    if (!form._latestGenById) form._latestGenById = {};
    const myWriteGen = (form._latestGenById[id] || 0) + 1;
    form._latestGenById[id] = myWriteGen;
    form.dataset.writeGen = String(myWriteGen);
    form.dataset.salvandoSessionId = saveSessionId;
    form.dataset.salvandoId = id;

    const previousTask = form._saveQueueById[id];
    let releaseCurrentTask;
    const currentTask = new Promise(resolve => { releaseCurrentTask = resolve; });
    const myQueuedTask = previousTask
        ? previousTask.then(() => currentTask, () => currentTask)
        : currentTask;
    form._saveQueueById[id] = myQueuedTask;

    if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = '💾 Gravando...'; }
    statusEl.textContent = 'Gravando aplicação no banco de dados...';
    statusEl.style.color = 'var(--text-light)';

    try {
        if (previousTask) {
            await previousTask;
        }
        // Se uma sessão ainda mais recente para o mesmo ID entrou na fila enquanto aguardávamos, cede a vez sem enviar payload obsoleto
        if (form._latestGenById[id] !== myWriteGen) return false;

        await supabaseUpsert('avaliacoes_psicossociais', [aplicacaoRow]);
        if (form._latestGenById[id] !== myWriteGen) return false;

        if (escalaRows.length > 0) {
            await supabaseUpsert('avaliacoes_psicossociais_escalas', escalaRows);
            if (form._latestGenById[id] !== myWriteGen) return false;
        }

        if (perguntaRows.length > 0) {
            await supabaseUpsert('avaliacoes_psicossociais_perguntas', perguntaRows);
            if (form._latestGenById[id] !== myWriteGen) return false;
        }

        const recargaOk = await loadPsicossocialData();
        if (recargaOk === false) {
            statusEl.innerHTML = `⚠️ <b>Aplicação gravada no banco de dados com sucesso</b>, mas ocorreu uma falha ao atualizar a visualização.<br>
            <span style="font-size:12px; color:var(--text-light);">Os dados foram persistidos com segurança. Você pode tentar atualizar a tela diretamente sem gravar novamente.</span><br>
            <button type="button" class="db-apply-btn" onclick="tentarRecarregarAposSave('${id}', '${saveSessionId}')" style="margin-top:6px; font-size:12px; padding:4px 10px;">🔄 Atualizar Visualização</button>`;
            statusEl.style.color = 'var(--warning, #d97706)';
            return false;
        }

        statusEl.textContent = '✅ Aplicação salva com sucesso.';
        statusEl.style.color = 'var(--success)';
        // Só fecha e transita se o formulário ainda for da mesma sessão, mesma aplicação E sem novas edições feitas durante o envio
        if (form.dataset.sessionId === saveSessionId && form.dataset.id === id) {
            psicossocialAplicacaoAtivaId = id;
            const snapshotPosSave = lerSnapshotInputsFormLocal();
            if (snapshotPosSave !== snapshotSalvo) {
                form.dataset.initialSnapshot = snapshotSalvo;
                statusEl.textContent = '⚠️ A versão anterior foi salva com sucesso, mas houve novas alterações durante o envio. Revise o rascunho mantido na tela e clique em Salvar novamente.';
                statusEl.style.color = 'var(--warning, #d97706)';
                return true;
            }
            fecharFormAplicacaoPsicossocial(id, saveSessionId);
            showPsicossocialSubtab('visao');
        } else if (!psicossocialAplicacaoAtivaId) {
            psicossocialAplicacaoAtivaId = id;
        }
        return true;
    } catch (err) {
        console.error('Erro ao salvar aplicação psicossocial:', err);
        statusEl.textContent = 'Falha ao salvar: ' + (err.message || err);
        statusEl.style.color = 'var(--danger)';
        return false;
    } finally {
        if (typeof releaseCurrentTask === 'function') {
            releaseCurrentTask();
        }
        if (form && form._saveQueueById && form._saveQueueById[id] === myQueuedTask) {
            delete form._saveQueueById[id];
        }
        if (form && form.dataset.salvandoSessionId === saveSessionId) {
            delete form.dataset.salvandoSessionId;
        }
        if (form && form.dataset.salvandoId === id && form._latestGenById && form._latestGenById[id] === myWriteGen) {
            delete form.dataset.salvandoId;
        }
        if (form && (!form.dataset.salvandoSessionId || form.dataset.sessionId === saveSessionId)) {
            restaurarBotao();
        }
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
// INCREMENTO 17.2: GESTÃO INTEGRADA NR-01 GRO POR GHE (FATORES PSICOSSOCIAIS E ERGONÔMICOS)
// Mantém separação estrita dos dados agregados corporativos do COPSOQ II e armazena os fatores
// preventivos por GHE em ghe_catalogo.conclusoes.fatores_psicossociais_nr01.
// ============================================

const PSICO_DIMENSOES_NR01_PADRAO = [
    'Exigências Quantitativas e Ritmo de Trabalho',
    'Exigências Cognitivas e Emocionais',
    'Organização e Horários / Turnos de Trabalho',
    'Autonomia e Controle sobre o Trabalho',
    'Clareza e Conflito de Papéis Operacionais',
    'Apoio Social, Liderança e Comunicação',
    'Relacionamento Interpessoal e Clima Organizacional',
    'Interface Trabalho-Indivíduo / Condições Ergonômicas',
    'Outro'
];

const PSICO_STATUS_NR01_OPCOES = [
    'Não Avaliado',
    'Controlado',
    'Monitoramento Preventivo',
    'Atenção / Intervenção Recomendada',
    'Ação Prioritária'
];

let psicoGheAtivoId = null;
let psicoGheSessionId = '';
let psicoGheSalvandoSessionId = null;
let psicoGheSalvandoGheId = null;
let psicoGheBaseUpdatedAt = undefined;
let psicoGheBaseConclusoesJson = undefined;
let psicoGheBaseRiscosJson = undefined;
let psicoGheDraftFatores = [];
let psicoGheDirty = false;
let psicoGheDelegatedBound = false;

function gerarUidFatorPsicoGhe() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return 'fator_' + crypto.randomUUID();
    }
    return 'fator_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function normalizarFatorPsicoGheItem(item) {
    const obj = (item && typeof item === 'object') ? item : {};
    let dimensao = String(obj.dimensao || PSICO_DIMENSOES_NR01_PADRAO[0]);
    let dimensaoCustom = String(obj.dimensao_custom || '');
    if (!PSICO_DIMENSOES_NR01_PADRAO.includes(dimensao)) {
        dimensaoCustom = dimensao;
        dimensao = 'Outro';
    }
    const statusRaw = String(obj.status_avaliacao || 'Não Avaliado');
    const status = PSICO_STATUS_NR01_OPCOES.includes(statusRaw) ? statusRaw : 'Não Avaliado';

    return {
        uid: String(obj.uid || gerarUidFatorPsicoGhe()),
        dimensao,
        dimensao_custom: dimensao === 'Outro' ? dimensaoCustom : '',
        fator_descricao: String(obj.fator_descricao || ''),
        fonte_geradora: String(obj.fonte_geradora || ''),
        status_avaliacao: status,
        medidas_prevencao: String(obj.medidas_prevencao || ''),
        responsavel: String(obj.responsavel || ''),
        data_avaliacao: String(obj.data_avaliacao || ''),
        proxima_reavaliacao: String(obj.proxima_reavaliacao || '')
    };
}

function carregarDraftFatoresDoGhe(gheId) {
    const ghe = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo))
        ? allGheCatalogo.find(g => String(g.id) === String(gheId))
        : null;
    const listaPersistida = Array.isArray(ghe?.conclusoes?.fatores_psicossociais_nr01)
        ? ghe.conclusoes.fatores_psicossociais_nr01
        : [];
    psicoGheDraftFatores = listaPersistida.map(item => normalizarFatorPsicoGheItem(JSON.parse(JSON.stringify(item))));
    psicoGheBaseUpdatedAt = ghe ? (ghe.updated_at ?? null) : undefined;
    psicoGheBaseConclusoesJson = ghe ? JSON.stringify(ghe.conclusoes || {}) : undefined;
    psicoGheBaseRiscosJson = ghe ? JSON.stringify(ghe.riscos || []) : undefined;
    psicoGheSessionId = typeof gerarSessionIdPsicossocial === 'function'
        ? gerarSessionIdPsicossocial()
        : ('sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10));
    psicoGheDirty = false;
}

async function garantirDadosGestaoPsicoGhe(forcarRecarga = false) {
    const container = document.getElementById('psicoGestaoGheContainer');
    try {
        if (forcarRecarga || !Array.isArray(allGheCatalogo) || allGheCatalogo.length === 0) {
            if (container) {
                container.innerHTML = '<div class="db-chart-card"><div class="db-list-empty">Carregando catálogo de Setores / GHEs...</div></div>';
            }
            const rows = await supabaseFetch('ghe_catalogo', '?select=*');
            allGheCatalogo = Array.isArray(rows) ? rows : [];
        }
        const ordenados = allGheCatalogo.slice().sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
        if (!psicoGheAtivoId || !ordenados.some(g => String(g.id) === String(psicoGheAtivoId))) {
            psicoGheAtivoId = ordenados[0]?.id || null;
            if (psicoGheAtivoId) {
                carregarDraftFatoresDoGhe(psicoGheAtivoId);
            } else {
                psicoGheDraftFatores = [];
                psicoGheDirty = false;
            }
        } else if (!psicoGheSessionId || forcarRecarga) {
            carregarDraftFatoresDoGhe(psicoGheAtivoId);
        }
        renderGestaoPsicossocialGhe();
        return true;
    } catch (err) {
        console.error('Erro ao carregar GHEs na gestão psicossocial NR-01:', err);
        if (container) {
            container.innerHTML = `
                <div class="db-chart-card" style="text-align:center; padding:24px;">
                    <div style="font-size:32px; margin-bottom:8px;">⚠️</div>
                    <div style="font-size:14px; font-weight:700; color:var(--danger); margin-bottom:6px;">Falha ao carregar catálogo de GHEs</div>
                    <div style="font-size:12.5px; color:var(--text-light); margin-bottom:14px;">${escapeHTML(err.message || String(err))}</div>
                    <button class="db-apply-btn" onclick="garantirDadosGestaoPsicoGhe(true)" style="font-size:12px; padding:6px 14px;">🔄 Tentar Novamente</button>
                </div>
            `;
        }
        return false;
    }
}

async function abrirGestaoPsicossocialPorGhe(gheId) {
    if (psicoGheDirty && psicoGheAtivoId && String(psicoGheAtivoId) !== String(gheId)) {
        if (typeof confirm === 'function' && !confirm('Existem alterações não salvas nos fatores NR-01 do GHE atual. Deseja descartá-las e abrir outro GHE?')) {
            return false;
        }
    }
    if (typeof showDbPage === 'function') {
        showDbPage('psicossocial');
    }
    psicoGheAtivoId = gheId || psicoGheAtivoId;
    psicoGheSessionId = ''; // Força inicialização limpa do draft para o GHE solicitado
    showPsicossocialSubtab('ghe');
    return true;
}

function selecionarGheGestaoPsicossocial(novoGheId) {
    if (!novoGheId || String(novoGheId) === String(psicoGheAtivoId)) return true;
    if (psicoGheDirty) {
        if (typeof confirm === 'function' && !confirm('Existem alterações não salvas no rascunho deste GHE. Deseja descartá-las e trocar de GHE?')) {
            const sel = document.getElementById('psicoGheSeletor');
            if (sel) sel.value = psicoGheAtivoId || '';
            return false;
        }
    }
    psicoGheAtivoId = novoGheId;
    carregarDraftFatoresDoGhe(novoGheId);
    renderGestaoPsicossocialGhe();
    return true;
}

function voltarParaMatrizRiscoDoGhe(gheId) {
    if (psicoGheDirty) {
        if (typeof confirm === 'function' && !confirm('Existem alterações não salvas nos fatores NR-01 deste GHE. Deseja descartá-las e voltar para a Matriz de Riscos?')) {
            return false;
        }
        psicoGheDirty = false;
    }
    if (typeof showDbPage === 'function') {
        showDbPage('matrizrisco');
    }
    if (typeof selecionarGheMatrizRisco === 'function' && gheId) {
        selecionarGheMatrizRisco(gheId);
    }
    return true;
}

function adicionarFatorPsicossocialGheDraft() {
    if (!psicoGheAtivoId) return;
    psicoGheDraftFatores.push({
        uid: gerarUidFatorPsicoGhe(),
        dimensao: PSICO_DIMENSOES_NR01_PADRAO[0],
        dimensao_custom: '',
        fator_descricao: '',
        fonte_geradora: '',
        status_avaliacao: 'Não Avaliado',
        medidas_prevencao: '',
        responsavel: '',
        data_avaliacao: '',
        proxima_reavaliacao: ''
    });
    psicoGheDirty = true;
    renderGestaoPsicossocialGhe();
}

function removerFatorPsicossocialGheDraft(uid) {
    const idx = psicoGheDraftFatores.findIndex(f => String(f.uid) === String(uid));
    if (idx === -1) return;
    psicoGheDraftFatores.splice(idx, 1);
    psicoGheDirty = true;
    renderGestaoPsicossocialGhe();
}

function atualizarCampoFatorPsicossocialGheDraft(uid, campo, valor) {
    const item = psicoGheDraftFatores.find(f => String(f.uid) === String(uid));
    if (!item) return;
    item[campo] = valor;
    if (campo === 'dimensao' && valor !== 'Outro') {
        item.dimensao_custom = '';
    }
    psicoGheDirty = true;
    if (campo === 'dimensao' || campo === 'status_avaliacao') {
        renderGestaoPsicossocialGhe();
    } else {
        const badgeDirty = document.getElementById('psicoGheDirtyBadge');
        if (badgeDirty) badgeDirty.style.display = 'inline-flex';
    }
}

function cancelarEdicaoFatoresPsicossociaisGhe() {
    if (!psicoGheAtivoId) return;
    carregarDraftFatoresDoGhe(psicoGheAtivoId);
    renderGestaoPsicossocialGhe();
    const statusEl = document.getElementById('psicoGheFormStatus');
    if (statusEl) {
        statusEl.textContent = '↩️ Alterações descartadas. Dados originais do GHE restaurados.';
        statusEl.style.color = 'var(--text-light)';
    }
}

async function salvarFatoresPsicossociaisGhe() {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('psicossocial')) return false;
    const statusEl = document.getElementById('psicoGheFormStatus');
    const btnSalvar = document.getElementById('btnSalvarFatoresPsicoGhe');
    const targetGheId = psicoGheAtivoId;
    const saveSessionId = psicoGheSessionId || ('sess_' + Date.now().toString(36));

    // Guarda lógica de concorrência por sessão e por GHE
    if (
        (psicoGheSalvandoSessionId && psicoGheSalvandoSessionId === saveSessionId) ||
        (typeof psicoGheSalvandoGheId !== 'undefined' && psicoGheSalvandoGheId && String(psicoGheSalvandoGheId) === String(targetGheId))
    ) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('Gravação de fatores psicossociais do GHE já em andamento.');
        }
        return false;
    }

    const gheOriginal = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo))
        ? allGheCatalogo.find(g => String(g.id) === String(targetGheId))
        : null;
    if (!gheOriginal) {
        if (statusEl) {
            statusEl.textContent = '❌ Selecione um GHE válido antes de salvar.';
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }

    // Verificação de versão base (Compare-And-Swap em memória): bloqueia se outra tela alterou o GHE desde a abertura do draft
    if (typeof psicoGheBaseUpdatedAt !== 'undefined' && (gheOriginal.updated_at ?? null) !== psicoGheBaseUpdatedAt) {
        if (statusEl) {
            statusEl.textContent = '⚠️ Conflito de concorrência: este GHE foi modificado em outra tela. Recarregue os dados antes de salvar.';
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }
    if (typeof psicoGheBaseConclusoesJson !== 'undefined' && JSON.stringify(gheOriginal.conclusoes || {}) !== psicoGheBaseConclusoesJson) {
        if (statusEl) {
            statusEl.textContent = '⚠️ Conflito de concorrência: as conclusões deste GHE foram modificadas após a leitura inicial. Recarregue os dados antes de salvar.';
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }
    if (typeof psicoGheBaseRiscosJson !== 'undefined' && JSON.stringify(gheOriginal.riscos || []) !== psicoGheBaseRiscosJson) {
        if (statusEl) {
            statusEl.textContent = '⚠️ Conflito de concorrência: a matriz de riscos deste GHE foi modificada após a leitura inicial. Recarregue os dados antes de salvar.';
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }

    const dimensoesPadrao = (typeof PSICO_DIMENSOES_NR01_PADRAO !== 'undefined' && Array.isArray(PSICO_DIMENSOES_NR01_PADRAO))
        ? PSICO_DIMENSOES_NR01_PADRAO
        : ['Exigências Quantitativas e Ritmo de Trabalho', 'Exigências Cognitivas e Emocionais', 'Organização e Horários / Turnos de Trabalho', 'Autonomia e Controle sobre o Trabalho', 'Clareza e Conflito de Papéis Operacionais', 'Apoio Social, Liderança e Comunicação', 'Relacionamento Interpessoal e Clima Organizacional', 'Interface Trabalho-Indivíduo / Condições Ergonômicas', 'Outro'];
    const statusOpcoes = (typeof PSICO_STATUS_NR01_OPCOES !== 'undefined' && Array.isArray(PSICO_STATUS_NR01_OPCOES))
        ? PSICO_STATUS_NR01_OPCOES
        : ['Não Avaliado', 'Controlado', 'Monitoramento Preventivo', 'Atenção / Intervenção Recomendada', 'Ação Prioritária'];

    // Validação síncrona estrita e congelamento do snapshot ANTES de qualquer await
    const fatoresSnapshot = [];
    for (let i = 0; i < psicoGheDraftFatores.length; i++) {
        const f = psicoGheDraftFatores[i];
        const numItem = i + 1;
        const desc = String(f.fator_descricao || '').trim();
        if (!desc) {
            if (statusEl) {
                statusEl.textContent = `❌ O Fator #${numItem} precisa ter a descrição da condição/exigência preenchida.`;
                statusEl.style.color = 'var(--danger)';
            }
            return false;
        }
        const dim = dimensoesPadrao.includes(f.dimensao) ? f.dimensao : 'Outro';
        const dimCustom = dim === 'Outro' ? String(f.dimensao_custom || '').trim() : '';
        if (dim === 'Outro' && !dimCustom) {
            if (statusEl) {
                statusEl.textContent = `❌ Informe a especificação da dimensão personalizada no Fator #${numItem}.`;
                statusEl.style.color = 'var(--danger)';
            }
            return false;
        }
        const st = statusOpcoes.includes(f.status_avaliacao) ? f.status_avaliacao : 'Não Avaliado';
        const dtAval = String(f.data_avaliacao || '').trim();
        const dtProx = String(f.proxima_reavaliacao || '').trim();
        if (dtAval && dtProx && dtAval > dtProx) {
            if (statusEl) {
                statusEl.textContent = `❌ No Fator #${numItem}, a data da avaliação (${dtAval}) não pode ser posterior à próxima reavaliação (${dtProx}).`;
                statusEl.style.color = 'var(--danger)';
            }
            return false;
        }

        const uidGerado = f.uid ? String(f.uid) : ((typeof gerarUidFatorPsicoGhe === 'function') ? gerarUidFatorPsicoGhe() : ('fator_' + Date.now().toString(36)));
        fatoresSnapshot.push({
            uid: uidGerado,
            dimensao: dim,
            dimensao_custom: dimCustom,
            fator_descricao: desc,
            fonte_geradora: String(f.fonte_geradora || '').trim(),
            status_avaliacao: st,
            medidas_prevencao: String(f.medidas_prevencao || '').trim(),
            responsavel: String(f.responsavel || '').trim(),
            data_avaliacao: dtAval,
            proxima_reavaliacao: dtProx
        });
    }

    const expectedUpdatedAt = gheOriginal.updated_at ?? null;
    const expectedConclusoesJson = JSON.stringify(gheOriginal.conclusoes || {});
    const novoUpdatedAt = new Date().toISOString();

    psicoGheSalvandoSessionId = saveSessionId;
    if (typeof psicoGheSalvandoGheId !== 'undefined') psicoGheSalvandoGheId = targetGheId;
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = '💾 Gravando...';
    }
    if (statusEl) {
        statusEl.textContent = 'Gravando fatores psicossociais do GHE no banco de dados...';
        statusEl.style.color = 'var(--text-light)';
    }

    try {
        // Só preserva outras chaves de conclusoes do cache se a versão base foi capturada na abertura do draft (evita reenviar cache não verificado)
        const temVersaoBaseVerificada = (typeof psicoGheBaseConclusoesJson !== 'undefined' && psicoGheBaseConclusoesJson !== undefined);
        let conclusoesBaseParaMerge = (temVersaoBaseVerificada && gheOriginal.conclusoes && typeof gheOriginal.conclusoes === 'object' && !Array.isArray(gheOriginal.conclusoes))
            ? JSON.parse(JSON.stringify(gheOriginal.conclusoes))
            : {};

        if (typeof supabaseFetch === 'function') {
            const rowsRemotas = await supabaseFetch('ghe_catalogo', '?select=id,conclusoes,updated_at&id=eq.' + encodeURIComponent(targetGheId));
            const remoto = Array.isArray(rowsRemotas) ? rowsRemotas.find(r => String(r.id) === String(targetGheId)) : null;
            if (remoto) {
                const remotoUpdatedAt = remoto.updated_at ?? null;
                const remotoConclusoesJson = JSON.stringify(remoto.conclusoes || {});
                if (remotoUpdatedAt !== expectedUpdatedAt || remotoConclusoesJson !== expectedConclusoesJson) {
                    throw new Error('Conflito de concorrência (Compare-And-Swap): o registro deste GHE foi modificado no servidor após o carregamento. Atualize a tela antes de salvar.');
                }
                conclusoesBaseParaMerge = (remoto.conclusoes && typeof remoto.conclusoes === 'object' && !Array.isArray(remoto.conclusoes))
                    ? JSON.parse(JSON.stringify(remoto.conclusoes))
                    : {};
            }
        }

        conclusoesBaseParaMerge.fatores_psicossociais_nr01 = fatoresSnapshot;

        // Atualização seletiva estrita via Compare-And-Swap (NUNCA envia riscos, cargos, nome ou quantidade_oficial do cache e sem fallback desprotegido)
        if (typeof supabasePatch !== 'function') {
            throw new Error('Operação condicional supabasePatch obrigatória para salvar fatores do GHE com Compare-And-Swap.');
        }
        const casFilter = expectedUpdatedAt
            ? `id=eq.${encodeURIComponent(targetGheId)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
            : `id=eq.${encodeURIComponent(targetGheId)}&updated_at=is.null`;
        const patchRes = await supabasePatch('ghe_catalogo', casFilter, {
            conclusoes: conclusoesBaseParaMerge,
            updated_at: novoUpdatedAt
        });
        if (!Array.isArray(patchRes) || patchRes.length === 0) {
            throw new Error('Conflito de concorrência (Compare-And-Swap): o GHE foi alterado concorrentemente por outra sessão.');
        }

        // Atualiza memória oficial do catálogo de GHEs (preservando demais campos intactos)
        gheOriginal.conclusoes = JSON.parse(JSON.stringify(conclusoesBaseParaMerge));
        gheOriginal.updated_at = novoUpdatedAt;

        // Só atualiza a versão-base ativa e o draft/UI se o usuário continuar na mesma sessão e no mesmo GHE
        if (psicoGheSessionId === saveSessionId && String(psicoGheAtivoId) === String(targetGheId)) {
            if (typeof psicoGheBaseUpdatedAt !== 'undefined') psicoGheBaseUpdatedAt = novoUpdatedAt;
            if (typeof psicoGheBaseConclusoesJson !== 'undefined') psicoGheBaseConclusoesJson = JSON.stringify(conclusoesBaseParaMerge);
            const draftAtualNormalizado = Array.isArray(psicoGheDraftFatores)
                ? psicoGheDraftFatores.map(item => normalizarFatorPsicoGheItem(JSON.parse(JSON.stringify(item))))
                : [];
            const houveEdicaoDuranteSaveGhe = JSON.stringify(draftAtualNormalizado) !== JSON.stringify(fatoresSnapshot);
            if (houveEdicaoDuranteSaveGhe) {
                psicoGheDirty = true;
                renderGestaoPsicossocialGhe();
                const novoStatusEl = document.getElementById('psicoGheFormStatus');
                if (novoStatusEl) {
                    novoStatusEl.textContent = '⚠️ A versão anterior foi salva no GHE, mas houve novas alterações durante o envio. Revise o rascunho mantido na tela e clique em Salvar novamente.';
                    novoStatusEl.style.color = 'var(--warning, #d97706)';
                }
            } else {
                psicoGheDraftFatores = fatoresSnapshot.map(item => normalizarFatorPsicoGheItem(JSON.parse(JSON.stringify(item))));
                psicoGheDirty = false;
                renderGestaoPsicossocialGhe();
                const novoStatusEl = document.getElementById('psicoGheFormStatus');
                if (novoStatusEl) {
                    novoStatusEl.textContent = '✅ Fatores psicossociais e ergonômicos (NR-01 GRO) salvos com sucesso no GHE.';
                    novoStatusEl.style.color = 'var(--success)';
                }
            }
        }
        return true;
    } catch (err) {
        console.error('Erro ao salvar fatores psicossociais do GHE:', err);
        if (statusEl && psicoGheSessionId === saveSessionId && String(psicoGheAtivoId) === String(targetGheId)) {
            statusEl.textContent = '❌ Falha ao salvar fatores do GHE: ' + (err.message || err);
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    } finally {
        if (psicoGheSalvandoSessionId === saveSessionId) {
            psicoGheSalvandoSessionId = null;
        }
        if (typeof psicoGheSalvandoGheId !== 'undefined' && String(psicoGheSalvandoGheId) === String(targetGheId)) {
            psicoGheSalvandoGheId = null;
        }
        if (!psicoGheSalvandoSessionId || psicoGheSessionId === saveSessionId) {
            const btnAtual = document.getElementById('btnSalvarFatoresPsicoGhe');
            if (btnAtual) {
                btnAtual.disabled = false;
                btnAtual.textContent = '💾 Salvar Fatores deste GHE';
            }
        }
    }
}

function vincularListenersDelegadosPsicoGhe() {
    if (psicoGheDelegatedBound || typeof document === 'undefined') return;
    const container = document.getElementById('psicoGestaoGheContainer');
    if (!container || typeof container.addEventListener !== 'function') return;

    container.addEventListener('input', (e) => {
        const el = e.target;
        if (!el || !el.dataset || !el.dataset.psicoGheUid || !el.dataset.psicoGheField) return;
        const field = el.dataset.psicoGheField;
        if (field === 'dimensao' || field === 'status_avaliacao') return;
        atualizarCampoFatorPsicossocialGheDraft(el.dataset.psicoGheUid, field, el.value);
    });

    container.addEventListener('change', (e) => {
        const el = e.target;
        if (!el) return;
        if (el.id === 'psicoGheSeletor') {
            selecionarGheGestaoPsicossocial(el.value);
            return;
        }
        if (el.dataset && el.dataset.psicoGheUid && el.dataset.psicoGheField) {
            atualizarCampoFatorPsicossocialGheDraft(el.dataset.psicoGheUid, el.dataset.psicoGheField, el.value);
        }
    });

    container.addEventListener('click', (e) => {
        const btnRemover = e.target.closest ? e.target.closest('[data-psico-ghe-remove-uid]') : null;
        if (btnRemover && btnRemover.dataset.psicoGheRemoveUid) {
            removerFatorPsicossocialGheDraft(btnRemover.dataset.psicoGheRemoveUid);
            return;
        }
        const btnVoltar = e.target.closest ? e.target.closest('[data-psico-ghe-voltar]') : null;
        if (btnVoltar && btnVoltar.dataset.psicoGheVoltar) {
            voltarParaMatrizRiscoDoGhe(btnVoltar.dataset.psicoGheVoltar);
        }
    });

    psicoGheDelegatedBound = true;
}

function corBadgeStatusPsicoNr01(status) {
    switch (status) {
        case 'Controlado':
            return { bg: '#dcfce7', color: '#166534', border: '#86efac', icon: '🟢' };
        case 'Monitoramento Preventivo':
            return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', icon: '🔵' };
        case 'Atenção / Intervenção Recomendada':
            return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', icon: '🟡' };
        case 'Ação Prioritária':
            return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '🔴' };
        default:
            return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: '⚪' };
    }
}

function renderGestaoPsicossocialGhe() {
    const container = document.getElementById('psicoGestaoGheContainer');
    if (!container) return;
    vincularListenersDelegadosPsicoGhe();

    const grupos = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo))
        ? allGheCatalogo.slice().sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
        : [];

    if (grupos.length === 0) {
        container.innerHTML = `
            <div class="db-chart-card">
                <div class="db-list-empty">Nenhum GHE cadastrado no catálogo.</div>
            </div>
        `;
        return;
    }

    const ghe = grupos.find(g => String(g.id) === String(psicoGheAtivoId)) || grupos[0];
    if (String(psicoGheAtivoId) !== String(ghe.id)) {
        psicoGheAtivoId = ghe.id;
        carregarDraftFatoresDoGhe(ghe.id);
    }

    const cargos = Array.isArray(ghe.cargos) ? ghe.cargos : [];
    const riscosErgonomicosMatriz = (Array.isArray(ghe.riscos) ? ghe.riscos : []).filter(r => {
        const tipo = String(r.tipo || '').toLowerCase();
        return tipo.includes('ergon') || tipo.includes('psico');
    });

    const totalFatores = psicoGheDraftFatores.length;
    const qtdPrioritarios = psicoGheDraftFatores.filter(f => f.status_avaliacao === 'Ação Prioritária' || f.status_avaliacao === 'Atenção / Intervenção Recomendada').length;
    const qtdControlados = psicoGheDraftFatores.filter(f => f.status_avaliacao === 'Controlado' || f.status_avaliacao === 'Monitoramento Preventivo').length;
    const qtdNaoAvaliados = psicoGheDraftFatores.filter(f => !f.status_avaliacao || f.status_avaliacao === 'Não Avaliado').length;

    container.innerHTML = `
        <!-- Banner de Diretriz Técnica NR-01 GRO / Anonimato COPSOQ II -->
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:flex-start; gap:10px; font-size:12.5px; color:#1e40af;">
            <span style="font-size:18px; line-height:1;">🛡️</span>
            <div>
                <b>Gestão Preventiva de Fatores Psicossociais e Organizacionais por GHE (NR-01 GRO / NR-17):</b>
                Este painel registra a avaliação organizacional e as medidas preventivas específicas do Grupo Homogêneo de Exposição (GHE) selecionado.
                Em respeito à confidencialidade ética e validade estatística, os resultados do questionário anônimo <b>COPSOQ II Global</b> permanecem agregados corporativamente e não são atribuídos individualmente nem retroativamente aos GHEs.
            </div>
        </div>

        <!-- Barra de Seleção de GHE e Navegação Cruzada -->
        <div class="db-chart-card" style="margin-bottom:16px; padding:14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; min-width:260px;">
                    <label for="psicoGheSeletor" style="font-size:13px; font-weight:700; color:var(--text); white-space:nowrap;">Setor / GHE Ativo:</label>
                    <select id="psicoGheSeletor" style="padding:8px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-weight:600; min-width:260px; flex:1; max-width:460px;">
                        ${grupos.map(g => `<option value="${escapeHTML(g.id)}" ${String(g.id) === String(ghe.id) ? 'selected' : ''}>GHE ${escapeHTML(g.id)} — ${escapeHTML(g.nome || '')}</option>`).join('')}
                    </select>
                    <span id="psicoGheDirtyBadge" style="display:${psicoGheDirty ? 'inline-flex' : 'none'}; align-items:center; gap:4px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px;">
                        ⚠️ Alterações não salvas
                    </span>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="db-clear-btn" data-psico-ghe-voltar="${escapeHTML(ghe.id)}" style="font-size:12px; padding:7px 12px;">
                        ⬅️ Voltar à Matriz de Riscos do GHE ${escapeHTML(ghe.id)}
                    </button>
                    <button type="button" class="db-apply-btn" onclick="adicionarFatorPsicossocialGheDraft()" style="font-size:12px; padding:7px 14px; background:#2563eb;">
                        ➕ Adicionar Fator NR-01 ao GHE
                    </button>
                </div>
            </div>

            <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border); display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-light);">
                <span><b>GHE:</b> ${escapeHTML(ghe.id)} — ${escapeHTML(ghe.nome || '')}</span>
                <span><b>Cargos vinculados:</b> ${cargos.length > 0 ? cargos.map(c => escapeHTML(c.cargo || c.funcao || '')).join(', ') : 'Nenhum cargo listado'}</span>
                <span><b>Riscos Ergonômicos na Matriz PGR:</b> ${riscosErgonomicosMatriz.length} identificado(s)</span>
            </div>
        </div>

        <!-- KPIs do GHE Selecionado -->
        <div class="db-kpi-grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-bottom:16px;">
            <div class="db-kpi-card db-kpi-primary">
                <div class="db-kpi-value">${totalFatores}</div>
                <div class="db-kpi-label">Fatores NR-01 no GHE</div>
            </div>
            <div class="db-kpi-card db-kpi-danger">
                <div class="db-kpi-value">${qtdPrioritarios}</div>
                <div class="db-kpi-label">Atenção / Ação Prioritária</div>
            </div>
            <div class="db-kpi-card db-kpi-success">
                <div class="db-kpi-value">${qtdControlados}</div>
                <div class="db-kpi-label">Controlados / Monitorados</div>
            </div>
            <div class="db-kpi-card db-kpi-warning">
                <div class="db-kpi-value">${qtdNaoAvaliados}</div>
                <div class="db-kpi-label">Não Avaliados (Pendentes)</div>
            </div>
        </div>

        <!-- Resumo de Riscos Ergonômicos já constantes na Matriz do GHE -->
        ${riscosErgonomicosMatriz.length > 0 ? `
        <div class="db-chart-card" style="margin-bottom:16px; padding:12px 16px; background:var(--bg);">
            <div style="font-size:12.5px; font-weight:700; color:var(--text); margin-bottom:6px;">
                🦾 Riscos Ergonômicos / Organizacionais já Mapeados no Inventário PGR deste GHE (${riscosErgonomicosMatriz.length})
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                ${riscosErgonomicosMatriz.map(r => `
                    <span style="background:var(--bg-card, #fff); border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:11.5px; color:var(--text);">
                        <b>${escapeHTML(r.agente || 'Agente')}:</b> ${escapeHTML(r.fonte_geradora || 'Sem fonte informada')}
                        ${r.classe_risco ? ` · <span style="color:var(--text-light);">Classe ${escapeHTML(r.classe_risco)}</span>` : ''}
                    </span>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Lista de Fatores Psicossociais e Organizacionais do GHE -->
        <div class="db-chart-card" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                <div class="db-chart-title" style="margin-bottom:0;">📋 Inventário de Fatores Psicossociais e Organizacionais do GHE ${escapeHTML(ghe.id)}</div>
                <button type="button" class="db-apply-btn" onclick="adicionarFatorPsicossocialGheDraft()" style="font-size:12px; padding:6px 12px;">+ Novo Fator</button>
            </div>

            ${psicoGheDraftFatores.length === 0 ? `
                <div class="db-list-empty" style="padding:28px 16px;">
                    <div style="font-size:28px; margin-bottom:6px;">🛡️</div>
                    <div style="font-weight:700; color:var(--text); margin-bottom:4px;">Nenhum fator psicossocial/organizacional registrado para o GHE ${escapeHTML(ghe.id)}</div>
                    <div style="font-size:12px; color:var(--text-light); margin-bottom:12px;">Clique em <b>"+ Novo Fator"</b> para parametrizar dimensões da NR-01 GRO (ritmo, carga cognitiva, turnos, autonomia, apoio social e medidas preventivas) para este grupo operacional.</div>
                    <button type="button" class="db-apply-btn" onclick="adicionarFatorPsicossocialGheDraft()" style="font-size:12px; padding:7px 14px;">➕ Cadastrar Primeiro Fator deste GHE</button>
                </div>
            ` : psicoGheDraftFatores.map((f, idx) => {
                const badge = corBadgeStatusPsicoNr01(f.status_avaliacao);
                return `
                <div style="border:1px solid var(--border); border-radius:10px; padding:14px; margin-bottom:12px; background:var(--bg);">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-weight:800; font-size:13px; color:var(--text);">Fator #${idx + 1}</span>
                            <span style="background:${badge.bg}; color:${badge.color}; border:1px solid ${badge.border}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">
                                ${badge.icon} ${escapeHTML(f.status_avaliacao || 'Não Avaliado')}
                            </span>
                        </div>
                        <button type="button" class="db-clear-btn" data-psico-ghe-remove-uid="${escapeHTML(f.uid)}" style="color:var(--danger); border-color:var(--danger); font-size:11.5px; padding:4px 10px;">
                            🗑️ Remover Fator
                        </button>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:10px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Dimensão NR-01 / Ergonômica<br>
                            <select data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="dimensao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                                ${PSICO_DIMENSOES_NR01_PADRAO.map(d => `<option value="${escapeHTML(d)}" ${f.dimensao === d ? 'selected' : ''}>${escapeHTML(d)}</option>`).join('')}
                            </select>
                        </label>

                        ${f.dimensao === 'Outro' ? `
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Especificar Dimensão Personalizada *<br>
                            <input type="text" value="${escapeHTML(f.dimensao_custom || '')}" placeholder="Descreva a dimensão..." data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="dimensao_custom" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>
                        ` : ''}

                        <label style="font-size:12px; font-weight:600; color:var(--text);">Status Preventivo GRO / NR-01<br>
                            <select data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="status_avaliacao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                                ${PSICO_STATUS_NR01_OPCOES.map(st => `<option value="${escapeHTML(st)}" ${f.status_avaliacao === st ? 'selected' : ''}>${escapeHTML(st)}</option>`).join('')}
                            </select>
                        </label>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; margin-bottom:10px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Condição / Exigência Observada na Atividade *<br>
                            <input type="text" value="${escapeHTML(f.fator_descricao || '')}" placeholder="Ex: Atendimento simultâneo de demandas operacionais sob pressão de tempo" data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="fator_descricao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>

                        <label style="font-size:12px; font-weight:600; color:var(--text);">Fonte Organizacional / Processo<br>
                            <input type="text" value="${escapeHTML(f.fonte_geradora || '')}" placeholder="Ex: Regime de turno, pico operacional, interface com terceiros" data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="fonte_geradora" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>
                    </div>

                    <div style="margin-bottom:10px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text); display:block;">Medidas Preventivas e Controles Organizacionais (NR-01 / NR-17)<br>
                            <textarea rows="2" placeholder="Descreva pausas, rodízio, dimensionamento de equipe, treinamento de liderança, canais de apoio..." data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="medidas_prevencao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box; font-family:inherit;">${escapeHTML(f.medidas_prevencao || '')}</textarea>
                        </label>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
                        <label style="font-size:12px; font-weight:600; color:var(--text);">Responsável pelo Acompanhamento<br>
                            <input type="text" value="${escapeHTML(f.responsavel || '')}" placeholder="Ex: Engenharia SST / Liderança Operacional" data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="responsavel" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>

                        <label style="font-size:12px; font-weight:600; color:var(--text);">Data da Avaliação (opcional)<br>
                            <input type="date" value="${escapeHTML(f.data_avaliacao || '')}" data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="data_avaliacao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>

                        <label style="font-size:12px; font-weight:600; color:var(--text);">Próxima Reavaliação / Monitoramento<br>
                            <input type="date" value="${escapeHTML(f.proxima_reavaliacao || '')}" data-psico-ghe-uid="${escapeHTML(f.uid)}" data-psico-ghe-field="proxima_reavaliacao" style="width:100%; margin-top:4px; padding:7px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                        </label>
                    </div>
                </div>
                `;
            }).join('')}

            <!-- Barra de Ações Transacionais do GHE -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:14px; padding-top:12px; border-top:1px solid var(--border);">
                <div id="psicoGheFormStatus" style="font-size:12.5px; font-weight:600;"></div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="db-clear-btn" onclick="cancelarEdicaoFatoresPsicossociaisGhe()" style="padding:8px 14px; font-size:12.5px;">
                        ↩️ Cancelar / Restaurar GHE
                    </button>
                    <button type="button" id="btnSalvarFatoresPsicoGhe" class="db-apply-btn" onclick="salvarFatoresPsicossociaisGhe()" style="padding:8px 16px; font-size:12.5px;">
                        💾 Salvar Fatores deste GHE
                    </button>
                </div>
            </div>
        </div>
    `;
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
var configuracoesSistemaCarregadas = false;

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
var BRIGADA_PISO_NORMATIVO_NBR14276 = { baixo: 2, medio: 2, alto: 4 };

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

var BRIGADA_NIVEL_LABELS = {
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
