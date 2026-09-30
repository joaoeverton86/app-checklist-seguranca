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
        'DEYLON': { ativo: true, exige_dds: true, exige_treinamento: true, exige_apr: true, setor: 'OPERAÇÃO', apelido: 'Deylon (Operação)' },
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
}

async function abrirPaginaPlacarLideres() {
    await garantirDadosPlacarLideres();
    popularFiltrosPlacar();
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
    
    // Meta de DDS para o mês: customizada ou dias úteis
    const diasUteisPadrao = calcularDiasUteisMes(ano, mes);
    const metaDds = (placarMetaDiasCustom && placarMetaDiasCustom > 0) ? placarMetaDiasCustom : diasUteisPadrao;

    // Atualiza input de meta na tela caso esteja visível
    const metaInput = document.getElementById('placarMetaDiasDds');
    if (metaInput && document.activeElement !== metaInput) {
        metaInput.value = metaDds;
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

    // Todas as frentes que existem no sistema ou configuradas
    const frentesIdentificadas = new Set([
        ...Array.from(equipePorLider.keys()),
        ...Object.keys(configFrentes)
    ]);

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

        // ----------------------------------------------------
        // 1. ROTINA: DDSMA
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
            pctDds = Math.min(100, Math.round((diasDds / metaDds) * 100));

            if (diasDds >= metaDds) statusDds = 'sucesso';
            else if (diasDds >= Math.ceil(metaDds * 0.7)) statusDds = 'alerta';
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
            // DDS
            diasDds,
            metaDds,
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
            // Geral
            mediaGeral
        });
    });

    // Ordenação do Ranking:
    // 1º Maior Índice Geral
    // 2º Mais dias de DDS realizados
    // 3º Mais colaboradores treinados
    // 4º Nome
    ranking.sort((a, b) => {
        if (b.mediaGeral !== a.mediaGeral) return b.mediaGeral - a.mediaGeral;
        if (b.diasDds !== a.diasDds) return b.diasDds - a.diasDds;
        if (b.totalColabsTreinados !== a.totalColabsTreinados) return b.totalColabsTreinados - a.totalColabsTreinados;
        return a.apelido.localeCompare(b.apelido);
    });

    return ranking;
}

function renderPlacarLideres() {
    const ano = parseInt(placarFiltroAno, 10) || new Date().getFullYear();
    const mes = parseInt(placarFiltroMes, 10) || new Date().getMonth();

    const rankingCompleto = calcularPlacarLideres(ano, mes);
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

    // Renderizar Pódio dos 3 Campeões (Top 3)
    renderPlacarPodio(rankingCompleto.slice(0, 3));

    // Filtragem local para exibição na tabela (Setor + Busca de texto)
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

    renderPlacarTabela(rankingFiltrado, rankingCompleto);
}

function renderPlacarPodio(top3) {
    const podioContainer = document.getElementById('placarPodioGrid');
    if (!podioContainer) return;

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

        const ddsTexto = lider.pctDds !== null ? (lider.diasDds + '/' + lider.metaDds + ' dias') : 'Isento';
        const treinTexto = lider.pctTrein !== null ? (lider.pctTrein === 100 ? '✅ Realizado' : '❌ Pendente') : 'Isento';
        const aprTexto = lider.pctApr !== null ? (lider.pctApr === 100 ? '✅ Vigente' : '❌ Pendente') : 'Isenta';

        return `
            <div class="placar-podio-card ${cls}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="podio-badge-medalha">${med}</div>
                    <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">${titPos}</span>
                </div>
                <div>
                    <div class="podio-lider-nome">${escapeHTML(lider.apelido)}</div>
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

function renderPlacarTabela(rankingFiltrado, rankingCompleto) {
    const tbody = document.getElementById('placarRankingTableBody');
    const totalEl = document.getElementById('placarTotalAvaliados');
    if (totalEl) totalEl.textContent = `Mostrando ${rankingFiltrado.length} de ${rankingCompleto.length} frentes ativas`;

    if (!tbody) return;

    if (rankingFiltrado.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-light);">Nenhum encarregado encontrado com os filtros atuais.</td></tr>';
        return;
    }

    tbody.innerHTML = rankingFiltrado.map(lider => {
        // Posição no ranking geral global (não só filtrado)
        const posGlobal = rankingCompleto.findIndex(r => r.frenteNome === lider.frenteNome) + 1;
        const medalha = posGlobal === 1 ? '🥇' : posGlobal === 2 ? '🥈' : posGlobal === 3 ? '🥉' : `${posGlobal}º`;

        // Cores da barra de progresso geral
        const fillClass = lider.mediaGeral >= 90 ? 'fill-verde'
            : lider.mediaGeral >= 70 ? 'fill-azul'
            : lider.mediaGeral >= 50 ? 'fill-amarelo'
            : 'fill-vermelho';

        // Badges das entregas
        let chipDds;
        if (lider.pctDds === null) {
            chipDds = '<span class="placar-status-chip chip-isento">⚪ Isento</span>';
        } else if (lider.statusDds === 'sucesso') {
            chipDds = `<span class="placar-status-chip chip-sucesso">🟢 ${lider.diasDds}/${lider.metaDds}d (100%)</span>`;
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
                <td class="placar-posicao">${medalha}</td>
                <td>
                    <div class="placar-lider-cell">
                        <span class="placar-lider-title">${escapeHTML(lider.apelido)}</span>
                        <span class="placar-lider-sub">Equipe: ${lider.totalEquipe} pessoas ativas</span>
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
                        <span style="font-weight: 800; font-size: 13.5px; width: 44px; text-align: right;">${lider.mediaGeral}%</span>
                    </div>
                </td>
                <td style="text-align: right;">
                    <button class="placar-btn-msg" onclick="abrirModalMsgLider('${escapeHTML(lider.frenteNome)}')" title="Enviar mensagem privada para este encarregado">
                        <span>📲</span> WhatsApp
                    </button>
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
    if (setorSel) placarFiltroSetor = setorSel.value;

    renderPlacarLideres();
}

function onPlacarMetaDiasChange() {
    const metaInput = document.getElementById('placarMetaDiasDds');
    if (metaInput) {
        const val = parseInt(metaInput.value, 10);
        placarMetaDiasCustom = (!isNaN(val) && val > 0) ? val : null;
        renderPlacarLideres();
    }
}

function onPlacarBuscaInput(val) {
    placarBuscaTermo = val.trim();
    renderPlacarLideres();
}

// ----------------------------------------------------
// COMPARTILHAMENTO: WHATSAPP DO GRUPO (RANKING COMPLETO)
// ----------------------------------------------------
function copiarRankingWhatsApp() {
    if (!placarRankingAtual || placarRankingAtual.length === 0) {
        alert('Nenhum dado calculado para o período.');
        return;
    }

    const ano = placarFiltroAno;
    const mesNome = NOMES_MESES[parseInt(placarFiltroMes, 10)] || 'Mês';

    let texto = `🏆 *PLACAR DAS LIDERANÇAS DE SST — RAMAL DO AGRESTE*\n`;
    texto += `📅 *Período de Avaliação:* ${mesNome} / ${ano}\n`;
    texto += `🎯 *Rotinas Obrigatórias:* DDSMA Diário + Treinamento Mensal + APR Vigente\n`;
    texto += `-----------------------------------------\n\n`;

    placarRankingAtual.forEach((lider, idx) => {
        const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `*${idx + 1}º*`;
        const ddsTxt = lider.pctDds !== null ? `DDS: ${lider.diasDds}/${lider.metaDds}d (${lider.pctDds}%)` : 'DDS: Isento';
        const treinTxt = lider.pctTrein !== null ? (lider.pctTrein === 100 ? 'Trein: OK' : 'Trein: Pendente') : 'Trein: Isento';
        const aprTxt = lider.pctApr !== null ? (lider.pctApr === 100 ? 'APR: OK' : 'APR: Pendente') : 'APR: Isenta';

        texto += `${medalha} *${lider.apelido}* (${lider.setor})\n`;
        texto += `   📊 Aproveitamento: *${lider.mediaGeral}%* | ${ddsTxt} | ${treinTxt} | ${aprTxt}\n\n`;
    });

    const soma = placarRankingAtual.reduce((s, r) => s + r.mediaGeral, 0);
    const mediaGeral = Math.round(soma / placarRankingAtual.length);

    texto += `-----------------------------------------\n`;
    texto += `📈 *Índice Geral de Entregas da Obra:* *${mediaGeral}%*\n`;
    texto += `👏 Parabéns a todos os encarregados pelo compromisso diário com a vida e segurança das equipes!\n`;
    texto += `_Engenharia de Segurança do Trabalho - COP Ramal do Agreste_`;

    navigator.clipboard.writeText(texto).then(() => {
        alert('📋 Ranking formatado copiado com sucesso! Já pode colar no grupo de WhatsApp da Gerência e Encarregados.');
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

    // Todas as frentes conhecidas no sistema
    const frentesSet = new Set(Object.keys(configFrentes));
    (allEfetivo || []).forEach(e => {
        if (colaboradorEstaAtivo(e) && e.responsavel) {
            const f = typeof resolverFrenteDds === 'function' ? resolverFrenteDds(e.responsavel) : e.responsavel;
            frentesSet.add(f);
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
            </tr>
        `;
    }).join('');

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

        novasFrentes[frente] = {
            ativo: chkAtivo.checked,
            apelido: apelido,
            setor: (allRotinasConfig.frentes && allRotinasConfig.frentes[frente] && allRotinasConfig.frentes[frente].setor) || '',
            exige_dds: exigeDds,
            exige_treinamento: exigeTrein,
            exige_apr: exigeApr
        };
    });

    const novaConfig = {
        meta_dias_dds_padrao: placarMetaDiasCustom,
        frentes: novasFrentes
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
// IMPRESSÃO / RELATÓRIO DO PLACAR DE LIDERANÇAS
// ----------------------------------------------------
function imprimirPlacarLideres() {
    window.print();
}
