// ==============================================================================
// MODULO: TREINAMENTOS NR, CRONOGRAMA, MATRIZ, DDS E DDSMA (v211)
// Encapsulado em IIFE para isolamento de escopo lexical e imunidade a colisões
// ==============================================================================
(function(window) {

// ==============================================================================
// MODULO: TREINAMENTOS NR, CRONOGRAMA, MATRIZ, DDS E DDSMA
// Extraido de dashboard.js para arquitetura modular de alta performance
// ==============================================================================


// ============================================
// TREINAMENTOS (Fase 1 - importação + relatório de HHT)
// Tabelas isoladas (treinamentos_catalogo/treinamentos_realizados/treinamentos_status),
// só lidas aqui no painel - o histórico completo nunca vai pro app de campo (ver plano).
// Carregado sob demanda (só quando a página é aberta), já que são ~14 mil linhas de
// histórico - nada a ver com o app mobile, mas não faz sentido puxar isso a cada 5 min
// em segundo plano se ninguém está olhando a página.
// ============================================

let allTreinamentosRealizados = [];
let allTreinamentosCatalogo = [];
let allTreinamentosStatus = [];
let allTreinamentosCronograma = [];
let allTreinamentosConvocados = [];
let allTreinamentosRegras = [];
let gapFiltroGhe = '';
let gapFiltroFuncao = '';
let gapFiltroStatus = 'todas_pendencias';
let gapFiltroBusca = '';
let gapSelecionados = new Set();
let regraFiltroTipoAtual = 'todas';
let regraEmEdicaoId = null;

// Central de Prontidão por Equipe e Dossiê do Colaborador (NR-01)
let prontidaoFiltroBusca = '';
let prontidaoFiltroSetores = [];
let prontidaoFiltroSetor = '';
let prontidaoFiltroGhe = '';
let prontidaoFiltroFuncao = '';
let prontidaoFiltroStatus = 'todos';
let prontidaoFiltroCurso = '';
let prontidaoDadosCalculadosCache = null;
// DDS (Diálogo de Saúde, Segurança e Meio Ambiente) - mesmo padrão dessas tabelas de cima:
// carregado sob demanda junto com o resto de Treinamentos (loadTreinamentosData), tabela
// denormalizada de propósito (1 linha por participante por dia, igual
// treinamentos_realizados) pra reaproveitar o mesmo tipo de filtro/soma de carga_horaria
// já usado ali, em vez de aprender um padrão novo de JOIN.
let allDdsRealizados = [];
let allDdsFechamentoSemanal = [];
// Cronograma anual de temas (1 tema por dia útil, o MESMO tema pra todas as frentes naquele
// dia - diferente de treinamentos_cronograma, que é por treinamento+frente) - o usuário já
// mantém isso fora do sistema (TEMAS_DDS_2026.pdf); usado só como SUGESTÃO/auto-preenchimento
// (Lançar DDS e a ficha impressa), nunca trava o campo - datas de feriado (ex: 25/12)
// continuam com um tema "normal" cadastrado, ajustado na hora pelo usuário quando bate.
let allDdsTemasCronograma = [];
let allDdsFrentesConfig = [];
let allDdsHistoricoAgregado = [];
let allDdsFrentesAlias = [];
let allRelatorioMensalConfig = [];
// Cache em memória dos 3 valores de "turmas/módulos" (um por categoria do relatório
// mensal) - populado a partir de allRelatorioMensalConfig em
// popularRelatorioMensalDefaults(), usado por montarLinhasRelatorioMensal().
let relatorioMensalTurmas = { integracao: null, seguranca: null, ddsms: null, adicionais: null };
let treinamentosFilter = 'mes';
let treinamentosFiltroAno = '';
let treinamentosFiltroMes = '';
let treinColaboradoresPeriodoAtual = [];
let treinColabPeriodoSelecionados = new Set();
let treinamentosLoaded = false;
// Filtro do Cronograma nasce no mês/ano atual (é assim que a equipe de SMS planeja -
// o mês corrente ou o seguinte), mas só na primeira renderização - depois disso o
// usuário controla livremente (ver renderCronogramaLista).
const hojeCronograma = new Date();
let cronogramaFiltroAno = String(hojeCronograma.getFullYear());
let cronogramaFiltroMes = String(hojeCronograma.getMonth());
// Começa filtrado em "planejado" (não "Todos") de propósito - um cronograma existe pra
// mostrar o que ESTÁ POR VIR, não misturar com o que já foi lançado (isso já tem seu
// próprio histórico em Treinamentos Realizados/Visão Geral). "Ver todos" continua
// disponível pra quem quiser conferir os já lançados.
let cronogramaFiltroStatus = 'planejado';
// Setado por lancarPresencaDoCronograma() antes de trocar pra aba "Lançar Treinamento";
// salvarLancamentoTreinamento() usa isso pra marcar o item de origem como 'lancado' ao
// salvar com sucesso. abrirFormLancarTreinamento() zera de novo sempre que a aba é
// aberta "do zero" (pelo próprio botão da aba, não vindo do cronograma).
let cronogramaOrigemId = null;
// Filtro de mês/ano da impressão em lote (aba Registro) - independente do filtro de
// visualização do Cronograma (cronogramaFiltroAno/Mes), já que são telas diferentes com
// propósitos diferentes (ver imprimir lote em gerarListasCronogramaMes).
let registroLoteFiltroAno = String(hojeCronograma.getFullYear());
let registroLoteFiltroMes = String(hojeCronograma.getMonth());
let registroLoteFiltroTema = '';
// Frentes marcadas pro filtro/prévia/geração da impressão em lote - checkbox múltiplo, não
// select único, pra cobrir "3 frentes específicas de 12" (não só "todas" ou "só uma").
// Inicializado com TODAS as frentes ativas marcadas na primeira vez que a tela carrega
// (ver popularFiltroAnoRegistroLote), preservando o comportamento antigo de "Todas as
// frentes" quando o usuário não mexe em nada. Continua cobrindo tanto "todos os temas pra
// um encarregado específico" (só a frente dele marcada) quanto "um tema pra várias frentes
// escolhidas" (tema + subconjunto de frentes marcado).
let registroLoteFrentesSelecionadas = new Set();
// Ids do cronograma marcados pra entrar na impressão em lote - null = ainda não
// inicializado (marca todos por padrão na primeira renderização do filtro atual).
let registroLoteSelecionados = null;
// Equipe da sessão em "Nova Sessão" (aba Registro) - mesmo padrão de lancTreinEquipe
// (Lançar Treinamento): "Carregar equipe do Responsável" pré-carrega, mas o usuário
// pode ajustar (remover/adicionar avulso) antes de gerar o documento. Existe pra cobrir
// frentes sem encarregado direto no cadastro (colaboradores_efetivo.responsavel vazio),
// onde não tem o que pré-carregar automaticamente.
let registroNovaEquipe = new Map();

// Variáveis de estado do Lote de Impressão de Formulários DDSMS (lógica análoga a Treinamentos)
// Configurações e parametrizações operacionais do módulo DDSMA (Supabase configuracoes_sistema + localStorage)
const DDS_CONFIG_PADRAO = {
    regraSemana: 'primeira_segunda', // 'primeira_segunda' | 'maioria_dias' | 'dia_primeiro'
    cicloEnvio: 'atual',             // 'atual' | 'subsequente'
    linhasVaziasMin: 10              // linhas mínimas na tabela de colaboradores
};
let ddsConfiguracoes = { ...DDS_CONFIG_PADRAO };
try {
    const _savedDdsCfg = localStorage.getItem('dds_configuracoes');
    if (_savedDdsCfg) {
        const _parsed = JSON.parse(_savedDdsCfg);
        ddsConfiguracoes = {
            regraSemana: _parsed.regraSemana || 'primeira_segunda',
            cicloEnvio: _parsed.cicloEnvio || 'atual',
            linhasVaziasMin: parseInt(_parsed.linhasVaziasMin, 10) || 10
        };
    }
} catch (e) {}

function calcularMesAnoPadraoDds() {
    const hoje = new Date();
    if (ddsConfiguracoes.cicloEnvio === 'subsequente') {
        const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        return { ano: String(prox.getFullYear()), mes: String(prox.getMonth()) };
    }
    return { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth()) };
}

const _padraoDdsInicial = calcularMesAnoPadraoDds();
let ddsLoteFiltroAno = _padraoDdsInicial.ano;
let ddsLoteFiltroMes = _padraoDdsInicial.mes;
let ddsLoteFiltroSemana = ''; // '' = todas as semanas do mês, ou ISO da segunda-feira
let ddsLoteFiltroTema = '';
let ddsLoteFrentesSelecionadas = new Set();
let ddsLoteSelecionados = null; // Set de chaves `${frente}__${segIso}`

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Reconstrói as opções de ano de um <select> a partir do conjunto de anos calculado,
// preservando a seleção atual quando ela continua válida. Só reconstrói quando o
// conjunto de anos realmente mudou (evita perder foco/seleção à toa a cada render).
// Existe porque um "só popula uma vez" (guarda por options.length) é frágil quando os
// dados ainda estão chegando de forma paginada (ex: 13k+ linhas de treinamentos, várias
// idas ao Supabase) - se esse popular acontecer cedo demais (ex: usuário revisita a
// página enquanto o carregamento anterior ainda está em andamento), a lista fica presa
// incompleta pro resto da sessão.
function popularSelectAnos(selectId, anosSet) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const anosOrdenados = Array.from(anosSet).sort((a, b) => b - a);
    const anosAtuais = Array.from(sel.options).slice(1).map(o => o.value);
    const jaCompleto = anosAtuais.length === anosOrdenados.length && anosAtuais.every((v, i) => Number(v) === anosOrdenados[i]);
    if (jaCompleto) return;
    const valorSelecionado = sel.value;
    sel.innerHTML = '<option value="">Ano específico...</option>';
    anosOrdenados.forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        sel.appendChild(opt);
    });
    if (valorSelecionado && anosOrdenados.some(a => String(a) === valorSelecionado)) {
        sel.value = valorSelecionado;
    }
}

// Ano/mês específico pra comparar períodos distantes (ex: 2024 vs 2026) - os botões
// rápidos (Este Mês/Últimos 3 Meses/Este Ano/Todos) só cobrem janelas relativas a hoje.
function popularFiltroAnoTreinamentos() {
    const anos = new Set([new Date().getFullYear()]);
    allTreinamentosRealizados.forEach(r => { if (r.data_treinamento) anos.add(parseLocalDate(r.data_treinamento).getFullYear()); });
    popularSelectAnos('treinFiltroAno', anos);
}

function getTreinamentosDateRange() {
    const tituloEl = document.getElementById('treinPeriodoTitulo');
    if (treinamentosFiltroAno) {
        const ano = parseInt(treinamentosFiltroAno, 10);
        if (treinamentosFiltroMes !== '') {
            const mes = parseInt(treinamentosFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (treinamentosFilter === 'trimestre') {
        inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        titulo = 'Últimos 3 meses';
    } else if (treinamentosFilter === 'ano') {
        inicio = new Date(now.getFullYear(), 0, 1);
        titulo = `Ano ${now.getFullYear()} (até hoje)`;
    } else if (treinamentosFilter === 'todos') {
        inicio = new Date(2000, 0, 1);
        titulo = 'Todo o histórico';
    } else {
        inicio = new Date(now.getFullYear(), now.getMonth(), 1);
        titulo = 'Este mês';
    }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

let renderizandoTreinamentos = false;
let debounceTreinamentosTimer = null;

function agendarRenderTreinamentosPanel() {
    if (debounceTreinamentosTimer) clearTimeout(debounceTreinamentosTimer);
    debounceTreinamentosTimer = setTimeout(() => {
        renderTreinamentosPanel();
    }, 30);
}

function setTreinamentosFilter(filter) {
    treinamentosFilter = filter;
    treinamentosFiltroAno = '';
    treinamentosFiltroMes = '';
    const anoSel = document.getElementById('treinFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('treinFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroTreinMes', 'btnFiltroTreinTrimestre', 'btnFiltroTreinAno', 'btnFiltroTreinTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroTreinMes', trimestre: 'btnFiltroTreinTrimestre', ano: 'btnFiltroTreinAno', todos: 'btnFiltroTreinTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    treinColabPeriodoSelecionados = new Set();
    agendarRenderTreinamentosPanel();
}

function onTreinamentosFiltroAnoMesChange() {
    treinamentosFiltroAno = document.getElementById('treinFiltroAno')?.value || '';
    treinamentosFiltroMes = document.getElementById('treinFiltroMes')?.value || '';
    if (treinamentosFiltroAno) {
        ['btnFiltroTreinMes', 'btnFiltroTreinTrimestre', 'btnFiltroTreinAno', 'btnFiltroTreinTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    treinColabPeriodoSelecionados = new Set();
    agendarRenderTreinamentosPanel();
}

async function loadTreinamentosData() {
    const statusEl = document.getElementById('treinamentosImportStatus');
    try {
        const [realizados, catalogo, status, cronograma, convocados, ddsRealizados, ddsFechamento, ddsTemas, ddsFrentesConfig, ddsHistorico, ddsFrentesAlias, relatorioConfig, regras] = await Promise.all([
            supabaseFetchCacheado('treinamentos_realizados', '?select=*'),
            supabaseFetchCacheado('treinamentos_catalogo', '?select=*'),
            supabaseFetchCacheado('treinamentos_status', '?select=*'),
            supabaseFetchCacheado('treinamentos_cronograma', '?select=*'),
            supabaseFetchCacheado('treinamentos_convocados', '?select=*'),
            supabaseFetchCacheado('dds_realizados', '?select=*'),
            supabaseFetchCacheado('dds_fechamento_semanal', '?select=*'),
            supabaseFetchCacheado('dds_temas_cronograma', '?select=*'),
            supabaseFetchCacheado('dds_frentes_config', '?select=*'),
            supabaseFetchCacheado('dds_historico_agregado', '?select=*'),
            supabaseFetchCacheado('dds_frentes_alias', '?select=*'),
            supabaseFetchCacheado('relatorio_mensal_config', '?select=*'),
            supabaseFetchCacheado('treinamentos_regras_recomendacao', '?select=*&order=created_at.desc').catch(() => [])
        ]);
        allTreinamentosRealizados = realizados;
        allTreinamentosCatalogo = catalogo;
        allTreinamentosStatus = status;
        allTreinamentosCronograma = cronograma;
        allTreinamentosConvocados = convocados;
        allDdsRealizados = ddsRealizados;
        allDdsFechamentoSemanal = ddsFechamento;
        allDdsTemasCronograma = ddsTemas;
        allDdsFrentesConfig = ddsFrentesConfig;
        allDdsHistoricoAgregado = ddsHistorico;
        allDdsFrentesAlias = ddsFrentesAlias;
        allRelatorioMensalConfig = relatorioConfig;
        allTreinamentosRegras = regras || [];
        // Precisa do efetivo pra saber quem realmente está ativo hoje (ver comentário
        // em renderTreinamentosPanel), e do catálogo de GHE pra preencher Setor/Cargo/
        // Agentes/EPIs/EPCs na Ordem de Serviço (construirFolhaOrdemServico) - carrega os
        // dois mesmo se o usuário nunca abriu a página Efetivo nesta sessão, senão a OS
        // sai com esses campos em branco sem nenhum aviso.
        if (allEfetivo.length === 0) {
            allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*');
        }
        if (allGheCatalogo.length === 0) {
            allGheCatalogo = await supabaseFetchCacheado('ghe_catalogo', '?select=*');
        }
        renderTreinamentosPanel();
        renderCatalogoResumo();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput')?.value || '');
        // Popula datalist/select da aba "Lançar Treinamento" assim que os dados chegam,
        // sem depender do usuário abrir essa aba primeiro (ambos são idempotentes -
        // só preenchem se ainda estiverem vazios).
        popularCatalogoDatalist();
        popularResponsavelSelect();
        popularRegistroResponsavelNovaSelect();
        renderCronogramaLista();
        popularDdsFrenteSelect();
        popularDdsTemaDatalist();
        // Corrige uma condição de corrida real: loadTreinamentosData() é disparada sem
        // "await" ao entrar na página Treinamentos (ver showDbPage), então se o usuário já
        // estiver (ou entrar rápido demais) na aba DDS antes dessa busca terminar, as
        // funções que desenham a aba DDS (chamadas só ao TROCAR de aba, em
        // showTreinSubtab) já rodaram com allDdsRealizados ainda vazio e nunca eram
        // chamadas de novo - a lista "Lançamentos Recentes" (e o resto da aba DDS) ficava
        // presa no estado vazio até o usuário trocar de aba e voltar. Redesenhar aqui,
        // incondicionalmente, assim que os dados realmente chegam, resolve isso sem
        // depender de qual aba está aberta no momento (mesmo raciocínio do "self-heal" já
        // usado acima pra renderTreinamentosPanel/renderCronogramaLista).
        renderDdsPanel();
        renderDdsFechamentoSemanal();
        renderDdsCalendarioTemas();
        renderDdsLancamentosRecentes();
        // Self-heal: se o usuário já estiver na subaba de regras ou gaps, renderiza imediatamente agora que os dados chegaram
        if (document.getElementById('treinSubtab-regras')?.style.display === 'block') {
            renderTreinamentoRegrasTab();
        }
        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao carregar dados de treinamentos:', err);
        if (statusEl) statusEl.textContent = '❌ Falha ao carregar dados de treinamentos.';
    }
}

// Abas da página Treinamentos (Visão Geral / Lançar Treinamento / Catálogo). Sempre
// re-renderiza a Visão Geral ao entrar nela (mesmo raciocínio do self-heal de
// showDbPage - se o gráfico foi criado com o canvas escondido em outra aba, sem isso
// ficaria em branco pra sempre).
function showTreinSubtab(tab) {
    ['visao', 'lancar', 'cronograma', 'equipes', 'registro', 'kits', 'historico', 'catalogo', 'relatorio', 'pat', 'regras', 'gaps'].forEach(t => {
        const content = document.getElementById('treinSubtab-' + t);
        const btn = document.getElementById('treinSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderTreinamentosPanel();
    if (tab === 'historico') renderTreinHistLista();
    if (tab === 'cronograma') renderCronogramaLista();
    if (tab === 'equipes') {
        if (!allTreinamentosRealizados || allTreinamentosRealizados.length === 0 || !allEfetivo || allEfetivo.length === 0) {
            loadTreinamentosData().then(() => {
                popularFiltrosProntidaoEquipes();
                renderProntidaoEquipeTab();
            });
        } else {
            popularFiltrosProntidaoEquipes();
            renderProntidaoEquipeTab();
        }
        popularEquipesResponsavelDatalist();
        renderEquipeAtual();
    }
    if (tab === 'relatorio') popularRelatorioMensalDefaults();
    if (tab === 'pat') renderPlanoAnualTreinamento();
    if (tab === 'regras') {
        if (!allTreinamentosRegras || allTreinamentosRegras.length === 0) {
            recarregarRegrasRecomendacao();
        } else {
            renderTreinamentoRegrasTab();
        }
    }
    if (tab === 'gaps') {
        if (!allTreinamentosRegras || allTreinamentosRegras.length === 0 || !allEfetivo || allEfetivo.length === 0) {
            recarregarRegrasRecomendacao().then(() => renderTreinamentoGapsTab());
        } else {
            renderTreinamentoGapsTab();
        }
    }
    // A sub-aba "dds" saiu daqui - agora é a página própria "DDSMA" (ver
    // showDdsmaSubtab, showDbPage e o menu lateral).
    // Não força registroDetalheCard a esconder aqui - a busca/lista que carrega uma
    // sessão agora mora em Histórico, então trocar pra Registro deve preservar o que já
    // foi carregado (a visibilidade do card é controlada por quem carrega a sessão:
    // carregarSessaoRegistro/carregarSessaoNovaRegistro), não pelo simples ato de trocar
    // de aba.
    if (tab === 'registro') { popularFiltroAnoRegistroLote(); }
    if (tab === 'kits') { inicializarKitsTab(); }
}

// Abas da página DDSMA (Visão Geral / Lançar DDS / Calendário de Temas /
// Controle por Frente / Imprimir) - mesmo raciocínio de showTreinSubtab:
// sempre redesenha a aba ao entrar nela (self-heal de gráfico com canvas
// escondido) e inicializa os campos de data/select da primeira visita.
function showDdsmaSubtab(tab) {
    ['visao', 'lancar', 'calendario', 'frente', 'imprimir', 'relatorio', 'config'].forEach(t => {
        const content = document.getElementById('ddsmaSubtab-' + t);
        const btn = document.getElementById('ddsmaSubtabBtn-' + t);
        if (content) content.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
    });
    if (tab === 'visao') renderDdsPanel();
    if (tab === 'lancar') renderDdsLancamentosRecentes();
    if (tab === 'calendario') renderDdsCalendarioTemas();
    if (tab === 'frente') renderDdsFechamentoSemanal();
    if (tab === 'imprimir') {
        const fichaSel = document.getElementById('ddsImprimirFichaFrente');
        if (fichaSel && fichaSel.options.length <= 1) {
            todasFrentesAtivas().forEach(f => {
                const opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f;
                fichaSel.appendChild(opt);
            });
        }
        const dataFicha = document.getElementById('ddsImprimirFichaData');
        if (dataFicha && !dataFicha.value) dataFicha.value = new Date().toISOString().split('T')[0];

        inicializarDdsLote();

        const anoInput = document.getElementById('ddsImprimirRelatorioAno');
        if (anoInput && !anoInput.value) anoInput.value = new Date().getFullYear();
        const mesRelSel = document.getElementById('ddsImprimirRelatorioMes');
        if (mesRelSel && !mesRelSel.dataset.inicializado) { mesRelSel.value = String(new Date().getMonth()); mesRelSel.dataset.inicializado = '1'; }
        const semanaDataInput = document.getElementById('ddsImprimirRelatorioSemanaData');
        if (semanaDataInput && !semanaDataInput.value) semanaDataInput.value = new Date().toISOString().split('T')[0];
    }
    // A aba de Relatório usa os números da Visão Geral (window.ddsmaReportData) - por isso,
    // ao abrir ela, força um recálculo da Visão Geral, garantindo que o relatório nunca
    // fique desatualizado mesmo que o usuário nunca tenha aberto essa outra sub-aba antes.
    if (tab === 'relatorio') { renderDdsPanel(); renderDdsmaRelatorioChecklist(); }
    if (tab === 'config') { renderDdsConfiguracoes(); }
}

// ============================================
// RELATÓRIO CONFIGURÁVEL DE DDSMA - mesmo padrão já usado em Saúde, Efetivo, EPI,
// Acidentabilidade e Checklist: o usuário escolhe via checkbox quais KPIs/gráficos/lista
// entram no relatório antes de gerar. Os dados vêm de window.ddsmaReportData (preenchido
// no fim de renderDdsPanel - nunca recalculado aqui). A seção "Ações/Tratativas Pendentes"
// nunca aparece aqui de propósito - é sigilosa por design (ver comentário em
// renderAcoesTratativasPendentesDds).
// ============================================

function renderDdsmaRelatorioChecklist() {
    const el = document.getElementById('ddsmaRelPeriodo');
    if (el && window.ddsmaReportData) el.textContent = window.ddsmaReportData.periodoLabel || '—';
}

function marcarTodosRelatorioDdsma(valor) {
    ['relDdsmaChk_sessoes', 'relDdsmaChk_hht', 'relDdsmaChk_colaboradores', 'relDdsmaChk_ruim',
     'relDdsmaChk_graficoHhtMes', 'relDdsmaChk_graficoHhtTotalMes',
     'relDdsmaChk_listaControleFrente'].forEach(id => {
        const chk = document.getElementById(id);
        if (chk) chk.checked = valor;
    });
}

function lerSelecaoRelatorioDdsma() {
    return {
        sessoes: document.getElementById('relDdsmaChk_sessoes').checked,
        hht: document.getElementById('relDdsmaChk_hht').checked,
        colaboradores: document.getElementById('relDdsmaChk_colaboradores').checked,
        ruim: document.getElementById('relDdsmaChk_ruim').checked,
        graficoHhtMes: document.getElementById('relDdsmaChk_graficoHhtMes').checked,
        graficoHhtTotalMes: document.getElementById('relDdsmaChk_graficoHhtTotalMes').checked,
        listaControleFrente: document.getElementById('relDdsmaChk_listaControleFrente').checked
    };
}

async function gerarExcelDdsma() {
    const statusEl = document.getElementById('relatorioDdsmaStatus');
    const dados = window.ddsmaReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioDdsma();
    if (Object.values(marcados).every(v => !v)) {
        statusEl.textContent = '❌ Selecione pelo menos um item para gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const aoa = [];
    aoa.push([`RELATÓRIO DE DDS (DDSMA) — ${dados.periodoLabel}`]);
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
        if (g.series) {
            aoa.push(['Categoria', ...g.series.map(s => s.nome)]);
            g.labels.forEach((label, i) => aoa.push([label, ...g.series.map(s => s.valores[i])]));
        } else {
            aoa.push(['Categoria', 'Valor']);
            g.labels.forEach((label, i) => aoa.push([label, g.valores[i]]));
        }
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
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DDSMA');

    const dataSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RELATORIO_DDSMA_${dataSlug}.xlsx`);

    statusEl.textContent = `✅ Excel gerado com ${Object.values(marcados).filter(Boolean).length} item(ns) selecionado(s).`;
    statusEl.style.color = 'var(--success)';
}

function gerarPdfDdsma() {
    const statusEl = document.getElementById('relatorioDdsmaStatus');
    const dados = window.ddsmaReportData;
    if (!dados) {
        statusEl.textContent = '❌ Abra a aba 📊 Visão Geral pelo menos uma vez antes de gerar o relatório.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const marcados = lerSelecaoRelatorioDdsma();
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
        if (g.series) {
            return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:85%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th>${g.series.map(s => `<th>${escapeHTML(s.nome)}</th>`).join('')}</tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td>${g.series.map(s => `<td>${escapeHTML(String(s.valores[i] ?? '—'))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
        }
        return `
    <h3>${escapeHTML(g.titulo)}</h3>
    <table style="width:65%; margin-bottom:14px;">
        <thead><tr><th>Categoria</th><th>Valor</th></tr></thead>
        <tbody>${g.labels.map((label, i) => `<tr><td style="text-align:left;">${escapeHTML(String(label))}</td><td>${escapeHTML(String(g.valores[i]))}</td></tr>`).join('')}</tbody>
    </table>`;
    }).join('');

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
<title>Relatório de DDS (DDSMA)</title>
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
        <div class="titulo">RELATÓRIO DE DDS (DDSMA)</div>
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

// ---- Histórico: lista navegável de sessões já realizadas (separada de Registro, que
// agora só gera/imprime) - agrupa treinamentos_realizados por treinamento_cod+data,
// mesma lógica de agrupamento já usada em renderListaTreinAderencia. ----
let treinHistFilter = 'todos';
let treinHistFiltroAno = '';
let treinHistFiltroMes = '';
let treinHistExpandidoChave = null;

function popularFiltroAnoTreinHist() {
    const anos = new Set([new Date().getFullYear()]);
    allTreinamentosRealizados.forEach(r => { if (r.data_treinamento) anos.add(parseLocalDate(r.data_treinamento).getFullYear()); });
    popularSelectAnos('treinHistFiltroAno', anos);
}

function getTreinHistDateRange() {
    const tituloEl = document.getElementById('treinHistPeriodoTitulo');
    if (treinHistFiltroAno) {
        const ano = parseInt(treinHistFiltroAno, 10);
        if (treinHistFiltroMes !== '') {
            const mes = parseInt(treinHistFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }

    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (treinHistFilter === 'mes') { inicio = new Date(now.getFullYear(), now.getMonth(), 1); titulo = 'Este mês'; }
    else if (treinHistFilter === 'trimestre') { inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1); titulo = 'Últimos 3 meses'; }
    else if (treinHistFilter === 'ano') { inicio = new Date(now.getFullYear(), 0, 1); titulo = `Ano ${now.getFullYear()} (até hoje)`; }
    else { inicio = new Date(2000, 0, 1); titulo = 'Todo o histórico'; }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setTreinHistFilter(filter) {
    treinHistFilter = filter;
    treinHistFiltroAno = '';
    treinHistFiltroMes = '';
    const anoSel = document.getElementById('treinHistFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('treinHistFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroTreinHistMes', 'btnFiltroTreinHistTrimestre', 'btnFiltroTreinHistAno', 'btnFiltroTreinHistTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroTreinHistMes', trimestre: 'btnFiltroTreinHistTrimestre', ano: 'btnFiltroTreinHistAno', todos: 'btnFiltroTreinHistTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderTreinHistLista();
}

function onTreinHistFiltroAnoMesChange() {
    treinHistFiltroAno = document.getElementById('treinHistFiltroAno').value;
    treinHistFiltroMes = document.getElementById('treinHistFiltroMes').value;
    if (treinHistFiltroAno) {
        ['btnFiltroTreinHistMes', 'btnFiltroTreinHistTrimestre', 'btnFiltroTreinHistAno', 'btnFiltroTreinHistTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderTreinHistLista();
}

function toggleTreinHistDetalhe(chave) {
    treinHistExpandidoChave = treinHistExpandidoChave === chave ? null : chave;
    renderTreinHistLista();
}

// Leva a sessão dessa linha direto pro Registro, já carregada - reaproveita a mesma
// cadeia de carregamento de sempre (onRegistroCodigoChange -> onRegistroDataChange ->
// carregarSessaoRegistro), só que disparada por clique em vez de digitação manual.
function abrirSessaoNoRegistro(cod, data) {
    document.getElementById('registroCodigoInput').value = cod;
    onRegistroCodigoChange();
    document.getElementById('registroDataSelect').value = data;
    onRegistroDataChange();
    showTreinSubtab('registro');
}

function renderTreinHistLista() {
    popularFiltroAnoTreinHist();
    const el = document.getElementById('listTreinHistorico');
    if (!el) return;
    if (!anexosSmsCarregados) {
        garantirAnexosSmsCarregados(renderTreinHistLista);
    }
    const { inicio, fim } = getTreinHistDateRange();
    const periodo = allTreinamentosRealizados.filter(r => {
        if (!r.data_treinamento) return false;
        const d = parseLocalDate(r.data_treinamento);
        return d >= inicio && d <= fim;
    });

    const sessoes = new Map();
    periodo.forEach(r => {
        if (!r.data_treinamento) return;
        const chave = `${r.treinamento_cod}||${r.data_treinamento}`;
        if (!sessoes.has(chave)) {
            sessoes.set(chave, { chave, data: r.data_treinamento, cod: r.treinamento_cod, nome: r.treinamento_nome, participantes: [] });
        }
        sessoes.get(chave).participantes.push(r);
    });

    const busca = (document.getElementById('buscaTreinHistorico')?.value || '').toUpperCase().trim();
    let linhas = Array.from(sessoes.values());
    if (busca) {
        linhas = linhas.filter(s => (s.nome || '').toUpperCase().includes(busca) || (s.cod || '').toUpperCase().includes(busca));
    }
    linhas.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    if (linhas.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhuma sessão realizada nesse período.</div>';
        return;
    }

    el.innerHTML = linhas.map(s => {
        const expandido = treinHistExpandidoChave === s.chave;
        const detalhe = expandido ? `
            <div style="flex-basis:100%; margin-top:8px; padding:10px; background:var(--bg); border-radius:8px; font-size:12px;">
                <div style="margin-bottom:6px;"><b>Participantes (${s.participantes.length}):</b></div>
                <ul style="margin:0; padding-left:18px; list-style:none;">
                    ${s.participantes.map(p => `
                        <li style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:3px 0;">
                            <span>${escapeHTML(p.nome || p.matricula)} — ${escapeHTML(p.funcao || 'Sem função')}</span>
                            <button onclick="excluirTreinamentoRealizadoHist('${escapeHTML(p.id)}')" title="Excluir este lançamento" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; padding:2px 6px; flex-shrink:0;">🗑️</button>
                        </li>`).join('')}
                </ul>
            </div>` : '';
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px; cursor:pointer;" onclick="toggleTreinHistDetalhe('${escapeHTML(s.chave)}')">
                <div class="db-list-item-title">${formatSimpleDate(s.data)} — ${escapeHTML(s.nome || s.cod)}</div>
                <div class="db-list-item-sub">${s.participantes.length} participante(s)</div>
            </div>
            <button class="btn btn-sm btn-outline-primary btn-editar-sessao" onclick="abrirModalEditarSessaoTreinamento('${escapeHTML(s.cod)}', '${escapeHTML(s.data)}')" title="Editar Data da Sessão"><i class="fas fa-calendar-alt"></i> Alterar Data</button>
            <button class="db-clear-btn" onclick="abrirSessaoNoRegistro('${escapeHTML(s.cod)}', '${escapeHTML(s.data)}')">🖨️ Abrir no Registro</button>
            <button class="db-clear-btn" onclick="abrirAnexoModal('treinamentos_realizados', '${escapeHTML(s.chave)}', '${escapeHTML(formatSimpleDate(s.data))} — ${escapeHTML(s.nome || s.cod)}')">📎 Anexos${labelContagemAnexos('treinamentos_realizados', s.chave)}</button>
            ${detalhe}
        </div>`;
    }).join('');
}

function renderTreinamentosPanel() {
    if (renderizandoTreinamentos) return;
    renderizandoTreinamentos = true;
    try {
        popularFiltroAnoTreinamentos();
        const { inicio, fim } = getTreinamentosDateRange();
        const iniMs = (inicio instanceof Date && !isNaN(inicio.getTime())) ? inicio.getTime() : 0;
        const fimMs = (fim instanceof Date && !isNaN(fim.getTime())) ? fim.getTime() : Infinity;

        // Otimização O(N): filtra periodo, acumula horas e mapeia colaboradores em uma única passagem
        const periodo = [];
        let totalHoras = 0;
        const matriculasDistintas = new Set();
        for (let i = 0; i < allTreinamentosRealizados.length; i++) {
            const r = allTreinamentosRealizados[i];
            if (!r || !r.data_treinamento) continue;
            const dMs = r._dataMs || (r._dataMs = parseLocalDate(r.data_treinamento).getTime());
            if (isNaN(dMs) || dMs < iniMs || dMs > fimMs) continue;
            periodo.push(r);
            const ch = parseFloat(r.carga_horaria);
            if (!isNaN(ch) && ch > 0) totalHoras += ch;
            if (r.matricula) matriculasDistintas.add(r.matricula);
        }

        const kpiSessoesEl = document.getElementById('kpiTreinSessoes');
        if (kpiSessoesEl) kpiSessoesEl.textContent = periodo.length.toLocaleString('pt-BR');

        const kpiHhtEl = document.getElementById('kpiTreinHHT');
        if (kpiHhtEl) kpiHhtEl.textContent = Math.round(totalHoras).toLocaleString('pt-BR');

        // Cálculo de HHT de DDS no período
        const ddsHorasPeriodo = ddsHorasNoPeriodo(inicio, fim);
        const kpiTotalEl = document.getElementById('kpiTreinHHTTotal');
        if (kpiTotalEl) kpiTotalEl.textContent = Math.round(totalHoras + ddsHorasPeriodo).toLocaleString('pt-BR');

        const kpiColabEl = document.getElementById('kpiTreinColaboradores');
        if (kpiColabEl) kpiColabEl.textContent = matriculasDistintas.size.toLocaleString('pt-BR');

        treinColaboradoresPeriodoAtual = periodo;
        const buscaEl = document.getElementById('buscaTreinColabPeriodo');
        if (buscaEl) buscaEl.value = '';

        renderListaTreinColaboradoresPeriodo();
        renderListaTreinAderencia(periodo);
        renderCumprimentoCronogramaEPresenca(inicio, fim);

        // NRs vencidas/vencendo
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        const efetivoPorMatricula = new Map(allEfetivo.map(e => [e.id, e]));
        const nrAlerts = [];
        const matriculasComNRVencida = new Set();
        for (let i = 0; i < allTreinamentosStatus.length; i++) {
            const s = allTreinamentosStatus[i];
            if (!s || !s.meses_validade || !s.data_proxima_reciclagem) continue;
            const efetivo = efetivoPorMatricula.get(s.matricula);
            const estaAtivo = efetivo ? (!!efetivo.dt_admissao && !efetivo.dt_demissao) : (s.status_colaborador === 'ATIVO');
            if (!estaAtivo) continue;

            const recMs = s._recMs || (s._recMs = parseLocalDate(s.data_proxima_reciclagem).getTime());
            if (isNaN(recMs)) continue;
            const diffDays = Math.ceil((recMs - todayMs) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                nrAlerts.push({ s, diffDays });
                if (diffDays < 0 && s.matricula) matriculasComNRVencida.add(s.matricula);
            }
        }

        const kpiVencidosEl = document.getElementById('kpiTreinVencidos');
        if (kpiVencidosEl) kpiVencidosEl.textContent = matriculasComNRVencida.size;

        nrAlerts.sort((a, b) => a.diffDays - b.diffDays);
        const listEl = document.getElementById('listTreinVencendo');
        if (listEl) {
            if (nrAlerts.length === 0) {
                listEl.innerHTML = '<div class="db-list-empty">✅ Nenhuma NR vencida ou vencendo nos próximos 30 dias</div>';
            } else {
                const top = nrAlerts.slice(0, 30);
                const grupos = new Map();
                top.forEach(item => {
                    const cod = item.s.treinamento_cod || '';
                    if (!grupos.has(cod)) grupos.set(cod, { nome: item.s.treinamento_nome || cod, itens: [] });
                    grupos.get(cod).itens.push(item);
                });
                const gruposOrdenados = Array.from(grupos.entries())
                    .sort((a, b) => Math.min(...a[1].itens.map(i => i.diffDays)) - Math.min(...b[1].itens.map(i => i.diffDays)));

                listEl.innerHTML = gruposOrdenados.map(([cod, grupo]) => {
                    const matriculasGrupo = JSON.stringify(grupo.itens.map(i => i.s.matricula)).replace(/"/g, '&quot;');
                    const itensHtml = grupo.itens.map(({ s, diffDays }) => {
                        const cls = diffDays < 0 ? 'db-item-danger' : 'db-item-warning';
                        const msg = diffDays < 0 ? `Vencida há ${Math.abs(diffDays)} dia(s)` : (diffDays === 0 ? 'Vence hoje' : `Vence em ${diffDays} dia(s)`);
                        const matriculaJson = JSON.stringify([s.matricula]).replace(/"/g, '&quot;');
                        return `<div class="db-list-item ${cls}" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <div style="flex:1; min-width:160px;">
                                <div class="db-list-item-title">${escapeHTML(s.nome || s.matricula)}</div>
                                <div class="db-list-item-sub">${msg}</div>
                            </div>
                            <button class="db-clear-btn" style="padding:4px 9px; font-size:11px;" title="Programar sessão só pra este colaborador" onclick="programarRenovacaoNR('${escapeHTML(cod)}', ${matriculaJson})">📋 Programar</button>
                        </div>`;
                    }).join('');
                    return `<div style="margin-bottom:10px; border:1px solid var(--border); border-radius:8px; padding:8px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                            <div style="font-weight:600; font-size:12.5px;">${escapeHTML(grupo.nome)} <span style="font-weight:400; color:var(--text-light);">(${grupo.itens.length} colaborador${grupo.itens.length > 1 ? 'es' : ''})</span></div>
                            <button class="db-apply-btn" style="padding:5px 10px; font-size:11.5px;" title="Programar uma sessão só com todo mundo que precisa desta NR agora" onclick="programarRenovacaoNR('${escapeHTML(cod)}', ${matriculasGrupo})">📋 Programar Grupo</button>
                        </div>
                        ${itensHtml}
                    </div>`;
                }).join('');
            }
        }

        if (typeof Chart === 'undefined') return;
        if (chartInstances.treinHHTMes) chartInstances.treinHHTMes.destroy();
        if (chartInstances.treinSetor) chartInstances.treinSetor.destroy();
        if (chartInstances.treinTopTemas) chartInstances.treinTopTemas.destroy();

        // HHT por mês - Pré-agrega carga horária por "YYYY-MM" em UMA ÚNICA PASSAGEM O(N)
        // eliminando loop quadrático O(N*M) e prevenindo congelamento da thread
        const horasPorMesMap = new Map();
        for (let i = 0; i < allTreinamentosRealizados.length; i++) {
            const r = allTreinamentosRealizados[i];
            if (!r || !r.data_treinamento) continue;
            const dStr = String(r.data_treinamento).trim();
            if (dStr.length < 7) continue;
            const anoMes = dStr.substring(0, 7);
            const ch = parseFloat(r.carga_horaria);
            if (!isNaN(ch) && ch > 0) {
                horasPorMesMap.set(anoMes, (horasPorMesMap.get(anoMes) || 0) + ch);
            }
        }

        const now = new Date();
        const anoAtual = now.getFullYear();
        const mesAtual = now.getMonth();
        const limiteMes = new Date(anoAtual, mesAtual, 1);

        // Limite retroativo seguro: busca primeiro ano/mês real (mínimo 2024, máx 36 meses atrás)
        let menorAnoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
        for (const k of horasPorMesMap.keys()) {
            if (/^\d{4}-\d{2}$/.test(k) && k >= '2024-01' && k < menorAnoMes) {
                menorAnoMes = k;
            }
        }
        const partesMenor = menorAnoMes.split('-');
        let cursorMes = new Date(parseInt(partesMenor[0], 10), parseInt(partesMenor[1], 10) - 1, 1);
        const pisoMinimo = new Date(anoAtual - 3, mesAtual, 1);
        if (cursorMes < pisoMinimo || isNaN(cursorMes.getTime())) {
            cursorMes = pisoMinimo;
        }

        const meses = [], horasPorMes = [];
        let safetyCounter = 0;
        while (cursorMes <= limiteMes && safetyCounter < 48) {
            safetyCounter++;
            const a = cursorMes.getFullYear();
            const m = cursorMes.getMonth();
            const chave = `${a}-${String(m + 1).padStart(2, '0')}`;
            meses.push(cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            horasPorMes.push(Math.round((horasPorMesMap.get(chave) || 0) * 10) / 10);
            cursorMes = new Date(a, m + 1, 1);
        }

        const chartHHTInner = document.getElementById('chartTreinHHTMesInner');
        const chartHHTCanvas = document.getElementById('chartTreinHHTMes');
        if (chartHHTInner && chartHHTCanvas) {
            const chartHHTWrap = chartHHTInner.parentElement;
            if (chartHHTWrap) {
                chartHHTInner.style.width = Math.max(chartHHTWrap.clientWidth || 300, meses.length * 56) + 'px';
            }
            chartInstances.treinHHTMes = new Chart(chartHHTCanvas, {
                type: 'bar',
                data: { labels: meses, datasets: [{ label: 'HHT', data: horasPorMes, backgroundColor: '#4f46e5', borderRadius: 6 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true }, x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 45 } } }
                }
            });
            if (chartHHTWrap) chartHHTWrap.scrollLeft = 999999;
        }

        // HHT por setor no período filtrado
        const chartSetorCanvas = document.getElementById('chartTreinSetor');
        if (chartSetorCanvas) {
            const setorCounts = {};
            for (let i = 0; i < periodo.length; i++) {
                const r = periodo[i];
                const s = r.setor || 'Sem setor';
                setorCounts[s] = (setorCounts[s] || 0) + (parseFloat(r.carga_horaria) || 0);
            }
            const setorSorted = Object.entries(setorCounts).sort((a, b) => b[1] - a[1]);
            const treinSetorLabels = setorSorted.map(s => wrapChartLabel(s[0]));
            ajustarAlturaBarrasHorizontais('chartTreinSetor', treinSetorLabels);
            chartInstances.treinSetor = new Chart(chartSetorCanvas, {
                type: 'bar',
                data: { labels: treinSetorLabels, datasets: [{ label: 'HHT', data: setorSorted.map(s => Math.round(s[1] * 10) / 10), backgroundColor: '#818cf8', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } } }
            });
        }

        // Top 10 temas mais realizados no período filtrado
        const chartTemasCanvas = document.getElementById('chartTreinTopTemas');
        if (chartTemasCanvas) {
            const temaCounts = {};
            for (let i = 0; i < periodo.length; i++) {
                const r = periodo[i];
                const t = r.treinamento_nome || 'Desconhecido';
                temaCounts[t] = (temaCounts[t] || 0) + 1;
            }
            const temaSorted = Object.entries(temaCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const temaLabels = temaSorted.map(t => wrapChartLabel(t[0]));
            ajustarAlturaBarrasHorizontais('chartTreinTopTemas', temaLabels);
            chartInstances.treinTopTemas = new Chart(chartTemasCanvas, {
                type: 'bar',
                data: { labels: temaLabels, datasets: [{ label: 'Sessões', data: temaSorted.map(t => t[1]), backgroundColor: '#10b981', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { ticks: { autoSkip: false } } } }
            });
        }
    } finally {
        renderizandoTreinamentos = false;
    }
}

// Aderência por sessão = Nº de treinados na sessão ÷ Efetivo total ativo naquela data,
// × 100 - uma linha por sessão real (mesmo treinamento_cod + mesma data_treinamento).
// EXCEÇÃO: Integração (cod '1') não é evento pra todo o efetivo - é por turma de
// admitidos, então o "total" comparável é a própria turma (= o nº de treinados),
// sempre dando 100% - confirmado no arquivo oficial da Gerenciadora Ambiental que o
// usuário enviou (mesma correção já feita no Relatório Mensal). Por isso as sessões de
// Integração ficam de fora da "Média do período" no topo do card: misturar um número
// que é sempre 100% com a adesão real das outras sessões só infla a média à toa.
function renderListaTreinAderencia(periodo) {
    const el = document.getElementById('listTreinAderencia');
    const kpiEl = document.getElementById('kpiTreinAderenciaMedia');
    if (!el) return;

    const sessoes = new Map();
    periodo.forEach(r => {
        if (!r.data_treinamento) return;
        const chave = `${r.treinamento_cod}||${r.data_treinamento}`;
        if (!sessoes.has(chave)) {
            sessoes.set(chave, { data: r.data_treinamento, cod: r.treinamento_cod, nome: r.treinamento_nome, count: 0 });
        }
        sessoes.get(chave).count++;
    });

    if (sessoes.size === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhuma sessão no período.</div>';
        if (kpiEl) kpiEl.textContent = '';
        return;
    }

    const linhas = Array.from(sessoes.values()).map(s => {
        const ehIntegracao = s.cod === '1';
        const totalFuncionarios = ehIntegracao ? s.count : headcountAsOf(parseLocalDate(s.data));
        const pct = totalFuncionarios > 0 ? (s.count / totalFuncionarios * 100) : null;
        return { ...s, totalFuncionarios, pct, ehIntegracao };
    }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const comPct = linhas.filter(l => l.pct !== null && !l.ehIntegracao);
    if (kpiEl) {
        kpiEl.textContent = comPct.length > 0
            ? `Média do período: ${(comPct.reduce((sum, l) => sum + l.pct, 0) / comPct.length).toFixed(0)}%`
            : '';
    }

    // Faixas de cor são só uma referência visual (≥80% bom, 50-79% atenção, <50%
    // baixo) - não é um limite normativo de nenhuma NR, é só pra destacar sessões com
    // adesão visivelmente baixa numa lista longa.
    el.innerHTML = linhas.map(l => {
        const cor = l.pct === null ? { bg: '#f1f1f1', fg: '#666', bd: '#ddd' }
            : l.pct >= 80 ? { bg: '#e6f7ee', fg: '#1a7f4b', bd: '#b8e6cc' }
            : l.pct >= 50 ? { bg: '#fff9e6', fg: '#b78a00', bd: '#ffe8a1' }
            : { bg: '#fdf2f2', fg: '#c0392b', bd: '#f3c6c6' };
        const pctTexto = l.pct === null ? '—' : `${l.pct.toFixed(0)}%`;
        const subtitulo = l.ehIntegracao
            ? `${l.count} treinado(s) — turma de admissão`
            : `${l.count} treinado(s) de ${l.totalFuncionarios} colaborador(es) ativo(s) na data`;
        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px;">
                <div class="db-list-item-title">${formatSimpleDate(l.data)} — ${escapeHTML(l.nome || l.cod)}</div>
                <div class="db-list-item-sub">${subtitulo}</div>
            </div>
            <span class="badge" style="background:${cor.bg}; color:${cor.fg}; border:1px solid ${cor.bd}; font-weight:700;">${pctTexto}</span>
        </div>`;
    }).join('');
}

// "Cumprimento do Cronograma" (% de itens planejados que foram realizados na data
// prevista) e "Taxa de Presença" (% de convocados que compareceram) - nomeado diferente
// de "Aderência por Sessão" acima de propósito, que mede outra coisa (cobertura de
// efetivo por sessão, não pontualidade de cronograma nem presença de convocados).
// Ambos os dados-base só existem a partir de 2026-08-24 - mostram "—" fora desse
// alcance, não "0%", pra não parecer uma nota ruim onde na verdade não há registro.
function renderCumprimentoCronogramaEPresenca(inicio, fim) {
    const kpiCronoEl = document.getElementById('kpiTreinCumprimentoCronograma');
    const kpiPresencaEl = document.getElementById('kpiTreinTaxaPresenca');
    const listaEl = document.getElementById('listTreinCronogramaPendente');
    if (!kpiCronoEl || !kpiPresencaEl || !listaEl) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const itensCronogramaPeriodo = allTreinamentosCronograma.filter(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d >= inicio && d <= fim;
    });
    // Só entram na conta do % itens já "julgáveis": ou já foram lançados (não importa a
    // data), ou ainda estão planejados mas a data prevista já passou (vencidos sem
    // lançamento = não cumprido). Item planejado com data futura ainda não entra nem a
    // favor nem contra - é exatamente essa exclusão que faltava, e que fazia o KPI cair
    // pra 0% só porque o mês ainda estava em andamento (itens futuros contando como
    // "não cumprido" no denominador).
    const itensJulgaveisPeriodo = itensCronogramaPeriodo.filter(c =>
        c.status === 'lancado' || parseLocalDate(c.data_prevista) < hoje
    );
    kpiCronoEl.textContent = itensJulgaveisPeriodo.length === 0
        ? '—'
        : `${Math.round(itensJulgaveisPeriodo.filter(c => c.realizado_no_prazo === true).length / itensJulgaveisPeriodo.length * 100)}%`;

    const convocadosPeriodo = allTreinamentosConvocados.filter(c => {
        if (!c.data_treinamento) return false;
        const d = parseLocalDate(c.data_treinamento);
        return d >= inicio && d <= fim;
    });
    // Isenção Operacional de SST: colaboradores com status "Em Gozo" na data do treinamento
    // não são apontados como faltosos (não rebaixam a taxa de presença da obra).
    const convocadosSemIsencao = convocadosPeriodo.filter(c => {
        const emGozo = typeof colaboradorEstaEmFerias === 'function' && colaboradorEstaEmFerias(c.matricula, c.data_treinamento);
        return !emGozo;
    });
    kpiPresencaEl.textContent = convocadosSemIsencao.length === 0
        ? '—'
        : `${Math.round(convocadosSemIsencao.filter(c => c.presente === true).length / convocadosSemIsencao.length * 100)}%`;

    const semCumprimento = itensCronogramaPeriodo.filter(c => {
        if (c.status === 'lancado') return c.realizado_no_prazo === false;
        return parseLocalDate(c.data_prevista) < hoje; // planejado, com data já passada
    }).sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));

    if (semCumprimento.length === 0) {
        listaEl.innerHTML = '<div class="db-list-empty">✅ Nenhum item do Cronograma sem cumprimento no período.</div>';
    } else {
        listaEl.innerHTML = semCumprimento.map(c => {
            const cat = allTreinamentosCatalogo.find(x => x.id === c.treinamento_cod);
            const motivo = c.status === 'lancado'
                ? `Realizado fora do prazo (${formatSimpleDate(c.data_realizada)}, previsto ${formatSimpleDate(c.data_prevista)})`
                : `Ainda planejado, data prevista já passou (${formatSimpleDate(c.data_prevista)})`;
            return `<div class="db-list-item db-item-warning">
                <div class="db-list-item-title">${escapeHTML(cat?.nome || c.treinamento_cod)}</div>
                <div class="db-list-item-sub">${escapeHTML(motivo)}${c.responsavel ? ` · ${escapeHTML(c.responsavel)}` : ''}</div>
            </div>`;
        }).join('');
    }
}

// IDs atualmente visíveis (após busca) - usado pelo "selecionar todos", que só marca o
// que está na tela, não a lista inteira do período (evita selecionar às cegas algo que
// a busca escondeu).
let treinColabPeriodoVisiveisAtual = [];

function renderListaTreinColaboradoresPeriodo() {
    const el = document.getElementById('listTreinColaboradoresPeriodo');
    if (!el) return;
    const busca = (document.getElementById('buscaTreinColabPeriodo').value || '').trim().toUpperCase();
    let linhas = treinColaboradoresPeriodoAtual.slice().sort((a, b) => {
        const nomeA = (a.nome || '').localeCompare(b.nome || '');
        if (nomeA !== 0) return nomeA;
        return (a.data_treinamento || '').localeCompare(b.data_treinamento || '');
    });
    if (busca) {
        linhas = linhas.filter(r =>
            (r.nome || '').toUpperCase().includes(busca) ||
            (r.matricula || '').toUpperCase().includes(busca) ||
            (r.funcao || '').toUpperCase().includes(busca) ||
            (r.treinamento_nome || '').toUpperCase().includes(busca)
        );
    }
    treinColabPeriodoVisiveisAtual = linhas.map(r => r.id);
    document.getElementById('countTreinColabPeriodo').textContent = `${linhas.length} registro(s)`;
    atualizarBarraSelecaoTreinColabPeriodo();

    if (linhas.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum treinamento realizado nesse período.</div>';
        return;
    }
    const LIMITE_DOM = 150;
    const linhasExibidas = linhas.slice(0, LIMITE_DOM);
    const itensHtml = linhasExibidas.map(r => {
        const dataFmt = r.data_treinamento ? parseLocalDate(r.data_treinamento).toLocaleDateString('pt-BR') : '—';
        const marcado = treinColabPeriodoSelecionados.has(r.id);
        return `<div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <input type="checkbox" ${marcado ? 'checked' : ''} onchange="toggleSelecaoTreinColabPeriodo('${escapeHTML(r.id)}', this.checked)" style="width:16px; height:16px; flex-shrink:0; cursor:pointer;">
                <div style="min-width:0;">
                    <div class="db-list-item-title">${escapeHTML(r.nome || r.matricula)} — ${escapeHTML(r.funcao || 'Sem função')}</div>
                    <div class="db-list-item-sub">${escapeHTML(r.treinamento_nome || '')} — ${dataFmt}</div>
                </div>
            </div>
            <button class="db-clear-btn" style="color: var(--danger); border-color: var(--danger); flex-shrink:0;" onclick="excluirTreinamentoRealizado('${escapeHTML(r.id)}')">🗑️ Excluir</button>
        </div>`;
    }).join('');

    const avisoLimite = linhas.length > LIMITE_DOM
        ? `<div style="padding:10px; text-align:center; color:var(--text-light); font-size:12px; background:rgba(0,0,0,0.02); border-radius:6px; margin-top:8px;">
            ℹ️ Mostrando os primeiros ${LIMITE_DOM} de ${linhas.length} registros para manter o painel ágil. Use a busca acima para filtrar.
           </div>`
        : '';

    el.innerHTML = itensHtml + avisoLimite;
}

function toggleSelecaoTreinColabPeriodo(id, checked) {
    if (checked) treinColabPeriodoSelecionados.add(id);
    else treinColabPeriodoSelecionados.delete(id);
    atualizarBarraSelecaoTreinColabPeriodo();
}

function toggleSelecionarTodosTreinColabPeriodo(checked) {
    if (checked) treinColabPeriodoVisiveisAtual.forEach(id => treinColabPeriodoSelecionados.add(id));
    else treinColabPeriodoVisiveisAtual.forEach(id => treinColabPeriodoSelecionados.delete(id));
    renderListaTreinColaboradoresPeriodo();
}

function atualizarBarraSelecaoTreinColabPeriodo() {
    const btn = document.getElementById('btnExcluirSelecionadosTrein');
    const checkTodos = document.getElementById('checkSelecionarTodosTrein');
    if (!btn) return;
    const qtd = treinColabPeriodoSelecionados.size;
    btn.style.display = qtd > 0 ? 'inline-block' : 'none';
    btn.textContent = `🗑️ Excluir selecionados (${qtd})`;
    if (checkTodos) {
        const todosVisiveisMarcados = treinColabPeriodoVisiveisAtual.length > 0 &&
            treinColabPeriodoVisiveisAtual.every(id => treinColabPeriodoSelecionados.has(id));
        checkTodos.checked = todosVisiveisMarcados;
    }
}

async function excluirSelecionadosTreinColabPeriodo() {
    const ids = Array.from(treinColabPeriodoSelecionados);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} registro(s) de treinamento selecionado(s)? Essa ação não pode ser desfeita.`)) return;
    try {
        await supabaseDeleteMany('treinamentos_realizados', ids);
        const idsSet = new Set(ids);
        allTreinamentosRealizados = allTreinamentosRealizados.filter(r => !idsSet.has(r.id));
        treinColabPeriodoSelecionados = new Set();
        const buscaAtual = document.getElementById('buscaTreinColabPeriodo')?.value || '';
        renderTreinamentosPanel();
        const buscaEl = document.getElementById('buscaTreinColabPeriodo');
        if (buscaEl) { buscaEl.value = buscaAtual; renderListaTreinColaboradoresPeriodo(); }
    } catch (err) {
        console.error('Erro ao excluir treinamentos selecionados:', err);
        alert('Falha ao excluir os registros selecionados: ' + err.message);
    }
}

function limparBuscaTreinColabPeriodo() {
    document.getElementById('buscaTreinColabPeriodo').value = '';
    renderListaTreinColaboradoresPeriodo();
}

// Exclui um registro individual de treinamentos_realizados (ex: lançamento de teste, ou
// um erro de digitação numa sessão) - até aqui esta tabela só tinha caminhos de escrita
// (importação CSV, Lançar Treinamento, merge de catálogo), nenhum de exclusão.
async function excluirTreinamentoRealizado(id) {
    if (bloquearEdicaoSeNaoAutorizado('treinamentos')) return;
    if (!confirm('Excluir este registro de treinamento? Essa ação não pode ser desfeita.')) return;
    try {
        await supabaseDelete('treinamentos_realizados', id);
        allTreinamentosRealizados = allTreinamentosRealizados.filter(r => r.id !== id);
        treinColabPeriodoSelecionados.delete(id);
        const buscaAtual = document.getElementById('buscaTreinColabPeriodo')?.value || '';
        renderTreinamentosPanel();
        const buscaEl = document.getElementById('buscaTreinColabPeriodo');
        if (buscaEl) { buscaEl.value = buscaAtual; renderListaTreinColaboradoresPeriodo(); }
    } catch (err) {
        console.error('Erro ao excluir treinamento realizado:', err);
        alert('Falha ao excluir o registro: ' + err.message);
    }
}

// Mesma exclusão de excluirTreinamentoRealizado() acima, mas chamada a partir da aba
// "Histórico" (renderTreinHistLista) em vez de "Colaboradores no período" - por isso
// re-renderiza a tela de Histórico, não o painel inteiro. Motivo de existir: o usuário
// corrige lançamentos errados (ex: pessoa certa na data errada) direto de onde ele
// primeiro percebe o erro, sem precisar sair da aba pra achar a mesma pessoa em outro
// lugar.
async function excluirTreinamentoRealizadoHist(id) {
    if (!confirm('Excluir este lançamento de treinamento? Essa ação não pode ser desfeita.')) return;
    try {
        await supabaseDelete('treinamentos_realizados', id);
        allTreinamentosRealizados = allTreinamentosRealizados.filter(r => r.id !== id);
        renderTreinHistLista();
    } catch (err) {
        console.error('Erro ao excluir lançamento de treinamento (Histórico):', err);
        alert('Falha ao excluir o registro: ' + err.message);
    }
}

// ============================================
// EDITAR SESSÃO / ALTERAR DATA EM LOTE (TREINAMENTOS)
// Em conformidade com a NR-01 (subitem 1.7 - Capacitação e Treinamento em SST),
// permite corrigir a data de realização de todos os colaboradores daquela sessão,
// recalculando automaticamente o vencimento conforme a periodicidade do catálogo
// e unificando turmas caso a nova data já possua participantes.
// ============================================

function abrirModalEditarSessaoTreinamento(cod, data) {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('treinamentos')) return;

    const participantes = allTreinamentosRealizados.filter(r => String(r.treinamento_cod) === String(cod) && r.data_treinamento === data);
    if (!participantes.length) {
        alert('Nenhum colaborador encontrado para esta sessão.');
        return;
    }

    const cat = allTreinamentosCatalogo.find(c => String(c.id) === String(cod) || String(c.codigo) === String(cod));
    const nomeTreinamento = cat?.nome || participantes[0]?.treinamento_nome || ('Treinamento ' + cod);
    const meses = cat ? (cat.meses_validade ?? cat.periodicidade_meses ?? null) : null;

    const codEl = document.getElementById('editSessaoCod');
    const dataAntigaEl = document.getElementById('editSessaoDataAntiga');
    const nomeEl = document.getElementById('editSessaoTreinamentoNome');
    const codTxtEl = document.getElementById('editSessaoTreinamentoCod');
    const qtdEl = document.getElementById('editSessaoQtdParticipantes');
    const dataAtualEl = document.getElementById('editSessaoDataAtual');
    const novaDataInput = document.getElementById('novaDataSessaoTreinamento');
    const checkRecalcular = document.getElementById('recalcularValidadeTreinamento');
    const mesesTxtEl = document.getElementById('editSessaoMesesTxt');
    const valInfoEl = document.getElementById('editSessaoValidadeInfo');
    const avisoUnificacao = document.getElementById('editSessaoAvisoUnificacao');
    const statusEl = document.getElementById('editSessaoStatus');
    const btn = document.getElementById('btnConfirmarAlteracaoSessao');

    if (codEl) codEl.value = cod;
    if (dataAntigaEl) dataAntigaEl.value = data;
    if (nomeEl) nomeEl.textContent = nomeTreinamento;
    if (codTxtEl) codTxtEl.textContent = cod;
    if (qtdEl) qtdEl.textContent = participantes.length;
    if (dataAtualEl) dataAtualEl.textContent = formatSimpleDate(data);
    if (novaDataInput) novaDataInput.value = data;

    if (meses && Number(meses) > 0) {
        if (checkRecalcular) {
            checkRecalcular.checked = true;
            checkRecalcular.disabled = false;
        }
        if (mesesTxtEl) {
            mesesTxtEl.textContent = `Periodicidade do catálogo da NR: Reciclagem a cada ${meses} meses.`;
            mesesTxtEl.style.color = '#15803d';
        }
        if (valInfoEl) {
            valInfoEl.innerHTML = `🔄 <b>Norma Regulamentadora:</b> Treinamento periódico com validade de <b>${meses} meses</b>. O vencimento de todos os colaboradores será recalculado automaticamente para a nova data + ${meses} meses.`;
        }
    } else {
        if (checkRecalcular) {
            checkRecalcular.checked = false;
            checkRecalcular.disabled = true;
        }
        if (mesesTxtEl) {
            mesesTxtEl.textContent = 'Treinamento sem reciclagem periódica obrigatória cadastrada (curso avulso / sem validade).';
            mesesTxtEl.style.color = 'var(--text-light)';
        }
        if (valInfoEl) {
            valInfoEl.innerHTML = `ℹ️ Curso sem reciclagem periódica obrigatória cadastrada no catálogo.`;
        }
    }

    if (avisoUnificacao) avisoUnificacao.style.display = 'none';
    if (statusEl) statusEl.textContent = '';
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Alteração';
    }

    const modal = document.getElementById('modalEditarSessaoTreinamento');
    if (modal) modal.style.display = 'flex';
}

function fecharModalEditarSessaoTreinamento() {
    const modal = document.getElementById('modalEditarSessaoTreinamento');
    if (modal) modal.style.display = 'none';
}

function aoMudarNovaDataSessao() {
    const cod = document.getElementById('editSessaoCod')?.value;
    const dataAntiga = document.getElementById('editSessaoDataAntiga')?.value;
    const novaData = document.getElementById('novaDataSessaoTreinamento')?.value;
    const avisoEl = document.getElementById('editSessaoAvisoUnificacao');
    if (!avisoEl) return;

    if (!novaData || novaData === dataAntiga) {
        avisoEl.style.display = 'none';
        return;
    }

    const jaExistentes = allTreinamentosRealizados.filter(r => String(r.treinamento_cod) === String(cod) && r.data_treinamento === novaData);
    if (jaExistentes.length > 0) {
        const participantesAtuais = allTreinamentosRealizados.filter(r => String(r.treinamento_cod) === String(cod) && r.data_treinamento === dataAntiga);
        avisoEl.innerHTML = `<i class="fas fa-info-circle"></i> <b>Atenção (Unificação de Turma):</b> Já existem <b>${jaExistentes.length}</b> colaborador(es) lançados neste treinamento em <b>${formatSimpleDate(novaData)}</b>. Ao confirmar, os <b>${participantesAtuais.length}</b> participante(s) desta sessão serão unificados na mesma data, totalizando <b>${jaExistentes.length + participantesAtuais.length}</b> colaboradores.`;
        avisoEl.style.display = 'block';
    } else {
        avisoEl.style.display = 'none';
    }
}

async function confirmarAlteracaoDataSessao() {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('treinamentos')) return;

    const cod = document.getElementById('editSessaoCod')?.value;
    const dataAntiga = document.getElementById('editSessaoDataAntiga')?.value;
    const novaData = document.getElementById('novaDataSessaoTreinamento')?.value;
    const recalcular = !!document.getElementById('recalcularValidadeTreinamento')?.checked;
    const statusEl = document.getElementById('editSessaoStatus');
    const btn = document.getElementById('btnConfirmarAlteracaoSessao');

    if (!cod || !dataAntiga) {
        alert('Identificação da sessão inválida.');
        return;
    }

    if (!novaData) {
        if (statusEl) {
            statusEl.textContent = '⚠️ Selecione uma nova data para a sessão.';
            statusEl.style.color = 'var(--danger)';
        }
        return;
    }

    if (novaData === dataAntiga) {
        if (statusEl) {
            statusEl.textContent = '⚠️ A nova data é idêntica à data atual da sessão.';
            statusEl.style.color = 'var(--danger)';
        }
        return;
    }

    const afetados = allTreinamentosRealizados.filter(r => String(r.treinamento_cod) === String(cod) && r.data_treinamento === dataAntiga);
    if (afetados.length === 0) {
        alert('Nenhum registro encontrado para esta sessão. A lista pode ter sido atualizada.');
        fecharModalEditarSessaoTreinamento();
        return;
    }

    let cat = allTreinamentosCatalogo.find(c => String(c.id) === String(cod) || String(c.codigo) === String(cod));
    const mesesValidade = cat ? (cat.meses_validade ?? cat.periodicidade_meses ?? null) : null;

    let novaDataVencimento = null;
    if (recalcular && mesesValidade && Number(mesesValidade) > 0) {
        const d = parseLocalDate(novaData);
        const alvo = new Date(d.getFullYear(), d.getMonth() + Number(mesesValidade), d.getDate());
        novaDataVencimento = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    }
    if (statusEl) {
        statusEl.textContent = `⏳ Atualizando ${afetados.length} colaborador(es)...`;
        statusEl.style.color = 'var(--text-light)';
    }

    try {
        // 1. Atualizar public.treinamentos_realizados no Supabase via PATCH
        const payloadTrein = {
            data_treinamento: novaData
        };
        if (recalcular) {
            payloadTrein.data_proxima_reciclagem = novaDataVencimento;
        }

        const queryTrein = `treinamento_cod=eq.${encodeURIComponent(cod)}&data_treinamento=eq.${encodeURIComponent(dataAntiga)}`;
        await supabasePatch('treinamentos_realizados', queryTrein, payloadTrein);

        // 2. Sincronizar treinamentos_convocados (se houver lançamentos)
        try {
            await supabasePatch('treinamentos_convocados', queryTrein, { data_treinamento: novaData });
        } catch (errConv) {
            console.warn('Aviso ao sincronizar convocados:', errConv);
        }

        // 3. Sincronizar chave de anexos (anexos_sms) se houverem arquivos vinculados à sessão
        try {
            const queryAnexos = `tabela=eq.treinamentos_realizados&chave_registro=eq.${encodeURIComponent(cod + '||' + dataAntiga)}`;
            await supabasePatch('anexos_sms', queryAnexos, { chave_registro: `${cod}||${novaData}` });
        } catch (errAnexo) {
            console.warn('Aviso ao sincronizar anexos:', errAnexo);
        }

        // 4. Invalidar caches do sessionStorage
        invalidarCacheTabela('treinamentos_realizados');
        invalidarCacheTabela('treinamentos_convocados');
        invalidarCacheTabela('anexos_sms');

        // 5. Atualizar estado em memória
        allTreinamentosRealizados.forEach(r => {
            if (String(r.treinamento_cod) === String(cod) && r.data_treinamento === dataAntiga) {
                r.data_treinamento = novaData;
                if (recalcular) {
                    r.data_proxima_reciclagem = novaDataVencimento;
                }
            }
        });

        allTreinamentosConvocados.forEach(c => {
            if (String(c.treinamento_cod) === String(cod) && c.data_treinamento === dataAntiga) {
                c.data_treinamento = novaData;
            }
        });

        // 6. Fechar modal
        fecharModalEditarSessaoTreinamento();

        // 7. Notificação de sucesso
        const msgSucesso = `Sessão atualizada com sucesso para ${afetados.length} colaborador(es)!`;
        mostrarFeedbackToast(msgSucesso, 'sucesso');

        // 8. Re-renderizar as telas sem recarregar toda a página
        renderTreinHistLista();
        renderTreinamentosPanel();
        if (typeof onRegistroCodigoChange === 'function' && document.getElementById('registroCodigoInput')?.value) {
            onRegistroCodigoChange();
        }

    } catch (err) {
        console.error('Erro ao atualizar data da sessão de treinamento:', err);
        if (statusEl) {
            statusEl.textContent = '❌ Falha ao atualizar: ' + (err.message || 'Erro de conexão');
            statusEl.style.color = 'var(--danger)';
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Alteração';
        }
        alert('Erro ao atualizar a sessão: ' + (err.message || 'Verifique sua conexão.'));
    }
}


// ============================================
// IMPORTAÇÃO/EXPORTAÇÃO DA PLANILHA (CSV no formato atual)
// ============================================

function parseDataBR(str) {
    if (!str) return null;
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length < 4) return null;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Gera e baixa um CSV no MESMO formato (separador ";", datas DD/MM/AAAA) que os
// importadores desta página esperam de volta - existe pra dar segurança de reimportar
// depois de corrigir algo numa planilha (usuário relatou receio do arquivo ficar fora
// do formato esperado). Usa <a download> em vez de window.open - mesmo motivo já
// documentado pra Ficha de EPI, bloqueador de pop-up não pega esse padrão.
function baixarCSV(nomeArquivo, headers, linhas) {
    function escaparCampo(v) {
        const s = String(v ?? '');
        return (s.includes(';') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    const csv = [headers, ...linhas].map(linha => linha.map(escaparCampo).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// Mesmas colunas/ordem que importarTreinamentosCSV() lê de volta (MATRICULA;STATUS;
// NOME;FUNCAO;SETOR;COD;TREINAMENTO;CARGA_H;Data do Treinamento;Meses;Data da Próxima
// Reciclagem;Obs.) - corrigir e reenviar esse mesmo arquivo é seguro e idempotente.
async function exportarTreinamentosCSV() {
    if (allTreinamentosRealizados.length === 0) { treinamentosLoaded = true; await loadTreinamentosData(); }
    if (allTreinamentosRealizados.length === 0) { alert('Nenhum treinamento encontrado pra exportar.'); return; }
    // Coluna ID vai primeiro e não existe na planilha original do usuário - é assim que
    // importarTreinamentosCSV() reconhece "isso veio de uma exportação, reusa o id como
    // está" em vez de recalcular matricula_cod_data do zero (o que criaria uma linha
    // duplicada pra qualquer registro que já passou por "mesclar catálogo", já que o
    // código atual dele pode ser diferente do código usado quando o id foi gerado).
    const headers = ['ID', 'MATRICULA', 'STATUS', 'NOME', 'FUNCAO', 'SETOR', 'COD', 'TREINAMENTO', 'CARGA_H', 'Data do Treinamento', 'Meses', 'Data da Próxima Reciclagem', 'Obs.'];
    const linhas = allTreinamentosRealizados
        .slice()
        .sort((a, b) => (a.matricula || '').localeCompare(b.matricula || '') || (a.data_treinamento || '').localeCompare(b.data_treinamento || ''))
        .map(r => [
            r.id || '',
            r.matricula || '',
            r.status_colaborador || '',
            r.nome || '',
            r.funcao || '',
            r.setor || '',
            r.treinamento_cod || '',
            r.treinamento_nome || '',
            r.carga_horaria != null ? String(r.carga_horaria).replace('.', ',') : '',
            r.data_treinamento ? formatSimpleDate(r.data_treinamento) : '',
            r.meses_validade != null ? r.meses_validade : '',
            r.data_proxima_reciclagem ? formatSimpleDate(r.data_proxima_reciclagem) : '',
            r.observacoes || ''
        ]);
    baixarCSV('treinamentos_realizados.csv', headers, linhas);
}

// Mesmas colunas/ordem que importarEfetivoCSV() lê de volta.
async function exportarEfetivoCSV() {
    if (allEfetivo.length === 0) { efetivoLoaded = true; await loadEfetivoData(); }
    if (allEfetivo.length === 0) { alert('Nenhum colaborador encontrado pra exportar.'); return; }
    const headers = ['STATUS', 'MATRICULA', 'CPF', 'NOME', 'FUNCAO', 'SETOR', 'RESPONSAVEL', 'DT_ADMISSAO', 'DT_DEMISSAO', 'DT_NASCIMENTO', 'CIDADE', 'ESTADO', 'ESTABILIDADE', 'GHE', 'CALCA', 'CAMISA', 'BOTA', 'SEXO'];
    const linhas = allEfetivo
        .slice()
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        .map(e => [
            e.status || '',
            e.id || '',
            e.cpf || '',
            e.nome || '',
            e.funcao || '',
            e.setor || '',
            e.responsavel || '',
            e.dt_admissao ? formatSimpleDate(e.dt_admissao) : '',
            e.dt_demissao ? formatSimpleDate(e.dt_demissao) : '',
            e.dt_nascimento ? formatSimpleDate(e.dt_nascimento) : '',
            e.cidade || '',
            e.estado || '',
            e.estabilidade || '',
            e.ghe || '',
            e.calca || '',
            e.camisa || '',
            e.bota || '',
            e.sexo || ''
        ]);
    baixarCSV('efetivo.csv', headers, linhas);
}

async function importarTreinamentosCSV() {
    const input = document.getElementById('treinamentosFileInput');
    const statusEl = document.getElementById('treinamentosImportStatus');
    if (!input.files || !input.files[0]) {
        statusEl.textContent = '❌ Selecione um arquivo CSV primeiro.';
        return;
    }

    statusEl.textContent = 'Lendo arquivo...';
    try {
        const file = input.files[0];
        const rawText = await file.text();
        const text = rawText.replace(/^﻿/, ''); // remove BOM
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            statusEl.textContent = '❌ Arquivo vazio ou sem linhas de dados.';
            return;
        }

        const headers = lines[0].split(';').map(h => h.trim().toUpperCase());
        const idx = {};
        headers.forEach((h, i) => { idx[h] = i; });

        function col(parts, name) {
            const i = idx[name.toUpperCase()];
            return i !== undefined ? (parts[i] || '').trim() : '';
        }

        const catalogoMap = new Map();
        const realizadosMap = new Map();
        let puladas = 0;

        for (let li = 1; li < lines.length; li++) {
            const parts = lines[li].split(';');
            const matricula = col(parts, 'MATRICULA').toUpperCase();
            const treinamento = col(parts, 'TREINAMENTO');
            const dataTreino = parseDataBR(col(parts, 'Data do Treinamento'));

            if (!matricula || !treinamento || !dataTreino) {
                puladas++;
                continue;
            }

            // Nem toda sessão de DDS tem código atribuído na planilha (~3.700 linhas reais
            // da base atual estão nesse caso) - sem isso, essas sessões (com matrícula, nome
            // e data completos) eram descartadas do relatório de HHT por engano. Quando falta
            // o código, usa o próprio nome do treinamento, normalizado, como identificador.
            let cod = col(parts, 'COD');
            if (!cod) {
                cod = 'NOME_' + treinamento.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '_').slice(0, 60);
            }

            const cargaH = parseFloat((col(parts, 'CARGA_H') || '0').replace(',', '.')) || 0;
            const mesesStr = col(parts, 'Meses');
            const meses = mesesStr ? parseInt(mesesStr, 10) : null;
            const dataReciclagem = parseDataBR(col(parts, 'Data da Próxima Reciclagem'));

            if (!catalogoMap.has(cod)) {
                catalogoMap.set(cod, { id: cod, nome: treinamento, carga_horaria: cargaH, meses_validade: meses });
            }

            // Prefere um ID explícito na planilha quando presente (só existe nos arquivos
            // gerados por "Exportar planilha atual") - necessário porque um registro que já
            // passou por "mesclar catálogo" (código duplicado corrigido) tem o id antigo
            // baseado no código de ANTES da mesclagem, mas o treinamento_cod atual já é o
            // novo - recalcular o id do zero pelo cod atual criaria uma linha DUPLICADA em
            // vez de atualizar a existente. Planilhas originais (sem coluna ID) continuam
            // funcionando exatamente como antes.
            const id = col(parts, 'ID') || `${matricula}_${cod}_${dataTreino}`;
            realizadosMap.set(id, {
                id,
                matricula,
                nome: col(parts, 'NOME'),
                funcao: col(parts, 'FUNCAO'),
                setor: col(parts, 'SETOR'),
                status_colaborador: col(parts, 'STATUS'),
                treinamento_cod: cod,
                treinamento_nome: treinamento,
                carga_horaria: cargaH,
                data_treinamento: dataTreino,
                meses_validade: meses,
                data_proxima_reciclagem: dataReciclagem,
                observacoes: col(parts, 'Obs.')
            });
        }

        const catalogoArr = Array.from(catalogoMap.values());
        const realizadosArr = Array.from(realizadosMap.values());

        statusEl.textContent = `Enviando ${catalogoArr.length} tipos de treinamento...`;
        await supabaseUpsert('treinamentos_catalogo', catalogoArr);

        const BATCH_SIZE = 500;
        let enviados = 0;
        for (let i = 0; i < realizadosArr.length; i += BATCH_SIZE) {
            const batch = realizadosArr.slice(i, i + BATCH_SIZE);
            await supabaseUpsert('treinamentos_realizados', batch);
            enviados += batch.length;
            statusEl.textContent = `Enviando sessões... ${enviados}/${realizadosArr.length}`;
        }

        statusEl.textContent = `✅ Importação concluída! ${enviados} sessões e ${catalogoArr.length} tipos de treinamento importados/atualizados. ${puladas} linha(s) pulada(s) por dado incompleto (matrícula, código, treinamento ou data faltando).`;
        treinamentosLoaded = true;
        await loadTreinamentosData();
    } catch (err) {
        console.error('Erro ao importar planilha de treinamentos:', err);
        statusEl.textContent = '❌ Erro na importação: ' + err.message;
    }
}

// ============================================
// LANÇAMENTO EM MASSA DE TREINAMENTO - substitui o fluxo atual do usuário em Excel
// (digitar matrícula → nome/função/setor aparecem via VLOOKUP, digitar código →
// tema aparece, digitar data). Aqui: escolhe o treinamento (código com carga horária
// e validade já vindos do catálogo) e a data uma única vez, depois marca/desmarca
// presença numa lista - "carregar equipe do responsável" resolve o caso comum descrito
// pelo usuário (cada lista já é uma equipe fixa por encarregado, só tira quem faltou).
// ============================================

let lancTreinEquipe = new Map(); // matricula -> {nome, funcao, setor, checked}

// A página de Treinamentos é dividida em abas (Visão Geral/Lançar/Catálogo) - esse
// form vive sempre visível dentro da própria aba "Lançar", então essa função virou
// puramente um reset (chamada pelo botão "Novo Lançamento" e uma vez no carregamento
// inicial), não abre/fecha mais um card escondido.
// ============================================
// CRONOGRAMA DE TREINAMENTOS - mesa de planejamento (o que já foi realizado ou vai
// acontecer), mesmo modelo do "Plano Mensal de Treinamentos de SMS" em planilha que a
// equipe já usa. É só uma tabela de acompanhamento - não lida com impressão nem com
// quem participa (isso é tudo na aba Registro, ver "Nova Sessão" mais abaixo e
// gerarListasCronogramaMes). "Lançar Presença" fecha o ciclo gravando em
// treinamentos_realizados e marcando este item como 'lancado'. Não duplica
// treinamento_nome - resolve sempre ao vivo via allTreinamentosCatalogo (ver
// supabase_schema.sql).
// ============================================

function diaDaSemana(dataStr) {
    if (!dataStr) return '';
    return NOMES_DIAS_SEMANA[parseLocalDate(dataStr).getDay()];
}

function popularFiltroAnoCronograma() {
    const anos = new Set([new Date().getFullYear()]);
    allTreinamentosCronograma.forEach(c => { if (c.data_prevista) anos.add(parseLocalDate(c.data_prevista).getFullYear()); });
    popularSelectAnos('cronoFiltroAno', anos);
}

function onCronogramaFiltroChange() {
    cronogramaFiltroAno = document.getElementById('cronoFiltroAno').value;
    cronogramaFiltroMes = document.getElementById('cronoFiltroMes').value;
    renderCronogramaLista();
}

function setCronogramaFiltroStatus(status) {
    cronogramaFiltroStatus = status;
    ['btnFiltroCronoTodos', 'btnFiltroCronoPlanejado'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { '': 'btnFiltroCronoTodos', planejado: 'btnFiltroCronoPlanejado' };
    document.getElementById(map[status])?.classList.add('active');
    renderCronogramaLista();
}

// Limpa mês/ano e volta pro padrão "Planejado" (mesmo estado de quando a aba abre) -
// diferente do padrão de abrir já no mês atual (ver comentário de cronogramaFiltroAno),
// aqui é uma ação explícita do usuário pra ver o cronograma planejado inteiro, sem
// recorte de período.
function limparFiltroCronograma() {
    cronogramaFiltroAno = '';
    cronogramaFiltroMes = '';
    document.getElementById('cronoFiltroAno').value = '';
    document.getElementById('cronoFiltroMes').value = '';
    setCronogramaFiltroStatus('planejado');
}

function cronogramaItensFiltrados() {
    let itens = allTreinamentosCronograma.slice();
    if (cronogramaFiltroAno) {
        itens = itens.filter(c => c.data_prevista && parseLocalDate(c.data_prevista).getFullYear() === parseInt(cronogramaFiltroAno, 10));
        if (cronogramaFiltroMes !== '') {
            itens = itens.filter(c => parseLocalDate(c.data_prevista).getMonth() === parseInt(cronogramaFiltroMes, 10));
        }
    }
    if (cronogramaFiltroStatus) itens = itens.filter(c => (c.status || 'planejado') === cronogramaFiltroStatus);
    return itens.sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));
}

// Imprime só o CRONOGRAMA em si (data/treinamento/horário/local/responsável, do filtro
// atual da tela) - um documento de planejamento simples, bem diferente do Registro de
// Treinamento (FOR.001, formulário oficial de presença/assinatura, gerado na aba
// Registro a partir de uma sessão específica). Pedido explícito do usuário depois de
// remover os atalhos de imprimir/lançar por item: Cronograma precisa continuar podendo
// imprimir, mas só a lista do plano, não um documento de presença.
function imprimirCronogramaFiltro() {
    const catalogoPorId = new Map(allTreinamentosCatalogo.map(c => [c.id, c]));
    const itens = cronogramaItensFiltrados();
    if (itens.length === 0) {
        alert('Nenhum item de cronograma neste filtro pra imprimir.');
        return;
    }

    const periodoLabel = cronogramaFiltroAno
        ? (cronogramaFiltroMes !== '' ? `${NOMES_MESES[parseInt(cronogramaFiltroMes, 10)]}/${cronogramaFiltroAno}` : `Ano ${cronogramaFiltroAno}`)
        : 'Todos os períodos';
    const statusLabel = cronogramaFiltroStatus === 'planejado' ? ' — Planejado' : '';

    const linhas = itens.map(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const nome = cat ? cat.nome : c.treinamento_cod;
        const lancado = c.status === 'lancado';
        return `<tr>
            <td>${formatSimpleDate(c.data_prevista)}</td>
            <td>${escapeHTML(diaDaSemana(c.data_prevista) || '')}</td>
            <td>[${escapeHTML(c.treinamento_cod)}] ${escapeHTML(nome)}</td>
            <td style="text-align:center;">${escapeHTML(c.horario || '—')}</td>
            <td>${escapeHTML(c.local || '—')}</td>
            <td>${escapeHTML(c.responsavel || '—')}</td>
            <td style="text-align:center;">${lancado ? '✅ Lançado' : '🕓 Planejado'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Cronograma de Treinamentos - ${escapeHTML(periodoLabel)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    .folha { max-width: 1100px; margin: 0 auto; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .cabecalho img { max-height: 44px; object-fit: contain; margin-right: 14px; }
    .cabecalho .titulo h1 { font-size: 16px; margin: 0; }
    .cabecalho .titulo p { font-size: 12px; margin: 2px 0 0; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000; padding: 5px 7px; font-size: 11px; }
    th { background: #e5e5e5; text-align: left; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP">
            <div class="titulo">
                <h1>CRONOGRAMA DE TREINAMENTOS</h1>
                <p>${escapeHTML(periodoLabel)}${statusLabel} — ${itens.length} item(ns) — emitido em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
        <table>
            <thead>
                <tr><th>Data</th><th>Dia</th><th>Treinamento</th><th>Horário</th><th>Local</th><th>Responsável</th><th>Status</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>
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
}

let pastasCronogramaDriveCache = {};
try {
    const savedPastas = localStorage.getItem('pastas_cronograma_drive_cache');
    if (savedPastas) pastasCronogramaDriveCache = JSON.parse(savedPastas);
} catch (_) {}

function renderCronogramaLista() {
    const container = document.getElementById('cronogramaLista');
    if (!container) return;

    popularFiltroAnoCronograma();
    const anoSel = document.getElementById('cronoFiltroAno');
    const mesSel = document.getElementById('cronoFiltroMes');
    if (anoSel && !anoSel.dataset.inicializado) { anoSel.value = cronogramaFiltroAno; anoSel.dataset.inicializado = '1'; }
    if (mesSel && !mesSel.dataset.inicializado) { mesSel.value = cronogramaFiltroMes; mesSel.dataset.inicializado = '1'; }

    const catalogoPorId = new Map(allTreinamentosCatalogo.map(c => [c.id, c]));
    const itens = cronogramaItensFiltrados();

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum item de cronograma neste filtro.</div>';
        return;
    }
    container.innerHTML = itens.map(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const nome = cat ? cat.nome : c.treinamento_cod;
        const lancado = c.status === 'lancado';
        const statusBadge = lancado
            ? '<span class="badge" style="background:#e6f7ee; color:#1a7f4b; border:1px solid #b8e6cc;">✅ Realizado</span>'
            : '<span class="badge" style="background:#fff9e6; color:#b78a00; border:1px solid #ffe8a1;">🕓 Planejado</span>';
        const detalhes = [
            diaDaSemana(c.data_prevista),
            c.horario || null,
            c.local || null,
            c.responsavel ? `Resp.: ${escapeHTML(c.responsavel)}` : null
        ].filter(Boolean).map(escapeHTML).join(' — ');

        const diaPrefixo = c.data_prevista && c.data_prevista.includes('-')
            ? `${c.data_prevista.split('-')[2]}/${c.data_prevista.split('-')[1]}`
            : '';
        const pastaMapeadaUrl = pastasCronogramaDriveCache[c.id] || 
                               (diaPrefixo && c.treinamento_cod ? pastasCronogramaDriveCache[`${diaPrefixo}_${c.treinamento_cod}`] : null);

        const btnPastaDrive = pastaMapeadaUrl
            ? `<a href="${pastaMapeadaUrl}" target="_blank" rel="noopener noreferrer" class="db-clear-btn" style="color:#0284c7; border-color:#0284c7; background:#e0f2fe; display:inline-flex; align-items:center; gap:5px; text-decoration:none; font-weight:700;" title="Abrir pasta deste treinamento no Google Drive">📁 Pasta Drive ↗</a>`
            : `<button class="db-clear-btn" style="color:#0284c7; border-color:#bae6fd; background:#f0f9ff; display:inline-flex; align-items:center; gap:5px;" onclick="abrirPastaFotosOperacional('01_Treinamentos', '${escapeHTML(c.data_prevista)}', '${escapeHTML(nome || c.treinamento_cod)}')" title="Acessar ou preparar pasta de fotos e evidências no Google Drive">📷 Pasta Drive</button>`;

        return `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; min-width:220px;">
                <div class="db-list-item-title">${formatSimpleDate(c.data_prevista)} — [${escapeHTML(c.treinamento_cod)}] ${escapeHTML(nome)}</div>
                <div class="db-list-item-sub">${detalhes || 'Sem horário/local definido'}${c.observacoes ? ' — ' + escapeHTML(c.observacoes) : ''}</div>
            </div>
            ${statusBadge}
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${btnPastaDrive}
                ${!lancado ? `<button class="db-apply-btn" onclick="lancarPresencaDoCronograma('${escapeHTML(c.id)}')" title="Leva pra Lançar Treinamento já preenchido - marca este item como lançado ao salvar">✅ Lançar Presença</button>` : ''}
                ${!lancado ? `<button class="db-clear-btn" onclick="abrirFormCronograma('${escapeHTML(c.id)}')">✏️ Editar</button>
                <button class="db-clear-btn" onclick="abrirModalReprogramarCronograma('${escapeHTML(c.id)}')">🔄 Reprogramar Data</button>` : ''}
                ${!lancado ? `<button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirItemCronograma('${escapeHTML(c.id)}')">🗑️ Excluir</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

/**
 * Automação de sincronização recursiva da árvore de pastas do Cronograma no Google Drive
 * Cria e mapeia: [Pasta Raiz] -> [Ano] -> [Mês (ex: 10 - Outubro)] -> [Subpastas: [DD/MM] COD - TEMA]
 */
async function sincronizarPastasDriveCronograma(anoParam, mesParam) {
    let ano = anoParam || document.getElementById('cronoFiltroAno')?.value;
    let mes = (mesParam !== undefined && mesParam !== null && mesParam !== '') ? String(mesParam) : document.getElementById('cronoFiltroMes')?.value;
    const hoje = new Date();

    if (!ano) ano = String(hoje.getFullYear());

    // Se o mês estiver vazio ("Mês específico..."), abre diálogo interativo para escolha
    if (mes === '' || mes === undefined || mes === null) {
        if (typeof Swal !== 'undefined') {
            const mesAtualIdx = hoje.getMonth();
            const mesesOptions = NOMES_MESES.map((nome, i) => 
                `<option value="${i}" ${i === mesAtualIdx ? 'selected' : ''}>${String(i + 1).padStart(2, '0')} - ${nome}</option>`
            ).join('');

            const { value: formValues } = await Swal.fire({
                title: '📁 Sincronizar Pastas no Drive',
                html: `
                    <p style="font-size:13px; color:#475569; margin-bottom:14px; line-height:1.5;">
                        Selecione o período para criar e sincronizar a árvore de pastas de treinamentos no Google Drive:
                    </p>
                    <div style="display:flex; flex-direction:column; gap:10px; text-align:left; font-size:12.5px;">
                        <div>
                            <label style="display:block; font-weight:600; color:#334155; margin-bottom:4px;">Ano:</label>
                            <input id="swalCronoAno" type="number" class="swal2-input" value="${ano}" style="margin:0; width:100%; box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block; font-weight:600; color:#334155; margin-bottom:4px;">Mês:</label>
                            <select id="swalCronoMes" class="swal2-select" style="margin:0; width:100%; box-sizing:border-box;">
                                ${mesesOptions}
                            </select>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Sincronizar no Google Drive',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#0284c7',
                cancelButtonColor: '#64748b',
                preConfirm: () => {
                    const a = document.getElementById('swalCronoAno')?.value;
                    const m = document.getElementById('swalCronoMes')?.value;
                    if (!a || m === '') {
                        Swal.showValidationMessage('Por favor informe o ano e o mês.');
                        return false;
                    }
                    return { ano: a, mes: m };
                }
            });

            if (!formValues) return;
            ano = formValues.ano;
            mes = formValues.mes;
        } else {
            mes = String(hoje.getMonth());
        }
    }

    const mesNum = parseInt(mes, 10);
    const nomeMes = NOMES_MESES[mesNum] || 'Mês';
    const nomeMesPasta = `${String(mesNum + 1).padStart(2, '0')} - ${nomeMes}`;

    // Garante que cronograma e catálogo estejam disponíveis
    if (!allTreinamentosCronograma || allTreinamentosCronograma.length === 0) {
        try {
            allTreinamentosCronograma = await supabaseFetch('treinamentos_cronograma', '?select=*') || [];
        } catch (_) {}
    }
    if (!allTreinamentosCatalogo || allTreinamentosCatalogo.length === 0) {
        try {
            allTreinamentosCatalogo = await supabaseFetch('treinamentos_catalogo', '?select=*') || [];
        } catch (_) {}
    }

    // Filtra itens do cronograma no período
    const itensMes = (allTreinamentosCronograma || []).filter(c => {
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d.getFullYear() === parseInt(ano, 10) && d.getMonth() === mesNum;
    });

    if (itensMes.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Nenhum Treinamento no Cronograma',
                html: `
                    <p style="font-size:13px; color:#475569; line-height:1.5;">
                        Não encontramos nenhum treinamento previsto no cronograma para <strong>${nomeMes} de ${ano}</strong>.
                    </p>
                    <p style="font-size:12px; color:#64748b; margin-top:8px;">
                        Cadastre os itens previstos do mês na aba <strong>🗓️ Cronograma</strong> antes de sincronizar as pastas no Drive.
                    </p>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#0284c7'
            });
        } else {
            alert(`Nenhum treinamento cadastrado no cronograma para ${nomeMes}/${ano}.`);
        }
        return;
    }

    // Cruza itens do cronograma com o catálogo
    const catalogoPorId = new Map((allTreinamentosCatalogo || []).map(c => [String(c.id), c]));
    const temasPayload = itensMes.map(item => {
        const cat = catalogoPorId.get(String(item.treinamento_cod));
        const temaNome = cat ? cat.nome : (item.treinamento_nome || item.treinamento_cod);
        const dStr = String(item.data_prevista || '');
        let diaStr = '';
        if (dStr) {
            const partes = dStr.split('-');
            if (partes.length === 3) {
                diaStr = `${partes[2]}/${partes[1]}`;
            }
        }
        return {
            id: item.id,
            dia: diaStr || `${String(mesNum + 1).padStart(2, '0')}`,
            codigo: String(item.treinamento_cod || ''),
            tema: temaNome
        };
    });

    const webhookUrl = getDriveGasWebhookUrl();
    if (!webhookUrl) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Web App não configurado',
                html: `
                    <p style="font-size:13px; color:#475569; line-height:1.5;">
                        A <b>URL do Web App Apps Script</b> não está configurada no painel.
                    </p>
                    <p style="font-size:12px; color:#64748b; margin-top:8px;">
                        Abra as configurações do Google Drive e configure a URL do seu aplicativo da Web implantado.
                    </p>
                `,
                showCancelButton: true,
                confirmButtonText: '⚙️ Abrir Configurações',
                cancelButtonText: 'Fechar',
                confirmButtonColor: '#0284c7'
            }).then(r => {
                if (r.isConfirmed) abrirModalConfigGoogleDrive();
            });
        } else {
            alert('URL do Web App do Google Apps Script não configurada.');
        }
        return;
    }

    const pastaRaizId = getDriveFolderTreinamentosId();

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Sincronizando árvore de pastas...',
            html: `
                <p style="font-size:12.5px; color:#64748b; margin-bottom:10px; line-height:1.5;">
                    Criando e verificando diretórios para <strong>${escapeHTML(nomeMesPasta)} / ${ano}</strong> no Google Drive:
                </p>
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px; font-size:12px; color:#0369a1; text-align:left; max-height:150px; overflow-y:auto; line-height:1.6;">
                    ${temasPayload.map(t => `<div>📁 [${t.dia}] ${t.codigo ? t.codigo + ' - ' : ''}${escapeHTML(t.tema)}</div>`).join('')}
                </div>
                <div style="font-size:11.5px; color:#0284c7; font-weight:600; margin-top:10px;">
                    Total: ${temasPayload.length} subpasta(s) de treinamentos
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        const resp = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'criarEstruturaCronograma',
                pastaRaizId: pastaRaizId,
                ano: String(ano),
                mes: nomeMesPasta,
                temas: temasPayload
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
            throw new Error(`Servidor respondeu com código HTTP ${resp.status}`);
        }

        const resJson = await resp.json().catch(() => null);
        if (!resJson || resJson.status === 'erro') {
            throw new Error(resJson?.message || 'Falha ao processar criação de pastas no Apps Script');
        }

        const pastasRetornadas = Array.isArray(resJson.pastas) ? resJson.pastas : [];
        pastasRetornadas.forEach(p => {
            if (p.id) pastasCronogramaDriveCache[p.id] = p.folderUrl;
            if (p.codigo && p.dia) pastasCronogramaDriveCache[`${p.dia}_${p.codigo}`] = p.folderUrl;
        });

        try {
            localStorage.setItem('pastas_cronograma_drive_cache', JSON.stringify(pastasCronogramaDriveCache));
        } catch (_) {}

        if (typeof renderCronogramaLista === 'function') {
            renderCronogramaLista();
        }

        if (typeof Swal !== 'undefined') {
            const listaHtml = pastasRetornadas.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 10px; border-bottom:1px solid #e2e8f0; font-size:11.5px;">
                    <span style="font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:75%;" title="${escapeHTML(p.nomePasta)}">
                        📁 ${escapeHTML(p.nomePasta)}
                    </span>
                    <a href="${p.folderUrl}" target="_blank" rel="noopener noreferrer" style="color:#0284c7; text-decoration:none; font-weight:700; font-size:11.5px; white-space:nowrap;">
                        Abrir ↗
                    </a>
                </div>
            `).join('');

            const linkPastaMes = resJson.pastaMesUrl || `https://drive.google.com/drive/folders/${resJson.pastaMesId || pastaRaizId}`;

            Swal.fire({
                icon: 'success',
                title: 'Pastas Sincronizadas no Drive!',
                html: `
                    <p style="font-size:12.5px; color:#475569; margin-bottom:10px;">
                        A árvore de pastas para <strong>${escapeHTML(nomeMesPasta)} / ${ano}</strong> foi criada e verificada no Google Drive:
                    </p>
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; max-height:190px; overflow-y:auto; margin-bottom:14px; text-align:left;">
                        ${listaHtml || '<div style="padding:10px; color:#64748b;">Nenhuma subpasta individual.</div>'}
                    </div>
                    <div style="text-align:center;">
                        <a href="${linkPastaMes}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:#0284c7; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:700; font-size:12.5px; box-shadow:0 2px 4px rgba(2,132,199,0.25);">
                            <i class="fab fa-google-drive"></i> Abrir Pasta do Mês no Drive ↗
                        </a>
                    </div>
                `,
                confirmButtonText: 'Fechar',
                confirmButtonColor: '#64748b'
            });
        } else {
            alert(`Sucesso! ${pastasRetornadas.length} pastas de treinamentos sincronizadas no Google Drive.`);
        }

    } catch (err) {
        console.error('Erro na sincronização de pastas do cronograma no Drive:', err);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Erro na Sincronização',
                html: `
                    <p style="font-size:13px; color:#dc2626; line-height:1.5;">
                        Não foi possível completar a sincronização no Google Drive.
                    </p>
                    <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:8px 10px; font-size:11.5px; color:#991b1b; margin-top:8px; text-align:left; border-radius:4px;">
                        ${escapeHTML(err.message)}
                    </div>
                    <p style="font-size:11px; color:#64748b; margin-top:10px;">
                        Dica: Certifique-se de que o Web App Apps Script foi implantado como "Qualquer pessoa" (Anyone) com o script atualizado.
                    </p>
                `,
                confirmButtonColor: '#0284c7'
            });
        } else {
            alert('Erro ao sincronizar pastas no Drive: ' + err.message);
        }
    }
}
window.sincronizarPastasDriveCronograma = sincronizarPastasDriveCronograma;

function limparFormCronograma() {
    document.getElementById('cronoForm_id').value = '';
    document.getElementById('cronoForm_data').value = '';
    document.getElementById('cronoForm_treinamento').value = '';
    document.getElementById('cronoForm_horario').value = '';
    document.getElementById('cronoForm_local').value = '';
    document.getElementById('cronoForm_frente').value = '';
    document.getElementById('cronoForm_obs').value = '';
    document.getElementById('cronoForm_btnSalvar').textContent = '➕ Adicionar ao Cronograma';
    document.getElementById('cronoFormStatus').textContent = '';
}

// Formulário de adicionar/editar fica oculto até o usuário pedir de propósito ("➕ Novo
// Item" ou "✏️ Editar" num item existente) - antes ficava sempre aberto no topo da aba,
// disputando espaço com a lista (que é o conteúdo principal de um cronograma de
// verdade). Sem id = modo "novo item"; com id = modo edição.
function abrirFormCronograma(id) {
    const form = document.getElementById('cronogramaFormCard');
    const titulo = document.getElementById('cronogramaFormTitle');
    limparFormCronograma();

    if (id) {
        const c = allTreinamentosCronograma.find(x => x.id === id);
        if (!c) return;
        const cat = allTreinamentosCatalogo.find(x => x.id === c.treinamento_cod);
        titulo.textContent = '✏️ Editar Item do Cronograma';
        document.getElementById('cronoForm_id').value = c.id;
        document.getElementById('cronoForm_data').value = c.data_prevista || '';
        document.getElementById('cronoForm_treinamento').value = cat ? `${cat.id} - ${cat.nome}` : (c.treinamento_cod || '');
        document.getElementById('cronoForm_horario').value = c.horario || '';
        document.getElementById('cronoForm_local').value = c.local || '';
        document.getElementById('cronoForm_frente').value = c.responsavel || '';
        document.getElementById('cronoForm_obs').value = c.observacoes || '';
        document.getElementById('cronoForm_btnSalvar').textContent = '💾 Salvar Alteração';
    } else {
        titulo.textContent = '➕ Novo Item do Cronograma';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormCronograma() {
    limparFormCronograma();
    document.getElementById('cronogramaFormCard').style.display = 'none';
}

async function salvarItemCronograma() {
    const statusEl = document.getElementById('cronoFormStatus');
    const data = document.getElementById('cronoForm_data').value;
    const codigo = extrairCodigoTreinamento(document.getElementById('cronoForm_treinamento').value);
    const horario = document.getElementById('cronoForm_horario').value;
    const local = document.getElementById('cronoForm_local').value.trim();
    const frente = document.getElementById('cronoForm_frente').value.trim();
    const obs = document.getElementById('cronoForm_obs').value.trim();

    if (!data) {
        statusEl.textContent = '❌ Informe a data.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) {
        statusEl.textContent = '❌ Informe um treinamento válido do catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const editandoId = document.getElementById('cronoForm_id').value;
    const existente = editandoId ? allTreinamentosCronograma.find(c => c.id === editandoId) : null;

    // REGRA DE OURO: Bloquear duplicidade de código no mesmo mês
    const dNova = parseLocalDate(data);
    const anoNova = dNova.getFullYear();
    const mesNova = dNova.getMonth();

    const duplicadoNoMes = (allTreinamentosCronograma || []).find(c => {
        if (c.id === editandoId) return false;
        if (!c.data_prevista) return false;
        const d = parseLocalDate(c.data_prevista);
        return d.getFullYear() === anoNova && d.getMonth() === mesNova && String(c.treinamento_cod).trim() === String(codigo).trim();
    });

    if (duplicadoNoMes) {
        statusEl.textContent = `❌ O treinamento "${cat.nome}" já está agendado neste mês no dia ${formatSimpleDate(duplicadoNoMes.data_prevista)}!`;
        statusEl.style.color = 'var(--danger)';
        alert(`⚠️ BLOQUEIO DE DUPLICIDADE!\n\nO treinamento "[${cat.id}] ${cat.nome}" já está agendado neste mesmo mês para o dia ${formatSimpleDate(duplicadoNoMes.data_prevista)}.\n\nPara garantir variedade e evitar sobrecarga pedagógica, não é permitido agendar o mesmo tema mais de uma vez no mesmo mês.`);
        return;
    }
    const row = {
        id: editandoId || ('crono_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        data_prevista: data,
        treinamento_cod: codigo,
        horario: horario || null,
        local: local || null,
        responsavel: frente || null,
        status: existente ? (existente.status || 'planejado') : 'planejado',
        observacoes: obs || null,
        lancado_em: existente ? (existente.lancado_em || null) : null
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_cronograma', [row]);
        const idx = allTreinamentosCronograma.findIndex(c => c.id === row.id);
        if (idx >= 0) allTreinamentosCronograma[idx] = row; else allTreinamentosCronograma.push(row);
        statusEl.textContent = editandoId ? '✅ Item atualizado.' : '✅ Adicionado ao cronograma.';
        statusEl.style.color = 'var(--success)';
        renderCronogramaLista();
        // Atraso pra mensagem de sucesso ficar visível antes de fechar/limpar. Editar
        // fecha o formulário (a edição terminou); adicionar só limpa os campos e deixa
        // aberto, pra continuar lançando vários itens seguidos numa sessão de
        // planejamento sem precisar reabrir o formulário a cada linha.
        setTimeout(() => { if (editandoId) fecharFormCronograma(); else limparFormCronograma(); }, 1200);
    } catch (err) {
        console.error('Erro ao salvar item do cronograma:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function excluirItemCronograma(id) {
    const c = allTreinamentosCronograma.find(x => x.id === id);
    if (!c || c.status === 'lancado') return;
    const cat = allTreinamentosCatalogo.find(x => x.id === c.treinamento_cod);
    if (!confirm(`Excluir "${cat ? cat.nome : c.treinamento_cod}" (${formatSimpleDate(c.data_prevista)}) do cronograma? Essa ação não pode ser desfeita.`)) return;
    try {
        await supabaseDelete('treinamentos_cronograma', id);
        allTreinamentosCronograma = allTreinamentosCronograma.filter(x => x.id !== id);
        renderCronogramaLista();
        if (typeof renderPlanoAnualTreinamento === 'function') renderPlanoAnualTreinamento();
    } catch (err) {
        console.error('Erro ao excluir item do cronograma:', err);
        alert('❌ Falha ao excluir: ' + err.message);
    }
}

// Monta a equipe da frente igual "Carregar equipe do Responsável" (Lançar Treinamento) -
// reaproveitado tanto aqui quanto na impressão em lote (gerarListasCronogramaMes).
function equipeDaFrente(responsavel) {
    if (!responsavel) return [];
    return allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === responsavel)
        .map(e => ({ matricula: e.id, nome: e.nome, funcao: e.funcao }))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

// Todas as frentes ativas hoje (mesmo conjunto que já alimenta o select de "Carregar
// equipe do Responsável" em Lançar Treinamento/Nova Sessão) - usado pra gerar uma lista
// por frente pra um mesmo tema, já que um treinamento pode precisar ir pra várias
// equipes (confirmado com o usuário: "uma lista por frente, pra cada tema").
function todasFrentesAtivas() {
    const frentes = new Set();
    allEfetivo.forEach(e => { if (colaboradorEstaAtivo(e) && e.responsavel) frentes.add(e.responsavel); });
    return Array.from(frentes).sort();
}

// Resolve um nome de frente pro seu "nome atual", caso tenha sido mesclado em
// "🔗 Mesclar frente antiga com uma atual" (ex: 'WILLIAMS' -> 'ADEILTON MONTEIRO'). Se não
// tiver mesclagem cadastrada, devolve o próprio nome sem alteração. NUNCA muda o dado
// original no banco - só agrupa na hora de montar a tabela/relatório.
function resolverFrenteDds(nome) {
    const alias = allDdsFrentesAlias.find(a => a.id === nome);
    return alias ? alias.frente_atual : nome;
}

// Frentes que entram no "Controle de DDS por Frente" (tela + relatório mensal/semanal
// impresso) - por padrão todas as frentes de todasFrentesAtivas() entram (sem registro em
// dds_frentes_config = ativa), mas o usuário pode desmarcar uma frente administrativa que
// quase nunca faz DDS em "⚙️ Gerenciar frentes desta tabela", ou adicionar uma frente extra
// que ainda não tem colaborador cadastrado em Efetivo. NÃO afeta o combo "Carregar equipe
// do Responsável" de Treinamento, nem o "Lançar Semana Inteira"/imprimir ficha do DDS -
// só a contabilidade/relatório.
function frentesAtivasDds() {
    const config = new Map(allDdsFrentesConfig.map(c => [c.id, c.ativo !== false]));
    const todas = new Set(todasFrentesAtivas().map(resolverFrenteDds));
    allDdsFrentesConfig.forEach(c => todas.add(resolverFrenteDds(c.id)));
    return Array.from(todas).filter(f => (config.has(f) ? config.get(f) : true)).sort();
}

const CRONOGRAMA_DEFAULTS_SESSAO = {
    instrutor_nome: 'MARIA GESSICA DA SILVA ROQUE',
    instrutor_qualificacao: 'TEC. SEG. TRABALHO',
    instrutor_registro: 'MTE: 15760/PE',
    responsavel_tecnico_nome: 'JOÃO EVERTON DE SOUZA LIMEIRA',
    responsavel_tecnico_qualificacao: 'ENG. SEG. TRABALHO',
    responsavel_tecnico_registro: 'CREA: 0522078320'
};

// Leva pra aba "Lançar Treinamento" já com treinamento/data/equipe pré-preenchidos a
// partir do item do cronograma (equipe derivada ao vivo da frente, mesmo padrão de
// "Carregar equipe do Responsável"), e guarda o id em cronogramaOrigemId pra
// salvarLancamentoTreinamento() marcar este item como 'lancado' ao salvar com sucesso.
function lancarPresencaDoCronograma(id) {
    const c = allTreinamentosCronograma.find(x => x.id === id);
    if (!c) return;
    const cat = allTreinamentosCatalogo.find(x => x.id === c.treinamento_cod);

    showTreinSubtab('lancar');
    abrirFormLancarTreinamento();

    document.getElementById('lancTreinCodigo').value = cat ? `${cat.id} - ${cat.nome}` : c.treinamento_cod;
    onLancTreinCodigoChange();
    document.getElementById('lancTreinData').value = c.data_prevista || '';

    if (c.responsavel) {
        document.getElementById('lancTreinResponsavel').value = c.responsavel;
        carregarEquipeResponsavel();
    }

    cronogramaOrigemId = id;
}

// Imprime todas as sessões 'planejado' do filtro de mês/ano da aba Registro num único
// documento (uma folha por sessão, separadas por quebra de página) - pro dia de
// planejamento quinzenal em que várias sessões do mês são impressas de uma vez só.
async function gerarListasCronogramaMes() {
    await garantirDocumentosControleCarregados();
    const catalogoPorId = new Map(allTreinamentosCatalogo.map(c => [c.id, c]));

    // Um mesmo tema costuma ir pra várias frentes (confirmado com o usuário: "uma lista
    // por frente, pra cada tema") - por isso cada item do cronograma vira uma folha POR
    // FRENTE ativa, não uma folha só. Em escala real (ex: 9 temas × 12 frentes) isso gera
    // bastante página, então confirma antes de montar tudo. Com um subconjunto de frentes
    // marcado no filtro, gera só pra elas (ex: "todos os temas pra um encarregado só").
    // Checado ANTES da checagem de itens abaixo: com todas as frentes desmarcadas,
    // itensLoteCronogramaFiltrados() também pode dar vazio (nenhum item "geral" no filtro
    // de mês/tema atual) - sem essa ordem, o aviso genérico de "nenhum item selecionado"
    // apareceria no lugar do aviso específico de frente, escondendo a causa real.
    const frentes = Array.from(registroLoteFrentesSelecionadas);
    if (frentes.length === 0) {
        alert(todasFrentesAtivas().length === 0
            ? 'Nenhuma frente cadastrada em Efetivo (campo Responsável). Cadastre as frentes antes de gerar em lote.'
            : 'Nenhuma frente selecionada - marque ao menos uma frente antes de gerar.');
        return;
    }

    const todosFiltrados = itensLoteCronogramaFiltrados();
    const selecionados = registroLoteSelecionados || new Set(todosFiltrados.map(c => c.id));
    const itens = todosFiltrados.filter(c => selecionados.has(c.id));

    if (itens.length === 0) {
        alert('Nenhum item selecionado pra imprimir. Marque ao menos um item na prévia acima (ou ajuste o filtro de mês/ano/tema).');
        return;
    }
    const totalFolhas = itens.length * frentes.length;
    if (!confirm(`Isso vai gerar ${totalFolhas} lista(s) num único documento (${itens.length} tema(s) × ${frentes.length} frente(s)). Continuar?`)) return;

    const combinacoes = [];
    itens.forEach(c => frentes.forEach(frente => combinacoes.push({ c, frente })));

    const folhas = combinacoes.map(({ c, frente }, i) => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const sessaoRows = equipeDaFrente(frente);
        const campos = { ...CRONOGRAMA_DEFAULTS_SESSAO, hora_inicio: c.horario || null, local_realizacao: c.local || null, encarregado_responsavel: frente };
        const folha = construirFolhaRegistroTreinamento(sessaoRows, campos, c.treinamento_cod, cat, c.data_prevista);
        registrarEmissaoDocumento('registro_treinamento', `${cat ? cat.nome : c.treinamento_cod} — ${formatSimpleDate(c.data_prevista)} — ${frente}`);
        return i < combinacoes.length - 1 ? `<div class="quebra-pagina">${folha}</div>` : folha;
    }).join('');

    const tituloPeriodo = registroLoteFiltroMes !== ''
        ? `${NOMES_MESES[parseInt(registroLoteFiltroMes, 10)]}/${registroLoteFiltroAno}`
        : (registroLoteFiltroAno || 'Todos os períodos');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Listas de Presença do Cronograma - ${escapeHTML(tituloPeriodo)}</title>
<style>${REGISTRO_TREINAMENTO_CSS}</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${folhas}
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
}

function abrirFormLancarTreinamento() {
    document.getElementById('lancTreinCodigo').value = '';
    const lancTreinDataEl = document.getElementById('lancTreinData');
    lancTreinDataEl.value = new Date().toISOString().split('T')[0];
    // Data nasce preenchida com hoje (valor padrão de conveniência, não uma escolha do
    // usuário) - por isso zera a flag de edição manual aqui, senão
    // onLancTreinCodigoChange() nunca autopreencheria a partir do Cronograma (o campo
    // nunca fica vazio de verdade, sempre tem "hoje" no lugar).
    delete lancTreinDataEl.dataset.editadoManualmente;
    document.getElementById('lancTreinInfo').style.display = 'none';
    document.getElementById('lancTreinStatus').textContent = '';
    document.getElementById('lancTreinAddColab').value = '';
    document.getElementById('lancTreinAddColabResults').innerHTML = '';
    document.getElementById('lancTreinResponsavel').value = '';

    popularCatalogoDatalist();
    popularResponsavelSelect();

    lancTreinEquipe = new Map();
    renderListaPresencaEquipe();

    // Só uma chamada vinda de lancarPresencaDoCronograma() deve deixar isso setado -
    // reseta aqui pra qualquer abertura "do zero" (pelo próprio botão da aba) não herdar
    // um vínculo de cronograma de uma visita anterior.
    cronogramaOrigemId = null;
}

function fecharFormLancarTreinamento() {
    showTreinSubtab('visao');
}

function refreshCatalogoDatalist() {
    const dl = document.getElementById('lancTreinCatalogoList');
    if (!dl) return;
    dl.innerHTML = '';
    allTreinamentosCatalogo.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).forEach(c => {
        const opt = document.createElement('option');
        opt.value = `${c.id} - ${c.nome}`;
        // label não entra no input ao selecionar (só o value) - o navegador mostra os
        // dois na sugestão, então dá pra distinguir NR/reciclagem de DDS pontual sem
        // rolar os 172 itens misturados nem esperar abrir pra ver a validade.
        opt.label = c.meses_validade ? `🔄 recicla a cada ${c.meses_validade}m` : 'Sem validade (avulso)';
        dl.appendChild(opt);
    });
}

function popularCatalogoDatalist() {
    const dl = document.getElementById('lancTreinCatalogoList');
    if (!dl || dl.options.length > 0) return;
    refreshCatalogoDatalist();
}

function popularResponsavelSelect() {
    const sel = document.getElementById('lancTreinResponsavel');
    if (!sel || sel.options.length > 1) return;
    const responsaveis = new Set();
    allEfetivo.forEach(e => { if (colaboradorEstaAtivo(e) && e.responsavel) responsaveis.add(e.responsavel); });
    Array.from(responsaveis).sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
}

// Datalist devolve "CODIGO - Nome do treinamento" quando escolhido da lista, mas
// aceita digitar só o código direto (fluxo que o usuário já usa no Excel) - o split
// pega sempre o primeiro pedaço, então funciona mesmo se o nome do treinamento tiver
// " - " no meio (ex: "NR.10 - SEGURANÇA...").
function extrairCodigoTreinamento(raw) {
    return raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw.trim();
}

function onLancTreinCodigoChange() {
    const codigo = extrairCodigoTreinamento(document.getElementById('lancTreinCodigo').value);
    const infoEl = document.getElementById('lancTreinInfo');
    const dataEl = document.getElementById('lancTreinData');
    if (!codigo) { infoEl.style.display = 'none'; return; }

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    infoEl.style.display = 'block';
    if (!cat) {
        infoEl.style.color = 'var(--danger)';
        infoEl.innerHTML = '❌ Código não encontrado no catálogo de treinamentos.';
        return;
    }
    infoEl.style.color = 'var(--text)';
    let infoHtml = `<strong>${escapeHTML(cat.nome)}</strong> — Carga horária: ${cat.carga_horaria || 0}h — ${cat.meses_validade ? `Validade: ${cat.meses_validade} meses` : 'Sem validade (não recicla)'}`;

    // Se este código tem um item PLANEJADO no Cronograma, avisa a data prevista e já
    // preenche o campo Data (só se o usuário ainda não tiver editado esse campo à mão -
    // ver dataset.editadoManualmente em abrirFormLancarTreinamento/index.html - já que o
    // campo nasce preenchido com "hoje" por padrão, não vazio, então checar só
    // dataEl.value nunca dispararia de verdade) - reduz o erro de digitar a data errada
    // na mão, que foi exatamente o que causou um lançamento duplicado com data trocada
    // num caso real.
    const itemCronograma = allTreinamentosCronograma
        .filter(c => c.treinamento_cod === codigo && c.status === 'planejado' && c.data_prevista)
        .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))[0];
    if (itemCronograma) {
        let preencheuData = false;
        if (dataEl && !dataEl.dataset.editadoManualmente) {
            dataEl.value = itemCronograma.data_prevista;
            preencheuData = true;
        }
        infoHtml += `<br>📅 Previsto no Cronograma para ${formatSimpleDate(itemCronograma.data_prevista)}${preencheuData ? ' — data preenchida automaticamente acima' : ''}.`;
    }
    infoEl.innerHTML = infoHtml;
}

// Vem do botão "📋 Programar"/"📋 Programar Grupo" nos alertas de "NRs Vencidas ou
// Vencendo" (Treinamentos > Visão Geral) - pula direto pra "🪪 Kits e Documentos" já com
// o treinamento certo e os colaboradores pendentes carregados, pronto pra emitir a
// documentação (OS + Lista de Presença + Certificado + Declaração de Integração + Termo
// de Recusa) ANTES de levar a campo pra colher assinatura. NÃO vai pra "Lançar
// Treinamento" de propósito - confirmado com o usuário que o lançamento só acontece DEPOIS
// da documentação já assinada, então o gargalo real é emitir o documento, não lançar a
// presença. matriculas com 1 item = botão individual (por colaborador, dentro do grupo);
// com vários = botão "Programar Grupo" (todo mundo que precisa da mesma NR de uma vez,
// cada um já com seus 5 botões de documento prontos na lista). Reaproveita o mesmo estado
// que "🖨️ Kit Completo" já usa (kitsEquipe/kitsCodigoAtual/kitsDataAtual) - não duplica
// nenhum gerador de documento.
function programarRenovacaoNR(codigo, matriculas) {
    showTreinSubtab('kits');

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    document.getElementById('kitsCodigoInput').value = cat ? `${cat.id} - ${cat.nome}` : codigo;
    onKitsCodigoChange();

    document.getElementById('kitsDataInput').value = new Date().toISOString().split('T')[0];
    onKitsDataChange();

    kitsEquipe = new Map();
    matriculas.forEach(matricula => {
        const e = allEfetivo.find(x => x.id === matricula);
        if (e) kitsEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, checked: true });
    });
    renderKitsEquipeList();
    renderKitsDocsIndividuaisList();
}

// Cada "responsável" identifica uma frente de serviço - a lista de presença é sempre
// a equipe de UMA frente por vez, nunca a soma de mais de uma (confirmado com o
// usuário: trocar de responsável troca de frente, não junta times). Por isso troca de
// responsável zera a lista anterior (inclusive avulsos adicionados antes da troca, já
// que eles pertenciam à frente anterior) antes de carregar a nova equipe.
function carregarEquipeResponsavel() {
    const responsavel = document.getElementById('lancTreinResponsavel').value;
    lancTreinEquipe = new Map();
    if (!responsavel) { renderListaPresencaEquipe(); return; }
    allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === responsavel).forEach(e => {
        lancTreinEquipe.set(e.id, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
    });
    renderListaPresencaEquipe();
}

// "Carregar equipe do Responsável" fica só com ativos de propósito (reflete o time de
// HOJE, uso do dia a dia). Já a busca avulsa aqui precisa achar QUALQUER colaborador,
// inclusive desligado - motivo real: correção de histórico antigo (ex: lançamentos de
// jan/2025 apagados e relançados a partir da lista de papel original), onde a pessoa
// estava ativa na época mas já foi demitida depois. Marca "(Desligado)" no resultado pra
// deixar claro o que está sendo adicionado, mas não bloqueia.
function filterAddColabLista(query) {
    const container = document.getElementById('lancTreinAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    const matches = allEfetivo.filter(e =>
        !lancTreinEquipe.has(e.id) &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarColabAvulso('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${colaboradorEstaAtivo(e) ? '' : ' — (Desligado)'}</div>
        </div>`).join('');
}

function adicionarColabAvulso(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    lancTreinEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
    document.getElementById('lancTreinAddColab').value = '';
    document.getElementById('lancTreinAddColabResults').innerHTML = '';
    renderListaPresencaEquipe();
}

function removerColabLista(matricula) {
    lancTreinEquipe.delete(matricula);
    renderListaPresencaEquipe();
}

function toggleColabPresenca(matricula, checked) {
    const c = lancTreinEquipe.get(matricula);
    if (c) c.checked = checked;
    atualizarContagemPresenca();
}

function atualizarContagemPresenca() {
    const count = Array.from(lancTreinEquipe.values()).filter(c => c.checked).length;
    document.getElementById('lancTreinContagem').textContent = count;
}

function renderListaPresencaEquipe() {
    const container = document.getElementById('lancTreinEquipeList');
    if (lancTreinEquipe.size === 0) {
        container.innerHTML = '<div class="db-list-empty">Selecione um responsável ou adicione colaboradores avulsos acima</div>';
        atualizarContagemPresenca();
        return;
    }
    const entries = Array.from(lancTreinEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    container.innerHTML = entries.map(([matricula, c]) => `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="toggleColabPresenca('${escapeHTML(matricula)}', this.checked)" style="width:17px; height:17px; flex-shrink:0; cursor:pointer;">
            <div style="flex:1;">
                <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
                <div class="db-list-item-sub">${escapeHTML(c.funcao || '')}${c.setor ? ' — ' + escapeHTML(c.setor) : ''} — Matrícula ${escapeHTML(matricula)}</div>
            </div>
            <button onclick="removerColabLista('${escapeHTML(matricula)}')" title="Remover da lista" style="background:none; border:none; color: var(--danger); cursor:pointer; font-size: 16px; padding: 4px;">✕</button>
        </div>`).join('');
    atualizarContagemPresenca();
}

async function salvarLancamentoTreinamento() {
    if (bloquearEdicaoSeNaoAutorizado('treinamentos')) return;
    const statusEl = document.getElementById('lancTreinStatus');
    const codigo = extrairCodigoTreinamento(document.getElementById('lancTreinCodigo').value);
    const data = document.getElementById('lancTreinData').value;

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) {
        statusEl.textContent = '❌ Informe um código de treinamento válido do catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    if (!data) {
        statusEl.textContent = '❌ Informe a data do treinamento.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const selecionados = Array.from(lancTreinEquipe.entries()).filter(([, c]) => c.checked);
    if (selecionados.length === 0) {
        statusEl.textContent = '❌ Selecione ao menos um colaborador na lista de presença.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    // Avisa (mas não bloqueia) quando algum colaborador selecionado já tem ESTE MESMO
    // treinamento com validade que ainda cobre a data sendo lançada agora - situação
    // real que gerou o erro do LUCAS/VANDILER em jul/2026 (LUCAS quase foi relançado em
    // 13/07 quando já tinha Integração válida até 2028-07-02). Não bloqueia porque uma
    // reciclagem antecipada pode ser legítima (ex: exigência da fiscalização).
    const jaValidos = [];
    selecionados.forEach(([matricula, c]) => {
        const registroValido = allTreinamentosRealizados.find(r =>
            r.matricula === matricula &&
            r.treinamento_cod === codigo &&
            r.data_proxima_reciclagem &&
            r.data_proxima_reciclagem > data
        );
        if (registroValido) {
            jaValidos.push(`${c.nome} (válido até ${formatSimpleDate(registroValido.data_proxima_reciclagem)})`);
        }
    });
    if (jaValidos.length > 0) {
        const confirmaMesmoAssim = confirm(
            `⚠️ ${jaValidos.length} colaborador(es) já têm "${cat.nome}" válido além de ${formatSimpleDate(data)}:\n\n` +
            jaValidos.join('\n') +
            `\n\nDeseja lançar mesmo assim?`
        );
        if (!confirmaMesmoAssim) return;
    }

    // Avisa (mas não bloqueia) quando este código é um treinamento controlado pelo
    // Cronograma (as palestras/temas mensais de Segurança/Saúde/Meio Ambiente, DDS etc)
    // e já existe um lançamento dele no MESMO MÊS com uma data DIFERENTE - pega
    // exatamente o erro real que aconteceu (mesmo tema lançado 2x no mês com datas
    // trocadas). Não se aplica a treinamentos "avulsos" fora do Cronograma (ex:
    // Integração, que legitimamente acontece várias vezes no mês, uma por admissão) -
    // por isso só entra na conta se o código aparecer em allTreinamentosCronograma.
    const ehTreinamentoDeCronograma = allTreinamentosCronograma.some(c => c.treinamento_cod === codigo);
    if (ehTreinamentoDeCronograma) {
        const mesAnoNovo = data.slice(0, 7);
        const jaLancadoNoMes = allTreinamentosRealizados.find(r =>
            r.treinamento_cod === codigo && r.data_treinamento &&
            r.data_treinamento.slice(0, 7) === mesAnoNovo && r.data_treinamento !== data
        );
        if (jaLancadoNoMes) {
            const confirmaDuplicado = confirm(
                `⚠️ "${cat.nome}" já foi lançado em ${formatSimpleDate(jaLancadoNoMes.data_treinamento)} neste mês.\n\n` +
                `Se foi engano na data, cancele e corrija a data acima antes de salvar.\n` +
                `Se este treinamento realmente foi reagendado, pode confirmar e lançar mesmo assim.\n\n` +
                `Lançar mesmo assim com a data ${formatSimpleDate(data)}?`
            );
            if (!confirmaDuplicado) return;
        }
    }

    // Próxima reciclagem = data + meses_validade do catálogo, calculado aqui (sem
    // planilha por trás desta vez) - monta a string manualmente a partir dos
    // componentes locais da data pra não arriscar um deslocamento de fuso horário
    // que toISOString() poderia introduzir.
    let dataProximaReciclagem = null;
    if (cat.meses_validade) {
        const d = parseLocalDate(data);
        const alvo = new Date(d.getFullYear(), d.getMonth() + cat.meses_validade, d.getDate());
        dataProximaReciclagem = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
    }

    const rows = selecionados.map(([matricula, c]) => {
        const efetivo = allEfetivo.find(e => e.id === matricula);
        return {
            id: `${matricula}_${codigo}_${data}`,
            matricula,
            nome: c.nome,
            funcao: c.funcao,
            setor: c.setor,
            status_colaborador: efetivo ? efetivo.status : 'ATIVO',
            treinamento_cod: codigo,
            treinamento_nome: cat.nome,
            carga_horaria: cat.carga_horaria,
            data_treinamento: data,
            meses_validade: cat.meses_validade,
            data_proxima_reciclagem: dataProximaReciclagem,
            observacoes: ''
        };
    });

    // Todo mundo carregado em "Carregar equipe do Responsável" (presente OU desmarcado)
    // - base pro KPI "Taxa de Presença". treinamentos_realizados continua sendo só o
    // registro oficial de presença/certificado, sem mudar nada nele; esta é uma tabela
    // paralela, só pra saber quem foi convocado e faltou (isso nunca foi guardado antes).
    const convocadosRows = Array.from(lancTreinEquipe.entries()).map(([matricula, c]) => ({
        id: `${matricula}_${codigo}_${data}`,
        matricula, nome: c.nome, funcao: c.funcao, setor: c.setor,
        treinamento_cod: codigo, treinamento_nome: cat.nome,
        data_treinamento: data, presente: !!c.checked
    }));

    statusEl.textContent = `Enviando ${rows.length} registro(s)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_realizados', rows);

        if (convocadosRows.length > 0) {
            try {
                await supabaseUpsert('treinamentos_convocados', convocadosRows);
            } catch (convErr) {
                console.error('Erro ao registrar lista de convocados (Taxa de Presença):', convErr);
            }
        }

        // Lançamento veio de "✅ Lançar Presença" num item do Cronograma - fecha o
        // ciclo marcando esse item como 'lancado', pra ele parar de aparecer como
        // pendente na lista e não entrar na próxima impressão em lote do mês. Envia a
        // linha completa (não parcial) por causa do NOT NULL em data_prevista/
        // treinamento_cod, mesmo cuidado já documentado em salvarDetalhesSessao.
        if (cronogramaOrigemId) {
            const itemOrigem = allTreinamentosCronograma.find(c => c.id === cronogramaOrigemId);
            if (itemOrigem) {
                const itemAtualizado = {
                    ...itemOrigem, status: 'lancado', lancado_em: new Date().toISOString(),
                    data_realizada: data, realizado_no_prazo: data === itemOrigem.data_prevista
                };
                try {
                    await supabaseUpsert('treinamentos_cronograma', [itemAtualizado]);
                    const idx = allTreinamentosCronograma.findIndex(c => c.id === itemAtualizado.id);
                    if (idx >= 0) allTreinamentosCronograma[idx] = itemAtualizado;
                } catch (cronoErr) {
                    console.error('Erro ao marcar item do cronograma como lançado:', cronoErr);
                }
            }
            cronogramaOrigemId = null;
        } else {
            // Lançado pela aba "Lançar Treinamento" em branco, sem vir do Cronograma -
            // mesmo assim, se existir um item PLANEJADO do mesmo código no mesmo mês,
            // marca como lançado também. Sem isso, todo lançamento feito por aqui (que é
            // o caminho que o usuário mais usa no dia a dia) nunca fechava o item do
            // Cronograma, e o KPI "Cumprimento do Cronograma" continuava contando pra
            // sempre como "vencido sem lançamento" um treinamento que na verdade já
            // tinha sido feito.
            const mesAnoLancado = data.slice(0, 7);
            const itemCronogramaPendente = allTreinamentosCronograma.find(c =>
                c.treinamento_cod === codigo && c.status === 'planejado' &&
                c.data_prevista && c.data_prevista.slice(0, 7) === mesAnoLancado
            );
            if (itemCronogramaPendente) {
                const itemAtualizado = {
                    ...itemCronogramaPendente, status: 'lancado', lancado_em: new Date().toISOString(),
                    data_realizada: data, realizado_no_prazo: data === itemCronogramaPendente.data_prevista
                };
                try {
                    await supabaseUpsert('treinamentos_cronograma', [itemAtualizado]);
                    const idx = allTreinamentosCronograma.findIndex(c => c.id === itemAtualizado.id);
                    if (idx >= 0) allTreinamentosCronograma[idx] = itemAtualizado;
                } catch (cronoErr) {
                    console.error('Erro ao marcar item do cronograma como lançado (reconciliação automática):', cronoErr);
                }
            }
        }

        statusEl.textContent = `✅ ${rows.length} colaborador(es) lançado(s) em "${cat.nome}" (${formatSimpleDate(data)}).`;
        statusEl.style.color = 'var(--success)';
        treinamentosLoaded = true;
        await loadTreinamentosData();
        setTimeout(() => fecharFormLancarTreinamento(), 1800);
    } catch (err) {
        console.error('Erro ao lançar treinamento:', err);
        statusEl.textContent = '❌ Falha ao lançar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// LANÇAR DDS (Diálogo de Saúde, Segurança e Meio Ambiente) - mesma lógica de "Lançar
// Treinamento" acima (carregar equipe da frente + busca avulsa + lista de presença), com
// o emociograma (🟢/🟡/🔴) por colaborador e o campo de Ação/Tratativa quando alguém marca
// 🔴 Ruim. dds_realizados é denormalizada de propósito, igual treinamentos_realizados: 1
// linha por colaborador por dia.
// ============================================

let lancDdsEquipe = new Map(); // matricula -> {nome, funcao, setor, checked}
let lancDdsEmociogramaPorMatricula = {}; // matricula -> 'bom' | 'regular' | 'ruim'
// Guardado separado do emociograma (não apagado ao trocar de opção e voltar pra 'ruim')
// pra não perder o que a pessoa já tinha digitado só por ter clicado sem querer noutro
// botão do emociograma antes de confirmar.
let lancDdsAcaoTratativaPorMatricula = {}; // matricula -> texto (só relevante quando 'ruim')
// Preenchido com a loteKeyDds() do lançamento em edição (ver editarLoteDds) - null quando o
// formulário está em modo "lançamento novo". salvarLancamentoDds() usa isso pra apagar as
// linhas antigas desse lote antes de inserir as novas, em vez de duplicar.
let lancDdsLoteEmEdicao = null;

// Estado do painel "📅 Lançar Semana Inteira" - independente do lançamento de 1 dia acima
// (os dois convivem, nenhum substitui o outro). lancDdsSemanaEstados guarda, por matrícula,
// o estado de CADA dia da semana ('bom'|'regular'|'ruim'|'ausente' - "ausente" não gera
// lançamento nesse dia pra essa pessoa).
let lancDdsSemanaFrente = '';
let lancDdsSemanaDias = []; // array de Date, segunda a domingo
let lancDdsSemanaTemas = {}; // 'YYYY-MM-DD' -> tema do dia (editável, pré-vem do cronograma)
let lancDdsSemanaTurno = '';
let lancDdsSemanaHorario = '';
let lancDdsSemanaDuracao = 10;
let lancDdsSemanaEquipe = new Map(); // matricula -> {nome, funcao, setor}
let lancDdsSemanaEstados = {}; // matricula -> { 'YYYY-MM-DD': 'bom'|'regular'|'ruim'|'ausente' }
let lancDdsSemanaAcaoTratativa = {}; // 'matricula|YYYY-MM-DD' -> texto (só quando 'ruim')

function popularDdsFrenteSelect() {
    const sel = document.getElementById('lancDdsFrente');
    if (!sel || sel.options.length > 1) return;
    todasFrentesAtivas().forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        sel.appendChild(opt);
    });
}

// Sugestão do "Tema do dia" (datalist, não trava digitar algo novo) - mesmo raciocínio do
// combobox de Agentes/EPI do GHE: junta os temas já usados em qualquer lançamento de DDS
// COM os temas do cronograma anual (dds_temas_cronograma, TEMAS_DDS_2026.pdf), pra não virar
// "Proteção das Mãos" numa frente e "Proteção das mãos e dedos" noutra.
function popularDdsTemaDatalist() {
    const dl = document.getElementById('lancDdsTemaSugestoes');
    if (!dl) return;
    const temas = new Set();
    allDdsRealizados.forEach(r => { if (r.tema) temas.add(r.tema.trim()); });
    allDdsTemasCronograma.forEach(t => { if (t.tema) temas.add(t.tema.trim()); });
    const lista = Array.from(temas).filter(Boolean).sort((a, b) => a.localeCompare(b));
    dl.innerHTML = lista.map(t => `<option value="${escapeHTML(t)}">`).join('');
}

// Auto-preenche o Tema do dia a partir do cronograma anual (dds_temas_cronograma) sempre
// que a Data muda - continua 100% editável (o usuário troca na hora se bater um feriado que
// o cronograma ainda não reflete, ex: 25/12 aparece com tema "normal" cadastrado). Sem tema
// cadastrado pra aquela data, deixa em branco pra digitar livre - nunca trava o lançamento.
function onLancDdsDataChange() {
    const data = document.getElementById('lancDdsData').value;
    const temaInput = document.getElementById('lancDdsTema');
    if (!temaInput) return;
    if (!data) { temaInput.value = ''; return; }
    const cronograma = allDdsTemasCronograma.find(t => t.data === data);
    temaInput.value = cronograma ? cronograma.tema : '';
}

function abrirFormLancarDds() {
    document.getElementById('lancDdsData').value = new Date().toISOString().split('T')[0];
    document.getElementById('lancDdsFrente').value = '';
    document.getElementById('lancDdsTurno').value = '';
    document.getElementById('lancDdsHorario').value = '';
    document.getElementById('lancDdsDuracao').value = '10';
    document.getElementById('lancDdsObservacoes').value = '';
    document.getElementById('lancDdsAddColab').value = '';
    document.getElementById('lancDdsAddColabResults').innerHTML = '';
    document.getElementById('lancDdsStatus').textContent = '';
    popularDdsFrenteSelect();
    popularDdsTemaDatalist();
    onLancDdsDataChange();
    lancDdsEquipe = new Map();
    lancDdsEmociogramaPorMatricula = {};
    lancDdsAcaoTratativaPorMatricula = {};
    lancDdsLoteEmEdicao = null;
    const avisoEl = document.getElementById('lancDdsEditandoAviso');
    if (avisoEl) avisoEl.style.display = 'none';
    renderListaPresencaDds();
}

// Mesmo raciocínio de carregarEquipeResponsavel (Lançar Treinamento): trocar de frente
// sempre zera a lista anterior (a lista de presença é sempre de UMA frente por vez).
function carregarEquipeFrenteDds() {
    const frente = document.getElementById('lancDdsFrente').value;
    lancDdsEquipe = new Map();
    lancDdsEmociogramaPorMatricula = {};
    lancDdsAcaoTratativaPorMatricula = {};
    if (!frente) { renderListaPresencaDds(); return; }
    allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === frente).forEach(e => {
        lancDdsEquipe.set(e.id, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
    });
    renderListaPresencaDds();
}

function filterDdsAddColabLista(query) {
    const container = document.getElementById('lancDdsAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }
    const matches = allEfetivo.filter(e =>
        !lancDdsEquipe.has(e.id) &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);
    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarDdsColabAvulso('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${colaboradorEstaAtivo(e) ? '' : ' — (Desligado)'}</div>
        </div>`).join('');
}

function adicionarDdsColabAvulso(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    lancDdsEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, setor: e.setor, checked: true });
    document.getElementById('lancDdsAddColab').value = '';
    document.getElementById('lancDdsAddColabResults').innerHTML = '';
    renderListaPresencaDds();
}

function removerDdsColabLista(matricula) {
    lancDdsEquipe.delete(matricula);
    renderListaPresencaDds();
}

function toggleDdsColabPresenca(matricula, checked) {
    const c = lancDdsEquipe.get(matricula);
    if (c) c.checked = checked;
    atualizarContagemPresencaDds();
}

function atualizarContagemPresencaDds() {
    const count = Array.from(lancDdsEquipe.values()).filter(c => c.checked).length;
    const el = document.getElementById('lancDdsContagem');
    if (el) el.textContent = count;
}

// Clicar de novo no mesmo emociograma já selecionado desmarca (sem selo = "não
// respondeu", tratado como válido - ver comentário em salvarLancamentoDds). Não apaga o
// texto de Ação/Tratativa ao trocar de opção, só esconde o campo - reaparece com o que já
// tinha se a pessoa marcar 🔴 Ruim de novo.
function selecionarEmociogramaDds(matricula, valor) {
    if (lancDdsEmociogramaPorMatricula[matricula] === valor) {
        delete lancDdsEmociogramaPorMatricula[matricula];
    } else {
        lancDdsEmociogramaPorMatricula[matricula] = valor;
    }
    renderListaPresencaDds();
}

function renderListaPresencaDds() {
    const container = document.getElementById('lancDdsEquipeList');
    if (!container) return;
    if (lancDdsEquipe.size === 0) {
        container.innerHTML = '<div class="db-list-empty">Selecione uma frente ou adicione colaboradores avulsos acima</div>';
        atualizarContagemPresencaDds();
        return;
    }
    const emocEstilo = (ativo, cor, bg) => `border:2px solid ${ativo ? cor : 'var(--border)'}; background:${ativo ? bg : 'none'}; border-radius:8px; cursor:pointer; font-size:15px; padding:3px 7px; line-height:1;`;
    const entries = Array.from(lancDdsEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    container.innerHTML = entries.map(([matricula, c]) => {
        const emoc = lancDdsEmociogramaPorMatricula[matricula] || null;
        const acaoTexto = lancDdsAcaoTratativaPorMatricula[matricula] || '';
        const precisaAcao = emoc === 'ruim';
        const acaoPreenchida = !!acaoTexto.trim();
        return `<div class="db-list-item" style="display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="toggleDdsColabPresenca('${escapeHTML(matricula)}', this.checked)" style="width:17px; height:17px; flex-shrink:0; cursor:pointer;">
                <div style="flex:1; min-width:160px;">
                    <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
                    <div class="db-list-item-sub">${escapeHTML(c.funcao || '')}${c.setor ? ' — ' + escapeHTML(c.setor) : ''} — Matrícula ${escapeHTML(matricula)}</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button type="button" title="Bom/Ótimo" onclick="selecionarEmociogramaDds('${escapeHTML(matricula)}', 'bom')" style="${emocEstilo(emoc === 'bom', '#1a7f4b', '#e6f7ee')}">🟢</button>
                    <button type="button" title="Regular" onclick="selecionarEmociogramaDds('${escapeHTML(matricula)}', 'regular')" style="${emocEstilo(emoc === 'regular', '#b78a00', '#fff9e6')}">🟡</button>
                    <button type="button" title="Ruim" onclick="selecionarEmociogramaDds('${escapeHTML(matricula)}', 'ruim')" style="${emocEstilo(emoc === 'ruim', '#c0392b', '#fdf2f2')}">🔴</button>
                </div>
                <button onclick="removerDdsColabLista('${escapeHTML(matricula)}')" title="Remover da lista" style="background:none; border:none; color: var(--danger); cursor:pointer; font-size: 16px; padding: 4px;">✕</button>
            </div>
            ${precisaAcao ? `<div style="margin-left:27px;">
                <label style="display:block; margin-bottom:3px; font-size:11px; color:var(--text-light);">Ação/Tratativa (o que foi feito - não precisa preencher agora, mas fica destacado até ter algo escrito)</label>
                <textarea rows="2" placeholder="Ex: conversa reservada, encaminhado ao RESP SMS..."
                    oninput="lancDdsAcaoTratativaPorMatricula['${escapeHTML(matricula)}']=this.value; this.style.borderColor = this.value.trim() ? 'var(--border)' : '#c0392b'; this.style.background = this.value.trim() ? 'var(--card)' : '#fdf2f2';"
                    style="width:100%; padding:6px 8px; border:2px solid ${acaoPreenchida ? 'var(--border)' : '#c0392b'}; border-radius:6px; font-size:11.5px; box-sizing:border-box; background:${acaoPreenchida ? 'var(--card)' : '#fdf2f2'};">${escapeHTML(acaoTexto)}</textarea>
            </div>` : ''}
        </div>`;
    }).join('');
    atualizarContagemPresencaDds();
}

async function salvarLancamentoDds() {
    if (bloquearEdicaoSeNaoAutorizado('ddsma')) return;
    const statusEl = document.getElementById('lancDdsStatus');
    const data = document.getElementById('lancDdsData').value;
    const frente = document.getElementById('lancDdsFrente').value;
    const tema = document.getElementById('lancDdsTema').value.trim();
    const turno = document.getElementById('lancDdsTurno').value;
    const horario = document.getElementById('lancDdsHorario').value;
    const duracao = parseFloat(document.getElementById('lancDdsDuracao').value) || 10;
    const observacoes = document.getElementById('lancDdsObservacoes').value.trim();

    if (!data) { statusEl.textContent = '❌ Informe a data do DDS.'; statusEl.style.color = 'var(--danger)'; return; }
    if (!frente) { statusEl.textContent = '❌ Selecione a Frente/Encarregado.'; statusEl.style.color = 'var(--danger)'; return; }
    const selecionados = Array.from(lancDdsEquipe.entries()).filter(([, c]) => c.checked);
    if (selecionados.length === 0) {
        statusEl.textContent = '❌ Selecione ao menos um colaborador na lista de presença.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    // Avisa (mas não bloqueia) quando essa MESMA frente/turma já tem um
    // lançamento de DDS pra essa MESMA data - situação real que gerou o erro
    // do encarregado DANILO em ago/2026 (turma lançada 2x sem querer,
    // dobrando o total de participantes daquele dia). Mesmo raciocínio do
    // aviso de treinamento duplicado no mês (ehTreinamentoDeCronograma, ver
    // salvarLancamentoTreinamento) - não bloqueia porque pode ser legítimo
    // lançar 2 rodadas de DDS no mesmo dia pra frentes com 2 turnos. Ignora o
    // próprio lote quando está EDITANDO (lancDdsLoteEmEdicao), senão o aviso
    // dispararia toda vez que alguém confirma uma edição normal.
    const loteExistenteMesmoDia = lotesRecentesDds(9999).find(lote =>
        lote.data_dds === data && lote.frente_responsavel === frente && lote.key !== lancDdsLoteEmEdicao
    );
    if (loteExistenteMesmoDia) {
        const confirmaDuplicado = confirm(
            `⚠️ Já existe um lançamento de DDS para "${frente}" em ${formatSimpleDate(data)}:\n\n` +
            `${loteExistenteMesmoDia.tema || 'Sem tema'} — ${loteExistenteMesmoDia.ids.length} participante(s)\n\n` +
            `Se foi engano (turma lançada 2x), cancele e use "🗑️ Excluir" em "Lançamentos Recentes" no lançamento antigo antes de lançar de novo.\n` +
            `Se esta frente realmente teve uma 2ª rodada de DDS neste mesmo dia (ex: 2 turnos), pode confirmar e lançar mesmo assim.\n\n` +
            `Lançar mesmo assim?`
        );
        if (!confirmaDuplicado) return;
    }

    const cargaHoraria = duracao / 60;
    const ts = Date.now();
    // Sem emociograma marcado = "não respondeu" (não é erro): presença na roda de DDS não
    // é a mesma coisa que responder o emociograma - tem gente que participa mas não
    // quer/não lembra de marcar como estava. rubrica_confirmada continua true de qualquer
    // jeito, pois representa a presença em si.
    const rows = selecionados.map(([matricula, c]) => {
        const emoc = lancDdsEmociogramaPorMatricula[matricula] || null;
        return {
            id: `dds_${ts}_${matricula}`,
            data_dds: data,
            frente_responsavel: frente,
            tema: tema || null,
            turno: turno || null,
            horario_inicio: horario || null,
            duracao_min: duracao,
            matricula,
            nome: c.nome,
            funcao: c.funcao,
            setor: c.setor,
            emociograma: emoc,
            acao_tratativa: emoc === 'ruim' ? (lancDdsAcaoTratativaPorMatricula[matricula] || null) : null,
            rubrica_confirmada: true,
            carga_horaria: cargaHoraria,
            observacoes: observacoes || null
        };
    });

    const editando = lancDdsLoteEmEdicao;
    statusEl.textContent = editando ? `Salvando edição (${rows.length} registro(s))...` : `Enviando ${rows.length} registro(s)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        // Editando um lote existente: apaga as linhas antigas ANTES de inserir as novas -
        // vira um lote novo (timestamp novo), então excluir/editar de novo depois continua
        // funcionando igual (ver loteKeyDds/editarLoteDds/excluirLoteDds).
        if (editando) {
            const idsAntigos = allDdsRealizados.filter(r => loteKeyDds(r) === editando).map(r => r.id);
            if (idsAntigos.length > 0) {
                await supabaseDeleteMany('dds_realizados', idsAntigos);
                const idsAntigosSet = new Set(idsAntigos);
                allDdsRealizados = allDdsRealizados.filter(r => !idsAntigosSet.has(r.id));
            }
        }
        await supabaseUpsert('dds_realizados', rows);
        allDdsRealizados = allDdsRealizados.concat(rows);
        lancDdsLoteEmEdicao = null;
        const avisoEl = document.getElementById('lancDdsEditandoAviso');
        if (avisoEl) avisoEl.style.display = 'none';
        statusEl.textContent = `✅ ${rows.length} colaborador(es) ${editando ? 'atualizado(s)' : 'lançado(s)'} no DDS de ${formatSimpleDate(data)}.`;
        statusEl.style.color = 'var(--success)';
        renderDdsLancamentosRecentes();
        setTimeout(() => { abrirFormLancarDds(); renderDdsPanel(); renderDdsFechamentoSemanal(); }, 1800);
    } catch (err) {
        console.error('Erro ao lançar DDS:', err);
        statusEl.textContent = '❌ Falha ao lançar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Extrai "dds_<timestamp>" do id de cada linha - linhas do MESMO envio (1 clique em "📤
// Lançar DDS", ou 1 dia dentro de "📅 Lançar Semana Inteira") sempre compartilham o mesmo
// timestamp; envios diferentes (mesmo com frente/data/tema idênticos, como um lançamento
// duplicado por engano) sempre têm timestamps diferentes - dá pra excluir/editar só ESSE
// envio específico sem precisar de coluna nova no banco.
function loteKeyDds(row) {
    const partes = (row.id || '').split('_');
    return partes.length >= 2 ? `${partes[0]}_${partes[1]}` : row.id;
}

let allAnexosSms = [];
let anexosSmsCarregados = false;
let _anexosSmsCarregando = false;
let _anexosSmsCallbacks = [];

// Carrega os anexos (PDFs escaneados/fotos guardados no Google Drive) sob demanda, na
// primeira vez que a lista de DDS ou Treinamentos for desenhada - função separada e
// independente do Promise.all de loadTreinamentosData lá em cima, pra não arriscar
// desalinhar a lista de variáveis desestruturadas daquele carregamento já existente.
// Blindada contra recursão infinita (Maximum call stack size exceeded) e congelamento de thread.
function garantirAnexosSmsCarregados(aoTerminar) {
    if (anexosSmsCarregados) {
        // Se já está carregado, não re-dispara funções de render que poderiam entrar em loop
        if (typeof aoTerminar === 'function' && aoTerminar !== renderDdsLancamentosRecentes && aoTerminar !== renderTreinHistLista) {
            try { aoTerminar(); } catch (e) { console.error('Erro em callback de anexos SMS:', e); }
        }
        return;
    }
    if (typeof aoTerminar === 'function' && !_anexosSmsCallbacks.includes(aoTerminar)) {
        _anexosSmsCallbacks.push(aoTerminar);
    }
    if (_anexosSmsCarregando) return;
    _anexosSmsCarregando = true;

    const fetcher = typeof supabaseFetchCacheado === 'function' ? supabaseFetchCacheado('anexos_sms', '?select=*') : supabaseFetch('anexos_sms', '?select=*');
    fetcher.then(dados => {
        allAnexosSms = Array.isArray(dados) ? dados : [];
        anexosSmsCarregados = true;
        _anexosSmsCarregando = false;
        const cbs = _anexosSmsCallbacks.slice();
        _anexosSmsCallbacks = [];
        cbs.forEach(cb => {
            try { cb(); } catch (err) { console.error('Erro ao executar callback de anexos SMS:', err); }
        });
    }).catch(err => {
        console.error('Erro ao carregar anexos SMS:', err);
        anexosSmsCarregados = false;
        _anexosSmsCarregando = false;
        _anexosSmsCallbacks = [];
    });
}

function anexosDoRegistro(tabela, chave) {
    return allAnexosSms.filter(a => a.tabela_origem === tabela && a.registro_chave === chave);
}

function labelContagemAnexos(tabela, chave) {
    const n = anexosDoRegistro(tabela, chave).length;
    return n > 0 ? ` (${n})` : '';
}

function popularFiltroSetorDds() {
    const sel = document.getElementById('filtroSetorDDS');
    if (!sel) return;
    const valorAtual = sel.value;

    const opcoes = new Set([
        'Civil',
        'Elétrica',
        'Mecânica',
        'Produção',
        'Administrativo',
        'Topografia',
        'Segurança do Trabalho',
        'Meio Ambiente'
    ]);

    if (Array.isArray(allDdsRealizados)) {
        allDdsRealizados.forEach(r => {
            if (r.setor) opcoes.add(r.setor.trim());
            if (r.frente_responsavel) opcoes.add(r.frente_responsavel.trim());
        });
    }
    if (typeof todasFrentesAtivas === 'function') {
        todasFrentesAtivas().forEach(f => {
            if (f) opcoes.add(f.trim());
        });
    }
    if (Array.isArray(allEfetivo)) {
        allEfetivo.forEach(c => {
            if (c.setor) opcoes.add(c.setor.trim());
        });
    }

    const listaOrdenada = Array.from(opcoes).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sel.innerHTML = '<option value="">Todos os Setores</option>' +
        listaOrdenada.map(op => `<option value="${escapeHTML(op)}"${op === valorAtual ? ' selected' : ''}>${escapeHTML(op)}</option>`).join('');
}

function limparFiltrosDdsLancamentos() {
    const mesEl = document.getElementById('filtroMesDDS');
    const setorEl = document.getElementById('filtroSetorDDS');
    const buscaEl = document.getElementById('filtroBuscaDDS');
    if (mesEl) mesEl.value = '';
    if (setorEl) setorEl.value = '';
    if (buscaEl) buscaEl.value = '';
    renderDdsLancamentosRecentes();
}

let _filtrosDdsListenersAtivos = false;
let _filtrosDdsDebounceTimer = null;
function configurarFiltrosDdsListeners() {
    if (_filtrosDdsListenersAtivos) return;
    const mesEl = document.getElementById('filtroMesDDS');
    const setorEl = document.getElementById('filtroSetorDDS');
    const buscaEl = document.getElementById('filtroBuscaDDS');

    if (!mesEl || !setorEl || !buscaEl) return;
    _filtrosDdsListenersAtivos = true;

    mesEl.addEventListener('change', () => renderDdsLancamentosRecentes());
    setorEl.addEventListener('change', () => renderDdsLancamentosRecentes());

    buscaEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            renderDdsLancamentosRecentes();
        }
    });

    buscaEl.addEventListener('input', () => {
        clearTimeout(_filtrosDdsDebounceTimer);
        _filtrosDdsDebounceTimer = setTimeout(() => {
            renderDdsLancamentosRecentes();
        }, 400);
    });
}

function lotesRecentesDds(linhasCustom = null, limite = 20) {
    const fonte = Array.isArray(linhasCustom) ? linhasCustom : (Array.isArray(allDdsRealizados) ? allDdsRealizados : []);
    const mapa = new Map();
    fonte.forEach(r => {
        const key = loteKeyDds(r);
        if (!mapa.has(key)) {
            mapa.set(key, {
                key,
                data_dds: r.data_dds,
                frente_responsavel: r.frente_responsavel,
                tema: r.tema,
                setor: r.setor,
                ids: [],
                horas: 0
            });
        }
        const lote = mapa.get(key);
        lote.ids.push(r.id);
        lote.horas += parseFloat(r.carga_horaria) || 0;
        if (!lote.setor && r.setor) lote.setor = r.setor;
    });

    const lista = Array.from(mapa.values()).sort((a, b) => {
        const dA = a.data_dds || '';
        const dB = b.data_dds || '';
        if (dA !== dB) return dB.localeCompare(dA);
        return b.key.localeCompare(a.key);
    });

    return (limite && limite > 0) ? lista.slice(0, limite) : lista;
}

async function renderDdsLancamentosRecentes() {
    const el = document.getElementById('ddsLancamentosRecentesLista');
    if (!el) return;
    if (!anexosSmsCarregados) {
        garantirAnexosSmsCarregados(renderDdsLancamentosRecentes);
    }
    popularFiltroSetorDds();
    configurarFiltrosDdsListeners();

    const mesEl = document.getElementById('filtroMesDDS');
    const setorEl = document.getElementById('filtroSetorDDS');
    const buscaEl = document.getElementById('filtroBuscaDDS');
    const contadorEl = document.getElementById('filtroDdsContador');

    const mesVal = (mesEl?.value || '').trim();
    const setorVal = (setorEl?.value || '').trim();
    const buscaVal = (buscaEl?.value || '').trim();

    const temFiltro = Boolean(mesVal || setorVal || buscaVal);

    if (contadorEl && temFiltro) {
        contadorEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pesquisando registros no Supabase...';
    }

    let linhasResultado = null;

    if (temFiltro) {
        try {
            let q = sbAuth.from('dds_realizados').select('*');

            if (mesVal) {
                const [anoStr, mesStr] = mesVal.split('-');
                const anoNum = parseInt(anoStr, 10);
                const mesNum = parseInt(mesStr, 10);
                const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
                const primeiroDiaStr = `${anoStr}-${String(mesNum).padStart(2, '0')}-01`;
                const ultimoDiaStr = `${anoStr}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
                q = q.gte('data_dds', primeiroDiaStr).lte('data_dds', ultimoDiaStr);
            }

            if (setorVal) {
                q = q.or(`setor.eq.${setorVal},frente_responsavel.eq.${setorVal}`);
            }

            if (buscaVal) {
                q = q.ilike('tema', `%${buscaVal}%`);
            }

            q = q.order('data_dds', { ascending: false });

            // Remove o limite rígido de 50 quando há filtro específico de mês ou setor/busca
            // garantindo que o usuário veja todos os resultados daquele mês/filtro
            const { data, error } = await q;

            if (!error && Array.isArray(data)) {
                linhasResultado = data;
                // Sincroniza registros encontrados em allDdsRealizados em memória
                if (Array.isArray(allDdsRealizados)) {
                    const idSet = new Set(allDdsRealizados.map(r => r.id));
                    const novos = data.filter(r => !idSet.has(r.id));
                    if (novos.length > 0) allDdsRealizados = allDdsRealizados.concat(novos);
                }
            } else if (error) {
                console.warn('Erro ao consultar Supabase com filtros DDS, recorrendo à filtragem local:', error);
            }
        } catch (errQuery) {
            console.warn('Exceção ao buscar DDS no Supabase com filtros:', errQuery);
        }
    }

    // Fallback gracioso: filtra na memória se a query remota não retornou ou se não há filtros ativos
    if (!linhasResultado) {
        const fonteLocal = Array.isArray(allDdsRealizados) ? allDdsRealizados : [];
        if (temFiltro) {
            linhasResultado = fonteLocal.filter(r => {
                if (mesVal) {
                    const d = r.data_dds || '';
                    if (!d.startsWith(mesVal)) return false;
                }
                if (setorVal) {
                    const s = (r.setor || '').trim().toLowerCase();
                    const f = (r.frente_responsavel || '').trim().toLowerCase();
                    const alvo = setorVal.trim().toLowerCase();
                    if (s !== alvo && f !== alvo) return false;
                }
                if (buscaVal) {
                    const t = (r.tema || '').toLowerCase();
                    if (!t.includes(buscaVal.toLowerCase())) return false;
                }
                return true;
            });
        } else {
            linhasResultado = fonteLocal;
        }
    }

    // Se houver filtro aplicado, remove o limite rígido (exibe todos os lotes do mês/busca).
    // Se não houver filtro, exibe os 20 mais recentes para agilidade.
    const lotes = temFiltro ? lotesRecentesDds(linhasResultado, null) : lotesRecentesDds(linhasResultado, 20);

    if (contadorEl) {
        const totalColabs = (linhasResultado || []).length;
        if (temFiltro) {
            contadorEl.innerHTML = `Exibindo <strong>${lotes.length}</strong> lançamento(s) agrupado(s) (${totalColabs} participante(s)) com os filtros aplicados.`;
        } else {
            contadorEl.innerHTML = `Exibindo os <strong>${lotes.length}</strong> lançamentos mais recentes (${totalColabs} registros em memória). Use os filtros acima para auditar meses passados.`;
        }
    }

    if (lotes.length === 0) {
        el.innerHTML = temFiltro
            ? '<div class="db-list-empty">Nenhum lançamento de DDS encontrado para os filtros selecionados.</div>'
            : '<div class="db-list-empty">Nenhum lançamento de DDS ainda.</div>';
        return;
    }

    el.innerHTML = lotes.map(lote => `
        <div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
            <div>
                <div class="db-list-item-title">${formatSimpleDate(lote.data_dds)} — ${escapeHTML(lote.frente_responsavel || '')}${lote.setor && lote.setor !== lote.frente_responsavel ? ` <span style="font-size:11px; font-weight:normal; color:var(--text-light);">(${escapeHTML(lote.setor)})</span>` : ''}</div>
                <div class="db-list-item-sub">${escapeHTML(lote.tema || 'Sem tema')} — ${lote.ids.length} participante(s) — ${lote.horas.toLocaleString('pt-BR')}h</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="db-clear-btn" style="color:#0284c7; border-color:#bae6fd; background:#f0f9ff; display:inline-flex; align-items:center; gap:5px;" onclick="abrirPastaFotosOperacional('02_DDSMA', '${escapeHTML(lote.data_dds)}', '${escapeHTML(lote.tema || lote.frente_responsavel || 'DDSMA')}')" title="Acessar ou preparar pasta de fotos e evidências no Google Drive">📷 Pasta Drive</button>
                <button class="db-clear-btn" onclick="abrirAnexoModal('dds_realizados', '${escapeHTML(lote.key)}', '${escapeHTML(formatSimpleDate(lote.data_dds))} — ${escapeHTML(lote.frente_responsavel || '')}')">📎 Anexos${labelContagemAnexos('dds_realizados', lote.key)}</button>
                <button class="db-clear-btn" onclick="editarLoteDds('${escapeHTML(lote.key)}')">✏️ Editar</button>
                <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="excluirLoteDds('${escapeHTML(lote.key)}')">🗑️ Excluir</button>
            </div>
        </div>`).join('');
}

// Alias para padronização técnica
const carregarLancamentosRecentesDDS = renderDdsLancamentosRecentes;
const renderizarListaDDS = renderDdsLancamentosRecentes;

async function excluirLoteDds(loteKey) {
    if (bloquearEdicaoSeNaoAutorizado('ddsma')) return;
    const linhas = allDdsRealizados.filter(r => loteKeyDds(r) === loteKey);
    if (linhas.length === 0) return;
    const ref = linhas[0];
    if (!confirm(`Excluir o lançamento de DDS de ${formatSimpleDate(ref.data_dds)} — ${ref.frente_responsavel || ''}? Isso vai apagar ${linhas.length} registro(s) (1 por colaborador). Essa ação não pode ser desfeita.`)) return;
    try {
        await supabaseDeleteMany('dds_realizados', linhas.map(r => r.id));
        const idsExcluidos = new Set(linhas.map(r => r.id));
        allDdsRealizados = allDdsRealizados.filter(r => !idsExcluidos.has(r.id));
        renderDdsLancamentosRecentes();
        renderDdsPanel();
        renderDdsFechamentoSemanal();
    } catch (err) {
        console.error('Erro ao excluir lançamento de DDS:', err);
        alert('❌ Falha ao excluir: ' + err.message);
    }
}

// Preenche o formulário de "Lançar DDS" com os dados do lote escolhido pra corrigir e
// reenviar - carregarEquipeFrenteDds() monta a equipe INTEIRA da frente (todo mundo
// presente por padrão), depois ajusta: quem não estava no lote fica desmarcado, quem
// estava recebe de volta o emociograma/ação-tratativa salvos. salvarLancamentoDds() usa
// lancDdsLoteEmEdicao pra apagar o lote antigo antes de gravar o corrigido.
function editarLoteDds(loteKey) {
    const linhas = allDdsRealizados.filter(r => loteKeyDds(r) === loteKey);
    if (linhas.length === 0) return;
    const ref = linhas[0];

    document.getElementById('lancDdsData').value = ref.data_dds || '';
    document.getElementById('lancDdsFrente').value = ref.frente_responsavel || '';
    carregarEquipeFrenteDds(); // já reseta lancDdsEmociogramaPorMatricula/lancDdsAcaoTratativaPorMatricula

    document.getElementById('lancDdsTema').value = ref.tema || '';
    document.getElementById('lancDdsTurno').value = ref.turno || '';
    document.getElementById('lancDdsHorario').value = ref.horario_inicio || '';
    document.getElementById('lancDdsDuracao').value = ref.duracao_min || 10;
    document.getElementById('lancDdsObservacoes').value = ref.observacoes || '';
    document.getElementById('lancDdsAddColab').value = '';
    document.getElementById('lancDdsAddColabResults').innerHTML = '';
    document.getElementById('lancDdsStatus').textContent = '';

    const matriculasDoLote = new Set(linhas.map(r => r.matricula));
    lancDdsEquipe.forEach((c, matricula) => { c.checked = matriculasDoLote.has(matricula); });
    linhas.forEach(r => {
        if (r.emociograma) lancDdsEmociogramaPorMatricula[r.matricula] = r.emociograma;
        if (r.acao_tratativa) lancDdsAcaoTratativaPorMatricula[r.matricula] = r.acao_tratativa;
        // Colaborador do lote que não está mais na equipe ATUAL da frente (mudou de frente
        // ou foi desligado depois do lançamento original) - adiciona de volta como avulso,
        // pra não sumir silenciosamente do lote sendo editado.
        if (!lancDdsEquipe.has(r.matricula)) {
            lancDdsEquipe.set(r.matricula, { nome: r.nome, funcao: r.funcao, setor: r.setor, checked: true });
        }
    });

    lancDdsLoteEmEdicao = loteKey;
    const avisoEl = document.getElementById('lancDdsEditandoAviso');
    if (avisoEl) {
        avisoEl.style.display = 'block';
        avisoEl.textContent = `✏️ Editando o lançamento de ${formatSimpleDate(ref.data_dds)} — ${ref.frente_responsavel || ''}. Clicar em "📤 Lançar DDS" substitui os ${linhas.length} registro(s) originais pelos valores ajustados abaixo.`;
    }
    renderListaPresencaDds();
    document.getElementById('lancDdsFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// LANÇAR SEMANA INTEIRA DE DDS - bate com como o usuário realmente trabalha: pega o
// formulário da semana já preenchido no papel e lança tudo assumindo presença o tempo
// todo, corrigindo só quem faltou ou teve emociograma diferente de "Bom". Convive com o
// lançamento de 1 dia acima (nenhum substitui o outro) - cada dia da semana lançado em
// bloco vira um lote independente (ver loteKeyDds), então dá pra excluir/editar um dia
// específico depois com a mesma Correção 1 de cima.
// ============================================

const DDS_SEMANA_ESTADO_CICLO = { bom: 'regular', regular: 'ruim', ruim: 'ausente', ausente: 'bom' };
const DDS_SEMANA_ESTADO_VISUAL = {
    bom: { emoji: '🟢', cor: '#1a7f4b', bg: '#e6f7ee' },
    regular: { emoji: '🟡', cor: '#b78a00', bg: '#fff9e6' },
    ruim: { emoji: '🔴', cor: '#c0392b', bg: '#fdf2f2' },
    ausente: { emoji: '⬜', cor: '#888', bg: '#f0f0f0' }
};

function toggleLancarDdsSemana() {
    const card = document.getElementById('lancDdsSemanaCard');
    if (!card) return;
    const abrindo = card.style.display === 'none';
    card.style.display = abrindo ? 'block' : 'none';
    if (abrindo) {
        abrirFormLancarDdsSemana();
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function popularDdsSemanaFrenteSelect() {
    const sel = document.getElementById('lancDdsSemanaFrenteSelect');
    if (!sel || sel.options.length > 1) return;
    todasFrentesAtivas().forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        sel.appendChild(opt);
    });
}

function abrirFormLancarDdsSemana() {
    document.getElementById('lancDdsSemanaFrenteSelect').value = '';
    document.getElementById('lancDdsSemanaDataInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('lancDdsSemanaTurnoSelect').value = '';
    document.getElementById('lancDdsSemanaHorarioInput').value = '';
    document.getElementById('lancDdsSemanaDuracaoInput').value = '10';
    document.getElementById('lancDdsSemanaStatus').textContent = '';
    popularDdsSemanaFrenteSelect();
    lancDdsSemanaFrente = '';
    lancDdsSemanaTurno = '';
    lancDdsSemanaHorario = '';
    lancDdsSemanaDuracao = 10;
    lancDdsSemanaDias = [];
    lancDdsSemanaTemas = {};
    lancDdsSemanaEquipe = new Map();
    lancDdsSemanaEstados = {};
    lancDdsSemanaAcaoTratativa = {};
    renderLancDdsSemanaTemas();
    renderLancDdsSemanaGrade();
    renderLancDdsSemanaAcoes();
}

// Trocar de frente OU de data de referência sempre reconstrói a semana + a equipe do zero -
// mesmo raciocínio de "a grade é sempre de UMA frente por vez" já usado no lançamento de 1
// dia. Segunda a sexta começa 🟢 Bom (padrão real: a maioria só trabalha dia útil); sábado/
// domingo começam ⬜ Ausente, mas dá pra clicar e ativar pra frentes que trabalham fim de
// semana (ex: segurança de barragem).
function onLancDdsSemanaFrenteOuDataChange() {
    lancDdsSemanaFrente = document.getElementById('lancDdsSemanaFrenteSelect').value;
    const dataRef = document.getElementById('lancDdsSemanaDataInput').value;

    if (!dataRef) {
        lancDdsSemanaDias = [];
        lancDdsSemanaEquipe = new Map();
        lancDdsSemanaEstados = {};
        lancDdsSemanaAcaoTratativa = {};
        renderLancDdsSemanaTemas();
        renderLancDdsSemanaGrade();
        renderLancDdsSemanaAcoes();
        return;
    }

    const seg = segundaDaSemana(parseLocalDate(dataRef));
    lancDdsSemanaDias = Array.from({ length: 7 }, (_, i) => new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i));

    // Tema por dia auto-preenchido do cronograma anual, só se ainda não tiver um valor
    // pra essa data (não sobrescreve edição manual já feita numa troca de frente pra
    // mesma semana).
    lancDdsSemanaDias.forEach(d => {
        const iso = toISODateLocal(d);
        if (lancDdsSemanaTemas[iso] === undefined) {
            const cronograma = allDdsTemasCronograma.find(t => t.data === iso);
            lancDdsSemanaTemas[iso] = cronograma ? cronograma.tema : '';
        }
    });

    lancDdsSemanaEquipe = new Map();
    lancDdsSemanaEstados = {};
    lancDdsSemanaAcaoTratativa = {};
    if (lancDdsSemanaFrente) {
        allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === lancDdsSemanaFrente).forEach(e => {
            lancDdsSemanaEquipe.set(e.id, { nome: e.nome, funcao: e.funcao, setor: e.setor });
            const porDia = {};
            lancDdsSemanaDias.forEach(d => {
                const diaSemana = d.getDay();
                const emFerias = typeof colaboradorEstaEmFerias === 'function' && colaboradorEstaEmFerias(e.id, d);
                porDia[toISODateLocal(d)] = (diaSemana === 0 || diaSemana === 6 || emFerias) ? 'ausente' : 'bom';
            });
            lancDdsSemanaEstados[e.id] = porDia;
        });
    }

    renderLancDdsSemanaTemas();
    renderLancDdsSemanaGrade();
    renderLancDdsSemanaAcoes();
}

function onLancDdsSemanaTemaChange(dataIso, valor) {
    lancDdsSemanaTemas[dataIso] = valor;
}

function renderLancDdsSemanaTemas() {
    const wrap = document.getElementById('lancDdsSemanaTemasWrap');
    if (!wrap) return;
    if (lancDdsSemanaDias.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<label style="display:block; margin-bottom:6px; color:var(--text-light); font-weight:600; font-size:12.5px;">Tema de cada dia</label>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap:8px;">
        ${lancDdsSemanaDias.map(d => {
            const iso = toISODateLocal(d);
            const label = `${NOMES_DIAS_SEMANA[d.getDay()].slice(0, 3).toUpperCase()} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            return `<div>
                <label style="display:block; margin-bottom:3px; font-size:11px; color:var(--text-light);">${label}</label>
                <input type="text" list="lancDdsTemaSugestoes" value="${escapeHTML(lancDdsSemanaTemas[iso] || '')}" oninput="onLancDdsSemanaTemaChange('${iso}', this.value)" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; box-sizing:border-box;">
            </div>`;
        }).join('')}
        </div>`;
}

// Clicar cicla 🟢 Bom → 🟡 Regular → 🔴 Ruim → ⬜ Ausente → volta pro 🟢 (ver
// DDS_SEMANA_ESTADO_CICLO) - "Ausente" não gera lançamento nesse dia pra essa pessoa.
function cicloEstadoDdsSemana(matricula, dataIso) {
    if (!lancDdsSemanaEstados[matricula]) lancDdsSemanaEstados[matricula] = {};
    const atual = lancDdsSemanaEstados[matricula][dataIso] || 'ausente';
    lancDdsSemanaEstados[matricula][dataIso] = DDS_SEMANA_ESTADO_CICLO[atual];
    renderLancDdsSemanaGrade();
    renderLancDdsSemanaAcoes();
}

function renderLancDdsSemanaGrade() {
    const wrap = document.getElementById('lancDdsSemanaGradeWrap');
    if (!wrap) return;
    if (lancDdsSemanaEquipe.size === 0 || lancDdsSemanaDias.length === 0) {
        wrap.innerHTML = '<div class="db-list-empty">Selecione a frente e a data de referência acima.</div>';
        return;
    }
    const entries = Array.from(lancDdsSemanaEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    const headerDias = lancDdsSemanaDias.map(d => `<th style="text-align:center; padding:4px 6px; min-width:56px;">${NOMES_DIAS_SEMANA[d.getDay()].slice(0, 3).toUpperCase()}<br>${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</th>`).join('');
    const linhas = entries.map(([matricula, c]) => {
        const cels = lancDdsSemanaDias.map(d => {
            const iso = toISODateLocal(d);
            const emFerias = typeof colaboradorEstaEmFerias === 'function' && colaboradorEstaEmFerias(matricula, d);
            const estado = (lancDdsSemanaEstados[matricula] || {})[iso] || 'ausente';
            const v = DDS_SEMANA_ESTADO_VISUAL[estado];
            const titleTxt = emFerias ? `Férias / Afastado (Isenção SST) — ${estado}` : estado;
            return `<td style="text-align:center; padding:2px;">
                <button type="button" onclick="cicloEstadoDdsSemana('${escapeHTML(matricula)}', '${iso}')" title="${titleTxt}" style="border:2px solid ${v.cor}; background:${v.bg}; border-radius:8px; cursor:pointer; font-size:15px; padding:3px 8px; line-height:1; position:relative;">
                    ${v.emoji}
                    ${emFerias ? '<span style="position:absolute; bottom:-1px; right:-1px; font-size:8.5px;" title="Em Férias">🏖️</span>' : ''}
                </button>
            </td>`;
        }).join('');
        return `<tr><td style="padding:4px 8px; white-space:nowrap;">${escapeHTML(c.nome || '')}<div style="font-size:10.5px; color:var(--text-light);">${escapeHTML(c.funcao || '')} — Mat. ${escapeHTML(matricula)}</div></td>${cels}</tr>`;
    }).join('');
    wrap.innerHTML = `<table style="border-collapse:collapse; font-size:12px; width:100%;">
        <thead><tr style="color:var(--text-light);"><th style="text-align:left; padding:4px 8px;">Colaborador</th>${headerDias}</tr></thead>
        <tbody>${linhas}</tbody>
    </table>`;
}

function onLancDdsSemanaAcaoChange(chave, valor) {
    lancDdsSemanaAcaoTratativa[chave] = valor;
}

// Área de Ação/Tratativa fica FORA da grade (célula minúscula não tem espaço) - uma
// pra cada (colaborador, dia) marcado 🔴 Ruim, mesmo raciocínio de sigilo já aplicado no
// lançamento de 1 dia (nunca aparece fora da tela de lançamento).
function renderLancDdsSemanaAcoes() {
    const wrap = document.getElementById('lancDdsSemanaAcoesWrap');
    if (!wrap) return;
    const pendentes = [];
    lancDdsSemanaEquipe.forEach((c, matricula) => {
        const porDia = lancDdsSemanaEstados[matricula] || {};
        lancDdsSemanaDias.forEach(d => {
            const iso = toISODateLocal(d);
            if (porDia[iso] === 'ruim') pendentes.push({ matricula, nome: c.nome, dataIso: iso, dataLabel: formatSimpleDate(iso) });
        });
    });
    if (pendentes.length === 0) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<div style="font-weight:600; font-size:12px; margin-bottom:6px;">Ação/Tratativa (só pra quem ficou 🔴 Ruim em algum dia)</div>' +
        pendentes.map(p => {
            const chave = `${p.matricula}|${p.dataIso}`;
            const texto = lancDdsSemanaAcaoTratativa[chave] || '';
            const preenchida = !!texto.trim();
            return `<div style="margin-bottom:8px;">
                <label style="display:block; margin-bottom:3px; font-size:11px; color:var(--text-light);">${escapeHTML(p.nome || p.matricula)} — ${p.dataLabel}</label>
                <textarea rows="2" placeholder="Ex: conversa reservada, encaminhado ao RESP SMS..."
                    oninput="onLancDdsSemanaAcaoChange('${chave}', this.value); this.style.borderColor = this.value.trim() ? 'var(--border)' : '#c0392b';"
                    style="width:100%; padding:6px 8px; border:2px solid ${preenchida ? 'var(--border)' : '#c0392b'}; border-radius:6px; font-size:11.5px; box-sizing:border-box;">${escapeHTML(texto)}</textarea>
            </div>`;
        }).join('');
}

async function salvarLancamentoDdsSemana() {
    if (bloquearEdicaoSeNaoAutorizado('ddsma')) return;
    const statusEl = document.getElementById('lancDdsSemanaStatus');
    if (!lancDdsSemanaFrente) { statusEl.textContent = '❌ Selecione a Frente/Encarregado.'; statusEl.style.color = 'var(--danger)'; return; }
    if (lancDdsSemanaDias.length === 0) { statusEl.textContent = '❌ Selecione a data de referência.'; statusEl.style.color = 'var(--danger)'; return; }
    if (lancDdsSemanaEquipe.size === 0) { statusEl.textContent = '❌ Nenhum colaborador ativo cadastrado nessa frente.'; statusEl.style.color = 'var(--danger)'; return; }

    const duracao = lancDdsSemanaDuracao || 10;
    const cargaHoraria = duracao / 60;
    const tsBase = Date.now();

    // Um `ts` PRÓPRIO por dia (tsBase + índice do dia) garante um lote (id) diferente por
    // dia mesmo lançando a semana inteira num clique só - cada dia vira um lote
    // independente, editável/excluível sozinho depois pela Correção 1.
    const rows = [];
    lancDdsSemanaDias.forEach((d, idx) => {
        const iso = toISODateLocal(d);
        const tema = (lancDdsSemanaTemas[iso] || '').trim();
        const ts = tsBase + idx;
        lancDdsSemanaEquipe.forEach((c, matricula) => {
            const estado = (lancDdsSemanaEstados[matricula] || {})[iso] || 'ausente';
            if (estado === 'ausente') return;
            rows.push({
                id: `dds_${ts}_${matricula}`,
                data_dds: iso,
                frente_responsavel: lancDdsSemanaFrente,
                tema: tema || null,
                turno: lancDdsSemanaTurno || null,
                horario_inicio: lancDdsSemanaHorario || null,
                duracao_min: duracao,
                matricula,
                nome: c.nome,
                funcao: c.funcao,
                setor: c.setor,
                emociograma: estado,
                acao_tratativa: estado === 'ruim' ? (lancDdsSemanaAcaoTratativa[`${matricula}|${iso}`] || null) : null,
                rubrica_confirmada: true,
                carga_horaria: cargaHoraria,
                observacoes: null
            });
        });
    });

    if (rows.length === 0) {
        statusEl.textContent = '❌ Nenhum colaborador presente em nenhum dia - marque ao menos 1 pessoa como 🟢/🟡/🔴 em algum dia.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const diasComLancamento = new Set(rows.map(r => r.data_dds)).size;

    // Mesmo aviso de duplicidade do lançamento de 1 dia (ver
    // salvarLancamentoDds) - aqui verificado pra CADA dia da semana que vai
    // gerar lançamento, já que "Lançar Semana Inteira" grava um lote por dia
    // (ver loteKeyDds / tsBase+idx acima).
    const diasDuplicados = Array.from(new Set(rows.map(r => r.data_dds))).filter(dia =>
        lotesRecentesDds(9999).some(lote => lote.data_dds === dia && lote.frente_responsavel === lancDdsSemanaFrente)
    );
    if (diasDuplicados.length > 0) {
        const confirmaDuplicado = confirm(
            `⚠️ "${lancDdsSemanaFrente}" já tem lançamento de DDS em ${diasDuplicados.length} dia(s) desta semana:\n\n` +
            diasDuplicados.map(d => formatSimpleDate(d)).join('\n') +
            `\n\nSe foi engano (semana já lançada antes), cancele e confira em "Lançamentos Recentes" antes de lançar de novo.\n` +
            `Se esses dias realmente tiveram uma 2ª rodada de DDS, pode confirmar e lançar mesmo assim.\n\n` +
            `Lançar mesmo assim?`
        );
        if (!confirmaDuplicado) return;
    }

    if (!confirm(`Isso vai gerar ${rows.length} registro(s) de DDS (${diasComLancamento} dia(s) com pelo menos 1 presença). Continuar?`)) return;

    statusEl.textContent = `Enviando ${rows.length} registro(s)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('dds_realizados', rows);
        allDdsRealizados = allDdsRealizados.concat(rows);
        statusEl.textContent = `✅ ${rows.length} registro(s) lançado(s) em ${diasComLancamento} dia(s) da semana.`;
        statusEl.style.color = 'var(--success)';
        renderDdsPanel();
        renderDdsFechamentoSemanal();
        renderDdsLancamentosRecentes();
        setTimeout(() => abrirFormLancarDdsSemana(), 1800);
    } catch (err) {
        console.error('Erro ao lançar semana de DDS:', err);
        statusEl.textContent = '❌ Falha ao lançar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ============================================
// CALENDÁRIO DE TEMAS DDS (dds_temas_cronograma) - o cronograma anual que o usuário já
// mantém fora do sistema (TEMAS_DDS_2026.pdf), 1 tema por dia útil pra TODAS as frentes
// naquele dia (diferente de treinamentos_cronograma, que é por treinamento+frente). Só
// alimenta sugestão/auto-preenchimento (Lançar DDS e a ficha impressa) - editar aqui nunca
// trava nada, é só manter esse calendário atualizado (ex: ajustar um feriado que o
// cronograma original não previu) sem precisar mexer no banco na mão.
// ============================================

let ddsCalendarioFiltroAno = new Date().getFullYear();
let ddsCalendarioFiltroMes = new Date().getMonth();
let ddsCalendarioEditandoData = null; // 'YYYY-MM-DD' da linha em edição, ou null

function diasUteisDoMes(ano, mes) {
    const dias = [];
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    for (let d = 1; d <= ultimoDia; d++) {
        const data = new Date(ano, mes, d);
        const diaSemana = data.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) dias.push(data); // exclui sáb/dom
    }
    return dias;
}

function popularFiltroDdsCalendario() {
    const anoSel = document.getElementById('ddsCalendarioFiltroAno');
    const mesSel = document.getElementById('ddsCalendarioFiltroMes');
    if (anoSel && !anoSel.dataset.inicializado) {
        const anos = new Set([new Date().getFullYear()]);
        allDdsTemasCronograma.forEach(t => { if (t.data) anos.add(parseLocalDate(t.data).getFullYear()); });
        anos.add(new Date().getFullYear() + 1); // sempre deixa o ano seguinte disponível, mesmo sem seed ainda
        Array.from(anos).sort().forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            anoSel.appendChild(opt);
        });
        anoSel.value = ddsCalendarioFiltroAno;
        anoSel.dataset.inicializado = '1';
    }
    if (mesSel && !mesSel.dataset.inicializado) {
        mesSel.value = ddsCalendarioFiltroMes;
        mesSel.dataset.inicializado = '1';
    }
}

function onDdsCalendarioFiltroChange() {
    ddsCalendarioFiltroAno = parseInt(document.getElementById('ddsCalendarioFiltroAno').value, 10);
    ddsCalendarioFiltroMes = parseInt(document.getElementById('ddsCalendarioFiltroMes').value, 10);
    ddsCalendarioEditandoData = null;
    renderDdsCalendarioTemas();
}

function editarDdsTemaDia(data) {
    ddsCalendarioEditandoData = data;
    renderDdsCalendarioTemas();
}

function cancelarEdicaoDdsTemaDia() {
    ddsCalendarioEditandoData = null;
    renderDdsCalendarioTemas();
}

// Se a data salva/editada é a mesma já selecionada em Lançar DDS, atualiza o
// auto-preenchimento na hora, sem precisar trocar de data e voltar pra ver o efeito.
function sincronizarLancDdsTemaSeMesmaData(data) {
    const lancDdsDataEl = document.getElementById('lancDdsData');
    if (lancDdsDataEl && lancDdsDataEl.value === data) onLancDdsDataChange();
}

async function salvarDdsTemaDia(data) {
    const input = document.getElementById(`ddsCalendarioTemaInput-${data}`);
    const tema = input.value.trim();
    const statusEl = document.getElementById('ddsCalendarioStatus');
    if (!tema) {
        if (statusEl) { statusEl.textContent = '❌ Informe um tema.'; statusEl.style.color = 'var(--danger)'; }
        return;
    }
    const row = { id: data, data, tema };
    try {
        await supabaseUpsert('dds_temas_cronograma', [row]);
        const idx = allDdsTemasCronograma.findIndex(t => t.data === data);
        if (idx >= 0) allDdsTemasCronograma[idx] = row; else allDdsTemasCronograma.push(row);
        ddsCalendarioEditandoData = null;
        if (statusEl) { statusEl.textContent = '✅ Tema salvo.'; statusEl.style.color = 'var(--success)'; }
        renderDdsCalendarioTemas();
        popularDdsTemaDatalist();
        sincronizarLancDdsTemaSeMesmaData(data);
    } catch (err) {
        console.error('Erro ao salvar tema do dia (DDS):', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function renderDdsCalendarioTemas() {
    popularFiltroDdsCalendario();
    const container = document.getElementById('ddsCalendarioLista');
    if (!container) return;
    const dias = diasUteisDoMes(ddsCalendarioFiltroAno, ddsCalendarioFiltroMes);
    if (dias.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum dia útil nesse mês.</div>';
        return;
    }
    container.innerHTML = dias.map(d => {
        const dataIso = toISODateLocal(d);
        const cronograma = allDdsTemasCronograma.find(t => t.data === dataIso);
        const editando = ddsCalendarioEditandoData === dataIso;
        const label = `${NOMES_DIAS_SEMANA[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (editando) {
            return `<div class="db-list-item" style="display:flex; flex-direction:column; gap:6px;">
                <div class="db-list-item-title">${escapeHTML(label)}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <input type="text" id="ddsCalendarioTemaInput-${dataIso}" list="lancDdsTemaSugestoes" value="${escapeHTML(cronograma ? cronograma.tema : '')}" style="flex:1; min-width:200px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12px; box-sizing:border-box;">
                    <button class="db-clear-btn" onclick="salvarDdsTemaDia('${dataIso}')">💾 Salvar</button>
                    <button class="db-clear-btn" onclick="cancelarEdicaoDdsTemaDia()">Cancelar</button>
                </div>
            </div>`;
        }
        return `<div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
            <div>
                <div class="db-list-item-title">${escapeHTML(label)}</div>
                <div class="db-list-item-sub">${cronograma ? escapeHTML(cronograma.tema) : '— sem tema cadastrado —'}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <button class="db-clear-btn" style="color:#0284c7; border-color:#bae6fd; background:#f0f9ff; display:inline-flex; align-items:center; gap:5px;" onclick="abrirPastaFotosOperacional('02_DDSMA', '${dataIso}', '${escapeHTML(cronograma ? cronograma.tema : 'DDSMA')}')" title="Acessar ou preparar pasta de fotos e evidências no Google Drive">📷 Pasta Drive</button>
                <button class="db-clear-btn" onclick="editarDdsTemaDia('${dataIso}')">✏️ Editar</button>
            </div>
        </div>`;
    }).join('');
}

// "+ Adicionar dia" cobre datas fora dos dias úteis do mês em tela (ex: um sábado
// excepcional) ou de um mês/ano ainda não navegado (ex: preencher 2027 quando chegar) -
// simples data + tema, mesmo upsert de salvarDdsTemaDia.
function abrirAdicionarDdsTemaDia() {
    const wrap = document.getElementById('ddsCalendarioAdicionarWrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    document.getElementById('ddsCalendarioNovaData').value = '';
    document.getElementById('ddsCalendarioNovoTema').value = '';
}

function fecharAdicionarDdsTemaDia() {
    const wrap = document.getElementById('ddsCalendarioAdicionarWrap');
    if (wrap) wrap.style.display = 'none';
}

async function salvarNovoDdsTemaDia() {
    const data = document.getElementById('ddsCalendarioNovaData').value;
    const tema = document.getElementById('ddsCalendarioNovoTema').value.trim();
    const statusEl = document.getElementById('ddsCalendarioStatus');
    if (!data || !tema) {
        if (statusEl) { statusEl.textContent = '❌ Informe a data e o tema.'; statusEl.style.color = 'var(--danger)'; }
        return;
    }
    const row = { id: data, data, tema };
    try {
        await supabaseUpsert('dds_temas_cronograma', [row]);
        const idx = allDdsTemasCronograma.findIndex(t => t.data === data);
        if (idx >= 0) allDdsTemasCronograma[idx] = row; else allDdsTemasCronograma.push(row);
        fecharAdicionarDdsTemaDia();
        if (statusEl) { statusEl.textContent = '✅ Dia adicionado.'; statusEl.style.color = 'var(--success)'; }
        renderDdsCalendarioTemas();
        popularDdsTemaDatalist();
        sincronizarLancDdsTemaSeMesmaData(data);
    } catch (err) {
        console.error('Erro ao adicionar tema do dia (DDS):', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// ============================================
// FECHAMENTO SEMANAL DE DDS (RESP SMS) - confirma que uma semana (segunda a domingo) de
// uma frente foi conferida, com o nome de quem confirmou e quando. Não bloqueia nada (o
// DDS já foi lançado antes) - é só um registro de "essa semana foi revisada", pro RESP SMS
// não perder o controle de quais semanas/frentes já passaram pelo carimbo dele.
// ============================================

let ddsFechamentoFrenteSelecionada = '';

function toISODateLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Segunda-feira da semana que contém a data informada.
function segundaDaSemana(d) {
    const dia = d.getDay(); // 0=domingo..6=sábado
    const diff = dia === 0 ? -6 : 1 - dia;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

// Semana (segunda-feira, em ISO) mais recente que já tem pelo menos 1 DDS lançado pra essa
// frente e ainda não tem fechamento registrado - null se não houver nenhuma (frente sem
// DDS ainda, ou todas as semanas com DDS já fechadas).
function proximaSemanaParaFecharDds(frente) {
    if (!frente) return null;
    const semanasComDds = new Set();
    allDdsRealizados.filter(r => r.frente_responsavel === frente && r.data_dds).forEach(r => {
        semanasComDds.add(toISODateLocal(segundaDaSemana(parseLocalDate(r.data_dds))));
    });
    const semanasFechadas = new Set(
        allDdsFechamentoSemanal.filter(f => f.frente_responsavel === frente).map(f => f.semana_inicio)
    );
    const candidatas = Array.from(semanasComDds).filter(s => !semanasFechadas.has(s)).sort().reverse();
    return candidatas[0] || null;
}

function diasComDdsNaSemana(frente, semanaInicioStr) {
    const seg = parseLocalDate(semanaInicioStr);
    const fim = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
    const dias = new Set();
    allDdsRealizados.filter(r => r.frente_responsavel === frente && r.data_dds).forEach(r => {
        const d = parseLocalDate(r.data_dds);
        if (d >= seg && d <= fim) dias.add(r.data_dds);
    });
    return dias.size;
}

function onDdsFechamentoFrenteChange() {
    ddsFechamentoFrenteSelecionada = document.getElementById('ddsFechamentoFrente').value;
    renderDdsFechamentoSemanal();
}

function renderDdsFechamentoSemanal() {
    const sel = document.getElementById('ddsFechamentoFrente');
    if (sel && sel.options.length <= 1) {
        todasFrentesAtivas().forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            sel.appendChild(opt);
        });
    }
    const infoEl = document.getElementById('ddsFechamentoInfo');
    const formWrap = document.getElementById('ddsFechamentoFormWrap');
    const frente = ddsFechamentoFrenteSelecionada;
    if (infoEl && formWrap) {
        if (!frente) {
            infoEl.textContent = 'Selecione uma frente pra ver a semana pendente de fechamento.';
            formWrap.style.display = 'none';
        } else {
            const semanaInicio = proximaSemanaParaFecharDds(frente);
            if (!semanaInicio) {
                infoEl.textContent = 'Nenhuma semana pendente de fechamento pra essa frente (sem DDS lançado ainda, ou todas as semanas com DDS já foram fechadas).';
                formWrap.style.display = 'none';
            } else {
                const seg = parseLocalDate(semanaInicio);
                const fim = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
                const semanaFim = toISODateLocal(fim);
                const dias = diasComDdsNaSemana(frente, semanaInicio);
                infoEl.innerHTML = `Semana de <b>${formatSimpleDate(semanaInicio)}</b> a <b>${formatSimpleDate(semanaFim)}</b> — <b>${dias}</b> dia(s) de DDS lançado(s) nessa semana.`;
                formWrap.style.display = 'block';
                document.getElementById('ddsFechamentoSemanaInicio').value = semanaInicio;
                document.getElementById('ddsFechamentoSemanaFim').value = semanaFim;
                document.getElementById('ddsFechamentoRespSms').value = '';
                document.getElementById('ddsFechamentoObs').value = '';
                document.getElementById('ddsFechamentoStatus').textContent = '';
            }
        }
    }
    renderDdsFechamentosLista();
}

async function confirmarFechamentoDds() {
    const statusEl = document.getElementById('ddsFechamentoStatus');
    const frente = ddsFechamentoFrenteSelecionada;
    const semanaInicio = document.getElementById('ddsFechamentoSemanaInicio').value;
    const semanaFim = document.getElementById('ddsFechamentoSemanaFim').value;
    const respSms = document.getElementById('ddsFechamentoRespSms').value.trim();
    const obs = document.getElementById('ddsFechamentoObs').value.trim();
    if (!frente || !semanaInicio) { statusEl.textContent = '❌ Selecione uma frente com semana pendente.'; statusEl.style.color = 'var(--danger)'; return; }
    if (!respSms) { statusEl.textContent = '❌ Informe o nome do RESP SMS.'; statusEl.style.color = 'var(--danger)'; return; }

    const row = {
        id: `ddsfech_${Date.now()}`,
        frente_responsavel: frente,
        semana_inicio: semanaInicio,
        semana_fim: semanaFim,
        resp_sms_nome: respSms,
        confirmado_em: new Date().toISOString(),
        observacoes_semana: obs || null
    };
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('dds_fechamento_semanal', [row]);
        allDdsFechamentoSemanal.push(row);
        statusEl.textContent = '✅ Fechamento confirmado.';
        statusEl.style.color = 'var(--success)';
        renderDdsFechamentoSemanal();
    } catch (err) {
        console.error('Erro ao confirmar fechamento semanal de DDS:', err);
        statusEl.textContent = '❌ Falha: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

function renderDdsFechamentosLista() {
    const el = document.getElementById('ddsFechamentosLista');
    if (!el) return;
    const linhas = allDdsFechamentoSemanal.slice().sort((a, b) => (b.confirmado_em || '').localeCompare(a.confirmado_em || '')).slice(0, 30);
    if (linhas.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhuma semana fechada ainda.</div>';
        return;
    }
    el.innerHTML = linhas.map(f => `
        <div class="db-list-item">
            <div class="db-list-item-title">${escapeHTML(f.frente_responsavel || '')} — ${formatSimpleDate(f.semana_inicio)} a ${formatSimpleDate(f.semana_fim)}</div>
            <div class="db-list-item-sub">RESP SMS: ${escapeHTML(f.resp_sms_nome || '—')} — confirmado em ${f.confirmado_em ? new Date(f.confirmado_em).toLocaleString('pt-BR') : '—'}${f.observacoes_semana ? ' — ' + escapeHTML(f.observacoes_semana) : ''}</div>
        </div>`).join('');
}

// ============================================
// RESUMO DO DDS - mesmo padrão de filtro ano/mês/período da Visão Geral de Treinamentos
// (clonado, não reaproveitado direto, pra essa aba funcionar mesmo se o usuário nunca
// passou pela Visão Geral antes).
// ============================================

let ddsFilter = 'mes';
let ddsFiltroAno = '';
let ddsFiltroMes = '';

function popularFiltroAnoDds() {
    const anos = new Set([new Date().getFullYear()]);
    allDdsRealizados.forEach(r => { if (r.data_dds) anos.add(parseLocalDate(r.data_dds).getFullYear()); });
    popularSelectAnos('ddsFiltroAno', anos);
}

function getDdsDateRange() {
    const tituloEl = document.getElementById('ddsPeriodoTitulo');
    if (ddsFiltroAno) {
        const ano = parseInt(ddsFiltroAno, 10);
        if (ddsFiltroMes !== '') {
            const mes = parseInt(ddsFiltroMes, 10);
            if (tituloEl) tituloEl.textContent = `${NOMES_MESES[mes]}/${ano}`;
            return { inicio: new Date(ano, mes, 1), fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999) };
        }
        if (tituloEl) tituloEl.textContent = `Ano ${ano} (completo)`;
        return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31, 23, 59, 59, 999) };
    }
    const now = new Date();
    const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    let inicio, titulo;
    if (ddsFilter === 'trimestre') { inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1); titulo = 'Últimos 3 meses'; }
    else if (ddsFilter === 'ano') { inicio = new Date(now.getFullYear(), 0, 1); titulo = `Ano ${now.getFullYear()} (até hoje)`; }
    else if (ddsFilter === 'todos') { inicio = new Date(2000, 0, 1); titulo = 'Todo o histórico'; }
    else { inicio = new Date(now.getFullYear(), now.getMonth(), 1); titulo = 'Este mês'; }
    if (tituloEl) tituloEl.textContent = titulo;
    return { inicio, fim };
}

function setDdsFilter(filter) {
    ddsFilter = filter;
    ddsFiltroAno = '';
    ddsFiltroMes = '';
    const anoSel = document.getElementById('ddsFiltroAno'); if (anoSel) anoSel.value = '';
    const mesSel = document.getElementById('ddsFiltroMes'); if (mesSel) mesSel.value = '';
    ['btnFiltroDdsMes', 'btnFiltroDdsTrimestre', 'btnFiltroDdsAno', 'btnFiltroDdsTodos'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    const map = { mes: 'btnFiltroDdsMes', trimestre: 'btnFiltroDdsTrimestre', ano: 'btnFiltroDdsAno', todos: 'btnFiltroDdsTodos' };
    document.getElementById(map[filter])?.classList.add('active');
    renderDdsPanel();
}

function onDdsFiltroAnoMesChange() {
    ddsFiltroAno = document.getElementById('ddsFiltroAno').value;
    ddsFiltroMes = document.getElementById('ddsFiltroMes').value;
    if (ddsFiltroAno) {
        ['btnFiltroDdsMes', 'btnFiltroDdsTrimestre', 'btnFiltroDdsAno', 'btnFiltroDdsTodos'].forEach(id => {
            document.getElementById(id)?.classList.remove('active');
        });
    }
    renderDdsPanel();
}

// Lista todos os dias do calendário entre inicio/fim (inclusive), como strings ISO -
// reaproveitada tanto pela tabela em tela quanto pela impressão do relatório mensal
// (PARTE 7b), pra nunca divergir.
function diasDoIntervaloDds(inicio, fim) {
    const dias = [];
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const fimDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
    while (cursor <= fimDia) {
        dias.push(toISODateLocal(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    return dias;
}

// Reproduz o layout do controle_de_dds.pdf que o usuário já mantém na mão hoje: 1 linha
// por frente, 1 coluna por dia do período, célula = nº de participantes daquele dia.
// Inclui frentes fora de todasFrentesAtivas() que porventura tenham DDS lançado (ex: frente
// extinta depois) - não esconde dado real só porque a frente não tem mais colaborador
// ativo hoje.
function tabelaControleDds(inicio, fim) {
    const dias = diasDoIntervaloDds(inicio, fim);
    const porFrenteDia = new Map();
    const porFrenteTotalHoras = new Map();
    frentesAtivasDds().forEach(f => { porFrenteDia.set(f, new Map()); porFrenteTotalHoras.set(f, 0); });
    allDdsRealizados.forEach(r => {
        if (!r.data_dds) return;
        const d = parseLocalDate(r.data_dds);
        if (d < inicio || d > fim) return;
        const frente = resolverFrenteDds(r.frente_responsavel || '(sem frente)');
        if (!porFrenteDia.has(frente)) { porFrenteDia.set(frente, new Map()); porFrenteTotalHoras.set(frente, 0); }
        const mapaDias = porFrenteDia.get(frente);
        mapaDias.set(r.data_dds, (mapaDias.get(r.data_dds) || 0) + 1);
        porFrenteTotalHoras.set(frente, porFrenteTotalHoras.get(frente) + (parseFloat(r.carga_horaria) || 0));
    });
    // Histórico agregado importado da planilha (jan-ago/26, antes do sistema existir) -
    // cada registro já É a quantidade de participantes daquele dia (não 1 linha por
    // pessoa como em allDdsRealizados), por isso soma direto em vez de contar +1.
    allDdsHistoricoAgregado.forEach(h => {
        if (!h.data_dds) return;
        const d = parseLocalDate(h.data_dds);
        if (d < inicio || d > fim) return;
        const frente = resolverFrenteDds(h.frente_responsavel || '(sem frente)');
        if (!porFrenteDia.has(frente)) { porFrenteDia.set(frente, new Map()); porFrenteTotalHoras.set(frente, 0); }
        const mapaDias = porFrenteDia.get(frente);
        mapaDias.set(h.data_dds, (mapaDias.get(h.data_dds) || 0) + (parseInt(h.participantes) || 0));
        porFrenteTotalHoras.set(frente, porFrenteTotalHoras.get(frente) + (parseFloat(h.carga_horaria) || 0));
    });
    const frentes = Array.from(porFrenteDia.keys()).sort();
    return { dias, frentes, porFrenteDia, porFrenteTotalHoras };
}

function renderDdsTabelaControle(inicio, fim) {
    const container = document.getElementById('ddsTabelaControleWrap');
    if (!container) return;
    const { dias, frentes, porFrenteDia, porFrenteTotalHoras } = tabelaControleDds(inicio, fim);
    if (frentes.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma frente ativa cadastrada em Efetivo.</div>';
        return;
    }
    const headerDias = dias.map(d => `<th style="text-align:center; min-width:28px; padding:3px 4px;">${String(parseLocalDate(d).getDate()).padStart(2, '0')}</th>`).join('');
    const linhas = frentes.map(f => {
        const mapaDias = porFrenteDia.get(f) || new Map();
        const totalPeriodo = Array.from(mapaDias.values()).reduce((s, v) => s + v, 0);
        const cels = dias.map(d => {
            const n = mapaDias.get(d) || 0;
            return `<td style="text-align:center; padding:3px 4px; color:${n > 0 ? 'inherit' : 'var(--text-light)'};">${n > 0 ? n : '—'}</td>`;
        }).join('');
        const horas = porFrenteTotalHoras.get(f) || 0;
        return `<tr><td style="font-weight:600; white-space:nowrap; padding:3px 8px;">${escapeHTML(f)}</td>${cels}<td style="text-align:center; font-weight:600; padding:3px 6px;">${totalPeriodo}</td><td style="text-align:center; font-weight:600; padding:3px 6px;">${horas.toLocaleString('pt-BR')}h</td></tr>`;
    }).join('');
    container.innerHTML = `<div style="overflow-x:auto;"><table style="border-collapse:collapse; font-size:11.5px; width:100%;">
        <thead><tr style="color:var(--text-light);"><th style="text-align:left; padding:3px 8px;">Frente</th>${headerDias}<th style="padding:3px 6px;">Total</th><th style="padding:3px 6px;">Horas</th></tr></thead>
        <tbody>${linhas}</tbody>
    </table></div>`;
}

// Lista de sigilo (PARTE 4) - só dentro desta tela, nunca em relatório/impressão. Mostra o
// texto completo de Ação/Tratativa (ou avisa que ainda não tem) pra todo mundo marcado
// 🔴 Ruim - não é filtrada pelo período do Resumo de propósito (é uma lista de
// acompanhamento, não uma métrica de período).
function renderAcoesTratativasPendentesDds() {
    const el = document.getElementById('ddsAcoesTratativasLista');
    if (!el) return;
    const ruins = allDdsRealizados.filter(r => r.emociograma === 'ruim').sort((a, b) => (b.data_dds || '').localeCompare(a.data_dds || ''));
    if (ruins.length === 0) {
        el.innerHTML = '<div class="db-list-empty">Nenhum registro "Ruim" no histórico.</div>';
        return;
    }
    el.innerHTML = ruins.map(r => `
        <div class="db-list-item db-item-warning">
            <div class="db-list-item-title">${escapeHTML(r.nome || r.matricula)} — ${formatSimpleDate(r.data_dds)} (${escapeHTML(r.frente_responsavel || '')})</div>
            <div class="db-list-item-sub">${r.acao_tratativa ? escapeHTML(r.acao_tratativa) : '⚠️ Sem ação/tratativa registrada ainda.'}</div>
        </div>`).join('');
}

function renderDdsGerenciarFrentes() {
    const container = document.getElementById('ddsGerenciarFrentesLista');
    if (!container) return;
    const config = new Map(allDdsFrentesConfig.map(c => [c.id, c.ativo !== false]));
    const todas = new Set(todasFrentesAtivas().map(resolverFrenteDds));
    allDdsFrentesConfig.forEach(c => todas.add(resolverFrenteDds(c.id)));
    const frentes = Array.from(todas).sort();
    if (frentes.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma frente cadastrada em Efetivo ainda.</div>';
        return;
    }
    container.innerHTML = frentes.map(f => {
        const ativo = config.has(f) ? config.get(f) : true;
        return `<label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer; padding:2px 0;">
            <input type="checkbox" ${ativo ? 'checked' : ''} onchange="toggleFrenteDdsAtiva('${escapeHTML(f)}', this.checked)" style="width:16px; height:16px; cursor:pointer; flex-shrink:0;">
            <span>${escapeHTML(f)}</span>
        </label>`;
    }).join('');
}

async function toggleFrenteDdsAtiva(frente, ativo) {
    try {
        await supabaseUpsert('dds_frentes_config', [{ id: frente, ativo }]);
        const existente = allDdsFrentesConfig.find(c => c.id === frente);
        if (existente) existente.ativo = ativo;
        else allDdsFrentesConfig.push({ id: frente, ativo });
        const { inicio, fim } = getDdsDateRange();
        renderDdsTabelaControle(inicio, fim);
    } catch (e) {
        alert('Erro ao salvar: ' + e.message);
        renderDdsGerenciarFrentes();
    }
}

async function adicionarFrenteDdsManual() {
    const input = document.getElementById('ddsNovaFrenteInput');
    const nome = (input.value || '').trim().toUpperCase();
    if (!nome) return;
    if (todasFrentesAtivas().includes(nome) || allDdsFrentesConfig.some(c => c.id === nome)) {
        alert('Essa frente já está na lista.');
        return;
    }
    try {
        await supabaseUpsert('dds_frentes_config', [{ id: nome, ativo: true }]);
        allDdsFrentesConfig.push({ id: nome, ativo: true });
        input.value = '';
        renderDdsGerenciarFrentes();
        const { inicio, fim } = getDdsDateRange();
        renderDdsTabelaControle(inicio, fim);
    } catch (e) {
        alert('Erro ao adicionar: ' + e.message);
    }
}

function renderDdsAliasFrentes() {
    const container = document.getElementById('ddsAliasFrentesLista');
    if (!container) return;
    if (allDdsFrentesAlias.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma mesclagem cadastrada ainda.</div>';
        return;
    }
    container.innerHTML = allDdsFrentesAlias.slice().sort((a, b) => a.id.localeCompare(b.id)).map(a => `
        <div style="display:flex; align-items:center; gap:8px; font-size:12px;">
            <span style="flex:1;"><b>${escapeHTML(a.id)}</b> conta como <b>${escapeHTML(a.frente_atual)}</b></span>
            <button onclick="desfazerMesclarFrenteDds('${escapeHTML(a.id)}')" title="Desfazer" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px; padding:2px 6px;">✕</button>
        </div>`).join('');
}

async function mesclarFrenteDds() {
    const inputAntigo = document.getElementById('ddsAliasNomeAntigoInput');
    const inputAtual = document.getElementById('ddsAliasNomeAtualInput');
    const nomeAntigo = (inputAntigo.value || '').trim().toUpperCase();
    const nomeAtual = (inputAtual.value || '').trim().toUpperCase();
    if (!nomeAntigo || !nomeAtual) { alert('Preencha os dois nomes.'); return; }
    if (nomeAntigo === nomeAtual) { alert('Os dois nomes não podem ser iguais.'); return; }
    if (!confirm(`Confirma: "${nomeAntigo}" passa a contar como "${nomeAtual}" em todas as tabelas e relatórios do DDS?\n\nO dado original de "${nomeAntigo}" não é apagado, só a exibição passa a ser junto com "${nomeAtual}".`)) return;
    try {
        await supabaseUpsert('dds_frentes_alias', [{ id: nomeAntigo, frente_atual: nomeAtual }]);
        await supabaseUpsert('dds_frentes_config', [{ id: nomeAtual, ativo: true }]);
        const idxAlias = allDdsFrentesAlias.findIndex(a => a.id === nomeAntigo);
        if (idxAlias >= 0) allDdsFrentesAlias[idxAlias].frente_atual = nomeAtual;
        else allDdsFrentesAlias.push({ id: nomeAntigo, frente_atual: nomeAtual });
        const idxConfig = allDdsFrentesConfig.findIndex(c => c.id === nomeAtual);
        if (idxConfig >= 0) allDdsFrentesConfig[idxConfig].ativo = true;
        else allDdsFrentesConfig.push({ id: nomeAtual, ativo: true });
        inputAntigo.value = '';
        inputAtual.value = '';
        renderDdsAliasFrentes();
        renderDdsGerenciarFrentes();
        const { inicio, fim } = getDdsDateRange();
        renderDdsTabelaControle(inicio, fim);
    } catch (e) {
        alert('Erro ao mesclar: ' + e.message);
    }
}

async function desfazerMesclarFrenteDds(nomeAntigo) {
    if (!confirm(`Desfazer a mesclagem de "${nomeAntigo}"? Ele volta a aparecer como frente separada nas tabelas.`)) return;
    try {
        await supabaseDelete('dds_frentes_alias', nomeAntigo);
        allDdsFrentesAlias = allDdsFrentesAlias.filter(a => a.id !== nomeAntigo);
        renderDdsAliasFrentes();
        renderDdsGerenciarFrentes();
        const { inicio, fim } = getDdsDateRange();
        renderDdsTabelaControle(inicio, fim);
    } catch (e) {
        alert('Erro ao desfazer: ' + e.message);
    }
}

function renderDdsPanel() {
    popularFiltroAnoDds();
    const anoSel = document.getElementById('ddsFiltroAno');
    const mesSel = document.getElementById('ddsFiltroMes');
    if (anoSel && !anoSel.dataset.inicializado) { anoSel.value = ddsFiltroAno; anoSel.dataset.inicializado = '1'; }
    if (mesSel && !mesSel.dataset.inicializado) { mesSel.value = ddsFiltroMes; mesSel.dataset.inicializado = '1'; }

    const { inicio, fim } = getDdsDateRange();
    const periodo = allDdsRealizados.filter(r => {
        if (!r.data_dds) return false;
        const d = parseLocalDate(r.data_dds);
        return d >= inicio && d <= fim;
    });
    const periodoHistorico = allDdsHistoricoAgregado.filter(h => {
        if (!h.data_dds) return false;
        const d = parseLocalDate(h.data_dds);
        return d >= inicio && d <= fim;
    });

    const sessoesDia = new Set(periodo.map(r => `${r.frente_responsavel}||${r.data_dds}`));
    const sessoesHistorico = new Set(periodoHistorico.map(h => `${h.frente_responsavel}||${h.data_dds}`));
    document.getElementById('kpiDdsSessoes').textContent = (sessoesDia.size + sessoesHistorico.size).toLocaleString('pt-BR');
    const horasDds = periodo.reduce((sum, r) => sum + (parseFloat(r.carga_horaria) || 0), 0)
        + periodoHistorico.reduce((sum, h) => sum + (parseFloat(h.carga_horaria) || 0), 0);
    document.getElementById('kpiDdsHHT').textContent = horasDds.toLocaleString('pt-BR');
    document.getElementById('kpiDdsColaboradores').textContent = new Set(periodo.map(r => r.matricula)).size;
    document.getElementById('kpiDdsRuim').textContent = periodo.filter(r => r.emociograma === 'ruim').length;

    renderDdsTabelaControle(inicio, fim);
    renderDdsGerenciarFrentes();
    renderDdsAliasFrentes();
    renderAcoesTratativasPendentesDds();

    if (typeof Chart === 'undefined') return;
    if (chartInstances.ddsHHTMes) chartInstances.ddsHHTMes.destroy();
    if (chartInstances.hhtTotalMes) chartInstances.hhtTotalMes.destroy();

    const horasDdsPorMesMap = new Map();
    for (let i = 0; i < allDdsRealizados.length; i++) {
        const r = allDdsRealizados[i];
        if (!r || !r.data_dds) continue;
        const dStr = String(r.data_dds).trim();
        if (dStr.length < 7) continue;
        const anoMes = dStr.substring(0, 7);
        const ch = parseFloat(r.carga_horaria);
        if (!isNaN(ch) && ch > 0) horasDdsPorMesMap.set(anoMes, (horasDdsPorMesMap.get(anoMes) || 0) + ch);
    }
    for (let i = 0; i < allDdsHistoricoAgregado.length; i++) {
        const h = allDdsHistoricoAgregado[i];
        if (!h || !h.data_dds) continue;
        const dStr = String(h.data_dds).trim();
        if (dStr.length < 7) continue;
        const anoMes = dStr.substring(0, 7);
        const ch = parseFloat(h.carga_horaria);
        if (!isNaN(ch) && ch > 0) horasDdsPorMesMap.set(anoMes, (horasDdsPorMesMap.get(anoMes) || 0) + ch);
    }

    const horasTreinPorMesMap = new Map();
    for (let i = 0; i < allTreinamentosRealizados.length; i++) {
        const r = allTreinamentosRealizados[i];
        if (!r || !r.data_treinamento) continue;
        const dStr = String(r.data_treinamento).trim();
        if (dStr.length < 7) continue;
        const anoMes = dStr.substring(0, 7);
        const ch = parseFloat(r.carga_horaria);
        if (!isNaN(ch) && ch > 0) horasTreinPorMesMap.set(anoMes, (horasTreinPorMesMap.get(anoMes) || 0) + ch);
    }

    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth();
    const limiteMes = new Date(anoAtual, mesAtual, 1);

    let menorAnoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    for (const k of horasTreinPorMesMap.keys()) {
        if (/^\d{4}-\d{2}$/.test(k) && k >= '2024-01' && k < menorAnoMes) menorAnoMes = k;
    }
    for (const k of horasDdsPorMesMap.keys()) {
        if (/^\d{4}-\d{2}$/.test(k) && k >= '2024-01' && k < menorAnoMes) menorAnoMes = k;
    }
    const partesMenor = menorAnoMes.split('-');
    let cursorMes = new Date(parseInt(partesMenor[0], 10), parseInt(partesMenor[1], 10) - 1, 1);
    const pisoMinimo = new Date(anoAtual - 3, mesAtual, 1);
    if (cursorMes < pisoMinimo || isNaN(cursorMes.getTime())) {
        cursorMes = pisoMinimo;
    }

    const meses = [], horasDdsPorMes = [], horasTreinPorMes = [];
    let safetyCounter = 0;
    while (cursorMes <= limiteMes && safetyCounter < 48) {
        safetyCounter++;
        const ano = cursorMes.getFullYear(), mes = cursorMes.getMonth();
        const chaveAnoMes = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        meses.push(cursorMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        horasDdsPorMes.push(Math.round((horasDdsPorMesMap.get(chaveAnoMes) || 0) * 10) / 10);
        horasTreinPorMes.push(Math.round((horasTreinPorMesMap.get(chaveAnoMes) || 0) * 10) / 10);
        cursorMes = new Date(ano, mes + 1, 1);
    }

    // Mesmo padrão de "histórico completo + scroll horizontal, autoSkip:false" já usado
    // em treinHHTMes (ver comentário lá) - evita o mês atual sumir do eixo.
    const ddsInner = document.getElementById('chartDdsHHTMesInner');
    if (ddsInner) {
        const ddsWrap = ddsInner.parentElement;
        ddsInner.style.width = Math.max(ddsWrap.clientWidth, meses.length * 56) + 'px';
        chartInstances.ddsHHTMes = new Chart(document.getElementById('chartDdsHHTMes'), {
            type: 'bar',
            data: { labels: meses, datasets: [{ label: 'HHT DDS', data: horasDdsPorMes, backgroundColor: '#0ea5e9', borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true }, x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 45 } } }
            }
        });
        ddsWrap.scrollLeft = 999999;
    }

    const totalInner = document.getElementById('chartHHTTotalMesInner');
    if (totalInner) {
        const totalWrap = totalInner.parentElement;
        totalInner.style.width = Math.max(totalWrap.clientWidth, meses.length * 56) + 'px';
        chartInstances.hhtTotalMes = new Chart(document.getElementById('chartHHTTotalMes'), {
            type: 'bar',
            data: {
                labels: meses,
                datasets: [
                    { label: 'Treinamento', data: horasTreinPorMes, backgroundColor: '#4f46e5', stack: 's' },
                    { label: 'DDS', data: horasDdsPorMes, backgroundColor: '#0ea5e9', stack: 's' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' } },
                scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true, ticks: { autoSkip: false, maxRotation: 60, minRotation: 45 } } }
            }
        });
        totalWrap.scrollLeft = 999999;
    }

    // Snapshot dos números/gráficos que acabaram de ser calculados acima, pra alimentar a
    // aba "📄 Relatório" sem duplicar nenhuma lógica de cálculo. A ÚNICA exceção é a lista
    // "Controle de DDS por Frente resumida" - chama de novo a função tabelaControleDds
    // (já existe e já é reaproveitada assim em outros pontos, ex: toggleFrenteDdsAtiva),
    // só que aqui só aproveita o Total e as Horas de cada frente, sem montar as colunas de
    // dia a dia (que só fazem sentido pra tabela de controle interno na tela, não pra um
    // relatório - ficariam com uma coluna por dia do período, potencialmente centenas se o
    // período for "Este Ano" ou "Todos"). A seção "Ações/Tratativas Pendentes" fica de fora
    // de propósito - já é sigilosa por design (ver comentário em
    // renderAcoesTratativasPendentesDds), nunca deve entrar em relatório/exportação.
    const controleFrenteResumo = tabelaControleDds(inicio, fim);
    const linhasControleFrente = controleFrenteResumo.frentes.map(f => {
        const mapaDias = controleFrenteResumo.porFrenteDia.get(f) || new Map();
        const totalPeriodoFrente = Array.from(mapaDias.values()).reduce((s, v) => s + v, 0);
        const horasFrente = controleFrenteResumo.porFrenteTotalHoras.get(f) || 0;
        return [f, totalPeriodoFrente, horasFrente.toLocaleString('pt-BR') + 'h'];
    });
    window.ddsmaReportData = {
        periodoLabel: document.getElementById('ddsPeriodoTitulo')?.textContent || '',
        kpis: [
            { key: 'sessoes', label: 'Sessões-dia de DDS no Período', value: (sessoesDia.size + sessoesHistorico.size).toLocaleString('pt-BR') },
            { key: 'hht', label: 'HHT de DDS no Período (horas)', value: horasDds.toLocaleString('pt-BR') },
            { key: 'colaboradores', label: 'Colaboradores Participantes', value: new Set(periodo.map(r => r.matricula)).size },
            { key: 'ruim', label: 'Registros "Ruim" no Período', value: periodo.filter(r => r.emociograma === 'ruim').length }
        ],
        graficos: {
            graficoHhtMes: { titulo: 'HHT de DDS por Mês (Histórico Completo)', labels: meses, valores: horasDdsPorMes },
            graficoHhtTotalMes: {
                titulo: 'HHT Total por Mês (Treinamento + DDS)',
                labels: meses,
                series: [
                    { nome: 'Treinamento', valores: horasTreinPorMes },
                    { nome: 'DDS', valores: horasDdsPorMes }
                ]
            }
        },
        listas: {
            listaControleFrente: {
                titulo: 'Controle de DDS por Frente no Período (Resumo)',
                colunas: ['Frente', 'Total de Sessões no Período', 'Horas no Período'],
                linhas: linhasControleFrente
            }
        }
    };
    if (document.getElementById('ddsmaSubtabBtn-relatorio')?.classList.contains('active')) renderDdsmaRelatorioChecklist();
}

// ============================================
// IMPRESSÃO DE DDSMS (EM LOTE E AVULSA)
// - Formato auto-otimizado para caber em 1 página única em Paisagem para equipes de até 15 colaboradores.
// - Padrão Blob seguro imune a bloqueador de popups na Vercel (abrirDocumentoHtmlParaImpressao).
// ============================================

// ============================================
// CONFIGURAÇÕES OPERACIONAIS DO DDSMA (Supabase + localStorage)
// ============================================

async function carregarConfiguracoesDdsDoSupabase() {
    try {
        const dados = await supabaseFetch('configuracoes_sistema', 'id=eq.dds_configuracoes&limit=1');
        if (dados && dados.length > 0 && dados[0].valor) {
            const v = dados[0].valor;
            ddsConfiguracoes = {
                regraSemana: v.regraSemana || ddsConfiguracoes.regraSemana || 'primeira_segunda',
                cicloEnvio: v.cicloEnvio || ddsConfiguracoes.cicloEnvio || 'atual',
                linhasVaziasMin: parseInt(v.linhasVaziasMin, 10) || ddsConfiguracoes.linhasVaziasMin || 10
            };
            try {
                localStorage.setItem('dds_configuracoes', JSON.stringify(ddsConfiguracoes));
            } catch (e) {}
            preencherCamposConfiguracoesDds();
            popularSelectSemanasDdsLote();
            renderDdsLotePreview();
        }
    } catch (e) {
        console.warn('Aviso: Não foi possível carregar dds_configuracoes do Supabase:', e);
    }
}

async function salvarConfiguracoesDdsNoSupabase(cfg) {
    try {
        const token = await authTokenDashboard();
        const url = `${SUPABASE_URL}/rest/v1/configuracoes_sistema?id=eq.dds_configuracoes`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify({
                id: 'dds_configuracoes',
                valor: cfg,
                descricao: 'Parametrizações operacionais do módulo DDSMA (agrupamento de semanas, antecedência e linhas mínimas).',
                atualizado_em: new Date().toISOString(),
                atualizado_por: usuarioDashboardAtual() || 'Painel DDSMA'
            })
        });
        if (!resp.ok) {
            console.warn('Aviso: Falha ao salvar dds_configuracoes no Supabase:', resp.status);
        }
    } catch (e) {
        console.warn('Erro de rede ao salvar dds_configuracoes no Supabase:', e);
    }
}

function preencherCamposConfiguracoesDds() {
    const selRegra = document.getElementById('ddsCfgRegraSemana');
    if (selRegra) selRegra.value = ddsConfiguracoes.regraSemana || 'primeira_segunda';

    const selCiclo = document.getElementById('ddsCfgCicloEnvio');
    if (selCiclo) selCiclo.value = ddsConfiguracoes.cicloEnvio || 'atual';

    const inpLinhas = document.getElementById('ddsCfgLinhasMin');
    if (inpLinhas) inpLinhas.value = ddsConfiguracoes.linhasVaziasMin || 10;
}

function atualizarExemploRegraSemana() {
    const sel = document.getElementById('ddsCfgRegraSemana');
    const out = document.getElementById('ddsCfgExemploSemana');
    if (!sel || !out) return;
    const regra = sel.value;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const nomeMes = NOMES_MESES[mes] || 'Mês Atual';
    const semanas = obterSemanasDoMes(ano, mes, regra);

    if (semanas.length > 0) {
        out.innerHTML = `<strong>Demonstração (${nomeMes}/${ano}):</strong> ${semanas.map(s => s.label).join(' &nbsp;•&nbsp; ')}`;
    }
}

function renderDdsConfiguracoes() {
    preencherCamposConfiguracoesDds();
    atualizarExemploRegraSemana();
}

function salvarConfiguracoesDds() {
    const regraSemana = document.getElementById('ddsCfgRegraSemana')?.value || 'primeira_segunda';
    const cicloEnvio = document.getElementById('ddsCfgCicloEnvio')?.value || 'atual';
    const linhasVaziasMin = Math.max(5, Math.min(25, parseInt(document.getElementById('ddsCfgLinhasMin')?.value, 10) || 10));

    ddsConfiguracoes = { regraSemana, cicloEnvio, linhasVaziasMin };

    try {
        localStorage.setItem('dds_configuracoes', JSON.stringify(ddsConfiguracoes));
    } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
    }

    salvarConfiguracoesDdsNoSupabase(ddsConfiguracoes);

    // Ajusta o mês padrão selecionado caso o ciclo de envio tenha mudado
    const padrao = calcularMesAnoPadraoDds();
    ddsLoteFiltroAno = padrao.ano;
    ddsLoteFiltroMes = padrao.mes;
    const anoSel = document.getElementById('ddsLoteFiltroAno');
    if (anoSel) anoSel.value = ddsLoteFiltroAno;
    const mesSel = document.getElementById('ddsLoteFiltroMes');
    if (mesSel) mesSel.value = ddsLoteFiltroMes;

    // Recalcula imediatamente os selects de semanas e lote na aba Imprimir
    popularSelectSemanasDdsLote();
    popularSelectTemasDdsLote();
    renderDdsLotePreview();
    atualizarExemploRegraSemana();

    const msg = document.getElementById('ddsCfgStatusMsg');
    if (msg) {
        msg.style.display = 'inline-block';
        msg.textContent = '✅ Preferências operacionais do DDSMA salvas com sucesso!';
        setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }
}

function restaurarConfiguracoesDdsPadrao() {
    if (!confirm('Deseja restaurar as parametrizações do DDSMA para os valores padrão do sistema?')) return;
    ddsConfiguracoes = { ...DDS_CONFIG_PADRAO };
    try {
        localStorage.setItem('dds_configuracoes', JSON.stringify(ddsConfiguracoes));
    } catch (e) {}

    salvarConfiguracoesDdsNoSupabase(ddsConfiguracoes);
    preencherCamposConfiguracoesDds();

    const padrao = calcularMesAnoPadraoDds();
    ddsLoteFiltroAno = padrao.ano;
    ddsLoteFiltroMes = padrao.mes;
    const anoSel = document.getElementById('ddsLoteFiltroAno');
    if (anoSel) anoSel.value = ddsLoteFiltroAno;
    const mesSel = document.getElementById('ddsLoteFiltroMes');
    if (mesSel) mesSel.value = ddsLoteFiltroMes;

    popularSelectSemanasDdsLote();
    popularSelectTemasDdsLote();
    renderDdsLotePreview();
    atualizarExemploRegraSemana();

    const msg = document.getElementById('ddsCfgStatusMsg');
    if (msg) {
        msg.style.display = 'inline-block';
        msg.textContent = '🔄 Valores padrão restaurados com sucesso!';
        setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }
}

// Calcula as semanas de um determinado mês (de segunda-feira a domingo)
// Respeita a regra parametrizada em Configurações (primeira_segunda, maioria_dias ou dia_primeiro)
// Blindado contra loops infinitos em caso de parâmetros inválidos ou datas corrompidas
function obterSemanasDoMes(anoParam, mesParam, regraOverride = null) {
    const hoje = new Date();
    let ano = parseInt(anoParam, 10);
    let mes = parseInt(mesParam, 10);
    if (isNaN(ano)) ano = hoje.getFullYear();
    if (isNaN(mes) || mes < 0 || mes > 11) mes = hoje.getMonth();

    const regra = regraOverride || ddsConfiguracoes.regraSemana || 'primeira_segunda';
    const semanas = [];

    if (regra === 'primeira_segunda') {
        // Opção 1: Primeira segunda-feira dentro do mês (Ex: Outubro começa em 05/10/2026)
        let curr = new Date(ano, mes, 1);
        let safetyDia = 0;
        while (curr.getDay() !== 1 && safetyDia < 8) { // 1 = Segunda-feira
            safetyDia++;
            curr.setDate(curr.getDate() + 1);
        }
        let safetySemana = 0;
        while (curr.getMonth() === mes && safetySemana < 6) {
            safetySemana++;
            const segIso = toISODateLocal(curr);
            const dom = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 6);
            semanas.push({
                inicio: new Date(curr),
                fim: dom,
                inicioIso: segIso,
                fimIso: toISODateLocal(dom),
                label: `Semana ${semanas.length + 1}: ${formatSimpleDate(segIso)} a ${formatSimpleDate(toISODateLocal(dom))}`
            });
            curr.setDate(curr.getDate() + 7);
        }
    } else if (regra === 'maioria_dias') {
        // Opção 2: Semana com a maioria dos dias no mês — ISO-8601 (Ex: 28/09/2026)
        let curr = segundaDaSemana(new Date(ano, mes, 1));
        const quintaPrimeira = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 3);
        if (quintaPrimeira.getMonth() !== mes) {
            curr.setDate(curr.getDate() + 7);
        }
        let safetySemana = 0;
        while (safetySemana < 6) {
            safetySemana++;
            const quinta = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 3);
            if (quinta.getMonth() !== mes) break;
            const segIso = toISODateLocal(curr);
            const dom = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 6);
            semanas.push({
                inicio: new Date(curr),
                fim: dom,
                inicioIso: segIso,
                fimIso: toISODateLocal(dom),
                label: `Semana ${semanas.length + 1}: ${formatSimpleDate(segIso)} a ${formatSimpleDate(toISODateLocal(dom))}`
            });
            curr.setDate(curr.getDate() + 7);
        }
    } else {
        // Opção 3: Semana contendo o dia 1º do mês
        let curr = segundaDaSemana(new Date(ano, mes, 1));
        const segProxMes = segundaDaSemana(new Date(ano, mes + 1, 1));
        let safetySemana = 0;
        while (curr < segProxMes && safetySemana < 6) {
            safetySemana++;
            const segIso = toISODateLocal(curr);
            const dom = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 6);
            semanas.push({
                inicio: new Date(curr),
                fim: dom,
                inicioIso: segIso,
                fimIso: toISODateLocal(dom),
                label: `Semana ${semanas.length + 1}: ${formatSimpleDate(segIso)} a ${formatSimpleDate(toISODateLocal(dom))}`
            });
            curr.setDate(curr.getDate() + 7);
        }
    }

    return semanas;
}

// Inicializa controles de filtro do lote de DDS
function inicializarDdsLote() {
    const anoSel = document.getElementById('ddsLoteFiltroAno');
    if (!anoSel) return;

    const padrao = calcularMesAnoPadraoDds();
    if (!ddsLoteFiltroAno) ddsLoteFiltroAno = padrao.ano;
    if (!ddsLoteFiltroMes) ddsLoteFiltroMes = padrao.mes;

    if (anoSel.options.length === 0) {
        const anos = new Set([new Date().getFullYear(), new Date().getFullYear() + 1, parseInt(padrao.ano, 10)]);
        allDdsTemasCronograma.forEach(t => { if (t.data) anos.add(parseLocalDate(t.data).getFullYear()); });
        Array.from(anos).sort().forEach(ano => {
            const opt = document.createElement('option');
            opt.value = ano;
            opt.textContent = ano;
            anoSel.appendChild(opt);
        });
        anoSel.value = ddsLoteFiltroAno;
    }

    const mesSel = document.getElementById('ddsLoteFiltroMes');
    if (mesSel && !mesSel.dataset.inicializado) {
        mesSel.value = String(ddsLoteFiltroMes);
        mesSel.dataset.inicializado = '1';
    }

    const frenteWrap = document.getElementById('ddsLoteFrenteCheckboxList');
    if (frenteWrap && !frenteWrap.dataset.inicializado) {
        ddsLoteFrentesSelecionadas = new Set(todasFrentesAtivas());
        frenteWrap.dataset.inicializado = '1';
    }
    renderDdsLoteFrentesCheckboxes();

    popularSelectSemanasDdsLote();
    popularSelectTemasDdsLote();
    renderDdsLotePreview();
}

function popularSelectSemanasDdsLote() {
    const semanaSel = document.getElementById('ddsLoteFiltroSemana');
    if (!semanaSel) return;
    const ano = parseInt(ddsLoteFiltroAno, 10);
    const mes = parseInt(ddsLoteFiltroMes, 10);
    const semanas = obterSemanasDoMes(ano, mes);

    semanaSel.innerHTML = `<option value="">Todas as semanas do mês (${semanas.length} semanas)</option>`;
    semanas.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.inicioIso;
        opt.textContent = s.label;
        semanaSel.appendChild(opt);
    });

    if (ddsLoteFiltroSemana && semanas.some(s => s.inicioIso === ddsLoteFiltroSemana)) {
        semanaSel.value = ddsLoteFiltroSemana;
    } else {
        ddsLoteFiltroSemana = '';
        semanaSel.value = '';
    }
}

function popularSelectTemasDdsLote() {
    const temaSel = document.getElementById('ddsLoteFiltroTema');
    if (!temaSel) return;
    const ano = parseInt(ddsLoteFiltroAno, 10);
    const mes = parseInt(ddsLoteFiltroMes, 10);
    const valAtual = temaSel.value;

    temaSel.innerHTML = '<option value="">Todos os temas...</option>';
    const temas = new Set();
    allDdsTemasCronograma.forEach(t => {
        if (!t.data || !t.tema) return;
        const d = parseLocalDate(t.data);
        if (d.getFullYear() === ano && d.getMonth() === mes) {
            temas.add(t.tema.trim());
        }
    });

    Array.from(temas).sort((a, b) => a.localeCompare(b)).forEach(tema => {
        const opt = document.createElement('option');
        opt.value = tema;
        opt.textContent = tema;
        temaSel.appendChild(opt);
    });

    if (valAtual && temas.has(valAtual)) {
        temaSel.value = valAtual;
    } else {
        ddsLoteFiltroTema = '';
    }
}

function renderDdsLoteFrentesCheckboxes() {
    const wrap = document.getElementById('ddsLoteFrenteCheckboxList');
    if (!wrap) return;
    const frentes = todasFrentesAtivas();
    wrap.innerHTML = frentes.length === 0
        ? '<div class="db-list-empty" style="padding:8px 0;">Nenhuma frente cadastrada em Efetivo.</div>'
        : frentes.map(f => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:12px; cursor:pointer;">
                <input type="checkbox" value="${escapeHTML(f)}" ${ddsLoteFrentesSelecionadas.has(f) ? 'checked' : ''} onchange="onDdsLoteFrenteCheckboxChange()" style="width:15px; height:15px; flex-shrink:0; cursor:pointer;">
                <span>${escapeHTML(f)}</span>
            </label>`).join('');
    atualizarResumoFrentesDdsLote();
}

function atualizarResumoFrentesDdsLote() {
    const resumoEl = document.getElementById('ddsLoteFrenteResumo');
    if (!resumoEl) return;
    const total = todasFrentesAtivas().length;
    const sel = ddsLoteFrentesSelecionadas.size;
    resumoEl.textContent = total === 0 ? 'Frentes: nenhuma cadastrada'
        : sel >= total ? `Frentes: Todas (${total})`
        : sel === 0 ? 'Frentes: nenhuma selecionada'
        : `Frentes: ${sel} de ${total} selecionada(s)`;
}

function onDdsLoteFrenteCheckboxChange() {
    const wrap = document.getElementById('ddsLoteFrenteCheckboxList');
    ddsLoteFrentesSelecionadas = new Set(
        Array.from(wrap.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
    );
    atualizarResumoFrentesDdsLote();
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function marcarTodasFrentesDdsLote(marcar) {
    ddsLoteFrentesSelecionadas = marcar ? new Set(todasFrentesAtivas()) : new Set();
    renderDdsLoteFrentesCheckboxes();
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function onDdsLoteFiltroMesAnoChange() {
    ddsLoteFiltroAno = document.getElementById('ddsLoteFiltroAno').value;
    ddsLoteFiltroMes = document.getElementById('ddsLoteFiltroMes').value;
    ddsLoteFiltroSemana = '';
    popularSelectSemanasDdsLote();
    popularSelectTemasDdsLote();
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function onDdsLoteFiltroSemanaChange() {
    ddsLoteFiltroSemana = document.getElementById('ddsLoteFiltroSemana').value;
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function onDdsLoteFiltroTemaChange() {
    ddsLoteFiltroTema = document.getElementById('ddsLoteFiltroTema').value;
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function limparFiltrosDdsLote() {
    const padrao = calcularMesAnoPadraoDds();
    ddsLoteFiltroAno = padrao.ano;
    ddsLoteFiltroMes = padrao.mes;
    ddsLoteFiltroSemana = '';
    ddsLoteFiltroTema = '';
    const anoSel = document.getElementById('ddsLoteFiltroAno');
    if (anoSel) anoSel.value = ddsLoteFiltroAno;
    const mesSel = document.getElementById('ddsLoteFiltroMes');
    if (mesSel) mesSel.value = ddsLoteFiltroMes;
    const temaSel = document.getElementById('ddsLoteFiltroTema');
    if (temaSel) temaSel.value = '';
    ddsLoteFrentesSelecionadas = new Set(todasFrentesAtivas());
    renderDdsLoteFrentesCheckboxes();
    popularSelectSemanasDdsLote();
    popularSelectTemasDdsLote();
    ddsLoteSelecionados = null;
    renderDdsLotePreview();
}

function itensDdsLoteFiltrados() {
    const ano = parseInt(ddsLoteFiltroAno, 10);
    const mes = parseInt(ddsLoteFiltroMes, 10);
    const semanasDoMes = obterSemanasDoMes(ano, mes);

    let semanas = semanasDoMes;
    if (ddsLoteFiltroSemana) {
        semanas = semanasDoMes.filter(s => s.inicioIso === ddsLoteFiltroSemana);
    }

    const frentes = Array.from(ddsLoteFrentesSelecionadas);
    if (frentes.length === 0 || semanas.length === 0) return [];

    const resultado = [];

    semanas.forEach(s => {
        const seg = s.inicio;
        const diasSemana = Array.from({ length: 7 }, (_, i) => new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i));

        const temasSemana = [];
        diasSemana.slice(0, 5).forEach(d => {
            const cronograma = allDdsTemasCronograma.find(t => t.data === toISODateLocal(d));
            if (cronograma && cronograma.tema) temasSemana.push(cronograma.tema.trim());
        });

        if (ddsLoteFiltroTema) {
            const contem = temasSemana.some(t => t.toLowerCase().includes(ddsLoteFiltroTema.toLowerCase()));
            if (!contem) return;
        }

        const temasResumo = temasSemana.length > 0
            ? temasSemana.slice(0, 3).join(' • ') + (temasSemana.length > 3 ? '...' : '')
            : '';

        frentes.forEach(frente => {
            const equipe = equipeDaFrente(frente);
            resultado.push({
                frente,
                seg,
                diasSemana,
                equipe,
                semanaLabel: s.label,
                temasResumo,
                chave: `${frente}__${s.inicioIso}`
            });
        });
    });

    return resultado;
}

function renderDdsLotePreview() {
    const container = document.getElementById('ddsLotePreview');
    if (!container) return;
    const combinacoes = itensDdsLoteFiltrados();

    if (ddsLoteSelecionados === null) {
        ddsLoteSelecionados = new Set(combinacoes.map(c => c.chave));
    }

    if (combinacoes.length === 0) {
        container.innerHTML = '<div class="db-list-empty" style="padding:16px; text-align:center;">Nenhum formulário encontrado com os filtros atuais. Selecione ao menos uma frente ou ajuste o mês/semana.</div>';
        atualizarResumoDdsLote(0, 0);
        return;
    }

    container.innerHTML = combinacoes.map(c => {
        const checked = ddsLoteSelecionados.has(c.chave);
        const colabBadge = c.equipe.length <= 15
            ? `<span style="background:var(--success-bg, #ecfdf5); color:var(--success, #059669); padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${c.equipe.length} colaboradores • 1 página</span>`
            : `<span style="background:var(--warning-bg, #fffbeb); color:var(--warning, #d97706); padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${c.equipe.length} colaboradores • 2 páginas</span>`;

        return `<div class="db-list-item" style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; border-bottom:1px solid var(--border); font-size:12px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1; min-width:0;">
                <input type="checkbox" value="${escapeHTML(c.chave)}" ${checked ? 'checked' : ''} onchange="onDdsLoteItemCheckboxChange(this)" style="width:16px; height:16px; cursor:pointer; flex-shrink:0;">
                <div style="min-width:0;">
                    <div style="font-weight:700; color:var(--text);">${escapeHTML(c.frente)}</div>
                    <div style="color:var(--text-light); font-size:11.5px;">${escapeHTML(c.semanaLabel)}</div>
                    ${c.temasResumo ? `<div style="color:var(--text-light); font-size:10.5px; font-style:italic; margin-top:2px;">Temas: ${escapeHTML(c.temasResumo)}</div>` : ''}
                </div>
            </label>
            <div style="flex-shrink:0; text-align:right;">
                ${colabBadge}
            </div>
        </div>`;
    }).join('');

    const qtdSel = combinacoes.filter(c => ddsLoteSelecionados.has(c.chave)).length;
    atualizarResumoDdsLote(combinacoes.length, qtdSel);
}

function atualizarResumoDdsLote(total, selecionados) {
    const resumoEl = document.getElementById('ddsLoteResumo');
    const btnEl = document.getElementById('btnImprimirLoteDds');
    const qtdFrentes = ddsLoteFrentesSelecionadas.size;

    if (resumoEl) {
        resumoEl.innerHTML = `${total} formulário(s) no lote — <strong>${selecionados} selecionado(s)</strong> (${qtdFrentes} frentes) — <span style="color:var(--success, #059669); font-weight:600;">Equipes ≤ 15 colaboradores ajustadas para 1 folha</span>`;
    }
    if (btnEl) {
        btnEl.textContent = selecionados > 0
            ? `🖨️ Imprimir Formulários Selecionados em Lote (${selecionados} fichas)`
            : '🖨️ Imprimir Formulários Selecionados em Lote';
    }
}

function onDdsLoteItemCheckboxChange(el) {
    if (!ddsLoteSelecionados) ddsLoteSelecionados = new Set();
    if (el.checked) {
        ddsLoteSelecionados.add(el.value);
    } else {
        ddsLoteSelecionados.delete(el.value);
    }
    const combinacoes = itensDdsLoteFiltrados();
    const qtdSel = combinacoes.filter(c => ddsLoteSelecionados.has(c.chave)).length;
    atualizarResumoDdsLote(combinacoes.length, qtdSel);
}

function marcarTodosDdsLote(marcar) {
    const combinacoes = itensDdsLoteFiltrados();
    ddsLoteSelecionados = marcar ? new Set(combinacoes.map(c => c.chave)) : new Set();
    const container = document.getElementById('ddsLotePreview');
    if (container) {
        container.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = marcar; });
    }
    atualizarResumoDdsLote(combinacoes.length, ddsLoteSelecionados.size);
}

// Constrói a folha HTML individual de um formulário semanal de DDSMS
// Auto-otimizada proporcionalmente para que equipes de até 11 colaboradores ocupem 100% da folha A4 Paisagem
function construirFolhaFichaDds(frente, seg, diasSemana, equipe) {
    const colDias = diasSemana.map(d => {
        const cronograma = allDdsTemasCronograma.find(t => t.data === toISODateLocal(d));
        const temaTexto = cronograma ? escapeHTML(cronograma.tema) : '';
        return `<th class="col-tema-dia">
            <div class="col-tema-data">${NOMES_DIAS_SEMANA[d.getDay()].slice(0, 3).toUpperCase()} – ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}</div>
            <div class="col-tema-texto">
                ${temaTexto ? `<b>Tema:</b> ${temaTexto}` : '<span style="color:#888;">Tema: _________________</span>'}
            </div>
        </th>`;
    }).join('');

    const linhaRespSms = diasSemana.map(() => `<td style="height:22px; text-align:center;"></td>`).join('');
    const linhaResponsavel = diasSemana.map(() => `<td style="height:28px; font-size:8px; line-height:1; vertical-align:bottom; padding:2px 4px;">Ass:</td>`).join('');

    const equipeValida = Array.isArray(equipe) ? equipe : [];
    const minLinhas = parseInt(ddsConfiguracoes.linhasVaziasMin, 10) || 10;
    const totalLinhas = Math.max(minLinhas, equipeValida.length);

    const linhasColab = [];
    for (let i = 0; i < totalLinhas; i++) {
        const c = equipeValida[i];
        const emocCels = diasSemana.map(() => `<td class="col-dia-resp">
            <div class="emoc-bolinhas">🟢&nbsp;🟡&nbsp;🔴</div>
            <div class="rubrica-label">Rubrica:</div>
            <div class="linha-rubrica"></div>
        </td>`).join('');

        if (c) {
            linhasColab.push(`<tr>
                <td class="col-item">${i + 1}</td>
                <td class="col-mat">${escapeHTML(c.matricula || '')}</td>
                <td class="col-nome">${escapeHTML(c.nome || '')}</td>
                <td class="col-funcao">${escapeHTML(c.funcao || '')}</td>
                ${emocCels}
            </tr>`);
        } else {
            // Linha vazia padronizada para totalizar no mínimo 10 linhas e permitir anotações manuais
            linhasColab.push(`<tr>
                <td class="col-item">${i + 1}</td>
                <td class="col-mat">&nbsp;</td>
                <td class="col-nome">&nbsp;</td>
                <td class="col-funcao">&nbsp;</td>
                ${emocCels}
            </tr>`);
        }
    }

    return `
    <div class="folha-dds">
        <div class="cabecalho">
            <div class="logo-box">
                <img src="${LOGO_COP_BASE64}" alt="Consórcio COP Ramal do Agreste">
            </div>
            <div class="titulo-box">
                <div class="titulo-principal">DDSMS — FICHA DE REGISTRO DO DIÁLOGO DE SAÚDE, SEGURANÇA E MEIO AMBIENTE</div>
                <div class="titulo-sub">Semana de ${formatSimpleDate(toISODateLocal(seg))} a ${formatSimpleDate(toISODateLocal(diasSemana[6]))}</div>
            </div>
        </div>
        <div class="linha-meta">
            <div class="campo-meta" style="flex:1.8;"><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
            <div class="campo-meta" style="flex:1.2;"><b>FRENTE DE SERVIÇO:</b></div>
        </div>
        <div class="linha-meta">
            <div class="campo-meta" style="flex:1.8;"><b>ENG/ENC/RESP:</b> ${escapeHTML(frente)}</div>
            <div class="campo-meta" style="flex:1.2;"><b>TURNO:</b> ☐ Diurno &nbsp; ☐ Noturno</div>
        </div>
        <div class="linha-meta">
            <div class="campo-meta" style="flex:1.8;"><b>OBRA:</b> RAMAL DO AGRESTE</div>
            <div class="campo-meta" style="flex:1.2;"><b>UNIDADE:</b></div>
        </div>
        <div class="emociograma-legenda">
            <div class="item">🟢 <b>Ótimo/Bom</b></div>
            <div class="item">🟡 <b>Regular</b> — pode ser que precise de ajuda</div>
            <div class="item">🔴 <b>Ruim</b> — preciso de ajuda</div>
        </div>
        <table class="tabela-temas">
            <colgroup>
                <col style="width:35%;">
                ${diasSemana.map(() => `<col style="width:${(65 / diasSemana.length).toFixed(2)}%;">`).join('')}
            </colgroup>
            <thead>
                <tr>
                    <th rowspan="2" style="font-size:8.5px;">Tema do dia / RESP SMS / Responsável / Ass.</th>
                    ${colDias}
                </tr>
            </thead>
            <tbody>
                <tr><td style="font-weight:700; font-size:8px;">RESP SMS</td>${linhaRespSms}</tr>
                <tr><td style="font-size:7.5px; line-height:1.1;">Responsável:<br><span style="margin-top:4px; display:inline-block;">Ass:</span></td>${linhaResponsavel}</tr>
            </tbody>
        </table>
        <table class="tabela-colaboradores">
            <colgroup>
                <col style="width:3.5%;">
                <col style="width:6.5%;">
                <col style="width:14%;">
                <col style="width:11%;">
                ${diasSemana.map(() => `<col style="width:${(65 / diasSemana.length).toFixed(2)}%;">`).join('')}
            </colgroup>
            <thead>
                <tr>
                    <th class="col-item">Item</th>
                    <th class="col-mat">Mat.</th>
                    <th class="col-nome">Nome</th>
                    <th class="col-funcao">Função</th>
                    ${diasSemana.map(d => `<th class="col-dia-header">${NOMES_DIAS_SEMANA[d.getDay()].slice(0, 3).toUpperCase()} – ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}<br><span style="font-weight:400; font-size:7px; color:#333;">Como estou / Rubrica</span></th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${linhasColab.join('')}
            </tbody>
        </table>
    </div>`;
}

// Monta o documento completo pronto para impressão com layout Paisagem e ocupação vertical de 100%
function montarDocumentoImpressaoFichasDds(folhasHtml, titulo) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHTML(titulo)}</title>
<style>
    @page {
        size: landscape;
        margin: 5mm 6mm;
    }
    * { box-sizing: border-box; }
    html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        background: #fff;
    }
    body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9px;
        color: #000;
    }
    .no-print {
        text-align: center;
        padding: 10px;
        background: #f1f5f9;
        border-bottom: 1px solid #cbd5e1;
    }
    .no-print button {
        padding: 8px 22px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border-radius: 6px;
        border: none;
        background: #1e3a8a;
        color: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    .folha-dds {
        width: 100%;
        max-width: 1400px;
        height: calc(100vh - 12mm);
        max-height: 198mm;
        margin: 0 auto;
        border: 2px solid #000;
        page-break-after: always;
        break-after: page;
        background: #fff;
        display: flex;
        flex-direction: column;
    }
    .folha-dds:last-child {
        page-break-after: auto;
        break-after: auto;
    }
    .cabecalho {
        display: flex;
        align-items: stretch;
        border-bottom: 1.5px solid #000;
        min-height: 44px;
        flex-shrink: 0;
    }
    .cabecalho .logo-box {
        width: 190px;
        padding: 3px 6px;
        border-right: 1.5px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .cabecalho .logo-box img {
        max-width: 100%;
        max-height: 38px;
        object-fit: contain;
    }
    .cabecalho .titulo-box {
        flex: 1;
        text-align: center;
        padding: 3px 6px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .cabecalho .titulo-box .titulo-principal {
        font-weight: 700;
        font-size: 12px;
        line-height: 1.2;
    }
    .cabecalho .titulo-box .titulo-sub {
        font-weight: 600;
        font-size: 10px;
        color: #222;
        margin-top: 2px;
    }
    .linha-meta {
        display: flex;
        border-bottom: 1px solid #000;
        min-height: 18px;
        flex-shrink: 0;
    }
    .campo-meta {
        padding: 2px 6px;
        border-right: 1px solid #000;
        font-size: 8.5px;
        line-height: 1.15;
        display: flex;
        align-items: center;
    }
    .campo-meta:last-child { border-right: none; }
    .campo-meta b { margin-right: 4px; color: #000; }
    .emociograma-legenda {
        display: flex;
        border-bottom: 1.5px solid #000;
        font-size: 8.5px;
        min-height: 18px;
        background: #fafafa;
        flex-shrink: 0;
    }
    .emociograma-legenda .item {
        flex: 1;
        padding: 2px 6px;
        border-right: 1px solid #000;
        display: flex;
        align-items: center;
        white-space: nowrap;
    }
    .emociograma-legenda .item:last-child { border-right: none; }
    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }
    th, td {
        border: 1px solid #000;
        padding: 2px 4px;
        font-size: 8.5px;
        vertical-align: middle;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
        background: #f0f0f0;
        font-size: 8px;
        text-align: center;
        font-weight: 700;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .tabela-temas {
        flex-shrink: 0;
    }
    .col-tema-dia {
        vertical-align: top;
        padding: 2px 3px;
    }
    .col-tema-data {
        font-weight: 700;
        font-size: 8px;
    }
    .col-tema-texto {
        font-weight: 400;
        font-size: 7.5px;
        line-height: 1.15;
        margin-top: 1px;
        color: #111;
        min-height: 18px;
        white-space: normal;
        word-break: break-word;
    }
    .tabela-colaboradores {
        width: 100%;
        margin-top: 3px;
        flex: 0 0 auto;
        border-collapse: collapse;
        table-layout: fixed;
    }
    .tabela-colaboradores tbody tr {
        height: 44px;
    }
    .tabela-colaboradores tbody tr td {
        height: 44px;
        padding: 2px 4px;
        box-sizing: border-box;
    }
    .col-item { text-align: center; font-weight: 700; font-size: 9px; }
    .col-mat { text-align: center; font-size: 8.5px; font-weight: 600; }
    .col-nome {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        white-space: normal !important;
        word-break: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        line-height: 1.25;
        padding: 3px 5px !important;
    }
    .col-funcao {
        font-size: 8px;
        font-weight: 500;
        text-transform: uppercase;
        white-space: normal !important;
        word-break: break-word !important;
        overflow: visible !important;
        text-overflow: clip !important;
        line-height: 1.2;
        padding: 3px 5px !important;
    }
    .col-dia-header { font-size: 8px; line-height: 1.1; padding: 2px 1px; }
    .col-dia-resp {
        padding: 2px 3px !important;
        vertical-align: middle;
    }
    .emoc-bolinhas {
        text-align: left;
        padding-left: 1px;
        font-size: 9px;
        line-height: 1;
        letter-spacing: 0.5px;
    }
    .rubrica-label {
        font-size: 7px;
        color: #444;
        line-height: 1;
        margin-top: 2px;
        text-align: left;
        padding-left: 1px;
    }
    .linha-rubrica {
        border-bottom: 1px solid #000;
        height: 18px;
        margin-top: 1px;
        width: 100%;
    }
    @media print {
        .no-print { display: none !important; }
        html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .folha-dds {
            height: 198mm !important;
            max-height: 198mm !important;
            border: 2px solid #000 !important;
            margin: 0 auto;
            page-break-after: always;
            break-after: page;
        }
        .tabela-colaboradores {
            flex: 0 0 auto !important;
            height: auto !important;
            width: 100% !important;
        }
        .tabela-colaboradores tbody tr {
            height: 44px !important;
        }
        .tabela-colaboradores tbody tr td {
            height: 44px !important;
            padding: 2px 4px !important;
            box-sizing: border-box !important;
        }
    }
    @media screen {
        body { background: #e2e8f0; padding: 16px; }
        .folha-dds {
            min-height: 198mm;
            margin-bottom: 24px;
            box-shadow: 0 3px 12px rgba(0,0,0,0.18);
        }
    }
</style>
<script>
    window.onload = function() {
        setTimeout(function() { window.print(); }, 400);
    };
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${folhasHtml}
</body>
</html>`;
}

// Dispara a impressão em lote dos formulários semanais selecionados
async function imprimirFormulariosDdsLote() {
    const todos = itensDdsLoteFiltrados();
    const selecionadosChaves = ddsLoteSelecionados || new Set(todos.map(c => c.chave));
    const itens = todos.filter(c => selecionadosChaves.has(c.chave));

    if (itens.length === 0) {
        alert('Nenhum formulário selecionado para imprimir. Marque ao menos uma frente/semana na prévia.');
        return;
    }

    const frentesUnicas = new Set(itens.map(c => c.frente)).size;
    const semanasUnicas = new Set(itens.map(c => c.semanaLabel)).size;

    if (!confirm(`Isso vai gerar ${itens.length} formulário(s) de DDS (${frentesUnicas} frente(s) em ${semanasUnicas} semana(s)) num único documento para impressão. Continuar?`)) {
        return;
    }

    const folhasHtml = itens.map(c => {
        return construirFolhaFichaDds(c.frente, c.seg, c.diasSemana, c.equipe);
    }).join('');

    const titulo = `DDSMS_Lote_${itens.length}_Fichas_${ddsLoteFiltroAno}_Mes_${parseInt(ddsLoteFiltroMes, 10) + 1}`;
    const html = montarDocumentoImpressaoFichasDds(folhasHtml, `Fichas DDSMS em Lote - ${itens.length} formulários`);

    abrirDocumentoHtmlParaImpressao(html, titulo);
}

// Emissão avulsa de 1 ficha semanal em branco
function imprimirFichaDdsEmBranco() {
    const frente = document.getElementById('ddsImprimirFichaFrente')?.value;
    const dataRef = document.getElementById('ddsImprimirFichaData')?.value;
    if (!frente) { alert('Selecione uma frente pra imprimir a ficha.'); return; }
    if (!dataRef) { alert('Selecione uma data de referência (qualquer dia da semana desejada).'); return; }

    const seg = segundaDaSemana(parseLocalDate(dataRef));
    const diasSemana = Array.from({ length: 7 }, (_, i) => new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i));
    const equipe = equipeDaFrente(frente);

    const folhaHtml = construirFolhaFichaDds(frente, seg, diasSemana, equipe);
    const titulo = `Ficha_DDS_${frente.replace(/\s+/g, '_')}_Semana_${toISODateLocal(seg)}`;
    const html = montarDocumentoImpressaoFichasDds(folhaHtml, `Ficha DDS - ${frente} - Semana ${formatSimpleDate(toISODateLocal(seg))}`);

    abrirDocumentoHtmlParaImpressao(html, titulo);
}

// (b) Relatório do mês - a mesma tabela estilo controle_de_dds.pdf da tela (PARTE 6),
// pronta pra impressão/arquivo, já com os totais. Nunca inclui acao_tratativa (PARTE 4).
// HTML do relatório de controle de DDS (estilo controle_de_dds.pdf) pra QUALQUER intervalo
// de datas - tabelaControleDds() já aceita isso, então mensal e semanal só trocam o título/
// intervalo, sem duplicar a lógica de tabela. Devolve null quando não há nenhuma frente com
// DDS lançado nesse intervalo (quem chama decide a mensagem de aviso).
function montarHtmlRelatorioDds(inicio, fim, tituloPeriodo, tituloAba) {
    const { dias, frentes, porFrenteDia, porFrenteTotalHoras } = tabelaControleDds(inicio, fim);
    if (frentes.length === 0) return null;

    const headerDias = dias.map(d => `<th>${String(parseLocalDate(d).getDate()).padStart(2, '0')}</th>`).join('');
    let totalGeralParticipantes = 0, totalGeralHoras = 0;
    const linhas = frentes.map(f => {
        const mapaDias = porFrenteDia.get(f) || new Map();
        const totalPeriodo = Array.from(mapaDias.values()).reduce((s, v) => s + v, 0);
        const horas = porFrenteTotalHoras.get(f) || 0;
        totalGeralParticipantes += totalPeriodo;
        totalGeralHoras += horas;
        const cels = dias.map(d => `<td style="text-align:center;">${mapaDias.get(d) || ''}</td>`).join('');
        return `<tr><td>${escapeHTML(f)}</td>${cels}<td style="text-align:center; font-weight:700;">${totalPeriodo}</td><td style="text-align:center; font-weight:700;">${horas.toLocaleString('pt-BR')}</td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>${escapeHTML(tituloAba)}</title>
<style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    .folha { max-width: 1300px; margin: 0 auto; }
    .cabecalho { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .cabecalho img { max-height: 44px; object-fit: contain; margin-right: 14px; }
    .cabecalho .titulo h1 { font-size: 16px; margin: 0; }
    .cabecalho .titulo p { font-size: 12px; margin: 2px 0 0; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10.5px; }
    th { background: #e5e5e5; }
    tfoot td { font-weight: 700; background: #f3f3f3; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    @media print { .no-print { display: none; } body { margin: 0; } }
</style></head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div class="cabecalho">
            <img src="${LOGO_COP_BASE64}" alt="COP">
            <div class="titulo">
                <h1>CONTROLE DE DDS — ${escapeHTML(tituloPeriodo)}</h1>
                <p>Carga horária: 10min por tema por dia — ${frentes.length} frente(s) — emitido em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
        <table>
            <thead><tr><th style="text-align:left;">Frente</th>${headerDias}<th>Total</th><th>Horas</th></tr></thead>
            <tbody>${linhas}</tbody>
            <tfoot><tr><td>TOTAL GERAL</td><td colspan="${dias.length}"></td><td style="text-align:center;">${totalGeralParticipantes}</td><td style="text-align:center;">${totalGeralHoras.toLocaleString('pt-BR')}</td></tr></tfoot>
        </table>
    </div>
</body></html>`;
}

function imprimirRelatorioMensalDds() {
    const ano = parseInt(document.getElementById('ddsImprimirRelatorioAno').value, 10);
    const mes = parseInt(document.getElementById('ddsImprimirRelatorioMes').value, 10);
    if (!ano || Number.isNaN(mes)) { alert('Selecione o mês e o ano do relatório.'); return; }

    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const html = montarHtmlRelatorioDds(inicio, fim, `${NOMES_MESES[mes]}/${ano}`, `Controle de DDS - ${NOMES_MESES[mes]}/${ano}`);
    if (!html) { alert('Nenhuma frente com DDS lançado nesse mês.'); return; }

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
}

// Mesmo relatório da Correção 3 acima, só que pra 1 semana (segunda a domingo) em vez do
// mês inteiro - pra bater com o jeito real de trabalhar do usuário (ficha da semana em
// papel, lançada e conferida de uma vez).
function imprimirRelatorioSemanalDds() {
    const dataRef = document.getElementById('ddsImprimirRelatorioSemanaData').value;
    if (!dataRef) { alert('Selecione uma data de referência (qualquer dia da semana desejada).'); return; }

    const seg = segundaDaSemana(parseLocalDate(dataRef));
    const dom = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + 6);
    const fim = new Date(dom.getFullYear(), dom.getMonth(), dom.getDate(), 23, 59, 59, 999);
    const tituloPeriodo = `Semana de ${formatSimpleDate(toISODateLocal(seg))} a ${formatSimpleDate(toISODateLocal(dom))}`;
    const html = montarHtmlRelatorioDds(seg, fim, tituloPeriodo, `Controle de DDS - ${tituloPeriodo}`);
    if (!html) { alert('Nenhuma frente com DDS lançado nessa semana.'); return; }

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
}

// ============================================
// REGISTRO DE TREINAMENTO (FOR.001.R00) - gera o documento oficial impresso, mesmo
// modelo que o usuário já usa em papel. Objetivo/Conteúdo Programático/Método de
// Avaliação vêm do catálogo (mudam só por TEMA, ver abrirFormCatalogoTreinamento);
// turma/horário/local/instrutor/responsável técnico são por SESSÃO (mesma código+data
// de treinamentos_realizados) - ficam guardados direto nas linhas dessa sessão
// (duplicados por colaborador, mesmo padrão já usado ali pra nome/função/setor) em vez
// de criar uma tabela "sessões" nova só pra isso.
// ============================================

let registroSessaoAtual = [];
let registroDataAtual = '';
let registroCodigoAtual = '';
let registroModoNovo = false;
const REGISTRO_SEM_ENCARREGADO = '__SEM_ENCARREGADO__';

function popularRegistroResponsavelNovaSelect() {
    const sel = document.getElementById('registroResponsavelNovaSelect');
    if (!sel || sel.options.length > 1) return;
    const responsaveis = new Set();
    allEfetivo.forEach(e => { if (colaboradorEstaAtivo(e) && e.responsavel) responsaveis.add(e.responsavel); });
    Array.from(responsaveis).sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
}

function limparBuscaRegistro() {
    document.getElementById('registroCodigoInput').value = '';
    onRegistroCodigoChange();
}

function onRegistroCodigoChange() {
    const codigo = extrairCodigoTreinamento(document.getElementById('registroCodigoInput').value);
    const sel = document.getElementById('registroDataSelect');
    document.getElementById('registroDetalheCard').style.display = 'none';
    document.getElementById('registroResponsavelWrap').style.display = 'none';
    document.getElementById('registroStatus').textContent = '';

    if (!codigo) { sel.innerHTML = '<option value="">— Escolha o treinamento primeiro —</option>'; return; }
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) {
        sel.innerHTML = '<option value="">— Código não encontrado —</option>';
        document.getElementById('registroStatus').textContent = '❌ Código não encontrado no catálogo.';
        document.getElementById('registroStatus').style.color = 'var(--danger)';
        return;
    }

    const datas = Array.from(new Set(
        allTreinamentosRealizados.filter(r => r.treinamento_cod === codigo && r.data_treinamento).map(r => r.data_treinamento)
    )).sort((a, b) => b.localeCompare(a));

    if (datas.length === 0) {
        sel.innerHTML = '<option value="">— Nenhuma sessão lançada ainda pra esse treinamento —</option>';
        return;
    }
    sel.innerHTML = '<option value="">— Escolha a data da sessão —</option>' +
        datas.map(d => `<option value="${d}">${formatSimpleDate(d)}</option>`).join('');
}

// Uma mesma código+data pode juntar gente de mais de uma frente de serviço (a
// importação histórica não separava, e mesmo lançamentos novos podem ter avulsos de
// fora) - igual ao usuário reportou, gerar direto pela data trazia todo o efetivo junto,
// inviabilizando a assinatura física. Mesma lógica de "Carregar equipe do Responsável"
// (Lançar Treinamento): resolve a frente de cada colaborador pelo `responsavel` ATUAL
// dele em colaboradores_efetivo (não um histórico da época da sessão) e, se a sessão tem
// mais de uma frente misturada, obriga escolher uma antes de mostrar/gerar a lista.
function onRegistroDataChange() {
    const codigo = extrairCodigoTreinamento(document.getElementById('registroCodigoInput').value);
    const data = document.getElementById('registroDataSelect').value;
    const wrap = document.getElementById('registroResponsavelWrap');
    const sel = document.getElementById('registroResponsavelSelect');
    document.getElementById('registroDetalheCard').style.display = 'none';

    if (!codigo || !data) { wrap.style.display = 'none'; return; }

    const efetivoPorMatricula = new Map(allEfetivo.map(e => [e.id, e]));
    const sessaoBruta = allTreinamentosRealizados.filter(r => r.treinamento_cod === codigo && r.data_treinamento === data);

    const grupos = new Map();
    sessaoBruta.forEach(r => {
        const resp = efetivoPorMatricula.get(r.matricula)?.responsavel || REGISTRO_SEM_ENCARREGADO;
        grupos.set(resp, (grupos.get(resp) || 0) + 1);
    });
    const opcoes = Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (opcoes.length <= 1) {
        // Uma frente só (ou ninguém com responsável definido) - não precisa escolher.
        wrap.style.display = 'none';
        sel.value = opcoes.length === 1 ? opcoes[0][0] : '';
        carregarSessaoRegistro();
        return;
    }

    wrap.style.display = 'block';
    sel.innerHTML = '<option value="">— Escolha a frente de serviço —</option>' +
        opcoes.map(([resp, qtd]) =>
            `<option value="${escapeHTML(resp)}">${escapeHTML(resp === REGISTRO_SEM_ENCARREGADO ? '(Sem encarregado definido)' : resp)} (${qtd})</option>`
        ).join('');
}

function carregarSessaoRegistro() {
    const codigo = extrairCodigoTreinamento(document.getElementById('registroCodigoInput').value);
    const data = document.getElementById('registroDataSelect').value;
    const card = document.getElementById('registroDetalheCard');
    if (!codigo || !data) { card.style.display = 'none'; return; }

    const wrap = document.getElementById('registroResponsavelWrap');
    const precisaEscolherFrente = wrap.style.display !== 'none';
    const respFiltro = precisaEscolherFrente ? document.getElementById('registroResponsavelSelect').value : null;
    if (precisaEscolherFrente && !respFiltro) { card.style.display = 'none'; return; }

    const efetivoPorMatricula = new Map(allEfetivo.map(e => [e.id, e]));
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    registroSessaoAtual = allTreinamentosRealizados
        .filter(r => r.treinamento_cod === codigo && r.data_treinamento === data)
        .filter(r => {
            if (respFiltro === null) return true;
            const resp = efetivoPorMatricula.get(r.matricula)?.responsavel || REGISTRO_SEM_ENCARREGADO;
            return resp === respFiltro;
        })
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (registroSessaoAtual.length === 0) { card.style.display = 'none'; return; }

    registroModoNovo = false;
    registroDataAtual = data;
    registroCodigoAtual = codigo;
    document.getElementById('btnSalvarDetalhesSessao').style.display = 'inline-block';
    document.getElementById('registroNovaEquipeWrap').style.display = 'none';

    const base = registroSessaoAtual[0];
    const frenteLabel = respFiltro && respFiltro !== REGISTRO_SEM_ENCARREGADO ? ` — Frente: ${respFiltro}` : '';
    document.getElementById('registroDetalheTitulo').textContent = `🖨️ ${cat ? cat.nome : codigo} — ${formatSimpleDate(data)}${frenteLabel}`;
    document.getElementById('registroPresencaPreview').textContent =
        `${registroSessaoAtual.length} colaborador(es) na lista de presença: ` +
        registroSessaoAtual.map(r => r.nome).join(', ');
    atualizarVisibilidadeProvaWrap(cat);

    document.getElementById('registroForm_turma').value = base.numero_turma || '';
    document.getElementById('registroForm_horaInicio').value = base.hora_inicio || '';
    document.getElementById('registroForm_horaTermino').value = base.hora_termino || '';
    document.getElementById('registroForm_local').value = base.local_realizacao || '';
    document.getElementById('registroForm_encResponsavel').value =
        base.encarregado_responsavel || (respFiltro && respFiltro !== REGISTRO_SEM_ENCARREGADO ? respFiltro : '');
    document.getElementById('registroForm_instrutorNome').value = base.instrutor_nome || 'MARIA GESSICA DA SILVA ROQUE';
    document.getElementById('registroForm_instrutorQualificacao').value = base.instrutor_qualificacao || 'TEC. SEG. TRABALHO';
    document.getElementById('registroForm_instrutorRegistro').value = base.instrutor_registro || 'MTE: 15760/PE';
    document.getElementById('registroForm_respTecnicoNome').value = base.responsavel_tecnico_nome || 'JOÃO EVERTON DE SOUZA LIMEIRA';
    document.getElementById('registroForm_respTecnicoQualificacao').value = base.responsavel_tecnico_qualificacao || 'ENG. SEG. TRABALHO';
    document.getElementById('registroForm_respTecnicoRegistro').value = base.responsavel_tecnico_registro || 'CREA: 0522078320';

    const prevObjEl = document.getElementById('registroTemaObjetivoPreview');
    const prevContEl = document.getElementById('registroTemaConteudoPreview');
    if (prevObjEl) prevObjEl.textContent = cat?.objetivo ? '🎯 Objetivo: ' + cat.objetivo : '⚠️ Sem Objetivo cadastrado no catálogo (clique em Editar Tema acima)';
    if (prevContEl) prevContEl.textContent = cat?.conteudo_programatico ? '📚 Conteúdo Programático:\n' + cat.conteudo_programatico : '⚠️ Sem Conteúdo Programático cadastrado';

    document.getElementById('registroDetalheStatus').textContent = '';
    renderRegistroDocsIndividuaisList();
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Fluxo pro caso relatado pelo usuário: sessão de hoje (ou data futura) que ainda não
// foi lançada em treinamentos_realizados - até aqui só dava pra gerar o Registro de uma
// sessão que já existia no sistema, mas o formulário físico precisa existir ANTES da
// presença ser digitada (leva pro campo, colhe assinatura, só depois lança). Monta
// `registroSessaoAtual` a partir do efetivo (mesma fonte de "Carregar equipe do
// Responsável" em Lançar Treinamento), não de treinamentos_realizados - por isso não tem
// nada pra "salvar" aqui, só pra gerar; o lançamento de presença de verdade continua
// sendo feito depois pela aba Lançar Treinamento, normalmente.
function carregarSessaoNovaRegistro() {
    const codigo = extrairCodigoTreinamento(document.getElementById('registroNovaCodigoInput').value);
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const card = document.getElementById('registroDetalheCard');
    if (!codigo || !cat) { alert('Informe um código de treinamento válido do catálogo.'); return; }
    const data = document.getElementById('registroDataNovaInput').value;
    if (!data) { alert('Informe a data da sessão.'); return; }

    const responsavel = document.getElementById('registroResponsavelNovaSelect').value;
    registroNovaEquipe = new Map();
    equipeDaFrente(responsavel).forEach(p => registroNovaEquipe.set(p.matricula, { nome: p.nome, funcao: p.funcao, checked: true }));
    document.getElementById('registroNovaEquipeWrap').style.display = 'block';
    renderRegistroNovaEquipeList();

    registroModoNovo = true;
    registroDataAtual = data;
    registroCodigoAtual = codigo;
    document.getElementById('btnSalvarDetalhesSessao').style.display = 'none';

    const frenteLabel = responsavel ? ` — Frente: ${responsavel}` : '';
    document.getElementById('registroDetalheTitulo').textContent = `🖨️ ${cat.nome} — ${formatSimpleDate(data)}${frenteLabel} (ainda não lançada)`;
    document.getElementById('registroPresencaPreview').textContent = registroNovaEquipe.size > 0
        ? `${registroNovaEquipe.size} colaborador(es) pré-carregado(s) pela equipe - ajuste abaixo se precisar.`
        : 'Nenhuma equipe pré-carregada - adicione colaboradores avulso abaixo, ou deixe em branco (26 linhas numeradas) pra preencher no campo.';
    atualizarVisibilidadeProvaWrap(cat);

    document.getElementById('registroForm_turma').value = '';
    document.getElementById('registroForm_horaInicio').value = '';
    document.getElementById('registroForm_horaTermino').value = '';
    document.getElementById('registroForm_local').value = '';
    document.getElementById('registroForm_encResponsavel').value = responsavel || '';
    document.getElementById('registroForm_instrutorNome').value = 'MARIA GESSICA DA SILVA ROQUE';
    document.getElementById('registroForm_instrutorQualificacao').value = 'TEC. SEG. TRABALHO';
    document.getElementById('registroForm_instrutorRegistro').value = 'MTE: 15760/PE';
    document.getElementById('registroForm_respTecnicoNome').value = 'JOÃO EVERTON DE SOUZA LIMEIRA';
    document.getElementById('registroForm_respTecnicoQualificacao').value = 'ENG. SEG. TRABALHO';
    document.getElementById('registroForm_respTecnicoRegistro').value = 'CREA: 0522078320';

    const prevObjEl = document.getElementById('registroTemaObjetivoPreview');
    const prevContEl = document.getElementById('registroTemaConteudoPreview');
    if (prevObjEl) prevObjEl.textContent = cat?.objetivo ? '🎯 Objetivo: ' + cat.objetivo : '⚠️ Sem Objetivo cadastrado no catálogo (clique em Editar Tema acima)';
    if (prevContEl) prevContEl.textContent = cat?.conteudo_programatico ? '📚 Conteúdo Programático:\n' + cat.conteudo_programatico : '⚠️ Sem Conteúdo Programático cadastrado';

    document.getElementById('registroDetalheStatus').textContent = '';
    renderRegistroDocsIndividuaisList();
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- Equipe de "Nova Sessão" (ver comentário de registroNovaEquipe) ----

function filterRegistroNovaEquipeAddColab(query) {
    const container = document.getElementById('registroNovaEquipeAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }
    const matches = allEfetivo.filter(e =>
        !registroNovaEquipe.has(e.id) &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);
    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarRegistroNovaEquipeAvulso('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${colaboradorEstaAtivo(e) ? '' : ' — (Desligado)'}</div>
        </div>`).join('');
}

function adicionarRegistroNovaEquipeAvulso(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    registroNovaEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, checked: true });
    document.getElementById('registroNovaEquipeAddColab').value = '';
    document.getElementById('registroNovaEquipeAddColabResults').innerHTML = '';
    renderRegistroNovaEquipeList();
}

function removerRegistroNovaEquipeColab(matricula) {
    registroNovaEquipe.delete(matricula);
    renderRegistroNovaEquipeList();
}

function toggleRegistroNovaEquipeColab(matricula, checked) {
    const c = registroNovaEquipe.get(matricula);
    if (c) c.checked = checked;
}

function renderRegistroNovaEquipeList() {
    const container = document.getElementById('registroNovaEquipeList');
    const contagemEl = document.getElementById('registroNovaEquipeContagem');
    if (!container) return;
    if (contagemEl) contagemEl.textContent = Array.from(registroNovaEquipe.values()).filter(c => c.checked).length;
    if (registroNovaEquipe.size === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador na equipe ainda.</div>';
        return;
    }
    const entries = Array.from(registroNovaEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    container.innerHTML = entries.map(([matricula, c]) => `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="toggleRegistroNovaEquipeColab('${escapeHTML(matricula)}', this.checked)" style="width:17px; height:17px; flex-shrink:0; cursor:pointer;">
            <div style="flex:1;">
                <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
                <div class="db-list-item-sub">${escapeHTML(c.funcao || '')} — Matrícula ${escapeHTML(matricula)}</div>
            </div>
            <button onclick="removerRegistroNovaEquipeColab('${escapeHTML(matricula)}')" title="Remover" style="background:none; border:none; color: var(--danger); cursor:pointer; font-size: 16px; padding: 4px;">✕</button>
        </div>`).join('');
}

// ============================================
// KITS E DOCUMENTOS - atalho A MAIS pra emitir/reimprimir Kit Completo/OS/Certificado/
// Declaração/Termo de Recusa sem passar pelo fluxo de "Preparar Registro" (que existe pra
// lançar presença oficial, FOR.001.R00). Estado próprio (kitsEquipe/kitsCodigoAtual/
// kitsDataAtual/campos kitsForm_*) - não toca em registroNovaEquipe/registroCodigoAtual/
// registroDataAtual/registroForm_*, então abrir uma aba nunca bagunça o que está em
// andamento na outra. Os 5 geradores de documento (gerarKitCompletoIntegracao etc.) são
// os MESMOS da aba Registro - só passam um contexto próprio (ver contextoKits()) em vez
// de deixar no valor padrão, sem duplicar a lógica de montagem de nenhum documento.
// ============================================

let kitsEquipe = new Map();
let kitsCodigoAtual = '';
let kitsDataAtual = '';
// Rastreia se Horário Início/Término/Local ainda estão no valor que NÓS preenchemos
// (então é seguro atualizar quando o treinamento mudar) ou se o usuário editou na mão
// (aí o valor dele nunca é sobrescrito, mesmo trocando de treinamento depois).
let kitsCamposAutoPreenchidos = { horaInicio: true, horaTermino: true, local: true };

function popularKitsResponsavelSelect() {
    const sel = document.getElementById('kitsResponsavelSelect');
    if (!sel || sel.options.length > 1) return;
    todasFrentesAtivas().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
}

// Chamado ao entrar na aba - só popula o select de frentes e os campos de
// instrutor/responsável técnico na primeira vez (mesmo padrão de "só popula uma vez" já
// usado em popularCatalogoDatalist/popularResponsavelSelect), preservando o que o
// usuário já tiver editado se ele voltar pra essa aba depois de visitar outra.
function inicializarKitsTab() {
    popularKitsResponsavelSelect();
    const instrutorEl = document.getElementById('kitsForm_instrutorNome');
    if (instrutorEl && !instrutorEl.dataset.inicializado) {
        instrutorEl.value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_nome;
        document.getElementById('kitsForm_instrutorQualificacao').value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_qualificacao;
        document.getElementById('kitsForm_instrutorRegistro').value = CRONOGRAMA_DEFAULTS_SESSAO.instrutor_registro;
        document.getElementById('kitsForm_respTecnicoNome').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome;
        document.getElementById('kitsForm_respTecnicoQualificacao').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_qualificacao;
        document.getElementById('kitsForm_respTecnicoRegistro').value = CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_registro;
        instrutorEl.dataset.inicializado = '1';
        aplicarDefaultsSessaoKits(kitsCodigoAtual);
    }
    renderKitsEquipeList();
    renderKitsDocsIndividuaisList();
}

// Horário e Local padrão por treinamento (confirmado com o usuário): o Kit de Integração
// (id "1") precisa somar 6h efetivas exigidas pela norma descontando 1h de almoço - 08h
// às 12h (4h) + almoço (não conta) + 13h às 15h (2h) = 6h efetivas. Qualquer outro
// treinamento do catálogo (os formais, lançados às terças/quintas nesse contrato - não é
// o DDS diário, que é outro processo fora do sistema) usa 07h-09h. Só sobrescreve o campo
// se ele ainda estiver no valor que preenchemos automaticamente (ver
// kitsCamposAutoPreenchidos) - edição manual do usuário nunca é sobrescrita.
function aplicarDefaultsSessaoKits(codigo) {
    const defaults = codigo === '1' ? { horaInicio: '08:00', horaTermino: '15:00' } : { horaInicio: '07:00', horaTermino: '09:00' };
    if (kitsCamposAutoPreenchidos.horaInicio) document.getElementById('kitsForm_horaInicio').value = defaults.horaInicio;
    if (kitsCamposAutoPreenchidos.horaTermino) document.getElementById('kitsForm_horaTermino').value = defaults.horaTermino;
    if (kitsCamposAutoPreenchidos.local) document.getElementById('kitsForm_local').value = 'Canteiro / Frente de Serviço';
}

function kitsMarcarCampoEditado(campo) {
    kitsCamposAutoPreenchidos[campo] = false;
}

function onKitsCodigoChange() {
    const codigo = extrairCodigoTreinamento(document.getElementById('kitsCodigoInput').value);
    const infoEl = document.getElementById('kitsInfo');
    kitsCodigoAtual = codigo;
    if (!codigo) { infoEl.style.display = 'none'; return; }

    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    infoEl.style.display = 'block';
    if (!cat) {
        infoEl.style.color = 'var(--danger)';
        infoEl.innerHTML = '❌ Código não encontrado no catálogo de treinamentos.';
        return;
    }
    infoEl.style.color = 'var(--text)';
    infoEl.innerHTML = `<strong>${escapeHTML(cat.nome)}</strong> — Carga horária: ${cat.carga_horaria || 0}h — ${cat.meses_validade ? `Validade: ${cat.meses_validade} meses` : 'Sem validade (avulso)'}`;
    aplicarDefaultsSessaoKits(codigo);
}

function onKitsDataChange() {
    kitsDataAtual = document.getElementById('kitsDataInput').value;
}

function carregarKitsEquipeResponsavel() {
    const responsavel = document.getElementById('kitsResponsavelSelect').value;
    kitsEquipe = new Map();
    if (responsavel) {
        equipeDaFrente(responsavel).forEach(p => kitsEquipe.set(p.matricula, { nome: p.nome, funcao: p.funcao, checked: true }));
    }
    renderKitsEquipeList();
    renderKitsDocsIndividuaisList();
}

function filterKitsAddColab(query) {
    const container = document.getElementById('kitsAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }
    const matches = allEfetivo.filter(e =>
        !kitsEquipe.has(e.id) &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);
    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarKitsColabAvulso('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${colaboradorEstaAtivo(e) ? '' : ' — (Desligado)'}</div>
        </div>`).join('');
}

function adicionarKitsColabAvulso(matricula) {
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    kitsEquipe.set(matricula, { nome: e.nome, funcao: e.funcao, checked: true });
    document.getElementById('kitsAddColab').value = '';
    document.getElementById('kitsAddColabResults').innerHTML = '';
    renderKitsEquipeList();
    renderKitsDocsIndividuaisList();
}

function removerKitsColabLista(matricula) {
    kitsEquipe.delete(matricula);
    renderKitsEquipeList();
    renderKitsDocsIndividuaisList();
}

function toggleKitsColabPresenca(matricula, checked) {
    const c = kitsEquipe.get(matricula);
    if (c) c.checked = checked;
    renderKitsDocsIndividuaisList();
}

function renderKitsEquipeList() {
    const container = document.getElementById('kitsEquipeList');
    const contagemEl = document.getElementById('kitsEquipeContagem');
    if (!container) return;
    if (contagemEl) contagemEl.textContent = Array.from(kitsEquipe.values()).filter(c => c.checked).length;
    if (kitsEquipe.size === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador na equipe ainda.</div>';
        return;
    }
    const entries = Array.from(kitsEquipe.entries()).sort((a, b) => (a[1].nome || '').localeCompare(b[1].nome || ''));
    container.innerHTML = entries.map(([matricula, c]) => `
        <div class="db-list-item" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" ${c.checked ? 'checked' : ''} onchange="toggleKitsColabPresenca('${escapeHTML(matricula)}', this.checked)" style="width:17px; height:17px; flex-shrink:0; cursor:pointer;">
            <div style="flex:1;">
                <div class="db-list-item-title">${escapeHTML(c.nome || '')}</div>
                <div class="db-list-item-sub">${escapeHTML(c.funcao || '')} — Matrícula ${escapeHTML(matricula)}</div>
            </div>
            <button onclick="removerKitsColabLista('${escapeHTML(matricula)}')" title="Remover" style="background:none; border:none; color: var(--danger); cursor:pointer; font-size: 16px; padding: 4px;">✕</button>
        </div>`).join('');
}

// Mesmo formato de contexto que os 5 geradores esperam (ver contextoRegistroPadrao) - só
// a fonte dos dados muda (equipe/campos/código/data desta aba, não os da aba Registro).
function contextoKits() {
    return {
        colaboradores: Array.from(kitsEquipe.entries()).filter(([, c]) => c.checked).map(([matricula, c]) => ({ matricula, nome: c.nome, funcao: c.funcao })),
        codigo: kitsCodigoAtual,
        data: kitsDataAtual,
        campos: lerCamposSessaoForm('kitsForm_')
    };
}

function renderKitsDocsIndividuaisList() {
    const container = document.getElementById('kitsDocsIndividuaisLista');
    if (!container) return;
    const colaboradores = Array.from(kitsEquipe.entries()).filter(([, c]) => c.checked).map(([matricula, c]) => ({ matricula, nome: c.nome, funcao: c.funcao }));
    if (colaboradores.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador na equipe ainda - carregue pelo Responsável ou adicione avulso acima.</div>';
        return;
    }
    container.innerHTML = colaboradores.map(r => {
        // Mesmo aviso que sai impresso na própria OS (ver textoAvisoCargoOs) - mostrado
        // aqui também, ANTES de gerar o documento.
        const avaliacao = avaliarCorrespondenciaCargoOs(r.matricula, r.funcao);
        const avisoOsIcon = avaliacao.semCorrespondencia
            ? ` <span title="${escapeHTML(textoAvisoCargoOs({ ghe: avaliacao.ghe, funcao: avaliacao.funcao, ambiguo: avaliacao.ambiguo }))}" style="cursor:help;">⚠️</span>`
            : '';
        return `
        <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; font-size:12.5px;">${escapeHTML(r.nome)} <span style="color:var(--text-light);">— ${escapeHTML(r.funcao || '')}</span></div>
            <button class="db-apply-btn" style="padding:5px 10px; font-size:11.5px;" title="OS + Lista de Presença + Certificado + Declaração de Integração + Termo de Recusa" onclick="gerarKitCompletoIntegracao('${escapeHTML(r.matricula)}', contextoKits())">🖨️ Kit Completo</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarOrdemServicoIndividual('${escapeHTML(r.matricula)}', contextoKits())">🖨️ OS</button>${avisoOsIcon}
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="abrirModalEmissaoCertificado('${escapeHTML(r.matricula)}', contextoKits())">🖨️ Certificado</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarDeclaracaoIntegracaoIndividual('${escapeHTML(r.matricula)}', contextoKits())">🖨️ Declaração</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarTermoRecusaIndividual('${escapeHTML(r.matricula)}', contextoKits())">🖨️ Termo de Recusa</button>
        </div>`;
    }).join('');
}

function popularFiltroAnoRegistroLote() {
    const anos = new Set([new Date().getFullYear()]);
    allTreinamentosCronograma.forEach(c => { if (c.data_prevista) anos.add(parseLocalDate(c.data_prevista).getFullYear()); });
    popularSelectAnos('registroLoteFiltroAno', anos);
    const anoSel = document.getElementById('registroLoteFiltroAno');
    const mesSel = document.getElementById('registroLoteFiltroMes');
    if (anoSel && !anoSel.dataset.inicializado) { anoSel.value = registroLoteFiltroAno; anoSel.dataset.inicializado = '1'; }
    if (mesSel && !mesSel.dataset.inicializado) { mesSel.value = registroLoteFiltroMes; mesSel.dataset.inicializado = '1'; }

    // Igual ano/mês acima: só reseta pra "todas marcadas" na primeira vez que a tela
    // carrega (dataset.inicializado), pra não apagar a seleção do usuário toda vez que ele
    // volta pra essa aba.
    const frenteWrap = document.getElementById('registroLoteFrenteCheckboxList');
    if (frenteWrap && !frenteWrap.dataset.inicializado) {
        registroLoteFrentesSelecionadas = new Set(todasFrentesAtivas());
        frenteWrap.dataset.inicializado = '1';
    }
    renderRegistroLoteFrentesCheckboxes();

    renderRegistroLotePreview();
}

// Checkboxes de frente (multi-seleção) + resumo clicável ("Frentes: Todas (12)" / "Frentes:
// 3 selecionada(s)") - mesmo espírito da lista de itens do cronograma com "Marcar
// todos"/"Desmarcar todos", só que pra frentes em vez de temas.
function renderRegistroLoteFrentesCheckboxes() {
    const wrap = document.getElementById('registroLoteFrenteCheckboxList');
    if (!wrap) return;
    const frentes = todasFrentesAtivas();
    wrap.innerHTML = frentes.length === 0
        ? '<div class="db-list-empty" style="padding:8px 0;">Nenhuma frente cadastrada em Efetivo.</div>'
        : frentes.map(f => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:12.5px; cursor:pointer;">
                <input type="checkbox" value="${escapeHTML(f)}" ${registroLoteFrentesSelecionadas.has(f) ? 'checked' : ''} onchange="onRegistroLoteFrenteCheckboxChange()" style="width:15px; height:15px; flex-shrink:0; cursor:pointer;">
                <span>${escapeHTML(f)}</span>
            </label>`).join('');
    atualizarResumoFrentesLote();
}

function atualizarResumoFrentesLote() {
    const resumoEl = document.getElementById('registroLoteFrenteResumo');
    if (!resumoEl) return;
    const total = todasFrentesAtivas().length;
    const sel = registroLoteFrentesSelecionadas.size;
    resumoEl.textContent = total === 0 ? 'Frentes: nenhuma cadastrada'
        : sel >= total ? `Frentes: Todas (${total})`
        : sel === 0 ? 'Frentes: nenhuma selecionada'
        : `Frentes: ${sel} selecionada(s)`;
}

function atualizarResumoLoteCronograma() {
    const resumoEl = document.getElementById('registroLoteResumo');
    const btnEl = document.getElementById('btnImprimirLoteCronograma');
    const itens = itensLoteCronogramaFiltrados();
    const selecionados = registroLoteSelecionados || new Set(itens.map(c => c.id));
    const qtdTemasSel = itens.filter(c => selecionados.has(c.id)).length;
    const qtdFrentesSel = registroLoteFrentesSelecionadas ? registroLoteFrentesSelecionadas.size : 0;
    const totalListas = qtdTemasSel * qtdFrentesSel;

    if (resumoEl) {
        resumoEl.innerHTML = `${itens.length} tema(s) no filtro — <strong>${qtdTemasSel} selecionado(s)</strong> × <strong>${qtdFrentesSel} frente(s)</strong> = <span style="color:var(--primary); font-weight:700;">${totalListas} lista(s) a gerar</span>`;
    }
    if (btnEl) {
        btnEl.textContent = totalListas > 0
            ? `🖨️ Imprimir Selecionados (${qtdTemasSel} temas × ${qtdFrentesSel} frentes = ${totalListas} listas)`
            : '🖨️ Imprimir Selecionados';
    }
}

function onRegistroLoteFrenteCheckboxChange() {
    const wrap = document.getElementById('registroLoteFrenteCheckboxList');
    registroLoteFrentesSelecionadas = new Set(
        Array.from(wrap.querySelectorAll('input[type=checkbox]:checked')).map(el => el.value)
    );
    atualizarResumoFrentesLote();
    atualizarResumoLoteCronograma();
}

function marcarTodasFrentesLote(marcar) {
    registroLoteFrentesSelecionadas = marcar ? new Set(todasFrentesAtivas()) : new Set();
    renderRegistroLoteFrentesCheckboxes();
    atualizarResumoFrentesLote();
    atualizarResumoLoteCronograma();
}

function onRegistroLoteFiltroChange() {
    registroLoteFiltroAno = document.getElementById('registroLoteFiltroAno').value;
    registroLoteFiltroMes = document.getElementById('registroLoteFiltroMes').value;
    registroLoteFiltroTema = document.getElementById('registroLoteFiltroTema').value;
    registroLoteSelecionados = null;
    renderRegistroLotePreview();
}

function limparFiltroRegistroLote() {
    registroLoteFiltroAno = '';
    registroLoteFiltroMes = '';
    registroLoteFiltroTema = '';
    document.getElementById('registroLoteFiltroAno').value = '';
    document.getElementById('registroLoteFiltroMes').value = '';
    document.getElementById('registroLoteFiltroTema').value = '';
    registroLoteFrentesSelecionadas = new Set(todasFrentesAtivas());
    renderRegistroLoteFrentesCheckboxes();
    registroLoteSelecionados = null;
    renderRegistroLotePreview();
}

// Itens do cronograma dentro do filtro atual (ano/mês/tema/frentes) - reaproveitado tanto
// pra prévia quanto pra geração de verdade, pra nunca divergir.
// Itens do cronograma dentro do filtro atual (ano/mês/tema) - as frentes selecionadas
// definem para quais equipes as listas de presença serão geradas (combinando cada tema com cada frente).
function itensLoteCronogramaFiltrados() {
    let itens = allTreinamentosCronograma.filter(c => c.status !== 'lancado');
    if (registroLoteFiltroAno) {
        itens = itens.filter(c => c.data_prevista && parseLocalDate(c.data_prevista).getFullYear() === parseInt(registroLoteFiltroAno, 10));
        if (registroLoteFiltroMes !== '') {
            itens = itens.filter(c => parseLocalDate(c.data_prevista).getMonth() === parseInt(registroLoteFiltroMes, 10));
        }
    }
    if (registroLoteFiltroTema) {
        itens = itens.filter(c => c.treinamento_cod === registroLoteFiltroTema);
    }
    itens.sort((a, b) => (a.data_prevista || '').localeCompare(b.data_prevista || ''));
    return itens;
}

// Prévia com seleção antes de gerar - antes disso o botão gerava tudo do filtro
// ano/mês sem mostrar quais itens eram esses nem deixar escolher um tema ou item
// específico (relatado como confuso pelo usuário).
function renderRegistroLotePreview() {
    const container = document.getElementById('registroLotePreview');
    const resumoEl = document.getElementById('registroLoteResumo');
    if (!container) return;
    const catalogoPorId = new Map(allTreinamentosCatalogo.map(c => [c.id, c]));

    // Select de tema populado com os temas do filtro de ano/mês atual (sem aplicar o
    // próprio filtro de tema, senão a lista de opções colapsaria pra 1 assim que
    // escolhida).
    let itensParaTemas = allTreinamentosCronograma.filter(c => c.status !== 'lancado');
    if (registroLoteFiltroAno) {
        itensParaTemas = itensParaTemas.filter(c => c.data_prevista && parseLocalDate(c.data_prevista).getFullYear() === parseInt(registroLoteFiltroAno, 10));
        if (registroLoteFiltroMes !== '') {
            itensParaTemas = itensParaTemas.filter(c => parseLocalDate(c.data_prevista).getMonth() === parseInt(registroLoteFiltroMes, 10));
        }
    }
    const temasDisponiveis = new Map();
    itensParaTemas.forEach(c => { if (!temasDisponiveis.has(c.treinamento_cod)) temasDisponiveis.set(c.treinamento_cod, catalogoPorId.get(c.treinamento_cod)?.nome || c.treinamento_cod); });
    const temaSel = document.getElementById('registroLoteFiltroTema');
    if (temaSel) {
        temaSel.innerHTML = '<option value="">Todos os temas...</option>' +
            Array.from(temasDisponiveis.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([cod, nome]) => `<option value="${escapeHTML(cod)}">${escapeHTML(nome)}</option>`).join('');
        temaSel.value = registroLoteFiltroTema;
    }

    const itens = itensLoteCronogramaFiltrados();
    if (registroLoteSelecionados === null) {
        registroLoteSelecionados = new Set(itens.map(c => c.id));
    }

    if (itens.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum item planejado nesse filtro.</div>';
        if (resumoEl) resumoEl.textContent = '';
        return;
    }

    atualizarResumoLoteCronograma();

    container.innerHTML = itens.map(c => {
        const cat = catalogoPorId.get(c.treinamento_cod);
        const marcado = registroLoteSelecionados.has(c.id);
        return `<div class="db-list-item" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" ${marcado ? 'checked' : ''} onchange="toggleRegistroLoteSelecionado('${escapeHTML(c.id)}', this.checked)" style="width:16px; height:16px; flex-shrink:0; cursor:pointer;">
            <div>
                <div class="db-list-item-title">${formatSimpleDate(c.data_prevista)} — ${escapeHTML(cat ? cat.nome : c.treinamento_cod)}</div>
                <div class="db-list-item-sub">${c.responsavel ? 'Setor: ' + escapeHTML(c.responsavel) : 'SESMT'}</div>
            </div>
        </div>`;
    }).join('');
}

function toggleRegistroLoteSelecionado(id, checked) {
    if (!registroLoteSelecionados) registroLoteSelecionados = new Set();
    if (checked) registroLoteSelecionados.add(id);
    else registroLoteSelecionados.delete(id);
    atualizarResumoLoteCronograma();
}

function marcarTodosLoteCronograma(marcar) {
    const itens = itensLoteCronogramaFiltrados();
    registroLoteSelecionados = marcar ? new Set(itens.map(c => c.id)) : new Set();
    renderRegistroLotePreview();
}

// Prefixo parametrizado pra reaproveitar a mesma leitura de campos tanto no card de
// detalhe da aba Registro (registroForm_*) quanto na aba Kits e Documentos (kitsForm_*) -
// mesmo conjunto de campos, dois lugares na tela (não dá pra ter os dois com o mesmo id
// no DOM ao mesmo tempo), uma lógica só de leitura.
function lerCamposSessaoForm(prefix = 'registroForm_') {
    return {
        numero_turma: document.getElementById(`${prefix}turma`).value.trim() || null,
        hora_inicio: document.getElementById(`${prefix}horaInicio`).value || null,
        hora_termino: document.getElementById(`${prefix}horaTermino`).value || null,
        local_realizacao: document.getElementById(`${prefix}local`).value.trim() || null,
        encarregado_responsavel: document.getElementById(`${prefix}encResponsavel`).value.trim() || null,
        instrutor_nome: document.getElementById(`${prefix}instrutorNome`).value.trim() || null,
        instrutor_qualificacao: document.getElementById(`${prefix}instrutorQualificacao`).value.trim() || null,
        instrutor_registro: document.getElementById(`${prefix}instrutorRegistro`).value.trim() || null,
        responsavel_tecnico_nome: document.getElementById(`${prefix}respTecnicoNome`).value.trim() || null,
        responsavel_tecnico_qualificacao: document.getElementById(`${prefix}respTecnicoQualificacao`).value.trim() || null,
        responsavel_tecnico_registro: document.getElementById(`${prefix}respTecnicoRegistro`).value.trim() || null
    };
}

// Upsert de linha CHEIA (spread da linha já carregada + campos da sessão por cima), não
// parcial - diferente de colaboradores_efetivo (só "id" é NOT NULL lá), aqui `matricula`
// também é NOT NULL, e o Postgres valida essa constraint contra a linha do INSERT antes
// de resolver o ON CONFLICT, mesmo quando a coluna não enviada resultaria só num UPDATE.
// Confirmado ao vivo: enviar só {id, ...campos} disparava "null value in column matricula
// violates not-null constraint" - mesma classe de problema já documentada pra
// epi_entregas (tabela com NOT NULL além de id precisa de payload completo).
async function salvarDetalhesSessao() {
    const statusEl = document.getElementById('registroDetalheStatus');
    if (registroModoNovo || registroSessaoAtual.length === 0) return;
    const campos = lerCamposSessaoForm();
    const linhas = registroSessaoAtual.map(r => ({ ...r, ...campos }));

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_realizados', linhas);
        registroSessaoAtual = registroSessaoAtual.map(r => ({ ...r, ...campos }));
        registroSessaoAtual.forEach(r => {
            const idx = allTreinamentosRealizados.findIndex(x => x.id === r.id);
            if (idx >= 0) allTreinamentosRealizados[idx] = { ...allTreinamentosRealizados[idx], ...campos };
        });
        statusEl.textContent = '✅ Detalhes da sessão salvos.';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao salvar detalhes da sessão:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// Gera o documento a partir dos valores ATUAIS do formulário (não exige salvar antes) -
// mesmo padrão visual/CSS e mesma técnica de abertura (Blob + <a target="_blank">.click(),
// nunca window.open) já validados na Ficha de EPI (abrirFichaEpiColaborador).
// CSS compartilhado entre o Registro de Treinamento avulso (uma sessão) e a impressão em
// lote do Cronograma (várias sessões, uma "folha" por página) - um só lugar pra manter
// os dois documentos visualmente idênticos.
const REGISTRO_TREINAMENTO_CSS = `
    @page { size: A4 portrait; margin: 6mm 8mm; }
    @page registro_portrait { size: A4 portrait; margin: 6mm 8mm; }

    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 0; }
    .folha-registro { max-width: 1000px; margin: 0 auto; border: 2px solid #000; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid; }
    .cabecalho { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
    .cabecalho .logo { width: 130px; padding: 2px 6px; border-right: 2px solid #000; text-align: center; display: flex; align-items: center; justify-content: center; }
    .cabecalho .titulo { flex: 1; text-align: center; font-weight: 700; font-size: 12pt; padding: 2px; display:flex; align-items:center; justify-content:center; }
    .cabecalho .codigo { width: 100px; padding: 2px; border-left: 2px solid #000; text-align: center; font-weight: 700; font-size: 9.5pt; display:flex; align-items:center; justify-content:center; }
    .linha { display: flex; border-bottom: 1px solid #000; }
    .campo { flex: 1; padding: 1px 6px; border-right: 1px solid #000; font-size: 9pt; line-height: 1.2; }
    .campo:last-child { border-right: none; }
    .campo b { margin-right: 3px; }
    .campo-titulo { font-weight: 700; text-align: center; font-size: 8.5pt; background: #fafafa; }
    .bloco-texto { padding: 0; white-space: pre-line; font-size: 8.5pt; line-height: 1.18; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 1px 4px; font-size: 9pt; vertical-align: middle; }
    th { background: #e5e5e5; font-size: 9pt; font-weight: 700; height: 20px; }
    .tr-registro { height: 28px !important; }
    .tr-registro td { height: 28px !important; vertical-align: middle; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
    .quebra-pagina { page-break-after: always; break-after: page; }
    @media print {
        .no-print { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .folha-registro { border: 2px solid #000; page-break-inside: avoid !important; break-inside: avoid !important; }
        .print-registro-portrait { page: registro_portrait; page-break-after: always; break-after: page; }
    }
`;

// Monta só o bloco <div class="folha">...</div> (cabeçalho + tabela de presença) de um
// Registro de Treinamento - usado tanto pela geração avulsa (gerarRegistroTreinamento)
// quanto pela impressão em lote do Cronograma (gerarListasCronogramaMes), que concatena
// uma folha por sessão num único documento.
function construirFolhaRegistroTreinamento(sessaoRows, campos, codigo, cat, data) {
    // Grade fixa de 22 linhas (linhas 01 a 22) com altura mínima de 28px por linha
    // Preenche a folha harmoniosamente até a base, eliminando o vazio inferior (NR-01).
    const REGISTRO_MIN_LINHAS = 22;
    const REGISTRO_ALTURA_LINHA = '28px';
    const linhasReais = sessaoRows.map((r, i) => `<tr class="tr-registro" style="height:${REGISTRO_ALTURA_LINHA};">
        <td style="text-align:center; height:${REGISTRO_ALTURA_LINHA};">${String(i + 1).padStart(2, '0')}</td>
        <td style="text-align:center; height:${REGISTRO_ALTURA_LINHA};">${escapeHTML(r.matricula || '')}</td>
        <td style="height:${REGISTRO_ALTURA_LINHA};">${escapeHTML(r.nome || '')}</td>
        <td style="height:${REGISTRO_ALTURA_LINHA};">${escapeHTML(r.funcao || '')}</td>
        <td style="height:${REGISTRO_ALTURA_LINHA};"></td>
    </tr>`);
    const linhasVazias = [];
    for (let i = sessaoRows.length; i < REGISTRO_MIN_LINHAS; i++) {
        linhasVazias.push(`<tr class="tr-registro" style="height:${REGISTRO_ALTURA_LINHA};">
        <td style="text-align:center; height:${REGISTRO_ALTURA_LINHA};">${String(i + 1).padStart(2, '0')}</td>
        <td style="height:${REGISTRO_ALTURA_LINHA};"></td>
        <td style="height:${REGISTRO_ALTURA_LINHA};"></td>
        <td style="height:${REGISTRO_ALTURA_LINHA};"></td>
        <td style="height:${REGISTRO_ALTURA_LINHA};"></td>
    </tr>`);
    }
    const linhasTabela = linhasReais.concat(linhasVazias).join('');

    return `
    <div class="folha-registro print-registro-portrait">
        <div class="cabecalho">
            <div class="logo"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-width:100%; max-height:36px; object-fit:contain;"></div>
            <div class="titulo">REGISTRO DE TREINAMENTO</div>
            <div class="codigo">${escapeHTML(codigoRevisaoDocumento('registro_treinamento') || 'FOR.001')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:0 0 100px;"><b>Código:</b> ${escapeHTML(codigo)}</div>
            <div class="campo" style="flex:3;"><b>Título do Treinamento:</b> ${escapeHTML(cat ? cat.nome : '')}</div>
            <div class="campo" style="flex:0 0 140px;"><b>Nº Turma:</b> ${escapeHTML(campos.numero_turma || '')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>EMPRESA:</b> COP - Consórcio Operador Ramal do Agreste</div>
            <div class="campo"><b>Início:</b> ${escapeHTML(campos.hora_inicio || '')}${campos.hora_inicio ? 'h' : ''}</div>
            <div class="campo"><b>Data:</b> ${formatSimpleDate(data)}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>OBRA:</b> Ramal do Agreste</div>
            <div class="campo"><b>Término:</b> ${escapeHTML(campos.hora_termino || '')}${campos.hora_termino ? 'h' : ''}</div>
            <div class="campo"><b>Carga Horária:</b> ${cat && cat.carga_horaria ? cat.carga_horaria + ' horas' : ''}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Objetivo:</b><div class="bloco-texto">${escapeHTML(cat?.objetivo || '')}</div></div>
            <div class="campo"><b>Método de Avaliação da Eficácia:</b><div class="bloco-texto">${escapeHTML(cat?.metodo_avaliacao || 'Entendimento Participante')}</div></div>
        </div>
        <div class="linha">
            <div class="campo"><b>Conteúdo Programático:</b><div class="bloco-texto">${escapeHTML(cat?.conteudo_programatico || '')}</div></div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Local de Realização do Treinamento:</b> ${escapeHTML(campos.local_realizacao || '')}</div>
            <div class="campo"><b>Enc. / Responsável:</b> ${escapeHTML(campos.encarregado_responsavel || '')}</div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Instrutor do Treinamento:</b> ${escapeHTML(campos.instrutor_nome || '')}</div>
            <div class="campo"><b>Qualificação:</b> ${escapeHTML(campos.instrutor_qualificacao || '')}</div>
            <div class="campo"><b>Assinatura:</b></div>
        </div>
        <div class="linha">
            <div class="campo" style="flex:2;"><b>Responsável Técnico:</b> ${escapeHTML(campos.responsavel_tecnico_nome || '')}</div>
            <div class="campo"><b>Qualificação:</b> ${escapeHTML(campos.responsavel_tecnico_qualificacao || '')}</div>
            <div class="campo"><b>Assinatura:</b></div>
        </div>
        <div class="linha campo-titulo"><div class="campo">TODOS OS CAMPOS ACIMA SÃO DE PREENCHIMENTO OBRIGATÓRIO</div></div>
        <table class="tabela-registro">
            <thead>
                <tr><th style="width:32px;">QTD</th><th style="width:65px;">MATRÍCULA</th><th>NOME COMPLETO (LEGÍVEL)</th><th style="width:140px;">FUNÇÃO</th><th style="width:150px;">ASSINATURA</th></tr>
            </thead>
            <tbody>
                ${linhasTabela || '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhum colaborador nesta sessão</td></tr>'}
            </tbody>
        </table>
    </div>`;
}

async function gerarRegistroTreinamento() {
    if (!registroDataAtual) return;
    await garantirDocumentosControleCarregados();
    const codigo = registroCodigoAtual;
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const data = registroDataAtual;
    const campos = lerCamposSessaoForm();

    // No modo "Nova Sessão" a equipe vem do seletor editável (registroNovaEquipe) - só
    // quem estiver marcado entra na folha. Sessão já lançada (não-nova) continua usando
    // registroSessaoAtual direto, como sempre (não tem seletor pra editar ali).
    const sessaoRows = registroModoNovo
        ? Array.from(registroNovaEquipe.entries()).filter(([, c]) => c.checked).map(([matricula, c]) => ({ matricula, nome: c.nome, funcao: c.funcao }))
        : registroSessaoAtual;
    const folha = construirFolhaRegistroTreinamento(sessaoRows, campos, codigo, cat, data);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Registro de Treinamento - ${escapeHTML(cat ? cat.nome : codigo)} - ${formatSimpleDate(data)}</title>
<style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    ${REGISTRO_TREINAMENTO_CSS}
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${folha}
</body></html>`;

    const tituloDoc = `Registro_Treinamento_${(cat ? cat.nome : codigo).replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`;
    if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
        abrirDocumentoHtmlParaImpressao(html, tituloDoc);
    } else if (typeof abrirDocumentoBlob === 'function') {
        abrirDocumentoBlob(html, tituloDoc);
    }

    registrarEmissaoDocumento('registro_treinamento', `${cat ? cat.nome : codigo} — ${formatSimpleDate(data)}`);
}

// Mesmo treinamento+data, mas uma folha por frente ativa (não só a equipe carregada no
// seletor) - pro caso comum de um tema precisar ir pra várias equipes de uma vez
// ("uma lista por frente, pra cada tema"). Ignora o ajuste manual do seletor de
// "Nova Sessão" de propósito (cada frente usa a equipe real dela, sem avulso por
// frente) - pra ajustar uma frente específica, gere ela sozinha pelo botão normal.
async function gerarListaPorFrenteRegistro() {
    if (!registroDataAtual) return;
    await garantirDocumentosControleCarregados();
    const codigo = registroCodigoAtual;
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const data = registroDataAtual;
    const campos = lerCamposSessaoForm();

    const frentes = todasFrentesAtivas();
    if (frentes.length === 0) {
        alert('Nenhuma frente cadastrada em Efetivo (campo Responsável).');
        return;
    }
    if (!confirm(`Isso vai gerar ${frentes.length} lista(s) (uma por frente) num único documento. Continuar?`)) return;

    const folhas = frentes.map((frente, i) => {
        const sessaoRows = equipeDaFrente(frente);
        const camposFrente = { ...campos, encarregado_responsavel: frente };
        const folha = construirFolhaRegistroTreinamento(sessaoRows, camposFrente, codigo, cat, data);
        registrarEmissaoDocumento('registro_treinamento', `${cat ? cat.nome : codigo} — ${formatSimpleDate(data)} — ${frente}`);
        return i < frentes.length - 1 ? `<div class="quebra-pagina">${folha}</div>` : folha;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Registro de Treinamento (todas as frentes) - ${escapeHTML(cat ? cat.nome : codigo)} - ${formatSimpleDate(data)}</title>
<style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    ${REGISTRO_TREINAMENTO_CSS}
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

    const tituloDocFrentes = `Registro_Treinamento_Frentes_${formatSimpleDate(data).replace(/\//g, '-')}`;
    if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
        abrirDocumentoHtmlParaImpressao(html, tituloDocFrentes);
    } else if (typeof abrirDocumentoBlob === 'function') {
        abrirDocumentoBlob(html, tituloDocFrentes);
    }
}

// ---- Documentos individuais por colaborador (Certificado / Kit de Integração) ----
// Reaproveitam a sessão já carregada em registroSessaoAtual/registroDataAtual (mesma
// busca por treinamento+data já usada pro Registro de Treinamento coletivo) - não pedem
// nenhum dado novo além do que a aba Registro já reúne.

// Kit Completo = os 5 documentos que uma admissão precisa (OS + Lista de Presença da
// turma + Certificado + Declaração de Integração + Termo de Recusa), confirmado com o
// usuário. Cada um também tem botão próprio pro caso comum de um colaborador errar a
// assinatura de só um documento e precisar reimprimir apenas aquele, sem regerar os
// outros 4. Lista de Presença não tem botão por-colaborador aqui de propósito - é
// inerentemente um documento da turma toda, já acessível pelo botão coletivo no topo da
// aba ("🖨️ Gerar Registro de Treinamento").
function renderRegistroDocsIndividuaisList() {
    const container = document.getElementById('registroDocsIndividuaisLista');
    if (!container) return;
    const colaboradores = colaboradoresDaSessaoAtual();
    if (colaboradores.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador na sessão.</div>';
        return;
    }
    container.innerHTML = colaboradores.map(r => {
        // Mesmo aviso que sai impresso na própria OS (ver textoAvisoCargoOs) - mostrado
        // aqui também, ANTES de gerar o documento, pra não descobrir só na hora de
        // entregar pro colaborador que a OS saiu em branco.
        const avaliacao = avaliarCorrespondenciaCargoOs(r.matricula, r.funcao);
        const avisoOsIcon = avaliacao.semCorrespondencia
            ? ` <span title="${escapeHTML(textoAvisoCargoOs({ ghe: avaliacao.ghe, funcao: avaliacao.funcao, ambiguo: avaliacao.ambiguo }))}" style="cursor:help;">⚠️</span>`
            : '';
        return `
        <div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; flex-wrap:wrap;">
            <div style="flex:1; min-width:180px; font-size:12.5px;">${escapeHTML(r.nome)} <span style="color:var(--text-light);">— ${escapeHTML(r.funcao || '')}</span></div>
            <button class="db-apply-btn" style="padding:5px 10px; font-size:11.5px;" title="OS + Lista de Presença + Certificado + Declaração de Integração + Termo de Recusa" onclick="gerarKitCompletoIntegracao('${escapeHTML(r.matricula)}')">🖨️ Kit Completo</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarOrdemServicoIndividual('${escapeHTML(r.matricula)}')">🖨️ OS</button>${avisoOsIcon}
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="abrirModalEmissaoCertificado('${escapeHTML(r.matricula)}')">🖨️ Certificado</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarDeclaracaoIntegracaoIndividual('${escapeHTML(r.matricula)}')">🖨️ Declaração</button>
            <button class="db-clear-btn" style="padding:5px 10px; font-size:11.5px;" onclick="gerarTermoRecusaIndividual('${escapeHTML(r.matricula)}')">🖨️ Termo de Recusa</button>
        </div>`;
    }).join('');
}

const DOC_INDIVIDUAL_CSS = `
    @page { size: A4 portrait; margin: 12mm; }
    @page os_portrait { size: A4 portrait; margin: 12mm; }
    @page registro_portrait { size: A4 portrait; margin: 6mm 8mm; }
    @page cert_landscape { size: A4 landscape; margin: 8mm; }
    @page decl_portrait { size: A4 portrait; margin: 8mm 10mm; }
    @page recusa_landscape { size: A4 landscape; margin: 15mm; }

    @media print {
        .no-print { display: none !important; }
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
        }
        .print-os-portrait {
            page: os_portrait;
            page-break-after: always !important;
            break-after: page !important;
        }
        .print-registro-portrait {
            page: registro_portrait;
            page-break-after: always !important;
            break-after: page !important;
        }
        .print-certificado-landscape {
            page: cert_landscape;
            page-break-after: always !important;
            break-after: page !important;
        }
        .print-declaracao-portrait {
            page: decl_portrait;
            page-break-after: always !important;
            break-after: page !important;
        }
        .print-termo-recusa {
            page: recusa_landscape;
            page-break-after: auto !important;
            break-after: auto !important;
        }
        .folha-certificado {
            height: 194mm !important;
            max-height: 194mm !important;
            min-height: 185mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
        .moldura-certificado {
            height: 100% !important;
            min-height: 185mm !important;
            max-height: 194mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 18px 24px !important;
        }
        .folha-declaracao, .declaracao-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
        }
        .assinaturas, .assinaturas-os, .assinaturas-cert, .assinaturas-recusa, .assinaturas-declaracao, .assinatura-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
        }
    }

    body {
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
        margin: 0;
        padding: 0;
    }

    /* ---- 1. ORDEM DE SERVIÇO (OS - NR-01) - FOLHA A4 RETRATO ---- */
    .folha-os {
        box-sizing: border-box !important;
        padding: 0 !important;
        max-width: 820px;
        margin: 0 auto;
        font-family: Arial, Helvetica, sans-serif !important;
        color: #111 !important;
        font-size: 10pt !important;
        line-height: 1.28 !important;
    }
    .folha-os .titulo-os {
        text-align: center;
        font-weight: 700;
        font-size: 12pt;
        letter-spacing: 0.3px;
        line-height: 1.2;
        margin-top: 2px;
        margin-bottom: 2px;
        color: #0f172a;
    }
    .folha-os .subtitulo-os {
        text-align: center;
        font-size: 9pt;
        color: #475569;
        margin-top: 0;
        margin-bottom: 4px;
        font-weight: 600;
    }
    .folha-os .tabela-os-identificacao {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5pt;
        margin-bottom: 4px;
    }
    .folha-os .tabela-os-identificacao td {
        border: 1px solid #334155;
        padding: 3px 5px;
        line-height: 1.22;
    }
    .folha-os .bloco-os {
        margin-top: 4px;
    }
    .folha-os .bloco-titulo-os {
        font-weight: 700;
        font-size: 10.5pt;
        margin-top: 4px;
        margin-bottom: 2px;
        color: #0f172a;
        text-transform: uppercase;
        line-height: 1.2;
    }
    .folha-os .texto-os {
        font-size: 10pt;
        line-height: 1.28;
        text-align: justify;
    }
    .folha-os .tabela-os-agentes {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
        margin-top: 2px;
    }
    .folha-os .tabela-os-agentes th {
        background: #f1f5f9;
        border: 1px solid #334155;
        padding: 2px 4px;
        font-weight: 700;
        text-align: center;
        font-size: 9pt;
        line-height: 1.2;
    }
    .folha-os .tabela-os-agentes td {
        border: 1px solid #334155;
        padding: 3px 4px;
        line-height: 1.22;
        font-size: 9pt;
        vertical-align: top;
    }
    .folha-os .grid-epis-epcs-os {
        display: flex;
        gap: 10px;
        margin-top: 4px;
    }
    .folha-os .lista-itens-os {
        columns: 2;
        column-gap: 8px;
        font-size: 9.5pt;
        line-height: 1.22;
    }
    .folha-os .lista-itens-os > div {
        break-inside: avoid;
    }
    .folha-os .declaracao-os {
        margin-top: 6px;
        padding-top: 4px;
        border-top: 1px solid #94a3b8;
        font-size: 9pt;
        line-height: 1.25;
        text-align: justify;
    }
    .folha-os .assinaturas-os {
        display: flex;
        justify-content: space-around;
        margin-top: 10px;
        margin-bottom: 0;
        gap: 16px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .folha-os .assinaturas-os .assinatura-item {
        text-align: center;
        font-size: 9pt;
        width: 46%;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .folha-os .assinaturas-os .assinatura-item .linha-assinatura {
        margin-top: 10px;
        font-size: 10pt;
        letter-spacing: 0.5px;
        line-height: 1;
    }
    .folha-os .assinaturas-os .assinatura-item .linha-nome {
        margin-top: 2px;
        line-height: 1.18;
        font-size: 9pt;
    }

    /* ---- 2. CERTIFICADO DE CAPACITAÇÃO (A4 PAISAGEM / LANDSCAPE) ---- */
    .folha-certificado {
        box-sizing: border-box;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        width: 100%;
        margin: 0 auto;
        height: 100%;
        min-height: 185mm;
    }
    .moldura-certificado {
        border: 3px double #0f172a;
        padding: 18px 24px;
        box-sizing: border-box;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 185mm;
        height: 100%;
    }
    @media screen {
        .moldura-certificado {
            min-height: calc(100vh - 16mm);
            height: calc(100vh - 16mm);
        }
    }
    .cabecalho-cert {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 8px;
        flex-shrink: 0;
    }
    .titulo-cert {
        font-size: 22pt;
        letter-spacing: 2px;
        font-weight: 800;
        text-align: center;
        color: #0f172a;
        margin: 4px 0 2px;
    }
    .subtitulo-cert {
        text-align: center;
        font-size: 10pt;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 10px;
    }
    .texto-cert {
        font-size: 11.5pt;
        line-height: 1.5;
        text-align: justify;
        color: #1e293b;
        margin-bottom: 8px;
    }
    .bloco-conteudo-cert {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 14px;
        margin-bottom: 8px;
    }
    .bloco-conteudo-titulo-cert {
        font-size: 10pt;
        font-weight: 700;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 3px;
    }
    .bloco-conteudo-texto-cert {
        font-size: 9.5pt;
        line-height: 1.4;
        white-space: pre-line;
        color: #334155;
    }
    .meta-cert {
        display: flex;
        justify-content: space-between;
        font-size: 9.5pt;
        color: #334155;
        margin-bottom: 6px;
    }
    .rodape-legal-cert {
        font-size: 8.5pt;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
        margin-bottom: 8px;
    }
    .assinaturas-cert {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: auto;
        padding-top: 10px;
        gap: 12px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .assinaturas-cert .assinatura-item {
        text-align: center;
        font-size: 9.5pt;
        width: 31%;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .assinaturas-cert .assinatura-item .linha-assinatura {
        font-size: 11pt;
        letter-spacing: 0.5px;
        margin-bottom: 3px;
    }

    /* ---- 3. TERMO DE DIREITO DE RECUSA (A4 PAISAGEM / LANDSCAPE) ---- */
    .folha-termo-recusa {
        box-sizing: border-box;
    }
    .moldura-recusa {
        border: 2px solid #0f172a;
        padding: 20px 28px;
        box-sizing: border-box;
        border-radius: 4px;
    }
    .cabecalho-recusa {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 14px;
    }
    .titulo-recusa {
        text-align: center;
        font-weight: 800;
        font-size: 18pt;
        letter-spacing: 1px;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .subtitulo-recusa {
        text-align: center;
        font-size: 10.5pt;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 18px;
    }
    .bloco-texto-recusa {
        max-width: 900px;
        margin: 0 auto;
        font-size: 12.5pt;
        line-height: 1.7;
        text-align: justify;
        color: #1e293b;
    }
    .bloco-texto-recusa p {
        margin: 0 0 10px;
    }
    .data-local-recusa {
        font-size: 11pt;
        color: #334155;
        margin-top: 18px;
        text-align: right;
    }
    .rodape-legal-recusa {
        font-size: 9pt;
        color: #64748b;
        border-top: 1px solid #cbd5e1;
        padding-top: 6px;
        margin-top: 10px;
    }
    .assinaturas-recusa {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        margin-top: 26px;
        gap: 30px;
    }
    .assinaturas-recusa .assinatura-item {
        text-align: center;
        font-size: 10pt;
        width: 42%;
    }
    .assinaturas-recusa .assinatura-item .linha-assinatura {
        font-size: 11pt;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
    }

    /* ---- 4. DECLARAÇÃO DE INTEGRAÇÃO (A4 RETRATO / PORTRAIT) ---- */
    .folha-declaracao,
    .declaracao-container {
        border: 2px solid #000;
        padding: 10px 14px;
        box-sizing: border-box;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        max-width: 820px;
        margin: 0 auto;
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
    }
    .titulo-decl {
        text-align: center;
        font-weight: 700;
        font-size: 13pt;
        letter-spacing: 0.5px;
        margin-top: 2px;
        margin-bottom: 2px;
        color: #0f172a;
    }
    .subtitulo-decl {
        text-align: center;
        font-size: 8.5pt;
        color: #475569;
        margin-top: 0;
        margin-bottom: 5px;
        font-weight: 600;
    }
    .identificacao-decl {
        margin-bottom: 4px;
    }
    .texto-decl {
        font-size: 8.5pt;
        line-height: 1.25;
        text-align: justify;
        color: #1e293b;
    }
    .texto-intro-decl {
        margin-top: 3px;
        margin-bottom: 4px;
    }
    .bloco-decl {
        margin-top: 3px;
        margin-bottom: 4px;
    }
    .bloco-titulo-decl {
        font-weight: 700;
        font-size: 8.5pt;
        margin-bottom: 2px;
        color: #0f172a;
        text-transform: uppercase;
        line-height: 1.2;
    }
    .lista-obrigacoes-decl {
        font-size: 8.5pt;
        line-height: 1.22;
        padding-left: 18px;
        margin: 2px 0 3px;
        color: #334155;
    }
    .lista-obrigacoes-decl li {
        margin-bottom: 1.5px;
    }
    .grade-topicos-decl {
        columns: 3;
        column-gap: 10px;
        font-size: 8pt;
        line-height: 1.2;
        margin-top: 2px;
        margin-bottom: 4px;
        color: #334155;
    }
    .grade-topicos-decl > div {
        break-inside: avoid;
        padding: 1px 3px;
    }
    .assinaturas-declaracao {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 10px;
        margin-bottom: 0;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .assinaturas-declaracao .assinatura-decl-item {
        flex: 1;
        box-sizing: border-box;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .assinaturas-declaracao .linha-ass-decl {
        font-size: 8.5pt;
        letter-spacing: 0.5px;
        margin-top: 3px;
        margin-bottom: 2px;
    }

    /* ---- COMPATIBILIDADE GERAL (folha-compacta) ---- */
    .folha { max-width: 900px; margin: 0 auto 24px; border: 2px solid #000; padding: 24px; }
    .folha-compacta { padding: 10px 14px !important; }
    .folha-compacta .titulo { font-size: 13pt; margin-top: 2px; margin-bottom: 2px; text-align: center; font-weight: 700; color: #0f172a; }
    .folha-compacta .subtitulo { text-align: center; font-size: 8.5pt; color: #475569; margin-top: 0; margin-bottom: 5px; font-weight: 600; }
    .folha-compacta .texto { font-size: 8.5pt; line-height: 1.25; text-align: justify; color: #1e293b; }
    .folha-compacta .bloco { margin-top: 3px; margin-bottom: 4px; }
    .folha-compacta .bloco-titulo { font-size: 8.5pt; margin-bottom: 2px; font-weight: 700; color: #0f172a; text-transform: uppercase; }
    .folha-compacta .lista-obrigacoes { font-size: 8.5pt; line-height: 1.22; margin: 2px 0 3px; padding-left: 18px; color: #334155; }
    .folha-compacta .lista-obrigacoes li { margin-bottom: 1.5px; }
    .folha-compacta .grade-topicos { font-size: 8pt; line-height: 1.2; margin-top: 2px; margin-bottom: 4px; columns: 3; column-gap: 10px; color: #334155; }
    .folha-compacta .grade-topicos > div { padding: 1px 3px; break-inside: avoid; }
    .assinatura-item .linha-assinatura { font-size: 11pt; letter-spacing: 0.5px; }
    .assinatura-item .linha-nome { margin-top: 2px; }
    .no-print { text-align: center; margin: 16px 0; }
    .no-print button { padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; border: none; background: #4f46e5; color: #fff; }
`;

// Linha de assinatura como texto (underscores), não border-top
function blocoAssinatura(conteudoHTML) {
    return `<div class="assinatura-item"><div class="linha-assinatura">______________________________</div><div class="linha-nome">${conteudoHTML}</div></div>`;
}

const CONTEUDO_PROGRAMATICO_PADRAO_NR18_NR01 = 
`1. As condições e meio ambiente de trabalho;
2. Os riscos inerentes às atividades (físicos, químicos, biológicos, ergonômicos e fatores psicossociais);
3. Prevenção e combate ao assédio no ambiente de trabalho (Lei 14.457/22);
4. Equipamentos de proteção coletiva (EPC) e individual (EPI);
5. Diretrizes do PGR da obra, plano de emergência e direito de recusa.`;

function construirFolhaCertificado(r, colab, cat, codigo, campos, data, customParams = {}) {
    const codigoDoc = codigoRevisaoDocumento('certificado_individual') || 'CERT.SMS.001';
    
    // Aproveitamento Satisfatório (NR-01 Item 1.7.1.1 Alínea "f")
    // Preenchimento dinâmico: exibe 'Apto', nota ou percentual informado (evita linha vazia)
    let aproveitamentoVal = (customParams.aproveitamento !== undefined && customParams.aproveitamento !== null)
        ? String(customParams.aproveitamento).trim()
        : (r && r.aproveitamento ? String(r.aproveitamento).trim() : 'Apto');

    let aproveitamentoHtml = '';
    if (!aproveitamentoVal) {
        aproveitamentoHtml = '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>';
    } else {
        let displayVal = aproveitamentoVal;
        // Se for puramente numérico (ex: "100" ou "95"), adiciona o símbolo de porcentagem
        if (/^\d+(\s*,\s*\d+)?$/.test(displayVal)) {
            displayVal = `${displayVal}%`;
        }
        aproveitamentoHtml = `<u>&nbsp;${escapeHTML(displayVal)}&nbsp;</u>`;
    }
    
    // Conteúdo programático (prioridade: customParams -> cat.conteudo_programatico -> padrão NR-18/NR-01)
    let conteudo = customParams.conteudoProgramatico;
    if (conteudo === undefined || conteudo === null) {
        conteudo = cat?.conteudo_programatico || '';
    }
    const nomeTreinamento = cat ? cat.nome : (codigo || 'Treinamento de Segurança do Trabalho');
    const nomeNorm = (nomeTreinamento || '').toLowerCase();
    if (!conteudo.trim() && (codigo === '1' || nomeNorm.includes('integra') || nomeNorm.includes('18') || nomeNorm.includes('capacita'))) {
        conteudo = CONTEUDO_PROGRAMATICO_PADRAO_NR18_NR01;
    }
    
    // Base legal
    const baseLegal = customParams.certificadoBaseLegal || cat?.certificado_base_legal || 'Portaria MTE nº 1.419/2024, NR-01 Item 1.7.1.1, Lei nº 14.457/2022 e NR-18 Anexo I (Capacitação Básica em Canteiro de Obras).';
    
    // Modalidade
    const modalidade = customParams.modalidade || 'Presencial';
    
    // Local e horários
    const localRealizacao = customParams.localRealizacao || campos.local_realizacao || 'Canteiro de Obras — PISF Ramal do Agreste';
    const instrutorNome = customParams.instrutorNome || campos.instrutor_nome || '';
    const instrutorQualificacao = customParams.instrutorQualificacao || campos.instrutor_qualificacao || '';
    const instrutorRegistro = customParams.instrutorRegistro || campos.instrutor_registro || '';
    const respTecnicoNome = customParams.respTecnicoNome || campos.responsavel_tecnico_nome || '';
    const respTecnicoQualificacao = customParams.respTecnicoQualificacao || campos.responsavel_tecnico_qualificacao || '';
    const respTecnicoRegistro = customParams.respTecnicoRegistro || campos.responsavel_tecnico_registro || '';
    
    const cargaHorariaStr = (cat && cat.carga_horaria) ? `${cat.carga_horaria} horas` : 'Carga horária regulamentar';
    const horarioStr = (campos.hora_inicio && campos.hora_termino) ? ` (das ${campos.hora_inicio} às ${campos.hora_termino})` : '';
    const turmaStr = campos.numero_turma ? ` | Turma: ${escapeHTML(campos.numero_turma)}` : '';
    
    const tituloTreinamento = cat ? cat.nome : (codigo || 'Treinamento de Segurança do Trabalho');

    return `<div class="folha-certificado print-certificado-landscape">
        <div class="moldura-certificado">
            <div class="cabecalho-cert">
                <img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:46px; object-fit:contain;">
                <div style="text-align:right;">
                    <div style="font-size:11pt; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
                    <div style="font-size:9.5pt; color:#475569;">CNPJ: ${escapeHTML(EMPRESA_INFO.cnpj)} | PISF Ramal do Agreste</div>
                </div>
            </div>
            
            <div class="titulo-cert">CERTIFICADO DE CAPACITAÇÃO</div>
            <div class="subtitulo-cert">
                Segurança e Saúde no Trabalho — Requisitos da NR-01 (Item 1.7.1.1) • ${escapeHTML(codigoDoc)}
            </div>

            <div class="texto-cert">
                Certificamos que <b>${escapeHTML(r.nome)}</b>, portador(a) do CPF nº <b>${escapeHTML(colab?.cpf || 'Não informado')}</b>, 
                função: <b>${escapeHTML(r.funcao || colab?.funcao || 'Operacional')}</b>, colaborador(a) da empresa <b>${escapeHTML(EMPRESA_INFO.razaoSocial)}</b>, 
                CNPJ: <b>${escapeHTML(EMPRESA_INFO.cnpj)}</b>, participou do treinamento de <b>${escapeHTML(tituloTreinamento)}</b>, realizado em <b>${formatSimpleDate(data)}</b>, 
                com carga horária total de <b>${escapeHTML(cargaHorariaStr)}</b>${horarioStr}${turmaStr}, ministrado na modalidade <b>${escapeHTML(modalidade)}</b>, 
                e <b>concluiu com aproveitamento satisfatório: ${aproveitamentoHtml}</b>.
            </div>

            ${conteudo.trim() ? `
            <div class="bloco-conteudo-cert">
                <div class="bloco-conteudo-titulo-cert">Conteúdo Programático Ministrado:</div>
                <div class="bloco-conteudo-texto-cert">${escapeHTML(conteudo.trim())}</div>
            </div>` : ''}

            <div class="meta-cert">
                <div><b>Local de realização:</b> ${escapeHTML(localRealizacao)}</div>
                ${cat?.meses_validade ? `<div><b>Validade / Periodicidade:</b> Reciclagem a cada ${cat.meses_validade} meses</div>` : ''}
                <div><b>Data de Emissão:</b> ${formatSimpleDate(data)}</div>
            </div>

            ${baseLegal ? `<div class="rodape-legal-cert">${escapeHTML(baseLegal)}</div>` : ''}

            <div class="assinaturas-cert">
                ${blocoAssinatura(`${escapeHTML(instrutorNome || 'Instrutor Autorizado')}<br>${escapeHTML(instrutorQualificacao || 'Qualificação Técnica')}${instrutorRegistro ? '<br>' + escapeHTML(instrutorRegistro) : ''}<br><span style="font-size:8.5pt; color:#64748b;">Instrutor / Capacitação</span>`)}
                ${blocoAssinatura(`${escapeHTML(r.nome)}<br>CPF: ${escapeHTML(colab?.cpf || '')}<br><span style="font-size:8.5pt; color:#64748b;">Colaborador(a) Capacitado(a)</span>`)}
                ${blocoAssinatura(`${escapeHTML(respTecnicoNome || 'Responsável Técnico SST')}<br>${escapeHTML(respTecnicoQualificacao || 'Engenharia de Segurança')}${respTecnicoRegistro ? '<br>' + escapeHTML(respTecnicoRegistro) : ''}<br><span style="font-size:8.5pt; color:#64748b;">Responsável Técnico</span>`)}
            </div>
        </div>
    </div>`;
}

function construirFolhaDeclaracaoIntegracao(r, cat, campos, data) {
    const codigoIntegracao = codigoRevisaoDocumento('declaracao_integracao') || 'FORM.SMS.001';
    const obrigacoesEmpresa = (cat?.integracao_obrigacoes_empresa || '').split('\n').filter(l => l.trim()).map(l => `<li>${escapeHTML(l.replace(/^\d+\.\s*/, ''))}</li>`).join('');
    const obrigacoesEmpregado = (cat?.integracao_obrigacoes_empregado || '').split('\n').filter(l => l.trim()).map(l => `<li>${escapeHTML(l.replace(/^\d+\.\s*/, ''))}</li>`).join('');
    const topicos = (cat?.integracao_programa || '').split('\n').filter(l => l.trim()).map(l => `<div>${escapeHTML(l.trim())}</div>`).join('');
    return `<div class="folha-declaracao declaracao-container folha-compacta print-declaracao-portrait">
        <div style="text-align:center; margin-bottom: 4px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:42px; object-fit:contain;"></div>
        <div class="titulo-decl titulo">DECLARAÇÃO DE INTEGRAÇÃO</div>
        <div class="subtitulo-decl subtitulo">${escapeHTML(codigoIntegracao)}</div>
        <div class="identificacao-decl">
            <div class="texto-decl texto"><b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
            <div class="texto-decl texto"><b>NOME:</b> ${escapeHTML(r.nome)} &nbsp; <b>FUNÇÃO:</b> ${escapeHTML(r.funcao || '')} &nbsp; <b>DATA:</b> ${formatSimpleDate(data)}</div>
        </div>
        <div class="texto-decl texto-intro-decl texto">
            Pela presente Declaração de Integração objetivamos informar os trabalhadores que executam suas atividades laborais nesse setor${cat?.integracao_base_legal ? `, conforme estabelece a ${escapeHTML(cat.integracao_base_legal)}` : ''}.
            Declaro ter recebido treinamento sobre segurança do trabalho, com carga horária de ${cat && cat.carga_horaria ? cat.carga_horaria : ''}h e concordo em acatar as Normas da Empresa, descritas abaixo e as específicas com relação a minha atividade.
            Declaro também ter recebido cópia deste documento.
        </div>
        <div class="bloco-decl bloco">
            <div class="bloco-titulo-decl bloco-titulo">OBRIGAÇÕES DA EMPRESA:</div>
            <ol class="lista-obrigacoes-decl lista-obrigacoes">${obrigacoesEmpresa || '<li style="color:#888;">Nenhuma obrigação cadastrada no catálogo</li>'}</ol>
        </div>
        <div class="bloco-decl bloco">
            <div class="bloco-titulo-decl bloco-titulo">OBRIGAÇÕES DO EMPREGADO:</div>
            <ol class="lista-obrigacoes-decl lista-obrigacoes">${obrigacoesEmpregado || '<li style="color:#888;">Nenhuma obrigação cadastrada no catálogo</li>'}</ol>
        </div>
        <div class="bloco-decl bloco">
            <div class="bloco-titulo-decl bloco-titulo">PROGRAMA DO TREINAMENTO DE INTEGRAÇÃO:</div>
            <div class="grade-topicos-decl grade-topicos">${topicos || '<div style="color:#888;">Nenhum tópico cadastrado no catálogo</div>'}</div>
        </div>
        <div class="assinaturas-declaracao">
            <div class="assinatura-decl-item bloco">
                <div class="bloco-titulo-decl bloco-titulo">RESPONSÁVEL PELA INTEGRAÇÃO</div>
                <div class="texto-decl texto">NOME: ${escapeHTML(campos.instrutor_nome || '')}</div>
                <div class="linha-ass-decl texto">ASSINATURA: __________________________________________</div>
            </div>
            <div class="assinatura-decl-item bloco">
                <div class="bloco-titulo-decl bloco-titulo">COLABORADOR</div>
                <div class="linha-ass-decl texto">ASSINATURA: __________________________________________</div>
                <div class="texto-decl texto">DATA: ____/____/________</div>
            </div>
        </div>
    </div>`;
}

function construirFolhaTermoRecusa(r, cat, campos, data) {
    const codigoRecusa = codigoRevisaoDocumento('termo_recusa') || 'FORM.SMS.002';
    return `<div class="folha-termo-recusa print-termo-recusa">
        <div class="moldura-recusa">
            <div class="cabecalho-recusa">
                <img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:46px; object-fit:contain;">
                <div style="text-align:right;">
                    <div style="font-size:11pt; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${escapeHTML(EMPRESA_INFO.razaoSocial)}</div>
                    <div style="font-size:9.5pt; color:#475569;">CNPJ: ${escapeHTML(EMPRESA_INFO.cnpj)} | PISF Ramal do Agreste</div>
                </div>
            </div>

            <div class="titulo-recusa">TERMO DE CONHECIMENTO — DIREITO DE RECUSA</div>
            <div class="subtitulo-recusa">${escapeHTML(codigoRecusa)} — Disposições Gerais da NR-01 (Item 1.4.3)</div>

            <div class="bloco-texto-recusa">
                <p>
                    Após treinamento e capacitação em Segurança e Saúde no Trabalho realizados no âmbito da empresa <b>${escapeHTML(EMPRESA_INFO.razaoSocial)}</b>,
                    eu, <b>${escapeHTML(r.nome)}</b>, função <b>${escapeHTML(r.funcao || 'Operacional')}</b>, declaro estar ciente de que, durante as minhas atividades de trabalho,
                    se houver justificativa razoável para crer que minha vida e/ou integridade física minha e/ou de meus colegas de trabalho se encontre em risco grave e iminente,
                    poderei <b>suspender a realização dessas atividades (exercer o Direito de Recusa)</b>, comunicando imediatamente tal fato ao meu superior hierárquico, que após avaliar a situação e constatando a
                    existência da condição de risco grave e iminente manterá a suspensão das atividades, até que venha ser normalizada a referida situação.
                </p>
                <p style="margin-top:14px; font-weight:600; color:#0f172a;">
                    Em cumprimento estrito ao subitem 1.4.3 da NR-01, a empresa assegura e garante expressamente que o Direito de Recusa nos termos acima não implicará em qualquer sanção disciplinar, penalidade ou prejuízo ao colaborador.
                </p>
            </div>

            <div class="data-local-recusa">
                ${escapeHTML(campos.local_realizacao || 'Canteiro de Obras — PISF Ramal do Agreste')}, ${formatSimpleDate(data)}.
            </div>

            ${cat?.recusa_base_legal ? `<div class="rodape-legal-recusa">${escapeHTML(cat.recusa_base_legal)}</div>` : ''}

            <div class="assinaturas-recusa">
                ${blocoAssinatura(`${escapeHTML(r.nome)}<br><span style="font-size:9pt; color:#475569;">Assinatura do Colaborador</span>`)}
                ${blocoAssinatura(`${escapeHTML(campos.responsavel_tecnico_nome || 'Engenharia de Segurança do Trabalho')}<br><span style="font-size:9pt; color:#475569;">Responsável Técnico SST</span>`)}
            </div>
        </div>
    </div>`;
}

// ---- Geradores standalone (1 documento, 1 folha) ----

// Contexto padrão (aba Registro) pros 5 geradores abaixo - default param avaliado de
// novo a cada chamada sem 2º argumento, então o comportamento pra quem já chama sem
// contexto (botões da aba Registro, inalterados) continua idêntico a antes. A aba Kits e
// Documentos passa o próprio contexto (ver contextoKits()) pra reaproveitar os mesmos 5
// geradores com a equipe/campos daquela aba, sem duplicar a lógica de montagem dos
// documentos.
function contextoRegistroPadrao() {
    return {
        colaboradores: colaboradoresDaSessaoAtual(),
        codigo: registroCodigoAtual,
        data: registroDataAtual,
        campos: lerCamposSessaoForm('registroForm_')
    };
}

async function gerarCertificadoIndividual(matricula, ctx = contextoRegistroPadrao(), customParams = {}) {
    const { colaboradores, codigo, data, campos } = ctx;
    const r = colaboradores.find(x => x.matricula === matricula);
    if (!r) return;
    await garantirDocumentosControleCarregados();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const colab = allEfetivo.find(e => e.id === matricula);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Certificado - ${escapeHTML(r.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 landscape; margin: 8mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${construirFolhaCertificado(r, colab, cat, codigo, campos, data, customParams)}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Certificado_${(r.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('certificado_individual', `${r.nome} — ${cat ? cat.nome : codigo}`);
}

async function gerarCertificadosTurma(ctx = contextoRegistroPadrao(), customParams = {}) {
    const { colaboradores, codigo, data, campos } = ctx;
    if (!colaboradores || colaboradores.length === 0) {
        alert('Nenhum colaborador na turma atual.');
        return;
    }
    await garantirDocumentosControleCarregados();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);

    const folhas = colaboradores.map(r => {
        const colab = allEfetivo.find(e => e.id === r.matricula);
        return construirFolhaCertificado(r, colab, cat, codigo, campos, data, customParams);
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Certificados - Turma ${escapeHTML(cat ? cat.nome : codigo)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 landscape; margin: 8mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF (${colaboradores.length} Certificados)</button></div>
    ${folhas}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Certificados_Turma_${(cat ? cat.nome : codigo).replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    colaboradores.forEach(r => {
        registrarEmissaoDocumento('certificado_individual', `${r.nome} — ${cat ? cat.nome : codigo}`);
    });
}

// ---- Modal de Emissão de Certificado de Treinamento (NR-01 / NR-18) ----
let certModalCtxAtual = null;
let certModalMatriculaAtual = null;

function abrirModalEmissaoCertificado(matricula, ctx = contextoRegistroPadrao()) {
    certModalCtxAtual = ctx;
    certModalMatriculaAtual = matricula;

    const modal = document.getElementById('modalEmissaoCertificado');
    if (!modal) {
        gerarCertificadoIndividual(matricula, ctx);
        return;
    }

    const { colaboradores, codigo, data, campos } = ctx;
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const r = colaboradores.find(x => x.matricula === matricula);
    const colab = allEfetivo.find(e => e.id === matricula);

    // Treinamento, data e carga horária
    const nomeTreinamento = cat ? cat.nome : (codigo || 'Treinamento de Segurança');
    const nomeEl = document.getElementById('certModalTreinamentoNome');
    if (nomeEl) nomeEl.textContent = nomeTreinamento;
    const cargaBadge = document.getElementById('certModalCargaHorariaBadge');
    if (cargaBadge) cargaBadge.textContent = (cat && cat.carga_horaria) ? `${cat.carga_horaria} horas` : 'Carga regulamentar';
    const dataBadge = document.getElementById('certModalDataBadge');
    if (dataBadge) dataBadge.textContent = formatSimpleDate(data) || 'Data não definida';

    // Alvo e Colaborador
    const alvoSelect = document.getElementById('certModalAlvoSelect');
    if (alvoSelect) alvoSelect.value = 'individual';
    const colabNomeEl = document.getElementById('certModalColaboradorNome');
    if (colabNomeEl) colabNomeEl.textContent = r ? `${r.nome} (${colab?.funcao || r.funcao || 'Operacional'})` : 'Todos da Turma';

    // Aproveitamento
    const inputAprov = document.getElementById('certModalAproveitamento');
    if (inputAprov) {
        inputAprov.value = (r && r.aproveitamento) ? r.aproveitamento : 'Apto';
    }

    // Modalidade
    const selMod = document.getElementById('certModalModalidade');
    if (selMod) selMod.value = 'Presencial';

    // Conteúdo programático (do catálogo ou padrão NR-18/NR-01)
    const textareaConteudo = document.getElementById('certModalConteudoProgramatico');
    if (textareaConteudo) {
        let conteudo = (cat?.conteudo_programatico || '').trim();
        const nomeNorm = (nomeTreinamento || '').toLowerCase();
        if (!conteudo && (codigo === '1' || nomeNorm.includes('integra') || nomeNorm.includes('18') || nomeNorm.includes('capacita'))) {
            conteudo = CONTEUDO_PROGRAMATICO_PADRAO_NR18_NR01;
        }
        textareaConteudo.value = conteudo;
    }

    // Base Legal
    const inputBaseLegal = document.getElementById('certModalBaseLegal');
    if (inputBaseLegal) {
        inputBaseLegal.value = cat?.certificado_base_legal || 'Portaria MTE nº 1.419/2024, NR-01 Item 1.7.1.1, Lei nº 14.457/2022 e NR-18 Anexo I (Capacitação Básica em Canteiro de Obras).';
    }

    // Local de realização
    const inputLocal = document.getElementById('certModalLocalRealizacao');
    if (inputLocal) {
        inputLocal.value = campos.local_realizacao || 'Canteiro de Obras — PISF Ramal do Agreste';
    }

    // Instrutor e Responsável Técnico
    const instNome = document.getElementById('certModalInstrutorNome');
    if (instNome) instNome.value = campos.instrutor_nome || '';
    const instQual = document.getElementById('certModalInstrutorQualificacao');
    if (instQual) instQual.value = campos.instrutor_qualificacao || '';
    const instReg = document.getElementById('certModalInstrutorRegistro');
    if (instReg) instReg.value = campos.instrutor_registro || '';
    const respNome = document.getElementById('certModalRespTecnicoNome');
    if (respNome) respNome.value = campos.responsavel_tecnico_nome || '';
    const respQual = document.getElementById('certModalRespTecnicoQualificacao');
    if (respQual) respQual.value = campos.responsavel_tecnico_qualificacao || '';
    const respReg = document.getElementById('certModalRespTecnicoRegistro');
    if (respReg) respReg.value = campos.responsavel_tecnico_registro || '';

    // Checkbox salvar catálogo
    const chkSalvar = document.getElementById('certModalSalvarCatalogo');
    if (chkSalvar) chkSalvar.checked = false;

    // Reset status
    const statusMsg = document.getElementById('certModalStatusMsg');
    if (statusMsg) statusMsg.style.display = 'none';

    certModalAtualizarBotaoTexto();
    modal.style.display = 'flex';
}

function abrirModalEmissaoCertificadoLote(ctx = contextoRegistroPadrao()) {
    certModalCtxAtual = ctx;
    const { colaboradores } = ctx;
    if (!colaboradores || colaboradores.length === 0) {
        alert('Nenhum colaborador na sessão atual para emitir certificados.');
        return;
    }
    abrirModalEmissaoCertificado(colaboradores[0].matricula, ctx);
    const alvoSelect = document.getElementById('certModalAlvoSelect');
    if (alvoSelect) {
        alvoSelect.value = 'turma';
        certModalAoMudarAlvo();
    }
}

function fecharModalEmissaoCertificado() {
    const modal = document.getElementById('modalEmissaoCertificado');
    if (modal) modal.style.display = 'none';
    certModalCtxAtual = null;
    certModalMatriculaAtual = null;
}

function certModalAoMudarAlvo() {
    const alvoSelect = document.getElementById('certModalAlvoSelect');
    const colabNomeEl = document.getElementById('certModalColaboradorNome');
    if (!alvoSelect || !certModalCtxAtual) return;

    if (alvoSelect.value === 'turma') {
        const total = (certModalCtxAtual.colaboradores || []).length;
        if (colabNomeEl) colabNomeEl.textContent = `Toda a Turma (${total} colaboradores selecionados)`;
    } else {
        const r = (certModalCtxAtual.colaboradores || []).find(x => x.matricula === certModalMatriculaAtual);
        const colab = allEfetivo.find(e => e.id === certModalMatriculaAtual);
        if (colabNomeEl) colabNomeEl.textContent = r ? `${r.nome} (${colab?.funcao || r.funcao || 'Operacional'})` : 'Colaborador selecionado';
    }
    certModalAtualizarBotaoTexto();
}

function certModalAtualizarBotaoTexto() {
    const btn = document.getElementById('btnDispararImpressaoCertificado');
    const alvoSelect = document.getElementById('certModalAlvoSelect');
    if (!btn) return;
    if (alvoSelect && alvoSelect.value === 'turma') {
        const total = (certModalCtxAtual?.colaboradores || []).length;
        btn.innerHTML = `<span>🖨️</span> Imprimir para Toda a Turma (${total})`;
    } else {
        btn.innerHTML = `<span>🖨️</span> Imprimir Certificado`;
    }
}

function certModalCarregarPadraoNr18() {
    const textarea = document.getElementById('certModalConteudoProgramatico');
    if (textarea) textarea.value = CONTEUDO_PROGRAMATICO_PADRAO_NR18_NR01;
    const baseLegal = document.getElementById('certModalBaseLegal');
    if (baseLegal) baseLegal.value = 'Portaria MTE nº 1.419/2024, NR-01 Item 1.7.1.1, Lei nº 14.457/2022 e NR-18 Anexo I (Capacitação Básica em Canteiro de Obras).';
}

function certModalRestaurarCatalogo() {
    if (!certModalCtxAtual) return;
    const cat = allTreinamentosCatalogo.find(c => c.id === certModalCtxAtual.codigo);
    const textarea = document.getElementById('certModalConteudoProgramatico');
    if (textarea) textarea.value = cat?.conteudo_programatico || '';
    const baseLegal = document.getElementById('certModalBaseLegal');
    if (baseLegal) baseLegal.value = cat?.certificado_base_legal || 'Portaria MTE nº 1.419/2024, NR-01 Item 1.7.1.1, Lei nº 14.457/2022 e NR-18 Anexo I (Capacitação Básica em Canteiro de Obras).';
}

async function executarEmissaoCertificadoModal() {
    if (!certModalCtxAtual) return;
    const statusMsg = document.getElementById('certModalStatusMsg');

    const aproveitamento = document.getElementById('certModalAproveitamento')?.value.trim() || 'Apto';
    const modalidade = document.getElementById('certModalModalidade')?.value || 'Presencial';
    const conteudoProgramatico = document.getElementById('certModalConteudoProgramatico')?.value || '';
    const certificadoBaseLegal = document.getElementById('certModalBaseLegal')?.value.trim() || '';
    const localRealizacao = document.getElementById('certModalLocalRealizacao')?.value.trim() || '';
    const instrutorNome = document.getElementById('certModalInstrutorNome')?.value.trim() || '';
    const instrutorQualificacao = document.getElementById('certModalInstrutorQualificacao')?.value.trim() || '';
    const instrutorRegistro = document.getElementById('certModalInstrutorRegistro')?.value.trim() || '';
    const respTecnicoNome = document.getElementById('certModalRespTecnicoNome')?.value.trim() || '';
    const respTecnicoQualificacao = document.getElementById('certModalRespTecnicoQualificacao')?.value.trim() || '';
    const respTecnicoRegistro = document.getElementById('certModalRespTecnicoRegistro')?.value.trim() || '';
    const salvarNoCatalogo = document.getElementById('certModalSalvarCatalogo')?.checked;
    const alvo = document.getElementById('certModalAlvoSelect')?.value || 'individual';

    const customParams = {
        aproveitamento,
        modalidade,
        conteudoProgramatico,
        certificadoBaseLegal,
        localRealizacao,
        instrutorNome,
        instrutorQualificacao,
        instrutorRegistro,
        respTecnicoNome,
        respTecnicoQualificacao,
        respTecnicoRegistro
    };

    // Salvar no catálogo se solicitado
    if (salvarNoCatalogo && certModalCtxAtual.codigo) {
        try {
            if (statusMsg) {
                statusMsg.style.display = 'block';
                statusMsg.style.background = '#eef2ff';
                statusMsg.style.color = '#3730a3';
                statusMsg.textContent = '💾 Atualizando catálogo de treinamentos...';
            }
            await supabasePatch('treinamentos_catalogo', `id=eq.${encodeURIComponent(certModalCtxAtual.codigo)}`, {
                conteudo_programatico: conteudoProgramatico,
                certificado_base_legal: certificadoBaseLegal
            });
            const cat = allTreinamentosCatalogo.find(c => c.id === certModalCtxAtual.codigo);
            if (cat) {
                cat.conteudo_programatico = conteudoProgramatico;
                cat.certificado_base_legal = certificadoBaseLegal;
            }
        } catch (errSalvarCat) {
            console.warn('Erro ao salvar no catálogo:', errSalvarCat);
        }
    }

    // Atualizar no banco treinamentos_realizados o aproveitamento informado
    try {
        const cod = certModalCtxAtual.codigo;
        const dataTrein = certModalCtxAtual.data;
        if (cod && dataTrein) {
            if (alvo === 'turma') {
                await supabasePatch('treinamentos_realizados', `treinamento_cod=eq.${encodeURIComponent(cod)}&data_treinamento=eq.${encodeURIComponent(dataTrein)}`, {
                    aproveitamento
                });
                (certModalCtxAtual.colaboradores || []).forEach(c => { c.aproveitamento = aproveitamento; });
                if (typeof allTreinamentosRealizados !== 'undefined' && Array.isArray(allTreinamentosRealizados)) {
                    allTreinamentosRealizados.forEach(tr => {
                        if (String(tr.treinamento_cod) === String(cod) && String(tr.data_treinamento) === String(dataTrein)) {
                            tr.aproveitamento = aproveitamento;
                        }
                    });
                }
            } else if (certModalMatriculaAtual) {
                await supabasePatch('treinamentos_realizados', `matricula=eq.${encodeURIComponent(certModalMatriculaAtual)}&treinamento_cod=eq.${encodeURIComponent(cod)}&data_treinamento=eq.${encodeURIComponent(dataTrein)}`, {
                    aproveitamento
                });
                const colabAlvo = (certModalCtxAtual.colaboradores || []).find(c => c.matricula === certModalMatriculaAtual);
                if (colabAlvo) colabAlvo.aproveitamento = aproveitamento;
                if (typeof allTreinamentosRealizados !== 'undefined' && Array.isArray(allTreinamentosRealizados)) {
                    const tr = allTreinamentosRealizados.find(x => String(x.matricula) === String(certModalMatriculaAtual) && String(x.treinamento_cod) === String(cod) && String(x.data_treinamento) === String(dataTrein));
                    if (tr) tr.aproveitamento = aproveitamento;
                }
            }
        }
    } catch (errAprov) {
        console.warn('Aviso ao sincronizar aproveitamento no banco:', errAprov);
    }

    // Disparar emissão
    if (alvo === 'turma') {
        await gerarCertificadosTurma(certModalCtxAtual, customParams);
    } else {
        await gerarCertificadoIndividual(certModalMatriculaAtual, certModalCtxAtual, customParams);
    }

    fecharModalEmissaoCertificado();
}

async function gerarOrdemServicoIndividual(matricula, ctx = contextoRegistroPadrao()) {
    const { colaboradores, data, campos } = ctx;
    const r = colaboradores.find(x => x.matricula === matricula);
    if (!r) return;
    await garantirDocumentosControleCarregados();

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Ordem de Serviço - ${escapeHTML(r.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
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
    ${construirFolhaOrdemServico(matricula, r, campos, data)}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Ordem_de_Servico_${(r.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('ordem_servico', r.nome);
}

async function gerarDeclaracaoIntegracaoIndividual(matricula, ctx = contextoRegistroPadrao()) {
    const { colaboradores, codigo, data, campos } = ctx;
    const r = colaboradores.find(x => x.matricula === matricula);
    if (!r) return;
    await garantirDocumentosControleCarregados();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Declaração de Integração - ${escapeHTML(r.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 portrait; margin: 8mm 10mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${construirFolhaDeclaracaoIntegracao(r, cat, campos, data)}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Declaracao_Integracao_${(r.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('declaracao_integracao', `${r.nome} — ${cat ? cat.nome : codigo}`);
}

async function gerarTermoRecusaIndividual(matricula, ctx = contextoRegistroPadrao()) {
    const { colaboradores, codigo, data, campos } = ctx;
    const r = colaboradores.find(x => x.matricula === matricula);
    if (!r) return;
    await garantirDocumentosControleCarregados();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Termo de Recusa - ${escapeHTML(r.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 landscape; margin: 15mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    ${construirFolhaTermoRecusa(r, cat, campos, data)}
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Termo_Recusa_${(r.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('termo_recusa', r.nome);
}

// ---- Kit Completo (5 folhas num documento só) ----

async function gerarKitCompletoIntegracao(matricula, ctx = contextoRegistroPadrao()) {
    const { colaboradores: sessaoRows, codigo, data, campos } = ctx;
    const r = sessaoRows.find(x => x.matricula === matricula);
    if (!r) return;
    await garantirDocumentosControleCarregados();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const colab = allEfetivo.find(e => e.id === matricula);

    const folhas = [
        construirFolhaOrdemServico(matricula, r, campos, data),
        construirFolhaRegistroTreinamento(sessaoRows, campos, codigo, cat, data),
        construirFolhaCertificado(r, colab, cat, codigo, campos, data),
        construirFolhaDeclaracaoIntegracao(r, cat, campos, data),
        construirFolhaTermoRecusa(r, cat, campos, data)
    ].join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Kit Completo - ${escapeHTML(r.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${REGISTRO_TREINAMENTO_CSS}
    ${DOC_INDIVIDUAL_CSS}
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

    abrirDocumentoHtmlParaImpressao(html, `Kit_Integracao_${(r.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('ordem_servico', r.nome);
    registrarEmissaoDocumento('registro_treinamento', `${cat ? cat.nome : codigo} — ${formatSimpleDate(data)}`);
    registrarEmissaoDocumento('certificado_individual', `${r.nome} — ${cat ? cat.nome : codigo}`);
    registrarEmissaoDocumento('declaracao_integracao', `${r.nome} — ${cat ? cat.nome : codigo}`);
    registrarEmissaoDocumento('termo_recusa', r.nome);
}

// ---- Banco de Provas: só aparece/gera quando o treinamento carregado tem questões
// cadastradas no Catálogo (cat.questoes) - nunca fabrica uma prova genérica pra
// treinamento sem banco próprio. ----

function atualizarVisibilidadeProvaWrap(cat) {
    const wrap = document.getElementById('registroProvaWrap');
    if (!wrap) return;
    wrap.style.display = (cat && Array.isArray(cat.questoes) && cat.questoes.length > 0) ? 'block' : 'none';
}

// Mesma lógica de "quem está na sessão carregada" usada em gerarRegistroTreinamento -
// sessão já lançada usa registroSessaoAtual, sessão nova usa só quem está marcado no
// seletor de equipe editável. Reaproveitada pelos documentos individuais/kit e pela prova.
function colaboradoresDaSessaoAtual() {
    if (registroModoNovo) {
        return Array.from(registroNovaEquipe.entries()).filter(([, c]) => c.checked).map(([matricula, c]) => ({ matricula, nome: c.nome, funcao: c.funcao }));
    }
    return registroSessaoAtual;
}

async function gerarProvaTurma() {
    if (!registroDataAtual) return;
    await garantirDocumentosControleCarregados();
    const codigo = registroCodigoAtual;
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const questoes = Array.isArray(cat?.questoes) ? cat.questoes : [];
    if (questoes.length === 0) return;
    const data = registroDataAtual;
    const colaboradores = colaboradoresDaSessaoAtual();
    if (colaboradores.length === 0) { alert('Nenhum colaborador na sessão pra gerar prova.'); return; }
    const codigoDoc = codigoRevisaoDocumento('prova_eficacia');
    const letras = ['A', 'B', 'C', 'D'];

    const folhas = colaboradores.map(c => `<div class="folha">
        <div style="text-align:center; margin-bottom: 10px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:56px; object-fit:contain;"></div>
        <div class="titulo" style="font-size:20px;">PROVA DE EFICÁCIA DO TREINAMENTO</div>
        ${codigoDoc ? `<div class="subtitulo">${escapeHTML(codigoDoc)}</div>` : ''}
        <div class="texto"><b>Treinamento:</b> ${escapeHTML(cat.nome)} &nbsp; <b>Data:</b> ${formatSimpleDate(data)}</div>
        <div class="texto"><b>Nome:</b> ${escapeHTML(c.nome)} &nbsp; <b>Matrícula:</b> ${escapeHTML(c.matricula)} &nbsp; <b>Função:</b> ${escapeHTML(c.funcao || '')}</div>
        <div class="texto" style="margin:10px 0;">Marque com um X a alternativa correta de cada questão.</div>
        ${questoes.map((q, i) => `
            <div class="bloco">
                <div class="bloco-titulo">${i + 1}. ${escapeHTML(q.pergunta)}</div>
                <div style="font-size:12px; line-height:1.8; padding-left:12px;">
                    ${q.alternativas.map((alt, a) => `( &nbsp; ) ${letras[a]}) ${escapeHTML(alt)}`).join('<br>')}
                </div>
            </div>`).join('')}
        <div class="assinaturas">
            ${blocoAssinatura(`${escapeHTML(c.nome)}<br>Assinatura do Colaborador`)}
        </div>
    </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Prova - ${escapeHTML(cat.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 portrait; margin: 15mm; }
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

    abrirDocumentoHtmlParaImpressao(html, `Prova_${(cat.nome || 'Treinamento').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('prova_eficacia', `${cat.nome} — ${formatSimpleDate(data)}`);
}

async function gerarGabaritoProva() {
    if (!registroDataAtual) return;
    await garantirDocumentosControleCarregados();
    const codigo = registroCodigoAtual;
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    const questoes = Array.isArray(cat?.questoes) ? cat.questoes : [];
    if (questoes.length === 0) return;
    const data = registroDataAtual;
    const letras = ['A', 'B', 'C', 'D'];

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Gabarito - ${escapeHTML(cat.nome)} - ${formatSimpleDate(data)}</title>
<style>
    ${DOC_INDIVIDUAL_CSS}
    @page { size: A4 portrait; margin: 15mm; }
</style>
<script>
    window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 400);
    });
</script>
</head>
<body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
    <div class="folha">
        <div style="text-align:center; margin-bottom: 10px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:56px; object-fit:contain;"></div>
        <div class="titulo" style="font-size:20px;">GABARITO — PROVA DE EFICÁCIA</div>
        <div class="texto"><b>Treinamento:</b> ${escapeHTML(cat.nome)} &nbsp; <b>Data:</b> ${formatSimpleDate(data)}</div>
        <div class="texto" style="margin:6px 0 14px; color:#b91c1c;"><b>Uso restrito de quem aplica/corrige a prova - não distribuir ao colaborador.</b></div>
        ${questoes.map((q, i) => `
            <div class="bloco">
                <div class="bloco-titulo">${i + 1}. ${escapeHTML(q.pergunta)}</div>
                <div style="font-size:12px; padding-left:12px;">Resposta correta: <b>${letras[q.correta]}) ${escapeHTML(q.alternativas[q.correta])}</b></div>
            </div>`).join('')}
    </div>
</body></html>`;

    abrirDocumentoHtmlParaImpressao(html, `Gabarito_${(cat.nome || 'Treinamento').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(data).replace(/\//g, '-')}`);
    registrarEmissaoDocumento('prova_eficacia', `Gabarito — ${cat.nome} — ${formatSimpleDate(data)}`);
}

// Normaliza texto de cargo/função pra comparação tolerante: remove acentos, pontuação
// (inclui "." de abreviações como "AUX.") e hífen/underline, colapsa espaços. Usada tanto
// pra achar o cargo do catálogo na Ordem de Serviço quanto pra avisar quando não achar.
function normalizarTextoCargoBasico(s) {
    return String(s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.\-_/,;:()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const MAPA_ABREVIACOES_CARGO_SST = {
    'aux': 'auxiliar',
    'enc': 'encarregado',
    'tec': 'tecnico',
    'op': 'operador',
    'mot': 'motorista',
    'adm': 'administrativo',
    'eng': 'engenheiro',
    'seg': 'seguranca',
    'trab': 'trabalho',
    'eletromec': 'eletromecanico',
    'mecan': 'mecanica',
    'eletr': 'eletrica',
    'manut': 'manutencao'
};

const STOP_WORDS_CARGO_SST = new Set(['de', 'da', 'do', 'dos', 'das', 'em', 'e', 'para', 'com']);

function normalizarTextoCargo(s) {
    if (!s) return '';
    let t = normalizarTextoCargoBasico(s);
    let palavras = t.split(' ').map(p => MAPA_ABREVIACOES_CARGO_SST[p] || p);
    palavras = palavras.filter(p => !STOP_WORDS_CARGO_SST.has(p)).map(p => {
        if (p.length > 4 && p.endsWith('s') && !p.endsWith('ss')) {
            return p.slice(0, -1);
        }
        return p;
    });
    return palavras.join(' ');
}

// Acha o cargo do catálogo do GHE que corresponde à função cadastrada do colaborador.
// 1) Igualdade exata após normalizar. 2) Igualdade após expansão de abreviações e stop-words.
// 3) Contêm e interseção de palavras-chave.
function resolverCargoInfoDoColaborador(ghe, funcaoColaborador) {
    if (!ghe || !Array.isArray(ghe.cargos) || ghe.cargos.length === 0) {
        return { cargoInfo: null, ambiguo: false, motivo: 'ghe_sem_cargos' };
    }
    const fBasica = normalizarTextoCargoBasico(funcaoColaborador);
    if (!fBasica) return { cargoInfo: null, ambiguo: false, motivo: 'funcao_vazia' };

    // 1. Igualdade exata básica
    const exatoBasico = ghe.cargos.find(c => normalizarTextoCargoBasico(c.funcao) === fBasica);
    if (exatoBasico) return { cargoInfo: exatoBasico, ambiguo: false, metodo: 'exato_basico' };

    // 2. Igualdade exata avançada (expansão de abreviações e sem conectivos)
    const fAvancada = normalizarTextoCargo(funcaoColaborador);
    const exatoAvancado = ghe.cargos.find(c => normalizarTextoCargo(c.funcao) === fAvancada);
    if (exatoAvancado) return { cargoInfo: exatoAvancado, ambiguo: false, metodo: 'exato_avancado' };

    // 3. Candidatos por contêm ou interseção de palavras principais
    const palavrasF = fAvancada.split(' ').filter(Boolean);
    const candidatos = ghe.cargos.filter(c => {
        const cBasico = normalizarTextoCargoBasico(c.funcao);
        const cAvancado = normalizarTextoCargo(c.funcao);
        if (!cAvancado) return false;
        if (fAvancada.includes(cAvancado) || cAvancado.includes(fAvancada)) return true;
        if (fBasica.includes(cBasico) || cBasico.includes(fBasica)) return true;

        const cPalavras = new Set(cAvancado.split(' '));
        return palavrasF.length > 0 && palavrasF.every(p => cPalavras.has(p));
    });

    if (candidatos.length === 1) return { cargoInfo: candidatos[0], ambiguo: false, metodo: 'candidato_unico' };
    if (candidatos.length > 1) return { cargoInfo: null, ambiguo: true, candidatos, motivo: 'ambiguo' };
    return { cargoInfo: null, ambiguo: false, motivo: 'nao_encontrado' };
}

function avaliarCorrespondenciaCargoOs(matricula, funcaoFallback) {
    const colab = (allEfetivo || []).find(e => e.id === matricula);
    const ghe = colab?.ghe ? (allGheCatalogo || []).find(g => normalizarGhe(g.id) === normalizarGhe(colab.ghe)) : null;
    const funcao = colab?.funcao || funcaoFallback || '';
    const { cargoInfo, ambiguo, motivo, candidatos } = resolverCargoInfoDoColaborador(ghe, funcao);
    return { colab, ghe, funcao, cargoInfo, ambiguo, motivo, candidatos, semCorrespondencia: !ghe || !cargoInfo };
}

function textoAvisoCargoOs({ ghe, funcao, ambiguo, candidatos }) {
    if (!ghe) {
        return `⚠️ Não foi possível identificar o GHE deste colaborador (campo "GHE" vazio ou não cadastrado).`;
    }
    if (ambiguo) {
        const nomesCandidatos = Array.isArray(candidatos) ? candidatos.map(c => typeof c === 'string' ? c : c.funcao).join(', ') : '';
        return `⚠️ A função cadastrada ("${funcao}") coincide com mais de um cargo do GHE ${ghe.id} (${nomesCandidatos}). Use o "Diagnóstico de Cargos" para selecionar o cargo exato.`;
    }
    return `⚠️ Não foi encontrada correspondência entre a função cadastrada ("${funcao}") e os cargos do GHE ${ghe.id}. Use o "Diagnóstico de Cargos" para associar ou corrigir.`;
}

// Ordem de Serviço de Segurança e Saúde no Trabalho (NR-01, item 1.4.1.1 "e") -
// documento individual obrigatório informando riscos da função e EPI/EPC exigidos,
// exigido pela empresa atual do usuário e ausente no sistema até aqui. Junta-se ao Kit
// de Integração (mesmo momento de admissão) em vez de virar um botão à parte, por
// pedido explícito do usuário. Fonte de setor/cargo/agentes/EPI: colaboradores_efetivo
// (ghe) → ghe_catalogo (cargos[].descricao_atividade/agentes/epis_necessarios/
// epcs_necessarios) - campos que ainda não tiverem sido preenchidos pelo usuário para
// aquele cargo aparecem em branco, nunca com um valor fabricado.
function construirFolhaOrdemServico(matricula, r, campos, data) {
    const colab = allEfetivo.find(e => e.id === matricula);
    const ghe = colab?.ghe ? allGheCatalogo.find(g => g.id === normalizarGhe(colab.ghe)) : null;
    const { cargoInfo, ambiguo } = resolverCargoInfoDoColaborador(ghe, r.funcao);
    const avisoCargo = !cargoInfo ? textoAvisoCargoOs({ ghe, funcao: r.funcao, ambiguo }) : null;
    const ag = cargoInfo?.agentes || {};
    const epis = Array.isArray(cargoInfo?.epis_necessarios) ? cargoInfo.epis_necessarios : [];
    const epcs = Array.isArray(cargoInfo?.epcs_necessarios) ? cargoInfo.epcs_necessarios : [];
    const codigoOs = codigoRevisaoDocumento('ordem_servico');
    // Texto único da empresa (não varia por cargo) - reaproveita o campo Observações já
    // existente no cadastro de Documentos (Documentos > Ordem de Serviço > Observações),
    // em vez de criar uma tela nova só pra esse texto.
    const responsabilidadesEmpregado = allDocumentosControle.find(d => d.id === 'ordem_servico')?.observacoes || '';

    return `<div class="folha-os print-os-portrait">
        <div style="text-align:center; margin-bottom: 3px;"><img src="${LOGO_COP_BASE64}" alt="COP" style="max-height:36px; object-fit:contain;"></div>
        <div class="titulo-os">ORDEM DE SERVIÇO DE SEGURANÇA E SAÚDE NO TRABALHO</div>
        ${codigoOs ? `<div class="subtitulo-os">${escapeHTML(codigoOs)} — Requisitos da NR-01 (Item 1.4.1)</div>` : '<div class="subtitulo-os">OS.SMS.001 — Requisitos da NR-01 (Item 1.4.1)</div>'}
        ${avisoCargo ? `<div style="background:#fff3cd; border:1px solid #f0ad4e; color:#7a5b00; border-radius:4px; padding:3px 6px; font-size:8pt; font-weight:600; margin-bottom:4px;">${escapeHTML(avisoCargo)}</div>` : ''}
        <table class="tabela-os-identificacao">
            <tr><td style="width:25%;"><b>Emissão:</b> ${formatSimpleDate(data)}</td>
                <td style="width:45%;"><b>Empresa:</b> ${escapeHTML(EMPRESA_INFO.razaoSocial)}</td>
                <td style="width:30%;"><b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO.cnpj)}</td></tr>
            <tr><td colspan="2"><b>Funcionário:</b> ${escapeHTML(r.nome)} &nbsp; <b>(Matrícula:</b> ${escapeHTML(matricula)})</td>
                <td><b>CPF:</b> ${escapeHTML(colab?.cpf || '—')}</td></tr>
            <tr><td><b>Setor / GHE:</b> ${escapeHTML(ghe ? `${ghe.id} - ${ghe.nome}` : '—')}</td>
                <td><b>Função Contratual:</b> ${escapeHTML(r.funcao || '—')}</td>
                <td><b>Cargo Oficial / CBO:</b> ${escapeHTML(cargoInfo?.cargo || r.funcao || '—')}${cargoInfo?.cbo ? ` &nbsp; <b>(CBO: ${escapeHTML(cargoInfo.cbo)})</b>` : ''}</td></tr>
        </table>

        <div class="bloco-os">
            <div class="bloco-titulo-os">1. Descrição das Atividades:</div>
            <div class="texto-os">${escapeHTML(cargoInfo?.descricao_atividade || '')}</div>
        </div>

        <div class="bloco-os">
            <div class="bloco-titulo-os">2. Agentes associados às atividades:</div>
            <table class="tabela-os-agentes">
                <thead><tr>
                    <th style="width:20%;">Físico</th><th style="width:20%;">Químico</th>
                    <th style="width:20%;">Biológico</th><th style="width:20%;">Ergonômico</th>
                    <th style="width:20%;">Acidentes</th>
                </tr></thead>
                <tbody><tr>
                    <td>${escapeHTML(ag.fisico || '')}</td>
                    <td>${escapeHTML(ag.quimico || '')}</td>
                    <td>${escapeHTML(ag.biologico || '')}</td>
                    <td>${escapeHTML(ag.ergonomico || '')}</td>
                    <td>${escapeHTML(ag.acidentes || '')}</td>
                </tr></tbody>
            </table>
        </div>

        <div class="grid-epis-epcs-os">
            <div class="bloco-os" style="flex:1;">
                <div class="bloco-titulo-os">3. EPIs Necessários para a Função:</div>
                <div class="lista-itens-os">${epis.length ? epis.map(e => `<div>» ${escapeHTML(e)}</div>`).join('') : '<div style="color:#777;">—</div>'}</div>
            </div>
            <div class="bloco-os" style="flex:1;">
                <div class="bloco-titulo-os">4. EPCs Necessários para a Função:</div>
                <div class="lista-itens-os">${epcs.length ? epcs.map(e => `<div>» ${escapeHTML(e)}</div>`).join('') : '<div style="color:#777;">—</div>'}</div>
            </div>
        </div>

        <div class="bloco-os"><div class="bloco-titulo-os">5. Recomendações:</div><div class="texto-os">${escapeHTML(cargoInfo?.recomendacoes || '')}</div></div>
        <div class="bloco-os"><div class="bloco-titulo-os">6. Procedimentos em caso de acidentes:</div><div class="texto-os">${escapeHTML(cargoInfo?.procedimentos_acidentes || '')}</div></div>
        <div class="bloco-os"><div class="bloco-titulo-os">7. Responsabilidades do Empregado (NR-01 do Ministério do Trabalho e Previdência):</div><div class="texto-os">${escapeHTML(responsabilidadesEmpregado)}</div></div>
        <div class="bloco-os"><div class="bloco-titulo-os">8. Observações:</div><div class="texto-os">${escapeHTML(cargoInfo?.observacoes || '')}</div></div>

        <div class="declaracao-os">
            Declaro que recebi da <b>${escapeHTML(EMPRESA_INFO.razaoSocial)}</b> as orientações que fazem parte deste documento, bem como cópia
            do mesmo, comprometendo-me a seguir as orientações nele contidas e reconhecendo serem elas indispensáveis à minha segurança e à
            de meus colegas de trabalho. Também afirmo ter recebido os EPIs de utilização obrigatória na minha função e comprometo-me a
            utilizá-los durante toda a minha jornada de trabalho, solicitando sua substituição sempre que necessário.
        </div>
        <div class="assinaturas-os">
            ${blocoAssinatura(`${escapeHTML(r.nome)}<br>Colaborador`)}
            ${blocoAssinatura(`${escapeHTML(campos.responsavel_tecnico_nome || '')}<br>${escapeHTML(campos.responsavel_tecnico_qualificacao || '')}${campos.responsavel_tecnico_registro ? '<br>' + escapeHTML(campos.responsavel_tecnico_registro) : ''}`)}
        </div>
    </div>`;
}

function abrirDocumentoBlob(html, titulo = 'Documento_SST') {
    if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
        abrirDocumentoHtmlParaImpressao(html, titulo);
        return;
    }
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
        console.warn('Erro ao abrir documento via Blob:', err);
    }
}

// ============================================
// GESTÃO DE EQUIPES - corrige o campo "responsavel" de colaboradores_efetivo em lote
// quando alguém muda de equipe. Sem isso, a única forma de corrigir era editar um
// colaborador de cada vez pelo formulário completo de Efetivo (todos os campos, não só
// o responsável) - motivo real: usuário reportou que "Carregar equipe do Responsável"
// (em Lançar Treinamento) às vezes não traz um colaborador porque o campo responsavel
// dele ainda aponta pro encarregado antigo.
// ============================================

// ==============================================================================
// CENTRAL DE PRONTIDÃO POR EQUIPE E DOSSIÊ DO COLABORADOR (NR-01 / GRO)
// Consulta instantânea de aptidão técnica por Setor, GHE, Cargo e Colaborador
// ==============================================================================

// ==============================================================================
// HELPERS DO FILTRO DE SETOR (MULTI-SELECT COM CHECKBOXES E BUSCA)
// ==============================================================================

function renderizarOpcoesSetorDropdown(termoBusca = '') {
    const container = document.getElementById('prontidaoSetorCheckboxesList');
    if (!container) return;

    const termo = (termoBusca || '').trim().toLowerCase();
    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));
    const setoresMap = new Map();
    ativos.forEach(e => {
        const s = (e.setor || '').trim();
        if (s) setoresMap.set(s, (setoresMap.get(s) || 0) + 1);
    });
    const setores = Array.from(setoresMap.keys()).sort((a, b) => a.localeCompare(b));

    let encontrados = 0;
    let html = '';

    setores.forEach(s => {
        if (termo && !s.toLowerCase().includes(termo)) return;
        encontrados++;
        const isChecked = prontidaoFiltroSetores.includes(s);
        const qtd = setoresMap.get(s) || 0;
        html += `
            <label class="prontidao-dropdown-item ${isChecked ? 'selecionado' : ''}" style="user-select: none;">
                <div style="display: flex; align-items: center; gap: 7px; overflow: hidden; max-width: 85%;">
                    <input type="checkbox" class="chk-setor-prontidao" value="${escapeHTML(s)}" ${isChecked ? 'checked' : ''} onchange="onToggleSetorProntidao(this)" style="cursor: pointer;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(s)}</span>
                </div>
                <span style="font-size: 11px; color: var(--text-light); font-weight: 600;">(${qtd})</span>
            </label>
        `;
    });

    if (encontrados === 0 && termo) {
        html = `
            <div style="padding: 12px; text-align: center; font-size: 11.5px; color: var(--text-light);">
                Nenhum setor encontrado para "${escapeHTML(termoBusca)}"
            </div>
        `;
    }

    container.innerHTML = html;
    atualizarLabelBotaoSetores(setores.length);
}

function onToggleSetorProntidao(chk) {
    const val = chk.value;
    if (chk.checked) {
        if (!prontidaoFiltroSetores.includes(val)) {
            prontidaoFiltroSetores.push(val);
        }
    } else {
        prontidaoFiltroSetores = prontidaoFiltroSetores.filter(s => s !== val);
    }
    const checkTodos = document.getElementById('prontidaoSetorCheckTodos');
    if (checkTodos) checkTodos.checked = (prontidaoFiltroSetores.length === 0);
    atualizarLabelBotaoSetores();
    filtrarProntidaoEquipeUI();
}

function toggleTodosSetoresProntidao(chkTodos) {
    prontidaoFiltroSetores = [];
    document.querySelectorAll('.chk-setor-prontidao').forEach(c => c.checked = false);
    if (chkTodos) chkTodos.checked = true;
    atualizarLabelBotaoSetores();
    filtrarProntidaoEquipeUI();
}

function limparSelecaoSetoresProntidao() {
    toggleTodosSetoresProntidao(document.getElementById('prontidaoSetorCheckTodos'));
}

function atualizarLabelBotaoSetores(totalSetoresQtd = null) {
    const lbl = document.getElementById('prontidaoSetorBtnLabel');
    const btn = document.getElementById('prontidaoSetorDropdownBtn');
    if (!lbl || !btn) return;

    if (prontidaoFiltroSetores.length === 0) {
        const countTxt = totalSetoresQtd ? ` (${totalSetoresQtd})` : '';
        lbl.textContent = `Todos os Setores${countTxt}`;
        lbl.title = 'Todos os Setores';
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--card)';
    } else if (prontidaoFiltroSetores.length === 1) {
        lbl.textContent = prontidaoFiltroSetores[0];
        lbl.title = prontidaoFiltroSetores[0];
        btn.style.borderColor = '#2563eb';
        btn.style.background = 'rgba(37, 99, 235, 0.05)';
    } else {
        lbl.textContent = `${prontidaoFiltroSetores.length} Setores selecionados`;
        lbl.title = prontidaoFiltroSetores.join(', ');
        btn.style.borderColor = '#2563eb';
        btn.style.background = 'rgba(37, 99, 235, 0.05)';
    }
}

function toggleProntidaoSetorDropdown(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('prontidaoSetorDropdownPanel');
    if (!panel) return;
    const isAberto = panel.style.display !== 'none';
    fecharTodosDropdownsProntidao();
    if (!isAberto) {
        panel.style.display = 'block';
        const inp = document.getElementById('prontidaoSetorSearchInput');
        if (inp) {
            inp.value = '';
            renderizarOpcoesSetorDropdown('');
            setTimeout(() => inp.focus(), 60);
        }
    }
}

function fecharProntidaoSetorDropdown() {
    const panel = document.getElementById('prontidaoSetorDropdownPanel');
    if (panel) panel.style.display = 'none';
}

function filtrarListaSetoresDropdown() {
    const q = document.getElementById('prontidaoSetorSearchInput')?.value || '';
    renderizarOpcoesSetorDropdown(q);
}

// ==============================================================================
// HELPERS DO FILTRO DE CURSO / NR (PESQUISÁVEL COM CARGA HORÁRIA)
// ==============================================================================

function formatarLabelCursoCatalogo(c) {
    const cod = String(c.id || c.codigo || '').trim();
    const nome = (c.nome || cod).trim();
    const ch = c.carga_horaria ? `${c.carga_horaria}h` : '';
    const perMeses = c.meses_validade ? parseInt(c.meses_validade, 10) : null;
    const isPerene = !perMeses || perMeses <= 0;

    let tagCH = '';
    if (ch && isPerene) {
        tagCH = `(${ch} - Perene)`;
    } else if (ch) {
        tagCH = `(${ch})`;
    } else if (isPerene) {
        tagCH = `(Perene)`;
    } else {
        tagCH = `(${perMeses}m)`;
    }

    return `[${cod}] ${nome} ${tagCH}`.trim();
}

function renderizarOpcoesCursoDropdown(termoBusca = '') {
    const container = document.getElementById('prontidaoCursoOptionsList');
    if (!container) return;

    const termo = (termoBusca || '').trim().toLowerCase();
    const cursos = [...(allTreinamentosCatalogo || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let html = `
        <div class="prontidao-dropdown-item ${!prontidaoFiltroCurso ? 'selecionado' : ''}" onclick="selecionarCursoProntidao('')">
            <span style="font-style: italic;">Qualquer Capacitação (Não filtrar por curso)</span>
            ${!prontidaoFiltroCurso ? '<span>✓</span>' : ''}
        </div>
    `;

    let encontrados = 0;
    cursos.forEach(c => {
        const cod = String(c.id || c.codigo || '').trim();
        const nome = (c.nome || cod).trim();
        const ch = c.carga_horaria ? `${c.carga_horaria}h` : '';
        const perMeses = c.meses_validade ? parseInt(c.meses_validade, 10) : null;
        const isPerene = !perMeses || perMeses <= 0;

        let tagCH = '';
        if (ch && isPerene) {
            tagCH = `(${ch} - Perene)`;
        } else if (ch) {
            tagCH = `(${ch})`;
        } else if (isPerene) {
            tagCH = `(Perene)`;
        } else {
            tagCH = `(${perMeses}m)`;
        }

        const textoBusca = `${cod} ${nome} ${ch} ${isPerene ? 'perene' : ''} ${tagCH}`.toLowerCase();

        if (termo && !textoBusca.includes(termo)) {
            return;
        }

        encontrados++;
        const isSelected = String(prontidaoFiltroCurso) === cod;
        html += `
            <div class="prontidao-dropdown-item ${isSelected ? 'selecionado' : ''}" onclick="selecionarCursoProntidao('${escapeHTML(cod)}')">
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90%;">
                    <strong style="font-family: monospace; color: var(--primary, #2563eb); margin-right: 4px;">[${escapeHTML(cod)}]</strong>
                    <span>${escapeHTML(nome)}</span>
                    <span style="font-size: 11px; color: var(--text-light); margin-left: 4px; font-weight: 600;">${escapeHTML(tagCH)}</span>
                </div>
                ${isSelected ? '<span>✓</span>' : ''}
            </div>
        `;
    });

    if (encontrados === 0 && termo) {
        html += `
            <div style="padding: 12px; text-align: center; font-size: 11.5px; color: var(--text-light);">
                Nenhum curso encontrado para "${escapeHTML(termoBusca)}"
            </div>
        `;
    }

    container.innerHTML = html;
}

function selecionarCursoProntidao(cod) {
    prontidaoFiltroCurso = cod ? String(cod) : '';
    atualizarLabelBotaoCurso();
    fecharProntidaoCursoDropdown();
    filtrarProntidaoEquipeUI();
}

function atualizarLabelBotaoCurso() {
    const lbl = document.getElementById('prontidaoCursoBtnLabel');
    const btn = document.getElementById('prontidaoCursoDropdownBtn');
    if (!lbl || !btn) return;

    if (!prontidaoFiltroCurso) {
        lbl.textContent = 'Qualquer Capacitação';
        lbl.title = 'Qualquer Capacitação (Sem filtro de curso específico)';
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--card)';
    } else {
        const c = (allTreinamentosCatalogo || []).find(x => String(x.id || x.codigo) === String(prontidaoFiltroCurso));
        if (c) {
            const txt = formatarLabelCursoCatalogo(c);
            lbl.textContent = txt;
            lbl.title = txt;
        } else {
            lbl.textContent = `Curso [${prontidaoFiltroCurso}]`;
            lbl.title = `Curso [${prontidaoFiltroCurso}]`;
        }
        btn.style.borderColor = '#2563eb';
        btn.style.background = 'rgba(37, 99, 235, 0.05)';
    }
}

function toggleProntidaoCursoDropdown(event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById('prontidaoCursoDropdownPanel');
    if (!panel) return;
    const isAberto = panel.style.display !== 'none';
    fecharTodosDropdownsProntidao();
    if (!isAberto) {
        panel.style.display = 'block';
        const inp = document.getElementById('prontidaoCursoSearchInput');
        if (inp) {
            inp.value = '';
            renderizarOpcoesCursoDropdown('');
            setTimeout(() => inp.focus(), 60);
        }
    }
}

function fecharProntidaoCursoDropdown() {
    const panel = document.getElementById('prontidaoCursoDropdownPanel');
    if (panel) panel.style.display = 'none';
}

function fecharTodosDropdownsProntidao() {
    fecharProntidaoSetorDropdown();
    fecharProntidaoCursoDropdown();
}

function filtrarListaCursosDropdown() {
    const q = document.getElementById('prontidaoCursoSearchInput')?.value || '';
    renderizarOpcoesCursoDropdown(q);
}

// Fechamento ao clicar fora dos dropdowns de prontidão
if (typeof document !== 'undefined') {
    document.addEventListener('click', function(e) {
        const wrapSetor = document.getElementById('prontidaoSetorDropdownWrap');
        const wrapCurso = document.getElementById('prontidaoCursoDropdownWrap');
        if (wrapSetor && !wrapSetor.contains(e.target)) {
            fecharProntidaoSetorDropdown();
        }
        if (wrapCurso && !wrapCurso.contains(e.target)) {
            fecharProntidaoCursoDropdown();
        }
    });
}

function popularFiltrosProntidaoEquipes() {
    const ativos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));

    // Popula Multi-Select de Setores
    renderizarOpcoesSetorDropdown('');

    // Popula Dropdown Pesquisável de Cursos com Carga Horária
    renderizarOpcoesCursoDropdown('');
    atualizarLabelBotaoCurso();

    // Compatibilidade com elementos legados de Setor / Curso (caso existam em outros modais)
    const selSetor = document.getElementById('prontidaoFiltroSetorSelect');
    if (selSetor) {
        const valAtual = selSetor.value;
        const setoresSet = new Set();
        ativos.forEach(e => {
            const s = (e.setor || '').trim();
            if (s) setoresSet.add(s);
        });
        const setores = Array.from(setoresSet).sort((a, b) => a.localeCompare(b));
        selSetor.innerHTML = `<option value="">Todos os Setores (${setores.length})</option>` +
            setores.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
        if (valAtual && setoresSet.has(valAtual)) selSetor.value = valAtual;
    }

    const selCurso = document.getElementById('prontidaoFiltroCursoSelect');
    if (selCurso) {
        const valAtual = selCurso.value;
        const cursos = [...(allTreinamentosCatalogo || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        selCurso.innerHTML = '<option value="">Qualquer Capacitação (Não filtrar por curso)</option>' +
            cursos.map(c => {
                const cod = String(c.id || '').trim();
                const nome = c.nome || cod;
                return `<option value="${escapeHTML(cod)}">[${escapeHTML(cod)}] ${escapeHTML(nome)}</option>`;
            }).join('');
        if (valAtual) selCurso.value = valAtual;
    }

    // Popula GHEs dinamicamente (sem hardcode)
    const selGhe = document.getElementById('prontidaoFiltroGheSelect');
    if (selGhe) {
        const valAtual = selGhe.value;
        const ghesMap = new Map();
        ativos.forEach(e => {
            const g = (e.ghe || '').trim();
            if (g && !ghesMap.has(g)) ghesMap.set(g, g.toUpperCase().startsWith('GHE') ? g : `GHE ${g}`);
        });
        (allGheCatalogo || []).forEach(g => {
            const cod = String(g.codigo || g.id || '').trim();
            const nome = (g.nome || cod).trim();
            if (cod && !ghesMap.has(cod)) ghesMap.set(cod, nome.toUpperCase().startsWith('GHE') ? nome : `GHE ${cod} - ${nome}`);
        });
        const ghes = Array.from(ghesMap.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
        selGhe.innerHTML = `<option value="">Todos os GHEs (${ghes.length})</option>` +
            ghes.map(([cod, label]) => `<option value="${escapeHTML(cod)}">${escapeHTML(label)}</option>`).join('');
        if (valAtual && ghesMap.has(valAtual)) selGhe.value = valAtual;
    }

    // Popula Funções / Cargos dinamicamente (sem hardcode)
    const selFuncao = document.getElementById('prontidaoFiltroFuncaoSelect');
    if (selFuncao) {
        const valAtual = selFuncao.value;
        const funcoesSet = new Set();
        ativos.forEach(e => {
            const f = (e.funcao || '').trim();
            if (f) funcoesSet.add(f);
        });
        const funcoes = Array.from(funcoesSet).sort((a, b) => a.localeCompare(b));
        selFuncao.innerHTML = `<option value="">Todas as Funções (${funcoes.length})</option>` +
            funcoes.map(f => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`).join('');
        if (valAtual && funcoesSet.has(valAtual)) selFuncao.value = valAtual;
    }
}

function calcularProntidaoEquipes() {
    const regrasAtivas = (allTreinamentosRegras || []).filter(r => r.ativo !== false);
    const colaboradoresAtivos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e));

    // Mapeia todas as realizações de cada colaborador por matrícula
    const realizacoesMaisRecentes = new Map(); // mat -> Map(cod -> tr)
    const todasRealizacoesPorColab = new Map(); // mat -> Array(tr)

    (allTreinamentosRealizados || []).forEach(tr => {
        const mat = String(tr.matricula || '').trim();
        const cod = String(tr.treinamento_cod || '').trim();
        if (!mat) return;

        if (!todasRealizacoesPorColab.has(mat)) todasRealizacoesPorColab.set(mat, []);
        todasRealizacoesPorColab.get(mat).push(tr);

        if (!cod) return;
        if (!realizacoesMaisRecentes.has(mat)) realizacoesMaisRecentes.set(mat, new Map());
        const porCurso = realizacoesMaisRecentes.get(mat);
        const dataTr = tr.data_treinamento || '1970-01-01';
        if (!porCurso.has(cod) || dataTr > (porCurso.get(cod).data_treinamento || '1970-01-01')) {
            porCurso.set(cod, tr);
        }
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().slice(0, 10);
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const em30DiasStr = em30Dias.toISOString().slice(0, 10);

    const prontidaoLista = [];

    colaboradoresAtivos.forEach(colab => {
        const mat = String(colab.id || '').trim();
        const nome = colab.nome || 'Colaborador sem nome';
        const funcao = (colab.funcao || '').trim();
        const funcaoNorm = funcao.toUpperCase();
        const setor = (colab.setor || '').trim();
        const ghe = String(colab.ghe || '').trim();
        const gheNorm = ghe.toUpperCase();

        // 1. Identifica exigências de regras ativas aplicáveis a este colaborador
        const exigenciasMap = new Map(); // cod -> { cod, origens: [], obrigatorio_admissao, periodicidade }

        regrasAtivas.forEach(r => {
            let aplica = false;
            let origemLabel = '';

            if (r.tipo_regra === 'TODOS') {
                aplica = true;
                origemLabel = 'Geral (Todos)';
            } else if (r.tipo_regra === 'GHE') {
                const alvoGhe = String(r.alvo_valor || '').trim().toUpperCase();
                if (gheNorm && (gheNorm === alvoGhe || gheNorm === `GRUPO ${alvoGhe}` || gheNorm.startsWith(alvoGhe))) {
                    aplica = true;
                    origemLabel = `GHE ${r.alvo_valor}`;
                }
            } else if (r.tipo_regra === 'FUNCAO') {
                const alvoFunc = String(r.alvo_valor || '').trim().toUpperCase();
                if (funcaoNorm && funcaoNorm === alvoFunc) {
                    aplica = true;
                    origemLabel = `Cargo (${r.alvo_valor})`;
                }
            } else if (r.tipo_regra === 'COLABORADOR') {
                if (mat === String(r.alvo_valor || '').trim()) {
                    aplica = true;
                    origemLabel = 'Individual';
                }
            }

            if (aplica) {
                const cod = String(r.treinamento_cod || '').trim();
                if (!cod) return;
                if (!exigenciasMap.has(cod)) {
                    exigenciasMap.set(cod, {
                        treinamento_cod: cod,
                        origens: [origemLabel],
                        obrigatorio_admissao: r.obrigatorio_admissao !== false,
                        periodicidade_customizada: r.periodicidade_customizada_meses || null
                    });
                } else {
                    const existente = exigenciasMap.get(cod);
                    if (!existente.origens.includes(origemLabel)) existente.origens.push(origemLabel);
                    if (r.obrigatorio_admissao) existente.obrigatorio_admissao = true;
                }
            }
        });

        // 2. Consolida todos os cursos que o colaborador possui registrados
        const realizadosMap = realizacoesMaisRecentes.get(mat) || new Map();
        const cursosConsolidados = [];
        const codigosRealizados = new Set();

        realizadosMap.forEach((tr, cod) => {
            codigosRealizados.add(cod);
            const nomeCurso = tr.treinamento_nome || obterNomeCursoCatalogo(cod);
            const dataTrein = tr.data_treinamento || null;

            // Define validade / reciclagem
            const perMeses = tr.meses_validade || exigenciasMap.get(cod)?.periodicidade_customizada || obterPeriodicidadeCursoCatalogo(cod);
            let dataVenc = null;
            if (tr.data_proxima_reciclagem) {
                dataVenc = tr.data_proxima_reciclagem;
            } else if (dataTrein && perMeses && perMeses > 0) {
                dataVenc = somarMesesDataIso(dataTrein, perMeses);
            }

            let status = 'valido';
            let labelBadge = '';
            let badgeClass = 'valido';
            let diasTexto = '';

            if (!dataVenc) {
                // Treinamento sem periodicidade de reciclagem (perene)
                status = 'valido';
                labelBadge = `🟢 ${cod} (Válido)`;
                badgeClass = 'valido';
                diasTexto = 'Validade permanente (Sem reciclagem periódica)';
            } else if (dataVenc < hojeStr) {
                const diasAtraso = Math.abs(calcularDiferencaDiasDatas(dataVenc, hojeStr));
                status = 'vencido';
                labelBadge = `🔴 ${cod} (Vencido)`;
                badgeClass = 'vencido';
                diasTexto = `Vencido em ${formatarDataIsoBR(dataVenc)} (há ${diasAtraso} dias)`;
            } else if (dataVenc <= em30DiasStr) {
                const diasRestantes = calcularDiferencaDiasDatas(hojeStr, dataVenc);
                status = 'avencer';
                labelBadge = `🟡 ${cod} (Vence em ${diasRestantes}d)`;
                badgeClass = 'avencer';
                diasTexto = `Vence em ${formatarDataIsoBR(dataVenc)} (em ${diasRestantes} dias)`;
            } else {
                const diasRestantes = calcularDiferencaDiasDatas(hojeStr, dataVenc);
                status = 'valido';
                labelBadge = `🟢 ${cod} (Válido)`;
                badgeClass = 'valido';
                diasTexto = `Válido até ${formatarDataIsoBR(dataVenc)} (restam ${diasRestantes} dias)`;
            }

            cursosConsolidados.push({
                cod,
                nome: nomeCurso,
                data_treinamento: dataTrein,
                data_vencimento: dataVenc,
                status,
                badgeClass,
                labelBadge,
                diasTexto,
                isExigencia: exigenciasMap.has(cod),
                realizacaoObj: tr
            });
        });

        // 3. Adiciona exigências normativas que o colaborador NUNCA realizou (Gaps NR-01)
        const pendenciasExigidas = [];
        exigenciasMap.forEach((exig, cod) => {
            if (!codigosRealizados.has(cod)) {
                const nomeCurso = obterNomeCursoCatalogo(cod);
                const itemPendente = {
                    cod,
                    nome: nomeCurso,
                    data_treinamento: null,
                    data_vencimento: null,
                    status: 'pendente',
                    badgeClass: 'pendente',
                    labelBadge: `🔴 ${cod} (Pendente)`,
                    diasTexto: exig.obrigatorio_admissao ? 'Capacitação obrigatória não realizada (Admissão)' : 'Capacitação obrigatória não realizada',
                    isExigencia: true,
                    origens: exig.origens,
                    obrigatorio_admissao: exig.obrigatorio_admissao,
                    realizacaoObj: null
                };
                cursosConsolidados.push(itemPendente);
                pendenciasExigidas.push(itemPendente);
            }
        });

        // Ordena pílulas: pendentes/vencidos primeiro, depois a vencer, depois válidos
        cursosConsolidados.sort((a, b) => {
            const peso = { 'pendente': 1, 'vencido': 2, 'avencer': 3, 'valido': 4 };
            return (peso[a.status] || 5) - (peso[b.status] || 5);
        });

        // 4. Determina o Status Geral de Aptidão Técnica do Colaborador
        let statusGeral = 'apto';
        const temPendenciaOuVencido = cursosConsolidados.some(c => c.status === 'pendente' || c.status === 'vencido');
        const temAVencer = cursosConsolidados.some(c => c.status === 'avencer');

        if (temPendenciaOuVencido) {
            statusGeral = 'pendente';
        } else if (temAVencer) {
            statusGeral = 'avencer';
        } else {
            statusGeral = 'apto';
        }

        // Avaliação do ASO (Saúde)
        let asoStatus = 'sem_data';
        let asoTexto = 'ASO não informado';
        let asoBadgeClass = 'badge-aso-cinza';
        if (colab.validade_aso) {
            const asoData = colab.validade_aso;
            if (asoData < hojeStr) {
                asoStatus = 'vencido';
                asoTexto = `ASO Vencido (${formatarDataIsoBR(asoData)})`;
                asoBadgeClass = 'badge-aso-vencido';
            } else if (asoData <= em30DiasStr) {
                const diasAso = calcularDiferencaDiasDatas(hojeStr, asoData);
                asoStatus = 'avencer';
                asoTexto = `ASO vence em ${diasAso}d (${formatarDataIsoBR(asoData)})`;
                asoBadgeClass = 'badge-aso-avencer';
            } else {
                asoStatus = 'valido';
                asoTexto = `ASO Válido (${formatarDataIsoBR(asoData)})`;
                asoBadgeClass = 'badge-aso-valido';
            }
        }

        // Histórico completo ordenado cronologicamente (decrescente)
        const histCompleto = (todasRealizacoesPorColab.get(mat) || []).slice().sort((a, b) => {
            const da = a.data_treinamento || '1970-01-01';
            const db = b.data_treinamento || '1970-01-01';
            return db.localeCompare(da);
        });

        prontidaoLista.push({
            matricula: mat,
            nome,
            funcao,
            setor,
            ghe,
            dt_admissao: colab.dt_admissao,
            validade_aso: colab.validade_aso,
            asoStatus,
            asoTexto,
            asoBadgeClass,
            statusGeral,
            treinamentos: cursosConsolidados,
            pendenciasExigidas,
            historicoCompleto: histCompleto,
            rawColab: colab
        });
    });

    // Ordena colaboradores por nome
    prontidaoLista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    prontidaoDadosCalculadosCache = prontidaoLista;
    return prontidaoLista;
}

function filtrarProntidaoEquipeUI() {
    prontidaoFiltroBusca = (document.getElementById('prontidaoBuscaInput')?.value || '').trim().toLowerCase();
    prontidaoFiltroGhe = document.getElementById('prontidaoFiltroGheSelect')?.value || '';
    prontidaoFiltroFuncao = document.getElementById('prontidaoFiltroFuncaoSelect')?.value || '';
    prontidaoFiltroStatus = document.getElementById('prontidaoFiltroStatusSelect')?.value || 'todos';

    // Suporte a compatibilidade se os selects simples ainda estiverem no DOM
    const selSetor = document.getElementById('prontidaoFiltroSetorSelect');
    if (selSetor && selSetor.value) {
        prontidaoFiltroSetor = selSetor.value;
    }

    renderProntidaoEquipeTab(false);
}

function limparFiltrosProntidaoEquipe() {
    if (document.getElementById('prontidaoBuscaInput')) document.getElementById('prontidaoBuscaInput').value = '';
    if (document.getElementById('prontidaoSetorSearchInput')) document.getElementById('prontidaoSetorSearchInput').value = '';
    if (document.getElementById('prontidaoCursoSearchInput')) document.getElementById('prontidaoCursoSearchInput').value = '';
    if (document.getElementById('prontidaoFiltroGheSelect')) document.getElementById('prontidaoFiltroGheSelect').value = '';
    if (document.getElementById('prontidaoFiltroFuncaoSelect')) document.getElementById('prontidaoFiltroFuncaoSelect').value = '';
    if (document.getElementById('prontidaoFiltroStatusSelect')) document.getElementById('prontidaoFiltroStatusSelect').value = 'todos';
    if (document.getElementById('prontidaoFiltroSetorSelect')) document.getElementById('prontidaoFiltroSetorSelect').value = '';
    if (document.getElementById('prontidaoFiltroCursoSelect')) document.getElementById('prontidaoFiltroCursoSelect').value = '';

    prontidaoFiltroBusca = '';
    prontidaoFiltroSetores = [];
    prontidaoFiltroSetor = '';
    prontidaoFiltroGhe = '';
    prontidaoFiltroFuncao = '';
    prontidaoFiltroStatus = 'todos';
    prontidaoFiltroCurso = '';

    // Desmarca checkboxes de setores e marca "Todos"
    document.querySelectorAll('.chk-setor-prontidao').forEach(c => c.checked = false);
    const chkTodos = document.getElementById('prontidaoSetorCheckTodos');
    if (chkTodos) chkTodos.checked = true;

    atualizarLabelBotaoSetores();
    atualizarLabelBotaoCurso();
    fecharTodosDropdownsProntidao();

    renderProntidaoEquipeTab(false);
}

async function renderProntidaoEquipeTab(forcarRecarregar = false) {
    if (forcarRecarregar || !prontidaoDadosCalculadosCache) {
        if (!allTreinamentosRealizados || allTreinamentosRealizados.length === 0 || !allEfetivo || allEfetivo.length === 0) {
            await loadTreinamentosData();
        }
        popularFiltrosProntidaoEquipes();
        calcularProntidaoEquipes();
    }

    const todosColabs = prontidaoDadosCalculadosCache || calcularProntidaoEquipes();

    // Aplica os filtros selecionados
    const filtrados = todosColabs.filter(c => {
        // 1. Filtro de Múltiplos Setores (Multi-Select)
        if (prontidaoFiltroSetores && prontidaoFiltroSetores.length > 0) {
            if (!c.setor || !prontidaoFiltroSetores.includes(c.setor)) return false;
        } else if (prontidaoFiltroSetor && c.setor !== prontidaoFiltroSetor) {
            return false;
        }

        // 2. Filtro de GHE
        if (prontidaoFiltroGhe && c.ghe !== prontidaoFiltroGhe) {
            const gheNorm = (c.ghe || '').toUpperCase();
            const filtroNorm = prontidaoFiltroGhe.toUpperCase();
            if (gheNorm !== filtroNorm && gheNorm !== `GRUPO ${filtroNorm}` && !gheNorm.startsWith(filtroNorm)) return false;
        }

        // 3. Filtro de Função
        if (prontidaoFiltroFuncao && c.funcao !== prontidaoFiltroFuncao) return false;

        // 4. Filtro por Curso Específico (Válido, A Vencer, Vencido ou Pendente)
        let cursoAlvoNoColab = null;
        if (prontidaoFiltroCurso) {
            cursoAlvoNoColab = c.treinamentos.find(t => String(t.cod) === String(prontidaoFiltroCurso));
            // Deve possuir o curso cadastrado (realizado) ou exigido como pendência
            if (!cursoAlvoNoColab) return false;
        }

        // 5. Filtro de Status de Aptidão
        if (prontidaoFiltroStatus !== 'todos') {
            if (prontidaoFiltroCurso && cursoAlvoNoColab) {
                // Aplica o status ESPECIFICAMENTE sobre o curso filtrado (ex: NR-10 Vencida)
                if (prontidaoFiltroStatus === 'apto') {
                    if (cursoAlvoNoColab.status !== 'valido') return false;
                } else if (prontidaoFiltroStatus === 'avencer') {
                    if (cursoAlvoNoColab.status !== 'avencer') return false;
                } else if (prontidaoFiltroStatus === 'pendente') {
                    if (cursoAlvoNoColab.status !== 'vencido' && cursoAlvoNoColab.status !== 'pendente') return false;
                }
            } else {
                // Aplica o status geral do colaborador
                if (c.statusGeral !== prontidaoFiltroStatus) return false;
            }
        }

        // 6. Filtro de busca textual
        if (prontidaoFiltroBusca) {
            const b = prontidaoFiltroBusca;
            const nomeL = (c.nome || '').toLowerCase();
            const matL = (c.matricula || '').toLowerCase();
            const funcL = (c.funcao || '').toLowerCase();
            const setorL = (c.setor || '').toLowerCase();
            const gheL = (c.ghe || '').toLowerCase();
            if (!nomeL.includes(b) && !matL.includes(b) && !funcL.includes(b) && !setorL.includes(b) && !gheL.includes(b)) {
                return false;
            }
        }

        return true;
    });

    // Atualiza KPIs da Equipe Filtrada
    const total = filtrados.length;
    let aptos = 0;
    let avencer = 0;
    let pendentes = 0;

    if (prontidaoFiltroCurso) {
        // Recalcula KPIs especificamente para o curso auditado
        filtrados.forEach(c => {
            const t = c.treinamentos.find(x => String(x.cod) === String(prontidaoFiltroCurso));
            if (t) {
                if (t.status === 'valido') aptos++;
                else if (t.status === 'avencer') avencer++;
                else if (t.status === 'vencido' || t.status === 'pendente') pendentes++;
            }
        });
    } else {
        // Recalcula KPIs pelo status geral da equipe
        aptos = filtrados.filter(c => c.statusGeral === 'apto').length;
        avencer = filtrados.filter(c => c.statusGeral === 'avencer').length;
        pendentes = filtrados.filter(c => c.statusGeral === 'pendente').length;
    }

    const pctApto = total > 0 ? Math.round((aptos / total) * 100) : 0;

    const elTotal = document.getElementById('kpiProntidaoTotal');
    const elAptos = document.getElementById('kpiProntidaoAptos');
    const elAVencer = document.getElementById('kpiProntidaoAVencer');
    const elPendentes = document.getElementById('kpiProntidaoPendentes');
    const elContador = document.getElementById('prontidaoTotalContador');

    if (elTotal) elTotal.textContent = total;
    if (elAptos) elAptos.textContent = `${aptos} (${pctApto}%)`;
    if (elAVencer) elAVencer.textContent = avencer;
    if (elPendentes) elPendentes.textContent = pendentes;
    if (elContador) elContador.textContent = total;

    // Renderiza a Tabela de Prontidão
    const tbody = document.getElementById('tabelaProntidaoEquipeCorpo');
    if (!tbody) return;

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 36px 16px; color: var(--text-light);">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text);">Nenhum colaborador encontrado para os filtros selecionados</div>
                    <div style="font-size: 12px; margin-top: 4px;">Tente limpar a busca ou selecionar outro setor/GHE/função.</div>
                    <button class="db-clear-btn" onclick="limparFiltrosProntidaoEquipe()" style="margin-top: 12px;">Limpar Filtros</button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(c => {
        // Badges de Status Geral
        let statusBadgeHtml = '';
        if (c.statusGeral === 'apto') {
            statusBadgeHtml = `<span class="badge-aptidao-apto" title="Todas as capacitações e exigências em dia">🟢 100% Apto</span>`;
        } else if (c.statusGeral === 'avencer') {
            statusBadgeHtml = `<span class="badge-aptidao-avencer" title="Possui treinamento(s) vencendo em até 30 dias">🟡 A Vencer (≤30d)</span>`;
        } else {
            statusBadgeHtml = `<span class="badge-aptidao-pendente" title="Possui capacitação obrigatória pendente ou vencida">🔴 Com Pendência</span>`;
        }

        // Pílulas de Treinamento com Agrupamento Expansível dos Válidos
        let pillsHtml = '';
        if (c.treinamentos.length === 0) {
            pillsHtml = '<span style="font-size: 11px; color: var(--text-light); font-style: italic;">Nenhum treinamento registrado</span>';
        } else {
            const codCursoFiltrado = prontidaoFiltroCurso ? String(prontidaoFiltroCurso) : '';
            let itemFiltrado = null;
            const listaRestante = [];

            c.treinamentos.forEach(t => {
                if (codCursoFiltrado && String(t.cod) === codCursoFiltrado) {
                    itemFiltrado = t;
                } else {
                    listaRestante.push(t);
                }
            });

            // Críticos da lista restante (Vencidos, Pendentes, A Vencer)
            const criticos = listaRestante.filter(t => t.status === 'vencido' || t.status === 'pendente' || t.status === 'avencer');
            // Válidos da lista restante
            const validos = listaRestante.filter(t => t.status === 'valido');

            // Lista visível imediata
            const visiveisImediatos = [];
            if (itemFiltrado) {
                visiveisImediatos.push({
                    ...itemFiltrado,
                    destaque: true
                });
            }
            criticos.forEach(t => visiveisImediatos.push(t));

            const visiveisPillsHtml = visiveisImediatos.map(t => {
                const classeDestaque = t.destaque ? 'filtrado-destaque' : '';
                const pinIcon = t.destaque ? '🎯 ' : '';
                return `<span class="badge-trein-pill ${t.badgeClass} ${classeDestaque}" title="${t.destaque ? '[Curso Filtrado] ' : ''}${escapeHTML(t.nome)} - ${escapeHTML(t.diasTexto)}">
                    ${pinIcon}${escapeHTML(t.labelBadge)}
                </span>`;
            }).join('');

            let validosSecaoHtml = '';
            if (validos.length > 0) {
                const matSafe = escapeHTML(String(c.matricula).replace(/[^a-zA-Z0-9_-]/g, '_'));
                const validosPills = validos.map(t => {
                    return `<span class="badge-trein-pill ${t.badgeClass}" title="${escapeHTML(t.nome)} - ${escapeHTML(t.diasTexto)}">
                        ${escapeHTML(t.labelBadge)}
                    </span>`;
                }).join('');

                validosSecaoHtml = `
                    <button type="button" class="btn-toggle-validos" id="btn-validos-${matSafe}" onclick="toggleValidosColaborador('${matSafe}', event)" title="Clique para expandir/ocultar os ${validos.length} treinamentos válidos deste colaborador">
                        ➕ Ver ${validos.length} Válidos ▾
                    </button>
                    <div id="validos-container-${matSafe}" data-qtd="${validos.length}" class="wrap-validos-expansivel" style="display: none;" onclick="event.stopPropagation()">
                        ${validosPills}
                    </div>
                `;
            } else if (visiveisImediatos.length === 0) {
                validosSecaoHtml = '<span style="font-size: 11px; color: var(--text-light); font-style: italic;">Nenhum treinamento registrado</span>';
            }

            pillsHtml = `<div class="wrap-trein-pills">
                ${visiveisPillsHtml}
                ${validosSecaoHtml}
            </div>`;
        }

        // Badge ASO compacto
        let asoBadgeInline = '';
        if (c.validade_aso) {
            if (c.asoStatus === 'vencido') {
                asoBadgeInline = `<span style="font-size: 10px; color: #b91c1c; font-weight: 700; margin-left: 4px;" title="${escapeHTML(c.asoTexto)}">⚠️ ASO Vencido</span>`;
            }
        }

        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 10px 12px; font-weight: 700; font-family: monospace; color: var(--text-light);">
                    ${escapeHTML(c.matricula)}
                </td>
                <td style="padding: 10px 12px;">
                    <a href="javascript:void(0)" onclick="abrirDossieColaborador('${escapeHTML(c.matricula)}')" style="font-weight: 700; color: var(--primary, #2563eb); text-decoration: underline; display: inline-flex; align-items: center;" title="Clique para abrir o Dossiê Completo">
                        ${escapeHTML(c.nome)}
                    </a>
                    ${asoBadgeInline}
                </td>
                <td style="padding: 10px 12px; color: var(--text);">
                    ${escapeHTML(c.funcao || 'Não informada')}
                </td>
                <td style="padding: 10px 12px; color: var(--text-light);">
                    ${escapeHTML(c.setor || '-')}${c.ghe ? ` / GHE ${escapeHTML(c.ghe)}` : ''}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    ${statusBadgeHtml}
                </td>
                <td style="padding: 10px 12px;">
                    ${pillsHtml}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    <button class="db-clear-btn" onclick="abrirDossieColaborador('${escapeHTML(c.matricula)}')" style="padding: 4px 10px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;" title="Ver histórico completo e emitir prontuário">
                        🔍 Dossiê
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleValidosColaborador(matSafe, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const container = document.getElementById(`validos-container-${matSafe}`);
    const btn = document.getElementById(`btn-validos-${matSafe}`);
    if (!container || !btn) return;
    const isHidden = container.style.display === 'none';
    if (isHidden) {
        container.style.display = 'flex';
        btn.innerHTML = `➖ Ocultar Válidos ▴`;
        btn.classList.add('expandido');
    } else {
        container.style.display = 'none';
        const qtd = container.getAttribute('data-qtd') || '0';
        btn.innerHTML = `➕ Ver ${qtd} Válidos ▾`;
        btn.classList.remove('expandido');
    }
}

function abrirDossieColaborador(matricula) {
    const todos = prontidaoDadosCalculadosCache || calcularProntidaoEquipes();
    const c = todos.find(x => String(x.matricula) === String(matricula));
    if (!c) {
        alert('Colaborador não encontrado na base de dados ativa.');
        return;
    }
    dossieColaboradorAtual = c;

    // 1. Preenche Ficha de Dados do Colaborador
    const infoCard = document.getElementById('dossieColaboradorInfoCard');
    if (infoCard) {
        let asoTag = '';
        if (c.validade_aso) {
            const cor = c.asoStatus === 'vencido' ? '#ef4444' : (c.asoStatus === 'avencer' ? '#f59e0b' : '#10b981');
            asoTag = `<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${cor}15; color: ${cor}; border: 1px solid ${cor}40;">${escapeHTML(c.asoTexto)}</span>`;
        } else {
            asoTag = `<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; background: #e2e8f0; color: #64748b;">ASO Não Informado</span>`;
        }

        let aptTag = '';
        if (c.statusGeral === 'apto') {
            aptTag = `<span class="badge-aptidao-apto">🟢 Apto p/ Atividades (100% em Dia)</span>`;
        } else if (c.statusGeral === 'avencer') {
            aptTag = `<span class="badge-aptidao-avencer">🟡 A Vencer nos Próximos 30 Dias</span>`;
        } else {
            aptTag = `<span class="badge-aptidao-pendente">🔴 Inapto p/ Atividades Específicas (Com Pendência)</span>`;
        }

        infoCard.innerHTML = `
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <div style="font-size: 17px; font-weight: 800; color: var(--text);">${escapeHTML(c.nome)}</div>
                        <div style="font-size: 12.5px; color: var(--text-light); margin-top: 2px;">
                            Matrícula: <strong>${escapeHTML(c.matricula)}</strong> | Função: <strong>${escapeHTML(c.funcao || 'Não informada')}</strong>
                        </div>
                    </div>
                    <div>
                        ${aptTag}
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 12px; border-top: 1px solid var(--border); padding-top: 10px;">
                    <div><span style="color:var(--text-light);">Setor:</span> <strong>${escapeHTML(c.setor || '-')}</strong></div>
                    <div><span style="color:var(--text-light);">GHE (PGR):</span> <strong>${escapeHTML(c.ghe ? `GHE ${c.ghe}` : '-')}</strong></div>
                    <div><span style="color:var(--text-light);">Admissão:</span> <strong>${formatarDataIsoBR(c.dt_admissao)}</strong></div>
                    <div><span style="color:var(--text-light);">Saúde Ocupacional:</span> ${asoTag}</div>
                </div>
            </div>
        `;
    }

    // 2. Indicadores Rápidos do Trabalhador
    const kpisWrap = document.getElementById('dossieColaboradorKpis');
    if (kpisWrap) {
        const totalTrein = c.treinamentos.length;
        const validos = c.treinamentos.filter(t => t.status === 'valido').length;
        const avencer = c.treinamentos.filter(t => t.status === 'avencer').length;
        const vencidos = c.treinamentos.filter(t => t.status === 'vencido').length;
        const pendentes = c.treinamentos.filter(t => t.status === 'pendente').length;

        kpisWrap.innerHTML = `
            <div class="db-card" style="padding: 10px 14px; border-left: 3px solid #6366f1;">
                <div style="font-size: 10px; font-weight: 700; color: var(--text-light); text-transform: uppercase;">Total de Cursos</div>
                <div style="font-size: 20px; font-weight: 800; color: #4338ca; margin-top: 2px;">${totalTrein}</div>
            </div>
            <div class="db-card" style="padding: 10px 14px; border-left: 3px solid var(--success);">
                <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">Válidos</div>
                <div style="font-size: 20px; font-weight: 800; color: #047857; margin-top: 2px;">${validos}</div>
            </div>
            <div class="db-card" style="padding: 10px 14px; border-left: 3px solid var(--warning);">
                <div style="font-size: 10px; font-weight: 700; color: #b45309; text-transform: uppercase;">A Vencer (≤30d)</div>
                <div style="font-size: 20px; font-weight: 800; color: #b45309; margin-top: 2px;">${avencer}</div>
            </div>
            <div class="db-card" style="padding: 10px 14px; border-left: 3px solid var(--danger);">
                <div style="font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Vencidos</div>
                <div style="font-size: 20px; font-weight: 800; color: #b91c1c; margin-top: 2px;">${vencidos}</div>
            </div>
            <div class="db-card" style="padding: 10px 14px; border-left: 3px solid #ec4899;">
                <div style="font-size: 10px; font-weight: 700; color: #be185d; text-transform: uppercase;">Pendentes (Gaps)</div>
                <div style="font-size: 20px; font-weight: 800; color: #be185d; margin-top: 2px;">${pendentes}</div>
            </div>
        `;
    }

    // 3. Bloco de Treinamentos Exigidos Pendentes (Gaps NR-01)
    const pendWrap = document.getElementById('dossieColaboradorPendencias');
    if (pendWrap) {
        const itensGaps = c.treinamentos.filter(t => t.status === 'pendente' || t.status === 'vencido');
        if (itensGaps.length === 0) {
            pendWrap.innerHTML = `
                <div style="padding: 12px 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #047857; font-size: 12.5px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 18px;">🟢</span>
                    <div>
                        <strong>Situação Regular:</strong> Todas as capacitações obrigatórias para este cargo/GHE foram concluídas e estão na validade legal.
                    </div>
                </div>
            `;
        } else {
            pendWrap.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${itensGaps.map(g => `
                        <div style="padding: 10px 14px; background: ${g.status === 'vencido' ? '#fef2f2' : '#fdf2f8'}; border: 1px solid ${g.status === 'vencido' ? '#fecaca' : '#fbcfe8'}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <div>
                                <span style="font-weight: 800; color: ${g.status === 'vencido' ? '#b91c1c' : '#be185d'}; font-size: 13px;">[${escapeHTML(g.cod)}] ${escapeHTML(g.nome)}</span>
                                <div style="font-size: 11.5px; color: var(--text-light); margin-top: 2px;">
                                    ${escapeHTML(g.diasTexto)}${g.origens ? ' • Origem: ' + escapeHTML(g.origens.join(', ')) : ''}
                                </div>
                            </div>
                            <span class="badge-trein-pill ${g.badgeClass}">
                                ${escapeHTML(g.labelBadge)}
                            </span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // 4. Bloco de Histórico Completo de Treinamentos Concluídos
    const histCorpo = document.getElementById('dossieColaboradorHistoricoCorpo');
    if (histCorpo) {
        const concluidos = c.historicoCompleto || [];
        if (concluidos.length === 0) {
            histCorpo.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-light);">
                        Nenhum registro de treinamento concluído arquivado para este trabalhador.
                    </td>
                </tr>
            `;
        } else {
            const hojeStrLocal = new Date().toISOString().slice(0, 10);
            const em30DiasStrLocal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

            histCorpo.innerHTML = concluidos.map(tr => {
                const cod = tr.treinamento_cod || '-';
                const nomeCurso = tr.treinamento_nome || obterNomeCursoCatalogo(cod);
                const dataTr = tr.data_treinamento || '-';
                let dataVenc = tr.data_proxima_reciclagem || null;
                if (!dataVenc && tr.data_treinamento && tr.meses_validade) {
                    dataVenc = somarMesesDataIso(tr.data_treinamento, tr.meses_validade);
                }

                let badgeHtml = '';
                if (!dataVenc) {
                    badgeHtml = `<span class="badge-trein-pill valido">🟢 Válido (Perene)</span>`;
                } else if (dataVenc < hojeStrLocal) {
                    badgeHtml = `<span class="badge-trein-pill vencido">🔴 Vencido</span>`;
                } else if (dataVenc <= em30DiasStrLocal) {
                    badgeHtml = `<span class="badge-trein-pill avencer">🟡 A Vencer</span>`;
                } else {
                    badgeHtml = `<span class="badge-trein-pill valido">🟢 Válido</span>`;
                }

                const instrutor = tr.instrutor_nome || '-';
                const ch = tr.carga_horaria ? `${tr.carga_horaria}h` : '-';

                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 7px 10px; font-weight: 700; font-family: monospace;">${escapeHTML(cod)}</td>
                        <td style="padding: 7px 10px; font-weight: 600;">${escapeHTML(nomeCurso)}</td>
                        <td style="padding: 7px 10px; text-align: center;">${formatarDataIsoBR(dataTr)}</td>
                        <td style="padding: 7px 10px; text-align: center;">${dataVenc ? formatarDataIsoBR(dataVenc) : 'Perene'}</td>
                        <td style="padding: 7px 10px; text-align: center;">${escapeHTML(ch)}</td>
                        <td style="padding: 7px 10px; font-size: 11px; color: var(--text-light);">${escapeHTML(instrutor)}</td>
                        <td style="padding: 7px 10px; text-align: center;">${badgeHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Configura botão de impressão
    const btnImp = document.getElementById('btnImprimirProntuarioDossie');
    if (btnImp) {
        btnImp.onclick = () => imprimirProntuarioIndividual(c.matricula);
    }

    const modal = document.getElementById('modalDossieColaborador');
    if (modal) modal.style.display = 'flex';
}

function fecharModalDossieColaborador() {
    const modal = document.getElementById('modalDossieColaborador');
    if (modal) modal.style.display = 'none';
    dossieColaboradorAtual = null;
}

function imprimirProntidaoEquipe() {
    const todos = prontidaoDadosCalculadosCache || calcularProntidaoEquipes();
    // Filtra conforme a tela atual
    const filtrados = todos.filter(c => {
        // 1. Filtro de Múltiplos Setores
        if (prontidaoFiltroSetores && prontidaoFiltroSetores.length > 0) {
            if (!c.setor || !prontidaoFiltroSetores.includes(c.setor)) return false;
        } else if (prontidaoFiltroSetor && c.setor !== prontidaoFiltroSetor) {
            return false;
        }

        // 2. Filtro de GHE
        if (prontidaoFiltroGhe && c.ghe !== prontidaoFiltroGhe) {
            const gheNorm = (c.ghe || '').toUpperCase();
            const filtroNorm = prontidaoFiltroGhe.toUpperCase();
            if (gheNorm !== filtroNorm && gheNorm !== `GRUPO ${filtroNorm}` && !gheNorm.startsWith(filtroNorm)) return false;
        }

        // 3. Filtro de Função
        if (prontidaoFiltroFuncao && c.funcao !== prontidaoFiltroFuncao) return false;

        // 4. Filtro por Curso Específico
        let cursoAlvoNoColab = null;
        if (prontidaoFiltroCurso) {
            cursoAlvoNoColab = c.treinamentos.find(t => String(t.cod) === String(prontidaoFiltroCurso));
            if (!cursoAlvoNoColab) return false;
        }

        // 5. Filtro de Status de Aptidão
        if (prontidaoFiltroStatus !== 'todos') {
            if (prontidaoFiltroCurso && cursoAlvoNoColab) {
                if (prontidaoFiltroStatus === 'apto' && cursoAlvoNoColab.status !== 'valido') return false;
                if (prontidaoFiltroStatus === 'avencer' && cursoAlvoNoColab.status !== 'avencer') return false;
                if (prontidaoFiltroStatus === 'pendente' && cursoAlvoNoColab.status !== 'vencido' && cursoAlvoNoColab.status !== 'pendente') return false;
            } else {
                if (c.statusGeral !== prontidaoFiltroStatus) return false;
            }
        }

        // 6. Busca textual
        if (prontidaoFiltroBusca) {
            const b = prontidaoFiltroBusca;
            const nomeL = (c.nome || '').toLowerCase();
            const matL = (c.matricula || '').toLowerCase();
            const funcL = (c.funcao || '').toLowerCase();
            const setorL = (c.setor || '').toLowerCase();
            const gheL = (c.ghe || '').toLowerCase();
            if (!nomeL.includes(b) && !matL.includes(b) && !funcL.includes(b) && !setorL.includes(b) && !gheL.includes(b)) {
                return false;
            }
        }
        return true;
    });

    const total = filtrados.length;
    let aptos = 0;
    let avencer = 0;
    let pendentes = 0;

    if (prontidaoFiltroCurso) {
        filtrados.forEach(c => {
            const t = c.treinamentos.find(x => String(x.cod) === String(prontidaoFiltroCurso));
            if (t) {
                if (t.status === 'valido') aptos++;
                else if (t.status === 'avencer') avencer++;
                else if (t.status === 'vencido' || t.status === 'pendente') pendentes++;
            }
        });
    } else {
        aptos = filtrados.filter(c => c.statusGeral === 'apto').length;
        avencer = filtrados.filter(c => c.statusGeral === 'avencer').length;
        pendentes = filtrados.filter(c => c.statusGeral === 'pendente').length;
    }

    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    let nomeCursoFiltradoDesc = '';
    if (prontidaoFiltroCurso) {
        const cCat = (allTreinamentosCatalogo || []).find(x => String(x.id || x.codigo) === String(prontidaoFiltroCurso));
        nomeCursoFiltradoDesc = cCat ? formatarLabelCursoCatalogo(cCat) : `Curso [${prontidaoFiltroCurso}]`;
    }

    const filtroDesc = [
        (prontidaoFiltroSetores && prontidaoFiltroSetores.length > 0) ? `Setores: ${prontidaoFiltroSetores.join(', ')}` : (prontidaoFiltroSetor ? `Setor: ${prontidaoFiltroSetor}` : null),
        prontidaoFiltroGhe ? `GHE: ${prontidaoFiltroGhe}` : null,
        prontidaoFiltroFuncao ? `Cargo: ${prontidaoFiltroFuncao}` : null,
        prontidaoFiltroStatus !== 'todos' ? `Status: ${prontidaoFiltroStatus.toUpperCase()}` : null,
        prontidaoFiltroCurso ? `Curso: ${nomeCursoFiltradoDesc}` : null
    ].filter(Boolean).join(' | ') || 'Todos os Colaboradores Ativos';

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Prontidão da Equipe - NR-01</title>
            <style>
                @page { size: A4 landscape; margin: 10mm 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5px; color: #0f172a; margin: 0; padding: 0; line-height: 1.35; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
                .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
                .sub { font-size: 10px; color: #475569; margin-top: 2px; }
                .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
                .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f8fafc; }
                .kpi-card b { display: block; font-size: 17px; margin-top: 2px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 700; color: #1e293b; }
                td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; }
                .badge-apto { color: #047857; font-weight: 800; }
                .badge-avencer { color: #b45309; font-weight: 800; }
                .badge-pendente { color: #b91c1c; font-weight: 800; }
                .pill { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; margin: 1px 2px; }
                .pill-valido { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .pill-avencer { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
                .pill-vencido { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                .pill-pendente { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
                .assinaturas { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                .linha-assinatura { border-top: 1px solid #0f172a; text-align: center; padding-top: 5px; font-size: 10px; }
                .footer { margin-top: 14px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="title">RELATÓRIO DE PRONTIDÃO OPERACIONAL E CAPACITAÇÃO DA EQUIPE</h1>
                    <div class="sub">Consórcio Operador Ramal | PISF Ramal do Agreste • Gestão de Segurança do Trabalho (NR-01)</div>
                </div>
                <div style="text-align: right; font-size: 9.5px; color: #475569;">
                    Emissão: <strong>${dataHoraEmissao}</strong><br>
                    Filtro: <strong>${escapeHTML(filtroDesc)}</strong>
                </div>
            </div>

            <div class="kpis">
                <div class="kpi-card" style="border-left: 4px solid #6366f1;">
                    <span style="font-size: 9px; color: #64748b; text-transform: uppercase;">Total da Equipe</span>
                    <b style="color: #4338ca;">${total}</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #10b981;">
                    <span style="font-size: 9px; color: #047857; text-transform: uppercase;">100% Aptos em Dia</span>
                    <b style="color: #047857;">${aptos} (${total > 0 ? Math.round((aptos / total) * 100) : 0}%)</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
                    <span style="font-size: 9px; color: #b45309; text-transform: uppercase;">Com NRs a Vencer (≤30d)</span>
                    <b style="color: #b45309;">${avencer}</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #ef4444;">
                    <span style="font-size: 9px; color: #b91c1c; text-transform: uppercase;">Com Pendência / Vencido</span>
                    <b style="color: #b91c1c;">${pendentes}</b>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">Matr.</th>
                        <th>Colaborador</th>
                        <th>Função / Cargo</th>
                        <th>Setor / GHE</th>
                        <th style="text-align: center; width: 80px;">Status Geral</th>
                        <th>Capacitações Válidas</th>
                        <th>Pendências / Reciclagens</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrados.map(c => {
                        const validosPills = c.treinamentos.filter(t => t.status === 'valido' || t.status === 'avencer')
                            .map(t => `<span class="pill ${t.status === 'avencer' ? 'pill-avencer' : 'pill-valido'}">${escapeHTML(t.labelBadge)}</span>`).join('');
                        const gapsPills = c.treinamentos.filter(t => t.status === 'pendente' || t.status === 'vencido')
                            .map(t => `<span class="pill ${t.status === 'vencido' ? 'pill-vencido' : 'pill-pendente'}">${escapeHTML(t.labelBadge)}</span>`).join('');

                        return `
                            <tr>
                                <td>${escapeHTML(c.matricula)}</td>
                                <td><strong>${escapeHTML(c.nome)}</strong></td>
                                <td>${escapeHTML(c.funcao || '-')}</td>
                                <td>${escapeHTML(c.setor || '-')}${c.ghe ? ' / GHE ' + escapeHTML(c.ghe) : ''}</td>
                                <td style="text-align: center;">
                                    <span class="${c.statusGeral === 'apto' ? 'badge-apto' : (c.statusGeral === 'avencer' ? 'badge-avencer' : 'badge-pendente')}">
                                        ${c.statusGeral === 'apto' ? 'APTO' : (c.statusGeral === 'avencer' ? 'A VENCER' : 'INAPTO')}
                                    </span>
                                </td>
                                <td>${validosPills || '<span style="color:#94a3b8;">Nenhum</span>'}</td>
                                <td>${gapsPills || '<span style="color:#047857; font-weight:700;">Nenhuma pendência</span>'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="assinaturas">
                <div class="linha-assinatura">
                    <strong>Responsável Técnico SST (Engenharia / SESMT)</strong><br>
                    <span>Visto e Liberação Técnica da Equipe</span>
                </div>
                <div class="linha-assinatura">
                    <strong>Encarregado / Líder da Frente de Serviço</strong><br>
                    <span>Ciência da Composição e Aptidão da Equipe</span>
                </div>
            </div>

            <div class="footer">
                <div>Documento Oficial de Comprovação de Capacitação Operacional — NR-01 / GRO / PGR</div>
                <div>Emissão automatizada via Painel Gerencial SST COP</div>
            </div>
        </body>
        </html>
    `;

    abrirDocumentoHtmlParaImpressao(html, 'Relatório de Prontidão da Equipe - NR-01');
}

function imprimirProntuarioIndividual(matricula) {
    const todos = prontidaoDadosCalculadosCache || calcularProntidaoEquipes();
    const c = todos.find(x => String(x.matricula) === String(matricula));
    if (!c) {
        alert('Colaborador não encontrado para impressão do prontuário.');
        return;
    }

    const dataHoraEmissao = new Date().toLocaleString('pt-BR');
    const concluidos = c.historicoCompleto || [];
    const pendencias = c.pendenciasExigidas || [];

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Prontuário de Capacitação - ${escapeHTML(c.nome)}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; line-height: 1.4; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; }
                .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
                .sub { font-size: 10px; color: #475569; margin-top: 2px; }
                .box-dados { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; margin-bottom: 14px; }
                .grid-dados { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; font-size: 11px; }
                .secao-titulo { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin: 14px 0 8px 0; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
                th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 700; color: #1e293b; }
                td { border: 1px solid #e2e8f0; padding: 5px 8px; }
                .badge-ok { color: #047857; font-weight: 700; }
                .badge-alert { color: #b45309; font-weight: 700; }
                .badge-venc { color: #b91c1c; font-weight: 700; }
                .termo { font-size: 9.5px; color: #334155; line-height: 1.5; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fafafa; margin-top: 14px; text-align: justify; }
                .assinaturas { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                .linha-assinatura { border-top: 1px solid #0f172a; text-align: center; padding-top: 5px; font-size: 10px; }
                .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="title">FICHA DE QUALIFICAÇÃO E PRONTUÁRIO DE TREINAMENTOS</h1>
                    <div class="sub">Consórcio Operador Ramal | PISF Ramal do Agreste • Gestão de Segurança do Trabalho</div>
                </div>
                <div style="text-align: right; font-size: 9.5px; color: #475569;">
                    Emissão: <strong>${dataHoraEmissao}</strong><br>
                    Matrícula: <strong>${escapeHTML(c.matricula)}</strong>
                </div>
            </div>

            <div class="box-dados">
                <div class="grid-dados" style="margin-bottom: 8px;">
                    <div>Nome do Trabalhador: <strong style="font-size: 12px;">${escapeHTML(c.nome)}</strong></div>
                    <div>Matrícula: <strong>${escapeHTML(c.matricula)}</strong></div>
                    <div>Status: <strong>${c.statusGeral === 'apto' ? '🟢 APTO' : (c.statusGeral === 'avencer' ? '🟡 A VENCER' : '🔴 PENDENTE')}</strong></div>
                </div>
                <div class="grid-dados">
                    <div>Cargo / Função: <strong>${escapeHTML(c.funcao || 'Não informado')}</strong></div>
                    <div>Setor / GHE: <strong>${escapeHTML(c.setor || '-')}${c.ghe ? ' / GHE ' + escapeHTML(c.ghe) : ''}</strong></div>
                    <div>ASO: <strong>${formatarDataIsoBR(c.validade_aso)}</strong></div>
                </div>
            </div>

            <div class="secao-titulo">1. Histórico de Treinamentos e Capacitações Concluídas</div>
            ${concluidos.length === 0 ? '<p style="font-size:10.5px; color:#64748b; font-style:italic;">Nenhum registro de treinamento realizado encontrado.</p>' : `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">Código</th>
                            <th>Treinamento Concluído</th>
                            <th style="text-align: center; width: 65px;">C.H.</th>
                            <th style="text-align: center; width: 75px;">Realização</th>
                            <th style="text-align: center; width: 75px;">Reciclagem</th>
                            <th>Instrutor / Entidade</th>
                            <th style="text-align: center; width: 65px;">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${concluidos.map(tr => {
                            const cod = tr.treinamento_cod || '-';
                            const nomeCurso = tr.treinamento_nome || obterNomeCursoCatalogo(cod);
                            const ch = tr.carga_horaria ? `${tr.carga_horaria}h` : '-';
                            const dataTr = tr.data_treinamento || '-';
                            let dataVenc = tr.data_proxima_reciclagem || null;
                            if (!dataVenc && tr.data_treinamento && tr.meses_validade) {
                                dataVenc = somarMesesDataIso(tr.data_treinamento, tr.meses_validade);
                            }
                            const hojeStrLocal = new Date().toISOString().slice(0, 10);
                            let sitClass = 'badge-ok';
                            let sitTexto = 'Válido';
                            if (dataVenc && dataVenc < hojeStrLocal) {
                                sitClass = 'badge-venc';
                                sitTexto = 'Vencido';
                            } else if (!dataVenc) {
                                sitTexto = 'Perene';
                            }

                            return `
                                <tr>
                                    <td><strong>${escapeHTML(cod)}</strong></td>
                                    <td>${escapeHTML(nomeCurso)}</td>
                                    <td style="text-align: center;">${escapeHTML(ch)}</td>
                                    <td style="text-align: center;">${formatarDataIsoBR(dataTr)}</td>
                                    <td style="text-align: center;">${dataVenc ? formatarDataIsoBR(dataVenc) : 'Perene'}</td>
                                    <td>${escapeHTML(tr.instrutor_nome || tr.entidade_treinamento || '-')}</td>
                                    <td style="text-align: center;"><span class="${sitClass}">${sitTexto}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `}

            <div class="secao-titulo">2. Exigências Normativas Obrigatórias e Reciclagens Futuras</div>
            ${pendencias.length === 0 ? '<p style="font-size:10.5px; color:#047857; font-weight:700;">🟢 Não há pendências normativas para o colaborador no presente momento.</p>' : `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">Código</th>
                            <th>Capacitação Exigida</th>
                            <th>Origem da Exigência</th>
                            <th>Obrigatoriedade</th>
                            <th style="text-align: center; width: 85px;">Situação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pendencias.map(p => `
                            <tr>
                                <td><strong>${escapeHTML(p.cod)}</strong></td>
                                <td>${escapeHTML(p.nome)}</td>
                                <td>${escapeHTML((p.origens || []).join(', ') || 'Regra SST')}</td>
                                <td>${p.obrigatorio_admissao ? 'Obrigatório na Admissão' : 'Capacitação Periódica'}</td>
                                <td style="text-align: center;"><span class="badge-venc">PENDENTE</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}

            <div class="termo">
                <strong>TERMO DE CIÊNCIA E DECLARAÇÃO DE CAPACITAÇÃO PROFISSIONAL (NR-01):</strong><br>
                Declaro, para os devidos fins de comprovação perante a fiscalização do Ministério do Trabalho e Emprego (MTE) e normas vigentes de Segurança e Saúde no Trabalho, que participei com assiduidade e aproveitamento das capacitações descritas neste prontuário, recebendo instrução teórica e prática conforme a ementa de cada treinamento, comprometendo-me a cumprir todas as diretrizes de prevenção no exercício de minhas atividades.
            </div>

            <div class="assinaturas">
                <div class="linha-assinatura">
                    <strong>${escapeHTML(c.nome)}</strong><br>
                    <span>Trabalhador(a) — Matrícula ${escapeHTML(c.matricula)}</span>
                </div>
                <div class="linha-assinatura">
                    <strong>Engenharia de Segurança do Trabalho / SESMT</strong><br>
                    <span>Consórcio Operador Ramal</span>
                </div>
            </div>

            <div class="footer">
                <div>Ficha Oficial de Prontuário Individual de Capacitação — Atendimento à NR-01, NR-18 e PGR</div>
                <div>Emissão via Sistema Integrado de Gestão SST</div>
            </div>
        </body>
        </html>
    `;

    abrirDocumentoHtmlParaImpressao(html, `Prontuário de Treinamentos - ${c.nome}`);
}

function toggleSecaoGerenciarEncarregados() {
    const wrap = document.getElementById('wrapSecaoGerenciarEncarregados');
    const icone = document.getElementById('iconeToggleSecaoEncarregados');
    if (!wrap) return;
    const estaVisivel = wrap.style.display !== 'none';
    wrap.style.display = estaVisivel ? 'none' : 'block';
    if (icone) icone.textContent = estaVisivel ? '▾ Expandir' : '▴ Recolher';
}

function popularEquipesResponsavelDatalist() {
    const dl = document.getElementById('equipesResponsavelList');
    if (!dl) return;
    dl.innerHTML = '';
    const responsaveis = new Set();
    allEfetivo.forEach(e => { if (colaboradorEstaAtivo(e) && e.responsavel) responsaveis.add(e.responsavel); });
    Array.from(responsaveis).sort().forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        dl.appendChild(opt);
    });
}

function limparBuscaEquipes() {
    document.getElementById('equipesResponsavelInput').value = '';
    renderEquipeAtual();
}

function renderEquipeAtual() {
    const responsavel = document.getElementById('equipesResponsavelInput').value.trim();
    const container = document.getElementById('equipesConteudo');
    if (!responsavel) {
        container.innerHTML = '<div class="db-list-empty">Digite ou selecione um encarregado - se o nome já existir, abre a equipe dele; se for novo, cria uma equipe nova assim que você adicionar o primeiro colaborador abaixo.</div>';
        return;
    }

    const equipe = allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === responsavel)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const equipeExiste = equipe.length > 0;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
            <span style="font-size:12px; color:var(--text-light); font-weight:600;">${equipeExiste ? `Equipe atual de ${escapeHTML(responsavel)}` : `Nova equipe: ${escapeHTML(responsavel)}`}</span>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px; color:var(--text-light);">${equipe.length} colaborador(es)</span>
                ${equipeExiste ? `<button class="db-clear-btn" style="padding:4px 10px; font-size:11.5px;" onclick="toggleRenomearEquipe()">✏️ Renomear Equipe</button>` : ''}
            </div>
        </div>
        <div id="equipesRenomearWrap" style="display:none; gap:8px; margin-bottom:12px; align-items:center;">
            <input type="text" id="equipesNovoNomeInput" placeholder="Novo nome do encarregado/equipe..." value="${escapeHTML(responsavel)}"
                   style="flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:8px; font-size:12.5px; box-sizing:border-box;">
            <button class="db-apply-btn" style="padding:6px 12px; font-size:12px;" onclick="renomearEquipeAtual()">Salvar</button>
            <button class="db-clear-btn" style="padding:6px 12px; font-size:12px;" onclick="toggleRenomearEquipe()">Cancelar</button>
        </div>
        <div id="equipesListaAtual" class="db-list" style="max-height:280px; margin-bottom:16px;"></div>

        <label style="display:block; margin-bottom:4px; color:var(--text-light); font-weight:600; font-size:12.5px;">Adicionar colaborador a esta equipe</label>
        <input type="text" id="equipesAddColabInput" placeholder="Buscar por nome ou matrícula..."
               oninput="filterEquipesAddColab(this.value)" autocomplete="off"
               style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; box-sizing:border-box; background:var(--card); color:var(--text); margin-bottom:8px;">
        <div id="equipesAddColabResults" class="db-list" style="max-height:220px;"></div>
        <span id="equipesStatus" style="font-size:12px; color:var(--text-light);"></span>
    `;

    const listaEl = document.getElementById('equipesListaAtual');
    if (equipe.length === 0) {
        listaEl.innerHTML = '<div class="db-list-empty">Ainda sem colaboradores - adicione o primeiro abaixo pra criar esta equipe.</div>';
    } else {
        listaEl.innerHTML = equipe.map(e => `
            <div class="db-list-item" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                    <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
                    <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}</div>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0;">
                    <button class="db-clear-btn" onclick="editarColaboradorDaEquipe('${escapeHTML(e.id)}')">✏️ Editar</button>
                    <button class="db-clear-btn" style="color:var(--danger); border-color:var(--danger);" onclick="removerDaEquipe('${escapeHTML(e.id)}')">Remover</button>
                </div>
            </div>`).join('');
    }
}

function toggleRenomearEquipe() {
    const wrap = document.getElementById('equipesRenomearWrap');
    if (!wrap) return;
    const abrindo = wrap.style.display === 'none';
    wrap.style.display = abrindo ? 'flex' : 'none';
    if (abrindo) document.getElementById('equipesNovoNomeInput')?.focus();
}

// Renomeia a equipe inteira de uma vez - atualiza o campo `responsavel` de todos os
// colaboradores atualmente na equipe pro novo nome, num upsert só. Sem isso, corrigir o
// nome de um encarregado (ex: erro de digitação) exigia mover cada colaborador um por
// um pra uma "equipe nova" com o nome certo.
async function renomearEquipeAtual() {
    const nomeAtual = document.getElementById('equipesResponsavelInput').value.trim();
    const novoNome = document.getElementById('equipesNovoNomeInput').value.trim();
    const statusEl = document.getElementById('equipesStatus');
    if (!novoNome || novoNome === nomeAtual) { toggleRenomearEquipe(); return; }

    const equipe = allEfetivo.filter(e => colaboradorEstaAtivo(e) && e.responsavel === nomeAtual);
    if (equipe.length === 0) return;

    if (statusEl) { statusEl.textContent = `Renomeando ${equipe.length} colaborador(es)...`; statusEl.style.color = 'var(--text-light)'; }
    try {
        await supabaseUpsert('colaboradores_efetivo', equipe.map(e => ({ id: e.id, responsavel: novoNome })));
        equipe.forEach(e => { e.responsavel = novoNome; });
        document.getElementById('equipesResponsavelInput').value = novoNome;
        popularEquipesResponsavelDatalist();
        renderEquipeAtual();
        document.getElementById('equipesStatus').textContent = '✅ Equipe renomeada.';
        document.getElementById('equipesStatus').style.color = 'var(--success)';
    } catch (err) {
        console.error('Erro ao renomear equipe:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha ao renomear: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

// Leva direto pro cadastro completo do colaborador (Efetivo > Cadastros) - reaproveita
// o mesmo formulário/lógica de salvar já existente, em vez de duplicar campos aqui só
// pra edição rápida.
function editarColaboradorDaEquipe(matricula) {
    showDbPage('efetivo');
    showEfetivoSubtab('colaboradores');
    abrirFormEfetivo(matricula);
}

function filterEquipesAddColab(query) {
    const responsavel = document.getElementById('equipesResponsavelInput').value.trim();
    const container = document.getElementById('equipesAddColabResults');
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) { container.innerHTML = ''; return; }

    const matches = allEfetivo.filter(e =>
        colaboradorEstaAtivo(e) && e.responsavel !== responsavel &&
        ((e.nome && e.nome.toLowerCase().includes(q)) || (e.id && e.id.toLowerCase().includes(q)))
    ).slice(0, 15);

    if (matches.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhum colaborador encontrado</div>';
        return;
    }
    container.innerHTML = matches.map(e => `
        <div class="db-list-item" style="cursor:pointer;" onclick="adicionarAEquipe('${escapeHTML(e.id)}')">
            <div class="db-list-item-title">${escapeHTML(e.nome || '')}</div>
            <div class="db-list-item-sub">${escapeHTML(e.funcao || '')} — Matrícula ${escapeHTML(e.id)}${e.responsavel ? ' — atualmente com ' + escapeHTML(e.responsavel) : ' — sem encarregado definido'}</div>
        </div>`).join('');
}

async function salvarResponsavelColaborador(matricula, novoResponsavel) {
    const statusEl = document.getElementById('equipesStatus');
    const e = allEfetivo.find(x => x.id === matricula);
    if (!e) return;
    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }
    try {
        await supabaseUpsert('colaboradores_efetivo', [{ id: matricula, responsavel: novoResponsavel }]);
        e.responsavel = novoResponsavel;
        if (statusEl) { statusEl.textContent = '✅ Atualizado.'; statusEl.style.color = 'var(--success)'; }
        popularEquipesResponsavelDatalist();
        renderEquipeAtual();
    } catch (err) {
        console.error('Erro ao atualizar responsável do colaborador:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function adicionarAEquipe(matricula) {
    const responsavel = document.getElementById('equipesResponsavelInput').value.trim();
    if (!responsavel) return;
    salvarResponsavelColaborador(matricula, responsavel);
}

function removerDaEquipe(matricula) {
    if (!confirm('Remover este colaborador da equipe? Ele fica sem encarregado definido até ser adicionado a outra equipe.')) return;
    salvarResponsavelColaborador(matricula, null);
}

// ============================================
// CATÁLOGO DE TREINAMENTOS - cadastro/edição de tipo de treinamento (código, nome,
// carga horária, validade). Sem isso, a única forma de criar um código era a
// importação por CSV; agora dá pra criar/corrigir um treinamento direto no painel.
// Sem exclusão de propósito - códigos já usados em treinamentos_realizados/status não
// devem sumir do catálogo.
// ============================================

// Visão geral: total cadastrado, quantos têm validade (reciclagem) x quantos não
// (DDS pontuais) e a carga horária somada de todo o catálogo.
function renderCatalogoResumo() {
    const el = document.getElementById('catalogoResumo');
    if (!el) return;
    const total = allTreinamentosCatalogo.length;
    const comValidade = allTreinamentosCatalogo.filter(c => c.meses_validade).length;
    const comConteudo = allTreinamentosCatalogo.filter(c => c.objetivo && c.conteudo_programatico).length;
    const semConteudo = total - comConteudo;
    const cargaTotal = allTreinamentosCatalogo.reduce((sum, c) => sum + (parseFloat(c.carga_horaria) || 0), 0);
    el.innerHTML = total === 0 ? '' :
        `${total} treinamento(s) cadastrado(s) — ${comValidade} com validade (NR/reciclagem), ${total - comValidade} sem validade — ${cargaTotal.toLocaleString('pt-BR')}h de carga horária somada ` +
        `• <strong style="color:${semConteudo === 0 ? '#10b981' : '#f59e0b'};">📋 ${comConteudo}/${total} prontos para FOR.001.R00</strong>`;
}

// 'todos' | 'com' | 'sem' - separa os ~20 treinamentos "de verdade" (NR/reciclagem, com
// meses_validade preenchido) dos ~153 tópicos de DDS pontuais (sem validade) misturados
// no mesmo catálogo de 172 itens - sem isso não tinha como achar só um grupo ou outro
// sem rolar a lista inteira.
let catalogoFiltroValidade = 'todos';

function setCatalogoFiltroValidade(valor) {
    catalogoFiltroValidade = valor;
    ['todos', 'com', 'sem'].forEach(v => document.getElementById(`catalogoFiltroBtn-${v}`)?.classList.toggle('active', v === valor));
    filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput')?.value || '');
}

function filterCatalogoTreinamentos(query) {
    const container = document.getElementById('catalogoSearchResults');
    const q = (query || '').toLowerCase().trim();

    // Sem busca, mostra o catálogo inteiro (visão geral) em vez de ficar vazio até o
    // usuário digitar algo - a busca só entra pra estreitar a lista.
    const base = q.length < 2
        ? allTreinamentosCatalogo
        : allTreinamentosCatalogo.filter(c => (c.nome && c.nome.toLowerCase().includes(q)) || (c.id && c.id.toLowerCase().includes(q)));
    const porValidade = catalogoFiltroValidade === 'todos'
        ? base
        : base.filter(c => catalogoFiltroValidade === 'com' ? !!c.meses_validade : !c.meses_validade);
    const matches = porValidade.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (matches.length === 0) {
        container.innerHTML = q.length < 2
            ? '<div class="db-list-empty">Nenhum treinamento cadastrado ainda</div>'
            : `<div class="db-list-empty">Nenhum treinamento encontrado para "${escapeHTML(query)}"</div>`;
        return;
    }
    container.innerHTML = matches.map(c => `
        <div class="db-list-item" style="cursor:pointer;" onclick="abrirFormCatalogoTreinamento('${escapeHTML(c.id)}')">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div class="db-list-item-title">${c.meses_validade ? '🔄 ' : ''}${escapeHTML(c.nome || '')}</div>
                <div style="flex-shrink:0;">
                    ${(c.objetivo && c.conteudo_programatico) 
                        ? '<span style="font-size:10px; background:rgba(16,185,129,0.12); color:#059669; padding:2px 7px; border-radius:10px; font-weight:600;">📋 FOR.001 OK</span>'
                        : '<span style="font-size:10px; background:rgba(239,68,68,0.12); color:#dc2626; padding:2px 7px; border-radius:10px; font-weight:600;">⚠️ Sem Conteúdo</span>'
                    }
                </div>
            </div>
            <div class="db-list-item-sub">Código ${escapeHTML(c.id)} — ${c.carga_horaria || 0}h — ${c.meses_validade ? c.meses_validade + ' meses de validade' : 'Sem validade (avulso)'}</div>
        </div>`).join('');
}

// Banco de Questões (Prova) - editor de linha dinâmica, mesmo padrão de
// renderRiscosAprForm/renderRiscosGheForm (adicionar/remover linha, texto escreve
// direto no array sem re-render, só mudanças estruturais re-renderizam). Só
// treinamentos com pelo menos 1 questão salva ganham os botões de prova/gabarito em
// Registro (gerarProvaTurma/gerarGabaritoProva) - sem banco cadastrado, sem prova
// fabricada.
let catFormQuestoes = [];

function questaoVazia() {
    return { pergunta: '', alternativas: ['', '', '', ''], correta: 0 };
}

function adicionarQuestaoCatalogoForm() {
    catFormQuestoes.push(questaoVazia());
    renderQuestoesCatalogoForm();
}

function removerQuestaoCatalogoForm(i) {
    catFormQuestoes.splice(i, 1);
    renderQuestoesCatalogoForm();
}

function renderQuestoesCatalogoForm() {
    const container = document.getElementById('catFormQuestoesLista');
    if (!container) return;
    const campoEstilo = 'padding:6px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; width:100%; box-sizing:border-box;';
    if (catFormQuestoes.length === 0) {
        container.innerHTML = '<div class="db-list-empty">Nenhuma questão cadastrada - clique em "➕ Adicionar Questão".</div>';
        return;
    }
    const letras = ['A', 'B', 'C', 'D'];
    container.innerHTML = catFormQuestoes.map((q, i) => `
        <div style="border:1px solid var(--border); border-radius:10px; padding:10px; margin-bottom:10px; background:var(--bg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <b style="font-size:12px;">Questão ${i + 1}</b>
                <button onclick="removerQuestaoCatalogoForm(${i})" title="Remover" style="border:none; background:none; color:var(--danger); cursor:pointer; font-size:15px;">🗑️</button>
            </div>
            <input type="text" placeholder="Pergunta" value="${escapeHTML(q.pergunta)}" oninput="catFormQuestoes[${i}].pergunta=this.value" style="${campoEstilo} margin-bottom:6px;">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:6px;">
                ${letras.map((letra, alt) => `
                    <div style="display:flex; align-items:center; gap:6px;">
                        <input type="radio" name="catFormQuestaoCorreta-${i}" ${q.correta === alt ? 'checked' : ''} onchange="catFormQuestoes[${i}].correta=${alt}" style="flex-shrink:0;">
                        <input type="text" placeholder="Alternativa ${letra}" value="${escapeHTML(q.alternativas[alt])}" oninput="catFormQuestoes[${i}].alternativas[${alt}]=this.value" style="${campoEstilo}">
                    </div>`).join('')}
            </div>
            <div style="font-size:10.5px; color:var(--text-light); margin-top:4px;">Marque o rádio da alternativa correta.</div>
        </div>`).join('');
}

function obterProximoCodigoCatalogo() {
    if (!allTreinamentosCatalogo || allTreinamentosCatalogo.length === 0) return '1';
    let max = 0;
    allTreinamentosCatalogo.forEach(c => {
        const idStr = String(c.id || '').trim();
        const num = parseInt(idStr, 10);
        if (!isNaN(num) && num > max) {
            max = num;
        }
    });
    return String(max + 1);
}

function catFormPreencherProximoCodigo() {
    const codigoInput = document.getElementById('catForm_codigo');
    if (!codigoInput || codigoInput.readOnly) return;
    const prox = obterProximoCodigoCatalogo();
    codigoInput.value = prox;
    const hint = document.getElementById('catForm_codigoHint');
    if (hint) {
        hint.style.display = 'inline';
        hint.innerHTML = `⚡ Código sequencial: <strong>${prox}</strong> (último: ${prox > 1 ? prox - 1 : 1})`;
    }
}


/**
 * Motor Inteligente de Geração de Objetivo e Conteúdo Programático de SST
 * Especialmente desenvolvido para o Consórcio Operador do Ramal do Agreste (PISF)
 * Em estrita conformidade com as Normas Regulamentadoras (MTE), PCMSO, PGR/GRO (SGG) e ESG.
 */
function gerarDadosSstPorTema(nomeOriginal, codigo) {
    const n = (nomeOriginal || '').trim().toUpperCase();

    // 1. NR 06 - Equipamento de Proteção Individual (EPI)
    if (n.includes('NR 06') || n.includes('NR.06') || n.includes('EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL') || n.includes('INSPEÇÃO DE EPI') || n.includes('USO E CONSERVAÇÃO DOS EPI') || n.includes('USO OBRIGATÓRIO E HIGIENIZAÇÃO DE EPI')) {
        return {
            objetivo: 'Capacitar os colaboradores quanto à obrigatoriedade, seleção, guarda, conservação e higienização correta dos Equipamentos de Proteção Individual (EPI), em estrita conformidade com a NR-06.',
            conteudo_programatico: '1. Disposições gerais e requisitos legais da NR-06 para empregados e empregador;\n2. Responsabilidades do trabalhador na guarda, uso adequado e conservação do EPI;\n3. Critérios para substituição de EPIs danificados ou com Certificado de Aprovação (CA) vencido;\n4. Higienização periódica e acondicionamento correto dos equipamentos;\n5. Importância do uso contínuo de EPIs específicos para cada risco na frente de serviço.'
        };
    }

    // 2. NR 10 - Eletricidade / Fuga / Choque
    if (n.includes('NR 10') || n.includes('NR.10') || n.includes('ELETRICIDADE') || n.includes('CHOQUE ELÉTRICO') || n.includes('FUGA DE CORRENTE') || n.includes('HABILITADO E AUTORIZADO')) {
        return {
            objetivo: 'Instruir os colaboradores sobre os perigos da eletricidade nos canteiros e frentes de canal do Ramal do Agreste, prevenindo acidentes por choque elétrico, arcos voltaicos e curto-circuitos, em conformidade com a NR-10.',
            conteudo_programatico: '1. Conceitos básicos de eletricidade e riscos associados (choque elétrico, queimaduras e arcos);\n2. Medidas de proteção coletiva: desenergização, bloqueio, etiquetagem (LOTO) e aterramento;\n3. Diferença legal e operacional entre trabalhador qualificado, habilitado e autorizado;\n4. Condições e cuidados com quadros elétricos, cabos, extensões e ferramentas portáteis em campo;\n5. Procedimentos de emergência, desvencilhamento seguro e primeiros socorros em caso de choque.'
        };
    }

    // 3. NR 11 - Movimentação de Cargas / Munck / Transporte
    if (n.includes('NR 11') || n.includes('NR.11') || n.includes('MUNCK') || n.includes('MOVIMENTAÇÃO, ARMAZENAGEM E MANUSEIO')) {
        return {
            objetivo: 'Orientar o efetivo sobre as práticas seguras na operação de equipamentos de içamento, transporte e movimentação de cargas (caminhão munck e pontes rolantes), prevenindo tombamentos e quedas de materiais, conforme a NR-11.',
            conteudo_programatico: '1. Diretrizes da NR-11 para operação de equipamentos de transporte e movimentação de materiais;\n2. Inspeção prévia diária (checklist) de cabos de aço, cintas, manilhas e olhais de içamento;\n3. Isolamento, sinalização do raio de giro e proibição de circulação sob cargas suspensas;\n4. Comunicação padronizada entre operador e sinaleiro/amarrador de cargas;\n5. Cuidados no patolamento em solos irregulares e condições meteorológicas adversas.'
        };
    }

    // 4. NR 12 - Máquinas e Equipamentos / Motosserra
    if (n.includes('NR 12') || n.includes('NR.12') || n.includes('MÁQUINAS E EQUIPAMENTOS') || n.includes('MOTOSSERRA') || n.includes('IT.OPE - MOTOSSERRA') || n.includes('ROTATIVAS')) {
        if (n.includes('MOTOSSERRA')) {
            return {
                objetivo: 'Qualificar e autorizar os operadores para a utilização segura e eficiente da motosserra na supressão vegetal do Ramal do Agreste, prevenindo acidentes graves por corte e rebote, conforme a NR-12 (Anexo V).',
                conteudo_programatico: '1. Requisitos legais e dispositivos de segurança obrigatórios na motosserra (NR-12 Anexo V);\n2. Técnicas de corte seguro: desgalhamento, traçamento, corte direcional e prevenção do efeito rebote;\n3. Uso obrigatório de EPIs específicos: calça anticorte, protetor facial, auditivo e luvas;\n4. Manutenção preventiva diária: afiação da corrente, lubrificação, freio e trava do acelerador;\n5. Isolamento de área de corte, comunicação com a equipe e procedimentos de emergência.'
            };
        }
        return {
            objetivo: 'Capacitar os colaboradores na identificação de perigos e operação segura de máquinas e equipamentos, compreendendo os sistemas de proteção e paradas de emergência, conforme a NR-12.',
            conteudo_programatico: '1. Princípios fundamentais da NR-12 e zonas de perigo em partes móveis e rotativas;\n2. Tipos de proteções mecânicas: fixas, móveis e dispositivos de intertravamento de segurança;\n3. Procedimentos de partida, parada emergencial e inspeção visual diária antes da operação;\n4. Bloqueio de energia perigosa durante manutenções, limpeza e desobstruções;\n5. Proibição de remoção ou burla de dispositivos de segurança e reporte imediato de avarias.'
        };
    }

    // 5. NR 17 - Ergonomia / Levantamento de Peso / DORT
    if (n.includes('NR 17') || n.includes('NR.17') || n.includes('ERGONOMIA') || n.includes('LEVANTAMENTO DE PESO') || n.includes('DORT') || n.includes('TRANSPORTE MANUAL DE CARGA')) {
        return {
            objetivo: 'Instruir os colaboradores sobre a aplicação prática da ergonomia no trabalho e prevenção de lesões na coluna e distúrbios osteomusculares (LER/DORT), de acordo com a NR-17.',
            conteudo_programatico: '1. Fundamentos da NR-17 e conceitos de ergonomia física aplicada ao canteiro e frentes de obra;\n2. Biomecânica da coluna vertebral: postura correta e elevação com uso da musculatura das pernas;\n3. Limites de carga para transporte manual e emprego de técnicas de trabalho em equipe/dupla;\n4. Reconhecimento precoce dos sintomas de DORT e importância de pausas para recuperação muscular;\n5. Organização do posto de trabalho e eliminação de esforços desnecessários.'
        };
    }

    // 6. NR 20 - Líquidos Combustíveis e Inflamáveis
    if (n.includes('NR 20') || n.includes('NR.20') || n.includes('INFLAMÁVEIS') || n.includes('COMBUSTIVEL')) {
        return {
            objetivo: 'Instruir sobre os riscos no manuseio, transporte e armazenamento de combustíveis e líquidos inflamáveis nas frentes de canal e canteiros, prevenindo incêndios e explosões, conforme a NR-20.',
            conteudo_programatico: '1. Características físico-químicas dos líquidos inflamáveis e ponto de fulgor (NR-20);\n2. Procedimentos seguros no abastecimento de veículos, máquinas e geradores no campo;\n3. Aterramento elétrico, dissipação de eletricidade estática e controle de fontes de ignição;\n4. Armazenamento correto em bacias de contenção e uso obrigatório de kits de mitigação;\n5. Procedimentos de resposta rápida a vazamentos e princípios de combate a fogo classe B.'
        };
    }

    // 7. NR 21 - Trabalho a Céu Aberto / Calor / Hidratação / Protetor Solar / Dias Chuvosos
    if (n.includes('NR 21') || n.includes('NR.21') || n.includes('CÉU ABERTO') || n.includes('HIDRATAÇÃO') || n.includes('PROTETOR SOLAR') || n.includes('CHUVOSOS')) {
        if (n.includes('CHUVOSOS')) {
            return {
                objetivo: 'Orientar as equipes operacionais sobre os cuidados adicionais e medidas de segurança específicas para a execução de serviços em dias chuvosos ou sob solo encharcado no Ramal do Agreste.',
                conteudo_programatico: '1. Riscos agravados pelas chuvas: escorregamento de taludes, atolamento de veículos e piso escorregadio;\n2. Cuidados com redes e equipamentos elétricos expostos à umidade e risco de choque;\n3. Redução de velocidade nas vias de acesso e atenção especial à visibilidade reduzida;\n4. Suspensão imediata de trabalhos a céu aberto durante tempestades com descargas atmosféricas (raios);\n5. Inspeção do estado de drenagem, estabilidade de valas e condições de circulação.'
            };
        }
        return {
            objetivo: 'Orientar os trabalhadores sobre as medidas preventivas para o trabalho a céu aberto sob radiação solar e clima semiárido, prevenindo desidratação, insolação e câncer de pele, em conformidade com a NR-21.',
            conteudo_programatico: '1. Requisitos da NR-21 para atividades a céu aberto e condições climáticas do semiárido (Ramal do Agreste);\n2. Importância da hidratação contínua e disponibilidade de água potável fresca nas frentes de serviço;\n3. Proteção contra radiação UV: aplicação regular do protetor solar, uso de touca árabe e óculos escuros;\n4. Sinais e sintomas de exaustão térmica, câimbras de calor e insolação;\n5. Uso de abrigos para pausas e medidas imediatas de primeiros socorros em caso de mal-estar térmico.'
        };
    }

    // 8. NR 23 / Prevenção de Incêndio / Extintores / Simulação / PAE
    if (n.includes('NR 23') || n.includes('NR.23') || n.includes('INCÊNDIO') || n.includes('EXTINTOR') || n.includes('BRIGADA DE EMEGÊNCIA') || n.includes('SIMULAÇÃO') || n.includes('PAE') || n.includes('PLANO DE ATENDIMENTO E EMERGÊNCIA') || n.includes('PLANO DE ATENDIMENTO A EMERGÊNCIA')) {
        return {
            objetivo: 'Capacitar o efetivo sobre as medidas preventivas contra princípios de incêndio, identificação correta das classes de fogo, operação prática dos extintores portáteis e rotas de fuga do PAE, conforme a NR-23.',
            conteudo_programatico: '1. Teoria do fogo: triângulo/tetraedro do fogo e métodos de extinção (abafamento, resfriamento e isolamento);\n2. Classes de incêndio (A, B, C e D) e seleção do agente extintor correto (Água, Pó Químico e CO2);\n3. Procedimento de inspeção periódica de extintores (manômetro, lacre, bico e data de recarga);\n4. Técnica correta de manuseio e descarga do extintor direcionada à base das chamas;\n5. Rotas de fuga, evacuação ordenada para o Ponto de Encontro e acionamento do PAE (Plano de Atendimento a Emergência).'
        };
    }

    // 9. NR 35 - Trabalho em Altura / Segurança em Altura / Queda
    if (n.includes('NR 35') || n.includes('NR.35') || n.includes('ALTURA') || n.includes('QUEDA DO MESMO NÍVEL')) {
        if (n.includes('QUEDA DO MESMO NÍVEL')) {
            return {
                objetivo: 'Conscientizar os trabalhadores sobre os riscos de tropeços, escorregões e quedas em mesmo nível no canteiro e frentes do canal, fortalecendo a ordem e limpeza nas passagens operacionais.',
                conteudo_programatico: '1. Caracterização das quedas de mesmo nível e principais fatores causadores na construção civil;\n2. Organização e limpeza (Housekeeping): piso desobstruído de fios, ferros, pedras e sobras de material;\n3. Cuidados ao caminhar em solos irregulares, úmidos ou com declive nas margens do canal;\n4. Uso do calçado de segurança apropriado com solado antiderrapante em bom estado;\n5. Reporte imediato de irregularidades de piso e cultura de atenção ao caminhar.'
            };
        }
        return {
            objetivo: 'Capacitar os colaboradores que executam atividades em altura acima de 2,00 metros, instruindo sobre ancoragem, uso do cinto tipo paraquedista e medidas de prevenção contra quedas, conforme a NR-35.',
            conteudo_programatico: '1. Conceitos, campo de aplicação e requisitos normativos da NR-35;\n2. Análise de Risco (APR) e emissão obrigatória da Permissão de Trabalho (PT) para altura;\n3. Sistemas de Proteção Coletiva (SPCQ) e Sistemas de Proteção Individual Contra Quedas (SPIQ);\n4. Inspeção prévia do cinto de segurança tipo paraquedista, talabartes com absorvedor e trava-quedas;\n5. Pontos de ancoragem certificados, condutas em situações de emergência e resgate em altura.'
        };
    }

    // 10. Checklist / Inspeções Diárias de Equipamentos e Ferramentas
    if (n.includes('CHECKLIST') || n.includes('INSPEÇÃO DE FERRAMENTAS') || n.includes('ORGANIZAÇÃO DAS FERRAMENTAS')) {
        return {
            objetivo: 'Capacitar operadores e colaboradores na realização do checklist diário pré-uso de veículos, máquinas e ferramentas, garantindo a pronta detecção de falhas mecânicas e a interdição preventiva de itens defeituosos.',
            conteudo_programatico: '1. Importância operacional e jurídica da inspeção diária (checklist pré-uso) antes do início das atividades;\n2. Verificação de itens críticos de segurança: freios, pneus, luzes, vazamentos, dispositivos de proteção e buzina;\n3. Preenchimento fidedigno da lista de checagem e identificação clara de não conformidades impeditivas;\n4. Fluxo de bloqueio, etiquetagem e comunicação imediata à manutenção mecânica e ao SESMT;\n5. Guarda organizada das ferramentas de trabalho em local limpo e apropriado após a conclusão das tarefas.'
        };
    }

    // 11. Proteção Respiratória / PPR / Máscara PFF2
    if (n.includes('PPR') || n.includes('RESPIRATÓRIA') || n.includes('PFF2') || n.includes('MÁSCARA') || n.includes('DESCARTE DE MÁSCARAS')) {
        return {
            objetivo: 'Instruir os colaboradores sobre a proteção das vias aéreas contra poeiras minerais, fumos e aerodispersoides gerados nas obras do canal, conforme o Programa de Proteção Respiratória (PPR).',
            conteudo_programatico: '1. Riscos respiratórios nas obras civis: poeiras minerais (sílica), fumos metálicos e névoas;\n2. Tipos de respiradores: peças semifaciais filtrantes (PFF2/PFF3) e filtros químicos;\n3. Ajuste facial, teste de pressão positiva/negativa e importância da vedação no rosto (vedação sem barba);\n4. Cuidados de higienização, guarda em local seco e critérios de descarte da máscara após saturação;\n5. Cumprimento das diretrizes do PPR e prevenção de pneumoconioses e silicose.'
        };
    }

    // 12. Proteção Auditiva / PCA / Audição
    if (n.includes('PCA') || n.includes('AUDITIV') || n.includes('AUDIÇÃO')) {
        return {
            objetivo: 'Orientar sobre a importância da preservação da saúde auditiva e uso correto dos protetores auriculares contra ruídos de maquinários pesados, conforme o Programa de Conservação Auditiva (PCA).',
            conteudo_programatico: '1. Efeitos da exposição contínua a níveis elevados de ruído e conceito de PAIR (Perda Auditiva);\n2. Tipos de protetores auditivos: plugue de inserção (silicone/espuma) e tipo concha;\n3. Técnica correta de colocação para atingir o Nível de Redução de Ruído (NRR/NRRsf);\n4. Higienização periódica com água e sabão neutro e acondicionamento na caixinha de guarda;\n5. Realização dos exames audiométricos periódicos previstos no PCMSO (NR-07).'
        };
    }

    // 13. Proteção das Mãos e Dedos / Ferramentas Manuais / Corte e Perfuração
    if (n.includes('MÃOS') || n.includes('PRENSAMENTO') || n.includes('FERRAMENTAS MANUAIS') || n.includes('CORTE E PERFURAÇÃO') || n.includes('MODIFICADAS')) {
        return {
            objetivo: 'Sensibilizar o efetivo operacional sobre os riscos de prensamento, corte e esmagamento nas mãos e dedos, reforçando o uso seguro de ferramentas e luvas adequadas.',
            conteudo_programatico: '1. Importância das mãos no trabalho e anatomia vulnerável a acidentes mecânicos;\n2. Identificação das zonas de prensamento (pinch points) em máquinas, formas e içamentos;\n3. Proibição absoluta do uso de ferramentas manuais improvisadas, trincadas ou com rebarbas;\n4. Escolha da luva de segurança apropriada para cada atividade (vaqueta, mista, corte ou nitrílica);\n5. Posicionamento seguro das mãos antes de iniciar o aperto, movimentação ou batimento.'
        };
    }

    // 14. Proteção dos Pés / Calçados / Perneira de Segurança
    if (n.includes('PERNEIRA') || n.includes('PROTEÇÃO DOS PÉS') || n.includes('CALÇADO DE SEGURANÇA')) {
        return {
            objetivo: 'Reforçar o uso obrigatório e correto da perneira de segurança e do calçado com biqueira, protegendo membros inferiores contra picadas de animais peçonhentos e impactos mecânicos.',
            conteudo_programatico: '1. Riscos de acidentes típicos da Caatinga e frentes de canal: animais peçonhentos, galhos e pedras;\n2. Características técnicas e áreas de proteção cobertas pela perneira de segurança;\n3. Ajuste correto sobre o calçado de trabalho sem folgas que permitam a entrada de detritos;\n4. Inspeção diária do estado de conservação do fecho, costuras e lâmina de proteção da perneira;\n5. Importância da botina com biqueira e solado adequado para solo irregular.'
        };
    }

    // 15. Cabeça e Olhos / Capacete / Óculos / Jugular / Adornos
    if (n.includes('CAPACETE') || n.includes('JUGULAR') || n.includes('ÓCULOS') || n.includes('SAÚDE OCULAR') || n.includes('ADORNOS')) {
        if (n.includes('ADORNOS')) {
            return {
                objetivo: 'Instruir sobre a proibição do uso de anéis, alianças, pulseiras, cordões e relógios nas frentes de obra, prevenindo acidentes graves por engate e arrancamento mecânico.',
                conteudo_programatico: '1. Mecanismos de acidentes envolvendo adornos: enroscamento em ferragens e partes móveis de máquinas;\n2. Efeito alavanca e risco de amputação traumática ou desluvamento dos dedos;\n3. Riscos de condução elétrica aumentada ao portar objetos metálicos próximos a circuitos;\n4. Regras do Consórcio e responsabilidade individual na retirada de adornos antes do turno;\n5. Fiscalização mútua e cultura preventiva entre os colegas de trabalho.'
            };
        }
        return {
            objetivo: 'Instruir sobre a proteção da cabeça e dos olhos nas frentes de obra, assegurando o uso contínuo de capacete com jugular ajustada e óculos de proteção adequados.',
            conteudo_programatico: '1. Riscos de projeção de partículas volantes, poeira e impactos de objetos na cabeça e olhos;\n2. Ajuste correto da carneira do capacete e posicionamento da fita jugular sob o queixo;\n3. Conservação dos óculos de segurança: limpeza com pano macio e substituição de lentes riscadas;\n4. Uso do modelo correto de óculos: fumê/escuro para trabalho ao sol e incolor para ambientes cobertos;\n5. Condutas imediatas de primeiros socorros em caso de corpo estranho nos olhos (lavagem contínua).'
        };
    }

    // 16. Animais Peçonhentos / Ofídicos / Abelhas
    if (n.includes('ANIMAIS PEÇONHENTOS') || n.includes('OFÍDICOS') || n.includes('ABELHAS') || n.includes('PICADA')) {
        return {
            objetivo: 'Orientar o efetivo sobre prevenção de acidentes com serpentes, escorpiões, aranhas e abelhas nas obras do Ramal do Agreste, e fluxos de atendimento de emergência médica.',
            conteudo_programatico: '1. Identificação dos animais peçonhentos comuns no bioma Caatinga (cobras, escorpiões e abelhas);\n2. Medidas preventivas no campo: inspeção prévia de ferramentas, tubos, pedras e uso obrigatório de perneiras;\n3. Como agir ao avistar animais peçonhentos: não tocar, manter distância e acionar a equipe de Meio Ambiente;\n4. Primeiros socorros em caso de picada: repouso, hidratação e proibição de torniquetes ou sucção;\n5. Fluxo de comunicação imediata ao SESMT e remoção rápida ao polo de saúde com soro antiofídico.'
        };
    }

    // 17. Meio Ambiente / Produtos Químicos / FISPQ / Coleta Seletiva / Copo Descartável / Gelo / Água
    if (n.includes('PRODUTO QUÍMICO') || n.includes('FISPQ') || n.includes('KIT DE MITIGAÇÃO') || n.includes('MEIO AMBIENTE') || n.includes('COLETA SELETIVA') || n.includes('ÁGUA') || n.includes('SUSTENTABILIDADE') || n.includes('DESCARTE') || n.includes('GELO') || n.includes('VEICULAÇÃO HIDRICA')) {
        if (n.includes('GELO') || n.includes('VEICULAÇÃO HIDRICA')) {
            return {
                objetivo: 'Orientar os colaboradores sobre as boas práticas higiênico-sanitárias no manuseio, transporte e armazenamento de água potável e gelo, prevenindo contaminações e doenças gastrointestinais.',
                conteudo_programatico: '1. Conceito de doenças de veiculação hídrica e principais riscos de contaminação bacteriana;\n2. Higienização rigorosa dos garrafões térmicos individuais e das caixas de gelo coletivas;\n3. Proibição do contato manual direto com o gelo: uso obrigatório de conchas limpas e exclusivas;\n4. Armazenamento do gelo em recipientes vedados, suspensos do chão e ao abrigo do sol;\n5. Cuidados no abastecimento exclusivo com água tratada e potável fornecida pelo Consórcio.'
            };
        }
        return {
            objetivo: 'Capacitar os colaboradores na gestão de produtos químicos, segregação correta de resíduos e proteção dos recursos ambientais do Ramal do Agreste, alinhado aos compromissos ESG.',
            conteudo_programatico: '1. Interpretação da FISPQ (Ficha de Informação de Segurança para Produtos Químicos) e rotulagem GHS;\n2. Procedimentos para contenção de vazamentos com uso rápido do kit de mitigação (mantas e cordões absorventes);\n3. Segregação e destinação de resíduos nas lixeiras coloridas da coleta seletiva (plástico, metal, papel e orgânico);\n4. Uso racional da água potável e redução do desperdício de copos plásticos descartáveis;\n5. Preservação da fauna e flora local e atendimento aos condicionantes ambientais do projeto.'
        };
    }

    // 18. APR / PTS / Percepção de Risco / Análise de Segurança / Regra dos 2 Minutos / Condições Inseguras
    if (n.includes('APR') || n.includes('PTE') || n.includes('PERCEPÇÃO DE RISCO') || n.includes('ANÁLISE DE SEGURANÇA') || n.includes('REGRA DOS 02 MINUTOS') || n.includes('PLANEJAR ANTES') || n.includes('CONDIÇÕES INSEGURAS') || n.includes('PRESSA') || n.includes('EXCESSO DE CONFIANÇA') || n.includes('FATORES QUE CONDUZEM')) {
        return {
            objetivo: 'Capacitar os colaboradores no reconhecimento prévio de perigos, preenchimento participativo da APR e aplicação da Regra dos 2 Minutos antes do início de qualquer tarefa no trecho.',
            conteudo_programatico: '1. Diferença entre perigo (fonte de dano) e risco (probabilidade x severidade) na construção pesada;\n2. Aplicação prática da Regra dos 02 Minutos: parar, observar ao redor, avaliar riscos e agir com segurança;\n3. Elaboração, leitura e assinatura da APR (Análise Preliminar de Risco) em equipe na frente de serviço;\n4. Identificação e eliminação de condições inseguras e armadilhas cognitivas causadas pela pressa ou excesso de confiança;\n5. Direito de recusa e paralisação da atividade ao identificar desvios críticos sem proteção.'
        };
    }

    // 19. Trânsito / Direção Defensiva / Ônibus / Veículos Particulares / Maio Amarelo
    if (n.includes('DIREÇÃO DEFENSIVA') || n.includes('TRANSITO') || n.includes('ÔNIBUS') || n.includes('VEÍCULOS PARTICULARES') || n.includes('VELOCIDADE') || n.includes('MAIO AMARELO')) {
        return {
            objetivo: 'Instruir motoristas e passageiros sobre as regras de trânsito seguro nas vias de acesso e canteiros da obra, respeitando os limites de velocidade e prevenindo colisões e atropelamentos.',
            conteudo_programatico: '1. Princípios da Direção Defensiva aplicados a frentes de obra: atenção concentrada e distância de segurança;\n2. Limites de velocidade internos da obra (30 km/h) e cuidados nas curvas com poeira ou lama;\n3. Proibição do uso de celular ao volante e exigência do cinto de segurança para todos os ocupantes;\n4. Normas para embarque e desembarque seguro dos ônibus e proibição de veículos particulares nos acessos;\n5. Cuidados no cruzamento de pistas e preferência para máquinas pesadas em manobra.'
        };
    }

    // 20. Primeiros Socorros / Manobra de Heimlich / Fluxo de Ocorrência de Acidentes
    if (n.includes('PRIMEIROS SOCORROS') || n.includes('HEIMLICH') || n.includes('FLUXO DE COMUNICAÇÃO DE OCORRÊNCIA') || n.includes('COMUNICAÇÃO DE ACIDENTE')) {
        return {
            objetivo: 'Capacitar o efetivo em noções elementares de primeiros socorros e desobstrução de vias aéreas (Heimlich), fixando o fluxo de acionamento rápido e correto do SESMT em emergências.',
            conteudo_programatico: '1. Princípios gerais de primeiros socorros: manter a calma, sinalizar o local e não agravar as lesões;\n2. Avaliação primária da vítima e verificação de sinais vitais (consciência e respiração);\n3. Aplicação prática da Manobra de Heimlich em casos de engasgo e asfixia por corpo estranho;\n4. Cuidados essenciais: controle de hemorragias com compressão direta e proibição de movimentar vítimas de queda;\n5. Fluxo de acionamento imediato da ambulância do Consórcio, rádio de emergência e informe ao SESMT.'
        };
    }

    // 21. Campanhas de Saúde / PCMSO (Janeiro Branco, Doação de Sangue, Hipertensão, Diabetes, Câncer, Tabaco, Alcoolismo, DST)
    if (n.includes('JANEIRO BRANCO') || n.includes('SAÚDE MENTAL') || n.includes('ESTRESSE') || n.includes('HIPERTENSÃO') || n.includes('DIABETES') || n.includes('TABACO') || n.includes('ÁLCOOL') || n.includes('DROGAS') || n.includes('SEXUALMENTE TRANSMISSÍVEIS') || n.includes('AIDS') || n.includes('HEPATITES') || n.includes('TUBERCULOSE') || n.includes('CÂNCER') || n.includes('RIM') || n.includes('CEFALEIA') || n.includes('MENINGITE') || n.includes('ATESTADO') || n.includes('JUNHO VERMELHO') || n.includes('DOAÇÃO DE SANGUE')) {
        if (n.includes('JUNHO VERMELHO') || n.includes('DOAÇÃO DE SANGUE')) {
            return {
                objetivo: 'Conscientizar os colaboradores sobre a nobreza e importância social da doação voluntária de sangue, esclarecendo critérios de triagem, benefícios e salvamento de vidas.',
                conteudo_programatico: '1. A campanha Junho Vermelho e o papel solidário do trabalhador na manutenção dos estoques de sangue;\n2. Quem pode doar: requisitos básicos de idade, peso, repouso prévio e intervalo entre doações;\n3. Mitos e verdades sobre o processo de doação de sangue e segurança do procedimento;\n4. Legislação trabalhista: dispensa justificada de 1 dia de trabalho a cada 12 meses para doação voluntária (CLT);\n5. Fortalecimento da cidadania e compromisso humanitário entre os colaboradores do Consórcio.'
            };
        }
        if (n.includes('ATESTADO')) {
            return {
                objetivo: 'Esclarecer aos colaboradores as regras, prazos e procedimentos internos para a entrega e validação de atestados médicos no Consórcio, garantindo o acompanhamento pela Medicina do Trabalho.',
                conteudo_programatico: '1. Requisitos legais do atestado médico: identificação do médico (CRM), período de afastamento e dados do paciente;\n2. Prazos regimentais para entrega do documento ao departamento de Recursos Humanos e ao ambulatório do SESMT;\n3. Importância do comparecimento ao médico do trabalho para validação e avaliação clínica de retorno ao trabalho;\n4. Distinção entre afastamentos previdenciários (acidentários ou doença comum) e acompanhamento pelo PCMSO;\n5. Direitos e deveres do colaborador no zelo pela sua recuperação física e transparência com a empresa.'
            };
        }
        return {
            objetivo: 'Promover a saúde integral, o bem-estar biopsicossocial e a prevenção de doenças ocupacionais e crônicas entre os trabalhadores, conforme as diretrizes do PCMSO (NR-07).',
            conteudo_programatico: '1. Relevância da campanha de saúde no contexto ocupacional e familiar do trabalhador;\n2. Principais causas, sintomas de alerta e fatores de risco associados à doença/condição;\n3. Hábitos de vida saudáveis: alimentação balanceada, prática de atividade física e qualidade do sono;\n4. Acompanhamento médico periódico no ambulatório do Consórcio e exames clínicos de rotina;\n5. Quebra de tabus, busca de apoio profissional no SESMT e solidariedade no ambiente de trabalho.'
        };
    }

    // 22. Riscos Específicos: Bueiros, Taludes, Roço, Áreas Restritas, Isolamento, Sinalização
    if (n.includes('BUEIROS') || n.includes('TALUDES') || n.includes('ROÇO') || n.includes('ÁREAS RESTRISTAS') || n.includes('ISOLAMENTO DE ÁREA') || n.includes('SINALIZAÇÃO') || n.includes('DISTÂNCIA SEGURA')) {
        return {
            objetivo: 'Capacitar as equipes operacionais para a execução segura de serviços em áreas de risco específico (taludes, bueiros e faixas de domínio), respeitando a sinalização e o isolamento físico.',
            conteudo_programatico: '1. Avaliação prévia do terreno e estabilidade do solo antes de intervir em taludes e valas;\n2. Procedimentos seguros para limpeza de bueiros e prevenção de soterramentos ou quedas de pedras;\n3. Riscos na atividade de roço manual/mecanizado e distância de segurança entre trabalhadores (mínimo 10m);\n4. Padrões de isolamento de área com telas, cones e fitas zebradas para serviços críticos;\n5. Respeito irrestrito às placas de advertência e restrição de acesso a pessoas não autorizadas.'
        };
    }

    // 23. Comportamento / Liderança / Comunicação / Cultura Justa / Diversidade / Mulher / Armas
    if (n.includes('LIDER') || n.includes('COMUNICAÇÃO') || n.includes('TRABALHO EM EQUIPE') || n.includes('COMPORTAMENTO SEGURO') || n.includes('GUARDIÃO') || n.includes('DIVERSIDADE') || n.includes('MULHER') || n.includes('DISCRIMINAÇÃO') || n.includes('CÓDIGO DE CONDUTA') || n.includes('BRINCADEIRAS') || n.includes('ARMA') || n.includes('TRATAMENTO CORDIAL') || n.includes('RESPEITO AOS COLEGAS') || n.includes('RESPEITO A COMUNIDADE') || n.includes('MOTIVACAO')) {
        if (n.includes('ARMA')) {
            return {
                objetivo: 'Reiterar a política de tolerância zero quanto ao porte de armas de qualquer natureza (branca ou de fogo) nos canteiros, alojamentos e veículos do Consórcio, garantindo um ambiente pacífico e seguro.',
                conteudo_programatico: '1. Política interna de segurança e proibição absoluta do porte de facas, canivetes, facões ou armas de fogo no canteiro;\n2. Diferenciação legal entre ferramentas de trabalho disponibilizadas pela empresa e armas de uso pessoal proibidas;\n3. Consequências jurídicas e administrativas decorrentes da violação desta diretriz (demissão por justa causa);\n4. Preservação da integridade física e convivência harmônica entre todos os trabalhadores e frentes de serviço;\n5. Canais confidenciais de comunicação e denúncia gerencial do Consórcio.'
            };
        }
        return {
            objetivo: 'Desenvolver a cultura de segurança participativa, liderança humanizada, respeito mútuo e comunicação assertiva entre todos os colaboradores do Ramal do Agreste.',
            conteudo_programatico: '1. Princípios do comportamento seguro e papel da liderança na construção de um clima organizacional positivo;\n2. Comunicação clara e sincronizada para evitar mal-entendidos durante as frentes de trabalho;\n3. Respeito à diversidade, combate a qualquer tipo de assédio, preconceito ou brincadeiras inadequadas;\n4. Conceito do "Guardião da Vida": o compromisso de orientar o companheiro exposto a perigo;\n5. Fortalecimento da integridade ética e cumprimento integral do Código de Conduta do Consórcio.'
        };
    }

    // 24. Higiene Pessoal / Higienização de Materiais
    if (n.includes('HIGIENE') || n.includes('HIGIENIZAÇÃO')) {
        return {
            objetivo: 'Orientar os colaboradores sobre os padrões de higiene pessoal e limpeza de ferramentas e áreas de convivência no canteiro, prevenindo doenças e promovendo o bem-estar coletivo.',
            conteudo_programatico: '1. Importância da higiene pessoal na prevenção de infecções bacterianas, fúngicas e parasitárias;\n2. Lavagem correta e frequente das mãos antes das refeições e após o uso de sanitários;\n3. Manutenção e asseio dos refeitórios, alojamentos e sanitários químicos distribuídos no trecho;\n4. Limpeza periódica dos uniformes de trabalho e higienização correta dos EPIs;\n5. Cuidados no acondicionamento de alimentos e proibição de consumo de itens perecíveis sem refrigeração.'
        };
    }

    // 25. Fallback Inteligente SST
    const temaLimpo = nomeOriginal.replace(/NR[\.\s]*\d+\s*[-–]?\s*/gi, '').trim();
    return {
        objetivo: `Capacitar os colaboradores sobre os princípios e diretrizes de ${temaLimpo}, assegurando a prevenção de acidentes, o cumprimento das normas de segurança do Consórcio e o fortalecimento do comportamento preventivo no Ramal do Agreste.`,
        conteudo_programatico: `1. Conceito, fundamentos e importância de ${temaLimpo} na rotina da construção civil pesada;\n2. Identificação de perigos, riscos e condições inseguras associadas à atividade;\n3. Medidas preventivas recomendadas, boas práticas operacionais e uso adequado dos EPIs necessários;\n4. Cumprimento dos procedimentos operacionais padrão, diretrizes da APR e normas internas do Consórcio;\n5. Ações imediatas em situações anormais, comunicação ao SESMT e incentivo à cultura de cuidado ativo.`
    };
}

/**
 * Acionamento do assistente inteligente no formulário do Catálogo
 */
function catFormGerarIaObjetivoEConteudo() {
    const nomeInput = document.getElementById('catForm_nome');
    const codigoInput = document.getElementById('catForm_codigo');
    const nome = (nomeInput?.value || '').trim();
    if (!nome) {
        alert('⚠️ Digite primeiro o Nome do Treinamento para que a inteligência possa gerar o objetivo e conteúdo adequados.');
        nomeInput?.focus();
        return;
    }
    const codigo = codigoInput?.value || '';
    const res = gerarDadosSstPorTema(nome, codigo);
    
    const objEl = document.getElementById('catForm_objetivo');
    const contEl = document.getElementById('catForm_conteudoProgramatico');
    const chEl = document.getElementById('catForm_cargaHoraria');
    
    if (objEl) objEl.value = res.objetivo;
    if (contEl) contEl.value = res.conteudo_programatico;
    if (chEl && !chEl.value) chEl.value = '2';

    // Destaque visual suave nos campos preenchidos
    [objEl, contEl].forEach(el => {
        if (!el) return;
        el.style.transition = 'all 0.3s ease';
        el.style.borderColor = '#6366f1';
        el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
        setTimeout(() => {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }, 1800);
    });

    const statusEl = document.getElementById('catalogoFormStatus');
    if (statusEl) {
        statusEl.innerHTML = '✨ <strong>Objetivo e Conteúdo Programático gerados com sucesso</strong> com base nas NRs e diretrizes de SST!';
        statusEl.style.color = 'var(--primary)';
        setTimeout(() => { if (statusEl.textContent.includes('gerados com sucesso')) statusEl.textContent = ''; }, 4000);
    }
}

function abrirFormCatalogoTreinamento(codigo) {
    const form = document.getElementById('catalogoFormCard');
    const title = document.getElementById('catalogoFormTitle');
    const codigoInput = document.getElementById('catForm_codigo');
    const btnExcluir = document.getElementById('catForm_btnExcluir');
    const hint = document.getElementById('catForm_codigoHint');
    document.getElementById('catalogoFormStatus').textContent = '';
    document.getElementById('catForm_mesclarPanel').style.display = 'none';

    if (codigo) {
        const c = allTreinamentosCatalogo.find(x => x.id === codigo);
        if (!c) return;
        title.textContent = '✏️ Editar Treinamento';
        codigoInput.value = c.id || '';
        codigoInput.readOnly = true;
        codigoInput.style.background = 'var(--bg)';
        if (hint) hint.style.display = 'none';
        document.getElementById('catForm_nome').value = c.nome || '';
        document.getElementById('catForm_cargaHoraria').value = c.carga_horaria != null ? c.carga_horaria : '';
        document.getElementById('catForm_mesesValidade').value = c.meses_validade != null ? c.meses_validade : '';
        document.getElementById('catForm_metodoAvaliacao').value = c.metodo_avaliacao || 'Entendimento Participante';
        document.getElementById('catForm_objetivo').value = c.objetivo || '';
        document.getElementById('catForm_conteudoProgramatico').value = c.conteudo_programatico || '';
        document.getElementById('catForm_certificadoBaseLegal').value = c.certificado_base_legal || '';
        document.getElementById('catForm_integracaoBaseLegal').value = c.integracao_base_legal || '';
        document.getElementById('catForm_recusaBaseLegal').value = c.recusa_base_legal || '';
        document.getElementById('catForm_obrigacoesEmpresa').value = c.integracao_obrigacoes_empresa || '';
        document.getElementById('catForm_obrigacoesEmpregado').value = c.integracao_obrigacoes_empregado || '';
        document.getElementById('catForm_programaIntegracao').value = c.integracao_programa || '';
        catFormQuestoes = Array.isArray(c.questoes) ? c.questoes.map(q => ({ ...q, alternativas: [...(q.alternativas || ['', '', '', ''])] })) : [];
        renderQuestoesCatalogoForm();
        btnExcluir.style.display = 'inline-block';
    } else {
        title.textContent = '🎓 Novo Treinamento';
        const prox = obterProximoCodigoCatalogo();
        codigoInput.value = prox;
        codigoInput.readOnly = false;
        codigoInput.style.background = '';
        if (hint) {
            hint.style.display = 'inline';
            hint.innerHTML = `⚡ Código sequencial gerado: <strong>${prox}</strong> (último: ${prox > 1 ? prox - 1 : 1})`;
        }
        document.getElementById('catForm_nome').value = '';
        document.getElementById('catForm_cargaHoraria').value = '';
        document.getElementById('catForm_mesesValidade').value = '';
        document.getElementById('catForm_metodoAvaliacao').value = 'Entendimento Participante';
        document.getElementById('catForm_objetivo').value = '';
        document.getElementById('catForm_conteudoProgramatico').value = '';
        document.getElementById('catForm_certificadoBaseLegal').value = '';
        document.getElementById('catForm_integracaoBaseLegal').value = '';
        document.getElementById('catForm_recusaBaseLegal').value = '';
        document.getElementById('catForm_obrigacoesEmpresa').value = '';
        document.getElementById('catForm_obrigacoesEmpregado').value = '';
        document.getElementById('catForm_programaIntegracao').value = '';
        catFormQuestoes = [];
        renderQuestoesCatalogoForm();
        btnExcluir.style.display = 'none';
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharFormCatalogoTreinamento() {
    document.getElementById('catalogoFormCard').style.display = 'none';
    document.getElementById('catForm_mesclarPanel').style.display = 'none';
}

function toggleExpandirCatalogo() {
    const el = document.getElementById('catalogoSearchResults');
    const btn = document.getElementById('btnExpandirCatalogo');
    const expandido = el.style.maxHeight === 'none';
    el.style.maxHeight = expandido ? '420px' : 'none';
    btn.textContent = expandido ? '⛶ Expandir Lista' : '⛶ Recolher Lista';
}

function limparBuscaCatalogo() {
    const input = document.getElementById('catalogoSearchInput');
    input.value = '';
    filterCatalogoTreinamentos('');
    input.focus();
}

// Exclusão (a pedido do usuário, após um caso real de código duplicado por erro de
// digitação: "79" e "128" com o mesmo conteúdo). Se o código nunca foi usado em nenhuma
// sessão, exclui direto. Se já foi usado, não dá pra simplesmente apagar - migra as
// sessões pro treinamento de destino escolhido primeiro (mesmo padrão da reconciliação
// de códigos sintéticos feita manualmente antes), senão o histórico dessas sessões
// ficaria com um treinamento_cod órfão, sem entrada correspondente no catálogo.
function iniciarExclusaoCatalogo() {
    const codigo = document.getElementById('catForm_codigo').value.trim();
    const cat = allTreinamentosCatalogo.find(c => c.id === codigo);
    if (!cat) return;
    const emUso = allTreinamentosRealizados.filter(r => r.treinamento_cod === codigo).length;

    if (emUso === 0) {
        if (!confirm(`Excluir "${cat.nome}" (código ${codigo}) do catálogo? Essa ação não pode ser desfeita.`)) return;
        excluirCatalogoDireto(codigo);
        return;
    }

    document.getElementById('catForm_mesclarAviso').innerHTML =
        `⚠️ <strong>"${escapeHTML(cat.nome)}"</strong> tem ${emUso} sessão(ões) já registrada(s). Pra excluir, escolha outro treinamento do catálogo pra migrar essas sessões antes (ex: se cadastrou duplicado por engano, migre pro código correto).`;
    document.getElementById('catForm_mesclarAlvo').value = '';
    document.getElementById('catForm_mesclarPanel').style.display = 'block';
}

async function excluirCatalogoDireto(codigo) {
    const statusEl = document.getElementById('catalogoFormStatus');
    statusEl.textContent = 'Excluindo...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseDelete('treinamentos_catalogo', codigo);
        allTreinamentosCatalogo = allTreinamentosCatalogo.filter(c => c.id !== codigo);
        refreshCatalogoDatalist();
        renderCatalogoResumo();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput').value);
        statusEl.textContent = '✅ Excluído com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCatalogoTreinamento(), 900);
    } catch (err) {
        console.error('Erro ao excluir treinamento do catálogo:', err);
        statusEl.textContent = '❌ Falha ao excluir: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function confirmarMesclarExcluir() {
    const statusEl = document.getElementById('catalogoFormStatus');
    const origCodigo = document.getElementById('catForm_codigo').value.trim();
    const alvoCodigo = extrairCodigoTreinamento(document.getElementById('catForm_mesclarAlvo').value);

    if (!alvoCodigo || alvoCodigo === origCodigo) {
        statusEl.textContent = '❌ Escolha um treinamento de destino diferente do atual.';
        statusEl.style.color = 'var(--danger)';
        return;
    }
    const catAlvo = allTreinamentosCatalogo.find(c => c.id === alvoCodigo);
    if (!catAlvo) {
        statusEl.textContent = '❌ Treinamento de destino não encontrado no catálogo.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const afetadas = allTreinamentosRealizados.filter(r => r.treinamento_cod === origCodigo);
    const linhasAtualizadas = afetadas.map(r => {
        let novaReciclagem = null;
        if (catAlvo.meses_validade && r.data_treinamento) {
            const d = parseLocalDate(r.data_treinamento);
            const alvo = new Date(d.getFullYear(), d.getMonth() + catAlvo.meses_validade, d.getDate());
            novaReciclagem = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(alvo.getDate()).padStart(2, '0')}`;
        }
        return {
            ...r,
            treinamento_cod: alvoCodigo,
            treinamento_nome: catAlvo.nome,
            carga_horaria: catAlvo.carga_horaria,
            meses_validade: catAlvo.meses_validade,
            data_proxima_reciclagem: novaReciclagem
        };
    });

    statusEl.textContent = `Migrando ${linhasAtualizadas.length} sessão(ões)...`;
    statusEl.style.color = 'var(--text-light)';
    try {
        if (linhasAtualizadas.length > 0) {
            await supabaseUpsert('treinamentos_realizados', linhasAtualizadas);
        }
        await supabaseDelete('treinamentos_catalogo', origCodigo);

        document.getElementById('catForm_mesclarPanel').style.display = 'none';
        statusEl.textContent = `✅ ${linhasAtualizadas.length} sessão(ões) migrada(s) para "${catAlvo.nome}" e treinamento antigo excluído.`;
        statusEl.style.color = 'var(--success)';

        treinamentosLoaded = true;
        await loadTreinamentosData();
        setTimeout(() => fecharFormCatalogoTreinamento(), 1800);
    } catch (err) {
        console.error('Erro ao mesclar/excluir treinamento:', err);
        statusEl.textContent = '❌ Falha ao mesclar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

async function salvarCatalogoTreinamento() {
    if (bloquearEdicaoSeNaoAutorizado('treinamentos')) return;
    const statusEl = document.getElementById('catalogoFormStatus');
    const codigoInput = document.getElementById('catForm_codigo');
    let codigo = codigoInput.value.trim();
    if (!codigo) {
        codigo = obterProximoCodigoCatalogo();
        codigoInput.value = codigo;
    }
    const nome = document.getElementById('catForm_nome').value.trim();
    const cargaStr = document.getElementById('catForm_cargaHoraria').value;
    const mesesStr = document.getElementById('catForm_mesesValidade').value;

    if (!codigo || !nome || cargaStr === '') {
        statusEl.textContent = '❌ Código, nome e carga horária são obrigatórios.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const isNovo = !codigoInput.readOnly;
    if (isNovo && allTreinamentosCatalogo.some(c => c.id === codigo)) {
        statusEl.textContent = '❌ Já existe um treinamento com esse código - busque por ele na lista acima pra editar.';
        statusEl.style.color = 'var(--danger)';
        return;
    }

    const row = {
        id: codigo,
        nome,
        carga_horaria: parseFloat(cargaStr),
        meses_validade: mesesStr !== '' ? parseInt(mesesStr, 10) : null,
        metodo_avaliacao: document.getElementById('catForm_metodoAvaliacao').value.trim() || 'Entendimento Participante',
        objetivo: document.getElementById('catForm_objetivo').value.trim() || null,
        conteudo_programatico: document.getElementById('catForm_conteudoProgramatico').value.trim() || null,
        certificado_base_legal: document.getElementById('catForm_certificadoBaseLegal').value.trim() || null,
        integracao_base_legal: document.getElementById('catForm_integracaoBaseLegal').value.trim() || null,
        recusa_base_legal: document.getElementById('catForm_recusaBaseLegal').value.trim() || null,
        integracao_obrigacoes_empresa: document.getElementById('catForm_obrigacoesEmpresa').value.trim() || null,
        integracao_obrigacoes_empregado: document.getElementById('catForm_obrigacoesEmpregado').value.trim() || null,
        integracao_programa: document.getElementById('catForm_programaIntegracao').value.trim() || null,
        questoes: catFormQuestoes.filter(q => (q.pergunta || '').trim() && q.alternativas.every(a => (a || '').trim()))
    };

    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-light)';
    try {
        await supabaseUpsert('treinamentos_catalogo', [row]);
        const idx = allTreinamentosCatalogo.findIndex(c => c.id === codigo);
        if (idx >= 0) allTreinamentosCatalogo[idx] = { ...allTreinamentosCatalogo[idx], ...row };
        else allTreinamentosCatalogo.push(row);

        refreshCatalogoDatalist();
        filterCatalogoTreinamentos(document.getElementById('catalogoSearchInput').value);
        renderCatalogoResumo();

        statusEl.textContent = '✅ Salvo com sucesso.';
        statusEl.style.color = 'var(--success)';
        setTimeout(() => fecharFormCatalogoTreinamento(), 900);
    } catch (err) {
        console.error('Erro ao salvar treinamento no catálogo:', err);
        statusEl.textContent = '❌ Falha ao salvar: ' + err.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ==============================================================================
// MÓDULO INTELIGENTE DE RECOMENDAÇÃO E ANÁLISE DE GAPS DE TREINAMENTOS (NR-01)
// Fase 1: Parametrização dinâmica por Regra Geral, GHE, Função ou Colaborador,
// cruzamento relacional com o efetivo ativo e diagnóstico de conformidade.
// ==============================================================================

// Helpers utilitários de data e formatação
function formatarDataIsoBR(isoStr) {
    if (!isoStr) return '-';
    const partes = String(isoStr).slice(0, 10).split('-');
    if (partes.length !== 3) return isoStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function somarMesesDataIso(isoStr, meses) {
    if (!isoStr || !meses) return null;
    const partes = String(isoStr).slice(0, 10).split('-');
    if (partes.length !== 3) return null;
    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const d = new Date(ano, mes + parseInt(meses, 10), dia);
    const a = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const diaStr = String(d.getDate()).padStart(2, '0');
    return `${a}-${m}-${diaStr}`;
}

function calcularDiferencaDiasDatas(isoA, isoB) {
    if (!isoA || !isoB) return 0;
    const dA = new Date(isoA.slice(0, 10) + 'T00:00:00');
    const dB = new Date(isoB.slice(0, 10) + 'T00:00:00');
    return Math.round((dB - dA) / (1000 * 60 * 60 * 24));
}

function obterNomeCursoCatalogo(cod) {
    if (!cod) return 'Treinamento não identificado';
    const curso = allTreinamentosCatalogo.find(c => String(c.id) === String(cod));
    return curso ? curso.nome : `Treinamento Cód. ${cod}`;
}

function obterPeriodicidadeCursoCatalogo(cod) {
    if (!cod) return null;
    const curso = allTreinamentosCatalogo.find(c => String(c.id) === String(cod));
    return curso && curso.meses_validade ? parseInt(curso.meses_validade, 10) : null;
}

function formatarTituloGheExibicao(cod, rawNome) {
    const c = String(cod || '').trim();
    let n = String(rawNome || '').trim();
    if (!n) return c ? `GHE ${c}` : 'GHE';

    // Se já começa com "GRUPO " (ex: "GRUPO 07 - MANUTENÇÃO CIVIL" ou "GRUPO 07 — ...")
    if (/^grupo\s+/i.test(n)) {
        n = n.replace(/^grupo\s+/i, 'GHE ');
        return n.replace(/\s*—\s*/g, ' - ');
    }

    // Se já começa com "GHE " (ex: "GHE 07 - MANUTENÇÃO CIVIL")
    if (/^ghe\s+/i.test(n)) {
        return n.replace(/\s*—\s*/g, ' - ');
    }

    // Se começa com o código numérico seguido de separador (ex: "07 - MANUTENÇÃO CIVIL" ou "07 — ...")
    if (new RegExp(`^${c}\\s*[-—–]\\s*`, 'i').test(n)) {
        return `GHE ${n.replace(/\s*[-—–]\s*/, ' - ')}`;
    }

    // Se n for apenas o código
    if (n === c) {
        return `GHE ${c}`;
    }

    // Se for apenas a descrição (ex: "MANUTENÇÃO CIVIL")
    return c ? `GHE ${c} - ${n}` : `GHE - ${n}`;
}

function obterNomeGhePorCodigo(gheCod) {
    if (!gheCod) return 'GHE Não Informado';
    const item = (allGheCatalogo || []).find(g => String(g.id).trim() === String(gheCod).trim() || String(g.nome).trim() === String(gheCod).trim());
    if (item) return formatarTituloGheExibicao(item.id, item.nome);
    return `GHE ${gheCod}`;
}

// ------------------------------------------------------------------------------
// SUB-ABA: REGRAS DE RECOMENDAÇÃO (GERENCIAMENTO / CRUD)
// ------------------------------------------------------------------------------
async function recarregarRegrasRecomendacao() {
    try {
        invalidarCacheTabela('treinamentos_regras_recomendacao');
        allTreinamentosRegras = await supabaseFetch('treinamentos_regras_recomendacao', '?select=*&order=created_at.desc') || [];
        if (typeof allEfetivo === 'undefined' || !allEfetivo || allEfetivo.length === 0) {
            allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*').catch(() => []) || [];
        }
        if (typeof allGheCatalogo === 'undefined' || !allGheCatalogo || allGheCatalogo.length === 0) {
            allGheCatalogo = await supabaseFetchCacheado('ghe_catalogo', '?select=*').catch(() => []) || [];
        }
        if (typeof allTreinamentosCatalogo === 'undefined' || !allTreinamentosCatalogo || allTreinamentosCatalogo.length === 0) {
            allTreinamentosCatalogo = await supabaseFetchCacheado('treinamentos_catalogo', '?select=*').catch(() => []) || [];
        }
        renderTreinamentoRegrasTab();
        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao recarregar regras de recomendação:', err);
    }
}

// Estado do Acordeão e Inclusão em Lote das Regras
let regraModoVisualizacao = 'acordeon';
const regrasAcordeonsAbertos = new Set();
let loteContextoAtual = null;
let listaCursosModalLoteCache = [];

function alternarVisualizacaoRegras(modo) {
    regraModoVisualizacao = modo;
    const btnAcordeon = document.getElementById('btnVisaoAcordeon');
    const btnTabela = document.getElementById('btnVisaoTabela');
    const wrapAcordeon = document.getElementById('regrasAccordionContainer');
    const wrapTabela = document.getElementById('regrasTabelaContainer');

    if (btnAcordeon) btnAcordeon.classList.toggle('active', modo === 'acordeon');
    if (btnTabela) btnTabela.classList.toggle('active', modo === 'tabela');
    if (wrapAcordeon) wrapAcordeon.style.display = (modo === 'acordeon') ? 'flex' : 'none';
    if (wrapTabela) wrapTabela.style.display = (modo === 'tabela') ? 'block' : 'none';
}

function toggleAcordeonGrupoRegra(grupoKey) {
    if (regrasAcordeonsAbertos.has(grupoKey)) {
        regrasAcordeonsAbertos.delete(grupoKey);
    } else {
        regrasAcordeonsAbertos.add(grupoKey);
    }
    const itemEl = document.getElementById('accordion-grupo-' + grupoKey);
    if (itemEl) {
        itemEl.classList.toggle('expanded', regrasAcordeonsAbertos.has(grupoKey));
    }
}

function expandirTodosAcordeonsRegras() {
    document.querySelectorAll('.regras-accordion-item').forEach(el => {
        const key = el.getAttribute('data-grupokey');
        if (key) regrasAcordeonsAbertos.add(key);
        el.classList.add('expanded');
    });
}

function recolherTodosAcordeonsRegras() {
    regrasAcordeonsAbertos.clear();
    document.querySelectorAll('.regras-accordion-item').forEach(el => {
        el.classList.remove('expanded');
    });
}

function filtrarTipoRegraTab(tipo) {
    regraFiltroTipoAtual = tipo;
    ['todas', 'TODOS', 'GHE', 'FUNCAO', 'COLABORADOR'].forEach(t => {
        document.getElementById('btnFiltroRegra-' + t)?.classList.toggle('active', t === tipo);
    });
    renderTreinamentoRegrasTab();
}

function construirListaGruposRegras(termoBusca = '') {
    const grupos = [];

    // 1. Grupo Geral (TODOS)
    if (regraFiltroTipoAtual === 'todas' || regraFiltroTipoAtual === 'TODOS') {
        const regrasGerais = allTreinamentosRegras.filter(r => r.tipo_regra === 'TODOS');
        const totalAtivos = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e)).length;
        grupos.push({
            key: 'TODOS',
            tipo: 'TODOS',
            alvo_valor: 'TODOS',
            icone: '🌐',
            titulo: 'Regras Gerais para Todo o Efetivo Ativo',
            tituloCurto: 'Todo o Efetivo (Geral)',
            subtitulo: 'Capacitações mandatórias universais da NR-01 para admissão e reciclagem geral',
            regras: regrasGerais,
            totalColaboradores: totalAtivos
        });
    }

    // 2. Grupos de GHE (se aplicável ao filtro)
    if (regraFiltroTipoAtual === 'todas' || regraFiltroTipoAtual === 'GHE') {
        const ghesMap = new Map();
        (allGheCatalogo || []).forEach(g => {
            const cod = String(g.id).trim();
            if (cod) {
                ghesMap.set(cod, {
                    cod: cod,
                    nome: g.nome ? String(g.nome).trim() : `GHE ${cod}`
                });
            }
        });

        (allEfetivo || []).forEach(e => {
            if (colaboradorEstaAtivo(e) && e.ghe) {
                const cod = String(e.ghe).trim();
                if (cod && !ghesMap.has(cod)) {
                    ghesMap.set(cod, { cod: cod, nome: `GHE ${cod}` });
                }
            }
        });

        allTreinamentosRegras.forEach(r => {
            if (r.tipo_regra === 'GHE' && r.alvo_valor) {
                const cod = String(r.alvo_valor).trim();
                if (cod && !ghesMap.has(cod)) {
                    ghesMap.set(cod, { cod: cod, nome: `GHE ${cod}` });
                }
            }
        });

        const ghesOrdenados = Array.from(ghesMap.values()).sort((a, b) => 
            a.cod.localeCompare(b.cod, undefined, { numeric: true })
        );

        ghesOrdenados.forEach(g => {
            const cod = g.cod;
            const regrasGhe = allTreinamentosRegras.filter(r => 
                r.tipo_regra === 'GHE' && (
                    String(r.alvo_valor).trim() === cod || 
                    String(r.alvo_valor).trim().toLowerCase() === g.nome.toLowerCase()
                )
            );
            const totalColabs = (allEfetivo || []).filter(e => 
                colaboradorEstaAtivo(e) && String(e.ghe || '').trim() === cod
            ).length;

            const tituloGhe = formatarTituloGheExibicao(cod, g.nome);

            grupos.push({
                key: 'GHE_' + cod,
                tipo: 'GHE',
                alvo_valor: cod,
                icone: '👥',
                titulo: tituloGhe,
                tituloCurto: tituloGhe,
                subtitulo: `Matriz de Capacitação por GHE (NR-01 / PGR)`,
                regras: regrasGhe,
                totalColaboradores: totalColabs
            });
        });
    }

    // 3. Grupos por Função / Cargo
    if (regraFiltroTipoAtual === 'todas' || regraFiltroTipoAtual === 'FUNCAO') {
        const funcoesComRegras = new Set();
        allTreinamentosRegras.forEach(r => {
            if (r.tipo_regra === 'FUNCAO' && r.alvo_valor) {
                funcoesComRegras.add(String(r.alvo_valor).trim());
            }
        });

        if (regraFiltroTipoAtual === 'FUNCAO') {
            (allEfetivo || []).forEach(e => {
                if (colaboradorEstaAtivo(e) && e.funcao) {
                    funcoesComRegras.add(String(e.funcao).trim());
                }
            });
        }

        const funcoesOrdenadas = Array.from(funcoesComRegras).sort((a, b) => a.localeCompare(b));
        funcoesOrdenadas.forEach(f => {
            const regrasFunc = allTreinamentosRegras.filter(r => 
                r.tipo_regra === 'FUNCAO' && 
                String(r.alvo_valor).trim().toLowerCase() === f.toLowerCase()
            );
            const totalColabs = (allEfetivo || []).filter(e => 
                colaboradorEstaAtivo(e) && String(e.funcao || '').trim().toLowerCase() === f.toLowerCase()
            ).length;

            grupos.push({
                key: 'FUNCAO_' + encodeURIComponent(f),
                tipo: 'FUNCAO',
                alvo_valor: f,
                icone: '💼',
                titulo: `Cargo: ${f}`,
                tituloCurto: `Cargo ${f}`,
                subtitulo: `Capacitações específicas para a função`,
                regras: regrasFunc,
                totalColaboradores: totalColabs
            });
        });
    }

    // 4. Grupos por Colaborador Individual
    if (regraFiltroTipoAtual === 'todas' || regraFiltroTipoAtual === 'COLABORADOR') {
        const colabsComRegras = new Set();
        allTreinamentosRegras.forEach(r => {
            if (r.tipo_regra === 'COLABORADOR' && r.alvo_valor) {
                colabsComRegras.add(String(r.alvo_valor).trim());
            }
        });

        if (colabsComRegras.size > 0 || regraFiltroTipoAtual === 'COLABORADOR') {
            const colabsList = Array.from(colabsComRegras).map(mat => {
                const c = (allEfetivo || []).find(e => String(e.id) === mat);
                return {
                    matricula: mat,
                    nome: c ? c.nome : `Matrícula ${mat}`,
                    funcao: c ? c.funcao : ''
                };
            }).sort((a, b) => a.nome.localeCompare(b.nome));

            colabsList.forEach(c => {
                const regrasColab = allTreinamentosRegras.filter(r => 
                    r.tipo_regra === 'COLABORADOR' && String(r.alvo_valor).trim() === c.matricula
                );
                grupos.push({
                    key: 'COLABORADOR_' + c.matricula,
                    tipo: 'COLABORADOR',
                    alvo_valor: c.matricula,
                    icone: '👤',
                    titulo: `${c.nome} (Matrícula ${c.matricula})`,
                    tituloCurto: `${c.nome} [${c.matricula}]`,
                    subtitulo: c.funcao ? `Função: ${c.funcao}` : 'Regra individual específica',
                    regras: regrasColab,
                    totalColaboradores: 1
                });
            });
        }
    }

    // Filtragem por termo de busca
    if (termoBusca) {
        return grupos.filter(g => {
            const matchGrupo = g.titulo.toLowerCase().includes(termoBusca) || 
                               g.alvo_valor.toLowerCase().includes(termoBusca);
            if (matchGrupo) return true;
            const matchCurso = g.regras.some(r => {
                const nomeCurso = obterNomeCursoCatalogo(r.treinamento_cod).toLowerCase();
                const cod = String(r.treinamento_cod || '').toLowerCase();
                return nomeCurso.includes(termoBusca) || cod.includes(termoBusca);
            });
            return matchCurso;
        });
    }

    return grupos;
}

function renderizarCorpoGrupoRegras(grupo) {
    if (!grupo.regras || grupo.regras.length === 0) {
        return `
            <div class="empty-grupo-regras">
                <div style="font-size: 24px; margin-bottom: 6px;">📂</div>
                <div style="font-weight: 700; color: var(--text); font-size: 13.5px;">Nenhum treinamento vinculado a esta matriz</div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 4px; max-width: 480px; margin-left: auto; margin-right: auto;">
                    Defina a matriz de capacitação obrigatória exigida pela NR-01 para habilitar o diagnóstico automático de gaps e conformidade deste GHE.
                </div>
                <button type="button" class="db-apply-btn btn-incluir-treinamentos" style="margin-top: 12px;" onclick="abrirModalLoteTreinamentos('${grupo.tipo}', '${escapeHTML(grupo.alvo_valor)}', '${escapeHTML(grupo.tituloCurto)}')">
                    ➕ Incluir Treinamentos em Lote
                </button>
            </div>
        `;
    }

    return `
        <div class="regras-cursos-grid">
            ${grupo.regras.map(r => {
                const nomeCurso = obterNomeCursoCatalogo(r.treinamento_cod);
                const cursoCat = (allTreinamentosCatalogo || []).find(c => String(c.id) === String(r.treinamento_cod));
                const perPadrao = cursoCat && cursoCat.meses_validade ? parseInt(cursoCat.meses_validade, 10) : null;
                const cargaHoraria = cursoCat && cursoCat.carga_horaria ? `${cursoCat.carga_horaria}h` : 'Livre';
                const perLabel = r.periodicidade_customizada_meses
                    ? `🔄 ${r.periodicidade_customizada_meses}m (custom)`
                    : (perPadrao ? `🔄 ${perPadrao}m (catálogo)` : '🔄 Único / Sem validade');
                const isAtivo = r.ativo !== false;

                return `
                    <div class="regra-curso-card ${!isAtivo ? 'inativa' : ''}" id="regra-card-${r.id}">
                        <div class="regra-curso-header">
                            <span class="badge-curso-cod">Cód. ${escapeHTML(r.treinamento_cod)}</span>
                            <div class="regra-curso-nome">${escapeHTML(nomeCurso)}</div>
                        </div>
                        <div class="regra-curso-meta">
                            <span>⏱️ ${cargaHoraria}</span>
                            <span>${perLabel}</span>
                            ${r.obrigatorio_admissao !== false ? '<span class="badge-regra-admissao">Admissão</span>' : ''}
                            <button type="button" onclick="alternarStatusRegraRecomendacao('${r.id}', ${!isAtivo})" class="badge-status-toggle ${isAtivo ? 'ativo' : 'inativo'}" title="Clique para ativar/desativar">
                                ${isAtivo ? '● Ativa' : '○ Inativa'}
                            </button>
                        </div>
                        <div class="regra-curso-footer">
                            <button type="button" class="db-clear-btn" onclick="abrirModalNovaRegra('${r.id}')" style="padding: 4px 8px; font-size: 11px;" title="Editar periodicidade ou regras finas">
                                ✏️ Ajustar
                            </button>
                            <button type="button" class="btn-excluir-vinculo-direto" onclick="excluirVinculoRegraRapido('${r.id}', '${grupo.key}', '${escapeHTML(nomeCurso)}')" title="Remover este treinamento desta matriz">
                                🗑️ Remover Vínculo
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderizarAcordeonGrupoItem(grupo, estaAberto) {
    const qtdCursos = grupo.regras.length;
    const badgeCursosClass = qtdCursos > 0 ? 'tem-cursos' : 'sem-cursos';
    const badgeCursosTexto = `${qtdCursos} ${qtdCursos === 1 ? 'Treinamento Vinculado' : 'Treinamentos Vinculados'}`;

    return `
        <div class="regras-accordion-item ${estaAberto ? 'expanded' : ''}" id="accordion-grupo-${grupo.key}" data-grupokey="${grupo.key}">
            <div class="regras-accordion-header" onclick="toggleAcordeonGrupoRegra('${grupo.key}')">
                <div class="regras-accordion-info">
                    <span class="regras-accordion-chevron">▼</span>
                    <span style="font-size: 16px;">${grupo.icone}</span>
                    <div style="min-width: 0;">
                        <div class="regras-grupo-titulo" title="${escapeHTML(grupo.titulo)}">
                            ${escapeHTML(grupo.titulo)}
                        </div>
                        <div style="font-size: 11px; color: var(--text-light); margin-top: 1px;">
                            ${escapeHTML(grupo.subtitulo)}
                        </div>
                    </div>
                </div>

                <div class="regras-accordion-actions" onclick="event.stopPropagation()">
                    <div class="regras-badges-wrap">
                        <span class="badge-acordeon-count ${badgeCursosClass}">
                            ${badgeCursosTexto}
                        </span>
                        ${grupo.totalColaboradores !== undefined ? `
                            <span class="badge-acordeon-efetivo" title="Colaboradores ativos vinculados a este GHE / público">
                                👥 ${grupo.totalColaboradores} ativos
                            </span>
                        ` : ''}
                    </div>
                    <button type="button" class="db-apply-btn btn-incluir-treinamentos" onclick="abrirModalLoteTreinamentos('${grupo.tipo}', '${escapeHTML(grupo.alvo_valor)}', '${escapeHTML(grupo.tituloCurto)}')">
                        ➕ Incluir Treinamentos
                    </button>
                </div>
            </div>

            <div class="regras-accordion-body">
                ${renderizarCorpoGrupoRegras(grupo)}
            </div>
        </div>
    `;
}

function renderTreinamentoRegrasTab() {
    const accordionContainer = document.getElementById('regrasAccordionContainer');
    const tbody = document.getElementById('tabelaRegrasRecomendacaoCorpo');
    const contadorEl = document.getElementById('regrasContador');
    const termoBusca = (document.getElementById('filtroRegraBusca')?.value || '').trim().toLowerCase();

    // 1. Constroi a lista de grupos para o Acordeão
    const grupos = construirListaGruposRegras(termoBusca);

    // Se houver busca digitada, abre automaticamente os grupos retornados
    if (termoBusca) {
        grupos.forEach(g => regrasAcordeonsAbertos.add(g.key));
    } else if (regrasAcordeonsAbertos.size === 0 && grupos.length > 0) {
        // Na primeira abertura sem busca, abre os grupos que possuem regras
        grupos.forEach(g => {
            if (g.regras && g.regras.length > 0) {
                regrasAcordeonsAbertos.add(g.key);
            }
        });
        if (regrasAcordeonsAbertos.size === 0) {
            regrasAcordeonsAbertos.add(grupos[0].key);
        }
    }

    // Renderiza o Acordeão
    if (accordionContainer) {
        if (grupos.length === 0) {
            accordionContainer.innerHTML = `
                <div class="empty-grupo-regras" style="background:var(--card); border:1px solid var(--border); padding:36px 16px;">
                    <div style="font-size:32px; margin-bottom:8px;">🔍</div>
                    <div style="font-weight:700; font-size:15px; color:var(--text);">Nenhuma matriz de capacitação ou treinamento encontrado</div>
                    <div style="font-size:12px; color:var(--text-light); margin-top:4px;">
                        Tente ajustar o termo de pesquisa ou trocar o filtro de tipo de matriz.
                    </div>
                </div>
            `;
        } else {
            accordionContainer.innerHTML = grupos.map(g => 
                renderizarAcordeonGrupoItem(g, regrasAcordeonsAbertos.has(g.key))
            ).join('');
        }
    }

    // 2. Renderiza também a visualização em tabela (para quando alternar modo ou auditoria geral)
    const regrasFiltradas = allTreinamentosRegras.filter(r => {
        if (regraFiltroTipoAtual !== 'todas' && r.tipo_regra !== regraFiltroTipoAtual) {
            return false;
        }
        if (termoBusca) {
            const nomeCurso = obterNomeCursoCatalogo(r.treinamento_cod).toLowerCase();
            const alvo = String(r.alvo_valor || '').toLowerCase();
            const cod = String(r.treinamento_cod || '').toLowerCase();
            if (!nomeCurso.includes(termoBusca) && !alvo.includes(termoBusca) && !cod.includes(termoBusca)) {
                return false;
            }
        }
        return true;
    });

    if (contadorEl) contadorEl.textContent = String(regrasFiltradas.length);

    if (tbody) {
        if (regrasFiltradas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:32px 16px; color:var(--text-light);">
                        <div style="font-size:28px; margin-bottom:8px;">📋</div>
                        <div style="font-weight:700; font-size:14px; color:var(--text);">Nenhuma regra encontrada</div>
                        <div style="font-size:12px; margin-top:4px;">
                            ${allTreinamentosRegras.length === 0 ? 'Cadastre a primeira regra de recomendação no botão <b>➕ Nova Regra</b> acima.' : 'Nenhuma regra corresponde aos filtros aplicados.'}
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = regrasFiltradas.map(r => {
                let tipoBadge = '';
                let alvoLabel = '';

                if (r.tipo_regra === 'TODOS') {
                    tipoBadge = `<span class="badge-regra-tipo badge-regra-todos">🌐 Geral</span>`;
                    alvoLabel = `<strong>Todo o Efetivo Ativo</strong> <span style="font-size:11px; color:var(--text-light);">(Todos os colaboradores)</span>`;
                } else if (r.tipo_regra === 'GHE') {
                    tipoBadge = `<span class="badge-regra-tipo badge-regra-ghe">👥 GHE</span>`;
                    alvoLabel = `<strong>${escapeHTML(obterNomeGhePorCodigo(r.alvo_valor))}</strong>`;
                } else if (r.tipo_regra === 'FUNCAO') {
                    tipoBadge = `<span class="badge-regra-tipo badge-regra-funcao">💼 Cargo</span>`;
                    alvoLabel = `<strong>${escapeHTML(r.alvo_valor)}</strong>`;
                } else if (r.tipo_regra === 'COLABORADOR') {
                    tipoBadge = `<span class="badge-regra-tipo badge-regra-colaborador">👤 Individual</span>`;
                    const cAtivo = (allEfetivo || []).find(e => String(e.id) === String(r.alvo_valor));
                    alvoLabel = `<strong>Matrícula ${escapeHTML(r.alvo_valor)}</strong> ${cAtivo ? `— ${escapeHTML(cAtivo.nome)}` : ''}`;
                }

                const nomeCurso = obterNomeCursoCatalogo(r.treinamento_cod);
                const perPadrao = obterPeriodicidadeCursoCatalogo(r.treinamento_cod);
                const perExibida = r.periodicidade_customizada_meses
                    ? `<span style="font-weight:700; color:#4f46e5;">${r.periodicidade_customizada_meses} meses</span> <span style="font-size:10px; color:var(--text-light);">(customizada)</span>`
                    : (perPadrao ? `${perPadrao} meses <span style="font-size:10px; color:var(--text-light);">(catálogo)</span>` : '<span style="color:var(--text-light);">Único / Sem prazo</span>');

                const admissaoBadge = r.obrigatorio_admissao !== false
                    ? `<span style="display:inline-block; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:700; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">Sim</span>`
                    : `<span style="display:inline-block; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:600; background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">Não</span>`;

                const isAtivo = r.ativo !== false;
                const statusBadge = isAtivo
                    ? `<button type="button" onclick="alternarStatusRegraRecomendacao('${r.id}', false)" title="Clique para desativar" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:700; cursor:pointer;">● Ativa</button>`
                    : `<button type="button" onclick="alternarStatusRegraRecomendacao('${r.id}', true)" title="Clique para ativar" style="background:#f1f5f9; color:#94a3b8; border:1px solid #cbd5e1; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:700; cursor:pointer;">○ Inativa</button>`;

                return `
                    <tr style="border-bottom:1px solid var(--border); ${!isAtivo ? 'opacity:0.6;' : ''}">
                        <td style="padding:10px 12px;">${tipoBadge}</td>
                        <td style="padding:10px 12px;">${alvoLabel}</td>
                        <td style="padding:10px 12px;">
                            <div style="font-weight:600; color:var(--text);">${escapeHTML(nomeCurso)}</div>
                            <div style="font-size:11px; color:var(--text-light);">Cód: ${escapeHTML(r.treinamento_cod)}</div>
                        </td>
                        <td style="padding:10px 12px; text-align:center;">${perExibida}</td>
                        <td style="padding:10px 12px; text-align:center;">${admissaoBadge}</td>
                        <td style="padding:10px 12px; text-align:center;">${statusBadge}</td>
                        <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                            <button type="button" class="db-clear-btn" onclick="abrirModalNovaRegra('${r.id}')" style="padding:4px 8px; font-size:11.5px; margin-right:4px;" title="Editar regra">
                                ✏️ Editar
                            </button>
                            <button type="button" class="db-clear-btn" onclick="excluirRegraRecomendacao('${r.id}')" style="padding:4px 8px; font-size:11.5px; color:var(--danger); border-color:var(--danger);" title="Excluir regra">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// ==============================================================================
// MODAL DE INCLUSÃO EM LOTE COM LIVE SEARCH (NR-01)
// ==============================================================================
async function abrirModalLoteTreinamentos(tipo, alvoValor, tituloGrupo) {
    loteContextoAtual = {
        tipo: tipo,
        alvo_valor: alvoValor,
        tituloGrupo: tituloGrupo
    };

    const modal = document.getElementById('modalTreinamentoLote');
    const labelGrupo = document.getElementById('modalLoteGrupoNome');
    const buscaInput = document.getElementById('loteBuscaTreinamento');
    const statusMsg = document.getElementById('loteStatusMsg');

    if (labelGrupo) {
        labelGrupo.textContent = tituloGrupo || `${tipo}: ${alvoValor}`;
    }
    if (buscaInput) buscaInput.value = '';
    if (statusMsg) statusMsg.textContent = '';

    if (!allTreinamentosCatalogo || allTreinamentosCatalogo.length === 0) {
        allTreinamentosCatalogo = await supabaseFetchCacheado('treinamentos_catalogo', '?select=*').catch(() => []) || [];
    }

    // Identifica quais cursos já estão vinculados a este grupo
    const cursosJaVinculados = new Set();
    allTreinamentosRegras.forEach(r => {
        if (r.tipo_regra === tipo && String(r.alvo_valor).trim().toLowerCase() === String(alvoValor).trim().toLowerCase()) {
            cursosJaVinculados.add(String(r.treinamento_cod).trim());
        }
    });

    listaCursosModalLoteCache = (allTreinamentosCatalogo || []).map(c => {
        const idStr = String(c.id).trim();
        const jaVinculado = cursosJaVinculados.has(idStr);
        return {
            id: idStr,
            nome: c.nome || `Treinamento ${idStr}`,
            meses_validade: c.meses_validade,
            carga_horaria: c.carga_horaria,
            jaVinculado: jaVinculado,
            selecionado: false
        };
    }).sort((a, b) => {
        if (a.jaVinculado !== b.jaVinculado) return a.jaVinculado ? 1 : -1;
        return a.nome.localeCompare(b.nome);
    });

    renderizarListaCursosModalLote('');
    atualizarContadorSelecaoLote();

    if (modal) modal.style.display = 'flex';
    if (buscaInput) setTimeout(() => buscaInput.focus(), 150);
}

function fecharModalLoteTreinamentos() {
    const modal = document.getElementById('modalTreinamentoLote');
    if (modal) modal.style.display = 'none';
    loteContextoAtual = null;
}

function renderizarListaCursosModalLote(termo = '') {
    const container = document.getElementById('loteListaTreinamentosContainer');
    if (!container) return;

    const termoNorm = (termo || '').trim().toLowerCase();
    const filtrados = listaCursosModalLoteCache.filter(c => {
        if (!termoNorm) return true;
        return c.id.toLowerCase().includes(termoNorm) || c.nome.toLowerCase().includes(termoNorm);
    });

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding: 24px 16px; text-align: center; color: var(--text-light); font-size: 13px;">
                🔍 Nenhum treinamento encontrado para "${escapeHTML(termo)}"
            </div>
        `;
        return;
    }

    container.innerHTML = filtrados.map(c => {
        const valLabel = c.meses_validade ? `${c.meses_validade}m` : 'Sem validade';
        const chLabel = c.carga_horaria ? `${c.carga_horaria}h` : '';
        const metaStr = [chLabel, valLabel].filter(Boolean).join(' • ');

        if (c.jaVinculado) {
            return `
                <div class="lote-curso-item ja-vinculado" title="Este treinamento já está vinculado a esta matriz">
                    <div class="lote-curso-item-info">
                        <input type="checkbox" checked disabled style="width: 16px; height: 16px; accent-color: var(--primary);">
                        <span class="badge-curso-cod">Cód. ${escapeHTML(c.id)}</span>
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-light);">${escapeHTML(c.nome)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--text-light);">${metaStr}</span>
                        <span class="badge-ja-vinculado">✓ Já Vinculado</span>
                    </div>
                </div>
            `;
        }

        return `
            <label class="lote-curso-item" for="chkLoteCurso_${c.id}">
                <div class="lote-curso-item-info">
                    <input type="checkbox" id="chkLoteCurso_${c.id}" class="lote-chk-curso" value="${c.id}" 
                        ${c.selecionado ? 'checked' : ''} 
                        onchange="aoAlterarCheckboxLote('${c.id}', this.checked)"
                        style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;">
                    <span class="badge-curso-cod">Cód. ${escapeHTML(c.id)}</span>
                    <span style="font-size: 13px; font-weight: 700; color: var(--text);">${escapeHTML(c.nome)}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-light); white-space: nowrap;">
                    ${metaStr}
                </div>
            </label>
        `;
    }).join('');
}

function filtrarListaTreinamentosLote(termo) {
    renderizarListaCursosModalLote(termo);
}

function aoAlterarCheckboxLote(id, checked) {
    const item = listaCursosModalLoteCache.find(c => c.id === id);
    if (item && !item.jaVinculado) {
        item.selecionado = !!checked;
    }
    atualizarContadorSelecaoLote();
}

function marcarTodosCursosLote(marcar) {
    const termo = (document.getElementById('loteBuscaTreinamento')?.value || '').trim().toLowerCase();
    listaCursosModalLoteCache.forEach(c => {
        if (!c.jaVinculado) {
            const bateFiltro = !termo || c.id.toLowerCase().includes(termo) || c.nome.toLowerCase().includes(termo);
            if (bateFiltro) {
                c.selecionado = !!marcar;
            }
        }
    });
    renderizarListaCursosModalLote(termo);
    atualizarContadorSelecaoLote();
}

function atualizarContadorSelecaoLote() {
    const qtd = listaCursosModalLoteCache.filter(c => !c.jaVinculado && c.selecionado).length;
    const contadorEl = document.getElementById('loteContadorSelecionados');
    const btnContadorEl = document.getElementById('btnContadorSalvarLote');
    const btnSalvar = document.getElementById('btnSalvarTreinamentosLote');

    if (contadorEl) contadorEl.textContent = String(qtd);
    if (btnContadorEl) btnContadorEl.textContent = String(qtd);
    if (btnSalvar) btnSalvar.disabled = (qtd === 0);
}

async function salvarTreinamentosLote() {
    if (!loteContextoAtual) return;
    const selecionados = listaCursosModalLoteCache.filter(c => !c.jaVinculado && c.selecionado);
    if (selecionados.length === 0) {
        alert('Selecione pelo menos um treinamento disponível para vincular.');
        return;
    }

    const btnSalvar = document.getElementById('btnSalvarTreinamentosLote');
    const statusMsg = document.getElementById('loteStatusMsg');
    const obrigatorioAdmissao = document.getElementById('loteObrigatorioAdmissao')?.checked !== false;
    const ativo = document.getElementById('loteAtivo')?.checked !== false;

    if (btnSalvar) btnSalvar.disabled = true;
    if (statusMsg) {
        statusMsg.textContent = `Gravando ${selecionados.length} regras no Supabase...`;
        statusMsg.style.color = 'var(--text-light)';
    }

    const payload = selecionados.map(c => ({
        tipo_regra: loteContextoAtual.tipo,
        alvo_valor: loteContextoAtual.alvo_valor,
        treinamento_cod: c.id,
        obrigatorio_admissao: obrigatorioAdmissao,
        periodicidade_customizada_meses: null,
        ativo: ativo
    }));

    try {
        await supabaseInsert('treinamentos_regras_recomendacao', payload);
        invalidarCacheTabela('treinamentos_regras_recomendacao');
        allTreinamentosRegras = await supabaseFetch('treinamentos_regras_recomendacao', '?select=*&order=created_at.desc') || [];
        window.allTreinamentosRegras = allTreinamentosRegras;

        const grupoKey = (loteContextoAtual.tipo === 'TODOS') 
            ? 'TODOS' 
            : `${loteContextoAtual.tipo}_${encodeURIComponent(loteContextoAtual.alvo_valor)}`;
        regrasAcordeonsAbertos.add(grupoKey);

        fecharModalLoteTreinamentos();
        renderTreinamentoRegrasTab();

        setTimeout(() => {
            const el = document.getElementById('accordion-grupo-' + grupoKey);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);

        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao salvar treinamentos em lote:', err);
        if (statusMsg) {
            statusMsg.textContent = '❌ Erro ao salvar: ' + err.message;
            statusMsg.style.color = 'var(--danger)';
        }
        alert('Falha ao salvar treinamentos na matriz de capacitação: ' + err.message);
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
}

async function excluirVinculoRegraRapido(id, grupoKey, nomeCurso) {
    const nome = nomeCurso || 'este treinamento';
    if (!confirm(`Deseja realmente remover o treinamento "${nome}" desta matriz de capacitação?\n\nO diagnóstico de gaps e prontidão será recalculado.`)) {
        return;
    }

    try {
        await supabaseDelete('treinamentos_regras_recomendacao', id);
        allTreinamentosRegras = allTreinamentosRegras.filter(r => String(r.id) !== String(id));
        window.allTreinamentosRegras = allTreinamentosRegras;

        if (grupoKey) regrasAcordeonsAbertos.add(grupoKey);

        renderTreinamentoRegrasTab();

        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao excluir vínculo da regra:', err);
        alert('Falha ao excluir regra: ' + err.message);
    }
}

async function abrirModalNovaRegra(regraId = null) {
    regraEmEdicaoId = regraId ? String(regraId) : null;
    const modal = document.getElementById('modalTreinamentoRegra');
    const titulo = document.getElementById('modalTreinamentoRegraTitulo');
    const btnExcluir = document.getElementById('formRegra_btnExcluir');
    const statusMsg = document.getElementById('formRegra_statusMsg');
    if (statusMsg) statusMsg.textContent = '';

    // Assegura catálogos carregados para os selects
    if (!allTreinamentosCatalogo || allTreinamentosCatalogo.length === 0) {
        allTreinamentosCatalogo = await supabaseFetchCacheado('treinamentos_catalogo', '?select=*').catch(() => []) || [];
    }
    if (!allGheCatalogo || allGheCatalogo.length === 0) {
        allGheCatalogo = await supabaseFetchCacheado('ghe_catalogo', '?select=*').catch(() => []) || [];
    }
    if (!allEfetivo || allEfetivo.length === 0) {
        allEfetivo = await supabaseFetchCacheado('colaboradores_efetivo', '?select=*').catch(() => []) || [];
    }

    // Popula dropdown de GHE
    const selGhe = document.getElementById('formRegra_alvoGhe');
    if (selGhe) {
        selGhe.innerHTML = '<option value="">Selecione o GHE...</option>';
        const ghesSet = new Map();
        allGheCatalogo.forEach(g => {
            const cod = String(g.id).trim();
            if (cod) ghesSet.set(cod, formatarTituloGheExibicao(cod, g.nome));
        });
        // Complementa com GHEs de colaboradores_efetivo caso haja algum não cadastrado no catálogo
        allEfetivo.forEach(e => {
            if (colaboradorEstaAtivo(e) && e.ghe) {
                const cod = String(e.ghe).trim();
                if (cod && !ghesSet.has(cod)) ghesSet.set(cod, `GHE ${cod}`);
            }
        });
        Array.from(ghesSet.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).forEach(([cod, label]) => {
            const opt = document.createElement('option');
            opt.value = cod;
            opt.textContent = label;
            selGhe.appendChild(opt);
        });
    }

    // Popula dropdown de Funções/Cargos únicos
    const selFuncao = document.getElementById('formRegra_alvoFuncao');
    if (selFuncao) {
        selFuncao.innerHTML = '<option value="">Selecione o Cargo / Função...</option>';
        const funcoesSet = new Set();
        allEfetivo.forEach(e => {
            if (colaboradorEstaAtivo(e) && e.funcao) {
                const f = e.funcao.trim();
                if (f) funcoesSet.add(f);
            }
        });
        Array.from(funcoesSet).sort().forEach(func => {
            const opt = document.createElement('option');
            opt.value = func;
            opt.textContent = func;
            selFuncao.appendChild(opt);
        });
    }

    // Popula dropdown de Colaboradores Ativos
    const selColab = document.getElementById('formRegra_alvoColaborador');
    if (selColab) {
        selColab.innerHTML = '<option value="">Selecione o Colaborador...</option>';
        const ativos = allEfetivo.filter(e => colaboradorEstaAtivo(e))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        ativos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = String(c.id);
            opt.textContent = `[${c.id}] ${c.nome} (${c.funcao || 'Sem cargo'})`;
            selColab.appendChild(opt);
        });
    }

    // Popula dropdown de Treinamentos do Catálogo
    const selTrein = document.getElementById('formRegra_treinamentoCod');
    if (selTrein) {
        selTrein.innerHTML = '<option value="">Selecione o Treinamento...</option>';
        const cursosOrdenados = [...allTreinamentosCatalogo].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        cursosOrdenados.forEach(c => {
            const opt = document.createElement('option');
            opt.value = String(c.id);
            const valLabel = c.meses_validade ? ` | Validade: ${c.meses_validade}m` : ' | Sem validade';
            opt.textContent = `[${c.id}] ${c.nome}${valLabel}`;
            selTrein.appendChild(opt);
        });
    }

    if (regraEmEdicaoId) {
        const regra = allTreinamentosRegras.find(r => String(r.id) === regraEmEdicaoId);
        if (!regra) return;
        if (titulo) titulo.textContent = '✏️ Editar Regra de Recomendação';
        if (btnExcluir) btnExcluir.style.display = 'inline-block';
        document.getElementById('formRegra_id').value = regra.id;
        document.getElementById('formRegra_tipo').value = regra.tipo_regra || 'TODOS';
        onTipoRegraChange();

        if (regra.tipo_regra === 'GHE' && selGhe) selGhe.value = regra.alvo_valor || '';
        if (regra.tipo_regra === 'FUNCAO' && selFuncao) selFuncao.value = regra.alvo_valor || '';
        if (regra.tipo_regra === 'COLABORADOR' && selColab) selColab.value = regra.alvo_valor || '';

        if (selTrein) selTrein.value = String(regra.treinamento_cod || '');
        document.getElementById('formRegra_periodicidade').value = regra.periodicidade_customizada_meses || '';
        document.getElementById('formRegra_obrigatorioAdmissao').checked = regra.obrigatorio_admissao !== false;
        document.getElementById('formRegra_ativo').checked = regra.ativo !== false;
    } else {
        if (titulo) titulo.textContent = '➕ Nova Regra de Recomendação';
        if (btnExcluir) btnExcluir.style.display = 'none';
        document.getElementById('formRegra_id').value = '';
        document.getElementById('formRegra_tipo').value = 'TODOS';
        onTipoRegraChange();
        if (selGhe) selGhe.value = '';
        if (selFuncao) selFuncao.value = '';
        if (selColab) selColab.value = '';
        if (selTrein) selTrein.value = '';
        document.getElementById('formRegra_periodicidade').value = '';
        document.getElementById('formRegra_obrigatorioAdmissao').checked = true;
        document.getElementById('formRegra_ativo').checked = true;
    }

    onRegraTreinamentoChange();
    if (modal) modal.style.display = 'flex';
}

function fecharModalRegra() {
    const modal = document.getElementById('modalTreinamentoRegra');
    if (modal) modal.style.display = 'none';
}

function onTipoRegraChange() {
    const tipo = document.getElementById('formRegra_tipo')?.value || 'TODOS';
    const noticeTodos = document.getElementById('formRegra_alvoTodosNotice');
    const selGhe = document.getElementById('formRegra_alvoGhe');
    const selFuncao = document.getElementById('formRegra_alvoFuncao');
    const selColab = document.getElementById('formRegra_alvoColaborador');
    const label = document.getElementById('formRegra_alvoLabel');

    if (noticeTodos) noticeTodos.style.display = (tipo === 'TODOS') ? 'block' : 'none';
    if (selGhe) selGhe.style.display = (tipo === 'GHE') ? 'block' : 'none';
    if (selFuncao) selFuncao.style.display = (tipo === 'FUNCAO') ? 'block' : 'none';
    if (selColab) selColab.style.display = (tipo === 'COLABORADOR') ? 'block' : 'none';

    if (label) {
        if (tipo === 'TODOS') label.textContent = 'Alvo da Exigência (Geral)';
        else if (tipo === 'GHE') label.textContent = 'Selecione o GHE Exposto *';
        else if (tipo === 'FUNCAO') label.textContent = 'Selecione o Cargo Obrigatório *';
        else if (tipo === 'COLABORADOR') label.textContent = 'Selecione o Colaborador Alvo *';
    }
}

function onRegraTreinamentoChange() {
    const cod = document.getElementById('formRegra_treinamentoCod')?.value;
    const infoEl = document.getElementById('formRegra_treinamentoInfo');
    if (!infoEl) return;
    if (!cod) {
        infoEl.textContent = '';
        return;
    }
    const c = allTreinamentosCatalogo.find(x => String(x.id) === String(cod));
    if (c) {
        const val = c.meses_validade ? `${c.meses_validade} meses` : 'Sem validade (curso único)';
        const carga = c.carga_horaria ? `${c.carga_horaria} horas` : 'Carga horária livre';
        infoEl.textContent = `📋 Detalhes no catálogo: ${carga} | Validade padrão: ${val}`;
    }
}

async function salvarRegraRecomendacao() {
    const statusMsg = document.getElementById('formRegra_statusMsg');
    const btnSalvar = document.getElementById('formRegra_btnSalvar');
    const tipo = document.getElementById('formRegra_tipo')?.value;
    const treinamentoCod = document.getElementById('formRegra_treinamentoCod')?.value;
    const periodicidadeStr = document.getElementById('formRegra_periodicidade')?.value.trim();
    const obrigatorioAdmissao = document.getElementById('formRegra_obrigatorioAdmissao')?.checked;
    const ativo = document.getElementById('formRegra_ativo')?.checked;
    const regraId = document.getElementById('formRegra_id')?.value;

    let alvoValor = 'TODOS';
    if (tipo === 'GHE') {
        alvoValor = document.getElementById('formRegra_alvoGhe')?.value;
        if (!alvoValor) {
            alert('Por favor, selecione um GHE válido para esta regra.');
            return;
        }
    } else if (tipo === 'FUNCAO') {
        alvoValor = document.getElementById('formRegra_alvoFuncao')?.value;
        if (!alvoValor) {
            alert('Por favor, selecione um Cargo/Função para esta regra.');
            return;
        }
    } else if (tipo === 'COLABORADOR') {
        alvoValor = document.getElementById('formRegra_alvoColaborador')?.value;
        if (!alvoValor) {
            alert('Por favor, selecione um Colaborador para esta regra individual.');
            return;
        }
    }

    if (!treinamentoCod) {
        alert('Por favor, selecione o Treinamento do Catálogo exigido pela regra.');
        return;
    }

    const payload = {
        tipo_regra: tipo,
        alvo_valor: alvoValor,
        treinamento_cod: treinamentoCod,
        obrigatorio_admissao: !!obrigatorioAdmissao,
        periodicidade_customizada_meses: periodicidadeStr ? parseInt(periodicidadeStr, 10) : null,
        ativo: !!ativo
    };

    if (regraId) {
        payload.id = parseInt(regraId, 10);
    }

    if (statusMsg) {
        statusMsg.textContent = 'Gravando regra no banco...';
        statusMsg.style.color = 'var(--text-light)';
    }
    if (btnSalvar) btnSalvar.disabled = true;

    try {
        if (regraId) {
            await supabaseUpsert('treinamentos_regras_recomendacao', [payload]);
            const idx = allTreinamentosRegras.findIndex(r => String(r.id) === String(regraId));
            if (idx >= 0) allTreinamentosRegras[idx] = { ...allTreinamentosRegras[idx], ...payload };
        } else {
            await supabaseInsert('treinamentos_regras_recomendacao', [payload]);
            invalidarCacheTabela('treinamentos_regras_recomendacao');
            allTreinamentosRegras = await supabaseFetch('treinamentos_regras_recomendacao', '?select=*&order=created_at.desc') || [];
        }

        renderTreinamentoRegrasTab();
        fecharModalRegra();
        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao salvar regra de recomendação:', err);
        if (statusMsg) {
            statusMsg.textContent = '❌ Erro ao salvar: ' + err.message;
            statusMsg.style.color = 'var(--danger)';
        }
        alert('Falha ao salvar regra: ' + err.message);
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
}

async function excluirRegraRecomendacao(id) {
    if (!confirm('Deseja realmente excluir esta regra de recomendação? Os diagnósticos de gaps serão recalculados.')) return;
    try {
        await supabaseDelete('treinamentos_regras_recomendacao', id);
        allTreinamentosRegras = allTreinamentosRegras.filter(r => String(r.id) !== String(id));
        renderTreinamentoRegrasTab();
        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao excluir regra:', err);
        alert('Falha ao excluir regra: ' + err.message);
    }
}

async function excluirRegraRecomendacaoAtual() {
    const regraId = document.getElementById('formRegra_id')?.value;
    if (regraId) {
        await excluirRegraRecomendacao(regraId);
        fecharModalRegra();
    }
}

async function alternarStatusRegraRecomendacao(id, novoStatus) {
    try {
        await supabasePatch('treinamentos_regras_recomendacao', `id=eq.${encodeURIComponent(id)}`, { ativo: novoStatus });
        const regra = allTreinamentosRegras.find(r => String(r.id) === String(id));
        if (regra) regra.ativo = novoStatus;
        renderTreinamentoRegrasTab();
        if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
            renderTreinamentoGapsTab();
        }
    } catch (err) {
        console.error('Erro ao alternar status da regra:', err);
        alert('Falha ao alterar status da regra: ' + err.message);
    }
}

// ------------------------------------------------------------------------------
// SUB-ABA: DIAGNÓSTICO DE GAPS E CONFORMIDADE DE TREINAMENTOS (NR-01)
// ------------------------------------------------------------------------------
function calcularDiagnosticoGapsTreinamentos() {
    const regrasAtivas = allTreinamentosRegras.filter(r => r.ativo !== false);
    const colaboradoresAtivos = allEfetivo.filter(e => colaboradorEstaAtivo(e));

    // Pré-processa as realizações mais recentes de cada colaborador
    const realizacoesMap = new Map();
    allTreinamentosRealizados.forEach(tr => {
        const mat = String(tr.matricula || '').trim();
        const cod = String(tr.treinamento_cod || '').trim();
        if (!mat || !cod) return;
        if (!realizacoesMap.has(mat)) realizacoesMap.set(mat, new Map());
        const porCurso = realizacoesMap.get(mat);
        const dataTr = tr.data_treinamento || '1970-01-01';
        if (!porCurso.has(cod) || dataTr > (porCurso.get(cod).data_treinamento || '1970-01-01')) {
            porCurso.set(cod, tr);
        }
    });

    const hojeStr = new Date().toISOString().slice(0, 10);
    const diagnosticos = [];

    colaboradoresAtivos.forEach(colab => {
        const mat = String(colab.id || '').trim();
        const nome = colab.nome || 'Colaborador sem nome';
        const funcao = (colab.funcao || '').trim();
        const funcaoNorm = funcao.toUpperCase();
        const ghe = String(colab.ghe || '').trim();
        const gheNorm = ghe.toUpperCase();

        const exigenciasMap = new Map();

        regrasAtivas.forEach(r => {
            let aplica = false;
            let origemLabel = '';

            if (r.tipo_regra === 'TODOS') {
                aplica = true;
                origemLabel = 'Geral (Todos)';
            } else if (r.tipo_regra === 'GHE') {
                const alvoGhe = String(r.alvo_valor || '').trim().toUpperCase();
                if (gheNorm && (gheNorm === alvoGhe || gheNorm === `GRUPO ${alvoGhe}` || gheNorm.startsWith(alvoGhe))) {
                    aplica = true;
                    origemLabel = `GHE ${r.alvo_valor}`;
                }
            } else if (r.tipo_regra === 'FUNCAO') {
                const alvoFunc = String(r.alvo_valor || '').trim().toUpperCase();
                if (funcaoNorm && funcaoNorm === alvoFunc) {
                    aplica = true;
                    origemLabel = `Cargo (${r.alvo_valor})`;
                }
            } else if (r.tipo_regra === 'COLABORADOR') {
                if (mat === String(r.alvo_valor || '').trim()) {
                    aplica = true;
                    origemLabel = 'Individual';
                }
            }

            if (aplica) {
                const cod = String(r.treinamento_cod);
                if (!exigenciasMap.has(cod)) {
                    exigenciasMap.set(cod, {
                        treinamento_cod: cod,
                        origens: [origemLabel],
                        obrigatorio_admissao: r.obrigatorio_admissao !== false,
                        periodicidade_customizada: r.periodicidade_customizada_meses || null
                    });
                } else {
                    const existente = exigenciasMap.get(cod);
                    if (!existente.origens.includes(origemLabel)) existente.origens.push(origemLabel);
                    if (r.obrigatorio_admissao) existente.obrigatorio_admissao = true;
                    if (r.periodicidade_customizada_meses && (!existente.periodicidade_customizada || r.periodicidade_customizada_meses < existente.periodicidade_customizada)) {
                        existente.periodicidade_customizada = r.periodicidade_customizada_meses;
                    }
                }
            }
        });

        // Avalia cada exigência
        exigenciasMap.forEach(exig => {
            const cod = exig.treinamento_cod;
            const nomeTreinamento = obterNomeCursoCatalogo(cod);
            const realizacao = realizacoesMap.get(mat)?.get(cod);

            let status = 'pendente';
            let statusLabel = 'Pendente / Admissão';
            let badgeClass = 'badge-gap-pendente';
            let situacaoTexto = exig.obrigatorio_admissao ? 'Nunca realizado (Exigido na Admissão)' : 'Nunca realizado';
            let dataTreinamento = null;
            let dataVencimento = null;
            let diasAtraso = 0;
            let diasRestantes = 0;

            if (realizacao && realizacao.data_treinamento) {
                dataTreinamento = realizacao.data_treinamento;
                const perMeses = exig.periodicidade_customizada || realizacao.meses_validade || obterPeriodicidadeCursoCatalogo(cod);

                if (!perMeses || perMeses <= 0) {
                    status = 'conforme';
                    statusLabel = 'Conforme';
                    badgeClass = 'badge-gap-conforme';
                    situacaoTexto = `Realizado em ${formatarDataIsoBR(dataTreinamento)} (Sem validade periódica)`;
                } else {
                    if (realizacao.data_proxima_reciclagem) {
                        dataVencimento = realizacao.data_proxima_reciclagem;
                    } else {
                        dataVencimento = somarMesesDataIso(dataTreinamento, perMeses);
                    }

                    if (dataVencimento < hojeStr) {
                        status = 'vencido';
                        statusLabel = 'Vencido / Reciclagem';
                        badgeClass = 'badge-gap-vencido';
                        diasAtraso = Math.abs(calcularDiferencaDiasDatas(dataVencimento, hojeStr));
                        situacaoTexto = `Vencido em ${formatarDataIsoBR(dataVencimento)} (há ${diasAtraso} dias)`;
                    } else {
                        status = 'conforme';
                        statusLabel = 'Conforme';
                        badgeClass = 'badge-gap-conforme';
                        diasRestantes = calcularDiferencaDiasDatas(hojeStr, dataVencimento);
                        situacaoTexto = `Válido até ${formatarDataIsoBR(dataVencimento)} (expira em ${diasRestantes} dias)`;
                    }
                }
            }

            diagnosticos.push({
                idUnico: `${mat}_${cod}`,
                matricula: mat,
                nome,
                funcao,
                ghe: ghe || 'N/I',
                gheLabel: obterNomeGhePorCodigo(ghe),
                setor: colab.setor || '',
                treinamentoCod: cod,
                treinamentoNome: nomeTreinamento,
                origens: exig.origens.join(', '),
                obrigatorioAdmissao: exig.obrigatorio_admissao,
                status,
                statusLabel,
                badgeClass,
                dataTreinamento,
                dataVencimento,
                situacaoTexto,
                diasAtraso,
                diasRestantes
            });
        });
    });

    return diagnosticos;
}

function popularFiltrosDiagnosticoGaps(todosDiagnosticos) {
    const selGhe = document.getElementById('gapFiltroGheSelect');
    const selFuncao = document.getElementById('gapFiltroFuncaoSelect');

    if (selGhe && selGhe.options.length <= 1) {
        const ghesPresentes = new Set();
        todosDiagnosticos.forEach(d => { if (d.ghe && d.ghe !== 'N/I') ghesPresentes.add(d.ghe); });
        Array.from(ghesPresentes).sort().forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = obterNomeGhePorCodigo(g);
            selGhe.appendChild(opt);
        });
    }

    if (selFuncao && selFuncao.options.length <= 1) {
        const funcoesPresentes = new Set();
        todosDiagnosticos.forEach(d => { if (d.funcao) funcoesPresentes.add(d.funcao); });
        Array.from(funcoesPresentes).sort().forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            selFuncao.appendChild(opt);
        });
    }
}

function onGapFiltroChange() {
    renderTreinamentoGapsTab();
}

function limparFiltrosDiagnosticoGaps() {
    const selGhe = document.getElementById('gapFiltroGheSelect');
    const selFunc = document.getElementById('gapFiltroFuncaoSelect');
    const selStatus = document.getElementById('gapFiltroStatusSelect');
    const inputBusca = document.getElementById('gapFiltroBuscaInput');

    if (selGhe) selGhe.value = '';
    if (selFunc) selFunc.value = '';
    if (selStatus) selStatus.value = 'todas_pendencias';
    if (inputBusca) inputBusca.value = '';

    renderTreinamentoGapsTab();
}

function alternarMarcarTodosGaps(marcar) {
    document.querySelectorAll('.chk-gap-item').forEach(chk => {
        chk.checked = marcar;
        const id = chk.dataset.idUnico;
        if (id) {
            if (marcar) gapSelecionados.add(id);
            else gapSelecionados.delete(id);
        }
    });
    atualizarContadorGapsSelecionados();
}

function alternarSelecaoGapItem(idUnico, marcar) {
    if (marcar) gapSelecionados.add(idUnico);
    else gapSelecionados.delete(idUnico);
    atualizarContadorGapsSelecionados();
}

function atualizarContadorGapsSelecionados() {
    const count = gapSelecionados.size;
    const countEl = document.getElementById('countGapsSelecionados');
    const btnConvocar = document.getElementById('btnConvocarLoteGaps');
    if (countEl) countEl.textContent = String(count);
    if (btnConvocar) btnConvocar.disabled = count === 0;
}

function renderTreinamentoGapsTab() {
    const tbody = document.getElementById('tabelaDiagnosticoGapsCorpo');
    const totalContadorEl = document.getElementById('gapTotalFiltradoContador');
    if (!tbody) return;

    if ((!allTreinamentosRegras || allTreinamentosRegras.length === 0) || (!allEfetivo || allEfetivo.length === 0)) {
        if (typeof recarregarRegrasRecomendacao === 'function') {
            recarregarRegrasRecomendacao().then(() => {
                if (document.getElementById('treinSubtab-gaps')?.style.display === 'block') {
                    renderTreinamentoGapsTab();
                }
            });
        }
    }

    const todosDiagnosticos = calcularDiagnosticoGapsTreinamentos();
    popularFiltrosDiagnosticoGaps(todosDiagnosticos);

    // Indicadores globais (KPIs)
    const totalExigencias = todosDiagnosticos.length;
    const conformesCount = todosDiagnosticos.filter(d => d.status === 'conforme').length;
    const pendentesCount = todosDiagnosticos.filter(d => d.status === 'pendente').length;
    const vencidosCount = todosDiagnosticos.filter(d => d.status === 'vencido').length;
    const taxaConformidade = totalExigencias > 0 ? Math.round((conformesCount / totalExigencias) * 100) : 0;

    const kpiTotal = document.getElementById('kpiGapTotalExigencias');
    const kpiConf = document.getElementById('kpiGapConformes');
    const kpiPend = document.getElementById('kpiGapPendentes');
    const kpiVenc = document.getElementById('kpiGapVencidos');

    if (kpiTotal) kpiTotal.textContent = String(totalExigencias);
    if (kpiConf) kpiConf.textContent = `${conformesCount} (${taxaConformidade}%)`;
    if (kpiPend) kpiPend.textContent = String(pendentesCount);
    if (kpiVenc) kpiVenc.textContent = String(vencidosCount);

    const filtroGhe = document.getElementById('gapFiltroGheSelect')?.value || '';
    const filtroFuncao = document.getElementById('gapFiltroFuncaoSelect')?.value || '';
    const filtroStatus = document.getElementById('gapFiltroStatusSelect')?.value || 'todas_pendencias';
    const termoBusca = (document.getElementById('gapFiltroBuscaInput')?.value || '').trim().toLowerCase();

    const filtrados = todosDiagnosticos.filter(d => {
        if (filtroGhe && d.ghe !== filtroGhe) return false;
        if (filtroFuncao && d.funcao !== filtroFuncao) return false;

        if (filtroStatus === 'todas_pendencias' && d.status === 'conforme') return false;
        if (filtroStatus === 'pendente' && d.status !== 'pendente') return false;
        if (filtroStatus === 'vencido' && d.status !== 'vencido') return false;
        if (filtroStatus === 'conforme' && d.status !== 'conforme') return false;

        if (termoBusca) {
            const nomeL = d.nome.toLowerCase();
            const matL = d.matricula.toLowerCase();
            const funcL = d.funcao.toLowerCase();
            const cursoL = d.treinamentoNome.toLowerCase();
            if (!nomeL.includes(termoBusca) && !matL.includes(termoBusca) && !funcL.includes(termoBusca) && !cursoL.includes(termoBusca)) {
                return false;
            }
        }
        return true;
    });

    if (totalContadorEl) totalContadorEl.textContent = String(filtrados.length);

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:36px 16px; color:var(--text-light);">
                    <div style="font-size:28px; margin-bottom:8px;">🎯</div>
                    <div style="font-weight:700; font-size:14px; color:var(--text);">Nenhuma pendência ou registro encontrado</div>
                    <div style="font-size:12px; margin-top:4px;">
                        ${allTreinamentosRegras.length === 0 ? 'Nenhuma regra de recomendação cadastrada ainda. Configure na aba <b>Regras de Recomendação</b>.' : 'Todos os colaboradores atendem aos critérios filtrados!'}
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtrados.map(d => {
        const isChecked = gapSelecionados.has(d.idUnico);
        const podeConvocar = d.status !== 'conforme';

        return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 12px; text-align:center;">
                    ${podeConvocar ? `<input type="checkbox" class="chk-gap-item" data-id-unico="${escapeHTML(d.idUnico)}" ${isChecked ? 'checked' : ''} onchange="alternarSelecaoGapItem('${escapeHTML(d.idUnico)}', this.checked)">` : '—'}
                </td>
                <td style="padding:10px 12px; font-weight:700; color:var(--text-light); font-family:monospace;">${escapeHTML(d.matricula)}</td>
                <td style="padding:10px 12px;">
                    <div style="font-weight:700; color:var(--text);">${escapeHTML(d.nome)}</div>
                </td>
                <td style="padding:10px 12px; color:var(--text-light);">${escapeHTML(d.funcao || '—')}</td>
                <td style="padding:10px 12px;">
                    <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:var(--bg); border:1px solid var(--border);">${escapeHTML(d.ghe)}</span>
                </td>
                <td style="padding:10px 12px;">
                    <div style="font-weight:600; color:var(--text);">${escapeHTML(d.treinamentoNome)}</div>
                    <div style="font-size:11px; color:var(--text-light);">Cód: ${escapeHTML(d.treinamentoCod)}</div>
                </td>
                <td style="padding:10px 12px; font-size:11.5px; color:var(--text-light);">${escapeHTML(d.origens)}</td>
                <td style="padding:10px 12px; text-align:center;">
                    <span class="${d.badgeClass}">${d.status === 'conforme' ? '🟢' : (d.status === 'vencido' ? '🔴' : '🟡')} ${d.statusLabel}</span>
                </td>
                <td style="padding:10px 12px; font-size:12px;">
                    ${escapeHTML(d.situacaoTexto)}
                </td>
                <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                    ${podeConvocar ? `
                        <button class="db-apply-btn" onclick="convocarColaboradorGapIndividual('${escapeHTML(d.matricula)}', '${escapeHTML(d.treinamentoCod)}')" style="padding:4px 9px; font-size:11.5px; font-weight:700;" title="Convocar este colaborador">
                            ➕ Convocar
                        </button>
                    ` : `
                        <span style="font-size:11px; color:var(--success); font-weight:700;">Em dia</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    atualizarContadorGapsSelecionados();
}

// ------------------------------------------------------------------------------
// CONVOCAÇÃO RÁPIDA E EM LOTE PARA TREINAMENTOS
// ------------------------------------------------------------------------------
async function convocarColaboradorGapIndividual(matricula, codTreinamento) {
    const colab = allEfetivo.find(e => String(e.id) === String(matricula));
    if (!colab) {
        alert('Colaborador não localizado no cadastro.');
        return;
    }
    const nomeCurso = obterNomeCursoCatalogo(codTreinamento);

    const dataPadrao = new Date().toISOString().slice(0, 10);
    const dataTurma = prompt(`Informe a data programada para a turma de "${nomeCurso}":`, dataPadrao);
    if (!dataTurma) return;

    const row = {
        id: `${matricula}_${codTreinamento}_${dataTurma}`,
        matricula: String(matricula),
        nome: colab.nome,
        funcao: colab.funcao,
        setor: colab.setor,
        treinamento_cod: String(codTreinamento),
        treinamento_nome: nomeCurso,
        data_treinamento: dataTurma,
        presente: false
    };

    try {
        await supabaseUpsert('treinamentos_convocados', [row]);
        invalidarCacheTabela('treinamentos_convocados');
        alert(`✅ Convocação realizada com sucesso para ${colab.nome} no treinamento ${nomeCurso} em ${formatarDataIsoBR(dataTurma)}!`);
    } catch (err) {
        console.error('Erro ao convocar colaborador:', err);
        alert('Falha ao registrar convocação: ' + err.message);
    }
}

function abrirModalConvocacaoLoteGaps() {
    if (gapSelecionados.size === 0) {
        alert('Selecione ao menos um colaborador com pendência para convocar em lote.');
        return;
    }
    const modal = document.getElementById('modalConvocacaoLoteGaps');
    const totalEl = document.getElementById('modalLoteTotalSelecionados');
    const dataInput = document.getElementById('modalLoteDataPrevista');
    const statusEl = document.getElementById('modalLote_statusMsg');

    if (totalEl) totalEl.textContent = String(gapSelecionados.size);
    if (dataInput && !dataInput.value) {
        dataInput.value = new Date().toISOString().slice(0, 10);
    }
    if (statusEl) statusEl.textContent = '';
    if (modal) modal.style.display = 'flex';
}

function fecharModalConvocacaoLoteGaps() {
    const modal = document.getElementById('modalConvocacaoLoteGaps');
    if (modal) modal.style.display = 'none';
}

async function confirmarConvocacaoLoteGaps() {
    const dataInput = document.getElementById('modalLoteDataPrevista');
    const statusEl = document.getElementById('modalLote_statusMsg');
    const btnConfirmar = document.getElementById('btnConfirmarConvocacaoLote');
    const dataTurma = dataInput?.value;

    if (!dataTurma) {
        alert('Por favor, informe a data programada para o treinamento.');
        return;
    }

    if (gapSelecionados.size === 0) {
        alert('Nenhum item selecionado.');
        return;
    }

    const todosDiagnosticos = calcularDiagnosticoGapsTreinamentos();
    const rows = [];

    gapSelecionados.forEach(idUnico => {
        const item = todosDiagnosticos.find(d => d.idUnico === idUnico);
        if (item) {
            rows.push({
                id: `${item.matricula}_${item.treinamentoCod}_${dataTurma}`,
                matricula: item.matricula,
                nome: item.nome,
                funcao: item.funcao,
                setor: item.setor,
                treinamento_cod: item.treinamentoCod,
                treinamento_nome: item.treinamentoNome,
                data_treinamento: dataTurma,
                presente: false
            });
        }
    });

    if (statusEl) {
        statusEl.textContent = `Enviando ${rows.length} convocação(ões) ao banco...`;
        statusEl.style.color = 'var(--text-light)';
    }
    if (btnConfirmar) btnConfirmar.disabled = true;

    try {
        await supabaseUpsert('treinamentos_convocados', rows);
        invalidarCacheTabela('treinamentos_convocados');
        alert(`✅ ${rows.length} convocação(ões) registradas com sucesso para a data ${formatarDataIsoBR(dataTurma)}!`);
        gapSelecionados.clear();
        fecharModalConvocacaoLoteGaps();
        renderTreinamentoGapsTab();
    } catch (err) {
        console.error('Erro ao convocar em lote:', err);
        if (statusEl) {
            statusEl.textContent = '❌ Falha: ' + err.message;
            statusEl.style.color = 'var(--danger)';
        }
        alert('Falha ao gravar convocações: ' + err.message);
    } finally {
        if (btnConfirmar) btnConfirmar.disabled = false;
    }
}

// ------------------------------------------------------------------------------
// IMPRESSÃO / EXPORTAÇÃO OFICIAL DO DIAGNÓSTICO DE GAPS (NR-01)
// ------------------------------------------------------------------------------
function imprimirDiagnosticoGaps() {
    const todosDiagnosticos = calcularDiagnosticoGapsTreinamentos();

    const filtroGhe = document.getElementById('gapFiltroGheSelect')?.value || '';
    const filtroFuncao = document.getElementById('gapFiltroFuncaoSelect')?.value || '';
    const filtroStatus = document.getElementById('gapFiltroStatusSelect')?.value || 'todas_pendencias';
    const termoBusca = (document.getElementById('gapFiltroBuscaInput')?.value || '').trim().toLowerCase();

    const filtrados = todosDiagnosticos.filter(d => {
        if (filtroGhe && d.ghe !== filtroGhe) return false;
        if (filtroFuncao && d.funcao !== filtroFuncao) return false;
        if (filtroStatus === 'todas_pendencias' && d.status === 'conforme') return false;
        if (filtroStatus === 'pendente' && d.status !== 'pendente') return false;
        if (filtroStatus === 'vencido' && d.status !== 'vencido') return false;
        if (filtroStatus === 'conforme' && d.status !== 'conforme') return false;
        if (termoBusca) {
            const nomeL = d.nome.toLowerCase();
            const matL = d.matricula.toLowerCase();
            const funcL = d.funcao.toLowerCase();
            const cursoL = d.treinamentoNome.toLowerCase();
            if (!nomeL.includes(termoBusca) && !matL.includes(termoBusca) && !funcL.includes(termoBusca) && !cursoL.includes(termoBusca)) return false;
        }
        return true;
    });

    const totalGeral = todosDiagnosticos.length;
    const conformesGeral = todosDiagnosticos.filter(d => d.status === 'conforme').length;
    const pendentesGeral = todosDiagnosticos.filter(d => d.status === 'pendente').length;
    const vencidosGeral = todosDiagnosticos.filter(d => d.status === 'vencido').length;
    const taxaGeral = totalGeral > 0 ? Math.round((conformesGeral / totalGeral) * 100) : 0;

    const dataHoraEmissao = new Date().toLocaleString('pt-BR');

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Diagnóstico de Conformidade e Gaps de Treinamentos - NR-01</title>
            <style>
                @page { size: A4 landscape; margin: 12mm 15mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 0; line-height: 1.4; }
                .rel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
                .rel-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
                .rel-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
                .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
                .kpi-card b { display: block; font-size: 18px; color: #0f172a; margin-top: 2px; }
                .rel-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                .rel-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 700; color: #334155; }
                .rel-table td { border: 1px solid #e2e8f0; padding: 5px 8px; }
                .badge-conf { color: #047857; font-weight: 700; }
                .badge-pend { color: #b45309; font-weight: 700; }
                .badge-venc { color: #b91c1c; font-weight: 700; }
                .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
            </style>
        </head>
        <body>
            <div class="rel-header">
                <div>
                    <h1 class="rel-title">DIAGNÓSTICO DE CONFORMIDADE E GAPS DE TREINAMENTOS (NR-01)</h1>
                    <div class="rel-sub">Consórcio Operador Ramal | Sistema de Gestão de Segurança do Trabalho e Prevenção</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                    Emissão: <strong>${dataHoraEmissao}</strong><br>
                    Filtro: <strong>${escapeHTML(filtroStatus)}</strong>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <span style="font-size: 9px; color:#64748b; text-transform:uppercase;">Total de Exigências</span>
                    <b>${totalGeral}</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #10b981;">
                    <span style="font-size: 9px; color:#047857; text-transform:uppercase;">Conformidade</span>
                    <b style="color:#047857;">${conformesGeral} (${taxaGeral}%)</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #f59e0b;">
                    <span style="font-size: 9px; color:#b45309; text-transform:uppercase;">Pendentes (Admissão)</span>
                    <b style="color:#b45309;">${pendentesGeral}</b>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #ef4444;">
                    <span style="font-size: 9px; color:#b91c1c; text-transform:uppercase;">Vencidos (Reciclagem)</span>
                    <b style="color:#b91c1c;">${vencidosGeral}</b>
                </div>
            </div>

            <table class="rel-table">
                <thead>
                    <tr>
                        <th style="width: 55px;">Matrícula</th>
                        <th>Colaborador</th>
                        <th>Cargo / Função</th>
                        <th>GHE</th>
                        <th>Treinamento Exigido</th>
                        <th>Origem</th>
                        <th style="text-align: center; width: 85px;">Situação</th>
                        <th>Diagnóstico / Prazo</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrados.map(d => `
                        <tr>
                            <td>${escapeHTML(d.matricula)}</td>
                            <td><strong>${escapeHTML(d.nome)}</strong></td>
                            <td>${escapeHTML(d.funcao)}</td>
                            <td>${escapeHTML(d.ghe)}</td>
                            <td>${escapeHTML(d.treinamentoNome)}</td>
                            <td>${escapeHTML(d.origens)}</td>
                            <td style="text-align: center;">
                                <span class="${d.status === 'conforme' ? 'badge-conf' : (d.status === 'vencido' ? 'badge-venc' : 'badge-pend')}">
                                    ${d.statusLabel}
                                </span>
                            </td>
                            <td>${escapeHTML(d.situacaoTexto)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div>Documento gerado pelo Módulo de Inteligência de Treinamentos SST — Atendimento à NR-01 e PGR</div>
                <div>Página 1 / 1</div>
            </div>
        </body>
        </html>
    `;

    abrirDocumentoHtmlParaImpressao(html, 'Diagnóstico de Treinamentos - Gaps e Conformidade NR-01');
}

// ==============================================================================
// EXPOSIÇÃO GLOBAL NO ESCOPO WINDOW COM TRATAMENTO SEGURO CONTRA EXCEÇÕES (NR-01)
// ==============================================================================

// Aliases para máxima compatibilidade com convenções e rotinas de UI
const carregarRegrasTreinamentoRecomendado = recarregarRegrasRecomendacao;
const renderizarTabelaRegrasTrein = renderTreinamentoRegrasTab;
const filtrarRegrasTreinamentoUI = filtrarTipoRegraTab;
const abrirModalNovaRegraTrein = abrirModalNovaRegra;
const fecharModalRegraTrein = fecharModalRegra;
const aoMudarTipoRegraModal = onTipoRegraChange;
const salvarRegraTreinamentoRecomendado = salvarRegraRecomendacao;
const alternarStatusRegraTrein = alternarStatusRegraRecomendacao;
const excluirRegraTrein = excluirRegraRecomendacao;

    // ==============================================================================
    // EXPORTACAO EXPLICITA NO ESCOPO GLOBAL (WINDOW)
    // Garante disponibilidade para eventos inline do index.html e outros modulos
    // ==============================================================================
    if (typeof window !== 'undefined') {
        if (typeof calcularMesAnoPadraoDds === 'function') window.calcularMesAnoPadraoDds = calcularMesAnoPadraoDds;
        if (typeof popularSelectAnos === 'function') window.popularSelectAnos = popularSelectAnos;
        if (typeof popularFiltroAnoTreinamentos === 'function') window.popularFiltroAnoTreinamentos = popularFiltroAnoTreinamentos;
        if (typeof getTreinamentosDateRange === 'function') window.getTreinamentosDateRange = getTreinamentosDateRange;
        if (typeof agendarRenderTreinamentosPanel === 'function') window.agendarRenderTreinamentosPanel = agendarRenderTreinamentosPanel;
        if (typeof setTreinamentosFilter === 'function') window.setTreinamentosFilter = setTreinamentosFilter;
        if (typeof onTreinamentosFiltroAnoMesChange === 'function') window.onTreinamentosFiltroAnoMesChange = onTreinamentosFiltroAnoMesChange;
        if (typeof loadTreinamentosData === 'function') window.loadTreinamentosData = loadTreinamentosData;
        if (typeof showTreinSubtab === 'function') window.showTreinSubtab = showTreinSubtab;
        if (typeof showDdsmaSubtab === 'function') window.showDdsmaSubtab = showDdsmaSubtab;
        if (typeof renderDdsmaRelatorioChecklist === 'function') window.renderDdsmaRelatorioChecklist = renderDdsmaRelatorioChecklist;
        if (typeof marcarTodosRelatorioDdsma === 'function') window.marcarTodosRelatorioDdsma = marcarTodosRelatorioDdsma;
        if (typeof lerSelecaoRelatorioDdsma === 'function') window.lerSelecaoRelatorioDdsma = lerSelecaoRelatorioDdsma;
        if (typeof gerarExcelDdsma === 'function') window.gerarExcelDdsma = gerarExcelDdsma;
        if (typeof gerarPdfDdsma === 'function') window.gerarPdfDdsma = gerarPdfDdsma;
        if (typeof popularFiltroAnoTreinHist === 'function') window.popularFiltroAnoTreinHist = popularFiltroAnoTreinHist;
        if (typeof getTreinHistDateRange === 'function') window.getTreinHistDateRange = getTreinHistDateRange;
        if (typeof setTreinHistFilter === 'function') window.setTreinHistFilter = setTreinHistFilter;
        if (typeof onTreinHistFiltroAnoMesChange === 'function') window.onTreinHistFiltroAnoMesChange = onTreinHistFiltroAnoMesChange;
        if (typeof toggleTreinHistDetalhe === 'function') window.toggleTreinHistDetalhe = toggleTreinHistDetalhe;
        if (typeof abrirSessaoNoRegistro === 'function') window.abrirSessaoNoRegistro = abrirSessaoNoRegistro;
        if (typeof renderTreinHistLista === 'function') window.renderTreinHistLista = renderTreinHistLista;
        if (typeof renderTreinamentosPanel === 'function') window.renderTreinamentosPanel = renderTreinamentosPanel;
        if (typeof renderListaTreinAderencia === 'function') window.renderListaTreinAderencia = renderListaTreinAderencia;
        if (typeof renderCumprimentoCronogramaEPresenca === 'function') window.renderCumprimentoCronogramaEPresenca = renderCumprimentoCronogramaEPresenca;
        if (typeof renderListaTreinColaboradoresPeriodo === 'function') window.renderListaTreinColaboradoresPeriodo = renderListaTreinColaboradoresPeriodo;
        if (typeof toggleSelecaoTreinColabPeriodo === 'function') window.toggleSelecaoTreinColabPeriodo = toggleSelecaoTreinColabPeriodo;
        if (typeof toggleSelecionarTodosTreinColabPeriodo === 'function') window.toggleSelecionarTodosTreinColabPeriodo = toggleSelecionarTodosTreinColabPeriodo;
        if (typeof atualizarBarraSelecaoTreinColabPeriodo === 'function') window.atualizarBarraSelecaoTreinColabPeriodo = atualizarBarraSelecaoTreinColabPeriodo;
        if (typeof excluirSelecionadosTreinColabPeriodo === 'function') window.excluirSelecionadosTreinColabPeriodo = excluirSelecionadosTreinColabPeriodo;
        if (typeof limparBuscaTreinColabPeriodo === 'function') window.limparBuscaTreinColabPeriodo = limparBuscaTreinColabPeriodo;
        if (typeof excluirTreinamentoRealizado === 'function') window.excluirTreinamentoRealizado = excluirTreinamentoRealizado;
        if (typeof excluirTreinamentoRealizadoHist === 'function') window.excluirTreinamentoRealizadoHist = excluirTreinamentoRealizadoHist;
        if (typeof abrirModalEditarSessaoTreinamento === 'function') window.abrirModalEditarSessaoTreinamento = abrirModalEditarSessaoTreinamento;
        if (typeof fecharModalEditarSessaoTreinamento === 'function') window.fecharModalEditarSessaoTreinamento = fecharModalEditarSessaoTreinamento;
        if (typeof aoMudarNovaDataSessao === 'function') window.aoMudarNovaDataSessao = aoMudarNovaDataSessao;
        if (typeof confirmarAlteracaoDataSessao === 'function') window.confirmarAlteracaoDataSessao = confirmarAlteracaoDataSessao;
        if (typeof parseDataBR === 'function') window.parseDataBR = parseDataBR;
        if (typeof baixarCSV === 'function') window.baixarCSV = baixarCSV;
        if (typeof exportarTreinamentosCSV === 'function') window.exportarTreinamentosCSV = exportarTreinamentosCSV;
        if (typeof exportarEfetivoCSV === 'function') window.exportarEfetivoCSV = exportarEfetivoCSV;
        if (typeof importarTreinamentosCSV === 'function') window.importarTreinamentosCSV = importarTreinamentosCSV;
        if (typeof diaDaSemana === 'function') window.diaDaSemana = diaDaSemana;
        if (typeof popularFiltroAnoCronograma === 'function') window.popularFiltroAnoCronograma = popularFiltroAnoCronograma;
        if (typeof onCronogramaFiltroChange === 'function') window.onCronogramaFiltroChange = onCronogramaFiltroChange;
        if (typeof setCronogramaFiltroStatus === 'function') window.setCronogramaFiltroStatus = setCronogramaFiltroStatus;
        if (typeof limparFiltroCronograma === 'function') window.limparFiltroCronograma = limparFiltroCronograma;
        if (typeof cronogramaItensFiltrados === 'function') window.cronogramaItensFiltrados = cronogramaItensFiltrados;
        if (typeof imprimirCronogramaFiltro === 'function') window.imprimirCronogramaFiltro = imprimirCronogramaFiltro;
        if (typeof renderCronogramaLista === 'function') window.renderCronogramaLista = renderCronogramaLista;
        if (typeof sincronizarPastasDriveCronograma === 'function') window.sincronizarPastasDriveCronograma = sincronizarPastasDriveCronograma;
        if (typeof limparFormCronograma === 'function') window.limparFormCronograma = limparFormCronograma;
        if (typeof abrirFormCronograma === 'function') window.abrirFormCronograma = abrirFormCronograma;
        if (typeof fecharFormCronograma === 'function') window.fecharFormCronograma = fecharFormCronograma;
        if (typeof salvarItemCronograma === 'function') window.salvarItemCronograma = salvarItemCronograma;
        if (typeof excluirItemCronograma === 'function') window.excluirItemCronograma = excluirItemCronograma;
        if (typeof equipeDaFrente === 'function') window.equipeDaFrente = equipeDaFrente;
        if (typeof todasFrentesAtivas === 'function') window.todasFrentesAtivas = todasFrentesAtivas;
        if (typeof resolverFrenteDds === 'function') window.resolverFrenteDds = resolverFrenteDds;
        if (typeof frentesAtivasDds === 'function') window.frentesAtivasDds = frentesAtivasDds;
        if (typeof lancarPresencaDoCronograma === 'function') window.lancarPresencaDoCronograma = lancarPresencaDoCronograma;
        if (typeof gerarListasCronogramaMes === 'function') window.gerarListasCronogramaMes = gerarListasCronogramaMes;
        if (typeof abrirFormLancarTreinamento === 'function') window.abrirFormLancarTreinamento = abrirFormLancarTreinamento;
        if (typeof fecharFormLancarTreinamento === 'function') window.fecharFormLancarTreinamento = fecharFormLancarTreinamento;
        if (typeof refreshCatalogoDatalist === 'function') window.refreshCatalogoDatalist = refreshCatalogoDatalist;
        if (typeof popularCatalogoDatalist === 'function') window.popularCatalogoDatalist = popularCatalogoDatalist;
        if (typeof popularResponsavelSelect === 'function') window.popularResponsavelSelect = popularResponsavelSelect;
        if (typeof extrairCodigoTreinamento === 'function') window.extrairCodigoTreinamento = extrairCodigoTreinamento;
        if (typeof onLancTreinCodigoChange === 'function') window.onLancTreinCodigoChange = onLancTreinCodigoChange;
        if (typeof programarRenovacaoNR === 'function') window.programarRenovacaoNR = programarRenovacaoNR;
        if (typeof carregarEquipeResponsavel === 'function') window.carregarEquipeResponsavel = carregarEquipeResponsavel;
        if (typeof filterAddColabLista === 'function') window.filterAddColabLista = filterAddColabLista;
        if (typeof adicionarColabAvulso === 'function') window.adicionarColabAvulso = adicionarColabAvulso;
        if (typeof removerColabLista === 'function') window.removerColabLista = removerColabLista;
        if (typeof toggleColabPresenca === 'function') window.toggleColabPresenca = toggleColabPresenca;
        if (typeof atualizarContagemPresenca === 'function') window.atualizarContagemPresenca = atualizarContagemPresenca;
        if (typeof renderListaPresencaEquipe === 'function') window.renderListaPresencaEquipe = renderListaPresencaEquipe;
        if (typeof salvarLancamentoTreinamento === 'function') window.salvarLancamentoTreinamento = salvarLancamentoTreinamento;
        if (typeof popularDdsFrenteSelect === 'function') window.popularDdsFrenteSelect = popularDdsFrenteSelect;
        if (typeof popularDdsTemaDatalist === 'function') window.popularDdsTemaDatalist = popularDdsTemaDatalist;
        if (typeof onLancDdsDataChange === 'function') window.onLancDdsDataChange = onLancDdsDataChange;
        if (typeof abrirFormLancarDds === 'function') window.abrirFormLancarDds = abrirFormLancarDds;
        if (typeof carregarEquipeFrenteDds === 'function') window.carregarEquipeFrenteDds = carregarEquipeFrenteDds;
        if (typeof filterDdsAddColabLista === 'function') window.filterDdsAddColabLista = filterDdsAddColabLista;
        if (typeof adicionarDdsColabAvulso === 'function') window.adicionarDdsColabAvulso = adicionarDdsColabAvulso;
        if (typeof removerDdsColabLista === 'function') window.removerDdsColabLista = removerDdsColabLista;
        if (typeof toggleDdsColabPresenca === 'function') window.toggleDdsColabPresenca = toggleDdsColabPresenca;
        if (typeof atualizarContagemPresencaDds === 'function') window.atualizarContagemPresencaDds = atualizarContagemPresencaDds;
        if (typeof selecionarEmociogramaDds === 'function') window.selecionarEmociogramaDds = selecionarEmociogramaDds;
        if (typeof renderListaPresencaDds === 'function') window.renderListaPresencaDds = renderListaPresencaDds;
        if (typeof salvarLancamentoDds === 'function') window.salvarLancamentoDds = salvarLancamentoDds;
        if (typeof loteKeyDds === 'function') window.loteKeyDds = loteKeyDds;
        if (typeof garantirAnexosSmsCarregados === 'function') window.garantirAnexosSmsCarregados = garantirAnexosSmsCarregados;
        if (typeof anexosDoRegistro === 'function') window.anexosDoRegistro = anexosDoRegistro;
        if (typeof labelContagemAnexos === 'function') window.labelContagemAnexos = labelContagemAnexos;
        if (typeof popularFiltroSetorDds === 'function') window.popularFiltroSetorDds = popularFiltroSetorDds;
        if (typeof limparFiltrosDdsLancamentos === 'function') window.limparFiltrosDdsLancamentos = limparFiltrosDdsLancamentos;
        if (typeof configurarFiltrosDdsListeners === 'function') window.configurarFiltrosDdsListeners = configurarFiltrosDdsListeners;
        if (typeof lotesRecentesDds === 'function') window.lotesRecentesDds = lotesRecentesDds;
        if (typeof renderDdsLancamentosRecentes === 'function') window.renderDdsLancamentosRecentes = renderDdsLancamentosRecentes;
        if (typeof excluirLoteDds === 'function') window.excluirLoteDds = excluirLoteDds;
        if (typeof editarLoteDds === 'function') window.editarLoteDds = editarLoteDds;
        if (typeof toggleLancarDdsSemana === 'function') window.toggleLancarDdsSemana = toggleLancarDdsSemana;
        if (typeof popularDdsSemanaFrenteSelect === 'function') window.popularDdsSemanaFrenteSelect = popularDdsSemanaFrenteSelect;
        if (typeof abrirFormLancarDdsSemana === 'function') window.abrirFormLancarDdsSemana = abrirFormLancarDdsSemana;
        if (typeof onLancDdsSemanaFrenteOuDataChange === 'function') window.onLancDdsSemanaFrenteOuDataChange = onLancDdsSemanaFrenteOuDataChange;
        if (typeof onLancDdsSemanaTemaChange === 'function') window.onLancDdsSemanaTemaChange = onLancDdsSemanaTemaChange;
        if (typeof renderLancDdsSemanaTemas === 'function') window.renderLancDdsSemanaTemas = renderLancDdsSemanaTemas;
        if (typeof cicloEstadoDdsSemana === 'function') window.cicloEstadoDdsSemana = cicloEstadoDdsSemana;
        if (typeof renderLancDdsSemanaGrade === 'function') window.renderLancDdsSemanaGrade = renderLancDdsSemanaGrade;
        if (typeof onLancDdsSemanaAcaoChange === 'function') window.onLancDdsSemanaAcaoChange = onLancDdsSemanaAcaoChange;
        if (typeof renderLancDdsSemanaAcoes === 'function') window.renderLancDdsSemanaAcoes = renderLancDdsSemanaAcoes;
        if (typeof salvarLancamentoDdsSemana === 'function') window.salvarLancamentoDdsSemana = salvarLancamentoDdsSemana;
        if (typeof diasUteisDoMes === 'function') window.diasUteisDoMes = diasUteisDoMes;
        if (typeof popularFiltroDdsCalendario === 'function') window.popularFiltroDdsCalendario = popularFiltroDdsCalendario;
        if (typeof onDdsCalendarioFiltroChange === 'function') window.onDdsCalendarioFiltroChange = onDdsCalendarioFiltroChange;
        if (typeof editarDdsTemaDia === 'function') window.editarDdsTemaDia = editarDdsTemaDia;
        if (typeof cancelarEdicaoDdsTemaDia === 'function') window.cancelarEdicaoDdsTemaDia = cancelarEdicaoDdsTemaDia;
        if (typeof sincronizarLancDdsTemaSeMesmaData === 'function') window.sincronizarLancDdsTemaSeMesmaData = sincronizarLancDdsTemaSeMesmaData;
        if (typeof salvarDdsTemaDia === 'function') window.salvarDdsTemaDia = salvarDdsTemaDia;
        if (typeof renderDdsCalendarioTemas === 'function') window.renderDdsCalendarioTemas = renderDdsCalendarioTemas;
        if (typeof abrirAdicionarDdsTemaDia === 'function') window.abrirAdicionarDdsTemaDia = abrirAdicionarDdsTemaDia;
        if (typeof fecharAdicionarDdsTemaDia === 'function') window.fecharAdicionarDdsTemaDia = fecharAdicionarDdsTemaDia;
        if (typeof salvarNovoDdsTemaDia === 'function') window.salvarNovoDdsTemaDia = salvarNovoDdsTemaDia;
        if (typeof toISODateLocal === 'function') window.toISODateLocal = toISODateLocal;
        if (typeof segundaDaSemana === 'function') window.segundaDaSemana = segundaDaSemana;
        if (typeof proximaSemanaParaFecharDds === 'function') window.proximaSemanaParaFecharDds = proximaSemanaParaFecharDds;
        if (typeof diasComDdsNaSemana === 'function') window.diasComDdsNaSemana = diasComDdsNaSemana;
        if (typeof onDdsFechamentoFrenteChange === 'function') window.onDdsFechamentoFrenteChange = onDdsFechamentoFrenteChange;
        if (typeof renderDdsFechamentoSemanal === 'function') window.renderDdsFechamentoSemanal = renderDdsFechamentoSemanal;
        if (typeof confirmarFechamentoDds === 'function') window.confirmarFechamentoDds = confirmarFechamentoDds;
        if (typeof renderDdsFechamentosLista === 'function') window.renderDdsFechamentosLista = renderDdsFechamentosLista;
        if (typeof popularFiltroAnoDds === 'function') window.popularFiltroAnoDds = popularFiltroAnoDds;
        if (typeof getDdsDateRange === 'function') window.getDdsDateRange = getDdsDateRange;
        if (typeof setDdsFilter === 'function') window.setDdsFilter = setDdsFilter;
        if (typeof onDdsFiltroAnoMesChange === 'function') window.onDdsFiltroAnoMesChange = onDdsFiltroAnoMesChange;
        if (typeof diasDoIntervaloDds === 'function') window.diasDoIntervaloDds = diasDoIntervaloDds;
        if (typeof tabelaControleDds === 'function') window.tabelaControleDds = tabelaControleDds;
        if (typeof renderDdsTabelaControle === 'function') window.renderDdsTabelaControle = renderDdsTabelaControle;
        if (typeof renderAcoesTratativasPendentesDds === 'function') window.renderAcoesTratativasPendentesDds = renderAcoesTratativasPendentesDds;
        if (typeof renderDdsGerenciarFrentes === 'function') window.renderDdsGerenciarFrentes = renderDdsGerenciarFrentes;
        if (typeof toggleFrenteDdsAtiva === 'function') window.toggleFrenteDdsAtiva = toggleFrenteDdsAtiva;
        if (typeof adicionarFrenteDdsManual === 'function') window.adicionarFrenteDdsManual = adicionarFrenteDdsManual;
        if (typeof renderDdsAliasFrentes === 'function') window.renderDdsAliasFrentes = renderDdsAliasFrentes;
        if (typeof mesclarFrenteDds === 'function') window.mesclarFrenteDds = mesclarFrenteDds;
        if (typeof desfazerMesclarFrenteDds === 'function') window.desfazerMesclarFrenteDds = desfazerMesclarFrenteDds;
        if (typeof renderDdsPanel === 'function') window.renderDdsPanel = renderDdsPanel;
        if (typeof carregarConfiguracoesDdsDoSupabase === 'function') window.carregarConfiguracoesDdsDoSupabase = carregarConfiguracoesDdsDoSupabase;
        if (typeof salvarConfiguracoesDdsNoSupabase === 'function') window.salvarConfiguracoesDdsNoSupabase = salvarConfiguracoesDdsNoSupabase;
        if (typeof preencherCamposConfiguracoesDds === 'function') window.preencherCamposConfiguracoesDds = preencherCamposConfiguracoesDds;
        if (typeof atualizarExemploRegraSemana === 'function') window.atualizarExemploRegraSemana = atualizarExemploRegraSemana;
        if (typeof renderDdsConfiguracoes === 'function') window.renderDdsConfiguracoes = renderDdsConfiguracoes;
        if (typeof salvarConfiguracoesDds === 'function') window.salvarConfiguracoesDds = salvarConfiguracoesDds;
        if (typeof restaurarConfiguracoesDdsPadrao === 'function') window.restaurarConfiguracoesDdsPadrao = restaurarConfiguracoesDdsPadrao;
        if (typeof obterSemanasDoMes === 'function') window.obterSemanasDoMes = obterSemanasDoMes;
        if (typeof inicializarDdsLote === 'function') window.inicializarDdsLote = inicializarDdsLote;
        if (typeof popularSelectSemanasDdsLote === 'function') window.popularSelectSemanasDdsLote = popularSelectSemanasDdsLote;
        if (typeof popularSelectTemasDdsLote === 'function') window.popularSelectTemasDdsLote = popularSelectTemasDdsLote;
        if (typeof renderDdsLoteFrentesCheckboxes === 'function') window.renderDdsLoteFrentesCheckboxes = renderDdsLoteFrentesCheckboxes;
        if (typeof atualizarResumoFrentesDdsLote === 'function') window.atualizarResumoFrentesDdsLote = atualizarResumoFrentesDdsLote;
        if (typeof onDdsLoteFrenteCheckboxChange === 'function') window.onDdsLoteFrenteCheckboxChange = onDdsLoteFrenteCheckboxChange;
        if (typeof marcarTodasFrentesDdsLote === 'function') window.marcarTodasFrentesDdsLote = marcarTodasFrentesDdsLote;
        if (typeof onDdsLoteFiltroMesAnoChange === 'function') window.onDdsLoteFiltroMesAnoChange = onDdsLoteFiltroMesAnoChange;
        if (typeof onDdsLoteFiltroSemanaChange === 'function') window.onDdsLoteFiltroSemanaChange = onDdsLoteFiltroSemanaChange;
        if (typeof onDdsLoteFiltroTemaChange === 'function') window.onDdsLoteFiltroTemaChange = onDdsLoteFiltroTemaChange;
        if (typeof limparFiltrosDdsLote === 'function') window.limparFiltrosDdsLote = limparFiltrosDdsLote;
        if (typeof itensDdsLoteFiltrados === 'function') window.itensDdsLoteFiltrados = itensDdsLoteFiltrados;
        if (typeof renderDdsLotePreview === 'function') window.renderDdsLotePreview = renderDdsLotePreview;
        if (typeof atualizarResumoDdsLote === 'function') window.atualizarResumoDdsLote = atualizarResumoDdsLote;
        if (typeof onDdsLoteItemCheckboxChange === 'function') window.onDdsLoteItemCheckboxChange = onDdsLoteItemCheckboxChange;
        if (typeof marcarTodosDdsLote === 'function') window.marcarTodosDdsLote = marcarTodosDdsLote;
        if (typeof construirFolhaFichaDds === 'function') window.construirFolhaFichaDds = construirFolhaFichaDds;
        if (typeof montarDocumentoImpressaoFichasDds === 'function') window.montarDocumentoImpressaoFichasDds = montarDocumentoImpressaoFichasDds;
        if (typeof imprimirFormulariosDdsLote === 'function') window.imprimirFormulariosDdsLote = imprimirFormulariosDdsLote;
        if (typeof imprimirFichaDdsEmBranco === 'function') window.imprimirFichaDdsEmBranco = imprimirFichaDdsEmBranco;
        if (typeof montarHtmlRelatorioDds === 'function') window.montarHtmlRelatorioDds = montarHtmlRelatorioDds;
        if (typeof imprimirRelatorioMensalDds === 'function') window.imprimirRelatorioMensalDds = imprimirRelatorioMensalDds;
        if (typeof imprimirRelatorioSemanalDds === 'function') window.imprimirRelatorioSemanalDds = imprimirRelatorioSemanalDds;
        if (typeof popularRegistroResponsavelNovaSelect === 'function') window.popularRegistroResponsavelNovaSelect = popularRegistroResponsavelNovaSelect;
        if (typeof limparBuscaRegistro === 'function') window.limparBuscaRegistro = limparBuscaRegistro;
        if (typeof onRegistroCodigoChange === 'function') window.onRegistroCodigoChange = onRegistroCodigoChange;
        if (typeof onRegistroDataChange === 'function') window.onRegistroDataChange = onRegistroDataChange;
        if (typeof carregarSessaoRegistro === 'function') window.carregarSessaoRegistro = carregarSessaoRegistro;
        if (typeof carregarSessaoNovaRegistro === 'function') window.carregarSessaoNovaRegistro = carregarSessaoNovaRegistro;
        if (typeof filterRegistroNovaEquipeAddColab === 'function') window.filterRegistroNovaEquipeAddColab = filterRegistroNovaEquipeAddColab;
        if (typeof adicionarRegistroNovaEquipeAvulso === 'function') window.adicionarRegistroNovaEquipeAvulso = adicionarRegistroNovaEquipeAvulso;
        if (typeof removerRegistroNovaEquipeColab === 'function') window.removerRegistroNovaEquipeColab = removerRegistroNovaEquipeColab;
        if (typeof toggleRegistroNovaEquipeColab === 'function') window.toggleRegistroNovaEquipeColab = toggleRegistroNovaEquipeColab;
        if (typeof renderRegistroNovaEquipeList === 'function') window.renderRegistroNovaEquipeList = renderRegistroNovaEquipeList;
        if (typeof popularKitsResponsavelSelect === 'function') window.popularKitsResponsavelSelect = popularKitsResponsavelSelect;
        if (typeof inicializarKitsTab === 'function') window.inicializarKitsTab = inicializarKitsTab;
        if (typeof aplicarDefaultsSessaoKits === 'function') window.aplicarDefaultsSessaoKits = aplicarDefaultsSessaoKits;
        if (typeof kitsMarcarCampoEditado === 'function') window.kitsMarcarCampoEditado = kitsMarcarCampoEditado;
        if (typeof onKitsCodigoChange === 'function') window.onKitsCodigoChange = onKitsCodigoChange;
        if (typeof onKitsDataChange === 'function') window.onKitsDataChange = onKitsDataChange;
        if (typeof carregarKitsEquipeResponsavel === 'function') window.carregarKitsEquipeResponsavel = carregarKitsEquipeResponsavel;
        if (typeof filterKitsAddColab === 'function') window.filterKitsAddColab = filterKitsAddColab;
        if (typeof adicionarKitsColabAvulso === 'function') window.adicionarKitsColabAvulso = adicionarKitsColabAvulso;
        if (typeof removerKitsColabLista === 'function') window.removerKitsColabLista = removerKitsColabLista;
        if (typeof toggleKitsColabPresenca === 'function') window.toggleKitsColabPresenca = toggleKitsColabPresenca;
        if (typeof renderKitsEquipeList === 'function') window.renderKitsEquipeList = renderKitsEquipeList;
        if (typeof contextoKits === 'function') window.contextoKits = contextoKits;
        if (typeof renderKitsDocsIndividuaisList === 'function') window.renderKitsDocsIndividuaisList = renderKitsDocsIndividuaisList;
        if (typeof popularFiltroAnoRegistroLote === 'function') window.popularFiltroAnoRegistroLote = popularFiltroAnoRegistroLote;
        if (typeof renderRegistroLoteFrentesCheckboxes === 'function') window.renderRegistroLoteFrentesCheckboxes = renderRegistroLoteFrentesCheckboxes;
        if (typeof atualizarResumoFrentesLote === 'function') window.atualizarResumoFrentesLote = atualizarResumoFrentesLote;
        if (typeof atualizarResumoLoteCronograma === 'function') window.atualizarResumoLoteCronograma = atualizarResumoLoteCronograma;
        if (typeof onRegistroLoteFrenteCheckboxChange === 'function') window.onRegistroLoteFrenteCheckboxChange = onRegistroLoteFrenteCheckboxChange;
        if (typeof marcarTodasFrentesLote === 'function') window.marcarTodasFrentesLote = marcarTodasFrentesLote;
        if (typeof onRegistroLoteFiltroChange === 'function') window.onRegistroLoteFiltroChange = onRegistroLoteFiltroChange;
        if (typeof limparFiltroRegistroLote === 'function') window.limparFiltroRegistroLote = limparFiltroRegistroLote;
        if (typeof itensLoteCronogramaFiltrados === 'function') window.itensLoteCronogramaFiltrados = itensLoteCronogramaFiltrados;
        if (typeof renderRegistroLotePreview === 'function') window.renderRegistroLotePreview = renderRegistroLotePreview;
        if (typeof toggleRegistroLoteSelecionado === 'function') window.toggleRegistroLoteSelecionado = toggleRegistroLoteSelecionado;
        if (typeof marcarTodosLoteCronograma === 'function') window.marcarTodosLoteCronograma = marcarTodosLoteCronograma;
        if (typeof lerCamposSessaoForm === 'function') window.lerCamposSessaoForm = lerCamposSessaoForm;
        if (typeof salvarDetalhesSessao === 'function') window.salvarDetalhesSessao = salvarDetalhesSessao;
        if (typeof construirFolhaRegistroTreinamento === 'function') window.construirFolhaRegistroTreinamento = construirFolhaRegistroTreinamento;
        if (typeof gerarRegistroTreinamento === 'function') window.gerarRegistroTreinamento = gerarRegistroTreinamento;
        if (typeof gerarListaPorFrenteRegistro === 'function') window.gerarListaPorFrenteRegistro = gerarListaPorFrenteRegistro;
        if (typeof renderRegistroDocsIndividuaisList === 'function') window.renderRegistroDocsIndividuaisList = renderRegistroDocsIndividuaisList;
        if (typeof blocoAssinatura === 'function') window.blocoAssinatura = blocoAssinatura;
        if (typeof construirFolhaCertificado === 'function') window.construirFolhaCertificado = construirFolhaCertificado;
        if (typeof construirFolhaDeclaracaoIntegracao === 'function') window.construirFolhaDeclaracaoIntegracao = construirFolhaDeclaracaoIntegracao;
        if (typeof construirFolhaTermoRecusa === 'function') window.construirFolhaTermoRecusa = construirFolhaTermoRecusa;
        if (typeof contextoRegistroPadrao === 'function') window.contextoRegistroPadrao = contextoRegistroPadrao;
        if (typeof gerarCertificadoIndividual === 'function') window.gerarCertificadoIndividual = gerarCertificadoIndividual;
        if (typeof gerarCertificadosTurma === 'function') window.gerarCertificadosTurma = gerarCertificadosTurma;
        if (typeof abrirModalEmissaoCertificado === 'function') window.abrirModalEmissaoCertificado = abrirModalEmissaoCertificado;
        if (typeof abrirModalEmissaoCertificadoLote === 'function') window.abrirModalEmissaoCertificadoLote = abrirModalEmissaoCertificadoLote;
        if (typeof fecharModalEmissaoCertificado === 'function') window.fecharModalEmissaoCertificado = fecharModalEmissaoCertificado;
        if (typeof certModalAoMudarAlvo === 'function') window.certModalAoMudarAlvo = certModalAoMudarAlvo;
        if (typeof certModalAtualizarBotaoTexto === 'function') window.certModalAtualizarBotaoTexto = certModalAtualizarBotaoTexto;
        if (typeof certModalCarregarPadraoNr18 === 'function') window.certModalCarregarPadraoNr18 = certModalCarregarPadraoNr18;
        if (typeof certModalRestaurarCatalogo === 'function') window.certModalRestaurarCatalogo = certModalRestaurarCatalogo;
        if (typeof executarEmissaoCertificadoModal === 'function') window.executarEmissaoCertificadoModal = executarEmissaoCertificadoModal;
        if (typeof gerarOrdemServicoIndividual === 'function') window.gerarOrdemServicoIndividual = gerarOrdemServicoIndividual;
        if (typeof gerarDeclaracaoIntegracaoIndividual === 'function') window.gerarDeclaracaoIntegracaoIndividual = gerarDeclaracaoIntegracaoIndividual;
        if (typeof gerarTermoRecusaIndividual === 'function') window.gerarTermoRecusaIndividual = gerarTermoRecusaIndividual;
        if (typeof gerarKitCompletoIntegracao === 'function') window.gerarKitCompletoIntegracao = gerarKitCompletoIntegracao;
        if (typeof atualizarVisibilidadeProvaWrap === 'function') window.atualizarVisibilidadeProvaWrap = atualizarVisibilidadeProvaWrap;
        if (typeof colaboradoresDaSessaoAtual === 'function') window.colaboradoresDaSessaoAtual = colaboradoresDaSessaoAtual;
        if (typeof gerarProvaTurma === 'function') window.gerarProvaTurma = gerarProvaTurma;
        if (typeof gerarGabaritoProva === 'function') window.gerarGabaritoProva = gerarGabaritoProva;
        if (typeof normalizarTextoCargoBasico === 'function') window.normalizarTextoCargoBasico = normalizarTextoCargoBasico;
        if (typeof normalizarTextoCargo === 'function') window.normalizarTextoCargo = normalizarTextoCargo;
        if (typeof resolverCargoInfoDoColaborador === 'function') window.resolverCargoInfoDoColaborador = resolverCargoInfoDoColaborador;
        if (typeof avaliarCorrespondenciaCargoOs === 'function') window.avaliarCorrespondenciaCargoOs = avaliarCorrespondenciaCargoOs;
        if (typeof textoAvisoCargoOs === 'function') window.textoAvisoCargoOs = textoAvisoCargoOs;
        if (typeof construirFolhaOrdemServico === 'function') window.construirFolhaOrdemServico = construirFolhaOrdemServico;
        if (typeof abrirDocumentoBlob === 'function') window.abrirDocumentoBlob = abrirDocumentoBlob;
        if (typeof popularEquipesResponsavelDatalist === 'function') window.popularEquipesResponsavelDatalist = popularEquipesResponsavelDatalist;
        if (typeof limparBuscaEquipes === 'function') window.limparBuscaEquipes = limparBuscaEquipes;
        if (typeof renderEquipeAtual === 'function') window.renderEquipeAtual = renderEquipeAtual;
        if (typeof toggleRenomearEquipe === 'function') window.toggleRenomearEquipe = toggleRenomearEquipe;
        if (typeof renomearEquipeAtual === 'function') window.renomearEquipeAtual = renomearEquipeAtual;
        if (typeof editarColaboradorDaEquipe === 'function') window.editarColaboradorDaEquipe = editarColaboradorDaEquipe;
        if (typeof filterEquipesAddColab === 'function') window.filterEquipesAddColab = filterEquipesAddColab;
        if (typeof salvarResponsavelColaborador === 'function') window.salvarResponsavelColaborador = salvarResponsavelColaborador;
        if (typeof adicionarAEquipe === 'function') window.adicionarAEquipe = adicionarAEquipe;
        if (typeof removerDaEquipe === 'function') window.removerDaEquipe = removerDaEquipe;
        if (typeof renderCatalogoResumo === 'function') window.renderCatalogoResumo = renderCatalogoResumo;
        if (typeof setCatalogoFiltroValidade === 'function') window.setCatalogoFiltroValidade = setCatalogoFiltroValidade;
        if (typeof filterCatalogoTreinamentos === 'function') window.filterCatalogoTreinamentos = filterCatalogoTreinamentos;
        if (typeof questaoVazia === 'function') window.questaoVazia = questaoVazia;
        if (typeof adicionarQuestaoCatalogoForm === 'function') window.adicionarQuestaoCatalogoForm = adicionarQuestaoCatalogoForm;
        if (typeof removerQuestaoCatalogoForm === 'function') window.removerQuestaoCatalogoForm = removerQuestaoCatalogoForm;
        if (typeof renderQuestoesCatalogoForm === 'function') window.renderQuestoesCatalogoForm = renderQuestoesCatalogoForm;
        if (typeof obterProximoCodigoCatalogo === 'function') window.obterProximoCodigoCatalogo = obterProximoCodigoCatalogo;
        if (typeof catFormPreencherProximoCodigo === 'function') window.catFormPreencherProximoCodigo = catFormPreencherProximoCodigo;
        if (typeof gerarDadosSstPorTema === 'function') window.gerarDadosSstPorTema = gerarDadosSstPorTema;
        if (typeof catFormGerarIaObjetivoEConteudo === 'function') window.catFormGerarIaObjetivoEConteudo = catFormGerarIaObjetivoEConteudo;
        if (typeof abrirFormCatalogoTreinamento === 'function') window.abrirFormCatalogoTreinamento = abrirFormCatalogoTreinamento;
        if (typeof fecharFormCatalogoTreinamento === 'function') window.fecharFormCatalogoTreinamento = fecharFormCatalogoTreinamento;
        if (typeof toggleExpandirCatalogo === 'function') window.toggleExpandirCatalogo = toggleExpandirCatalogo;
        if (typeof limparBuscaCatalogo === 'function') window.limparBuscaCatalogo = limparBuscaCatalogo;
        if (typeof iniciarExclusaoCatalogo === 'function') window.iniciarExclusaoCatalogo = iniciarExclusaoCatalogo;
        if (typeof excluirCatalogoDireto === 'function') window.excluirCatalogoDireto = excluirCatalogoDireto;
        if (typeof confirmarMesclarExcluir === 'function') window.confirmarMesclarExcluir = confirmarMesclarExcluir;
        if (typeof salvarCatalogoTreinamento === 'function') window.salvarCatalogoTreinamento = salvarCatalogoTreinamento;
        if (typeof formatarDataIsoBR === 'function') window.formatarDataIsoBR = formatarDataIsoBR;
        if (typeof somarMesesDataIso === 'function') window.somarMesesDataIso = somarMesesDataIso;
        if (typeof calcularDiferencaDiasDatas === 'function') window.calcularDiferencaDiasDatas = calcularDiferencaDiasDatas;
        if (typeof obterNomeCursoCatalogo === 'function') window.obterNomeCursoCatalogo = obterNomeCursoCatalogo;
        if (typeof obterPeriodicidadeCursoCatalogo === 'function') window.obterPeriodicidadeCursoCatalogo = obterPeriodicidadeCursoCatalogo;
        if (typeof obterNomeGhePorCodigo === 'function') window.obterNomeGhePorCodigo = obterNomeGhePorCodigo;
        if (typeof recarregarRegrasRecomendacao === 'function') window.recarregarRegrasRecomendacao = recarregarRegrasRecomendacao;
        if (typeof filtrarTipoRegraTab === 'function') window.filtrarTipoRegraTab = filtrarTipoRegraTab;
        if (typeof renderTreinamentoRegrasTab === 'function') window.renderTreinamentoRegrasTab = renderTreinamentoRegrasTab;
        if (typeof abrirModalNovaRegra === 'function') window.abrirModalNovaRegra = abrirModalNovaRegra;
        if (typeof fecharModalRegra === 'function') window.fecharModalRegra = fecharModalRegra;
        if (typeof onTipoRegraChange === 'function') window.onTipoRegraChange = onTipoRegraChange;
        if (typeof onRegraTreinamentoChange === 'function') window.onRegraTreinamentoChange = onRegraTreinamentoChange;
        if (typeof salvarRegraRecomendacao === 'function') window.salvarRegraRecomendacao = salvarRegraRecomendacao;
        if (typeof excluirRegraRecomendacao === 'function') window.excluirRegraRecomendacao = excluirRegraRecomendacao;
        if (typeof excluirRegraRecomendacaoAtual === 'function') window.excluirRegraRecomendacaoAtual = excluirRegraRecomendacaoAtual;
        if (typeof alternarStatusRegraRecomendacao === 'function') window.alternarStatusRegraRecomendacao = alternarStatusRegraRecomendacao;
        if (typeof calcularDiagnosticoGapsTreinamentos === 'function') window.calcularDiagnosticoGapsTreinamentos = calcularDiagnosticoGapsTreinamentos;
        if (typeof popularFiltrosDiagnosticoGaps === 'function') window.popularFiltrosDiagnosticoGaps = popularFiltrosDiagnosticoGaps;
        if (typeof onGapFiltroChange === 'function') window.onGapFiltroChange = onGapFiltroChange;
        if (typeof limparFiltrosDiagnosticoGaps === 'function') window.limparFiltrosDiagnosticoGaps = limparFiltrosDiagnosticoGaps;
        if (typeof alternarMarcarTodosGaps === 'function') window.alternarMarcarTodosGaps = alternarMarcarTodosGaps;
        if (typeof alternarSelecaoGapItem === 'function') window.alternarSelecaoGapItem = alternarSelecaoGapItem;
        if (typeof atualizarContadorGapsSelecionados === 'function') window.atualizarContadorGapsSelecionados = atualizarContadorGapsSelecionados;
        if (typeof renderTreinamentoGapsTab === 'function') window.renderTreinamentoGapsTab = renderTreinamentoGapsTab;
        if (typeof convocarColaboradorGapIndividual === 'function') window.convocarColaboradorGapIndividual = convocarColaboradorGapIndividual;
        if (typeof abrirModalConvocacaoLoteGaps === 'function') window.abrirModalConvocacaoLoteGaps = abrirModalConvocacaoLoteGaps;
        if (typeof fecharModalConvocacaoLoteGaps === 'function') window.fecharModalConvocacaoLoteGaps = fecharModalConvocacaoLoteGaps;
        if (typeof confirmarConvocacaoLoteGaps === 'function') window.confirmarConvocacaoLoteGaps = confirmarConvocacaoLoteGaps;
        if (typeof imprimirDiagnosticoGaps === 'function') window.imprimirDiagnosticoGaps = imprimirDiagnosticoGaps;
        if (typeof showTreinSubtab === 'function') window.showTreinSubtab = showTreinSubtab;
        if (typeof recarregarRegrasRecomendacao === 'function') window.carregarRegrasTreinamentoRecomendado = recarregarRegrasRecomendacao;
        if (typeof recarregarRegrasRecomendacao === 'function') window.recarregarRegrasRecomendacao = recarregarRegrasRecomendacao;
        if (typeof renderTreinamentoRegrasTab === 'function') window.renderizarTabelaRegrasTrein = renderTreinamentoRegrasTab;
        if (typeof renderTreinamentoRegrasTab === 'function') window.renderTreinamentoRegrasTab = renderTreinamentoRegrasTab;
        if (typeof filtrarTipoRegraTab === 'function') window.filtrarRegrasTreinamentoUI = filtrarTipoRegraTab;
        if (typeof filtrarTipoRegraTab === 'function') window.filtrarTipoRegraTab = filtrarTipoRegraTab;
        if (typeof abrirModalNovaRegra === 'function') window.abrirModalNovaRegraTrein = abrirModalNovaRegra;
        if (typeof abrirModalNovaRegra === 'function') window.abrirModalNovaRegra = abrirModalNovaRegra;
        if (typeof fecharModalRegra === 'function') window.fecharModalRegraTrein = fecharModalRegra;
        if (typeof fecharModalRegra === 'function') window.fecharModalRegra = fecharModalRegra;
        if (typeof aoMudarTipoRegraModal === 'function') window.aoMudarTipoRegraModal = aoMudarTipoRegraModal;
        if (typeof aoMudarTipoRegraModal === 'function') window.onTipoRegraChange = aoMudarTipoRegraModal;
        if (typeof onRegraTreinamentoChange === 'function') window.onRegraTreinamentoChange = onRegraTreinamentoChange;
        if (typeof salvarRegraRecomendacao === 'function') window.salvarRegraTreinamentoRecomendado = salvarRegraRecomendacao;
        if (typeof salvarRegraRecomendacao === 'function') window.salvarRegraRecomendacao = salvarRegraRecomendacao;
        if (typeof alternarStatusRegraRecomendacao === 'function') window.alternarStatusRegraTrein = alternarStatusRegraRecomendacao;
        if (typeof alternarStatusRegraRecomendacao === 'function') window.alternarStatusRegraRecomendacao = alternarStatusRegraRecomendacao;
        if (typeof excluirRegraRecomendacao === 'function') window.excluirRegraTrein = excluirRegraRecomendacao;
        if (typeof excluirRegraRecomendacao === 'function') window.excluirRegraRecomendacao = excluirRegraRecomendacao;
        if (typeof excluirRegraRecomendacaoAtual === 'function') window.excluirRegraRecomendacaoAtual = excluirRegraRecomendacaoAtual;
        if (typeof calcularDiagnosticoGapsTreinamentos === 'function') window.carregarDiagnosticoGapsTreinamentos = calcularDiagnosticoGapsTreinamentos;
        if (typeof calcularDiagnosticoGapsTreinamentos === 'function') window.calcularDiagnosticoGapsTreinamentos = calcularDiagnosticoGapsTreinamentos;
        if (typeof renderTreinamentoGapsTab === 'function') window.renderizarDiagnosticoGapsTreinamentos = renderTreinamentoGapsTab;
        if (typeof renderTreinamentoGapsTab === 'function') window.renderTreinamentoGapsTab = renderTreinamentoGapsTab;
        if (typeof popularFiltrosDiagnosticoGaps === 'function') window.popularFiltrosDiagnosticoGaps = popularFiltrosDiagnosticoGaps;
        if (typeof onGapFiltroChange === 'function') window.filtrarDiagnosticoGapsUI = onGapFiltroChange;
        if (typeof onGapFiltroChange === 'function') window.onGapFiltroChange = onGapFiltroChange;
        if (typeof limparFiltrosDiagnosticoGaps === 'function') window.limparFiltrosDiagnosticoGaps = limparFiltrosDiagnosticoGaps;
        if (typeof convocarColaboradorGapIndividual === 'function') window.convocarColaboradorGapIndividual = convocarColaboradorGapIndividual;
        if (typeof alternarMarcarTodosGaps === 'function') window.alternarSelecaoTodosGaps = alternarMarcarTodosGaps;
        if (typeof alternarMarcarTodosGaps === 'function') window.alternarMarcarTodosGaps = alternarMarcarTodosGaps;
        if (typeof alternarSelecaoGapItem === 'function') window.alternarSelecaoGapItem = alternarSelecaoGapItem;
        if (typeof atualizarContadorGapsSelecionados === 'function') window.atualizarContadorGapsSelecionados = atualizarContadorGapsSelecionados;
        if (typeof abrirModalConvocacaoLoteGaps === 'function') window.abrirModalConvocacaoLoteGaps = abrirModalConvocacaoLoteGaps;
        if (typeof abrirModalConvocacaoLoteGaps === 'function') window.convocarGapsLoteModal = abrirModalConvocacaoLoteGaps;
        if (typeof fecharModalConvocacaoLoteGaps === 'function') window.fecharModalConvocacaoLoteGaps = fecharModalConvocacaoLoteGaps;
        if (typeof confirmarConvocacaoLoteGaps === 'function') window.confirmarConvocacaoLoteGaps = confirmarConvocacaoLoteGaps;
        if (typeof imprimirDiagnosticoGaps === 'function') window.imprimirDiagnosticoGaps = imprimirDiagnosticoGaps;
        if (typeof loadTreinamentosData === 'function') window.loadTreinamentosData = loadTreinamentosData;

        // Sub-aba Prontidão de Equipes & Dossiê do Colaborador
        if (typeof popularFiltrosProntidaoEquipes === 'function') window.popularFiltrosProntidaoEquipes = popularFiltrosProntidaoEquipes;
        if (typeof calcularProntidaoEquipes === 'function') window.calcularProntidaoEquipes = calcularProntidaoEquipes;
        if (typeof filtrarProntidaoEquipeUI === 'function') window.filtrarProntidaoEquipeUI = filtrarProntidaoEquipeUI;
        if (typeof limparFiltrosProntidaoEquipe === 'function') window.limparFiltrosProntidaoEquipe = limparFiltrosProntidaoEquipe;
        if (typeof renderProntidaoEquipeTab === 'function') window.renderProntidaoEquipeTab = renderProntidaoEquipeTab;
        if (typeof abrirDossieColaborador === 'function') window.abrirDossieColaborador = abrirDossieColaborador;
        if (typeof fecharModalDossieColaborador === 'function') window.fecharModalDossieColaborador = fecharModalDossieColaborador;
        if (typeof imprimirProntidaoEquipe === 'function') window.imprimirProntidaoEquipe = imprimirProntidaoEquipe;
        if (typeof imprimirProntuarioIndividual === 'function') window.imprimirProntuarioIndividual = imprimirProntuarioIndividual;
        if (typeof toggleSecaoGerenciarEncarregados === 'function') window.toggleSecaoGerenciarEncarregados = toggleSecaoGerenciarEncarregados;
        if (typeof toggleProntidaoSetorDropdown === 'function') window.toggleProntidaoSetorDropdown = toggleProntidaoSetorDropdown;
        if (typeof fecharProntidaoSetorDropdown === 'function') window.fecharProntidaoSetorDropdown = fecharProntidaoSetorDropdown;
        if (typeof filtrarListaSetoresDropdown === 'function') window.filtrarListaSetoresDropdown = filtrarListaSetoresDropdown;
        if (typeof onToggleSetorProntidao === 'function') window.onToggleSetorProntidao = onToggleSetorProntidao;
        if (typeof toggleTodosSetoresProntidao === 'function') window.toggleTodosSetoresProntidao = toggleTodosSetoresProntidao;
        if (typeof limparSelecaoSetoresProntidao === 'function') window.limparSelecaoSetoresProntidao = limparSelecaoSetoresProntidao;
        if (typeof toggleProntidaoCursoDropdown === 'function') window.toggleProntidaoCursoDropdown = toggleProntidaoCursoDropdown;
        if (typeof fecharProntidaoCursoDropdown === 'function') window.fecharProntidaoCursoDropdown = fecharProntidaoCursoDropdown;
        if (typeof filtrarListaCursosDropdown === 'function') window.filtrarListaCursosDropdown = filtrarListaCursosDropdown;
        if (typeof selecionarCursoProntidao === 'function') window.selecionarCursoProntidao = selecionarCursoProntidao;
        if (typeof toggleValidosColaborador === 'function') window.toggleValidosColaborador = toggleValidosColaborador;

        // Sub-aba Regras de Recomendação (Acordeão por Grupos & Inclusão em Lote NR-01)
        if (typeof alternarVisualizacaoRegras === 'function') window.alternarVisualizacaoRegras = alternarVisualizacaoRegras;
        if (typeof toggleAcordeonGrupoRegra === 'function') window.toggleAcordeonGrupoRegra = toggleAcordeonGrupoRegra;
        if (typeof expandirTodosAcordeonsRegras === 'function') window.expandirTodosAcordeonsRegras = expandirTodosAcordeonsRegras;
        if (typeof recolherTodosAcordeonsRegras === 'function') window.recolherTodosAcordeonsRegras = recolherTodosAcordeonsRegras;
        if (typeof abrirModalLoteTreinamentos === 'function') window.abrirModalLoteTreinamentos = abrirModalLoteTreinamentos;
        if (typeof fecharModalLoteTreinamentos === 'function') window.fecharModalLoteTreinamentos = fecharModalLoteTreinamentos;
        if (typeof filtrarListaTreinamentosLote === 'function') window.filtrarListaTreinamentosLote = filtrarListaTreinamentosLote;
        if (typeof aoAlterarCheckboxLote === 'function') window.aoAlterarCheckboxLote = aoAlterarCheckboxLote;
        if (typeof marcarTodosCursosLote === 'function') window.marcarTodosCursosLote = marcarTodosCursosLote;
        if (typeof atualizarContadorSelecaoLote === 'function') window.atualizarContadorSelecaoLote = atualizarContadorSelecaoLote;
        if (typeof salvarTreinamentosLote === 'function') window.salvarTreinamentosLote = salvarTreinamentosLote;
        if (typeof excluirVinculoRegraRapido === 'function') window.excluirVinculoRegraRapido = excluirVinculoRegraRapido;

        // Sincronização de arrays de estado com window
        window.allTreinamentosRealizados = allTreinamentosRealizados;
        window.allTreinamentosCatalogo = allTreinamentosCatalogo;
        window.allTreinamentosStatus = allTreinamentosStatus;
        window.allTreinamentosCronograma = allTreinamentosCronograma;
        window.allTreinamentosConvocados = allTreinamentosConvocados;
        window.allTreinamentosRegras = allTreinamentosRegras;
    }

})(typeof window !== 'undefined' ? window : this);
