// ==========================================================================
// MÓDULO: PLACAR DAS LIDERANÇAS & ROTINAS DE ENCARREGADOS (GAMIFICAÇÃO DE SST)
// ==========================================================================

let placarLideresLoaded = false;
let placarFiltroAno = String(new Date().getFullYear());
let placarFiltroMes = String(new Date().getMonth());
let placarFiltroSetor = '';
let placarBuscaTermo = '';
let placarMetaDiasCustom = null;
let placarRankingAtual = [];
let allRotinasConfig = null;
let placarLiderMsgAtual = null;
let placarChartHistoricoInstance = null;

// Rótulos amigáveis de setores para exibição e disputas
function obterRotuloSetor(chave) {
    const mapa = {
        'CIVIL': 'Manutenção Civil (Roço)',
        'ELÉTRICA': 'Manutenção Elétrica',
        'MECÂNICA': 'Manutenção Mecânica',
        'OPERAÇÃO': 'Operação',
        'TRANSPORTE': 'Transporte',
        'TOPOGRAFIA': 'Topografia',
        'CONSERVAÇÃO': 'Conservação e Limpeza'
    };
    return mapa[chave] || chave || 'Geral';
}

// Filtro rápido de setor por Pills
function selecionarSetorPlacar(setor) {
    placarFiltroSetor = setor || '';

    // Atualiza classes ativas nos botões pills
    const pills = document.querySelectorAll('#placarSectorPills .sector-pill');
    pills.forEach(p => {
        if (p.dataset.setor === (setor || '')) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    // Sincroniza com o select de setor
    const sel = document.getElementById('placarFiltroSetor');
    if (sel) sel.value = setor || '';

    renderPlacarLideres();
}

// Formatação do badge visual de tendência e evolução de posição
function formatarBadgeTendencia(lider, mesAntNome) {
    if (lider.isNovo) {
        return '<span class="placar-trend-badge trend-new" title="Estreante / Novo no ranking deste mês">★ Novo</span>';
    }
    if (lider.varPos > 0) {
        return `<span class="placar-trend-badge trend-up" title="Subiu ${lider.varPos} posição(ões) em relação a ${mesAntNome} (era ${lider.posAnterior}º)">▲ +${lider.varPos}</span>`;
    }
    if (lider.varPos < 0) {
        return `<span class="placar-trend-badge trend-down" title="Caiu ${Math.abs(lider.varPos)} posição(ões) em relação a ${mesAntNome} (era ${lider.posAnterior}º)">▼ ${lider.varPos}</span>`;
    }
    return `<span class="placar-trend-badge trend-same" title="Manteve a ${lider.posAtual}ª posição em relação a ${mesAntNome}">▬ 0</span>`;
}

// Configuração padrão inteligente de frentes baseada no canteiro da obra
function obterConfigRotinasPadrao() {
    const frentesPadrao = {
        // Encarregados individuais da Manutenção Civil (Roço e Campo)
        'EDSON': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO CIVIL', apelido: 'Edson (Civil / Roço)' },
        'EDUARDO JACY': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO CIVIL', apelido: 'Eduardo Jacy (Civil / Roço)' },
        'FABIANO': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO CIVIL', apelido: 'Fabiano (Civil / Roço)' },
        'ADEILTON MONTEIRO': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO CIVIL', apelido: 'Adeilton Monteiro (Civil / Roço)' },
        'EDILSON': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO CIVIL', apelido: 'Edilson (Civil / Roço)' },
        
        // Frentes setoriais unificadas
        'ELÉTRICA': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO ELÉTRICA', apelido: 'Elétrica (Setor Unificado)' },
        
        // Outras lideranças operacionais com equipes dedicadas
        'DANILO': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'TRANSPORTE', apelido: 'Danilo (Transporte)' },
        'DEYLON': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'OPERAÇÃO', apelido: 'Deylon (Operação)', escala: 'turno_continuo' },
        'ROBSON': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'MANUTENÇÃO MECÂNICA', apelido: 'Robson (Mecânica)' },
        'ANDRÉ': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'TOPOGRAFIA', apelido: 'André (Topografia)' },
        'NESTOR': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'TOPOGRAFIA', apelido: 'Nestor (Topografia/Leiturista)' },
        'EVERALDO': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'CONSERVAÇÃO E LIMPEZA', apelido: 'Everaldo (Conservação)' },
        'LINHA DE TRANSMISSÃO': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'CONSERVAÇÃO E LIMPEZA', apelido: 'Linha de Transmissão' },

        // Líderes Isentos de rotinas de campo (Simone, Thomé, SESMT, Vigilância, etc.)
        'SIMONE': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'ADMINISTRATIVO / ALMOXARIFADO', apelido: 'Simone (Administrativo - Isenta)' },
        'THOME': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'PLANEJAMENTO / SALA TÉCNICA', apelido: 'Thomé (Planejamento - Isento)' },
        'JOÃO EVERTON': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'SMS', apelido: 'João Everton (SESMT - Isento)' },
        'VIGILÂNCIA': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'VIGILÂNCIA', apelido: 'Vigilância (Isenta)' },
        'ALEX': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'ANÁLISE DE SISTEMAS', apelido: 'Alex (Isento)' },
        'ANTONIO MARCOS': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'PCM', apelido: 'Antonio Marcos (Isento)' },
        'EMANUEL': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'SEG. BARRAGEM', apelido: 'Emanuel (Isento)' },
        'LÚCIO': { ativo: false, exige_dds: false, exige_treinamento: false, exige_apr: false, setor: 'ANALISTA DE SISTEMAS', apelido: 'Lúcio (Isento)' }
    };
    return {
        meta_dias_dds_padrao: null,
        frentes: frentesPadrao
    };
}

async function carregarConfigRotinas() {
    try {
        const rows = await supabaseFetch('configuracoes_sistema', '?id=eq.rotinas_encarregados_config&select=*');
        if (rows && rows.length > 0 && rows[0].valor) {
            allRotinasConfig = rows[0].valor;
        } else {
            allRotinasConfig = obterConfigRotinasPadrao();
        }
    } catch (e) {
        console.warn('Falha ao buscar rotinas_encarregados_config, usando padrão:', e);
        allRotinasConfig = obterConfigRotinasPadrao();
    }
}

async function salvarConfigRotinas(novaConfig) {
    allRotinasConfig = novaConfig;
    try {
        await supabaseUpsert('configuracoes_sistema', [{
            id: 'rotinas_encarregados_config',
            valor: novaConfig,
            descricao: 'Parametrização do Placar das Lideranças e metas de entregas de SST por Encarregado.',
            atualizado_em: new Date().toISOString(),
            atualizado_por: (typeof usuarioDashboardAtual === 'function' ? usuarioDashboardAtual() : 'painel') || 'painel'
        }]);
    } catch (e) {
        console.error('Erro ao salvar configuracoes_sistema para rotinas:', e);
        throw e;
    }
}

async function garantirDadosPlacarLideres() {
    const tarefas = [];
    if (!efetivoLoaded) { efetivoLoaded = true; tarefas.push(loadEfetivoData()); }
    if (!treinamentosLoaded) { treinamentosLoaded = true; tarefas.push(loadTreinamentosData()); }
    if (!aprLoaded) { aprLoaded = true; tarefas.push(loadAprData()); }
    if (tarefas.length > 0) await Promise.all(tarefas);
    if (!allRotinasConfig) await carregarConfigRotinas();

    // Carregar tabela de dias úteis/trabalhados se ainda não carregada
    if (typeof hhtDiasTrabalhadosMap === 'undefined' || Object.keys(hhtDiasTrabalhadosMap).length === 0) {
        try {
            const rows = await supabaseFetch('hht_dias_trabalhados', '?select=*');
            if (typeof hhtDiasTrabalhadosMap === 'undefined') window.hhtDiasTrabalhadosMap = {};
            (rows || []).forEach(r => { hhtDiasTrabalhadosMap[r.id] = r; });
        } catch (e) {
            console.warn('Erro ao carregar hht_dias_trabalhados para o placar:', e);
        }
    }

    // Carregar checklists para apuração de Não Conformidades/desvios por frente (critério de desempate)
    if (!allChecklists || allChecklists.length === 0) {
        try {
            allChecklists = await supabaseFetch('checklists', '?select=*') || [];
        } catch (e) {
            console.warn('Erro ao carregar checklists em placar_lideres:', e);
        }
    }

    // Carregar relatos de ocorrências/desvios
    if (!allRelatos || allRelatos.length === 0) {
        try {
            allRelatos = await supabaseFetch('relatos', '?select=*') || [];
        } catch (e) {
            console.warn('Erro ao carregar relatos em placar_lideres:', e);
        }
    }
}

function obterMetaDdsMes(ano, mes) {
    const anoNum = parseInt(ano, 10);
    const mesIdx = parseInt(mes, 10);
    const key = `${anoNum}-${String(mesIdx + 1).padStart(2, '0')}`;
    if (typeof hhtDiasTrabalhadosMap !== 'undefined' && hhtDiasTrabalhadosMap[key] && hhtDiasTrabalhadosMap[key].dias_trabalhados > 0) {
        return parseInt(hhtDiasTrabalhadosMap[key].dias_trabalhados, 10);
    }
    return calcularDiasUteisMes(anoNum, mesIdx);
}

function sincronizarInputMetaPlacar() {
    const ano = parseInt(placarFiltroAno, 10) || new Date().getFullYear();
    const mes = parseInt(placarFiltroMes, 10) || new Date().getMonth();
    const metaVal = obterMetaDdsMes(ano, mes);
    const metaInput = document.getElementById('placarMetaDiasDds');
    if (metaInput) {
        metaInput.value = metaVal;
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        metaInput.title = `Meta de DDS para ${key}: ${metaVal} dias úteis (persistido no banco)`;
        metaInput.style.borderColor = '';
    }
    return metaVal;
}

async function abrirPaginaPlacarLideres() {
    await garantirDadosPlacarLideres();
    popularFiltrosPlacar();
    sincronizarInputMetaPlacar();
    renderPlacarLideres();
}

function popularFiltrosPlacar() {
    const anoSel = document.getElementById('placarFiltroAno');
    if (anoSel && anoSel.options.length === 0) {
        const anos = new Set([new Date().getFullYear(), new Date().getFullYear() - 1]);
        (allDdsRealizados || []).forEach(r => { if (r.data_dds) anos.add(parseLocalDate(r.data_dds).getFullYear()); });
        (allTreinamentosRealizados || []).forEach(t => { if (t.data_treinamento) anos.add(parseLocalDate(t.data_treinamento).getFullYear()); });
        Array.from(anos).sort((a,b) => b - a).forEach(a => {
            const opt = document.createElement('option');
            opt.value = String(a);
            opt.textContent = String(a);
            anoSel.appendChild(opt);
        });
        anoSel.value = placarFiltroAno;
    }

    const mesSel = document.getElementById('placarFiltroMes');
    if (mesSel && !mesSel.dataset.init) {
        mesSel.value = placarFiltroMes;
        mesSel.dataset.init = '1';
    }
}

function calcularDiasUteisMes(ano, mes) {
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    let uteis = 0;
    let cur = new Date(inicio);
    while (cur <= fim) {
        const diaSemana = cur.getDay();
        if (diaSemana >= 1 && diaSemana <= 5) {
            uteis++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, uteis);
}

function calcularPlacarLideres(ano, mes) {
    const iniMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    
    // Meta de DDS para o mês: busca primeiro de public.hht_dias_trabalhados (persistência no banco)
    const metaDds = obterMetaDdsMes(ano, mes);

    // Atualiza input de meta na tela caso esteja visível e o usuário não esteja editando
    const metaInput = document.getElementById('placarMetaDiasDds');
    if (metaInput && document.activeElement !== metaInput) {
        metaInput.value = metaDds;
        const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        metaInput.title = `Meta de DDS para ${key}: ${metaDds} dias úteis (persistido no banco)`;
    }

    if (!allRotinasConfig) allRotinasConfig = obterConfigRotinasPadrao();
    const configFrentes = allRotinasConfig.frentes || {};

    // Mapeamento de equipes de colaboradores ativos por líder/frente
    const equipePorLider = new Map();
    (allEfetivo || []).forEach(e => {
        if (colaboradorEstaAtivo(e)) {
            let resp = (e.responsavel || '').trim().toUpperCase();
            if (!resp) return;
            resp = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(resp) : resp;
            if (!equipePorLider.has(resp)) equipePorLider.set(resp, []);
            equipePorLider.get(resp).push(e);
        }
    });

    // Todas as frentes que existem no sistema ou configuradas (resolvendo aliases de unificação)
    const frentesIdentificadas = new Set();
    [...Array.from(equipePorLider.keys()), ...Object.keys(configFrentes)].forEach(f => {
        let fResolvida = (f || '').trim().toUpperCase();
        if (!fResolvida) return;
        fResolvida = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(fResolvida) : fResolvida;
        const ehAliasAntigo = (allDdsFrentesAlias || []).some(a => a.id === f);
        if (fResolvida && !ehAliasAntigo) {
            frentesIdentificadas.add(fResolvida);
        }
    });

    const ranking = [];

    frentesIdentificadas.forEach(frenteNome => {
        const cfg = configFrentes[frenteNome] || {
            ativo: true,
            exige_dds: true,
            exige_treinamento: true,
            exige_apr: true,
            setor: '',
            apelido: frenteNome
        };

        // Se está desmarcada nas configurações do gestor, não entra no cálculo de disputa
        if (!cfg.ativo) return;

        const equipe = equipePorLider.get(frenteNome) || [];
        const setorNome = cfg.setor || (equipe[0] ? equipe[0].setor : 'GERAL');
        const apelido = cfg.apelido || frenteNome;

        const ehTurnoContinuo = (cfg.escala === 'turno_continuo') || (frenteNome === 'DEYLON') || (cfg.setor && cfg.setor.includes('OPERAÇÃO'));
        const metaEsperada = (cfg.meta_dias && cfg.meta_dias > 0) ? cfg.meta_dias : metaDds;

        // ----------------------------------------------------
        // 1. ROTINA: DDSMA (COM CORTE ESTRITO EM 100% PARA EQUIDADE DE ESCALAS)
        // ----------------------------------------------------
        let pctDds = null;
        let diasDds = 0;
        let totalAssinaturasDds = 0;
        let statusDds = 'isento';

        if (cfg.exige_dds) {
            const ddsLider = (allDdsRealizados || []).filter(d => {
                if (!d.data_dds) return false;
                const data = parseLocalDate(d.data_dds);
                if (data < iniMes || data > fimMes) return false;
                const fResp = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(d.frente_responsavel) : d.frente_responsavel;
                return fResp === frenteNome;
            });

            // Agrega também histórico se houver
            const ddsHistLider = (allDdsHistoricoAgregado || []).filter(h => {
                if (!h.data_dds) return false;
                const data = parseLocalDate(h.data_dds);
                if (data < iniMes || data > fimMes) return false;
                const fResp = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(h.frente_responsavel) : h.frente_responsavel;
                return fResp === frenteNome;
            });

            const diasSet = new Set();
            ddsLider.forEach(d => { diasSet.add(d.data_dds); totalAssinaturasDds++; });
            ddsHistLider.forEach(h => { diasSet.add(h.data_dds); totalAssinaturasDds += (parseInt(h.participantes, 10) || 0); });

            diasDds = diasSet.size;
            // Corte estrito de 100% no aproveitamento de DDS: frentes 12x36 ou com dias a mais não ultrapassam 100%
            pctDds = Math.min(100, Math.round((diasDds / metaEsperada) * 100));

            if (diasDds >= metaEsperada) statusDds = 'sucesso';
            else if (diasDds >= Math.ceil(metaEsperada * 0.7)) statusDds = 'alerta';
            else statusDds = 'perigo';
        }

        // ----------------------------------------------------
        // 2. ROTINA: TREINAMENTO DA EQUIPE
        // ----------------------------------------------------
        let pctTrein = null;
        let totalTreinamentos = 0;
        let colaboradoresTreinados = new Set();
        let statusTrein = 'isento';

        if (cfg.exige_treinamento) {
            const matSet = new Set(equipe.map(m => m.id));
            const treinsLider = (allTreinamentosRealizados || []).filter(t => {
                if (!t.data_treinamento) return false;
                const data = parseLocalDate(t.data_treinamento);
                if (data < iniMes || data > fimMes) return false;
                const encResp = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(t.encarregado_responsavel) : t.encarregado_responsavel;
                const bateEnc = encResp && encResp === frenteNome;
                const bateMat = matSet.has(t.matricula);
                return bateEnc || bateMat;
            });

            treinsLider.forEach(t => {
                totalTreinamentos++;
                if (t.matricula) colaboradoresTreinados.add(t.matricula);
            });

            // Se realizou ao menos 1 treinamento com a equipe no mês, cumpre a rotina
            const treinou = treinsLider.length > 0;
            pctTrein = treinou ? 100 : 0;
            statusTrein = treinou ? 'sucesso' : 'perigo';
        }

        // ----------------------------------------------------
        // 3. ROTINA: APR VIGENTE NO PERÍODO
        // ----------------------------------------------------
        let pctApr = null;
        let totalAprsVigentes = 0;
        let statusApr = 'isento';

        if (cfg.exige_apr) {
            const aprsLider = (allAprRegistros || []).filter(a => {
                const resp = (a.responsavel || '').trim().toUpperCase();
                const setr = (a.setor_unidade || '').trim().toUpperCase();
                const respResolvido = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(resp) : resp;
                const bate = respResolvido === frenteNome || (frenteNome === 'ELÉTRICA' && setr.includes('ELÉTRICA'));
                if (!bate) return false;

                const emissao = a.data_emissao ? parseLocalDate(a.data_emissao) : null;
                if (!emissao) return false;
                const validadeAte = a.validade_ate ? parseLocalDate(a.validade_ate) : new Date(emissao.getTime() + (a.validade_dias || 15) * 86400000);
                
                // Vigente se a validade cruzou qualquer dia do mês avaliado
                return emissao <= fimMes && validadeAte >= iniMes;
            });

            totalAprsVigentes = aprsLider.length;
            const temApr = totalAprsVigentes > 0;
            pctApr = temApr ? 100 : 0;
            statusApr = temApr ? 'sucesso' : 'perigo';
        }

        // ----------------------------------------------------
        // 4. REGULARIDADE OPERACIONAL / DESVIOS E NÃO CONFORMIDADES (DESEMPATE)
        // ----------------------------------------------------
        let totalDesvios = 0;
        let totalNaoConformidades = 0;
        let totalInterdicoes = 0;

        (allChecklists || []).forEach(chk => {
            if (!chk.date) return;
            const dataChk = parseLocalDate(chk.date);
            if (dataChk < iniMes || dataChk > fimMes) return;

            const respChk = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(chk.responsavel) : (chk.responsavel || '').trim().toUpperCase();
            const bateFrente = respChk === frenteNome ||
                (frenteNome === 'ELÉTRICA' && ((chk.empresa || '').toUpperCase().includes('ELÉTRICA') || (chk.nome || '').toUpperCase().includes('ELÉTRICA'))) ||
                (frenteNome === 'OPERAÇÃO' && ((chk.empresa || '').toUpperCase().includes('OPERAÇÃO') || (chk.nome || '').toUpperCase().includes('OPERAÇÃO')));

            if (bateFrente) {
                const ncs = parseInt(chk.nao_conformes || chk.count_nao_conforme || 0, 10);
                if (ncs > 0) {
                    totalNaoConformidades += ncs;
                    totalDesvios += ncs;
                }
                const st = (chk.status_checklist || '').toLowerCase();
                if (st === 'interditado') {
                    totalInterdicoes++;
                    totalDesvios += 2; // Interdição de máquina/veículo tem peso dobrado
                }
            }
        });

        (allRelatos || []).forEach(rel => {
            if (!rel.date) return;
            const dataRel = parseLocalDate(rel.date);
            if (dataRel < iniMes || dataRel > fimMes) return;

            const repRole = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(rel.role) : (rel.role || '').trim().toUpperCase();
            const repId = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(rel.identificacao) : (rel.identificacao || '').trim().toUpperCase();
            if (repRole === frenteNome || repId === frenteNome) {
                totalDesvios++;
            }
        });

        // ----------------------------------------------------
        // ÍNDICE GERAL DE MATURIDADE DE SST
        // ----------------------------------------------------
        const rotinasAvaliadas = [];
        if (pctDds !== null) rotinasAvaliadas.push(pctDds);
        if (pctTrein !== null) rotinasAvaliadas.push(pctTrein);
        if (pctApr !== null) rotinasAvaliadas.push(pctApr);

        const mediaGeral = rotinasAvaliadas.length > 0
            ? Math.round(rotinasAvaliadas.reduce((a, b) => a + b, 0) / rotinasAvaliadas.length)
            : 100;

        ranking.push({
            frenteNome,
            apelido,
            setor: setorNome,
            totalEquipe: equipe.length,
            cfg,
            ehTurnoContinuo,
            // DDS
            diasDds,
            metaDds: metaEsperada,
            pctDds,
            totalAssinaturasDds,
            statusDds,
            // Treinamento
            pctTrein,
            totalTreinamentos,
            totalColabsTreinados: colaboradoresTreinados.size,
            statusTrein,
            // APR
            pctApr,
            totalAprsVigentes,
            statusApr,
            // Regularidade / Desvios
            totalDesvios,
            totalNaoConformidades,
            totalInterdicoes,
            // Geral
            mediaGeral
        });
    });

    // Ordenação do Ranking de Excelência de SST com Critérios Objetivos:
    // 1º Maior Índice Geral de Maturidade de SST (Média ponderada das rotinas)
    // CRITÉRIOS DE DESEMPATE (inclusive para líderes com 100% no DDS):
    // 1º Desempate: % de Treinamentos em dia, Colaboradores capacitados e Sessões realizadas
    // 2º Desempate: Regularidade da APR Vigente no período e Quantidade de APRs
    // 3º Desempate: Menor índice de Não Conformidades / desvios registrados na frente
    // 4º Desempate: Aproveitamento efetivo de DDS (com teto estrito de 100%)
    // 5º Desempate: Tamanho do efetivo gerenciado
    // 6º Ordem alfabética pelo apelido
    ranking.sort((a, b) => {
        if (b.mediaGeral !== a.mediaGeral) return b.mediaGeral - a.mediaGeral;

        // 1º Desempate: Treinamento da equipe
        const treinA = a.pctTrein !== null ? a.pctTrein : 100;
        const treinB = b.pctTrein !== null ? b.pctTrein : 100;
        if (treinB !== treinA) return treinB - treinA;
        if (b.totalColabsTreinados !== a.totalColabsTreinados) return b.totalColabsTreinados - a.totalColabsTreinados;
        if (b.totalTreinamentos !== a.totalTreinamentos) return b.totalTreinamentos - a.totalTreinamentos;

        // 2º Desempate: Regularidade da APR Vigente
        const aprA = a.pctApr !== null ? a.pctApr : 100;
        const aprB = b.pctApr !== null ? b.pctApr : 100;
        if (aprB !== aprA) return aprB - aprA;
        if (b.totalAprsVigentes !== a.totalAprsVigentes) return b.totalAprsVigentes - a.totalAprsVigentes;

        // 3º Desempate: Menor índice de Não Conformidades e Desvios (quem tem menos ganha: a - b)
        if (a.totalDesvios !== b.totalDesvios) return a.totalDesvios - b.totalDesvios;

        // 4º Desempate: % de DDS (com teto de 100%, sem favorecer quem tem dias extras além da meta)
        const ddsA = a.pctDds !== null ? a.pctDds : 100;
        const ddsB = b.pctDds !== null ? b.pctDds : 100;
        if (ddsB !== ddsA) return ddsB - ddsA;

        // 5º Desempate: Tamanho do efetivo
        if (b.totalEquipe !== a.totalEquipe) return b.totalEquipe - a.totalEquipe;

        // 6º Alfabético
        return a.apelido.localeCompare(b.apelido);
    });

    return ranking;
}

function renderPlacarLideres() {
    const ano = parseInt(placarFiltroAno, 10) || new Date().getFullYear();
    const mes = parseInt(placarFiltroMes, 10) || new Date().getMonth();

    const rankingCompleto = calcularPlacarLideres(ano, mes);

    // Mês anterior para cálculo comparativo e tendência de evolução
    let mesAnt = mes - 1;
    let anoAnt = ano;
    if (mesAnt < 0) {
        mesAnt = 11;
        anoAnt = ano - 1;
    }
    const rankingAnterior = calcularPlacarLideres(anoAnt, mesAnt);
    const mesAntNome = NOMES_MESES[mesAnt] || 'Mês Ant.';

    // Enriquecer rankingCompleto com dados de evolução vs mês anterior
    rankingCompleto.forEach((lider, idx) => {
        lider.posAtual = idx + 1;
        const idxAnt = rankingAnterior.findIndex(r => r.frenteNome === lider.frenteNome);
        if (idxAnt >= 0) {
            lider.posAnterior = idxAnt + 1;
            lider.varPos = lider.posAnterior - lider.posAtual; // Positivo = subiu posições
            lider.mediaGeralAnterior = rankingAnterior[idxAnt].mediaGeral;
            lider.varPct = lider.mediaGeral - lider.mediaGeralAnterior;
            lider.isNovo = false;
        } else {
            lider.posAnterior = null;
            lider.varPos = null;
            lider.mediaGeralAnterior = null;
            lider.varPct = null;
            lider.isNovo = true;
        }
    });

    placarRankingAtual = rankingCompleto;

    // Estatísticas Globais dos KPIs
    let somaGeral = 0;
    let totalLideres100 = 0;
    let totalPendencias = 0;
    let totalDdsMes = 0;

    rankingCompleto.forEach(r => {
        somaGeral += r.mediaGeral;
        if (r.mediaGeral === 100) totalLideres100++;
        if (r.mediaGeral < 60) totalPendencias++;
        totalDdsMes += r.diasDds;
    });

    const mediaGeralObra = rankingCompleto.length > 0 ? Math.round(somaGeral / rankingCompleto.length) : 0;

    const elMedia = document.getElementById('placarKpiMediaGeral');
    if (elMedia) elMedia.textContent = mediaGeralObra + '%';
    const elOuro = document.getElementById('placarKpiLideres100');
    if (elOuro) elOuro.textContent = totalLideres100;
    const elAlerta = document.getElementById('placarKpiPendencias');
    if (elAlerta) elAlerta.textContent = totalPendencias;
    const elTotalDds = document.getElementById('placarKpiTotalDds');
    if (elTotalDds) elTotalDds.textContent = totalDdsMes;

    // Destaque do Líder de Maior Evolução no Mês
    let liderMaiorEvolucao = null;
    let maxCrescimento = 0;

    rankingCompleto.forEach(r => {
        if (!r.isNovo && r.varPct !== null && r.varPct > maxCrescimento) {
            maxCrescimento = r.varPct;
            liderMaiorEvolucao = r;
        }
    });

    const elEvolucao = document.getElementById('placarKpiMaiorEvolucao');
    const elEvolucaoSub = document.getElementById('placarKpiMaiorEvolucaoSub');
    if (elEvolucao) {
        if (liderMaiorEvolucao && maxCrescimento > 0) {
            elEvolucao.innerHTML = `🚀 ${escapeHTML(liderMaiorEvolucao.apelido)}`;
            const posBadge = liderMaiorEvolucao.varPos > 0 ? `▲ +${liderMaiorEvolucao.varPos}` : (liderMaiorEvolucao.varPos < 0 ? `▼ ${liderMaiorEvolucao.varPos}` : `▬ 0`);
            if (elEvolucaoSub) {
                elEvolucaoSub.innerHTML = `<strong>+${liderMaiorEvolucao.varPct}%</strong> (${posBadge} pos. vs ${mesAntNome})`;
            }
        } else {
            elEvolucao.textContent = 'Manteve Padrão';
            if (elEvolucaoSub) elEvolucaoSub.textContent = 'Sem variações positivas vs ' + mesAntNome;
        }
    }

    // Filtragem local para exibição na tabela e no pódio (Setor + Busca de texto)
    let rankingFiltrado = rankingCompleto;
    if (placarFiltroSetor) {
        const sBusca = placarFiltroSetor.toUpperCase();
        rankingFiltrado = rankingFiltrado.filter(r => (r.setor || '').toUpperCase().includes(sBusca));
    }
    if (placarBuscaTermo) {
        const tBusca = placarBuscaTermo.toLowerCase();
        rankingFiltrado = rankingFiltrado.filter(r =>
            r.apelido.toLowerCase().includes(tBusca) ||
            r.frenteNome.toLowerCase().includes(tBusca) ||
            r.setor.toLowerCase().includes(tBusca)
        );
    }

    // Renderizar Pódio dos 3 Campeões (contexto do setor filtrado ou geral)
    renderPlacarPodio(rankingFiltrado.slice(0, 3), placarFiltroSetor, mesAntNome);

    renderPlacarTabela(rankingFiltrado, rankingCompleto, mesAntNome, placarFiltroSetor);
}

function renderPlacarPodio(top3, setorFiltro, mesAntNome) {
    const podioContainer = document.getElementById('placarPodioGrid');
    const podioTitulo = document.querySelector('.placar-podio-title');
    if (!podioContainer) return;

    if (podioTitulo) {
        if (setorFiltro) {
            const rotuloSetor = obterRotuloSetor(setorFiltro);
            podioTitulo.innerHTML = `<span>🎖️</span> Pódio de Excelência — ${escapeHTML(rotuloSetor)}`;
        } else {
            podioTitulo.innerHTML = `<span>🎖️</span> Pódio de Excelência em SST — Top 3 Lideranças da Obra`;
        }
    }

    if (!top3 || top3.length === 0) {
        podioContainer.innerHTML = '<div style="color: var(--text-light); font-size: 13px; padding: 10px;">Nenhum líder apto no período selecionado.</div>';
        return;
    }

    const classesPosicao = ['podio-primeiro', 'podio-segundo', 'podio-terceiro'];
    const medalhas = ['🥇', '🥈', '🥉'];
    const titulosPos = ['1º Lugar', '2º Lugar', '3º Lugar'];

    podioContainer.innerHTML = top3.map((lider, idx) => {
        const cls = classesPosicao[idx] || 'podio-terceiro';
        const med = medalhas[idx] || (idx + 1) + 'º';
        const titPos = titulosPos[idx] || (idx + 1) + 'º Colocado';

        const ddsTexto = lider.pctDds !== null ? (lider.diasDds + '/' + lider.metaDds + 'd' + (lider.ehTurnoContinuo && lider.diasDds > lider.metaDds ? ' (Teto 100%)' : '')) : 'Isento';
        const treinTexto = lider.pctTrein !== null ? (lider.pctTrein === 100 ? '✅ Realizado' : '❌ Pendente') : 'Isento';
        const aprTexto = lider.pctApr !== null ? (lider.pctApr === 100 ? '✅ Vigente' : '❌ Pendente') : 'Isenta';
        const trendBadge = formatarBadgeTendencia(lider, mesAntNome);

        return `
            <div class="placar-podio-card ${cls}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="podio-badge-medalha">${med}</div>
                        ${trendBadge}
                    </div>
                    <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">${titPos}</span>
                </div>
                <div>
                    <div class="podio-lider-nome">
                        ${escapeHTML(lider.apelido)}
                        ${lider.ehTurnoContinuo ? '<span class="placar-scale-badge" title="Regime de Turno Contínuo / 12x36 (Teto de 100%)">12x36</span>' : ''}
                    </div>
                    <div class="podio-lider-setor">${escapeHTML(lider.setor)} • ${lider.totalEquipe} colaboradores</div>
                </div>
                <div class="podio-metricas-mini">
                    <div class="podio-mini-item">
                        <span>DDSMA</span>
                        <strong>${ddsTexto}</strong>
                    </div>
                    <div class="podio-mini-item">
                        <span>Treinamento</span>
                        <strong>${treinTexto}</strong>
                    </div>
                    <div class="podio-mini-item">
                        <span>APR</span>
                        <strong>${aprTexto}</strong>
                    </div>
                </div>
                <div class="podio-score-final">
                    <span style="font-size: 12px; font-weight: 700; color: #475569;">Aproveitamento</span>
                    <span class="podio-score-pct">${lider.mediaGeral}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderPlacarTabela(rankingFiltrado, rankingCompleto, mesAntNome, setorFiltro) {
    const tbody = document.getElementById('placarRankingTableBody');
    const totalEl = document.getElementById('placarTotalAvaliados');
    if (totalEl) {
        const sufixo = setorFiltro ? ` no setor ${obterRotuloSetor(setorFiltro)}` : '';
        totalEl.textContent = `Mostrando ${rankingFiltrado.length} de ${rankingCompleto.length} frentes ativas${sufixo}`;
    }

    if (!tbody) return;

    if (rankingFiltrado.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-light);">Nenhum encarregado encontrado com os filtros atuais.</td></tr>';
        return;
    }

    tbody.innerHTML = rankingFiltrado.map((lider, idx) => {
        // Posição no contexto (setorial ou geral)
        const posContexto = idx + 1;
        const medalha = posContexto === 1 ? '🥇' : posContexto === 2 ? '🥈' : posContexto === 3 ? '🥉' : `${posContexto}º`;
        const trendBadge = formatarBadgeTendencia(lider, mesAntNome);

        // Se estiver filtrado por setor, mostra também a posição geral da obra
        let subPosGeral = '';
        if (setorFiltro) {
            subPosGeral = `<span style="font-size: 10.5px; color: var(--text-light); font-weight: 600; display: block; margin-top: 2px;">(${lider.posAtual}º Geral)</span>`;
        }

        // Cores da barra de progresso geral
        const fillClass = lider.mediaGeral >= 90 ? 'fill-verde'
            : lider.mediaGeral >= 70 ? 'fill-azul'
            : lider.mediaGeral >= 50 ? 'fill-amarelo'
            : 'fill-vermelho';

        // Variação percentual formatada
        let varPctBadge = '';
        if (lider.varPct !== null && lider.varPct !== 0) {
            const corVar = lider.varPct > 0 ? '#10b981' : '#ef4444';
            const sinal = lider.varPct > 0 ? '+' : '';
            varPctBadge = `<span style="font-size: 11px; font-weight: 700; color: ${corVar}; margin-left: 4px;">(${sinal}${lider.varPct}%)</span>`;
        }

        // Badges das entregas
        let chipDds;
        if (lider.pctDds === null) {
            chipDds = '<span class="placar-status-chip chip-isento">⚪ Isento</span>';
        } else if (lider.statusDds === 'sucesso') {
            const rotuloTeto = (lider.ehTurnoContinuo && lider.diasDds > lider.metaDds) ? ' (100% • Teto)' : ' (100%)';
            chipDds = `<span class="placar-status-chip chip-sucesso" title="${lider.ehTurnoContinuo ? 'Regime de Turno Contínuo / 12x36 — Aproveitamento com teto estrito em 100%' : 'Meta atingida'}">🟢 ${lider.diasDds}/${lider.metaDds}d${rotuloTeto}</span>`;
        } else if (lider.statusDds === 'alerta') {
            chipDds = `<span class="placar-status-chip chip-alerta">🟡 ${lider.diasDds}/${lider.metaDds}d (${lider.pctDds}%)</span>`;
        } else {
            chipDds = `<span class="placar-status-chip chip-perigo">🔴 ${lider.diasDds}/${lider.metaDds}d (${lider.pctDds}%)</span>`;
        }

        let chipTrein;
        if (lider.pctTrein === null) {
            chipTrein = '<span class="placar-status-chip chip-isento">⚪ Isento</span>';
        } else if (lider.pctTrein === 100) {
            chipTrein = `<span class="placar-status-chip chip-sucesso" title="${lider.totalTreinamentos} sessão(ões), ${lider.totalColabsTreinados} capacitados">🟢 Realizado (${lider.totalTreinamentos})</span>`;
        } else {
            chipTrein = '<span class="placar-status-chip chip-perigo">🔴 Pendente</span>';
        }

        let chipApr;
        if (lider.pctApr === null) {
            chipApr = '<span class="placar-status-chip chip-isento">⚪ Isenta</span>';
        } else if (lider.pctApr === 100) {
            chipApr = `<span class="placar-status-chip chip-sucesso" title="${lider.totalAprsVigentes} APR(s) válida(s) no mês">🟢 Vigente (${lider.totalAprsVigentes})</span>`;
        } else {
            chipApr = '<span class="placar-status-chip chip-perigo">🔴 Sem APR</span>';
        }

        return `
            <tr>
                <td class="placar-posicao">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                        <span>${medalha}</span>
                        ${subPosGeral}
                        ${trendBadge}
                    </div>
                </td>
                <td>
                    <div class="placar-lider-cell">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span class="placar-lider-title">${escapeHTML(lider.apelido)}</span>
                            ${lider.ehTurnoContinuo ? '<span class="placar-scale-badge" title="Regime de Turno Contínuo / 12x36 (Aproveitamento com teto de 100%)">12x36 / Turno</span>' : ''}
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 2px;">
                            <span class="placar-lider-sub">Equipe: ${lider.totalEquipe} pessoas ativas</span>
                            ${lider.totalDesvios > 0 ? `<span style="font-size: 10.5px; color: #dc2626; font-weight: 700;" title="${lider.totalDesvios} não conformidade(s) ou desvio(s) registrados na frente">⚠️ ${lider.totalDesvios} desvio(s)</span>` : '<span style="font-size: 10.5px; color: #16a34a; font-weight: 600;" title="Nenhum desvio registrado no período">🛡️ 0 desvios</span>'}
                        </div>
                    </div>
                </td>
                <td>
                    <span style="font-weight: 600; font-size: 12px; color: var(--text-light);">${escapeHTML(lider.setor)}</span>
                </td>
                <td style="text-align: center;">${chipDds}</td>
                <td style="text-align: center;">${chipTrein}</td>
                <td style="text-align: center;">${chipApr}</td>
                <td>
                    <div class="placar-progress-wrap">
                        <div class="placar-progress-bg">
                            <div class="placar-progress-fill ${fillClass}" style="width: ${lider.mediaGeral}%;"></div>
                        </div>
                        <div style="display: flex; align-items: center; min-width: 75px; justify-content: flex-end;">
                            <span style="font-weight: 800; font-size: 13.5px;">${lider.mediaGeral}%</span>
                            ${varPctBadge}
                        </div>
                    </div>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                        <button class="placar-btn-chart" onclick="abrirModalHistoricoPlacar('${escapeHTML(lider.frenteNome)}')" title="Ver histórico e gráfico de evolução de ${escapeHTML(lider.apelido)}">
                            <span>📈</span>
                        </button>
                        <button class="placar-btn-msg" onclick="abrirModalMsgLider('${escapeHTML(lider.frenteNome)}')" title="Enviar mensagem privada para este encarregado">
                            <span>📲</span> WhatsApp
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function onPlacarFiltroChange() {
    const anoSel = document.getElementById('placarFiltroAno');
    const mesSel = document.getElementById('placarFiltroMes');
    const setorSel = document.getElementById('placarFiltroSetor');

    if (anoSel) placarFiltroAno = anoSel.value;
    if (mesSel) placarFiltroMes = mesSel.value;
    if (setorSel) {
        placarFiltroSetor = setorSel.value;
        const pills = document.querySelectorAll('#placarSectorPills .sector-pill');
        pills.forEach(p => {
            if (p.dataset.setor === placarFiltroSetor) p.classList.add('active');
            else p.classList.remove('active');
        });
    }

    // Sincroniza o campo de meta de DDS com a meta persistida do mês selecionado
    sincronizarInputMetaPlacar();

    renderPlacarLideres();
}

async function onPlacarMetaDiasChange() {
    const metaInput = document.getElementById('placarMetaDiasDds');
    if (!metaInput) return;
    const val = parseInt(metaInput.value, 10);
    if (isNaN(val) || val <= 0 || val > 31) {
        alert('Por favor, informe uma quantidade válida de dias no mês (entre 1 e 31).');
        sincronizarInputMetaPlacar();
        return;
    }

    const ano = parseInt(placarFiltroAno, 10) || new Date().getFullYear();
    const mes = parseInt(placarFiltroMes, 10) || new Date().getMonth();
    const key = `${ano}-${String(mes + 1).padStart(2, '0')}`;

    if (typeof hhtDiasTrabalhadosMap === 'undefined') window.hhtDiasTrabalhadosMap = {};
    const horasDia = (hhtDiasTrabalhadosMap[key] && hhtDiasTrabalhadosMap[key].horas_por_dia) ? Math.round(hhtDiasTrabalhadosMap[key].horas_por_dia) : 8;

    hhtDiasTrabalhadosMap[key] = {
        id: key,
        ano: ano,
        mes: mes + 1,
        dias_trabalhados: val,
        horas_por_dia: horasDia
    };

    // Feedback visual imediato no input
    metaInput.style.borderColor = '#10b981';
    metaInput.title = `Meta salva no Supabase (${key}: ${val} dias úteis)`;

    try {
        await supabaseUpsert('hht_dias_trabalhados', [{
            id: key,
            ano: ano,
            mes: mes + 1,
            dias_trabalhados: val,
            horas_por_dia: horasDia
        }]);
        console.log(`[Placar] Meta de ${val} dias úteis salva com sucesso em hht_dias_trabalhados para ${key}`);
    } catch (err) {
        console.error('Erro ao persistir meta em hht_dias_trabalhados:', err);
    }

    renderPlacarLideres();
}

function onPlacarBuscaInput(val) {
    placarBuscaTermo = val.trim();
    renderPlacarLideres();
}

// ----------------------------------------------------
// COMPARTILHAMENTO: WHATSAPP DO GRUPO (RANKING COMPLETO OU SETORIAL)
// ----------------------------------------------------
function copiarRankingWhatsApp() {
    if (!placarRankingAtual || placarRankingAtual.length === 0) {
        alert('Nenhum dado calculado para o período.');
        return;
    }

    const ano = placarFiltroAno;
    const mesNome = NOMES_MESES[parseInt(placarFiltroMes, 10)] || 'Mês';

    // Se estiver filtrado por setor, gera mensagem com o foco do setor
    let listaEnvio = placarRankingAtual;
    let tituloSetor = 'GERAL';
    if (placarFiltroSetor) {
        const sBusca = placarFiltroSetor.toUpperCase();
        listaEnvio = placarRankingAtual.filter(r => (r.setor || '').toUpperCase().includes(sBusca));
        tituloSetor = obterRotuloSetor(placarFiltroSetor).toUpperCase();
    }

    if (listaEnvio.length === 0) {
        alert('Nenhum encarregado encontrado no setor selecionado.');
        return;
    }

    let texto = `🏆 *PLACAR DAS LIDERANÇAS DE SST — ${tituloSetor}*\n`;
    texto += `🏢 *Consórcio Operador Ramal do Agreste (COP Ramal)*\n`;
    texto += `📅 *Período de Avaliação:* ${mesNome} / ${ano}\n`;
    texto += `🎯 *Rotinas Obrigatórias:* DDSMA Diário + Treinamento Mensal + APR Vigente\n`;
    texto += `-----------------------------------------\n\n`;

    listaEnvio.forEach((lider, idx) => {
        const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `*${idx + 1}º*`;
        const ddsTxt = lider.pctDds !== null ? `DDS: ${lider.diasDds}/${lider.metaDds}d (${lider.pctDds}%)` : 'DDS: Isento';
        const treinTxt = lider.pctTrein !== null ? (lider.pctTrein === 100 ? 'Trein: OK' : 'Trein: Pendente') : 'Trein: Isento';
        const aprTxt = lider.pctApr !== null ? (lider.pctApr === 100 ? 'APR: OK' : 'APR: Pendente') : 'APR: Isenta';

        const posTrend = lider.varPos > 0 ? `▲ +${lider.varPos}` : (lider.varPos < 0 ? `▼ ${lider.varPos}` : `▬ 0`);
        const subPosGeral = placarFiltroSetor ? ` (${lider.posAtual}º Geral | ${posTrend})` : ` (${posTrend})`;

        texto += `${medalha} *${lider.apelido}*${subPosGeral}\n`;
        texto += `   📊 Aproveitamento: *${lider.mediaGeral}%* | ${ddsTxt} | ${treinTxt} | ${aprTxt}\n\n`;
    });

    const soma = listaEnvio.reduce((s, r) => s + r.mediaGeral, 0);
    const mediaSetor = Math.round(soma / listaEnvio.length);

    texto += `-----------------------------------------\n`;
    texto += `📈 *Índice Médio de Entregas:* *${mediaSetor}%*\n`;
    texto += `👏 Parabéns a todos os encarregados pelo compromisso com a vida e segurança das equipes!\n`;
    texto += `_Engenharia de Segurança do Trabalho - COP Ramal do Agreste_`;

    navigator.clipboard.writeText(texto).then(() => {
        const alvo = placarFiltroSetor ? `do setor ${obterRotuloSetor(placarFiltroSetor)}` : 'Geral';
        alert(`📋 Ranking ${alvo} copiado com sucesso! Já pode colar no grupo de WhatsApp.`);
    }).catch(err => {
        console.error('Falha ao copiar:', err);
        prompt('Copie o texto abaixo para enviar no WhatsApp:', texto);
    });
}

// ----------------------------------------------------
// COMPARTILHAMENTO: WHATSAPP INDIVIDUAL DO ENCARREGADO
// ----------------------------------------------------
function abrirModalMsgLider(frenteNome) {
    const lider = placarRankingAtual.find(r => r.frenteNome === frenteNome);
    if (!lider) return;

    placarLiderMsgAtual = lider;

    const modal = document.getElementById('modalPlacarMsgLider');
    const txtArea = document.getElementById('placarMsgLiderTexto');
    const statusMsg = document.getElementById('placarMsgLiderStatus');
    if (statusMsg) statusMsg.textContent = '';

    const posGlobal = placarRankingAtual.findIndex(r => r.frenteNome === frenteNome) + 1;
    const medalha = posGlobal === 1 ? '🥇 1º Lugar' : posGlobal === 2 ? '🥈 2º Lugar' : posGlobal === 3 ? '🥉 3º Lugar' : `${posGlobal}º Lugar`;
    const mesNome = NOMES_MESES[parseInt(placarFiltroMes, 10)] || 'Mês';

    let msg = `Olá, *${lider.apelido}*! Tudo bem?\n\n`;
    msg += `Segue o retorno oficial de SST sobre as entregas de rotina da sua equipe no mês de *${mesNome}/${placarFiltroAno}*:\n\n`;

    if (lider.pctDds !== null) {
        msg += lider.pctDds === 100
            ? `✅ *DDSMA:* Cumprido com excelência! (${lider.diasDds} de ${lider.metaDds} dias - 100%)\n`
            : `⚠️ *DDSMA:* ${lider.diasDds} de ${lider.metaDds} dias realizados (${lider.pctDds}% do previsto)\n`;
    }

    if (lider.pctTrein !== null) {
        msg += lider.pctTrein === 100
            ? `✅ *Treinamentos da Equipe:* Realizado no mês (${lider.totalTreinamentos} sessão/ões - ${lider.totalColabsTreinados} colaboradores capacitados)\n`
            : `❌ *Treinamentos da Equipe:* Pendente no período avaliado\n` ;
    }

    if (lider.pctApr !== null) {
        msg += lider.pctApr === 100
            ? `✅ *APR da Atividade:* Vigente e em conformidade na obra\n`
            : `❌ *APR da Atividade:* Sem APR vigente cadastrada no período\n`;
    }

    msg += `\n🎯 *Seu Índice Geral de Entregas:* *${lider.mediaGeral}%* (${medalha} no Placar Geral da Obra)\n\n`;

    if (lider.mediaGeral >= 90) {
        msg += `Parabéns pela postura exemplar e liderança na segurança de todos os seus colaboradores! 👏🏆\n`;
    } else if (lider.mediaGeral >= 70) {
        msg += `Bom resultado! Vamos juntos ajustar as pendências para alcançar os 100% no próximo fechamento! 💪\n`;
    } else {
        msg += `Contamos com o seu empenho imediato para regularizar as rotinas pendentes com o time de SST. Segurança em primeiro lugar!\n`;
    }

    msg += `\n_Engenharia de Segurança do Trabalho - Obra Ramal do Agreste_`;

    if (txtArea) txtArea.value = msg;
    if (modal) modal.style.display = 'flex';
}

function fecharModalMsgLider() {
    const modal = document.getElementById('modalPlacarMsgLider');
    if (modal) modal.style.display = 'none';
}

function copiarTextoMsgLiderModal() {
    const txtArea = document.getElementById('placarMsgLiderTexto');
    const statusMsg = document.getElementById('placarMsgLiderStatus');
    if (!txtArea) return;

    navigator.clipboard.writeText(txtArea.value).then(() => {
        if (statusMsg) {
            statusMsg.textContent = '✅ Texto copiado para a área de transferência!';
            statusMsg.style.color = 'var(--success)';
        }
    }).catch(() => {
        txtArea.select();
        document.execCommand('copy');
        if (statusMsg) {
            statusMsg.textContent = '✅ Texto copiado!';
            statusMsg.style.color = 'var(--success)';
        }
    });
}

function abrirWhatsAppWebLiderModal() {
    const txtArea = document.getElementById('placarMsgLiderTexto');
    if (!txtArea || !txtArea.value) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(txtArea.value)}`;
    window.open(url, '_blank');
}

// ----------------------------------------------------
// CONFIGURAÇÃO DE ENCARREGADOS E METAS DE SST
// ----------------------------------------------------
function abrirModalConfigRotinas() {
    if (!allRotinasConfig) allRotinasConfig = obterConfigRotinasPadrao();
    const configFrentes = allRotinasConfig.frentes || {};

    const tbody = document.getElementById('placarConfigTableBody');
    const modal = document.getElementById('modalPlacarConfig');
    const statusMsg = document.getElementById('placarConfigStatusMsg');
    if (statusMsg) statusMsg.textContent = '';

    if (!tbody || !modal) return;

    // Todas as frentes conhecidas no sistema (filtrando aliases antigos que viraram outra frente)
    const frentesSet = new Set();
    Object.keys(configFrentes).forEach(f => {
        const fRes = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(f) : f;
        const ehAliasAntigo = (allDdsFrentesAlias || []).some(a => a.id === f);
        if (fRes && !ehAliasAntigo) frentesSet.add(fRes);
    });
    (allEfetivo || []).forEach(e => {
        if (colaboradorEstaAtivo(e) && e.responsavel) {
            const f = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(e.responsavel) : e.responsavel;
            const ehAliasAntigo = (allDdsFrentesAlias || []).some(a => a.id === (e.responsavel || '').trim().toUpperCase());
            if (f && !ehAliasAntigo) frentesSet.add(f);
        }
    });

    const listaFrentes = Array.from(frentesSet).sort();

    tbody.innerHTML = listaFrentes.map((f, idx) => {
        const cfg = configFrentes[f] || {
            ativo: true,
            exige_dds: true,
            exige_treinamento: true,
            exige_apr: true,
            setor: '',
            apelido: f
        };

        const ehTurno = (cfg.escala === 'turno_continuo') || (f === 'DEYLON') || (cfg.setor && cfg.setor.includes('OPERAÇÃO'));
        const apelido = cfg.apelido || f;

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="text-align: center; padding: 8px;">
                    <input type="checkbox" id="cfgPlacar_ativo_${idx}" data-frente="${escapeHTML(f)}" ${cfg.ativo ? 'checked' : ''} style="cursor: pointer; transform: scale(1.15);">
                </td>
                <td style="padding: 8px; font-weight: 700; color: var(--text);">
                    ${escapeHTML(f)}
                </td>
                <td style="padding: 8px;">
                    <input type="text" id="cfgPlacar_apelido_${idx}" value="${escapeHTML(apelido)}" placeholder="Nome exibido / Setor" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; box-sizing: border-box;">
                </td>
                <td style="text-align: center; padding: 8px;">
                    <input type="checkbox" id="cfgPlacar_dds_${idx}" ${cfg.exige_dds ? 'checked' : ''} style="cursor: pointer;">
                </td>
                <td style="text-align: center; padding: 8px;">
                    <input type="checkbox" id="cfgPlacar_trein_${idx}" ${cfg.exige_treinamento ? 'checked' : ''} style="cursor: pointer;">
                </td>
                <td style="text-align: center; padding: 8px;">
                    <input type="checkbox" id="cfgPlacar_apr_${idx}" ${cfg.exige_apr ? 'checked' : ''} style="cursor: pointer;">
                </td>
                <td style="text-align: center; padding: 8px;">
                    <select id="cfgPlacar_escala_${idx}" style="font-size: 11px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--card-bg, #fff); color: var(--text);">
                        <option value="padrao" ${!ehTurno ? 'selected' : ''}>Padrão (Dias Úteis)</option>
                        <option value="turno_continuo" ${ehTurno ? 'selected' : ''}>12x36 / Turno</option>
                    </select>
                </td>
            </tr>
        `;
    }).join('');

    renderPlacarAliasLista();
    modal.style.display = 'flex';
}

function fecharModalConfigRotinas() {
    const modal = document.getElementById('modalPlacarConfig');
    if (modal) modal.style.display = 'none';
}

async function salvarModalConfigRotinas() {
    const statusMsg = document.getElementById('placarConfigStatusMsg');
    if (statusMsg) {
        statusMsg.textContent = 'Salvando configurações no banco...';
        statusMsg.style.color = 'var(--text-light)';
    }

    const novasFrentes = {};
    const tbody = document.getElementById('placarConfigTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
        const chkAtivo = document.getElementById(`cfgPlacar_ativo_${idx}`);
        if (!chkAtivo) return;
        const frente = chkAtivo.dataset.frente;
        const apelido = document.getElementById(`cfgPlacar_apelido_${idx}`)?.value.trim() || frente;
        const exigeDds = document.getElementById(`cfgPlacar_dds_${idx}`)?.checked || false;
        const exigeTrein = document.getElementById(`cfgPlacar_trein_${idx}`)?.checked || false;
        const exigeApr = document.getElementById(`cfgPlacar_apr_${idx}`)?.checked || false;
        const escala = document.getElementById(`cfgPlacar_escala_${idx}`)?.value || 'padrao';

        novasFrentes[frente] = {
            ativo: chkAtivo.checked,
            apelido: apelido,
            setor: (allRotinasConfig.frentes && allRotinasConfig.frentes[frente] && allRotinasConfig.frentes[frente].setor) || '',
            escala: escala,
            exige_dds: exigeDds,
            exige_treinamento: exigeTrein,
            exige_apr: exigeApr
        };
    });

    // Preserva frentes antigas desativadas ou aliases
    const frentesFinais = { ...(allRotinasConfig.frentes || {}), ...novasFrentes };
    (allDdsFrentesAlias || []).forEach(a => {
        if (frentesFinais[a.id]) {
            frentesFinais[a.id].ativo = false; // aliases nunca ficam ativos como líderes independentes
        }
    });

    const novaConfig = {
        meta_dias_dds_padrao: placarMetaDiasCustom,
        frentes: frentesFinais
    };

    try {
        await salvarConfigRotinas(novaConfig);
        if (statusMsg) {
            statusMsg.textContent = '✅ Configurações salvas com sucesso!';
            statusMsg.style.color = 'var(--success)';
        }
        renderPlacarLideres();
        setTimeout(() => fecharModalConfigRotinas(), 800);
    } catch (e) {
        if (statusMsg) {
            statusMsg.textContent = '❌ Falha ao salvar: ' + e.message;
            statusMsg.style.color = 'var(--danger)';
        }
    }
}

// ----------------------------------------------------
// GERENCIAMENTO DE UNIFICAÇÃO DE ENCARREGADOS / ALIASES
// ----------------------------------------------------
function renderPlacarAliasLista() {
    const container = document.getElementById('placarAliasLista');
    if (!container) return;
    if (!allDdsFrentesAlias || allDdsFrentesAlias.length === 0) {
        container.innerHTML = '<div style="color:var(--text-light); font-style:italic; padding:4px 0;">Nenhuma unificação cadastrada.</div>';
        return;
    }
    container.innerHTML = allDdsFrentesAlias.slice().sort((a, b) => a.id.localeCompare(b.id)).map(a => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--card-bg, #fff); padding:6px 10px; border-radius:6px; border:1px solid var(--border);">
            <span style="font-size:12px;">
                <strong style="color:var(--text);">${escapeHTML(a.id)}</strong>
                <span style="color:var(--text-light); margin:0 8px;">➔</span>
                <strong style="color:var(--primary);">${escapeHTML(a.frente_atual)}</strong>
            </span>
            <button type="button" onclick="removerUnificacaoPlacar('${escapeHTML(a.id)}')" title="Desfazer unificação" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:700; font-size:14px; padding:2px 6px;">✕</button>
        </div>
    `).join('');
}

async function adicionarUnificacaoPlacar() {
    const inputAntigo = document.getElementById('placarAliasAntigoInput');
    const inputAtual = document.getElementById('placarAliasAtualInput');
    if (!inputAntigo || !inputAtual) return;

    const nomeAntigo = (inputAntigo.value || '').trim().toUpperCase();
    const nomeAtual = (inputAtual.value || '').trim().toUpperCase();

    if (!nomeAntigo || !nomeAtual) {
        alert('Preencha os nomes do encarregado antigo e da frente atual.');
        return;
    }
    if (nomeAntigo === nomeAtual) {
        alert('O nome antigo e o nome atual não podem ser iguais.');
        return;
    }

    if (!confirm(`Confirma unificar "${nomeAntigo}" com "${nomeAtual}"?\n\nTodo o histórico de DDS, Treinamentos e APRs de "${nomeAntigo}" passará a ser computado em "${nomeAtual}". O histórico original no banco não é alterado nem apagado.`)) {
        return;
    }

    try {
        await supabaseUpsert('dds_frentes_alias', [{ id: nomeAntigo, frente_atual: nomeAtual }]);
        await supabaseUpsert('dds_frentes_config', [
            { id: nomeAtual, ativo: true },
            { id: nomeAntigo, ativo: false }
        ]);
        
        // Atualiza arrays em memória
        const idxAlias = allDdsFrentesAlias.findIndex(a => a.id === nomeAntigo);
        if (idxAlias >= 0) allDdsFrentesAlias[idxAlias].frente_atual = nomeAtual;
        else allDdsFrentesAlias.push({ id: nomeAntigo, frente_atual: nomeAtual });

        // Garante no config de rotinas que o antigo fica inativo e o novo ativo
        if (!allRotinasConfig) allRotinasConfig = obterConfigRotinasPadrao();
        if (!allRotinasConfig.frentes) allRotinasConfig.frentes = {};
        allRotinasConfig.frentes[nomeAntigo] = {
            ativo: false,
            apelido: `${nomeAntigo} (Unificado com ${nomeAtual})`,
            exige_dds: false,
            exige_treinamento: false,
            exige_apr: false
        };
        if (!allRotinasConfig.frentes[nomeAtual]) {
            allRotinasConfig.frentes[nomeAtual] = {
                ativo: true,
                apelido: nomeAtual,
                exige_dds: true,
                exige_treinamento: true,
                exige_apr: true
            };
        }
        await salvarConfigRotinas(allRotinasConfig);

        inputAntigo.value = '';
        inputAtual.value = '';

        renderPlacarAliasLista();
        abrirModalConfigRotinas();
        renderPlacarLideres();

        if (typeof renderDdsAliasFrentes === 'function') renderDdsAliasFrentes();
        if (typeof renderDdsGerenciarFrentes === 'function') renderDdsGerenciarFrentes();
    } catch (e) {
        alert('Erro ao unificar: ' + e.message);
    }
}

async function removerUnificacaoPlacar(nomeAntigo) {
    if (!confirm(`Desfazer a unificação de "${nomeAntigo}"? Ele voltará a ser tratado como encarregado independente.`)) {
        return;
    }
    try {
        await supabaseDelete('dds_frentes_alias', nomeAntigo);
        allDdsFrentesAlias = allDdsFrentesAlias.filter(a => a.id !== nomeAntigo);

        renderPlacarAliasLista();
        abrirModalConfigRotinas();
        renderPlacarLideres();

        if (typeof renderDdsAliasFrentes === 'function') renderDdsAliasFrentes();
        if (typeof renderDdsGerenciarFrentes === 'function') renderDdsGerenciarFrentes();
    } catch (e) {
        alert('Erro ao desfazer unificação: ' + e.message);
    }
}

// ----------------------------------------------------
// IMPRESSÃO / RELATÓRIO OFICIAL DO PLACAR DE LIDERANÇAS
// ----------------------------------------------------
function imprimirPlacarLideres() {
    if (!placarRankingAtual || placarRankingAtual.length === 0) {
        alert('Nenhum dado calculado para o período.');
        return;
    }

    const ano = placarFiltroAno || String(new Date().getFullYear());
    const mesIdx = parseInt(placarFiltroMes, 10);
    const mesNome = NOMES_MESES[mesIdx] || 'Mês';
    const periodoFormatado = `${mesNome} / ${ano}`;
    const agoraFormatado = new Date().toLocaleString('pt-BR');

    // Se estiver filtrado por setor, foca a emissão apenas no setor selecionado
    let listaImpressao = placarRankingAtual;
    let subtituloSetor = 'GERAL DA OBRA';
    if (placarFiltroSetor) {
        const sBusca = placarFiltroSetor.toUpperCase();
        listaImpressao = placarRankingAtual.filter(r => (r.setor || '').toUpperCase().includes(sBusca));
        subtituloSetor = obterRotuloSetor(placarFiltroSetor).toUpperCase();
    }

    if (listaImpressao.length === 0) {
        alert('Nenhum encarregado encontrado no setor selecionado para emissão.');
        return;
    }

    // Estatísticas Globais
    const soma = listaImpressao.reduce((s, r) => s + r.mediaGeral, 0);
    const mediaGeral = listaImpressao.length > 0 ? Math.round(soma / listaImpressao.length) : 0;
    const total100 = listaImpressao.filter(r => r.mediaGeral === 100).length;
    const totalCriticos = listaImpressao.filter(r => r.mediaGeral < 60).length;
    const totalDds = listaImpressao.reduce((s, r) => s + r.diasDds, 0);

    // Linhas da Tabela Completa com indicador de tendência
    const linhasTabela = listaImpressao.map((lider, idx) => {
        const medalha = idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`;
        
        let ddsStr = 'Isento';
        if (lider.pctDds !== null) {
            const rotuloTeto = (lider.ehTurnoContinuo && lider.diasDds > lider.metaDds) ? ' (100% • Teto)' : ` (${lider.pctDds}%)`;
            ddsStr = `${lider.diasDds}/${lider.metaDds}d${rotuloTeto}`;
        }

        let treinStr = 'Isento';
        if (lider.pctTrein !== null) {
            treinStr = lider.pctTrein === 100 ? `✅ Realizado (${lider.totalTreinamentos})` : '❌ Pendente';
        }

        let aprStr = 'Isenta';
        if (lider.pctApr !== null) {
            aprStr = lider.pctApr === 100 ? `✅ Vigente (${lider.totalAprsVigentes})` : '❌ Sem APR';
        }

        const bgLinha = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const corScore = lider.mediaGeral >= 90 ? '#15803d' : (lider.mediaGeral >= 70 ? '#1d4ed8' : (lider.mediaGeral >= 50 ? '#b45309' : '#b91c1c'));

        let trendStr = '▬ 0';
        let trendCor = '#64748b';
        if (lider.isNovo) {
            trendStr = '★ Novo';
            trendCor = '#2563eb';
        } else if (lider.varPos > 0) {
            trendStr = `▲ +${lider.varPos}`;
            trendCor = '#15803d';
        } else if (lider.varPos < 0) {
            trendStr = `▼ ${lider.varPos}`;
            trendCor = '#b91c1c';
        }

        const tagTurnoImp = lider.ehTurnoContinuo ? ' <span style="font-size: 8.5px; color: #0284c7; font-weight: 700;">[12x36]</span>' : '';

        return `
            <tr style="background: ${bgLinha};">
                <td style="text-align: center; font-weight: 700; padding: 6px 6px; border: 1px solid #cbd5e1;">${medalha}</td>
                <td style="text-align: center; font-weight: 700; font-size: 10px; padding: 6px 4px; border: 1px solid #cbd5e1; color: ${trendCor};">${trendStr}</td>
                <td style="font-weight: 700; padding: 6px 8px; border: 1px solid #cbd5e1;">
                    ${escapeHTML(lider.apelido)}${tagTurnoImp}
                </td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${escapeHTML(lider.setor)}</td>
                <td style="text-align: center; padding: 6px 8px; border: 1px solid #cbd5e1;">${lider.totalEquipe}</td>
                <td style="text-align: center; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${ddsStr}</td>
                <td style="text-align: center; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${treinStr}</td>
                <td style="text-align: center; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${aprStr}</td>
                <td style="text-align: center; font-weight: 800; padding: 6px 8px; border: 1px solid #cbd5e1; color: ${corScore}; font-size: 12px;">
                    ${lider.mediaGeral}%
                </td>
            </tr>
        `;
    }).join('');

    // Destaque Top 3
    const top3 = listaImpressao.slice(0, 3);
    const podioHtml = top3.map((l, i) => {
        const med = i === 0 ? '🥇 1º LUGAR' : (i === 1 ? '🥈 2º LUGAR' : '🥉 3º LUGAR');
        const bordaCor = i === 0 ? '#f59e0b' : (i === 1 ? '#94a3b8' : '#ea580c');
        const bgCor = i === 0 ? '#fffbeb' : (i === 1 ? '#f8fafc' : '#fff7ed');
        return `
            <div style="flex: 1; border: 2px solid ${bordaCor}; background: ${bgCor}; border-radius: 8px; padding: 10px 12px; box-sizing: border-box;">
                <div style="font-weight: 800; font-size: 12px; color: #1e1b4b; margin-bottom: 4px;">${med}</div>
                <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${escapeHTML(l.apelido)}</div>
                <div style="font-size: 10.5px; color: #64748b; margin-bottom: 6px;">${escapeHTML(l.setor)} • ${l.totalEquipe} colaboradores</div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
                    <span>Aproveitamento:</span>
                    <strong style="font-size: 13px; color: #1e1b4b;">${l.mediaGeral}%</strong>
                </div>
            </div>
        `;
    }).join('');

    const logoHtml = (typeof LOGO_COP_BASE64 !== 'undefined' && LOGO_COP_BASE64)
        ? `<img src="${LOGO_COP_BASE64}" alt="Consórcio Operador Ramal do Agreste" style="max-height: 48px; max-width: 170px; object-fit: contain;">`
        : `<div style="font-weight: 800; font-size: 16px; color: #1e1b4b;">COP RAMAL DO AGRESTE</div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Placar_Liderancas_SST_${ano}_${String(mesIdx + 1).padStart(2, '0')}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 12mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .no-print {
            text-align: center;
            padding: 12px;
            background: #f1f5f9;
            border-bottom: 1px solid #cbd5e1;
            margin-bottom: 16px;
        }
        .btn-imprimir {
            background: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 10px 22px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .btn-imprimir:hover { background: #4338ca; }
        .folha-relatorio {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
        }
        .cabecalho-tabela {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .titulo-doc {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.3px;
        }
        .subtitulo-doc {
            font-size: 11px;
            color: #475569;
            margin-top: 3px;
        }
        .kpi-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 14px;
        }
        .kpi-card {
            flex: 1;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }
        .kpi-label {
            font-size: 9.5px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
        }
        .kpi-val {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
        }
        .secao-titulo {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e1b4b;
            border-left: 3px solid #4f46e5;
            padding-left: 6px;
            margin: 12px 0 8px 0;
        }
        table.tabela-dados {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-top: 6px;
        }
        table.tabela-dados th {
            background: #e2e8f0;
            color: #1e293b;
            font-size: 9.5px;
            text-transform: uppercase;
            font-weight: 800;
            padding: 7px 6px;
            border: 1px solid #cbd5e1;
        }
        table.tabela-dados td {
            vertical-align: middle;
        }
        .rodape-assinaturas {
            margin-top: 22px;
            display: flex;
            justify-content: space-between;
            gap: 30px;
            page-break-inside: avoid;
        }
        .box-assinatura {
            flex: 1;
            text-align: center;
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 10.5px;
            color: #334155;
            line-height: 1.4;
        }
        @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; }
            .folha-relatorio { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    </div>

    <div class="folha-relatorio">
        <table class="cabecalho-tabela">
            <tr>
                <td style="width: 180px; vertical-align: middle;">
                    ${logoHtml}
                </td>
                <td style="vertical-align: middle; padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
                        Consórcio Operador do PISF • Ramal do Agreste
                    </div>
                    <div class="titulo-doc">
                        Boletim Gerencial de SST — Placar das Lideranças (${subtituloSetor})
                    </div>
                    <div class="subtitulo-doc">
                        Monitoramento de Entregas Operacionais: DDSMA Diário, Treinamentos da Equipe e APR Vigente
                    </div>
                </td>
                <td style="width: 170px; text-align: right; vertical-align: middle; font-size: 10.5px; color: #475569; line-height: 1.4;">
                    <strong>Período:</strong> ${periodoFormatado}<br>
                    <strong>Emissão:</strong> ${agoraFormatado}<br>
                    <strong>Status:</strong> Oficial SESMT
                </td>
            </tr>
        </table>

        <!-- Resumo Executivo em KPIs -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Índice Médio (${subtituloSetor})</div>
                <div class="kpi-val" style="color: #4f46e5;">${mediaGeral}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Frentes Avaliadas</div>
                <div class="kpi-val">${listaImpressao.length}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Líderes Destaque (100%)</div>
                <div class="kpi-val" style="color: #15803d;">${total100}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Total de DDS Realizados</div>
                <div class="kpi-val" style="color: #0284c7;">${totalDds}</div>
            </div>
        </div>

        <!-- Pódio das 3 Lideranças Destaque -->
        <div class="secao-titulo">1. Destaque de Excelência — Lideranças no Pódio (${subtituloSetor})</div>
        <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            ${podioHtml}
        </div>

        <!-- Tabela Completa de Classificação -->
        <div class="secao-titulo">2. Classificação de Cumprimento das Rotinas de SST</div>
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th style="width: 44px; text-align: center;">Pos.</th>
                    <th style="width: 55px; text-align: center;">Evol.</th>
                    <th style="text-align: left;">Encarregado / Frente</th>
                    <th style="text-align: left;">Setor / Atividade</th>
                    <th style="width: 45px; text-align: center;">Efetivo</th>
                    <th style="width: 125px; text-align: center;">DDSMA (Dias/Meta)</th>
                    <th style="width: 130px; text-align: center;">Treinamento da Equipe</th>
                    <th style="width: 105px; text-align: center;">APR Vigente</th>
                    <th style="width: 65px; text-align: center;">Aprov.</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>

        <!-- Diretrizes e Responsabilidade Técnica -->
        <div style="margin-top: 14px; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px; color: #475569; line-height: 1.45;">
            <strong>Critérios de Apuração e Governança de SST:</strong> O aproveitamento avalia o cumprimento das entregas operacionais essenciais no período: (1) <strong>DDSMA Diário</strong> apurado sobre os dias efetivamente trabalhados no mês (aproveitamento limitado ao teto estrito de 100%, assegurando equidade para equipes em escala 12x36/Turno Contínuo); (2) <strong>Treinamento da Equipe</strong> realizado no período; (3) <strong>APR Vigente</strong> no mês. <em>Critérios de desempate entre líderes com 100%:</em> 1º Taxa de Treinamento e capacitados na equipe; 2º Regularidade de APRs ativas; 3º Menor índice de Não Conformidades/desvios registrados na frente. A equipe da Elétrica é monitorada de forma unificada; equipes civis são acompanhadas por Encarregado de Campo; áreas administrativas são isentas das rotinas de campo.
        </div>

        <div class="rodape-assinaturas">
            <div class="box-assinatura">
                <strong>João Everton de Souza Limeira</strong><br>
                Engenheiro de Segurança do Trabalho • CREA: 0522078320<br>
                Responsável Técnico SESMT — Consórcio Ramal do Agreste
            </div>
            <div class="box-assinatura">
                <strong>Gerência de Operações e Contrato</strong><br>
                Consórcio Operador do PISF • Ramal do Agreste<br>
                Ciência da Governança Operacional de SST
            </div>
        </div>
    </div>
</body>
</html>`;

    if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
        abrirDocumentoHtmlParaImpressao(html, `Placar_Liderancas_SST_${ano}_${mesNome}`);
    } else {
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
    }
}

// ==========================================================================
// MÓDULO: HISTÓRICO COMPARATIVO & EVOLUÇÃO DAS LIDERANÇAS (CHART.JS)
// ==========================================================================

function abrirModalHistoricoPlacar(liderFrente) {
    const modal = document.getElementById('modalPlacarHistorico');
    if (!modal) return;

    // Popula o select de líderes com base no ranking atual da obra
    const selLider = document.getElementById('placarHistFiltroLider');
    if (selLider) {
        let opts = '<option value="TODOS">🌟 Média Geral da Obra</option>';
        if (placarRankingAtual && placarRankingAtual.length > 0) {
            const ordenados = [...placarRankingAtual].sort((a, b) => a.apelido.localeCompare(b.apelido));
            ordenados.forEach(l => {
                opts += `<option value="${escapeHTML(l.frenteNome)}">${escapeHTML(l.apelido)} (${escapeHTML(l.setor)})</option>`;
            });
        }
        selLider.innerHTML = opts;

        if (liderFrente && selLider.querySelector(`option[value="${liderFrente}"]`)) {
            selLider.value = liderFrente;
        } else {
            selLider.value = 'TODOS';
        }
    }

    modal.style.display = 'flex';
    atualizarGraficoHistoricoPlacar();
}

function fecharModalHistoricoPlacar() {
    const modal = document.getElementById('modalPlacarHistorico');
    if (modal) modal.style.display = 'none';
}

function obterMesesHistoricoPeriodo(anoRef, mesRef, qtdMeses) {
    const meses = [];
    for (let i = qtdMeses - 1; i >= 0; i--) {
        let m = mesRef - i;
        let a = anoRef;
        while (m < 0) {
            m += 12;
            a -= 1;
        }
        meses.push({
            ano: a,
            mes: m,
            rotuloCurto: (NOMES_MESES[m] || 'Mês').substring(0, 3) + '/' + String(a).slice(-2),
            rotuloCompleto: (NOMES_MESES[m] || 'Mês') + ' de ' + a
        });
    }
    return meses;
}

function atualizarGraficoHistoricoPlacar() {
    const anoRef = parseInt(placarFiltroAno, 10) || new Date().getFullYear();
    const mesRef = parseInt(placarFiltroMes, 10) || new Date().getMonth();
    const selPeriodo = document.getElementById('placarHistFiltroPeriodo');
    const qtdMeses = selPeriodo ? (parseInt(selPeriodo.value, 10) || 6) : 6;
    const selLider = document.getElementById('placarHistFiltroLider');
    const liderFrente = selLider ? selLider.value : 'TODOS';

    const meses = obterMesesHistoricoPeriodo(anoRef, mesRef, qtdMeses);

    // Arrays para o Chart.js e para a tabela comparativa
    const labels = meses.map(m => m.rotuloCurto);
    const dadosMediaObra = [];
    const dadosLider = [];
    const historicoDetalhado = [];

    let nomeLiderExibicao = 'Média Geral da Obra';

    meses.forEach(m => {
        const rankingMes = calcularPlacarLideres(m.ano, m.mes);
        
        // Média da obra no mês
        const soma = rankingMes.reduce((s, r) => s + r.mediaGeral, 0);
        const avgObra = rankingMes.length > 0 ? Math.round(soma / rankingMes.length) : null;
        dadosMediaObra.push(avgObra);

        if (liderFrente === 'TODOS') {
            const totalDds = rankingMes.reduce((s, r) => s + r.diasDds, 0);
            const total100 = rankingMes.filter(r => r.mediaGeral === 100).length;
            historicoDetalhado.push({
                rotulo: m.rotuloCompleto,
                posicaoStr: 'Geral da Obra',
                tendenciaStr: '▬',
                ddsStr: `${totalDds} DDS no total`,
                treinStr: `${rankingMes.length} frentes ativas`,
                aprStr: `${total100} líderes 100%`,
                mediaGeral: avgObra !== null ? avgObra : 0
            });
        } else {
            const idxLider = rankingMes.findIndex(r => r.frenteNome === liderFrente);
            if (idxLider >= 0) {
                const item = rankingMes[idxLider];
                nomeLiderExibicao = item.apelido;
                dadosLider.push(item.mediaGeral);

                const pos = idxLider + 1;
                const posStr = pos === 1 ? '🥇 1º' : pos === 2 ? '🥈 2º' : pos === 3 ? '🥉 3º' : `${pos}º de ${rankingMes.length}`;
                
                const ddsStr = item.pctDds !== null ? `${item.diasDds}/${item.metaDds}d (${item.pctDds}%)` : 'Isento';
                const treinStr = item.pctTrein !== null ? (item.pctTrein === 100 ? `✅ OK (${item.totalTreinamentos})` : '❌ Pendente') : 'Isento';
                const aprStr = item.pctApr !== null ? (item.pctApr === 100 ? `✅ Vigente (${item.totalAprsVigentes})` : '❌ Sem APR') : 'Isenta';

                historicoDetalhado.push({
                    rotulo: m.rotuloCompleto,
                    posicao: pos,
                    posicaoStr: posStr,
                    mediaGeral: item.mediaGeral,
                    ddsStr,
                    treinStr,
                    aprStr,
                    item
                });
            } else {
                dadosLider.push(null);
                historicoDetalhado.push({
                    rotulo: m.rotuloCompleto,
                    posicaoStr: 'Sem Registro',
                    tendenciaStr: '-',
                    ddsStr: '-',
                    treinStr: '-',
                    aprStr: '-',
                    mediaGeral: 0
                });
            }
        }
    });

    // Calcular tendência mês a mês para a tabela quando for líder específico
    if (liderFrente !== 'TODOS') {
        for (let i = 0; i < historicoDetalhado.length; i++) {
            if (i === 0 || !historicoDetalhado[i].posicao || !historicoDetalhado[i - 1].posicao) {
                historicoDetalhado[i].tendenciaStr = '★';
            } else {
                const diffPos = historicoDetalhado[i - 1].posicao - historicoDetalhado[i].posicao;
                if (diffPos > 0) historicoDetalhado[i].tendenciaStr = `▲ +${diffPos}`;
                else if (diffPos < 0) historicoDetalhado[i].tendenciaStr = `▼ ${diffPos}`;
                else historicoDetalhado[i].tendenciaStr = `▬ 0`;
            }
        }
    }

    // Atualiza o Resumo de Destaque no Topo
    const elResumo = document.getElementById('placarHistResumoDestaque');
    if (elResumo) {
        if (liderFrente === 'TODOS') {
            const valUltimo = dadosMediaObra[dadosMediaObra.length - 1];
            const valPrimeiro = dadosMediaObra.find(v => v !== null) || valUltimo;
            const dif = valUltimo !== null && valPrimeiro !== null ? (valUltimo - valPrimeiro) : 0;
            const cor = dif > 0 ? '#10b981' : dif < 0 ? '#ef4444' : '#4f46e5';
            const sinal = dif > 0 ? '+' : '';
            elResumo.innerHTML = `Média Geral da Obra: <strong>${valUltimo}%</strong> <span style="color:${cor}; margin-left: 6px;">(${sinal}${dif}% no período)</span>`;
        } else {
            const valsValidos = dadosLider.filter(v => v !== null);
            if (valsValidos.length >= 2) {
                const ini = valsValidos[0];
                const fim = valsValidos[valsValidos.length - 1];
                const dif = fim - ini;
                const cor = dif > 0 ? '#10b981' : dif < 0 ? '#ef4444' : '#4f46e5';
                const sinal = dif > 0 ? '+' : '';
                elResumo.innerHTML = `Evolução de <strong>${escapeHTML(nomeLiderExibicao)}</strong>: <strong style="color:${cor}; font-size:14px;">${sinal}${dif}%</strong> (de ${ini}% para ${fim}%)`;
            } else if (valsValidos.length === 1) {
                elResumo.innerHTML = `Aproveitamento Atual: <strong>${valsValidos[0]}%</strong>`;
            } else {
                elResumo.innerHTML = `Sem dados suficientes no período`;
            }
        }
    }

    // Atualiza a Tabela do Histórico (Mais recente primeiro)
    const tbody = document.getElementById('placarHistTabelaCorpo');
    if (tbody) {
        const historicoReverso = [...historicoDetalhado].reverse();
        tbody.innerHTML = historicoReverso.map(h => {
            const fillCor = h.mediaGeral >= 90 ? '#10b981' : h.mediaGeral >= 70 ? '#3b82f6' : h.mediaGeral >= 50 ? '#f59e0b' : '#ef4444';
            
            let tendBadge = `<span style="font-weight:700; color:var(--text-light);">${h.tendenciaStr || '▬'}</span>`;
            if (h.tendenciaStr && h.tendenciaStr.includes('▲')) {
                tendBadge = `<span style="font-weight:700; color:#10b981; background:rgba(16,185,129,0.12); padding:2px 8px; border-radius:12px;">${h.tendenciaStr}</span>`;
            } else if (h.tendenciaStr && h.tendenciaStr.includes('▼')) {
                tendBadge = `<span style="font-weight:700; color:#ef4444; background:rgba(239,68,68,0.12); padding:2px 8px; border-radius:12px;">${h.tendenciaStr}</span>`;
            }

            return `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 10px; font-weight: 700; color: var(--text);">${escapeHTML(h.rotulo)}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 700;">${h.posicaoStr}</td>
                    <td style="padding: 10px; text-align: center;">${tendBadge}</td>
                    <td style="padding: 10px; text-align: center; font-size: 11.5px;">${h.ddsStr}</td>
                    <td style="padding: 10px; text-align: center; font-size: 11.5px;">${h.treinStr}</td>
                    <td style="padding: 10px; text-align: center; font-size: 11.5px;">${h.aprStr}</td>
                    <td style="padding: 10px; text-align: right;">
                        <span style="font-weight: 800; font-size: 13px; color: ${fillCor};">${h.mediaGeral}%</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Renderizar ou atualizar gráfico Chart.js
    const canvas = document.getElementById('canvasPlacarHistorico');
    if (!canvas) return;

    if (placarChartHistoricoInstance) {
        placarChartHistoricoInstance.destroy();
        placarChartHistoricoInstance = null;
    }

    const datasets = [];

    // Dataset da Média da Obra
    if (liderFrente === 'TODOS') {
        datasets.push({
            label: 'Média Geral da Obra (%)',
            data: dadosMediaObra,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#4f46e5'
        });
    } else {
        datasets.push({
            label: 'Média Geral da Obra (Referência)',
            data: dadosMediaObra,
            borderColor: '#94a3b8',
            borderDash: [6, 6],
            borderWidth: 2,
            fill: false,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#94a3b8'
        });
        datasets.push({
            label: `${nomeLiderExibicao} (%)`,
            data: dadosLider,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 7,
            pointHoverRadius: 10,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointBorderWidth: 3
        });
    }

    const ctx = canvas.getContext('2d');
    placarChartHistoricoInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 14,
                        font: { size: 12, weight: 'bold' },
                        color: '#475569'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            return `${context.dataset.label}: ${val !== null ? val + '%' : 'Sem dados'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: val => val + '%',
                        font: { size: 11, weight: '600' }
                    },
                    grid: {
                        color: 'rgba(203, 213, 225, 0.4)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11, weight: '600' }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
