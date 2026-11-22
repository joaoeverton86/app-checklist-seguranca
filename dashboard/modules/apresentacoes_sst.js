/**
 * ============================================================================
 * MÓDULO: APRESENTAÇÕES SST & EVOLUÇÃO DO CONHECIMENTO DA OBRA (Fase 1)
 * Arquivo: dashboard/modules/apresentacoes_sst.js
 * ============================================================================
 * Governança Técnica (AGENTS.md & GEMINI.md):
 * - Armazenamento local transacional isolado por conta/sessão (`sst_apresentacoes_v1_`),
 *   com limite de 20 apresentações e 220 KB UTF-8, sem escrita em Supabase/Storage,
 *   sem tabela de configurações genérica e sem impacto no PWA de campo.
 * - Comunicação real e auditável entre módulos por vínculo explícito e contratos
 *   somente leitura (`allTreinamentosCatalogo`, `allGheCatalogo` com `riscos[]`,
 *   `allAprModelos`, `allAprRegistros`, `obterEstadoIaAprendizadoSomenteLeitura` e
 *   `obterEstadoMapaMentalIa`), sem disparar carregadores com efeito colateral na UI.
 * - Preservação imutável de revisões aprovadas (`revisoes_aprovadas[]`): qualquer
 *   alteração em apresentação homologada salva automaticamente o snapshot completo
 *   da revisão aprovada anterior e abre nova revisão editorial sem apagar o original.
 * - Piloto NR-35 sem texto normativo fabricado e sem fallback arbitrário: vincula
 *   apenas fontes compatíveis com NR-35/Trabalho em Altura (ou selecionadas
 *   explicitamente por João) e marca slides esqueleto como `RASCUNHO_PENDENTE_REVISAO`.
 * - Rastreabilidade por slide (`hash_no_momento_da_citacao` vs `hash_canonico_capturado`):
 *   atualizar snapshot de uma fonte exige revisão individual de cada slide dependente.
 * - Controle de concorrência (`versaoEsperada`) em todas as mutações (apresentação,
 *   slide, fontes, evolução e importação externa).
 * - Molde Visual Institucional Fixo 16:9 em HTML/CSS puro (composição visual distinta
 *   para os 4 layouts, tela cheia `requestFullscreen`, teclado `ArrowLeft`/`ArrowRight`
 *   e impressão A4 Paisagem / Guia do Instrutor via `abrirDocumentoHtmlParaImpressao`).
 * ============================================================================
 */
(function (window) {
    'use strict';

    var STORAGE_PREFIX_APRES = 'sst_apresentacoes_v1_';
    var FORMATO_BACKUP_APRES = 'apresentacoes_sst_backup_v1';
    var VERSAO_ESQUEMA_APRES = 1;
    var LIMITE_MAX_APRESENTACOES = 20;
    var LIMITE_MAX_SLIDES_POR_APRES = 40;
    var LIMITE_MAX_FONTES_POR_APRES = 40;
    var LIMITE_MAX_REVISOES_APROVADAS = 10;
    var LIMITE_BYTES_STORAGE_APRES = 220 * 1024;
    var LIMITE_BYTES_IMPORT_JSON_APRES = 35 * 1024;

    var STATUS_APRESENTACAO = ['RASCUNHO', 'EM_REVISAO', 'APROVADO_ENGENHARIA', 'OBSOLETO'];
    var STATUS_REVISAO_SLIDE = [
        'RASCUNHO_PENDENTE_REVISAO',
        'REVISADO_ENGENHARIA',
        'RASCUNHO_EXTERNO_PENDENTE',
        'PRECISA_REVISAO_FONTE'
    ];
    var TIPOS_FONTE_SUPORTADOS = [
        'catalogo',
        'ghe',
        'apr_modelo',
        'apr_registro',
        'cenario',
        'regra',
        'mapa',
        'decisao_mapa',
        'fonte_colada'
    ];
    var LAYOUTS_SLIDE_SUPORTADOS = [
        'PADRAO_TOPICOS',
        'APLICACAO_OBRA_FUNCAO',
        'DEBATE_CASO_REAL',
        'SINTESE_NORMATIVA'
    ];

    var estadoApres = {
        identidadeChave: null,
        geracaoSessaoId: 0,
        abaAtiva: 'editor', // 'editor' | 'fontes_evolucao' | 'projetor' | 'ponte_ia'
        apresentacaoSelecionadaId: '',
        slideSelecionadoId: '',
        revisaoHistoricaVisualizadaId: '', // Permite consultar snapshot imutável de versão aprovada anterior
        mostrarNotaInstrutorProjetor: true,
        apenasFontesValidadasNoPacote: false,
        filtroIndicadorEvolucao: 'TODOS',
        formApresentacaoAberto: null, // null | { modo: 'novo'|'editar', id?: string, versaoEsperada?: number }
        formSlideAberto: null, // null | { modo: 'novo'|'editar', slideId?: string, versaoEsperada?: number, rascunho?: object }
        textoImportIaDraft: '',
        previaImportIa: null,
        boxBackupAberto: false,
        textoBackupDraft: '',
        previaBackup: null,
        ultimoResultadoVerificacao: null,
        cacheFontesModulos: null,
        ultimoBackupEm: '',
        alteracoesAposBackup: false,
        apresentacoes: []
    };

    var listenerTecladoInstalado = false;

    // =========================================================================
    // 1. UTILITÁRIOS DE SEGURANÇA, SANITIZAÇÃO, CLONAGEM E HASH CANÔNICO
    // =========================================================================
    function esc(valor) {
        var str = String(valor == null ? '' : valor);
        if (typeof window.escapeHTML === 'function') {
            return window.escapeHTML(str);
        }
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function limparTexto(valor, maxLen) {
        var lim = maxLen || 1200;
        return String(valor == null ? '' : valor)
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
            .replace(/<\s*\/?\s*(script|iframe|object|embed|style|link|meta)\b[^>]*>/gi, '')
            .replace(/javascript\s*:/gi, '')
            .replace(/on[a-z]+\s*=/gi, '')
            .trim()
            .slice(0, lim);
    }

    function sanitizarPadroesSensiveisRegex(texto) {
        return String(texto || '')
            .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_OMITIDO]')
            .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_OMITIDO]')
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_OMITIDO]')
            .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g, '[TELEFONE_OMITIDO]');
    }

    function clonarProfundo(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function medirBytesUtf8(texto) {
        var str = String(texto || '');
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str).length;
        }
        return unescape(encodeURIComponent(str)).length;
    }

    function gerarId(prefixo) {
        var p = String(prefixo || 'apr_sst');
        var rand = Math.random().toString(36).slice(2, 8);
        return p + '_' + Date.now().toString(36) + '_' + rand;
    }

    function normalizarChaveComparacao(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function calcularHashCanonico(objetoSemantico) {
        function canonizar(val) {
            if (val === null || val === undefined) return '';
            if (Array.isArray(val)) {
                return '[' + val.map(canonizar).join(',') + ']';
            }
            if (typeof val === 'object') {
                var chaves = Object.keys(val).sort();
                return '{' + chaves.map(function (k) {
                    return JSON.stringify(k) + ':' + canonizar(val[k]);
                }).join(',') + '}';
            }
            return JSON.stringify(String(val).trim());
        }
        var serializado = canonizar(objetoSemantico);
        var h = 0x811c9dc5;
        for (var i = 0; i < serializado.length; i++) {
            h ^= serializado.charCodeAt(i);
            h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
        }
        return 'fnv1a_' + ('00000000' + h.toString(16)).slice(-8);
    }

    function invalidarCacheFontesModulos() {
        estadoApres.cacheFontesModulos = null;
    }

    // =========================================================================
    // 2. SESSÃO, PAPÉIS E PERSISTÊNCIA TRANSACIONAL
    // =========================================================================
    function obterSessaoSegura() {
        try {
            if (typeof window.sessaoDashboardAtual === 'function') {
                return window.sessaoDashboardAtual() || null;
            }
        } catch (e) { /* ignora */ }
        return null;
    }

    function obterPapelApresentacoes() {
        var s = obterSessaoSegura();
        if (!s) return 'sem_sessao';
        try {
            if (typeof window.moduloPermitidoPainel === 'function' && !window.moduloPermitidoPainel('apresentacoes_sst')) {
                return 'sem_acesso';
            }
        } catch (e) { /* continua */ }

        var podeGravar = false;
        try {
            if (typeof window.usuarioPodeGravarModulo === 'function') {
                podeGravar = !!window.usuarioPodeGravarModulo('apresentacoes_sst');
            } else {
                podeGravar = s.tipo !== 'painel_externo' && s.somente_leitura !== true;
            }
        } catch (e) {
            podeGravar = false;
        }
        if (!podeGravar) return 'leitor';

        var mat = String(s.matricula || '').trim().toUpperCase();
        var listaSuper = Array.isArray(window.SUPER_ADMIN_MATRICULAS) ? window.SUPER_ADMIN_MATRICULAS.map(String) : ['76'];
        var ehValidador = s.validador_ia_sst === true ||
            (s.tipo !== 'painel_externo' && mat && (mat === '76' || (listaSuper.includes(mat) && mat !== 'TESTE')));

        return ehValidador ? 'validador' : 'editor';
    }

    function obterIdentidadeSessaoChave() {
        var s = obterSessaoSegura();
        if (!s) return 'sem_sessao';
        var uid = String(s.uid || s.id || '').trim();
        var mat = String(s.matricula || '').trim();
        var tipo = String(s.tipo || 'interno').trim();
        return (tipo + '_' + (uid || 'sem_uid') + '_' + (mat || 'sem_mat')).replace(/[^a-zA-Z0-9_.-]/g, '_');
    }

    function exigirPapelMinimo(papelMinimo, acaoDescricao) {
        var papel = obterPapelApresentacoes();
        if (papel === 'sem_sessao') {
            throw new Error('Sessão não autenticada para ' + (acaoDescricao || 'executar esta operação') + '.');
        }
        if (papel === 'sem_acesso') {
            throw new Error('Seu perfil não possui acesso ao módulo Apresentações SST.');
        }
        if (papelMinimo === 'editor' && (papel !== 'editor' && papel !== 'validador')) {
            throw new Error('Acesso somente leitura: seu perfil não pode alterar apresentações SST.');
        }
        if (papelMinimo === 'validador' && papel !== 'validador') {
            throw new Error('Apenas o Validador Técnico da Engenharia SST pode homologar ou alterar o status normativo de uma apresentação.');
        }
        return papel;
    }

    function carregarEstadoPersistidoApres(chaveSessao) {
        var chaveStorage = STORAGE_PREFIX_APRES + chaveSessao;
        var salvo = null;
        try {
            var bruto = localStorage.getItem(chaveStorage);
            if (bruto) salvo = JSON.parse(bruto);
        } catch (e) { salvo = null; }

        estadoApres.apresentacoes = (salvo && Array.isArray(salvo.apresentacoes))
            ? salvo.apresentacoes.map(sanitizarApresentacaoEstrutura).filter(Boolean)
            : [];
        estadoApres.ultimoBackupEm = (salvo && typeof salvo.ultimoBackupEm === 'string') ? salvo.ultimoBackupEm : '';
        estadoApres.alteracoesAposBackup = !!(salvo && salvo.alteracoesAposBackup);

        if (!estadoApres.apresentacaoSelecionadaId || !estadoApres.apresentacoes.some(function (a) { return a.id === estadoApres.apresentacaoSelecionadaId; })) {
            estadoApres.apresentacaoSelecionadaId = estadoApres.apresentacoes[0] ? estadoApres.apresentacoes[0].id : '';
        }
        sincronizarSlideSelecionado();
    }

    function sincronizarSlideSelecionado() {
        var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
        if (!ap || !Array.isArray(ap.slides) || ap.slides.length === 0) {
            estadoApres.slideSelecionadoId = '';
            return;
        }
        if (!estadoApres.slideSelecionadoId || !ap.slides.some(function (s) { return s.id === estadoApres.slideSelecionadoId; })) {
            estadoApres.slideSelecionadoId = ap.slides[0].id;
        }
    }

    function garantirEstadoSessaoApres() {
        var chaveAtual = obterIdentidadeSessaoChave();
        if (estadoApres.identidadeChave !== chaveAtual) {
            estadoApres.identidadeChave = chaveAtual;
            estadoApres.geracaoSessaoId += 1;
            estadoApres.abaAtiva = 'editor';
            estadoApres.apresentacaoSelecionadaId = '';
            estadoApres.slideSelecionadoId = '';
            estadoApres.revisaoHistoricaVisualizadaId = '';
            estadoApres.formApresentacaoAberto = null;
            estadoApres.formSlideAberto = null;
            estadoApres.textoImportIaDraft = '';
            estadoApres.previaImportIa = null;
            estadoApres.boxBackupAberto = false;
            estadoApres.textoBackupDraft = '';
            estadoApres.previaBackup = null;
            estadoApres.ultimoResultadoVerificacao = null;
            estadoApres.cacheFontesModulos = null;
            if (chaveAtual === 'sem_sessao') {
                estadoApres.apresentacoes = [];
                estadoApres.ultimoBackupEm = '';
                estadoApres.alteracoesAposBackup = false;
            } else {
                carregarEstadoPersistidoApres(chaveAtual);
            }
        }
        return estadoApres.geracaoSessaoId;
    }

    function calcularConsumoBytesApres(listaCandidata) {
        var payload = {
            versaoEsquema: VERSAO_ESQUEMA_APRES,
            ultimoBackupEm: estadoApres.ultimoBackupEm || '',
            alteracoesAposBackup: !!estadoApres.alteracoesAposBackup,
            apresentacoes: Array.isArray(listaCandidata) ? listaCandidata : estadoApres.apresentacoes
        };
        var json = JSON.stringify(payload);
        var bytes = medirBytesUtf8(json);
        return {
            bytes: bytes,
            kb: (bytes / 1024).toFixed(1),
            limiteBytes: LIMITE_BYTES_STORAGE_APRES,
            limiteKb: (LIMITE_BYTES_STORAGE_APRES / 1024).toFixed(0),
            json: json
        };
    }

    function executarTransacaoApres(fnMutacao, opcoes) {
        garantirEstadoSessaoApres();
        var chaveSessao = estadoApres.identidadeChave;
        if (!chaveSessao || chaveSessao === 'sem_sessao') {
            throw new Error('Sessão inválida para gravar apresentações locais.');
        }
        var chaveStorage = STORAGE_PREFIX_APRES + chaveSessao;

        var snapshotMemoriaAntes = clonarProfundo({
            apresentacoes: estadoApres.apresentacoes,
            ultimoBackupEm: estadoApres.ultimoBackupEm,
            alteracoesAposBackup: estadoApres.alteracoesAposBackup,
            apresentacaoSelecionadaId: estadoApres.apresentacaoSelecionadaId,
            slideSelecionadoId: estadoApres.slideSelecionadoId
        });

        // Mapeia versões que esta instância de aba conhecia ANTES de recarregar do storage
        var versoesConhecidasNaInstancia = new Map();
        (snapshotMemoriaAntes.apresentacoes || []).forEach(function (a) {
            if (a && a.id) versoesConhecidasNaInstancia.set(String(a.id), Number(a.versao) || 1);
        });

        // Sincroniza versão mais recente do localStorage para detectar edição concorrente entre abas
        try {
            var brutoAtual = localStorage.getItem(chaveStorage);
            if (brutoAtual) {
                var parsedAtual = JSON.parse(brutoAtual);
                if (parsedAtual && Array.isArray(parsedAtual.apresentacoes)) {
                    estadoApres.apresentacoes = parsedAtual.apresentacoes.map(sanitizarApresentacaoEstrutura).filter(Boolean);
                }
            }
        } catch (e) { /* continua com memória */ }

        try {
            var resultado = fnMutacao(versoesConhecidasNaInstancia);
            if (estadoApres.apresentacoes.length > LIMITE_MAX_APRESENTACOES) {
                throw new Error('Limite máximo de ' + LIMITE_MAX_APRESENTACOES + ' apresentações locais atingido.');
            }
            if (!(opcoes && opcoes.preservarFlagBackup)) {
                estadoApres.alteracoesAposBackup = true;
            }
            var medicao = calcularConsumoBytesApres(estadoApres.apresentacoes);
            if (medicao.bytes > LIMITE_BYTES_STORAGE_APRES) {
                throw new Error('Capacidade local de Apresentações SST excedida (' + medicao.kb + ' KB > ' + medicao.limiteKb + ' KB). Exporte um backup ou remova rascunhos antigos.');
            }
            localStorage.setItem(chaveStorage, medicao.json);
            return resultado;
        } catch (err) {
            estadoApres.apresentacoes = snapshotMemoriaAntes.apresentacoes;
            estadoApres.ultimoBackupEm = snapshotMemoriaAntes.ultimoBackupEm;
            estadoApres.alteracoesAposBackup = snapshotMemoriaAntes.alteracoesAposBackup;
            estadoApres.apresentacaoSelecionadaId = snapshotMemoriaAntes.apresentacaoSelecionadaId;
            estadoApres.slideSelecionadoId = snapshotMemoriaAntes.slideSelecionadoId;
            throw err;
        }
    }

    // Verifica concorrência comparando a versão persistida no storage com:
    // 1. `versaoEsperada` explícita (capturada ao abrir formulário ou prévia); OU
    // 2. A versão que esta aba/instância tinha em memória antes de sincronizar o storage.
    function exigirApresentacaoEConcorrencia(apresentacaoId, versaoEsperadaExplicita, versoesConhecidasNaInstancia) {
        var ap = buscarApresentacaoPorId(apresentacaoId || estadoApres.apresentacaoSelecionadaId);
        if (!ap) throw new Error('Apresentação não encontrada.');
        var versaoStorage = Number(ap.versao) || 1;

        if (versaoEsperadaExplicita != null && Number(versaoEsperadaExplicita) !== versaoStorage) {
            throw new Error('Conflito de concorrência: esta apresentação foi alterada em outra aba ou janela (esperado v' + versaoEsperadaExplicita + ', atual v' + versaoStorage + '). Recarregue antes de salvar.');
        }
        if (versoesConhecidasNaInstancia && versoesConhecidasNaInstancia.has(String(ap.id))) {
            var versaoInstancia = versoesConhecidasNaInstancia.get(String(ap.id));
            if (versaoInstancia !== versaoStorage) {
                throw new Error('Conflito de concorrência entre abas: a apresentação "' + ap.codigo + '" mudou no armazenamento local (memória da aba v' + versaoInstancia + ' vs atual v' + versaoStorage + ').');
            }
        }
        return ap;
    }

    // =========================================================================
    // 3. SANITIZAÇÃO, TRANSIÇÃO IMUTÁVEL DE REVISÃO APROVADA E SNAPSHOTS
    // =========================================================================
    function sanitizarVinculoFonte(v) {
        if (!v || typeof v !== 'object') return null;
        var tipo = String(v.tipo || '').trim().toLowerCase();
        if (!TIPOS_FONTE_SUPORTADOS.includes(tipo)) return null;
        var origemId = limparTexto(v.origem_id || v.id || '', 120);
        if (!origemId) return null;

        var escopo = (v.escopo && typeof v.escopo === 'object') ? v.escopo : {};
        return {
            id_vinculo: limparTexto(v.id_vinculo || (tipo + ':' + origemId), 140),
            tipo: tipo,
            modulo_origem: limparTexto(v.modulo_origem || obterNomeModuloPorTipoFonte(tipo), 80),
            origem_id: origemId,
            titulo: limparTexto(v.titulo || origemId, 220),
            trecho_capturado: limparTexto(v.trecho_capturado || '', 2500),
            versao_origem: v.versao_origem != null ? Number(v.versao_origem) || 1 : 1,
            status_origem_na_captura: limparTexto(v.status_origem_na_captura || 'VINCULADO', 60),
            tipo_acao_origem: limparTexto(v.tipo_acao_origem || 'ORIENTACAO_POSITIVA', 60), // ORIENTACAO_POSITIVA | RESTRICAO_ESCOPO
            escopo: {
                atividade: limparTexto(escopo.atividade || '', 180),
                ghe_codigo: limparTexto(escopo.ghe_codigo || '', 60),
                funcao_ids: Array.isArray(escopo.funcao_ids) ? escopo.funcao_ids.map(function (x) { return limparTexto(x, 80); }).filter(Boolean) : [],
                funcoes_nomes: Array.isArray(escopo.funcoes_nomes) ? escopo.funcoes_nomes.map(function (x) { return limparTexto(x, 120); }).filter(Boolean) : [],
                etapa_ids: Array.isArray(escopo.etapa_ids) ? escopo.etapa_ids.map(function (x) { return limparTexto(x, 80); }).filter(Boolean) : [],
                etapas_nomes: Array.isArray(escopo.etapas_nomes) ? escopo.etapas_nomes.map(function (x) { return limparTexto(x, 120); }).filter(Boolean) : [],
                condicao_uso: limparTexto(escopo.condicao_uso || '', 240)
            },
            hash_canonico_capturado: limparTexto(v.hash_canonico_capturado || '', 64),
            esquema_snapshot: Number(v.esquema_snapshot) || 1,
            identidade_base_local: limparTexto(v.identidade_base_local || '', 120),
            capturado_em: limparTexto(v.capturado_em || new Date().toISOString(), 40),
            uso_na_aula: ['CITADO', 'PENDENTE', 'DISPENSADO_NESTA_AULA'].includes(String(v.uso_na_aula || '').toUpperCase())
                ? String(v.uso_na_aula).toUpperCase()
                : 'PENDENTE',
            justificativa_decisao: limparTexto(v.justificativa_decisao || '', 400)
        };
    }

    function sanitizarReferenciaSlide(ref) {
        if (!ref || typeof ref !== 'object') return null;
        var idVinculo = limparTexto(ref.id_vinculo || '', 140);
        if (!idVinculo) return null;
        return {
            id_vinculo: idVinculo,
            tipo: limparTexto(ref.tipo || '', 40),
            origem_id: limparTexto(ref.origem_id || '', 120),
            rotulo_curto: limparTexto(ref.rotulo_curto || idVinculo, 160),
            hash_no_momento_da_citacao: limparTexto(ref.hash_no_momento_da_citacao || '', 64)
        };
    }

    function sanitizarSlideEstrutura(s, idx) {
        if (!s || typeof s !== 'object') return null;
        var titulo = limparTexto(s.titulo || ('Slide ' + ((idx || 0) + 1)), 200);
        var layout = LAYOUTS_SLIDE_SUPORTADOS.includes(String(s.layout || '').toUpperCase())
            ? String(s.layout).toUpperCase()
            : 'PADRAO_TOPICOS';
        var topicos = Array.isArray(s.topicos)
            ? s.topicos.map(function (t) { return limparTexto(t, 400); }).filter(Boolean).slice(0, 10)
            : [];
        var refs = Array.isArray(s.referencias)
            ? s.referencias.map(sanitizarReferenciaSlide).filter(Boolean).slice(0, 15)
            : [];

        // P1-B / Bloqueio 1 Grok: status desconhecido ou omisso NUNCA se torna REVISADO_ENGENHARIA sozinho!
        var stRev = String(s.status_revisao_slide || '').toUpperCase();
        var statusRevisao = STATUS_REVISAO_SLIDE.includes(stRev)
            ? stRev
            : 'RASCUNHO_PENDENTE_REVISAO';

        return {
            id: limparTexto(s.id || gerarId('slide'), 80),
            ordem: typeof s.ordem === 'number' ? s.ordem : ((idx || 0) + 1),
            layout: layout,
            secao_norma: limparTexto(s.secao_norma || '', 140),
            titulo: titulo,
            objetivo_didatico: limparTexto(s.objetivo_didatico || '', 320),
            topicos: topicos,
            aplicacao_obra_funcao: limparTexto(s.aplicacao_obra_funcao || '', 900),
            caso_real_obra: limparTexto(s.caso_real_obra || '', 700),
            pergunta_debate: limparTexto(s.pergunta_debate || '', 450),
            nota_instrutor: limparTexto(s.nota_instrutor || '', 1400),
            referencias: refs,
            origem_geracao: ['MANUAL_ENGENHARIA', 'COMPOSITOR_FONTES_LOCAL', 'EXTERNO_IMPORTADO_RASCUNHO', 'MOLDE_PILOTO_RASCUNHO'].includes(String(s.origem_geracao || '').toUpperCase())
                ? String(s.origem_geracao).toUpperCase()
                : 'MANUAL_ENGENHARIA',
            status_revisao_slide: statusRevisao,
            editado_manual: s.editado_manual === true
        };
    }

    function sanitizarSnapshotRevisaoAprovada(rev) {
        if (!rev || typeof rev !== 'object') return null;
        return {
            revisao_id: limparTexto(rev.revisao_id || 'R1', 40),
            versao_concorrencia_na_aprovacao: Number(rev.versao_concorrencia_na_aprovacao) || 1,
            norma_referencia: limparTexto(rev.norma_referencia || '', 80),
            titulo: limparTexto(rev.titulo || '', 220),
            publico_alvo: limparTexto(rev.publico_alvo || '', 260),
            carga_horaria: limparTexto(rev.carga_horaria || '', 60),
            frente_obra: limparTexto(rev.frente_obra || '', 200),
            responsavel_tecnico: limparTexto(rev.responsavel_tecnico || '', 180),
            aprovado_em: limparTexto(rev.aprovado_em || '', 40),
            aprovado_por: limparTexto(rev.aprovado_por || '', 120),
            fontes_vinculadas: Array.isArray(rev.fontes_vinculadas)
                ? rev.fontes_vinculadas.map(sanitizarVinculoFonte).filter(Boolean)
                : [],
            slides: Array.isArray(rev.slides)
                ? rev.slides.map(sanitizarSlideEstrutura).filter(Boolean)
                : []
        };
    }

    function sanitizarApresentacaoEstrutura(ap) {
        if (!ap || typeof ap !== 'object') return null;
        var titulo = limparTexto(ap.titulo || '', 220);
        if (!titulo) return null;
        var status = STATUS_APRESENTACAO.includes(String(ap.status || '').toUpperCase())
            ? String(ap.status).toUpperCase()
            : 'RASCUNHO';

        var slides = Array.isArray(ap.slides)
            ? ap.slides.map(sanitizarSlideEstrutura).filter(Boolean).slice(0, LIMITE_MAX_SLIDES_POR_APRES)
            : [];
        slides.forEach(function (sl, i) { sl.ordem = i + 1; });

        var fontes = Array.isArray(ap.fontes_vinculadas)
            ? ap.fontes_vinculadas.map(sanitizarVinculoFonte).filter(Boolean).slice(0, LIMITE_MAX_FONTES_POR_APRES)
            : [];

        var revisoesAprovadas = Array.isArray(ap.revisoes_aprovadas)
            ? ap.revisoes_aprovadas.map(sanitizarSnapshotRevisaoAprovada).filter(Boolean)
            : [];

        var decisoesEvolucao = Array.isArray(ap.historico_evolucao)
            ? ap.historico_evolucao.slice(0, 80).map(function (h) {
                return {
                    id: limparTexto(h && h.id || gerarId('evo'), 80),
                    data: limparTexto(h && h.data || '', 40),
                    acao: limparTexto(h && h.acao || '', 60),
                    id_vinculo: limparTexto(h && h.id_vinculo || '', 140),
                    slide_id: limparTexto(h && h.slide_id || '', 80),
                    resumo: limparTexto(h && h.resumo || '', 400),
                    responsavel: limparTexto(h && h.responsavel || '', 120)
                };
            })
            : [];

        var numRev = Math.max(1, Number(ap.numero_revisao_editorial) || 1);

        return {
            id: limparTexto(ap.id || gerarId('apres'), 80),
            codigo: limparTexto(ap.codigo || 'AULA-SST-01', 40),
            versao: Math.max(1, Number(ap.versao) || 1), // Contador estrito de concorrência otimista
            numero_revisao_editorial: numRev, // Contador de revisões editoriais (R1, R2...)
            revisao_id: limparTexto(ap.revisao_id || ('R' + numRev), 40),
            status: status,
            norma_referencia: limparTexto(ap.norma_referencia || 'NR-35', 80),
            titulo: titulo,
            publico_alvo: limparTexto(ap.publico_alvo || '', 260),
            carga_horaria: limparTexto(ap.carga_horaria || '', 60),
            frente_obra: limparTexto(ap.frente_obra || 'Consórcio Operador — PISF Ramal do Agreste', 200),
            responsavel_tecnico: limparTexto(ap.responsavel_tecnico || 'Engenharia de Segurança do Trabalho', 180),
            curso_catalogo_id: limparTexto(ap.curso_catalogo_id || '', 80),
            cenario_ia_id: limparTexto(ap.cenario_ia_id || '', 80),
            mapa_mental_id: limparTexto(ap.mapa_mental_id || '', 80),
            fontes_vinculadas: fontes,
            slides: slides,
            revisoes_aprovadas: revisoesAprovadas,
            historico_evolucao: decisoesEvolucao,
            aprovado_em: status === 'APROVADO_ENGENHARIA' ? limparTexto(ap.aprovado_em || '', 40) : '',
            aprovado_por: status === 'APROVADO_ENGENHARIA' ? limparTexto(ap.aprovado_por || '', 120) : '',
            ultima_revisao_aprovada_id: limparTexto(ap.ultima_revisao_aprovada_id || (revisoesAprovadas[0] ? revisoesAprovadas[0].revisao_id : ''), 40),
            atualizado_em: limparTexto(ap.atualizado_em || new Date().toISOString(), 40)
        };
    }

    // P1-A / Ponto 4 Grok:
    // Sempre que uma apresentação APROVADO_ENGENHARIA sofre qualquer mutação (metadados, slide,
    // vínculo/remoção de fonte, dispensa, evolução, composição ou importação):
    // 1. Garante que o snapshot integral da revisão aprovada (com slides, fontes, aprovado_por, aprovado_em)
    //    esteja preservado de forma imutável em `ap.revisoes_aprovadas`;
    // 2. Incrementa `numero_revisao_editorial` / `revisao_id` (ex.: R1 -> R2);
    // 3. Muda `status` para `EM_REVISAO` e limpa `aprovado_por` e `aprovado_em` da revisão de trabalho,
    //    para que o conteúdo modificado jamais herde o carimbo de aprovação anterior;
    // 4. Registra a abertura da revisão no `historico_evolucao`.
    function preservarSnapshotAprovadoSeNecessario(ap, motivoMutacao) {
        if (!ap || ap.status !== 'APROVADO_ENGENHARIA') return false;
        if (!Array.isArray(ap.revisoes_aprovadas)) ap.revisoes_aprovadas = [];

        var revIdAnterior = ap.revisao_id || ('R' + (ap.numero_revisao_editorial || 1));
        var jaSalvo = ap.revisoes_aprovadas.some(function (r) { return r.revisao_id === revIdAnterior; });
        if (!jaSalvo) {
            if (ap.revisoes_aprovadas.length >= LIMITE_MAX_REVISOES_APROVADAS) {
                throw new Error('Limite de ' + LIMITE_MAX_REVISOES_APROVADAS + ' revisões homologadas preservadas atingido nesta apresentação. Exporte o backup completo (.json) das revisões homologadas antes de abrir uma nova revisão.');
            }
            ap.revisoes_aprovadas.unshift(sanitizarSnapshotRevisaoAprovada({
                revisao_id: revIdAnterior,
                versao_concorrencia_na_aprovacao: ap.versao,
                norma_referencia: ap.norma_referencia,
                titulo: ap.titulo,
                publico_alvo: ap.publico_alvo,
                carga_horaria: ap.carga_horaria,
                frente_obra: ap.frente_obra,
                responsavel_tecnico: ap.responsavel_tecnico,
                aprovado_em: ap.aprovado_em,
                aprovado_por: ap.aprovado_por,
                fontes_vinculadas: clonarProfundo(ap.fontes_vinculadas),
                slides: clonarProfundo(ap.slides)
            }));
        }

        ap.ultima_revisao_aprovada_id = revIdAnterior;
        ap.numero_revisao_editorial = (Number(ap.numero_revisao_editorial) || 1) + 1;
        ap.revisao_id = 'R' + ap.numero_revisao_editorial;
        ap.status = 'EM_REVISAO';
        ap.aprovado_em = '';
        ap.aprovado_por = '';

        var sessao = obterSessaoSegura();
        var responsavel = limparTexto((sessao && (sessao.nome || sessao.matricula)) || 'Engenharia SST', 120);
        if (!Array.isArray(ap.historico_evolucao)) ap.historico_evolucao = [];
        ap.historico_evolucao.unshift({
            id: gerarId('evo'),
            data: new Date().toISOString(),
            acao: 'ABERTURA_NOVA_REVISAO',
            id_vinculo: '',
            slide_id: '',
            resumo: 'Revisão aprovada ' + revIdAnterior + ' preservada intacta no histórico/backup. Aberta nova revisão ' + ap.revisao_id + ' (' + limparTexto(motivoMutacao || 'edição', 140) + ').',
            responsavel: responsavel
        });
        return true;
    }

    function obterNomeModuloPorTipoFonte(tipo) {
        var mapa = {
            catalogo: 'Treinamentos & DDSMA (Catálogo)',
            ghe: 'GHE & Ordem de Serviço (NR-01)',
            apr_modelo: 'APR — Modelos da Obra',
            apr_registro: 'APR — Registros Emitidos',
            cenario: 'Inteligência SST — Cenário Operacional',
            regra: 'Inteligência SST — Regra Aprovada da Engenharia',
            mapa: 'Mapa Mental SST — Estrutura Função × Etapa',
            decisao_mapa: 'Mapa Mental SST — Decisão Técnica Validada',
            fonte_colada: 'Caderno Normativo / Procedimento do Tema'
        };
        return mapa[tipo] || 'Fonte SST';
    }

    function buscarApresentacaoPorId(id) {
        if (!id) return null;
        return estadoApres.apresentacoes.find(function (a) { return String(a.id) === String(id); }) || null;
    }

    // =========================================================================
    // 4. CONECTOR SOMENTE LEITURA ENTRE MÓDULOS (P1-C CORRIGIDO: LÊ GHE COM RISCOS[])
    // =========================================================================
    function extrairDadosReaisGheParaFonte(g) {
        if (!g || typeof g !== 'object') return null;
        var cod = limparTexto(g.id || g.codigo || g.ghe_codigo || '', 60);
        if (!cod) return null;
        var nome = limparTexto(g.nome || g.titulo || g.setor || cod, 180);
        var cargosArr = Array.isArray(g.cargos)
            ? g.cargos.map(function (c) { return limparTexto(c, 80); }).filter(Boolean)
            : (g.cargos || g.funcoes ? String(g.cargos || g.funcoes).split(',').map(function (c) { return limparTexto(c, 80); }).filter(Boolean) : []);

        var agentesSet = new Set();
        var episSet = new Set();
        var epcsSet = new Set();
        var riscosEstruturados = [];

        // Esquema real de ghe_os.js: g.riscos[] com agente, tipo_agente, fonte_geradora, epi_recomendado, epis_recomendados, epcs_recomendados, medidas_controle, epis[]
        if (Array.isArray(g.riscos)) {
            g.riscos.forEach(function (r) {
                if (!r || typeof r !== 'object') return;
                var ag = limparTexto(r.agente || r.perigo || r.fator_risco || '', 140);
                var tipoAg = limparTexto(r.tipo_agente || '', 60);
                var fonteGer = limparTexto(r.fonte_geradora || '', 140);
                var epiRec = limparTexto(r.epi_recomendado || r.epis_recomendados || '', 200);
                var epcRec = limparTexto(r.epcs_recomendados || r.epc_recomendado || '', 200);
                var medCtrl = limparTexto(r.medidas_controle || '', 240);
                var listaEpis = Array.isArray(r.epis)
                    ? r.epis.map(function (e) { return limparTexto(typeof e === 'object' ? (e.nome || e.descricao || e.ca || '') : e, 100); }).filter(Boolean)
                    : [];

                if (ag) agentesSet.add(tipoAg ? (tipoAg + ': ' + ag) : ag);
                if (epiRec) episSet.add(epiRec);
                listaEpis.forEach(function (e) { episSet.add(e); });
                if (epcRec) epcsSet.add(epcRec);

                riscosEstruturados.push({
                    tipo_agente: tipoAg,
                    agente: ag,
                    fonte_geradora: fonteGer,
                    epi_recomendado: epiRec,
                    epis_lista: listaEpis,
                    epcs_recomendados: epcRec,
                    medidas_controle: medCtrl,
                    probabilidade: String(r.probabilidade || ''),
                    severidade: String(r.severidade || '')
                });
            });
        }

        // Também suporta propriedades diretas agentes_risco / epis
        if (Array.isArray(g.agentes_risco)) {
            g.agentes_risco.forEach(function (a) { var l = limparTexto(a, 140); if (l) agentesSet.add(l); });
        } else if (typeof g.agentes_risco === 'string' && g.agentes_risco.trim()) {
            agentesSet.add(limparTexto(g.agentes_risco, 300));
        }

        if (Array.isArray(g.epis)) {
            g.epis.forEach(function (e) { var l = limparTexto(e, 140); if (l) episSet.add(l); });
        } else if (typeof g.epis === 'string' && g.epis.trim()) {
            episSet.add(limparTexto(g.epis, 300));
        }

        var agentesTxt = Array.from(agentesSet).join('; ');
        var episTxt = Array.from(episSet).join(', ');
        var epcsTxt = Array.from(epcsSet).join(', ');

        return {
            cod: cod,
            nome: nome,
            cargosArr: cargosArr,
            cargosTxt: cargosArr.join(', '),
            agentesTxt: agentesTxt,
            episTxt: episTxt,
            epcsTxt: epcsTxt,
            riscosEstruturados: riscosEstruturados
        };
    }

    function lerFontesDisponiveisNosModulos() {
        var identidadeLocal = obterIdentidadeSessaoChave();

        // 1. Catálogo de Treinamentos (somente leitura de allTreinamentosCatalogo)
        var temVarCatalogo = Array.isArray(window.allTreinamentosCatalogo);
        var catalogoBruto = temVarCatalogo ? window.allTreinamentosCatalogo : [];
        var catalogo = catalogoBruto.map(function (c) {
            if (!c || (c.id == null && !c.codigo)) return null;
            var id = String(c.id != null ? c.id : c.codigo);
            var nome = limparTexto(c.nome || c.titulo || ('Curso ' + id), 200);
            var carga = limparTexto(c.carga_horaria != null ? String(c.carga_horaria) + 'h' : '', 40);
            var conteudo = limparTexto(c.conteudo_programatico || c.descricao || c.objetivo || ('Capacitação em ' + nome + (carga ? ' (' + carga + ')' : '')), 1800);
            var objSem = {
                tipo: 'catalogo',
                id: id,
                nome: nome,
                carga_horaria: carga,
                meses_validade: String(c.meses_validade || ''),
                conteudo_programatico: conteudo
            };
            return {
                tipo: 'catalogo',
                origem_id: id,
                titulo: 'Catálogo: ' + nome + (carga ? ' (' + carga + ')' : ''),
                trecho_capturado: conteudo,
                versao_origem: Number(c.versao) || 1,
                status_origem: 'ATIVO_CATALOGO',
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: { atividade: nome, ghe_codigo: '', funcao_ids: [], funcoes_nomes: [], etapa_ids: [], etapas_nomes: [], condicao_uso: '' },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: identidadeLocal
            };
        }).filter(Boolean);

        // 2. GHE / Ordem de Serviço (P1-C corrigido: lê diretamente de window.allGheCatalogo preservando g.riscos[], agentes e EPIs!)
        var temVarGhe = Array.isArray(window.allGheCatalogo);
        var gheBruto = temVarGhe ? clonarProfundo(window.allGheCatalogo) : [];
        var ghes = gheBruto.map(function (g) {
            var info = extrairDadosReaisGheParaFonte(g);
            if (!info) return null;
            var trecho = 'GHE ' + info.cod + ' (' + info.nome + ') — Funções: ' + (info.cargosTxt || 'Não especificado') +
                ' | Riscos/Agentes: ' + (info.agentesTxt || 'Nenhum agente listado') +
                ' | EPIs Recomendados: ' + (info.episTxt || 'Nenhum EPI listado') +
                (info.epcsTxt ? ' | EPCs: ' + info.epcsTxt : '');
            var objSem = {
                tipo: 'ghe',
                codigo: info.cod,
                nome: info.nome,
                cargos: info.cargosArr,
                agentes: info.agentesTxt,
                epis: info.episTxt,
                epcs: info.epcsTxt,
                riscos: info.riscosEstruturados
            };
            return {
                tipo: 'ghe',
                origem_id: info.cod,
                titulo: 'GHE ' + info.cod + ' — ' + info.nome,
                trecho_capturado: limparTexto(trecho, 1800),
                versao_origem: Number(g.versao) || 1,
                status_origem: 'CATALOGO_GHE',
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: {
                    atividade: info.nome,
                    ghe_codigo: info.cod,
                    funcao_ids: [],
                    funcoes_nomes: info.cargosArr,
                    etapa_ids: [],
                    etapas_nomes: [],
                    condicao_uso: ''
                },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: identidadeLocal
            };
        }).filter(Boolean);

        // 3. APR Modelos e Registros (somente leitura de allAprModelos e allAprRegistros em memória)
        var modelosAprBruto = Array.isArray(window.allAprModelos) ? window.allAprModelos : [];
        var aprModelos = modelosAprBruto.map(function (m) {
            if (!m || m.id == null) return null;
            var id = String(m.id);
            var titulo = limparTexto(m.titulo || m.nome || ('Modelo APR ' + id), 200);
            var riscos = Array.isArray(m.riscos) ? m.riscos : [];
            var resumoRiscos = riscos.slice(0, 8).map(function (r) {
                return limparTexto((r.passo_tarefa || 'Etapa') + ': ' + (r.perigo_fonte || 'Perigo') + ' -> ' + (r.medidas_prevencao || 'Controle'), 260);
            }).join(' | ');
            var objSem = {
                tipo: 'apr_modelo',
                id: id,
                titulo: titulo,
                riscos: riscos.map(function (r) {
                    return {
                        passo: limparTexto(r && r.passo_tarefa || '', 180),
                        perigo: limparTexto(r && r.perigo_fonte || '', 180),
                        evento: limparTexto(r && r.evento_risco || '', 180),
                        medidas: limparTexto(r && r.medidas_prevencao || '', 300)
                    };
                })
            };
            return {
                tipo: 'apr_modelo',
                origem_id: id,
                titulo: 'Modelo APR #' + id + ' — ' + titulo,
                trecho_capturado: limparTexto(resumoRiscos || ('Modelo de APR: ' + titulo), 1800),
                versao_origem: Number(m.versao) || 1,
                status_origem: 'MODELO_APR',
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: { atividade: titulo, ghe_codigo: '', funcao_ids: [], funcoes_nomes: [], etapa_ids: [], etapas_nomes: [], condicao_uso: '' },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: identidadeLocal
            };
        }).filter(Boolean);

        var registrosAprBruto = Array.isArray(window.allAprRegistros) ? window.allAprRegistros : [];
        var aprRegistros = registrosAprBruto.map(function (a) {
            if (!a || a.id == null) return null;
            var id = String(a.id);
            var titulo = limparTexto(a.titulo || a.descricao_atividade || ('APR Nº ' + id), 200);
            var local = limparTexto(a.local_setor || a.frente_trabalho || '', 140);
            var riscos = Array.isArray(a.riscos) ? a.riscos : [];
            var resumoRiscos = riscos.slice(0, 8).map(function (r) {
                return limparTexto((r.passo_tarefa || 'Etapa') + ': ' + (r.perigo_fonte || 'Perigo') + ' -> ' + (r.medidas_prevencao || 'Controle'), 260);
            }).join(' | ');
            var objSem = {
                tipo: 'apr_registro',
                id: id,
                titulo: titulo,
                local: local,
                riscos: riscos.map(function (r) {
                    return {
                        passo: limparTexto(r && r.passo_tarefa || '', 180),
                        perigo: limparTexto(r && r.perigo_fonte || '', 180),
                        medidas: limparTexto(r && r.medidas_prevencao || '', 300)
                    };
                })
            };
            return {
                tipo: 'apr_registro',
                origem_id: id,
                titulo: 'APR Emitida Nº ' + id + ' — ' + titulo + (local ? ' (' + local + ')' : ''),
                trecho_capturado: limparTexto(resumoRiscos || ('APR Nº ' + id + ': ' + titulo), 1800),
                versao_origem: Number(a.versao) || 1,
                status_origem: limparTexto(a.status || 'EMITIDA', 40),
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: { atividade: titulo, ghe_codigo: '', funcao_ids: [], funcoes_nomes: [], etapa_ids: [], etapas_nomes: [], condicao_uso: '' },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: identidadeLocal
            };
        }).filter(Boolean);

        // 4. Inteligência SST — Cenários e Regras Aprovadas
        var estadoIa = (typeof window.obterEstadoIaAprendizadoSomenteLeitura === 'function')
            ? window.obterEstadoIaAprendizadoSomenteLeitura()
            : { contextos: [], regrasAprendidas: [], sugestoesFila: [] };

        var cenarios = (Array.isArray(estadoIa.contextos) ? estadoIa.contextos : []).map(function (c) {
            if (!c || !c.id) return null;
            var id = String(c.id);
            var statusCen = limparTexto(c.status_cenario || 'RASCUNHO_NAO_APROVADO', 60);
            var fases = (c.fases_operacionais && typeof c.fases_operacionais === 'object') ? c.fases_operacionais : {};
            var resumoFases = Object.keys(fases).sort().map(function (k) {
                return fases[k] ? (k + ': ' + fases[k]) : '';
            }).filter(Boolean).join(' | ');
            var trecho = 'Cenário ' + (c.cargo_equipe || id) + ' (' + (c.frente_servico || 'Frente geral') + ')' +
                (c.rotina_detalhada ? ' — Rotina: ' + c.rotina_detalhada : '') +
                (resumoFases ? ' | Fases: ' + resumoFases : '') +
                (Array.isArray(c.perigos_observados) && c.perigos_observados.length ? ' | Perigos: ' + c.perigos_observados.join(', ') : '') +
                (c.regras_engenheiro ? ' | Diretrizes: ' + c.regras_engenheiro : '');
            var objSem = {
                tipo: 'cenario',
                id: id,
                status: statusCen,
                cargo_equipe: c.cargo_equipe || '',
                ghe_codigo: c.ghe_codigo || '',
                frente_servico: c.frente_servico || '',
                rotina_detalhada: c.rotina_detalhada || '',
                fases_operacionais: fases,
                ferramentas_reais: c.ferramentas_reais || [],
                perigos_observados: c.perigos_observados || [],
                epis_validados: c.epis_validados || [],
                regras_engenheiro: c.regras_engenheiro || ''
            };
            return {
                tipo: 'cenario',
                origem_id: id,
                titulo: 'Cenário IA [' + statusCen + ']: ' + limparTexto(c.cargo_equipe || id, 140) + ' — ' + limparTexto(c.frente_servico || '', 100),
                trecho_capturado: limparTexto(trecho, 2000),
                versao_origem: Number(c.versao) || 1,
                status_origem: statusCen,
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: {
                    atividade: limparTexto(c.frente_servico || c.cargo_equipe || '', 160),
                    ghe_codigo: limparTexto(c.ghe_codigo || '', 60),
                    funcao_ids: [],
                    funcoes_nomes: [limparTexto(c.cargo_equipe || '', 120)].filter(Boolean),
                    etapa_ids: [],
                    etapas_nomes: [],
                    condicao_uso: ''
                },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: estadoIa.identidadeChave || identidadeLocal
            };
        }).filter(Boolean);

        var regras = (Array.isArray(estadoIa.regrasAprendidas) ? estadoIa.regrasAprendidas : []).map(function (r) {
            if (!r || !r.id) return null;
            var id = String(r.id);
            var statusRegra = (r.ativo === true && r.status_regra === 'APROVADO') ? 'APROVADO' : String(r.status_regra || 'REVOGADO');
            var trecho = 'Passo/Etapa: ' + (r.passo_tarefa || '-') +
                ' | Perigo: ' + (r.perigo_fonte || '-') +
                (r.evento_risco ? ' | Evento: ' + r.evento_risco : '') +
                (r.danos_provaveis ? ' | Danos: ' + r.danos_provaveis : '') +
                ' | Controle Aprovado pela Engenharia: ' + (r.medidas_prevencao || '-') +
                (r.fonte_consultada ? ' [Fonte: ' + r.fonte_consultada + ']' : '');
            var objSem = {
                tipo: 'regra',
                id: id,
                status_regra: statusRegra,
                ativo: !!r.ativo,
                contexto_aplicavel_id: r.contexto_aplicavel_id || '',
                passo_tarefa: r.passo_tarefa || '',
                perigo_fonte: r.perigo_fonte || '',
                evento_risco: r.evento_risco || '',
                danos_provaveis: r.danos_provaveis || '',
                medidas_prevencao: r.medidas_prevencao || '',
                fonte_consultada: r.fonte_consultada || ''
            };
            return {
                tipo: 'regra',
                origem_id: id,
                contexto_aplicavel_id: String(r.contexto_aplicavel_id || ''),
                titulo: 'Regra Engenharia [' + statusRegra + ']: ' + limparTexto((r.passo_tarefa || '') + ' — ' + (r.perigo_fonte || ''), 160),
                trecho_capturado: limparTexto(trecho, 1800),
                versao_origem: Number(r.versao) || 1,
                status_origem: statusRegra,
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: {
                    atividade: limparTexto(r.passo_tarefa || '', 160),
                    ghe_codigo: '',
                    funcao_ids: [],
                    funcoes_nomes: [],
                    etapa_ids: [],
                    etapas_nomes: [limparTexto(r.passo_tarefa || '', 120)].filter(Boolean),
                    condicao_uso: ''
                },
                hash_canonico: calcularHashCanonico(objSem),
                identidade_base_local: estadoIa.identidadeChave || identidadeLocal
            };
        }).filter(Boolean);

        // 5. Mapa Mental SST — Mapas e Decisões Confirmadas por Função × Etapa
        var estadoMm = (typeof window.obterEstadoMapaMentalIa === 'function')
            ? window.obterEstadoMapaMentalIa()
            : { mapas: [] };

        var mapas = [];
        var decisoesMapa = [];

        (Array.isArray(estadoMm.mapas) ? estadoMm.mapas : []).forEach(function (m) {
            if (!m || !m.id) return;
            var mapaId = String(m.id);
            var funcoesMapa = Array.isArray(m.funcoes) ? m.funcoes : [];
            var etapasMapa = Array.isArray(m.etapas) ? m.etapas : [];
            var perigosMapa = Array.isArray(m.perigos) ? m.perigos : [];
            var episMapa = Array.isArray(m.epis) ? m.epis : [];

            function resolverNomesFuncoes(ids) {
                if (!Array.isArray(ids)) return [];
                return ids.map(function (fid) {
                    var f = funcoesMapa.find(function (x) { return x.id === fid; });
                    return f ? f.nome : fid;
                }).filter(Boolean);
            }
            function resolverNomesEtapas(ids) {
                if (!Array.isArray(ids)) return [];
                return ids.map(function (eid) {
                    var e = etapasMapa.find(function (x) { return x.id === eid; });
                    return e ? e.nome : eid;
                }).filter(Boolean);
            }

            var perigosConfirmados = perigosMapa.filter(function (p) { return p && p.status === 'CONFIRMADO'; });
            var episConfirmados = episMapa.filter(function (e) { return e && e.status === 'CONFIRMADO'; });

            var resumoMapa = 'Mapa Mental ' + (m.atividade || mapaId) + ' (' + (m.frente_local || 'Obra') + ')' +
                ' — Funções: ' + (funcoesMapa.map(function (f) { return f.nome; }).join(', ') || '-') +
                ' | Etapas: ' + (etapasMapa.map(function (e) { return e.nome; }).join(' -> ') || '-') +
                ' | Perigos confirmados (' + perigosConfirmados.length + '): ' +
                perigosConfirmados.map(function (p) {
                    var fnNomes = resolverNomesFuncoes(p.funcao_ids).join(', ') || 'Todas';
                    var etNomes = resolverNomesEtapas(p.etapa_ids).join(', ') || 'Geral';
                    return p.perigo_fonte + ' [Funções: ' + fnNomes + ' | Etapas: ' + etNomes + ']';
                }).join('; ');

            var objSemMapa = {
                tipo: 'mapa',
                id: mapaId,
                atividade: m.atividade || '',
                frente_local: m.frente_local || '',
                funcoes: funcoesMapa.map(function (f) { return { id: f.id, nome: f.nome, status: f.status }; }),
                etapas: etapasMapa.map(function (e) { return { id: e.id, nome: e.nome, ordem: e.ordem, status: e.status }; }),
                perigos_confirmados: perigosConfirmados.map(function (p) {
                    return {
                        id: p.id,
                        perigo_fonte: p.perigo_fonte,
                        evento_risco: p.evento_risco,
                        danos_provaveis: p.danos_provaveis,
                        medidas_nr01: p.medidas_nr01,
                        funcao_ids: p.funcao_ids,
                        etapa_ids: p.etapa_ids
                    };
                }),
                epis_confirmados: episConfirmados.map(function (e) {
                    return {
                        id: e.id,
                        nome: e.nome,
                        categoria: e.categoria,
                        condicao_uso: e.condicao_uso,
                        status_condicao: e.status_condicao,
                        funcao_ids: e.funcao_ids,
                        etapa_ids: e.etapa_ids
                    };
                })
            };

            mapas.push({
                tipo: 'mapa',
                origem_id: mapaId,
                titulo: 'Mapa Mental: ' + limparTexto(m.atividade || mapaId, 160) + (m.frente_local ? ' (' + limparTexto(m.frente_local, 80) + ')' : ''),
                trecho_capturado: limparTexto(resumoMapa, 2200),
                versao_origem: Number(m.versao) || 1,
                status_origem: perigosConfirmados.length > 0 ? 'COM_ITENS_CONFIRMADOS' : 'EM_ELABORACAO',
                tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                escopo: {
                    atividade: limparTexto(m.atividade || '', 160),
                    ghe_codigo: '',
                    funcao_ids: funcoesMapa.map(function (f) { return f.id; }),
                    funcoes_nomes: funcoesMapa.map(function (f) { return f.nome; }),
                    etapa_ids: etapasMapa.map(function (e) { return e.id; }),
                    etapas_nomes: etapasMapa.map(function (e) { return e.nome; }),
                    condicao_uso: ''
                },
                hash_canonico: calcularHashCanonico(objSemMapa),
                identidade_base_local: estadoMm.identidadeChave || identidadeLocal
            });

            perigosConfirmados.forEach(function (p) {
                var fnNomes = resolverNomesFuncoes(p.funcao_ids);
                var etNomes = resolverNomesEtapas(p.etapa_ids);
                var med = p.medidas_nr01 || {};
                var medidasTxt = [
                    med.eliminacao_substituicao ? '1.Eliminação: ' + med.eliminacao_substituicao : '',
                    med.engenharia_epc ? '2.EPC: ' + med.engenharia_epc : '',
                    med.administrativo_organizacao ? '3.Adm: ' + med.administrativo_organizacao : '',
                    med.epi_complementar ? '4.EPI: ' + med.epi_complementar : ''
                ].filter(Boolean).join(' | ') || 'Controle em definição';

                var idDec = mapaId + '::perigo::' + p.id;
                var objSemP = {
                    tipo: 'decisao_mapa_perigo',
                    mapa_id: mapaId,
                    perigo_id: p.id,
                    status: p.status,
                    perigo_fonte: p.perigo_fonte,
                    evento_risco: p.evento_risco,
                    danos_provaveis: p.danos_provaveis,
                    medidas_nr01: med,
                    funcao_ids: p.funcao_ids || [],
                    etapa_ids: p.etapa_ids || []
                };
                decisoesMapa.push({
                    tipo: 'decisao_mapa',
                    origem_id: idDec,
                    mapa_id: mapaId,
                    titulo: 'Mapa [' + limparTexto(m.atividade, 80) + '] — Perigo Confirmado: ' + limparTexto(p.perigo_fonte, 120) +
                        ' (Funções: ' + (fnNomes.join(', ') || 'Todas') + ' | Etapas: ' + (etNomes.join(', ') || 'Geral') + ')',
                    trecho_capturado: limparTexto(
                        'Atividade: ' + (m.atividade || '') +
                        ' | Perigo: ' + p.perigo_fonte +
                        ' | Funções expostas: ' + (fnNomes.join(', ') || 'Não restrito') +
                        ' | Etapas: ' + (etNomes.join(', ') || 'Não restrito') +
                        ' | Evento/Danos: ' + (p.evento_risco || '-') + ' / ' + (p.danos_provaveis || '-') +
                        ' | Medidas NR-01: ' + medidasTxt,
                        1800
                    ),
                    versao_origem: Number(m.versao) || 1,
                    status_origem: 'CONFIRMADO',
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: {
                        atividade: limparTexto(m.atividade || '', 160),
                        ghe_codigo: '',
                        funcao_ids: Array.isArray(p.funcao_ids) ? p.funcao_ids.slice() : [],
                        funcoes_nomes: fnNomes,
                        etapa_ids: Array.isArray(p.etapa_ids) ? p.etapa_ids.slice() : [],
                        etapas_nomes: etNomes,
                        condicao_uso: ''
                    },
                    hash_canonico: calcularHashCanonico(objSemP),
                    identidade_base_local: estadoMm.identidadeChave || identidadeLocal
                });
            });

            var recs = Array.isArray(m.recomendacoes) ? m.recomendacoes : [];
            recs.forEach(function (rec) {
                if (!rec || !rec.id) return;
                var stDec = String(rec.status_decisao || '').toUpperCase();
                if (stDec !== 'ACEITA' && stDec !== 'ACEITA_COM_EDICAO') return;
                var idRec = mapaId + '::rec::' + rec.id;
                var ehRetirada = String(rec.tipo || '').toUpperCase() === 'RETIRAR';
                var ramoAlvo = rec.alvo_ramo || rec.ramo_alvo || 'GERAL';
                var funcIdsRec = Array.isArray(rec.funcao_ids_sugeridas) && rec.funcao_ids_sugeridas.length
                    ? rec.funcao_ids_sugeridas
                    : (Array.isArray(rec.funcao_ids) ? rec.funcao_ids : []);
                var etapaIdsRec = Array.isArray(rec.etapa_ids_sugeridas) && rec.etapa_ids_sugeridas.length
                    ? rec.etapa_ids_sugeridas
                    : (Array.isArray(rec.etapa_ids) ? rec.etapa_ids : []);
                var fnNomes = resolverNomesFuncoes(funcIdsRec);
                var etNomes = resolverNomesEtapas(etapaIdsRec);
                var textoFinal = rec.texto_editado || rec.valor_aplicado || rec.descricao_proposta || rec.titulo || rec.proposta_texto || '';
                var motivoDec = rec.decisao_nota || rec.justificativa || rec.motivo_decisao || '';
                var acaoOrigem = ehRetirada ? 'RESTRICAO_ESCOPO' : 'ORIENTACAO_POSITIVA';

                var objSemRec = {
                    tipo: 'decisao_mapa_rec',
                    mapa_id: mapaId,
                    rec_id: rec.id,
                    tipo_rec: rec.tipo,
                    ramo_alvo: ramoAlvo,
                    status_decisao: stDec,
                    texto_final_aplicado: textoFinal,
                    motivo_decisao: motivoDec,
                    funcao_ids: funcIdsRec,
                    etapa_ids: etapaIdsRec
                };
                decisoesMapa.push({
                    tipo: 'decisao_mapa',
                    origem_id: idRec,
                    mapa_id: mapaId,
                    titulo: 'Decisão Mapa [' + (ehRetirada ? 'RESTRIÇÃO/RETIRADA DE ESCOPO' : rec.tipo) + ' • ' + ramoAlvo + ']: ' +
                        limparTexto(textoFinal || rec.titulo || rec.id, 130),
                    trecho_capturado: limparTexto(
                        (ehRetirada
                            ? '[RESTRIÇÃO/EXCLUSÃO DE ESCOPO VALIDADA — NÃO APLICAR COMO EXIGÊNCIA PARA ESTE RECORTE] '
                            : '[DECISÃO TÉCNICA VALIDADA] ') +
                        'Atividade: ' + (m.atividade || '') +
                        ' | Ramo: ' + ramoAlvo +
                        ' | Tipo: ' + rec.tipo +
                        ' | Funções: ' + (fnNomes.join(', ') || 'Geral') +
                        ' | Etapas: ' + (etNomes.join(', ') || 'Geral') +
                        ' | Conteúdo: ' + textoFinal +
                        (motivoDec ? ' | Justificativa Engenharia: ' + motivoDec : ''),
                        1800
                    ),
                    versao_origem: Number(m.versao) || 1,
                    status_origem: stDec,
                    tipo_acao_origem: acaoOrigem,
                    escopo: {
                        atividade: limparTexto(m.atividade || '', 160),
                        ghe_codigo: '',
                        funcao_ids: funcIdsRec.slice(),
                        funcoes_nomes: fnNomes,
                        etapa_ids: etapaIdsRec.slice(),
                        etapas_nomes: etNomes,
                        condicao_uso: ''
                    },
                    hash_canonico: calcularHashCanonico(objSemRec),
                    identidade_base_local: estadoMm.identidadeChave || identidadeLocal
                });
            });
        });

        // P2: Estado explícito de disponibilidade/cache em memória (distingue flag de carregamento vs array vazio)
        var flagTreinLoaded = Boolean(window.treinamentosLoaded) || catalogo.length > 0;
        var flagGheLoaded = Boolean(window.matrizRiscoLoaded) || Boolean(window.efetivoLoaded) || ghes.length > 0;

        return {
            identidade_base_local: identidadeLocal,
            modo_leitura: 'CACHE_MEMORIA_SESSAO_ATUAL',
            lido_do_cache_em: new Date().toISOString(),
            disponibilidade_modulos: {
                catalogo_estado: flagTreinLoaded ? (catalogo.length > 0 ? 'CARREGADO_COM_DADOS' : 'CARREGADO_VAZIO') : 'NAO_CARREGADO_NA_SESSAO',
                ghe_estado: flagGheLoaded ? (ghes.length > 0 ? 'CARREGADO_COM_DADOS' : 'CARREGADO_VAZIO') : 'NAO_CARREGADO_NA_SESSAO',
                catalogo_carregado: flagTreinLoaded,
                ghe_carregado: flagGheLoaded,
                apr_modelos_carregado: aprModelos.length > 0,
                apr_registros_carregado: aprRegistros.length > 0,
                ia_aprendizado_disponivel: typeof window.obterEstadoIaAprendizadoSomenteLeitura === 'function',
                ia_mapa_mental_disponivel: typeof window.obterEstadoMapaMentalIa === 'function'
            },
            catalogo: catalogo,
            ghe: ghes,
            apr_modelo: aprModelos,
            apr_registro: aprRegistros,
            cenario: cenarios,
            regra: regras,
            mapa: mapas,
            decisao_mapa: decisoesMapa
        };
    }

    function localizarFonteViva(fontesVivas, tipo, origemId) {
        var lista = fontesVivas && Array.isArray(fontesVivas[tipo]) ? fontesVivas[tipo] : [];
        return lista.find(function (item) { return String(item.origem_id) === String(origemId); }) || null;
    }

    // =========================================================================
    // 5. MOTOR DE EVOLUÇÃO HONESTA E AUDITÁVEL (P1-D CORRIGIDO: CITAÇÃO POR SLIDE)
    // =========================================================================
    function diagnosticarEvolucaoApresentacao(apresentacaoId) {
        garantirEstadoSessaoApres();
        var ap = typeof apresentacaoId === 'object' && apresentacaoId !== null
            ? apresentacaoId
            : buscarApresentacaoPorId(apresentacaoId || estadoApres.apresentacaoSelecionadaId);
        if (!ap) {
            throw new Error('Apresentação não encontrada para diagnóstico de evolução.');
        }

        var fontesVivas = lerFontesDisponiveisNosModulos();
        var fontesVinculadas = Array.isArray(ap.fontes_vinculadas) ? ap.fontes_vinculadas : [];
        var slides = Array.isArray(ap.slides) ? ap.slides : [];

        var detalhesFontesVinculadas = [];
        var fontesAlteradasOuRevogadas = [];
        var slidesComCitacaoDesatualizadaMap = new Map();

        fontesVinculadas.forEach(function (fv) {
            var viva = fv.tipo === 'fonte_colada' ? null : localizarFonteViva(fontesVivas, fv.tipo, fv.origem_id);
            var hashAtualOrigem = fv.tipo === 'fonte_colada'
                ? fv.hash_canonico_capturado
                : (viva ? viva.hash_canonico : null);

            var slidesDependentes = [];
            var slidesComCitacaoDefasadaNestaFonte = [];

            slides.forEach(function (sl) {
                var refNoSlide = (Array.isArray(sl.referencias) ? sl.referencias : []).find(function (r) {
                    return r.id_vinculo === fv.id_vinculo || (r.tipo === fv.tipo && String(r.origem_id) === String(fv.origem_id));
                });
                if (!refNoSlide) return;

                // P1-D: Verifica se o hash citado naquele slide específico confere tanto com o snapshot da fonte quanto com a origem viva!
                var hashCitadoNoSlide = refNoSlide.hash_no_momento_da_citacao || '';
                var citacaoDefasada = Boolean(
                    (hashAtualOrigem && hashCitadoNoSlide !== hashAtualOrigem) ||
                    (fv.hash_canonico_capturado && hashCitadoNoSlide !== fv.hash_canonico_capturado) ||
                    sl.status_revisao_slide === 'PRECISA_REVISAO_FONTE'
                );

                var infoDep = {
                    slide_id: sl.id,
                    ordem: sl.ordem,
                    titulo: sl.titulo,
                    hash_no_momento_da_citacao: hashCitadoNoSlide,
                    citacao_defasada: citacaoDefasada,
                    status_revisao_slide: sl.status_revisao_slide
                };
                slidesDependentes.push(infoDep);
                if (citacaoDefasada) {
                    slidesComCitacaoDefasadaNestaFonte.push(infoDep);
                    slidesComCitacaoDesatualizadaMap.set(sl.id, {
                        slide_id: sl.id,
                        ordem: sl.ordem,
                        titulo: sl.titulo,
                        origem_geracao: sl.origem_geracao,
                        status_revisao_slide: 'PRECISA_REVISAO_FONTE',
                        motivo_pendencia: 'Citação defasada em relação à fonte "' + fv.titulo + '" (hash slide: ' + (hashCitadoNoSlide || 'vazio') + ' vs atual: ' + (hashAtualOrigem || fv.hash_canonico_capturado) + ').'
                    });
                }
            });

            if (fv.tipo === 'fonte_colada') {
                detalhesFontesVinculadas.push({
                    id_vinculo: fv.id_vinculo,
                    tipo: fv.tipo,
                    origem_id: fv.origem_id,
                    titulo: fv.titulo,
                    situacao_atual: slidesComCitacaoDefasadaNestaFonte.length > 0 ? 'SLIDES_DEPENDENTES_PENDENTES_REVISAO' : 'VERIFICADA_LOCAL',
                    hash_capturado: fv.hash_canonico_capturado,
                    hash_atual: fv.hash_canonico_capturado,
                    uso_na_aula: slidesDependentes.length > 0 ? 'CITADO' : fv.uso_na_aula,
                    slides_dependentes: slidesDependentes,
                    slides_com_citacao_defasada: slidesComCitacaoDefasadaNestaFonte,
                    escopo: fv.escopo
                });
                if (slidesComCitacaoDefasadaNestaFonte.length > 0) {
                    fontesAlteradasOuRevogadas.push({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        titulo: fv.titulo,
                        situacao: 'SLIDES_DEPENDENTES_PENDENTES_REVISAO',
                        motivo: slidesComCitacaoDefasadaNestaFonte.length + ' slide(s) ainda mantêm texto/citação de versão anterior desta fonte.',
                        hash_capturado: fv.hash_canonico_capturado,
                        hash_atual: fv.hash_canonico_capturado,
                        trecho_capturado: fv.trecho_capturado,
                        trecho_atual: fv.trecho_capturado,
                        slides_dependentes: slidesDependentes,
                        slides_com_citacao_defasada: slidesComCitacaoDefasadaNestaFonte
                    });
                }
                return;
            }

            var situacao = 'VERIFICADA_SEM_MUDANCA';
            var motivoMudanca = '';

            if (!viva) {
                var ehRemotoNaoCarregado = (
                    (fv.tipo === 'catalogo' && fontesVivas.disponibilidade_modulos.catalogo_estado === 'NAO_CARREGADO_NA_SESSAO') ||
                    (fv.tipo === 'ghe' && fontesVivas.disponibilidade_modulos.ghe_estado === 'NAO_CARREGADO_NA_SESSAO') ||
                    (fv.tipo === 'apr_modelo' && !fontesVivas.disponibilidade_modulos.apr_modelos_carregado) ||
                    (fv.tipo === 'apr_registro' && !fontesVivas.disponibilidade_modulos.apr_registros_carregado)
                );
                if (ehRemotoNaoCarregado) {
                    situacao = 'FONTE_NAO_CARREGADA_NA_SESSAO';
                    motivoMudanca = 'A tabela de origem (' + fv.modulo_origem + ') ainda não foi carregada no cache desta sessão.';
                } else {
                    situacao = 'ORIGEM_EXCLUIDA_OU_INDISPONIVEL';
                    motivoMudanca = 'O registro de origem (' + fv.titulo + ') foi excluído ou não está disponível no módulo de origem.';
                    slidesDependentes.forEach(function (sd) {
                        slidesComCitacaoDesatualizadaMap.set(sd.slide_id, {
                            slide_id: sd.slide_id,
                            ordem: sd.ordem,
                            titulo: sd.titulo,
                            origem_geracao: 'FONTE_INDISPONIVEL',
                            status_revisao_slide: 'PRECISA_REVISAO_FONTE',
                            motivo_pendencia: 'Fonte citada indisponível/excluída: ' + fv.titulo
                        });
                    });
                    fontesAlteradasOuRevogadas.push({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        titulo: fv.titulo,
                        situacao: situacao,
                        motivo: motivoMudanca,
                        hash_capturado: fv.hash_canonico_capturado,
                        hash_atual: null,
                        trecho_capturado: fv.trecho_capturado,
                        trecho_atual: '',
                        slides_dependentes: slidesDependentes,
                        slides_com_citacao_defasada: slidesDependentes
                    });
                }
            } else {
                var foiRevogada = (fv.tipo === 'regra' && viva.status_origem !== 'APROVADO') ||
                    (fv.tipo === 'decisao_mapa' && viva.status_origem !== 'CONFIRMADO' && viva.status_origem !== 'ACEITA' && viva.status_origem !== 'ACEITA_COM_EDICAO');
                var hashSnapshotMudou = viva.hash_canonico !== fv.hash_canonico_capturado;

                if (foiRevogada) {
                    situacao = 'ORIGEM_REVOGADA';
                    motivoMudanca = 'A decisão/regra de origem passou para o status "' + viva.status_origem + '" no módulo de origem.';
                    slidesDependentes.forEach(function (sd) {
                        slidesComCitacaoDesatualizadaMap.set(sd.slide_id, {
                            slide_id: sd.slide_id,
                            ordem: sd.ordem,
                            titulo: sd.titulo,
                            origem_geracao: 'FONTE_REVOGADA',
                            status_revisao_slide: 'PRECISA_REVISAO_FONTE',
                            motivo_pendencia: 'Fonte citada foi revogada na origem: ' + fv.titulo
                        });
                    });
                    fontesAlteradasOuRevogadas.push({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        titulo: fv.titulo,
                        situacao: situacao,
                        motivo: motivoMudanca,
                        hash_capturado: fv.hash_canonico_capturado,
                        hash_atual: viva.hash_canonico,
                        trecho_capturado: fv.trecho_capturado,
                        trecho_atual: viva.trecho_capturado,
                        slides_dependentes: slidesDependentes,
                        slides_com_citacao_defasada: slidesDependentes
                    });
                } else if (hashSnapshotMudou) {
                    situacao = 'CONTEUDO_ATUALIZADO_NA_ORIGEM';
                    motivoMudanca = 'O conteúdo semântico ou escopo da fonte mudou no módulo de origem.';
                    fontesAlteradasOuRevogadas.push({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        titulo: fv.titulo,
                        situacao: situacao,
                        motivo: motivoMudanca,
                        hash_capturado: fv.hash_canonico_capturado,
                        hash_atual: viva.hash_canonico,
                        trecho_capturado: fv.trecho_capturado,
                        trecho_atual: viva.trecho_capturado,
                        versao_atual: viva.versao_origem,
                        escopo_atual: viva.escopo,
                        slides_dependentes: slidesDependentes,
                        slides_com_citacao_defasada: slidesComCitacaoDefasadaNestaFonte
                    });
                } else if (slidesComCitacaoDefasadaNestaFonte.length > 0) {
                    // O snapshot do vínculo já foi atualizado, mas ainda existem slides dependentes com hash_no_momento_da_citacao antigo!
                    situacao = 'SLIDES_DEPENDENTES_PENDENTES_REVISAO';
                    motivoMudanca = slidesComCitacaoDefasadaNestaFonte.length + ' slide(s) que citam esta fonte ainda não tiveram sua citação/texto revisados para o novo snapshot.';
                    fontesAlteradasOuRevogadas.push({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        titulo: fv.titulo,
                        situacao: situacao,
                        motivo: motivoMudanca,
                        hash_capturado: fv.hash_canonico_capturado,
                        hash_atual: viva.hash_canonico,
                        trecho_capturado: fv.trecho_capturado,
                        trecho_atual: viva.trecho_capturado,
                        versao_atual: viva.versao_origem,
                        escopo_atual: viva.escopo,
                        slides_dependentes: slidesDependentes,
                        slides_com_citacao_defasada: slidesComCitacaoDefasadaNestaFonte
                    });
                }
            }

            detalhesFontesVinculadas.push({
                id_vinculo: fv.id_vinculo,
                tipo: fv.tipo,
                origem_id: fv.origem_id,
                titulo: fv.titulo,
                situacao_atual: situacao,
                motivo_mudanca: motivoMudanca,
                hash_capturado: fv.hash_canonico_capturado,
                hash_atual: viva ? viva.hash_canonico : null,
                uso_na_aula: slidesDependentes.length > 0 ? 'CITADO' : fv.uso_na_aula,
                slides_dependentes: slidesDependentes,
                slides_com_citacao_defasada: slidesComCitacaoDefasadaNestaFonte,
                escopo: fv.escopo,
                tipo_acao_origem: fv.tipo_acao_origem
            });
        });

        // 3. Novos aprendizados validados nos módulos ligados ainda sem slide
        var cenarioIdsLigados = new Set();
        if (ap.cenario_ia_id) cenarioIdsLigados.add(String(ap.cenario_ia_id));
        fontesVinculadas.forEach(function (fv) {
            if (fv.tipo === 'cenario') cenarioIdsLigados.add(String(fv.origem_id));
        });

        var mapaIdsLigados = new Set();
        if (ap.mapa_mental_id) mapaIdsLigados.add(String(ap.mapa_mental_id));
        fontesVinculadas.forEach(function (fv) {
            if (fv.tipo === 'mapa') mapaIdsLigados.add(String(fv.origem_id));
        });

        var mapaVinculosPorChave = new Map();
        fontesVinculadas.forEach(function (fv) {
            mapaVinculosPorChave.set(fv.tipo + ':' + fv.origem_id, fv);
        });

        var idsVinculosCitadosEmSlides = new Set();
        slides.forEach(function (sl) {
            (Array.isArray(sl.referencias) ? sl.referencias : []).forEach(function (r) {
                idsVinculosCitadosEmSlides.add(r.id_vinculo);
                if (r.tipo && r.origem_id) idsVinculosCitadosEmSlides.add(r.tipo + ':' + r.origem_id);
            });
        });

        var novosAprendizadosValidadosSemSlide = [];

        fontesVivas.regra.forEach(function (regraViva) {
            if (regraViva.status_origem !== 'APROVADO') return;
            var chave = 'regra:' + regraViva.origem_id;
            var vinculoExistente = mapaVinculosPorChave.get(chave);
            var pertenceAoCenarioLigado = regraViva.contexto_aplicavel_id && cenarioIdsLigados.has(String(regraViva.contexto_aplicavel_id));
            if (!pertenceAoCenarioLigado && !vinculoExistente) return;
            if (vinculoExistente && vinculoExistente.uso_na_aula === 'DISPENSADO_NESTA_AULA') return;
            if (idsVinculosCitadosEmSlides.has(chave) || (vinculoExistente && idsVinculosCitadosEmSlides.has(vinculoExistente.id_vinculo))) return;

            novosAprendizadosValidadosSemSlide.push({
                id_vinculo: vinculoExistente ? vinculoExistente.id_vinculo : chave,
                tipo: 'regra',
                origem_id: regraViva.origem_id,
                titulo: regraViva.titulo,
                trecho_capturado: regraViva.trecho_capturado,
                tipo_acao_origem: regraViva.tipo_acao_origem,
                escopo: regraViva.escopo,
                hash_canonico: regraViva.hash_canonico,
                ja_vinculado_na_aula: !!vinculoExistente
            });
        });

        fontesVivas.decisao_mapa.forEach(function (decViva) {
            var chave = 'decisao_mapa:' + decViva.origem_id;
            var vinculoExistente = mapaVinculosPorChave.get(chave);
            var pertenceAoMapaLigado = decViva.mapa_id && mapaIdsLigados.has(String(decViva.mapa_id));
            if (!pertenceAoMapaLigado && !vinculoExistente) return;
            if (vinculoExistente && vinculoExistente.uso_na_aula === 'DISPENSADO_NESTA_AULA') return;
            if (idsVinculosCitadosEmSlides.has(chave) || (vinculoExistente && idsVinculosCitadosEmSlides.has(vinculoExistente.id_vinculo))) return;

            novosAprendizadosValidadosSemSlide.push({
                id_vinculo: vinculoExistente ? vinculoExistente.id_vinculo : chave,
                tipo: 'decisao_mapa',
                origem_id: decViva.origem_id,
                titulo: decViva.titulo,
                trecho_capturado: decViva.trecho_capturado,
                tipo_acao_origem: decViva.tipo_acao_origem,
                escopo: decViva.escopo,
                hash_canonico: decViva.hash_canonico,
                ja_vinculado_na_aula: !!vinculoExistente
            });
        });

        // 4. Slides pendentes de revisão (inclui rascunhos não revisados, externos pendentes e citações defasadas)
        var slidesPendentesRevisao = [];
        slides.forEach(function (sl) {
            var pendCitacao = slidesComCitacaoDesatualizadaMap.get(sl.id);
            if (pendCitacao) {
                slidesPendentesRevisao.push(pendCitacao);
            } else if (sl.status_revisao_slide !== 'REVISADO_ENGENHARIA') {
                slidesPendentesRevisao.push({
                    slide_id: sl.id,
                    ordem: sl.ordem,
                    titulo: sl.titulo,
                    origem_geracao: sl.origem_geracao,
                    status_revisao_slide: sl.status_revisao_slide,
                    motivo_pendencia: 'Slide em status ' + sl.status_revisao_slide + ' aguardando revisão técnica.'
                });
            }
        });

        var slidesComReferenciaResolvida = slides.filter(function (sl) {
            return Array.isArray(sl.referencias) && sl.referencias.length > 0 && !slidesComCitacaoDesatualizadaMap.has(sl.id);
        }).length;

        var resultado = {
            apresentacao_id: ap.id,
            revisao_id: ap.revisao_id,
            status_apresentacao: ap.status,
            modo_leitura: fontesVivas.modo_leitura,
            lido_do_cache_em: fontesVivas.lido_do_cache_em,
            disponibilidade_modulos: fontesVivas.disponibilidade_modulos,
            indicadores: {
                total_fontes_vinculadas: detalhesFontesVinculadas.length,
                fontes_verificadas_sem_mudanca: detalhesFontesVinculadas.filter(function (d) { return d.situacao_atual === 'VERIFICADA_SEM_MUDANCA' || d.situacao_atual === 'VERIFICADA_LOCAL'; }).length,
                total_slides: slides.length,
                slides_com_referencia: slidesComReferenciaResolvida,
                total_fontes_alteradas_ou_revogadas: fontesAlteradasOuRevogadas.length,
                total_novos_aprendizados_sem_slide: novosAprendizadosValidadosSemSlide.length,
                total_slides_pendentes_revisao: slidesPendentesRevisao.length
            },
            fontes_vinculadas: detalhesFontesVinculadas,
            fontes_alteradas_ou_revogadas: fontesAlteradasOuRevogadas,
            novos_aprendizados_sem_slide: novosAprendizadosValidadosSemSlide,
            slides_pendentes_revisao: slidesPendentesRevisao
        };

        estadoApres.ultimoResultadoVerificacao = resultado;
        return clonarProfundo(resultado);
    }

    // =========================================================================
    // 6. OPERAÇÕES DE NEGÓCIO COM CONCORRÊNCIA E PRESERVAÇÃO DE REVISÕES APROVADAS
    // =========================================================================
    function criarOuAtualizarApresentacao(dados) {
        exigirPapelMinimo('editor', 'criar ou editar apresentação SST');
        if (!dados || typeof dados !== 'object') {
            throw new Error('Dados inválidos para salvar apresentação.');
        }
        var titulo = limparTexto(dados.titulo || '', 220);
        if (!titulo) {
            throw new Error('Informe o título da apresentação SST.');
        }

        return executarTransacaoApres(function (versoesConhecidas) {
            var agora = new Date().toISOString();
            var idExistente = limparTexto(dados.id || '', 80);

            if (idExistente) {
                var existente = exigirApresentacaoEConcorrencia(idExistente, dados.versaoEsperada, versoesConhecidas);
                preservarSnapshotAprovadoSeNecessario(existente, 'Edição de metadados da apresentação');

                existente.norma_referencia = limparTexto(dados.norma_referencia != null ? dados.norma_referencia : existente.norma_referencia, 80) || 'NR-35';
                existente.titulo = titulo;
                if (dados.publico_alvo != null) existente.publico_alvo = limparTexto(dados.publico_alvo, 260);
                if (dados.carga_horaria != null) existente.carga_horaria = limparTexto(dados.carga_horaria, 60);
                if (dados.frente_obra != null) existente.frente_obra = limparTexto(dados.frente_obra, 200);
                if (dados.responsavel_tecnico != null) existente.responsavel_tecnico = limparTexto(dados.responsavel_tecnico, 180);
                if (dados.curso_catalogo_id != null) existente.curso_catalogo_id = limparTexto(dados.curso_catalogo_id, 80);
                if (dados.cenario_ia_id != null) existente.cenario_ia_id = limparTexto(dados.cenario_ia_id, 80);
                if (dados.mapa_mental_id != null) existente.mapa_mental_id = limparTexto(dados.mapa_mental_id, 80);
                existente.versao += 1;
                existente.atualizado_em = agora;

                sincronizarVinculosPrincipaisAutomaticos(existente);
                estadoApres.apresentacaoSelecionadaId = existente.id;
                sincronizarSlideSelecionado();
                return clonarProfundo(existente);
            }

            var seq = estadoApres.apresentacoes.length + 1;
            var norma = limparTexto(dados.norma_referencia || 'NR-35', 80);
            var nova = sanitizarApresentacaoEstrutura({
                id: gerarId('apres'),
                codigo: limparTexto(dados.codigo || ('AULA-' + norma.replace(/[^A-Z0-9]/gi, '').toUpperCase() + '-' + ('0' + seq).slice(-2)), 40),
                versao: 1,
                numero_revisao_editorial: 1,
                revisao_id: 'R1',
                status: 'RASCUNHO',
                norma_referencia: norma,
                titulo: titulo,
                publico_alvo: limparTexto(dados.publico_alvo || '', 260),
                carga_horaria: limparTexto(dados.carga_horaria || '', 60),
                frente_obra: limparTexto(dados.frente_obra || 'Consórcio Operador — PISF Ramal do Agreste', 200),
                responsavel_tecnico: limparTexto(dados.responsavel_tecnico || 'Engenharia de Segurança do Trabalho', 180),
                curso_catalogo_id: limparTexto(dados.curso_catalogo_id || '', 80),
                cenario_ia_id: limparTexto(dados.cenario_ia_id || '', 80),
                mapa_mental_id: limparTexto(dados.mapa_mental_id || '', 80),
                fontes_vinculadas: [],
                slides: [],
                revisoes_aprovadas: [],
                historico_evolucao: [],
                atualizado_em: agora
            });

            sincronizarVinculosPrincipaisAutomaticos(nova);
            estadoApres.apresentacoes.unshift(nova);
            estadoApres.apresentacaoSelecionadaId = nova.id;
            sincronizarSlideSelecionado();
            return clonarProfundo(nova);
        });
    }

    function sincronizarVinculosPrincipaisAutomaticos(ap) {
        var fontesVivas = lerFontesDisponiveisNosModulos();
        function garantirVinculo(tipo, origemId) {
            if (!origemId) return;
            var jaTem = ap.fontes_vinculadas.some(function (f) { return f.tipo === tipo && String(f.origem_id) === String(origemId); });
            if (jaTem) return;
            var viva = localizarFonteViva(fontesVivas, tipo, origemId);
            if (!viva) return;
            ap.fontes_vinculadas.push(sanitizarVinculoFonte({
                id_vinculo: tipo + ':' + viva.origem_id,
                tipo: tipo,
                modulo_origem: obterNomeModuloPorTipoFonte(tipo),
                origem_id: viva.origem_id,
                titulo: viva.titulo,
                trecho_capturado: viva.trecho_capturado,
                versao_origem: viva.versao_origem,
                status_origem_na_captura: viva.status_origem,
                tipo_acao_origem: viva.tipo_acao_origem,
                escopo: viva.escopo,
                hash_canonico_capturado: viva.hash_canonico,
                identidade_base_local: viva.identidade_base_local,
                capturado_em: new Date().toISOString(),
                uso_na_aula: 'PENDENTE'
            }));
        }
        garantirVinculo('catalogo', ap.curso_catalogo_id);
        garantirVinculo('cenario', ap.cenario_ia_id);
        garantirVinculo('mapa', ap.mapa_mental_id);
    }

    function vincularFonteNaApresentacao(apresentacaoId, payloadFonte) {
        exigirPapelMinimo('editor', 'vincular fonte à apresentação');
        if (!payloadFonte || typeof payloadFonte !== 'object') {
            throw new Error('Dados da fonte inválidos.');
        }
        var tipo = String(payloadFonte.tipo || '').trim().toLowerCase();
        if (!TIPOS_FONTE_SUPORTADOS.includes(tipo)) {
            throw new Error('Tipo de fonte não suportado: ' + tipo);
        }

        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, payloadFonte.versaoEsperada, versoesConhecidas);
            if (ap.fontes_vinculadas.length >= LIMITE_MAX_FONTES_POR_APRES) {
                throw new Error('Limite de ' + LIMITE_MAX_FONTES_POR_APRES + ' fontes vinculadas por apresentação atingido.');
            }

            // P1-A: Adicionar ou alterar fonte na bibliografia de uma aula aprovada preserva o snapshot aprovado e abre nova revisão EM_REVISAO!
            preservarSnapshotAprovadoSeNecessario(ap, 'Inclusão/atualização de fonte na bibliografia da aula');

            var vinculoNovo = null;
            if (tipo === 'fonte_colada') {
                var tituloColada = limparTexto(payloadFonte.titulo || '', 200);
                var trechoColado = limparTexto(payloadFonte.trecho_capturado || payloadFonte.texto || '', 2500);
                if (!tituloColada || !trechoColado) {
                    throw new Error('Informe o título (ex.: NR-35 Item 35.5 — Sistemas de Ancoragem) e o trecho normativo/procedimento.');
                }
                var origemIdColada = limparTexto(payloadFonte.origem_id || gerarId('norma'), 80);
                var hashColada = calcularHashCanonico({
                    tipo: 'fonte_colada',
                    titulo: tituloColada,
                    trecho: trechoColado,
                    emissor: limparTexto(payloadFonte.emissor || 'Norma / Procedimento SST', 120)
                });
                var statusFonteColada = (obterPapelApresentacoes() === 'validador' && payloadFonte.validado_pela_engenharia === true)
                    ? 'VALIDADO_ENGENHARIA_SST'
                    : 'TEXTO_COLADO_NAO_VALIDADO';
                vinculoNovo = sanitizarVinculoFonte({
                    id_vinculo: 'fonte_colada:' + origemIdColada,
                    tipo: 'fonte_colada',
                    modulo_origem: 'Caderno Normativo / Procedimento do Tema',
                    origem_id: origemIdColada,
                    titulo: tituloColada,
                    trecho_capturado: trechoColado,
                    versao_origem: 1,
                    status_origem_na_captura: statusFonteColada,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: payloadFonte.escopo || { atividade: ap.norma_referencia, ghe_codigo: '' },
                    hash_canonico_capturado: hashColada,
                    identidade_base_local: obterIdentidadeSessaoChave(),
                    capturado_em: new Date().toISOString(),
                    uso_na_aula: 'PENDENTE'
                });
            } else {
                var origemId = limparTexto(payloadFonte.origem_id || '', 120);
                if (!origemId) throw new Error('Selecione o registro de origem para vincular.');
                var fontesVivas = lerFontesDisponiveisNosModulos();
                var viva = localizarFonteViva(fontesVivas, tipo, origemId);
                if (!viva) {
                    throw new Error('Fonte "' + tipo + ':' + origemId + '" não encontrada nos módulos carregados.');
                }
                vinculoNovo = sanitizarVinculoFonte({
                    id_vinculo: tipo + ':' + viva.origem_id,
                    tipo: tipo,
                    modulo_origem: obterNomeModuloPorTipoFonte(tipo),
                    origem_id: viva.origem_id,
                    titulo: viva.titulo,
                    trecho_capturado: viva.trecho_capturado,
                    versao_origem: viva.versao_origem,
                    status_origem_na_captura: viva.status_origem,
                    tipo_acao_origem: viva.tipo_acao_origem,
                    escopo: viva.escopo,
                    hash_canonico_capturado: viva.hash_canonico,
                    identidade_base_local: viva.identidade_base_local,
                    capturado_em: new Date().toISOString(),
                    uso_na_aula: 'PENDENTE'
                });
                if (tipo === 'catalogo' && !ap.curso_catalogo_id) ap.curso_catalogo_id = viva.origem_id;
                if (tipo === 'cenario' && !ap.cenario_ia_id) ap.cenario_ia_id = viva.origem_id;
                if (tipo === 'mapa' && !ap.mapa_mental_id) ap.mapa_mental_id = viva.origem_id;
            }

            var idxExistente = ap.fontes_vinculadas.findIndex(function (f) { return f.id_vinculo === vinculoNovo.id_vinculo; });
            if (idxExistente >= 0) {
                ap.fontes_vinculadas[idxExistente] = vinculoNovo;
            } else {
                ap.fontes_vinculadas.push(vinculoNovo);
            }
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            return clonarProfundo(vinculoNovo);
        });
    }

    function removerFonteVinculada(apresentacaoId, idVinculo, opcoes) {
        exigirPapelMinimo('editor', 'desvincular fonte da apresentação');
        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoes && opcoes.versaoEsperada, versoesConhecidas);
            var antes = ap.fontes_vinculadas.length;
            var existe = ap.fontes_vinculadas.some(function (f) { return f.id_vinculo === idVinculo; });
            if (!existe) {
                throw new Error('Vínculo de fonte não encontrado.');
            }

            // P1-A: Remover fonte de aula aprovada preserva snapshot aprovado e abre revisão EM_REVISAO!
            preservarSnapshotAprovadoSeNecessario(ap, 'Remoção de fonte vinculada (' + idVinculo + ')');

            ap.fontes_vinculadas = ap.fontes_vinculadas.filter(function (f) { return f.id_vinculo !== idVinculo; });
            ap.slides.forEach(function (sl) {
                var tinhaRef = (sl.referencias || []).some(function (r) { return r.id_vinculo === idVinculo; });
                sl.referencias = (sl.referencias || []).filter(function (r) { return r.id_vinculo !== idVinculo; });
                if (tinhaRef) {
                    sl.status_revisao_slide = 'PRECISA_REVISAO_FONTE';
                }
            });
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            return true;
        });
    }

    function salvarSlideApresentacao(apresentacaoId, dadosSlide) {
        exigirPapelMinimo('editor', 'salvar slide da apresentação');
        if (!dadosSlide || typeof dadosSlide !== 'object') {
            throw new Error('Dados do slide inválidos.');
        }
        var titulo = limparTexto(dadosSlide.titulo || '', 200);
        if (!titulo) {
            throw new Error('Informe o título do slide.');
        }

        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(
                apresentacaoId || estadoApres.apresentacaoSelecionadaId,
                dadosSlide.versaoEsperada,
                versoesConhecidas
            );

            // P1-A: Preserva snapshot imutável da revisão aprovada antes de editar ou criar slide!
            preservarSnapshotAprovadoSeNecessario(ap, 'Edição de slide (' + titulo + ')');

            var topicos = Array.isArray(dadosSlide.topicos)
                ? dadosSlide.topicos
                : String(dadosSlide.topicos_texto || '')
                    .split(/\r?\n/)
                    .map(function (x) { return limparTexto(x.replace(/^[-•*]\s*/, ''), 400); })
                    .filter(Boolean);

            var idsVinculosRef = Array.isArray(dadosSlide.id_vinculos_referencia)
                ? dadosSlide.id_vinculos_referencia
                : null;
            var referenciasResolvidas = null;
            if (idsVinculosRef) {
                referenciasResolvidas = idsVinculosRef.map(function (idV) {
                    var fv = ap.fontes_vinculadas.find(function (f) { return f.id_vinculo === idV; });
                    if (!fv) return null;
                    fv.uso_na_aula = 'CITADO';
                    return sanitizarReferenciaSlide({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        rotulo_curto: fv.titulo,
                        hash_no_momento_da_citacao: fv.hash_canonico_capturado
                    });
                }).filter(Boolean);
            }

            var slideId = limparTexto(dadosSlide.id || '', 80);
            var existente = slideId ? ap.slides.find(function (s) { return s.id === slideId; }) : null;

            if (existente) {
                existente.titulo = titulo;
                existente.layout = LAYOUTS_SLIDE_SUPORTADOS.includes(String(dadosSlide.layout || '').toUpperCase())
                    ? String(dadosSlide.layout).toUpperCase()
                    : existente.layout;
                existente.secao_norma = limparTexto(dadosSlide.secao_norma != null ? dadosSlide.secao_norma : existente.secao_norma, 140);
                existente.objetivo_didatico = limparTexto(dadosSlide.objetivo_didatico != null ? dadosSlide.objetivo_didatico : existente.objetivo_didatico, 320);
                existente.topicos = topicos.slice(0, 10);
                existente.aplicacao_obra_funcao = limparTexto(dadosSlide.aplicacao_obra_funcao != null ? dadosSlide.aplicacao_obra_funcao : existente.aplicacao_obra_funcao, 900);
                existente.caso_real_obra = limparTexto(dadosSlide.caso_real_obra != null ? dadosSlide.caso_real_obra : existente.caso_real_obra, 700);
                existente.pergunta_debate = limparTexto(dadosSlide.pergunta_debate != null ? dadosSlide.pergunta_debate : existente.pergunta_debate, 450);
                existente.nota_instrutor = limparTexto(dadosSlide.nota_instrutor != null ? dadosSlide.nota_instrutor : existente.nota_instrutor, 1400);

                if (referenciasResolvidas) {
                    existente.referencias = referenciasResolvidas;
                } else if (Array.isArray(existente.referencias)) {
                    // Ao editar e revisar manualmente o slide, sincroniza os hashes de citação com o snapshot atual das fontes vinculadas
                    existente.referencias.forEach(function (ref) {
                        var fv = ap.fontes_vinculadas.find(function (f) { return f.id_vinculo === ref.id_vinculo; });
                        if (fv) {
                            ref.hash_no_momento_da_citacao = fv.hash_canonico_capturado;
                            ref.rotulo_curto = fv.titulo;
                        }
                    });
                }

                existente.status_revisao_slide = 'REVISADO_ENGENHARIA';
                existente.editado_manual = true;
                ap.versao += 1;
                ap.atualizado_em = new Date().toISOString();
                estadoApres.slideSelecionadoId = existente.id;
                return clonarProfundo(existente);
            }

            if (ap.slides.length >= LIMITE_MAX_SLIDES_POR_APRES) {
                throw new Error('Limite de ' + LIMITE_MAX_SLIDES_POR_APRES + ' slides por apresentação atingido.');
            }

            var novoSlide = sanitizarSlideEstrutura({
                id: gerarId('slide'),
                ordem: ap.slides.length + 1,
                layout: dadosSlide.layout || 'PADRAO_TOPICOS',
                secao_norma: dadosSlide.secao_norma || ap.norma_referencia,
                titulo: titulo,
                objetivo_didatico: dadosSlide.objetivo_didatico || '',
                topicos: topicos,
                aplicacao_obra_funcao: dadosSlide.aplicacao_obra_funcao || '',
                caso_real_obra: dadosSlide.caso_real_obra || '',
                pergunta_debate: dadosSlide.pergunta_debate || '',
                nota_instrutor: dadosSlide.nota_instrutor || '',
                referencias: referenciasResolvidas || [],
                origem_geracao: 'MANUAL_ENGENHARIA',
                status_revisao_slide: 'REVISADO_ENGENHARIA',
                editado_manual: true
            }, ap.slides.length);

            ap.slides.push(novoSlide);
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            estadoApres.slideSelecionadoId = novoSlide.id;
            return clonarProfundo(novoSlide);
        });
    }

    function reordenarSlideApresentacao(apresentacaoId, slideId, direcao, opcoes) {
        exigirPapelMinimo('editor', 'reordenar slides');
        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoes && opcoes.versaoEsperada, versoesConhecidas);
            var idx = ap.slides.findIndex(function (s) { return s.id === slideId; });
            if (idx < 0) throw new Error('Slide não encontrado.');
            var novoIdx = direcao === 'cima' ? idx - 1 : idx + 1;
            if (novoIdx < 0 || novoIdx >= ap.slides.length) return clonarProfundo(ap.slides);

            preservarSnapshotAprovadoSeNecessario(ap, 'Reordenação de slides');

            var temp = ap.slides[idx];
            ap.slides[idx] = ap.slides[novoIdx];
            ap.slides[novoIdx] = temp;
            ap.slides.forEach(function (s, i) { s.ordem = i + 1; });
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            return clonarProfundo(ap.slides);
        });
    }

    function removerSlideApresentacao(apresentacaoId, slideId, opcoes) {
        exigirPapelMinimo('editor', 'remover slide');
        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoes && opcoes.versaoEsperada, versoesConhecidas);
            var existe = ap.slides.some(function (s) { return s.id === slideId; });
            if (!existe) throw new Error('Slide não encontrado.');

            preservarSnapshotAprovadoSeNecessario(ap, 'Remoção de slide (' + slideId + ')');

            ap.slides = ap.slides.filter(function (s) { return s.id !== slideId; });
            ap.slides.forEach(function (s, i) { s.ordem = i + 1; });
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            sincronizarSlideSelecionado();
            return true;
        });
    }

    // P1-D & P1-A: Incorporação, atualização de snapshot por slide e dispensa rastreável
    function aplicarDecisaoEvolucaoNaApresentacao(apresentacaoId, opcoesDecisao) {
        exigirPapelMinimo('editor', 'aplicar decisão de evolução na apresentação');
        if (!opcoesDecisao || typeof opcoesDecisao !== 'object') {
            throw new Error('Parâmetros de evolução inválidos.');
        }
        // Ações suportadas:
        // INCORPORAR_EM_SLIDE | CRIAR_SLIDE_DO_APRENDIZADO | ATUALIZAR_SNAPSHOT_FONTE |
        // REVISAR_CITACAO_SLIDE | MANTER_TEXTO_SLIDE_ATUALIZAR_CITACAO | DISPENSAR_NESTA_AULA
        var acao = String(opcoesDecisao.acao || '').toUpperCase();
        var idVinculo = limparTexto(opcoesDecisao.id_vinculo || '', 140);
        if (!idVinculo) throw new Error('Identificador de vínculo da fonte obrigatório.');

        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoesDecisao.versaoEsperada, versoesConhecidas);

            var partes = idVinculo.split(':');
            var tipo = partes[0];
            var origemId = partes.slice(1).join(':');
            var fontesVivas = lerFontesDisponiveisNosModulos();
            var viva = tipo !== 'fonte_colada' ? localizarFonteViva(fontesVivas, tipo, origemId) : null;

            // P1-D: Bloqueia incorporar ou atualizar snapshot a partir de origem revogada ou excluída/indisponível
            if (acao !== 'DISPENSAR_NESTA_AULA' && tipo !== 'fonte_colada') {
                if (!viva) {
                    throw new Error('Operação bloqueada: a fonte de origem (' + idVinculo + ') foi excluída ou está indisponível no módulo de origem.');
                }
                var origemRevogada = (tipo === 'regra' && viva.status_origem !== 'APROVADO') ||
                    (tipo === 'decisao_mapa' && viva.status_origem !== 'CONFIRMADO' && viva.status_origem !== 'ACEITA' && viva.status_origem !== 'ACEITA_COM_EDICAO');
                if (origemRevogada) {
                    throw new Error('Operação bloqueada: a fonte "' + viva.titulo + '" está com status "' + viva.status_origem + '" (revogada/não aprovada) e não pode ser incorporada como aprendizado validado.');
                }
            }

            var vinculo = ap.fontes_vinculadas.find(function (f) { return f.id_vinculo === idVinculo; });
            if (!vinculo && viva) {
                vinculo = sanitizarVinculoFonte({
                    id_vinculo: idVinculo,
                    tipo: tipo,
                    modulo_origem: obterNomeModuloPorTipoFonte(tipo),
                    origem_id: viva.origem_id,
                    titulo: viva.titulo,
                    trecho_capturado: viva.trecho_capturado,
                    versao_origem: viva.versao_origem,
                    status_origem_na_captura: viva.status_origem,
                    tipo_acao_origem: viva.tipo_acao_origem,
                    escopo: viva.escopo,
                    hash_canonico_capturado: viva.hash_canonico,
                    identidade_base_local: viva.identidade_base_local,
                    capturado_em: new Date().toISOString(),
                    uso_na_aula: 'PENDENTE'
                });
                ap.fontes_vinculadas.push(vinculo);
            }
            if (!vinculo) {
                throw new Error('Fonte vinculada não localizada para aplicar evolução.');
            }

            var sessao = obterSessaoSegura();
            var responsavel = limparTexto((sessao && (sessao.nome || sessao.matricula)) || 'Engenharia SST', 120);
            var agora = new Date().toISOString();

            // P1-A: Qualquer decisão de evolução (inclusive DISPENSAR_NESTA_AULA se alterar o estado da apresentação aprovada)
            // preserva o snapshot imutável da revisão aprovada antes de registrar a alteração!
            preservarSnapshotAprovadoSeNecessario(ap, 'Decisão de evolução (' + acao + ' em ' + vinculo.titulo + ')');

            if (acao === 'DISPENSAR_NESTA_AULA') {
                vinculo.uso_na_aula = 'DISPENSADO_NESTA_AULA';
                vinculo.justificativa_decisao = limparTexto(opcoesDecisao.justificativa || 'Dispensado pela Engenharia SST para o escopo desta apresentação.', 400);
                // Remove referências dessa fonte dispensada nos slides e marca slides dependentes para revisão caso existissem
                ap.slides.forEach(function (sl) {
                    var tinha = (sl.referencias || []).some(function (r) { return r.id_vinculo === vinculo.id_vinculo; });
                    if (tinha) {
                        sl.referencias = (sl.referencias || []).filter(function (r) { return r.id_vinculo !== vinculo.id_vinculo; });
                        sl.status_revisao_slide = 'PRECISA_REVISAO_FONTE';
                    }
                });
                ap.historico_evolucao.unshift({
                    id: gerarId('evo'),
                    data: agora,
                    acao: 'DISPENSADO_NESTA_AULA',
                    id_vinculo: vinculo.id_vinculo,
                    slide_id: '',
                    resumo: 'Fonte/aprendizado dispensado nesta aula: ' + vinculo.titulo,
                    responsavel: responsavel
                });
                ap.versao += 1;
                ap.atualizado_em = agora;
                return clonarProfundo(ap);
            }

            if (viva) {
                vinculo.trecho_capturado = viva.trecho_capturado;
                vinculo.versao_origem = viva.versao_origem;
                vinculo.status_origem_na_captura = viva.status_origem;
                vinculo.tipo_acao_origem = viva.tipo_acao_origem;
                vinculo.escopo = clonarProfundo(viva.escopo);
                vinculo.hash_canonico_capturado = viva.hash_canonico;
                vinculo.capturado_em = agora;
            }

            // P1-D: Quando a ação é ATUALIZAR_SNAPSHOT_FONTE:
            // - Atualiza o snapshot da fonte no caderno;
            // - Marca TODOS os slides dependentes cujo hash_no_momento_da_citacao difere do novo hash como PRECISA_REVISAO_FONTE!
            // - Não marca nenhum slide como REVISADO_ENGENHARIA silenciosamente!
            if (acao === 'ATUALIZAR_SNAPSHOT_FONTE') {
                var qtdImpactados = 0;
                ap.slides.forEach(function (sl) {
                    var ref = (sl.referencias || []).find(function (r) { return r.id_vinculo === vinculo.id_vinculo; });
                    if (ref && ref.hash_no_momento_da_citacao !== vinculo.hash_canonico_capturado) {
                        sl.status_revisao_slide = 'PRECISA_REVISAO_FONTE';
                        qtdImpactados += 1;
                    }
                });
                ap.historico_evolucao.unshift({
                    id: gerarId('evo'),
                    data: agora,
                    acao: 'ATUALIZAR_SNAPSHOT_FONTE',
                    id_vinculo: vinculo.id_vinculo,
                    slide_id: '',
                    resumo: 'Snapshot da fonte "' + vinculo.titulo + '" atualizado para ' + vinculo.hash_canonico_capturado + '. ' + qtdImpactados + ' slide(s) dependente(s) marcado(s) para revisão individual.',
                    responsavel: responsavel
                });
                ap.versao += 1;
                ap.atualizado_em = agora;
                return clonarProfundo(ap);
            }

            // P1-D: Revisão explícita de um slide dependente específico (atualizando o conteúdo ou mantendo o texto com justificativa)
            if (acao === 'REVISAR_CITACAO_SLIDE' || acao === 'MANTER_TEXTO_SLIDE_ATUALIZAR_CITACAO') {
                var idSlideRev = limparTexto(opcoesDecisao.slide_id || estadoApres.slideSelecionadoId || '', 80);
                var slRev = ap.slides.find(function (s) { return s.id === idSlideRev; });
                if (!slRev) throw new Error('Selecione o slide dependente que deseja revisar.');

                var refSlide = (slRev.referencias || []).find(function (r) { return r.id_vinculo === vinculo.id_vinculo; });
                if (!refSlide) {
                    throw new Error('O slide selecionado não cita a fonte "' + vinculo.titulo + '".');
                }

                if (acao === 'REVISAR_CITACAO_SLIDE') {
                    var trechoNovo = limparTexto(opcoesDecisao.novo_texto_slide || vinculo.trecho_capturado, 400);
                    if (opcoesDecisao.substituir_topicos === true) {
                        slRev.topicos = [trechoNovo];
                    } else if (slRev.topicos.indexOf(trechoNovo) === -1) {
                        slRev.topicos.push(trechoNovo);
                    }
                }

                refSlide.hash_no_momento_da_citacao = vinculo.hash_canonico_capturado;
                refSlide.rotulo_curto = vinculo.titulo;

                // Só marca o slide como REVISADO_ENGENHARIA se todas as demais referências dele também estiverem com hash em dia
                var todasRefsEmDia = (slRev.referencias || []).every(function (r) {
                    var fVinc = ap.fontes_vinculadas.find(function (f) { return f.id_vinculo === r.id_vinculo; });
                    return fVinc && r.hash_no_momento_da_citacao === fVinc.hash_canonico_capturado;
                });
                if (todasRefsEmDia) {
                    slRev.status_revisao_slide = 'REVISADO_ENGENHARIA';
                }

                ap.historico_evolucao.unshift({
                    id: gerarId('evo'),
                    data: agora,
                    acao: acao,
                    id_vinculo: vinculo.id_vinculo,
                    slide_id: slRev.id,
                    resumo: (acao === 'MANTER_TEXTO_SLIDE_ATUALIZAR_CITACAO'
                        ? 'Mantido texto do Slide #' + slRev.ordem + ' com citação atualizada (' + limparTexto(opcoesDecisao.justificativa || 'revisado pela Engenharia', 140) + ')'
                        : 'Slide #' + slRev.ordem + ' atualizado e revisado com o novo conteúdo da fonte "' + vinculo.titulo + '"'),
                    responsavel: responsavel
                });
                ap.versao += 1;
                ap.atualizado_em = agora;
                return clonarProfundo(ap);
            }

            var textoEscopo = formatarEscopoParaDidatica(vinculo);
            var slideAlvo = null;

            if (acao === 'INCORPORAR_EM_SLIDE') {
                var slideIdAlvo = limparTexto(opcoesDecisao.slide_id || estadoApres.slideSelecionadoId || (ap.slides[0] && ap.slides[0].id) || '', 80);
                slideAlvo = ap.slides.find(function (s) { return s.id === slideIdAlvo; }) || ap.slides[0] || null;
            }

            if (!slideAlvo || acao === 'CRIAR_SLIDE_DO_APRENDIZADO') {
                if (ap.slides.length >= LIMITE_MAX_SLIDES_POR_APRES) {
                    throw new Error('Limite de slides atingido.');
                }
                var ehRestricao = vinculo.tipo_acao_origem === 'RESTRICAO_ESCOPO';
                slideAlvo = sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    ordem: ap.slides.length + 1,
                    layout: 'APLICACAO_OBRA_FUNCAO',
                    secao_norma: ap.norma_referencia + ' • Evolução Operacional da Obra',
                    titulo: ehRestricao
                        ? ('Diferenciação de Escopo por Função/Etapa — ' + limparTexto(vinculo.escopo && vinculo.escopo.atividade || ap.norma_referencia, 120))
                        : limparTexto(vinculo.titulo.replace(/^[^:]+:\s*/, ''), 180),
                    objetivo_didatico: ehRestricao
                        ? 'Esclarecer à turma quais exigências foram retiradas/restritas para funções ou etapas específicas após análise técnica.'
                        : 'Incorporar decisão técnica validada nos módulos operacionais da obra.',
                    topicos: [limparTexto(vinculo.trecho_capturado, 380)],
                    aplicacao_obra_funcao: textoEscopo,
                    caso_real_obra: '',
                    pergunta_debate: 'Como essa regra ou diferenciação por função se aplica na sua etapa específica de trabalho hoje?',
                    nota_instrutor: 'Origem rastreável: ' + vinculo.titulo + ' (Hash: ' + vinculo.hash_canonico_capturado + '). ' +
                        (ehRestricao ? 'Atenção instrutor: este item registra uma retirada/restrição de escopo validada no Mapa Mental — não cobrar como exigência geral para a função dispensada.' : ''),
                    referencias: [{
                        id_vinculo: vinculo.id_vinculo,
                        tipo: vinculo.tipo,
                        origem_id: vinculo.origem_id,
                        rotulo_curto: vinculo.titulo,
                        hash_no_momento_da_citacao: vinculo.hash_canonico_capturado
                    }],
                    origem_geracao: 'COMPOSITOR_FONTES_LOCAL',
                    status_revisao_slide: 'REVISADO_ENGENHARIA',
                    editado_manual: false
                }, ap.slides.length);
                ap.slides.push(slideAlvo);
            } else {
                var linhaAprendizado = limparTexto(
                    (vinculo.tipo_acao_origem === 'RESTRICAO_ESCOPO' ? '[Restrição/Diferenciação de Escopo Validada] ' : '[Aprendizado Validado da Obra] ') +
                    vinculo.trecho_capturado,
                    380
                );
                if (!slideAlvo.aplicacao_obra_funcao) {
                    slideAlvo.aplicacao_obra_funcao = textoEscopo + ' — ' + linhaAprendizado;
                } else if (slideAlvo.aplicacao_obra_funcao.indexOf(vinculo.origem_id) === -1) {
                    slideAlvo.aplicacao_obra_funcao = limparTexto(slideAlvo.aplicacao_obra_funcao + '\n• ' + textoEscopo + ': ' + linhaAprendizado, 900);
                }
                var refExist = (slideAlvo.referencias || []).find(function (r) { return r.id_vinculo === vinculo.id_vinculo; });
                if (refExist) {
                    refExist.rotulo_curto = vinculo.titulo;
                    refExist.hash_no_momento_da_citacao = vinculo.hash_canonico_capturado;
                } else {
                    slideAlvo.referencias.push(sanitizarReferenciaSlide({
                        id_vinculo: vinculo.id_vinculo,
                        tipo: vinculo.tipo,
                        origem_id: vinculo.origem_id,
                        rotulo_curto: vinculo.titulo,
                        hash_no_momento_da_citacao: vinculo.hash_canonico_capturado
                    }));
                }
                slideAlvo.status_revisao_slide = 'REVISADO_ENGENHARIA';
            }

            vinculo.uso_na_aula = 'CITADO';
            ap.historico_evolucao.unshift({
                id: gerarId('evo'),
                data: agora,
                acao: acao,
                id_vinculo: vinculo.id_vinculo,
                slide_id: slideAlvo.id,
                resumo: 'Incorporado/atualizado em Slide #' + slideAlvo.ordem + ' (' + slideAlvo.titulo + '): ' + vinculo.titulo,
                responsavel: responsavel
            });
            ap.versao += 1;
            ap.atualizado_em = agora;
            estadoApres.slideSelecionadoId = slideAlvo.id;
            return clonarProfundo(ap);
        });
    }

    function formatarEscopoParaDidatica(vinculo) {
        var escopo = (vinculo && vinculo.escopo) || {};
        var partes = [];
        if (escopo.atividade) partes.push('Atividade: ' + escopo.atividade);
        if (escopo.ghe_codigo) partes.push('GHE: ' + escopo.ghe_codigo);
        if (Array.isArray(escopo.funcoes_nomes) && escopo.funcoes_nomes.length) {
            partes.push('Funções: ' + escopo.funcoes_nomes.join(', '));
        }
        if (Array.isArray(escopo.etapas_nomes) && escopo.etapas_nomes.length) {
            partes.push('Etapas: ' + escopo.etapas_nomes.join(' -> '));
        }
        if (escopo.condicao_uso) partes.push('Condição: ' + escopo.condicao_uso);
        if (vinculo && vinculo.tipo_acao_origem === 'RESTRICAO_ESCOPO') {
            partes.push('Natureza: Retirada/Restrição de escopo (não generalizar para outras funções/etapas)');
        }
        return partes.join(' | ') || 'Escopo geral do tema vinculado';
    }

    function alterarStatusApresentacao(apresentacaoId, novoStatus, opcoes) {
        var st = String(novoStatus || '').toUpperCase();
        if (!STATUS_APRESENTACAO.includes(st)) {
            throw new Error('Status inválido: ' + novoStatus);
        }
        if (st === 'APROVADO_ENGENHARIA') {
            exigirPapelMinimo('validador', 'homologar apresentação pela Engenharia SST');
        } else {
            exigirPapelMinimo('editor', 'alterar status da apresentação');
        }

        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoes && opcoes.versaoEsperada, versoesConhecidas);
            if (st === 'APROVADO_ENGENHARIA') {
                if (!ap.slides || ap.slides.length === 0) {
                    throw new Error('Não é possível homologar uma apresentação sem slides.');
                }
                var diag = diagnosticarEvolucaoApresentacao(ap);
                if (diag.indicadores.total_slides_pendentes_revisao > 0) {
                    throw new Error('Existem ' + diag.indicadores.total_slides_pendentes_revisao + ' slide(s) pendentes de revisão técnica ou com citação de fonte defasada. Revise e salve cada slide pendente antes de homologar.');
                }
                var sessao = obterSessaoSegura();
                ap.aprovado_em = new Date().toISOString();
                ap.aprovado_por = limparTexto((sessao && (sessao.nome || ('Matrícula ' + sessao.matricula))) || 'Engenharia SST', 120);
                ap.status = 'APROVADO_ENGENHARIA';
                ap.ultima_revisao_aprovada_id = ap.revisao_id;

                // Guarda imediatamente o snapshot desta revisão aprovada na coleção imutável `revisoes_aprovadas`
                if (!Array.isArray(ap.revisoes_aprovadas)) ap.revisoes_aprovadas = [];
                var jaExistiaRev = ap.revisoes_aprovadas.some(function (r) { return r.revisao_id === ap.revisao_id; });
                if (!jaExistiaRev && ap.revisoes_aprovadas.length >= LIMITE_MAX_REVISOES_APROVADAS) {
                    throw new Error('Limite de ' + LIMITE_MAX_REVISOES_APROVADAS + ' revisões homologadas preservadas atingido nesta apresentação. Exporte o backup completo (.json) antes de homologar uma 11ª revisão.');
                }
                ap.revisoes_aprovadas = ap.revisoes_aprovadas.filter(function (r) { return r.revisao_id !== ap.revisao_id; });
                ap.revisoes_aprovadas.unshift(sanitizarSnapshotRevisaoAprovada({
                    revisao_id: ap.revisao_id,
                    versao_concorrencia_na_aprovacao: ap.versao + 1,
                    norma_referencia: ap.norma_referencia,
                    titulo: ap.titulo,
                    publico_alvo: ap.publico_alvo,
                    carga_horaria: ap.carga_horaria,
                    frente_obra: ap.frente_obra,
                    responsavel_tecnico: ap.responsavel_tecnico,
                    aprovado_em: ap.aprovado_em,
                    aprovado_por: ap.aprovado_por,
                    fontes_vinculadas: clonarProfundo(ap.fontes_vinculadas),
                    slides: clonarProfundo(ap.slides)
                }));
            } else {
                preservarSnapshotAprovadoSeNecessario(ap, 'Mudança de status para ' + st);
                ap.status = st;
            }
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            return clonarProfundo(ap);
        });
    }

    function excluirApresentacao(apresentacaoId) {
        exigirPapelMinimo('editor', 'excluir apresentação local');
        return executarTransacaoApres(function () {
            var antes = estadoApres.apresentacoes.length;
            estadoApres.apresentacoes = estadoApres.apresentacoes.filter(function (a) { return String(a.id) !== String(apresentacaoId); });
            if (estadoApres.apresentacoes.length === antes) {
                throw new Error('Apresentação não encontrada para exclusão.');
            }
            if (estadoApres.apresentacaoSelecionadaId === apresentacaoId) {
                estadoApres.apresentacaoSelecionadaId = estadoApres.apresentacoes[0] ? estadoApres.apresentacoes[0].id : '';
            }
            sincronizarSlideSelecionado();
            return true;
        });
    }

    // =========================================================================
    // 7. COMPOSITOR LOCAL POR FONTES & PILOTO NR-35 (P1-B E BLOQUEIOS GROK CORRIGIDOS)
    // =========================================================================
    function comporSlidesLocaisPorFontesVinculadas(apresentacaoId, opcoes) {
        exigirPapelMinimo('editor', 'compor slides a partir das fontes vinculadas');
        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(apresentacaoId || estadoApres.apresentacaoSelecionadaId, opcoes && opcoes.versaoEsperada, versoesConhecidas);
            if (!ap.fontes_vinculadas || ap.fontes_vinculadas.length === 0) {
                throw new Error('Vincule pelo menos uma fonte (Catálogo, GHE, APR, Cenário/Regra IA, Mapa Mental ou Norma colada) antes de compor os slides.');
            }

            preservarSnapshotAprovadoSeNecessario(ap, 'Composição de slides pelas fontes vinculadas');

            var preservarManuais = !(opcoes && opcoes.substituirTodos === true);
            var slidesManuais = preservarManuais
                ? ap.slides.filter(function (s) { return s.editado_manual === true; })
                : [];

            var novosSlides = [];
            var fontes = ap.fontes_vinculadas.filter(function (f) { return f.uso_na_aula !== 'DISPENSADO_NESTA_AULA'; });
            if (fontes.length === 0) {
                throw new Error('Todas as fontes vinculadas estão marcadas como dispensadas nesta aula.');
            }

            // Cada fonte vinculada gera um slide esqueleto em RASCUNHO_PENDENTE_REVISAO citando APENAS a fonte que sustenta aquele slide!
            fontes.forEach(function (fv, idx) {
                if (slidesManuais.length + novosSlides.length >= LIMITE_MAX_SLIDES_POR_APRES) return;

                var layout = 'PADRAO_TOPICOS';
                var secao = ap.norma_referencia + ' • Fonte Vinculada';
                if (fv.tipo === 'catalogo' || fv.tipo === 'fonte_colada') {
                    layout = 'SINTESE_NORMATIVA';
                    secao = ap.norma_referencia + ' • Escopo Programático / Normativo';
                } else if (fv.tipo === 'mapa' || fv.tipo === 'decisao_mapa' || fv.tipo === 'ghe') {
                    layout = 'APLICACAO_OBRA_FUNCAO';
                    secao = ap.norma_referencia + ' • Diferenciação por Função & Etapa';
                } else if (fv.tipo === 'regra' || fv.tipo === 'cenario' || fv.tipo === 'apr_modelo' || fv.tipo === 'apr_registro') {
                    layout = 'DEBATE_CASO_REAL';
                    secao = ap.norma_referencia + ' • Controle Operacional & APR da Obra';
                }

                var partesTrecho = String(fv.trecho_capturado || '')
                    .split(/\s*\|\s*/)
                    .map(function (p) { return limparTexto(p, 350); })
                    .filter(Boolean);

                novosSlides.push(sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    layout: layout,
                    secao_norma: secao,
                    titulo: limparTexto(fv.titulo, 180),
                    objetivo_didatico: fv.tipo_acao_origem === 'RESTRICAO_ESCOPO'
                        ? 'Rascunho para revisão: registrar restrição/retirada de escopo validada no módulo de origem.'
                        : 'Rascunho gerado a partir da fonte vinculada (' + fv.modulo_origem + ') — revisar e adaptar antes de homologar.',
                    topicos: partesTrecho.slice(0, 5),
                    aplicacao_obra_funcao: formatarEscopoParaDidatica(fv),
                    caso_real_obra: (fv.tipo === 'cenario' || fv.tipo === 'regra' || fv.tipo === 'apr_registro')
                        ? limparTexto(fv.trecho_capturado, 500)
                        : '',
                    pergunta_debate: '',
                    nota_instrutor: 'Rascunho composto da fonte: ' + fv.titulo + ' (Hash: ' + fv.hash_canonico_capturado + '). Revise e salve o slide para confirmar a autoria técnica.',
                    referencias: [{
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        rotulo_curto: fv.titulo,
                        hash_no_momento_da_citacao: fv.hash_canonico_capturado
                    }],
                    origem_geracao: 'COMPOSITOR_FONTES_LOCAL',
                    status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO',
                    editado_manual: false
                }, idx));
                fv.uso_na_aula = 'CITADO';
            });

            ap.slides = slidesManuais.concat(novosSlides).slice(0, LIMITE_MAX_SLIDES_POR_APRES);
            ap.slides.forEach(function (s, i) { s.ordem = i + 1; });
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            sincronizarSlideSelecionado();
            return clonarProfundo(ap);
        });
    }

    function fonteTemAfinidadeComTemaNr35(textoCompleto) {
        var norm = normalizarChaveComparacao(textoCompleto);
        if (!norm) return false;
        return /\bnr\s*35\b|\baltura\b|\bandaime\b|\bescada\b|\btalude\b|\bancoragem\b|\bcinto\b|\bparaquedista\b|\btalabarte\b|\blinha de vida\b|\bdesnivel\b/.test(norm);
    }

    // P1-B & Bloqueios 1/2/3 do Grok corrigidos:
    // - NÃO escreve texto normativo fabricado ("acima de 2,00 m", "8h", etc.) como se fosse fonte normativa oficial;
    // - NÃO faz fallback para `catalogo[0]`, `ghe[0]`, `cenario[0]` ou `mapa[0]` quando o registro não tem afinidade com NR-35/Altura
    //   (ex.: jamais vincula curso "Higiene de alimentos" ou cenário "Cozinha");
    // - Todo slide criado no molde piloto nasce com `status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO'` e cita APENAS a fonte real que o sustenta (ou `referencias: []` quando é um quadro esqueleto do molde aguardando fonte colada por João).
    function carregarApresentacaoPilotoConectada(opcoesPiloto) {
        exigirPapelMinimo('editor', 'carregar molde piloto NR-35');
        var fontesVivas = lerFontesDisponiveisNosModulos();
        var op = (typeof opcoesPiloto === 'object' && opcoesPiloto !== null) ? opcoesPiloto : {};

        return executarTransacaoApres(function () {
            var ap = sanitizarApresentacaoEstrutura({
                id: gerarId('apres'),
                codigo: 'AULA-NR35-01',
                versao: 1,
                numero_revisao_editorial: 1,
                revisao_id: 'R1',
                status: 'RASCUNHO',
                norma_referencia: 'NR-35',
                titulo: limparTexto(op.titulo || 'NR-35 — Trabalho em Altura (Molde Estruturado para Revisão da Engenharia)', 220),
                publico_alvo: limparTexto(op.publico_alvo || '[Rascunho — definir funções/GHE aplicáveis]', 260),
                carga_horaria: limparTexto(op.carga_horaria || '[Definir conforme Catálogo]', 60),
                frente_obra: 'Consórcio Operador — PISF Ramal do Agreste',
                responsavel_tecnico: 'Engenharia de Segurança do Trabalho',
                fontes_vinculadas: [],
                slides: [],
                revisoes_aprovadas: [],
                historico_evolucao: [],
                atualizado_em: new Date().toISOString()
            });

            // Só vincula registros existentes nos módulos se:
            // (a) Forem passados explicitamente em `opcoesPiloto`; OU
            // (b) Tiverem afinidade semântica explícita com NR-35 / Trabalho em Altura (zero fallback para `[0]` incompatível!).
            var cursoCat = op.curso_catalogo_id
                ? localizarFonteViva(fontesVivas, 'catalogo', op.curso_catalogo_id)
                : (fontesVivas.catalogo.find(function (c) {
                    return fonteTemAfinidadeComTemaNr35(c.titulo + ' ' + c.trecho_capturado);
                }) || null);

            var vinculoCatalogo = null;
            if (cursoCat) {
                ap.curso_catalogo_id = cursoCat.origem_id;
                vinculoCatalogo = sanitizarVinculoFonte({
                    id_vinculo: 'catalogo:' + cursoCat.origem_id,
                    tipo: 'catalogo',
                    modulo_origem: obterNomeModuloPorTipoFonte('catalogo'),
                    origem_id: cursoCat.origem_id,
                    titulo: cursoCat.titulo,
                    trecho_capturado: cursoCat.trecho_capturado,
                    versao_origem: cursoCat.versao_origem,
                    status_origem_na_captura: cursoCat.status_origem,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: cursoCat.escopo,
                    hash_canonico_capturado: cursoCat.hash_canonico,
                    identidade_base_local: cursoCat.identidade_base_local,
                    uso_na_aula: 'CITADO'
                });
                ap.fontes_vinculadas.push(vinculoCatalogo);
            }

            var gheMatch = op.ghe_codigo
                ? localizarFonteViva(fontesVivas, 'ghe', op.ghe_codigo)
                : (fontesVivas.ghe.find(function (g) {
                    return fonteTemAfinidadeComTemaNr35(g.titulo + ' ' + g.trecho_capturado);
                }) || null);

            var vinculoGhe = null;
            if (gheMatch) {
                vinculoGhe = sanitizarVinculoFonte({
                    id_vinculo: 'ghe:' + gheMatch.origem_id,
                    tipo: 'ghe',
                    modulo_origem: obterNomeModuloPorTipoFonte('ghe'),
                    origem_id: gheMatch.origem_id,
                    titulo: gheMatch.titulo,
                    trecho_capturado: gheMatch.trecho_capturado,
                    versao_origem: gheMatch.versao_origem,
                    status_origem_na_captura: gheMatch.status_origem,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: gheMatch.escopo,
                    hash_canonico_capturado: gheMatch.hash_canonico,
                    identidade_base_local: gheMatch.identidade_base_local,
                    uso_na_aula: 'CITADO'
                });
                ap.fontes_vinculadas.push(vinculoGhe);
            }

            var cenarioMatch = op.cenario_ia_id
                ? localizarFonteViva(fontesVivas, 'cenario', op.cenario_ia_id)
                : (fontesVivas.cenario.find(function (c) {
                    return fonteTemAfinidadeComTemaNr35(c.titulo + ' ' + c.trecho_capturado);
                }) || null);

            var vinculoCenario = null;
            if (cenarioMatch) {
                ap.cenario_ia_id = cenarioMatch.origem_id;
                vinculoCenario = sanitizarVinculoFonte({
                    id_vinculo: 'cenario:' + cenarioMatch.origem_id,
                    tipo: 'cenario',
                    modulo_origem: obterNomeModuloPorTipoFonte('cenario'),
                    origem_id: cenarioMatch.origem_id,
                    titulo: cenarioMatch.titulo,
                    trecho_capturado: cenarioMatch.trecho_capturado,
                    versao_origem: cenarioMatch.versao_origem,
                    status_origem_na_captura: cenarioMatch.status_origem,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: cenarioMatch.escopo,
                    hash_canonico_capturado: cenarioMatch.hash_canonico,
                    identidade_base_local: cenarioMatch.identidade_base_local,
                    uso_na_aula: 'CITADO'
                });
                ap.fontes_vinculadas.push(vinculoCenario);
            }

            var regraAprovadaMatch = fontesVivas.regra.find(function (r) {
                if (r.status_origem !== 'APROVADO') return false;
                if (cenarioMatch && String(r.contexto_aplicavel_id) === String(cenarioMatch.origem_id)) return true;
                return fonteTemAfinidadeComTemaNr35(r.titulo + ' ' + r.trecho_capturado);
            }) || null;

            var vinculoRegra = null;
            if (regraAprovadaMatch) {
                vinculoRegra = sanitizarVinculoFonte({
                    id_vinculo: 'regra:' + regraAprovadaMatch.origem_id,
                    tipo: 'regra',
                    modulo_origem: obterNomeModuloPorTipoFonte('regra'),
                    origem_id: regraAprovadaMatch.origem_id,
                    titulo: regraAprovadaMatch.titulo,
                    trecho_capturado: regraAprovadaMatch.trecho_capturado,
                    versao_origem: regraAprovadaMatch.versao_origem,
                    status_origem_na_captura: regraAprovadaMatch.status_origem,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: regraAprovadaMatch.escopo,
                    hash_canonico_capturado: regraAprovadaMatch.hash_canonico,
                    identidade_base_local: regraAprovadaMatch.identidade_base_local,
                    uso_na_aula: 'CITADO'
                });
                ap.fontes_vinculadas.push(vinculoRegra);
            }

            var mapaMatch = op.mapa_mental_id
                ? localizarFonteViva(fontesVivas, 'mapa', op.mapa_mental_id)
                : (fontesVivas.mapa.find(function (m) {
                    return fonteTemAfinidadeComTemaNr35(m.titulo + ' ' + m.trecho_capturado);
                }) || null);

            var vinculoMapa = null;
            if (mapaMatch) {
                ap.mapa_mental_id = mapaMatch.origem_id;
                vinculoMapa = sanitizarVinculoFonte({
                    id_vinculo: 'mapa:' + mapaMatch.origem_id,
                    tipo: 'mapa',
                    modulo_origem: obterNomeModuloPorTipoFonte('mapa'),
                    origem_id: mapaMatch.origem_id,
                    titulo: mapaMatch.titulo,
                    trecho_capturado: mapaMatch.trecho_capturado,
                    versao_origem: mapaMatch.versao_origem,
                    status_origem_na_captura: mapaMatch.status_origem,
                    tipo_acao_origem: 'ORIENTACAO_POSITIVA',
                    escopo: mapaMatch.escopo,
                    hash_canonico_capturado: mapaMatch.hash_canonico,
                    identidade_base_local: mapaMatch.identidade_base_local,
                    uso_na_aula: 'CITADO'
                });
                ap.fontes_vinculadas.push(vinculoMapa);
            }

            function refDeVinculo(v) {
                if (!v) return [];
                return [{
                    id_vinculo: v.id_vinculo,
                    tipo: v.tipo,
                    origem_id: v.origem_id,
                    rotulo_curto: v.titulo,
                    hash_no_momento_da_citacao: v.hash_canonico_capturado
                }];
            }

            // Monta 4 quadros-esqueleto no Molde Institucional com os 4 layouts,
            // TODOS marcados como RASCUNHO_PENDENTE_REVISAO e citando APENAS a fonte específica que sustenta cada slide
            ap.slides = [
                sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    ordem: 1,
                    layout: 'SINTESE_NORMATIVA',
                    secao_norma: 'NR-35 • 1. Escopo Programático e Trecho Normativo',
                    titulo: 'NR-35 — Escopo da Capacitação e Requisitos Normativos Aplicáveis',
                    objetivo_didatico: '[Rascunho — revisar objetivo didático conforme curso do Catálogo e trecho oficial da NR-35]',
                    topicos: vinculoCatalogo
                        ? [
                            'Fonte do Catálogo vinculada: ' + vinculoCatalogo.titulo,
                            'Conteúdo programático capturado: ' + limparTexto(vinculoCatalogo.trecho_capturado, 320),
                            '[Lacuna para revisão da Engenharia]: Cole na Aba 2 o trecho oficial aplicável da NR-35 / procedimento interno da obra.'
                        ]
                        : [
                            '[Rascunho sem fonte normativa vinculada]: Vincule o curso NR-35 do Catálogo ou cole o trecho oficial da NR-35 na Aba 2 (Caderno de Fontes).',
                            '[Lacuna]: Definir critérios de planejamento, liberação e condições impeditivas conforme procedimento da obra.'
                        ],
                    aplicacao_obra_funcao: '',
                    caso_real_obra: '',
                    pergunta_debate: '',
                    nota_instrutor: 'Slide em RASCUNHO_PENDENTE_REVISAO. Nenhuma exigência normativa foi inventada automaticamente pelo sistema.',
                    referencias: refDeVinculo(vinculoCatalogo),
                    origem_geracao: 'MOLDE_PILOTO_RASCUNHO',
                    status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO',
                    editado_manual: false
                }, 0),

                sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    ordem: 2,
                    layout: 'APLICACAO_OBRA_FUNCAO',
                    secao_norma: 'NR-35 • 2. Diferenciação por Função, Etapa e GHE',
                    titulo: 'Exposição, Controles e EPIs por Função × Etapa (GHE & Mapa Mental)',
                    objetivo_didatico: '[Rascunho — detalhar a exposição específica de cada função e etapa na atividade]',
                    topicos: (vinculoGhe || vinculoMapa)
                        ? [
                            vinculoGhe ? ('GHE vinculado: ' + limparTexto(vinculoGhe.trecho_capturado, 320)) : 'GHE ainda não vinculado a esta aula.',
                            vinculoMapa ? ('Mapa Mental vinculado: ' + limparTexto(vinculoMapa.trecho_capturado, 320)) : 'Mapa Mental ainda não vinculado a esta aula.'
                        ]
                        : [
                            '[Rascunho aguardando vínculo]: Vincule na Aba 2 o GHE e/ou o Mapa Mental SST (Função × Etapa) pertinente à atividade em altura.'
                        ],
                    aplicacao_obra_funcao: (vinculoGhe || vinculoMapa)
                        ? formatarEscopoParaDidatica(vinculoMapa || vinculoGhe)
                        : '[Lacuna]: Selecionar funções expostas e etapas da tarefa na Aba 2.',
                    caso_real_obra: '',
                    pergunta_debate: '',
                    nota_instrutor: 'Slide em RASCUNHO_PENDENTE_REVISAO. Cita exclusivamente o GHE e/ou Mapa Mental compatíveis vinculados.',
                    referencias: [].concat(refDeVinculo(vinculoGhe), refDeVinculo(vinculoMapa)),
                    origem_geracao: 'MOLDE_PILOTO_RASCUNHO',
                    status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO',
                    editado_manual: false
                }, 1),

                sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    ordem: 3,
                    layout: 'DEBATE_CASO_REAL',
                    secao_norma: 'NR-35 • 3. Cenário Operacional e Regras da Engenharia',
                    titulo: 'Aplicação nas 5 Fases Operacionais da Frente e Controles da APR',
                    objetivo_didatico: '[Rascunho — cruzar o cenário real da frente com as regras aprovadas pela Engenharia]',
                    topicos: (vinculoCenario || vinculoRegra)
                        ? [
                            vinculoCenario ? ('Cenário vinculado: ' + limparTexto(vinculoCenario.trecho_capturado, 320)) : 'Cenário ainda não vinculado.',
                            vinculoRegra ? ('Regra aprovada vinculada: ' + limparTexto(vinculoRegra.trecho_capturado, 320)) : 'Nenhuma regra aprovada vinculada ainda.'
                        ]
                        : [
                            '[Rascunho aguardando vínculo]: Vincule na Aba 2 um Cenário Operacional, Regra Aprovada ou APR da frente.'
                        ],
                    aplicacao_obra_funcao: '',
                    caso_real_obra: vinculoCenario ? limparTexto(vinculoCenario.trecho_capturado, 450) : '[Lacuna]: Descrever ou vincular o cenário real da frente de serviço.',
                    pergunta_debate: '[Lacuna opcional]: Inserir pergunta prática para debate com a turma.',
                    nota_instrutor: 'Slide em RASCUNHO_PENDENTE_REVISAO.',
                    referencias: [].concat(refDeVinculo(vinculoCenario), refDeVinculo(vinculoRegra)),
                    origem_geracao: 'MOLDE_PILOTO_RASCUNHO',
                    status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO',
                    editado_manual: false
                }, 2),

                sanitizarSlideEstrutura({
                    id: gerarId('slide'),
                    ordem: 4,
                    layout: 'PADRAO_TOPICOS',
                    secao_norma: 'NR-35 • 4. Procedimento de Emergência (PAE) & Fechamento',
                    titulo: 'Resposta a Emergências, Resgate e Verificação de Entendimento',
                    objetivo_didatico: '[Rascunho — definir fluxo de emergência e resgate aplicável à frente]',
                    topicos: [
                        '[Lacuna para preenchimento da Engenharia]: Informar recursos de resgate, canal de comunicação e responsáveis do PAE na frente.',
                        '[Observação de Governança]: Apresentação didática não substitui APR/PT nem gera lista de presença ou certificado automaticamente.'
                    ],
                    aplicacao_obra_funcao: '',
                    caso_real_obra: '',
                    pergunta_debate: '',
                    nota_instrutor: 'Slide em RASCUNHO_PENDENTE_REVISAO. Edite e salve cada slide para marcá-lo como REVISADO_ENGENHARIA antes de homologar a apresentação.',
                    referencias: [],
                    origem_geracao: 'MOLDE_PILOTO_RASCUNHO',
                    status_revisao_slide: 'RASCUNHO_PENDENTE_REVISAO',
                    editado_manual: false
                }, 3)
            ];

            estadoApres.apresentacoes.unshift(ap);
            estadoApres.apresentacaoSelecionadaId = ap.id;
            estadoApres.slideSelecionadoId = ap.slides[0].id;
            return clonarProfundo(ap);
        });
    }

    // =========================================================================
    // 8. PONTE SOB DEMANDA COM NOTEBOOKLM / IA EXTERNA (P2 E P1-E CORRIGIDOS)
    // =========================================================================
    // P1-F: Apenas decisões com evidência explícita de aprovação/validação na origem
    // (regra APROVADO na Inteligência SST, decisão de Mapa Mental CONFIRMADO/ACEITA/ACEITA_COM_EDICAO,
    // ou fonte_colada formalmente validada por perfil Validador) contam como decisão formalmente validada.
    // Fontes coladas por editor comum, GHEs cadastrados, modelos de APR ou mapas gerais entram como
    // fontes documentais/contextos cadastrados, nunca como decisão formalmente validada!
    function fonteEhDecisaoFormalmenteValidada(fv) {
        if (!fv) return false;
        var st = String(fv.status_origem_na_captura || '').toUpperCase();
        if (fv.tipo === 'regra') return st === 'APROVADO';
        if (fv.tipo === 'decisao_mapa') return st === 'CONFIRMADO' || st === 'ACEITA' || st === 'ACEITA_COM_EDICAO';
        if (fv.tipo === 'fonte_colada') return st === 'VALIDADO_ENGENHARIA_SST';
        return st === 'APROVADO' || st === 'VALIDADO_ENGENHARIA_SST';
    }

    function gerarPacoteExternoApresentacao(apresentacaoId, objetivoPedido, opcoesPacote) {
        garantirEstadoSessaoApres();
        var ap = buscarApresentacaoPorId(apresentacaoId || estadoApres.apresentacaoSelecionadaId);
        if (!ap) {
            throw new Error('Selecione uma apresentação antes de gerar o pacote para NotebookLM / IA externa.');
        }

        var diag = diagnosticarEvolucaoApresentacao(ap);
        var idsRevogadosOuExcluidos = new Set(
            diag.fontes_alteradas_ou_revogadas
                .filter(function (fa) { return fa.situacao === 'ORIGEM_REVOGADA' || fa.situacao === 'ORIGEM_EXCLUIDA_OU_INDISPONIVEL'; })
                .map(function (fa) { return fa.id_vinculo; })
        );

        var somenteValidadas = Boolean(opcoesPacote && opcoesPacote.somenteFontesValidadas);

        // P2: Filtra fontes dispensadas e exclui fontes revogadas/excluídas na origem para não enviar regra revogada como válida!
        var fontesCandidatas = (ap.fontes_vinculadas || []).filter(function (f) {
            if (f.uso_na_aula === 'DISPENSADO_NESTA_AULA') return false;
            if (idsRevogadosOuExcluidos.has(f.id_vinculo)) return false;
            if (somenteValidadas && !fonteEhDecisaoFormalmenteValidada(f)) return false;
            return true;
        });

        var FontesValidasSeparadas = fontesCandidatas.filter(fonteEhDecisaoFormalmenteValidada);
        var FontesRascunhoSeparadas = fontesCandidatas.filter(function (f) { return !fonteEhDecisaoFormalmenteValidada(f); });

        function formatarListaFontesPrompt(lista, rotuloSecao) {
            if (lista.length === 0) return 'Nenhuma fonte nesta categoria (' + rotuloSecao + ').';
            return lista.map(function (f, i) {
                return (i + 1) + '. [id_vinculo: ' + f.id_vinculo + '] (' + f.modulo_origem +
                    ' | Status na origem: ' + f.status_origem_na_captura +
                    ' | Natureza: ' + f.tipo_acao_origem + ')\n' +
                    '   Título: ' + sanitizarPadroesSensiveisRegex(f.titulo) + '\n' +
                    '   Escopo: ' + sanitizarPadroesSensiveisRegex(formatarEscopoParaDidatica(f)) + '\n' +
                    '   Conteúdo capturado: ' + sanitizarPadroesSensiveisRegex(f.trecho_capturado);
            }).join('\n\n');
        }

        var slidesAtuaisTxt = (ap.slides || []).map(function (s) {
            var refsIds = (s.referencias || []).map(function (r) { return r.id_vinculo; }).join(', ');
            return '- Slide #' + s.ordem + ' [id: ' + s.id + '] (Layout: ' + s.layout + ' | Status: ' + s.status_revisao_slide + '): ' +
                sanitizarPadroesSensiveisRegex(s.titulo) +
                (refsIds ? ' | Fontes citadas: [' + refsIds + ']' : '');
        }).join('\n') || 'Nenhum slide cadastrado ainda.';

        var pedidoExtra = sanitizarPadroesSensiveisRegex(limparTexto(objetivoPedido || '', 800));

        var prompt = [
            '=== PACOTE DE FONTES DA OBRA PARA APRESENTAÇÃO SST (ESTUDO NO NOTEBOOKLM OU ESTRUTURAÇÃO JSON) ===',
            'Aviso de Privacidade Honestamente Declarado: padrões de CPF, CNPJ, e-mail e telefone foram mascarados automaticamente por regex, e listas de efetivo não são incluídas. Revise o texto abaixo antes de colar em serviços externos caso tenha digitado nomes próprios em campos de texto livre.',
            'Nota sobre Interoperabilidade: No NotebookLM, use este pacote como fonte de estudo/caderno. Se desejar importar slides diretamente para o Molde Visual Institucional do painel, solicite ou formate a saída no contrato JSON da seção 6.',
            '',
            '1. IDENTIFICAÇÃO DA AULA NO PAINEL:',
            '- Código/Revisão: ' + ap.codigo + ' (' + ap.revisao_id + ' • v' + ap.versao + ')',
            '- Norma / Tema: ' + sanitizarPadroesSensiveisRegex(ap.norma_referencia) + ' — ' + sanitizarPadroesSensiveisRegex(ap.titulo),
            '- Público-Alvo / Funções: ' + sanitizarPadroesSensiveisRegex(ap.publico_alvo),
            '- Carga Horária: ' + sanitizarPadroesSensiveisRegex(ap.carga_horaria),
            '- Frente / Obra: ' + sanitizarPadroesSensiveisRegex(ap.frente_obra),
            pedidoExtra ? ('- Objetivo específico solicitado pelo Engenheiro: ' + pedidoExtra) : '',
            '',
            '2. FONTES E DECISÕES FORMALMENTE VALIDADAS / OFICIAIS (' + FontesValidasSeparadas.length + '):',
            formatarListaFontesPrompt(FontesValidasSeparadas, 'Fontes Validadas'),
            '',
            '3. FONTES DE CONTEXTO EM RASCUNHO / EM ELABORAÇÃO — TRATAR COMO HIPÓTESE ATÉ VALIDAÇÃO (' + FontesRascunhoSeparadas.length + '):',
            formatarListaFontesPrompt(FontesRascunhoSeparadas, 'Fontes em Rascunho'),
            '',
            '4. ESTRUTURA ATUAL DE SLIDES DA APRESENTAÇÃO:',
            slidesAtuaisTxt,
            '',
            '5. REGRAS TÉCNICAS OBRIGATÓRIAS DE SST:',
            '- Não invente CAs, limites de tolerância, códigos oficiais ou prazos não respaldados pelas fontes.',
            '- Respeite a diferenciação por Função × Etapa: itens marcados como RESTRICAO_ESCOPO representam exclusão/restrição e NUNCA devem ser transformados em obrigação genérica para funções não expostas.',
            '- Não trate fontes da seção 3 (rascunho) como regra aprovada.',
            '- O molde visual institucional (bordas, logo, cabeçalho e rodapé) é aplicado pelo sistema.',
            '',
            '6. CONTRATO JSON PARA IMPORTAÇÃO NO PAINEL:',
            '```json',
            '{',
            '  "slides": [',
            '    {',
            '      "id": "opcional_id_do_slide_existente_ou_vazio_para_novo",',
            '      "layout": "PADRAO_TOPICOS | APLICACAO_OBRA_FUNCAO | DEBATE_CASO_REAL | SINTESE_NORMATIVA",',
            '      "secao_norma": "Ex.: NR-35 • Sistemas de Ancoragem",',
            '      "titulo": "Título objetivo do slide",',
            '      "objetivo_didatico": "O que o trabalhador deve aprender neste slide",',
            '      "topicos": ["Tópico curto 1 projetado na tela", "Tópico curto 2 projetado na tela"],',
            '      "aplicacao_obra_funcao": "Opcional: diferenciação por função e etapa na obra",',
            '      "caso_real_obra": "Opcional: situação real das 5 fases ou APR da frente",',
            '      "pergunta_debate": "Opcional: pergunta prática para debate com a turma",',
            '      "nota_instrutor": "Orientação exclusiva para o instrutor (oculta na projeção limpa)",',
            '      "id_vinculos_referencia": ["id_vinculo_exato_das_secoes_2_ou_3"]',
            '    }',
            '  ]',
            '}',
            '```'
        ].filter(Boolean).join('\n');

        return {
            apresentacao_id: ap.id,
            codigo: ap.codigo,
            total_fontes_incluidas: fontesCandidatas.length,
            total_fontes_validadas: FontesValidasSeparadas.length,
            total_fontes_rascunho: FontesRascunhoSeparadas.length,
            total_fontes_revogadas_omitidas: idsRevogadosOuExcluidos.size,
            prompt: prompt
        };
    }

    function extrairJsonDeTextoLivre(textoBruto) {
        var texto = String(textoBruto || '').trim();
        if (!texto) {
            throw new Error('Cole a resposta JSON antes de analisar a prévia.');
        }
        var bytes = medirBytesUtf8(texto);
        if (bytes > LIMITE_BYTES_IMPORT_JSON_APRES) {
            throw new Error('O texto colado excede o limite de segurança de 35 KB (' + (bytes / 1024).toFixed(1) + ' KB).');
        }

        var candidato = texto;
        var matchBloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (matchBloco && matchBloco[1]) {
            candidato = matchBloco[1].trim();
        } else {
            var iniObj = texto.indexOf('{');
            var fimObj = texto.lastIndexOf('}');
            var iniArr = texto.indexOf('[');
            var fimArr = texto.lastIndexOf(']');
            if (iniObj >= 0 && fimObj > iniObj && (iniArr < 0 || iniObj < iniArr)) {
                candidato = texto.slice(iniObj, fimObj + 1);
            } else if (iniArr >= 0 && fimArr > iniArr) {
                candidato = texto.slice(iniArr, fimArr + 1);
            }
        }

        try {
            return JSON.parse(candidato);
        } catch (e) {
            throw new Error('Não foi possível interpretar o JSON de slides. Verifique se a resposta segue o formato {"slides": [...]}.');
        }
    }

    function analisarImportacaoExternaApresentacao(apresentacaoId, textoBruto) {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('editor', 'analisar importação externa de slides');
        var ap = buscarApresentacaoPorId(apresentacaoId || estadoApres.apresentacaoSelecionadaId);
        if (!ap) throw new Error('Apresentação não encontrada.');

        var parsed = extrairJsonDeTextoLivre(textoBruto);
        if (parsed && parsed.formato && parsed.formato !== 'apresentacoes_sst_slides_externos_v1') {
            throw new Error('Formato de arquivo incompatível para importação de slides: ' + parsed.formato);
        }

        var listaBruta = Array.isArray(parsed)
            ? parsed
            : (parsed && Array.isArray(parsed.slides) ? parsed.slides : null);
        if (!listaBruta || listaBruta.length === 0) {
            throw new Error('O JSON informado não contém uma lista "slides" válida.');
        }
        if (listaBruta.length > LIMITE_MAX_SLIDES_POR_APRES) {
            throw new Error('A resposta excede o limite máximo de ' + LIMITE_MAX_SLIDES_POR_APRES + ' slides.');
        }

        var mapaVinculosValidos = new Map();
        (ap.fontes_vinculadas || []).forEach(function (fv) {
            if (fv.uso_na_aula !== 'DISPENSADO_NESTA_AULA') {
                mapaVinculosValidos.set(fv.id_vinculo, fv);
            }
        });

        var slidesExistentesPorId = new Map();
        (ap.slides || []).forEach(function (sl) {
            slidesExistentesPorId.set(sl.id, sl);
        });

        var itensPrevia = [];
        var avisos = [];

        listaBruta.forEach(function (item, idx) {
            if (!item || typeof item !== 'object') return;
            var titulo = limparTexto(item.titulo || '', 200);
            if (!titulo) {
                avisos.push('Item #' + (idx + 1) + ' ignorado por não possuir título.');
                return;
            }

            var idAlvo = limparTexto(item.id || item.slide_id || '', 80);
            var slideExistente = idAlvo ? slidesExistentesPorId.get(idAlvo) : null;
            if (idAlvo && !slideExistente) {
                avisos.push('Slide "' + titulo + '": id "' + idAlvo + '" não existe na apresentação atual; será importado como novo slide em rascunho.');
                idAlvo = '';
            }

            var refsSolicitadas = Array.isArray(item.id_vinculos_referencia)
                ? item.id_vinculos_referencia
                : (Array.isArray(item.referencias)
                    ? item.referencias.map(function (r) { return typeof r === 'string' ? r : (r && r.id_vinculo); }).filter(Boolean)
                    : []);

            var refsValidas = [];
            var refsDesconhecidas = [];
            refsSolicitadas.forEach(function (idV) {
                var limpo = limparTexto(idV, 140);
                var fv = mapaVinculosValidos.get(limpo);
                if (fv) {
                    refsValidas.push(sanitizarReferenciaSlide({
                        id_vinculo: fv.id_vinculo,
                        tipo: fv.tipo,
                        origem_id: fv.origem_id,
                        rotulo_curto: fv.titulo,
                        hash_no_momento_da_citacao: fv.hash_canonico_capturado
                    }));
                } else if (limpo) {
                    refsDesconhecidas.push(limpo);
                }
            });

            if (refsDesconhecidas.length > 0) {
                avisos.push('Slide "' + titulo + '": referências inexistentes descartadas (' + refsDesconhecidas.join(', ') + ').');
            }

            var topicos = Array.isArray(item.topicos)
                ? item.topicos.map(function (t) { return limparTexto(t, 400); }).filter(Boolean).slice(0, 10)
                : [];

            itensPrevia.push({
                acao_importacao: slideExistente ? (slideExistente.editado_manual ? 'ATUALIZAR_EXISTENTE_EDITADO_MANUAL' : 'ATUALIZAR_EXISTENTE') : 'NOVO_SLIDE',
                slide_alvo_id: slideExistente ? slideExistente.id : '',
                editado_manual_no_alvo: !!(slideExistente && slideExistente.editado_manual),
                layout: LAYOUTS_SLIDE_SUPORTADOS.includes(String(item.layout || '').toUpperCase())
                    ? String(item.layout).toUpperCase()
                    : 'PADRAO_TOPICOS',
                secao_norma: limparTexto(item.secao_norma || ap.norma_referencia, 140),
                titulo: titulo,
                objetivo_didatico: limparTexto(item.objetivo_didatico || '', 320),
                topicos: topicos,
                aplicacao_obra_funcao: limparTexto(item.aplicacao_obra_funcao || '', 900),
                caso_real_obra: limparTexto(item.caso_real_obra || '', 700),
                pergunta_debate: limparTexto(item.pergunta_debate || '', 450),
                nota_instrutor: limparTexto(item.nota_instrutor || '', 1400),
                referencias: refsValidas,
                referencias_descartadas: refsDesconhecidas
            });
        });

        if (itensPrevia.length === 0) {
            throw new Error('Nenhum slide válido foi encontrado na resposta colada.');
        }

        var previa = {
            apresentacao_id: ap.id,
            identidade_sessao_na_previa: estadoApres.identidadeChave,
            versao_apresentacao_na_previa: ap.versao,
            gerada_em: new Date().toISOString(),
            total_itens: itensPrevia.length,
            total_atualizacoes_em_manuais: itensPrevia.filter(function (i) { return i.editado_manual_no_alvo; }).length,
            avisos: avisos,
            itens: itensPrevia
        };
        estadoApres.previaImportIa = previa;
        return clonarProfundo(previa);
    }

    function confirmarImportacaoExternaApresentacao(apresentacaoId, opcoesConfirmacao) {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('editor', 'confirmar importação externa de slides');
        var previa = (opcoesConfirmacao && opcoesConfirmacao.previa) || estadoApres.previaImportIa;
        if (!previa || !Array.isArray(previa.itens) || previa.itens.length === 0) {
            throw new Error('Execute a análise de prévia antes de confirmar a importação.');
        }
        // P1-E: Revalida sessão, apresentação alvo e versão capturada na prévia!
        if (previa.identidade_sessao_na_previa && previa.identidade_sessao_na_previa !== estadoApres.identidadeChave) {
            throw new Error('A sessão do usuário mudou após a geração da prévia. Gere uma nova prévia antes de confirmar.');
        }
        var idAlvoConfirm = apresentacaoId || estadoApres.apresentacaoSelecionadaId;
        if (previa.apresentacao_id && String(previa.apresentacao_id) !== String(idAlvoConfirm)) {
            throw new Error('A apresentação selecionada mudou após a prévia. Reanalise a prévia para a apresentação atual.');
        }

        return executarTransacaoApres(function (versoesConhecidas) {
            var ap = exigirApresentacaoEConcorrencia(
                previa.apresentacao_id,
                previa.versao_apresentacao_na_previa,
                versoesConhecidas
            );

            preservarSnapshotAprovadoSeNecessario(ap, 'Importação de slides de IA externa');

            var mapaVinculosAtuais = new Map();
            (ap.fontes_vinculadas || []).forEach(function (fv) {
                if (fv.uso_na_aula !== 'DISPENSADO_NESTA_AULA') {
                    mapaVinculosAtuais.set(fv.id_vinculo, fv);
                }
            });

            var preservarManuais = !(opcoesConfirmacao && opcoesConfirmacao.sobrescreverSlidesManuais === true);
            var adicionados = 0;
            var atualizados = 0;
            var preservadosComoCopia = 0;

            previa.itens.forEach(function (it) {
                var refsRevalidadas = (it.referencias || []).filter(function (r) {
                    return mapaVinculosAtuais.has(r.id_vinculo);
                });

                var existente = it.slide_alvo_id
                    ? ap.slides.find(function (s) { return s.id === it.slide_alvo_id; })
                    : null;

                if (existente && existente.editado_manual && preservarManuais) {
                    if (ap.slides.length < LIMITE_MAX_SLIDES_POR_APRES) {
                        ap.slides.push(sanitizarSlideEstrutura({
                            id: gerarId('slide'),
                            ordem: ap.slides.length + 1,
                            layout: it.layout,
                            secao_norma: it.secao_norma,
                            titulo: '[Sugestão IA p/ Revisão] ' + it.titulo,
                            objetivo_didatico: it.objetivo_didatico,
                            topicos: it.topicos,
                            aplicacao_obra_funcao: it.aplicacao_obra_funcao,
                            caso_real_obra: it.caso_real_obra,
                            pergunta_debate: it.pergunta_debate,
                            nota_instrutor: it.nota_instrutor,
                            referencias: refsRevalidadas,
                            origem_geracao: 'EXTERNO_IMPORTADO_RASCUNHO',
                            status_revisao_slide: 'RASCUNHO_EXTERNO_PENDENTE',
                            editado_manual: false
                        }, ap.slides.length));
                        preservadosComoCopia += 1;
                    }
                    return;
                }

                if (existente) {
                    existente.layout = it.layout;
                    existente.secao_norma = it.secao_norma;
                    existente.titulo = it.titulo;
                    existente.objetivo_didatico = it.objetivo_didatico;
                    existente.topicos = it.topicos;
                    existente.aplicacao_obra_funcao = it.aplicacao_obra_funcao;
                    existente.caso_real_obra = it.caso_real_obra;
                    existente.pergunta_debate = it.pergunta_debate;
                    existente.nota_instrutor = it.nota_instrutor;
                    existente.referencias = refsRevalidadas;
                    existente.origem_geracao = 'EXTERNO_IMPORTADO_RASCUNHO';
                    existente.status_revisao_slide = 'RASCUNHO_EXTERNO_PENDENTE';
                    existente.editado_manual = false;
                    atualizados += 1;
                } else {
                    if (ap.slides.length >= LIMITE_MAX_SLIDES_POR_APRES) {
                        throw new Error('Limite máximo de ' + LIMITE_MAX_SLIDES_POR_APRES + ' slides atingido durante a importação.');
                    }
                    ap.slides.push(sanitizarSlideEstrutura({
                        id: gerarId('slide'),
                        ordem: ap.slides.length + 1,
                        layout: it.layout,
                        secao_norma: it.secao_norma,
                        titulo: it.titulo,
                        objetivo_didatico: it.objetivo_didatico,
                        topicos: it.topicos,
                        aplicacao_obra_funcao: it.aplicacao_obra_funcao,
                        caso_real_obra: it.caso_real_obra,
                        pergunta_debate: it.pergunta_debate,
                        nota_instrutor: it.nota_instrutor,
                        referencias: refsRevalidadas,
                        origem_geracao: 'EXTERNO_IMPORTADO_RASCUNHO',
                        status_revisao_slide: 'RASCUNHO_EXTERNO_PENDENTE',
                        editado_manual: false
                    }, ap.slides.length));
                    adicionados += 1;
                }
            });

            ap.slides.forEach(function (s, i) { s.ordem = i + 1; });
            if (ap.status !== 'EM_REVISAO') {
                ap.status = 'RASCUNHO';
            }
            ap.versao += 1;
            ap.atualizado_em = new Date().toISOString();
            estadoApres.previaImportIa = null;
            estadoApres.textoImportIaDraft = '';
            sincronizarSlideSelecionado();

            return {
                apresentacao_id: ap.id,
                status_apresentacao: ap.status,
                adicionados: adicionados,
                atualizados: atualizados,
                preservadosComoCopia: preservadosComoCopia,
                total_slides: ap.slides.length
            };
        });
    }

    // =========================================================================
    // 9. BACKUP E RESTAURAÇÃO COMPLETA (.JSON) INCLUINDO REVISÕES APROVADAS
    // =========================================================================
    function gerarBackupApresentacoesLocais() {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('leitor', 'exportar backup de apresentações');
        var agora = new Date().toISOString();
        var payload = {
            formato: FORMATO_BACKUP_APRES,
            versaoEsquema: VERSAO_ESQUEMA_APRES,
            exportadoEm: agora,
            identidadeOrigem: estadoApres.identidadeChave,
            totalApresentacoes: estadoApres.apresentacoes.length,
            apresentacoes: clonarProfundo(estadoApres.apresentacoes)
        };
        var json = JSON.stringify(payload);
        var dataCurta = agora.slice(0, 10);
        return {
            formato: FORMATO_BACKUP_APRES,
            nomeArquivo: 'backup-apresentacoes-sst-' + dataCurta + '.json',
            bytes: medirBytesUtf8(json),
            totalApresentacoes: estadoApres.apresentacoes.length,
            json: json,
            payload: payload
        };
    }

    function registrarBackupApresentacoesExportado() {
        garantirEstadoSessaoApres();
        var agora = new Date().toISOString();
        executarTransacaoApres(function () {
            estadoApres.ultimoBackupEm = agora;
            estadoApres.alteracoesAposBackup = false;
        }, { preservarFlagBackup: true });
        return agora;
    }

    function analisarBackupApresentacoesLocais(textoJson) {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('editor', 'analisar backup de apresentações');
        var bruto = String(textoJson || '').trim();
        if (!bruto) throw new Error('Selecione ou cole um arquivo JSON de backup de Apresentações SST.');
        if (medirBytesUtf8(bruto) > LIMITE_BYTES_STORAGE_APRES * 2) {
            throw new Error('Arquivo de backup excede o limite de segurança.');
        }

        var parsed = null;
        try {
            parsed = JSON.parse(bruto);
        } catch (e) {
            throw new Error('JSON de backup inválido ou corrompido.');
        }

        if (!parsed || typeof parsed !== 'object' || parsed.formato !== FORMATO_BACKUP_APRES) {
            var fmt = parsed && parsed.formato ? String(parsed.formato) : 'desconhecido';
            throw new Error('Formato de backup incompatível ("' + fmt + '"). Este módulo aceita exclusivamente "' + FORMATO_BACKUP_APRES + '".');
        }
        if (Number(parsed.versaoEsquema) !== VERSAO_ESQUEMA_APRES) {
            throw new Error('Versão de esquema incompatível (' + parsed.versaoEsquema + ').');
        }
        if (!Array.isArray(parsed.apresentacoes)) {
            throw new Error('O backup não contém a lista "apresentacoes".');
        }

        var validas = [];
        parsed.apresentacoes.forEach(function (a, i) {
            var san = sanitizarApresentacaoEstrutura(a);
            if (!san) {
                throw new Error('Apresentação inválida na posição #' + (i + 1) + ' do backup.');
            }
            if (san.status === 'APROVADO_ENGENHARIA') {
                san.status = 'EM_REVISAO';
                san.aprovado_em = '';
                san.aprovado_por = '';
            }
            validas.push(san);
        });

        var conflitos = [];
        validas.forEach(function (v) {
            var local = estadoApres.apresentacoes.find(function (l) {
                return l.id === v.id || normalizarChaveComparacao(l.codigo) === normalizarChaveComparacao(v.codigo);
            });
            if (local) {
                var hashLocal = calcularHashCanonico({ titulo: local.titulo, slides: local.slides, fontes: local.fontes_vinculadas, revs: local.revisoes_aprovadas });
                var hashBkp = calcularHashCanonico({ titulo: v.titulo, slides: v.slides, fontes: v.fontes_vinculadas, revs: v.revisoes_aprovadas });
                if (hashLocal !== hashBkp) {
                    conflitos.push({
                        id_local: local.id,
                        id_backup: v.id,
                        codigo: v.codigo,
                        titulo: v.titulo
                    });
                }
            }
        });

        var previa = {
            formato: FORMATO_BACKUP_APRES,
            totalNoArquivo: validas.length,
            totalAtuais: estadoApres.apresentacoes.length,
            conflitos: conflitos,
            apresentacoesSanitizadas: validas
        };
        estadoApres.previaBackup = previa;
        return clonarProfundo(previa);
    }

    function aplicarRestauracaoBackupApresentacoes(previaInput, opcoes) {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('editor', 'restaurar backup de apresentações');
        var previa = previaInput || estadoApres.previaBackup;
        if (!previa || previa.formato !== FORMATO_BACKUP_APRES || !Array.isArray(previa.apresentacoesSanitizadas)) {
            throw new Error('Analise o backup antes de confirmar a restauração.');
        }
        var modo = String((opcoes && opcoes.modo) || 'mesclar').toLowerCase();
        var politicaConflito = String((opcoes && opcoes.politicaConflito) || '').toLowerCase();

        if (modo === 'substituir' && estadoApres.apresentacoes.length > 0 && !(opcoes && opcoes.backupPrevioConfirmado === true)) {
            throw new Error('Para substituir o caderno atual de apresentações, é obrigatório confirmar e baixar a cópia de segurança prévia.');
        }

        return executarTransacaoApres(function () {
            if (modo === 'substituir') {
                if (previa.apresentacoesSanitizadas.length > LIMITE_MAX_APRESENTACOES) {
                    throw new Error('O backup excede o limite de ' + LIMITE_MAX_APRESENTACOES + ' apresentações.');
                }
                estadoApres.apresentacoes = clonarProfundo(previa.apresentacoesSanitizadas);
                estadoApres.apresentacaoSelecionadaId = estadoApres.apresentacoes[0] ? estadoApres.apresentacoes[0].id : '';
                sincronizarSlideSelecionado();
                return {
                    modo: 'substituir',
                    totalFinal: estadoApres.apresentacoes.length
                };
            }

            if (Array.isArray(previa.conflitos) && previa.conflitos.length > 0 && !['manter_existente', 'substituir_versao', 'restaurar_copia'].includes(politicaConflito)) {
                throw new Error('Há ' + previa.conflitos.length + ' apresentação(ões) com conflito de código/ID. Escolha a política de conflito (manter_existente, substituir_versao ou restaurar_copia).');
            }

            var listaResultante = clonarProfundo(estadoApres.apresentacoes);
            var adicionadas = 0;
            var substituidas = 0;

            previa.apresentacoesSanitizadas.forEach(function (itemBkp) {
                var idxExist = listaResultante.findIndex(function (l) {
                    return l.id === itemBkp.id || normalizarChaveComparacao(l.codigo) === normalizarChaveComparacao(itemBkp.codigo);
                });

                if (idxExist < 0) {
                    listaResultante.push(clonarProfundo(itemBkp));
                    adicionadas += 1;
                    return;
                }

                var existente = listaResultante[idxExist];
                var hashLocal = calcularHashCanonico({ titulo: existente.titulo, slides: existente.slides, fontes: existente.fontes_vinculadas, revs: existente.revisoes_aprovadas });
                var hashBkp = calcularHashCanonico({ titulo: itemBkp.titulo, slides: itemBkp.slides, fontes: itemBkp.fontes_vinculadas, revs: itemBkp.revisoes_aprovadas });
                if (hashLocal === hashBkp) {
                    return;
                }

                if (politicaConflito === 'manter_existente') {
                    return;
                }
                if (politicaConflito === 'substituir_versao') {
                    var subst = clonarProfundo(itemBkp);
                    subst.id = existente.id;
                    listaResultante[idxExist] = subst;
                    substituidas += 1;
                    return;
                }
                if (politicaConflito === 'restaurar_copia') {
                    var copia = clonarProfundo(itemBkp);
                    copia.id = gerarId('apres');
                    copia.codigo = limparTexto(copia.codigo + '-COPIA', 40);
                    copia.titulo = limparTexto(copia.titulo + ' (Cópia Restaurada)', 220);
                    listaResultante.push(copia);
                    adicionadas += 1;
                }
            });

            if (listaResultante.length > LIMITE_MAX_APRESENTACOES) {
                throw new Error('A mesclagem excede o limite de ' + LIMITE_MAX_APRESENTACOES + ' apresentações locais (' + listaResultante.length + ').');
            }

            estadoApres.apresentacoes = listaResultante;
            if (!estadoApres.apresentacaoSelecionadaId && estadoApres.apresentacoes[0]) {
                estadoApres.apresentacaoSelecionadaId = estadoApres.apresentacoes[0].id;
            }
            sincronizarSlideSelecionado();
            return {
                modo: 'mesclar',
                adicionadas: adicionadas,
                substituidas: substituidas,
                totalFinal: estadoApres.apresentacoes.length
            };
        });
    }

    // =========================================================================
    // 10. MOLDE VISUAL INSTITUCIONAL 16:9 COM COMPOSIÇÃO DISTINTA POR LAYOUT
    // =========================================================================
    function renderizarMoldeSlideInstitucionalHtml(ap, slide, totalSlides, opcoes) {
        if (!ap || !slide) return '';
        var mostrarNota = !!(opcoes && opcoes.mostrarNotaInstrutor);
        var modoImpressao = !!(opcoes && opcoes.modoImpressao);
        var modoProjetor16x9 = !!(opcoes && opcoes.modoProjetor16x9);
        var logoSrc = (typeof window.LOGO_COP_BASE64 === 'string' && window.LOGO_COP_BASE64)
            ? window.LOGO_COP_BASE64
            : ((typeof window.COP_LOGO_BASE64 === 'string' && window.COP_LOGO_BASE64) ? window.COP_LOGO_BASE64 : '');

        var ehRascunho = ap.status !== 'APROVADO_ENGENHARIA' || slide.status_revisao_slide !== 'REVISADO_ENGENHARIA';
        var corBorda = ehRascunho ? '#d97706' : '#1e3a8a';
        var corFaixaTopo = ehRascunho ? 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)' : 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)';

        var logoHtml = logoSrc
            ? '<img src="' + esc(logoSrc) + '" alt="Logo Consórcio" style="height:36px; width:auto; object-fit:contain; background:#fff; padding:2px 6px; border-radius:4px;">'
            : '<div style="font-weight:900; font-size:12px; background:#fff; color:#1e3a8a; padding:4px 8px; border-radius:4px;">SST • PISF</div>';

        var tarjaStatusHtml = (ap.status === 'APROVADO_ENGENHARIA' && slide.status_revisao_slide === 'REVISADO_ENGENHARIA')
            ? '<span style="background:#dcfce7; color:#15803d; border:1px solid #22c55e; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:800;">✅ APROVADO ENGENHARIA SST (' + esc(ap.revisao_id) + ')</span>'
            : '<span style="background:#fef3c7; color:#b45309; border:1px solid #f59e0b; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:800;">⚠️ ' + esc(ap.status) + ' • ' + esc(slide.status_revisao_slide) + ' (' + esc(ap.revisao_id) + ')</span>';

        var tamTitulo = modoImpressao ? '20pt' : (modoProjetor16x9 ? '26px' : '21px');
        var tamTopico = modoImpressao ? '13.5pt' : (modoProjetor16x9 ? '18px' : '15px');

        var topicosHtml = (Array.isArray(slide.topicos) && slide.topicos.length > 0)
            ? '<ul style="margin:6px 0 10px 20px; padding:0; font-size:' + tamTopico + '; line-height:1.55; color:#0f172a;">' +
                slide.topicos.map(function (t) {
                    return '<li style="margin-bottom:6px;">' + esc(t) + '</li>';
                }).join('') +
              '</ul>'
            : '';

        var blocoAplicacaoFuncaoHtml = slide.aplicacao_obra_funcao
            ? '<div class="ap-layout-bloco-funcao" style="padding:12px 14px; border-left:5px solid #0284c7; background:#f0f9ff; border-radius:8px; font-size:' + (modoImpressao ? '11.5pt' : '13.5px') + '; color:#0c4a6e;">' +
                '<div style="font-weight:800; font-size:11.5px; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">👷 Aplicação Real na Obra / Diferenciação por Função &amp; Etapa</div>' +
                '<div style="white-space:pre-line; line-height:1.48;">' + esc(slide.aplicacao_obra_funcao) + '</div>' +
              '</div>'
            : '';

        var blocoCasoRealHtml = slide.caso_real_obra
            ? '<div class="ap-layout-bloco-caso" style="padding:12px 14px; border-left:5px solid #059669; background:#ecfdf5; border-radius:8px; font-size:' + (modoImpressao ? '11.5pt' : '13.5px') + '; color:#065f46;">' +
                '<div style="font-weight:800; font-size:11.5px; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">🏗️ Cenário / Registro Operacional da Frente</div>' +
                '<div style="white-space:pre-line; line-height:1.48;">' + esc(slide.caso_real_obra) + '</div>' +
              '</div>'
            : '';

        var blocoPerguntaHtml = slide.pergunta_debate
            ? '<div class="ap-layout-bloco-pergunta" style="margin-top:10px; padding:10px 14px; border:2px dashed #d97706; background:#fffbeb; border-radius:8px; font-size:' + (modoImpressao ? '11.5pt' : '13.5px') + '; color:#92400e;">' +
                '<b>💬 Pergunta para Debate com a Turma:</b> ' + esc(slide.pergunta_debate) +
              '</div>'
            : '';

        // P2: Composição visual distinta para cada um dos 4 layouts suportados
        var layout = String(slide.layout || 'PADRAO_TOPICOS').toUpperCase();
        var corpoLayoutHtml = '';
        if (layout === 'APLICACAO_OBRA_FUNCAO' && (topicosHtml && blocoAplicacaoFuncaoHtml)) {
            corpoLayoutHtml = '<div class="ap-layout-grid-2col" style="display:grid; grid-template-columns:1.1fr 1fr; gap:16px; align-items:start;">' +
                '<div>' + topicosHtml + '</div>' +
                '<div>' + blocoAplicacaoFuncaoHtml + blocoCasoRealHtml + '</div>' +
            '</div>' + blocoPerguntaHtml;
        } else if (layout === 'DEBATE_CASO_REAL') {
            corpoLayoutHtml = '<div class="ap-layout-debate" style="display:flex; flex-direction:column; gap:10px;">' +
                blocoCasoRealHtml +
                topicosHtml +
                blocoAplicacaoFuncaoHtml +
                blocoPerguntaHtml +
            '</div>';
        } else if (layout === 'SINTESE_NORMATIVA') {
            corpoLayoutHtml = '<div class="ap-layout-normativo" style="padding:10px 14px; border:1px solid #bae6fd; background:#f8fafc; border-radius:8px;">' +
                '<div style="font-size:11px; font-weight:800; color:#0369a1; text-transform:uppercase; margin-bottom:4px;">📌 Diretriz Programática / Normativa</div>' +
                topicosHtml +
                blocoAplicacaoFuncaoHtml +
                blocoCasoRealHtml +
            '</div>' + blocoPerguntaHtml;
        } else {
            corpoLayoutHtml = topicosHtml + blocoAplicacaoFuncaoHtml + blocoCasoRealHtml + blocoPerguntaHtml;
        }

        var refsResumo = (Array.isArray(slide.referencias) && slide.referencias.length > 0)
            ? slide.referencias.map(function (r) { return r.rotulo_curto || r.id_vinculo; }).join(' • ')
            : 'Sem fonte vinculada neste slide (rascunho pendente de citação)';

        var notaInstrutorHtml = (mostrarNota && slide.nota_instrutor)
            ? '<div class="ap-nota-instrutor-box" style="margin-top:10px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; color:#334155; font-size:12px;">' +
                '<div style="font-weight:800; color:#1e3a8a; margin-bottom:3px;">🎙️ Nota Exclusiva do Instrutor (Oculta na Projeção Limpa):</div>' +
                '<div style="white-space:pre-line; line-height:1.45;">' + esc(slide.nota_instrutor) + '</div>' +
              '</div>'
            : '';

        var estiloGeometria16x9 = modoImpressao
            ? (mostrarNota ? 'min-height:132mm;' : 'min-height:168mm;')
            : 'aspect-ratio: 16 / 9; min-height: 450px; width: 100%;';

        return '' +
            '<div class="ap-molde-slide-institucional" data-layout="' + esc(layout) + '" style="border:3px solid ' + corBorda + '; border-radius:12px; background:#ffffff; color:#0f172a; overflow:hidden; box-shadow:0 4px 16px rgba(15,23,42,0.08); display:flex; flex-direction:column; justify-content:space-between; ' + estiloGeometria16x9 + ' box-sizing:border-box;">' +
                '<!-- Cabeçalho Institucional Fixo -->' +
                '<div style="background:' + corFaixaTopo + '; color:#ffffff; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; border-bottom:3px solid #38bdf8;">' +
                    '<div style="display:flex; align-items:center; gap:10px;">' +
                        logoHtml +
                        '<div>' +
                            '<div style="font-size:11px; font-weight:700; opacity:0.92; letter-spacing:0.4px;">' + esc(ap.frente_obra) + ' • ' + esc(ap.responsavel_tecnico) + '</div>' +
                            '<div style="font-size:13px; font-weight:800;">' + esc(ap.norma_referencia) + ' — ' + esc(ap.titulo) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                        tarjaStatusHtml +
                        '<span style="background:rgba(255,255,255,0.18); color:#fff; padding:3px 9px; border-radius:6px; font-size:11.5px; font-weight:800;">Slide ' + esc(slide.ordem) + ' / ' + esc(totalSlides) + '</span>' +
                    '</div>' +
                '</div>' +

                '<!-- Corpo Didático Padronizado 16:9 -->' +
                '<div style="padding:18px 24px; flex:1; display:flex; flex-direction:column; justify-content:flex-start;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">' +
                        '<span style="font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase; letter-spacing:0.5px;">' + esc(slide.secao_norma || ap.norma_referencia) + ' • Layout: ' + esc(layout) + '</span>' +
                    '</div>' +
                    '<h3 style="margin:0 0 8px 0; font-size:' + tamTitulo + '; font-weight:900; color:#0f172a; line-height:1.25;">' + esc(slide.titulo) + '</h3>' +
                    (slide.objetivo_didatico
                        ? '<div style="font-size:12.5px; color:#475569; font-style:italic; margin-bottom:10px;">🎯 Objetivo: ' + esc(slide.objetivo_didatico) + '</div>'
                        : '') +
                    corpoLayoutHtml +
                '</div>' +

                '<!-- Rodapé Técnico Fixo com Citação de Fontes -->' +
                '<div style="background:#f1f5f9; border-top:1px solid #cbd5e1; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; font-size:11px; color:#334155;">' +
                    '<div style="flex:1; min-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                        '<b>📚 Fonte(s) Citada(s):</b> ' + esc(refsResumo) +
                    '</div>' +
                    '<div style="font-weight:700; white-space:nowrap;">' +
                        'Público: ' + esc(ap.publico_alvo || 'A definir') + ' • Código: ' + esc(ap.codigo) + ' (' + esc(ap.revisao_id) + ')' +
                    '</div>' +
                '</div>' +
            '</div>' +
            notaInstrutorHtml;
    }

    function imprimirApresentacaoSst(apresentacaoId, modoImpressao) {
        garantirEstadoSessaoApres();
        exigirPapelMinimo('leitor', 'imprimir apresentação SST');
        var ap = buscarApresentacaoPorId(apresentacaoId || estadoApres.apresentacaoSelecionadaId);
        if (!ap || !Array.isArray(ap.slides) || ap.slides.length === 0) {
            throw new Error('Selecione uma apresentação com slides antes de imprimir.');
        }
        if (typeof window.abrirDocumentoHtmlParaImpressao !== 'function') {
            throw new Error('Mecanismo oficial abrirDocumentoHtmlParaImpressao indisponível.');
        }

        var incluirNotas = String(modoImpressao || 'slides').toLowerCase() === 'apostila';
        var paginasHtml = ap.slides.map(function (sl, idx) {
            var quebra = idx < ap.slides.length - 1 ? 'page-break-after: always; break-after: page;' : '';
            return '<div style="padding:2mm 0; page-break-inside: avoid; break-inside: avoid; ' + quebra + '">' +
                renderizarMoldeSlideInstitucionalHtml(ap, sl, ap.slides.length, {
                    mostrarNotaInstrutor: incluirNotas,
                    modoImpressao: true
                }) +
            '</div>';
        }).join('');

        var tituloDoc = ap.codigo + ' — ' + ap.norma_referencia + ' — ' + ap.titulo + (incluirNotas ? ' (Guia do Instrutor & Apostila)' : ' (Slides 16:9 A4 Paisagem)');
        var htmlCompleto = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
            '<title>' + esc(tituloDoc) + '</title>' +
            '<style>' +
                '@page { size: A4 landscape; margin: 10mm; }' +
                'body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
            '</style></head><body>' +
            paginasHtml +
            '</body></html>';

        window.abrirDocumentoHtmlParaImpressao(htmlCompleto, tituloDoc);
        return { titulo: tituloDoc, totalSlides: ap.slides.length, modo: incluirNotas ? 'apostila' : 'slides' };
    }

    // =========================================================================
    // 11. RENDERIZAÇÃO DA INTERFACE DO MÓDULO (4 ABAS + TECLADO/FULLSCREEN + HISTÓRICO)
    // =========================================================================
    function instalarListenerTecladoProjetor() {
        if (listenerTecladoInstalado || typeof window.addEventListener !== 'function') return;
        listenerTecladoInstalado = true;
        window.addEventListener('keydown', function (ev) {
            if (!ev || estadoApres.abaAtiva !== 'projetor') return;
            var pageEl = typeof document !== 'undefined' && document.getElementById ? document.getElementById('page-apresentacoes_sst') : null;
            if (pageEl && pageEl.classList && typeof pageEl.classList.contains === 'function' && !pageEl.classList.contains('active')) {
                return;
            }
            var tag = ev.target && ev.target.tagName ? String(ev.target.tagName).toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (ev.key === 'ArrowRight') {
                if (typeof ev.preventDefault === 'function') ev.preventDefault();
                navegarSlideProjetorSstUI(1);
            } else if (ev.key === 'ArrowLeft') {
                if (typeof ev.preventDefault === 'function') ev.preventDefault();
                navegarSlideProjetorSstUI(-1);
            }
        });
    }

    function renderApresentacoesSstPanel() {
        garantirEstadoSessaoApres();
        instalarListenerTecladoProjetor();
        var container = document.getElementById('page-apresentacoes_sst');
        if (!container) return;

        var papel = obterPapelApresentacoes();
        if (papel === 'sem_acesso') {
            container.innerHTML = '<div class="db-chart-card" style="padding:20px; color:var(--danger); font-weight:700;">🚫 Você não possui permissão para acessar o módulo Apresentações SST.</div>';
            return;
        }

        var podeEditar = papel === 'editor' || papel === 'validador';
        var ehValidador = papel === 'validador';
        var apAtual = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId) || estadoApres.apresentacoes[0] || null;
        if (apAtual && estadoApres.apresentacaoSelecionadaId !== apAtual.id) {
            estadoApres.apresentacaoSelecionadaId = apAtual.id;
            sincronizarSlideSelecionado();
        }

        var consumo = calcularConsumoBytesApres(estadoApres.apresentacoes);
        var diag = apAtual ? diagnosticarEvolucaoApresentacao(apAtual) : null;
        var ind = diag ? diag.indicadores : {
            total_fontes_vinculadas: 0,
            total_fontes_alteradas_ou_revogadas: 0,
            total_novos_aprendizados_sem_slide: 0,
            total_slides_pendentes_revisao: 0
        };

        var html = '' +
            '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--primary, #2563eb);">' +
                '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">' +
                    '<div>' +
                        '<h2 style="margin:0 0 4px 0; font-size:17px; font-weight:800; color:var(--text);">📽️ Apresentações SST &amp; Elo de Evolução do Conhecimento da Obra</h2>' +
                        '<p style="margin:0; font-size:12px; color:var(--text-light); max-width:960px; line-height:1.45;">' +
                            'Molde visual institucional 16:9 fixo (bordas, logo, cabeçalho e rodapé citado), caderno persistente de fontes e comunicação auditável com <b>Catálogo de Treinamentos</b>, <b>GHE/OS</b>, <b>APR</b>, <b>Cenários/Regras da Engenharia</b> e <b>Mapa Mental SST (Função × Etapa)</b>. ' +
                            '<b>Limites declarados:</b> armazenamento local por conta/navegador (' + esc(consumo.kb + ' KB / ' + consumo.limiteKb + ' KB') + '); reconciliação lê o cache carregado na sessão atual; revisões aprovadas anteriores ficam preservadas de forma imutável.' +
                        '</p>' +
                    '</div>' +
                    '<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">' +
                        (estadoApres.apresentacoes.length > 0 ? (
                            '<select id="apSelectApresentacaoAtiva" class="db-input" onchange="window.selecionarApresentacaoSstUI(this.value)">' +
                                estadoApres.apresentacoes.map(function (a) {
                                    return '<option value="' + esc(a.id) + '"' + (apAtual && a.id === apAtual.id ? ' selected' : '') + '>' +
                                        esc(a.codigo + ' (' + a.revisao_id + ' • ' + a.status + ') — ' + a.norma_referencia + ': ' + a.titulo) +
                                    '</option>';
                                }).join('') +
                            '</select>'
                        ) : '') +
                        (podeEditar ? '<button type="button" class="db-apply-btn" onclick="window.abrirFormApresentacaoSstUI()">➕ Nova Apresentação</button>' : '') +
                        (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.carregarPilotoNr35ApresentacaoSstUI()">⚡ Iniciar Molde Piloto NR-35 (Rascunho)</button>' : '') +
                        '<button type="button" class="db-clear-btn" onclick="window.alternarBoxBackupApresentacoesUI()">📦 Backup</button>' +
                    '</div>' +
                '</div>' +

                '<!-- 4 Indicadores Concretos e Auditáveis de Evolução entre Módulos -->' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(215px, 1fr)); gap:10px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); font-size:11.5px;">' +
                    '<div style="padding:9px 11px; border-radius:8px; background:var(--bg); border:1px solid var(--border); cursor:pointer;" onclick="window.abrirIndicadorEvolucaoApresentacaoUI(\'FONTES\')">' +
                        '<span style="color:var(--text-light); display:block;">1️⃣ Fontes da Obra e da Norma Ligadas</span>' +
                        '<b style="color:var(--primary); font-size:13.5px;">' + ind.total_fontes_vinculadas + ' fonte(s) vinculada(s)</b>' +
                        '<div style="font-size:10.5px; color:var(--text-light);">Clique para inspecionar ID, escopo e hash</div>' +
                    '</div>' +
                    '<div style="padding:9px 11px; border-radius:8px; background:var(--bg); border:1px solid ' + (ind.total_fontes_alteradas_ou_revogadas > 0 ? 'var(--warning, #d97706)' : 'var(--border)') + '; cursor:pointer;" onclick="window.abrirIndicadorEvolucaoApresentacaoUI(\'ALTERADAS\')">' +
                        '<span style="color:var(--text-light); display:block;">2️⃣ Fontes que Mudaram ou Revogadas</span>' +
                        '<b style="color:' + (ind.total_fontes_alteradas_ou_revogadas > 0 ? 'var(--warning, #d97706)' : 'var(--success, #10b981)') + '; font-size:13.5px;">' + ind.total_fontes_alteradas_ou_revogadas + ' atualização(ões) / pendência(s)</b>' +
                        '<div style="font-size:10.5px; color:var(--text-light);">Compara hash da fonte e citação de cada slide</div>' +
                    '</div>' +
                    '<div style="padding:9px 11px; border-radius:8px; background:var(--bg); border:1px solid ' + (ind.total_novos_aprendizados_sem_slide > 0 ? '#0284c7' : 'var(--border)') + '; cursor:pointer;" onclick="window.abrirIndicadorEvolucaoApresentacaoUI(\'NOVOS_APRENDIZADOS\')">' +
                        '<span style="color:var(--text-light); display:block;">3️⃣ Novos Aprendizados Validados s/ Slide</span>' +
                        '<b style="color:#0284c7; font-size:13.5px;">' + ind.total_novos_aprendizados_sem_slide + ' decisão(ões)/regra(s) nova(s)</b>' +
                        '<div style="font-size:10.5px; color:var(--text-light);">Apenas regras APROVADAS e decisões CONFIRMADAS</div>' +
                    '</div>' +
                    '<div style="padding:9px 11px; border-radius:8px; background:var(--bg); border:1px solid ' + (ind.total_slides_pendentes_revisao > 0 ? 'var(--warning, #d97706)' : 'var(--border)') + '; cursor:pointer;" onclick="window.abrirIndicadorEvolucaoApresentacaoUI(\'PENDENTES_REVISAO\')">' +
                        '<span style="color:var(--text-light); display:block;">4️⃣ Slides / Citações Pendentes de Revisão</span>' +
                        '<b style="color:' + (ind.total_slides_pendentes_revisao > 0 ? 'var(--warning, #d97706)' : 'var(--text)') + '; font-size:13.5px;">' + ind.total_slides_pendentes_revisao + ' slide(s) p/ revisão</b>' +
                        '<div style="font-size:10.5px; color:var(--text-light);">Papel: <b>' + esc(papel.toUpperCase()) + '</b> • Revisões aprovadas salvas: <b>' + (apAtual ? (apAtual.revisoes_aprovadas || []).length : 0) + '</b></div>' +
                    '</div>' +
                '</div>' +

                '<!-- Navegação das 4 Subabas do Módulo + Atalhos de Retorno aos Módulos -->' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px;">' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<button type="button" id="btnTabApres-editor" class="' + (estadoApres.abaAtiva === 'editor' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaApresentacoesSstUI(\'editor\')" style="font-weight:700;">1️⃣ Roteiro &amp; Molde Institucional (' + (apAtual ? apAtual.slides.length : 0) + ' slides)</button>' +
                        '<button type="button" id="btnTabApres-fontes_evolucao" class="' + (estadoApres.abaAtiva === 'fontes_evolucao' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaApresentacoesSstUI(\'fontes_evolucao\')" style="font-weight:700;">2️⃣ Caderno de Fontes &amp; Evolução entre Módulos (' + (ind.total_fontes_alteradas_ou_revogadas + ind.total_novos_aprendizados_sem_slide) + ')</button>' +
                        '<button type="button" id="btnTabApres-projetor" class="' + (estadoApres.abaAtiva === 'projetor' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaApresentacoesSstUI(\'projetor\')" style="font-weight:700;">3️⃣ Modo Projetor 16:9 &amp; Impressão A4</button>' +
                        '<button type="button" id="btnTabApres-ponte_ia" class="' + (estadoApres.abaAtiva === 'ponte_ia' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaApresentacoesSstUI(\'ponte_ia\')" style="font-weight:700;">4️⃣ Ponte Sob Demanda (NotebookLM / IA Externa)</button>' +
                    '</div>' +
                    '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                        '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.navegarDeApresentacoesParaModuloUI(\'treinamentos\')">🎓 Ir p/ Catálogo de Treinamentos</button>' +
                        '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.navegarDeApresentacoesParaModuloUI(\'ia_aprendizado\')">🧠 Ir p/ Inteligência SST</button>' +
                        '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.navegarDeApresentacoesParaModuloUI(\'mapa_mental\')">🗺️ Ir p/ Mapa Mental SST</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        html += renderBoxBackupApresentacoesHtml(podeEditar);
        html += renderFormApresentacaoHtml(apAtual, podeEditar);

        if (!apAtual) {
            html += '<div class="db-chart-card" style="text-align:center; padding:28px; color:var(--text-light);">' +
                '<div style="font-size:15px; font-weight:800; color:var(--text); margin-bottom:6px;">Nenhuma Apresentação SST cadastrada neste dispositivo</div>' +
                '<div style="font-size:12.5px; max-width:680px; margin:0 auto 14px auto; line-height:1.5;">' +
                    'Clique em <b>⚡ Iniciar Molde Piloto NR-35 (Rascunho)</b> para abrir o esqueleto estruturado em 4 layouts no Molde Institucional (vinculando automaticamente apenas fontes compatíveis com NR-35/Altura já carregadas e mantendo os quadros como rascunho pendente da sua revisão), ou clique em <b>➕ Nova Apresentação</b>.' +
                '</div>' +
                (podeEditar ? (
                    '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">' +
                        '<button type="button" class="db-apply-btn" onclick="window.carregarPilotoNr35ApresentacaoSstUI()">⚡ Iniciar Molde Piloto NR-35 (Rascunho)</button>' +
                        '<button type="button" class="db-clear-btn" onclick="window.abrirFormApresentacaoSstUI()">➕ Nova Apresentação em Branco</button>' +
                    '</div>'
                ) : '') +
            '</div>';
            container.innerHTML = html;
            return;
        }

        if (estadoApres.abaAtiva === 'fontes_evolucao') {
            html += renderAbaFontesEEvolucaoHtml(apAtual, diag, podeEditar);
        } else if (estadoApres.abaAtiva === 'projetor') {
            html += renderAbaProjetorEImpressaoHtml(apAtual);
        } else if (estadoApres.abaAtiva === 'ponte_ia') {
            html += renderAbaPonteIaExternaHtml(apAtual, podeEditar);
        } else {
            html += renderAbaEditorRoteiroHtml(apAtual, diag, podeEditar, ehValidador);
        }

        container.innerHTML = html;
    }

    function renderBoxBackupApresentacoesHtml(podeEditar) {
        if (!estadoApres.boxBackupAberto) return '';
        var ultTexto = estadoApres.ultimoBackupEm
            ? new Date(estadoApres.ultimoBackupEm).toLocaleString('pt-BR')
            : 'Nenhum backup exportado neste dispositivo';
        var previa = estadoApres.previaBackup;
        var previaHtml = '';
        if (previa) {
            var conflitosHtml = (Array.isArray(previa.conflitos) && previa.conflitos.length > 0)
                ? '<div style="margin-top:8px; padding:8px; border:1px solid var(--warning, #d97706); border-radius:6px; background:var(--bg);">' +
                    '<div style="font-size:11.5px; font-weight:800; color:var(--warning, #d97706);">⚠️ ' + previa.conflitos.length + ' apresentação(ões) com código/ID já existente e conteúdo diferente:</div>' +
                    '<select id="apSelectPoliticaConflitoBackup" class="db-input" style="margin-top:6px;">' +
                        '<option value="manter_existente">Manter versão atual do dispositivo</option>' +
                        '<option value="substituir_versao">Substituir pela versão do backup</option>' +
                        '<option value="restaurar_copia">Restaurar ambos criando cópia</option>' +
                    '</select>' +
                  '</div>'
                : '';
            previaHtml = '<div style="margin-top:10px; padding:10px; border:1px solid var(--primary); border-radius:8px; background:var(--bg);">' +
                '<div style="font-size:12px; font-weight:800;">🔎 Prévia do Backup: ' + previa.totalNoArquivo + ' apresentação(ões) válida(s) (status restaurado como RASCUNHO/EM_REVISAO; snapshots aprovados preservados)</div>' +
                conflitosHtml +
                '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarRestauracaoBackupApresentacoesUI(\'mesclar\')">➕ Mesclar às Apresentações Atuais</button>' +
                    '<button type="button" class="db-clear-btn" style="color:var(--danger);" onclick="window.confirmarRestauracaoBackupApresentacoesUI(\'substituir\')">♻️ Baixar Cópia de Segurança e Substituir Tudo</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarPreviaBackupApresentacoesUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        return '<div class="db-chart-card" style="margin-bottom:14px; border:1px solid var(--border);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                '<div><b>📦 Backup Local de Apresentações SST (<code>' + FORMATO_BACKUP_APRES + '</code>)</b>' +
                '<div style="font-size:11px; color:var(--text-light);">Último backup: ' + esc(ultTexto) + (estadoApres.alteracoesAposBackup ? ' • ⚠️ Há alterações posteriores não exportadas' : '') + '</div></div>' +
                '<button type="button" class="db-apply-btn" onclick="window.exportarBackupApresentacoesUI()">⬇️ Exportar Backup (.json)</button>' +
            '</div>' +
            (podeEditar ? (
                '<div style="margin-top:8px;">' +
                    '<input type="file" accept=".json,application/json" onchange="window.lerArquivoBackupApresentacoesUI(this)" style="font-size:11px; margin-bottom:6px;">' +
                    '<textarea id="apTextareaBackupJson" class="db-input" rows="3" style="width:100%; font-size:11px;" oninput="window.atualizarRascunhoBackupApresentacoesUI(this.value)" placeholder="Ou cole aqui o JSON de backup apresentacoes_sst_backup_v1...">' + esc(estadoApres.textoBackupDraft || '') + '</textarea>' +
                    '<div style="margin-top:6px;"><button type="button" class="db-clear-btn" onclick="window.preVisualizarBackupApresentacoesUI()">👁️ Analisar Backup</button></div>' +
                    previaHtml +
                '</div>'
            ) : '') +
        '</div>';
    }

    function renderFormApresentacaoHtml(apAtual, podeEditar) {
        if (!estadoApres.formApresentacaoAberto || !podeEditar) return '';
        var ehEditar = estadoApres.formApresentacaoAberto.modo === 'editar' && apAtual;
        var alvo = ehEditar ? apAtual : null;
        var fontesVivas = lerFontesDisponiveisNosModulos();

        return '<div class="db-chart-card" style="margin-bottom:14px; border:2px solid var(--primary);">' +
            '<h3 style="margin:0 0 8px 0; font-size:14px;">' + (ehEditar ? '✏️ Editar Metadados da Apresentação (' + esc(alvo.codigo) + ' • v' + esc(alvo.versao) + ')' : '➕ Nova Apresentação SST Conectada aos Módulos') + '</h3>' +
            '<input type="hidden" id="apForm_versaoEsperada" value="' + esc(estadoApres.formApresentacaoAberto.versaoEsperada || (alvo ? alvo.versao : '')) + '">' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px;">' +
                '<div><label style="font-size:11px; font-weight:700;">Norma / Referência *</label><input type="text" id="apForm_norma" class="db-input" style="width:100%;" value="' + esc(alvo ? alvo.norma_referencia : 'NR-35') + '" placeholder="Ex.: NR-35, NR-33, NR-01"></div>' +
                '<div style="grid-column:span 2;"><label style="font-size:11px; font-weight:700;">Título da Apresentação / Aula *</label><input type="text" id="apForm_titulo" class="db-input" style="width:100%;" value="' + esc(alvo ? alvo.titulo : '') + '" placeholder="Ex.: Trabalho em Altura em Estruturas e Taludes"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Carga Horária</label><input type="text" id="apForm_carga" class="db-input" style="width:100%;" value="' + esc(alvo ? alvo.carga_horaria : '') + '"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Público-Alvo / Funções</label><input type="text" id="apForm_publico" class="db-input" style="width:100%;" value="' + esc(alvo ? alvo.publico_alvo : '') + '"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Frente / Obra</label><input type="text" id="apForm_frente" class="db-input" style="width:100%;" value="' + esc(alvo ? alvo.frente_obra : 'Consórcio Operador — PISF Ramal do Agreste') + '"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Curso do Catálogo Vinculado (Explícito)</label>' +
                    '<select id="apForm_cursoCat" class="db-input" style="width:100%;"><option value="">-- Nenhum selecionado --</option>' +
                    fontesVivas.catalogo.map(function (c) {
                        var sel = alvo && String(alvo.curso_catalogo_id) === String(c.origem_id) ? ' selected' : '';
                        return '<option value="' + esc(c.origem_id) + '"' + sel + '>' + esc(c.titulo) + '</option>';
                    }).join('') +
                    '</select></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Cenário da Inteligência SST Vinculado (Explícito)</label>' +
                    '<select id="apForm_cenarioIa" class="db-input" style="width:100%;"><option value="">-- Nenhum selecionado --</option>' +
                    fontesVivas.cenario.map(function (c) {
                        var sel = alvo && String(alvo.cenario_ia_id) === String(c.origem_id) ? ' selected' : '';
                        return '<option value="' + esc(c.origem_id) + '"' + sel + '>' + esc(c.titulo) + '</option>';
                    }).join('') +
                    '</select></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Mapa Mental SST Vinculado (Explícito)</label>' +
                    '<select id="apForm_mapaMental" class="db-input" style="width:100%;"><option value="">-- Nenhum selecionado --</option>' +
                    fontesVivas.mapa.map(function (m) {
                        var sel = alvo && String(alvo.mapa_mental_id) === String(m.origem_id) ? ' selected' : '';
                        return '<option value="' + esc(m.origem_id) + '"' + sel + '>' + esc(m.titulo) + '</option>';
                    }).join('') +
                    '</select></div>' +
            '</div>' +
            '<div style="display:flex; gap:8px; margin-top:10px;">' +
                '<button type="button" class="db-apply-btn" onclick="window.salvarFormApresentacaoSstUI()">💾 Salvar Apresentação</button>' +
                '<button type="button" class="db-clear-btn" onclick="window.fecharFormApresentacaoSstUI()">Cancelar</button>' +
            '</div>' +
        '</div>';
    }

    function renderAbaEditorRoteiroHtml(ap, diag, podeEditar, ehValidador) {
        var slideAtual = ap.slides.find(function (s) { return s.id === estadoApres.slideSelecionadoId; }) || ap.slides[0] || null;
        var ind = diag ? diag.indicadores : {};
        var alertaEvolucaoBanner = '';

        if ((ind.total_fontes_alteradas_ou_revogadas > 0 || ind.total_novos_aprendizados_sem_slide > 0)) {
            alertaEvolucaoBanner = '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid #0284c7; background:rgba(2,132,199,0.06);">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div style="font-size:12px;">' +
                        '<b>⚡ Evolução detectada nos módulos vinculados da obra:</b> ' +
                        (ind.total_novos_aprendizados_sem_slide > 0 ? '<b>' + ind.total_novos_aprendizados_sem_slide + '</b> novo(s) aprendizado(s) validado(s) ainda sem slide ' : '') +
                        (ind.total_fontes_alteradas_ou_revogadas > 0 ? '• <b>' + ind.total_fontes_alteradas_ou_revogadas + '</b> fonte(s) vinculada(s) atualizada(s)/revogada(s) ou com slides pendentes de revisão' : '') +
                        '. A revisão homologada permanece preservada.' +
                    '</div>' +
                    '<button type="button" class="db-apply-btn" onclick="window.selecionarAbaApresentacoesSstUI(\'fontes_evolucao\')">🔎 Revisar e Incorporar na Aba 2</button>' +
                '</div>' +
            '</div>';
        }

        // Painel de revisões aprovadas imutáveis preservadas (quando existir revisão histórica)
        var boxRevisoesAprovadasHtml = '';
        if (Array.isArray(ap.revisoes_aprovadas) && ap.revisoes_aprovadas.length > 0) {
            boxRevisoesAprovadasHtml = '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid #15803d; background:rgba(21,128,61,0.05);">' +
                '<div style="font-size:12px; font-weight:800; color:#15803d; margin-bottom:4px;">🛡️ Revisões Homologadas Preservadas Imutavelmente (' + ap.revisoes_aprovadas.length + '):</div>' +
                '<div style="font-size:11.5px; color:var(--text);">' +
                    ap.revisoes_aprovadas.map(function (rev) {
                        return '<span style="display:inline-block; margin-right:10px; padding:3px 8px; background:var(--card); border:1px solid var(--border); border-radius:6px;">' +
                            '<b>' + esc(rev.revisao_id) + '</b> — ' + esc(rev.slides.length) + ' slide(s) • Aprovada por: <b>' + esc(rev.aprovado_por || 'Engenharia SST') + '</b>' +
                        '</span>';
                    }).join('') +
                '</div>' +
            '</div>';
        }

        var formSlideHtml = '';
        if (estadoApres.formSlideAberto && podeEditar) {
            var ehEditSlide = estadoApres.formSlideAberto.modo === 'editar' && slideAtual;
            var sEdit = ehEditSlide ? slideAtual : null;
            var rasc = estadoApres.formSlideAberto.rascunho || null;

            var valTitulo = rasc ? rasc.titulo : (sEdit ? sEdit.titulo : '');
            var valSecao = rasc ? rasc.secao_norma : (sEdit ? sEdit.secao_norma : ap.norma_referencia);
            var valLayout = rasc ? rasc.layout : (sEdit ? sEdit.layout : 'PADRAO_TOPICOS');
            var valObj = rasc ? rasc.objetivo_didatico : (sEdit ? sEdit.objetivo_didatico : '');
            var valTopicos = rasc ? rasc.topicos_texto : (sEdit && Array.isArray(sEdit.topicos) ? sEdit.topicos.join('\n') : '');
            var valAplic = rasc ? rasc.aplicacao_obra_funcao : (sEdit ? sEdit.aplicacao_obra_funcao : '');
            var valCaso = rasc ? rasc.caso_real_obra : (sEdit ? sEdit.caso_real_obra : '');
            var valPerg = rasc ? rasc.pergunta_debate : (sEdit ? sEdit.pergunta_debate : '');
            var valNota = rasc ? rasc.nota_instrutor : (sEdit ? sEdit.nota_instrutor : '');

            var refsMarcadas = new Set(
                rasc && Array.isArray(rasc.id_vinculos_referencia)
                    ? rasc.id_vinculos_referencia
                    : ((sEdit && Array.isArray(sEdit.referencias) ? sEdit.referencias : []).map(function (r) { return r.id_vinculo; }))
            );

            var checkboxesFontes = ap.fontes_vinculadas.length > 0
                ? ap.fontes_vinculadas.map(function (fv) {
                    var chk = refsMarcadas.has(fv.id_vinculo) ? ' checked' : '';
                    return '<label style="display:flex; align-items:center; gap:6px; font-size:11.5px; margin-bottom:4px;">' +
                        '<input type="checkbox" class="apSlideFonteRefCb" value="' + esc(fv.id_vinculo) + '"' + chk + '> ' +
                        '<span><b>[' + esc(fv.tipo) + ']</b> ' + esc(fv.titulo) + '</span>' +
                    '</label>';
                }).join('')
                : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma fonte vinculada ainda. Vincule fontes na Aba 2.</div>';

            formSlideHtml = '<div class="db-chart-card" style="margin-bottom:14px; border:2px solid #0284c7;">' +
                '<h3 style="margin:0 0 8px 0; font-size:13.5px;">' + (ehEditSlide ? '✏️ Editar e Revisar Slide #' + sEdit.ordem + ' (Versão Capturada: v' + esc(estadoApres.formSlideAberto.versaoEsperada) + ')' : '➕ Novo Slide no Molde Institucional') + '</h3>' +
                '<input type="hidden" id="apSlide_versaoEsperada" value="' + esc(estadoApres.formSlideAberto.versaoEsperada || ap.versao) + '">' +
                '<div style="display:grid; grid-template-columns:2fr 1fr 1fr; gap:8px; margin-bottom:8px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Título do Slide *</label><input type="text" id="apSlide_titulo" class="db-input" style="width:100%;" value="' + esc(valTitulo) + '"></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Seção / Tópico da Norma</label><input type="text" id="apSlide_secao" class="db-input" style="width:100%;" value="' + esc(valSecao) + '"></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Layout no Molde</label>' +
                        '<select id="apSlide_layout" class="db-input" style="width:100%;">' +
                            LAYOUTS_SLIDE_SUPORTADOS.map(function (lay) {
                                var sel = (valLayout === lay) ? ' selected' : '';
                                return '<option value="' + esc(lay) + '"' + sel + '>' + esc(lay) + '</option>';
                            }).join('') +
                        '</select></div>' +
                '</div>' +
                '<div style="margin-bottom:8px;"><label style="font-size:11px; font-weight:700;">Objetivo Didático (opcional)</label><input type="text" id="apSlide_objetivo" class="db-input" style="width:100%;" value="' + esc(valObj) + '"></div>' +
                '<div style="margin-bottom:8px;"><label style="font-size:11px; font-weight:700;">Tópicos Projetados na Tela (1 por linha — curtos e legíveis)</label><textarea id="apSlide_topicos" class="db-input" rows="3" style="width:100%;">' + esc(valTopicos) + '</textarea></div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Aplicação Real na Obra / Diferenciação por Função (opcional)</label><textarea id="apSlide_aplicacaoFuncao" class="db-input" rows="2" style="width:100%;">' + esc(valAplic) + '</textarea></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Cenário / Caso Real da Frente (opcional)</label><textarea id="apSlide_casoReal" class="db-input" rows="2" style="width:100%;">' + esc(valCaso) + '</textarea></div>' +
                '</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Pergunta de Debate com a Turma (opcional)</label><input type="text" id="apSlide_pergunta" class="db-input" style="width:100%;" value="' + esc(valPerg) + '"></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Nota Exclusiva do Instrutor (oculta no projetor limpo)</label><input type="text" id="apSlide_notaInstrutor" class="db-input" style="width:100%;" value="' + esc(valNota) + '"></div>' +
                '</div>' +
                '<div style="padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); margin-bottom:8px;">' +
                    '<div style="font-size:11px; font-weight:800; margin-bottom:4px;">📚 Fontes Vinculadas Citadas neste Slide:</div>' +
                    checkboxesFontes +
                '</div>' +
                '<div style="display:flex; gap:8px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.salvarFormSlideApresentacaoUI()">💾 Salvar e Marcar Slide como Revisado</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.fecharFormSlideApresentacaoUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        var listaSlidesHtml = ap.slides.length > 0
            ? ap.slides.map(function (sl) {
                var ativo = slideAtual && sl.id === slideAtual.id;
                var ehRev = sl.status_revisao_slide === 'REVISADO_ENGENHARIA';
                return '<div style="padding:9px 10px; border:2px solid ' + (ativo ? 'var(--primary, #2563eb)' : 'var(--border)') + '; border-radius:8px; background:' + (ativo ? 'rgba(37,99,235,0.06)' : 'var(--bg)') + '; margin-bottom:8px; cursor:pointer;" onclick="window.selecionarSlideApresentacaoUI(\'' + esc(sl.id) + '\')">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">' +
                        '<span style="font-size:11px; font-weight:800; color:var(--primary);">Slide #' + esc(sl.ordem) + ' • ' + esc(sl.layout) + '</span>' +
                        '<span style="font-size:10px; font-weight:700; color:' + (ehRev ? '#15803d' : '#b45309') + ';">' + (ehRev ? '✅ Revisado' : '⏳ ' + esc(sl.status_revisao_slide)) + '</span>' +
                    '</div>' +
                    '<div style="font-size:12.5px; font-weight:700; color:var(--text); margin-top:2px;">' + esc(sl.titulo) + '</div>' +
                    (podeEditar ? (
                        '<div style="display:flex; gap:4px; margin-top:6px;" onclick="if(typeof event!==\'undefined\'&&event.stopPropagation)event.stopPropagation();">' +
                            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.reordenarSlideApresentacaoUI(\'' + esc(sl.id) + '\', \'cima\')">↑</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.reordenarSlideApresentacaoUI(\'' + esc(sl.id) + '\', \'baixo\')">↓</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.abrirFormSlideApresentacaoUI(\'' + esc(sl.id) + '\')">✏️ Editar/Revisar</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px; color:var(--danger);" onclick="window.removerSlideApresentacaoUI(\'' + esc(sl.id) + '\')">🗑️</button>' +
                        '</div>'
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:12px; color:var(--text-light); padding:12px;">Nenhum slide ainda. Clique em <b>➕ Novo Slide</b> ou em <b>🧩 Compor Slides pelas Fontes Ligadas</b>.</div>';

        var previaSlideMoldeHtml = slideAtual
            ? renderizarMoldeSlideInstitucionalHtml(ap, slideAtual, ap.slides.length, { mostrarNotaInstrutor: true, modoImpressao: false })
            : '<div class="db-chart-card" style="padding:24px; text-align:center; color:var(--text-light);">Selecione ou crie um slide para visualizar o Molde Institucional.</div>';

        return '' +
            alertaEvolucaoBanner +
            boxRevisoesAprovadasHtml +
            '<div class="db-chart-card" style="margin-bottom:14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div>' +
                        '<span style="font-size:11px; font-weight:800; color:var(--primary);">' + esc(ap.codigo) + ' • Revisão ' + esc(ap.revisao_id) + ' (v' + esc(ap.versao) + ') • Status: ' + esc(ap.status) + '</span>' +
                        '<h3 style="margin:2px 0 0 0; font-size:15px;">' + esc(ap.norma_referencia) + ' — ' + esc(ap.titulo) + '</h3>' +
                        '<div style="font-size:11.5px; color:var(--text-light);">Público: ' + esc(ap.publico_alvo || 'A definir') + ' • Carga: ' + esc(ap.carga_horaria || 'A definir') + ' • Frente: ' + esc(ap.frente_obra) + '</div>' +
                    '</div>' +
                    '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                        (podeEditar ? '<button type="button" class="db-apply-btn" onclick="window.abrirFormSlideApresentacaoUI()">➕ Novo Slide</button>' : '') +
                        (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.comporSlidesPorFontesApresentacaoUI()">🧩 Compor Slides pelas Fontes Ligadas</button>' : '') +
                        (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.abrirFormApresentacaoSstUI(\'' + esc(ap.id) + '\')">✏️ Metadados</button>' : '') +
                        (ehValidador && ap.status !== 'APROVADO_ENGENHARIA' ? '<button type="button" class="db-apply-btn" style="background:#15803d;" onclick="window.alterarStatusApresentacaoSstUI(\'APROVADO_ENGENHARIA\')">✅ Homologar Aula (Engenharia SST)</button>' : '') +
                        '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'slides\')">🖨️ Imprimir Slides (A4)</button>' +
                        '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'apostila\')">📖 Imprimir Guia/Apostila</button>' +
                        (podeEditar ? '<button type="button" class="db-clear-btn" style="color:var(--danger);" onclick="window.excluirApresentacaoSstUI(\'' + esc(ap.id) + '\')">🗑️ Excluir</button>' : '') +
                    '</div>' +
                '</div>' +
            '</div>' +
            formSlideHtml +
            '<div style="display:grid; grid-template-columns:minmax(260px, 320px) 1fr; gap:14px; align-items:start;">' +
                '<div class="db-chart-card" style="padding:12px;">' +
                    '<div style="font-size:12.5px; font-weight:800; margin-bottom:8px;">📑 Esboço de Slides (' + ap.slides.length + ')</div>' +
                    listaSlidesHtml +
                '</div>' +
                '<div>' + previaSlideMoldeHtml + '</div>' +
            '</div>';
    }

    function renderAbaFontesEEvolucaoHtml(ap, diag, podeEditar) {
        var fontesVivas = lerFontesDisponiveisNosModulos();
        var ind = diag.indicadores;

        var todasOpcoesModulos = []
            .concat(fontesVivas.catalogo)
            .concat(fontesVivas.ghe)
            .concat(fontesVivas.apr_modelo)
            .concat(fontesVivas.apr_registro)
            .concat(fontesVivas.cenario)
            .concat(fontesVivas.regra)
            .concat(fontesVivas.mapa)
            .concat(fontesVivas.decisao_mapa);

        var opcoesSelectHtml = todasOpcoesModulos.map(function (f) {
            return '<option value="' + esc(f.tipo + ':::' + f.origem_id) + '">[' + esc(f.tipo.toUpperCase()) + '] ' + esc(f.titulo) + '</option>';
        }).join('');

        var novosAprendizadosHtml = diag.novos_aprendizados_sem_slide.length > 0
            ? diag.novos_aprendizados_sem_slide.map(function (na) {
                return '<div style="padding:10px 12px; border:1px solid #0284c7; border-radius:8px; background:var(--bg); margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">' +
                    '<div style="flex:1; min-width:240px;">' +
                        '<div style="font-size:11px; font-weight:800; color:#0284c7;">⚡ NOVO APRENDIZADO VALIDADO NO MÓDULO DE ORIGEM • ' + esc(na.tipo.toUpperCase()) + ' (' + esc(na.tipo_acao_origem) + ')</div>' +
                        '<div style="font-size:12.5px; font-weight:700; margin-top:2px;">' + esc(na.titulo) + '</div>' +
                        '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">' + esc(na.trecho_capturado) + '</div>' +
                    '</div>' +
                    (podeEditar ? (
                        '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                            '<button type="button" class="db-apply-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'INCORPORAR_EM_SLIDE\', \'' + esc(na.id_vinculo) + '\')">➕ Incorporar no Slide Atual</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'CRIAR_SLIDE_DO_APRENDIZADO\', \'' + esc(na.id_vinculo) + '\')">📄 Criar Novo Slide</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'DISPENSAR_NESTA_AULA\', \'' + esc(na.id_vinculo) + '\')">✕ Dispensar nesta Aula</button>' +
                        '</div>'
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:12px; color:var(--text-light);">Nenhum novo aprendizado pendente nos cenários/mapas vinculados.</div>';

        var alteradasHtml = diag.fontes_alteradas_ou_revogadas.length > 0
            ? diag.fontes_alteradas_ou_revogadas.map(function (fa) {
                var slidesDepHtml = (fa.slides_dependentes || []).map(function (s) {
                    var badgeDef = s.citacao_defasada ? ' <b style="color:var(--warning, #d97706);">[Citação defasada — precisa revisão]</b>' : ' <span style="color:var(--success);">[Revisado]</span>';
                    var botoesSlide = (podeEditar && s.citacao_defasada && fa.situacao !== 'ORIGEM_REVOGADA' && fa.situacao !== 'ORIGEM_EXCLUIDA_OU_INDISPONIVEL')
                        ? ' <button type="button" class="db-apply-btn" style="font-size:10px; padding:2px 6px;" onclick="window.revisarCitacaoSlideIndividualUI(\'REVISAR_CITACAO_SLIDE\', \'' + esc(fa.id_vinculo) + '\', \'' + esc(s.slide_id) + '\')">✅ Atualizar Slide #' + esc(s.ordem) + '</button>' +
                          ' <button type="button" class="db-clear-btn" style="font-size:10px; padding:2px 6px;" onclick="window.revisarCitacaoSlideIndividualUI(\'MANTER_TEXTO_SLIDE_ATUALIZAR_CITACAO\', \'' + esc(fa.id_vinculo) + '\', \'' + esc(s.slide_id) + '\')">📌 Manter Texto #' + esc(s.ordem) + ' e Confirmar Revisão</button>'
                        : '';
                    return '<li style="margin-bottom:4px;">Slide #' + esc(s.ordem) + ' (' + esc(s.titulo) + ')' + badgeDef + botoesSlide + '</li>';
                }).join('');

                return '<div style="padding:10px 12px; border:1px solid var(--warning, #d97706); border-radius:8px; background:var(--bg); margin-bottom:8px;">' +
                    '<div style="font-size:11px; font-weight:800; color:var(--warning, #d97706);">⚠️ ' + esc(fa.situacao) + ' • Hash capturado: <code>' + esc(fa.hash_capturado) + '</code> → Hash na origem: <code>' + esc(fa.hash_atual || 'indisponível') + '</code></div>' +
                    '<div style="font-size:12.5px; font-weight:700; margin-top:2px;">' + esc(fa.titulo) + '</div>' +
                    '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">' + esc(fa.motivo) + '</div>' +
                    (slidesDepHtml ? '<ul style="margin:6px 0 0 18px; padding:0; font-size:11.5px;">' + slidesDepHtml + '</ul>' : '') +
                    (podeEditar ? (
                        '<div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">' +
                            (fa.situacao === 'CONTEUDO_ATUALIZADO_NA_ORIGEM'
                                ? '<button type="button" class="db-apply-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'ATUALIZAR_SNAPSHOT_FONTE\', \'' + esc(fa.id_vinculo) + '\')">🔄 Capturar Novo Snapshot &amp; Marcar Slides Dependentes p/ Revisão</button>'
                                : '') +
                            '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'DISPENSAR_NESTA_AULA\', \'' + esc(fa.id_vinculo) + '\')">Dispensar Fonte nesta Revisão</button>' +
                        '</div>'
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:12px; color:var(--text-light);">Todas as fontes vinculadas e citações de slides conferem com o hash atual.</div>';

        var listaVinculadasHtml = ap.fontes_vinculadas.length > 0
            ? ap.fontes_vinculadas.map(function (fv) {
                var det = diag.fontes_vinculadas.find(function (d) { return d.id_vinculo === fv.id_vinculo; }) || {};
                var slidesTxt = (det.slides_dependentes || []).map(function (s) { return '#' + s.ordem; }).join(', ') || 'Ainda não citada';
                return '<div style="padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); margin-bottom:8px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">' +
                    '<div style="flex:1; min-width:240px;">' +
                        '<div style="font-size:11px; font-weight:700; color:var(--primary);">[' + esc(fv.modulo_origem) + '] • Uso: ' + esc(det.uso_na_aula || fv.uso_na_aula) + ' • Situação: ' + esc(det.situacao_atual || 'VERIFICADA') + ' • Hash: <code>' + esc(fv.hash_canonico_capturado) + '</code></div>' +
                        '<div style="font-size:12.5px; font-weight:700; margin-top:2px;">' + esc(fv.titulo) + '</div>' +
                        '<div style="font-size:11px; color:var(--text-light); margin-top:2px;"><b>Escopo:</b> ' + esc(formatarEscopoParaDidatica(fv)) + ' | <b>Citada nos slides:</b> ' + esc(slidesTxt) + '</div>' +
                        '<div style="font-size:11.5px; color:var(--text); margin-top:4px;">' + esc(fv.trecho_capturado) + '</div>' +
                    '</div>' +
                    (podeEditar ? (
                        '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.aplicarDecisaoEvolucaoApresentacaoUI(\'INCORPORAR_EM_SLIDE\', \'' + esc(fv.id_vinculo) + '\')">➕ Citar no Slide Atual</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px; color:var(--danger);" onclick="window.removerFonteVinculadaApresentacaoUI(\'' + esc(fv.id_vinculo) + '\')">Desvincular</button>' +
                        '</div>'
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:12px; color:var(--text-light);">Nenhuma fonte vinculada a esta aula ainda.</div>';

        var historicoHtml = (Array.isArray(ap.historico_evolucao) && ap.historico_evolucao.length > 0)
            ? '<ul style="margin:6px 0 0 18px; padding:0; font-size:11.5px;">' +
                ap.historico_evolucao.slice(0, 12).map(function (h) {
                    return '<li style="margin-bottom:4px;"><b>[' + esc(h.acao) + ']</b> ' + esc(h.resumo) + ' <span style="color:var(--text-light);">(' + esc(h.responsavel) + ')</span></li>';
                }).join('') +
              '</ul>'
            : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma decisão de evolução registrada ainda nesta apresentação.</div>';

        return '' +
            (podeEditar ? (
                '<div class="db-chart-card" style="margin-bottom:14px;">' +
                    '<h3 style="margin:0 0 8px 0; font-size:14px;">🔗 Conectar Fontes dos Módulos da Obra ou Adicionar Trecho da Norma</h3>' +
                    '<div style="display:grid; grid-template-columns:2fr auto; gap:8px; align-items:end; margin-bottom:12px;">' +
                        '<div>' +
                            '<label style="font-size:11px; font-weight:700; display:block; margin-bottom:4px;">Selecionar registro já existente em Catálogo, GHE/OS, APR, Inteligência SST ou Mapa Mental (Cache em memória):</label>' +
                            '<select id="apSelectFonteModuloExistente" class="db-input" style="width:100%;">' +
                                '<option value="">-- Escolha uma fonte real carregada nos módulos (' + todasOpcoesModulos.length + ' disponível(is)) --</option>' +
                                opcoesSelectHtml +
                            '</select>' +
                        '</div>' +
                        '<button type="button" class="db-apply-btn" onclick="window.vincularFonteModuloSelecionadaUI()">🔗 Vincular Fonte à Aula</button>' +
                    '</div>' +
                    '<div style="padding-top:10px; border-top:1px solid var(--border);">' +
                        '<div style="font-size:12px; font-weight:800; margin-bottom:6px;">📄 Ou salvar Trecho Normativo / Procedimento no Caderno do Tema:</div>' +
                        '<div style="display:grid; grid-template-columns:1fr 2fr auto; gap:8px; align-items:start;">' +
                            '<input type="text" id="apFonteColada_titulo" class="db-input" placeholder="Título (ex.: NR-35 Item 35.5 — Ancoragem)">' +
                            '<textarea id="apFonteColada_trecho" class="db-input" rows="2" placeholder="Cole aqui o trecho oficial da NR ou procedimento da obra..."></textarea>' +
                            '<button type="button" class="db-clear-btn" onclick="window.adicionarFonteColadaApresentacaoUI()">➕ Salvar no Caderno</button>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            ) : '') +

            '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid #0284c7;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">' +
                    '<div>' +
                        '<h3 style="margin:0; font-size:14px;">3️⃣ Novos Aprendizados Validados nos Módulos Ligados Ainda Sem Slide (' + ind.total_novos_aprendizados_sem_slide + ')</h3>' +
                        '<div style="font-size:11px; color:var(--text-light);">Escopo da verificação: ' + esc(diag.modo_leitura) + ' (Catálogo: ' + esc(diag.disponibilidade_modulos.catalogo_estado) + ' • GHE: ' + esc(diag.disponibilidade_modulos.ghe_estado) + ')</div>' +
                    '</div>' +
                    '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.atualizarVerificacaoFontesApresentacaoUI()">🔄 Reconciliar com Cache em Memória</button>' +
                '</div>' +
                novosAprendizadosHtml +
            '</div>' +

            '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--warning, #d97706);">' +
                '<h3 style="margin:0 0 8px 0; font-size:14px;">2️⃣ Fontes Vinculadas que Mudaram, Foram Revogadas ou Têm Slides Pendentes (' + ind.total_fontes_alteradas_ou_revogadas + ')</h3>' +
                alteradasHtml +
            '</div>' +

            '<div class="db-chart-card" style="margin-bottom:14px;">' +
                '<h3 style="margin:0 0 8px 0; font-size:14px;">1️⃣ Caderno Persistente de Fontes Vinculadas a Esta Aula (' + ind.total_fontes_vinculadas + ')</h3>' +
                listaVinculadasHtml +
            '</div>' +

            '<div class="db-chart-card">' +
                '<h3 style="margin:0 0 6px 0; font-size:13.5px;">📜 Histórico Auditável de Evolução e Revisões desta Apresentação</h3>' +
                historicoHtml +
            '</div>';
    }

    function renderAbaProjetorEImpressaoHtml(ap) {
        var slideAtual = ap.slides.find(function (s) { return s.id === estadoApres.slideSelecionadoId; }) || ap.slides[0] || null;
        if (!slideAtual) {
            return '<div class="db-chart-card" style="padding:24px; text-align:center;">Adicione slides na Aba 1 antes de abrir o Modo Projetor.</div>';
        }
        var idx = ap.slides.findIndex(function (s) { return s.id === slideAtual.id; });
        var temAnt = idx > 0;
        var temProx = idx < ap.slides.length - 1;

        return '<div class="db-chart-card" id="apProjetorStageContainer" style="margin-bottom:14px; background:var(--card);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                    '<button type="button" class="db-clear-btn" ' + (!temAnt ? 'disabled' : '') + ' onclick="window.navegarSlideProjetorSstUI(-1)">⬅️ Slide Anterior (←)</button>' +
                    '<span style="font-size:13px; font-weight:800;">Slide ' + (idx + 1) + ' de ' + ap.slides.length + ' (16:9)</span>' +
                    '<button type="button" class="db-apply-btn" ' + (!temProx ? 'disabled' : '') + ' onclick="window.navegarSlideProjetorSstUI(1)">Próximo Slide (→) ➡️</button>' +
                '</div>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.alternarTelaCheiaProjetorSstUI()">⛶ Tela Cheia (TV / Projetor)</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.alternarNotaInstrutorProjetorSstUI()">' +
                        (estadoApres.mostrarNotaInstrutorProjetor ? '🙈 Ocultar Nota do Instrutor (Projeção Limpa TV)' : '🎙️ Mostrar Nota do Instrutor') +
                    '</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'slides\')">🖨️ Imprimir Slides A4 Paisagem (PDF)</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'apostila\')">📖 Imprimir Guia do Instrutor &amp; Apostila</button>' +
                '</div>' +
            '</div>' +
            renderizarMoldeSlideInstitucionalHtml(ap, slideAtual, ap.slides.length, {
                mostrarNotaInstrutor: estadoApres.mostrarNotaInstrutorProjetor,
                modoImpressao: false,
                modoProjetor16x9: true
            }) +
        '</div>';
    }

    function renderAbaPonteIaExternaHtml(ap, podeEditar) {
        var pacote = gerarPacoteExternoApresentacao(ap.id, '', {
            somenteFontesValidadas: estadoApres.apenasFontesValidadasNoPacote
        });
        var previa = estadoApres.previaImportIa;
        var previaHtml = '';

        if (previa && Array.isArray(previa.itens)) {
            var avisosHtml = (Array.isArray(previa.avisos) && previa.avisos.length > 0)
                ? '<div style="padding:8px; margin-bottom:8px; border:1px solid var(--warning, #d97706); border-radius:6px; font-size:11.5px; color:var(--warning, #d97706);">' +
                    previa.avisos.map(function (a) { return '<div>⚠️ ' + esc(a) + '</div>'; }).join('') +
                  '</div>'
                : '';

            previaHtml = '<div id="apBoxPreviaImportIa" style="margin-top:12px; padding:12px; border:2px solid var(--primary); border-radius:8px; background:var(--bg);">' +
                '<div style="font-size:13px; font-weight:800; color:var(--primary); margin-bottom:6px;">🔎 Prévia de Importação no Molde Institucional (' + previa.total_itens + ' slide(s) reconhecido(s) • Capturado na v' + esc(previa.versao_apresentacao_na_previa) + ')</div>' +
                avisosHtml +
                '<div style="max-height:240px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; padding:8px; background:var(--card);">' +
                    previa.itens.map(function (it, i) {
                        return '<div style="padding:6px 0; border-bottom:1px dashed var(--border); font-size:11.5px;">' +
                            '<b>' + (i + 1) + '. [' + esc(it.acao_importacao) + ' • ' + esc(it.layout) + '] ' + esc(it.titulo) + '</b><br>' +
                            '<span style="color:var(--text-light);">Tópicos: ' + esc(it.topicos.join(' | ')) + ' | Fontes válidas: ' + it.referencias.length + '</span>' +
                        '</div>';
                    }).join('') +
                '</div>' +
                (previa.total_atualizacoes_em_manuais > 0
                    ? '<label style="display:flex; align-items:center; gap:6px; font-size:11.5px; margin-top:8px;">' +
                        '<input type="checkbox" id="apCheckSobrescreverManuais"> Permitir atualizar slides que já foram editados manualmente (se desmarcado, cria cópia ao lado preservando sua edição manual)' +
                      '</label>'
                    : '') +
                '<div style="display:flex; gap:8px; margin-top:10px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarImportacaoExternaApresentacaoUI()">✅ Confirmar Importação como Rascunho no Molde</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarImportacaoExternaApresentacaoUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        return '<div class="db-chart-card">' +
            '<h3 style="margin:0 0 6px 0; font-size:14.5px;">🤖 Ponte Sob Demanda com NotebookLM / IA Externa (Sem Custo de API no Painel)</h3>' +
            '<p style="margin:0 0 10px 0; font-size:12px; color:var(--text-light); line-height:1.45;">' +
                'A apresentação do dia a dia funciona 100% no painel sem depender de IA. Quando quiser estudar um conjunto de fontes no <b>NotebookLM</b> ou pedir à IA externa para estruturar novos slides, revise e copie o pacote abaixo. Fontes revogadas/excluídas são omitidas automaticamente (' + pacote.total_fontes_revogadas_omitidas + ' omitida(s)).' +
            '</p>' +
            '<div style="margin-bottom:12px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">' +
                    '<label style="font-size:11.5px; font-weight:800;">Passo 1 — Pacote das Fontes Vinculadas (' + pacote.total_fontes_validadas + ' validada(s) + ' + pacote.total_fontes_rascunho + ' em rascunho):</label>' +
                    '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
                        '<label style="font-size:11px; display:flex; align-items:center; gap:4px; cursor:pointer;">' +
                            '<input type="checkbox" ' + (estadoApres.apenasFontesValidadasNoPacote ? 'checked' : '') + ' onchange="window.alternarFiltroFontesValidadasPacoteUI(this.checked)"> Incluir apenas fontes formalmente validadas/aprovadas' +
                        '</label>' +
                        '<button type="button" class="db-apply-btn" onclick="window.copiarPacoteExternoApresentacaoUI()">📋 Copiar Pacote para NotebookLM / IA</button>' +
                    '</div>' +
                '</div>' +
                '<textarea id="apTextareaPacotePrompt" class="db-input" rows="7" style="width:100%; font-size:11px; font-family:monospace;">' + esc(pacote.prompt) + '</textarea>' +
            '</div>' +
            (podeEditar ? (
                '<div style="padding-top:10px; border-top:1px solid var(--border);">' +
                    '<label style="font-size:11.5px; font-weight:800; display:block; margin-bottom:4px;">Passo 2 — Colar JSON de Slides Retornado para Encaixar no Molde Visual Institucional (máx. 35 KB):</label>' +
                    '<textarea id="apTextareaImportJsonIa" class="db-input" rows="5" style="width:100%; font-size:11.5px; font-family:monospace;" oninput="window.atualizarRascunhoImportIaApresentacaoUI(this.value)" placeholder="Cole aqui a resposta JSON com {\"slides\": [...]}...">' + esc(estadoApres.textoImportIaDraft || '') + '</textarea>' +
                    '<div style="margin-top:8px;">' +
                        '<button type="button" class="db-apply-btn" onclick="window.preVisualizarImportacaoExternaApresentacaoUI()">🔎 Analisar Prévia antes de Importar</button>' +
                    '</div>' +
                    previaHtml +
                '</div>'
            ) : '') +
        '</div>';
    }

    // =========================================================================
    // 12. HANDLERS DE INTERFACE (UI) COM CAPTURA DE VERSÃO E ATALHOS
    // =========================================================================
    function valorCampo(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '') : '';
    }

    function baixarJsonApresentacoesLocal(nomeArquivo, conteudoJson) {
        if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document.createElement !== 'function' || !document.body || typeof document.body.appendChild !== 'function') {
            return false;
        }
        try {
            var blob = new Blob([conteudoJson], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (typeof setTimeout === 'function') {
                setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignora */ } }, 1000);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function selecionarAbaApresentacoesSstUI(aba) {
        garantirEstadoSessaoApres();
        if (['editor', 'fontes_evolucao', 'projetor', 'ponte_ia'].includes(aba)) {
            estadoApres.abaAtiva = aba;
        }
        renderApresentacoesSstPanel();
    }

    function abrirIndicadorEvolucaoApresentacaoUI(filtro) {
        garantirEstadoSessaoApres();
        estadoApres.filtroIndicadorEvolucao = String(filtro || 'TODOS');
        estadoApres.abaAtiva = (filtro === 'PENDENTES_REVISAO') ? 'editor' : 'fontes_evolucao';
        renderApresentacoesSstPanel();
    }

    function selecionarApresentacaoSstUI(id) {
        garantirEstadoSessaoApres();
        if (buscarApresentacaoPorId(id)) {
            estadoApres.apresentacaoSelecionadaId = id;
            estadoApres.formSlideAberto = null;
            estadoApres.previaImportIa = null;
            sincronizarSlideSelecionado();
        }
        renderApresentacoesSstPanel();
    }

    function selecionarSlideApresentacaoUI(slideId) {
        garantirEstadoSessaoApres();
        estadoApres.slideSelecionadoId = String(slideId || '');
        renderApresentacoesSstPanel();
    }

    function abrirFormApresentacaoSstUI(editarId) {
        garantirEstadoSessaoApres();
        var apEdit = editarId ? buscarApresentacaoPorId(editarId) : null;
        estadoApres.formApresentacaoAberto = editarId
            ? { modo: 'editar', id: editarId, versaoEsperada: apEdit ? apEdit.versao : undefined }
            : { modo: 'novo' };
        renderApresentacoesSstPanel();
    }

    function fecharFormApresentacaoSstUI() {
        garantirEstadoSessaoApres();
        estadoApres.formApresentacaoAberto = null;
        renderApresentacoesSstPanel();
    }

    function salvarFormApresentacaoSstUI() {
        try {
            garantirEstadoSessaoApres();
            var editId = estadoApres.formApresentacaoAberto && estadoApres.formApresentacaoAberto.modo === 'editar'
                ? estadoApres.formApresentacaoAberto.id
                : '';
            var verCap = valorCampo('apForm_versaoEsperada') || (estadoApres.formApresentacaoAberto && estadoApres.formApresentacaoAberto.versaoEsperada);
            criarOuAtualizarApresentacao({
                id: editId || undefined,
                versaoEsperada: verCap ? Number(verCap) : undefined,
                norma_referencia: valorCampo('apForm_norma'),
                titulo: valorCampo('apForm_titulo'),
                carga_horaria: valorCampo('apForm_carga'),
                publico_alvo: valorCampo('apForm_publico'),
                frente_obra: valorCampo('apForm_frente'),
                curso_catalogo_id: valorCampo('apForm_cursoCat'),
                cenario_ia_id: valorCampo('apForm_cenarioIa'),
                mapa_mental_id: valorCampo('apForm_mapaMental')
            });
            estadoApres.formApresentacaoAberto = null;
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirFormSlideApresentacaoUI(slideId) {
        garantirEstadoSessaoApres();
        var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
        if (slideId) estadoApres.slideSelecionadoId = slideId;
        estadoApres.formSlideAberto = slideId
            ? { modo: 'editar', slideId: slideId, versaoEsperada: ap ? ap.versao : undefined, rascunho: null }
            : { modo: 'novo', versaoEsperada: ap ? ap.versao : undefined, rascunho: null };
        renderApresentacoesSstPanel();
    }

    function fecharFormSlideApresentacaoUI() {
        garantirEstadoSessaoApres();
        estadoApres.formSlideAberto = null;
        renderApresentacoesSstPanel();
    }

    function salvarFormSlideApresentacaoUI() {
        var rascunhoDigitado = null;
        try {
            garantirEstadoSessaoApres();
            var editId = estadoApres.formSlideAberto && estadoApres.formSlideAberto.modo === 'editar'
                ? estadoApres.formSlideAberto.slideId
                : '';
            var verCap = valorCampo('apSlide_versaoEsperada') || (estadoApres.formSlideAberto && estadoApres.formSlideAberto.versaoEsperada);
            var refs = typeof document.querySelectorAll === 'function'
                ? Array.from(document.querySelectorAll('.apSlideFonteRefCb:checked')).map(function (cb) { return cb.value; })
                : [];
            rascunhoDigitado = {
                id: editId || undefined,
                versaoEsperada: verCap ? Number(verCap) : undefined,
                titulo: valorCampo('apSlide_titulo'),
                secao_norma: valorCampo('apSlide_secao'),
                layout: valorCampo('apSlide_layout'),
                objetivo_didatico: valorCampo('apSlide_objetivo'),
                topicos_texto: valorCampo('apSlide_topicos'),
                aplicacao_obra_funcao: valorCampo('apSlide_aplicacaoFuncao'),
                caso_real_obra: valorCampo('apSlide_casoReal'),
                pergunta_debate: valorCampo('apSlide_pergunta'),
                nota_instrutor: valorCampo('apSlide_notaInstrutor'),
                id_vinculos_referencia: refs
            };
            salvarSlideApresentacao(estadoApres.apresentacaoSelecionadaId, rascunhoDigitado);
            estadoApres.formSlideAberto = null;
            renderApresentacoesSstPanel();
        } catch (err) {
            if (estadoApres.formSlideAberto && rascunhoDigitado) {
                estadoApres.formSlideAberto.rascunho = rascunhoDigitado;
            }
            alert(err.message);
        }
    }

    function reordenarSlideApresentacaoUI(slideId, direcao) {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            reordenarSlideApresentacao(estadoApres.apresentacaoSelecionadaId, slideId, direcao, {
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function removerSlideApresentacaoUI(slideId) {
        try {
            if (typeof confirm === 'function' && !confirm('Deseja remover este slide da apresentação?')) return;
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            removerSlideApresentacao(estadoApres.apresentacaoSelecionadaId, slideId, {
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function comporSlidesPorFontesApresentacaoUI() {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            comporSlidesLocaisPorFontesVinculadas(estadoApres.apresentacaoSelecionadaId, {
                substituirTodos: false,
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function vincularFonteModuloSelecionadaUI() {
        try {
            var val = valorCampo('apSelectFonteModuloExistente');
            if (!val || val.indexOf(':::') === -1) {
                alert('Selecione uma fonte da lista antes de vincular.');
                return;
            }
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            var partes = val.split(':::');
            vincularFonteNaApresentacao(estadoApres.apresentacaoSelecionadaId, {
                tipo: partes[0],
                origem_id: partes.slice(1).join(':::'),
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function adicionarFonteColadaApresentacaoUI() {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            vincularFonteNaApresentacao(estadoApres.apresentacaoSelecionadaId, {
                tipo: 'fonte_colada',
                titulo: valorCampo('apFonteColada_titulo'),
                trecho_capturado: valorCampo('apFonteColada_trecho'),
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function removerFonteVinculadaApresentacaoUI(idVinculo) {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            removerFonteVinculada(estadoApres.apresentacaoSelecionadaId, idVinculo, {
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function aplicarDecisaoEvolucaoApresentacaoUI(acao, idVinculo) {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            aplicarDecisaoEvolucaoNaApresentacao(estadoApres.apresentacaoSelecionadaId, {
                acao: acao,
                id_vinculo: idVinculo,
                slide_id: estadoApres.slideSelecionadoId,
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function revisarCitacaoSlideIndividualUI(acao, idVinculo, slideId) {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            aplicarDecisaoEvolucaoNaApresentacao(estadoApres.apresentacaoSelecionadaId, {
                acao: acao,
                id_vinculo: idVinculo,
                slide_id: slideId,
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function atualizarVerificacaoFontesApresentacaoUI() {
        try {
            invalidarCacheFontesModulos();
            diagnosticarEvolucaoApresentacao(estadoApres.apresentacaoSelecionadaId);
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function alterarStatusApresentacaoSstUI(novoStatus) {
        try {
            var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
            alterarStatusApresentacao(estadoApres.apresentacaoSelecionadaId, novoStatus, {
                versaoEsperada: ap ? ap.versao : undefined
            });
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function excluirApresentacaoSstUI(id) {
        try {
            if (typeof confirm === 'function' && !confirm('Deseja excluir esta apresentação local?')) return;
            excluirApresentacao(id);
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function carregarPilotoNr35ApresentacaoSstUI() {
        try {
            carregarApresentacaoPilotoConectada();
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function atualizarDomProjetorEmPlaceSeAtivo() {
        if (estadoApres.abaAtiva !== 'projetor') return false;
        var stage = typeof document !== 'undefined' && document.getElementById ? document.getElementById('apProjetorStageContainer') : null;
        if (!stage) return false;
        var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
        if (!ap || !Array.isArray(ap.slides) || ap.slides.length === 0) return false;
        var slideAtual = ap.slides.find(function (s) { return s.id === estadoApres.slideSelecionadoId; }) || ap.slides[0];
        var idx = ap.slides.findIndex(function (s) { return s.id === slideAtual.id; });
        var temAnt = idx > 0;
        var temProx = idx < ap.slides.length - 1;
        stage.innerHTML = '' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                    '<button type="button" class="db-clear-btn" ' + (!temAnt ? 'disabled' : '') + ' onclick="window.navegarSlideProjetorSstUI(-1)">⬅️ Slide Anterior (←)</button>' +
                    '<span style="font-size:13px; font-weight:800;">Slide ' + (idx + 1) + ' de ' + ap.slides.length + ' (16:9)</span>' +
                    '<button type="button" class="db-apply-btn" ' + (!temProx ? 'disabled' : '') + ' onclick="window.navegarSlideProjetorSstUI(1)">Próximo Slide (→) ➡️</button>' +
                '</div>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.alternarTelaCheiaProjetorSstUI()">⛶ Tela Cheia (TV / Projetor)</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.alternarNotaInstrutorProjetorSstUI()">' +
                        (estadoApres.mostrarNotaInstrutorProjetor ? '🙈 Ocultar Nota do Instrutor (Projeção Limpa TV)' : '🎙️ Mostrar Nota do Instrutor') +
                    '</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'slides\')">🖨️ Imprimir Slides A4 Paisagem (PDF)</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.imprimirApresentacaoSstUI(\'apostila\')">📖 Imprimir Guia do Instrutor &amp; Apostila</button>' +
                '</div>' +
            '</div>' +
            renderizarMoldeSlideInstitucionalHtml(ap, slideAtual, ap.slides.length, {
                mostrarNotaInstrutor: estadoApres.mostrarNotaInstrutorProjetor,
                modoImpressao: false,
                modoProjetor16x9: true
            });
        return true;
    }

    function navegarSlideProjetorSstUI(delta) {
        garantirEstadoSessaoApres();
        var ap = buscarApresentacaoPorId(estadoApres.apresentacaoSelecionadaId);
        if (!ap || !ap.slides.length) return;
        var idx = ap.slides.findIndex(function (s) { return s.id === estadoApres.slideSelecionadoId; });
        var novoIdx = Math.max(0, Math.min(ap.slides.length - 1, (idx < 0 ? 0 : idx) + Number(delta || 0)));
        estadoApres.slideSelecionadoId = ap.slides[novoIdx].id;
        if (!atualizarDomProjetorEmPlaceSeAtivo()) {
            renderApresentacoesSstPanel();
        }
    }

    function alternarNotaInstrutorProjetorSstUI() {
        garantirEstadoSessaoApres();
        estadoApres.mostrarNotaInstrutorProjetor = !estadoApres.mostrarNotaInstrutorProjetor;
        if (!atualizarDomProjetorEmPlaceSeAtivo()) {
            renderApresentacoesSstPanel();
        }
    }

    function alternarTelaCheiaProjetorSstUI() {
        var el = typeof document !== 'undefined' && document.getElementById ? document.getElementById('apProjetorStageContainer') : null;
        if (!el) return false;
        if (typeof document.fullscreenElement !== 'undefined' && document.fullscreenElement) {
            if (typeof document.exitFullscreen === 'function') {
                document.exitFullscreen();
                return true;
            }
        }
        if (typeof el.requestFullscreen === 'function') {
            el.requestFullscreen();
            return true;
        }
        return false;
    }

    function alternarFiltroFontesValidadasPacoteUI(somenteValidadas) {
        garantirEstadoSessaoApres();
        estadoApres.apenasFontesValidadasNoPacote = !!somenteValidadas;
        renderApresentacoesSstPanel();
    }

    function imprimirApresentacaoSstUI(modo) {
        try {
            imprimirApresentacaoSst(estadoApres.apresentacaoSelecionadaId, modo);
        } catch (err) {
            alert(err.message);
        }
    }

    function copiarPacoteExternoApresentacaoUI() {
        try {
            var ta = document.getElementById('apTextareaPacotePrompt');
            var textoParaCopiar = (ta && ta.value)
                ? ta.value
                : gerarPacoteExternoApresentacao(estadoApres.apresentacaoSelecionadaId, '', {
                    somenteFontesValidadas: estadoApres.apenasFontesValidadasNoPacote
                }).prompt;
            if (ta && typeof ta.select === 'function') ta.select();
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(textoParaCopiar).then(function () {
                    alert('✅ Pacote de fontes copiado para a área de transferência!');
                }).catch(function () {
                    alert('Pacote selecionado na caixa de texto. Pressione Ctrl+C para copiar.');
                });
            } else {
                alert('Pacote selecionado na caixa de texto. Pressione Ctrl+C para copiar.');
            }
        } catch (err) {
            alert(err.message);
        }
    }

    function atualizarRascunhoImportIaApresentacaoUI(valor) {
        garantirEstadoSessaoApres();
        estadoApres.textoImportIaDraft = String(valor || '');
    }

    function preVisualizarImportacaoExternaApresentacaoUI() {
        try {
            var texto = valorCampo('apTextareaImportJsonIa') || estadoApres.textoImportIaDraft;
            analisarImportacaoExternaApresentacao(estadoApres.apresentacaoSelecionadaId, texto);
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function confirmarImportacaoExternaApresentacaoUI() {
        try {
            var cb = document.getElementById('apCheckSobrescreverManuais');
            confirmarImportacaoExternaApresentacao(estadoApres.apresentacaoSelecionadaId, {
                sobrescreverSlidesManuais: !!(cb && cb.checked)
            });
            estadoApres.abaAtiva = 'editor';
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function cancelarImportacaoExternaApresentacaoUI() {
        garantirEstadoSessaoApres();
        estadoApres.previaImportIa = null;
        renderApresentacoesSstPanel();
    }

    function alternarBoxBackupApresentacoesUI() {
        garantirEstadoSessaoApres();
        estadoApres.boxBackupAberto = !estadoApres.boxBackupAberto;
        renderApresentacoesSstPanel();
    }

    function exportarBackupApresentacoesUI() {
        try {
            var bkp = gerarBackupApresentacoesLocais();
            var baixou = baixarJsonApresentacoesLocal(bkp.nomeArquivo, bkp.json);
            if (!baixou) {
                alert('Não foi possível iniciar o download automático neste ambiente. O backup permanece disponível via API gerarBackupApresentacoesLocais().');
                return null;
            }
            registrarBackupApresentacoesExportado();
            renderApresentacoesSstPanel();
            return bkp;
        } catch (err) {
            alert(err.message);
            return null;
        }
    }

    function atualizarRascunhoBackupApresentacoesUI(valor) {
        garantirEstadoSessaoApres();
        estadoApres.textoBackupDraft = String(valor || '');
    }

    function lerArquivoBackupApresentacoesUI(inputEl) {
        if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
        var file = inputEl.files[0];
        if (file.size > LIMITE_BYTES_STORAGE_APRES * 2) {
            alert('Arquivo de backup excede o limite permitido.');
            inputEl.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            estadoApres.textoBackupDraft = String((ev && ev.target && ev.target.result) || '');
            var ta = document.getElementById('apTextareaBackupJson');
            if (ta) ta.value = estadoApres.textoBackupDraft;
        };
        reader.readAsText(file, 'utf-8');
    }

    function preVisualizarBackupApresentacoesUI() {
        try {
            var texto = valorCampo('apTextareaBackupJson') || estadoApres.textoBackupDraft;
            analisarBackupApresentacoesLocais(texto);
            renderApresentacoesSstPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function confirmarRestauracaoBackupApresentacoesUI(modo) {
        try {
            garantirEstadoSessaoApres();
            var previa = estadoApres.previaBackup;
            if (!previa) {
                alert('Analise o backup antes de restaurar.');
                return null;
            }
            var selPol = document.getElementById('apSelectPoliticaConflitoBackup');
            var opcoes = {
                modo: modo,
                politicaConflito: selPol ? selPol.value : 'manter_existente'
            };
            if (modo === 'substituir' && estadoApres.apresentacoes.length > 0) {
                if (typeof confirm === 'function' && !confirm('Substituir todas as apresentações atuais? Uma cópia de segurança será baixada antes da substituição.')) {
                    return null;
                }
                var copia = gerarBackupApresentacoesLocais();
                var baixou = baixarJsonApresentacoesLocal('copia-seguranca-' + copia.nomeArquivo, copia.json);
                if (!baixou) {
                    alert('Substituição cancelada: falha ao baixar a cópia de segurança prévia.');
                    return null;
                }
                opcoes.backupPrevioConfirmado = true;
            }
            var res = aplicarRestauracaoBackupApresentacoes(previa, opcoes);
            estadoApres.previaBackup = null;
            estadoApres.textoBackupDraft = '';
            renderApresentacoesSstPanel();
            return res;
        } catch (err) {
            alert(err.message);
            return null;
        }
    }

    function cancelarPreviaBackupApresentacoesUI() {
        garantirEstadoSessaoApres();
        estadoApres.previaBackup = null;
        renderApresentacoesSstPanel();
    }

    function abrirApresentacoesDoCatalogoUI(cursoId) {
        garantirEstadoSessaoApres();
        if (typeof window.showDbPage === 'function') {
            window.showDbPage('apresentacoes_sst');
        }
        if (cursoId) {
            var existente = estadoApres.apresentacoes.find(function (a) { return String(a.curso_catalogo_id) === String(cursoId); });
            if (existente) {
                estadoApres.apresentacaoSelecionadaId = existente.id;
                sincronizarSlideSelecionado();
            }
        }
        renderApresentacoesSstPanel();
    }

    function abrirApresentacoesDaContextoIaUI(contextoId) {
        garantirEstadoSessaoApres();
        var idAlvo = contextoId;
        if (!idAlvo && typeof window.obterEstadoIaAprendizadoSomenteLeitura === 'function') {
            var estIa = window.obterEstadoIaAprendizadoSomenteLeitura();
            idAlvo = estIa ? estIa.contextoSelecionadoId : '';
        }
        if (typeof window.showDbPage === 'function') {
            window.showDbPage('apresentacoes_sst');
        }
        if (idAlvo) {
            var existente = estadoApres.apresentacoes.find(function (a) { return String(a.cenario_ia_id) === String(idAlvo); });
            if (existente) {
                estadoApres.apresentacaoSelecionadaId = existente.id;
                sincronizarSlideSelecionado();
            }
        }
        renderApresentacoesSstPanel();
    }

    function abrirApresentacoesDoMapaMentalUI(mapaId) {
        garantirEstadoSessaoApres();
        if (typeof window.showDbPage === 'function') {
            window.showDbPage('apresentacoes_sst');
        }
        if (mapaId) {
            var existente = estadoApres.apresentacoes.find(function (a) { return String(a.mapa_mental_id) === String(mapaId); });
            if (existente) {
                estadoApres.apresentacaoSelecionadaId = existente.id;
                sincronizarSlideSelecionado();
            }
        }
        renderApresentacoesSstPanel();
    }

    function navegarDeApresentacoesParaModuloUI(destino) {
        if (typeof window.showDbPage !== 'function') return;
        if (destino === 'treinamentos') {
            window.showDbPage('treinamentos');
            if (typeof window.showTreinamentosSubtab === 'function') {
                try { window.showTreinamentosSubtab('catalogo'); } catch (e) { /* ignora */ }
            }
        } else if (destino === 'mapa_mental') {
            window.showDbPage('ia_aprendizado');
            if (typeof window.selecionarAbaIaAprendizado === 'function') {
                window.selecionarAbaIaAprendizado('mapa');
            }
        } else {
            window.showDbPage('ia_aprendizado');
        }
    }

    function obterEstadoApresentacoesSst() {
        garantirEstadoSessaoApres();
        return clonarProfundo({
            identidadeChave: estadoApres.identidadeChave,
            geracaoSessaoId: estadoApres.geracaoSessaoId,
            abaAtiva: estadoApres.abaAtiva,
            apresentacaoSelecionadaId: estadoApres.apresentacaoSelecionadaId,
            slideSelecionadoId: estadoApres.slideSelecionadoId,
            mostrarNotaInstrutorProjetor: estadoApres.mostrarNotaInstrutorProjetor,
            ultimoBackupEm: estadoApres.ultimoBackupEm,
            alteracoesAposBackup: estadoApres.alteracoesAposBackup,
            apresentacoes: estadoApres.apresentacoes
        });
    }

    // Exportações públicas na janela global
    window.renderApresentacoesSstPanel = renderApresentacoesSstPanel;
    window.inicializarApresentacoesSst = renderApresentacoesSstPanel;
    window.obterEstadoApresentacoesSst = obterEstadoApresentacoesSst;
    window.obterPapelApresentacoesSst = obterPapelApresentacoes;
    window.calcularHashCanonicoApresentacaoSst = calcularHashCanonico;
    window.lerFontesDisponiveisNosModulosSst = lerFontesDisponiveisNosModulos;
    window.diagnosticarEvolucaoApresentacao = diagnosticarEvolucaoApresentacao;
    window.criarOuAtualizarApresentacao = criarOuAtualizarApresentacao;
    window.vincularFonteNaApresentacao = vincularFonteNaApresentacao;
    window.removerFonteVinculada = removerFonteVinculada;
    window.salvarSlideApresentacao = salvarSlideApresentacao;
    window.reordenarSlideApresentacao = reordenarSlideApresentacao;
    window.removerSlideApresentacao = removerSlideApresentacao;
    window.aplicarDecisaoEvolucaoNaApresentacao = aplicarDecisaoEvolucaoNaApresentacao;
    window.alterarStatusApresentacao = alterarStatusApresentacao;
    window.excluirApresentacao = excluirApresentacao;
    window.comporSlidesLocaisPorFontesVinculadas = comporSlidesLocaisPorFontesVinculadas;
    window.carregarApresentacaoPilotoConectada = carregarApresentacaoPilotoConectada;
    window.gerarPacoteExternoApresentacao = gerarPacoteExternoApresentacao;
    window.analisarImportacaoExternaApresentacao = analisarImportacaoExternaApresentacao;
    window.confirmarImportacaoExternaApresentacao = confirmarImportacaoExternaApresentacao;
    window.gerarBackupApresentacoesLocais = gerarBackupApresentacoesLocais;
    window.registrarBackupApresentacoesExportado = registrarBackupApresentacoesExportado;
    window.analisarBackupApresentacoesLocais = analisarBackupApresentacoesLocais;
    window.aplicarRestauracaoBackupApresentacoes = aplicarRestauracaoBackupApresentacoes;
    window.renderizarMoldeSlideInstitucionalHtml = renderizarMoldeSlideInstitucionalHtml;
    window.imprimirApresentacaoSst = imprimirApresentacaoSst;

    // Handlers UI e atalhos entre módulos
    window.selecionarAbaApresentacoesSstUI = selecionarAbaApresentacoesSstUI;
    window.abrirIndicadorEvolucaoApresentacaoUI = abrirIndicadorEvolucaoApresentacaoUI;
    window.selecionarApresentacaoSstUI = selecionarApresentacaoSstUI;
    window.selecionarSlideApresentacaoUI = selecionarSlideApresentacaoUI;
    window.abrirFormApresentacaoSstUI = abrirFormApresentacaoSstUI;
    window.fecharFormApresentacaoSstUI = fecharFormApresentacaoSstUI;
    window.salvarFormApresentacaoSstUI = salvarFormApresentacaoSstUI;
    window.abrirFormSlideApresentacaoUI = abrirFormSlideApresentacaoUI;
    window.fecharFormSlideApresentacaoUI = fecharFormSlideApresentacaoUI;
    window.salvarFormSlideApresentacaoUI = salvarFormSlideApresentacaoUI;
    window.reordenarSlideApresentacaoUI = reordenarSlideApresentacaoUI;
    window.removerSlideApresentacaoUI = removerSlideApresentacaoUI;
    window.comporSlidesPorFontesApresentacaoUI = comporSlidesPorFontesApresentacaoUI;
    window.vincularFonteModuloSelecionadaUI = vincularFonteModuloSelecionadaUI;
    window.adicionarFonteColadaApresentacaoUI = adicionarFonteColadaApresentacaoUI;
    window.removerFonteVinculadaApresentacaoUI = removerFonteVinculadaApresentacaoUI;
    window.aplicarDecisaoEvolucaoApresentacaoUI = aplicarDecisaoEvolucaoApresentacaoUI;
    window.revisarCitacaoSlideIndividualUI = revisarCitacaoSlideIndividualUI;
    window.atualizarVerificacaoFontesApresentacaoUI = atualizarVerificacaoFontesApresentacaoUI;
    window.alterarStatusApresentacaoSstUI = alterarStatusApresentacaoSstUI;
    window.excluirApresentacaoSstUI = excluirApresentacaoSstUI;
    window.carregarPilotoNr35ApresentacaoSstUI = carregarPilotoNr35ApresentacaoSstUI;
    window.navegarSlideProjetorSstUI = navegarSlideProjetorSstUI;
    window.alternarNotaInstrutorProjetorSstUI = alternarNotaInstrutorProjetorSstUI;
    window.alternarTelaCheiaProjetorSstUI = alternarTelaCheiaProjetorSstUI;
    window.alternarFiltroFontesValidadasPacoteUI = alternarFiltroFontesValidadasPacoteUI;
    window.imprimirApresentacaoSstUI = imprimirApresentacaoSstUI;
    window.copiarPacoteExternoApresentacaoUI = copiarPacoteExternoApresentacaoUI;
    window.atualizarRascunhoImportIaApresentacaoUI = atualizarRascunhoImportIaApresentacaoUI;
    window.preVisualizarImportacaoExternaApresentacaoUI = preVisualizarImportacaoExternaApresentacaoUI;
    window.confirmarImportacaoExternaApresentacaoUI = confirmarImportacaoExternaApresentacaoUI;
    window.cancelarImportacaoExternaApresentacaoUI = cancelarImportacaoExternaApresentacaoUI;
    window.alternarBoxBackupApresentacoesUI = alternarBoxBackupApresentacoesUI;
    window.exportarBackupApresentacoesUI = exportarBackupApresentacoesUI;
    window.atualizarRascunhoBackupApresentacoesUI = atualizarRascunhoBackupApresentacoesUI;
    window.lerArquivoBackupApresentacoesUI = lerArquivoBackupApresentacoesUI;
    window.preVisualizarBackupApresentacoesUI = preVisualizarBackupApresentacoesUI;
    window.confirmarRestauracaoBackupApresentacoesUI = confirmarRestauracaoBackupApresentacoesUI;
    window.cancelarPreviaBackupApresentacoesUI = cancelarPreviaBackupApresentacoesUI;
    window.abrirApresentacoesDoCatalogoUI = abrirApresentacoesDoCatalogoUI;
    window.abrirApresentacoesDaContextoIaUI = abrirApresentacoesDaContextoIaUI;
    window.abrirApresentacoesDoMapaMentalUI = abrirApresentacoesDoMapaMentalUI;
    window.navegarDeApresentacoesParaModuloUI = navegarDeApresentacoesParaModuloUI;

})(window);
