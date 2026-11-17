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
    var LIMITE_BYTES_FICHA_IMPORTACAO = 20480; // 20 KB em bytes UTF-8 reais
    var LIMITE_MAX_ITENS_IMPORTACAO = 20;
    var LIMITE_MAX_CONTEXTOS = 40;
    var LIMITE_MAX_SUGESTOES = 80;
    var LIMITE_BYTES_STORAGE_SESSAO = 204800; // 200 KB em bytes UTF-8 reais

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

    var estadoModulo = {
        identidadeChave: null,
        geracaoSessaoId: 0,
        abaAtiva: 'exemplos',
        contextoSelecionadoId: '',
        aprSelecionadaId: '',
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
            if (chaveAtual === 'sem_sessao') {
                estadoModulo.contextos = [];
                estadoModulo.regrasAprendidas = [];
                estadoModulo.sugestoesFila = [];
                estadoModulo.historicoAuditoria = [];
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
        if (!estadoModulo.contextoSelecionadoId || !estadoModulo.contextos.some(function (c) { return c.id === estadoModulo.contextoSelecionadoId; })) {
            estadoModulo.contextoSelecionadoId = estadoModulo.contextos[0] ? estadoModulo.contextos[0].id : '';
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
            historicoAuditoria: estadoModulo.historicoAuditoria
        });
    }

    function restaurarEstadoDeJson(jsonSnapshot, selAnterior) {
        var obj = JSON.parse(jsonSnapshot);
        estadoModulo.contextos = obj.contextos || [];
        estadoModulo.regrasAprendidas = obj.regrasAprendidas || [];
        estadoModulo.sugestoesFila = obj.sugestoesFila || [];
        estadoModulo.historicoAuditoria = obj.historicoAuditoria || [];
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

    function executarMutacaoPersistida(fnMutacao) {
        sincronizarDoStorageParaConcorrencia();
        var snapshotAnterior = serializarEstadoAtual();
        var selAnterior = estadoModulo.contextoSelecionadoId;
        var resultado;
        try {
            resultado = fnMutacao();
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
            } else if ((pRes * sRes) >= (pPuro * sPuro) && (pPuro * sPuro) >= 6) {
                alertas.push({
                    linha: idx + 1,
                    passo: r.passo_tarefa || 'Linha ' + (idx + 1),
                    medidaAtual: 'P×S Puro (' + pPuro + '×' + sPuro + ') vs Residual (' + pRes + '×' + sRes + ')',
                    motivo: 'Revisar manualmente: pontuação residual igual ou superior à pura em nível moderado/alto.'
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
        var s = obterSessaoSegura() || {};

        recuperacao.regrasRecuperadas.forEach(function (item) {
            var r = item.regra;
            var chavePerigo = normalizar(r.perigo_fonte).slice(0, 24);
            if (textoAprExistente && chavePerigo && textoAprExistente.indexOf(chavePerigo) !== -1) {
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
                if (textoAprExistente && textoAprExistente.indexOf(pNorm.slice(0, 22)) !== -1) return;
                var jaExiste = lacunasPropostas.some(function (l) {
                    return normalizar(l.acao_proposta.perigo_fonte) === pNorm;
                });
                if (jaExiste) return;

                var fonteDoc = ctx.fonte_procedimento || 'Pendente: vincular procedimento operacional / PGR';
                lacunasPropostas.push({
                    id: 'sug_ctx_' + Date.now() + '_' + idx,
                    versao: 1,
                    origem_regra_id: null,
                    regra_gerada_id: null,
                    contexto_id: ctx.id,
                    modulo_destino: 'APR',
                    fase_operacional: inferirFaseRoteiro(perigoTxt),
                    titulo_insight: 'Hipótese de Risco do Cenário: ' + perigoTxt,
                    descricao_analise: 'Origem: cenário "' + ctx.cargo_equipe + '" (v' + (ctx.versao || 1) + ', status: ' + (ctx.status_cenario || 'RASCUNHO') + ').',
                    acao_proposta: {
                        passo_tarefa: 'Atividade de ' + ctx.cargo_equipe + ' em ' + (ctx.frente_servico || 'campo'),
                        perigo_fonte: perigoTxt,
                        evento_risco: 'Exposição ou falha de barreira associada a: ' + perigoTxt,
                        danos_provaveis: 'A avaliar pela Engenharia na APR',
                        p_puro: '',
                        s_puro: '',
                        medidas_prevencao: ctx.regras_engenheiro || 'Definir barreira de engenharia/administrativa, área de ação segura e EPIs aplicáveis conforme procedimento.',
                        p_residual: '',
                        s_residual: '',
                        responsavel: 'Definir na APR',
                        epis_sugeridos: Array.isArray(ctx.epis_validados) ? ctx.epis_validados.slice() : [],
                        norma_referencia: 'NR-01 / NR-18',
                        gatilhos: extrairGatilhosTexto(perigoTxt),
                        evidencia_campo: 'Relato/observação no cenário ' + (ctx.codigo_cenario || ctx.id),
                        fonte_consultada: fonteDoc,
                        hipotese_risco: 'Possível ponto cego caso a APR não detalhe controle específico para "' + perigoTxt + '".',
                        pergunta_pendente: 'Qual a barreira física/procedimental e o distanciamento exigidos pelo procedimento desta frente?'
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

        var fasesPendentes = FASES_ROTEIRO_PERGUNTAS.filter(function (f) {
            var val = ctx && ctx.fases_operacionais ? String(ctx.fases_operacionais[f.id] || '').trim() : '';
            return !val;
        }).map(function (f) { return f.label; });

        estadoModulo.ultimoDiagnostico = {
            executadoEm: new Date().toISOString(),
            modoMotor: 'Lista de Verificação Local & Busca por Palavras-Chave/Sinônimos (Não é LLM treinada)',
            avisoEscopo: 'Ausência de apontamento nesta verificação não comprova ausência de risco nem conformidade normativa.',
            escopoIntegracaoAdiadas: 'Cruzamento automático com banco remoto de NCs/GHE não executado neste modo local.',
            contextoNome: ctx ? ctx.cargo_equipe : 'Consulta Livre',
            contextoVersao: ctx ? (ctx.versao || 1) : null,
            aprAuditadaId: aprAlvo ? aprAlvo.id : null,
            totalLacunas: lacunasPropostas.length,
            novosNaFila: adicionadas,
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

    // =========================================================================
    // 5. PACOTE EXTERNO PARA LLM (SANITIZAÇÃO INTEGRAL DE TODOS OS CAMPOS)
    // =========================================================================
    function gerarPacotePromptRag(opcoes) {
        garantirEstadoSessao();
        opcoes = Object.assign({}, estadoModulo.opcoesExportacaoPrompt, opcoes || {});
        var ctx = opcoes.contexto || buscarContextoPorId(estadoModulo.contextoSelecionadoId) || estadoModulo.contextos[0] || null;
        var aprAlvo = opcoes.apr || null;
        if (!aprAlvo && estadoModulo.aprSelecionadaId && Array.isArray(window.allAprRegistros)) {
            aprAlvo = window.allAprRegistros.find(function (a) { return String(a.id) === String(estadoModulo.aprSelecionadaId); }) || null;
        }

        var corpusBusca = ctx
            ? [ctx.cargo_equipe, ctx.frente_servico, ctx.rotina_detalhada, (ctx.ferramentas_reais || []).join(' '), (ctx.perigos_observados || []).join(' ')].join(' ')
            : '';
        var recuperados = recuperarExemplosERegrasRelevantes(corpusBusca);

        var linhas = [
            '# PACOTE DE CONTEXTO TÉCNICO SST PARA ANÁLISE EXTERNA DE APR',
            'Aviso de Privacidade e Governança: Filtro automático de CPF/CNPJ/e-mail/telefone aplicado. Revise a prévia antes de copiar para garantir que não há nomes ou dados pessoais em texto livre. Toda resposta deverá ser revisada e pontuada (P×S) manualmente pela Engenharia de Segurança.',
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
            linhas.push('## 1. CENÁRIO EM ANÁLISE: Nenhum cenário selecionado.');
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
            linhas.push('## 3. RISCOS ATUAIS DA APR (' + sanitizarDadosPessoaisParaExportacao(aprAlvo.id) + ')');
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

        linhas.push('## 5. ESQUEMA JSON PARA IMPORTAÇÃO DE RASCUNHO (SEM PONTUAÇÃO P×S)');
        linhas.push('Retorne exclusivamente um array JSON (máx. ' + LIMITE_MAX_ITENS_IMPORTACAO + ' itens, sem URLs e sem HTML) contendo:');
        linhas.push('[{"fase_operacional":"EXECUCAO_FERRAMENTAS","passo_tarefa":"...","perigo_fonte":"...","evento_risco":"...","danos_provaveis":"...","medidas_prevencao":"...","evidencia_campo":"...","fonte_consultada":"...","hipotese_risco":"...","pergunta_pendente":"...","epis_sugeridos":["..."],"gatilhos":["..."]}]');

        // Verificação final sobre todo o texto gerado para garantir que nenhum CPF/CNPJ/e-mail/telefone passe
        return sanitizarDadosPessoaisParaExportacao(linhas.join('\n'));
    }

    // =========================================================================
    // 6. IMPORTAÇÃO VALIDADA (CONTAGEM UTF-8 + TRANSAÇÃO DE STORAGE)
    // =========================================================================
    function importarRespostaIaParaFila(textoBruto, contextoId) {
        garantirEstadoSessao();
        var papel = obterPapelUsuarioIa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: perfil somente leitura não pode importar itens para a fila.');
        }

        var limpo = String(textoBruto || '').trim();
        if (!limpo) throw new Error('Cole o JSON de resposta antes de importar.');
        if (medirBytesUtf8(limpo) > LIMITE_BYTES_FICHA_IMPORTACAO) {
            throw new Error('Resposta excede o teto de ' + (LIMITE_BYTES_FICHA_IMPORTACAO / 1024) + ' KB (' + LIMITE_BYTES_FICHA_IMPORTACAO + ' bytes UTF-8).');
        }

        var erroSeg = contemConteudoProibidoImportacao(limpo);
        if (erroSeg) throw new Error(erroSeg);

        var extraido = limpo;
        var matchBloco = limpo.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (matchBloco && matchBloco[1]) {
            extraido = matchBloco[1].trim();
        }

        var parsed = null;
        try {
            parsed = JSON.parse(extraido);
        } catch (e) {
            throw new Error('JSON malformado. A importação exige JSON estrito conforme o contrato.');
        }

        if (!Array.isArray(parsed)) {
            throw new Error('O JSON importado deve ser um array de objetos de risco.');
        }
        if (parsed.length === 0 || parsed.length > LIMITE_MAX_ITENS_IMPORTACAO) {
            throw new Error('Quantidade de itens inválida (mínimo 1, máximo ' + LIMITE_MAX_ITENS_IMPORTACAO + ' por importação).');
        }

        return executarMutacaoPersistida(function () {
            var s = obterSessaoSegura() || {};
            var importados = 0;
            parsed.forEach(function (item, idx) {
                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    throw new Error('Item #' + (idx + 1) + ' inválido no JSON.');
                }
                var chaves = Object.keys(item);
                var chaveDesconhecida = chaves.find(function (k) { return !CAMPOS_PERMITIDOS_SUGESTAO_JSON.has(k); });
                if (chaveDesconhecida) {
                    throw new Error('Campo não permitido no contrato JSON: "' + chaveDesconhecida + '".');
                }

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

                estadoModulo.sugestoesFila.unshift({
                    id: gerarIdUnico('sug_imp_' + idx),
                    versao: 1,
                    origem_regra_id: null,
                    regra_gerada_id: null,
                    contexto_id: contextoId !== undefined ? contextoId : (estadoModulo.contextoSelecionadoId || null),
                    modulo_destino: 'APR',
                    fase_operacional: fase,
                    titulo_insight: 'Rascunho Importado: ' + passo.slice(0, 80),
                    descricao_analise: 'Rascunho externo não validado — requer revisão da Engenharia e avaliação manual de P×S.',
                    acao_proposta: {
                        passo_tarefa: passo.slice(0, 300),
                        perigo_fonte: perigo.slice(0, 300),
                        evento_risco: String(item.evento_risco || perigo).trim().slice(0, 300),
                        danos_provaveis: String(item.danos_provaveis || 'A definir pela Engenharia').trim().slice(0, 300),
                        p_puro: '',
                        s_puro: '',
                        medidas_prevencao: String(item.medidas_prevencao || 'Definir controle específico com base no procedimento aplicável.').trim().slice(0, 600),
                        p_residual: '',
                        s_residual: '',
                        responsavel: String(item.responsavel || 'Definir na APR').trim().slice(0, 120),
                        epis_sugeridos: Array.isArray(item.epis_sugeridos) ? item.epis_sugeridos.slice(0, 12).map(function (x) { return String(x).slice(0, 80); }) : [],
                        norma_referencia: String(item.norma_referencia || 'NR-01 / NR-18').trim().slice(0, 80),
                        gatilhos: gatilhosLimpos,
                        evidencia_campo: String(item.evidencia_campo || 'Rascunho importado de análise externa').trim().slice(0, 300),
                        fonte_consultada: String(item.fonte_consultada || 'Pendente de confirmação documental').trim().slice(0, 200),
                        hipotese_risco: String(item.hipotese_risco || perigo).trim().slice(0, 300),
                        pergunta_pendente: String(item.pergunta_pendente || 'Confirmar em campo e atribuir P×S manualmente na APR.').trim().slice(0, 300)
                    },
                    status: 'RASCUNHO',
                    feedback_engenheiro: '',
                    criado_por_matricula: String(s.matricula || ''),
                    aprovado_por_matricula: '',
                    created_at: new Date().toISOString()
                });
                importados++;
            });

            registrarEventoAuditoria('IMPORTAR_RESPOSTA_JSON', contextoId || 'fila', importados + ' rascunho(s)');
            return importados;
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
        if (!sug || sug.status !== 'APROVADO') return false;
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

        // 1. Primeiro persiste a transação em estadoModulo/localStorage ANTES de limpar ou mutar o formulário da APR!
        executarMutacaoPersistida(function () {
            elegiveis.forEach(function (s) {
                var a = s.acao_proposta || {};
                var chaveOrigem = s.regra_gerada_id || s.id;
                var jaNaApr = linhasCalculadas.some(function (r) {
                    return (r.origem_ia_id && r.origem_ia_id === chaveOrigem) ||
                        (normalizar(r.passo_tarefa) === normalizar(a.passo_tarefa) &&
                         normalizar(r.perigo_fonte) === normalizar(a.perigo_fonte));
                });
                if (jaNaApr) return;

                linhasCalculadas.push({
                    origem_ia_id: chaveOrigem,
                    origem_sugestao_id: s.id,
                    passo_tarefa: a.passo_tarefa || '',
                    perigo_fonte: a.perigo_fonte || '',
                    evento_risco: a.evento_risco || '',
                    danos_provaveis: a.danos_provaveis || '',
                    p_puro: '',
                    s_puro: '',
                    medidas_prevencao: a.medidas_prevencao || '',
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
                var elegivel = s.status === 'APROVADO' && s.status_transferencia === 'EM_RASCUNHO_APR' &&
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

        if (!textoApr) {
            alert('Preencha o Título ou a Descrição da Atividade na APR para buscar regras aprovadas pela Engenharia.');
            return { encontrados: 0, inseridos: 0 };
        }

        var recuperadas = recuperarExemplosERegrasRelevantes(textoApr).regrasRecuperadas;
        var linhasExistentes = Array.isArray(window.aprRiscosForm) ? window.aprRiscosForm.filter(linhaAprTemQualquerDado) : [];

        var candidatas = recuperadas.filter(function (item) {
            var r = item.regra;
            return !linhasExistentes.some(function (ex) {
                return (ex.origem_ia_id && ex.origem_ia_id === r.id) ||
                    (normalizar(ex.passo_tarefa) === normalizar(r.passo_tarefa) &&
                     normalizar(ex.perigo_fonte) === normalizar(r.perigo_fonte));
            });
        });

        if (candidatas.length === 0) {
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
                '</div>' +
            '</div>';

        if (estadoModulo.abaAtiva === 'exemplos') {
            html += renderizarAbaExemplos(ctxAtual, papel);
        } else if (estadoModulo.abaAtiva === 'analise') {
            html += renderizarAbaAnalise(ctxAtual, papel);
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
            '</div>';
    }

    function renderizarAbaAnalise(ctxAtual, papel) {
        var podeEditar = papel === 'editor' || papel === 'validador';
        var promptRag = gerarPacotePromptRag({ contexto: ctxAtual });
        var diag = estadoModulo.ultimoDiagnostico;

        var diagHtml = '';
        if (diag) {
            diagHtml = '<div class="db-chart-card" style="margin-top:14px; border-left:4px solid var(--primary);">' +
                '<div class="db-chart-title">📋 Diagnóstico da Lista de Verificação Local</div>' +
                '<div style="font-size:11.5px; color:var(--text-light); margin-bottom:6px;">' + esc(diag.avisoEscopo) + '</div>' +
                '<div style="font-size:12px;"><b>Lacunas geradas como rascunho:</b> ' + diag.totalLacunas + ' (' + diag.novosNaFila + ' nova(s) na fila)</div>' +
                (diag.fasesSemInformacao && diag.fasesSemInformacao.length
                    ? '<div style="font-size:11.5px; color:var(--warning, #d97706); margin-top:4px;">⚠️ Fases com pergunta pendente de resposta no cenário: ' + esc(diag.fasesSemInformacao.join(' | ')) + '</div>'
                    : '') +
            '</div>';
        }

        return '' +
            '<div class="db-chart-card">' +
                '<div class="db-chart-title">🔍 Modo 1: Lista de Verificação Local (5 Fases + Regras Aprovadas)</div>' +
                '<div style="margin-top:8px;">' +
                    '<input type="text" id="inputTextoExtraAnaliseIa" placeholder="Descreva a atividade, ferramentas ou condição específica para buscar exemplos e regras aprovadas..." style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; background:var(--card); color:var(--text);">' +
                '</div>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.executarVarreduraIaUI()">🔍 Executar Verificação Local</button>' +
                '</div>' +
            '</div>' +
            diagHtml +
            '<div class="db-chart-card" style="margin-top:14px;">' +
                '<div class="db-chart-title">📋 Modo 2: Pacote Copiável para LLM Externa + Importação Manual de Rascunho</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-top:8px;">' +
                    '<div>' +
                        '<label style="font-size:11.5px; font-weight:700; display:block; margin-bottom:4px;">Prévia do Pacote (Revise antes de copiar para garantir ausência de dados pessoais em texto livre):</label>' +
                        '<textarea id="textareaPromptRagGerado" rows="7" readonly style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:11px; font-family:monospace; background:var(--bg); color:var(--text);">' + esc(promptRag) + '</textarea>' +
                    '</div>' +
                    '<div>' +
                        '<label style="font-size:11.5px; font-weight:700; display:block; margin-bottom:4px;">📥 Colar Array JSON de Rascunho (máx. 20 KB / 20 itens):</label>' +
                        '<textarea id="textareaRespostaIaImportar" rows="5" placeholder="Cole aqui o array JSON..." style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; box-sizing:border-box; font-size:11.5px; font-family:monospace; background:var(--card); color:var(--text);"></textarea>' +
                        (podeEditar ? '<button type="button" class="db-apply-btn" onclick="window.importarRespostaIaUI()" style="margin-top:6px; width:100%;">📥 Validar Esquema e Importar como Rascunho</button>' : '') +
                    '</div>' +
                '</div>' +
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
    function selecionarAbaIaAprendizado(aba) { estadoModulo.abaAtiva = aba; renderIaAprendizadoPanel(); }
    function selecionarContextoIaAprendizado(id) { estadoModulo.contextoSelecionadoId = id; renderIaAprendizadoPanel(); }
    function selecionarAprAuditoriaIa(id) { estadoModulo.aprSelecionadaId = id; }
    function filtrarFilaIaAprendizado(status) { estadoModulo.filtroFilaStatus = status; renderIaAprendizadoPanel(); }

    function carregarRascunhoEstudoUI() {
        try { carregarRascunhoEstudoOpcional(); renderIaAprendizadoPanel(); } catch (err) { alert(err.message); }
    }

    function executarVarreduraIaUI() {
        var elExtra = document.getElementById('inputTextoExtraAnaliseIa');
        executarVarreduraRiscosOcultos({ textoLivre: elExtra ? elExtra.value : '' });
        renderIaAprendizadoPanel();
    }

    function importarRespostaIaUI() {
        try {
            var el = document.getElementById('textareaRespostaIaImportar');
            importarRespostaIaParaFila(el ? el.value : '', estadoModulo.contextoSelecionadoId);
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

    // Exportações públicas
    window.renderIaAprendizadoPanel = renderIaAprendizadoPanel;
    window.inicializarIaAprendizado = renderIaAprendizadoPanel;
    window.obterPapelUsuarioIa = obterPapelUsuarioIa;
    window.carregarRascunhoEstudoOpcional = carregarRascunhoEstudoOpcional;
    window.salvarContextoOperacional = salvarContextoOperacional;
    window.executarVarreduraRiscosOcultos = executarVarreduraRiscosOcultos;
    window.gerarPacotePromptRag = gerarPacotePromptRag;
    window.importarRespostaIaParaFila = importarRespostaIaParaFila;
    window.importarExemploDeTextoOuJson = importarExemploDeTextoOuJson;
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
