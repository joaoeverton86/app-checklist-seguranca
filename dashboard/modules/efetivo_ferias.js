// ==============================================================================
// MODULO: GESTAO DE EFETIVO, FERIAS E MAO DE OBRA LOCAL
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// EFETIVO (Parte B) - replica as fórmulas já usadas na aba TBs_DINAMICAS da
// planilha TREINAMENTOS_EFETIVO.xlsx: admissões/demissões por COUNTIF de mês,
// efetivo real como headcount na data, índice = HHT do mês ÷ efetivo do mês × 100.
// ============================================

let allEfetivo = [];
let allGheCatalogo = [];
let allMunicipiosAda = [];
let allColaboradoresFerias = [];
let dadosFeriasCltCache = [];
let valFeriasFiltroAtual = 'todos'; // 'todos' | 'critico' | 'atencao' | 'normal' | 'emGozo' | 'programadas' | 'concluidas'
let efetivoLoaded = false;

async function loadEfetivoData() {
    const statusEl = document.getElementById('efetivoImportStatus');
    try {
        allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*');
        allGheCatalogo = await supabaseFetchCacheado('ghe_catalogo', '?select=*');
        allMunicipiosAda = await supabaseFetchCacheado('municipios_ada', '?select=*');
        allHistoricoTrocaFuncao = await supabaseFetchCacheado('historico_troca_funcao', '?select=*');
        try {
            allColaboradoresFerias = await supabaseFetch('colaboradores_ferias', '?select=*&order=limite_concessivo_fatal.asc');
        } catch (errF) {
            console.warn('Aviso ao buscar colaboradores_ferias no Supabase:', errF);
            allColaboradoresFerias = [];
        }
        popularGheCatalogoDatalist();
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

// Abas da página Efetivo (Visão Geral / Colaboradores / Férias / etc.)
function showEfetivoSubtab(tab) {
    ['visao', 'colaboradores', 'ferias', 'os', 'setores', 'ghe', 'recomendacoes', 'maoobra', 'relatorio'].forEach(t => {
        const content = document.getElementById('efetivoSubtab-' + t);
        const btn = document.getElementById('efetivoSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderEfetivoPanel();
    if (tab === 'colaboradores') {
        renderEfetivoResumo();
        filterEfetivoColaboradores(document.getElementById('efetivoSearchInput')?.value || '');
    }
    if (tab === 'ferias') {
        renderFeriasPanel();
    }
    if (tab === 'os') renderControleOrdensServico();
    if (tab === 'setores') { fecharGerenciarSetor(); renderSetoresLista(); }
    if (tab === 'ghe') { fecharGerenciarGhe(); renderGheLista(); }
    if (tab === 'recomendacoes') renderRecomendacoesGheLista();
    if (tab === 'maoobra') { popularMaoDeObraDefaults(); renderMunicipiosAdaLista(); }
    if (tab === 'relatorio') { renderEfetivoPanel(); popularMaoDeObraDefaults(); renderEfetivoRelatorioChecklist(); }
}

// ==========================================================================
// SUBMÓDULO: GESTÃO DE FÉRIAS E AFASTAMENTOS (CLT ART. 130 E 134)
// Régua Concessiva de 24 Meses, Prevenção de Férias Dobradas e Isenções SST
// ==========================================================================

async function garantirColaboradoresFeriasCarregados() {
    if (!allEfetivo || allEfetivo.length === 0) {
        allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*');
    }
    try {
        allColaboradoresFerias = await supabaseFetch('colaboradores_ferias', '?select=*&order=limite_concessivo_fatal.asc');
    } catch (e) {
        console.warn('Erro ao carregar tabela colaboradores_ferias:', e);
        if (!allColaboradoresFerias) allColaboradoresFerias = [];
    }
}

// Helper de verificação rápida: retorna se o colaborador está em gozo de férias/afastamento na data
function colaboradorEstaEmFerias(matricula, dataRef) {
    if (!matricula || !allColaboradoresFerias || allColaboradoresFerias.length === 0) return false;
    const refDate = dataRef ? (typeof dataRef === 'string' ? parseLocalDate(dataRef) : new Date(dataRef)) : new Date();
    refDate.setHours(0, 0, 0, 0);
    const refIso = toISODateLocal(refDate);

    return allColaboradoresFerias.some(f => {
        if (String(f.matricula) !== String(matricula)) return false;
        if (f.status === 'cancelada') return false;
        if (f.data_inicio && f.data_fim) {
            return refIso >= f.data_inicio && refIso <= f.data_fim;
        }
        if (f.status === 'em_gozo') return true;
        return false;
    });
}

// Helper: retorna o registro de férias ativo do colaborador (se houver)
function obterRegistroFeriasAtivo(matricula, dataRef) {
    if (!matricula || !allColaboradoresFerias || allColaboradoresFerias.length === 0) return null;
    const refDate = dataRef ? (typeof dataRef === 'string' ? parseLocalDate(dataRef) : new Date(dataRef)) : new Date();
    refDate.setHours(0, 0, 0, 0);
    const refIso = toISODateLocal(refDate);

    return allColaboradoresFerias.find(f => {
        if (String(f.matricula) !== String(matricula)) return false;
        if (f.status === 'cancelada') return false;
        if (f.data_inicio && f.data_fim) {
            return refIso >= f.data_inicio && refIso <= f.data_fim;
        }
        if (f.status === 'em_gozo') return true;
        return false;
    }) || null;
}

// Helper para exibir badge resumido do colaborador na ficha de detalhe
function renderDetalheFeriasColabBadge(matricula) {
    const colab = (allEfetivo || []).find(x => String(x.id) === String(matricula));
    if (!colab) return '—';
    const reg = calcularReguaFeriasClt(colab);
    const prazoTxt = reg.limiteConcessivoFatal ? formatSimpleDate(reg.limiteConcessivoFatal) : '—';
    return `<span class="${reg.badgeClass}">${escapeHTML(reg.label)} • Limite 24m: ${prazoTxt}</span>`;
}

// Cálculo central da régua de vencimento concessivo da CLT (Artigos 130 e 134)
function calcularReguaFeriasClt(colab) {
    const matricula = colab.id;
    const dataAdmStr = colab.dt_admissao || colab.data_admissao || '';
    
    if (!dataAdmStr) {
        return {
            colaborador: colab,
            matricula: matricula,
            nome: colab.nome || '(sem nome)',
            funcao: colab.funcao || '',
            setor: colab.setor || '',
            cpf: colab.cpf || '',
            dataAdmissao: null,
            limiteConcessivoFatal: null,
            mesesTotal: 0,
            diasParaDobra: null,
            statusClt: 'normal',
            label: 'Sem data de admissão',
            badgeClass: 'badge-ferias-normal',
            registroFerias: null,
            emGozo: false,
            programada: false,
            concluida: false
        };
    }

    const adm = parseLocalDate(dataAdmStr);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeIso = toISODateLocal(hoje);

    // Limite Concessivo Fatal: admissão + 24 meses (CLT Art. 134)
    const limiteFatalStr = addMeses(dataAdmStr, 24);
    const limiteFatalDate = parseLocalDate(limiteFatalStr);
    limiteFatalDate.setHours(0, 0, 0, 0);

    const diasParaDobra = Math.ceil((limiteFatalDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const totalMeses = Math.max(0, (hoje.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

    // Busca registros cadastrados para a matrícula
    const feriasRegs = (allColaboradoresFerias || []).filter(f => String(f.matricula) === String(matricula));
    
    const regEmGozo = feriasRegs.find(f => f.status === 'em_gozo' || (f.status !== 'cancelada' && f.data_inicio && f.data_fim && hojeIso >= f.data_inicio && hojeIso <= f.data_fim));
    const regProgramada = feriasRegs.find(f => f.status === 'programada' && f.data_inicio && hojeIso < f.data_inicio);
    const regConcluida = feriasRegs.find(f => f.status === 'concluida' || (f.data_fim && hojeIso > f.data_fim && f.status !== 'cancelada' && f.status !== 'pendente'));
    const regPendente = feriasRegs.find(f => f.status === 'pendente');
    const ultimoRegistro = regEmGozo || regProgramada || regConcluida || regPendente || feriasRegs[0] || null;

    let statusClt = 'normal';
    let label = '🟢 Normal (<18m)';
    let badgeClass = 'badge-ferias-normal';

    if (regEmGozo) {
        statusClt = 'em_gozo';
        label = '✈️ Em Gozo';
        badgeClass = 'badge-ferias-em-gozo';
    } else if (regProgramada) {
        statusClt = 'programada';
        label = `📅 Programada (${formatSimpleDate(regProgramada.data_inicio)})`;
        badgeClass = 'badge-ferias-programada';
    } else if (regConcluida) {
        statusClt = 'concluida';
        label = '✅ Férias Quitadas';
        badgeClass = 'badge-ferias-concluida';
    } else {
        // Régua do Semáforo CLT para colaboradores sem gozo registrado:
        // Vermelho: tempo de admissão >= 23 meses sem férias concluídas
        // Amarelo: tempo de admissão entre 19 e 22 meses sem gozo
        // Verde: tempo de admissão < 18 meses
        if (totalMeses >= 23) {
            statusClt = 'critico';
            label = '🔴 Risco Dobra CLT (≥23m)';
            badgeClass = 'badge-ferias-critico';
        } else if (totalMeses >= 18.5) {
            statusClt = 'atencao';
            label = '🟡 Atenção / Programar (19-22m)';
            badgeClass = 'badge-ferias-atencao';
        } else {
            statusClt = 'normal';
            label = '🟢 Normal (<18m)';
            badgeClass = 'badge-ferias-normal';
        }
    }

    return {
        colaborador: colab,
        matricula: matricula,
        nome: colab.nome || '(sem nome)',
        funcao: colab.funcao || '',
        setor: colab.setor || '',
        cpf: colab.cpf || '',
        dataAdmissao: dataAdmStr,
        limiteConcessivoFatal: limiteFatalStr,
        mesesTotal: totalMeses,
        diasParaDobra: diasParaDobra,
        statusClt: statusClt,
        label: label,
        badgeClass: badgeClass,
        registroFerias: ultimoRegistro,
        emGozo: !!regEmGozo,
        programada: !!regProgramada,
        concluida: !!regConcluida
    };
}

// Renderização geral do painel e tabela de Férias e Régua CLT
async function renderFeriasPanel() {
    await garantirColaboradoresFeriasCarregados();
    const ativos = (allEfetivo || []).filter(colaboradorEstaAtivo);
    dadosFeriasCltCache = ativos.map(calcularReguaFeriasClt);

    // Ordenação de prioridade: 1º Crítico (Dobra CLT), 2º Atenção, 3º Em Gozo, 4º Programada, 5º Normal, 6º Concluída
    const prioridade = { 'critico': 1, 'atencao': 2, 'em_gozo': 3, 'programada': 4, 'normal': 5, 'concluida': 6 };
    dadosFeriasCltCache.sort((a, b) => {
        const pA = prioridade[a.statusClt] || 9;
        const pB = prioridade[b.statusClt] || 9;
        if (pA !== pB) return pA - pB;
        if (a.diasParaDobra !== null && b.diasParaDobra !== null) return a.diasParaDobra - b.diasParaDobra;
        return a.nome.localeCompare(b.nome);
    });

    // Contadores KPIs
    const criticos = dadosFeriasCltCache.filter(d => d.statusClt === 'critico').length;
    const atencao = dadosFeriasCltCache.filter(d => d.statusClt === 'atencao').length;
    const normal = dadosFeriasCltCache.filter(d => d.statusClt === 'normal' || d.statusClt === 'concluida').length;
    const emGozo = dadosFeriasCltCache.filter(d => d.emGozo).length;
    const programadas = dadosFeriasCltCache.filter(d => d.programada).length;
    const concluidas = dadosFeriasCltCache.filter(d => d.concluida).length;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt('kpiFeriasCritico', criticos);
    setTxt('kpiFeriasAtencao', atencao);
    setTxt('kpiFeriasNormal', normal);
    setTxt('kpiFeriasEmGozo', emGozo);
    setTxt('kpiFeriasProgramadas', programadas);
    setTxt('kpiFeriasConcluidas', concluidas);

    setTxt('countFeriasTodos', dadosFeriasCltCache.length);
    setTxt('countFeriasCritico', criticos);
    setTxt('countFeriasAtencao', atencao);
    setTxt('countFeriasNormal', normal);
    setTxt('countFeriasEmGozo', emGozo);
    setTxt('countFeriasProgramadas', programadas);
    setTxt('countFeriasConcluidas', concluidas);

    // Popula dropdown de setores
    const selSetor = document.getElementById('feriasFiltroSetor');
    if (selSetor) {
        const valorAtual = selSetor.value;
        const setores = Array.from(new Set(dadosFeriasCltCache.map(d => d.setor).filter(Boolean))).sort();
        selSetor.innerHTML = '<option value="">🏢 Todos os Setores</option>' +
            setores.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
        selSetor.value = valorAtual;
    }

    renderTabelaFerias();
}

function filtrarTabelaFerias(filtro, btn) {
    valFeriasFiltroAtual = filtro;
    document.querySelectorAll('#filtroFeriasPills .sector-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTabelaFerias();
}

function renderTabelaFerias() {
    const tbody = document.getElementById('tabelaFeriasCorpo');
    if (!tbody) return;

    const busca = (document.getElementById('feriasSearchInput')?.value || '').toLowerCase().trim();
    const setorFiltro = document.getElementById('feriasFiltroSetor')?.value || '';

    const filtrados = dadosFeriasCltCache.filter(d => {
        if (valFeriasFiltroAtual === 'critico' && d.statusClt !== 'critico') return false;
        if (valFeriasFiltroAtual === 'atencao' && d.statusClt !== 'atencao') return false;
        if (valFeriasFiltroAtual === 'normal' && d.statusClt !== 'normal') return false;
        if (valFeriasFiltroAtual === 'emGozo' && !d.emGozo) return false;
        if (valFeriasFiltroAtual === 'programadas' && !d.programada) return false;
        if (valFeriasFiltroAtual === 'concluidas' && !d.concluida) return false;

        if (setorFiltro && d.setor !== setorFiltro) return false;

        if (busca) {
            const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.funcao} ${d.setor}`.toLowerCase();
            if (!txt.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding: 28px; text-align: center; color: var(--text-light); font-size: 13px;">Nenhum colaborador encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(d => {
        const mesesInt = Math.floor(d.mesesTotal);
        const pct24 = Math.min(100, Math.max(0, Math.round((d.mesesTotal / 24) * 100)));
        
        let fillClass = 'ferias-regua-fill-aquisitivo';
        if (pct24 >= 95) fillClass = 'ferias-regua-fill-concessivo-alerta';
        else if (pct24 >= 78) fillClass = 'ferias-regua-fill-concessivo-ok';

        let prazoBadge = '—';
        if (d.diasParaDobra !== null) {
            if (d.diasParaDobra < 0) {
                prazoBadge = `<span style="color:#b91c1c; font-weight:700;">Venceu há ${Math.abs(d.diasParaDobra)}d (Dobra CLT)</span>`;
            } else if (d.diasParaDobra <= 60) {
                prazoBadge = `<span style="color:#ea580c; font-weight:700;">Em ${d.diasParaDobra}d</span>`;
            } else {
                prazoBadge = `<span style="color:#16a34a; font-weight:600;">Em ${d.diasParaDobra}d</span>`;
            }
        }

        const anos = Math.floor(d.mesesTotal / 12);
        const mesesResto = Math.floor(d.mesesTotal % 12);
        const tempoCasaTxt = anos > 0 ? `${anos}a ${mesesResto}m` : `${mesesResto}m`;

        let periodoGozoTxt = '<span style="color:var(--text-light); font-size:11px;">Pendente</span>';
        if (d.registroFerias && d.registroFerias.data_inicio && d.registroFerias.data_fim) {
            const dtIniFmt = formatSimpleDate(d.registroFerias.data_inicio);
            const dtFimFmt = formatSimpleDate(d.registroFerias.data_fim);
            periodoGozoTxt = `<div style="font-weight:700; color:var(--text); font-size:11.5px;">${dtIniFmt} a ${dtFimFmt}</div>
                <div style="font-size:10px; color:var(--text-light);">${d.registroFerias.dias_gozo || 30} dias • ${escapeHTML(d.registroFerias.status).toUpperCase()}</div>`;
        }

        let isencaoTag = '<span style="color:var(--text-light);">—</span>';
        if (d.emGozo) {
            isencaoTag = `<span class="badge-isencao-sst" title="Colaborador em gozo: ausência justificada em DDSMA/Treinamentos e ASO regulariza no retorno.">🛡️ Isento DDS/Trein.</span>`;
        }

        const feriasId = d.registroFerias ? d.registroFerias.id : '';
        let btnAcoes = `
            <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="abrirModalLancamentoFerias('${escapeHTML(d.matricula)}', '${escapeHTML(feriasId)}')" title="Programar ou editar férias">
                ✏️ Programar
            </button>
        `;
        if (d.programada && feriasId) {
            btnAcoes += `
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; color:#0284c7; border-color:#7dd3fc; background:#f0f9ff;" onclick="iniciarGozoFeriasRapido('${escapeHTML(feriasId)}', '${escapeHTML(d.matricula)}')" title="Iniciar gozo de férias hoje">
                    ✈️ Iniciar
                </button>
            `;
        }
        if (d.emGozo && feriasId) {
            btnAcoes += `
                <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; color:#059669; border-color:#a7f3d0; background:#f0fdf4;" onclick="concluirFeriasRapido('${escapeHTML(feriasId)}', '${escapeHTML(d.matricula)}')" title="Concluir período de férias">
                    ✅ Concluir
                </button>
            `;
        }

        return `
            <tr style="border-bottom: 1px solid var(--border); font-size: 11.5px; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(2,132,199,0.03)'" onmouseout="this.style.background=''">
                <td style="padding: 8px 12px; font-weight: 700; color: var(--primary);">${escapeHTML(d.matricula)}</td>
                <td style="padding: 8px 12px;">
                    <div style="font-weight: 700; color: var(--text); cursor:pointer;" onclick="mostrarDetalheColaborador('${escapeHTML(d.matricula)}')" title="Ver prontuário">${escapeHTML(d.nome)}</div>
                    ${d.cpf ? `<div style="font-size: 10.5px; color: var(--text-light);">CPF: ${escapeHTML(d.cpf)}</div>` : ''}
                </td>
                <td style="padding: 8px 12px;">
                    <div style="font-weight:600; color:var(--text);">${escapeHTML(d.funcao)}</div>
                    <div style="font-size:10.5px; color:var(--text-light);">${escapeHTML(d.setor || '—')}</div>
                </td>
                <td style="padding: 8px 12px; color: var(--text-light);">${d.dataAdmissao ? formatSimpleDate(d.dataAdmissao) : '—'}</td>
                <td style="padding: 8px 12px; font-weight:600; color:var(--text);">${tempoCasaTxt} <span style="font-size:10px; color:var(--text-light);">(${mesesInt}m)</span></td>
                <td style="padding: 8px 12px;">
                    <div style="font-weight:700; color:var(--text);">${d.limiteConcessivoFatal ? formatSimpleDate(d.limiteConcessivoFatal) : '—'}</div>
                    <div style="font-size:10.5px;">${prazoBadge}</div>
                </td>
                <td style="padding: 8px 12px; min-width: 170px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                        <span class="${d.badgeClass}">${escapeHTML(d.label)}</span>
                        <span style="font-size:10px; font-weight:700; color:var(--text-light);">${pct24}%</span>
                    </div>
                    <div class="ferias-regua-track" title="${mesesInt} meses de contrato (Limite fatal: 24 meses)">
                        <div class="${fillClass}" style="width: ${pct24}%;"></div>
                    </div>
                    <div class="ferias-regua-marcos">
                        <span>0m</span>
                        <span>12m (Aquisitivo)</span>
                        <span>24m (Limite Fatal)</span>
                    </div>
                </td>
                <td style="padding: 8px 12px; text-align: center;">${periodoGozoTxt}</td>
                <td style="padding: 8px 12px; text-align: center;">${isencaoTag}</td>
                <td style="padding: 8px 12px; text-align: center; white-space:nowrap;">
                    <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">${btnAcoes}</div>
                </td>
            </tr>
        `;
    }).join('');
}

// Modal de Lançamento e Edição de Férias
function abrirModalLancamentoFerias(matriculaAlvo, feriasIdAlvo) {
    const modal = document.getElementById('modalLancamentoFerias');
    if (!modal) return;

    // Popula select de colaboradores ativos ordenados por nome
    const selColab = document.getElementById('feriasForm_matricula');
    if (selColab) {
        const ativos = (allEfetivo || []).filter(colaboradorEstaAtivo).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        selColab.innerHTML = '<option value="">Selecione o colaborador...</option>' +
            ativos.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nome)} (Mat. ${escapeHTML(c.id)} — ${escapeHTML(c.funcao || '')})</option>`).join('');
    }

    document.getElementById('feriasForm_id').value = feriasIdAlvo || '';
    document.getElementById('feriasForm_statusMsg').textContent = '';
    document.getElementById('btnExcluirFeriasModal').style.display = feriasIdAlvo ? 'inline-block' : 'none';

    // Se passou matrícula, seleciona e preenche dados
    if (matriculaAlvo) {
        selColab.value = matriculaAlvo;
    }

    // Se passou ID de férias, carrega os dados já cadastrados
    if (feriasIdAlvo) {
        const reg = (allColaboradoresFerias || []).find(f => String(f.id) === String(feriasIdAlvo));
        if (reg) {
            selColab.value = reg.matricula;
            document.getElementById('feriasForm_tipoAfastamento').value = reg.tipo_afastamento || 'ferias';
            document.getElementById('feriasForm_status').value = reg.status || 'programada';
            document.getElementById('feriasForm_dataInicio').value = reg.data_inicio || '';
            document.getElementById('feriasForm_dataFim').value = reg.data_fim || '';
            document.getElementById('feriasForm_diasGozo').value = reg.dias_gozo || 30;
            document.getElementById('feriasForm_obs').value = reg.observacoes || '';
        }
    } else {
        // Defaults para novo lançamento
        document.getElementById('feriasForm_tipoAfastamento').value = 'ferias';
        document.getElementById('feriasForm_status').value = 'programada';
        document.getElementById('feriasForm_dataInicio').value = '';
        document.getElementById('feriasForm_dataFim').value = '';
        document.getElementById('feriasForm_diasGozo').value = 30;
        document.getElementById('feriasForm_obs').value = '';
    }

    onColabFeriasSelectChange();
    modal.style.display = 'flex';
}

function fecharModalLancamentoFerias() {
    const modal = document.getElementById('modalLancamentoFerias');
    if (modal) modal.style.display = 'none';
}

function onColabFeriasSelectChange() {
    const mat = document.getElementById('feriasForm_matricula')?.value;
    const card = document.getElementById('feriasForm_resumoColabCard');
    if (!mat || !card) {
        if (card) card.style.display = 'none';
        return;
    }

    const colab = (allEfetivo || []).find(c => String(c.id) === String(mat));
    if (!colab) {
        card.style.display = 'none';
        return;
    }

    const reg = calcularReguaFeriasClt(colab);
    const anos = Math.floor(reg.mesesTotal / 12);
    const mesesResto = Math.floor(reg.mesesTotal % 12);
    const tempoCasaTxt = anos > 0 ? `${anos} ano(s) e ${mesesResto} mês(es)` : `${mesesResto} mês(es)`;

    document.getElementById('feriasForm_lblNome').textContent = colab.nome || '—';
    document.getElementById('feriasForm_lblMatricula').textContent = colab.id;
    document.getElementById('feriasForm_lblSetor').textContent = colab.setor || '—';
    document.getElementById('feriasForm_lblAdmissao').textContent = reg.dataAdmissao ? formatSimpleDate(reg.dataAdmissao) : '—';
    document.getElementById('feriasForm_lblTempoCasa').textContent = `${tempoCasaTxt} (${Math.floor(reg.mesesTotal)} meses)`;
    document.getElementById('feriasForm_lblLimiteFatal').textContent = reg.limiteConcessivoFatal ? formatSimpleDate(reg.limiteConcessivoFatal) : '—';
    
    let diasDobraTxt = '—';
    if (reg.diasParaDobra !== null) {
        diasDobraTxt = reg.diasParaDobra < 0 
            ? `⚠️ VENCIDO há ${Math.abs(reg.diasParaDobra)} dias` 
            : `${reg.diasParaDobra} dias restantes`;
    }
    document.getElementById('feriasForm_lblDiasDobra').textContent = diasDobraTxt;

    const badgeEl = document.getElementById('feriasForm_badgeStatusClt');
    if (badgeEl) {
        badgeEl.className = reg.badgeClass;
        badgeEl.textContent = reg.label;
    }

    card.style.display = 'block';
}

function onDatasFeriasChange() {
    const dtIni = document.getElementById('feriasForm_dataInicio')?.value;
    const dtFim = document.getElementById('feriasForm_dataFim')?.value;
    const elDias = document.getElementById('feriasForm_diasGozo');

    if (dtIni && dtFim) {
        const d1 = parseLocalDate(dtIni);
        const d2 = parseLocalDate(dtFim);
        if (d2 >= d1) {
            const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (elDias) elDias.value = diff;
        }
    } else if (dtIni && !dtFim) {
        const dias = parseInt(elDias?.value || '30', 10);
        if (dias > 0) {
            const dFimCalculada = addDias(dtIni, dias - 1);
            const inputFim = document.getElementById('feriasForm_dataFim');
            if (inputFim) inputFim.value = dFimCalculada;
        }
    }
}

async function salvarLancamentoFerias() {
    const statusMsg = document.getElementById('feriasForm_statusMsg');
    const btnSalvar = document.getElementById('btnSalvarFeriasModal');
    const feriasId = document.getElementById('feriasForm_id')?.value;
    const matricula = document.getElementById('feriasForm_matricula')?.value;

    if (!matricula) {
        statusMsg.textContent = '❌ Selecione um colaborador obrigatório.';
        statusMsg.style.color = 'var(--danger)';
        return;
    }

    const colab = (allEfetivo || []).find(c => String(c.id) === String(matricula));
    if (!colab) {
        statusMsg.textContent = '❌ Colaborador não encontrado.';
        statusMsg.style.color = 'var(--danger)';
        return;
    }

    const dataAdmissao = colab.dt_admissao || colab.data_admissao;
    if (!dataAdmissao) {
        statusMsg.textContent = '❌ Colaborador selecionado não possui data de admissão no cadastro de efetivo.';
        statusMsg.style.color = 'var(--danger)';
        return;
    }

    const limiteFatal = addMeses(dataAdmissao, 24);
    const tipoAfastamento = document.getElementById('feriasForm_tipoAfastamento')?.value || 'ferias';
    const status = document.getElementById('feriasForm_status')?.value || 'programada';
    const dataInicio = document.getElementById('feriasForm_dataInicio')?.value || null;
    const dataFim = document.getElementById('feriasForm_dataFim')?.value || null;
    const diasGozo = parseInt(document.getElementById('feriasForm_diasGozo')?.value || '30', 10);
    const obs = document.getElementById('feriasForm_obs')?.value || '';

    const payload = {
        matricula: String(colab.id),
        nome_colaborador: colab.nome || '',
        funcao: colab.funcao || '',
        setor: colab.setor || '',
        data_admissao: dataAdmissao,
        limite_concessivo_fatal: limiteFatal,
        tipo_afastamento: tipoAfastamento,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_gozo: isNaN(diasGozo) ? 30 : diasGozo,
        status: status,
        observacoes: obs,
        updated_at: new Date().toISOString()
    };

    if (feriasId) {
        payload.id = feriasId;
    }

    try {
        btnSalvar.disabled = true;
        btnSalvar.textContent = '⏳ Gravando...';
        statusMsg.textContent = 'Gravando no Supabase...';
        statusMsg.style.color = 'var(--text-light)';

        await supabaseUpsert('colaboradores_ferias', [payload]);

        statusMsg.textContent = '✅ Programação de férias salva com sucesso!';
        statusMsg.style.color = '#059669';

        await garantirColaboradoresFeriasCarregados();
        renderFeriasPanel();

        setTimeout(() => {
            fecharModalLancamentoFerias();
            btnSalvar.disabled = false;
            btnSalvar.textContent = '💾 Salvar Programação';
        }, 600);
    } catch (err) {
        console.error('Erro ao salvar programação de férias:', err);
        statusMsg.textContent = '❌ Falha ao gravar: ' + (err.message || err);
        statusMsg.style.color = 'var(--danger)';
        btnSalvar.disabled = false;
        btnSalvar.textContent = '💾 Salvar Programação';
    }
}

async function iniciarGozoFeriasRapido(feriasId, matricula) {
    if (!confirm(`Confirma o início do gozo de férias hoje para o colaborador de matrícula ${matricula}?`)) return;
    try {
        const hojeIso = toISODateLocal(new Date());
        const payload = { id: feriasId, status: 'em_gozo', data_inicio: hojeIso, updated_at: new Date().toISOString() };
        await supabaseUpsert('colaboradores_ferias', [payload]);
        await garantirColaboradoresFeriasCarregados();
        renderFeriasPanel();
    } catch (err) {
        alert('Falha ao iniciar gozo de férias: ' + (err.message || err));
    }
}

async function concluirFeriasRapido(feriasId, matricula) {
    if (!confirm(`Confirma a conclusão do período de férias do colaborador de matrícula ${matricula}?`)) return;
    try {
        const payload = { id: feriasId, status: 'concluida', updated_at: new Date().toISOString() };
        await supabaseUpsert('colaboradores_ferias', [payload]);
        await garantirColaboradoresFeriasCarregados();
        renderFeriasPanel();
    } catch (err) {
        alert('Falha ao concluir férias: ' + (err.message || err));
    }
}

async function excluirLancamentoFeriasAtual() {
    const feriasId = document.getElementById('feriasForm_id')?.value;
    if (!feriasId) return;
    if (!confirm('Tem certeza de que deseja remover este lançamento de férias?')) return;

    try {
        await supabaseDelete('colaboradores_ferias', 'id=eq.' + feriasId);
        await garantirColaboradoresFeriasCarregados();
        renderFeriasPanel();
        fecharModalLancamentoFerias();
    } catch (err) {
        alert('Erro ao excluir férias: ' + (err.message || err));
    }
}

async function sincronizarFeriasCltComEfetivo() {
    const btn = event?.target;
    const oldText = btn ? btn.textContent : '';
    if (btn) btn.textContent = '🔄 Sincronizando...';
    try {
        await dashCacheInvalidate('colaboradores_ferias');
        await garantirColaboradoresFeriasCarregados();
        await renderFeriasPanel();
        if (typeof atualizarCentralAlertasUsuario === 'function') {
            atualizarCentralAlertasUsuario();
        }
        alert('✅ Base CLT sincronizada com sucesso! Todos os prazos e semáforos recalculados.');
    } catch (err) {
        alert('Falha ao sincronizar: ' + (err.message || err));
    } finally {
        if (btn) btn.textContent = oldText;
    }
}

// Exportação Excel via SheetJS
function gerarExcelFerias() {
    if (!dadosFeriasCltCache || dadosFeriasCltCache.length === 0) {
        alert('Nenhum dado de férias disponível para exportação.');
        return;
    }

    const agora = new Date();
    const dataFmt = agora.toLocaleDateString('pt-BR');
    const horaFmt = agora.toLocaleTimeString('pt-BR');

    const aoa = [
        ['MAPA DE GESTÃO DE FÉRIAS E RÉGUA CONCESSIVA CLT — PISF RAMAL DO AGRESTE'],
        [`Gerado em: ${dataFmt} às ${horaFmt} | Total: ${dadosFeriasCltCache.length} colaboradores analisados`],
        [],
        [
            'MATRÍCULA', 'COLABORADOR', 'CPF', 'FUNÇÃO', 'SETOR', 'ADMISSÃO',
            'TEMPO DE CASA (MESES)', 'LIMITE FATAL CLT (24M)', 'DIAS RESTANTES P/ DOBRA',
            'SEMÁFORO CLT', 'STATUS FÉRIAS', 'INÍCIO GOZO', 'FIM GOZO', 'DIAS DE GOZO',
            'ISENÇÃO SST', 'OBSERVAÇÕES'
        ]
    ];

    dadosFeriasCltCache.forEach(d => {
        const reg = d.registroFerias;
        aoa.push([
            d.matricula,
            d.nome,
            d.cpf || '',
            d.funcao || '',
            d.setor || '',
            d.dataAdmissao ? formatSimpleDate(d.dataAdmissao) : '',
            Math.floor(d.mesesTotal),
            d.limiteConcessivoFatal ? formatSimpleDate(d.limiteConcessivoFatal) : '',
            d.diasParaDobra !== null ? d.diasParaDobra : '',
            d.label,
            reg ? reg.status.toUpperCase() : 'PENDENTE',
            reg && reg.data_inicio ? formatSimpleDate(reg.data_inicio) : '',
            reg && reg.data_fim ? formatSimpleDate(reg.data_fim) : '',
            reg ? (reg.dias_gozo || 30) : '',
            d.emGozo ? 'SIM (Isento DDS/Treinamento - ASO no Retorno)' : 'NÃO',
            reg ? (reg.observacoes || '') : ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const headerRow = 3;
    const startCell = XLSX.utils.encode_cell({ r: headerRow, c: 0 });
    const endCell = XLSX.utils.encode_cell({ r: aoa.length - 1, c: 15 });
    ws['!autofilter'] = { ref: `${startCell}:${endCell}` };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Férias_CLT');
    XLSX.writeFile(wb, `Gestao_Ferias_Régua_CLT_${agora.toISOString().slice(0, 10)}.xlsx`);
}

// Impressão padronizada (Blob URL seguro livre de bloqueador de popups)
function imprimirMapaFeriasClt() {
    if (!dadosFeriasCltCache || dadosFeriasCltCache.length === 0) {
        alert('Nenhum dado de férias disponível para impressão.');
        return;
    }

    const agora = new Date();
    const dataFmt = agora.toLocaleDateString('pt-BR');
    const horaFmt = agora.toLocaleTimeString('pt-BR');

    const criticos = dadosFeriasCltCache.filter(d => d.statusClt === 'critico');
    const atencao = dadosFeriasCltCache.filter(d => d.statusClt === 'atencao');
    const emGozo = dadosFeriasCltCache.filter(d => d.emGozo);

    const linhas = dadosFeriasCltCache.map(d => {
        const reg = d.registroFerias;
        const periodo = reg && reg.data_inicio && reg.data_fim 
            ? `${formatSimpleDate(reg.data_inicio)} a ${formatSimpleDate(reg.data_fim)} (${reg.dias_gozo || 30}d)` 
            : '—';
        const diasTxt = d.diasParaDobra !== null ? (d.diasParaDobra < 0 ? `Vencido há ${Math.abs(d.diasParaDobra)}d` : `${d.diasParaDobra}d restantes`) : '—';
        return `
            <tr>
                <td style="padding:6px; font-weight:bold; border-bottom:1px solid #ddd;">${escapeHTML(d.matricula)}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${escapeHTML(d.nome)}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${escapeHTML(d.funcao)} / ${escapeHTML(d.setor)}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${d.dataAdmissao ? formatSimpleDate(d.dataAdmissao) : '—'}</td>
                <td style="padding:6px; font-weight:bold; border-bottom:1px solid #ddd;">${d.limiteConcessivoFatal ? formatSimpleDate(d.limiteConcessivoFatal) : '—'}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${diasTxt}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${escapeHTML(d.label)}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${periodo}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Mapa de Férias e Régua Concessiva CLT</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; }
                h2 { margin: 0 0 4px; font-size: 16px; color: #0284c7; }
                .sub { color: #64748b; font-size: 11px; margin-bottom: 14px; }
                .resumo-box { display: flex; gap: 14px; margin-bottom: 14px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
                .resumo-item { flex: 1; }
                .resumo-item b { font-size: 14px; display: block; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #f1f5f9; padding: 8px 6px; font-size: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <h2>🏖️ Mapa de Gestão de Férias e Régua Concessiva CLT (Art. 130 e 134)</h2>
            <div class="sub">PISF Ramal do Agreste • Gerado em: ${dataFmt} às ${horaFmt}</div>
            
            <div class="resumo-box">
                <div class="resumo-item" style="color:#b91c1c;"><b>${criticos.length}</b> Risco Dobra CLT (≥23m)</div>
                <div class="resumo-item" style="color:#d97706;"><b>${atencao.length}</b> Atenção / Programar (19-22m)</div>
                <div class="resumo-item" style="color:#0284c7;"><b>${emGozo.length}</b> Em Gozo Ativo Hoje</div>
                <div class="resumo-item" style="color:#059669;"><b>${dadosFeriasCltCache.length}</b> Efetivo Ativo Analisado</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Mat.</th>
                        <th>Colaborador</th>
                        <th>Função / Setor</th>
                        <th>Admissão</th>
                        <th>Limite 24m</th>
                        <th>Prazo</th>
                        <th>Semáforo CLT</th>
                        <th>Período Gozo</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhas}
                </tbody>
            </table>
        </body>
        </html>
    `;

    abrirDocumentoHtmlParaImpressao(html, 'Mapa de Férias e Régua Concessiva CLT');
}

// ============================================
// RELATÓRIO CONFIGURÁVEL DE GESTÃO DE PESSOAS (EFETIVO) - mesmo padrão já usado em Saúde
// Ocupacional: o usuário escolhe via checkbox quais KPIs/gráficos/quadros entram no
// relatório antes de gerar. Os KPIs/gráficos vêm de window.efetivoReportData (preenchido
// no fim de renderEfetivoPanel - nunca recalculado aqui); os Quadros de Mão de Obra Local
// são calculados na hora, chamando montarQuadrosMaoDeObra() com o Mês/Ano que estiver nos
// campos já existentes na sub-aba 🗺️ Mão de Obra Local.
// ============================================

function renderEfetivoRelatorioChecklist() {
    syncEfetivoFiltroSelects();
    const el = document.getElementById('efetivoRelPeriodo');
    if (el && window.efetivoReportData) el.textContent = window.efetivoReportData.periodoLabel || '—';
}

function marcarTodosRelatorioEfetivo(valor) {
    ['relEfetivoChk_efetivoAtual', 'relEfetivoChk_admissoes', 'relEfetivoChk_demissoes', 'relEfetivoChk_turnover', 'relEfetivoChk_tempoCasa',
     'relEfetivoChk_graficoEvolucao', 'relEfetivoChk_graficoIndiceHht', 'relEfetivoChk_graficoSetor', 'relEfetivoChk_graficoFuncao',
     'relEfetivoChk_graficoHht220', 'relEfetivoChk_graficoSexo', 'relEfetivoChk_graficoFaixaEtaria', 'relEfetivoChk_graficoAniversariantes',
     'relEfetivoChk_graficoAdaAtual', 'relEfetivoChk_graficoAdaAdmissoes', 'relEfetivoChk_quadro1', 'relEfetivoChk_quadro2'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.checked = valor;
    });
}

function lerSelecaoRelatorioEfetivo() {
    return {
        efetivoAtual: document.getElementById('relEfetivoChk_efetivoAtual').checked,
        admissoes: document.getElementById('relEfetivoChk_admissoes').checked,
        demissoes: document.getElementById('relEfetivoChk_demissoes').checked,
        turnover: document.getElementById('relEfetivoChk_turnover').checked,
        tempoCasa: document.getElementById('relEfetivoChk_tempoCasa').checked,
        graficoEvolucao: document.getElementById('relEfetivoChk_graficoEvolucao').checked,
        graficoIndiceHht: document.getElementById('relEfetivoChk_graficoIndiceHht').checked,
        graficoSetor: document.getElementById('relEfetivoChk_graficoSetor').checked,
        graficoFuncao: document.getElementById('relEfetivoChk_graficoFuncao').checked,
        graficoHht220: document.getElementById('relEfetivoChk_graficoHht220').checked,
        graficoSexo: document.getElementById('relEfetivoChk_graficoSexo').checked,
        graficoFaixaEtaria: document.getElementById('relEfetivoChk_graficoFaixaEtaria').checked,
        graficoAniversariantes: document.getElementById('relEfetivoChk_graficoAniversariantes').checked,
        graficoAdaAtual: document.getElementById('relEfetivoChk_graficoAdaAtual').checked,
        graficoAdaAdmissoes: document.getElementById('relEfetivoChk_graficoAdaAdmissoes').checked,
        quadro1: document.getElementById('relEfetivoChk_quadro1').checked,
        quadro2: document.getElementById('relEfetivoChk_quadro2').checked
    };
}

async function gerarExcelEfetivo() {
    const statusEl = document.getElementById('relatorioEfetivoStatus');
    const dados = window.efetivoReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioEfetivo();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [];
    aoa.push([`RELATÓRIO DE GESTÃO DE PESSOAS (EFETIVO) — ${dados.periodoLabel}`]);
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
        if (g.linhas) {
            aoa.push(['Dia', 'Nome', 'Função', 'Idade que completa']);
            if (g.linhas.length === 0) aoa.push(['Nenhum aniversariante ativo neste mês', '', '', '']);
            else g.linhas.forEach(l => aoa.push([l.dia, l.nome, l.funcao, l.idade]));
        } else if (g.series) {
            aoa.push(['Categoria', ...g.series.map(s => s.nome)]);
            g.labels.forEach((label, i) => aoa.push([label, ...g.series.map(s => s.valores[i])]));
        } else {
            aoa.push(['Categoria', 'Valor']);
            g.labels.forEach((label, i) => aoa.push([label, g.valores[i]]));
        }
        aoa.push([]);
    });

    if (marcados.quadro1 || marcados.quadro2) {
        const ano = parseInt(document.getElementById('maoObraAno').value);
        const mes = parseInt(document.getElementById('maoObraMes').value);
        const nomeMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mes];
        const { totalFuncionarios, linhasQuadro1, linhasQuadro2, totalAda, pctAda } = montarQuadrosMaoDeObra(ano, mes);
        if (linhasQuadro1.length === 0) {
            aoa.push([`MÃO DE OBRA LOCAL (${nomeMes}/${ano}) — nenhum colaborador ativo encontrado nesse mês`]);
            aoa.push([]);
        } else {
            if (marcados.quadro1) {
                aoa.push([`QUADRO 1 — Demonstrativo da ocupação da mão de obra local por município (${nomeMes}/${ano})`]);
                aoa.push(['Número Total de Funcionários da Obra', totalFuncionarios]);
                aoa.push(['MUNICÍPIO DE ORIGEM', 'UF DE ORIGEM', 'Nº DE TRABALHADORES POR MUNICÍPIO']);
                linhasQuadro1.forEach(l => aoa.push([l.municipio, l.uf, l.qtd]));
                aoa.push(['TOTAL', '', totalFuncionarios]);
                aoa.push([]);
            }
            if (marcados.quadro2) {
                aoa.push([`QUADRO 2 — Municípios na Área Diretamente Afetada - ADA (${nomeMes}/${ano})`]);
                aoa.push(['MUNICÍPIO DE ORIGEM ADA', 'UF DE ORIGEM', 'Nº DE FUNCIONÁRIOS', 'PORCENTAGEM SOBRE O TOTAL (%)']);
                linhasQuadro2.forEach(l => aoa.push([l.municipio, l.uf, l.qtd, r2(l.pct)]));
                aoa.push(['TOTAL', '', totalAda, r2(pctAda) + '%']);
                aoa.push([]);
            }
        }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EFETIVO');

    const dataSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RELATORIO_EFETIVO_${dataSlug}.xlsx`);

    statusEl.textContent = `✅ Excel gerado com ${Object.values(marcados).filter(Boolean).length} item(ns) selecionado(s).`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfRelatorioEfetivo() {
    const statusEl = document.getElementById('relatorioEfetivoStatus');
    const dados = window.efetivoReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioEfetivo();
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

    const graficosHtml = Object.entries(dados.graficos).filter(([key]) => marcados[key]).map(([key, g]) => {
        if (g.linhas) {
            return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:100%; margin-bottom:14px;">
        <thead><tr><th>Dia</th><th>Nome</th><th>Função</th><th>Idade que completa</th></tr></thead>
        <tbody>${g.linhas.length === 0
            ? '<tr><td colspan="4">Nenhum aniversariante ativo neste mês</td></tr>'
            : g.linhas.map(l => `<tr><td>${l.dia}</td><td style="text-align:left;">${escapeHTML(l.nome)}</td><td style="text-align:left;">${escapeHTML(l.funcao)}</td><td>${l.idade}</td></tr>`).join('')}</tbody>
    </table>`;
        }
        if (g.series) {
            return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:85%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th>${g.series.map(s => `<th>${escapeHTML(s.nome)}</th>`).join('')}</tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td>${g.series.map(s => `<td>${escapeHTML(String(s.valores[i]))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
        }
        return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td><td>${escapeHTML(String(g.valores[i]))}</td></tr>`).join('')}</tbody>
    </table>`;
    }).join('');

    let maoDeObraHtml = '';
    if (marcados.quadro1 || marcados.quadro2) {
        const ano = parseInt(document.getElementById('maoObraAno').value);
        const mes = parseInt(document.getElementById('maoObraMes').value);
        const nomeMes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mes];
        const { totalFuncionarios, linhasQuadro1, linhasQuadro2, totalAda, pctAda } = montarQuadrosMaoDeObra(ano, mes);
        if (linhasQuadro1.length === 0) {
            maoDeObraHtml = `<h3>Mão de Obra Local (${escapeHTML(nomeMes)}/${ano})</h3><p>Nenhum colaborador ativo encontrado nesse mês.</p>`;
        } else {
            if (marcados.quadro1) {
                maoDeObraHtml += `
    <h3>Quadro 1 — Demonstrativo da ocupação da mão de obra local por município (${escapeHTML(nomeMes)}/${ano})</h3>
    <p style="font-size:10.5px;">Número Total de Funcionários da Obra: <strong>${totalFuncionarios}</strong></p>
    <table style="width:75%; margin-bottom:14px;">
        <thead><tr><th>MUNICÍPIO DE ORIGEM</th><th>UF DE ORIGEM</th><th>Nº DE TRABALHADORES</th></tr></thead>
        <tbody>${linhasQuadro1.map(l => `<tr><td style="text-align:left;">${escapeHTML(l.municipio)}</td><td>${escapeHTML(l.uf)}</td><td>${l.qtd}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>TOTAL</td><td></td><td>${totalFuncionarios}</td></tr></tfoot>
    </table>`;
            }
            if (marcados.quadro2) {
                maoDeObraHtml += `
    <h3>Quadro 2 — Municípios na Área Diretamente Afetada - ADA (${escapeHTML(nomeMes)}/${ano})</h3>
    <table style="width:85%; margin-bottom:14px;">
        <thead><tr><th>MUNICÍPIO DE ORIGEM ADA</th><th>UF</th><th>Nº DE FUNCIONÁRIOS</th><th>% SOBRE O TOTAL</th></tr></thead>
        <tbody>${linhasQuadro2.map(l => `<tr><td style="text-align:left;">${escapeHTML(l.municipio)}</td><td>${escapeHTML(l.uf)}</td><td>${l.qtd}</td><td>${r2(l.pct)}%</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>TOTAL</td><td></td><td>${totalAda}</td><td>${r2(pctAda)}%</td></tr></tfoot>
    </table>`;
            }
        }
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Gestão de Pessoas (Efetivo)</title>
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
    tfoot td { font-weight:700; background:#e0e0e0; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    @media print { .no-print { display:none; } body { margin:0; } thead { display: table-header-group; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="cabecalho">
        <img src="${LOGO_COP_BASE64}" alt="COP">
        <div class="titulo">RELATÓRIO DE GESTÃO DE PESSOAS (EFETIVO)</div>
        <div style="width:40px;"></div>
    </div>
    <div class="info-geracao">${escapeHTML(EMPRESA_INFO.razaoSocial)} — Período: ${escapeHTML(dados.periodoLabel)} — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    ${kpisHtml}
    ${graficosHtml}
    ${maoDeObraHtml}
</body></html>`;

    abrirDocumentoBlob(html);
    statusEl.textContent = `✅ Relatório gerado — abra a aba nova pra imprimir/salvar em PDF.`;
    statusEl.style.color = 'var(--success)';
}

// ============================================
// MÃO DE OBRA LOCAL (Quadros 1 e 2 do RSA) - ocupação de mão de obra por
// município de origem, e % de contratados vindos de municípios da Área
// Diretamente Afetada (ADA). Usa os campos "cidade"/"estado" que já existem
// em colaboradores_efetivo (já preenchidos historicamente) - não precisou de
// campo novo no cadastro.
// ============================================

// Mapa nome-do-estado -> UF, porque "estado" em colaboradores_efetivo é texto
// livre (tem registro como "PERNAMBUCO" e outro como "PE" pro MESMO município
// - sem isso, os dois viram grupos separados e o Quadro 1 conta errado).
const NOME_ESTADO_PARA_UF = {
    'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPÁ': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
    'CEARÁ': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPÍRITO SANTO': 'ES', 'GOIÁS': 'GO',
    'MARANHÃO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
    'MINAS GERAIS': 'MG', 'PARÁ': 'PA', 'PARAÍBA': 'PB', 'PARANÁ': 'PR',
    'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI', 'RIO DE JANEIRO': 'RJ',
    'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', 'RONDÔNIA': 'RO',
    'RORAIMA': 'RR', 'SANTA CATARINA': 'SC', 'SÃO PAULO': 'SP', 'SERGIPE': 'SE',
    'TOCANTINS': 'TO'
};
function normalizarUF(estadoTexto) {
    const t = (estadoTexto || '').trim();
    if (t.length === 2) return t.toUpperCase();
    return NOME_ESTADO_PARA_UF[t.toUpperCase()] || t.toUpperCase();
}

function popularMaoDeObraDefaults() {
    const hoje = new Date();
    const mesEl = document.getElementById('maoObraMes');
    const anoEl = document.getElementById('maoObraAno');
    if (mesEl && !mesEl.dataset.inicializado) { mesEl.value = String(hoje.getMonth()); mesEl.dataset.inicializado = '1'; }
    if (anoEl && !anoEl.value) anoEl.value = hoje.getFullYear();
}

function renderMunicipiosAdaLista() {
    const el = document.getElementById('municipiosAdaLista');
    if (!el) return;
    if (allMunicipiosAda.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum município ADA cadastrado.</div>';
        return;
    }
    const ordenados = [...allMunicipiosAda].sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));
    el.innerHTML = ordenados.map(m => `
        <div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span>${escapeHTML(m.municipio)} / ${escapeHTML(m.uf)}</span>
            <button class="db-clear-btn" onclick="removerMunicipioAda('${m.id}')">🗑️ Remover</button>
        </div>`).join('');
}

async function adicionarMunicipioAda() {
    const nomeEl = document.getElementById('municipioAdaNovoNome');
    const ufEl = document.getElementById('municipioAdaNovoUf');
    const statusEl = document.getElementById('municipioAdaStatus');
    const municipio = (nomeEl.value || '').trim().toUpperCase();
    const uf = normalizarUF(ufEl.value || '');
    if (!municipio || uf.length !== 2) {
        statusEl.textContent = '❌ Preencha o município e a UF (2 letras).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const id = municipio.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + uf.toLowerCase();
    if (allMunicipiosAda.some(m => m.id === id)) {
        statusEl.textContent = 'Esse município já está na lista.';
        statusEl.style.color = 'var(--text-light)';
        return;
    }
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        const row = { id, municipio, uf };
        await supabaseUpsert('municipios_ada', [row]);
        allMunicipiosAda.push(row);
        nomeEl.value = '';
        ufEl.value = '';
        renderMunicipiosAdaLista();
        statusEl.textContent = '✅ Adicionado.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao adicionar município ADA:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function removerMunicipioAda(id) {
    const m = allMunicipiosAda.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Remover "${m.municipio}/${m.uf}" da lista de municípios ADA?`)) return;
    try {
        await supabaseDelete('municipios_ada', id);
        allMunicipiosAda = allMunicipiosAda.filter(x => x.id !== id);
        renderMunicipiosAdaLista();
    } catch (err) {
        console.error('Erro ao remover município ADA:', err);
    }
}

// Mesmo filtro de headcountAsOf(), só que devolvendo os registros em vez da
// contagem - precisa dos registros aqui pra agrupar por cidade/estado, não só
// contar.
function colaboradoresAtivosEm(dataRef) {
    return allEfetivo.filter(e => {
        if (!e.dt_admissao) return false;
        if (parseLocalDate(e.dt_admissao) > dataRef) return false;
        if (!e.dt_demissao) return true;
        return parseLocalDate(e.dt_demissao) > dataRef;
    });
}

// Monta o Quadro 1 (todos os municípios de origem) e o Quadro 2 (só os
// municípios ADA, com % sobre o total) pro fim do mês escolhido - mesmo
// "retrato no fim do mês" que headcountAsOf() já usa em Treinamentos/Efetivo,
// pra bater com o mesmo efetivo do mês mostrado no resto do sistema.
function montarQuadrosMaoDeObra(ano, mesIndex0) {
    const fim = new Date(ano, mesIndex0 + 1, 0);
    const ativos = colaboradoresAtivosEm(fim);
    const totalFuncionarios = ativos.length;

    const porMunicipio = new Map();
    ativos.forEach(e => {
        const municipio = (e.cidade || '').trim().toUpperCase() || '(NÃO INFORMADO)';
        const uf = normalizarUF(e.estado);
        if (!porMunicipio.has(municipio)) porMunicipio.set(municipio, { municipio, uf, qtd: 0 });
        porMunicipio.get(municipio).qtd++;
    });
    const linhasQuadro1 = Array.from(porMunicipio.values()).sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));

    const chavesAda = new Set(allMunicipiosAda.map(m => `${m.municipio.toUpperCase()}||${normalizarUF(m.uf)}`));
    const linhasQuadro2 = linhasQuadro1
        .filter(l => chavesAda.has(`${l.municipio}||${l.uf}`))
        .map(l => ({ ...l, pct: totalFuncionarios > 0 ? (l.qtd / totalFuncionarios * 100) : 0 }));
    const totalAda = linhasQuadro2.reduce((s, l) => s + l.qtd, 0);
    const pctAda = totalFuncionarios > 0 ? (totalAda / totalFuncionarios * 100) : 0;

    return { totalFuncionarios, linhasQuadro1, linhasQuadro2, totalAda, pctAda };
}

// ============================================
// SETORES - mesmo raciocínio de Gestão de Equipes (Treinamentos), só que pro campo
// "setor" em vez de "responsavel". Setor não é uma tabela própria - é só um campo texto
// em colaboradores_efetivo, então "criar um setor" é só abrir o painel de gestão com um
// nome novo (fica de verdade a partir do primeiro colaborador movido pra ele), e
// "renomear" é um UPDATE em lote de todo mundo que está com aquele texto hoje.
// ============================================

let setorAtualGerenciado = null;

function renderSetoresLista() {
    const container = document.getElementById('setoresLista');
    const resumo = document.getElementById('setoresResumo');
    if (!container) return;

    const contagem = new Map();
    allEfetivo.forEach(e => {
        if (!colaboradorEstaAtivo(e) || !e.setor) return;
        contagem.set(e.setor, (contagem.get(e.setor) || 0) + 1);
    });
    const setores = Array.from(contagem.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (resumo) resumo.textContent = `${setores.length} setor(es) em uso`;

    if (setores.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum setor cadastrado ainda.</div>';
        return;
    }
    container.innerHTML = setores.map(([nome, qtd]) => `
        <div class="db-list-item" style="cursor:pointer;" onclick="abrirGerenciarSetor('${escapeHTML(nome)}')">
            <div class="db-list-item-title">${escapeHTML(nome)}</div>
            <div class="db-list-item-sub">${qtd} colaborador(es)</div>
        </div>`).join('');
}

function criarNovoSetor() {
    const nome = prompt('Nome do novo setor:');
    if (!nome || !nome.trim()) return;
    abrirGerenciarSetor(nome.trim().toUpperCase());
}

function abrirGerenciarSetor(nomeSetor) {
    setorAtualGerenciado = nomeSetor;
    document.getElementById('setorGerenciarTitulo').textContent = '🏢 ' + nomeSetor;
    document.getElementById('setorGerenciarStatus').textContent = '';
    document.getElementById('setorAddColabInput').value = '';
    document.getElementById('setorAddColabResults').innerHTML = '';
    document.getElementById('setorGerenciarCard').style.display = 'block';
    renderSetorColabList();
    document.getElementById('setorGerenciarCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharGerenciarSetor() {
    setorAtualGerenciado = null;
    const card = document.getElementById('setorGerenciarCard');
    if (card) card.style.display = 'none';
}

function renderSetorColabList() {
    const container = document.getElementById('setorColabList');
    if (!container || !setorAtualGerenciado) return;
    const equipe = allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.setor === setorAtualGerenciado)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (equipe.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador neste setor ainda.</div>';
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
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="removerDoSetor('${escapeHTML(e.id)}')">Remover</button>
            </div>
        </div>`).join('');
}

function filterSetorAddColab(query) {
    const container = document.getElementById('setorAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    const matches = allEfetivo.filter(e =>
        colaboradorEstaAtivo(e) && e.setor !== setorAtualGerenciado &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarAoSetor('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${e.setor ? ' — atualmente em ' + escapeHTML(e.setor) : ' — sem setor definido'}</div>
        </div>`).join('');
}

async function salvarSetorColaborador(matricula, novoSetor) {
    const statusEl = document.getElementById('setorGerenciarStatus');
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        await supabaseUpsert('colaboradores_efetivo', [{ id: matricula, setor: novoSetor }]);
        e.setor = novoSetor;
        if (statusEl) { statusEl.textContent = '✅ Atualizado.'; statusEl.style.color = 'var(--success)'; }
        renderSetorColabList();
        renderSetoresLista();
    } catch (err) {
        console.error('Erro ao atualizar setor do colaborador:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function adicionarAoSetor(matricula) {
    if (!setorAtualGerenciado) return;
    salvarSetorColaborador(matricula, setorAtualGerenciado);
    document.getElementById('setorAddColabInput').value = '';
    document.getElementById('setorAddColabResults').innerHTML = '';
}

function removerDoSetor(matricula) {
    if (!confirm('Remover este colaborador do setor? Ele fica sem setor definido até ser adicionado a outro.')) return;
    salvarSetorColaborador(matricula, null);
}

async function renomearSetor() {
    if (!setorAtualGerenciado) return;
    const novoNome = prompt(`Renomear "${setorAtualGerenciado}" para:`, setorAtualGerenciado);
    if (!novoNome || !novoNome.trim() || novoNome.trim() === setorAtualGerenciado) return;
    const nomeFinal = novoNome.trim().toUpperCase();

    const afetados = allEfetivo.filter(e => e.setor === setorAtualGerenciado);
    const statusEl = document.getElementById('setorGerenciarStatus');
    statusEl.textContent = `Renomeando ${afetados.length} colaborador(es)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        const linhas = afetados.map(e => ({ id: e.id, setor: nomeFinal }));
        if (linhas.length > 0) await supabaseUpsert('colaboradores_efetivo', linhas);
        afetados.forEach(e => { e.setor = nomeFinal; });
        setorAtualGerenciado = nomeFinal;
        document.getElementById('setorGerenciarTitulo').textContent = '🏢 ' + nomeFinal;
        statusEl.textContent = `✅ ${afetados.length} colaborador(es) movido(s) pra "${nomeFinal}".`;
        statusEl.style.color = 'var(--success)';
        renderSetorColabList();
        renderSetoresLista();
    } catch (err) {
        console.error('Erro ao renomear setor:', err);
        statusEl.textContent = '❌ Falha: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

