// ==============================================================================
// MODULO: ERGONOMIA (NR-17), PERICULOSIDADE (NR-16), PLANO DE ACAO PGR E ALERTAS
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// MÓDULO DE ERGONOMIA (NR-17) - AEP E PLANO DE AÇÃO
// ============================================

var allErgonomiaAep = [];
var allErgonomiaPlanoAcao = [];
var ergonomiaLoaded = false;

async function loadErgonomiaData() {
    try {
        allErgonomiaAep = await supabaseFetch('ergonomia_aep', '?select=*&order=data_avaliacao.desc');
        allErgonomiaPlanoAcao = await supabaseFetch('ergonomia_plano_acao', '?select=*&order=prazo.asc');
        popularFiltroSetorErgonomia();
        renderErgonomiaKpis();
        renderErgonomiaVisao();
        renderErgonomiaPlano();
    } catch (err) {
        console.error('Erro ao carregar dados de Ergonomia:', err);
    }
}

function showErgonomiaSubtab(tab) {
    ['visao', 'plano'].forEach(t => {
        const content = document.getElementById('ergonomiaSubtab-' + t);
        const btn = document.getElementById('ergonomiaSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderErgonomiaVisao();
    if (tab === 'plano') renderErgonomiaPlano();
}

function renderErgonomiaKpis() {
    const totalAep = allErgonomiaAep.length;
    const riscoBaixo = allErgonomiaAep.filter(a => a.nivel_risco_global === 'baixo').length;
    const riscoMedio = allErgonomiaAep.filter(a => a.nivel_risco_global === 'medio').length;
    const riscoAlto = allErgonomiaAep.filter(a => a.nivel_risco_global === 'alto').length;
    const aetNec = allErgonomiaAep.filter(a => !!a.necessidade_aet).length;

    const totalAcoes = allErgonomiaPlanoAcao.length;
    const concluidas = allErgonomiaPlanoAcao.filter(p => p.status === 'concluido').length;
    const pct = totalAcoes > 0 ? Math.round((concluidas / totalAcoes) * 100) : 0;

    const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKpi('kpiErgonomiaTotalAep', totalAep);
    setKpi('kpiErgonomiaRiscoBaixo', riscoBaixo);
    setKpi('kpiErgonomiaRiscoMedio', riscoMedio);
    setKpi('kpiErgonomiaRiscoAlto', riscoAlto);
    setKpi('kpiErgonomiaAetNecessaria', aetNec);
    setKpi('kpiErgonomiaAcoesStatus', `${concluidas}/${totalAcoes} (${pct}%)`);
}

function popularFiltroSetorErgonomia() {
    const select = document.getElementById('ergonomiaFiltroSetor');
    if (!select) return;
    const setorAtual = select.value;
    const setores = Array.from(new Set(allErgonomiaAep.map(a => a.setor).filter(Boolean))).sort();
    select.innerHTML = '<option value="">Todos os Setores</option>' +
        setores.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
    if (setorAtual && setores.includes(setorAtual)) select.value = setorAtual;
}

function renderErgonomiaVisao() {
    renderErgonomiaKpis();
    filtrarErgonomiaAepLista();
}

function filtrarErgonomiaAepLista() {
    const container = document.getElementById('ergonomiaAepListaContainer');
    if (!container) return;

    const termo = (document.getElementById('ergonomiaAepSearchInput')?.value || '').trim().toLowerCase();
    const risco = document.getElementById('ergonomiaFiltroRisco')?.value || '';
    const setor = document.getElementById('ergonomiaFiltroSetor')?.value || '';
    const apenasAet = !!document.getElementById('ergonomiaChkFiltroAet')?.checked;

    const filtradas = allErgonomiaAep.filter(a => {
        if (risco && a.nivel_risco_global !== risco) return false;
        if (setor && a.setor !== setor) return false;
        if (apenasAet && !a.necessidade_aet) return false;
        if (termo) {
            const busca = `${a.codigo || ''} ${a.setor || ''} ${a.posto_trabalho || ''} ${a.funcao_avaliada || ''} ${a.ghe || ''}`.toLowerCase();
            if (!busca.includes(termo)) return false;
        }
        return true;
    });

    if (filtradas.length === 0) {
        container.innerHTML = `<div class="db-list-empty" style="padding: 30px; text-align: center; color: var(--text-light);">
            Nenhuma Avaliação Ergonômica Preliminar (AEP) encontrada com os filtros selecionados.
        </div>`;
        return;
    }

    const badgeRisco = (r) => {
        if (r === 'alto') return `<span style="background: rgba(220,38,38,0.12); color: #dc2626; border: 1px solid rgba(220,38,38,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🔴 ALTO</span>`;
        if (r === 'medio') return `<span style="background: rgba(217,119,6,0.12); color: #d97706; border: 1px solid rgba(217,119,6,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🟡 MÉDIO</span>`;
        return `<span style="background: rgba(22,163,74,0.12); color: #16a34a; border: 1px solid rgba(22,163,74,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🟢 BAIXO</span>`;
    };

    const chipsFatores = (a) => {
        const chips = [];
        if (a.fator_levantamento_carga === 'alto' || a.fator_levantamento_carga === 'medio') {
            chips.push(`<span title="${escapeHTML(a.obs_levantamento_carga || 'Sobrecarga de cargas')}" style="background: rgba(239,68,68,0.1); color: #b91c1c; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight:600;">📦 Cargas</span>`);
        }
        if (a.fator_posturas_repetitividade === 'alto' || a.fator_posturas_repetitividade === 'medio') {
            chips.push(`<span title="${escapeHTML(a.obs_posturas_repetitividade || 'Posturas inadequadas/repetitivas')}" style="background: rgba(245,158,11,0.1); color: #b45309; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight:600;">🧘 Postura</span>`);
        }
        if (a.fator_mobiliario_equipamentos === 'alto' || a.fator_mobiliario_equipamentos === 'medio') {
            chips.push(`<span title="${escapeHTML(a.obs_mobiliario_equipamentos || 'Mobiliário/ferramentas')}" style="background: rgba(59,130,246,0.1); color: #1d4ed8; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight:600;">🪑 Mobiliário</span>`);
        }
        if (a.fator_condicoes_ambientais === 'alto' || a.fator_condicoes_ambientais === 'medio') {
            chips.push(`<span title="${escapeHTML(a.obs_condicoes_ambientais || 'Condições ambientais')}" style="background: rgba(16,185,129,0.1); color: #047857; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight:600;">🌡️ Ambiente</span>`);
        }
        if (a.fator_organizacao_trabalho === 'alto' || a.fator_organizacao_trabalho === 'medio') {
            chips.push(`<span title="${escapeHTML(a.obs_organizacao_trabalho || 'Organização/pausas')}" style="background: rgba(139,92,246,0.1); color: #6d28d9; font-size: 10.5px; padding: 2px 6px; border-radius: 4px; font-weight:600;">⏱️ Organização</span>`);
        }
        return chips.length > 0 ? chips.join(' ') : '<span style="color:var(--text-light); font-size:11px;">Sob controle</span>';
    };

    const linhasHtml = filtradas.map((a, idx) => {
        const acoesDaAep = allErgonomiaPlanoAcao.filter(p => p.aep_id === a.id);
        const acoesBadge = acoesDaAep.length > 0
            ? `<span onclick="filtrarPlanoPorAep('${escapeHTML(a.id)}')" style="cursor: pointer; text-decoration: underline; color: #2563eb; font-weight: 600;">${acoesDaAep.length} ação(ões)</span>`
            : '<span style="color:var(--text-light);">0</span>';

        const aetBadge = a.necessidade_aet
            ? '<span style="background: rgba(124,58,237,0.12); color: #7c3aed; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">⚠️ SIM</span>'
            : '<span style="color:var(--text-light); font-size:11px;">Não</span>';

        return `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px 6px; text-align: center; color: var(--text-light); font-size: 11px;">${idx + 1}</td>
            <td style="padding: 8px 6px; font-weight: 700; color: var(--primary); font-size: 12px; white-space: nowrap;">${escapeHTML(a.codigo || '—')}</td>
            <td style="padding: 8px 6px; text-align: center; font-size: 11.5px; white-space: nowrap;">${formatSimpleDate(a.data_avaliacao)}</td>
            <td style="padding: 8px 6px; font-size: 12px;"><b>${escapeHTML(a.setor)}</b></td>
            <td style="padding: 8px 6px; font-size: 12px;">
                <div style="font-weight: 600;">${escapeHTML(a.posto_trabalho)}</div>
                <div style="font-size: 11px; color: var(--text-light);">${escapeHTML(a.funcao_avaliada)}${a.ghe ? ' · ' + escapeHTML(a.ghe) : ''} (${a.num_trabalhadores || 1} trab.)</div>
            </td>
            <td style="padding: 8px 6px; text-align: center;">${badgeRisco(a.nivel_risco_global)}</td>
            <td style="padding: 8px 6px;">${chipsFatores(a)}</td>
            <td style="padding: 8px 6px; text-align: center;">${aetBadge}</td>
            <td style="padding: 8px 6px; text-align: center; font-size: 12px;">${acoesBadge}</td>
            <td style="padding: 8px 6px; text-align: right; white-space: nowrap;">
                <button onclick="imprimirLaudoAep('${escapeHTML(a.id)}')" title="Imprimir Laudo Técnico da AEP (NR-17)"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 7px; cursor: pointer; font-size: 12px; margin-right: 3px;">🖨️</button>
                <button onclick="abrirModalNovaAcaoErgonomia('${escapeHTML(a.id)}')" title="Adicionar Ação de Melhoria p/ esta AEP"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 7px; cursor: pointer; font-size: 12px; margin-right: 3px; color: #0284c7;">+🎯</button>
                <button onclick="editarAep('${escapeHTML(a.id)}')" title="Editar AEP"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 7px; cursor: pointer; font-size: 12px; margin-right: 3px;">✏️</button>
                <button onclick="excluirAep('${escapeHTML(a.id)}')" title="Excluir AEP"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 7px; cursor: pointer; font-size: 12px; color: var(--danger);">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
            <tr style="background: var(--bg); text-align: left; border-bottom: 2px solid var(--border);">
                <th style="padding: 8px 6px; width: 25px; text-align: center;">#</th>
                <th style="padding: 8px 6px; width: 95px;">Código</th>
                <th style="padding: 8px 6px; width: 75px; text-align: center;">Data</th>
                <th style="padding: 8px 6px; width: 140px;">Setor</th>
                <th style="padding: 8px 6px;">Posto de Trabalho / Função</th>
                <th style="padding: 8px 6px; width: 90px; text-align: center;">Risco Global</th>
                <th style="padding: 8px 6px; width: 150px;">Fatores NR-17</th>
                <th style="padding: 8px 6px; width: 65px; text-align: center;">AET?</th>
                <th style="padding: 8px 6px; width: 75px; text-align: center;">Plano</th>
                <th style="padding: 8px 6px; width: 130px; text-align: right;">Ações</th>
            </tr>
        </thead>
        <tbody>${linhasHtml}</tbody>
    </table>`;
}

function limparFiltrosErgonomiaAep() {
    const busca = document.getElementById('ergonomiaAepSearchInput');
    const risco = document.getElementById('ergonomiaFiltroRisco');
    const setor = document.getElementById('ergonomiaFiltroSetor');
    const chkAet = document.getElementById('ergonomiaChkFiltroAet');
    if (busca) busca.value = '';
    if (risco) risco.value = '';
    if (setor) setor.value = '';
    if (chkAet) chkAet.checked = false;
    filtrarErgonomiaAepLista();
}

function filtrarPlanoPorAep(aepId) {
    showErgonomiaSubtab('plano');
    const aep = allErgonomiaAep.find(a => a.id === aepId);
    const input = document.getElementById('ergonomiaPlanoSearchInput');
    if (input && aep) {
        input.value = aep.posto_trabalho || aep.codigo || '';
        filtrarErgonomiaPlanoLista();
    }
}

function renderErgonomiaPlano() {
    renderErgonomiaKpis();
    filtrarErgonomiaPlanoLista();
}

function filtrarErgonomiaPlanoLista() {
    const container = document.getElementById('ergonomiaPlanoListaContainer');
    if (!container) return;

    const termo = (document.getElementById('ergonomiaPlanoSearchInput')?.value || '').trim().toLowerCase();
    const statusFiltro = document.getElementById('ergonomiaFiltroPlanoStatus')?.value || '';
    const tipoFiltro = document.getElementById('ergonomiaFiltroPlanoTipo')?.value || '';

    const hoje = toISODateLocal(new Date());

    const filtradas = allErgonomiaPlanoAcao.filter(p => {
        if (tipoFiltro && p.tipo_medida !== tipoFiltro) return false;
        if (statusFiltro === 'atrasado') {
            if (p.status === 'concluido' || p.status === 'cancelado' || !p.prazo || p.prazo >= hoje) return false;
        } else if (statusFiltro && p.status !== statusFiltro) {
            return false;
        }
        if (termo) {
            const busca = `${p.posto_trabalho || ''} ${p.fator_ergonomico || ''} ${p.acao_proposta || ''} ${p.responsavel || ''} ${p.evidencia_conclusao || ''}`.toLowerCase();
            if (!busca.includes(termo)) return false;
        }
        return true;
    });

    if (filtradas.length === 0) {
        container.innerHTML = `<div class="db-list-empty" style="padding: 30px; text-align: center; color: var(--text-light);">
            Nenhuma ação de melhoria ergonômica encontrada com os filtros atuais.
        </div>`;
        return;
    }

    const tipoBadge = (t) => {
        const mapa = {
            engenharia: { label: 'Engenharia', cor: '#0369a1', bg: 'rgba(3,105,161,0.1)' },
            equipamento: { label: 'Equipamento', cor: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
            organizacional: { label: 'Organizacional', cor: '#d97706', bg: 'rgba(217,119,6,0.1)' },
            administrativa: { label: 'Administrativa', cor: '#475569', bg: 'rgba(71,85,105,0.1)' }
        };
        const m = mapa[t] || { label: t || 'Geral', cor: '#555', bg: '#eee' };
        return `<span style="background: ${m.bg}; color: ${m.cor}; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 10.5px;">${m.label}</span>`;
    };

    const statusBadge = (p) => {
        if (p.status === 'concluido') {
            return `<span style="background: rgba(22,163,74,0.12); color: #16a34a; border: 1px solid rgba(22,163,74,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">✅ Concluído</span>`;
        }
        if (p.status === 'cancelado') {
            return `<span style="background: rgba(100,116,139,0.12); color: #64748b; padding: 3px 8px; border-radius: 12px; font-weight: 600; font-size: 11px;">🚫 Cancelado</span>`;
        }
        if (p.prazo && p.prazo < hoje) {
            return `<span style="background: rgba(220,38,38,0.12); color: #dc2626; border: 1px solid rgba(220,38,38,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">⚠️ Atrasado</span>`;
        }
        if (p.status === 'em_andamento') {
            return `<span style="background: rgba(2,132,199,0.12); color: #0284c7; border: 1px solid rgba(2,132,199,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">⚙️ Em Andamento</span>`;
        }
        return `<span style="background: rgba(217,119,6,0.12); color: #d97706; border: 1px solid rgba(217,119,6,0.3); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">⏳ Pendente</span>`;
    };

    const prazoHtml = (p) => {
        if (!p.prazo) return '—';
        const str = formatSimpleDate(p.prazo);
        if (p.status === 'concluido') {
            return `<span style="color: var(--success); font-weight:600;">${str}<br><span style="font-size:10px; color:var(--text-light);">Concluído: ${p.data_conclusao ? formatSimpleDate(p.data_conclusao) : 'Sim'}</span></span>`;
        }
        if (p.prazo < hoje) {
            const diasAtraso = Math.round((parseLocalDate(hoje) - parseLocalDate(p.prazo)) / 86400000);
            return `<span style="color: #dc2626; font-weight: 700;">${str}<br><span style="font-size:10px;">Vencido há ${diasAtraso}d</span></span>`;
        }
        const diasRestantes = Math.round((parseLocalDate(p.prazo) - parseLocalDate(hoje)) / 86400000);
        if (diasRestantes <= 7) {
            return `<span style="color: #d97706; font-weight: 700;">${str}<br><span style="font-size:10px;">Em ${diasRestantes}d</span></span>`;
        }
        return `<span style="color: var(--text-primary);">${str}</span>`;
    };

    const linhasHtml = filtradas.map((p, idx) => {
        const custoStr = p.custo_estimado > 0 ? `R$ ${parseFloat(p.custo_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '<span style="color:var(--text-light);">—</span>';
        const btnConcluir = (p.status !== 'concluido' && p.status !== 'cancelado')
            ? `<button onclick="abrirModalConcluirAcaoErgonomia('${escapeHTML(p.id)}')" title="Concluir Ação / Registrar Evidência"
                       style="background: rgba(22,163,74,0.1); border: 1px solid #16a34a; color: #16a34a; border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 11px; font-weight: 700; margin-right: 3px;">✔️ Baixa</button>`
            : '';

        return `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px 6px; text-align: center; color: var(--text-light); font-size: 11px;">${idx + 1}</td>
            <td style="padding: 8px 6px; font-size: 12px;">
                <div style="font-weight: 700;">${escapeHTML(p.posto_trabalho)}</div>
                <div style="font-size: 11px; color: var(--text-light);">${escapeHTML(p.fator_ergonomico)}</div>
            </td>
            <td style="padding: 8px 6px; font-size: 12px;">
                <div><b>${escapeHTML(p.acao_proposta)}</b></div>
                ${p.evidencia_conclusao ? `<div style="font-size: 11px; color: #15803d; margin-top: 2px;">📌 <i>${escapeHTML(p.evidencia_conclusao)}</i></div>` : ''}
            </td>
            <td style="padding: 8px 6px; text-align: center;">${tipoBadge(p.tipo_medida)}</td>
            <td style="padding: 8px 6px; font-size: 11.5px;">${escapeHTML(p.responsavel)}</td>
            <td style="padding: 8px 6px; text-align: center; font-size: 11.5px;">${prazoHtml(p)}</td>
            <td style="padding: 8px 6px; text-align: right; font-size: 11.5px;">${custoStr}</td>
            <td style="padding: 8px 6px; text-align: center;">${statusBadge(p)}</td>
            <td style="padding: 8px 6px; text-align: right; white-space: nowrap;">
                ${btnConcluir}
                <button onclick="editarAcaoErgonomia('${escapeHTML(p.id)}')" title="Editar Ação"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 6px; cursor: pointer; font-size: 11.5px; margin-right: 2px;">✏️</button>
                <button onclick="excluirAcaoErgonomia('${escapeHTML(p.id)}')" title="Excluir Ação"
                        style="background: transparent; border: 1px solid var(--border); border-radius: 4px; padding: 4px 6px; cursor: pointer; font-size: 11.5px; color: var(--danger);">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
            <tr style="background: var(--bg); text-align: left; border-bottom: 2px solid var(--border);">
                <th style="padding: 8px 6px; width: 25px; text-align: center;">#</th>
                <th style="padding: 8px 6px; width: 170px;">Posto / Fator</th>
                <th style="padding: 8px 6px;">Ação de Melhoria (O que fazer)</th>
                <th style="padding: 8px 6px; width: 105px; text-align: center;">Tipo</th>
                <th style="padding: 8px 6px; width: 130px;">Responsável</th>
                <th style="padding: 8px 6px; width: 100px; text-align: center;">Prazo</th>
                <th style="padding: 8px 6px; width: 85px; text-align: right;">Custo Est.</th>
                <th style="padding: 8px 6px; width: 110px; text-align: center;">Status</th>
                <th style="padding: 8px 6px; width: 120px; text-align: right;">Operações</th>
            </tr>
        </thead>
        <tbody>${linhasHtml}</tbody>
    </table>`;
}

function limparFiltrosErgonomiaPlano() {
    const busca = document.getElementById('ergonomiaPlanoSearchInput');
    const status = document.getElementById('ergonomiaFiltroPlanoStatus');
    const tipo = document.getElementById('ergonomiaFiltroPlanoTipo');
    if (busca) busca.value = '';
    if (status) status.value = '';
    if (tipo) tipo.value = '';
    filtrarErgonomiaPlanoLista();
}

// ---- Modais e CRUD de AEP ----

function abrirModalNovaAep() {
    const modal = document.getElementById('modalErgonomiaAep');
    if (!modal) return;

    document.getElementById('modalErgonomiaAepTitulo').textContent = '📋 Nova Avaliação Ergonômica Preliminar (AEP - NR-17)';
    document.getElementById('aepForm_id').value = '';
    
    // Sugestão de código sequencial
    const anoAtual = new Date().getFullYear();
    const countAno = allErgonomiaAep.filter(a => (a.codigo || '').includes(String(anoAtual))).length + 1;
    document.getElementById('aepForm_codigo').value = `AEP-${anoAtual}-${String(countAno).padStart(3, '0')}`;
    document.getElementById('aepForm_data').value = toISODateLocal(new Date());
    document.getElementById('aepForm_setor').value = '';
    document.getElementById('aepForm_posto').value = '';
    document.getElementById('aepForm_funcao').value = '';
    document.getElementById('aepForm_ghe').value = '';
    document.getElementById('aepForm_numTrab').value = '1';
    document.getElementById('aepForm_avaliador').value = 'Eng. João Everton';
    document.getElementById('aepForm_registro').value = 'CREA/MTE Ativo';

    document.getElementById('aepForm_fatorCarga').value = 'baixo';
    document.getElementById('aepForm_obsCarga').value = '';
    document.getElementById('aepForm_fatorPostura').value = 'baixo';
    document.getElementById('aepForm_obsPostura').value = '';
    document.getElementById('aepForm_fatorMobiliario').value = 'baixo';
    document.getElementById('aepForm_obsMobiliario').value = '';
    document.getElementById('aepForm_fatorAmbiental').value = 'baixo';
    document.getElementById('aepForm_obsAmbiental').value = '';
    document.getElementById('aepForm_fatorOrganizacao').value = 'baixo';
    document.getElementById('aepForm_obsOrganizacao').value = '';

    document.getElementById('aepForm_riscoGlobal').value = 'baixo';
    document.getElementById('aepForm_necessidadeAet').checked = false;
    document.getElementById('aepForm_parecer').value = '';

    modal.style.display = 'flex';
}

function editarAep(id) {
    const a = allErgonomiaAep.find(item => item.id === id);
    if (!a) return;
    const modal = document.getElementById('modalErgonomiaAep');
    if (!modal) return;

    document.getElementById('modalErgonomiaAepTitulo').textContent = `✏️ Editar AEP — ${a.codigo || a.posto_trabalho}`;
    document.getElementById('aepForm_id').value = a.id;
    document.getElementById('aepForm_codigo').value = a.codigo || '';
    document.getElementById('aepForm_data').value = a.data_avaliacao || '';
    document.getElementById('aepForm_setor').value = a.setor || '';
    document.getElementById('aepForm_posto').value = a.posto_trabalho || '';
    document.getElementById('aepForm_funcao').value = a.funcao_avaliada || '';
    document.getElementById('aepForm_ghe').value = a.ghe || '';
    document.getElementById('aepForm_numTrab').value = a.num_trabalhadores || 1;
    document.getElementById('aepForm_avaliador').value = a.avaliador_nome || '';
    document.getElementById('aepForm_registro').value = a.avaliador_registro || '';

    document.getElementById('aepForm_fatorCarga').value = a.fator_levantamento_carga || 'baixo';
    document.getElementById('aepForm_obsCarga').value = a.obs_levantamento_carga || '';
    document.getElementById('aepForm_fatorPostura').value = a.fator_posturas_repetitividade || 'baixo';
    document.getElementById('aepForm_obsPostura').value = a.obs_posturas_repetitividade || '';
    document.getElementById('aepForm_fatorMobiliario').value = a.fator_mobiliario_equipamentos || 'baixo';
    document.getElementById('aepForm_obsMobiliario').value = a.obs_mobiliario_equipamentos || '';
    document.getElementById('aepForm_fatorAmbiental').value = a.fator_condicoes_ambientais || 'baixo';
    document.getElementById('aepForm_obsAmbiental').value = a.obs_condicoes_ambientais || '';
    document.getElementById('aepForm_fatorOrganizacao').value = a.fator_organizacao_trabalho || 'baixo';
    document.getElementById('aepForm_obsOrganizacao').value = a.obs_organizacao_trabalho || '';

    document.getElementById('aepForm_riscoGlobal').value = a.nivel_risco_global || 'baixo';
    document.getElementById('aepForm_necessidadeAet').checked = !!a.necessidade_aet;
    document.getElementById('aepForm_parecer').value = a.parecer_conclusivo || '';

    modal.style.display = 'flex';
}

function fecharModalErgonomiaAep() {
    const modal = document.getElementById('modalErgonomiaAep');
    if (modal) modal.style.display = 'none';
}

function atualizarSugestaoRiscoGlobalAep() {
    const fatores = [
        document.getElementById('aepForm_fatorCarga')?.value,
        document.getElementById('aepForm_fatorPostura')?.value,
        document.getElementById('aepForm_fatorMobiliario')?.value,
        document.getElementById('aepForm_fatorAmbiental')?.value,
        document.getElementById('aepForm_fatorOrganizacao')?.value
    ];
    const riscoSelect = document.getElementById('aepForm_riscoGlobal');
    const chkAet = document.getElementById('aepForm_necessidadeAet');
    if (!riscoSelect) return;

    if (fatores.includes('alto')) {
        riscoSelect.value = 'alto';
        if (chkAet && !chkAet.checked) {
            // Sugere marcar AET se houver risco crítico
            chkAet.checked = true;
        }
    } else if (fatores.includes('medio')) {
        riscoSelect.value = 'medio';
    } else {
        riscoSelect.value = 'baixo';
    }
}

async function salvarFormularioAep() {
    if (bloquearEdicaoSeNaoAutorizado('ergonomia')) return;
    const idExistente = document.getElementById('aepForm_id').value;
    const codigo = document.getElementById('aepForm_codigo').value.trim();
    const dataAvaliacao = document.getElementById('aepForm_data').value;
    const setor = document.getElementById('aepForm_setor').value.trim();
    const posto = document.getElementById('aepForm_posto').value.trim();
    const funcao = document.getElementById('aepForm_funcao').value.trim();

    if (!codigo || !dataAvaliacao || !setor || !posto || !funcao) {
        alert('Por favor, preencha os campos obrigatórios: Código, Data, Setor, Posto de Trabalho e Função.');
        return;
    }

    const payload = {
        codigo,
        data_avaliacao: dataAvaliacao,
        setor,
        posto_trabalho: posto,
        funcao_avaliada: funcao,
        ghe: document.getElementById('aepForm_ghe').value.trim(),
        num_trabalhadores: parseInt(document.getElementById('aepForm_numTrab').value, 10) || 1,
        avaliador_nome: document.getElementById('aepForm_avaliador').value.trim(),
        avaliador_registro: document.getElementById('aepForm_registro').value.trim(),
        fator_levantamento_carga: document.getElementById('aepForm_fatorCarga').value,
        obs_levantamento_carga: document.getElementById('aepForm_obsCarga').value.trim(),
        fator_posturas_repetitividade: document.getElementById('aepForm_fatorPostura').value,
        obs_posturas_repetitividade: document.getElementById('aepForm_obsPostura').value.trim(),
        fator_mobiliario_equipamentos: document.getElementById('aepForm_fatorMobiliario').value,
        obs_mobiliario_equipamentos: document.getElementById('aepForm_obsMobiliario').value.trim(),
        fator_condicoes_ambientais: document.getElementById('aepForm_fatorAmbiental').value,
        obs_condicoes_ambientais: document.getElementById('aepForm_obsAmbiental').value.trim(),
        fator_organizacao_trabalho: document.getElementById('aepForm_fatorOrganizacao').value,
        obs_organizacao_trabalho: document.getElementById('aepForm_obsOrganizacao').value.trim(),
        nivel_risco_global: document.getElementById('aepForm_riscoGlobal').value,
        necessidade_aet: !!document.getElementById('aepForm_necessidadeAet').checked,
        parecer_conclusivo: document.getElementById('aepForm_parecer').value.trim(),
        status: 'concluida'
    };

    try {
        if (idExistente) {
            await supabaseUpdate('ergonomia_aep', idExistente, payload);
            const idx = allErgonomiaAep.findIndex(a => a.id === idExistente);
            if (idx >= 0) allErgonomiaAep[idx] = { ...allErgonomiaAep[idx], ...payload };
        } else {
            const novoId = 'AEP_' + Date.now();
            const novoItem = { id: novoId, ...payload, created_at: new Date().toISOString() };
            await supabaseInsert('ergonomia_aep', novoItem);
            allErgonomiaAep.unshift(novoItem);
        }

        fecharModalErgonomiaAep();
        popularFiltroSetorErgonomia();
        renderErgonomiaVisao();
        alert('Avaliação Ergonômica Preliminar (AEP) salva com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar AEP:', err);
        alert('Erro ao salvar no banco de dados: ' + (err.message || err));
    }
}

async function excluirAep(id) {
    if (bloquearEdicaoSeNaoAutorizado('ergonomia')) return;
    const a = allErgonomiaAep.find(item => item.id === id);
    if (!a) return;
    const acoesVinculadas = allErgonomiaPlanoAcao.filter(p => p.aep_id === id).length;
    let aviso = `Tem certeza que deseja excluir a avaliação "${a.codigo} - ${a.posto_trabalho}"?`;
    if (acoesVinculadas > 0) {
        aviso += `\n\nATENÇÃO: Existem ${acoesVinculadas} ação(ões) no plano vinculadas a esta AEP que também serão removidas.`;
    }
    if (!confirm(aviso)) return;

    try {
        await supabaseDelete('ergonomia_aep', id);
        allErgonomiaAep = allErgonomiaAep.filter(item => item.id !== id);
        allErgonomiaPlanoAcao = allErgonomiaPlanoAcao.filter(p => p.aep_id !== id);
        popularFiltroSetorErgonomia();
        renderErgonomiaVisao();
        renderErgonomiaPlano();
    } catch (err) {
        console.error('Erro ao excluir AEP:', err);
        alert('Erro ao excluir: ' + (err.message || err));
    }
}

// ---- Modais e CRUD de Ações no Plano ----

function abrirModalNovaAcaoErgonomia(aepId) {
    const modal = document.getElementById('modalErgonomiaAcao');
    if (!modal) return;

    document.getElementById('modalErgonomiaAcaoTitulo').textContent = '🎯 Nova Ação de Melhoria Ergonômica (5W2H)';
    document.getElementById('acaoErgForm_id').value = '';

    // Popula select de AEPs
    const selectAep = document.getElementById('acaoErgForm_aepId');
    if (selectAep) {
        selectAep.innerHTML = '<option value="">Ação Avulsa (Não vinculada a uma AEP específica)</option>' +
            allErgonomiaAep.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.codigo)} — ${escapeHTML(a.posto_trabalho)} (${escapeHTML(a.setor)})</option>`).join('');
        if (aepId) selectAep.value = aepId;
    }

    if (aepId) {
        const aep = allErgonomiaAep.find(a => a.id === aepId);
        document.getElementById('acaoErgForm_posto').value = aep ? aep.posto_trabalho : '';
    } else {
        document.getElementById('acaoErgForm_posto').value = '';
    }

    document.getElementById('acaoErgForm_fator').value = 'Levantamento de Cargas';
    document.getElementById('acaoErgForm_acao').value = '';
    document.getElementById('acaoErgForm_tipo').value = 'equipamento';
    document.getElementById('acaoErgForm_responsavel').value = 'SESMT / Engenharia';

    // Prazo padrão: +30 dias
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    document.getElementById('acaoErgForm_prazo').value = toISODateLocal(d30);
    document.getElementById('acaoErgForm_custo').value = '';
    document.getElementById('acaoErgForm_status').value = 'pendente';
    document.getElementById('acaoErgForm_evidencia').value = '';

    modal.style.display = 'flex';
}

function aoSelecionarAepNaAcao() {
    const aepId = document.getElementById('acaoErgForm_aepId')?.value;
    if (!aepId) return;
    const aep = allErgonomiaAep.find(a => a.id === aepId);
    if (aep) {
        document.getElementById('acaoErgForm_posto').value = aep.posto_trabalho || '';
        // Sugere o pior fator da AEP
        if (aep.fator_levantamento_carga === 'alto') document.getElementById('acaoErgForm_fator').value = 'Levantamento de Cargas';
        else if (aep.fator_posturas_repetitividade === 'alto') document.getElementById('acaoErgForm_fator').value = 'Postura e Repetitividade';
        else if (aep.fator_mobiliario_equipamentos === 'alto') document.getElementById('acaoErgForm_fator').value = 'Mobiliário e Ferramentas';
    }
}

function editarAcaoErgonomia(id) {
    const p = allErgonomiaPlanoAcao.find(item => item.id === id);
    if (!p) return;
    const modal = document.getElementById('modalErgonomiaAcao');
    if (!modal) return;

    document.getElementById('modalErgonomiaAcaoTitulo').textContent = '✏️ Editar Ação de Melhoria Ergonômica';
    document.getElementById('acaoErgForm_id').value = p.id;

    const selectAep = document.getElementById('acaoErgForm_aepId');
    if (selectAep) {
        selectAep.innerHTML = '<option value="">Ação Avulsa (Não vinculada a uma AEP específica)</option>' +
            allErgonomiaAep.map(a => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.codigo)} — ${escapeHTML(a.posto_trabalho)} (${escapeHTML(a.setor)})</option>`).join('');
        selectAep.value = p.aep_id || '';
    }

    document.getElementById('acaoErgForm_posto').value = p.posto_trabalho || '';
    document.getElementById('acaoErgForm_fator').value = p.fator_ergonomico || 'Levantamento de Cargas';
    document.getElementById('acaoErgForm_acao').value = p.acao_proposta || '';
    document.getElementById('acaoErgForm_tipo').value = p.tipo_medida || 'administrativa';
    document.getElementById('acaoErgForm_responsavel').value = p.responsavel || '';
    document.getElementById('acaoErgForm_prazo').value = p.prazo || '';
    document.getElementById('acaoErgForm_custo').value = p.custo_estimado || '';
    document.getElementById('acaoErgForm_status').value = p.status || 'pendente';
    document.getElementById('acaoErgForm_evidencia').value = p.evidencia_conclusao || '';

    modal.style.display = 'flex';
}

function fecharModalErgonomiaAcao() {
    const modal = document.getElementById('modalErgonomiaAcao');
    if (modal) modal.style.display = 'none';
}

async function salvarFormularioAcaoErgonomia() {
    if (bloquearEdicaoSeNaoAutorizado('ergonomia')) return;
    const idExistente = document.getElementById('acaoErgForm_id').value;
    const posto = document.getElementById('acaoErgForm_posto').value.trim();
    const acao = document.getElementById('acaoErgForm_acao').value.trim();
    const responsavel = document.getElementById('acaoErgForm_responsavel').value.trim();
    const prazo = document.getElementById('acaoErgForm_prazo').value;

    if (!posto || !acao || !responsavel || !prazo) {
        alert('Por favor, preencha os campos obrigatórios: Posto, Ação Proposta, Responsável e Prazo.');
        return;
    }

    const custoVal = parseFloat(document.getElementById('acaoErgForm_custo').value);
    const aepIdVal = document.getElementById('acaoErgForm_aepId').value || null;
    const statusVal = document.getElementById('acaoErgForm_status').value;
    const evidenciaVal = document.getElementById('acaoErgForm_evidencia').value.trim();

    const payload = {
        aep_id: aepIdVal,
        posto_trabalho: posto,
        fator_ergonomico: document.getElementById('acaoErgForm_fator').value,
        acao_proposta: acao,
        tipo_medida: document.getElementById('acaoErgForm_tipo').value,
        responsavel: responsavel,
        prazo: prazo,
        custo_estimado: isNaN(custoVal) ? 0 : custoVal,
        status: statusVal,
        evidencia_conclusao: evidenciaVal,
        data_conclusao: statusVal === 'concluido' ? toISODateLocal(new Date()) : null
    };

    try {
        if (idExistente) {
            await supabaseUpdate('ergonomia_plano_acao', idExistente, payload);
            const idx = allErgonomiaPlanoAcao.findIndex(item => item.id === idExistente);
            if (idx >= 0) allErgonomiaPlanoAcao[idx] = { ...allErgonomiaPlanoAcao[idx], ...payload };
        } else {
            const novoId = 'ACAO_ERG_' + Date.now();
            const novoItem = { id: novoId, ...payload, created_at: new Date().toISOString() };
            await supabaseInsert('ergonomia_plano_acao', novoItem);
            allErgonomiaPlanoAcao.unshift(novoItem);
        }

        fecharModalErgonomiaAcao();
        renderErgonomiaPlano();
        renderErgonomiaVisao();
        alert('Ação de melhoria ergonômica salva com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar ação de ergonomia:', err);
        alert('Erro ao salvar ação: ' + (err.message || err));
    }
}

async function excluirAcaoErgonomia(id) {
    if (bloquearEdicaoSeNaoAutorizado('ergonomia')) return;
    const p = allErgonomiaPlanoAcao.find(item => item.id === id);
    if (!p) return;
    if (!confirm(`Deseja excluir a ação "${p.acao_proposta}"?`)) return;

    try {
        await supabaseDelete('ergonomia_plano_acao', id);
        allErgonomiaPlanoAcao = allErgonomiaPlanoAcao.filter(item => item.id !== id);
        renderErgonomiaPlano();
        renderErgonomiaVisao();
    } catch (err) {
        console.error('Erro ao excluir ação:', err);
        alert('Erro ao excluir ação: ' + (err.message || err));
    }
}

// ---- Baixa Rápida de Ação ----

function abrirModalConcluirAcaoErgonomia(id) {
    const p = allErgonomiaPlanoAcao.find(item => item.id === id);
    if (!p) return;
    const modal = document.getElementById('modalConcluirAcaoErgonomia');
    if (!modal) return;

    document.getElementById('concluirAcao_id').value = p.id;
    document.getElementById('modalConcluirAcaoTexto').innerHTML = `<b>Posto:</b> ${escapeHTML(p.posto_trabalho)}<br><b>Ação:</b> ${escapeHTML(p.acao_proposta)}`;
    document.getElementById('concluirAcao_data').value = toISODateLocal(new Date());
    document.getElementById('concluirAcao_evidencia').value = p.evidencia_conclusao || '';

    modal.style.display = 'flex';
}

function fecharModalConcluirAcaoErgonomia() {
    const modal = document.getElementById('modalConcluirAcaoErgonomia');
    if (modal) modal.style.display = 'none';
}

async function confirmarConclusaoAcaoErgonomia() {
    const id = document.getElementById('concluirAcao_id').value;
    const dataConclusao = document.getElementById('concluirAcao_data').value;
    const evidencia = document.getElementById('concluirAcao_evidencia').value.trim();

    if (!dataConclusao || !evidencia) {
        alert('Por favor, informe a Data de Conclusão e a Evidência/Descrição de como a ação foi executada.');
        return;
    }

    try {
        const payload = {
            status: 'concluido',
            data_conclusao: dataConclusao,
            evidencia_conclusao: evidencia
        };
        await supabaseUpdate('ergonomia_plano_acao', id, payload);
        const item = allErgonomiaPlanoAcao.find(p => p.id === id);
        if (item) Object.assign(item, payload);

        fecharModalConcluirAcaoErgonomia();
        renderErgonomiaPlano();
        renderErgonomiaVisao();
        alert('Ação concluída com sucesso!');
    } catch (err) {
        console.error('Erro ao concluir ação:', err);
        alert('Erro ao concluir ação: ' + (err.message || err));
    }
}

// ---- Relatórios Oficiais e Impressão NR-17 ----

function imprimirLaudoAep(id) {
    const a = allErgonomiaAep.find(item => item.id === id);
    if (!a) return;

    const acoes = allErgonomiaPlanoAcao.filter(p => p.aep_id === a.id);
    const dataEmissao = formatSimpleDate(toISODateLocal(new Date()));

    const badgeTexto = (r) => {
        if (r === 'alto') return '<b style="color:#b91c1c;">ALTO / CRÍTICO</b>';
        if (r === 'medio') return '<b style="color:#b45309;">MÉDIO / ATENÇÃO</b>';
        return '<b style="color:#15803d;">BAIXO / TOLERÁVEL</b>';
    };

    const linhaFator = (num, nome, nivel, obs) => `
        <tr>
            <td style="text-align:center; font-weight:700;">${num}</td>
            <td><b>${nome}</b></td>
            <td style="text-align:center;">${badgeTexto(nivel)}</td>
            <td>${escapeHTML(obs || 'Sem apontamentos críticos. Condição ergonômica em conformidade.')}</td>
        </tr>`;

    const linhasAcoes = acoes.length > 0 ? acoes.map((p, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><b>${escapeHTML(p.acao_proposta)}</b></td>
            <td style="text-align:center;">${escapeHTML(p.tipo_medida || '—')}</td>
            <td>${escapeHTML(p.responsavel)}</td>
            <td style="text-align:center;">${p.prazo ? formatSimpleDate(p.prazo) : '—'}</td>
            <td style="text-align:center; font-weight:600;">${p.status === 'concluido' ? '✅ Concluído' : '⏳ Pendente'}</td>
        </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center; color:#555;">Nenhuma pendência ou ação corretiva aberta para este posto.</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Laudo AEP - ${escapeHTML(a.codigo)} - ${escapeHTML(EMPRESA_INFO.razaoSocial)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .folha { max-width: 1100px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 10px 14px; gap: 16px; }
    .titulo { flex: 1; text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .secao-titulo { background: #e5e7eb; font-weight: 700; font-size: 11px; padding: 5px 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; text-transform: uppercase; }
    .grid-campos { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid #000; font-size: 10.5px; }
    .campo { padding: 6px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #000; padding: 5px 8px; }
    th { background: #f3f4f6; text-align: left; }
    @media print { body { margin: 0; } .folha { border: none; } }
</style>
</head>
<body onload="window.print()">
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:48px; max-width:180px; object-fit:contain;">
            <div class="titulo">
                LAUDO DE AVALIAÇÃO ERGONÔMICA PRELIMINAR (AEP)<br>
                <span style="font-weight:400; font-size:11px;">Conforme NR-17 (Portaria MTP nº 423/2021) e PGR (NR-01)</span>
            </div>
        </div>
        <div class="secao-titulo">1. Identificação da Empresa e do Posto de Trabalho</div>
        <div class="grid-campos">
            <div class="campo"><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
            <div class="campo"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</div>
            <div class="campo"><b>CÓDIGO DA AEP:</b> <b>${escapeHTML(a.codigo)}</b></div>
        </div>
        <div class="grid-campos">
            <div class="campo"><b>SETOR:</b> ${escapeHTML(a.setor)}</div>
            <div class="campo"><b>POSTO:</b> <b>${escapeHTML(a.posto_trabalho)}</b></div>
            <div class="campo"><b>DATA DA AVALIAÇÃO:</b> ${formatSimpleDate(a.data_avaliacao)}</div>
        </div>
        <div class="grid-campos" style="border-bottom:none;">
            <div class="campo"><b>FUNÇÃO:</b> ${escapeHTML(a.funcao_avaliada)}</div>
            <div class="campo"><b>GHE:</b> ${escapeHTML(a.ghe || 'GHE Operacional')}</div>
            <div class="campo"><b>TRABALHADORES EXPOSTOS:</b> ${a.num_trabalhadores || 1} colaborador(es)</div>
        </div>

        <div class="secao-titulo">2. Análise dos Fatores de Risco Ergonômico (NR-17)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:25px; text-align:center;">#</th>
                    <th style="width:220px;">Fator Ergonômico Analisado</th>
                    <th style="width:130px; text-align:center;">Classificação de Risco</th>
                    <th>Diagnóstico Situacional / Observações de Campo</th>
                </tr>
            </thead>
            <tbody>
                ${linhaFator(1, 'Levantamento e Cargas', a.fator_levantamento_carga, a.obs_levantamento_carga)}
                ${linhaFator(2, 'Postura e Repetitividade', a.fator_posturas_repetitividade, a.obs_posturas_repetitividade)}
                ${linhaFator(3, 'Mobiliário e Equipamentos', a.fator_mobiliario_equipamentos, a.obs_mobiliario_equipamentos)}
                ${linhaFator(4, 'Condições Ambientais', a.fator_condicoes_ambientais, a.obs_condicoes_ambientais)}
                ${linhaFator(5, 'Organização do Trabalho', a.fator_organizacao_trabalho, a.obs_organizacao_trabalho)}
            </tbody>
        </table>

        <div class="secao-titulo">3. Conclusão Técnica e Necessidade de AET</div>
        <div style="padding: 8px 12px; font-size: 11px; border-bottom: 1px solid #000;">
            <div style="margin-bottom: 6px;">
                <b>NÍVEL DE RISCO GLOBAL DO POSTO:</b> ${badgeTexto(a.nivel_risco_global)} &nbsp;&nbsp;|&nbsp;&nbsp;
                <b>INDICAÇÃO DE AET APROFUNDADA:</b> ${a.necessidade_aet ? '<b style="color:#7c3aed;">SIM (Subitem 17.3.2 da NR-17)</b>' : 'NÃO (Risco controlado por AEP)'}
            </div>
            <div><b>PARECER DO SESMT:</b> ${escapeHTML(a.parecer_conclusivo || 'Posto em conformidade ergonômica com as diretrizes da NR-17.')}</div>
        </div>

        <div class="secao-titulo">4. Plano de Ação de Melhorias de Postos de Trabalho (5W2H)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:25px; text-align:center;">#</th>
                    <th>Ação Proposta (O que fazer)</th>
                    <th style="width:110px; text-align:center;">Tipo de Medida</th>
                    <th style="width:160px;">Responsável</th>
                    <th style="width:85px; text-align:center;">Prazo</th>
                    <th style="width:85px; text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>${linhasAcoes}</tbody>
        </table>

        <div style="display:flex; justify-content:space-around; text-align:center; padding: 24px 10px 14px; font-size:10.5px;">
            <div>
                ____________________________________________________<br>
                <b>${escapeHTML(a.avaliador_nome || 'Eng. João Everton')}</b><br>
                Engenharia de Segurança do Trabalho / Avaliador<br>
                ${escapeHTML(a.avaliador_registro || 'CREA / MTE Ativo')}
            </div>
            <div>
                ____________________________________________________<br>
                <b>Gestão da Obra / Direção Técnica</b><br>
                Ciência e Compromisso com o Plano de Ação
            </div>
        </div>
    </div>
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Laudo AEP - ${a.codigo || ''}`);
}

function imprimirPlanoGeralErgonomia() {
    const dataEmissao = formatSimpleDate(toISODateLocal(new Date()));
    const totalAep = allErgonomiaAep.length;
    const altoRisco = allErgonomiaAep.filter(a => a.nivel_risco_global === 'alto').length;
    const medioRisco = allErgonomiaAep.filter(a => a.nivel_risco_global === 'medio').length;
    const baixoRisco = allErgonomiaAep.filter(a => a.nivel_risco_global === 'baixo').length;

    const linhasAep = allErgonomiaAep.map((a, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td><b>${escapeHTML(a.codigo)}</b></td>
            <td>${escapeHTML(a.setor)}</td>
            <td><b>${escapeHTML(a.posto_trabalho)}</b></td>
            <td>${escapeHTML(a.funcao_avaliada)}</td>
            <td style="text-align:center;">${a.nivel_risco_global.toUpperCase()}</td>
            <td style="text-align:center;">${a.necessidade_aet ? 'SIM' : 'NÃO'}</td>
        </tr>
    `).join('');

    const linhasAcoes = allErgonomiaPlanoAcao.map((p, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${escapeHTML(p.posto_trabalho)}</td>
            <td><b>${escapeHTML(p.acao_proposta)}</b></td>
            <td>${escapeHTML(p.tipo_medida || '—')}</td>
            <td>${escapeHTML(p.responsavel)}</td>
            <td style="text-align:center;">${p.prazo ? formatSimpleDate(p.prazo) : '—'}</td>
            <td style="text-align:center;">${p.status.toUpperCase()}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório Geral de Ergonomia NR-17 - ${escapeHTML(EMPRESA_INFO.razaoSocial)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 16px; }
    .folha { max-width: 1200px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 10px 14px; gap: 16px; }
    .titulo { flex: 1; text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .secao-titulo { background: #e5e7eb; font-weight: 700; font-size: 11px; padding: 5px 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
    th, td { border: 1px solid #000; padding: 4px 6px; }
    th { background: #f3f4f6; text-align: left; }
</style>
</head>
<body onload="window.print()">
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:48px; max-width:180px; object-fit:contain;">
            <div class="titulo">
                PROGRAMA DE GESTÃO DE ERGONOMIA (NR-17 / PGR)<br>
                <span style="font-weight:400; font-size:11px;">Inventário de AEPs e Plano de Ação de Melhorias de Postos</span>
            </div>
        </div>
        <div style="display:flex; padding: 6px 12px; font-size:11px; justify-content:space-between; border-bottom:1px solid #000;">
            <div><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)} (${escapeHTML(EMPRESA_INFO.cnpj)})</div>
            <div><b>DATA DE EMISSÃO:</b> ${dataEmissao}</div>
            <div><b>POSTOS AVALIADOS:</b> ${totalAep} (🔴 ${altoRisco} | 🟡 ${medioRisco} | 🟢 ${baixoRisco})</div>
        </div>

        <div class="secao-titulo">1. Inventário de Avaliações Ergonômicas Preliminares (AEP)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:25px; text-align:center;">#</th>
                    <th style="width:90px;">Código</th>
                    <th style="width:130px;">Setor</th>
                    <th>Posto de Trabalho</th>
                    <th style="width:150px;">Função Avaliada</th>
                    <th style="width:75px; text-align:center;">Risco</th>
                    <th style="width:50px; text-align:center;">AET?</th>
                </tr>
            </thead>
            <tbody>${linhasAep || '<tr><td colspan="7" style="text-align:center;">Nenhuma AEP registrada.</td></tr>'}</tbody>
        </table>

        <div class="secao-titulo">2. Plano de Ação Consolidado de Melhorias Ergonômicas (5W2H)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:25px; text-align:center;">#</th>
                    <th style="width:160px;">Posto de Trabalho</th>
                    <th>Ação de Melhoria (O que fazer)</th>
                    <th style="width:90px;">Tipo</th>
                    <th style="width:140px;">Responsável</th>
                    <th style="width:75px; text-align:center;">Prazo</th>
                    <th style="width:80px; text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>${linhasAcoes || '<tr><td colspan="7" style="text-align:center;">Nenhuma ação cadastrada.</td></tr>'}</tbody>
        </table>

        <div style="display:flex; justify-content:space-around; text-align:center; padding: 24px 10px 14px; font-size:10.5px;">
            <div>
                ____________________________________________________<br>
                <b>Engenharia de Segurança do Trabalho / SESMT</b><br>
                Responsável Técnico pelo Programa de Ergonomia
            </div>
            <div>
                ____________________________________________________<br>
                <b>Direção / Gerência de Operações</b><br>
                Aprovação do Plano de Investimento Ergonômico
            </div>
        </div>
    </div>
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, 'Relatório Geral de Ergonomia NR-17');
}

function abrirDocumentoHtmlParaImpressao(html, titulo) {
    try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
        console.warn('Erro ao abrir documento via Blob, utilizando iframe de impressão:', err);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 60000);
        }, 400);
    }
}

// ================================================================
// MÓDULO DE PERICULOSIDADE (NR-16) - LAUDO TÉCNICO (LTP)
// Consórcio Operador Ramal do Agreste - Gestão Técnica Oficial
// ================================================================
var allPericulosidadeLaudos = [];
var allPericulosidadeAnalises = [];
var periculosidadeLoaded = false;
var analisePericEditandoId = null;

async function loadPericulosidadeData() {
    try {
        const promessas = [
            supabaseFetch('periculosidade_laudos', '?select=*&order=created_at.desc'),
            supabaseFetch('periculosidade_analises', '?select=*&order=grupo_numero.asc')
        ];

        if (allEfetivo.length === 0) {
            promessas.push(supabaseFetch('colaboradores_efetivo', '?select=*'));
        }

        const resultados = await Promise.all(promessas);
        allPericulosidadeLaudos = Array.isArray(resultados[0]) ? resultados[0] : [];
        allPericulosidadeAnalises = Array.isArray(resultados[1]) ? resultados[1] : [];
        if (resultados[2] && Array.isArray(resultados[2])) {
            allEfetivo = resultados[2];
            efetivoLoaded = true;
        }

        // Atualiza cabeçalho do laudo ativo
        const laudoAtivo = allPericulosidadeLaudos[0];
        if (laudoAtivo) {
            const elCod = document.getElementById('pericLaudoCodigo');
            const elVig = document.getElementById('pericLaudoVigencia');
            const elResp = document.getElementById('pericLaudoResp');
            if (elCod) elCod.textContent = laudoAtivo.codigo || 'LTP-2026/2027';
            if (elVig) {
                const dtIni = laudoAtivo.data_inicio ? laudoAtivo.data_inicio.split('-').reverse().join('/') : '20/07/2026';
                const dtFim = laudoAtivo.data_fim ? laudoAtivo.data_fim.split('-').reverse().join('/') : '20/07/2027';
                elVig.textContent = `${dtIni} a ${dtFim}`;
            }
            if (elResp) elResp.textContent = `${laudoAtivo.responsavel_tecnico || 'Eng. João Everton'} (${laudoAtivo.registro_profissional || 'CREA 0522078320-BA'})`;
        }

        renderPericulosidadePanel();
    } catch (err) {
        console.error('Erro ao carregar dados de periculosidade:', err);
        renderPericulosidadePanel();
    }
}

function showPericulosidadeSubtab(tab) {
    const btnMatriz = document.getElementById('pericSubtabBtn-matriz');
    const btnColabs = document.getElementById('pericSubtabBtn-colaboradores');
    const contentMatriz = document.getElementById('pericSubtabContent-matriz');
    const contentColabs = document.getElementById('pericSubtabContent-colaboradores');

    if (tab === 'matriz') {
        if (btnMatriz) {
            btnMatriz.classList.add('active');
            btnMatriz.style.borderBottom = '3px solid var(--primary)';
            btnMatriz.style.color = 'var(--primary)';
        }
        if (btnColabs) {
            btnColabs.classList.remove('active');
            btnColabs.style.borderBottom = 'none';
            btnColabs.style.color = 'var(--text-light)';
        }
        if (contentMatriz) contentMatriz.style.display = 'block';
        if (contentColabs) contentColabs.style.display = 'none';
    } else {
        if (btnColabs) {
            btnColabs.classList.add('active');
            btnColabs.style.borderBottom = '3px solid var(--primary)';
            btnColabs.style.color = 'var(--primary)';
        }
        if (btnMatriz) {
            btnMatriz.classList.remove('active');
            btnMatriz.style.borderBottom = 'none';
            btnMatriz.style.color = 'var(--text-light)';
        }
        if (contentMatriz) contentMatriz.style.display = 'none';
        if (contentColabs) contentColabs.style.display = 'block';

        renderPericulosidadeColaboradores();
    }
}

function renderPericulosidadePanel() {
    renderPericulosidadeKpis();
    filtrarPericulosidadeLista();
    renderPericulosidadeColaboradores();
}

function renderPericulosidadeKpis() {
    let totalTrab = 0;
    let totalPeric = 0;
    let totalNaoPeric = 0;
    let impactoMensal = 0;
    const anexosSet = new Set();

    allPericulosidadeAnalises.forEach(item => {
        const n = parseInt(item.num_trabalhadores, 10) || 0;
        totalTrab += n;
        if (item.caracterizacao === true || item.caracterizacao === 'true') {
            totalPeric += n;
            const sal = parseFloat(item.salario_base_medio) || 0;
            const perc = (parseFloat(item.percentual_adicional) || 30) / 100;
            impactoMensal += (sal * perc) * n;
            if (item.anexo_nr16 && !item.anexo_nr16.includes('Nenhum')) {
                const anexoCurto = item.anexo_nr16.split('-')[0].trim();
                anexosSet.add(anexoCurto);
            }
        } else {
            totalNaoPeric += n;
        }
    });

    const elTotal = document.getElementById('kpiPericTotalTrabalhadores');
    const elPeric = document.getElementById('kpiPericCaracterizados');
    const elNaoPeric = document.getElementById('kpiPericDescaracterizados');
    const elAnexos = document.getElementById('kpiPericAnexosAtivos');
    const elImpacto = document.getElementById('kpiPericImpactoMensal');

    if (elTotal) elTotal.textContent = totalTrab;
    if (elPeric) elPeric.textContent = totalPeric;
    if (elNaoPeric) elNaoPeric.textContent = totalNaoPeric;
    if (elAnexos) elAnexos.textContent = anexosSet.size > 0 ? Array.from(anexosSet).join(' e ') : 'Nenhum';
    if (elImpacto) {
        elImpacto.textContent = impactoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

function filtrarPericulosidadeLista() {
    const search = (document.getElementById('pericSearchInput')?.value || '').trim().toLowerCase();
    const filtroConclusao = document.getElementById('pericFiltroConclusao')?.value || '';
    const filtroAnexo = document.getElementById('pericFiltroAnexo')?.value || '';

    let filtrados = allPericulosidadeAnalises.filter(item => {
        if (filtroConclusao === 'periculoso' && !(item.caracterizacao === true || item.caracterizacao === 'true')) return false;
        if (filtroConclusao === 'nao_periculoso' && (item.caracterizacao === true || item.caracterizacao === 'true')) return false;
        if (filtroAnexo && item.anexo_nr16 !== filtroAnexo) return false;

        if (search) {
            const haystack = [
                item.setor, item.cargo_funcao, item.posto_trabalho, item.cbo,
                item.ghe, item.anexo_nr16, item.agente_periculoso, item.fundamentacao_legal
            ].map(x => (x || '').toLowerCase()).join(' ');
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    // Ordenar: primeiro os periculosos, depois por grupo_numero
    filtrados.sort((a, b) => {
        const aPeric = (a.caracterizacao === true || a.caracterizacao === 'true') ? 1 : 0;
        const bPeric = (b.caracterizacao === true || b.caracterizacao === 'true') ? 1 : 0;
        if (bPeric !== aPeric) return bPeric - aPeric;
        return (a.grupo_numero || 99) - (b.grupo_numero || 99);
    });

    const container = document.getElementById('periculosidadeTabelaContainer');
    if (!container) return;

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-light);">
                Nenhuma análise de periculosidade encontrada com os filtros informados.
            </div>`;
        return;
    }

    let html = `
        <table class="db-table" style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
            <thead>
                <tr style="background: var(--bg); border-bottom: 2px solid var(--border); text-align: left;">
                    <th style="padding: 9px 12px; width: 60px;">Grupo</th>
                    <th style="padding: 9px 12px; min-width: 180px;">Setor / Posto de Trabalho</th>
                    <th style="padding: 9px 12px; min-width: 200px;">Função Avaliada (CBO)</th>
                    <th style="padding: 9px 12px; text-align: center; width: 70px;">Efetivo</th>
                    <th style="padding: 9px 12px; min-width: 170px;">Anexo NR-16</th>
                    <th style="padding: 9px 12px; min-width: 190px;">Agente Periculoso & Delimitação</th>
                    <th style="padding: 9px 12px; width: 140px;">Exposição</th>
                    <th style="padding: 9px 12px; text-align: center; width: 150px;">Conclusão Técnica (NR-16)</th>
                    <th style="padding: 9px 12px; text-align: center; width: 110px;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach(row => {
        const isPeric = (row.caracterizacao === true || row.caracterizacao === 'true');
        const badgeConclusao = isPeric
            ? `<span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #f87171;">
                 ⚡ PERICULOSO (+30%)
               </span>`
            : `<span style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #86efac;">
                 🛡️ NÃO PERICULOSO
               </span>`;

        const anexoBadgeColor = isPeric ? 'background: rgba(220, 38, 38, 0.08); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2);' : 'background: var(--bg); color: var(--text-light); border: 1px solid var(--border);';

        html += `
            <tr style="border-bottom: 1px solid var(--border); ${isPeric ? 'background: rgba(239, 68, 68, 0.03);' : ''}">
                <td style="padding: 10px 12px; font-weight: 700; color: var(--text-light);">
                    ${row.grupo_numero ? 'G' + String(row.grupo_numero).padStart(2, '0') : '-'}
                </td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: var(--text-primary);">${row.setor || '-'}</div>
                    <div style="font-size: 11.5px; color: var(--text-light); margin-top: 2px;">📍 ${row.posto_trabalho || '-'}</div>
                </td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: var(--text-primary);">${row.cargo_funcao || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        ${row.cbo ? 'CBO ' + row.cbo : ''} ${row.ghe ? '• ' + row.ghe : ''}
                    </div>
                </td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700;">
                    ${row.num_trabalhadores || 1}
                </td>
                <td style="padding: 10px 12px;">
                    <span style="font-size: 11px; font-weight: 600; padding: 3px 6px; border-radius: 4px; ${anexoBadgeColor}">
                        ${row.anexo_nr16 || 'Nenhum'}
                    </span>
                </td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: ${isPeric ? '#dc2626' : 'var(--text-primary)'};">${row.agente_periculoso || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${row.delimitacao_area_risco || ''}">
                        📐 ${row.delimitacao_area_risco || '-'}
                    </div>
                </td>
                <td style="padding: 10px 12px; font-size: 11.5px;">
                    ${row.tempo_exposicao || '-'}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${badgeConclusao}
                </td>
                <td style="padding: 10px 12px; text-align: center; white-space: nowrap;">
                    <button class="db-clear-btn" style="padding: 4px 7px; font-size: 11.5px; margin-right: 3px;" onclick="verFundamentacaoPericulosidade('${row.id}')" title="Ver Fundamentação Técnica e Parecer">👁️</button>
                    <button class="db-clear-btn" style="padding: 4px 7px; font-size: 11.5px; margin-right: 3px;" onclick="editarAnalisePericulosidade('${row.id}')" title="Editar Análise">✏️</button>
                    <button class="db-clear-btn" style="padding: 4px 7px; font-size: 11.5px; color: #dc2626;" onclick="excluirAnalisePericulosidade('${row.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function limparFiltrosPericulosidade() {
    const elS = document.getElementById('pericSearchInput');
    const elC = document.getElementById('pericFiltroConclusao');
    const elA = document.getElementById('pericFiltroAnexo');
    if (elS) elS.value = '';
    if (elC) elC.value = '';
    if (elA) elA.value = '';
    filtrarPericulosidadeLista();
}

// ================================================================
// GESTÃO NOMINAL DE COLABORADORES COM PERICULOSIDADE (FOLHA / RH)
// ================================================================
function obterClassificacaoPericulosidadeColaborador(c) {
    const f = (c.funcao || '').toUpperCase();
    const s = (c.setor || '').toUpperCase();
    const g = String(c.ghe || '').padStart(2, '0');

    let isPeric = false;
    let anexo = 'Nenhum / Não Aplicável';
    let motivo = 'Atividades em áreas isentas de inflamáveis em volume excessivo ou alta tensão.';
    let localTrabalho = 'Frentes de Obra / Canteiro';
    let salBase = 2000;

    // 1. GRUPO 10: Operação Hídrica (Conforme decisão corporativa e permanência na EB próxima a painéis elétricos)
    if (g === '10' || (s === 'OPERAÇÃO' && (f.includes('HIDR') || f.includes('ENC. DE OPERAÇÃO')))) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Permanência no interior da Estação de Bombeamento em área adjacente e circulação próxima aos painéis de força e controle elétrico (Decisão Corporativa do Consórcio).';
        localTrabalho = 'Estação de Bombeamento (EB) / Galpão de Bombas';
        salBase = f.includes('ENC') ? 5000 : 3600;
    }
    // 2. GRUPO 25: Operadores de Subestação
    else if (g === '25' || f.includes('SUBESTAÇÃO') || f.includes('SUBESTACAO')) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Operação, manobra e inspeções em subestações elétricas de alta tensão das Estações de Bombeamento (SEP).';
        localTrabalho = 'Subestação de Alta Tensão / EBs';
        salBase = 3800;
    }
    // 3. GRUPO 05 / 22: Manutenção Elétrica
    else if (g === '05' || s === 'MANUTENÇÃO ELÉTRICA' || (s === 'PCM' && f.includes('ELÉTRIC'))) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Intervenções diretas, manutenção preventiva/corretiva e testes em painéis de força energizados e motobombas.';
        localTrabalho = 'Salas de Painéis Elétricos / Subestações';
        salBase = f.includes('TÉCNICO') || f.includes('TECNICO') ? 4200 : (f.includes('ASSISTENTE') ? 2500 : 2100);
    }
    // 4. GRUPO 04: Analistas de Sistemas Elétricos
    else if (f.includes('ANALISTA DE SISTEMAS ELÉTRICOS') || (s.includes('ANALISTA') && f.includes('ELÉTRIC'))) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Comissionamento e testes de conformidade elétrica em média/alta tensão no campo.';
        localTrabalho = 'Subestações e Painéis Elétricos de Campo';
        salBase = 5200;
    }
    // 5. GRUPO 15: Motorista de Caminhão Comboio (Inflamáveis)
    else if (f.includes('COMBOIO') || (s === 'TRANSPORTE' && f.includes('MOTORISTA') && (c.nome || '').includes('COMBOIO'))) {
        isPeric = true;
        anexo = 'Anexo 2 - Inflamáveis';
        motivo = 'Condução e operação de caminhão tanque abastecedor com óleo diesel > 200L com penetração em raio de 7,5m.';
        localTrabalho = 'Frentes de Serviço / Caminhão Comboio';
        salBase = 3500;
    }
    // 6. GRUPO 26: Conservação e Limpeza de Subestação e Faixa de Servidão (LT 69 kV)
    else if (g === '26' || (s.includes('CONSERVAÇÃO') && (g === '26' || f.includes('SERVENTE') || f.includes('ENCARREGADO') || f.includes('ROÇ')))) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Roço, poda e remoção de vegetação regenerada na Faixa de Servidão da Linha de Transmissão de Alta Tensão (LT 69 kV) e áreas periféricas da Subestação (Risco crítico de choque elétrico por aproximação ou indução magnética no SEP).';
        localTrabalho = 'Faixa de Servidão LT 69 kV / Subestação';
        salBase = f.includes('ENC') ? 3800 : 1900;
    }
    // 7. GRUPO 06: Manutenção Mecânica (EBs e Adutoras - Bombas, Motores de Alta Potência e Ventosas)
    else if (g === '06' || s.includes('MECÂNICA') || s.includes('MECANICA')) {
        isPeric = true;
        anexo = 'Anexo 4 - Energia Elétrica';
        motivo = 'Intervenções em conjuntos motobomba, acoplamentos com motores elétricos de alta potência e estruturas hidráulicas nas EBs e ventosas, em área de risco operacional do SEP (NR-16, Anexo 4).';
        localTrabalho = 'Estações de Bombeamento (EBs) / Adutoras / Ventosas';
        salBase = f.includes('ENC') ? 5000 : (f.includes('TÉC') || f.includes('TEC') ? 3700 : 2500);
    }

    const adicional = isPeric ? (salBase * 0.30) : 0;

    return {
        isPeric,
        anexo,
        motivo,
        localTrabalho,
        salBase,
        adicional
    };
}

function filtrarColaboradoresPericulosidade() {
    renderPericulosidadeColaboradores();
}

function limparFiltrosColaboradoresPericulosidade() {
    const elS = document.getElementById('pericColabSearchInput');
    const elSetor = document.getElementById('pericColabFiltroSetor');
    const elStatus = document.getElementById('pericColabFiltroStatus');
    if (elS) elS.value = '';
    if (elSetor) elSetor.value = '';
    if (elStatus) elStatus.value = 'periculoso';
    renderPericulosidadeColaboradores();
}

function renderPericulosidadeColaboradores() {
    const container = document.getElementById('periculosidadeColaboradoresTabelaContainer');
    if (!container) return;

    const search = (document.getElementById('pericColabSearchInput')?.value || '').trim().toLowerCase();
    const filtroSetor = document.getElementById('pericColabFiltroSetor')?.value || '';
    const filtroStatus = document.getElementById('pericColabFiltroStatus')?.value || 'periculoso';

    // Pega colaboradores ativos
    const ativos = allEfetivo.filter(c => colaboradorEstaAtivo(c));

    // Mapeia dados periciais para cada um
    const listaMapeada = ativos.map(c => {
        const pericInfo = obterClassificacaoPericulosidadeColaborador(c);
        return {
            ...c,
            ...pericInfo
        };
    });

    // Filtra para contagem global de elegíveis
    const totalElegiveis = listaMapeada.filter(c => c.isPeric);
    const badgeEl = document.getElementById('badgeQtdPericColabs');
    if (badgeEl) badgeEl.textContent = totalElegiveis.length;

    // Atualiza mini KPIs de folha
    let folhaBasePeric = 0;
    let folhaAdicPeric = 0;
    const setoresPericSet = new Set();

    totalElegiveis.forEach(c => {
        folhaBasePeric += c.salBase;
        folhaAdicPeric += c.adicional;
        if (c.setor) setoresPericSet.add(c.setor);
    });

    const elKpiTotal = document.getElementById('kpiColabPericTotal');
    const elKpiSetores = document.getElementById('kpiColabPericSetores');
    const elKpiFolhaBase = document.getElementById('kpiColabPericFolhaBase');
    const elKpiFolhaAdic = document.getElementById('kpiColabPericFolhaAdicional');

    if (elKpiTotal) elKpiTotal.textContent = `${totalElegiveis.length} colaboradores`;
    if (elKpiSetores) elKpiSetores.textContent = Array.from(setoresPericSet).slice(0, 3).join(', ');
    if (elKpiFolhaBase) elKpiFolhaBase.textContent = folhaBasePeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (elKpiFolhaAdic) elKpiFolhaAdic.textContent = folhaAdicPeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Aplica filtros de exibição da tabela
    let filtrados = listaMapeada.filter(c => {
        if (filtroStatus === 'periculoso' && !c.isPeric) return false;
        if (filtroStatus === 'nao_periculoso' && c.isPeric) return false;

        if (filtroSetor) {
            const s = (c.setor || '').toUpperCase();
            if (!s.includes(filtroSetor)) return false;
        }

        if (search) {
            const haystack = [c.id, c.nome, c.funcao, c.setor, c.ghe, c.anexo].map(x => (x || '').toLowerCase()).join(' ');
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    // Ordenar: Periculosos primeiro, depois por setor e nome
    filtrados.sort((a, b) => {
        if (a.isPeric !== b.isPeric) return b.isPeric ? -1 : 1;
        const compSetor = (a.setor || '').localeCompare(b.setor || '');
        if (compSetor !== 0) return compSetor;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-light);">
                Nenhum colaborador encontrado com os filtros selecionados.
            </div>`;
        return;
    }

    let html = `
        <table class="db-table" style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
            <thead>
                <tr style="background: var(--bg); border-bottom: 2px solid var(--border); text-align: left;">
                    <th style="padding: 9px 12px; width: 65px; text-align: center;">Matrícula</th>
                    <th style="padding: 9px 12px; min-width: 220px;">Colaborador</th>
                    <th style="padding: 9px 12px; min-width: 180px;">Função / Cargo</th>
                    <th style="padding: 9px 12px; min-width: 160px;">Setor / Lotação</th>
                    <th style="padding: 9px 12px; width: 70px; text-align: center;">GHE</th>
                    <th style="padding: 9px 12px; min-width: 170px;">Anexo NR-16</th>
                    <th style="padding: 9px 12px; min-width: 200px;">Justificativa Operacional</th>
                    <th style="padding: 9px 12px; text-align: right; width: 110px;">Salário Base</th>
                    <th style="padding: 9px 12px; text-align: right; width: 110px;">Adicional (30%)</th>
                    <th style="padding: 9px 12px; text-align: center; width: 140px;">Status Folha</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach(c => {
        const badgeStatus = c.isPeric
            ? `<span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #f87171;">
                 ⚡ 30% DEVIDO
               </span>`
            : `<span style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #86efac;">
                 🛡️ INDEVIDO (0%)
               </span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border); ${c.isPeric ? 'background: rgba(239, 68, 68, 0.03);' : ''}">
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: var(--text-light);">
                    ${c.id || '-'}
                </td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 700; color: var(--text-primary);">${c.nome || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 1px;">Admissão: ${c.dt_admissao ? formatSimpleDate(c.dt_admissao) : 'Ativo'}</div>
                </td>
                <td style="padding: 10px 12px;">
                    <div style="font-weight: 600; color: var(--text-primary);">${c.funcao || '-'}</div>
                </td>
                <td style="padding: 10px 12px;">
                    <div style="color: var(--text-primary);">${c.setor || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 1px;">📍 ${c.localTrabalho}</div>
                </td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">
                    ${c.ghe || '-'}
                </td>
                <td style="padding: 10px 12px;">
                    <span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; ${c.isPeric ? 'background: rgba(220, 38, 38, 0.1); color: #dc2626;' : 'background: var(--bg); color: var(--text-light);'}">
                        ${c.anexo}
                    </span>
                </td>
                <td style="padding: 10px 12px; font-size: 11px; color: var(--text-primary); max-width: 260px;" title="${c.motivo}">
                    ${c.motivo}
                </td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-primary);">
                    ${c.salBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${c.isPeric ? '#dc2626' : 'var(--text-light)'};">
                    ${c.adicional > 0 ? c.adicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${badgeStatus}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function exportarRelacaoNominalPericulosidadeCSV() {
    const ativos = allEfetivo.filter(c => colaboradorEstaAtivo(c));
    const lista = ativos.map(c => ({
        ...c,
        ...obterClassificacaoPericulosidadeColaborador(c)
    })).filter(c => c.isPeric);

    if (lista.length === 0) {
        alert('Nenhum colaborador elegível à periculosidade encontrado para exportação.');
        return;
    }

    const headers = [
        'Matricula', 'Nome Completo', 'Funcao', 'Setor', 'GHE', 'Local de Trabalho',
        'Anexo NR-16', 'Salario Base (R$)', 'Adicional 30% (R$)', 'Status Periculosidade',
        'Fundamentacao / Justificativa Operacional'
    ];

    const rows = lista.map(c => [
        c.id || '',
        `"${(c.nome || '').replace(/"/g, '""')}"`,
        `"${(c.funcao || '').replace(/"/g, '""')}"`,
        `"${(c.setor || '').replace(/"/g, '""')}"`,
        c.ghe || '',
        `"${(c.localTrabalho || '').replace(/"/g, '""')}"`,
        `"${(c.anexo || '').replace(/"/g, '""')}"`,
        c.salBase.toFixed(2),
        c.adicional.toFixed(2),
        'ELEGIVEL (30%)',
        `"${(c.motivo || '').replace(/"/g, '""')}"`
    ].join(';'));

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relacao_Nominal_Periculosidade_RH_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function imprimirRelacaoNominalPericulosidadeRH() {
    const laudoAtivo = allPericulosidadeLaudos[0] || {
        codigo: 'LP-2026/2027',
        empresa: 'CONSORCIO OPERADOR RAMAL DO AGRESTE',
        cnpj: '55.623.017/0001-97',
        data_inicio: '2026-07-20',
        data_fim: '2027-07-20',
        responsavel_tecnico: 'Eng. João Everton de Souza Limeira',
        registro_profissional: 'CREA: 0522078320-BA'
    };

    const ativos = allEfetivo.filter(c => colaboradorEstaAtivo(c));
    const lista = ativos.map(c => ({
        ...c,
        ...obterClassificacaoPericulosidadeColaborador(c)
    })).filter(c => c.isPeric);

    // Ordena por Setor e Nome
    lista.sort((a, b) => {
        const comp = (a.setor || '').localeCompare(b.setor || '');
        if (comp !== 0) return comp;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    let totalSalBase = 0;
    let totalAdicional = 0;
    let linhasHtml = '';

    lista.forEach((c, idx) => {
        totalSalBase += c.salBase;
        totalAdicional += c.adicional;

        linhasHtml += `
            <tr style="border-bottom: 1px solid #ddd; ${idx % 2 === 0 ? 'background-color: #fdfdfd;' : 'background-color: #fff;'}">
                <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${c.id || '-'}</td>
                <td style="padding: 6px 8px;"><b>${c.nome}</b></td>
                <td style="padding: 6px 8px;">${c.funcao}</td>
                <td style="padding: 6px 8px;">${c.setor}</td>
                <td style="padding: 6px 8px; text-align: center;">${c.ghe || '-'}</td>
                <td style="padding: 6px 8px; font-size: 10px;">${c.anexo}</td>
                <td style="padding: 6px 8px; text-align: right;">${c.salBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #dc2626;">${c.adicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="padding: 6px 8px; font-size: 9.5px; color: #444;">${c.motivo}</td>
            </tr>
        `;
    });

    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relação Nominal de Periculosidade - Folha RH - ${laudoAtivo.codigo}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 22px; color: #222; background: #fff; font-size: 10.5pt; line-height: 1.4; }
        .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 15pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 10.5pt; color: #475569; margin-top: 3px; }
        .box-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 16px; font-size: 9.5pt; }
        table.tabela-dados { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
        table.tabela-dados th { background: #0f172a; color: #fff; padding: 6px 6px; text-align: left; font-size: 9pt; }
        table.tabela-dados td { border: 1px solid #cbd5e1; }
        .total-row { background: #fee2e2; font-weight: bold; }
        .total-row td { padding: 8px 6px; border-top: 2px solid #dc2626; font-size: 9.5pt; }
        .assinatura-container { display: flex; justify-content: space-around; margin-top: 45px; page-break-inside: avoid; text-align: center; }
        .assinatura-box { width: 42%; border-top: 1px solid #000; padding-top: 6px; font-size: 9.5pt; }
        @media print {
            body { padding: 10px; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position: fixed; top: 15px; right: 15px; z-index: 99999; background: #fff; padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #ccc;">
        <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ Imprimir Relação / Salvar PDF</button>
    </div>

    <!-- Cabeçalho Oficial com Logo Base64 Padronizado -->
    <table class="header-table">
        <tr>
            <td style="width: 160px; vertical-align: middle;">
                <img src="${LOGO_COP_BASE64}" alt="Consórcio Operador Ramal do Agreste" style="max-height: 55px; max-width: 160px; object-fit: contain;">
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
                <div class="title">Relação Nominal de Beneficiários de Periculosidade (30%)</div>
                <div class="subtitle">Emissão para Lançamento e Conferência de Folha de Pagamento • NR-16 / Art. 193 da CLT</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
                <div style="font-weight: bold; font-size: 10.5pt; color: #0f172a;">${laudoAtivo.codigo}</div>
                <div style="font-size: 9pt; color: #64748b;">Emissão: ${dataEmissao}</div>
            </td>
        </tr>
    </table>

    <div class="box-info">
        <b>Empresa:</b> ${laudoAtivo.empresa} • <b>CNPJ:</b> ${laudoAtivo.cnpj}<br>
        <b>Laudo Técnico Base:</b> ${laudoAtivo.codigo || "LTP-2026/2027"} (Vigência 20/07/2026 a 20/07/2027) • <b>Resp. Técnico:</b> ${laudoAtivo.responsavel_tecnico} (${laudoAtivo.registro_profissional})<br>
        <b>Observação Técnica:</b> Inclui o Grupo 10 (Operação de Sistemas Hídricos) e o Grupo 26 (Conservação e Limpeza de Subestação e Faixa de Servidão de Linha de Transmissão LT 69 kV) por atuação em Zonas de Risco e Controlada de Sistemas Elétricos de Potência (SEP) energizados, conforme Anexo 4 da NR-16.
    </div>

    <table class="tabela-dados">
        <thead>
            <tr>
                <th style="width: 35px; text-align: center;">Mat.</th>
                <th>Colaborador</th>
                <th>Função / Cargo</th>
                <th>Setor de Lotação</th>
                <th style="width: 35px; text-align: center;">GHE</th>
                <th>Anexo NR-16</th>
                <th style="width: 85px; text-align: right;">Salário Base</th>
                <th style="width: 85px; text-align: right;">Adic. 30%</th>
                <th>Justificativa do Enquadramento</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml}
            <tr class="total-row">
                <td colspan="6" style="text-align: right; padding-right: 10px;">TOTAIS ESTIMADOS (${lista.length} COLABORADORES):</td>
                <td style="text-align: right;">${totalSalBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td style="text-align: right; color: #dc2626;">${totalAdicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>Adicional de 30% incidente sobre salário-base</td>
            </tr>
        </tbody>
    </table>

    <div class="assinatura-container">
        <div class="assinatura-box">
            <b>${laudoAtivo.responsavel_tecnico}</b><br>
            Engenheiro de Segurança do Trabalho<br>
            ${laudoAtivo.registro_profissional}
        </div>
        <div class="assinatura-box">
            <b>Departamento de Pessoal / Recursos Humanos</b><br>
            Consórcio Operador Ramal do Agreste<br>
            Conferência e Lançamento em Folha
        </div>
    </div>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Relacao_Nominal_Periculosidade_${laudoAtivo.codigo}`);
}

function abrirModalNovaAnalisePericulosidade() {
    analisePericEditandoId = null;
    const modal = document.getElementById('modalPericulosidadeAnalise');
    const titulo = document.getElementById('modalPericTitulo');
    if (titulo) titulo.textContent = '⚡ Nova Avaliação Técnica de Função (NR-16)';

    document.getElementById('pericForm_id').value = '';
    document.getElementById('pericForm_setor').value = '';
    document.getElementById('pericForm_posto').value = '';
    document.getElementById('pericForm_cargo').value = '';
    document.getElementById('pericForm_cbo').value = '';
    document.getElementById('pericForm_ghe').value = '';
    document.getElementById('pericForm_numTrab').value = '1';
    document.getElementById('pericForm_anexo').value = 'Nenhum / Não Aplicável';
    document.getElementById('pericForm_agente').value = 'Não Aplicável';
    document.getElementById('pericForm_tempo').value = 'Inexistente';
    document.getElementById('pericForm_atividade').value = '';
    document.getElementById('pericForm_areaRisco').value = 'Não há penetração em área de risco.';
    document.getElementById('pericForm_caracterizacao').checked = false;
    document.getElementById('pericForm_salario').value = '2500.00';
    document.getElementById('pericForm_fundamentacao').value = 'Art. 193 da CLT e Norma Regulamentadora nº 16 (NR-16).';
    document.getElementById('pericForm_parecer').value = 'DESCARACTERIZADA A PERICULOSIDADE. As atividades desempenhadas não se enquadram nos Anexos da NR-16.';

    if (modal) {
        modal.style.display = 'flex';
    }
}

function editarAnalisePericulosidade(id) {
    const item = allPericulosidadeAnalises.find(x => x.id === id);
    if (!item) return;

    analisePericEditandoId = id;
    const modal = document.getElementById('modalPericulosidadeAnalise');
    const titulo = document.getElementById('modalPericTitulo');
    if (titulo) titulo.textContent = `⚡ Editar Análise: ${item.cargo_funcao || item.setor}`;

    document.getElementById('pericForm_id').value = item.id;
    document.getElementById('pericForm_setor').value = item.setor || '';
    document.getElementById('pericForm_posto').value = item.posto_trabalho || '';
    document.getElementById('pericForm_cargo').value = item.cargo_funcao || '';
    document.getElementById('pericForm_cbo').value = item.cbo || '';
    document.getElementById('pericForm_ghe').value = item.ghe || '';
    document.getElementById('pericForm_numTrab').value = item.num_trabalhadores || 1;
    document.getElementById('pericForm_anexo').value = item.anexo_nr16 || 'Nenhum / Não Aplicável';
    document.getElementById('pericForm_agente').value = item.agente_periculoso || '';
    document.getElementById('pericForm_tempo').value = item.tempo_exposicao || 'Inexistente';
    document.getElementById('pericForm_atividade').value = item.atividade_descrita || '';
    document.getElementById('pericForm_areaRisco').value = item.delimitacao_area_risco || '';
    document.getElementById('pericForm_caracterizacao').checked = (item.caracterizacao === true || item.caracterizacao === 'true');
    document.getElementById('pericForm_salario').value = item.salario_base_medio || '0';
    document.getElementById('pericForm_fundamentacao').value = item.fundamentacao_legal || '';
    document.getElementById('pericForm_parecer').value = item.parecer_conclusivo || '';

    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModalAnalisePericulosidade() {
    const modal = document.getElementById('modalPericulosidadeAnalise');
    if (modal) modal.style.display = 'none';
}

function aoMudarAnexoPericForm(anexo) {
    const isElet = anexo.includes('Energia Elétrica');
    const isInflam = anexo.includes('Inflamáveis');
    const isPatrim = anexo.includes('Segurança Patrimonial');

    const elAgente = document.getElementById('pericForm_agente');
    const elArea = document.getElementById('pericForm_areaRisco');
    const elTempo = document.getElementById('pericForm_tempo');
    const elCaract = document.getElementById('pericForm_caracterizacao');
    const elFund = document.getElementById('pericForm_fundamentacao');
    const elParecer = document.getElementById('pericForm_parecer');

    if (isElet) {
        if (elAgente) elAgente.value = 'Energia Elétrica em Alta Tensão / SEP e Barramentos';
        if (elArea) elArea.value = 'Zonas de Risco e Controladas conforme Tabela da NR-10 e Anexo 4 da NR-16.';
        if (elTempo) elTempo.value = 'Habitual e Intermitente com Risco Potencial Permanente';
        if (elCaract) elCaract.checked = true;
        if (elFund) elFund.value = 'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014) e Súmula 364 do TST.';
        if (elParecer) elParecer.value = 'CARACTERIZADA A PERICULOSIDADE com direito à percepção do adicional de 30% sobre o salário-base.';
    } else if (isInflam) {
        if (elAgente) elAgente.value = 'Líquidos Inflamáveis / Óleo Diesel (Volume > 200L)';
        if (elArea) elArea.value = 'Raio de 7,5 metros com centro nas bocas de carga e bicos de descarga (Quadro 3 do Anexo 2 da NR-16).';
        if (elTempo) elTempo.value = 'Habitual e Intermitente com Risco Potencial Permanente';
        if (elCaract) elCaract.checked = true;
        if (elFund) elFund.value = 'Anexo 2 da NR-16, Item 1, alínea "j" e Item 3, alíneas "q" e "s". Súmula 364 do TST.';
        if (elParecer) elParecer.value = 'CARACTERIZADA A PERICULOSIDADE com direito à percepção do adicional de 30% sobre o salário-base.';
    } else if (isPatrim) {
        if (elAgente) elAgente.value = 'Vigilância Patrimonial Desarmada (Vigia)';
        if (elArea) elArea.value = 'Portarias e guaritas de controle de acesso.';
        if (elTempo) elTempo.value = 'Permanente desarmada';
        if (elCaract) elCaract.checked = false;
        if (elFund) elFund.value = 'O Anexo 3 da NR-16 e a Lei 7.102/83 restringem o adicional a Vigilantes profissionais credenciados na PF. Conforme Tema Repetitivo 16 do TST, a função de Vigia civil desarmado não faz jus ao adicional.';
        if (elParecer) elParecer.value = 'DESCARACTERIZADA A PERICULOSIDADE para a função de Vigia civil desarmado.';
    } else {
        if (elAgente) elAgente.value = 'Não Aplicável';
        if (elArea) elArea.value = 'Não há penetração em área de risco.';
        if (elTempo) elTempo.value = 'Inexistente';
        if (elCaract) elCaract.checked = false;
        if (elFund) elFund.value = 'Art. 193 da CLT e NR-16 do Ministério do Trabalho.';
        if (elParecer) elParecer.value = 'DESCARACTERIZADA A PERICULOSIDADE. Não há exposição a nenhum dos agentes taxativos da NR-16.';
    }
}

function aoAlternarCaracterizacaoPeric(checked) {
    const elParecer = document.getElementById('pericForm_parecer');
    if (!elParecer) return;
    if (checked) {
        elParecer.value = 'CARACTERIZADA A PERICULOSIDADE com direito à percepção do adicional de 30% incidente sobre o salário-base do trabalhador.';
    } else {
        elParecer.value = 'DESCARACTERIZADA A PERICULOSIDADE. As atividades desempenhadas não se enquadram nos anexos da NR-16.';
    }
}

async function salvarAnalisePericulosidade() {
    if (bloquearEdicaoSeNaoAutorizado('periculosidade')) return;
    const setor = (document.getElementById('pericForm_setor')?.value || '').trim();
    const posto = (document.getElementById('pericForm_posto')?.value || '').trim();
    const cargo = (document.getElementById('pericForm_cargo')?.value || '').trim();
    const cbo = (document.getElementById('pericForm_cbo')?.value || '').trim();
    const ghe = (document.getElementById('pericForm_ghe')?.value || '').trim();
    const numTrab = parseInt(document.getElementById('pericForm_numTrab')?.value, 10) || 1;
    const anexo = document.getElementById('pericForm_anexo')?.value || 'Nenhum / Não Aplicável';
    const agente = (document.getElementById('pericForm_agente')?.value || '').trim();
    const tempo = document.getElementById('pericForm_tempo')?.value || 'Inexistente';
    const atividade = (document.getElementById('pericForm_atividade')?.value || '').trim();
    const areaRisco = (document.getElementById('pericForm_areaRisco')?.value || '').trim();
    const caracterizacao = document.getElementById('pericForm_caracterizacao')?.checked === true;
    const salario = parseFloat(document.getElementById('pericForm_salario')?.value) || 0;
    const fundamentacao = (document.getElementById('pericForm_fundamentacao')?.value || '').trim();
    const parecer = (document.getElementById('pericForm_parecer')?.value || '').trim();

    if (!setor || !posto || !cargo || !atividade || !agente || !areaRisco) {
        alert('Por favor, preencha todos os campos obrigatórios marcados com asterisco (*).');
        return;
    }

    const laudoAtivo = allPericulosidadeLaudos[0];
    const laudoId = laudoAtivo ? laudoAtivo.id : 'LP_2026_2027';

    const payload = {
        laudo_id: laudoId,
        setor,
        posto_trabalho: posto,
        cargo_funcao: cargo,
        cbo,
        ghe,
        num_trabalhadores: numTrab,
        anexo_nr16: anexo,
        agente_periculoso: agente,
        delimitacao_area_risco: areaRisco,
        tempo_exposicao: tempo,
        caracterizacao,
        percentual_adicional: caracterizacao ? 30.00 : 0.00,
        salario_base_medio: salario,
        fundamentacao_legal: fundamentacao,
        parecer_conclusivo: parecer
    };

    try {
        if (analisePericEditandoId) {
            payload.id = analisePericEditandoId;
            await supabaseUpdate('periculosidade_analises', payload, `id=eq.${analisePericEditandoId}`);
            const idx = allPericulosidadeAnalises.findIndex(x => x.id === analisePericEditandoId);
            if (idx >= 0) allPericulosidadeAnalises[idx] = { ...allPericulosidadeAnalises[idx], ...payload };
        } else {
            const newId = 'PERIC_' + Date.now();
            payload.id = newId;
            await supabaseInsert('periculosidade_analises', payload);
            allPericulosidadeAnalises.push(payload);
        }

        fecharModalAnalisePericulosidade();
        renderPericulosidadePanel();
        mostrarFeedbackToast('Avaliação técnica salva com sucesso!', 'sucesso');
    } catch (err) {
        console.error('Erro ao salvar análise de periculosidade:', err);
        alert('Erro ao salvar no banco de dados. Verifique a conexão.');
    }
}

async function excluirAnalisePericulosidade(id) {
    if (bloquearEdicaoSeNaoAutorizado('periculosidade')) return;
    const item = allPericulosidadeAnalises.find(x => x.id === id);
    if (!item) return;

    if (!confirm(`Deseja realmente excluir a avaliação técnica da função "${item.cargo_funcao}" (${item.setor})?`)) {
        return;
    }

    try {
        await supabaseDelete('periculosidade_analises', `id=eq.${id}`);
        allPericulosidadeAnalises = allPericulosidadeAnalises.filter(x => x.id !== id);
        renderPericulosidadePanel();
        mostrarFeedbackToast('Avaliação técnica excluída.', 'info');
    } catch (err) {
        console.error('Erro ao excluir análise:', err);
        alert('Erro ao excluir avaliação técnica.');
    }
}

function verFundamentacaoPericulosidade(id) {
    const item = allPericulosidadeAnalises.find(x => x.id === id);
    if (!item) return;

    const modal = document.getElementById('modalPericulosidadeFundamentacao');
    const titulo = document.getElementById('modalFundTitulo');
    const conteudo = document.getElementById('modalFundConteudo');

    if (titulo) titulo.innerHTML = `<span>⚡</span> Parecer Técnico de Caracterização: <b>${item.cargo_funcao}</b>`;

    const isPeric = (item.caracterizacao === true || item.caracterizacao === 'true');
    const statusBox = isPeric
        ? `<div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
             <b style="color: #dc2626; font-size: 13.5px;">⚡ ENQUADRAMENTO FAVORÁVEL À PERICULOSIDADE (Adicional de 30%)</b>
             <div style="font-size: 12px; color: #7f1d1d; margin-top: 4px;">Esta função faz jus à percepção do adicional de periculosidade incidente sobre o salário-base.</div>
           </div>`
        : `<div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
             <b style="color: #16a34a; font-size: 13.5px;">🛡️ DESCARACTERIZADA A PERICULOSIDADE (Adicional Indevido)</b>
             <div style="font-size: 12px; color: #14532d; margin-top: 4px;">Não há respaldo legal ou técnico para concessão do adicional nos termos da NR-16.</div>
           </div>`;

    if (conteudo) {
        conteudo.innerHTML = `
            ${statusBox}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; background: var(--bg); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
                <div><b>Setor / Grupo:</b> ${item.setor || '-'}</div>
                <div><b>Posto de Trabalho:</b> ${item.posto_trabalho || '-'}</div>
                <div><b>CBO:</b> ${item.cbo || '-'}</div>
                <div><b>GHE:</b> ${item.ghe || '-'}</div>
                <div><b>Nº Colaboradores:</b> ${item.num_trabalhadores || 1}</div>
                <div><b>Anexo da NR-16:</b> ${item.anexo_nr16 || 'Nenhum'}</div>
            </div>

            <div style="margin-bottom: 10px;">
                <b style="color: var(--text-primary); font-size: 12.5px;">🛠️ Descrição Real da Atividade no Canteiro:</b>
                <div style="background: var(--card-bg, #fff); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; margin-top: 4px;">
                    ${item.atividade_descrita || 'Não informada'}
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <b style="color: var(--text-primary); font-size: 12.5px;">📐 Delimitação Técnica da Área de Risco:</b>
                <div style="background: var(--card-bg, #fff); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; margin-top: 4px;">
                    ${item.delimitacao_area_risco || 'Não aplicável'}
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <b style="color: var(--text-primary); font-size: 12.5px;">⏱️ Frequência e Regime de Exposição:</b>
                <div style="background: var(--card-bg, #fff); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; margin-top: 4px;">
                    ${item.tempo_exposicao || 'Não informada'}
                </div>
            </div>

            <div style="margin-bottom: 10px;">
                <b style="color: var(--text-primary); font-size: 12.5px;">⚖️ Fundamentação Legal e Jurisprudencial:</b>
                <div style="background: var(--card-bg, #fff); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; margin-top: 4px; color: var(--text-primary);">
                    ${item.fundamentacao_legal || 'Art. 193 da CLT e NR-16.'}
                </div>
            </div>

            <div>
                <b style="color: var(--text-primary); font-size: 12.5px;">👨‍💼 Parecer Conclusivo da Engenharia de Segurança:</b>
                <div style="background: var(--bg); border: 1px solid var(--border); padding: 10px; border-radius: 6px; margin-top: 4px; font-weight: 600;">
                    ${item.parecer_conclusivo || 'Conclusão registrada pelo responsável técnico.'}
                </div>
            </div>
        `;
    }

    if (modal) modal.style.display = 'flex';
}

function fecharModalFundamentacaoPericulosidade() {
    const modal = document.getElementById('modalPericulosidadeFundamentacao');
    if (modal) modal.style.display = 'none';
}

function emitirLaudoOficialPericulosidade() {
    const laudoAtivo = allPericulosidadeLaudos[0] || {
        codigo: 'LP-2026/2027',
        empresa: 'CONSORCIO OPERADOR RAMAL DO AGRESTE',
        cnpj: '55.623.017/0001-97',
        data_inicio: '2026-07-20',
        data_fim: '2027-07-20',
        responsavel_tecnico: 'Eng. João Everton de Souza Limeira',
        registro_profissional: 'CREA: 0522078320-BA'
    };

    let totalGeral = 0;
    let totalPeric = 0;
    let totalNaoPeric = 0;
    let impactoMensal = 0;

    allPericulosidadeAnalises.forEach(item => {
        const n = parseInt(item.num_trabalhadores, 10) || 0;
        totalGeral += n;
        if (item.caracterizacao === true || item.caracterizacao === 'true') {
            totalPeric += n;
            const sal = parseFloat(item.salario_base_medio) || 0;
            impactoMensal += (sal * 0.30) * n;
        } else {
            totalNaoPeric += n;
        }
    });

    const dataIni = laudoAtivo.data_inicio ? laudoAtivo.data_inicio.split('-').reverse().join('/') : '20/07/2026';
    const dataFim = laudoAtivo.data_fim ? laudoAtivo.data_fim.split('-').reverse().join('/') : '20/07/2027';

    // Montagem das linhas de análise pericial
    let linhasTabelaHtml = '';
    allPericulosidadeAnalises.forEach((row, idx) => {
        const isPeric = (row.caracterizacao === true || row.caracterizacao === 'true');
        linhasTabelaHtml += `
            <tr style="border-bottom: 1px solid #ddd; ${isPeric ? 'background-color: #fef2f2;' : (idx % 2 === 0 ? 'background-color: #fcfcfc;' : '')}">
                <td style="padding: 7px 8px; font-weight: bold; text-align: center;">${row.grupo_numero ? 'G' + String(row.grupo_numero).padStart(2, '0') : idx + 1}</td>
                <td style="padding: 7px 8px;">
                    <b>${row.cargo_funcao}</b><br>
                    <span style="font-size: 10px; color: #555;">Setor: ${row.setor} | Posto: ${row.posto_trabalho}</span><br>
                    <span style="font-size: 10px; color: #666;">CBO: ${row.cbo || '-'} | GHE: ${row.ghe || '-'}</span>
                </td>
                <td style="padding: 7px 8px; text-align: center; font-weight: bold;">${row.num_trabalhadores}</td>
                <td style="padding: 7px 8px; font-size: 10.5px;">${row.anexo_nr16}</td>
                <td style="padding: 7px 8px; font-size: 10px;">
                    <b>${row.agente_periculoso}</b><br>
                    <span style="color: #444;">Área: ${row.delimitacao_area_risco}</span>
                </td>
                <td style="padding: 7px 8px; font-size: 10px; text-align: center;">${row.tempo_exposicao}</td>
                <td style="padding: 7px 8px; text-align: center;">
                    ${isPeric
                        ? '<span style="background: #dc2626; color: #fff; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">PERICULOSO (+30%)</span>'
                        : '<span style="background: #16a34a; color: #fff; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">NÃO PERICULOSO</span>'
                    }
                </td>
                <td style="padding: 7px 8px; font-size: 10px; color: #333;">
                    ${row.fundamentacao_legal}
                </td>
            </tr>
        `;
    });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Laudo Técnico de Periculosidade - ${laudoAtivo.codigo}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; margin: 0; padding: 25px; color: #222; background: #fff; font-size: 11pt; line-height: 1.5; }
        .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
        .title { font-size: 18pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0; }
        .subtitle { font-size: 11pt; color: #475569; margin-top: 4px; }
        .box-info { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 18px; }
        .box-info table { width: 100%; font-size: 10pt; }
        .box-info td { padding: 4px 6px; }
        h2 { font-size: 13pt; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-top: 24px; margin-bottom: 10px; text-transform: uppercase; }
        h3 { font-size: 11pt; color: #1e293b; margin-top: 14px; margin-bottom: 6px; }
        p { margin: 6px 0; text-align: justify; }
        table.tabela-dados { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5pt; }
        table.tabela-dados th { background: #0f172a; color: #fff; padding: 7px 6px; text-align: left; font-size: 9.5pt; }
        table.tabela-dados td { border: 1px solid #cbd5e1; }
        .kpi-row { display: flex; gap: 12px; margin: 15px 0; }
        .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; }
        .kpi-box .val { font-size: 16pt; font-weight: bold; margin-bottom: 2px; }
        .kpi-box .rot { font-size: 8.5pt; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .assinatura-container { display: flex; justify-content: space-around; margin-top: 50px; page-break-inside: avoid; text-align: center; }
        .assinatura-box { width: 40%; border-top: 1px solid #000; padding-top: 8px; font-size: 10pt; }
        @media print {
            body { padding: 10px; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="position: fixed; top: 15px; right: 15px; z-index: 99999; background: #fff; padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #ccc;">
        <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ Imprimir Laudo / Salvar PDF</button>
    </div>

    <!-- Cabeçalho Oficial com Logo Base64 Padronizado -->
    <table class="header-table">
        <tr>
            <td style="width: 160px; vertical-align: middle;">
                <img src="${LOGO_COP_BASE64}" alt="Consórcio Operador Ramal do Agreste" style="max-height: 55px; max-width: 160px; object-fit: contain;">
            </td>
            <td style="vertical-align: middle; padding-left: 14px;">
                <div class="title">Laudo Técnico de Periculosidade (LTP - NR-16)</div>
                <div class="subtitle">Norma Regulamentadora nº 16 (NR-16) • Artigos 193 e 195 da Consolidação das Leis do Trabalho (CLT)</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
                <div style="font-weight: bold; font-size: 11pt; color: #0f172a;">${laudoAtivo.codigo}</div>
                <div style="font-size: 9.5pt; color: #64748b;">Vigência: ${dataIni} a ${dataFim}</div>
            </td>
        </tr>
    </table>

    <!-- Quadro 1: Identificação Cadastral da Empresa -->
    <div class="box-info">
        <table>
            <tr>
                <td style="width: 50%;"><b>Razão Social:</b> ${laudoAtivo.empresa}</td>
                <td><b>CNPJ:</b> ${laudoAtivo.cnpj}</td>
            </tr>
            <tr>
                <td><b>Atividade Principal:</b> Obras de Infraestrutura Hídrica / Canais e Estações de Bombeamento</td>
                <td><b>CNAE:</b> 7112-0/00 • <b>Grau de Risco:</b> 1</td>
            </tr>
            <tr>
                <td><b>Local de Trabalho / Canteiro:</b> Lote do Ramal do Agreste • Arcoverde - PE</td>
                <td><b>Efetivo Total Mapeado:</b> ${totalGeral} trabalhadores</td>
            </tr>
        </table>
    </div>

    <h2>1. Responsabilidade Técnica e Habilitação Legal</h2>
    <p>
        O presente Laudo Técnico de Periculosidade foi elaborado pelo Engenheiro de Segurança do Trabalho
        <b>${laudoAtivo.responsavel_tecnico}</b>, registrado no Conselho Regional de Engenharia e Agronomia sob o número
        <b>${laudoAtivo.registro_profissional}</b>, em estrito cumprimento ao disposto no <b>Artigo 195 da Consolidação das Leis do Trabalho (CLT)</b>
        e no item 16.3 da Norma Regulamentadora nº 16 do Ministério do Trabalho e Emprego (MTE).
    </p>

    <h2>2. Objetivo e Escopo da Avaliação Técnica</h2>
    <p>
        Este laudo técnico tem como objetivo precípuo a identificação, o reconhecimento e a análise das atividades e operações desenvolvidas
        no canteiro de obras e instalações operacionais do Consórcio Operador Ramal do Agreste, com vistas à <b>caracterização ou descaracterização
        do adicional de periculosidade de 30% (trinta por cento)</b> incidente sobre o salário-base dos colaboradores, conforme preconizado no
        artigo 193 da CLT e nos Anexos aplicáveis da NR-16.
    </p>

    <h2>3. Metodologia e Critérios Técnicos Rigorosos da NR-16</h2>
    <p>
        Diferentemente de laudos genéricos e automatizados, a presente perícia seguiu a taxatividade legal da NR-16, avaliando
        rigorosamente o contato físico e a permanência dos trabalhadores nas áreas de risco definidas pelos seguintes Anexos:
    </p>
    <ul>
        <li><b>Anexo 1 (Explosivos):</b> Descaracterizado no canteiro. Não há estocagem ou detonações ativas na fase atual.</li>
        <li><b>Anexo 2 (Inflamáveis):</b> Caracterizado para a operação e condução do Caminhão Comboio (transporte e abastecimento com tanques de óleo diesel com volume superior a 200 litros em bacia/área de risco de raio de 7,5 metros). Descaracterizado para pequenos volumes manuais (< 5L) de roçadeiras conforme Item 4 do Anexo 2.</li>
        <li><b>Anexo 3 (Segurança Pessoal/Patrimonial):</b> Descaracterizado para os Vigias de portaria desarmados. Conforme a Portaria MTE nº 1.885/2013 e o Incidente de Recursos Repetitivos (Tema 16) do Tribunal Superior do Trabalho (TST), o adicional é privativo dos profissionais enquadrados formalmente na Lei Federal nº 7.102/83 (Vigilantes formados).</li>
        <li><b>Anexo 4 (Energia Elétrica / SEP):</b> Caracterizado para os Técnicos de Manutenção Elétrica, Analistas Elétricos e Operadores de Subestação de Alta Tensão nas Estações de Bombeamento. Adicionalmente, inclui-se os integrantes do <b>Grupo 10 (Operação de Sistemas Hídricos)</b> por permanência na Estação de Bombeamento em proximidade com painéis de força elétricos, e os integrantes do <b>Grupo 26 (Conservação e Limpeza de Subestação e Faixa de Servidão)</b>, que executam roço, poda e remoção de vegetação sob a Linha de Transmissão de Alta Tensão (LT 69 kV) e áreas periféricas da Subestação, expostos ao risco crítico de choque elétrico por aproximação ou indução magnética no Sistema Elétrico de Potência (SEP) energizado.</li>
        <li><b>Anexo 5 (Motocicleta):</b> Descaracterizado. A empresa não utiliza deslocamento em motocicleta como atividade-fim laboral.</li>
    </ul>

    <h2>4. Resumo Executivo e Impacto Financeiro em Folha de Pagamento</h2>
    <div class="kpi-row">
        <div class="kpi-box">
            <div class="val" style="color: #0f172a;">${totalGeral}</div>
            <div class="rot">Total de Trabalhadores</div>
        </div>
        <div class="kpi-box">
            <div class="val" style="color: #dc2626;">${totalPeric}</div>
            <div class="rot">Com Periculosidade (30%)</div>
        </div>
        <div class="kpi-box">
            <div class="val" style="color: #16a34a;">${totalNaoPeric}</div>
            <div class="rot">Descaracterizados (0%)</div>
        </div>
        <div class="kpi-box">
            <div class="val" style="color: #7c3aed;">${impactoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            <div class="rot">Impacto Estimado / Mês</div>
        </div>
    </div>

    <h2>5. Matriz de Caracterização Consolidada por Função e Posto de Trabalho</h2>
    <table class="tabela-dados">
        <thead>
            <tr>
                <th style="width: 35px; text-align: center;">Gr.</th>
                <th>Função / Setor / Posto</th>
                <th style="width: 35px; text-align: center;">Ef.</th>
                <th>Anexo NR-16</th>
                <th>Agente Periculoso / Delimitação</th>
                <th style="width: 70px; text-align: center;">Exposição</th>
                <th style="width: 95px; text-align: center;">Conclusão</th>
                <th>Fundamentação Técnica</th>
            </tr>
        </thead>
        <tbody>
            ${linhasTabelaHtml}
        </tbody>
    </table>

    <h2>6. Recomendações Técnicas e Preventivas da Engenharia</h2>
    <ol style="padding-left: 20px; font-size: 10pt;">
        <li><b>Bloqueio e Etiquetagem (LOTO - NR-10):</b> Manter o rigoroso procedimento de desenergização e impedimento mecânico antes de qualquer intervenção da equipe mecânica nos conjuntos motobombas, garantindo a descaracterização do risco elétrico para esses profissionais.</li>
        <li><b>Prontuário das Instalações Elétricas (PIE):</b> Manter atualizados os esquemas unifilares das subestações e laudos de aterramento e SPDA de todas as Estações de Bombeamento.</li>
        <li><b>Faixa de Servidão de Linha de Transmissão (LT 69 kV - Grupo 26):</b> Garantir treinamento obrigatório em NR-10 (Básico e Complementar SEP) para a equipe de conservação e roço; assegurar distâncias mínimas de segurança em relação aos cabos condutores de alta tensão; exigir uso obrigatório de perneiras de proteção contra animais peçonhentos (cobras, escorpiões) e óculos/protetor facial contra partículas volantes de roçadeiras motorizadas.</li>
        <li><b>Caminhão Comboio:</b> Fiscalizar a certificação INMETRO do tanque de combustível, aterramento prévio durante descargas e porte obrigatório do curso MOPP pelo motorista operador.</li>
        <li><b>Gestão da Folha de Pagamento:</b> Efetuar o pagamento do adicional de periculosidade de 30% estritamente sobre o salário-base aos profissionais caracterizados nos Grupos de Operação Hídrica (G10/G25), Manutenção Elétrica, Conservação de Faixa de Servidão (G26) e Abastecimento, sem inclusão de gratificações conforme art. 193, §1º da CLT.</li>
    </ol>

    <h2>7. Termo de Encerramento e Responsabilidade Técnica</h2>
    <p>
        O presente Laudo Técnico de Periculosidade é composto por dados fidedignos e inspeções presenciais realizadas nas frentes
        de trabalho do Consórcio Operador Ramal do Agreste. As conclusões periciais ora firmadas refletem fielmente as condições laborais
        encontradas, possuindo validade até <b>${dataFim}</b> ou enquanto perdurarem as atuais condições de operação.
    </p>

    <div class="assinatura-container">
        <div class="assinatura-box">
            <b>${laudoAtivo.responsavel_tecnico}</b><br>
            Engenheiro de Segurança do Trabalho<br>
            ${laudoAtivo.registro_profissional}
        </div>
        <div class="assinatura-box">
            <b>${laudoAtivo.empresa}</b><br>
            Representante Legal do Consórcio<br>
            CNPJ: ${laudoAtivo.cnpj}
        </div>
    </div>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `Laudo_Periculosidade_${laudoAtivo.codigo}`);
}

function exportarMatrizPericulosidade() {
    if (!allPericulosidadeAnalises || allPericulosidadeAnalises.length === 0) {
        alert('Não há dados de periculosidade para exportar.');
        return;
    }

    const headers = [
        'Grupo', 'Setor', 'Posto de Trabalho', 'Funcao', 'CBO', 'GHE',
        'Numero de Trabalhadores', 'Anexo NR-16', 'Agente Periculoso',
        'Delimitacao Area de Risco', 'Exposicao', 'Caracterizacao Periculosidade',
        'Percentual Adicional (%)', 'Salario Base Medio (R$)',
        'Impacto Adicional Mensal (R$)', 'Fundamentacao Legal', 'Parecer Conclusivo'
    ];

    const rows = allPericulosidadeAnalises.map(item => {
        const isPeric = (item.caracterizacao === true || item.caracterizacao === 'true');
        const n = parseInt(item.num_trabalhadores, 10) || 0;
        const sal = parseFloat(item.salario_base_medio) || 0;
        const impacto = isPeric ? (sal * 0.30) * n : 0;

        return [
            item.grupo_numero ? 'Grupo ' + item.grupo_numero : '',
            `"${(item.setor || '').replace(/"/g, '""')}"`,
            `"${(item.posto_trabalho || '').replace(/"/g, '""')}"`,
            `"${(item.cargo_funcao || '').replace(/"/g, '""')}"`,
            `"${(item.cbo || '').replace(/"/g, '""')}"`,
            `"${(item.ghe || '').replace(/"/g, '""')}"`,
            n,
            `"${(item.anexo_nr16 || '').replace(/"/g, '""')}"`,
            `"${(item.agente_periculoso || '').replace(/"/g, '""')}"`,
            `"${(item.delimitacao_area_risco || '').replace(/"/g, '""')}"`,
            `"${(item.tempo_exposicao || '').replace(/"/g, '""')}"`,
            isPeric ? 'PERICULOSO' : 'NAO PERICULOSO',
            isPeric ? '30.00' : '0.00',
            sal.toFixed(2),
            impacto.toFixed(2),
            `"${(item.fundamentacao_legal || '').replace(/"/g, '""')}"`,
            `"${(item.parecer_conclusivo || '').replace(/"/g, '""')}"`
        ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Matriz_Periculosidade_NR16_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}





// ==============================================================================
// MÓDULO: CENTRAL INTEGRADA DE AÇÕES 5W2H DO PGR (NR-01 / GRO)
// Consórcio Operador do PISF — Ramal do Agreste (COP Ramal)
// Unifica não conformidades de checklists, extintores, relatos de problemas,
// ergonomia (NR-17), CIPA (NR-05), acidentes e inspeções em uma matriz 5W2H corporativa.
// ==============================================================================

var allPlanoAcaoPgr = [];
var planoAcaoPgrLoaded = false;
var planoAcaoSubtabAtual = 'tabela'; // 'tabela' | 'kanban' | 'scanner'
var scannerDesviosCache = [];

function formatarDataLocal(d) {
    if (!d) return '—';
    if (typeof d === 'string') return formatSimpleDate(d);
    try {
        return d.toLocaleDateString('pt-BR');
    } catch (e) {
        return String(d);
    }
}

/**
 * Carrega todas as ações do PGR do Supabase
 */
async function loadPlanoAcaoPgrData() {
    setStatus('Carregando ações 5W2H do PGR...');
    try {
        const rows = await supabaseFetch('pgr_plano_acao', '?select=*&order=created_at.desc');
        allPlanoAcaoPgr = Array.isArray(rows) ? rows : [];
        atualizarKpisPlanoAcaoPgr();
        renderPlanoAcaoPgrVisaoAtual();
        setStatus('Plano de Ação do PGR atualizado às ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
        console.error('Erro ao carregar ações do PGR:', e);
        setStatus('⚠️ Falha ao carregar ações do PGR: ' + e.message);
    }
}

/**
 * Alterna entre as sub-abas do módulo de Plano de Ação
 */
function showPlanoAcaoSubtab(subtab) {
    planoAcaoSubtabAtual = subtab;

    // Atualiza botões
    const btnTabela = document.getElementById('planoAcaoSubtabBtn-tabela');
    const btnKanban = document.getElementById('planoAcaoSubtabBtn-kanban');
    const btnScanner = document.getElementById('planoAcaoSubtabBtn-scanner');

    if (btnTabela) btnTabela.classList.toggle('active', subtab === 'tabela');
    if (btnKanban) btnKanban.classList.toggle('active', subtab === 'kanban');
    if (btnScanner) btnScanner.classList.toggle('active', subtab === 'scanner');

    // Atualiza visibilidade dos containers
    const tabTabela = document.getElementById('planoAcaoSubtab-tabela');
    const tabKanban = document.getElementById('planoAcaoSubtab-kanban');
    const tabScanner = document.getElementById('planoAcaoSubtab-scanner');

    if (tabTabela) tabTabela.style.display = subtab === 'tabela' ? 'block' : 'none';
    if (tabKanban) tabKanban.style.display = subtab === 'kanban' ? 'block' : 'none';
    if (tabScanner) tabScanner.style.display = subtab === 'scanner' ? 'block' : 'none';

    renderPlanoAcaoPgrVisaoAtual();
}

/**
 * Renderiza a visão ativa no momento
 */
function renderPlanoAcaoPgrVisaoAtual() {
    atualizarKpisPlanoAcaoPgr();
    if (planoAcaoSubtabAtual === 'tabela') {
        renderTabelaPlanoAcaoPgr();
    } else if (planoAcaoSubtabAtual === 'kanban') {
        renderKanbanPlanoAcaoPgr();
    } else if (planoAcaoSubtabAtual === 'scanner') {
        renderScannerPlanoAcaoPgr();
    }
}

/**
 * Calcula e atualiza todos os cartões de KPI do módulo
 */
function atualizarKpisPlanoAcaoPgr() {
    const hojeStr = toISODateLocal(new Date());

    const total = allPlanoAcaoPgr.length;
    let abertas = 0;
    let andamento = 0;
    let vencidas = 0;
    let concluidas = 0;
    let custoTotal = 0;
    let eficazes = 0;

    allPlanoAcaoPgr.forEach(a => {
        const status = (a.status || 'aberta').toLowerCase();
        const prazo = a.when_prazo || '';
        const custo = parseFloat(a.how_much_custo) || 0;
        custoTotal += custo;

        if (status === 'concluida') {
            concluidas++;
            if (a.afericao_eficacia === 'eficaz' || a.afericao_eficacia === 'parcial') {
                eficazes++;
            }
        } else if (status !== 'cancelada') {
            if (prazo && prazo < hojeStr) {
                vencidas++;
            }
            if (status === 'aberta') abertas++;
            else if (status === 'em_andamento' || status === 'validacao') andamento++;
        }
    });

    const taxaEficacia = concluidas > 0 ? Math.round((eficazes / concluidas) * 100) : (total > 0 ? 0 : 100);

    const elTotal = document.getElementById('kpiPgrTotal');
    const elAbertas = document.getElementById('kpiPgrAbertas');
    const elAndamento = document.getElementById('kpiPgrAndamento');
    const elVencidas = document.getElementById('kpiPgrVencidas');
    const elConcluidas = document.getElementById('kpiPgrConcluidas');
    const elEficacia = document.getElementById('kpiPgrEficacia');
    const elCustoTotal = document.getElementById('kpiPgrCustoTotal');

    if (elTotal) elTotal.textContent = total;
    if (elAbertas) elAbertas.textContent = abertas;
    if (elAndamento) elAndamento.textContent = andamento;
    if (elVencidas) {
        elVencidas.textContent = vencidas;
        const cardVenc = document.getElementById('kpiCardPgrVencidas');
        if (cardVenc) {
            if (vencidas > 0) {
                cardVenc.style.background = '#fef2f2';
                cardVenc.style.borderColor = '#ef4444';
            } else {
                cardVenc.style.background = '#ffffff';
                cardVenc.style.borderColor = 'var(--border)';
            }
        }
    }
    if (elConcluidas) elConcluidas.textContent = concluidas;
    if (elEficacia) elEficacia.textContent = taxaEficacia + '%';
    if (elCustoTotal) {
        elCustoTotal.textContent = custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

/**
 * Filtra a lista de ações com base nos campos de busca
 */
function obterAcoesPgrFiltradas() {
    const texto = (document.getElementById('filtroPgrTexto')?.value || '').toLowerCase().trim();
    const statusFiltro = document.getElementById('filtroPgrStatus')?.value || '';
    const origemFiltro = document.getElementById('filtroPgrOrigem')?.value || '';
    const prioFiltro = document.getElementById('filtroPgrPrioridade')?.value || '';
    const hojeStr = toISODateLocal(new Date());

    return allPlanoAcaoPgr.filter(a => {
        // Filtro por texto
        if (texto) {
            const haystack = [
                a.what_acao, a.why_motivo, a.where_local, a.who_responsavel, 
                a.how_metodo, a.origem_rotulo, a.id
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(texto)) return false;
        }

        // Filtro por status
        if (statusFiltro) {
            const st = (a.status || 'aberta').toLowerCase();
            if (statusFiltro === 'vencidas') {
                if (st === 'concluida' || st === 'cancelada') return false;
                if (!a.when_prazo || a.when_prazo >= hojeStr) return false;
            } else if (st !== statusFiltro) {
                return false;
            }
        }

        // Filtro por origem
        if (origemFiltro && (a.origem_tipo || 'manual').toLowerCase() !== origemFiltro.toLowerCase()) {
            return false;
        }

        // Filtro por prioridade
        if (prioFiltro && (a.grau_prioridade || 'media').toLowerCase() !== prioFiltro.toLowerCase()) {
            return false;
        }

        return true;
    });
}

function filtrarPlanoAcaoPgr() {
    renderPlanoAcaoPgrVisaoAtual();
}

function limparFiltrosPlanoAcaoPgr() {
    const t = document.getElementById('filtroPgrTexto');
    const s = document.getElementById('filtroPgrStatus');
    const o = document.getElementById('filtroPgrOrigem');
    const p = document.getElementById('filtroPgrPrioridade');
    if (t) t.value = '';
    if (s) s.value = '';
    if (o) o.value = '';
    if (p) p.value = '';
    renderPlanoAcaoPgrVisaoAtual();
}

/**
 * Renderiza a Matriz 5W2H em formato de tabela
 */
function renderTabelaPlanoAcaoPgr() {
    const tbody = document.getElementById('tabelaPlanoAcaoPgrCorpo');
    if (!tbody) return;

    const lista = obterAcoesPgrFiltradas();
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 35px 20px; color: var(--text-light);"><div style="font-size: 26px; margin-bottom: 6px;">🎯</div><div style="font-weight: 700; font-size: 14px;">Nenhuma ação encontrada</div><div style="font-size: 12px; margin-top: 4px;">Clique em "+ Nova Ação (5W2H)" ou no "Rastreador de Desvios" para registrar.</div></td></tr>';
        return;
    }

    const hojeStr = toISODateLocal(new Date());

    tbody.innerHTML = lista.map((a, idx) => {
        const idSafe = escapeHTML(a.id);
        const codExibicao = 'PA-' + String(idx + 1).padStart(3, '0');
        const prio = (a.grau_prioridade || 'media').toLowerCase();
        const status = (a.status || 'aberta').toLowerCase();
        const prazo = a.when_prazo || '';
        const custo = parseFloat(a.how_much_custo) || 0;

        // Badge de prioridade
        const prioLabels = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
        const prioLabel = prioLabels[prio] || 'Média';
        const badgePrio = `<span class="badge-pgr-prio prio-${prio}">${prioLabel}</span>`;

        // Badge de origem
        const origemConfig = {
            checklist: { icone: '📋', label: 'Checklist' },
            extintor: { icone: '🧯', label: 'Extintor' },
            relato: { icone: '⚠️', label: 'Relato Campo' },
            ergonomia: { icone: '🧘', label: 'Ergonomia NR-17' },
            cipa: { icone: '🤝', label: 'CIPA NR-05' },
            acidente: { icone: '🚑', label: 'Acidente' },
            auditoria: { icone: '🔍', label: 'Auditoria' },
            manual: { icone: '✍️', label: 'PGR Geral' }
        };
        const orig = origemConfig[(a.origem_tipo || 'manual').toLowerCase()] || origemConfig.manual;
        const badgeOrigem = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span class="badge-pgr-origem">${orig.icone} ${orig.label}</span>
                ${a.origem_rotulo ? `<span style="font-size:10.5px; color:var(--text-light); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHTML(a.origem_rotulo)}">${escapeHTML(a.origem_rotulo)}</span>` : ''}
            </div>
        `;

        // Cálculo de status de tempo do prazo
        let badgePrazo = '';
        if (status === 'concluida') {
            const dataFim = a.data_conclusao ? formatarDataLocal(a.data_conclusao) : 'Concluída';
            badgePrazo = `<span class="badge-pgr-dias-ok" style="background:#dcfce7; color:#15803d; border-color:#86efac;">✅ ${dataFim}</span>`;
        } else if (status === 'cancelada') {
            badgePrazo = `<span class="badge-pgr-dias-ok" style="background:#f1f5f9; color:#64748b;">Cancelada</span>`;
        } else if (prazo) {
            const dPrazo = new Date(prazo + 'T12:00:00');
            const dHoje = new Date(hojeStr + 'T12:00:00');
            const diffDias = Math.round((dPrazo - dHoje) / (1000 * 60 * 60 * 24));

            if (diffDias < 0) {
                badgePrazo = `<span class="badge-pgr-dias-vencido" title="Prazo expirado">🚨 Vencida há ${Math.abs(diffDias)}d</span>`;
            } else if (diffDias === 0) {
                badgePrazo = `<span class="badge-pgr-dias-vencido" style="background:#f59e0b;" title="Vence hoje">⏳ Vence hoje</span>`;
            } else {
                badgePrazo = `<span class="badge-pgr-dias-ok">⏳ Restam ${diffDias}d</span>`;
            }
        }

        // Status badge
        const statusConfig = {
            aberta: { label: '📌 Aberta', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
            em_andamento: { label: '⏳ Em Andamento', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
            validacao: { label: '🔍 Validação SESMT', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
            concluida: { label: '✅ Concluída', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
            cancelada: { label: '❌ Cancelada', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' }
        };
        const stConf = statusConfig[status] || statusConfig.aberta;
        const badgeStatus = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; background:${stConf.bg}; color:${stConf.color}; border:1px solid ${stConf.border};">${stConf.label}</span>`;

        // Eficácia NR-01
        let badgeEficacia = '';
        if (a.afericao_eficacia === 'eficaz') {
            badgeEficacia = `<span style="font-size:10px; color:#15803d; font-weight:700; display:block; margin-top:2px;">✨ Eficaz</span>`;
        } else if (a.afericao_eficacia === 'parcial') {
            badgeEficacia = `<span style="font-size:10px; color:#b45309; font-weight:700; display:block; margin-top:2px;">⚠️ Parcial</span>`;
        } else if (a.afericao_eficacia === 'ineficaz') {
            badgeEficacia = `<span style="font-size:10px; color:#b91c1c; font-weight:700; display:block; margin-top:2px;">❌ Ineficaz</span>`;
        }

        return `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 10px 8px; vertical-align: top;">
                    <div style="font-weight: 700; font-size: 11.5px; color: var(--text-light); margin-bottom: 3px;">${codExibicao}</div>
                    ${badgePrio}
                </td>
                <td style="padding: 10px 8px; vertical-align: top;">${badgeOrigem}</td>
                <td style="padding: 10px 8px; vertical-align: top;">
                    <div style="font-weight: 700; color: var(--text); line-height: 1.35;">${escapeHTML(a.what_acao || '')}</div>
                    ${a.evidencia_conclusao ? `<div style="font-size: 11px; color: #0284c7; margin-top: 4px;">📎 ${escapeHTML(a.evidencia_conclusao)}</div>` : ''}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; color: #475569; font-size: 11.5px; line-height: 1.35;">
                    ${escapeHTML(a.why_motivo || '-')}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; font-weight: 600;">
                    ${escapeHTML(a.where_local || '-')}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; font-weight: 600; color: #1e293b;">
                    ${escapeHTML(a.who_responsavel || '-')}
                </td>
                <td style="padding: 10px 8px; vertical-align: top;">
                    <div style="font-weight: 700; font-size: 11.5px; margin-bottom: 3px;">${prazo ? formatarDataLocal(prazo) : '-'}</div>
                    ${badgePrazo}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; color: var(--text-light); font-size: 11.5px; line-height: 1.35;">
                    ${escapeHTML(a.how_metodo || '-')}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; font-weight: 700; color: #475569;">
                    ${custo > 0 ? custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                </td>
                <td style="padding: 10px 8px; vertical-align: top;">
                    ${badgeStatus}
                    ${badgeEficacia}
                </td>
                <td style="padding: 10px 8px; vertical-align: top; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="db-clear-btn" style="padding: 4px 6px; font-size: 11px;" title="Editar Ação" onclick="abrirModalEditarAcaoPgr('${idSafe}')">✏️</button>
                        <button class="db-clear-btn" style="padding: 4px 6px; font-size: 11px; color: #0284c7;" title="Avaliar Eficácia NR-01" onclick="abrirModalEficaciaPgr('${idSafe}')">🔍</button>
                        <button class="db-clear-btn" style="padding: 4px 6px; font-size: 11px; color: var(--danger);" title="Excluir Ação" onclick="excluirAcaoPgr('${idSafe}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Renderiza o Quadro Kanban Interativo
 */
function renderKanbanPlanoAcaoPgr() {
    const lista = obterAcoesPgrFiltradas();
    const hojeStr = toISODateLocal(new Date());

    const containers = {
        aberta: document.getElementById('kanbanContainer-aberta'),
        em_andamento: document.getElementById('kanbanContainer-em_andamento'),
        validacao: document.getElementById('kanbanContainer-validacao'),
        concluida: document.getElementById('kanbanContainer-concluida')
    };

    const counters = {
        aberta: document.getElementById('kanbanCount-aberta'),
        em_andamento: document.getElementById('kanbanCount-em_andamento'),
        validacao: document.getElementById('kanbanCount-validacao'),
        concluida: document.getElementById('kanbanCount-concluida')
    };

    // Limpa containers
    Object.keys(containers).forEach(k => {
        if (containers[k]) containers[k].innerHTML = '';
        if (counters[k]) counters[k].textContent = '0';
    });

    const counts = { aberta: 0, em_andamento: 0, validacao: 0, concluida: 0 };

    lista.forEach(a => {
        let col = (a.status || 'aberta').toLowerCase();
        if (col === 'cancelada') return; // não exibe canceladas no kanban ativo
        if (!containers[col]) col = 'aberta';

        counts[col]++;

        const idSafe = escapeHTML(a.id);
        const prio = (a.grau_prioridade || 'media').toLowerCase();
        const prazo = a.when_prazo || '';

        // Alerta de prazo
        let tagPrazo = '';
        if (col === 'concluida') {
            tagPrazo = `<span class="badge-pgr-dias-ok" style="background:#dcfce7; color:#15803d;">✅ Concluída</span>`;
        } else if (prazo) {
            const dPrazo = new Date(prazo + 'T12:00:00');
            const dHoje = new Date(hojeStr + 'T12:00:00');
            const diffDias = Math.round((dPrazo - dHoje) / (1000 * 60 * 60 * 24));
            if (diffDias < 0) {
                tagPrazo = `<span class="badge-pgr-dias-vencido">🚨 Venceu há ${Math.abs(diffDias)}d</span>`;
            } else if (diffDias === 0) {
                tagPrazo = `<span class="badge-pgr-dias-vencido" style="background:#f59e0b;">⏳ Vence hoje</span>`;
            } else {
                tagPrazo = `<span class="badge-pgr-dias-ok">⏳ ${diffDias}d restantes</span>`;
            }
        }

        // Botões de avanço rápido no fluxo
        let btnTransicao = '';
        if (col === 'aberta') {
            btnTransicao = `<button class="db-apply-btn" style="padding: 3px 8px; font-size: 11px; background: #d97706;" onclick="event.stopPropagation(); avancarStatusPgrRapido('${idSafe}', 'em_andamento')">Iniciar ➔</button>`;
        } else if (col === 'em_andamento') {
            btnTransicao = `<button class="db-apply-btn" style="padding: 3px 8px; font-size: 11px; background: #0284c7;" onclick="event.stopPropagation(); avancarStatusPgrRapido('${idSafe}', 'validacao')">Enviar Validação ➔</button>`;
        } else if (col === 'validacao') {
            btnTransicao = `<button class="db-apply-btn" style="padding: 3px 8px; font-size: 11px; background: var(--success);" onclick="event.stopPropagation(); abrirModalEficaciaPgr('${idSafe}')">Validar Eficácia ➔</button>`;
        }

        const cardHtml = `
            <div class="kanban-card prio-${prio}" onclick="abrirModalEditarAcaoPgr('${idSafe}')">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">
                    <span class="badge-pgr-origem" style="font-size: 10px; padding: 2px 6px;">${escapeHTML(a.origem_tipo || 'PGR')}</span>
                    <span class="badge-pgr-prio prio-${prio}">${prio.toUpperCase()}</span>
                </div>

                <div class="kanban-card-title">${escapeHTML(a.what_acao || '')}</div>

                <div class="kanban-card-meta">
                    <span>📍 ${escapeHTML(a.where_local || 'Canteiro')}</span>
                    <span>•</span>
                    <span>👤 ${escapeHTML(a.who_responsavel || '-')}</span>
                </div>

                <div class="kanban-card-actions">
                    <div>${tagPrazo}</div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${btnTransicao}
                    </div>
                </div>
            </div>
        `;

        if (containers[col]) containers[col].insertAdjacentHTML('beforeend', cardHtml);
    });

    Object.keys(counts).forEach(k => {
        if (counters[k]) counters[k].textContent = counts[k];
        if (counts[k] === 0 && containers[k]) {
            containers[k].innerHTML = '<div style="text-align: center; color: var(--text-light); font-size: 12px; padding: 30px 10px;">Sem ações nesta coluna</div>';
        }
    });
}

/**
 * Rastreador Inteligente de Desvios (Scanner da Obra)
 * Analisa checklists com NC, extintores vencidos, relatos abertos e acidentes
 */
async function executarScannerDesviosObra() {
    setStatus('Varrendo desvios e não conformidades do canteiro...');
    const hojeStr = toISODateLocal(new Date());

    try {
        if (!allChecklists || allChecklists.length === 0) {
            allChecklists = await supabaseFetch('checklists', '?select=*') || [];
        }
        if (!allExtintores || allExtintores.length === 0) {
            allExtintores = await supabaseFetch('extintores', '?select=*') || [];
        }
        if (!allRelatos || allRelatos.length === 0) {
            allRelatos = await supabaseFetch('relatos', '?select=*') || [];
        }

        const desvios = [];
        const origensJaTratadas = new Set(allPlanoAcaoPgr.map(a => a.origem_id).filter(Boolean));

        let countChk = 0;
        let countExt = 0;
        let countRel = 0;
        let countAcid = 0;

        // 1. Checklists de Veículos e Máquinas com Interdição ou Não Conformidades
        allChecklists.forEach(chk => {
            const status = (chk.status_checklist || '').toLowerCase();
            const ncs = chk.nao_conformes || chk.count_nao_conforme || 0;
            const isInterditado = status === 'interditado';
            const isRestricao = status === 'liberado_restricao';

            if (isInterditado || isRestricao || ncs > 0) {
                countChk++;
                if (!origensJaTratadas.has(chk.id)) {
                    desvios.push({
                        origem_tipo: 'checklist',
                        origem_id: chk.id,
                        origem_rotulo: `${chk.nome || 'Equipamento'} (Placa/Patrimônio: ${chk.patrimonio || 'S/N'})`,
                        prioridade: isInterditado ? 'critica' : (isRestricao ? 'alta' : 'media'),
                        titulo: `Não Conformidade no Checklist - ${chk.nome || 'Equipamento'}`,
                        descricao: chk.observacoes || `Identificadas ${ncs} não conformidade(s) na inspeção pré-operacional diária.`,
                        local: chk.empresa ? `Frente ${chk.empresa}` : 'Canteiro de Obras / Frente Operacional',
                        responsavelSugerido: chk.responsavel || chk.sst || 'Encarregado de Manutenção Mecânica',
                        data: chk.date || chk.data_hora || hojeStr
                    });
                }
            }
        });

        // 2. Extintores com Recarga ou Teste Vencidos
        allExtintores.forEach(ext => {
            const recarga = ext.proxima_recarga || '';
            const teste = ext.proximo_teste_hidrostatico || '';
            const recargaVencida = recarga && recarga < hojeStr;
            const testeVencido = teste && teste < hojeStr;

            if (recargaVencida || testeVencido) {
                countExt++;
                if (!origensJaTratadas.has(ext.id)) {
                    const motivo = recargaVencida && testeVencido 
                        ? 'Validade de Recarga e Teste Hidrostático (5 anos) expirados'
                        : (recargaVencida ? 'Validade da Recarga Anual expirada' : 'Teste Hidrostático Quinquenal expirado');

                    desvios.push({
                        origem_tipo: 'extintor',
                        origem_id: ext.id,
                        origem_rotulo: `Extintor ${ext.id} (${ext.tipo || 'PQS'} ${ext.capacidade || ''})`,
                        prioridade: 'alta',
                        titulo: `Regularização de Extintor de Incêndio - Tag ${ext.id}`,
                        descricao: `${motivo}. Extintor alocado no setor ${ext.setor || 'Canteiro'}. Requer substituição ou envio imediato para empresa credenciada do Inmetro.`,
                        local: `${ext.setor || 'Canteiro'} - ${ext.localizacao || 'Ponto de fixação'}`,
                        responsavelSugerido: 'Técnico de Segurança / Brigada de Incêndio',
                        data: recarga || teste || hojeStr
                    });
                }
            }
        });

        // 3. Relatos de Problemas de Campo em Aberto
        allRelatos.forEach(rel => {
            const st = (rel.status || 'aberto').toLowerCase();
            if (st !== 'resolvido') {
                countRel++;
                if (!origensJaTratadas.has(rel.id)) {
                    desvios.push({
                        origem_tipo: 'relato',
                        origem_id: rel.id,
                        origem_rotulo: `Relato #${rel.id} (${rel.tipo || 'Ocorrência'})`,
                        prioridade: 'media',
                        titulo: `Tratativa de Relato de Campo: ${rel.tipo || 'Problema Reportado'}`,
                        descricao: rel.description || 'Problema apontado por colaborador em campo aguardando providência do SESMT.',
                        local: rel.identificacao || 'Canteiro de Obras / Frentes',
                        responsavelSugerido: rel.reporter || 'SESMT / Supervisão de Campo',
                        data: rel.date || hojeStr
                    });
                }
            }
        });

        // Atualiza contadores do topo do scanner
        const elChk = document.getElementById('countScannerChecklists');
        const elExt = document.getElementById('countScannerExtintores');
        const elRel = document.getElementById('countScannerRelatos');
        const elAcid = document.getElementById('countScannerAcidentes');

        if (elChk) elChk.textContent = countChk;
        if (elExt) elExt.textContent = countExt;
        if (elRel) elRel.textContent = countRel;
        if (elAcid) elAcid.textContent = countAcid;

        scannerDesviosCache = desvios;
        renderScannerPlanoAcaoPgr();
        setStatus('Varredura concluída: ' + desvios.length + ' desvios pendentes de ação 5W2H.');
    } catch (e) {
        console.error('Erro no scanner de desvios:', e);
        setStatus('⚠️ Erro ao varrer desvios: ' + e.message);
    }
}

/**
 * Renderiza a lista de desvios encontrados pelo Scanner
 */
function renderScannerPlanoAcaoPgr() {
    const container = document.getElementById('listaScannerDesviosContainer');
    if (!container) return;

    if (scannerDesviosCache.length === 0) {
        container.innerHTML = '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 25px; text-align: center;"><div style="font-size: 28px; margin-bottom: 6px;">🎉</div><div style="font-weight: 700; color: #166534; font-size: 14px;">Nenhum desvio crítico pendente de plano de ação!</div><div style="font-size: 12px; color: #15803d; margin-top: 4px;">Todos os checklists, extintores e relatos identificados já possuem ações 5W2H vinculadas.</div></div>';
        return;
    }

    container.innerHTML = scannerDesviosCache.map((d) => {
        const dJson = encodeURIComponent(JSON.stringify(d));
        const prioColors = {
            critica: { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
            alta: { border: '#f97316', bg: '#fff7ed', text: '#c2410c' },
            media: { border: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
            baixa: { border: '#10b981', bg: '#f0fdf4', text: '#15803d' }
        };
        const pConf = prioColors[d.prioridade] || prioColors.media;

        return `
            <div style="background: #ffffff; border: 1px solid var(--border); border-left: 6px solid ${pConf.border}; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                <div style="flex: 1; min-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                        <span class="badge-pgr-origem">${escapeHTML(d.origem_tipo.toUpperCase())}</span>
                        <span class="badge-pgr-prio prio-${d.prioridade}">${d.prioridade.toUpperCase()}</span>
                        <span style="font-size: 11px; color: var(--text-light);">Detectado em: ${formatarDataLocal(d.data)}</span>
                    </div>
                    <div style="font-weight: 700; font-size: 13.5px; color: var(--text); margin-bottom: 2px;">
                        ${escapeHTML(d.titulo)}
                    </div>
                    <div style="font-size: 12px; color: #475569; margin-bottom: 4px; line-height: 1.35;">
                        ${escapeHTML(d.descricao)}
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-light); display: flex; gap: 10px; flex-wrap: wrap;">
                        <span>📍 <strong>Local:</strong> ${escapeHTML(d.local)}</span>
                        <span>👤 <strong>Sugerido:</strong> ${escapeHTML(d.responsavelSugerido)}</span>
                    </div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    <button class="db-clear-btn" style="color:#0284c7; border-color:#bae6fd; background:#f0f9ff; padding: 8px 12px; font-size: 12px; display:inline-flex; align-items:center; gap:5px;" onclick="abrirPastaFotosOperacional('04_Nao Conformidades', '${escapeHTML(d.data)}', '${escapeHTML(d.titulo)}')" title="Acessar ou preparar pasta de fotos e evidências no Google Drive">📷 Pasta Drive</button>
                    <button class="db-apply-btn" style="padding: 8px 14px; font-size: 12px; background: var(--primary);" onclick="criarAcaoPgrDeDesvio('${dJson}')">
                        🎯 Criar Ação 5W2H
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Pré-carrega o formulário 5W2H a partir de um desvio detectado no Scanner
 */
function criarAcaoPgrDeDesvio(dJsonEncoded) {
    try {
        const d = JSON.parse(decodeURIComponent(dJsonEncoded));
        abrirModalNovaAcaoPgr({
            origem_tipo: d.origem_tipo,
            origem_id: d.origem_id,
            origem_rotulo: d.origem_rotulo,
            grau_prioridade: d.prioridade,
            what_acao: d.titulo,
            why_motivo: d.descricao,
            where_local: d.local,
            who_responsavel: d.responsavelSugerido
        });
    } catch (e) {
        console.error('Erro ao converter desvio:', e);
    }
}

/**
 * Abre o modal de cadastro de nova ação 5W2H
 */
function abrirModalNovaAcaoPgr(prefill = {}) {
    const modal = document.getElementById('modalPlanoAcaoPgr');
    if (!modal) return;

    document.getElementById('modalPlanoAcaoPgrTitulo').textContent = '🎯 Nova Ação 5W2H do PGR (NR-01)';
    document.getElementById('pgrForm_id').value = '';
    document.getElementById('pgrForm_origemId').value = prefill.origem_id || '';
    document.getElementById('pgrForm_origemTipo').value = prefill.origem_tipo || 'manual';
    document.getElementById('pgrForm_origemRotulo').value = prefill.origem_rotulo || '';
    document.getElementById('pgrForm_prioridade').value = prefill.grau_prioridade || 'media';
    document.getElementById('pgrForm_what').value = prefill.what_acao || '';
    document.getElementById('pgrForm_why').value = prefill.why_motivo || '';
    document.getElementById('pgrForm_where').value = prefill.where_local || '';
    document.getElementById('pgrForm_who').value = prefill.who_responsavel || '';
    
    // Prazo padrão: 7 dias a partir de hoje
    const prazoPadrao = new Date();
    prazoPadrao.setDate(prazoPadrao.getDate() + 7);
    document.getElementById('pgrForm_when').value = prefill.when_prazo || toISODateLocal(prazoPadrao);
    
    document.getElementById('pgrForm_how').value = prefill.how_metodo || '';
    document.getElementById('pgrForm_howMuch').value = prefill.how_much_custo || '';
    document.getElementById('pgrForm_status').value = prefill.status || 'aberta';
    document.getElementById('pgrForm_dataConclusao').value = prefill.data_conclusao || '';
    document.getElementById('pgrForm_evidencia').value = prefill.evidencia_conclusao || '';

    modal.style.display = 'flex';
}

/**
 * Abre o modal para editar uma ação existente
 */
function abrirModalEditarAcaoPgr(id) {
    const item = allPlanoAcaoPgr.find(a => a.id === id);
    if (!item) return;

    const modal = document.getElementById('modalPlanoAcaoPgr');
    if (!modal) return;

    document.getElementById('modalPlanoAcaoPgrTitulo').textContent = '✏️ Editar Ação 5W2H (' + (item.what_acao?.slice(0, 30) || 'PGR') + '...)';
    document.getElementById('pgrForm_id').value = item.id;
    document.getElementById('pgrForm_origemId').value = item.origem_id || '';
    document.getElementById('pgrForm_origemTipo').value = item.origem_tipo || 'manual';
    document.getElementById('pgrForm_origemRotulo').value = item.origem_rotulo || '';
    document.getElementById('pgrForm_prioridade').value = item.grau_prioridade || 'media';
    document.getElementById('pgrForm_what').value = item.what_acao || '';
    document.getElementById('pgrForm_why').value = item.why_motivo || '';
    document.getElementById('pgrForm_where').value = item.where_local || '';
    document.getElementById('pgrForm_who').value = item.who_responsavel || '';
    document.getElementById('pgrForm_when').value = item.when_prazo || '';
    document.getElementById('pgrForm_how').value = item.how_metodo || '';
    document.getElementById('pgrForm_howMuch').value = item.how_much_custo || '';
    document.getElementById('pgrForm_status').value = item.status || 'aberta';
    document.getElementById('pgrForm_dataConclusao').value = item.data_conclusao || '';
    document.getElementById('pgrForm_evidencia').value = item.evidencia_conclusao || '';

    modal.style.display = 'flex';
}

function fecharModalPlanoAcaoPgr() {
    const modal = document.getElementById('modalPlanoAcaoPgr');
    if (modal) modal.style.display = 'none';
}

function onPgrStatusChange(novoStatus) {
    const dtInput = document.getElementById('pgrForm_dataConclusao');
    if (!dtInput) return;
    if (novoStatus === 'concluida' && !dtInput.value) {
        dtInput.value = toISODateLocal(new Date());
    } else if (novoStatus !== 'concluida') {
        dtInput.value = '';
    }
}

/**
 * Salva a ação 5W2H no Supabase (criação ou edição)
 */
async function salvarAcaoPgrFormulario() {
    if (bloquearEdicaoSeNaoAutorizado('planoacao')) return;

    const idExistente = document.getElementById('pgrForm_id').value;
    const what = document.getElementById('pgrForm_what').value.trim();
    const where = document.getElementById('pgrForm_where').value.trim();
    const who = document.getElementById('pgrForm_who').value.trim();
    const when = document.getElementById('pgrForm_when').value;

    if (!what || !where || !who || !when) {
        alert('Por favor, preencha os campos obrigatórios do 5W2H: O que será feito, Onde, Quem executará e Prazo.');
        return;
    }

    const session = sessaoDashboardAtual();
    const custoVal = parseFloat(document.getElementById('pgrForm_howMuch').value);
    const statusVal = document.getElementById('pgrForm_status').value;
    const dataConclusaoVal = document.getElementById('pgrForm_dataConclusao').value || (statusVal === 'concluida' ? toISODateLocal(new Date()) : null);

    const payload = {
        origem_tipo: document.getElementById('pgrForm_origemTipo').value,
        origem_id: document.getElementById('pgrForm_origemId').value || null,
        origem_rotulo: document.getElementById('pgrForm_origemRotulo').value.trim(),
        grau_prioridade: document.getElementById('pgrForm_prioridade').value,
        what_acao: what,
        why_motivo: document.getElementById('pgrForm_why').value.trim(),
        where_local: where,
        who_responsavel: who,
        when_prazo: when,
        how_metodo: document.getElementById('pgrForm_how').value.trim(),
        how_much_custo: isNaN(custoVal) ? 0 : custoVal,
        status: statusVal,
        data_conclusao: dataConclusaoVal,
        evidencia_conclusao: document.getElementById('pgrForm_evidencia').value.trim(),
        updated_at: new Date().toISOString()
    };

    try {
        if (idExistente) {
            await supabaseUpsert('pgr_plano_acao', [{ id: idExistente, ...payload }]);
            const idx = allPlanoAcaoPgr.findIndex(a => a.id === idExistente);
            if (idx >= 0) allPlanoAcaoPgr[idx] = { ...allPlanoAcaoPgr[idx], ...payload };
            registrarAuditLogDashboard('update', 'pgr_plano_acao', idExistente, `Ação 5W2H atualizada: "${what.slice(0, 40)}"`);
        } else {
            const novoId = 'PA_PGR_' + Date.now();
            const novoItem = {
                id: novoId,
                ...payload,
                afericao_eficacia: 'pendente',
                criado_por_matricula: session?.matricula || null,
                criado_por_nome: session?.nome || null,
                created_at: new Date().toISOString()
            };
            await supabaseUpsert('pgr_plano_acao', [novoItem]);
            allPlanoAcaoPgr.unshift(novoItem);
            registrarAuditLogDashboard('create', 'pgr_plano_acao', novoId, `Nova ação 5W2H criada: "${what.slice(0, 40)}"`);
        }

        fecharModalPlanoAcaoPgr();
        atualizarKpisPlanoAcaoPgr();
        renderPlanoAcaoPgrVisaoAtual();
        alert('✅ Ação do PGR salva com sucesso!');
    } catch (e) {
        console.error('Erro ao salvar ação 5W2H:', e);
        alert('❌ Falha ao salvar ação: ' + e.message);
    }
}

/**
 * Exclui uma ação 5W2H do Supabase
 */
async function excluirAcaoPgr(id) {
    if (bloquearEdicaoSeNaoAutorizado('planoacao')) return;

    const item = allPlanoAcaoPgr.find(a => a.id === id);
    if (!item) return;

    if (!confirm(`Deseja realmente excluir a ação 5W2H:\n"${item.what_acao}"?`)) return;

    try {
        await supabaseDelete('pgr_plano_acao', id);
        allPlanoAcaoPgr = allPlanoAcaoPgr.filter(a => a.id !== id);
        registrarAuditLogDashboard('delete', 'pgr_plano_acao', id, `Ação excluída: "${item.what_acao?.slice(0, 40)}"`);
        atualizarKpisPlanoAcaoPgr();
        renderPlanoAcaoPgrVisaoAtual();
        alert('Ação excluída com sucesso.');
    } catch (e) {
        console.error('Erro ao excluir ação:', e);
        alert('❌ Falha ao excluir ação: ' + e.message);
    }
}

/**
 * Avança rapidamente o status de uma ação (Kanban ou Tabela)
 */
async function avancarStatusPgrRapido(id, novoStatus) {
    if (bloquearEdicaoSeNaoAutorizado('planoacao')) return;

    const item = allPlanoAcaoPgr.find(a => a.id === id);
    if (!item) return;

    const dataConclusao = novoStatus === 'concluida' ? toISODateLocal(new Date()) : null;

    try {
        await supabaseUpsert('pgr_plano_acao', [{
            id: id,
            status: novoStatus,
            data_conclusao: dataConclusao,
            updated_at: new Date().toISOString()
        }]);

        item.status = novoStatus;
        item.data_conclusao = dataConclusao;

        atualizarKpisPlanoAcaoPgr();
        renderPlanoAcaoPgrVisaoAtual();
    } catch (e) {
        console.error('Erro ao avançar status:', e);
        alert('❌ Falha ao atualizar status: ' + e.message);
    }
}

/**
 * Abre o modal de avaliação de eficácia da NR-01
 */
function abrirModalEficaciaPgr(id) {
    const item = allPlanoAcaoPgr.find(a => a.id === id);
    if (!item) return;

    const modal = document.getElementById('modalPlanoAcaoEficacia');
    if (!modal) return;

    document.getElementById('pgrEficacia_id').value = id;
    document.getElementById('pgrEficacia_resultado').value = item.afericao_eficacia || 'eficaz';
    document.getElementById('pgrEficacia_parecer').value = item.obs_eficacia || '';

    modal.style.display = 'flex';
}

function fecharModalPlanoAcaoEficacia() {
    const modal = document.getElementById('modalPlanoAcaoEficacia');
    if (modal) modal.style.display = 'none';
}

/**
 * Registra o parecer de eficácia conforme NR-01 item 1.5.5.2
 */
async function salvarAvaliacaoEficaciaPgr() {
    if (bloquearEdicaoSeNaoAutorizado('planoacao')) return;

    const id = document.getElementById('pgrEficacia_id').value;
    const item = allPlanoAcaoPgr.find(a => a.id === id);
    if (!item) return;

    const resultado = document.getElementById('pgrEficacia_resultado').value;
    const parecer = document.getElementById('pgrEficacia_parecer').value.trim();

    try {
        await supabaseUpsert('pgr_plano_acao', [{
            id: id,
            afericao_eficacia: resultado,
            obs_eficacia: parecer,
            status: resultado === 'eficaz' ? 'concluida' : item.status,
            data_conclusao: (resultado === 'eficaz' && !item.data_conclusao) ? toISODateLocal(new Date()) : item.data_conclusao,
            updated_at: new Date().toISOString()
        }]);

        item.afericao_eficacia = resultado;
        item.obs_eficacia = parecer;
        if (resultado === 'eficaz') item.status = 'concluida';

        fecharModalPlanoAcaoEficacia();
        atualizarKpisPlanoAcaoPgr();
        renderPlanoAcaoPgrVisaoAtual();
        alert('✅ Parecer de eficácia registrado com sucesso!');
    } catch (e) {
        console.error('Erro ao salvar eficácia:', e);
        alert('❌ Falha ao salvar parecer de eficácia: ' + e.message);
    }
}

/**
 * Exporta a Matriz 5W2H do PGR para Excel (.xlsx)
 */
function gerarExcelPlanoAcaoPgr() {
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca SheetJS (XLSX) não carregada.');
        return;
    }

    const lista = obterAcoesPgrFiltradas();
    if (lista.length === 0) {
        alert('Nenhuma ação para exportar.');
        return;
    }

    const rows = lista.map((a, idx) => ({
        'Código': 'PA-' + String(idx + 1).padStart(3, '0'),
        'Origem': a.origem_tipo || 'Manual',
        'Referência da Origem': a.origem_rotulo || '',
        'Prioridade': (a.grau_prioridade || 'media').toUpperCase(),
        'O Que Será Feito (What)': a.what_acao || '',
        'Por Que Será Feito (Why)': a.why_motivo || '',
        'Onde Será Feito (Where)': a.where_local || '',
        'Quem Executará (Who)': a.who_responsavel || '',
        'Quando / Prazo Limite (When)': a.when_prazo ? formatarDataLocal(a.when_prazo) : '',
        'Como Será Feito (How)': a.how_metodo || '',
        'Custo Estimado R$ (How Much)': parseFloat(a.how_much_custo) || 0,
        'Status Atual': (a.status || 'aberta').toUpperCase(),
        'Data Efetiva de Conclusão': a.data_conclusao ? formatarDataLocal(a.data_conclusao) : '',
        'Evidência de Comprovação': a.evidencia_conclusao || '',
        'Aferição de Eficácia (NR-01)': (a.afericao_eficacia || 'Pendente').toUpperCase(),
        'Parecer Técnico do SESMT': a.obs_eficacia || '',
        'Criado Em': a.created_at ? formatarDataLocal(a.created_at.slice(0, 10)) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plano de Ação 5W2H PGR');

    const fileName = `Plano_de_Acao_5W2H_PGR_Ramal_do_Agreste_${toISODateLocal(new Date())}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

/**
 * Emissão de Relatório Oficial Timbrado da Matriz 5W2H do PGR
 */
function imprimirPlanoAcaoPgrTimbrado() {
    const lista = obterAcoesPgrFiltradas();
    if (lista.length === 0) {
        alert('Nenhuma ação selecionada para impressão.');
        return;
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const hojeStr = toISODateLocal(new Date());

    let totalCusto = 0;
    let totalConcluidas = 0;
    let totalVencidas = 0;

    lista.forEach(a => {
        totalCusto += parseFloat(a.how_much_custo) || 0;
        if (a.status === 'concluida') totalConcluidas++;
        else if (a.status !== 'cancelada' && a.when_prazo && a.when_prazo < hojeStr) totalVencidas++;
    });

    const linhasHtml = lista.map((a, idx) => {
        const cod = 'PA-' + String(idx + 1).padStart(3, '0');
        const prio = (a.grau_prioridade || 'media').toUpperCase();
        const custo = parseFloat(a.how_much_custo) || 0;
        const prazo = a.when_prazo ? formatarDataLocal(a.when_prazo) : '-';

        return `
            <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
                <td style="padding: 6px; font-weight: bold; text-align: center;">${cod}</td>
                <td style="padding: 6px; text-align: center;">${prio}</td>
                <td style="padding: 6px;"><strong>${escapeHTML(a.what_acao || '')}</strong></td>
                <td style="padding: 6px; color: #334155;">${escapeHTML(a.why_motivo || '-')}</td>
                <td style="padding: 6px;">${escapeHTML(a.where_local || '-')}</td>
                <td style="padding: 6px; font-weight: bold;">${escapeHTML(a.who_responsavel || '-')}</td>
                <td style="padding: 6px; text-align: center;">${prazo}</td>
                <td style="padding: 6px; color: #475569;">${escapeHTML(a.how_metodo || '-')}</td>
                <td style="padding: 6px; text-align: right;">${custo > 0 ? custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold;">${(a.status || 'aberta').toUpperCase()}</td>
                <td style="padding: 6px; text-align: center;">${(a.afericao_eficacia || 'Pendente').toUpperCase()}</td>
            </tr>
        `;
    }).join('');

    const htmlImpressao = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Plano de Ação 5W2H - PGR (NR-01) - COP Ramal do Agreste</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; }
                .timbrado-header { border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
                .timbrado-logo-box { font-size: 16px; font-weight: 800; color: #1e3a8a; }
                .timbrado-sub { font-size: 10px; color: #475569; margin-top: 2px; }
                .tabela-pgr { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .tabela-pgr th { background: #1e3a8a; color: #ffffff; padding: 6px; font-size: 10px; text-align: left; }
                .resumo-box { display: flex; gap: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-top: 14px; font-size: 11px; }
                .assinaturas { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
                .linha-assinatura { width: 280px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold; font-size: 10.5px; }
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; }
                }
                .barra-topo-impressao {
                    background: #1e3a8a;
                    color: white;
                    padding: 10px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    font-size: 13px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                }
                .btn-imprimir-topo {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
            </style>
        </head>
        <body>
            <div class="barra-topo-impressao no-print">
                <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    <span>🛡️ Sistema SMS COP</span>
                    <span style="opacity: 0.7;">|</span>
                    <span>Documento Oficial Pronto para Impressão ou Salvar em PDF</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-imprimir-topo" onclick="window.print()">🖨️ Salvar como PDF / Imprimir Agora</button>
                    <button onclick="window.close()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">Fechar</button>
                </div>
            </div>
            <div class="timbrado-header">
                <div>
                    <div class="timbrado-logo-box">CONSÓRCIO OPERADOR DO PISF — RAMAL DO AGRESTE (COP RAMAL)</div>
                    <div class="timbrado-sub">PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR) • NR-01 (GRO) — PLANO DE AÇÃO 5W2H</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #475569;">
                    Data de Emissão: ${dataHoje}<br>
                    Local: Arcoverde / Sertânia - PE
                </div>
            </div>

            <div class="resumo-box">
                <div><strong>Total de Ações:</strong> ${lista.length}</div>
                <div><strong>Concluídas:</strong> ${totalConcluidas}</div>
                <div><strong>Vencidas:</strong> <span style="color:#dc2626;">${totalVencidas}</span></div>
                <div><strong>Investimento Total:</strong> ${totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>

            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">Cód</th>
                        <th style="width: 55px; text-align: center;">Prio</th>
                        <th style="width: 180px;">O Que (What)</th>
                        <th style="width: 140px;">Por Que (Why)</th>
                        <th style="width: 100px;">Onde (Where)</th>
                        <th style="width: 100px;">Quem (Who)</th>
                        <th style="width: 70px; text-align: center;">Quando</th>
                        <th style="width: 130px;">Como (How)</th>
                        <th style="width: 75px; text-align: right;">Custo</th>
                        <th style="width: 80px; text-align: center;">Status</th>
                        <th style="width: 80px; text-align: center;">Eficácia</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasHtml}
                </tbody>
            </table>

            <div class="assinaturas">
                <div class="linha-assinatura">
                    João Everton de Souza Limeira<br>
                    <span style="font-weight: normal; font-size: 9.5px;">Engenheiro de Segurança do Trabalho<br>Responsável Técnico SST</span>
                </div>
                <div class="linha-assinatura">
                    Gerência de Operações e Contrato<br>
                    <span style="font-weight: normal; font-size: 9.5px;">Consórcio Operador do PISF Ramal do Agreste<br>Ciência e Aprovação de Recursos</span>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    abrirDocumentoHtmlParaImpressao(htmlImpressao, 'Plano de Ação 5W2H PGR - Ramal do Agreste');
}

// =====================================================================
// MÓDULO OFICIAL: PLANO ANUAL DE TREINAMENTO (PAT - NR-01 / NR-18)
// & MOTOR INTELIGENTE DE SUGESTÃO DE TEMAS (REGRA DOS 90 DIAS)
// & CRONOGRAMA OPERACIONAL DE TERÇAS E QUINTAS-FEIRAS
// =====================================================================

var CAMPANHAS_SAZONAIS_SST = {
    0: {
        cor: '#3b82f6',
        nomeMes: 'Janeiro',
        campanha: 'Janeiro Branco — Saúde Mental & Bem-Estar (NR-01)',
        temasSugeridos: ['149', '1', '190', '166'], // Códigos do catálogo
        focoSst: 'Integração admissional de início de ano, saúde mental, metas de segurança e direitos/deveres.'
    },
    1: {
        cor: '#9333ea',
        nomeMes: 'Fevereiro',
        campanha: 'Fevereiro Roxo & Laranja — Doenças Crônicas & Prevenção',
        temasSugeridos: ['25', '41', '158', '168'],
        focoSst: 'Carnaval seguro, combate ao alcoolismo e drogas, direção defensiva no canteiro e embarque seguro.'
    },
    2: {
        cor: '#ec4899',
        nomeMes: 'Março',
        campanha: 'Mês da Mulher & Combate ao Assédio (NR-05 CIPA)',
        temasSugeridos: ['146', '165', '28', '129'],
        focoSst: 'Prevenção e combate ao assédio sexual e moral no canteiro (Lei 14.457/22 - NR-05) e ergonomia.'
    },
    3: {
        cor: '#10b981',
        nomeMes: 'Abril',
        campanha: 'Abril Verde — Prevenção de Acidentes e Saúde no Trabalho',
        temasSugeridos: ['47', '125', '55', '184'],
        focoSst: 'Mês mundial da segurança do trabalho, reforço de APRs, percepção de risco e direito de recusa.'
    },
    4: {
        cor: '#f59e0b',
        nomeMes: 'Maio',
        campanha: 'Maio Amarelo — Trânsito Seguro & Direção Defensiva na Obra',
        temasSugeridos: ['69', '41', '49', '178'],
        focoSst: 'Tráfego pesado na obra, distância segura de máquinas pesadas e checklist diário de veículos.'
    },
    5: {
        cor: '#059669',
        nomeMes: 'Junho',
        campanha: 'Junho Verde — Meio Ambiente, Resíduos & Prevenção de Incêndios',
        temasSugeridos: ['181', '143', '30', '15', '71'],
        focoSst: 'Gestão de resíduos, coleta seletiva, produtos químicos e prevenção/combate a incêndios (NR-23).'
    },
    6: {
        cor: '#eab308',
        nomeMes: 'Julho',
        campanha: 'Julho Amarelo — Hepatites Virais & Dia Nacional da Prevenção (27/07)',
        temasSugeridos: ['120', '191', '16', '29'],
        focoSst: 'Hepatites virais, comemoração da prevenção de acidentes e reciclagem de trabalho em altura (NR-35).'
    },
    7: {
        cor: '#d97706',
        nomeMes: 'Agosto',
        campanha: 'Agosto Dourado & Proteção de Membros e Eletricidade nas EBs',
        temasSugeridos: ['119', '63', '10', '122'],
        focoSst: 'Campanha de proteção das mãos/dedos, prensamento e segurança em instalações elétricas nas EBs (NR-10).'
    },
    8: {
        cor: '#ca8a04',
        nomeMes: 'Setembro',
        campanha: 'Setembro Amarelo — Saúde Mental & Prevenção de Acidentes Ofídicos',
        temasSugeridos: ['44', '188', '195', '142'],
        focoSst: 'Prevenção ao suicídio, cuidados com serpentes e abelhas na caatinga/canal e uso de perneiras.'
    },
    9: {
        cor: '#db2777',
        nomeMes: 'Outubro',
        campanha: 'Outubro Rosa — Saúde da Mulher & Higienização de EPIs',
        temasSugeridos: ['51', '155', '26', '133'],
        focoSst: 'Conscientização do câncer de mama, higienização dos postos de trabalho e proteção solar.'
    },
    10: {
        cor: '#2563eb',
        nomeMes: 'Novembro',
        campanha: 'Novembro Azul — Saúde do Homem & Máquinas Industriais (NR-12)',
        temasSugeridos: ['161', '123', '46', '164'],
        focoSst: 'Prevenção ao câncer de próstata, segurança em máquinas de oficina/bombas (NR-12) e ergonomia.'
    },
    11: {
        cor: '#dc2626',
        nomeMes: 'Dezembro',
        campanha: 'Dezembro Vermelho & Laranja — Prevenção a ISTs & Câncer de Pele',
        temasSugeridos: ['62', '133', '156', '64'],
        focoSst: 'Dezembro Vermelho (HIV/ISTs), Dezembro Laranja (radiação solar/UV), código de conduta e retrospectiva.'
    }
};

var patAnoAtual = 2026;
var patCategoriaFiltroAtual = 'todos'; // 'todos' | 'normativos' | 'campanhas' | 'operacionais'
var modalSugestaoFiltroAtual = 'recomendados'; // 'recomendados' | 'ineditos' | 'liberados' | 'bloqueados'
var modalSugestaoMesAlvoIndex = new Date().getMonth();

// 0. Utilitário: Obter todas as Terças e Quintas-feiras de um Mês
function obterTerceirasEQuintasDoMes(ano, mesIdx) {
    const datas = [];
    const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();
    for (let d = 1; d <= diasNoMes; d++) {
        const dataObj = new Date(ano, mesIdx, d);
        const diaSemana = dataObj.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
        if (diaSemana === 2 || diaSemana === 4) { // Terça-feira (2) ou Quinta-feira (4)
            const diaStr = String(d).padStart(2, '0');
            const mesStr = String(mesIdx + 1).padStart(2, '0');
            datas.push({
                iso: `${ano}-${mesStr}-${diaStr}`,
                dia: d,
                diaSemana: diaSemana,
                diaSemanaNome: diaSemana === 2 ? 'Terça-feira' : 'Quinta-feira',
                diaSemanaCurto: diaSemana === 2 ? 'Ter' : 'Qui'
            });
        }
    }
    return datas;
}

function obterInfoDiaSemana(dataIso) {
    if (!dataIso) return { curto: '', nome: '', ehTerOuQui: false };
    const d = parseLocalDate(dataIso);
    const diaSemana = d.getDay();
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const nomesCompletos = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return {
        curto: nomes[diaSemana] || '',
        nome: nomesCompletos[diaSemana] || '',
        ehTerOuQui: (diaSemana === 2 || diaSemana === 4)
    };
}

// 1. Motor de Histórico Consolidado de Temas (DDS + Treinamentos)
function obterHistoricoTemasConsolidado() {
    const mapa = new Map(); // nomeNormalizado -> { ultimoIso: string, total: number, frentes: Set, nomeOriginal: string }

    function normalizar(s) {
        return typeof normalizarTextoCargoBasico === 'function' 
            ? normalizarTextoCargoBasico(s) 
            : String(s || '').toLowerCase().trim();
    }

    // A. Registros de DDS Realizados
    (allDdsRealizados || []).forEach(r => {
        if (!r.tema) return;
        const norm = normalizar(r.tema);
        const dataIso = r.data_dds || r.data || '';
        const frente = r.frente_responsavel || r.frente || '';
        if (!mapa.has(norm)) {
            mapa.set(norm, { ultimoIso: dataIso, total: 1, frentes: new Set(frente ? [frente] : []), nomeOriginal: r.tema });
        } else {
            const item = mapa.get(norm);
            item.total++;
            if (dataIso > item.ultimoIso) item.ultimoIso = dataIso;
            if (frente) item.frentes.add(frente);
        }
    });

    // B. Calendário de DDS
    (allDdsTemasCronograma || []).forEach(r => {
        if (!r.tema) return;
        const norm = normalizar(r.tema);
        const dataIso = r.data || '';
        if (!mapa.has(norm)) {
            mapa.set(norm, { ultimoIso: dataIso, total: 1, frentes: new Set(), nomeOriginal: r.tema });
        } else {
            const item = mapa.get(norm);
            if (dataIso > item.ultimoIso) item.ultimoIso = dataIso;
        }
    });

    // C. Treinamentos Realizados
    (allTreinamentosRealizados || []).forEach(r => {
        const nome = r.treinamento_nome || r.treinamento_cod;
        if (!nome) return;
        const norm = normalizar(nome);
        const dataIso = r.data_treinamento || '';
        if (!mapa.has(norm)) {
            mapa.set(norm, { ultimoIso: dataIso, total: 1, frentes: new Set(), nomeOriginal: nome });
        } else {
            const item = mapa.get(norm);
            item.total++;
            if (dataIso > item.ultimoIso) item.ultimoIso = dataIso;
        }
    });

    return mapa;
}

// 2. Cálculo da Carência de 90 Dias de um Tema
function calcularCarenciaTema(nomeTema, dataReferenciaIso) {
    const historico = obterHistoricoTemasConsolidado();
    const norm = typeof normalizarTextoCargoBasico === 'function' 
        ? normalizarTextoCargoBasico(nomeTema) 
        : String(nomeTema || '').toLowerCase().trim();
    const registro = historico.get(norm);

    if (!registro || !registro.ultimoIso) {
        return {
            status: 'inedito',
            dias: null,
            ultimaData: null,
            totalAplicacoes: 0,
            frentes: []
        };
    }

    const ref = dataReferenciaIso ? new Date(dataReferenciaIso + 'T12:00:00') : new Date();
    const ult = new Date(registro.ultimoIso + 'T12:00:00');
    const diffMs = ref.getTime() - ult.getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Se dias < 0, está programado para data futura próxima
    // Se dias < 90, está bloqueado pela regra dos 3 meses
    const bloqueado = (dias < 90);

    return {
        status: bloqueado ? 'bloqueado' : 'liberado',
        dias: dias,
        agendadoFuturo: (dias < 0),
        ultimaData: registro.ultimoIso,
        totalAplicacoes: registro.total,
        frentes: Array.from(registro.frentes || [])
    };
}

// 3. Renderização Principal do Módulo PAT
function onPatAnoChange() {
    const sel = document.getElementById('patFiltroAno');
    if (sel) patAnoAtual = parseInt(sel.value, 10);
    renderPlanoAnualTreinamento();
}

function filtrarCategoriaPat(cat) {
    patCategoriaFiltroAtual = cat;
    ['todos', 'normativos', 'campanhas', 'operacionais'].forEach(c => {
        const btn = document.getElementById('btnPatFiltro-' + c);
        if (btn) btn.classList.toggle('active', c === cat);
    });
    renderGradePatAnual();
}

function renderPlanoAnualTreinamento() {
    const selAno = document.getElementById('patFiltroAno');
    if (selAno && !selAno.value) selAno.value = patAnoAtual;

    const itensAno = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        const anoItem = parseLocalDate(c.data_prevista).getFullYear();
        return anoItem === patAnoAtual;
    });

    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));

    // Calcular KPIs
    const totalAcoes = itensAno.length;
    let totalHoras = 0;
    let concluidas = 0;

    itensAno.forEach(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const ch = (cat && cat.carga_horaria) ? parseFloat(cat.carga_horaria) : 2;
        totalHoras += ch;
        if (c.status === 'lancado' || c.status === 'concluido') concluidas++;
    });

    const pctAderencia = totalAcoes > 0 ? Math.round((concluidas / totalAcoes) * 100) : 0;

    const elAcoes = document.getElementById('kpiPatTotalAcoes');
    if (elAcoes) elAcoes.textContent = totalAcoes;

    const elHoras = document.getElementById('kpiPatTotalHoras');
    if (elHoras) elHoras.textContent = totalHoras + 'h';

    const elAderencia = document.getElementById('kpiPatAderencia');
    if (elAderencia) elAderencia.textContent = pctAderencia + '%';

    const elBar = document.getElementById('kpiPatProgressBar');
    if (elBar) elBar.style.width = pctAderencia + '%';

    renderGradePatAnual();
}

// 4. Renderização da Grade Anual dos 12 Meses com Informação de Terças e Quintas
function renderGradePatAnual() {
    const container = document.getElementById('patGradeMensalContainer');
    if (!container) return;

    const itensAno = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        const anoItem = parseLocalDate(c.data_prevista).getFullYear();
        return anoItem === patAnoAtual;
    });

    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));
    const hoje = new Date();
    const mesAtualIndex = hoje.getFullYear() === patAnoAtual ? hoje.getMonth() : -1;

    let html = '';

    for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
        const infoSazonal = CAMPANHAS_SAZONAIS_SST[mesIdx];
        const ehMesAtual = (mesIdx === mesAtualIndex);

        // Identificar todas as Terças e Quintas-feiras deste mês
        const terQuintas = obterTerceirasEQuintasDoMes(patAnoAtual, mesIdx);
        const totalTerQuintas = terQuintas.length;

        let itensMes = itensAno.filter(c => {
            const m = parseLocalDate(c.data_prevista).getMonth();
            return m === mesIdx;
        });

        // Filtrar por categoria se aplicável
        if (patCategoriaFiltroAtual === 'normativos') {
            itensMes = itensMes.filter(c => {
                const cat = catalogoPorId.get(c.treinamento_cod);
                const nome = (cat?.nome || c.treinamento_cod || '').toUpperCase();
                return nome.includes('NR') || nome.includes('NORMA') || (cat && cat.meses_validade);
            });
        } else if (patCategoriaFiltroAtual === 'campanhas') {
            itensMes = itensMes.filter(c => {
                const cat = catalogoPorId.get(c.treinamento_cod);
                const nome = (cat?.nome || c.treinamento_cod || '').toUpperCase();
                return nome.includes('DIA ') || nome.includes('CAMPANHA') || nome.includes('ROSA') || nome.includes('AZUL') || nome.includes('AMARELO') || nome.includes('VERDE') || nome.includes('VERMELHO');
            });
        } else if (patCategoriaFiltroAtual === 'operacionais') {
            itensMes = itensMes.filter(c => {
                const cat = catalogoPorId.get(c.treinamento_cod);
                const nome = (cat?.nome || c.treinamento_cod || '').toUpperCase();
                return nome.includes('BOMBA') || nome.includes('VENTOSA') || nome.includes('MÁQUINA') || nome.includes('MAQUINA') || nome.includes('LOTO') || nome.includes('ELÉTRIC') || nome.includes('ELETRIC');
            });
        }

        itensMes.sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));

        // Quantas terças e quintas já têm treinamento agendado
        const datasOcupadas = new Set(itensMes.map(c => c.data_prevista));
        const terQuintasPreenchidas = terQuintas.filter(tq => datasOcupadas.has(tq.iso)).length;
        const vagasLivres = terQuintas.filter(tq => !datasOcupadas.has(tq.iso));

        let cardStyle = `background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05);`;
        if (ehMesAtual) {
            cardStyle += ` border: 2px solid var(--primary); box-shadow: 0 4px 12px rgba(37,99,235,0.15);`;
        }

        html += `
            <div style="${cardStyle}">
                <div>
                    <!-- Cabeçalho do Mês -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:8px; gap:8px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-size:14px; font-weight:800; color:var(--text); text-transform:uppercase;">
                                    ${infoSazonal.nomeMes}
                                </span>
                                ${ehMesAtual ? `<span style="background:var(--primary); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px;">MÊS ATUAL</span>` : ''}
                            </div>
                            <div style="font-size:10.5px; color:var(--text-light); margin-top:2px;">
                                <span>🗓️ <strong>${totalTerQuintas}</strong> Ter/Qui no mês</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:11px; font-weight:700; color:${itensMes.length > 0 ? '#059669' : 'var(--text-light)'}; background:${itensMes.length > 0 ? '#d1fae5' : 'var(--bg)'}; padding:2px 8px; border-radius:999px; display:inline-block;">
                                ${itensMes.length} ação(ões)
                            </span>
                        </div>
                    </div>

                    <!-- Banner de Campanha Sazonal do Mês -->
                    <div style="background: linear-gradient(135deg, ${infoSazonal.cor}15, ${infoSazonal.cor}08); border-left: 3px solid ${infoSazonal.cor}; padding: 6px 10px; border-radius: 4px; margin-bottom: 10px;">
                        <div style="font-size: 11px; font-weight: 700; color: ${infoSazonal.cor}; display:flex; align-items:center; gap:4px;">
                            <span>🎗️</span> ${escapeHTML(infoSazonal.campanha)}
                        </div>
                        <div style="font-size: 10px; color: var(--text-light); margin-top: 2px; line-height: 1.2;">
                            ${escapeHTML(infoSazonal.focoSst)}
                        </div>
                    </div>

                    <!-- Lista de Ações do Mês -->
                    <div style="display:flex; flex-direction:column; gap:6px; min-height: 90px;">
                        ${itensMes.length === 0 ? `
                            <div style="padding:16px 8px; text-align:center; color:var(--text-light); font-size:11.5px; border:1px dashed var(--border); border-radius:8px;">
                                Nenhuma ação agendada neste mês.
                                <div style="margin-top:6px; display:flex; justify-content:center; gap:6px; flex-wrap:wrap;">
                                    <button class="db-clear-btn" onclick="abrirModalSugestaoTemas(${mesIdx})" style="font-size:10.5px; padding:3px 8px; color:var(--primary); font-weight:600;">
                                        🪄 Sugerir Temas
                                    </button>
                                    <button class="db-clear-btn" onclick="gerarCronogramaMesTerceirasEQuintas(${mesIdx})" style="font-size:10.5px; padding:3px 8px; color:#047857; background:#ecfdf5; border-color:#10b981; font-weight:700;">
                                        ⚡ Preencher Ter/Qui (${totalTerQuintas})
                                    </button>
                                </div>
                            </div>
                        ` : itensMes.map(c => {
                            const cat = catalogoPorId.get(c.treinamento_cod);
                            const nome = cat ? cat.nome : c.treinamento_cod;
                            const ch = (cat && cat.carga_horaria) ? cat.carga_horaria + 'h' : '2h';
                            const ehConcluido = (c.status === 'lancado' || c.status === 'concluido');
                            const dataFormatada = c.data_prevista ? formatSimpleDate(c.data_prevista) : '';
                            const infoDia = obterInfoDiaSemana(c.data_prevista);

                            return `
                                <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:6px 8px; font-size:11.5px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                    <div style="overflow:hidden; text-overflow:ellipsis;">
                                        <div style="font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHTML(nome)}">
                                            [${escapeHTML(c.treinamento_cod)}] ${escapeHTML(nome)}
                                        </div>
                                        <div style="font-size:10px; color:var(--text-light); display:flex; gap:6px; margin-top:2px; align-items:center; flex-wrap:wrap;">
                                            <span>📅 <strong>${dataFormatada}</strong> ${infoDia.curto ? `(${infoDia.curto})` : ''}</span>
                                            ${infoDia.ehTerOuQui 
                                                ? '<span style="color:#059669; font-weight:700; background:#d1fae5; padding:1px 4px; border-radius:3px;" title="Cronograma Regular de Terça/Quinta">⚡ Ter/Qui</span>' 
                                                : '<span style="color:#b45309; background:#fef3c7; padding:1px 4px; border-radius:3px;" title="Treinamento fora do cronograma regular de terças e quintas">📌 Extra</span>'
                                            }
                                            <span>⏱️ ${ch}</span>
                                            ${c.responsavel ? `<span>👤 ${escapeHTML(c.responsavel)}</span>` : ''}
                                        </div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                                        <span title="${ehConcluido ? 'Treinamento Realizado' : 'Ação Planejada'}" style="font-size:13px;">
                                            ${ehConcluido ? '✅' : '🕓'}
                                        </span>
                                        <button class="db-clear-btn" onclick="abrirModalReprogramarCronograma('${escapeHTML(c.id)}')" style="padding:2px 5px; font-size:10px; color:var(--primary);" title="Reprogramar data ou permutar com outro tema">🔄</button>
                                        <button class="db-clear-btn" onclick="excluirItemCronograma('${escapeHTML(c.id)}')" style="padding:2px 4px; font-size:10px; color:var(--danger);" title="Remover do PAT">✕</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Botões de Ação no Pé do Mês -->
                <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                    <button class="db-clear-btn" onclick="abrirModalSugestaoTemas(${mesIdx})" style="font-size:11px; padding:4px 8px; color:var(--primary); font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="Ver temas recomendados e inéditos com carência de 90 dias">
                        <span>🪄</span> Sugestões (90d)
                    </button>
                    <div style="display:flex; gap:4px; align-items:center;">
                        ${vagasLivres.length > 0 ? `
                            <button class="db-clear-btn" onclick="gerarCronogramaMesTerceirasEQuintas(${mesIdx})" style="font-size:10.5px; padding:4px 8px; color:#047857; background:#ecfdf5; border-color:#10b981; font-weight:700; display:inline-flex; align-items:center; gap:3px;" title="Preencher automaticamente as ${vagasLivres.length} Terças e Quintas livres do mês">
                                ⚡ Preencher Ter/Qui (${vagasLivres.length})
                            </button>
                        ` : `
                            <span style="font-size:10px; color:#059669; font-weight:700; background:#d1fae5; padding:3px 6px; border-radius:4px;" title="Todas as Terças e Quintas do mês estão programadas">✓ Ter/Qui 100%</span>
                        `}
                        <button class="db-clear-btn" onclick="abrirModalAdicionarAcaoPat(${mesIdx})" style="font-size:11px; padding:4px 8px; font-weight:600;" title="Adicionar treinamento com inserção de data neste mês">
                            ➕ Adicionar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 5. Geração Automática das Terças e Quintas de um Mês Específico
async function gerarCronogramaMesTerceirasEQuintas(mesIdx) {
    const ano = patAnoAtual;
    const infoSazonal = CAMPANHAS_SAZONAIS_SST[mesIdx];
    const nomeMes = infoSazonal.nomeMes;

    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
    const datasOcupadas = new Set(
        (allTreinamentosCronograma || [])
            .filter(c => {
                if (!c.data_prevista) return false;
                const d = parseLocalDate(c.data_prevista);
                return d.getFullYear() === ano && d.getMonth() === mesIdx;
            })
            .map(c => c.data_prevista)
    );

    const vagasLivres = terQuintas.filter(tq => !datasOcupadas.has(tq.iso));
    if (vagasLivres.length === 0) {
        alert(`Todas as ${terQuintas.length} Terças e Quintas-feiras de ${nomeMes}/${ano} já possuem treinamentos programados!`);
        return;
    }

    const conf = confirm(
        `📅 PLANEJAMENTO AUTOMÁTICO: ${nomeMes.toUpperCase()}/${ano}\n\n` +
        `• Total de Terças e Quintas no mês: ${terQuintas.length} datas\n` +
        `• Já programados no mês: ${terQuintas.length - vagasLivres.length} treinamentos\n` +
        `• Datas livres a preencher: ${vagasLivres.length} datas\n\n` +
        `Datas livres: ${vagasLivres.map(v => formatSimpleDate(v.iso) + ' (' + v.diaSemanaCurto + ')').join(', ')}\n\n` +
        `Deseja que o sistema preencha automaticamente essas ${vagasLivres.length} datas com temas do catálogo, respeitando a campanha sazonal, NRs prioritárias e a carência de 90 dias (sem nenhuma repetição)?`
    );
    if (!conf) return;

    // Obter todos os códigos já utilizados neste mês
    const codigosJaNoMes = new Set(
        (allTreinamentosCronograma || [])
            .filter(c => {
                if (!c.data_prevista) return false;
                const d = parseLocalDate(c.data_prevista);
                return d.getFullYear() === ano && d.getMonth() === mesIdx;
            })
            .map(c => c.treinamento_cod)
    );

    // Avaliar carência de todos os cursos do catálogo
    const catalogo = allTreinamentosCatalogo || [];
    const codigosSazonais = new Set(infoSazonal.temasSugeridos || []);

    const candidatos = catalogo
        .filter(c => !codigosJaNoMes.has(c.id))
        .map(c => {
            const dataRefIso = vagasLivres[0].iso;
            const carencia = calcularCarenciaTema(c.nome, dataRefIso);
            const ehSazonal = codigosSazonais.has(c.id);
            return {
                ...c,
                carencia,
                ehSazonal
            };
        })
        .filter(c => c.carencia.status === 'inedito' || (c.carencia.status === 'liberado' && c.carencia.dias >= 90));

    // Ordenar: primeiro sazonais, depois inéditos, depois os com maior carência (>120d, >90d)
    candidatos.sort((a, b) => {
        if (a.ehSazonal !== b.ehSazonal) return b.ehSazonal ? 1 : -1;
        const aInedito = a.carencia.status === 'inedito' ? 1 : 0;
        const bInedito = b.carencia.status === 'inedito' ? 1 : 0;
        if (aInedito !== bInedito) return bInedito - aInedito;
        return (b.carencia.dias || 0) - (a.carencia.dias || 0);
    });

    if (candidatos.length < vagasLivres.length) {
        alert(`Atenção: existem ${vagasLivres.length} datas livres, mas apenas ${candidatos.length} temas disponíveis respeitando a regra dos 90 dias sem repetição.`);
    }

    const novosItens = [];
    const selecionados = candidatos.slice(0, vagasLivres.length);

    selecionados.forEach((curso, idx) => {
        const vaga = vagasLivres[idx];
        novosItens.push({
            id: 'crono_pat_tq_' + ano + '_' + vaga.iso.replace(/-/g, '') + '_' + curso.id + '_' + Math.random().toString(36).slice(2, 6),
            data_prevista: vaga.iso,
            treinamento_cod: curso.id,
            horario: '08:00',
            local: 'Canteiro Central / EBs / Frentes de Obra',
            responsavel: 'Engenharia de Segurança (SESMT)',
            status: 'planejado',
            observacoes: `PAT ${ano} — Cronograma Regular (${vaga.diaSemanaNome}) — ${infoSazonal.campanha}`
        });
        codigosJaNoMes.add(curso.id);
    });

    if (novosItens.length === 0) {
        alert('Nenhum novo tema disponível para preenchimento com as regras de carência atuais.');
        return;
    }

    try {
        await supabaseUpsert('treinamentos_cronograma', novosItens);
        novosItens.forEach(item => allTreinamentosCronograma.push(item));

        alert(`🎉 Sucesso! ${novosItens.length} treinamentos foram programados nas Terças e Quintas-feiras de ${nomeMes}/${ano}!`);
        renderPlanoAnualTreinamento();
    } catch (err) {
        console.error('Erro ao gerar cronograma do mês:', err);
        alert('❌ Falha ao salvar no cronograma: ' + err.message);
    }
}

// 6. Formulário Manual de Cronograma com Sugestão de Próxima Terça ou Quinta
function abrirFormCronogramaComMes(mesIdx) {
    const ano = patAnoAtual;
    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
    const datasOcupadas = new Set(
        (allTreinamentosCronograma || [])
            .filter(c => {
                if (!c.data_prevista) return false;
                const d = parseLocalDate(c.data_prevista);
                return d.getFullYear() === ano && d.getMonth() === mesIdx;
            })
            .map(c => c.data_prevista)
    );

    const proximaLivre = terQuintas.find(tq => !datasOcupadas.has(tq.iso));
    const dataSugerida = proximaLivre ? proximaLivre.iso : `${ano}-${String(mesIdx + 1).padStart(2, '0')}-15`;
    
    showTreinSubtab('cronograma');
    abrirFormCronograma();
    const dataInput = document.getElementById('cronoForm_data');
    if (dataInput) dataInput.value = dataSugerida;
}

// 7. Modal de Sugestões Inteligentes de Temas (Regra dos 90 Dias & Alocação em Terça/Quinta)
function abrirModalSugestaoTemas(mesIndex0) {
    const modal = document.getElementById('modalSugestaoTemasPat');
    if (!modal) return;
    if (typeof mesIndex0 === 'number') {
        modalSugestaoMesAlvoIndex = mesIndex0;
    } else {
        modalSugestaoMesAlvoIndex = new Date().getMonth();
    }
    const selMes = document.getElementById('modalSugestaoMesAlvo');
    if (selMes) selMes.value = String(modalSugestaoMesAlvoIndex);

    modal.style.display = 'flex';
    renderSugestoesTemasModal();
}

function fecharModalSugestaoTemas() {
    const modal = document.getElementById('modalSugestaoTemasPat');
    if (modal) modal.style.display = 'none';
}

function filtrarAbaSugestaoTemas(aba) {
    modalSugestaoFiltroAtual = aba;
    ['recomendados', 'ineditos', 'liberados', 'bloqueados'].forEach(a => {
        const btn = document.getElementById('btnSugFiltro-' + a);
        if (btn) btn.classList.toggle('active', a === aba);
    });
    renderSugestoesTemasModal();
}

function renderSugestoesTemasModal() {
    const container = document.getElementById('conteudoSugestoesTemasModal');
    if (!container) return;

    const selMes = document.getElementById('modalSugestaoMesAlvo');
    if (selMes) modalSugestaoMesAlvoIndex = parseInt(selMes.value, 10);

    const mesIdx = modalSugestaoMesAlvoIndex;
    const ano = patAnoAtual;
    const infoSazonal = CAMPANHAS_SAZONAIS_SST[mesIdx];

    // Terças e Quintas do mês
    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
    const datasOcupadas = new Set(
        (allTreinamentosCronograma || [])
            .filter(c => {
                if (!c.data_prevista) return false;
                const d = parseLocalDate(c.data_prevista);
                return d.getFullYear() === ano && d.getMonth() === mesIdx;
            })
            .map(c => c.data_prevista)
    );
    const vagasLivres = terQuintas.filter(tq => !datasOcupadas.has(tq.iso));
    const proximaDataSugerida = vagasLivres.length > 0 ? vagasLivres[0] : null;

    const dataRefIso = proximaDataSugerida ? proximaDataSugerida.iso : `${ano}-${String(mesIdx + 1).padStart(2, '0')}-15`;

    // Mapear temas já cadastrados neste mês para BLOQUEIO ABSOLUTO DE DUPLICIDADE
    const temasJaNoMes = new Map();
    (allTreinamentosCronograma || []).forEach(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        if (d.getFullYear() === ano && d.getMonth() === mesIdx) {
            temasJaNoMes.set(c.treinamento_cod, c.data_prevista);
        }
    });

    const catalogo = allTreinamentosCatalogo || [];

    // Avaliar carência de todos os temas do catálogo
    const todosAvaliados = catalogo.map(c => {
        const jaNoMesData = temasJaNoMes.get(c.id);
        const carencia = calcularCarenciaTema(c.nome, dataRefIso);
        return {
            ...c,
            jaNoMesData,
            carencia
        };
    });

    let listaFiltrada = [];

    if (modalSugestaoFiltroAtual === 'recomendados') {
        const codigosSazonais = new Set(infoSazonal.temasSugeridos);
        listaFiltrada = todosAvaliados.filter(item => {
            if (codigosSazonais.has(item.id)) return true;
            return item.carencia.status === 'inedito' || (item.carencia.status === 'liberado' && item.carencia.dias >= 120);
        });

        listaFiltrada.sort((a, b) => {
            // Se já está no mês, joga para o fim
            if (!!a.jaNoMesData !== !!b.jaNoMesData) return a.jaNoMesData ? 1 : -1;
            const aSazonal = codigosSazonais.has(a.id) ? 1 : 0;
            const bSazonal = codigosSazonais.has(b.id) ? 1 : 0;
            if (aSazonal !== bSazonal) return bSazonal - aSazonal;
            const aInedito = a.carencia.status === 'inedito' ? 1 : 0;
            const bInedito = b.carencia.status === 'inedito' ? 1 : 0;
            if (aInedito !== bInedito) return bInedito - aInedito;
            return (b.carencia.dias || 0) - (a.carencia.dias || 0);
        });
    } else if (modalSugestaoFiltroAtual === 'ineditos') {
        listaFiltrada = todosAvaliados.filter(item => item.carencia.status === 'inedito');
    } else if (modalSugestaoFiltroAtual === 'liberados') {
        listaFiltrada = todosAvaliados.filter(item => item.carencia.status === 'liberado' && !item.jaNoMesData);
        listaFiltrada.sort((a, b) => (b.carencia.dias || 0) - (a.carencia.dias || 0));
    } else if (modalSugestaoFiltroAtual === 'bloqueados') {
        listaFiltrada = todosAvaliados.filter(item => item.carencia.status === 'bloqueado' || !!item.jaNoMesData);
        listaFiltrada.sort((a, b) => (a.carencia.dias || 0) - (b.carencia.dias || 0));
    }

    if (listaFiltrada.length === 0) {
        container.innerHTML = `
            <div style="padding:30px; text-align:center; color:var(--text-light); font-size:13px;">
                Nenhum tema encontrado para este filtro no mês selecionado.
            </div>
        `;
        return;
    }

    let html = `
        <div style="font-size:12px; color:var(--text-light); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div>
                Mostrando <strong>${listaFiltrada.length} tema(s)</strong> para <strong>${infoSazonal.nomeMes}/${ano}</strong>
                ${proximaDataSugerida 
                    ? ` • Próxima vaga regular: <strong style="color:#059669;">${formatSimpleDate(proximaDataSugerida.iso)} (${proximaDataSugerida.diaSemanaNome})</strong>`
                    : ' • <span style="color:#b45309; font-weight:700;">Todas as Terças e Quintas do mês já preenchidas</span>'
                }
            </div>
            <span style="font-size:11px; background:#f1f5f9; padding:2px 8px; border-radius:4px;">Carência mínima: <strong>90 dias</strong></span>
        </div>
        <div style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
    `;

    listaFiltrada.slice(0, 60).forEach(item => {
        const car = item.carencia;
        let badgeStatus = '';
        let podeInserir = true;

        if (item.jaNoMesData) {
            podeInserir = false;
            badgeStatus = `<span style="background:#fee2e2; color:#991b1b; font-weight:700; font-size:10.5px; padding:3px 8px; border-radius:999px; border:1px solid #fecaca;">⛔ JÁ AGENDADO NESTE MÊS (${formatSimpleDate(item.jaNoMesData)})</span>`;
        } else if (car.status === 'inedito') {
            badgeStatus = `<span style="background:#e0e7ff; color:#3730a3; font-weight:700; font-size:10.5px; padding:3px 8px; border-radius:999px; border:1px solid #c7d2fe;">🏆 INÉDITO NA OBRA</span>`;
        } else if (car.status === 'liberado') {
            const meses = Math.floor(car.dias / 30);
            badgeStatus = `<span style="background:#d1fae5; color:#065f46; font-weight:700; font-size:10.5px; padding:3px 8px; border-radius:999px; border:1px solid #a7f3d0;" title="Última aplicação em ${formatSimpleDate(car.ultimaData)}">✅ LIBERADO (há ${meses} meses / ${car.dias} dias)</span>`;
        } else if (car.agendadoFuturo) {
            podeInserir = false;
            badgeStatus = `<span style="background:#fef3c7; color:#92400e; font-weight:700; font-size:10.5px; padding:3px 8px; border-radius:999px; border:1px solid #fde68a;" title="Já programado no cronograma para ${formatSimpleDate(car.ultimaData)}">⏳ JÁ AGENDADO (${formatSimpleDate(car.ultimaData)})</span>`;
        } else {
            podeInserir = false;
            badgeStatus = `<span style="background:#fee2e2; color:#991b1b; font-weight:700; font-size:10.5px; padding:3px 8px; border-radius:999px; border:1px solid #fecaca;" title="Aplicado recentemente em ${formatSimpleDate(car.ultimaData)}">⚠️ RECENTE (há ${car.dias} dias - carência 90d ativa)</span>`;
        }

        const ehCampanhaMes = (CAMPANHAS_SAZONAIS_SST[mesIdx].temasSugeridos.includes(item.id));

        html += `
            <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:12px; ${ehCampanhaMes ? 'border-left:4px solid #db2777; background:rgba(219,39,119,0.02);' : ''}">
                <div style="overflow:hidden;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                        <span style="font-weight:700; color:var(--text); font-size:12.5px;">[${escapeHTML(item.id)}] ${escapeHTML(item.nome)}</span>
                        ${ehCampanhaMes ? `<span style="background:#fce7f3; color:#be185d; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">🌟 CAMPANHA DO MÊS</span>` : ''}
                        ${badgeStatus}
                    </div>
                    <div style="font-size:11px; color:var(--text-light); line-height:1.3;">
                        <span>⏱️ Carga Horária: <strong>${item.carga_horaria || 2}h</strong></span>
                        ${item.meses_validade ? `<span> • Validade: <strong>${item.meses_validade} meses</strong></span>` : ''}
                        ${car.ultimaData ? `<span> • Última vez ministrado: <strong>${formatSimpleDate(car.ultimaData)}</strong></span>` : ''}
                        ${item.objetivo ? `<div style="margin-top:2px; font-style:italic;">🎯 ${escapeHTML(item.objetivo.slice(0, 140))}${item.objetivo.length > 140 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
                <div style="flex-shrink:0;">
                    <button class="db-apply-btn" onclick="inserirTemaSugeridoNoPat('${escapeHTML(item.id)}', ${mesIdx})" ${!podeInserir ? 'disabled style="opacity:0.5; cursor:not-allowed; background:#94a3b8;"' : 'style="background:#2563eb; color:#fff;"'} style="font-size:11px; padding:6px 12px; font-weight:700; white-space:nowrap;">
                        ${item.jaNoMesData ? '✓ Já no Mês' : '➕ Agendar no Mês'}
                    </button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// 8. Inserção Segura de Tema no PAT (Bloqueia Duplicidade e Aloca na Próxima Terça/Quinta)
async function inserirTemaSugeridoNoPat(codigoTreinamento, mesIdx) {
    const ano = patAnoAtual;
    const cat = (allTreinamentosCatalogo || []).find(c => c.id === codigoTreinamento);
    if (!cat) {
        alert('Treinamento não encontrado.');
        return;
    }

    // 1. REGRA DE OURO: Bloquear duplicidade absoluta no mesmo mês
    const jaNoMes = (allTreinamentosCronograma || []).find(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d.getFullYear() === ano && d.getMonth() === mesIdx && c.treinamento_cod === codigoTreinamento;
    });

    if (jaNoMes) {
        alert(`⚠️ DUPLICIDADE BLOQUEADA!\n\nO treinamento "[${cat.id}] ${cat.nome}" já está agendado neste mês para o dia ${formatSimpleDate(jaNoMes.data_prevista)}.\n\nPara garantir variedade e evitar sobrecarga pedagógica, o mesmo tema não pode ser lançado duas vezes no mesmo mês.`);
        return;
    }

    // 2. Determinar a data: alocar na primeira Terça ou Quinta-feira livre do mês
    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
    const datasOcupadas = new Set(
        (allTreinamentosCronograma || [])
            .filter(c => {
                if (!c.data_prevista) return false;
                const d = parseLocalDate(c.data_prevista);
                return d.getFullYear() === ano && d.getMonth() === mesIdx;
            })
            .map(c => c.data_prevista)
    );

    const proximaLivre = terQuintas.find(tq => !datasOcupadas.has(tq.iso));
    let dataPrevista = '';
    let diaLabel = '';

    if (proximaLivre) {
        dataPrevista = proximaLivre.iso;
        diaLabel = `${formatSimpleDate(proximaLivre.iso)} (${proximaLivre.diaSemanaNome})`;
    } else {
        // Se todas as terças e quintas regulares já estiverem ocupadas
        const diaUltimo = terQuintas.length > 0 ? terQuintas[terQuintas.length - 1].dia + 1 : 15;
        const diaStr = String(Math.min(diaUltimo, new Date(ano, mesIdx + 1, 0).getDate())).padStart(2, '0');
        const mesStr = String(mesIdx + 1).padStart(2, '0');
        dataPrevista = `${ano}-${mesStr}-${diaStr}`;
        diaLabel = `${formatSimpleDate(dataPrevista)} (Treinamento Extraordinário)`;
    }

    // 3. Verificar carência de 90 dias
    const carencia = calcularCarenciaTema(cat.nome, dataPrevista);
    if (carencia.status === 'bloqueado' && !carencia.agendadoFuturo) {
        const conf = confirm(
            `⚠️ ATENÇÃO: Carência de 90 Dias Ativa!\n\n` +
            `O tema "${cat.nome}" foi ministrado há ${carencia.dias} dias em ${formatSimpleDate(carencia.ultimaData)}.\n\n` +
            `A regra de SST da obra recomenda carência mínima de 90 dias (3 meses) para evitar temas repetitivos.\n\n` +
            `Deseja forçar o agendamento para ${diaLabel} mesmo assim?`
        );
        if (!conf) return;
    }

    const row = {
        id: 'crono_pat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        data_prevista: dataPrevista,
        treinamento_cod: codigoTreinamento,
        horario: '08:00',
        local: 'Canteiro Central / EBs / Frentes de Obra',
        responsavel: 'Engenharia de Segurança (SESMT)',
        status: 'planejado',
        observacoes: `PAT ${ano} — Mês de ${CAMPANHAS_SAZONAIS_SST[mesIdx].nomeMes} (${diaLabel}).`
    };

    try {
        await supabaseUpsert('treinamentos_cronograma', [row]);
        allTreinamentosCronograma.push(row);

        if (typeof showToast === 'function') {
            showToast(`✅ Treinamento "${cat.nome}" agendado no PAT para ${diaLabel}!`, 'success');
        } else {
            alert(`✅ Treinamento "${cat.nome}" agendado com sucesso para ${diaLabel}!`);
        }

        renderPlanoAnualTreinamento();
        renderSugestoesTemasModal();
    } catch (err) {
        console.error('Erro ao agendar tema no PAT:', err);
        alert('❌ Falha ao agendar: ' + err.message);
    }
}

// 9. Gerador Automático de PAT Anual (Preenchimento em Terças e Quintas sem Repetição)
async function confirmarGerarSugestaoPat() {
    const ano = patAnoAtual;
    const conf = confirm(
        `📅 GERADOR ANUAL DO PAT — EXERCÍCIO ${ano}\n\n` +
        `O sistema distribuirá automaticamente treinamentos normativos e de campanhas sazonais para os 12 meses (Janeiro a Dezembro), respeitando:\n\n` +
        `• Alocação nas Terças e Quintas-feiras do cronograma regular de SST;\n` +
        `• Carência mínima de 90 dias (sem temas repetidos no mesmo mês ou trimestre);\n` +
        `• Prioridade para campanhas oficiais de cada mês e NRs de alto impacto.\n\n` +
        `Deseja gerar a programação anual agora?`
    );
    if (!conf) return;

    const novosItens = [];
    const codigosUsadosRecentemente = new Set();

    for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
        const info = CAMPANHAS_SAZONAIS_SST[mesIdx];
        const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
        if (terQuintas.length === 0) continue;

        // Identificar datas já ocupadas no mês
        const datasOcupadas = new Set(
            (allTreinamentosCronograma || [])
                .filter(c => {
                    if (!c.data_prevista) return false;
                    const d = parseLocalDate(c.data_prevista);
                    return d.getFullYear() === ano && d.getMonth() === mesIdx;
                })
                .map(c => c.data_prevista)
        );

        // Selecionar 2 datas de Terças/Quintas para alocação no mês
        const datasLivres = terQuintas.filter(tq => !datasOcupadas.has(tq.iso));
        if (datasLivres.length === 0) continue;

        const datasAlvo = [
            datasLivres[0],
            datasLivres[Math.min(2, datasLivres.length - 1)]
        ];

        // Selecionar 2 treinamentos estratégicos para cada mês
        const temasCandidatos = info.temasSugeridos || [];
        const temasEscolhidos = [];

        for (const cod of temasCandidatos) {
            if (temasEscolhidos.length >= datasAlvo.length) break;
            if (codigosUsadosRecentemente.has(cod)) continue;
            const cat = (allTreinamentosCatalogo || []).find(c => c.id === cod);
            if (!cat) continue;

            const carencia = calcularCarenciaTema(cat.nome, datasAlvo[temasEscolhidos.length].iso);
            if (carencia.status === 'inedito' || (carencia.status === 'liberado' && carencia.dias >= 90)) {
                temasEscolhidos.push(cod);
                codigosUsadosRecentemente.add(cod);
            }
        }

        // Se a campanha sugerida não tiver 2 liberados, pega do catálogo geral inédito
        if (temasEscolhidos.length < datasAlvo.length) {
            for (const cat of (allTreinamentosCatalogo || [])) {
                if (temasEscolhidos.length >= datasAlvo.length) break;
                if (temasEscolhidos.includes(cat.id) || codigosUsadosRecentemente.has(cat.id)) continue;
                const carencia = calcularCarenciaTema(cat.nome, datasAlvo[temasEscolhidos.length].iso);
                if (carencia.status === 'inedito') {
                    temasEscolhidos.push(cat.id);
                    codigosUsadosRecentemente.add(cat.id);
                }
            }
        }

        temasEscolhidos.forEach((cod, idx) => {
            const dataVaga = datasAlvo[idx] || datasLivres[0];
            const cat = (allTreinamentosCatalogo || []).find(c => c.id === cod);
            if (cat) {
                novosItens.push({
                    id: 'crono_pat_auto_' + ano + '_' + String(mesIdx + 1).padStart(2, '0') + '_' + cod + '_' + Math.random().toString(36).slice(2, 6),
                    data_prevista: dataVaga.iso,
                    treinamento_cod: cod,
                    horario: '08:00',
                    local: 'Canteiro Central / EBs / Frentes de Obra',
                    responsavel: 'Engenharia de Segurança (SESMT)',
                    status: 'planejado',
                    observacoes: `PAT ${ano} Oficial — Cronograma Regular (${dataVaga.diaSemanaNome}) — ${info.campanha}`
                });
            }
        });
    }

    if (novosItens.length === 0) {
        alert('Todas as datas estratégicas já estão preenchidas para este ano.');
        return;
    }

    try {
        await supabaseUpsert('treinamentos_cronograma', novosItens);
        novosItens.forEach(item => allTreinamentosCronograma.push(item));

        alert(`🎉 PAT ${ano} gerado com sucesso! ${novosItens.length} ações normativas e sazonais foram distribuídas nas Terças e Quintas-feiras ao longo dos 12 meses.`);
        renderPlanoAnualTreinamento();
    } catch (err) {
        console.error('Erro ao gerar PAT anual:', err);
        alert('❌ Falha ao salvar PAT: ' + err.message);
    }
}

// 10. Emissão do Documento Oficial do PAT em PDF Timbrado (Com Dia da Semana)
function emitirPatOficialDocumento() {
    const ano = patAnoAtual;
    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));

    const itensAno = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        return parseLocalDate(c.data_prevista).getFullYear() === ano;
    }).sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));

    if (itensAno.length === 0) {
        alert(`Nenhuma ação encontrada no PAT para o ano de ${ano}. Agende treinamentos antes de emitir o documento oficial.`);
        return;
    }

    const totalAcoes = itensAno.length;
    let totalHoras = 0;
    itensAno.forEach(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        totalHoras += (cat && cat.carga_horaria) ? parseFloat(cat.carga_horaria) : 2;
    });

    const linhasTabela = itensAno.map(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const nome = cat ? cat.nome : c.treinamento_cod;
        const ch = (cat && cat.carga_horaria) ? cat.carga_horaria + 'h' : '2h';
        const modalidade = (cat && cat.carga_horaria >= 8) ? 'Teórico / Prático' : 'Diálogo / Teórico';
        const infoDia = obterInfoDiaSemana(c.data_prevista);
        const dataFmt = c.data_prevista ? `${formatSimpleDate(c.data_prevista)} (${infoDia.curto})` : '—';
        const statusFmt = (c.status === 'lancado' || c.status === 'concluido') ? 'Realizado' : 'Planejado';

        return `
            <tr>
                <td style="text-align:center; font-weight:700;">${dataFmt}</td>
                <td style="text-align:center; font-weight:700;">${escapeHTML(c.treinamento_cod)}</td>
                <td style="font-weight:600;">${escapeHTML(nome)}</td>
                <td style="text-align:center;">${ch}</td>
                <td>${escapeHTML(modalidade)}</td>
                <td>${escapeHTML(c.local || 'Canteiro / Frentes de Obra')}</td>
                <td>${escapeHTML(c.responsavel || 'SESMT')}</td>
                <td style="text-align:center;">${statusFmt}</td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Plano Anual de Treinamento (PAT ${ano}) - COP Ramal do Agreste</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; background: #fff; }
        .folha { max-width: 1050px; margin: 0 auto; }
        .cabecalho { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
        .cabecalho img { max-height: 52px; object-fit: contain; }
        .cabecalho-texto { text-align: right; }
        .cabecalho-texto h1 { font-size: 16px; margin: 0; color: #1e3a8a; font-weight: 800; }
        .cabecalho-texto p { font-size: 11px; margin: 3px 0 0; color: #64748b; font-weight: 600; }
        .quadro-resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 11px; }
        .quadro-item b { display: block; color: #1e3a8a; font-size: 12px; }
        h2 { font-size: 12.5px; color: #1e3a8a; border-left: 4px solid #2563eb; padding-left: 8px; margin: 14px 0 6px; text-transform: uppercase; }
        p.justificativa { font-size: 11px; text-align: justify; line-height: 1.45; color: #334155; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; }
        th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; }
        .assinaturas { margin-top: 36px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
        .assinatura-box { width: 340px; border-top: 1px solid #000; padding-top: 6px; font-size: 11px; }
        .no-print { text-align: center; margin-bottom: 16px; position: sticky; top: 0; background: #fff; padding: 10px; border-bottom: 1px solid #e2e8f0; z-index: 1000; }
        .no-print button { padding: 9px 22px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 6px; border: none; background: #2563eb; color: #fff; }
        @media print { .no-print { display: none; } body { padding: 0; } }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    </div>
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="Consórcio Operador Ramal do Agreste">
            <div class="cabecalho-texto">
                <h1>PLANO ANUAL DE TREINAMENTO — PAT ${ano}</h1>
                <p>Programa de Capacitação Contínua em SST • NR-01 item 1.5.7 e NR-18 item 18.14</p>
            </div>
        </div>

        <div class="quadro-resumo">
            <div class="quadro-item">
                <span style="color:#64748b;">Obra / Contrato:</span>
                <b>PISF — Ramal do Agreste</b>
            </div>
            <div class="quadro-item">
                <span style="color:#64748b;">Exercício Anual:</span>
                <b>Ano Base ${ano}</b>
            </div>
            <div class="quadro-item">
                <span style="color:#64748b;">Ações Programadas:</span>
                <b>${totalAcoes} Ações de Capacitação</b>
            </div>
            <div class="quadro-item">
                <span style="color:#64748b;">Carga Horária Total Prevista:</span>
                <b>${totalHoras} Horas (HHT)</b>
            </div>
        </div>

        <h2>1. Objetivo e Diretrizes Normativas</h2>
        <p class="justificativa">
            O presente <strong>Plano Anual de Treinamento (PAT)</strong> estabelece o planejamento técnico e pedagógico das capacitações, reciclagens normativas e ações preventivas a serem ministradas aos colaboradores do <strong>Consórcio Operador do Ramal do Agreste</strong> ao longo do exercício de ${ano}. O plano foi estruturado em estrita conformidade com o <em>item 1.5.7 da NR-01 (Capacitação e Treinamento em Segurança e Saúde no Trabalho)</em>, <em>item 18.14 da NR-18 (Capacitação na Indústria da Construção)</em>, bem como os requisitos das NRs 06, 10, 11, 12, 17, 23, 33 e 35. As sessões regulares de treinamento e conscientização são realizadas prioritariamente às <strong>Terças e Quintas-feiras</strong>, integradas às campanhas mensais de conscientização e procedimentos operacionais das Estações de Bombeamento (EBs).
        </p>

        <h2>2. Cronograma Executivo de Treinamentos (${ano})</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 105px; text-align:center;">Data Prevista</th>
                    <th style="width: 45px; text-align:center;">Cód.</th>
                    <th>Título do Curso / Tema de SST</th>
                    <th style="width: 55px; text-align:center;">C.H.</th>
                    <th style="width: 105px;">Modalidade</th>
                    <th style="width: 130px;">Local / Frentes</th>
                    <th style="width: 100px;">Responsável</th>
                    <th style="width: 65px; text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>

        <h2>3. Responsabilidade Técnica e Aprovação</h2>
        <p class="justificativa">
            Este plano é de aplicação obrigatória em todas as frentes de serviço, canteiros de apoio e Estações de Bombeamento (EB-01, EB-02, EB-03 e EB-04) do Consórcio Ramal do Agreste, devendo sua execução ser monitorada mensalmente pelo SESMT.
        </p>

        <div class="assinaturas">
            <div class="assinatura-box">
                <strong>João Everton de Souza Limeira</strong><br>
                Engenheiro de Segurança do Trabalho<br>
                CREA: 0522078320-BA • Responsável Técnico SST
            </div>
            <div class="assinatura-box">
                <strong>Gerência de Operações e Contrato</strong><br>
                Consórcio Operador do Ramal do Agreste<br>
                Ciência e Aprovação de Recursos
            </div>
        </div>
    </div>
</body>
</html>`;

    abrirDocumentoHtmlParaImpressao(html, `PAT_${ano}_Consorcio_Ramal_do_Agreste`);
}

// 11. Exportação do PAT para Planilha Excel (Com Dia da Semana)
function exportarPatExcel() {
    const ano = patAnoAtual;
    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));

    const itensAno = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        return parseLocalDate(c.data_prevista).getFullYear() === ano;
    }).sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));

    if (itensAno.length === 0) {
        alert(`Nenhuma ação encontrada no PAT para o ano de ${ano}.`);
        return;
    }

    const rows = itensAno.map(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const infoDia = obterInfoDiaSemana(c.data_prevista);
        return {
            'Ano': ano,
            'Mês': CAMPANHAS_SAZONAIS_SST[parseLocalDate(c.data_prevista).getMonth()].nomeMes,
            'Data Prevista': formatSimpleDate(c.data_prevista),
            'Dia da Semana': infoDia.nome,
            'Tipo de Cronograma': infoDia.ehTerOuQui ? 'Regular (Terça/Quinta)' : 'Extraordinário',
            'Código': c.treinamento_cod,
            'Título do Treinamento': cat ? cat.nome : c.treinamento_cod,
            'Carga Horária (h)': (cat && cat.carga_horaria) ? parseFloat(cat.carga_horaria) : 2,
            'Local': c.local || 'Canteiro / Frentes de Obra',
            'Responsável': c.responsavel || 'SESMT',
            'Status': (c.status === 'lancado' || c.status === 'concluido') ? 'Realizado' : 'Planejado',
            'Observações': c.observacoes || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `PAT ${ano}`);
    XLSX.writeFile(wb, `PAT_${ano}_Consorcio_Ramal_do_Agreste.xlsx`);
}


// =====================================================================
// FUNÇÕES DE ADIÇÃO COM ESCOLHA DE DATA E REPROGRAMAÇÃO / PERMUTA
// =====================================================================

// 1. Modal Adicionar Ação no Mês com Escolha Direta de Data
function abrirModalAdicionarAcaoPat(mesIdx) {
    const modal = document.getElementById('modalAdicionarAcaoPat');
    if (!modal) return;

    const ano = patAnoAtual;
    const infoSazonal = CAMPANHAS_SAZONAIS_SST[mesIdx];
    document.getElementById('patAdd_mesIdx').value = String(mesIdx);
    document.getElementById('patAddModalTitulo').textContent = `Agendar Treinamento — ${infoSazonal.nomeMes}/${ano}`;
    document.getElementById('patAdd_statusMsg').textContent = '';

    // 1. Terças e Quintas do mês
    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);
    const itensMes = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d.getFullYear() === ano && d.getMonth() === mesIdx;
    });

    const ocupadasMap = new Map();
    itensMes.forEach(c => ocupadasMap.set(c.data_prevista, c));

    // Próxima vaga livre de Terça/Quinta
    const proximaLivre = terQuintas.find(tq => !ocupadasMap.has(tq.iso));
    const dataInicial = proximaLivre ? proximaLivre.iso : `${ano}-${String(mesIdx + 1).padStart(2, '0')}-15`;
    const inputData = document.getElementById('patAdd_data');
    inputData.value = dataInicial;
    inputData.min = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-01`;
    const diasNoMes = new Date(ano, mesIdx + 1, 0).getDate();
    inputData.max = `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(diasNoMes).padStart(2, '0')}`;

    // Renderizar atalhos de Terças e Quintas
    const atalhosContainer = document.getElementById('patAdd_atalhosDatas');
    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));

    atalhosContainer.innerHTML = terQuintas.map(tq => {
        const itemOcupado = ocupadasMap.get(tq.iso);
        if (!itemOcupado) {
            return `<button type="button" class="db-clear-btn" onclick="patAddPreencherData('${tq.iso}')" style="font-size:11px; padding:3px 7px; color:#047857; background:#ecfdf5; border-color:#a7f3d0; font-weight:700;">
                🟢 ${tq.diaSemanaCurto} ${String(tq.dia).padStart(2, '0')} (Livre)
            </button>`;
        } else {
            const cat = catalogoPorId.get(itemOcupado.treinamento_cod);
            const nomeCurto = cat ? cat.nome.slice(0, 16) + '...' : itemOcupado.treinamento_cod;
            return `<button type="button" class="db-clear-btn" onclick="patAddPreencherData('${tq.iso}')" style="font-size:11px; padding:3px 7px; color:#b45309; background:#fef3c7; border-color:#fde68a;" title="[${itemOcupado.treinamento_cod}] ${cat ? cat.nome : ''}">
                🔴 ${tq.diaSemanaCurto} ${String(tq.dia).padStart(2, '0')} [${itemOcupado.treinamento_cod}]
            </button>`;
        }
    }).join('');

    onPatAddDataChange();

    // Popular select de treinamentos (EXCLUINDO TEMAS QUE JÁ ESTÃO NO MÊS)
    const selectTrein = document.getElementById('patAdd_treinamento');
    const codigosJaNoMes = new Set(itensMes.map(c => String(c.treinamento_cod).trim()));

    const opcoes = (allTreinamentosCatalogo || [])
        .filter(c => !codigosJaNoMes.has(String(c.id).trim()))
        .map(c => {
            const carencia = calcularCarenciaTema(c.nome, dataInicial);
            let tag = '🏆 Inédito';
            if (carencia.status === 'liberado') tag = `✅ Liberado (${carencia.dias}d)`;
            else if (carencia.status === 'bloqueado') tag = `⚠️ Recente (${carencia.dias}d)`;
            return {
                id: c.id,
                texto: `[${c.id}] ${c.nome} (${c.carga_horaria || 2}h - ${tag})`,
                carencia
            };
        });

    selectTrein.innerHTML = opcoes.map(op => `<option value="${escapeHTML(op.id)}">${escapeHTML(op.texto)}</option>`).join('');
    onPatAddTreinamentoChange();

    modal.style.display = 'flex';
}

function fecharModalAdicionarAcaoPat() {
    const modal = document.getElementById('modalAdicionarAcaoPat');
    if (modal) modal.style.display = 'none';
}

function patAddPreencherData(isoData) {
    const input = document.getElementById('patAdd_data');
    if (input) {
        input.value = isoData;
        onPatAddDataChange();
    }
}

function onPatAddDataChange() {
    const val = document.getElementById('patAdd_data').value;
    const badge = document.getElementById('patAdd_diaSemanaBadge');
    if (!val) {
        if (badge) badge.textContent = '';
        return;
    }
    const info = obterInfoDiaSemana(val);
    if (badge) {
        badge.textContent = info.nome;
        if (info.ehTerOuQui) {
            badge.style.color = '#047857';
            badge.style.background = '#ecfdf5';
            badge.style.borderColor = '#10b981';
        } else {
            badge.style.color = '#b45309';
            badge.style.background = '#fef3c7';
            badge.style.borderColor = '#fde68a';
        }
    }
}

function onPatAddTreinamentoChange() {
    const cod = document.getElementById('patAdd_treinamento').value;
    const cat = (allTreinamentosCatalogo || []).find(c => c.id === cod);
    const feedback = document.getElementById('patAdd_carenciaFeedback');
    if (!cat || !feedback) return;

    const data = document.getElementById('patAdd_data').value;
    const carencia = calcularCarenciaTema(cat.nome, data);

    if (carencia.status === 'inedito') {
        feedback.innerHTML = '<span style="color:#3730a3; font-weight:700;">🏆 Tema inédito na obra — excelente variedade!</span>';
    } else if (carencia.status === 'liberado') {
        feedback.innerHTML = `<span style="color:#059669; font-weight:700;">✅ Liberado para aplicação (última vez em ${formatSimpleDate(carencia.ultimaData)}, há ${carencia.dias} dias).</span>`;
    } else {
        feedback.innerHTML = `<span style="color:#dc2626; font-weight:700;">⚠️ Carência ativa: aplicado há ${carencia.dias} dias em ${formatSimpleDate(carencia.ultimaData)} (menos de 90 dias).</span>`;
    }
}

async function salvarAcaoPatComData() {
    const mesIdx = parseInt(document.getElementById('patAdd_mesIdx').value, 10);
    const ano = patAnoAtual;
    const data = document.getElementById('patAdd_data').value;
    const codigo = document.getElementById('patAdd_treinamento').value;
    const horario = document.getElementById('patAdd_horario').value;
    const responsavel = document.getElementById('patAdd_responsavel').value.trim();
    const local = document.getElementById('patAdd_local').value.trim();
    const statusEl = document.getElementById('patAdd_statusMsg');

    if (!data) {
        alert('Por favor, informe a data do treinamento.');
        return;
    }
    if (!codigo) {
        alert('Por favor, selecione um treinamento do catálogo.');
        return;
    }

    const cat = (allTreinamentosCatalogo || []).find(c => c.id === codigo);
    if (!cat) {
        alert('Treinamento não encontrado no catálogo.');
        return;
    }

    // REGRA DE OURO: Bloquear duplicidade de código no mesmo mês
    const dNova = parseLocalDate(data);
    const anoNova = dNova.getFullYear();
    const mesNova = dNova.getMonth();

    const duplicadoNoMes = (allTreinamentosCronograma || []).find(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d.getFullYear() === anoNova && d.getMonth() === mesNova && String(c.treinamento_cod).trim() === String(codigo).trim();
    });

    if (duplicadoNoMes) {
        alert(`⚠️ BLOQUEIO DE DUPLICIDADE!\n\nO treinamento "[${cat.id}] ${cat.nome}" já está agendado neste mesmo mês para o dia ${formatSimpleDate(duplicadoNoMes.data_prevista)}.\n\nNão é permitido agendar o mesmo tema duas vezes no mesmo mês.`);
        return;
    }

    // Avaliar carência de 90 dias
    const carencia = calcularCarenciaTema(cat.nome, data);
    if (carencia.status === 'bloqueado' && !carencia.agendadoFuturo) {
        const conf = confirm(`⚠️ ATENÇÃO: O tema "${cat.nome}" foi ministrado há ${carencia.dias} dias (menos de 90 dias).\n\nDeseja agendar mesmo assim?`);
        if (!conf) return;
    }

    const infoDia = obterInfoDiaSemana(data);
    const row = {
        id: 'crono_pat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        data_prevista: data,
        treinamento_cod: codigo,
        horario: horario || '08:00',
        local: local || 'Canteiro Central / EBs / Frentes de Obra',
        responsavel: responsavel || 'Engenharia de Segurança (SESMT)',
        status: 'planejado',
        observacoes: `PAT ${anoNova} — ${infoDia.ehTerOuQui ? 'Cronograma Regular (' + infoDia.nome + ')' : 'Treinamento Extraordinário (${infoDia.nome})'}`
    };

    statusEl.textContent = 'Salvando agendamento...';
    statusEl.style.color = 'var(--text-light)';

    try {
        await supabaseUpsert('treinamentos_cronograma', [row]);
        allTreinamentosCronograma.push(row);

        statusEl.textContent = '✅ Treinamento agendado com sucesso!';
        statusEl.style.color = 'var(--success)';

        renderPlanoAnualTreinamento();
        renderCronogramaLista();

        setTimeout(() => fecharModalAdicionarAcaoPat(), 800);
    } catch (err) {
        console.error('Erro ao salvar treinamento no PAT:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// 2. Modal de Reprogramação de Datas e Permuta de Temas
var reprogramacaoAcaoAtual = 'mover'; // 'mover' | 'permutar'
var reprogramacaoOutroItemId = null;

function abrirModalReprogramarCronograma(id) {
    const modal = document.getElementById('modalReprogramarCronograma');
    if (!modal) return;

    const item = (allTreinamentosCronograma || []).find(c => c.id === id);
    if (!item) return;

    const cat = (allTreinamentosCatalogo || []).find(c => c.id === item.treinamento_cod);
    const nomeTema = cat ? cat.nome : item.treinamento_cod;
    const infoDia = obterInfoDiaSemana(item.data_prevista);

    document.getElementById('reprog_itemId').value = id;
    document.getElementById('reprog_temaNome').textContent = `[${item.treinamento_cod}] ${nomeTema}`;
    document.getElementById('reprog_dataAtualInfo').textContent = `📅 Data Atual: ${formatSimpleDate(item.data_prevista)} (${infoDia.nome})`;

    const inputData = document.getElementById('reprog_novaData');
    inputData.value = item.data_prevista || '';

    // Renderizar atalhos do mês
    const dObj = parseLocalDate(item.data_prevista);
    const ano = dObj.getFullYear();
    const mesIdx = dObj.getMonth();
    const terQuintas = obterTerceirasEQuintasDoMes(ano, mesIdx);

    const ocupadasMap = new Map();
    (allTreinamentosCronograma || []).forEach(c => {
        if (!c.data_prevista) return;
        const d = parseLocalDate(c.data_prevista);
        if (d.getFullYear() === ano && d.getMonth() === mesIdx) {
            ocupadasMap.set(c.data_prevista, c);
        }
    });

    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [c.id, c]));
    const atalhosContainer = document.getElementById('reprog_atalhosDatas');

    atalhosContainer.innerHTML = terQuintas.map(tq => {
        const itemOcupado = ocupadasMap.get(tq.iso);
        const ehProprio = itemOcupado && itemOcupado.id === id;
        if (ehProprio) {
            return `<button type="button" class="db-clear-btn" onclick="reprogPreencherData('${tq.iso}')" style="font-size:11px; padding:3px 7px; color:#2563eb; background:#eff6ff; border-color:#93c5fd; font-weight:800;">
                📍 ${tq.diaSemanaCurto} ${String(tq.dia).padStart(2, '0')} (Atual)
            </button>`;
        } else if (!itemOcupado) {
            return `<button type="button" class="db-clear-btn" onclick="reprogPreencherData('${tq.iso}')" style="font-size:11px; padding:3px 7px; color:#047857; background:#ecfdf5; border-color:#a7f3d0; font-weight:700;">
                🟢 ${tq.diaSemanaCurto} ${String(tq.dia).padStart(2, '0')} (Livre)
            </button>`;
        } else {
            const cOcup = catalogoPorId.get(itemOcupado.treinamento_cod);
            return `<button type="button" class="db-clear-btn" onclick="reprogPreencherData('${tq.iso}')" style="font-size:11px; padding:3px 7px; color:#b45309; background:#fef3c7; border-color:#fde68a;" title="[${itemOcupado.treinamento_cod}] ${cOcup ? cOcup.nome : ''}">
                🔄 ${tq.diaSemanaCurto} ${String(tq.dia).padStart(2, '0')} [${itemOcupado.treinamento_cod}]
            </button>`;
        }
    }).join('');

    // Preencher select de substituição de tema
    const selectSub = document.getElementById('reprog_substitutoTemaSelect');
    const codigosJaNoMes = new Set();
    ocupadasMap.forEach(c => {
        if (c.id !== id) codigosJaNoMes.add(String(c.treinamento_cod).trim());
    });

    const opcoes = (allTreinamentosCatalogo || [])
        .filter(c => !codigosJaNoMes.has(String(c.id).trim()))
        .map(c => `<option value="${c.id}">[${c.id}] ${c.nome} (${c.carga_horaria || 2}h)</option>`);
    selectSub.innerHTML = opcoes.join('');

    document.getElementById('reprog_statusMsg').textContent = '';
    avaliarDestinoReprogramacao();

    modal.style.display = 'flex';
}

function fecharModalReprogramarCronograma() {
    const modal = document.getElementById('modalReprogramarCronograma');
    if (modal) modal.style.display = 'none';
}

function reprogPreencherData(isoData) {
    const input = document.getElementById('reprog_novaData');
    if (input) {
        input.value = isoData;
        avaliarDestinoReprogramacao();
    }
}

function avaliarDestinoReprogramacao() {
    const itemId = document.getElementById('reprog_itemId').value;
    const item = (allTreinamentosCronograma || []).find(c => c.id === itemId);
    const novaData = document.getElementById('reprog_novaData').value;
    const painel = document.getElementById('reprog_painelDestino');
    const btnAcao = document.getElementById('reprog_btnAcaoPrincipal');
    const badge = document.getElementById('reprog_diaSemanaBadge');

    if (!item || !novaData) {
        painel.style.display = 'none';
        btnAcao.disabled = true;
        if (badge) badge.textContent = '';
        return;
    }

    const infoNova = obterInfoDiaSemana(novaData);
    if (badge) {
        badge.textContent = infoNova.nome;
        badge.style.color = infoNova.ehTerOuQui ? '#047857' : '#b45309';
        badge.style.background = infoNova.ehTerOuQui ? '#ecfdf5' : '#fef3c7';
    }

    if (novaData === item.data_prevista) {
        painel.style.display = 'block';
        painel.style.background = '#f8fafc';
        painel.style.border = '1px solid var(--border)';
        painel.innerHTML = '<span style="font-size:12px; color:var(--text-light);">ℹ️ A data selecionada é a mesma data atual. Selecione outra data para mover/permutar ou troque o tema abaixo.</span>';
        btnAcao.disabled = true;
        return;
    }

    // Verificar se a nova data já está ocupada por outro treinamento
    const outroItem = (allTreinamentosCronograma || []).find(c => c.id !== itemId && c.data_prevista === novaData);

    if (!outroItem) {
        // DATA LIVRE
        reprogramacaoAcaoAtual = 'mover';
        reprogramacaoOutroItemId = null;
        painel.style.display = 'block';
        painel.style.background = '#ecfdf5';
        painel.style.border = '1px solid #10b981';
        painel.innerHTML = `
            <div style="font-size:12px; font-weight:700; color:#065f46;">
                ✅ Data LIVRE no Cronograma!
            </div>
            <div style="font-size:11.5px; color:#047857; margin-top:2px;">
                O treinamento será transferido de <strong>${formatSimpleDate(item.data_prevista)}</strong> para <strong>${formatSimpleDate(novaData)} (${infoNova.nome})</strong>.
            </div>
        `;
        btnAcao.disabled = false;
        btnAcao.textContent = `📅 Mover para ${formatSimpleDate(novaData)}`;
        btnAcao.style.background = '#2563eb';
    } else {
        // DATA OCUPADA -> OPÇÃO DE PERMUTA
        reprogramacaoAcaoAtual = 'permutar';
        reprogramacaoOutroItemId = outroItem.id;
        const outroCat = (allTreinamentosCatalogo || []).find(c => c.id === outroItem.treinamento_cod);
        const outroNome = outroCat ? outroCat.nome : outroItem.treinamento_cod;

        painel.style.display = 'block';
        painel.style.background = '#fffbeb';
        painel.style.border = '1px solid #f59e0b';
        painel.innerHTML = `
            <div style="font-size:12px; font-weight:800; color:#b45309; display:flex; align-items:center; gap:6px;">
                <span>⚠️</span> Data Ocupada — Sugestão de Permuta / Inversão de Datas!
            </div>
            <div style="font-size:11.5px; color:#92400e; margin-top:4px; line-height:1.4;">
                A data <strong>${formatSimpleDate(novaData)}</strong> já possui o treinamento: <br>
                <strong>👉 [${outroItem.treinamento_cod}] ${escapeHTML(outroNome)}</strong>.
            </div>
            <div style="background:#fff; border:1px solid #fde68a; border-radius:6px; padding:8px; margin-top:6px; font-size:11px; color:#78350f;">
                <strong>🔀 Ação ao Confirmar (Troca de Datas):</strong><br>
                • <strong>[${item.treinamento_cod}]</strong> muda para <strong>${formatSimpleDate(novaData)}</strong><br>
                • <strong>[${outroItem.treinamento_cod}]</strong> muda para <strong>${formatSimpleDate(item.data_prevista)}</strong>
            </div>
        `;
        btnAcao.disabled = false;
        btnAcao.textContent = '🔀 Permutar / Trocar Datas dos 2 Temas';
        btnAcao.style.background = '#d97706';
    }
}

async function executarAcaoReprogramacao() {
    const itemId = document.getElementById('reprog_itemId').value;
    const novaData = document.getElementById('reprog_novaData').value;
    const statusEl = document.getElementById('reprog_statusMsg');
    const item = (allTreinamentosCronograma || []).find(c => c.id === itemId);

    if (!item || !novaData) return;

    statusEl.textContent = 'Processando reprogramação...';
    statusEl.style.color = 'var(--text-light)';

    try {
        if (reprogramacaoAcaoAtual === 'mover') {
            item.data_prevista = novaData;
            await supabaseUpsert('treinamentos_cronograma', [item]);
            statusEl.textContent = '✅ Treinamento movido com sucesso!';
            statusEl.style.color = 'var(--success)';
        } else if (reprogramacaoAcaoAtual === 'permutar') {
            const outroItem = (allTreinamentosCronograma || []).find(c => c.id === reprogramacaoOutroItemId);
            if (!outroItem) throw new Error('Outro item de permuta não encontrado.');

            const dataOriginal = item.data_prevista;
            item.data_prevista = novaData;
            outroItem.data_prevista = dataOriginal;

            await supabaseUpsert('treinamentos_cronograma', [item, outroItem]);
            statusEl.textContent = '✅ Datas permutadas com sucesso!';
            statusEl.style.color = 'var(--success)';
        }

        renderPlanoAnualTreinamento();
        renderCronogramaLista();

        setTimeout(() => fecharModalReprogramarCronograma(), 900);
    } catch (err) {
        console.error('Erro ao reprogramar:', err);
        statusEl.textContent = '❌ Falha ao reprogramar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function executarSubstituicaoTemaEmData() {
    const itemId = document.getElementById('reprog_itemId').value;
    const novoCodigo = document.getElementById('reprog_substitutoTemaSelect').value;
    const statusEl = document.getElementById('reprog_statusMsg');
    const item = (allTreinamentosCronograma || []).find(c => c.id === itemId);

    if (!item || !novoCodigo) return;

    const catNovo = (allTreinamentosCatalogo || []).find(c => c.id === novoCodigo);
    if (!catNovo) return;

    const conf = confirm(`Deseja realmente substituir o treinamento agendado em ${formatSimpleDate(item.data_prevista)} por "[${catNovo.id}] ${catNovo.nome}"?`);
    if (!conf) return;

    statusEl.textContent = 'Substituindo tema...';
    statusEl.style.color = 'var(--text-light)';

    try {
        item.treinamento_cod = novoCodigo;
        await supabaseUpsert('treinamentos_cronograma', [item]);

        statusEl.textContent = '✅ Tema substituído com sucesso!';
        statusEl.style.color = 'var(--success)';

        renderPlanoAnualTreinamento();
        renderCronogramaLista();

        setTimeout(() => fecharModalReprogramarCronograma(), 900);
    } catch (err) {
        console.error('Erro ao substituir tema:', err);
        statusEl.textContent = '❌ Falha ao substituir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Exportações globais de funções de Impressão de Formulários DDSMS
window.obterSemanasDoMes = obterSemanasDoMes;
window.inicializarDdsLote = inicializarDdsLote;
window.popularSelectSemanasDdsLote = popularSelectSemanasDdsLote;
window.popularSelectTemasDdsLote = popularSelectTemasDdsLote;
window.renderDdsLoteFrentesCheckboxes = renderDdsLoteFrentesCheckboxes;
window.atualizarResumoFrentesDdsLote = atualizarResumoFrentesDdsLote;
window.onDdsLoteFrenteCheckboxChange = onDdsLoteFrenteCheckboxChange;
window.marcarTodasFrentesDdsLote = marcarTodasFrentesDdsLote;
window.onDdsLoteFiltroMesAnoChange = onDdsLoteFiltroMesAnoChange;
window.onDdsLoteFiltroSemanaChange = onDdsLoteFiltroSemanaChange;
window.onDdsLoteFiltroTemaChange = onDdsLoteFiltroTemaChange;
window.limparFiltrosDdsLote = limparFiltrosDdsLote;
window.itensDdsLoteFiltrados = itensDdsLoteFiltrados;
window.renderDdsLotePreview = renderDdsLotePreview;
window.atualizarResumoDdsLote = atualizarResumoDdsLote;
window.onDdsLoteItemCheckboxChange = onDdsLoteItemCheckboxChange;
window.marcarTodosDdsLote = marcarTodosDdsLote;
window.construirFolhaFichaDds = construirFolhaFichaDds;
window.montarDocumentoImpressaoFichasDds = montarDocumentoImpressaoFichasDds;
window.imprimirFormulariosDdsLote = imprimirFormulariosDdsLote;
window.imprimirFichaDdsEmBranco = imprimirFichaDdsEmBranco;
window.salvarConfiguracoesDds = salvarConfiguracoesDds;
window.restaurarConfiguracoesDdsPadrao = restaurarConfiguracoesDdsPadrao;
window.atualizarExemploRegraSemana = atualizarExemploRegraSemana;
window.renderDdsConfiguracoes = renderDdsConfiguracoes;
window.carregarConfiguracoesDdsDoSupabase = carregarConfiguracoesDdsDoSupabase;

// =====================================================================
// CENTRAL INTELIGENTE DE ALERTAS E PENDÊNCIAS SST
// Gerenciamento de Riscos e Prazos: NR-01 (GRO/PGR), NR-07 (PCMSO/ASO),
// NR-12/18 (Checklists Periódicos), NR-23 (Extintores)
// Roteamento inteligente por perfil, 0 B de egress extra, 100% parametrizável.
// =====================================================================

var CONFIG_ALERTAS_SST_PADRAO = {
    dia_limite_checklists: 10,
    dia_aviso_previo_checklists: 5,
    dias_antecedencia_vencimento: 15,
    modo_visao_geral_admin: true,
    categorias: {
        checklists: {
            titulo: 'Checklists de Máquinas e Equipamentos (NR-12 / NR-18)',
            icone: '📊',
            rota: 'checklists',
            subtab: 'visao',
            tipo_vinculo: 'funcao', // 'funcao' ou 'matricula'
            funcao_termo: 'TÉC. SEG. TRABALHO',
            matricula: '181',
            nome_colaborador: 'MARIA GESSICA DA SILVA ROQUE'
        },
        extintores: {
            titulo: 'Extintores e Emergência (NR-23)',
            icone: '🧯',
            rota: 'extintores',
            subtab: 'visao',
            tipo_vinculo: 'funcao',
            funcao_termo: 'TÉC. SEG. TRABALHO',
            matricula: '181',
            nome_colaborador: 'MARIA GESSICA DA SILVA ROQUE'
        },
        treinamentos: {
            titulo: 'Treinamentos e DDSMA (NRs / Capacitações)',
            icone: '🎓',
            rota: 'treinamentos',
            subtab: 'visao',
            tipo_vinculo: 'funcao',
            funcao_termo: 'TÉC. SEG. TRABALHO',
            matricula: '181',
            nome_colaborador: 'MARIA GESSICA DA SILVA ROQUE'
        },
        saude: {
            titulo: 'Saúde Ocupacional / ASOs (NR-07 / PCMSO)',
            icone: '🩺',
            rota: 'saude',
            subtab: 'aso',
            tipo_vinculo: 'funcao',
            funcao_termo: 'ENFERMEIR',
            matricula: '98',
            nome_colaborador: 'Amanda Freire'
        },
        planoacao: {
            titulo: 'Plano de Ação e Laudos (NR-01 / GRO / 5W2H)',
            icone: '🎯',
            rota: 'planoacao',
            subtab: 'tabela',
            tipo_vinculo: 'funcao',
            funcao_termo: 'ENGENHEIR',
            matricula: '76',
            nome_colaborador: 'JOÃO EVERTON DE SOUZA LIMEIRA'
        }
    }
};

var _configAlertasEquipeAtual = null;
var _centralAlertasFiltroAba = 'minhas'; // 'minhas' ou 'equipe'
var _colaboradoresChecklistAlertasCache = null;
var _ultimoResumoAlertasCalculado = { minhas: [], equipe: [] };
var _centralAlertasCalculando = false;

function obterConfigAlertasEquipe() {
    if (_configAlertasEquipeAtual) return _configAlertasEquipeAtual;

    // 1. Tenta carregar do cache de checklist_item_settings já em memória
    if (typeof allChecklistItemSettings !== 'undefined' && Array.isArray(allChecklistItemSettings)) {
        const row = allChecklistItemSettings.find(s => s.id === 'config_alertas_equipe' || s.categoria === 'config_alertas_equipe');
        if (row && row.custom_items && typeof row.custom_items === 'object') {
            _configAlertasEquipeAtual = mergeConfigAlertasEquipe(CONFIG_ALERTAS_SST_PADRAO, row.custom_items);
            return _configAlertasEquipeAtual;
        }
    }

    // 2. Fallback seguro em localStorage
    try {
        const raw = localStorage.getItem('config_alertas_equipe');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                _configAlertasEquipeAtual = mergeConfigAlertasEquipe(CONFIG_ALERTAS_SST_PADRAO, parsed);
                return _configAlertasEquipeAtual;
            }
        }
    } catch (e) {
        console.warn('Erro ao ler config_alertas_equipe do localStorage:', e);
    }

    // 3. Padrão inicial do projeto
    _configAlertasEquipeAtual = JSON.parse(JSON.stringify(CONFIG_ALERTAS_SST_PADRAO));
    return _configAlertasEquipeAtual;
}

function mergeConfigAlertasEquipe(padrao, custom) {
    const res = JSON.parse(JSON.stringify(padrao));
    if (!custom || typeof custom !== 'object') return res;

    if (typeof custom.dia_limite_checklists === 'number') res.dia_limite_checklists = custom.dia_limite_checklists;
    if (typeof custom.dia_aviso_previo_checklists === 'number') res.dia_aviso_previo_checklists = custom.dia_aviso_previo_checklists;
    if (typeof custom.dias_antecedencia_vencimento === 'number') res.dias_antecedencia_vencimento = custom.dias_antecedencia_vencimento;
    if (typeof custom.modo_visao_geral_admin === 'boolean') res.modo_visao_geral_admin = custom.modo_visao_geral_admin;

    if (custom.categorias && typeof custom.categorias === 'object') {
        for (const [k, v] of Object.entries(custom.categorias)) {
            if (res.categorias[k]) {
                res.categorias[k] = { ...res.categorias[k], ...v };
            }
        }
    }
    return res;
}

async function salvarConfigAlertasEquipeNoSupabase(novoConfig) {
    _configAlertasEquipeAtual = novoConfig;
    try {
        localStorage.setItem('config_alertas_equipe', JSON.stringify(novoConfig));
    } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
    }

    const payload = {
        id: 'config_alertas_equipe',
        categoria: 'config_alertas_equipe',
        custom_items: novoConfig,
        updated_at: new Date().toISOString()
    };

    try {
        await supabaseUpsert('checklist_item_settings', [payload]);
        if (typeof allChecklistItemSettings !== 'undefined' && Array.isArray(allChecklistItemSettings)) {
            const idx = allChecklistItemSettings.findIndex(s => s.id === 'config_alertas_equipe' || s.categoria === 'config_alertas_equipe');
            if (idx >= 0) allChecklistItemSettings[idx] = { ...allChecklistItemSettings[idx], ...payload };
            else allChecklistItemSettings.push(payload);
        }
        return true;
    } catch (err) {
        console.error('Erro ao salvar config_alertas_equipe no Supabase:', err);
        return false;
    }
}

function normalizarTextoBuscaAlerta(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

function verificarVinculoResponsavel(categoriaKey, session, config) {
    if (!session) {
        return { ehResponsavelDireto: true, labelResponsavel: 'Equipe SST' };
    }

    const matSession = String(session.matricula || '').trim().toUpperCase();
    if (matSession === 'TESTE') {
        return { ehResponsavelDireto: true, labelResponsavel: 'Você (Acesso Teste)' };
    }

    const regra = config.categorias[categoriaKey] || {};
    const labelResp = regra.nome_colaborador || regra.funcao_termo || 'Responsável SST';

    // 1. Vínculo explícito por matrícula
    if (regra.tipo_vinculo === 'matricula') {
        const matRegra = String(regra.matricula || '').trim().toUpperCase();
        const bateuMatricula = (matSession && matSession === matRegra);
        return {
            ehResponsavelDireto: bateuMatricula,
            labelResponsavel: labelResp
        };
    }

    // 2. Vínculo por termo de função/cargo
    const termo = normalizarTextoBuscaAlerta(regra.funcao_termo || '');
    const funcSess = normalizarTextoBuscaAlerta(session.funcao || '');
    const roleSess = normalizarTextoBuscaAlerta(session.role || '');
    const nomeSess = normalizarTextoBuscaAlerta(session.nome || '');

    let ehMeu = false;
    if (termo) {
        ehMeu = funcSess.includes(termo) || roleSess.includes(termo) || nomeSess.includes(termo);
    }

    // Regras de fallback inteligentes para a equipe real de 3 profissionais:
    if (categoriaKey === 'saude') {
        if (matSession === '98' || session.perfil_id === 'modulo_saude' || funcSess.includes('ENFERM')) {
            ehMeu = true;
        }
    } else if (categoriaKey === 'checklists' || categoriaKey === 'extintores') {
        if (matSession === '181' || funcSess.includes('TEC') && funcSess.includes('SEG')) {
            ehMeu = true;
        }
    } else if (categoriaKey === 'planoacao') {
        if (matSession === '76' || funcSess.includes('ENGENH')) {
            ehMeu = true;
        }
    }

    return {
        ehResponsavelDireto: ehMeu,
        labelResponsavel: labelResp
    };
}

async function garantirDadosMinimosCentralAlertas() {
    const session = sessaoDashboardAtual();
    const isEnfermagem = session && (session.matricula === '98' || session.perfil_id === 'modulo_saude' || normalizarTextoBuscaAlerta(session.funcao).includes('ENFERM'));
    const isAdmin = !session || session.role === 'Admin' || session.matricula === '76' || session.matricula === 'TESTE';

    const tarefas = [];

    // Se for perfil de Saúde ou Admin/Visão Geral, garante Efetivo e ASO em memória (1 consulta cacheada no IndexedDB)
    if (isEnfermagem || isAdmin) {
        if (typeof allEfetivo === 'undefined' || !Array.isArray(allEfetivo) || allEfetivo.length === 0) {
            tarefas.push(supabaseFetchCacheado('colaboradores_efetivo', '?select=*').then(r => {
                if (Array.isArray(r)) window.allEfetivo = r;
            }).catch(e => console.warn('Alertas: aviso ao carregar efetivo:', e)));
        }
        if (typeof allAsoExames === 'undefined' || !Array.isArray(allAsoExames) || allAsoExames.length === 0) {
            tarefas.push(supabaseFetchCacheado('aso_exames', '?select=*').then(r => {
                if (Array.isArray(r)) window.allAsoExames = r;
            }).catch(e => console.warn('Alertas: aviso ao carregar aso_exames:', e)));
        }
    }

    // Se for Engenheiro ou Admin, garante Plano de Ação 5W2H do PGR (1 consulta cacheada)
    if (isAdmin || (session && normalizarTextoBuscaAlerta(session.funcao).includes('ENGENH'))) {
        if (typeof allPlanoAcaoPgr === 'undefined' || !Array.isArray(allPlanoAcaoPgr) || allPlanoAcaoPgr.length === 0) {
            tarefas.push(supabaseFetchCacheado('pgr_plano_acao', '?select=*').then(r => {
                if (Array.isArray(r)) window.allPlanoAcaoPgr = r;
            }).catch(e => console.warn('Alertas: aviso ao carregar pgr_plano_acao:', e)));
        }
    }

    if (tarefas.length > 0) {
        await Promise.all(tarefas);
    }
}

async function atualizarCentralAlertasUsuario(forcarRecarregar = false) {
    if (_centralAlertasCalculando) return;
    _centralAlertasCalculando = true;

    try {
        if (forcarRecarregar) {
            // Invalida cache local se o usuário pediu recarregamento explícito
            try {
                if (typeof dashCacheInvalidate === 'function') {
                    await dashCacheInvalidate('checklist_item_settings');
                }
            } catch (_) {}
            _configAlertasEquipeAtual = null;
        }

        await garantirDadosMinimosCentralAlertas();

        const config = obterConfigAlertasEquipe();
        const session = sessaoDashboardAtual();

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diaAtual = hoje.getDate();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const todosAlertas = [];

        // -------------------------------------------------------------
        // 1. REGRA: CHECKLISTS DE MÁQUINAS E EQUIPAMENTOS (NR-12 / NR-18)
        // -------------------------------------------------------------
        if (typeof allCadastros !== 'undefined' && Array.isArray(allCadastros) &&
            typeof allChecklists !== 'undefined' && Array.isArray(allChecklists)) {
            
            const cadastrosAtivos = allCadastros.filter(c => c.ativo !== false);
            const checklistsDoMes = allChecklists.filter(c => {
                if (!c.date) return false;
                const d = parseLocalDate(c.date);
                return d && d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
            });

            const patrimoniosVerificados = new Set(checklistsDoMes.map(c => (c.patrimonio || '').toUpperCase()));
            const equipsPendentes = cadastrosAtivos.filter(c => !patrimoniosVerificados.has((c.patrimonio || '').toUpperCase()));
            const totalPendentes = equipsPendentes.length;

            if (totalPendentes > 0) {
                const diaLimite = config.dia_limite_checklists || 10;
                const diaAviso = config.dia_aviso_previo_checklists || 5;

                let severidade = 'info';
                let badge = 'No Prazo';
                let titulo = 'Checklists Periódicos do Mês (NR-12/18)';
                let desc = `${totalPendentes} equipamento(s) aguardando inspeção mensal até o dia ${diaLimite}.`;

                if (diaAtual > diaLimite) {
                    severidade = 'critico';
                    badge = 'Atrasado';
                    titulo = 'Checklists Mensais em Atraso (NR-12/18)';
                    desc = `${totalPendentes} equipamento(s) sem checklist no mês vigente! O prazo limite encerrou no dia ${diaLimite}.`;
                } else if (diaAtual >= diaAviso) {
                    severidade = 'atencao';
                    badge = 'Atenção';
                    titulo = 'Checklists Pendentes do Mês (NR-12/18)';
                    desc = `${totalPendentes} equipamento(s) pendentes. O prazo limite encerra no dia ${diaLimite} (restam ${diaLimite - diaAtual} dias).`;
                }

                todosAlertas.push({
                    categoria: 'checklists',
                    severidade: severidade,
                    badge: badge,
                    titulo: titulo,
                    desc: desc,
                    rota: 'checklists',
                    subtab: 'visao',
                    qtd: totalPendentes,
                    detalhes: equipsPendentes.slice(0, 6).map(e => `${e.patrimonio || 'S/P'} - ${e.nome || ''}`)
                });
            }
        }

        // -------------------------------------------------------------
        // 2. REGRA: SAÚDE OCUPACIONAL / ASOs (NR-07 / PCMSO)
        // -------------------------------------------------------------
        if (typeof allEfetivo !== 'undefined' && Array.isArray(allEfetivo)) {
            const diasMargem = config.dias_antecedencia_vencimento || 15;
            const colaboradoresAtivos = allEfetivo.filter(e => colaboradorEstaAtivo(e));

            const asosVencidos = [];
            const asosVencendo = [];

            colaboradoresAtivos.forEach(colab => {
                let diffDays = null;
                let dataVenc = null;

                // Tenta calcular via histórico de aso_exames se disponível
                if (typeof allAsoExames !== 'undefined' && Array.isArray(allAsoExames) && allAsoExames.length > 0) {
                    const statusAso = calcularStatusAsoColaborador(colab.id);
                    if (statusAso && statusAso.ultimoExame && statusAso.ultimoExame.data_vencimento) {
                        diffDays = statusAso.diffDays;
                        dataVenc = statusAso.ultimoExame.data_vencimento;
                    }
                }

                // Fallback para campo validade_aso direto no cadastro do efetivo
                if (diffDays === null && colab.validade_aso) {
                    const dv = parseLocalDate(colab.validade_aso);
                    if (dv) {
                        dv.setHours(0, 0, 0, 0);
                        diffDays = Math.ceil((dv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                        dataVenc = colab.validade_aso;
                    }
                }

                if (diffDays !== null) {
                    if (diffDays < 0) {
                        asosVencidos.push({ colab, diffDays, dataVenc });
                    } else if (diffDays <= diasMargem) {
                        asosVencendo.push({ colab, diffDays, dataVenc });
                    }
                }
            });

            if (asosVencidos.length > 0) {
                todosAlertas.push({
                    categoria: 'saude',
                    severidade: 'critico',
                    badge: 'Vencido',
                    titulo: 'ASOs Ocupacionais Vencidos (NR-07)',
                    desc: `${asosVencidos.length} colaborador(es) com exame ocupacional VENCIDO necessitando convocação imediata.`,
                    rota: 'saude',
                    subtab: 'aso',
                    qtd: asosVencidos.length,
                    detalhes: asosVencidos.slice(0, 6).map(a => `${a.colab.nome} (Vencido há ${Math.abs(a.diffDays)}d)`)
                });
            }

            if (asosVencendo.length > 0) {
                todosAlertas.push({
                    categoria: 'saude',
                    severidade: 'atencao',
                    badge: 'A vencer',
                    titulo: `ASOs a Vencer nos Próximos ${diasMargem} Dias`,
                    desc: `${asosVencendo.length} colaborador(es) com exame periódico a expirar nos próximos ${diasMargem} dias.`,
                    rota: 'saude',
                    subtab: 'aso',
                    qtd: asosVencendo.length,
                    detalhes: asosVencendo.slice(0, 6).map(a => `${a.colab.nome} (Vence em ${a.diffDays}d)`)
                });
            }
        }

        // -------------------------------------------------------------
        // REGRA: FÉRIAS E RÉGUA CONCESSIVA CLT (Art. 130 e 134)
        // -------------------------------------------------------------
        if (typeof allEfetivo !== 'undefined' && Array.isArray(allEfetivo) && allEfetivo.length > 0) {
            const ativos = allEfetivo.filter(e => colaboradorEstaAtivo(e));
            const feriasCriticas = [];

            ativos.forEach(colab => {
                const reg = typeof calcularReguaFeriasClt === 'function' ? calcularReguaFeriasClt(colab) : null;
                if (reg && reg.statusClt === 'critico') {
                    feriasCriticas.push(reg);
                }
            });

            if (feriasCriticas.length > 0) {
                todosAlertas.push({
                    categoria: 'pessoas',
                    severidade: 'critico',
                    badge: 'Dobra CLT',
                    titulo: 'Risco de Férias Dobradas (CLT Art. 134)',
                    desc: `${feriasCriticas.length} colaborador(es) com ≥23 meses de admissão sem férias registradas. Risco iminente de dobra.`,
                    rota: 'efetivo',
                    subtab: 'ferias',
                    qtd: feriasCriticas.length,
                    detalhes: feriasCriticas.slice(0, 6).map(f => `${f.nome} (Admissão: ${formatSimpleDate(f.dataAdmissao)} • Limite 24m: ${formatSimpleDate(f.limiteConcessivoFatal)})`)
                });
            }
        }

        // -------------------------------------------------------------
        // 3. REGRA: EXTINTORES E EMERGÊNCIA (NR-23)
        // -------------------------------------------------------------
        if (typeof allExtintores !== 'undefined' && Array.isArray(allExtintores)) {
            const diasMargem = config.dias_antecedencia_vencimento || 15;
            const extAtivos = allExtintores.filter(e => e.ativo !== false);

            const extVencidos = [];
            const extVencendo = [];

            extAtivos.forEach(ext => {
                const datasParaChecar = [
                    { campo: 'proxima_recarga', rotulo: 'Recarga' },
                    { campo: 'proximo_teste_hidrostatico', rotulo: 'Teste Hidrostático' }
                ];

                datasParaChecar.forEach(dItem => {
                    const val = ext[dItem.campo];
                    if (val) {
                        const d = parseLocalDate(val);
                        if (d) {
                            d.setHours(0, 0, 0, 0);
                            const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                            if (diff < 0) {
                                extVencidos.push({ ext, tipoData: dItem.rotulo, diff });
                            } else if (diff <= diasMargem) {
                                extVencendo.push({ ext, tipoData: dItem.rotulo, diff });
                            }
                        }
                    }
                });
            });

            if (extVencidos.length > 0) {
                todosAlertas.push({
                    categoria: 'extintores',
                    severidade: 'critico',
                    badge: 'Vencido',
                    titulo: 'Extintores c/ Recarga ou Teste Vencido (NR-23)',
                    desc: `${extVencidos.length} item(ns) de combate a incêndio com validade de recarga/teste expirada.`,
                    rota: 'extintores',
                    subtab: 'visao',
                    qtd: extVencidos.length,
                    detalhes: extVencidos.slice(0, 6).map(x => `Nº ${x.ext.numero || x.ext.id} (${x.tipoData} vencido)`)
                });
            }

            if (extVencendo.length > 0) {
                todosAlertas.push({
                    categoria: 'extintores',
                    severidade: 'atencao',
                    badge: 'A vencer',
                    titulo: `Extintores a Vencer em ${diasMargem} Dias`,
                    desc: `${extVencendo.length} item(ns) de combate a incêndio com validade próxima ao vencimento.`,
                    rota: 'extintores',
                    subtab: 'visao',
                    qtd: extVencendo.length,
                    detalhes: extVencendo.slice(0, 6).map(x => `Nº ${x.ext.numero || x.ext.id} (${x.tipoData} em ${x.diff}d)`)
                });
            }
        }

        // -------------------------------------------------------------
        // 4. REGRA: TREINAMENTOS E DDSMA (NR-01 / NRs)
        // -------------------------------------------------------------
        if (typeof allTreinamentosRealizados !== 'undefined' && Array.isArray(allTreinamentosRealizados) && allTreinamentosRealizados.length > 0) {
            const diasMargem = config.dias_antecedencia_vencimento || 15;
            const treinVencidos = [];
            const treinVencendo = [];

            allTreinamentosRealizados.forEach(r => {
                if (r.data_proxima_reciclagem) {
                    const d = parseLocalDate(r.data_proxima_reciclagem);
                    if (d) {
                        d.setHours(0, 0, 0, 0);
                        const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff < 0) {
                            treinVencidos.push({ r, diff });
                        } else if (diff <= diasMargem) {
                            treinVencendo.push({ r, diff });
                        }
                    }
                }
            });

            if (treinVencidos.length > 0) {
                todosAlertas.push({
                    categoria: 'treinamentos',
                    severidade: 'critico',
                    badge: 'Vencido',
                    titulo: 'Treinamentos Normativos Vencidos (Reciclagem)',
                    desc: `${treinVencidos.length} registro(s) de capacitação obrigatória com reciclagem vencida.`,
                    rota: 'treinamentos',
                    subtab: 'visao',
                    qtd: treinVencidos.length,
                    detalhes: treinVencidos.slice(0, 6).map(t => `${t.r.nome} - ${t.r.treinamento_nome || t.r.treinamento_cod}`)
                });
            }

            if (treinVencendo.length > 0) {
                todosAlertas.push({
                    categoria: 'treinamentos',
                    severidade: 'atencao',
                    badge: 'A vencer',
                    titulo: `Treinamentos a Vencer nos Próximos ${diasMargem} Dias`,
                    desc: `${treinVencendo.length} capacitação(ões) normativa(s) com vencimento de reciclagem previsto.`,
                    rota: 'treinamentos',
                    subtab: 'visao',
                    qtd: treinVencendo.length,
                    detalhes: treinVencendo.slice(0, 6).map(t => `${t.r.nome} - ${t.r.treinamento_nome || t.r.treinamento_cod}`)
                });
            }
        }

        // -------------------------------------------------------------
        // 5. REGRA: PLANO DE AÇÃO (5W2H / PGR / NR-01)
        // -------------------------------------------------------------
        if (typeof allPlanoAcaoPgr !== 'undefined' && Array.isArray(allPlanoAcaoPgr) && allPlanoAcaoPgr.length > 0) {
            const diasMargem = config.dias_antecedencia_vencimento || 15;
            const acoesAbertas = allPlanoAcaoPgr.filter(a => {
                const st = (a.status || '').toLowerCase().trim();
                return st !== 'concluido' && st !== 'cancelado';
            });

            const acoesAtrasadas = [];
            const acoesVencendo = [];

            acoesAbertas.forEach(a => {
                if (a.when_prazo) {
                    const d = parseLocalDate(a.when_prazo);
                    if (d) {
                        d.setHours(0, 0, 0, 0);
                        const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff < 0) {
                            acoesAtrasadas.push({ a, diff });
                        } else if (diff <= diasMargem) {
                            acoesVencendo.push({ a, diff });
                        }
                    }
                }
            });

            if (acoesAtrasadas.length > 0) {
                todosAlertas.push({
                    categoria: 'planoacao',
                    severidade: 'critico',
                    badge: 'Atrasado',
                    titulo: 'Ações do Plano PGR em Atraso (NR-01)',
                    desc: `${acoesAtrasadas.length} ação(ões) corretiva(s) do PGR com prazo de conclusão estourado!`,
                    rota: 'planoacao',
                    subtab: 'tabela',
                    qtd: acoesAtrasadas.length,
                    detalhes: acoesAtrasadas.slice(0, 6).map(x => `${x.a.what_acao || 'Ação'} (Resp: ${x.a.who_responsavel || 'SST'})`)
                });
            }

            if (acoesVencendo.length > 0) {
                todosAlertas.push({
                    categoria: 'planoacao',
                    severidade: 'atencao',
                    badge: 'A vencer',
                    titulo: `Ações do PGR a Vencer em ${diasMargem} Dias`,
                    desc: `${acoesVencendo.length} ação(ões) do PGR com prazo limite se aproximando.`,
                    rota: 'planoacao',
                    subtab: 'tabela',
                    qtd: acoesVencendo.length,
                    detalhes: acoesVencendo.slice(0, 6).map(x => `${x.a.what_acao || 'Ação'} (em ${x.diff}d)`)
                });
            }
        }

        // Atribui o responsável configurado e checa pertinência
        todosAlertas.forEach(alerta => {
            const vinculo = verificarVinculoResponsavel(alerta.categoria, session, config);
            alerta.ehMeu = vinculo.ehResponsavelDireto;
            alerta.nomeResponsavel = vinculo.labelResponsavel;
            const catCfg = config.categorias[alerta.categoria] || {};
            alerta.icone = catCfg.icone || '🔔';
        });

        // Ordena: Críticos primeiro, depois Atenção, depois Info
        const prioridade = { critico: 1, atencao: 2, info: 3 };
        todosAlertas.sort((a, b) => (prioridade[a.severidade] || 99) - (prioridade[b.severidade] || 99));

        const alertasMinhas = todosAlertas.filter(a => a.ehMeu);
        const alertasEquipe = todosAlertas;

        _ultimoResumoAlertasCalculado = {
            minhas: alertasMinhas,
            equipe: alertasEquipe
        };

        renderizarUIAlertas(_ultimoResumoAlertasCalculado, session, config);

    } catch (err) {
        console.error('Erro ao atualizar Central de Alertas:', err);
    } finally {
        _centralAlertasCalculando = false;
    }
}

function renderizarUIAlertas(resumo, session, config) {
    const btnSininho = document.getElementById('btnCentralAlertas');
    const badgeQtd = document.getElementById('badgeCentralAlertasQtd');
    const subtituloEl = document.getElementById('subtituloCentralAlertas');
    const qtdMinhasEl = document.getElementById('qtdAlertasMinhas');
    const qtdEquipeEl = document.getElementById('qtdAlertasEquipe');
    const tabsBar = document.getElementById('tabsBarCentralAlertas');

    const isAdmin = !session || session.role === 'Admin' || session.matricula === '76' || session.matricula === 'TESTE';
    const podeVerEquipe = isAdmin && config.modo_visao_geral_admin;

    // Subtítulo da Central
    if (subtituloEl) {
        if (!session) {
            subtituloEl.textContent = 'Panorama Geral da Equipe SST';
        } else if (session.matricula === 'TESTE') {
            subtituloEl.textContent = 'Visão de Teste • Administrador SST';
        } else {
            subtituloEl.textContent = `Direcionado para: ${session.nome} (${session.role || session.funcao || 'SST'})`;
        }
    }

    // Contadores das abas
    const listaMinhas = resumo.minhas || [];
    const listaEquipe = resumo.equipe || [];

    if (qtdMinhasEl) qtdMinhasEl.textContent = listaMinhas.length;
    if (qtdEquipeEl) qtdEquipeEl.textContent = listaEquipe.length;

    if (tabsBar) {
        tabsBar.style.display = podeVerEquipe ? 'flex' : 'none';
    }

    // Alertas que afetam o usuário logado (ou equipe se admin sem alertas próprios)
    const alertasAlvoBadge = (podeVerEquipe && listaMinhas.length === 0) ? listaEquipe : listaMinhas;
    const qtdUrgente = alertasAlvoBadge.filter(a => a.severidade === 'critico' || a.severidade === 'atencao').length;
    const temCritico = alertasAlvoBadge.some(a => a.severidade === 'critico');

    // Atualiza botão do sininho e badge numérico
    if (badgeQtd) {
        if (qtdUrgente > 0) {
            badgeQtd.textContent = qtdUrgente > 99 ? '99+' : qtdUrgente;
            badgeQtd.style.display = 'block';
            badgeQtd.className = 'db-alerta-badge ' + (temCritico ? 'critico' : 'atencao');
        } else {
            badgeQtd.textContent = '0';
            badgeQtd.style.display = 'none';
        }
    }

    if (btnSininho) {
        btnSininho.classList.toggle('tem-critico', temCritico);
    }

    // Renderiza lista atual do dropdown
    renderizarListaDropdownCentralAlertas();

    // Renderiza banner compacto de pendências do dia
    renderizarBannerPendenciasDoDia(listaMinhas);
}

function renderizarListaDropdownCentralAlertas() {
    const container = document.getElementById('listaItensCentralAlertas');
    if (!container) return;

    const session = sessaoDashboardAtual();
    const config = obterConfigAlertasEquipe();
    const isAdmin = !session || session.role === 'Admin' || session.matricula === '76' || session.matricula === 'TESTE';
    const podeVerEquipe = isAdmin && config.modo_visao_geral_admin;

    const lista = (_centralAlertasFiltroAba === 'equipe' && podeVerEquipe)
        ? _ultimoResumoAlertasCalculado.equipe
        : _ultimoResumoAlertasCalculado.minhas;

    if (!lista || lista.length === 0) {
        const msg = (_centralAlertasFiltroAba === 'equipe')
            ? '✅ <b>Toda a equipe está em dia!</b><br>Nenhuma pendência crítica ou atraso identificado nos módulos de SST.'
            : '✅ <b>Parabéns! Nenhuma pendência da sua alçada no momento.</b><br>Tudo verificado e em dia sob sua responsabilidade.';

        container.innerHTML = `<div class="db-alertas-empty">${msg}</div>`;
        return;
    }

    container.innerHTML = lista.map(alerta => {
        const tagResp = alerta.ehMeu
            ? `<span class="db-alerta-card-resp eu"><i class="fas fa-check-circle"></i> Sua responsabilidade</span>`
            : `<span class="db-alerta-card-resp"><i class="fas fa-user"></i> Resp: ${escapeHTML(alerta.nomeResponsavel || 'SST')}</span>`;

        return `
            <div class="db-alerta-card ${alerta.severidade}">
                <div class="db-alerta-card-header">
                    <div class="db-alerta-card-title">
                        <span>${alerta.icone || '🔔'}</span>
                        <span>${escapeHTML(alerta.titulo)}</span>
                    </div>
                    <span class="db-alerta-badge-tag ${alerta.severidade}">${escapeHTML(alerta.badge)}</span>
                </div>
                <div class="db-alerta-card-desc">
                    ${escapeHTML(alerta.desc)}
                </div>
                <div class="db-alerta-card-footer">
                    ${tagResp}
                    <button type="button" class="db-alerta-card-btn-action" onclick="irParaModuloAlerta('${alerta.rota}', '${alerta.subtab || ''}')">
                        Resolver agora ➔
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarBannerPendenciasDoDia(alertasMinhas) {
    const banner = document.getElementById('bannerPendenciasDia');
    if (!banner) return;

    // Se o usuário dispensou na sessão atual
    if (sessionStorage.getItem('fechar_banner_alertas_sessao') === 'true') {
        banner.style.display = 'none';
        return;
    }

    const urgentes = (alertasMinhas || []).filter(a => a.severidade === 'critico' || a.severidade === 'atencao');
    if (urgentes.length === 0) {
        banner.style.display = 'none';
        return;
    }

    const temCritico = urgentes.some(a => a.severidade === 'critico');
    banner.className = 'db-banner-pendencias ' + (temCritico ? 'critico' : 'atencao');

    const iconEl = document.getElementById('bannerPendenciasIcon');
    const tituloEl = document.getElementById('bannerPendenciasTitulo');
    const descEl = document.getElementById('bannerPendenciasDesc');

    if (iconEl) iconEl.textContent = temCritico ? '🚨' : '⚠️';
    if (tituloEl) {
        tituloEl.textContent = temCritico
            ? 'Pendências Críticas Sob Sua Responsabilidade:'
            : 'Atenção às Pendências do Dia:';
    }

    if (descEl) {
        const resumoTexto = urgentes.slice(0, 2).map(a => `${a.titulo} (${a.qtd})`).join(' e ');
        descEl.textContent = `Você possui ${urgentes.length} pendência(s) prioritária(s) aguardando resolução: ${resumoTexto}.`;
    }

    banner.style.display = 'flex';
}

function fecharBannerPendenciasDoDia() {
    try {
        sessionStorage.setItem('fechar_banner_alertas_sessao', 'true');
    } catch (_) {}
    const banner = document.getElementById('bannerPendenciasDia');
    if (banner) banner.style.display = 'none';
}

function acaoRapidaBannerPendencias() {
    const lista = _ultimoResumoAlertasCalculado.minhas || [];
    const prioridade = lista.find(a => a.severidade === 'critico') || lista.find(a => a.severidade === 'atencao') || lista[0];
    if (prioridade) {
        irParaModuloAlerta(prioridade.rota, prioridade.subtab || '');
    } else {
        toggleCentralAlertasDropdown();
    }
}

function irParaModuloAlerta(rota, subtab) {
    fecharCentralAlertasDropdown();
    if (typeof showDbPage === 'function') {
        showDbPage(rota);
    }

    // Se houver subtab específica
    if (subtab) {
        setTimeout(() => {
            if (rota === 'checklists' && typeof showChecklistsSubtab === 'function') {
                showChecklistsSubtab(subtab);
            } else if (rota === 'saude' && typeof showSaudeSubtab === 'function') {
                showSaudeSubtab(subtab);
            } else if (rota === 'extintores' && typeof showExtintoresSubtab === 'function') {
                showExtintoresSubtab(subtab);
            } else if (rota === 'treinamentos' && typeof showTreinSubtab === 'function') {
                showTreinSubtab(subtab);
            } else if (rota === 'planoacao' && typeof showPlanoAcaoSubtab === 'function') {
                showPlanoAcaoSubtab(subtab);
            }
        }, 80);
    }
}

function toggleCentralAlertasDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('dropdownCentralAlertas');
    if (!dropdown) return;

    const estaAberto = dropdown.style.display !== 'none';
    if (estaAberto) {
        dropdown.style.display = 'none';
    } else {
        renderizarListaDropdownCentralAlertas();
        dropdown.style.display = 'flex';
    }
}

function fecharCentralAlertasDropdown() {
    const dropdown = document.getElementById('dropdownCentralAlertas');
    if (dropdown) dropdown.style.display = 'none';
}

function alternarFiltroCentralAlertas(filtro) {
    _centralAlertasFiltroAba = filtro;
    const btnMinhas = document.getElementById('tabBtnAlertasMinhas');
    const btnEquipe = document.getElementById('tabBtnAlertasEquipe');

    if (btnMinhas) btnMinhas.classList.toggle('active', filtro === 'minhas');
    if (btnEquipe) btnEquipe.classList.toggle('active', filtro === 'equipe');

    renderizarListaDropdownCentralAlertas();
}

// Fechamento ao clicar fora do dropdown
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('wrapCentralAlertas');
    const dropdown = document.getElementById('dropdownCentralAlertas');
    if (dropdown && dropdown.style.display !== 'none') {
        if (wrap && !wrap.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});

// =====================================================================
// MODAL DE PARAMETRIZAÇÃO DAS REGRAS DE ALERTAS (100% DINÂMICO)
// =====================================================================

async function abrirModalConfigAlertasEquipe() {
    fecharCentralAlertasDropdown();
    const modal = document.getElementById('modalConfigAlertasEquipe');
    if (!modal) return;

    const config = obterConfigAlertasEquipe();

    const inpLimite = document.getElementById('cfgDiaLimiteChecklist');
    const inpAviso = document.getElementById('cfgDiaAvisoChecklist');
    const inpDiasAnt = document.getElementById('cfgDiasAntecedencia');
    const cbVisaoGeral = document.getElementById('cfgModoVisaoGeralAdmin');

    if (inpLimite) inpLimite.value = config.dia_limite_checklists || 10;
    if (inpAviso) inpAviso.value = config.dia_aviso_previo_checklists || 5;
    if (inpDiasAnt) inpDiasAnt.value = config.dias_antecedencia_vencimento || 15;
    if (cbVisaoGeral) cbVisaoGeral.checked = config.modo_visao_geral_admin !== false;

    // Carrega colaboradores da equipe em cache se ainda não tiver
    if (!_colaboradoresChecklistAlertasCache) {
        try {
            _colaboradoresChecklistAlertasCache = await supabaseFetchCacheado('colaboradores_checklist', '?select=id,matricula,nome,funcao,nivel_acesso,ativo&ativo=eq.true&order=nome.asc');
        } catch (_) {
            _colaboradoresChecklistAlertasCache = [];
        }
    }

    renderizarMapeamentoCategoriasConfig(config, _colaboradoresChecklistAlertasCache || []);
    modal.style.display = 'flex';
}

function fecharModalConfigAlertasEquipe() {
    const modal = document.getElementById('modalConfigAlertasEquipe');
    if (modal) modal.style.display = 'none';
}

function renderizarMapeamentoCategoriasConfig(config, colaboradores) {
    const container = document.getElementById('wrapMapeamentoCategorias');
    if (!container) return;

    const categoriasInfo = [
        { key: 'checklists', label: '1. Checklists de Máquinas e Equipamentos (NR-12/18)', icone: '📊' },
        { key: 'extintores', label: '2. Extintores e Equipamentos de Emergência (NR-23)', icone: '🧯' },
        { key: 'treinamentos', label: '3. Treinamentos Obrigatórios e DDSMA (NRs)', icone: '🎓' },
        { key: 'saude', label: '4. Saúde Ocupacional e ASOs (NR-07 / PCMSO)', icone: '🩺' },
        { key: 'planoacao', label: '5. Plano de Ação 5W2H e Laudos PGR (NR-01)', icone: '🎯' }
    ];

    container.innerHTML = categoriasInfo.map(cat => {
        const cfgCat = (config.categorias && config.categorias[cat.key]) ? config.categorias[cat.key] : {};
        const tipoVinculo = cfgCat.tipo_vinculo || 'funcao';

        const optionsColabs = (colaboradores || []).map(c => {
            const mat = c.matricula || c.id;
            const sel = (String(cfgCat.matricula) === String(mat)) ? 'selected' : '';
            return `<option value="${mat}" data-nome="${escapeHTML(c.nome)}" data-funcao="${escapeHTML(c.funcao || '')}" ${sel}>${escapeHTML(c.nome)} (Mat: ${mat} - ${escapeHTML(c.funcao || 'SST')})</option>`;
        }).join('');

        return `
            <div style="background:#ffffff; border:1px solid var(--border, #cbd5e1); border-radius:8px; padding:10px 12px;">
                <div style="font-size:12.5px; font-weight:700; color:var(--text, #1e293b); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                    <span>${cat.icone}</span> <span>${cat.label}</span>
                </div>
                <div style="display:grid; grid-template-columns: 140px 1fr; gap:10px; align-items:center;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light, #64748b); display:block; margin-bottom:2px;">Tipo de Vínculo:</label>
                        <select id="cfgCatTipo_${cat.key}" onchange="alternarTipoVinculoCategoria('${cat.key}')" style="width:100%; padding:6px; border:1px solid var(--border, #cbd5e1); border-radius:6px; font-size:12px; font-weight:600;">
                            <option value="funcao" ${tipoVinculo === 'funcao' ? 'selected' : ''}>Por Função</option>
                            <option value="matricula" ${tipoVinculo === 'matricula' ? 'selected' : ''}>Por Colaborador</option>
                        </select>
                    </div>

                    <div id="wrapVinculoFuncao_${cat.key}" style="display:${tipoVinculo === 'funcao' ? 'block' : 'none'};">
                        <label style="font-size:11px; font-weight:600; color:var(--text-light, #64748b); display:block; margin-bottom:2px;">Termo de Função/Cargo vinculado:</label>
                        <input type="text" id="cfgCatFuncao_${cat.key}" value="${escapeHTML(cfgCat.funcao_termo || '')}" placeholder="Ex: TÉC. SEG. TRABALHO, ENFERMEIR, ENGENHEIR..." style="width:100%; padding:6px 10px; border:1px solid var(--border, #cbd5e1); border-radius:6px; font-size:12.5px; box-sizing:border-box;">
                    </div>

                    <div id="wrapVinculoColab_${cat.key}" style="display:${tipoVinculo === 'matricula' ? 'block' : 'none'};">
                        <label style="font-size:11px; font-weight:600; color:var(--text-light, #64748b); display:block; margin-bottom:2px;">Colaborador Responsável:</label>
                        <select id="cfgCatColab_${cat.key}" style="width:100%; padding:6px; border:1px solid var(--border, #cbd5e1); border-radius:6px; font-size:12px; box-sizing:border-box;">
                            <option value="">Selecione o colaborador...</option>
                            ${optionsColabs}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function alternarTipoVinculoCategoria(catKey) {
    const select = document.getElementById(`cfgCatTipo_${catKey}`);
    const wrapFuncao = document.getElementById(`wrapVinculoFuncao_${catKey}`);
    const wrapColab = document.getElementById(`wrapVinculoColab_${catKey}`);

    if (select && wrapFuncao && wrapColab) {
        const isFuncao = select.value === 'funcao';
        wrapFuncao.style.display = isFuncao ? 'block' : 'none';
        wrapColab.style.display = isFuncao ? 'none' : 'block';
    }
}

async function salvarConfigAlertasEquipeForm() {
    const btn = document.getElementById('btnSalvarConfigAlertas');
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Gravando...'; }

    try {
        const diaLimite = parseInt(document.getElementById('cfgDiaLimiteChecklist')?.value || '10', 10);
        const diaAviso = parseInt(document.getElementById('cfgDiaAvisoChecklist')?.value || '5', 10);
        const diasAnt = parseInt(document.getElementById('cfgDiasAntecedencia')?.value || '15', 10);
        const visaoGeral = document.getElementById('cfgModoVisaoGeralAdmin')?.checked !== false;

        if (isNaN(diaLimite) || diaLimite < 1 || diaLimite > 28) {
            alert('Por favor, informe um dia limite mensal válido entre 1 e 28.');
            return;
        }

        const configAtual = obterConfigAlertasEquipe();
        const novoConfig = JSON.parse(JSON.stringify(configAtual));

        novoConfig.dia_limite_checklists = diaLimite;
        novoConfig.dia_aviso_previo_checklists = diaAviso;
        novoConfig.dias_antecedencia_vencimento = diasAnt;
        novoConfig.modo_visao_geral_admin = visaoGeral;

        const categoriasChaves = ['checklists', 'extintores', 'treinamentos', 'saude', 'planoacao'];

        categoriasChaves.forEach(k => {
            const tipo = document.getElementById(`cfgCatTipo_${k}`)?.value || 'funcao';
            novoConfig.categorias[k] = novoConfig.categorias[k] || {};
            novoConfig.categorias[k].tipo_vinculo = tipo;

            if (tipo === 'funcao') {
                novoConfig.categorias[k].funcao_termo = document.getElementById(`cfgCatFuncao_${k}`)?.value?.trim() || '';
            } else {
                const selColab = document.getElementById(`cfgCatColab_${k}`);
                if (selColab) {
                    novoConfig.categorias[k].matricula = selColab.value;
                    const optSelected = selColab.options[selColab.selectedIndex];
                    if (optSelected && optSelected.dataset) {
                        novoConfig.categorias[k].nome_colaborador = optSelected.dataset.nome || '';
                    }
                }
            }
        });

        const ok = await salvarConfigAlertasEquipeNoSupabase(novoConfig);

        fecharModalConfigAlertasEquipe();
        await atualizarCentralAlertasUsuario();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: ok ? 'success' : 'warning',
                title: ok ? 'Parâmetros Salvos!' : 'Salvo Localmente',
                text: ok ? 'Regras da Central de Alertas atualizadas no Supabase com sucesso.' : 'Parâmetros salvos localmente. Sincronização em nuvem ocorrerá em breve.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            alert('Configurações da Central de Alertas salvas com sucesso!');
        }

    } catch (err) {
        console.error('Erro ao salvar parametrização:', err);
        alert('Falha ao gravar parâmetros: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
}

async function restaurarConfigAlertasPadrao() {
    if (!confirm('Deseja restaurar as regras da Central de Alertas para os padrões de fábrica do projeto?')) return;
    const configPadrao = JSON.parse(JSON.stringify(CONFIG_ALERTAS_SST_PADRAO));
    await salvarConfigAlertasEquipeNoSupabase(configPadrao);
    abrirModalConfigAlertasEquipe();
    await atualizarCentralAlertasUsuario();
}

// =====================================================================
// IMPRESSÃO FORMAL DE RESUMO DE PENDÊNCIAS (IMUNE A BLOQUEADOR DE POPUPS)
// =====================================================================

function imprimirResumoPendenciasEquipe() {
    fecharCentralAlertasDropdown();
    const config = obterConfigAlertasEquipe();
    const session = sessaoDashboardAtual();
    const emissorNome = session ? session.nome : 'Gestão de Segurança';
    const emissorFuncao = session ? (session.role || session.funcao || 'SST') : 'Engenharia de Segurança';
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    const listaEquipe = _ultimoResumoAlertasCalculado.equipe || [];

    const logoHtml = (typeof LOGO_COP_BASE64 !== 'undefined' && LOGO_COP_BASE64)
        ? `<img src="${LOGO_COP_BASE64}" style="max-height:55px; max-width:140px; object-fit:contain;" alt="Logo Consórcio COP">`
        : `<div style="font-size:22px; font-weight:800; color:#1e3a8a;">CONSÓRCIO COP</div>`;

    const linhasHtml = listaEquipe.map((alerta, idx) => {
        const corSeveridade = alerta.severidade === 'critico' ? '#ef4444' : (alerta.severidade === 'atencao' ? '#f59e0b' : '#3b82f6');
        const bgSeveridade = alerta.severidade === 'critico' ? '#fee2e2' : (alerta.severidade === 'atencao' ? '#fef3c7' : '#dbeafe');
        const detalhesItens = (alerta.detalhes && alerta.detalhes.length > 0)
            ? `<div style="margin-top:4px; font-size:10.5px; color:#475569;"><b>Exemplos:</b> ${alerta.detalhes.join('; ')}</div>`
            : '';

        return `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px 8px; text-align:center; font-weight:700;">${idx + 1}</td>
                <td style="padding:10px 8px;">
                    <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700; text-transform:uppercase; background:${bgSeveridade}; color:${corSeveridade};">
                        ${escapeHTML(alerta.badge)}
                    </span>
                </td>
                <td style="padding:10px 8px; font-weight:700; color:#0f172a;">
                    ${alerta.icone || '🔔'} ${escapeHTML(alerta.titulo)}
                </td>
                <td style="padding:10px 8px; color:#334155; font-size:11.5px; line-height:1.4;">
                    ${escapeHTML(alerta.desc)}
                    ${detalhesItens}
                </td>
                <td style="padding:10px 8px; text-align:center; font-weight:800; font-size:13px; color:#1e293b;">
                    ${alerta.qtd}
                </td>
                <td style="padding:10px 8px; font-size:11px; font-weight:600; color:#1e40af;">
                    ${escapeHTML(alerta.nomeResponsavel || 'Equipe SST')}
                </td>
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Dossiê de Alertas e Pendências SST • Consórcio COP</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; font-size: 12px; }
        .cabecalho-dossie { border: 2px solid #1e3a8a; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
        .titulo-bloco { flex: 1; text-align: center; padding: 0 16px; }
        .titulo-principal { font-size: 16px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
        .subtitulo { font-size: 11px; color: #64748b; margin-top: 3px; }
        .meta-bloco { font-size: 10.5px; color: #334155; text-align: right; line-height: 1.4; border-left: 1px solid #cbd5e1; padding-left: 14px; }
        .tabela-alertas { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
        .tabela-alertas th { background: #1e3a8a; color: #ffffff; padding: 10px 8px; font-weight: 700; text-align: left; font-size: 11px; text-transform: uppercase; }
        .rodape-dossie { margin-top: 30px; padding-top: 12px; border-top: 1px dashed #94a3b8; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
        @media print {
            body { margin: 10mm; }
            .cabecalho-dossie { border-color: #000; }
            .tabela-alertas th { background: #1e293b !important; color: #fff !important; -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="cabecalho-dossie">
        <div>${logoHtml}</div>
        <div class="titulo-bloco">
            <div class="titulo-principal">Relatório Gerencial de Pendências e Alertas SST</div>
            <div class="subtitulo">Consórcio Ramal do Agreste • Gestão de Riscos e Prazos (NR-01, NR-07, NR-12, NR-18, NR-23)</div>
        </div>
        <div class="meta-bloco">
            <div><b>Emissão:</b> ${dataHoraEmissao}</div>
            <div><b>Emissor:</b> ${escapeHTML(emissorNome)}</div>
            <div><b>Cargo:</b> ${escapeHTML(emissorFuncao)}</div>
            <div><b>Corte Checklists:</b> Todo dia ${config.dia_limite_checklists || 10}</div>
        </div>
    </div>

    <div style="margin-bottom:12px; font-size:12px; color:#334155;">
        <b>Resumo do Levantamento:</b> Este documento consolida os itens com prazo expirado ou em período de tolerância normativa na obra, direcionados aos respectivos responsáveis técnicos.
    </div>

    <table class="tabela-alertas">
        <thead>
            <tr>
                <th style="width:30px; text-align:center;">#</th>
                <th style="width:90px;">Nível</th>
                <th style="width:230px;">Item Normativo / Módulo</th>
                <th>Descrição da Pendência</th>
                <th style="width:50px; text-align:center;">Qtd</th>
                <th style="width:140px;">Responsável</th>
            </tr>
        </thead>
        <tbody>
            ${linhasHtml || '<tr><td colspan="6" style="padding:20px; text-align:center; color:#10b981; font-weight:700;">✅ Nenhuma pendência identificada no momento.</td></tr>'}
        </tbody>
    </table>

    <div class="rodape-dossie">
        <div>Documento gerado automaticamente pelo Painel Gerencial SST • Consórcio Ramal do Agreste</div>
        <div>Página 1 de 1</div>
    </div>
</body>
</html>`;

    if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
        abrirDocumentoHtmlParaImpressao(html, 'Resumo_Pendencias_SST_Equipe');
    } else {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) win.focus();
    }
}

// Expõe globalmente para botões do DOM e listeners
window.CONFIG_ALERTAS_SST_PADRAO = CONFIG_ALERTAS_SST_PADRAO;
window.obterConfigAlertasEquipe = obterConfigAlertasEquipe;
window.salvarConfigAlertasEquipeNoSupabase = salvarConfigAlertasEquipeNoSupabase;
window.atualizarCentralAlertasUsuario = atualizarCentralAlertasUsuario;
window.toggleCentralAlertasDropdown = toggleCentralAlertasDropdown;
window.fecharCentralAlertasDropdown = fecharCentralAlertasDropdown;
window.alternarFiltroCentralAlertas = alternarFiltroCentralAlertas;
window.acaoRapidaBannerPendencias = acaoRapidaBannerPendencias;
window.irParaModuloAlerta = irParaModuloAlerta;
window.fecharBannerPendenciasDoDia = fecharBannerPendenciasDoDia;
window.abrirModalConfigAlertasEquipe = abrirModalConfigAlertasEquipe;
window.fecharModalConfigAlertasEquipe = fecharModalConfigAlertasEquipe;
window.alternarTipoVinculoCategoria = alternarTipoVinculoCategoria;
window.salvarConfigAlertasEquipeForm = salvarConfigAlertasEquipeForm;
window.restaurarConfigAlertasPadrao = restaurarConfigAlertasPadrao;
window.imprimirResumoPendenciasEquipe = imprimirResumoPendenciasEquipe;


