// ==============================================================================
// MODULO: MOTOR TECNICO APR (5X5), TEMPLATES DE APR E COMISSAO CIPA (NR-05)
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================

// ============================================
// APR (Análise Preliminar de Risco) - mesmo modelo real anexado pelo usuário (3 blocos:
// cabeçalho+matriz de risco, EPI/EPC+emergência, ciência dos executantes+aprovação).
// Matriz 5×5 (Probabilidade × Severidade) conforme ISO 31010/BS 8800, hierarquia de
// controle conforme NR-01, checkboxes de atividades críticas cobrindo NR-35/NR-33/
// NR-10/NR-18/NR-12. Impressão por encarregado/equipe (mesma técnica de Ficha de EPI e
// Registro de Treinamento - reusa equipeDaFrente()). Validade padrão 15 dias (pedido
// explícito do usuário), mas editável por APR.
// ============================================
let allAprRegistros = [];
let aprLoaded = false;
let aprRiscosForm = [];
let aprItemExpandidoId = null;

// Faixas de classificação da matriz 5×5 da APR, padronizadas pelo usuário em
// 03/09/2026: 1-4 Baixo, 5-9 Moderado, 10-16 Alto, 17-25 Crítico. Cores só de
// referência visual, não são um limite normativo. Essa é a matriz de campo genérica da
// APR (não ligada a um documento específico) - diferente da Matriz de Risco do GHE, que
// usa a tabela oficial da AIHA do PGR (ver GHE_MATRIZ_NIVEIS, mais abaixo no arquivo).
function nivelRiscoApr(p, s) {
    const pNum = parseInt(p, 10);
    const sNum = parseInt(s, 10);
    if (!pNum || !sNum) return { valor: null, label: '—', cor: '#888', bg: '#f0f0f0' };
    const valor = pNum * sNum;
    if (valor <= 4) return { valor, label: 'Baixo', cor: '#1a7f4b', bg: '#e6f7ee' };
    if (valor <= 9) return { valor, label: 'Moderado', cor: '#b78a00', bg: '#fff9e6' };
    if (valor <= 16) return { valor, label: 'Alto', cor: '#c2650a', bg: '#fef1e0' };
    return { valor, label: 'Crítico', cor: '#c0392b', bg: '#fdf2f2' };
}

// Âncoras descritivas dos níveis 1-5, usadas como tooltip (title) em cada opção dos
// selects de P/S - resolve a dúvida real relatada em campo ("qual peso colocar?") sem
// precisar de outra tela; o resumo curto também aparece fixo acima da matriz no HTML.
// Critério padronizado pelo usuário em 03/09/2026.
const APR_ANCORAS_P = {
    1: 'Raro — pode ocorrer apenas em circunstâncias excepcionais',
    2: 'Improvável — pode ocorrer eventualmente',
    3: 'Possível — pode ocorrer em algum momento',
    4: 'Provável — provavelmente ocorrerá na maioria das circunstâncias',
    5: 'Frequente — espera-se que ocorra com frequência'
};
const APR_ANCORAS_S = {
    1: 'Lesão leve sem afastamento — primeiros socorros, sem afastamento do trabalho',
    2: 'Lesão com atendimento ambulatorial — atendimento médico, sem afastamento',
    3: 'Lesão com afastamento — atendimento médico com afastamento do trabalho',
    4: 'Lesão grave/incapacitante — lesão grave ou com incapacidade/invalidez permanente',
    5: 'Fatalidade — óbito'
};

// Status calculado ao vivo a partir de validade_ate (mesmo padrão de ASO/Treinamentos -
// não fica um campo "status" salvo que pode ficar desatualizado sozinho).
function statusApr(apr) {
    if (!apr.validade_ate) return { status: 'sem_validade', diffDays: null };
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const ate = parseLocalDate(apr.validade_ate); ate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((ate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'vencida', diffDays };
    if (diffDays <= 5) return { status: 'vencendo', diffDays };
    return { status: 'ativa', diffDays };
}

async function loadAprData() {
    try {
        allAprRegistros = await supabaseFetch('apr_registros', '?select=*');
        await garantirDocumentosControleCarregados();
        // A datalist de frentes só era populada ao visitar Treinamentos > Equipes -
        // quem entrava direto em APR via menu lateral achava o campo Frente/Encarregado
        // vazio (reportado em campo). Garante allEfetivo carregado e popula aqui também.
        if (allEfetivo.length === 0) { efetivoLoaded = true; await loadEfetivoData(); }
        popularEquipesResponsavelDatalist();
        renderAprPanel();
        renderAprHistoricoLista();
    } catch (err) {
        console.error('Erro ao carregar dados de APR:', err);
    }
}

let allAprAuditLog = [];

// Busca o histórico de alterações de todas as APRs de uma vez (mesma tabela audit_log que
// o app de celular já usa) - carregado só quando a aba Histórico é aberta, não no
// carregamento inicial do painel, pra não pesar à toa em quem nunca abre essa aba.
async function carregarAprAuditLog() {
    try {
        allAprAuditLog = await supabaseFetch('audit_log', '?table_name=eq.apr_registros&select=*&order=created_at.desc&limit=1000');
    } catch (e) {
        console.error('Erro ao carregar histórico de alterações da APR:', e);
        allAprAuditLog = [];
    }
}

let allAprModelos = [];

// Modelos de APR reutilizáveis - tabela SEPARADA de apr_registros, carregada só quando a
// aba "Modelos" é aberta. Nunca entra em KPI/gráfico/histórico de APR real nenhum.
async function carregarAprModelos() {
    try {
        allAprModelos = await supabaseFetch('apr_modelos', '?select=*&order=titulo.asc');
    } catch (e) {
        console.error('Erro ao carregar modelos de APR:', e);
        allAprModelos = [];
    }
}

async function showAprSubtab(tab) {
    ['visao', 'nova', 'historico', 'modelos'].forEach(t => {
        const content = document.getElementById('aprSubtab-' + t);
        const btn = document.getElementById('aprSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderAprPanel();
    if (tab === 'historico') { await carregarAprAuditLog(); renderAprHistoricoLista(); }
    if (tab === 'modelos') { await carregarAprModelos(); renderAprModelosLista(); }
}

// ================================================================
// MÓDULO APR — MOTOR DE INTELIGÊNCIA, AUTOMAÇÃO DE P/S E INTEGRAÇÕES
// Automatiza a determinação de Probabilidade (P), Severidade (S),
// Risco Puro e Risco Residual, e integra com a equipe executante e treinamentos.
// ================================================================

// 1. Motor de Inferência Técnica de SST para APR (Matriz 5x5 COP Ramal)
function inferirPsApr(passo, perigo, evento, danos) {
    const texto = `${passo || ''} ${perigo || ''} ${evento || ''} ${danos || ''}`.toLowerCase();

    let sPuro = 3; // Moderado por padrão (lesão com afastamento temporário)
    let pPuro = 3; // Possível por padrão

    // Alta criticidade / Fatalidade / Invalidez permanente (S = 5)
    if (/morte|óbito|fatalidade|eletrocuss|alta tensão|sep|asfixia|soterramento|desabamento|explosão/.test(texto)) {
        sPuro = 5;
        pPuro = 3;
    }
    // Severidade 4: Trabalho em Altura, Espaço Confinado, Cargas Suspensas, Prensamento grave, Atropelamento por máquina pesada
    else if (/queda de altura|queda em altura|espaço confinado|içamento|guindaste|munck|tombamento|atropelamento|máquina pesada|prensamento|amputação|fratura|esmagamento|fogo|incêndio|linha de vida|andaime|rompimento de cabo/.test(texto)) {
        sPuro = 4;
        pPuro = 3;
    }
    // Severidade 3: Cortes, projeção de partículas, queimaduras, picada de peçonhentos, produtos químicos
    else if (/corte|perfuração|projeção|fagulha|corpo estranho|solda|picada|peçonhent|químico|inalação|intoxicação|queimadura/.test(texto)) {
        sPuro = 3;
        pPuro = 3;
    }
    // Severidade 2: Ruído, poeira, vibração, calor solar, esforço físico, ergonomia, tropeço/escorregão de mesmo nível
    else if (/ruído|barulho|poeira|particulado|vibração|calor|solar|postura|lombar|fadiga|ergonom|peso excessivo|tropeço|escorregão|mesmo nível/.test(texto)) {
        sPuro = 2;
        pPuro = 4; // Frequente na rotina
    }

    // Cálculo do Risco Residual baseado na Hierarquia de Medidas de Proteção (NR-01)
    // Com adoção de EPCs, procedimentos de bloqueio, linha de vida, sinalização e EPIs:
    let pResidual = 1;
    let sResidual = sPuro;

    if (sPuro === 5) {
        sResidual = 3; // Atenuado com barreiras de engenharia e plano de emergência
        pResidual = 1; // Raro com sistemas redundantes
    } else if (sPuro >= 3) {
        sResidual = Math.max(1, sPuro - 1);
        pResidual = 1;
    } else {
        sResidual = 1;
        pResidual = 1;
    }

    return { pPuro, sPuro, pResidual, sResidual };
}

// Calibra um risco individual
function autoCalibrarRiscoIndividual(i) {
    if (!aprRiscosForm[i]) return;
    const r = aprRiscosForm[i];
    const inf = inferirPsApr(r.passo_tarefa, r.perigo_fonte, r.evento_risco, r.danos_provaveis);
    r.p_puro = inf.pPuro;
    r.s_puro = inf.sPuro;
    r.p_residual = inf.pResidual;
    r.s_residual = inf.sResidual;
    renderRiscosAprForm();
}

// Calibra todos os riscos da APR de uma vez só
function autoCalibrarTodosRiscosApr() {
    if (!aprRiscosForm || aprRiscosForm.length === 0) return;
    let count = 0;
    aprRiscosForm.forEach(r => {
        if ((r.passo_tarefa || '').trim() || (r.perigo_fonte || '').trim() || (r.evento_risco || '').trim()) {
            const inf = inferirPsApr(r.passo_tarefa, r.perigo_fonte, r.evento_risco, r.danos_provaveis);
            r.p_puro = inf.pPuro;
            r.s_puro = inf.sPuro;
            r.p_residual = inf.pResidual;
            r.s_residual = inf.sResidual;
            count++;
        }
    });
    renderRiscosAprForm();
    if (typeof showToast === 'function') {
        showToast(`🪄 ${count} risco(s) calibrados automaticamente!`);
    } else {
        const st = document.getElementById('aprFormStatus');
        if (st) {
            st.textContent = `✅ ${count} risco(s) calibrados com P/S Puro e Residual automáticos.`;
            st.style.color = 'var(--success)';
        }
    }
}

// Ao alterar P ou S Puro manualmente, ajusta automaticamente o Residual caso não tenha sido alterado
function onMudarPuroApr(i, campo, valor) {
    if (!aprRiscosForm[i]) return;
    aprRiscosForm[i][campo] = valor;
    
    const pPuro = parseInt(aprRiscosForm[i].p_puro, 10);
    const sPuro = parseInt(aprRiscosForm[i].s_puro, 10);

    // Se ambos P e S Puro estiverem preenchidos, sugere automaticamente o Residual reduzido
    if (pPuro && sPuro) {
        if (!aprRiscosForm[i].p_residual || aprRiscosForm[i].p_residual >= pPuro) {
            aprRiscosForm[i].p_residual = Math.max(1, Math.min(2, pPuro - 2));
        }
        if (!aprRiscosForm[i].s_residual || aprRiscosForm[i].s_residual >= sPuro) {
            aprRiscosForm[i].s_residual = sPuro === 5 ? 3 : Math.max(1, sPuro - 1);
        }
    }
    renderRiscosAprForm();
}

// 2. Biblioteca de Riscos Padrão da Obra Pesada (Ramal do Agreste)
const BIBLIOTECA_RISCOS_OBRA = [
    {
        categoria: "🚧 Escavação de Vala e Movimentação de Terra",
        riscos: [
            {
                passo_tarefa: "Escavação mecânica de vala com escavadeira",
                perigo_fonte: "Tráfego de máquina pesada e desmoronamento de talude",
                evento_risco: "Tombamento de escavadeira ou desabamento das paredes da vala",
                danos_provaveis: "Soterramento, fraturas múltiplas, traumatismo, asfixia",
                p_puro: 3, s_puro: 4,
                medidas_prevencao: "Respeitar ângulo de talude natural ou implantar escoramento/blindagem metálica de vala; isolar raio de giro da máquina (mín. 1,5m da borda); proibir presença de trabalhadores no fundo da vala durante a operação da concha.",
                p_residual: 1, s_residual: 2, responsavel: "Encarregado / Operador"
            },
            {
                passo_tarefa: "Acesso e permanência de colaboradores no interior da vala",
                perigo_fonte: "Vala profunda sem escada de emergência e material na borda",
                evento_risco: "Queda de material da borda sobre o trabalhador ou dificuldade de evacuação",
                danos_provaveis: "Traumatismo craniano, cortes, contusões",
                p_puro: 4, s_puro: 3,
                medidas_prevencao: "Manter bota-fora de material a no mínimo 1,0 metro da borda da vala; instalar escadas de acesso a cada 15 metros; uso obrigatório de capacete com jugular e botina com biqueira.",
                p_residual: 1, s_residual: 2, responsavel: "Encarregado"
            }
        ]
    },
    {
        categoria: "🏗️ Içamento e Cargas Críticas (Guindaste / Caminhão Munck)",
        riscos: [
            {
                passo_tarefa: "Patolamento e posicionamento do caminhão guindauto (Munck)",
                perigo_fonte: "Terreno irregular, solo instável ou patolamento incompleto",
                evento_risco: "Afundamento de patola e tombamento do veículo com carga",
                danos_provaveis: "Esmagamento de trabalhadores, danos patrimoniais graves, fatalidade",
                p_puro: 3, s_puro: 5,
                medidas_prevencao: "Patolamento 100% aberto com utilização de pranchões de madeira de apoio nivelados; inspeção prévia da compactação do solo; proibição de patolar próximo a bordas de taludes sem ART.",
                p_residual: 1, s_residual: 3, responsavel: "Operador de Munck / Rigger"
            },
            {
                passo_tarefa: "Amarração, içamento e movimentação de tubos de grande diâmetro",
                perigo_fonte: "Cintas desgastadas, cabo de aço desfiado ou sobrecarga",
                evento_risco: "Rompimento do dispositivo de içamento e queda da carga suspensa",
                danos_provaveis: "Esmagamento, amputação, lesões incapacitantes, óbito",
                p_puro: 3, s_puro: 5,
                medidas_prevencao: "Inspeção diária de cintas e laços com tag de cor do mês; uso obrigatório de corda-guia para direcionamento da carga (proibido tocar com as mãos); isolamento e sinalização total do raio de içamento.",
                p_residual: 1, s_residual: 2, responsavel: "Rigger / Sinaleiro"
            }
        ]
    },
    {
        categoria: "🪜 Trabalho em Altura (Andaime, Plataforma e Escada)",
        riscos: [
            {
                passo_tarefa: "Montagem, subida e execução de serviços em andaimes ou estruturas elevadas (> 2,0m)",
                perigo_fonte: "Falta de ponto de ancoragem, piso incompleto ou ausência de guarda-corpo",
                evento_risco: "Queda de colaborador em altura ou queda de ferramentas sobre terceiros",
                danos_provaveis: "Politraumantismo, lesão na coluna vertebral, fraturas graves, óbito",
                p_puro: 4, s_puro: 5,
                medidas_prevencao: "Uso mandatório de cinto tipo paraquedista com talabarte duplo em Y ancorado 100% do tempo em linha de vida ou estrutura aprovada; piso do andaime 100% forrado com rodapé de 20cm e guarda-corpo duplo (1,20m e 0,70m); amarração de todas as ferramentas manuais.",
                p_residual: 1, s_residual: 2, responsavel: "Supervisor NR-35"
            }
        ]
    },
    {
        categoria: "⚡ Eletricidade e Instalações Provisórias de Canteiro (NR-10)",
        riscos: [
            {
                passo_tarefa: "Ligação e manobra em quadros elétricos de distribuição (QGBT)",
                perigo_fonte: "Partes vivas desprotegidas, cabos danificados e ausência de aterramento",
                evento_risco: "Choque elétrico, arco voltaico, queimaduras térmicas",
                danos_provaveis: "Fibrilação ventricular, queimaduras de 2º e 3º grau, morte por eletrocussão",
                p_puro: 3, s_puro: 5,
                medidas_prevencao: "Atividade exclusiva para eletricistas qualificados e autorizados com NR-10 e SEP; desenergização prévia com bloqueio LOTO e teste de ausência de tensão; uso de vestimenta antichama 100% algodão ou ATPV, luva isolante e óculos contra arco elétrico.",
                p_residual: 1, s_residual: 2, responsavel: "Eletricista / Encarregado Elétrica"
            }
        ]
    },
    {
        categoria: "🔥 Trabalho a Quente (Solda, Oxicorte e Esmerilhamento)",
        riscos: [
            {
                passo_tarefa: "Corte e soldagem de tubulações e estruturas metálicas",
                perigo_fonte: "Projeção de fagulhas incandescentes, gases comprimidos e radiação UV",
                evento_risco: "Incêndio em vegetação/materiais combustíveis ou queimadura ocular/dérmica",
                danos_provaveis: "Queimaduras, incêndio florestal/canteiro, ceratite ocular, asfixia",
                p_puro: 4, s_puro: 4,
                medidas_prevencao: "Limpeza e umedecimento do solo num raio de 10 metros; instalação de biombos incombustíveis de proteção; extintor de incêndio ABC/PQS pressurizado ao lado da frente de serviço; uso de máscara de solda com lente adequada, avental, mangote e perneira de raspa.",
                p_residual: 1, s_residual: 2, responsavel: "Soldador / Vigia de Fogo"
            }
        ]
    },
    {
        categoria: "🕳️ Espaço Confinado (Adutora, Caixa de Válvula, Poço) (NR-33)",
        riscos: [
            {
                passo_tarefa: "Entrada e permanência no interior de adutora ou caixa de transição",
                perigo_fonte: "Atmosfera deficiente de O₂ (< 19,5%) ou enriquecida com gases tóxicos (H₂S, CO, LEL)",
                evento_risco: "Asfixia súbita, perda de consciência, intoxicação aguda",
                danos_provaveis: "Parada cardiorrespiratória, dano neurológico irreversível, óbito",
                p_puro: 3, s_puro: 5,
                medidas_prevencao: "Emissão obrigatória de PET (Permissão de Entrada e Trabalho); teste atmosférico prévio contínuo com detector multigás calibrado; ventilação forçada contínua (insuflador/exaustor); vigia dedicado e permanente na entrada com tripé e guincho de resgate.",
                p_residual: 1, s_residual: 3, responsavel: "Supervisor de Entrada / Vigia NR-33"
            }
        ]
    }
];

// Inserir pacote de riscos da biblioteca
function inserirPacoteRiscosDaBiblioteca(idxCat) {
    const cat = BIBLIOTECA_RISCOS_OBRA[idxCat];
    if (!cat) return;
    
    // Se o primeiro risco estiver vazio, remove ele antes de adicionar
    if (aprRiscosForm.length === 1 && !aprRiscosForm[0].perigo_fonte && !aprRiscosForm[0].passo_tarefa) {
        aprRiscosForm = [];
    }

    cat.riscos.forEach(r => {
        aprRiscosForm.push({ ...r });
    });

    renderRiscosAprForm();
    fecharModalBibliotecaRiscos();
    if (typeof showToast === 'function') {
        showToast(`✅ ${cat.riscos.length} risco(s) adicionados da categoria "${cat.categoria}"!`);
    }
}

// 3. Duplicação de APR com 1 Clique
function duplicarAprComoNova(id) {
    const a = allAprRegistros.find(x => x.id === id);
    if (!a) return;

    showAprSubtab('nova');
    abrirFormNovaApr();

    // Novo número sequencial
    document.getElementById('aprForm_numero').value = proximoNumeroApr();
    const hojeStr = new Date().toISOString().slice(0, 10);
    document.getElementById('aprForm_dataEmissao').value = hojeStr;
    document.getElementById('aprForm_validadeDias').value = a.validade_dias || 15;
    onAprDataOuValidadeChange();

    document.getElementById('aprForm_empresa').value = a.empresa_contratada || 'CONSÓRCIO OPERADOR DO PISF RAMAL DO AGRESTE';
    document.getElementById('aprForm_setor').value = a.setor_unidade || '';
    document.getElementById('aprForm_local').value = a.local_especifico || '';
    document.getElementById('aprForm_ptNumero').value = a.pt_numero || '';
    document.getElementById('aprForm_responsavel').value = a.responsavel || '';
    document.getElementById('aprForm_titulo').value = a.titulo || '';
    document.getElementById('aprForm_descricaoAtividade').value = a.descricao_atividade || '';

    // Atividades críticas
    const ativCriticas = Array.isArray(a.atividades_criticas) ? a.atividades_criticas : [];
    document.querySelectorAll('.aprAtivCriticaCheckbox').forEach(cb => { cb.checked = ativCriticas.includes(cb.value); });
    const outros = ativCriticas.find(x => x.startsWith('Outros:'));
    document.getElementById('aprForm_outrosCheck').checked = !!outros;
    document.getElementById('aprForm_outrosTexto').value = outros ? outros.replace(/^Outros:\s*/, '') : '';

    // EPIs Básicos e Específicos
    const episBasicos = Array.isArray(a.epis_basicos) ? a.epis_basicos : [];
    document.querySelectorAll('.aprEpiBasicoCheckbox').forEach(cb => { cb.checked = episBasicos.includes(cb.value); });
    document.getElementById('aprForm_luvaTipo').value = a.epi_luva_tipo || '';

    const episEspecificos = Array.isArray(a.epis_especificos) ? a.epis_especificos : [];
    document.querySelectorAll('.aprEpiEspecificoCheckbox').forEach(cb => { cb.checked = episEspecificos.includes(cb.value); });
    document.getElementById('aprForm_extintorTipo').value = a.epi_extintor_tipo || '';

    // Plano de Emergência
    document.getElementById('aprForm_rotaFuga').value = a.rota_fuga_desobstruida || 'sim';
    document.getElementById('aprForm_pontoEncontro').value = a.ponto_encontro || '';
    document.getElementById('aprForm_kitSocorros').checked = a.kit_primeiros_socorros !== false;
    document.getElementById('aprForm_socorrista').value = a.socorrista_brigadista || '';
    document.getElementById('aprForm_contatoAmbulatorio').value = a.contato_ambulatorio || '';
    document.getElementById('aprForm_contatoBombeiros').value = a.contato_bombeiros || '';

    // Responsáveis
    document.getElementById('aprForm_elaborador').value = a.elaborador_sesmt || 'JOÃO EVERTON DE SOUZA LIMEIRA';
    document.getElementById('aprForm_supervisor').value = a.supervisor_tarefa || '';
    document.getElementById('aprForm_responsavelArea').value = a.responsavel_area || '';

    // Riscos copiados com P e S
    aprRiscosForm = Array.isArray(a.riscos) ? JSON.parse(JSON.stringify(a.riscos)) : [rowRiscoVazio()];
    renderRiscosAprForm();

    // Renderizar painel de equipe
    renderEquipeAprPreview();

    document.getElementById('aprFormTitle').textContent = `➕ Nova APR (Duplicada a partir da APR ${escapeHTML(a.id)})`;
    document.getElementById('aprFormTitle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    renderEquipeAprPreview();
}

// 4. Painel de Visualização de Equipe & Checagem de Treinamentos Obrigatórios
function renderEquipeAprPreview() {
    const container = document.getElementById('aprFormEquipeContainer');
    if (!container) return;

    const responsavel = (document.getElementById('aprForm_responsavel')?.value || '').trim();
    if (!responsavel) {
        container.style.display = 'none';
        return;
    }

    const equipe = typeof equipeDaFrente === 'function' ? equipeDaFrente(responsavel) : [];
    if (equipe.length === 0) {
        container.style.display = 'block';
        container.innerHTML = `
            <div style="font-size:12px; color:var(--text-light); display:flex; align-items:center; gap:6px;">
                <span>ℹ️</span> Nenhum colaborador ativo encontrado vinculado ao responsável "${escapeHTML(responsavel)}".
            </div>`;
        return;
    }

    // Verificar atividades críticas marcadas para checar treinamentos obrigatórios
    const ativCriticas = Array.from(document.querySelectorAll('.aprAtivCriticaCheckbox:checked')).map(cb => cb.value);
    const requerNR35 = ativCriticas.some(a => a.includes('NR-35'));
    const requerNR33 = ativCriticas.some(a => a.includes('NR-33'));
    const requerNR10 = ativCriticas.some(a => a.includes('NR-10'));

    let alertasTreinamento = [];

    const linhasHtml = equipe.map((c, i) => {
        let tagsAptidao = '';

        if (requerNR35) {
            const t35 = (allTreinamentosStatus || []).find(t => t.matricula === c.id && (t.codigo === 'NR-35' || (t.nome_curso || '').includes('NR-35')));
            const valido = t35 && (!t35.data_proxima_reciclagem || parseLocalDate(t35.data_proxima_reciclagem) >= new Date());
            if (valido) {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#d1fae5; color:#065f46; font-weight:700;">✅ NR-35</span> `;
            } else {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#fee2e2; color:#b91c1c; font-weight:700;">⚠️ Sem NR-35</span> `;
                alertasTreinamento.push(`<b>${c.nome}</b> está sem treinamento válido de <b>NR-35 (Altura)</b>.`);
            }
        }

        if (requerNR33) {
            const t33 = (allTreinamentosStatus || []).find(t => t.matricula === c.id && (t.codigo === 'NR-33' || (t.nome_curso || '').includes('NR-33')));
            const valido = t33 && (!t33.data_proxima_reciclagem || parseLocalDate(t33.data_proxima_reciclagem) >= new Date());
            if (valido) {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#d1fae5; color:#065f46; font-weight:700;">✅ NR-33</span> `;
            } else {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#fee2e2; color:#b91c1c; font-weight:700;">⚠️ Sem NR-33</span> `;
                alertasTreinamento.push(`<b>${c.nome}</b> está sem treinamento válido de <b>NR-33 (Espaço Confinado)</b>.`);
            }
        }

        if (requerNR10) {
            const t10 = (allTreinamentosStatus || []).find(t => t.matricula === c.id && (t.codigo === 'NR-10' || (t.nome_curso || '').includes('NR-10')));
            const valido = t10 && (!t10.data_proxima_reciclagem || parseLocalDate(t10.data_proxima_reciclagem) >= new Date());
            if (valido) {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#d1fae5; color:#065f46; font-weight:700;">✅ NR-10</span> `;
            } else {
                tagsAptidao += `<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#fee2e2; color:#b91c1c; font-weight:700;">⚠️ Sem NR-10</span> `;
                alertasTreinamento.push(`<b>${c.nome}</b> está sem treinamento válido de <b>NR-10 (Eletricidade)</b>.`);
            }
        }

        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--card, #fff); border:1px solid var(--border); border-radius:6px; font-size:12px;">
                <div>
                    <strong>${i + 1}. ${escapeHTML(c.nome)}</strong> 
                    <span style="color:var(--text-light); font-size:11px;">(Matr. ${escapeHTML(c.id)} — ${escapeHTML(c.funcao || '—')})</span>
                </div>
                <div>${tagsAptidao}</div>
            </div>`;
    }).join('');

    let bannerAlerta = '';
    if (alertasTreinamento.length > 0) {
        bannerAlerta = `
            <div style="background:#fff3cd; border:1px solid #ffeeba; border-radius:8px; padding:8px 12px; margin-bottom:10px; font-size:12px; color:#856404;">
                <div style="font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span>⚠️</span> Alerta de Conformidade de Treinamento na Equipe:
                </div>
                <div style="line-height:1.5;">${alertasTreinamento.slice(0, 4).join('<br>')}${alertasTreinamento.length > 4 ? `<br><i>...e mais ${alertasTreinamento.length - 4} colaboradores com pendência.</i>` : ''}</div>
            </div>`;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-weight:700; font-size:12.5px; color:var(--text); display:flex; align-items:center; gap:6px;">
                <span>👥</span> Equipe Executante Escalada (${equipe.length} colaboradores na Frente de ${escapeHTML(responsavel)})
            </div>
            <span style="font-size:11px; color:var(--text-light);">Estes nomes serão impressos na folha 3 de assinaturas</span>
        </div>
        ${bannerAlerta}
        <div style="display:flex; flex-direction:column; gap:4px; max-height:180px; overflow-y:auto;">
            ${linhasHtml}
        </div>`;
}

// 5. Modal de Biblioteca Rápida de Riscos da Obra
function abrirModalBibliotecaRiscos() {
    let modal = document.getElementById('modalBibliotecaRiscosApr');
    if (!modal) return;
    
    const container = document.getElementById('modalBibliotecaRiscosConteudo');
    if (container) {
        container.innerHTML = BIBLIOTECA_RISCOS_OBRA.map((cat, idx) => `
            <div style="border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:10px; background:var(--bg);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <b style="font-size:13px; color:var(--primary);">${escapeHTML(cat.categoria)}</b>
                    <button type="button" class="db-apply-btn" onclick="inserirPacoteRiscosDaBiblioteca(${idx})" style="font-size:11.5px; padding:4px 10px;">
                        + Inserir (${cat.riscos.length} riscos)
                    </button>
                </div>
                <div style="font-size:11.5px; color:var(--text-light); line-height:1.5;">
                    ${cat.riscos.map(r => `<div>• <b>${escapeHTML(r.passo_tarefa)}</b>: ${escapeHTML(r.evento_risco)} (Risco Puro: ${r.p_puro}x${r.s_puro} → Residual: ${r.p_residual}x${r.s_residual})</div>`).join('')}
                </div>
            </div>
        `).join('');
    }
    modal.style.display = 'flex';
}

function fecharModalBibliotecaRiscos() {
    const modal = document.getElementById('modalBibliotecaRiscosApr');
    if (modal) modal.style.display = 'none';
}


function renderAprPanel() {
    const statusList = allAprRegistros.map(a => ({ apr: a, ...statusApr(a) }));
    const ativas = statusList.filter(s => s.status === 'ativa' || s.status === 'vencendo');
    const vencendo = statusList.filter(s => s.status === 'vencendo');
    const vencidas = statusList.filter(s => s.status === 'vencida');

    document.getElementById('kpiAprAtivas').textContent = ativas.length;
    document.getElementById('kpiAprVencendo').textContent = vencendo.length;
    document.getElementById('kpiAprVencidas').textContent = vencidas.length;

    // "Risco alto" conta APRs ativas com pelo menos 1 risco RESIDUAL classificado Alto ou
    // Crítico (>=10, os 2 níveis mais graves das 4 faixas novas: Baixo/Moderado/Alto/
    // Crítico) - é o residual que importa aqui (depois das medidas de prevenção), não o
    // puro.
    const ativasComRiscoAlto = ativas.filter(s => {
        const riscos = Array.isArray(s.apr.riscos) ? s.apr.riscos : [];
        return riscos.some(r => {
            const n = nivelRiscoApr(r.p_residual, r.s_residual);
            return n.valor !== null && n.valor >= 10;
        });
    });
    document.getElementById('kpiAprRiscoAlto').textContent = ativasComRiscoAlto.length;

    const listEl = document.getElementById('listAprVencendo');
    const listaAlerta = statusList.filter(s => s.status === 'vencida' || s.status === 'vencendo')
        .sort((a, b) => (a.diffDays ?? 0) - (b.diffDays ?? 0));
    if (listaAlerta.length === 0) {
        listEl.innerHTML = '<div class="db-list-empty">✅ Nenhuma APR vencida ou vencendo.</div>';
    } else {
        listEl.innerHTML = listaAlerta.slice(0, 30).map(s => {
            const cls = s.status === 'vencida' ? 'db-item-danger' : 'db-item-warning';
            const msg = s.status === 'vencida' ? `Venceu há ${Math.abs(s.diffDays)} dia(s)` : (s.diffDays === 0 ? 'Vence hoje' : `Vence em ${s.diffDays} dia(s)`);
            return `<div class="db-list-item ${cls}" style="cursor:pointer;" onclick="abrirDetalheAprNaAba('${escapeHTML(s.apr.id)}')">
                <div class="db-list-item-title">APR ${escapeHTML(s.apr.id)} — ${escapeHTML(s.apr.titulo || s.apr.descricao_atividade || s.apr.setor_unidade || '')}</div>
                <div class="db-list-item-sub">${msg} — Válida até ${formatSimpleDate(s.apr.validade_ate)}</div>
            </div>`;
        }).join('');
    }

    if (typeof Chart === 'undefined') return;
    if (chartInstances.aprClassificacao) chartInstances.aprClassificacao.destroy();
    if (chartInstances.aprAtividadesCriticas) chartInstances.aprAtividadesCriticas.destroy();

    const classCounts = { 'Baixo': 0, 'Moderado': 0, 'Alto': 0, 'Crítico': 0 };
    ativas.forEach(s => {
        const riscos = Array.isArray(s.apr.riscos) ? s.apr.riscos : [];
        riscos.forEach(r => {
            const n = nivelRiscoApr(r.p_residual, r.s_residual);
            if (n.valor !== null && classCounts[n.label] !== undefined) classCounts[n.label]++;
        });
    });
    chartInstances.aprClassificacao = new Chart(document.getElementById('chartAprClassificacao'), {
        type: 'bar',
        data: { labels: Object.keys(classCounts), datasets: [{ data: Object.values(classCounts), backgroundColor: ['#1a7f4b', '#b78a00', '#c2650a', '#c0392b'], borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });

    const ativCounts = {};
    ativas.forEach(s => {
        const lista = Array.isArray(s.apr.atividades_criticas) ? s.apr.atividades_criticas : [];
        lista.forEach(a => { if (!a.startsWith('Outros:')) ativCounts[a] = (ativCounts[a] || 0) + 1; });
    });
    const ativSorted = Object.entries(ativCounts).sort((a, b) => b[1] - a[1]);
    const ativLabels = ativSorted.map(a => wrapChartLabel(a[0]));
    ajustarAlturaBarrasHorizontais('chartAprAtividadesCriticas', ativLabels);
    chartInstances.aprAtividadesCriticas = new Chart(document.getElementById('chartAprAtividadesCriticas'), {
        type: 'bar',
        data: { labels: ativLabels, datasets: [{ data: ativSorted.map(a => a[1]), backgroundColor: '#818cf8', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
    });
}

function abrirDetalheAprNaAba(id) {
    aprItemExpandidoId = id;
    showAprSubtab('historico');
}

// ---- Formulário "Nova APR" ----

// Sugere o próximo número (sequencial) - mesmo padrão já usado em Compras/EPI.
function proximoNumeroApr() {
    const numeros = allAprRegistros.map(a => parseInt(a.id, 10)).filter(n => !isNaN(n));
    const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
    return String(maior + 1).padStart(3, '0');
}

// Recalcula "Válida Até" = emissão + dias de validade toda vez que a data ou os dias
// mudam - mas o campo continua um <input type="date"> normal, então o usuário pode
// sobrescrever manualmente depois se precisar de uma data diferente da regra padrão.
function onAprDataOuValidadeChange() {
    const dataEl = document.getElementById('aprForm_dataEmissao');
    const diasEl = document.getElementById('aprForm_validadeDias');
    const ateEl = document.getElementById('aprForm_validadeAte');
    if (!dataEl.value) return;
    const dias = parseInt(diasEl.value, 10) || 15;
    const dataBase = parseLocalDate(dataEl.value);
    const ate = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate() + dias);
    ateEl.value = `${ate.getFullYear()}-${String(ate.getMonth() + 1).padStart(2, '0')}-${String(ate.getDate()).padStart(2, '0')}`;
}

function rowRiscoVazio() {
    return { passo_tarefa: '', perigo_fonte: '', evento_risco: '', danos_provaveis: '', p_puro: '', s_puro: '', medidas_prevencao: '', p_residual: '', s_residual: '', responsavel: '' };
}

function abrirFormNovaApr() {
    document.getElementById('aprForm_id').value = '';
    document.getElementById('aprForm_numero').value = proximoNumeroApr();
    document.getElementById('aprForm_dataEmissao').value = new Date().toISOString().slice(0, 10);
    document.getElementById('aprForm_validadeDias').value = 15;
    document.getElementById('aprForm_ptNumero').value = '';
    document.getElementById('aprForm_empresa').value = 'CONSÓRCIO OPERADOR DO PISF RAMAL DO AGRESTE';
    document.getElementById('aprForm_setor').value = 'SMS';
    document.getElementById('aprForm_local').value = 'ARCOVERDE - PE';
    document.getElementById('aprForm_responsavel').value = '';
    document.getElementById('aprForm_titulo').value = '';
    document.getElementById('aprForm_descricaoAtividade').value = '';
    document.querySelectorAll('.aprAtivCriticaCheckbox').forEach(cb => { cb.checked = false; });
    document.getElementById('aprForm_outrosCheck').checked = false;
    document.getElementById('aprForm_outrosTexto').value = '';
    document.querySelectorAll('.aprEpiBasicoCheckbox').forEach(cb => { cb.checked = false; });
    document.getElementById('aprForm_luvaTipo').value = '';
    document.querySelectorAll('.aprEpiEspecificoCheckbox').forEach(cb => { cb.checked = false; });
    document.getElementById('aprForm_extintorTipo').value = '';
    document.getElementById('aprForm_rotaFuga').value = 'sim';
    document.getElementById('aprForm_pontoEncontro').value = '';
    document.getElementById('aprForm_kitSocorros').checked = true;
    document.getElementById('aprForm_socorrista').value = '';
    document.getElementById('aprForm_contatoAmbulatorio').value = '';
    document.getElementById('aprForm_contatoBombeiros').value = '';
    document.getElementById('aprForm_elaborador').value = 'JOÃO EVERTON DE SOUZA LIMEIRA';
    document.getElementById('aprForm_supervisor').value = '';
    document.getElementById('aprForm_responsavelArea').value = '';
    document.getElementById('aprFormTitle').textContent = '➕ Nova APR';
    document.getElementById('aprForm_btnImprimir').style.display = 'none';
    const btnAnexosNova = document.getElementById('aprForm_btnAnexos');
    if (btnAnexosNova) btnAnexosNova.style.display = 'none';
    document.getElementById('aprFormStatus').textContent = '';
    aprRiscosForm = [rowRiscoVazio()];
    renderRiscosAprForm();
    onAprDataOuValidadeChange();
    renderEquipeAprPreview();
}

function editarApr(id) {
    const a = allAprRegistros.find(x => x.id === id);
    if (!a) return;
    showAprSubtab('nova');
    document.getElementById('aprForm_id').value = a.id;
    document.getElementById('aprForm_numero').value = a.id;
    document.getElementById('aprForm_dataEmissao').value = a.data_emissao || '';
    document.getElementById('aprForm_validadeDias').value = a.validade_dias || 15;
    document.getElementById('aprForm_validadeAte').value = a.validade_ate || '';
    document.getElementById('aprForm_ptNumero').value = a.pt_numero || '';
    document.getElementById('aprForm_empresa').value = a.empresa_contratada || '';
    document.getElementById('aprForm_setor').value = a.setor_unidade || '';
    document.getElementById('aprForm_local').value = a.local_especifico || '';
    document.getElementById('aprForm_responsavel').value = a.responsavel || '';
    document.getElementById('aprForm_titulo').value = a.titulo || '';
    document.getElementById('aprForm_descricaoAtividade').value = a.descricao_atividade || '';

    const ativCriticas = Array.isArray(a.atividades_criticas) ? a.atividades_criticas : [];
    document.querySelectorAll('.aprAtivCriticaCheckbox').forEach(cb => { cb.checked = ativCriticas.includes(cb.value); });
    const outros = ativCriticas.find(x => x.startsWith('Outros:'));
    document.getElementById('aprForm_outrosCheck').checked = !!outros;
    document.getElementById('aprForm_outrosTexto').value = outros ? outros.replace(/^Outros:\s*/, '') : '';

    const episBasicos = Array.isArray(a.epis_basicos) ? a.epis_basicos : [];
    document.querySelectorAll('.aprEpiBasicoCheckbox').forEach(cb => { cb.checked = episBasicos.includes(cb.value); });
    document.getElementById('aprForm_luvaTipo').value = a.epi_luva_tipo || '';

    const episEspecificos = Array.isArray(a.epis_especificos) ? a.epis_especificos : [];
    document.querySelectorAll('.aprEpiEspecificoCheckbox').forEach(cb => { cb.checked = episEspecificos.includes(cb.value); });
    document.getElementById('aprForm_extintorTipo').value = a.epi_extintor_tipo || '';

    document.getElementById('aprForm_rotaFuga').value = a.rota_fuga_desobstruida || 'sim';
    document.getElementById('aprForm_pontoEncontro').value = a.ponto_encontro || '';
    document.getElementById('aprForm_kitSocorros').checked = a.kit_primeiros_socorros !== false;
    document.getElementById('aprForm_socorrista').value = a.socorrista_brigadista || '';
    document.getElementById('aprForm_contatoAmbulatorio').value = a.contato_ambulatorio || '';
    document.getElementById('aprForm_contatoBombeiros').value = a.contato_bombeiros || '';
    document.getElementById('aprForm_elaborador').value = a.elaborador_sesmt || '';
    document.getElementById('aprForm_supervisor').value = a.supervisor_tarefa || '';
    document.getElementById('aprForm_responsavelArea').value = a.responsavel_area || '';

    aprRiscosForm = Array.isArray(a.riscos) && a.riscos.length > 0 ? a.riscos.map(r => ({ ...r })) : [rowRiscoVazio()];
    renderRiscosAprForm();

    document.getElementById('aprFormTitle').textContent = `✏️ Editando APR ${escapeHTML(a.id)}`;
    document.getElementById('aprForm_btnImprimir').style.display = 'inline-block';
    const btnAnexosEdit = document.getElementById('aprForm_btnAnexos');
    if (btnAnexosEdit) {
        btnAnexosEdit.style.display = 'inline-block';
        btnAnexosEdit.textContent = `📎 Anexos (Assinaturas)${labelContagemAnexos('apr_registros', a.id)}`;
    }
    document.getElementById('aprFormStatus').textContent = '';
    document.getElementById('aprFormTitle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function adicionarRiscoAprForm() {
    aprRiscosForm.push(rowRiscoVazio());
    renderRiscosAprForm();
}

function removerRiscoAprForm(i) {
    aprRiscosForm.splice(i, 1);
    if (aprRiscosForm.length === 0) aprRiscosForm.push(rowRiscoVazio());
    renderRiscosAprForm();
}

// Troca a posição do risco no índice i com o vizinho (direcao -1 = sobe, +1 = desce) -
// não faz nada se já estiver na ponta (primeiro não sobe, último não desce). Só reordena
// o array em memória - o número "Risco N" exibido é sempre a posição atual (recalculado
// no render), não fica salvo nenhum número fixo por risco.
function moverRiscoAprForm(i, direcao) {
    const j = i + direcao;
    if (j < 0 || j >= aprRiscosForm.length) return;
    [aprRiscosForm[i], aprRiscosForm[j]] = [aprRiscosForm[j], aprRiscosForm[i]];
    renderRiscosAprForm();
}

// Um "cartão" por risco (não uma linha só, como em Compras) - com 13 campos por risco
// (passo/perigo/evento/danos/P/S/puro/medidas/P/S/residual/responsável), uma linha
// horizontal única ficaria ilegível. Os selects de P/S disparam um re-render pra
// atualizar o selo de classificação na hora; os campos de texto só escrevem direto no
// array (sem re-render), mesmo padrão dos itens de Compras.
function renderRiscosAprForm() {
    const container = document.getElementById('aprFormRiscosLista');
    if (!container) return;
    const campoEstilo = 'padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;';
    const selectPS = (val, onchange, ancoras, labelTxt) => {
        let opts = '<option value="">-</option>';
        for (let n = 1; n <= 5; n++) opts += `<option value="${n}" title="${escapeHTML(ancoras[n])}" ${String(val) === String(n) ? 'selected' : ''}>${n}</option>`;
        return `<div style="display:flex; align-items:center; gap:3px;"><span style="font-size:10.5px; font-weight:700; color:var(--text-light);">${labelTxt}:</span><select onchange="${onchange}" style="${campoEstilo}">${opts}</select></div>`;
    };
    container.innerHTML = aprRiscosForm.map((r, i) => {
        const puro = nivelRiscoApr(r.p_puro, r.s_puro);
        const residual = nivelRiscoApr(r.p_residual, r.s_residual);
        const residualRuim = puro.valor !== null && residual.valor !== null && residual.valor >= puro.valor;
        return `
        <div style="border:1px solid ${residualRuim ? 'var(--danger)' : 'var(--border)'}; border-radius:10px; padding:12px; margin-bottom:12px; background:var(--bg); box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px dashed var(--border); padding-bottom:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <b style="font-size:12.5px; color:var(--primary);">Risco ${i + 1}</b>
                    <button type="button" class="db-clear-btn" onclick="autoCalibrarRiscoIndividual(${i})" style="font-size:11px; padding:2px 8px; color:#2563eb; border-color:#93c5fd; background:#eff6ff;" title="Preenche automaticamente P e S Puro e Residual">🪄 Sugerir P/S</button>
                </div>
                <div style="display:flex; gap:2px; align-items:center;">
                    <button onclick="moverRiscoAprForm(${i}, -1)" title="Mover para cima" ${i === 0 ? 'disabled' : ''} style="border:none; background:none; color:${i === 0 ? 'var(--text-light)' : 'var(--text)'}; cursor:${i === 0 ? 'default' : 'pointer'}; font-size:15px; padding:2px 4px;">▲</button>
                    <button onclick="moverRiscoAprForm(${i}, 1)" title="Mover para baixo" ${i === aprRiscosForm.length - 1 ? 'disabled' : ''} style="border:none; background:none; color:${i === aprRiscosForm.length - 1 ? 'var(--text-light)' : 'var(--text)'}; cursor:${i === aprRiscosForm.length - 1 ? 'default' : 'pointer'}; font-size:15px; padding:2px 4px;">▼</button>
                    <button onclick="removerRiscoAprForm(${i})" title="Remover" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:15px; padding:2px 4px;">🗑️</button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:6px; margin-bottom:8px;">
                <div><label style="font-size:10px; font-weight:700; color:var(--text-light); display:block; margin-bottom:2px;">Passo da Tarefa</label>
                    <input type="text" placeholder="Ex: Escavação da vala" value="${escapeHTML(r.passo_tarefa)}" oninput="aprRiscosForm[${i}].passo_tarefa=this.value" style="${campoEstilo}"></div>
                <div><label style="font-size:10px; font-weight:700; color:var(--text-light); display:block; margin-bottom:2px;">Perigo / Fonte</label>
                    <input type="text" placeholder="Ex: Solo instável / Escavadeira" value="${escapeHTML(r.perigo_fonte)}" oninput="aprRiscosForm[${i}].perigo_fonte=this.value" style="${campoEstilo}"></div>
                <div><label style="font-size:10px; font-weight:700; color:var(--text-light); display:block; margin-bottom:2px;">Evento / Risco</label>
                    <input type="text" placeholder="Ex: Desabamento de talude" value="${escapeHTML(r.evento_risco)}" oninput="aprRiscosForm[${i}].evento_risco=this.value" style="${campoEstilo}"></div>
                <div><label style="font-size:10px; font-weight:700; color:var(--text-light); display:block; margin-bottom:2px;">Danos Prováveis</label>
                    <input type="text" placeholder="Ex: Soterramento, fraturas" value="${escapeHTML(r.danos_provaveis)}" oninput="aprRiscosForm[${i}].danos_provaveis=this.value" style="${campoEstilo}"></div>
            </div>

            <!-- Matriz Risco Puro -->
            <div style="display:grid; grid-template-columns: 85px 85px 1fr; gap:8px; align-items:center; margin-bottom:8px; background:rgba(0,0,0,0.02); padding:6px 8px; border-radius:6px;">
                ${selectPS(r.p_puro, `onMudarPuroApr(${i}, 'p_puro', this.value)`, APR_ANCORAS_P, 'P')}
                ${selectPS(r.s_puro, `onMudarPuroApr(${i}, 's_puro', this.value)`, APR_ANCORAS_S, 'S')}
                <div title="Risco sem nenhum cuidado especial — só a exposição natural da tarefa." style="padding:6px 10px; border-radius:6px; background:${puro.bg}; color:${puro.cor}; font-weight:700; font-size:11.5px; text-align:center; border:1px solid rgba(0,0,0,0.08);">
                    Risco Puro: ${puro.valor ?? '—'}${puro.valor !== null ? ' (' + puro.label + ')' : ''}
                </div>
            </div>

            <!-- Medidas de Prevenção -->
            <div style="margin-bottom:8px;">
                <label style="font-size:10px; font-weight:700; color:var(--text-light); display:block; margin-bottom:2px;">Medidas de Prevenção (Hierarquia NR-01: Eliminação, EPC, Procedimentos, EPI)</label>
                <input type="text" placeholder="Descreva as medidas de proteção aplicadas nesta etapa..." value="${escapeHTML(r.medidas_prevencao)}" oninput="aprRiscosForm[${i}].medidas_prevencao=this.value" style="${campoEstilo}">
            </div>

            <!-- Matriz Risco Residual -->
            <div style="display:grid; grid-template-columns: 85px 85px 1fr 140px; gap:8px; align-items:center; background:rgba(0,0,0,0.02); padding:6px 8px; border-radius:6px;">
                ${selectPS(r.p_residual, `aprRiscosForm[${i}].p_residual=this.value; renderRiscosAprForm();`, APR_ANCORAS_P, 'P')}
                ${selectPS(r.s_residual, `aprRiscosForm[${i}].s_residual=this.value; renderRiscosAprForm();`, APR_ANCORAS_S, 'S')}
                <div title="Risco depois de aplicar de verdade as medidas de prevenção acima." style="padding:6px 10px; border-radius:6px; background:${residual.bg}; color:${residual.cor}; font-weight:700; font-size:11.5px; text-align:center; border:1px solid rgba(0,0,0,0.08);">
                    Risco Residual: ${residual.valor ?? '—'}${residual.valor !== null ? ' (' + residual.label + ')' : ''}
                </div>
                <input type="text" placeholder="Responsável" value="${escapeHTML(r.responsavel)}" oninput="aprRiscosForm[${i}].responsavel=this.value" style="${campoEstilo}">
            </div>

            ${residualRuim ? `
            <div style="margin-top:8px; padding:6px 10px; border-radius:6px; background:#fdf2f2; color:var(--danger); font-size:11px; font-weight:600; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span>⚠️ O Risco Residual não reduziu em relação ao Puro.</span>
                <button type="button" class="db-clear-btn" onclick="autoCalibrarRiscoIndividual(${i})" style="font-size:10.5px; padding:2px 6px; color:#2563eb; border-color:#93c5fd; background:#fff;">Ajustar Automaticamente</button>
            </div>` : ''}
        </div>`;
    }).join('');
}

async function salvarApr() {
    if (bloquearEdicaoSeNaoAutorizado('apr')) return;
    const statusEl = document.getElementById('aprFormStatus');
    const numero = document.getElementById('aprForm_numero').value.trim();
    const dataEmissao = document.getElementById('aprForm_dataEmissao').value;
    const titulo = document.getElementById('aprForm_titulo').value.trim();
    if (!numero) { statusEl.textContent = '❌ Informe o número da APR.'; statusEl.style.color = 'var(--danger)'; return; }
    if (!dataEmissao) { statusEl.textContent = '❌ Informe a data de emissão.'; statusEl.style.color = 'var(--danger)'; return; }
    if (!titulo) { statusEl.textContent = '❌ Informe o título da APR (identifica a atividade nas listas e impressões).'; statusEl.style.color = 'var(--danger)'; return; }

    const editandoId = document.getElementById('aprForm_id').value;
    if (!editandoId && allAprRegistros.some(a => a.id === numero)) {
        statusEl.textContent = `❌ Já existe uma APR ${numero} cadastrada - edite ela em vez de criar uma nova.`;
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const riscosValidos = aprRiscosForm.filter(r => (r.perigo_fonte || '').trim() || (r.evento_risco || '').trim());
    if (riscosValidos.length === 0) {
        statusEl.textContent = '❌ Adicione ao menos um risco com perigo/evento preenchido.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    // Aviso (não bloqueio) igual ao padrão já usado no lançamento de DDS duplicado: se
    // algum risco está salvando com o Residual igual ou pior que o Puro, confirma antes de
    // gravar - dá pra voltar e corrigir, ou confirmar que é intencional mesmo.
    const riscosResidualRuim = riscosValidos.filter(r => {
        const puro = nivelRiscoApr(r.p_puro, r.s_puro);
        const residual = nivelRiscoApr(r.p_residual, r.s_residual);
        return puro.valor !== null && residual.valor !== null && residual.valor >= puro.valor;
    });
    if (riscosResidualRuim.length > 0) {
        const listaRiscos = riscosResidualRuim.map(r => `- ${r.evento_risco || r.perigo_fonte || 'Risco sem descrição'}`).join('\n');
        const confirmaResidualRuim = confirm(
            `⚠️ ${riscosResidualRuim.length} risco(s) estão com o Risco Residual igual ou pior que o Risco Puro (a medida de prevenção não reduziu o risco na prática):\n\n` +
            listaRiscos + '\n\n' +
            `Revise as Medidas de Prevenção e o P/S do Residual antes de salvar, ou confirme pra salvar assim mesmo.\n\nSalvar mesmo assim?`
        );
        if (!confirmaResidualRuim) return;
    }

    const ativCriticas = Array.from(document.querySelectorAll('.aprAtivCriticaCheckbox:checked')).map(cb => cb.value);
    if (document.getElementById('aprForm_outrosCheck').checked && document.getElementById('aprForm_outrosTexto').value.trim()) {
        ativCriticas.push('Outros: ' + document.getElementById('aprForm_outrosTexto').value.trim());
    }
    const episBasicos = Array.from(document.querySelectorAll('.aprEpiBasicoCheckbox:checked')).map(cb => cb.value);
    const episEspecificos = Array.from(document.querySelectorAll('.aprEpiEspecificoCheckbox:checked')).map(cb => cb.value);

    const existente = editandoId ? allAprRegistros.find(a => a.id === editandoId) : null;
    const row = {
        id: numero,
        data_emissao: dataEmissao,
        validade_dias: parseInt(document.getElementById('aprForm_validadeDias').value, 10) || 15,
        validade_ate: document.getElementById('aprForm_validadeAte').value || null,
        empresa_contratada: document.getElementById('aprForm_empresa').value.trim() || null,
        setor_unidade: document.getElementById('aprForm_setor').value.trim() || null,
        local_especifico: document.getElementById('aprForm_local').value.trim() || null,
        pt_numero: document.getElementById('aprForm_ptNumero').value.trim() || null,
        titulo: titulo,
        descricao_atividade: document.getElementById('aprForm_descricaoAtividade').value.trim() || null,
        atividades_criticas: ativCriticas,
        riscos: riscosValidos,
        epis_basicos: episBasicos,
        epi_luva_tipo: document.getElementById('aprForm_luvaTipo').value.trim() || null,
        epis_especificos: episEspecificos,
        epi_extintor_tipo: document.getElementById('aprForm_extintorTipo').value.trim() || null,
        rota_fuga_desobstruida: document.getElementById('aprForm_rotaFuga').value,
        ponto_encontro: document.getElementById('aprForm_pontoEncontro').value.trim() || null,
        kit_primeiros_socorros: document.getElementById('aprForm_kitSocorros').checked,
        socorrista_brigadista: document.getElementById('aprForm_socorrista').value.trim() || null,
        contato_ambulatorio: document.getElementById('aprForm_contatoAmbulatorio').value.trim() || null,
        contato_bombeiros: document.getElementById('aprForm_contatoBombeiros').value.trim() || null,
        responsavel: document.getElementById('aprForm_responsavel').value.trim() || null,
        elaborador_sesmt: document.getElementById('aprForm_elaborador').value.trim() || null,
        supervisor_tarefa: document.getElementById('aprForm_supervisor').value.trim() || null,
        responsavel_area: document.getElementById('aprForm_responsavelArea').value.trim() || null,
        observacoes: existente?.observacoes || null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('apr_registros', [row]);
        const idx = allAprRegistros.findIndex(a => a.id === row.id);
        if (idx >= 0) allAprRegistros[idx] = row; else allAprRegistros.push(row);
        statusEl.textContent = '✅ APR salva.';
        statusEl.style.color = 'var(--success)';
        document.getElementById('aprForm_id').value = row.id;
        document.getElementById('aprForm_btnImprimir').style.display = 'inline-block';
        const btnAnexosSalvo = document.getElementById('aprForm_btnAnexos');
        if (btnAnexosSalvo) {
            btnAnexosSalvo.style.display = 'inline-block';
            btnAnexosSalvo.textContent = `📎 Anexos (Assinaturas)${labelContagemAnexos('apr_registros', row.id)}`;
        }
        registrarAuditLogDashboard(existente ? 'update' : 'create', 'apr_registros', row.id, row.titulo, resumoAlteracoesApr(existente, row));
        renderAprHistoricoLista();
    } catch (err) {
        console.error('Erro ao salvar APR:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Resumo em texto das principais diferenças entre a APR antes e depois de salvar - não é
// uma cópia campo a campo (isso deixaria o histórico ilegível), é o suficiente pra alguém
// entender rapidamente o que mudou numa edição sem abrir a APR toda.
function resumoAlteracoesApr(antigo, novo) {
    if (!antigo) return 'APR criada.';
    const partes = [];
    if ((antigo.titulo || '') !== (novo.titulo || '')) partes.push(`Título: "${antigo.titulo || ''}" → "${novo.titulo || ''}"`);
    if ((antigo.data_emissao || '') !== (novo.data_emissao || '')) partes.push(`Emissão: ${antigo.data_emissao || '—'} → ${novo.data_emissao || '—'}`);
    if ((antigo.validade_ate || '') !== (novo.validade_ate || '')) partes.push(`Validade até: ${antigo.validade_ate || '—'} → ${novo.validade_ate || '—'}`);
    if ((antigo.setor_unidade || '') !== (novo.setor_unidade || '')) partes.push(`Setor: "${antigo.setor_unidade || ''}" → "${novo.setor_unidade || ''}"`);
    if ((antigo.local_especifico || '') !== (novo.local_especifico || '')) partes.push(`Local: "${antigo.local_especifico || ''}" → "${novo.local_especifico || ''}"`);
    if ((antigo.responsavel || '') !== (novo.responsavel || '')) partes.push(`Responsável/Frente: "${antigo.responsavel || ''}" → "${novo.responsavel || ''}"`);
    const riscosAntes = Array.isArray(antigo.riscos) ? antigo.riscos.length : 0;
    const riscosDepois = Array.isArray(novo.riscos) ? novo.riscos.length : 0;
    if (riscosAntes !== riscosDepois) partes.push(`Riscos: ${riscosAntes} → ${riscosDepois}`);
    return partes.length > 0 ? partes.join(' · ') : 'Salva novamente, sem mudança nos campos principais (pode ter mudado só detalhe de algum risco).';
}

// ---- Histórico / exclusão ----

function limparBuscaAprHistorico() {
    document.getElementById('buscaAprHistorico').value = '';
    renderAprHistoricoLista();
}

function toggleDetalheApr(id) {
    aprItemExpandidoId = aprItemExpandidoId === id ? null : id;
    renderAprHistoricoLista();
}

function renderAprHistoricoLista() {
    const container = document.getElementById('listAprHistorico');
    if (!container) return;
    const q = (document.getElementById('buscaAprHistorico')?.value || '').toLowerCase().trim();
    let itens = allAprRegistros.slice();
    if (q.length >= 2) {
        itens = itens.filter(a => a.id.toLowerCase().includes(q) || (a.titulo || '').toLowerCase().includes(q) || (a.descricao_atividade || '').toLowerCase().includes(q) || (a.setor_unidade || '').toLowerCase().includes(q));
    }
    itens.sort((a, b) => (b.data_emissao || '').localeCompare(a.data_emissao || ''));

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma APR encontrada.</div>';
        return;
    }

    container.innerHTML = itens.slice(0, 200).map(a => {
        const st = statusApr(a);
        const badge = st.status === 'vencida'
            ? '<span class="badge" style="background:#fdf2f2; color:#c0392b; border:1px solid #f3c6c6;">🔴 Vencida</span>'
            : st.status === 'vencendo'
                ? '<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">🟡 Vencendo</span>'
                : '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">✅ Ativa</span>';
        const riscos = Array.isArray(a.riscos) ? a.riscos : [];
        const expandido = aprItemExpandidoId === a.id;
        const logsDesta = allAprAuditLog.filter(l => l.record_id === a.id);
        const acaoLabelHistorico = { create: '🟢 Criou', update: '🟡 Editou', delete: '🔴 Excluiu' };
        const detalheHtml = expandido ? `
            <div style="flex-basis:100%; margin-top:8px; padding:10px; background:var(--bg); border-radius:8px; font-size:12px;">
                <div><b>Local:</b> ${escapeHTML(a.local_especifico || '—')} · <b>Setor:</b> ${escapeHTML(a.setor_unidade || '—')} · <b>Frente:</b> ${escapeHTML(a.responsavel || '—')}</div>
                <div><b>Descrição:</b> ${escapeHTML(a.descricao_atividade || '—')}</div>
                <div><b>Atividades Críticas:</b> ${(Array.isArray(a.atividades_criticas) && a.atividades_criticas.length) ? a.atividades_criticas.map(escapeHTML).join(', ') : '—'}</div>
                <div style="margin-top:6px;"><b>Riscos (${riscos.length}):</b></div>
                <ul style="margin:4px 0 0; padding-left:18px;">
                    ${riscos.map(r => {
                        const residual = nivelRiscoApr(r.p_residual, r.s_residual);
                        return `<li>${escapeHTML(r.evento_risco || r.perigo_fonte || '')} — Residual: <b style="color:${residual.cor}">${residual.valor ?? '—'} (${residual.label})</b></li>`;
                    }).join('')}
                </ul>
                <div style="margin-top:10px;"><b>🕘 Histórico de Alterações (${logsDesta.length}):</b></div>
                ${logsDesta.length === 0
                    ? '<div style="color:var(--text-light); font-size:11.5px; margin-top:4px;">Nenhum registro ainda - só passa a valer pra alterações feitas a partir de agora.</div>'
                    : `<ul style="margin:4px 0 0; padding-left:18px; font-size:11.5px;">
                        ${logsDesta.map(l => `<li>${acaoLabelHistorico[l.action] || l.action} — <b>${escapeHTML(l.actor_nome || '(não identificado)')}</b> em ${l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—'}${l.details ? ' — ' + escapeHTML(l.details) : ''}</li>`).join('')}
                    </ul>`}
            </div>` : '';
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px; cursor:pointer;" onclick="toggleDetalheApr('${escapeHTML(a.id)}')">
                <div class="db-list-item-title">APR ${escapeHTML(a.id)} — ${escapeHTML(a.titulo || a.descricao_atividade || a.setor_unidade || '')}</div>
                <div class="db-list-item-sub">Emitida em ${formatSimpleDate(a.data_emissao)} — válida até ${formatSimpleDate(a.validade_ate)}</div>
            </div>
            ${badge}
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="db-clear-btn" onclick="abrirAnexoModal('apr_registros', '${escapeHTML(a.id)}', 'APR ${escapeHTML(a.id)} — Folha Assinada')">📎 Anexos (Assinaturas)${labelContagemAnexos('apr_registros', a.id)}</button>
                <button class="db-clear-btn" onclick="duplicarAprComoNova('${escapeHTML(a.id)}')" title="Duplicar esta APR como base para uma nova">📋 Duplicar</button>
                <button class="db-clear-btn" onclick="imprimirApr('${escapeHTML(a.id)}')">🖨️</button>
                <button class="db-clear-btn" onclick="editarApr('${escapeHTML(a.id)}')">✏️</button>
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirApr('${escapeHTML(a.id)}')">🗑️</button>
            </div>
            ${detalheHtml}
        </div>`;
    }).join('');
}

async function excluirApr(id) {
    if (bloquearEdicaoSeNaoAutorizado('apr')) return;
    const a = allAprRegistros.find(x => x.id === id);
    if (!a) return;
    if (!confirm(`Excluir a APR ${id} (${a.descricao_atividade || a.setor_unidade || ''})? Essa ação não pode ser desfeita.`)) return;
    try {
        await supabaseDelete('apr_registros', id);
        allAprRegistros = allAprRegistros.filter(x => x.id !== id);
        registrarAuditLogDashboard('delete', 'apr_registros', id, a.titulo || a.descricao_atividade || a.setor_unidade || '', null);
        renderAprHistoricoLista();
        if (document.getElementById('aprSubtabBtn-visao')?.classList.contains('active')) renderAprPanel();
    } catch (err) {
        console.error('Erro ao excluir APR:', err);
        alert('❌ Falha ao excluir: ' + err.message);
    }
}

// ---- Modelos de APR reutilizáveis ----

function renderAprModelosLista() {
    const container = document.getElementById('listAprModelos');
    if (!container) return;
    const contadorEl = document.getElementById('contadorAprModelos');
    if (contadorEl) contadorEl.textContent = allAprModelos.length;

    const q = (document.getElementById('buscaAprModelos')?.value || '').toLowerCase().trim();
    let itens = allAprModelos.slice();
    if (q.length >= 2) {
        itens = itens.filter(m => (m.titulo || '').toLowerCase().includes(q) || (m.numero_legado || '').toLowerCase().includes(q));
    }
    itens.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));

    if (itens.length === 0) {
        container.innerHTML = allAprModelos.length === 0
            ? '<div class="db-list-empty">Nenhum modelo cadastrado ainda. Clique em "🌱 Importar Modelos" acima (só precisa fazer isso uma vez).</div>'
            : '<div class="db-list-empty">Nenhum modelo encontrado com esse termo de busca.</div>';
        return;
    }

    container.innerHTML = itens.map(m => {
        const riscos = Array.isArray(m.riscos) ? m.riscos : [];
        const nEpis = (Array.isArray(m.epis_basicos) ? m.epis_basicos.length : 0) + (Array.isArray(m.epis_especificos) ? m.epis_especificos.length : 0);
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px;">
                <div class="db-list-item-title">${escapeHTML(m.titulo || '(sem título)')}${m.numero_legado ? ` <span style="color:var(--text-light); font-weight:400;">(cód. anterior ${escapeHTML(m.numero_legado)})</span>` : ''}</div>
                <div class="db-list-item-sub">${riscos.length} risco(s) mapeado(s) — ${nEpis} EPI(s) sugerido(s)</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="db-clear-btn" style="color:var(--primary); border-color:var(--primary);" onclick="usarModeloComoBase(${m.id})">▶️ Usar como Base</button>
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirModeloApr(${m.id})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function usarModeloComoBase(id) {
    const m = allAprModelos.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Começar uma APR nova usando o modelo "${m.titulo}" como base? Etapas, perigos, danos, medidas e EPIs sugeridos vêm preenchidos - mas a classificação de Probabilidade/Severidade de cada risco fica em branco, pra você avaliar de acordo com a atividade real de hoje antes de salvar.`)) return;
    showAprSubtab('nova');
    abrirFormNovaApr();

    document.getElementById('aprForm_titulo').value = m.titulo || '';
    document.getElementById('aprForm_descricaoAtividade').value = m.titulo || '';

    const ativCriticas = Array.isArray(m.atividades_criticas) ? m.atividades_criticas : [];
    document.querySelectorAll('.aprAtivCriticaCheckbox').forEach(cb => { cb.checked = ativCriticas.includes(cb.value); });

    const episBasicos = Array.isArray(m.epis_basicos) ? m.epis_basicos : [];
    document.querySelectorAll('.aprEpiBasicoCheckbox').forEach(cb => { cb.checked = episBasicos.includes(cb.value); });
    document.getElementById('aprForm_luvaTipo').value = m.epi_luva_tipo || '';

    const episEspecificos = Array.isArray(m.epis_especificos) ? m.epis_especificos : [];
    document.querySelectorAll('.aprEpiEspecificoCheckbox').forEach(cb => { cb.checked = episEspecificos.includes(cb.value); });
    document.getElementById('aprForm_extintorTipo').value = m.epi_extintor_tipo || '';

    aprRiscosForm = Array.isArray(m.riscos) && m.riscos.length > 0 ? m.riscos.map(r => ({ ...r })) : [rowRiscoVazio()];
    aprRiscosForm.forEach(r => {
        if (!r.p_puro || !r.s_puro) {
            const inf = inferirPsApr(r.passo_tarefa, r.perigo_fonte, r.evento_risco, r.danos_provaveis);
            r.p_puro = r.p_puro || inf.pPuro;
            r.s_puro = r.s_puro || inf.sPuro;
            r.p_residual = r.p_residual || inf.pResidual;
            r.s_residual = r.s_residual || inf.sResidual;
        }
    });
    renderRiscosAprForm();
    renderEquipeAprPreview();

    document.getElementById('aprFormTitle').textContent = `➕ Nova APR (baseada no modelo: ${m.titulo})`;
    document.getElementById('aprFormTitle').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function excluirModeloApr(id) {
    const m = allAprModelos.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Excluir o modelo "${m.titulo}"? Isso NÃO afeta nenhuma APR já emitida a partir dele - só remove o modelo da lista de reutilização. Não pode ser desfeito.`)) return;
    try {
        await supabaseDelete('apr_modelos', id);
        allAprModelos = allAprModelos.filter(x => x.id !== id);
        renderAprModelosLista();
    } catch (e) {
        alert('Erro ao excluir modelo: ' + e.message);
    }
}

async function importarModelosAprSeed() {
    if (allAprModelos.length > 0) {
        if (!confirm(`Já existem ${allAprModelos.length} modelo(s) cadastrado(s). Importar de novo vai DUPLICAR os ${MODELOS_APR_SEED.length} modelos do formato anterior. Tem certeza que quer continuar?`)) return;
    } else {
        if (!confirm(`Importar os ${MODELOS_APR_SEED.length} modelos de atividade do formato físico anterior? Cada um vira um "Modelo de APR" reutilizável, já com etapas/perigos/danos/medidas/EPIs preenchidos (sem a classificação de Probabilidade/Severidade - isso é feito por você ao usar cada modelo). Isso só precisa ser feito uma vez.`)) return;
    }
    try {
        await supabaseInsert('apr_modelos', MODELOS_APR_SEED);
        await carregarAprModelos();
        renderAprModelosLista();
        alert(`✅ ${MODELOS_APR_SEED.length} modelos importados com sucesso!`);
    } catch (e) {
        alert('Erro ao importar modelos: ' + e.message);
    }
}

// ---- Impressão (3 folhas, mesmo layout do formulário de papel real) ----

// A equipe da tarefa não fica salva num campo próprio - é resolvida ao vivo a partir da
// frente/encarregado (mesmo padrão já usado em Registro de Treinamento/Ficha de EPI),
// então uma mudança de equipe entre a emissão e a impressão já reflete automaticamente.
function imprimirApr(id) {
    const a = allAprRegistros.find(x => x.id === id);
    if (!a) return;
    const riscos = Array.isArray(a.riscos) ? a.riscos : [];
    const ativCriticas = Array.isArray(a.atividades_criticas) ? a.atividades_criticas : [];
    const episBasicos = Array.isArray(a.epis_basicos) ? a.epis_basicos : [];
    const episEspecificos = Array.isArray(a.epis_especificos) ? a.epis_especificos : [];
    const equipe = equipeDaFrente(a.responsavel);

    const marcadoAtiv = label => ativCriticas.includes(label) ? '☑' : '☐';
    const marcadoBasico = label => episBasicos.includes(label) ? '☑' : '☐';
    const marcadoEspecifico = label => episEspecificos.includes(label) ? '☑' : '☐';
    const outrosAtiv = ativCriticas.find(x => x.startsWith('Outros:'));

    const linhasRisco = riscos.map((r, i) => {
        const puro = nivelRiscoApr(r.p_puro, r.s_puro);
        const residual = nivelRiscoApr(r.p_residual, r.s_residual);
        return `<tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${escapeHTML(r.passo_tarefa || '')}</td>
            <td>${escapeHTML(r.perigo_fonte || '')}</td>
            <td>${escapeHTML(r.evento_risco || '')}</td>
            <td>${escapeHTML(r.danos_provaveis || '')}</td>
            <td style="text-align:center;">${escapeHTML(String(r.p_puro || ''))}</td>
            <td style="text-align:center;">${escapeHTML(String(r.s_puro || ''))}</td>
            <td style="text-align:center; background:${puro.bg}; color:${puro.cor}; font-weight:700;">${puro.valor ?? ''}</td>
            <td>${escapeHTML(r.medidas_prevencao || '')}</td>
            <td style="text-align:center;">${escapeHTML(String(r.p_residual || ''))}</td>
            <td style="text-align:center;">${escapeHTML(String(r.s_residual || ''))}</td>
            <td style="text-align:center; background:${residual.bg}; color:${residual.cor}; font-weight:700;">${residual.valor ?? ''}</td>
            <td>${escapeHTML(r.responsavel || '')}</td>
        </tr>`;
    }).join('');

    const ALTURA_LINHA_EQUIPE = 30; // linhas mais altas pra dar espaço real de assinatura no papel
    const linhasEquipe = equipe.map((p, i) => `<tr style="height:${ALTURA_LINHA_EQUIPE}px;">
        <td style="text-align:center;">${String(i + 1).padStart(2, '0')}</td>
        <td style="text-align:center;">${escapeHTML(p.matricula)}</td>
        <td>${escapeHTML(p.nome)}</td>
        <td>${escapeHTML(p.funcao || '')}</td>
        <td></td>
    </tr>`);
    const MIN_LINHAS_EQUIPE = 10;
    const linhasEquipeVazias = [];
    for (let i = equipe.length; i < MIN_LINHAS_EQUIPE; i++) {
        linhasEquipeVazias.push(`<tr style="height:${ALTURA_LINHA_EQUIPE}px;"><td style="text-align:center;">${String(i + 1).padStart(2, '0')}</td><td></td><td></td><td></td><td></td></tr>`);
    }
    const linhasEquipeTabela = linhasEquipe.concat(linhasEquipeVazias).join('');

    const cabecalho = () => `
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP">
            <div class="titulo">ANÁLISE PRELIMINAR DE RISCO (APR)</div>
            <div class="codigo">${escapeHTML(codigoRevisaoDocumento('apr') || '')}<br>Nº ${escapeHTML(a.id)}</div>
        </div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>APR ${escapeHTML(a.id)} - ${escapeHTML(a.titulo || a.descricao_atividade || '')}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color:#111; margin:20px; }
    .folha { max-width: 1150px; margin: 0 auto 24px; border: 2px solid #000; }
    .cabecalho { display:flex; align-items:center; border-bottom:2px solid #000; }
    .cabecalho img { max-height:38px; margin:6px 12px; }
    .cabecalho .titulo { flex:1; text-align:center; font-weight:700; font-size:14px; }
    .cabecalho .codigo { padding:6px 10px; border-left:2px solid #000; font-size:10px; text-align:center; }
    .linha { display:flex; border-bottom:1px solid #000; flex-wrap:wrap; }
    .campo { flex:1; padding:4px 8px; border-right:1px solid #000; min-width:150px; }
    .campo:last-child { border-right:none; }
    .campo b { margin-right:4px; }
    .secao-titulo { font-weight:700; text-align:center; background:#e5e5e5; padding:4px; border-bottom:1px solid #000; border-top:1px solid #000; font-size:11.5px; }
    .checklist { padding:8px 10px; font-size:10.5px; line-height:1.9; border-bottom:1px solid #000; }
    .legenda-matriz { padding:4px 8px; font-size:8.5px; line-height:1.7; border-bottom:1px solid #000; background:#fafafa; }
    .legenda-matriz b { font-size:8.5px; }
    .legenda-matriz .nivel { padding:1px 6px; border-radius:3px; font-weight:700; white-space:nowrap; }
    table { width:100%; border-collapse:collapse; }
    th, td { border:1px solid #000; padding:3px 5px; font-size:9.5px; vertical-align:top; }
    th { background:#e5e5e5; font-size:9px; }
    .no-print { text-align:center; margin:16px 0; }
    .no-print button { padding:10px 24px; font-size:14px; font-weight:600; cursor:pointer; border-radius:8px; border:none; background:#4f46e5; color:#fff; }
    @media print { .no-print { display:none; } body { margin:0; } .folha { page-break-after: always; } .folha:last-child { page-break-after: auto; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>

    <div class="folha">
        ${cabecalho()}
        <div class="linha" style="background:#f2f2f2;">
            <div class="campo" style="flex:1; font-size:12.5px;"><b>ATIVIDADE:</b> ${escapeHTML(a.titulo || '')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA/CONTRATADA:</b> ${escapeHTML(a.empresa_contratada || '')}</div>
            <div class="campo"><b>SETOR/UNIDADE:</b> ${escapeHTML(a.setor_unidade || '')}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>DATA DE EMISSÃO:</b> ${formatSimpleDate(a.data_emissao)}</div>
            <div class="campo"><b>VALIDADE ATÉ:</b> ${formatSimpleDate(a.validade_ate)} (${escapeHTML(String(a.validade_dias || 15))} dias)</div>
            <div class="campo"><b>PT Nº:</b> ${escapeHTML(a.pt_numero || '—')}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>LOCAL ESPECÍFICO:</b> ${escapeHTML(a.local_especifico || '')}</div>
            <div class="campo"><b>FRENTE/ENCARREGADO:</b> ${escapeHTML(a.responsavel || '')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:1.8;"><b>DESCRIÇÃO DA ATIVIDADE:</b> ${escapeHTML(a.descricao_atividade || '')}</div>
            <div class="campo" style="flex:2.5; font-size:9.5px; line-height:1.55;">
                <b style="display:block; margin-bottom:3px; font-size:10px;">ATIVIDADES CRÍTICAS VINCULADAS</b>
                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        ${marcadoAtiv('Trabalho em Altura (NR-35)')} Trabalho em Altura (NR-35)<br>
                        ${marcadoAtiv('Espaço Confinado (NR-33)')} Espaço Confinado (NR-33)<br>
                        ${marcadoAtiv('Eletricidade / SEP (NR-10)')} Eletricidade / SEP (NR-10)<br>
                        ${marcadoAtiv('Içamento / Cargas Críticas')} Içamento / Cargas Críticas<br>
                        ${marcadoAtiv('Trabalho a Quente / Fogo')} Trabalho a Quente / Fogo
                    </div>
                    <div style="flex:1;">
                        ${marcadoAtiv('Escavação / Solo (NR-18)')} Escavação / Solo (NR-18)<br>
                        ${marcadoAtiv('Produtos Químicos Perigosos')} Produtos Químicos Perigosos<br>
                        ${marcadoAtiv('Bloqueio / LOTO (NR-12)')} Bloqueio / LOTO (NR-12)<br>
                        ${outrosAtiv ? '☑' : '☐'} Outros: ${escapeHTML(outrosAtiv ? outrosAtiv.replace(/^Outros:\s*/, '') : '')}
                    </div>
                </div>
            </div>
        </div>
        <div class="secao-titulo">AVALIAÇÃO E CONTROLE DE RISCOS (Matriz 5×5 - P×S)</div>
        <div class="legenda-matriz">
            <b>P (Probabilidade):</b> 1 Raro &middot; 2 Improvável &middot; 3 Possível &middot; 4 Provável &middot; 5 Frequente
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <b>S (Severidade):</b> 1 Leve s/ afastamento &middot; 2 Ambulatorial &middot; 3 Com afastamento &middot; 4 Grave/incapacitante &middot; 5 Fatalidade
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <b>Risco = P×S:</b>
            <span class="nivel" style="background:#e6f7ee; color:#1a7f4b;">1-4 Baixo</span>
            <span class="nivel" style="background:#fff9e6; color:#b78a00;">5-9 Moderado</span>
            <span class="nivel" style="background:#fef1e0; color:#c2650a;">10-16 Alto</span>
            <span class="nivel" style="background:#fdf2f2; color:#c0392b;">17-25 Crítico</span>
        </div>
        <table>
            <thead><tr>
                <th>Item</th><th>Passo</th><th>Perigo/Fonte</th><th>Evento/Risco</th><th>Danos</th>
                <th>P</th><th>S</th><th>Risco Puro</th><th>Medidas de Prevenção (Hierarquia NR-01)</th><th>P</th><th>S</th><th>Risco Residual</th><th>Resp.</th>
            </tr></thead>
            <tbody>${linhasRisco || '<tr><td colspan="13" style="text-align:center; color:#888;">Nenhum risco cadastrado</td></tr>'}</tbody>
        </table>
    </div>

    <div class="folha">
        ${cabecalho()}
        <div class="secao-titulo">EQUIPAMENTOS DE PROTEÇÃO E CONTROLES ESPECIAIS</div>
        <div class="checklist">
            <b>EPIs Básicos Obrigatórios:</b><br>
            ${marcadoBasico('Capacete com Jugular')} Capacete com Jugular &nbsp;&nbsp; ${marcadoBasico('Óculos de Proteção')} Óculos de Proteção &nbsp;&nbsp; ${marcadoBasico('Calçado de Segurança c/ Biqueira')} Calçado de Segurança c/ Biqueira<br>
            ${marcadoBasico('Protetor Auditivo (Plug/Concha)')} Protetor Auditivo (Plug/Concha) &nbsp;&nbsp; ${marcadoBasico('Luvas de Proteção')} Luvas de Proteção (Tipo): ${escapeHTML(a.epi_luva_tipo || '')}
        </div>
        <div class="checklist">
            <b>EPIs / EPCs Específicos:</b><br>
            ${marcadoEspecifico('Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y')} Cinto Tipo Paraquedista c/ Talabarte Duplo Y &nbsp;&nbsp; ${marcadoEspecifico('Linha de Vida / Trava-quedas')} Linha de Vida / Trava-quedas<br>
            ${marcadoEspecifico('Conjunto Autônomo / Máscara c/ Filtro Químico')} Conjunto Autônomo / Máscara c/ Filtro Químico &nbsp;&nbsp; ${marcadoEspecifico('Detector de Gases Calibrado')} Detector de Gases Calibrado<br>
            ${marcadoEspecifico('Tapete Isolante / Ferramentas Isoladas 1000V')} Tapete Isolante / Ferramentas Isoladas 1000V &nbsp;&nbsp; ${marcadoEspecifico('Biombos / Mantas Anti-chama')} Biombos / Mantas Anti-chama<br>
            ${marcadoEspecifico('Extintor de Incêndio Dedicado')} Extintor Dedicado (Tipo/Capacidade): ${escapeHTML(a.epi_extintor_tipo || '')} &nbsp;&nbsp; ${marcadoEspecifico('Sistema de Bloqueio/Travamento LOTO')} Sistema de Bloqueio/Travamento LOTO
        </div>
        <div class="secao-titulo">PLANO DE EMERGÊNCIA E CONTATOS</div>
        <div class="checklist" style="border-bottom:none;">
            ROTA DE FUGA DESOBSTRUÍDA? ${a.rota_fuga_desobstruida === 'sim' ? '☑ SIM &nbsp; ☐ NÃO' : '☐ SIM &nbsp; ☑ NÃO'} &nbsp;&nbsp; PONTO DE ENCONTRO: ${escapeHTML(a.ponto_encontro || '')}<br>
            KIT DE PRIMEIROS SOCORROS DISPONÍVEL? ${a.kit_primeiros_socorros ? '☑ SIM' : '☐ SIM'} &nbsp;&nbsp; SOCORRISTA/BRIGADISTA NO LOCAL: ${escapeHTML(a.socorrista_brigadista || '')}<br>
            CONTATO AMBULATÓRIO/RESGATE: ${escapeHTML(a.contato_ambulatorio || '')} &nbsp;&nbsp; CONTATO BOMBEIROS/EMERGÊNCIA: ${escapeHTML(a.contato_bombeiros || '')}
        </div>
    </div>

    <div class="folha">
        ${cabecalho()}
        <div class="secao-titulo">CIÊNCIA E TREINAMENTO DOS EXECUTANTES DA TAREFA</div>
        <div class="checklist">Declaro ter sido instruído sobre os riscos da atividade e sobre as medidas preventivas descritas nesta APR.</div>
        <table>
            <thead><tr><th style="width:30px;">Nº</th><th style="width:70px;">Matrícula</th><th>Nome Legível</th><th>Função/Cargo</th><th style="width:150px;">Assinatura</th></tr></thead>
            <tbody>${linhasEquipeTabela}</tbody>
        </table>
        <div class="secao-titulo">RESPONSÁVEIS PELA APROVAÇÃO</div>
        <div class="linha" style="border-bottom:none;">
            <div class="campo"><b>ELABORADOR/SESMT:</b> ${escapeHTML(a.elaborador_sesmt || '')}<br><br>Assinatura: ______________ &nbsp; Data: ${formatSimpleDate(a.data_emissao)}</div>
            <div class="campo"><b>SUPERVISOR DA TAREFA:</b> ${escapeHTML(a.supervisor_tarefa || '')}<br><br>Assinatura: ______________ &nbsp; Data: ___/___/___</div>
            <div class="campo"><b>RESPONSÁVEL PELA ÁREA:</b> ${escapeHTML(a.responsavel_area || '')}<br><br>Assinatura: ______________ &nbsp; Data: ___/___/___</div>
        </div>
    </div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url;
    aTag.target = '_blank';
    aTag.rel = 'noopener';
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    registrarEmissaoDocumento('apr', a.titulo || a.descricao_atividade || a.id);
}

// ============================================
// CIPA (Comissão Interna de Prevenção de Acidentes) - Fase 1: Reuniões e Atas
// ============================================

const CIPA_CARGO_LABELS = {
    titular_empregado: 'Titular - Empregados',
    suplente_empregado: 'Suplente - Empregados',
    titular_empregador: 'Titular - Empregador',
    suplente_empregador: 'Suplente - Empregador'
};
const CIPA_TIPO_LABELS = { posse: 'Posse', ordinaria: 'Ordinária', extraordinaria: 'Extraordinária' };
const CIPA_STATUS_LABELS = { agendada: '🗓️ Agendada', realizada: '✅ Realizada', cancelada: '❌ Cancelada' };
const PLANO_ACAO_STATUS_LABELS = { pendente: '⏳ Pendente', em_andamento: '🔧 Em Andamento', concluido: '✅ Concluído' };
const CIPA_PAPEL_LABELS = { presidente: 'Presidente', vice_presidente: 'Vice-Presidente', secretario: 'Secretário(a)' };

// Dados reais do cadastro de CNPJ (comprovante da Receita Federal, emitido 28/06/2024) -
// usados no cabeçalho da ata (seção 1). Grau de Risco (NR-4) NÃO consta nesse documento
// e não foi informado ainda - fica em branco na ata até o usuário fornecer, em vez de
// ser adivinhado a partir do CNAE.
const EMPRESA_INFO = {
    razaoSocial: 'CONSORCIO OPERADOR RAMAL DO AGRESTE',
    cnpj: '55.623.017/0001-97',
    cnaePrincipal: '71.12-0-00 - Serviços de engenharia',
    naturezaJuridica: '215-1 - Consórcio de Sociedades',
    grauRisco: '1'  // Anexo I da NR-04, confirmado no PGR assinado (CNAE 7112-0/00)
};

async function loadCipaData() {
    try {
        const [membros, reunioes, planoAcao] = await Promise.all([
            supabaseFetch('cipa_membros', '?select=*'),
            supabaseFetch('cipa_reunioes', '?select=*'),
            supabaseFetch('cipa_plano_acao', '?select=*')
        ]);
        allCipaMembros = membros;
        allCipaReunioes = reunioes;
        allCipaPlanoAcao = planoAcao;
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
        }
        if (allAcidentes.length === 0) {
            allAcidentes = await supabaseFetch('acidentes', '?select=*');
        }
        await loadCipaProcessoEleitoralData();
        renderCipaVisaoGeral();
        renderCipaReunioesLista();
        filterPlanoAcaoLista();
        renderCipaMembrosLista();
    } catch (err) {
        console.error('Erro ao carregar dados da CIPA:', err);
    }
}

// Estatísticas reais de CPT/SPT (com/sem afastamento) num intervalo de datas -
// reaproveitado pela seção 4.1 da ata da CIPA. Quase-acidente e acidente de trajeto não
// entram aqui porque a tabela `acidentes` não distingue esses dois casos hoje.
function calcularAcidentesPeriodo(inicio, fim) {
    const doPeriodo = allAcidentes.filter(a => {
        if (!a.data_acidente) return false;
        const d = parseLocalDate(a.data_acidente);
        return d >= inicio && d <= fim;
    });
    return {
        cpt: doPeriodo.filter(a => a.com_afastamento).length,
        spt: doPeriodo.filter(a => !a.com_afastamento).length,
        total: doPeriodo.length
    };
}

// Período "desde a última reunião": da data da reunião anterior (qualquer tipo/status,
// pelo calendário) até a data desta reunião. Sem reunião anterior no calendário, cai pro
// início do contrato (mesmo marco usado em Acidentabilidade/Gestão Ambiental).
// NÃO filtra por status='realizada': reuniões seguem uma cadência mensal já agendada no
// calendário, então mesmo uma reunião anterior ainda 'agendada' já marca corretamente o
// fim do período apurado na reunião passada - exigir 'realizada' fazia o período cair pro
// início do contrato inteiro (2+ anos) sempre que a reunião anterior não tivesse sido
// marcada como realizada no sistema, mesmo já tendo data passada (achado real via
// relatório de auditoria externo, reunião nº7: período saiu 01/07/2024-12/08/2026 em vez
// de 08/07/2026-12/08/2026).
function periodoDesdeUltimaReuniaoCipa(reuniaoAtualId, dataReuniaoAtual) {
    const anteriores = allCipaReunioes
        .filter(r => r.id !== reuniaoAtualId && r.data_reuniao < dataReuniaoAtual)
        .sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao));
    const inicio = anteriores.length > 0
        ? parseLocalDate(anteriores[0].data_reuniao)
        : new Date(ACIDENTES_MES_INICIO_CONTRATO.ano, ACIDENTES_MES_INICIO_CONTRATO.mes, 1);
    const fim = parseLocalDate(dataReuniaoAtual);
    return { inicio, fim };
}

function showCipaSubtab(tab) {
    ['visao', 'calendario', 'plano', 'membros', 'eleicao'].forEach(t => {
        const content = document.getElementById('cipaSubtab-' + t);
        const btn = document.getElementById('cipaSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderCipaVisaoGeral();
    if (tab === 'calendario') { fecharReuniaoCipa(); renderCipaReunioesLista(); }
    if (tab === 'plano') { fecharFormPlanoAcao(); filterPlanoAcaoLista(); }
    if (tab === 'membros') { fecharFormCipaMembro(); renderCipaMembrosLista(); }
    if (tab === 'eleicao') { fecharFormCipaCandidato(); renderCipaEleicao(); }
}

// ---- Visão Geral ----

function renderCipaVisaoGeral() {
    const proximaCard = document.getElementById('cipaProximaReuniaoCard');
    if (proximaCard) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const proxima = allCipaReunioes
            .filter(r => r.status === 'agendada' && parseLocalDate(r.data_reuniao) >= hoje)
            .sort((a, b) => a.data_reuniao.localeCompare(b.data_reuniao))[0];
        if (proxima) {
            const dias = Math.round((parseLocalDate(proxima.data_reuniao) - hoje) / 86400000);
            const diasLabel = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`;
            proximaCard.innerHTML = `
                <div class="db-chart-title">📅 Próxima Reunião</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--primary);">${CIPA_TIPO_LABELS[proxima.tipo] || proxima.tipo}${proxima.numero_ordinaria ? ' nº ' + proxima.numero_ordinaria : ''} — ${diasLabel}</div>
                <div style="font-size: 13px; color: var(--text-light); margin-top: 4px;">
                    ${formatSimpleDate(proxima.data_reuniao)}${proxima.horario ? ' às ' + proxima.horario : ''} — ${escapeHTML(proxima.local || 'local não definido')}
                </div>
                ${proxima.descricao ? `<div style="font-size: 12.5px; color: var(--text-light); margin-top: 4px;">${escapeHTML(proxima.descricao)}</div>` : ''}`;
        } else {
            proximaCard.innerHTML = `<div class="db-chart-title">📅 Próxima Reunião</div><div class="db-list-empty">Nenhuma reunião agendada.</div>`;
        }
    }

    const anoAtual = new Date().getFullYear();
    const realizadasNoAno = allCipaReunioes.filter(r => r.status === 'realizada' && parseLocalDate(r.data_reuniao).getFullYear() === anoAtual).length;
    const abertas = allCipaPlanoAcao.filter(p => p.status !== 'concluido').length;
    const hojeStr = new Date(); hojeStr.setHours(0, 0, 0, 0);
    const atrasadas = allCipaPlanoAcao.filter(p => p.status !== 'concluido' && p.prazo && parseLocalDate(p.prazo) < hojeStr).length;
    const membrosAtivos = allCipaMembros.filter(m => m.ativo).length;

    const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKpi('kpiCipaReunioesRealizadas', realizadasNoAno);
    setKpi('kpiCipaPendenciasAbertas', abertas);
    setKpi('kpiCipaPendenciasAtrasadas', atrasadas);
    setKpi('kpiCipaMembrosAtivos', membrosAtivos);

    const lista = document.getElementById('cipaVisaoMembrosLista');
    if (lista) {
        const ativos = allCipaMembros.filter(m => m.ativo).sort((a, b) => (a.cargo || '').localeCompare(b.cargo || ''));
        lista.innerHTML = ativos.length === 0
            ? '<div class="db-list-empty">Nenhum membro cadastrado.</div>'
            : ativos.map(m => `<div class="db-list-item">
                <div class="db-list-item-title">${escapeHTML(m.nome)}</div>
                <div class="db-list-item-sub">${CIPA_CARGO_LABELS[m.cargo] || m.cargo || ''} — ${escapeHTML(m.funcao || '')} — ${escapeHTML(m.setor || '')}</div>
            </div>`).join('');
    }
}

// ---- Calendário de Reuniões ----

function renderCipaReunioesLista() {
    const container = document.getElementById('cipaReunioesLista');
    if (!container) return;
    const linhas = allCipaReunioes.slice().sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao));
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma reunião cadastrada.</div>';
        return;
    }
    container.innerHTML = linhas.map(r => `<div class="db-list-item" style="cursor:pointer;" onclick="abrirReuniaoCipa('${escapeHTML(r.id)}')">
        <div class="db-list-item-title">${CIPA_TIPO_LABELS[r.tipo] || r.tipo}${r.numero_ordinaria ? ' nº ' + r.numero_ordinaria : ''} — ${formatSimpleDate(r.data_reuniao)}</div>
        <div class="db-list-item-sub">${CIPA_STATUS_LABELS[r.status] || r.status} — ${escapeHTML(r.local || '')}${r.horario ? ' — ' + r.horario : ''}</div>
    </div>`).join('');
}

function popularCipaColabDatalist() {
    const dl = document.getElementById('cipaColabList');
    if (!dl) return;
    dl.innerHTML = '';
    allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.id} - ${e.nome}`;
        dl.appendChild(opt);
    });
}

let cipaReuniaoParticipantesAtual = [];
let cipaReuniaoPautaAtual = [];
let cipaReuniaoAssuntosAtual = [];
let cipaAssuntoEditandoIndex = null;

// Compatibilidade: reuniões salvas antes da itemização guardavam pauta/assuntos_tratados
// como texto livre (TEXT). Depois da migração pra JSONB isso não deve mais acontecer,
// mas se algum registro antigo ainda tiver uma string aqui, ela vira um único item em
// vez de sumir silenciosamente.
function normalizarItensCipa(valor) {
    if (Array.isArray(valor)) return valor;
    if (typeof valor === 'string' && valor.trim()) return [{ texto: valor.trim() }];
    return [];
}

function renderCipaPautaForm() {
    const container = document.getElementById('cipaReuniaoForm_pautaItens');
    if (!container) return;
    if (cipaReuniaoPautaAtual.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum item de pauta adicionado.</div>';
        return;
    }
    container.innerHTML = cipaReuniaoPautaAtual.map((item, i) => `
        <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:8px;">
            <div style="font-weight:700; font-size:11px; color:var(--text-light); min-width:52px;">ITEM ${String(i + 1).padStart(2, '0')}</div>
            <div style="flex:1; font-size:12.5px;">${escapeHTML(item.texto || '')}</div>
            <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="removerItemPautaCipa(${i})">✕</button>
        </div>`).join('');
}

function adicionarItemPautaCipa() {
    const input = document.getElementById('cipaReuniaoForm_addPauta');
    const texto = input.value.trim();
    if (!texto) return;
    cipaReuniaoPautaAtual.push({ texto });
    input.value = '';
    renderCipaPautaForm();
}

function removerItemPautaCipa(i) {
    cipaReuniaoPautaAtual.splice(i, 1);
    renderCipaPautaForm();
}

function renderCipaAssuntosForm() {
    const container = document.getElementById('cipaReuniaoForm_assuntosItens');
    if (!container) return;
    if (cipaReuniaoAssuntosAtual.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum assunto tratado adicionado.</div>';
        return;
    }
    container.innerHTML = cipaReuniaoAssuntosAtual.map((item, i) => {
        if (i === cipaAssuntoEditandoIndex) {
            return `
        <div style="display:flex; flex-direction:column; gap:6px; padding:8px; border:1px solid var(--primary); border-radius:8px; background:#f8f8ff;">
            <div style="font-weight:700; font-size:11px; color:var(--text-light);">ITEM ${String(i + 1).padStart(2, '0')} — editando</div>
            <input type="text" id="cipaAssuntoEdit_texto_${i}" value="${escapeHTML(item.texto || '')}" placeholder="Assunto tratado..." style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;">
            <input type="text" id="cipaAssuntoEdit_resposta_${i}" value="${escapeHTML(item.resposta || '')}" placeholder="Resposta / decisão..." style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;">
            <input type="text" id="cipaAssuntoEdit_responsavel_${i}" value="${escapeHTML(item.responsavel || '')}" placeholder="Responsável..." style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12.5px;">
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button onclick="cancelarEdicaoItemAssuntoCipa()" style="border:1px solid var(--border); background:#fff; color:var(--text); cursor:pointer; font-size:12px; padding:5px 12px; border-radius:6px;">Cancelar</button>
                <button onclick="salvarEdicaoItemAssuntoCipa(${i})" style="border:none; background:var(--primary); color:#fff; cursor:pointer; font-size:12px; padding:5px 12px; border-radius:6px; font-weight:600;">✓ Salvar</button>
            </div>
        </div>`;
        }
        return `
        <div style="display:flex; align-items:flex-start; gap:8px; padding:8px; border:1px solid var(--border); border-radius:8px;">
            <div style="font-weight:700; font-size:11px; color:var(--text-light); min-width:52px; padding-top:2px;">ITEM ${String(i + 1).padStart(2, '0')}</div>
            <div style="flex:1; font-size:12.5px; display:flex; flex-direction:column; gap:2px;">
                <div>${escapeHTML(item.texto || '')}</div>
                ${item.resposta ? `<div style="color:var(--text-light);"><b>Resposta:</b> ${escapeHTML(item.resposta)}</div>` : ''}
                ${item.responsavel ? `<div style="color:var(--text-light);"><b>Responsável:</b> ${escapeHTML(item.responsavel)}</div>` : ''}
            </div>
            <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="editarItemAssuntoCipa(${i})" title="Editar">✎</button>
            <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="removerItemAssuntoCipa(${i})" title="Remover">✕</button>
        </div>`;
    }).join('');
}

function adicionarItemAssuntoCipa() {
    const inputTexto = document.getElementById('cipaReuniaoForm_addAssuntoTexto');
    const inputResposta = document.getElementById('cipaReuniaoForm_addAssuntoResposta');
    const inputResponsavel = document.getElementById('cipaReuniaoForm_addAssuntoResponsavel');
    const texto = inputTexto.value.trim();
    if (!texto) return;
    cipaReuniaoAssuntosAtual.push({
        texto,
        resposta: inputResposta.value.trim() || null,
        responsavel: inputResponsavel.value.trim() || null
    });
    inputTexto.value = '';
    inputResposta.value = '';
    inputResponsavel.value = '';
    renderCipaAssuntosForm();
}

function removerItemAssuntoCipa(i) {
    cipaReuniaoAssuntosAtual.splice(i, 1);
    if (cipaAssuntoEditandoIndex === i) cipaAssuntoEditandoIndex = null;
    else if (cipaAssuntoEditandoIndex !== null && cipaAssuntoEditandoIndex > i) cipaAssuntoEditandoIndex--;
    renderCipaAssuntosForm();
}

// Edição feita dentro do próprio item da lista (não mais em caixas de diálogo
// separadas que ficavam flutuando por cima da página). Clicar em "✎" troca o item
// pelos 3 campos de edição no lugar; "Salvar" grava e "Cancelar" descarta, sem sair
// do item nem perder a posição dele na lista.
function editarItemAssuntoCipa(i) {
    cipaAssuntoEditandoIndex = i;
    renderCipaAssuntosForm();
}

function cancelarEdicaoItemAssuntoCipa() {
    cipaAssuntoEditandoIndex = null;
    renderCipaAssuntosForm();
}

function salvarEdicaoItemAssuntoCipa(i) {
    const inputTexto = document.getElementById(`cipaAssuntoEdit_texto_${i}`);
    const inputResposta = document.getElementById(`cipaAssuntoEdit_resposta_${i}`);
    const inputResponsavel = document.getElementById(`cipaAssuntoEdit_responsavel_${i}`);
    if (!inputTexto) return;
    const texto = inputTexto.value.trim();
    if (!texto) { alert('O campo "Assunto tratado" não pode ficar vazio.'); return; }
    cipaReuniaoAssuntosAtual[i] = {
        texto,
        resposta: inputResposta.value.trim() || null,
        responsavel: inputResponsavel.value.trim() || null
    };
    cipaAssuntoEditandoIndex = null;
    renderCipaAssuntosForm();
}

function renderCipaParticipantesForm() {
    const container = document.getElementById('cipaReuniaoForm_participantes');
    if (!container) return;
    if (cipaReuniaoParticipantesAtual.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum participante adicionado.</div>';
        return;
    }
    container.innerHTML = cipaReuniaoParticipantesAtual.map((p, i) => `
        <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; flex-wrap:wrap;">
            <input type="checkbox" ${p.presente ? 'checked' : ''} onchange="toggleParticipanteCipa(${i}, this.checked)">
            <div style="flex:1; min-width:160px; font-size:12.5px;">${escapeHTML(p.nome)} <span style="color:var(--text-light);">— ${escapeHTML(p.funcao || '')}</span></div>
            ${!p.presente ? `<input type="text" value="${escapeHTML(p.justificativa || '')}" placeholder="Justificativa (férias, atestado...)" oninput="atualizarJustificativaParticipanteCipa(${i}, this.value)" style="flex:1; min-width:180px; padding:5px 8px; border:1px solid var(--border); border-radius:6px; font-size:11.5px;">` : ''}
            <button class="db-clear-btn" style="padding:4px 8px; font-size:11px;" onclick="removerParticipanteCipa(${i})">✕</button>
        </div>`).join('');
}

function atualizarJustificativaParticipanteCipa(i, valor) {
    if (cipaReuniaoParticipantesAtual[i]) cipaReuniaoParticipantesAtual[i].justificativa = valor;
}

function toggleParticipanteCipa(i, checked) {
    if (!cipaReuniaoParticipantesAtual[i]) return;
    cipaReuniaoParticipantesAtual[i].presente = checked;
    // Sem isso, o campo de justificativa (que só aparece quando a pessoa está
    // desmarcada) nunca surgia na tela: o checkbox mudava visualmente, mas a lista
    // não era redesenhada pra mostrar/esconder o campo de texto ao lado.
    renderCipaParticipantesForm();
}

function removerParticipanteCipa(i) {
    cipaReuniaoParticipantesAtual.splice(i, 1);
    renderCipaParticipantesForm();
}

function adicionarParticipanteCipa() {
    const input = document.getElementById('cipaReuniaoForm_addParticipante');
    const raw = input.value.trim();
    if (!raw) return;
    const matricula = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
    const colab = allEfetivo.find(e => e.id === matricula);
    if (!colab) { alert('Colaborador não encontrado. Selecione um item da lista.'); return; }
    if (cipaReuniaoParticipantesAtual.some(p => p.matricula === matricula)) { input.value = ''; return; }
    cipaReuniaoParticipantesAtual.push({ matricula, nome: colab.nome, funcao: colab.funcao || '', presente: true });
    input.value = '';
    renderCipaParticipantesForm();
}

function abrirReuniaoCipa(id) {
    const form = document.getElementById('cipaReuniaoFormCard');
    const title = document.getElementById('cipaReuniaoFormTitle');
    const btnExcluir = document.getElementById('cipaReuniaoForm_btnExcluir');
    const btnRealizada = document.getElementById('cipaReuniaoForm_btnRealizada');
    const btnAta = document.getElementById('cipaReuniaoForm_btnAta');
    document.getElementById('cipaReuniaoFormStatus').textContent = '';
    form.dataset.id = id || '';
    popularCipaColabDatalist();

    if (id) {
        const r = allCipaReunioes.find(x => x.id === id);
        if (!r) return;
        title.textContent = `✏️ ${CIPA_TIPO_LABELS[r.tipo] || r.tipo}${r.numero_ordinaria ? ' nº ' + r.numero_ordinaria : ''}`;
        document.getElementById('cipaReuniaoForm_tipo').value = r.tipo;
        document.getElementById('cipaReuniaoForm_data').value = r.data_reuniao;
        document.getElementById('cipaReuniaoForm_horario').value = r.horario || '';
        document.getElementById('cipaReuniaoForm_horaTermino').value = r.hora_termino || '';
        document.getElementById('cipaReuniaoForm_local').value = r.local || '';
        document.getElementById('cipaReuniaoForm_cidadeUf').value = r.cidade_uf || '';
        document.getElementById('cipaReuniaoForm_modalidade').value = r.modalidade || 'presencial';
        document.getElementById('cipaReuniaoForm_descricao').value = r.descricao || '';
        document.getElementById('cipaReuniaoForm_quaseAcidentes').value = r.quase_acidentes_qtd ?? '';
        document.getElementById('cipaReuniaoForm_acidentesTrajeto').value = r.acidentes_trajeto_qtd ?? '';
        document.getElementById('cipaReuniaoForm_detalhamentoAcidentes').value = r.detalhamento_acidentes || '';
        document.getElementById('cipaReuniaoForm_acoesAssedio').value = r.acoes_assedio || '';
        document.getElementById('cipaReuniaoForm_relatoInspecoes').value = r.relato_inspecoes || '';
        cipaReuniaoPautaAtual = normalizarItensCipa(r.pauta).map(item => ({ ...item }));
        cipaReuniaoAssuntosAtual = normalizarItensCipa(r.assuntos_tratados).map(item => ({ ...item }));
        cipaReuniaoParticipantesAtual = (r.participantes && r.participantes.length > 0)
            ? r.participantes.map(p => ({ ...p }))
            : allCipaMembros.filter(m => m.ativo).map(m => ({ matricula: m.matricula, nome: m.nome, funcao: m.funcao || '', presente: true }));
        btnExcluir.style.display = 'inline-block';
        btnRealizada.style.display = r.status === 'agendada' ? 'inline-block' : 'none';
        btnAta.style.display = r.status === 'realizada' ? 'inline-block' : 'none';
        const btnAnexosReuniao = document.getElementById('cipaReuniaoForm_btnAnexos');
        if (btnAnexosReuniao) {
            btnAnexosReuniao.style.display = 'inline-block';
            btnAnexosReuniao.textContent = `📎 Anexos da Reunião${labelContagemAnexos('cipa_reunioes', id)}`;
        }
        renderCipaStatsAcidentes(periodoDesdeUltimaReuniaoCipa(r.id, r.data_reuniao));
    } else {
        title.textContent = '📅 Nova Reunião';
        document.getElementById('cipaReuniaoForm_tipo').value = 'extraordinaria';
        document.getElementById('cipaReuniaoForm_data').value = '';
        document.getElementById('cipaReuniaoForm_horario').value = '';
        document.getElementById('cipaReuniaoForm_horaTermino').value = '';
        document.getElementById('cipaReuniaoForm_local').value = 'Canteiro Central';
        document.getElementById('cipaReuniaoForm_cidadeUf').value = '';
        document.getElementById('cipaReuniaoForm_modalidade').value = 'presencial';
        document.getElementById('cipaReuniaoForm_descricao').value = '';
        document.getElementById('cipaReuniaoForm_quaseAcidentes').value = '';
        document.getElementById('cipaReuniaoForm_acidentesTrajeto').value = '';
        document.getElementById('cipaReuniaoForm_detalhamentoAcidentes').value = '';
        document.getElementById('cipaReuniaoForm_acoesAssedio').value = '';
        document.getElementById('cipaReuniaoForm_relatoInspecoes').value = '';
        cipaReuniaoPautaAtual = [];
        cipaReuniaoAssuntosAtual = [];
        cipaReuniaoParticipantesAtual = allCipaMembros.filter(m => m.ativo).map(m => ({ matricula: m.matricula, nome: m.nome, funcao: m.funcao || '', presente: true }));
        btnExcluir.style.display = 'none';
        btnRealizada.style.display = 'none';
        btnAta.style.display = 'none';
        const btnAnexosReuniao = document.getElementById('cipaReuniaoForm_btnAnexos');
        if (btnAnexosReuniao) btnAnexosReuniao.style.display = 'none';
        document.getElementById('cipaReuniaoForm_statsAcidentes').innerHTML = '';
    }
    document.getElementById('cipaReuniaoForm_addPauta').value = '';
    document.getElementById('cipaReuniaoForm_addAssuntoTexto').value = '';
    document.getElementById('cipaReuniaoForm_addAssuntoResposta').value = '';
    document.getElementById('cipaReuniaoForm_addAssuntoResponsavel').value = '';
    cipaAssuntoEditandoIndex = null;
    renderCipaPautaForm();
    renderCipaAssuntosForm();
    renderCipaParticipantesForm();
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function atualizarStatsAcidentesCipaForm() {
    const idAtual = document.getElementById('cipaReuniaoFormCard').dataset.id;
    const data = document.getElementById('cipaReuniaoForm_data').value;
    if (!data) return;
    renderCipaStatsAcidentes(periodoDesdeUltimaReuniaoCipa(idAtual, data));
}

function renderCipaStatsAcidentes(periodo) {
    const container = document.getElementById('cipaReuniaoForm_statsAcidentes');
    if (!container) return;
    const stats = calcularAcidentesPeriodo(periodo.inicio, periodo.fim);
    container.innerHTML = `Período considerado: <b>${formatSimpleDate(periodo.inicio.toISOString().slice(0, 10))} a ${formatSimpleDate(periodo.fim.toISOString().slice(0, 10))}</b> — ` +
        `CPT (com afastamento): <b>${stats.cpt}</b> · SPT (sem afastamento): <b>${stats.spt}</b> · Total: <b>${stats.total}</b>`;
}

function fecharReuniaoCipa() {
    const form = document.getElementById('cipaReuniaoFormCard');
    if (form) form.style.display = 'none';
    const btnAnexos = document.getElementById('cipaReuniaoForm_btnAnexos');
    if (btnAnexos) btnAnexos.style.display = 'none';
}

function abrirAnexoReuniaoCipaAtual() {
    const form = document.getElementById('cipaReuniaoFormCard');
    const id = form?.dataset.id;
    if (!id) return;
    const r = allCipaReunioes.find(x => x.id === id);
    const desc = r ? `Reunião CIPA (${CIPA_TIPO_LABELS[r.tipo] || r.tipo}) — ${formatSimpleDate(r.data_reuniao)}` : 'Reunião CIPA';
    abrirAnexoModal('cipa_reunioes', id, desc);
}

async function salvarReuniaoCipa(marcarRealizada) {
    if (bloquearEdicaoSeNaoAutorizado('cipa')) return;
    const statusEl = document.getElementById('cipaReuniaoFormStatus');
    const idAtual = document.getElementById('cipaReuniaoFormCard').dataset.id;
    const tipo = document.getElementById('cipaReuniaoForm_tipo').value;
    const data = document.getElementById('cipaReuniaoForm_data').value;
    if (!data) {
        statusEl.textContent = '❌ Informe a data da reunião.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const existente = idAtual ? allCipaReunioes.find(r => r.id === idAtual) : null;
    let numeroOrdinaria = existente ? existente.numero_ordinaria : null;
    if (tipo === 'ordinaria' && !numeroOrdinaria) {
        const maxAtual = allCipaReunioes.filter(r => r.tipo === 'ordinaria' && r.numero_ordinaria).reduce((max, r) => Math.max(max, r.numero_ordinaria), 0);
        numeroOrdinaria = maxAtual + 1;
    } else if (tipo !== 'ordinaria') {
        numeroOrdinaria = null;
    }
    const id = idAtual || `REUNIAO_${data}`;
    const quaseAcidentesStr = document.getElementById('cipaReuniaoForm_quaseAcidentes').value;
    const acidentesTrajetoStr = document.getElementById('cipaReuniaoForm_acidentesTrajeto').value;
    const row = {
        id,
        tipo,
        numero_ordinaria: numeroOrdinaria,
        data_reuniao: data,
        horario: document.getElementById('cipaReuniaoForm_horario').value || null,
        hora_termino: document.getElementById('cipaReuniaoForm_horaTermino').value || null,
        local: document.getElementById('cipaReuniaoForm_local').value.trim() || null,
        cidade_uf: document.getElementById('cipaReuniaoForm_cidadeUf').value.trim() || null,
        modalidade: document.getElementById('cipaReuniaoForm_modalidade').value,
        descricao: document.getElementById('cipaReuniaoForm_descricao').value.trim() || null,
        pauta: cipaReuniaoPautaAtual,
        assuntos_tratados: cipaReuniaoAssuntosAtual,
        quase_acidentes_qtd: quaseAcidentesStr !== '' ? parseInt(quaseAcidentesStr, 10) : null,
        acidentes_trajeto_qtd: acidentesTrajetoStr !== '' ? parseInt(acidentesTrajetoStr, 10) : null,
        detalhamento_acidentes: document.getElementById('cipaReuniaoForm_detalhamentoAcidentes').value.trim() || null,
        acoes_assedio: document.getElementById('cipaReuniaoForm_acoesAssedio').value.trim() || null,
        relato_inspecoes: document.getElementById('cipaReuniaoForm_relatoInspecoes').value.trim() || null,
        status: marcarRealizada ? 'realizada' : (existente ? existente.status : 'agendada'),
        participantes: cipaReuniaoParticipantesAtual
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('cipa_reunioes', [row]);
        document.getElementById('cipaReuniaoFormCard').dataset.id = id;
        const idx = allCipaReunioes.findIndex(r => r.id === id);
        if (idx >= 0) allCipaReunioes[idx] = { ...allCipaReunioes[idx], ...row };
        else allCipaReunioes.push(row);
        renderCipaReunioesLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        if (marcarRealizada) {
            abrirReuniaoCipa(id);
        } else {
            setTimeout(() => fecharReuniaoCipa(), 900);
        }
    } catch (err) {
        console.error('Erro ao salvar reunião da CIPA:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirReuniaoCipaAtual() {
    if (bloquearEdicaoSeNaoAutorizado('cipa')) return;
    const id = document.getElementById('cipaReuniaoFormCard').dataset.id;
    if (!id) return;
    if (!confirm('Excluir esta reunião? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('cipaReuniaoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('cipa_reunioes', id);
        allCipaReunioes = allCipaReunioes.filter(r => r.id !== id);
        renderCipaReunioesLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharReuniaoCipa(), 900);
    } catch (err) {
        console.error('Erro ao excluir reunião da CIPA:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Gerador de Ata (mesmo padrão Blob+<a> do Registro de Treinamento/Ficha de EPI) ----

function formatarDataExtensoCipa(dateStr) {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    return `${d.getDate()} DE ${NOMES_MESES[d.getMonth()].toUpperCase()} DE ${d.getFullYear()}`;
}

async function gerarAtaCipa() {
    const id = document.getElementById('cipaReuniaoFormCard').dataset.id;
    const salvo = allCipaReunioes.find(x => x.id === id);
    if (!salvo) return;

    // Usa os valores que estão na tela AGORA, não só o que já foi salvo no banco - sem
    // isso, editar Presença/Pauta/Assuntos e clicar em "Gerar Ata" sem clicar em "Salvar"
    // antes gerava a ata com os dados de ANTES da edição (achado real: participante
    // removido da lista de Presença continuava aparecendo na ata como "Ausência
    // Injustificada", porque a geração lia allCipaReunioes - a cópia já salva - em vez do
    // rascunho em edição). Mesma lista de campos que salvarReuniaoCipa() grava, só que
    // sem salvar nada - é só um "retrato" do formulário aberto agora.
    const quaseAcidentesStrAta = document.getElementById('cipaReuniaoForm_quaseAcidentes').value;
    const acidentesTrajetoStrAta = document.getElementById('cipaReuniaoForm_acidentesTrajeto').value;
    const r = {
        ...salvo,
        tipo: document.getElementById('cipaReuniaoForm_tipo').value,
        data_reuniao: document.getElementById('cipaReuniaoForm_data').value,
        horario: document.getElementById('cipaReuniaoForm_horario').value || null,
        hora_termino: document.getElementById('cipaReuniaoForm_horaTermino').value || null,
        local: document.getElementById('cipaReuniaoForm_local').value.trim() || null,
        cidade_uf: document.getElementById('cipaReuniaoForm_cidadeUf').value.trim() || null,
        modalidade: document.getElementById('cipaReuniaoForm_modalidade').value,
        descricao: document.getElementById('cipaReuniaoForm_descricao').value.trim() || null,
        pauta: cipaReuniaoPautaAtual,
        assuntos_tratados: cipaReuniaoAssuntosAtual,
        quase_acidentes_qtd: quaseAcidentesStrAta !== '' ? parseInt(quaseAcidentesStrAta, 10) : null,
        acidentes_trajeto_qtd: acidentesTrajetoStrAta !== '' ? parseInt(acidentesTrajetoStrAta, 10) : null,
        detalhamento_acidentes: document.getElementById('cipaReuniaoForm_detalhamentoAcidentes').value.trim() || null,
        acoes_assedio: document.getElementById('cipaReuniaoForm_acoesAssedio').value.trim() || null,
        relato_inspecoes: document.getElementById('cipaReuniaoForm_relatoInspecoes').value.trim() || null,
        participantes: cipaReuniaoParticipantesAtual
    };

    await garantirDocumentosControleCarregados();
    const codigoAta = codigoRevisaoDocumento('ata_cipa');

    const participantes = r.participantes || [];
    const presentes = participantes.filter(p => p.presente);
    const ausentes = participantes.filter(p => !p.presente);

    // Seção 2: cada participante é casado com o cadastro de Membros da CIPA (por
    // matrícula) pra saber cargo/papel; quem não bate com nenhum membro cadastrado vira
    // "convidado/especialista" - mesma distinção que o modelo em papel usa.
    const membroDoParticipante = p => allCipaMembros.find(m => m.matricula && m.matricula === p.matricula);
    const linhaMembro = p => {
        const m = membroDoParticipante(p);
        const papelLabel = m?.papel ? ` (${CIPA_PAPEL_LABELS[m.papel]})` : '';
        return `<li>${escapeHTML(p.nome)}${papelLabel}</li>`;
    };
    // Suplentes normalmente não têm um "papel" especial (presidente/vice/secretário),
    // então sem isso o nome saía sem nenhuma indicação de representação na ata. Aqui
    // mostramos o cargo estrutural (Suplente - Empregados/Empregador) quando não há
    // papel especial, do mesmo jeito que já aparece no cadastro de Membros da CIPA.
    const linhaSuplente = p => {
        const m = membroDoParticipante(p);
        const label = m?.papel ? ` (${CIPA_PAPEL_LABELS[m.papel]})` : (m?.cargo ? ` (${CIPA_CARGO_LABELS[m.cargo]})` : '');
        return `<li>${escapeHTML(p.nome)}${label}</li>`;
    };
    const gruposPresentes = {
        titular_empregador: presentes.filter(p => membroDoParticipante(p)?.cargo === 'titular_empregador'),
        titular_empregado: presentes.filter(p => membroDoParticipante(p)?.cargo === 'titular_empregado'),
        suplente_empregado: presentes.filter(p => membroDoParticipante(p)?.cargo === 'suplente_empregado'),
        suplente_empregador: presentes.filter(p => membroDoParticipante(p)?.cargo === 'suplente_empregador'),
        convidados: presentes.filter(p => !membroDoParticipante(p))
    };

    const linhasAusentes = ausentes.map(p => `<li>${escapeHTML(p.nome)} — ${escapeHTML(p.justificativa || 'Justificativa não informada')}</li>`).join('');

    const itensPauta = normalizarItensCipa(r.pauta);
    const listaPauta = itensPauta.map(item => `<li>${escapeHTML(item.texto || '')}</li>`).join('');

    const itensAssuntos = normalizarItensCipa(r.assuntos_tratados);
    const linhasAssuntos = itensAssuntos.map((item, i) => `<tr>
        <td style="text-align:center; width:40px;">${String(i + 1).padStart(2, '0')}</td>
        <td>${escapeHTML(item.texto || '')}</td>
        <td>${escapeHTML(item.resposta || '')}</td>
        <td>${escapeHTML(item.responsavel || '')}</td>
    </tr>`).join('');

    // Seção 4.1: CPT/SPT vêm de dados reais do módulo Acidentabilidade no período desde
    // a última reunião realizada; quase-acidente/trajeto são os campos manuais do
    // formulário, já que a tabela `acidentes` não distingue esses dois casos.
    const periodo = periodoDesdeUltimaReuniaoCipa(r.id, r.data_reuniao);
    const statsAcidentes = calcularAcidentesPeriodo(periodo.inicio, periodo.fim);

    // Seção 5: matriz 5W2H com as pendências de Plano de Ação abertas nesta reunião.
    const pendenciasDaReuniao = allCipaPlanoAcao.filter(p => p.reuniao_id === r.id);
    const linhasPlanoAcao = pendenciasDaReuniao.map((p, i) => `<tr>
        <td style="text-align:center; width:60px;">ACT-${String(i + 1).padStart(2, '0')}</td>
        <td>${escapeHTML(p.descricao || '')}</td>
        <td>${escapeHTML(p.observacoes || '')}</td>
        <td>${escapeHTML(p.responsavel || '')}</td>
        <td style="text-align:center; width:90px;">${formatSimpleDate(p.prazo)}</td>
        <td style="text-align:center; width:100px;">${PLANO_ACAO_STATUS_LABELS[p.status] || p.status || ''}</td>
    </tr>`).join('');

    // Seção 7: Presidente/Vice-Presidente/Secretário são localizados pelo papel
    // cadastrado em Membros da CIPA (entre quem esteve presente nesta reunião).
    const presidente = presentes.find(p => membroDoParticipante(p)?.papel === 'presidente');
    const vicePresidente = presentes.find(p => membroDoParticipante(p)?.papel === 'vice_presidente');
    const secretario = presentes.find(p => membroDoParticipante(p)?.papel === 'secretario');
    const idsComPapelNomeado = [presidente, vicePresidente, secretario].filter(Boolean).map(p => p.matricula);
    const demaisPresentes = presentes.filter(p => !idsComPapelNomeado.includes(p.matricula) || !p.matricula);

    const tituloReuniao = `ATA DE REUNIÃO ${(r.tipo === 'extraordinaria' ? 'EXTRAORDINÁRIA' : r.tipo === 'posse' ? 'DE POSSE' : 'ORDINÁRIA')}${r.numero_ordinaria ? ' Nº ' + String(r.numero_ordinaria).padStart(2, '0') + '/' + parseLocalDate(r.data_reuniao).getFullYear() : ''}`;
    const modalidadeLabel = r.modalidade === 'videoconferencia' ? 'Videoconferência' : 'Presencial';

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${escapeHTML(tituloReuniao)} - ${formatSimpleDate(r.data_reuniao)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    .folha { max-width: 1000px; margin: 0 auto; border: 2px solid #000; }
    .cabecalho { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 160px; padding: 8px 10px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo-wrap { flex: 1; text-align: center; padding: 8px 10px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .cabecalho .titulo { font-weight: 700; font-size: 14px; }
    .cabecalho .subtitulo { font-size: 11px; color: #444; margin-top: 2px; }
    .cabecalho .codigo { width: 120px; padding: 8px 10px; border-left: 2px solid #000; text-align: center; font-weight: 700; font-size: 11px; display:flex; align-items:center; justify-content:center; }
    .secao-titulo { font-weight: 700; font-size: 12.5px; background: #d9d9d9; padding: 6px 10px; border-bottom: 1px solid #000; border-top: 2px solid #000; }
    .subsecao-titulo { font-weight: 700; font-size: 12px; padding: 8px 10px 2px; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 6px 10px; border-right: 1px solid #000; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 4px; }
    .campo-titulo { font-weight: 700; text-align: center; }
    .bloco-texto { padding: 4px 10px 10px; white-space: pre-line; min-height: 16px; }
    .lista { padding: 4px 10px 10px 28px; margin: 0; }
    .lista li { margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px 6px; font-size: 11px; }
    th { background: #e5e5e5; font-size: 10.5px; }
    .clausula { padding: 8px 10px; font-size: 11px; text-align: justify; border-bottom: 1px solid #ccc; }
    .clausula b { display:block; margin-bottom: 3px; }
    .fecho { padding: 10px; font-size: 12px; }
    .assinaturas { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 10px; }
    .assinatura-item { width: 220px; text-align: center; font-size: 11px; }
    .assinatura-item .linha-assinatura { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <div class="logo"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:56px; object-fit:contain;"></div>
            <div class="titulo-wrap">
                <div class="titulo">${escapeHTML(tituloReuniao)}</div>
                <div class="subtitulo">COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES E ASSÉDIO — CIPA${allCipaMembros.some(m => m.gestao) ? ' — GESTÃO ' + escapeHTML(allCipaMembros.find(m => m.gestao)?.gestao || '') : ''}</div>
            </div>
            ${codigoAta ? `<div class="codigo">${escapeHTML(codigoAta)}</div>` : ''}
        </div>

        <div class="secao-titulo">1. IDENTIFICAÇÃO E CONTEXTO</div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Razão Social:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</div>
            <div class="campo"><b>CNAE:</b> ${escapeHTML(EMPRESA_INFO.cnaePrincipal)}</div>
            <div class="campo"><b>Grau de Risco:</b> ${escapeHTML(EMPRESA_INFO.grauRisco) || '(não informado)'}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Unidade/Estabelecimento:</b> Ramal do Agreste${r.local ? ' — ' + escapeHTML(r.local) : ''}</div>
            <div class="campo"><b>Modalidade:</b> ${modalidadeLabel}</div>
        </div>
        <div class="linha">
            <div class="campo"><b>Data:</b> ${formatSimpleDate(r.data_reuniao)}</div>
            <div class="campo"><b>Horário:</b> ${escapeHTML(r.horario || '')}${r.hora_termino ? ' às ' + escapeHTML(r.hora_termino) : ''}</div>
            <div class="campo"><b>Cidade/UF:</b> ${escapeHTML(r.cidade_uf || '')}</div>
        </div>
        ${r.descricao ? `<div class="linha"><div class="campo"><b>Descrição:</b> ${escapeHTML(r.descricao)}</div></div>` : ''}

        <div class="secao-titulo">2. REGISTRO DE PRESENÇAS E QUORUM (NR-5.6.3)</div>
        <div class="subsecao-titulo">Membros Efetivos Presentes (Representantes do Empregador):</div>
        <ol class="lista">${gruposPresentes.titular_empregador.map(linhaMembro).join('') || '<li style="color:#888;">Nenhum</li>'}</ol>
        <div class="subsecao-titulo">Membros Efetivos Presentes (Representantes dos Empregados):</div>
        <ol class="lista">${gruposPresentes.titular_empregado.map(linhaMembro).join('') || '<li style="color:#888;">Nenhum</li>'}</ol>
        <div class="subsecao-titulo">Suplentes / Convidados / Especialistas:</div>
        <ul class="lista">${gruposPresentes.suplente_empregado.map(linhaSuplente).join('')}${gruposPresentes.suplente_empregador.map(linhaSuplente).join('')}${gruposPresentes.convidados.map(p => `<li>${escapeHTML(p.nome)} — ${escapeHTML(p.funcao || 'Convidado(a)')}</li>`).join('') || (gruposPresentes.suplente_empregado.length + gruposPresentes.suplente_empregador.length === 0 ? '<li style="color:#888;">Nenhum</li>' : '')}</ul>
        <div class="subsecao-titulo">Ausências Justificadas / Injustificadas:</div>
        <ul class="lista">${linhasAusentes || '<li style="color:#888;">Nenhuma</li>'}</ul>

        <div class="secao-titulo">3. PAUTA DA REUNIÃO</div>
        <ol class="lista">${listaPauta || '<li style="color:#888;">Nenhum item de pauta registrado</li>'}</ol>

        <div class="secao-titulo">4. DELIBERAÇÕES E REGISTRO DAS DISCUSSÕES</div>
        <div class="subsecao-titulo">4.1 Análise de Acidentes e Incidentes</div>
        <div class="bloco-texto">No período de ${formatSimpleDate(periodo.inicio.toISOString().slice(0, 10))} a ${formatSimpleDate(periodo.fim.toISOString().slice(0, 10))}, foram registrados:<br>
        • Acidentes CPT (Com Perda de Tempo): ${statsAcidentes.cpt} | SPT (Sem Perda de Tempo): ${statsAcidentes.spt}<br>
        • Quase-Acidentes (Near Miss): ${r.quase_acidentes_qtd ?? '(não informado)'} | Acidentes de Trajeto: ${r.acidentes_trajeto_qtd ?? '(não informado)'}<br>
        • Detalhamento das Análises: ${escapeHTML(r.detalhamento_acidentes || '(nenhum registro adicional)')}</div>
        <div class="subsecao-titulo">4.2 Ações de Combate ao Assédio e Outras Formas de Violência</div>
        <div class="bloco-texto">${escapeHTML(r.acoes_assedio || '(nenhum registro nesta reunião)')}</div>
        <div class="subsecao-titulo">4.3 Relato das Inspeções de Campo</div>
        <div class="bloco-texto">${escapeHTML(r.relato_inspecoes || '(nenhum registro nesta reunião)')}</div>
        <div class="subsecao-titulo">4.4 Outros Assuntos Tratados</div>
        <table>
            <thead><tr><th style="width:40px;">Nº</th><th>ASSUNTO</th><th style="width:220px;">RESPOSTA</th><th style="width:150px;">RESPONSÁVEL</th></tr></thead>
            <tbody>${linhasAssuntos || '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhum assunto adicional registrado</td></tr>'}</tbody>
        </table>

        <div class="secao-titulo">5. PLANO DE AÇÃO MATRIZ (5W2H)</div>
        <table>
            <thead><tr><th>ID</th><th>Descrição da Inconformidade / Risco</th><th>Medida Preventiva / Corretiva</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
            <tbody>${linhasPlanoAcao || '<tr><td colspan="6" style="text-align:center; color:#888;">Nenhuma pendência aberta nesta reunião</td></tr>'}</tbody>
        </table>

        <div class="secao-titulo">6. CLÁUSULAS DE RESGUARDO JURÍDICO E COMPLIANCE</div>
        <div class="clausula"><b>6.1. Autonomia de Manifestação e Rastreabilidade das Denúncias:</b>Fica consignado que todos os membros presentes tiveram livre palavra para expor condições de risco e propor melhorias. Todas as solicitações de intervenção em ambientes de trabalho foram devidamente protocoladas e encaminhadas à gestão de SST/Diretoria para viabilidade técnica e orçamentária.</div>
        <div class="clausula"><b>6.2. Proteção de Dados e Sigilo (LGPD — Lei 13.709/18):</b>Os dados pessoais e eventuais dados sensíveis de trabalhadores envolvidos em acidentes ou denúncias citados nesta reunião são tratados sob estrito sigilo funcional, sendo vedada a divulgação pública de nomes ou prontuários médicos nesta ata.</div>
        <div class="clausula"><b>6.3. Ciência da Representação Operacional:</b>A comissão valida que as inspeções realizadas cobrem as condições reais de trabalho e que eventuais recusas de trabalho fundamentadas (NR-1) registradas pelos empregados foram tratadas com a devida prioridade técnica.</div>

        <div class="secao-titulo">7. ENCERRAMENTO E ASSINATURAS</div>
        <div class="fecho">
            Nada mais havendo a tratar, a reunião foi encerrada às ${r.hora_termino ? escapeHTML(r.hora_termino) : '(horário de término não informado)'}, sendo a presente ata lavrada por mim, ${escapeHTML(secretario?.nome || 'Secretário(a) da CIPA')}, lida, aprovada e assinada pelos membros presentes.<br><br>
            ${escapeHTML(r.cidade_uf || '_____________________')}, ${formatarDataExtensoCipa(r.data_reuniao)}.
        </div>
        <div class="assinaturas">
            ${presidente ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(presidente.nome)} — Presidente da CIPA</div></div>` : ''}
            ${vicePresidente ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(vicePresidente.nome)} — Vice-Presidente da CIPA</div></div>` : ''}
            ${secretario ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(secretario.nome)} — Secretário(a) da CIPA</div></div>` : ''}
            ${demaisPresentes.map(p => `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.nome)}</div></div>`).join('')}
        </div>
    </div>
</body></html>`;

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

    registrarEmissaoDocumento('ata_cipa', `${tituloReuniao} — ${formatSimpleDate(r.data_reuniao)}`);
}

// ---- Processo Eleitoral (NR-5) ----
// Módulo adicionado em 2026-09-18: acompanha o ciclo eleitoral da CIPA (edital,
// inscrições, votação, apuração, posse) e gera os documentos oficiais do processo.
// O Termo de Posse é sempre gerado a partir de quem está ATIVO hoje em
// cipa_membros/allCipaMembros - não é uma foto congelada do dia da posse original -
// então, se a composição da CIPA mudar depois, regerar o Termo já reflete a mudança.

let allCipaProcessosEleitorais = [];
let allCipaCandidatos = [];

const CIPA_RESULTADO_LABELS = { titular: 'Titular (eleito)', suplente: 'Suplente (eleito)', nao_eleito: 'Não eleito' };
const CIPA_PROCESSO_STATUS_LABELS = {
    planejamento: '🗓️ Planejamento',
    inscricoes_abertas: '📝 Inscrições Abertas',
    inscricoes_encerradas: '🔒 Inscrições Encerradas',
    votacao_realizada: '🗳️ Votação Realizada',
    concluido: '✅ Concluído'
};

// Quadro I - Dimensionamento da CIPA (NR-5), conferido linha por linha contra o texto
// oficial da norma (NR-05, versão atualizada pela Portaria MTP nº 4.219/2022, item
// "Quadro I – Dimensionamento da CIPA") em 2026-09-18 - já houve tentativa anterior de
// extrair essa tabela por busca automática na internet e os números vieram
// contraditórios entre fontes, então desta vez foi conferido direto no PDF oficial do
// governo (baixado e lido com pdftotext + conferência visual da página renderizada).
// Cada array é por faixa de nº de empregados, na mesma ordem de QUADRO_I_FAIXAS;
// null = grau de risco não exige CIPA formal nessa faixa (aplica-se o item 5.4.13 da
// NR-5 - designação de 1 representante da organização, sem processo eletivo).
// "acrescentar" = incremento por grupo de 2.500 empregados acima de 10.000.
const QUADRO_I_FAIXAS = [19, 29, 50, 80, 100, 120, 140, 300, 500, 1000, 2500, 5000, 10000];
const QUADRO_I_DIMENSIONAMENTO = {
    '1': { efetivos: [null, null, null, null, 1, 1, 1, 1, 2, 4, 5, 6, 8], suplentes: [null, null, null, null, 1, 1, 1, 1, 2, 3, 4, 5, 6], acrescentar: 1 },
    '2': { efetivos: [null, null, null, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10], suplentes: [null, null, null, 1, 1, 1, 1, 2, 3, 4, 5, 6, 8], acrescentar: 1 },
    '3': { efetivos: [null, 1, 1, 2, 2, 2, 3, 4, 5, 6, 8, 10, 12], suplentes: [null, 1, 1, 1, 1, 1, 2, 2, 4, 4, 6, 8, 8], acrescentar: 2 },
    '4': { efetivos: [null, 1, 2, 3, 3, 4, 4, 4, 5, 6, 9, 11, 13], suplentes: [null, 1, 1, 2, 2, 2, 2, 3, 4, 5, 7, 8, 10], acrescentar: 2 }
};

// Retorna { faixaLabel, efetivos, suplentes } para o grau de risco e nº de empregados
// informados, ou null se os dados de entrada forem inválidos. efetivos/suplentes vêm
// null quando a faixa não exige CIPA formal (grau de risco 1, 2 ou 3 com poucos
// empregados) - a tela mostra isso como "não exige CIPA formal (NR-5, item 5.4.13)".
function calcularDimensionamentoCipaQuadroI(grauRisco, totalFuncionarios) {
    const dim = QUADRO_I_DIMENSIONAMENTO[String(grauRisco)];
    if (!dim || !totalFuncionarios || totalFuncionarios <= 0) return null;
    if (totalFuncionarios > 10000) {
        const gruposAcima = Math.ceil((totalFuncionarios - 10000) / 2500);
        const baseEfetivos = dim.efetivos[dim.efetivos.length - 1];
        const baseSuplentes = dim.suplentes[dim.suplentes.length - 1];
        return {
            faixaLabel: `Acima de 10.000 (+ ${gruposAcima} grupo(s) de 2.500)`,
            efetivos: baseEfetivos + gruposAcima * dim.acrescentar,
            suplentes: baseSuplentes + gruposAcima * dim.acrescentar
        };
    }
    for (let i = 0; i < QUADRO_I_FAIXAS.length; i++) {
        if (totalFuncionarios <= QUADRO_I_FAIXAS[i]) {
            const efetivos = dim.efetivos[i];
            const suplentes = dim.suplentes[i];
            const faixaMin = i === 0 ? 0 : QUADRO_I_FAIXAS[i - 1] + 1;
            const faixaLabel = `${faixaMin} a ${QUADRO_I_FAIXAS[i]} empregados`;
            return { faixaLabel, efetivos, suplentes };
        }
    }
    return null;
}

async function loadCipaProcessoEleitoralData() {
    try {
        const [processos, candidatos] = await Promise.all([
            supabaseFetch('cipa_processos_eleitorais', '?select=*'),
            supabaseFetch('cipa_candidatos', '?select=*')
        ]);
        allCipaProcessosEleitorais = processos;
        allCipaCandidatos = candidatos;
        renderCipaEleicao();
    } catch (err) {
        console.error('Erro ao carregar processo eleitoral da CIPA:', err);
    }
}

function processoEleitoralAtual() {
    const select = document.getElementById('cipaProcessoSelect');
    if (!select || !select.value) return null;
    return allCipaProcessosEleitorais.find(p => p.id === select.value) || null;
}

const CIPA_PROCESSO_CAMPO_COL = {
    gestao: 'gestao', dataInicioGestao: 'data_inicio_gestao', dataFimGestao: 'data_fim_gestao',
    dataEditalConvocacao: 'data_edital_convocacao', dataEditalInscricao: 'data_edital_inscricao',
    dataInicioInscricoes: 'data_inicio_inscricoes', dataFimInscricoes: 'data_fim_inscricoes',
    dataEditalInscritos: 'data_edital_inscritos', dataEleicao: 'data_eleicao',
    horarioVotacaoInicio: 'horario_votacao_inicio', horarioVotacaoFim: 'horario_votacao_fim',
    horarioVotacaoNoturnoInicio: 'horario_votacao_noturno_inicio', horarioVotacaoNoturnoFim: 'horario_votacao_noturno_fim',
    localVotacao: 'local_votacao', dataApuracao: 'data_apuracao', horarioApuracao: 'horario_apuracao',
    dataPosse: 'data_posse', cidadeUf: 'cidade_uf', totalFuncionarios: 'total_funcionarios',
    totalVotantes: 'total_votantes', percentualParticipacao: 'percentual_participacao',
    presidenteComissao: 'presidente_comissao', secretarioComissao: 'secretario_comissao',
    membroComissao: 'membro_comissao', status: 'status', observacoes: 'observacoes'
};

function renderCipaEleicao() {
    const select = document.getElementById('cipaProcessoSelect');
    if (!select) return;
    const idAnterior = select.value;
    const ordenados = allCipaProcessosEleitorais.slice().sort((a, b) => (b.gestao || '').localeCompare(a.gestao || ''));
    select.innerHTML = ordenados.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.gestao)} — ${CIPA_PROCESSO_STATUS_LABELS[p.status] || p.status || ''}</option>`).join('');
    const idParaMostrar = ordenados.some(p => p.id === idAnterior) ? idAnterior : (ordenados[0]?.id || '');
    select.value = idParaMostrar;
    carregarFormProcessoEleitoral(idParaMostrar);
    renderQuadroIReferencia();
    renderCipaCandidatosLista();
}

// =========================================================================
// ASSISTENTE INTELIGENTE DE CRONOGRAMA ELEITORAL DA CIPA (NR-05)
// =========================================================================

let cipaUltimoCronogramaCalculado = null;

const DIAS_SEMANA_NOMES_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function cipaParseDataLocal(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.trim().split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d, 12, 0, 0);
}

function cipaFormatDateInput(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function cipaFormatDateBR(d) {
    if (!d || isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
}

function cipaAdicionarDias(d, numDias) {
    const res = new Date(d.getTime());
    res.setDate(res.getDate() + numDias);
    return res;
}

function cipaAjustarDiaUtil(d, direcao = 'anterior') {
    const original = new Date(d.getTime());
    const dayOfWeek = original.getDay(); // 0 = Dom, 6 = Sáb
    let ajustada = new Date(d.getTime());
    let ajustado = false;
    let motivo = '';

    if (dayOfWeek === 6) { // Sábado
        ajustado = true;
        if (direcao === 'anterior') {
            ajustada.setDate(ajustada.getDate() - 1); // Sexta-feira
            motivo = 'Caiu no Sábado ➡️ Antecipado para Sexta-feira útil';
        } else {
            ajustada.setDate(ajustada.getDate() + 2); // Segunda-feira
            motivo = 'Caiu no Sábado ➡️ Prorrogado para Segunda-feira útil';
        }
    } else if (dayOfWeek === 0) { // Domingo
        ajustado = true;
        if (direcao === 'anterior') {
            ajustada.setDate(ajustada.getDate() - 2); // Sexta-feira
            motivo = 'Caiu no Domingo ➡️ Antecipado para Sexta-feira útil';
        } else {
            ajustada.setDate(ajustada.getDate() + 1); // Segunda-feira
            motivo = 'Caiu no Domingo ➡️ Prorrogado para Segunda-feira útil';
        }
    }

    return {
        dataOriginal: original,
        data: ajustada,
        ajustado,
        motivo,
        diaOriginalNome: DIAS_SEMANA_NOMES_PT[dayOfWeek],
        diaFinalNome: DIAS_SEMANA_NOMES_PT[ajustada.getDay()]
    };
}

function atualizarLabelDataBaseCipa() {
    const tipo = document.getElementById('cipaCronograma_tipoCalculo')?.value || 'fim';
    const label = document.getElementById('cipaCronograma_labelDataBase');
    const input = document.getElementById('cipaCronograma_dataBase');
    if (!label) return;

    if (tipo === 'fim') {
        label.textContent = 'Data da Posse / Fim do Mandato *';
        const p = processoEleitoralAtual();
        if (input && (!input.value || input.value === p?.data_edital_convocacao)) {
            input.value = p?.data_posse || p?.data_fim_gestao || '';
        }
    } else {
        label.textContent = 'Data de Convocação da Eleição *';
        const p = processoEleitoralAtual();
        if (input && (!input.value || input.value === p?.data_posse || input.value === p?.data_fim_gestao)) {
            input.value = p?.data_edital_convocacao || '';
        }
    }
}

function calcularCronogramaCipaNR05(tipo, dataBaseStr) {
    const dataBase = cipaParseDataLocal(dataBaseStr);
    if (!dataBase) return null;

    let etapas = [];
    let datasForm = {};

    if (tipo === 'fim') {
        // Cálculo Regressivo baseado na Posse / Fim do Mandato anterior
        const infoPosse = cipaAjustarDiaUtil(dataBase, 'posterior');
        const dataPosse = infoPosse.data;

        // 1. Convocação: Mínimo 60 dias antes da posse (Item 5.5.1 'a')
        const rawConvocacao = cipaAdicionarDias(dataPosse, -60);
        const infoConvocacao = cipaAjustarDiaUtil(rawConvocacao, 'anterior');

        // 2. Comissão Eleitoral: Mínimo 55 dias antes da posse (Item 5.5.1 'b')
        const rawComissao = cipaAdicionarDias(dataPosse, -55);
        const infoComissao = cipaAjustarDiaUtil(rawComissao, 'anterior');

        // 3. Edital de Abertura / Início Inscrições: Mínimo 45 dias antes da posse (Item 5.5.1 'c')
        // Adotamos 50 dias antes da posse para que as inscrições durem 15 dias corridos e terminem a 35 dias da posse,
        // garantindo prazo seguro para homologação e campanha antes da eleição (30 dias antes).
        const rawInscricao = cipaAdicionarDias(dataPosse, -50);
        const infoInscricao = cipaAjustarDiaUtil(rawInscricao, 'anterior');

        // 4. Encerramento das Inscrições: Mínimo 15 dias corridos (Item 5.5.1 'd')
        const rawFimInscricao = cipaAdicionarDias(infoInscricao.data, 14);
        const infoFimInscricao = cipaAjustarDiaUtil(rawFimInscricao, 'posterior');

        // 5. Homologação / Edital de Inscritos: 1º dia útil após fim das inscrições (Item 5.5.1 'e')
        const rawEditalInscritos = cipaAdicionarDias(infoFimInscricao.data, 1);
        const infoEditalInscritos = cipaAjustarDiaUtil(rawEditalInscritos, 'posterior');

        // 6. Eleição: Mínimo 30 dias antes do término do mandato (Item 5.5.1 'f')
        const rawEleicao = cipaAdicionarDias(dataPosse, -30);
        const infoEleicao = cipaAjustarDiaUtil(rawEleicao, 'anterior');

        // 7. Apuração dos Votos: Imediatamente após a eleição (Item 5.5.1 'g')
        const infoApuracao = {
            dataOriginal: infoEleicao.data,
            data: infoEleicao.data,
            ajustado: false,
            motivo: 'Realizada no mesmo dia da votação',
            diaOriginalNome: infoEleicao.diaFinalNome,
            diaFinalNome: infoEleicao.diaFinalNome
        };

        // 8. Fim da Gestão Eleita: 1 ano após a posse (Item 5.4.6)
        const rawFimGestao = new Date(dataPosse.getTime());
        rawFimGestao.setFullYear(rawFimGestao.getFullYear() + 1);

        datasForm = {
            dataEditalConvocacao: cipaFormatDateInput(infoConvocacao.data),
            dataEditalInscricao: cipaFormatDateInput(infoInscricao.data),
            dataInicioInscricoes: cipaFormatDateInput(infoInscricao.data),
            dataFimInscricoes: cipaFormatDateInput(infoFimInscricao.data),
            dataEditalInscritos: cipaFormatDateInput(infoEditalInscritos.data),
            dataEleicao: cipaFormatDateInput(infoEleicao.data),
            dataApuracao: cipaFormatDateInput(infoApuracao.data),
            dataPosse: cipaFormatDateInput(dataPosse),
            dataInicioGestao: cipaFormatDateInput(dataPosse),
            dataFimGestao: cipaFormatDateInput(rawFimGestao)
        };

        etapas = [
            {
                num: '1',
                nome: 'Convocação das Eleições',
                norma: 'NR-05, Item 5.5.1 (a)',
                regra: 'Mínimo de 60 dias antes do término do mandato',
                info: infoConvocacao,
                campoForm: 'dataEditalConvocacao'
            },
            {
                num: '2',
                nome: 'Constituição da Comissão Eleitoral (CE)',
                norma: 'NR-05, Item 5.5.1 (b)',
                regra: 'Mínimo de 55 dias antes do término do mandato',
                info: infoComissao,
                campoForm: null
            },
            {
                num: '3',
                nome: 'Edital de Abertura & Início das Inscrições',
                norma: 'NR-05, Item 5.5.1 (c)',
                regra: 'Mínimo de 45 dias antes do término do mandato',
                info: infoInscricao,
                campoForm: 'dataEditalInscricao / dataInicioInscricoes'
            },
            {
                num: '4',
                nome: 'Encerramento das Inscrições',
                norma: 'NR-05, Item 5.5.1 (d)',
                regra: 'Período mínimo de 15 dias corridos de inscrições',
                info: infoFimInscricao,
                campoForm: 'dataFimInscricoes'
            },
            {
                num: '5',
                nome: 'Edital de Inscritos (Homologação)',
                norma: 'NR-05, Item 5.5.1 (e)',
                regra: 'Divulgação oficial logo após o fim das inscrições',
                info: infoEditalInscritos,
                campoForm: 'dataEditalInscritos'
            },
            {
                num: '6',
                nome: 'Realização da Eleição (Votação Secreta)',
                norma: 'NR-05, Item 5.5.1 (f)',
                regra: 'Mínimo de 30 dias antes do término do mandato',
                info: infoEleicao,
                campoForm: 'dataEleicao'
            },
            {
                num: '7',
                nome: 'Apuração dos Votos e Lavratura da Ata',
                norma: 'NR-05, Item 5.5.1 (g)',
                regra: 'Imediatamente após o encerramento da votação',
                info: infoApuracao,
                campoForm: 'dataApuracao'
            },
            {
                num: '8',
                nome: 'Período para Treinamento Obrigatório CIPA',
                norma: 'NR-05, Item 5.7',
                regra: 'Obrigatório para titulares e suplentes antes da posse',
                info: {
                    data: infoEleicao.data,
                    ajustado: false,
                    motivo: `Entre ${cipaFormatDateBR(cipaAdicionarDias(infoEleicao.data, 1))} e ${cipaFormatDateBR(cipaAdicionarDias(dataPosse, -1))}`,
                    diaFinalNome: 'Período Intermediário'
                },
                campoForm: null
            },
            {
                num: '9',
                nome: 'Posse da CIPA e Início do Mandato',
                norma: 'NR-05, Item 5.5.1 (i)',
                regra: '1º dia útil após término do mandato anterior',
                info: infoPosse,
                campoForm: 'dataPosse / dataInicioGestao'
            }
        ];
    } else {
        // Cálculo Progressivo baseado na Convocação
        const rawConvocacao = dataBase;
        const infoConvocacao = cipaAjustarDiaUtil(rawConvocacao, 'anterior');
        const dataConvocacao = infoConvocacao.data;

        // Comissão Eleitoral: D+5
        const rawComissao = cipaAdicionarDias(dataConvocacao, 5);
        const infoComissao = cipaAjustarDiaUtil(rawComissao, 'posterior');

        // Edital e Início de Inscrições: D+10
        const rawInscricao = cipaAdicionarDias(dataConvocacao, 10);
        const infoInscricao = cipaAjustarDiaUtil(rawInscricao, 'posterior');

        // Fim das Inscrições: Início + 14 dias corridos
        const rawFimInscricao = cipaAdicionarDias(infoInscricao.data, 14);
        const infoFimInscricao = cipaAjustarDiaUtil(rawFimInscricao, 'posterior');

        // Edital de Inscritos: D+1 dia útil
        const rawEditalInscritos = cipaAdicionarDias(infoFimInscricao.data, 1);
        const infoEditalInscritos = cipaAjustarDiaUtil(rawEditalInscritos, 'posterior');

        // Eleição: D+30 dias
        const rawEleicao = cipaAdicionarDias(dataConvocacao, 30);
        const infoEleicao = cipaAjustarDiaUtil(rawEleicao, 'anterior');

        // Apuração: mesmo dia da eleição
        const infoApuracao = {
            dataOriginal: infoEleicao.data,
            data: infoEleicao.data,
            ajustado: false,
            motivo: 'Realizada no mesmo dia da votação',
            diaOriginalNome: infoEleicao.diaFinalNome,
            diaFinalNome: infoEleicao.diaFinalNome
        };

        // Posse: D+60 dias
        const rawPosse = cipaAdicionarDias(dataConvocacao, 60);
        const infoPosse = cipaAjustarDiaUtil(rawPosse, 'posterior');

        // Fim da Gestão: Posse + 1 ano
        const rawFimGestao = new Date(infoPosse.data.getTime());
        rawFimGestao.setFullYear(rawFimGestao.getFullYear() + 1);

        datasForm = {
            dataEditalConvocacao: cipaFormatDateInput(dataConvocacao),
            dataEditalInscricao: cipaFormatDateInput(infoInscricao.data),
            dataInicioInscricoes: cipaFormatDateInput(infoInscricao.data),
            dataFimInscricoes: cipaFormatDateInput(infoFimInscricao.data),
            dataEditalInscritos: cipaFormatDateInput(infoEditalInscritos.data),
            dataEleicao: cipaFormatDateInput(infoEleicao.data),
            dataApuracao: cipaFormatDateInput(infoApuracao.data),
            dataPosse: cipaFormatDateInput(infoPosse.data),
            dataInicioGestao: cipaFormatDateInput(infoPosse.data),
            dataFimGestao: cipaFormatDateInput(rawFimGestao)
        };

        etapas = [
            {
                num: '1',
                nome: 'Convocação das Eleições',
                norma: 'NR-05, Item 5.5.1 (a)',
                regra: 'Início oficial do processo eleitoral',
                info: infoConvocacao,
                campoForm: 'dataEditalConvocacao'
            },
            {
                num: '2',
                nome: 'Constituição da Comissão Eleitoral (CE)',
                norma: 'NR-05, Item 5.5.1 (b)',
                regra: 'Até 5 dias após a convocação',
                info: infoComissao,
                campoForm: null
            },
            {
                num: '3',
                nome: 'Edital de Abertura & Início das Inscrições',
                norma: 'NR-05, Item 5.5.1 (c)',
                regra: 'Abertura das inscrições para os empregados',
                info: infoInscricao,
                campoForm: 'dataEditalInscricao / dataInicioInscricoes'
            },
            {
                num: '4',
                nome: 'Encerramento das Inscrições',
                norma: 'NR-05, Item 5.5.1 (d)',
                regra: 'Período mínimo de 15 dias corridos',
                info: infoFimInscricao,
                campoForm: 'dataFimInscricoes'
            },
            {
                num: '5',
                nome: 'Edital de Inscritos (Homologação)',
                norma: 'NR-05, Item 5.5.1 (e)',
                regra: 'Divulgação oficial logo após o fim das inscrições',
                info: infoEditalInscritos,
                campoForm: 'dataEditalInscritos'
            },
            {
                num: '6',
                nome: 'Realização da Eleição (Votação Secreta)',
                norma: 'NR-05, Item 5.5.1 (f)',
                regra: '30 dias antes da posse prevista',
                info: infoEleicao,
                campoForm: 'dataEleicao'
            },
            {
                num: '7',
                nome: 'Apuração dos Votos e Lavratura da Ata',
                norma: 'NR-05, Item 5.5.1 (g)',
                regra: 'Imediatamente após o encerramento da votação',
                info: infoApuracao,
                campoForm: 'dataApuracao'
            },
            {
                num: '8',
                nome: 'Período para Treinamento Obrigatório CIPA',
                norma: 'NR-05, Item 5.7',
                regra: 'Obrigatório para titulares e suplentes antes da posse',
                info: {
                    data: infoEleicao.data,
                    ajustado: false,
                    motivo: `Entre ${cipaFormatDateBR(cipaAdicionarDias(infoEleicao.data, 1))} e ${cipaFormatDateBR(cipaAdicionarDias(infoPosse.data, -1))}`,
                    diaFinalNome: 'Período Intermediário'
                },
                campoForm: null
            },
            {
                num: '9',
                nome: 'Posse da CIPA e Início do Mandato',
                norma: 'NR-05, Item 5.5.1 (i)',
                regra: '60 dias após a convocação (1º dia útil)',
                info: infoPosse,
                campoForm: 'dataPosse / dataInicioGestao'
            }
        ];
    }

    return { tipo, dataBaseStr, etapas, datasForm };
}

function gerarSugestaoCronogramaCipa() {
    const tipo = document.getElementById('cipaCronograma_tipoCalculo')?.value || 'fim';
    const dataBaseStr = document.getElementById('cipaCronograma_dataBase')?.value;
    const container = document.getElementById('cipaCronograma_resultado');
    if (!container) return;

    if (!dataBaseStr) {
        alert('Por favor, selecione uma data no campo de referência para calcular o cronograma.');
        return;
    }

    const cronograma = calcularCronogramaCipaNR05(tipo, dataBaseStr);
    if (!cronograma) {
        alert('Data inválida selecionada.');
        return;
    }

    cipaUltimoCronogramaCalculado = cronograma;

    const linhasHtml = cronograma.etapas.map(e => {
        const dataFormatada = cipaFormatDateBR(e.info.data);
        const badgeAjuste = e.info.ajustado
            ? `<span style="background: rgba(239, 68, 68, 0.12); color: var(--danger); font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">⚠️ ${escapeHTML(e.info.motivo)}</span>`
            : (e.info.diaFinalNome === 'Período Intermediário'
                ? `<span style="background: rgba(79, 70, 229, 0.1); color: var(--primary); font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 600;">${escapeHTML(e.info.motivo)}</span>`
                : `<span style="background: rgba(16, 185, 129, 0.12); color: var(--success); font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 600;">✅ Dia útil (${escapeHTML(e.info.diaFinalNome)})</span>`);

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 10px 8px; font-weight: 700; color: var(--primary); text-align: center; width: 36px;">
                    ${e.num}
                </td>
                <td style="padding: 10px 8px;">
                    <div style="font-weight: 600; color: var(--text);">${escapeHTML(e.nome)}</div>
                    <div style="font-size: 11px; color: var(--text-light); margin-top: 2px;">
                        <b>${escapeHTML(e.norma)}</b>: ${escapeHTML(e.regra)}
                    </div>
                </td>
                <td style="padding: 10px 8px; font-weight: 700; color: var(--text); white-space: nowrap;">
                    ${e.info.diaFinalNome === 'Período Intermediário' ? '—' : dataFormatada}
                </td>
                <td style="padding: 10px 8px;">
                    ${badgeAjuste}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px; box-shadow: var(--shadow);">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom: 12px;">
                <div>
                    <div style="font-weight: 700; font-size: 13.5px; color: var(--text);">
                        📋 Cronograma Oficial Sugerido (NR-05)
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-light); margin-top: 2px;">
                        Cálculo ${tipo === 'fim' ? 'regressivo baseado na posse' : 'progressivo baseado na convocação'}. Todas as datas em finais de semana foram ajustadas para o dia útil legal.
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="db-apply-btn" style="background: var(--success); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 12.5px;" onclick="aplicarSugestaoCronogramaCipa()">
                        <span>📥</span> Aplicar Datas no Formulário
                    </button>
                    <button type="button" class="db-clear-btn" style="padding: 8px 12px; font-size: 12.5px;" onclick="fecharSugestaoCronogramaCipa()">
                        Fechar
                    </button>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                        <tr style="background: var(--bg); border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; color: var(--text-light);">
                            <th style="padding: 8px; text-align:center;">#</th>
                            <th style="padding: 8px;">Etapa do Processo & Fundamento Legal</th>
                            <th style="padding: 8px;">Data Sugerida</th>
                            <th style="padding: 8px;">Validação de Dia Útil / Fim de Semana</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHtml}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; background: rgba(79, 70, 229, 0.05); padding: 10px 12px; border-radius: 8px;">
                <div style="font-size: 11.5px; color: var(--text-light);">
                    💡 <b>Dica:</b> Ao clicar em <b>Aplicar Datas</b>, todos os campos abaixo serão preenchidos automaticamente. Você ainda pode editar qualquer campo manualmente se desejar antes de salvar.
                </div>
                <button type="button" class="db-apply-btn" style="background: var(--success); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px;" onclick="aplicarSugestaoCronogramaCipa()">
                    <span>📥</span> Aplicar Datas no Formulário
                </button>
            </div>
        </div>
    `;

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharSugestaoCronogramaCipa() {
    const container = document.getElementById('cipaCronograma_resultado');
    if (container) container.style.display = 'none';
}

function aplicarSugestaoCronogramaCipa() {
    if (!cipaUltimoCronogramaCalculado || !cipaUltimoCronogramaCalculado.datasForm) {
        alert('Calcule o cronograma primeiro.');
        return;
    }

    const { datasForm } = cipaUltimoCronogramaCalculado;
    const camposMapeados = [
        { id: 'cipaProcessoForm_dataEditalConvocacao', val: datasForm.dataEditalConvocacao },
        { id: 'cipaProcessoForm_dataEditalInscricao', val: datasForm.dataEditalInscricao },
        { id: 'cipaProcessoForm_dataInicioInscricoes', val: datasForm.dataInicioInscricoes },
        { id: 'cipaProcessoForm_dataFimInscricoes', val: datasForm.dataFimInscricoes },
        { id: 'cipaProcessoForm_dataEditalInscritos', val: datasForm.dataEditalInscritos },
        { id: 'cipaProcessoForm_dataEleicao', val: datasForm.dataEleicao },
        { id: 'cipaProcessoForm_dataApuracao', val: datasForm.dataApuracao },
        { id: 'cipaProcessoForm_dataPosse', val: datasForm.dataPosse },
        { id: 'cipaProcessoForm_dataInicioGestao', val: datasForm.dataInicioGestao },
        { id: 'cipaProcessoForm_dataFimGestao', val: datasForm.dataFimGestao }
    ];

    camposMapeados.forEach(c => {
        const el = document.getElementById(c.id);
        if (el && c.val) {
            el.value = c.val;
            el.style.transition = 'all 0.3s ease';
            el.style.borderColor = 'var(--success)';
            el.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
            setTimeout(() => {
                el.style.borderColor = '';
                el.style.boxShadow = '';
            }, 3000);
        }
    });

    const statusEl = document.getElementById('cipaProcessoFormStatus');
    if (statusEl) {
        statusEl.textContent = '✨ Prazos da NR-05 preenchidos no formulário! Clique em "Salvar Processo Eleitoral" para gravar.';
        statusEl.style.color = 'var(--success)';
    }

    fecharSugestaoCronogramaCipa();

    const primeiroCampo = document.getElementById('cipaProcessoForm_dataEditalConvocacao');
    if (primeiroCampo) {
        primeiroCampo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function carregarFormProcessoEleitoral(id) {
    const p = allCipaProcessosEleitorais.find(x => x.id === id) || null;
    const card = document.getElementById('cipaProcessoFormCard');
    if (!card) return;
    card.dataset.id = id || '';
    Object.keys(CIPA_PROCESSO_CAMPO_COL).forEach(campo => {
        const el = document.getElementById('cipaProcessoForm_' + campo);
        if (!el) return;
        const col = CIPA_PROCESSO_CAMPO_COL[campo];
        el.value = p ? (p[col] ?? '') : '';
    });
    document.getElementById('cipaProcessoFormStatus').textContent = '';

    // Atualiza campo do assistente inteligente de cronograma
    const dataBaseInput = document.getElementById('cipaCronograma_dataBase');
    if (dataBaseInput) {
        const tipoCalc = document.getElementById('cipaCronograma_tipoCalculo')?.value || 'fim';
        if (tipoCalc === 'fim') {
            dataBaseInput.value = p?.data_posse || p?.data_fim_gestao || '';
        } else {
            dataBaseInput.value = p?.data_edital_convocacao || '';
        }
    }
    const containerResultado = document.getElementById('cipaCronograma_resultado');
    if (containerResultado) {
        containerResultado.style.display = 'none';
        containerResultado.innerHTML = '';
    }

    const btnAnexosProc = document.getElementById('cipaProcessoForm_btnAnexos');
    if (btnAnexosProc) {
        btnAnexosProc.textContent = `📎 Anexos da Eleição${labelContagemAnexos('cipa_processos_eleitorais', id)}`;
    }
}

function abrirAnexoProcessoEleitoralCipaAtual() {
    const card = document.getElementById('cipaProcessoFormCard');
    const id = card?.dataset.id;
    if (!id) {
        alert('Selecione ou crie um processo eleitoral primeiro.');
        return;
    }
    const p = processoEleitoralAtual();
    const desc = p ? `Processo Eleitoral CIPA — ${p.gestao || ''}` : 'Processo Eleitoral CIPA';
    abrirAnexoModal('cipa_processos_eleitorais', id, desc);
}

function abrirNovoProcessoEleitoral() {
    const gestaoAtualMaisAlta = allCipaProcessosEleitorais
        .map(p => parseInt((p.gestao || '').split('/')[0], 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => b - a)[0];
    const anoBase = gestaoAtualMaisAlta ? gestaoAtualMaisAlta + 1 : new Date().getFullYear();
    const id = `CIPA_${anoBase}_${anoBase + 1}`;
    const novo = { id, gestao: `${anoBase}/${anoBase + 1}`, status: 'planejamento' };
    allCipaProcessosEleitorais.push(novo);
    renderCipaEleicao();
    const select = document.getElementById('cipaProcessoSelect');
    if (select) select.value = id;
    carregarFormProcessoEleitoral(id);
}

async function salvarProcessoEleitoral() {
    const statusEl = document.getElementById('cipaProcessoFormStatus');
    const card = document.getElementById('cipaProcessoFormCard');
    const idAtual = card.dataset.id;
    const gestao = document.getElementById('cipaProcessoForm_gestao').value.trim();
    if (!gestao) {
        statusEl.textContent = '❌ Informe a gestão (ex: 2026/2027).';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const id = idAtual || `CIPA_${gestao.replace(/[^0-9]/g, '_')}`;
    const row = { id };
    Object.keys(CIPA_PROCESSO_CAMPO_COL).forEach(campo => {
        const el = document.getElementById('cipaProcessoForm_' + campo);
        if (!el) return;
        const col = CIPA_PROCESSO_CAMPO_COL[campo];
        const val = el.value.trim ? el.value.trim() : el.value;
        if (col === 'total_funcionarios' || col === 'total_votantes') {
            row[col] = val !== '' ? parseInt(val, 10) : null;
        } else if (col === 'percentual_participacao') {
            row[col] = val !== '' ? parseFloat(val.replace(',', '.')) : null;
        } else {
            row[col] = val !== '' ? val : null;
        }
    });
    row.status = row.status || 'planejamento';
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('cipa_processos_eleitorais', [row]);
        card.dataset.id = id;
        const idx = allCipaProcessosEleitorais.findIndex(p => p.id === id);
        if (idx >= 0) allCipaProcessosEleitorais[idx] = { ...allCipaProcessosEleitorais[idx], ...row };
        else allCipaProcessosEleitorais.push(row);
        renderCipaEleicao();
        const select = document.getElementById('cipaProcessoSelect');
        if (select) select.value = id;
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao salvar processo eleitoral da CIPA:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirProcessoEleitoralAtual() {
    const card = document.getElementById('cipaProcessoFormCard');
    const id = card.dataset.id;
    if (!id) return;
    if (!confirm('Excluir este processo eleitoral e todos os candidatos vinculados a ele? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('cipaProcessoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('cipa_processos_eleitorais', id);
        allCipaProcessosEleitorais = allCipaProcessosEleitorais.filter(p => p.id !== id);
        allCipaCandidatos = allCipaCandidatos.filter(c => c.processo_id !== id);
        renderCipaEleicao();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao excluir processo eleitoral da CIPA:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Quadro I - referência de dimensionamento (sempre calculado com o efetivo ATUAL
// do sistema, não com o total_funcionarios histórico do processo eleitoral - são duas
// coisas diferentes: o processo guarda o retrato de uma eleição já feita, o Quadro I
// aqui é uma checagem contínua "a CIPA está dimensionada corretamente hoje?"). ----
function renderQuadroIReferencia() {
    const container = document.getElementById('cipaQuadroIReferencia');
    if (!container) return;
    const totalAtivos = allEfetivo.filter(colaboradorEstaAtivo).length;
    const dim = calcularDimensionamentoCipaQuadroI(EMPRESA_INFO.grauRisco, totalAtivos);
    if (!dim) {
        container.innerHTML = `<div class="db-list-empty">Não foi possível calcular (grau de risco ou nº de colaboradores ativos indisponível).</div>`;
        return;
    }
    const membrosAtivos = allCipaMembros.filter(m => m.ativo);
    const titularesEmpregado = membrosAtivos.filter(m => m.cargo === 'titular_empregado').length;
    const suplentesEmpregado = membrosAtivos.filter(m => m.cargo === 'suplente_empregado').length;
    const linhaStatus = (exigido, atual, label) => {
        if (exigido === null) return `<div class="campo">${label}: não exige CIPA formal nesta faixa (NR-5, item 5.4.13)</div>`;
        const ok = atual >= exigido;
        return `<div class="campo">${label}: exige ${exigido} — cadastrados hoje: ${atual} ${ok ? '✅' : '⚠️'}</div>`;
    };
    container.innerHTML = `
        <div class="campo"><b>Grau de Risco:</b> ${escapeHTML(EMPRESA_INFO.grauRisco)} — <b>Colaboradores ativos hoje:</b> ${totalAtivos} — <b>Faixa:</b> ${escapeHTML(dim.faixaLabel)}</div>
        ${linhaStatus(dim.efetivos, titularesEmpregado, 'Titulares (empregados) exigidos pelo Quadro I')}
        ${linhaStatus(dim.suplentes, suplentesEmpregado, 'Suplentes (empregados) exigidos pelo Quadro I')}
        <div class="campo" style="color:var(--text-light); font-size:11.5px;">O empregador designa, em igual número (NR-5, item 5.4.1/5.4.3), os representantes titulares e suplentes dele mesmo — não são eleitos.</div>
    `;
}

// ---- Candidatos ----
function renderCipaCandidatosLista() {
    const container = document.getElementById('cipaCandidatosLista');
    if (!container) return;
    const p = processoEleitoralAtual();
    if (!p) {
        container.innerHTML = '<div class="db-list-empty">Selecione ou crie um processo eleitoral acima.</div>';
        return;
    }
    const linhas = allCipaCandidatos.filter(c => c.processo_id === p.id).sort((a, b) => (a.seq || 0) - (b.seq || 0));
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum candidato cadastrado para esta gestão.</div>';
        return;
    }
    container.innerHTML = linhas.map(c => `<div class="db-list-item" style="cursor:pointer;" onclick="abrirFormCipaCandidato('${escapeHTML(c.id)}')">
        <div class="db-list-item-title">${String(c.seq || '').padStart(2, '0')} — ${escapeHTML(c.nome)}${c.apelido ? ' (' + escapeHTML(c.apelido) + ')' : ''}</div>
        <div class="db-list-item-sub">${escapeHTML(c.setor || '')}${c.votos != null ? ' — ' + c.votos + ' votos' : ''}${c.resultado ? ' — ' + CIPA_RESULTADO_LABELS[c.resultado] : ''}</div>
    </div>`).join('');
}

function abrirFormCipaCandidato(id) {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie um processo eleitoral primeiro.'); return; }
    const form = document.getElementById('cipaCandidatoFormCard');
    const title = document.getElementById('cipaCandidatoFormTitle');
    const btnExcluir = document.getElementById('cipaCandidatoForm_btnExcluir');
    document.getElementById('cipaCandidatoFormStatus').textContent = '';
    form.dataset.id = id || '';
    form.dataset.processoId = p.id;
    if (id) {
        const c = allCipaCandidatos.find(x => x.id === id);
        if (!c) return;
        title.textContent = '✏️ Editar Candidato';
        document.getElementById('cipaCandidatoForm_seq').value = c.seq ?? '';
        document.getElementById('cipaCandidatoForm_matricula').value = c.matricula || '';
        document.getElementById('cipaCandidatoForm_nome').value = c.nome || '';
        document.getElementById('cipaCandidatoForm_apelido').value = c.apelido || '';
        document.getElementById('cipaCandidatoForm_funcao').value = c.funcao || '';
        document.getElementById('cipaCandidatoForm_setor').value = c.setor || '';
        document.getElementById('cipaCandidatoForm_votos').value = c.votos ?? '';
        document.getElementById('cipaCandidatoForm_resultado').value = c.resultado || '';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '🗳️ Novo Candidato';
        const proxSeq = Math.max(0, ...allCipaCandidatos.filter(x => x.processo_id === p.id).map(x => x.seq || 0)) + 1;
        document.getElementById('cipaCandidatoForm_seq').value = proxSeq;
        document.getElementById('cipaCandidatoForm_matricula').value = '';
        document.getElementById('cipaCandidatoForm_nome').value = '';
        document.getElementById('cipaCandidatoForm_apelido').value = '';
        document.getElementById('cipaCandidatoForm_funcao').value = '';
        document.getElementById('cipaCandidatoForm_setor').value = '';
        document.getElementById('cipaCandidatoForm_votos').value = '';
        document.getElementById('cipaCandidatoForm_resultado').value = '';
        btnExcluir.style.display = 'none';
    }
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormCipaCandidato() {
    const form = document.getElementById('cipaCandidatoFormCard');
    if (form) form.style.display = 'none';
}

async function salvarCipaCandidato() {
    const statusEl = document.getElementById('cipaCandidatoFormStatus');
    const form = document.getElementById('cipaCandidatoFormCard');
    const idAtual = form.dataset.id;
    const processoId = form.dataset.processoId;
    const nome = document.getElementById('cipaCandidatoForm_nome').value.trim();
    if (!nome) {
        statusEl.textContent = '❌ Informe o nome do candidato.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const seqStr = document.getElementById('cipaCandidatoForm_seq').value;
    const votosStr = document.getElementById('cipaCandidatoForm_votos').value;
    const id = idAtual || `CAND_${processoId}_${Date.now()}`;
    const row = {
        id,
        processo_id: processoId,
        seq: seqStr !== '' ? parseInt(seqStr, 10) : null,
        matricula: document.getElementById('cipaCandidatoForm_matricula').value.trim() || null,
        nome,
        apelido: document.getElementById('cipaCandidatoForm_apelido').value.trim() || null,
        funcao: document.getElementById('cipaCandidatoForm_funcao').value.trim() || null,
        setor: document.getElementById('cipaCandidatoForm_setor').value.trim() || null,
        votos: votosStr !== '' ? parseInt(votosStr, 10) : null,
        resultado: document.getElementById('cipaCandidatoForm_resultado').value || null
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('cipa_candidatos', [row]);
        form.dataset.id = id;
        const idx = allCipaCandidatos.findIndex(c => c.id === id);
        if (idx >= 0) allCipaCandidatos[idx] = { ...allCipaCandidatos[idx], ...row };
        else allCipaCandidatos.push(row);
        renderCipaCandidatosLista();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCipaCandidato(), 900);
    } catch (err) {
        console.error('Erro ao salvar candidato da CIPA:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirCipaCandidatoAtual() {
    const form = document.getElementById('cipaCandidatoFormCard');
    const id = form.dataset.id;
    if (!id) return;
    if (!confirm('Excluir este candidato? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('cipaCandidatoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('cipa_candidatos', id);
        allCipaCandidatos = allCipaCandidatos.filter(c => c.id !== id);
        renderCipaCandidatosLista();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCipaCandidato(), 900);
    } catch (err) {
        console.error('Erro ao excluir candidato da CIPA:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Geradores de documentos do Processo Eleitoral ----
// CSS compartilhado entre os 6 geradores abaixo, pra não repetir o mesmo bloco de
// estilo 6 vezes (o mesmo padrão visual usado em gerarAtaCipa). Reduz duplicação -
// tech debt real já registrado no bloco de notas do projeto em 2026-09-18 pra outras
// partes do dashboard.js; aqui evitamos criar mais do mesmo problema em código novo.
const CIPA_DOC_CSS = `
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    @page { size: portrait; margin: 12mm; }
    .folha { max-width: 1000px; min-height: 273mm; margin: 0 auto; border: 2px solid #000; display: flex; flex-direction: column; }
    .cabecalho { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 160px; padding: 8px 10px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo-wrap { flex: 1; text-align: center; padding: 8px 10px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .cabecalho .titulo { font-weight: 700; font-size: 14px; }
    .cabecalho .subtitulo { font-size: 11px; color: #444; margin-top: 2px; }
    .cabecalho .codigo { width: 120px; padding: 8px 10px; border-left: 2px solid #000; text-align: center; font-weight: 700; font-size: 11px; display:flex; align-items:center; justify-content:center; }
    .secao-titulo { font-weight: 700; font-size: 12.5px; background: #d9d9d9; padding: 6px 10px; border-bottom: 1px solid #000; border-top: 2px solid #000; }
    .corpo-texto { padding: 10px; font-size: 12px; text-align: justify; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 5px 6px; font-size: 11px; }
    th { background: #e5e5e5; font-size: 10.5px; }
    .fecho { padding: 10px; font-size: 12px; }
    .assinaturas { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 10px; margin-top: auto; }
    .assinatura-item { width: 220px; text-align: center; font-size: 11px; }
    .assinatura-item .linha-assinatura { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; }
    .rodape-doc { padding: 6px 10px; border-top: 1px solid #ccc; font-size: 9.5px; color: #666; text-align: center; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } .folha { border: 2px solid #000; } }
`;

// Abre o HTML gerado numa nova aba (mesmo padrão de gerarAtaCipa), registra a emissão
// no controle de documentos e devolve o controle pra quem chamou.
function abrirDocumentoCipaEleicao(html, documentoControleId, referencia) {
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
    registrarEmissaoDocumento(documentoControleId, referencia);
}

function cabecalhoDocCipaEleicao(titulo, subtitulo, codigo) {
    return `<div class="cabecalho">
        <div class="logo"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:56px; object-fit:contain;"></div>
        <div class="titulo-wrap">
            <div class="titulo">${escapeHTML(titulo)}</div>
            <div class="subtitulo">${escapeHTML(subtitulo)}</div>
        </div>
        ${codigo ? `<div class="codigo">${escapeHTML(codigo)}</div>` : ''}
    </div>`;
}

function assinaturaComissaoEleitoral(p) {
    return `<div class="assinaturas">
        ${p.presidente_comissao ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.presidente_comissao)}<br>Presidente da Comissão Eleitoral</div></div>` : ''}
        ${p.secretario_comissao ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.secretario_comissao)}<br>Secretário(a) da Comissão</div></div>` : ''}
        ${p.membro_comissao ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.membro_comissao)}<br>Membro da Comissão</div></div>` : ''}
    </div>`;
}

// Rodapé institucional discreto, acrescentado em 2026-09-18 junto com a correção de
// formatação dos 6 documentos do Processo Eleitoral (documentos com pouco conteúdo
// ficavam com muito espaço em branco na folha impressa). Fica logo abaixo das
// assinaturas, já empurrado pra base da página pelo `.folha { display:flex }` +
// `.assinaturas { margin-top:auto }` do CIPA_DOC_CSS.
function rodapeInstitucionalCipaEleicao() {
    return `<div class="rodape-doc">${escapeHTML(EMPRESA_INFO.razaoSocial)} — CNPJ ${escapeHTML(EMPRESA_INFO.cnpj)} — Documento gerado pelo sistema em ${new Date().toLocaleString('pt-BR')}</div>`;
}

async function gerarEditalConvocacaoCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('edital_convocacao_cipa');
    const diasInscricao = (p.data_inicio_inscricoes && p.data_fim_inscricoes)
        ? Math.round((parseLocalDate(p.data_fim_inscricoes) - parseLocalDate(p.data_inicio_inscricoes)) / 86400000) + 1
        : null;
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Edital de Convocação CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        ${cabecalhoDocCipaEleicao(`EDITAL DE CONVOCAÇÃO DA CIPA ${p.gestao || ''}`, 'COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES E ASSÉDIO — CIPA', codigo)}
        <div class="corpo-texto">
            <p>Ficam convidados todos os empregados da empresa <b>${escapeHTML(EMPRESA_INFO.razaoSocial)}</b>, a se inscreverem como candidatos para a eleição da CIPA (COMISSÃO INTERNA DE PREVENÇÃO DE ACIDENTES E DE ASSÉDIO), gestão ${escapeHTML(p.gestao || '')}, cumprindo exigências da Norma Regulamentadora - NR-5, aprovada pela Portaria nº 3214 de 08 de junho 1978, a realizar-se, em votação secreta, no dia <b>${p.data_eleicao ? formatarDataExtensoCipa(p.data_eleicao) : '(data a definir)'}</b>.</p>
            <p>Os interessados poderão efetuar suas inscrições no canteiro de Obra, junto ao Técnico de Segurança do Trabalho${diasInscricao ? `, no período de ${diasInscricao} dias` : ''}, de <u>${p.data_inicio_inscricoes ? formatSimpleDate(p.data_inicio_inscricoes) : '____/____/______'}</u> até o dia <u>${p.data_fim_inscricoes ? formatSimpleDate(p.data_fim_inscricoes) : '____/____/______'}</u>, no horário das 07:00h às 17:00h de segunda a quinta-feira e as sextas-feiras até as 16:00h.</p>
            <p>${escapeHTML(p.cidade_uf || 'Arcoverde-PE')}, ${p.data_edital_convocacao ? formatarDataExtensoCipa(p.data_edital_convocacao) : formatarDataExtensoCipa(new Date().toISOString().slice(0, 10))}.</p>
        </div>
        <div class="assinaturas">
            ${p.presidente_comissao ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.presidente_comissao)}<br>Presidente da Comissão</div></div>` : ''}
        </div>
        ${rodapeInstitucionalCipaEleicao()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'edital_convocacao_cipa', `Edital de Convocação — CIPA ${p.gestao || ''}`);
}

async function gerarEditalInscricaoCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('edital_inscricao_cipa');
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Edital de Abertura de Inscrições CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        ${cabecalhoDocCipaEleicao('EDITAL DE ABERTURA DE INSCRIÇÕES DA CIPA', `GESTÃO ${p.gestao || ''}`, codigo)}
        <div class="corpo-texto">
            <p>Ficam todos os funcionários desta empresa informados que se encontra aberta a inscrição para a candidatura dos membros da Comissão Interna de Prevenção de Acidentes (CIPA), gestão ${escapeHTML(p.gestao || '')}.</p>
            <p>Todos os funcionários que desejarem se inscrever devem procurar um membro da Comissão Eleitoral no horário de trabalho, entre os dias ${p.data_inicio_inscricoes ? formatSimpleDate(p.data_inicio_inscricoes) : '____/____/______'} e ${p.data_fim_inscricoes ? formatSimpleDate(p.data_fim_inscricoes) : '____/____/______'}, para preencherem a ficha de inscrição. Não serão aceitas inscrições após esta data.</p>
            <p>Toda e qualquer informação adicional sobre o processo eleitoral poderá ser obtida junto à Comissão Eleitoral.</p>
            <p>A eleição está programada para o dia ${p.data_eleicao ? formatarDataExtensoCipa(p.data_eleicao) : '(data a definir)'}.</p>
            <p>${escapeHTML(p.cidade_uf || 'Arcoverde-PE')}, ${p.data_edital_inscricao ? formatarDataExtensoCipa(p.data_edital_inscricao) : formatarDataExtensoCipa(new Date().toISOString().slice(0, 10))}.</p>
        </div>
        ${assinaturaComissaoEleitoral(p)}
        ${rodapeInstitucionalCipaEleicao()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'edital_inscricao_cipa', `Edital de Abertura de Inscrições — CIPA ${p.gestao || ''}`);
}

async function gerarEditalInscritosCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('edital_inscritos_cipa');
    const candidatos = allCipaCandidatos.filter(c => c.processo_id === p.id).sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const linhasCandidatos = candidatos.map(c => `<tr>
        <td style="text-align:center;">${String(c.seq || '').padStart(2, '0')}</td>
        <td>${escapeHTML(c.nome)}</td>
        <td>${escapeHTML(c.apelido || '')}</td>
        <td>${escapeHTML(c.setor || '')}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhum candidato cadastrado</td></tr>';
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Edital de Inscritos CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        ${cabecalhoDocCipaEleicao('EDITAL DE INSCRITOS — HOMOLOGAÇÃO DE CANDIDATOS', `CIPA — GESTÃO ${p.gestao || ''}`, codigo)}
        <div class="corpo-texto">
            <p>Ficam convocados os empregados desta empresa para eleição dos membros da Comissão Interna de Prevenção de Acidentes e Assédio - CIPA, de acordo com a Norma Regulamentadora – NR-05, aprovada pela Portaria n.° 3214 de 1978, baixada pelo Ministério do Trabalho e Emprego, a ser realizada em escrutínio secreto, no dia ${p.data_eleicao ? formatarDataExtensoCipa(p.data_eleicao) : '(data a definir)'}, no período diurno das ${escapeHTML(p.horario_votacao_inicio || '07:00')}hs às ${escapeHTML(p.horario_votacao_fim || '17:00')}hs${p.horario_votacao_noturno_inicio ? ` e noturno das ${escapeHTML(p.horario_votacao_noturno_inicio)} às ${escapeHTML(p.horario_votacao_noturno_fim || '')} horas` : ''}.</p>
        </div>
        <table>
            <thead><tr><th>Local da Urna</th><th>Horário (diurno)</th><th>Horário (noturno)</th></tr></thead>
            <tbody><tr>
                <td>${escapeHTML(p.local_votacao || '')}</td>
                <td style="text-align:center;">${escapeHTML(p.horario_votacao_inicio || '')} às ${escapeHTML(p.horario_votacao_fim || '')}</td>
                <td style="text-align:center;">${p.horario_votacao_noturno_inicio ? escapeHTML(p.horario_votacao_noturno_inicio) + ' às ' + escapeHTML(p.horario_votacao_noturno_fim || '') : '—'}</td>
            </tr></tbody>
        </table>
        <div class="secao-titulo">APRESENTARAM-SE E SERÃO VOTADOS OS SEGUINTES CANDIDATOS</div>
        <table>
            <thead><tr><th style="width:50px;">Seq</th><th>Candidato</th><th style="width:140px;">Apelido</th><th style="width:160px;">Setor de Trabalho</th></tr></thead>
            <tbody>${linhasCandidatos}</tbody>
        </table>
        <div class="corpo-texto">
            <p>${escapeHTML(p.cidade_uf || 'Arcoverde-PE')}, ${p.data_edital_inscritos ? formatarDataExtensoCipa(p.data_edital_inscritos) : formatarDataExtensoCipa(new Date().toISOString().slice(0, 10))}.</p>
            <p>Atenciosamente.</p>
        </div>
        <div class="assinaturas">
            ${p.presidente_comissao ? `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(p.presidente_comissao)}<br>Presidente da Comissão Eleitoral</div></div>` : ''}
        </div>
        ${rodapeInstitucionalCipaEleicao()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'edital_inscritos_cipa', `Edital de Inscritos — CIPA ${p.gestao || ''}`);
}

async function gerarMapaApuracaoCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('mapa_apuracao_cipa');
    const candidatos = allCipaCandidatos.filter(c => c.processo_id === p.id);
    const titular = candidatos.find(c => c.resultado === 'titular');
    const suplente = candidatos.find(c => c.resultado === 'suplente');
    const demais = candidatos.filter(c => c.resultado === 'nao_eleito' || !c.resultado).sort((a, b) => (b.votos || 0) - (a.votos || 0));
    const linhaResultado = c => c ? `<tr><td>Sr(a). ${escapeHTML(c.nome)}</td><td style="text-align:center; width:80px;">${c.votos ?? ''}</td><td style="width:60px;">Votos</td></tr>` : '<tr><td colspan="3" style="text-align:center; color:#888;">Não apurado</td></tr>';
    const linhasDemais = demais.map(c => `<tr><td>Sr(a). ${escapeHTML(c.nome)}</td><td style="text-align:center; width:80px;">${c.votos ?? ''}</td><td style="width:60px;">Votos</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center; color:#888;">Nenhum</td></tr>';
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Mapa de Apuração CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        ${cabecalhoDocCipaEleicao('MAPA / ATA DE APURAÇÃO DO RESULTADO', `CIPA — GESTÃO ${p.gestao || ''}`, codigo)}
        <div class="corpo-texto">
            <p>No dia ${p.data_apuracao ? formatarDataExtensoCipa(p.data_apuracao) : '(data a definir)'}, no ${escapeHTML(p.local_votacao || 'local de votação')} da empresa ${escapeHTML(EMPRESA_INFO.razaoSocial)}, com a presença dos senhores <b>${escapeHTML(p.presidente_comissao || '')}</b> (Presidente da Comissão Eleitoral)${p.secretario_comissao ? `, <b>${escapeHTML(p.secretario_comissao)}</b> (Secretário(a) da Comissão)` : ''}${p.membro_comissao ? ` e <b>${escapeHTML(p.membro_comissao)}</b> (Membro da Comissão)` : ''}, instalou-se a mesa receptora e apuradora dos votos dos representantes dos empregados para a CIPA, Gestão ${escapeHTML(p.gestao || '')}.</p>
            <p>Às ${escapeHTML(p.horario_apuracao || '')} horas, o(a) Sr(a). ${escapeHTML(p.presidente_comissao || '')}, Presidente da Comissão Eleitoral, declarou aberta a apuração dos votos, verificando que votaram <b>${p.total_votantes ?? '(não informado)'}</b> empregados de um total de <b>${p.total_funcionarios ?? '(não informado)'}</b> funcionários${p.percentual_participacao ? `, contabilizando <b>${p.percentual_participacao}%</b> dos empregados` : ''}. Em seguida, passando à apuração na presença de quantos desejassem, após abertura das urnas e a contagem dos votos chegou-se ao seguinte resultado:</p>
        </div>
        <div class="secao-titulo">REPRESENTANTES DOS EMPREGADOS</div>
        <table><tbody>
            <tr><td colspan="3" style="font-weight:700; background:#f0f0f0;">TITULAR</td></tr>
            ${linhaResultado(titular)}
            <tr><td colspan="3" style="font-weight:700; background:#f0f0f0;">SUPLENTE</td></tr>
            ${linhaResultado(suplente)}
        </tbody></table>
        <div class="secao-titulo">DEMAIS VOTADOS, EM ORDEM DECRESCENTE DE VOTOS</div>
        <table><tbody>${linhasDemais}</tbody></table>
        <div class="corpo-texto">
            <p>Obs.: ${escapeHTML(p.observacoes || 'Fica registrado que não houve votos em branco nem rasurados.')}</p>
            <p>Eu, ${escapeHTML(p.secretario_comissao || p.presidente_comissao || '')}, lavrei a presente ata que, lida e aprovada, segue assinada por todos os presentes no ato da apuração dos votos.</p>
            <p>${escapeHTML(p.cidade_uf || 'Arcoverde-PE')}, ${p.data_apuracao ? formatarDataExtensoCipa(p.data_apuracao) : formatarDataExtensoCipa(new Date().toISOString().slice(0, 10))}.</p>
        </div>
        ${assinaturaComissaoEleitoral(p)}
        ${rodapeInstitucionalCipaEleicao()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'mapa_apuracao_cipa', `Mapa/Ata de Apuração — CIPA ${p.gestao || ''}`);
}

async function gerarTermoPosseCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('termo_posse_cipa');
    const ordemCargo = { titular_empregador: 0, suplente_empregador: 1, titular_empregado: 2, suplente_empregado: 3 };
    const membrosAtivos = allCipaMembros.filter(m => m.ativo).sort((a, b) => (ordemCargo[a.cargo] ?? 9) - (ordemCargo[b.cargo] ?? 9));
    const linhasMembros = membrosAtivos.map(m => `<tr>
        <td>${escapeHTML(m.nome)}</td>
        <td>${CIPA_CARGO_LABELS[m.cargo] || m.cargo || ''}</td>
        <td>${m.papel ? CIPA_PAPEL_LABELS[m.papel] : ''}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="text-align:center; color:#888;">Nenhum membro ativo cadastrado</td></tr>';
    const assinaturasMembros = membrosAtivos.map(m => `<div class="assinatura-item"><div class="linha-assinatura">${escapeHTML(m.nome)}${m.papel ? '<br>' + CIPA_PAPEL_LABELS[m.papel] : ''}</div></div>`).join('');
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Termo de Posse CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        ${cabecalhoDocCipaEleicao('TERMO DE POSSE DA CIPA', `GESTÃO ${p.gestao || ''}`, codigo)}
        <div class="corpo-texto">
            <p>Aos ${p.data_posse ? formatarDataExtensoCipa(p.data_posse) : '(data a definir)'}, na sede da empresa ${escapeHTML(EMPRESA_INFO.razaoSocial)}, CNPJ ${escapeHTML(EMPRESA_INFO.cnpj)}, foram empossados os membros da Comissão Interna de Prevenção de Acidentes e de Assédio (CIPA), gestão ${escapeHTML(p.gestao || '')}, eleitos e designados na forma da Norma Regulamentadora NR-05, conforme composição abaixo:</p>
        </div>
        <table>
            <thead><tr><th>Nome</th><th style="width:190px;">Cargo na Comissão</th><th style="width:150px;">Papel</th></tr></thead>
            <tbody>${linhasMembros}</tbody>
        </table>
        <div class="corpo-texto">
            <p>Os membros ora empossados declaram estar cientes das atribuições, direitos e responsabilidades inerentes ao cargo, conforme item 5.3 da NR-05, com mandato de 1 (um) ano, permitida uma reeleição, nos termos do item 5.4.6 da mesma norma, e com estabilidade provisória no emprego assegurada aos representantes eleitos dos empregados desde o registro da candidatura até 1 (um) ano após o final do mandato (NR-05, item 5.4.12).</p>
            <p>${escapeHTML(p.cidade_uf || 'Arcoverde-PE')}, ${p.data_posse ? formatarDataExtensoCipa(p.data_posse) : formatarDataExtensoCipa(new Date().toISOString().slice(0, 10))}.</p>
        </div>
        <div class="assinaturas">${assinaturasMembros}</div>
        ${rodapeInstitucionalCipaEleicao()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'termo_posse_cipa', `Termo de Posse — CIPA ${p.gestao || ''}`);
}

async function gerarFichaInscricaoCipa() {
    const p = processoEleitoralAtual();
    if (!p) { alert('Selecione ou crie e salve um processo eleitoral primeiro.'); return; }
    await garantirDocumentosControleCarregados();
    const codigo = codigoRevisaoDocumento('ficha_inscricao_cipa');
    const ficha = () => `<div style="text-align:center; margin-bottom:4px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:40px; object-fit:contain;"></div>
    <table style="margin-bottom:16px;">
        <tr><td colspan="2" style="text-align:center; font-weight:700; background:#f0f0f0;">FICHA DE INSCRIÇÃO DE CANDIDATO — GESTÃO ${escapeHTML(p.gestao || '')}</td></tr>
        <tr><td style="width:60%;">Nome: _______________________________________________</td><td>Apelido: ______________________</td></tr>
        <tr><td>Função: _____________________________________________</td><td>Setor: ________________________</td></tr>
        <tr><td>Data da Inscrição: ____ / ____ / ________</td><td></td></tr>
        <tr><td>Assinatura do Candidato: _______________________________</td><td>Comissão Eleitoral: ____________</td></tr>
    </table>`;
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ficha de Inscrição CIPA ${escapeHTML(p.gestao || '')}</title>
<style>${CIPA_DOC_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha" style="border:none;">
        ${ficha()}
        ${ficha()}
    </div>
</body></html>`;
    abrirDocumentoCipaEleicao(html, 'ficha_inscricao_cipa', `Ficha de Inscrição (em branco) — CIPA ${p.gestao || ''}`);
}

// ---- Plano de Ação ----

function popularPlanoAcaoReuniaoDatalist() {
    const dl = document.getElementById('planoAcaoReuniaoList');
    if (!dl) return;
    dl.innerHTML = '';
    allCipaReunioes.slice().sort((a, b) => b.data_reuniao.localeCompare(a.data_reuniao)).forEach(r => {
        const opt = document.createElement('option');
        const label = `${CIPA_TIPO_LABELS[r.tipo] || r.tipo}${r.numero_ordinaria ? ' nº ' + r.numero_ordinaria : ''} - ${formatSimpleDate(r.data_reuniao)}`;
        opt.value = `${r.id} - ${label}`;
        dl.appendChild(opt);
    });
}

function filterPlanoAcaoLista() {
    const container = document.getElementById('planoAcaoLista');
    if (!container) return;
    const statusFiltro = document.getElementById('planoAcaoFiltroStatus')?.value || '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    let linhas = allCipaPlanoAcao.slice().sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    if (statusFiltro) linhas = linhas.filter(p => p.status === statusFiltro);

    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma pendência encontrada.</div>';
        return;
    }
    container.innerHTML = linhas.map(p => {
        const atrasado = p.status !== 'concluido' && p.prazo && parseLocalDate(p.prazo) < hoje;
        const reuniao = allCipaReunioes.find(r => r.id === p.reuniao_id);
        return `<div class="db-list-item" style="cursor:pointer;" onclick="abrirFormPlanoAcao('${escapeHTML(p.id)}')">
            <div class="db-list-item-title">${escapeHTML(p.descricao)}</div>
            <div class="db-list-item-sub">${PLANO_ACAO_STATUS_LABELS[p.status] || p.status}${atrasado ? ' — ⚠️ ATRASADO' : ''} — Responsável: ${escapeHTML(p.responsavel || '—')} — Prazo: ${formatSimpleDate(p.prazo)}${reuniao ? ' — ' + escapeHTML(CIPA_TIPO_LABELS[reuniao.tipo] || reuniao.tipo) + (reuniao.numero_ordinaria ? ' nº ' + reuniao.numero_ordinaria : '') : ''}</div>
        </div>`;
    }).join('');
}

function abrirFormPlanoAcao(id) {
    const form = document.getElementById('planoAcaoFormCard');
    const title = document.getElementById('planoAcaoFormTitle');
    const btnExcluir = document.getElementById('planoAcaoForm_btnExcluir');
    document.getElementById('planoAcaoFormStatus').textContent = '';
    form.dataset.id = id || '';
    popularPlanoAcaoReuniaoDatalist();

    if (id) {
        const p = allCipaPlanoAcao.find(x => x.id === id);
        if (!p) return;
        title.textContent = '✏️ Editar Pendência';
        document.getElementById('planoAcaoForm_descricao').value = p.descricao || '';
        const reuniao = allCipaReunioes.find(r => r.id === p.reuniao_id);
        document.getElementById('planoAcaoForm_reuniao').value = reuniao ? `${reuniao.id} - ${CIPA_TIPO_LABELS[reuniao.tipo] || reuniao.tipo}${reuniao.numero_ordinaria ? ' nº ' + reuniao.numero_ordinaria : ''} - ${formatSimpleDate(reuniao.data_reuniao)}` : '';
        document.getElementById('planoAcaoForm_responsavel').value = p.responsavel || '';
        document.getElementById('planoAcaoForm_prazo').value = p.prazo || '';
        document.getElementById('planoAcaoForm_status').value = p.status || 'pendente';
        document.getElementById('planoAcaoForm_observacoes').value = p.observacoes || '';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '✅ Nova Pendência';
        document.getElementById('planoAcaoForm_descricao').value = '';
        document.getElementById('planoAcaoForm_reuniao').value = '';
        document.getElementById('planoAcaoForm_responsavel').value = '';
        document.getElementById('planoAcaoForm_prazo').value = '';
        document.getElementById('planoAcaoForm_status').value = 'pendente';
        document.getElementById('planoAcaoForm_observacoes').value = '';
        btnExcluir.style.display = 'none';
    }
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormPlanoAcao() {
    const form = document.getElementById('planoAcaoFormCard');
    if (form) form.style.display = 'none';
}

async function salvarPlanoAcao() {
    if (bloquearEdicaoSeNaoAutorizado('cipa')) return;
    const statusEl = document.getElementById('planoAcaoFormStatus');
    const idAtual = document.getElementById('planoAcaoFormCard').dataset.id;
    const descricao = document.getElementById('planoAcaoForm_descricao').value.trim();
    if (!descricao) {
        statusEl.textContent = '❌ Informe a descrição da pendência.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const reuniaoRaw = document.getElementById('planoAcaoForm_reuniao').value.trim();
    const reuniaoId = reuniaoRaw.includes(' - ') ? reuniaoRaw.split(' - ')[0].trim() : null;
    const id = idAtual || `PENDENCIA_${Date.now()}`;
    const row = {
        id,
        reuniao_id: reuniaoId || null,
        descricao,
        responsavel: document.getElementById('planoAcaoForm_responsavel').value.trim() || null,
        prazo: document.getElementById('planoAcaoForm_prazo').value || null,
        status: document.getElementById('planoAcaoForm_status').value,
        observacoes: document.getElementById('planoAcaoForm_observacoes').value.trim() || null
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('cipa_plano_acao', [row]);
        document.getElementById('planoAcaoFormCard').dataset.id = id;
        const idx = allCipaPlanoAcao.findIndex(p => p.id === id);
        if (idx >= 0) allCipaPlanoAcao[idx] = { ...allCipaPlanoAcao[idx], ...row };
        else allCipaPlanoAcao.push(row);
        filterPlanoAcaoLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormPlanoAcao(), 900);
    } catch (err) {
        console.error('Erro ao salvar pendência do Plano de Ação:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirPlanoAcaoAtual() {
    const id = document.getElementById('planoAcaoFormCard').dataset.id;
    if (!id) return;
    if (!confirm('Excluir esta pendência? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('planoAcaoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('cipa_plano_acao', id);
        allCipaPlanoAcao = allCipaPlanoAcao.filter(p => p.id !== id);
        filterPlanoAcaoLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormPlanoAcao(), 900);
    } catch (err) {
        console.error('Erro ao excluir pendência do Plano de Ação:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ---- Membros da CIPA ----

function renderCipaMembrosLista() {
    const container = document.getElementById('cipaMembrosLista');
    if (!container) return;
    const linhas = allCipaMembros.slice().sort((a, b) => (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0) || (a.cargo || '').localeCompare(b.cargo || ''));
    if (linhas.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum membro cadastrado.</div>';
        return;
    }
    container.innerHTML = linhas.map(m => `<div class="db-list-item" style="cursor:pointer;${m.ativo ? '' : ' opacity:0.55;'}" onclick="abrirFormCipaMembro('${escapeHTML(m.id)}')">
        <div class="db-list-item-title">${escapeHTML(m.nome)}${m.papel ? ' — ' + CIPA_PAPEL_LABELS[m.papel] : ''}${m.ativo ? '' : ' (inativo)'}</div>
        <div class="db-list-item-sub">${CIPA_CARGO_LABELS[m.cargo] || m.cargo || ''} — ${escapeHTML(m.funcao || '')} — ${escapeHTML(m.setor || '')} — Gestão ${escapeHTML(m.gestao || '')}</div>
    </div>`).join('');
}

function popularCipaMembroColabDatalist() {
    const dl = document.getElementById('cipaMembroColabList');
    if (!dl) return;
    dl.innerHTML = '';
    allEfetivo.filter(colaboradorEstaAtivo).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(e => {
        const opt = document.createElement('option');
        opt.value = `${e.id} - ${e.nome}`;
        dl.appendChild(opt);
    });
}

function onCipaMembroMatriculaChange() {
    const { colab } = buscarColaboradorPorInput('cipaMembroForm_matricula');
    if (colab) {
        document.getElementById('cipaMembroForm_nome').value = colab.nome || '';
        document.getElementById('cipaMembroForm_funcao').value = colab.funcao || '';
        document.getElementById('cipaMembroForm_setor').value = colab.setor || '';
    }
}

function abrirFormCipaMembro(id) {
    const form = document.getElementById('cipaMembroFormCard');
    const title = document.getElementById('cipaMembroFormTitle');
    const btnExcluir = document.getElementById('cipaMembroForm_btnExcluir');
    document.getElementById('cipaMembroFormStatus').textContent = '';
    form.dataset.id = id || '';
    popularCipaMembroColabDatalist();

    if (id) {
        const m = allCipaMembros.find(x => x.id === id);
        if (!m) return;
        title.textContent = '✏️ Editar Membro';
        document.getElementById('cipaMembroForm_matricula').value = m.matricula ? `${m.matricula} - ${m.nome}` : '';
        document.getElementById('cipaMembroForm_nome').value = m.nome || '';
        document.getElementById('cipaMembroForm_funcao').value = m.funcao || '';
        document.getElementById('cipaMembroForm_setor').value = m.setor || '';
        document.getElementById('cipaMembroForm_cargo').value = m.cargo || 'titular_empregado';
        document.getElementById('cipaMembroForm_papel').value = m.papel || '';
        document.getElementById('cipaMembroForm_gestao').value = m.gestao || '';
        document.getElementById('cipaMembroForm_ativo').value = m.ativo === false ? 'false' : 'true';
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '👥 Novo Membro';
        document.getElementById('cipaMembroForm_matricula').value = '';
        document.getElementById('cipaMembroForm_nome').value = '';
        document.getElementById('cipaMembroForm_funcao').value = '';
        document.getElementById('cipaMembroForm_setor').value = '';
        document.getElementById('cipaMembroForm_cargo').value = 'titular_empregado';
        document.getElementById('cipaMembroForm_papel').value = '';
        document.getElementById('cipaMembroForm_gestao').value = '2026/2027';
        document.getElementById('cipaMembroForm_ativo').value = 'true';
        btnExcluir.style.display = 'none';
    }
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormCipaMembro() {
    const form = document.getElementById('cipaMembroFormCard');
    if (form) form.style.display = 'none';
}

async function salvarCipaMembro() {
    if (bloquearEdicaoSeNaoAutorizado('cipa')) return;
    const statusEl = document.getElementById('cipaMembroFormStatus');
    const idAtual = document.getElementById('cipaMembroFormCard').dataset.id;
    const nome = document.getElementById('cipaMembroForm_nome').value.trim();
    if (!nome) {
        statusEl.textContent = '❌ Informe o nome do membro.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const matriculaRaw = document.getElementById('cipaMembroForm_matricula').value.trim();
    const matricula = matriculaRaw.includes(' - ') ? matriculaRaw.split(' - ')[0].trim() : (matriculaRaw || null);
    const id = idAtual || (matricula ? `MEMBRO_${matricula}` : `MEMBRO_${Date.now()}`);
    // Matrícula já cadastrada como membro (id colide) e não é o mesmo registro que
    // estamos editando: sem esse bloqueio o upsert sobrescreveria o membro existente
    // silenciosamente em vez de avisar - achado real ao testar (matrícula 92 já
    // cadastrada foi sobrescrita ao tentar cadastrar "novo" membro com a mesma matrícula).
    if (!idAtual && matricula && allCipaMembros.some(m => m.id === id)) {
        statusEl.textContent = '❌ Essa matrícula já está cadastrada como membro da CIPA. Edite o registro existente em vez de criar um novo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const papel = document.getElementById('cipaMembroForm_papel').value || null;
    // Presidente/Vice-Presidente/Secretário são papéis únicos na comissão - sem essa
    // checagem dois membros poderiam ficar marcados com o mesmo papel e a ata geraria um
    // bloco de assinatura ambíguo (dois "Presidente da CIPA", por exemplo).
    if (papel) {
        const conflito = allCipaMembros.find(m => m.id !== id && m.ativo && m.papel === papel);
        if (conflito) {
            statusEl.textContent = `❌ ${CIPA_PAPEL_LABELS[papel]} já está atribuído a ${conflito.nome}. Remova o papel dele(a) antes de atribuir a outro membro.`;
            statusEl.style.color = 'var(--danger)';
            return;
        }
    }
    const row = {
        id,
        matricula,
        nome,
        funcao: document.getElementById('cipaMembroForm_funcao').value.trim() || null,
        setor: document.getElementById('cipaMembroForm_setor').value.trim() || null,
        cargo: document.getElementById('cipaMembroForm_cargo').value,
        papel,
        gestao: document.getElementById('cipaMembroForm_gestao').value.trim() || null,
        ativo: document.getElementById('cipaMembroForm_ativo').value === 'true'
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('cipa_membros', [row]);
        document.getElementById('cipaMembroFormCard').dataset.id = id;
        const idx = allCipaMembros.findIndex(m => m.id === id);
        if (idx >= 0) allCipaMembros[idx] = { ...allCipaMembros[idx], ...row };
        else allCipaMembros.push(row);
        renderCipaMembrosLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCipaMembro(), 900);
    } catch (err) {
        console.error('Erro ao salvar membro da CIPA:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirCipaMembroAtual() {
    const id = document.getElementById('cipaMembroFormCard').dataset.id;
    if (!id) return;
    if (!confirm('Excluir este membro da CIPA? Essa ação não pode ser desfeita.')) return;
    const statusEl = document.getElementById('cipaMembroFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('cipa_membros', id);
        allCipaMembros = allCipaMembros.filter(m => m.id !== id);
        renderCipaMembrosLista();
        renderCipaVisaoGeral();
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCipaMembro(), 900);
    } catch (err) {
        console.error('Erro ao excluir membro da CIPA:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================

// ============================================
// BANCO DE TEMPLATES E MODELOS LEGADOS DE APR
// ============================================
const MODELOS_APR_SEED = [
    {
        "numero_legado": "004.16",
        "titulo": "Almoxarifado",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Organização e utilização do espaço",
                "perigo_fonte": "Queda de materiais",
                "evento_risco": "",
                "danos_provaveis": "Pancadas Contusões",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Elaborar um plano de trabalho antes de iniciar a atividade para garantir a segurança de todos os envolvidos Garantir que as devidas proteções estejam em bom estado de funcionamento Realizar as atividades com paciência e cuidado",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manuseio de materiais pesados",
                "perigo_fonte": "Postura incorreta Contusões",
                "evento_risco": "",
                "danos_provaveis": "Dor lombar Entorse Fadiga muscular",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Procurar sempre manter a postura adequada para realização das atividades, evitar carregar peso acima do normal e se for preciso procurar auxílio de outro colaborador ou outros meios para facilitar a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manuseio de produtos químicos",
                "perigo_fonte": "Inalação de substâncias tóxicas Exposição a produtos químicos",
                "evento_risco": "",
                "danos_provaveis": "Irritação das vias aéreas superiores Náuseas Tonturas Enjoo Irritação da pele Alergia",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manusear essas substâncias obedecendo o que diz em suas fichas FISPQ, colocando em local adequado para sua conserva onde não possa prejudicar nenhum colaborador Sempre ler as orientações das embalagens sobre forma de Manuseio e armazenamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manuseio de produtos inflamáveis",
                "perigo_fonte": "Explosão Incêndio Contato com a pele",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras Ferimentos Lesões Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre seguir as orientações do fabricante sobre guarda e conserva e manuseio dessas substâncias Essas substâncias só podem ser utilizadas e transportadas por pessoas capacitadas e de conhecimento sólido no assunto",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.16). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.30",
        "titulo": "Aplicação e Substituição de Mantas nas Estruturas do Canal",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Transporte de pessoas e equipamentos",
                "perigo_fonte": "Colisão veicular Queda de objetos",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Torções Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar veículo adequado ao transporte de cargas e pessoas Manter todos os ocupantes do veículo com conto de segurança Certificar-se de que os equipamentos estejam devidamente amarrados ou atracados a carroceria do caminhão por meio de cintas ou cabos .",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação do local para realização das atividades",
                "perigo_fonte": "Queda de objeto Queda de mesmo nível Prensamento",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar a área onde ocorrera a atividade para evitar a presença de pessoas não autorizadas Utilizar cordas guias para guiar as cargas içadas Não deixar pessoas sobre as cargas enquanto são transportadas Só manter no local pessoal que participara da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Esgotamento do canal",
                "perigo_fonte": "Queda de nível Excesso de umidade",
                "evento_risco": "",
                "danos_provaveis": "Contusões Torções Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Instalação de escadas de acesso nas ensecadeiras Manipulação da bomba dágua por profissional capacitado Não adentrar ao canal durante a operação de esgotamento Utilizar E.P.I´s adequados para realização de atividades com agua",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Quebra do concreto para remoção da manta",
                "perigo_fonte": "Queda de objetos Queda de nível Poeiras Exposição a produtos químicos",
                "evento_risco": "",
                "danos_provaveis": "Insuficiência respiratória Torções Ferimentos Contusões Pancadas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar a atividade com local isolado e sinalizado Utilizar corretamente todos os E.P.I.’s e E.P.C´s adequados a atividade Posicionar as ferramentas em local adequado Manter apenas os colaboradores necessários no local da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Instalação da manta",
                "perigo_fonte": "Ferramentas cortantes Contato com produtos químicos Intoxicação por produto químico Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Irritação cutânea Cortes Lesões Falta de ar Irritação das vias aéreas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar corretamente os E.P.I´s para realização das atividades Evitar contato com a pele por produtos químicos Utilizar máscara adequada para atividade Manter apenas a quantidade de colaboradores suficiente para realizar a atividade Manter a área organizada e livre de obstáculos Depositar as ferramentas em desuso em local adequado e seguro Não improvisar ferramentas Fazer a colagem das mantas em local arejado",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Concretagem da manta",
                "perigo_fonte": "Queda de nível Impacto contra objeto Irritação cutânea por contato com produto químico",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Irritação cutânea Cortes Lesões Falta de ar",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar corretamente os E.P.I´s para realização das atividades Evitar contato com a pele por produtos químicos Utilizar máscara adequada para atividade Manter apenas a quantidade de colaboradores suficiente para realizar a atividade Manter a área organizada e livre de obstáculos Depositar as ferramentas em desuso em local adequado e seguro Não improvisar ferramentas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.30). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.28",
        "titulo": "Atividades com Barco",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação dos equipamentos e do local de trabalho",
                "perigo_fonte": "Queda de nível Queda de objetos Esforço físico",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Quedas Contusões Luxações",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Observar as condições da frente de serviço antes de iniciar as atividades em questão Realizar orientação aos colaboradores sobre as condições da frente de serviço Sinalizar e isolar a frente de serviço mantendo apenas pessoal necessário para atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte de equipamentos",
                "perigo_fonte": "Queda de objeto Queda de mesmo nível Colisão",
                "evento_risco": "",
                "danos_provaveis": "Fraturas Cortes Hematomas Perfurações Contusões Luxações",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Andar com atenção e cuidado com os obstáculos no local de trabalho Analisar o comportamento do solo antes e durante a atividade Estabelecer distancias mínimas entre os colaboradores e equipamentos durante a execução das atividades Manter o local sinalizado e isolado durante a realização da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalhos na água",
                "perigo_fonte": "Afogamento Quedas da embarcação Colisão",
                "evento_risco": "",
                "danos_provaveis": "Insuficiência respiratória Torções Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar equipamentos adequados para realizar atividade Isolar e sinalizar o local para evitar a presença de pessoas não autorizadas Manter apenas o efetivo necessário no local da atividade Utilizar os E.P.C’ s e E.P.I.’ s necessários para sanar os riscos existentes na frente de serviço Prover de profissional autorizado e habilitado para realizar atividades com embarcação",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula",
            "Colete Salva-Vidas"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.28). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.29",
        "titulo": "Atividades com Mergulho",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Transporte de pessoas e equipamentos",
                "perigo_fonte": "Colisão veicular Queda de objetos",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Torções Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar veículo adequado ao transporte de cargas e pessoas Manter todos os ocupantes do veículo com conto de segurança Certificar-se de que os equipamentos estejam devidamente amarrados ou atracados a carroceria do caminhão por meio de cintas ou cabos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação do local para realização das atividades",
                "perigo_fonte": "Queda de objeto Queda de mesmo nível Prensamento",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar a área onde ocorrera a atividade para evitar a presença de pessoas não autorizadas Utilizar cordas guias para guiar as cargas içadas Não deixar pessoas sobre as cargas enquanto são transportadas Só manter no local pessoal que participara da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Atividades com mergulho",
                "perigo_fonte": "Afogamento Pancadas",
                "evento_risco": "",
                "danos_provaveis": "Insuficiência respiratória Torções Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar atividade com local isolado e sinalizado Utilizar corretamente todos os E.P.I.’s e E.P.C’s adequados a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Atividades de reparos elétricos",
                "perigo_fonte": "Descarga elétrica Queda de objetos",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações Queimaduras Parada cardíaca",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter uma equipe da elétrica sempre de prontidão no local para realização de tais atividades Só realizar atividades com o local previamente inspecionado e isolado garantindo a segurança dos envolvidos Não realizar nenhum tipo de teste com equipamentos elétricos na água quando estiverem colaboradores no local",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Atividades de reparos mecânicos",
                "perigo_fonte": "Queda de objeto Queda de mesmo nível Pensamento",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, Contusões, luxações",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar a área onde ocorrerá a atividade, para evitar a presença de pessoas não autorizadas Utilizar cordas ou cabos para guiar carga içada Não permanecer nenhum colaborador sobre cargas içadas Só manter no local o pessoal autorizado para realizar as atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.29). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.23",
        "titulo": "Atividades de Pintura",
        "atividades_criticas": [
            "Produtos Químicos Perigosos"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da superfície",
                "perigo_fonte": "Exposição a produtos Químicos e Soluções Inflamáveis Inalação de substâncias geradas por dessas soluções",
                "evento_risco": "",
                "danos_provaveis": "Intoxicação Dermatose Irritação nos olhos Contaminação do Solo (Derramamento Acidental)",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificação prévia do local Realizar procedimentos de segurança no uso dos produtos tóxicos Utilizar máscara com respirador válvula Utilizar de maneira correta todos os EPI’s necessários a atividade evitando o máximo, contado da pele com os agentes químicos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Pintura",
                "perigo_fonte": "Postura Inadequada Queda de nível Queda de materiais",
                "evento_risco": "",
                "danos_provaveis": "Irritação nos olhos Contaminação do Solo (Derramamento Acidental)",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar procedimentos de segurança no uso dos produtos tóxicos Utilizar máscara PFF2 Utilizar de maneira correta todos os EPI’s necessários a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.23). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.19",
        "titulo": "Carga e Descarga",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação do local para descarga de material",
                "perigo_fonte": "Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Lesões e traumas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a área sinalizada e isolada para não permitir a presença de pessoas não autorizadas Respeitar as sinalizações do local para evitar acidentes",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Descarga",
                "perigo_fonte": "Queda de diferente nível Queda de materiais Colisão Prensamento Atropelamento",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Fraturas Contusões Ferimentos Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar cinto de segurança, talabarte, trava quedas, linha de vida e demais EPI´s e EPC´s necessários para movimentações de cargas sobre caminhão Não ficar atrás dos caminhões quando estiverem realizando manobras Antes de soltar a carga verificar se está tudo estável e se não ninguém por perto Sinalizar as áreas de maneira a não deixar nenhuma pessoa não autorizada se envolver na atividade Sempre que necessário pedir auxílio ao colega para pegar cargas que não puder pegar só ou utilizar algum utensilio para auxiliá-lo",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carga",
                "perigo_fonte": "Queda de material Queda de nível Queda de diferente nível Prensamento",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Fraturas Contusões Ferimentos Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a pilha a qual será removida para o caminhão sempre estável e equilibrada Respeitar as sinalizações existentes no local Os colaboradores que ficam sobre os caminhões devem utilizar cinto de segurança, talabarte, trava quedas, linha de vida e demais EPI´s e EPC’s necessários para movimentações de cargas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.19). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.41",
        "titulo": "Cesto Suspenso",
        "atividades_criticas": [
            "Trabalho em Altura (NR-35)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Deslocar para frente de serviço com equipamentos, ferramentas e materiais.",
                "perigo_fonte": "Queda do mesmo nível, queda de nível diferente, queda de ferramentas ou material, ultrapassar área isolada, atropelamento, colisão, ataque de animais peçonhentos, torções,",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não levantar ou transportar peso acima de sua capacidade física Peça ajuda aos companheiros e superiores Não corra, ande. Olhe onde pisa. Não ultrapassar por local sinalizado e isolado você pode ser a vítima. Ao fazer deslocamento acima de use escada, cinto de segurança com 2 talabartes, linha de vida, guarda corpo com roda pé. Transportar as ferramentas e peças na bolsa ou amarrada para evitar queda. – Ao caminhar procure as faixas para pedestres no canteiro de obra. Não permanecer no raio de movimentação de máquinas e equipamentos. Em caso de animais peçonhentos acione a equipe de resgate de fauna para resgate. Manter concentração no local de trabalho. Não improvisar acessos, utilize somente acesso liberado. Manter postura ergonomicamente enquanto estiver executando a atividade. Respeitar os limites de velocidade no canteiro de obra. Solicitar a elétrica melhoria na iluminação, caso necessário, verificar a aproximação do andaime e fios de alta tensão, isolar e sinalizar a área antes de iniciar as atividades.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação da área de serviço.",
                "perigo_fonte": "Acidente.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Posicionamento da Máquina ou Equipamento responsável pela elevação do cesto",
                "perigo_fonte": "Queda de funcionário de diferente nível ou do mesmo nível Queda de Materiais Tombamento,",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPI's básicos necessários: capacete com jugular, óculos de segurança, luvas de raspa, botina com biqueira de aço, cinto de segurança tipo paraquedista atracado em local seguro, acima do tronco do colaborador. Todas as equipes de montagem de andaimes devem ser treinadas pelos encarregados responsáveis pelo serviço, porta carteira de identificação de treinamento, é proibido trabalho sobre por. Toda montagem de torre para execução de andaimes deverá ter acompanhamento do responsável, em caso de condições meteorológicas adversas paralisar as atividades. Antes do início das atividades, o encarregado deverá preencher o checklist de trabalho em altura.? O encarregado deverá orientar sempre a equipe sobre o serviço a ser executado. Verificar as condições dos módulos antes de iniciar a montagem da torre, eliminando os que apresentarem desgastes, trincas, empenamentos etc. Efetuar o primeiro travamento quando os módulos atingirem (três metros) de altura, e só continuar a montagem da torre depois deste travamento realizado, colocar o travamento a cada 03 metros de módulos montados. Efetuar o travamento utilizando tubo roll ou similar fazendo a amarração nas torres. Confeccionar escada, linha de vida para acesso e travar o cinto de segurança. Após a montagem do segundo módulo, trabalhar na parte interna da estrutura fazendo uso constante do cinto de segurança tipo paraquedista atracado em local seguro. Utilizar tábuas resistentes e de boa qualidade nas estruturas da torre para apoio dos pés e movimentação segura do corpo. As tábuas deverão ser amarradas adequadamente a fim de evitar seu deslizamento. Utilizar cordas novas e de boa qualidade para içamento dos módulos. Proceder ao içamento de 01 (um) módulo de cada vez. Amarrar adequadamente os módulos. Afastar-se do local enquanto estiver subindo e montando os módulos. Os andaimes deverão possuir rodapé Fazer isolamento do local abaixo, quando em atividade acima. Toda torre deverá possuir uma sapata (chapa de ferro) x com encaixe para a colocação dos pés no primeiro módulo, a fim de facilitar o nivelamento da torre caso necessite. Uso obrigatório de luvas de raspa / vaqueta.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carregamento e transporte de materiais",
                "perigo_fonte": "Queda de funcionário diferente nível, desabamento, lombalgia e distensões, corpo estranho nos olhos, choque elétrico, ruído, calor, poeira, risco ergonômico, iluminação inadequada.",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S óculos de segurança, luvas pigmentadas, botina, respirador PFF 2, bloqueador solar, abafador de ruído; Somente operadores qualificados e treinados poderão operar o equipamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Içamento do cesto",
                "perigo_fonte": "Pancada/Queda de pessoa e cesto/ Desequilíbrio/ Viragem do cesto Risco Ergonômico, Iluminação Inadequada.",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPI's básicos necessários: capacete com jugular, óculos de segurança, luvas de raspa, botina com biqueira de aço, cinto de segurança tipo paraquedista atracado em local seguro, a um nível mais elevado que a cabeça Fazer isolamento da área do desmonte das torres. Não levantar ou transportar peso acima de sua capacidade física . Utilizar corda resistente e de boa qualidade para a descida dos módulos. Descer um de cada vez. Não improvisar ferramentas ou acessos. - Retirar os travamentos de cima para baixo, na medida em que for desmontando os módulos. Não permanecer no raio da movimentação de máquinas e equipamentos e em içamento de cargas. Fazer o remanejamento das tábuas utilizadas para apoio dos pés, a cada módulo desmontado. Manter a postura ergonomicamente correta durante a execução das atividades. Manter todos os módulos da estrutura empilhados adequadamente em local que não interfira com movimentação de veículos, equipamentos ou pessoas. Afastar os funcionários quando da descida dos módulos Esta análise de risco deve ser levada ao conhecimento de todos os envolvidos através do DDS. Os andaimes deverão possuir rodapé Uso obrigatório de luvas de raspa/vaqueta",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalho no cesto suspenso Movimentação/Içamento de cesto suspenso",
                "perigo_fonte": "Queda do cesto/Rompimento dos dispositivos de içamento",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPI's básicos necessários: capacete com jugular, óculos de segurança, luvas de raspa, botina com biqueira de aço, cinto de segurança tipo paraquedista atracado em local seguro, a um nível mais elevado que a cabeça Fazer isolamento da área do desmonte das torres. Não levantar ou transportar peso acima de sua capacidade física . Utilizar corda resistente e de boa qualidade para a descida dos módulos. Descer um de cada vez. Não improvisar ferramentas ou acessos. - Retirar os travamentos de cima para baixo, na medida em que for desmontando os módulos. Não permanecer no raio da movimentação de máquinas e equipamentos e em içamento de cargas. Fazer o remanejamento das tábuas utilizadas para apoio dos pés a cada módulo desmontado. Manter a postura ergonomicamente correta durante a execução das atividades. Manter todos os módulos da estrutura empilhados adequadamente em local que não interfira com movimentação de veículos, equipamentos ou pessoas. Afastar os funcionários quando da descida dos módulos Esta análise de risco deve ser levada ao conhecimento de todos os envolvidos através do DDS. Os andaimes deverão possuir rodapé Uso obrigatório de luvas de raspa/vaqueta",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Linha de Vida / Trava-quedas",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.41). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.38",
        "titulo": "Cozinha",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Limpeza e conservação das dependências da cozinha, e dos equipamentos existentes.",
                "perigo_fonte": "Queda de nível Queda de objetos de pequeno porte Postura inadequada Poeiras Exposição a produtos Químicos",
                "evento_risco": "",
                "danos_provaveis": "Fraturas Contusões Irritação/dermatose",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Organização do Ambiente Atenção redobrada com os objetos e materiais ao seu redor Não carregar peso em excesso Usar os EPIs destinado a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparo de Café",
                "perigo_fonte": "Exposição ao Calor Respingo de líquidos quentes(água)",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Atenção redobrada na etapa de mistura dos ingredientes Usar os EPIs: Luva, Avental, Botina, e os demais",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Óculos de Proteção",
            "Luvas de Proteção"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Bota de Borracha (Impermeável)"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.38). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.09",
        "titulo": "Enfermaria",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Transporte de equipamentos de resgate",
                "perigo_fonte": "Queda de nível Queda de objetos e materiais",
                "evento_risco": "",
                "danos_provaveis": "Quedas, Lesões, Traumas e Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a atenção redobrada com todos a volta durante a preparação do local, manter a sinalização sempre boa no local do ocorrido, sempre realizar os devidos treinamentos e reciclagens inerentes a função",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação do local para realização do resgate",
                "perigo_fonte": "Acidente com transeuntes Contato com substâncias toxicas e/ou contaminantes Contato com materiais perfuro cortantes",
                "evento_risco": "",
                "danos_provaveis": "Colisão Contaminações Perfurações Lesões Ferimentos Traumas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre manter o local o mais isolado e sinalizado possível evitando a presença de curiosos no local Observar com atenção todos os aspectos do local para evitar contatos como corpos estranhos e materiais perfuro cortante Utilizar sempre os EPI´s e EPC´s que estiverem a disposição e de maneira adequada",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte da vítima",
                "perigo_fonte": "Colisão",
                "evento_risco": "",
                "danos_provaveis": "Acidente veicular",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O veículo de socorro deve ter condutor treinado e habilitado e capacitado para a função Os profissionais devem conhecimentos na área de APH (atendimento pré-hospitalar), todos os envolvidos no resgate devem estar utilizando seu EPI´s de maneira adequada",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Utilização de materiais e seringas",
                "perigo_fonte": "Contaminação Perfuração",
                "evento_risco": "",
                "danos_provaveis": "Doenças infectocontagiosas Perfuração da pele Contato com substâncias toxicas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Todo material deve ser esterilizado ou descartável Deve existir um local específico para o descarte de seringas e materiais utilizados durante os procedimentos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.09). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.24",
        "titulo": "Inspeções e Leituras Instrumentais",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Instalação de equipamentos",
                "perigo_fonte": "Queda de nível Queda de materiais Exposição ao sol Impacto contra Ataques de animais peçonhentos",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Danos materiais Ferimentos Envenenamento Dermatose",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre fazer uma verificação prévia do local Realizar procedimentos contra quedas Levar apenas o necessário para realização das atividades Utilizar de maneira correta todos os EPI’s necessários Utilizar proteção solar",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Acesso a instrumentos instalados",
                "perigo_fonte": "Queda de nível Ataques de animais peçonhentos",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Ferimentos Envenenamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a atenção aos acessos e riscos presentes Fazer verificação prévia do local Utilizar de maneira correta os EPI’s necessários a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Acesso a locais fechados",
                "perigo_fonte": "Queda de nível Sufocamento Infecção Ataque de animais peçonhentos Presença de vapores e gases",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Ferimentos Problemas respiratórios Envenenamento Doenças infecciosas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer a inspeção prévia do local Utilizar de maneira adequada os EPI’s necessários a realização da atividade Prover de iluminação apar acesso a locais de pouca luminosidade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalhos nas margens de barragens e canais",
                "perigo_fonte": "Queda de nível Queda de materiais Afogamento Exposição ao Sol",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Ferimentos Parada respiratória Dermatose",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificar de forma prévia locais de posicionamento de instrumentos de trabalho Utilizar equipamentos de proteção para trabalho em altura Utilizar equipamentos de proteção solar",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte entre locais e acessos",
                "perigo_fonte": "Colisão Tombamento",
                "evento_risco": "",
                "danos_provaveis": "Contusões Lesões Ferimentos Tombamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Redobrar a atenção enquanto trafega pelos acessos das vias Respeitar as regras de trânsito Respeitar as sinalizações implantadas nos acessos Não dar caronas a transeuntes Manter em dia as revisões e manutenções dos veículos Informar ao setor responsável qualquer defeito ou dano no veículo para que seja tomada as devidas precauções e reparos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Óculos de Proteção",
            "Luvas de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Macacão Impermeável (Tiken)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.24). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.18",
        "titulo": "Içamento de Carga",
        "atividades_criticas": [
            "Içamento / Cargas Críticas"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da peça para içamento",
                "perigo_fonte": "Queda de nível Queda de diferente nível Queda de objetos Colisão",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Prensamento Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes de iniciar as atividades fazer a verificação de toda a frente de serviço para garantir que a atividade aconteça sem riscos Realizar a sinalização das áreas de trabalho para impedir a presença de pessoas não autorizadas Sempre que for transportar algum material certificar-se de não ter nenhum colaborador abaixo da peça que será içada Sempre que precisar fazer a utilização da corda guia para contato dos colaboradores com a peça enquanto a mesma está sendo içada",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte de materiais",
                "perigo_fonte": "Queda de objetos Trabalho sobreposto Ausência de sinalização",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Prensamento Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realização da atividade após ser feita a sinalização e realizar o isolamento da área Não permitir que se realize outra atividade simultaneamente na frente de serviço onde estiver sendo feito os trabalhos de içamento e movimentação Manter a área devidamente sinalizada para impedir a presença ou chegada e pessoas não autorizadas ao local",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalhos com cargas pesadas",
                "perigo_fonte": "Quedas de objetos Quebra de equipamentos",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Prensamento Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a área isolada e sinalizada para evitar a presença de pessoas não autorizadas Realização periódica de manutenções preventivas nesses equipamentos Vistoria e chrek-list dos equipamentos devem ser realizadas periodicamente para garantir o bom funcionamento dos equipamentos Verificar as cintas se existem falhas, partes desfiadas, buracos ou marcas de desgaste Verificar o desgaste de outros equipamentos como moitão, travas de segurança, manilhas e demais que possam interferir no bom funcionamento do equipamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Amarrações",
                "perigo_fonte": "Quedas de objetos",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Prensamento Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar as amarrações de forma correta para garantir a estabilidade da peça durante a operação Manter a área isolada e sinalizada para evitar a presença de pessoas não autorizadas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.18). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.27",
        "titulo": "Içamento de Módulos de Comporta",
        "atividades_criticas": [
            "Içamento / Cargas Críticas"
        ],
        "riscos": [
            {
                "passo_tarefa": "Posicionamento dos equipamentos",
                "perigo_fonte": "Queda de nível Queda de objetos Esforço físico",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Quedas Contusões Luxações",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Observar as condições da frente de serviço antes de iniciar as atividades em questão Realizar orientação aos colaboradores sobre as condições da frente de serviço Sinalizar e isolar a frente de serviço mantendo apenas pessoal necessário para atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte de equipamentos",
                "perigo_fonte": "Queda de objeto Queda de mesmo nível Colisão",
                "evento_risco": "",
                "danos_provaveis": "Fraturas Cortes Hematomas Perfurações Contusões Luxações",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Andar com atenção e cuidado com os obstáculos no local de trabalho Analisar o comportamento do solo antes e durante a atividade Estabelecer distancias mínimas entre os colaboradores e equipamentos durante a execução das atividades Manter o local sinalizado e isolado durante a realização da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Remoção de peças e equipamentos",
                "perigo_fonte": "Queda de objeto Queda de nível Tombamento de materiais ou peças Presença de animais peçonhentos Falha no equipamento",
                "evento_risco": "",
                "danos_provaveis": "Pensamento Esmagamento Contusão Fraturas Traumas Lesões Escoriações Envenenamento por animal peçonhento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar equipamentos adequados para realizar o içamento ou remoção das peças ou equipamentos Isolar e sinalizar o local para evitar a presença de pessoas não autorizadas Manter apenas o efetivo necessário no local da atividade Utilizar os E.P.C’ s e E.P.I.’ s necessários para sanar os riscos existentes na frente de serviço Prover de profissional autorizado e habilitado para realizar atividades de içamento de cargas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.27). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.05",
        "titulo": "Manutenção Elétrica no Canteiro",
        "atividades_criticas": [
            "Eletricidade / SEP (NR-10)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Manutenção em todo canteiro de obra",
                "perigo_fonte": "Queda em altura - Curto-circuito; - Impacto de objetos ferramentas ou equipamentos contra os trabalhadores; - Impacto de ferramentas e objetos contra instalações elétricas; - Choque - Incêndio",
                "evento_risco": "",
                "danos_provaveis": "Contusões - Perfurações - Queimaduras - Fratura de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Atendimento às Normas Regulamentadoras (NRs), do MTE, e demais legislações vigentes (CLT); - Usar os EPIs adequados para o tipo de trabalho que está sendo executado: capacete, óculos, luvas apropriadas, uniforme, calçado de segurança e ferramentas adequadas para eletricistas; - Cuidar para que as fiações tomadas e disjuntores não fiquem desprotegidos (quadros elétricos); - Fazer sempre o uso do conjunto plug/tomada; - Manter toda rede elétrica da obra aérea e protegida com conduletes ou fazer uso de cabos - Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção nos painéis elétricos e robô.",
                "perigo_fonte": "Impacto de materiais e objetos contra os trabalhadores; - Entroncamento dos cabos no chão; - Choque; - Incêndio.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras; - Fratura; - Emprensamento.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso de disjuntores (desativar quando entrar em curto circuito); - Uso de tomadas monofásico-trifásicas; - Atentar para uso do conjunto plug /tomadas; - Utilizar sempre cabos múltiplos; - Evitar uso de fios paralelos; - Zelar para que as extensões estejam isoladas de materiais metálicos e fora de área de trânsito de veículos (suspensas); - Confeccionar os quadros de forma segura e adequada para as instalações elétricas; - Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção nas redes elétricas do canteiro de obras",
                "perigo_fonte": "Impacto de ferramentas por trabalhadores; - Projeção de materiais e objetos sobre a rede e pessoas; - Curto circuito e queima dos fusíveis; - Queda de pessoas de nível diferente; - Choque elétrico; - Incêndio",
                "evento_risco": "",
                "danos_provaveis": "Fraturas; - Contusões; - Danos materiais/pessoais; - Perfurações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Desenergização elétrica na sua impossibilidade, o emprego de tensão de segurança; - Manter a rede elétrica sinalizada com placas indicativa (rede elétrica ou cabo enterrado); - Colocar nas emendas dos cabos fita de alto-baixa fusão e se possível evitar emendas; - Fazer uso de eletrodutos nas fiações enterradas; - Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Instalações de máquinas e equipamentos;",
                "perigo_fonte": "Curto circuito; - Choque elétrico; - Incêndio.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a demarcação da fiação elétrica que alimenta as máquinas enterrada; - Melhorar e fazer inspeção no aterramento das máquinas/equipamentos; - Fazer uso de eletrodutos nos cabos de alimentação das máquinas a fim de evitar umidade provocada pela chuva e outros; - No caso de emendas (não podendo evitar), usar fita de alta fusão; - Extintor de incêndio tipo CO2 ; - Evitar gambiarras e fios paralelos; - Só será executado por profissional habilitado/qualificado com Curso NR 10; - Isolação das partes vivas, obstáculos, barreiras, sinalização, sistema de seccionamento automático de alimentação, bloqueio do religamento automático; - utilizar o cento de segurança, tipo abdominal, em atividade acima de 2 metros; - É vedado o uso de adornos pessoais nos trabalhos com instalações elétricas ou em suas proximidades; - Utilizar as luva para eletricista - Manter a demarcação da fiação elétrica que alimenta as máquinas aterrada; - Melhorar e fazer inspeção no aterramento das máquinas/equipamentos; - Fazer uso de eletrodutos nos cabos de alimentação das máquinas a fim de evitar umidade provocada pela chuva e outros; - No caso de emendas (não podendo evitar), usar fita de alta fusão; - Extintor de incêndio tipo CO2 ; - Evitar gambiarras e fios paralelos; - Só será executado por profissional habilitado/qualificado; Com curso de NR 10; - Isolação das partes vivas, obstáculos, barreiras, sinalização, sistema de seccionamento automático de alimentação, bloqueio do religamento automática.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Luva para Eletricista (Isolante)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.05). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.40",
        "titulo": "Manutenção Mecânica",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente Queda de materiais Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção mecânica",
                "perigo_fonte": "Ruído Quedas de materiais Içamento de materiais Queda de nível Descarga elétrica",
                "evento_risco": "",
                "danos_provaveis": "Perda Aditiva; Fratura e escoriação; Contusão e Esmagamento Queimaduras e choques elétricos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar protetor auricular Utilizar cordas guias para realização de movimentação de matérias por içamento Manter a área de trabalho isolada Utilizar os EPC’s adequados para realização de trabalhos em altura e com andaimes Certificar-se do desligamento elétrico dos equipamentos, testar os equipamentos antes de iniciar as atividades através de equipamentos adequados, prover de sinalização e bloqueio nos painéis elétricos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Limpeza e recuperação de peças e acessórios",
                "perigo_fonte": "Ruído; Queda de materiais Produtos químicos Postura inadequada",
                "evento_risco": "",
                "danos_provaveis": "Perda Auditiva; Contusões, fraturas, ferimentos; Lesões, escoriações, fraturas e cortes; Lesão na coluna e nas articulações Infecções respiratórias; Irritação na pele e olhos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso do protetor auricular; Manter o equipamento sempre nivelado em superfície; Prover de proteção para os membros superiores Proteção facial e respiratória Postura adequada no trabalho; Utilizar os E.P.I’ s indicados a cada produto conforme especificação da ficha FISPQ (Ficha de Inspeção de Segurança para produtos Químicos) Manter isolamento e sinalização na área durante a execução de atividades de içamento de carga, mantendo apenas pessoal autorizado no local",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Lubrificação e posicionamento de peças e acessórios",
                "perigo_fonte": "Queda de Material Contato com produtos químicos Tombamento de peças e equipamentos Derramamento de óleos e outras substâncias",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Contusões Intoxicação Irritação das vias respiratórias Danos físicos e ao meio ambiente",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S inerentes a atividade a ser realizada Manter kit de mitigação disponível na frente de serviço",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Remontagem",
                "perigo_fonte": "Ruído Quedas de materiais Içamento de materiais Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Perda Aditiva; Fratura e escoriação; Contusão e Esmagamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar protetor auricular Utilizar cordas guias para realização de movimentação de matérias por içamento Manter a área de trabalho isolada Utilizar os EPC’s adequados para realização de trabalhos em altura e com andaimes",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Testes",
                "perigo_fonte": "Partes móveis desprotegidas Energização Desmontagem de andaimes e estruturas",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos, contusões, fraturas Choque elétrico Queda de materiais Queda de nível",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter distância segura dos equipamentos durante os testes, mantendo a área isolada e sinalizada Manter os colaboradores longe partes energizadas Utilizar cordas guias para materiais içados Utilizar os E.P.I.’s adequados aos trabalhos em altura para desmontagem de andaimes e estruturas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso de ponte rolante",
                "perigo_fonte": "Falha operacional - Danos aos equipamentos - Quedas da ponte rolante ou do pórtico. - Queda de peças/estruturas",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos - Contusões - Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Só será autorizada a permanência na atividade, dos colaboradores que portarem todos os EPI’s obrigatórios para a execução da atividade. Os funcionários que não sentirem-se bem deverá avisar a seu encarregado para encaminhá-los ao ambulatório A ponte rolante deve dispor de alarme sonoro audível aos demais colaboradores A operação da ponte rolante deverá ser realizada por profissional qualificado e autorizado a operar o equipamento.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Subida e descida dos pórticos",
                "perigo_fonte": "Quedas de pessoas. - Falha operacional - Danos aos equipamentos",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos - Contusões - Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Só é permitido subir nas escadas marinheiro de acesso as cabines que tiverem um cabo-guia para trava-quedas - É obrigatório o uso de cinto de segurança e trava-quedas nas escadas marinheiro para acessar a cabine de operação - O operador do pórtico e os demais envolvidos deverão passar por treinamento de trabalho em altura.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.40). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "044",
        "titulo": "Manutenção e Reparo de Canaleta/Meio-Fio de Concreto",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Separação, inspeção e carregamento de ferramentas e equipamentos no caminhão de apoio",
                "perigo_fonte": "Esforço físico excessivo / postura inadequada no levantamento de peso; - Queda de materiais (marretas, ponteiros, martelete, fôrmas) sobre os membros; - Prensagem de dedos/mãos durante o manuseio; - Equipamentos/ferramentas defeituosas.",
                "evento_risco": "",
                "danos_provaveis": "Lombalgias, distensões musculares e fadiga; - Contusões, hematomas, escoriações e fraturas; - Lesões por esmagamento; - Acidentes operacionais em campo por falha do equipamento.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar a inspeção prévia (check-list) de todas as ferramentas e cabos elétricos antes do embarque;- Adotar postura ergonômica correta: dobrar os joelhos e manter a coluna ereta ao erguer cargas;- Solicitar auxílio de um colega ou uso de equipamento mecânico para pesos acima de 23 kg;- Uso obrigatório de luvas de vaqueta e botina com biqueira de aço;- Acondicionar e amarrar os materiais na carroceria do caminhão de forma segura para evitar deslocamentos durante o trajeto.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Deslocamento da equipe e materiais até a frente de serviço (Canal)",
                "perigo_fonte": "Acidentes de trânsito (colisão, capotamento, atropelamento); - Queda de pessoas da carroceria do veículo; - Queda de materiais/ferramentas mal estivadas durante o trajeto.",
                "evento_risco": "",
                "danos_provaveis": "Lesões graves, fraturas, politraumatismo e fatalidade; - Lesões por impacto ou esmagamento na queda; - Lesões a terceiros ou danos materiais.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O transporte de colaboradores deve ser feito estritamente em veículos adequados e homologados (cabine), sendo expressamente proibido pegar carona na carroceria ou junto com as ferramentas;- Respeitar os limites de velocidade das vias internas da obra e manter os faróis acessos; - O motorista deve ser devidamente habilitado e treinado para o veículo de apoio;- Certificar-se de que a carga está travada e as tampas da carroceria estão travadas antes de iniciar o movimento.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação da área e sinalização do local de trabalho",
                "perigo_fonte": "Atropelamento por veículos/máquinas em movimento na proximidade; - Ataque de animais peçonhentos na vegetação marginal; - Postura inadequada no transporte de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, fraturas, fatalidade; - Picadas de escorpiões, cobras ou aranhas; - Lombalgias e dores musculares.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Isolar e sinalizar a área com cones, fitas zebradas e placas antes de iniciar os trabalhos; - Divulgar a APR no DDS para toda a equipe envolvida; - Inspecionar visualmente o local antes de adentrar na vegetação, utilizando perneiras; - Adotar postura correta para levantamento de cargas (máx. 23kg por colaborador).",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Demolição do concreto danificado (Canaleta/Meio-fio) com ponteiro/marreta ou martelete",
                "perigo_fonte": "Projeção de partículas (estilhaços de concreto); - Ruído excessivo e vibração de ferramentas; - Posição ergonômica forçada; - Queda de nível (borda do canal).",
                "evento_risco": "",
                "danos_provaveis": "Lesões oculares, cortes, escoriações; - Perda auditiva temporária/definitiva, fadiga; - Lesões na coluna e articulações; - Quedas na canaleta/canal.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso obrigatório de óculos de proteção contra impacto ou protetor facial; - Uso de protetor auditivo (concha ou inserção) e luvas de vaqueta/raspa; - Revezamento de braço na atividade e pausas periódicas para evitar esforço repetitivo; - Atenção aos limites de borda; se houver risco de queda em altura/profundidade, instalar proteção coletiva ou linha de vida.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso do compactador de solo manual",
                "perigo_fonte": "Queda de nível - Inalação de monóxido de carbono",
                "evento_risco": "",
                "danos_provaveis": "Machucar membros inferiores - Ferimentos em geral - Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mantenha mãos e pés afastados das partes móveis do equipamento, sempre utilizando os EPIs para operar o compactador - Evite compactar áreas de encosta, barrancos e valas que ofereçam riscos de desmoronamento ou deslizamento - A operação desse equipamento deve obedecer aos treinamentos exigidos, restringido seu uso apenas há colaboradores capacitados - As imediações de uso desta máquina são proibido fazer fogo, fumar, bem como utilizá-la em locais sujeitos a gases e líquidos inflamáveis",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparo de argamassa/concreto (manual ou mecânico)",
                "perigo_fonte": "Contato da pele com cimento e agregados; - Inalação de poeira de cimento/areia; - Projeção de material nos olhos.",
                "evento_risco": "",
                "danos_provaveis": "Dermatites de contato, queimaduras químicas; - Problemas respiratórios, irritação das vias aéreas; - Conjuntivite química.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso obrigatório de respirador para poeiras; - Uso de luvas de vaqueta/nitrílica e mangas compridas para evitar contato direto com o cimento úmido; - Manter lavatório ou água limpa próxima para higienização imediata em caso de contato.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Aplicação do concreto, nivelamento e acabamento do meio-fio/canaleta",
                "perigo_fonte": "Postura ergonômica inadequada (trabalho prolongado agachado); - Exposição à radiação solar; - Ferimentos com ferramentas manuais (colher de pedreiro, desempenadeira).",
                "evento_risco": "",
                "danos_provaveis": "Dores lombares, desvios na coluna; - Desidratação, insolação, queimaduras na pele; - Cortes e escoriações nas mãos.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar pausas programadas para alongamento e mudança de postura; - Uso obrigatório de bloqueador solar e capacete com jugular; - Manter água potável disponível e fresca na proximidade da atividade; - Manusear ferramentas manuais com atenção, inspecionando a fixação dos cabos.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Para todas as atividades na manutenção do canal",
                "perigo_fonte": "Queda de nível diferente e queda de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Machucar membros/ ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mesmo com check list é obrigatório todos os colaboradores fazer verificação de todos os EPI’s antes de iniciar as atividades; - Isolar e sinalizar a área; - Não ultrapasse por local isolado com risco de queda de arvore e material.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Limpeza, organização da área e descarte de resíduos",
                "perigo_fonte": "Geração de entulho e materiais pontiagudos (restos de arame, pregos ou lascas); - Queda do mesmo nível por tropeções.",
                "evento_risco": "",
                "danos_provaveis": "Perfurações, cortes, infecções (tétano); - Escoriações, hematomas e luxações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso de luva de vaqueta/pigmentada e botina com biqueira de aço durante o recolhimento de resíduos; - Não acumular entulho na borda do canal para evitar quedas de materiais ou sobrecarga; - Destinar todo o resíduo gerado (restos de concreto, sacos de cimento) para as caçambas ou locais indicados pelo Meio Ambiente.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 044). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.01",
        "titulo": "Manutenção em Equipamentos Elétricos",
        "atividades_criticas": [
            "Eletricidade / SEP (NR-10)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Planejamento das atividades",
                "perigo_fonte": "Descumprimento da Legislação",
                "evento_risco": "",
                "danos_provaveis": "Falha na execução da atividade podendo ocasionar acidentes; - Execução inadequada pelos profissionais diretamente ligados ao processo; - Falta de documentação necessária",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes de iniciar qualquer atividade, todos documentos e projetos deverão ser checados e avaliado; - Todos os profissionais devem ser capacitados e treinados com relação as atividades a serem realizadas bem como análise de risco da atividade; - Antes da execução dos trabalhos, verificar toda documentação exigida pelas leis e normas bem como procedimentos específicos a serem seguidos; manter no local de trabalho, estando disponível para consulta aos envolvidos na tarefa bem como, cliente e órgãos fiscalizadores; toda documentação necessária para atividade deve ser assinada por todos envolvidos; qualquer alteração ou surgimento de novas situações no decorrer da atividade seja na elaboração de projetos como também análises de riscos da atividade, os documentos devem passar por revisão e consequentemente divulgado as alterações ao envolvidos.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção em todo canteiro de obra/ e dependências do empreendimento",
                "perigo_fonte": "Queda em altura - Curto-circuito; - Impacto de objetos - Ferramentas ou equipamentos contra os trabalhadores; Impacto de ferramentas e objetos contra instalações elétricas; - Choque - Incêndio",
                "evento_risco": "",
                "danos_provaveis": "Contusões - Perfurações - Queimaduras - Fratura de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Atendimento às Normas Regulamentadoras (NRs), do MTE, e demais legislações vigentes (CLT); - Usar os EPIs adequados para o tipo de trabalho que está sendo executado: capacete, óculos, luvas apropriadas, uniforme, calçado de segurança e ferramentas adequadas para eletricistas; - Cuidar para que as fiações tomadas e disjuntores não fiquem desprotegidos (quadros elétricos); - Fazer sempre o uso do conjunto plug/tomada; - Manter toda rede elétrica da obra aérea e protegida com conduletes ou fazer uso de cabos - Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção nos painéis elétricos e robô.",
                "perigo_fonte": "Impacto de materiais e objetos contra os trabalhadores; Entroncamento dos cabos no chão; Choque; Incêndio.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras; - Fratura; - Prensamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso de disjuntores (desativar quando entrar em curto-circuito); - Uso de tomadas monofásico-trifásicas; - Atentar para uso do conjunto plug /tomadas; - Utilizar sempre cabos múltiplos; - Evitar uso de fios paralelos; - Zelar para que as extensões estejam isoladas de materiais metálicos e fora de área de trânsito de veículos (suspensas); - Confeccionar os quadros de forma segura e adequada para as instalações elétricas; - Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Manutenção nas redes elétricas",
                "perigo_fonte": "Impacto de ferramentas por trabalhadores; Projeção de materiais e objetos sobre a rede e pessoas; Curto-circuito e queima dos fusíveis; Queda de pessoas de nível diferente; Choque elétrico; Incêndio",
                "evento_risco": "",
                "danos_provaveis": "Fraturas; Contusões; Danos materiais/pessoais; Perfurações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Desenergização elétrica na sua impossibilidade, o emprego de tensão de segurança; - Manter a rede elétrica sinalizada com placas indicativa (rede elétrica ou cabo enterrado); - Colocar nas emendas dos cabos fita de alto-baixa fusão e se possível evitar emendas; Fazer uso de eletrodutos nas fiações enterradas; Extintor de incêndio tipo CO2 ;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Instalações de máquinas e equipamentos;",
                "perigo_fonte": "Curto-circuito; Choque elétrico; Incêndio.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter a demarcação da fiação elétrica que alimenta as máquinas enterrada; Melhorar e fazer inspeção no aterramento das máquinas/equipamentos; Fazer uso de eletrodutos nos cabos de alimentação das máquinas a fim de evitar umidade provocada pela chuva e outros; No caso de emendas (não podendo evitar), usar fita de alta fusão; Extintor de incêndio tipo CO2 ; Evitar gambiarras e fios paralelos; Só será executado por profissional habilitado/qualificado com Curso NR 10; Isolação das partes vivas, obstáculos, barreiras, sinalização, sistema de seccionamento automático de alimentação, bloqueio do religamento automático; Utilizar o cinto de segurança, tipo abdominal, em atividade acima de 2 metros; É vedado o uso de adornos pessoais nos trabalhos com instalações elétricas ou em suas proximidades; Utilizar as luvas para eletricista Manter a demarcação da fiação elétrica que alimenta as máquinas aterrada; Melhorar e fazer inspeção no aterramento das máquinas/equipamentos; Fazer uso de eletrodutos nos cabos de alimentação das máquinas a fim de evitar umidade provocada pela chuva e outros; No caso de emendas (não podendo evitar), usar fita de alta fusão; Extintor de incêndio tipo CO2 ; Evitar gambiarras e fios paralelos; Só será executado por profissional habilitado/qualificado; Com curso de NR 10; Isolação das partes vivas, obstáculos, barreiras, sinalização, sistema de seccionamento automático de alimentação, bloqueio do religamento automático.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Identificação /sinalização do serviço",
                "perigo_fonte": "Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Choque",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Ter atenção e cuidado, Providenciar Togout/Logout",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Energização da rede",
                "perigo_fonte": "Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras, afastamento do profissional",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificar se a rede a ser energizada está totalmente verificada e sem a presença de pessoas não autorizadas nas proximidades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desligamento chave seccionadora da cabine primária",
                "perigo_fonte": "Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras - Choque - Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Usar luva de alta tensão e vaqueta",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Aterramento dos barramentos de alta tensão.",
                "perigo_fonte": "Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras - Choque - Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Usar bastão isolado, luva de alta tensão, aparelho detector de tensão",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Ensaios elétricos dos equipamentos elétricos, utilizando megômetro, TTR (teste de relação de transformação), microhomimetro.",
                "perigo_fonte": "Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras - Choque - Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter distância do transformador ( Limite cabo ), Usar luvas de vaqueta, evitar aproximação de pessoas não envolvidas na atividade.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Limpeza dos equipamentos com álcool (pano industrial)",
                "perigo_fonte": "Incêndio. Queda de diferentes níveis e altura, Queda de objetos sobre terceiros.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras - Choque - Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não utilizar chamas expostas; Acima de dois metros de altura utilizar cinto de segurança; não transportar material sobre pessoas e nem permitir pessoas debaixo do transformador ou sobre qualquer carga suspensa.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Serviços no Pátio da SE",
                "perigo_fonte": "Riscos específicos da subestação - Erro de manobra, acionamento indesejado",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras - Choque - Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes do início da obra e durante seu desenvolvimento, deverão haver reuniões entre Operador da Subestação ou Representante do Engenheiro Eletricista do Sítio e CONTRATADA onde os aspectos de segurança de pessoal, específicos para a obra, deverão ser abordados. Instruções minuciosas e identificação dos pontos que oferecem risco de acidentes, deverão ser efetuadas antes do início de cada serviço.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Luva para Eletricista (Isolante)",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.01). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.04",
        "titulo": "Manutenção no Entorno do Canal",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Corte de Árvores Utilizando foice",
                "perigo_fonte": "Atingir auxiliares pela proximidade excessiva da área de uso de ferramentas manuais; - Picada de animais Peçonhentos.",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações e fatalidade e esforço repetitivo;",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Nenhuma tarefa poderá ser iniciada sem a divulgação da APT nos DDS, a todos os colaboradores envolvidos; - Andar com atenção e cuidado aos obstáculos no local de trabalho; - Avaliar o comportamento do solo antes e durante a atividade; - Problemas ergonômicos, desvio da coluna; -Somente será autorizada a permanência na atividade, os colaboradores que portarem todos os EPI´s obrigatórios para a atividade a ser realizada; - Usar máscara para poeiras (quando necessário); - Manter a área limpa, Organizada e sinalizada; - Inspeção prévia das condições das ferramentas manuais; - Todos os resíduos gerados durante a execução da atividade deverão ser recolhidos ao final dos trabalhos e direcionados ao local certo; - Manusear as ferramentas pelo cabo, cortando sempre no sentido contrário ao corpo.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desbaste do entorno de árvores a serem abatidas;",
                "perigo_fonte": "Queda de árvores ou galhada sobre colaboradores",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Andar com atenção e cuidado aos obstáculos no local de trabalho; - Avaliar o comportamento do solo antes e durante a atividade; - Estabelecimento de distâncias mínimas entre os colaboradores durante a execução da atividade; - Ter cuidado e atenção ao manter contato com a vegetação ou madeiras em decomposição, presença de cobras, escorpiões e aranhas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Roçado e remoção da galhada e troncos das áreas da faixa do canal da transposição.",
                "perigo_fonte": "Ferramentas defeituosas; - Ferimento causado pela foice; - Queda da carroceria do veículo na operação de carga ou descarga de lenha e madeira",
                "evento_risco": "",
                "danos_provaveis": "Lesão nas mãos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não trabalhar com ferramenta defeituosa, substituir as ferramentas defeituosas e providenciar o reparo das mesmas; - Procedimento de manutenção de distância segura entre operadores de ferramentas manuais (machados e foices; - Pausar periodicamente quando o trabalho for prolongado; - Não deve transitar dentro da vegetação; - Ter cuidado e atenção ao manter contato com a vegetação ou madeiras em decomposição, presença de cobras, escorpiões e aranhas. - Manusear as ferramentas pelo cabo, cortando sempre no sentido contrário ao corpo; - Os materiais deverão ser acondicionados de forma a não se movimentarem durante o transporte, pois ao serem retirados podem se movimentar e causar ferimentos; - Todas as medidas de segurança propostas a serem adotadas deverão seguir as Normas Regulamentadoras da Portaria 3214/78;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso do compactador de solo manual",
                "perigo_fonte": "Queda de nível - Inalação de monóxido de carbono",
                "evento_risco": "",
                "danos_provaveis": "Machucar membros inferiores - Ferimentos em geral - Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mantenha mãos e pés afastados das partes móveis do equipamento, sempre utilizando os EPIs para operar o compactador - Evite compactar áreas de encosta, barrancos e valas que ofereçam riscos de desmoronamento ou deslizamento - A operação desse equipamento deve obedecer os treinamento exigidos, restringido seu uso apenas há colaboradores capacitados - As imediações de uso desta máquina é proibido fazer fogo, fumar, bem como utilizá-la em locais sujeitos a gases e líquidos inflamáveis",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Para todas as atividades na manutenção do canal",
                "perigo_fonte": "Queda de nível diferente e queda de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Machucar membros/ ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mesmo com check list é obrigatório todos os colaboradores fazer verificação de todos os EPI’s antes de iniciar as atividades; - Isolar e sinalizar a área; - Não ultrapasse por local isolado com risco de queda de arvore e material.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.04). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.32",
        "titulo": "Montagem e Desmontagem de Motobomba",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente Queda de materiais Queda de nivel",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desmontagem de motobombas",
                "perigo_fonte": "Ruído Quedas de materiais Içamento de materiais Queda de nível Descarga elétrica",
                "evento_risco": "",
                "danos_provaveis": "Perda Aditiva; Fratura e escoriação; Contusão e Esmagamento Queimaduras e choques elétricos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar protetor auricular Utilizar cordas guias para realização de movimentação de matérias por içamento Manter a área de trabalho isolada Utilizar os EPC’s adequados para realização de trabalhos em altura e com andaimes Certificar-se do desligamento elétrico dos equipamentos, testar os equipamentos antes de iniciar as atividades através de equipamentos adequados, prover de sinalização e bloqueio nos painéis elétricos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Limpeza e recuperação de peças e acessórios",
                "perigo_fonte": "Ruído; Queda de materiais Produtos químicos Postura inadequada",
                "evento_risco": "",
                "danos_provaveis": "Perda Auditiva; Contusões, fraturas, ferimentos; Lesões, escoriações, fraturas e cortes; Lesão na coluna e nas articulações Infecções respiratórias; Irritação na pele e olhos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso do protetor auricular; Manter o equipamento sempre nivelado em superfície; Prover de proteção para os membros superiores Proteção facial e respiratória Postura adequada no trabalho; Utilizar os E.P.I’ s indicados a cada produto conforme especificação da ficha FISPQ (Ficha de Inspeção de Segurança para produtos Químicos) Manter isolamento e sinalização na área durante a execução de atividades de içamento de carga, mantendo apenas pessoal autorizado no local",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Lubrificação e posicionamento de peças e acessórios",
                "perigo_fonte": "Queda de Material Contato com produtos químicos Tombamento de peças e equipamentos Derramamento de óleos e outras substâncias",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Contusões Intoxicação Irritação das vias respiratórias Danos físicos e ao meio ambiente",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S inerentes a atividade a ser realizada Manter kit de mitigação disponível na frente de serviço",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Remontagem",
                "perigo_fonte": "Ruído Quedas de materiais Içamento de materiais Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Perda Aditiva; Fratura e escoriação; Contusão e Esmagamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar protetor auricular Utilizar cordas guias para realização de movimentação de matérias por içamento Manter a área de trabalho isolada Utilizar os EPC’s adequados para realização de trabalhos em altura e com andaimes",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Testes",
                "perigo_fonte": "Partes móveis desprotegidas Energização Desmontagem de andaimes e estruturas",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos, contusões, fraturas Choque elétrico Queda de materiais Queda de nível",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter distância segura dos equipamentos durante os testes, mantendo a área isolada e sinalizada Manter os colaboradores longe partes energizadas Utilizar cordas guias para materiais içados Utilizar os E.P.I.’s adequados aos trabalhos em altura para desmontagem de andaimes e estruturas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.32). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.07",
        "titulo": "Operação com Munk",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço.",
                "perigo_fonte": "Queda de nível Queda de objetos",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações -Lesões, fraturas e cortes.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s, e da NR-12 Máquinas e Equipamentos. -É responsabilidade de o encarregado tornar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Estacionamento do caminhão e patolamento",
                "perigo_fonte": "Atropelamento; Prensamento de membros; Queda de mesmo nível.; Movimentação irregular do Munck.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações -Lesões, Danos Materiais.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes de iniciar as operações de descarregamento de materiais, o responsável pela mesma deverá providenciar a sinalização e isolamento da mesma, de modo a permitir a proximidade somente dos envolvidos. Havendo a necessidade de se fazer a descarga em áreas de circulação obstruir a mesma; Nunca correr no local de trabalho e observar atentamente os desníveis e interferências nos locais de passagem; Ao estacionar o caminhão, o motorista deverá manter os freios de estacionamento acionados; As operações somente poderão ser iniciadas se o Munck estiver patolado sobre pranchas de madeira com dimensões que garantam boa distribuição da carga ao solo.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Acesso à carroceria do caminhão e descarregamento de materiais diversos.",
                "perigo_fonte": "Queda de nível diferente; Prensamento; Cortes/ perfurações; Ruído; Projeção de particulados; Ergonomia; Poeira.",
                "evento_risco": "",
                "danos_provaveis": "Contusões; Escoriações; Lesões; Danos Materiais; Perda Auditiva; Lombalgia.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "A fim de tornar mais prático, seguro e rápido o acesso às carrocerias, deverá ser adaptada onde inexistir, uma escada que garanta o acesso, sendo proibido subir escalando a carroceria e pular da mesma; É proibido o uso de anéis, alianças, pulseiras, cordões e outros adereços metálicos durante o expediente de trabalho, especialmente nas operações de movimentações de cargas. É obrigatório o uso de luvas adequadas (vaqueta / raspa) para o manuseio e movimentação de cargas e dispositivos de içamento como corda guia na movimentação; Fazer uso de protetor auditivo plug ou concha onde houver excesso de ruído ou máquina em movimento; Fazer uso de óculos de proteção de segurança em atividade de movimentação; Fazer uso de respirador semifacial PFF2 quando necessário.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Amarração das peças a serem descarregados.",
                "perigo_fonte": "Queda de nível diferente; Prensamento; Cortes/ perfurações; Ruído; Projeção de particulados; Ergonomia; Poeira.",
                "evento_risco": "",
                "danos_provaveis": "Contusões; Escoriações; Lesões; Danos Materiais; Perda Auditiva; Lombalgia.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Nunca passar ou permanecer sob carga suspensa, cabendo a todos os participantes das operações, tomar todas as medidas necessárias para que terceiros e participantes das operações não se exponham às cargas suspensa; fazer uso de corda guia. Somente pessoas autorizadas e qualificadas poderão operar o equipamento; Utilizar cordas guias para auxiliar na movimentação de carga, não sendo permitida a entrada abaixo das cargas para manuseá-las; As cargas deverão ser acondicionadas sobre calços de madeira ou material de resistência similar, de modo a manter espaço entre o solo e a carga. Nunca deverá ser colocada uma ou ambas as mãos, ou qualquer outra parte do corpo sob carga suspensa, de modo que, havendo a necessidade de ajustar a posição dos calços deverão ser utilizadas alavancas; Manter os membros superiores e inferiores fora de pontos de pensamento; O dimensionamento dos dispositivos de içamento deverá ser realizado pelo responsável pelas operações, considerando a carga de trabalho +e a capacidade de carga dos dispositivos utilizados; Antes do içamento, o responsável pela movimentação deverá checar as condições das amarrações de modo que as amarrações não se deslocaram do posicionamento indicado antes da movimentação; É proibido sinalizar ao operador com luvas nas mãos, devendo as mãos estarem nuas para a sinalização, observa as anilhas, cabos de aço e outras ferramentas, verificar seu estado físico e realizar cheque list das mesmas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Movimentação e Descarregamento de Materiais",
                "perigo_fonte": "Carga suspensa; Prensamentos; Rompimento dos dispositivos de Içamento; Queda da carga; Falha de comunicação.",
                "evento_risco": "",
                "danos_provaveis": "Contusões; Escoriações; Lesões; Danos Materiais; Perda Auditiva; Lombalgia.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter o isolamento da área de trabalho Não transitar embaixo de carga suspensa Manter no local apenas colaboradores que estejam participando do trabalho",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.07). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.10",
        "titulo": "Operação das Estações de Bombeamento",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Acidentes com veículos/equipamentos",
                "perigo_fonte": "Impacto por e contra; abalroamento, colisão tombamento, atropelamento",
                "evento_risco": "",
                "danos_provaveis": "Danos materiais, Lesões múltiplas, Fraturas Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Somente motorista habilitado e autorizado, que portar Carteira Nacional de Habilitação, deve dirigir conduzir veículos leves nas frentes de serviço. Manter limites de velocidade de 30 e 40 Km/h, definidos segundo a orientação das placas de sinalização, instaladas nos acessos internos. O motorista deve comunicar imediatamente ao encarregado qualquer anormalidade detectada no veículo, fazendo as anotações necessárias na lista de verificação . Antes de acionar ou movimentar o veículo, deve-se observar ao redor do caminhão/equipamento, para não expor pessoas e/ou p patrimônio da empresa ao risco. É proibido o consumo de álcool ou drogas. Antes de iniciar os trabalhos, o topógrafo deve reunir os seus Auxiliares de topografia no local inspecionar a frente de serviço, avaliar e controlar os riscos, acompanhar a tarefa que vai ser executada. Monitorar as condições de estabilidade dos acessos e áreas de trabalho. Em aclives acentuados deve-se regularizar a área de trabalho, a fim de permitir o estacionamento seguro do veículo, É PROIBIDO PARAR E ESTACIONAR nas frentes de carga e descarga dos equipamentos e caminhões pesados. Manter os faróis acessos durante todo o período de trabalho. Não ultrapassar quando não for permitido e quando permitido use as setas, olhe pelos espelhos retrovisores e coloque-se com antecedência na posição para ultrapassar. Antes de realizar conversões ou manobras de retorno, sinalize previamente e mantenha seu veículo na faixa apropriada. Não estacionar de maneira que seu veículo de Ré. Durante a instalação dos aparelhos de medição topografia certificar-se que a área está isolada e que no raio de trabalho da equipe não haja movimentação de equipamentos e/ou caminhões. Durante as operações de carga e descarga manter-se fora do raio de ação dos equipamentos e só aproximar-se após a carga estiver acomodada e estabilizada ou totalmente descarregada.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação do pessoal",
                "perigo_fonte": "Não entender atividade ou não seguir os procedimentos de Segurança",
                "evento_risco": "",
                "danos_provaveis": "Perda de Colaboradores; - Perda de material; - Perda de tempo.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "As atividades somente poderão ter início após a Divulgação desta APR no DDS com seu respectivo registro; - Antes de iniciar as atividades os colaboradores deverão estar cientes das tarefas a serem realizadas e procedimentos a serem seguidos, através de orientações diárias feitas por DDS´s e orientação sobre o conteúdo desta APR.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Verificação dos níveis do canal",
                "perigo_fonte": "Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos - Luxação, entorse, contusão E fratura;",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos E.P.C’ s (Equipamentos de proteção coletiva) instalados nas frentes de serviço",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Acesso a sala de comando",
                "perigo_fonte": "Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos - Luxação, entorse, contusão E fratura;",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos E.P.C’ s (Equipamentos de proteção coletiva) instalados nas frentes de serviço",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Operação dos sistemas",
                "perigo_fonte": "Ergonômicos",
                "evento_risco": "",
                "danos_provaveis": "Problemas de coluna L. E. R (Lesão por esforço repetitivo)",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Prevenção de posições inadequadas Ginastica laboral",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Leituras das instrumentações e manutenção dos painéis",
                "perigo_fonte": "Queda de nível Choque elétrico",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos, Luxação, entorse, contusão E fratura; - Queimaduras - Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPC´s instalados na frente de serviço. - Não realizar operações em áreas energizadas - Realizar o bloqueio dos equipamentos para realização da manutenção - Utilizar os EPI´s necessários para realização das atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.10). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.33",
        "titulo": "Operação de Motosserra",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Fiscalização visual da área de atividade",
                "perigo_fonte": "Queda de nível Animais peçonhentos",
                "evento_risco": "",
                "danos_provaveis": "Fratura e escoriação; Ferimentos Contusões Envenenamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar perneira para proteção dos membros inferiores Sinalizar local de trabalho para evitar a presença de terceiros quando necessário",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Utilização de motosserra",
                "perigo_fonte": "Ruído; Posturas inadequadas; Tombamento de arvores Poeira",
                "evento_risco": "",
                "danos_provaveis": "Perda Auditiva; Lesões, escoriações, fraturas e cortes; Infecções respiratórias; Irritação na pele e olhos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso do protetor auricular; Manter os empregados a uma determinada distancia da máquina; Somente operadores qualificados e treinados poderão operar os equipamentos; Postura adequada durante o trabalho; Não permitir que pessoas fiquem próximas das áreas atividades de corte com motosserra",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carregamento e transporte de materiais",
                "perigo_fonte": "Queda de Material Poeira Ruído Tombamento Falha Mecânica",
                "evento_risco": "",
                "danos_provaveis": "Lesões, Fraturas Infecções nas vias respiratórias Perda auditiva Danos no Veículo Esmagamento de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S óculos de segurança, luvas pigmentadas, botina, respirador PFF 2, bloqueador solar, abafador de ruído; Somente operadores qualificados e treinados poderão operar o equipamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.33). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.13",
        "titulo": "Operação de Máquinas",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Transporte da máquina ao local da atividade",
                "perigo_fonte": "Queda de máquina Atropelamento Colisão entre veículos",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Cortes Fraturas Contusões Lesões Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre que for mover uma máquina de esteira utilizar-se da carreta prancha para o translado. As máquinas devem ser transportadas sempre por veículo adequado e com a utilização das travas ou equipamentos de amarração adequados. Manter a atenção n deslocamento quanto a presença de colaboradores ou moradores das comunidades dos arredores Manter a atenção nas estradas e acessos durante o percurso inteiro do deslocamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação da área para realização da atividade",
                "perigo_fonte": "Atropelamentos Colisão Impacto de máquina contra objeto Acúmulo de pessoas no local",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Cortes Fraturas Quedas Danos materiais Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter o local sinalizado e isolado tendo apenas a presença dos colaboradores que realizarão as atividades Desviar o fluxo de veículos por outro acesso Manter a atenção quanto aos possíveis obstáculos que podem estar no local Sempre realizar as atividades após a realização de uma inspeção prévia no local",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Utilização da máquina",
                "perigo_fonte": "Quebra de equipamento Atropelamento Colisão Tombamento",
                "evento_risco": "",
                "danos_provaveis": "Danos materiais Contusões Lesões Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar o preenchimento do check – list do equipamento periodicamente Fazer uma análise prévia do local antes do início das atividades Utilizar o equipamento apenas para serviços de sua natureza Não improvisar ferramentas para utilização nas atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.13). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.42",
        "titulo": "Pintura de Piso",
        "atividades_criticas": [
            "Produtos Químicos Perigosos"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da superfície",
                "perigo_fonte": "Exposição a produtos Químicos e Soluções Inflamáveis Inalação de substâncias geradas por dessas soluções",
                "evento_risco": "",
                "danos_provaveis": "Intoxicação Dermatose Irritação nos olhos Contaminação do Solo (Derramamento Acidental)",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificação prévia do local Realizar procedimentos de segurança no uso dos produtos tóxicos Utilizar máscara com respirador válvula Utilizar de maneira correta todos os EPI’s necessários a atividade evitando o máximo, contado da pele com os agentes químicos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Pintura",
                "perigo_fonte": "Postura Inadequada Queda de nível Queda de materiais",
                "evento_risco": "",
                "danos_provaveis": "Irritação nos olhos Contaminação do Solo (Derramamento Acidental)",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar procedimentos de segurança no uso dos produtos tóxicos Utilizar máscara PFF2 Utilizar de maneira correta todos os EPI’s necessários a atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação dos materiais",
                "perigo_fonte": "Exposição aos produtos químicos.",
                "evento_risco": "",
                "danos_provaveis": "Dermatite,intoxicação,irritaçõesrespiratoria.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso do EPI adequado; ventilação do local; armazenamento seguro.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Aplicação de tintas no piso",
                "perigo_fonte": "Inalação de vapores, contato com tinta; postura inadequada.",
                "evento_risco": "",
                "danos_provaveis": "Intoxicação,irritações,desconforto físico/muscular.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mascaras com filtros apropriados (p2 ou vapores orgânico) , pausas ergonômicas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trânsitos de pessoas próximas",
                "perigo_fonte": "Interrupções, riscos de acidentes.",
                "evento_risco": "",
                "danos_provaveis": "Contaminações da pintura, escorregões.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Isolamento da área, barreiras físicas, comunicação previa ,sinalização .",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Secagem da tinta.",
                "perigo_fonte": "Liberações de vapores.",
                "evento_risco": "",
                "danos_provaveis": "Inalação de vapores.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Ventilação natural ou exaustão local, tempo de secagem adequada.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Descarte de resíduos",
                "perigo_fonte": "Contaminação ambiental.",
                "evento_risco": "",
                "danos_provaveis": "Danos ao meio ambiente, multas.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Descarte conforme legislação ambiental vigente , armazenamento temporário.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.42). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.14",
        "titulo": "Rampa de Lavagem",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação do veículo",
                "perigo_fonte": "Colisão Atropelamento",
                "evento_risco": "",
                "danos_provaveis": "Prensamento Ferimento Lesão Corte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Ao realizar manobras com veículos redobrar a atenção e sempre ter como auxílio os espelhos retrovisores Manter a sinalização do local visível para todos os colaboradores que estiverem no entorno das atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Lavagem do veículo com jato d’agua",
                "perigo_fonte": "Umidade Contato como produtos químicos",
                "evento_risco": "",
                "danos_provaveis": "Irritação cutânea Alergia Queimaduras",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre que for realizar esse tipo de atividade será necessário utilizar todos os EPI´s de maneira adequada para evitar contatos a pele de produtos químicos e evitar também o excesso de umidade que possa vir a se expor",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Aplicação de xampu veicular",
                "perigo_fonte": "Contato com produtos químicos",
                "evento_risco": "",
                "danos_provaveis": "Irritação das vias aéreas Irritação da pele",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sempre se utilizar de todos os EPI´s para realizar essas atividades evitando assim o contato direto com essa substância",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Bota de Borracha (Impermeável)",
            "Macacão Impermeável (Tiken)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.14). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.43",
        "titulo": "Realização de Inspeção na Linha de Transmissão (LT) 69 KV",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Planejamento e Preparação da Inspeção",
                "perigo_fonte": "Falha na comunicação. - Planejamento inadequado da rota. - Descumprimento de normas (NR-10, NR-12, NR-35).",
                "evento_risco": "",
                "danos_provaveis": "Acidentes graves por falta de autorização. - Atrasos na execução. - Exposição a riscos não previstos. - Sanções legais e administrativas.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar DDS (Diálogo Diário de Segurança) antes de iniciar a atividade. - Obter a Liberação e Autorização formal do COP para a inspeção. - Analisar os projetos da LT, mapas e condições de acesso. - Verificar a validade dos treinamentos da equipe (NR-10, NR-12, NR-35). - Assegurar que todos os EPIs e EPCs necessários estejam disponíveis e em bom estado.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Deslocamento e Acesso à Faixa de Servidão",
                "perigo_fonte": "Acidentes com veículos. - Ataque de animais peçonhentos (cobras, aranhas). - Condições adversas do terreno (atoleiros, buracos).",
                "evento_risco": "",
                "danos_provaveis": "Lesões corporais, fraturas. - Danos materiais aos veículos. - Picadas venenosas, reações alérgicas. - Atraso ou interrupção da atividade.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar checklist de segurança dos veículos. - Portar kit de primeiros socorros e rádio de comunicação. - Utilizar perneiras de segurança, botinas e luvas de vaqueta para proteção. - Manter atenção constante ao terreno durante o deslocamento a pé.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Inspeção Visual da Rede e da Vegetação",
                "perigo_fonte": "Risco Elétrico: Proximidade ou contato acidental com cabos energizados. - Risco Elétrico: Indução elétrica em cercas, vegetação ou no próprio inspetor. - Queda de objetos (componentes da rede).",
                "evento_risco": "",
                "danos_provaveis": "Choque elétrico, arco elétrico, queimaduras graves, fibrilação, óbito. - Lesões por impacto, traumatismo craniano.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter distância de segurança da rede energizada, conforme estabelecido na NR-10. - Não tocar em cercas, portões metálicos ou vegetação alta sob a linha sem antes verificar a ausência de tensão de indução com detector. - Utilizar capacete com jugular e óculos de segurança.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Remoção de Vegetação com Motosserra",
                "perigo_fonte": "Risco Elétrico: Contato da vegetação (árvore/galho) com a rede energizada durante o corte. - Risco Elétrico: Contato do operador ou do motosserra com a rede. - Cortes, lacerações, projeção de partículas.",
                "evento_risco": "",
                "danos_provaveis": "Arco elétrico, choque elétrico (potencialmente fatal), curto-circuito, interrupção do fornecimento de energia. - Ferimentos graves, amputações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "A atividade só pode ser iniciada após análise e liberação por profissional qualificado. - Manter distância de segurança rigorosa. O corte deve ser planejado para que a queda da árvore/galho ocorra no sentido oposto à rede. - Utilizar bastão de manobra para guiar a queda, se necessário. - Operador de motosserra deve ter treinamento específico (NR-12). - Uso obrigatório de todos os EPIs específicos para a atividade.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Encerramento da Atividade",
                "perigo_fonte": "Falha no registro de informações críticas (pontos de risco). - Comunicação inadequada",
                "evento_risco": "",
                "danos_provaveis": "Perda de dados importantes para a manutenção. - Risco de acidentes futuros por falta de correção das anomalias.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar formulários padronizados ou aplicativos para registro fotográfico e descritivo das anomalias. - Assegurar que todas as informações sejam claras e completas. - Comunicar formalmente ao COP o término da inspeção e a saída da equipe da área.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Luva para Eletricista (Isolante)",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.43). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.45",
        "titulo": "Reparo com Injeção de Calda",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação e Manuseio dos Produtos Químicos (Resinas/Calda de Injeção)",
                "perigo_fonte": "Contato dérmico e ocular com substâncias químicas.• Inalação de vapores tóxicos ou poeiras químicas.• Derramamento de material no piso da estação.",
                "evento_risco": "",
                "danos_provaveis": "Dermatite de contato, queimaduras químicas na pele/olhos.• Irritação das vias aéreas superiores, intoxicação.• Risco de quedas por piso escorregadio.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Obrigatório: Consultar e divulgar a FISPQ/FDS do produto antes do início da atividade.• Utilizar obrigatoriamente os EPIs específicos assinalados: óculos ampla visão, luvas de vaqueta/nitrílica, avental e respirador com filtro mecânico/químico adequado.• Manter Kit de Mitigação Ambiental (absorventes) próximo ao local de mistura.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalho em Altura (Acesso às trincas elevadas nas paredes da estação)",
                "perigo_fonte": "Queda de pessoas com diferença de nível.• Queda de materiais/equipamentos sobre terceiros.",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, lesões graves, politraumatismo, óbito.• Contusões e traumatismos em trabalhadores no nível inferior.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar andaimes devidamente montados, travados, com rodapé e guarda-corpo, ou plataformas elevatórias homologadas.• Uso obrigatório de cinto de segurança tipo paraquedista com duplo talabarte ancorado em linha de vida ou ponto estrutural resistente . • Isolamento e sinalização da área inferior com cones e telas para evitar o trânsito de pessoas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Operação de Injeção sob Pressão (Aplicação da calda nos bicos/obturadores)",
                "perigo_fonte": "Projeção de partículas/calda por sobrepressão ou falha nos bicos injetores.• Rompimento de mangueiras da bomba de injeção.",
                "evento_risco": "",
                "danos_provaveis": "Lesões oculares graves, queimaduras químicas, ferimentos perfurocortantes.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Inspecionar manômetros e válvulas de alívio da bomba de injeção antes do uso.• Uso obrigatório de protetor facial (face shield) acoplado ao capacete durante a pressurização . • Posicionar anteparos físicos (telas/lonas) para conter possíveis projeções em direção a painéis elétricos ou outras equipes.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Interferência com a Operação da EB (Permanência no piso/proximidade de motobombas)",
                "perigo_fonte": "Vibração mecânica intensa e ruído extremo das motobombas ligadas .• Jato de alta pressão por falha em juntas/flanges do barramento .• Inundação súbita ou contato com circuitos energizados.",
                "evento_risco": "",
                "danos_provaveis": "Perda auditiva temporária/definitiva, fadiga nervosa, dificuldade de comunicação .• Amputações, cortes profundos ou óbito instantâneo.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É proibida a permanência e manutenção estrutural no piso inferior com o sistema de bombeamento operando (mesmo que apenas uma bomba esteja ligada) EM EXCEÇÃO ATIVIDADES DE CARETER DE URGÊNCIA, OU QUE NESCESSITAM DAS MÁQUINAS/EQUIPAMENTOS EM FUNCIONAMENTO• Realizar o bloqueio elétrico e hidráulico (LOTO) das linhas adjacentes afetadas antes de iniciar as injeções na parede .• Uso de protetor auricular de alta atenuação (concha + inserção) se houver ruído residual de salas vizinhas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Perfuração / Limpeza da área",
                "perigo_fonte": "Rompimento, Desconexão Das Mangueiras De Injeção",
                "evento_risco": "",
                "danos_provaveis": "Ferimento, cortes, escoriações Fratura",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "As mangueiras e conexões utilizadas nas interligações, bomba misturador, acessórios, deverão resistir a pressões do serviço e ser devidamente acopladas com acessórios apropriados (engate rápido, braçadeiras ou outros dispositivos com igual eficiência).",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso de ferramentas, manuais e rotativas",
                "perigo_fonte": "Queda De Ferramentas",
                "evento_risco": "",
                "danos_provaveis": "",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É proibido arremessar ferramentas sobre outro colaborador; As ferramentas manuais deverão estar amarradas ao punho do trabalhador para evitar a sua queda acidental;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso de ferramentas, manuais e rotativas",
                "perigo_fonte": "Impacto Sofrido",
                "evento_risco": "",
                "danos_provaveis": "",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Inspecionar ferramentas rotativas antes de sua utilização, observando a integridade das partes móveis, trincas, e fissuras.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Ligar / Desligar equipamentos",
                "perigo_fonte": "Exposição A Circuitos / Partes Energizadas",
                "evento_risco": "",
                "danos_provaveis": "Perdas Materiais, Lesões, Contusões, Fraturas, Queimadura",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificar previamente o local de posicionamento do equipamento e garantir o distanciamento mínimo seguro das redes energizadas, caso exista. Proibido aproximar qualquer objeto próximo de equipamentos, redes, cabos e fios energizados. Somente eletricista capacitado e autorizado deve realizar serviços de desenergização em painéis ou rede energizada.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalho em Altura com Gaiola Içada por Ponte Rolante (Acesso e posicionamento nas paredes da EB)",
                "perigo_fonte": "Queda de pessoas em diferença de nível. • Falha mecânica/ruptura dos cabos de aço ou acessórios de içamento (manilhas, laços). • Tombamento, oscilação ou batida da gaiola contra a estrutura da Estação de Bombeamento. • Queda de ferramentas/materiais lá do alto da gaiola.",
                "evento_risco": "",
                "danos_provaveis": "Politraumatismo, fraturas graves, esmagamento ou óbito. • Lesões e traumatismos severos por impacto de ferramentas em colaboradores que estejam no piso inferior.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Check-list e Inspeção: Inspecionar a ponte rolante, o moitão, os cabos e a integridade da gaiola • Ancoragem Independente: O trabalhador dentro da gaiola NÃO pode se ancorar na própria gaiola ou no gancho da ponte. O cinto de segurança tipo paraquedista com duplo talabarte deve estar conectado a uma linha de vida vertical independente ou bloco retrátil fixado em estrutura externa segura. • Amarração de Ferramentas: Proibido o uso de ferramentas soltas; todas devem estar obrigatoriamente amarradas ao pulso do trabalhador ou guardadas em bolsas presas à estrutura interna da gaiola . • Guia de Carga: Utilizar corda guia (cabo de manobra) acoplada à gaiola para evitar a oscilação da estrutura e batidas contra as paredes. • Sinalização: Isolamento total do raio de movimentação sob a gaiola com cones e fitas zebradas, impedindo a passagem de pessoas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Luva para Eletricista (Isolante)",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.45). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.25",
        "titulo": "Roço e Poda de Vegetação de Canais e Reservatórios",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Mobilização da equipe",
                "perigo_fonte": "Ataque de ser vivo, - Exposição a tráfego de veículos - Queda em mesmo nível - Acidente no transporte;",
                "evento_risco": "",
                "danos_provaveis": "Lesão por mordida, picada e lesões - Escoriação, abrasão; Ferida incisa, laceração, ferida contusa, punctura; Contusão, distensão, torção; luxação, fratura; Concussão cerebral; Lesões múltiplas; Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter o setor limpo e organizado; realizar vistoria do local antes do início das atividades; utilização de EPI's quando for realizar atividade em campo com risco; em caso de aparecimento de animais não tente pegar comunique para que seja resgatado pelo setor especializado; não ficar próximo a deposito de material amontoado de origem de supressão ou próximo aos limites da mata. - Atentar-se para movimentação de veículos; atender a sinalização de segurança; atravessar as vias em pontos sinalizados para este fim; Proibir travessia de vias diante de veículos em movimento; Adentrar o veículo com atenção nos degraus; Manter-se sob o campo de visão do condutor; não se aproximar de maquinas ou equipamentos sem que seja autorizado pelo operador; não permanecer atrás de equipamentos moveis; sinalizar e isolar o local de trabalho. - Obedecer ao limite de velocidade da via; manter os faróis acesos mesmo durante o dia; Adotar sinal sonoro nas manobras de marcha à ré; Atender aos prazos de revisões mecânicas; Trafegar somente em local autorizado; não transportar pessoas na parte externa dos veículos; não trafegar em pé no ônibus; não descer correndo do ônibus.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Corte de Árvores Utilizando foice",
                "perigo_fonte": "Atingir auxiliares pela proximidade excessiva da área de uso de ferramentas manuais; Picada de animais Peçonhentos.",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações e fatalidade e esforço repetitivo;",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Nenhuma tarefa poderá ser iniciada sem a divulgação da APR, nos DDS a todos os colaboradores envolvidos; - Andar com atenção e cuidado aos obstáculos no local de Trabalho. - Avaliar o comportamento do solo antes e durante a atividade; - Problemas ergonômicos, desvio da coluna; Somente será autorizada a permanência na atividade, os colaboradores que portarem todos os EPI´s obrigatórios para a atividade a ser realizada; - Usar máscara para poeiras (quando necessário); - Manter a área limpa, Organizada e sinalizada; - Inspeção prévia das condições das ferramentas manuais; - Todos os resíduos gerados durante a execução da atividade deverão ser recolhidos ao final dos trabalhos e direcionados ao local certo; Manusear as ferramentas pelo cabo, cortando sempre no sentido contrário ao corpo.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desbaste do entorno de árvores a serem abatidas;",
                "perigo_fonte": "Queda de árvores ou galhada sobre colaboradores",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Andar com atenção e cuidado aos obstáculos no local de trabalho; - Avaliar o comportamento do solo antes e durante a atividade; - Estabelecimento de distâncias mínimas entre os colaboradores durante a execução da atividade; - Ter cuidado e atenção ao manter contato com a vegetação ou madeiras em decomposição, presença de cobras, escorpiões e aranhas.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Roçado e remoção da galhada e troncos das áreas da faixa do canal da transposição.",
                "perigo_fonte": "Ferramentas defeituosas; - Ferimento causado pela foice; - Queda da carroceria do veículo na operação de carga ou descarga de lenha e madeira",
                "evento_risco": "",
                "danos_provaveis": "Lesão nas mãos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não trabalhar com ferramenta defeituosa, substituir as ferramentas defeituosas e providenciar o reparo das mesmas; - Procedimento de manutenção de distância segura entre operadores de ferramentas manuais (machados e foices; - Pausar periodicamente quando o trabalho for prolongado; - Não deve transitar dentro da vegetação; - Ter cuidado e atenção ao manter contato com a vegetação ou – madeiras em decomposição, presença de cobras, escorpiões e aranhas. - Manusear as ferramentas pelo cabo, cortando sempre no sentido contrário ao corpo; - Os materiais deverão ser acondicionados de forma a não se movimentarem durante o transporte, pois ao serem retirados podem se movimentar e causar ferimentos; - Todas as medidas de segurança propostas a serem adotadas deverão seguir as Normas Regulamentadoras;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Para todas as atividades na manutenção do canal",
                "perigo_fonte": "Queda de diferente nível Queda de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Machucar membros ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Mesmo com check list é obrigatório todos os colaboradores fazer verificação de todos os EPI’s antes de iniciar as atividades; isolar e sinalizar a área; Não ultrapasse por local isolado com risco de queda de arvore e material.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Complementos com concreto nas barragens e instrumentais",
                "perigo_fonte": "Queda de nível Queda de materiais Ferramentas manuais",
                "evento_risco": "",
                "danos_provaveis": "Contusões Ferimentos Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Só utilizar o equipamento o profissional habilitado e devidamente treinado Isolar a área da atividade para evitar a presença de outros colaboradores Seguir as normas de segurança e procedimentos que sejam necessários para a realização segura da atividade",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Corte de Árvores próximas a área energizada",
                "perigo_fonte": "Choque elétrico; Incêndio.",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não ultrapasse por local isolado com risco de choque elétrico. Esse tipo de atividade só será executado por profissional habilitado/qualificado com Curso NR 10, portanto mantenha uma distância segura. Manter distância segura de locais energizados em tempo de climas adversos; Alta humidade do ar, Chuvas e poeira.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desobstrução de canaletas",
                "perigo_fonte": "Impacto contra - Radiação não ionizantes",
                "evento_risco": "",
                "danos_provaveis": "Fraturas, cortes, hematomas, perfurações, contusões, luxações. - Lesões oculares / queimaduras / lesões ou câncer de pele",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manusear as ferramentas (Enxadas, Alavancas) de forma segura, protegendo os membros inferiores. - Manutenção de infraestrutura: Verifique regularmente a integridade das canaletas e faça reparos necessários para evitar danos maiores - Utilizar protetor solar / camisa de manga longa / óculos escuros",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.25). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.20",
        "titulo": "Serra Circular Portátil",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Preparação do Equipamento",
                "perigo_fonte": "Choque elétrico Cortes fraturas",
                "evento_risco": "",
                "danos_provaveis": "Queimaduras Ferimentos Lesões Traumas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Verificar as condições do equipamento e controle de segurança e travamento antes de realizar a ligação da máquina a energia Verificar se existem fios descascados iou emendas sem proteção nos cabos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Utilização de serra circular",
                "perigo_fonte": "Cortes e amputações nos membros superiores Choque elétrico Quebra do disco e contragolpe durante a operação Risco de incêndio Ruído Projeção de partículas Inalação de poeiras",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Amputação Cortes Contusões Descarga elétrica",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "As operações em máquinas e equipamentos para a realização das atividades de carpintaria deverão ser realizadas por trabalhador qualificado O disco deve estar dotado de coifa protetora e cutelo divisor, com a identificação do fabricante e coletor de serragem. Realizar semanalmente lista de verificação na serra circular de bancada Devem ser utilizados dispositivos empurradores de madeira e guia e travado e ser substituído quando apresentar problemas de alinhamento As transmissões de força mecânica devem estar protegidas por anteparos fixos e resistentes, não podendo ser removidos A carcaça do motor deve estar aterrada eletricamente O disco deve estar afiado",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Óculos de Proteção",
            "Luvas de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.20). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.21",
        "titulo": "Serra Circular de Bancada",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Local de instalação",
                "perigo_fonte": "Quedas de nível Choque elétrico Projeção de partículas Poeiras Ruido",
                "evento_risco": "",
                "danos_provaveis": "Lesões Ferimentos Contusões Queimaduras Perca auditiva",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O local de instalação deve ter piso acimentado e nivelado Deve dispor de local adequado para armazenamento de madeiras Deve conter caixa coletora para pó de serra O equipamento deve estar provido de coifa de proteção Deve conter sistema de desligamento de emergência Todos os colaboradores ao redor do equipamento devem estar usando protetor auricular",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Empilhamento de madeira",
                "perigo_fonte": "Contusão nos pés e mãos por queda de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Ferimentos Contusões",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar bota de couro com palmilha e biqueira resistente. - Utilizar EPI’s recomendados acima e seguir instruções dos Técnicos de Segurança quanto ao correto armazenamento dos materiais e a observação da organização do ambiente de trabalho.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Utilização de serra circular de bancada",
                "perigo_fonte": "Cortes e amputações nos membros superiores Choque elétrico Quebra do disco e contragolpe durante a operação Risco de incêndio Ruído Projeção de partículas Inalação de poeiras",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Lesões Traumas Amputação Cortes Contusões Descarga elétrica",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "As operações em máquinas e equipamentos para a realização das atividades de carpintaria deverão ser realizadas por trabalhador qualificado O disco deve estar dotado de coifa protetora e cutelo divisor, com a identificação do fabricante e coletor de serragem. Realizar semanalmente lista de verificação na serra circular de bancada Devem ser utilizados dispositivos empurradores de madeira e guia de alinhamento As transmissões de força mecânica devem estar protegidas por anteparos fixos e resistentes, não podendo ser removidos A carcaça do motor deve estar aterrada eletricamente O disco deve estar afiado e travado e ser substituído quando apresentar problemas",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.21). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.11",
        "titulo": "Serviços Administrativos",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Trabalhos em escritório",
                "perigo_fonte": "Postura inadequada",
                "evento_risco": "",
                "danos_provaveis": "Lesão por esforço repetitivo (LER) Monotonia",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realização de atividades em ambientes bem iluminados e com mobílias adequadas a postura dos colaboradores Realização de ginástica laboral",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Deslocamento entre salas pelo canteiro",
                "perigo_fonte": "Queda de nível",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Ferimentos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos meios de proteção de maneira correta (guarda corpos, corrimões etc.) Evitar correr pelo canteiro Praticar e respeitar as sinalizações existentes (piso molhado, proibido fumar, estacione de ré, etc.)",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.11). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.03",
        "titulo": "Serviços Gerais",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Limpeza das salas e escritórios no canteiro",
                "perigo_fonte": "Queda de nível Queda de objetos de pequeno porte Postura inadequada Poeiras",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Cortes Fraturas Contusões Lesões Doenças pulmonares",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Ter sempre a atenção redobrada nos objetos e materiais ao seu redor para não tropeçar ou esbarrar Manter a área sinalizada durante a execução das atividades Não carregar peso em excesso Utilizar máscara adequada a atividade a ser realizada",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Limpeza de pisos e banheiros",
                "perigo_fonte": "Queda de nível Queda de objetos de pequeno porte Postura inadequada Contato com produtos químicos",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Cortes Fraturas Contusões Lesões Asfixia Envenenamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Realizar as atividades utilizando sempre os E.P.I´s adequados Sinalizar o local para evitar a trânsito de pessoas desavisadas ao local Manter as janelas dos banheiros sempre abertas para garantir uma boa ventilação no local Evitar o contato manual com substâncias que possam causar danos a saúde Ser treinado e orientado quando o uso correto de produtos químicos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Coleta de lixos",
                "perigo_fonte": "Contaminação Bactérias e fungos",
                "evento_risco": "",
                "danos_provaveis": "Danos à saúde",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter os sacos de lixo bem fechados e evitar o contato de seus conteúdos com partes do corpo Usar os equipamentos de proteção necessários para realização das atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Avental de Raspa/PVC",
            "Bota de Borracha (Impermeável)"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.03). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.22",
        "titulo": "Serviços de Topografia",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Mobilização",
                "perigo_fonte": "Acidente diverso",
                "evento_risco": "",
                "danos_provaveis": "Corte, escoriação, perfurações Exposição a Intempéries",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes do início da atividade os encarregados juntamente com o Técnico de Segurança divulgarão está APR, onde a mesma deverá permanecer no local de execução da atividade ; é de responsabilidade do Supervisor e/ou encarregado cumprir e fazer com que os colaboradores estejam cumprido os procedimentos contidos neste documento; realizar inspeção de pré-uso , antes da utilização dos equipamentos e ferramentas. É obrigatório o uso dos EPI- Equipamento de Proteção Individual e toda área de trabalho, de acordo com orientação dom SMS. Utilizar protetor solar e camisa de manga longa.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Acidentes com veículos/equipamentos",
                "perigo_fonte": "Impacto por e contra; abalroamento, colisão tombamento, atropelamento",
                "evento_risco": "",
                "danos_provaveis": "Danos materiais, Lesões múltiplas, Fraturas Óbito",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Somente motorista habilitado e autorizado, que portar Carteira Nacional de Habilitação, deve dirigir conduzir veículos leves nas frentes de serviço. Manter limites de velocidade de 30 e 40 Km/h, definidos segundo a orientação das placas de sinalização, instaladas nos acessos internos. O motorista deve comunicar imediatamente ao encarregado qualquer anormalidade detectada no veículo, fazendo as anotações necessárias na lista de verificação . Antes de acionar ou movimentar o veículo, deve-se observar ao redor do caminhão/equipamento, para não expor pessoas e/ou p patrimônio da empresa ao risco. É proibido o consumo de álcool ou drogas. Antes de iniciar os trabalhos, o topógrafo deve reunir os seus Auxiliares de topografia no local inspecionar a frente de serviço, avaliar e controlar os riscos, acompanhar a tarefa que vai ser executada. Monitorar as condições de estabilidade dos acessos e áreas de trabalho. Em aclives acentuados deve-se regularizar a área de trabalho, a fim de permitir o estacionamento seguro do veículo, É PROIBIDO PARAR E ESTACIONAR nas frentes de carga e descarga dos equipamentos e caminhões pesados. Manter os faróis acessos durante todo o período de trabalho. Não ultrapassar quando não for permitido e quando permitido use as setas, olhe pelos espelhos retrovisores e coloque-se com antecedência na posição para ultrapassar. Antes de realizar conversões ou manobras de retorno, sinalize previamente e mantenha seu veículo na faixa apropriada. Não estacionar de maneira que seu veículo de Ré. Durante a instalação dos aparelhos de medição topografia certificar-se que a área está isolada e que no raio de trabalho da equipe não haja movimentação de equipamentos e/ou caminhões. Durante as operações de carga e descarga manter-se fora do raio de ação dos equipamentos e só aproximar-se após a carga estiver acomodada e estabilizada ou totalmente descarregada.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Levantamento topográfico",
                "perigo_fonte": "Cortes, Escoriações, lacerações; Partes cortantes expostas, canto vivos e etc. Queda de mesmo nível.. Lombalgia; Exposição à intempéries.",
                "evento_risco": "",
                "danos_provaveis": "Danos materiais, lesões múltiplas, Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Inspecionar as ferramentas manuais; Proteger pontas e/ou cantos vivos; Utilizar ferramentas adequadas à atividade; Não expor as mãos próximas ao raio de ação da ferramenta; Treinar os envolvidos quanto a importância do uso dos EPI; Orientar os colaboradores quanto ao uso de ferramentas manuais.\" Fazer isolamento de, no mínimo, 3 metros da borda da escavação, manter atenção no decorrer da atividade e sinalizar a área. Manter uma postura ergonomicamente correta (Costas retas e ao se abaixar sempre dobrar os joelhos). Em caso de incidência de risco de raios ou chuvas fortes os trabalhos deverão ser interrompidos.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte e instalação dos equipamentos e ferramentas para frente de trabalho.",
                "perigo_fonte": "Impacto de pessoa contra. Queda de pessoa em mesmo nível.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Fraturas Contusões",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Evite pressa e movimentos bruscos. Fique atento aos obstáculos e interferências no seu trajeto. Mantenha sua área limpa, bem organizada e livre de interferências e obstáculos. Manter as pontas de vergalhões expostas em áreas de acesso de pessoas, protegidas. Manter as áreas limpas, organizadas, livres de obstáculos, interferências, buracos. Ao trabalhar próximo a valas e taludes, avaliar a resistência do terreno. Desviar de poças, valas e atoleiros. Isolar pisos com vestígios de substâncias escorregadias, valas e outras depressões.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Trabalhos em locais rampeados",
                "perigo_fonte": "Quedas de nível Impacto contra pessoas Ataques de animais peçonhentos Quedas de materiais",
                "evento_risco": "",
                "danos_provaveis": "Envenenamento por picada de animal peçonhento Lesões, Traumas Fraturas, Contusões",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Ficar sempre atento por onde anda Utilizar todos os EPI´s necessários Sinalizar todas as áreas de risco Manter-se sempre fora do raio de ação de máquinas e veículos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Derrubada da vegetação e acesso para frente de serviço.",
                "perigo_fonte": "Quedas de nível Impacto contra pessoas Ataques de animais peçonhentos",
                "evento_risco": "",
                "danos_provaveis": "Envenenamento por picada de animal peçonhento Lesões, Traumas Fraturas, Contusões",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Inspecionar a área quanto a presença de caixas de abelha e cobras na vegetação. Antes da jornada de trabalho, verificar se nos locais de contato, galhos, troncos, se não existem animais peçonhentos. Em caso de picadas de cobra ou outros insetos, comunicar a equipe de brigadistas via rádio, conforme plano de atendimento a emergência e manter sistema de comunicação no local através de rádio e celular. Dispor na frente de serviço de sanitários (privada, banheiro químico) para evitar que funcionários adentrem na vegetação, manter água potável na frente de serviço. Preparar o acesso de veículos, máquinas e equipamentos, roçando e alargando a pista, bem como criar e manter áreas de escape e manobra.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.22). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.37",
        "titulo": "Sondagem",
        "atividades_criticas": [
            "Escavação / Solo (NR-18)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Sondagem de interferências - Deslocamento e acesso a vala.",
                "perigo_fonte": "Atropelamento Queda de mesmo nível ou diferente nível Ataque de animais silvestres",
                "evento_risco": "",
                "danos_provaveis": "Lesões Contusões Ferimentos Escoriações Cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Transportar os equipamentos de maneira adequada Manter o local isolado e sinalizado Utilizar os EPI’s adequados para realização das atividades",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Sondagem de interferências - Apoio na escavação manual",
                "perigo_fonte": "Trabalho em local com espaço restrito Presença de mais de um trabalhador Proximidade do raio de ação da ferramenta Rompimento da tubulação por esforços excessivos Falta de proteção das partes motoras",
                "evento_risco": "",
                "danos_provaveis": "Lesões Contusões Ferimentos Escoriações Cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Uso correto e cuidadoso da haste de sondagem na procura de interferências Sempre realizar a sondagem de forma que não necessite fazer muita força Manutenção das hastes, substituição da ponteira sempre que necessário Manter extintor de incêndio em fácil acesso, próximo ao local da atividade Manter as proteções de polias e partes móveis Utilização dos EPI obrigatórios.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Atividade Sondagem geração de resíduos sólidos",
                "perigo_fonte": "Vazamento de gás Descarte de equipamentos danificados",
                "evento_risco": "",
                "danos_provaveis": "Lesões Contusões Ferimentos Escoriações Cortes Poluição atmosférica",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Planejar a atividade de forma a diminuir a geração de resíduos sólidos Manter coleta seletiva no local da atividade Descarte final de resíduos em aterros homologados.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.37). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.31",
        "titulo": "Terraplenagem",
        "atividades_criticas": [
            "Escavação / Solo (NR-18)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desmatamento/ Limpeza do terreno com uso Trator Esteira",
                "perigo_fonte": "Ruído Atropelamento Poeira Animais peçonhentos",
                "evento_risco": "",
                "danos_provaveis": "Perda Aditiva; Fratura e escoriação; Infecção nas vias respiratória",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilizar protetor auricular sempre que necessário; Fazer uso correto dos retrovisores, caso evidencie a presença de pessoas e equipamentos próximos; Solicitar manutenção nos sistemas de refrigeração sempre que constatar a entrada de poeira no interior do veículo; Utilizar perneira sempre que necessário",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Escavação do Solo (Uso de Escavadeira).",
                "perigo_fonte": "Ruído; Tombamentos; Posturas inadequadas; Poeiras; Insolação; Tombamento.",
                "evento_risco": "",
                "danos_provaveis": "Perda Auditiva; Soterramento de Pessoas; Lesões, escoriações, fraturas e cortes; Lesão na coluna/perda da capacidade labor ativa; Infecções respiratórias; Irritação na pele e olhos",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso do protetor auricular; Manter o equipamento sempre nivelado em superfície, atividades corte da camada supressão vegetal evitando tombar e atolar o equipamento; Ficar atento ao manobrar o equipamento com a presença das pessoas próximo do giro do equipamento; Manter os empregados fora do raio de giro das máquinas; Somente operadores qualificados e treinados poderão operar os equipamentos; Postura adequada no trabalho; Subir e descer do equipamento somente pelos locais onde possuir garras de pega para as mãos, não improvisar acesso; Não aproximar da borda da bancada, manter distância segura do corte da mesma; Não permitir que pessoas / equipamentos fiquem posicionados no raio de giro da máquina",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carregamento de matéria Prima (Uso escavadeira)",
                "perigo_fonte": "Queda de Material Poeira Ruído Tombamento Falha Mecânica",
                "evento_risco": "",
                "danos_provaveis": "Lesões, Fraturas Infecções nas vias respiratórias Perda auditiva Danos no Veículo Esmagamento de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S óculos de segurança, luvas pigmentadas, botina, respirador PFF 2, bloqueador solar, abafador de ruído; Somente operadores qualificados e treinados poderão operar o equipamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carga e Descarga com Caminhão basculante.",
                "perigo_fonte": "Ruído; Poeira; Tombamento; Prensamento; Atolamento e tombamento",
                "evento_risco": "",
                "danos_provaveis": "Perda auditiva; Infecções nas vias respiratórias Lesões e fratura; Danos no veículo",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer o uso de todos os EPI’s necessários a atividade Trafegar com o caminhão com velocidade moderada de acordo com os limites máximos determinados para cada via de acesso. Manter distância de 30m em relação a outro equipamento; Manter atenção na manobra do caminhão na hora que estiver em marcha ré; Posicionar o veículo de forma alinhada, respeitando o limite de segurança do terreno no basculamento do caminhão; Só bascular o caminhão com ajuda do manobreiro. Na hora de bascular, manter distância de 3m da crista do aterro; Não permitir pessoas no entorno do equipamento. Manter os equipamentos em praça com superfície sólida. Observar a necessidade de colocar sinaleiro, quando o carregamento interferir com trânsito de veículos de terceiros; Todos os sinaleiros que trabalham em pé devem utilizar coletes refletivos, bandeirola, apitos e lanternas nas atividades noturnas, serem treinados e capacitados para a atividade; O sinaleiro não deve ficar atrás dos caminhões e sim na lateral esquerda da cabina, a uma distância de 7 m.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Umedecimento das vias de acesso com o caminhão pipa.",
                "perigo_fonte": "Colisão com outros veículos; Postura Inadequada; Poeira; Tombamento; Atropelamento de pessoas; Danos nos Veículos",
                "evento_risco": "",
                "danos_provaveis": "Lesões, Fraturas; Lombalgia; Infecções nas vias respiratórias; Perda auditiva; Danos no Veículo",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Manter distância seguro de outros veículos; Respeitar os limites de velocidade das vias de acesso. Não transporta pessoas no reservatório de água do pipa Seguir Orientação de Direção Defensiva",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Nivelamento do terreno (Uso de Motoniveladora)",
                "perigo_fonte": "Ruído; Posturas inadequadas; Poeiras; Isolação; Colisão.",
                "evento_risco": "",
                "danos_provaveis": "Perda Auditiva Lesão na coluna Infecções vias respiratórias Problema de pele Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Abafador de ruído; Postura adequada; Utilizar todos os EPI’s indicados para esta etapa da atividade: óculos de segurança, luvas pigmentadas, Botina, respirador PFF 2, bloqueador solar, - Umedecimento com o caminhão pipa; Somente operadores qualificados e treinados poderão operar o equipamento. Subir e descer do equipamento somente pelos locais onde possuem garras e peças para as mãos, não improvisar acessos; O equipamento deve trafegar pelo canteiro com faróis dianteiros e traseiros acessos Todo equipamento que operam em marcha à ré devem possuir alarme sonoro acoplado ao sistema de câmbio e retrovisores em bom estado; Não é permitida a presença de pessoas próxima as máquinas durante os serviços e expressamente proibido passar o controle do equipamento a pessoa não autorizada ou habilitada;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Movimentação de Terra Uso (Trator de pneu)",
                "perigo_fonte": "Atropelamento Ruído Poeira Colisão Ergonomia Exposição à radiação solar Tombamento Prensamento",
                "evento_risco": "",
                "danos_provaveis": "Esmagamentos de membro Perda auditiva Infecções nas vias respiratórias Danos no Veículo. Câncer de pele Lombalgia",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; Somente operadores qualificados e treinados poderão operar o equipamento; Usar protetor auricular durante a exposição de ruído; Manter área umidificada sempre que possível, usar máscara PFF2 quando exposto a poeira e a umidificação não for possível; Todos os Colaboradores deveram utilizar os EPI´s Adequado a sua função; Cuidado com trânsito de veículos máquina e equipamentos em operação; Todos os colaboradores deverão estar utilizando uniforme com faixa refletiva; utilizar cones refletivos de sinalização para isolamento da área; Fazer uso de protetor solar /Usar uniforme de manga comprida; Utilize sempre luvas para apanhar materiais ou pegar cabos; Todo funcionário fica proibido de transitar pelas áreas onde o acesso é restrito, bem como onde os serviços não estiverem sendo realizados. Sem a devida autorização; Mantenha distância da operação de equipamentos móveis.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Regularização e Compactação do solo.",
                "perigo_fonte": "Ruído; Atropelamento; Colisão Atropelamento Tombamento",
                "evento_risco": "",
                "danos_provaveis": "Perda auditiva; Fraturas e escoriações Esmagamento de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Inspecionar a área de trabalho antes do início das atividades; Utilizar todos os EPI’s indicados para esta etapa da atividade: óculos de segurança, luvas pigmentadas Botina, respirador PFF 2, bloqueador solar, Touca, Abafador de ruído; É proibido a permanecia de pessoas entre as máquinas e equipamentos durante as atividades; Orientar os operadores durante as manobras Somente operadores qualificados e treinados poderão operar o equipamento; Todo equipamento que operam em marcha à ré devem possuir alarme sonoro acoplado ao sistema de câmbio e retrovisores em bom estado",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.31). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.39",
        "titulo": "Trabalho com Plataforma Elevatória",
        "atividades_criticas": [
            "Trabalho em Altura (NR-35)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, Fraturas Cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Preparação do pessoal",
                "perigo_fonte": "Não entender atividade ou não seguir os procedimentos de Segurança",
                "evento_risco": "",
                "danos_provaveis": "Perda de Colaboradores; Perda de material; Perda de tempo",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "As atividades somente poderão ter início após a Divulgação desta APR no DDS com seu respectivo registro; - Antes de iniciar as atividades os colaboradores deverão estar cientes das tarefas a serem realizadas e procedimentos a serem seguidos, através de orientações diárias feitas por DDS´s e orientação sobre o conteúdo desta APR.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Uso da Plataforma Elevatória",
                "perigo_fonte": "Quedas em Altura Queda de Objetos Tombamento; Esmagamento; Choque Elétrico Atropelamento; Colisão.",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Controle de operação e de emergência; Dispositivos de segurança do equipamento; Dispositivos de proteção individual, incluindo trava quedas; Sistemas de ar hidráulico e de combustível; Painéis, cabos, e chicotes elétricos; Pneus e rodas; Placas, sinais de avisos e de controle; Estabilizadores, eixos expansíveis e estrutura em geral; Demais itens especificados pelo fabricante; Fixar talabartes no suporte da plataforma específica; Só executar a operação no piso nivelado e que não ofereça risco de tombamento; Amarrar as ferramentas para evitar quedas involuntárias; Sempre deixar uma distância de 01 metro do teto se possível evitando assim o esmagamento;",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Linha de Vida / Trava-quedas",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.39). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.06",
        "titulo": "Trabalho em Altura",
        "atividades_criticas": [
            "Trabalho em Altura (NR-35)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da área de serviço",
                "perigo_fonte": "Acidente.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações Lesões, fraturas e cortes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "É obrigação do encarregado a avaliação dos conhecimentos e experiência dos colaboradores nos serviços a serem executados; -Todos os colaboradores devem ser treinados e qualificados a executar suas tarefas com segurança, visando garantir as suas atividades e as dos demais envolvidos, para que não venham a sofrer acidentes. NR18.28.3; -Todos os colaboradores deverão receber treinamento do uso correto dos EPI´s e importância dos mesmos; -É responsabilidade do encarregado tomar obrigatório a utilização dos EPI´s; -Antes de iniciar os trabalhos o Encarregado deve reunir os seus colaboradores e inspecionar a frente de serviço para avaliar e controlar os riscos existentes; -Certificar-se de que todos os colaboradores envolvidos na tarefa estejam perfeitamente bem de saúde física e psicológica.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Deslocar para frente de serviço com equipamento, ferramentas e materiais etc.",
                "perigo_fonte": "Transporte de pessoas acima de sua capacidade física, Queda do mesmo nível Queda de nível diferente, Queda de ferramentas ou material, Ultrapassar área isolada, Atropelamento, batida contra picada de animais peçonhentos, Torções, Lombalgia, Iluminação inadequada",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Não levantar ou transportar peso acima de sua capacidade física Peça ajuda aos companheiros e superiores Não corra ande, olhe onde pisa. Não ultrapassar por local sinalizado e isolado você pode ser a vítima. Ao fazer deslocamento acima de use escada, cinto de segurança com 2 talabartes, linha de vida, guarda corpo com roda pé. Transportar as ferramentas e peças na bolsa ou amarrada para evitar queda. – Ao caminhar procure as faixas para pedestres no canteiro de obra. Não permanecer no raio de movimentação de máquinas e equipamentos. Em caso de animais peçonhentos acione a equipe de resgate de fauna para resgate. Manter concentração no local de trabalho. Não improvisar acessos, utilize somente acesso liberado. Manter postura ergonomicamente enquanto estiver executando a atividade. Respeitar os limites de velocidade no canteiro de obra. Solicitar a elétrica melhoria na iluminação, caso necessário, verificar a aproximação do andaime e fios de alta tensão, isolar e sinalizar a área antes de iniciar as atividades.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Montagem de torre para execução de andaimes.",
                "perigo_fonte": "Queda de funcionário de diferente nível ou do mesmo nível Queda de Materiais Tombamento da torre Ferimento, Contusão/ Prensagem dos Membros.",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPI's básicos necessários: capacete com jugular, óculos de segurança, luvas de raspa, botina com biqueira de aço, cinto de segurança tipo paraquedista atracado em local seguro, acima do tronco do colaborador. Todas as equipes de montagem de andaimes devem ser treinadas pelos encarregados responsáveis pelo serviço, porta carteira de identificação de treinamento, é proibido trabalho sobre por. Toda montagem de torre para execução de andaimes deverá ter acompanhamento do responsável, em caso de condições meteorológicas adversas paralisar as atividades. Antes do início das atividades, o encarregado deverá preencher o checklist de trabalho em altura.? O encarregado deverá orientar sempre a equipe sobre o serviço a ser executado. Verificar as condições dos módulos antes de iniciar a montagem da torre, eliminando os que apresentarem desgastes, trincas, empenamentos etc. Efetuar o primeiro travamento quando os módulos atingirem (três metros) de altura, e só continuar a montagem da torre depois deste travamento realizado, colocar o travamento a cada 03 metros de módulos montados. Efetuar o travamento utilizando tubo roll ou similar fazendo a amarração nas torres. Confeccionar escada, linha de vida para acesso e travar o cinto de segurança. Após a montagem do segundo módulo, trabalhar na parte interna da estrutura fazendo uso constante do cinto de segurança tipo paraquedista atracado em local seguro. Utilizar tábuas resistentes e de boa qualidade nas estruturas da torre para apoio dos pés e movimentação segura do corpo. As tábuas deverão ser amarradas adequadamente a fim de evitar seu deslizamento. Utilizar cordas novas e de boa qualidade para içamento dos módulos. Proceder ao içamento de 01 (um) módulo de cada vez. Amarrar adequadamente os módulos. Afastar-se do local enquanto estiver subindo e montando os módulos. Os andaimes deverão possuir rodapé Fazer isolamento do local abaixo, quando em atividade acima. Toda torre deverá possuir uma sapata (chapa de ferro) x com encaixe para a colocação dos pés no primeiro módulo, a fim de facilitar o nivelamento da torre caso necessite. Uso obrigatório de luvas de raspa / vaqueta.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Carregamento e transporte de materiais",
                "perigo_fonte": "Queda de Material Poeira Ruído Tombamento Falha Mecânica",
                "evento_risco": "",
                "danos_provaveis": "Lesões, Fraturas Infecções nas vias respiratórias Perda auditiva Danos no Veículo Esmagamento de membros",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Sinalizar e isolar a área do carregamento; Usar os EPI´S óculos de segurança, luvas pigmentadas, botina, respirador PFF 2, bloqueador solar, abafador de ruído; Somente operadores qualificados e treinados poderão operar o equipamento",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Desmontagem das torres.",
                "perigo_fonte": "Queda de Funcionário diferente nível, Desabamento, Lombalgia e Distensões, Corpo Estranho nos Olhos, Choque Elétrico, Ruído, Calor, Poeira, Risco Ergonômico, Iluminação Inadequada.",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Fraturas Entorses Lesões Cortes Escoriações Lesão na coluna",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Utilização dos EPI's básicos necessários: capacete com jugular, óculos de segurança, luvas de raspa, botina com biqueira de aço, cinto de segurança tipo pára-quedista atracado em local seguro, a um nível mais elevado que a cabeça Fazer isolamento da área do desmonte das torres. Não levantar ou transportar peso acima de sua capacidade física . Utilizar corda resistente e de boa qualidade para a descida dos módulos. Descer um de cada vez. Não improvisar ferramentas ou acessos. - Retirar os travamentos de cima para baixo, na medida em que for desmontando os módulos. Não permanecer no raio da movimentação de máquinas e equipamentos e em içamento de cargas. Fazer o remanejamento das tábuas utilizadas para apoio dos pés, a cada módulo desmontado. Manter a postura ergonomicamente correta durante a execução das atividades. Manter todos os módulos da estrutura empilhados adequadamente em local que não interfira com movimentação de veículos, equipamentos ou pessoas. Afastar os funcionários quando da descida dos módulos Esta análise de risco deve ser levada ao conhecimento de todos os envolvidos através do DDS. Os andaimes deverão possuir rodapé Uso obrigatório de luvas de raspa/vaqueta",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Linha de Vida / Trava-quedas",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.06). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.26",
        "titulo": "Trabalhos com Solda e Corte a Quente",
        "atividades_criticas": [
            "Trabalho a Quente / Fogo"
        ],
        "riscos": [
            {
                "passo_tarefa": "Serviços de Solda Elétrica.",
                "perigo_fonte": "Incêndios Explosão Choques elétricos",
                "evento_risco": "",
                "danos_provaveis": "Queimadura no corpo Radiações não ionizantes",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso constante dos seguintes EPI’s: avental, blusão, de raspa e perneira de raspa, luvas de para soldador máscara de soldador e botas de couro O dispositivo usado para manusear eletrodos, deve ter isolamento adequado à corrente usada, a fim de evitar a formação de arco elétrico ou choques no operador. As mangueiras de oxigênio e acetileno devem possuir mecanismos contra retrocesso das chamas nos cilindros, válvulas corta-chama e na chegada do maçarico válvula anti-retrocesso. É proibida a presença de substâncias inflamáveis e / ou explosivas próximas aos cilindros de oxigênio e acetileno. As operações de solda e corte a quente, somente poderão ser realizadas por profissionais qualificados e treinados.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Operações de Solda e Corte Oxiacetilenos",
                "perigo_fonte": "Explosão Incêndio Queda de Material ou Ferramentas. Vazamento de gas Trabalhos em ambientes confinados Trabalhos em ambientes com presença de líquidos e gases inflamáveis",
                "evento_risco": "",
                "danos_provaveis": "Fraturas Cortes Hematomas perfurações Contusões Luxações Intoxicação com Gases.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer uso dos EPI’s adequados a tarefa, a saber: botas de couro com palmilha e biqueira de aço, óculos de segurança com lentes filtrantes, avental e blusão de raspa, luvas de vaqueta, cinto de segurança tipo paraquedista e respirador contra fumos de solda. Se necessário efetuar ventilação forçada. Os cilindros de oxigênio e acetileno, deverão ser providos de válvulas corte – fluxo e anti-retrocesso. O transporte de cilindros deverá ser feito em carrinho apropriado. E os cilindros que não estiverem em uso deverão permanecer na gaiola. Remover os materiais combustíveis da área próxima à soldagem.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.26). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.15",
        "titulo": "Trabalhos em Espaço Confinado",
        "atividades_criticas": [
            "Espaço Confinado (NR-33)"
        ],
        "riscos": [
            {
                "passo_tarefa": "Preparação da equipe para realização da atividade.",
                "perigo_fonte": "Queda de nível. Queda de materiais.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Respeitar as sinalizações presentes no local Trabalhar com atenção as estruturas que estará exposto Manter os materiais de maneira segura durante o transporte utilizando-se de condições adequadas para o mesmo",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Realização da atividade.",
                "perigo_fonte": "Queda de diferente nível. Asfixia. Intoxicação por gases inflamáveis (butano; propano; acetileno). Explosão.",
                "evento_risco": "",
                "danos_provaveis": "Lesões. Ferimentos. Fraturas. Traumas. Morte.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Só será permitido que o colaborador realize a atividade após a apresentação do certificado de treinamento, exames complementares, PET (Permissão para Entrada e Trabalho) emitida pelo responsável legal da atividade, aferição da pressão arterial, resultado dos testes de gás feito no local da atividade e demais testes que sejam necessários O colaborador deve estar portando rádio de comunicação, todos os EPI´s necessários a atividade, cilindro de gás se necessário",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Controle da atividade.",
                "perigo_fonte": "Acidentes. Morte.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Ferimentos Fraturas Traumas Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Só poderá ser realizada a atividade com a presença dos seguintes fatores: Colaboradores devidamente treinados para a atividade conforme determina a NR 33 – Trabalhos em Espaço Confinado Apresentação da APR (Análise Preliminar de Risco) Apresentação da PET (Permissão de Entrada e Trabalho) Resultado dos testes realizados no local Presença do vigia de espaço confinado Presença do supervisor de espaço confinado Área devidamente isolada e sinalizada, livre de pessoas não autorizadas e qualquer outro tipo de obstáculo Com a presença da equipe de resgate e do veículo de resgate",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Protetor Auditivo (Plug/Concha)",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Linha de Vida / Trava-quedas",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.15). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.08",
        "titulo": "Transporte Coletivo",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Início das atividades.",
                "perigo_fonte": "Falhas humanas / mecânicas.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações -Lesões, fraturas e cortes.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Diariamente antes de iniciar a atividade, o motorista deverá efetuar inspeção no veículo, preencher o formulário de check list, verificando os principais itens de segurança, tais como: a) sistema de freio; b) iluminação (luz alta e baixa), setas indicativas de direção, luz de freio e iluminação interna do veículo. c) estado dos pneus; d) extintor de incêndio; e) níveis de óleo e água; bem como a quantidade de combustível. .",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Deslocamento na cidade e estrada.",
                "perigo_fonte": "Colisões e Atropelamentos.",
                "evento_risco": "",
                "danos_provaveis": "Contusões, Escoriações -Lesões, Danos Materiais.",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Antes de iniciar as operações de descarregamento de materiais, o responsável pela mesma deverá providenciar a sinalização e isolamento da mesma, de modo a permitir a proximidade somente dos envolvidos. Havendo a necessidade de se fazer a descarga em áreas de circulação obstruir a mesma; Nunca correr no local de trabalho e observar atentamente os desníveis e interferências nos locais de passagem; Ao estacionar o caminhão, o motorista deverá manter os freios de estacionamento acionados; As operações somente poderão ser iniciadas se o Munck estiver patolado sobre pranchas de madeira com dimensões que garantam boa distribuição da carga ao solo.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Embarque e desembarque e transporte de passageiros.",
                "perigo_fonte": "Queda de nível diferente; Prensamento; Cortes/ perfurações; Ruído; Projeção de particulados; Ergonomia; Poeira.",
                "evento_risco": "",
                "danos_provaveis": "Contusões; Escoriações; Lesões; Danos Materiais;",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Nos deslocamentos na cidade e estrada, o motorista deverá trafegar com cautela, respeitando a sinalização de trânsito, limites de velocidade e principalmente a faixa de pedestres. Na estrada deve-se ter atenção redobrada quanto à presença de homens e máquinas na pista; bem como a sinalização nos trechos em obras. A parada para embarque e desembarque de passageiros deverá ser obrigatoriamente nos pontos de embarque pré-definidos, sendo proibido em esquinas ou locais que possam dificultar o trânsito de outros veículos. O veículo só deverá se deslocar depois que os passageiros estiverem sentados, sendo proibido o transporte de pessoas em pé. Todos os colaboradores deverão respeitar o motorista, não sendo permitido fumar, portar armas de qualquer espécie ou bebidas alcoólicas no interior do veículo. Não permitir que passageiros viagem com a cabeça ou braços fora da janela.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Excesso de velocidade e desavenças.",
                "perigo_fonte": "Atropelamentos Queda de colaboradores Colisão",
                "evento_risco": "",
                "danos_provaveis": "Contusões; Escoriações; Lesões; Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O motorista deverá conhecer todos os acesos e nomenclaturas de locais e frentes de serviço, devendo analisar previamente qualquer alteração nas pistas de acesso. Caso seja constatado qualquer tipo e risco no deslocamento, o veículo deve ser parado e feito análise mais apurada da situação. Caso seja constatado qualquer tipo e risco no deslocamento, o veículo deve ser parado e feito análise mais apurada da situação. Estar atento a movimentação de máquinas e equipamentos, dando preferência de trânsito, conforme segue: a) ambulância e veículo da Segurança do Trabalho, com sirene e os giroflex ligados; b) equipamentos pesados carregados; c) equipamentos pesados. O veículo nunca deverá ser estacionado em áreas de movimentação de máquinas e equipamentos pesados. O veículo nunca deverá ser estacionado em áreas de movimentação de máquinas e equipamentos pesados. Deverá ser respeitada sinalização do canteiro de obras e a velocidade de deslocamento nas pistas e praças de carregamento. O embarque e desembarque de passageiros deverá ser feito em local de livre circulação, longe de máquinas e equipamentos e nunca no cruzamento de vias.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Protetor Auditivo (Plug/Concha)",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Bota de Borracha (Impermeável)",
            "Protetor Facial",
            "Respirador c/ Filtro Mecânico/Válvula",
            "Cinto de Segurança Tipo Paraquedista c/ Talabarte Duplo Y"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.08). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.34",
        "titulo": "Transporte de Equipamentos em Carreta",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Posicionamento do equipamento na prancha da carreta.",
                "perigo_fonte": "Queda de equipamento Queda de nível Colisão Esmagamento Tombamento Esforço excessivo no levantamento da rampa da carreta.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Prensamento Cortes Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Fazer a movimentação dos equipamentos para carreta em local adequado Antes de abaixar as rampas da prancha, verifique se não há nenhuma pessoa no raio de movimentação da mesma Utilize luvas de raspa para manipular cabos, corrente e rampa. Na operação de subida do equipamento na carreta, não deve permanecer nenhuma pessoa sobre a prancha e ao redor da carreta. Os equipamentos deveram ser operados por colaborador qualificado avaliados pelos instrutores de equipamentos",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Transporte do equipamento para frente de trabalho.",
                "perigo_fonte": "Queda do equipamento. Atropelamento. Colisão da carreta durante o transporte de equipamentos. Contato com redes elétricas",
                "evento_risco": "",
                "danos_provaveis": "Ferimentos Contusões Fraturas Choque elétrico Prensamento Morte",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "A carreta não poderá ultrapassar o limite de velocidade permitido verificar se não há presença de rede elétrica. Os equipamentos deverão ser operados por profissional qualificado e autorizado. Para baixar ou subir o equipamento da prancha, deve-se estacionar a carreta em superfície nivelada. Durante o descarregamento do equipamento da prancha, deve-se instalar cones de sinalização na frente e atrás da carreta. Deve evitar caminhar na beirada da carreta a fim de evitar queda. Evite pular da prancha da carreta ao solo.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Meio Ambiente",
                "perigo_fonte": "Vazamentos Descarte de resíduos",
                "evento_risco": "",
                "danos_provaveis": "Atração de animais e insetos Contaminação do solo Contaminação da água Contaminação do Lençol freático",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Aplicar os Sensos de Utilização, de Ordenação, de Limpeza, de Saúde e de Autodisciplina Não descartar nenhum tipo de resíduo fora da coleta seletiva. Recolher, segregar e destinar os resíduos Em caso de vazamento de óleo utilizar-se do kit de mitigação",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.34). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.35",
        "titulo": "Transporte de Inflamáveis e Lubrificantes em Caminhão Comboio",
        "atividades_criticas": [
            "Produtos Químicos Perigosos"
        ],
        "riscos": [
            {
                "passo_tarefa": "Transporte de líquidos inflamáveis e lubrificantes.",
                "perigo_fonte": "Colisão. Atropelamento. Tombamento do Equipamento",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Prensamento Cortes Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O operador do caminhão comboio deverá ser habilitado, treinado e autorizado Durante o percurso o operador do comboio deverá respeitar as leis de trânsito vigentes no país e obedecer a sinalização existente ao longo do trajeto a ser percorrido. O caminhão comboio deverá possuir calços de material resistentes, apropriados e em número suficiente para serem utilizados nas rodas em caso de necessidade. O caminhão comboio deverá transitar em perfeitas condições principalmente os sistemas de freios, elétricos, direção e suspensão, cabendo ao operador relatar ao encarregado qualquer anormalidade no equipamento que possa comprometer a segurança da sua operação O operador do caminhão comboio nunca deverá passar o comando do mesmo para outro operador",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Meio Ambiente.",
                "perigo_fonte": "Geração de resíduos sólidos inertes, não-inertes e perigosos.",
                "evento_risco": "",
                "danos_provaveis": "Contaminação do solo Atração de animais e insetos Transmissão de doenças infectocontagiosas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Aplicar os Sensos de Utilização, de Ordenação, de Limpeza, de Saúde e de Autodisciplina Não descartar nenhum tipo de resíduo fora da coleta seletiva. Recolher, segregar e destinar os resíduos As baterias de veículos inservíveis devem ser armazenadas em depósito apropriado para baterias usadas, para seu posterior envio aos distribuidores / fabricantes e/ou empresas licenciadas. Disponibilizar Kit Mitigação nos veículos/equipamentos. Todos os veículos/equipamentos devem conter bandeja de contenção. Na operação, quando na ocorrência de vazamento de óleo hidráulico e/ou produtos químicos é necessária a execução de barreiras de contenção para evitar ao máximo que o material escoe para cursos d’água e/ou se espalhe. Sinalizar o local com cones e/ou isolar com fita zebrada. No caso de risco de incêndio, a área deverá ser imediatamente evacuada. Utilizar o Kit de contenção, na persistência do vazamento Quanto ao fracionamento de embalagens fica restringido em",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.35). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.36",
        "titulo": "Utilização da Ambulância",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Deslocamentos no Canteiro, Rodovia e Cidade.",
                "perigo_fonte": "Atropelamento Colisões Tombamentos",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Prensamento Cortes Fraturas",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Deverá ser obedecida a sinalização de trânsito, limites de velocidade e a preferência dentro do canteiro de obras, ou seja, dar preferência para veículos pesados e/ou máquinas pesadas caso não estiverem em ação de busca e remoção de nenhuma vítima Manter distância segura do veículo da frente Estacionar o veículo em local visível e permanecer com o pisca alerta ligado. A sirene e giroflex somente deverão ser utilizadas em casos de emergência O uso da sirene e do giroflex ligado não garantem que o condutor do veículo à frente ou que vem em sentido contrário irão facilitar a ultrapassagem, portanto a ultrapassagem por outros veículos deverá ser feira somente quando tiver boa visão da pista ou quando o veículo que trafega frente de lado ou sinalizar favoravelmente para que a ultrapassagem seja feita O uso do cinto de segurança é obrigatório para o condutor da ambulância, para os envolvidos no transporte do paciente e para os pacientes, mesmo quando transportados nas macas A ambulância deverá ser utilizada somente para atendimento de urgência",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.36). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    },
    {
        "numero_legado": "004.17",
        "titulo": "Vigilância Patrimonial",
        "atividades_criticas": [],
        "riscos": [
            {
                "passo_tarefa": "Movimentação do guindaste/ munck até o local de operação",
                "perigo_fonte": "Exposição ao ruído. Tombamento do guindaste/ munck. Impacto de pessoa contra.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Cortes Pensamento Colisão",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Usar protetor auricular especificado. Alertar colaboradores que não estiverem usando o protetor auricular. O operador do guindaste/ munck deverá verificar e analisar as condições de acesso até o local de patolar a máquina. Esta movimentação deverá ser feita com auxílio de sinaleiro. Observar as interferências existentes no raio de ação da lança do guindaste/ munk. O deslocamento do guindaste/ munk não poderá ser feito com a lança suspensa.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Patolar guindaste/ munk.",
                "perigo_fonte": "Tombamento do guindaste/munk Aprisiona - mento em, sob ou entre. Queda de pessoa em mesmo nível.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Cortes Pensamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "O operador do guindaste/ munck deverá verificar e analisar as condições o local, antes de patolar o equipamento. Caso seja necessário, seguir o plano de rigger elaborado pelo responsável técnico pelo levantamento. Deverá ser utilizado o sinal convencional de movimentação de carga pelo sinaleiro (rigger), que terá que estar com colete de identificação, auxiliando o operador. Antes de levantar o equipamento, verificar o seu peso e a tabela de carga do guindaste/ munck.No caso do operador não visualizar o rigger, este contato deverá ser feito via rádio. Observar as interferências existentes no raio de ação da lança do guindaste/ munck. O deslocamento do guindaste/ munck não poderá ser feito com a lança suspensa.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            },
            {
                "passo_tarefa": "Verificação de cintas estropos e acessórios a serem utilizados na movimentação de carga.",
                "perigo_fonte": "Impacto de pessoa contra Queda de pessoa em mesmo nível.",
                "evento_risco": "",
                "danos_provaveis": "Lesões Traumas Contusões Cortes Pensamento",
                "p_puro": "",
                "s_puro": "",
                "medidas_prevencao": "Evite pressa e movimentos bruscos. Fique atento aos obstáculos e interferências no seu trajeto. Mantenha sua área limpa, organizada e livre de interferências e obstáculos. Manter as áreas limpas, organizadas, livres de obstáculos, interferências, buracos. Pisos com vestígios de substâncias escorregadias, valas e outras depressões.",
                "p_residual": "",
                "s_residual": "",
                "responsavel": ""
            }
        ],
        "epis_basicos": [
            "Luvas de Proteção",
            "Óculos de Proteção",
            "Calçado de Segurança c/ Biqueira",
            "Perneira 3 Talas",
            "Protetor Auditivo (Plug/Concha)",
            "Capa de Chuva",
            "Capacete com Jugular",
            "Protetor Solar"
        ],
        "epi_luva_tipo": "",
        "epis_especificos": [
            "Respirador c/ Filtro Mecânico/Válvula"
        ],
        "epi_extintor_tipo": "",
        "observacoes": "Modelo importado do formato físico anterior (código legado 004.17). Revise e classifique P/S de cada risco antes de emitir uma APR real a partir deste modelo."
    }
];
