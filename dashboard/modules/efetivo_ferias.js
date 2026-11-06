// ==============================================================================
// MODULO: GESTAO DE EFETIVO, FERIAS E MAO DE OBRA LOCAL
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// EFETIVO (Parte B) - replica as fórmulas já usadas na aba TBs_DINAMICAS da
// planilha TREINAMENTOS_EFETIVO.xlsx: admissões/demissões por COUNTIF de mês,
// efetivo real como headcount na data, índice = HHT do mês ÷ efetivo do mês × 100.
// ============================================

var allEfetivo = [];
var allGheCatalogo = [];
var allMunicipiosAda = [];
var allColaboradoresFerias = [];
var dadosFeriasCltCache = [];
var valFeriasFiltroAtual = 'todos'; // 'todos' | 'critico' | 'atencao' | 'normal' | 'emGozo' | 'programadas' | 'concluidas'
var efetivoLoaded = false;
var allFrentesCatalogo = [];
window.allFrentesCatalogo = allFrentesCatalogo;

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
        try {
            const frentesCfg = await supabaseFetch('configuracoes_sistema', '?id=eq.efetivo_frentes_catalogo&limit=1');
            if (frentesCfg && frentesCfg.length > 0 && Array.isArray(frentesCfg[0].valor)) {
                allFrentesCatalogo = frentesCfg[0].valor;
                window.allFrentesCatalogo = allFrentesCatalogo;
            } else {
                allFrentesCatalogo = [];
                window.allFrentesCatalogo = allFrentesCatalogo;
            }
        } catch (errCfg) {
            console.warn('Aviso ao buscar efetivo_frentes_catalogo:', errCfg);
            allFrentesCatalogo = [];
            window.allFrentesCatalogo = allFrentesCatalogo;
        }
        popularGheCatalogoDatalist();
        popularFrentesDatalist();
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

// Abas da página Efetivo (Visão Geral / Colaboradores / Terceiros & PJ / Férias / etc.)
function showEfetivoSubtab(tab) {
    ['visao', 'colaboradores', 'terceiros', 'ferias', 'os', 'setores', 'frentes', 'ghe', 'recomendacoes', 'maoobra', 'relatorio'].forEach(t => {
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
    if (tab === 'terceiros') {
        renderTerceirosPanel();
    }
    if (tab === 'ferias') {
        renderFeriasPanel();
    }
    if (tab === 'os') renderControleOrdensServico();
    if (tab === 'setores') { fecharGerenciarSetor(); renderSetoresLista(); }
    if (tab === 'frentes') { fecharGerenciarFrente(); renderFrentesLista(); }
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
    const cicloBadge = reg.resumoCiclos ? reg.resumoCiclos.badgeCicloHtml : '';
    return `<div style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;">${cicloBadge} <span class="${reg.badgeClass}">${escapeHTML(reg.label)} • Limite ${reg.limiteMesesLabel || '24m'}: ${prazoTxt}</span></div>`;
}

// Helper central de Ciclos de Férias (CLT Art. 129 a 134 e NR-07)
function obterResumoCiclosFeriasColab(matricula) {
    if (!matricula) {
        return {
            ciclo1Fechado: false,
            ciclo2Fechado: false,
            ciclo3Fechado: false,
            cicloAtualRotulo: '1º Ciclo',
            statusCicloAtual: 'Pendente',
            badgeCicloHtml: '<span class="badge-ciclo-pendente">1º Ciclo Aberto</span>',
            registroEmGozo: null,
            registroProgramado: null,
            registros: []
        };
    }

    const matStr = String(matricula);
    const regs = (allColaboradoresFerias || []).filter(f => String(f.matricula) === matStr && f.status !== 'cancelada');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeIso = toISODateLocal(hoje);

    // Registro ativo no momento
    const regEmGozo = regs.find(f => f.status === 'em_gozo' || (f.data_inicio && f.data_fim && hojeIso >= f.data_inicio && hojeIso <= f.data_fim));
    const regProg = regs.find(f => f.status === 'programada' && f.data_inicio && hojeIso < f.data_inicio);

    // Identificação de ciclos concluídos / gozados
    // Ciclo 1: marcado com ciclo_rotulo contendo '1' ou registro com status 'concluida' / 'Gozado/Fechado'
    const ciclo1Fechado = regs.some(f => {
        const eh1 = !f.ciclo_rotulo || f.ciclo_rotulo.includes('1');
        const fechado = f.status_ciclo === 'Gozado/Fechado' || f.status === 'concluida';
        return eh1 && fechado;
    });

    // Ciclo 2: marcado com ciclo_rotulo contendo '2' e concluída / Gozado
    const ciclo2Fechado = regs.some(f => {
        const eh2 = f.ciclo_rotulo && f.ciclo_rotulo.includes('2');
        const fechado = f.status_ciclo === 'Gozado/Fechado' || f.status === 'concluida';
        return eh2 && fechado;
    });

    const ciclo3Fechado = regs.some(f => {
        const eh3 = f.ciclo_rotulo && f.ciclo_rotulo.includes('3');
        const fechado = f.status_ciclo === 'Gozado/Fechado' || f.status === 'concluida';
        return eh3 && fechado;
    });

    let cicloAtualRotulo = '1º Ciclo';
    let statusCicloAtual = 'Pendente';

    if (ciclo2Fechado) {
        cicloAtualRotulo = '3º Ciclo';
    } else if (ciclo1Fechado) {
        cicloAtualRotulo = '2º Ciclo';
    } else {
        cicloAtualRotulo = '1º Ciclo';
    }

    let badgeCicloHtml = '';
    if (regEmGozo) {
        statusCicloAtual = 'Em Gozo';
        badgeCicloHtml = '<span class="badge-ferias-em-gozo" title="Colaborador em gozo de férias no momento">🏖️ Em Férias</span>';
    } else if (ciclo2Fechado) {
        statusCicloAtual = 'Gozado/Fechado';
        badgeCicloHtml = '<span class="badge-ciclo-2ok" title="2º Ciclo de Férias Quitado/Gozado">2º Ciclo OK</span>';
    } else if (ciclo1Fechado) {
        statusCicloAtual = 'Gozado/Fechado';
        badgeCicloHtml = '<span class="badge-ciclo-ok" title="1º Ciclo de Férias Quitado/Gozado — Apto rotineiro para exames periódicos">1º Ciclo OK</span>';
    } else if (regProg) {
        statusCicloAtual = 'Programado';
        badgeCicloHtml = `<span class="badge-ferias-programada" title="Férias agendadas para ${formatSimpleDate(regProg.data_inicio)}">📅 1º Ciclo Prog.</span>`;
    } else {
        statusCicloAtual = 'Pendente';
        badgeCicloHtml = '<span class="badge-ciclo-pendente" title="Ciclo em aberto / pendente de agendamento">1º Ciclo Aberto</span>';
    }

    return {
        ciclo1Fechado,
        ciclo2Fechado,
        ciclo3Fechado,
        cicloAtualRotulo,
        statusCicloAtual,
        badgeCicloHtml,
        registroEmGozo: regEmGozo || null,
        registroProgramado: regProg || null,
        registros: regs
    };
}

// Fechamento rápido de ciclo de férias com 1 clique (sem necessidade de datas retroativas)
async function marcarCicloFeriasGozadoRapido(matricula, cicloRotulo = '1º Ciclo') {
    if (!matricula) return;
    const colab = (allEfetivo || []).find(c => String(c.id) === String(matricula));
    const nomeColab = colab ? colab.nome : `Matrícula ${matricula}`;

    const confirmar = confirm(`Confirma marcar o ${cicloRotulo} como "Gozado / Histórico Fechado" para ${nomeColab}?\n\nEssa ação liquida o ciclo anterior sem exigir o preenchimento de datas retroativas.`);
    if (!confirmar) return;

    try {
        const dataAdm = colab ? (colab.dt_admissao || colab.data_admissao) : null;
        const mesesLimite = cicloRotulo.includes('2') ? 36 : 24;
        const limiteFatal = dataAdm ? addMeses(dataAdm, mesesLimite) : toISODateLocal(new Date());

        // Busca registro existente do mesmo ciclo para evitar duplicidade
        const regExistente = (allColaboradoresFerias || []).find(f =>
            String(f.matricula) === String(matricula) &&
            f.status !== 'cancelada' &&
            (f.ciclo_rotulo === cicloRotulo || (cicloRotulo.includes('1') && (!f.ciclo_rotulo || f.ciclo_rotulo.includes('1'))))
        );

        const payloadFerias = {
            matricula: String(matricula),
            nome_colaborador: colab ? colab.nome : '',
            funcao: colab ? (colab.funcao || '') : '',
            setor: colab ? (colab.setor || '') : '',
            data_admissao: dataAdm || toISODateLocal(new Date()),
            limite_concessivo_fatal: limiteFatal,
            ciclo_rotulo: cicloRotulo,
            status_ciclo: 'Gozado/Fechado',
            status: 'concluida',
            tipo_afastamento: 'ferias',
            data_inicio: null,
            data_fim: null,
            dias_gozo: 30,
            observacoes: `Histórico do ${cicloRotulo} liquidado/gozado rapidamente via painel em ${new Date().toLocaleDateString('pt-BR')}.`,
            updated_at: new Date().toISOString()
        };

        if (regExistente && regExistente.id) {
            payloadFerias.id = regExistente.id;
        }

        // 1. Grava em colaboradores_ferias
        await supabaseUpsert('colaboradores_ferias', [payloadFerias]);

        // 2. Atualiza colaboradores_efetivo
        const proximoCiclo = cicloRotulo.includes('1') ? '2º Ciclo' : (cicloRotulo.includes('2') ? '3º Ciclo' : '4º Ciclo');
        if (colab) {
            colab.ciclo_ferias_atual = proximoCiclo;
            await supabaseUpsert('colaboradores_efetivo', [{
                id: String(colab.id),
                ciclo_ferias_atual: proximoCiclo
            }]);
        }

        // 3. Invalida cache e recarrega
        if (typeof dashCacheInvalidate === 'function') {
            await dashCacheInvalidate('colaboradores_ferias');
            await dashCacheInvalidate('colaboradores_efetivo');
        }
        await garantirColaboradoresFeriasCarregados();

        // 4. Atualiza todas as interfaces com isolamento seguro
        if (typeof renderFeriasPanel === 'function') await renderFeriasPanel();
        try {
            if (typeof filterEfetivoColaboradores === 'function') filterEfetivoColaboradores(document.getElementById('efetivoSearchInput')?.value || '');
        } catch (eUi1) { console.warn('Aviso ao atualizar lista de colaboradores:', eUi1); }
        try {
            if (typeof renderRecomendacaoPsicossocial === 'function') renderRecomendacaoPsicossocial();
        } catch (eUi2) { console.warn('Aviso ao atualizar painel psicossocial:', eUi2); }
        try {
            if (typeof mostrarDetalheColaborador === 'function' && document.getElementById('efetivoColabDetail')?.style.display !== 'none') {
                mostrarDetalheColaborador(matricula);
            }
        } catch (eUi3) { console.warn('Aviso ao atualizar ficha do colaborador:', eUi3); }

        if (typeof mostrarFeedbackToast === 'function') {
            mostrarFeedbackToast(`✅ ${cicloRotulo} registrado como Gozado com sucesso!`, 'sucesso');
        } else {
            alert(`✅ ${cicloRotulo} registrado como Gozado com sucesso!`);
        }
    } catch (err) {
        console.error('Erro ao fechar ciclo de férias rápido:', err);
        alert('Falha ao registrar ciclo de férias: ' + (err.message || err));
    }
}

// Cálculo central da régua de vencimento concessivo da CLT (Artigos 130 e 134) integrado por Ciclos
function calcularReguaFeriasClt(colab) {
    const matricula = colab.id;
    const dataAdmStr = colab.dt_admissao || colab.data_admissao || '';
    const resumoCiclos = obterResumoCiclosFeriasColab(matricula);

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
            limiteMesesLabel: '24m',
            mesesTotal: 0,
            diasParaDobra: null,
            statusClt: 'normal',
            label: 'Sem data de admissão',
            badgeClass: 'badge-ferias-normal',
            registroFerias: null,
            emGozo: false,
            programada: false,
            concluida: false,
            resumoCiclos: resumoCiclos,
            cicloAtualRotulo: resumoCiclos.cicloAtualRotulo,
            ciclo1Fechado: resumoCiclos.ciclo1Fechado,
            ciclo2Fechado: resumoCiclos.ciclo2Fechado
        };
    }

    const adm = parseLocalDate(dataAdmStr);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeIso = toISODateLocal(hoje);

    const totalMeses = Math.max(0, (hoje.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

    // Determina o limite fatal concessivo com base no ciclo em aberto:
    // Se 1º ciclo já fechou e 2º está aberto: concessivo do 2º ciclo = 36 meses (CLT Art. 134)
    // Se 2º ciclo já fechou: concessivo do 3º ciclo = 48 meses
    // Se 1º ciclo ainda está em aberto: concessivo = 24 meses
    let mesesLimiteFatal = 24;
    let limiteMesesLabel = '24m';

    if (resumoCiclos.ciclo2Fechado) {
        mesesLimiteFatal = 48;
        limiteMesesLabel = '48m';
    } else if (resumoCiclos.ciclo1Fechado) {
        mesesLimiteFatal = 36;
        limiteMesesLabel = '36m';
    }

    const limiteFatalStr = addMeses(dataAdmStr, mesesLimiteFatal);
    const limiteFatalDate = parseLocalDate(limiteFatalStr);
    limiteFatalDate.setHours(0, 0, 0, 0);

    const diasParaDobra = Math.ceil((limiteFatalDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    // Busca registros cadastrados para a matrícula
    const feriasRegs = resumoCiclos.registros;
    const regEmGozo = resumoCiclos.registroEmGozo;
    const regProgramada = resumoCiclos.registroProgramado;
    const regConcluida = feriasRegs.find(f => f.status === 'concluida' || f.status_ciclo === 'Gozado/Fechado' || (f.data_fim && hojeIso > f.data_fim && f.status !== 'cancelada' && f.status !== 'pendente'));
    const regPendente = feriasRegs.find(f => f.status === 'pendente');
    const ultimoRegistro = regEmGozo || regProgramada || regConcluida || regPendente || feriasRegs[0] || null;

    let statusClt = 'normal';
    let label = '🟢 Normal';
    let badgeClass = 'badge-ferias-normal';

    if (regEmGozo) {
        statusClt = 'em_gozo';
        label = '✈️ Em Gozo';
        badgeClass = 'badge-ferias-em-gozo';
    } else if (regProgramada) {
        statusClt = 'programada';
        label = `📅 Programada (${formatSimpleDate(regProgramada.data_inicio)})`;
        badgeClass = 'badge-ferias-programada';
    } else if (resumoCiclos.ciclo2Fechado) {
        statusClt = 'concluida';
        label = '✅ 2º Ciclo Quitado';
        badgeClass = 'badge-ciclo-2ok';
    } else if (resumoCiclos.ciclo1Fechado && totalMeses < 30) {
        statusClt = 'concluida';
        label = '✅ 1º Ciclo Quitado';
        badgeClass = 'badge-ciclo-ok';
    } else {
        // Régua do Semáforo CLT em relação ao ciclo em aberto
        const mesesAlerta = mesesLimiteFatal - 5;
        const mesesRisco = mesesLimiteFatal - 1;

        if (totalMeses >= mesesRisco) {
            statusClt = 'critico';
            label = `🔴 Risco Dobra (${resumoCiclos.cicloAtualRotulo})`;
            badgeClass = 'badge-ferias-critico';
        } else if (totalMeses >= mesesAlerta) {
            statusClt = 'atencao';
            label = `🟡 Atenção (${resumoCiclos.cicloAtualRotulo})`;
            badgeClass = 'badge-ferias-atencao';
        } else {
            statusClt = 'normal';
            label = resumoCiclos.ciclo1Fechado ? '🟢 2º Ciclo Regular' : '🟢 1º Ciclo Regular';
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
        limiteMesesLabel: limiteMesesLabel,
        mesesLimiteFatal: mesesLimiteFatal,
        mesesTotal: totalMeses,
        diasParaDobra: diasParaDobra,
        statusClt: statusClt,
        label: label,
        badgeClass: badgeClass,
        registroFerias: ultimoRegistro,
        emGozo: !!regEmGozo,
        programada: !!regProgramada,
        concluida: resumoCiclos.ciclo1Fechado || !!regConcluida,
        resumoCiclos: resumoCiclos,
        cicloAtualRotulo: resumoCiclos.cicloAtualRotulo,
        ciclo1Fechado: resumoCiclos.ciclo1Fechado,
        ciclo2Fechado: resumoCiclos.ciclo2Fechado
    };
}

// Renderização geral do painel e tabela de Férias e Régua CLT
async function renderFeriasPanel() {
    await garantirColaboradoresFeriasCarregados();
    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e));
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
    const cicloFiltro = document.getElementById('feriasFiltroCiclo')?.value || '';

    const filtrados = dadosFeriasCltCache.filter(d => {
        if (valFeriasFiltroAtual === 'critico' && d.statusClt !== 'critico') return false;
        if (valFeriasFiltroAtual === 'atencao' && d.statusClt !== 'atencao') return false;
        if (valFeriasFiltroAtual === 'normal' && d.statusClt !== 'normal') return false;
        if (valFeriasFiltroAtual === 'emGozo' && !d.emGozo) return false;
        if (valFeriasFiltroAtual === 'programadas' && !d.programada) return false;
        if (valFeriasFiltroAtual === 'concluidas' && !d.concluida) return false;

        if (setorFiltro && d.setor !== setorFiltro) return false;

        // Filtro por Ciclo de Férias
        if (cicloFiltro === '1_ok' && !d.ciclo1Fechado) return false;
        if (cicloFiltro === '2_ok' && !d.ciclo2Fechado) return false;
        if (cicloFiltro === 'aberto' && d.ciclo1Fechado && d.ciclo2Fechado) return false;

        if (busca) {
            const txt = `${d.matricula} ${d.nome} ${d.cpf} ${d.funcao} ${d.setor} ${d.cicloAtualRotulo || ''}`.toLowerCase();
            if (!txt.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding: 28px; text-align: center; color: var(--text-light); font-size: 13px;">Nenhum colaborador encontrado para os filtros selecionados.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(d => {
        const cInfo = d.resumoCiclos || obterResumoCiclosFeriasColab(d.matricula);
        const mesesInt = Math.floor(d.mesesTotal);
        const maxMesesRegua = d.mesesLimiteFatal || 24;
        const pct24 = Math.min(100, Math.max(0, Math.round((d.mesesTotal / maxMesesRegua) * 100)));

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

        let periodoGozoTxt = `<div style="margin-bottom:3px;">${cInfo.badgeCicloHtml}</div>`;
        if (d.registroFerias && d.registroFerias.data_inicio && d.registroFerias.data_fim) {
            const dtIniFmt = formatSimpleDate(d.registroFerias.data_inicio);
            const dtFimFmt = formatSimpleDate(d.registroFerias.data_fim);
            periodoGozoTxt += `<div style="font-weight:700; color:var(--text); font-size:11px;">${dtIniFmt} a ${dtFimFmt}</div>
                <div style="font-size:10px; color:var(--text-light);">${d.registroFerias.dias_gozo || 30} dias • ${escapeHTML(d.registroFerias.status).toUpperCase()}</div>`;
        } else if (cInfo.ciclo1Fechado) {
            periodoGozoTxt += `<span style="font-size:10px; color:#047857; font-weight:600;">Histórico Liquidado</span>`;
        } else {
            periodoGozoTxt += `<span style="color:var(--text-light); font-size:10.5px;">Pendente</span>`;
        }

        let isencaoTag = '<span style="color:var(--text-light);">—</span>';
        if (d.emGozo) {
            isencaoTag = `<span class="badge-isencao-sst" title="Colaborador em gozo: ausência justificada em DDSMA/Treinamentos e ASO regulariza no retorno.">🛡️ Isento DDS/Trein.</span>`;
        }

        // Botão de ação rápida de 1 clique para fechar ciclo
        let btnCicloRapido = '';
        if (!cInfo.ciclo1Fechado) {
            btnCicloRapido = `
                <button class="btn-ciclo-rapido" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(d.matricula)}', '1º Ciclo')" title="Fechar 1º ciclo como gozado/liquidado (sem exigência de datas retroativas)">
                    ✔️ Fechar 1º Ciclo
                </button>
            `;
        } else if (!cInfo.ciclo2Fechado && d.mesesTotal >= 12) {
            btnCicloRapido = `
                <button class="btn-ciclo-rapido-2" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(d.matricula)}', '2º Ciclo')" title="Fechar 2º ciclo como gozado/liquidado">
                    ✔️ Fechar 2º Ciclo
                </button>
            `;
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
                    <div class="ferias-regua-track" title="${mesesInt} meses de contrato (Limite fatal: ${maxMesesRegua} meses)">
                        <div class="${fillClass}" style="width: ${pct24}%;"></div>
                    </div>
                    <div class="ferias-regua-marcos">
                        <span>0m</span>
                        <span>12m</span>
                        <span>${maxMesesRegua}m (${d.limiteMesesLabel || 'Fatal'})</span>
                    </div>
                </td>
                <td style="padding: 8px 12px; text-align: center;">${periodoGozoTxt}</td>
                <td style="padding: 8px 12px; text-align: center;">${isencaoTag}</td>
                <td style="padding: 8px 12px; text-align: center; white-space:nowrap;">
                    <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap; align-items:center;">
                        ${btnCicloRapido}
                        ${btnAcoes}
                    </div>
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
        const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e)).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        selColab.innerHTML = '<option value="">Selecione o colaborador...</option>' +
            ativos.map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nome)} (Mat. ${escapeHTML(c.id)} — ${escapeHTML(c.funcao || '')})</option>`).join('');
    }

    document.getElementById('feriasForm_id').value = feriasIdAlvo || '';
    document.getElementById('feriasForm_statusMsg').textContent = '';
    document.getElementById('btnExcluirFeriasModal').style.display = feriasIdAlvo ? 'inline-block' : 'none';

    // Se passou matrícula, seleciona e preenche dados
    if (matriculaAlvo) {
        if (selColab) selColab.value = matriculaAlvo;
    }

    // Identifica ciclo sugerido
    const targetMat = matriculaAlvo || (selColab ? selColab.value : '');
    const cInfo = targetMat ? obterResumoCiclosFeriasColab(targetMat) : null;
    const cicloSelEl = document.getElementById('feriasForm_cicloRotulo');

    // Se passou ID de férias, carrega os dados já cadastrados
    if (feriasIdAlvo) {
        const reg = (allColaboradoresFerias || []).find(f => String(f.id) === String(feriasIdAlvo));
        if (reg) {
            if (selColab) selColab.value = reg.matricula;
            if (cicloSelEl) cicloSelEl.value = reg.ciclo_rotulo || '1º Ciclo';
            document.getElementById('feriasForm_tipoAfastamento').value = reg.tipo_afastamento || 'ferias';
            document.getElementById('feriasForm_status').value = reg.status || 'programada';
            document.getElementById('feriasForm_dataInicio').value = reg.data_inicio || '';
            document.getElementById('feriasForm_dataFim').value = reg.data_fim || '';
            document.getElementById('feriasForm_diasGozo').value = reg.dias_gozo || 30;
            document.getElementById('feriasForm_obs').value = reg.observacoes || '';
        }
    } else {
        // Defaults para novo lançamento
        if (cicloSelEl && cInfo) cicloSelEl.value = cInfo.cicloAtualRotulo;
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

    // Sugere ciclo no select se ainda não selecionado manualmente
    const cicloSelEl = document.getElementById('feriasForm_cicloRotulo');
    if (cicloSelEl && !document.getElementById('feriasForm_id')?.value) {
        cicloSelEl.value = reg.cicloAtualRotulo;
    }

    document.getElementById('feriasForm_lblNome').textContent = colab.nome || '—';
    document.getElementById('feriasForm_lblMatricula').textContent = colab.id;
    document.getElementById('feriasForm_lblSetor').textContent = colab.setor || '—';
    document.getElementById('feriasForm_lblAdmissao').textContent = reg.dataAdmissao ? formatSimpleDate(reg.dataAdmissao) : '—';
    document.getElementById('feriasForm_lblTempoCasa').textContent = `${tempoCasaTxt} (${Math.floor(reg.mesesTotal)} meses)`;
    document.getElementById('feriasForm_lblLimiteFatal').textContent = reg.limiteConcessivoFatal ? `${formatSimpleDate(reg.limiteConcessivoFatal)} (${reg.limiteMesesLabel || '24m'})` : '—';

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

function onCicloOuStatusFeriasChange() {
    const status = document.getElementById('feriasForm_status')?.value;
    const lblIni = document.getElementById('feriasForm_lblDataInicio');
    const lblFim = document.getElementById('feriasForm_lblDataFim');
    const ehHistorico = status === 'concluida';
    if (lblIni) lblIni.innerHTML = ehHistorico ? 'Data Início <span style="font-weight:400; font-size:11px; color:#10b981;">(Opcional)</span>' : 'Data de Início *';
    if (lblFim) lblFim.innerHTML = ehHistorico ? 'Data Fim <span style="font-weight:400; font-size:11px; color:#10b981;">(Opcional)</span>' : 'Data de Fim *';
}

function marcarFechamentoRapidoNoModal() {
    const selStatus = document.getElementById('feriasForm_status');
    if (selStatus) selStatus.value = 'concluida';
    onCicloOuStatusFeriasChange();
    const obs = document.getElementById('feriasForm_obs');
    if (obs && !obs.value) {
        const cicloSel = document.getElementById('feriasForm_cicloRotulo')?.value || '1º Ciclo';
        obs.value = `${cicloSel} gozado e liquidado conforme histórico interno (fechamento rápido sem exigência de datas retroativas).`;
    }
    const statusMsg = document.getElementById('feriasForm_statusMsg');
    if (statusMsg) {
        statusMsg.innerHTML = '<span style="color:#059669; font-weight:700;">⚡ Modo Fechamento Rápido Ativado: Datas tornaram-se opcionais. Clique em "Salvar Programação" para liquidar o ciclo.</span>';
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

    const cicloRotulo = document.getElementById('feriasForm_cicloRotulo')?.value || '1º Ciclo';
    const mesesLimite = cicloRotulo.includes('2') ? 36 : 24;
    const limiteFatal = addMeses(dataAdmissao, mesesLimite);
    const tipoAfastamento = document.getElementById('feriasForm_tipoAfastamento')?.value || 'ferias';
    const status = document.getElementById('feriasForm_status')?.value || 'programada';
    const dataInicio = document.getElementById('feriasForm_dataInicio')?.value || null;
    const dataFim = document.getElementById('feriasForm_dataFim')?.value || null;
    const diasGozo = parseInt(document.getElementById('feriasForm_diasGozo')?.value || '30', 10);
    const obs = document.getElementById('feriasForm_obs')?.value || '';

    let statusCiclo = 'Pendente';
    if (status === 'concluida') statusCiclo = 'Gozado/Fechado';
    else if (status === 'em_gozo') statusCiclo = 'Em Gozo';
    else if (status === 'programada') statusCiclo = 'Programado';

    const payload = {
        matricula: String(colab.id),
        nome_colaborador: colab.nome || '',
        funcao: colab.funcao || '',
        setor: colab.setor || '',
        data_admissao: dataAdmissao,
        limite_concessivo_fatal: limiteFatal,
        ciclo_rotulo: cicloRotulo,
        status_ciclo: statusCiclo,
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

        // Se marcado como Gozado/Concluído, sincroniza o ciclo_ferias_atual em colaboradores_efetivo
        if (status === 'concluida') {
            const proxCiclo = cicloRotulo.includes('1') ? '2º Ciclo' : (cicloRotulo.includes('2') ? '3º Ciclo' : '4º Ciclo');
            colab.ciclo_ferias_atual = proxCiclo;
            await supabaseUpsert('colaboradores_efetivo', [{
                id: String(colab.id),
                ciclo_ferias_atual: proxCiclo
            }]);
        }

        statusMsg.textContent = '✅ Registro de férias e ciclo salvo com sucesso!';
        statusMsg.style.color = '#059669';

        if (typeof dashCacheInvalidate === 'function') {
            await dashCacheInvalidate('colaboradores_ferias');
            await dashCacheInvalidate('colaboradores_efetivo');
        }
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
        if (!feriasId || feriasId === 'undefined' || feriasId === 'null') {
            throw new Error('Registro de férias não identificado. Atualize a lista e tente novamente.');
        }
        const hojeIso = toISODateLocal(new Date());
        const payload = { status: 'em_gozo', data_inicio: hojeIso, updated_at: new Date().toISOString() };
        // Atualiza somente o lançamento existente, preservando matrícula, datas e histórico.
        const atualizados = await supabaseUpdate('colaboradores_ferias', feriasId, payload);
        if (!Array.isArray(atualizados) || atualizados.length !== 1) {
            throw new Error('Registro de férias não encontrado ou sem permissão para atualizar. Recarregue a lista.');
        }
        await garantirColaboradoresFeriasCarregados();
        renderFeriasPanel();
    } catch (err) {
        alert('Falha ao iniciar gozo de férias: ' + (err.message || err));
    }
}

async function concluirFeriasRapido(feriasId, matricula) {
    if (!confirm(`Confirma a conclusão do período de férias do colaborador de matrícula ${matricula}?`)) return;
    try {
        if (!feriasId || feriasId === 'undefined' || feriasId === 'null') {
            throw new Error('Registro de férias não identificado. Atualize a lista e tente novamente.');
        }
        const payload = { status: 'concluida', updated_at: new Date().toISOString() };
        // Atualiza somente o lançamento existente, preservando matrícula, datas e histórico.
        const atualizados = await supabaseUpdate('colaboradores_ferias', feriasId, payload);
        if (!Array.isArray(atualizados) || atualizados.length !== 1) {
            throw new Error('Registro de férias não encontrado ou sem permissão para atualizar. Recarregue a lista.');
        }
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
var NOME_ESTADO_PARA_UF = {
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

var setorAtualGerenciado = null;

function renderSetoresLista() {
    const container = document.getElementById('setoresLista');
    const resumo = document.getElementById('setoresResumo');
    if (!container) return;

    const contagem = new Map();
    allEfetivo.forEach(e => {
        if (!colaboradorEstaAtivo(e) || !e.setor || colaboradorEhTerceiro(e)) return;
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
    const equipe = allEfetivo.filter(e => colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e) && e.setor === setorAtualGerenciado)
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

// ==============================================================================
// GESTÃO GLOBAL DE FRENTES DE TRABALHO (EFETIVO & CONSUMIDORES SST)
// Permite cadastrar, renomear, vincular/desvincular e inativar frentes globais
// da obra, suportando frentes vazias sem criar colaboradores fictícios nem
// alterar headcount, HHT ou ASO.
// ==============================================================================

var frenteAtualGerenciada = null;

function obterCatalogoFrentesCompleto() {
    var mapa = new Map();

    // 1. Frentes do catálogo persistido no sistema
    var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
    catalogo.forEach(function(f) {
        var nome = typeof f === 'string' ? f.trim() : (f && f.nome ? f.nome.trim() : '');
        if (!nome) return;
        var chave = nome.toUpperCase();
        var ativo = typeof f === 'object' && f !== null ? f.ativo !== false : true;
        mapa.set(chave, {
            nome: chave,
            ativo: ativo,
            qtd: 0,
            criadoManualmente: true
        });
    });

    // 2. Frentes legadas de DDSMA (preservação de compatibilidade)
    if (typeof allDdsFrentesConfig !== 'undefined' && Array.isArray(allDdsFrentesConfig)) {
        allDdsFrentesConfig.forEach(function(c) {
            if (!c || !c.id) return;
            var chave = c.id.trim().toUpperCase();
            if (!chave) return;
            if (!mapa.has(chave)) {
                mapa.set(chave, {
                    nome: chave,
                    ativo: true,
                    qtd: 0,
                    criadoManualmente: true
                });
            }
        });
    }

    // 3. Frentes derivadas dos colaboradores próprios ativos com responsável atribuído
    if (typeof allEfetivo !== 'undefined' && Array.isArray(allEfetivo)) {
        allEfetivo.forEach(function(e) {
            if (!colaboradorEstaAtivo(e) || !e.responsavel || colaboradorEhTerceiro(e)) return;
            var chave = e.responsavel.trim().toUpperCase();
            if (!chave) return;
            if (!mapa.has(chave)) {
                mapa.set(chave, {
                    nome: chave,
                    ativo: true,
                    qtd: 0,
                    criadoManualmente: false
                });
            }
            mapa.get(chave).qtd += 1;
        });
    }

    return Array.from(mapa.values()).sort(function(a, b) {
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
}

async function salvarCatalogoFrentesSupabase(catalogo) {
    try {
        await supabaseUpsert('configuracoes_sistema', [{
            id: 'efetivo_frentes_catalogo',
            valor: catalogo,
            descricao: 'Catálogo global de frentes de trabalho cadastradas no Efetivo (com ou sem colaboradores vinculados).',
            atualizado_em: new Date().toISOString(),
            atualizado_por: (typeof usuarioDashboardAtual === 'function' ? usuarioDashboardAtual() : 'painel') || 'painel'
        }]);
    } catch (e) {
        console.error('Erro ao salvar catálogo de frentes no Supabase:', e);
        throw e;
    }
}

function renderFrentesLista() {
    var container = document.getElementById('frentesLista');
    var resumo = document.getElementById('frentesResumo');
    if (!container) return;

    var frentes = obterCatalogoFrentesCompleto();
    var comPessoas = frentes.filter(function(f) { return f.qtd > 0; }).length;

    if (resumo) {
        resumo.textContent = frentes.length + ' frente(s) cadastrada(s) • ' + comPessoas + ' com colaboradores ativos';
    }

    if (frentes.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma frente de trabalho cadastrada ainda. Clique em "+ Nova Frente" para cadastrar.</div>';
        return;
    }

    container.innerHTML = frentes.map(function(f) {
        var statusBadge = f.ativo
            ? '<span style="font-size:10.5px; background:rgba(34,197,94,0.15); color:#15803d; border:1px solid rgba(34,197,94,0.3); padding:1px 6px; border-radius:6px; font-weight:600;">Ativa</span>'
            : '<span style="font-size:10.5px; background:rgba(100,116,139,0.15); color:#475569; border:1px solid rgba(100,116,139,0.3); padding:1px 6px; border-radius:6px; font-weight:600;">Inativa</span>';

        var subInfo = f.qtd > 0
            ? f.qtd + ' colaborador(es) ativo(s)'
            : '<span style="color:#d97706;">⚠️ Frente sem colaboradores vinculados</span>';

        return '<div class="db-list-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="abrirGerenciarFrente(\'' + escapeHTML(f.nome) + '\')">' +
            '<div>' +
                '<div class="db-list-item-title" style="display:flex; align-items:center; gap:8px;">' +
                    '<span>👷 ' + escapeHTML(f.nome) + '</span> ' + statusBadge +
                '</div>' +
                '<div class="db-list-item-sub">' + subInfo + '</div>' +
            '</div>' +
            '<div style="font-size:11px; color:var(--text-light);">Gerenciar ➔</div>' +
        '</div>';
    }).join('');
}

async function criarNovaFrente() {
    var nome = prompt('Nome da nova frente de trabalho (ex: CANTEIRO CENTRAL, LINHA 01):');
    if (!nome || !nome.trim()) return;
    var nomeFinal = nome.trim().toUpperCase();

    var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
    var existenteIdx = catalogo.findIndex(function(f) {
        var n = typeof f === 'string' ? f : (f && f.nome);
        return n && n.trim().toUpperCase() === nomeFinal;
    });

    if (existenteIdx >= 0) {
        var item = catalogo[existenteIdx];
        var estaAtivo = typeof item === 'object' && item !== null ? item.ativo !== false : true;
        if (estaAtivo) {
            alert('A frente "' + nomeFinal + '" já está cadastrada e ativa.');
            abrirGerenciarFrente(nomeFinal);
            return;
        } else {
            if (confirm('A frente "' + nomeFinal + '" está cadastrada como inativa. Deseja reativá-la agora?')) {
                if (typeof item === 'object' && item !== null) item.ativo = true;
                else catalogo[existenteIdx] = { nome: nomeFinal, ativo: true };
                allFrentesCatalogo = catalogo;
                window.allFrentesCatalogo = allFrentesCatalogo;
                await salvarCatalogoFrentesSupabase(allFrentesCatalogo);
                popularFrentesDatalist();
                renderFrentesLista();
                abrirGerenciarFrente(nomeFinal);
            }
            return;
        }
    }

    catalogo.push({
        nome: nomeFinal,
        ativo: true,
        criado_em: new Date().toISOString()
    });
    allFrentesCatalogo = catalogo;
    window.allFrentesCatalogo = allFrentesCatalogo;

    try {
        await salvarCatalogoFrentesSupabase(allFrentesCatalogo);
    } catch (e) {
        alert('Erro ao salvar no banco: ' + e.message);
    }

    popularFrentesDatalist();
    renderFrentesLista();
    abrirGerenciarFrente(nomeFinal);
}

function abrirGerenciarFrente(nomeFrente) {
    frenteAtualGerenciada = nomeFrente;
    var tituloEl = document.getElementById('frenteGerenciarTitulo');
    var statusEl = document.getElementById('frenteGerenciarStatus');
    var btnAtivo = document.getElementById('frenteBtnAlternarAtivo');
    var inputAdd = document.getElementById('frenteAddColabInput');
    var resultsAdd = document.getElementById('frenteAddColabResults');
    var card = document.getElementById('frenteGerenciarCard');

    if (tituloEl) tituloEl.textContent = '👷 ' + nomeFrente;
    if (statusEl) statusEl.textContent = '';
    if (inputAdd) inputAdd.value = '';
    if (resultsAdd) resultsAdd.innerHTML = '';

    var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
    var item = catalogo.find(function(f) {
        var n = typeof f === 'string' ? f : (f && f.nome);
        return n && n.trim().toUpperCase() === nomeFrente.toUpperCase();
    });
    var estaAtivo = item ? (typeof item === 'object' && item.ativo !== false) : true;

    if (btnAtivo) {
        btnAtivo.textContent = estaAtivo ? '⏸️ Desativar Frente' : '▶️ Ativar Frente';
        btnAtivo.title = estaAtivo ? 'Desativar frente para novas seleções (preserva colaboradores existentes)' : 'Reativar frente para seleções no sistema';
    }

    if (card) card.style.display = 'block';
    renderFrenteColabList();
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharGerenciarFrente() {
    frenteAtualGerenciada = null;
    var card = document.getElementById('frenteGerenciarCard');
    if (card) card.style.display = 'none';
}

function renderFrenteColabList() {
    var container = document.getElementById('frenteColabList');
    if (!container || !frenteAtualGerenciada) return;

    var equipe = allEfetivo.filter(function(e) {
        return colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e) &&
            (e.responsavel || '').trim().toUpperCase() === frenteAtualGerenciada.toUpperCase();
    }).sort(function(a, b) {
        return (a.nome || '').localeCompare(b.nome || '');
    });

    if (equipe.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador vinculado a esta frente ainda. Use a busca abaixo para vincular colaboradores.</div>';
        return;
    }

    container.innerHTML = equipe.map(function(e) {
        return '<div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
            '<div>' +
                '<div class="db-list-item-title">' + escapeHTML(e.nome || '') + '</div>' +
                '<div class="db-list-item-sub">' + escapeHTML(e.funcao || '') + ' — Matrícula ' + escapeHTML(e.id) + '</div>' +
            '</div>' +
            '<div style="display:flex; gap:6px; flex-shrink:0;">' +
                '<button class="db-clear-btn" onclick="editarColaboradorDaEquipe(\'' + escapeHTML(e.id) + '\')">✏️ Editar</button>' +
                '<button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="removerDaFrente(\'' + escapeHTML(e.id) + '\')">Remover</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function filterFrenteAddColab(query) {
    var container = document.getElementById('frenteAddColabResults');
    if (!container || !frenteAtualGerenciada) return;
    var q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    var matches = allEfetivo.filter(function(e) {
        return colaboradorEstaAtivo(e) && !colaboradorEhTerceiro(e) &&
            (e.responsavel || '').trim().toUpperCase() !== frenteAtualGerenciada.toUpperCase() &&
            ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)));
    }).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }

    container.innerHTML = matches.map(function(e) {
        return '<div class="db-list-item" style="cursor:pointer;" onclick="adicionarAFrente(\'' + escapeHTML(e.id) + '\')">' +
            '<div class="db-list-item-title">' + escapeHTML(e.nome || '') + '</div>' +
            '<div class="db-list-item-sub">' + escapeHTML(e.funcao || '') + ' — Matrícula ' + escapeHTML(e.id) +
            (e.responsavel ? ' — atualmente na frente ' + escapeHTML(e.responsavel) : ' — sem frente definida') + '</div>' +
        '</div>';
    }).join('');
}

async function salvarFrenteColaborador(matricula, novaFrente) {
    var statusEl = document.getElementById('frenteGerenciarStatus');
    var e = allEfetivo.find(function(x) { return x.id === matricula; });
    if (!e) return;
    if (statusEl) { statusEl.textContent = 'Salvando vínculo...'; statusEl.style.color = 'var(--text-light)'; }

    try {
        await supabaseUpsert('colaboradores_efetivo', [{ id: matricula, responsavel: novaFrente }]);
        e.responsavel = novaFrente;
        if (statusEl) { statusEl.textContent = '✅ Vínculo atualizado com sucesso.'; statusEl.style.color = 'var(--success)'; }
        renderFrenteColabList();
        renderFrentesLista();
        popularFrentesDatalist();
    } catch (err) {
        console.error('Erro ao atualizar frente do colaborador:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function adicionarAFrente(matricula) {
    if (!frenteAtualGerenciada) return;
    salvarFrenteColaborador(matricula, frenteAtualGerenciada);
    var input = document.getElementById('frenteAddColabInput');
    var res = document.getElementById('frenteAddColabResults');
    if (input) input.value = '';
    if (res) res.innerHTML = '';
}

function removerDaFrente(matricula) {
    if (!confirm('Remover este colaborador da frente? Ele ficará sem frente definida até ser vinculado a outra.')) return;
    salvarFrenteColaborador(matricula, null);
}

async function renomearFrenteAtual() {
    if (!frenteAtualGerenciada) return;
    var novoNome = prompt('Renomear frente "' + frenteAtualGerenciada + '" para:', frenteAtualGerenciada);
    if (!novoNome || !novoNome.trim() || novoNome.trim().toUpperCase() === frenteAtualGerenciada.toUpperCase()) return;
    var nomeFinal = novoNome.trim().toUpperCase();

    var afetados = allEfetivo.filter(function(e) {
        return colaboradorEstaAtivo(e) && (e.responsavel || '').trim().toUpperCase() === frenteAtualGerenciada.toUpperCase();
    });

    var statusEl = document.getElementById('frenteGerenciarStatus');
    if (statusEl) {
        statusEl.textContent = 'Renomeando ' + afetados.length + ' colaborador(es)...';
        statusEl.style.color = 'var(--text-light)';
    }

    try {
        if (afetados.length > 0) {
            var linhas = afetados.map(function(e) { return { id: e.id, responsavel: nomeFinal }; });
            await supabaseUpsert('colaboradores_efetivo', linhas);
            afetados.forEach(function(e) { e.responsavel = nomeFinal; });
        }

        var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
        var itemIdx = catalogo.findIndex(function(f) {
            var n = typeof f === 'string' ? f : (f && f.nome);
            return n && n.trim().toUpperCase() === frenteAtualGerenciada.toUpperCase();
        });

        if (itemIdx >= 0) {
            if (typeof catalogo[itemIdx] === 'object' && catalogo[itemIdx] !== null) {
                catalogo[itemIdx].nome = nomeFinal;
            } else {
                catalogo[itemIdx] = { nome: nomeFinal, ativo: true };
            }
        } else {
            catalogo.push({ nome: nomeFinal, ativo: true, criado_em: new Date().toISOString() });
        }

        allFrentesCatalogo = catalogo;
        window.allFrentesCatalogo = allFrentesCatalogo;
        await salvarCatalogoFrentesSupabase(allFrentesCatalogo);

        frenteAtualGerenciada = nomeFinal;
        var tituloEl = document.getElementById('frenteGerenciarTitulo');
        if (tituloEl) tituloEl.textContent = '👷 ' + nomeFinal;

        if (statusEl) {
            statusEl.textContent = '✅ Frente renomeada para "' + nomeFinal + '" (' + afetados.length + ' colaboradores atualizados).';
            statusEl.style.color = 'var(--success)';
        }

        renderFrenteColabList();
        renderFrentesLista();
        popularFrentesDatalist();
    } catch (err) {
        console.error('Erro ao renomear frente:', err);
        if (statusEl) {
            statusEl.textContent = '❌ Falha: ' + err.message;
            statusEl.style.color = 'var(--danger)';
        }
    }
}

async function alternarAtivoFrenteAtual() {
    if (!frenteAtualGerenciada) return;
    var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
    var item = catalogo.find(function(f) {
        var n = typeof f === 'string' ? f : (f && f.nome);
        return n && n.trim().toUpperCase() === frenteAtualGerenciada.toUpperCase();
    });

    if (!item) {
        item = { nome: frenteAtualGerenciada, ativo: true };
        catalogo.push(item);
    }

    var novoStatus = !(typeof item === 'object' && item.ativo !== false);
    if (typeof item === 'object' && item !== null) {
        item.ativo = novoStatus;
    }

    allFrentesCatalogo = catalogo;
    window.allFrentesCatalogo = allFrentesCatalogo;

    try {
        await salvarCatalogoFrentesSupabase(allFrentesCatalogo);
        var statusEl = document.getElementById('frenteGerenciarStatus');
        if (statusEl) {
            statusEl.textContent = '✅ Frente marcada como ' + (novoStatus ? 'ATIVA' : 'INATIVA') + '. Colaboradores vinculados continuam preservados.';
            statusEl.style.color = 'var(--success)';
        }
        abrirGerenciarFrente(frenteAtualGerenciada);
        renderFrentesLista();
        popularFrentesDatalist();
    } catch (e) {
        alert('Erro ao alterar status da frente: ' + e.message);
    }
}

async function excluirFrenteAtual() {
    if (!frenteAtualGerenciada) return;
    var afetados = allEfetivo.filter(function(e) {
        return colaboradorEstaAtivo(e) && (e.responsavel || '').trim().toUpperCase() === frenteAtualGerenciada.toUpperCase();
    });

    if (afetados.length > 0) {
        alert('⚠️ Não é possível excluir a frente "' + frenteAtualGerenciada + '" porque existem ' + afetados.length + ' colaborador(es) vinculado(s) a ela.\n\nPara excluir, reatribua ou desvincule os colaboradores primeiro.');
        return;
    }

    if (!confirm('Deseja excluir a frente vazia "' + frenteAtualGerenciada + '" do catálogo global?')) return;

    var catalogo = (Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : []).filter(function(f) {
        var n = typeof f === 'string' ? f : (f && f.nome);
        return n && n.trim().toUpperCase() !== frenteAtualGerenciada.toUpperCase();
    });

    allFrentesCatalogo = catalogo;
    window.allFrentesCatalogo = allFrentesCatalogo;

    try {
        await salvarCatalogoFrentesSupabase(allFrentesCatalogo);
    } catch (e) {
        console.warn('Aviso ao salvar exclusão no Supabase:', e);
    }

    fecharGerenciarFrente();
    renderFrentesLista();
    popularFrentesDatalist();
}

function popularFrentesDatalist() {
    var dl = document.getElementById('efFrentesDatalist');
    if (!dl) return;
    dl.innerHTML = '';
    var frentes = typeof todasFrentesAtivas === 'function' ? todasFrentesAtivas() : [];
    frentes.forEach(function(f) {
        var opt = document.createElement('option');
        opt.value = f;
        dl.appendChild(opt);
    });
}

async function registrarFrenteGlobalNoCatalogo(nome) {
    if (!nome || !nome.trim()) return;
    var nomeFinal = nome.trim().toUpperCase();
    var catalogo = Array.isArray(allFrentesCatalogo) ? allFrentesCatalogo : [];
    var existe = catalogo.some(function(f) {
        var n = typeof f === 'string' ? f : (f && f.nome);
        return n && n.trim().toUpperCase() === nomeFinal;
    });
    if (!existe) {
        catalogo.push({ nome: nomeFinal, ativo: true, criado_em: new Date().toISOString() });
        allFrentesCatalogo = catalogo;
        window.allFrentesCatalogo = allFrentesCatalogo;
        try {
            await salvarCatalogoFrentesSupabase(allFrentesCatalogo);
        } catch (e) {
            console.warn('Aviso ao registrar frente no catálogo global:', e);
        }
        popularFrentesDatalist();
        renderFrentesLista();
    }
}

// Exportações globais para integração com outros módulos
window.obterResumoCiclosFeriasColab = obterResumoCiclosFeriasColab;
window.marcarCicloFeriasGozadoRapido = marcarCicloFeriasGozadoRapido;
window.calcularReguaFeriasClt = calcularReguaFeriasClt;
window.renderFeriasPanel = renderFeriasPanel;
window.abrirModalLancamentoFerias = abrirModalLancamentoFerias;
window.fecharModalLancamentoFerias = fecharModalLancamentoFerias;
window.salvarLancamentoFerias = salvarLancamentoFerias;
window.onCicloOuStatusFeriasChange = onCicloOuStatusFeriasChange;
window.marcarFechamentoRapidoNoModal = marcarFechamentoRapidoNoModal;




// ==============================================================================
// SUBMÓDULO: GESTÃO DE TERCEIROS, PRESTADORES E PJS (SEGREGADO DO EFETIVO CLT)
// ==============================================================================

var valTerceirosFiltroModalidade = 'todos';
var valTerceirosFiltroEmpresa = 'todas';
var valTerceirosFiltroSituacao = 'ativos';
var valTerceirosFiltroTexto = '';
var terceiroEditandoId = null;

function colaboradorEhTerceiro(colab) {
    if (!colab) return false;
    // 1. Marcação explícita no campo estabilidade
    const estab = String(colab.estabilidade || '').toUpperCase().trim();
    if (estab === 'TERCEIRO' || estab === 'TERCEIRIZADO' || estab === 'PJ' || estab === 'PRESTADOR') return true;

    // 2. Metadado padronizado em os_obs
    const obs = String(colab.os_obs || '').toUpperCase();
    if (obs.includes('[VINCULO:TERCEIRO') || obs.includes('[VINCULO:TERCEIRIZADO') || obs.includes('[VINCULO:PJ') || obs.includes('[VINCULO:PRESTADOR')) return true;

    // 3. Flags de objeto em memória
    if (colab.tipo_vinculo && colab.tipo_vinculo !== 'PROPRIO' && colab.tipo_vinculo !== 'CLT') return true;
    if (colab.is_terceiro === true) return true;

    // 4. Empresa externa preenchida
    const emp = String(colab.empresa || '').trim().toUpperCase();
    if (emp && emp !== 'COP' && emp !== 'CONSORCIO' && emp !== 'CONSÓRCIO' && emp !== 'PROPRIO' && emp !== 'PRÓPRIO') {
        return true;
    }

    return false;
}

function obterDadosVinculoTerceiro(colab) {
    if (!colab) return { ehTerceiro: false, tipo: 'PROPRIO', modalidade: 'Próprio CLT', empresa: 'COP (Próprio)' };

    const ehTerc = colaboradorEhTerceiro(colab);
    if (!ehTerc) {
        return { ehTerceiro: false, tipo: 'PROPRIO', modalidade: 'Próprio CLT', empresa: 'COP (Próprio)' };
    }

    let modalidade = 'Terceirizado';
    let empresa = (colab.responsavel || colab.empresa || '').trim();

    const estab = String(colab.estabilidade || '').toUpperCase().trim();
    if (estab === 'PJ') modalidade = 'PJ (Pessoa Jurídica)';
    else if (estab === 'PRESTADOR') modalidade = 'Prestador de Serviços';
    else if (estab === 'TERCEIRO' || estab === 'TERCEIRIZADO') modalidade = 'Terceirizado';

    const obs = String(colab.os_obs || '');
    const mVinculo = obs.match(/\[VINCULO:([^\|\]]+)/i);
    if (mVinculo && mVinculo[1]) {
        const v = mVinculo[1].trim().toUpperCase();
        if (v === 'PJ') modalidade = 'PJ (Pessoa Jurídica)';
        else if (v === 'PRESTADOR') modalidade = 'Prestador de Serviços';
        else if (v === 'TERCEIRIZADO' || v === 'TERCEIRO') modalidade = 'Terceirizado';
    }

    const mEmpresa = obs.match(/\[EMPRESA:([^\|\]]+)/i);
    if (mEmpresa && mEmpresa[1] && mEmpresa[1].trim()) {
        empresa = mEmpresa[1].trim();
    }
    if (!empresa) {
        empresa = (colab.responsavel || colab.empresa || 'Empresa Externa').trim();
    }

    return {
        ehTerceiro: true,
        tipo: modalidade.includes('PJ') ? 'PJ' : 'TERCEIRO',
        modalidade,
        empresa
    };
}

function obterTerceirosLista() {
    let lista = (allEfetivo || []).filter(colaboradorEhTerceiro);

    // Filtro por texto
    const q = (valTerceirosFiltroTexto || '').trim().toLowerCase();
    if (q) {
        lista = lista.filter(e => {
            const v = obterDadosVinculoTerceiro(e);
            return (e.nome || '').toLowerCase().includes(q) ||
                   (e.id || '').toLowerCase().includes(q) ||
                   (e.funcao || '').toLowerCase().includes(q) ||
                   (v.empresa || '').toLowerCase().includes(q) ||
                   (v.modalidade || '').toLowerCase().includes(q) ||
                   (e.setor || '').toLowerCase().includes(q);
        });
    }

    // Filtro por Modalidade
    if (valTerceirosFiltroModalidade && valTerceirosFiltroModalidade !== 'todos') {
        lista = lista.filter(e => {
            const v = obterDadosVinculoTerceiro(e);
            if (valTerceirosFiltroModalidade === 'Terceirizado') return v.modalidade.includes('Terceirizado');
            if (valTerceirosFiltroModalidade === 'PJ') return v.modalidade.includes('PJ');
            if (valTerceirosFiltroModalidade === 'Prestador') return v.modalidade.includes('Prestador');
            return true;
        });
    }

    // Filtro por Empresa
    if (valTerceirosFiltroEmpresa && valTerceirosFiltroEmpresa !== 'todas') {
        lista = lista.filter(e => {
            const v = obterDadosVinculoTerceiro(e);
            return v.empresa.toLowerCase() === valTerceirosFiltroEmpresa.toLowerCase();
        });
    }

    // Filtro por Situação
    if (valTerceirosFiltroSituacao === 'ativos') {
        lista = lista.filter(e => e.status === 'ATIVO' && !e.dt_demissao);
    } else if (valTerceirosFiltroSituacao === 'inativos') {
        lista = lista.filter(e => e.status !== 'ATIVO' || !!e.dt_demissao);
    }

    return lista;
}

function filtrarTabelaTerceiros() {
    const txtEl = document.getElementById('filtroTerceirosTexto');
    const modEl = document.getElementById('filtroTerceirosModalidade');
    const empEl = document.getElementById('filtroTerceirosEmpresa');
    const sitEl = document.getElementById('filtroTerceirosSituacao');

    valTerceirosFiltroTexto = txtEl ? txtEl.value : '';
    valTerceirosFiltroModalidade = modEl ? modEl.value : 'todos';
    valTerceirosFiltroEmpresa = empEl ? empEl.value : 'todas';
    valTerceirosFiltroSituacao = sitEl ? sitEl.value : 'ativos';

    renderTabelaTerceiros();
}

function renderTabelaTerceiros() {
    const tbody = document.getElementById('tabelaTerceirosBody');
    const contador = document.getElementById('terceirosContadorTabela');
    if (!tbody) return;

    const lista = obterTerceirosLista();
    if (contador) contador.textContent = `Exibindo ${lista.length} registro(s)`;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding:24px; text-align:center; color:var(--text-light);">Nenhum terceiro ou PJ encontrado com os filtros selecionados. Clique em "➕ Novo Terceiro / PJ" para cadastrar.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(c => {
        const v = obterDadosVinculoTerceiro(c);
        const isAtivo = c.status === 'ATIVO' && !c.dt_demissao;
        const badgeStatus = isAtivo
            ? '<span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:rgba(16,185,129,0.15); color:#10b981;">🟢 Ativo</span>'
            : '<span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:rgba(239,68,68,0.15); color:var(--danger);">🔴 Inativo</span>';

        const badgeModalidade = v.modalidade.includes('PJ')
            ? '<span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:rgba(124,58,237,0.15); color:#7c3aed; border:1px solid rgba(124,58,237,0.3);">📋 PJ</span>'
            : '<span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:rgba(2,132,199,0.15); color:#0284c7; border:1px solid rgba(2,132,199,0.3);">🏢 Terceirizado</span>';

        const dtInicioFmt = c.dt_admissao ? formatarDataBr(c.dt_admissao) : '-';

        return `
            <tr style="border-bottom:1px solid var(--border); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding:10px 8px; font-weight:700; font-family:monospace; color:var(--primary);">${escapeHTML(c.id)}</td>
                <td style="padding:10px 8px; font-weight:600; color:var(--text);">${escapeHTML(c.nome || '-')}</td>
                <td style="padding:10px 8px; text-align:center;">${badgeModalidade}</td>
                <td style="padding:10px 8px; font-weight:700; color:var(--text);">${escapeHTML(v.empresa || '-')}</td>
                <td style="padding:10px 8px; color:var(--text);">${escapeHTML(c.funcao || '-')}</td>
                <td style="padding:10px 8px; color:var(--text-light);">${escapeHTML(c.setor || '-')}</td>
                <td style="padding:10px 8px; color:var(--text-light); font-size:11.5px;">${escapeHTML(c.ghe || '-')}</td>
                <td style="padding:10px 8px; text-align:center; color:var(--text-light); font-size:11.5px;">${dtInicioFmt}</td>
                <td style="padding:10px 8px; text-align:center;">${badgeStatus}</td>
                <td style="padding:10px 8px; text-align:right; white-space:nowrap;">
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="abrirModalNovoTerceiro('${escapeHTML(c.id)}')" title="Editar dados do terceiro">✏️ Editar</button>
                    <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="alternarStatusTerceiro('${escapeHTML(c.id)}', ${isAtivo})" title="${isAtivo ? 'Inativar / Desmobilizar terceiro' : 'Reativar terceiro'}">${isAtivo ? '🚫 Inativar' : '✅ Reativar'}</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderTerceirosPanel() {
    const todosTerceiros = (allEfetivo || []).filter(colaboradorEhTerceiro);
    const ativos = todosTerceiros.filter(e => e.status === 'ATIVO' && !e.dt_demissao);
    const empresasSet = new Set();
    let countPj = 0;
    let countTerceirizados = 0;

    todosTerceiros.forEach(e => {
        const v = obterDadosVinculoTerceiro(e);
        if (v.empresa) empresasSet.add(v.empresa);
        if (v.modalidade.includes('PJ')) countPj++;
        else countTerceirizados++;
    });

    // Contadores de próprios
    const propriosAtivos = (allEfetivo || []).filter(e => !colaboradorEhTerceiro(e) && colaboradorEstaAtivo(e)).length;

    // Atualiza KPIs
    const kpiTotal = document.getElementById('kpiTerceirosTotal');
    const kpiAtivos = document.getElementById('kpiTerceirosAtivos');
    const kpiEmpresas = document.getElementById('kpiTerceirosEmpresas');
    const kpiPj = document.getElementById('kpiTerceirosPj');
    const kpiComp = document.getElementById('kpiTerceirosComposicaoTotal');

    if (kpiTotal) kpiTotal.textContent = todosTerceiros.length;
    if (kpiAtivos) kpiAtivos.textContent = ativos.length;
    if (kpiEmpresas) kpiEmpresas.textContent = `${empresasSet.size} (${countTerceirizados} colab.)`;
    if (kpiPj) kpiPj.textContent = countPj;
    if (kpiComp) kpiComp.textContent = `${propriosAtivos} Próprios + ${ativos.length} Terceiros = ${propriosAtivos + ativos.length} Total`;

    // Atualiza dropdown de empresas no filtro
    const empSelect = document.getElementById('filtroTerceirosEmpresa');
    if (empSelect) {
        const valAtual = empSelect.value || 'todas';
        let opts = '<option value="todas">Todas as Empresas</option>';
        Array.from(empresasSet).sort().forEach(emp => {
            opts += `<option value="${escapeHTML(emp)}" ${emp.toLowerCase() === valAtual.toLowerCase() ? 'selected' : ''}>${escapeHTML(emp)}</option>`;
        });
        empSelect.innerHTML = opts;
    }

    // Atualiza datalist de empresas no formulário
    const datalistEmp = document.getElementById('terceirosEmpresasDatalist');
    if (datalistEmp) {
        const setFinal = new Set(['ARTEC', ...empresasSet]);
        datalistEmp.innerHTML = Array.from(setFinal).map(emp => `<option value="${escapeHTML(emp)}"></option>`).join('');
    }

    renderTabelaTerceiros();
    atualizarCardComposicaoGeral();
}

function atualizarCardComposicaoGeral() {
    const totalProprios = (allEfetivo || []).filter(e => !colaboradorEhTerceiro(e) && colaboradorEstaAtivo(e)).length;
    const totalTerceiros = (allEfetivo || []).filter(e => colaboradorEhTerceiro(e) && colaboradorEstaAtivo(e)).length;

    const pEl = document.getElementById('compPropriosQtd');
    const tEl = document.getElementById('compTerceirosQtd');
    const totEl = document.getElementById('compTotalQtd');
    if (pEl) pEl.textContent = totalProprios;
    if (tEl) tEl.textContent = totalTerceiros;
    if (totEl) totEl.textContent = totalProprios + totalTerceiros;
}

function abrirModalNovoTerceiro(id) {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('efetivo')) return;
    const modal = document.getElementById('modalTerceiroForm');
    const title = document.getElementById('modalTerceiroTitle');
    const matInput = document.getElementById('tercForm_matricula');
    const statusMsg = document.getElementById('terceiroFormStatus');
    if (statusMsg) statusMsg.textContent = '';

    if (id) {
        const terc = (allEfetivo || []).find(e => String(e.id) === String(id));
        if (!terc) return;
        terceiroEditandoId = id;
        if (title) title.textContent = '✏️ Editar Terceiro / Prestador PJ';
        if (matInput) { matInput.value = terc.id; matInput.readOnly = true; }

        const v = obterDadosVinculoTerceiro(terc);
        document.getElementById('tercForm_nome').value = terc.nome || '';
        document.getElementById('tercForm_modalidade').value = v.modalidade.includes('PJ') ? 'PJ' : (v.modalidade.includes('Prestador') ? 'Prestador' : 'Terceirizado');
        document.getElementById('tercForm_empresa').value = v.empresa || '';
        document.getElementById('tercForm_funcao').value = terc.funcao || '';
        document.getElementById('tercForm_setor').value = terc.setor || '';
        document.getElementById('tercForm_ghe').value = terc.ghe || '';
        document.getElementById('tercForm_sexo').value = (terc.sexo || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
        document.getElementById('tercForm_cpf').value = terc.cpf || '';
        document.getElementById('tercForm_dt_inicio').value = terc.dt_admissao ? String(terc.dt_admissao).slice(0, 10) : '';
        document.getElementById('tercForm_dt_saida').value = terc.dt_demissao ? String(terc.dt_demissao).slice(0, 10) : '';
        document.getElementById('tercForm_status').value = terc.status || 'ATIVO';

        // Extrai texto limpo de os_obs sem as tags de metadado
        let obsTxt = String(terc.os_obs || '');
        obsTxt = obsTxt.replace(/\[VINCULO:[^\]]+\]/gi, '').replace(/\[EMPRESA:[^\]]+\]/gi, '').trim();
        document.getElementById('tercForm_obs').value = obsTxt;
    } else {
        terceiroEditandoId = null;
        if (title) title.textContent = '🏢 Novo Terceiro / Prestador PJ';
        if (matInput) { matInput.value = ''; matInput.readOnly = false; }
        document.getElementById('tercForm_nome').value = '';
        document.getElementById('tercForm_modalidade').value = 'Terceirizado';
        document.getElementById('tercForm_empresa').value = '';
        document.getElementById('tercForm_funcao').value = '';
        document.getElementById('tercForm_setor').value = '';
        document.getElementById('tercForm_ghe').value = '';
        document.getElementById('tercForm_sexo').value = 'M';
        document.getElementById('tercForm_cpf').value = '';
        document.getElementById('tercForm_dt_inicio').value = new Date().toISOString().slice(0, 10);
        document.getElementById('tercForm_dt_saida').value = '';
        document.getElementById('tercForm_status').value = 'ATIVO';
        document.getElementById('tercForm_obs').value = '';
    }

    if (modal) modal.style.display = 'flex';
}

function fecharModalTerceiro() {
    const modal = document.getElementById('modalTerceiroForm');
    if (modal) modal.style.display = 'none';
    terceiroEditandoId = null;
}

async function salvarTerceiroEfetivo() {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('efetivo')) return;
    const statusEl = document.getElementById('terceiroFormStatus');
    const btn = document.getElementById('btnSalvarTerceiro');

    const matricula = (document.getElementById('tercForm_matricula').value || '').trim().toUpperCase();
    const nome = (document.getElementById('tercForm_nome').value || '').trim();
    const modalidade = document.getElementById('tercForm_modalidade').value;
    const empresa = (document.getElementById('tercForm_empresa').value || '').trim();
    const funcao = (document.getElementById('tercForm_funcao').value || '').trim();
    const setor = (document.getElementById('tercForm_setor').value || '').trim();
    const ghe = (document.getElementById('tercForm_ghe').value || '').trim();
    const sexo = document.getElementById('tercForm_sexo').value;
    const cpf = (document.getElementById('tercForm_cpf').value || '').trim();
    const dtInicio = document.getElementById('tercForm_dt_inicio').value || null;
    const dtSaida = document.getElementById('tercForm_dt_saida').value || null;
    let status = document.getElementById('tercForm_status').value || 'ATIVO';
    const obsLivre = (document.getElementById('tercForm_obs').value || '').trim();

    if (dtSaida) status = 'INATIVO';

    if (!matricula || !nome || !empresa || !funcao) {
        if (statusEl) {
            statusEl.textContent = '❌ Matrícula, Nome, Empresa e Função são obrigatórios.';
            statusEl.style.color = 'var(--danger)';
        }
        return;
    }

    // Trava de segurança contra conflito em novo cadastro
    const ehNovo = !terceiroEditandoId;
    if (ehNovo && (allEfetivo || []).some(e => String(e.id) === String(matricula))) {
        if (statusEl) {
            statusEl.textContent = `❌ Já existe um cadastro com a matrícula "${matricula}". Escolha outro identificador.`;
            statusEl.style.color = 'var(--danger)';
        }
        return;
    }

    const obsFinal = `[VINCULO:${modalidade}|EMPRESA:${empresa}] ${obsLivre}`.trim();
    const estabilidadeMarcador = modalidade.toUpperCase().includes('PJ') ? 'PJ' : 'TERCEIRO';

    const rowEfetivo = {
        id: matricula,
        status: status,
        nome: nome,
        funcao: funcao,
        setor: setor,
        responsavel: empresa,
        dt_admissao: dtInicio,
        dt_demissao: dtSaida,
        cpf: cpf,
        ghe: ghe,
        sexo: sexo,
        estabilidade: estabilidadeMarcador,
        os_obs: obsFinal
    };

    const isAtivoChecklist = status === 'ATIVO' && !dtSaida;
    const rowChecklist = {
        id: matricula,
        matricula: matricula,
        nome: nome,
        funcao: funcao,
        setor: setor,
        empresa: empresa,
        ativo: isAtivoChecklist,
        nivel_acesso: 'Técnico'
    };

    if (statusEl) {
        statusEl.textContent = '⏳ Salvando e sincronizando entre tabelas (Efetivo & Campo)...';
        statusEl.style.color = 'var(--text-light)';
    }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

    try {
        // ETAPA 1: Gravação na tabela colaboradores_efetivo
        await supabaseUpsert('colaboradores_efetivo', [rowEfetivo]);

        // ETAPA 2: Sincronização obrigatória na tabela colaboradores_checklist
        try {
            const token = typeof authTokenDashboard === 'function' ? await authTokenDashboard() : SUPABASE_KEY;
            const resCk = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?on_conflict=id`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Prefer: 'resolution=merge-duplicates'
                },
                body: JSON.stringify([rowChecklist])
            });

            if (!resCk.ok) {
                const errTxt = await resCk.text();
                throw new Error(`Falha HTTP ${resCk.status} ao sincronizar com colaboradores_checklist: ${errTxt}`);
            }

            // Atualiza allColaboradoresInternos em memória
            if (typeof allColaboradoresInternos !== 'undefined' && Array.isArray(allColaboradoresInternos)) {
                const idxCk = allColaboradoresInternos.findIndex(c => String(c.id) === String(matricula));
                if (idxCk >= 0) allColaboradoresInternos[idxCk] = { ...allColaboradoresInternos[idxCk], ...rowChecklist };
                else allColaboradoresInternos.push(rowChecklist);
            }
        } catch (errSync) {
            console.error('Erro na sincronização com colaboradores_checklist:', errSync);
            // REGRA MANDATÓRIA: NÃO apresentar sucesso quando houver falha de sincronização!
            throw new Error(`Falha de sincronização dupla: o registro foi salvo em colaboradores_efetivo, mas a sincronização com colaboradores_checklist falhou (${errSync.message}). A operação não foi homologada.`);
        }

        // Limpa cache de headcount
        if (typeof _headcountMemoMap !== 'undefined' && _headcountMemoMap && typeof _headcountMemoMap.clear === 'function') {
            _headcountMemoMap.clear();
        }

        // Atualiza memória allEfetivo
        const idxEf = (allEfetivo || []).findIndex(e => String(e.id) === String(matricula));
        if (idxEf >= 0) allEfetivo[idxEf] = { ...allEfetivo[idxEf], ...rowEfetivo };
        else allEfetivo.push(rowEfetivo);

        if (statusEl) {
            statusEl.textContent = '✅ Terceiro salvo e sincronizado com sucesso em ambas as tabelas!';
            statusEl.style.color = '#10b981';
        }

        renderTerceirosPanel();
        if (typeof renderEfetivoPanel === 'function') renderEfetivoPanel();

        setTimeout(() => {
            fecharModalTerceiro();
        }, 800);
    } catch (err) {
        console.error('Falha na operação de terceiro:', err);
        if (statusEl) {
            statusEl.textContent = '❌ ' + err.message;
            statusEl.style.color = 'var(--danger)';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Terceiro'; }
    }
}

async function alternarStatusTerceiro(id, ativoAtual) {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('efetivo')) return;
    const novoStatus = !ativoAtual;
    const acaoTexto = novoStatus ? 'reativar' : 'inativar';
    const terceiro = (allEfetivo || []).find(e => String(e.id) === String(id));
    const nome = terceiro ? terceiro.nome : id;
    const v = obterDadosVinculoTerceiro(terceiro);

    if (!confirm(`Deseja realmente ${acaoTexto} o terceiro/prestador "${nome}" (${v.empresa} - Matrícula ${id})?`)) return;

    const statusEfetivo = novoStatus ? 'ATIVO' : 'INATIVO';
    try {
        // 1. Atualiza colaboradores_efetivo
        await supabaseUpsert('colaboradores_efetivo', [{
            id: id,
            status: statusEfetivo,
            dt_demissao: novoStatus ? null : (terceiro?.dt_demissao || new Date().toISOString().slice(0, 10))
        }]);

        // 2. Sincroniza colaboradores_checklist
        const token = typeof authTokenDashboard === 'function' ? await authTokenDashboard() : SUPABASE_KEY;
        const resCk = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores_checklist?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ativo: novoStatus })
        });

        if (!resCk.ok) {
            const errTxt = await resCk.text();
            throw new Error(`Falha HTTP ${resCk.status} ao sincronizar com colaboradores_checklist: ${errTxt}`);
        }

        // Atualiza memória
        if (terceiro) {
            terceiro.status = statusEfetivo;
            if (novoStatus) terceiro.dt_demissao = null;
            else if (!terceiro.dt_demissao) terceiro.dt_demissao = new Date().toISOString().slice(0, 10);
        }
        if (typeof allColaboradoresInternos !== 'undefined' && Array.isArray(allColaboradoresInternos)) {
            const ck = allColaboradoresInternos.find(c => String(c.id) === String(id));
            if (ck) ck.ativo = novoStatus;
        }

        if (typeof _headcountMemoMap !== 'undefined' && _headcountMemoMap && typeof _headcountMemoMap.clear === 'function') {
            _headcountMemoMap.clear();
        }

        renderTerceirosPanel();
        if (typeof renderEfetivoPanel === 'function') renderEfetivoPanel();

        if (typeof Swal !== 'undefined' && Swal.fire) {
            Swal.fire({
                icon: 'success',
                title: 'Status atualizado com sucesso!',
                text: `O profissional "${nome}" foi ${novoStatus ? 'reativado' : 'inativado'} e sincronizado em ambas as tabelas (Efetivo & Campo).`,
                timer: 2000,
                showConfirmButton: false
            });
        }
    } catch (err) {
        console.error('Erro ao alternar status do terceiro:', err);
        alert(`❌ Falha de sincronização dupla ao alterar status: ${err.message}\n\nA alteração NÃO foi homologada.`);
    }
}

function exportarExcelTerceiros() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca de exportação Excel ainda está carregando.');
        return;
    }
    const lista = obterTerceirosLista();
    if (lista.length === 0) {
        alert('Nenhum terceiro ou prestador PJ encontrado para exportar.');
        return;
    }

    const rows = lista.map(c => {
        const v = obterDadosVinculoTerceiro(c);
        const isAtivo = c.status === 'ATIVO' && !c.dt_demissao;
        return {
            'Matrícula / Código': c.id,
            'Nome Completo': c.nome || '',
            'Modalidade de Vínculo': v.modalidade,
            'Empresa Prestadora': v.empresa,
            'Função / Especialidade': c.funcao || '',
            'Setor Atendido': c.setor || '',
            'GHE (Riscos SST)': c.ghe || '',
            'Sexo': c.sexo || '',
            'CPF': c.cpf || '',
            'Data de Início / Mobilização': c.dt_admissao ? formatarDataBr(c.dt_admissao) : '',
            'Data de Saída / Desmobilização': c.dt_demissao ? formatarDataBr(c.dt_demissao) : '',
            'Status': isAtivo ? 'ATIVO' : 'INATIVO',
            'Observações': c.os_obs || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gestão de Terceiros');
    const dt = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `terceiros_pj_pisf_${dt}.xlsx`);
}

// Exportações globais de Terceiros
window.colaboradorEhTerceiro = colaboradorEhTerceiro;
window.obterDadosVinculoTerceiro = obterDadosVinculoTerceiro;
window.obterTerceirosLista = obterTerceirosLista;
window.renderTerceirosPanel = renderTerceirosPanel;
window.filtrarTabelaTerceiros = filtrarTabelaTerceiros;
window.abrirModalNovoTerceiro = abrirModalNovoTerceiro;
window.fecharModalTerceiro = fecharModalTerceiro;
window.salvarTerceiroEfetivo = salvarTerceiroEfetivo;
window.alternarStatusTerceiro = alternarStatusTerceiro;
window.exportarExcelTerceiros = exportarExcelTerceiros;
window.showEfetivoSubtab = showEfetivoSubtab;

// Exportações globais de Frentes
window.allFrentesCatalogo = allFrentesCatalogo;
window.obterCatalogoFrentesCompleto = obterCatalogoFrentesCompleto;
window.renderFrentesLista = renderFrentesLista;
window.criarNovaFrente = criarNovaFrente;
window.abrirGerenciarFrente = abrirGerenciarFrente;
window.fecharGerenciarFrente = fecharGerenciarFrente;
window.renderFrenteColabList = renderFrenteColabList;
window.filterFrenteAddColab = filterFrenteAddColab;
window.salvarFrenteColaborador = salvarFrenteColaborador;
window.adicionarAFrente = adicionarAFrente;
window.removerDaFrente = removerDaFrente;
window.renomearFrenteAtual = renomearFrenteAtual;
window.alternarAtivoFrenteAtual = alternarAtivoFrenteAtual;
window.excluirFrenteAtual = excluirFrenteAtual;
window.popularFrentesDatalist = popularFrentesDatalist;
window.registrarFrenteGlobalNoCatalogo = registrarFrenteGlobalNoCatalogo;
