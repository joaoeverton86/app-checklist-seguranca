/**
 * dashboard/modules/ia_aprendizado.js
 * =============================================================================
 * MÓDULO: INTELIGÊNCIA SST & APRENDIZADO CONTÍNUO (APOIO TÉCNICO À APR)
 * Empreendimento: Consórcio Operador — PISF Ramal do Agreste
 * Referências Normativas: NR-01 (GRO/PGR - Trabalho Prescrito vs. Real),
 *                         NR-06 (EPI), NR-18 (Indústria da Construção)
 * =============================================================================
 * Governança e Segurança Incorporadas (Revisões Codex & Grok):
 * 1. Base inicial vazia (sem sementes pré-aprovadas e sem distanciamento fixo).
 * 2. NUNCA preenche Probabilidade (P) ou Severidade (S) automaticamente.
 * 3. Nenhuma chave de API de LLM no navegador, localStorage ou banco.
 * 4. Persistência local transacional (propaga erro se localStorage falhar e
 *    reverte memória; mede bytes UTF-8 reais; reconcilia storage antes de
 *    mutar para proteger contra concorrência entre duas abas).
 * 5. Revalidação estrita de regras ativas na transferência (regra revogada ou
 *    suspensa por ajuste bloqueia transferência; idempotência de aprovação;
 *    preservação separada de autor da sugestão vs. aprovador).
 * 6. Transferência filtrada pelo cenário selecionado (ou seleção explícita),
 *    detectando qualquer campo/linha parcial na APR antes de abrir nova APR e
 *    preservando qualquer linha não inteiramente vazia no modo acrescentar.
 * 7. Incorporação definitiva (`INCORPORADO_APR`) somente após confirmação de
 *    salvamento real da APR (`confirmarIncorporacaoAprSalva`), mantendo
 *    `EM_RASCUNHO_APR` durante a preparação.
 */

(function (window) {
    'use strict';

    var STORAGE_PREFIX = 'sst_ia_apr_local_v2_';
    var FORMATO_BACKUP_LOCAL = 'ia_aprendizado_backup_v1';
    var LIMITE_BYTES_FICHA_IMPORTACAO = 20480; // 20 KB em bytes UTF-8 reais
    var LIMITE_MAX_ITENS_IMPORTACAO = 20;
    var LIMITE_MAX_CONTEXTOS = 40;
    var LIMITE_MAX_SUGESTOES = 80;
    var LIMITE_BYTES_STORAGE_SESSAO = 204800; // 200 KB em bytes UTF-8 reais
    var LIMITE_BYTES_BACKUP_ARQUIVO = LIMITE_BYTES_STORAGE_SESSAO + 32768; // margem p/ envelope do arquivo .json; gravação continua limitada a 200 KB UTF-8

    var FASES_ROTEIRO_PERGUNTAS = [
        {
            id: 'DESLOCAMENTO_ACESSO',
            label: '1. Deslocamento e Acesso à Frente',
            icone: '🚐',
            perguntaPadrao: 'Como a equipe chega à frente, embarca/desembarca, transporta ferramentas e acessa o local (berma, talude, escada, via compartilhada)?'
        },
        {
            id: 'VIVENCIA_APOIO',
            label: '2. Montagem de Vivência e Apoio',
            icone: '⛺',
            perguntaPadrao: 'Como são instaladas e fixadas as estruturas de apoio (tenda, banheiro químico, lavatório, água potável, abrigo contra intempéries/vento)?'
        },
        {
            id: 'EXECUCAO_FERRAMENTAS',
            label: '3. Ferramentas Reais e Área de Ação',
            icone: '🛠️',
            perguntaPadrao: 'Quais ferramentas manuais/mecânicas são usadas, qual a área de ação/projeção entre trabalhadores e quais barreiras o procedimento aplicável exige?'
        },
        {
            id: 'AMBIENTE_INTERFERENCIAS',
            label: '4. Ambiente, Terreno, Fauna e Interferências (SIMOPS)',
            icone: '🐍',
            perguntaPadrao: 'Há blocos/pedras instáveis, fauna peçonhenta, radiação solar, redes energizadas ou máquinas operando simultaneamente no entorno?'
        },
        {
            id: 'EMERGENCIA_RESGATE',
            label: '5. Resgate, Comunicação e PAE',
            icone: '🚑',
            perguntaPadrao: 'Há sinal de comunicação, rota de evacuação desobstruída, veículo de apoio e referência de atendimento de emergência (PAE) para o trecho?'
        }
    ];

    var DICIONARIO_SINONIMOS = {
        rocagem: ['roçagem', 'rocada', 'roçada', 'capina', 'limpeza de vegetacao', 'vegetação regenerada', 'mato'],
        ferramenta_golpe: ['estrovenga', 'foice', 'chibanca', 'enxada', 'facão', 'facao', 'rastelo'],
        talude_pedra: ['talude', 'enrocado', 'enrocamento', 'pedra solta', 'rocha', 'berma', 'drenagem', 'canaleta'],
        fauna: ['peçonhento', 'peconhento', 'escorpião', 'escorpiao', 'serpente', 'cobra', 'jararaca', 'cascavel', 'abelha'],
        vivencia: ['tenda', 'vivência', 'vivencia', 'banheiro químico', 'banheiro quimico', 'lavatório', 'lavatorio'],
        transporte: ['caminhão', 'caminhao', 'ônibus', 'onibus', 'cabine suplementar', 'embarque', 'desembarque']
    };

    var CAMPOS_PERMITIDOS_CONTEXTO_JSON = new Set([
        'codigo_cenario', 'cargo_equipe', 'ghe_codigo', 'frente_servico',
        'rotina_detalhada', 'fases_operacionais', 'ferramentas_reais',
        'perigos_observados', 'epis_validados', 'regras_engenheiro', 'fonte_procedimento'
    ]);

    var CAMPOS_PERMITIDOS_SUGESTAO_JSON = new Set([
        'fase_operacional', 'passo_tarefa', 'perigo_fonte', 'evento_risco',
        'danos_provaveis', 'medidas_prevencao', 'epis_sugeridos', 'gatilhos',
        'evidencia_campo', 'fonte_consultada', 'hipotese_risco', 'pergunta_pendente',
        'norma_referencia', 'responsavel'
    ]);

    var CAMPOS_NOTA_IGNORADOS_JSON = new Set([
        'p_puro', 's_puro', 'p_residual', 's_residual',
        'risco_puro', 'risco_residual', 'probabilidade', 'severidade', 'gravidade'
    ]);

    var estadoModulo = {
        identidadeChave: null,
        geracaoSessaoId: 0,
        abaAtiva: 'exemplos',
        contextoSelecionadoId: '',
        aprSelecionadaId: '',
        textoLivreAnalise: '',
        previaImportacaoIa: null,
        previaBackupRestauracao: null,
        ultimoBackupEm: '',
        alteracoesAposBackup: false,
        filtroFilaStatus: 'TODOS',
        opcoesExportacaoPrompt: {
            incluirRotinaFases: true,
            incluirFerramentasPerigos: true,
            incluirExemplosRecuperados: true,
            incluirRegrasAprovadas: true,
            incluirAprRiscos: true
        },
        contextos: [],
        regrasAprendidas: [],
        sugestoesFila: [],
        historicoAuditoria: [],
        ultimoDiagnostico: null
    };

    var contadorIdsInterno = 0;
    function gerarIdUnico(prefixo) {
        contadorIdsInterno += 1;
        return prefixo + '_' + Date.now() + '_' + contadorIdsInterno + '_' + Math.random().toString(36).slice(2, 6);
    }

    function esc(valor) {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(valor);
        return String(valor == null ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizar(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function medirBytesUtf8(str) {
        var s = String(str == null ? '' : str);
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(s).length;
        }
        var bytes = 0;
        for (var i = 0; i < s.length; i++) {
            var code = s.charCodeAt(i);
            if (code <= 0x7f) bytes += 1;
            else if (code <= 0x7ff) bytes += 2;
            else if (code >= 0xd800 && code <= 0xdfff) { bytes += 4; i++; }
            else bytes += 3;
        }
        return bytes;
    }

    function contemConteudoProibidoImportacao(texto) {
        var s = String(texto || '');
        if (/<script\b|<\/script>|javascript:|data:text\/html|vbscript:|onerror\s*=|onload\s*=/i.test(s)) {
            return 'Conteúdo contém script ou instrução executável não permitida.';
        }
        if (/https?:\/\/[^\s"'<>]+/i.test(s)) {
            return 'URLs externas não são permitidas dentro de fichas/respostas importadas.';
        }
        return null;
    }

    function sanitizarDadosPessoaisParaExportacao(texto) {
        return String(texto || '')
            .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_OMITIDO]')
            .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_OMITIDO]')
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_OMITIDO]')
            .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g, '[TELEFONE_OMITIDO]');
    }

    // =========================================================================
    // 1. CONTROLE DE SESSÃO, PAPÉIS E PERSISTÊNCIA TRANSACIONAL
    // =========================================================================
    function obterSessaoSegura() {
        try {
            if (typeof window.sessaoDashboardAtual === 'function') {
                return window.sessaoDashboardAtual() || null;
            }
        } catch (e) { /* ignora */ }
        return null;
    }

    function obterPapelUsuarioIa() {
        var s = obterSessaoSegura();
        if (!s) return 'sem_sessao';
        try {
            if (typeof window.moduloPermitidoPainel === 'function' && !window.moduloPermitidoPainel('ia_aprendizado')) {
                return 'sem_acesso';
            }
        } catch (e) { /* continua */ }

        var podeGravar = false;
        try {
            if (typeof window.usuarioPodeGravarModulo === 'function') {
                podeGravar = !!window.usuarioPodeGravarModulo('ia_aprendizado');
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

    function usuarioPodeGravarApr() {
        var s = obterSessaoSegura();
        if (!s) return false;
        try {
            if (typeof window.moduloPermitidoPainel === 'function' && !window.moduloPermitidoPainel('apr')) {
                return false;
            }
            if (typeof window.usuarioPodeGravarModulo === 'function') {
                return !!window.usuarioPodeGravarModulo('apr');
            }
        } catch (e) { return false; }
        return s.tipo !== 'painel_externo' && s.somente_leitura !== true;
    }

    function obterIdentidadeSessaoChave() {
        var s = obterSessaoSegura();
        if (!s) return 'sem_sessao';
        var uid = String(s.uid || s.id || '').trim();
        var mat = String(s.matricula || '').trim();
        var tipo = String(s.tipo || 'interno').trim();
        return (tipo + '_' + (uid || 'sem_uid') + '_' + (mat || 'sem_mat')).replace(/[^a-zA-Z0-9_.-]/g, '_');
    }

    function garantirEstadoSessao() {
        var chaveAtual = obterIdentidadeSessaoChave();
        if (estadoModulo.identidadeChave !== chaveAtual) {
            estadoModulo.identidadeChave = chaveAtual;
            estadoModulo.geracaoSessaoId += 1;
            estadoModulo.abaAtiva = 'exemplos';
            estadoModulo.filtroFilaStatus = 'TODOS';
            estadoModulo.ultimoDiagnostico = null;
            estadoModulo.contextoSelecionadoId = '';
            estadoModulo.aprSelecionadaId = '';
            estadoModulo.textoLivreAnalise = '';
            estadoModulo.previaImportacaoIa = null;
            estadoModulo.previaBackupRestauracao = null;
            if (chaveAtual === 'sem_sessao') {
                estadoModulo.contextos = [];
                estadoModulo.regrasAprendidas = [];
                estadoModulo.sugestoesFila = [];
                estadoModulo.historicoAuditoria = [];
                estadoModulo.ultimoBackupEm = '';
                estadoModulo.alteracoesAposBackup = false;
            } else {
                carregarEstadoPersistido(chaveAtual);
            }
        }
        return estadoModulo.geracaoSessaoId;
    }

    function carregarEstadoPersistido(chaveSessao) {
        var chaveStorage = STORAGE_PREFIX + chaveSessao;
        var salvo = null;
        try {
            var bruto = localStorage.getItem(chaveStorage);
            if (bruto) salvo = JSON.parse(bruto);
        } catch (e) { salvo = null; }

        estadoModulo.contextos = (salvo && Array.isArray(salvo.contextos)) ? salvo.contextos : [];
        estadoModulo.regrasAprendidas = (salvo && Array.isArray(salvo.regrasAprendidas)) ? salvo.regrasAprendidas : [];
        estadoModulo.sugestoesFila = (salvo && Array.isArray(salvo.sugestoesFila)) ? salvo.sugestoesFila : [];
        estadoModulo.historicoAuditoria = (salvo && Array.isArray(salvo.historicoAuditoria)) ? salvo.historicoAuditoria : [];
        estadoModulo.ultimoBackupEm = (salvo && typeof salvo.ultimoBackupEm === 'string') ? salvo.ultimoBackupEm : '';
        estadoModulo.alteracoesAposBackup = !!(salvo && salvo.alteracoesAposBackup);
        if (!estadoModulo.contextoSelecionadoId || !estadoModulo.contextos.some(function (c) { return c.id === estadoModulo.contextoSelecionadoId; })) {
            estadoModulo.contextoSelecionadoId = estadoModulo.contextos[0] ? estadoModulo.contextos[0].id : '';
        }

        // Migração automática transparente de itens legados que tinham Passo da Tarefa genérico repetido ("Atividade de ... em ...")
        var migrouLegado = false;
        estadoModulo.sugestoesFila.forEach(function (sug, idx) {
            if (!sug || !sug.acao_proposta) return;
            var ctxRef = (sug.contexto_id && buscarContextoPorId(sug.contexto_id)) || estadoModulo.contextos[0] || null;
            if (ehPropostaGenericaLegada(sug.acao_proposta, ctxRef)) {
                var refinada = construirPropostaTecnicaPorPerigo(sug.acao_proposta.perigo_fonte, idx, ctxRef);
                sug.acao_proposta.passo_tarefa = refinada.passo_tarefa;
                sug.acao_proposta.evento_risco = refinada.evento_risco;
                sug.acao_proposta.danos_provaveis = refinada.danos_provaveis;
                sug.acao_proposta.medidas_prevencao = refinada.medidas_prevencao;
                sug.fase_operacional = refinada.fase_operacional || sug.fase_operacional;
                migrouLegado = true;
            }
        });
        estadoModulo.regrasAprendidas.forEach(function (regra, idx) {
            if (!regra) return;
            var ctxRef = (regra.contexto_aplicavel_id && buscarContextoPorId(regra.contexto_aplicavel_id)) || estadoModulo.contextos[0] || null;
            if (ehPropostaGenericaLegada(regra, ctxRef)) {
                var refinada = construirPropostaTecnicaPorPerigo(regra.perigo_fonte, idx, ctxRef);
                regra.passo_tarefa = refinada.passo_tarefa;
                regra.evento_risco = refinada.evento_risco;
                regra.danos_provaveis = refinada.danos_provaveis;
                regra.medidas_prevencao = refinada.medidas_prevencao;
                regra.fase = refinada.fase_operacional || regra.fase;
                migrouLegado = true;
            }
        });
        if (migrouLegado && chaveSessao && chaveSessao !== 'sem_sessao') {
            try {
                localStorage.setItem(chaveStorage, serializarEstadoAtual());
            } catch (e) { /* preserva em memória mesmo se o storage estiver cheio */ }
        }
    }

    function sincronizarDoStorageParaConcorrencia() {
        garantirEstadoSessao();
        if (estadoModulo.identidadeChave === 'sem_sessao') return;
        var selAntes = estadoModulo.contextoSelecionadoId;
        carregarEstadoPersistido(estadoModulo.identidadeChave);
        if (selAntes && estadoModulo.contextos.some(function (c) { return c.id === selAntes; })) {
            estadoModulo.contextoSelecionadoId = selAntes;
        }
    }

    function serializarEstadoAtual() {
        return JSON.stringify({
            contextos: estadoModulo.contextos,
            regrasAprendidas: estadoModulo.regrasAprendidas,
            sugestoesFila: estadoModulo.sugestoesFila,
            historicoAuditoria: estadoModulo.historicoAuditoria,
            ultimoBackupEm: estadoModulo.ultimoBackupEm || '',
            alteracoesAposBackup: !!estadoModulo.alteracoesAposBackup
        });
    }

    function restaurarEstadoDeJson(jsonSnapshot, selAnterior) {
        var obj = JSON.parse(jsonSnapshot);
        estadoModulo.contextos = obj.contextos || [];
        estadoModulo.regrasAprendidas = obj.regrasAprendidas || [];
        estadoModulo.sugestoesFila = obj.sugestoesFila || [];
        estadoModulo.historicoAuditoria = obj.historicoAuditoria || [];
        estadoModulo.ultimoBackupEm = obj.ultimoBackupEm || '';
        estadoModulo.alteracoesAposBackup = !!obj.alteracoesAposBackup;
        estadoModulo.contextoSelecionadoId = selAnterior || (estadoModulo.contextos[0] ? estadoModulo.contextos[0].id : '');
    }

    function calcularConsumoBytesEstado() {
        var json = serializarEstadoAtual();
        var bytes = medirBytesUtf8(json);
        return {
            bytes: bytes,
            kb: Math.round((bytes / 1024) * 10) / 10,
            limiteKb: Math.round(LIMITE_BYTES_STORAGE_SESSAO / 1024),
            json: json
        };
    }

    function persistirOuReverter(snapshotAnterior, selAnterior) {
        if (estadoModulo.identidadeChave === 'sem_sessao') {
            restaurarEstadoDeJson(snapshotAnterior, selAnterior);
            throw new Error('Sessão não identificada para persistência local.');
        }
        try {
            if (estadoModulo.contextos.length > LIMITE_MAX_CONTEXTOS) {
                throw new Error('Limite local de ' + LIMITE_MAX_CONTEXTOS + ' cenários atingido.');
            }
            if (estadoModulo.sugestoesFila.length > LIMITE_MAX_SUGESTOES) {
                throw new Error('Limite local de ' + LIMITE_MAX_SUGESTOES + ' sugestões na fila atingido.');
            }
            var consumo = calcularConsumoBytesEstado();
            if (consumo.bytes > LIMITE_BYTES_STORAGE_SESSAO) {
                throw new Error('Limite de armazenamento local (' + consumo.limiteKb + ' KB) excedido.');
            }
            var chaveStorage = STORAGE_PREFIX + estadoModulo.identidadeChave;
            localStorage.setItem(chaveStorage, consumo.json);
        } catch (err) {
            restaurarEstadoDeJson(snapshotAnterior, selAnterior);
            throw new Error('Falha ao gravar no armazenamento local do navegador (' + (err && err.message ? err.message : String(err)) + '). Nenhuma alteração foi salva.');
        }
    }

    function executarMutacaoPersistida(fnMutacao, opcoesMutacao) {
        sincronizarDoStorageParaConcorrencia();
        var snapshotAnterior = serializarEstadoAtual();
        var selAnterior = estadoModulo.contextoSelecionadoId;
        var resultado;
        try {
            resultado = fnMutacao();
            if (!opcoesMutacao || !opcoesMutacao.preservarFlagBackup) {
                estadoModulo.alteracoesAposBackup = true;
            }
        } catch (errMutacao) {
            restaurarEstadoDeJson(snapshotAnterior, selAnterior);
            throw errMutacao;
        }
        persistirOuReverter(snapshotAnterior, selAnterior);
        return resultado;
    }

    function registrarEventoAuditoria(acao, alvoId, detalhes) {
        var s = obterSessaoSegura() || {};
        estadoModulo.historicoAuditoria.unshift({
            id: gerarIdUnico('aud'),
            acao: acao,
            alvo_id: alvoId,
            papel: obterPapelUsuarioIa(),
            autor_uid: String(s.uid || s.id || ''),
            autor_matricula: String(s.matricula || ''),
            detalhes: String(detalhes || ''),
            timestamp: new Date().toISOString()
        });
        if (estadoModulo.historicoAuditoria.length > 120) {
            estadoModulo.historicoAuditoria.length = 120;
        }
    }

    // =========================================================================
    // 2. RASCUNHO DE ESTUDO OPCIONAL (SEM APROVAÇÃO AUTOMÁTICA)
    // =========================================================================
    function carregarRascunhoEstudoOpcional() {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão insuficiente: apenas editores ou validadores podem criar rascunhos de cenário.');
        }
        return executarMutacaoPersistida(function () {
            var idRascunho = 'ctx_rascunho_servente_civil';
            var jaExiste = estadoModulo.contextos.find(function (c) { return c.id === idRascunho; });
            if (jaExiste) {
                estadoModulo.contextoSelecionadoId = jaExiste.id;
                return jaExiste;
            }
            var s = obterSessaoSegura() || {};
            var rascunho = {
                id: idRascunho,
                versao: 1,
                status_cenario: 'RASCUNHO_NAO_APROVADO',
                codigo_cenario: 'RASCUNHO-001',
                cargo_equipe: 'Servente - Equipe Civil (Rascunho p/ Revisão)',
                ghe_codigo: '',
                frente_servico: 'Taludes Enrocados e Drenagem',
                fonte_procedimento: 'Pendente de vinculação ao procedimento operacional / PGR vigente',
                rotina_detalhada: 'Deslocamento da equipe em caminhão cabine/ônibus; montagem de estrutura de vivência (tenda, banheiro químico, lavatório); limpeza de vegetação regenerada em taludes enrocados e drenagem com chibanca, foice, estrovenga, enxada, rastelo e carrinho de mão.',
                fases_operacionais: {
                    DESLOCAMENTO_ACESSO: 'Embarque/desembarque em veículo de transporte coletivo/caminhão cabine e acesso por berma e talude enrocado.',
                    VIVENCIA_APOIO: 'Montagem e fixação de tenda de vivência, posicionamento de banheiro químico e lavatório.',
                    EXECUCAO_FERRAMENTAS: 'Manuseio de ferramentas manuais de corte e escavação (chibanca, foice, estrovenga, enxada, rastelo) e transporte com carrinho de mão.',
                    AMBIENTE_INTERFERENCIAS: 'Terreno inclinado com blocos de rocha (pedras soltas), possibilidade de fauna peçonhenta nas frestas, radiação solar e circulação de veículos na berma.',
                    EMERGENCIA_RESGATE: 'Verificação de comunicação na frente, veículo de apoio e fluxo de acionamento do PAE.'
                },
                ferramentas_reais: ['Chibanca', 'Foice', 'Estrovenga', 'Enxada', 'Rastelo', 'Carrinho de mão', 'Tenda de vivência', 'Banheiro químico'],
                perigos_observados: [
                    'Interferência física no raio de ação entre trabalhadores manejando ferramentas de corte/impacto',
                    'Desvio ou rebote de ferramenta ao atingir bloco de rocha oculto na vegetação',
                    'Instabilidade ou rolamento de pedras soltas no talude enrocado',
                    'Presença de animais peçonhentos abrigados nas frestas do enrocamento',
                    'Instabilidade de tenda/banheiro químico sob ação de vento ou piso irregular',
                    'Exposição solar a céu aberto e circulação de veículos/máquinas na berma'
                ],
                epis_validados: ['Capacete com Jugular', 'Óculos de Proteção', 'Calçado de Segurança c/ Biqueira', 'Perneira 3 Talas', 'Protetor Solar', 'Luvas de Proteção'],
                regras_engenheiro: '',
                ativo: true,
                criado_por_matricula: String(s.matricula || ''),
                updated_at: new Date().toISOString()
            };
            estadoModulo.contextos.unshift(rascunho);
            estadoModulo.contextoSelecionadoId = rascunho.id;
            registrarEventoAuditoria('CRIAR_RASCUNHO_ESTUDO', rascunho.id, 'Rascunho opcional carregado sem aprovação.');
            return rascunho;
        });
    }

    // =========================================================================
    // 3. CRIAR / ATUALIZAR CENÁRIO COM CONCORRÊNCIA ENTRE ABAS
    // =========================================================================
    function buscarContextoPorId(id) {
        return estadoModulo.contextos.find(function (c) { return c.id === id; }) || null;
    }

    function salvarContextoOperacional(dados) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: seu perfil não possui autorização para criar ou editar cenários.');
        }
        dados = dados || {};
        var cargo = String(dados.cargo_equipe || '').trim();
        if (!cargo) throw new Error('Informe o Cargo / Equipe do cenário.');

        var erroProibido = contemConteudoProibidoImportacao(JSON.stringify(dados));
        if (erroProibido) throw new Error(erroProibido);

        return executarMutacaoPersistida(function () {
            var s = obterSessaoSegura() || {};
            var existente = dados.id ? buscarContextoPorId(dados.id) : null;

            if (existente) {
                var versaoEsperada = dados.versaoEsperada !== undefined ? Number(dados.versaoEsperada) : Number(existente.versao || 1);
                if (versaoEsperada !== Number(existente.versao || 1)) {
                    throw new Error('Conflito de edição concorrente: o cenário já foi atualizado em outra aba/sessão (versão atual ' + (existente.versao || 1) + '). Recarregue antes de salvar.');
                }
                existente.versao = (Number(existente.versao) || 1) + 1;
                existente.cargo_equipe = cargo;
                if (dados.ghe_codigo !== undefined) {
                    existente.ghe_codigo = String(dados.ghe_codigo || '').trim();
                }
                if (dados.frente_servico !== undefined) {
                    existente.frente_servico = String(dados.frente_servico || 'Geral').trim();
                }
                if (dados.fonte_procedimento !== undefined) {
                    existente.fonte_procedimento = String(dados.fonte_procedimento || '').trim();
                }
                if (dados.rotina_detalhada !== undefined) {
                    existente.rotina_detalhada = String(dados.rotina_detalhada || '').trim();
                }
                if (dados.fases_operacionais && typeof dados.fases_operacionais === 'object') {
                    existente.fases_operacionais = Object.assign({}, existente.fases_operacionais, dados.fases_operacionais);
                }
                if (Array.isArray(dados.ferramentas_reais)) existente.ferramentas_reais = dados.ferramentas_reais.map(String);
                if (Array.isArray(dados.perigos_observados)) existente.perigos_observados = dados.perigos_observados.map(String);
                if (Array.isArray(dados.epis_validados)) existente.epis_validados = dados.epis_validados.map(String);
                if (dados.regras_engenheiro !== undefined) existente.regras_engenheiro = String(dados.regras_engenheiro || '').trim();
                existente.updated_at = new Date().toISOString();
                registrarEventoAuditoria('EDITAR_CENARIO', existente.id, 'Versão ' + existente.versao);
                return existente;
            }

            var novo = {
                id: gerarIdUnico('ctx'),
                versao: 1,
                status_cenario: 'RASCUNHO_NAO_APROVADO',
                codigo_cenario: String(dados.codigo_cenario || ('CEN-' + String(estadoModulo.contextos.length + 1).padStart(3, '0'))),
                cargo_equipe: cargo,
                ghe_codigo: String(dados.ghe_codigo || '').trim(),
                frente_servico: String(dados.frente_servico || 'Geral').trim(),
                fonte_procedimento: String(dados.fonte_procedimento || '').trim(),
                rotina_detalhada: String(dados.rotina_detalhada || '').trim(),
                fases_operacionais: (dados.fases_operacionais && typeof dados.fases_operacionais === 'object') ? dados.fases_operacionais : {},
                ferramentas_reais: Array.isArray(dados.ferramentas_reais) ? dados.ferramentas_reais.map(String) : [],
                perigos_observados: Array.isArray(dados.perigos_observados) ? dados.perigos_observados.map(String) : [],
                epis_validados: Array.isArray(dados.epis_validados) ? dados.epis_validados.map(String) : [],
                regras_engenheiro: String(dados.regras_engenheiro || '').trim(),
                ativo: true,
                criado_por_matricula: String(s.matricula || ''),
                updated_at: new Date().toISOString()
            };
            estadoModulo.contextos.unshift(novo);
            estadoModulo.contextoSelecionadoId = novo.id;
            registrarEventoAuditoria('CRIAR_CENARIO', novo.id, novo.cargo_equipe);
            return novo;
        });
    }

    // =========================================================================
    // 4. RECUPERAÇÃO POR RELEVÂNCIA E VARREDURA LOCAL
    // =========================================================================
    function expandirTermosComSinonimos(texto) {
        var base = normalizar(texto);
        var termos = new Set(base.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; }));
        Object.keys(DICIONARIO_SINONIMOS).forEach(function (grupo) {
            var lista = DICIONARIO_SINONIMOS[grupo];
            var bateu = lista.some(function (sin) { return base.indexOf(normalizar(sin)) !== -1; });
            if (bateu) {
                termos.add(grupo);
                lista.forEach(function (sin) { termos.add(normalizar(sin)); });
            }
        });
        return { textoNormalizado: base, termos: termos };
    }

    function recuperarExemplosERegrasRelevantes(corpusTexto) {
        var expandido = expandirTermosComSinonimos(corpusTexto);
        var exemplosRecuperados = [];
        estadoModulo.contextos.filter(function (c) { return c.ativo !== false; }).forEach(function (c) {
            var textoC = [c.cargo_equipe, c.frente_servico, c.rotina_detalhada, (c.ferramentas_reais || []).join(' '), (c.perigos_observados || []).join(' ')].join(' ');
            var normC = normalizar(textoC);
            var motivos = [];
            (c.ferramentas_reais || []).forEach(function (f) {
                if (expandido.textoNormalizado.indexOf(normalizar(f)) !== -1) motivos.push('ferramenta "' + f + '"');
            });
            if (c.frente_servico && expandido.textoNormalizado.indexOf(normalizar(c.frente_servico)) !== -1) {
                motivos.push('frente "' + c.frente_servico + '"');
            }
            expandido.termos.forEach(function (termo) {
                if (termo.length >= 4 && normC.indexOf(termo) !== -1 && motivos.length < 4) {
                    motivos.push('termo/sinônimo "' + termo + '"');
                }
            });
            if (motivos.length > 0) {
                exemplosRecuperados.push({
                    id: c.id,
                    codigo_cenario: c.codigo_cenario,
                    cargo_equipe: c.cargo_equipe,
                    frente_servico: c.frente_servico,
                    ferramentas_reais: c.ferramentas_reais || [],
                    versao: c.versao || 1,
                    status_cenario: c.status_cenario || 'RASCUNHO_NAO_APROVADO',
                    fonte_procedimento: c.fonte_procedimento || 'Fonte documental não informada (pendente)',
                    motivosRecuperacao: motivos,
                    pontuacaoRelevancia: motivos.length
                });
            }
        });
        exemplosRecuperados.sort(function (a, b) { return b.pontuacaoRelevancia - a.pontuacaoRelevancia; });

        var regrasRecuperadas = [];
        estadoModulo.regrasAprendidas.filter(function (r) {
            return r.ativo === true && r.status_regra === 'APROVADO';
        }).forEach(function (regra) {
            var gatilhosBatidos = (regra.gatilhos || []).filter(function (g) {
                var gn = normalizar(g);
                return gn && (expandido.textoNormalizado.indexOf(gn) !== -1 || expandido.termos.has(gn));
            });
            if (gatilhosBatidos.length > 0) {
                regrasRecuperadas.push({
                    regra: regra,
                    gatilhosAcionados: gatilhosBatidos,
                    pontuacaoRelevancia: gatilhosBatidos.length,
                    motivo: 'Acionada pelos termos [' + gatilhosBatidos.join(', ') + '] (Regra v' + (regra.versao || 1) + ', fonte: ' + (regra.fonte_consultada || 'Pendente') + ')'
                });
            }
        });
        regrasRecuperadas.sort(function (a, b) { return b.pontuacaoRelevancia - a.pontuacaoRelevancia; });

        return { exemplosRecuperados: exemplosRecuperados, regrasRecuperadas: regrasRecuperadas };
    }

    function auditarMedidasFracasApr(apr) {
        var alertas = [];
        if (!apr || !Array.isArray(apr.riscos)) return alertas;
        var regexFraca = /^(usar epi|utilizar epi|uso de epi|ter aten[cç][aã]o|aten[cç][aã]o na atividade|cuidado|manter aten[cç][aã]o|cumprir procedimentos|orientar equipe)\.?$/i;
        apr.riscos.forEach(function (r, idx) {
            var med = String(r.medidas_prevencao || '').trim();
            if (!med || med.length < 18 || regexFraca.test(med)) {
                alertas.push({
                    linha: idx + 1,
                    passo: r.passo_tarefa || 'Linha ' + (idx + 1),
                    medidaAtual: med || '(Em branco)',
                    motivo: 'Medida genérica ou ausente — requer especificação de controle operacional pela Engenharia.'
                });
            }
            var pPuro = Number(r.p_puro) || 0;
            var sPuro = Number(r.s_puro) || 0;
            var pRes = Number(r.p_residual) || 0;
            var sRes = Number(r.s_residual) || 0;
            if (!pPuro || !sPuro || !pRes || !sRes) {
                alertas.push({
                    linha: idx + 1,
                    passo: r.passo_tarefa || 'Linha ' + (idx + 1),
                    medidaAtual: 'P×S incompleto',
                    motivo: 'Probabilidade ou Severidade ainda não avaliada manualmente pelo responsável.'
                });
            } else if ((pRes * sRes) > (pPuro * sPuro)) {
                alertas.push({
                    linha: idx + 1,
                    passo: r.passo_tarefa || 'Linha ' + (idx + 1),
                    medidaAtual: 'P×S Puro (' + pPuro + '×' + sPuro + ') vs Residual (' + pRes + '×' + sRes + ')',
                    motivo: 'Revisar manualmente: pontuação residual superior à pura.'
                });
            }
        });
        return alertas;
    }

    function executarVarreduraRiscosOcultos(opcoes) {
        var geracaoInicial = garantirEstadoSessao();
        opcoes = opcoes || {};
        var ctx = opcoes.contexto || buscarContextoPorId(estadoModulo.contextoSelecionadoId);
        var textoLivre = String(opcoes.textoLivre || '').trim();
        var aprAlvo = opcoes.apr || null;
        if (!aprAlvo && estadoModulo.aprSelecionadaId && Array.isArray(window.allAprRegistros)) {
            aprAlvo = window.allAprRegistros.find(function (a) { return String(a.id) === String(estadoModulo.aprSelecionadaId); }) || null;
        }

        var textoAprExistente = '';
        if (aprAlvo) {
            textoAprExistente = normalizar([
                aprAlvo.titulo,
                aprAlvo.descricao_atividade,
                (aprAlvo.riscos || []).map(function (r) {
                    return [r.passo_tarefa, r.perigo_fonte, r.evento_risco, r.medidas_prevencao].join(' ');
                }).join(' ')
            ].join(' '));
        }

        var corpus = [
            ctx ? ctx.cargo_equipe : '',
            ctx ? ctx.frente_servico : '',
            ctx ? ctx.rotina_detalhada : '',
            ctx ? Object.values(ctx.fases_operacionais || {}).join(' ') : '',
            ctx ? (ctx.ferramentas_reais || []).join(' ') : '',
            ctx ? (ctx.perigos_observados || []).join(' ') : '',
            textoLivre,
            aprAlvo ? (aprAlvo.titulo + ' ' + aprAlvo.descricao_atividade) : ''
        ].join(' ');

        var recuperacao = recuperarExemplosERegrasRelevantes(corpus);
        var lacunasPropostas = [];
        var itensJaContemplados = [];
        var s = obterSessaoSegura() || {};

        recuperacao.regrasRecuperadas.forEach(function (item) {
            var r = item.regra;
            var chavePerigo = normalizar(r.perigo_fonte).slice(0, 24);
            if (textoAprExistente && chavePerigo && textoAprExistente.indexOf(chavePerigo) !== -1) {
                itensJaContemplados.push({
                    origem: 'Regra Aprovada v' + (r.versao || 1),
                    passo_tarefa: r.passo_tarefa,
                    perigo_fonte: r.perigo_fonte
                });
                return;
            }
            lacunasPropostas.push({
                id: 'sug_reg_' + r.id + '_' + Date.now(),
                versao: 1,
                origem_regra_id: r.id,
                origem_regra_versao: r.versao || 1,
                regra_gerada_id: r.id,
                contexto_id: ctx ? ctx.id : null,
                modulo_destino: 'APR',
                fase_operacional: r.fase || 'EXECUCAO_FERRAMENTAS',
                titulo_insight: 'Regra Aprovada Acionada (' + item.gatilhosAcionados.join(', ') + '): ' + r.passo_tarefa,
                descricao_analise: item.motivo,
                acao_proposta: {
                    passo_tarefa: r.passo_tarefa,
                    perigo_fonte: r.perigo_fonte,
                    evento_risco: r.evento_risco,
                    danos_provaveis: r.danos_provaveis,
                    p_puro: '',
                    s_puro: '',
                    medidas_prevencao: r.medidas_prevencao,
                    p_residual: '',
                    s_residual: '',
                    responsavel: 'Definir na APR (Encarregado / SESMT)',
                    epis_sugeridos: Array.isArray(r.epis_sugeridos) ? r.epis_sugeridos.slice() : [],
                    norma_referencia: r.norma_referencia || 'NR-01 / NR-18',
                    gatilhos: item.gatilhosAcionados,
                    evidencia_campo: r.evidencia_campo || 'Regra previamente validada pela Engenharia SST',
                    fonte_consultada: r.fonte_consultada || 'Biblioteca Aprovada v' + (r.versao || 1),
                    hipotese_risco: r.evento_risco,
                    pergunta_pendente: r.pergunta_pendente || 'Confirmar aplicabilidade e avaliar P×S manualmente na frente de serviço do dia.'
                },
                status: 'RASCUNHO',
                feedback_engenheiro: '',
                criado_por_matricula: String(s.matricula || ''),
                aprovado_por_matricula: '',
                created_at: new Date().toISOString()
            });
        });

        if (ctx && Array.isArray(ctx.perigos_observados)) {
            ctx.perigos_observados.forEach(function (perigoTxt, idx) {
                var pNorm = normalizar(perigoTxt);
                if (!pNorm) return;
                if (textoAprExistente && textoAprExistente.indexOf(pNorm.slice(0, 22)) !== -1) {
                    itensJaContemplados.push({
                        origem: 'Cenário ' + (ctx.codigo_cenario || ctx.id),
                        passo_tarefa: ctx.cargo_equipe,
                        perigo_fonte: perigoTxt
                    });
                    return;
                }
                var jaExiste = lacunasPropostas.some(function (l) {
                    return normalizar(l.acao_proposta.perigo_fonte) === pNorm;
                });
                if (jaExiste) return;

                var fonteDoc = ctx.fonte_procedimento || 'Pendente: vincular procedimento operacional / PGR';
                var propostaDetalhada = construirPropostaTecnicaPorPerigo(perigoTxt, idx, ctx);
                lacunasPropostas.push({
                    id: 'sug_ctx_' + Date.now() + '_' + idx,
                    versao: 1,
                    origem_regra_id: null,
                    regra_gerada_id: null,
                    contexto_id: ctx.id,
                    modulo_destino: 'APR',
                    fase_operacional: propostaDetalhada.fase_operacional,
                    titulo_insight: 'Hipótese de Risco do Cenário: ' + perigoTxt,
                    descricao_analise: 'Origem: cenário "' + ctx.cargo_equipe + '" (v' + (ctx.versao || 1) + ', status: ' + (ctx.status_cenario || 'RASCUNHO') + ').',
                    acao_proposta: {
                        passo_tarefa: propostaDetalhada.passo_tarefa,
                        perigo_fonte: perigoTxt,
                        evento_risco: propostaDetalhada.evento_risco,
                        danos_provaveis: propostaDetalhada.danos_provaveis,
                        p_puro: '',
                        s_puro: '',
                        medidas_prevencao: propostaDetalhada.medidas_prevencao,
                        p_residual: '',
                        s_residual: '',
                        responsavel: 'Definir na APR',
                        epis_sugeridos: Array.isArray(ctx.epis_validados) ? ctx.epis_validados.slice() : [],
                        norma_referencia: propostaDetalhada.norma_referencia || 'NR-01 / NR-18',
                        gatilhos: extrairGatilhosTexto(perigoTxt),
                        evidencia_campo: 'Relato/observação no cenário ' + (ctx.codigo_cenario || ctx.id),
                        fonte_consultada: fonteDoc,
                        hipotese_risco: 'Possível ponto cego caso a APR não detalhe controle específico para "' + perigoTxt + '".',
                        pergunta_pendente: propostaDetalhada.pergunta_pendente || 'Qual a barreira física/procedimental e o distanciamento exigidos pelo procedimento desta frente?'
                    },
                    status: 'RASCUNHO',
                    feedback_engenheiro: '',
                    criado_por_matricula: String(s.matricula || ''),
                    aprovado_por_matricula: '',
                    created_at: new Date().toISOString()
                });
            });
        }

        if (geracaoInicial !== estadoModulo.geracaoSessaoId) {
            return null;
        }

        var adicionadas = 0;
        var podeEscrever = ['editor', 'validador'].includes(obterPapelUsuarioIa());
        if (podeEscrever && lacunasPropostas.length > 0) {
            executarMutacaoPersistida(function () {
                lacunasPropostas.forEach(function (nova) {
                    var duplicada = estadoModulo.sugestoesFila.some(function (ex) {
                        return ex.status !== 'DESCARTADO' &&
                            ex.contexto_id === nova.contexto_id &&
                            normalizar(ex.acao_proposta.passo_tarefa) === normalizar(nova.acao_proposta.passo_tarefa) &&
                            normalizar(ex.acao_proposta.perigo_fonte) === normalizar(nova.acao_proposta.perigo_fonte);
                    });
                    if (!duplicada && estadoModulo.sugestoesFila.length < LIMITE_MAX_SUGESTOES) {
                        estadoModulo.sugestoesFila.unshift(nova);
                        adicionadas++;
                    }
                });
            });
        }

        var fasesPendentes = ctx
            ? FASES_ROTEIRO_PERGUNTAS.filter(function (f) {
                var val = ctx.fases_operacionais ? String(ctx.fases_operacionais[f.id] || '').trim() : '';
                return !val;
            }).map(function (f) { return f.label; })
            : [];

        var motivoZero = '';
        if (lacunasPropostas.length === 0) {
            if (!ctx && estadoModulo.regrasAprendidas.filter(function (r) { return r.ativo === true && r.status_regra === 'APROVADO'; }).length === 0) {
                motivoZero = 'Nenhum cenário cadastrado na Aba 1 e nenhuma regra aprovada neste navegador. A verificação local só consulta seus cenários e regras aprovadas — para analisar uma atividade nova agora, crie um rascunho de cenário ou use o Modo 2 abaixo para consultar ChatGPT / Gemini / Claude.';
            } else if (aprAlvo && itensJaContemplados.length > 0) {
                motivoZero = 'Todos os perigos listados no cenário/regras encontradas já aparecem mencionados na APR ' + aprAlvo.id + ' (diferença de redação não comprova ausência de lacuna técnica — revise manualmente).';
            } else if (ctx && (!Array.isArray(ctx.perigos_observados) || ctx.perigos_observados.length === 0)) {
                motivoZero = 'O cenário "' + ctx.cargo_equipe + '" ainda não possui Perigos Observados cadastrados e nenhuma regra aprovada casou com os termos informados. Edite o cenário ou use o Modo 2 para consultar uma IA externa.';
            } else {
                motivoZero = 'Nenhuma regra aprovada adicional ou perigo não contemplado foi encontrado para os termos atuais.';
            }
        }

        estadoModulo.ultimoDiagnostico = {
            executadoEm: new Date().toISOString(),
            modoMotor: 'Lista de Verificação Local & Busca por Palavras-Chave/Sinônimos (Não é LLM treinada)',
            avisoEscopo: 'Ausência de apontamento nesta verificação não comprova ausência de risco nem conformidade normativa. Diferença de palavras não comprova lacuna técnica.',
            escopoIntegracaoAdiadas: 'Cruzamento automático com banco remoto de NCs/GHE não executado neste modo local.',
            temCenario: !!ctx,
            contextoNome: ctx ? ctx.cargo_equipe : 'Nenhum cenário selecionado',
            contextoVersao: ctx ? (ctx.versao || 1) : null,
            aprAuditadaId: aprAlvo ? aprAlvo.id : null,
            aprAuditadaTitulo: aprAlvo ? (aprAlvo.titulo || '') : '',
            aprAuditadaData: aprAlvo ? (aprAlvo.data_emissao || '') : '',
            totalLacunas: lacunasPropostas.length,
            novosNaFila: adicionadas,
            motivoZero: motivoZero,
            perigosPossivelmenteAusentes: lacunasPropostas.map(function (l) {
                return {
                    passo_tarefa: l.acao_proposta.passo_tarefa,
                    perigo_fonte: l.acao_proposta.perigo_fonte,
                    origem: l.descricao_analise
                };
            }),
            itensJaContemplados: itensJaContemplados,
            fasesSemInformacao: fasesPendentes,
            exemplosRecuperados: recuperacao.exemplosRecuperados,
            regrasRecuperadas: recuperacao.regrasRecuperadas.map(function (x) { return x.motivo; }),
            alertasMedidasFracas: auditarMedidasFracasApr(aprAlvo)
        };

        return estadoModulo.ultimoDiagnostico;
    }

    function obterLabelFase(faseId) {
        var f = FASES_ROTEIRO_PERGUNTAS.find(function (x) { return x.id === faseId; });
        return f ? f.label : '3. Ferramentas Reais e Área de Ação';
    }

    function inferirFaseRoteiro(texto) {
        var t = normalizar(texto);
        if (/caminhao|onibus|transporte|deslocamento|acesso|embarque|atropelamento/.test(t)) return 'DESLOCAMENTO_ACESSO';
        if (/tenda|vivencia|banheiro|lavatorio|agua|vento/.test(t)) return 'VIVENCIA_APOIO';
        if (/peconhent|escorpiao|serpente|cobra|pedra|talude|sol|calor|radiacao/.test(t)) return 'AMBIENTE_INTERFERENCIAS';
        if (/resgate|emergencia|pae|socorro|comunicacao/.test(t)) return 'EMERGENCIA_RESGATE';
        return 'EXECUCAO_FERRAMENTAS';
    }

    function extrairGatilhosTexto(texto) {
        var limpo = sanitizarDadosPessoaisParaExportacao(texto);
        var stop = { para: 1, com: 1, sem: 1, por: 1, dos: 1, das: 1, nos: 1, nas: 1, entre: 1, sobre: 1, durante: 1, falta: 1, risco: 1, cpf_omitido: 1, email_omitido: 1, telefone_omitido: 1 };
        return normalizar(limpo)
            .split(/[^a-z0-9]+/)
            .filter(function (w) { return w.length >= 4 && !stop[w]; })
            .slice(0, 4);
    }

    var PERFIS_TECNICOS_POR_PERIGO = [
        {
            regex: /movimentacao|transporte manual|levantamento|carga|descarga|carrinho de mao|peso|ergonom/,
            fase: 'EXECUCAO_FERRAMENTAS',
            passo_tarefa: 'Transporte manual, carga, descarga e posicionamento de materiais e insumos na frente de serviço',
            evento_risco: 'Esforço físico excessivo, postura inadequada, queda de materiais ou prensamento de membros durante o manuseio',
            danos_provaveis: 'Lombalgia, distensão muscular, contusões ou escoriações em mãos e pés',
            medida_base: 'Fracionar cargas ou utilizar auxílio mecânico/carrinho de mão; manter postura ergonômica (flexionar joelhos e manter coluna alinhada); desobstruir o trajeto de transporte e utilizar luvas de proteção e calçado de segurança com biqueira.',
            norma: 'NR-01 / NR-17 / NR-18',
            pergunta: 'O trajeto de transporte está nivelado/desobstruído e há carrinho de mão ou auxílio para peças pesadas?',
            palavrasDiretriz: ['carga', 'material', 'materiais', 'transporte', 'carrinho', 'peso', 'ergonom', 'postura', 'levantamento']
        },
        {
            regex: /cimento|argamassa|concreto|\bcal\b|alcalin|quimic|silica|poeira mineral|massa/,
            fase: 'EXECUCAO_FERRAMENTAS',
            passo_tarefa: 'Preparo, dosagem, mistura e aplicação de cimento, argamassa ou concreto nas estruturas',
            evento_risco: 'Contato dérmico direto com pasta/massa alcalina, projeção de respingos nos olhos ou inalação de poeira mineral de cimento',
            danos_provaveis: 'Dermatite de contato, queimadura química alcalina, irritação ocular e das vias respiratórias',
            medida_base: 'Utilizar luvas impermeáveis (látex/nitrílica), óculos de proteção vedados, respirador semifacial PFF2 no manuseio de cimento em pó e calçado impermeável; evitar contato direto da pele com a massa úmida e manter água limpa para lavagem imediata.',
            norma: 'NR-01 / NR-06 / NR-18',
            pergunta: 'A equipe dispõe de máscara PFF2, luvas impermeáveis e óculos de proteção para o manuseio de cimento/argamassa?',
            palavrasDiretriz: ['cimento', 'pff2', 'mascara', 'respirador', 'luva', 'impermeav', 'argamassa', 'concreto', 'poeira', 'quimic', 'hidratacao']
        },
        {
            regex: /queda|desnivel|altura|andaime|escada|borda|vala|canaleta|bueiro|caixa coletora|tropeco|escorregao/,
            fase: 'AMBIENTE_INTERFERENCIAS',
            passo_tarefa: 'Acesso, circulação e execução de serviços junto a bordas de valas, canaletas, bueiros, taludes ou em diferença de nível',
            evento_risco: 'Desequilíbrio, escorregão em piso irregular/inclinado ou queda para o interior de valas, caixas ou nível inferior',
            danos_provaveis: 'Entorses, luxações, escoriações, contusões ou fraturas por queda',
            medida_base: 'Manter isolamento e sinalização física ativa no entorno das valas, caixas e bordas de desnível; inspecionar previamente a estabilidade do terreno e manter vias de acesso desobstruídas; quando aplicável acima de 2,0 m, adotar proteção contra quedas (NR-35).',
            norma: 'NR-01 / NR-18 / NR-35',
            pergunta: 'As bordas de valas, bueiros ou desníveis estão sinalizadas/isoladas e os acessos estão firmes e desobstruídos?',
            palavrasDiretriz: ['isolamento', 'sinalizacao', 'vala', 'valas', 'acesso', 'talude', 'taludes', 'queda', 'altura', 'cinto', 'escada', 'andaime', 'borda']
        },
        {
            regex: /choque|eletric|betoneira|energiz|cabo|extensao|qgbt|arco|curto|aterramento/,
            fase: 'EXECUCAO_FERRAMENTAS',
            passo_tarefa: 'Operação de betoneira, equipamentos elétricos portáteis e manuseio de extensões e quadros de alimentação',
            evento_risco: 'Contato acidental com condutores danificados, falha de isolamento/aterramento em área úmida ou aprisionamento em partes móveis',
            danos_provaveis: 'Choque elétrico, queimaduras ou lesões traumáticas por partes móveis',
            medida_base: 'Garantir o aterramento elétrico efetivo, dispositivo DR e proteção física das partes móveis da betoneira; inspecionar previamente cabos, tomadas e plugues industriais, proibindo emendas improvisadas ou cabos expostos à umidade e ao tráfego.',
            norma: 'NR-10 / NR-12 / NR-18',
            pergunta: 'A betoneira e os equipamentos elétricos possuem aterramento validado, coifa nas partes móveis e cabos íntegros sem emendas?',
            palavrasDiretriz: ['aterramento', 'betoneira', 'eletric', 'choque', 'partes moveis', 'cabo', 'extensao', 'energia', 'bloqueio', 'loto']
        },
        {
            regex: /chibanca|foice|estrovenga|enxada|rastelo|facao|marreta|talhadeira|ponteiro|ferramenta|corte|raio de acao|rebote/,
            fase: 'EXECUCAO_FERRAMENTAS',
            passo_tarefa: 'Roço, capina, limpeza e escavação manual com uso de ferramentas de corte e impacto',
            evento_risco: 'Interferência física no raio de ação entre trabalhadores, desvio ou rebote da ferramenta ao atingir rocha oculta',
            danos_provaveis: 'Ferimentos cortantes, lacerações, contusões ou projeção de fragmentos nos olhos',
            medida_base: 'Inspecionar fixação de cabos e lâminas antes do início; manter distanciamento seguro fora do raio de ação da ferramenta; realizar varredura visual prévia do local de golpe e utilizar óculos de proteção, luvas, botina e perneira de segurança.',
            norma: 'NR-01 / NR-06 / NR-18',
            pergunta: 'Qual o distanciamento operacional definido entre os colaboradores durante o manuseio de ferramentas de corte/impacto?',
            palavrasDiretriz: ['ferramenta', 'corte', 'chibanca', 'foice', 'estrovenga', 'enxada', 'distancia', 'raio', 'perneira']
        },
        {
            regex: /peconhent|serpente|cobra|escorpiao|aranha|abelha|vespa|marimbondo|inseto|fauna|fresta/,
            fase: 'AMBIENTE_INTERFERENCIAS',
            passo_tarefa: 'Inspeção visual prévia, remoção de vegetação/entulho e limpeza de frestas, bueiros, canaletas e taludes',
            evento_risco: 'Picada, mordedura ou ferroada de animais peçonhentos abrigados sob pedras, frestas, caixas ou vegetação',
            danos_provaveis: 'Envenenamento, reação alérgica/anafilática, edema local e complicações sistêmicas',
            medida_base: 'Inspecionar visualmente com auxílio de ferramenta longa antes de posicionar mãos ou pés em frestas, blocos de rocha ou vegetação; utilizar obrigatoriamente perneira de segurança, botina e luvas de proteção; manter comunicação e fluxo do PAE ativos.',
            norma: 'NR-01 / NR-06 / NR-18',
            pergunta: 'A equipe está utilizando perneira de segurança e conhece o fluxo de acionamento imediato do PAE para acidentes ofídicos/escorpiônicos?',
            palavrasDiretriz: ['peconhent', 'perneira', 'inspecionar', 'terreno', 'cobra', 'escorpiao', 'fresta', 'pae', 'resgate']
        },
        {
            regex: /pedra|rocha|enrocado|enrocamento|rolamento|desmoronamento|soterramento|talude|instabilidade/,
            fase: 'AMBIENTE_INTERFERENCIAS',
            passo_tarefa: 'Posicionamento, circulação e intervenção em taludes enrocados, encostas ou bordas de escavação',
            evento_risco: 'Desprendimento, rolamento de blocos de rocha soltos ou escorregamento de talude sobre colaboradores',
            danos_provaveis: 'Prensamento de membros inferiores, contusões, fraturas ou soterramento',
            medida_base: 'Inspecionar previamente o terreno quanto à estabilidade de taludes e blocos de rocha; proibir trabalho simultâneo na mesma linha vertical (um colaborador acima de outro) em talude inclinado e estabilizar/afastar pedras soltas.',
            norma: 'NR-01 / NR-18',
            pergunta: 'O talude/enrocamento foi inspecionado antes do acesso e o posicionamento escalonado (sem sobreposição vertical) está garantido?',
            palavrasDiretriz: ['talude', 'taludes', 'pedra', 'rocha', 'estabilidade', 'enrocado', 'vala', 'soterramento']
        },
        {
            regex: /atropelamento|veiculo|caminhao|onibus|maquina|transito|trafego|embarque|desembarque|berma|colisao/,
            fase: 'DESLOCAMENTO_ACESSO',
            passo_tarefa: 'Deslocamento da equipe, embarque/desembarque e execução de serviços próximo a vias de circulação de veículos e máquinas',
            evento_risco: 'Atropelamento, invasão da frente de serviço por veículos/máquinas ou queda no embarque/desembarque',
            danos_provaveis: 'Traumatismos múltiplos, fraturas graves ou atropelamento',
            medida_base: 'Manter isolamento e sinalização ativa com cones/fitas nas vias de acesso e entorno da frente; realizar embarque e desembarque apenas com o veículo totalmente parado em local seguro e respeitar o raio de manobra de máquinas.',
            norma: 'NR-01 / NR-18',
            pergunta: 'A frente de serviço próxima à via/berma está sinalizada com cones e há área segura para estacionamento e desembarque?',
            palavrasDiretriz: ['acesso', 'vias', 'isolamento', 'sinalizacao', 'veiculo', 'caminhao', 'onibus', 'transito', 'maquina']
        },
        {
            regex: /tenda|vivencia|banheiro|lavatorio|vento|ancoragem|estaiamento/,
            fase: 'VIVENCIA_APOIO',
            passo_tarefa: 'Montagem, posicionamento, nivelamento e fixação da estrutura de vivência (tenda, banheiro químico e lavatório)',
            evento_risco: 'Tombamento ou deslocamento da tenda/banheiro químico sob ação de ventos fortes ou terreno irregular',
            danos_provaveis: 'Contusões, cortes ou atingimento de colaboradores por hastes e partes da estrutura',
            medida_base: 'Posicionar tenda e banheiro químico em local plano e firme, fora de bordas de talude; ancorar e estaiar todos os pontos de fixação da tenda e suspender a permanência sob ventos intensos ou descargas atmosféricas.',
            norma: 'NR-01 / NR-18',
            pergunta: 'A tenda de vivência e o banheiro químico estão nivelados e devidamente estaiados/ancorados contra ação do vento?',
            palavrasDiretriz: ['tenda', 'vivencia', 'banheiro', 'vento', 'ancoragem', 'fixacao']
        },
        {
            regex: /solar|radiacao|calor|\bsol\b|termic|desidratacao|insolacao|ceu aberto/,
            fase: 'AMBIENTE_INTERFERENCIAS',
            passo_tarefa: 'Permanência e execução continuada de atividades operacionais a céu aberto nas frentes de serviço',
            evento_risco: 'Exposição prolongada à radiação solar ultravioleta e sobrecarga térmica em campo',
            danos_provaveis: 'Desidratação, insolação, exaustão térmica, cefaleia e queimaduras solares',
            medida_base: 'Disponibilizar água potável fresca, abrigo sombreado na frente de serviço e pausas regulares para hidratação; utilizar protetor solar e vestimenta com proteção UV/touca árabe.',
            norma: 'NR-01 / NR-18 / NR-21',
            pergunta: 'Há suprimento de água potável fresca, tenda sombreada, protetor solar e pausas de hidratação definidas na frente?',
            palavrasDiretriz: ['hidratacao', 'pausa', 'pausas', 'agua', 'solar', 'sol', 'calor', 'protetor solar']
        },
        {
            regex: /ruido|vibracao|barulho|compactador|martelete|motosserra|rocadeira|serra/,
            fase: 'EXECUCAO_FERRAMENTAS',
            passo_tarefa: 'Operação de máquinas e equipamentos portáteis geradores de ruído e vibração',
            evento_risco: 'Exposição ocupacional a níveis elevados de pressão sonora, vibração localizada e projeção de fragmentos',
            danos_provaveis: 'Perda auditiva induzida por ruído, desconforto osteomuscular e lesões oculares',
            medida_base: 'Utilizar protetor auditivo (plug ou concha), óculos de proteção/protetor facial e luvas adequadas; inspecionar proteções do equipamento e promover revezamento operacional.',
            norma: 'NR-01 / NR-06 / NR-12 / NR-15',
            pergunta: 'Os operadores e auxiliares próximos utilizam protetor auditivo e proteção ocular compatíveis com o equipamento?',
            palavrasDiretriz: ['ruido', 'protetor auditivo', 'vibracao', 'compactador', 'martelete', 'serra']
        },
        {
            regex: /confinado|asfixia|oxigenio|\bgas\b|gases|galeria|poco|adutora/,
            fase: 'AMBIENTE_INTERFERENCIAS',
            passo_tarefa: 'Acesso e intervenção no interior de galerias, bueiros profinados, poços de visita ou tubulações',
            evento_risco: 'Atmosfera deficiente de oxigênio, presença de gases tóxicos/inflamáveis ou dificuldade de resgate',
            danos_provaveis: 'Asfixia, intoxicação aguda, perda de consciência ou trauma no acesso',
            medida_base: 'Avaliar previamente se o local caracteriza espaço confinado (NR-33); havendo enquadramento, exigir PET, monitoramento atmosférico multigás, ventilação forçada e vigia dedicado.',
            norma: 'NR-01 / NR-33',
            pergunta: 'A intervenção exige entrada em espaço confinado (NR-33) com emissão de PET e monitoramento multigás?',
            palavrasDiretriz: ['confinado', 'bueiro', 'caixa', 'ventilacao', 'gas', 'resgate', 'nr-33']
        }
    ];

    function extrairDiretrizesRelevantesParaPerigo(regrasTexto, palavrasDiretriz, perigoTxt) {
        var bruto = String(regrasTexto || '').trim();
        if (!bruto) return [];
        var clausulas = bruto
            .split(/[;\r\n]+/)
            .map(function (c) { return c.trim().replace(/^[•\-*]\s*/, '').replace(/\.+$/, ''); })
            .filter(Boolean);
        if (clausulas.length === 0) return [];

        var termosAlvo = (Array.isArray(palavrasDiretriz) ? palavrasDiretriz.slice() : []).concat(
            normalizar(perigoTxt).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && w !== 'risco' && w !== 'contato'; })
        );

        return clausulas.filter(function (cl) {
            var clNorm = normalizar(cl);
            return termosAlvo.some(function (t) {
                var tn = normalizar(t);
                return tn && clNorm.indexOf(tn) !== -1;
            });
        });
    }

    function construirPropostaTecnicaPorPerigo(perigoTxt, idx, ctx) {
        var pTexto = String(perigoTxt || '').trim();
        var pNorm = normalizar(pTexto);
        var regrasEng = ctx && ctx.regras_engenheiro ? String(ctx.regras_engenheiro).trim() : '';
        var frente = ctx && ctx.frente_servico ? String(ctx.frente_servico).trim() : '';

        var perfil = PERFIS_TECNICOS_POR_PERIGO.find(function (p) {
            return p.regex.test(pNorm);
        });

        if (perfil) {
            var diretrizesRel = extrairDiretrizesRelevantesParaPerigo(regrasEng, perfil.palavrasDiretriz, pTexto);
            var medidaFinal = perfil.medida_base;
            if (diretrizesRel.length > 0) {
                var textoDir = diretrizesRel.map(function (d) {
                    return d.charAt(0).toUpperCase() + d.slice(1);
                }).join('; ');
                if (normalizar(medidaFinal).indexOf(normalizar(diretrizesRel[0]).slice(0, 20)) === -1) {
                    medidaFinal = textoDir + '; ' + medidaFinal.charAt(0).toLowerCase() + medidaFinal.slice(1);
                } else {
                    medidaFinal = textoDir + '.';
                }
            }
            return {
                fase_operacional: perfil.fase,
                passo_tarefa: perfil.passo_tarefa,
                evento_risco: perfil.evento_risco,
                danos_provaveis: perfil.danos_provaveis,
                medidas_prevencao: medidaFinal.slice(0, 600),
                norma_referencia: perfil.norma,
                pergunta_pendente: perfil.pergunta
            };
        }

        var faseInf = inferirFaseRoteiro(pTexto);
        var labelFaseLimpo = obterLabelFase(faseInf).replace(/^\d+\.\s*/, '');
        var descFaseCtx = (ctx && ctx.fases_operacionais && ctx.fases_operacionais[faseInf])
            ? String(ctx.fases_operacionais[faseInf]).trim()
            : '';
        var passoFallback = descFaseCtx
            ? (descFaseCtx.slice(0, 120) + ' (' + pTexto + ')')
            : (labelFaseLimpo + (frente ? ' em ' + frente : '') + ' — Controle para ' + pTexto);

        var dirFallback = extrairDiretrizesRelevantesParaPerigo(regrasEng, [], pTexto);
        var medidaFallback = dirFallback.length > 0
            ? dirFallback.join('; ') + '.'
            : (regrasEng || ('Adotar barreira de controle operacional, isolamento/sinalização aplicável e EPIs específicos para neutralizar "' + pTexto + '".'));

        return {
            fase_operacional: faseInf,
            passo_tarefa: passoFallback.slice(0, 300),
            evento_risco: 'Exposição ocupacional ou falha de controle associada a ' + pTexto.toLowerCase(),
            danos_provaveis: 'Lesões físicas ou agravos ocupacionais decorrentes de ' + pTexto.toLowerCase() + ' (avaliar severidade na APR)',
            medidas_prevencao: medidaFallback.slice(0, 600),
            norma_referencia: 'NR-01 / NR-18',
            pergunta_pendente: 'Qual a barreira específica e o procedimento aplicável na frente para controlar "' + pTexto + '"?'
        };
    }

    function ehPropostaGenericaLegada(obj) {
        if (!obj || typeof obj !== 'object') return false;
        var passo = String(obj.passo_tarefa || '').trim();
        var evento = String(obj.evento_risco || '').trim();
        var danos = String(obj.danos_provaveis || '').trim();
        return /^Atividade de .+ em .+$/i.test(passo) ||
            /^Exposi[cç][aã]o ou falha de barreira associada a:/i.test(evento) ||
            danos === 'A avaliar pela Engenharia na APR';
    }

    // =========================================================================
    // 5. PACOTE EXTERNO PARA LLM (SANITIZAÇÃO INTEGRAL DE TODOS OS CAMPOS)
    // =========================================================================
    function gerarPacotePromptRag(opcoes) {
        garantirEstadoSessao();
        opcoes = Object.assign({}, estadoModulo.opcoesExportacaoPrompt, opcoes || {});
        var ctx = opcoes.contexto || buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0] || null;
        var textoLivre = String(opcoes.textoLivre !== undefined ? opcoes.textoLivre : (estadoModulo.textoLivreAnalise || '')).trim();
        var aprAlvo = opcoes.apr || null;
        if (!aprAlvo && estadoModulo.aprSelecionadaId && Array.isArray(window.allAprRegistros)) {
            aprAlvo = window.allAprRegistros.find(function (a) { return String(a.id) === String(estadoModulo.aprSelecionadaId); }) || null;
        }

        var corpusBusca = [
            ctx ? ctx.cargo_equipe : '',
            ctx ? ctx.frente_servico : '',
            ctx ? ctx.rotina_detalhada : '',
            ctx ? (ctx.ferramentas_reais || []).join(' ') : '',
            ctx ? (ctx.perigos_observados || []).join(' ') : '',
            textoLivre,
            aprAlvo ? (aprAlvo.titulo || '') : ''
        ].join(' ').trim();
        var recuperados = recuperarExemplosERegrasRelevantes(corpusBusca);

        var linhas = [
            '# PEDIDO DE ANÁLISE TÉCNICA SST PARA APOIO À APR',
            'Aviso de Privacidade e Governança: Filtro automático de CPF/CNPJ/e-mail/telefone aplicado. Revise este texto antes de enviar à IA externa para garantir ausência de nomes de pessoas ou dados sensíveis. NÃO atribua notas de Probabilidade (P) ou Severidade (S) — a pontuação será feita manualmente pela Engenharia de Segurança na APR.',
            ''
        ];

        if (ctx) {
            linhas.push('## 1. CENÁRIO EM ANÁLISE (v' + (ctx.versao || 1) + ' — Status: ' + (ctx.status_cenario || 'RASCUNHO') + ')');
            linhas.push('- Cargo / Equipe (genérico): ' + sanitizarDadosPessoaisParaExportacao(ctx.cargo_equipe));
            linhas.push('- Frente / Ambiente: ' + sanitizarDadosPessoaisParaExportacao(ctx.frente_servico));
            linhas.push('- Fonte / Procedimento: ' + sanitizarDadosPessoaisParaExportacao(ctx.fonte_procedimento || 'Pendente'));
            if (opcoes.incluirRotinaFases) {
                linhas.push('- Rotina: ' + sanitizarDadosPessoaisParaExportacao(ctx.rotina_detalhada));
                FASES_ROTEIRO_PERGUNTAS.forEach(function (f) {
                    var resp = (ctx.fases_operacionais && ctx.fases_operacionais[f.id]) || '(Não informado — tratar como pergunta pendente)';
                    linhas.push('  * ' + f.label + ': ' + sanitizarDadosPessoaisParaExportacao(resp));
                });
            }
            if (opcoes.incluirFerramentasPerigos) {
                linhas.push('- Ferramentas: ' + sanitizarDadosPessoaisParaExportacao((ctx.ferramentas_reais || []).join(', ')));
                linhas.push('- Perigos Observados: ' + sanitizarDadosPessoaisParaExportacao((ctx.perigos_observados || []).join(' | ')));
            }
            linhas.push('');
        } else {
            linhas.push('## 1. CENÁRIO EM ANÁLISE: Nenhum cenário cadastrado selecionado na Aba 1.');
            linhas.push('');
        }

        if (textoLivre) {
            linhas.push('## DESCRIÇÃO DA ATIVIDADE / CONDIÇÃO INFORMADA PELO ENGENHEIRO');
            linhas.push(sanitizarDadosPessoaisParaExportacao(textoLivre));
            linhas.push('');
        }

        if (opcoes.incluirExemplosRecuperados && recuperados.exemplosRecuperados.length > 0) {
            linhas.push('## 2. EXEMPLOS RECUPERADOS POR RELEVÂNCIA (' + recuperados.exemplosRecuperados.length + ')');
            recuperados.exemplosRecuperados.slice(0, 5).forEach(function (ex) {
                linhas.push('- [' + sanitizarDadosPessoaisParaExportacao(ex.codigo_cenario) + ' v' + ex.versao + ' | Motivo: ' + sanitizarDadosPessoaisParaExportacao(ex.motivosRecuperacao.join(', ')) + '] ' + sanitizarDadosPessoaisParaExportacao(ex.cargo_equipe) + ' (' + sanitizarDadosPessoaisParaExportacao(ex.frente_servico) + ')');
            });
            linhas.push('');
        }

        if (opcoes.incluirAprRiscos && aprAlvo) {
            linhas.push('## 3. RISCOS ATUAIS DA APR Nº ' + sanitizarDadosPessoaisParaExportacao(aprAlvo.id) + ' — ' + sanitizarDadosPessoaisParaExportacao(aprAlvo.titulo || 'Sem título') + (aprAlvo.data_emissao ? ' (Emissão: ' + sanitizarDadosPessoaisParaExportacao(aprAlvo.data_emissao) + ')' : ''));
            (aprAlvo.riscos || []).forEach(function (r, idx) {
                linhas.push('  ' + (idx + 1) + '. Etapa: ' + sanitizarDadosPessoaisParaExportacao(r.passo_tarefa) + ' | Perigo: ' + sanitizarDadosPessoaisParaExportacao(r.perigo_fonte) + ' | Medida: ' + sanitizarDadosPessoaisParaExportacao(r.medidas_prevencao));
            });
            linhas.push('');
        }

        if (opcoes.incluirRegrasAprovadas) {
            var regrasOrdenadas = recuperados.regrasRecuperadas.length > 0
                ? recuperados.regrasRecuperadas.map(function (x) { return x.regra; })
                : estadoModulo.regrasAprendidas.filter(function (r) { return r.ativo === true && r.status_regra === 'APROVADO'; });

            linhas.push('## 4. REGRAS VALIDADAS PELA ENGENHARIA SST (' + regrasOrdenadas.length + ' aplicável(is)/ativa(s))');
            regrasOrdenadas.slice(0, 10).forEach(function (r) {
                var gatilhosSanitizados = (r.gatilhos || []).map(sanitizarDadosPessoaisParaExportacao).join(', ');
                linhas.push('- [Regra v' + (r.versao || 1) + ' | Gatilhos: ' + gatilhosSanitizados + '] Etapa: ' + sanitizarDadosPessoaisParaExportacao(r.passo_tarefa) + ' | Controle: ' + sanitizarDadosPessoaisParaExportacao(r.medidas_prevencao));
            });
            linhas.push('');
        }

        linhas.push('## 5. FORMATO DE RESPOSTA PARA IMPORTAÇÃO NO PAINEL (SEM NOTAS P×S)');
        linhas.push('Responda com uma lista JSON válida (máximo ' + LIMITE_MAX_ITENS_IMPORTACAO + ' itens, sem links/URLs, sem HTML e sem campos p_puro/s_puro/p_residual/s_residual) no formato:');
        linhas.push('[{"fase_operacional":"EXECUCAO_FERRAMENTAS","passo_tarefa":"...","perigo_fonte":"...","evento_risco":"...","danos_provaveis":"...","medidas_prevencao":"...","evidencia_campo":"...","fonte_consultada":"...","hipotese_risco":"...","pergunta_pendente":"...","epis_sugeridos":["..."],"gatilhos":["..."]}]');

        // Verificação final sobre todo o texto gerado para garantir que nenhum CPF/CNPJ/e-mail/telefone passe
        return sanitizarDadosPessoaisParaExportacao(linhas.join('\n'));
    }

    // =========================================================================
    // 6. IMPORTAÇÃO VALIDADA (EXTRAÇÃO SEGURA + PRÉVIA + DESCARTE DE P×S)
    // =========================================================================
    function extrairArrayJsonDeTexto(limpo) {
        var matchBloco = limpo.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (matchBloco && matchBloco[1]) {
            try {
                return JSON.parse(matchBloco[1].trim());
            } catch (eBloco) { /* tenta scanner balanceado abaixo */ }
        }
        try {
            return JSON.parse(limpo);
        } catch (eDireto) { /* tenta localizar array JSON cercado por texto livre */ }

        var inicio = -1;
        while ((inicio = limpo.indexOf('[', inicio + 1)) !== -1) {
            var depth = 0;
            var emString = false;
            var escapado = false;
            for (var i = inicio; i < limpo.length; i++) {
                var ch = limpo.charAt(i);
                if (escapado) {
                    escapado = false;
                    continue;
                }
                if (ch === '\\' && emString) {
                    escapado = true;
                    continue;
                }
                if (ch === '"') {
                    emString = !emString;
                    continue;
                }
                if (!emString) {
                    if (ch === '[') depth++;
                    else if (ch === ']') {
                        depth--;
                        if (depth === 0) {
                            var candidato = limpo.slice(inicio, i + 1);
                            try {
                                var objCand = JSON.parse(candidato);
                                if (Array.isArray(objCand)) return objCand;
                            } catch (eCand) { /* segue buscando */ }
                            break;
                        }
                    }
                }
            }
        }
        throw new Error('Não foi possível reconhecer uma lista válida de riscos na resposta colada. Peça à IA para responder no formato solicitado no Passo 1.');
    }

    function analisarRespostaIaParaPrevia(textoBruto, contextoId) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: perfil somente leitura não pode importar itens para a fila.');
        }

        var limpo = String(textoBruto || '').trim();
        if (!limpo) throw new Error('Cole a resposta da IA antes de continuar.');
        if (medirBytesUtf8(limpo) > LIMITE_BYTES_FICHA_IMPORTACAO) {
            throw new Error('Resposta excede o teto de ' + (LIMITE_BYTES_FICHA_IMPORTACAO / 1024) + ' KB (' + LIMITE_BYTES_FICHA_IMPORTACAO + ' bytes UTF-8).');
        }

        var erroSeg = contemConteudoProibidoImportacao(limpo);
        if (erroSeg) throw new Error(erroSeg);

        var parsed = extrairArrayJsonDeTexto(limpo);

        if (!Array.isArray(parsed)) {
            throw new Error('A resposta importada precisa conter uma lista de riscos.');
        }
        if (parsed.length === 0 || parsed.length > LIMITE_MAX_ITENS_IMPORTACAO) {
            throw new Error('Quantidade de itens inválida (mínimo 1, máximo ' + LIMITE_MAX_ITENS_IMPORTACAO + ' por importação).');
        }

        var notasIgnoradas = 0;
        var itensNormalizados = [];
        var ctxDestinoId = contextoId !== undefined ? contextoId : (estadoModulo.contextoSelecionadoId || null);

        parsed.forEach(function (item, idx) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error('Item #' + (idx + 1) + ' inválido na resposta.');
            }
            var chaves = Object.keys(item);
            chaves.forEach(function (k) {
                if (CAMPOS_NOTA_IGNORADOS_JSON.has(k)) {
                    if (item[k] !== '' && item[k] !== null && item[k] !== undefined) {
                        notasIgnoradas++;
                    }
                    return;
                }
                if (!CAMPOS_PERMITIDOS_SUGESTAO_JSON.has(k)) {
                    throw new Error('Campo não permitido no contrato JSON: "' + k + '".');
                }
            });

            var passo = String(item.passo_tarefa || '').trim();
            var perigo = String(item.perigo_fonte || '').trim();
            if (!passo || !perigo) {
                throw new Error('Item #' + (idx + 1) + ' sem passo_tarefa ou perigo_fonte.');
            }

            var fase = FASES_ROTEIRO_PERGUNTAS.some(function (f) { return f.id === item.fase_operacional; })
                ? item.fase_operacional
                : inferirFaseRoteiro(passo + ' ' + perigo);

            var gatilhosLimpos = Array.isArray(item.gatilhos)
                ? item.gatilhos.slice(0, 8).map(function (x) { return sanitizarDadosPessoaisParaExportacao(String(x)).slice(0, 40); })
                : extrairGatilhosTexto(passo + ' ' + perigo);

            itensNormalizados.push({
                contexto_id: ctxDestinoId,
                fase_operacional: fase,
                passo_tarefa: passo.slice(0, 300),
                perigo_fonte: perigo.slice(0, 300),
                evento_risco: String(item.evento_risco || perigo).trim().slice(0, 300),
                danos_provaveis: String(item.danos_provaveis || 'A definir pela Engenharia').trim().slice(0, 300),
                medidas_prevencao: String(item.medidas_prevencao || 'Definir controle específico com base no procedimento aplicável.').trim().slice(0, 600),
                responsavel: String(item.responsavel || 'Definir na APR').trim().slice(0, 120),
                epis_sugeridos: Array.isArray(item.epis_sugeridos) ? item.epis_sugeridos.slice(0, 12).map(function (x) { return String(x).slice(0, 80); }) : [],
                norma_referencia: String(item.norma_referencia || 'NR-01 / NR-18').trim().slice(0, 80),
                gatilhos: gatilhosLimpos,
                evidencia_campo: String(item.evidencia_campo || 'Rascunho importado de análise externa').trim().slice(0, 300),
                fonte_consultada: String(item.fonte_consultada || 'Pendente de confirmação documental').trim().slice(0, 200),
                hipotese_risco: String(item.hipotese_risco || perigo).trim().slice(0, 300),
                pergunta_pendente: String(item.pergunta_pendente || 'Confirmar em campo e atribuir P×S manualmente na APR.').trim().slice(0, 300)
            });
        });

        return {
            itens: itensNormalizados,
            notasIgnoradas: notasIgnoradas,
            contextoId: ctxDestinoId,
            identidadeChave: estadoModulo.identidadeChave,
            geracaoSessaoId: estadoModulo.geracaoSessaoId
        };
    }

    function gravarItensPreviaNaFila(previa) {
        garantirEstadoSessao();
        var papelAtual = obterPapelUsuarioIa();
        if (papelAtual !== 'editor' && papelAtual !== 'validador') {
            throw new Error('Permissão negada: seu perfil atual não possui autorização para importar itens para a fila.');
        }
        if (!previa || !Array.isArray(previa.itens) || previa.itens.length === 0) {
            throw new Error('Nenhum item validado para importar.');
        }
        if (previa.identidadeChave && previa.identidadeChave !== estadoModulo.identidadeChave) {
            throw new Error('A sessão/conta ativa mudou desde a geração da prévia. Gere uma nova prévia antes de confirmar.');
        }
        return executarMutacaoPersistida(function () {
            var papelNoCommit = obterPapelUsuarioIa();
            if (papelNoCommit !== 'editor' && papelNoCommit !== 'validador') {
                throw new Error('Permissão negada: concessão de gravação revogada antes da confirmação.');
            }
            if (previa.contextoId && !buscarContextoPorId(previa.contextoId)) {
                throw new Error('O cenário vinculado à prévia não existe mais nesta sessão. Selecione um cenário válido e gere a prévia novamente.');
            }
            if (estadoModulo.sugestoesFila.length + previa.itens.length > LIMITE_MAX_SUGESTOES) {
                throw new Error('Limite local de ' + LIMITE_MAX_SUGESTOES + ' sugestões na fila seria excedido (' + (estadoModulo.sugestoesFila.length + previa.itens.length) + '). Limpe itens antigos antes de importar.');
            }
            var s = obterSessaoSegura() || {};
            var importados = 0;
            previa.itens.forEach(function (item, idx) {
                if (!item || !String(item.passo_tarefa || '').trim() || !String(item.perigo_fonte || '').trim()) {
                    throw new Error('Item #' + (idx + 1) + ' da prévia está incompleto (passo_tarefa ou perigo_fonte ausente).');
                }
                estadoModulo.sugestoesFila.unshift({
                    id: gerarIdUnico('sug_imp_' + idx),
                    versao: 1,
                    origem_regra_id: null,
                    regra_gerada_id: null,
                    contexto_id: item.contexto_id,
                    modulo_destino: 'APR',
                    fase_operacional: item.fase_operacional,
                    titulo_insight: 'Rascunho Importado: ' + item.passo_tarefa.slice(0, 80),
                    descricao_analise: 'Rascunho externo não validado — requer revisão da Engenharia e avaliação manual de P×S.',
                    acao_proposta: {
                        passo_tarefa: item.passo_tarefa,
                        perigo_fonte: item.perigo_fonte,
                        evento_risco: item.evento_risco,
                        danos_provaveis: item.danos_provaveis,
                        p_puro: '',
                        s_puro: '',
                        medidas_prevencao: item.medidas_prevencao,
                        p_residual: '',
                        s_residual: '',
                        responsavel: item.responsavel,
                        epis_sugeridos: Array.isArray(item.epis_sugeridos) ? item.epis_sugeridos.slice() : [],
                        norma_referencia: item.norma_referencia,
                        gatilhos: Array.isArray(item.gatilhos) ? item.gatilhos.slice() : [],
                        evidencia_campo: item.evidencia_campo,
                        fonte_consultada: item.fonte_consultada,
                        hipotese_risco: item.hipotese_risco,
                        pergunta_pendente: item.pergunta_pendente
                    },
                    status: 'RASCUNHO',
                    feedback_engenheiro: '',
                    criado_por_matricula: String(s.matricula || ''),
                    aprovado_por_matricula: '',
                    created_at: new Date().toISOString()
                });
                importados++;
            });

            registrarEventoAuditoria('IMPORTAR_RESPOSTA_JSON', previa.contextoId || 'fila', importados + ' rascunho(s)' + (previa.notasIgnoradas ? ' (' + previa.notasIgnoradas + ' nota(s) P/S ignorada(s))' : ''));
            return importados;
        });
    }

    // Contrato programático direto (compatibilidade e testes): valida esquema, segurança e revalida permissão no ponto de escrita.
    // Na interface do usuário, o fluxo exige pré-visualização explícita antes da confirmação (preVisualizarRespostaIaUI -> confirmarImportacaoPreviaIaUI).
    function importarRespostaIaParaFila(textoBruto, contextoId) {
        var previa = analisarRespostaIaParaPrevia(textoBruto, contextoId);
        return gravarItensPreviaNaFila(previa);
    }

    // =========================================================================
    // 6B. BACKUP E RESTAURAÇÃO DO CADERNO LOCAL (INTEGRAL, COM PRÉVIA E CONFLITOS)
    // =========================================================================
    function normalizarListaStringsBackup(arr, nomeCampo, rotuloItem) {
        if (arr === undefined || arr === null) return [];
        if (!Array.isArray(arr)) {
            throw new Error('Backup inválido: ' + rotuloItem + ' possui campo "' + nomeCampo + '" que não é uma lista.');
        }
        return arr.map(function (v) { return String(v == null ? '' : v); });
    }

    function normalizarFasesObjetoBackup(fases, rotuloItem) {
        if (fases === undefined || fases === null) return {};
        if (typeof fases !== 'object' || Array.isArray(fases)) {
            throw new Error('Backup inválido: ' + rotuloItem + ' possui campo "fases_operacionais" inválido.');
        }
        var out = {};
        Object.keys(fases).forEach(function (k) {
            if (fases[k] !== undefined && fases[k] !== null) {
                out[k] = String(fases[k]);
            }
        });
        return out;
    }

    function assinaturaFasesCanonica(fasesObj) {
        var obj = (fasesObj && typeof fasesObj === 'object' && !Array.isArray(fasesObj)) ? fasesObj : {};
        var chaves = Object.keys(obj).sort();
        return chaves.map(function (k) { return k + '=' + String(obj[k] || '').trim(); }).join('|');
    }

    function compararConteudoContexto(existente, candidato) {
        var camposDiferentes = [];
        var checarTexto = function (campo, a, b) {
            if (String(a || '').trim() !== String(b || '').trim()) camposDiferentes.push(campo);
        };
        var checarLista = function (campo, a, b) {
            var la = Array.isArray(a) ? a.map(String) : [];
            var lb = Array.isArray(b) ? b.map(String) : [];
            if (la.length !== lb.length || la.some(function (v, idx) { return v !== lb[idx]; })) {
                camposDiferentes.push(campo);
            }
        };
        checarTexto('cargo_equipe', existente.cargo_equipe, candidato.cargo_equipe);
        checarTexto('ghe_codigo', existente.ghe_codigo, candidato.ghe_codigo);
        checarTexto('frente_servico', existente.frente_servico, candidato.frente_servico);
        checarTexto('fonte_procedimento', existente.fonte_procedimento, candidato.fonte_procedimento);
        checarTexto('rotina_detalhada', existente.rotina_detalhada, candidato.rotina_detalhada);
        checarTexto('regras_engenheiro', existente.regras_engenheiro, candidato.regras_engenheiro);
        if (assinaturaFasesCanonica(existente.fases_operacionais) !== assinaturaFasesCanonica(candidato.fases_operacionais)) {
            camposDiferentes.push('fases_operacionais');
        }
        checarLista('ferramentas_reais', existente.ferramentas_reais, candidato.ferramentas_reais);
        checarLista('perigos_observados', existente.perigos_observados, candidato.perigos_observados);
        checarLista('epis_validados', existente.epis_validados, candidato.epis_validados);
        return {
            igual: camposDiferentes.length === 0,
            camposDiferentes: camposDiferentes
        };
    }

    // Prepara o snapshot compacto e sincronizado do caderno local SEM alterar ultimoBackupEm/alteracoesAposBackup.
    // A marcação de backup concluído só ocorre via registrarBackupExportadoLocal após o download ser efetivamente iniciado.
    function gerarBackupCadernoLocal() {
        sincronizarDoStorageParaConcorrencia();
        var papel = obterPapelUsuarioIa();
        if (papel === 'sem_acesso' || papel === 'sem_sessao') {
            throw new Error('Sessão sem permissão para exportar o caderno local.');
        }
        var agoraIso = new Date().toISOString();
        var payload = {
            formato: FORMATO_BACKUP_LOCAL,
            gerado_em: agoraIso,
            contextos: estadoModulo.contextos,
            regrasAprendidas: estadoModulo.regrasAprendidas,
            sugestoesFila: estadoModulo.sugestoesFila
        };
        // Serialização compacta para garantir round-trip fiel dentro do teto de armazenamento local (200 KB UTF-8)
        var json = JSON.stringify(payload);
        return {
            nomeArquivo: 'backup_inteligencia_sst_' + agoraIso.slice(0, 10) + '.json',
            geradoEm: agoraIso,
            json: json,
            bytesUtf8: medirBytesUtf8(json),
            totalContextos: estadoModulo.contextos.length,
            totalRegras: estadoModulo.regrasAprendidas.length,
            totalFila: estadoModulo.sugestoesFila.length
        };
    }

    function registrarBackupExportadoLocal(geradoEmIso, resumoTexto) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') return false;
        executarMutacaoPersistida(function () {
            estadoModulo.ultimoBackupEm = String(geradoEmIso || new Date().toISOString());
            estadoModulo.alteracoesAposBackup = false;
            registrarEventoAuditoria('EXPORTAR_BACKUP_LOCAL', 'caderno', resumoTexto || (estadoModulo.contextos.length + ' cenário(s), ' + estadoModulo.regrasAprendidas.length + ' regra(s)'));
        }, { preservarFlagBackup: true });
        return true;
    }

    function analisarBackupCadernoLocal(textoBruto) {
        sincronizarDoStorageParaConcorrencia();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: apenas editores ou validadores podem restaurar backup.');
        }

        var limpo = String(textoBruto || '').trim();
        if (!limpo) throw new Error('Selecione ou cole um arquivo de backup (.json) antes de pré-visualizar.');
        if (medirBytesUtf8(limpo) > LIMITE_BYTES_BACKUP_ARQUIVO) {
            throw new Error('Arquivo de backup excede o limite máximo permitido para leitura (' + Math.round(LIMITE_BYTES_BACKUP_ARQUIVO / 1024) + ' KB UTF-8).');
        }
        var erroSeg = contemConteudoProibidoImportacao(limpo);
        if (erroSeg) throw new Error(erroSeg);

        var obj = null;
        try {
            obj = JSON.parse(limpo);
        } catch (e) {
            throw new Error('Arquivo de backup inválido (JSON malformado).');
        }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error('Estrutura de backup inválida.');
        }
        if (obj.formato !== FORMATO_BACKUP_LOCAL) {
            throw new Error('Formato ou versão de backup não reconhecido ("' + String(obj.formato || 'ausente') + '"). Esperado: "' + FORMATO_BACKUP_LOCAL + '".');
        }
        if (obj.contextos !== undefined && !Array.isArray(obj.contextos)) {
            throw new Error('Backup inválido: campo "contextos" deve ser uma lista.');
        }
        if (obj.regrasAprendidas !== undefined && !Array.isArray(obj.regrasAprendidas)) {
            throw new Error('Backup inválido: campo "regrasAprendidas" deve ser uma lista.');
        }
        if (obj.sugestoesFila !== undefined && !Array.isArray(obj.sugestoesFila)) {
            throw new Error('Backup inválido: campo "sugestoesFila" deve ser uma lista.');
        }

        var contextosBrutos = Array.isArray(obj.contextos) ? obj.contextos : [];
        var regrasBrutas = Array.isArray(obj.regrasAprendidas) ? obj.regrasAprendidas : [];
        var filaBruta = Array.isArray(obj.sugestoesFila) ? obj.sugestoesFila : [];

        // Validação integral de cada registro ANTES de autorizar prévia ou qualquer mutação (sem truncamento silencioso)
        var contextosValidos = [];
        var idsContextoNoArquivo = new Set();
        contextosBrutos.forEach(function (c, idx) {
            var rotulo = 'cenário #' + (idx + 1);
            if (!c || typeof c !== 'object' || Array.isArray(c)) {
                throw new Error('Backup inválido: ' + rotulo + ' não é um objeto válido.');
            }
            var cargo = String(c.cargo_equipe || '').trim();
            if (!cargo) {
                throw new Error('Backup inválido: ' + rotulo + ' está sem Cargo / Equipe (cargo_equipe).');
            }
            var idOriginal = c.id ? String(c.id).trim() : '';
            if (idOriginal) idsContextoNoArquivo.add(idOriginal);
            contextosValidos.push({
                idOriginal: idOriginal,
                codigo_cenario: String(c.codigo_cenario || '').trim(),
                cargo_equipe: cargo,
                ghe_codigo: String(c.ghe_codigo || '').trim(),
                frente_servico: String(c.frente_servico || 'Geral').trim() || 'Geral',
                fonte_procedimento: String(c.fonte_procedimento || '').trim(),
                rotina_detalhada: String(c.rotina_detalhada || '').trim(),
                fases_operacionais: normalizarFasesObjetoBackup(c.fases_operacionais, rotulo),
                ferramentas_reais: normalizarListaStringsBackup(c.ferramentas_reais, 'ferramentas_reais', rotulo),
                perigos_observados: normalizarListaStringsBackup(c.perigos_observados, 'perigos_observados', rotulo),
                epis_validados: normalizarListaStringsBackup(c.epis_validados, 'epis_validados', rotulo),
                regras_engenheiro: String(c.regras_engenheiro || '').trim(),
                ativo: c.ativo !== false
            });
        });

        var itensRevalidacaoValidos = [];
        var ignoradosPorStatus = 0;
        var itensDuplicadosNoArquivo = 0;
        var totalRegrasAtivasNoArquivo = 0;
        var totalFilaAtivaNoArquivo = 0;

        function assinaturaTecnicaCompletaItemBackup(it, ctxChave) {
            return JSON.stringify([
                String(ctxChave || 'sem_ctx'),
                String(it.fase_operacional || '').trim(),
                String(it.passo_tarefa || '').trim(),
                String(it.perigo_fonte || '').trim(),
                String(it.evento_risco || '').trim(),
                String(it.danos_provaveis || '').trim(),
                String(it.medidas_prevencao || '').trim(),
                String(it.responsavel || '').trim(),
                String(it.norma_referencia || '').trim(),
                Array.isArray(it.epis_sugeridos) ? it.epis_sugeridos.map(function (x) { return String(x || '').trim(); }) : [],
                Array.isArray(it.gatilhos) ? it.gatilhos.map(function (x) { return String(x || '').trim(); }) : [],
                String(it.evidencia_campo || '').trim(),
                String(it.fonte_consultada || '').trim(),
                String(it.hipotese_risco || '').trim(),
                String(it.pergunta_pendente || '').trim()
            ]);
        }

        function assinaturaComumRegraSugestaoBackup(it, ctxChave) {
            return JSON.stringify([
                String(ctxChave || 'sem_ctx'),
                String(it.fase_operacional || '').trim(),
                String(it.passo_tarefa || '').trim(),
                String(it.perigo_fonte || '').trim(),
                String(it.evento_risco || '').trim(),
                String(it.danos_provaveis || '').trim(),
                String(it.medidas_prevencao || '').trim(),
                String(it.norma_referencia || '').trim(),
                Array.isArray(it.epis_sugeridos) ? it.epis_sugeridos.map(function (x) { return String(x || '').trim(); }) : [],
                Array.isArray(it.gatilhos) ? it.gatilhos.map(function (x) { return String(x || '').trim(); }) : [],
                String(it.evidencia_campo || '').trim(),
                String(it.fonte_consultada || '').trim(),
                String(it.pergunta_pendente || '').trim()
            ]);
        }

        function saoVinculadosRegraSugestao(a, b) {
            if (!a || !b) return false;
            var aRegra = a.tipoOrigem === 'regra';
            var bRegra = b.tipoOrigem === 'regra';
            if (aRegra === bRegra) return false;
            var regra = aRegra ? a : b;
            var sug = aRegra ? b : a;
            if (regra.sugestaoOrigemId && sug.idOriginal && regra.sugestaoOrigemId === sug.idOriginal) return true;
            if (sug.regraGeradaId && regra.idOriginal && sug.regraGeradaId === regra.idOriginal) return true;
            if (sug.origemRegraId && regra.idOriginal && sug.origemRegraId === regra.idOriginal) return true;
            return false;
        }

        function ehDuplicataIntegralItemBackup(a, b, ctxChaveA, ctxChaveB) {
            if (String(ctxChaveA || 'sem_ctx') !== String(ctxChaveB || 'sem_ctx')) return false;
            if (assinaturaTecnicaCompletaItemBackup(a, ctxChaveA) === assinaturaTecnicaCompletaItemBackup(b, ctxChaveB)) {
                return true;
            }
            if (saoVinculadosRegraSugestao(a, b) && assinaturaComumRegraSugestaoBackup(a, ctxChaveA) === assinaturaComumRegraSugestaoBackup(b, ctxChaveB)) {
                return true;
            }
            return false;
        }

        function converterSugestaoFilaParaComparacaoBackup(ex) {
            var a = ex && ex.acao_proposta ? ex.acao_proposta : {};
            var passo = String(a.passo_tarefa || '').trim();
            var perigo = String(a.perigo_fonte || '').trim();
            return {
                tipoOrigem: 'fila',
                idOriginal: ex && ex.id ? String(ex.id).trim() : '',
                regraGeradaId: ex && ex.regra_gerada_id ? String(ex.regra_gerada_id).trim() : '',
                origemRegraId: ex && ex.origem_regra_id ? String(ex.origem_regra_id).trim() : '',
                sugestaoOrigemId: '',
                fase_operacional: ex ? ex.fase_operacional : '',
                passo_tarefa: passo,
                perigo_fonte: perigo,
                evento_risco: String(a.evento_risco || perigo).trim(),
                danos_provaveis: String(a.danos_provaveis || 'A avaliar pela Engenharia').trim(),
                medidas_prevencao: String(a.medidas_prevencao || 'Revisar medida de controle aplicável.').trim(),
                responsavel: String(a.responsavel || 'Definir na APR').trim(),
                epis_sugeridos: Array.isArray(a.epis_sugeridos) ? a.epis_sugeridos.map(String) : [],
                norma_referencia: String(a.norma_referencia || 'NR-01 / NR-18').trim(),
                gatilhos: Array.isArray(a.gatilhos) ? a.gatilhos.map(String) : [],
                evidencia_campo: String(a.evidencia_campo || '').trim(),
                fonte_consultada: String(a.fonte_consultada || '').trim(),
                hipotese_risco: String(a.hipotese_risco || a.evento_risco || perigo).trim(),
                pergunta_pendente: String(a.pergunta_pendente || '').trim()
            };
        }

        function registrarItemValidado(dadosItem) {
            var idxDup = itensRevalidacaoValidos.findIndex(function (ex) {
                return ehDuplicataIntegralItemBackup(ex, dadosItem, ex.contextoOrigemId, dadosItem.contextoOrigemId);
            });
            if (idxDup !== -1) {
                // Se o já registrado era regra e chegou a sugestão vinculada equivalente, preserva os campos extras da sugestão (responsavel/hipotese) mantendo vínculo
                if (itensRevalidacaoValidos[idxDup].tipoOrigem === 'regra' && dadosItem.tipoOrigem === 'fila') {
                    var regraAnterior = itensRevalidacaoValidos[idxDup];
                    itensRevalidacaoValidos[idxDup] = Object.assign({}, dadosItem, {
                        regraGeradaId: dadosItem.regraGeradaId || regraAnterior.idOriginal,
                        origemLabel: 'Regra e sugestão equivalentes do backup (revalidação obrigatória)'
                    });
                }
                itensDuplicadosNoArquivo++;
                return;
            }
            itensRevalidacaoValidos.push(dadosItem);
        }

        regrasBrutas.forEach(function (r, idx) {
            var rotulo = 'regra #' + (idx + 1);
            if (!r || typeof r !== 'object' || Array.isArray(r)) {
                throw new Error('Backup inválido: ' + rotulo + ' não é um objeto válido.');
            }
            if (r.status_regra === 'REVOGADO') {
                ignoradosPorStatus++;
                return;
            }
            var passo = String(r.passo_tarefa || '').trim();
            var perigo = String(r.perigo_fonte || '').trim();
            if (!passo || !perigo) {
                throw new Error('Backup inválido: ' + rotulo + ' sem passo_tarefa ou perigo_fonte.');
            }
            totalRegrasAtivasNoArquivo++;
            registrarItemValidado({
                tipoOrigem: 'regra',
                idOriginal: r.id ? String(r.id).trim() : '',
                sugestaoOrigemId: r.sugestao_origem_id ? String(r.sugestao_origem_id).trim() : '',
                regraGeradaId: '',
                origemRegraId: '',
                origemLabel: 'Regra do backup (revalidação obrigatória)',
                contextoOrigemId: r.contexto_aplicavel_id ? String(r.contexto_aplicavel_id).trim() : null,
                fase_operacional: FASES_ROTEIRO_PERGUNTAS.some(function (f) { return f.id === r.fase; }) ? r.fase : inferirFaseRoteiro(passo + ' ' + perigo),
                passo_tarefa: passo,
                perigo_fonte: perigo,
                evento_risco: String(r.evento_risco || perigo).trim(),
                danos_provaveis: String(r.danos_provaveis || 'A avaliar pela Engenharia').trim(),
                medidas_prevencao: String(r.medidas_prevencao || 'Revisar medida de controle aplicável.').trim(),
                responsavel: String(r.responsavel || 'Definir na APR').trim(),
                epis_sugeridos: normalizarListaStringsBackup(r.epis_sugeridos, 'epis_sugeridos', rotulo),
                norma_referencia: String(r.norma_referencia || 'NR-01 / NR-18').trim(),
                gatilhos: Array.isArray(r.gatilhos)
                    ? r.gatilhos.map(function (g) { return sanitizarDadosPessoaisParaExportacao(String(g)); })
                    : extrairGatilhosTexto(passo + ' ' + perigo),
                evidencia_campo: String(r.evidencia_campo || 'Restaurado de backup local').trim(),
                fonte_consultada: String(r.fonte_consultada || 'Backup local — conferir fonte original').trim(),
                hipotese_risco: String(r.hipotese_risco || r.evento_risco || perigo).trim(),
                pergunta_pendente: String(r.pergunta_pendente || 'Confirmar validade atual e reaprovar antes de usar na APR.').trim()
            });
        });

        filaBruta.forEach(function (item, idx) {
            var rotulo = 'item da fila #' + (idx + 1);
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error('Backup inválido: ' + rotulo + ' não é um objeto válido.');
            }
            if (item.status === 'DESCARTADO' || item.status === 'REVOGADO') {
                ignoradosPorStatus++;
                return;
            }
            if (!item.acao_proposta || typeof item.acao_proposta !== 'object' || Array.isArray(item.acao_proposta)) {
                throw new Error('Backup inválido: ' + rotulo + ' sem acao_proposta válida.');
            }
            var a = item.acao_proposta;
            var passo = String(a.passo_tarefa || '').trim();
            var perigo = String(a.perigo_fonte || '').trim();
            if (!passo || !perigo) {
                throw new Error('Backup inválido: ' + rotulo + ' sem passo_tarefa ou perigo_fonte.');
            }
            totalFilaAtivaNoArquivo++;
            registrarItemValidado({
                tipoOrigem: 'fila',
                idOriginal: item.id ? String(item.id).trim() : '',
                sugestaoOrigemId: '',
                regraGeradaId: item.regra_gerada_id ? String(item.regra_gerada_id).trim() : '',
                origemRegraId: item.origem_regra_id ? String(item.origem_regra_id).trim() : '',
                origemLabel: 'Item da fila do backup',
                contextoOrigemId: item.contexto_id ? String(item.contexto_id).trim() : null,
                fase_operacional: FASES_ROTEIRO_PERGUNTAS.some(function (f) { return f.id === item.fase_operacional; }) ? item.fase_operacional : inferirFaseRoteiro(passo + ' ' + perigo),
                passo_tarefa: passo,
                perigo_fonte: perigo,
                evento_risco: String(a.evento_risco || perigo).trim(),
                danos_provaveis: String(a.danos_provaveis || 'A avaliar pela Engenharia').trim(),
                medidas_prevencao: String(a.medidas_prevencao || 'Revisar medida de controle aplicável.').trim(),
                responsavel: String(a.responsavel || 'Definir na APR').trim(),
                epis_sugeridos: normalizarListaStringsBackup(a.epis_sugeridos, 'epis_sugeridos', rotulo),
                norma_referencia: String(a.norma_referencia || 'NR-01 / NR-18').trim(),
                gatilhos: Array.isArray(a.gatilhos)
                    ? a.gatilhos.map(function (g) { return sanitizarDadosPessoaisParaExportacao(String(g)); })
                    : extrairGatilhosTexto(passo + ' ' + perigo),
                evidencia_campo: String(a.evidencia_campo || 'Restaurado de backup local').trim(),
                fonte_consultada: String(a.fonte_consultada || 'Backup local — conferir fonte original').trim(),
                hipotese_risco: String(a.hipotese_risco || a.evento_risco || perigo).trim(),
                pergunta_pendente: String(a.pergunta_pendente || 'Confirmar validade atual e reaprovar antes de usar na APR.').trim()
            });
        });

        if (contextosValidos.length === 0 && itensRevalidacaoValidos.length === 0) {
            throw new Error('O arquivo de backup não contém cenários, regras ou rascunhos válidos para restaurar.');
        }
        if (contextosValidos.length > LIMITE_MAX_CONTEXTOS) {
            throw new Error('O backup contém ' + contextosValidos.length + ' cenários, acima do limite local de ' + LIMITE_MAX_CONTEXTOS + '. Reduza a quantidade antes de importar.');
        }
        if (itensRevalidacaoValidos.length > LIMITE_MAX_SUGESTOES) {
            throw new Error('O backup contém ' + itensRevalidacaoValidos.length + ' itens restauráveis para a fila, acima do limite local de ' + LIMITE_MAX_SUGESTOES + '.');
        }

        // Classificação detalhada de novos, idênticos e conflitos de conteúdo para o modo Mesclar
        var contextosNovos = 0;
        var contextosIdenticos = 0;
        var conflitosContexto = [];
        var mapaIdsContextoPrevisto = {};
        contextosValidos.forEach(function (c) {
            var existente = estadoModulo.contextos.find(function (ex) {
                return (c.idOriginal && ex.id === c.idOriginal) ||
                    (normalizar(ex.cargo_equipe) === normalizar(c.cargo_equipe) && normalizar(ex.frente_servico) === normalizar(c.frente_servico));
            });
            if (!existente) {
                contextosNovos++;
                if (c.idOriginal) mapaIdsContextoPrevisto[c.idOriginal] = '__novo_ctx_' + c.idOriginal;
                return;
            }
            if (c.idOriginal) mapaIdsContextoPrevisto[c.idOriginal] = existente.id;
            var comp = compararConteudoContexto(existente, c);
            if (comp.igual) {
                contextosIdenticos++;
            } else {
                conflitosContexto.push({
                    idBackup: c.idOriginal,
                    idExistente: existente.id,
                    cargo_equipe: c.cargo_equipe,
                    frente_servico: c.frente_servico,
                    camposDiferentes: comp.camposDiferentes
                });
            }
        });

        var itensOrfaos = 0;
        var itensFilaJaExistentesMesclar = 0;
        var itensMesmoPassoPerigoConteudoDiferente = 0;
        itensRevalidacaoValidos.forEach(function (it) {
            var ctxPrevisto = null;
            if (it.contextoOrigemId) {
                if (mapaIdsContextoPrevisto[it.contextoOrigemId]) {
                    ctxPrevisto = mapaIdsContextoPrevisto[it.contextoOrigemId];
                } else if (estadoModulo.contextos.some(function (ex) { return ex.id === it.contextoOrigemId; })) {
                    ctxPrevisto = it.contextoOrigemId;
                } else {
                    itensOrfaos++;
                    ctxPrevisto = null;
                }
            }
            var dupAtual = estadoModulo.sugestoesFila.some(function (ex) {
                if (ex.status === 'DESCARTADO') return false;
                return ehDuplicataIntegralItemBackup(converterSugestaoFilaParaComparacaoBackup(ex), it, ex.contexto_id, ctxPrevisto);
            });
            if (dupAtual) {
                itensFilaJaExistentesMesclar++;
                return;
            }
            var mesmoPassoPerigoDiferente = estadoModulo.sugestoesFila.some(function (ex) {
                return ex.status !== 'DESCARTADO' &&
                    ex.contexto_id === ctxPrevisto &&
                    ex.acao_proposta &&
                    (
                        (it.idOriginal && ex.id === it.idOriginal) ||
                        (normalizar(ex.acao_proposta.passo_tarefa) === normalizar(it.passo_tarefa) &&
                         normalizar(ex.acao_proposta.perigo_fonte) === normalizar(it.perigo_fonte))
                    );
            });
            if (mesmoPassoPerigoDiferente) {
                itensMesmoPassoPerigoConteudoDiferente++;
            }
        });

        var novosItensFilaMesclar = Math.max(0, itensRevalidacaoValidos.length - itensFilaJaExistentesMesclar);
        var excedenteContextosMesclar = Math.max(0, (estadoModulo.contextos.length + contextosNovos) - LIMITE_MAX_CONTEXTOS);
        var excedenteFilaMesclar = Math.max(0, (estadoModulo.sugestoesFila.length + novosItensFilaMesclar) - LIMITE_MAX_SUGESTOES);

        return {
            textoOriginal: limpo,
            identidadeChave: estadoModulo.identidadeChave,
            geradoEm: String(obj.gerado_em || 'Data não informada'),
            contextos: contextosValidos,
            itensRevalidacao: itensRevalidacaoValidos,
            conflitosContexto: conflitosContexto,
            comparadores: {
                ehDuplicataIntegralItemBackup: ehDuplicataIntegralItemBackup,
                converterSugestaoFilaParaComparacaoBackup: converterSugestaoFilaParaComparacaoBackup
            },
            resumo: {
                totalContextos: contextosValidos.length,
                contextosNovos: contextosNovos,
                contextosIdenticos: contextosIdenticos,
                contextosDuplicados: contextosIdenticos + conflitosContexto.length,
                conflitosConteudo: conflitosContexto.length,
                totalRegras: totalRegrasAtivasNoArquivo,
                totalFila: totalFilaAtivaNoArquivo,
                totalItensRevalidacao: itensRevalidacaoValidos.length,
                filaDuplicados: itensFilaJaExistentesMesclar,
                itensMesmoPassoPerigoConteudoDiferente: itensMesmoPassoPerigoConteudoDiferente,
                itensDuplicadosNoArquivo: itensDuplicadosNoArquivo,
                ignoradosPorStatus: ignoradosPorStatus,
                itensOrfaos: itensOrfaos,
                excedenteContextosMesclar: excedenteContextosMesclar,
                excedenteFilaMesclar: excedenteFilaMesclar,
                efetivamenteRestauraveisMesclar: contextosNovos + novosItensFilaMesclar,
                efetivamenteRestauraveisSubstituir: contextosValidos.length + itensRevalidacaoValidos.length,
                atualContextos: estadoModulo.contextos.length,
                atualRegras: estadoModulo.regrasAprendidas.length,
                atualFila: estadoModulo.sugestoesFila.length
            }
        };
    }

    function aplicarRestauracaoBackupLocal(textoBruto, modo, opcoes) {
        opcoes = opcoes || {};
        var modoFinal = modo === 'substituir' ? 'substituir' : 'mesclar';
        var politicaConflito = String(opcoes.politicaConflito || '').trim();
        var analise = analisarBackupCadernoLocal(textoBruto);

        if (modoFinal === 'mesclar' && analise.conflitosContexto.length > 0) {
            if (politicaConflito !== 'manter_existente' && politicaConflito !== 'restaurar_copia' && politicaConflito !== 'substituir_versao') {
                var nomesConflito = analise.conflitosContexto.map(function (c) { return c.cargo_equipe; }).join(', ');
                throw new Error('Conflito de versão detectado em ' + analise.conflitosContexto.length + ' cenário(s) com conteúdo diferente (' + nomesConflito + '). Escolha explicitamente como tratar: manter existente, restaurar como cópia ou substituir versão.');
            }
        }

        // Snapshot de segurança do estado atual preparado ANTES de qualquer alteração
        var copiaSegurancaAntes = null;
        if (modoFinal === 'substituir' && (estadoModulo.contextos.length > 0 || estadoModulo.regrasAprendidas.length > 0 || estadoModulo.sugestoesFila.length > 0)) {
            var agoraCopiaIso = new Date().toISOString();
            copiaSegurancaAntes = {
                nomeArquivo: 'copia_seguranca_antes_substituir_' + agoraCopiaIso.slice(0, 10) + '.json',
                geradoEm: agoraCopiaIso,
                json: JSON.stringify({
                    formato: FORMATO_BACKUP_LOCAL,
                    gerado_em: agoraCopiaIso,
                    contextos: estadoModulo.contextos,
                    regrasAprendidas: estadoModulo.regrasAprendidas,
                    sugestoesFila: estadoModulo.sugestoesFila
                })
            };
        }

        return executarMutacaoPersistida(function () {
            var papelNoCommit = obterPapelUsuarioIa();
            if (papelNoCommit !== 'editor' && papelNoCommit !== 'validador') {
                throw new Error('Permissão negada: apenas editores ou validadores podem restaurar backup.');
            }
            var s = obterSessaoSegura() || {};
            var agoraIso = new Date().toISOString();

            // Construção integral em área temporária ANTES de alterar estadoModulo (zero limpeza prematura e zero truncamento silencioso)
            var proxContextos = modoFinal === 'substituir' ? [] : JSON.parse(JSON.stringify(estadoModulo.contextos));
            var proxRegras = modoFinal === 'substituir' ? [] : JSON.parse(JSON.stringify(estadoModulo.regrasAprendidas));
            var proxFila = modoFinal === 'substituir' ? [] : JSON.parse(JSON.stringify(estadoModulo.sugestoesFila));

            var mapaIdsContexto = {};
            var ctxAdicionados = 0;
            var ctxAtualizados = 0;
            var ctxCopiados = 0;
            var ctxMantidos = 0;
            var itensRevalidacaoAdicionados = 0;

            analise.contextos.forEach(function (c, idx) {
                var existente = proxContextos.find(function (ex) {
                    return (c.idOriginal && ex.id === c.idOriginal) ||
                        (normalizar(ex.cargo_equipe) === normalizar(c.cargo_equipe) && normalizar(ex.frente_servico) === normalizar(c.frente_servico));
                });

                if (existente) {
                    var comp = compararConteudoContexto(existente, c);
                    if (comp.igual) {
                        if (c.idOriginal) mapaIdsContexto[c.idOriginal] = existente.id;
                        ctxMantidos++;
                        return;
                    }
                    if (politicaConflito === 'manter_existente') {
                        if (c.idOriginal) mapaIdsContexto[c.idOriginal] = existente.id;
                        ctxMantidos++;
                        return;
                    }
                    if (politicaConflito === 'substituir_versao') {
                        existente.versao = (Number(existente.versao) || 1) + 1;
                        existente.status_cenario = 'RASCUNHO_NAO_APROVADO';
                        existente.cargo_equipe = c.cargo_equipe;
                        existente.ghe_codigo = c.ghe_codigo;
                        existente.frente_servico = c.frente_servico;
                        existente.fonte_procedimento = c.fonte_procedimento || 'Restaurado de backup local — conferir versão vigente';
                        existente.rotina_detalhada = c.rotina_detalhada;
                        existente.fases_operacionais = JSON.parse(JSON.stringify(c.fases_operacionais));
                        existente.ferramentas_reais = c.ferramentas_reais.slice();
                        existente.perigos_observados = c.perigos_observados.slice();
                        existente.epis_validados = c.epis_validados.slice();
                        existente.regras_engenheiro = c.regras_engenheiro;
                        existente.updated_at = agoraIso;
                        if (c.idOriginal) mapaIdsContexto[c.idOriginal] = existente.id;
                        ctxAtualizados++;
                        return;
                    }
                    // politicaConflito === 'restaurar_copia': preserva o existente e adiciona cópia integral
                    var idCopia = gerarIdUnico('ctx_bkp_copia_' + idx);
                    if (c.idOriginal) mapaIdsContexto[c.idOriginal] = idCopia;
                    proxContextos.push({
                        id: idCopia,
                        versao: 1,
                        status_cenario: 'RASCUNHO_NAO_APROVADO',
                        codigo_cenario: String(c.codigo_cenario || ('BKP-' + String(proxContextos.length + 1).padStart(3, '0'))),
                        cargo_equipe: c.cargo_equipe + ' (Cópia Backup)',
                        ghe_codigo: c.ghe_codigo,
                        frente_servico: c.frente_servico,
                        fonte_procedimento: c.fonte_procedimento || 'Restaurado de backup local — conferir versão vigente',
                        rotina_detalhada: c.rotina_detalhada,
                        fases_operacionais: JSON.parse(JSON.stringify(c.fases_operacionais)),
                        ferramentas_reais: c.ferramentas_reais.slice(),
                        perigos_observados: c.perigos_observados.slice(),
                        epis_validados: c.epis_validados.slice(),
                        regras_engenheiro: c.regras_engenheiro,
                        ativo: true,
                        criado_por_matricula: String(s.matricula || ''),
                        updated_at: agoraIso
                    });
                    ctxCopiados++;
                    ctxAdicionados++;
                    return;
                }

                var novoId = gerarIdUnico('ctx_bkp_' + idx);
                if (c.idOriginal) mapaIdsContexto[c.idOriginal] = novoId;
                proxContextos.push({
                    id: novoId,
                    versao: 1,
                    status_cenario: 'RASCUNHO_NAO_APROVADO',
                    codigo_cenario: String(c.codigo_cenario || ('BKP-' + String(proxContextos.length + 1).padStart(3, '0'))),
                    cargo_equipe: c.cargo_equipe,
                    ghe_codigo: c.ghe_codigo,
                    frente_servico: c.frente_servico,
                    fonte_procedimento: c.fonte_procedimento || 'Restaurado de backup local — conferir versão vigente',
                    rotina_detalhada: c.rotina_detalhada,
                    fases_operacionais: JSON.parse(JSON.stringify(c.fases_operacionais)),
                    ferramentas_reais: c.ferramentas_reais.slice(),
                    perigos_observados: c.perigos_observados.slice(),
                    epis_validados: c.epis_validados.slice(),
                    regras_engenheiro: c.regras_engenheiro,
                    ativo: true,
                    criado_por_matricula: String(s.matricula || ''),
                    updated_at: agoraIso
                });
                ctxAdicionados++;
            });

            if (proxContextos.length > LIMITE_MAX_CONTEXTOS) {
                throw new Error('Capacidade excedida: o resultado da restauração teria ' + proxContextos.length + ' cenários (limite local: ' + LIMITE_MAX_CONTEXTOS + '). Remova cenários antigos antes de mesclar ou use o modo Substituir após guardar cópia de segurança.');
            }

            // Regras e sugestões de arquivo externo NUNCA entram auto-aprovadas: entram na fila como RASCUNHO aguardando revalidação explícita!
            var ehDupIntegral = analise.comparadores.ehDuplicataIntegralItemBackup;
            var convFilaComp = analise.comparadores.converterSugestaoFilaParaComparacaoBackup;
            var itensDuplicatasIntegraisIgnorados = 0;

            analise.itensRevalidacao.forEach(function (it, idx) {
                var ctxMapeado = null;
                if (it.contextoOrigemId) {
                    if (mapaIdsContexto[it.contextoOrigemId]) {
                        ctxMapeado = mapaIdsContexto[it.contextoOrigemId];
                    } else if (proxContextos.some(function (ex) { return ex.id === it.contextoOrigemId; })) {
                        ctxMapeado = it.contextoOrigemId;
                    }
                }
                var jaExiste = proxFila.some(function (ex) {
                    if (ex.status === 'DESCARTADO') return false;
                    return ehDupIntegral(convFilaComp(ex), it, ex.contexto_id, ctxMapeado);
                });
                if (jaExiste) {
                    itensDuplicatasIntegraisIgnorados++;
                    return;
                }

                proxFila.push({
                    id: gerarIdUnico('sug_bkp_' + idx),
                    versao: 1,
                    origem_regra_id: null,
                    regra_gerada_id: null,
                    contexto_id: ctxMapeado,
                    modulo_destino: 'APR',
                    fase_operacional: it.fase_operacional,
                    titulo_insight: '[Backup — Revalidar] ' + it.passo_tarefa.slice(0, 80),
                    descricao_analise: it.origemLabel + ' — restaurado de arquivo externo; requer confirmação/aprovação explícita do Validador Técnico antes de enviar à APR.',
                    acao_proposta: {
                        passo_tarefa: it.passo_tarefa,
                        perigo_fonte: it.perigo_fonte,
                        evento_risco: it.evento_risco,
                        danos_provaveis: it.danos_provaveis,
                        p_puro: '',
                        s_puro: '',
                        medidas_prevencao: it.medidas_prevencao,
                        p_residual: '',
                        s_residual: '',
                        responsavel: it.responsavel,
                        epis_sugeridos: it.epis_sugeridos.slice(),
                        norma_referencia: it.norma_referencia,
                        gatilhos: it.gatilhos.slice(),
                        evidencia_campo: it.evidencia_campo,
                        fonte_consultada: it.fonte_consultada,
                        hipotese_risco: it.hipotese_risco,
                        pergunta_pendente: it.pergunta_pendente
                    },
                    status: 'RASCUNHO',
                    feedback_engenheiro: '',
                    criado_por_matricula: String(s.matricula || ''),
                    aprovado_por_matricula: '',
                    created_at: agoraIso
                });
                itensRevalidacaoAdicionados++;
            });

            if (proxFila.length > LIMITE_MAX_SUGESTOES) {
                throw new Error('Capacidade excedida: o resultado da restauração teria ' + proxFila.length + ' itens na fila (limite local: ' + LIMITE_MAX_SUGESTOES + '). Descarte ou finalize itens antigos na Aba 3 antes de mesclar.');
            }

            if (modoFinal === 'substituir' && proxContextos.length === 0 && proxFila.length === 0) {
                throw new Error('Restauração cancelada: nenhum registro válido pôde ser construído a partir do backup.');
            }

            // Verifica tamanho UTF-8 final antes de substituir as referências em estadoModulo
            var jsonSimulado = JSON.stringify({
                contextos: proxContextos,
                regrasAprendidas: proxRegras,
                sugestoesFila: proxFila,
                historicoAuditoria: estadoModulo.historicoAuditoria,
                ultimoBackupEm: estadoModulo.ultimoBackupEm || '',
                alteracoesAposBackup: true
            });
            var bytesFinais = medirBytesUtf8(jsonSimulado);
            if (bytesFinais > LIMITE_BYTES_STORAGE_SESSAO) {
                throw new Error('Tamanho final excede o limite de armazenamento local (' + (Math.round((bytesFinais / 1024) * 10) / 10) + ' KB / ' + Math.round(LIMITE_BYTES_STORAGE_SESSAO / 1024) + ' KB UTF-8). Remova itens antigos antes de restaurar.');
            }

            // Tudo validado com 100% de integridade — aplica a troca atômica
            estadoModulo.contextos = proxContextos;
            estadoModulo.regrasAprendidas = proxRegras;
            estadoModulo.sugestoesFila = proxFila;
            if (!estadoModulo.contextoSelecionadoId || !estadoModulo.contextos.some(function (c) { return c.id === estadoModulo.contextoSelecionadoId; })) {
                estadoModulo.contextoSelecionadoId = estadoModulo.contextos[0] ? estadoModulo.contextos[0].id : '';
            }
            registrarEventoAuditoria('RESTAURAR_BACKUP_LOCAL', modoFinal, ctxAdicionados + ' novo(s), ' + ctxAtualizados + ' atualizado(s), ' + ctxCopiados + ' cópia(s), ' + itensRevalidacaoAdicionados + ' item(ns) para revalidação na Aba 3');
            return {
                modo: modoFinal,
                politicaConflito: politicaConflito || null,
                contextosAdicionados: ctxAdicionados,
                contextosAtualizados: ctxAtualizados,
                contextosCopiados: ctxCopiados,
                contextosMantidosExistentes: ctxMantidos,
                itensRevalidacaoAdicionados: itensRevalidacaoAdicionados,
                itensDuplicatasIntegraisIgnorados: itensDuplicatasIntegraisIgnorados,
                copiaSegurancaAntes: copiaSegurancaAntes
            };
        });
    }

    function importarExemploDeTextoOuJson(conteudoTexto, nomeArquivo) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Seu perfil atual possui acesso somente leitura neste módulo.');
        }

        var bruto = String(conteudoTexto || '').trim();
        if (!bruto) throw new Error('O arquivo ou texto de exemplo está vazio.');
        if (medirBytesUtf8(bruto) > LIMITE_BYTES_FICHA_IMPORTACAO) {
            throw new Error('Ficha excede o limite de ' + (LIMITE_BYTES_FICHA_IMPORTACAO / 1024) + ' KB (' + LIMITE_BYTES_FICHA_IMPORTACAO + ' bytes UTF-8).');
        }

        var erroProibido = contemConteudoProibidoImportacao(bruto);
        if (erroProibido) throw new Error(erroProibido);

        if (bruto.charAt(0) === '{' || bruto.charAt(0) === '[') {
            var obj = null;
            try {
                obj = JSON.parse(bruto);
            } catch (e) {
                throw new Error('Arquivo JSON malformado.');
            }
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                throw new Error('O JSON de exemplo deve ser um objeto estruturado conforme o contrato.');
            }
            var chaveInvalida = Object.keys(obj).find(function (k) { return !CAMPOS_PERMITIDOS_CONTEXTO_JSON.has(k); });
            if (chaveInvalida) {
                throw new Error('Campo inesperado no JSON de cenário: "' + chaveInvalida + '".');
            }
            return salvarContextoOperacional({
                codigo_cenario: obj.codigo_cenario,
                cargo_equipe: obj.cargo_equipe || nomeArquivo || 'Rascunho JSON',
                ghe_codigo: obj.ghe_codigo || '',
                frente_servico: obj.frente_servico || 'Pendente de revisão',
                fonte_procedimento: obj.fonte_procedimento || 'Importado de ' + (nomeArquivo || 'JSON'),
                rotina_detalhada: obj.rotina_detalhada || '',
                fases_operacionais: obj.fases_operacionais || {},
                ferramentas_reais: Array.isArray(obj.ferramentas_reais) ? obj.ferramentas_reais : [],
                perigos_observados: Array.isArray(obj.perigos_observados) ? obj.perigos_observados : [],
                epis_validados: Array.isArray(obj.epis_validados) ? obj.epis_validados : [],
                regras_engenheiro: obj.regras_engenheiro || ''
            });
        }

        var linhas = bruto.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        var titulo = (linhas[0] || nomeArquivo || 'Rascunho de Extração').replace(/^#+\s*/, '').slice(0, 90);
        return salvarContextoOperacional({
            cargo_equipe: titulo + ' (Rascunho Extraído)',
            frente_servico: 'Extraído de ' + (nomeArquivo || 'Texto Livre'),
            fonte_procedimento: 'Fonte documental pendente de revisão pela Engenharia',
            rotina_detalhada: bruto.slice(0, 2000),
            fases_operacionais: { EXECUCAO_FERRAMENTAS: bruto.slice(0, 500) },
            ferramentas_reais: [],
            perigos_observados: linhas.filter(function (l) {
                return /risco|perigo|acidente|queda|corte|peçonhent|atropelamento|choque|prensamento/i.test(l);
            }).slice(0, 6),
            epis_validados: [],
            regras_engenheiro: ''
        });
    }

    // =========================================================================
    // 7. TRANSIÇÕES DE ESTADO, IDEMPOTÊNCIA, AJUSTE, APROVAÇÃO E REVOGAÇÃO
    // =========================================================================
    function ajustarSugestaoIa(sugestaoId, camposEditados, versaoEsperada) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: apenas editores ou validadores podem ajustar rascunhos.');
        }
        var erroProibido = contemConteudoProibidoImportacao(JSON.stringify(camposEditados || {}));
        if (erroProibido) throw new Error(erroProibido);

        return executarMutacaoPersistida(function () {
            var sug = estadoModulo.sugestoesFila.find(function (s) { return s.id === sugestaoId; });
            if (!sug) throw new Error('Sugestão não encontrada.');
            if (sug.status === 'DESCARTADO' || sug.status === 'REVOGADO') {
                throw new Error('Não é permitido ajustar uma sugestão descartada ou revogada.');
            }

            if (versaoEsperada !== undefined && Number(versaoEsperada) !== Number(sug.versao || 1)) {
                throw new Error('Conflito de concorrência: esta sugestão já foi alterada em outra edição (versão atual ' + (sug.versao || 1) + ').');
            }

            var copiaCampos = Object.assign({}, camposEditados || {});
            if (Array.isArray(copiaCampos.gatilhos)) {
                copiaCampos.gatilhos = copiaCampos.gatilhos.map(function (g) {
                    return sanitizarDadosPessoaisParaExportacao(String(g)).slice(0, 40);
                });
            }
            Object.assign(sug.acao_proposta, copiaCampos);
            sug.acao_proposta.p_puro = '';
            sug.acao_proposta.s_puro = '';
            sug.acao_proposta.p_residual = '';
            sug.acao_proposta.s_residual = '';

            // Se a sugestão já possuía uma regra aprovada vinculada, suspende a regra anterior até nova aprovação!
            if (sug.regra_gerada_id) {
                var regraAntiga = estadoModulo.regrasAprendidas.find(function (r) { return r.id === sug.regra_gerada_id; });
                if (regraAntiga && regraAntiga.status_regra === 'APROVADO') {
                    regraAntiga.ativo = false;
                    regraAntiga.status_regra = 'SUSPENSA_POR_AJUSTE';
                    regraAntiga.versao = (Number(regraAntiga.versao) || 1) + 1;
                }
            }

            sug.status = 'AJUSTADO';
            sug.versao = (Number(sug.versao) || 1) + 1;
            sug.updated_at = new Date().toISOString();

            registrarEventoAuditoria('AJUSTAR_RASCUNHO_FILA', sug.id, 'Versão ' + sug.versao + ' (aguarda aprovação de Validador)');
            return sug;
        });
    }

    function aprovarSugestaoIa(sugestaoId, metadadosAprovacao) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'validador') {
            throw new Error('Acesso restrito: apenas o Validador Técnico da Engenharia SST pode aprovar regras na biblioteca.');
        }

        return executarMutacaoPersistida(function () {
            var sug = estadoModulo.sugestoesFila.find(function (s) { return s.id === sugestaoId; });
            if (!sug) throw new Error('Sugestão não encontrada na fila.');
            if (sug.status === 'DESCARTADO' || sug.status === 'REVOGADO') {
                throw new Error('Transição inválida: sugestão descartada ou revogada não pode ser aprovada.');
            }

            metadadosAprovacao = metadadosAprovacao || {};
            if (metadadosAprovacao.versaoEsperada !== undefined && Number(metadadosAprovacao.versaoEsperada) !== Number(sug.versao || 1)) {
                throw new Error('Conflito de concorrência ao aprovar: versão esperada ' + metadadosAprovacao.versaoEsperada + ', atual ' + (sug.versao || 1) + '.');
            }

            var s = obterSessaoSegura() || {};
            if (!sug.criado_por_matricula && sug.autor_matricula) {
                sug.criado_por_matricula = sug.autor_matricula;
            }
            sug.aprovado_por_matricula = String(s.matricula || '');
            sug.aprovado_por_uid = String(s.uid || s.id || '');
            sug.aprovado_em = new Date().toISOString();
            if (metadadosAprovacao.fonte_consultada) {
                sug.acao_proposta.fonte_consultada = String(metadadosAprovacao.fonte_consultada).trim();
            }

            var gatilhos = (Array.isArray(sug.acao_proposta.gatilhos) && sug.acao_proposta.gatilhos.length
                ? sug.acao_proposta.gatilhos
                : extrairGatilhosTexto(sug.acao_proposta.passo_tarefa + ' ' + sug.acao_proposta.perigo_fonte)
            ).map(function (g) { return sanitizarDadosPessoaisParaExportacao(String(g)); });
            sug.acao_proposta.gatilhos = gatilhos;

            // Idempotência: se já gerou uma regra antes, atualiza a mesma regra em vez de duplicar
            var regraExistente = sug.regra_gerada_id
                ? estadoModulo.regrasAprendidas.find(function (r) { return r.id === sug.regra_gerada_id; })
                : null;

            if (regraExistente) {
                regraExistente.versao = (Number(regraExistente.versao) || 1) + 1;
                regraExistente.status_regra = 'APROVADO';
                regraExistente.ativo = true;
                regraExistente.gatilhos = gatilhos;
                regraExistente.fase = sug.fase_operacional || 'EXECUCAO_FERRAMENTAS';
                regraExistente.passo_tarefa = sug.acao_proposta.passo_tarefa;
                regraExistente.perigo_fonte = sug.acao_proposta.perigo_fonte;
                regraExistente.evento_risco = sug.acao_proposta.evento_risco;
                regraExistente.danos_provaveis = sug.acao_proposta.danos_provaveis;
                regraExistente.medidas_prevencao = sug.acao_proposta.medidas_prevencao;
                regraExistente.epis_sugeridos = sug.acao_proposta.epis_sugeridos || [];
                regraExistente.fonte_consultada = sug.acao_proposta.fonte_consultada || 'Validação Engenharia SST';
                regraExistente.aprovado_por_matricula = sug.aprovado_por_matricula;
                regraExistente.aprovado_em = sug.aprovado_em;
                sug.regra_gerada_versao = regraExistente.versao;
            } else {
                var novaRegra = {
                    id: gerarIdUnico('regra'),
                    versao: 1,
                    status_regra: 'APROVADO',
                    sugestao_origem_id: sug.id,
                    contexto_aplicavel_id: sug.contexto_id || null,
                    gatilhos: gatilhos,
                    fase: sug.fase_operacional || 'EXECUCAO_FERRAMENTAS',
                    passo_tarefa: sug.acao_proposta.passo_tarefa,
                    perigo_fonte: sug.acao_proposta.perigo_fonte,
                    evento_risco: sug.acao_proposta.evento_risco,
                    danos_provaveis: sug.acao_proposta.danos_provaveis,
                    medidas_prevencao: sug.acao_proposta.medidas_prevencao,
                    epis_sugeridos: sug.acao_proposta.epis_sugeridos || [],
                    norma_referencia: sug.acao_proposta.norma_referencia || 'NR-01 / NR-18',
                    fonte_consultada: sug.acao_proposta.fonte_consultada || 'Validação Engenharia SST',
                    evidencia_campo: sug.acao_proposta.evidencia_campo || '',
                    pergunta_pendente: sug.acao_proposta.pergunta_pendente || '',
                    criado_por_matricula: sug.criado_por_matricula || '',
                    aprovado_por_matricula: sug.aprovado_por_matricula,
                    aprovado_em: sug.aprovado_em,
                    ativo: true
                };
                estadoModulo.regrasAprendidas.unshift(novaRegra);
                sug.regra_gerada_id = novaRegra.id;
                sug.regra_gerada_versao = 1;
            }

            sug.status = 'APROVADO';
            sug.versao = (Number(sug.versao) || 1) + 1;
            registrarEventoAuditoria('APROVAR_REGRA_ENGENHARIA', sug.regra_gerada_id, 'Sugestão: ' + sug.id + ' | Aprovador: ' + sug.aprovado_por_matricula);
            return sug;
        });
    }

    function revogarRegraAprendida(regraId, motivoRevogacao) {
        garantirEstadoSessao();
        if (obterPapelUsuarioIa() !== 'validador') {
            throw new Error('Apenas o Validador Técnico da Engenharia pode revogar uma regra aprovada.');
        }

        return executarMutacaoPersistida(function () {
            var regra = estadoModulo.regrasAprendidas.find(function (r) { return r.id === regraId; });
            if (!regra) throw new Error('Regra não encontrada.');

            regra.ativo = false;
            regra.status_regra = 'REVOGADO';
            regra.versao = (Number(regra.versao) || 1) + 1;
            regra.motivo_revogacao = String(motivoRevogacao || 'Revogada pela Engenharia SST').trim();
            regra.revogado_em = new Date().toISOString();

            // Revoga imediatamente todas as sugestões dependentes na fila para impedir envio à APR!
            estadoModulo.sugestoesFila.forEach(function (sug) {
                if (sug.regra_gerada_id === regraId || sug.origem_regra_id === regraId) {
                    sug.status = 'REVOGADO';
                    sug.versao = (Number(sug.versao) || 1) + 1;
                    sug.feedback_engenheiro = 'Regra vinculada revogada: ' + regra.motivo_revogacao;
                }
            });

            registrarEventoAuditoria('REVOGAR_REGRA_ENGENHARIA', regra.id, regra.motivo_revogacao);
            return regra;
        });
    }

    function descartarSugestaoIa(sugestaoId, motivo) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Apenas usuários com permissão de gravação podem descartar itens da fila.');
        }
        return executarMutacaoPersistida(function () {
            var sug = estadoModulo.sugestoesFila.find(function (s) { return s.id === sugestaoId; });
            if (!sug) return null;
            sug.status = 'DESCARTADO';
            sug.versao = (Number(sug.versao) || 1) + 1;
            sug.feedback_engenheiro = String(motivo || 'Descartado na revisão técnica').trim();
            registrarEventoAuditoria('DESCARTAR_SUGESTAO', sug.id, sug.feedback_engenheiro);
            return sug;
        });
    }

    // =========================================================================
    // 8. TRANSFERÊNCIA SEGURA PARA APR (FILTRO DE CENÁRIO + LINHAS PARCIAIS)
    // =========================================================================
    function linhaAprTemQualquerDado(r) {
        if (!r || typeof r !== 'object') return false;
        var camposTexto = ['passo_tarefa', 'perigo_fonte', 'evento_risco', 'danos_provaveis', 'medidas_prevencao', 'responsavel', 'origem_ia_id'];
        for (var i = 0; i < camposTexto.length; i++) {
            if (String(r[camposTexto[i]] || '').trim() !== '') return true;
        }
        var camposNum = ['p_puro', 's_puro', 'p_residual', 's_residual'];
        for (var j = 0; j < camposNum.length; j++) {
            var v = r[camposNum[j]];
            if (v !== '' && v !== null && v !== undefined && Number(v) > 0) return true;
        }
        return false;
    }

    var ultimoSnapshotLimpoApr = null;

    var TODOS_CAMPOS_PADRAO_APR = [
        { id: 'aprForm_id', padrao: '' },
        { id: 'aprForm_numero', padrao: null },
        { id: 'aprForm_dataEmissao', padrao: null },
        { id: 'aprForm_validadeDias', padrao: '15' },
        { id: 'aprForm_validadeAte', padrao: null },
        { id: 'aprForm_ptNumero', padrao: '' },
        { id: 'aprForm_empresa', padrao: 'CONSÓRCIO OPERADOR DO PISF RAMAL DO AGRESTE' },
        { id: 'aprForm_setor', padrao: 'SMS' },
        { id: 'aprForm_local', padrao: 'ARCOVERDE - PE' },
        { id: 'aprForm_responsavel', padrao: '' },
        { id: 'aprForm_titulo', padrao: '' },
        { id: 'aprForm_descricaoAtividade', padrao: '' },
        { id: 'aprForm_outrosTexto', padrao: '' },
        { id: 'aprForm_luvaTipo', padrao: '' },
        { id: 'aprForm_extintorTipo', padrao: '' },
        { id: 'aprForm_rotaFuga', padrao: 'sim' },
        { id: 'aprForm_pontoEncontro', padrao: '' },
        { id: 'aprForm_socorrista', padrao: '' },
        { id: 'aprForm_contatoAmbulatorio', padrao: '' },
        { id: 'aprForm_contatoBombeiros', padrao: '' },
        { id: 'aprForm_elaborador', padrao: 'JOÃO EVERTON DE SOUZA LIMEIRA' },
        { id: 'aprForm_supervisor', padrao: '' },
        { id: 'aprForm_responsavelArea', padrao: '' }
    ];

    function capturarSnapshotFormularioApr() {
        var campos = {};
        TODOS_CAMPOS_PADRAO_APR.forEach(function (c) {
            var el = document.getElementById(c.id);
            if (el) campos[c.id] = String(el.value == null ? '' : el.value);
        });
        var checksId = {};
        ['aprForm_outrosCheck', 'aprForm_kitSocorros'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) checksId[id] = !!el.checked;
        });
        var checksClasses = [];
        if (typeof document.querySelectorAll === 'function') {
            var cbs = document.querySelectorAll('.aprAtivCriticaCheckbox, .aprEpiBasicoCheckbox, .aprEpiEspecificoCheckbox');
            if (Array.isArray(cbs) || (cbs && typeof cbs.forEach === 'function')) {
                cbs.forEach(function (cb) { checksClasses.push(!!(cb && cb.checked)); });
            }
        }
        var riscos = Array.isArray(window.aprRiscosForm)
            ? JSON.parse(JSON.stringify(window.aprRiscosForm))
            : [];
        return {
            campos: campos,
            checksId: checksId,
            checksClasses: checksClasses,
            riscos: riscos
        };
    }

    function restaurarSnapshotFormularioApr(snap) {
        if (!snap) return;
        Object.keys(snap.campos || {}).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = snap.campos[id];
        });
        Object.keys(snap.checksId || {}).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.checked = snap.checksId[id];
        });
        if (typeof document.querySelectorAll === 'function' && Array.isArray(snap.checksClasses)) {
            var cbs = document.querySelectorAll('.aprAtivCriticaCheckbox, .aprEpiBasicoCheckbox, .aprEpiEspecificoCheckbox');
            var idx = 0;
            if (Array.isArray(cbs) || (cbs && typeof cbs.forEach === 'function')) {
                cbs.forEach(function (cb) {
                    if (cb && idx < snap.checksClasses.length) cb.checked = snap.checksClasses[idx];
                    idx++;
                });
            }
        }
        window.aprRiscosForm = JSON.parse(JSON.stringify(snap.riscos || []));
        if (typeof window.renderRiscosAprForm === 'function') {
            try { window.renderRiscosAprForm(); } catch (e) { /* ignora */ }
        }
    }

    function verificarRascunhoAprAberto() {
        var camposAlterados = [];
        TODOS_CAMPOS_PADRAO_APR.forEach(function (c) {
            var el = document.getElementById(c.id);
            if (!el) return;
            var val = String(el.value == null ? '' : el.value).trim();
            if (ultimoSnapshotLimpoApr && Object.prototype.hasOwnProperty.call(ultimoSnapshotLimpoApr.campos, c.id)) {
                var valBase = String(ultimoSnapshotLimpoApr.campos[c.id] || '').trim();
                if (val !== valBase) camposAlterados.push(c.id);
            } else if (c.padrao !== null) {
                if (val !== '' && val !== c.padrao) camposAlterados.push(c.id);
            } else if (val !== '') {
                camposAlterados.push(c.id);
            }
        });

        var elOutros = document.getElementById('aprForm_outrosCheck');
        if (elOutros && elOutros.checked) camposAlterados.push('aprForm_outrosCheck');

        var elKit = document.getElementById('aprForm_kitSocorros');
        if (elKit && ultimoSnapshotLimpoApr && Object.prototype.hasOwnProperty.call(ultimoSnapshotLimpoApr.checksId, 'aprForm_kitSocorros')) {
            if (!!elKit.checked !== !!ultimoSnapshotLimpoApr.checksId.aprForm_kitSocorros) {
                camposAlterados.push('aprForm_kitSocorros');
            }
        }

        var checkboxesMarcados = false;
        if (typeof document.querySelectorAll === 'function') {
            var cbs = document.querySelectorAll('.aprAtivCriticaCheckbox, .aprEpiBasicoCheckbox, .aprEpiEspecificoCheckbox');
            if (Array.isArray(cbs) || (cbs && typeof cbs.forEach === 'function')) {
                cbs.forEach(function (cb) {
                    if (cb && cb.checked) checkboxesMarcados = true;
                });
            }
        }

        var riscosAtuais = Array.isArray(window.aprRiscosForm) ? window.aprRiscosForm : [];
        var linhasComDados = riscosAtuais.filter(linhaAprTemQualquerDado).length;

        return {
            aberto: camposAlterados.length > 0 || checkboxesMarcados || linhasComDados > 0,
            aprId: ((document.getElementById('aprForm_id') || {}).value || '').trim(),
            titulo: ((document.getElementById('aprForm_titulo') || {}).value || '').trim(),
            camposAlterados: camposAlterados,
            linhasPreenchidas: linhasComDados
        };
    }

    function sugestaoTemRegraAtivaValida(sug) {
        if (!sug || (sug.status !== 'APROVADO' && sug.status !== 'INCORPORADO_APR')) return false;
        var regraId = sug.regra_gerada_id || sug.origem_regra_id;
        if (!regraId) return false;
        var regra = estadoModulo.regrasAprendidas.find(function (r) { return r.id === regraId; });
        if (!regra || regra.ativo !== true || regra.status_regra !== 'APROVADO') return false;
        if (sug.regra_gerada_versao && Number(regra.versao || 1) !== Number(sug.regra_gerada_versao)) return false;
        return true;
    }

    function enviarRiscosAprovadosParaApr(modo, opcoesConfirmacao) {
        sincronizarDoStorageParaConcorrencia();
        var papelIa = obterPapelUsuarioIa();
        if (papelIa !== 'editor' && papelIa !== 'validador') {
            throw new Error('Permissão negada no módulo Inteligência SST.');
        }
        if (!usuarioPodeGravarApr()) {
            throw new Error('Permissão negada: seu usuário não possui autorização de edição no módulo de APR.');
        }

        modo = modo || 'acrescentar';
        opcoesConfirmacao = opcoesConfirmacao || {};
        var idsEscolhidos = Array.isArray(opcoesConfirmacao.sugestaoIds) ? new Set(opcoesConfirmacao.sugestaoIds) : null;
        var ctxAlvoId = opcoesConfirmacao.contextoId !== undefined ? opcoesConfirmacao.contextoId : estadoModulo.contextoSelecionadoId;

        var totalAtivasNaFila = estadoModulo.sugestoesFila.filter(sugestaoTemRegraAtivaValida).length;
        if (totalAtivasNaFila === 0) {
            throw new Error('Nenhuma regra ativa e aprovada encontrada para o cenário selecionado.');
        }

        var elegiveis = estadoModulo.sugestoesFila.filter(function (s) {
            if (!sugestaoTemRegraAtivaValida(s)) return false;
            if (idsEscolhidos) {
                if (!idsEscolhidos.has(s.id)) return false;
                if (ctxAlvoId) {
                    if (s.contexto_id === null && !opcoesConfirmacao.confirmarSemContexto && !opcoesConfirmacao.permitirOutroContexto) {
                        return false;
                    }
                    if (s.contexto_id && s.contexto_id !== ctxAlvoId && !opcoesConfirmacao.permitirOutroContexto) {
                        return false;
                    }
                }
                return true;
            }
            // Sem seleção explícita: quando há um cenário selecionado (ctxAlvoId), restringe ESTRITAMENTE a s.contexto_id === ctxAlvoId (nunca inclui s.contexto_id === null nem outro cenário)
            if (ctxAlvoId) {
                return s.contexto_id === ctxAlvoId;
            }
            return s.contexto_id === null;
        });

        if (elegiveis.length === 0) {
            return {
                cancelado: true,
                motivo: 'Nenhuma sugestão aprovada pertence ao cenário selecionado (itens sem cenário ou de outro cenário exigem seleção explícita).',
                linhasInjetadas: 0,
                totalApr: (window.aprRiscosForm || []).length
            };
        }

        var estadoApr = verificarRascunhoAprAberto();
        if (modo === 'nova' && estadoApr.aberto && !opcoesConfirmacao.forcarLimpezaRascunho) {
            var confirmarLimpeza = typeof confirm === 'function'
                ? confirm('⚠️ Há dados preenchidos no formulário da APR (' + (estadoApr.titulo || estadoApr.camposAlterados.join(', ') || (estadoApr.linhasPreenchidas + ' linha(s)')) + ').\n\nAbrir uma NOVA APR limpará esses dados. Deseja prosseguir?')
                : false;
            if (!confirmarLimpeza) {
                return { cancelado: true, motivo: 'Rascunho de APR preservado pelo usuário.', linhasInjetadas: 0, totalApr: (window.aprRiscosForm || []).length };
            }
        }

        var snapshotAprAntes = capturarSnapshotFormularioApr();
        var listaAntes = Array.isArray(window.aprRiscosForm) ? window.aprRiscosForm : [];
        var linhasBase = modo === 'nova' ? [] : listaAntes.filter(linhaAprTemQualquerDado);
        var linhasCalculadas = linhasBase.slice();
        var novasInseridas = 0;
        var episParaMarcar = new Set();
        var ctxParaRefino = ctxAlvoId ? buscarContextoPorId(ctxAlvoId) : null;

        // 1. Primeiro persiste a transação em estadoModulo/localStorage ANTES de limpar ou mutar o formulário da APR!
        executarMutacaoPersistida(function () {
            elegiveis.forEach(function (s, idxElegivel) {
                var a = s.acao_proposta || {};
                var passoCalculado = a.passo_tarefa || '';
                var eventoCalculado = a.evento_risco || '';
                var danosCalculados = a.danos_provaveis || '';
                var medidasCalculadas = a.medidas_prevencao || '';

                if (ehPropostaGenericaLegada(a)) {
                    var propRefinada = construirPropostaTecnicaPorPerigo(a.perigo_fonte, idxElegivel, ctxParaRefino);
                    passoCalculado = propRefinada.passo_tarefa;
                    eventoCalculado = propRefinada.evento_risco;
                    danosCalculados = propRefinada.danos_provaveis;
                    medidasCalculadas = propRefinada.medidas_prevencao;
                    a.passo_tarefa = passoCalculado;
                    a.evento_risco = eventoCalculado;
                    a.danos_provaveis = danosCalculados;
                    a.medidas_prevencao = medidasCalculadas;
                }

                var chaveOrigem = s.regra_gerada_id || s.id;
                var jaNaApr = linhasCalculadas.some(function (r) {
                    return (r.origem_ia_id && r.origem_ia_id === chaveOrigem) ||
                        (normalizar(r.passo_tarefa) === normalizar(passoCalculado) &&
                         normalizar(r.perigo_fonte) === normalizar(a.perigo_fonte));
                });
                if (jaNaApr) return;

                linhasCalculadas.push({
                    origem_ia_id: chaveOrigem,
                    origem_sugestao_id: s.id,
                    passo_tarefa: passoCalculado,
                    perigo_fonte: a.perigo_fonte || '',
                    evento_risco: eventoCalculado,
                    danos_provaveis: danosCalculados,
                    p_puro: '',
                    s_puro: '',
                    medidas_prevencao: medidasCalculadas,
                    p_residual: '',
                    s_residual: '',
                    responsavel: a.responsavel || ''
                });
                novasInseridas++;

                (a.epis_sugeridos || []).forEach(function (epi) { episParaMarcar.add(epi); });
                var sugAtual = estadoModulo.sugestoesFila.find(function (itemFila) { return itemFila.id === s.id; }) || s;
                sugAtual.status_transferencia = 'EM_RASCUNHO_APR';
                sugAtual.transferido_rascunho_em = new Date().toISOString();
            });
            registrarEventoAuditoria('PREPARAR_RASCUNHO_APR', ctxAlvoId || 'geral', novasInseridas + ' linha(s) preparada(s) no rascunho da APR.');
        });

        // 2. Somente após a persistência ter sido confirmada sem erro, atualiza o formulário da APR com rollback em caso de falha!
        try {
            if (typeof window.showDbPage === 'function') window.showDbPage('apr');
            if (typeof window.showAprSubtab === 'function') window.showAprSubtab('nova');
            if (modo === 'nova' && typeof window.abrirFormNovaApr === 'function') {
                window.abrirFormNovaApr();
                ultimoSnapshotLimpoApr = capturarSnapshotFormularioApr();
            }

            var ctx = ctxAlvoId ? buscarContextoPorId(ctxAlvoId) : null;
            if (ctx) {
                var elTitulo = document.getElementById('aprForm_titulo');
                var elDesc = document.getElementById('aprForm_descricaoAtividade');
                if (elTitulo && !elTitulo.value.trim()) {
                    elTitulo.value = (ctx.cargo_equipe + ' — ' + ctx.frente_servico).toUpperCase();
                }
                if (elDesc && !elDesc.value.trim()) {
                    elDesc.value = ctx.rotina_detalhada;
                }
            }

            window.aprRiscosForm = linhasCalculadas;

            if (typeof document.querySelectorAll === 'function' && episParaMarcar.size > 0) {
                document.querySelectorAll('.aprEpiBasicoCheckbox, .aprEpiEspecificoCheckbox').forEach(function (cb) {
                    if (episParaMarcar.has(cb.value)) cb.checked = true;
                });
            }

            if (typeof window.renderRiscosAprForm === 'function') {
                window.renderRiscosAprForm();
            }
        } catch (errDom) {
            restaurarSnapshotFormularioApr(snapshotAprAntes);
            throw errDom;
        }

        return { cancelado: false, linhasInjetadas: novasInseridas, totalApr: linhasCalculadas.length };
    }

    function confirmarIncorporacaoAprSalva(aprIdPersistido, origensIaIds) {
        var idReal = String(aprIdPersistido || '').trim();
        if (!idReal || idReal === 'RASCUNHO_APR') {
            throw new Error('Informe o ID persistido real da APR salva para confirmar a incorporação.');
        }
        return executarMutacaoPersistida(function () {
            var filtroOrigens = Array.isArray(origensIaIds) ? new Set(origensIaIds) : null;
            var confirmadas = 0;
            estadoModulo.sugestoesFila.forEach(function (s) {
                var chave = s.regra_gerada_id || s.id;
                var elegivel = (s.status === 'APROVADO' || s.status === 'INCORPORADO_APR') && s.status_transferencia === 'EM_RASCUNHO_APR' &&
                    (!filtroOrigens || filtroOrigens.has(chave) || filtroOrigens.has(s.id));
                if (elegivel) {
                    s.status = 'INCORPORADO_APR';
                    s.status_transferencia = 'CONFIRMADO_SALVO';
                    s.incorporado_apr_id = idReal;
                    s.incorporado_em = new Date().toISOString();
                    confirmadas++;
                }
            });
            registrarEventoAuditoria('CONFIRMAR_INCORPORACAO_APR', idReal, confirmadas + ' item(ns) incorporado(s).');
            return confirmadas;
        });
    }

    function acionarAssistenteIaNaAprAtual() {
        sincronizarDoStorageParaConcorrencia();
        if (!usuarioPodeGravarApr()) {
            alert('Seu perfil não possui permissão de edição na APR.');
            return { encontrados: 0, inseridos: 0 };
        }
        var titulo = (document.getElementById('aprForm_titulo') || {}).value || '';
        var desc = (document.getElementById('aprForm_descricaoAtividade') || {}).value || '';
        var local = (document.getElementById('aprForm_local') || {}).value || '';
        var textoApr = [titulo, desc, local].join(' ').trim();

        var linhasExistentes = Array.isArray(window.aprRiscosForm) ? window.aprRiscosForm.filter(linhaAprTemQualquerDado) : [];
        var ctxAtivo = buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0] || null;

        // Se a APR aberta tiver linhas com Passo da Tarefa genérico repetido ("Atividade de ... em ..."), desmembra especificamente por perigo preservando P×S!
        var linhasRefinadas = 0;
        linhasExistentes.forEach(function (r, idx) {
            if (ehPropostaGenericaLegada(r) && String(r.perigo_fonte || '').trim()) {
                var prop = construirPropostaTecnicaPorPerigo(r.perigo_fonte, idx, ctxAtivo);
                r.passo_tarefa = prop.passo_tarefa;
                r.evento_risco = prop.evento_risco;
                r.danos_provaveis = prop.danos_provaveis;
                r.medidas_prevencao = prop.medidas_prevencao;
                linhasRefinadas++;
            }
        });
        if (linhasRefinadas > 0) {
            window.aprRiscosForm = linhasExistentes;
            if (typeof window.renderRiscosAprForm === 'function') {
                window.renderRiscosAprForm();
            }
        }

        if (!textoApr) {
            if (linhasRefinadas > 0) {
                return { encontrados: linhasRefinadas, inseridos: 0, refinados: linhasRefinadas };
            }
            alert('Preencha o Título ou a Descrição da Atividade na APR para buscar regras aprovadas pela Engenharia.');
            return { encontrados: 0, inseridos: 0 };
        }

        var recuperadas = recuperarExemplosERegrasRelevantes(textoApr).regrasRecuperadas;

        var candidatas = recuperadas.filter(function (item) {
            var r = item.regra;
            return !linhasExistentes.some(function (ex) {
                return (ex.origem_ia_id && ex.origem_ia_id === r.id) ||
                    (normalizar(ex.passo_tarefa) === normalizar(r.passo_tarefa) &&
                     normalizar(ex.perigo_fonte) === normalizar(r.perigo_fonte));
            });
        });

        if (candidatas.length === 0) {
            if (linhasRefinadas > 0) {
                alert('✅ ' + linhasRefinadas + ' linha(s) da APR tiveram o Passo da Tarefa, Evento, Danos e Medidas desmembrados especificamente para cada perigo (preservando P×S).');
                return { encontrados: linhasRefinadas, inseridos: 0, refinados: linhasRefinadas };
            }
            alert('Nenhuma regra aprovada adicional foi encontrada para "' + titulo + '".');
            return { encontrados: 0, inseridos: 0 };
        }

        var resumo = candidatas.map(function (c, i) {
            return (i + 1) + ') ' + c.regra.passo_tarefa + ' — Perigo: ' + c.regra.perigo_fonte + ' (' + c.motivo + ')';
        }).join('\n');

        var aceitou = typeof confirm === 'function'
            ? confirm('🧠 Regras Aprovadas da Engenharia encontradas (' + candidatas.length + '):\n\n' + resumo + '\n\nDeseja acrescentar estas linhas à APR atual (preservando linhas existentes e deixando P×S para sua avaliação manual)?')
            : true;

        if (!aceitou) return { encontrados: candidatas.length, inseridos: 0 };

        candidatas.forEach(function (item) {
            var r = item.regra;
            linhasExistentes.push({
                origem_ia_id: r.id,
                passo_tarefa: r.passo_tarefa,
                perigo_fonte: r.perigo_fonte,
                evento_risco: r.evento_risco,
                danos_provaveis: r.danos_provaveis,
                p_puro: '',
                s_puro: '',
                medidas_prevencao: r.medidas_prevencao,
                p_residual: '',
                s_residual: '',
                responsavel: ''
            });
        });

        window.aprRiscosForm = linhasExistentes;
        if (typeof window.renderRiscosAprForm === 'function') {
            window.renderRiscosAprForm();
        }
        return { encontrados: candidatas.length, inseridos: candidatas.length };
    }

    // =========================================================================
    // 9. IMPRESSÃO DO DOSSIÊ
    // =========================================================================
    function imprimirDossieIaAprendizado() {
        garantirEstadoSessao();
        var ctx = buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0];
        if (!ctx) {
            alert('Cadastre ou selecione um cenário operacional antes de imprimir o dossiê.');
            return;
        }
        var aprovados = estadoModulo.sugestoesFila.filter(function (s) {
            return (!ctx || s.contexto_id === ctx.id || s.contexto_id === null) &&
                (s.status === 'APROVADO' || s.status === 'INCORPORADO_APR');
        });
        var pendentes = estadoModulo.sugestoesFila.filter(function (s) {
            return (!ctx || s.contexto_id === ctx.id || s.contexto_id === null) &&
                (s.status === 'RASCUNHO' || s.status === 'AJUSTADO');
        });
        var agora = new Date();
        var dataFmt = agora.toLocaleDateString('pt-BR');
        var horaFmt = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var titulo = 'Dossiê Técnico de Apoio à APR - ' + ctx.cargo_equipe;

        var fasesHtml = FASES_ROTEIRO_PERGUNTAS.map(function (f) {
            var desc = (ctx.fases_operacionais && ctx.fases_operacionais[f.id]) || 'PENDENTE DE LEVANTAMENTO EM CAMPO';
            return '<tr><td style="font-weight:700; width:30%;">' + esc(f.label) + '</td><td>' + esc(desc) + '</td></tr>';
        }).join('');

        function montarLinhasTabela(lista) {
            if (!lista.length) return '<tr><td colspan="7" style="text-align:center; padding:8px;">Nenhum registro nesta seção.</td></tr>';
            return lista.map(function (s, idx) {
                var a = s.acao_proposta || {};
                return '<tr>' +
                    '<td style="text-align:center; font-weight:700;">' + (idx + 1) + '</td>' +
                    '<td><b>' + esc(a.passo_tarefa) + '</b><br><span style="font-size:8.5px; color:#475569;">' + esc(obterLabelFase(s.fase_operacional)) + '</span></td>' +
                    '<td>' + esc(a.perigo_fonte) + '</td>' +
                    '<td>' + esc(a.medidas_prevencao) + '</td>' +
                    '<td>' + esc(a.fonte_consultada || 'Pendente') + '</td>' +
                    '<td>' + esc(a.pergunta_pendente || '-') + '</td>' +
                    '<td style="text-align:center; font-weight:700;">' + esc(s.status) + (s.aprovado_por_matricula ? '<br><span style="font-size:8px;">Aprov. ' + esc(s.aprovado_por_matricula) + '</span>' : '') + '</td>' +
                '</tr>';
            }).join('');
        }

        var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
            '<title>' + esc(titulo) + '</title>' +
            '<style>' +
            '@page { size: A4 landscape; margin: 10mm; }' +
            'body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; line-height: 1.35; }' +
            '.cab { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:8px; }' +
            '.cab h1 { font-size:13px; margin:0; text-transform:uppercase; }' +
            '.aviso { padding:6px 10px; border:1px solid #f59e0b; background:#fffbeb; border-radius:6px; margin-bottom:8px; font-size:9px; }' +
            '.bloco { border:1px solid #cbd5e1; border-radius:6px; padding:7px 10px; margin-bottom:8px; background:#f8fafc; }' +
            'h2 { font-size:11px; margin:8px 0 4px; text-transform:uppercase; color:#1e293b; }' +
            'table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:9px; }' +
            'th, td { border:1px solid #cbd5e1; padding:4px 6px; text-align:left; vertical-align:top; }' +
            'th { background:#e2e8f0; font-weight:800; text-transform:uppercase; font-size:8px; }' +
            '</style>' +
            '<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };<\/script>' +
            '</head><body>' +
            '<div class="cab">' +
                '<div><h1>Consórcio Operador — PISF Ramal do Agreste</h1><div>Dossiê de Apoio Técnico à APR — Confronto Trabalho Prescrito vs. Real (NR-01 / GRO)</div></div>' +
                '<div style="text-align:right;"><b>Código:</b> ' + esc(ctx.codigo_cenario || ctx.id) + ' (v' + esc(ctx.versao || 1) + ')<br><b>Status do Cenário:</b> ' + esc(ctx.status_cenario || 'RASCUNHO') + '<br><b>Emissão:</b> ' + esc(dataFmt + ' às ' + horaFmt) + '</div>' +
            '</div>' +
            '<div class="aviso"><b>Aviso Técnico:</b> Este dossiê é um instrumento auxiliar local de levantamento de campo. A ausência de apontamentos não comprova ausência de riscos. A pontuação de Probabilidade (P) e Severidade (S) deve ser atribuída e assinada manualmente na APR oficial.</div>' +
            '<div class="bloco">' +
                '<b>Cargo / Equipe:</b> ' + esc(ctx.cargo_equipe) + ' &nbsp;|&nbsp; <b>Frente:</b> ' + esc(ctx.frente_servico) + ' &nbsp;|&nbsp; <b>Fonte Documental:</b> ' + esc(ctx.fonte_procedimento || 'Pendente') + '<br>' +
                '<b>Ferramentas Observadas:</b> ' + esc((ctx.ferramentas_reais || []).join(', ') || 'Nenhuma informada') + '<br>' +
                '<b>EPIs Previstos:</b> ' + esc((ctx.epis_validados || []).join(', ') || 'A definir na APR') +
            '</div>' +
            '<h2>1. Roteiro das 5 Fases Operacionais</h2>' +
            '<table><thead><tr><th>Fase Operacional</th><th>Condição Observada / Resposta</th></tr></thead><tbody>' + fasesHtml + '</tbody></table>' +
            '<h2>2. Itens Aprovados pela Engenharia SST (' + aprovados.length + ')</h2>' +
            '<table><thead><tr><th style="width:24px;">Nº</th><th>Passo / Fase</th><th>Perigo / Fonte</th><th>Proposta de Controle</th><th>Fonte Consultada</th><th>Questão de Verificação</th><th style="width:80px;">Status</th></tr></thead><tbody>' + montarLinhasTabela(aprovados) + '</tbody></table>' +
            '<h2>3. Rascunhos e Pendências Não Homologados (' + pendentes.length + ')</h2>' +
            '<table><thead><tr><th style="width:24px;">Nº</th><th>Passo / Fase</th><th>Hipótese de Perigo</th><th>Proposta em Revisão</th><th>Fonte Consultada</th><th>Pergunta Pendente</th><th style="width:80px;">Status</th></tr></thead><tbody>' + montarLinhasTabela(pendentes) + '</tbody></table>' +
            '</body></html>';

        if (typeof window.abrirDocumentoHtmlParaImpressao === 'function') {
            window.abrirDocumentoHtmlParaImpressao(html, titulo);
        }
    }

    // =========================================================================
    // 10. RENDERIZAÇÃO DA INTERFACE
    // =========================================================================
    function renderIaAprendizadoPanel() {
        garantirEstadoSessao();
        var container = document.getElementById('page-ia_aprendizado');
        if (!container) return;

        var papel = obterPapelUsuarioIa();
        if (papel === 'sem_acesso') {
            container.innerHTML = '<div class="db-chart-card" style="padding:20px; color:var(--danger); font-weight:700;">🚫 Você não possui permissão para acessar este módulo.</div>';
            return;
        }

        var ctxAtual = buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0] || null;
        var consumo = calcularConsumoBytesEstado();
        var qtdRascunhos = estadoModulo.sugestoesFila.filter(function (s) { return s.status === 'RASCUNHO' || s.status === 'AJUSTADO'; }).length;
        var qtdAprovadas = estadoModulo.sugestoesFila.filter(sugestaoTemRegraAtivaValida).length;
        var regrasAtivas = estadoModulo.regrasAprendidas.filter(function (r) { return r.ativo === true && r.status_regra === 'APROVADO'; });

        var html = '' +
            '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--primary, #2563eb);">' +
                '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">' +
                    '<div>' +
                        '<h2 style="margin:0 0 4px 0; font-size:17px; font-weight:800; color:var(--text);">🧠 Inteligência SST &amp; Aprendizado Contínuo — Apoio Técnico à APR</h2>' +
                        '<p style="margin:0; font-size:12px; color:var(--text-light); max-width:920px; line-height:1.45;">' +
                            'Roteiro estruturado de verificação das 5 fases operacionais, biblioteca de exemplos e regras validadas localmente. <b>Limites declarados:</b> armazenamento local por conta no navegador (sem compartilhamento automático entre dispositivos/contas); motor local executa busca textual por palavras-chave/sinônimos; pontuação P×S permanece manual na APR.' +
                        '</p>' +
                    '</div>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<button type="button" class="db-clear-btn" onclick="if(typeof window.abrirApresentacoesDaContextoIaUI===\'function\'){window.abrirApresentacoesDaContextoIaUI();}else if(typeof window.showDbPage===\'function\'){window.showDbPage(\'apresentacoes_sst\');}" style="font-weight:700;">📽️ Apresentações SST</button>' +
                        '<button type="button" class="db-clear-btn" onclick="window.imprimirDossieIaAprendizado()" style="font-weight:700;">🖨️ Imprimir Dossiê Operacional</button>' +
                    '</div>' +
                '</div>' +

                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(195px, 1fr)); gap:10px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); font-size:11.5px;">' +
                    '<div style="padding:8px 10px; border-radius:8px; background:var(--bg); border:1px solid var(--border);">' +
                        '<span style="color:var(--text-light); display:block;">📌 Persistência e Papel Atual</span>' +
                        '<b style="color:var(--text);">Rascunho Local neste Dispositivo • Papel: ' + esc(papel.toUpperCase()) + '</b>' +
                    '</div>' +
                    '<div style="padding:8px 10px; border-radius:8px; background:var(--bg); border:1px solid var(--border);">' +
                        '<span style="color:var(--text-light); display:block;">📊 Consumo Local (UTF-8)</span>' +
                        '<b style="color:var(--primary);">' + esc(consumo.kb + ' KB / ' + consumo.limiteKb + ' KB') + ' (' + estadoModulo.contextos.length + '/' + LIMITE_MAX_CONTEXTOS + ' cenários)</b>' +
                    '</div>' +
                    '<div style="padding:8px 10px; border-radius:8px; background:var(--bg); border:1px solid var(--border);">' +
                        '<span style="color:var(--text-light); display:block;">✅ Regras Aprovadas Ativas</span>' +
                        '<b style="color:var(--success, #10b981);">' + regrasAtivas.length + ' regra(s) ativa(s)</b>' +
                    '</div>' +
                    '<div style="padding:8px 10px; border-radius:8px; background:var(--bg); border:1px solid var(--border);">' +
                        '<span style="color:var(--text-light); display:block;">⏳ Fila de Revisão</span>' +
                        '<b style="color:var(--warning, #d97706);">' + qtdRascunhos + ' rascunho(s)</b> • <b style="color:var(--success, #10b981);">' + qtdAprovadas + ' apto(s) p/ APR</b>' +
                    '</div>' +
                '</div>' +

                '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">' +
                    '<button type="button" id="btnTabIa-exemplos" class="' + (estadoModulo.abaAtiva === 'exemplos' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaIaAprendizado(\'exemplos\')" style="font-weight:700;">1️⃣ Cenários &amp; Regras da Engenharia (' + estadoModulo.contextos.length + ')</button>' +
                    '<button type="button" id="btnTabIa-analise" class="' + (estadoModulo.abaAtiva === 'analise' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaIaAprendizado(\'analise\')" style="font-weight:700;">2️⃣ Verificação de Lacunas &amp; Pacote Externo LLM</button>' +
                    '<button type="button" id="btnTabIa-fila" class="' + (estadoModulo.abaAtiva === 'fila' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaIaAprendizado(\'fila\')" style="font-weight:700;">3️⃣ Fila de Validação &amp; Preparar APR (' + estadoModulo.sugestoesFila.length + ')</button>' +
                    '<button type="button" id="btnTabIa-mapa" class="' + (estadoModulo.abaAtiva === 'mapa' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.selecionarAbaIaAprendizado(\'mapa\')" style="font-weight:700;">🗺️ Mapa Mental SST (Adicional)</button>' +
                '</div>' +
            '</div>';

        if (estadoModulo.abaAtiva === 'exemplos') {
            html += renderizarAbaExemplos(ctxAtual, papel);
        } else if (estadoModulo.abaAtiva === 'analise') {
            html += renderizarAbaAnalise(ctxAtual, papel);
        } else if (estadoModulo.abaAtiva === 'mapa' && typeof window.renderizarAbaMapaMentalIa === 'function') {
            html += window.renderizarAbaMapaMentalIa(papel);
        } else {
            html += renderizarAbaFila(ctxAtual, papel);
        }

        container.innerHTML = html;
    }

    function renderizarAbaExemplos(ctxAtual, papel) {
        var podeEditar = papel === 'editor' || papel === 'validador';
        var ehValidador = papel === 'validador';

        var listaCards = estadoModulo.contextos.length > 0
            ? estadoModulo.contextos.map(function (c) {
                var sel = ctxAtual && c.id === ctxAtual.id;
                return '<div class="db-chart-card" style="padding:12px; border:2px solid ' + (sel ? 'var(--primary, #2563eb)' : 'var(--border)') + '; cursor:pointer;" onclick="window.selecionarContextoIaAprendizado(\'' + esc(c.id) + '\')">' +
                    '<div style="display:flex; justify-content:space-between; gap:8px;">' +
                        '<span style="font-size:10.5px; font-weight:700; color:var(--primary);">' + esc(c.codigo_cenario || c.id) + ' • v' + esc(c.versao || 1) + '</span>' +
                        '<span style="font-size:10.5px; font-weight:700; color:var(--warning, #d97706);">' + esc(c.status_cenario || 'RASCUNHO') + '</span>' +
                    '</div>' +
                    '<div style="font-size:13.5px; font-weight:800; color:var(--text); margin-top:4px;">' + esc(c.cargo_equipe) + '</div>' +
                    '<div style="font-size:11.5px; color:var(--text-light);">📍 ' + esc(c.frente_servico) + (c.ghe_codigo ? ' • GHE: ' + esc(c.ghe_codigo) : '') + '</div>' +
                    '<div style="font-size:11px; color:var(--text-light); margin-top:4px;">Fonte: ' + esc(c.fonte_procedimento || 'Pendente') + '</div>' +
                    '<div style="font-size:11px; color:var(--text-light); margin-top:3px;">🛠️ ' + ((c.ferramentas_reais || []).length) + ' ferramenta(s) • ⚠️ ' + ((c.perigos_observados || []).length) + ' perigo(s) • 🦺 ' + ((c.epis_validados || []).length) + ' EPI(s)</div>' +
                    (podeEditar ? (
                        '<div style="margin-top:8px; display:flex; gap:6px;">' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px; padding:4px 8px;" onclick="if(typeof event!==\'undefined\'&&event.stopPropagation)event.stopPropagation(); window.abrirModalNovoContextoIa(\'' + esc(c.id) + '\')">✏️ Editar Cenário</button>' +
                        '</div>'
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="padding:18px; border:1px dashed var(--border); border-radius:8px; text-align:center; color:var(--text-light); font-size:12px;">' +
                'Nenhum cenário cadastrado neste dispositivo. Crie um novo cenário abaixo, importe uma ficha leve (máx. 20 KB) ou carregue um rascunho de estudo opcional para edição.' +
              '</div>';

        var detalheCenarioHtml = '';
        if (ctxAtual) {
            var fasesRows = FASES_ROTEIRO_PERGUNTAS.map(function (f) {
                var descFase = (ctxAtual.fases_operacionais && ctxAtual.fases_operacionais[f.id]) || 'Pendente de preenchimento';
                return '<div style="font-size:11.5px; padding:4px 0; border-bottom:1px dashed var(--border);"><b>' + esc(f.label) + ':</b> ' + esc(descFase) + '</div>';
            }).join('');
            detalheCenarioHtml = '<div style="margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">' +
                    '<div style="font-size:12.5px; font-weight:800; color:var(--text);">🔎 Detalhes do Cenário Selecionado: ' + esc(ctxAtual.cargo_equipe) + ' (v' + esc(ctxAtual.versao || 1) + ')</div>' +
                    (podeEditar ? '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.abrirModalNovoContextoIa(\'' + esc(ctxAtual.id) + '\')">✏️ Editar Cenário Selecionado</button>' : '') +
                '</div>' +
                '<div style="font-size:11.5px; color:var(--text-light); line-height:1.45; margin-bottom:6px;">' +
                    '<b>GHE:</b> ' + esc(ctxAtual.ghe_codigo || 'Não vinculado') + ' &nbsp;|&nbsp; <b>Frente:</b> ' + esc(ctxAtual.frente_servico) + ' &nbsp;|&nbsp; <b>Fonte:</b> ' + esc(ctxAtual.fonte_procedimento || 'Pendente') + '<br>' +
                    '<b>Rotina Detalhada:</b> ' + esc(ctxAtual.rotina_detalhada || '-') + '<br>' +
                    '<b>Ferramentas Reais:</b> ' + esc((ctxAtual.ferramentas_reais || []).join(', ') || 'Nenhuma informada') + '<br>' +
                    '<b>Perigos Observados:</b> ' + esc((ctxAtual.perigos_observados || []).join(' | ') || 'Nenhum informado') + '<br>' +
                    '<b>EPIs Validados:</b> ' + esc((ctxAtual.epis_validados || []).join(', ') || 'A definir') +
                    (ctxAtual.regras_engenheiro ? '<br><b>Diretrizes da Engenharia SST:</b> ' + esc(ctxAtual.regras_engenheiro) : '') +
                '</div>' +
                '<div>' + fasesRows + '</div>' +
            '</div>';
        }

        var regrasHtml = estadoModulo.regrasAprendidas.length > 0
            ? estadoModulo.regrasAprendidas.map(function (r) {
                var ativa = r.ativo === true && r.status_regra === 'APROVADO';
                return '<div style="padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">' +
                    '<div style="flex:1; min-width:240px;">' +
                        '<div style="font-size:11px; font-weight:700; color:var(--primary);">[v' + esc(r.versao || 1) + ' • ' + esc(r.status_regra) + '] Gatilhos: ' + esc((r.gatilhos || []).join(', ')) + ' | Fonte: ' + esc(r.fonte_consultada || 'Pendente') + '</div>' +
                        '<div style="font-size:12.5px; font-weight:700; color:var(--text); margin-top:2px;">' + esc(r.passo_tarefa) + ' — Perigo: ' + esc(r.perigo_fonte) + '</div>' +
                        '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;"><b>Controle aprovado:</b> ' + esc(r.medidas_prevencao) + '</div>' +
                        (r.motivo_revogacao ? '<div style="font-size:11px; color:var(--danger); margin-top:2px;">Motivo da revogação: ' + esc(r.motivo_revogacao) + '</div>' : '') +
                    '</div>' +
                    (ehValidador && ativa ? '<button type="button" class="db-clear-btn" style="font-size:11px; color:var(--danger);" onclick="window.revogarRegraAprendidaUI(\'' + esc(r.id) + '\')">↺ Revogar Regra</button>' : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:12px; color:var(--text-light);">Nenhuma regra aprovada ainda. As regras aparecem aqui somente após aprovação formal pelo Validador Técnico na Aba 3.</div>';

        var ultimoBkpTexto = estadoModulo.ultimoBackupEm
            ? new Date(estadoModulo.ultimoBackupEm).toLocaleString('pt-BR')
            : 'Nenhum backup exportado neste dispositivo';
        var temDadosCaderno = estadoModulo.contextos.length > 0 || estadoModulo.regrasAprendidas.length > 0 || estadoModulo.sugestoesFila.length > 0;
        var previaBkp = estadoModulo.previaBackupRestauracao;
        var previaBkpHtml = '';
        if (previaBkp && previaBkp.resumo) {
            var rb = previaBkp.resumo;
            var conflitosHtml = '';
            if (Array.isArray(previaBkp.conflitosContexto) && previaBkp.conflitosContexto.length > 0) {
                var itensConflito = previaBkp.conflitosContexto.map(function (cf) {
                    return '<li><b>' + esc(cf.cargo_equipe) + '</b> (' + esc(cf.frente_servico) + ') — campos alterados: <code>' + esc(cf.camposDiferentes.join(', ')) + '</code></li>';
                }).join('');
                conflitosHtml = '<div style="margin-top:8px; padding:8px 10px; border:1px solid var(--warning, #d97706); border-radius:6px; background:var(--bg);">' +
                    '<div style="font-size:11.5px; font-weight:800; color:var(--warning, #d97706); margin-bottom:4px;">⚠️ ' + previaBkp.conflitosContexto.length + ' cenário(s) com mesma identidade e conteúdo diferente:</div>' +
                    '<ul style="margin:0 0 6px 16px; padding:0; font-size:11px; color:var(--text);">' + itensConflito + '</ul>' +
                    '<label style="font-size:11.5px; font-weight:700; display:block; margin-bottom:4px;">Ao mesclar, escolha explicitamente o que fazer com os cenários em conflito:</label>' +
                    '<select id="selectPoliticaConflitoBackupIa" style="width:100%; max-width:460px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; font-size:12px; background:var(--card); color:var(--text);">' +
                        '<option value="">— Selecione uma ação para os conflitos antes de mesclar —</option>' +
                        '<option value="manter_existente">Conservar o cenário já salvo neste navegador (ignorar alteração do arquivo)</option>' +
                        '<option value="restaurar_copia">Restaurar o do arquivo como cópia separada "(Cópia Backup)"</option>' +
                        '<option value="substituir_versao">Substituir o cenário existente pela versão do arquivo</option>' +
                    '</select>' +
                '</div>';
            }
            var alertasCapacidadeHtml = '';
            if (rb.excedenteContextosMesclar > 0 || rb.excedenteFilaMesclar > 0) {
                alertasCapacidadeHtml = '<div style="margin-top:6px; padding:6px 8px; border-radius:6px; border:1px solid var(--danger); font-size:11px; color:var(--danger); font-weight:700;">' +
                    '🚫 Capacidade no modo Mesclar: ' +
                    (rb.excedenteContextosMesclar > 0 ? (rb.excedenteContextosMesclar + ' cenário(s) excederiam o limite de ' + LIMITE_MAX_CONTEXTOS + '. ') : '') +
                    (rb.excedenteFilaMesclar > 0 ? (rb.excedenteFilaMesclar + ' item(ns) excederiam o limite de ' + LIMITE_MAX_SUGESTOES + ' na fila. ') : '') +
                    'A mesclagem será bloqueada sem descartar dados silenciosamente até liberar espaço ou optar por Substituir.' +
                '</div>';
            }
            previaBkpHtml = '<div id="boxPreviaBackupIa" style="margin-top:10px; padding:10px 12px; border:1px solid var(--primary); border-radius:8px; background:var(--card);">' +
                '<div style="font-weight:800; font-size:12.5px; color:var(--primary); margin-bottom:4px;">🔎 Prévia do Backup Validado (gerado em: ' + esc(previaBkp.geradoEm) + ')</div>' +
                '<div style="font-size:11.5px; color:var(--text); line-height:1.55;">' +
                    '• <b>Cenários válidos no arquivo:</b> ' + rb.totalContextos + ' (' + rb.contextosNovos + ' novo(s), ' + rb.contextosIdenticos + ' idêntico(s), ' + rb.conflitosConteudo + ' com conflito de conteúdo)<br>' +
                    '• <b>Regras ativas no arquivo:</b> ' + rb.totalRegras + ' &nbsp;|&nbsp; <b>Itens ativos da fila:</b> ' + rb.totalFila + ' &nbsp;|&nbsp; <b>Total p/ revalidação na Aba 3:</b> ' + rb.totalItensRevalidacao + ' (' + rb.filaDuplicados + ' duplicata(s) integral(is) já na fila atual)<br>' +
                    '• <b>Efetivamente restauráveis:</b> ' + rb.efetivamenteRestauraveisMesclar + ' no modo Mesclar | ' + rb.efetivamenteRestauraveisSubstituir + ' no modo Substituir' +
                    (rb.itensDuplicadosNoArquivo > 0 ? '<br>• <b>Duplicatas integrais unificadas dentro do arquivo:</b> ' + rb.itensDuplicadosNoArquivo + ' (conteúdo técnico idêntico)' : '') +
                    (rb.itensMesmoPassoPerigoConteudoDiferente > 0 ? '<br>• <b>Itens com mesma etapa/perigo e conteúdo técnico diferente:</b> ' + rb.itensMesmoPassoPerigoConteudoDiferente + ' (serão preservados separadamente na Aba 3, sem sobrescrever nem fundir)' : '') +
                    (rb.itensOrfaos > 0 ? '<br>• <b>Itens sem cenário correspondente (órfãos):</b> ' + rb.itensOrfaos + ' (entrarão na Aba 3 sem vínculo de cenário até revisão)' : '') +
                    (rb.ignoradosPorStatus > 0 ? '<br>• <b>Ignorados por status (revogados/descartados no arquivo):</b> ' + rb.ignoradosPorStatus : '') + '<br>' +
                    '<span style="color:var(--warning, #d97706); font-weight:700;">⚠️ Governança SST: nenhum item restaurado de arquivo externo entra auto-aprovado. Regras e itens restaurados vão para a Aba 3 como rascunhos aguardando sua confirmação explícita.</span>' +
                '</div>' +
                conflitosHtml +
                alertasCapacidadeHtml +
                '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarRestauracaoBackupIaUI(\'mesclar\')">🔀 Mesclar com Caderno Atual (Recomendado)</button>' +
                    '<button type="button" class="db-clear-btn" style="color:var(--danger);" onclick="window.confirmarRestauracaoBackupIaUI(\'substituir\')">♻️ Substituir Caderno Atual (Baixa Cópia de Segurança Antes)</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarPreviaBackupIaUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        return '' +
            '<div class="db-chart-card">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">' +
                    '<div class="db-chart-title" style="margin:0;">📂 Cenários Operacionais &amp; Roteiro das 5 Fases</div>' +
                    (podeEditar ? (
                        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                            '<button type="button" class="db-apply-btn" onclick="window.abrirModalNovoContextoIa()">➕ Novo Cenário</button>' +
                            '<button type="button" class="db-clear-btn" onclick="window.abrirImportadorExemploIa()">📄 Importar Ficha Leve (máx. 20 KB)</button>' +
                            '<button type="button" class="db-clear-btn" onclick="window.carregarRascunhoEstudoUI()">📋 Carregar Rascunho de Estudo (Não Aprovado)</button>' +
                        '</div>'
                    ) : '') +
                '</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">' + listaCards + '</div>' +
                detalheCenarioHtml +
                '<div id="boxModalContextoIa" style="display:none; margin-top:14px; padding:14px; border:1px solid var(--primary); border-radius:10px; background:var(--bg);"></div>' +
                '<div id="boxImportadorExemploIa" style="display:none; margin-top:14px; padding:14px; border:1px solid var(--border); border-radius:10px; background:var(--bg);">' +
                    '<div style="font-weight:700; font-size:13px; margin-bottom:4px;">📄 Importar Ficha de Exemplo (.txt / .md / .json — Teto: 20 KB UTF-8)</div>' +
                    '<input type="file" id="inputArquivoExemploIa" accept=".txt,.md,.json" onchange="window.lerArquivoExemploLocalIa(this)" style="margin-bottom:8px; font-size:12px;">' +
                    '<textarea id="textareaImportarExemploIa" rows="4" placeholder="Cole texto ou JSON (máx. 20 KB, sem URLs/scripts)..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:12px; background:var(--card); color:var(--text);"></textarea>' +
                    '<div style="display:flex; gap:8px; margin-top:8px;">' +
                        '<button type="button" class="db-apply-btn" onclick="window.confirmarImportacaoExemploIa()">💾 Importar como Rascunho</button>' +
                        '<button type="button" class="db-clear-btn" onclick="document.getElementById(\'boxImportadorExemploIa\').style.display=\'none\'">Cancelar</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="db-chart-card" style="margin-top:14px;">' +
                '<div class="db-chart-title">🧠 Biblioteca de Regras Validadas pela Engenharia (' + estadoModulo.regrasAprendidas.length + ')</div>' +
                '<div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">' + regrasHtml + '</div>' +
            '</div>' +
            '<div class="db-chart-card" style="margin-top:14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div>' +
                        '<div class="db-chart-title" style="margin:0;">💾 Backup e Restauração do Caderno Local</div>' +
                        '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">' +
                            '<b>Último backup:</b> ' + esc(ultimoBkpTexto) +
                            (estadoModulo.alteracoesAposBackup && temDadosCaderno ? ' &nbsp;<span style="color:var(--warning, #d97706); font-weight:700;">⚠️ Há alterações posteriores ao último backup</span>' : '') +
                        '</div>' +
                        '<div style="font-size:11px; color:var(--text-light); margin-top:2px;">Guarde uma cópia (.json) no computador para levar para outro dispositivo ou proteger contra limpeza do navegador.</div>' +
                    '</div>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<button type="button" class="db-clear-btn" onclick="window.exportarBackupCadernoIaUI()">💾 Exportar Backup (.json)</button>' +
                        (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.alternarBoxBackupIaUI()">📂 Restaurar Backup (.json)</button>' : '') +
                    '</div>' +
                '</div>' +
                '<div id="boxRestaurarBackupIa" style="display:' + (previaBkp ? 'block' : 'none') + '; margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                    '<div style="font-size:12px; font-weight:700; margin-bottom:6px;">Selecione o arquivo de backup (.json) ou cole o conteúdo para pré-visualizar antes de restaurar:</div>' +
                    '<input type="file" id="inputArquivoBackupIa" accept=".json" onchange="window.lerArquivoBackupLocalIa(this)" style="margin-bottom:8px; font-size:12px;">' +
                    '<textarea id="textareaBackupIa" rows="3" placeholder="Conteúdo do arquivo de backup (.json)..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:11.5px; font-family:monospace; background:var(--card); color:var(--text);">' + esc(previaBkp ? previaBkp.textoOriginal : '') + '</textarea>' +
                    '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">' +
                        '<button type="button" class="db-apply-btn" onclick="window.preVisualizarBackupIaUI()">🔎 Pré-visualizar Backup</button>' +
                        '<button type="button" class="db-clear-btn" onclick="window.cancelarPreviaBackupIaUI()">Cancelar</button>' +
                    '</div>' +
                    previaBkpHtml +
                '</div>' +
            '</div>';
    }

    function renderizarAbaAnalise(ctxAtual, papel) {
        var podeEditar = papel === 'editor' || papel === 'validador';
        var promptRag = gerarPacotePromptRag({ contexto: ctxAtual, textoLivre: estadoModulo.textoLivreAnalise });
        var diag = estadoModulo.ultimoDiagnostico;
        var listaAprs = Array.isArray(window.allAprRegistros) ? window.allAprRegistros : [];

        // Banner de Cenário Ativo (estado vazio ou selecionado)
        var bannerCenarioHtml = '';
        if (ctxAtual) {
            var opcoesCtx = estadoModulo.contextos.length > 1
                ? '<select id="selectCenarioAtivoAba2" onchange="window.selecionarContextoIaAprendizado(this.value)" style="padding:5px 8px; border:1px solid var(--border); border-radius:6px; font-size:12px; background:var(--card); color:var(--text);">' +
                    estadoModulo.contextos.map(function (c) {
                        return '<option value="' + esc(c.id) + '"' + (c.id === ctxAtual.id ? ' selected' : '') + '>' + esc(c.cargo_equipe + ' — ' + c.frente_servico) + '</option>';
                    }).join('') +
                  '</select>'
                : '';
            bannerCenarioHtml = '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--success, #10b981); padding:10px 14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div style="font-size:12px;">' +
                        '<b>📂 Cenário selecionado:</b> ' + esc(ctxAtual.cargo_equipe) + ' (' + esc(ctxAtual.frente_servico) + ') • v' + esc(ctxAtual.versao || 1) +
                    '</div>' +
                    '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
                        opcoesCtx +
                        (podeEditar ? '<button type="button" class="db-clear-btn" style="font-size:11.5px;" onclick="window.irParaEditarCenarioAtualIaUI()">✏️ Editar Cenário na Aba 1</button>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        } else {
            bannerCenarioHtml = '<div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--warning, #d97706); padding:12px 14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                    '<div style="flex:1; min-width:240px; font-size:12px; line-height:1.45;">' +
                        '<b>⚠️ Nenhum cenário cadastrado neste navegador (0 cenários na Aba 1).</b><br>' +
                        '<span style="color:var(--text-light);">A verificação local só consulta seus cenários cadastrados e suas regras já aprovadas. Para começar agora, cadastre um cenário na Aba 1, inicie um rascunho de cenário com a descrição abaixo, ou use o <b>Modo 2</b> para consultar ChatGPT / Gemini / Claude.</span>' +
                    '</div>' +
                    (podeEditar ? '<button type="button" class="db-apply-btn" onclick="window.irParaNovoCenarioIaUI()">➕ Novo Cenário (Aba 1)</button>' : '') +
                '</div>' +
            '</div>';
        }

        // Opções de APRs cadastradas para comparação
        var opcoesAprHtml = '<option value="">-- Nenhuma APR selecionada (verificar apenas pelo cenário e regras) --</option>' +
            listaAprs.map(function (a) {
                var rotulo = 'APR Nº ' + (a.id || '?') + ' — ' + (a.titulo || a.descricao_atividade || 'Sem título') + (a.data_emissao ? ' (Emissão: ' + a.data_emissao + ')' : '');
                var sel = String(estadoModulo.aprSelecionadaId || '') === String(a.id) ? ' selected' : '';
                return '<option value="' + esc(a.id) + '"' + sel + '>' + esc(rotulo) + '</option>';
            }).join('');

        // Diagnóstico detalhado em 4 blocos (preservando APR original)
        var diagHtml = '';
        if (diag) {
            var blocoAusentes = (diag.perigosPossivelmenteAusentes && diag.perigosPossivelmenteAusentes.length > 0)
                ? '<ul style="margin:4px 0 0 18px; padding:0; font-size:11.5px;">' + diag.perigosPossivelmenteAusentes.map(function (item) {
                    return '<li><b>' + esc(item.perigo_fonte) + '</b> — ' + esc(item.passo_tarefa) + ' <span style="color:var(--text-light);">(' + esc(item.origem) + ')</span></li>';
                }).join('') + '</ul>'
                : '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">Nenhum item pendente apontado nesta verificação.</div>';

            var blocoMedidas = (diag.alertasMedidasFracas && diag.alertasMedidasFracas.length > 0)
                ? '<ul style="margin:4px 0 0 18px; padding:0; font-size:11.5px;">' + diag.alertasMedidasFracas.map(function (al) {
                    return '<li><b>Linha ' + esc(al.linha) + ' (' + esc(al.passo) + '):</b> ' + esc(al.motivo) + '</li>';
                }).join('') + '</ul>'
                : '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">' + (diag.aprAuditadaId ? 'Nenhuma medida genérica ou P×S incompleto detectado na APR selecionada.' : 'Selecione uma APR cadastrada acima para revisar medidas genéricas e P×S incompletos.') + '</div>';

            var blocoConfirmacao = diag.temCenario
                ? (diag.fasesSemInformacao && diag.fasesSemInformacao.length > 0
                    ? '<div style="font-size:11.5px; color:var(--warning, #d97706); margin-top:2px;">Fases ainda sem resposta no cenário selecionado: ' + esc(diag.fasesSemInformacao.join(' | ')) + '</div>'
                    : '<div style="font-size:11.5px; color:var(--success, #10b981); margin-top:2px;">Todas as 5 fases operacionais do cenário selecionado estão preenchidas.</div>')
                : '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">Nenhum cenário selecionado — cadastre ou inicie um rascunho de cenário para acompanhar as 5 fases operacionais.</div>';

            var blocoContemplados = (diag.itensJaContemplados && diag.itensJaContemplados.length > 0)
                ? '<ul style="margin:4px 0 0 18px; padding:0; font-size:11.5px;">' + diag.itensJaContemplados.map(function (it) {
                    return '<li><b>' + esc(it.perigo_fonte) + '</b> <span style="color:var(--text-light);">(' + esc(it.origem) + ')</span></li>';
                }).join('') + '</ul>'
                : '<div style="font-size:11.5px; color:var(--text-light); margin-top:2px;">' + (diag.aprAuditadaId ? 'Nenhum item do cenário/regras coincidiu por texto com a APR selecionada.' : 'Selecione uma APR acima para conferir quais itens já constam nela.') + '</div>';

            diagHtml = '<div class="db-chart-card" style="margin-top:14px; border-left:4px solid var(--primary);">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">' +
                    '<div class="db-chart-title" style="margin:0;">📋 Resultado da Verificação Local' + (diag.aprAuditadaId ? ' — Comparado com APR Nº ' + esc(diag.aprAuditadaId) + (diag.aprAuditadaTitulo ? ' (' + esc(diag.aprAuditadaTitulo) + ')' : '') : '') + '</div>' +
                    (diag.novosNaFila > 0
                        ? '<button type="button" class="db-apply-btn" onclick="window.selecionarAbaIaAprendizado(\'fila\')">➡️ Ir para a Aba 3 revisar e aprovar (' + diag.novosNaFila + ' novo(s))</button>'
                        : '') +
                '</div>' +
                '<div style="font-size:11.5px; color:var(--text-light); margin-bottom:8px;">' + esc(diag.avisoEscopo) + (diag.aprAuditadaId ? ' A APR original permanece intacta — qualquer alteração só entra após sua revisão na Aba 3.' : '') + '</div>' +
                (diag.totalLacunas === 0
                    ? '<div style="padding:10px 12px; border-radius:8px; background:var(--bg); border:1px solid var(--border); font-size:12px; line-height:1.45; margin-bottom:10px;"><b>Resultado: 0 rascunhos gerados.</b><br>' + esc(diag.motivoZero) + '</div>'
                    : '<div style="font-size:12px; margin-bottom:10px;"><b>Propostas encontradas:</b> ' + diag.totalLacunas + ' (' + diag.novosNaFila + ' nova(s) adicionada(s) na Aba 3)</div>') +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">' +
                    '<div style="padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:11.5px; font-weight:800; color:var(--primary);">1. Perigos possivelmente ausentes</div>' +
                        blocoAusentes +
                    '</div>' +
                    '<div style="padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:11.5px; font-weight:800; color:var(--warning, #d97706);">2. Medidas genéricas ou P×S incompleto na APR</div>' +
                        blocoMedidas +
                    '</div>' +
                    '<div style="padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:11.5px; font-weight:800; color:var(--text);">3. Informações para confirmar em campo</div>' +
                        blocoConfirmacao +
                    '</div>' +
                    '<div style="padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:11.5px; font-weight:800; color:var(--success, #10b981);">4. Itens já contemplados na APR</div>' +
                        blocoContemplados +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        // Prévia obrigatória da resposta colada no Modo 2
        var previaImp = estadoModulo.previaImportacaoIa;
        var previaImpHtml = '';
        if (previaImp && Array.isArray(previaImp.itens) && previaImp.itens.length > 0) {
            var linhasPrevia = previaImp.itens.map(function (it, idx) {
                return '<div style="padding:6px 8px; border-bottom:1px dashed var(--border); font-size:11.5px; line-height:1.4;">' +
                    '<b>' + (idx + 1) + '. ' + esc(it.passo_tarefa) + '</b> — <b>Perigo:</b> ' + esc(it.perigo_fonte) + '<br>' +
                    '<span style="color:var(--text-light);">Controle: ' + esc(it.medidas_prevencao) + ' | Fonte: ' + esc(it.fonte_consultada) + '</span>' +
                '</div>';
            }).join('');
            previaImpHtml = '<div id="boxPreviaImportacaoIa" style="margin-top:10px; padding:10px 12px; border:1px solid var(--primary); border-radius:8px; background:var(--bg);">' +
                '<div style="font-weight:800; font-size:12.5px; color:var(--primary); margin-bottom:4px;">🔎 Prévia dos Riscos Reconhecidos (' + previaImp.itens.length + ' item(ns)) — Confira antes de enviar para a Aba 3</div>' +
                '<div style="font-size:11.5px; color:var(--text-light); margin-bottom:6px;">' +
                    'Todos entrarão como <b>RASCUNHO</b> e com <b>P×S em branco</b> para sua revisão e aprovação.' +
                    (previaImp.notasIgnoradas > 0 ? ' <b style="color:var(--warning, #d97706);">(' + previaImp.notasIgnoradas + ' nota(s) de P/S enviada(s) pela IA foram ignoradas automaticamente.)</b>' : '') +
                '</div>' +
                '<div style="max-height:220px; overflow-y:auto; background:var(--card); border:1px solid var(--border); border-radius:6px;">' + linhasPrevia + '</div>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarImportacaoPreviaIaUI()">✅ Confirmar e Enviar para a Aba 3</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarPreviaImportacaoIaUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        return '' +
            bannerCenarioHtml +
            '<div class="db-chart-card">' +
                '<div class="db-chart-title">🔍 Modo 1: Verificação Local (Seus Cenários + Regras Aprovadas + Comparação com APR)</div>' +
                '<div style="margin-top:8px;">' +
                    '<label for="inputTextoExtraAnaliseIa" style="font-size:11.5px; font-weight:700; display:block; margin-bottom:4px;">Descreva a atividade, ferramentas ou condição da frente de serviço (este texto também entra automaticamente no pedido do Modo 2):</label>' +
                    '<input type="text" id="inputTextoExtraAnaliseIa" value="' + esc(estadoModulo.textoLivreAnalise || '') + '" oninput="window.atualizarTextoLivreAnaliseIaUI(this.value)" placeholder="Ex.: Manutenção de canaleta de drenagem e bueiro com betoneira, cimento e trabalho próximo à borda de vala..." style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; background:var(--card); color:var(--text);">' +
                '</div>' +
                '<div style="margin-top:8px;">' +
                    '<label for="selectAprComparacaoIa" style="font-size:11.5px; font-weight:700; display:block; margin-bottom:4px;">Comparar com uma APR já cadastrada (opcional — preserva a APR original):</label>' +
                    '<select id="selectAprComparacaoIa" onchange="window.selecionarAprAuditoriaIa(this.value)" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; background:var(--card); color:var(--text); font-size:12px;">' +
                        opcoesAprHtml +
                    '</select>' +
                '</div>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.executarVarreduraIaUI()">🔍 Executar Verificação Local</button>' +
                    (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.criarRascunhoCenarioDaDescricaoUI()">📋 Iniciar Rascunho de Cenário com esta Descrição</button>' : '') +
                '</div>' +
            '</div>' +
            diagHtml +
            '<div class="db-chart-card" style="margin-top:14px;">' +
                '<div class="db-chart-title">🤖 Modo 2: Consultar sua IA Externa (ChatGPT, Gemini ou Claude) em 3 Passos</div>' +
                '<div style="font-size:11.5px; color:var(--text-light); margin:4px 0 10px 0;">' +
                    'Este fluxo evita cobrança de API dentro do painel, mas utiliza armazenamento local do navegador e os limites/cotas da sua conta externa.' +
                '</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:14px;">' +
                    '<div style="padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:12px; font-weight:800; color:var(--primary); margin-bottom:4px;">Passo 1 — Copie o pedido pronto (cenário + descrição + APR)</div>' +
                        '<div style="font-size:11px; color:var(--warning, #d97706); margin-bottom:6px;">⚠️ Filtro automático de CPF/CNPJ/e-mail/telefone aplicado. Revise o texto para garantir que não há nomes de pessoas antes de colar na IA externa.</div>' +
                        '<textarea id="textareaPromptRagGerado" rows="7" readonly style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:11px; font-family:monospace; background:var(--card); color:var(--text);">' + esc(promptRag) + '</textarea>' +
                        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px;">' +
                            '<button type="button" class="db-apply-btn" onclick="window.copiarPacotePromptIaUI()">📋 Copiar Pedido para IA</button>' +
                            '<span id="statusCopiaPromptIa" style="font-size:11.5px; font-weight:700; color:var(--success, #10b981);"></span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">' +
                        '<div style="font-size:12px; font-weight:800; color:var(--primary); margin-bottom:4px;">Passo 2 e 3 — Cole no ChatGPT / Gemini / Claude e traga a resposta de volta</div>' +
                        '<div style="font-size:11px; color:var(--text-light); margin-bottom:6px;">Depois que a IA responder, copie a resposta (mesmo com texto antes ou depois da lista) e cole abaixo. Notas de P/S eventualmente enviadas pela IA serão ignoradas automaticamente.</div>' +
                        '<textarea id="textareaRespostaIaImportar" rows="6" placeholder="Cole aqui a resposta da IA externa (máx. 20 KB / até 20 riscos)..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:11.5px; font-family:monospace; background:var(--card); color:var(--text);"></textarea>' +
                        (podeEditar ? (
                            '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">' +
                                '<button type="button" class="db-apply-btn" onclick="window.preVisualizarRespostaIaUI()" style="flex:1;">🔎 Pré-visualizar Resposta da IA</button>' +
                            '</div>'
                        ) : '') +
                    '</div>' +
                '</div>' +
                previaImpHtml +
            '</div>';
    }

    function renderizarAbaFila(ctxAtual, papel) {
        var podeEditar = papel === 'editor' || papel === 'validador';
        var ehValidador = papel === 'validador';

        var lista = estadoModulo.sugestoesFila.filter(function (s) {
            if (ctxAtual && s.contexto_id && s.contexto_id !== ctxAtual.id) return false;
            if (estadoModulo.filtroFilaStatus === 'TODOS') return true;
            return s.status === estadoModulo.filtroFilaStatus;
        });

        var cards = lista.length > 0
            ? lista.map(function (s) {
                var a = s.acao_proposta || {};
                var versaoAtual = Number(s.versao || 1);
                var editavel = podeEditar && s.status !== 'REVOGADO' && s.status !== 'DESCARTADO';
                return '<div class="db-chart-card" style="margin-bottom:10px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">' +
                        '<div style="flex:1; min-width:250px;">' +
                            '<div style="font-size:11px; font-weight:700; color:var(--primary);">Status: ' + esc(s.status) + (s.status_transferencia ? ' (' + esc(s.status_transferencia) + ')' : '') + ' • Versão: v' + esc(versaoAtual) + ' • Avaliação P×S: Pendente na APR</div>' +
                            '<div style="font-size:13.5px; font-weight:800; color:var(--text); margin-top:2px;">' + esc(s.titulo_insight) + '</div>' +
                            '<div style="font-size:11.5px; color:var(--text-light); margin-top:4px; line-height:1.45;">' +
                                '<b>Etapa:</b> ' + esc(a.passo_tarefa) + ' | <b>Perigo:</b> ' + esc(a.perigo_fonte) + '<br>' +
                                '<b>Evento de Risco:</b> ' + esc(a.evento_risco || '-') + ' | <b>Danos Prováveis:</b> ' + esc(a.danos_provaveis || '-') + '<br>' +
                                '<b>Proposta de Controle:</b> ' + esc(a.medidas_prevencao) + '<br>' +
                                '<b>EPIs Sugeridos:</b> ' + esc((a.epis_sugeridos || []).join(', ') || '-') + ' | <b>Gatilhos:</b> ' + esc((a.gatilhos || []).join(', ') || '-') + ' | <b>Responsável:</b> ' + esc(a.responsavel || 'Definir na APR') + '<br>' +
                                '<b>Fonte Consultada:</b> ' + esc(a.fonte_consultada || 'Pendente') + ' | <b>Evidência:</b> ' + esc(a.evidencia_campo || '-') + '<br>' +
                                '<b>Hipótese de Risco:</b> ' + esc(a.hipotese_risco || '-') + ' | <b>Pergunta Pendente:</b> ' + esc(a.pergunta_pendente || '-') +
                            '</div>' +
                        '</div>' +
                        '<div style="display:flex; flex-direction:column; gap:6px; min-width:185px;">' +
                            (editavel ? '<button type="button" class="db-clear-btn" onclick="window.abrirAjusteSugestaoIaUI(\'' + esc(s.id) + '\')" style="font-size:11.5px;">✏️ Ajustar Sugestão</button>' : '') +
                            (ehValidador && s.status !== 'REVOGADO' && s.status !== 'DESCARTADO' ? '<button type="button" class="db-apply-btn" onclick="window.aprovarSugestaoIaUI(\'' + esc(s.id) + '\',' + versaoAtual + ')" style="font-size:11.5px;">✅ Aprovar Regra (Validador)</button>' : '') +
                            (editavel ? '<button type="button" class="db-clear-btn" onclick="window.descartarSugestaoIaUI(\'' + esc(s.id) + '\')" style="font-size:11.5px; color:var(--danger);">🗑️ Descartar</button>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div id="boxAjusteSugestao_' + esc(s.id) + '" style="display:none; margin-top:10px; padding:12px; border:1px solid var(--primary); border-radius:8px; background:var(--bg);"></div>' +
                '</div>';
            }).join('')
            : '<div class="db-chart-card" style="text-align:center; padding:20px; color:var(--text-light);">Nenhum item para este cenário/filtro.</div>';

        return '' +
            '<div class="db-chart-card" style="margin-bottom:14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                    '<div>' +
                        '<div class="db-chart-title" style="margin:0;">⚡ Preparar Linhas na APR (Somente Regras Ativas e Aprovadas do Cenário Atual)</div>' +
                        '<div style="font-size:11.5px; color:var(--text-light);">Preserva rascunhos/linhas parciais na APR, deduplica itens e aguarda salvamento da APR antes de registrar incorporação definitiva.</div>' +
                    '</div>' +
                    (podeEditar ? (
                        '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                            '<button type="button" class="db-apply-btn" onclick="window.enviarRiscosAprovadosParaAprUI(\'acrescentar\')">➕ Acrescentar à APR Aberta (Preservar Rascunho)</button>' +
                            '<button type="button" class="db-clear-btn" onclick="window.enviarRiscosAprovadosParaAprUI(\'nova\')">📄 Preparar em Nova APR</button>' +
                        '</div>'
                    ) : '') +
                '</div>' +
            '</div>' +
            cards;
    }

    // Handlers de UI
    function selecionarAbaIaAprendizado(aba) {
        garantirEstadoSessao();
        estadoModulo.abaAtiva = aba;
        renderIaAprendizadoPanel();
    }
    function selecionarContextoIaAprendizado(id) {
        garantirEstadoSessao();
        estadoModulo.contextoSelecionadoId = id;
        renderIaAprendizadoPanel();
    }
    function selecionarAprAuditoriaIa(id) {
        garantirEstadoSessao();
        estadoModulo.aprSelecionadaId = String(id || '');
        if (estadoModulo.abaAtiva === 'analise') {
            renderIaAprendizadoPanel();
        }
    }
    function filtrarFilaIaAprendizado(status) {
        garantirEstadoSessao();
        estadoModulo.filtroFilaStatus = status;
        renderIaAprendizadoPanel();
    }

    function irParaNovoCenarioIaUI() {
        garantirEstadoSessao();
        estadoModulo.abaAtiva = 'exemplos';
        renderIaAprendizadoPanel();
        abrirModalNovoContextoIa();
    }

    function irParaEditarCenarioAtualIaUI() {
        garantirEstadoSessao();
        var atualId = estadoModulo.contextoSelecionadoId || (estadoModulo.contextos[0] ? estadoModulo.contextos[0].id : '');
        estadoModulo.abaAtiva = 'exemplos';
        renderIaAprendizadoPanel();
        if (atualId) abrirModalNovoContextoIa(atualId);
    }

    function atualizarTextoLivreAnaliseIaUI(valor) {
        garantirEstadoSessao();
        estadoModulo.textoLivreAnalise = String(valor || '');
        var ta = document.getElementById('textareaPromptRagGerado');
        if (ta) {
            var ctxAtual = buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0] || null;
            ta.value = gerarPacotePromptRag({ contexto: ctxAtual, textoLivre: estadoModulo.textoLivreAnalise });
        }
    }

    function criarRascunhoCenarioDaDescricaoUI() {
        try {
            garantirEstadoSessao();
            var elExtra = document.getElementById('inputTextoExtraAnaliseIa');
            var desc = String((elExtra ? elExtra.value : estadoModulo.textoLivreAnalise) || '').trim();
            if (!desc) {
                alert('Descreva primeiro a atividade ou condição da frente de serviço no campo acima.');
                return;
            }
            estadoModulo.textoLivreAnalise = desc;
            var tituloCurto = desc.split(/[\r\n.;]+/)[0].trim().slice(0, 75) || 'Rascunho de Atividade';
            salvarContextoOperacional({
                cargo_equipe: tituloCurto + ' (Rascunho)',
                frente_servico: 'A definir na revisão',
                fonte_procedimento: 'Rascunho iniciado pela descrição na Aba 2 — pendente de revisão',
                rotina_detalhada: desc,
                fases_operacionais: {},
                ferramentas_reais: [],
                perigos_observados: [],
                epis_validados: [],
                regras_engenheiro: ''
            });
            renderIaAprendizadoPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function copiarPacotePromptIaUI() {
        garantirEstadoSessao();
        var ta = document.getElementById('textareaPromptRagGerado');
        var texto = ta ? String(ta.value || '') : gerarPacotePromptRag({ textoLivre: estadoModulo.textoLivreAnalise });
        var st = document.getElementById('statusCopiaPromptIa');
        var msgSucesso = '✅ Pedido copiado! Confira se não há nomes/dados pessoais antes de colar no ChatGPT / Gemini / Claude.';
        var msgManual = '⚠️ Não foi possível copiar automaticamente neste navegador. Selecione o texto na caixa acima e use Ctrl+C.';
        function tentarFallbackExecCommand() {
            var ok = false;
            if (ta && typeof ta.select === 'function') {
                ta.select();
                try {
                    ok = typeof document.execCommand === 'function' && !!document.execCommand('copy');
                } catch (e) {
                    ok = false;
                }
            }
            if (st) st.textContent = ok ? msgSucesso : msgManual;
            return ok;
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(texto).then(function () {
                if (st) st.textContent = msgSucesso;
            }).catch(function () {
                tentarFallbackExecCommand();
            });
        } else {
            tentarFallbackExecCommand();
        }
        return texto;
    }

    function preVisualizarRespostaIaUI() {
        try {
            garantirEstadoSessao();
            var el = document.getElementById('textareaRespostaIaImportar');
            var texto = el ? el.value : '';
            estadoModulo.previaImportacaoIa = analisarRespostaIaParaPrevia(texto, estadoModulo.contextoSelecionadoId);
            renderIaAprendizadoPanel();
        } catch (err) {
            estadoModulo.previaImportacaoIa = null;
            alert(err.message);
        }
    }

    function confirmarImportacaoPreviaIaUI() {
        try {
            garantirEstadoSessao();
            var papelAtual = obterPapelUsuarioIa();
            if (papelAtual !== 'editor' && papelAtual !== 'validador') {
                estadoModulo.previaImportacaoIa = null;
                renderIaAprendizadoPanel();
                alert('Permissão negada: seu perfil atual não possui autorização para confirmar a importação.');
                return;
            }
            if (!estadoModulo.previaImportacaoIa) {
                alert('Pré-visualize a resposta da IA antes de confirmar.');
                return;
            }
            gravarItensPreviaNaFila(estadoModulo.previaImportacaoIa);
            estadoModulo.previaImportacaoIa = null;
            estadoModulo.abaAtiva = 'fila';
            renderIaAprendizadoPanel();
        } catch (err) {
            alert(err.message);
            renderIaAprendizadoPanel();
        }
    }

    function cancelarPreviaImportacaoIaUI() {
        garantirEstadoSessao();
        estadoModulo.previaImportacaoIa = null;
        renderIaAprendizadoPanel();
    }

    function baixarArquivoJsonLocal(nomeArquivo, conteudoJson) {
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
            } else if (typeof URL.revokeObjectURL === 'function') {
                try { URL.revokeObjectURL(url); } catch (e) { /* ignora */ }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function exportarBackupCadernoIaUI() {
        try {
            var bkp = gerarBackupCadernoLocal();
            var baixou = baixarArquivoJsonLocal(bkp.nomeArquivo, bkp.json);
            if (!baixou) {
                renderIaAprendizadoPanel();
                alert('Não foi possível iniciar o download do arquivo de backup neste navegador. O status de backup não foi atualizado.');
                return null;
            }
            registrarBackupExportadoLocal(bkp.geradoEm, bkp.totalContextos + ' cenário(s), ' + bkp.totalRegras + ' regra(s)');
            renderIaAprendizadoPanel();
            return Object.assign({}, bkp, { baixado: true });
        } catch (err) {
            alert(err.message);
            return null;
        }
    }

    function alternarBoxBackupIaUI() {
        var box = document.getElementById('boxRestaurarBackupIa');
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function lerArquivoBackupLocalIa(inputEl) {
        if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
        var file = inputEl.files[0];
        if (file.size > LIMITE_BYTES_BACKUP_ARQUIVO) {
            alert('Arquivo de backup excede o limite de ' + Math.round(LIMITE_BYTES_BACKUP_ARQUIVO / 1024) + ' KB.');
            inputEl.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            var ta = document.getElementById('textareaBackupIa');
            if (ta) ta.value = String(ev.target.result || '');
        };
        reader.readAsText(file, 'utf-8');
    }

    function preVisualizarBackupIaUI() {
        try {
            garantirEstadoSessao();
            var ta = document.getElementById('textareaBackupIa');
            estadoModulo.previaBackupRestauracao = analisarBackupCadernoLocal(ta ? ta.value : '');
            renderIaAprendizadoPanel();
        } catch (err) {
            estadoModulo.previaBackupRestauracao = null;
            renderIaAprendizadoPanel();
            alert(err.message);
        }
    }

    function confirmarRestauracaoBackupIaUI(modo) {
        try {
            garantirEstadoSessao();
            var papelAtual = obterPapelUsuarioIa();
            if (papelAtual !== 'editor' && papelAtual !== 'validador') {
                estadoModulo.previaBackupRestauracao = null;
                renderIaAprendizadoPanel();
                alert('Permissão negada: seu perfil atual não possui autorização para restaurar backup.');
                return;
            }
            if (!estadoModulo.previaBackupRestauracao) {
                alert('Pré-visualize o backup antes de restaurar.');
                return;
            }
            if (estadoModulo.previaBackupRestauracao.identidadeChave && estadoModulo.previaBackupRestauracao.identidadeChave !== estadoModulo.identidadeChave) {
                estadoModulo.previaBackupRestauracao = null;
                renderIaAprendizadoPanel();
                alert('A conta/sessão mudou desde a pré-visualização do backup. Gere uma nova prévia.');
                return;
            }

            var modoFinal = modo === 'substituir' ? 'substituir' : 'mesclar';
            var politicaConflito = '';

            if (modoFinal === 'mesclar' && Array.isArray(estadoModulo.previaBackupRestauracao.conflitosContexto) && estadoModulo.previaBackupRestauracao.conflitosContexto.length > 0) {
                var selConf = document.getElementById('selectPoliticaConflitoBackupIa');
                politicaConflito = selConf ? String(selConf.value || '').trim() : '';
                if (!politicaConflito) {
                    alert('Selecione explicitamente como tratar os cenários em conflito antes de mesclar.');
                    return;
                }
            }

            // Revalida integridade do backup ANTES de disparar cópia de segurança ou mutação
            var analiseAtual = analisarBackupCadernoLocal(estadoModulo.previaBackupRestauracao.textoOriginal);

            if (modoFinal === 'substituir') {
                var temDadosAtuais = estadoModulo.contextos.length > 0 || estadoModulo.regrasAprendidas.length > 0 || estadoModulo.sugestoesFila.length > 0;
                if (temDadosAtuais) {
                    // Cópia de segurança disparada ANTES da substituição; falha no download ou cancelamento aborta sem tocar no caderno!
                    var copiaSeg = gerarBackupCadernoLocal();
                    var nomeCopia = 'copia_seguranca_antes_substituir_' + copiaSeg.geradoEm.slice(0, 10) + '.json';
                    var baixouCopia = baixarArquivoJsonLocal(nomeCopia, copiaSeg.json);
                    if (!baixouCopia) {
                        alert('Substituição cancelada: não foi possível iniciar o download da cópia de segurança do caderno atual. Nenhum dado foi apagado.');
                        return;
                    }
                    var confirmouGuarda = typeof confirm === 'function'
                        ? confirm('A cópia de segurança do caderno atual (' + nomeCopia + ') foi enviada para download.\n\nO navegador não consegue verificar se o arquivo foi guardado no disco. Confirme que você recebeu a cópia e deseja substituir o caderno atual pelos ' + analiseAtual.resumo.totalContextos + ' cenário(s) e ' + analiseAtual.resumo.totalItensRevalidacao + ' item(ns) do backup?')
                        : true;
                    if (!confirmouGuarda) {
                        return;
                    }
                }
            }

            var res = aplicarRestauracaoBackupLocal(estadoModulo.previaBackupRestauracao.textoOriginal, modoFinal, {
                politicaConflito: politicaConflito
            });
            estadoModulo.previaBackupRestauracao = null;
            renderIaAprendizadoPanel();
            alert('✅ Restauração concluída (' + res.modo + '): ' +
                res.contextosAdicionados + ' cenário(s) novo(s), ' +
                res.contextosAtualizados + ' atualizado(s), ' +
                res.contextosMantidosExistentes + ' mantido(s) e ' +
                res.itensRevalidacaoAdicionados + ' item(ns) enviado(s) para revalidação na Aba 3.');
        } catch (err) {
            alert(err.message);
            renderIaAprendizadoPanel();
        }
    }

    function cancelarPreviaBackupIaUI() {
        garantirEstadoSessao();
        estadoModulo.previaBackupRestauracao = null;
        renderIaAprendizadoPanel();
    }

    function carregarRascunhoEstudoUI() {
        try { carregarRascunhoEstudoOpcional(); renderIaAprendizadoPanel(); } catch (err) { alert(err.message); }
    }

    function executarVarreduraIaUI() {
        garantirEstadoSessao();
        var elExtra = document.getElementById('inputTextoExtraAnaliseIa');
        var textoVal = elExtra ? elExtra.value : estadoModulo.textoLivreAnalise;
        estadoModulo.textoLivreAnalise = String(textoVal || '');
        executarVarreduraRiscosOcultos({ textoLivre: estadoModulo.textoLivreAnalise });
        renderIaAprendizadoPanel();
    }

    function importarRespostaIaUI() {
        try {
            garantirEstadoSessao();
            var el = document.getElementById('textareaRespostaIaImportar');
            importarRespostaIaParaFila(el ? el.value : '', estadoModulo.contextoSelecionadoId);
            estadoModulo.previaImportacaoIa = null;
            estadoModulo.abaAtiva = 'fila';
            renderIaAprendizadoPanel();
        } catch (err) { alert(err.message); }
    }

    function aprovarSugestaoIaUI(id, versaoEsperada) {
        try {
            var meta = versaoEsperada !== undefined ? { versaoEsperada: Number(versaoEsperada) } : {};
            aprovarSugestaoIa(id, meta);
            renderIaAprendizadoPanel();
        } catch (err) { alert(err.message); }
    }

    function descartarSugestaoIaUI(id) {
        try { descartarSugestaoIa(id, 'Descartado na revisão'); renderIaAprendizadoPanel(); } catch (err) { alert(err.message); }
    }

    function revogarRegraAprendidaUI(id) {
        try { revogarRegraAprendida(id, 'Revogada pelo Validador'); renderIaAprendizadoPanel(); } catch (err) { alert(err.message); }
    }

    function enviarRiscosAprovadosParaAprUI(modo) {
        try { enviarRiscosAprovadosParaApr(modo); } catch (err) { alert(err.message); }
    }

    function abrirAjusteSugestaoIaUI(id) {
        garantirEstadoSessao();
        var sug = estadoModulo.sugestoesFila.find(function (s) { return s.id === id; });
        if (!sug) return;
        var box = document.getElementById('boxAjusteSugestao_' + id);
        if (!box) return;
        var a = sug.acao_proposta || {};
        box.style.display = 'block';
        box.innerHTML = '' +
            '<div style="font-size:12.5px; font-weight:800; color:var(--primary); margin-bottom:8px;">✏️ Ajustar Sugestão Técnica (v' + esc(sug.versao || 1) + ') — Salva como AJUSTADO aguardando aprovação</div>' +
            '<input type="hidden" id="ajSug_versao_' + esc(id) + '" value="' + esc(sug.versao || 1) + '">' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-bottom:8px;">' +
                '<div><label style="font-size:11px; font-weight:700;">Passo / Tarefa *</label><input type="text" id="ajSug_passo_' + esc(id) + '" value="' + esc(a.passo_tarefa || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Perigo / Fonte *</label><input type="text" id="ajSug_perigo_' + esc(id) + '" value="' + esc(a.perigo_fonte || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Evento de Risco</label><input type="text" id="ajSug_evento_' + esc(id) + '" value="' + esc(a.evento_risco || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Danos Prováveis</label><input type="text" id="ajSug_danos_' + esc(id) + '" value="' + esc(a.danos_provaveis || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="margin-bottom:8px;"><label style="font-size:11px; font-weight:700; display:block;">Medidas de Prevenção / Controle Técnico *</label><textarea id="ajSug_medidas_' + esc(id) + '" rows="2" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">' + esc(a.medidas_prevencao || '') + '</textarea></div>' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:8px;">' +
                '<div><label style="font-size:11px; font-weight:700;">Fonte Consultada</label><input type="text" id="ajSug_fonte_' + esc(id) + '" value="' + esc(a.fonte_consultada || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Evidência de Campo</label><input type="text" id="ajSug_evidencia_' + esc(id) + '" value="' + esc(a.evidencia_campo || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Hipótese de Risco</label><input type="text" id="ajSug_hipotese_' + esc(id) + '" value="' + esc(a.hipotese_risco || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Pergunta Pendente</label><input type="text" id="ajSug_pergunta_' + esc(id) + '" value="' + esc(a.pergunta_pendente || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:10px;">' +
                '<div><label style="font-size:11px; font-weight:700;">EPIs Sugeridos (separados por vírgula)</label><input type="text" id="ajSug_epis_' + esc(id) + '" value="' + esc((a.epis_sugeridos || []).join(', ')) + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Gatilhos / Palavras-Chave (separados por vírgula)</label><input type="text" id="ajSug_gatilhos_' + esc(id) + '" value="' + esc((a.gatilhos || []).join(', ')) + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Responsável</label><input type="text" id="ajSug_responsavel_' + esc(id) + '" value="' + esc(a.responsavel || '') + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                '<button type="button" class="db-apply-btn" onclick="window.salvarAjusteSugestaoIaUI(\'' + esc(id) + '\')">💾 Salvar Ajuste (Manter como Ajustado)</button>' +
                '<button type="button" class="db-clear-btn" onclick="window.cancelarAjusteSugestaoIaUI(\'' + esc(id) + '\')">Cancelar</button>' +
            '</div>';
    }

    function cancelarAjusteSugestaoIaUI(id) {
        var box = document.getElementById('boxAjusteSugestao_' + id);
        if (box) {
            box.style.display = 'none';
            box.innerHTML = '';
        }
    }

    function salvarAjusteSugestaoIaUI(id) {
        try {
            var verEl = document.getElementById('ajSug_versao_' + id);
            var versaoEsperada = verEl && verEl.value !== '' ? Number(verEl.value) : undefined;
            var campos = {};

            function lerTexto(prefixo, chave) {
                var el = document.getElementById(prefixo + id);
                if (el) campos[chave] = String(el.value || '').trim();
            }
            lerTexto('ajSug_passo_', 'passo_tarefa');
            lerTexto('ajSug_perigo_', 'perigo_fonte');
            lerTexto('ajSug_evento_', 'evento_risco');
            lerTexto('ajSug_danos_', 'danos_provaveis');
            lerTexto('ajSug_medidas_', 'medidas_prevencao');
            lerTexto('ajSug_fonte_', 'fonte_consultada');
            lerTexto('ajSug_evidencia_', 'evidencia_campo');
            lerTexto('ajSug_hipotese_', 'hipotese_risco');
            lerTexto('ajSug_pergunta_', 'pergunta_pendente');
            lerTexto('ajSug_responsavel_', 'responsavel');

            var elEpis = document.getElementById('ajSug_epis_' + id);
            if (elEpis) {
                campos.epis_sugeridos = String(elEpis.value || '')
                    .split(/[,\n]+/)
                    .map(function (x) { return x.trim(); })
                    .filter(Boolean);
            }
            var elGat = document.getElementById('ajSug_gatilhos_' + id);
            if (elGat) {
                campos.gatilhos = String(elGat.value || '')
                    .split(/[,\n]+/)
                    .map(function (x) { return x.trim(); })
                    .filter(Boolean);
            }

            ajustarSugestaoIa(id, campos, versaoEsperada);
            renderIaAprendizadoPanel();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirImportadorExemploIa() {
        var box = document.getElementById('boxImportadorExemploIa');
        if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function lerArquivoExemploLocalIa(inputEl) {
        if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
        var file = inputEl.files[0];
        if (file.size > LIMITE_BYTES_FICHA_IMPORTACAO) {
            alert('Arquivo excede o limite de 20 KB.');
            inputEl.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (ev) {
            var ta = document.getElementById('textareaImportarExemploIa');
            if (ta) {
                ta.value = String(ev.target.result || '');
                ta.dataset.nomeArquivo = file.name;
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    function confirmarImportacaoExemploIa() {
        try {
            var ta = document.getElementById('textareaImportarExemploIa');
            importarExemploDeTextoOuJson(ta ? ta.value : '', (ta && ta.dataset.nomeArquivo) || 'Ficha Manual');
            renderIaAprendizadoPanel();
        } catch (err) { alert(err.message); }
    }

    function fecharModalContextoIaUI() {
        var box = document.getElementById('boxModalContextoIa');
        if (box) {
            box.style.display = 'none';
            box.innerHTML = '';
        }
    }

    function abrirModalNovoContextoIa(editarId) {
        garantirEstadoSessao();
        var box = document.getElementById('boxModalContextoIa');
        if (!box) return;
        var ctx = editarId ? buscarContextoPorId(editarId) : null;
        var fasesAtuais = (ctx && ctx.fases_operacionais) ? ctx.fases_operacionais : {};

        var camposFasesHtml = FASES_ROTEIRO_PERGUNTAS.map(function (f) {
            var valFase = fasesAtuais[f.id] || '';
            return '<div style="margin-bottom:6px;">' +
                '<label style="font-size:11px; font-weight:700; display:block;">' + esc(f.label) + ' <span style="font-weight:400; color:var(--text-light);">(' + esc(f.pergunta) + ')</span></label>' +
                '<input type="text" id="formCtx_fase_' + esc(f.id) + '" value="' + esc(valFase) + '" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">' +
            '</div>';
        }).join('');

        box.style.display = 'block';
        box.innerHTML = '' +
            '<div style="font-size:13px; font-weight:800; color:var(--primary); margin-bottom:8px;">' + (ctx ? '✏️ Editar Cenário Operacional (' + esc(ctx.codigo_cenario || ctx.id) + ' • v' + esc(ctx.versao || 1) + ')' : '➕ Novo Cenário Operacional') + '</div>' +
            '<input type="hidden" id="formCtx_id" value="' + esc(ctx ? ctx.id : '') + '">' +
            '<input type="hidden" id="formCtx_versao" value="' + esc(ctx ? (ctx.versao || 1) : '') + '">' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:8px;">' +
                '<div><label style="font-size:11.5px; font-weight:700;">Cargo / Equipe *</label><input type="text" id="formCtx_cargo" value="' + esc(ctx ? ctx.cargo_equipe : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11.5px; font-weight:700;">Código GHE</label><input type="text" id="formCtx_ghe" value="' + esc(ctx ? (ctx.ghe_codigo || '') : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11.5px; font-weight:700;">Frente de Serviço</label><input type="text" id="formCtx_frente" value="' + esc(ctx ? ctx.frente_servico : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11.5px; font-weight:700;">Fonte / Procedimento</label><input type="text" id="formCtx_fonte" value="' + esc(ctx ? ctx.fonte_procedimento : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="margin-bottom:8px;"><label style="font-size:11.5px; font-weight:700; display:block;">Rotina Detalhada</label><textarea id="formCtx_rotina" rows="2" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">' + esc(ctx ? ctx.rotina_detalhada : '') + '</textarea></div>' +
            '<div style="margin-bottom:8px; padding:8px; border:1px solid var(--border); border-radius:6px;">' +
                '<div style="font-size:11.5px; font-weight:800; margin-bottom:6px;">Roteiro das 5 Fases Operacionais</div>' +
                camposFasesHtml +
            '</div>' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-bottom:8px;">' +
                '<div><label style="font-size:11.5px; font-weight:700; display:block;">Ferramentas Reais (separadas por vírgula)</label><input type="text" id="formCtx_ferramentas" value="' + esc(ctx && Array.isArray(ctx.ferramentas_reais) ? ctx.ferramentas_reais.join(', ') : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
                '<div><label style="font-size:11.5px; font-weight:700; display:block;">EPIs Validados (separados por vírgula)</label><input type="text" id="formCtx_epis" value="' + esc(ctx && Array.isArray(ctx.epis_validados) ? ctx.epis_validados.join(', ') : '') + '" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;"></div>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-bottom:8px;">' +
                '<div><label style="font-size:11.5px; font-weight:700; display:block;">Perigos Observados (1 por linha ou separados por |)</label><textarea id="formCtx_perigos" rows="2" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">' + esc(ctx && Array.isArray(ctx.perigos_observados) ? ctx.perigos_observados.join('\n') : '') + '</textarea></div>' +
                '<div><label style="font-size:11.5px; font-weight:700; display:block;">Diretrizes da Engenharia SST</label><textarea id="formCtx_regras" rows="2" style="width:100%; padding:7px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box;">' + esc(ctx ? (ctx.regras_engenheiro || '') : '') + '</textarea></div>' +
            '</div>' +
            '<div style="display:flex; gap:8px;">' +
                '<button type="button" class="db-apply-btn" onclick="window.salvarContextoIaFormUI()">💾 Salvar Rascunho de Cenário</button>' +
                '<button type="button" class="db-clear-btn" onclick="window.fecharModalContextoIaUI()">Cancelar</button>' +
            '</div>';
    }

    function salvarContextoIaFormUI() {
        try {
            var idVal = (document.getElementById('formCtx_id') || {}).value || '';
            var verVal = (document.getElementById('formCtx_versao') || {}).value || '';
            var payload = {
                id: idVal,
                versaoEsperada: verVal ? Number(verVal) : undefined,
                cargo_equipe: (document.getElementById('formCtx_cargo') || {}).value || ''
            };

            var elGhe = document.getElementById('formCtx_ghe');
            if (elGhe) payload.ghe_codigo = elGhe.value;

            var elFrente = document.getElementById('formCtx_frente');
            if (elFrente) payload.frente_servico = elFrente.value;

            var elFonte = document.getElementById('formCtx_fonte');
            if (elFonte) payload.fonte_procedimento = elFonte.value;

            var elRotina = document.getElementById('formCtx_rotina');
            if (elRotina) payload.rotina_detalhada = elRotina.value;

            var fasesObj = {};
            var temFaseNoDom = false;
            FASES_ROTEIRO_PERGUNTAS.forEach(function (f) {
                var elFase = document.getElementById('formCtx_fase_' + f.id);
                if (elFase) {
                    temFaseNoDom = true;
                    fasesObj[f.id] = String(elFase.value || '').trim();
                }
            });
            if (temFaseNoDom) {
                payload.fases_operacionais = fasesObj;
            }

            var elFerr = document.getElementById('formCtx_ferramentas');
            if (elFerr) {
                payload.ferramentas_reais = String(elFerr.value || '')
                    .split(/[,\n]+/)
                    .map(function (x) { return x.trim(); })
                    .filter(Boolean);
            }

            var elPerigos = document.getElementById('formCtx_perigos');
            if (elPerigos) {
                payload.perigos_observados = String(elPerigos.value || '')
                    .split(/[\r\n|]+/)
                    .map(function (x) { return x.trim(); })
                    .filter(Boolean);
            }

            var elEpis = document.getElementById('formCtx_epis');
            if (elEpis) {
                payload.epis_validados = String(elEpis.value || '')
                    .split(/[,\n]+/)
                    .map(function (x) { return x.trim(); })
                    .filter(Boolean);
            }

            var elRegras = document.getElementById('formCtx_regras');
            if (elRegras) {
                payload.regras_engenheiro = elRegras.value;
            }

            salvarContextoOperacional(payload);
            renderIaAprendizadoPanel();
        } catch (err) { alert(err.message); }
    }

    // Hooks nas funções de APR (captura de snapshot limpo e confirmação verificada pós-upsert real)
    function instalarHookConfirmacaoSalvarApr() {
        if (typeof window.abrirFormNovaApr === 'function' && !window.abrirFormNovaApr._iaHookInstalado) {
            var abrirOriginal = window.abrirFormNovaApr;
            var abrirComSnapshot = function () {
                var r = abrirOriginal.apply(this, arguments);
                ultimoSnapshotLimpoApr = capturarSnapshotFormularioApr();
                return r;
            };
            abrirComSnapshot._iaHookInstalado = true;
            window.abrirFormNovaApr = abrirComSnapshot;
        }

        if (typeof window.salvarApr === 'function' && !window.salvarApr._iaHookInstalado) {
            var salvarAprOriginal = window.salvarApr;
            var salvarAprComConfirmacaoIa = async function () {
                var sessaoAntes = obterIdentidadeSessaoChave();
                var geracaoAntes = estadoModulo.geracaoSessaoId;
                var numeroAlvo = ((document.getElementById('aprForm_numero') || {}).value || '').trim();
                var origensSnapshotAntes = (Array.isArray(window.aprRiscosForm) ? window.aprRiscosForm : [])
                    .filter(function (r) { return r && ((r.perigo_fonte || '').trim() || (r.evento_risco || '').trim()); })
                    .flatMap(function (r) { return [r.origem_ia_id, r.origem_sugestao_id]; })
                    .filter(Boolean);
                var refRegistroAntes = (numeroAlvo && Array.isArray(window.allAprRegistros))
                    ? window.allAprRegistros.find(function (a) { return a && a.id === numeroAlvo; })
                    : undefined;

                var res = await salvarAprOriginal.apply(this, arguments);

                // Revalida se a sessão não mudou durante o await
                if (obterIdentidadeSessaoChave() !== sessaoAntes || estadoModulo.geracaoSessaoId !== geracaoAntes) {
                    return res;
                }
                // Verifica se salvarApr realmente gravou um novo objeto row em allAprRegistros para numeroAlvo nesta chamada
                var refRegistroDepois = (numeroAlvo && Array.isArray(window.allAprRegistros))
                    ? window.allAprRegistros.find(function (a) { return a && a.id === numeroAlvo; })
                    : undefined;
                var salvouEfetivamente = !!(
                    numeroAlvo &&
                    refRegistroDepois &&
                    refRegistroDepois !== refRegistroAntes &&
                    refRegistroDepois.id === numeroAlvo &&
                    Array.isArray(refRegistroDepois.riscos)
                );

                if (salvouEfetivamente && origensSnapshotAntes.length > 0) {
                    var setSnapshot = new Set(origensSnapshotAntes);
                    var origensNoPayloadSalvo = refRegistroDepois.riscos
                        .flatMap(function (r) { return r ? [r.origem_ia_id, r.origem_sugestao_id] : []; })
                        .filter(function (id) { return id && setSnapshot.has(id); });
                    if (origensNoPayloadSalvo.length > 0) {
                        try { confirmarIncorporacaoAprSalva(refRegistroDepois.id, origensNoPayloadSalvo); } catch (e) { /* preserva APR salva */ }
                    }
                }
                return res;
            };
            salvarAprComConfirmacaoIa._iaHookInstalado = true;
            window.salvarApr = salvarAprComConfirmacaoIa;
        }
    }
    instalarHookConfirmacaoSalvarApr();

    function obterEstadoIaAprendizadoSomenteLeitura() {
        garantirEstadoSessao();
        return JSON.parse(JSON.stringify({
            identidadeChave: estadoModulo.identidadeChave,
            geracaoSessaoId: estadoModulo.geracaoSessaoId,
            contextoSelecionadoId: estadoModulo.contextoSelecionadoId,
            contextos: estadoModulo.contextos,
            regrasAprendidas: estadoModulo.regrasAprendidas,
            sugestoesFila: estadoModulo.sugestoesFila
        }));
    }

    // Exportações públicas
    window.renderIaAprendizadoPanel = renderIaAprendizadoPanel;
    window.inicializarIaAprendizado = renderIaAprendizadoPanel;
    window.obterEstadoIaAprendizadoSomenteLeitura = obterEstadoIaAprendizadoSomenteLeitura;
    window.obterPapelUsuarioIa = obterPapelUsuarioIa;
    window.carregarRascunhoEstudoOpcional = carregarRascunhoEstudoOpcional;
    window.salvarContextoOperacional = salvarContextoOperacional;
    window.executarVarreduraRiscosOcultos = executarVarreduraRiscosOcultos;
    window.gerarPacotePromptRag = gerarPacotePromptRag;
    window.analisarRespostaIaParaPrevia = analisarRespostaIaParaPrevia;
    window.importarRespostaIaParaFila = importarRespostaIaParaFila;
    window.importarExemploDeTextoOuJson = importarExemploDeTextoOuJson;
    window.gerarBackupCadernoLocal = gerarBackupCadernoLocal;
    window.analisarBackupCadernoLocal = analisarBackupCadernoLocal;
    window.aplicarRestauracaoBackupLocal = aplicarRestauracaoBackupLocal;
    window.ajustarSugestaoIa = ajustarSugestaoIa;
    window.aprovarSugestaoIa = aprovarSugestaoIa;
    window.revogarRegraAprendida = revogarRegraAprendida;
    window.descartarSugestaoIa = descartarSugestaoIa;
    window.enviarRiscosAprovadosParaApr = enviarRiscosAprovadosParaApr;
    window.confirmarIncorporacaoAprSalva = confirmarIncorporacaoAprSalva;
    window.acionarAssistenteIaNaAprAtual = acionarAssistenteIaNaAprAtual;
    window.imprimirDossieIaAprendizado = imprimirDossieIaAprendizado;
    window.auditarMedidasFracasApr = auditarMedidasFracasApr;

    // Handlers de UI
    window.selecionarAbaIaAprendizado = selecionarAbaIaAprendizado;
    window.selecionarContextoIaAprendizado = selecionarContextoIaAprendizado;
    window.selecionarAprAuditoriaIa = selecionarAprAuditoriaIa;
    window.filtrarFilaIaAprendizado = filtrarFilaIaAprendizado;
    window.irParaNovoCenarioIaUI = irParaNovoCenarioIaUI;
    window.irParaEditarCenarioAtualIaUI = irParaEditarCenarioAtualIaUI;
    window.atualizarTextoLivreAnaliseIaUI = atualizarTextoLivreAnaliseIaUI;
    window.criarRascunhoCenarioDaDescricaoUI = criarRascunhoCenarioDaDescricaoUI;
    window.copiarPacotePromptIaUI = copiarPacotePromptIaUI;
    window.preVisualizarRespostaIaUI = preVisualizarRespostaIaUI;
    window.confirmarImportacaoPreviaIaUI = confirmarImportacaoPreviaIaUI;
    window.cancelarPreviaImportacaoIaUI = cancelarPreviaImportacaoIaUI;
    window.exportarBackupCadernoIaUI = exportarBackupCadernoIaUI;
    window.alternarBoxBackupIaUI = alternarBoxBackupIaUI;
    window.lerArquivoBackupLocalIa = lerArquivoBackupLocalIa;
    window.preVisualizarBackupIaUI = preVisualizarBackupIaUI;
    window.confirmarRestauracaoBackupIaUI = confirmarRestauracaoBackupIaUI;
    window.cancelarPreviaBackupIaUI = cancelarPreviaBackupIaUI;
    window.carregarRascunhoEstudoUI = carregarRascunhoEstudoUI;
    window.executarVarreduraIaUI = executarVarreduraIaUI;
    window.importarRespostaIaUI = importarRespostaIaUI;
    window.aprovarSugestaoIaUI = aprovarSugestaoIaUI;
    window.descartarSugestaoIaUI = descartarSugestaoIaUI;
    window.revogarRegraAprendidaUI = revogarRegraAprendidaUI;
    window.enviarRiscosAprovadosParaAprUI = enviarRiscosAprovadosParaAprUI;
    window.abrirImportadorExemploIa = abrirImportadorExemploIa;
    window.lerArquivoExemploLocalIa = lerArquivoExemploLocalIa;
    window.confirmarImportacaoExemploIa = confirmarImportacaoExemploIa;
    window.abrirModalNovoContextoIa = abrirModalNovoContextoIa;
    window.fecharModalContextoIaUI = fecharModalContextoIaUI;
    window.salvarContextoIaFormUI = salvarContextoIaFormUI;
    window.abrirAjusteSugestaoIaUI = abrirAjusteSugestaoIaUI;
    window.cancelarAjusteSugestaoIaUI = cancelarAjusteSugestaoIaUI;
    window.salvarAjusteSugestaoIaUI = salvarAjusteSugestaoIaUI;

})(window);
