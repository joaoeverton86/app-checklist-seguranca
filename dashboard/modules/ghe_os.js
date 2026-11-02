// ============================================
// CATÁLOGO ESOCIAL TABELA 24 — Agentes Principais e Frequentes
// Base Normativa: eSocial v. S-1.3 (NT 07/2026) / Anexo I - Tabelas / RPS Decreto 3.048/1999 Anexo IV
// NOTA TÉCNICA E NORMATIVA:
// 1. Este catálogo reúne os agentes físicos, químicos e biológicos mais frequentes da Tabela 24 com rótulos
//    operacionais padronizados. Para códigos ou subitens não listados, utiliza-se a opção "Outro (digitar manualmente)".
// 2. No eSocial S-2240, riscos Ergonômicos e Acidentes não possuem enquadramento previdenciário (exclusivos PGR/NR-01).
// ============================================
var ESOCIAL_TABELA24 = window.ESOCIAL_TABELA24 || {
    'Físico': [
        { codigo: '02.01.001', nome: 'Ruído' },
        { codigo: '02.01.002', nome: 'Vibrações localizadas (mãos e braços)' },
        { codigo: '02.01.003', nome: 'Vibração de corpo inteiro (aren)' },
        { codigo: '02.01.004', nome: 'Vibração de corpo inteiro (VDVR)' },
        { codigo: '02.01.005', nome: 'Trabalhos com perfuratrizes e marteletes pneumáticos' },
        { codigo: '02.01.006', nome: 'Radiações ionizantes' },
        { codigo: '02.01.007', nome: 'Extração e beneficiamento de minerais radioativos' },
        { codigo: '02.01.008', nome: 'Atividades em minerações com exposição ao radônio' },
        { codigo: '02.01.009', nome: 'Manutenção e supervisão em unidades de minerais radioativos' },
        { codigo: '02.01.010', nome: 'Operações com reatores nucleares ou com fontes radioativas' },
        { codigo: '02.01.011', nome: 'Trabalhos com raios Alfa, Beta, Gama e X, nêutrons e substâncias radioativas' },
        { codigo: '02.01.012', nome: 'Fabricação e manipulação de produtos radioativos' },
        { codigo: '02.01.013', nome: 'Pesquisas e estudos com radiações ionizantes em laboratórios' },
        { codigo: '02.01.014', nome: 'Calor acima dos limites de tolerância (NR-15)' },
        { codigo: '02.01.015', nome: 'Pressão atmosférica anormal' },
        { codigo: '02.01.016', nome: 'Trabalhos em caixões ou câmaras hiperbáricas' },
        { codigo: '02.01.017', nome: 'Trabalhos em tubulões ou túneis sob ar comprimido' },
        { codigo: '02.01.018', nome: 'Operações de mergulho com uso de escafandros ou outros equipamentos' }
    ],
    'Químico': [
        { codigo: '01.01.001', nome: 'Arsênio e seus compostos' },
        { codigo: '01.02.001', nome: 'Asbestos (ou amianto)' },
        { codigo: '01.03.001', nome: 'Benzeno e seus compostos tóxicos' },
        { codigo: '01.03.002', nome: 'Estireno (vinilbenzeno)' },
        { codigo: '01.04.001', nome: 'Berílio e seus compostos tóxicos' },
        { codigo: '01.05.001', nome: 'Bromo e seus compostos tóxicos' },
        { codigo: '01.06.001', nome: 'Cádmio e seus compostos tóxicos' },
        { codigo: '01.07.001', nome: 'Carvão mineral e seus derivados' },
        { codigo: '01.08.001', nome: 'Chumbo e seus compostos tóxicos' },
        { codigo: '01.09.001', nome: 'Cloro e seus compostos tóxicos' },
        { codigo: '01.09.002', nome: 'Metileno-ortocloroanilina (MOCA / MBOCA)' },
        { codigo: '01.10.001', nome: 'Cromo e seus compostos tóxicos' },
        { codigo: '01.11.001', nome: 'Dissulfeto de carbono' },
        { codigo: '01.12.001', nome: 'Fósforo e seus compostos tóxicos' },
        { codigo: '01.13.001', nome: 'Iodo' },
        { codigo: '01.14.001', nome: 'Manganês e seus compostos' },
        { codigo: '01.15.001', nome: 'Mercúrio e seus compostos' },
        { codigo: '01.16.001', nome: 'Níquel e seus compostos tóxicos' },
        { codigo: '01.17.001', nome: 'Petróleo, xisto betuminoso, gás natural e seus derivados' },
        { codigo: '01.18.001', nome: 'Sílica livre' },
        { codigo: '01.19.001', nome: 'Butadieno-estireno' },
        { codigo: '01.19.002', nome: 'Acrilonitrila' },
        { codigo: '01.19.003', nome: '1-3-butadieno' },
        { codigo: '01.19.004', nome: 'Mercaptanos (tióis)' },
        { codigo: '01.19.005', nome: 'n-hexano' },
        { codigo: '01.19.006', nome: 'Diisocianato de tolueno (TDI)' },
        { codigo: '01.19.007', nome: 'Aminas aromáticas' },
        { codigo: '01.19.008', nome: 'Aminobifenila (4-aminodifenil)' }
    ],
    'Biológico': [
        { codigo: '03.01.001', nome: 'Trabalhos em estabelecimentos de saúde em contato com pacientes ou materiais contaminados' },
        { codigo: '03.01.002', nome: 'Trabalhos com animais infectados para soro, vacinas e produtos' },
        { codigo: '03.01.003', nome: 'Trabalhos em laboratórios de autópsia, anatomia e anátomo-histologia' },
        { codigo: '03.01.004', nome: 'Exumação de corpos e manipulação de resíduos de animais deteriorados' },
        { codigo: '03.01.005', nome: 'Trabalhos em galerias, fossas e tanques de esgoto' },
        { codigo: '03.01.006', nome: 'Esvaziamento de biodigestores' },
        { codigo: '03.01.007', nome: 'Coleta e industrialização do lixo' }
    ],
    'Ergonômico': [
        { codigo: '', nome: 'Levantamento, transporte e descarga manual de pesos' },
        { codigo: '', nome: 'Exigência de esforço físico intenso e estático' },
        { codigo: '', nome: 'Posturas extremas ou estáticas prolongadas' },
        { codigo: '', nome: 'Movimentos repetitivos de membros superiores' },
        { codigo: '', nome: 'Mobiliário e postos de trabalho sem regulagem ergonômica' },
        { codigo: '', nome: 'Ritmo excessivo de trabalho e metas de produtividade' },
        { codigo: '', nome: 'Trabalho em turnos ou noturno com alteração circadiana' },
        { codigo: '', nome: 'Monotonia, repetitividade e sobrecarga mental' }
    ],
    'Acidentes': [
        { codigo: '', nome: 'Queda de pessoas com diferença de nível (trabalho em altura)' },
        { codigo: '', nome: 'Queda de pessoas no mesmo nível (piso escorregadio/irregular)' },
        { codigo: '', nome: 'Queda de materiais, ferramentas ou projeção de partículas' },
        { codigo: '', nome: 'Choque elétrico, contato com partes energizadas ou arco elétrico' },
        { codigo: '', nome: 'Incêndio e princípios de explosão' },
        { codigo: '', nome: 'Atropelamento, colisão e movimentação de veículos e máquinas' },
        { codigo: '', nome: 'Prensagem, aprisionamento ou esmagamento em partes móveis' },
        { codigo: '', nome: 'Corte, perfuração ou laceração com ferramentas perfurocortantes' },
        { codigo: '', nome: 'Contato com superfícies ou fluidos em temperaturas extremas' },
        { codigo: '', nome: 'Trabalho em espaço confinado (risco de asfixia/intoxicação)' },
        { codigo: '', nome: 'Animais peçonhentos e vetores biológicos agressivos' },
        { codigo: '', nome: 'Desabamento, desmoronamento de taludes, valas ou estruturas' }
    ]
};
window.ESOCIAL_TABELA24 = ESOCIAL_TABELA24;

function getEsocialOpcoesPorTipo(tipoAgente) {
    return (window.ESOCIAL_TABELA24 && window.ESOCIAL_TABELA24[tipoAgente]) || [];
}


// Tabela 16.3 do PGR (Matriz para Determinação dos Níveis de Risco) transcrita ao pé da
// letra - Efeito nas linhas (1 a 5), Probabilidade nas colunas (1 a 5). Substitui o
// cálculo antigo (probabilidade × severidade dentro de uma faixa), que em vários
// cruzamentos não batia com essa tabela oficial - ex: Efeito 5 (Ameaça) × Probabilidade 4
// (Exp. elevada) essa tabela classifica como "Moderado", mas a multiplicação simples (5×4
// = 20) caía na faixa de "Muito Alto".
var GHE_MATRIZ_NIVEIS = {
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

// ============================================
// AVALIAÇÃO DE RISCOS (PGR / METODOLOGIA AIHA / eSocial) - FASE 1 (ESTADO TRANSACIONAL COM IDENTIDADE LEGADA GARANTIDA)
// ============================================
var matrizSubtabAtiva = 'geral';
var matrizRiscoDetalheSubtabAtiva = 'avaliacao';

var matrizGheSelecionadoId = null;
var matrizRiscoSelecionadoIdx = 0;
var matrizGheRiscosTrabalho = [];
var matrizRiscoEdicaoOriginal = null;
var matrizRiscoEdicaoDraft = null;
var matrizRiscoEdicaoBaselineJson = null;

function carregarRiscosTrabalhoDoGhe(g) {
    if (!g || !Array.isArray(g.riscos)) {
        matrizGheRiscosTrabalho = [];
    } else {
        matrizGheRiscosTrabalho = g.riscos.map((r, i) => {
            const clone = JSON.parse(JSON.stringify(r));
            clone._origIndex = i;
            delete clone._isNovoNaoSalvo;
            return clone;
        });
    }
}

function inicializarDraftRisco(r) {
    if (!r) {
        matrizRiscoEdicaoOriginal = null;
        matrizRiscoEdicaoDraft = null;
        matrizRiscoEdicaoBaselineJson = null;
        return;
    }
    matrizRiscoEdicaoOriginal = JSON.parse(JSON.stringify(r));
    matrizRiscoEdicaoDraft = JSON.parse(JSON.stringify(r));
    // Normaliza sincronização ao abrir/carregar o draft: se houver coleções estruturadas com itens, alinha legados com o 1º item; se vazias, preserva legados
    sincronizarEpiCaPrincipalLegado(false);
    sincronizarEpcPrincipalLegado(false);
    sincronizarMedicaoPrincipalLegada(false);
    sincronizarExamesPcmsoLegado(false);
    sincronizarCidsLegado(false);
    sincronizarMedidasLegado(false);
    matrizRiscoEdicaoBaselineJson = JSON.stringify(matrizRiscoEdicaoDraft);
}

function isMatrizSetorRiscoDraftDirty() {
    if (Array.isArray(matrizGheRiscosTrabalho) && matrizGheRiscosTrabalho.some(r => r && r._isNovoNaoSalvo)) {
        return true;
    }
    if (!matrizRiscoEdicaoDraft) return false;
    if (matrizRiscoEdicaoDraft._isNovoNaoSalvo) return true;
    const baseJson = matrizRiscoEdicaoBaselineJson || (matrizRiscoEdicaoOriginal ? JSON.stringify(matrizRiscoEdicaoOriginal) : null);
    if (!baseJson) return false;
    return JSON.stringify(matrizRiscoEdicaoDraft) !== baseJson;
}

function atualizarControlesContextoTopoMatriz(tab) {
    const ocultar = (tab === 'docbase');
    const idsParaAlternar = [
        'matrizRiscoGheSelectLabel',
        'matrizRiscoGheSelect',
        'btnRecalcularAihaTop',
        'btnImprimirInventarioTop',
        'statusRecalcularRiscoGhe'
    ];
    idsParaAlternar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = ocultar ? 'none' : '';
    });
    // O botão de emitir o PGR completo permanece sempre visível e acessível em todas as sub-abas
    const btnPgrComp = document.getElementById('btnImprimirPgrCompletoTop');
    if (btnPgrComp) btnPgrComp.style.display = '';
}

function showMatrizSubtab(tab) {
    if (matrizSubtabAtiva === 'docbase' && tab !== 'docbase') {
        if (typeof isPgrDocBaseDirty === 'function' && isPgrDocBaseDirty()) {
            const confirmarSaida = (typeof confirm === 'function')
                ? confirm('Existem alterações não salvas no Documento-Base do PGR. Deseja descartá-las e sair desta aba?')
                : true;
            if (!confirmarSaida) {
                const select = document.getElementById('matrizRiscoGheSelect');
                if (select) select.value = matrizGheSelecionadoId || '';
                return false;
            }
            if (typeof restaurarDraftPgrDocBaseParaUltimoSalvo === 'function') {
                restaurarDraftPgrDocBaseParaUltimoSalvo();
            }
        }
    }

    if (matrizSubtabAtiva === 'setor' && tab === 'docbase') {
        if (typeof isMatrizSetorRiscoDraftDirty === 'function' && isMatrizSetorRiscoDraftDirty()) {
            const confirmarSaidaSetor = (typeof confirm === 'function')
                ? confirm('Existem alterações não salvas na Avaliação de Riscos deste Setor/GHE. Deseja descartá-las e abrir o Documento-Base do PGR?')
                : true;
            if (!confirmarSaidaSetor) {
                return false;
            }
        }
    }

    matrizSubtabAtiva = tab;
    const btnGeral = document.getElementById('matrizSubtabBtn-geral');
    const btnSetor = document.getElementById('matrizSubtabBtn-setor');
    const btnDocBase = document.getElementById('matrizSubtabBtn-docbase');
    const viewGeral = document.getElementById('matrizViewGeral');
    const viewSetor = document.getElementById('matrizViewSetor');
    const viewDocBase = document.getElementById('matrizViewDocBase');

    if (btnGeral) btnGeral.classList.toggle('active', tab === 'geral');
    if (btnSetor) btnSetor.classList.toggle('active', tab === 'setor');
    if (btnDocBase) btnDocBase.classList.toggle('active', tab === 'docbase');
    atualizarControlesContextoTopoMatriz(tab);

    if (tab === 'geral') {
        // RESETAR ESTADO E DRAFTS AO VOLTAR PARA VISÃO GERAL
        matrizGheSelecionadoId = null;
        matrizRiscoSelecionadoIdx = 0;
        matrizGheRiscosTrabalho = [];
        matrizRiscoEdicaoOriginal = null;
        matrizRiscoEdicaoDraft = null;
        if (viewGeral) viewGeral.style.display = 'block';
        if (viewSetor) viewSetor.style.display = 'none';
        if (viewDocBase) viewDocBase.style.display = 'none';
        renderMatrizRiscoPanel();
    } else if (tab === 'docbase') {
        // RESETAR DRAFTS TRANSITÓRIOS DE SETOR AO ENTRAR EM DOCUMENTO-BASE
        matrizGheSelecionadoId = null;
        matrizRiscoSelecionadoIdx = 0;
        matrizGheRiscosTrabalho = [];
        matrizRiscoEdicaoOriginal = null;
        matrizRiscoEdicaoDraft = null;
        if (viewGeral) viewGeral.style.display = 'none';
        if (viewSetor) viewSetor.style.display = 'none';
        if (viewDocBase) viewDocBase.style.display = 'block';
        if (typeof abrirSubtabPgrDocBase === 'function') {
            abrirSubtabPgrDocBase();
        }
    } else {
        if (viewGeral) viewGeral.style.display = 'none';
        if (viewSetor) viewSetor.style.display = 'block';
        if (viewDocBase) viewDocBase.style.display = 'none';
        if (!matrizGheSelecionadoId && allGheCatalogo.length > 0) {
            matrizGheSelecionadoId = allGheCatalogo[0].id;
            matrizRiscoSelecionadoIdx = 0;
        }
        const select = document.getElementById('matrizRiscoGheSelect');
        if (select && matrizGheSelecionadoId) select.value = matrizGheSelecionadoId;

        const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
        if (g) {
            carregarRiscosTrabalhoDoGhe(g);
            inicializarDraftRisco(matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx] || null);
        } else {
            inicializarDraftRisco(null);
        }
        renderMatrizViewSetor();
    }
    return true;
}

function popularMatrizRiscoGheSelect() {
    const select = document.getElementById('matrizRiscoGheSelect');
    if (!select) return;
    const grupos = allGheCatalogo.slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    let html = '<option value="">-- Selecione um Setor / GHE --</option>';
    grupos.forEach(g => {
        const idStr = escapeHTML(g.id || '');
        const nomeStr = escapeHTML(g.nome || '');
        const sel = String(g.id) === String(matrizGheSelecionadoId) ? 'selected' : '';
        html += `<option value="${idStr}" ${sel}>${idStr} — ${nomeStr}</option>`;
    });
    select.innerHTML = html;
}

function selecionarGheMatrizRisco(gheId, riscoIdx) {
    if (!gheId) return;
    if (matrizSubtabAtiva === 'docbase' && typeof isPgrDocBaseDirty === 'function' && isPgrDocBaseDirty()) {
        const confirmarSaida = (typeof confirm === 'function')
            ? confirm('Existem alterações não salvas no Documento-Base do PGR. Deseja descartá-las e abrir o GHE selecionado?')
            : true;
        if (!confirmarSaida) {
            const select = document.getElementById('matrizRiscoGheSelect');
            if (select) select.value = matrizGheSelecionadoId || '';
            return false;
        }
        if (typeof restaurarDraftPgrDocBaseParaUltimoSalvo === 'function') {
            restaurarDraftPgrDocBaseParaUltimoSalvo();
        }
    }

    matrizRiscoDetalheSubtabAtiva = 'avaliacao';
    matrizGheSelecionadoId = gheId;
    if (riscoIdx !== undefined && riscoIdx !== null) {
        matrizRiscoSelecionadoIdx = riscoIdx;
    } else {
        matrizRiscoSelecionadoIdx = 0;
    }
    const select = document.getElementById('matrizRiscoGheSelect');
    if (select) select.value = gheId;

    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (g) {
        carregarRiscosTrabalhoDoGhe(g);
        if (matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx]) {
            inicializarDraftRisco(matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx]);
        } else {
            inicializarDraftRisco(null);
        }
    } else {
        inicializarDraftRisco(null);
    }

    showMatrizSubtab('setor');
    return true;
}

function renderMatrizViewSetor() {
    const container = document.getElementById('matrizSetorConteudo');
    if (!container) return;

    if (!matrizGheSelecionadoId) {
        container.innerHTML = '<div class="db-list-empty" style="padding:40px; text-align:center;">Selecione um Setor / GHE na barra superior para visualizar e gerenciar a Avaliação de Riscos.</div>';
        return;
    }

    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) {
        container.innerHTML = `<div class="db-list-empty">Setor / GHE "${escapeHTML(matrizGheSelecionadoId)}" não encontrado no catálogo.</div>`;
        return;
    }

    const colaboradores = (allEfetivo || []).filter(e => colaboradorEstaAtivo(e) && normalizarGhe(e.ghe) === normalizarGhe(g.id));
    const totalAtivos = colaboradores.length;
    const cargos = Array.isArray(g.cargos) ? g.cargos : [];
    const riscos = matrizGheRiscosTrabalho;

    const dataElab = g.data_inicio ? formatSimpleDate(g.data_inicio) : (g.data_elaboracao ? formatSimpleDate(g.data_elaboracao) : 'Não informada');
    const dataVal = g.data_validade ? formatSimpleDate(g.data_validade) : 'Não informada';

    if (!matrizRiscoEdicaoDraft && riscos[matrizRiscoSelecionadoIdx]) {
        inicializarDraftRisco(riscos[matrizRiscoSelecionadoIdx]);
    }

    let html = `
    <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <!-- Cabeçalho Executivo do Setor / GHE (Padrão SGG Melhorado) -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; border-bottom:1px solid var(--border); padding-bottom:14px; margin-bottom:14px;">
            <div style="flex:1; min-width:280px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span style="background:var(--primary, #4f46e5); color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px; letter-spacing:0.5px;">GHE ${escapeHTML(g.id)}</span>
                    <span style="font-size:12px; color:var(--text-light); font-weight:600;">${escapeHTML(EMPRESA_INFO?.razaoSocial || 'CONSORCIO OPERADOR RAMAL DO AGRESTE')}</span>
                </div>
                <h2 style="margin:0 0 6px 0; font-size:18px; font-weight:800; color:var(--text);">${escapeHTML(g.nome)}</h2>
                <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:12px; color:var(--text-light);">
                    <span>📅 <b>Elaboração:</b> ${escapeHTML(dataElab)}</span>
                    <span>⏳ <b>Validade / Revisão PGR:</b> ${escapeHTML(dataVal)}</span>
                    <span>👥 <b>Efetivo Atual:</b> <b style="color:var(--text); font-weight:700;">${totalAtivos} colaborador(es) ativo(s)</b> (Quadro Previsto: ${g.quantidade_oficial || 0})</span>
                </div>
            </div>

            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <button class="db-clear-btn" onclick="showMatrizSubtab('geral')" style="font-size:12px; padding:7px 12px;">⬅️ Voltar à Matriz Geral</button>
                <button class="db-apply-btn" onclick="imprimirInventarioRiscosGheAtual()" style="font-size:12px; padding:7px 12px;">🖨️ Imprimir Inventário do Setor</button>
            </div>
        </div>

        <!-- Cargos Vinculados ao Setor / GHE -->
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:14px;">
            <div style="font-weight:700; font-size:12.5px; color:var(--text); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>👔 Cargos & Atividades do Grupo (${cargos.length} cargo${cargos.length === 1 ? '' : 's'})</span>
                <span style="font-size:11px; color:var(--text-light);">Cargo :: Função :: CBO :: Lotação</span>
            </div>
            ${cargos.length === 0 ? '<div style="font-size:12px; color:var(--text-light);">Nenhum cargo vinculado a este GHE no catálogo.</div>' : `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:8px;">
                    ${cargos.map(c => `
                        <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:6px; padding:8px 10px; font-size:12px;">
                            <div style="font-weight:700; color:var(--text);">${escapeHTML(c.cargo || c.funcao || 'Cargo')} <span style="font-size:11px; font-weight:400; color:var(--text-light);">(CBO ${escapeHTML(c.cbo || '—')})</span></div>
                            <div style="font-size:11.5px; color:var(--text-light); margin-top:2px;"><b>Função:</b> ${escapeHTML(c.funcao || '—')} · <b>Oficial:</b> ${c.quantidade || 0} vaga(s)</div>
                            ${c.descricao_atividade ? `<div style="font-size:11px; color:var(--text-light); margin-top:4px; max-height:45px; overflow-y:auto; line-height:1.3;">${escapeHTML(c.descricao_atividade)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `}
        </div>

                <!-- Alerta Informativo de Riscos Psicossociais (NR-01 GRO) -->
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:#1e40af;">
                <span style="font-size:18px;">ℹ️</span>
                <span><b>Gestão Integrada NR-01:</b> Fatores de Riscos Psicossociais e Ergonômicos devem ser monitorados periodicamente para este grupo operacional (<b>${Array.isArray(g.conclusoes?.fatores_psicossociais_nr01) ? g.conclusoes.fatores_psicossociais_nr01.length : 0}</b> fator(es) monitorado(s) no GHE).</span>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="db-apply-btn" data-ghe-id="${escapeHTML(g.id)}" onclick="abrirGestaoPsicossocialPorGhe(this.dataset.gheId)" style="padding:5px 12px; font-size:11.5px; background:#2563eb; color:#fff; white-space:nowrap;">🛡️ Gerenciar Fatores NR-01 deste GHE</button>
                <button class="db-clear-btn" onclick="showDbPage('psicossocial'); showPsicossocialSubtab('visao');" style="padding:4px 10px; font-size:11px; background:#fff; color:#1e40af; border-color:#93c5fd; white-space:nowrap;">📊 Ver COPSOQ II Global</button>
            </div>
        </div>

        <!-- Seção: Gestão de Riscos do Setor / GHE -->
        <div style="border-top:1px solid var(--border); padding-top:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                <div style="font-weight:800; font-size:14px; color:var(--text); display:flex; align-items:center; gap:6px;">
                    <span>🛡️ Riscos Ambientais e Ocupacionais Identificados</span>
                    <span style="background:var(--bg); border:1px solid var(--border); font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; color:var(--text-light);">${riscos.length} cadastrado(s)</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="db-apply-btn" onclick="adicionarNovoRiscoGheNaTela()" style="font-size:11.5px; padding:6px 12px;">➕ Novo Risco</button>
                </div>
            </div>

            <!-- Chips de Riscos Navegáveis com Identificação Precisa -->
            <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:14px; border-bottom:1px dashed var(--border);">
                ${riscos.length === 0 ? '<div style="font-size:12px; color:var(--text-light); padding:8px 0;">Nenhum risco cadastrado para este grupo. Clique em "➕ Novo Risco" para começar.</div>' : riscos.map((r, idx) => {
                    const ativo = idx === matrizRiscoSelecionadoIdx;
                    const grav = NIVEIS_RISCO_COR[r.gravidade_label] || '#888888';
                    const tipoIcone = {
                        'Físico': '🔵',
                        'Químico': '🔴',
                        'Biológico': '🟤',
                        'Ergonômico': '🟡',
                        'Acidentes': '🟠'
                    }[r.tipo_agente] || '⚠️';
                    return `
                        <div class="matriz-chip-wrap" style="display:inline-flex; align-items:center; border-radius:20px; overflow:hidden; border:${ativo ? '1.5px solid var(--primary)' : '1px solid var(--border)'}; background:${ativo ? 'var(--primary)' : 'var(--bg)'}; transition:all 0.2s ease; flex-shrink:0;">
                            <button type="button" data-chip-select onclick="selecionarChipRiscoGhe(${idx})" style="border:none; background:transparent; padding:6px 12px; font-size:12px; font-weight:600; color:${ativo ? '#fff' : 'var(--text)'}; cursor:pointer; display:flex; align-items:center; gap:6px;">
                                <span>${tipoIcone} ${escapeHTML(r.agente || 'Risco ' + (idx + 1))}</span>
                                <span style="font-size:10px; padding:2px 6px; border-radius:10px; background:${ativo ? 'rgba(255,255,255,0.25)' : grav + '22'}; color:${ativo ? '#fff' : grav}; font-weight:700;">
                                    ${escapeHTML(r.gravidade_label || 'P×S ' + (r.gravidade || '—'))}
                                </span>
                                ${r._isNovoNaoSalvo ? '<span style="font-size:9px; background:#fef3c7; color:#92400e; padding:1px 5px; border-radius:6px; font-weight:700; margin-left:2px;">Novo</span>' : ''}
                            </button>
                            <button type="button" data-chip-remove onclick="removerRiscoGhePeloChip(${idx})" title="Remover Risco" style="border:none; border-left:1px solid ${ativo ? 'rgba(255,255,255,0.3)' : 'var(--border)'}; background:transparent; padding:6px 10px; font-size:11px; color:${ativo ? '#fff' : 'var(--danger)'}; cursor:pointer; opacity:0.85;">
                                ✕
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Detalhamento e Edição do Risco Selecionado -->
            <div id="matrizRiscoDetalhesContainer">
                ${renderRiscoAtivoDetalhesHtml(g, matrizRiscoEdicaoDraft || riscos[matrizRiscoSelecionadoIdx], matrizRiscoSelecionadoIdx)}
            </div>
        </div>
    </div>
    `;

    container.innerHTML = html;
}

function selecionarChipRiscoGhe(idx) {
    matrizRiscoDetalheSubtabAtiva = 'avaliacao';
    matrizRiscoSelecionadoIdx = idx;
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;
    const riscos = matrizGheRiscosTrabalho;
    if (riscos[idx]) {
        inicializarDraftRisco(riscos[idx]);
    }
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(g, matrizRiscoEdicaoDraft || riscos[idx], idx);
    }
    document.querySelectorAll('#matrizSetorConteudo button[onclick^=selecionarChipRiscoGhe]').forEach((btn, i) => {
        btn.style.border = i === idx ? '1px solid var(--primary)' : '1px solid var(--border)';
        btn.style.background = i === idx ? 'var(--primary)' : 'var(--bg)';
        btn.style.color = i === idx ? '#fff' : 'var(--text)';
    });
    document.querySelectorAll('.matriz-chip-wrap').forEach((wrap, i) => {
        const ativo = (i === idx);
        wrap.style.border = ativo ? '1.5px solid var(--primary)' : '1px solid var(--border)';
        wrap.style.background = ativo ? 'var(--primary)' : 'var(--bg)';
        const btnSelect = wrap.querySelector('button[data-chip-select]');
        if (btnSelect) btnSelect.style.color = ativo ? '#fff' : 'var(--text)';
        const btnRemove = wrap.querySelector('button[data-chip-remove]');
        if (btnRemove) {
            btnRemove.style.color = ativo ? '#fff' : 'var(--danger)';
            btnRemove.style.borderLeftColor = ativo ? 'rgba(255,255,255,0.3)' : 'var(--border)';
        }
    });
}

function adicionarNovoRiscoGheNaTela() {
    matrizRiscoDetalheSubtabAtiva = 'avaliacao';
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;
    const novo = rowRiscoGheVazio();
    novo._isNovoNaoSalvo = true;
    novo.tipo_agente = 'Físico';
    novo.agente = 'Novo Fator de Risco';
    novo.probabilidade = '2';
    novo.severidade = '2';
    atualizarGravidadeCalculadaGhe(novo);
    matrizGheRiscosTrabalho.push(novo);
    matrizRiscoSelecionadoIdx = matrizGheRiscosTrabalho.length - 1;
    inicializarDraftRisco(novo);
    renderMatrizViewSetor();
}

async function removerRiscoGhePeloChip(idx) {
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g || !matrizGheRiscosTrabalho[idx]) return;
    const riscoAlvo = matrizGheRiscosTrabalho[idx];
    const nome = riscoAlvo.agente || `Risco ${idx + 1}`;

    if (!confirm(`Remover o risco "${nome}" deste GHE?`)) return;

    if (riscoAlvo._isNovoNaoSalvo) {
        matrizGheRiscosTrabalho.splice(idx, 1);
        matrizRiscoDetalheSubtabAtiva = 'avaliacao';
        if (matrizRiscoSelecionadoIdx >= matrizGheRiscosTrabalho.length) {
            matrizRiscoSelecionadoIdx = Math.max(0, matrizGheRiscosTrabalho.length - 1);
        }
        inicializarDraftRisco(matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx] || null);
        renderMatrizViewSetor();
        return;
    }

    const statusEl = document.getElementById('matrizRiscoSaveStatus');
    if (statusEl) { statusEl.textContent = 'Removendo...'; statusEl.style.color = 'var(--text-light)'; }

    // Localiza com precisão o índice do risco legado no array persistido g.riscos
    let indexNoBanco = -1;
    if (typeof riscoAlvo._origIndex === 'number' && riscoAlvo._origIndex >= 0 && riscoAlvo._origIndex < (g.riscos || []).length) {
        indexNoBanco = riscoAlvo._origIndex;
    } else if (riscoAlvo.id && Array.isArray(g.riscos)) {
        indexNoBanco = g.riscos.findIndex(r => r.id === riscoAlvo.id);
    } else if (Array.isArray(g.riscos)) {
        indexNoBanco = g.riscos.findIndex(r => r.agente === riscoAlvo.agente && r.tipo_agente === riscoAlvo.tipo_agente);
    }

    let riscosAtualizados;
    if (indexNoBanco >= 0) {
        riscosAtualizados = g.riscos.filter((_, i) => i !== indexNoBanco);
    } else {
        riscosAtualizados = Array.isArray(g.riscos) ? g.riscos.slice() : [];
    }

    try {
        const payload = [{
            id: g.id,
            nome: g.nome,
            cargos: g.cargos || [],
            quantidade_oficial: g.quantidade_oficial || 0,
            riscos: riscosAtualizados,
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }];

        await supabaseUpsert('ghe_catalogo', payload);

        // Sucesso comprovado no banco: sincroniza memória oficial
        g.riscos = riscosAtualizados;
        matrizRiscoDetalheSubtabAtiva = 'avaliacao';
        carregarRiscosTrabalhoDoGhe(g);
        if (matrizRiscoSelecionadoIdx >= matrizGheRiscosTrabalho.length) {
            matrizRiscoSelecionadoIdx = Math.max(0, matrizGheRiscosTrabalho.length - 1);
        }
        inicializarDraftRisco(matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx] || null);
        renderMatrizViewSetor();
    } catch (err) {
        console.error('Erro ao remover risco do GHE:', err);
        alert('Falha ao remover risco no banco: ' + err.message);
        if (statusEl) { statusEl.textContent = '❌ Falha: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function renderRiscoAtivoDetalhesHtml(g, r, idx) {
    if (!r) {
        return '<div class="db-list-empty" style="padding:20px;">Nenhum risco selecionado. Adicione um novo risco clicando em "➕ Novo Risco".</div>';
    }

    const campoMini = 'padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px; width:100%; box-sizing:border-box; background:var(--bg); color:var(--text);';
    const nivel = nivelRiscoGhe(r.probabilidade, r.severidade);
    const corGrav = nivel.cor || '#888888';

    return `
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:14px; margin-top:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:8px; flex-wrap:wrap; gap:8px;">
            <div style="font-weight:700; font-size:13px; color:var(--text);">
                📝 Editando Risco ${idx + 1}: <span style="color:var(--primary);">${escapeHTML(r.agente || 'Sem Nome')}</span>
                ${r._isNovoNaoSalvo ? '<span style="font-size:11px; background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:10px; font-weight:700; margin-left:8px;">Rascunho Não Salvo</span>' : ''}
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span id="matrizRiscoSaveStatus" style="font-size:12px; color:var(--text-light);"></span>
                <button type="button" class="db-clear-btn" onclick="cancelarEdicaoRiscoGhe(${idx})" style="font-size:12px; padding:6px 12px;">✕ Cancelar / Descartar</button>
                <button type="button" class="db-apply-btn" onclick="salvarRiscoGheEmEdicao(${idx})" style="font-size:12px; padding:6px 14px;">💾 Salvar Alterações no GHE</button>
            </div>
        </div>

        <!-- Linha 1: Tipo de Agente, Nome do Agente e Código eSocial -->
        <div style="display:grid; grid-template-columns:180px 1fr 160px; gap:10px; margin-bottom:10px;">
            <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-light); display:block; margin-bottom:4px;">Tipo de Agente *</label>
                <select id="riscoEdit_tipo" onchange="aoMudarTipoAgenteRisco(${idx}, this)" style="${campoMini}">
                    <option value="Físico" ${r.tipo_agente === 'Físico' ? 'selected' : ''}>🔵 Físico</option>
                    <option value="Químico" ${r.tipo_agente === 'Químico' ? 'selected' : ''}>🔴 Químico</option>
                    <option value="Biológico" ${r.tipo_agente === 'Biológico' ? 'selected' : ''}>🟤 Biológico</option>
                    <option value="Ergonômico" ${r.tipo_agente === 'Ergonômico' ? 'selected' : ''}>🟡 Ergonômico</option>
                    <option value="Acidentes" ${r.tipo_agente === 'Acidentes' ? 'selected' : ''}>🟠 Acidentes</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-light); display:block; margin-bottom:4px;">Agente / Fator de Risco *</label>
                <div style="display:flex; gap:6px;">
                    <select id="riscoEdit_agente_select" onchange="aoSelecionarAgenteCatalogo(${idx}, this)" style="${campoMini} flex:1; min-width:0;" aria-label="Selecionar agente do catálogo eSocial">
                        <option value="">-- Selecione no catálogo ou digite --</option>
                        ${getEsocialOpcoesPorTipo(r.tipo_agente).map(a => `<option value="${escapeHTML(a.nome)}" data-codigo="${escapeHTML(a.codigo)}" ${r.agente === a.nome ? 'selected' : ''}>${escapeHTML(a.nome)}</option>`).join('')}
                        <option value="__CUSTOM__" ${r.agente && !getEsocialOpcoesPorTipo(r.tipo_agente).some(a => a.nome === r.agente) ? 'selected' : ''}>➕ Outro (digitar manualmente)...</option>
                    </select>
                    <input type="text" id="riscoEdit_agente" value="${escapeHTML(r.agente || '')}" oninput="atualizarCampoRiscoEmEdicao('agente', this.value); if(this.value) { const s = document.getElementById('riscoEdit_agente_select'); if(s) s.value='__CUSTOM__'; const e = document.getElementById('riscoEdit_esocial'); if(e && !matrizRiscoEdicaoDraft?.esocial_codigo_manual) { e.value = ''; atualizarCampoRiscoEmEdicao('esocial_codigo', ''); } }" placeholder="Digite o agente..." style="${campoMini} flex:1; min-width:0; ${r.agente && !getEsocialOpcoesPorTipo(r.tipo_agente).some(a => a.nome === r.agente) ? '' : 'display:none;'}">
                </div>
                <small id="riscoEdit_legenda_tipo" style="color:var(--text-light); font-size:10px; margin-top:2px; display:block;">${r.tipo_agente === 'Ergonômico' || r.tipo_agente === 'Acidentes' ? 'Fatores PGR (NR-01) — Sem enquadramento previdenciário no eSocial S-2240' : 'Tabela 24 eSocial: <b>' + getEsocialOpcoesPorTipo(r.tipo_agente).length + '</b> opções frequentes (lista parcial da Tabela 24 — use manual para outros agentes)'}</small>
            </div>
            <div>
                <label style="font-size:11px; font-weight:700; color:var(--text-light); display:block; margin-bottom:4px;">Código eSocial (Tabela 24)</label>
                <input type="text" id="riscoEdit_esocial" value="${escapeHTML(r.esocial_codigo || '')}" oninput="atualizarCampoRiscoEmEdicao('esocial_codigo', this.value)" placeholder="Ex: 01.01.001" style="${campoMini}">
            </div>
        </div>

                <!-- Linha 2: Navegador de Sub-abas Técnicas da Avaliação -->
        <div style="display:flex; gap:6px; margin:12px 0 10px 0; border-bottom:1px solid var(--border); padding-bottom:4px; overflow-x:auto;">
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="avaliacao" onclick="trocarSubtabDetalheRisco('avaliacao', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'avaliacao' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'avaliacao' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'avaliacao' ? '700' : '500'};">📐 Avaliação</button>
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="epis" onclick="trocarSubtabDetalheRisco('epis', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'epis' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'epis' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'epis' ? '700' : '500'};">🛡️ EPIs</button>
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="epcs" onclick="trocarSubtabDetalheRisco('epcs', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'epcs' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'epcs' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'epcs' ? '700' : '500'};">🏭 EPCs</button>
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="controles" onclick="trocarSubtabDetalheRisco('controles', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'controles' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'controles' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'controles' ? '700' : '500'};">⚙️ Medidas de Controle</button>
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="laudos" onclick="trocarSubtabDetalheRisco('laudos', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'laudos' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'laudos' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'laudos' ? '700' : '500'};">📋 Laudos</button>
            <button type="button" class="matriz-risco-subtab-btn" data-subtab="danos" onclick="trocarSubtabDetalheRisco('danos', ${idx})" style="padding:6px 12px; font-size:12px; cursor:pointer; background:transparent; border:none; border-bottom:${matrizRiscoDetalheSubtabAtiva === 'danos' ? '2px solid var(--primary)' : '2px solid transparent'}; color:${matrizRiscoDetalheSubtabAtiva === 'danos' ? 'var(--primary)' : 'var(--text-light)'}; font-weight:${matrizRiscoDetalheSubtabAtiva === 'danos' ? '700' : '500'};">🏥 Danos à Saúde</button>
        </div>

        <div id="matrizRiscoSubtabContent">
            ${renderConteudoSubtabDetalheRisco(r, idx, matrizRiscoDetalheSubtabAtiva)}
        </div>
    </div>
    `;
}


function trocarSubtabDetalheRisco(subtab, idx) {
    matrizRiscoDetalheSubtabAtiva = subtab;
    const container = document.getElementById('matrizRiscoSubtabContent');
    const botoes = document.querySelectorAll('.matriz-risco-subtab-btn');
    botoes.forEach(b => {
        const ativ = b.getAttribute('data-subtab') === subtab;
        b.style.borderBottom = ativ ? '2px solid var(--primary)' : '2px solid transparent';
        b.style.color = ativ ? 'var(--primary)' : 'var(--text-light)';
        b.style.fontWeight = ativ ? '700' : '500';
    });

    if (container && matrizRiscoEdicaoDraft) {
        container.innerHTML = renderConteudoSubtabDetalheRisco(matrizRiscoEdicaoDraft, idx, subtab);
        if (subtab === 'epis') {
            configurarListenersTabelaEpis(idx);
        } else if (subtab === 'epcs') {
            configurarListenersTabelaEpcs(idx);
        } else if (subtab === 'avaliacao') {
            configurarListenersTabelaMedicoes(idx);
        } else if (subtab === 'danos') {
            configurarListenersTabelaExames(idx);
            configurarListenersTabelaCids(idx);
        } else if (subtab === 'controles') {
            configurarListenersTabelaMedidas(idx);
        }
    }
}

function renderConteudoSubtabDetalheRisco(r, idx, subtab) {
    const campoMini = 'padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px; width:100%; box-sizing:border-box; background:var(--bg); color:var(--text);';
    const nivel = nivelRiscoGhe(r.probabilidade, r.severidade);
    const corGrav = nivel.cor || '#888888';

    if (subtab === 'avaliacao') {
        const medicoesLista = Array.isArray(r.medicoes_lista) ? r.medicoes_lista : [];
        if (medicoesLista.length > 0) {
            const itemRecente = ordenarMedicoesDecrescente(medicoesLista)[0];
            if (itemRecente) {
                r.quanti_valor = (itemRecente.valor || '').trim();
                r.quanti_unidade = itemRecente.unidade === 'Outro' ? (itemRecente.unidade_custom || 'Outro') : (itemRecente.unidade || '').trim();
                r.quanti_limite = (itemRecente.limite || '').trim();
                r.quanti_nivel_acao = (itemRecente.nivel_acao || '').trim();
                r.quanti_metodo = (itemRecente.metodo || '').trim();
                r.quanti_conclusao = (itemRecente.conclusao || '').trim();
            }
        }
        const temDadosLegadosQuanti = (r.quanti_valor || r.quanti_unidade || r.quanti_limite || r.quanti_nivel_acao || r.quanti_metodo || r.quanti_conclusao);
        const ordenadas = ordenarMedicoesDecrescente(medicoesLista);
        const unidadesPadrao = ['dB(A)', 'dB(C)', 'm/s²', 'm/s^1.75', 'ppm', 'mg/m³', '°C', 'lx', 'Outro'];
        const conclusoesPadrao = ['', 'Abaixo do Nível de Ação', 'Entre o Nível de Ação e o Limite', 'Acima do Limite de Tolerância'];

        return `
        <!-- Sub-aba 1: Avaliação Qualitativa (AIHA) & Quantitativa (NR-15/NHO) -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <!-- Qualitativa AIHA -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span>📐 Metodologia AIHA (PGR Seção 16) *</span>
                    <span style="font-size:11px; color:var(--text-light); font-weight:normal;">Qualitativo P×S</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Probabilidade (1 a 5)</label>
                        ${selectProbSeverGhe(r.probabilidade, `atualizarCampoRiscoEmEdicao('probabilidade', this.value); recalcularRiscoAtivo(${idx});`, GHE_ANCORAS_PROBABILIDADE)}
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Severidade/Efeito (1 a 5)</label>
                        ${selectProbSeverGhe(r.severidade, `atualizarCampoRiscoEmEdicao('severidade', this.value); recalcularRiscoAtivo(${idx});`, GHE_ANCORAS_EFEITO)}
                    </div>
                </div>
                <div style="text-align:center; padding:10px; border-radius:8px; background:${corGrav}22; border:1px solid ${corGrav}; color:${corGrav}; font-weight:800; font-size:13px;">
                    Gravidade ${nivel.valor !== null ? nivel.valor : (r.gravidade || '—')} — ${escapeHTML(nivel.label || r.gravidade_label || 'Pendente')}
                </div>
            </div>

            <!-- Síntese da Avaliação Quantitativa (Campos Legados / SGG) -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div style="font-size:12px; font-weight:700; color:var(--text);">
                        <span>📊 Síntese Quantitativa (Vigente / SGG)</span>
                    </div>
                    ${(temDadosLegadosQuanti && medicoesLista.length === 0) ? `
                    <button type="button" class="db-clear-btn" onclick="importarMedicaoLegadaParaLista(${idx})" style="font-size:11px; padding:3px 8px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                        📥 Importar medição atual para o histórico
                    </button>
                    ` : ''}
                </div>

                ${medicoesLista.length > 0 ? `
                <div style="font-size:10px; color:var(--primary); font-weight:600; margin-bottom:6px;">
                    🔗 Sincronizado automaticamente com a ${ordenadas[0]?.data ? 'medição mais recente' : 'medição de referência'} do histórico abaixo
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Valor Medido</label>
                        <input type="text" id="matrizRiscoInputQuantiValor" value="${escapeHTML(r.quanti_valor || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Unidade</label>
                        <input type="text" id="matrizRiscoInputQuantiUnidade" value="${escapeHTML(r.quanti_unidade || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Limite (NR-15 / ACGIH)</label>
                        <input type="text" id="matrizRiscoInputQuantiLimite" value="${escapeHTML(r.quanti_limite || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Nível de Ação (NR-09)</label>
                        <input type="text" id="matrizRiscoInputQuantiNA" value="${escapeHTML(r.quanti_nivel_acao || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Método / Norma</label>
                        <input type="text" id="matrizRiscoInputQuantiMetodo" value="${escapeHTML(r.quanti_metodo || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                    <div>
                        <label style="font-size:10px; color:var(--text-light); display:block;">Conclusão Pericial</label>
                        <input type="text" id="matrizRiscoInputQuantiConclusao" value="${escapeHTML(r.quanti_conclusao || '')}" readonly style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                    </div>
                </div>
                ` : `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Valor Medido</label>
                        <input type="text" value="${escapeHTML(r.quanti_valor || '')}" oninput="atualizarCampoRiscoEmEdicao('quanti_valor', this.value)" placeholder="Ex: 84.2, 0.45, 12..." style="${campoMini}">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Unidade de Medida</label>
                        <select onchange="atualizarCampoRiscoEmEdicao('quanti_unidade', this.value)" style="${campoMini}">
                            <option value="">-- Selecione a unidade --</option>
                            <option value="dB(A)" ${r.quanti_unidade === 'dB(A)' ? 'selected' : ''}>dB(A) (Ruído contínuo)</option>
                            <option value="dB(C)" ${r.quanti_unidade === 'dB(C)' ? 'selected' : ''}>dB(C) (Ruído impacto)</option>
                            <option value="m/s²" ${r.quanti_unidade === 'm/s²' ? 'selected' : ''}>m/s² (aren - Vibração)</option>
                            <option value="m/s^1.75" ${r.quanti_unidade === 'm/s^1.75' ? 'selected' : ''}>m/s^1.75 (VDVR)</option>
                            <option value="ppm" ${r.quanti_unidade === 'ppm' ? 'selected' : ''}>ppm (Gases/Vapores)</option>
                            <option value="mg/m³" ${r.quanti_unidade === 'mg/m³' ? 'selected' : ''}>mg/m³ (Poeiras/Fumos)</option>
                            <option value="°C" ${r.quanti_unidade === '°C' ? 'selected' : ''}>°C (IBUTG - Calor)</option>
                            <option value="lx" ${r.quanti_unidade === 'lx' ? 'selected' : ''}>lx (Iluminamento)</option>
                            <option value="Outro" ${r.quanti_unidade === 'Outro' ? 'selected' : ''}>Outro</option>
                            ${(r.quanti_unidade && !unidadesPadrao.includes(r.quanti_unidade)) ? `<option value="${escapeHTML(r.quanti_unidade)}" selected>${escapeHTML(r.quanti_unidade)} (Personalizada)</option>` : ''}
                        </select>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Limite de Tolerância (NR-15) / TLV (ACGIH)</label>
                        <input type="text" value="${escapeHTML(r.quanti_limite || '')}" oninput="atualizarCampoRiscoEmEdicao('quanti_limite', this.value)" placeholder="Ex: 85 dB(A) (NR-15), 5.0 m/s²..." style="${campoMini}">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Nível de Ação (NR-09)</label>
                        <input type="text" value="${escapeHTML(r.quanti_nivel_acao || '')}" oninput="atualizarCampoRiscoEmEdicao('quanti_nivel_acao', this.value)" placeholder="Ex: 80 dB(A), 2.5 m/s²..." style="${campoMini}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Método / Norma de Medição</label>
                        <input type="text" value="${escapeHTML(r.quanti_metodo || '')}" oninput="atualizarCampoRiscoEmEdicao('quanti_metodo', this.value)" placeholder="Ex: NHO-01 Fundacentro, Dosimetria..." style="${campoMini}">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Conclusão da Medição</label>
                        <select onchange="atualizarCampoRiscoEmEdicao('quanti_conclusao', this.value)" style="${campoMini}">
                            <option value="">-- Não avaliado quantitativamente --</option>
                            <option value="Abaixo do Nível de Ação" ${r.quanti_conclusao === 'Abaixo do Nível de Ação' ? 'selected' : ''}>🟢 Abaixo do Nível de Ação (< NA)</option>
                            <option value="Entre o Nível de Ação e o Limite" ${r.quanti_conclusao === 'Entre o Nível de Ação e o Limite' ? 'selected' : ''}>🟡 Entre o Nível de Ação e o Limite (NA a LT)</option>
                            <option value="Acima do Limite de Tolerância" ${r.quanti_conclusao === 'Acima do Limite de Tolerância' ? 'selected' : ''}>🔴 Acima do Limite de Tolerância (> LT)</option>
                            ${(r.quanti_conclusao && !conclusoesPadrao.includes(r.quanti_conclusao)) ? `<option value="${escapeHTML(r.quanti_conclusao)}" selected>${escapeHTML(r.quanti_conclusao)}</option>` : ''}
                        </select>
                    </div>
                </div>
                `}
            </div>
        </div>

        <!-- Tabela Estruturada de Histórico de Amostragens / Medições Quantitativas -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:12px; font-weight:700; color:var(--text);">📊 Histórico de Amostragens / Medições Quantitativas (${medicoesLista.length})</div>
                <div style="font-size:10.5px; color:var(--text-light);">A medição mais recente no topo sincroniza os campos de quantitativa da empresa</div>
            </div>

            <div style="margin-bottom:14px; border:1px solid var(--border); border-radius:6px; overflow:hidden;">
                ${ordenadas.length === 0 ? `
                <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                    Nenhuma medição estruturada registrada no histórico. Utilize o formulário abaixo para registrar novas dosimetrias ou amostragens.
                </div>
                ` : `
                <div id="tabelaMedicoesContainer" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                        <thead>
                            <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                <th style="padding:6px 8px; width:125px;">Data Amostragem</th>
                                <th style="padding:6px 8px; width:95px;">Valor</th>
                                <th style="padding:6px 8px; width:125px;">Unidade</th>
                                <th style="padding:6px 8px; width:130px;">Limite (LT) / NA</th>
                                <th style="padding:6px 8px;">Método / Norma</th>
                                <th style="padding:6px 8px; width:160px;">Conclusão Pericial</th>
                                <th style="padding:6px 8px; width:140px;">Resp. Técnico / Laboratório / Aparelho</th>
                                <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ordenadas.map((item, i) => `
                            <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                <td style="padding:6px 8px;">
                                    <input type="date" data-med-campo="data" class="med-item-field" value="${escapeHTML(item.data || '')}" style="${campoMini} font-weight:700;">
                                    ${(i === 0 && item.data) ? '<span style="font-size:9.5px; color:var(--primary); display:block; margin-top:2px; font-weight:600;">★ Mais Recente</span>' : ''}
                                    ${!item.data ? '<span style="font-size:9.5px; color:#b45309; display:block; margin-top:1px; font-weight:600;">⚠️ Data não informada (recência desconhecida)</span>' : ''}
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-med-campo="valor" class="med-item-field" value="${escapeHTML(item.valor || '')}" placeholder="Ex: 84.2" style="${campoMini} font-weight:700;">
                                </td>
                                <td style="padding:6px 8px;">
                                    <select data-med-campo="unidade" class="med-item-field" style="${campoMini}">
                                        <option value="">-- Unidade --</option>
                                        <option value="dB(A)" ${item.unidade === 'dB(A)' ? 'selected' : ''}>dB(A)</option>
                                        <option value="dB(C)" ${item.unidade === 'dB(C)' ? 'selected' : ''}>dB(C)</option>
                                        <option value="m/s²" ${item.unidade === 'm/s²' ? 'selected' : ''}>m/s²</option>
                                        <option value="m/s^1.75" ${item.unidade === 'm/s^1.75' ? 'selected' : ''}>m/s^1.75</option>
                                        <option value="ppm" ${item.unidade === 'ppm' ? 'selected' : ''}>ppm</option>
                                        <option value="mg/m³" ${item.unidade === 'mg/m³' ? 'selected' : ''}>mg/m³</option>
                                        <option value="°C" ${item.unidade === '°C' ? 'selected' : ''}>°C</option>
                                        <option value="lx" ${item.unidade === 'lx' ? 'selected' : ''}>lx</option>
                                        <option value="Outro" ${item.unidade === 'Outro' ? 'selected' : ''}>Outro...</option>
                                        ${(item.unidade && !unidadesPadrao.includes(item.unidade)) ? `<option value="${escapeHTML(item.unidade)}" selected>${escapeHTML(item.unidade)}</option>` : ''}
                                    </select>
                                    <input type="text" data-med-campo="unidade_custom" class="med-item-field" value="${escapeHTML(item.unidade_custom || '')}" placeholder="Especifique a unidade..." style="${campoMini} margin-top:3px; display:${item.unidade === 'Outro' ? 'block' : 'none'};">
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-med-campo="limite" class="med-item-field" value="${escapeHTML(item.limite || '')}" placeholder="LT (ex: 85 dB)" style="${campoMini} margin-bottom:2px;">
                                    <input type="text" data-med-campo="nivel_acao" class="med-item-field" value="${escapeHTML(item.nivel_acao || '')}" placeholder="NA (ex: 80 dB)" style="${campoMini}">
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-med-campo="metodo" class="med-item-field" value="${escapeHTML(item.metodo || '')}" placeholder="Ex: NHO-01 Fundacentro, Dosimetria..." style="${campoMini}">
                                </td>
                                <td style="padding:6px 8px;">
                                    <select data-med-campo="conclusao" class="med-item-field" style="${campoMini}">
                                        <option value="">-- Não avaliado --</option>
                                        <option value="Abaixo do Nível de Ação" ${item.conclusao === 'Abaixo do Nível de Ação' ? 'selected' : ''}>🟢 < NA</option>
                                        <option value="Entre o Nível de Ação e o Limite" ${item.conclusao === 'Entre o Nível de Ação e o Limite' ? 'selected' : ''}>🟡 NA a LT</option>
                                        <option value="Acima do Limite de Tolerância" ${item.conclusao === 'Acima do Limite de Tolerância' ? 'selected' : ''}>🔴 > LT</option>
                                        ${(item.conclusao && !conclusoesPadrao.includes(item.conclusao)) ? `<option value="${escapeHTML(item.conclusao)}" selected>${escapeHTML(item.conclusao)}</option>` : ''}
                                    </select>
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-med-campo="laboratorio" class="med-item-field" value="${escapeHTML(item.laboratorio || '')}" placeholder="Higienista / Aparelho / Lab..." style="${campoMini}">
                                </td>
                                <td style="padding:6px 6px; text-align:center;">
                                    <button type="button" class="btn-remover-med-item" data-uid="${escapeHTML(item.uid)}" title="Remover esta medição" style="border:none; background:transparent; color:var(--danger); cursor:pointer; font-size:14px; padding:4px;">🗑️</button>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}

                <!-- Card de Adição Rápida de Medição Responsivo -->
                <div style="background:var(--bg); padding:10px; border-top:1px solid var(--border);">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Registrar Nova Medição / Amostragem:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px;">
                        <div style="flex:1 1 125px; min-width:115px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Data da Amostragem</label>
                            <input type="date" id="novaMed_data" style="${campoMini}">
                        </div>
                        <div style="flex:1 1 95px; min-width:85px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Valor Medido *</label>
                            <input type="text" id="novaMed_valor" placeholder="Ex: 84.2" style="${campoMini} font-weight:700;">
                        </div>
                        <div style="flex:1 1 130px; min-width:115px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Unidade</label>
                            <select id="novaMed_unidade" onchange="const el = document.getElementById('novaMed_unidade_custom'); if(el) { el.style.display = this.value === 'Outro' ? 'block' : 'none'; if(this.value !== 'Outro') el.value = ''; }" style="${campoMini}">
                                <option value="">-- Selecione --</option>
                                <option value="dB(A)">dB(A) (Ruído contínuo)</option>
                                <option value="dB(C)">dB(C) (Ruído impacto)</option>
                                <option value="m/s²">m/s² (aren - Vibração)</option>
                                <option value="m/s^1.75">m/s^1.75 (VDVR)</option>
                                <option value="ppm">ppm (Gases/Vapores)</option>
                                <option value="mg/m³">mg/m³ (Poeiras/Fumos)</option>
                                <option value="°C">°C (IBUTG - Calor)</option>
                                <option value="lx">lx (Iluminamento)</option>
                                <option value="Outro">Outro...</option>
                            </select>
                            <input type="text" id="novaMed_unidade_custom" placeholder="Especifique a unidade..." style="${campoMini} margin-top:3px; display:none;">
                        </div>
                        <div style="flex:1 1 120px; min-width:105px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Limite (NR-15/TLV)</label>
                            <input type="text" id="novaMed_limite" placeholder="Ex: 85 dB(A)" style="${campoMini}">
                        </div>
                        <div style="flex:1 1 120px; min-width:105px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Nível de Ação (NR-09)</label>
                            <input type="text" id="novaMed_nivel_acao" placeholder="Ex: 80 dB(A)" style="${campoMini}">
                        </div>
                        <div style="flex:1 1 150px; min-width:130px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Método / Norma</label>
                            <input type="text" id="novaMed_metodo" placeholder="Ex: NHO-01 Fundacentro..." style="${campoMini}">
                        </div>
                        <div style="flex:1 1 150px; min-width:130px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Conclusão Pericial</label>
                            <select id="novaMed_conclusao" style="${campoMini}">
                                <option value="">-- Não informado --</option>
                                <option value="Abaixo do Nível de Ação">🟢 Abaixo do Nível de Ação (< NA)</option>
                                <option value="Entre o Nível de Ação e o Limite">🟡 Entre o Nível de Ação e o Limite (NA a LT)</option>
                                <option value="Acima do Limite de Tolerância">🔴 Acima do Limite de Tolerância (> LT)</option>
                            </select>
                        </div>
                        <div style="flex:1 1 150px; min-width:130px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Resp. Técnico / Lab / Aparelho</label>
                            <input type="text" id="novaMed_laboratorio" placeholder="Higienista / Dosímetro..." style="${campoMini}">
                        </div>
                        <div style="flex:0 0 auto;">
                            <button type="button" class="db-apply-btn" onclick="adicionarMedicaoNaListaRisco(${idx})" style="font-size:11.5px; padding:6px 14px; height:31px; white-space:nowrap;">
                                ➕ Inserir Medição
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    if (subtab === 'epis') {
        const episLista = Array.isArray(r.epis_lista) ? r.epis_lista : [];
        if (episLista.length > 0) {
            r.epi_ca = (episLista[0].ca || '').trim();
        }
        return `
        <!-- Sub-aba 2: EPIs -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:12px; font-weight:700; color:var(--text);">🛡️ Equipamentos de Proteção Individual (NR-06 / eSocial S-2240)</div>
                ${(r.epi_ca && episLista.length === 0) ? `
                <button type="button" class="db-clear-btn" onclick="importarEpiLegadoParaLista(${idx})" style="font-size:11px; padding:4px 10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                    📥 Importar CA principal legado (${escapeHTML(r.epi_ca)}) para a lista
                </button>
                ` : ''}
            </div>

            <!-- Tabela Estruturada de Múltiplos EPIs Vinculados -->
            <div style="margin-bottom:14px; border:1px solid var(--border); border-radius:6px; overflow:hidden;">
                <div style="background:var(--bg); padding:8px 12px; font-size:11.5px; font-weight:700; color:var(--text); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span>📋 Relação Estruturada de EPIs vinculados a este Risco (${episLista.length})</span>
                    <span style="font-size:10px; font-weight:normal; color:var(--text-light);">O primeiro item sincroniza o CA principal legado</span>
                </div>

                ${episLista.length === 0 ? `
                <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                    Nenhum EPI estruturado adicionado na lista. Utilize o formulário abaixo para vincular múltiplos EPIs com CAs individuais.
                </div>
                ` : `
                <div id="tabelaEpisContainer" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                        <thead>
                            <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                <th style="padding:6px 8px; width:110px;">CA</th>
                                <th style="padding:6px 8px;">Equipamento / Descrição</th>
                                <th style="padding:6px 8px; width:120px;">Periodicidade</th>
                                <th style="padding:6px 6px; width:110px;">Eficaz? (S-2240)</th>
                                <th style="padding:6px 6px; width:110px;">Atende Norma?</th>
                                <th style="padding:6px 6px; width:110px;">Treinado?</th>
                                <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${episLista.map((item, i) => `
                            <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                <td style="padding:6px 8px;">
                                    <input type="text" data-epi-campo="ca" class="epi-item-field" value="${escapeHTML(item.ca || '')}" placeholder="CA" style="${campoMini} font-weight:700;">
                                    ${i === 0 ? '<span style="font-size:9.5px; color:var(--primary); display:block; margin-top:2px; font-weight:600;">★ Principal</span>' : ''}
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-epi-campo="descricao" class="epi-item-field" value="${escapeHTML(item.descricao || '')}" placeholder="Descrição do EPI" style="${campoMini}">
                                    ${item.epi_catalogo_id ? `<span style="font-size:9.5px; color:var(--text-light); display:block; margin-top:2px;">Cód. ${escapeHTML(item.epi_catalogo_id)}</span>` : ''}
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-epi-campo="periodicidade" class="epi-item-field" value="${escapeHTML(item.periodicidade || '')}" placeholder="Ex: Semestral" style="${campoMini}">
                                </td>
                                <td style="padding:6px 6px;">
                                    <select data-epi-campo="eficaz" class="epi-item-field" style="${campoMini}">
                                        <option value="">--</option>
                                        <option value="S" ${item.eficaz === 'S' ? 'selected' : ''}>Sim</option>
                                        <option value="N" ${item.eficaz === 'N' ? 'selected' : ''}>Não</option>
                                    </select>
                                </td>
                                <td style="padding:6px 6px;">
                                    <select data-epi-campo="conformidade" class="epi-item-field" style="${campoMini}">
                                        <option value="">--</option>
                                        <option value="S" ${item.conformidade === 'S' ? 'selected' : ''}>Sim</option>
                                        <option value="N" ${item.conformidade === 'N' ? 'selected' : ''}>Não</option>
                                    </select>
                                </td>
                                <td style="padding:6px 6px;">
                                    <select data-epi-campo="treinamento" class="epi-item-field" style="${campoMini}">
                                        <option value="">--</option>
                                        <option value="S" ${item.treinamento === 'S' ? 'selected' : ''}>Sim</option>
                                        <option value="N" ${item.treinamento === 'N' ? 'selected' : ''}>Não</option>
                                    </select>
                                </td>
                                <td style="padding:6px 6px; text-align:center;">
                                    <button type="button" class="btn-remover-epi-item" data-uid="${escapeHTML(item.uid)}" title="Remover este EPI" style="border:none; background:transparent; color:var(--danger); cursor:pointer; font-size:14px; padding:4px;">🗑️</button>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}

                <!-- Card de Adição Rápida com Busca de CA Responsivo -->
                <div style="background:var(--bg); padding:10px; border-top:1px solid var(--border);">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Adicionar EPI a este Risco:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px;">
                        <div style="position:relative; flex:1 1 130px; min-width:120px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Número do CA</label>
                            <input type="text" id="novoEpi_ca" oninput="aoDigitarCaEpi(this, 'novo')" onfocus="aoFocarCaEpi(this, 'novo')" onblur="fecharMenuSugestoesCa('novo')" autocomplete="off" placeholder="Ex: 14470..." style="${campoMini}">
                            <div id="novoEpiCaSugestoesContainer" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:999; width:100%; min-width:240px; max-width:320px; background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.18); margin-top:2px;"></div>
                        </div>
                        <div style="flex:2 1 200px; min-width:180px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Descrição do Equipamento</label>
                            <input type="text" id="novoEpi_desc" placeholder="Ex: Protetor auditivo circum-auricular" style="${campoMini}">
                            <input type="hidden" id="novoEpi_catalogo_id" value="">
                        </div>
                        <div style="flex:1 1 120px; min-width:110px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Periodicidade</label>
                            <input type="text" id="novoEpi_period" placeholder="Ex: Semestral" style="${campoMini}">
                        </div>
                        <div style="flex:0 0 auto;">
                            <button type="button" class="db-apply-btn" onclick="adicionarEpiNaListaRisco(${idx})" style="font-size:11.5px; padding:6px 14px; height:31px; white-space:nowrap;">
                                ➕ Inserir EPI
                            </button>
                        </div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        <div style="flex:1 1 140px; min-width:130px;">
                            <label style="font-size:10px; color:var(--text-light); display:block;">EPI é Eficaz? (S-2240)</label>
                            <select id="novoEpi_eficaz" style="${campoMini} font-size:11px; padding:4px 6px;">
                                <option value="">-- Não informado / Em avaliação --</option>
                                <option value="S">Sim (Eficaz)</option>
                                <option value="N">Não (Ineficaz)</option>
                            </select>
                        </div>
                        <div style="flex:1 1 140px; min-width:130px;">
                            <label style="font-size:10px; color:var(--text-light); display:block;">Uso Conforme Norma?</label>
                            <select id="novoEpi_conf" style="${campoMini} font-size:11px; padding:4px 6px;">
                                <option value="">-- Não informado / Em avaliação --</option>
                                <option value="S">Sim (Atendido)</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                        <div style="flex:1 1 140px; min-width:130px;">
                            <label style="font-size:10px; color:var(--text-light); display:block;">Treinamento Ministrado?</label>
                            <select id="novoEpi_trein" style="${campoMini} font-size:11px; padding:4px 6px;">
                                <option value="">-- Não informado / Em avaliação --</option>
                                <option value="S">Sim (Comprovado)</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campos Legados Preservados (Compatibilidade PGR / SGG) -->
            <div style="border-top:1px dashed var(--border); padding-top:10px; margin-top:10px;">
                <div style="font-size:11px; font-weight:700; color:var(--text-light); margin-bottom:6px;">
                    📝 Campos Gerais e Legados do Risco (PGR / SGG):
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">EPIs Recomendados (Texto Descritivo Geral)</label>
                        <textarea rows="2" oninput="atualizarCampoRiscoEmEdicao('epis_recomendados', this.value)" placeholder="Ex: Protetor auditivo concha CA 14470, Óculos de segurança..." style="${campoMini}">${escapeHTML(r.epis_recomendados || '')}</textarea>
                    </div>
                    <div>
                        <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Número do CA Principal Sincronizado</label>
                        ${episLista.length > 0 ? `
                        <div style="position:relative;">
                            <input type="text" id="matrizRiscoInputCa" value="${escapeHTML(r.epi_ca || '')}" readonly placeholder="Sincronizado com o 1º EPI da lista..." style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                            <span style="font-size:10px; color:var(--primary); font-weight:600; display:block; margin-top:3px;">🔗 Sincronizado automaticamente com o 1º EPI da relação estruturada</span>
                        </div>
                        ` : `
                        <div style="position:relative;">
                            <input type="text" id="matrizRiscoInputCa" value="${escapeHTML(r.epi_ca || '')}" oninput="aoDigitarCaEpi(this, 'principal')" onfocus="aoFocarCaEpi(this, 'principal')" onblur="fecharMenuSugestoesCa('principal')" autocomplete="off" placeholder="Ex: 14470 (ou selecione no catálogo)..." style="${campoMini}">
                            <div id="matrizRiscoCaSugestoesContainer" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:999; background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.18); margin-top:2px;"></div>
                        </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    if (subtab === 'epcs') {
        const epcsLista = Array.isArray(r.epcs_lista) ? r.epcs_lista : [];
        if (epcsLista.length > 0) {
            r.epc_status = epcsLista[0].status || '';
            r.epc_inspecao = epcsLista[0].inspecao || '';
        }
        const temDadosLegadosEpc = (r.epcs_recomendados || r.epc_status || r.epc_inspecao);
        return `
        <!-- Sub-aba 3: EPCs -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:12px; font-weight:700; color:var(--text);">🏭 Equipamentos de Proteção Coletiva (NR-01 / NR-09)</div>
                ${(temDadosLegadosEpc && epcsLista.length === 0) ? `
                <button type="button" class="db-clear-btn" onclick="importarEpcLegadoParaLista(${idx})" style="font-size:11px; padding:4px 10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                    📥 Importar EPC legado para a lista
                </button>
                ` : ''}
            </div>

            <!-- Tabela Estruturada de Múltiplos EPCs Vinculados -->
            <div style="margin-bottom:14px; border:1px solid var(--border); border-radius:6px; overflow:hidden;">
                <div style="background:var(--bg); padding:8px 12px; font-size:11.5px; font-weight:700; color:var(--text); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span>📋 Relação Estruturada de EPCs vinculados a este Risco (${epcsLista.length})</span>
                    <span style="font-size:10px; font-weight:normal; color:var(--text-light);">O primeiro item sincroniza o status e inspeção legados</span>
                </div>

                ${epcsLista.length === 0 ? `
                <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                    Nenhum EPC estruturado adicionado na lista. Utilize o formulário abaixo para registrar os equipamentos de proteção coletiva.
                </div>
                ` : `
                <div id="tabelaEpcsContainer" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                        <thead>
                            <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                <th style="padding:6px 8px;">Equipamento / Descrição do EPC</th>
                                <th style="padding:6px 8px; width:170px;">Tipo / Categoria</th>
                                <th style="padding:6px 8px; width:160px;">Status Operacional</th>
                                <th style="padding:6px 8px; width:130px;">Inspeção Prev.</th>
                                <th style="padding:6px 6px; width:110px;">Eficaz?</th>
                                <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${epcsLista.map((item, i) => `
                            <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                <td style="padding:6px 8px;">
                                    <input type="text" data-epc-campo="descricao" class="epc-item-field" value="${escapeHTML(item.descricao || '')}" placeholder="Descrição detalhada do EPC..." style="${campoMini}">
                                    ${i === 0 ? '<span style="font-size:9.5px; color:var(--primary); display:block; margin-top:2px; font-weight:600;">★ Principal</span>' : ''}
                                </td>
                                <td style="padding:6px 8px;">
                                    <select data-epc-campo="tipo" class="epc-item-field" style="${campoMini}">
                                        <option value="">-- Categoria --</option>
                                        <option value="Enclausuramento / Acústico" ${item.tipo === 'Enclausuramento / Acústico' ? 'selected' : ''}>Enclausuramento / Acústico</option>
                                        <option value="Exaustão / Ventilação" ${item.tipo === 'Exaustão / Ventilação' ? 'selected' : ''}>Exaustão / Ventilação</option>
                                        <option value="Proteção Contra Quedas" ${item.tipo === 'Proteção Contra Quedas' ? 'selected' : ''}>Proteção Contra Quedas</option>
                                        <option value="Isolamento / Barreira Física" ${item.tipo === 'Isolamento / Barreira Física' ? 'selected' : ''}>Isolamento / Barreira Física</option>
                                        <option value="Sinalização / Alerta" ${item.tipo === 'Sinalização / Alerta' ? 'selected' : ''}>Sinalização / Alerta</option>
                                        <option value="Outro" ${item.tipo === 'Outro' ? 'selected' : ''}>Outro...</option>
                                    </select>
                                    <input type="text" data-epc-campo="tipo_custom" class="epc-item-field" value="${escapeHTML(item.tipo_custom || '')}" placeholder="Especifique a categoria..." style="${campoMini} margin-top:3px; display:${item.tipo === 'Outro' ? 'block' : 'none'};">
                                </td>
                                <td style="padding:6px 8px;">
                                    <select data-epc-campo="status" class="epc-item-field" style="${campoMini}">
                                        <option value="">-- Não informado --</option>
                                        <option value="Operacional" ${item.status === 'Operacional' ? 'selected' : ''}>🟢 Operacional</option>
                                        <option value="Em Manutenção" ${item.status === 'Em Manutenção' ? 'selected' : ''}>🟡 Em Manutenção</option>
                                        <option value="Recomendado" ${item.status === 'Recomendado' ? 'selected' : ''}>🔵 Recomendado</option>
                                        <option value="Desativado" ${item.status === 'Desativado' ? 'selected' : ''}>🔴 Desativado</option>
                                        <option value="Não Aplicável" ${item.status === 'Não Aplicável' ? 'selected' : ''}>⚪ Não Aplicável</option>
                                    </select>
                                </td>
                                <td style="padding:6px 8px;">
                                    <input type="text" data-epc-campo="inspecao" class="epc-item-field" value="${escapeHTML(item.inspecao || '')}" placeholder="Ex: Mensal" style="${campoMini}">
                                </td>
                                <td style="padding:6px 6px;">
                                    <select data-epc-campo="eficaz" class="epc-item-field" style="${campoMini}">
                                        <option value="">--</option>
                                        <option value="S" ${item.eficaz === 'S' ? 'selected' : ''}>Sim</option>
                                        <option value="N" ${item.eficaz === 'N' ? 'selected' : ''}>Não</option>
                                    </select>
                                </td>
                                <td style="padding:6px 6px; text-align:center;">
                                    <button type="button" class="btn-remover-epc-item" data-uid="${escapeHTML(item.uid)}" title="Remover este EPC" style="border:none; background:transparent; color:var(--danger); cursor:pointer; font-size:14px; padding:4px;">🗑️</button>
                                </td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}

                <!-- Card de Adição Rápida de EPC Responsivo -->
                <div style="background:var(--bg); padding:10px; border-top:1px solid var(--border);">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Adicionar EPC a este Risco:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px;">
                        <div style="flex:2 1 220px; min-width:180px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Descrição do Equipamento Coletivo *</label>
                            <input type="text" id="novoEpc_desc" placeholder="Ex: Enclausuramento acústico do compressor..." style="${campoMini}">
                        </div>
                        <div style="flex:1 1 160px; min-width:140px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Tipo / Categoria</label>
                            <select id="novoEpc_tipo" onchange="const el = document.getElementById('novoEpc_tipo_custom'); if(el) { el.style.display = this.value === 'Outro' ? 'block' : 'none'; if(this.value !== 'Outro') el.value = ''; }" style="${campoMini}">
                                <option value="">-- Selecione --</option>
                                <option value="Enclausuramento / Acústico">Enclausuramento / Acústico</option>
                                <option value="Exaustão / Ventilação">Exaustão / Ventilação</option>
                                <option value="Proteção Contra Quedas">Proteção Contra Quedas</option>
                                <option value="Isolamento / Barreira Física">Isolamento / Barreira Física</option>
                                <option value="Sinalização / Alerta">Sinalização / Alerta</option>
                                <option value="Outro">Outro...</option>
                            </select>
                            <input type="text" id="novoEpc_tipo_custom" placeholder="Especifique a categoria..." style="${campoMini} margin-top:3px; display:none;">
                        </div>
                        <div style="flex:1 1 140px; min-width:120px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Status Operacional</label>
                            <select id="novoEpc_status" style="${campoMini}">
                                <option value="">-- Não informado --</option>
                                <option value="Operacional">🟢 Operacional</option>
                                <option value="Em Manutenção">🟡 Em Manutenção</option>
                                <option value="Recomendado">🔵 Recomendado</option>
                                <option value="Desativado">🔴 Desativado</option>
                                <option value="Não Aplicável">⚪ Não Aplicável</option>
                            </select>
                        </div>
                        <div style="flex:1 1 120px; min-width:110px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Periodicidade</label>
                            <input type="text" id="novoEpc_inspecao" placeholder="Ex: Mensal" style="${campoMini}">
                        </div>
                        <div style="flex:1 1 110px; min-width:90px;">
                            <label style="font-size:10px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Eficaz?</label>
                            <select id="novoEpc_eficaz" style="${campoMini}">
                                <option value="">--</option>
                                <option value="S">Sim (Eficaz)</option>
                                <option value="N">Não</option>
                            </select>
                        </div>
                        <div style="flex:0 0 auto;">
                            <button type="button" class="db-apply-btn" onclick="adicionarEpcNaListaRisco(${idx})" style="font-size:11.5px; padding:6px 14px; height:31px; white-space:nowrap;">
                                ➕ Inserir EPC
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Campos Legados Preservados (Compatibilidade PGR / SGG) -->
            <div style="border-top:1px dashed var(--border); padding-top:10px; margin-top:10px;">
                <div style="font-size:11px; font-weight:700; color:var(--text-light); margin-bottom:6px;">
                    📝 Campos Gerais e Legados do Risco (PGR / SGG):
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">EPCs Recomendados / Existentes (Texto Descritivo Geral)</label>
                        <textarea rows="3" oninput="atualizarCampoRiscoEmEdicao('epcs_recomendados', this.value)" placeholder="Ex: Enclausuramento acústico, Exaustor de solda, Guarda-corpo..." style="${campoMini}">${escapeHTML(r.epcs_recomendados || '')}</textarea>
                    </div>
                    <div>
                        ${epcsLista.length > 0 ? `
                        <div style="margin-bottom:8px;">
                            <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Status de Operação do EPC (Sincronizado)</label>
                            <input type="text" id="matrizRiscoInputEpcStatus" value="${escapeHTML(r.epc_status || '')}" readonly placeholder="Sincronizado com o 1º EPC da lista..." style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                            <span style="font-size:10px; color:var(--primary); font-weight:600; display:block; margin-top:2px;">🔗 Sincronizado automaticamente com o 1º EPC da relação estruturada</span>
                        </div>
                        <div>
                            <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Periodicidade de Inspeção Preventiva (Sincronizada)</label>
                            <input type="text" id="matrizRiscoInputEpcInspecao" value="${escapeHTML(r.epc_inspecao || '')}" readonly placeholder="Sincronizada com o 1º EPC da lista..." style="${campoMini} background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;">
                        </div>
                        ` : `
                        <div style="margin-bottom:8px;">
                            <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Status de Operação do EPC</label>
                            <select onchange="atualizarCampoRiscoEmEdicao('epc_status', this.value)" style="${campoMini}">
                                <option value="">-- Não informado / Em avaliação --</option>
                                <option value="Operacional" ${r.epc_status === 'Operacional' ? 'selected' : ''}>🟢 Operacional / Em Funcionamento</option>
                                <option value="Em Manutenção" ${r.epc_status === 'Em Manutenção' ? 'selected' : ''}>🟡 Em Manutenção / Ajuste</option>
                                <option value="Recomendado" ${r.epc_status === 'Recomendado' ? 'selected' : ''}>🔵 Recomendado / Não Instalado</option>
                                <option value="Desativado" ${r.epc_status === 'Desativado' ? 'selected' : ''}>🔴 Inoperante / Desativado</option>
                                <option value="Não Aplicável" ${r.epc_status === 'Não Aplicável' ? 'selected' : ''}>⚪ Não Aplicável</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:10.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:2px;">Periodicidade de Inspeção Preventiva</label>
                            <input type="text" value="${escapeHTML(r.epc_inspecao || '')}" oninput="atualizarCampoRiscoEmEdicao('epc_inspecao', this.value)" placeholder="Ex: Mensal / Trimestral" style="${campoMini}">
                        </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    if (subtab === 'controles') {
        const medidasLista = Array.isArray(r.medidas_lista) ? r.medidas_lista : [];
        const temTextoSugestoesLegado = !!(r.sugestoes && r.sugestoes.trim());

        const categoriasPadrao = [
            'Eliminação do Fator de Risco',
            'Proteção Coletiva (EPC)',
            'Medida Administrativa / Organizacional',
            'Capacitação / Treinamento / DDS',
            'Proteção Individual (EPI)',
            'Outro'
        ];

        const statusPadrao = [
            { val: '', label: '-- Situação / Status (Neutro) --' },
            { val: 'Planejada', label: '🟡 Planejada' },
            { val: 'Em Implantação', label: '🔵 Em Implantação' },
            { val: 'Implementada', label: '🟢 Implementada' },
            { val: 'Contínua / Permanente', label: '🟣 Contínua / Permanente' }
        ];

        return `
        <!-- Sub-aba 4: Medidas de Controle e Prevenção (NR-01 GRO) -->
        <div style="display:flex; flex-direction:column; gap:12px;">

            <!-- Bloco 1: Contexto Operacional e Caracterização da Exposição -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:8px;">
                    🏭 Contexto Operacional e Condições de Exposição ao Risco
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Fontes Geradoras</label>
                        <input type="text" value="${escapeHTML(r.fontes_geradoras || '')}" oninput="atualizarCampoRiscoEmEdicao('fontes_geradoras', this.value)" placeholder="Ex: Motores, Ambiente externo, Tráfego..." style="${campoMini}">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Tempo / Tipo de Exposição</label>
                        <input type="text" value="${escapeHTML(r.tipo_tempo_exposicao || '')}" oninput="atualizarCampoRiscoEmEdicao('tipo_tempo_exposicao', this.value)" placeholder="Ex: Habitual e intermitente (8h/dia)" style="${campoMini}">
                    </div>
                    <div>
                        <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Situação Atual de Controle</label>
                        <input type="text" value="${escapeHTML(r.situacao_controle || '')}" oninput="atualizarCampoRiscoEmEdicao('situacao_controle', this.value)" placeholder="Ex: Controlado, Monitorado..." style="${campoMini}">
                    </div>
                </div>
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Descrição Detalhada do Risco / Atividade Operacional</label>
                    <textarea rows="2" oninput="atualizarCampoRiscoEmEdicao('descricao', this.value)" placeholder="Condições operacionais, locais, processos e tarefas em que ocorre a exposição..." style="${campoMini}">${escapeHTML(r.descricao || '')}</textarea>
                </div>
            </div>

            <!-- Bloco 2: Gestão Estruturada de Medidas Preventivas e Plano de Ação -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div>
                        <div style="font-size:12px; font-weight:700; color:var(--text);">
                            ⚙️ Medidas de Prevenção e Hierarquia de Controles (NR-01.4.1)
                        </div>
                        <div style="font-size:10.5px; color:var(--text-light);">
                            Plano de medidas preventivas priorizando eliminação, controles coletivos (EPC), administrativos/organizacionais, capacitação e EPI.
                        </div>
                    </div>
                    ${(temTextoSugestoesLegado && medidasLista.length === 0) ? `
                    <button type="button" class="db-clear-btn" onclick="importarMedidasLegadoParaLista(${idx})" style="font-size:11px; padding:3px 8px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                        📥 Importar medidas atuais para a lista
                    </button>
                    ` : ''}
                </div>

                <!-- Síntese Legada de Medidas / Sugestões -->
                <div style="margin-bottom:10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:10.5px; font-weight:700; color:var(--text);">Síntese Consolidada de Prevenção (Campo Legado / Relatórios SGG):</span>
                        ${medidasLista.length > 0 ? '<span style="font-size:9.5px; color:var(--primary); font-weight:600;">🔗 Sincronizado com as medidas estruturadas abaixo</span>' : ''}
                    </div>
                    <textarea id="matrizRiscoInputSugestoes" rows="2" ${medidasLista.length > 0 ? 'readonly style="' + campoMini + ' background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;"' : 'oninput="atualizarCampoRiscoEmEdicao(\'sugestoes\', this.value)" style="' + campoMini + '"'} placeholder="Ex: [Administrativa] Procedimento Operacional Padrão (POP); [Treinamento] DDS semanal...">${escapeHTML(r.sugestoes || '')}</textarea>
                </div>

                <!-- Tabela de Medidas Estruturadas -->
                <div style="border:1px solid var(--border); border-radius:6px; overflow:hidden; margin-bottom:10px;">
                    <div style="padding:6px 10px; background:var(--bg); border-bottom:1px solid var(--border); font-size:11px; font-weight:700; color:var(--text); display:flex; justify-content:space-between; align-items:center;">
                        <span>📋 Lista de Medidas Preventivas Estruturadas (${medidasLista.length})</span>
                    </div>

                    ${medidasLista.length === 0 ? `
                    <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                        Nenhuma medida preventiva estruturada vinculada a este risco. Adicione novas ações no formulário abaixo ou importe o texto legado existente.
                    </div>
                    ` : `
                    <div id="tabelaMedidasContainer" style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                    <th style="padding:6px 8px; width:210px;">Nível Hierárquico / Categoria</th>
                                    <th style="padding:6px 8px;">Descrição da Medida Preventiva / Ação</th>
                                    <th style="padding:6px 8px; width:160px;">Situação / Status</th>
                                    <th style="padding:6px 8px; width:170px;">Responsável / Prazo</th>
                                    <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${medidasLista.map((item, i) => `
                                <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                    <td style="padding:6px 8px;">
                                        ${item.origem_legada ? '<span style="font-size:10px; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; display:inline-block; font-weight:600; margin-bottom:4px;">📄 Origem: Texto Legado</span>' : ''}
                                        <select data-medprev-campo="tipo" class="medprev-item-field" style="${campoMini}">
                                            <option value="">-- Categoria Hierárquica --</option>
                                            ${categoriasPadrao.map(opt => `<option value="${escapeHTML(opt)}" ${item.tipo === opt ? 'selected' : ''}>${escapeHTML(opt)}</option>`).join('')}
                                            ${(item.tipo && !categoriasPadrao.includes(item.tipo)) ? `<option value="${escapeHTML(item.tipo)}" selected>${escapeHTML(item.tipo)}</option>` : ''}
                                        </select>
                                        <input type="text" data-medprev-campo="tipo_custom" class="medprev-item-field" value="${escapeHTML(item.tipo_custom || '')}" placeholder="Especifique a categoria..." style="${campoMini} margin-top:4px; display:${item.tipo === 'Outro' ? 'block' : 'none'};">
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <textarea rows="2" data-medprev-campo="descricao" class="medprev-item-field" placeholder="Descreva a medida preventiva específica..." style="${campoMini}">${escapeHTML(item.descricao || '')}</textarea>
                                        ${item.origem_legada ? '<span style="font-size:9.5px; color:var(--text-light); display:block; margin-top:2px;">Original herdado do campo livre; classifique a categoria ou edite a ação</span>' : ''}
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <select data-medprev-campo="status" class="medprev-item-field" style="${campoMini}">
                                            ${statusPadrao.map(opt => `<option value="${escapeHTML(opt.val)}" ${item.status === opt.val ? 'selected' : ''}>${escapeHTML(opt.label)}</option>`).join('')}
                                            ${(item.status && !statusPadrao.some(s => s.val === item.status)) ? `<option value="${escapeHTML(item.status)}" selected>${escapeHTML(item.status)}</option>` : ''}
                                        </select>
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <input type="text" data-medprev-campo="responsavel" class="medprev-item-field" value="${escapeHTML(item.responsavel || '')}" placeholder="Resp: SESMT, Obra..." style="${campoMini} margin-bottom:4px;">
                                        <input type="text" data-medprev-campo="prazo" class="medprev-item-field" value="${escapeHTML(item.prazo || '')}" placeholder="Prazo: Ex: 30 dias / Contínuo..." style="${campoMini}">
                                    </td>
                                    <td style="padding:6px 6px; text-align:center;">
                                        <button type="button" class="btn-remover-medprev-item" data-uid="${escapeHTML(item.uid)}" title="Remover medida" style="background:none; border:none; cursor:pointer; color:var(--danger); font-size:14px; padding:2px 6px;">✕</button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `}
                </div>

                <!-- Formulário de Adição Rápida de Medida Preventiva -->
                <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:10px;">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Adicionar Nova Medida Preventiva ao Risco:</div>
                    <div style="display:grid; grid-template-columns:210px 1fr 160px 170px auto; gap:8px; align-items:start;">
                        <div>
                            <select id="novaMedida_tipo" onchange="const c = document.getElementById('novaMedida_tipo_custom'); if(c) c.style.display = (this.value === 'Outro' ? 'block' : 'none');" style="${campoMini}">
                                <option value="">-- Categoria Hierárquica --</option>
                                ${categoriasPadrao.map(opt => `<option value="${escapeHTML(opt)}">${escapeHTML(opt)}</option>`).join('')}
                            </select>
                            <input type="text" id="novaMedida_tipo_custom" placeholder="Especifique a categoria..." style="${campoMini} margin-top:4px; display:none;">
                        </div>
                        <div>
                            <input type="text" id="novaMedida_descricao" placeholder="Descreva a ação preventiva ou procedimento operacional..." style="${campoMini}">
                        </div>
                        <div>
                            <select id="novaMedida_status" style="${campoMini}">
                                ${statusPadrao.map(opt => `<option value="${escapeHTML(opt.val)}">${escapeHTML(opt.label)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <input type="text" id="novaMedida_responsavel" placeholder="Responsável (ex: SESMT)" style="${campoMini} margin-bottom:4px;">
                            <input type="text" id="novaMedida_prazo" placeholder="Prazo / periodicidade" style="${campoMini}">
                        </div>
                        <div>
                            <button type="button" class="db-apply-btn" onclick="adicionarMedidaNaListaRisco(${idx})" style="padding:7px 14px; font-size:11.5px; height:34px; white-space:nowrap;">
                                ➕ Incluir Ação
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        `;
    }

    if (subtab === 'laudos') {
        return `
        <!-- Sub-aba 5: Laudos e Monitoramentos -->
        <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:10px;">📋 Conclusões Periciais e Enquadramentos de Laudos</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:10px;">
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Insalubridade (NR-15)</label>
                    <select onchange="atualizarCampoRiscoEmEdicao('laudo_insalubridade', this.value)" style="${campoMini}">
                        <option value="">-- Em avaliação / Não informado --</option>
                        <option value="Não Enseja" ${r.laudo_insalubridade === 'Não Enseja' ? 'selected' : ''}>Não Enseja Insalubridade</option>
                        <option value="Grau Mínimo (10%)" ${r.laudo_insalubridade === 'Grau Mínimo (10%)' ? 'selected' : ''}>Grau Mínimo (10%)</option>
                        <option value="Grau Médio (20%)" ${r.laudo_insalubridade === 'Grau Médio (20%)' ? 'selected' : ''}>Grau Médio (20%)</option>
                        <option value="Grau Máximo (40%)" ${r.laudo_insalubridade === 'Grau Máximo (40%)' ? 'selected' : ''}>Grau Máximo (40%)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Periculosidade (NR-16)</label>
                    <select onchange="atualizarCampoRiscoEmEdicao('laudo_periculosidade', this.value)" style="${campoMini}">
                        <option value="">-- Em avaliação / Não informado --</option>
                        <option value="Não Enseja" ${r.laudo_periculosidade === 'Não Enseja' ? 'selected' : ''}>Não Enseja Periculosidade</option>
                        <option value="Enseja Periculosidade (30%)" ${r.laudo_periculosidade === 'Enseja Periculosidade (30%)' ? 'selected' : ''}>Enseja Periculosidade (30%)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Aposentadoria Especial (LTCAT / S-2240)</label>
                    <select onchange="atualizarCampoRiscoEmEdicao('laudo_aposentadoria', this.value)" style="${campoMini}">
                        <option value="">-- Em avaliação / Não informado --</option>
                        <option value="Não Enseja" ${r.laudo_aposentadoria === 'Não Enseja' ? 'selected' : ''}>Não Enseja Aposentadoria Especial</option>
                        <option value="Especial 15 Anos" ${r.laudo_aposentadoria === 'Especial 15 Anos' ? 'selected' : ''}>Especial 15 Anos</option>
                        <option value="Especial 20 Anos" ${r.laudo_aposentadoria === 'Especial 20 Anos' ? 'selected' : ''}>Especial 20 Anos</option>
                        <option value="Especial 25 Anos" ${r.laudo_aposentadoria === 'Especial 25 Anos' ? 'selected' : ''}>Especial 25 Anos</option>
                    </select>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Responsável Técnico pelo Laudo</label>
                    <input type="text" value="${escapeHTML(r.laudo_responsavel || '')}" oninput="atualizarCampoRiscoEmEdicao('laudo_responsavel', this.value)" placeholder="Ex: Eng. João Everton - CREA 0522078320" style="${campoMini}">
                </div>
                <div>
                    <label style="font-size:11px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Data da Última Avaliação Pericial</label>
                    <input type="date" value="${escapeHTML(r.laudo_data || '')}" oninput="atualizarCampoRiscoEmEdicao('laudo_data', this.value)" style="${campoMini}">
                </div>
            </div>
        </div>
        `;
    }

    if (subtab === 'danos') {
        const examesLista = Array.isArray(r.exames_lista) ? r.exames_lista : [];
        const cidsLista = Array.isArray(r.cids_lista) ? r.cids_lista : [];
        const temTextoExamesLegado = !!(r.exames_pcmso && r.exames_pcmso.trim());
        const temTextoCidLegado = !!(r.cid10_relacionado && r.cid10_relacionado.trim());

        const examesPadrao = [
            'Audiometria tonal/vocal', 'Espirometria', 'Acuidade visual',
            'Eletrocardiograma (ECG)', 'Eletroencefalograma (EEG)', 'Hemograma completo',
            'Raio-X de Tórax (padrão OIT)', 'Glicemia de jejum', 'Creatinina / Ureia',
            'Exame Toxicológico', 'Avaliação Psicossocial', 'Outro'
        ];

        const periodicidadesPadrao = [
            'Todos os ASOs', 'Admissional', 'Periódico', 'Demissional',
            'Retorno ao Trabalho', 'Mudança de Riscos',
            'Admissional e Periódico', 'Admissional, Periódico e Demissional', 'Outro'
        ];

        return `
        <!-- Sub-aba 6: Danos à Saúde e PCMSO -->
        <div style="display:flex; flex-direction:column; gap:12px;">

            <!-- Bloco 1: Possíveis Agravos / Danos Qualitativos à Saúde (NR-07) -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:6px;">
                    🏥 Possíveis Agravos e Danos Potenciais à Saúde (NR-07)
                </div>
                <div style="font-size:11px; color:var(--text-light); margin-bottom:8px;">
                    Descrição clínica orientativa e qualitativa dos agravos, manifestações e efeitos esperados da exposição ao risco (campo livre sob responsabilidade da equipe de SST/PCMSO).
                </div>
                <textarea rows="3" oninput="atualizarCampoRiscoEmEdicao('danos_saude', this.value)" placeholder="Ex: Perda Auditiva Induzida por Ruído (PAIR), cefaleia, fadiga auditiva, estresse térmico, irritação de vias aéreas..." style="${campoMini}">${escapeHTML(r.danos_saude || '')}</textarea>
            </div>

            <!-- Bloco 2: Exames Médicos Complementares do PCMSO -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div>
                        <div style="font-size:12px; font-weight:700; color:var(--text);">
                            🩺 Exames Médicos Complementares do PCMSO (NR-07)
                        </div>
                        <div style="font-size:10.5px; color:var(--text-light);">
                            Planejamento ocupacional de exames por risco. Sugestões frequentes da NR-07 com indicação clínica a ser definida pelo Médico Coordenador do PCMSO.
                        </div>
                    </div>
                    ${(temTextoExamesLegado && examesLista.length === 0) ? `
                    <button type="button" class="db-clear-btn" onclick="importarExamesPcmsoLegadoParaLista(${idx})" style="font-size:11px; padding:3px 8px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                        📥 Importar exames atuais para a lista
                    </button>
                    ` : ''}
                </div>

                <!-- Síntese Legada de Exames -->
                <div style="margin-bottom:10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:10.5px; font-weight:700; color:var(--text);">Síntese Consolidada de Exames (Campo Legado / Relatórios SGG):</span>
                        ${examesLista.length > 0 ? '<span style="font-size:9.5px; color:var(--primary); font-weight:600;">🔗 Sincronizado com os exames estruturados abaixo</span>' : ''}
                    </div>
                    <textarea id="matrizRiscoInputExamesPcmso" rows="2" ${examesLista.length > 0 ? 'readonly style="' + campoMini + ' background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;"' : 'oninput="atualizarCampoRiscoEmEdicao(\'exames_pcmso\', this.value)" style="' + campoMini + '"'} placeholder="Ex: Audiometria tonal/vocal (Periódico, Admissional); Espirometria (Admissional)...">${escapeHTML(r.exames_pcmso || '')}</textarea>
                </div>

                <!-- Tabela de Exames Estruturados -->
                <div style="border:1px solid var(--border); border-radius:6px; overflow:hidden; margin-bottom:10px;">
                    <div style="padding:6px 10px; background:var(--bg); border-bottom:1px solid var(--border); font-size:11px; font-weight:700; color:var(--text); display:flex; justify-content:space-between; align-items:center;">
                        <span>📋 Lista de Exames Estruturados (${examesLista.length})</span>
                    </div>

                    ${examesLista.length === 0 ? `
                    <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                        Nenhum exame médico estruturado vinculado a este risco. Adicione novos exames no formulário abaixo ou importe o texto do PCMSO legado.
                    </div>
                    ` : `
                    <div id="tabelaExamesContainer" style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                    <th style="padding:6px 8px; width:220px;">Exame Complementar</th>
                                    <th style="padding:6px 8px; width:180px;">Periodicidade / ASO</th>
                                    <th style="padding:6px 8px;">Critério / Justificativa Clínica</th>
                                    <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${examesLista.map((item, i) => `
                                <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                    <td style="padding:6px 8px;">
                                        ${item.is_legado ? '<span style="font-size:10px; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; display:inline-block; font-weight:600; margin-bottom:4px;">📄 Texto Legado</span>' : ''}
                                        <select data-exame-campo="nome" class="exame-item-field" style="${campoMini}">
                                            <option value="">-- Selecione o Exame --</option>
                                            ${examesPadrao.map(opt => `<option value="${escapeHTML(opt)}" ${item.nome === opt ? 'selected' : ''}>${escapeHTML(opt)}</option>`).join('')}
                                            ${(item.nome && !examesPadrao.includes(item.nome)) ? `<option value="${escapeHTML(item.nome)}" selected>${escapeHTML(item.nome)}</option>` : ''}
                                        </select>
                                        <input type="text" data-exame-campo="nome_custom" class="exame-item-field" value="${escapeHTML(item.nome_custom || '')}" placeholder="Descreva o exame específico..." style="${campoMini} margin-top:4px; display:${item.nome === 'Outro' ? 'block' : 'none'};">
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <select data-exame-campo="periodicidade" class="exame-item-field" style="${campoMini}">
                                            <option value="">-- Periodicidade --</option>
                                            ${periodicidadesPadrao.map(opt => `<option value="${escapeHTML(opt)}" ${item.periodicidade === opt ? 'selected' : ''}>${escapeHTML(opt)}</option>`).join('')}
                                            ${(item.periodicidade && !periodicidadesPadrao.includes(item.periodicidade)) ? `<option value="${escapeHTML(item.periodicidade)}" selected>${escapeHTML(item.periodicidade)}</option>` : ''}
                                        </select>
                                        <input type="text" data-exame-campo="periodicidade_custom" class="exame-item-field" value="${escapeHTML(item.periodicidade_custom || '')}" placeholder="Outra modalidade..." style="${campoMini} margin-top:4px; display:${item.periodicidade === 'Outro' ? 'block' : 'none'};">
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <input type="text" data-exame-campo="criterio_indicacao" class="exame-item-field" value="${escapeHTML(item.criterio_indicacao || '')}" placeholder="Ex: Exposição a ruído acima do NA / Trabalho em Altura..." style="${campoMini}">
                                    </td>
                                    <td style="padding:6px 6px; text-align:center;">
                                        <button type="button" class="btn-remover-exame-item" data-uid="${escapeHTML(item.uid)}" title="Remover exame" style="background:none; border:none; cursor:pointer; color:var(--danger); font-size:14px; padding:2px 6px;">✕</button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `}
                </div>

                <!-- Formulário de Adição Rápida de Exame -->
                <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:10px;">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Adicionar Novo Exame Médico ao Planejamento PCMSO:</div>
                    <div style="display:grid; grid-template-columns:220px 180px 1fr auto; gap:8px; align-items:start;">
                        <div>
                            <select id="novoExame_nome" onchange="const c = document.getElementById('novoExame_nome_custom'); if(c) c.style.display = (this.value === 'Outro' ? 'block' : 'none');" style="${campoMini}">
                                <option value="">-- Selecione o Exame --</option>
                                ${examesPadrao.map(opt => `<option value="${escapeHTML(opt)}">${escapeHTML(opt)}</option>`).join('')}
                            </select>
                            <input type="text" id="novoExame_nome_custom" placeholder="Descreva o exame específico..." style="${campoMini} margin-top:4px; display:none;">
                        </div>
                        <div>
                            <select id="novoExame_periodicidade" onchange="const c = document.getElementById('novoExame_periodicidade_custom'); if(c) c.style.display = (this.value === 'Outro' ? 'block' : 'none');" style="${campoMini}">
                                <option value="">-- Periodicidade / ASO --</option>
                                ${periodicidadesPadrao.map(opt => `<option value="${escapeHTML(opt)}">${escapeHTML(opt)}</option>`).join('')}
                            </select>
                            <input type="text" id="novoExame_periodicidade_custom" placeholder="Outra modalidade..." style="${campoMini} margin-top:4px; display:none;">
                        </div>
                        <div>
                            <input type="text" id="novoExame_criterio" placeholder="Critério / justificativa (Ex: Exposição a ruído acima do NA)..." style="${campoMini}">
                        </div>
                        <div>
                            <button type="button" class="db-apply-btn" onclick="adicionarExameNaListaRisco(${idx})" style="padding:7px 14px; font-size:11.5px; height:34px; white-space:nowrap;">
                                ➕ Incluir Exame
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bloco 3: Códigos CID-10 de Referência do Risco -->
            <div style="background:var(--card-bg, #fff); border:1px solid var(--border); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div>
                        <div style="font-size:12px; font-weight:700; color:var(--text);">
                            🏷️ Códigos CID-10 de Referência Técnica do Risco (NR-07)
                        </div>
                        <div style="font-size:10.5px; color:var(--text-light);">
                            Códigos de patologias ocupacionais associadas ao risco para referência estatística e epidemiológica do PCMSO (não constitui diagnóstico individual de trabalhador).
                        </div>
                    </div>
                    ${(temTextoCidLegado && cidsLista.length === 0) ? `
                    <button type="button" class="db-clear-btn" onclick="importarCidsLegadoParaLista(${idx})" style="font-size:11px; padding:3px 8px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">
                        📥 Importar CIDs atuais para a lista
                    </button>
                    ` : ''}
                </div>

                <!-- Síntese Legada de CIDs -->
                <div style="margin-bottom:10px; background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:8px 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:10.5px; font-weight:700; color:var(--text);">Síntese Consolidada de CIDs (Campo Legado / Relatórios SGG):</span>
                        ${cidsLista.length > 0 ? '<span style="font-size:9.5px; color:var(--primary); font-weight:600;">🔗 Sincronizado com os CIDs estruturados abaixo</span>' : ''}
                    </div>
                    <input type="text" id="matrizRiscoInputCid10" value="${escapeHTML(r.cid10_relacionado || '')}" ${cidsLista.length > 0 ? 'readonly style="' + campoMini + ' background:var(--card-bg, #f8fafc); cursor:not-allowed; opacity:0.85;"' : 'oninput="atualizarCampoRiscoEmEdicao(\'cid10_relacionado\', this.value)" style="' + campoMini + '"'} placeholder="Ex: H83.3 (PAIR), M54.5 (Lombalgia), Z57 (Exposição ocupacional)...">
                </div>

                <!-- Tabela de CIDs Estruturados -->
                <div style="border:1px solid var(--border); border-radius:6px; overflow:hidden; margin-bottom:10px;">
                    <div style="padding:6px 10px; background:var(--bg); border-bottom:1px solid var(--border); font-size:11px; font-weight:700; color:var(--text); display:flex; justify-content:space-between; align-items:center;">
                        <span>📋 Lista de Códigos CID-10 Vinculados (${cidsLista.length})</span>
                    </div>

                    ${cidsLista.length === 0 ? `
                    <div style="padding:14px; text-align:center; font-size:11.5px; color:var(--text-light); background:var(--card-bg, #fff);">
                        Nenhum código CID-10 estruturado vinculado a este risco. Adicione novos códigos no formulário abaixo.
                    </div>
                    ` : `
                    <div id="tabelaCidsContainer" style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
                            <thead>
                                <tr style="background:var(--bg); color:var(--text-light); text-align:left; border-bottom:1px solid var(--border);">
                                    <th style="padding:6px 8px; width:130px;">Código CID-10</th>
                                    <th style="padding:6px 8px;">Patologia / Agravo Ocupacional Correlato</th>
                                    <th style="padding:6px 6px; width:40px; text-align:center;">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cidsLista.map((item, i) => `
                                <tr data-uid="${escapeHTML(item.uid)}" style="border-bottom:1px solid var(--border); background:${i % 2 === 0 ? 'var(--card-bg, #fff)' : 'var(--bg)'};">
                                    <td style="padding:6px 8px;">
                                        ${item.is_legado ? `
                                        <span style="font-size:10px; color:#b45309; background:#fef3c7; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; display:inline-block; font-weight:600; margin-bottom:4px;">📄 Texto Legado</span>
                                        <input type="text" data-cid-campo="codigo" class="cid-item-field" value="${escapeHTML(item.codigo || '')}" placeholder="Opcional..." style="${campoMini} font-weight:700;">
                                        ` : `
                                        <input type="text" data-cid-campo="codigo" class="cid-item-field" value="${escapeHTML(item.codigo || '')}" placeholder="Ex: H83.3" style="${campoMini} font-weight:700;">
                                        `}
                                    </td>
                                    <td style="padding:6px 8px;">
                                        <input type="text" data-cid-campo="descricao" class="cid-item-field" value="${escapeHTML(item.descricao || '')}" placeholder="Ex: Efeitos do ruído sobre o ouvido interno..." style="${campoMini}">
                                        ${item.is_legado ? '<span style="font-size:9.5px; color:var(--text-light); display:block; margin-top:2px;">Texto original herdado do campo livre; editar para consolidar nova síntese estruturada</span>' : ''}
                                    </td>
                                    <td style="padding:6px 6px; text-align:center;">
                                        <button type="button" class="btn-remover-cid-item" data-uid="${escapeHTML(item.uid)}" title="Remover CID" style="background:none; border:none; cursor:pointer; color:var(--danger); font-size:14px; padding:2px 6px;">✕</button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `}
                </div>

                <!-- Formulário de Adição Rápida de CID -->
                <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:10px;">
                    <div style="font-size:11px; font-weight:700; color:var(--text); margin-bottom:8px;">➕ Adicionar Novo Código CID-10:</div>
                    <div style="display:grid; grid-template-columns:130px 1fr auto; gap:8px; align-items:start;">
                        <div>
                            <input type="text" id="novoCid_codigo" placeholder="Ex: H83.3, M54" style="${campoMini} font-weight:700;">
                        </div>
                        <div>
                            <input type="text" id="novoCid_descricao" placeholder="Ex: Efeitos do ruído sobre o ouvido interno (PAIR)..." style="${campoMini}">
                        </div>
                        <div>
                            <button type="button" class="db-apply-btn" onclick="adicionarCidNaListaRisco(${idx})" style="padding:7px 14px; font-size:11.5px; height:34px; white-space:nowrap;">
                                ➕ Incluir CID-10
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        `;
    }

    return '';
}


function atualizarCampoRiscoEmEdicao(campo, valor) {
    if (!matrizRiscoEdicaoDraft) return;
    matrizRiscoEdicaoDraft[campo] = valor;
}

function aoSelecionarAgenteCatalogo(idx, selectEl) {
    if (!matrizRiscoEdicaoDraft || !selectEl) return;

    const inputLivre = document.getElementById('riscoEdit_agente');
    const inputEsocial = document.getElementById('riscoEdit_esocial');
    const valor = selectEl.value;

    if (valor === '__CUSTOM__') {
        atualizarCampoRiscoEmEdicao('agente', '');
        atualizarCampoRiscoEmEdicao('esocial_codigo', '');
        matrizRiscoEdicaoDraft.esocial_codigo_manual = false;
        if (inputLivre) {
            inputLivre.value = '';
            inputLivre.style.display = 'block';
            inputLivre.focus();
        }
        if (inputEsocial) inputEsocial.value = '';
        return;
    }

    if (!valor) {
        atualizarCampoRiscoEmEdicao('agente', '');
        atualizarCampoRiscoEmEdicao('esocial_codigo', '');
        matrizRiscoEdicaoDraft.esocial_codigo_manual = false;
        if (inputLivre) {
            inputLivre.value = '';
            inputLivre.style.display = 'none';
        }
        if (inputEsocial) inputEsocial.value = '';
        return;
    }

    const opcao = selectEl.options[selectEl.selectedIndex];
    const codigo = (opcao && opcao.dataset && opcao.dataset.codigo) ? opcao.dataset.codigo : (opcao ? (opcao.getAttribute('data-codigo') || '') : '');
    atualizarCampoRiscoEmEdicao('agente', valor);
    atualizarCampoRiscoEmEdicao('esocial_codigo', codigo);
    matrizRiscoEdicaoDraft.esocial_codigo_manual = false;
    if (inputLivre) {
        inputLivre.value = valor;
        inputLivre.style.display = 'none';
    }
    if (inputEsocial) inputEsocial.value = codigo;
}

function aoMudarTipoAgenteRisco(idx, selectTipoEl) {
    if (!matrizRiscoEdicaoDraft || !selectTipoEl) return;

    const novoTipo = selectTipoEl.value;
    atualizarCampoRiscoEmEdicao('tipo_agente', novoTipo);
    atualizarCampoRiscoEmEdicao('agente', '');
    atualizarCampoRiscoEmEdicao('esocial_codigo', '');
    matrizRiscoEdicaoDraft.esocial_codigo_manual = false;

    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container && g) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(
            g,
            matrizRiscoEdicaoDraft,
            idx
        );
    }
}

// ============================================
// BUSCA E SUGESTÃO DE CAs DO CATÁLOGO DE EPIs
// ============================================
let _carregandoEpiCatalogoMatriz = null;
let _erroCargaEpiCatalogo = null;

async function garantirEpiCatalogoParaMatriz() {
    if (Array.isArray(window.allEpiCatalogo) && window.allEpiCatalogo.length > 0) {
        _erroCargaEpiCatalogo = null;
        return window.allEpiCatalogo;
    }
    if (_carregandoEpiCatalogoMatriz) {
        return _carregandoEpiCatalogoMatriz;
    }
    _carregandoEpiCatalogoMatriz = (async () => {
        try {
            _erroCargaEpiCatalogo = null;
            if (typeof supabaseFetchCacheado === 'function') {
                const dados = await supabaseFetchCacheado('epi_catalogo', '?select=*');
                if (Array.isArray(dados)) {
                    window.allEpiCatalogo = dados;
                } else {
                    throw new Error('Formato inválido retornado pelo catálogo');
                }
            } else if (typeof loadEpiData === 'function') {
                await loadEpiData();
            }
        } catch (err) {
            _erroCargaEpiCatalogo = (err && err.message) ? err.message : 'Falha na conexão';
            console.error('Erro ao carregar catálogo de EPIs para a Matriz de Riscos:', err);
        } finally {
            _carregandoEpiCatalogoMatriz = null;
        }
        return window.allEpiCatalogo || [];
    })();
    return _carregandoEpiCatalogoMatriz;
}

function buscarSugestoesCaEpi(termo) {
    const catalogo = Array.isArray(window.allEpiCatalogo) ? window.allEpiCatalogo : [];
    const t = (termo || '').trim().toLowerCase();

    // Filtra apenas ativos (ativo !== false) com CA preenchido
    const comCa = catalogo.filter(c => c.ativo !== false && c.ca && String(c.ca).trim() !== '');

    if (!t) {
        return comCa.slice(0, 8);
    }

    return comCa.filter(c => {
        const caStr = String(c.ca || '').toLowerCase();
        const descStr = String(c.descricao || '').toLowerCase();
        const marcaStr = String(c.marca || '').toLowerCase();
        const idStr = String(c.id || '').toLowerCase();
        return caStr.includes(t) || descStr.includes(t) || marcaStr.includes(t) || idStr.includes(t);
    }).slice(0, 10);
}

async function aoDigitarCaEpi(inputEl, alvo = 'principal') {
    if (!inputEl) return;
    const valor = inputEl.value;
    if (alvo === 'principal') {
        atualizarCampoRiscoEmEdicao('epi_ca', valor);
    } else if (alvo === 'novo') {
        // Limpa explicitamente o vínculo de catálogo anterior ao alterar o CA manualmente
        const inputId = document.getElementById('novoEpi_catalogo_id');
        if (inputId) inputId.value = '';
    }

    await garantirEpiCatalogoParaMatriz();
    renderizarMenuSugestoesCa(inputEl, alvo);
}

async function aoFocarCaEpi(inputEl, alvo = 'principal') {
    await garantirEpiCatalogoParaMatriz();
    renderizarMenuSugestoesCa(inputEl, alvo);
}

function renderizarMenuSugestoesCa(inputEl, alvo = 'principal') {
    const containerId = alvo === 'novo' ? 'novoEpiCaSugestoesContainer' : 'matrizRiscoCaSugestoesContainer';
    const container = document.getElementById(containerId);
    if (!container || !inputEl) return;

    // Configura listener delegado seguro sem interpolação de código em atributo inline
    container.onmousedown = function(e) {
        const item = e.target.closest('.matriz-ca-item-sugestao');
        if (item) {
            const ca = item.getAttribute('data-ca') || '';
            const id = item.getAttribute('data-id') || '';
            const desc = item.getAttribute('data-desc') || '';
            selecionarCaEpiSugerido(ca, id, desc, alvo);
        }
    };

    if (_erroCargaEpiCatalogo && (!Array.isArray(window.allEpiCatalogo) || window.allEpiCatalogo.length === 0)) {
        container.innerHTML = `
            <div style="padding:8px 10px; font-size:11px; color:var(--danger, #ef4444); text-align:center;">
                ⚠️ Não foi possível carregar o catálogo de EPIs (${escapeHTML(_erroCargaEpiCatalogo)}).
                <div style="font-size:10px; color:var(--text-light); margin-top:2px;">(Você pode continuar digitando o número do CA manualmente)</div>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    const termo = inputEl.value;
    const sugestoes = buscarSugestoesCaEpi(termo);

    if (sugestoes.length === 0) {
        container.innerHTML = `
            <div style="padding:8px 10px; font-size:11px; color:var(--text-light); text-align:center;">
                ${termo ? `Nenhum EPI encontrado com "${escapeHTML(termo)}" no catálogo.` : 'Nenhum EPI com CA ativo no catálogo.'}
                <div style="font-size:10px; margin-top:2px;">(Você pode digitar o número do CA manualmente)</div>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let html = `<div style="max-height:220px; overflow-y:auto; padding:4px 0;">`;
    sugestoes.forEach(c => {
        let statusValidade = '';
        let corValidade = 'var(--text-light)';
        if (c.ca_validade) {
            const vDate = new Date(c.ca_validade + 'T00:00:00');
            if (!isNaN(vDate.getTime())) {
                const diffDias = Math.ceil((vDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                const dataFmt = c.ca_validade.split('-').reverse().join('/');
                if (diffDias < 0) {
                    statusValidade = `⚠️ Vencido (${dataFmt})`;
                    corValidade = 'var(--danger, #ef4444)';
                } else if (diffDias <= 30) {
                    statusValidade = `⏳ Vencendo em ${diffDias}d (${dataFmt})`;
                    corValidade = '#f59e0b';
                } else {
                    statusValidade = `Val.: ${dataFmt}`;
                    corValidade = 'var(--text-light)';
                }
            }
        }

        const caNum = String(c.ca).trim();
        const desc = escapeHTML(c.descricao || 'EPI Sem Descrição');
        const marca = c.marca ? ` • ${escapeHTML(c.marca)}` : '';
        const tam = c.tamanho ? ` (Tam: ${escapeHTML(c.tamanho)})` : '';

        html += `
            <div class="db-list-item-hover matriz-ca-item-sugestao"
                 data-ca="${escapeHTML(caNum)}"
                 data-id="${escapeHTML(c.id)}"
                 data-desc="${escapeHTML(c.descricao || '')}"
                 style="padding:6px 10px; cursor:pointer; border-bottom:1px solid var(--border); font-size:11px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="min-width:0; flex:1;">
                    <div style="font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        🛡️ CA <span style="color:var(--primary); font-weight:800;">${escapeHTML(caNum)}</span> — ${desc}
                    </div>
                    <div style="font-size:10px; color:var(--text-light);">
                        Cód. ${escapeHTML(c.id)}${marca}${tam}
                    </div>
                </div>
                ${statusValidade ? `<span style="font-size:10px; font-weight:600; color:${corValidade}; white-space:nowrap;">${statusValidade}</span>` : ''}
            </div>
        `;
    });
    html += `</div>`;

    container.innerHTML = html;
    container.style.display = 'block';
}

function fecharMenuSugestoesCa(alvo = 'principal') {
    setTimeout(() => {
        const containerId = alvo === 'novo' ? 'novoEpiCaSugestoesContainer' : 'matrizRiscoCaSugestoesContainer';
        const container = document.getElementById(containerId);
        if (container) container.style.display = 'none';
    }, 250);
}

function selecionarCaEpiSugerido(caNumero, idCatalogo = '', descricao = '', alvo = 'principal') {
    if (alvo === 'novo') {
        const inputCa = document.getElementById('novoEpi_ca');
        const inputDesc = document.getElementById('novoEpi_desc');
        const inputId = document.getElementById('novoEpi_catalogo_id');
        if (inputCa) inputCa.value = caNumero;
        if (inputDesc) inputDesc.value = descricao || (caNumero ? `EPI CA ${caNumero}` : '');
        if (inputId) inputId.value = idCatalogo || '';
        const container = document.getElementById('novoEpiCaSugestoesContainer');
        if (container) container.style.display = 'none';
        return;
    }

    const inputEl = document.getElementById('matrizRiscoInputCa');
    if (inputEl) {
        inputEl.value = caNumero;
    }
    atualizarCampoRiscoEmEdicao('epi_ca', caNumero);

    const container = document.getElementById('matrizRiscoCaSugestoesContainer');
    if (container) container.style.display = 'none';
}

// ============================================
// GESTÃO ESTRUTURADA DE MÚLTIPLOS EPIs (FASE 3.1)
// ============================================
function sincronizarEpiCaPrincipalLegado(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.epis_lista) ? matrizRiscoEdicaoDraft.epis_lista : [];
    if (lista.length > 0) {
        // O CA principal legado reflete com precisão o CA do primeiro item da lista (inclusive se estiver vazio)
        matrizRiscoEdicaoDraft.epi_ca = (lista[0].ca || '').trim();
    } else if (forcarLimpezaSeVazio) {
        // Somente limpa o CA se for solicitado explicitamente (ex: remoção do último item da lista)
        // Se for risco legado puro (lista vazia ou não criada), PRESERVA o epi_ca manual intacto!
        matrizRiscoEdicaoDraft.epi_ca = '';
    }

    const inputCa = document.getElementById('matrizRiscoInputCa');
    if (inputCa && lista.length > 0) {
        inputCa.value = matrizRiscoEdicaoDraft.epi_ca || '';
    }
}

function configurarListenersTabelaEpis(idx) {
    const container = document.getElementById('tabelaEpisContainer');
    if (!container) return;

    // Listener delegado para remoção segura sem injeção inline de UID
    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-epi-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) {
                removerEpiDaListaRisco(uid, idx);
            }
        }
    };

    // Listener delegado para inputs e selects sem injeção inline de UID
    const handlerEdicao = function(e) {
        const input = e.target.closest('.epi-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-epi-campo');
        if (uid && campo) {
            atualizarItemEpiLista(uid, campo, input.value);
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function atualizarViewDetalhesRisco(idx) {
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container && g) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(g, matrizRiscoEdicaoDraft, idx);
        if (matrizRiscoDetalheSubtabAtiva === 'epis') {
            configurarListenersTabelaEpis(idx);
        } else if (matrizRiscoDetalheSubtabAtiva === 'epcs') {
            configurarListenersTabelaEpcs(idx);
        } else if (matrizRiscoDetalheSubtabAtiva === 'avaliacao') {
            configurarListenersTabelaMedicoes(idx);
        } else if (matrizRiscoDetalheSubtabAtiva === 'danos') {
            configurarListenersTabelaExames(idx);
            configurarListenersTabelaCids(idx);
        } else if (matrizRiscoDetalheSubtabAtiva === 'controles') {
            configurarListenersTabelaMedidas(idx);
        }
    }
}

function importarEpiLegadoParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.epis_lista)) {
        matrizRiscoEdicaoDraft.epis_lista = [];
    }
    const caLegado = (matrizRiscoEdicaoDraft.epi_ca || '').trim();
    if (!caLegado && !matrizRiscoEdicaoDraft.epis_recomendados) return;

    // Busca todas as correspondências por CA no catálogo
    const matches = caLegado ? (window.allEpiCatalogo || []).filter(c => String(c.ca).trim() === caLegado) : [];

    let catId = '';
    let descricao = '';
    // Apenas vincula ID e descrição do catálogo se houver correspondência ÚNICA (1)
    if (matches.length === 1) {
        catId = matches[0].id || '';
        descricao = matches[0].descricao || '';
    } else {
        // Zero ou múltiplas correspondências: importa sem vínculo arbitrário e sem inventar descrição
        catId = '';
        descricao = matrizRiscoEdicaoDraft.epis_recomendados ? matrizRiscoEdicaoDraft.epis_recomendados.slice(0, 100) : (caLegado ? `EPI CA ${caLegado}` : '');
    }

    const novoItem = {
        uid: 'epi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        epi_catalogo_id: catId,
        ca: caLegado,
        descricao: descricao,
        periodicidade: matrizRiscoEdicaoDraft.epi_periodicidade || '',
        eficaz: matrizRiscoEdicaoDraft.epi_eficaz || '',
        conformidade: matrizRiscoEdicaoDraft.epi_conformidade || '',
        treinamento: matrizRiscoEdicaoDraft.epi_treinamento || ''
    };

    matrizRiscoEdicaoDraft.epis_lista.push(novoItem);
    sincronizarEpiCaPrincipalLegado();
    atualizarViewDetalhesRisco(idx);
}

function adicionarEpiNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.epis_lista)) {
        matrizRiscoEdicaoDraft.epis_lista = [];
    }

    const inputCa = document.getElementById('novoEpi_ca');
    const inputDesc = document.getElementById('novoEpi_desc');
    const inputIdCat = document.getElementById('novoEpi_catalogo_id');
    const inputPer = document.getElementById('novoEpi_period');
    const selectEficaz = document.getElementById('novoEpi_eficaz');
    const selectConf = document.getElementById('novoEpi_conf');
    const selectTrein = document.getElementById('novoEpi_trein');

    const ca = inputCa ? inputCa.value.trim() : '';
    const desc = inputDesc ? inputDesc.value.trim() : '';

    if (!ca && !desc) {
        alert('Informe o Número do CA ou a Descrição do EPI para adicionar.');
        if (inputCa) inputCa.focus();
        return;
    }

    const novoItem = {
        uid: 'epi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        epi_catalogo_id: inputIdCat ? inputIdCat.value : '',
        ca: ca,
        descricao: desc || (ca ? `EPI CA ${ca}` : 'EPI Recomendado'),
        periodicidade: inputPer ? inputPer.value.trim() : '',
        eficaz: selectEficaz ? selectEficaz.value : '',
        conformidade: selectConf ? selectConf.value : '',
        treinamento: selectTrein ? selectTrein.value : ''
    };

    matrizRiscoEdicaoDraft.epis_lista.push(novoItem);
    sincronizarEpiCaPrincipalLegado();
    atualizarViewDetalhesRisco(idx);
}

function removerEpiDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.epis_lista)) return;
    matrizRiscoEdicaoDraft.epis_lista = matrizRiscoEdicaoDraft.epis_lista.filter(item => item.uid !== uid);
    // Ao remover itens, se a lista esvaziou, forcarLimpezaSeVazio = true limpa o CA legado
    sincronizarEpiCaPrincipalLegado(matrizRiscoEdicaoDraft.epis_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemEpiLista(uid, campo, valor) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.epis_lista)) return;
    const item = matrizRiscoEdicaoDraft.epis_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        if (campo === 'ca') {
            // Se editou o CA manualmente na tabela, limpa o vínculo do catálogo para evitar incompatibilidade
            item.epi_catalogo_id = '';
            // Se for o primeiro item, sincroniza com o campo legado
            if (matrizRiscoEdicaoDraft.epis_lista[0]?.uid === uid) {
                sincronizarEpiCaPrincipalLegado();
            }
        }
    }
}

// ============================================
// GESTÃO ESTRUTURADA DE MÚLTIPLOS EPCs (FASE 3.2)
// ============================================
function sincronizarEpcPrincipalLegado(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.epcs_lista) ? matrizRiscoEdicaoDraft.epcs_lista : [];
    if (lista.length > 0) {
        // Se a lista de EPCs possui itens, os campos legados refletem com precisão o 1º EPC da coleção
        matrizRiscoEdicaoDraft.epc_status = (lista[0].status || '').trim();
        matrizRiscoEdicaoDraft.epc_inspecao = (lista[0].inspecao || '').trim();
    } else if (forcarLimpezaSeVazio) {
        // Somente limpa os campos legados se for solicitado explicitamente (ex: remoção do último item da lista)
        // Se for risco legado puro (lista vazia ou não criada), PRESERVA os valores manuais intactos!
        matrizRiscoEdicaoDraft.epc_status = '';
        matrizRiscoEdicaoDraft.epc_inspecao = '';
    }

    const inputStatus = document.getElementById('matrizRiscoInputEpcStatus');
    if (inputStatus && lista.length > 0) inputStatus.value = matrizRiscoEdicaoDraft.epc_status || '';
    const inputInspecao = document.getElementById('matrizRiscoInputEpcInspecao');
    if (inputInspecao && lista.length > 0) inputInspecao.value = matrizRiscoEdicaoDraft.epc_inspecao || '';
}

function configurarListenersTabelaEpcs(idx) {
    const container = document.getElementById('tabelaEpcsContainer');
    if (!container) return;

    // Listener delegado para remoção segura sem injeção inline de UID
    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-epc-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) {
                removerEpcDaListaRisco(uid, idx);
            }
        }
    };

    // Listener delegado para inputs e selects sem injeção inline de UID
    const handlerEdicao = function(e) {
        const input = e.target.closest('.epc-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-epc-campo');
        if (uid && campo) {
            atualizarItemEpcLista(uid, campo, input.value);
            if (campo === 'tipo') {
                const inputCustom = tr.querySelector('input[data-epc-campo="tipo_custom"]');
                if (inputCustom) {
                    inputCustom.style.display = (input.value === 'Outro' ? 'block' : 'none');
                    if (input.value !== 'Outro') {
                        inputCustom.value = '';
                        atualizarItemEpcLista(uid, 'tipo_custom', '');
                    }
                }
            }
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function importarEpcLegadoParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.epcs_lista)) {
        matrizRiscoEdicaoDraft.epcs_lista = [];
    }
    const temDados = matrizRiscoEdicaoDraft.epcs_recomendados || matrizRiscoEdicaoDraft.epc_status || matrizRiscoEdicaoDraft.epc_inspecao;
    if (!temDados) return;

    const novoItem = {
        uid: 'epc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        descricao: (matrizRiscoEdicaoDraft.epcs_recomendados || '').trim(),
        tipo: 'Outro',
        tipo_custom: '',
        status: matrizRiscoEdicaoDraft.epc_status || '',
        inspecao: matrizRiscoEdicaoDraft.epc_inspecao || '',
        eficaz: '' // Neutro: eficácia não inferida automaticamente
    };

    matrizRiscoEdicaoDraft.epcs_lista.push(novoItem);
    sincronizarEpcPrincipalLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function adicionarEpcNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.epcs_lista)) {
        matrizRiscoEdicaoDraft.epcs_lista = [];
    }

    const inputDesc = document.getElementById('novoEpc_desc');
    const selectTipo = document.getElementById('novoEpc_tipo');
    const inputTipoCustom = document.getElementById('novoEpc_tipo_custom');
    const selectStatus = document.getElementById('novoEpc_status');
    const inputInspecao = document.getElementById('novoEpc_inspecao');
    const selectEficaz = document.getElementById('novoEpc_eficaz');

    const desc = inputDesc ? inputDesc.value.trim() : '';
    if (!desc) {
        alert('Por favor, informe a descrição do Equipamento de Proteção Coletiva (EPC).');
        if (inputDesc) inputDesc.focus();
        return;
    }

    const tipo = selectTipo ? selectTipo.value : '';
    const tipoCustom = (tipo === 'Outro' && inputTipoCustom) ? inputTipoCustom.value.trim() : '';

    const novoItem = {
        uid: 'epc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        descricao: desc,
        tipo: tipo,
        tipo_custom: tipoCustom,
        status: selectStatus ? selectStatus.value : '',
        inspecao: inputInspecao ? inputInspecao.value.trim() : '',
        eficaz: selectEficaz ? selectEficaz.value : ''
    };

    matrizRiscoEdicaoDraft.epcs_lista.push(novoItem);
    sincronizarEpcPrincipalLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function removerEpcDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.epcs_lista)) return;
    matrizRiscoEdicaoDraft.epcs_lista = matrizRiscoEdicaoDraft.epcs_lista.filter(item => item.uid !== uid);
    // Ao remover itens, se a lista esvaziou, forcarLimpezaSeVazio = true limpa os campos legados
    sincronizarEpcPrincipalLegado(matrizRiscoEdicaoDraft.epcs_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemEpcLista(uid, campo, valor) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.epcs_lista)) return;
    const item = matrizRiscoEdicaoDraft.epcs_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        // Se for o primeiro item e o campo for status ou inspecao, sincroniza imediatamente com os campos legados
        if ((campo === 'status' || campo === 'inspecao') && matrizRiscoEdicaoDraft.epcs_lista[0]?.uid === uid) {
            sincronizarEpcPrincipalLegado(false);
        }
    }
}

// ============================================
// GESTÃO ESTRUTURADA DE MEDIÇÕES QUANTITATIVAS (FASE 3.3)
// ============================================
function ordenarMedicoesDecrescente(lista) {
    if (!Array.isArray(lista)) return [];
    return [...lista].sort((a, b) => {
        const dataA = (a.data || '').trim();
        const dataB = (b.data || '').trim();
        if (dataA && dataB) {
            if (dataA > dataB) return -1;
            if (dataA < dataB) return 1;
            return 0;
        }
        if (dataA && !dataB) return -1;
        if (!dataA && dataB) return 1;
        return 0;
    });
}

function sincronizarMedicaoPrincipalLegada(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.medicoes_lista) ? matrizRiscoEdicaoDraft.medicoes_lista : [];
    if (lista.length > 0) {
        // Ordena por data decrescente estável para garantir que o mais recente sempre seja o primeiro
        const ordenadas = ordenarMedicoesDecrescente(lista);
        const itemRecente = ordenadas[0];
        matrizRiscoEdicaoDraft.quanti_valor = (itemRecente.valor || '').trim();
        matrizRiscoEdicaoDraft.quanti_unidade = itemRecente.unidade === 'Outro' ? (itemRecente.unidade_custom || 'Outro') : (itemRecente.unidade || '').trim();
        matrizRiscoEdicaoDraft.quanti_limite = (itemRecente.limite || '').trim();
        matrizRiscoEdicaoDraft.quanti_nivel_acao = (itemRecente.nivel_acao || '').trim();
        matrizRiscoEdicaoDraft.quanti_metodo = (itemRecente.metodo || '').trim();
        matrizRiscoEdicaoDraft.quanti_conclusao = (itemRecente.conclusao || '').trim();
    } else if (forcarLimpezaSeVazio) {
        // Apenas limpa se for solicitado explicitamente (ex: remoção do último item)
        // Se for risco legado puro (lista vazia ou ausente), PRESERVA os dados manuais legados existentes!
        matrizRiscoEdicaoDraft.quanti_valor = '';
        matrizRiscoEdicaoDraft.quanti_unidade = '';
        matrizRiscoEdicaoDraft.quanti_limite = '';
        matrizRiscoEdicaoDraft.quanti_nivel_acao = '';
        matrizRiscoEdicaoDraft.quanti_metodo = '';
        matrizRiscoEdicaoDraft.quanti_conclusao = '';
    }

    // Atualiza os inputs legados na tela se estiverem presentes
    if (lista.length > 0) {
        const elValor = document.getElementById('matrizRiscoInputQuantiValor');
        if (elValor) elValor.value = matrizRiscoEdicaoDraft.quanti_valor || '';
        const elUnidade = document.getElementById('matrizRiscoInputQuantiUnidade');
        if (elUnidade) elUnidade.value = matrizRiscoEdicaoDraft.quanti_unidade || '';
        const elLimite = document.getElementById('matrizRiscoInputQuantiLimite');
        if (elLimite) elLimite.value = matrizRiscoEdicaoDraft.quanti_limite || '';
        const elNA = document.getElementById('matrizRiscoInputQuantiNA');
        if (elNA) elNA.value = matrizRiscoEdicaoDraft.quanti_nivel_acao || '';
        const elMetodo = document.getElementById('matrizRiscoInputQuantiMetodo');
        if (elMetodo) elMetodo.value = matrizRiscoEdicaoDraft.quanti_metodo || '';
        const elConclusao = document.getElementById('matrizRiscoInputQuantiConclusao');
        if (elConclusao) elConclusao.value = matrizRiscoEdicaoDraft.quanti_conclusao || '';
    }
}

function configurarListenersTabelaMedicoes(idx) {
    const container = document.getElementById('tabelaMedicoesContainer');
    if (!container) return;

    // Listener delegado para remoção segura sem injeção inline de UID
    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-med-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) {
                removerMedicaoDaListaRisco(uid, idx);
            }
        }
    };

    // Listener delegado para inputs e selects sem injeção inline de UID
    const handlerEdicao = function(e) {
        const input = e.target.closest('.med-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-med-campo');
        if (uid && campo) {
            atualizarItemMedicaoLista(uid, campo, input.value, idx);
            if (campo === 'unidade') {
                const inputCustom = tr.querySelector('input[data-med-campo="unidade_custom"]');
                if (inputCustom) {
                    inputCustom.style.display = (input.value === 'Outro' ? 'block' : 'none');
                    if (input.value !== 'Outro') {
                        inputCustom.value = '';
                        atualizarItemMedicaoLista(uid, 'unidade_custom', '', idx);
                    }
                }
            }
            if (campo === 'data' && e.type === 'change') {
                atualizarViewDetalhesRisco(idx);
                const elData = document.querySelector(`tr[data-uid="${uid}"] input[data-med-campo="data"]`);
                if (elData) elData.focus();
                return;
            }
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function importarMedicaoLegadaParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.medicoes_lista)) {
        matrizRiscoEdicaoDraft.medicoes_lista = [];
    }
    const temDados = (matrizRiscoEdicaoDraft.quanti_valor || matrizRiscoEdicaoDraft.quanti_unidade || matrizRiscoEdicaoDraft.quanti_limite || matrizRiscoEdicaoDraft.quanti_nivel_acao || matrizRiscoEdicaoDraft.quanti_metodo || matrizRiscoEdicaoDraft.quanti_conclusao);
    if (!temDados) return;

    // Detecta se unidade é padrão ou personalizada
    const unidadesPadrao = ['dB(A)', 'dB(C)', 'm/s²', 'm/s^1.75', 'ppm', 'mg/m³', '°C', 'lx'];
    const uLegada = (matrizRiscoEdicaoDraft.quanti_unidade || '').trim();
    let uTipo = '';
    let uCustom = '';
    if (unidadesPadrao.includes(uLegada)) {
        uTipo = uLegada;
    } else if (uLegada) {
        uTipo = 'Outro';
        uCustom = uLegada;
    }

    const novoItem = {
        uid: 'med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        data: '', // Medição legada sem data conhecida mantém data vazia (não inventar data de hoje)
        valor: matrizRiscoEdicaoDraft.quanti_valor || '',
        unidade: uTipo,
        unidade_custom: uCustom,
        limite: matrizRiscoEdicaoDraft.quanti_limite || '',
        nivel_acao: matrizRiscoEdicaoDraft.quanti_nivel_acao || '',
        metodo: matrizRiscoEdicaoDraft.quanti_metodo || '',
        conclusao: matrizRiscoEdicaoDraft.quanti_conclusao || '',
        laboratorio: ''
    };

    matrizRiscoEdicaoDraft.medicoes_lista.push(novoItem);
    matrizRiscoEdicaoDraft.medicoes_lista = ordenarMedicoesDecrescente(matrizRiscoEdicaoDraft.medicoes_lista);
    sincronizarMedicaoPrincipalLegada(false);
    atualizarViewDetalhesRisco(idx);
}

function adicionarMedicaoNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.medicoes_lista)) {
        matrizRiscoEdicaoDraft.medicoes_lista = [];
    }

    const inputData = document.getElementById('novaMed_data');
    const inputValor = document.getElementById('novaMed_valor');
    const selectUnidade = document.getElementById('novaMed_unidade');
    const inputUnidadeCustom = document.getElementById('novaMed_unidade_custom');
    const inputLimite = document.getElementById('novaMed_limite');
    const inputNA = document.getElementById('novaMed_nivel_acao');
    const inputMetodo = document.getElementById('novaMed_metodo');
    const selectConclusao = document.getElementById('novaMed_conclusao');
    const inputLab = document.getElementById('novaMed_laboratorio');

    const valor = inputValor ? inputValor.value.trim() : '';
    if (!valor) {
        alert('Por favor, informe o valor medido da amostragem (ex: 84.2, 0.45).');
        if (inputValor) inputValor.focus();
        return;
    }

    const unidade = selectUnidade ? selectUnidade.value : '';
    const unidadeCustom = (unidade === 'Outro' && inputUnidadeCustom) ? inputUnidadeCustom.value.trim() : '';

    const novoItem = {
        uid: 'med_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        data: inputData ? inputData.value.trim() : '',
        valor: valor,
        unidade: unidade,
        unidade_custom: unidadeCustom,
        limite: inputLimite ? inputLimite.value.trim() : '',
        nivel_acao: inputNA ? inputNA.value.trim() : '',
        metodo: inputMetodo ? inputMetodo.value.trim() : '',
        conclusao: selectConclusao ? selectConclusao.value : '',
        laboratorio: inputLab ? inputLab.value.trim() : ''
    };

    matrizRiscoEdicaoDraft.medicoes_lista.push(novoItem);
    matrizRiscoEdicaoDraft.medicoes_lista = ordenarMedicoesDecrescente(matrizRiscoEdicaoDraft.medicoes_lista);
    sincronizarMedicaoPrincipalLegada(false);
    atualizarViewDetalhesRisco(idx);
}

function removerMedicaoDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.medicoes_lista)) return;
    matrizRiscoEdicaoDraft.medicoes_lista = matrizRiscoEdicaoDraft.medicoes_lista.filter(item => item.uid !== uid);
    sincronizarMedicaoPrincipalLegada(matrizRiscoEdicaoDraft.medicoes_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemMedicaoLista(uid, campo, valor, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.medicoes_lista)) return;
    const item = matrizRiscoEdicaoDraft.medicoes_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        if (campo === 'data') {
            matrizRiscoEdicaoDraft.medicoes_lista = ordenarMedicoesDecrescente(matrizRiscoEdicaoDraft.medicoes_lista);
        }
        sincronizarMedicaoPrincipalLegada(false);
    }
}

// ============================================
// GESTÃO ESTRUTURADA DE EXAMES PCMSO E CIDS-10 (FASE 3.4)
// ============================================

function sincronizarExamesPcmsoLegado(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.exames_lista) ? matrizRiscoEdicaoDraft.exames_lista : [];
    if (lista.length > 0) {
        if (lista.length === 1 && lista[0].is_legado) {
            matrizRiscoEdicaoDraft.exames_pcmso = lista[0].nome_custom;
        } else {
            matrizRiscoEdicaoDraft.exames_pcmso = lista.map(item => {
                const nomeExame = (item.nome === 'Outro' ? (item.nome_custom || 'Outro') : (item.nome || '')).trim();
                const period = (item.periodicidade === 'Outro' ? (item.periodicidade_custom || 'Outro') : (item.periodicidade || '')).trim();
                return period ? `${nomeExame} (${period})` : nomeExame;
            }).filter(Boolean).join('; ');
        }

        const el = document.getElementById('matrizRiscoInputExamesPcmso');
        if (el) el.value = matrizRiscoEdicaoDraft.exames_pcmso;
    } else if (forcarLimpezaSeVazio) {
        matrizRiscoEdicaoDraft.exames_pcmso = '';
        const el = document.getElementById('matrizRiscoInputExamesPcmso');
        if (el) el.value = '';
    }
}

function sincronizarCidsLegado(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.cids_lista) ? matrizRiscoEdicaoDraft.cids_lista : [];
    if (lista.length > 0) {
        if (lista.length === 1 && lista[0].is_legado) {
            matrizRiscoEdicaoDraft.cid10_relacionado = lista[0].descricao;
        } else {
            matrizRiscoEdicaoDraft.cid10_relacionado = lista.map(item => {
                const cod = (item.codigo || '').trim();
                const desc = (item.descricao || '').trim();
                if (cod && desc) return `${cod} (${desc})`;
                return cod || desc;
            }).filter(Boolean).join(', ');
        }

        const el = document.getElementById('matrizRiscoInputCid10');
        if (el) el.value = matrizRiscoEdicaoDraft.cid10_relacionado;
    } else if (forcarLimpezaSeVazio) {
        matrizRiscoEdicaoDraft.cid10_relacionado = '';
        const el = document.getElementById('matrizRiscoInputCid10');
        if (el) el.value = '';
    }
}

function configurarListenersTabelaExames(idx) {
    const container = document.getElementById('tabelaExamesContainer');
    if (!container) return;

    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-exame-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) removerExameDaListaRisco(uid, idx);
        }
    };

    const handlerEdicao = function(e) {
        const input = e.target.closest('.exame-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-exame-campo');
        if (uid && campo) {
            atualizarItemExameLista(uid, campo, input.value, idx);
            if (campo === 'nome') {
                const inputCustom = tr.querySelector('input[data-exame-campo="nome_custom"]');
                if (inputCustom) {
                    inputCustom.style.display = (input.value === 'Outro' ? 'block' : 'none');
                    if (input.value !== 'Outro') {
                        inputCustom.value = '';
                        atualizarItemExameLista(uid, 'nome_custom', '', idx);
                    }
                }
            }
            if (campo === 'periodicidade') {
                const inputCustom = tr.querySelector('input[data-exame-campo="periodicidade_custom"]');
                if (inputCustom) {
                    inputCustom.style.display = (input.value === 'Outro' ? 'block' : 'none');
                    if (input.value !== 'Outro') {
                        inputCustom.value = '';
                        atualizarItemExameLista(uid, 'periodicidade_custom', '', idx);
                    }
                }
            }
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function configurarListenersTabelaCids(idx) {
    const container = document.getElementById('tabelaCidsContainer');
    if (!container) return;

    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-cid-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) removerCidDaListaRisco(uid, idx);
        }
    };

    const handlerEdicao = function(e) {
        const input = e.target.closest('.cid-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-cid-campo');
        if (uid && campo) {
            atualizarItemCidLista(uid, campo, input.value, idx);
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function importarExamesPcmsoLegadoParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.exames_lista)) {
        matrizRiscoEdicaoDraft.exames_lista = [];
    }
    const textoOriginal = matrizRiscoEdicaoDraft.exames_pcmso;
    if (!textoOriginal || typeof textoOriginal !== 'string' || !textoOriginal.trim()) return;

    // Salvaguarda 3 & Auditoria v254: preserva exatamente a string original byte a byte sem .trim()
    const novoItem = {
        uid: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        nome: 'Outro',
        nome_custom: textoOriginal,
        periodicidade: '',
        periodicidade_custom: '',
        criterio_indicacao: 'Texto original herdado do PCMSO legado',
        is_legado: true
    };

    matrizRiscoEdicaoDraft.exames_lista.push(novoItem);
    sincronizarExamesPcmsoLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function importarCidsLegadoParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.cids_lista)) {
        matrizRiscoEdicaoDraft.cids_lista = [];
    }
    const textoOriginal = matrizRiscoEdicaoDraft.cid10_relacionado;
    if (!textoOriginal || typeof textoOriginal !== 'string' || !textoOriginal.trim()) return;

    // Salvaguarda 3 & Auditoria v254: preserva exatamente a string original byte a byte sem .trim() e sem prefixo sintético
    const novoItem = {
        uid: 'cid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        codigo: '',
        descricao: textoOriginal,
        is_legado: true
    };

    matrizRiscoEdicaoDraft.cids_lista.push(novoItem);
    sincronizarCidsLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function adicionarExameNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.exames_lista)) {
        matrizRiscoEdicaoDraft.exames_lista = [];
    }

    const selectNome = document.getElementById('novoExame_nome');
    const inputNomeCustom = document.getElementById('novoExame_nome_custom');
    const selectPeriodicidade = document.getElementById('novoExame_periodicidade');
    const inputPeriodicidadeCustom = document.getElementById('novoExame_periodicidade_custom');
    const inputCriterio = document.getElementById('novoExame_criterio');

    const nome = selectNome ? selectNome.value : '';
    const nomeCustom = (nome === 'Outro' && inputNomeCustom) ? inputNomeCustom.value.trim() : '';

    if (!nome) {
        alert('Por favor, selecione ou descreva o exame complementar.');
        if (selectNome) selectNome.focus();
        return;
    }
    if (nome === 'Outro' && !nomeCustom) {
        alert('Por favor, descreva o nome do exame específico.');
        if (inputNomeCustom) inputNomeCustom.focus();
        return;
    }

    const periodicidade = selectPeriodicidade ? selectPeriodicidade.value : '';
    const periodicidadeCustom = (periodicidade === 'Outro' && inputPeriodicidadeCustom) ? inputPeriodicidadeCustom.value.trim() : '';

    const novoItem = {
        uid: 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        nome: nome,
        nome_custom: nomeCustom,
        periodicidade: periodicidade,
        periodicidade_custom: periodicidadeCustom,
        criterio_indicacao: inputCriterio ? inputCriterio.value.trim() : ''
    };

    matrizRiscoEdicaoDraft.exames_lista.push(novoItem);
    sincronizarExamesPcmsoLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function removerExameDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.exames_lista)) return;
    matrizRiscoEdicaoDraft.exames_lista = matrizRiscoEdicaoDraft.exames_lista.filter(item => item.uid !== uid);
    sincronizarExamesPcmsoLegado(matrizRiscoEdicaoDraft.exames_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemExameLista(uid, campo, valor, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.exames_lista)) return;
    const item = matrizRiscoEdicaoDraft.exames_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        item.is_legado = false;
        sincronizarExamesPcmsoLegado(false);
    }
}

function adicionarCidNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.cids_lista)) {
        matrizRiscoEdicaoDraft.cids_lista = [];
    }

    const inputCodigo = document.getElementById('novoCid_codigo');
    const inputDescricao = document.getElementById('novoCid_descricao');

    const codigo = inputCodigo ? inputCodigo.value.trim() : '';
    const descricao = inputDescricao ? inputDescricao.value.trim() : '';

    if (!codigo && !descricao) {
        alert('Por favor, informe o código CID-10 ou a patologia correlata.');
        if (inputCodigo) inputCodigo.focus();
        return;
    }

    const novoItem = {
        uid: 'cid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        codigo: codigo,
        descricao: descricao
    };

    matrizRiscoEdicaoDraft.cids_lista.push(novoItem);
    sincronizarCidsLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function removerCidDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.cids_lista)) return;
    matrizRiscoEdicaoDraft.cids_lista = matrizRiscoEdicaoDraft.cids_lista.filter(item => item.uid !== uid);
    sincronizarCidsLegado(matrizRiscoEdicaoDraft.cids_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemCidLista(uid, campo, valor, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.cids_lista)) return;
    const item = matrizRiscoEdicaoDraft.cids_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        item.is_legado = false;
        sincronizarCidsLegado(false);
    }
}

// ============================================
// GESTÃO ESTRUTURADA DE MEDIDAS DE PREVENÇÃO (FASE 3.5 - NR-01 GRO)
// ============================================

function sincronizarMedidasLegado(forcarLimpezaSeVazio = false) {
    if (!matrizRiscoEdicaoDraft) return;
    const lista = Array.isArray(matrizRiscoEdicaoDraft.medidas_lista) ? matrizRiscoEdicaoDraft.medidas_lista : [];
    if (lista.length > 0) {
        // Se a lista contiver apenas 1 item legado não editado, preserva a string original exata byte a byte
        if (lista.length === 1 && lista[0].is_legado) {
            matrizRiscoEdicaoDraft.sugestoes = lista[0].descricao;
        } else {
            // Caso coexistam medidas novas ou o item legado tenha sido editado:
            matrizRiscoEdicaoDraft.sugestoes = lista.map(item => {
                // Se ainda for um item legado puro não editado:
                if (item.is_legado) {
                    return `[Texto Legado] ${(item.descricao || '').trim()}`;
                }
                // Se foi editado ou criado novo: NÃO usar "Texto Legado Herdado" como categoria
                const cat = (item.tipo === 'Outro' ? (item.tipo_custom || 'Outro') : (item.tipo || '')).trim();
                const desc = (item.descricao || '').trim();
                const status = (item.status || '').trim();

                let textoItem = '';
                if (cat) {
                    textoItem = `[${cat}] ${desc}`;
                } else {
                    textoItem = desc;
                }
                if (status) textoItem += ` (Status: ${status})`;
                return textoItem;
            }).filter(Boolean).join('; ');
        }

        const el = document.getElementById('matrizRiscoInputSugestoes');
        if (el) el.value = matrizRiscoEdicaoDraft.sugestoes;
    } else if (forcarLimpezaSeVazio) {
        matrizRiscoEdicaoDraft.sugestoes = '';
        const el = document.getElementById('matrizRiscoInputSugestoes');
        if (el) el.value = '';
    }
}

function configurarListenersTabelaMedidas(idx) {
    const container = document.getElementById('tabelaMedidasContainer');
    if (!container) return;

    container.onclick = function(e) {
        const btnRemover = e.target.closest('.btn-remover-medprev-item');
        if (btnRemover) {
            const uid = btnRemover.getAttribute('data-uid');
            if (uid) removerMedidaDaListaRisco(uid, idx);
        }
    };

    const handlerEdicao = function(e) {
        const input = e.target.closest('.medprev-item-field');
        if (!input) return;
        const tr = input.closest('tr[data-uid]');
        if (!tr) return;
        const uid = tr.getAttribute('data-uid');
        const campo = input.getAttribute('data-medprev-campo');
        if (uid && campo) {
            atualizarItemMedidaLista(uid, campo, input.value, idx);
            if (campo === 'tipo') {
                const inputCustom = tr.querySelector('input[data-medprev-campo="tipo_custom"]');
                if (inputCustom) {
                    inputCustom.style.display = (input.value === 'Outro' ? 'block' : 'none');
                    if (input.value !== 'Outro') {
                        inputCustom.value = '';
                        atualizarItemMedidaLista(uid, 'tipo_custom', '', idx);
                    }
                }
            }
        }
    };

    container.oninput = handlerEdicao;
    container.onchange = handlerEdicao;
}

function importarMedidasLegadoParaLista(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.medidas_lista)) {
        matrizRiscoEdicaoDraft.medidas_lista = [];
    }
    const textoOriginal = matrizRiscoEdicaoDraft.sugestoes;
    if (!textoOriginal || typeof textoOriginal !== 'string' || !textoOriginal.trim()) return;

    // Salvaguarda 3 & 4 (v257): não inventa tipo_custom sintético; mantém categoria vazia e registra origem legada
    const novoItem = {
        uid: 'medprev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        tipo: '',
        tipo_custom: '',
        descricao: textoOriginal,
        status: '',
        responsavel: '',
        prazo: '',
        is_legado: true,
        origem_legada: true
    };

    matrizRiscoEdicaoDraft.medidas_lista.push(novoItem);
    sincronizarMedidasLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function adicionarMedidaNaListaRisco(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    if (!Array.isArray(matrizRiscoEdicaoDraft.medidas_lista)) {
        matrizRiscoEdicaoDraft.medidas_lista = [];
    }

    const selectTipo = document.getElementById('novaMedida_tipo');
    const inputTipoCustom = document.getElementById('novaMedida_tipo_custom');
    const inputDescricao = document.getElementById('novaMedida_descricao');
    const selectStatus = document.getElementById('novaMedida_status');
    const inputResponsavel = document.getElementById('novaMedida_responsavel');
    const inputPrazo = document.getElementById('novaMedida_prazo');

    const tipo = selectTipo ? selectTipo.value : '';
    const tipoCustom = (tipo === 'Outro' && inputTipoCustom) ? inputTipoCustom.value.trim() : '';
    const descricao = inputDescricao ? inputDescricao.value.trim() : '';

    if (!descricao) {
        alert('Por favor, informe a descrição da medida preventiva ou ação.');
        if (inputDescricao) inputDescricao.focus();
        return;
    }
    if (tipo === 'Outro' && !tipoCustom) {
        alert('Por favor, especifique a categoria da medida.');
        if (inputTipoCustom) inputTipoCustom.focus();
        return;
    }

    const novoItem = {
        uid: 'medprev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        tipo: tipo,
        tipo_custom: tipoCustom,
        descricao: descricao,
        status: selectStatus ? selectStatus.value : '',
        responsavel: inputResponsavel ? inputResponsavel.value.trim() : '',
        prazo: inputPrazo ? inputPrazo.value.trim() : '',
        is_legado: false
    };

    matrizRiscoEdicaoDraft.medidas_lista.push(novoItem);
    sincronizarMedidasLegado(false);
    atualizarViewDetalhesRisco(idx);
}

function removerMedidaDaListaRisco(uid, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.medidas_lista)) return;
    matrizRiscoEdicaoDraft.medidas_lista = matrizRiscoEdicaoDraft.medidas_lista.filter(item => item.uid !== uid);
    sincronizarMedidasLegado(matrizRiscoEdicaoDraft.medidas_lista.length === 0);
    atualizarViewDetalhesRisco(idx);
}

function atualizarItemMedidaLista(uid, campo, valor, idx) {
    if (!matrizRiscoEdicaoDraft || !Array.isArray(matrizRiscoEdicaoDraft.medidas_lista)) return;
    const item = matrizRiscoEdicaoDraft.medidas_lista.find(x => x.uid === uid);
    if (item) {
        item[campo] = valor;
        item.is_legado = false;
        sincronizarMedidasLegado(false);
    }
}

function recalcularRiscoAtivo(idx) {
    if (!matrizRiscoEdicaoDraft) return;
    atualizarGravidadeCalculadaGhe(matrizRiscoEdicaoDraft);
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container && g) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(g, matrizRiscoEdicaoDraft, idx);
    }
}

function cancelarEdicaoRiscoGhe(idx) {
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;

    const riscoAtual = matrizGheRiscosTrabalho[idx];
    if (!riscoAtual) return;

    if (riscoAtual._isNovoNaoSalvo) {
        matrizGheRiscosTrabalho.splice(idx, 1);
        matrizRiscoDetalheSubtabAtiva = 'avaliacao';
        if (matrizRiscoSelecionadoIdx >= matrizGheRiscosTrabalho.length) {
            matrizRiscoSelecionadoIdx = Math.max(0, matrizGheRiscosTrabalho.length - 1);
        }
        inicializarDraftRisco(matrizGheRiscosTrabalho[matrizRiscoSelecionadoIdx] || null);
        renderMatrizViewSetor();
        return;
    }

    if (matrizRiscoEdicaoOriginal) {
        matrizRiscoEdicaoDraft = JSON.parse(JSON.stringify(matrizRiscoEdicaoOriginal));
        matrizGheRiscosTrabalho[idx] = JSON.parse(JSON.stringify(matrizRiscoEdicaoOriginal));
    }
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container && g) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(g, matrizRiscoEdicaoDraft, idx);
    }
    const statusEl = document.getElementById('matrizRiscoSaveStatus');
    if (statusEl) { statusEl.textContent = '↩️ Alterações descartadas.'; statusEl.style.color = 'var(--text-light)'; }
}

async function salvarRiscoGheEmEdicao(idx) {
    const statusEl = document.getElementById('matrizRiscoSaveStatus');
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;

    if (!matrizRiscoEdicaoDraft) {
        if (statusEl) { statusEl.textContent = '❌ Nenhum risco em edição.'; statusEl.style.color = 'var(--danger)'; }
        return;
    }

    const tipo = (matrizRiscoEdicaoDraft.tipo_agente || '').trim();
    const agente = (matrizRiscoEdicaoDraft.agente || '').trim();
    if (!tipo) {
        alert('Por favor, selecione o Tipo de Agente (Físico, Químico, Biológico, Ergonômico ou Acidentes).');
        document.getElementById('riscoEdit_tipo')?.focus();
        return;
    }
    if (!agente) {
        alert('Por favor, informe o nome do Agente / Fator de Risco.');
        document.getElementById('riscoEdit_agente')?.focus();
        return;
    }
    if (!matrizRiscoEdicaoDraft.probabilidade || !matrizRiscoEdicaoDraft.severidade) {
        alert('Por favor, defina a Probabilidade (1 a 5) e a Severidade/Efeito (1 a 5) da Metodologia AIHA.');
        return;
    }

    if (statusEl) { statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-light)'; }

    // Normaliza determinismo dos campos legados antes de salvar caso haja listas estruturadas vinculadas
    sincronizarEpiCaPrincipalLegado(false);
    sincronizarEpcPrincipalLegado(false);
    sincronizarMedicaoPrincipalLegada(false);
    sincronizarExamesPcmsoLegado(false);
    sincronizarCidsLegado(false);
    sincronizarMedidasLegado(false);
    atualizarGravidadeCalculadaGhe(matrizRiscoEdicaoDraft);
    const riscoParaSalvar = JSON.parse(JSON.stringify(matrizRiscoEdicaoDraft));
    const eraNovo = !!riscoParaSalvar._isNovoNaoSalvo;
    delete riscoParaSalvar._isNovoNaoSalvo;
    delete riscoParaSalvar._origIndex;

    let riscosParaPersistir = Array.isArray(g.riscos) ? JSON.parse(JSON.stringify(g.riscos)) : [];

    if (eraNovo) {
        riscosParaPersistir.push(riscoParaSalvar);
    } else {
        let indexExistente = -1;
        if (typeof matrizRiscoEdicaoDraft._origIndex === 'number' && matrizRiscoEdicaoDraft._origIndex >= 0 && matrizRiscoEdicaoDraft._origIndex < riscosParaPersistir.length) {
            indexExistente = matrizRiscoEdicaoDraft._origIndex;
        } else if (riscoParaSalvar.id) {
            indexExistente = riscosParaPersistir.findIndex(r => r.id === riscoParaSalvar.id);
        } else {
            indexExistente = riscosParaPersistir.findIndex(r => r.agente === (matrizRiscoEdicaoOriginal?.agente || riscoParaSalvar.agente) && r.tipo_agente === (matrizRiscoEdicaoOriginal?.tipo_agente || riscoParaSalvar.tipo_agente));
        }

        if (indexExistente >= 0) {
            riscosParaPersistir[indexExistente] = riscoParaSalvar;
        } else {
            riscosParaPersistir.push(riscoParaSalvar);
        }
    }

    try {
        const payload = [{
            id: g.id,
            nome: g.nome,
            cargos: g.cargos || [],
            quantidade_oficial: g.quantidade_oficial || 0,
            riscos: riscosParaPersistir,
            conclusoes: g.conclusoes || {},
            updated_at: new Date().toISOString()
        }];

        await supabaseUpsert('ghe_catalogo', payload);

        g.riscos = riscosParaPersistir;
        carregarRiscosTrabalhoDoGhe(g);
        if (matrizGheRiscosTrabalho[idx]) {
            inicializarDraftRisco(matrizGheRiscosTrabalho[idx]);
        }

        if (statusEl) { statusEl.textContent = '✅ Salvo com sucesso!'; statusEl.style.color = 'var(--success)'; }
        renderMatrizViewSetor();
    } catch (err) {
        console.error('Erro ao salvar risco do GHE:', err);
        if (statusEl) { statusEl.textContent = '❌ Falha ao salvar: ' + err.message; statusEl.style.color = 'var(--danger)'; }
    }
}

function imprimirInventarioRiscosGheAtual() {
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) {
        alert('Selecione um Setor / GHE para emitir o Inventário de Riscos.');
        return false;
    }
    try {
        const htmlDoc = gerarHtmlInventarioRiscosGhe(g);
        abrirDocumentoHtmlParaImpressao(htmlDoc, `Inventário de Riscos - GHE ${g.id}`);
        return true;
    } catch (err) {
        const msg = (err && err.message) ? err.message : 'Erro ao gerar Inventário de Riscos para impressão.';
        if (typeof alert === 'function') alert(msg);
        return false;
    }
}

function formatarMedidasPreventivasRiscoPgr(r) {
    if (!r) return '<span style="color:#94a3b8; font-style:italic;">Nenhuma medida cadastrada</span>';
    const blocos = [];

    // 1. Equipamentos de Proteção Coletiva (EPC - lista estruturada ou legado)
    const epcsEstruturados = Array.isArray(r.epcs_lista) ? r.epcs_lista.filter(x => x && (x.descricao || x.tipo)) : [];
    if (epcsEstruturados.length > 0) {
        epcsEstruturados.forEach(epc => {
            const desc = (epc.descricao || epc.nome || 'EPC').trim();
            const extra = [epc.tipo, epc.status].filter(Boolean).map(s => String(s).trim()).filter(Boolean).join(' - ');
            blocos.push(`<div><b>EPC:</b> ${escapeHTML(desc)}${extra ? ` <small style="color:#475569;">(${escapeHTML(extra)})</small>` : ''}</div>`);
        });
    } else if (r.epcs_recomendados && String(r.epcs_recomendados).trim()) {
        const desc = String(r.epcs_recomendados).trim();
        const extra = [r.epc_status, r.epc_inspecao].filter(Boolean).map(s => String(s).trim()).filter(Boolean).join(' - ');
        blocos.push(`<div><b>EPC:</b> ${escapeHTML(desc)}${extra ? ` <small style="color:#475569;">(${escapeHTML(extra)})</small>` : ''}</div>`);
    }

    // 2. Equipamentos de Proteção Individual (EPI - lista estruturada ou legado)
    const episEstruturados = Array.isArray(r.epis_lista) ? r.epis_lista.filter(x => x && (x.descricao || x.ca)) : [];
    if (episEstruturados.length > 0) {
        episEstruturados.forEach(epi => {
            const desc = (epi.descricao || epi.equipamento || 'EPI').trim();
            const caStr = (epi.ca && String(epi.ca).trim()) ? `CA: ${String(epi.ca).trim()}` : 'CA não informado';
            const extra = [caStr, epi.periodicidade].filter(Boolean).map(s => String(s).trim()).filter(Boolean).join(', ');
            blocos.push(`<div style="margin-top:2px;"><b>EPI:</b> ${escapeHTML(desc)} <small style="color:#1e40af;">(${escapeHTML(extra)})</small></div>`);
        });
    } else if ((r.epis_recomendados && String(r.epis_recomendados).trim()) || (r.epi_ca && String(r.epi_ca).trim())) {
        const desc = (r.epis_recomendados && String(r.epis_recomendados).trim()) ? String(r.epis_recomendados).trim() : 'EPI recomendado';
        const caStr = (r.epi_ca && String(r.epi_ca).trim()) ? `CA: ${String(r.epi_ca).trim()}` : 'CA não informado';
        blocos.push(`<div style="margin-top:2px;"><b>EPI:</b> ${escapeHTML(desc)} <small style="color:#1e40af;">(${escapeHTML(caStr)})</small></div>`);
    }

    // 3. Medidas de Prevenção / Administrativas (lista estruturada ou legado)
    const medidasEstruturadas = Array.isArray(r.medidas_lista) ? r.medidas_lista.filter(x => x && (x.descricao || x.categoria)) : [];
    if (medidasEstruturadas.length > 0) {
        medidasEstruturadas.forEach(m => {
            const desc = (m.descricao || '').trim();
            const extra = [m.categoria, m.status].filter(Boolean).map(s => String(s).trim()).filter(Boolean).join(' - ');
            blocos.push(`<div style="margin-top:2px;"><b>Controle:</b> ${escapeHTML(desc)}${extra ? ` <small style="color:#64748b;">[${escapeHTML(extra)}]</small>` : ''}</div>`);
        });
    } else if (r.medidas_controle || r.sugestoes) {
        const desc = String(r.medidas_controle || r.sugestoes).trim();
        if (desc) {
            blocos.push(`<div style="margin-top:2px;"><b>Controle:</b> ${escapeHTML(desc)}</div>`);
        }
    }

    if (blocos.length === 0) {
        return '<span style="color:#94a3b8; font-style:italic;">Nenhuma medida cadastrada</span>';
    }
    return blocos.join('');
}

let allErgonomiaAepPgr = [];
let allErgonomiaPlanoAcaoPgr = [];
let allAvaliacoesPsicossociaisPgr = [];
let allAvaliacoesPsicossociaisEscalasPgr = [];
let _pgrHistoricoEscritaLock = Promise.resolve();

async function registrarEmissaoHistoricoPgr(dadosEmissao) {
    if (typeof supabaseFetch !== 'function') return false;
    if (!dadosEmissao || !dadosEmissao.id_emissao) return false;

    // 1. Leitura inicial concorrente permitida (múltiplas sessões leem simultaneamente)
    let listaInicial = [];
    let atualizadoEmRemoto = null;
    let registroExiste = false;

    try {
        const rows = await supabaseFetch('configuracoes_sistema', '?id=eq.pgr_emissoes_historico');
        if (Array.isArray(rows)) {
            const regHistorico = rows.find(r => r && r.id === 'pgr_emissoes_historico')
                || (rows.length > 0 && rows[0] && Array.isArray(rows[0].valor) ? rows[0] : null);
            if (regHistorico) {
                registroExiste = true;
                atualizadoEmRemoto = regHistorico.atualizado_em ?? null;
                if (Array.isArray(regHistorico.valor)) {
                    listaInicial = regHistorico.valor.slice();
                } else {
                    throw new Error('Formato corrompido no histórico de emissões');
                }
            } else {
                registroExiste = false;
                listaInicial = [];
            }
        } else {
            throw new Error('Resposta inválida na leitura do histórico de emissões');
        }
    } catch (fetchErr) {
        console.warn('Falha na leitura do histórico prévio de emissões; abortando gravação para preservar dados:', fetchErr);
        return false;
    }

    if (listaInicial.some(x => x && x.id_emissao === dadosEmissao.id_emissao)) {
        return true;
    }

    // 2. Fase de persistência e reconciliação atômica serializada
    const executarPersistenciaComLock = async () => {
        const maxTentativas = 5;
        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            let lista = listaInicial.slice();

            // Re-leitura fresca para reconciliação CAS com o banco
            try {
                const freshRows = await supabaseFetch('configuracoes_sistema', '?id=eq.pgr_emissoes_historico');
                if (!Array.isArray(freshRows)) {
                    throw new Error('Resposta inválida na releitura fresca do histórico');
                }
                const regFresco = freshRows.find(r => r && r.id === 'pgr_emissoes_historico')
                    || (freshRows.length > 0 && freshRows[0] && Array.isArray(freshRows[0].valor) ? freshRows[0] : null);
                if (regFresco) {
                    registroExiste = true;
                    atualizadoEmRemoto = regFresco.atualizado_em ?? null;
                    if (!Array.isArray(regFresco.valor)) {
                        throw new Error('Formato corrompido na releitura fresca do histórico');
                    }
                    const listaRemotaAtual = regFresco.valor;
                    const itensNovos = listaRemotaAtual.filter(itemRemoto =>
                        itemRemoto && itemRemoto.id_emissao &&
                        !lista.some(itemLocal => itemLocal && itemLocal.id_emissao === itemRemoto.id_emissao)
                    );
                    if (itensNovos.length > 0) {
                        lista.push(...itensNovos);
                    }
                }
            } catch (freshErr) {
                console.warn(`Tentativa ${tentativa}: falha na releitura fresca do histórico:`, freshErr);
                if (tentativa === maxTentativas) return false;
                await new Promise(r => (typeof setTimeout === 'function' ? setTimeout(r, 30 * tentativa) : r()));
                continue;
            }

            if (lista.some(x => x && x.id_emissao === dadosEmissao.id_emissao)) {
                return true;
            }

            lista.unshift(dadosEmissao);
            const tsAnterior = atualizadoEmRemoto ? Date.parse(atualizadoEmRemoto) : 0;
            const tsBase = Number.isNaN(tsAnterior) ? 0 : tsAnterior;
            const tsNovo = Math.max(Date.now(), tsBase + 1);
            const novoAtualizadoEm = new Date(tsNovo).toISOString();
            const usuario = (typeof usuarioDashboardAtual === 'function' ? usuarioDashboardAtual() : null) || 'sistema_pgr';
            const payloadRow = {
                id: 'pgr_emissoes_historico',
                valor: lista,
                descricao: 'Histórico cronológico de emissões e rastreabilidade normativa do PGR (NR-01 item 1.5.4.4.6).',
                atualizado_em: novoAtualizadoEm,
                atualizado_por: usuario
            };

            try {
                if (registroExiste) {
                    if (typeof supabasePatch === 'function') {
                        const casFilter = atualizadoEmRemoto
                            ? `id=eq.pgr_emissoes_historico&atualizado_em=eq.${encodeURIComponent(atualizadoEmRemoto)}`
                            : `id=eq.pgr_emissoes_historico&atualizado_em=is.null`;
                        const patchRes = await supabasePatch('configuracoes_sistema', casFilter, payloadRow);
                        if (!Array.isArray(patchRes) || patchRes.length === 0) {
                            console.warn(`Conflito CAS no histórico (tentativa ${tentativa}/${maxTentativas}); recarregando...`);
                            await new Promise(r => (typeof setTimeout === 'function' ? setTimeout(r, 30 * tentativa) : r()));
                            continue;
                        }
                        return true;
                    } else {
                        console.warn('Serviço supabasePatch indisponível para CAS no histórico');
                        return false;
                    }
                } else {
                    if (typeof supabaseInsert === 'function') {
                        const insertRes = await supabaseInsert('configuracoes_sistema', [payloadRow]);
                        const insertSucesso = Boolean(insertRes) && (!Array.isArray(insertRes) || insertRes.length > 0);
                        if (!insertSucesso) {
                            throw new Error('Falha na criação inicial do histórico de emissões');
                        }
                        return true;
                    } else {
                        console.warn('Serviço supabaseInsert indisponível para inserção atômica no histórico');
                        return false;
                    }
                }
            } catch (upsertErr) {
                console.warn(`Falha na persistência do histórico na tentativa ${tentativa}:`, upsertErr);
                if (tentativa === maxTentativas) return false;
                await new Promise(r => (typeof setTimeout === 'function' ? setTimeout(r, 30 * tentativa) : r()));
            }
        }
        return false;
    };

    const proxima = _pgrHistoricoEscritaLock.then(executarPersistenciaComLock, executarPersistenciaComLock);
    _pgrHistoricoEscritaLock = proxima;
    return proxima;
}

async function garantirFontesEmissaoPgrCompleto() {
    const pendencias = [];

    // 1. Garantir Documento-Base
    if (typeof pgrDocBaseSavedSnapshotJson === 'undefined' || pgrDocBaseSavedSnapshotJson === null) {
        if (typeof loadPgrDocumentoBase === 'function') {
            try {
                await loadPgrDocumentoBase(false);
            } catch (err) {
                console.warn('Aviso: falha ao carregar Documento-Base na emissão:', err);
            }
        }
    }
    if (typeof pgrDocBaseSavedSnapshotJson === 'undefined' || pgrDocBaseSavedSnapshotJson === null) {
        pendencias.push('Documento-Base não sincronizado com o banco');
    }

    // 2. Garantir Quadro de Efetivo (Resolução P1 Copilot e Codex)
    if (typeof loadEfetivoData === 'function') {
        try {
            await loadEfetivoData();
        } catch (err) {
            console.warn('Aviso: falha em loadEfetivoData na emissão:', err);
        }
    }

    if (typeof supabaseFetch === 'function') {
        try {
            const rowsEfetivo = await supabaseFetch('colaboradores_efetivo', '?select=*');
            if (Array.isArray(rowsEfetivo)) {
                if (rowsEfetivo.length > 0) {
                    allEfetivo = rowsEfetivo;
                    if (typeof efetivoLoaded !== 'undefined') efetivoLoaded = true;
                } else {
                    allEfetivo = [];
                    if (typeof efetivoLoaded !== 'undefined') efetivoLoaded = false;
                    pendencias.push('Quadro de Efetivo (colaboradores_efetivo) sem colaboradores cadastrados no banco');
                }
            }
        } catch (err) {
            console.warn('Aviso: falha ao consultar Quadro de Efetivo na emissão:', err);
            // Se a consulta direta ao banco falhou, descarta cache antigo para não mascarar erro de rede
            allEfetivo = [];
            if (typeof efetivoLoaded !== 'undefined') efetivoLoaded = false;
            pendencias.push('Quadro de Efetivo (colaboradores_efetivo) não sincronizado com o banco de dados; dados locais não confirmados');
        }
    } else {
        if (!Array.isArray(allEfetivo) || allEfetivo.length === 0) {
            pendencias.push('Serviço de consulta de efetivo indisponível');
        }
    }

    // 3. Garantir Catálogo de GHEs e Inventário de Riscos (Resolução P1 Codex e Copilot)
    // Usa ?select=* pois a coluna riscos é JSONB na própria ghe_catalogo (sem relação inexistente)
    const precisaCatalogo = (typeof allGheCatalogo === 'undefined' || !Array.isArray(allGheCatalogo) || allGheCatalogo.length === 0);
    if (precisaCatalogo && typeof supabaseFetch === 'function') {
        try {
            const rowsGhe = await supabaseFetch('ghe_catalogo', '?select=*&order=id.asc');
            if (Array.isArray(rowsGhe) && rowsGhe.length > 0) {
                allGheCatalogo = rowsGhe;
            }
        } catch (err) {
            console.warn('Aviso: falha ao carregar Catálogo de GHEs na emissão:', err);
        }
    }
    if (typeof allGheCatalogo === 'undefined' || !Array.isArray(allGheCatalogo) || allGheCatalogo.length === 0) {
        pendencias.push('Catálogo de GHEs não carregado ou sem registros ativos no banco');
    } else {
        const ghesComRiscosInvalidos = allGheCatalogo.filter(g => !g || !Array.isArray(g.riscos));
        if (ghesComRiscosInvalidos.length > 0) {
            pendencias.push(`Inconsistência no catálogo de GHEs: lista de riscos ausente ou nula em ${ghesComRiscosInvalidos.length} GHE(s)`);
        }
    }

    // 4. Consultar a fonte de Plano de Ação 5W2H diretamente
    try {
        if (typeof supabaseFetch !== 'function') {
            throw new Error('Serviço de leitura indisponível');
        }
        const rowsPlanoEmissao = await supabaseFetch('pgr_plano_acao', '?select=*&order=created_at.desc');
        if (!Array.isArray(rowsPlanoEmissao)) {
            throw new Error('Resposta inválida da base de ações');
        }
        allPlanoAcaoPgr = rowsPlanoEmissao;
        if (typeof planoAcaoPgrLoaded !== 'undefined') planoAcaoPgrLoaded = true;
    } catch (err) {
        console.warn('Aviso: falha ao consultar Plano de Ação na emissão:', err);
        pendencias.push('Base de Ações 5W2H (pgr_plano_acao) não sincronizada; dados locais não confirmados');
    }

    // 5. Consultar a fonte de Ergonomia AEP e Plano de Ação Ergonômico (NR-17)
    // Falha bloqueia oficialização e limpa cache desatualizado
    try {
        if (typeof supabaseFetch !== 'function') throw new Error('Serviço de leitura indisponível');
        const rowsAep = await supabaseFetch('ergonomia_aep', '?select=*&order=codigo.asc');
        if (!Array.isArray(rowsAep)) throw new Error('Resposta inválida de ergonomia_aep');
        allErgonomiaAepPgr = rowsAep;

        const rowsErgoPlano = await supabaseFetch('ergonomia_plano_acao', '?select=*&order=created_at.desc');
        if (!Array.isArray(rowsErgoPlano)) throw new Error('Resposta inválida de ergonomia_plano_acao');
        allErgonomiaPlanoAcaoPgr = rowsErgoPlano;
    } catch (err) {
        console.warn('Aviso: falha ao consultar base de Ergonomia AEP na emissão:', err);
        allErgonomiaAepPgr = [];
        allErgonomiaPlanoAcaoPgr = [];
        pendencias.push('Base de Ergonomia (AEP / Plano de Ação NR-17) não sincronizada com o banco de dados; dados locais não confirmados');
    }

    // 6. Consultar a fonte de Avaliações Psicossociais e Escalas COPSOQ II (NR-01)
    // Falha bloqueia oficialização e limpa cache desatualizado
    try {
        if (typeof supabaseFetch !== 'function') throw new Error('Serviço de leitura indisponível');
        const rowsPsico = await supabaseFetch('avaliacoes_psicossociais', '?select=*&order=periodo_fim.desc&limit=1');
        if (!Array.isArray(rowsPsico)) throw new Error('Resposta inválida de avaliacoes_psicossociais');
        allAvaliacoesPsicossociaisPgr = rowsPsico;

        if (rowsPsico.length > 0 && rowsPsico[0] && rowsPsico[0].id) {
            const aplicacaoId = rowsPsico[0].id;
            const rowsEscalas = await supabaseFetch('avaliacoes_psicossociais_escalas', `?aplicacao_id=eq.${encodeURIComponent(aplicacaoId)}&order=pct_risco.desc`);
            if (!Array.isArray(rowsEscalas)) throw new Error('Resposta inválida de avaliacoes_psicossociais_escalas');
            allAvaliacoesPsicossociaisEscalasPgr = rowsEscalas;
        } else {
            allAvaliacoesPsicossociaisEscalasPgr = [];
        }
    } catch (err) {
        console.warn('Aviso: falha ao consultar base de Avaliações Psicossociais na emissão:', err);
        allAvaliacoesPsicossociaisPgr = [];
        allAvaliacoesPsicossociaisEscalasPgr = [];
        pendencias.push('Base de Avaliações Psicossociais (COPSOQ II) não sincronizada com o banco de dados; dados locais não confirmados');
    }

    return { ok: pendencias.length === 0, pendencias };
}

const CADERNOS_PGR_VALIDOS = Object.freeze(['completo', 'docbase', 'inventario', 'plano_acao', 'epis', 'anexos']);
let _emissaoPgrEmAndamento = false;

function normalizarValidarOpcoesEmissaoPgr(options, catalogoGhe) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        options = {};
    }
    const cadernoRaw = String(options.caderno || 'completo').trim().toLowerCase();
    if (!CADERNOS_PGR_VALIDOS.includes(cadernoRaw)) {
        throw new Error(`Caderno do PGR inválido ou não suportado: "${options.caderno}". Selecione um dos cadernos válidos: ${CADERNOS_PGR_VALIDOS.join(', ')}.`);
    }

    const caderno = cadernoRaw;
    let gheFiltro = (options.ghe_filtro != null && options.ghe_filtro !== '') ? String(options.ghe_filtro).trim() : null;
    if (gheFiltro && (gheFiltro.toLowerCase() === 'todos' || gheFiltro === '--' || gheFiltro === '0')) {
        gheFiltro = null;
    }

    // Filtro de GHE só é aplicável a 'inventario' e 'epis'. Para outros cadernos ou 'completo', normaliza para null
    if (caderno !== 'inventario' && caderno !== 'epis') {
        if (gheFiltro) {
            console.warn(`Aviso: filtro de GHE ("${gheFiltro}") ignorado pois o caderno "${caderno}" possui escopo corporativo integral.`);
            gheFiltro = null;
        }
    }

    // Se houver gheFiltro informado, DEVE existir no catálogo da empresa de forma unívoca (sem ambiguidade)
    if (gheFiltro) {
        if (!Array.isArray(catalogoGhe) || catalogoGhe.length === 0) {
            throw new Error(`Catálogo de GHEs indisponível no momento para validar o filtro de GHE "${gheFiltro}".`);
        }

        const correspondenciasExatas = catalogoGhe.filter(g => g && String(g.id).trim() === gheFiltro);
        let gheEncontrado = null;

        if (correspondenciasExatas.length === 1) {
            gheEncontrado = correspondenciasExatas[0];
            // Verifica se no catálogo existem outros GHEs que colidem por normalização (ex.: '1' e '01')
            const fNorm = typeof normalizarGhe === 'function' ? normalizarGhe(gheFiltro) : gheFiltro;
            const correspondenciasNorm = catalogoGhe.filter(g => g && (typeof normalizarGhe === 'function' ? normalizarGhe(g.id) : String(g.id).trim()) === fNorm);
            if (correspondenciasNorm.length > 1) {
                const idsColidindo = correspondenciasNorm.map(x => `"${x.id}"`).join(', ');
                throw new Error(`Ambiguidade no catálogo de GHEs: múltiplos grupos coincidem com o identificador "${gheFiltro}" após normalização (${idsColidindo}). Corrija a duplicidade de identificadores no cadastro de GHEs.`);
            }
        } else if (correspondenciasExatas.length > 1) {
            throw new Error(`Ambiguidade cadastral: mais de um GHE possui exatamente o identificador "${gheFiltro}". Corrija o catálogo.`);
        } else {
            // Tenta busca por normalização (ex.: usuário digitou '1' e no catálogo está '01')
            const fNorm = typeof normalizarGhe === 'function' ? normalizarGhe(gheFiltro) : gheFiltro;
            const correspondenciasNorm = catalogoGhe.filter(g => g && (typeof normalizarGhe === 'function' ? normalizarGhe(g.id) : String(g.id).trim()) === fNorm);
            if (correspondenciasNorm.length > 1) {
                const idsColidindo = correspondenciasNorm.map(x => `"${x.id}"`).join(', ');
                throw new Error(`Ambiguidade no catálogo de GHEs: múltiplos grupos coincidem com o filtro "${gheFiltro}" após normalização (${idsColidindo}). Especifique o identificador canônico exato.`);
            } else if (correspondenciasNorm.length === 1) {
                gheEncontrado = correspondenciasNorm[0];
            } else {
                throw new Error(`GHE "${gheFiltro}" não localizado no catálogo da empresa. Emissão abortada por inconsistência de filtro.`);
            }
        }

        gheFiltro = String(gheEncontrado.id).trim();
    }

    return Object.freeze({
        caderno,
        ghe_filtro: gheFiltro
    });
}

async function imprimirDocumentoCompletoPgr(options) {
    if (_emissaoPgrEmAndamento) {
        console.warn('Emissão do PGR já em processamento; aguarde a conclusão da solicitação anterior.');
        return false;
    }
    _emissaoPgrEmAndamento = true;

    // Snapshot defensivo imediato das opções antes de qualquer await (P1 2)
    const optionsSnapshotInicial = Object.assign({}, options);

    const btn = document.getElementById('btnImprimirPgrCompletoTop');
    const txtOriginal = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Sincronizando fontes...';
    }
    try {
        const resGarantia = await garantirFontesEmissaoPgrCompleto();
        if (!resGarantia.ok) {
            console.warn('Aviso: fontes essenciais pendentes na emissão do PGR:', resGarantia.pendencias);
        }

        // Validação estrita das opções com snapshot imutável pós-sincronização (P1 1 & P1 2)
        let snapshotOpts;
        try {
            snapshotOpts = normalizarValidarOpcoesEmissaoPgr(optionsSnapshotInicial, allGheCatalogo);
        } catch (valErr) {
            console.error('Seleção de caderno/GHE inválida na emissão do PGR:', valErr.message);
            if (typeof alert === 'function') alert(`Erro na emissão do PGR: ${valErr.message}`);
            return false;
        }

        const caderno = snapshotOpts.caderno;
        const gheFiltro = snapshotOpts.ghe_filtro;

        const codigoRastreabilidade = 'PGR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        resGarantia.codigoRastreabilidade = codigoRastreabilidade;

        const estadoDocBase = (typeof obterPgrDocBaseVigenteParaImpressao === 'function')
            ? obterPgrDocBaseVigenteParaImpressao()
            : null;
        const oficial = Boolean(estadoDocBase && estadoDocBase.confirmado_oficial && resGarantia.ok);
        const docBaseObj = (estadoDocBase && estadoDocBase.doc) || {};

        // Contagens consistentes com o escopo do caderno emitido (P1 3)
        const totalCatalogo = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo)) ? allGheCatalogo.length : 0;
        let totalGhesEscopo = 0;
        if (caderno === 'completo') {
            totalGhesEscopo = totalCatalogo;
        } else if (caderno === 'inventario' || caderno === 'epis') {
            totalGhesEscopo = gheFiltro ? 1 : totalCatalogo;
        } else {
            totalGhesEscopo = 0;
        }

        let gravacaoOk = false;
        const temServicoEscrita = (typeof supabasePatch === 'function' || typeof supabaseInsert === 'function');
        if (temServicoEscrita) {
            try {
                gravacaoOk = await registrarEmissaoHistoricoPgr({
                    id_emissao: codigoRastreabilidade,
                    caderno: caderno,
                    ghe_filtro: gheFiltro,
                    data_hora: new Date().toISOString(),
                    codigo_documento: docBaseObj.codigo_documento || 'PGR-2026',
                    revisao: docBaseObj.revisao_atual || '00',
                    oficial: oficial,
                    motivo_rascunho: oficial ? null : ((resGarantia.pendencias || []).join('; ') || 'Pendente de homologação'),
                    total_ghes: totalGhesEscopo,
                    total_ghes_catalogo: totalCatalogo,
                    total_acoes_5w2h: (typeof allPlanoAcaoPgr !== 'undefined' && Array.isArray(allPlanoAcaoPgr)) ? allPlanoAcaoPgr.length : 0,
                    total_laudos_aep: (typeof allErgonomiaAepPgr !== 'undefined' && Array.isArray(allErgonomiaAepPgr)) ? allErgonomiaAepPgr.length : 0,
                    responsavel_tecnico: (docBaseObj.avaliadores && docBaseObj.avaliadores[0] && docBaseObj.avaliadores[0].nome) || 'Não informado'
                });
            } catch (histErr) {
                console.warn('Falha ao registrar histórico de emissão:', histErr);
                gravacaoOk = false;
            }
        } else {
            console.warn('Serviço de escrita do Supabase indisponível no ambiente de emissão');
            gravacaoOk = false;
        }

        resGarantia.registroBancoConfirmado = Boolean(gravacaoOk);
        const htmlDoc = gerarHtmlDocumentoCompletoPgr(resGarantia, snapshotOpts);

        const titulosCadernoMap = {
            completo: 'Programa de Gerenciamento de Riscos (PGR - NR-01) — Consórcio Ramal do Agreste',
            docbase: 'PGR Caderno 1 (Documento-Base & Diretrizes) — Consórcio Ramal do Agreste',
            inventario: `PGR Caderno 2 (Inventário de Riscos${gheFiltro ? ' - GHE ' + gheFiltro : ''}) — Consórcio Ramal do Agreste`,
            plano_acao: 'PGR Caderno 3 (Plano de Ação 5W2H - NR-01) — Consórcio Ramal do Agreste',
            epis: `PGR Caderno 4 (Matriz de Proteções e EPIs${gheFiltro ? ' - GHE ' + gheFiltro : ''} - NR-06) — Consórcio Ramal do Agreste`,
            anexos: 'PGR Caderno 5 (Anexos Analíticos AEP e COPSOQ II) — Consórcio Ramal do Agreste'
        };
        const titulo = titulosCadernoMap[caderno] || titulosCadernoMap.completo;
        abrirDocumentoHtmlParaImpressao(htmlDoc, titulo);
        return true;
    } catch (err) {
        const msg = (err && err.message) ? err.message : 'Erro ao gerar Documento do PGR para impressão.';
        if (typeof alert === 'function') alert(msg);
        return false;
    } finally {
        _emissaoPgrEmAndamento = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = txtOriginal || '📘 Emitir PGR Completo';
        }
    }
}

function abrirModalCadernosPgr() {
    const modal = document.getElementById('modalCadernosPgr');
    if (!modal) return;

    const selGhe = document.getElementById('selectCadernoGheFiltro');
    let catalogo = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo)) ? allGheCatalogo : [];
    if (catalogo.length === 0) {
        const selectTela = document.getElementById('matrizRiscoGheSelect');
        if (selectTela && selectTela.options && selectTela.options.length > 1) {
            catalogo = Array.from(selectTela.options)
                .filter(opt => opt.value)
                .map(opt => ({ id: opt.value, nome: opt.text.replace(/^[0-9A-Za-z_-]+\s*[—–-]\s*/, '') }));
        }
    }
    const esc = (typeof escapeHTML === 'function') ? escapeHTML : (s => (s == null ? '' : String(s)));
    if (selGhe && catalogo.length > 0) {
        const valAtual = selGhe.value;
        const opts = ['<option value="">-- Todos os GHEs (Geral) --</option>'];
        const ghesOrdenados = catalogo.slice().sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true }));
        ghesOrdenados.forEach(g => {
            opts.push(`<option value="${esc(g.id)}">${esc(g.id)} — ${esc(g.nome || '')}</option>`);
        });
        selGhe.innerHTML = opts.join('');
        if (valAtual) selGhe.value = valAtual;
    }

    const radioCompleto = document.querySelector('input[name="cadernoPgrTipo"][value="completo"]');
    if (radioCompleto && !document.querySelector('input[name="cadernoPgrTipo"]:checked')) {
        radioCompleto.checked = true;
    }

    const cadernoSel = (document.querySelector('input[name="cadernoPgrTipo"]:checked')?.value) || 'completo';
    alternarVisibilidadeFiltroGheCaderno(cadernoSel);

    modal.style.display = 'flex';
}

function fecharModalCadernosPgr() {
    const modal = document.getElementById('modalCadernosPgr');
    if (modal) modal.style.display = 'none';
}

function alternarVisibilidadeFiltroGheCaderno(caderno) {
    const boxFiltro = document.getElementById('boxCadernoGheFiltro');
    if (!boxFiltro) return;
    if (caderno === 'inventario' || caderno === 'epis') {
        boxFiltro.style.display = 'block';
    } else {
        boxFiltro.style.display = 'none';
    }
}

async function executarEmissaoCadernoSelecionado() {
    const radio = document.querySelector('input[name="cadernoPgrTipo"]:checked');
    const caderno = radio ? radio.value : 'completo';
    const selGhe = document.getElementById('selectCadernoGheFiltro');
    const gheFiltro = selGhe ? selGhe.value : '';

    fecharModalCadernosPgr();
    await imprimirDocumentoCompletoPgr({
        caderno: caderno,
        ghe_filtro: (caderno === 'inventario' || caderno === 'epis') ? gheFiltro : null
    });
}

if (typeof window !== 'undefined') {
    window.abrirModalCadernosPgr = abrirModalCadernosPgr;
    window.fecharModalCadernosPgr = fecharModalCadernosPgr;
    window.alternarVisibilidadeFiltroGheCaderno = alternarVisibilidadeFiltroGheCaderno;
    window.executarEmissaoCadernoSelecionado = executarEmissaoCadernoSelecionado;
}

function gerarHtmlDocumentoCompletoPgr(statusFontes, options) {
    const catalogoRef = (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo)) ? allGheCatalogo : [];
    const snapshotOpts = normalizarValidarOpcoesEmissaoPgr(options, catalogoRef);
    const caderno = snapshotOpts.caderno;
    const gheFiltro = snapshotOpts.ghe_filtro;

    const fontesOk = !(statusFontes && statusFontes.ok === false);
    const estadoDocBase = (typeof obterPgrDocBaseVigenteParaImpressao === 'function')
        ? obterPgrDocBaseVigenteParaImpressao()
        : { confirmado_oficial: false, motivo_nao_oficial: 'Função de validação indisponível', doc: null };

    // Só é oficial se o Documento-Base for oficial E todas as fontes essenciais estiverem sincronizadas sem erro E o registro em banco for confirmado
    let oficial = Boolean(estadoDocBase && estadoDocBase.confirmado_oficial && estadoDocBase.doc);
    let motivoNaoOficial = estadoDocBase ? estadoDocBase.motivo_nao_oficial : 'Documento-Base não confirmado';

    if (oficial && !fontesOk) {
        oficial = false;
        motivoNaoOficial = `Fontes essenciais não sincronizadas (${(statusFontes.pendencias || []).join('; ')})`;
    } else if (oficial && statusFontes && statusFontes.registroBancoConfirmado === false) {
        oficial = false;
        motivoNaoOficial = 'Registro da emissão no histórico normativo (NR-01 item 1.5.4.4.6) não confirmado no banco de dados';
    }

    const doc = oficial ? estadoDocBase.doc : normalizarPgrDocBase(obterPgrDocBaseDefaults());
    const codigoRastreabilidade = (statusFontes && statusFontes.codigoRastreabilidade)
        ? statusFontes.codigoRastreabilidade
        : ('PGR-RAST-' + Date.now().toString(36).toUpperCase());

    const empRazao = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.razaoSocial) ? EMPRESA_INFO.razaoSocial : 'CONSORCIO OPERADOR RAMAL DO AGRESTE';
    const empCnpj = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.cnpj) ? EMPRESA_INFO.cnpj : '55.623.017/0001-97';
    const empCnae = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.cnaePrincipal) ? EMPRESA_INFO.cnaePrincipal : '71.12-0-00 - Serviços de engenharia';
    const empGr = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.grauRisco) ? EMPRESA_INFO.grauRisco : '1';

    const codigoDoc = (doc.codigo_documento && doc.codigo_documento.trim()) ? doc.codigo_documento.trim() : (oficial ? 'Não informado' : 'Rascunho (Não informado)');
    const localOperacao = (doc.cidade_uf && doc.cidade_uf.trim()) ? doc.cidade_uf.trim() : (oficial ? 'Não informado' : 'Rascunho (Não informado)');
    const revAtual = doc.revisao_atual || '00';
    const dataElabStr = oficial ? (doc.data_elaboracao ? formatSimpleDate(doc.data_elaboracao) : 'Não informada') : 'Rascunho (Não confirmada)';
    const dataValStr = oficial ? (doc.data_validade ? formatSimpleDate(doc.data_validade) : 'Não informada') : 'Rascunho (Não confirmada)';
    const dataEmissaoStr = formatSimpleDate(new Date());

    const avalPrincipal = (oficial && Array.isArray(doc.avaliadores) && doc.avaliadores[0]) ? doc.avaliadores[0] : null;
    const respPrincipal = (oficial && Array.isArray(doc.responsaveis_empresa) && doc.responsaveis_empresa[0]) ? doc.responsaveis_empresa[0] : null;

    let tituloCaderno = doc.titulo_programa || 'PROGRAMA DE GERENCIAMENTO DE RISCOS (PGR)';
    let subTituloCaderno = doc.enquadramento_normativo || 'NR-01 — GERENCIAMENTO DE RISCOS OCUPACIONAIS (GRO)';
    let rotuloCaderno = 'DOCUMENTO OFICIAL COMPLETO';

    if (caderno === 'docbase') {
        rotuloCaderno = 'CADERNO 1 — DOCUMENTO-BASE & DIRETRIZES GERAIS';
        subTituloCaderno = 'Diretrizes, Metodologia AIHA e Instrumentos de Medição (NR-01 GRO)';
    } else if (caderno === 'inventario') {
        const complementoGhe = gheFiltro ? ` — GHE ${gheFiltro}` : ' — TODOS OS GHES';
        rotuloCaderno = `CADERNO 2 — INVENTÁRIO GERAL DE RISCOS OCUPACIONAIS${complementoGhe}`;
        subTituloCaderno = 'Inventário de Perigos, Fatores de Risco e Classificação AIHA 5×5 (NR-01)';
    } else if (caderno === 'plano_acao') {
        rotuloCaderno = 'CADERNO 3 — PLANO DE AÇÃO 5W2H (NR-01)';
        subTituloCaderno = 'Cronograma, Medidas Preventivas, Responsáveis e Prazos (NR-01 item 1.5.7.1)';
    } else if (caderno === 'epis') {
        rotuloCaderno = 'CADERNO 4 — MATRIZ DE EQUIPAMENTOS DE PROTEÇÃO (EPI / EPC — NR-06)';
        subTituloCaderno = 'Equipamentos de Proteção Coletiva e Individual com Certificados de Aprovação (CA)';
    } else if (caderno === 'anexos') {
        rotuloCaderno = 'CADERNO 5 — ANEXOS ANALÍTICOS (AEP NR-17 & COPSOQ II)';
        subTituloCaderno = 'Laudos Ergonômicos Preliminares e Censo Psicossocial Corporativo';
    }

    const bannerRascunhoHtml = oficial ? '' : `
        <div style="margin-bottom:8px; padding:6px 12px; border:1.5px dashed #b45309; background:#fef3c7; color:#92400e; font-size:8.5pt; font-weight:700; text-align:center; border-radius:4px;">
            ⚠️ RASCUNHO TÉCNICO SEM VALOR OFICIAL — ${escapeHTML(motivoNaoOficial || 'Documento-Base não confirmado no banco de dados')}.
        </div>`;

    // 1. Capa Institucional Padronizada (PGR Completo ou Caderno Modular)
    const secaoCapaHtml = `
        <div class="pagina-a4 capa-pgr">
            ${bannerRascunhoHtml}
            <div style="text-align: center; margin-top: ${oficial ? '14px' : '4px'}; margin-bottom: 8px;">
                <img src="${LOGO_COP_BASE64}" alt="Logo Consórcio" style="max-height: 55px; max-width: 220px;">
            </div>
            <div style="text-align: center; border-top: 2.5px solid #1e3a8a; border-bottom: 2.5px solid #1e3a8a; padding: 8px 12px; margin: 8px 0;">
                <div style="font-size: 20pt; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; line-height: 1.15;">${escapeHTML(tituloCaderno)}</div>
                ${caderno !== 'completo' ? `<div style="font-size: 12pt; font-weight: 800; color: #1e3a8a; margin-top: 3px;">${escapeHTML(rotuloCaderno)}</div>` : ''}
                <div style="font-size: 11pt; font-weight: 700; color: #1e40af; margin-top: 3px;">${escapeHTML(subTituloCaderno)}</div>
                <div style="font-size: 9pt; color: #475569; margin-top: 2px;">Metodologia Quali-Quantitativa AIHA (American Industrial Hygiene Association)</div>
            </div>

            <div style="margin: 8px auto; max-width: 900px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 16px; font-size: 9pt; line-height: 1.45; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px;">
                <div><b>Razão Social:</b> ${escapeHTML(empRazao)}</div>
                <div><b>Segmento do Documento:</b> ${escapeHTML(rotuloCaderno)}</div>
                <div><b>CNPJ:</b> ${escapeHTML(empCnpj)} &nbsp;|&nbsp; <b>Grau de Risco:</b> ${escapeHTML(empGr)}</div>
                <div><b>Código do Documento:</b> ${escapeHTML(codigoDoc)} &nbsp;|&nbsp; <b>Revisão:</b> ${escapeHTML(revAtual)}</div>
                <div><b>CNAE Principal:</b> ${escapeHTML(empCnae)}</div>
                <div><b>Vigência do Programa:</b> ${dataElabStr} a ${dataValStr}</div>
                <div><b>Local da Operação:</b> ${escapeHTML(localOperacao)}</div>
                <div><b>Data de Emissão do Laudo:</b> ${dataEmissaoStr}</div>
                <div style="grid-column: 1 / -1; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 8pt; color: #475569;">
                    <b>Rastreabilidade Normativa:</b> ${escapeHTML(codigoRastreabilidade)} &nbsp;|&nbsp; <b>Registro NR-01:</b> item 1.5.4.4.6 &nbsp;|&nbsp; <b>Segmento:</b> ${escapeHTML(caderno)}
                </div>
            </div>

            <div style="margin-top: 16px; text-align: center;">
                <div style="display: flex; justify-content: space-around; gap: 30px; margin-top: 10px;">
                    <div style="width: 250px; border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 8.5pt; line-height: 1.25;">
                        <b>${escapeHTML((avalPrincipal && avalPrincipal.nome) || (oficial ? '' : 'RESPONSÁVEL TÉCNICO NÃO CONFIRMADO'))}</b><br>
                        ${escapeHTML((avalPrincipal && avalPrincipal.qualificacao) || '')}<br>
                        ${escapeHTML((avalPrincipal && avalPrincipal.registro_conselho) || '')}
                    </div>
                    <div style="width: 250px; border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 8.5pt; line-height: 1.25;">
                        <b>${escapeHTML((respPrincipal && respPrincipal.nome) || (oficial ? '' : 'REPRESENTANTE LEGAL NÃO CONFIRMADO'))}</b><br>
                        ${escapeHTML((respPrincipal && respPrincipal.cargo) ? (String(respPrincipal.cargo).includes('Representante Legal') ? respPrincipal.cargo : (respPrincipal.cargo + ' / Representante Legal')) : 'Representante Legal')}<br>
                        ${escapeHTML(empRazao)}
                    </div>
                </div>
            </div>
        </div>`;

    // 2. Histórico de Revisões
    const revisoes = Array.isArray(doc.historico_revisoes) ? doc.historico_revisoes : [];
    const secaoHistoricoHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">1. HISTÓRICO DE REVISÕES DO DOCUMENTO</h2>
            <div class="secao-desc">Controle de alterações normativas, técnicas e operacionais conforme item 1.5.4.4.6 da NR-01.</div>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 10%;">Revisão</th>
                        <th style="width: 15%;">Data</th>
                        <th style="width: 50%;">Descrição das Modificações / Motivo</th>
                        <th style="width: 25%;">Responsável Técnico</th>
                    </tr>
                </thead>
                <tbody>
                    ${revisoes.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:12px; color:#64748b;">Nenhuma revisão histórica cadastrada (emissão inicial do programa).</td></tr>' : revisoes.map(r => `
                        <tr>
                            <td style="text-align:center; font-weight:700;">${escapeHTML(r.revisao || '—')}</td>
                            <td style="text-align:center;">${escapeHTML(r.data ? formatSimpleDate(r.data) : '—')}</td>
                            <td>${escapeHTML(r.descricao || '—')}</td>
                            <td>${escapeHTML(r.responsavel || '—')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // 3. Documento-Base Corporativo
    const secaoDocBaseHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">2. DOCUMENTO-BASE — DIRETRIZES E METODOLOGIA DO GRO/PGR</h2>

            <h3 class="subsecao-titulo">2.1 Objetivos e Apresentação Institucional</h3>
            <div class="texto-paragrafo">${doc.texto_apresentacao_objetivos ? escapeHTML(doc.texto_apresentacao_objetivos).replace(/\n/g, '<br>') : 'O presente Programa de Gerenciamento de Riscos (PGR) tem por objetivo estabelecer as diretrizes e requisitos para o gerenciamento de riscos ocupacionais e as medidas de prevenção em Segurança e Saúde no Trabalho (SST) no âmbito do Consórcio Operador do Ramal do Agreste.'}</div>

            <h3 class="subsecao-titulo">2.2 Metodologia de Avaliação Quali-Quantitativa de Riscos (AIHA)</h3>
            <div class="texto-paragrafo">A identificação de perigos e a avaliação de riscos ocupacionais são estruturadas sob a metodologia internacional da American Industrial Hygiene Association (AIHA), cruzando a matriz bidimensional de <b>Probabilidade de Exposição (Escala 1 a 5)</b> com a <b>Severidade dos Possíveis Danos (Escala 1 a 5)</b>, gerando os níveis de ação: <b>Trivial</b>, <b>Baixo</b>, <b>Moderado</b>, <b>Alto</b> e <b>Muito Alto</b>. Riscos pendentes de avaliação permanecem destacados como não classificados.</div>

            <h3 class="subsecao-titulo">2.3 Critérios e Diretrizes para Proteção Coletiva (EPC) e Individual (EPI)</h3>
            <div class="texto-paragrafo">${doc.texto_protecoes_coletivas_epc_epi ? escapeHTML(doc.texto_protecoes_coletivas_epc_epi).replace(/\n/g, '<br>') : 'Em obediência à hierarquia das medidas de prevenção (item 1.4.1 da NR-01), prioriza-se a eliminação de fatores de risco e a implementação de Medidas de Proteção Coletiva (EPC). As especificações de EPIs e respectivos Certificados de Aprovação (CA) aplicáveis a cada GHE são descritas no inventário de riscos, cabendo à gestão a conferência contínua de validade dos CAs perante o Ministério do Trabalho e o fornecimento de treinamentos de uso e conservação.'}</div>

            <h3 class="subsecao-titulo">2.4 Sistemática de Inspeções de SST e Acompanhamento de Campo</h3>
            <div class="texto-paragrafo">${doc.texto_sistematica_inspecoes ? escapeHTML(doc.texto_sistematica_inspecoes).replace(/\n/g, '<br>') : 'Diretriz normativa para inspeções de segurança do trabalho no âmbito do Ramal do Agreste, articulando rondas de campo, Diálogos Diários de Segurança (DDS) e checklists operacionais pelo SESMT e lideranças operacionais.'}</div>

            <h3 class="subsecao-titulo">2.5 Instrumentos de Medição e Certificados de Calibração</h3>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 25%;">Equipamento / Modelo</th>
                        <th style="width: 20%;">Nº de Série</th>
                        <th style="width: 25%;">Agente Avaliado / Técnica</th>
                        <th style="width: 15%;">Data Calibração</th>
                        <th style="width: 15%;">Validade Calibração</th>
                    </tr>
                </thead>
                <tbody>
                    ${(doc.instrumentos || []).length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:10px; color:#64748b;">Nenhum instrumento quantitativo específico cadastrado no momento (avaliações qualitativas e de inspeção direta).</td></tr>' : doc.instrumentos.map(inst => `
                        <tr>
                            <td><b>${escapeHTML(inst.identificacao || inst.marca || '—')}</b><br><small>${escapeHTML(inst.modelo || '')}</small></td>
                            <td>${escapeHTML(inst.numero_serie || '—')}</td>
                            <td>${escapeHTML(inst.agentes_analisados || inst.tecnica_utilizada || '—')}</td>
                            <td style="text-align:center;">${escapeHTML(inst.data_calibracao ? formatSimpleDate(inst.data_calibracao) : '—')}</td>
                            <td style="text-align:center;">${escapeHTML(inst.validade_calibracao ? formatSimpleDate(inst.validade_calibracao) : '—')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // 4. Visão Panorâmica da Matriz de Risco (GHE filtrado ou Geral)
    const ghes = Array.isArray(allGheCatalogo) ? allGheCatalogo.slice().sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true })) : [];
    const ghesPanoramica = gheFiltro
        ? ghes.filter(g => g && String(g.id).trim() === gheFiltro)
        : ghes;

    let totalRiscosGeral = 0;
    let totalNaoClassificados = 0;
    const contagemNiveis = { 'Trivial': 0, 'Baixo': 0, 'Moderado': 0, 'Alto': 0, 'Muito Alto': 0 };
    const contagemAgentes = {};

    ghesPanoramica.forEach(g => {
        (g.riscos || []).forEach(r => {
            totalRiscosGeral++;
            const rawGrav = (r.gravidade_label && String(r.gravidade_label).trim()) ? String(r.gravidade_label).trim() : '';
            if (rawGrav && contagemNiveis[rawGrav] !== undefined) {
                contagemNiveis[rawGrav]++;
            } else {
                totalNaoClassificados++;
            }
            const ag = r.tipo_agente || 'Outros';
            contagemAgentes[ag] = (contagemAgentes[ag] || 0) + 1;
        });
    });

    const tituloPanoramica = gheFiltro
        ? `3. VISÃO PANORÂMICA E MATRIZ DE RISCO — GHE ${escapeHTML(gheFiltro)}`
        : '3. VISÃO PANORÂMICA E MATRIZ DE RISCO CONSOLIDADA (AIHA)';
    const descPanoramica = gheFiltro
        ? `Classificação dos riscos ocupacionais identificados no GHE ${escapeHTML(gheFiltro)}${ghesPanoramica[0]?.nome ? ' (' + escapeHTML(ghesPanoramica[0].nome) + ')' : ''} no âmbito da operação.`
        : 'Classificação quantitativa de todos os riscos ocupacionais identificados no conjunto de setores da operação.';
    const rotuloGhesBox = gheFiltro ? 'GHE Filtrado' : 'Grupos (GHEs)';

    const secaoPanoramicaHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">${tituloPanoramica}</h2>
            <div class="secao-desc">${descPanoramica}</div>

            <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                <div style="flex:1; min-width:90px; border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#0f172a;">${ghesPanoramica.length}</div>
                    <div style="font-size:8pt; font-weight:700; color:#64748b;">${rotuloGhesBox}</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #cbd5e1; border-radius:6px; padding:10px; background:#f8fafc; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#2563eb;">${totalRiscosGeral}</div>
                    <div style="font-size:8pt; font-weight:700; color:#64748b;">Riscos Mapeados</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #6aa84f; border-radius:6px; padding:10px; background:#6aa84f11; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#6aa84f;">${contagemNiveis['Trivial']}</div>
                    <div style="font-size:8pt; font-weight:700; color:#6aa84f;">Trivial</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #f1c232; border-radius:6px; padding:10px; background:#f1c23211; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#d97706;">${contagemNiveis['Baixo']}</div>
                    <div style="font-size:8pt; font-weight:700; color:#d97706;">Baixo</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #e69138; border-radius:6px; padding:10px; background:#e6913811; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#ea580c;">${contagemNiveis['Moderado']}</div>
                    <div style="font-size:8pt; font-weight:700; color:#ea580c;">Moderado</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #cc0000; border-radius:6px; padding:10px; background:#cc000011; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#dc2626;">${contagemNiveis['Alto']}</div>
                    <div style="font-size:8pt; font-weight:700; color:#dc2626;">Alto</div>
                </div>
                <div style="flex:1; min-width:90px; border:1px solid #990000; border-radius:6px; padding:10px; background:#99000011; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#991b1b;">${contagemNiveis['Muito Alto']}</div>
                    <div style="font-size:8pt; font-weight:700; color:#991b1b;">Muito Alto</div>
                </div>
                ${totalNaoClassificados > 0 ? `
                <div style="flex:1; min-width:90px; border:1px solid #64748b; border-radius:6px; padding:10px; background:#f1f5f9; text-align:center;">
                    <div style="font-size:18pt; font-weight:800; color:#475569;">${totalNaoClassificados}</div>
                    <div style="font-size:8pt; font-weight:700; color:#475569;">Não Classificados</div>
                </div>
                ` : ''}
            </div>

            <h3 class="subsecao-titulo">Distribuição de Riscos por Tipo de Agente Ocupacional</h3>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th>Tipo de Agente</th>
                        <th style="width: 25%; text-align:center;">Total de Riscos</th>
                        <th style="width: 25%; text-align:center;">% Sobre o Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(contagemAgentes).map(tipo => `
                        <tr>
                            <td><b>${escapeHTML(tipo)}</b></td>
                            <td style="text-align:center; font-weight:700;">${contagemAgentes[tipo]}</td>
                            <td style="text-align:center;">${totalRiscosGeral > 0 ? Math.round((contagemAgentes[tipo] / totalRiscosGeral) * 100) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    // 5. Inventário Geral Detalhado por GHE (GHE 01 a 27)
    const efetivoConsultado = (typeof efetivoLoaded !== 'undefined') ? efetivoLoaded : (Array.isArray(allEfetivo) && allEfetivo.length > 0);
    const ghesFiltrados = (caderno === 'inventario' && gheFiltro)
        ? ghes.filter(g => g && String(g.id).trim() === gheFiltro)
        : ghes;

    const secoesGhesHtml = ghesFiltrados.length === 0
        ? `<div class="pagina-a4"><div style="padding: 30px; text-align:center; color:#64748b; font-size:11pt; border:1px dashed #cbd5e1; border-radius:8px;">Nenhum GHE localizado no catálogo com o identificador "${escapeHTML(gheFiltro)}".</div></div>`
        : ghesFiltrados.map(g => {
        const cargos = Array.isArray(g.cargos) ? g.cargos : [];
        const riscosGhe = Array.isArray(g.riscos) ? g.riscos : [];
        const colabs = (typeof allEfetivo !== 'undefined' && Array.isArray(allEfetivo))
            ? allEfetivo.filter(e => colaboradorEstaAtivo(e) && normalizarGhe(e.ghe) === normalizarGhe(g.id))
            : [];
        const textoEfetivo = efetivoConsultado ? `${colabs.length} colaborador(es)` : 'Não consultado (pendente de sincronização)';

        return `
        <div class="pagina-a4 secao-ghe">
            <div class="cabecalho-ghe">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:13pt; font-weight:800; color:#0f172a;">${escapeHTML(g.id)} — ${escapeHTML(g.nome)}</div>
                        <div style="font-size:9pt; color:#475569; margin-top:2px;"><b>Ambiente/Local:</b> ${escapeHTML(g.ambiente || g.local || 'Instalações Operacionais do Ramal do Agreste')}</div>
                    </div>
                    <div style="text-align:right; font-size:9pt;">
                        <div><b>Efetivo Ativo:</b> ${textoEfetivo}</div>
                        <div><b>Cargos:</b> ${cargos.length} função(ões)</div>
                    </div>
                </div>
                <div style="font-size:8.5pt; color:#334155; margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:4px;">
                    <b>Cargos Abrangidos:</b> ${cargos.map(c => `${escapeHTML(c.cargo || c.funcao)} (CBO ${escapeHTML(c.cbo || '—')})`).join('; ') || 'Nenhum cargo especificado'}
                </div>
            </div>

            <table class="tabela-pgr" style="margin-top:10px;">
                <thead>
                    <tr>
                        <th style="width: 8%;">Tipo</th>
                        <th style="width: 14%;">Fator de Risco / Agente</th>
                        <th style="width: 8%;">eSocial</th>
                        <th style="width: 14%;">Fonte Geradora / Exposição</th>
                        <th style="width: 8%; text-align:center;">P × S</th>
                        <th style="width: 10%; text-align:center;">Nível AIHA</th>
                        <th style="width: 18%;">Possíveis Danos à Saúde</th>
                        <th style="width: 20%;">Medidas Preventivas (EPC / EPI com CA)</th>
                    </tr>
                </thead>
                <tbody>
                    ${riscosGhe.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:12px; color:#64748b;">Nenhum risco ocupacional registrado no inventário deste GHE até o momento (pendente de avaliação/revisão técnica).</td></tr>' : riscosGhe.map(r => {
                        const gravLabel = (r.gravidade_label && String(r.gravidade_label).trim()) ? String(r.gravidade_label).trim() : 'Pendente / Não classificado';
                        const corGrav = NIVEIS_RISCO_COR[gravLabel] || '#64748b';
                        const medidasCellHtml = formatarMedidasPreventivasRiscoPgr(r);
                        return `
                        <tr class="linha-risco-pgr">
                            <td><b>${escapeHTML(r.tipo_agente || '—')}</b></td>
                            <td>
                                <b>${escapeHTML(r.agente || '—')}</b>
                                <div style="font-size:7.5pt; color:#64748b; margin-top:2px;">GHE ${escapeHTML(g.id)}</div>
                            </td>
                            <td>${escapeHTML(r.esocial_codigo || r.codigo_esocial || '—')}</td>
                            <td>
                                <div style="font-size:7.5pt; font-weight:700; color:#1e3a8a; margin-bottom:2px;">[${escapeHTML(r.agente || 'Agente')} — GHE ${escapeHTML(g.id)}]</div>
                                ${escapeHTML(r.fontes_geradoras || '—')}<br><small style="color:#64748b;">${escapeHTML(r.tipo_tempo_exposicao || '')}</small>
                            </td>
                            <td style="text-align:center;">${r.probabilidade || '—'} × ${r.severidade || '—'}</td>
                            <td style="text-align:center;">
                                <span class="badge-grav" style="background:${corGrav}22; color:${corGrav}; border:1px solid ${corGrav};">
                                    ${escapeHTML(gravLabel)}
                                </span>
                            </td>
                            <td>${escapeHTML(r.danos_saude || '—')}</td>
                            <td>
                                <div style="font-size:7.5pt; font-weight:700; color:#1e3a8a; margin-bottom:2px;">[${escapeHTML(r.agente || 'Agente')} — GHE ${escapeHTML(g.id)}]</div>
                                ${medidasCellHtml}
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    }).join('');

    // 6. Plano de Ação 5W2H (Integrado NR-01)
    const planoAcoes = (typeof allPlanoAcaoPgr !== 'undefined' && Array.isArray(allPlanoAcaoPgr)) ? allPlanoAcaoPgr : [];
    const planoFalhou = Boolean(statusFontes && Array.isArray(statusFontes.pendencias) && statusFontes.pendencias.some(p => p.includes('pgr_plano_acao')));
    const msgPlanoVazio = planoFalhou
        ? 'Plano de Ação 5W2H (pgr_plano_acao) não sincronizado com o banco de dados no momento da emissão.'
        : 'Nenhuma ação específica vinculada em pgr_plano_acao no momento.';
    const secaoPlanoAcaoHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">4. PLANO DE AÇÃO INTEGRADO (METODOLOGIA 5W2H — NR-01)</h2>
            <div class="secao-desc">Ações de controle, mitigação e melhoria contínua de SST extraídas dinamicamente de pgr_plano_acao (item 1.5.5.2 da NR-01). Campos não definidos são mantidos como neutros.</div>

            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 18%;">O Quê (Ação 5W2H)</th>
                        <th style="width: 14%;">Por Quê (Motivo / Risco)</th>
                        <th style="width: 12%;">Onde (Setor / GHE)</th>
                        <th style="width: 12%;">Quem (Responsável)</th>
                        <th style="width: 10%; text-align:center;">Quando (Prazo)</th>
                        <th style="width: 16%;">Como (Método / Procedimento)</th>
                        <th style="width: 9%; text-align:right;">Quanto (Custo)</th>
                        <th style="width: 9%; text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${planoAcoes.length === 0 ? `<tr><td colspan="8" style="text-align:center; padding:12px; color:#64748b;">${escapeHTML(msgPlanoVazio)}</td></tr>` : planoAcoes.map(a => {
                        const custoNum = typeof a.how_much_custo === 'number' ? a.how_much_custo : parseFloat(a.how_much_custo);
                        const custoFmt = (!isNaN(custoNum) && custoNum > 0) ? `R$ ${custoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
                        const prazoFmt = a.when_prazo ? formatSimpleDate(a.when_prazo) : (a.prazo ? formatSimpleDate(a.prazo) : '—');
                        return `
                        <tr>
                            <td><b>${escapeHTML(a.what_acao || a.acao || '—')}</b>${a.grau_prioridade ? `<br><small style="color:#64748b;">Prioridade: ${escapeHTML(a.grau_prioridade)}</small>` : ''}</td>
                            <td>${escapeHTML(a.why_motivo || a.risco || '—')}</td>
                            <td>${escapeHTML(a.where_local || a.setor || 'Geral')}</td>
                            <td>${escapeHTML(a.who_responsavel || a.responsavel || '—')}</td>
                            <td style="text-align:center;">${escapeHTML(prazoFmt)}</td>
                            <td>${escapeHTML(a.how_metodo || '— (não especificado)')}</td>
                            <td style="text-align:right;">${escapeHTML(custoFmt)}</td>
                            <td style="text-align:center; font-weight:700;">${escapeHTML(a.status || 'Pendente')}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    // 7. Anexos Normativos (AEP NR-17 e Psicossocial NR-01)
    const rawAepList = (typeof allErgonomiaAepPgr !== 'undefined' && Array.isArray(allErgonomiaAepPgr)) ? allErgonomiaAepPgr : [];
    const aepList = rawAepList.filter(a => a && (a.status === 'concluida' || a.status === 'homologada' || !a.status));
    const ergoPlanoList = (typeof allErgonomiaPlanoAcaoPgr !== 'undefined' && Array.isArray(allErgonomiaPlanoAcaoPgr)) ? allErgonomiaPlanoAcaoPgr : [];
    const psicoList = (typeof allAvaliacoesPsicossociaisPgr !== 'undefined' && Array.isArray(allAvaliacoesPsicossociaisPgr)) ? allAvaliacoesPsicossociaisPgr : [];
    const psicoCenso = psicoList.length > 0 ? psicoList[0] : null;
    const escalasPsico = (typeof allAvaliacoesPsicossociaisEscalasPgr !== 'undefined' && Array.isArray(allAvaliacoesPsicossociaisEscalasPgr)) ? allAvaliacoesPsicossociaisEscalasPgr : [];

    const secaoAnexosHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">5. ANEXOS TÉCNICOS E COMPLEMENTARES</h2>

            <h3 class="subsecao-titulo">5.1 Anexo I — Avaliações Ergonômicas Preliminares (AEP — NR-17) e Plano de Ação Ergonômico</h3>
            <div class="texto-paragrafo">Conforme preconiza o subitem 17.3 da NR-17 (Portaria MTP nº 423/2021), a organização realizou Avaliações Ergonômicas Preliminares (AEP) visando a identificação precoce de perigos e sobrecargas biomecânicas, cognitivas e organizacionais nas frentes de trabalho. Abaixo são discriminados os laudos técnicos de AEP homologados pela Engenharia de Segurança e as respectivas ações de melhoria ergonômica planejadas e em execução.</div>

            <div style="font-weight:700; color:#1e40af; margin-top:8px; margin-bottom:4px; font-size:9pt;">Quadro Consolidado de Laudos de AEP Homologados (${aepList.length} laudos registrados)</div>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 10%;">Código / Data</th>
                        <th style="width: 20%;">Posto de Trabalho / Setor</th>
                        <th style="width: 14%;">GHE / Função</th>
                        <th style="width: 6%; text-align:center;">Efetivo</th>
                        <th style="width: 18%;">Fatores de Risco Avaliados</th>
                        <th style="width: 8%; text-align:center;">Nível Risco</th>
                        <th style="width: 6%; text-align:center;">AET?</th>
                        <th style="width: 18%;">Parecer Conclusivo Técnico</th>
                    </tr>
                </thead>
                <tbody>
                    ${aepList.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:12px; color:#64748b;">Nenhuma Avaliação Ergonômica Preliminar (AEP) com laudo concluído no momento. As atividades devem observar as diretrizes preventivas gerais e pausas ergonômicas da NR-17.</td></tr>' : aepList.map(a => {
                        const nivelUpper = String(a.nivel_risco_global || '').toUpperCase();
                        let badgeColor = '#64748b';
                        let badgeBg = '#f1f5f9';
                        if (nivelUpper === 'ALTO') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; }
                        else if (nivelUpper === 'MEDIO' || nivelUpper === 'MÉDIO') { badgeBg = '#fef3c7'; badgeColor = '#92400e'; }
                        else if (nivelUpper === 'BAIXO') { badgeBg = '#dcfce7'; badgeColor = '#166534'; }

                        const fatoresTxt = [
                            a.obs_levantamento_carga ? `• <b>Cargas:</b> ${escapeHTML(a.obs_levantamento_carga)}` : '',
                            a.obs_posturas_repetitividade ? `• <b>Posturas:</b> ${escapeHTML(a.obs_posturas_repetitividade)}` : '',
                            a.obs_mobiliario_equipamentos ? `• <b>Mobiliário:</b> ${escapeHTML(a.obs_mobiliario_equipamentos)}` : '',
                            a.obs_condicoes_ambientais ? `• <b>Ambiente:</b> ${escapeHTML(a.obs_condicoes_ambientais)}` : '',
                            a.obs_organizacao_trabalho ? `• <b>Organização:</b> ${escapeHTML(a.obs_organizacao_trabalho)}` : ''
                        ].filter(Boolean).join('<br>');

                        const aetTxt = a.necessidade_aet === true ? 'SIM' : (a.necessidade_aet === false ? 'NÃO' : 'Pendente');
                        const aetCor = a.necessidade_aet === true ? '#dc2626' : (a.necessidade_aet === false ? '#16a34a' : '#d97706');
                        const numTrabTxt = (a.num_trabalhadores != null && a.num_trabalhadores !== '') ? String(a.num_trabalhadores) : 'Não informado';
                        const avaliadorNomeTxt = a.avaliador_nome ? a.avaliador_nome : 'Não informado';

                        return `
                        <tr>
                            <td><b>${escapeHTML(a.codigo || a.id)}</b><br><small style="color:#64748b;">${escapeHTML(a.data_avaliacao ? formatSimpleDate(a.data_avaliacao) : '—')}</small></td>
                            <td><b>${escapeHTML(a.posto_trabalho || '—')}</b><br><small style="color:#64748b;">${escapeHTML(a.setor || '—')}</small></td>
                            <td>${escapeHTML(a.ghe || '—')}<br><small style="color:#64748b;">${escapeHTML(a.funcao_avaliada || '—')}</small></td>
                            <td style="text-align:center; font-weight:700;">${escapeHTML(numTrabTxt)}</td>
                            <td style="font-size:8pt; line-height:1.3;">${fatoresTxt || 'Avaliação qualitativa preliminar de rotina.'}</td>
                            <td style="text-align:center;"><span style="display:inline-block; padding:2px 6px; border-radius:4px; font-weight:700; font-size:7.5pt; background:${badgeBg}; color:${badgeColor};">${escapeHTML(a.nivel_risco_global || '—')}</span></td>
                            <td style="text-align:center; font-weight:700; color:${aetCor};">${escapeHTML(aetTxt)}</td>
                            <td style="font-size:8pt; line-height:1.3;">${escapeHTML(a.parecer_conclusivo || 'Conclusão registrada pelo avaliador.')}<br><small style="color:#64748b;">Avaliador: ${escapeHTML(avaliadorNomeTxt)}</small></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>

            ${ergoPlanoList.length > 0 ? `
            <div style="font-weight:700; color:#1e40af; margin-top:10px; margin-bottom:4px; font-size:9pt;">Plano de Ações Ergonômicas Específicas (NR-17 — ${ergoPlanoList.length} ações cadastradas)</div>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 25%;">Posto / Vínculo AEP</th>
                        <th style="width: 32%;">Ação de Melhoria Ergonômica</th>
                        <th style="width: 11%;">Tipo</th>
                        <th style="width: 14%;">Responsável</th>
                        <th style="width: 9%; text-align:center;">Prazo</th>
                        <th style="width: 9%; text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${ergoPlanoList.map(ep => `
                        <tr>
                            <td><b>${escapeHTML(ep.posto_trabalho || 'Geral')}</b><br><small style="color:#64748b;">Laudo AEP: ${escapeHTML(ep.aep_id ? String(ep.aep_id) : (ep.aep_codigo || 'Geral / Não vinculado'))} &nbsp;|&nbsp; ${escapeHTML(ep.fator_ergonomico || 'Biomecânico')}</small></td>
                            <td>${escapeHTML(ep.acao_proposta || '—')}</td>
                            <td style="text-transform:capitalize;">${escapeHTML(ep.tipo_medida || '—')}</td>
                            <td>${escapeHTML(ep.responsavel || '—')}</td>
                            <td style="text-align:center;">${escapeHTML(ep.prazo ? formatSimpleDate(ep.prazo) : '—')}</td>
                            <td style="text-align:center; font-weight:700;">${escapeHTML(ep.status || 'Pendente')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>` : ''}

            <h3 class="subsecao-titulo" style="margin-top:18px;">5.2 Anexo II — Gestão de Riscos Psicossociais no Trabalho (NR-01 GRO / Metodologia COPSOQ II)</h3>
            <div class="texto-paragrafo">Em cumprimento aos itens 1.5.3.1 e 1.5.4.1 da NR-01 (Portaria MTP nº 6.730/2020), o Consórcio Operador do Ramal do Agreste integra a gestão de fatores psicossociais relacionados ao trabalho. A metodologia adota parâmetros conceituais do Copenhagen Psychosocial Questionnaire (COPSOQ II), mapeando exigências emocionais, organização do trabalho, liderança e suporte social. Para salvaguardar o sigilo ético e impossibilitar a reidentificação de trabalhadores, não são emitidos diagnósticos nem escores individualizados ou por grupos com efetivo reduzido; eventuais diagnósticos agregados da empresa dependem de homologação de pesquisa censitária específica.</div>

            <div style="margin-top:6px; margin-bottom:10px; padding:6px 10px; background:#eff6ff; border-left:3px solid #2563eb; font-size:8.5pt; color:#1e3a8a;">
                <b>Salvaguarda Ética e Anonimato Absoluto:</b> Conforme preceitos éticos e diretrizes normativas da NR-01, as avaliações psicossociais são apuradas em nível agregado corporativo, vedando a emissão de escores individuais ou segmentações por frentes menores com potencial de quebra de sigilo.
            </div>

            ${psicoCenso ? `
            <div style="display:flex; gap:12px; margin-bottom:10px;">
                <div style="flex:1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; font-size:8.5pt;">
                    <b>Período Censitário:</b> ${formatSimpleDate(psicoCenso.periodo_inicio)} a ${formatSimpleDate(psicoCenso.periodo_fim)} &nbsp;|&nbsp;
                    <b>Taxa de Participação Efetiva:</b> <span style="font-weight:700; color:#16a34a;">${escapeHTML(String(psicoCenso.taxa_participacao != null ? psicoCenso.taxa_participacao : '—'))}%</span> (Representatividade censitária)<br>
                    <b>População Abrangida:</b> Efetivo total do canteiro de obras e setores administrativos &nbsp;|&nbsp; <b>Base de Escalas:</b> avaliacoes_psicossociais_escalas (${escalasPsico.length} dimensões apuradas)
                </div>
            </div>

            ${psicoCenso.resumo_analise ? `
            <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:10px;">
                <b style="color:#0f172a; font-size:9pt;">Síntese do Diagnóstico Censitário e Parecer Psicossocial:</b>
                <div style="font-size:8.5pt; color:#334155; margin-top:4px; line-height:1.4;">
                    ${escapeHTML(psicoCenso.resumo_analise).replace(/\n/g, '<br>')}
                </div>
            </div>` : ''}

            ${escalasPsico.length > 0 ? `
            <div style="font-weight:700; color:#1e40af; margin-top:8px; margin-bottom:4px; font-size:9pt;">Quadro Consolidado de Dimensões Psicossociais COPSOQ II (${escalasPsico.length} escalas apuradas)</div>
            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 40%;">Dimensão / Escala COPSOQ II</th>
                        <th style="width: 20%; text-align:center;">Favorável (%)</th>
                        <th style="width: 20%; text-align:center;">Intermediário (%)</th>
                        <th style="width: 20%; text-align:center;">Risco (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${escalasPsico.map(esc => {
                        const temFav = esc.pct_favoravel != null && !isNaN(Number(esc.pct_favoravel));
                        const temInter = esc.pct_intermediario != null && !isNaN(Number(esc.pct_intermediario));
                        const temRisco = esc.pct_risco != null && !isNaN(Number(esc.pct_risco));

                        const favNum = temFav ? Number(esc.pct_favoravel) : null;
                        const interNum = temInter ? Number(esc.pct_intermediario) : null;
                        const riscoNum = temRisco ? Number(esc.pct_risco) : null;

                        const favTxt = temFav ? `${favNum.toFixed(1)}%` : '—';
                        const interTxt = temInter ? `${interNum.toFixed(1)}%` : '—';
                        const riscoTxt = temRisco ? `${riscoNum.toFixed(1)}%` : '—';
                        const corRisco = (temRisco && riscoNum >= 25) ? '#dc2626' : ((temRisco && riscoNum >= 10) ? '#d97706' : '#16a34a');

                        return `
                        <tr>
                            <td><b>${escapeHTML(esc.escala || '—')}</b></td>
                            <td style="text-align:center; color:#16a34a; font-weight:700;">${favTxt}</td>
                            <td style="text-align:center; color:#d97706;">${interTxt}</td>
                            <td style="text-align:center; color:${corRisco}; font-weight:700;">${riscoTxt}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>` : `
            <div style="padding:8px 12px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-size:8.5pt; color:#64748b; text-align:center; margin-bottom:10px;">
                Escalas analíticas individuais pendentes de detalhamento nesta rodada censitária.
            </div>`}

            <div style="background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-bottom:10px;">
                <b style="color:#0f172a; font-size:9pt;">Plano Preventivo Psicossocial Integrado ao PGR (Diretrizes Gerais Corporativas NR-01):</b>
                <div style="font-size:8pt; color:#64748b; margin-top:2px; margin-bottom:4px;">Diretrizes organizacionais complementares aplicáveis permanentemente ao canteiro de obras, independentemente dos resultados censitários específicos de cada rodada:</div>
                <div style="font-size:8.5pt; color:#334155; margin-top:4px; line-height:1.4;">
                    <b>1. Comunicação Transparente de Desmobilização:</b> Reuniões periódicas sobre cronogramas da obra e oportunidades de remanejamento para outras frentes do consórcio, reduzindo a ansiedade sobre estabilidade funcional.<br>
                    <b>2. Gestão Participativa em SST:</b> Espaço estruturado nos Diálogos Diários de Segurança (DDS) para sugestões operacionais de campo, fortalecendo a influência dos trabalhadores.<br>
                    <b>3. Pausas Estratégicas para Funções Críticas:</b> Organização de revezamento de tarefas mentais complexas e monitoramento do bem-estar e qualidade do sono pelo SESMT.
                </div>
            </div>
            ` : `
            <div style="padding:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; font-size:8.5pt; color:#64748b; text-align:center;">
                Diagnóstico censitário psicossocial pendente de homologação na base de dados. Aplicam-se as diretrizes de escuta ativa, DDS participativo e combate ao assédio da NR-01.
            </div>`}
        </div>`;

    // 8. Matriz de Equipamentos de Proteção Coletiva e Individual (EPI / EPC — NR-06)
    const ghesEpis = (gheFiltro)
        ? ghes.filter(g => g && String(g.id).trim() === gheFiltro)
        : ghes;

    const secaoEpisHtml = `
        <div class="pagina-a4">
            <h2 class="secao-titulo">${caderno === 'epis' ? 'MATRIZ DE EQUIPAMENTOS DE PROTEÇÃO COLETIVA E INDIVIDUAL (EPI / EPC — NR-06)' : '4.1 MATRIZ DE EQUIPAMENTOS DE PROTEÇÃO (EPI / EPC — NR-06)'}</h2>
            <div class="secao-desc">Consolidação de medidas de proteção coletiva (EPC) e equipamentos de proteção individual (EPI com Certificado de Aprovação - CA) aplicáveis aos Grupos Homogêneos de Exposição conforme diretrizes da NR-06 e NR-01.</div>

            <table class="tabela-pgr">
                <thead>
                    <tr>
                        <th style="width: 15%;">GHE / Setor</th>
                        <th style="width: 25%;">Funções / Cargos Abrangidos</th>
                        <th style="width: 28%;">Equipamentos de Proteção Coletiva (EPC)</th>
                        <th style="width: 32%;">Equipamentos de Proteção Individual (EPI e CA)</th>
                    </tr>
                </thead>
                <tbody>
                    ${ghesEpis.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:12px; color:#64748b;">Nenhum GHE localizado para emissão da matriz de EPIs.</td></tr>' : ghesEpis.map(g => {
                        const riscosGhe = Array.isArray(g.riscos) ? g.riscos : [];
                        const cargosGhe = Array.isArray(g.cargos) ? g.cargos : [];
                        const cargosTxt = cargosGhe.map(c => c.funcao || c.cargo).filter(Boolean).join(', ') || 'Cargos operacionais';

                        const epcsMap = new Map();
                        const episMap = new Map();

                        riscosGhe.forEach(r => {
                            if (!r) return;
                            if (Array.isArray(r.epcs_lista) && r.epcs_lista.length > 0) {
                                r.epcs_lista.forEach(epc => {
                                    if (epc && (epc.descricao || epc.nome || epc.tipo)) {
                                        const desc = (epc.descricao || epc.nome || epc.tipo || 'EPC').trim();
                                        const key = desc.toLowerCase();
                                        if (!epcsMap.has(key)) {
                                            epcsMap.set(key, { desc, extra: epc.tipo || epc.status || '' });
                                        }
                                    }
                                });
                            }
                            if (r.epcs_recomendados && String(r.epcs_recomendados).trim()) {
                                const desc = String(r.epcs_recomendados).trim();
                                const key = desc.toLowerCase();
                                if (!epcsMap.has(key)) epcsMap.set(key, { desc, extra: r.epc_status || '' });
                            }

                            if (Array.isArray(r.epis_lista) && r.epis_lista.length > 0) {
                                r.epis_lista.forEach(epi => {
                                    if (epi && (epi.descricao || epi.equipamento || epi.nome || epi.ca)) {
                                        const desc = (epi.descricao || epi.equipamento || epi.nome || 'EPI').trim();
                                        const caStr = (epi.ca && String(epi.ca).trim()) ? String(epi.ca).trim() : null;
                                        const key = `${desc.toLowerCase()}::${caStr || ''}`;
                                        if (!episMap.has(key)) {
                                            episMap.set(key, {
                                                desc,
                                                ca: caStr,
                                                periodicidade: epi.periodicidade || ''
                                            });
                                        }
                                    }
                                });
                            }
                            if ((r.epis_recomendados && String(r.epis_recomendados).trim()) || (r.epi_ca && String(r.epi_ca).trim())) {
                                const desc = (r.epis_recomendados && String(r.epis_recomendados).trim()) ? String(r.epis_recomendados).trim() : 'EPI recomendado';
                                const caStr = (r.epi_ca && String(r.epi_ca).trim()) ? String(r.epi_ca).trim() : null;
                                const key = `${desc.toLowerCase()}::${caStr || ''}`;
                                if (!episMap.has(key)) {
                                    episMap.set(key, { desc, ca: caStr, periodicidade: '' });
                                }
                            }
                        });

                        const epcsList = Array.from(epcsMap.values());
                        const episList = Array.from(episMap.values());

                        return `
                        <tr>
                            <td>
                                <b>${escapeHTML(g.id)}</b><br>
                                <span style="font-size:8pt; color:#475569;">${escapeHTML(g.nome || '')}</span>
                            </td>
                            <td>
                                <div style="font-size:8.5pt; color:#334155;">${escapeHTML(cargosTxt)}</div>
                            </td>
                            <td>
                                ${epcsList.length === 0 ? '<span style="color:#94a3b8; font-style:italic;">Medidas administrativas / sem EPC específico</span>' : epcsList.map(e => `• <b>${escapeHTML(e.desc)}</b>${e.extra ? ` <small style="color:#64748b;">(${escapeHTML(e.extra)})</small>` : ''}`).join('<br>')}
                            </td>
                            <td>
                                ${episList.length === 0 ? '<span style="color:#94a3b8; font-style:italic;">Sem indicação de EPI específico</span>' : episList.map(e => `• <b>${escapeHTML(e.desc)}</b> &nbsp; <span style="color:#1e40af; font-weight:700;">[CA ${escapeHTML(e.ca || 'Não informado')}]</span>${e.periodicidade ? ` <small style="color:#64748b;">(${escapeHTML(e.periodicidade)})</small>` : ''}`).join('<br>')}
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    // 9. Termo de Encerramento e Assinaturas Técnicas Padronizado
    const secaoTermoEncerramentoHtml = `
        <div class="pagina-a4">
            <div style="margin-top: 20px; border-top: 2px solid #0f172a; padding-top: 16px; text-align: center;">
                <div style="font-weight: 800; font-size: 12pt; color: #0f172a;">TERMO DE ENCERRAMENTO E VALIDAÇÃO TÉCNICA DO PGR</div>
                <div style="font-size: 9pt; color: #475569; margin-top: 6px; line-height: 1.5; max-width: 850px; margin-left: auto; margin-right: auto;">
                    O presente documento consolida ${caderno === 'completo' ? 'o Programa de Gerenciamento de Riscos (PGR integral)' : ('o ' + escapeHTML(rotuloCaderno))} em estrito atendimento às diretrizes da Norma Regulamentadora nº 01 (NR-01 - Portaria MTP nº 6.730/2020), registrando os fatores de risco identificados, critérios avaliativos e diretrizes preventivas para as frentes e setores operacionais do Consórcio Ramal do Agreste.
                </div>

                <div style="display:flex; justify-content:space-around; margin-top: 35px;">
                    <div style="width: 280px; border-top: 1.5px solid #0f172a; padding-top: 6px; font-size: 8.5pt; line-height: 1.25;">
                        <b>${escapeHTML((avalPrincipal && avalPrincipal.nome) || (oficial ? '' : 'RESPONSÁVEL TÉCNICO NÃO CONFIRMADO'))}</b><br>
                        ${escapeHTML((avalPrincipal && avalPrincipal.qualificacao) || '')}<br>
                        ${escapeHTML((avalPrincipal && avalPrincipal.registro_conselho) || '')}
                    </div>
                    <div style="width: 280px; border-top: 1.5px solid #0f172a; padding-top: 6px; font-size: 8.5pt; line-height: 1.25;">
                        <b>${escapeHTML((respPrincipal && respPrincipal.nome) || (oficial ? '' : 'REPRESENTANTE LEGAL NÃO CONFIRMADO'))}</b><br>
                        ${escapeHTML((respPrincipal && respPrincipal.cargo) ? (String(respPrincipal.cargo).includes('Representante Legal') ? respPrincipal.cargo : (respPrincipal.cargo + ' / Representante Legal')) : 'Representante Legal')}<br>
                        ${escapeHTML(empRazao)}
                    </div>
                </div>

                <div style="margin-top: 25px; font-size: 8pt; color: #64748b; text-align: center;">
                    Rastreabilidade Normativa: <b>${escapeHTML(codigoRastreabilidade)}</b> &nbsp;|&nbsp; ${(statusFontes && statusFontes.registroBancoConfirmado) ? 'Registro em banco conforme NR-01 subitem 1.5.4.4.6' : 'Emissão local (registro em banco pendente de confirmação)'} &nbsp;|&nbsp; Emissão via App SST
                </div>
            </div>
        </div>`;

    let corpoDocumentoHtml = '';
    if (caderno === 'docbase') {
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoHistoricoHtml}
            ${secaoDocBaseHtml}
            ${secaoTermoEncerramentoHtml}`;
    } else if (caderno === 'inventario') {
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoPanoramicaHtml}
            ${secoesGhesHtml}
            ${secaoTermoEncerramentoHtml}`;
    } else if (caderno === 'plano_acao') {
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoPlanoAcaoHtml}
            ${secaoTermoEncerramentoHtml}`;
    } else if (caderno === 'epis') {
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoEpisHtml}
            ${secaoTermoEncerramentoHtml}`;
    } else if (caderno === 'anexos') {
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoAnexosHtml}
            ${secaoTermoEncerramentoHtml}`;
    } else {
        // 'completo' (default)
        corpoDocumentoHtml = `
            ${secaoCapaHtml}
            ${secaoHistoricoHtml}
            ${secaoDocBaseHtml}
            ${secaoPanoramicaHtml}
            ${secoesGhesHtml}
            ${secaoPlanoAcaoHtml}
            ${secaoEpisHtml}
            ${secaoAnexosHtml}
            ${secaoTermoEncerramentoHtml}`;
    }

    const titulosJanelaMap = {
        completo: `PGR Oficial Completo — ${empRazao} (Rev. ${revAtual})`,
        docbase: `PGR Caderno 1 (Documento-Base) — ${empRazao}`,
        inventario: `PGR Caderno 2 (Inventário de Riscos${gheFiltro ? ' - GHE ' + gheFiltro : ''}) — ${empRazao}`,
        plano_acao: `PGR Caderno 3 (Plano de Ação 5W2H) — ${empRazao}`,
        epis: `PGR Caderno 4 (Matriz de EPIs/CAs) — ${empRazao}`,
        anexos: `PGR Caderno 5 (Anexos Analíticos) — ${empRazao}`
    };
    const tituloJanela = titulosJanelaMap[caderno] || titulosJanelaMap.completo;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${escapeHTML(tituloJanela)}</title>
        <style>
            @page { size: A4 landscape; margin: 8mm 10mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #1e293b; margin: 0; padding: 0; background: #fff; }
            .pagina-a4 { page-break-after: always; break-after: page; padding: 4px 0; box-sizing: border-box; }
            .pagina-a4:last-child { page-break-after: avoid; break-after: avoid; }
            .capa-pgr { page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; }
            .secao-titulo { font-size: 13pt; font-weight: 800; color: #0f172a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; margin-top: 0; margin-bottom: 4px; page-break-after: avoid; break-after: avoid; }
            .secao-desc { font-size: 9pt; color: #64748b; margin-bottom: 12px; page-break-after: avoid; break-after: avoid; }
            .subsecao-titulo { font-size: 10.5pt; font-weight: 700; color: #1e40af; margin-top: 12px; margin-bottom: 4px; page-break-after: avoid; break-after: avoid; }
            .texto-paragrafo { font-size: 9.5pt; line-height: 1.5; color: #334155; text-align: justify; margin-bottom: 8px; }
            .tabela-pgr { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
            .tabela-pgr thead { display: table-header-group; }
            .tabela-pgr tbody { display: table-row-group; }
            .tabela-pgr tr { page-break-inside: avoid; break-inside: avoid; }
            .tabela-pgr th, .tabela-pgr td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; word-break: break-word; }
            .tabela-pgr th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
            .cabecalho-ghe { background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
            .badge-grav { padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 8pt; display: inline-block; white-space: nowrap; }
            @media print {
                body { padding: 0; }
                .pagina-a4 { page-break-after: always; break-after: page; }
                .pagina-a4:last-child { page-break-after: avoid; break-after: avoid; }
                .capa-pgr { page-break-inside: avoid; break-inside: avoid; }
                .tabela-pgr tr { page-break-inside: avoid; break-inside: avoid; }
                .cabecalho-ghe { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; break-after: avoid; }
            }
        </style>
    </head>
    <body>
        ${corpoDocumentoHtml}
    </body>
    </html>`;
}


function obterPgrDocBaseVigenteParaImpressao() {
    // Se houver snapshot salvo em memória, faz parse estrito SEM engolir erro silenciosamente (P2 #4)
    if (pgrDocBaseSavedSnapshotJson !== null && pgrDocBaseSavedSnapshotJson !== undefined && pgrDocBaseSavedSnapshotJson !== '') {
        let parsed = null;
        try {
            parsed = JSON.parse(pgrDocBaseSavedSnapshotJson);
        } catch (err) {
            throw new Error('Falha de integridade no Documento-Base do PGR: o estado salvo está corrompido ou em formato JSON inválido. Recarregue e valide o Documento-Base antes de imprimir.');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Falha de integridade no Documento-Base do PGR: estrutura salva inválida. Recarregue e valide o Documento-Base antes de imprimir.');
        }
        const docNorm = normalizarPgrDocBase(parsed);
        const prontidao = (typeof avaliarProntidaoEmissaoPgrDocBase === 'function')
            ? avaliarProntidaoEmissaoPgrDocBase(docNorm)
            : { pronto_para_emissao: false, pendencias: ['Validação de prontidão indisponível.'] };

        if (pgrDocBaseRemotoExiste && prontidao.pronto_para_emissao) {
            return {
                confirmado_oficial: true,
                motivo_nao_oficial: null,
                doc: docNorm
            };
        }
        return {
            confirmado_oficial: false,
            motivo_nao_oficial: pgrDocBaseRemotoExiste
                ? `Documento-Base salvo como rascunho incompleto (${prontidao.pendencias[0] || 'pendências obrigatórias'})`
                : 'Documento-Base do PGR ainda não confirmado/salvo no banco de dados',
            doc: docNorm
        };
    }

    return {
        confirmado_oficial: false,
        motivo_nao_oficial: 'Documento-Base do PGR ainda não confirmado/salvo no banco de dados',
        doc: null
    };
}

function gerarHtmlInventarioRiscosGhe(g) {
    const riscos = Array.isArray(g.riscos) ? g.riscos : [];
    const cargos = Array.isArray(g.cargos) ? g.cargos : [];
    const estadoDocBase = obterPgrDocBaseVigenteParaImpressao();
    const oficial = Boolean(estadoDocBase && estadoDocBase.confirmado_oficial && estadoDocBase.doc);
    const docBase = oficial ? estadoDocBase.doc : null;

    // Quando o Documento-Base não está confirmado oficialmente (rascunho), NUNCA usar datas legadas do GHE
    // como se fossem "Vigência" oficial do PGR (P2 #1 do parecer 2253).
    const rawElab = oficial ? (docBase.data_elaboracao || '') : '';
    const rawVal = oficial ? (docBase.data_validade || '') : '';
    const dataElab = oficial
        ? (rawElab ? formatSimpleDate(rawElab) : 'Não informada')
        : 'Rascunho (Não confirmada)';
    const dataVal = oficial
        ? (rawVal ? formatSimpleDate(rawVal) : 'Não informada')
        : 'Rascunho (Não confirmada)';

    const codigoRevStr = oficial
        ? `${escapeHTML(docBase.codigo_documento || 'PGR')} (Rev. ${escapeHTML(docBase.revisao_atual)})`
        : 'RASCUNHO NÃO OFICIAL (Sem revisão confirmada)';

    const subTituloStr = oficial
        ? escapeHTML(docBase.enquadramento_normativo || 'Programa de Gerenciamento de Riscos (NR-01 GRO) — Metodologia AIHA')
        : 'RASCUNHO TÉCNICO PARA CONFERÊNCIA — DOCUMENTO-BASE NÃO HOMOLOGADO';

    const avalPrincipal = (oficial && Array.isArray(docBase.avaliadores) && docBase.avaliadores[0])
        ? docBase.avaliadores[0]
        : null;
    const respPrincipal = (oficial && Array.isArray(docBase.responsaveis_empresa) && docBase.responsaveis_empresa[0])
        ? docBase.responsaveis_empresa[0]
        : null;

    const bannerNaoOficialHtml = oficial
        ? ''
        : `<div style="margin-bottom:10px; padding:8px 12px; border:2px dashed #b45309; background:#fef3c7; color:#92400e; font-size:9pt; font-weight:700; text-align:center;">
            ⚠️ RASCUNHO TÉCNICO SEM VALOR OFICIAL — ${escapeHTML((estadoDocBase && estadoDocBase.motivo_nao_oficial) || 'Documento-Base não confirmado')}.<br>
            Nenhuma revisão, vigência ou assinatura técnica é atribuída até que o Documento-Base do PGR seja confirmado e salvo com todos os campos obrigatórios.
           </div>`;

    const blocoAssinaturasHtml = oficial
        ? `<div class="footer-assinaturas">
            <div class="linha-ass">
                <b>${escapeHTML((avalPrincipal && avalPrincipal.nome) || '')}</b><br>
                ${escapeHTML((avalPrincipal && avalPrincipal.qualificacao) || '')}<br>
                ${escapeHTML((avalPrincipal && avalPrincipal.registro_conselho) || '')}
            </div>
            <div class="linha-ass">
                <b>${escapeHTML((respPrincipal && respPrincipal.nome) || (EMPRESA_INFO?.razaoSocial || ''))}</b><br>
                ${escapeHTML((respPrincipal && respPrincipal.cargo) || 'Representante Legal')}<br>
                ${escapeHTML(EMPRESA_INFO?.razaoSocial || '')}
            </div>
           </div>`
        : `<div class="footer-assinaturas">
            <div class="linha-ass" style="color:#64748b;">
                <b>RESPONSÁVEL TÉCNICO NÃO CONFIRMADO</b><br>
                Configure e salve o Documento-Base do PGR para emissão oficial
            </div>
            <div class="linha-ass" style="color:#64748b;">
                <b>REPRESENTANTE LEGAL NÃO CONFIRMADO</b><br>
                Documento emitido apenas para conferência de rascunho
            </div>
           </div>`;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Inventário Geral de Riscos Ocupacionais (PGR) — ${escapeHTML(g.id)}</title>
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; margin: 0; padding: 15px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #0f172a; }
            .header-table td { padding: 6px 10px; font-size: 9pt; }
            .title { font-size: 13pt; font-weight: 800; text-align: center; color: #0f172a; }
            .sub-title { font-size: 9pt; text-align: center; color: #475569; font-weight: 600; }
            .table-riscos { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; }
            .table-riscos th, .table-riscos td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
            .table-riscos th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
            .badge-grav { padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 8pt; display: inline-block; }
            .footer-assinaturas { margin-top: 25px; display: flex; justify-content: space-around; text-align: center; font-size: 8.5pt; }
            .linha-ass { width: 220px; border-top: 1px solid #0f172a; padding-top: 4px; }
        </style>
    </head>
    <body>
        ${bannerNaoOficialHtml}
        <table class="header-table">
            <tr>
                <td style="width: 20%; text-align: center; border-right: 1.5px solid #0f172a;">
                    <img src="${LOGO_COP_BASE64}" alt="Logo" style="max-height: 40px;">
                </td>
                <td style="width: 60%; border-right: 1.5px solid #0f172a;">
                    <div class="title">INVENTÁRIO GERAL DE RISCOS OCUPACIONAIS — PGR</div>
                    <div class="sub-title">${subTituloStr}</div>
                </td>
                <td style="width: 20%;">
                    <div><b>Código/Rev.:</b> ${codigoRevStr}</div>
                    <div><b>Vigência:</b> ${dataElab} a ${dataVal}</div>
                    <div><b>Emissão:</b> ${formatSimpleDate(new Date())}</div>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="border-top: 1px solid #0f172a; background: #f8fafc;">
                    <b>EMPRESA:</b> ${escapeHTML(EMPRESA_INFO?.razaoSocial || '')} &nbsp;|&nbsp; <b>CNPJ:</b> ${escapeHTML(EMPRESA_INFO?.cnpj || '')} &nbsp;|&nbsp; <b>SETOR / GHE:</b> ${escapeHTML(g.id)} — ${escapeHTML(g.nome)}
                </td>
            </tr>
        </table>

        <div style="font-size: 9pt; margin-bottom: 6px;">
            <b>Cargos Abrangidos:</b> ${cargos.map(c => `${escapeHTML(c.cargo || c.funcao)} (CBO ${escapeHTML(c.cbo || '—')})`).join('; ') || 'Nenhum cargo especificado'}
        </div>

        <table class="table-riscos">
            <thead>
                <tr>
                    <th style="width: 8%;">Tipo</th>
                    <th style="width: 14%;">Agente / Fator de Risco</th>
                    <th style="width: 8%;">Cód. eSocial</th>
                    <th style="width: 14%;">Fonte Geradora / Exposição</th>
                    <th style="width: 8%; text-align: center;">P × S (AIHA)</th>
                    <th style="width: 10%; text-align: center;">Nível de Risco</th>
                    <th style="width: 18%;">Possíveis Danos à Saúde</th>
                    <th style="width: 20%;">Medidas de Prevenção / EPIs</th>
                </tr>
            </thead>
            <tbody>
                ${riscos.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding:15px;">Nenhum risco ocupacional registrado no inventário deste GHE até o momento (pendente de avaliação/revisão técnica).</td></tr>' : riscos.map(r => {
                    const grav = NIVEIS_RISCO_COR[r.gravidade_label] || '#475569';
                    return `
                    <tr>
                        <td><b>${escapeHTML(r.tipo_agente || '—')}</b></td>
                        <td><b>${escapeHTML(r.agente || '—')}</b></td>
                        <td>${escapeHTML(r.esocial_codigo || '—')}</td>
                        <td>${escapeHTML(r.fontes_geradoras || '—')}<br><small style="color:#64748b;">${escapeHTML(r.tipo_tempo_exposicao || '')}</small></td>
                        <td style="text-align:center;">${r.probabilidade || '—'} × ${r.severidade || '—'}</td>
                        <td style="text-align:center;">
                            <span class="badge-grav" style="background:${grav}22; color:${grav}; border:1px solid ${grav};">
                                ${escapeHTML(r.gravidade_label || 'Trivial')}
                            </span>
                        </td>
                        <td>${escapeHTML(r.danos_saude || '—')}</td>
                        <td>
                            ${r.sugestoes ? `<div><b>Prevenção:</b> ${escapeHTML(r.sugestoes)}</div>` : ''}
                            ${r.epis_recomendados ? `<div style="margin-top:3px;"><b>EPI:</b> ${escapeHTML(r.epis_recomendados)}</div>` : ''}
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        ${blocoAssinaturasHtml}
    </body>
    </html>
    `;
}
function renderMatrizRiscoPanel() {
    if (typeof popularMatrizRiscoGheSelect === 'function') popularMatrizRiscoGheSelect();
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

function irParaGheDaMatriz(gheId, riscoIdx) {
    selecionarGheMatrizRisco(gheId, riscoIdx);
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

var matrizEpiLoaded = false;
var matrizEditId = null;
var matrizEditForm = [];

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
var EFETIVO_PDF_COLUNAS = [
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
var EFETIVO_PDF_COLUNAS_PADRAO = new Set(['matricula', 'nome', 'status', 'funcao', 'setor', 'responsavel', 'ghe']);
var efetivoPdfStatusFiltro = 'ativos';

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

var colabTreinamentosDetalhe = [];
var colabTreinBadgeAberto = null;

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
    const e = allEfetivo.find(x => String(x.id) === String(matricula));
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
    let totalMeses = 0;
    if (admissao) {
        const fimRef = demissao || hoje;
        totalMeses = Math.floor((fimRef.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
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
        btnCicloRapidoFicha = `<button class="btn-ciclo-rapido" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(matricula)}', '1º Ciclo')" title="Marcar 1º Ciclo como Gozado / Histórico Fechado">⚡ Fechar 1º Ciclo</button>`;
    } else if (resumoCiclos && !resumoCiclos.ciclo2Fechado && (totalMeses || 0) >= 12) {
        btnCicloRapidoFicha = `<button class="btn-ciclo-rapido-2" onclick="marcarCicloFeriasGozadoRapido('${escapeHTML(matricula)}', '2º Ciclo')" title="Marcar 2º Ciclo como Gozado / Histórico Fechado">⚡ Fechar 2º Ciclo</button>`;
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
    if (document.getElementById('efetivoSubtab-colaboradores')?.style.display !== 'none') {
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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

var allHistoricoTrocaFuncao = [];
var trocaFuncaoMatriculaAtual = null;

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
            ${linhas.map(h => `<div style="font-size:12px; padding:6px 0; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                <div>
                    <b>${formatSimpleDate(h.data_troca)}</b> — ${escapeHTML(h.setor_anterior)} / ${escapeHTML(h.funcao_anterior)} (GHE ${escapeHTML(h.ghe_anterior)}) → ${escapeHTML(h.setor_novo)} / ${escapeHTML(h.funcao_novo)} (GHE ${escapeHTML(h.ghe_novo)})
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="db-clear-btn" style="padding:2px 8px; font-size:11px;" title="Reimprimir Termo de Troca de Função e OS" onclick="reimprimirHistoricoTrocaFuncao('${escapeHTML(h.id)}')">🖨️ Documentos</button>
                    <button class="db-clear-btn" style="padding:2px 8px; font-size:11px; color:var(--danger); border-color:rgba(239,68,68,0.3);" title="Excluir registro do histórico" onclick="excluirHistoricoTrocaFuncao('${escapeHTML(h.id)}', '${escapeHTML(matricula)}')">🗑️</button>
                </div>
            </div>`).join('')}
        </div>`;
}

async function reimprimirHistoricoTrocaFuncao(idHistorico) {
    const h = allHistoricoTrocaFuncao.find(item => item.id === idHistorico);
    if (!h) return;
    const colab = allEfetivo.find(e => e.id === h.matricula) || { id: h.matricula, nome: h.nome_colaborador, setor: h.setor_novo, funcao: h.funcao_novo, ghe: h.ghe_novo };
    await garantirDocumentosControleCarregados();
    const atual = resolverSituacaoCargo(h.setor_anterior, h.funcao_anterior, h.ghe_anterior);
    const novo = resolverSituacaoCargo(h.setor_novo, h.funcao_novo, h.ghe_novo);
    const sugeridos = examesNovosSugeridos(atual.exames, novo.exames);
    const folhas = [
        construirFolhaOrdemServico(h.matricula, { nome: colab.nome, funcao: h.funcao_novo }, CRONOGRAMA_DEFAULTS_SESSAO, h.data_troca),
        construirFolhaTermoTrocaFuncao(colab, atual, novo, sugeridos, h.exames_observacao || '', h.motivo || '', h.data_troca)
    ].join('');
    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Troca de Função - ${escapeHTML(colab.nome)} - ${formatSimpleDate(h.data_troca)}</title>
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
    abrirDocumentoHtmlParaImpressao(html, `Troca_Funcao_${(colab.nome || 'Colaborador').replace(/[^a-zA-Z0-9]/g, '_')}_${formatSimpleDate(h.data_troca).replace(/\//g, '-')}`);
}

async function excluirHistoricoTrocaFuncao(idHistorico, matricula) {
    if (!confirm('Deseja realmente remover este registro do histórico de trocas de função?')) return;
    try {
        await supabaseDelete('historico_troca_funcao', idHistorico);
        allHistoricoTrocaFuncao = allHistoricoTrocaFuncao.filter(h => h.id !== idHistorico);
        mostrarDetalheColaborador(matricula);
    } catch (err) {
        console.error('Erro ao excluir histórico de troca de função:', err);
        alert('❌ Falha ao excluir registro do histórico: ' + err.message);
    }
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

        // 1) Atualiza primeiro o cadastro oficial em colaboradores_efetivo (enviando apenas
        // as colunas reais atualizadas para evitar conflito com propriedades de cache em memória como _admMs)
        const payloadEfetivo = {
            id: matricula,
            setor: setorNovo,
            funcao: funcaoNovo,
            ghe: gheNovo
        };
        await supabaseUpsert('colaboradores_efetivo', [payloadEfetivo]);

        const rowEfetivo = { ...colab, setor: setorNovo, funcao: funcaoNovo, ghe: gheNovo };
        const idx = allEfetivo.findIndex(e => e.id === matricula);
        if (idx >= 0) allEfetivo[idx] = rowEfetivo;

        // 2) Sincronização dupla obrigatória com a base de campo (colaboradores_checklist)
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
                            nome: colab.nome,
                            funcao: funcaoNovo,
                            setor: setorNovo
                        })
                    });
                    if (Array.isArray(allColaboradoresInternos)) {
                        const local = allColaboradoresInternos.find(c => String(c.id) === String(item.id));
                        if (local) {
                            local.nome = colab.nome;
                            local.funcao = funcaoNovo;
                            local.setor = setorNovo;
                        }
                    }
                }
            }
        } catch (errSync) {
            console.warn('Aviso: falha ao sincronizar troca de função em colaboradores_checklist:', errSync);
        }

        // 3) Registra o histórico somente após o sucesso da alteração do cadastro
        const historicoRow = {
            id: `TF_${matricula}_${Date.now()}`,
            matricula,
            nome_colaborador: colab.nome,
            data_troca: data,
            setor_anterior: atual.setor || '',
            funcao_anterior: atual.funcao || '',
            ghe_anterior: atual.ghe || '',
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
        <div class="assinaturas" style="display:flex; justify-content:space-around; align-items:flex-start; margin-top:52px; margin-bottom:10px; gap:24px; text-align:center;">
            ${blocoAssinatura(`<b>${escapeHTML(colab.nome)}</b><br>Colaborador(a)${colab.cpf ? '<br>CPF: ' + escapeHTML(colab.cpf) : ''}`)}
            ${blocoAssinatura(`<b>${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_nome)}</b><br>${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_qualificacao)}<br>${escapeHTML(CRONOGRAMA_DEFAULTS_SESSAO.responsavel_tecnico_registro)}`)}
        </div>
    </div>`;
}

var _headcountMemoMap = new Map();

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

var filtroOsStatusAtual = 'todos'; // 'todos' | 'pendentes' | 'assinadas'
var allOrdensServicoEntregas = [];

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

// ==============================================================================
// ETAPA 2 DO PGR PRÓPRIO DINÂMICO (NR-01 GRO):
// PARAMETRIZAÇÃO DO DOCUMENTO-BASE E AUDITORIA ASSISTIDA DE GHEs
// ==============================================================================

var pgrDocBaseLoaded = false;
var pgrDocBaseLoading = false;
var pgrDocBaseLoadError = null;
var pgrDocBaseRemotoExiste = false;
var pgrDocBaseBaseAtualizadoEm = null;
var pgrDocBaseBaseValorJson = null;
var pgrDocBaseSavedSnapshotJson = null;
var pgrDocBaseBaselineDraftJson = null;
var pgrDocBaseDraft = null;
var pgrDocBaseDirty = false;
var pgrDocBaseSessionId = '';
var pgrDocBaseSavingSessionId = null;
var pgrDocBaseSaveQueue = Promise.resolve();
var pgrDocBaseLatestGen = 0;
var pgrDocBaseUidCounter = 0;

function gerarUidPgrDocBase(prefixo) {
    const pref = String(prefixo || 'pgr');
    pgrDocBaseUidCounter += 1;
    if (typeof crypto !== 'undefined') {
        if (typeof crypto.randomUUID === 'function') {
            return `${pref}_${crypto.randomUUID()}`;
        }
        if (typeof crypto.getRandomValues === 'function') {
            const arr = new Uint32Array(2);
            crypto.getRandomValues(arr);
            return `${pref}_${Date.now().toString(36)}_${arr[0].toString(36)}${arr[1].toString(36)}_${pgrDocBaseUidCounter}`;
        }
    }
    return `${pref}_${Date.now().toString(36)}_${pgrDocBaseUidCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

// Estrutura inicial neutra (P1 #2): não pré-preenche nomes, CREA, revisões, datas,
// instrumentos ou afirmações de práticas operacionais não confirmadas pelo responsável técnico.
function obterPgrDocBaseDefaults() {
    return {
        codigo_documento: '',
        titulo_programa: 'PROGRAMA DE GERENCIAMENTO DE RISCOS — PGR (NR-01 / GRO)',
        enquadramento_normativo: 'NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais',
        revisao_atual: '',
        data_elaboracao: '',
        data_validade: '',
        cidade_uf: '',
        abrangencia_operacional: '',
        responsaveis_empresa: [],
        avaliadores: [],
        historico_revisoes: [],
        instrumentos: [],
        texto_apresentacao_objetivos: '',
        texto_sistematica_inspecoes: '',
        texto_protecoes_coletivas_epc_epi: ''
    };
}

function normalizarPgrDocBase(raw) {
    const def = obterPgrDocBaseDefaults();
    const src = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};

    const normStr = (val, fallback) => {
        if (val === undefined || val === null) return String(fallback || '').trim();
        return String(val).trim();
    };

    const respOrig = Array.isArray(src.responsaveis_empresa) ? src.responsaveis_empresa : def.responsaveis_empresa;
    const avalOrig = Array.isArray(src.avaliadores) ? src.avaliadores : def.avaliadores;
    const revOrig = Array.isArray(src.historico_revisoes) ? src.historico_revisoes : def.historico_revisoes;
    const instOrig = Array.isArray(src.instrumentos) ? src.instrumentos : def.instrumentos;

    return {
        codigo_documento: normStr(src.codigo_documento, def.codigo_documento),
        titulo_programa: normStr(src.titulo_programa, def.titulo_programa),
        enquadramento_normativo: normStr(src.enquadramento_normativo, def.enquadramento_normativo),
        revisao_atual: normStr(src.revisao_atual, def.revisao_atual),
        data_elaboracao: normStr(src.data_elaboracao, def.data_elaboracao),
        data_validade: normStr(src.data_validade, def.data_validade),
        cidade_uf: normStr(src.cidade_uf, def.cidade_uf),
        abrangencia_operacional: normStr(src.abrangencia_operacional, def.abrangencia_operacional),
        responsaveis_empresa: respOrig.map((item, idx) => ({
            uid: String((item && item.uid) || `resp_emp_${idx + 1}`),
            nome: String((item && item.nome) || '').trim(),
            cargo: String((item && item.cargo) || '').trim(),
            documento: String((item && item.documento) || '').trim()
        })),
        avaliadores: avalOrig.map((item, idx) => ({
            uid: String((item && item.uid) || `aval_${idx + 1}`),
            nome: String((item && item.nome) || '').trim(),
            qualificacao: String((item && item.qualificacao) || '').trim(),
            registro_conselho: String((item && item.registro_conselho) || '').trim(),
            atribuicao: String((item && item.atribuicao) || '').trim()
        })),
        historico_revisoes: revOrig.map((item, idx) => ({
            uid: String((item && item.uid) || `rev_${idx + 1}`),
            revisao: String((item && item.revisao) || '').trim(),
            data: String((item && item.data) || '').trim(),
            descricao: String((item && item.descricao) || '').trim(),
            responsavel: String((item && item.responsavel) || '').trim()
        })),
        instrumentos: instOrig.map((item, idx) => ({
            uid: String((item && item.uid) || `inst_${idx + 1}`),
            identificacao: String((item && item.identificacao) || '').trim(),
            marca: String((item && item.marca) || '').trim(),
            modelo: String((item && item.modelo) || '').trim(),
            numero_serie: String((item && item.numero_serie) || '').trim(),
            tecnica_utilizada: String((item && item.tecnica_utilizada) || '').trim(),
            unidade_medida: String((item && item.unidade_medida) || '').trim(),
            agentes_analisados: String((item && item.agentes_analisados) || '').trim(),
            calibrador_certificado: String((item && item.calibrador_certificado) || '').trim(),
            data_calibracao: String((item && item.data_calibracao) || '').trim(),
            validade_calibracao: String((item && item.validade_calibracao) || '').trim()
        })),
        texto_apresentacao_objetivos: normStr(src.texto_apresentacao_objetivos, def.texto_apresentacao_objetivos),
        texto_sistematica_inspecoes: normStr(src.texto_sistematica_inspecoes, def.texto_sistematica_inspecoes),
        texto_protecoes_coletivas_epc_epi: normStr(src.texto_protecoes_coletivas_epc_epi, def.texto_protecoes_coletivas_epc_epi)
    };
}

function isPgrDocBaseDirty() {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft || !pgrDocBaseBaselineDraftJson) return false;
    return JSON.stringify(normalizarPgrDocBase(pgrDocBaseDraft)) !== pgrDocBaseBaselineDraftJson;
}

function restaurarDraftPgrDocBaseParaUltimoSalvo() {
    pgrDocBaseSessionId = gerarUidPgrDocBase('pgr_sess');
    if (pgrDocBaseBaselineDraftJson) {
        pgrDocBaseDraft = JSON.parse(pgrDocBaseBaselineDraftJson);
    } else {
        pgrDocBaseDraft = normalizarPgrDocBase(obterPgrDocBaseDefaults());
        pgrDocBaseBaselineDraftJson = JSON.stringify(pgrDocBaseDraft);
    }
    pgrDocBaseDirty = false;
}

function abrirSubtabPgrDocBase() {
    if (!pgrDocBaseSessionId) {
        pgrDocBaseSessionId = gerarUidPgrDocBase('pgr_sess');
    }
    if (!pgrDocBaseLoaded && !pgrDocBaseLoading) {
        loadPgrDocumentoBase(false);
    } else {
        renderMatrizViewDocBase();
    }
}

async function loadPgrDocumentoBase(forcarRecarga) {
    if (pgrDocBaseLoading) return false;
    if (forcarRecarga && isPgrDocBaseDirty()) {
        const confirmarDescarte = (typeof confirm === 'function')
            ? confirm('Existem alterações não salvas no Documento-Base do PGR. Deseja descartá-las e recarregar os dados do servidor?')
            : true;
        if (!confirmarDescarte) return false;
    }

    pgrDocBaseLoading = true;
    pgrDocBaseLoadError = null;
    const loadSessionId = gerarUidPgrDocBase('pgr_sess');
    pgrDocBaseSessionId = loadSessionId;
    renderMatrizViewDocBase();

    try {
        if (typeof supabaseFetch !== 'function') {
            throw new Error('Serviço de leitura (supabaseFetch) indisponível no momento. Não foi possível verificar o Documento-Base no servidor.');
        }
        const rows = await supabaseFetch('configuracoes_sistema', '?select=id,valor,atualizado_em&id=eq.pgr_documento_base&limit=1');

        if (pgrDocBaseSessionId !== loadSessionId) {
            pgrDocBaseLoading = false;
            return false;
        }

        if (Array.isArray(rows) && rows.length > 0 && rows[0]) {
            pgrDocBaseRemotoExiste = true;
            pgrDocBaseBaseAtualizadoEm = rows[0].atualizado_em ?? null;
            const norm = normalizarPgrDocBase(rows[0].valor);
            pgrDocBaseBaseValorJson = JSON.stringify(norm);
            pgrDocBaseSavedSnapshotJson = pgrDocBaseBaseValorJson;
            pgrDocBaseBaselineDraftJson = pgrDocBaseBaseValorJson;
            pgrDocBaseDraft = JSON.parse(pgrDocBaseBaselineDraftJson);
        } else {
            pgrDocBaseRemotoExiste = false;
            pgrDocBaseBaseAtualizadoEm = null;
            const norm = normalizarPgrDocBase(obterPgrDocBaseDefaults());
            pgrDocBaseBaseValorJson = null;
            // Quando não há registro salvo no banco, pgrDocBaseSavedSnapshotJson permanece null
            // para impedir que valores não confirmados alimentem impressão como documento oficial (P1 #2).
            pgrDocBaseSavedSnapshotJson = null;
            pgrDocBaseBaselineDraftJson = JSON.stringify(norm);
            pgrDocBaseDraft = JSON.parse(pgrDocBaseBaselineDraftJson);
        }

        pgrDocBaseLoaded = true;
        pgrDocBaseDirty = false;
        pgrDocBaseLoading = false;
        renderMatrizViewDocBase();
        return true;
    } catch (err) {
        console.error('Erro ao carregar Documento-Base do PGR:', err);
        if (pgrDocBaseSessionId === loadSessionId) {
            pgrDocBaseLoaded = false;
            pgrDocBaseLoading = false;
            pgrDocBaseLoadError = (err && err.message) ? err.message : 'Falha de comunicação ao consultar configuracoes_sistema.';
            renderMatrizViewDocBase();
        }
        return false;
    }
}

function atualizarIndicadorDirtyPgrDocBase() {
    pgrDocBaseDirty = isPgrDocBaseDirty();
    const badgeEl = document.getElementById('pgrDocBaseDirtyBadge');
    if (!badgeEl) return;
    if (pgrDocBaseDirty) {
        badgeEl.textContent = '● Rascunho com alterações não salvas';
        badgeEl.style.background = 'rgba(245, 158, 11, 0.14)';
        badgeEl.style.color = '#b45309';
        badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    } else if (pgrDocBaseRemotoExiste) {
        badgeEl.textContent = '✓ Sincronizado com o banco de dados';
        badgeEl.style.background = 'rgba(22, 163, 74, 0.12)';
        badgeEl.style.color = '#15803d';
        badgeEl.style.borderColor = 'rgba(22, 163, 74, 0.3)';
    } else {
        badgeEl.textContent = 'ℹ️ Rascunho inicial não confirmado (preencha e clique em Salvar)';
        badgeEl.style.background = 'rgba(2, 132, 199, 0.12)';
        badgeEl.style.color = '#0369a1';
        badgeEl.style.borderColor = 'rgba(2, 132, 199, 0.3)';
    }
}

function atualizarCampoSimplesPgrDocBase(campo, valor) {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft || !campo) return;
    pgrDocBaseDraft[campo] = String(valor ?? '');
    atualizarIndicadorDirtyPgrDocBase();
}

function atualizarItemColecaoPgrDocBase(colecao, uid, campo, valor) {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft) return;
    const arr = pgrDocBaseDraft[colecao];
    if (!Array.isArray(arr)) return;
    const item = arr.find(x => String(x.uid) === String(uid));
    if (!item) return;
    item[campo] = String(valor ?? '');
    atualizarIndicadorDirtyPgrDocBase();
}

function adicionarItemColecaoPgrDocBase(colecao) {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft) return;
    if (!Array.isArray(pgrDocBaseDraft[colecao])) pgrDocBaseDraft[colecao] = [];

    if (colecao === 'responsaveis_empresa') {
        pgrDocBaseDraft.responsaveis_empresa.push({
            uid: gerarUidPgrDocBase('resp_emp'),
            nome: '',
            cargo: '',
            documento: ''
        });
    } else if (colecao === 'avaliadores') {
        pgrDocBaseDraft.avaliadores.push({
            uid: gerarUidPgrDocBase('aval'),
            nome: '',
            qualificacao: '',
            registro_conselho: '',
            atribuicao: ''
        });
    } else if (colecao === 'historico_revisoes') {
        pgrDocBaseDraft.historico_revisoes.push({
            uid: gerarUidPgrDocBase('rev'),
            revisao: '',
            data: '',
            descricao: '',
            responsavel: ''
        });
    } else if (colecao === 'instrumentos') {
        pgrDocBaseDraft.instrumentos.push({
            uid: gerarUidPgrDocBase('inst'),
            identificacao: '',
            marca: '',
            modelo: '',
            numero_serie: '',
            tecnica_utilizada: '',
            unidade_medida: '',
            agentes_analisados: '',
            calibrador_certificado: '',
            data_calibracao: '',
            validade_calibracao: ''
        });
    }

    pgrDocBaseDirty = isPgrDocBaseDirty();
    renderMatrizViewDocBase();
}

function removerItemColecaoPgrDocBase(colecao, uid) {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft) return;
    const arr = pgrDocBaseDraft[colecao];
    if (!Array.isArray(arr)) return;
    pgrDocBaseDraft[colecao] = arr.filter(x => String(x.uid) !== String(uid));
    pgrDocBaseDirty = isPgrDocBaseDirty();
    renderMatrizViewDocBase();
}

function descartarAlteracoesPgrDocBase() {
    if (!pgrDocBaseLoaded || !pgrDocBaseDraft) return false;
    if (isPgrDocBaseDirty()) {
        const ok = (typeof confirm === 'function')
            ? confirm('Deseja descartar todas as alterações não salvas do Documento-Base e restaurar a última versão salva?')
            : true;
        if (!ok) return false;
    }
    restaurarDraftPgrDocBaseParaUltimoSalvo();
    renderMatrizViewDocBase();
    const statusEl = document.getElementById('pgrDocBaseFormStatus');
    if (statusEl) {
        statusEl.textContent = '↩️ Alterações não salvas descartadas.';
        statusEl.style.color = 'var(--text-light)';
    }
    return true;
}

function validarErrosCriticosSavePgrDocBase(snap) {
    if (!snap || typeof snap !== 'object') {
        return 'Dados do Documento-Base inválidos.';
    }
    if (snap.data_elaboracao && snap.data_validade && snap.data_elaboracao > snap.data_validade) {
        return `A Data de Elaboração (${snap.data_elaboracao}) não pode ser posterior à Data de Validade (${snap.data_validade}).`;
    }
    for (let i = 0; i < (snap.instrumentos || []).length; i++) {
        const inst = snap.instrumentos[i];
        const rotuloInst = inst.identificacao || `#${i + 1}`;
        if (inst.data_calibracao && inst.validade_calibracao && inst.data_calibracao > inst.validade_calibracao) {
            return `No Instrumento "${rotuloInst}", a data de calibração (${inst.data_calibracao}) não pode ser posterior à validade (${inst.validade_calibracao}).`;
        }
    }
    return null;
}

function avaliarProntidaoEmissaoPgrDocBase(snap) {
    const pendencias = [];
    const erroCritico = validarErrosCriticosSavePgrDocBase(snap);
    if (erroCritico) {
        pendencias.push(erroCritico);
    }
    if (!snap || typeof snap !== 'object') {
        return {
            pronto_para_emissao: false,
            status_prontidao: 'rascunho_incompleto',
            pendencias
        };
    }
    if (!snap.titulo_programa) {
        pendencias.push('Informe o Título Oficial do Programa (PGR).');
    }
    if (!snap.revisao_atual) {
        pendencias.push('Informe o código/número da Revisão Atual do PGR.');
    }
    if (!snap.data_elaboracao) {
        pendencias.push('Informe a Data de Elaboração/Emissão do PGR.');
    }
    if (!snap.data_validade) {
        pendencias.push('Informe a Data de Validade/Revisão Programada do PGR.');
    }
    if (!Array.isArray(snap.avaliadores) || snap.avaliadores.length === 0) {
        pendencias.push('Cadastre ao menos 1 Engenheiro / Avaliador Responsável pelo PGR.');
    } else {
        for (let i = 0; i < snap.avaliadores.length; i++) {
            if (!snap.avaliadores[i].nome) {
                pendencias.push(`Preencha o nome do Avaliador #${i + 1}.`);
            }
            if (!snap.avaliadores[i].registro_conselho) {
                pendencias.push(`Preencha o registro de conselho (CREA/CRM/MTE) do Avaliador #${i + 1}.`);
            }
        }
    }
    if (!Array.isArray(snap.responsaveis_empresa) || snap.responsaveis_empresa.length === 0) {
        pendencias.push('Cadastre ao menos 1 Responsável Legal da Empresa pelo PGR.');
    } else {
        for (let i = 0; i < snap.responsaveis_empresa.length; i++) {
            if (!snap.responsaveis_empresa[i].nome) {
                pendencias.push(`Preencha o nome do Responsável Legal #${i + 1} (ou remova a linha em branco).`);
            }
        }
    }
    for (let i = 0; i < (snap.historico_revisoes || []).length; i++) {
        const r = snap.historico_revisoes[i];
        if (!r.revisao || !r.descricao) {
            pendencias.push(`Na Revisão #${i + 1}, preencha o código da revisão e a descrição da alteração.`);
        }
    }
    for (let i = 0; i < (snap.instrumentos || []).length; i++) {
        const inst = snap.instrumentos[i];
        if (!inst.identificacao) {
            pendencias.push(`No Instrumento #${i + 1}, informe a identificação do equipamento (ou remova a linha em branco).`);
        }
    }
    return {
        pronto_para_emissao: pendencias.length === 0,
        status_prontidao: pendencias.length === 0 ? 'pronto_emissao' : 'rascunho_incompleto',
        pendencias
    };
}

function validarSnapshotPgrDocBase(snap) {
    const prontidao = avaliarProntidaoEmissaoPgrDocBase(snap);
    return prontidao.pendencias.length > 0 ? prontidao.pendencias[0] : null;
}

async function salvarPgrDocumentoBase() {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('matrizrisco')) {
        return false;
    }

    const statusEl = document.getElementById('pgrDocBaseFormStatus');
    const btnSalvar = document.getElementById('btnSalvarPgrDocBase');

    if (!pgrDocBaseLoaded || !pgrDocBaseDraft) {
        if (statusEl) {
            statusEl.textContent = '❌ Não é possível salvar: os dados do Documento-Base ainda não foram carregados do servidor. Clique em Recarregar.';
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }

    // Congela e valida erros críticos (ex.: datas invertidas) ANTES de qualquer await;
    // campos obrigatórios ainda em preenchimento (ex.: avaliador sem nome) permitem salvar como rascunho incompleto com aviso visível.
    const snapshotCongelado = JSON.parse(JSON.stringify(normalizarPgrDocBase(pgrDocBaseDraft)));
    const erroCriticoSave = validarErrosCriticosSavePgrDocBase(snapshotCongelado);
    if (erroCriticoSave) {
        if (statusEl) {
            statusEl.textContent = '❌ ' + erroCriticoSave;
            statusEl.style.color = 'var(--danger)';
        }
        return false;
    }
    const prontidaoSnapshot = avaliarProntidaoEmissaoPgrDocBase(snapshotCongelado);

    const snapshotCongeladoJson = JSON.stringify(snapshotCongelado);
    const saveSessionId = pgrDocBaseSessionId || gerarUidPgrDocBase('pgr_sess');
    pgrDocBaseSessionId = saveSessionId;

    pgrDocBaseLatestGen += 1;
    const myGen = pgrDocBaseLatestGen;

    pgrDocBaseSavingSessionId = saveSessionId;
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = '💾 Gravando...';
    }
    if (statusEl) {
        statusEl.textContent = '⏳ Salvando Documento-Base do PGR no banco de dados...';
        statusEl.style.color = 'var(--text-light)';
    }

    const executarEscritaEnfileirada = async () => {
        if (myGen < pgrDocBaseLatestGen) {
            return true;
        }

        const expectedExiste = pgrDocBaseRemotoExiste;
        const expectedAtualizadoEm = pgrDocBaseBaseAtualizadoEm;
        const expectedValorJson = pgrDocBaseBaseValorJson;
        const novoAtualizadoEm = new Date().toISOString();
        const autor = (typeof usuarioDashboardAtual === 'function' && usuarioDashboardAtual()) || 'painel';

        if (typeof supabaseFetch !== 'function') {
            throw new Error('Serviço de leitura (supabaseFetch) indisponível para verificação Compare-And-Swap.');
        }
        const rowsRemotas = await supabaseFetch('configuracoes_sistema', '?select=id,valor,atualizado_em&id=eq.pgr_documento_base&limit=1');
        const remoto = Array.isArray(rowsRemotas) && rowsRemotas.length > 0 ? rowsRemotas[0] : null;

        if (expectedExiste) {
            if (!remoto) {
                throw new Error('Conflito de concorrência (Compare-And-Swap): o registro remoto de pgr_documento_base foi removido por outra sessão.');
            }
            const remAt = remoto.atualizado_em ?? null;
            const remValJson = JSON.stringify(normalizarPgrDocBase(remoto.valor));
            if (remAt !== expectedAtualizadoEm || (expectedValorJson !== null && remValJson !== expectedValorJson)) {
                throw new Error('Conflito de concorrência (Compare-And-Swap): o Documento-Base do PGR foi alterado no servidor por outra sessão. Recarregue antes de salvar.');
            }
        } else if (remoto) {
            throw new Error('Conflito de concorrência (Compare-And-Swap): o Documento-Base do PGR já foi criado no servidor por outra sessão. Recarregue antes de salvar.');
        }

        if (myGen < pgrDocBaseLatestGen) {
            return true;
        }

        const payloadRow = {
            valor: {
                ...snapshotCongelado,
                status_prontidao: prontidaoSnapshot.status_prontidao
            },
            descricao: 'Parâmetros e diretrizes do Documento-Base do PGR (NR-01 GRO).',
            atualizado_em: novoAtualizadoEm,
            atualizado_por: autor
        };

        if (expectedExiste) {
            if (typeof supabasePatch !== 'function') {
                throw new Error('Operação condicional supabasePatch obrigatória para atualizar Documento-Base do PGR com Compare-And-Swap.');
            }
            const casFilter = expectedAtualizadoEm
                ? `id=eq.pgr_documento_base&atualizado_em=eq.${encodeURIComponent(expectedAtualizadoEm)}`
                : `id=eq.pgr_documento_base&atualizado_em=is.null`;
            const patchRes = await supabasePatch('configuracoes_sistema', casFilter, payloadRow);
            if (!Array.isArray(patchRes) || patchRes.length === 0) {
                throw new Error('Conflito de concorrência (Compare-And-Swap): o Documento-Base do PGR foi modificado concorrentemente por outra sessão.');
            }
        } else {
            // Criação inicial atômica (P1 #3): utiliza exclusivamente supabaseInsert (POST puro sem on_conflict/merge-duplicates).
            // Se outra sessão inserir id='pgr_documento_base' concorrentemente entre o SELECT prévio e o INSERT,
            // a PK/unique constraint do banco rejeita a segunda requisição (HTTP 409 / 23505), impedindo sobrescrita silenciosa.
            if (typeof supabaseInsert !== 'function') {
                throw new Error('Operação atômica supabaseInsert obrigatória para criar o Documento-Base inicial sem sobrescrever outra sessão.');
            }
            try {
                await supabaseInsert('configuracoes_sistema', [{
                    id: 'pgr_documento_base',
                    ...payloadRow
                }]);
                if (typeof invalidarCacheTabela === 'function') {
                    invalidarCacheTabela('configuracoes_sistema');
                }
            } catch (insertErr) {
                const msg = String((insertErr && insertErr.message) || insertErr || '');
                if (msg.includes('409') || msg.includes('23505') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('conflict')) {
                    throw new Error('Conflito de concorrência (Compare-And-Swap): o Documento-Base do PGR foi criado simultaneamente por outra sessão. Recarregue antes de salvar.');
                }
                throw insertErr;
            }
        }

        if (typeof registrarAuditLogDashboard === 'function') {
            registrarAuditLogDashboard(
                expectedExiste ? 'update' : 'create',
                'configuracoes_sistema',
                'pgr_documento_base',
                `Documento-Base do PGR atualizado (${snapshotCongelado.codigo_documento} Rev. ${snapshotCongelado.revisao_atual} | ${prontidaoSnapshot.status_prontidao})`
            );
        }

        pgrDocBaseRemotoExiste = true;
        pgrDocBaseBaseAtualizadoEm = novoAtualizadoEm;
        pgrDocBaseBaseValorJson = snapshotCongeladoJson;
        pgrDocBaseSavedSnapshotJson = snapshotCongeladoJson;
        pgrDocBaseBaselineDraftJson = snapshotCongeladoJson;

        if (pgrDocBaseSessionId === saveSessionId && myGen === pgrDocBaseLatestGen) {
            const draftAtualJson = JSON.stringify(normalizarPgrDocBase(pgrDocBaseDraft));
            const houveEdicaoDuranteSave = draftAtualJson !== snapshotCongeladoJson;
            if (houveEdicaoDuranteSave) {
                pgrDocBaseDirty = true;
                renderMatrizViewDocBase();
                const novoStatusEl = document.getElementById('pgrDocBaseFormStatus');
                if (novoStatusEl) {
                    novoStatusEl.textContent = '⚠️ A versão anterior foi salva, mas houve novas alterações durante o envio. Revise o rascunho mantido na tela e clique em Salvar novamente.';
                    novoStatusEl.style.color = 'var(--warning, #d97706)';
                }
            } else {
                pgrDocBaseDraft = JSON.parse(snapshotCongeladoJson);
                pgrDocBaseDirty = false;
                renderMatrizViewDocBase();
                const novoStatusEl = document.getElementById('pgrDocBaseFormStatus');
                if (novoStatusEl) {
                    if (prontidaoSnapshot.pronto_para_emissao) {
                        novoStatusEl.textContent = '✅ Documento-Base do PGR (NR-01 GRO) salvo com sucesso e pronto para emissão oficial!';
                        novoStatusEl.style.color = 'var(--success)';
                    } else {
                        novoStatusEl.textContent = `⚠️ Rascunho salvo no banco com pendências para emissão oficial (${prontidaoSnapshot.pendencias.length}): ${prontidaoSnapshot.pendencias[0]}`;
                        novoStatusEl.style.color = 'var(--warning, #d97706)';
                    }
                }
            }
        }
        return true;
    };

    const promessaAtual = pgrDocBaseSaveQueue.then(executarEscritaEnfileirada, executarEscritaEnfileirada);
    pgrDocBaseSaveQueue = promessaAtual.catch(() => {});

    try {
        return await promessaAtual;
    } catch (err) {
        console.error('Erro ao salvar Documento-Base do PGR:', err);
        if (pgrDocBaseSessionId === saveSessionId && myGen === pgrDocBaseLatestGen) {
            pgrDocBaseDirty = isPgrDocBaseDirty();
            atualizarIndicadorDirtyPgrDocBase();
            const novoStatusEl = document.getElementById('pgrDocBaseFormStatus');
            if (novoStatusEl) {
                novoStatusEl.textContent = '❌ Falha ao salvar: ' + ((err && err.message) ? err.message : String(err));
                novoStatusEl.style.color = 'var(--danger)';
            }
        }
        return false;
    } finally {
        if (pgrDocBaseSavingSessionId === saveSessionId && myGen === pgrDocBaseLatestGen) {
            pgrDocBaseSavingSessionId = null;
            const btnAtual = document.getElementById('btnSalvarPgrDocBase');
            if (btnAtual) {
                btnAtual.disabled = false;
                btnAtual.textContent = '💾 Salvar Documento-Base do PGR';
            }
        }
    }
}

// ==============================================================================
// VARREDURA E DIAGNÓSTICO ASSISTIDO (READ-ONLY) DO CATÁLOGO DE GHEs
// ==============================================================================

var PADROES_CONTAMINACAO_SGG = [
    {
        termo: 'portaria 344/98',
        motivo: 'Texto de farmácia/drogaria (controle de medicamentos especiais Portaria 344/98) incompatível com O&M do Ramal do Agreste.'
    },
    {
        termo: 'receitas médicas',
        motivo: 'Texto de balconista de farmácia (leitura de receitas médicas e dispensação de remédios) herdado de template externo.'
    },
    {
        termo: 'prescrições médicas',
        motivo: 'Texto de validação de prescrições médicas farmacêuticas herdado de template externo.'
    },
    {
        termo: 'perfuração de lóbulo auricular',
        motivo: 'Descrição de serviço farmacêutico (aplicação de injetáveis e perfuração de lóbulo auricular) incompatível com o GHE.'
    },
    {
        termo: 'salas dos apartamentos',
        motivo: 'Template genérico de construção vertical residencial ("escora metálica nas salas dos apartamentos").'
    },
    {
        termo: 'inserir imagens próprias',
        motivo: 'Placeholder de modelo não preenchido ("Inserir imagens próprias para cada empresa/local de trabalho").'
    },
    {
        termo: 'sistemática: criar',
        motivo: 'Placeholder de texto inacabado ("seguirá a seguinte sistemática: CRIAR").'
    }
];

var propostasSaneamentoCamposGhe = {};

var ESCOPOS_VARREDURA_TEXTUAL_GHE = [
    'GHE (nome, descricao, ambiente, local e demais campos textuais raiz)',
    'Conclusões GHE (laudos/pareceres/observações)',
    'Cargos (cargo, funcao, cbo, setor, lotacao, descricao_atividade, observacoes e demais strings)',
    'Riscos — todos os campos escalares (tipo_agente, agente, codigo_esocial, esocial_codigo, descricao, fontes_geradoras, meio_propagacao, tipo_tempo_exposicao, situacao_controle, danos_saude, sugestoes, medidas_controle, epis_recomendados, epi_ca, epcs_recomendados, epc_status, epc_inspecao, exames_pcmso, cid10_relacionado, tecnica_avaliacao, laudo_responsavel, observacoes e demais strings)',
    'Riscos — listas estruturadas (epis_lista, epcs_lista, medicoes_lista, exames_lista, cids_lista, medidas_lista e todas as suas propriedades textuais)',
    'Fatores Psicossociais NR-01 (dimensao, fator_descricao, fontes_exigencias, possiveis_efeitos, medidas_prevencao, responsavel, observacoes e demais strings)'
];

function diagnosticarTextosGheCatalogo() {
    // Se allGheCatalogo não for um array válido, estiver marcado com falha de carga, ou estiver vazio ([]),
    // tratamos como "Não foi possível verificar" (nunca como 0 GHEs ou "nenhum achado encontrado").
    const catalogoDisponivel = typeof allGheCatalogo !== 'undefined'
        && Array.isArray(allGheCatalogo)
        && allGheCatalogo._loadError !== true
        && allGheCatalogo.length > 0;
    const grupos = catalogoDisponivel
        ? allGheCatalogo.slice().sort((a, b) => String((a && a.id) || '').localeCompare(String((b && b.id) || '')))
        : [];

    // Se allEfetivo não for um array válido, estiver marcado com falha de carga, ou estiver vazio ([]),
    // tratamos como "Não foi possível verificar" (nunca como 0 efetivo ativo).
    const efetivoVerificavel = typeof allEfetivo !== 'undefined'
        && Array.isArray(allEfetivo)
        && allEfetivo._loadError !== true
        && allEfetivo.length > 0;

    const efetivoAtivo = efetivoVerificavel
        ? allEfetivo.filter(c => c && ((typeof colaboradorEstaAtivo === 'function') ? colaboradorEstaAtivo(c) : (String(c.status || '').toUpperCase() === 'ATIVO')))
        : [];

    const achadosTexto = [];
    const resumoGhes = [];
    let totalCamposInspecionados = 0;

    const inspecionarCampo = (ghe, metaCampo, valorTexto) => {
        if (valorTexto === undefined || valorTexto === null) return;
        if (typeof valorTexto !== 'string') return;
        totalCamposInspecionados += 1;
        if (!valorTexto) return;
        const lower = valorTexto.toLowerCase();
        PADROES_CONTAMINACAO_SGG.forEach(p => {
            if (lower.includes(p.termo)) {
                const subKey = metaCampo.sublista_alvo
                    ? `__${metaCampo.sublista_alvo}_${metaCampo.subindice_alvo}`
                    : '';
                const achadoKey = `${String(ghe.id || '')}__${metaCampo.tipo_alvo}__${metaCampo.indice_alvo !== null ? metaCampo.indice_alvo : 'root'}${subKey}__${metaCampo.campo_alvo}__${p.termo}`;
                achadosTexto.push({
                    achado_key: achadoKey,
                    ghe_id: String(ghe.id || ''),
                    ghe_nome: String(ghe.nome || ''),
                    escopo: metaCampo.escopo,
                    localizacao: metaCampo.localizacao,
                    contexto_objeto: metaCampo.contexto_objeto || '',
                    tipo_alvo: metaCampo.tipo_alvo,
                    indice_alvo: metaCampo.indice_alvo,
                    sublista_alvo: metaCampo.sublista_alvo || null,
                    subindice_alvo: (typeof metaCampo.subindice_alvo === 'number') ? metaCampo.subindice_alvo : null,
                    campo_alvo: metaCampo.campo_alvo,
                    risco_idx: (typeof metaCampo.risco_idx === 'number') ? metaCampo.risco_idx : null,
                    termo_detectado: p.termo,
                    justificativa: p.motivo,
                    trecho_original: valorTexto,
                    proposta_acao: 'Revisar e comparar o texto original antes de confirmar qualquer alteração individual no GHE.'
                });
            }
        });
    };

    const unirChavesTexto = (listaPrioritaria, obj, chavesIgnoradas) => {
        const ignorar = new Set(chavesIgnoradas || []);
        const vistas = new Set();
        const resultado = [];
        (listaPrioritaria || []).forEach(k => {
            if (!ignorar.has(k) && !vistas.has(k)) {
                vistas.add(k);
                resultado.push(k);
            }
        });
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.keys(obj).forEach(k => {
                if (!ignorar.has(k) && !vistas.has(k) && typeof obj[k] === 'string') {
                    vistas.add(k);
                    resultado.push(k);
                }
            });
        }
        return resultado;
    };

    const camposRaizGhe = ['nome', 'descricao', 'ambiente', 'local'];
    const camposCargo = ['cargo', 'funcao', 'cbo', 'setor', 'lotacao', 'descricao_atividade', 'observacoes'];
    const camposRiscoEscalares = [
        'tipo_agente', 'agente', 'codigo_esocial', 'esocial_codigo', 'descricao',
        'fontes_geradoras', 'meio_propagacao', 'tipo_tempo_exposicao', 'situacao_controle',
        'danos_saude', 'sugestoes', 'medidas_controle', 'epis_recomendados', 'epi_ca',
        'epcs_recomendados', 'epc_status', 'epc_inspecao', 'exames_pcmso', 'cid10_relacionado',
        'tecnica_avaliacao', 'laudo_responsavel', 'observacoes'
    ];
    const sublistasRiscoConfig = [
        { prop: 'epis_lista', rotulo: 'EPI estruturado', campos: ['descricao', 'ca', 'periodicidade'] },
        { prop: 'epcs_lista', rotulo: 'EPC estruturado', campos: ['descricao', 'tipo', 'tipo_custom', 'status', 'inspecao'] },
        { prop: 'medicoes_lista', rotulo: 'Medição estruturada', campos: ['instrumento', 'tecnica', 'unidade', 'observacao', 'valor', 'limite_tolerancia'] },
        { prop: 'exames_lista', rotulo: 'Exame PCMSO estruturado', campos: ['nome', 'nome_custom', 'periodicidade', 'periodicidade_custom', 'criterio_indicacao'] },
        { prop: 'cids_lista', rotulo: 'CID estruturado', campos: ['codigo', 'descricao', 'justificativa'] },
        { prop: 'medidas_lista', rotulo: 'Medida de controle estruturada', campos: ['descricao', 'tipo', 'responsavel', 'prazo', 'status', 'observacao'] }
    ];
    const camposFatorPsico = ['dimensao', 'fator_descricao', 'fontes_exigencias', 'possiveis_efeitos', 'medidas_prevencao', 'responsavel', 'observacoes'];

    grupos.forEach(g => {
        if (!g || typeof g !== 'object') return;
        const gheId = String(g.id || '');
        const cargosFormatoValido = Array.isArray(g.cargos);
        const riscosFormatoValido = Array.isArray(g.riscos);
        const conclusoesObjetoValido = g.conclusoes === undefined || g.conclusoes === null || (typeof g.conclusoes === 'object' && !Array.isArray(g.conclusoes));
        const conclusoes = (conclusoesObjetoValido && g.conclusoes) ? g.conclusoes : {};
        const fatoresPsicoFormatoValido = conclusoesObjetoValido && (
            conclusoes.fatores_psicossociais_nr01 === undefined
            || conclusoes.fatores_psicossociais_nr01 === null
            || Array.isArray(conclusoes.fatores_psicossociais_nr01)
        );

        const cargos = cargosFormatoValido ? g.cargos : [];
        const riscos = riscosFormatoValido ? g.riscos : [];
        const fatoresPsico = (fatoresPsicoFormatoValido && Array.isArray(conclusoes.fatores_psicossociais_nr01))
            ? conclusoes.fatores_psicossociais_nr01
            : [];

        unirChavesTexto(camposRaizGhe, g, ['id', 'updated_at', 'created_at', 'data_inicio', 'data_elaboracao', 'data_validade']).forEach(campoGhe => {
            inspecionarCampo(g, {
                escopo: 'GHE',
                localizacao: `GHE -> ${campoGhe}`,
                contexto_objeto: `GHE ${gheId}`,
                tipo_alvo: 'ghe',
                indice_alvo: null,
                campo_alvo: campoGhe,
                risco_idx: null
            }, g[campoGhe]);
        });

        Object.keys(conclusoes).forEach(kConc => {
            if (kConc === 'fatores_psicossociais_nr01') return;
            if (typeof conclusoes[kConc] === 'string') {
                inspecionarCampo(g, {
                    escopo: 'Conclusões GHE',
                    localizacao: `conclusoes -> ${kConc}`,
                    contexto_objeto: `Conclusões Técnicas do GHE ${gheId}`,
                    tipo_alvo: 'conclusao_ghe',
                    indice_alvo: null,
                    campo_alvo: kConc,
                    risco_idx: null
                }, conclusoes[kConc]);
            }
        });

        cargos.forEach((c, cIdx) => {
            if (!c || typeof c !== 'object') return;
            const rotuloCargo = c.cargo || c.funcao || `Cargo #${cIdx + 1}`;
            const contextoCargo = `Cargo: ${rotuloCargo}${c.cbo ? ' (CBO ' + c.cbo + ')' : ''}`;
            unirChavesTexto(camposCargo, c, ['id', 'uid']).forEach(campoC => {
                inspecionarCampo(g, {
                    escopo: 'Cargo',
                    localizacao: `${rotuloCargo} -> ${campoC}`,
                    contexto_objeto: contextoCargo,
                    tipo_alvo: 'cargo',
                    indice_alvo: cIdx,
                    campo_alvo: campoC,
                    risco_idx: null
                }, c[campoC]);
            });
        });

        let riscosComEpiSemCa = 0;
        riscos.forEach((r, rIdx) => {
            if (!r || typeof r !== 'object') return;
            const rotuloRisco = `Risco #${rIdx + 1} (${r.tipo_agente || 'Agente'}: ${r.agente || 'Sem nome'})`;
            const contextoRisco = `${rotuloRisco} · P×S: ${r.probabilidade || '—'}×${r.severidade || '—'} (${r.gravidade_label || r.gravidade || '—'})`;
            unirChavesTexto(camposRiscoEscalares, r, ['id', 'uid', '_origIndex']).forEach(campoRisco => {
                inspecionarCampo(g, {
                    escopo: 'Risco',
                    localizacao: `${rotuloRisco} -> ${campoRisco}`,
                    contexto_objeto: contextoRisco,
                    tipo_alvo: 'risco',
                    indice_alvo: rIdx,
                    campo_alvo: campoRisco,
                    risco_idx: rIdx
                }, r[campoRisco]);
            });

            sublistasRiscoConfig.forEach(subCfg => {
                const subArr = Array.isArray(r[subCfg.prop]) ? r[subCfg.prop] : [];
                subArr.forEach((subItem, subIdx) => {
                    if (!subItem || typeof subItem !== 'object') return;
                    unirChavesTexto(subCfg.campos, subItem, ['id', 'uid']).forEach(subCampo => {
                        inspecionarCampo(g, {
                            escopo: `Risco (${subCfg.rotulo})`,
                            localizacao: `${rotuloRisco} -> ${subCfg.prop}[${subIdx}].${subCampo}`,
                            contexto_objeto: `${contextoRisco} · ${subCfg.rotulo} #${subIdx + 1}`,
                            tipo_alvo: 'risco_sublista',
                            indice_alvo: rIdx,
                            sublista_alvo: subCfg.prop,
                            subindice_alvo: subIdx,
                            campo_alvo: subCampo,
                            risco_idx: rIdx
                        }, subItem[subCampo]);
                    });
                });
            });

            const temEpiRec = Boolean((r.epis_recomendados && String(r.epis_recomendados).trim() && String(r.epis_recomendados).trim().toUpperCase() !== 'N.A.') || (Array.isArray(r.epis_lista) && r.epis_lista.length > 0));
            const temCa = Boolean((r.epi_ca && String(r.epi_ca).trim() && String(r.epi_ca).trim().toUpperCase() !== 'N.A.') || (Array.isArray(r.epis_lista) && r.epis_lista.some(item => item && item.ca && String(item.ca).trim())));
            if (temEpiRec && !temCa) {
                riscosComEpiSemCa += 1;
            }
        });

        fatoresPsico.forEach((f, fIdx) => {
            if (!f || typeof f !== 'object') return;
            const rotuloFator = `Fator Psicossocial #${fIdx + 1} (${f.dimensao || 'Dimensão'})`;
            unirChavesTexto(camposFatorPsico, f, ['id', 'uid']).forEach(campoFator => {
                inspecionarCampo(g, {
                    escopo: 'Fator Psicossocial',
                    localizacao: `${rotuloFator} -> ${campoFator}`,
                    contexto_objeto: rotuloFator,
                    tipo_alvo: 'fator_psico',
                    indice_alvo: fIdx,
                    campo_alvo: campoFator,
                    risco_idx: null
                }, f[campoFator]);
            });
        });

        const gheIdNorm = (typeof normalizarGhe === 'function')
            ? normalizarGhe(gheId)
            : (/^\d+$/.test(gheId.trim()) ? gheId.trim().padStart(2, '0') : gheId.trim());
        const qtdEfetivoAtivo = efetivoVerificavel
            ? efetivoAtivo.filter(c => {
                const gColab = String(c.ghe || '').trim();
                const gColabNorm = (typeof normalizarGhe === 'function')
                    ? normalizarGhe(gColab)
                    : (/^\d+$/.test(gColab) ? gColab.padStart(2, '0') : gColab);
                return gColabNorm === gheIdNorm
                    || gColab === gheId
                    || gColab === `${gheId} - ${g.nome}`
                    || gColab.startsWith(gheId + ' ');
            }).length
            : null;

        resumoGhes.push({
            id: gheId,
            nome: String(g.nome || ''),
            cargos_verificavel: cargosFormatoValido,
            qtd_cargos: cargosFormatoValido ? cargos.length : null,
            efetivo_verificavel: efetivoVerificavel,
            qtd_efetivo_ativo: qtdEfetivoAtivo,
            status_efetivo: efetivoVerificavel ? `${qtdEfetivoAtivo} ativo(s)` : 'Não foi possível verificar (efetivo não carregado)',
            qtd_oficial_legado: Number(g.quantidade_oficial || 0),
            riscos_verificavel: riscosFormatoValido,
            qtd_riscos: riscosFormatoValido ? riscos.length : null,
            status_riscos: !riscosFormatoValido
                ? 'Não foi possível verificar (formato inválido/nulo)'
                : (riscos.length > 0 ? `${riscos.length} risco(s) cadastrado(s)` : 'Sem riscos cadastrados (pendente de revisão técnica)'),
            fatores_psico_verificavel: fatoresPsicoFormatoValido,
            qtd_fatores_psico: fatoresPsicoFormatoValido ? fatoresPsico.length : null,
            status_fatores_psico: !fatoresPsicoFormatoValido
                ? 'Não foi possível verificar (formato inválido)'
                : `${fatoresPsico.length} fator(es)`,
            riscos_epi_sem_ca: riscosFormatoValido ? riscosComEpiSemCa : null
        });
    });

    return {
        catalogo_verificavel: catalogoDisponivel,
        status_catalogo: catalogoDisponivel
            ? `${grupos.length} GHE(s) carregado(s)`
            : 'Não foi possível verificar (catálogo de GHEs ainda não carregado ou indisponível)',
        efetivo_verificavel: efetivoVerificavel,
        total_ghes: catalogoDisponivel ? grupos.length : null,
        total_campos_inspecionados: catalogoDisponivel ? totalCamposInspecionados : null,
        escopos_inspecionados: ESCOPOS_VARREDURA_TEXTUAL_GHE.slice(),
        ghes_com_riscos: catalogoDisponivel ? resumoGhes.filter(x => x.riscos_verificavel && x.qtd_riscos > 0).length : null,
        ghes_sem_riscos: catalogoDisponivel ? resumoGhes.filter(x => x.riscos_verificavel && x.qtd_riscos === 0).length : null,
        ghes_riscos_nao_verificaveis: catalogoDisponivel ? resumoGhes.filter(x => !x.riscos_verificavel).length : null,
        achados_texto: achadosTexto,
        resumo_ghes: resumoGhes
    };
}

function atualizarPropostaSaneamentoCampoGhe(achadoKey, novoTexto) {
    if (!achadoKey) return;
    propostasSaneamentoCamposGhe[String(achadoKey)] = String(novoTexto ?? '');
}

function lerCampoAlvoEmRegistroGhe(gheRow, achado) {
    if (!gheRow || !achado) return undefined;
    if (achado.tipo_alvo === 'ghe') {
        return gheRow[achado.campo_alvo];
    }
    if (achado.tipo_alvo === 'conclusao_ghe') {
        if (!gheRow.conclusoes || typeof gheRow.conclusoes !== 'object') return undefined;
        return gheRow.conclusoes[achado.campo_alvo];
    }
    if (achado.tipo_alvo === 'cargo') {
        if (!Array.isArray(gheRow.cargos) || !gheRow.cargos[achado.indice_alvo]) return undefined;
        return gheRow.cargos[achado.indice_alvo][achado.campo_alvo];
    }
    if (achado.tipo_alvo === 'risco') {
        if (!Array.isArray(gheRow.riscos) || !gheRow.riscos[achado.indice_alvo]) return undefined;
        return gheRow.riscos[achado.indice_alvo][achado.campo_alvo];
    }
    if (achado.tipo_alvo === 'risco_sublista') {
        if (!Array.isArray(gheRow.riscos) || !gheRow.riscos[achado.indice_alvo]) return undefined;
        const subArr = gheRow.riscos[achado.indice_alvo][achado.sublista_alvo];
        if (!Array.isArray(subArr) || !subArr[achado.subindice_alvo]) return undefined;
        return subArr[achado.subindice_alvo][achado.campo_alvo];
    }
    if (achado.tipo_alvo === 'fator_psico') {
        const arr = gheRow.conclusoes && Array.isArray(gheRow.conclusoes.fatores_psicossociais_nr01)
            ? gheRow.conclusoes.fatores_psicossociais_nr01
            : null;
        if (!arr || !arr[achado.indice_alvo]) return undefined;
        return arr[achado.indice_alvo][achado.campo_alvo];
    }
    return undefined;
}

async function aplicarSaneamentoIndividualCampoGhe(achadoKey) {
    if (typeof bloquearEdicaoSeNaoAutorizado === 'function' && bloquearEdicaoSeNaoAutorizado('matrizrisco')) {
        return false;
    }
    const diag = diagnosticarTextosGheCatalogo();
    const achado = diag.achados_texto.find(a => String(a.achado_key) === String(achadoKey));
    if (!achado) {
        return false;
    }

    const textoPropostoRaw = Object.prototype.hasOwnProperty.call(propostasSaneamentoCamposGhe, achado.achado_key)
        ? propostasSaneamentoCamposGhe[achado.achado_key]
        : achado.trecho_original;
    const textoProposto = String(textoPropostoRaw ?? '').trim();

    if (!textoProposto) {
        if (typeof alert === 'function') {
            alert('Informe o novo texto revisado antes de confirmar a alteração individual do campo.');
        }
        return false;
    }
    if (textoProposto === String(achado.trecho_original || '').trim()) {
        if (typeof alert === 'function') {
            alert('O texto proposto é idêntico ao trecho original. Edite a proposta no campo de revisão antes de confirmar.');
        }
        return false;
    }

    const confirmarSaneamento = (typeof confirm === 'function')
        ? confirm(
            `Confirma a revisão assistida APENAS deste campo em ghe_catalogo?\n\n` +
            `• GHE: ${achado.ghe_id} — ${achado.ghe_nome}\n` +
            `• Campo: ${achado.localizacao}\n` +
            `• Original: "${achado.trecho_original}"\n` +
            `• Novo Texto Aprovado: "${textoProposto}"\n\n` +
            `Todos os demais elementos dos arrays JSONB e campos legados serão preservados intactos.`
        )
        : true;
    if (!confirmarSaneamento) return false;

    const gheLocal = Array.isArray(allGheCatalogo)
        ? allGheCatalogo.find(x => String(x.id) === String(achado.ghe_id))
        : null;
    if (!gheLocal) return false;

    const expectedUpdatedAt = gheLocal.updated_at ?? null;

    if (typeof supabaseFetch !== 'function' || typeof supabasePatch !== 'function') {
        throw new Error('Funções supabaseFetch e supabasePatch são obrigatórias para saneamento assistido com Compare-And-Swap.');
    }

    const rowsRemotas = await supabaseFetch('ghe_catalogo', `?select=*&id=eq.${encodeURIComponent(achado.ghe_id)}&limit=1`);
    const remoto = Array.isArray(rowsRemotas) && rowsRemotas.length > 0 ? rowsRemotas[0] : null;
    if (!remoto) {
        throw new Error(`GHE ${achado.ghe_id} não encontrado no servidor durante verificação CAS.`);
    }

    const remUpdatedAt = remoto.updated_at ?? null;
    if (remUpdatedAt !== expectedUpdatedAt) {
        throw new Error(`Conflito de concorrência (CAS): o GHE ${achado.ghe_id} foi modificado no servidor por outra operação (updated_at divergente). Recarregue antes de aplicar.`);
    }

    const valorAtualRemoto = lerCampoAlvoEmRegistroGhe(remoto, achado);
    if (String(valorAtualRemoto ?? '') !== String(achado.trecho_original ?? '')) {
        throw new Error(`Conflito de concorrência (CAS): o campo "${achado.localizacao}" do GHE ${achado.ghe_id} foi alterado concorrentemente.`);
    }

    const novoUpdatedAt = new Date().toISOString();
    const patchPayload = { updated_at: novoUpdatedAt };

    if (achado.tipo_alvo === 'ghe') {
        patchPayload[achado.campo_alvo] = textoProposto;
    } else if (achado.tipo_alvo === 'conclusao_ghe') {
        const conclusoesClonadas = JSON.parse(JSON.stringify(remoto.conclusoes || {}));
        conclusoesClonadas[achado.campo_alvo] = textoProposto;
        patchPayload.conclusoes = conclusoesClonadas;
    } else if (achado.tipo_alvo === 'cargo') {
        const cargosClonados = JSON.parse(JSON.stringify(remoto.cargos));
        cargosClonados[achado.indice_alvo][achado.campo_alvo] = textoProposto;
        patchPayload.cargos = cargosClonados;
    } else if (achado.tipo_alvo === 'risco') {
        const riscosClonados = JSON.parse(JSON.stringify(remoto.riscos));
        riscosClonados[achado.indice_alvo][achado.campo_alvo] = textoProposto;
        patchPayload.riscos = riscosClonados;
    } else if (achado.tipo_alvo === 'risco_sublista') {
        const riscosClonados = JSON.parse(JSON.stringify(remoto.riscos));
        riscosClonados[achado.indice_alvo][achado.sublista_alvo][achado.subindice_alvo][achado.campo_alvo] = textoProposto;
        patchPayload.riscos = riscosClonados;
    } else if (achado.tipo_alvo === 'fator_psico') {
        const conclusoesClonadas = JSON.parse(JSON.stringify(remoto.conclusoes || {}));
        conclusoesClonadas.fatores_psicossociais_nr01[achado.indice_alvo][achado.campo_alvo] = textoProposto;
        patchPayload.conclusoes = conclusoesClonadas;
    }

    const casFilter = expectedUpdatedAt
        ? `id=eq.${encodeURIComponent(achado.ghe_id)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
        : `id=eq.${encodeURIComponent(achado.ghe_id)}&updated_at=is.null`;

    const patchRes = await supabasePatch('ghe_catalogo', casFilter, patchPayload);
    if (!Array.isArray(patchRes) || patchRes.length === 0) {
        throw new Error(`Conflito de concorrência (CAS): nenhuma linha atualizada para o GHE ${achado.ghe_id}.`);
    }

    Object.assign(gheLocal, patchPayload);
    delete propostasSaneamentoCamposGhe[achado.achado_key];

    if (typeof registrarAuditLogDashboard === 'function') {
        registrarAuditLogDashboard(
            'update',
            'ghe_catalogo',
            achado.ghe_id,
            `Revisão assistida de campo (${achado.localizacao}) confirmada pelo usuário.`
        );
    }

    renderMatrizViewDocBase();
    return true;
}

function exportarBackupGheCatalogoJson() {
    const grupos = Array.isArray(allGheCatalogo) ? allGheCatalogo : [];
    const payload = {
        exportado_em: new Date().toISOString(),
        origem: 'Backup preventivo ghe_catalogo (Etapa 2 PGR NR-01 GRO)',
        total_registros: grupos.length,
        registros: grupos
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_ghe_catalogo_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return payload;
}

function abrirGheRiscoParaRevisaoDesdeDocBase(gheId, riscoIdx) {
    if (!gheId) return false;
    const idx = (riscoIdx !== undefined && riscoIdx !== null && riscoIdx !== '') ? parseInt(riscoIdx, 10) : 0;
    return selecionarGheMatrizRisco(String(gheId), isNaN(idx) ? 0 : idx);
}

function vincularEventosDelegadosPgrDocBase(container) {
    if (!container || container._pgrDocBaseBound) return;
    container._pgrDocBaseBound = true;

    const handleFieldChange = (ev) => {
        const t = ev.target;
        if (!t) return;
        const simpleField = t.getAttribute('data-pgr-docbase-field');
        if (simpleField) {
            atualizarCampoSimplesPgrDocBase(simpleField, t.value);
            return;
        }
        const col = t.getAttribute('data-pgr-docbase-col');
        const uid = t.getAttribute('data-pgr-docbase-uid');
        const itemField = t.getAttribute('data-pgr-docbase-item-field');
        if (col && uid && itemField) {
            atualizarItemColecaoPgrDocBase(col, uid, itemField, t.value);
            return;
        }
        const achadoKey = t.getAttribute('data-pgr-saneamento-key');
        if (achadoKey) {
            atualizarPropostaSaneamentoCampoGhe(achadoKey, t.value);
        }
    };

    container.addEventListener('input', handleFieldChange);
    container.addEventListener('change', handleFieldChange);

    container.addEventListener('click', (ev) => {
        const btn = ev.target && typeof ev.target.closest === 'function'
            ? ev.target.closest('[data-pgr-docbase-action]')
            : null;
        if (!btn) return;
        const action = btn.getAttribute('data-pgr-docbase-action');
        if (action === 'salvar') {
            salvarPgrDocumentoBase();
        } else if (action === 'descartar') {
            descartarAlteracoesPgrDocBase();
        } else if (action === 'recarregar') {
            loadPgrDocumentoBase(true);
        } else if (action === 'add-item') {
            const col = btn.getAttribute('data-pgr-docbase-col');
            if (col) adicionarItemColecaoPgrDocBase(col);
        } else if (action === 'remove-item') {
            const col = btn.getAttribute('data-pgr-docbase-col');
            const uid = btn.getAttribute('data-pgr-docbase-uid');
            if (col && uid) removerItemColecaoPgrDocBase(col, uid);
        } else if (action === 'exportar-backup-ghe') {
            exportarBackupGheCatalogoJson();
        } else if (action === 'aplicar-saneamento-campo') {
            const achadoKey = btn.getAttribute('data-achado-key');
            if (achadoKey) {
                aplicarSaneamentoIndividualCampoGhe(achadoKey).catch(err => {
                    if (typeof alert === 'function') {
                        alert('Falha ao aplicar revisão assistida: ' + ((err && err.message) ? err.message : String(err)));
                    }
                });
            }
        } else if (action === 'abrir-ghe-revisao') {
            const gheId = btn.getAttribute('data-ghe-id');
            const riscoIdx = btn.getAttribute('data-risco-idx');
            abrirGheRiscoParaRevisaoDesdeDocBase(gheId, riscoIdx);
        } else if (action === 'abrir-psico-ghe') {
            const gheId = btn.getAttribute('data-ghe-id');
            if (gheId && typeof navegarParaAvaliacaoPsicossocialDoGhe === 'function') {
                if (isPgrDocBaseDirty()) {
                    const ok = (typeof confirm === 'function')
                        ? confirm('Existem alterações não salvas no Documento-Base do PGR. Deseja descartá-las e ir para os Fatores Psicossociais do GHE?')
                        : true;
                    if (!ok) return;
                    restaurarDraftPgrDocBaseParaUltimoSalvo();
                }
                navegarParaAvaliacaoPsicossocialDoGhe(gheId);
            }
        }
    });
}

function renderMatrizViewDocBase() {
    const container = document.getElementById('matrizDocBaseConteudo');
    if (!container) return;
    vincularEventosDelegadosPgrDocBase(container);

    const diag = diagnosticarTextosGheCatalogo();
    const empRazao = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.razaoSocial) ? EMPRESA_INFO.razaoSocial : 'CONSORCIO OPERADOR RAMAL DO AGRESTE';
    const empCnpj = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.cnpj) ? EMPRESA_INFO.cnpj : '55.623.017/0001-97';
    const empCnae = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.cnaePrincipal) ? EMPRESA_INFO.cnaePrincipal : '71.12-0-00 - Serviços de engenharia';
    const empGr = (typeof EMPRESA_INFO !== 'undefined' && EMPRESA_INFO.grauRisco) ? EMPRESA_INFO.grauRisco : '1';

    let blocoFormularioHtml = '';

    if (pgrDocBaseLoading) {
        blocoFormularioHtml = `
            <div class="db-chart-card" style="padding: 28px; text-align: center; margin-bottom: 18px;">
                <div style="font-size: 14px; font-weight: 700; color: var(--primary);">⏳ Carregando parâmetros do Documento-Base do PGR...</div>
                <div style="font-size: 12px; color: var(--text-light); margin-top: 6px;">Consultando <code>configuracoes_sistema</code> (registro <code>pgr_documento_base</code>).</div>
            </div>`;
    } else if (!pgrDocBaseLoaded || pgrDocBaseLoadError) {
        blocoFormularioHtml = `
            <div class="db-chart-card" style="padding: 20px; border-left: 4px solid var(--danger); margin-bottom: 18px;">
                <div style="font-size: 14px; font-weight: 700; color: var(--danger);">❌ Falha ao carregar Documento-Base do PGR do servidor</div>
                <div style="font-size: 12.5px; color: var(--text-light); margin: 8px 0 12px;">
                    ${escapeHTML(pgrDocBaseLoadError || 'Não foi possível verificar o registro remoto.')}
                    <br>Por segurança, a gravação está bloqueada até que a versão remota seja verificada, evitando sobrescrever dados existentes no banco.
                </div>
                <button type="button" class="db-apply-btn" data-pgr-docbase-action="recarregar" style="font-size: 12.5px; padding: 7px 14px;">🔄 Tentar Carregar Novamente</button>
            </div>`;
    } else {
        const d = pgrDocBaseDraft || normalizarPgrDocBase(obterPgrDocBaseDefaults());
        const prontidao = avaliarProntidaoEmissaoPgrDocBase(d);
        const inputStyle = 'width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; background:var(--bg); color:var(--text); box-sizing:border-box;';
        const labelStyle = 'display:block; font-size:11.5px; font-weight:700; color:var(--text-light); margin-bottom:4px;';

        const bannerProntidaoHtml = prontidao.pronto_para_emissao
            ? `<div id="pgrDocBaseProntidaoBanner" style="margin-bottom:12px; padding:8px 12px; border-radius:8px; background:rgba(22,163,74,0.1); border:1px solid rgba(22,163,74,0.28); color:#15803d; font-size:12px; font-weight:600;">
                ✅ <b>Pronto para Emissão Oficial do PGR:</b> Todos os metadados obrigatórios (título, revisão vigente e equipe avaliadora) estão preenchidos.
               </div>`
            : `<div id="pgrDocBaseProntidaoBanner" style="margin-bottom:12px; padding:10px 12px; border-radius:8px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.35); color:#b45309; font-size:12px;">
                ⚠️ <b>Rascunho em Preenchimento (Salvamento Permitido / Emissão Oficial Bloqueada):</b> Você pode salvar este rascunho parcialmente no banco, mas para emitir o PGR oficial complete:
                <ul style="margin:4px 0 0 18px; padding:0;">
                    ${prontidao.pendencias.map(p => `<li>${escapeHTML(p)}</li>`).join('')}
                </ul>
               </div>`;

        const linhasRespEmpresa = (d.responsaveis_empresa || []).map((item, idx) => `
            <div style="display:grid; grid-template-columns: 1.4fr 1.2fr 1fr auto; gap:8px; align-items:end; margin-bottom:8px; padding:8px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                <div>
                    <label style="${labelStyle}">Nome do Representante Legal #${idx + 1} *</label>
                    <input type="text" value="${escapeHTML(item.nome)}" data-pgr-docbase-col="responsaveis_empresa" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="nome" placeholder="Ex.: Devair Osvaldo Pereira" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Cargo / Papel Institucional</label>
                    <input type="text" value="${escapeHTML(item.cargo)}" data-pgr-docbase-col="responsaveis_empresa" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="cargo" placeholder="Ex.: Representante Legal / Diretoria" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Registro / Identificação (opcional)</label>
                    <input type="text" value="${escapeHTML(item.documento)}" data-pgr-docbase-col="responsaveis_empresa" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="documento" placeholder="Opcional" style="${inputStyle}">
                </div>
                <div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="remove-item" data-pgr-docbase-col="responsaveis_empresa" data-pgr-docbase-uid="${escapeHTML(item.uid)}" title="Remover representante" style="padding:7px 10px; color:var(--danger); border-color:rgba(220,38,38,0.3);">🗑️</button>
                </div>
            </div>`).join('');

        const linhasAvaliadores = (d.avaliadores || []).map((item, idx) => `
            <div style="display:grid; grid-template-columns: 1.3fr 1.1fr 0.9fr 1.2fr auto; gap:8px; align-items:end; margin-bottom:8px; padding:8px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                <div>
                    <label style="${labelStyle}">Profissional / Avaliador #${idx + 1} *</label>
                    <input type="text" value="${escapeHTML(item.nome)}" data-pgr-docbase-col="avaliadores" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="nome" placeholder="Nome completo" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Qualificação Profissional</label>
                    <input type="text" value="${escapeHTML(item.qualificacao)}" data-pgr-docbase-col="avaliadores" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="qualificacao" placeholder="Ex.: Engenheiro de Segurança do Trabalho" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Registro no Conselho (CREA/MTE)</label>
                    <input type="text" value="${escapeHTML(item.registro_conselho)}" data-pgr-docbase-col="avaliadores" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="registro_conselho" placeholder="Ex.: CREA 0522078320" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Atribuição no PGR</label>
                    <input type="text" value="${escapeHTML(item.atribuicao)}" data-pgr-docbase-col="avaliadores" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="atribuicao" placeholder="Ex.: Coordenação Técnica do GRO / PGR" style="${inputStyle}">
                </div>
                <div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="remove-item" data-pgr-docbase-col="avaliadores" data-pgr-docbase-uid="${escapeHTML(item.uid)}" title="Remover avaliador" style="padding:7px 10px; color:var(--danger); border-color:rgba(220,38,38,0.3);">🗑️</button>
                </div>
            </div>`).join('');

        const linhasRevisoes = (d.historico_revisoes || []).map((item, idx) => `
            <div style="display:grid; grid-template-columns: 90px 145px 1.6fr 1fr auto; gap:8px; align-items:end; margin-bottom:8px; padding:8px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                <div>
                    <label style="${labelStyle}">Rev. #${idx + 1} *</label>
                    <input type="text" value="${escapeHTML(item.revisao)}" data-pgr-docbase-col="historico_revisoes" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="revisao" placeholder="Ex.: 02" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Data</label>
                    <input type="date" value="${escapeHTML(item.data)}" data-pgr-docbase-col="historico_revisoes" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="data" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Motivo / Descrição da Alteração *</label>
                    <input type="text" value="${escapeHTML(item.descricao)}" data-pgr-docbase-col="historico_revisoes" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="descricao" placeholder="Descreva o escopo da revisão" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Responsável</label>
                    <input type="text" value="${escapeHTML(item.responsavel)}" data-pgr-docbase-col="historico_revisoes" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="responsavel" placeholder="Responsável técnico" style="${inputStyle}">
                </div>
                <div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="remove-item" data-pgr-docbase-col="historico_revisoes" data-pgr-docbase-uid="${escapeHTML(item.uid)}" title="Remover revisão" style="padding:7px 10px; color:var(--danger); border-color:rgba(220,38,38,0.3);">🗑️</button>
                </div>
            </div>`).join('');

        const linhasInstrumentos = (d.instrumentos || []).map((item, idx) => `
            <div style="margin-bottom:10px; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                <div style="display:grid; grid-template-columns: 1.2fr 0.8fr 0.8fr 0.9fr 0.6fr auto; gap:8px; align-items:end; margin-bottom:8px;">
                    <div>
                        <label style="${labelStyle}">Instrumento #${idx + 1} (Identificação) *</label>
                        <input type="text" value="${escapeHTML(item.identificacao)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="identificacao" placeholder="Ex.: Dosimax - 22051301601B" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Marca</label>
                        <input type="text" value="${escapeHTML(item.marca)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="marca" placeholder="Ex.: Inlite" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Modelo</label>
                        <input type="text" value="${escapeHTML(item.modelo)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="modelo" placeholder="Ex.: DOSEMAX" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Nº de Série</label>
                        <input type="text" value="${escapeHTML(item.numero_serie)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="numero_serie" placeholder="Ex.: 22051301601B" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Unidade</label>
                        <input type="text" value="${escapeHTML(item.unidade_medida)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="unidade_medida" placeholder="Ex.: dB(A)" style="${inputStyle}">
                    </div>
                    <div>
                        <button type="button" class="db-clear-btn" data-pgr-docbase-action="remove-item" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" title="Remover instrumento" style="padding:7px 10px; color:var(--danger); border-color:rgba(220,38,38,0.3);">🗑️</button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1.2fr 1.2fr 1.2fr 135px 135px; gap:8px; align-items:end;">
                    <div>
                        <label style="${labelStyle}">Técnica / Norma Utilizada</label>
                        <input type="text" value="${escapeHTML(item.tecnica_utilizada)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="tecnica_utilizada" placeholder="Ex.: Dosimetria (NR-15 Anexo 1 / NHO-01)" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Agentes Analisados</label>
                        <input type="text" value="${escapeHTML(item.agentes_analisados)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="agentes_analisados" placeholder="Ex.: Ruído contínuo/intermitente (02.01.001)" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Calibrador / Certificado de Calibração</label>
                        <input type="text" value="${escapeHTML(item.calibrador_certificado)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="calibrador_certificado" placeholder="Ex.: Calibrador Calpro Nº Série 20050161" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Data Calibração</label>
                        <input type="date" value="${escapeHTML(item.data_calibracao)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="data_calibracao" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Validade Calibração</label>
                        <input type="date" value="${escapeHTML(item.validade_calibracao)}" data-pgr-docbase-col="instrumentos" data-pgr-docbase-uid="${escapeHTML(item.uid)}" data-pgr-docbase-item-field="validade_calibracao" style="${inputStyle}">
                    </div>
                </div>
            </div>`).join('');

        blocoFormularioHtml = `
            <div class="db-chart-card" style="margin-bottom: 18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border);">
                    <div>
                        <div class="db-chart-title" style="margin-bottom:2px;">📘 Parâmetros Oficiais do Documento-Base do PGR (NR-01 GRO)</div>
                        <div style="font-size:12px; color:var(--text-light);">
                            Configure capa, enquadramento normativo, responsáveis legais, equipe técnica avaliadora, histórico de revisões, instrumentos de higiene ocupacional e textos operacionais reais do <b>${escapeHTML(empRazao)}</b> (CNPJ ${escapeHTML(empCnpj)} · CNAE ${escapeHTML(empCnae)} · Grau de Risco ${escapeHTML(empGr)}).
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span id="pgrDocBaseDirtyBadge" style="font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; border:1px solid transparent;"></span>
                        <button type="button" class="db-clear-btn" data-pgr-docbase-action="recarregar" style="font-size:12px; padding:6px 11px;">🔄 Recarregar</button>
                        <button type="button" class="db-clear-btn" data-pgr-docbase-action="descartar" style="font-size:12px; padding:6px 11px;">↩️ Descartar Rascunho</button>
                        <button type="button" id="btnSalvarPgrDocBase" class="db-apply-btn" data-pgr-docbase-action="salvar" style="font-size:12.5px; padding:7px 14px;">💾 Salvar Documento-Base do PGR</button>
                    </div>
                </div>
                ${bannerProntidaoHtml}
                <div id="pgrDocBaseFormStatus" style="font-size:12.5px; font-weight:600; margin-bottom:12px; min-height:18px;"></div>

                <!-- 1. Identificação e Vigência -->
                <div style="font-weight:700; font-size:13px; color:var(--primary); margin-bottom:8px;">1. Identificação do Programa, Enquadramento Normativo e Vigência</div>
                <div style="display:grid; grid-template-columns: 140px 1.6fr 110px 145px 145px 160px; gap:10px; margin-bottom:10px;">
                    <div>
                        <label style="${labelStyle}">Código Documental</label>
                        <input type="text" value="${escapeHTML(d.codigo_documento)}" data-pgr-docbase-field="codigo_documento" placeholder="Ex.: PGR.SMS.001" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Título Oficial na Capa *</label>
                        <input type="text" value="${escapeHTML(d.titulo_programa)}" data-pgr-docbase-field="titulo_programa" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Revisão Vigente *</label>
                        <input type="text" value="${escapeHTML(d.revisao_atual)}" data-pgr-docbase-field="revisao_atual" placeholder="Ex.: 02" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Data de Emissão</label>
                        <input type="date" value="${escapeHTML(d.data_elaboracao)}" data-pgr-docbase-field="data_elaboracao" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Vigência / Validade</label>
                        <input type="date" value="${escapeHTML(d.data_validade)}" data-pgr-docbase-field="data_validade" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Município / UF Base</label>
                        <input type="text" value="${escapeHTML(d.cidade_uf)}" data-pgr-docbase-field="cidade_uf" placeholder="Ex.: Arcoverde - PE" style="${inputStyle}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1.3fr; gap:10px; margin-bottom:18px;">
                    <div>
                        <label style="${labelStyle}">Enquadramento Normativo Principal (substitui a menção incorreta à NR-18 na capa antiga)</label>
                        <input type="text" value="${escapeHTML(d.enquadramento_normativo)}" data-pgr-docbase-field="enquadramento_normativo" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Abrangência Operacional do Estabelecimento</label>
                        <input type="text" value="${escapeHTML(d.abrangencia_operacional)}" data-pgr-docbase-field="abrangencia_operacional" style="${inputStyle}">
                    </div>
                </div>

                <!-- 2. Responsáveis Legais da Empresa -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700; font-size:13px; color:var(--primary);">2. Representantes / Responsáveis Legais da Empresa</div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="add-item" data-pgr-docbase-col="responsaveis_empresa" style="font-size:11.5px; padding:4px 10px;">➕ Adicionar Representante</button>
                </div>
                <div style="margin-bottom:18px;">
                    ${linhasRespEmpresa || '<div class="db-list-empty" style="padding:10px;">Nenhum representante legal informado.</div>'}
                </div>

                <!-- 3. Equipe Técnica / Avaliadores Responsáveis -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700; font-size:13px; color:var(--primary);">3. Equipe Técnica / Engenheiro(s) e Avaliadores Responsáveis pelo PGR</div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="add-item" data-pgr-docbase-col="avaliadores" style="font-size:11.5px; padding:4px 10px;">➕ Adicionar Avaliador</button>
                </div>
                <div style="margin-bottom:18px;">
                    ${linhasAvaliadores || '<div class="db-list-empty" style="padding:10px;">Adicione ao menos 1 responsável técnico.</div>'}
                </div>

                <!-- 4. Histórico de Revisões -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700; font-size:13px; color:var(--primary);">4. Controle e Histórico de Revisões do PGR (Seção 1 do Documento)</div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="add-item" data-pgr-docbase-col="historico_revisoes" style="font-size:11.5px; padding:4px 10px;">➕ Adicionar Revisão</button>
                </div>
                <div style="margin-bottom:18px;">
                    ${linhasRevisoes || '<div class="db-list-empty" style="padding:10px;">Nenhuma revisão cadastrada no histórico.</div>'}
                </div>

                <!-- 5. Instrumentos de Medição Ambiental -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:700; font-size:13px; color:var(--primary);">5. Instrumentos Utilizados nas Avaliações Quantitativas e Certificados de Calibração (Seções 17 e 18)</div>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="add-item" data-pgr-docbase-col="instrumentos" style="font-size:11.5px; padding:4px 10px;">➕ Adicionar Instrumento</button>
                </div>
                <div style="margin-bottom:18px;">
                    ${linhasInstrumentos || '<div class="db-list-empty" style="padding:10px;">Nenhum instrumento quantitativo cadastrado.</div>'}
                </div>

                <!-- 6. Diretrizes Técnicas e Operacionais -->
                <div style="font-weight:700; font-size:13px; color:var(--primary); margin-bottom:8px;">6. Diretrizes Operacionais do GRO / PGR (Substituição dos Templates Genéricos e Placeholders do SGG)</div>
                <div style="display:grid; grid-template-columns: 1fr; gap:12px;">
                    <div>
                        <label style="${labelStyle}">Apresentação, Objetivos e Hierarquia de Controles (NR-01 item 1.4.1 / 1.5)</label>
                        <textarea rows="4" data-pgr-docbase-field="texto_apresentacao_objetivos" style="${inputStyle}; resize:vertical;">${escapeHTML(d.texto_apresentacao_objetivos)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Sistemática de Inspeções de SST e Operação de Campo (substitui o placeholder "sistemática: CRIAR" da pág. 20 do SGG)</label>
                        <textarea rows="4" data-pgr-docbase-field="texto_sistematica_inspecoes" style="${inputStyle}; resize:vertical;">${escapeHTML(d.texto_sistematica_inspecoes)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Diretrizes de Proteção Coletiva (EPC) e Individual (EPI) no Ramal do Agreste (substitui os textos de "salas dos apartamentos / inserir imagens próprias" das págs. 48–50 do SGG)</label>
                        <textarea rows="4" data-pgr-docbase-field="texto_protecoes_coletivas_epc_epi" style="${inputStyle}; resize:vertical;">${escapeHTML(d.texto_protecoes_coletivas_epc_epi)}</textarea>
                    </div>
                </div>
            </div>`;
    }

    // Painel de Auditoria e Saneamento Assistido (Read-Only por padrão, com revisão individual comparada e CAS)
    const qtdAchados = diag.catalogo_verificavel ? diag.achados_texto.length : null;
    const escoposInspecionadosTexto = Array.isArray(diag.escopos_inspecionados) ? diag.escopos_inspecionados.join(', ') : '';
    const linhasAchadosHtml = !diag.catalogo_verificavel
        ? `<div style="padding:14px; border-radius:8px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.35); color:#b45309; font-size:12.5px; font-weight:600;">
            ⚠️ Não foi possível verificar ocorrências de texto contaminado: o catálogo de GHEs (<code>ghe_catalogo</code>) ainda não foi carregado em memória ou está indisponível.
           </div>`
        : (qtdAchados === 0
            ? `<div style="padding:14px; border-radius:8px; background:rgba(22,163,74,0.08); border:1px solid rgba(22,163,74,0.28); color:#15803d; font-size:12.5px; font-weight:600;">
                ✅ Nenhuma ocorrência de texto contaminado do SGG (<i>Portaria 344/98</i>, <i>receitas médicas</i>, <i>perfuração de lóbulo auricular</i>, <i>salas dos apartamentos</i>, <i>Inserir imagens próprias</i> ou <i>sistemática: CRIAR</i>) foi encontrada nos registros atualmente carregados em memória de <code>ghe_catalogo</code> (${diag.total_ghes} GHEs e ${diag.total_campos_inspecionados || 0} campos textuais inspecionados).
                <div style="font-size:11px; font-weight:400; color:#166534; margin-top:4px;">Escopo varrido: ${escapeHTML(escoposInspecionadosTexto)}.</div>
               </div>`
            : `<div style="margin-bottom:10px; padding:10px 12px; border-radius:8px; background:rgba(220,38,38,0.08); border:1px solid rgba(220,38,38,0.28); color:#b91c1c; font-size:12px;">
                ⚠️ Foram identificados <b>${qtdAchados}</b> trecho(s) suspeito(s) de contaminação de template nos registros atualmente carregados de <code>ghe_catalogo</code> (${diag.total_ghes} GHEs e ${diag.total_campos_inspecionados || 0} campos textuais inspecionados). <b>Nenhuma substituição automática ou em lote é executada:</b> exporte o backup JSON, compare o valor original com o contexto do GHE e edite/confirme apenas o campo desejado (ou abra no editor completo do GHE).
                <div style="font-size:11px; margin-top:4px;">Escopo varrido: ${escapeHTML(escoposInspecionadosTexto)}.</div>
               </div>
               <div class="table-wrap" style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:var(--bg); border-bottom:2px solid var(--border); text-align:left;">
                            <th style="padding:8px;">GHE & Contexto</th>
                            <th style="padding:8px;">Campo & Termo Suspeito</th>
                            <th style="padding:8px;">Valor Original (Somente Leitura)</th>
                            <th style="padding:8px;">Proposta Editável para Comparação</th>
                            <th style="padding:8px; text-align:right;">Revisão Assistida</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${diag.achados_texto.map(a => {
                            const valProposto = Object.prototype.hasOwnProperty.call(propostasSaneamentoCamposGhe, a.achado_key)
                                ? propostasSaneamentoCamposGhe[a.achado_key]
                                : a.trecho_original;
                            return `
                            <tr style="border-bottom:1px solid var(--border); vertical-align:top;">
                                <td style="padding:8px;">
                                    <div style="font-weight:700;">${escapeHTML(a.ghe_id)} — ${escapeHTML(a.ghe_nome)}</div>
                                    <div style="font-size:11px; color:var(--text-light); margin-top:2px;">${escapeHTML(a.contexto_objeto)}</div>
                                </td>
                                <td style="padding:8px;">
                                    <div style="font-weight:600; margin-bottom:4px;">${escapeHTML(a.localizacao)}</div>
                                    <span style="background:rgba(220,38,38,0.12); color:#dc2626; padding:2px 6px; border-radius:4px; font-weight:700; font-size:11px;">${escapeHTML(a.termo_detectado)}</span>
                                    <div style="font-size:11px; color:var(--text-light); margin-top:3px;">${escapeHTML(a.justificativa)}</div>
                                </td>
                                <td style="padding:8px; font-size:11.5px; max-width:280px; background:rgba(100,116,139,0.06);">${escapeHTML(a.trecho_original)}</td>
                                <td style="padding:8px; min-width:240px;">
                                    <textarea rows="3" data-pgr-saneamento-key="${escapeHTML(a.achado_key)}" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:11.5px; box-sizing:border-box;">${escapeHTML(valProposto)}</textarea>
                                </td>
                                <td style="padding:8px; text-align:right; white-space:nowrap;">
                                    <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                                        <button type="button" class="db-apply-btn" data-pgr-docbase-action="aplicar-saneamento-campo" data-achado-key="${escapeHTML(a.achado_key)}" style="font-size:11px; padding:5px 10px;">✅ Confirmar Campo (CAS)</button>
                                        <button type="button" class="db-clear-btn" data-pgr-docbase-action="abrir-ghe-revisao" data-ghe-id="${escapeHTML(a.ghe_id)}" data-risco-idx="${a.risco_idx !== null ? a.risco_idx : ''}" style="font-size:11px; padding:4px 9px;">🔍 Abrir no Editor do GHE</button>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
               </div>`);

    const linhasResumoGhesHtml = diag.resumo_ghes.map(g => {
        const celulaCargosHtml = g.cargos_verificavel
            ? String(g.qtd_cargos)
            : `<span style="color:#b45309; font-weight:600; font-size:11px;">⚠️ Não foi possível verificar</span>`;

        const celulaEfetivoHtml = g.efetivo_verificavel
            ? `<b>${g.qtd_efetivo_ativo}</b> <span style="color:var(--text-light); font-size:11px;">(laudo ant.: ${g.qtd_oficial_legado})</span>`
            : `<span style="color:#b45309; font-weight:600; font-size:11px;" title="A tabela auxiliar colaboradores_efetivo ainda não foi carregada ou falhou.">⚠️ Não foi possível verificar</span> <span style="color:var(--text-light); font-size:11px;">(laudo ant.: ${g.qtd_oficial_legado})</span>`;

        const statusRiscosHtml = !g.riscos_verificavel
            ? `<span style="background:rgba(245,158,11,0.15); color:#b45309; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">⚠️ Não foi possível verificar (formato inválido/nulo)</span>`
            : (g.qtd_riscos > 0
                ? `<span style="background:rgba(22,163,74,0.12); color:#15803d; padding:2px 8px; border-radius:999px; font-weight:700; font-size:11px;">✅ ${g.qtd_riscos} risco(s) cadastrado(s)</span>`
                : `<span style="background:rgba(100,116,139,0.14); color:#475569; padding:2px 8px; border-radius:999px; font-weight:600; font-size:11px;" title="A ausência de registros em riscos=[] não equivale automaticamente à inexistência de exposição ocupacional; requer avaliação/declaração técnica explícita.">⚪ Sem riscos cadastrados (pendente de revisão técnica)</span>`);

        const alertaCaHtml = !g.riscos_verificavel
            ? `<span style="color:#b45309; font-size:11px;">Não foi possível verificar</span>`
            : (g.riscos_epi_sem_ca > 0
                ? `<span style="background:rgba(245,158,11,0.15); color:#b45309; padding:2px 7px; border-radius:4px; font-weight:700; font-size:11px;">⚠️ ${g.riscos_epi_sem_ca} s/ CA</span>`
                : (g.qtd_riscos > 0 ? '<span style="color:#15803d; font-size:11.5px; font-weight:600;">✓ CAs informados / N.A.</span>' : '—'));

        const celulaPsicoHtml = !g.fatores_psico_verificavel
            ? `<span style="color:#b45309; font-weight:600; font-size:11px;">⚠️ Não foi possível verificar</span>`
            : (g.qtd_fatores_psico > 0
                ? `<span style="color:#7c3aed; font-weight:700;">${g.qtd_fatores_psico} fator(es)</span>`
                : '<span style="color:var(--text-light);">0 (nenhum cadastrado)</span>');

        return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:7px 8px; font-weight:700; color:var(--primary); white-space:nowrap;">${escapeHTML(g.id)}</td>
                <td style="padding:7px 8px; font-weight:600;">${escapeHTML(g.nome)}</td>
                <td style="padding:7px 8px; text-align:center;">${celulaCargosHtml}</td>
                <td style="padding:7px 8px; text-align:center;">${celulaEfetivoHtml}</td>
                <td style="padding:7px 8px;">${statusRiscosHtml}</td>
                <td style="padding:7px 8px; text-align:center;">${alertaCaHtml}</td>
                <td style="padding:7px 8px; text-align:center;">${celulaPsicoHtml}</td>
                <td style="padding:7px 8px; text-align:right; white-space:nowrap;">
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="abrir-ghe-revisao" data-ghe-id="${escapeHTML(g.id)}" data-risco-idx="0" style="font-size:11px; padding:4px 8px; margin-right:4px;">📋 Inventário GHE</button>
                    <button type="button" class="db-clear-btn" data-pgr-docbase-action="abrir-psico-ghe" data-ghe-id="${escapeHTML(g.id)}" style="font-size:11px; padding:4px 8px; color:#7c3aed; border-color:rgba(124,58,237,0.35);">🧠 Fatores NR-01</button>
                </td>
            </tr>`;
    }).join('');

    const kpiIndisponivelHtml = '<span style="font-size:13px; color:#b45309;">⚠️ Indisponível</span>';
    const blocoAuditoriaHtml = `
        <div class="db-chart-card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <div>
                    <div class="db-chart-title" style="margin-bottom:2px;">🔍 Diagnóstico e Auditoria Assistida do Catálogo de GHEs (<code>ghe_catalogo</code>)</div>
                    <div style="font-size:12px; color:var(--text-light);">
                        ${diag.catalogo_verificavel
                            ? `Inspeção somente leitura dos ${diag.total_ghes} grupos atualmente carregados em memória (${diag.total_campos_inspecionados || 0} campos textuais varridos), verificando textos contaminados do antigo SGG, cobertura do inventário de riscos e cruzamento com o efetivo carregado.`
                            : `⚠️ Catálogo de GHEs (<code>ghe_catalogo</code>) ainda não carregado em memória ou indisponível — não foi possível verificar a contagem de GHEs nem ocorrências textuais.`}
                    </div>
                </div>
                <button type="button" class="db-clear-btn" data-pgr-docbase-action="exportar-backup-ghe" style="font-size:12px; padding:6px 12px; color:#0284c7; border-color:#38bdf8;">📥 Exportar Backup JSON (<code>ghe_catalogo</code>)</button>
            </div>

            <div class="db-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom:14px;">
                <div class="db-kpi-card db-kpi-primary">
                    <div class="db-kpi-value">${diag.catalogo_verificavel ? diag.total_ghes : kpiIndisponivelHtml}</div>
                    <div class="db-kpi-label">GHEs Cadastrados no Banco</div>
                </div>
                <div class="db-kpi-card" style="border-top-color:#16a34a;">
                    <div class="db-kpi-value" style="color:#16a34a;">${diag.catalogo_verificavel ? diag.ghes_com_riscos : kpiIndisponivelHtml}</div>
                    <div class="db-kpi-label">GHEs com Riscos Avaliados</div>
                </div>
                <div class="db-kpi-card" style="border-top-color:#64748b;">
                    <div class="db-kpi-value" style="color:#475569;">${diag.catalogo_verificavel ? diag.ghes_sem_riscos : kpiIndisponivelHtml}</div>
                    <div class="db-kpi-label">GHEs com <code>riscos = []</code> (Pendentes/Sem Reg.)</div>
                </div>
                <div class="db-kpi-card" style="border-top-color:${!diag.catalogo_verificavel ? '#f59e0b' : (qtdAchados > 0 ? '#dc2626' : '#16a34a')};">
                    <div class="db-kpi-value" style="color:${!diag.catalogo_verificavel ? '#b45309' : (qtdAchados > 0 ? '#dc2626' : '#16a34a')};">${diag.catalogo_verificavel ? qtdAchados : kpiIndisponivelHtml}</div>
                    <div class="db-kpi-label">Trechos Contaminados SGG no Banco</div>
                </div>
            </div>

            <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">A. Verificação de Textos Contaminados / Placeholders do SGG nos GHEs</div>
            <div style="margin-bottom:16px;">
                ${linhasAchadosHtml}
            </div>

            <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">B. Cobertura Dinâmica dos GHEs Cadastrados (Efetivo Ativo × Inventário de Riscos × Fatores NR-01)</div>
            <div class="table-wrap" style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:var(--bg); border-bottom:2px solid var(--border); text-align:left;">
                            <th style="padding:8px;">Código</th>
                            <th style="padding:8px;">Setor / Nome do GHE</th>
                            <th style="padding:8px; text-align:center;">Cargos</th>
                            <th style="padding:8px; text-align:center;">Efetivo Ativo Hoje</th>
                            <th style="padding:8px;">Status no Inventário de Riscos</th>
                            <th style="padding:8px; text-align:center;">Vínculo de CAs (NR-06)</th>
                            <th style="padding:8px; text-align:center;">Fatores Psicossociais</th>
                            <th style="padding:8px; text-align:right;">Acesso Direto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasResumoGhesHtml || '<tr><td colspan="8" style="padding:14px; text-align:center; color:#b45309; font-weight:600;">⚠️ Não foi possível verificar: catálogo de GHEs (<code>ghe_catalogo</code>) ainda não carregado em memória ou indisponível.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;

    container.innerHTML = blocoFormularioHtml + blocoAuditoriaHtml;
    if (pgrDocBaseLoaded && !pgrDocBaseLoading) {
        atualizarIndicadorDirtyPgrDocBase();
    }
}
