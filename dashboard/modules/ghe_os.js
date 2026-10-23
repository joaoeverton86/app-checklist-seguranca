// ==============================================================================
// MODULO: GHE, MATRIZ DE RISCO AIHA, MATRIZ NR-6 E ORDENS DE SERVICO (NR-01)
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// GHE (Grupo Homogêneo de Exposição) - catálogo oficial importado do Quadro Funcional
// da empresa (ver importarQuadroFuncionalXLS), comparado com a quantidade real de
// colaboradores ativos hoje em colaboradores_efetivo.ghe. Mesmo raciocínio de
// gerenciamento de Setores acima, só que "criar um grupo" não existe aqui - o catálogo
// só nasce da importação da planilha oficial, nunca é criado manualmente. Independente
// do GHE usado no PCMSO (PCMSO_SETOR_FUNCAO_GHE, mais acima), que resolve por
// setor+função e não lê este campo.
// ============================================

let gheAtualGerenciado = null;

// colaboradores_efetivo.ghe é texto livre - normaliza número solto ("1") pro mesmo
// formato de 2 dígitos usado no catálogo ("01") antes de comparar.
function normalizarGhe(v) {
    const s = String(v || '').trim();
    return /^\d+$/.test(s) ? s.padStart(2, '0') : s;
}

function contagemAtualPorGhe() {
    const contagem = new Map();
    allEfetivo.forEach(e => {
        if (!colaboradorEstaAtivo(e) || !e.ghe) return;
        const chave = normalizarGhe(e.ghe);
        contagem.set(chave, (contagem.get(chave) || 0) + 1);
    });
    return contagem;
}

function renderGheLista() {
    const container = document.getElementById('gheLista');
    const resumo = document.getElementById('gheResumo');
    if (!container) return;

    if (allGheCatalogo.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum catálogo de GHE importado ainda. Envie o Quadro Funcional em Configurações.</div>';
        if (resumo) resumo.textContent = '';
        return;
    }

    const contagem = contagemAtualPorGhe();
    const grupos = allGheCatalogo.slice().sort((a, b) => a.id.localeCompare(b.id));
    const totalOficial = grupos.reduce((s, g) => s + (g.quantidade_oficial || 0), 0);
    const totalAtual = Array.from(contagem.values()).reduce((s, v) => s + v, 0);
    if (resumo) resumo.textContent = `${grupos.length} grupo(s) do quadro oficial — ${totalOficial} pessoa(s) no quadro, ${totalAtual} ativo(s) hoje classificado(s) por GHE`;

    container.innerHTML = grupos.map(g => {
        const atual = contagem.get(g.id) || 0;
        const oficial = g.quantidade_oficial || 0;
        const delta = atual - oficial;
        let corDelta = 'var(--success)', textoDelta = '✓ bate com o quadro';
        if (delta > 0) { corDelta = 'var(--text-light)'; textoDelta = `+${delta} a mais que o quadro`; }
        else if (delta < 0) { corDelta = 'var(--danger)'; textoDelta = `${delta} a menos que o quadro`; }
        return `<div class="db-list-item" style="cursor:pointer;" onclick="abrirGerenciarGhe('${escapeHTML(g.id)}')">
            <div class="db-list-item-title">${escapeHTML(g.id)} — ${escapeHTML(g.nome)}</div>
            <div class="db-list-item-sub">Oficial: ${oficial} — Atual: ${atual} — <span style="color:${corDelta}; font-weight:600;">${textoDelta}</span></div>
        </div>`;
    }).join('');
}

// Fonte: Mapa de Riscos oficial (Clínica ENGMED, PGR/NR-01), reconhecimento por GHE -
// não é o mesmo dado da matriz P×S da APR (que é por tarefa/equipe, não por
// função/setor). A maioria dos GHEs administrativos legitimamente não tem exposição
// significativa segundo o laudo ("Não foram identificados riscos significativos") -
// riscos=[] nesses casos reflete o próprio laudo, não é campo vazio por preguiça.
function gravidadeGheEstilo(g) {
    const n = parseInt(g, 10);
    if (n <= 1) return { cor: '#1a7f4b', bg: '#e6f7ee' };
    if (n === 2) return { cor: '#c2650a', bg: '#fef1e0' };
    return { cor: '#c0392b', bg: '#fdf2f2' };
}

function renderGheMapaRiscosHtml(g) {
    const riscos = Array.isArray(g.riscos) ? g.riscos : [];
    const c = g.conclusoes || {};
    const temConclusao = c.gfip_codigo || c.gfip_descricao || c.periculosidade || c.insalubridade;
    const conclusaoHtml = temConclusao ? `
        <div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px; font-size:12px; background:var(--bg);">
            <div style="font-weight:700; margin-bottom:4px;">📋 Conclusões</div>
            ${(c.gfip_codigo || c.gfip_descricao) ? `<div><b>GFIP ${escapeHTML(c.gfip_codigo || '')}:</b> ${escapeHTML(c.gfip_descricao || '')}</div>` : ''}
            ${c.periculosidade ? `<div><b>Periculosidade:</b> ${escapeHTML(c.periculosidade)}</div>` : ''}
            ${c.insalubridade ? `<div><b>Insalubridade:</b> ${escapeHTML(c.insalubridade)}</div>` : ''}
        </div>` : '';

    if (riscos.length === 0) {
        return conclusaoHtml + '<div class="db-list-empty">✅ Não foram identificados riscos significativos para este grupo (conforme laudo do Mapa de Riscos).</div>';
    }
    return conclusaoHtml + riscos.map(r => {
        // Colore pelo gravidade_label (mesma fonte que KPIs/gráfico/lista de Riscos Altos
        // usam), não mais só pelo número de gravidade - gravidadeGheEstilo() assumia uma
        // escala pequena (1-3, do laudo original importado), que não bate mais com o valor
        // de 1-25 (probabilidade × severidade) que um risco reclassificado pelos novos
        // campos passa a ter. Cai pra gravidadeGheEstilo() só se o rótulo não for
        // reconhecido (dado antigo sem gravidade_label).
        const grav = NIVEIS_RISCO_COR[r.gravidade_label]
            ? { cor: NIVEIS_RISCO_COR[r.gravidade_label], bg: NIVEIS_RISCO_COR[r.gravidade_label] + '22' }
            : gravidadeGheEstilo(r.gravidade);
        return `<div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                <div><b>${escapeHTML(r.tipo_agente || '')}</b> — ${escapeHTML(r.agente || '')}</div>
                <span style="padding:3px 10px; border-radius:12px; background:${grav.bg}; color:${grav.cor}; font-weight:700; font-size:11px;">
                    Gravidade ${escapeHTML(String(r.gravidade ?? ''))} - ${escapeHTML(r.gravidade_label || '')}
                </span>
            </div>
            <div style="font-size:12px; color:var(--text-light); margin-bottom:4px;">${escapeHTML(r.descricao || '')}</div>
            <div style="font-size:12px;"><b>Danos à saúde:</b> ${escapeHTML(r.danos_saude || '—')}</div>
            <div style="font-size:12px;"><b>Fontes geradoras:</b> ${escapeHTML(r.fontes_geradoras || '—')}${r.tipo_tempo_exposicao ? ` · <b>Exposição:</b> ${escapeHTML(r.tipo_tempo_exposicao)}` : ''}</div>
            <div style="font-size:12px;"><b>Medidas/sugestões:</b> ${escapeHTML(r.sugestoes || '—')}</div>
            ${r.epis_recomendados ? `<div style="font-size:12px;"><b>EPIs recomendados:</b> ${escapeHTML(r.epis_recomendados)}</div>` : ''}
            ${r.epcs_recomendados ? `<div style="font-size:12px;"><b>EPCs recomendados:</b> ${escapeHTML(r.epcs_recomendados)}</div>` : ''}
            ${r.situacao_controle ? `<div style="font-size:11px; color:var(--text-light); margin-top:4px;">Situação de controle: ${escapeHTML(r.situacao_controle)}</div>` : ''}
        </div>`;
    }).join('');
}

// Expande em linha o painel de edição completo do cargo clicado (Cargo/Função/CBO,
// Descrição das Atividades, Agentes, EPIs/EPCs, Recomendações etc.) - mesmo padrão de
// expandir-em-linha já usado em Compras/APR, em vez de modal. Toda linha é clicável,
// mesmo cargo recém-adicionado manualmente e ainda sem nenhum campo preenchido - antes
// só abria quem já tinha descricao_atividade ou cbo (vindo da planilha oficial), o que
// tornava impossível editar/criar um cargo à mão.
let gheCargoExpandidoIdx = null;

function toggleCargoGheDescricao(idx) {
    gheCargoExpandidoIdx = gheCargoExpandidoIdx === idx ? null : idx;
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (g) document.getElementById('gheCargosOficiais').innerHTML = renderGheCargosHtml(g);
}

// Cargo em branco pro "+ Adicionar cargo" - mesmas chaves de um cargo vindo da
// importação da planilha oficial, só que todas vazias pra preencher na hora.
function cargoGheVazio() {
    return {
        cargo: '', funcao: '', cbo: '', quantidade: '', descricao_atividade: '',
        agentes: { fisico: '', quimico: '', biologico: '', ergonomico: '', acidentes: '' },
        epis_necessarios: [], epcs_necessarios: [], recomendacoes: '', procedimentos_acidentes: '', observacoes: ''
    };
}

function adicionarCargoGhe() {
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g) return;
    if (!Array.isArray(g.cargos)) g.cargos = [];
    g.cargos.push(cargoGheVazio());
    gheCargoExpandidoIdx = g.cargos.length - 1; // já abre expandido pra preencher na hora
    document.getElementById('gheCargosOficiais').innerHTML = renderGheCargosHtml(g);
    document.getElementById('gheCargosOficiais').scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Sugestões (datalist) coletadas de QUALQUER cargo de QUALQUER grupo de GHE - digitar
// continua livre (datalist não trava a digitação, só sugere), mas reaproveitar o que já
// existe evita duas entradas diferentes no sistema por causa de uma diferença mínima de
// digitação (ex: "Capacete de Segurança" vs "Capacete Segurança"), que atrapalhava
// qualquer contagem/padronização (achado real reportado pelo usuário).
function coletarSugestoesGheCargos(extrair) {
    const valores = new Set();
    allGheCatalogo.forEach(g => (Array.isArray(g.cargos) ? g.cargos : []).forEach(c => {
        const v = extrair(c);
        (Array.isArray(v) ? v : [v]).forEach(item => { if (item && String(item).trim()) valores.add(String(item).trim()); });
    }));
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
}

function optsDatalistGhe(valores) {
    return valores.map(v => `<option value="${escapeHTML(v)}">`).join('');
}

// Lista de EPI/EPC de cada cargo em edição - array de strings por índice do cargo (não
// mais textarea "um item por linha"), montada por adicionarGheCargoItem/
// removerGheCargoItem e só vira epis_necessarios/epcs_necessarios de fato no momento de
// salvarCargoAgentesEpi. Resemeada a partir do cargo salvo sempre que a linha (re)abre —
// os 3 pontos que chamam renderGheCargosHtml com uma linha expandida (toggleCargoGheDescricao,
// adicionarCargoGhe, salvarCargoAgentesEpi pós-salvar) - mesmo comportamento que os demais
// campos já têm hoje (fecha sem salvar = perde a edição em andamento).
let gheCargoEpisForm = {};
let gheCargoEpcsForm = {};

function htmlGheCargoItens(i, tipo) {
    const estado = (tipo === 'epis' ? gheCargoEpisForm : gheCargoEpcsForm)[i] || [];
    return estado.length === 0
        ? '<div class="db-list-empty" style="padding:6px 0; font-size:11px;">Nenhum item adicionado.</div>'
        : estado.map((item, idx) => `
            <div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:5px 8px;">
                <span>${escapeHTML(item)}</span>
                <button type="button" onclick="removerGheCargoItem(${i}, '${tipo}', ${idx})" title="Remover" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:13px;">✕</button>
            </div>`).join('');
}

function renderGheCargoItemsLista(i, tipo) {
    const container = document.getElementById(tipo === 'epis' ? `gheCargoEpisLista-${i}` : `gheCargoEpcsLista-${i}`);
    if (container) container.innerHTML = htmlGheCargoItens(i, tipo);
}

function adicionarGheCargoItem(i, tipo) {
    const input = document.getElementById(tipo === 'epis' ? `gheCargoEpiInput-${i}` : `gheCargoEpcInput-${i}`);
    const valor = (input.value || '').trim();
    if (!valor) return;
    const estado = tipo === 'epis' ? gheCargoEpisForm : gheCargoEpcsForm;
    if (!Array.isArray(estado[i])) estado[i] = [];
    if (!estado[i].includes(valor)) estado[i].push(valor);
    input.value = '';
    renderGheCargoItemsLista(i, tipo);
}

function removerGheCargoItem(i, tipo, idx) {
    const estado = tipo === 'epis' ? gheCargoEpisForm : gheCargoEpcsForm;
    if (!Array.isArray(estado[i])) return;
    estado[i].splice(idx, 1);
    renderGheCargoItemsLista(i, tipo);
}

// Copia os campos preenchíveis (tudo, menos Cargo/Função/CBO/Qtd., que identificam ESTE
// cargo) de outro cargo já cadastrado NO MESMO GRUPO pro formulário atual - só nos campos
// (ainda não salvos), pra dar pra revisar/ajustar antes de "💾 Salvar". Motivado por um
// caso real: GRUPO 16 tinha "Técnico de enfermagem em saúde ocupacional" completo, mas
// "TEC. ENFERMEIRO DO TRABALHO" (a função real da colaboradora) ficou sem essas
// informações - digitar tudo de novo na mão era o único jeito antes disso.
function copiarCargoGhe(i) {
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g || !Array.isArray(g.cargos)) return;
    const sel = document.getElementById(`gheCargoCopiarDe-${i}`);
    const origemIdx = parseInt(sel?.value, 10);
    const origem = g.cargos[origemIdx];
    if (!origem) return;
    const nomeOrigem = origem.cargo || origem.funcao || '(sem cargo)';
    if (!confirm(`Copiar os dados de "${nomeOrigem}" pro formulário abaixo? Isso substitui o que estiver preenchido nos campos (ainda não salvos) - revise e clique em "💾 Salvar" pra confirmar.`)) return;

    document.getElementById(`gheCargoDescricaoAtividade-${i}`).value = origem.descricao_atividade || '';
    const ag = origem.agentes || {};
    document.getElementById(`gheCargoFisico-${i}`).value = ag.fisico || '';
    document.getElementById(`gheCargoQuimico-${i}`).value = ag.quimico || '';
    document.getElementById(`gheCargoBiologico-${i}`).value = ag.biologico || '';
    document.getElementById(`gheCargoErgonomico-${i}`).value = ag.ergonomico || '';
    document.getElementById(`gheCargoAcidentes-${i}`).value = ag.acidentes || '';
    document.getElementById(`gheCargoRecomendacoes-${i}`).value = origem.recomendacoes || '';
    document.getElementById(`gheCargoProcedimentosAcidentes-${i}`).value = origem.procedimentos_acidentes || '';
    document.getElementById(`gheCargoObservacoes-${i}`).value = origem.observacoes || '';
    gheCargoEpisForm[i] = Array.isArray(origem.epis_necessarios) ? [...origem.epis_necessarios] : [];
    gheCargoEpcsForm[i] = Array.isArray(origem.epcs_necessarios) ? [...origem.epcs_necessarios] : [];
    renderGheCargoItemsLista(i, 'epis');
    renderGheCargoItemsLista(i, 'epcs');
}

function renderGheCargosHtml(g) {
    const cargos = Array.isArray(g.cargos) ? g.cargos : [];
    if (cargos.length === 0) return '<div class="db-list-empty">Sem cargos cadastrados neste grupo ainda - use "+ Adicionar cargo" acima.</div>';
    const campoMini = 'padding:5px 6px; border:1px solid var(--border); border-radius:6px; font-size:11px; width:100%; box-sizing:border-box;';
    const sugestoesFisico = optsDatalistGhe(coletarSugestoesGheCargos(c => (c.agentes || {}).fisico));
    const sugestoesQuimico = optsDatalistGhe(coletarSugestoesGheCargos(c => (c.agentes || {}).quimico));
    const sugestoesBiologico = optsDatalistGhe(coletarSugestoesGheCargos(c => (c.agentes || {}).biologico));
    const sugestoesErgonomico = optsDatalistGhe(coletarSugestoesGheCargos(c => (c.agentes || {}).ergonomico));
    const sugestoesAcidentes = optsDatalistGhe(coletarSugestoesGheCargos(c => (c.agentes || {}).acidentes));
    const sugestoesEpi = optsDatalistGhe(coletarSugestoesGheCargos(c => c.epis_necessarios));
    const sugestoesEpc = optsDatalistGhe(coletarSugestoesGheCargos(c => c.epcs_necessarios));
    return `<table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead><tr style="text-align:left; color:var(--text-light);">
            <th style="padding:4px 4px; width:18px;"></th><th style="padding:4px 8px;">Cargo</th><th style="padding:4px 8px;">Função</th><th style="padding:4px 8px;">CBO</th><th style="padding:4px 8px;">Qtd. oficial</th>
        </tr></thead>
        <tbody>${cargos.map((c, i) => {
            const expandido = gheCargoExpandidoIdx === i;
            const ag = c.agentes || {};
            if (expandido) {
                gheCargoEpisForm[i] = Array.isArray(c.epis_necessarios) ? [...c.epis_necessarios] : [];
                gheCargoEpcsForm[i] = Array.isArray(c.epcs_necessarios) ? [...c.epcs_necessarios] : [];
            }
            const outrosCargos = cargos.map((c2, idx2) => [idx2, c2]).filter(([idx2]) => idx2 !== i);
            const linhaDetalhe = expandido ? `<tr><td></td><td colspan="4" style="padding:4px 8px 14px;" onclick="event.stopPropagation()">
                <div style="font-weight:600; font-size:11px; margin-bottom:4px;">Identificação do cargo</div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:6px; margin-bottom:8px;">
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Cargo</label><input type="text" id="gheCargoCargo-${i}" value="${escapeHTML(c.cargo || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Função (comparada com colaboradores_efetivo.funcao)</label><input type="text" id="gheCargoFuncao-${i}" value="${escapeHTML(c.funcao || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">CBO</label><input type="text" id="gheCargoCbo-${i}" value="${escapeHTML(c.cbo || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Qtd. oficial</label><input type="text" id="gheCargoQuantidade-${i}" value="${escapeHTML(String(c.quantidade ?? ''))}" style="${campoMini}"></div>
                </div>
                ${outrosCargos.length > 0 ? `<div style="display:flex; align-items:flex-end; gap:6px; margin-bottom:8px;">
                    <div style="flex:1;"><label style="color:var(--text-light); font-size:10.5px; display:block;">Copiar de:</label>
                        <select id="gheCargoCopiarDe-${i}" style="${campoMini}">
                            ${outrosCargos.map(([idx2, c2]) => `<option value="${idx2}">${escapeHTML(c2.cargo || c2.funcao || '(sem cargo)')}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" class="db-clear-btn" style="padding:5px 10px; font-size:11px; white-space:nowrap;" onclick="copiarCargoGhe(${i})">📋 Copiar</button>
                </div>` : ''}
                <div style="margin-bottom:8px;"><label style="color:var(--text-light); font-size:10.5px; display:block;">Descrição das Atividades</label><textarea id="gheCargoDescricaoAtividade-${i}" rows="2" style="${campoMini}">${escapeHTML(c.descricao_atividade || '')}</textarea></div>
                <div style="font-weight:600; font-size:11px; margin-bottom:4px;">Agentes associados às atividades (usado na Ordem de Serviço)</div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:6px; margin-bottom:8px;">
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Físico</label><input type="text" id="gheCargoFisico-${i}" list="gheAgenteFisicoSugestoes" value="${escapeHTML(ag.fisico || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Químico</label><input type="text" id="gheCargoQuimico-${i}" list="gheAgenteQuimicoSugestoes" value="${escapeHTML(ag.quimico || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Biológico</label><input type="text" id="gheCargoBiologico-${i}" list="gheAgenteBiologicoSugestoes" value="${escapeHTML(ag.biologico || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Ergonômico</label><input type="text" id="gheCargoErgonomico-${i}" list="gheAgenteErgonomicoSugestoes" value="${escapeHTML(ag.ergonomico || '')}" style="${campoMini}"></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Acidentes</label><input type="text" id="gheCargoAcidentes-${i}" list="gheAgenteAcidentesSugestoes" value="${escapeHTML(ag.acidentes || '')}" style="${campoMini}"></div>
                </div>
                <datalist id="gheAgenteFisicoSugestoes">${sugestoesFisico}</datalist>
                <datalist id="gheAgenteQuimicoSugestoes">${sugestoesQuimico}</datalist>
                <datalist id="gheAgenteBiologicoSugestoes">${sugestoesBiologico}</datalist>
                <datalist id="gheAgenteErgonomicoSugestoes">${sugestoesErgonomico}</datalist>
                <datalist id="gheAgenteAcidentesSugestoes">${sugestoesAcidentes}</datalist>
                <datalist id="gheEpiSugestoes">${sugestoesEpi}</datalist>
                <datalist id="gheEpcSugestoes">${sugestoesEpc}</datalist>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:6px; margin-bottom:8px;">
                    <div>
                        <label style="color:var(--text-light); font-size:10.5px; display:block;">EPIs necessários</label>
                        <div style="display:flex; gap:6px; margin-bottom:4px;">
                            <input type="text" id="gheCargoEpiInput-${i}" list="gheEpiSugestoes" placeholder="Digite ou selecione um EPI..." style="${campoMini}">
                            <button type="button" class="db-clear-btn" style="padding:5px 10px; font-size:11px; white-space:nowrap;" onclick="adicionarGheCargoItem(${i}, 'epis')">+ Adicionar</button>
                        </div>
                        <div id="gheCargoEpisLista-${i}" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto;">${htmlGheCargoItens(i, 'epis')}</div>
                    </div>
                    <div>
                        <label style="color:var(--text-light); font-size:10.5px; display:block;">EPCs necessários</label>
                        <div style="display:flex; gap:6px; margin-bottom:4px;">
                            <input type="text" id="gheCargoEpcInput-${i}" list="gheEpcSugestoes" placeholder="Digite ou selecione um EPC..." style="${campoMini}">
                            <button type="button" class="db-clear-btn" style="padding:5px 10px; font-size:11px; white-space:nowrap;" onclick="adicionarGheCargoItem(${i}, 'epcs')">+ Adicionar</button>
                        </div>
                        <div id="gheCargoEpcsLista-${i}" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto;">${htmlGheCargoItens(i, 'epcs')}</div>
                    </div>
                </div>
                <div style="font-weight:600; font-size:11px; margin-bottom:4px;">Demais seções da Ordem de Serviço</div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:6px; margin-bottom:8px;">
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Recomendações</label><textarea id="gheCargoRecomendacoes-${i}" rows="2" style="${campoMini}">${escapeHTML(c.recomendacoes || '')}</textarea></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Procedimentos em caso de acidentes</label><textarea id="gheCargoProcedimentosAcidentes-${i}" rows="2" style="${campoMini}">${escapeHTML(c.procedimentos_acidentes || '')}</textarea></div>
                    <div><label style="color:var(--text-light); font-size:10.5px; display:block;">Observações</label><textarea id="gheCargoObservacoes-${i}" rows="2" style="${campoMini}">${escapeHTML(c.observacoes || '')}</textarea></div>
                </div>
                <button class="db-clear-btn" onclick="salvarCargoAgentesEpi(${i})">💾 Salvar</button>
                <button class="db-clear-btn" style="color: var(--danger); border-color: var(--danger);" onclick="removerCargoGhe(${i})">🗑️ Remover cargo</button>
                <span id="gheCargoStatus-${i}" style="font-size:11px; color:var(--text-light); margin-left:8px;"></span>
            </td></tr>` : '';
            return `<tr style="border-top:1px solid var(--border); cursor:pointer;" onclick="toggleCargoGheDescricao(${i})">
                <td style="padding:4px 4px; color:var(--text-light);">${expandido ? '▾' : '▸'}</td>
                <td style="padding:4px 8px;">${escapeHTML(c.cargo || '') || '<span style="color:var(--text-light);">(sem cargo)</span>'}</td>
                <td style="padding:4px 8px;">${escapeHTML(c.funcao || '') || '<span style="color:var(--text-light);">(sem função)</span>'}</td>
                <td style="padding:4px 8px;">${escapeHTML(c.cbo || '')}</td>
                <td style="padding:4px 8px;">${escapeHTML(String(c.quantidade ?? ''))}</td>
            </tr>${linhaDetalhe}`;
        }).join('')}</tbody>
    </table>`;
}

async function salvarCargoAgentesEpi(i) {
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g || !Array.isArray(g.cargos) || !g.cargos[i]) return;
    const statusEl = document.getElementById(`gheCargoStatus-${i}`);
    const cargo = { ...g.cargos[i] };
    cargo.cargo = document.getElementById(`gheCargoCargo-${i}`).value.trim();
    cargo.funcao = document.getElementById(`gheCargoFuncao-${i}`).value.trim();
    cargo.cbo = document.getElementById(`gheCargoCbo-${i}`).value.trim();
    const quantidadeRaw = document.getElementById(`gheCargoQuantidade-${i}`).value.trim();
    cargo.quantidade = quantidadeRaw === '' ? '' : (Number.isNaN(Number(quantidadeRaw)) ? quantidadeRaw : Number(quantidadeRaw));
    cargo.descricao_atividade = document.getElementById(`gheCargoDescricaoAtividade-${i}`).value.trim();
    cargo.agentes = {
        fisico: document.getElementById(`gheCargoFisico-${i}`).value.trim(),
        quimico: document.getElementById(`gheCargoQuimico-${i}`).value.trim(),
        biologico: document.getElementById(`gheCargoBiologico-${i}`).value.trim(),
        ergonomico: document.getElementById(`gheCargoErgonomico-${i}`).value.trim(),
        acidentes: document.getElementById(`gheCargoAcidentes-${i}`).value.trim()
    };
    cargo.epis_necessarios = Array.isArray(gheCargoEpisForm[i]) ? gheCargoEpisForm[i].slice() : [];
    cargo.epcs_necessarios = Array.isArray(gheCargoEpcsForm[i]) ? gheCargoEpcsForm[i].slice() : [];
    cargo.recomendacoes = document.getElementById(`gheCargoRecomendacoes-${i}`).value.trim();
    cargo.procedimentos_acidentes = document.getElementById(`gheCargoProcedimentosAcidentes-${i}`).value.trim();
    cargo.observacoes = document.getElementById(`gheCargoObservacoes-${i}`).value.trim();
    const novoCargos = g.cargos.map((c, idx) => idx === i ? cargo : c);

    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        // Upsert precisa da linha inteira - mesmo cuidado de salvarMapaRiscosGhe.
        await supabaseUpsert('ghe_catalogo', [{
            id: g.id,
            nome: g.nome,
            cargos: novoCargos,
            quantidade_oficial: g.quantidade_oficial,
            riscos: g.riscos || [],
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }]);
        g.cargos = novoCargos;
        // Reflete cargo/função/cbo/quantidade recém-salvos na linha colapsada da tabela.
        document.getElementById('gheCargosOficiais').innerHTML = renderGheCargosHtml(g);
        const statusReRenderizado = document.getElementById(`gheCargoStatus-${i}`);
        if (statusReRenderizado) { statusReRenderizado.textContent = '✅ Salvo.'; statusReRenderizado.style.color = 'var(--success)'; }
    } catch (err) {
        console.error('Erro ao salvar agentes/EPI do cargo:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// Remove um cargo do grupo (por índice) - único jeito de desfazer um "+ Adicionar cargo"
// feito sem querer ou um cargo de teste, já que antes não existia nenhuma forma de tirar
// um cargo da tela depois de criado. Só sai da tela DEPOIS do upsert confirmar - se der
// erro, a linha continua lá pra não passar a impressão de que a remoção funcionou.
async function removerCargoGhe(i) {
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g || !Array.isArray(g.cargos) || !g.cargos[i]) return;
    const cargo = g.cargos[i];
    const nomeExibicao = cargo.cargo || cargo.funcao || '(sem cargo)';
    if (!confirm(`Remover o cargo "${nomeExibicao}" deste grupo? Essa ação não pode ser desfeita.`)) return;

    const statusEl = document.getElementById(`gheCargoStatus-${i}`);
    if (statusEl) { statusEl.textContent = 'Removendo...'; statusEl.style.color = 'var(--text-light)'; }
    const novoCargos = g.cargos.filter((c, idx) => idx !== i);

    try {
        // Upsert precisa da linha inteira - mesmo cuidado de salvarCargoAgentesEpi.
        await supabaseUpsert('ghe_catalogo', [{
            id: g.id,
            nome: g.nome,
            cargos: novoCargos,
            quantidade_oficial: g.quantidade_oficial,
            riscos: g.riscos || [],
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }]);
        g.cargos = novoCargos;
        gheCargoExpandidoIdx = null;
        document.getElementById('gheCargosOficiais').innerHTML = renderGheCargosHtml(g);
        const gerenciarStatusEl = document.getElementById('gheGerenciarStatus');
        if (gerenciarStatusEl) { gerenciarStatusEl.textContent = '🗑️ Cargo removido.'; gerenciarStatusEl.style.color = 'var(--success)'; }
    } catch (err) {
        console.error('Erro ao remover cargo:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha ao remover: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// ============================================
// RECOMENDAÇÕES POR CARGO (GHE) - revisão em lote, mesmo campo cargos[].recomendacoes
// já editável um a um em "Gerenciar GHE" (salvarCargoAgentesEpi acima), só que aqui
// achatado numa lista só com todos os cargos de todos os grupos, pra dar pra revisar
// sistematicamente em vez de abrir grupo por grupo. Não reescreve texto nenhum sozinho -
// só ajuda a achar rápido onde o texto está repetido (selo de duplicidade), quem edita
// e decide o texto novo é o usuário.
// ============================================

function todasRecomendacoesGhe() {
    const linhas = [];
    allGheCatalogo.forEach(g => {
        (Array.isArray(g.cargos) ? g.cargos : []).forEach((c, idx) => {
            linhas.push({ grupoId: g.id, grupoNome: g.nome, cargoIndex: idx, cargo: c.cargo || c.funcao || '(sem nome)', recomendacoes: c.recomendacoes || '' });
        });
    });

    const contagemPorTexto = {};
    linhas.forEach(l => {
        const norm = l.recomendacoes.trim().toLowerCase();
        if (!norm) return;
        contagemPorTexto[norm] = (contagemPorTexto[norm] || 0) + 1;
    });
    linhas.forEach(l => {
        const norm = l.recomendacoes.trim().toLowerCase();
        l.duplicados = norm && contagemPorTexto[norm] > 1 ? contagemPorTexto[norm] - 1 : 0;
    });
    return linhas;
}

function filterRecomendacoesGhe() {
    const termo = document.getElementById('recomendacoesSearchInput')?.value || '';
    const soDuplicados = document.getElementById('recomendacoesSoDuplicados')?.checked || false;
    renderRecomendacoesGheLista(termo, soDuplicados);
}

function renderRecomendacoesGheLista(termo = '', soDuplicados = false) {
    const container = document.getElementById('recomendacoesGheLista');
    const resumoEl = document.getElementById('recomendacoesResumo');
    if (!container) return;

    const todas = todasRecomendacoesGhe();
    const termoNorm = termo.trim().toLowerCase();
    const filtradas = todas.filter(l => {
        if (soDuplicados && l.duplicados === 0) return false;
        if (!termoNorm) return true;
        return (l.grupoNome || '').toLowerCase().includes(termoNorm) || (l.cargo || '').toLowerCase().includes(termoNorm) || (l.grupoId || '').toLowerCase().includes(termoNorm);
    });

    const totalDuplicados = todas.filter(l => l.duplicados > 0).length;
    if (resumoEl) resumoEl.textContent = `${todas.length} cargo(s) no total, ${totalDuplicados} com recomendação repetida de outro cargo. Mostrando ${filtradas.length}.`;

    if (filtradas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum cargo encontrado com esse filtro.</div>';
        return;
    }

    container.innerHTML = filtradas.map(l => {
        const inputId = `recTextarea_${l.grupoId}_${l.cargoIndex}`;
        const statusId = `recStatus_${l.grupoId}_${l.cargoIndex}`;
        return `
        <div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                <div><b>${escapeHTML(l.grupoId)}</b> — ${escapeHTML(l.grupoNome)} · <span style="color:var(--text-light);">${escapeHTML(l.cargo)}</span></div>
                ${l.duplicados > 0 ? `<span style="padding:3px 10px; border-radius:12px; background:#fef1e0; color:#c2650a; font-weight:700; font-size:11px;">🔁 Igual a mais ${l.duplicados} cargo(s)</span>` : ''}
            </div>
            <textarea id="${inputId}" rows="2" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; box-sizing:border-box; font-family:inherit;">${escapeHTML(l.recomendacoes)}</textarea>
            <div style="margin-top:6px; display:flex; align-items:center; gap:8px;">
                <button class="db-clear-btn" onclick="salvarRecomendacaoCargo('${escapeHTML(l.grupoId)}', ${l.cargoIndex})">💾 Salvar</button>
                <span id="${statusId}" style="font-size:11px; color:var(--text-light);"></span>
            </div>
        </div>`;
    }).join('');
}

async function salvarRecomendacaoCargo(grupoId, cargoIndex) {
    const g = allGheCatalogo.find(x => x.id === grupoId);
    if (!g || !Array.isArray(g.cargos) || !g.cargos[cargoIndex]) return;
    const inputId = `recTextarea_${grupoId}_${cargoIndex}`;
    const statusId = `recStatus_${grupoId}_${cargoIndex}`;
    const statusEl = document.getElementById(statusId);
    const novoTexto = document.getElementById(inputId).value.trim();

    const novoCargos = g.cargos.map((c, idx) => idx === cargoIndex ? { ...c, recomendacoes: novoTexto } : c);

    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        // Upsert precisa da linha inteira do grupo - mesmo cuidado de salvarCargoAgentesEpi.
        await supabaseUpsert('ghe_catalogo', [{
            id: g.id,
            nome: g.nome,
            cargos: novoCargos,
            quantidade_oficial: g.quantidade_oficial,
            riscos: g.riscos || [],
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }]);
        g.cargos = novoCargos;
        if (statusEl) { statusEl.textContent = '✅ Salvo.'; statusEl.style.color = 'var(--success)'; }
        // Espera dar pra ver a confirmação antes de re-renderizar a lista (recalcula os
        // selos de duplicidade, que podem mudar pra essa e outras linhas).
        setTimeout(filterRecomendacoesGhe, 700);
    } catch (err) {
        console.error('Erro ao salvar recomendação do cargo:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function abrirGerenciarGhe(id) {
    const g = allGheCatalogo.find(x => x.id === id);
    if (!g) return;
    gheAtualGerenciado = id;
    document.getElementById('gheGerenciarTitulo').textContent = `🧪 ${g.id} — ${g.nome}`;
    document.getElementById('gheGerenciarStatus').textContent = '';
    document.getElementById('gheAddColabInput').value = '';
    document.getElementById('gheAddColabResults').innerHTML = '';

    gheCargoExpandidoIdx = null;
    document.getElementById('gheCargosOficiais').innerHTML = renderGheCargosHtml(g);
    document.getElementById('gheMapaRiscosView').innerHTML = renderGheMapaRiscosHtml(g);
    document.getElementById('gheMapaRiscosView').style.display = 'block';
    document.getElementById('gheMapaRiscosEdit').style.display = 'none';
    document.getElementById('gheBtnEditarRiscos').textContent = '✏️ Editar';

    document.getElementById('gheGerenciarCard').style.display = 'block';
    renderGheColabList();
    document.getElementById('gheGerenciarCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Troca entre visualização e edição do Mapa de Riscos + Conclusões do GHE aberto -
// permite ao técnico preencher manualmente os outros 26 grupos (o Grupo 27 foi
// pré-populado direto do laudo da ENGMED; os demais o laudo já concluiu "sem riscos
// significativos", mas a estrutura fica pronta pra quando um novo laudo trouxer dados).
let gheRiscosForm = [];

function rowRiscoGheVazio() {
    // probabilidade/severidade (1-5, vazios por padrão) alimentam nivelRiscoGhe() e
    // calculam gravidade/gravidade_label automaticamente (ver atualizarGravidadeCalculadaGhe)
    // - gravidade/gravidade_label continuam existindo como campos calculados, pra não
    // quebrar quem já lê eles hoje (KPIs, gráfico e lista de Riscos Altos/Muito Altos da
    // Matriz de Risco).
    return { tipo_agente: '', agente: '', probabilidade: '', severidade: '', gravidade: '', gravidade_label: '', fontes_geradoras: '', tipo_tempo_exposicao: '', descricao: '', danos_saude: '', sugestoes: '', epis_recomendados: '', epcs_recomendados: '', situacao_controle: '' };
}

function toggleEdicaoGheMapaRiscos() {
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g) return;
    const viewEl = document.getElementById('gheMapaRiscosView');
    const editEl = document.getElementById('gheMapaRiscosEdit');
    const editando = editEl.style.display !== 'none';
    if (editando) {
        editEl.style.display = 'none';
        viewEl.style.display = 'block';
        document.getElementById('gheBtnEditarRiscos').textContent = '✏️ Editar';
        return;
    }
    gheRiscosForm = Array.isArray(g.riscos) ? g.riscos.map(r => ({ ...r })) : [];
    renderRiscosGheForm();
    const c = g.conclusoes || {};
    document.getElementById('gheConclusaoGfipCodigo').value = c.gfip_codigo || '';
    document.getElementById('gheConclusaoGfipDescricao').value = c.gfip_descricao || '';
    document.getElementById('gheConclusaoPericulosidade').value = c.periculosidade || '';
    document.getElementById('gheConclusaoInsalubridade').value = c.insalubridade || '';
    document.getElementById('gheMapaRiscosStatus').textContent = '';
    viewEl.style.display = 'none';
    editEl.style.display = 'block';
    document.getElementById('gheBtnEditarRiscos').textContent = '✕ Cancelar';
}

function adicionarRiscoGheForm() {
    gheRiscosForm.push(rowRiscoGheVazio());
    renderRiscosGheForm();
}

function removerRiscoGheForm(i) {
    gheRiscosForm.splice(i, 1);
    renderRiscosGheForm();
}

function renderRiscosGheForm() {
    const container = document.getElementById('gheRiscosFormLista');
    if (!container) return;
    const campoEstilo = 'padding:6px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;';
    if (gheRiscosForm.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum risco cadastrado — clique em "➕ Adicionar Risco".</div>';
        return;
    }
    container.innerHTML = gheRiscosForm.map((r, i) => `
        <div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px; background:var(--bg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:12px;">Risco ${i + 1}</b>
                <button onclick="removerRiscoGheForm(${i})" title="Remover" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:15px;">🗑️</button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:6px; margin-bottom:6px;">
                <input type="text" placeholder="Tipo de Agente (Físico/Químico/Biológico/Ergonômico/Acidentes)" value="${escapeHTML(r.tipo_agente)}" oninput="gheRiscosForm[${i}].tipo_agente=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Agente" value="${escapeHTML(r.agente)}" oninput="gheRiscosForm[${i}].agente=this.value" style="${campoEstilo}">
            </div>
            <div style="display:grid; grid-template-columns: 70px 70px 1fr; gap:6px; align-items:end; margin-bottom:6px;">
                <div><label style="color:var(--text-light); font-size:10px; display:block;">Probabilidade</label>${selectProbSeverGhe(r.probabilidade, `gheRiscosForm[${i}].probabilidade=this.value; atualizarGravidadeCalculadaGhe(gheRiscosForm[${i}]); renderRiscosGheForm();`, GHE_ANCORAS_PROBABILIDADE)}</div>
                <div><label style="color:var(--text-light); font-size:10px; display:block;">Severidade</label>${selectProbSeverGhe(r.severidade, `gheRiscosForm[${i}].severidade=this.value; atualizarGravidadeCalculadaGhe(gheRiscosForm[${i}]); renderRiscosGheForm();`, GHE_ANCORAS_EFEITO)}</div>
                ${badgeGravidadeGhe(r)}
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:6px; margin-bottom:6px;">
                <input type="text" placeholder="Fontes Geradoras" value="${escapeHTML(r.fontes_geradoras)}" oninput="gheRiscosForm[${i}].fontes_geradoras=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Tipo/Tempo de Exposição" value="${escapeHTML(r.tipo_tempo_exposicao)}" oninput="gheRiscosForm[${i}].tipo_tempo_exposicao=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Situação de Controle" value="${escapeHTML(r.situacao_controle)}" oninput="gheRiscosForm[${i}].situacao_controle=this.value" style="${campoEstilo}">
            </div>
            <textarea placeholder="Descrição" oninput="gheRiscosForm[${i}].descricao=this.value" style="${campoEstilo} margin-bottom:6px;" rows="2">${escapeHTML(r.descricao)}</textarea>
            <textarea placeholder="Danos à Saúde" oninput="gheRiscosForm[${i}].danos_saude=this.value" style="${campoEstilo} margin-bottom:6px;" rows="1">${escapeHTML(r.danos_saude)}</textarea>
            <textarea placeholder="Sugestões / Medidas de Prevenção" oninput="gheRiscosForm[${i}].sugestoes=this.value" style="${campoEstilo} margin-bottom:6px;" rows="2">${escapeHTML(r.sugestoes)}</textarea>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <input type="text" placeholder="EPIs Recomendados" value="${escapeHTML(r.epis_recomendados)}" oninput="gheRiscosForm[${i}].epis_recomendados=this.value" style="${campoEstilo}">
                <input type="text" placeholder="EPCs Recomendados" value="${escapeHTML(r.epcs_recomendados)}" oninput="gheRiscosForm[${i}].epcs_recomendados=this.value" style="${campoEstilo}">
            </div>
        </div>`).join('');
}

async function salvarMapaRiscosGhe() {
    if (bloquearEdicaoSeNaoAutorizado('matrizrisco')) return;
    const statusEl = document.getElementById('gheMapaRiscosStatus');
    const g = allGheCatalogo.find(x => x.id === gheAtualGerenciado);
    if (!g) return;

    const riscosValidos = gheRiscosForm.filter(r => (r.agente || '').trim());
    const conclusoes = {
        gfip_codigo: document.getElementById('gheConclusaoGfipCodigo').value.trim() || null,
        gfip_descricao: document.getElementById('gheConclusaoGfipDescricao').value.trim() || null,
        periculosidade: document.getElementById('gheConclusaoPericulosidade').value.trim() || null,
        insalubridade: document.getElementById('gheConclusaoInsalubridade').value.trim() || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        // Upsert precisa da linha inteira - senão zera nome/cargos/quantidade_oficial
        // que não fazem parte deste formulário.
        await supabaseUpsert('ghe_catalogo', [{
            id: g.id,
            nome: g.nome,
            cargos: g.cargos,
            quantidade_oficial: g.quantidade_oficial,
            riscos: riscosValidos,
            conclusoes,
            updated_at: new Date().toISOString()
        }]);
        g.riscos = riscosValidos;
        g.conclusoes = conclusoes;
        statusEl.textContent = '✅ Mapa de riscos salvo.';
        statusEl.style.color = 'var(--success)';
        document.getElementById('gheMapaRiscosView').innerHTML = renderGheMapaRiscosHtml(g);
        toggleEdicaoGheMapaRiscos();
    } catch (err) {
        console.error('Erro ao salvar mapa de riscos do GHE:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function fecharGerenciarGhe() {
    gheAtualGerenciado = null;
    const card = document.getElementById('gheGerenciarCard');
    if (card) card.style.display = 'none';
}

function renderGheColabList() {
    const container = document.getElementById('gheColabList');
    if (!container || !gheAtualGerenciado) return;
    const equipe = allEfetivo.filter(e => colaboradorEstaAtivo(e) && normalizarGhe(e.ghe) === gheAtualGerenciado)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (equipe.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador classificado neste grupo ainda.</div>';
        return;
    }
    container.innerHTML = equipe.map(e => `
        <div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div>
                <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
                <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <button class="db-clear-btn" onclick="editarColaboradorDaEquipe('${escapeHTML(e.id)}')">✏️ Editar</button>
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="removerDoGhe('${escapeHTML(e.id)}')">Remover</button>
            </div>
        </div>`).join('');
}

function filterGheAddColab(query) {
    const container = document.getElementById('gheAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    const matches = allEfetivo.filter(e =>
        colaboradorEstaAtivo(e) && normalizarGhe(e.ghe) !== gheAtualGerenciado &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarAoGhe('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${e.ghe ? ' — atualmente em ' + escapeHTML(e.ghe) : ' — sem GHE definido'}</div>
        </div>`).join('');
}

async function salvarGheColaborador(matricula, novoGhe) {
    const statusEl = document.getElementById('gheGerenciarStatus');
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        await supabaseUpsert('colaboradores_efetivo', [{ id: matricula, ghe: novoGhe }]);
        e.ghe = novoGhe;
        if (statusEl) { statusEl.textContent = '✅ Atualizado.'; statusEl.style.color = 'var(--success)'; }
        renderGheColabList();
        renderGheLista();
    } catch (err) {
        console.error('Erro ao atualizar GHE do colaborador:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function adicionarAoGhe(matricula) {
    if (!gheAtualGerenciado) return;
    salvarGheColaborador(matricula, gheAtualGerenciado);
    document.getElementById('gheAddColabInput').value = '';
    document.getElementById('gheAddColabResults').innerHTML = '';
}

function removerDoGhe(matricula) {
    if (!confirm('Remover este colaborador do grupo? Ele fica sem GHE definido até ser adicionado a outro.')) return;
    salvarGheColaborador(matricula, null);
}

function popularGheCatalogoDatalist() {
    const el = document.getElementById('gheCatalogoList');
    if (!el) return;
    el.innerHTML = allGheCatalogo.slice().sort((a, b) => a.id.localeCompare(b.id))
        .map(g => `<option value="${escapeHTML(g.id)}">${escapeHTML(g.id)} — ${escapeHTML(g.nome)}</option>`).join('');
}

// Importa o Quadro Funcional (.xls/.xlsx real, exportado direto do sistema de GHE da
// empresa) via SheetJS no navegador. Mesma lógica de detecção de blocos validada antes
// contra o arquivo real no Node: uma linha onde a coluna B começa com "GRUPO " abre um
// novo grupo; as linhas seguintes com a coluna A preenchida (e diferente do cabeçalho
// "Cargo") são os cargos daquele grupo, até o próximo "GRUPO ".
async function importarQuadroFuncionalXLS() {
    const input = document.getElementById('gheFileInput');
    const statusEl = document.getElementById('gheImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo .xls/.xlsx primeiro.';
        return;
    }

    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const grupos = [];
        let atual = null;
        rows.forEach(r => {
            const c0 = String(r[0] || '').trim();
            const c1 = String(r[1] || '').trim();
            const m = c1.match(/^GRUPO\s+(\d+)/i);
            if (m) {
                atual = { id: m[1].padStart(2, '0'), nome: c1, cargos: [] };
                grupos.push(atual);
            } else if (atual && c0 && c0 !== 'Cargo') {
                atual.cargos.push({ cargo: c0, funcao: String(r[1] || ''), cbo: String(r[3] || ''), quantidade: Number(r[4]) || 0 });
            }
        });

        if (grupos.length === 0) {
            statusEl.textContent = '❌ Nenhum grupo "GRUPO NN" encontrado nesse arquivo. Confirme se é o Quadro Funcional exportado do sistema de GHE.';
            return;
        }

        const linhas = grupos.map(g => ({
            id: g.id,
            nome: g.nome,
            cargos: g.cargos,
            quantidade_oficial: g.cargos.reduce((s, c) => s + c.quantidade, 0),
            updated_at: new Date().toISOString()
        }));

        statusEl.textContent = `Enviando ${linhas.length} grupo(s)...`;
        await supabaseUpsert('ghe_catalogo', linhas);

        const totalCargos = linhas.reduce((s, g) => s + g.cargos.length, 0);
        const totalPessoas = linhas.reduce((s, g) => s + g.quantidade_oficial, 0);
        statusEl.textContent = `✅ Importação concluída! ${linhas.length} grupo(s) de GHE e ${totalCargos} cargo(s) importados/atualizados, totalizando ${totalPessoas} pessoa(s) no quadro oficial.`;

        allGheCatalogo = await supabaseFetch('ghe_catalogo', '?select=*');
        popularGheCatalogoDatalist();
        if (document.getElementById('efetivoSubtabBtn-ghe')?.classList.contains('active')) renderGheLista();
    } catch (err) {
        console.error('Erro ao importar Quadro Funcional (GHE):', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ============================================
// MATRIZ DE RISCO (metodologia AIHA, seção 16 do PGR) - painel 100% derivado de dado
// que já existe (ghe_catalogo.riscos[].gravidade/gravidade_label, atribuído durante o
// import original do PGR) + tabelas de referência estáticas transcritas das páginas
// 82-87/300. Sem tabela nova no Supabase, sem CRUD - é leitura/visualização.
// ============================================

let matrizRiscoLoaded = false;
let chartRiscoNivel = null;
let chartRiscoTipoAgente = null;

const NIVEIS_RISCO_ORDEM = ['Trivial', 'Baixo', 'Moderado', 'Alto', 'Muito Alto'];
const NIVEIS_RISCO_COR = { 'Trivial': '#6aa84f', 'Baixo': '#f1c232', 'Moderado': '#e69138', 'Alto': '#cc0000', 'Muito Alto': '#990000' };

// Âncoras da Probabilidade e do Efeito EXATAMENTE como a tabela 16.1 do PGR (mesmo texto
// da tabela "📐 Metodologia AIHA — Referência Oficial" que já aparece na tela de Matriz de
// Risco) - critério de EXPOSIÇÃO ao agente, diferente da escala de "Raro/Frequente" e
// "Lesão leve/Fatalidade" que a APR usa (a APR é uma matriz de campo genérica; o GHE segue
// um documento oficial específico, com critérios próprios). Pesos oficiais são 0-4;
// somamos 1 pra guardar como 1-5 nos mesmos campos probabilidade/severidade de sempre.
const GHE_ANCORAS_PROBABILIDADE = {
    1: 'Não há exposição — nenhum contato com o agente ou contato improvável',
    2: 'Exposição a níveis baixos — contatos não frequentes com o agente',
    3: 'Exposição moderada — contato frequente a baixas concentrações ou não frequente a altas concentrações',
    4: 'Exposição elevada — contato frequente com o agente a altas concentrações',
    5: 'Exposição elevadíssima — contato frequente com o agente a concentrações elevadíssimas'
};
const GHE_ANCORAS_EFEITO = {
    1: 'Pouca importância — efeitos reversíveis de pouca importância, ou não conhecidos/apenas suspeitos',
    2: 'Preocupantes — efeitos reversíveis preocupantes',
    3: 'Severos — efeitos reversíveis severos e preocupantes',
    4: 'Irreversíveis — efeitos irreversíveis preocupantes',
    5: 'Ameaça — ameaça à vida ou doença/lesão incapacitante'
};

// Tabela 16.3 do PGR (Matriz para Determinação dos Níveis de Risco) transcrita ao pé da
// letra - Efeito nas linhas (1 a 5), Probabilidade nas colunas (1 a 5). Substitui o
// cálculo antigo (probabilidade × severidade dentro de uma faixa), que em vários
// cruzamentos não batia com essa tabela oficial - ex: Efeito 5 (Ameaça) × Probabilidade 4
// (Exp. elevada) essa tabela classifica como "Moderado", mas a multiplicação simples (5×4
// = 20) caía na faixa de "Muito Alto".
const GHE_MATRIZ_NIVEIS = {
    1: { 1: 'Trivial', 2: 'Trivial', 3: 'Trivial', 4: 'Trivial', 5: 'Baixo' },
    2: { 1: 'Trivial', 2: 'Baixo', 3: 'Baixo', 4: 'Baixo', 5: 'Moderado' },
    3: { 1: 'Trivial', 2: 'Baixo', 3: 'Moderado', 4: 'Moderado', 5: 'Moderado' },
    4: { 1: 'Trivial', 2: 'Moderado', 3: 'Moderado', 4: 'Alto', 5: 'Alto' },
    5: { 1: 'Baixo', 2: 'Moderado', 3: 'Moderado', 4: 'Alto', 5: 'Muito Alto' }
};

// Classifica pela tabela oficial acima (GHE_MATRIZ_NIVEIS[efeito][probabilidade]), não
// mais por p × s dentro de uma faixa. "valor" continua sendo p × s só pra manter o campo
// numérico "Gravidade" já salvo e pra ordenar a lista de "Riscos Altos" (quem decide o
// NÍVEL agora é sempre a tabela, não esse número).
function nivelRiscoGhe(p, s) {
    const pNum = parseInt(p, 10);
    const sNum = parseInt(s, 10);
    if (!pNum || !sNum) return { valor: null, label: '', cor: '#888888' };
    const valor = pNum * sNum;
    const label = (GHE_MATRIZ_NIVEIS[sNum] && GHE_MATRIZ_NIVEIS[sNum][pNum]) || '';
    return { valor, label, cor: NIVEIS_RISCO_COR[label] || '#888888' };
}

// Select de Probabilidade/Efeito (1-5) com a âncora descritiva (GHE_ANCORAS_PROBABILIDADE/
// GHE_ANCORAS_EFEITO, critério oficial da AIHA - não é mais o mesmo texto do APR) como
// tooltip de cada opção - mesmo padrão do selectPS local de renderRiscosAprForm, só que
// compartilhado entre os dois formulários de edição de riscos do GHE (gheRiscosForm e
// matrizEditForm) em vez de duplicado em cada um.
function selectProbSeverGhe(val, onchange, ancoras) {
    let opts = '<option value="">-</option>';
    for (let n = 1; n <= 5; n++) opts += `<option value="${n}" title="${escapeHTML(ancoras[n])}" ${String(val) === String(n) ? 'selected' : ''}>${n}</option>`;
    return `<select onchange="${onchange}" style="padding:6px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;">${opts}</select>`;
}

// Recalcula gravidade (número) e gravidade_label (texto) a partir de probabilidade ×
// severidade só quando a reclassificação fica completa (as duas preenchidas) - nesse
// momento o risco passa a usar o novo método de vez. Enquanto faltar uma das duas, deixa
// gravidade/gravidade_label como estavam (ex: rótulo antigo digitado à mão em risco
// importado do laudo original) - sem apagar ou adivinhar nada em massa.
function atualizarGravidadeCalculadaGhe(row) {
    const nivel = nivelRiscoGhe(row.probabilidade, row.severidade);
    if (nivel.valor !== null) {
        row.gravidade = nivel.valor;
        row.gravidade_label = nivel.label;
    }
}

// Badge só-leitura ao lado dos selects de P/S, mostrando o nível calculado ao vivo. Se
// probabilidade/severidade ainda não foram preenchidos os dois (risco antigo ainda não
// reclassificado, ou risco novo em branco), mostra o gravidade/gravidade_label que já
// estava salvo em vez de "—", pra não sumir com uma classificação antiga válida só porque
// os novos campos ainda não foram usados.
function badgeGravidadeGhe(row) {
    const nivel = nivelRiscoGhe(row.probabilidade, row.severidade);
    const valor = nivel.valor !== null ? nivel.valor : (row.gravidade || null);
    const label = nivel.valor !== null ? nivel.label : (row.gravidade_label || '');
    const cor = nivel.valor !== null ? nivel.cor : (NIVEIS_RISCO_COR[row.gravidade_label] || '#888888');
    return `<div title="Calculado pela tabela oficial da AIHA (Probabilidade × Efeito, seção 16.3 do PGR - mesma tabela da 'Metodologia AIHA' logo abaixo nesta página)" style="padding:6px 10px; border-radius:6px; background:${cor}22; color:${cor}; font-weight:700; font-size:11.5px; text-align:center;">
        ${valor !== null && valor !== '' ? 'Gravidade ' + valor : 'Gravidade —'}${label ? ' - ' + escapeHTML(label) : ''}
    </div>`;
}

function todosRiscosGhe() {
    const out = [];
    allGheCatalogo.forEach(g => {
        (Array.isArray(g.riscos) ? g.riscos : []).forEach(r => {
            out.push({ ...r, ghe_id: g.id, ghe_nome: g.nome });
        });
    });
    return out;
}

function renderMatrizRiscoPanel() {
    const riscos = todosRiscosGhe();

    document.getElementById('kpiRiscoTotal').textContent = riscos.length;
    const porNivel = {};
    NIVEIS_RISCO_ORDEM.forEach(n => { porNivel[n] = 0; });
    riscos.forEach(r => { if (porNivel[r.gravidade_label] !== undefined) porNivel[r.gravidade_label]++; });
    document.getElementById('kpiRiscoTrivial').textContent = porNivel['Trivial'];
    document.getElementById('kpiRiscoBaixo').textContent = porNivel['Baixo'];
    document.getElementById('kpiRiscoModerado').textContent = porNivel['Moderado'];
    document.getElementById('kpiRiscoAlto').textContent = porNivel['Alto'];
    document.getElementById('kpiRiscoMuitoAlto').textContent = porNivel['Muito Alto'];

    if (chartRiscoNivel) chartRiscoNivel.destroy();
    const ctxNivel = document.getElementById('chartRiscoNivel');
    if (ctxNivel) {
        chartRiscoNivel = new Chart(ctxNivel, {
            type: 'bar',
            data: {
                labels: NIVEIS_RISCO_ORDEM,
                datasets: [{ data: NIVEIS_RISCO_ORDEM.map(n => porNivel[n]), backgroundColor: NIVEIS_RISCO_ORDEM.map(n => NIVEIS_RISCO_COR[n]) }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    const porTipoAgente = {};
    riscos.forEach(r => {
        const tipo = r.tipo_agente || 'Não classificado';
        porTipoAgente[tipo] = (porTipoAgente[tipo] || 0) + 1;
    });
    const tiposOrdenados = Object.entries(porTipoAgente).sort((a, b) => b[1] - a[1]);

    if (chartRiscoTipoAgente) chartRiscoTipoAgente.destroy();
    const ctxTipo = document.getElementById('chartRiscoTipoAgente');
    if (ctxTipo) {
        chartRiscoTipoAgente = new Chart(ctxTipo, {
            type: 'bar',
            data: {
                labels: tiposOrdenados.map(([tipo]) => tipo),
                datasets: [{ data: tiposOrdenados.map(([, n]) => n), backgroundColor: '#4a6fa5' }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    const listaAltos = document.getElementById('listaRiscosAltos');
    if (listaAltos) {
        const altos = riscos.filter(r => r.gravidade_label === 'Alto' || r.gravidade_label === 'Muito Alto')
            .sort((a, b) => (b.gravidade || 0) - (a.gravidade || 0) || (a.ghe_id || '').localeCompare(b.ghe_id || ''));
        if (altos.length === 0) {
            listaAltos.innerHTML = '<div class="db-list-empty">Nenhum risco classificado como Alto ou Muito Alto nos grupos de GHE cadastrados.</div>';
        } else {
            listaAltos.innerHTML = altos.map(r => `
                <div class="db-list-item db-item-danger" style="cursor:pointer;" onclick="irParaGheDaMatriz('${escapeHTML(r.ghe_id)}')">
                    <div class="db-list-item-title">${escapeHTML(r.tipo_agente || '')} — ${escapeHTML(r.agente || '')}</div>
                    <div class="db-list-item-sub">${escapeHTML(r.ghe_id)} — ${escapeHTML(r.ghe_nome || '')} · <span style="font-weight:600; color:${NIVEIS_RISCO_COR[r.gravidade_label] || 'inherit'};">${escapeHTML(r.gravidade_label || '')}</span></div>
                </div>
            `).join('');
        }
    }
}

function irParaGheDaMatriz(gheId) {
    showDbPage('efetivo');
    showEfetivoSubtab('ghe');
    abrirGerenciarGhe(gheId);
}

// Recalcula gravidade/gravidade_label de TODOS os riscos de GHE já cadastrados usando a
// tabela oficial da AIHA (GHE_MATRIZ_NIVEIS), em vez da fórmula antiga (p × s por faixa) -
// criada pra rodar uma vez só, logo depois de aplicar essa correção, e já atualizar de uma
// vez os riscos que tinham probabilidade/severidade preenchidas com o rótulo calculado do
// jeito antigo (que podia divergir da tabela oficial). Pode ser rodada de novo a qualquer
// momento sem problema nenhum: é idempotente (sempre recalcula do zero a partir de
// probabilidade/severidade, nunca acumula nem "piora" nada).
async function recalcularClassificacaoRiscoGhe() {
    const statusEl = document.getElementById('statusRecalcularRiscoGhe');
    if (statusEl) { statusEl.textContent = 'Recalculando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        const gruposAlterados = [];
        let riscosAlterados = 0;
        allGheCatalogo.forEach(g => {
            if (!Array.isArray(g.riscos) || g.riscos.length === 0) return;
            let mudouAlgumRisco = false;
            g.riscos.forEach(r => {
                const labelAntes = r.gravidade_label;
                const valorAntes = r.gravidade;
                atualizarGravidadeCalculadaGhe(r);
                if (r.gravidade_label !== labelAntes || r.gravidade !== valorAntes) {
                    mudouAlgumRisco = true;
                    riscosAlterados++;
                }
            });
            if (mudouAlgumRisco) gruposAlterados.push({ id: g.id, riscos: g.riscos, updated_at: new Date().toISOString() });
        });

        if (gruposAlterados.length === 0) {
            if (statusEl) { statusEl.textContent = '✅ Nenhum risco precisava de recálculo - todos já batem com a tabela oficial da AIHA.'; statusEl.style.color = 'var(--success)'; }
            return;
        }

        await supabaseUpsert('ghe_catalogo', gruposAlterados);
        if (statusEl) { statusEl.textContent = `✅ ${riscosAlterados} risco(s) em ${gruposAlterados.length} grupo(s) de GHE recalculados pela tabela oficial da AIHA.`; statusEl.style.color = 'var(--success)'; }
        if (document.getElementById('page-matrizrisco')?.classList.contains('active')) renderMatrizRiscoPanel();
    } catch (err) {
        console.error('Erro ao recalcular classificação de risco (GHE):', err);
        if (statusEl) { statusEl.textContent = '❌ Falha ao recalcular: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// ============================================
// MATRIZ NR-6 (aba EPI) - mesma fonte de dado que a Matriz de Risco acima
// (ghe_catalogo.riscos[]), só que com foco em EPI recomendado por função e edição
// direta na própria aba (em vez de só leitura). Reaproveita renderGheMapaRiscosHtml
// (view) e o mesmo formato de linha de risco usado em "Gerenciar GHE"
// (Efetivo > GHE), mas com estado de edição próprio (matrizEdit*) pra não
// conflitar com gheAtualGerenciado/gheRiscosForm daquela outra tela.
// ============================================

let matrizEpiLoaded = false;
let matrizEditId = null;
let matrizEditForm = [];

function loadMatrizEpiData() {
    const jobs = [];
    if (allGheCatalogo.length === 0) jobs.push(supabaseFetch('ghe_catalogo', '?select=*').then(rows => { allGheCatalogo = rows; }));
    if (allEfetivo.length === 0) jobs.push(supabaseFetch('colaboradores_efetivo', '?select=*').then(rows => { allEfetivo = rows; }));
    Promise.all(jobs).then(() => {
        renderMatrizEpiCards();
        filterMatrizEpi(document.getElementById('mepiSearchInput')?.value || '');
    });
}

function setorDoGheNome(nome) {
    return String(nome || '').replace(/^GRUPO\s*\d+\s*-\s*/i, '').trim();
}

function funcoesDoGhe(g) {
    const nomes = (Array.isArray(g.cargos) ? g.cargos : []).map(c => c.funcao || c.cargo).filter(Boolean);
    return Array.from(new Set(nomes)).join(', ');
}

function renderMatrizEpiCards() {
    const wrap = document.getElementById('mepiCardsWrap');
    const resumo = document.getElementById('mepiResumo');
    if (!wrap) return;

    if (allGheCatalogo.length === 0) {
        wrap.innerHTML = '<div class="db-list-empty">Nenhum catálogo de GHE importado ainda. Envie o Quadro Funcional em Efetivo > Configurações.</div>';
        if (resumo) resumo.textContent = '';
        return;
    }

    const contagem = contagemAtualPorGhe();
    const grupos = allGheCatalogo.slice().sort((a, b) => a.id.localeCompare(b.id));
    const totalColab = Array.from(contagem.values()).reduce((s, v) => s + v, 0);
    if (resumo) resumo.textContent = `${grupos.length} grupo(s) homogêneo(s) de exposição · ${totalColab} colaborador(es) mapeado(s) no cadastro atual`;

    wrap.innerHTML = grupos.map(g => {
        const riscos = Array.isArray(g.riscos) ? g.riscos : [];
        const atual = contagem.get(g.id) || 0;
        const setor = setorDoGheNome(g.nome);
        const funcoes = funcoesDoGhe(g);
        const buscaTxt = [setor, funcoes, ...riscos.map(r => r.agente || '')].join(' ').toLowerCase();
        const editando = matrizEditId === g.id;

        return `<div class="mepi-card" id="mepiCard-${escapeHTML(g.id)}" data-search="${escapeHTML(buscaTxt)}">
            <div class="mepi-card-head">
                <span class="mepi-ghe">GHE ${escapeHTML(g.id)}</span>
                <div class="mepi-head-text">
                    <div class="mepi-setor">${escapeHTML(setor)}</div>
                    <div class="mepi-funcoes">${escapeHTML(funcoes)}</div>
                </div>
                <span class="mepi-n" style="color:${atual > 0 ? 'var(--text)' : 'var(--text-light)'}">${atual > 0 ? atual + ' colab.' : 'sem colab. ativo'}</span>
            </div>
            <div id="mepiView-${escapeHTML(g.id)}">${renderGheMapaRiscosHtml(g)}</div>
            <div class="mepi-footer" style="border-top:1px dashed var(--border); padding-top:8px; margin-top:8px;">
                <button class="db-clear-btn" onclick="toggleMatrizEdit('${escapeHTML(g.id)}')">${editando ? '✕ Cancelar' : '✏️ Editar riscos'}</button>
            </div>
            ${editando ? renderMatrizEditBlock(g) : ''}
        </div>`;
    }).join('');
}

function renderMatrizEditBlock(g) {
    return `<div style="margin-top:10px; border-top:1px solid var(--border); padding-top:10px;">
        <div id="mepiEditFields-${escapeHTML(g.id)}"></div>
        <button class="db-clear-btn" onclick="adicionarMatrizRisco()">➕ Adicionar Risco</button>
        <button class="db-clear-btn" style="margin-left:6px;" onclick="salvarMatrizRiscos()">💾 Salvar</button>
        <span id="mepiEditStatus-${escapeHTML(g.id)}" style="font-size:11px; color:var(--text-light); margin-left:8px;"></span>
    </div>`;
}

function toggleMatrizEdit(id) {
    if (matrizEditId === id) {
        matrizEditId = null;
        matrizEditForm = [];
        renderMatrizEpiCards();
        filterMatrizEpi(document.getElementById('mepiSearchInput')?.value || '');
        return;
    }
    const g = allGheCatalogo.find(x => x.id === id);
    if (!g) return;
    matrizEditId = id;
    matrizEditForm = Array.isArray(g.riscos) ? g.riscos.map(r => ({ ...r })) : [];
    renderMatrizEpiCards();
    filterMatrizEpi(document.getElementById('mepiSearchInput')?.value || '');
    renderMatrizEditFields();
    document.getElementById('mepiCard-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function adicionarMatrizRisco() {
    matrizEditForm.push(rowRiscoGheVazio());
    renderMatrizEditFields();
}

function removerMatrizRisco(i) {
    matrizEditForm.splice(i, 1);
    renderMatrizEditFields();
}

function renderMatrizEditFields() {
    if (!matrizEditId) return;
    const container = document.getElementById('mepiEditFields-' + matrizEditId);
    if (!container) return;
    const campoEstilo = 'padding:6px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;';
    if (matrizEditForm.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum risco cadastrado — clique em "➕ Adicionar Risco".</div>';
        return;
    }
    container.innerHTML = matrizEditForm.map((r, i) => `
        <div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px; background:var(--bg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:12px;">Risco ${i + 1}</b>
                <button onclick="removerMatrizRisco(${i})" title="Remover" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:15px;">🗑️</button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:6px; margin-bottom:6px;">
                <input type="text" placeholder="Tipo de Agente (Físico/Químico/Biológico/Ergonômico/Acidentes)" value="${escapeHTML(r.tipo_agente)}" oninput="matrizEditForm[${i}].tipo_agente=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Agente" value="${escapeHTML(r.agente)}" oninput="matrizEditForm[${i}].agente=this.value" style="${campoEstilo}">
            </div>
            <div style="display:grid; grid-template-columns: 70px 70px 1fr; gap:6px; align-items:end; margin-bottom:6px;">
                <div><label style="color:var(--text-light); font-size:10px; display:block;">Probabilidade</label>${selectProbSeverGhe(r.probabilidade, `matrizEditForm[${i}].probabilidade=this.value; atualizarGravidadeCalculadaGhe(matrizEditForm[${i}]); renderMatrizEditFields();`, GHE_ANCORAS_PROBABILIDADE)}</div>
                <div><label style="color:var(--text-light); font-size:10px; display:block;">Severidade</label>${selectProbSeverGhe(r.severidade, `matrizEditForm[${i}].severidade=this.value; atualizarGravidadeCalculadaGhe(matrizEditForm[${i}]); renderMatrizEditFields();`, GHE_ANCORAS_EFEITO)}</div>
                ${badgeGravidadeGhe(r)}
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:6px; margin-bottom:6px;">
                <input type="text" placeholder="Fontes Geradoras" value="${escapeHTML(r.fontes_geradoras)}" oninput="matrizEditForm[${i}].fontes_geradoras=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Tipo/Tempo de Exposição" value="${escapeHTML(r.tipo_tempo_exposicao)}" oninput="matrizEditForm[${i}].tipo_tempo_exposicao=this.value" style="${campoEstilo}">
                <input type="text" placeholder="Situação de Controle" value="${escapeHTML(r.situacao_controle)}" oninput="matrizEditForm[${i}].situacao_controle=this.value" style="${campoEstilo}">
            </div>
            <textarea placeholder="Descrição" oninput="matrizEditForm[${i}].descricao=this.value" style="${campoEstilo} margin-bottom:6px;" rows="2">${escapeHTML(r.descricao)}</textarea>
            <textarea placeholder="Danos à Saúde" oninput="matrizEditForm[${i}].danos_saude=this.value" style="${campoEstilo} margin-bottom:6px;" rows="1">${escapeHTML(r.danos_saude)}</textarea>
            <textarea placeholder="Sugestões / Medidas de Prevenção" oninput="matrizEditForm[${i}].sugestoes=this.value" style="${campoEstilo} margin-bottom:6px;" rows="2">${escapeHTML(r.sugestoes)}</textarea>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <input type="text" placeholder="EPIs Recomendados" value="${escapeHTML(r.epis_recomendados)}" oninput="matrizEditForm[${i}].epis_recomendados=this.value" style="${campoEstilo}">
                <input type="text" placeholder="EPCs Recomendados" value="${escapeHTML(r.epcs_recomendados)}" oninput="matrizEditForm[${i}].epcs_recomendados=this.value" style="${campoEstilo}">
            </div>
        </div>`).join('');
}

async function salvarMatrizRiscos() {
    if (bloquearEdicaoSeNaoAutorizado('matrizrisco')) return;
    const g = allGheCatalogo.find(x => x.id === matrizEditId);
    if (!g) return;
    const statusEl = document.getElementById('mepiEditStatus-' + matrizEditId);
    const riscosValidos = matrizEditForm.filter(r => (r.agente || '').trim());

    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        // Upsert precisa da linha inteira - mesmo cuidado de salvarMapaRiscosGhe.
        await supabaseUpsert('ghe_catalogo', [{
            id: g.id,
            nome: g.nome,
            cargos: g.cargos,
            quantidade_oficial: g.quantidade_oficial,
            riscos: riscosValidos,
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }]);
        g.riscos = riscosValidos;
        matrizEditId = null;
        matrizEditForm = [];
        renderMatrizEpiCards();
        filterMatrizEpi(document.getElementById('mepiSearchInput')?.value || '');
    } catch (err) {
        console.error('Erro ao salvar riscos da Matriz NR-6:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha ao salvar: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// ============================================
// EFETIVO - busca de colaborador (ativo/inativo, admissão/demissão, tempo de casa,
// aniversário e situação de treinamentos), a pedido do cliente.
// ============================================

// Retorna a lista de colaboradores aplicando o seletor de Situação (Ativos / Demitidos / Todos)
function obterEfetivoFiltrado() {
    const situacaoEl = document.getElementById('filtroEfetivoSituacao');
    const situacaoFiltro = situacaoEl ? situacaoEl.value : 'ativos';
    let lista = (allEfetivo || []).slice();
    if (situacaoFiltro === 'ativos') {
        lista = lista.filter(colaboradorEstaAtivo);
    } else if (situacaoFiltro === 'demitidos') {
        lista = lista.filter(e => !colaboradorEstaAtivo(e));
    }
    return lista;
}

// Resumo geral e Cards de Contagem Rápida da lista de colaboradores
function renderEfetivoResumo() {
    const listaFiltrada = obterEfetivoFiltrado();
    const totalGeral = (allEfetivo || []).length;
    const totalAtivosGeral = (allEfetivo || []).filter(colaboradorEstaAtivo).length;
    const situacaoEl = document.getElementById('filtroEfetivoSituacao');
    const situacaoFiltro = situacaoEl ? situacaoEl.value : 'ativos';

    let homens = 0;
    let mulheres = 0;
    listaFiltrada.forEach(e => {
        const sNorm = normalizarSexo(e.sexo);
        if (sNorm === 'M') homens++;
        else if (sNorm === 'F') mulheres++;
    });

    const totalFiltro = listaFiltrada.length;
    const pctHomensNum = totalFiltro > 0 ? (homens / totalFiltro) * 100 : 0;
    const pctMulheresNum = totalFiltro > 0 ? (mulheres / totalFiltro) * 100 : 0;
    const pctHomensStr = pctHomensNum.toFixed(1) + '%';
    const pctMulheresStr = pctMulheresNum.toFixed(1) + '%';

    // Atualiza cards de contagem rápida
    const kpiTotal = document.getElementById('kpiEfetivoFiltroTotal');
    const kpiHomens = document.getElementById('kpiEfetivoFiltroHomens');
    const kpiMulheres = document.getElementById('kpiEfetivoFiltroMulheres');
    const kpiHomensPct = document.getElementById('kpiEfetivoFiltroHomensPct');
    const kpiMulheresPct = document.getElementById('kpiEfetivoFiltroMulheresPct');
    const kpiProporcao = document.getElementById('kpiEfetivoFiltroProporcao');
    const kpiBarraM = document.getElementById('kpiEfetivoBarraM');
    const kpiBarraF = document.getElementById('kpiEfetivoBarraF');
    const kpiTotalLbl = document.getElementById('kpiEfetivoFiltroTotalLbl');

    if (kpiTotal) kpiTotal.textContent = totalFiltro;
    if (kpiHomens) kpiHomens.textContent = homens;
    if (kpiMulheres) kpiMulheres.textContent = mulheres;
    if (kpiHomensPct) kpiHomensPct.textContent = pctHomensStr;
    if (kpiMulheresPct) kpiMulheresPct.textContent = pctMulheresStr;
    if (kpiProporcao) kpiProporcao.textContent = `${pctHomensStr} ♂ · ${pctMulheresStr} ♀`;
    if (kpiBarraM) kpiBarraM.style.width = pctHomensNum + '%';
    if (kpiBarraF) kpiBarraF.style.width = pctMulheresNum + '%';
    if (kpiTotalLbl) {
        if (situacaoFiltro === 'ativos') kpiTotalLbl.textContent = 'Colaboradores Ativos';
        else if (situacaoFiltro === 'demitidos') kpiTotalLbl.textContent = 'Demitidos / Inativos';
        else kpiTotalLbl.textContent = 'Total Geral (Todos)';
    }

    // Texto descritivo de rodapé do card de busca
    const el = document.getElementById('efetivoResumo');
    if (el) {
        if (totalGeral === 0) {
            el.textContent = '';
        } else {
            let labelFiltro = 'ativos';
            if (situacaoFiltro === 'demitidos') labelFiltro = 'demitidos/inativos';
            else if (situacaoFiltro === 'todos') labelFiltro = 'todos no histórico';
            el.innerHTML = `Exibindo <strong>${totalFiltro}</strong> colaborador(es) [<em>${labelFiltro}</em>]: <strong>${homens}</strong> homens (M) e <strong>${mulheres}</strong> mulheres (F) — <em>Base total cadastrada: ${totalGeral} (${totalAtivosGeral} ativos, ${totalGeral - totalAtivosGeral} demitidos/inativos)</em>`;
        }
    }
}

// Disparado ao trocar o filtro de situação (Ativos / Demitidos / Todos)
function onFiltroEfetivoSituacaoChange() {
    const situacaoEl = document.getElementById('filtroEfetivoSituacao');
    const situacao = situacaoEl ? situacaoEl.value : 'ativos';
    setEfetivoPdfStatus(situacao === 'todos' ? 'completo' : situacao);
    renderEfetivoResumo();
    const query = document.getElementById('efetivoSearchInput')?.value || '';
    filterEfetivoColaboradores(query);
}

function limparBuscaEfetivo() {
    const input = document.getElementById('efetivoSearchInput');
    if (input) input.value = '';
    filterEfetivoColaboradores('');
    if (input) input.focus();
}

// ---- Gerar PDF de Colaboradores (Ativos/Demitidos/Completo, colunas escolhidas) ----
// Mesmo padrão de blob+<a>+window.print() de todo documento gerado no sistema - "PDF" é
// o navegador imprimindo/salvando essa página HTML, não uma lib de PDF.
const EFETIVO_PDF_COLUNAS = [
    { id: 'matricula', label: 'Matrícula', get: e => e.id },
    { id: 'nome', label: 'Nome', get: e => e.nome },
    { id: 'status', label: 'Status', get: e => {
        if (!colaboradorEstaAtivo(e)) {
            return (e.status && e.status !== 'ATIVO') ? e.status : (e.dt_demissao ? 'DEMITIDO' : 'INATIVO');
        }
        return 'ATIVO';
    } },
    { id: 'funcao', label: 'Função', get: e => e.funcao },
    { id: 'setor', label: 'Setor', get: e => e.setor },
    { id: 'responsavel', label: 'Responsável/Frente', get: e => e.responsavel },
    { id: 'ghe', label: 'GHE', get: e => e.ghe },
    { id: 'cpf', label: 'CPF', get: e => e.cpf },
    { id: 'rg', label: 'RG', get: e => e.rg },
    { id: 'dt_admissao', label: 'Admissão', get: e => formatSimpleDate(e.dt_admissao || e.data_admissao) },
    { id: 'dt_demissao', label: 'Demissão', get: e => formatSimpleDate(e.dt_demissao || e.data_demissao) },
    { id: 'dt_nascimento', label: 'Nascimento', get: e => formatSimpleDate(e.dt_nascimento || e.data_nascimento) },
    { id: 'cidade', label: 'Cidade', get: e => e.cidade },
    { id: 'estado', label: 'UF', get: e => e.estado },
    { id: 'ada', label: 'Mão de Obra ADA', get: e => {
        if (typeof allMunicipiosAda !== 'undefined' && Array.isArray(allMunicipiosAda) && allMunicipiosAda.length > 0) {
            const cid = (e.cidade || '').toUpperCase().trim();
            return allMunicipiosAda.some(m => (m.municipio || '').toUpperCase().trim() === cid) ? 'SIM' : 'NÃO';
        }
        return '';
    }},
    { id: 'estabilidade', label: 'Estabilidade', get: e => e.estabilidade },
    { id: 'sexo', label: 'Sexo', get: e => formatarSexoExibicao(e.sexo) },
    { id: 'calca', label: 'Calça', get: e => e.calca },
    { id: 'camisa', label: 'Camisa', get: e => e.camisa },
    { id: 'bota', label: 'Bota', get: e => e.bota }
];
const EFETIVO_PDF_COLUNAS_PADRAO = new Set(['matricula', 'nome', 'status', 'funcao', 'setor', 'responsavel', 'ghe']);
let efetivoPdfStatusFiltro = 'ativos';

function toggleFormPdfEfetivo() {
    const card = document.getElementById('efetivoPdfCard');
    const abrindo = card.style.display === 'none';
    card.style.display = abrindo ? 'block' : 'none';
    if (abrindo && document.getElementById('efetivoPdfColunas').children.length === 0) {
        document.getElementById('efetivoPdfColunas').innerHTML = EFETIVO_PDF_COLUNAS.map(c => `
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" class="efetivoPdfColunaCheckbox" value="${c.id}" ${EFETIVO_PDF_COLUNAS_PADRAO.has(c.id) ? 'checked' : ''} style="width:15px; height:15px;">
                <span>${escapeHTML(c.label)}</span>
            </label>`).join('');
    }
}

function setEfetivoPdfStatus(status) {
    efetivoPdfStatusFiltro = status;
    ['ativos', 'demitidos', 'completo'].forEach(s => document.getElementById(`efPdfStatusBtn-${s}`)?.classList.toggle('active', s === status));
}

function gerarPdfEfetivo() {
    const statusEl = document.getElementById('efetivoPdfStatus');
    const colunasMarcadas = Array.from(document.querySelectorAll('.efetivoPdfColunaCheckbox:checked')).map(cb => cb.value);
    if (colunasMarcadas.length === 0) {
        statusEl.textContent = '❌ Selecione pelo menos uma coluna.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    let colunas = EFETIVO_PDF_COLUNAS.filter(c => colunasMarcadas.includes(c.id));
    if (colunas.length === 0) {
        colunas = EFETIVO_PDF_COLUNAS.filter(c => EFETIVO_PDF_COLUNAS_PADRAO.has(c.id));
    }

    let lista = allEfetivo.slice();
    let filtroLabel = 'Completo (Ativos + Demitidos)';
    const situacaoAtual = efetivoPdfStatusFiltro || document.getElementById('filtroEfetivoSituacao')?.value || 'ativos';
    if (situacaoAtual === 'ativos') { lista = lista.filter(colaboradorEstaAtivo); filtroLabel = 'Ativos'; }
    else if (situacaoAtual === 'demitidos') { lista = lista.filter(e => !colaboradorEstaAtivo(e)); filtroLabel = 'Demitidos/Inativos'; }
    lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (lista.length === 0) {
        statusEl.textContent = 'Nenhum colaborador encontrado para esse filtro.';
        statusEl.style.color = 'var(--text-light)';
        return;
    }

    const agora = new Date();
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Lista de Colaboradores - ${escapeHTML(filtroLabel)}</title>
<style>
    @page { size: landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 20px; }
    .cabecalho { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:6px; gap:10px; }
    .cabecalho img { max-height:40px; }
    .cabecalho .titulo { font-weight:700; font-size:16px; text-align:center; flex:1; }
    .info-geracao { font-size:10.5px; color:#444; margin-bottom:12px; }
    table { width:100%; border-collapse:collapse; font-size:9.5px; }
    th, td { border:1px solid #999; padding:4px 6px; text-align:left; }
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
        <div class="titulo">LISTA DE COLABORADORES — ${escapeHTML(filtroLabel.toUpperCase())}</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Gerado em ${formatSimpleDate(agora.toISOString().slice(0, 10))} às ${agora.toLocaleTimeString('pt-BR')} — ${lista.length} colaborador(es)</div>
    <table>
        <thead><tr>${colunas.map(c => `<th>${escapeHTML(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${lista.map(e => `<tr>${colunas.map(c => `<td>${escapeHTML(c.get(e) || '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, 'Lista de Colaboradores - ' + filtroLabel);
    statusEl.textContent = `✅ PDF gerado com ${lista.length} colaborador(es).`;
    statusEl.style.color = 'var(--success)';
}

// ---- Gerar Planilha Excel de Colaboradores (com autofiltro e todas as colunas) ----
function gerarExcelEfetivo() {
    const statusEl = document.getElementById('efetivoPdfStatus');
    const cardEl = document.getElementById('efetivoPdfCard');
    const cardAberto = cardEl && cardEl.style.display !== 'none';
    const buscaInput = document.getElementById('efetivoSearchInput');
    const buscaAtual = (buscaInput ? buscaInput.value : '').trim().toLowerCase();

    let lista = (allEfetivo || []).slice();
    let colunas = [];
    let filtroLabel = 'Completo';

    if (cardAberto) {
        // Se o card de opções estiver aberto, respeita as opções escolhidas pelo usuário
        const colunasMarcadas = Array.from(document.querySelectorAll('.efetivoPdfColunaCheckbox:checked')).map(cb => cb.value);
        if (colunasMarcadas.length === 0) {
            const aviso = '❌ Selecione pelo menos uma coluna para exportar.';
            if (statusEl) { statusEl.textContent = aviso; statusEl.style.color = 'var(--danger)'; }
            alert(aviso);
            return;
        }
        colunas = EFETIVO_PDF_COLUNAS.filter(c => colunasMarcadas.includes(c.id));

        if (efetivoPdfStatusFiltro === 'ativos') {
            lista = lista.filter(colaboradorEstaAtivo);
            filtroLabel = 'Ativos';
        } else if (efetivoPdfStatusFiltro === 'demitidos') {
            lista = lista.filter(e => !colaboradorEstaAtivo(e));
            filtroLabel = 'Demitidos';
        } else {
            filtroLabel = 'Completo';
        }
    } else {
        // Se o card estiver fechado, respeita estritamente o filtro de situação ativo em tela
        const situacaoFiltro = document.getElementById('filtroEfetivoSituacao')?.value || 'ativos';
        if (situacaoFiltro === 'ativos') {
            lista = lista.filter(colaboradorEstaAtivo);
            filtroLabel = 'Ativos';
        } else if (situacaoFiltro === 'demitidos') {
            lista = lista.filter(e => !colaboradorEstaAtivo(e));
            filtroLabel = 'Demitidos';
        } else {
            filtroLabel = 'Completo';
        }

        // Se houver texto digitado na busca da tela, refina ainda mais com a busca
        if (buscaAtual.length >= 2) {
            lista = lista.filter(e => (e.nome && e.nome.toLowerCase().includes(buscaAtual)) || (e.id && String(e.id).toLowerCase().includes(buscaAtual)) || (e.funcao && e.funcao.toLowerCase().includes(buscaAtual)));
            filtroLabel += '_Filtrados_Busca';
        }
        // Exporta com todas as colunas disponíveis para máxima riqueza no Excel
        colunas = EFETIVO_PDF_COLUNAS.slice();
    }

    lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (lista.length === 0) {
        const aviso = 'Nenhum colaborador encontrado para exportar com o filtro selecionado.';
        if (statusEl) { statusEl.textContent = aviso; statusEl.style.color = 'var(--text-light)'; }
        alert(aviso);
        return;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR');

    // Estrutura de linhas (Array of Arrays) para a planilha Excel
    const aoa = [
        ['LISTA DE COLABORADORES — PISF RAMAL DO AGRESTE'],
        [`Filtro: ${filtroLabel.toUpperCase()} | Total: ${lista.length} colaborador(es) | Gerado em: ${dataFormatada} às ${horaFormatada}`],
        [], // Linha em branco separadora
        colunas.map(c => c.label.toUpperCase()) // Linha 4: Cabeçalho das colunas
    ];

    lista.forEach(colab => {
        const linha = colunas.map(c => {
            const val = c.get(colab);
            return val !== null && val !== undefined ? String(val) : '';
        });
        aoa.push(linha);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Ativar o autofiltro nativo do Excel na linha de cabeçalho (linha 4, índice 3 em 0-based)
    const headerRow = 3;
    const startCell = XLSX.utils.encode_cell({ r: headerRow, c: 0 });
    const endCell = XLSX.utils.encode_cell({ r: aoa.length - 1, c: colunas.length - 1 });
    ws['!autofilter'] = { ref: `${startCell}:${endCell}` };

    // Auto-ajuste de largura de cada coluna com base no conteúdo
    ws['!cols'] = colunas.map(c => {
        let maxLen = c.label.length;
        lista.forEach(colab => {
            const val = String(c.get(colab) || '');
            if (val.length > maxLen) maxLen = Math.min(val.length, 45);
        });
        return { wch: Math.max(maxLen + 4, 12) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EFETIVO');

    const dataSlug = agora.toISOString().slice(0, 10);
    const fileName = `EFETIVO_COLABORADORES_${filtroLabel.toUpperCase()}_${dataSlug}.xlsx`;
    XLSX.writeFile(wb, fileName);

    const msg = `✅ Planilha Excel gerada com sucesso! (${lista.length} colaboradores)`;
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.color = 'var(--success)';
    }

    // Feedback visual temporário no card de busca
    const resumoEl = document.getElementById('efetivoResumo');
    if (resumoEl) {
        const textoOriginal = resumoEl.textContent;
        resumoEl.innerHTML = `<span style="color: #047857; font-weight: 700; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; border: 1px solid #10b981;">📊 ${msg}</span>`;
        setTimeout(() => {
            if (resumoEl) resumoEl.textContent = textoOriginal;
        }, 5000);
    }
}

// ==============================================================================
// RELATÓRIO DE EFETIVO POR EQUIPE / ENCARREGADO (NR-01 / DDSMA / LIBERAÇÃO DIÁRIA)
// Emissão formatada de relação nominal para canteiro de obras (PISF Ramal do Agreste)
// ==============================================================================

function abrirModalRelatorioEquipeEncarregado() {
    const modal = document.getElementById('modalRelatorioEquipeEncarregado');
    if (!modal) return;
    
    // Garante carregamento assíncrono de ASO e efetivo se ainda não disponíveis
    if (typeof allAsoExames === 'undefined' || !allAsoExames || allAsoExames.length === 0) {
        if (typeof supabaseFetchCacheado === 'function') {
            supabaseFetchCacheado('aso_exames', '?select=*').then(rows => {
                if (Array.isArray(rows)) {
                    allAsoExames = rows;
                    window.allAsoExames = rows;
                    atualizarPreviaRelatorioEquipe();
                }
            }).catch(e => console.warn('Aviso ao carregar aso_exames para relatório de equipe:', e));
        }
    }

    popularFiltrosRelatorioEquipe();
    atualizarPreviaRelatorioEquipe();
    modal.style.display = 'flex';
}

function fecharModalRelatorioEquipeEncarregado() {
    const modal = document.getElementById('modalRelatorioEquipeEncarregado');
    if (modal) modal.style.display = 'none';
}

function aoAlternarLinhasExtrasRelatorioEquipe() {
    const chk = document.getElementById('relEquipeLinhasExtras');
    const wrap = document.getElementById('relEquipeWrapQtdExtras');
    if (wrap) wrap.style.display = (chk && chk.checked) ? 'flex' : 'none';
    atualizarPreviaRelatorioEquipe();
}

function popularFiltrosRelatorioEquipe() {
    const selLider = document.getElementById('relEquipeFiltroLider');
    const selSetor = document.getElementById('relEquipeFiltroSetor');
    if (!selLider) return;

    const ativos = (allEfetivo || []).filter(colaboradorEstaAtivo);
    const regexLider = /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i;

    // 1. Mapear responsáveis e líderes a partir de colaboradores_efetivo
    const lideresMap = new Map();

    (allEfetivo || []).forEach(e => {
        const resp = (e.responsavel || '').trim();
        if (!resp || resp === '-' || resp === '—') return;
        const respKey = resp.toUpperCase();
        if (!lideresMap.has(respKey)) {
            lideresMap.set(respKey, {
                valor: resp,
                nome: resp,
                nomeCompleto: '',
                funcao: 'Equipe / Frente de Campo',
                setor: e.setor || '',
                totalAtivos: 0
            });
        }
        if (colaboradorEstaAtivo(e)) {
            lideresMap.get(respKey).totalAtivos++;
        }
    });

    // Vincula colaboradores com funções de liderança formal às frentes ou cria opção individual
    (allEfetivo || []).forEach(e => {
        const ehLider = regexLider.test(e.funcao || '');
        if (!ehLider) return;
        const nomeUpper = (e.nome || '').trim().toUpperCase();
        const respUpper = (e.responsavel || '').trim().toUpperCase();

        let achou = false;
        for (let [k, item] of lideresMap.entries()) {
            if (nomeUpper.includes(k) || k.includes(nomeUpper) || respUpper === k) {
                item.nomeCompleto = e.nome;
                item.funcao = e.funcao;
                if (e.setor) item.setor = e.setor;
                achou = true;
                break;
            }
        }

        if (!achou && colaboradorEstaAtivo(e)) {
            const val = `NOME:${e.nome.trim()}`;
            lideresMap.set(val.toUpperCase(), {
                valor: val,
                nome: e.nome,
                nomeCompleto: e.nome,
                funcao: e.funcao,
                setor: e.setor || '',
                totalAtivos: 1
            });
        }
    });

    const listaLideres = Array.from(lideresMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));

    let htmlLider = '<option value="">Todos os Encarregados / Lideranças</option>';
    listaLideres.forEach(item => {
        const qtdTxt = item.totalAtivos > 0 ? ` (${item.totalAtivos} ativos)` : '';
        const descTxt = item.nomeCompleto ? `${item.nome} — ${item.nomeCompleto} [${item.funcao}]${qtdTxt}` : `${item.nome} [${item.funcao}]${qtdTxt}`;
        htmlLider += `<option value="${escapeHTML(item.valor)}">${escapeHTML(descTxt)}</option>`;
    });
    selLider.innerHTML = htmlLider;

    // 2. Mapear setores dinamicamente
    if (selSetor) {
        const setoresSet = new Set();
        ativos.forEach(e => {
            const s = (e.setor || '').trim();
            if (s) setoresSet.add(s);
        });
        const setores = Array.from(setoresSet).sort((a, b) => a.localeCompare(b));
        let htmlSetor = '<option value="">Todos os Setores / Frentes</option>';
        setores.forEach(s => {
            htmlSetor += `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`;
        });
        selSetor.innerHTML = htmlSetor;
    }
}

function aoMudarLiderRelatorioEquipe() {
    atualizarPreviaRelatorioEquipe();
}

function obterListaEquipeFiltrada() {
    const liderSel = (document.getElementById('relEquipeFiltroLider')?.value || '').trim();
    const setorSel = (document.getElementById('relEquipeFiltroSetor')?.value || '').trim();
    const situacaoSel = document.getElementById('relEquipeFiltroSituacao')?.value || 'ativos';

    let lista = (allEfetivo || []).slice();

    // Filtro por situação cadastral
    if (situacaoSel === 'ativos') {
        lista = lista.filter(colaboradorEstaAtivo);
    } else if (situacaoSel === 'demitidos') {
        lista = lista.filter(e => !colaboradorEstaAtivo(e));
    }

    // Filtro por encarregado / liderança
    if (liderSel) {
        if (liderSel.startsWith('NOME:')) {
            const nomeLider = liderSel.replace('NOME:', '').trim().toUpperCase();
            lista = lista.filter(e => {
                const r = (e.responsavel || '').trim().toUpperCase();
                const n = (e.nome || '').trim().toUpperCase();
                return n === nomeLider || r === nomeLider || (r && nomeLider.includes(r));
            });
        } else {
            const respNorm = liderSel.toUpperCase();
            lista = lista.filter(e => {
                const r = (e.responsavel || '').trim().toUpperCase();
                const n = (e.nome || '').trim().toUpperCase();
                return r === respNorm || n === respNorm || (respNorm.length >= 4 && n.includes(respNorm)) || (r && respNorm.includes(r));
            });
        }
    }

    // Filtro por setor
    if (setorSel) {
        const setorNorm = setorSel.toUpperCase();
        lista = lista.filter(e => (e.setor || '').trim().toUpperCase() === setorNorm);
    }

    // Ordenação de excelência para canteiro de obras:
    // Líderes e Encarregados no início da relação nominal, seguidos de ordem alfabética
    const regexLider = /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i;
    lista.sort((a, b) => {
        const aEhLider = regexLider.test(a.funcao || '');
        const bEhLider = regexLider.test(b.funcao || '');
        if (aEhLider && !bEhLider) return -1;
        if (!aEhLider && bEhLider) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    return lista;
}

function obterAsoColaboradorRelatorio(colab) {
    let dataVenc = null;
    let dataExame = null;
    let tipoExame = '';

    const mat = String(colab.id || colab.matricula || '').trim();

    // 1. Tenta calcular via histórico de aso_exames (fonte primária do PCMSO / Saúde Ocupacional)
    if (typeof allAsoExames !== 'undefined' && Array.isArray(allAsoExames) && allAsoExames.length > 0) {
        const exames = allAsoExames.filter(a => String(a.matricula || '').trim() === mat && a.data_exame);
        if (exames.length > 0) {
            const ultimo = exames.reduce((max, a) => {
                const d1 = parseLocalDate ? parseLocalDate(a.data_exame) : new Date(a.data_exame);
                const d2 = parseLocalDate ? parseLocalDate(max.data_exame) : new Date(max.data_exame);
                return d1 > d2 ? a : max;
            }, exames[0]);
            dataVenc = ultimo.data_vencimento || null;
            dataExame = ultimo.data_exame || null;
            tipoExame = ultimo.tipo_aso || '';
        }
    }

    // 2. Fallback direto no campo do cadastro de colaboradores_efetivo
    if (!dataVenc && colab.validade_aso) {
        dataVenc = colab.validade_aso;
    }

    // 3. Fallback no cache do checklist
    if (!dataVenc && typeof _colaboradoresChecklistAlertasCache !== 'undefined' && Array.isArray(_colaboradoresChecklistAlertasCache)) {
        const cck = _colaboradoresChecklistAlertasCache.find(x => String(x.id || x.matricula) === mat);
        if (cck && cck.validade_aso) dataVenc = cck.validade_aso;
    }

    if (!dataVenc) {
        return {
            status: 'sem_data',
            dataVencFmt: 'Não Informado',
            diffDays: null,
            rotuloAso: 'Não Informado',
            tagClass: 'tag-aso-pendente',
            badgeClass: 'badge-aso-cinza'
        };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dv = parseLocalDate ? parseLocalDate(dataVenc) : new Date(dataVenc + 'T12:00:00');
    dv.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const dataFmt = typeof formatSimpleDate === 'function' ? formatSimpleDate(dataVenc) : dataVenc;

    if (diffDays < 0) {
        return {
            status: 'vencido',
            dataVencFmt: dataFmt,
            diffDays: diffDays,
            rotuloAso: `${dataFmt} (Vencido há ${Math.abs(diffDays)}d)`,
            tagClass: 'tag-aso-vencido',
            badgeClass: 'badge-aso-vencido'
        };
    } else if (diffDays <= 30) {
        return {
            status: 'avencer',
            dataVencFmt: dataFmt,
            diffDays: diffDays,
            rotuloAso: `${dataFmt} (Vence em ${diffDays}d)`,
            tagClass: 'tag-aso-avencer',
            badgeClass: 'badge-aso-avencer'
        };
    } else {
        return {
            status: 'valido',
            dataVencFmt: dataFmt,
            diffDays: diffDays,
            rotuloAso: `${dataFmt} (Válido)`,
            tagClass: 'tag-aso-valido',
            badgeClass: 'badge-aso-valido'
        };
    }
}

function atualizarPreviaRelatorioEquipe() {
    const lista = obterListaEquipeFiltrada();
    const textoEl = document.getElementById('relEquipePreviaTexto');
    const badgeEl = document.getElementById('relEquipePreviaBadge');
    const liderSel = (document.getElementById('relEquipeFiltroLider')?.value || '').trim();
    const setorSel = (document.getElementById('relEquipeFiltroSetor')?.value || '').trim();

    let liderNome = 'Geral';
    if (liderSel) {
        liderNome = liderSel.startsWith('NOME:') ? liderSel.replace('NOME:', '') : liderSel;
    }

    let msg = `Equipe: <b>${escapeHTML(liderNome)}</b>`;
    if (setorSel) msg += ` • Setor: <b>${escapeHTML(setorSel)}</b>`;

    let vencidos = 0;
    let avencer = 0;
    lista.forEach(c => {
        const aso = obterAsoColaboradorRelatorio(c);
        if (aso.status === 'vencido') vencidos++;
        else if (aso.status === 'avencer') avencer++;
    });

    if (vencidos > 0) {
        msg += ` • <span style="color:#b91c1c; font-weight:700;">🚨 ${vencidos} ASO(s) vencido(s)</span>`;
    } else if (avencer > 0) {
        msg += ` • <span style="color:#b45309; font-weight:600;">⚠️ ${avencer} a vencer</span>`;
    } else {
        msg += ` • <span style="color:#047857; font-weight:600;">✓ ASOs em dia</span>`;
    }

    if (textoEl) textoEl.innerHTML = msg;
    if (badgeEl) badgeEl.textContent = `${lista.length} colab.`;
}

function imprimirRelatorioEquipeEncarregado() {
    const lista = obterListaEquipeFiltrada();
    if (lista.length === 0) {
        alert('Nenhum colaborador encontrado com os filtros selecionados.');
        return;
    }

    const liderSel = (document.getElementById('relEquipeFiltroLider')?.value || '').trim();
    const setorSel = (document.getElementById('relEquipeFiltroSetor')?.value || '').trim();
    const situacaoSel = document.getElementById('relEquipeFiltroSituacao')?.value || 'ativos';
    const incluirAssinatura = document.getElementById('relEquipeIncluirAssinatura')?.checked !== false;
    const incluirExtras = document.getElementById('relEquipeLinhasExtras')?.checked === true;
    const qtdExtras = Math.max(1, Math.min(30, parseInt(document.getElementById('relEquipeQtdLinhasExtras')?.value || '5', 10)));
    const destacarAso = document.getElementById('relEquipeDestacarAsoVencido')?.checked !== false;

    // Resolução de nomes
    let nomeLiderHeader = 'TODAS AS EQUIPES / FRENTES';
    let nomeLiderAssinatura = 'Encarregado / Responsável de Campo';
    if (liderSel) {
        nomeLiderHeader = liderSel.startsWith('NOME:') ? liderSel.replace('NOME:', '') : liderSel;
        const liderObj = lista.find(e => /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i.test(e.funcao || '')) || lista[0];
        nomeLiderAssinatura = liderObj ? liderObj.nome : nomeLiderHeader;
    } else if (lista.length > 0 && /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i.test(lista[0].funcao || '')) {
        nomeLiderAssinatura = lista[0].nome;
    }

    const nomeSetorHeader = setorSel || 'TODOS OS SETORES / FRENTES DE SERVIÇO';
    const agora = new Date();
    const dataEmissaoFmt = typeof formatSimpleDate === 'function' ? formatSimpleDate(agora.toISOString().slice(0, 10)) : agora.toLocaleDateString('pt-BR');
    const horaEmissaoFmt = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let situacaoDesc = 'Ativos';
    if (situacaoSel === 'demitidos') situacaoDesc = 'Demitidos / Inativos';
    else if (situacaoSel === 'todos') situacaoDesc = 'Completo (Ativos e Desligados)';

    let contVencidos = 0;
    let contAvencer = 0;
    let contValidos = 0;
    let contSemData = 0;

    const regexLider = /ENCARREGADO|SUPERVISOR|L[ÍI]DER|MESTRE|COORDENADOR|GERENTE/i;

    const linhasTabela = lista.map((colab, idx) => {
        const ehLider = regexLider.test(colab.funcao || '');
        const aso = obterAsoColaboradorRelatorio(colab);

        if (aso.status === 'vencido') contVencidos++;
        else if (aso.status === 'avencer') contAvencer++;
        else if (aso.status === 'valido') contValidos++;
        else contSemData++;

        let asoCellHtml = '';
        if (destacarAso) {
            if (aso.status === 'vencido') {
                asoCellHtml = `<span class="tag-aso-vencido">🚨 ${escapeHTML(aso.dataVencFmt)} (VENCIDO)</span>`;
            } else if (aso.status === 'avencer') {
                asoCellHtml = `<span class="tag-aso-avencer">⚠️ ${escapeHTML(aso.dataVencFmt)} (${aso.diffDays}d)</span>`;
            } else if (aso.status === 'valido') {
                asoCellHtml = `<span class="tag-aso-valido">✓ ${escapeHTML(aso.dataVencFmt)}</span>`;
            } else {
                asoCellHtml = `<span class="tag-aso-pendente">Não Informado</span>`;
            }
        } else {
            asoCellHtml = escapeHTML(aso.dataVencFmt);
        }

        const rubricaCell = incluirAssinatura ? `<td class="campo-rubrica">&nbsp;</td>` : '';

        const matId = colab.id || colab.matricula;
        const resumoCiclosColab = typeof obterResumoCiclosFeriasColab === 'function' ? obterResumoCiclosFeriasColab(matId) : null;
        let tagCicloFerias = '';
        if (resumoCiclosColab) {
            if (resumoCiclosColab.registroEmGozo) {
                tagCicloFerias = `<span style="display:inline-block; font-size:8.5px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:3px; padding:1px 4px; margin-left:3px; font-weight:700;">🏖️ Em Férias</span>`;
            } else if (resumoCiclosColab.ciclo2Fechado) {
                tagCicloFerias = `<span style="display:inline-block; font-size:8.5px; background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; border-radius:3px; padding:1px 4px; margin-left:3px; font-weight:700;">2º Ciclo OK</span>`;
            } else if (resumoCiclosColab.ciclo1Fechado) {
                tagCicloFerias = `<span style="display:inline-block; font-size:8.5px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:3px; padding:1px 4px; margin-left:3px; font-weight:700;">1º Ciclo OK</span>`;
            }
        }

        return `
            <tr class="${ehLider ? 'linha-lider' : ''}">
                <td style="text-align:center; font-weight:700;">${idx + 1}</td>
                <td style="text-align:center; font-family:monospace; font-size:10px; font-weight:700;">${escapeHTML(colab.id || colab.matricula || '—')}</td>
                <td>
                    <b>${escapeHTML(colab.nome || '—')}</b>
                    ${ehLider ? '<span class="badge-lider">LÍDER</span>' : ''}
                    ${tagCicloFerias}
                </td>
                <td>${escapeHTML(colab.funcao || '—')}</td>
                <td style="text-align:center;">${escapeHTML(colab.ghe || '—')}</td>
                <td style="text-align:center;">${asoCellHtml}</td>
                ${rubricaCell}
            </tr>
        `;
    }).join('');

    // Linhas extras em branco para anotação manual em campo
    let linhasExtrasHtml = '';
    if (incluirExtras && qtdExtras > 0) {
        for (let i = 1; i <= qtdExtras; i++) {
            const numLinha = lista.length + i;
            const rubricaCell = incluirAssinatura ? `<td class="campo-rubrica">&nbsp;</td>` : '';
            linhasExtrasHtml += `
                <tr class="linha-manual">
                    <td style="text-align:center; color:#94a3b8;">${numLinha}</td>
                    <td style="text-align:center; color:#cbd5e1;">—</td>
                    <td style="color:#94a3b8; font-style:italic;">Anotação manual (Apoio / Visitante)</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    ${rubricaCell}
                </tr>
            `;
        }
    }

    const thRubrica = incluirAssinatura ? `<th style="width:145px; text-align:center;">Rubrica / Presença DDSMA</th>` : '';

    const logoHtml = (typeof LOGO_COP_BASE64 !== 'undefined' && LOGO_COP_BASE64) ?
        `<img src="${LOGO_COP_BASE64}" alt="Consórcio Operador Ramal">` :
        `<div style="font-weight:900; font-size:18px; color:#1e3a8a;">COP</div>`;

    const tituloDoc = `Relação de Efetivo - ${nomeLiderHeader.toUpperCase()} - ${dataEmissaoFmt.replace(/\//g, '-')}`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${escapeHTML(tituloDoc)}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 8mm 10mm 10mm 10mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #0f172a;
            margin: 12px;
            background: #fff;
            line-height: 1.35;
        }
        .no-print {
            text-align: center;
            margin-bottom: 14px;
            padding: 10px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
        }
        .no-print button {
            padding: 9px 20px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            border-radius: 6px;
            border: none;
            background: #4f46e5;
            color: #fff;
            box-shadow: 0 2px 4px rgba(79,70,229,0.3);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .cabecalho {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
            gap: 14px;
        }
        .cabecalho img {
            max-height: 48px;
            max-width: 140px;
            object-fit: contain;
        }
        .cabecalho-texto {
            flex: 1;
            text-align: center;
        }
        .cabecalho-empresa {
            font-size: 11px;
            font-weight: 800;
            color: #334155;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .cabecalho-titulo {
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            margin: 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .cabecalho-sub {
            font-size: 9.5px;
            color: #64748b;
            font-weight: 600;
        }
        .cabecalho-badge {
            text-align: right;
            font-size: 9.5px;
            color: #334155;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 4px 8px;
            background: #f8fafc;
            white-space: nowrap;
        }
        .grid-metadados {
            display: grid;
            grid-template-columns: 1.8fr 1.6fr 1fr 1fr;
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 10px;
            font-size: 10px;
        }
        .meta-item b {
            color: #475569;
            text-transform: uppercase;
            font-size: 8.5px;
            display: block;
            margin-bottom: 1px;
        }
        .meta-item span {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-bottom: 8px;
        }
        th, td {
            border: 1px solid #94a3b8;
            padding: 5px 6px;
            text-align: left;
            vertical-align: middle;
        }
        th {
            background: #e2e8f0;
            color: #0f172a;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
        }
        tbody tr:nth-child(even) {
            background: #f8fafc;
        }
        tbody tr.linha-lider {
            background: #eef2ff !important;
            font-weight: 600;
        }
        .badge-lider {
            background: #4f46e5;
            color: #fff;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 800;
            margin-left: 4px;
            display: inline-block;
        }
        .tag-aso-valido {
            color: #047857;
            font-weight: 700;
        }
        .tag-aso-avencer {
            color: #b45309;
            font-weight: 800;
            background: #fef3c7;
            padding: 2px 5px;
            border-radius: 3px;
            border: 1px solid #fde68a;
            display: inline-block;
        }
        .tag-aso-vencido {
            color: #991b1b;
            font-weight: 900;
            background: #fee2e2;
            padding: 2px 5px;
            border-radius: 3px;
            border: 1px solid #fecaca;
            display: inline-block;
        }
        .tag-aso-pendente {
            color: #64748b;
            font-style: italic;
        }
        .campo-rubrica {
            height: 28px;
            min-width: 135px;
            text-align: center;
            vertical-align: middle;
            color: #cbd5e1;
        }
        .linha-manual {
            color: #94a3b8;
            font-style: italic;
        }
        .caixa-regras {
            background: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 9px;
            color: #713f12;
            margin-bottom: 12px;
            line-height: 1.35;
        }
        .secao-assinaturas {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 20px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .bloco-assinatura {
            border-top: 1.5px solid #0f172a;
            padding-top: 6px;
            text-align: center;
            font-size: 10px;
        }
        .bloco-assinatura b {
            display: block;
            font-size: 10.5px;
            color: #0f172a;
        }
        .bloco-assinatura span {
            font-size: 9px;
            color: #475569;
        }
        .rodape-doc {
            border-top: 1px solid #cbd5e1;
            padding-top: 5px;
            display: flex;
            justify-content: space-between;
            font-size: 8.5px;
            color: #64748b;
            margin-top: 6px;
        }
        @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
        }
    </style>
    <script>
        window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
        };
    </script>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir Lista / Salvar como PDF</button>
        <button style="background:#64748b;" onclick="window.close()">✕ Fechar Janela</button>
    </div>

    <div class="cabecalho">
        ${logoHtml}
        <div class="cabecalho-texto">
            <div class="cabecalho-empresa">CONSÓRCIO OPERADOR RAMAL — PISF RAMAL DO AGRESTE</div>
            <div class="cabecalho-titulo">RELAÇÃO DE EFETIVO POR EQUIPE / FRENTE DE SERVIÇO</div>
            <div class="cabecalho-sub">Controle Operacional de Canteiro • Liberação Diária de Frente • Registro de Presença em DDSMA (NR-01 / NR-18)</div>
        </div>
        <div class="cabecalho-badge">
            <b>GESTÃO DE SST</b><br>
            <span>Emissão: ${dataEmissaoFmt}</span>
        </div>
    </div>

    <div class="grid-metadados">
        <div class="meta-item">
            <b>Encarregado / Liderança de Campo</b>
            <span>${escapeHTML(nomeLiderHeader)}</span>
        </div>
        <div class="meta-item">
            <b>Setor / Frente de Trabalho</b>
            <span>${escapeHTML(nomeSetorHeader)}</span>
        </div>
        <div class="meta-item">
            <b>Data de Extração</b>
            <span>${dataEmissaoFmt} às ${horaEmissaoFmt}</span>
        </div>
        <div class="meta-item">
            <b>Total de Colaboradores</b>
            <span>${lista.length} colaborador(es) (${escapeHTML(situacaoDesc)})</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:32px; text-align:center;">Nº</th>
                <th style="width:68px; text-align:center;">Matrícula</th>
                <th>Nome do Colaborador</th>
                <th style="width:200px;">Função / Cargo</th>
                <th style="width:65px; text-align:center;">GHE</th>
                <th style="width:130px; text-align:center;">Validade do ASO</th>
                ${thRubrica}
            </tr>
        </thead>
        <tbody>
            ${linhasTabela}
            ${linhasExtrasHtml}
        </tbody>
    </table>

    <div class="caixa-regras">
        <b>Diretrizes Operacionais de SST (NR-01 / NR-18):</b>
        A liberação diária da frente de serviço e a autorização de acesso ao canteiro de obras dependem da comprovação de aptidão física (ASO Válido) e da participação ativa no DDSMA. Colaboradores com ASO vencido devem ser encaminhados imediatamente ao setor de Medicina do Trabalho e não podem realizar atividades críticas.
    </div>

    <div class="secao-assinaturas">
        <div class="bloco-assinatura">
            <b>${escapeHTML(nomeLiderAssinatura)}</b>
            <span>Encarregado / Responsável de Campo</span>
        </div>
        <div class="bloco-assinatura">
            <b>Técnico / Engenheiro de Segurança do Trabalho</b>
            <span>Consórcio Operador Ramal • SST</span>
        </div>
    </div>

    <div class="rodape-doc">
        <div>Documento operacional de controle diário emitido via Sistema Integrado de Gestão SST</div>
        <div>PISF Ramal do Agreste — Consórcio Operador Ramal | ${dataEmissaoFmt} ${horaEmissaoFmt}</div>
    </div>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, tituloDoc);
}

function exportarExcelEquipeEncarregado() {
    const lista = obterListaEquipeFiltrada();
    if (lista.length === 0) {
        alert('Nenhum colaborador encontrado com os filtros selecionados.');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada. Por favor, tente novamente.');
        return;
    }

    const liderSel = (document.getElementById('relEquipeFiltroLider')?.value || '').trim();
    const setorSel = (document.getElementById('relEquipeFiltroSetor')?.value || '').trim();
    const situacaoSel = document.getElementById('relEquipeFiltroSituacao')?.value || 'ativos';
    const liderNome = liderSel ? (liderSel.startsWith('NOME:') ? liderSel.replace('NOME:', '') : liderSel) : 'GERAL';

    const agora = new Date();
    const dataFmt = typeof formatSimpleDate === 'function' ? formatSimpleDate(agora.toISOString().slice(0, 10)) : agora.toLocaleDateString('pt-BR');
    const horaFmt = agora.toLocaleTimeString('pt-BR');

    const aoa = [
        ['CONSÓRCIO OPERADOR RAMAL — PISF RAMAL DO AGRESTE'],
        ['RELAÇÃO DE EFETIVO POR EQUIPE / ENCARREGADO (NR-01 / DDSMA)'],
        [`Encarregado/Frente: ${liderNome.toUpperCase()} | Setor: ${(setorSel || 'TODOS').toUpperCase()} | Amostra: ${situacaoSel.toUpperCase()} | Extraído em: ${dataFmt} às ${horaFmt}`],
        [],
        ['Nº', 'Matrícula', 'Nome do Colaborador', 'Função / Cargo', 'Setor', 'GHE', 'Responsável / Frente', 'Validade ASO', 'Situação ASO', 'Status Cadastral', 'Rubrica / Presença']
    ];

    lista.forEach((c, idx) => {
        const aso = obterAsoColaboradorRelatorio(c);
        let situacaoAsoTexto = 'NÃO INFORMADO';
        if (aso.status === 'valido') situacaoAsoTexto = 'VÁLIDO';
        else if (aso.status === 'avencer') situacaoAsoTexto = `VENCE EM ${aso.diffDays}D`;
        else if (aso.status === 'vencido') situacaoAsoTexto = `VENCIDO (${Math.abs(aso.diffDays)}D)`;

        aoa.push([
            idx + 1,
            c.id || c.matricula || '',
            c.nome || '',
            c.funcao || '',
            c.setor || '',
            c.ghe || '',
            c.responsavel || '',
            aso.dataVencFmt || '',
            situacaoAsoTexto,
            colaboradorEstaAtivo(c) ? 'ATIVO' : 'INATIVO/DEMITIDO',
            ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Autofiltro
    const headerRow = 4;
    const startCell = XLSX.utils.encode_cell({ r: headerRow, c: 0 });
    const endCell = XLSX.utils.encode_cell({ r: aoa.length - 1, c: 10 });
    ws['!autofilter'] = { ref: `${startCell}:${endCell}` };

    // Largura das colunas
    ws['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 38 },
        { wch: 30 },
        { wch: 25 },
        { wch: 10 },
        { wch: 24 },
        { wch: 15 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EFETIVO_EQUIPE');

    const slugLider = liderNome.replace(/[^a-zA-Z0-9]/g, '_');
    const slugData = agora.toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Efetivo_Equipe_${slugLider}_${slugData}.xlsx`);
}

function filterEfetivoColaboradores(query) {
    const container = document.getElementById('efetivoSearchResults');
    if (!container) return;
    const q = (query || '').toLowerCase().trim();

    // Aplica o filtro de situação selecionado (Ativos / Demitidos / Todos)
    const baseFiltrada = obterEfetivoFiltrado();
    const matches = (q.length < 2
        ? baseFiltrada
        : baseFiltrada.filter(e => (e.nome && e.nome.toLowerCase().includes(q)) || (e.id && String(e.id).toLowerCase().includes(q)) || (e.funcao && e.funcao.toLowerCase().includes(q)))
    ).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    renderEfetivoResumo();

    if (matches.length === 0) {
        container.innerHTML = q.length < 2
            ? '<div class="db-list-empty">Nenhum colaborador encontrado com esta situação</div>'
            : `<div class="db-list-empty">Nenhum colaborador encontrado para "${escapeHTML(query)}"</div>`;
        return;
    }

    container.innerHTML = matches.map(e => {
        const ativo = colaboradorEstaAtivo(e);
        const cls = ativo ? '' : 'db-item-danger';
        const sNorm = normalizarSexo(e.sexo);
        const sexoTag = sNorm === 'F' ? '<span style="color:#ec4899; font-weight:700; margin-left:4px;" title="Feminino (F)">♀</span>' : '<span style="color:#4f46e5; font-weight:700; margin-left:4px;" title="Masculino (M)">♂</span>';
        return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '(sem nome)')}${sexoTag}</div>
            <div class="db-list-item-sub">Matrícula ${escapeHTML(e.id)} — ${escapeHTML(e.funcao || '')}${ativo ? '' : ' (Demitido/Inativo)'}</div>
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
    const ativo = colaboradorEstaAtivo(e);

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

    let btnCicloRapidoFicha = '';
    const resumoCiclos = typeof obterResumoCiclosFeriasColab === 'function' ? obterResumoCiclosFeriasColab(matricula) : null;
    if (resumoCiclos && !resumoCiclos.ciclo1Fechado) {
        btnCicloRapidoFicha = `<button class="btn-ciclo-rapido" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(matricula)}', '1º Ciclo'); setTimeout(function(){ mostrarDetalheColaborador('${escapeHTML(matricula)}'); }, 400);" title="Marcar 1º Ciclo como Gozado / Histórico Fechado">⚡ Fechar 1º Ciclo</button>`;
    } else if (resumoCiclos && !resumoCiclos.ciclo2Fechado && (totalMeses || 0) >= 12) {
        btnCicloRapidoFicha = `<button class="btn-ciclo-rapido-2" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(matricula)}', '2º Ciclo'); setTimeout(function(){ mostrarDetalheColaborador('${escapeHTML(matricula)}'); }, 400);" title="Marcar 2º Ciclo como Gozado / Histórico Fechado">⚡ Fechar 2º Ciclo</button>`;
    }

    const detail = document.getElementById('efetivoColabDetail');
    detail.innerHTML = `
        <div style="display:flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
                <div style="font-size: 16px; font-weight: 700;">${escapeHTML(e.nome || '')}</div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 2px;">${escapeHTML(e.funcao || '')}${e.setor ? ' — ' + escapeHTML(e.setor) : ''}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                ${statusBadge}
                ${btnCicloRapidoFicha}
                <button class="db-clear-btn" onclick="abrirModalLancamentoFerias('${escapeHTML(matricula)}')">🏖️ Férias</button>
                <button class="db-clear-btn" onclick="abrirFormEfetivo('${escapeHTML(matricula)}')">✏️ Editar</button>
                <button class="db-clear-btn" onclick="abrirTrocaFuncao('${escapeHTML(matricula)}')">🔄 Troca de Função</button>
                <button class="db-clear-btn" onclick="imprimirOsIndividualEfetivo('${escapeHTML(matricula)}')">🖨️ OS</button>
                <button class="db-clear-btn" onclick="abrirModalAssinaturaOs('${escapeHTML(matricula)}')">✍️ Assinatura OS</button>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 14px; font-size: 12.5px;">
            <div><strong>Matrícula:</strong> ${escapeHTML(e.id)}</div>
            <div><strong>Admissão:</strong> ${admissao ? formatSimpleDate(e.dt_admissao || e.data_admissao) : '—'}</div>
            <div><strong>Demissão:</strong> ${demissao ? formatSimpleDate(e.dt_demissao || e.data_demissao) : '—'}</div>
            <div><strong>Tempo de casa:</strong> ${tempoCasaTxt}</div>
            <div><strong>Férias (CLT):</strong> ${renderDetalheFeriasColabBadge(matricula)}</div>
            <div><strong>Aniversário:</strong> ${aniversarioTxt}</div>
            <div><strong>Responsável:</strong> ${escapeHTML(e.responsavel || '—')}</div>
            <div><strong>Cidade/UF:</strong> ${escapeHTML(e.cidade || '—')}${e.estado ? '/' + escapeHTML(e.estado) : ''}</div>
            <div><strong>Estabilidade:</strong> ${escapeHTML(e.estabilidade || '—')}</div>
            <div><strong>GHE:</strong> ${escapeHTML(e.ghe || '—')}</div>
            <div><strong>CPF:</strong> ${escapeHTML(e.cpf || '—')}</div>
            <div><strong>Uniforme:</strong> Calça ${escapeHTML(e.calca || '—')} / Camisa ${escapeHTML(e.camisa || '—')} / Bota ${escapeHTML(e.bota || '—')}</div>
            <div><strong>Sexo:</strong> ${formatarSexoExibicao(e.sexo)}</div>
            <div><strong>Ordem de Serviço:</strong> ${e.os_status === 'entregue' ? `<span style="color:#059669; font-weight:700;">✅ Assinada (${e.os_data_entrega ? formatSimpleDate(e.os_data_entrega) : '—'} - ${escapeHTML(e.os_versao || 'Rev. 00')})</span>` : '<span style="color:#d97706; font-weight:700;">⚠️ Pendente</span>'}</div>
        </div>
        ${treinHtml}
        ${renderHistoricoTrocaFuncaoColab(matricula)}
    `;
    detail.style.display = 'block';
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Sugere a próxima matrícula sequencial disponível, olhando pro maior número já
// cadastrado em colaboradores_efetivo. Só considera matrículas 100% numéricas no
// cálculo (evita sugestão estranha se algum cadastro antigo tiver letra/prefixo) - isso
// não afeta cadastros não-numéricos existentes, eles continuam funcionando normalmente
// em todo o resto do sistema, só não entram nessa conta. Campo continua editável, então
// é só uma sugestão de ponto de partida, não uma trava.
function sugerirProximaMatricula() {
    const numericas = allEfetivo
        .map(e => e.id)
        .filter(id => /^\d+$/.test(id))
        .map(id => parseInt(id, 10));
    if (numericas.length === 0) return '';
    return String(Math.max(...numericas) + 1);
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
        document.getElementById('efForm_dt_admissao').value = formatInputDate(e.dt_admissao || e.data_admissao);
        document.getElementById('efForm_dt_demissao').value = formatInputDate(e.dt_demissao || e.data_demissao);
        document.getElementById('efForm_dt_nascimento').value = formatInputDate(e.dt_nascimento || e.data_nascimento);
        document.getElementById('efForm_cpf').value = e.cpf || '';
        document.getElementById('efForm_cidade').value = e.cidade || '';
        document.getElementById('efForm_estado').value = e.estado || '';
        document.getElementById('efForm_estabilidade').value = e.estabilidade || 'NÃO';
        document.getElementById('efForm_ghe').value = e.ghe || '';
        document.getElementById('efForm_sexo').value = normalizarSexo(e.sexo) === 'F' ? 'F' : 'M';
        document.getElementById('efForm_calca').value = e.calca || '';
        document.getElementById('efForm_camisa').value = e.camisa || '';
        document.getElementById('efForm_bota').value = e.bota || '';
    } else {
        title.textContent = '👤 Novo Colaborador';
        ['matricula', 'nome', 'funcao', 'setor', 'responsavel', 'dt_admissao', 'dt_demissao', 'dt_nascimento', 'cpf', 'cidade', 'estado', 'ghe', 'calca', 'camisa', 'bota']
            .forEach(f => { const el = document.getElementById('efForm_' + f); if (el) el.value = ''; });
        document.getElementById('efForm_status').value = 'ATIVO';
        document.getElementById('efForm_estabilidade').value = 'NÃO';
        document.getElementById('efForm_sexo').value = 'M';
        matriculaInput.readOnly = false;
        matriculaInput.style.background = '';
        matriculaInput.value = sugerirProximaMatricula();
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormEfetivo() {
    document.getElementById('efetivoFormCard').style.display = 'none';
}

async function salvarColaboradorEfetivo() {
    if (bloquearEdicaoSeNaoAutorizado('efetivo')) return;
    const statusEl = document.getElementById('efetivoFormStatus');
    const matricula = document.getElementById('efForm_matricula').value.trim();
    const nome = document.getElementById('efForm_nome').value.trim();

    if (!matricula || !nome) {
        statusEl.textContent = '❌ Matrícula e nome são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    // Trava de segurança: supabaseUpsert faz merge automático em caso de conflito de ID,
    // então sem essa checagem um "Novo Colaborador" salvo por engano com matrícula já
    // existente sobrescreveria/misturaria silenciosamente os dados do colaborador antigo.
    // Só se aplica a cadastro NOVO (campo editável) - edição de colaborador existente
    // (campo bloqueado/readOnly) sempre usa a própria matrícula dele, então não entra
    // nessa checagem.
    const matriculaEhEditavel = !document.getElementById('efForm_matricula').readOnly;
    if (matriculaEhEditavel && allEfetivo.some(e => e.id === matricula)) {
        statusEl.textContent = `❌ Já existe um colaborador cadastrado com a matrícula "${matricula}". Escolha outra matrícula.`;
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const colabExistente = allEfetivo.find(e => e.id === matricula);
    const sexoVal = document.getElementById('efForm_sexo')?.value;
    if (!sexoVal || (sexoVal !== 'M' && sexoVal !== 'F' && sexoVal !== 'MASCULINO' && sexoVal !== 'FEMININO')) {
        statusEl.textContent = '❌ Selecione o sexo/gênero do colaborador (Masculino ou Feminino).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const sexoNormalizado = normalizarSexo(sexoVal);

    const dtDemissaoInput = formatInputDate(document.getElementById('efForm_dt_demissao')?.value) || null;
    let statusInput = document.getElementById('efForm_status')?.value || 'ATIVO';

    // Regra de SST: se data de demissão estiver preenchida, o status obrigatoriamente é DEMITIDO
    if (dtDemissaoInput) {
        statusInput = 'DEMITIDO';
    }
    const ehAtivo = statusInput === 'ATIVO' && !dtDemissaoInput;

    const dtAdmissaoInput = formatInputDate(document.getElementById('efForm_dt_admissao')?.value) || null;
    const dtNascimentoInput = formatInputDate(document.getElementById('efForm_dt_nascimento')?.value) || null;

    const row = {
        id: matricula,
        status: statusInput,
        nome,
        funcao: document.getElementById('efForm_funcao').value.trim(),
        setor: document.getElementById('efForm_setor').value.trim(),
        responsavel: document.getElementById('efForm_responsavel').value.trim(),
        dt_admissao: dtAdmissaoInput,
        dt_demissao: dtDemissaoInput,
        dt_nascimento: dtNascimentoInput,
        cpf: document.getElementById('efForm_cpf').value.trim(),
        cidade: document.getElementById('efForm_cidade').value.trim(),
        estado: document.getElementById('efForm_estado').value.trim(),
        estabilidade: document.getElementById('efForm_estabilidade').value,
        ghe: document.getElementById('efForm_ghe').value.trim(),
        sexo: sexoNormalizado,
        calca: document.getElementById('efForm_calca').value.trim(),
        camisa: document.getElementById('efForm_camisa').value.trim(),
        bota: document.getElementById('efForm_bota').value.trim(),
        os_status: colabExistente?.os_status || 'pendente',
        os_data_entrega: colabExistente?.os_data_entrega || null,
        os_versao: colabExistente?.os_versao || 'Rev. 00',
        os_obs: colabExistente?.os_obs || null,
        os_anexo_url: colabExistente?.os_anexo_url || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('colaboradores_efetivo', [row]);

        // Sincronização automática com a tabela de usuários de campo (colaboradores_checklist)
        try {
            const resColab = await supabaseFetch('colaboradores_checklist', `?or=(matricula.eq.${encodeURIComponent(matricula)},id.eq.${encodeURIComponent(matricula)})`);
            if (Array.isArray(resColab) && resColab.length > 0) {
                for (const item of resColab) {
                    await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(item.id)}`, {
                        method: 'PATCH',
                        headers: {
                            apikey: SUPABASE_KEY,
                            Authorization: `Bearer ${await authTokenDashboard()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ativo: ehAtivo,
                            nome: row.nome,
                            funcao: row.funcao,
                            setor: row.setor
                        })
                    });
                    if (Array.isArray(allColaboradoresInternos)) {
                        const local = allColaboradoresInternos.find(c => String(c.id) === String(item.id));
                        if (local) {
                            local.ativo = ehAtivo;
                            local.nome = row.nome;
                            local.funcao = row.funcao;
                            local.setor = row.setor;
                        }
                    }
                }
            }
        } catch (errSync) {
            console.warn('Aviso: falha ao sincronizar status em colaboradores_checklist:', errSync);
        }

        // Limpa cache memoizado de headcount para refletir imediatamente as novas contagens
        if (typeof _headcountMemoMap !== 'undefined' && _headcountMemoMap && typeof _headcountMemoMap.clear === 'function') {
            _headcountMemoMap.clear();
        }

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

// ============================================
// TROCA DE FUNÇÃO — altera setor/função/GHE do colaborador, gera a Ordem de Serviço
// atualizada + um Termo de Comunicação de Troca de Função, e guarda um histórico
// separado (historico_troca_funcao) pra consulta/auditoria depois (pedido explícito do
// usuário). Reaproveita a mesma resolução de cargo/riscos já usada na Ordem de Serviço
// (resolverCargoInfoDoColaborador) e a mesma lista de exames por GHE já usada na Saúde
// Ocupacional (examesGheColaborador) - não duplica nenhuma das duas regras.
// ============================================

let allHistoricoTrocaFuncao = [];
let trocaFuncaoMatriculaAtual = null;

// Monta um "colaborador" hipotético só com setor/função/ghe pra reaproveitar
// resolverCargoInfoDoColaborador e examesGheColaborador tanto pra situação atual quanto
// pra situação nova, sem duplicar a lógica de resolução em cada lado.
function resolverSituacaoCargo(setor, funcao, ghe) {
    const gheObj = ghe ? allGheCatalogo.find(g => g.id === normalizarGhe(ghe)) : null;
    const { cargoInfo, ambiguo } = resolverCargoInfoDoColaborador(gheObj, funcao);
    const exames = examesGheColaborador({ setor, funcao, ghe });
    return { setor, funcao, ghe, gheObj, cargoInfo, ambiguo, exames };
}

function renderHistoricoTrocaFuncaoColab(matricula) {
    const linhas = allHistoricoTrocaFuncao.filter(h => h.matricula === matricula)
        .sort((a, b) => (b.data_troca || '').localeCompare(a.data_troca || ''));
    if (linhas.length === 0) return '';
    return `
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border);">
            <div style="font-size: 11px; color: var(--text-light); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Histórico de Trocas de Função (${linhas.length})</div>
            ${linhas.map(h => `<div style="font-size:12px; padding:6px 0; border-bottom:1px solid var(--border);">
                <b>${formatSimpleDate(h.data_troca)}</b> — ${escapeHTML(h.setor_anterior)} / ${escapeHTML(h.funcao_anterior)} (GHE ${escapeHTML(h.ghe_anterior)}) → ${escapeHTML(h.setor_novo)} / ${escapeHTML(h.funcao_novo)} (GHE ${escapeHTML(h.ghe_novo)})
            </div>`).join('')}
        </div>`;
}

function abrirTrocaFuncao(matricula) {
    const colab = allEfetivo.find(e => e.id === matricula);
    if (!colab) return;
    trocaFuncaoMatriculaAtual = matricula;

    const atual = resolverSituacaoCargo(colab.setor, colab.funcao, colab.ghe);
    const avisoAtual = !atual.cargoInfo ? textoAvisoCargoOs({ ghe: atual.gheObj, funcao: colab.funcao, ambiguo: atual.ambiguo }) : '';

    document.getElementById('trocaFuncaoAtualResumo').innerHTML = `
        <b>Situação atual de ${escapeHTML(colab.nome)} (matrícula ${escapeHTML(matricula)}):</b><br>
        Setor: ${escapeHTML(colab.setor || '—')} &nbsp; | &nbsp; Cargo: ${escapeHTML(atual.cargoInfo?.cargo || '—')} &nbsp; | &nbsp;
        Função: ${escapeHTML(colab.funcao || '—')} &nbsp; | &nbsp; GHE: ${escapeHTML(colab.ghe || '—')} &nbsp; | &nbsp;
        CBO: ${escapeHTML(atual.cargoInfo?.cbo || '—')}
        ${avisoAtual ? `<div style="color:#b91c1c; margin-top:6px;">${escapeHTML(avisoAtual)}</div>` : ''}
    `;

    document.getElementById('tfForm_data').value = new Date().toISOString().slice(0, 10);
    document.getElementById('tfForm_setor').value = colab.setor || '';
    document.getElementById('tfForm_funcao').value = '';
    document.getElementById('tfForm_ghe').value = colab.ghe || '';
    document.getElementById('tfForm_examesObs').value = '';
    document.getElementById('tfForm_examesObs').dataset.editadoManualmente = '';
    document.getElementById('tfForm_motivo').value = '';
    document.getElementById('trocaFuncaoStatus').textContent = '';
    document.getElementById('trocaFuncaoPreview').style.display = 'none';

    const form = document.getElementById('trocaFuncaoFormCard');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharTrocaFuncao() {
    document.getElementById('trocaFuncaoFormCard').style.display = 'none';
    trocaFuncaoMatriculaAtual = null;
}

// Compara os exames exigidos pelo GHE novo com os do GHE atual - só entra na sugestão
// automática quem é novo na lista (nome do exame ainda não exigido antes). Pedido
// explícito do usuário foi "automático + campo pra ajustar", então isso aqui só
// preenche o ponto de partida do textarea - o texto final digitado é sempre o que vale,
// nunca é sobrescrito de novo depois que o usuário editar (ver dataset.editadoManualmente).
function examesNovosSugeridos(examesAtual, examesNovo) {
    if (!examesNovo) return [];
    const nomesAtual = new Set((examesAtual?.exames || []).map(e => e.nome));
    return (examesNovo.exames || []).filter(e => !nomesAtual.has(e.nome));
}

function atualizarPreviewTrocaFuncao() {
    const colab = allEfetivo.find(e => e.id === trocaFuncaoMatriculaAtual);
    if (!colab) return;
    const setor = document.getElementById('tfForm_setor').value.trim();
    const funcao = document.getElementById('tfForm_funcao').value.trim();
    const ghe = document.getElementById('tfForm_ghe').value.trim();
    const preview = document.getElementById('trocaFuncaoPreview');

    if (!funcao && !ghe) { preview.style.display = 'none'; return; }

    const atual = resolverSituacaoCargo(colab.setor, colab.funcao, colab.ghe);
    const novo = resolverSituacaoCargo(setor, funcao, ghe);
    const avisoNovo = !novo.cargoInfo ? textoAvisoCargoOs({ ghe: novo.gheObj, funcao, ambiguo: novo.ambiguo }) : '';
    const ag = novo.cargoInfo?.agentes || {};
    const sugeridos = examesNovosSugeridos(atual.exames, novo.exames);

    preview.style.display = 'block';
    preview.innerHTML = `
        <b>Pré-visualização da nova situação:</b><br>
        Cargo: ${escapeHTML(novo.cargoInfo?.cargo || '—')} &nbsp; | &nbsp; CBO: ${escapeHTML(novo.cargoInfo?.cbo || '—')}<br>
        Riscos (agentes): Físico: ${escapeHTML(ag.fisico || '—')} · Químico: ${escapeHTML(ag.quimico || '—')} · Biológico: ${escapeHTML(ag.biologico || '—')} · Ergonômico: ${escapeHTML(ag.ergonomico || '—')} · Acidentes: ${escapeHTML(ag.acidentes || '—')}
        ${avisoNovo ? `<div style="color:#b91c1c; margin-top:6px;">${escapeHTML(avisoNovo)}</div>` : ''}
        ${sugeridos.length ? `<div style="margin-top:6px;"><b>Exames novos sugeridos (não exigidos na função atual):</b> ${sugeridos.map(e => escapeHTML(e.nome)).join(', ')}</div>` : '<div style="margin-top:6px; color:var(--text-light);">Nenhum exame novo identificado em relação à função atual.</div>'}
    `;

    const obsEl = document.getElementById('tfForm_examesObs');
    if (!obsEl.dataset.editadoManualmente && sugeridos.length) {
        obsEl.value = `Avaliar necessidade de: ${sugeridos.map(e => e.nome).join(', ')}.`;
    }
}

async function confirmarTrocaFuncao() {
    const statusEl = document.getElementById('trocaFuncaoStatus');
    const matricula = trocaFuncaoMatriculaAtual;
    const colab = allEfetivo.find(e => e.id === matricula);
    if (!colab) return;

    const data = document.getElementById('tfForm_data').value;
    const setorNovo = document.getElementById('tfForm_setor').value.trim();
    const funcaoNovo = document.getElementById('tfForm_funcao').value.trim();
    const gheNovo = document.getElementById('tfForm_ghe').value.trim();
    const examesObs = document.getElementById('tfForm_examesObs').value.trim();
    const motivo = document.getElementById('tfForm_motivo').value.trim();

    if (!data || !setorNovo || !funcaoNovo || !gheNovo) {
        statusEl.textContent = '❌ Preencha data, setor, função e GHE novos.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';

    try {
        await garantirDocumentosControleCarregados();
        // Captura a situação ANTES de sobrescrever o cadastro - senão colab.setor/funcao/ghe
        // já estariam com os valores novos quando fossem usados aqui embaixo.
        const atual = resolverSituacaoCargo(colab.setor, colab.funcao, colab.ghe);
        const novo = resolverSituacaoCargo(setorNovo, funcaoNovo, gheNovo);
        const sugeridos = examesNovosSugeridos(atual.exames, novo.exames);

        const historicoRow = {
            id: `TF_${matricula}_${Date.now()}`,
            matricula,
            nome_colaborador: colab.nome,
            data_troca: data,
            setor_anterior: colab.setor || '',
            funcao_anterior: colab.funcao || '',
            ghe_anterior: colab.ghe || '',
            cargo_anterior: atual.cargoInfo?.cargo || '',
            setor_novo: setorNovo,
            funcao_novo: funcaoNovo,
            ghe_novo: gheNovo,
            cargo_novo: novo.cargoInfo?.cargo || '',
            exames_sugeridos: sugeridos.map(e => e.nome),
            exames_observacao: examesObs,
            motivo: motivo,
            responsavel_registro: CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome
        };
        await supabaseUpsert('historico_troca_funcao', [historicoRow]);
        allHistoricoTrocaFuncao.push(historicoRow);

        const rowEfetivo = { ...colab, setor: setorNovo, funcao: funcaoNovo, ghe: gheNovo };
        await supabaseUpsert('colaboradores_efetivo', [rowEfetivo]);
        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) allEfetivo[idx] = rowEfetivo;

        const folhas = [
            construirFolhaOrdemServico(matricula, { nome: colab.nome, funcao: funcaoNovo }, CRONOGRAMA_DEFAULTS_SESSAO, data),
            construirFolhaTermoTrocaFuncao(colab, atual, novo, sugeridos, examesObs, motivo, data)
        ].join('');

        const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Troca de Função - ${escapeHTML(colab.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${typeof DOC_INDIVIDUAL_CSS !== 'undefined' ? DOC_INDIVIDUAL_CSS : ''}
    @page { size: A4 portrait; margin: 12mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${folhas}
</body></html>`;

        abrirDocumentoHtmlParaImpressao(html, `Troca_Funcao_${(colab.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
        registrarEmissaoDocumento('ordem_servico', colab.nome);
        registrarEmissaoDocumento('termo_troca_funcao', colab.nome);

        statusEl.textContent = '✅ Troca registrada. Os documentos foram abertos numa nova aba pra impressão.';
        statusEl.style.color = 'var(--success)';
        renderEfetivoPanel();
        filterEfetivoColaboradores(document.getElementById('efetivoSearchInput').value);
        setTimeout(() => {
            fecharTrocaFuncao();
            mostrarDetalheColaborador(matricula);
        }, 900);
    } catch (err) {
        console.error('Erro ao confirmar troca de função:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Termo de Comunicação de Troca de Função - documento próprio (separado da Ordem de
// Serviço) só pra registrar formalmente a mudança em si (situação anterior x nova,
// motivo, exames a avaliar) - pedido explícito do usuário de ter os dois documentos.
function construirFolhaTermoTrocaFuncao(colab, atual, novo, sugeridos, examesObs, motivo, data) {
    const codigo = codigoRevisaoDocumento('termo_troca_funcao');
    const agAntes = atual.cargoInfo?.agentes || {};
    const agDepois = novo.cargoInfo?.agentes || {};

    return `<div class="folha folha-compacta">
        <div style="text-align:center; margin-bottom: 10px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:56px; object-fit:contain;"></div>
        <div class="titulo" style="font-size:16px;">TERMO DE COMUNICAÇÃO DE TROCA DE FUNÇÃO</div>
        ${codigo ? `<div class="subtitulo">${escapeHTML(codigo)}</div>` : ''}
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
            <tr><td style="border:1px solid #ccc; padding:4px 6px;"><b>Emissão:</b> ${formatSimpleDate(data)}</td>
                <td style="border:1px solid #ccc; padding:4px 6px;"><b>Empresa:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</td>
                <td style="border:1px solid #ccc; padding:4px 6px;"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</td></tr>
            <tr><td style="border:1px solid #ccc; padding:4px 6px;" colspan="2"><b>Funcionário:</b> ${escapeHTML(colab.nome)}</td>
                <td style="border:1px solid #ccc; padding:4px 6px;"><b>Matrícula:</b> ${escapeHTML(colab.id)}</td></tr>
        </table>

        <div class="bloco"><div class="bloco-titulo">Situação Anterior:</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead><tr style="background:#f2f2f2;">
                    <th style="border:1px solid #ccc; padding:4px 6px;">Setor</th><th style="border:1px solid #ccc; padding:4px 6px;">Cargo</th>
                    <th style="border:1px solid #ccc; padding:4px 6px;">Função</th><th style="border:1px solid #ccc; padding:4px 6px;">CBO</th>
                </tr></thead>
                <tbody><tr>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(atual.setor || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(atual.cargoInfo?.cargo || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(atual.funcao || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(atual.cargoInfo?.cbo || '')}</td>
                </tr></tbody>
            </table>
        </div>

        <div class="bloco"><div class="bloco-titulo">Nova Situação:</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead><tr style="background:#f2f2f2;">
                    <th style="border:1px solid #ccc; padding:4px 6px;">Setor</th><th style="border:1px solid #ccc; padding:4px 6px;">Cargo</th>
                    <th style="border:1px solid #ccc; padding:4px 6px;">Função</th><th style="border:1px solid #ccc; padding:4px 6px;">CBO</th>
                </tr></thead>
                <tbody><tr>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(novo.setor || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(novo.cargoInfo?.cargo || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(novo.funcao || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(novo.cargoInfo?.cbo || '')}</td>
                </tr></tbody>
            </table>
        </div>

        <div class="bloco"><div class="bloco-titulo">Riscos (Agentes) — Antes x Depois:</div>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead><tr style="background:#f2f2f2;">
                    <th style="border:1px solid #ccc; padding:4px 6px;"></th><th style="border:1px solid #ccc; padding:4px 6px;">Físico</th><th style="border:1px solid #ccc; padding:4px 6px;">Químico</th>
                    <th style="border:1px solid #ccc; padding:4px 6px;">Biológico</th><th style="border:1px solid #ccc; padding:4px 6px;">Ergonômico</th><th style="border:1px solid #ccc; padding:4px 6px;">Acidentes</th>
                </tr></thead>
                <tbody>
                <tr><td style="border:1px solid #ccc; padding:4px 6px;"><b>Antes</b></td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agAntes.fisico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agAntes.quimico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agAntes.biologico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agAntes.ergonomico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agAntes.acidentes || '')}</td></tr>
                <tr><td style="border:1px solid #ccc; padding:4px 6px;"><b>Depois</b></td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agDepois.fisico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agDepois.quimico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agDepois.biologico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agDepois.ergonomico || '')}</td>
                    <td style="border:1px solid #ccc; padding:4px 6px;">${escapeHTML(agDepois.acidentes || '')}</td></tr>
                </tbody>
            </table>
        </div>

        <div class="bloco"><div class="bloco-titulo">Exames Ocupacionais a Avaliar:</div>
            <div class="texto">${examesObs ? escapeHTML(examesObs) : '<span style="color:#888;">—</span>'}</div>
        </div>
        ${motivo ? `<div class="bloco"><div class="bloco-titulo">Motivo da Troca:</div><div class="texto">${escapeHTML(motivo)}</div></div>` : ''}

        <div class="texto" style="margin-top:16px;">
            Declaro estar ciente da mudança de função acima descrita, dos riscos a ela associados e da entrega, nesta mesma data, da Ordem de Serviço
            atualizada com as orientações de segurança referentes à nova função.
        </div>
        <div class="assinaturas">
            ${blocoAssinatura(`${escapeHTML(colab.nome)}<br>Colaborador`)}
            ${blocoAssinatura(`${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome)}<br>${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_qualificacao)}<br>${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_registro)}`)}
        </div>
    </div>`;
}

const _headcountMemoMap = new Map();

function headcountAsOf(dateEnd) {
    if (!dateEnd || !(dateEnd instanceof Date) || isNaN(dateEnd.getTime())) return 0;
    const chave = dateEnd.toISOString().slice(0, 10);
    if (_headcountMemoMap.has(chave)) {
        return _headcountMemoMap.get(chave);
    }
    const endMs = dateEnd.getTime();
    let count = 0;
    for (let i = 0; i < allEfetivo.length; i++) {
        const e = allEfetivo[i];
        if (!e || !e.dt_admissao) continue;
        const admMs = e._admMs || (e._admMs = parseLocalDate(e.dt_admissao).getTime());
        if (isNaN(admMs) || admMs > endMs) continue;
        if (!e.dt_demissao) {
            count++;
            continue;
        }
        const demMs = e._demMs || (e._demMs = parseLocalDate(e.dt_demissao).getTime());
        if (isNaN(demMs) || demMs > endMs) {
            count++;
        }
    }
    _headcountMemoMap.set(chave, count);
    return count;
}

// ================================================================
// RELATÓRIO MENSAL "DDS/TREINAMENTO" (mesmo formato do PDF que o usuário já envia
// todo mês pra gerenciadora do contrato) - ver notas completas no prompt que criou
// esta seção.
// ================================================================

// Preenche mês/ano (padrão: mês anterior ao atual) e os 3 campos de turmas/módulos
// (padrão: último valor salvo em relatorio_mensal_config) só na primeira vez que a
// aba é aberta - não sobrescreve o que o usuário já tiver digitado na tela.
// ================================================================
// MÓDULO: CONTROLE E RASTREABILIDADE DE ORDENS DE SERVIÇO (NR-01)
// Gestão nominal do efetivo ativo: identifica quem já assinou a OS
// e quem está pendente de entrega, prevenindo passivos trabalhistas.
// ================================================================

let filtroOsStatusAtual = 'todos'; // 'todos' | 'pendentes' | 'assinadas'
let allOrdensServicoEntregas = [];

function filtrarStatusControleOs(status) {
    filtroOsStatusAtual = status;
    ['todos', 'pendentes', 'assinadas', 'inconsistentes'].forEach(s => {
        const btn = document.getElementById('btnFiltroOs-' + s);
        if (btn) btn.classList.toggle('active', s === status);
    });
    renderTabelaControleOs();
}

function limparFiltrosControleOs() {
    filtroOsStatusAtual = 'todos';
    ['todos', 'pendentes', 'assinadas', 'inconsistentes'].forEach(s => {
        const btn = document.getElementById('btnFiltroOs-' + s);
        if (btn) btn.classList.toggle('active', s === 'todos');
    });
    const setorSel = document.getElementById('filtroOsSetorGhe');
    if (setorSel) setorSel.value = '';
    const buscaInput = document.getElementById('filtroOsBusca');
    if (buscaInput) buscaInput.value = '';
    renderTabelaControleOs();
}

function popularSelectSetorGheOs() {
    const sel = document.getElementById('filtroOsSetorGhe');
    if (!sel) return;
    const valAtual = sel.value;
    const setoresGhe = new Set();
    
    (allEfetivo || []).filter(e => colaboradorEstaAtivo(e)).forEach(e => {
        const item = e.setor ? (e.ghe ? `${e.setor} | ${e.ghe}` : e.setor) : (e.ghe || '');
        if (item) setoresGhe.add(item.trim());
    });

    const lista = Array.from(setoresGhe).sort();
    let opts = '<option value="">🏢 Todos os Setores / GHE</option>';
    lista.forEach(item => {
        const selected = item === valAtual ? ' selected' : '';
        opts += `<option value="${escapeHTML(item)}"${selected}>${escapeHTML(item)}</option>`;
    });
    sel.innerHTML = opts;
}

async function renderControleOrdensServico() {
    if (!allEfetivo || allEfetivo.length === 0) {
        await loadEfetivoData();
    }
    if (allGheCatalogo.length === 0) {
        allGheCatalogo = await supabaseFetch('ghe_catalogo', '?select=*');
    }
    await garantirDocumentosControleCarregados();
    
    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    const totalAtivos = ativos.length;
    const totalAssinadas = ativos.filter(e => e.os_status === 'entregue').length;
    const totalPendentes = totalAtivos - totalAssinadas;
    const pctCobertura = totalAtivos > 0 ? Math.round((totalAssinadas / totalAtivos) * 100) : 0;

    // Atualiza KPIs do Dashboard de OS
    const kpiTotal = document.getElementById('kpiOsTotalAtivos');
    if (kpiTotal) kpiTotal.textContent = totalAtivos;

    const kpiAssinadas = document.getElementById('kpiOsAssinadas');
    if (kpiAssinadas) kpiAssinadas.textContent = totalAssinadas;

    const kpiAssinadasPct = document.getElementById('kpiOsAssinadasPct');
    if (kpiAssinadasPct) kpiAssinadasPct.textContent = `${pctCobertura}% do quadro ativo`;

    const kpiPendentes = document.getElementById('kpiOsPendentes');
    if (kpiPendentes) kpiPendentes.textContent = totalPendentes;

    const kpiPendentesPct = document.getElementById('kpiOsPendentesPct');
    if (kpiPendentesPct) {
        kpiPendentesPct.textContent = totalPendentes > 0 
            ? `${totalPendentes} aguardando coleta física` 
            : '✅ 100% regular (sem pendências)';
    }

    const kpiCobertura = document.getElementById('kpiOsCobertura');
    if (kpiCobertura) kpiCobertura.textContent = `${pctCobertura}%`;

    const kpiBar = document.getElementById('kpiOsProgressBar');
    if (kpiBar) kpiBar.style.width = `${pctCobertura}%`;

    // Atualiza contadores dos botões de filtro
    const cTodos = document.getElementById('countOsTodos');
    if (cTodos) cTodos.textContent = totalAtivos;

    const cPend = document.getElementById('countOsPendentes');
    if (cPend) cPend.textContent = totalPendentes;

    const cAssin = document.getElementById('countOsAssinadas');
    if (cAssin) cAssin.textContent = totalAssinadas;

    const totalInconsistencias = ativos.filter(e => avaliarCorrespondenciaCargoOs(e.id, e.funcao).semCorrespondencia).length;
    const badgeIncons = document.getElementById('badgeInconsistenciasOs');
    if (badgeIncons) badgeIncons.textContent = totalInconsistencias;
    const cIncons = document.getElementById('countOsInconsistentes');
    if (cIncons) cIncons.textContent = totalInconsistencias;

    popularSelectSetorGheOs();
    renderTabelaControleOs();
}

function renderTabelaControleOs() {
    const tbody = document.getElementById('tabelaRastreabilidadeOsBody');
    const msgVazia = document.getElementById('tabelaOsVaziaMsg');
    if (!tbody) return;

    let lista = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));

    // Filtro por Status
    if (filtroOsStatusAtual === 'pendentes') {
        lista = lista.filter(e => e.os_status !== 'entregue');
    } else if (filtroOsStatusAtual === 'assinadas') {
        lista = lista.filter(e => e.os_status === 'entregue');
    } else if (filtroOsStatusAtual === 'inconsistentes') {
        lista = lista.filter(e => avaliarCorrespondenciaCargoOs(e.id, e.funcao).semCorrespondencia);
    }

    // Filtro por Setor / GHE
    const filtroSetorGheVal = (document.getElementById('filtroOsSetorGhe')?.value || '').trim();
    if (filtroSetorGheVal) {
        lista = lista.filter(e => {
            const item = e.setor ? (e.ghe ? `${e.setor} | ${e.ghe}` : e.setor) : (e.ghe || '');
            return item.trim() === filtroSetorGheVal;
        });
    }

    // Filtro de Busca Textual
    const buscaVal = (document.getElementById('filtroOsBusca')?.value || '').trim().toLowerCase();
    if (buscaVal) {
        lista = lista.filter(e => {
            const aval = typeof avaliarCorrespondenciaCargoOs === 'function' ? avaliarCorrespondenciaCargoOs(e.id, e.funcao) : null;
            const cboStr = (aval?.cargoInfo?.cbo || e.cbo || '').toLowerCase();
            const cargoStr = (aval?.cargoInfo?.cargo || '').toLowerCase();
            return (e.nome && e.nome.toLowerCase().includes(buscaVal)) ||
                   (e.id && String(e.id).toLowerCase().includes(buscaVal)) ||
                   (e.funcao && e.funcao.toLowerCase().includes(buscaVal)) ||
                   (cargoStr && cargoStr.includes(buscaVal)) ||
                   (cboStr && cboStr.includes(buscaVal)) ||
                   (e.cpf && e.cpf.toLowerCase().includes(buscaVal)) ||
                   (e.setor && e.setor.toLowerCase().includes(buscaVal)) ||
                   (e.ghe && e.ghe.toLowerCase().includes(buscaVal));
        });
    }

    // Ordenação: primeiro os pendentes (foco de ação imediata), depois por nome
    lista.sort((a, b) => {
        const aEntregue = a.os_status === 'entregue' ? 1 : 0;
        const bEntregue = b.os_status === 'entregue' ? 1 : 0;
        if (aEntregue !== bEntregue) return aEntregue - bEntregue; // 0 (pendente) antes de 1 (entregue)
        return (a.nome || '').localeCompare(b.nome || '');
    });

    if (lista.length === 0) {
        tbody.innerHTML = '';
        if (msgVazia) msgVazia.style.display = 'block';
        return;
    }
    if (msgVazia) msgVazia.style.display = 'none';

    let html = '';
    lista.forEach(e => {
        const ehEntregue = e.os_status === 'entregue';
        const badgeStatus = ehEntregue
            ? `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:#d1fae5; color:#065f46; font-size:11px; font-weight:700; border:1px solid #a7f3d0;" title="Ordem de Serviço assinada e arquivada">✅ ASSINADA</span>`
            : `<span style="display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11px; font-weight:700; border:1px solid #fde68a;" title="Pendente de coleta de assinatura">⚠️ PENDENTE</span>`;

        const anexosOs = typeof anexosDoRegistro === 'function' ? anexosDoRegistro('ordens_servico', e.id) : [];
        const temAnexo = anexosOs.length > 0;

        let dataEntregaFormatada = e.os_data_entrega 
            ? formatSimpleDate(e.os_data_entrega) 
            : `<span style="color:var(--text-light); font-size:11.5px;">—</span>`;

        if (temAnexo) {
            dataEntregaFormatada += `<div style="margin-top:3px;"><a href="${escapeHTML(anexosOs[0].drive_view_link)}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#0284c7; text-decoration:none; font-weight:700; background:#f0f9ff; padding:2px 6px; border-radius:4px; border:1px solid #bae6fd;" title="Abrir ${escapeHTML(anexosOs[0].nome_arquivo)} no Google Drive">📎 ${anexosOs.length === 1 ? 'Ver no Drive' : anexosOs.length + ' anexos'}</a></div>`;
        } else if (e.os_anexo_url) {
            dataEntregaFormatada += `<div style="margin-top:3px;"><a href="${escapeHTML(e.os_anexo_url)}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#0284c7; text-decoration:none; font-weight:700; background:#f0f9ff; padding:2px 6px; border-radius:4px; border:1px solid #bae6fd;" title="Abrir comprovante no Google Drive">📎 Ver no Drive</a></div>`;
        }

        const versaoTxt = e.os_versao || 'Rev. 00';
        const setorGheTxt = e.setor 
            ? (e.ghe ? `${escapeHTML(e.setor)} <span style="font-size:11px; color:var(--text-light); font-weight:600;">[${escapeHTML(e.ghe)}]</span>` : escapeHTML(e.setor))
            : (e.ghe ? escapeHTML(e.ghe) : '<span style="color:var(--text-light);">—</span>');

        html += `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(37,99,235,0.03)'" onmouseout="this.style.background=''">
                <td style="padding: 10px 14px; font-weight: 700; color: var(--primary);">${escapeHTML(e.id)}</td>
                <td style="padding: 10px 14px;">
                    <div style="font-weight: 700; color: var(--text); cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(e.id)}')" title="Clique para ver ficha completa">${escapeHTML(e.nome || '')}</div>
                    ${e.cpf ? `<div style="font-size: 11px; color: var(--text-light);">CPF: ${escapeHTML(e.cpf)}</div>` : ''}
                </td>
                <td style="padding: 10px 14px; font-weight: 500;">
                    <div style="font-weight: 600; color: var(--text);">${escapeHTML(e.funcao || '—')}</div>
                    ${(() => {
                        const aval = avaliarCorrespondenciaCargoOs(e.id, e.funcao);
                        if (aval.semCorrespondencia) {
                            return `<div style="margin-top:3px;"><span style="color:#b45309; background:#fef3c7; border:1px solid #fde68a; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:3px;" onclick="abrirModalAuditoriaCorrespondenciaOs('${escapeHTML(e.id)}')" title="${escapeHTML(textoAvisoCargoOs({ ghe: aval.ghe, funcao: aval.funcao, ambiguo: aval.ambiguo, candidatos: aval.candidatos }))}">⚠️ Sem Correspondência</span></div>`;
                        }
                        const cbo = aval.cargoInfo?.cbo || e.cbo;
                        const cargoNome = aval.cargoInfo?.cargo && aval.cargoInfo.cargo !== e.funcao ? ` (${escapeHTML(aval.cargoInfo.cargo)})` : '';
                        if (cbo) {
                            return `<div style="margin-top:3px;"><span style="color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:700; display:inline-flex; align-items:center; gap:3px;" title="CBO Oficial: ${escapeHTML(cbo)}${cargoNome}">📋 CBO ${escapeHTML(cbo)}</span></div>`;
                        }
                        return '';
                    })()}
                </td>
                <td style="padding: 10px 14px;">${setorGheTxt}</td>
                <td style="padding: 10px 14px; color: var(--text-light);">${e.dt_admissao ? formatSimpleDate(e.dt_admissao) : '—'}</td>
                <td style="padding: 10px 14px; text-align: center;">${badgeStatus}</td>
                <td style="padding: 10px 14px;">${dataEntregaFormatada}</td>
                <td style="padding: 10px 14px; font-size: 11.5px; color: var(--text-light); font-weight: 600;">${escapeHTML(versaoTxt)}</td>
                <td style="padding: 10px 14px; text-align: center;">
                    <div style="display: inline-flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap;">
                        <button class="db-clear-btn" style="padding: 4px 8px; font-size: 11.5px;" onclick="imprimirOsIndividualEfetivo('${escapeHTML(e.id)}')" title="Imprimir Ordem de Serviço timbrada oficial">
                            🖨️ Imprimir
                        </button>
                        <button class="db-clear-btn" style="padding: 4px 8px; font-size: 11.5px; ${temAnexo ? 'color:#0284c7; border-color:#7dd3fc; background:#f0f9ff; font-weight:700;' : ''}" onclick="abrirAnexosOsColaborador('${escapeHTML(e.id)}')" title="Anexar foto ou PDF da Ordem de Serviço assinada no Google Drive">
                            📎 ${temAnexo ? anexosOs.length : 'Anexo'}
                        </button>
                        <button class="db-clear-btn" style="padding: 4px 8px; font-size: 11.5px; border-color: var(--primary); color: var(--primary);" onclick="abrirModalAssinaturaOs('${escapeHTML(e.id)}')" title="Registrar ou alterar dados da entrega e assinatura">
                            ✍️ Registrar
                        </button>
                        <button class="db-clear-btn" style="padding: 4px 8px; font-size: 11.5px; ${ehEntregue ? 'color:#b45309; border-color:#fde68a;' : 'color:#047857; border-color:#a7f3d0; background:#ecfdf5;'}" onclick="alternarStatusRapidoOs('${escapeHTML(e.id)}')" title="${ehEntregue ? 'Reverter para Pendente' : 'Marcar como Assinada Hoje'}">
                            ${ehEntregue ? '↩️ Desfazer' : '⚡ Baixa'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Emissão individual de Ordem de Serviço com base no efetivo cadastrado
async function imprimirOsIndividualEfetivo(matricula) {
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) {
        alert('Colaborador não encontrado.');
        return;
    }
    await garantirDocumentosControleCarregados();

    const dataRef = colab.os_data_entrega || colab.dt_admissao || new Date().toISOString().split('T')[0];
    const campos = (typeof CRONOGRAMA_DEFAULTS_SESSAO !== 'undefined') ? CRONOGRAMA_DEFAULTS_SESSAO : {
        responsavel_tecnico_nome: 'João Everton de Souza Limeira',
        responsavel_tecnico_qualificacao: 'Engenheiro de Segurança do Trabalho',
        responsavel_tecnico_registro: 'CREA 12345/D-PE'
    };

    const folhaHtml = construirFolhaOrdemServico(
        matricula,
        { nome: colab.nome, funcao: colab.funcao },
        campos,
        dataRef
    );

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ordem de Serviço (NR-01) - ${escapeHTML(colab.nome)}</title>
<style>
    ${typeof DOC_INDIVIDUAL_CSS !== 'undefined' ? DOC_INDIVIDUAL_CSS : ''}
    @page { size: A4 portrait; margin: 12mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${folhaHtml}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Ordem_de_Servico_${(colab.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}`);
    if (typeof registrarEmissaoDocumento === 'function') {
        registrarEmissaoDocumento('ordem_servico', colab.nome);
    }
}

// Impressão em lote de todas as Ordens de Serviço dos colaboradores pendentes
async function imprimirOsEmLotePendentes() {
    await loadEfetivoData();
    await garantirDocumentosControleCarregados();

    let pendentes = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e) && e.os_status !== 'entregue');

    // Se houver filtro de setor/GHE ativo na tela, respeita para permitir imprimir por frente de serviço
    const filtroSetorGheVal = (document.getElementById('filtroOsSetorGhe')?.value || '').trim();
    if (filtroSetorGheVal) {
        pendentes = pendentes.filter(e => {
            const item = e.setor ? (e.ghe ? `${e.setor} | ${e.ghe}` : e.setor) : (e.ghe || '');
            return item.trim() === filtroSetorGheVal;
        });
    }

    if (pendentes.length === 0) {
        alert('🎉 Não há colaboradores pendentes de assinatura de Ordem de Serviço para o filtro selecionado!');
        return;
    }

    const conf = confirm(`Deseja gerar a impressão em lote de ${pendentes.length} Ordens de Serviço (NR-01) para os colaboradores pendentes?`);
    if (!conf) return;

    const campos = (typeof CRONOGRAMA_DEFAULTS_SESSAO !== 'undefined') ? CRONOGRAMA_DEFAULTS_SESSAO : {
        responsavel_tecnico_nome: 'João Everton de Souza Limeira',
        responsavel_tecnico_qualificacao: 'Engenheiro de Segurança do Trabalho',
        responsavel_tecnico_registro: 'CREA 12345/D-PE'
    };

    const hoje = new Date().toISOString().split('T')[0];

    // Ordenar alfabeticamente para facilitar a entrega em campo
    pendentes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const folhas = pendentes.map(colab => {
        const dataRef = colab.os_data_entrega || colab.dt_admissao || hoje;
        return construirFolhaOrdemServico(
            colab.id,
            { nome: colab.nome, funcao: colab.funcao },
            campos,
            dataRef
        );
    }).join('');

    const cssLote = `
        @page { size: A4 portrait; margin: 12mm !important; }
        @media print {
            body { margin: 0; background: #fff !important; }
            .no-print { display: none !important; }
            .folha { page-break-after: always !important; box-shadow: none !important; margin: 0 auto !important; }
            .folha-os {
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                padding: 0 !important;
            }
            .folha-os:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
            }
            .assinaturas, .assinaturas-os, .assinatura-item {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
        }
        .no-print { text-align: center; padding: 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 999; }
        .no-print button { background: #2563eb; color: #fff; border: none; padding: 10px 22px; font-size: 14px; font-weight: 700; border-radius: 8px; cursor: pointer; }
    `;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ordens de Serviço em Lote (NR-01) - ${pendentes.length} Colaboradores Pendentes</title>
<style>${typeof DOC_INDIVIDUAL_CSS !== 'undefined' ? DOC_INDIVIDUAL_CSS : ''}${cssLote}</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir Todas as ${pendentes.length} Ordens de Serviço</button>
        <span style="font-size: 13px; color: #64748b; margin-left: 12px;">Cada Ordem de Serviço será impressa em sua própria folha timbrada oficial.</span>
    </div>
    ${folhas}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Ordens_de_Servico_Lote_${hoje}`);
}

// Modal de Registro e Edição da Entrega de OS
function abrirModalAssinaturaOs(matricula) {
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    document.getElementById('modalOs_matricula').value = colab.id;
    document.getElementById('modalOs_lblNome').textContent = colab.nome || '—';
    document.getElementById('modalOs_lblMatricula').textContent = colab.id;
    document.getElementById('modalOs_lblFuncao').textContent = colab.funcao || '—';
    document.getElementById('modalOs_lblAdmissao').textContent = colab.dt_admissao ? formatSimpleDate(colab.dt_admissao) : '—';
    document.getElementById('modalOs_lblGhe').textContent = `${colab.setor || 'Geral'} / ${colab.ghe || 'GHE Padrão'}`;

    // Correspondência CBO / GHE no Modal
    const aval = typeof avaliarCorrespondenciaCargoOs === 'function' ? avaliarCorrespondenciaCargoOs(colab.id, colab.funcao) : null;
    const cbo = aval?.cargoInfo?.cbo || colab.cbo || '';
    const elCbo = document.getElementById('modalOs_lblCbo');
    if (elCbo) {
        if (cbo) {
            const cargoDesc = aval?.cargoInfo?.cargo && aval.cargoInfo.cargo !== colab.funcao ? ` (${aval.cargoInfo.cargo})` : '';
            elCbo.textContent = `${cbo}${cargoDesc}`;
            elCbo.style.color = '#1d4ed8';
        } else {
            elCbo.textContent = 'Não identificado no GHE';
            elCbo.style.color = '#b45309';
        }
    }

    const elAviso = document.getElementById('modalOs_avisoCorrespondencia');
    if (elAviso) {
        if (aval?.semCorrespondencia) {
            elAviso.style.display = 'block';
            elAviso.innerHTML = `⚠️ <strong>Atenção:</strong> Função "${escapeHTML(colab.funcao || '')}" sem correspondência direta com os cargos do GHE. <a href="javascript:void(0)" onclick="fecharModalAssinaturaOs(); abrirModalAuditoriaCorrespondenciaOs('${escapeHTML(colab.id)}')" style="color:#2563eb; font-weight:700; text-decoration:underline;">Clique aqui para diagnosticar e vincular o cargo</a>.`;
        } else {
            elAviso.style.display = 'none';
        }
    }

    const ehEntregue = colab.os_status === 'entregue';
    document.getElementById('modalOs_status').value = ehEntregue ? 'entregue' : 'pendente';

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('modalOs_dataEntrega').value = colab.os_data_entrega || colab.dt_admissao || hoje;
    document.getElementById('modalOs_versao').value = colab.os_versao || 'Rev. 00';
    document.getElementById('modalOs_entreguePor').value = '';
    document.getElementById('modalOs_obs').value = colab.os_obs || '';

    const modal = document.getElementById('modalRegistrarAssinaturaOs');
    if (modal) modal.style.display = 'flex';
    atualizarAnexosModalOs(colab.id);
}

function fecharModalAssinaturaOs() {
    const modal = document.getElementById('modalRegistrarAssinaturaOs');
    if (modal) modal.style.display = 'none';
}

function abrirAnexosOsColaborador(matricula) {
    if (!matricula) return;
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    const nome = colab ? colab.nome : ('Matrícula ' + matricula);
    abrirAnexoModal('ordens_servico', matricula, 'Ordem de Serviço (NR-01) — ' + nome);
}

function atualizarAnexosModalOs(mat) {
    const matricula = mat || document.getElementById('modalOs_matricula')?.value;
    const listEl = document.getElementById('modalOs_anexosList');
    if (!matricula || !listEl) return;

    garantirAnexosSmsCarregados(() => {
        const anexos = typeof anexosDoRegistro === 'function' ? anexosDoRegistro('ordens_servico', matricula) : [];
        if (anexos.length === 0) {
            listEl.innerHTML = '<span style="color:var(--text-light); font-style:italic;">Nenhum comprovante anexado ainda. Clique em "+ Enviar Foto / PDF" para anexar ao Google Drive.</span>';
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">';
        anexos.forEach(a => {
            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; background:var(--card, #fff); border:1px solid var(--border); border-radius:6px; padding:6px 10px;">
                    <a href="${escapeHTML(a.drive_view_link)}" target="_blank" rel="noopener" style="font-weight:600; color:#1d4ed8; text-decoration:none; display:flex; align-items:center; gap:6px; font-size:12px;" title="Abrir arquivo no Google Drive">
                        <span>📄</span> ${escapeHTML(a.nome_arquivo)}
                    </a>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <a href="${escapeHTML(a.drive_view_link)}" target="_blank" rel="noopener" class="db-clear-btn" style="padding:2px 8px; font-size:11px; text-decoration:none; color:#1d4ed8; border-color:#bfdbfe; background:#eff6ff;">Abrir no Drive</a>
                        <button type="button" class="db-clear-btn" style="padding:2px 6px; font-size:11px; color:var(--danger); border-color:var(--danger);" onclick="excluirAnexo('${escapeHTML(a.id)}')" title="Excluir do Drive">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        listEl.innerHTML = html;
    });
}

function imprimirOsDoModal() {
    const matricula = document.getElementById('modalOs_matricula').value;
    if (matricula) {
        imprimirOsIndividualEfetivo(matricula);
    }
}

async function salvarRegistroAssinaturaOs() {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('efetivo')) return;

    const matricula = document.getElementById('modalOs_matricula').value;
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    const status = document.getElementById('modalOs_status').value;
    const dataEntrega = document.getElementById('modalOs_dataEntrega').value || null;
    const versao = document.getElementById('modalOs_versao').value.trim() || 'Rev. 00';
    const entreguePor = document.getElementById('modalOs_entreguePor').value.trim();
    const obs = document.getElementById('modalOs_obs').value.trim();

    const btnSalvar = document.getElementById('btnSalvarAssinaturaOs');
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
    }

    try {
        const updatePayload = {
            id: matricula,
            os_status: status,
            os_data_entrega: status === 'entregue' ? dataEntrega : null,
            os_versao: versao,
            os_obs: obs || null
        };

        await supabaseUpsert('colaboradores_efetivo', [updatePayload]);

        // Registrar no histórico de entregas se for marcado como entregue
        if (status === 'entregue') {
            const histPayload = {
                matricula: colab.id,
                nome_colaborador: colab.nome,
                funcao: colab.funcao,
                setor: colab.setor,
                ghe: colab.ghe,
                data_emissao: new Date().toISOString().split('T')[0],
                data_assinatura: dataEntrega,
                status: 'entregue',
                versao_os: versao,
                entregue_por: entreguePor || (typeof CRONOGRAMA_DEFAULTS_SESSAO !== 'undefined' ? CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome : 'Engenharia de Segurança'),
                observacoes: obs || null
            };
            try {
                await supabaseUpsert('ordens_servico_entregas', [histPayload]);
            } catch (errHist) {
                console.warn('Aviso ao registrar histórico de OS:', errHist.message);
            }
        }

        // Atualizar objeto em memória
        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) {
            allEfetivo[idx] = { ...allEfetivo[idx], ...updatePayload };
        }

        fecharModalAssinaturaOs();
        await renderControleOrdensServico();
        if (document.getElementById('efetivoColabDetail')?.style.display === 'block') {
            mostrarDetalheColaborador(matricula);
        }
    } catch (err) {
        console.error('Erro ao salvar registro de assinatura de OS:', err);
        alert('❌ Falha ao salvar: ' + err.message);
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = '💾 Salvar Registro';
        }
    }
}

// Analisador especialista de inconsistências de OS
function diagnosticarInconsistenciasOs() {
    const inconsistencias = [];
    const todosCargosCatalogados = [];
    (allGheCatalogo || []).forEach(g => {
        if (Array.isArray(g.cargos)) {
            g.cargos.forEach(c => todosCargosCatalogados.push({ gheId: g.id, gheNome: g.nome, cargo: c.funcao, cargoObj: c }));
        }
    });

    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));

    ativos.forEach(colab => {
        const aval = avaliarCorrespondenciaCargoOs(colab.id, colab.funcao);
        if (aval.semCorrespondencia) {
            let sugestao = null;
            const fNorm = normalizarTextoCargo(colab.funcao);

            if (fNorm.includes('topografia') || fNorm.includes('leiturista')) {
                const g21 = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === '21');
                if (g21) {
                    const c = g21.cargos.find(x => normalizarTextoCargo(x.funcao).includes(fNorm) || fNorm.includes(normalizarTextoCargo(x.funcao)));
                    sugestao = {
                        tipo: 'mudar_ghe',
                        altaConfianca: true,
                        gheId: '21',
                        gheNome: g21.nome,
                        cargoNome: c ? c.funcao : colab.funcao,
                        explicacao: 'Função de campo pertencente ao GHE 21 (TOPOGRAFIA).'
                    };
                }
            } else if (fNorm.includes('operador') && fNorm.includes('maquina')) {
                const g11 = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === '11');
                if (g11) {
                    sugestao = {
                        tipo: 'mudar_ghe',
                        altaConfianca: true,
                        gheId: '11',
                        gheNome: g11.nome,
                        cargoNome: 'Operador de Máquinas',
                        explicacao: 'Operação de máquinas pesadas pertencente ao GHE 11 (OPERADOR DE MÁQUINAS).'
                    };
                }
            } else if (fNorm.includes('carreta')) {
                const g12 = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === '12');
                if (g12) {
                    sugestao = {
                        tipo: 'mudar_ghe',
                        altaConfianca: true,
                        gheId: '12',
                        gheNome: g12.nome,
                        cargoNome: 'Carreteiro (motorista de caminhão-carreta)',
                        explicacao: 'Condução de caminhão-carreta pertencente ao GHE 12 (MOTORISTA PESADO).'
                    };
                }
            } else if (fNorm.includes('combio') || fNorm.includes('comboio')) {
                const g15 = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === '15');
                if (g15) {
                    sugestao = {
                        tipo: 'mudar_ghe',
                        altaConfianca: true,
                        gheId: '15',
                        gheNome: g15.nome,
                        cargoNome: 'Motorista de caminhão',
                        explicacao: 'Motorista de caminhão comboio pertencente ao GHE 15 (COMBOIO).'
                    };
                }
            } else if (aval.ambiguo && aval.candidatos && aval.candidatos.length > 0) {
                sugestao = {
                    tipo: 'escolher_ambiguo',
                    altaConfianca: false,
                    candidatos: aval.candidatos.map(c => typeof c === 'string' ? c : c.funcao),
                    explicacao: 'A função genérica coincide com múltiplos cargos no grupo.'
                };
            } else if (fNorm.includes('servente') && aval.ghe && normalizarGhe(aval.ghe.id) === '05') {
                sugestao = {
                    tipo: 'mudar_ghe',
                    altaConfianca: true,
                    gheId: '07',
                    gheNome: 'GRUPO 07 - MANUTENÇÃO CIVIL',
                    cargoNome: 'Servente',
                    explicacao: 'O GHE 05 é exclusivo de elétrica. O cargo Servente está no GHE 07 (Civil).'
                };
            } else {
                const match = todosCargosCatalogados.find(tc => normalizarTextoCargo(tc.cargo) === fNorm || normalizarTextoCargo(tc.cargo).includes(fNorm));
                if (match) {
                    sugestao = {
                        tipo: 'mudar_ghe',
                        altaConfianca: true,
                        gheId: match.gheId,
                        gheNome: match.gheNome,
                        cargoNome: match.cargo,
                        explicacao: `Cargo idêntico localizado no GHE ${match.gheId}.`
                    };
                }
            }

            inconsistencias.push({
                colaborador: colab,
                gheAtual: aval.ghe,
                motivo: aval.motivo,
                ambiguo: aval.ambiguo,
                candidatos: aval.candidatos || [],
                sugestao
            });
        }
    });

    return inconsistencias;
}

// Abre o Modal de Auditoria e Correção de Correspondências
function abrirModalAuditoriaCorrespondenciaOs(matriculaFoco) {
    const modal = document.getElementById('modalAuditoriaCorrespondenciaOs');
    if (!modal) return;
    modal.style.display = 'flex';
    renderTabelaAuditoriaOs(matriculaFoco);
}

function fecharModalAuditoriaCorrespondenciaOs() {
    const modal = document.getElementById('modalAuditoriaCorrespondenciaOs');
    if (modal) modal.style.display = 'none';
}

function renderTabelaAuditoriaOs(matriculaFoco) {
    const container = document.getElementById('conteudoAuditoriaCorrespondenciaOs');
    if (!container) return;

    const inconsistencias = diagnosticarInconsistenciasOs();
    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    const totalCompativel = ativos.length - inconsistencias.length;
    const pctCompativel = ativos.length > 0 ? ((totalCompativel / ativos.length) * 100).toFixed(1) : 0;

    const altaConfiancaCount = inconsistencias.filter(i => i.sugestao && i.sugestao.altaConfianca).length;

    let html = `
        <div style="background: linear-gradient(135deg, rgba(37,99,235,0.05), rgba(245,158,11,0.08)); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <div style="font-weight: 700; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 8px;">
                    <span>📊</span> Status de Correspondência: <strong>${totalCompativel} de ${ativos.length} compatíveis (${pctCompativel}%)</strong>
                </div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 4px;">
                    ${inconsistencias.length > 0 
                        ? `Restam <strong>${inconsistencias.length} inconsistências</strong> que impedem a emissão automática completa da OS.` 
                        : '🎉 Parabéns! 100% dos colaboradores ativos possuem correspondência com os cargos do catálogo.'}
                </div>
            </div>
            ${altaConfiancaCount > 0 ? `
            <button class="db-apply-btn" onclick="aplicarTodasSugestoesAltaConfiancaOs()" style="background:#059669; color:#fff; font-weight:700; font-size:12px; padding:8px 14px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(5,150,105,0.25);">
                ⚡ Aplicar Todas as Sugestões Automáticas (${altaConfiancaCount})
            </button>` : ''}
        </div>
    `;

    if (inconsistencias.length === 0) {
        html += `
            <div style="padding: 40px 20px; text-align: center; color: var(--text-light); background: var(--bg); border-radius: 10px; border: 1px dashed var(--border);">
                <div style="font-size: 36px; margin-bottom: 10px;">✅</div>
                <div style="font-size: 15px; font-weight: 700; color: #059669;">Nenhuma inconsistência pendente!</div>
                <div style="font-size: 12px; margin-top: 6px;">Todas as funções cadastradas correspondem perfeitamente aos cargos e riscos dos GHEs. As Ordens de Serviço serão emitidas com 100% dos dados.</div>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    html += `
        <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--card);">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <thead>
                    <tr style="background: var(--bg); border-bottom: 2px solid var(--border); color: var(--text-light);">
                        <th style="padding: 10px 12px; font-weight: 700; width: 180px;">Colaborador</th>
                        <th style="padding: 10px 12px; font-weight: 700; width: 140px;">Função Cadastrada</th>
                        <th style="padding: 10px 12px; font-weight: 700; width: 130px;">GHE Atual</th>
                        <th style="padding: 10px 12px; font-weight: 700;">Diagnóstico & Sugestão SST</th>
                        <th style="padding: 10px 12px; font-weight: 700; width: 230px; text-align: center;">Ação de Correção</th>
                    </tr>
                </thead>
                <tbody>
    `;

    inconsistencias.forEach(item => {
        const c = item.colaborador;
        const ghe = item.gheAtual;
        const sug = item.sugestao;
        const ehFoco = matriculaFoco && String(c.id) === String(matriculaFoco);

        let acaoHtml = '';

        if (sug && sug.tipo === 'mudar_ghe') {
            acaoHtml = `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <button class="db-apply-btn" onclick="aplicarSugestaoGheIndividual('${escapeHTML(c.id)}', '${escapeHTML(sug.gheId)}', '${escapeHTML(sug.cargoNome)}')" style="background:#2563eb; color:#fff; font-size:11px; font-weight:700; padding:6px 10px; border-radius:6px; width:100%; text-align:center;">
                        ⚡ Mudar p/ GHE ${escapeHTML(sug.gheId)}
                    </button>
                    <button class="db-clear-btn" onclick="abrirAjusteManualLinha('${escapeHTML(c.id)}')" style="font-size:10px; padding:3px 6px; color:var(--text-light);">
                        ✏️ Escolher outro GHE...
                    </button>
                </div>
            `;
        } else if (sug && sug.tipo === 'escolher_ambiguo') {
            acaoHtml = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="font-size:10px; font-weight:700; color:var(--text-light);">Selecione o cargo correto:</div>
                    ${sug.candidatos.map(cand => `
                        <button class="db-clear-btn" onclick="aplicarSugestaoAmbiguaIndividual('${escapeHTML(c.id)}', '${escapeHTML(cand)}')" style="font-size:10.5px; padding:4px 8px; text-align:left; border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; font-weight:600;">
                            🎯 ${escapeHTML(cand)}
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            acaoHtml = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <button class="db-clear-btn" onclick="abrirAjusteManualLinha('${escapeHTML(c.id)}')" style="font-size:11px; padding:5px 8px; border-color:var(--primary); color:var(--primary); font-weight:600;">
                        ✏️ Associar Manualmente
                    </button>
                    ${ghe ? `
                    <button class="db-clear-btn" onclick="adicionarCargoAoGheCatalogo('${escapeHTML(ghe.id)}', '${escapeHTML(c.funcao)}')" style="font-size:10px; padding:3px 6px; border-color:#a7f3d0; color:#047857; background:#ecfdf5;">
                        ➕ Adicionar ao GHE ${escapeHTML(ghe.id)}
                    </button>` : ''}
                </div>
            `;
        }

        // Dropdown inline de ajuste manual (inicialmente oculto)
        const gheOptions = (allGheCatalogo || []).map(g => {
            const sel = (ghe && g.id === ghe.id) ? ' selected' : '';
            return `<option value="${escapeHTML(g.id)}"${sel}>GHE ${escapeHTML(g.id)} - ${escapeHTML(g.nome)}</option>`;
        }).join('');

        const manualInlineHtml = `
            <div id="painelManual_${escapeHTML(c.id)}" style="display:none; margin-top:8px; padding:8px; background:var(--bg); border:1px solid var(--border); border-radius:6px; font-size:11px;">
                <label style="font-weight:700; display:block; margin-bottom:2px;">Novo GHE:</label>
                <select id="selManualGhe_${escapeHTML(c.id)}" onchange="atualizarCargosManualGhe('${escapeHTML(c.id)}')" style="width:100%; padding:4px 6px; font-size:11px; border:1px solid var(--border); border-radius:4px; margin-bottom:6px;">
                    ${gheOptions}
                </select>
                <label style="font-weight:700; display:block; margin-bottom:2px;">Função / Cargo do Grupo:</label>
                <select id="selManualCargo_${escapeHTML(c.id)}" style="width:100%; padding:4px 6px; font-size:11px; border:1px solid var(--border); border-radius:4px; margin-bottom:6px;">
                    <!-- Preenchido via JS -->
                </select>
                <div style="display:flex; justify-content:flex-end; gap:4px;">
                    <button class="db-clear-btn" onclick="fecharAjusteManualLinha('${escapeHTML(c.id)}')" style="padding:2px 6px; font-size:10px;">Cancelar</button>
                    <button class="db-apply-btn" onclick="salvarAjusteManualCorrespondencia('${escapeHTML(c.id)}')" style="padding:2px 8px; font-size:10px; background:#2563eb; color:#fff;">💾 Salvar</button>
                </div>
            </div>
        `;

        html += `
            <tr id="linhaAuditoria_${escapeHTML(c.id)}" style="border-bottom: 1px solid var(--border); ${ehFoco ? 'background:#fefce8;' : ''}">
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 700; color: var(--text);">${escapeHTML(c.nome)}</div>
                    <div style="font-size: 11px; color: var(--text-light);">Matrícula: <strong>${escapeHTML(c.id)}</strong></div>
                </td>
                <td style="padding: 10px 12px;">
                    <span style="display:inline-block; padding:2px 6px; border-radius:4px; background:#f1f5f9; font-weight:700; color:#334155; border:1px solid #cbd5e1;">
                        ${escapeHTML(c.funcao || '—')}
                    </span>
                </td>
                <td style="padding: 10px 12px;">
                    <span style="font-weight:600; color:${ghe ? 'var(--text)' : 'var(--danger)'};">
                        ${ghe ? `GHE ${escapeHTML(ghe.id)}` : '❌ Sem GHE'}
                    </span>
                    ${ghe ? `<div style="font-size:10.5px; color:var(--text-light); line-height:1.2;">${escapeHTML(ghe.nome)}</div>` : ''}
                </td>
                <td style="padding: 10px 12px;">
                    ${sug ? `
                        <div style="display:flex; align-items:flex-start; gap:6px;">
                            <span style="font-size:14px;">💡</span>
                            <div>
                                <div style="font-weight:700; color:#1e293b;">${escapeHTML(sug.explicacao)}</div>
                                ${sug.cargoNome ? `<div style="font-size:11px; color:#2563eb; font-weight:600; margin-top:2px;">Cargo sugerido: "${escapeHTML(sug.cargoNome)}" (GHE ${escapeHTML(sug.gheId)})</div>` : ''}
                            </div>
                        </div>
                    ` : `
                        <div style="color:var(--text-light); font-size:11.5px;">Função não encontrada no GHE atual nem em outros grupos. É necessário vincular a um GHE correspondente ou adicionar o cargo.</div>
                    `}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${acaoHtml}
                    ${manualInlineHtml}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    if (matriculaFoco) {
        setTimeout(() => {
            const linha = document.getElementById('linhaAuditoria_' + matriculaFoco);
            if (linha) {
                linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
}

function abrirAjusteManualLinha(matricula) {
    const painel = document.getElementById('painelManual_' + matricula);
    if (!painel) return;
    painel.style.display = 'block';
    atualizarCargosManualGhe(matricula);
}

function fecharAjusteManualLinha(matricula) {
    const painel = document.getElementById('painelManual_' + matricula);
    if (painel) painel.style.display = 'none';
}

function atualizarCargosManualGhe(matricula) {
    const selGhe = document.getElementById('selManualGhe_' + matricula);
    const selCargo = document.getElementById('selManualCargo_' + matricula);
    if (!selGhe || !selCargo) return;

    const gheId = selGhe.value;
    const ghe = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === normalizarGhe(gheId));
    if (!ghe || !Array.isArray(ghe.cargos) || ghe.cargos.length === 0) {
        selCargo.innerHTML = '<option value="">(Sem cargos cadastrados neste GHE)</option>';
        return;
    }

    selCargo.innerHTML = ghe.cargos.map(c => `<option value="${escapeHTML(c.funcao)}">${escapeHTML(c.funcao)}</option>`).join('');
}

// Aplica alteração individual no Supabase e memória
async function aplicarSugestaoGheIndividual(matricula, novoGhe, novoCargo) {
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    try {
        const updateData = {
            id: matricula,
            ghe: novoGhe
        };
        if (novoCargo) {
            updateData.funcao = novoCargo;
        }

        await supabaseUpsert('colaboradores_efetivo', [updateData]);

        // Atualiza memória
        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) {
            allEfetivo[idx] = { ...allEfetivo[idx], ...updateData };
        }

        if (typeof showToast === 'function') {
            showToast(`✅ Colaborador ${colab.nome} atualizado para o GHE ${novoGhe}!`, 'success');
        } else {
            alert(`✅ Colaborador ${colab.nome} atualizado para o GHE ${novoGhe}!`);
        }

        renderTabelaAuditoriaOs();
        await renderControleOrdensServico();
    } catch (err) {
        console.error('Erro ao atualizar GHE do colaborador:', err);
        alert('❌ Erro ao atualizar: ' + err.message);
    }
}

async function aplicarSugestaoAmbiguaIndividual(matricula, cargoEscolhido) {
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    try {
        const updateData = {
            id: matricula,
            funcao: cargoEscolhido
        };

        await supabaseUpsert('colaboradores_efetivo', [updateData]);

        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) {
            allEfetivo[idx] = { ...allEfetivo[idx], ...updateData };
        }

        if (typeof showToast === 'function') {
            showToast(`✅ Função ajustada para "${cargoEscolhido}" com sucesso!`, 'success');
        } else {
            alert(`✅ Função ajustada para "${cargoEscolhido}" com sucesso!`);
        }

        renderTabelaAuditoriaOs();
        await renderControleOrdensServico();
    } catch (err) {
        console.error('Erro ao ajustar função ambígua:', err);
        alert('❌ Erro ao atualizar: ' + err.message);
    }
}

async function salvarAjusteManualCorrespondencia(matricula) {
    const selGhe = document.getElementById('selManualGhe_' + matricula);
    const selCargo = document.getElementById('selManualCargo_' + matricula);
    if (!selGhe || !selCargo) return;

    const novoGhe = selGhe.value;
    const novoCargo = selCargo.value;
    if (!novoGhe) {
        alert('Selecione um GHE.');
        return;
    }

    await aplicarSugestaoGheIndividual(matricula, novoGhe, novoCargo);
}

// Aplica em lote todas as sugestões de alta confiança
async function aplicarTodasSugestoesAltaConfiancaOs() {
    const inconsistencias = diagnosticarInconsistenciasOs();
    const altaConfianca = inconsistencias.filter(i => i.sugestao && i.sugestao.altaConfianca);

    if (altaConfianca.length === 0) {
        alert('Não há sugestões automáticas de alta confiança pendentes.');
        return;
    }

    const conf = confirm(`Deseja aplicar a correção automática de GHE para ${altaConfianca.length} colaboradores?\n\nIsso atualizará os cadastros no banco de dados e resolverá as pendências de correspondência.`);
    if (!conf) return;

    const updates = altaConfianca.map(item => ({
        id: item.colaborador.id,
        ghe: item.sugestao.gheId,
        ...(item.sugestao.cargoNome ? { funcao: item.sugestao.cargoNome } : {})
    }));

    try {
        await supabaseUpsert('colaboradores_efetivo', updates);

        updates.forEach(u => {
            const idx = allEfetivo.findIndex(e => e.id === u.id);
            if (idx >= 0) {
                allEfetivo[idx] = { ...allEfetivo[idx], ...u };
            }
        });

        alert(`✅ ${updates.length} colaboradores atualizados com sucesso!`);
        renderTabelaAuditoriaOs();
        await renderControleOrdensServico();
    } catch (err) {
        console.error('Erro ao aplicar correções em lote:', err);
        alert('❌ Erro ao salvar: ' + err.message);
    }
}

// Adiciona um cargo novo ao catálogo do GHE existente caso a equipe realmente tenha essa função
async function adicionarCargoAoGheCatalogo(gheId, funcaoNome) {
    const ghe = (allGheCatalogo || []).find(g => normalizarGhe(g.id) === normalizarGhe(gheId));
    if (!ghe) {
        alert('GHE não encontrado.');
        return;
    }

    const conf = confirm(`Deseja adicionar o cargo "${funcaoNome}" ao catálogo do GHE ${ghe.id} (${ghe.nome})?\n\nOs riscos gerais do grupo serão herdados automaticamente.`);
    if (!conf) return;

    const novoCargoObj = {
        cargo: funcaoNome,
        funcao: funcaoNome,
        cbo: '',
        quantidade: 1,
        descricao_atividade: `Atividades operacionais e de apoio pertinentes à função de ${funcaoNome} no setor de ${ghe.nome}.`,
        agentes: {
            fisico: 'Radiações não ionizantes (solar); Ruído habitual',
            quimico: 'Particulados',
            biologico: 'Não evidenciado',
            ergonomico: 'Postura de trabalho habitual, levantamento eventual de cargas',
            acidentes: 'Queda em mesmo nível, intempéries'
        },
        epis_necessarios: ['Capacete de Segurança', 'Calçado de Segurança', 'Óculos de Proteção', 'Luva de Proteção Mecânica'],
        epcs_necessarios: ['Sinalização de Segurança'],
        recomendacoes: 'Cumprir as normas regulamentadoras e usar EPIs adequados.',
        procedimentos_acidentes: 'Comunicar imediatamente a liderança imediata e acionar o SESMT.'
    };

    const cargosAtuais = Array.isArray(ghe.cargos) ? [...ghe.cargos] : [];
    cargosAtuais.push(novoCargoObj);

    try {
        await supabaseUpsert('ghe_catalogo', [{
            id: ghe.id,
            cargos: cargosAtuais,
            updated_at: new Date().toISOString()
        }]);

        ghe.cargos = cargosAtuais;

        alert(`✅ Cargo "${funcaoNome}" adicionado com sucesso ao GHE ${ghe.id}!`);
        renderTabelaAuditoriaOs();
        await renderControleOrdensServico();
    } catch (err) {
        console.error('Erro ao adicionar cargo ao GHE:', err);
        alert('❌ Erro ao salvar no catálogo do GHE: ' + err.message);
    }
}


// Alternância rápida (1 clique) de status de OS para dar baixa ágil em campo
async function alternarStatusRapidoOs(matricula) {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('efetivo')) return;

    const colab = (allEfetivo || []).find(e => e.id === matricula);
    if (!colab) return;

    const ehEntregue = colab.os_status === 'entregue';
    const novoStatus = ehEntregue ? 'pendente' : 'entregue';
    const hoje = new Date().toISOString().split('T')[0];
    const novaData = ehEntregue ? null : (colab.dt_admissao || hoje);

    if (ehEntregue) {
        const conf = confirm(`Deseja realmente reverter a Ordem de Serviço de "${colab.nome}" para PENDENTE?`);
        if (!conf) return;
    }

    try {
        const updatePayload = {
            id: matricula,
            os_status: novoStatus,
            os_data_entrega: novaData,
            os_versao: colab.os_versao || 'Rev. 00'
        };

        await supabaseUpsert('colaboradores_efetivo', [updatePayload]);

        if (novoStatus === 'entregue') {
            const histPayload = {
                matricula: colab.id,
                nome_colaborador: colab.nome,
                funcao: colab.funcao,
                setor: colab.setor,
                ghe: colab.ghe,
                data_emissao: hoje,
                data_assinatura: novaData,
                status: 'entregue',
                versao_os: colab.os_versao || 'Rev. 00',
                entregue_por: (typeof CRONOGRAMA_DEFAULTS_SESSAO !== 'undefined' ? CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome : 'Engenharia de Segurança'),
                observacoes: 'Baixa rápida registrada pelo painel de controle de OS.'
            };
            try {
                await supabaseUpsert('ordens_servico_entregas', [histPayload]);
            } catch (eH) {}
        }

        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) {
            allEfetivo[idx] = { ...allEfetivo[idx], ...updatePayload };
        }

        renderControleOrdensServico();
        if (document.getElementById('efetivoColabDetail')?.style.display === 'block') {
            mostrarDetalheColaborador(matricula);
        }
    } catch (err) {
        console.error('Erro ao alternar status da OS:', err);
        alert('❌ Falha ao atualizar: ' + err.message);
    }
}

// Exportação em Excel (.xlsx) da Rastreabilidade de Ordens de Serviço
function gerarExcelRastreabilidadeOs() {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca SheetJS (XLSX) não encontrada.');
        return;
    }

    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    if (ativos.length === 0) {
        alert('Nenhum colaborador ativo encontrado.');
        return;
    }

    const dados = ativos.map(e => {
        const ehEntregue = e.os_status === 'entregue';
        const aval = typeof avaliarCorrespondenciaCargoOs === 'function' ? avaliarCorrespondenciaCargoOs(e.id, e.funcao) : { cargoInfo: null };
        const anexosOs = typeof anexosDoRegistro === 'function' ? anexosDoRegistro('ordens_servico', e.id) : [];
        const cboStr = aval.cargoInfo?.cbo || e.cbo || 'Não identificado';
        const linkDrive = anexosOs.length > 0 ? (anexosOs[0].drive_view_link || '') : (e.os_anexo_url || '');

        return {
            'Matrícula': e.id,
            'Nome do Colaborador': e.nome || '',
            'CPF': e.cpf || '',
            'Função Contratual': e.funcao || '',
            'Cargo Reconhecido (GHE)': aval.cargoInfo?.cargo || e.funcao || '',
            'CBO Oficial': cboStr,
            'Correspondência GHE': aval.semCorrespondencia ? 'INCONSISTENTE' : 'REGULAR',
            'Setor': e.setor || '',
            'GHE': e.ghe || '',
            'Data de Admissão': e.dt_admissao ? formatSimpleDate(e.dt_admissao) : '',
            'Status Ordem de Serviço': ehEntregue ? 'ASSINADA / ENTREGUE' : 'PENDENTE DE ASSINATURA',
            'Data da Entrega / Assinatura': e.os_data_entrega ? formatSimpleDate(e.os_data_entrega) : '',
            'Comprovante no Google Drive': anexosOs.length > 0 ? `SIM (${anexosOs.length} anexo(s))` : (e.os_anexo_url ? 'SIM' : 'NÃO'),
            'Link do Comprovante no Drive': linkDrive,
            'Versão da OS': e.os_versao || 'Rev. 00',
            'Observações': e.os_obs || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rastreabilidade OS (NR-01)');

    const hoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Rastreabilidade_Ordens_de_Servico_NR01_COP_Ramal_${hoje}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
}


function popularRelatorioMensalDefaults() {
    const hoje = new Date();
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesEl = document.getElementById('relatorioMensalMes');
    const anoEl = document.getElementById('relatorioMensalAno');
    // mesEl é <select> - já nasce com value="0" (primeira <option>), nunca fica vazio,
    // por isso usa dataset.inicializado (mesmo padrão de anoSel/mesSel em
    // renderCronogramaLista/renderDdsPanel/etc) em vez de checar '' como o anoEl (input
    // number, esse sim nasce vazio de verdade).
    if (mesEl && !mesEl.dataset.inicializado) { mesEl.value = String(mesAnterior.getMonth()); mesEl.dataset.inicializado = '1'; }
    if (anoEl && !anoEl.value) anoEl.value = mesAnterior.getFullYear();

    // Select de agrupamento do DDS - mesmo padrão do mesEl (select nunca fica vazio de
    // verdade). Padrão "Diário" (era o único comportamento antes desta extensão) na
    // primeira abertura da aba. Não é salvo no banco: é só preferência de tela, e
    // relatorio_mensal_config.valor é numérico, não daria pra guardar 'diario'/'semanal'
    // ali sem mudar o tipo da coluna à toa.
    const ddsAgrupEl = document.getElementById('relatorioMensalDdsAgrupamento');
    if (ddsAgrupEl && !ddsAgrupEl.dataset.inicializado) { ddsAgrupEl.value = 'diario'; ddsAgrupEl.dataset.inicializado = '1'; }

    const cfg = new Map(allRelatorioMensalConfig.map(c => [c.id, c.valor]));
    const integEl = document.getElementById('relatorioMensalTurmaIntegracao');
    const segEl = document.getElementById('relatorioMensalTurmaSeguranca');
    const ddsEl = document.getElementById('relatorioMensalTurmaDdsms');
    const adicEl = document.getElementById('relatorioMensalTurmaAdicionais');
    if (integEl && !integEl.value) integEl.value = cfg.get('turmas_integracao') ?? 1;
    if (segEl && !segEl.value) segEl.value = cfg.get('turmas_seguranca') ?? '';
    if (ddsEl && !ddsEl.value) ddsEl.value = cfg.get('turmas_ddsms') ?? (allDdsFrentesConfig.length || '');
    if (adicEl && !adicEl.value) adicEl.value = cfg.get('turmas_adicionais') ?? '';
}
