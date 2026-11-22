/**
 * dashboard/modules/ia_mapa_mental.js
 * =============================================================================
 * MÓDULO ADICIONAL: MAPA MENTAL SST (APOIO CRÍTICO À AVALIAÇÃO DE RISCOS E APR)
 * Empreendimento: Consórcio Operador — PISF Ramal do Agreste
 * Referências Normativas: NR-01 (GRO/PGR - Hierarquia de Controle e Trabalho Real)
 * =============================================================================
 * Diretrizes de Governança e Premissas Operacionais (Consenso 20/11/2026):
 * 1. Acréscimo puro dentro da aba Inteligência SST: preserva 100% intactos os
 *    cenários atuais, 5 fases, fila de aprovação, backup v1 e fluxo da APR.
 * 2. Fase 1 (Opção A): vínculos entre Atividade -> Etapas -> Funções -> Ferramentas
 *    -> Perigos -> Evento/Danos/Medidas NR-01 e EPIs (Obrigatórios vs Eventuais)
 *    mantidos exclusivamente no Mapa/Tabela locais, sem enviar linhas nem marcar
 *    checkboxes na APR oficial e sem preencher P/S automaticamente.
 * 3. Premissa Operacional de João: na operação atual, uma única APR pode cobrir
 *    atividade com equipe mista (ex.: Motorista, Encarregado e Servente), onde as
 *    exposições diferem bastante. Nenhum risco ou EPI pode equiparar funções
 *    automaticamente sem vínculo explícito por etapa e função.
 * 4. Apoio crítico às recomendações de incluir ou retirar itens: preserva o texto
 *    livre digitado/colado (não avaliado), executa análise crítica somente sob
 *    demanda e mantém decisões (Aceitar / Editar / Rejeitar) rastreáveis.
 * 5. Sem semente fixa, sem chave de LLM no navegador, sem popup direto e sem
 *    gravação em tabela global de configurações. Backup isolado no formato `ia_mapa_mental_backup_v1`.
 */

(function (window) {
    'use strict';

    var STORAGE_PREFIX_MAPA = 'sst_ia_mapa_mental_v1_';
    var FORMATO_BACKUP_MAPA = 'ia_mapa_mental_backup_v1';
    var FORMATO_BACKUP_LEGADO_CENARIOS = 'ia_aprendizado_backup_v1';
    var VERSAO_ESQUEMA_MAPA = 1;

    var LIMITE_MAX_MAPAS = 30;
    var LIMITE_BYTES_MAPA_SESSAO = 204800; // 200 KB em bytes UTF-8 reais
    var LIMITE_BYTES_BACKUP_MAPA = LIMITE_BYTES_MAPA_SESSAO + 32768;
    var LIMITE_BYTES_IMPORT_CRITICA = 20480; // 20 KB em bytes UTF-8 reais
    var LIMITE_MAX_ITENS_IMPORT = 30;

    var FASES_ROTEIRO_OPCIONAIS = [
        { id: 'DESLOCAMENTO_ACESSO', label: '1. Deslocamento e Acesso à Frente' },
        { id: 'VIVENCIA_APOIO', label: '2. Montagem de Vivência e Apoio' },
        { id: 'EXECUCAO_FERRAMENTAS', label: '3. Ferramentas Reais e Área de Ação' },
        { id: 'AMBIENTE_INTERFERENCIAS', label: '4. Ambiente, Terreno, Fauna e Interferências (SIMOPS)' },
        { id: 'EMERGENCIA_RESGATE', label: '5. Resgate, Comunicação e PAE' }
    ];

    var STATUS_VALIDOS_ITEM = new Set(['NAO_AVALIADO', 'CONFIRMADO', 'NAO_APLICAVEL']);
    var STATUS_CONDICAO_EPI_VALIDOS = new Set(['PENDENTE', 'APLICAVEL', 'NAO_APLICAVEL']);
    var TIPOS_RECOMENDACAO_VALIDOS = new Set(['INCLUIR', 'RETIRAR', 'AJUSTAR', 'PERGUNTA']);
    var RAMOS_ALVO_VALIDOS = new Set(['FUNCAO', 'FERRAMENTA', 'ETAPA', 'EPI', 'PERIGO', 'GERAL']);
    var ORIGENS_RECOMENDACAO_VALIDAS = new Set([
        'SOLICITACAO_TERCEIRO',
        'REVISAO_ENGENHARIA',
        'ANALISE_LOCAL_PALAVRAS_CHAVE',
        'IA_EXTERNA'
    ]);

    var CAMPOS_PERMITIDOS_CRITICA_JSON = new Set([
        'tipo', 'alvo_ramo', 'alvo_item_id', 'titulo', 'descricao_proposta',
        'justificativa', 'perguntas_abertas', 'etapas_sugeridas', 'funcoes_sugeridas',
        'categoria_epi', 'condicao_uso', 'campo_alvo', 'escopo_retirada'
    ]);

    var CAMPOS_ALVO_SUPORTADOS_POR_RAMO = {
        PERIGO: [
            'perigo_fonte',
            'evento_risco',
            'danos_provaveis',
            'medidas_nr01.eliminacao_substituicao',
            'medidas_nr01.engenharia_epc',
            'medidas_nr01.administrativo_organizacao',
            'medidas_nr01.epi_complementar',
            'observacao'
        ],
        EPI: ['nome', 'condicao_uso', 'observacao'],
        FUNCAO: ['nome', 'nota_exposicao'],
        FERRAMENTA: ['nome', 'observacao'],
        ETAPA: ['nome', 'observacao'],
        GERAL: ['observacoes_gerais']
    };

    var LABELS_CAMPO_ALVO = {
        perigo_fonte: 'Perigo / Fonte',
        evento_risco: 'Evento / Risco',
        danos_provaveis: 'Danos Prováveis',
        'medidas_nr01.eliminacao_substituicao': 'NR-01: 1. Eliminação / Substituição',
        'medidas_nr01.engenharia_epc': 'NR-01: 2. Engenharia (EPC)',
        'medidas_nr01.administrativo_organizacao': 'NR-01: 3. Administrativo / Organização',
        'medidas_nr01.epi_complementar': 'NR-01: 4. EPI Complementar',
        observacao: 'Observação do Item',
        nome: 'Nome do Item',
        condicao_uso: 'Condição de Uso (EPI Eventual)',
        nota_exposicao: 'Nota de Exposição da Função',
        observacoes_gerais: 'Observações Gerais do Mapa'
    };

    var CAMPOS_NOTA_IGNORADOS = new Set([
        'p_puro', 's_puro', 'p_residual', 's_residual',
        'risco_puro', 'risco_residual', 'probabilidade', 'severidade', 'gravidade'
    ]);

    var GRUPOS_TERMOS_EQUIVALENTES = [
        ['transito', 'trafego', 'movimentacao', 'veiculo', 'veiculos', 'caminhao', 'onibus'],
        ['projecao', 'particula', 'particulas', 'pedra', 'pedras', 'graveto', 'gravetos', 'fragmento', 'fragmentos'],
        ['pedra', 'pedras', 'rocha', 'bloco', 'blocos', 'enrocamento'],
        ['corte', 'perfuracao', 'cortante', 'perfurante', 'foice', 'estrovenga', 'facao', 'chibanca', 'enxada'],
        ['peconhento', 'peconhentos', 'serpente', 'serpentes', 'cobra', 'escorpiao', 'escorpioes', 'aranha', 'abelha'],
        ['desnivel', 'superficie', 'irregular', 'inclinacao', 'talude', 'escorregao', 'tropeco'],
        ['solar', 'radiacao', 'calor', 'sol', 'desidratacao', 'termica'],
        ['repetitivo', 'repetitivos', 'esforco', 'muscular', 'ergonomico', 'postura']
    ];

    var REGEX_EVENTO_MISTURADO_EM_FONTE = /\b(corte|perfurac[aã]o|atropelamento|colis[aã]o|queda|queimadura|choque|prensamento|esmagamento|intoxicac[aã]o|envenenamento|desabamento|tombamento|les[aã]o|les[oõ]es|fratura|escoriac[aã]o|entorse)\b/i;

    var estadoMapa = {
        identidadeChave: null,
        geracaoSessaoId: 0,
        modoVisao: 'mapa',
        mapaSelecionadoId: '',
        etapaFocoId: '',
        funcaoFocoId: '',
        perigoFocoId: '',
        ramosRecolhidos: {},
        filtroTabelaFuncaoId: 'TODAS',
        filtroTabelaStatus: 'TODOS',
        formMapaAberto: null,
        formRamoAberto: null,
        formRecAberto: false,
        formRecRamoSel: 'PERIGO',
        formRecRascunho: null,
        decisaoRecEmEdicao: null,
        textoImportCriticaDraft: '',
        textoBackupDraft: '',
        boxBackupAberto: false,
        previaImportCritica: null,
        previaBackup: null,
        ultimoBackupEm: '',
        alteracoesAposBackup: false,
        mapas: []
    };

    var contadorIdsMapa = 0;
    function gerarIdMapa(prefixo) {
        contadorIdsMapa += 1;
        return prefixo + '_' + Date.now() + '_' + contadorIdsMapa + '_' + Math.random().toString(36).slice(2, 6);
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

    function contemConteudoProibidoMapa(texto) {
        var s = String(texto || '');
        if (/<script\b|<\/script>|javascript:|vbscript:|onerror\s*=|onload\s*=|data:(?:text\/html|application\/|image\/svg\+xml)/i.test(s)) {
            return 'Conteúdo contém script ou instrução executável não permitida.';
        }
        if (/https?:\/\/[^\s"'<>]+/i.test(s)) {
            return 'URLs externas não são permitidas neste módulo.';
        }
        return null;
    }

    function sanitizarPiiMapa(texto) {
        return String(texto || '')
            .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_OMITIDO]')
            .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ_OMITIDO]')
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_OMITIDO]')
            .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g, '[TELEFONE_OMITIDO]');
    }

    function dividirListaTextoLivre(texto) {
        return String(texto || '')
            .split(/[;\r\n]+/)
            .map(function (item) {
                return item.trim().replace(/^[•\-*]\s*/, '').trim();
            })
            .filter(Boolean);
    }

    function clonarProfundo(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // =========================================================================
    // 1. SESSÃO, PAPÉIS E PERSISTÊNCIA TRANSACIONAL ISOLADA
    // =========================================================================
    function obterSessaoSeguraMapa() {
        try {
            if (typeof window.sessaoDashboardAtual === 'function') {
                return window.sessaoDashboardAtual() || null;
            }
        } catch (e) { /* ignora */ }
        return null;
    }

    function obterPapelMapa() {
        if (typeof window.obterPapelUsuarioIa === 'function') {
            return window.obterPapelUsuarioIa();
        }
        var s = obterSessaoSeguraMapa();
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

    function exigirPermissaoEdicaoMapa(acaoDesc) {
        var papel = obterPapelMapa();
        if (papel !== 'editor' && papel !== 'validador') {
            throw new Error('Permissão negada: seu perfil (' + papel + ') não possui autorização para ' + (acaoDesc || 'editar o mapa mental') + '.');
        }
        return papel;
    }

    function obterIdentidadeSessaoMapa() {
        var s = obterSessaoSeguraMapa();
        if (!s) return 'sem_sessao';
        var uid = String(s.uid || s.id || '').trim();
        var mat = String(s.matricula || '').trim();
        var tipo = String(s.tipo || 'interno').trim();
        return (tipo + '_' + (uid || 'sem_uid') + '_' + (mat || 'sem_mat')).replace(/[^a-zA-Z0-9_.-]/g, '_');
    }

    function resetarControlesVisuaisMapa() {
        estadoMapa.etapaFocoId = '';
        estadoMapa.funcaoFocoId = '';
        estadoMapa.perigoFocoId = '';
        estadoMapa.ramosRecolhidos = {};
        estadoMapa.filtroTabelaFuncaoId = 'TODAS';
        estadoMapa.filtroTabelaStatus = 'TODOS';
        estadoMapa.formMapaAberto = null;
        estadoMapa.formRamoAberto = null;
        estadoMapa.formRecAberto = false;
        estadoMapa.formRecRamoSel = 'PERIGO';
        estadoMapa.formRecRascunho = null;
        estadoMapa.decisaoRecEmEdicao = null;
        estadoMapa.textoImportCriticaDraft = '';
        estadoMapa.textoBackupDraft = '';
        estadoMapa.boxBackupAberto = false;
        estadoMapa.previaImportCritica = null;
        estadoMapa.previaBackup = null;
    }

    function carregarEstadoMapaPersistido(chaveSessao) {
        var chaveStorage = STORAGE_PREFIX_MAPA + chaveSessao;
        var salvo = null;
        try {
            var bruto = localStorage.getItem(chaveStorage);
            if (bruto) salvo = JSON.parse(bruto);
        } catch (e) { salvo = null; }

        estadoMapa.mapas = (salvo && Array.isArray(salvo.mapas)) ? salvo.mapas : [];
        estadoMapa.ultimoBackupEm = (salvo && typeof salvo.ultimoBackupEm === 'string') ? salvo.ultimoBackupEm : '';
        estadoMapa.alteracoesAposBackup = !!(salvo && salvo.alteracoesAposBackup);
        if (!estadoMapa.mapaSelecionadoId || !estadoMapa.mapas.some(function (m) { return m.id === estadoMapa.mapaSelecionadoId; })) {
            estadoMapa.mapaSelecionadoId = estadoMapa.mapas[0] ? estadoMapa.mapas[0].id : '';
        }
    }

    function garantirEstadoSessaoMapa() {
        var chaveAtual = obterIdentidadeSessaoMapa();
        if (estadoMapa.identidadeChave !== chaveAtual) {
            estadoMapa.identidadeChave = chaveAtual;
            estadoMapa.geracaoSessaoId += 1;
            estadoMapa.mapaSelecionadoId = '';
            resetarControlesVisuaisMapa();
            if (chaveAtual === 'sem_sessao') {
                estadoMapa.mapas = [];
                estadoMapa.ultimoBackupEm = '';
                estadoMapa.alteracoesAposBackup = false;
            } else {
                carregarEstadoMapaPersistido(chaveAtual);
            }
        }
        return estadoMapa.geracaoSessaoId;
    }

    function sincronizarMapaDoStorage() {
        garantirEstadoSessaoMapa();
        if (estadoMapa.identidadeChave === 'sem_sessao') return;
        var selAntes = estadoMapa.mapaSelecionadoId;
        carregarEstadoMapaPersistido(estadoMapa.identidadeChave);
        if (selAntes && estadoMapa.mapas.some(function (m) { return m.id === selAntes; })) {
            estadoMapa.mapaSelecionadoId = selAntes;
        }
    }

    function serializarEstadoMapa() {
        return JSON.stringify({
            versao_esquema: VERSAO_ESQUEMA_MAPA,
            mapas: estadoMapa.mapas,
            ultimoBackupEm: estadoMapa.ultimoBackupEm || '',
            alteracoesAposBackup: !!estadoMapa.alteracoesAposBackup
        });
    }

    function restaurarEstadoMapaSnapshot(jsonSnapshot, selAnterior) {
        var parsed = JSON.parse(jsonSnapshot);
        estadoMapa.mapas = Array.isArray(parsed.mapas) ? parsed.mapas : [];
        estadoMapa.ultimoBackupEm = typeof parsed.ultimoBackupEm === 'string' ? parsed.ultimoBackupEm : '';
        estadoMapa.alteracoesAposBackup = !!parsed.alteracoesAposBackup;
        estadoMapa.mapaSelecionadoId = selAnterior && estadoMapa.mapas.some(function (m) { return m.id === selAnterior; })
            ? selAnterior
            : (estadoMapa.mapas[0] ? estadoMapa.mapas[0].id : '');
    }

    function calcularConsumoBytesMapa() {
        garantirEstadoSessaoMapa();
        var bytes = medirBytesUtf8(serializarEstadoMapa());
        return {
            bytes: bytes,
            kb: Math.round((bytes / 1024) * 10) / 10,
            limiteBytes: LIMITE_BYTES_MAPA_SESSAO,
            limiteKb: Math.round(LIMITE_BYTES_MAPA_SESSAO / 1024)
        };
    }

    function persistirMapaOuReverter(snapshotAnterior, selAnterior) {
        var chave = STORAGE_PREFIX_MAPA + estadoMapa.identidadeChave;
        var jsonNovo = serializarEstadoMapa();
        var bytes = medirBytesUtf8(jsonNovo);
        if (bytes > LIMITE_BYTES_MAPA_SESSAO) {
            restaurarEstadoMapaSnapshot(snapshotAnterior, selAnterior);
            throw new Error('Armazenamento local do Mapa Mental excedeu o limite de ' + Math.round(LIMITE_BYTES_MAPA_SESSAO / 1024) + ' KB UTF-8 (' + bytes + ' bytes). Exporte backup ou remova mapas antigos; a alteração foi revertida.');
        }
        try {
            localStorage.setItem(chave, jsonNovo);
        } catch (err) {
            restaurarEstadoMapaSnapshot(snapshotAnterior, selAnterior);
            throw new Error('Falha ao gravar no armazenamento local do navegador (' + (err && err.message ? err.message : 'QuotaExceededError') + '). Os dados anteriores do Mapa Mental foram preservados.');
        }
    }

    function executarMutacaoMapaPersistida(fnMutacao, opcoes) {
        opcoes = opcoes || {};
        sincronizarMapaDoStorage();
        if (estadoMapa.identidadeChave === 'sem_sessao') {
            throw new Error('Sessão não autenticada: realize login para salvar alterações no Mapa Mental.');
        }
        var snapshotAntes = serializarEstadoMapa();
        var selAntes = estadoMapa.mapaSelecionadoId;
        var resultado;
        try {
            resultado = fnMutacao();
            if (!opcoes.preservarFlagBackup) {
                estadoMapa.alteracoesAposBackup = true;
            }
            persistirMapaOuReverter(snapshotAntes, selAntes);
        } catch (err) {
            restaurarEstadoMapaSnapshot(snapshotAntes, selAntes);
            throw err;
        }
        return resultado;
    }

    // =========================================================================
    // 2. REFERÊNCIA SOMENTE LEITURA A GHEs EXISTENTES
    // =========================================================================
    function obterCatalogoGheSomenteLeitura() {
        var bruto = Array.isArray(window.allGheCatalogo) ? window.allGheCatalogo : [];
        return bruto.filter(function (g) { return g && typeof g === 'object'; }).map(function (g) {
            return {
                id: String(g.id || '').trim(),
                nome: String(g.nome || '').trim(),
                cargos: Array.isArray(g.cargos) ? g.cargos.map(function (c) { return String(c || '').trim(); }).filter(Boolean) : []
            };
        });
    }

    function buscarReferenciaGhePorFuncao(nomeFuncao) {
        var alvo = normalizar(nomeFuncao);
        if (!alvo) return '';
        var catalogo = obterCatalogoGheSomenteLeitura();
        var encontrados = [];
        catalogo.forEach(function (g) {
            var bateu = g.cargos.some(function (cargo) {
                var cNorm = normalizar(cargo);
                return cNorm && (cNorm === alvo || cNorm.indexOf(alvo) !== -1 || alvo.indexOf(cNorm) !== -1);
            });
            if (bateu && g.id) {
                encontrados.push(g.nome ? (g.id + ' (' + g.nome + ')') : g.id);
            }
        });
        return encontrados.join(' | ');
    }

    // =========================================================================
    // 3. AUXILIARES DO MODELO DE DADOS & NORMALIZAÇÃO DE VÍNCULOS
    // =========================================================================
    function buscarMapaPorId(mapaId) {
        return estadoMapa.mapas.find(function (m) { return m.id === mapaId; }) || null;
    }

    function exigirMapaEConcorrencia(mapaId, versaoEsperada) {
        var mapa = buscarMapaPorId(mapaId);
        if (!mapa) throw new Error('Mapa Mental não encontrado.');
        if (versaoEsperada !== undefined && versaoEsperada !== null && Number(versaoEsperada) !== Number(mapa.versao || 1)) {
            throw new Error('Conflito de edição concorrente: o mapa "' + mapa.atividade + '" já foi atualizado para a versão ' + (mapa.versao || 1) + '. Recarregue antes de salvar.');
        }
        return mapa;
    }

    function tocarVersaoMapa(mapa) {
        mapa.versao = (Number(mapa.versao) || 1) + 1;
        mapa.updated_at = new Date().toISOString();
    }

    function filtrarIdsValidos(listaIds, colecao) {
        if (!Array.isArray(listaIds)) return [];
        var validos = new Set((colecao || []).map(function (x) { return x.id; }));
        var vistos = new Set();
        var out = [];
        listaIds.forEach(function (id) {
            var limpo = String(id || '').trim();
            if (limpo && validos.has(limpo) && !vistos.has(limpo)) {
                vistos.add(limpo);
                out.push(limpo);
            }
        });
        return out;
    }

    function limparReferenciasOrfasDoMapa(mapa) {
        mapa.etapas.forEach(function (et, idx) {
            et.ordem = idx + 1;
            et.funcao_ids = filtrarIdsValidos(et.funcao_ids, mapa.funcoes);
            et.ferramenta_ids = filtrarIdsValidos(et.ferramenta_ids, mapa.ferramentas);
        });
        mapa.ferramentas.forEach(function (fer) {
            fer.etapa_ids = filtrarIdsValidos(fer.etapa_ids, mapa.etapas);
            fer.funcao_ids = filtrarIdsValidos(fer.funcao_ids, mapa.funcoes);
        });
        mapa.epis.forEach(function (ep) {
            ep.etapa_ids = filtrarIdsValidos(ep.etapa_ids, mapa.etapas);
            ep.funcao_ids = filtrarIdsValidos(ep.funcao_ids, mapa.funcoes);
        });
        mapa.perigos.forEach(function (per) {
            per.etapa_ids = filtrarIdsValidos(per.etapa_ids, mapa.etapas);
            per.funcao_ids = filtrarIdsValidos(per.funcao_ids, mapa.funcoes);
            per.ferramenta_ids = filtrarIdsValidos(per.ferramenta_ids, mapa.ferramentas);
        });
        mapa.recomendacoes.forEach(function (rec) {
            var antesEtapas = Array.isArray(rec.etapa_ids_sugeridas) ? rec.etapa_ids_sugeridas.slice() : [];
            var antesFuncoes = Array.isArray(rec.funcao_ids_sugeridas) ? rec.funcao_ids_sugeridas.slice() : [];
            rec.etapa_ids_sugeridas = filtrarIdsValidos(antesEtapas, mapa.etapas);
            rec.funcao_ids_sugeridas = filtrarIdsValidos(antesFuncoes, mapa.funcoes);
            if (!Array.isArray(rec.funcoes_nao_resolvidas)) rec.funcoes_nao_resolvidas = [];
            if (!Array.isArray(rec.etapas_nao_resolvidas)) rec.etapas_nao_resolvidas = [];
            if (rec.status_decisao === 'PENDENTE') {
                antesFuncoes.forEach(function (idAnt) {
                    if (rec.funcao_ids_sugeridas.indexOf(idAnt) === -1) {
                        var marcFn = '[removida: ' + idAnt + ']';
                        if (rec.funcoes_nao_resolvidas.indexOf(marcFn) === -1) rec.funcoes_nao_resolvidas.push(marcFn);
                    }
                });
                antesEtapas.forEach(function (idAnt) {
                    if (rec.etapa_ids_sugeridas.indexOf(idAnt) === -1) {
                        var marcEt = '[removida: ' + idAnt + ']';
                        if (rec.etapas_nao_resolvidas.indexOf(marcEt) === -1) rec.etapas_nao_resolvidas.push(marcEt);
                    }
                });
            }
        });
    }

    function normalizarStatusItem(status) {
        var up = String(status || 'NAO_AVALIADO').trim().toUpperCase();
        return STATUS_VALIDOS_ITEM.has(up) ? up : 'NAO_AVALIADO';
    }

    function normalizarStatusCondicaoEpi(status) {
        var up = String(status || 'PENDENTE').trim().toUpperCase();
        return STATUS_CONDICAO_EPI_VALIDOS.has(up) ? up : 'PENDENTE';
    }

    function normalizarMedidasNr01(medidas) {
        var m = (medidas && typeof medidas === 'object' && !Array.isArray(medidas)) ? medidas : {};
        return {
            eliminacao_substituicao: String(m.eliminacao_substituicao || '').trim(),
            engenharia_epc: String(m.engenharia_epc || '').trim(),
            administrativo_organizacao: String(m.administrativo_organizacao || '').trim(),
            epi_complementar: String(m.epi_complementar || '').trim()
        };
    }

    function mapearListaParaColecao(ramo, mapa, id) {
        if (ramo === 'FUNCAO') return mapa.funcoes;
        if (ramo === 'FERRAMENTA') return mapa.ferramentas;
        if (ramo === 'ETAPA') return mapa.etapas;
        if (ramo === 'EPI') return mapa.epis;
        if (ramo === 'PERIGO') return mapa.perigos;
        throw new Error('Ramo desconhecido no Mapa Mental: ' + String(ramo || '') + (id ? ' (' + id + ')' : ''));
    }

    function localizarItemPorRamo(mapa, ramo, itemId) {
        if (!mapa || !ramo || ramo === 'GERAL' || !itemId) return null;
        var col = mapearListaParaColecao(ramo, mapa, itemId);
        return col.find(function (it) { return it.id === itemId; }) || null;
    }

    function obterNomePrincipalItem(ramo, item) {
        if (!item) return '';
        if (ramo === 'PERIGO') return String(item.perigo_fonte || '');
        return String(item.nome || '');
    }

    function normalizarListaStringsUnicas(val) {
        if (!Array.isArray(val)) return [];
        var vistos = new Set();
        var out = [];
        val.forEach(function (x) {
            var s = String(x || '').trim();
            if (s && !vistos.has(s)) {
                vistos.add(s);
                out.push(s);
            }
        });
        return out;
    }

    function obterCamposAlvoPermitidos(ramo) {
        var r = String(ramo || '').trim().toUpperCase();
        var lista = CAMPOS_ALVO_SUPORTADOS_POR_RAMO[r];
        return Array.isArray(lista) ? lista.slice() : [];
    }

    function obterLabelCampoAlvo(campo) {
        var c = String(campo || '').trim();
        return LABELS_CAMPO_ALVO[c] || c;
    }

    function validarCampoAlvoParaAjuste(ramo, campo, alvo) {
        var r = String(ramo || '').trim().toUpperCase();
        var c = String(campo || '').trim();
        if (r === 'GERAL') {
            var cGeral = c || 'observacoes_gerais';
            if (cGeral !== 'observacoes_gerais') {
                throw new Error('Campo alvo inválido para GERAL: "' + cGeral + '". Permitido: observacoes_gerais.');
            }
            return cGeral;
        }
        var permitidos = obterCamposAlvoPermitidos(r);
        if (!permitidos.length) {
            throw new Error('Ramo não suporta AJUSTAR direto: ' + r);
        }
        if (!c) {
            throw new Error('Campo alvo obrigatório para AJUSTAR em ' + r + '. Campos permitidos: ' + permitidos.join(', ') + '.');
        }
        if (permitidos.indexOf(c) === -1) {
            throw new Error('Campo alvo desconhecido para ' + r + ': "' + c + '". Campos permitidos: ' + permitidos.join(', ') + '.');
        }
        if (r === 'EPI' && c === 'condicao_uso' && alvo && alvo.categoria !== 'EVENTUAL') {
            throw new Error('O campo condicao_uso aplica-se somente a EPI EVENTUAL.');
        }
        return c;
    }

    function lerValorCampoAlvo(ramo, alvo, campo, mapa) {
        var r = String(ramo || '').trim().toUpperCase();
        var c = String(campo || '').trim();
        if (r === 'GERAL') {
            return mapa ? String(mapa.observacoes_gerais || '') : '';
        }
        if (!alvo) return '';
        if (r === 'PERIGO' && c.indexOf('medidas_nr01.') === 0) {
            var sub = c.slice('medidas_nr01.'.length);
            var med = normalizarMedidasNr01(alvo.medidas_nr01);
            return String(med[sub] || '');
        }
        return alvo[c] !== undefined && alvo[c] !== null ? String(alvo[c]) : '';
    }

    function escreverValorCampoAlvo(ramo, alvo, campo, novoValor, mapa) {
        var r = String(ramo || '').trim().toUpperCase();
        var c = validarCampoAlvoParaAjuste(r, campo, alvo);
        var textoLimpo = String(novoValor || '').trim();
        if (r === 'GERAL') {
            mapa.observacoes_gerais = textoLimpo
                ? [mapa.observacoes_gerais, textoLimpo].filter(Boolean).join('\n')
                : String(mapa.observacoes_gerais || '');
            return;
        }
        if (!alvo) {
            throw new Error('Item alvo inexistente para aplicar ajuste em ' + r + '.');
        }
        if (r === 'PERIGO' && c.indexOf('medidas_nr01.') === 0) {
            var sub = c.slice('medidas_nr01.'.length);
            alvo.medidas_nr01 = normalizarMedidasNr01(alvo.medidas_nr01);
            alvo.medidas_nr01[sub] = textoLimpo;
        } else {
            alvo[c] = textoLimpo;
        }
        alvo.status = 'NAO_AVALIADO';
    }

    function mapearIdsParaNomesLista(ids, colecao) {
        if (!Array.isArray(ids) || !ids.length) return [];
        return ids.map(function (id) {
            var obj = (colecao || []).find(function (x) { return x.id === id; });
            return obj ? String(obj.nome || obj.perigo_fonte || id) : String(id);
        });
    }

    function descreverImpactoEfetivoItem(mapa, alvo, ramoOpcional) {
        var ramo = String(ramoOpcional || '').trim().toUpperCase();
        if (ramo === 'FUNCAO' && alvo) {
            var etapasLigadasFn = mapa.etapas
                .filter(function (et) { return Array.isArray(et.funcao_ids) && et.funcao_ids.indexOf(alvo.id) !== -1; })
                .map(function (et) { return et.nome; });
            return {
                suportaFuncoes: false,
                suportaEtapas: false,
                funcoesIds: [alvo.id],
                funcoesNomes: [String(alvo.nome || alvo.id)],
                etapasIds: [],
                etapasNomes: etapasLigadasFn.length ? etapasLigadasFn : ['função completa no mapa']
            };
        }
        var suportaFuncoes = !!(alvo && Array.isArray(alvo.funcao_ids));
        var suportaEtapas = !!(alvo && Array.isArray(alvo.etapa_ids));
        var fnAlvo = suportaFuncoes ? alvo.funcao_ids.slice() : [];
        var etAlvo = suportaEtapas ? alvo.etapa_ids.slice() : [];
        var nomesFn = fnAlvo.length > 0
            ? mapearIdsParaNomesLista(fnAlvo, mapa.funcoes)
            : (function () {
                var ativas = mapa.funcoes.filter(function (f) { return f.status !== 'NAO_APLICAVEL'; }).map(function (f) { return f.nome; });
                return ativas.length ? ativas : ['toda a atividade (item sem funções específicas vinculadas)'];
            })();
        var nomesEt = suportaEtapas
            ? (etAlvo.length > 0 ? mapearIdsParaNomesLista(etAlvo, mapa.etapas) : ['nenhuma etapa avaliada (toda a atividade)'])
            : ['toda a atividade'];
        return {
            suportaFuncoes: suportaFuncoes,
            suportaEtapas: suportaEtapas,
            funcoesIds: fnAlvo,
            funcoesNomes: nomesFn,
            etapasIds: etAlvo,
            etapasNomes: nomesEt
        };
    }

    function descreverFuncoesAtingidasRetirada(mapa, alvo) {
        var imp = descreverImpactoEfetivoItem(mapa, alvo);
        return { ids: imp.funcoesIds, nomes: imp.funcoesNomes, etapasNomes: imp.etapasNomes };
    }

    function avaliarImpactoRecomendacaoEscopo(mapa, rec, alvo) {
        var impacto = descreverImpactoEfetivoItem(mapa, alvo, rec && rec.alvo_ramo);
        var fnAlvo = impacto.funcoesIds;
        var etAlvo = impacto.etapasIds;
        var fnSolic = Array.isArray(rec && rec.funcao_ids_sugeridas) ? rec.funcao_ids_sugeridas.slice() : [];
        var etSolic = Array.isArray(rec && rec.etapa_ids_sugeridas) ? rec.etapa_ids_sugeridas.slice() : [];
        var escRet = String(rec && rec.escopo_retirada || '').trim().toUpperCase();
        var ehParcialExplicita = escRet === 'PARCIAL_FUNCOES';

        var setFnSolic = new Set(fnSolic);
        var outrasFuncoes = fnAlvo.filter(function (id) { return !setFnSolic.has(id); });
        var funcoesEmComum = fnAlvo.filter(function (id) { return setFnSolic.has(id); });

        var setEtSolic = new Set(etSolic);
        var outrasEtapas = etAlvo.filter(function (id) { return !setEtSolic.has(id); });
        var etapasEmComum = etAlvo.filter(function (id) { return setEtSolic.has(id); });

        var nomesFnAlvo = mapearIdsParaNomesLista(fnAlvo, mapa.funcoes);
        var nomesOutrasFn = mapearIdsParaNomesLista(outrasFuncoes, mapa.funcoes);
        var nomesComunsFn = mapearIdsParaNomesLista(funcoesEmComum, mapa.funcoes);
        var nomesFnSolic = mapearIdsParaNomesLista(fnSolic, mapa.funcoes);

        var nomesEtAlvo = mapearIdsParaNomesLista(etAlvo, mapa.etapas);
        var nomesOutrasEt = mapearIdsParaNomesLista(outrasEtapas, mapa.etapas);
        var nomesComunsEt = mapearIdsParaNomesLista(etapasEmComum, mapa.etapas);
        var nomesEtSolic = mapearIdsParaNomesLista(etSolic, mapa.etapas);

        var nomeItem = alvo ? obterNomePrincipalItem(rec.alvo_ramo, alvo) : '(item)';
        var rotuloAtingidos = 'funções [' + impacto.funcoesNomes.join(', ') + '] • etapas [' + impacto.etapasNomes.join(', ') + ']';

        if (!alvo) {
            return {
                modo: 'SEM_ALVO',
                bloqueadoEstrito: false,
                exigeConfirmacaoGlobal: false,
                exigeConfirmacaoAjusteCompartilhado: false,
                funcoesAtingidasNomes: impacto.funcoesNomes,
                etapasAtingidasNomes: impacto.etapasNomes,
                resumoUi: 'Alvo não localizado no mapa.',
                mensagemErro: 'Item alvo não localizado.'
            };
        }

        if (rec.tipo === 'RETIRAR') {
            if (escRet === 'GLOBAL') {
                return {
                    modo: 'RETIRADA_GLOBAL',
                    bloqueadoEstrito: false,
                    exigeConfirmacaoGlobal: true,
                    exigeConfirmacaoAjusteCompartilhado: false,
                    funcoesAtingidasNomes: impacto.funcoesNomes,
                    etapasAtingidasNomes: impacto.etapasNomes,
                    resumoUi: 'Retirada global solicitada: marcará "' + nomeItem + '" como Não aplicável em ' + rotuloAtingidos + ' (exige confirmação global).',
                    mensagemErro: 'Confirmação obrigatória para retirada global: marcar "' + nomeItem + '" como Não aplicável atinge ' + rotuloAtingidos + '. Marque a confirmação de retirada global explícita para prosseguir.'
                };
            }

            if (impacto.suportaEtapas && etSolic.length > 0) {
                if (etAlvo.length === 0) {
                    return {
                        modo: 'BLOQUEADO_ETAPA_NAO_AVALIADA',
                        bloqueadoEstrito: ehParcialExplicita,
                        exigeConfirmacaoGlobal: false,
                        exigeConfirmacaoAjusteCompartilhado: false,
                        funcoesAtingidasNomes: impacto.funcoesNomes,
                        etapasAtingidasNomes: impacto.etapasNomes,
                        resumoUi: 'Bloqueado: "' + nomeItem + '" está sem etapas avaliadas no mapa, enquanto o pedido cita etapa(s) [' + nomesEtSolic.join(', ') + ']. Vincule as etapas reais do item antes de decidir.',
                        mensagemErro: 'Escopo etapa+função não avaliado: "' + nomeItem + '" não possui etapas vinculadas, enquanto a solicitação restringe à etapa [' + nomesEtSolic.join(', ') + ']. Vincule e separe as etapas no item antes de decidir para não ampliar a retirada para toda a atividade.'
                    };
                }
                if (etapasEmComum.length === 0) {
                    return {
                        modo: 'BLOQUEADO_ETAPA_NAO_VINCULADA',
                        bloqueadoEstrito: ehParcialExplicita,
                        exigeConfirmacaoGlobal: false,
                        exigeConfirmacaoAjusteCompartilhado: false,
                        funcoesAtingidasNomes: impacto.funcoesNomes,
                        etapasAtingidasNomes: impacto.etapasNomes,
                        resumoUi: 'Bloqueado: etapa(s) citada(s) [' + nomesEtSolic.join(', ') + '] não estão vinculadas a "' + nomeItem + '" (vinculado apenas a [' + nomesEtAlvo.join(', ') + ']).',
                        mensagemErro: 'Etapa não vinculada ao item: a retirada cita [' + nomesEtSolic.join(', ') + '], mas "' + nomeItem + '" está vinculado apenas a [' + nomesEtAlvo.join(', ') + '].'
                    };
                }
                if (outrasEtapas.length > 0 && etapasEmComum.length > 0) {
                    if (fnAlvo.length > 0 && fnSolic.length > 0 && outrasFuncoes.length > 0 && funcoesEmComum.length > 0) {
                        return {
                            modo: 'BLOQUEADO_ESCOPO_COMBINADO',
                            bloqueadoEstrito: ehParcialExplicita,
                            exigeConfirmacaoGlobal: false,
                            exigeConfirmacaoAjusteCompartilhado: false,
                            funcoesAtingidasNomes: impacto.funcoesNomes,
                            etapasAtingidasNomes: impacto.etapasNomes,
                            resumoUi: 'Bloqueado (escopo função × etapa): retirar apenas [' + nomesComunsFn.join(', ') + '] na etapa [' + nomesComunsEt.join(', ') + '] removeria também sua exposição em [' + nomesOutrasEt.join(', ') + ']. Separe o item por etapa antes de decidir.',
                            mensagemErro: 'Bloqueio de escopo combinado (função × etapa): "' + nomeItem + '" abrange funções [' + nomesFnAlvo.join(', ') + '] nas etapas [' + nomesEtAlvo.join(', ') + ']. Remover [' + nomesComunsFn.join(', ') + '] apenas porque o pedido cita [' + nomesComunsEt.join(', ') + '] também retiraria sua exposição em [' + nomesOutrasEt.join(', ') + ']. Separe o item por etapa (ou ajuste os vínculos por etapa) antes de decidir.'
                        };
                    }
                    if (fnAlvo.length > 0 && fnSolic.length > 0 && outrasFuncoes.length > 0 && funcoesEmComum.length === 0) {
                        return {
                            modo: 'BLOQUEADO_FUNCAO_NAO_VINCULADA',
                            bloqueadoEstrito: ehParcialExplicita,
                            exigeConfirmacaoGlobal: false,
                            exigeConfirmacaoAjusteCompartilhado: false,
                            funcoesAtingidasNomes: impacto.funcoesNomes,
                            etapasAtingidasNomes: impacto.etapasNomes,
                            resumoUi: 'Proteção de equipe mista: item vinculado a [' + nomesOutrasFn.join(', ') + '] e não às funções citadas [' + nomesFnSolic.join(', ') + '].',
                            mensagemErro: 'Proteção de equipe mista: este item está vinculado apenas às funções [' + nomesOutrasFn.join(', ') + '] e não às funções citadas na retirada [' + nomesFnSolic.join(', ') + ']. Rejeite a retirada global ou confirme retirada global explícita.'
                        };
                    }
                    if (fnAlvo.length > 0 && fnSolic.length === 0) {
                        return {
                            modo: 'BLOQUEADO_SUBCONJUNTO_ETAPA_SEM_FUNCAO',
                            bloqueadoEstrito: ehParcialExplicita,
                            exigeConfirmacaoGlobal: false,
                            exigeConfirmacaoAjusteCompartilhado: false,
                            funcoesAtingidasNomes: impacto.funcoesNomes,
                            etapasAtingidasNomes: impacto.etapasNomes,
                            resumoUi: 'Bloqueado: pedido cita apenas a(s) etapa(s) [' + nomesComunsEt.join(', ') + '] em item compartilhado por [' + nomesFnAlvo.join(', ') + '] sem especificar funções. Separe o item por etapa ou especifique todas as funções atingidas.',
                            mensagemErro: 'Bloqueio de subconjunto de etapa sem função: "' + nomeItem + '" atende funções [' + nomesFnAlvo.join(', ') + '] nas etapas [' + nomesEtAlvo.join(', ') + ']. Remover etapa(s) [' + nomesComunsEt.join(', ') + '] afetaria todas essas funções. Separe o item por etapa ou indique explicitamente as funções.'
                        };
                    }
                    if ((fnAlvo.length === 0 && fnSolic.length === 0) || (fnAlvo.length > 0 && outrasFuncoes.length === 0 && funcoesEmComum.length === fnAlvo.length)) {
                        return {
                            modo: 'DESVINCULAR_ETAPAS',
                            bloqueadoEstrito: false,
                            exigeConfirmacaoGlobal: false,
                            exigeConfirmacaoAjusteCompartilhado: false,
                            etapasRestantes: outrasEtapas,
                            etapasRemovidas: etapasEmComum,
                            nomesOutrasEt: nomesOutrasEt,
                            nomesComunsEt: nomesComunsEt,
                            nomesEtAlvo: nomesEtAlvo,
                            funcoesAtingidasNomes: impacto.funcoesNomes,
                            etapasAtingidasNomes: nomesComunsEt,
                            resumoUi: 'Desvinculação por etapa: removerá etapa(s) [' + nomesComunsEt.join(', ') + '] e manterá "' + nomeItem + '" ativo em [' + nomesOutrasEt.join(', ') + '] para [' + impacto.funcoesNomes.join(', ') + '].',
                            mensagemErro: ''
                        };
                    }
                }
            }

            if (fnAlvo.length > 0 && fnSolic.length > 0) {
                if (outrasFuncoes.length > 0 && funcoesEmComum.length === 0) {
                    return {
                        modo: 'BLOQUEADO_FUNCAO_NAO_VINCULADA',
                        bloqueadoEstrito: ehParcialExplicita,
                        exigeConfirmacaoGlobal: false,
                        exigeConfirmacaoAjusteCompartilhado: false,
                        funcoesAtingidasNomes: impacto.funcoesNomes,
                        etapasAtingidasNomes: impacto.etapasNomes,
                        resumoUi: 'Proteção de equipe mista: item vinculado apenas a [' + nomesOutrasFn.join(', ') + '] (etapas: [' + impacto.etapasNomes.join(', ') + ']) e não a [' + nomesFnSolic.join(', ') + '].',
                        mensagemErro: 'Proteção de equipe mista: este item está vinculado apenas às funções [' + nomesOutrasFn.join(', ') + '] e não às funções citadas na retirada [' + nomesFnSolic.join(', ') + ']. Rejeite a retirada global ou confirme retirada global explícita.'
                    };
                }
                if (outrasFuncoes.length > 0 && funcoesEmComum.length > 0) {
                    return {
                        modo: 'DESVINCULAR_FUNCOES',
                        bloqueadoEstrito: false,
                        exigeConfirmacaoGlobal: false,
                        exigeConfirmacaoAjusteCompartilhado: false,
                        funcoesRestantes: outrasFuncoes,
                        funcoesRemovidas: funcoesEmComum,
                        nomesOutrasFn: nomesOutrasFn,
                        nomesComunsFn: nomesComunsFn,
                        funcoesAtingidasNomes: nomesComunsFn,
                        etapasAtingidasNomes: impacto.etapasNomes,
                        resumoUi: 'Desvinculação por função: removerá apenas [' + nomesComunsFn.join(', ') + '] (em [' + impacto.etapasNomes.join(', ') + ']) e manterá "' + nomeItem + '" ativo para [' + nomesOutrasFn.join(', ') + '].',
                        mensagemErro: ''
                    };
                }
            }

            return {
                modo: 'RETIRADA_GLOBAL',
                bloqueadoEstrito: false,
                exigeConfirmacaoGlobal: true,
                exigeConfirmacaoAjusteCompartilhado: false,
                funcoesAtingidasNomes: impacto.funcoesNomes,
                etapasAtingidasNomes: impacto.etapasNomes,
                resumoUi: 'Retirada global: marcará "' + nomeItem + '" como Não aplicável em ' + rotuloAtingidos + ' (exige confirmação global).',
                mensagemErro: 'Confirmação obrigatória para retirada global: marcar "' + nomeItem + '" como Não aplicável atinge ' + rotuloAtingidos + '. Marque a confirmação de retirada global explícita para prosseguir.'
            };
        }

        if (rec.tipo === 'AJUSTAR' && rec.alvo_ramo !== 'GERAL') {
            if ((fnSolic.length > 0 && fnAlvo.length > 0 && funcoesEmComum.length === 0) ||
                (impacto.suportaEtapas && etSolic.length > 0 && etAlvo.length > 0 && etapasEmComum.length === 0)) {
                return {
                    modo: 'AJUSTE_BLOQUEADO_ESCOPO_NAO_VINCULADO',
                    bloqueadoEstrito: true,
                    exigeConfirmacaoGlobal: false,
                    exigeConfirmacaoAjusteCompartilhado: false,
                    funcoesAtingidasNomes: impacto.funcoesNomes,
                    etapasAtingidasNomes: impacto.etapasNomes,
                    resumoUi: 'Bloqueado para ajuste: o escopo citado na recomendação não pertence a "' + nomeItem + '" (' + rotuloAtingidos + ').',
                    mensagemErro: 'Ajuste bloqueado por escopo incompatível: a recomendação cita função/etapa não vinculada a "' + nomeItem + '" (' + rotuloAtingidos + '). Separe o item ou corrija o escopo antes de aceitar.'
                };
            }
            var compartilhaMaisFn = (fnSolic.length > 0 && (fnAlvo.length === 0 || outrasFuncoes.length > 0)) || (fnAlvo.length > 1 && fnSolic.length === 0);
            var compartilhaMaisEt = (impacto.suportaEtapas && etSolic.length > 0 && (etAlvo.length === 0 || outrasEtapas.length > 0)) || (impacto.suportaEtapas && etAlvo.length > 1 && etSolic.length === 0);
            if (compartilhaMaisFn || compartilhaMaisEt) {
                return {
                    modo: 'AJUSTE_COMPARTILHADO_EXIGE_CONFIRMACAO',
                    bloqueadoEstrito: false,
                    exigeConfirmacaoGlobal: false,
                    exigeConfirmacaoAjusteCompartilhado: true,
                    funcoesAtingidasNomes: impacto.funcoesNomes,
                    etapasAtingidasNomes: impacto.etapasNomes,
                    resumoUi: 'Atenção — item compartilhado: alterar "' + (rec.campo_alvo || 'campo') + '" em "' + nomeItem + '" afetará ' + rotuloAtingidos + '. Separe o item por função/etapa antes ou confirme o ajuste compartilhado.',
                    mensagemErro: 'Confirmação obrigatória para ajuste em item compartilhado: modificar "' + (rec.campo_alvo || 'campo') + '" em "' + nomeItem + '" alterará o texto para ' + rotuloAtingidos + '. Separe o item por função/etapa antes ou confirme explicitamente o ajuste compartilhado.'
                };
            }
            return {
                modo: 'AJUSTE_DIRETO',
                bloqueadoEstrito: false,
                exigeConfirmacaoGlobal: false,
                exigeConfirmacaoAjusteCompartilhado: false,
                funcoesAtingidasNomes: impacto.funcoesNomes,
                etapasAtingidasNomes: impacto.etapasNomes,
                resumoUi: 'Ajuste direto em "' + (rec.campo_alvo || 'campo') + '" de "' + nomeItem + '" (' + rotuloAtingidos + ').',
                mensagemErro: ''
            };
        }

        return {
            modo: 'OUTRO',
            bloqueadoEstrito: false,
            exigeConfirmacaoGlobal: false,
            exigeConfirmacaoAjusteCompartilhado: false,
            funcoesAtingidasNomes: impacto.funcoesNomes,
            etapasAtingidasNomes: impacto.etapasNomes,
            resumoUi: '',
            mensagemErro: ''
        };
    }

    function obterLabelStatusItem(status) {
        if (status === 'CONFIRMADO') return 'Confirmado';
        if (status === 'NAO_APLICAVEL') return 'Não aplicável';
        return 'Não avaliado';
    }

    function obterLabelCondicaoEpi(statusCond) {
        if (statusCond === 'APLICAVEL') return 'Condição confirmada';
        if (statusCond === 'NAO_APLICAVEL') return 'Condição não aplicável';
        return 'Condição pendente';
    }

    function obterCorBadgeStatus(status) {
        if (status === 'CONFIRMADO' || status === 'APLICAVEL' || status === 'ACEITA' || status === 'ACEITA_COM_EDICAO') {
            return { bg: '#dcfce7', fg: '#166534' };
        }
        if (status === 'NAO_APLICAVEL' || status === 'REJEITADA') {
            return { bg: '#fee2e2', fg: '#991b1b' };
        }
        return { bg: '#fef3c7', fg: '#92400e' };
    }

    function obterLabelFaseOpcional(faseId) {
        var achado = FASES_ROTEIRO_OPCIONAIS.find(function (f) { return f.id === faseId; });
        return achado ? achado.label : '';
    }

    // =========================================================================
    // 4. CRUD DOS MAPAS E DOS 6 RAMOS VINCULADOS
    // =========================================================================
    function criarOuAtualizarMapaMental(dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('criar ou atualizar mapas mentais');
        dados = dados || {};
        var atividade = String(dados.atividade || '').trim();
        if (!atividade) throw new Error('Informe o nome da Atividade / Tarefa central do mapa.');

        var erroProibido = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroProibido) throw new Error(erroProibido);

        return executarMutacaoMapaPersistida(function () {
            var s = obterSessaoSeguraMapa() || {};
            var existente = dados.id ? exigirMapaEConcorrencia(dados.id, dados.versaoEsperada) : null;

            if (existente) {
                existente.atividade = atividade;
                if (dados.frente_local !== undefined) existente.frente_local = String(dados.frente_local || '').trim();
                if (dados.apr_referencia_texto !== undefined) existente.apr_referencia_texto = String(dados.apr_referencia_texto || '').trim();
                if (dados.observacoes_gerais !== undefined) existente.observacoes_gerais = String(dados.observacoes_gerais || '').trim();
                tocarVersaoMapa(existente);
                return clonarProfundo(existente);
            }

            if (estadoMapa.mapas.length >= LIMITE_MAX_MAPAS) {
                throw new Error('Limite local de ' + LIMITE_MAX_MAPAS + ' mapas atingido. Exclua um mapa antigo ou faça backup antes de criar outro.');
            }

            var novoMapa = {
                id: gerarIdMapa('mapa'),
                versao: 1,
                codigo_mapa: String(dados.codigo_mapa || ('MAPA-' + String(estadoMapa.mapas.length + 1).padStart(3, '0'))).trim(),
                atividade: atividade,
                frente_local: String(dados.frente_local || '').trim(),
                apr_referencia_texto: String(dados.apr_referencia_texto || '').trim(),
                observacoes_gerais: String(dados.observacoes_gerais || '').trim(),
                status_mapa: 'RASCUNHO_MAPA',
                funcoes: [],
                ferramentas: [],
                etapas: [],
                epis: [],
                perigos: [],
                recomendacoes: [],
                criado_por_matricula: String(s.matricula || ''),
                updated_at: new Date().toISOString()
            };

            // Importação opcional de listas livres coladas pelo usuário: preserva 100% do texto, sempre NAO_AVALIADO
            dividirListaTextoLivre(dados.funcoes_texto).forEach(function (nomeFn) {
                novoMapa.funcoes.push({
                    id: gerarIdMapa('fn'),
                    nome: nomeFn,
                    ghe_ref_leitura: buscarReferenciaGhePorFuncao(nomeFn),
                    nota_exposicao: '',
                    status: 'NAO_AVALIADO'
                });
            });
            dividirListaTextoLivre(dados.ferramentas_texto).forEach(function (nomeFer) {
                novoMapa.ferramentas.push({
                    id: gerarIdMapa('fer'),
                    nome: nomeFer,
                    etapa_ids: [],
                    funcao_ids: [],
                    status: 'NAO_AVALIADO',
                    observacao: ''
                });
            });
            dividirListaTextoLivre(dados.etapas_texto).forEach(function (nomeEt, idx) {
                novoMapa.etapas.push({
                    id: gerarIdMapa('et'),
                    ordem: idx + 1,
                    nome: nomeEt,
                    fase_roteiro_opcional: '',
                    funcao_ids: [],
                    ferramenta_ids: [],
                    status: 'NAO_AVALIADO',
                    observacao: ''
                });
            });
            dividirListaTextoLivre(dados.epis_obrigatorios_texto).forEach(function (nomeEpi) {
                novoMapa.epis.push({
                    id: gerarIdMapa('epi'),
                    nome: nomeEpi,
                    categoria: 'OBRIGATORIO',
                    condicao_uso: '',
                    status_condicao: 'NAO_APLICAVEL',
                    etapa_ids: [],
                    funcao_ids: [],
                    status: 'NAO_AVALIADO',
                    observacao: ''
                });
            });
            dividirListaTextoLivre(dados.epis_eventuais_texto).forEach(function (nomeEpiEv) {
                novoMapa.epis.push({
                    id: gerarIdMapa('epi'),
                    nome: nomeEpiEv,
                    categoria: 'EVENTUAL',
                    condicao_uso: '',
                    status_condicao: 'PENDENTE',
                    etapa_ids: [],
                    funcao_ids: [],
                    status: 'NAO_AVALIADO',
                    observacao: ''
                });
            });
            dividirListaTextoLivre(dados.perigos_texto).forEach(function (perTxt) {
                novoMapa.perigos.push({
                    id: gerarIdMapa('per'),
                    perigo_fonte: perTxt,
                    etapa_ids: [],
                    funcao_ids: [],
                    ferramenta_ids: [],
                    evento_risco: '',
                    danos_provaveis: '',
                    medidas_nr01: normalizarMedidasNr01(null),
                    status: 'NAO_AVALIADO',
                    observacao: ''
                });
            });

            estadoMapa.mapas.unshift(novoMapa);
            estadoMapa.mapaSelecionadoId = novoMapa.id;
            return clonarProfundo(novoMapa);
        });
    }

    function excluirMapaMental(mapaId, versaoEsperada) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('excluir mapas mentais');
        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, versaoEsperada);
            estadoMapa.mapas = estadoMapa.mapas.filter(function (m) { return m.id !== mapa.id; });
            if (estadoMapa.mapaSelecionadoId === mapa.id) {
                estadoMapa.mapaSelecionadoId = estadoMapa.mapas[0] ? estadoMapa.mapas[0].id : '';
            }
            resetarControlesVisuaisMapa();
            return true;
        });
    }

    function salvarFuncaoMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('editar funções do mapa');
        dados = dados || {};
        var nome = String(dados.nome || '').trim();
        if (!nome) throw new Error('Informe o nome da Função.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var existente = dados.id ? mapa.funcoes.find(function (f) { return f.id === dados.id; }) : null;
            var gheRef = buscarReferenciaGhePorFuncao(nome);
            if (existente) {
                existente.nome = nome;
                existente.ghe_ref_leitura = dados.ghe_ref_leitura !== undefined ? String(dados.ghe_ref_leitura || '').trim() : gheRef;
                if (dados.nota_exposicao !== undefined) existente.nota_exposicao = String(dados.nota_exposicao || '').trim();
                if (dados.status !== undefined) existente.status = normalizarStatusItem(dados.status);
                tocarVersaoMapa(mapa);
                return clonarProfundo(existente);
            }
            var nova = {
                id: gerarIdMapa('fn'),
                nome: nome,
                ghe_ref_leitura: dados.ghe_ref_leitura !== undefined ? String(dados.ghe_ref_leitura || '').trim() : gheRef,
                nota_exposicao: String(dados.nota_exposicao || '').trim(),
                status: normalizarStatusItem(dados.status || 'NAO_AVALIADO')
            };
            mapa.funcoes.push(nova);
            tocarVersaoMapa(mapa);
            return clonarProfundo(nova);
        });
    }

    function salvarFerramentaMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('editar ferramentas do mapa');
        dados = dados || {};
        var nome = String(dados.nome || '').trim();
        if (!nome) throw new Error('Informe o nome da Ferramenta / Equipamento.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var etapaIds = filtrarIdsValidos(dados.etapa_ids, mapa.etapas);
            var funcaoIds = filtrarIdsValidos(dados.funcao_ids, mapa.funcoes);
            var existente = dados.id ? mapa.ferramentas.find(function (f) { return f.id === dados.id; }) : null;
            if (existente) {
                existente.nome = nome;
                if (dados.etapa_ids !== undefined) existente.etapa_ids = etapaIds;
                if (dados.funcao_ids !== undefined) existente.funcao_ids = funcaoIds;
                if (dados.observacao !== undefined) existente.observacao = String(dados.observacao || '').trim();
                if (dados.status !== undefined) existente.status = normalizarStatusItem(dados.status);
                tocarVersaoMapa(mapa);
                return clonarProfundo(existente);
            }
            var nova = {
                id: gerarIdMapa('fer'),
                nome: nome,
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                status: normalizarStatusItem(dados.status || 'NAO_AVALIADO'),
                observacao: String(dados.observacao || '').trim()
            };
            mapa.ferramentas.push(nova);
            tocarVersaoMapa(mapa);
            return clonarProfundo(nova);
        });
    }

    function salvarEtapaMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('editar etapas do mapa');
        dados = dados || {};
        var nome = String(dados.nome || '').trim();
        if (!nome) throw new Error('Informe o nome da Etapa.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var faseOp = String(dados.fase_roteiro_opcional || '').trim();
            if (faseOp && !FASES_ROTEIRO_OPCIONAIS.some(function (f) { return f.id === faseOp; })) {
                faseOp = '';
            }
            var funcaoIds = filtrarIdsValidos(dados.funcao_ids, mapa.funcoes);
            var ferramentaIds = filtrarIdsValidos(dados.ferramenta_ids, mapa.ferramentas);
            var existente = dados.id ? mapa.etapas.find(function (e) { return e.id === dados.id; }) : null;
            if (existente) {
                existente.nome = nome;
                if (dados.fase_roteiro_opcional !== undefined) existente.fase_roteiro_opcional = faseOp;
                if (dados.funcao_ids !== undefined) existente.funcao_ids = funcaoIds;
                if (dados.ferramenta_ids !== undefined) existente.ferramenta_ids = ferramentaIds;
                if (dados.observacao !== undefined) existente.observacao = String(dados.observacao || '').trim();
                if (dados.status !== undefined) existente.status = normalizarStatusItem(dados.status);
                tocarVersaoMapa(mapa);
                return clonarProfundo(existente);
            }
            var nova = {
                id: gerarIdMapa('et'),
                ordem: mapa.etapas.length + 1,
                nome: nome,
                fase_roteiro_opcional: faseOp,
                funcao_ids: funcaoIds,
                ferramenta_ids: ferramentaIds,
                status: normalizarStatusItem(dados.status || 'NAO_AVALIADO'),
                observacao: String(dados.observacao || '').trim()
            };
            mapa.etapas.push(nova);
            tocarVersaoMapa(mapa);
            return clonarProfundo(nova);
        });
    }

    function reordenarEtapaMapa(mapaId, etapaId, direcao, versaoEsperada) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('reordenar etapas do mapa');
        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, versaoEsperada);
            var idx = mapa.etapas.findIndex(function (e) { return e.id === etapaId; });
            if (idx === -1) throw new Error('Etapa não encontrada para reordenação.');
            var alvoIdx = direcao === 'subir' ? idx - 1 : (direcao === 'descer' ? idx + 1 : -1);
            if (alvoIdx < 0 || alvoIdx >= mapa.etapas.length) {
                return clonarProfundo(mapa.etapas);
            }
            var tmp = mapa.etapas[idx];
            mapa.etapas[idx] = mapa.etapas[alvoIdx];
            mapa.etapas[alvoIdx] = tmp;
            mapa.etapas.forEach(function (e, i) { e.ordem = i + 1; });
            tocarVersaoMapa(mapa);
            return clonarProfundo(mapa.etapas);
        });
    }

    function salvarEpiMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('editar EPIs do mapa');
        dados = dados || {};
        var nome = String(dados.nome || '').trim();
        if (!nome) throw new Error('Informe o nome do EPI.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var categoria = String(dados.categoria || 'OBRIGATORIO').trim().toUpperCase() === 'EVENTUAL' ? 'EVENTUAL' : 'OBRIGATORIO';
            var etapaIds = filtrarIdsValidos(dados.etapa_ids, mapa.etapas);
            var funcaoIds = filtrarIdsValidos(dados.funcao_ids, mapa.funcoes);
            var existente = dados.id ? mapa.epis.find(function (e) { return e.id === dados.id; }) : null;
            if (existente) {
                existente.nome = nome;
                existente.categoria = categoria;
                if (dados.condicao_uso !== undefined) existente.condicao_uso = String(dados.condicao_uso || '').trim();
                if (dados.status_condicao !== undefined) {
                    existente.status_condicao = normalizarStatusCondicaoEpi(dados.status_condicao);
                } else if (categoria === 'EVENTUAL' && !STATUS_CONDICAO_EPI_VALIDOS.has(existente.status_condicao)) {
                    existente.status_condicao = 'PENDENTE';
                }
                if (dados.etapa_ids !== undefined) existente.etapa_ids = etapaIds;
                if (dados.funcao_ids !== undefined) existente.funcao_ids = funcaoIds;
                if (dados.observacao !== undefined) existente.observacao = String(dados.observacao || '').trim();
                if (dados.status !== undefined) existente.status = normalizarStatusItem(dados.status);
                tocarVersaoMapa(mapa);
                return clonarProfundo(existente);
            }
            var nova = {
                id: gerarIdMapa('epi'),
                nome: nome,
                categoria: categoria,
                condicao_uso: String(dados.condicao_uso || '').trim(),
                status_condicao: categoria === 'EVENTUAL'
                    ? normalizarStatusCondicaoEpi(dados.status_condicao || 'PENDENTE')
                    : 'NAO_APLICAVEL',
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                status: normalizarStatusItem(dados.status || 'NAO_AVALIADO'),
                observacao: String(dados.observacao || '').trim()
            };
            mapa.epis.push(nova);
            tocarVersaoMapa(mapa);
            return clonarProfundo(nova);
        });
    }

    function salvarPerigoMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('editar perigos do mapa');
        dados = dados || {};
        var perigoFonte = String(dados.perigo_fonte || '').trim();
        if (!perigoFonte) throw new Error('Informe o Perigo / Fonte.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var etapaIds = filtrarIdsValidos(dados.etapa_ids, mapa.etapas);
            var funcaoIds = filtrarIdsValidos(dados.funcao_ids, mapa.funcoes);
            var ferramentaIds = filtrarIdsValidos(dados.ferramenta_ids, mapa.ferramentas);
            var existente = dados.id ? mapa.perigos.find(function (p) { return p.id === dados.id; }) : null;
            if (existente) {
                existente.perigo_fonte = perigoFonte;
                if (dados.etapa_ids !== undefined) existente.etapa_ids = etapaIds;
                if (dados.funcao_ids !== undefined) existente.funcao_ids = funcaoIds;
                if (dados.ferramenta_ids !== undefined) existente.ferramenta_ids = ferramentaIds;
                if (dados.evento_risco !== undefined) existente.evento_risco = String(dados.evento_risco || '').trim();
                if (dados.danos_provaveis !== undefined) existente.danos_provaveis = String(dados.danos_provaveis || '').trim();
                if (dados.medidas_nr01 !== undefined) existente.medidas_nr01 = normalizarMedidasNr01(dados.medidas_nr01);
                if (dados.observacao !== undefined) existente.observacao = String(dados.observacao || '').trim();
                if (dados.status !== undefined) existente.status = normalizarStatusItem(dados.status);
                tocarVersaoMapa(mapa);
                return clonarProfundo(existente);
            }
            // Campos técnicos não preenchidos permanecem vazios; nenhum completador automático é acionado.
            var novo = {
                id: gerarIdMapa('per'),
                perigo_fonte: perigoFonte,
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                ferramenta_ids: ferramentaIds,
                evento_risco: String(dados.evento_risco || '').trim(),
                danos_provaveis: String(dados.danos_provaveis || '').trim(),
                medidas_nr01: normalizarMedidasNr01(dados.medidas_nr01),
                status: normalizarStatusItem(dados.status || 'NAO_AVALIADO'),
                observacao: String(dados.observacao || '').trim()
            };
            mapa.perigos.push(novo);
            tocarVersaoMapa(mapa);
            return clonarProfundo(novo);
        });
    }

    function alterarStatusItemMapa(mapaId, ramo, itemId, novoStatus, opcoes) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('alterar o status do item no mapa');
        opcoes = opcoes || {};
        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, opcoes.versaoEsperada);
            var item = localizarItemPorRamo(mapa, ramo, itemId);
            if (!item) throw new Error('Item não encontrado no ramo ' + String(ramo || '') + '.');
            if (novoStatus !== undefined && novoStatus !== null) {
                item.status = normalizarStatusItem(novoStatus);
            }
            if (ramo === 'EPI' && item.categoria === 'EVENTUAL' && opcoes.statusCondicao !== undefined) {
                item.status_condicao = normalizarStatusCondicaoEpi(opcoes.statusCondicao);
            }
            tocarVersaoMapa(mapa);
            return clonarProfundo(item);
        });
    }

    function removerItemMapa(mapaId, ramo, itemId, versaoEsperada) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('remover item do mapa');
        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, versaoEsperada);
            var col = mapearListaParaColecao(ramo, mapa, itemId);
            var idx = col.findIndex(function (it) { return it.id === itemId; });
            if (idx === -1) throw new Error('Item não encontrado para remoção.');
            col.splice(idx, 1);
            limparReferenciasOrfasDoMapa(mapa);
            tocarVersaoMapa(mapa);
            return true;
        });
    }

    // =========================================================================
    // 5. RECOMENDAÇÕES (INCLUIR / RETIRAR / AJUSTAR / PERGUNTAS) & DECISÃO
    // =========================================================================
    function criarRegistroRecomendacao(mapa, dados, matricula) {
        var tipo = String(dados.tipo || 'AJUSTAR').trim().toUpperCase();
        if (!TIPOS_RECOMENDACAO_VALIDOS.has(tipo)) tipo = 'AJUSTAR';
        var alvoRamo = String(dados.alvo_ramo || 'PERIGO').trim().toUpperCase();
        if (!RAMOS_ALVO_VALIDOS.has(alvoRamo)) alvoRamo = 'GERAL';
        var origem = String(dados.origem || 'SOLICITACAO_TERCEIRO').trim().toUpperCase();
        if (!ORIGENS_RECOMENDACAO_VALIDAS.has(origem)) origem = 'SOLICITACAO_TERCEIRO';
        var escRet = String(dados.escopo_retirada || '').trim().toUpperCase();
        if (escRet !== 'GLOBAL' && escRet !== 'PARCIAL_FUNCOES') escRet = '';

        return {
            id: gerarIdMapa('rec'),
            tipo: tipo,
            alvo_ramo: alvoRamo,
            alvo_item_id: String(dados.alvo_item_id || '').trim(),
            campo_alvo: String(dados.campo_alvo || '').trim(),
            escopo_retirada: escRet,
            origem: origem,
            solicitante_papel: String(dados.solicitante_papel || '').trim(),
            titulo: String(dados.titulo || dados.descricao_proposta || 'Recomendação técnica').trim(),
            descricao_proposta: String(dados.descricao_proposta || dados.titulo || '').trim(),
            justificativa: String(dados.justificativa || '').trim(),
            categoria_epi: String(dados.categoria_epi || '').trim().toUpperCase() === 'EVENTUAL' ? 'EVENTUAL' : 'OBRIGATORIO',
            condicao_uso: String(dados.condicao_uso || '').trim(),
            etapa_ids_sugeridas: filtrarIdsValidos(dados.etapa_ids_sugeridas, mapa.etapas),
            funcao_ids_sugeridas: filtrarIdsValidos(dados.funcao_ids_sugeridas, mapa.funcoes),
            funcoes_nao_resolvidas: normalizarListaStringsUnicas(dados.funcoes_nao_resolvidas),
            etapas_nao_resolvidas: normalizarListaStringsUnicas(dados.etapas_nao_resolvidas),
            funcoes_originais_nao_resolvidas: normalizarListaStringsUnicas(dados.funcoes_originais_nao_resolvidas),
            etapas_originais_nao_resolvidas: normalizarListaStringsUnicas(dados.etapas_originais_nao_resolvidas),
            alvo_status_origem: String(dados.alvo_status_origem || '').trim().toUpperCase(),
            alvo_candidatos_ambiguos: Array.isArray(dados.alvo_candidatos_ambiguos)
                ? dados.alvo_candidatos_ambiguos.map(function (c) {
                    return { id: String(c && c.id || ''), nome: String(c && c.nome || '') };
                })
                : [],
            perguntas_abertas: Array.isArray(dados.perguntas_abertas)
                ? dados.perguntas_abertas.map(function (p) { return String(p || '').trim(); }).filter(Boolean)
                : dividirListaTextoLivre(dados.perguntas_abertas),
            chave_dedup: String(dados.chave_dedup || '').trim(),
            status_decisao: 'PENDENTE',
            decisao_nota: '',
            texto_editado: '',
            valor_anterior: dados.valor_anterior !== undefined ? dados.valor_anterior : null,
            valor_aplicado: dados.valor_aplicado !== undefined ? dados.valor_aplicado : null,
            snapshot_antes: dados.snapshot_antes ? clonarProfundo(dados.snapshot_antes) : null,
            snapshot_depois: dados.snapshot_depois ? clonarProfundo(dados.snapshot_depois) : null,
            escopo_resolvido_em: String(dados.escopo_resolvido_em || '').trim(),
            decidido_por_matricula: '',
            decidido_em: '',
            criado_por_matricula: String(matricula || ''),
            created_at: new Date().toISOString()
        };
    }

    function registrarRecomendacaoMapa(mapaId, dados) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('registrar recomendações no mapa');
        dados = dados || {};
        var titulo = String(dados.titulo || '').trim();
        var desc = String(dados.descricao_proposta || '').trim();
        if (!titulo && !desc) throw new Error('Informe o resumo ou a descrição da recomendação.');
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(dados));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var s = obterSessaoSeguraMapa() || {};
            var mapa = exigirMapaEConcorrencia(mapaId, dados.versaoEsperada);
            var rec = criarRegistroRecomendacao(mapa, dados, s.matricula || '');
            mapa.recomendacoes.unshift(rec);
            tocarVersaoMapa(mapa);
            return clonarProfundo(rec);
        });
    }

    function aplicarInclusaoPorRecomendacao(mapa, rec, textoFinal, opcoes) {
        var ramo = rec.alvo_ramo;
        var etapaIds = filtrarIdsValidos((opcoes && opcoes.etapa_ids) || rec.etapa_ids_sugeridas, mapa.etapas);
        var funcaoIds = filtrarIdsValidos((opcoes && opcoes.funcao_ids) || rec.funcao_ids_sugeridas, mapa.funcoes);
        var novo;

        if (ramo === 'FUNCAO') {
            novo = {
                id: gerarIdMapa('fn'),
                nome: textoFinal,
                ghe_ref_leitura: buscarReferenciaGhePorFuncao(textoFinal),
                nota_exposicao: rec.justificativa || '',
                status: 'NAO_AVALIADO'
            };
            mapa.funcoes.push(novo);
            return novo;
        }
        if (ramo === 'FERRAMENTA') {
            novo = {
                id: gerarIdMapa('fer'),
                nome: textoFinal,
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                status: 'NAO_AVALIADO',
                observacao: '[Incluído via recomendação ' + rec.id + '] ' + (rec.justificativa || '')
            };
            mapa.ferramentas.push(novo);
            return novo;
        }
        if (ramo === 'ETAPA') {
            novo = {
                id: gerarIdMapa('et'),
                ordem: mapa.etapas.length + 1,
                nome: textoFinal,
                fase_roteiro_opcional: '',
                funcao_ids: funcaoIds,
                ferramenta_ids: [],
                status: 'NAO_AVALIADO',
                observacao: '[Incluído via recomendação ' + rec.id + '] ' + (rec.justificativa || '')
            };
            mapa.etapas.push(novo);
            return novo;
        }
        if (ramo === 'EPI') {
            var ehEventual = rec.categoria_epi === 'EVENTUAL';
            novo = {
                id: gerarIdMapa('epi'),
                nome: textoFinal,
                categoria: ehEventual ? 'EVENTUAL' : 'OBRIGATORIO',
                condicao_uso: ehEventual ? String(rec.condicao_uso || '').trim() : '',
                status_condicao: ehEventual ? 'PENDENTE' : 'NAO_APLICAVEL',
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                status: 'NAO_AVALIADO',
                observacao: '[Incluído via recomendação ' + rec.id + '] ' + (rec.justificativa || '')
            };
            mapa.epis.push(novo);
            return novo;
        }
        if (ramo === 'PERIGO') {
            novo = {
                id: gerarIdMapa('per'),
                perigo_fonte: textoFinal,
                etapa_ids: etapaIds,
                funcao_ids: funcaoIds,
                ferramenta_ids: [],
                evento_risco: '',
                danos_provaveis: '',
                medidas_nr01: normalizarMedidasNr01(null),
                status: 'NAO_AVALIADO',
                observacao: '[Incluído via recomendação ' + rec.id + '] ' + (rec.justificativa || '')
            };
            mapa.perigos.push(novo);
            return novo;
        }
        // GERAL
        mapa.observacoes_gerais = [mapa.observacoes_gerais, '[Inclusão ' + rec.id + '] ' + textoFinal].filter(Boolean).join('\n');
        return { observacoes_gerais: mapa.observacoes_gerais };
    }

    function aplicarAjustePorRecomendacao(rec, alvo, textoFinal, mapa) {
        var campoValidado = validarCampoAlvoParaAjuste(rec.alvo_ramo, rec.campo_alvo, alvo);
        escreverValorCampoAlvo(rec.alvo_ramo, alvo, campoValidado, textoFinal, mapa);
        return campoValidado;
    }

    function aplicarResolucaoPendenciasRecNoMapa(mapa, rec, ajuste) {
        ajuste = ajuste || {};
        var alterou = false;
        if (ajuste.alvo_item_id !== undefined && String(ajuste.alvo_item_id || '').trim()) {
            rec.alvo_item_id = String(ajuste.alvo_item_id).trim();
            rec.alvo_status_origem = '';
            rec.alvo_candidatos_ambiguos = [];
            alterou = true;
        }
        if (ajuste.campo_alvo !== undefined && String(ajuste.campo_alvo || '').trim()) {
            rec.campo_alvo = String(ajuste.campo_alvo).trim();
            alterou = true;
        }
        if (ajuste.escopo_retirada !== undefined) {
            var escNorm = String(ajuste.escopo_retirada || '').trim().toUpperCase();
            rec.escopo_retirada = (escNorm === 'GLOBAL' || escNorm === 'PARCIAL_FUNCOES') ? escNorm : '';
            alterou = true;
        }
        var fnPassadas = Array.isArray(ajuste.funcao_ids) ? ajuste.funcao_ids
            : (Array.isArray(ajuste.funcao_ids_sugeridas) ? ajuste.funcao_ids_sugeridas : null);
        if (fnPassadas !== null) {
            rec.funcao_ids_sugeridas = filtrarIdsValidos(fnPassadas, mapa.funcoes);
            alterou = true;
        }
        var etPassadas = Array.isArray(ajuste.etapa_ids) ? ajuste.etapa_ids
            : (Array.isArray(ajuste.etapa_ids_sugeridas) ? ajuste.etapa_ids_sugeridas : null);
        if (etPassadas !== null) {
            rec.etapa_ids_sugeridas = filtrarIdsValidos(etPassadas, mapa.etapas);
            alterou = true;
        }

        var limparFn = ajuste.limparFuncoesNaoResolvidas === true ||
            (ajuste.resolverPendenciasEscopo === true && (fnPassadas !== null || rec.escopo_retirada === 'GLOBAL'));
        if (limparFn && Array.isArray(rec.funcoes_nao_resolvidas) && rec.funcoes_nao_resolvidas.length) {
            rec.funcoes_originais_nao_resolvidas = normalizarListaStringsUnicas(
                (rec.funcoes_originais_nao_resolvidas || []).concat(rec.funcoes_nao_resolvidas)
            );
            rec.funcoes_nao_resolvidas = [];
            alterou = true;
        }

        var limparEt = ajuste.limparEtapasNaoResolvidas === true ||
            (ajuste.resolverPendenciasEscopo === true && etPassadas !== null);
        if (limparEt && Array.isArray(rec.etapas_nao_resolvidas) && rec.etapas_nao_resolvidas.length) {
            rec.etapas_originais_nao_resolvidas = normalizarListaStringsUnicas(
                (rec.etapas_originais_nao_resolvidas || []).concat(rec.etapas_nao_resolvidas)
            );
            rec.etapas_nao_resolvidas = [];
            alterou = true;
        }

        if (alterou) {
            rec.escopo_resolvido_em = new Date().toISOString();
        }
        return alterou;
    }

    function atualizarEscopoAlvoRecomendacaoMapa(mapaId, recId, ajuste) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('resolver alvo e escopo da recomendação');
        ajuste = ajuste || {};
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(ajuste));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var mapa = exigirMapaEConcorrencia(mapaId, ajuste.versaoEsperada);
            var rec = mapa.recomendacoes.find(function (r) { return r.id === recId; });
            if (!rec) throw new Error('Recomendação não encontrada.');
            if (rec.status_decisao !== 'PENDENTE') {
                throw new Error('Somente recomendações PENDENTES podem ter alvo ou escopo alterados.');
            }
            aplicarResolucaoPendenciasRecNoMapa(mapa, rec, Object.assign({}, ajuste, {
                resolverPendenciasEscopo: ajuste.resolverPendenciasEscopo !== false
            }));
            tocarVersaoMapa(mapa);
            return clonarProfundo(rec);
        });
    }

    function decidirRecomendacaoMapa(mapaId, recId, acao, opcoes) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('decidir sobre recomendações do mapa');
        opcoes = opcoes || {};
        var acaoNorm = String(acao || '').trim().toUpperCase();
        if (acaoNorm !== 'ACEITAR' && acaoNorm !== 'EDITAR_E_ACEITAR' && acaoNorm !== 'REJEITAR') {
            throw new Error('Ação inválida para recomendação: ' + acao);
        }
        var erroSeg = contemConteudoProibidoMapa(JSON.stringify(opcoes));
        if (erroSeg) throw new Error(erroSeg);

        return executarMutacaoMapaPersistida(function () {
            var s = obterSessaoSeguraMapa() || {};
            var mapa = exigirMapaEConcorrencia(mapaId, opcoes.versaoEsperada);
            var rec = mapa.recomendacoes.find(function (r) { return r.id === recId; });
            if (!rec) throw new Error('Recomendação não encontrada.');
            if (rec.status_decisao !== 'PENDENTE') {
                throw new Error('Esta recomendação já foi decidida anteriormente (' + rec.status_decisao + ').');
            }

            var nota = String(opcoes.nota || '').trim();
            var agoraIso = new Date().toISOString();

            if (acaoNorm === 'REJEITAR') {
                rec.status_decisao = 'REJEITADA';
                rec.decisao_nota = nota || 'Recomendação rejeitada pelo responsável técnico.';
                rec.decidido_por_matricula = String(s.matricula || '');
                rec.decidido_em = agoraIso;
                tocarVersaoMapa(mapa);
                return clonarProfundo(rec);
            }

            aplicarResolucaoPendenciasRecNoMapa(mapa, rec, opcoes);

            // P1-C: Bloqueio rígido de escopo não resolvido antes de qualquer alteração ou retirada
            if (Array.isArray(rec.funcoes_nao_resolvidas) && rec.funcoes_nao_resolvidas.length > 0) {
                throw new Error('Escopo de funções não resolvido: [' + rec.funcoes_nao_resolvidas.join(', ') + '] não corresponde às funções cadastradas neste mapa. Selecione ou resolva as funções corretas antes de aceitar.');
            }
            if (Array.isArray(rec.etapas_nao_resolvidas) && rec.etapas_nao_resolvidas.length > 0) {
                throw new Error('Escopo de etapas não resolvido: [' + rec.etapas_nao_resolvidas.join(', ') + '] não corresponde às etapas cadastradas neste mapa. Selecione ou resolva as etapas corretas antes de aceitar.');
            }

            var textoFinal = acaoNorm === 'EDITAR_E_ACEITAR'
                ? String(opcoes.textoEditado || '').trim()
                : String(rec.descricao_proposta || rec.titulo || '').trim();

            if (acaoNorm === 'EDITAR_E_ACEITAR' && !textoFinal && rec.tipo !== 'RETIRAR' && rec.tipo !== 'PERGUNTA') {
                throw new Error('Informe o texto editado antes de confirmar a aceitação com edição.');
            }

            // P1-A: Bloqueio estrito de alvo ausente, ambíguo ou inexistente/removido
            var alvo = null;
            if (rec.tipo === 'RETIRAR') {
                if (rec.alvo_ramo === 'GERAL') {
                    throw new Error('Recomendação RETIRAR exige ramo e item específico (FUNCAO, FERRAMENTA, ETAPA, EPI ou PERIGO).');
                }
                if (rec.alvo_status_origem === 'AMBIGUO' && !(opcoes.alvo_item_id && String(opcoes.alvo_item_id).trim())) {
                    var candsRet = (rec.alvo_candidatos_ambiguos || []).map(function (c) { return c.nome + ' (' + c.id + ')'; }).join(', ');
                    throw new Error('Alvo ambíguo para RETIRAR em ' + rec.alvo_ramo + ': selecione o ID exato antes de aceitar' + (candsRet ? ' [' + candsRet + ']' : '') + '.');
                }
                if (!rec.alvo_item_id) {
                    throw new Error('Alvo ausente: selecione um item existente em ' + rec.alvo_ramo + ' antes de aceitar RETIRAR.');
                }
                alvo = localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id);
                if (!alvo) {
                    throw new Error('Alvo inexistente ou removido: o item "' + rec.alvo_item_id + '" não existe em ' + rec.alvo_ramo + '.');
                }
            } else if (rec.tipo === 'AJUSTAR') {
                if (rec.alvo_ramo !== 'GERAL') {
                    if (rec.alvo_status_origem === 'AMBIGUO' && !(opcoes.alvo_item_id && String(opcoes.alvo_item_id).trim())) {
                        var candsAj = (rec.alvo_candidatos_ambiguos || []).map(function (c) { return c.nome + ' (' + c.id + ')'; }).join(', ');
                        throw new Error('Alvo ambíguo para AJUSTAR em ' + rec.alvo_ramo + ': selecione o ID exato antes de aceitar' + (candsAj ? ' [' + candsAj + ']' : '') + '.');
                    }
                    if (!rec.alvo_item_id) {
                        throw new Error('Alvo ausente: selecione um item existente em ' + rec.alvo_ramo + ' antes de aceitar AJUSTAR (não grava em observações gerais).');
                    }
                    alvo = localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id);
                    if (!alvo) {
                        throw new Error('Alvo inexistente ou removido: o item "' + rec.alvo_item_id + '" não existe em ' + rec.alvo_ramo + '.');
                    }
                }
                rec.campo_alvo = validarCampoAlvoParaAjuste(rec.alvo_ramo, rec.campo_alvo, alvo);
            } else if (rec.alvo_item_id && rec.alvo_ramo !== 'GERAL') {
                alvo = localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id);
            }

            if (alvo && (alvo.status === 'CONFIRMADO' || alvo.status === 'NAO_APLICAVEL') && opcoes.confirmarSobrescrita !== true) {
                throw new Error('O item "' + obterNomePrincipalItem(rec.alvo_ramo, alvo) + '" já está marcado como ' + obterLabelStatusItem(alvo.status) + '. Confirme explicitamente a sobrescrita antes de alterar.');
            }

            if (rec.tipo === 'RETIRAR') {
                var impRet = avaliarImpactoRecomendacaoEscopo(mapa, rec, alvo);
                if (impRet.bloqueadoEstrito) {
                    throw new Error(impRet.mensagemErro);
                }
                if (impRet.modo === 'DESVINCULAR_FUNCOES' && opcoes.confirmarRetiradaGlobal !== true) {
                    var snapshotAntesFn = clonarProfundo(alvo);
                    var nomesAntesFn = impRet.funcoesAtingidasNomes.concat(impRet.nomesOutrasFn).join(', ');
                    alvo.funcao_ids = impRet.funcoesRestantes;
                    var textoEtapasAbr = impRet.etapasAtingidasNomes.join(', ');
                    var regParcialFn = '[Desvinculado de ' + impRet.nomesComunsFn.join(', ') + ' (etapas: ' + textoEtapasAbr + ') em ' + agoraIso.slice(0, 10) + ' (' + rec.id + '); mantido ativo para ' + impRet.nomesOutrasFn.join(', ') + '] ' + (nota || rec.justificativa || textoFinal);
                    if (alvo.observacao !== undefined) {
                        alvo.observacao = [alvo.observacao, regParcialFn].filter(Boolean).join(' | ');
                    }
                    rec.snapshot_antes = snapshotAntesFn;
                    rec.snapshot_depois = clonarProfundo(alvo);
                    rec.valor_anterior = nomesAntesFn;
                    rec.valor_aplicado = impRet.nomesOutrasFn.join(', ') + ' (desvinculado de: ' + impRet.nomesComunsFn.join(', ') + '; etapas: ' + textoEtapasAbr + ')';
                    rec.status_decisao = acaoNorm === 'EDITAR_E_ACEITAR' ? 'ACEITA_COM_EDICAO' : 'ACEITA';
                    rec.texto_editado = acaoNorm === 'EDITAR_E_ACEITAR' ? textoFinal : '';
                    rec.decisao_nota = nota || regParcialFn;
                    rec.decidido_por_matricula = String(s.matricula || '');
                    rec.decidido_em = agoraIso;
                    tocarVersaoMapa(mapa);
                    return clonarProfundo(rec);
                }
                if (impRet.modo === 'DESVINCULAR_ETAPAS' && opcoes.confirmarRetiradaGlobal !== true) {
                    var snapshotAntesEt = clonarProfundo(alvo);
                    var nomesAntesEt = impRet.nomesEtAlvo.join(', ');
                    alvo.etapa_ids = impRet.etapasRestantes;
                    var regParcialEt = '[Desvinculado da(s) etapa(s) ' + impRet.nomesComunsEt.join(', ') + ' em ' + agoraIso.slice(0, 10) + ' (' + rec.id + '); mantido ativo em ' + impRet.nomesOutrasEt.join(', ') + ' para ' + impRet.funcoesAtingidasNomes.join(', ') + '] ' + (nota || rec.justificativa || textoFinal);
                    if (alvo.observacao !== undefined) {
                        alvo.observacao = [alvo.observacao, regParcialEt].filter(Boolean).join(' | ');
                    }
                    rec.snapshot_antes = snapshotAntesEt;
                    rec.snapshot_depois = clonarProfundo(alvo);
                    rec.valor_anterior = nomesAntesEt;
                    rec.valor_aplicado = impRet.nomesOutrasEt.join(', ') + ' (desvinculado da etapa: ' + impRet.nomesComunsEt.join(', ') + ')';
                    rec.status_decisao = acaoNorm === 'EDITAR_E_ACEITAR' ? 'ACEITA_COM_EDICAO' : 'ACEITA';
                    rec.texto_editado = acaoNorm === 'EDITAR_E_ACEITAR' ? textoFinal : '';
                    rec.decisao_nota = nota || regParcialEt;
                    rec.decidido_por_matricula = String(s.matricula || '');
                    rec.decidido_em = agoraIso;
                    tocarVersaoMapa(mapa);
                    return clonarProfundo(rec);
                }
                if (opcoes.confirmarRetiradaGlobal !== true) {
                    throw new Error(impRet.mensagemErro);
                }
                rec.snapshot_antes = clonarProfundo(alvo);
                rec.valor_anterior = String(alvo.status || 'NAO_AVALIADO');
                alvo.status = 'NAO_APLICAVEL';
                var registroRet = '[Retirada global aceita em ' + agoraIso.slice(0, 10) + ' (' + rec.id + '); funções atingidas: ' + impRet.funcoesAtingidasNomes.join(', ') + '; etapas: ' + impRet.etapasAtingidasNomes.join(', ') + '] ' + (nota || rec.justificativa || textoFinal);
                if (alvo.observacao !== undefined) {
                    alvo.observacao = [alvo.observacao, registroRet].filter(Boolean).join(' | ');
                } else if (alvo.nota_exposicao !== undefined) {
                    alvo.nota_exposicao = [alvo.nota_exposicao, registroRet].filter(Boolean).join(' | ');
                }
                rec.snapshot_depois = clonarProfundo(alvo);
                rec.valor_aplicado = 'NAO_APLICAVEL';
            } else if (rec.tipo === 'INCLUIR') {
                var criadoInc = aplicarInclusaoPorRecomendacao(mapa, rec, textoFinal || rec.titulo, opcoes);
                rec.snapshot_antes = null;
                rec.snapshot_depois = clonarProfundo(criadoInc);
                rec.valor_anterior = null;
                rec.valor_aplicado = textoFinal || rec.titulo;
            } else if (rec.tipo === 'AJUSTAR') {
                if (alvo) {
                    var impAj = avaliarImpactoRecomendacaoEscopo(mapa, rec, alvo);
                    if (impAj.modo === 'AJUSTE_BLOQUEADO_ESCOPO_NAO_VINCULADO') {
                        throw new Error(impAj.mensagemErro);
                    }
                    if (impAj.exigeConfirmacaoAjusteCompartilhado && opcoes.confirmarAjusteCompartilhado !== true) {
                        throw new Error(impAj.mensagemErro);
                    }
                }
                var valorPropostoAj = textoFinal || rec.titulo;
                if (!valorPropostoAj) {
                    throw new Error('Informe o novo texto proposto antes de aceitar o ajuste.');
                }
                rec.snapshot_antes = alvo ? clonarProfundo(alvo) : { observacoes_gerais: String(mapa.observacoes_gerais || '') };
                rec.valor_anterior = lerValorCampoAlvo(rec.alvo_ramo, alvo, rec.campo_alvo, mapa);
                aplicarAjustePorRecomendacao(rec, alvo, valorPropostoAj, mapa);
                rec.snapshot_depois = alvo ? clonarProfundo(alvo) : { observacoes_gerais: String(mapa.observacoes_gerais || '') };
                rec.valor_aplicado = lerValorCampoAlvo(rec.alvo_ramo, alvo, rec.campo_alvo, mapa);
            } else if (rec.tipo === 'PERGUNTA' && alvo && acaoNorm === 'EDITAR_E_ACEITAR' && textoFinal) {
                rec.snapshot_antes = clonarProfundo(alvo);
                rec.valor_anterior = String(alvo.observacao || '');
                if (alvo.observacao !== undefined) {
                    alvo.observacao = [alvo.observacao, '[Resposta ' + rec.id + '] ' + textoFinal].filter(Boolean).join(' | ');
                }
                rec.snapshot_depois = clonarProfundo(alvo);
                rec.valor_aplicado = String(alvo.observacao || '');
            }

            rec.status_decisao = acaoNorm === 'EDITAR_E_ACEITAR' ? 'ACEITA_COM_EDICAO' : 'ACEITA';
            rec.texto_editado = acaoNorm === 'EDITAR_E_ACEITAR' ? textoFinal : '';
            rec.decisao_nota = nota;
            rec.decidido_por_matricula = String(s.matricula || '');
            rec.decidido_em = agoraIso;
            tocarVersaoMapa(mapa);
            return clonarProfundo(rec);
        });
    }

    // =========================================================================
    // 6. ANÁLISE CRÍTICA SOB DEMANDA (LOCAL POR PALAVRAS-CHAVE + IA EXTERNA)
    // =========================================================================
    function extrairTokensRelevantes(texto) {
        return normalizar(texto)
            .split(/[^a-z0-9]+/)
            .filter(function (w) { return w.length >= 4 && w !== 'para' && w !== 'com' && w !== 'sem' && w !== 'como'; });
    }

    function encontrarGrupoSemantico(tokens) {
        for (var i = 0; i < GRUPOS_TERMOS_EQUIVALENTES.length; i++) {
            var grp = GRUPOS_TERMOS_EQUIVALENTES[i];
            var bateu = tokens.some(function (tk) { return grp.indexOf(tk) !== -1; });
            if (bateu) return i;
        }
        return -1;
    }

    function doisPerigosParecemEquivalentes(textoA, textoB) {
        var normA = normalizar(textoA);
        var normB = normalizar(textoB);
        if (!normA || !normB) return false;
        if (normA === normB) return 'identico';

        var tokA = extrairTokensRelevantes(normA);
        var tokB = extrairTokensRelevantes(normB);
        if (!tokA.length || !tokB.length) return false;

        var setB = new Set(tokB);
        var comuns = tokA.filter(function (t) { return setB.has(t); }).length;
        var menor = Math.min(tokA.length, tokB.length);
        if (menor > 0 && comuns / menor >= 0.6) return 'sobreposicao';

        var grpA = encontrarGrupoSemantico(tokA);
        var grpB = encontrarGrupoSemantico(tokB);
        if (grpA !== -1 && grpA === grpB) return 'grupo_equivalente';
        return false;
    }

    function executarRevisaoLocalMapa(mapaId) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('executar revisão crítica local');

        return executarMutacaoMapaPersistida(function () {
            var s = obterSessaoSeguraMapa() || {};
            var mapa = exigirMapaEConcorrencia(mapaId);
            var pendentesChaves = new Set(
                mapa.recomendacoes
                    .filter(function (r) { return r.status_decisao === 'PENDENTE' && r.chave_dedup; })
                    .map(function (r) { return r.chave_dedup; })
            );
            var geradas = [];

            function enfileirarCritica(dados) {
                if (dados.chave_dedup && pendentesChaves.has(dados.chave_dedup)) return;
                if (dados.chave_dedup) pendentesChaves.add(dados.chave_dedup);
                var rec = criarRegistroRecomendacao(mapa, Object.assign({}, dados, {
                    origem: 'ANALISE_LOCAL_PALAVRAS_CHAVE'
                }), s.matricula || '');
                mapa.recomendacoes.unshift(rec);
                geradas.push(clonarProfundo(rec));
            }

            // 1. Duplicidades / repetições em Perigos
            for (var i = 0; i < mapa.perigos.length; i++) {
                var pA = mapa.perigos[i];
                if (pA.status === 'NAO_APLICAVEL') continue;
                for (var j = i + 1; j < mapa.perigos.length; j++) {
                    var pB = mapa.perigos[j];
                    if (pB.status === 'NAO_APLICAVEL') continue;
                    var eq = doisPerigosParecemEquivalentes(pA.perigo_fonte, pB.perigo_fonte);
                    if (eq) {
                        var parKey = [pA.id, pB.id].sort().join('_');
                        enfileirarCritica({
                            tipo: eq === 'identico' ? 'RETIRAR' : 'AJUSTAR',
                            alvo_ramo: 'PERIGO',
                            alvo_item_id: pB.id,
                            campo_alvo: eq === 'identico' ? '' : 'perigo_fonte',
                            chave_dedup: 'dup_perigo_' + parKey,
                            titulo: '[Análise local] Possível repetição entre perigos: "' + pA.perigo_fonte + '" e "' + pB.perigo_fonte + '"',
                            descricao_proposta: pA.perigo_fonte + ' (consolidar ou diferenciar etapa/fonte)',
                            justificativa: 'Detecção por palavras-chave/sinônimos apontou sobreposição com "' + pA.perigo_fonte + '". Avalie se são a mesma fonte na mesma etapa ou exposições distintas antes de retirar.',
                            perguntas_abertas: [
                                'Os dois registros representam a mesma fonte de perigo na mesma etapa ou ocorrem em etapas/funções diferentes?'
                            ]
                        });
                    }
                }
            }

            // 2. Mistura de Fonte vs Evento/Efeito + lacunas de vínculo função/etapa + campos vazios
            var multiFuncao = mapa.funcoes.filter(function (f) { return f.status !== 'NAO_APLICAVEL'; }).length > 1;
            mapa.perigos.forEach(function (per) {
                if (per.status === 'NAO_APLICAVEL') return;
                if (REGEX_EVENTO_MISTURADO_EM_FONTE.test(per.perigo_fonte) && !/ferramenta|equipamento|maquina|fonte/i.test(normalizar(per.perigo_fonte))) {
                    enfileirarCritica({
                        tipo: 'AJUSTAR',
                        alvo_ramo: 'PERIGO',
                        alvo_item_id: per.id,
                        campo_alvo: 'perigo_fonte',
                        chave_dedup: 'fonte_vs_evento_' + per.id,
                        titulo: '[Análise local] Possível mistura entre Perigo/Fonte e Evento/Dano em "' + per.perigo_fonte + '"',
                        descricao_proposta: per.perigo_fonte + ' (especificar a fonte material/energética no campo Perigo/Fonte e mover o efeito para Evento/Risco)',
                        justificativa: 'Análise por palavras-chave identificou termo de evento ou lesão no campo Perigo/Fonte.',
                        perguntas_abertas: [
                            'Qual é a fonte física/agente que gera "' + per.perigo_fonte + '" e qual o evento acidental correspondente?'
                        ]
                    });
                }

                if (mapa.etapas.length > 0 && (!per.etapa_ids || per.etapa_ids.length === 0)) {
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: 'PERIGO',
                        alvo_item_id: per.id,
                        chave_dedup: 'perigo_sem_etapa_' + per.id,
                        titulo: '[Análise local] Perigo sem etapa vinculada: "' + per.perigo_fonte + '"',
                        descricao_proposta: 'Vincular etapa(s) aplicáveis ao perigo "' + per.perigo_fonte + '"',
                        justificativa: 'Perigos soltos sem etapa impedem identificar em que momento da tarefa o risco ocorre.',
                        perguntas_abertas: ['Em qual(is) etapa(s) da atividade este perigo está presente?']
                    });
                }

                if (mapa.funcoes.length > 0 && (!per.funcao_ids || per.funcao_ids.length === 0)) {
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: 'PERIGO',
                        alvo_item_id: per.id,
                        chave_dedup: 'perigo_sem_funcao_' + per.id,
                        titulo: '[Análise local] Definir funções expostas a "' + per.perigo_fonte + '"',
                        descricao_proposta: 'Selecionar explicitamente quais funções estão expostas a "' + per.perigo_fonte + '"',
                        justificativa: multiFuncao
                            ? 'A atividade possui múltiplas funções (e APR única não pode equiparar exposições automaticamente entre funções distintas).'
                            : 'Nenhuma função participante foi vinculada a este perigo.',
                        perguntas_abertas: ['Quais funções participantes (ex.: Servente, Encarregado, Motorista) estão realmente expostas a este perigo?']
                    });
                }

                var med = per.medidas_nr01 || {};
                var semMedidas = !med.eliminacao_substituicao && !med.engenharia_epc && !med.administrativo_organizacao && !med.epi_complementar;
                if (per.status === 'NAO_AVALIADO' && (!per.evento_risco || !per.danos_provaveis || semMedidas)) {
                    var faltando = [];
                    if (!per.evento_risco) faltando.push('Evento/Risco');
                    if (!per.danos_provaveis) faltando.push('Danos prováveis');
                    if (semMedidas) faltando.push('Medidas de prevenção (Hierarquia NR-01)');
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: 'PERIGO',
                        alvo_item_id: per.id,
                        chave_dedup: 'perigo_incompleto_' + per.id,
                        titulo: '[Análise local] Campos pendentes em "' + per.perigo_fonte + '"',
                        descricao_proposta: 'Completar: ' + faltando.join(', '),
                        justificativa: 'Análise sob demanda preservou os campos em branco para definição técnica sem preencher automaticamente.',
                        perguntas_abertas: ['Preencher ou consultar IA externa sobre: ' + faltando.join(', ') + '.']
                    });
                }
            });

            // 3. Etapas sem funções vinculadas + lembrete opcional da Fase 5 (Resgate / PAE)
            var temEtapaEmergencia = mapa.etapas.some(function (et) {
                return et.status !== 'NAO_APLICAVEL' &&
                    (et.fase_roteiro_opcional === 'EMERGENCIA_RESGATE' || /\b(pae|resgate|emergencia|evacuac|primeiros socorros)\b/i.test(normalizar(et.nome)));
            });
            if (mapa.etapas.length > 0 && !temEtapaEmergencia) {
                enfileirarCritica({
                    tipo: 'INCLUIR',
                    alvo_ramo: 'ETAPA',
                    alvo_item_id: '',
                    chave_dedup: 'lembrete_fase5_pae',
                    titulo: '[Análise local] Nenhuma etapa vinculada a Resgate, Comunicação e PAE',
                    descricao_proposta: 'Verificação de comunicação, rota de evacuação e acionamento do PAE na frente de serviço',
                    justificativa: 'Lembrete opcional derivado do roteiro das 5 fases operacionais (Fase 5 — Emergência/PAE).',
                    perguntas_abertas: ['Deseja incluir uma etapa específica de Resgate/Comunicação/PAE ou já está coberta em verificação da área?']
                });
            }

            if (multiFuncao) {
                mapa.etapas.forEach(function (et) {
                    if (et.status !== 'NAO_APLICAVEL' && (!et.funcao_ids || et.funcao_ids.length === 0)) {
                        enfileirarCritica({
                            tipo: 'PERGUNTA',
                            alvo_ramo: 'ETAPA',
                            alvo_item_id: et.id,
                            chave_dedup: 'etapa_sem_funcao_' + et.id,
                            titulo: '[Análise local] Etapa sem funções participantes definidas: "' + et.nome + '"',
                            descricao_proposta: 'Vincular funções participantes à etapa "' + et.nome + '"',
                            justificativa: 'Em atividade com equipe mista sob APR única, indicar quem participa de cada etapa evita mistura de riscos.',
                            perguntas_abertas: ['Quais funções atuam efetivamente na etapa "' + et.nome + '"?']
                        });
                    }
                });
            }

            // 4. EPIs eventuais sem condição + vínculo de função
            mapa.epis.forEach(function (ep) {
                if (ep.status === 'NAO_APLICAVEL') return;
                if (ep.categoria === 'EVENTUAL' && (!ep.condicao_uso || ep.status_condicao === 'PENDENTE')) {
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: 'EPI',
                        alvo_item_id: ep.id,
                        chave_dedup: 'epi_eventual_cond_' + ep.id,
                        titulo: '[Análise local] EPI eventual com condição pendente: "' + ep.nome + '"',
                        descricao_proposta: 'Definir condição objetiva de uso para "' + ep.nome + '"',
                        justificativa: 'EPIs eventuais exigem condição explícita (ex.: trabalho em talude > 2m / risco de queda). Condição pendente não equivale a Não aplicável e nunca marca APR sozinha.',
                        perguntas_abertas: ['Qual condição concreta em campo exige o uso de "' + ep.nome + '" e para qual função?']
                    });
                }
                if (mapa.funcoes.length > 0 && (!ep.funcao_ids || ep.funcao_ids.length === 0)) {
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: 'EPI',
                        alvo_item_id: ep.id,
                        chave_dedup: 'epi_sem_funcao_' + ep.id,
                        titulo: '[Análise local] EPI sem função vinculada: "' + ep.nome + '"',
                        descricao_proposta: 'Indicar quais funções utilizam "' + ep.nome + '"',
                        justificativa: 'Evita aplicar EPI específico de execução a funções de apoio/deslocamento que não compartilham a exposição.',
                        perguntas_abertas: ['Para qual(is) função(ões) e etapa(s) o EPI "' + ep.nome + '" se aplica?']
                    });
                }
            });

            // 5. Crítica às recomendações pendentes de incluir/retirar sem justificativa, escopo ou que ameacem desproteger outras funções da equipe
            mapa.recomendacoes.forEach(function (rec) {
                if (rec.status_decisao !== 'PENDENTE') return;
                if (rec.tipo === 'RETIRAR' && rec.alvo_item_id && rec.alvo_ramo !== 'GERAL') {
                    var alvoRet = localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id);
                    var fnExpostas = (alvoRet && Array.isArray(alvoRet.funcao_ids)) ? alvoRet.funcao_ids : [];
                    if (fnExpostas.length > 0) {
                        var setCitadas = new Set(Array.isArray(rec.funcao_ids_sugeridas) ? rec.funcao_ids_sugeridas : []);
                        var fnDesprotegidas = fnExpostas.filter(function (id) { return !setCitadas.has(id); });
                        if (fnDesprotegidas.length > 0) {
                            var nomesDesp = fnDesprotegidas.map(function (id) {
                                var fObj = mapa.funcoes.find(function (f) { return f.id === id; });
                                return fObj ? fObj.nome : id;
                            }).join(', ');
                            enfileirarCritica({
                                tipo: 'PERGUNTA',
                                alvo_ramo: rec.alvo_ramo,
                                alvo_item_id: rec.alvo_item_id,
                                chave_dedup: 'prot_mista_' + rec.id,
                                titulo: '[Verificação local] Retirada pode desproteger função(ões) exposta(s): ' + nomesDesp + ' — não remover globalmente',
                                descricao_proposta: 'Manter "' + obterNomePrincipalItem(rec.alvo_ramo, alvoRet) + '" ativo para ' + nomesDesp,
                                justificativa: 'Na APR única de equipe mista, o item permanece necessário para [' + nomesDesp + '] mesmo que não se aplique às demais funções.',
                                perguntas_abertas: [
                                    'A retirada refere-se apenas a outra função não exposta, mantendo proteção obrigatória para ' + nomesDesp + '?'
                                ]
                            });
                        }
                    }
                }
                if (rec.origem !== 'SOLICITACAO_TERCEIRO') return;
                var faltaJust = !rec.justificativa;
                var faltaEscopo = (!rec.funcao_ids_sugeridas || rec.funcao_ids_sugeridas.length === 0) ||
                    (!rec.etapa_ids_sugeridas || rec.etapa_ids_sugeridas.length === 0);
                if (faltaJust || faltaEscopo) {
                    enfileirarCritica({
                        tipo: 'PERGUNTA',
                        alvo_ramo: rec.alvo_ramo,
                        alvo_item_id: rec.alvo_item_id,
                        chave_dedup: 'critica_solic_' + rec.id,
                        titulo: '[Análise local] Recomendação de ' + rec.tipo + ' precisa de fundamentação técnica (' + rec.titulo + ')',
                        descricao_proposta: 'Revisar escopo por função/etapa e justificativa antes de aceitar "' + rec.titulo + '"',
                        justificativa: rec.tipo === 'RETIRAR'
                            ? 'Pedido de retirada sem justificativa ou filtro por função pode remover controle essencial para uma função exposta (ex.: Servente) por não se aplicar a outra (ex.: Motorista/Encarregado).'
                            : 'Pedido de inclusão sem justificativa ou vínculo de função/etapa pode gerar item genérico desnecessário na APR única.',
                        perguntas_abertas: [
                            'Para qual(is) função(ões) e etapa(s) esta solicitação de ' + rec.tipo + ' se aplica?',
                            'Qual a evidência ou justificativa técnica em campo?'
                        ]
                    });
                }
            });

            if (geradas.length > 0) {
                tocarVersaoMapa(mapa);
            }

            return {
                totalGeradas: geradas.length,
                totalPendentes: mapa.recomendacoes.filter(function (r) { return r.status_decisao === 'PENDENTE'; }).length,
                geradas: geradas
            };
        });
    }

    function gerarPacoteCriticaExternaMapa(mapaId) {
        garantirEstadoSessaoMapa();
        var mapa = buscarMapaPorId(mapaId || estadoMapa.mapaSelecionadoId) || estadoMapa.mapas[0];
        if (!mapa) {
            throw new Error('Crie ou selecione um Mapa Mental antes de gerar o pedido para IA externa.');
        }

        function mapearNomesIds(ids, col) {
            if (!Array.isArray(ids) || !ids.length) return 'Nenhuma vinculada';
            return ids.map(function (id) {
                var item = col.find(function (x) { return x.id === id; });
                return item ? (item.nome || item.perigo_fonte || id) + ' [id: ' + item.id + ']' : id;
            }).join(', ');
        }

        var linhas = [
            '# PEDIDO DE REVISÃO CRÍTICA SST — MAPA MENTAL DA ATIVIDADE',
            'Aviso de Privacidade e Governança: Filtro automático de CPF/CNPJ/e-mail/telefone aplicado. Revise antes de enviar à IA externa. NÃO atribua notas de Probabilidade (P) ou Severidade (S) nem presuma equivalência automática de exposição entre funções.',
            '',
            '## ATIVIDADE CENTRAL (' + sanitizarPiiMapa(mapa.codigo_mapa) + ' • v' + (mapa.versao || 1) + ')',
            '- ID do Mapa: ' + sanitizarPiiMapa(mapa.id),
            '- Atividade: ' + sanitizarPiiMapa(mapa.atividade),
            '- Frente / Local: ' + sanitizarPiiMapa(mapa.frente_local || 'Não informado'),
            '- APR de Referência: ' + sanitizarPiiMapa(mapa.apr_referencia_texto || 'Não vinculada (operação em APR única com equipe mista)'),
            '- Observações: ' + sanitizarPiiMapa(mapa.observacoes_gerais || '-'),
            '',
            '## 1. FUNÇÕES ENVOLVIDAS (exposições distintas na mesma atividade)',
        ];

        if (mapa.funcoes.length) {
            mapa.funcoes.forEach(function (f) {
                linhas.push('- [id: ' + f.id + '] [' + f.status + '] ' + sanitizarPiiMapa(f.nome) +
                    (f.ghe_ref_leitura ? ' (Ref. GHE somente leitura: ' + sanitizarPiiMapa(f.ghe_ref_leitura) + ' — não prova exposição)' : '') +
                    (f.nota_exposicao ? ' — Nota: ' + sanitizarPiiMapa(f.nota_exposicao) : ''));
            });
        } else {
            linhas.push('- Nenhuma função cadastrada.');
        }

        linhas.push('', '## 2. FERRAMENTAS DE ROTINA');
        if (mapa.ferramentas.length) {
            mapa.ferramentas.forEach(function (fer) {
                linhas.push('- [id: ' + fer.id + '] [' + fer.status + '] ' + sanitizarPiiMapa(fer.nome) +
                    ' | Etapas: ' + sanitizarPiiMapa(mapearNomesIds(fer.etapa_ids, mapa.etapas)) +
                    ' | Funções: ' + sanitizarPiiMapa(mapearNomesIds(fer.funcao_ids, mapa.funcoes)));
            });
        } else {
            linhas.push('- Nenhuma ferramenta cadastrada.');
        }

        linhas.push('', '## 3. ETAPAS PREVISTAS (ordenadas)');
        if (mapa.etapas.length) {
            mapa.etapas.forEach(function (et) {
                linhas.push('- ' + et.ordem + '. [id: ' + et.id + '] [' + et.status + '] ' + sanitizarPiiMapa(et.nome) +
                    (et.fase_roteiro_opcional ? ' (Fase roteiro: ' + obterLabelFaseOpcional(et.fase_roteiro_opcional) + ')' : '') +
                    ' | Funções: ' + sanitizarPiiMapa(mapearNomesIds(et.funcao_ids, mapa.funcoes)));
            });
        } else {
            linhas.push('- Nenhuma etapa cadastrada.');
        }

        linhas.push('', '## 4. EPIs (OBRIGATÓRIOS VS. EVENTUAIS COM CONDIÇÃO)');
        if (mapa.epis.length) {
            mapa.epis.forEach(function (ep) {
                var extraEv = ep.categoria === 'EVENTUAL'
                    ? ' | Condição (' + ep.status_condicao + '): ' + sanitizarPiiMapa(ep.condicao_uso || 'PENDENTE')
                    : '';
                linhas.push('- [id: ' + ep.id + '] [' + ep.categoria + ' • ' + ep.status + '] ' + sanitizarPiiMapa(ep.nome) + extraEv +
                    ' | Etapas: ' + sanitizarPiiMapa(mapearNomesIds(ep.etapa_ids, mapa.etapas)) +
                    ' | Funções: ' + sanitizarPiiMapa(mapearNomesIds(ep.funcao_ids, mapa.funcoes)));
            });
        } else {
            linhas.push('- Nenhum EPI cadastrado.');
        }

        linhas.push('', '## 5. PERIGOS / FONTES, EVENTOS, DANOS E MEDIDAS (HIERARQUIA NR-01)');
        if (mapa.perigos.length) {
            mapa.perigos.forEach(function (per, idx) {
                var med = per.medidas_nr01 || {};
                linhas.push('- P' + (idx + 1) + ' [id: ' + per.id + '] [' + per.status + '] Perigo/Fonte: ' + sanitizarPiiMapa(per.perigo_fonte));
                linhas.push('  * Etapas: ' + sanitizarPiiMapa(mapearNomesIds(per.etapa_ids, mapa.etapas)) +
                    ' | Funções Expostas: ' + sanitizarPiiMapa(mapearNomesIds(per.funcao_ids, mapa.funcoes)));
                linhas.push('  * Evento/Risco: ' + sanitizarPiiMapa(per.evento_risco || '(Não avaliado)'));
                linhas.push('  * Danos: ' + sanitizarPiiMapa(per.danos_provaveis || '(Não avaliado)'));
                linhas.push('  * NR-01 [Eliminação]: ' + sanitizarPiiMapa(med.eliminacao_substituicao || '-') +
                    ' | [EPC]: ' + sanitizarPiiMapa(med.engenharia_epc || '-') +
                    ' | [Adm]: ' + sanitizarPiiMapa(med.administrativo_organizacao || '-') +
                    ' | [EPI]: ' + sanitizarPiiMapa(med.epi_complementar || '-'));
            });
        } else {
            linhas.push('- Nenhum perigo cadastrado.');
        }

        var pendRec = mapa.recomendacoes.filter(function (r) { return r.status_decisao === 'PENDENTE'; });
        linhas.push('', '## 6. SOLICITAÇÕES PENDENTES DE INCLUIR / RETIRAR / AJUSTAR (' + pendRec.length + ')');
        if (pendRec.length) {
            pendRec.forEach(function (rec) {
                var alvoPendObj = (rec.alvo_item_id && rec.alvo_ramo !== 'GERAL') ? localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id) : null;
                var alvoTxt = rec.alvo_item_id
                    ? (alvoPendObj ? (obterNomePrincipalItem(rec.alvo_ramo, alvoPendObj) + ' [id: ' + rec.alvo_item_id + ']') : ('[id inexistente: ' + rec.alvo_item_id + ']'))
                    : 'Não especificado';
                var fnPendTxt = mapearNomesIds(rec.funcao_ids_sugeridas, mapa.funcoes) +
                    (rec.funcoes_nao_resolvidas && rec.funcoes_nao_resolvidas.length ? ' (Não resolvidas: ' + rec.funcoes_nao_resolvidas.join(', ') + ')' : '');
                var etPendTxt = mapearNomesIds(rec.etapa_ids_sugeridas, mapa.etapas) +
                    (rec.etapas_nao_resolvidas && rec.etapas_nao_resolvidas.length ? ' (Não resolvidas: ' + rec.etapas_nao_resolvidas.join(', ') + ')' : '');
                linhas.push('- [id: ' + rec.id + '] [' + rec.tipo + ' • ' + rec.alvo_ramo + '] ' + sanitizarPiiMapa(rec.titulo) +
                    ' | Alvo: ' + sanitizarPiiMapa(alvoTxt) +
                    (rec.campo_alvo ? ' | Campo: ' + sanitizarPiiMapa(rec.campo_alvo) : '') +
                    ' | Etapas citadas: ' + sanitizarPiiMapa(etPendTxt) +
                    ' | Funções citadas: ' + sanitizarPiiMapa(fnPendTxt) +
                    (rec.justificativa ? ' — Justificativa informada: ' + sanitizarPiiMapa(rec.justificativa) : ' — Sem justificativa'));
            });
        } else {
            linhas.push('- Nenhuma solicitação pendente.');
        }

        linhas.push(
            '',
            '## 7. INSTRUÇÕES DE ANÁLISE E FORMATO OBRIGATÓRIO DE RESPOSTA',
            '1) Avalie criticamente tanto itens a INCLUIR quanto pedidos para RETIRAR (não remova riscos do Servente apenas porque Motorista/Encarregado não estão expostos).',
            '2) Aponte repetições, mistura entre Perigo/Fonte e Evento/Dano, lacunas por etapa/função, condições faltantes para EPIs eventuais e respeite a Hierarquia NR-01.',
            '3) NUNCA inclua notas p_puro, s_puro, p_residual ou s_residual.',
            '4) REGRAS OBRIGATÓRIAS DE CONTRATO JSON:',
            '   - Para tipo "RETIRAR" ou "AJUSTAR" (exceto alvo_ramo="GERAL"), informe OBRIGATORIAMENTE "alvo_item_id" com o id exato listado nas seções 1 a 5 (ex.: "per_...").',
            '   - Para tipo "AJUSTAR", informe OBRIGATORIAMENTE "campo_alvo" usando apenas um dos campos suportados:',
            '     * PERIGO: "perigo_fonte", "evento_risco", "danos_provaveis", "medidas_nr01.eliminacao_substituicao", "medidas_nr01.engenharia_epc", "medidas_nr01.administrativo_organizacao", "medidas_nr01.epi_complementar", "observacao"',
            '     * EPI: "nome", "condicao_uso" (apenas EPI eventual), "observacao" | FUNCAO: "nome", "nota_exposicao" | FERRAMENTA/ETAPA: "nome", "observacao" | GERAL: "observacoes_gerais"',
            '   - Informe "funcoes_sugeridas" e "etapas_sugeridas" usando os IDs ou nomes exatos listados nas seções 1 e 3.',
            '   - Em "RETIRAR", informe "escopo_retirada": "PARCIAL_FUNCOES" (desvincular apenas as funções citadas) ou "GLOBAL" (marcar item como não aplicável para todo o mapa).',
            '5) Responda com um único bloco JSON (array) contendo objetos com as chaves:',
            '[{"tipo":"INCLUIR|RETIRAR|AJUSTAR|PERGUNTA","alvo_ramo":"FUNCAO|FERRAMENTA|ETAPA|EPI|PERIGO|GERAL","alvo_item_id":"id exato ou vazio para INCLUIR/PERGUNTA","campo_alvo":"campo exato quando AJUSTAR","funcoes_sugeridas":["fn_... ou nome exato"],"etapas_sugeridas":["et_... ou nome exato"],"escopo_retirada":"PARCIAL_FUNCOES|GLOBAL","titulo":"...","descricao_proposta":"...","justificativa":"...","perguntas_abertas":["..."],"categoria_epi":"OBRIGATORIO|EVENTUAL","condicao_uso":"..."}]'
        );

        return linhas.join('\n');
    }

    function extrairArrayJsonMapa(limpo) {
        var matchBloco = limpo.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (matchBloco && matchBloco[1]) {
            try {
                return JSON.parse(matchBloco[1].trim());
            } catch (eBloco) { /* segue para scanner */ }
        }
        try {
            return JSON.parse(limpo);
        } catch (eDireto) { /* segue para scanner balanceado */ }

        var inicio = -1;
        while ((inicio = limpo.indexOf('[', inicio + 1)) !== -1) {
            var depth = 0;
            var emString = false;
            var escapado = false;
            for (var i = inicio; i < limpo.length; i++) {
                var ch = limpo.charAt(i);
                if (escapado) { escapado = false; continue; }
                if (ch === '\\' && emString) { escapado = true; continue; }
                if (ch === '"') { emString = !emString; continue; }
                if (!emString) {
                    if (ch === '[') depth++;
                    else if (ch === ']') {
                        depth--;
                        if (depth === 0) {
                            var candidato = limpo.slice(inicio, i + 1);
                            try {
                                var parsed = JSON.parse(candidato);
                                if (Array.isArray(parsed)) return parsed;
                            } catch (eCand) { /* continua buscando */ }
                            break;
                        }
                    }
                }
            }
        }
        throw new Error('Não foi possível localizar uma lista JSON válida na resposta colada.');
    }

    function resolverReferenciasCatalogo(entradas, colecao) {
        var ids = [];
        var naoResolvidas = [];
        if (!Array.isArray(entradas)) {
            return { ids: ids, naoResolvidas: naoResolvidas };
        }
        entradas.forEach(function (rawVal) {
            var bruto = String(rawVal || '').trim();
            if (!bruto) return;
            var porId = colecao.filter(function (it) { return it.id === bruto; });
            if (porId.length === 1) {
                if (ids.indexOf(porId[0].id) === -1) ids.push(porId[0].id);
                return;
            }
            var normBruto = normalizar(bruto);
            var porNome = normBruto ? colecao.filter(function (it) { return normalizar(it.nome) === normBruto; }) : [];
            if (porNome.length === 1) {
                if (ids.indexOf(porNome[0].id) === -1) ids.push(porNome[0].id);
                return;
            }
            if (naoResolvidas.indexOf(bruto) === -1) {
                naoResolvidas.push(bruto);
            }
        });
        return { ids: ids, naoResolvidas: naoResolvidas };
    }

    function analisarAlvoItemRetorno(alvoMapa, alvoRamo, tipoNorm, brutoAlvoId) {
        var idLimpo = String(brutoAlvoId || '').trim();
        if (alvoRamo === 'GERAL') {
            return { status: 'NAO_REQUERIDO', id: '', nome: '', candidatos: [] };
        }
        var exigeAlvo = tipoNorm === 'RETIRAR' || tipoNorm === 'AJUSTAR';
        if (!idLimpo) {
            return {
                status: exigeAlvo ? 'AUSENTE' : 'NAO_REQUERIDO',
                id: '',
                nome: '',
                candidatos: []
            };
        }
        var col = mapearListaParaColecao(alvoRamo, alvoMapa, idLimpo);
        var exato = col.find(function (it) { return it.id === idLimpo; });
        if (exato) {
            return {
                status: 'RESOLVIDO',
                id: exato.id,
                nome: obterNomePrincipalItem(alvoRamo, exato),
                candidatos: []
            };
        }
        var normAlvo = normalizar(idLimpo);
        var porNome = normAlvo ? col.filter(function (it) { return normalizar(obterNomePrincipalItem(alvoRamo, it)) === normAlvo; }) : [];
        if (porNome.length >= 2) {
            return {
                status: 'AMBIGUO',
                id: '',
                nome: '',
                candidatos: porNome.map(function (it) {
                    return { id: it.id, nome: obterNomePrincipalItem(alvoRamo, it) };
                })
            };
        }
        if (porNome.length === 1) {
            return {
                status: 'INEXISTENTE',
                id: idLimpo,
                nome: '',
                candidatos: [{ id: porNome[0].id, nome: obterNomePrincipalItem(alvoRamo, porNome[0]) }]
            };
        }
        return { status: 'INEXISTENTE', id: idLimpo, nome: '', candidatos: [] };
    }

    function analisarRetornoCriticaExternaMapa(textoBruto, mapaId) {
        garantirEstadoSessaoMapa();
        exigirPermissaoEdicaoMapa('importar recomendações de IA externa');
        var alvoMapa = buscarMapaPorId(mapaId || estadoMapa.mapaSelecionadoId);
        if (!alvoMapa) throw new Error('Selecione ou crie um Mapa Mental antes de importar a resposta.');

        var limpo = String(textoBruto || '').trim();
        if (!limpo) throw new Error('Cole a resposta da IA externa antes de pré-visualizar.');
        if (medirBytesUtf8(limpo) > LIMITE_BYTES_IMPORT_CRITICA) {
            throw new Error('Resposta excede o teto de ' + Math.round(LIMITE_BYTES_IMPORT_CRITICA / 1024) + ' KB UTF-8.');
        }
        var erroSeg = contemConteudoProibidoMapa(limpo);
        if (erroSeg) throw new Error(erroSeg);

        var listaBruta = extrairArrayJsonMapa(limpo);
        if (!Array.isArray(listaBruta) || listaBruta.length === 0) {
            throw new Error('A resposta precisa conter ao menos 1 recomendação na lista JSON.');
        }
        if (listaBruta.length > LIMITE_MAX_ITENS_IMPORT) {
            throw new Error('A resposta possui ' + listaBruta.length + ' recomendações (máximo ' + LIMITE_MAX_ITENS_IMPORT + ' por importação).');
        }

        var notasDescartadas = 0;
        var camposIgnorados = [];
        var totalComPendencias = 0;
        var itens = listaBruta.map(function (obj, idx) {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                throw new Error('Item #' + (idx + 1) + ' da resposta não é um objeto JSON válido.');
            }
            Object.keys(obj).forEach(function (chave) {
                if (CAMPOS_NOTA_IGNORADOS.has(chave)) {
                    notasDescartadas++;
                } else if (!CAMPOS_PERMITIDOS_CRITICA_JSON.has(chave)) {
                    if (camposIgnorados.indexOf(chave) === -1) camposIgnorados.push(chave);
                }
            });
            var titulo = String(obj.titulo || obj.descricao_proposta || '').trim();
            var desc = String(obj.descricao_proposta || obj.titulo || '').trim();
            if (!titulo && !desc) {
                throw new Error('Item #' + (idx + 1) + ' sem título ou descrição proposta.');
            }

            var tipoNorm = TIPOS_RECOMENDACAO_VALIDOS.has(String(obj.tipo || '').toUpperCase()) ? String(obj.tipo).toUpperCase() : 'AJUSTAR';
            var alvoRamo = RAMOS_ALVO_VALIDOS.has(String(obj.alvo_ramo || '').toUpperCase()) ? String(obj.alvo_ramo).toUpperCase() : 'GERAL';
            var resEtapas = resolverReferenciasCatalogo(obj.etapas_sugeridas, alvoMapa.etapas);
            var resFuncoes = resolverReferenciasCatalogo(obj.funcoes_sugeridas, alvoMapa.funcoes);
            var alvoAnalise = analisarAlvoItemRetorno(alvoMapa, alvoRamo, tipoNorm, obj.alvo_item_id);

            var campoLimpo = String(obj.campo_alvo || '').trim();
            var campoStatus = 'NAO_REQUERIDO';
            if (tipoNorm === 'AJUSTAR') {
                if (alvoRamo === 'GERAL') {
                    campoLimpo = campoLimpo || 'observacoes_gerais';
                    campoStatus = campoLimpo === 'observacoes_gerais' ? 'VALIDO' : 'DESCONHECIDO';
                } else if (!campoLimpo) {
                    campoStatus = 'AUSENTE';
                } else {
                    var permitidosCampo = obterCamposAlvoPermitidos(alvoRamo);
                    if (permitidosCampo.indexOf(campoLimpo) === -1) {
                        campoStatus = 'DESCONHECIDO';
                    } else if (alvoRamo === 'EPI' && campoLimpo === 'condicao_uso' && alvoAnalise.status === 'RESOLVIDO') {
                        var epAlvoObj = localizarItemPorRamo(alvoMapa, 'EPI', alvoAnalise.id);
                        campoStatus = (epAlvoObj && epAlvoObj.categoria !== 'EVENTUAL') ? 'INCOMPATIVEL' : 'VALIDO';
                    } else {
                        campoStatus = 'VALIDO';
                    }
                }
            }

            var escRetRaw = String(obj.escopo_retirada || '').trim().toUpperCase();
            var escopoRet = (escRetRaw === 'GLOBAL' || escRetRaw === 'PARCIAL_FUNCOES') ? escRetRaw : '';

            var pendencias = [];
            if (alvoAnalise.status === 'AUSENTE') {
                pendencias.push('alvo_item_id ausente (obrigatório selecionar item antes de aceitar)');
            } else if (alvoAnalise.status === 'INEXISTENTE') {
                pendencias.push('alvo_item_id "' + alvoAnalise.id + '" não encontrado em ' + alvoRamo);
            } else if (alvoAnalise.status === 'AMBIGUO') {
                pendencias.push('alvo ambíguo em ' + alvoRamo + ' (' + alvoAnalise.candidatos.map(function (c) { return c.id; }).join(', ') + ')');
            }
            if (campoStatus === 'AUSENTE') {
                pendencias.push('campo_alvo ausente para AJUSTAR em ' + alvoRamo);
            } else if (campoStatus === 'DESCONHECIDO') {
                pendencias.push('campo_alvo desconhecido ("' + campoLimpo + '")');
            } else if (campoStatus === 'INCOMPATIVEL') {
                pendencias.push('campo_alvo condicao_uso inválido para EPI obrigatório');
            }
            if (resFuncoes.naoResolvidas.length) {
                pendencias.push('funções não reconhecidas no catálogo: ' + resFuncoes.naoResolvidas.join(', '));
            }
            if (resEtapas.naoResolvidas.length) {
                pendencias.push('etapas não reconhecidas no catálogo: ' + resEtapas.naoResolvidas.join(', '));
            }
            if (pendencias.length > 0) totalComPendencias++;

            return {
                tipo: tipoNorm,
                alvo_ramo: alvoRamo,
                alvo_item_id: alvoAnalise.id,
                alvo_nome_resolvido: alvoAnalise.nome,
                alvo_status: alvoAnalise.status,
                alvo_candidatos_ambiguos: alvoAnalise.candidatos,
                campo_alvo: campoLimpo,
                campo_alvo_status: campoStatus,
                escopo_retirada: escopoRet,
                titulo: titulo,
                descricao_proposta: desc,
                justificativa: String(obj.justificativa || '').trim(),
                categoria_epi: String(obj.categoria_epi || '').toUpperCase() === 'EVENTUAL' ? 'EVENTUAL' : 'OBRIGATORIO',
                condicao_uso: String(obj.condicao_uso || '').trim(),
                etapa_ids_sugeridas: resEtapas.ids,
                funcao_ids_sugeridas: resFuncoes.ids,
                etapas_nao_resolvidas: resEtapas.naoResolvidas,
                funcoes_nao_resolvidas: resFuncoes.naoResolvidas,
                pendencias_resolucao: pendencias,
                perguntas_abertas: Array.isArray(obj.perguntas_abertas)
                    ? obj.perguntas_abertas.map(function (p) { return String(p || '').trim(); }).filter(Boolean)
                    : dividirListaTextoLivre(obj.perguntas_abertas)
            };
        });

        return {
            mapaId: alvoMapa.id,
            mapaVersao: alvoMapa.versao || 1,
            geracaoSessaoId: estadoMapa.geracaoSessaoId,
            identidadeChave: estadoMapa.identidadeChave,
            notasDescartadas: notasDescartadas,
            camposIgnorados: camposIgnorados,
            totalComPendencias: totalComPendencias,
            itens: itens
        };
    }

    function confirmarImportacaoCriticaExternaMapa(previa) {
        if (!previa || !Array.isArray(previa.itens) || !previa.itens.length) {
            throw new Error('Nenhuma prévia de crítica externa válida para confirmar.');
        }
        garantirEstadoSessaoMapa();
        if (previa.geracaoSessaoId !== estadoMapa.geracaoSessaoId || previa.identidadeChave !== estadoMapa.identidadeChave) {
            throw new Error('A sessão mudou após a pré-visualização. Gere uma nova prévia antes de confirmar.');
        }
        exigirPermissaoEdicaoMapa('confirmar importação de recomendações');

        return executarMutacaoMapaPersistida(function () {
            var s = obterSessaoSeguraMapa() || {};
            var mapa = exigirMapaEConcorrencia(previa.mapaId);

            // Revalida alvos e escopos já resolvidos na prévia antes de importar
            previa.itens.forEach(function (it, idx) {
                if (it.alvo_status === 'RESOLVIDO' && it.alvo_item_id && it.alvo_ramo !== 'GERAL') {
                    var aindaExiste = localizarItemPorRamo(mapa, it.alvo_ramo, it.alvo_item_id);
                    if (!aindaExiste) {
                        throw new Error('O item alvo "' + (it.alvo_nome_resolvido || it.alvo_item_id) + '" (item #' + (idx + 1) + ') foi removido após a prévia. Gere uma nova prévia antes de confirmar.');
                    }
                }
                if (Array.isArray(it.funcao_ids_sugeridas) && it.funcao_ids_sugeridas.length) {
                    if (filtrarIdsValidos(it.funcao_ids_sugeridas, mapa.funcoes).length !== it.funcao_ids_sugeridas.length) {
                        throw new Error('Função referenciada no item #' + (idx + 1) + ' foi removida após a prévia. Gere uma nova prévia antes de confirmar.');
                    }
                }
                if (Array.isArray(it.etapa_ids_sugeridas) && it.etapa_ids_sugeridas.length) {
                    if (filtrarIdsValidos(it.etapa_ids_sugeridas, mapa.etapas).length !== it.etapa_ids_sugeridas.length) {
                        throw new Error('Etapa referenciada no item #' + (idx + 1) + ' foi removida após a prévia. Gere uma nova prévia antes de confirmar.');
                    }
                }
            });

            var criadas = [];
            previa.itens.forEach(function (it) {
                var rec = criarRegistroRecomendacao(mapa, Object.assign({}, it, {
                    alvo_status_origem: it.alvo_status || '',
                    alvo_candidatos_ambiguos: it.alvo_candidatos_ambiguos || [],
                    funcoes_nao_resolvidas: it.funcoes_nao_resolvidas || [],
                    etapas_nao_resolvidas: it.etapas_nao_resolvidas || [],
                    escopo_retirada: it.escopo_retirada || '',
                    origem: 'IA_EXTERNA'
                }), s.matricula || '');
                mapa.recomendacoes.unshift(rec);
                criadas.push(clonarProfundo(rec));
            });
            tocarVersaoMapa(mapa);
            return {
                mapaId: mapa.id,
                totalImportadas: criadas.length,
                notasDescartadas: previa.notasDescartadas || 0,
                recomendacoes: criadas
            };
        });
    }

    // =========================================================================
    // 7. BACKUP & RESTAURAÇÃO PRÓPRIOS (FORMATO ia_mapa_mental_backup_v1)
    // =========================================================================
    function gerarBackupMapasLocais() {
        sincronizarMapaDoStorage();
        var agoraIso = new Date().toISOString();
        var payload = {
            formato: FORMATO_BACKUP_MAPA,
            versao_esquema: VERSAO_ESQUEMA_MAPA,
            gerado_em: agoraIso,
            total_mapas: estadoMapa.mapas.length,
            mapas: clonarProfundo(estadoMapa.mapas)
        };
        var json = JSON.stringify(payload);
        return {
            formato: FORMATO_BACKUP_MAPA,
            geradoEm: agoraIso,
            nomeArquivo: 'backup-mapa-mental-sst-' + agoraIso.slice(0, 10) + '.json',
            totalMapas: estadoMapa.mapas.length,
            bytesUtf8: medirBytesUtf8(json),
            json: json
        };
    }

    function registrarBackupMapaExportado(geradoEmIso) {
        garantirEstadoSessaoMapa();
        var papel = obterPapelMapa();
        if (papel !== 'editor' && papel !== 'validador') return false;
        executarMutacaoMapaPersistida(function () {
            estadoMapa.ultimoBackupEm = String(geradoEmIso || new Date().toISOString());
            estadoMapa.alteracoesAposBackup = false;
        }, { preservarFlagBackup: true });
        return true;
    }

    function validarArrayStringsIds(arr) {
        if (arr === undefined) return [];
        if (!Array.isArray(arr)) throw new Error('Lista de vínculos inválida no backup do Mapa Mental.');
        return arr.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    }

    function validarENormalizarMapaBackup(m, idx) {
        var rotulo = 'mapa #' + (idx + 1);
        if (!m || typeof m !== 'object' || Array.isArray(m)) {
            throw new Error('Backup inválido: ' + rotulo + ' não é um objeto válido.');
        }
        var atividade = String(m.atividade || '').trim();
        if (!atividade) {
            throw new Error('Backup inválido: ' + rotulo + ' está sem Atividade central.');
        }
        function validarColecao(col, nomeCampo, fnMap) {
            if (col === undefined) return [];
            if (!Array.isArray(col)) throw new Error('Backup inválido: "' + nomeCampo + '" em ' + rotulo + ' deve ser lista.');
            return col.map(function (it, pos) {
                if (!it || typeof it !== 'object' || Array.isArray(it)) {
                    throw new Error('Backup inválido: item #' + (pos + 1) + ' de "' + nomeCampo + '" em ' + rotulo + ' é inválido.');
                }
                return fnMap(it, pos);
            });
        }

        var mapaNorm = {
            id: String(m.id || gerarIdMapa('mapa_bkp_' + idx)).trim(),
            versao: Math.max(1, Number(m.versao) || 1),
            codigo_mapa: String(m.codigo_mapa || ('MAPA-' + String(idx + 1).padStart(3, '0'))).trim(),
            atividade: atividade,
            frente_local: String(m.frente_local || '').trim(),
            apr_referencia_texto: String(m.apr_referencia_texto || '').trim(),
            observacoes_gerais: String(m.observacoes_gerais || '').trim(),
            status_mapa: 'RASCUNHO_MAPA',
            funcoes: validarColecao(m.funcoes, 'funcoes', function (f, pos) {
                var nome = String(f.nome || '').trim();
                if (!nome) throw new Error('Backup inválido: função #' + (pos + 1) + ' sem nome em ' + rotulo + '.');
                return {
                    id: String(f.id || gerarIdMapa('fn_bkp')).trim(),
                    nome: nome,
                    ghe_ref_leitura: String(f.ghe_ref_leitura || '').trim(),
                    nota_exposicao: String(f.nota_exposicao || '').trim(),
                    status: normalizarStatusItem(f.status)
                };
            }),
            ferramentas: validarColecao(m.ferramentas, 'ferramentas', function (fer, pos) {
                var nome = String(fer.nome || '').trim();
                if (!nome) throw new Error('Backup inválido: ferramenta #' + (pos + 1) + ' sem nome em ' + rotulo + '.');
                return {
                    id: String(fer.id || gerarIdMapa('fer_bkp')).trim(),
                    nome: nome,
                    etapa_ids: validarArrayStringsIds(fer.etapa_ids),
                    funcao_ids: validarArrayStringsIds(fer.funcao_ids),
                    status: normalizarStatusItem(fer.status),
                    observacao: String(fer.observacao || '').trim()
                };
            }),
            etapas: validarColecao(m.etapas, 'etapas', function (et, pos) {
                var nome = String(et.nome || '').trim();
                if (!nome) throw new Error('Backup inválido: etapa #' + (pos + 1) + ' sem nome em ' + rotulo + '.');
                var faseOp = String(et.fase_roteiro_opcional || '').trim();
                return {
                    id: String(et.id || gerarIdMapa('et_bkp')).trim(),
                    ordem: pos + 1,
                    nome: nome,
                    fase_roteiro_opcional: FASES_ROTEIRO_OPCIONAIS.some(function (f) { return f.id === faseOp; }) ? faseOp : '',
                    funcao_ids: validarArrayStringsIds(et.funcao_ids),
                    ferramenta_ids: validarArrayStringsIds(et.ferramenta_ids),
                    status: normalizarStatusItem(et.status),
                    observacao: String(et.observacao || '').trim()
                };
            }),
            epis: validarColecao(m.epis, 'epis', function (ep, pos) {
                var nome = String(ep.nome || '').trim();
                if (!nome) throw new Error('Backup inválido: EPI #' + (pos + 1) + ' sem nome em ' + rotulo + '.');
                var cat = String(ep.categoria || 'OBRIGATORIO').toUpperCase() === 'EVENTUAL' ? 'EVENTUAL' : 'OBRIGATORIO';
                return {
                    id: String(ep.id || gerarIdMapa('epi_bkp')).trim(),
                    nome: nome,
                    categoria: cat,
                    condicao_uso: String(ep.condicao_uso || '').trim(),
                    status_condicao: cat === 'EVENTUAL' ? normalizarStatusCondicaoEpi(ep.status_condicao) : 'NAO_APLICAVEL',
                    etapa_ids: validarArrayStringsIds(ep.etapa_ids),
                    funcao_ids: validarArrayStringsIds(ep.funcao_ids),
                    status: normalizarStatusItem(ep.status),
                    observacao: String(ep.observacao || '').trim()
                };
            }),
            perigos: validarColecao(m.perigos, 'perigos', function (per, pos) {
                var pf = String(per.perigo_fonte || '').trim();
                if (!pf) throw new Error('Backup inválido: perigo #' + (pos + 1) + ' sem perigo_fonte em ' + rotulo + '.');
                return {
                    id: String(per.id || gerarIdMapa('per_bkp')).trim(),
                    perigo_fonte: pf,
                    etapa_ids: validarArrayStringsIds(per.etapa_ids),
                    funcao_ids: validarArrayStringsIds(per.funcao_ids),
                    ferramenta_ids: validarArrayStringsIds(per.ferramenta_ids),
                    evento_risco: String(per.evento_risco || '').trim(),
                    danos_provaveis: String(per.danos_provaveis || '').trim(),
                    medidas_nr01: normalizarMedidasNr01(per.medidas_nr01),
                    status: normalizarStatusItem(per.status),
                    observacao: String(per.observacao || '').trim()
                };
            }),
            recomendacoes: validarColecao(m.recomendacoes, 'recomendacoes', function (rec) {
                var dec = String(rec.status_decisao || 'PENDENTE').toUpperCase();
                if (dec !== 'PENDENTE' && dec !== 'ACEITA' && dec !== 'ACEITA_COM_EDICAO' && dec !== 'REJEITADA') {
                    dec = 'PENDENTE';
                }
                var escRetBkp = String(rec.escopo_retirada || '').trim().toUpperCase();
                if (escRetBkp !== 'GLOBAL' && escRetBkp !== 'PARCIAL_FUNCOES') escRetBkp = '';
                return {
                    id: String(rec.id || gerarIdMapa('rec_bkp')).trim(),
                    tipo: TIPOS_RECOMENDACAO_VALIDOS.has(String(rec.tipo || '').toUpperCase()) ? String(rec.tipo).toUpperCase() : 'AJUSTAR',
                    alvo_ramo: RAMOS_ALVO_VALIDOS.has(String(rec.alvo_ramo || '').toUpperCase()) ? String(rec.alvo_ramo).toUpperCase() : 'GERAL',
                    alvo_item_id: String(rec.alvo_item_id || '').trim(),
                    campo_alvo: String(rec.campo_alvo || '').trim(),
                    escopo_retirada: escRetBkp,
                    origem: ORIGENS_RECOMENDACAO_VALIDAS.has(String(rec.origem || '').toUpperCase()) ? String(rec.origem).toUpperCase() : 'REVISAO_ENGENHARIA',
                    solicitante_papel: String(rec.solicitante_papel || '').trim(),
                    titulo: String(rec.titulo || rec.descricao_proposta || 'Recomendação').trim(),
                    descricao_proposta: String(rec.descricao_proposta || rec.titulo || '').trim(),
                    justificativa: String(rec.justificativa || '').trim(),
                    categoria_epi: String(rec.categoria_epi || '').toUpperCase() === 'EVENTUAL' ? 'EVENTUAL' : 'OBRIGATORIO',
                    condicao_uso: String(rec.condicao_uso || '').trim(),
                    etapa_ids_sugeridas: validarArrayStringsIds(rec.etapa_ids_sugeridas),
                    funcao_ids_sugeridas: validarArrayStringsIds(rec.funcao_ids_sugeridas),
                    funcoes_nao_resolvidas: validarArrayStringsIds(rec.funcoes_nao_resolvidas),
                    etapas_nao_resolvidas: validarArrayStringsIds(rec.etapas_nao_resolvidas),
                    funcoes_originais_nao_resolvidas: validarArrayStringsIds(rec.funcoes_originais_nao_resolvidas),
                    etapas_originais_nao_resolvidas: validarArrayStringsIds(rec.etapas_originais_nao_resolvidas),
                    alvo_status_origem: String(rec.alvo_status_origem || '').trim().toUpperCase(),
                    alvo_candidatos_ambiguos: Array.isArray(rec.alvo_candidatos_ambiguos)
                        ? rec.alvo_candidatos_ambiguos.map(function (c) {
                            return { id: String(c && c.id || ''), nome: String(c && c.nome || '') };
                        })
                        : [],
                    perguntas_abertas: Array.isArray(rec.perguntas_abertas) ? rec.perguntas_abertas.map(String) : [],
                    chave_dedup: String(rec.chave_dedup || '').trim(),
                    status_decisao: dec,
                    decisao_nota: String(rec.decisao_nota || '').trim(),
                    texto_editado: String(rec.texto_editado || '').trim(),
                    valor_anterior: rec.valor_anterior !== undefined ? rec.valor_anterior : null,
                    valor_aplicado: rec.valor_aplicado !== undefined ? rec.valor_aplicado : null,
                    snapshot_antes: (rec.snapshot_antes && typeof rec.snapshot_antes === 'object') ? clonarProfundo(rec.snapshot_antes) : null,
                    snapshot_depois: (rec.snapshot_depois && typeof rec.snapshot_depois === 'object') ? clonarProfundo(rec.snapshot_depois) : null,
                    escopo_resolvido_em: String(rec.escopo_resolvido_em || '').trim(),
                    decidido_por_matricula: String(rec.decidido_por_matricula || '').trim(),
                    decidido_em: String(rec.decidido_em || '').trim(),
                    criado_por_matricula: String(rec.criado_por_matricula || '').trim(),
                    created_at: String(rec.created_at || new Date().toISOString())
                };
            }),
            criado_por_matricula: String(m.criado_por_matricula || '').trim(),
            updated_at: String(m.updated_at || new Date().toISOString())
        };
        limparReferenciasOrfasDoMapa(mapaNorm);
        return mapaNorm;
    }

    function analisarBackupMapasLocais(textoBruto) {
        sincronizarMapaDoStorage();
        exigirPermissaoEdicaoMapa('restaurar backup do Mapa Mental');
        var limpo = String(textoBruto || '').trim();
        if (!limpo) throw new Error('Selecione ou cole um arquivo de backup (.json) do Mapa Mental.');
        if (medirBytesUtf8(limpo) > LIMITE_BYTES_BACKUP_MAPA) {
            throw new Error('Arquivo de backup excede o limite de ' + Math.round(LIMITE_BYTES_BACKUP_MAPA / 1024) + ' KB UTF-8.');
        }
        var erroSeg = contemConteudoProibidoMapa(limpo);
        if (erroSeg) throw new Error(erroSeg);

        var obj;
        try {
            obj = JSON.parse(limpo);
        } catch (e) {
            throw new Error('Arquivo de backup inválido (JSON malformado).');
        }
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error('Estrutura de backup inválida.');
        }
        if (obj.formato === FORMATO_BACKUP_LEGADO_CENARIOS) {
            throw new Error('Este arquivo é um backup da Aba 1 (Cenários e Regras). Restaure-o pela Aba 1.');
        }
        if (obj.formato !== FORMATO_BACKUP_MAPA) {
            throw new Error('Formato de backup não reconhecido ("' + String(obj.formato || 'ausente') + '"). Esperado: "' + FORMATO_BACKUP_MAPA + '".');
        }
        if (Number(obj.versao_esquema) !== VERSAO_ESQUEMA_MAPA) {
            throw new Error('Versão de esquema incompatível: ' + String(obj.versao_esquema || 'ausente') + '.');
        }
        if (!Array.isArray(obj.mapas)) {
            throw new Error('Backup inválido: campo "mapas" deve ser uma lista.');
        }
        if (obj.mapas.length === 0) {
            throw new Error('O backup não contém mapas mentais para restaurar.');
        }
        if (obj.mapas.length > LIMITE_MAX_MAPAS) {
            throw new Error('Backup contém ' + obj.mapas.length + ' mapas, acima do limite local de ' + LIMITE_MAX_MAPAS + '.');
        }

        var mapasValidados = obj.mapas.map(validarENormalizarMapaBackup);
        var conflitos = [];
        var novos = 0;
        var identicos = 0;
        mapasValidados.forEach(function (cand) {
            var existente = estadoMapa.mapas.find(function (ex) {
                return ex.id === cand.id ||
                    (cand.codigo_mapa && ex.codigo_mapa && normalizar(ex.codigo_mapa) === normalizar(cand.codigo_mapa)) ||
                    normalizar(ex.atividade) === normalizar(cand.atividade);
            });
            if (!existente) {
                novos++;
                return;
            }
            if (JSON.stringify(existente) === JSON.stringify(cand)) {
                identicos++;
            } else {
                conflitos.push({
                    idExistente: existente.id,
                    idBackup: cand.id,
                    atividade: cand.atividade,
                    codigo_mapa: cand.codigo_mapa
                });
            }
        });

        return {
            formato: FORMATO_BACKUP_MAPA,
            versao_esquema: VERSAO_ESQUEMA_MAPA,
            geracaoSessaoId: estadoMapa.geracaoSessaoId,
            identidadeChave: estadoMapa.identidadeChave,
            geradoEm: String(obj.gerado_em || ''),
            mapasValidados: mapasValidados,
            conflitos: conflitos,
            resumo: {
                totalNoArquivo: mapasValidados.length,
                novos: novos,
                identicos: identicos,
                conflitos: conflitos.length
            }
        };
    }

    function aplicarRestauracaoBackupMapas(previa, opcoes) {
        if (!previa || previa.formato !== FORMATO_BACKUP_MAPA || !Array.isArray(previa.mapasValidados)) {
            throw new Error('Prévia de backup inválida. Analise o arquivo novamente.');
        }
        opcoes = opcoes || {};
        garantirEstadoSessaoMapa();
        if (previa.geracaoSessaoId !== estadoMapa.geracaoSessaoId || previa.identidadeChave !== estadoMapa.identidadeChave) {
            throw new Error('A sessão mudou após a pré-visualização. Analise o backup novamente.');
        }
        exigirPermissaoEdicaoMapa('aplicar restauração de backup');

        var modo = opcoes.modo === 'substituir' ? 'substituir' : 'mesclar';
        var politica = String(opcoes.politicaConflito || '').trim();

        return executarMutacaoMapaPersistida(function () {
            if (modo === 'substituir' && estadoMapa.mapas.length > 0 && opcoes.backupPrevioConfirmado !== true) {
                throw new Error('Confirmação de cópia de segurança prévia obrigatória antes de substituir os mapas atuais.');
            }
            var proxMapas;
            if (modo === 'substituir') {
                proxMapas = clonarProfundo(previa.mapasValidados);
            } else {
                proxMapas = clonarProfundo(estadoMapa.mapas);
                var temConflitosReais = false;
                previa.mapasValidados.forEach(function (cand) {
                    var idxEx = proxMapas.findIndex(function (ex) {
                        return ex.id === cand.id ||
                            (cand.codigo_mapa && ex.codigo_mapa && normalizar(ex.codigo_mapa) === normalizar(cand.codigo_mapa)) ||
                            normalizar(ex.atividade) === normalizar(cand.atividade);
                    });
                    if (idxEx === -1) {
                        proxMapas.push(clonarProfundo(cand));
                        return;
                    }
                    if (JSON.stringify(proxMapas[idxEx]) === JSON.stringify(cand)) {
                        return;
                    }
                    temConflitosReais = true;
                    if (!politica || (politica !== 'manter_existente' && politica !== 'restaurar_copia' && politica !== 'substituir_versao')) {
                        throw new Error('Existem mapas conflitantes no modo Mesclar. Escolha uma política de conflito explícita (manter_existente, restaurar_copia ou substituir_versao).');
                    }
                    if (politica === 'manter_existente') return;
                    if (politica === 'restaurar_copia') {
                        var copia = clonarProfundo(cand);
                        copia.id = gerarIdMapa('mapa_copia');
                        copia.codigo_mapa = copia.codigo_mapa + '-COPIA';
                        copia.versao = 1;
                        proxMapas.push(copia);
                        return;
                    }
                    if (politica === 'substituir_versao') {
                        var sub = clonarProfundo(cand);
                        sub.id = proxMapas[idxEx].id;
                        sub.versao = (Number(proxMapas[idxEx].versao) || 1) + 1;
                        proxMapas[idxEx] = sub;
                    }
                });
                if (temConflitosReais && !politica) {
                    throw new Error('Selecione uma política de conflito antes de mesclar.');
                }
            }

            if (proxMapas.length > LIMITE_MAX_MAPAS) {
                throw new Error('Resultado da restauração teria ' + proxMapas.length + ' mapas (limite local: ' + LIMITE_MAX_MAPAS + ').');
            }
            var simulacao = JSON.stringify({
                versao_esquema: VERSAO_ESQUEMA_MAPA,
                mapas: proxMapas,
                ultimoBackupEm: estadoMapa.ultimoBackupEm || '',
                alteracoesAposBackup: true
            });
            var bytes = medirBytesUtf8(simulacao);
            if (bytes > LIMITE_BYTES_MAPA_SESSAO) {
                throw new Error('Tamanho após restauração (' + bytes + ' bytes) ultrapassa o limite local de ' + LIMITE_BYTES_MAPA_SESSAO + ' bytes UTF-8.');
            }

            estadoMapa.mapas = proxMapas;
            estadoMapa.mapaSelecionadoId = proxMapas[0] ? proxMapas[0].id : '';
            resetarControlesVisuaisMapa();
            return {
                modo: modo,
                politicaConflito: politica || null,
                totalMapasAtuais: proxMapas.length
            };
        });
    }

    // =========================================================================
    // 8. CONSULTA & IMPRESSÃO SEGURA (VIA abrirDocumentoHtmlParaImpressao)
    // =========================================================================
    function imprimirMapaMentalIa(mapaId) {
        garantirEstadoSessaoMapa();
        var mapa = buscarMapaPorId(mapaId || estadoMapa.mapaSelecionadoId) || estadoMapa.mapas[0];
        if (!mapa) {
            throw new Error('Cadastre ou selecione um Mapa Mental antes de imprimir.');
        }

        function nomesIds(ids, col) {
            if (!Array.isArray(ids) || !ids.length) return 'Não definido';
            return ids.map(function (id) {
                var item = col.find(function (x) { return x.id === id; });
                return item ? (item.nome || item.perigo_fonte || id) : id;
            }).join(', ');
        }

        var linhasTabela = mapa.perigos.length
            ? mapa.perigos.map(function (p, i) {
                var med = p.medidas_nr01 || {};
                var resumoMed = [
                    med.eliminacao_substituicao ? 'Eliminação: ' + med.eliminacao_substituicao : '',
                    med.engenharia_epc ? 'EPC: ' + med.engenharia_epc : '',
                    med.administrativo_organizacao ? 'Adm/Org: ' + med.administrativo_organizacao : '',
                    med.epi_complementar ? 'EPI: ' + med.epi_complementar : ''
                ].filter(Boolean).join(' | ') || 'Não avaliado';
                return '<tr>' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + esc(nomesIds(p.etapa_ids, mapa.etapas)) + '</td>' +
                    '<td>' + esc(nomesIds(p.funcao_ids, mapa.funcoes)) + '</td>' +
                    '<td><b>' + esc(p.perigo_fonte) + '</b></td>' +
                    '<td>' + esc(p.evento_risco || 'Não avaliado') + '<br><i>Danos: ' + esc(p.danos_provaveis || 'Não avaliado') + '</i></td>' +
                    '<td>' + esc(resumoMed) + '</td>' +
                    '<td>' + esc(obterLabelStatusItem(p.status)) + '</td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="7" style="text-align:center;">Nenhum perigo cadastrado.</td></tr>';

        var episHtml = mapa.epis.length
            ? mapa.epis.map(function (e) {
                var extra = e.categoria === 'EVENTUAL' ? (' — Condição: ' + (e.condicao_uso || 'Pendente') + ' (' + obterLabelCondicaoEpi(e.status_condicao) + ')') : '';
                return '<li><b>[' + esc(e.categoria) + ']</b> ' + esc(e.nome) + esc(extra) + ' — Funções: ' + esc(nomesIds(e.funcao_ids, mapa.funcoes)) + ' [' + esc(obterLabelStatusItem(e.status)) + ']</li>';
            }).join('')
            : '<li>Nenhum EPI registrado.</li>';

        var recHtml = mapa.recomendacoes.length
            ? mapa.recomendacoes.map(function (r) {
                return '<tr>' +
                    '<td>' + esc(r.tipo) + ' (' + esc(r.alvo_ramo) + ')</td>' +
                    '<td>' + esc(r.titulo) + '</td>' +
                    '<td>' + esc(r.justificativa || '-') + '</td>' +
                    '<td>' + esc(r.status_decisao) + (r.decisao_nota ? ' — ' + esc(r.decisao_nota) : '') + '</td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="4" style="text-align:center;">Nenhuma recomendação registrada.</td></tr>';

        var titulo = 'Mapa Mental SST — ' + mapa.atividade;
        var agora = new Date();
        var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
            '<title>' + esc(titulo) + '</title>' +
            '<style>' +
            '@page { size: A4 landscape; margin: 10mm; }' +
            'body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #0f172a; margin: 0; line-height: 1.35; }' +
            '.cab { border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; display:flex; justify-content:space-between; }' +
            '.aviso { background:#fffbeb; border:1px solid #f59e0b; padding:6px 10px; border-radius:6px; margin-bottom:8px; }' +
            'table { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:9px; }' +
            'th, td { border:1px solid #cbd5e1; padding:4px 6px; text-align:left; vertical-align:top; }' +
            'th { background:#e2e8f0; font-weight:700; }' +
            '</style>' +
            '<script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };<\/script>' +
            '</head><body>' +
            '<div class="cab">' +
                '<div><h1 style="font-size:13px; margin:0;">MAPA MENTAL SST — ' + esc(mapa.atividade) + '</h1>' +
                '<div>Frente/Local: ' + esc(mapa.frente_local || '-') + ' | Ref. APR: ' + esc(mapa.apr_referencia_texto || '-') + '</div></div>' +
                '<div style="text-align:right;"><b>' + esc(mapa.codigo_mapa) + '</b> (v' + esc(mapa.versao || 1) + ')<br>Emissão: ' + esc(agora.toLocaleDateString('pt-BR')) + '</div>' +
            '</div>' +
            '<div class="aviso"><b>Instrumento de Apoio (Fase 1):</b> Rascunho técnico local para análise crítica de inclusões, retiradas e diferenciação por função. Não substitui a APR oficial nem atribui P×S ou marca EPIs automaticamente.</div>' +
            '<h2 style="font-size:11px;">1. Funções Participantes &amp; Etapas</h2>' +
            '<p><b>Funções:</b> ' + esc(mapa.funcoes.map(function (f) { return f.nome + (f.ghe_ref_leitura ? ' [Ref. GHE leitura: ' + f.ghe_ref_leitura + ']' : ''); }).join(' | ') || 'Nenhuma') + '</p>' +
            '<p><b>Etapas:</b> ' + esc(mapa.etapas.map(function (e) { return e.ordem + '. ' + e.nome; }).join(' → ') || 'Nenhuma') + '</p>' +
            '<p><b>Ferramentas:</b> ' + esc(mapa.ferramentas.map(function (f) { return f.nome; }).join(', ') || 'Nenhuma') + '</p>' +
            '<h2 style="font-size:11px;">2. EPIs (Obrigatórios e Eventuais)</h2><ul>' + episHtml + '</ul>' +
            '<h2 style="font-size:11px;">3. Tabela de Vínculos: Etapa × Funções × Perigo/Fonte × NR-01</h2>' +
            '<table><thead><tr><th>#</th><th>Etapas</th><th>Funções Expostas</th><th>Perigo / Fonte</th><th>Evento &amp; Danos</th><th>Medidas (Hierarquia NR-01)</th><th>Status</th></tr></thead><tbody>' + linhasTabela + '</tbody></table>' +
            '<h2 style="font-size:11px;">4. Histórico de Recomendações (Incluir / Retirar / Ajustar)</h2>' +
            '<table><thead><tr><th>Tipo / Alvo</th><th>Proposta</th><th>Justificativa</th><th>Decisão</th></tr></thead><tbody>' + recHtml + '</tbody></table>' +
            '</body></html>';

        if (typeof window.abrirDocumentoHtmlParaImpressao === 'function') {
            window.abrirDocumentoHtmlParaImpressao(html, titulo);
        }
        return html;
    }

    // =========================================================================
    // 9. RENDERIZAÇÃO DA INTERFACE (MAPA MENTAL + TABELA SINCRONIZADA)
    // =========================================================================
    function renderBadgesVinculos(ids, colecao, prefixo, vazioTexto) {
        if (!Array.isArray(ids) || !ids.length) {
            return '<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#fef2f2; color:#991b1b;">' + esc(vazioTexto || 'Sem vínculo') + '</span>';
        }
        return ids.map(function (id) {
            var it = colecao.find(function (x) { return x.id === id; });
            var label = it ? (it.nome || it.perigo_fonte || id) : id;
            return '<span style="font-size:10.5px; padding:2px 6px; border-radius:4px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">' + esc(prefixo ? prefixo + label : label) + '</span>';
        }).join(' ');
    }

    function renderBadgeStatus(status, labelFn) {
        var cor = obterCorBadgeStatus(status);
        var txt = labelFn ? labelFn(status) : obterLabelStatusItem(status);
        return '<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:999px; background:' + cor.bg + '; color:' + cor.fg + ';">' + esc(txt) + '</span>';
    }

    function renderCheckboxesVinculos(grupoName, colecao, selecionadosIds, labelField) {
        if (!colecao.length) {
            return '<div style="font-size:11px; color:var(--text-light);">Nenhum item cadastrado neste ramo ainda.</div>';
        }
        var setSel = new Set(Array.isArray(selecionadosIds) ? selecionadosIds : []);
        return '<div style="display:flex; flex-wrap:wrap; gap:8px; padding:6px; border:1px solid var(--border); border-radius:6px; background:var(--bg);">' +
            colecao.map(function (it) {
                var txt = it[labelField || 'nome'] || it.id;
                return '<label style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; cursor:pointer;">' +
                    '<input type="checkbox" class="' + esc(grupoName) + '" value="' + esc(it.id) + '"' + (setSel.has(it.id) ? ' checked' : '') + '> ' +
                    esc(txt) +
                '</label>';
            }).join('') +
        '</div>';
    }

    function renderFormularioMapaHtml(mapaAtual) {
        if (!estadoMapa.formMapaAberto) return '';
        var editando = estadoMapa.formMapaAberto.modo === 'editar' ? mapaAtual : null;
        return '<div class="db-chart-card" style="margin-bottom:14px; border:2px solid var(--primary, #2563eb);">' +
            '<h3 style="margin:0 0 10px 0; font-size:14px;">' + (editando ? '✏️ Editar Atividade do Mapa Mental' : '➕ Novo Mapa Mental de Atividade') + '</h3>' +
            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:10px;">' +
                '<div><label style="font-size:11px; font-weight:700; display:block;">Atividade / Tarefa Central *</label>' +
                    '<input type="text" id="mmForm_atividade" class="db-input" style="width:100%;" value="' + esc(editando ? editando.atividade : '') + '" placeholder="Ex.: Atividade operacional em frente de serviço"></div>' +
                '<div><label style="font-size:11px; font-weight:700; display:block;">Frente / Local</label>' +
                    '<input type="text" id="mmForm_frente" class="db-input" style="width:100%;" value="' + esc(editando ? editando.frente_local : '') + '" placeholder="Ex.: Frente de serviço / área operacional"></div>' +
                '<div><label style="font-size:11px; font-weight:700; display:block;">APR de Referência (texto opcional)</label>' +
                    '<input type="text" id="mmForm_aprRef" class="db-input" style="width:100%;" value="' + esc(editando ? editando.apr_referencia_texto : '') + '" placeholder="Ex.: APR única da frente / equipe mista"></div>' +
            '</div>' +
            '<div style="margin-top:8px;"><label style="font-size:11px; font-weight:700; display:block;">Observações Gerais</label>' +
                '<textarea id="mmForm_obs" class="db-input" rows="2" style="width:100%;">' + esc(editando ? editando.observacoes_gerais : '') + '</textarea></div>' +
            (!editando ? (
                '<div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border);">' +
                    '<div style="font-size:11.5px; font-weight:700; color:var(--text); margin-bottom:6px;">Listas soltas iniciais (opcional — um item por linha ou separado por ";", entram como "Não avaliado")</div>' +
                    '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">' +
                        '<div><label style="font-size:11px;">Funções envolvidas</label><textarea id="mmForm_funcoesTxt" class="db-input" rows="2" style="width:100%;" placeholder="Ex.: Função 1&#10;Função 2&#10;Função 3"></textarea></div>' +
                        '<div><label style="font-size:11px;">Ferramentas de rotina</label><textarea id="mmForm_ferramentasTxt" class="db-input" rows="2" style="width:100%;"></textarea></div>' +
                        '<div><label style="font-size:11px;">Etapas previstas</label><textarea id="mmForm_etapasTxt" class="db-input" rows="2" style="width:100%;"></textarea></div>' +
                        '<div><label style="font-size:11px;">EPIs obrigatórios (lista inicial)</label><textarea id="mmForm_episObrigTxt" class="db-input" rows="2" style="width:100%;"></textarea></div>' +
                        '<div><label style="font-size:11px;">EPIs eventuais (condicional)</label><textarea id="mmForm_episEventTxt" class="db-input" rows="2" style="width:100%;"></textarea></div>' +
                        '<div><label style="font-size:11px;">Perigos / Fontes lembrados</label><textarea id="mmForm_perigosTxt" class="db-input" rows="2" style="width:100%;"></textarea></div>' +
                    '</div>' +
                '</div>'
            ) : '') +
            '<div style="display:flex; gap:8px; margin-top:10px;">' +
                '<button type="button" class="db-apply-btn" onclick="window.salvarFormMapaMentalIaUI()">💾 Salvar Mapa</button>' +
                '<button type="button" class="db-clear-btn" onclick="window.fecharFormMapaMentalIaUI()">Cancelar</button>' +
            '</div>' +
        '</div>';
    }

    function renderFormularioRamoHtml(mapa) {
        var f = estadoMapa.formRamoAberto;
        if (!f || !mapa) return '';
        var ramo = f.ramo;
        var item = f.itemId ? localizarItemPorRamo(mapa, ramo, f.itemId) : null;
        var titulo = (item ? '✏️ Editar ' : '➕ Adicionar ') + ramo;
        var campos = '';

        if (ramo === 'FUNCAO') {
            campos = '<div><label style="font-size:11px; font-weight:700;">Função participante *</label>' +
                '<input type="text" id="mmRamo_nome" class="db-input" style="width:100%;" value="' + esc(item ? item.nome : '') + '"></div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Nota de exposição / papel na atividade</label>' +
                '<input type="text" id="mmRamo_nota" class="db-input" style="width:100%;" value="' + esc(item ? item.nota_exposicao : '') + '" placeholder="Ex.: Participa apenas do deslocamento, não opera foice"></div>';
        } else if (ramo === 'FERRAMENTA') {
            campos = '<div><label style="font-size:11px; font-weight:700;">Ferramenta / Equipamento *</label>' +
                '<input type="text" id="mmRamo_nome" class="db-input" style="width:100%;" value="' + esc(item ? item.nome : '') + '"></div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Etapas em que é usada</label>' + renderCheckboxesVinculos('mmRamoEtapaCb', mapa.etapas, item ? item.etapa_ids : [], 'nome') + '</div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Funções que manuseiam</label>' + renderCheckboxesVinculos('mmRamoFuncaoCb', mapa.funcoes, item ? item.funcao_ids : [], 'nome') + '</div>';
        } else if (ramo === 'ETAPA') {
            var faseAtual = item ? item.fase_roteiro_opcional : '';
            campos = '<div style="display:grid; grid-template-columns:2fr 1fr; gap:8px;">' +
                '<div><label style="font-size:11px; font-weight:700;">Nome da Etapa *</label>' +
                    '<input type="text" id="mmRamo_nome" class="db-input" style="width:100%;" value="' + esc(item ? item.nome : '') + '"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Fase do roteiro (opcional)</label>' +
                    '<select id="mmRamo_faseOp" class="db-input" style="width:100%;"><option value="">Sem vínculo</option>' +
                    FASES_ROTEIRO_OPCIONAIS.map(function (fo) {
                        return '<option value="' + esc(fo.id) + '"' + (faseAtual === fo.id ? ' selected' : '') + '>' + esc(fo.label) + '</option>';
                    }).join('') + '</select></div></div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Funções participantes desta etapa</label>' + renderCheckboxesVinculos('mmRamoFuncaoCb', mapa.funcoes, item ? item.funcao_ids : [], 'nome') + '</div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Ferramentas usadas nesta etapa</label>' + renderCheckboxesVinculos('mmRamoFerramentaCb', mapa.ferramentas, item ? item.ferramenta_ids : [], 'nome') + '</div>';
        } else if (ramo === 'EPI') {
            var cat = item ? item.categoria : (f.categoriaPadrao || 'OBRIGATORIO');
            var sc = item ? item.status_condicao : 'PENDENTE';
            campos = '<div style="display:grid; grid-template-columns:2fr 1fr; gap:8px;">' +
                '<div><label style="font-size:11px; font-weight:700;">Nome do EPI *</label>' +
                    '<input type="text" id="mmRamo_nome" class="db-input" style="width:100%;" value="' + esc(item ? item.nome : '') + '"></div>' +
                '<div><label style="font-size:11px; font-weight:700;">Grupo</label>' +
                    '<select id="mmRamo_epiCat" class="db-input" style="width:100%;">' +
                    '<option value="OBRIGATORIO"' + (cat === 'OBRIGATORIO' ? ' selected' : '') + '>EPI Obrigatório (Recomendação)</option>' +
                    '<option value="EVENTUAL"' + (cat === 'EVENTUAL' ? ' selected' : '') + '>EPI Eventual (Condicional)</option>' +
                    '</select></div></div>' +
                '<div style="display:grid; grid-template-columns:2fr 1fr; gap:8px; margin-top:6px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Condição de uso (para EPI Eventual)</label>' +
                        '<input type="text" id="mmRamo_epiCond" class="db-input" style="width:100%;" value="' + esc(item ? item.condicao_uso : '') + '" placeholder="Ex.: Em talude íngreme ou desnível > 2,0 m"></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Status da condição</label>' +
                        '<select id="mmRamo_epiCondStatus" class="db-input" style="width:100%;">' +
                        '<option value="PENDENTE"' + (sc === 'PENDENTE' ? ' selected' : '') + '>Condição pendente</option>' +
                        '<option value="APLICAVEL"' + (sc === 'APLICAVEL' ? ' selected' : '') + '>Condição confirmada</option>' +
                        '<option value="NAO_APLICAVEL"' + (sc === 'NAO_APLICAVEL' ? ' selected' : '') + '>Não aplicável</option>' +
                        '</select></div></div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Funções que utilizam</label>' + renderCheckboxesVinculos('mmRamoFuncaoCb', mapa.funcoes, item ? item.funcao_ids : [], 'nome') + '</div>' +
                '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Etapas vinculadas</label>' + renderCheckboxesVinculos('mmRamoEtapaCb', mapa.etapas, item ? item.etapa_ids : [], 'nome') + '</div>';
        } else if (ramo === 'PERIGO') {
            var med = (item && item.medidas_nr01) ? item.medidas_nr01 : {};
            campos = '<div><label style="font-size:11px; font-weight:700;">Perigo / Fonte *</label>' +
                '<input type="text" id="mmRamo_perigoFonte" class="db-input" style="width:100%;" value="' + esc(item ? item.perigo_fonte : '') + '"></div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:6px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Etapas onde ocorre</label>' + renderCheckboxesVinculos('mmRamoEtapaCb', mapa.etapas, item ? item.etapa_ids : [], 'nome') + '</div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Funções expostas</label>' + renderCheckboxesVinculos('mmRamoFuncaoCb', mapa.funcoes, item ? item.funcao_ids : [], 'nome') + '</div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Ferramentas relacionadas</label>' + renderCheckboxesVinculos('mmRamoFerramentaCb', mapa.ferramentas, item ? item.ferramenta_ids : [], 'nome') + '</div>' +
                '</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Evento / Risco (pode ficar pendente)</label><textarea id="mmRamo_evento" class="db-input" rows="2" style="width:100%;">' + esc(item ? item.evento_risco : '') + '</textarea></div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Danos Prováveis</label><textarea id="mmRamo_danos" class="db-input" rows="2" style="width:100%;">' + esc(item ? item.danos_provaveis : '') + '</textarea></div>' +
                '</div>' +
                '<div style="margin-top:6px; font-size:11px; font-weight:700;">Medidas de Prevenção — Hierarquia NR-01 (opcional/pendente):</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">' +
                    '<input type="text" id="mmRamo_nr01_elim" class="db-input" value="' + esc(med.eliminacao_substituicao || '') + '" placeholder="1. Eliminação / Substituição">' +
                    '<input type="text" id="mmRamo_nr01_epc" class="db-input" value="' + esc(med.engenharia_epc || '') + '" placeholder="2. Controle de Engenharia / EPC">' +
                    '<input type="text" id="mmRamo_nr01_adm" class="db-input" value="' + esc(med.administrativo_organizacao || '') + '" placeholder="3. Administrativo / Organização do Trabalho">' +
                    '<input type="text" id="mmRamo_nr01_epi" class="db-input" value="' + esc(med.epi_complementar || '') + '" placeholder="4. EPI complementar (último nível)">' +
                '</div>';
        }

        return '<div class="db-chart-card" style="margin-bottom:14px; border:2px solid #0284c7;">' +
            '<h3 style="margin:0 0 8px 0; font-size:13.5px;">' + esc(titulo) + '</h3>' +
            campos +
            '<div style="display:flex; gap:8px; margin-top:10px;">' +
                '<button type="button" class="db-apply-btn" onclick="window.salvarFormRamoMapaIaUI()">💾 Salvar Item</button>' +
                '<button type="button" class="db-clear-btn" onclick="window.fecharFormRamoMapaIaUI()">Cancelar</button>' +
            '</div>' +
        '</div>';
    }

    function renderVisaoMapaHtml(mapa, podeEditar) {
        var fEtapa = estadoMapa.etapaFocoId;
        var fFuncao = estadoMapa.funcaoFocoId;
        var etapaAtivaObj = fEtapa ? mapa.etapas.find(function (e) { return e.id === fEtapa; }) : null;
        var funcaoAtivaObj = fFuncao ? mapa.funcoes.find(function (f) { return f.id === fFuncao; }) : null;

        function filtraItemMapa(item) {
            if (fEtapa && (!Array.isArray(item.etapa_ids) || item.etapa_ids.indexOf(fEtapa) === -1)) return false;
            if (fFuncao && (!Array.isArray(item.funcao_ids) || item.funcao_ids.indexOf(fFuncao) === -1)) return false;
            return true;
        }

        var funcoesVisiveis = etapaAtivaObj
            ? mapa.funcoes.filter(function (fn) { return (etapaAtivaObj.funcao_ids || []).indexOf(fn.id) !== -1; })
            : mapa.funcoes;
        var etapasVisiveis = funcaoAtivaObj
            ? mapa.etapas.filter(function (et) { return Array.isArray(et.funcao_ids) && et.funcao_ids.indexOf(fFuncao) !== -1; })
            : mapa.etapas;
        var ferramentasVisiveis = mapa.ferramentas.filter(filtraItemMapa);
        var episObrig = mapa.epis.filter(function (e) { return e.categoria !== 'EVENTUAL' && filtraItemMapa(e); });
        var episEvent = mapa.epis.filter(function (e) { return e.categoria === 'EVENTUAL' && filtraItemMapa(e); });
        var perigosVisiveis = mapa.perigos.filter(filtraItemMapa);
        var perigoFoco = perigosVisiveis.find(function (p) { return p.id === estadoMapa.perigoFocoId; }) || perigosVisiveis[0] || null;
        var medFoco = (perigoFoco && perigoFoco.medidas_nr01) ? perigoFoco.medidas_nr01 : {};

        function ramoAberto(chave) {
            return !(estadoMapa.ramosRecolhidos && estadoMapa.ramosRecolhidos[chave]);
        }

        function cabecalhoRamo(chave, tituloHtml, btnAddHtml) {
            var aberto = ramoAberto(chave);
            return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:' + (aberto ? '8px' : '0') + ';">' +
                '<button type="button" class="db-clear-btn" style="font-weight:800; font-size:12.5px; text-align:left; border:none; background:transparent; padding:0; cursor:pointer;" onclick="window.alternarRamoMapaIaUI(\'' + esc(chave) + '\')">' +
                    (aberto ? '▾ ' : '▸ ') + tituloHtml +
                '</button>' +
                '<div style="display:flex; gap:4px; align-items:center;">' + (btnAddHtml || '') + '</div>' +
            '</div>';
        }

        function botoesStatusInline(ramo, item) {
            if (!podeEditar) return '';
            return '<select class="db-input" style="font-size:10.5px; padding:2px 4px;" onchange="window.alterarStatusItemMapaIaUI(\'' + esc(ramo) + '\', \'' + esc(item.id) + '\', this.value)">' +
                '<option value="NAO_AVALIADO"' + (item.status === 'NAO_AVALIADO' ? ' selected' : '') + '>Não avaliado</option>' +
                '<option value="CONFIRMADO"' + (item.status === 'CONFIRMADO' ? ' selected' : '') + '>Confirmado</option>' +
                '<option value="NAO_APLICAVEL"' + (item.status === 'NAO_APLICAVEL' ? ' selected' : '') + '>Não aplicável</option>' +
            '</select>' +
            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.abrirFormRamoMapaIaUI(\'' + esc(ramo) + '\', \'' + esc(item.id) + '\')">✏️</button>' +
            '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px; color:var(--danger);" onclick="window.removerItemMapaIaUI(\'' + esc(ramo) + '\', \'' + esc(item.id) + '\')">🗑️</button>';
        }

        var quadrosEsquerdaHtml = '';
        if (perigoFoco) {
            quadrosEsquerdaHtml = '<div id="mmQuadrosEsquerdaPerigo" style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">' +
                '<div style="font-size:11px; font-weight:800; color:var(--primary); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                    '<span>🔗 Cadeia do Perigo Focado: ' + esc(perigoFoco.perigo_fonte) + '</span>' +
                    (podeEditar ? '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.abrirFormRamoMapaIaUI(\'PERIGO\', \'' + esc(perigoFoco.id) + '\')">✏️ Editar Cadeia</button>' : '') +
                '</div>' +
                '<div class="db-chart-card" style="padding:10px; border-left:4px solid #f59e0b;">' +
                    '<div style="font-size:11px; font-weight:800; color:#b45309;">⚡ Evento / Risco</div>' +
                    '<div style="font-size:12px; color:var(--text); margin-top:4px;">' + esc(perigoFoco.evento_risco || 'Não avaliado (pendente)') + '</div>' +
                '</div>' +
                '<div class="db-chart-card" style="padding:10px; border-left:4px solid #ef4444;">' +
                    '<div style="font-size:11px; font-weight:800; color:#b91c1c;">🩹 Danos Prováveis</div>' +
                    '<div style="font-size:12px; color:var(--text); margin-top:4px;">' + esc(perigoFoco.danos_provaveis || 'Não avaliado (pendente)') + '</div>' +
                '</div>' +
                '<div class="db-chart-card" style="padding:10px; border-left:4px solid #10b981;">' +
                    '<div style="font-size:11px; font-weight:800; color:#047857;">🛡️ Medidas de Prevenção (Hierarquia NR-01)</div>' +
                    '<div style="font-size:11.5px; color:var(--text); margin-top:4px; line-height:1.45;">' +
                        '<div><b>1. Eliminação/Subst.:</b> ' + esc(medFoco.eliminacao_substituicao || 'Não avaliado') + '</div>' +
                        '<div><b>2. Engenharia (EPC):</b> ' + esc(medFoco.engenharia_epc || 'Não avaliado') + '</div>' +
                        '<div><b>3. Administrativo/Org.:</b> ' + esc(medFoco.administrativo_organizacao || 'Não avaliado') + '</div>' +
                        '<div><b>4. EPI Complementar:</b> ' + esc(medFoco.epi_complementar || 'Não avaliado') + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        } else if (fEtapa || fFuncao) {
            quadrosEsquerdaHtml = '<div id="mmQuadrosEsquerdaPerigo" class="db-chart-card" style="margin-top:12px; font-size:11.5px; color:var(--text-light);">' +
                '<b>Evento/Risco, Danos e Medidas (Hierarquia NR-01)</b><br>Nenhum perigo vinculado ao filtro atual de função/etapa.' +
            '</div>';
        } else {
            quadrosEsquerdaHtml = '<div id="mmQuadrosEsquerdaPerigo" class="db-chart-card" style="margin-top:12px; font-size:11.5px; color:var(--text-light);">' +
                '<b>Evento/Risco, Danos e Medidas (Hierarquia NR-01)</b><br>Adicione ou foque em um Perigo/Fonte no ramo à direita para visualizar e editar sua cadeia vinculada aqui.' +
            '</div>';
        }

        var colunaEsquerda = '<div>' +
            '<div class="db-chart-card" style="background:var(--bg); border:2px solid var(--primary, #2563eb);">' +
                '<div style="font-size:11px; font-weight:700; color:var(--primary);">' + esc(mapa.codigo_mapa) + ' • v' + esc(mapa.versao || 1) + ' • NÓ CENTRAL DA ATIVIDADE</div>' +
                '<h3 style="margin:2px 0 6px 0; font-size:16px; color:var(--text);">' + esc(mapa.atividade) + '</h3>' +
                '<div style="font-size:11.5px; color:var(--text-light); line-height:1.45;">' +
                    '<div><b>Frente/Local:</b> ' + esc(mapa.frente_local || 'Não informado') + '</div>' +
                    '<div><b>APR de referência:</b> ' + esc(mapa.apr_referencia_texto || 'Equipe mista / APR única') + '</div>' +
                    (mapa.observacoes_gerais ? '<div style="margin-top:4px;">' + esc(mapa.observacoes_gerais) + '</div>' : '') +
                '</div>' +
                (podeEditar ? (
                    '<div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">' +
                        '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.abrirFormMapaMentalIaUI(\'' + esc(mapa.id) + '\')">✏️ Editar Atividade</button>' +
                        '<button type="button" class="db-clear-btn" style="font-size:11px; color:var(--danger);" onclick="window.excluirMapaMentalIaUI(\'' + esc(mapa.id) + '\')">🗑️ Excluir</button>' +
                    '</div>'
                ) : '') +
                (etapaAtivaObj || funcaoAtivaObj ? (
                    '<div style="margin-top:8px; padding:6px 8px; border-radius:6px; background:#eff6ff; border:1px solid #93c5fd; font-size:11px; display:flex; flex-direction:column; gap:4px;">' +
                        (etapaAtivaObj ? '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px;"><span>🔍 Etapa: <b>' + esc(etapaAtivaObj.ordem + '. ' + etapaAtivaObj.nome) + '</b></span><button type="button" class="db-clear-btn" style="font-size:10.5px; padding:1px 6px;" onclick="window.filtrarMapaPorEtapaUI(\'\')">Limpar</button></div>' : '') +
                        (funcaoAtivaObj ? '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px;"><span>👷 Função: <b>' + esc(funcaoAtivaObj.nome) + '</b></span><button type="button" class="db-clear-btn" style="font-size:10.5px; padding:1px 6px;" onclick="window.filtrarMapaPorFuncaoUI(\'\')">Limpar</button></div>' : '') +
                    '</div>'
                ) : '') +
            '</div>' +
            quadrosEsquerdaHtml +
        '</div>';

        var colunaDireita = '<div style="border-left:3px solid #93c5fd; padding-left:14px; display:flex; flex-direction:column; gap:12px;">' +
            // Ramo 1: Funções
            '<div class="db-chart-card" style="border-left:4px solid #10b981;">' +
                cabecalhoRamo('FUNCOES', '👷 Funções Envolvidas (' + funcoesVisiveis.length + ')', podeEditar ? '<button type="button" class="db-apply-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirFormRamoMapaIaUI(\'FUNCAO\')">+</button>' : '') +
                (ramoAberto('FUNCOES') ? (
                    funcoesVisiveis.length ? funcoesVisiveis.map(function (fn) {
                        var focada = fFuncao === fn.id;
                        return '<div style="padding:6px 8px; border:1px solid ' + (focada ? 'var(--primary)' : 'var(--border)') + '; border-radius:6px; margin-bottom:6px; font-size:11.5px; background:' + (focada ? '#eff6ff' : 'transparent') + ';">' +
                            '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">' +
                                '<button type="button" style="border:none; background:transparent; padding:0; font-weight:800; cursor:pointer; color:var(--text);" onclick="window.filtrarMapaPorFuncaoUI(\'' + esc(fn.id) + '\')" title="Clique para focar apenas itens vinculados a esta função">' + (focada ? '🔍 ' : '') + esc(fn.nome) + '</button>' +
                                renderBadgeStatus(fn.status) +
                            '</div>' +
                            (fn.ghe_ref_leitura ? '<div style="font-size:10.5px; color:#1d4ed8; margin-top:2px;">Ref. GHE (leitura): ' + esc(fn.ghe_ref_leitura) + ' — não prova exposição nesta tarefa</div>' : '') +
                            (fn.nota_exposicao ? '<div style="font-size:10.5px; color:var(--text-light); margin-top:2px;">' + esc(fn.nota_exposicao) + '</div>' : '') +
                            '<div style="display:flex; gap:4px; margin-top:4px;">' + botoesStatusInline('FUNCAO', fn) + '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma função vinculada.</div>'
                ) : '') +
            '</div>' +

            // Ramo 2: Ferramentas
            '<div class="db-chart-card" style="border-left:4px solid #10b981;">' +
                cabecalhoRamo('FERRAMENTAS', '🛠️ Ferramentas de Rotina (' + ferramentasVisiveis.length + ')', podeEditar ? '<button type="button" class="db-apply-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirFormRamoMapaIaUI(\'FERRAMENTA\')">+</button>' : '') +
                (ramoAberto('FERRAMENTAS') ? (
                    ferramentasVisiveis.length ? ferramentasVisiveis.map(function (fer) {
                        return '<div style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; margin-bottom:6px; font-size:11.5px;">' +
                            '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px;"><b>' + esc(fer.nome) + '</b>' + renderBadgeStatus(fer.status) + '</div>' +
                            '<div style="margin-top:3px;">Etapas: ' + renderBadgesVinculos(fer.etapa_ids, mapa.etapas, '', 'Sem etapa (pendente)') + '</div>' +
                            '<div style="margin-top:3px;">Funções: ' + renderBadgesVinculos(fer.funcao_ids, mapa.funcoes, '', 'Sem função (pendente)') + '</div>' +
                            '<div style="display:flex; gap:4px; margin-top:4px;">' + botoesStatusInline('FERRAMENTA', fer) + '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma ferramenta cadastrada.</div>'
                ) : '') +
            '</div>' +

            // Ramo 3 + 4: EPIs Obrigatórios e Eventuais conectados por destaque roxo
            '<div class="db-chart-card" style="border-left:4px solid #7c3aed;">' +
                cabecalhoRamo('EPIS', '🦺 Bloco de EPIs — Obrigatórios (' + episObrig.length + ') ↔ Eventuais (' + episEvent.length + ')', (podeEditar ? '<button type="button" class="db-apply-btn" style="font-size:10.5px; padding:2px 7px;" onclick="window.abrirFormRamoMapaIaUI(\'EPI\', \'\', \'OBRIGATORIO\')">+ Obrig.</button><button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 7px; border-color:#7c3aed; color:#6d28d9;" onclick="window.abrirFormRamoMapaIaUI(\'EPI\', \'\', \'EVENTUAL\')">+ Eventual</button>' : '')) +
                (ramoAberto('EPIS') ? (
                    '<div style="font-size:10.5px; color:#6d28d9; font-weight:700; margin-bottom:6px;">Recomendações do Mapa (nunca marcam checkboxes na APR automaticamente)</div>' +
                    '<div style="font-size:11.5px; font-weight:700; margin-bottom:4px;">EPIs Obrigatórios (' + episObrig.length + ')</div>' +
                    (episObrig.length ? episObrig.map(function (ep) {
                        return '<div style="padding:5px 7px; border:1px solid var(--border); border-radius:6px; margin-bottom:5px; font-size:11px;">' +
                            '<div style="display:flex; justify-content:space-between;"><b>' + esc(ep.nome) + '</b>' + renderBadgeStatus(ep.status) + '</div>' +
                            '<div style="margin-top:2px;">Funções: ' + renderBadgesVinculos(ep.funcao_ids, mapa.funcoes, '', 'Sem função (pendente)') + '</div>' +
                            '<div style="display:flex; gap:4px; margin-top:4px;">' + botoesStatusInline('EPI', ep) + '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:11px; color:var(--text-light); margin-bottom:8px;">Nenhum EPI obrigatório registrado.</div>') +
                    '<div style="border-top:2px dashed #c4b5fd; margin:8px 0; padding-top:8px; font-size:11.5px; font-weight:700; color:#6d28d9;">EPIs Eventuais / Condicionais (' + episEvent.length + ')</div>' +
                    (episEvent.length ? episEvent.map(function (ep) {
                        return '<div style="padding:5px 7px; border:1px solid #ddd6fe; background:#faf5ff; border-radius:6px; margin-bottom:5px; font-size:11px;">' +
                            '<div style="display:flex; justify-content:space-between; gap:4px; flex-wrap:wrap;"><b>' + esc(ep.nome) + '</b>' + renderBadgeStatus(ep.status_condicao, obterLabelCondicaoEpi) + '</div>' +
                            '<div style="font-size:10.5px; color:#5b21b6; margin-top:2px;"><b>Condição:</b> ' + esc(ep.condicao_uso || 'Não informada (pendente ≠ não aplicável)') + '</div>' +
                            '<div style="margin-top:2px;">Funções: ' + renderBadgesVinculos(ep.funcao_ids, mapa.funcoes, '', 'Sem função (pendente)') + '</div>' +
                            '<div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">' +
                                (podeEditar ? (
                                    '<select class="db-input" style="font-size:10.5px; padding:2px 4px;" onchange="window.alterarCondicaoEpiMapaIaUI(\'' + esc(ep.id) + '\', this.value)" title="Estado da condição de uso eventual">' +
                                        '<option value="PENDENTE"' + (ep.status_condicao === 'PENDENTE' ? ' selected' : '') + '>Condição pendente</option>' +
                                        '<option value="APLICAVEL"' + (ep.status_condicao === 'APLICAVEL' ? ' selected' : '') + '>Condição confirmada</option>' +
                                        '<option value="NAO_APLICAVEL"' + (ep.status_condicao === 'NAO_APLICAVEL' ? ' selected' : '') + '>Condição não aplicável</option>' +
                                    '</select>'
                                ) : '') +
                                botoesStatusInline('EPI', ep) +
                            '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:11px; color:var(--text-light);">Nenhum EPI eventual registrado.</div>')
                ) : '') +
            '</div>' +

            // Ramo 5: Etapas Previstas Ordenáveis
            '<div class="db-chart-card" style="border-left:4px solid #10b981;">' +
                cabecalhoRamo('ETAPAS', '🪜 Etapas Previstas (' + etapasVisiveis.length + ')', podeEditar ? '<button type="button" class="db-apply-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirFormRamoMapaIaUI(\'ETAPA\')">+</button>' : '') +
                (ramoAberto('ETAPAS') ? (
                    etapasVisiveis.length ? etapasVisiveis.map(function (et) {
                        var idxGlobal = mapa.etapas.findIndex(function (x) { return x.id === et.id; });
                        var focadaEt = fEtapa === et.id;
                        return '<div style="padding:6px 8px; border:1px solid ' + (focadaEt ? 'var(--primary)' : 'var(--border)') + '; border-radius:6px; margin-bottom:6px; font-size:11.5px; background:' + (focadaEt ? '#eff6ff' : 'transparent') + ';">' +
                            '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">' +
                                '<button type="button" style="border:none; background:transparent; padding:0; cursor:pointer; font-weight:700; text-align:left; color:var(--text);" onclick="window.filtrarMapaPorEtapaUI(\'' + esc(et.id) + '\')">' + (focadaEt ? '🔍 ' : '') + esc(et.ordem + '. ' + et.nome) + '</button>' +
                                renderBadgeStatus(et.status) +
                            '</div>' +
                            (et.fase_roteiro_opcional ? '<div style="font-size:10px; color:var(--text-light);">Fase: ' + esc(obterLabelFaseOpcional(et.fase_roteiro_opcional)) + '</div>' : '') +
                            '<div style="margin-top:3px;">Funções: ' + renderBadgesVinculos(et.funcao_ids, mapa.funcoes, '', 'Sem função (pendente)') + '</div>' +
                            '<div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">' +
                                (podeEditar && idxGlobal > 0 ? '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.reordenarEtapaMapaIaUI(\'' + esc(et.id) + '\', \'subir\')">↑</button>' : '') +
                                (podeEditar && idxGlobal >= 0 && idxGlobal < mapa.etapas.length - 1 ? '<button type="button" class="db-clear-btn" style="font-size:10.5px; padding:2px 6px;" onclick="window.reordenarEtapaMapaIaUI(\'' + esc(et.id) + '\', \'descer\')">↓</button>' : '') +
                                botoesStatusInline('ETAPA', et) +
                            '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma etapa cadastrada para esta seleção.</div>'
                ) : '') +
            '</div>' +

            // Ramo 6: Perigos / Fontes (clique foca os 3 quadros à esquerda)
            '<div class="db-chart-card" style="border-left:4px solid #0284c7;">' +
                cabecalhoRamo('PERIGOS', '⚠️ Perigos / Fontes (' + perigosVisiveis.length + ')', podeEditar ? '<button type="button" class="db-apply-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirFormRamoMapaIaUI(\'PERIGO\')">+</button>' : '') +
                (ramoAberto('PERIGOS') ? (
                    perigosVisiveis.length ? perigosVisiveis.map(function (per) {
                        var focadoPer = perigoFoco && perigoFoco.id === per.id;
                        return '<div style="padding:8px; border:1px solid ' + (focadoPer ? 'var(--primary)' : 'var(--border)') + '; border-radius:8px; margin-bottom:6px; background:' + (focadoPer ? '#eff6ff' : 'var(--bg)') + '; font-size:11.5px;">' +
                            '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">' +
                                '<button type="button" style="border:none; background:transparent; padding:0; text-align:left; font-size:12.5px; font-weight:800; color:var(--text); cursor:pointer;" onclick="window.focarPerigoMapaIaUI(\'' + esc(per.id) + '\')">' + (focadoPer ? '⬅️ Em foco: ' : '') + esc(per.perigo_fonte) + '</button>' +
                                '<div style="display:flex; gap:6px; align-items:center;">' + renderBadgeStatus(per.status) + botoesStatusInline('PERIGO', per) + '</div>' +
                            '</div>' +
                            '<div style="margin-top:4px; display:flex; gap:8px; flex-wrap:wrap;">' +
                                '<span><b>Etapas:</b> ' + renderBadgesVinculos(per.etapa_ids, mapa.etapas, '', 'Sem etapa (pendente)') + '</span>' +
                                '<span><b>Funções expostas:</b> ' + renderBadgesVinculos(per.funcao_ids, mapa.funcoes, '', 'Sem função (pendente)') + '</span>' +
                            '</div>' +
                        '</div>';
                    }).join('') : '<div style="font-size:12px; color:var(--text-light);">Nenhum perigo cadastrado para esta seleção.</div>'
                ) : '') +
            '</div>' +
        '</div>';

        return '<div id="mmCanvasMapaVisual" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:14px; align-items:start; margin-bottom:14px;">' +
            colunaEsquerda +
            colunaDireita +
        '</div>';
    }

    function renderVisaoTabelaHtml(mapa) {
        var fFn = estadoMapa.filtroTabelaFuncaoId || 'TODAS';
        var fSt = estadoMapa.filtroTabelaStatus || 'TODOS';

        var perigosFiltrados = mapa.perigos.filter(function (p) {
            if (fSt !== 'TODOS' && p.status !== fSt) return false;
            if (fFn === 'TODAS') return true;
            if (fFn === 'SEM_FUNCAO') return !p.funcao_ids || p.funcao_ids.length === 0;
            return Array.isArray(p.funcao_ids) && p.funcao_ids.indexOf(fFn) !== -1;
        });

        var episFiltrados = mapa.epis.filter(function (e) {
            if (fSt !== 'TODOS' && e.status !== fSt) return false;
            if (fFn === 'TODAS') return true;
            if (fFn === 'SEM_FUNCAO') return !e.funcao_ids || e.funcao_ids.length === 0;
            return Array.isArray(e.funcao_ids) && e.funcao_ids.indexOf(fFn) !== -1;
        });

        var rows = perigosFiltrados.length
            ? perigosFiltrados.map(function (p) {
                var med = p.medidas_nr01 || {};
                var nr01Txt = [
                    med.eliminacao_substituicao ? '1.Elim: ' + med.eliminacao_substituicao : '',
                    med.engenharia_epc ? '2.EPC: ' + med.engenharia_epc : '',
                    med.administrativo_organizacao ? '3.Adm: ' + med.administrativo_organizacao : '',
                    med.epi_complementar ? '4.EPI: ' + med.epi_complementar : ''
                ].filter(Boolean).join(' | ') || 'Não avaliado';
                return '<tr>' +
                    '<td>' + renderBadgesVinculos(p.etapa_ids, mapa.etapas, '', 'Sem etapa') + '</td>' +
                    '<td>' + renderBadgesVinculos(p.funcao_ids, mapa.funcoes, '', 'Sem função') + '</td>' +
                    '<td>' + renderBadgesVinculos(p.ferramenta_ids, mapa.ferramentas, '', '-') + '</td>' +
                    '<td><b>' + esc(p.perigo_fonte) + '</b></td>' +
                    '<td>' + esc(p.evento_risco || 'Não avaliado') + '<br><small>Danos: ' + esc(p.danos_provaveis || 'Não avaliado') + '</small></td>' +
                    '<td>' + esc(nr01Txt) + '</td>' +
                    '<td>' + renderBadgeStatus(p.status) + '</td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="7" style="text-align:center; padding:12px;">Nenhum perigo corresponde ao filtro selecionado.</td></tr>';

        return '<div class="db-chart-card" style="margin-bottom:14px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">' +
                '<b style="font-size:13.5px;">📊 Visão em Tabela Sincronizada (Exposição por Função e Etapa)</b>' +
                '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                    '<select id="mmTabelaFiltroFuncao" class="db-input" onchange="window.filtrarTabelaMapaFuncaoUI(this.value)">' +
                        '<option value="TODAS"' + (fFn === 'TODAS' ? ' selected' : '') + '>Todas as funções</option>' +
                        '<option value="SEM_FUNCAO"' + (fFn === 'SEM_FUNCAO' ? ' selected' : '') + '>Sem função vinculada</option>' +
                        mapa.funcoes.map(function (fn) {
                            return '<option value="' + esc(fn.id) + '"' + (fFn === fn.id ? ' selected' : '') + '>' + esc(fn.nome) + '</option>';
                        }).join('') +
                    '</select>' +
                    '<select id="mmTabelaFiltroStatus" class="db-input" onchange="window.filtrarTabelaMapaStatusUI(this.value)">' +
                        '<option value="TODOS"' + (fSt === 'TODOS' ? ' selected' : '') + '>Todos os status</option>' +
                        '<option value="NAO_AVALIADO"' + (fSt === 'NAO_AVALIADO' ? ' selected' : '') + '>Não avaliado</option>' +
                        '<option value="CONFIRMADO"' + (fSt === 'CONFIRMADO' ? ' selected' : '') + '>Confirmado</option>' +
                        '<option value="NAO_APLICAVEL"' + (fSt === 'NAO_APLICAVEL' ? ' selected' : '') + '>Não aplicável</option>' +
                    '</select>' +
                '</div>' +
            '</div>' +
            '<div style="overflow-x:auto;">' +
                '<table class="db-table" style="width:100%; font-size:11.5px;">' +
                    '<thead><tr><th>Etapas</th><th>Funções Expostas</th><th>Ferramentas</th><th>Perigo / Fonte</th><th>Evento &amp; Danos</th><th>Medidas NR-01</th><th>Status</th></tr></thead>' +
                    '<tbody>' + rows + '</tbody>' +
                '</table>' +
            '</div>' +
            '<div style="margin-top:10px; font-size:11.5px; color:var(--text-light);">' +
                '<b>EPIs no recorte atual (' + episFiltrados.length + '):</b> ' +
                esc(episFiltrados.map(function (e) { return '[' + e.categoria + '] ' + e.nome; }).join(' | ') || 'Nenhum EPI vinculado ao filtro') +
            '</div>' +
        '</div>';
    }

    function renderPainelRecomendacoesECriticaHtml(mapa, podeEditar) {
        var formRecHtml = '';
        if (estadoMapa.formRecAberto && podeEditar) {
            var ramoSel = estadoMapa.formRecRamoSel || 'PERIGO';
            var rasc = estadoMapa.formRecRascunho || {};
            var tipoSelRec = String(rasc.tipo || 'INCLUIR').toUpperCase();
            var epiCatSelRec = String(rasc.categoria_epi || 'OBRIGATORIO').toUpperCase();
            var itensAlvo = ramoSel !== 'GERAL' ? mapearListaParaColecao(ramoSel, mapa) : [];
            var camposPermitidosRamo = obterCamposAlvoPermitidos(ramoSel);
            var campoSelRec = camposPermitidosRamo.indexOf(rasc.campo_alvo) !== -1 ? rasc.campo_alvo : '';
            formRecHtml = '<div style="padding:10px; border:1px solid #0284c7; border-radius:8px; margin-bottom:10px; background:var(--bg);">' +
                '<div style="font-size:12px; font-weight:700; margin-bottom:6px;">📝 Registrar Recomendação / Pedido de Inclusão ou Retirada</div>' +
                '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:8px;">' +
                    '<select id="mmRec_tipo" class="db-input">' +
                        '<option value="INCLUIR"' + (tipoSelRec === 'INCLUIR' ? ' selected' : '') + '>INCLUIR</option>' +
                        '<option value="RETIRAR"' + (tipoSelRec === 'RETIRAR' ? ' selected' : '') + '>RETIRAR</option>' +
                        '<option value="AJUSTAR"' + (tipoSelRec === 'AJUSTAR' ? ' selected' : '') + '>AJUSTAR</option>' +
                        '<option value="PERGUNTA"' + (tipoSelRec === 'PERGUNTA' ? ' selected' : '') + '>PERGUNTA</option>' +
                    '</select>' +
                    '<select id="mmRec_ramo" class="db-input" onchange="window.atualizarRamoFormRecomendacaoMapaIaUI(this.value)">' +
                        '<option value="PERIGO"' + (ramoSel === 'PERIGO' ? ' selected' : '') + '>PERIGO</option>' +
                        '<option value="EPI"' + (ramoSel === 'EPI' ? ' selected' : '') + '>EPI</option>' +
                        '<option value="ETAPA"' + (ramoSel === 'ETAPA' ? ' selected' : '') + '>ETAPA</option>' +
                        '<option value="FERRAMENTA"' + (ramoSel === 'FERRAMENTA' ? ' selected' : '') + '>FERRAMENTA</option>' +
                        '<option value="FUNCAO"' + (ramoSel === 'FUNCAO' ? ' selected' : '') + '>FUNCAO</option>' +
                        '<option value="GERAL"' + (ramoSel === 'GERAL' ? ' selected' : '') + '>GERAL</option>' +
                    '</select>' +
                    '<select id="mmRec_alvoItemId" class="db-input"><option value="">-- Item existente alvo (para RETIRAR/AJUSTAR) --</option>' +
                        itensAlvo.map(function (it) {
                            return '<option value="' + esc(it.id) + '">' + esc(obterNomePrincipalItem(ramoSel, it)) + ' [' + esc(obterLabelStatusItem(it.status)) + ']</option>';
                        }).join('') +
                    '</select>' +
                    '<select id="mmRec_campoAlvo" class="db-input"><option value="">-- Campo alvo (obrigatório p/ AJUSTAR) --</option>' +
                        camposPermitidosRamo.map(function (c) {
                            return '<option value="' + esc(c) + '"' + (campoSelRec === c ? ' selected' : '') + '>' + esc(obterLabelCampoAlvo(c)) + '</option>';
                        }).join('') +
                    '</select>' +
                    '<input type="text" id="mmRec_solic" class="db-input" value="' + esc(rasc.solicitante_papel || '') + '" placeholder="Solicitante (ex.: Encarregado / Cliente)">' +
                '</div>' +
                (ramoSel === 'EPI' ? (
                    '<div style="display:grid; grid-template-columns:1fr 2fr; gap:8px; margin-top:6px;">' +
                        '<select id="mmRec_epiCat" class="db-input">' +
                            '<option value="OBRIGATORIO"' + (epiCatSelRec === 'OBRIGATORIO' ? ' selected' : '') + '>EPI Obrigatório</option>' +
                            '<option value="EVENTUAL"' + (epiCatSelRec === 'EVENTUAL' ? ' selected' : '') + '>EPI Eventual (Condicional)</option>' +
                        '</select>' +
                        '<input type="text" id="mmRec_epiCond" class="db-input" value="' + esc(rasc.condicao_uso || '') + '" placeholder="Condição de uso (se EPI eventual)">' +
                    '</div>'
                ) : '') +
                '<input type="text" id="mmRec_titulo" class="db-input" style="width:100%; margin-top:6px;" value="' + esc(rasc.titulo || '') + '" placeholder="Resumo / Título da recomendação *">' +
                '<input type="text" id="mmRec_desc" class="db-input" style="width:100%; margin-top:6px;" value="' + esc(rasc.descricao_proposta || '') + '" placeholder="Texto proposto para inclusão ou ajuste (opcional)">' +
                '<textarea id="mmRec_just" class="db-input" rows="2" style="width:100%; margin-top:6px;" placeholder="Justificativa e motivo informado pelo solicitante...">' + esc(rasc.justificativa || '') + '</textarea>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">' +
                    '<div><label style="font-size:11px; font-weight:700;">Funções citadas no pedido</label>' + renderCheckboxesVinculos('mmRecFuncaoCb', mapa.funcoes, rasc.funcao_ids || [], 'nome') + '</div>' +
                    '<div><label style="font-size:11px; font-weight:700;">Etapas citadas no pedido</label>' + renderCheckboxesVinculos('mmRecEtapaCb', mapa.etapas, rasc.etapa_ids || [], 'nome') + '</div>' +
                '</div>' +
                '<div style="display:flex; gap:8px; margin-top:8px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.salvarFormRecomendacaoMapaIaUI()">Salvar Solicitação</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.fecharFormRecomendacaoMapaIaUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        var pacoteCritica = gerarPacoteCriticaExternaMapa(mapa.id);
        var previaImp = estadoMapa.previaImportCritica;
        var previaImpHtml = '';
        if (previaImp && previaImp.mapaId === mapa.id) {
            previaImpHtml = '<div style="margin-top:8px; padding:10px; border:2px solid var(--primary); border-radius:8px; background:var(--bg);">' +
                '<div style="font-size:12px; font-weight:800;">🔍 Prévia da Crítica Externa (' + previaImp.itens.length + ' recomendação(ões))</div>' +
                (previaImp.notasDescartadas > 0 ? '<div style="font-size:11px; color:var(--warning, #d97706);">🛡️ ' + previaImp.notasDescartadas + ' campo(s) de nota P×S descartados automaticamente.</div>' : '') +
                (previaImp.totalComPendencias > 0 ? '<div style="font-size:11px; color:#b91c1c; font-weight:700;">⚠️ ' + previaImp.totalComPendencias + ' item(ns) com pendência de alvo, campo ou escopo (precisam de resolução antes de aceitar).</div>' : '') +
                '<ul style="font-size:11.5px; margin:6px 0;">' +
                    previaImp.itens.map(function (it) {
                        var detalheAlvo = '';
                        if (it.alvo_status === 'RESOLVIDO') {
                            detalheAlvo = '<div><b>Alvo:</b> ' + esc(it.alvo_nome_resolvido || it.alvo_item_id) + ' [' + esc(it.alvo_item_id) + ']</div>';
                        } else if (it.alvo_status && it.alvo_status !== 'NAO_REQUERIDO') {
                            detalheAlvo = '<div style="color:#b91c1c;"><b>Alvo (' + esc(it.alvo_status) + '):</b> ' + esc(it.alvo_item_id || 'não informado') + '</div>';
                        }
                        var detalheCampo = it.campo_alvo || (it.tipo === 'AJUSTAR' ? '(não informado)' : '');
                        var detalheCampoHtml = detalheCampo
                            ? '<div' + (it.campo_alvo_status !== 'VALIDO' && it.campo_alvo_status !== 'NAO_REQUERIDO' ? ' style="color:#b91c1c;"' : '') + '><b>Campo:</b> ' + esc(detalheCampo) + ' (' + esc(it.campo_alvo_status || '') + ')</div>'
                            : '';
                        var pendHtml = (it.pendencias_resolucao && it.pendencias_resolucao.length)
                            ? '<div style="color:#b91c1c;"><b>Pendências:</b> ' + esc(it.pendencias_resolucao.join(' | ')) + '</div>'
                            : '';
                        var nomesFnPrev = mapearIdsParaNomesLista(it.funcao_ids_sugeridas, mapa.funcoes);
                        var nomesEtPrev = mapearIdsParaNomesLista(it.etapa_ids_sugeridas, mapa.etapas);
                        var detalheEscopoPrev = '';
                        if (nomesFnPrev.length || nomesEtPrev.length) {
                            detalheEscopoPrev = '<div>' +
                                (nomesFnPrev.length ? '<b>Funções citadas:</b> ' + esc(nomesFnPrev.join(', ')) : '') +
                                (nomesFnPrev.length && nomesEtPrev.length ? ' • ' : '') +
                                (nomesEtPrev.length ? '<b>Etapas citadas:</b> ' + esc(nomesEtPrev.join(', ')) : '') +
                            '</div>';
                        }
                        return '<li style="margin-bottom:4px;"><b>[' + esc(it.tipo) + ' • ' + esc(it.alvo_ramo) + ']</b> ' + esc(it.titulo) +
                            (it.justificativa ? ' — ' + esc(it.justificativa) : '') +
                            detalheAlvo + detalheCampoHtml + detalheEscopoPrev + pendHtml +
                        '</li>';
                    }).join('') +
                '</ul>' +
                '<div style="display:flex; gap:8px;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarImportacaoCriticaMapaIaUI()">✅ Importar para Lista de Recomendações</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarImportacaoCriticaMapaIaUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }

        var decEd = estadoMapa.decisaoRecEmEdicao;
        var recsHtml = mapa.recomendacoes.length
            ? mapa.recomendacoes.map(function (rec) {
                var alvoRec = (rec.alvo_item_id && rec.alvo_ramo !== 'GERAL') ? localizarItemPorRamo(mapa, rec.alvo_ramo, rec.alvo_item_id) : null;
                var temAlvoInvalido = (rec.tipo === 'RETIRAR' || (rec.tipo === 'AJUSTAR' && rec.alvo_ramo !== 'GERAL')) &&
                    (!rec.alvo_item_id || !alvoRec || rec.alvo_status_origem === 'AMBIGUO');
                var temCampoInvalido = rec.tipo === 'AJUSTAR' &&
                    (rec.alvo_ramo === 'GERAL' ? (rec.campo_alvo && rec.campo_alvo !== 'observacoes_gerais') : (!rec.campo_alvo || obterCamposAlvoPermitidos(rec.alvo_ramo).indexOf(rec.campo_alvo) === -1));
                var temEscopoPend = (rec.funcoes_nao_resolvidas && rec.funcoes_nao_resolvidas.length > 0) ||
                    (rec.etapas_nao_resolvidas && rec.etapas_nao_resolvidas.length > 0);
                var impRecUi = (rec.status_decisao === 'PENDENTE' && alvoRec && (rec.tipo === 'RETIRAR' || rec.tipo === 'AJUSTAR'))
                    ? avaliarImpactoRecomendacaoEscopo(mapa, rec, alvoRec)
                    : null;
                var editorInlineHtml = '';
                if (podeEditar && rec.status_decisao === 'PENDENTE' && decEd && decEd.recId === rec.id) {
                    var precisaConfSobr = !!(alvoRec && (alvoRec.status === 'CONFIRMADO' || alvoRec.status === 'NAO_APLICAVEL'));
                    var precisaConfRetGlobal = rec.tipo === 'RETIRAR' && impRecUi && !impRecUi.bloqueadoEstrito &&
                        (impRecUi.exigeConfirmacaoGlobal || (impRecUi.modo && impRecUi.modo.indexOf('BLOQUEADO_') === 0));
                    var precisaConfAjComp = rec.tipo === 'AJUSTAR' && impRecUi && impRecUi.exigeConfirmacaoAjusteCompartilhado;
                    var itensAlvoEd = (decEd.acao !== 'REJEITAR' && rec.alvo_ramo !== 'GERAL' && temAlvoInvalido)
                        ? mapearListaParaColecao(rec.alvo_ramo, mapa) : [];
                    var camposEd = (decEd.acao !== 'REJEITAR' && rec.tipo === 'AJUSTAR' && temCampoInvalido)
                        ? obterCamposAlvoPermitidos(rec.alvo_ramo) : [];

                    editorInlineHtml = '<div style="margin-top:8px; padding:8px; border:1px solid var(--primary); border-radius:6px; background:#f8fafc;">' +
                        '<div style="font-size:11px; font-weight:700; margin-bottom:4px;">Confirmar decisão: ' + esc(decEd.acao) + '</div>' +
                        (decEd.acao === 'EDITAR_E_ACEITAR' ? (
                            '<input type="text" id="mmDecRec_texto" class="db-input" style="width:100%; margin-bottom:4px;" value="' + esc(decEd.texto || rec.descricao_proposta || rec.titulo) + '" placeholder="Texto ajustado antes de aplicar">'
                        ) : '') +
                        (itensAlvoEd.length ? (
                            '<div style="margin-bottom:4px;"><label style="font-size:11px; color:#991b1b; font-weight:700;">Resolver item alvo (' + esc(rec.alvo_ramo) + '):</label>' +
                            '<select id="mmDecRec_alvoItemId" class="db-input" style="width:100%;"><option value="">-- Selecione o item alvo --</option>' +
                                itensAlvoEd.map(function (it) {
                                    return '<option value="' + esc(it.id) + '">' + esc(obterNomePrincipalItem(rec.alvo_ramo, it)) + ' [' + esc(it.id) + ']</option>';
                                }).join('') +
                            '</select></div>'
                        ) : '') +
                        (camposEd.length ? (
                            '<div style="margin-bottom:4px;"><label style="font-size:11px; color:#991b1b; font-weight:700;">Resolver campo alvo:</label>' +
                            '<select id="mmDecRec_campoAlvo" class="db-input" style="width:100%;"><option value="">-- Selecione o campo --</option>' +
                                camposEd.map(function (c) {
                                    return '<option value="' + esc(c) + '">' + esc(obterLabelCampoAlvo(c)) + '</option>';
                                }).join('') +
                            '</select></div>'
                        ) : '') +
                        (decEd.acao !== 'REJEITAR' && temEscopoPend ? (
                            '<div style="margin-bottom:6px; padding:6px; border:1px dashed #b45309; border-radius:6px; background:#fffbeb;">' +
                                '<div style="font-size:11px; color:#92400e; font-weight:700;">Escopo não resolvido no catálogo — selecione as funções/etapas corretas:</div>' +
                                renderCheckboxesVinculos('mmDecRecFuncaoCb', mapa.funcoes, rec.funcao_ids_sugeridas || [], 'nome') +
                                renderCheckboxesVinculos('mmDecRecEtapaCb', mapa.etapas, rec.etapa_ids_sugeridas || [], 'nome') +
                                '<label style="display:block; font-size:11px; margin-top:4px;"><input type="checkbox" id="mmDecRec_resolverEscopo"> Confirmar resolução manual do escopo acima</label>' +
                            '</div>'
                        ) : '') +
                        '<input type="text" id="mmDecRec_nota" class="db-input" style="width:100%; margin-bottom:4px;" value="' + esc(decEd.nota || '') + '" placeholder="Nota / justificativa técnica da decisão (opcional)">' +
                        (precisaConfSobr ? '<label style="display:block; font-size:11px; margin-bottom:4px;"><input type="checkbox" id="mmDecRec_confirmarSobrescrita"> Confirmar sobrescrita de item já marcado como ' + esc(obterLabelStatusItem(alvoRec.status)) + '</label>' : '') +
                        (precisaConfRetGlobal ? '<label style="display:block; font-size:11px; margin-bottom:4px; color:#991b1b;"><input type="checkbox" id="mmDecRec_confirmarRetiradaGlobal"> Confirmar retirada global (funções: ' + esc(impRecUi.funcoesAtingidasNomes.join(', ')) + '; etapas: ' + esc(impRecUi.etapasAtingidasNomes.join(', ')) + ')</label>' : '') +
                        (precisaConfAjComp ? '<label style="display:block; font-size:11px; margin-bottom:4px; color:#b45309;"><input type="checkbox" id="mmDecRec_confirmarAjusteCompartilhado"> Confirmar ajuste em item compartilhado (funções: ' + esc(impRecUi.funcoesAtingidasNomes.join(', ')) + '; etapas: ' + esc(impRecUi.etapasAtingidasNomes.join(', ')) + ')</label>' : '') +
                        '<div style="display:flex; gap:6px;">' +
                            '<button type="button" class="db-apply-btn" style="font-size:11px;" onclick="window.confirmarEditorDecisaoRecMapaIaUI()">Confirmar</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px;" onclick="window.cancelarEditorDecisaoRecMapaIaUI()">Cancelar</button>' +
                        '</div>' +
                    '</div>';
                }
                var rastroAntesDepoisHtml = '';
                if (rec.status_decisao !== 'PENDENTE' && (rec.valor_anterior !== null || rec.valor_aplicado !== null)) {
                    rastroAntesDepoisHtml = '<div style="color:var(--text-light); margin-top:2px;"><b>Rastro:</b> Antes: "' + esc(rec.valor_anterior || '(vazio)') + '" → Depois: "' + esc(rec.valor_aplicado || '') + '"</div>';
                }
                var ehBloqImp = !!(impRecUi && (impRecUi.bloqueadoEstrito || (impRecUi.modo && impRecUi.modo.indexOf('BLOQUEADO_') !== -1) || impRecUi.exigeConfirmacaoAjusteCompartilhado || impRecUi.exigeConfirmacaoGlobal));
                return '<div style="padding:8px 10px; border:1px solid var(--border); border-radius:8px; margin-bottom:6px; background:var(--bg); font-size:11.5px;">' +
                    '<div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">' +
                        '<div><b>[' + esc(rec.tipo) + ' • ' + esc(rec.alvo_ramo) + ' • ' + esc(rec.origem) + ']</b> ' + esc(rec.titulo) + '</div>' +
                        renderBadgeStatus(rec.status_decisao, function (s) { return s; }) +
                    '</div>' +
                    (alvoRec ? '<div style="color:var(--text-light); margin-top:2px;"><b>Alvo:</b> ' + esc(obterNomePrincipalItem(rec.alvo_ramo, alvoRec)) + ' [' + esc(alvoRec.id) + ']</div>' : '') +
                    (!alvoRec && temAlvoInvalido ? '<div style="color:#b91c1c; margin-top:2px;"><b>⚠️ Alvo pendente/inexistente:</b> ' + esc(rec.alvo_item_id || 'não especificado') + '</div>' : '') +
                    (rec.campo_alvo ? '<div style="color:var(--text-light); margin-top:2px;"><b>Campo:</b> ' + esc(obterLabelCampoAlvo(rec.campo_alvo)) + ' (<code>' + esc(rec.campo_alvo) + '</code>)</div>' : '') +
                    (temCampoInvalido ? '<div style="color:#b91c1c; margin-top:2px;"><b>⚠️ Campo inválido/ausente para AJUSTAR</b></div>' : '') +
                    (rec.funcao_ids_sugeridas && rec.funcao_ids_sugeridas.length ? '<div style="margin-top:2px;"><b>Funções citadas:</b> ' + renderBadgesVinculos(rec.funcao_ids_sugeridas, mapa.funcoes, '', '') + '</div>' : '') +
                    (rec.etapa_ids_sugeridas && rec.etapa_ids_sugeridas.length ? '<div style="margin-top:2px;"><b>Etapas citadas:</b> ' + renderBadgesVinculos(rec.etapa_ids_sugeridas, mapa.etapas, '', '') + '</div>' : '') +
                    (rec.funcoes_nao_resolvidas && rec.funcoes_nao_resolvidas.length ? '<div style="color:#b91c1c; margin-top:2px;"><b>⚠️ Funções não resolvidas:</b> ' + esc(rec.funcoes_nao_resolvidas.join(', ')) + '</div>' : '') +
                    (rec.etapas_nao_resolvidas && rec.etapas_nao_resolvidas.length ? '<div style="color:#b91c1c; margin-top:2px;"><b>⚠️ Etapas não resolvidas:</b> ' + esc(rec.etapas_nao_resolvidas.join(', ')) + '</div>' : '') +
                    (impRecUi && impRecUi.resumoUi ? '<div style="margin-top:3px; padding:4px 6px; border-radius:4px; background:' + (ehBloqImp ? '#fef2f2' : '#f0fdf4') + '; color:' + (ehBloqImp ? '#991b1b' : '#166534') + ';"><b>Impacto efetivo ao aceitar:</b> ' + esc(impRecUi.resumoUi) + '</div>' : '') +
                    (rec.justificativa ? '<div style="color:var(--text-light); margin-top:2px;"><b>Justificativa:</b> ' + esc(rec.justificativa) + '</div>' : '') +
                    (rec.perguntas_abertas && rec.perguntas_abertas.length ? '<div style="color:#b45309; margin-top:2px;"><b>Perguntas:</b> ' + esc(rec.perguntas_abertas.join(' | ')) + '</div>' : '') +
                    (rec.decisao_nota ? '<div style="color:var(--text-light); margin-top:2px;"><b>Decisão:</b> ' + esc(rec.decisao_nota) + '</div>' : '') +
                    rastroAntesDepoisHtml +
                    (podeEditar && rec.status_decisao === 'PENDENTE' ? (
                        '<div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">' +
                            '<button type="button" class="db-apply-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirEditorDecisaoRecMapaIaUI(\'' + esc(rec.id) + '\', \'ACEITAR\')">✅ Aceitar</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px; padding:3px 8px;" onclick="window.abrirEditorDecisaoRecMapaIaUI(\'' + esc(rec.id) + '\', \'EDITAR_E_ACEITAR\')">✏️ Editar e Aceitar</button>' +
                            '<button type="button" class="db-clear-btn" style="font-size:11px; padding:3px 8px; color:var(--danger);" onclick="window.abrirEditorDecisaoRecMapaIaUI(\'' + esc(rec.id) + '\', \'REJEITAR\')">❌ Rejeitar</button>' +
                        '</div>' + editorInlineHtml
                    ) : '') +
                '</div>';
            }).join('')
            : '<div style="font-size:11.5px; color:var(--text-light);">Nenhuma recomendação ou pergunta aberta registrada ainda.</div>';

        return '<div class="db-chart-card" style="margin-bottom:14px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">' +
                '<b style="font-size:13.5px;">⚖️ Avaliação Crítica de Recomendações (Incluir / Retirar / Ajustar) (' + mapa.recomendacoes.length + ')</b>' +
                (podeEditar ? (
                    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                        '<button type="button" class="db-clear-btn" onclick="window.abrirFormRecomendacaoMapaIaUI()">➕ Nova Solicitação (Incluir/Retirar)</button>' +
                        '<button type="button" class="db-apply-btn" onclick="window.executarRevisaoLocalMapaIaUI()">🔎 Verificação Local (Regras/Palavras-Chave)</button>' +
                    '</div>'
                ) : '') +
            '</div>' +
            '<div style="font-size:11px; color:var(--text-light); margin-bottom:8px;">Verificação local usa apenas regras determinísticas e palavras-chave (não é LLM integrado). Para análise semântica completa, use o pedido estruturado para IA externa abaixo. Aceitar uma recomendação no mapa não cria regra aprovada em <code>ia_aprendizado</code> nem altera a APR oficial.</div>' +
            formRecHtml +
            recsHtml +
            '<div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--border);">' +
                '<div style="font-size:12px; font-weight:700; margin-bottom:4px;">🤖 Crítica via IA Externa (Pedido Estruturado — sem LLM integrado)</div>' +
                '<textarea id="mmTextareaPacoteCritica" class="db-input" rows="4" style="width:100%; font-family:monospace; font-size:11px;" readonly>' + esc(pacoteCritica) + '</textarea>' +
                '<div style="display:flex; gap:8px; align-items:center; margin-top:6px; flex-wrap:wrap;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.copiarPacoteCriticaMapaIaUI()">📋 Copiar Pedido para IA Externa</button>' +
                    '<span id="mmStatusCopiaCritica" style="font-size:11px; color:var(--text-light);"></span>' +
                '</div>' +
                (podeEditar ? (
                    '<div style="margin-top:8px;">' +
                        '<textarea id="mmTextareaImportarCritica" class="db-input" rows="3" style="width:100%; font-size:11px;" oninput="window.atualizarRascunhoImportCriticaMapaIaUI(this.value)" placeholder="Cole aqui a lista JSON retornada pela IA externa para pré-visualizar...">' + esc(estadoMapa.textoImportCriticaDraft || '') + '</textarea>' +
                        '<div style="margin-top:6px;"><button type="button" class="db-clear-btn" onclick="window.preVisualizarImportacaoCriticaMapaIaUI()">👁️ Pré-visualizar Crítica Externa</button></div>' +
                        previaImpHtml +
                    '</div>'
                ) : '') +
            '</div>' +
        '</div>';
    }

    function renderBoxBackupMapaHtml(podeEditar) {
        if (!podeEditar || !estadoMapa.boxBackupAberto) return '';
        var ultTexto = estadoMapa.ultimoBackupEm
            ? new Date(estadoMapa.ultimoBackupEm).toLocaleString('pt-BR')
            : 'Nenhum backup exportado neste dispositivo';
        var pb = estadoMapa.previaBackup;
        var previaHtml = '';
        if (pb && pb.resumo) {
            previaHtml = '<div style="margin-top:8px; padding:10px; border:2px solid var(--primary); border-radius:8px; background:var(--bg);">' +
                '<div style="font-size:12px; font-weight:800;">🔍 Prévia do Backup (' + esc(pb.formato) + '): ' + pb.resumo.totalNoArquivo + ' mapa(s) — ' + pb.resumo.novos + ' novo(s), ' + pb.resumo.conflitos + ' conflito(s)</div>' +
                (pb.resumo.conflitos > 0 ? (
                    '<div style="margin-top:6px;"><label style="font-size:11px; font-weight:700;">Política para conflitos no modo Mesclar:</label>' +
                    '<select id="mmBackupPoliticaConflito" class="db-input" style="margin-left:6px;">' +
                        '<option value="">-- Escolha --</option>' +
                        '<option value="manter_existente">Manter existente</option>' +
                        '<option value="restaurar_copia">Restaurar como cópia</option>' +
                        '<option value="substituir_versao">Substituir versão</option>' +
                    '</select></div>'
                ) : '') +
                '<div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">' +
                    '<button type="button" class="db-apply-btn" onclick="window.confirmarRestauracaoBackupMapasIaUI(\'mesclar\')">➕ Mesclar aos Mapas Atuais</button>' +
                    '<button type="button" class="db-clear-btn" style="color:var(--danger);" onclick="window.confirmarRestauracaoBackupMapasIaUI(\'substituir\')">♻️ Baixar Cópia de Segurança e Substituir</button>' +
                    '<button type="button" class="db-clear-btn" onclick="window.cancelarPreviaBackupMapasIaUI()">Cancelar</button>' +
                '</div>' +
            '</div>';
        }
        return '<div class="db-chart-card" style="margin-bottom:14px; border:1px solid var(--border);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                '<div><b>📦 Backup Próprio do Mapa Mental (<code>' + FORMATO_BACKUP_MAPA + '</code>)</b>' +
                '<div style="font-size:11px; color:var(--text-light);">Último backup: ' + esc(ultTexto) + (estadoMapa.alteracoesAposBackup ? ' • ⚠️ Há alterações não exportadas' : '') + '</div></div>' +
                '<button type="button" class="db-apply-btn" onclick="window.exportarBackupMapasIaUI()">⬇️ Exportar Backup (.json)</button>' +
            '</div>' +
            '<div style="margin-top:8px;">' +
                '<input type="file" accept=".json,application/json" onchange="window.lerArquivoBackupMapaIaUI(this)" style="font-size:11px; margin-bottom:6px;">' +
                '<textarea id="mmTextareaBackupJson" class="db-input" rows="3" style="width:100%; font-size:11px;" oninput="window.atualizarRascunhoBackupMapaIaUI(this.value)" placeholder="Ou cole aqui o JSON de backup ia_mapa_mental_backup_v1...">' + esc(estadoMapa.textoBackupDraft || '') + '</textarea>' +
                '<div style="margin-top:6px;"><button type="button" class="db-clear-btn" onclick="window.preVisualizarBackupMapasIaUI()">👁️ Analisar Backup</button></div>' +
                previaHtml +
            '</div>' +
        '</div>';
    }

    function renderizarAbaMapaMentalIa(papel) {
        garantirEstadoSessaoMapa();
        papel = papel || obterPapelMapa();
        var podeEditar = papel === 'editor' || papel === 'validador';
        var mapaAtual = buscarMapaPorId(estadoMapa.mapaSelecionadoId) || estadoMapa.mapas[0] || null;
        var consumo = calcularConsumoBytesMapa();

        var barraTopo = '<div class="db-chart-card" style="margin-bottom:14px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
                '<div>' +
                    '<h3 style="margin:0 0 2px 0; font-size:15px;">🗺️ Mapa Mental SST (Ferramenta Adicional de Apoio Técnico)</h3>' +
                    '<div style="font-size:11.5px; color:var(--text-light);">' +
                        'Acréscimo local (' + esc(consumo.kb + ' KB / ' + consumo.limiteKb + ' KB UTF-8') + ' • ' + estadoMapa.mapas.length + '/' + LIMITE_MAX_MAPAS + ' mapas) — preserva cenários e APR atuais intactos.' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">' +
                    (estadoMapa.mapas.length ? (
                        '<select class="db-input" onchange="window.selecionarMapaMentalIaUI(this.value)">' +
                            estadoMapa.mapas.map(function (m) {
                                return '<option value="' + esc(m.id) + '"' + (mapaAtual && m.id === mapaAtual.id ? ' selected' : '') + '>' + esc(m.codigo_mapa + ' — ' + m.atividade) + '</option>';
                            }).join('') +
                        '</select>'
                    ) : '') +
                    (podeEditar ? '<button type="button" class="db-apply-btn" onclick="window.abrirFormMapaMentalIaUI()">➕ Novo Mapa</button>' : '') +
                    '<button type="button" class="' + (estadoMapa.modoVisao === 'mapa' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.alternarModoVisaoMapaIaUI(\'mapa\')">🗺️ Mapa</button>' +
                    '<button type="button" class="' + (estadoMapa.modoVisao === 'tabela' ? 'db-apply-btn' : 'db-clear-btn') + '" onclick="window.alternarModoVisaoMapaIaUI(\'tabela\')">📊 Tabela</button>' +
                    (podeEditar ? '<button type="button" class="db-clear-btn" onclick="window.alternarBoxBackupMapaIaUI()">📦 Backup</button>' : '') +
                    (mapaAtual ? '<button type="button" class="db-clear-btn" onclick="window.imprimirMapaMentalIaUI()">🖨️ Imprimir</button>' : '') +
                    '<button type="button" class="db-clear-btn" onclick="if(typeof window.abrirApresentacoesDoMapaMentalUI===\'function\'){window.abrirApresentacoesDoMapaMentalUI(\'' + esc(mapaAtual ? mapaAtual.id : '') + '\');}else if(typeof window.showDbPage===\'function\'){window.showDbPage(\'apresentacoes_sst\');}" style="font-weight:700;">📽️ Apresentações</button>' +
                '</div>' +
            '</div>' +
        '</div>';

        var corpo = barraTopo + renderBoxBackupMapaHtml(podeEditar) + renderFormularioMapaHtml(mapaAtual);

        if (!mapaAtual) {
            corpo += '<div class="db-chart-card" style="text-align:center; padding:24px; color:var(--text-light);">' +
                'Nenhum Mapa Mental cadastrado neste dispositivo. Clique em <b>➕ Novo Mapa</b> para estruturar uma atividade, vincular funções/etapas/ferramentas/perigos e avaliar recomendações de incluir ou retirar itens.' +
            '</div>';
            return corpo;
        }

        corpo += renderFormularioRamoHtml(mapaAtual);
        corpo += estadoMapa.modoVisao === 'tabela'
            ? renderVisaoTabelaHtml(mapaAtual)
            : renderVisaoMapaHtml(mapaAtual, podeEditar);
        corpo += renderPainelRecomendacoesECriticaHtml(mapaAtual, podeEditar);
        return corpo;
    }

    // =========================================================================
    // 10. HANDLERS DE INTERFACE (UI)
    // =========================================================================
    function atualizarPainelIa() {
        if (typeof window.renderIaAprendizadoPanel === 'function') {
            window.renderIaAprendizadoPanel();
        }
    }

    function baixarJsonMapaLocal(nomeArquivo, conteudoJson) {
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

    function lerCheckboxesMarcados(classe) {
        if (typeof document.querySelectorAll !== 'function') return [];
        return Array.from(document.querySelectorAll('.' + classe + ':checked')).map(function (cb) { return cb.value; });
    }

    function valorEl(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '') : '';
    }

    function alternarModoVisaoMapaIaUI(modo) {
        garantirEstadoSessaoMapa();
        estadoMapa.modoVisao = modo === 'tabela' ? 'tabela' : 'mapa';
        atualizarPainelIa();
    }

    function selecionarMapaMentalIa(mapaId) {
        garantirEstadoSessaoMapa();
        if (buscarMapaPorId(mapaId)) {
            estadoMapa.mapaSelecionadoId = mapaId;
            estadoMapa.etapaFocoId = '';
            estadoMapa.funcaoFocoId = '';
            estadoMapa.perigoFocoId = '';
            estadoMapa.decisaoRecEmEdicao = null;
        }
        return estadoMapa.mapaSelecionadoId;
    }

    function selecionarMapaMentalIaUI(mapaId) {
        selecionarMapaMentalIa(mapaId);
        atualizarPainelIa();
    }

    function filtrarMapaPorEtapaUI(etapaId) {
        garantirEstadoSessaoMapa();
        estadoMapa.etapaFocoId = estadoMapa.etapaFocoId === etapaId ? '' : String(etapaId || '');
        atualizarPainelIa();
    }

    function filtrarMapaPorFuncaoUI(funcaoId) {
        garantirEstadoSessaoMapa();
        estadoMapa.funcaoFocoId = estadoMapa.funcaoFocoId === funcaoId ? '' : String(funcaoId || '');
        atualizarPainelIa();
    }

    function focarPerigoMapaIaUI(perigoId) {
        garantirEstadoSessaoMapa();
        estadoMapa.perigoFocoId = String(perigoId || '');
        atualizarPainelIa();
    }

    function alternarRamoMapaIaUI(chaveRamo) {
        garantirEstadoSessaoMapa();
        if (!estadoMapa.ramosRecolhidos) estadoMapa.ramosRecolhidos = {};
        var k = String(chaveRamo || '');
        if (!k) return;
        estadoMapa.ramosRecolhidos[k] = !estadoMapa.ramosRecolhidos[k];
        atualizarPainelIa();
    }

    function filtrarTabelaMapaFuncaoUI(funcaoId) {
        garantirEstadoSessaoMapa();
        estadoMapa.filtroTabelaFuncaoId = String(funcaoId || 'TODAS');
        atualizarPainelIa();
    }

    function filtrarTabelaMapaStatusUI(status) {
        garantirEstadoSessaoMapa();
        estadoMapa.filtroTabelaStatus = String(status || 'TODOS');
        atualizarPainelIa();
    }

    function abrirFormMapaMentalIaUI(editarId) {
        garantirEstadoSessaoMapa();
        estadoMapa.formMapaAberto = editarId ? { modo: 'editar', mapaId: editarId } : { modo: 'novo' };
        atualizarPainelIa();
    }

    function fecharFormMapaMentalIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.formMapaAberto = null;
        atualizarPainelIa();
    }

    function salvarFormMapaMentalIaUI() {
        try {
            garantirEstadoSessaoMapa();
            var editId = estadoMapa.formMapaAberto && estadoMapa.formMapaAberto.modo === 'editar'
                ? estadoMapa.formMapaAberto.mapaId
                : '';
            var mapaEdit = editId ? buscarMapaPorId(editId) : null;
            var payload = {
                id: editId || undefined,
                versaoEsperada: mapaEdit ? mapaEdit.versao : undefined,
                atividade: valorEl('mmForm_atividade'),
                frente_local: valorEl('mmForm_frente'),
                apr_referencia_texto: valorEl('mmForm_aprRef'),
                observacoes_gerais: valorEl('mmForm_obs')
            };
            if (!editId) {
                payload.funcoes_texto = valorEl('mmForm_funcoesTxt');
                payload.ferramentas_texto = valorEl('mmForm_ferramentasTxt');
                payload.etapas_texto = valorEl('mmForm_etapasTxt');
                payload.epis_obrigatorios_texto = valorEl('mmForm_episObrigTxt');
                payload.epis_eventuais_texto = valorEl('mmForm_episEventTxt');
                payload.perigos_texto = valorEl('mmForm_perigosTxt');
            }
            criarOuAtualizarMapaMental(payload);
            estadoMapa.formMapaAberto = null;
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function excluirMapaMentalIaUI(mapaId) {
        try {
            garantirEstadoSessaoMapa();
            if (typeof confirm === 'function' && !confirm('Deseja excluir este Mapa Mental local? Esta ação não afeta APRs nem cenários legados.')) {
                return;
            }
            excluirMapaMental(mapaId);
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirFormRamoMapaIaUI(ramo, itemId, categoriaPadrao) {
        garantirEstadoSessaoMapa();
        estadoMapa.formRamoAberto = {
            ramo: ramo,
            itemId: itemId || '',
            categoriaPadrao: categoriaPadrao || ''
        };
        atualizarPainelIa();
    }

    function fecharFormRamoMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.formRamoAberto = null;
        atualizarPainelIa();
    }

    function salvarFormRamoMapaIaUI() {
        try {
            garantirEstadoSessaoMapa();
            var f = estadoMapa.formRamoAberto;
            var mapa = buscarMapaPorId(estadoMapa.mapaSelecionadoId);
            if (!f || !mapa) return;
            var id = f.itemId || undefined;
            if (f.ramo === 'FUNCAO') {
                salvarFuncaoMapa(mapa.id, { id: id, nome: valorEl('mmRamo_nome'), nota_exposicao: valorEl('mmRamo_nota') });
            } else if (f.ramo === 'FERRAMENTA') {
                salvarFerramentaMapa(mapa.id, { id: id, nome: valorEl('mmRamo_nome'), etapa_ids: lerCheckboxesMarcados('mmRamoEtapaCb'), funcao_ids: lerCheckboxesMarcados('mmRamoFuncaoCb') });
            } else if (f.ramo === 'ETAPA') {
                salvarEtapaMapa(mapa.id, { id: id, nome: valorEl('mmRamo_nome'), fase_roteiro_opcional: valorEl('mmRamo_faseOp'), funcao_ids: lerCheckboxesMarcados('mmRamoFuncaoCb'), ferramenta_ids: lerCheckboxesMarcados('mmRamoFerramentaCb') });
            } else if (f.ramo === 'EPI') {
                salvarEpiMapa(mapa.id, { id: id, nome: valorEl('mmRamo_nome'), categoria: valorEl('mmRamo_epiCat'), condicao_uso: valorEl('mmRamo_epiCond'), status_condicao: valorEl('mmRamo_epiCondStatus'), funcao_ids: lerCheckboxesMarcados('mmRamoFuncaoCb'), etapa_ids: lerCheckboxesMarcados('mmRamoEtapaCb') });
            } else if (f.ramo === 'PERIGO') {
                salvarPerigoMapa(mapa.id, {
                    id: id,
                    perigo_fonte: valorEl('mmRamo_perigoFonte'),
                    etapa_ids: lerCheckboxesMarcados('mmRamoEtapaCb'),
                    funcao_ids: lerCheckboxesMarcados('mmRamoFuncaoCb'),
                    ferramenta_ids: lerCheckboxesMarcados('mmRamoFerramentaCb'),
                    evento_risco: valorEl('mmRamo_evento'),
                    danos_provaveis: valorEl('mmRamo_danos'),
                    medidas_nr01: {
                        eliminacao_substituicao: valorEl('mmRamo_nr01_elim'),
                        engenharia_epc: valorEl('mmRamo_nr01_epc'),
                        administrativo_organizacao: valorEl('mmRamo_nr01_adm'),
                        epi_complementar: valorEl('mmRamo_nr01_epi')
                    }
                });
            }
            estadoMapa.formRamoAberto = null;
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function reordenarEtapaMapaIaUI(etapaId, direcao) {
        try {
            reordenarEtapaMapa(estadoMapa.mapaSelecionadoId, etapaId, direcao);
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function alterarStatusItemMapaIaUI(ramo, itemId, novoStatus) {
        try {
            alterarStatusItemMapa(estadoMapa.mapaSelecionadoId, ramo, itemId, novoStatus);
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function alterarCondicaoEpiMapaIaUI(epiId, novoStatusCondicao) {
        try {
            alterarStatusItemMapa(estadoMapa.mapaSelecionadoId, 'EPI', epiId, undefined, { statusCondicao: novoStatusCondicao });
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function removerItemMapaIaUI(ramo, itemId) {
        try {
            removerItemMapa(estadoMapa.mapaSelecionadoId, ramo, itemId);
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirFormRecomendacaoMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.formRecAberto = true;
        estadoMapa.formRecRascunho = null;
        if (!estadoMapa.formRecRamoSel) estadoMapa.formRecRamoSel = 'PERIGO';
        atualizarPainelIa();
    }

    function atualizarRamoFormRecomendacaoMapaIaUI(ramo) {
        garantirEstadoSessaoMapa();
        var rascAnt = estadoMapa.formRecRascunho || {};
        var ramoNovo = RAMOS_ALVO_VALIDOS.has(String(ramo || '').toUpperCase())
            ? String(ramo).toUpperCase()
            : 'PERIGO';
        var campoAtual = valorEl('mmRec_campoAlvo') || rascAnt.campo_alvo || '';
        var camposPermitidosNovo = obterCamposAlvoPermitidos(ramoNovo);
        estadoMapa.formRecRascunho = {
            tipo: valorEl('mmRec_tipo') || rascAnt.tipo || 'INCLUIR',
            campo_alvo: camposPermitidosNovo.indexOf(campoAtual) !== -1 ? campoAtual : '',
            solicitante_papel: valorEl('mmRec_solic') || rascAnt.solicitante_papel || '',
            titulo: valorEl('mmRec_titulo') || rascAnt.titulo || '',
            descricao_proposta: valorEl('mmRec_desc') || rascAnt.descricao_proposta || '',
            justificativa: valorEl('mmRec_just') || rascAnt.justificativa || '',
            categoria_epi: valorEl('mmRec_epiCat') || rascAnt.categoria_epi || 'OBRIGATORIO',
            condicao_uso: valorEl('mmRec_epiCond') || rascAnt.condicao_uso || '',
            funcao_ids: lerCheckboxesMarcados('mmRecFuncaoCb'),
            etapa_ids: lerCheckboxesMarcados('mmRecEtapaCb')
        };
        estadoMapa.formRecRamoSel = ramoNovo;
        atualizarPainelIa();
    }

    function fecharFormRecomendacaoMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.formRecAberto = false;
        estadoMapa.formRecRascunho = null;
        atualizarPainelIa();
    }

    function salvarFormRecomendacaoMapaIaUI() {
        try {
            registrarRecomendacaoMapa(estadoMapa.mapaSelecionadoId, {
                tipo: valorEl('mmRec_tipo'),
                alvo_ramo: valorEl('mmRec_ramo'),
                alvo_item_id: valorEl('mmRec_alvoItemId'),
                campo_alvo: valorEl('mmRec_campoAlvo'),
                solicitante_papel: valorEl('mmRec_solic'),
                titulo: valorEl('mmRec_titulo'),
                descricao_proposta: valorEl('mmRec_desc'),
                justificativa: valorEl('mmRec_just'),
                categoria_epi: valorEl('mmRec_epiCat'),
                condicao_uso: valorEl('mmRec_epiCond'),
                funcao_ids_sugeridas: lerCheckboxesMarcados('mmRecFuncaoCb'),
                etapa_ids_sugeridas: lerCheckboxesMarcados('mmRecEtapaCb'),
                origem: 'SOLICITACAO_TERCEIRO'
            });
            estadoMapa.formRecAberto = false;
            estadoMapa.formRecRascunho = null;
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function executarRevisaoLocalMapaIaUI() {
        try {
            executarRevisaoLocalMapa(estadoMapa.mapaSelecionadoId);
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function abrirEditorDecisaoRecMapaIaUI(recId, acao) {
        garantirEstadoSessaoMapa();
        var acaoNorm = String(acao || '').trim().toUpperCase();
        var mapaAtual = buscarMapaPorId(estadoMapa.mapaSelecionadoId);
        var recAtual = mapaAtual ? mapaAtual.recomendacoes.find(function (r) { return r.id === recId; }) : null;
        estadoMapa.decisaoRecEmEdicao = {
            recId: String(recId || ''),
            acao: acaoNorm,
            texto: recAtual ? (recAtual.descricao_proposta || recAtual.titulo || '') : '',
            nota: ''
        };
        atualizarPainelIa();
    }

    function cancelarEditorDecisaoRecMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.decisaoRecEmEdicao = null;
        atualizarPainelIa();
    }

    function confirmarEditorDecisaoRecMapaIaUI() {
        try {
            garantirEstadoSessaoMapa();
            var ed = estadoMapa.decisaoRecEmEdicao;
            if (!ed || !ed.recId) return;
            var elCbSobr = document.getElementById('mmDecRec_confirmarSobrescrita');
            var elCbRet = document.getElementById('mmDecRec_confirmarRetiradaGlobal');
            var elCbAjComp = document.getElementById('mmDecRec_confirmarAjusteCompartilhado');
            var elCbResEsc = document.getElementById('mmDecRec_resolverEscopo');
            var elAlvoId = document.getElementById('mmDecRec_alvoItemId');
            var elCampoAlvo = document.getElementById('mmDecRec_campoAlvo');
            var opcoes = {
                textoEditado: ed.acao === 'EDITAR_E_ACEITAR' ? valorEl('mmDecRec_texto') : '',
                nota: valorEl('mmDecRec_nota'),
                confirmarSobrescrita: !!(elCbSobr && elCbSobr.checked),
                confirmarRetiradaGlobal: !!(elCbRet && elCbRet.checked),
                confirmarAjusteCompartilhado: !!(elCbAjComp && elCbAjComp.checked)
            };
            if (elAlvoId && elAlvoId.value) opcoes.alvo_item_id = elAlvoId.value;
            if (elCampoAlvo && elCampoAlvo.value) opcoes.campo_alvo = elCampoAlvo.value;
            if (elCbResEsc && elCbResEsc.checked) {
                opcoes.resolverPendenciasEscopo = true;
                opcoes.funcao_ids = lerCheckboxesMarcados('mmDecRecFuncaoCb');
                opcoes.etapa_ids = lerCheckboxesMarcados('mmDecRecEtapaCb');
            }
            decidirRecomendacaoMapa(estadoMapa.mapaSelecionadoId, ed.recId, ed.acao, opcoes);
            estadoMapa.decisaoRecEmEdicao = null;
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function decidirRecomendacaoMapaIaUI(recId, acao) {
        abrirEditorDecisaoRecMapaIaUI(recId, acao);
    }

    function copiarPacoteCriticaMapaIaUI() {
        garantirEstadoSessaoMapa();
        var ta = document.getElementById('mmTextareaPacoteCritica');
        var texto = ta ? String(ta.value || '') : gerarPacoteCriticaExternaMapa(estadoMapa.mapaSelecionadoId);
        var st = document.getElementById('mmStatusCopiaCritica');
        var msgOk = '✅ Pedido copiado! Confira ausência de dados pessoais antes de colar na IA externa.';
        var msgManual = '⚠️ Copie manualmente o texto na caixa acima (Ctrl+C).';
        function fallback() {
            var ok = false;
            if (ta && typeof ta.select === 'function') {
                ta.select();
                try { ok = typeof document.execCommand === 'function' && !!document.execCommand('copy'); } catch (e) { ok = false; }
            }
            if (st) st.textContent = ok ? msgOk : msgManual;
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(texto).then(function () {
                if (st) st.textContent = msgOk;
            }).catch(fallback);
        } else {
            fallback();
        }
        return texto;
    }

    function atualizarRascunhoImportCriticaMapaIaUI(valor) {
        garantirEstadoSessaoMapa();
        estadoMapa.textoImportCriticaDraft = String(valor || '');
    }

    function preVisualizarImportacaoCriticaMapaIaUI() {
        try {
            var bruto = valorEl('mmTextareaImportarCritica') || estadoMapa.textoImportCriticaDraft;
            estadoMapa.textoImportCriticaDraft = bruto;
            estadoMapa.previaImportCritica = analisarRetornoCriticaExternaMapa(bruto, estadoMapa.mapaSelecionadoId);
            atualizarPainelIa();
        } catch (err) {
            estadoMapa.previaImportCritica = null;
            alert(err.message);
        }
    }

    function confirmarImportacaoCriticaMapaIaUI() {
        try {
            confirmarImportacaoCriticaExternaMapa(estadoMapa.previaImportCritica);
            estadoMapa.previaImportCritica = null;
            estadoMapa.textoImportCriticaDraft = '';
            atualizarPainelIa();
        } catch (err) {
            alert(err.message);
        }
    }

    function cancelarImportacaoCriticaMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.previaImportCritica = null;
        atualizarPainelIa();
    }

    function alternarBoxBackupMapaIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.boxBackupAberto = !estadoMapa.boxBackupAberto;
        atualizarPainelIa();
    }

    function exportarBackupMapasIaUI() {
        try {
            var bkp = gerarBackupMapasLocais();
            var baixou = baixarJsonMapaLocal(bkp.nomeArquivo, bkp.json);
            if (!baixou) {
                alert('Não foi possível iniciar o download do backup neste navegador.');
                return null;
            }
            registrarBackupMapaExportado(bkp.geradoEm);
            atualizarPainelIa();
            return Object.assign({}, bkp, { baixado: true });
        } catch (err) {
            alert(err.message);
            return null;
        }
    }

    function atualizarRascunhoBackupMapaIaUI(valor) {
        garantirEstadoSessaoMapa();
        estadoMapa.textoBackupDraft = String(valor || '');
    }

    function lerArquivoBackupMapaIaUI(inputEl) {
        if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
        var arq = inputEl.files[0];
        if (typeof FileReader !== 'function') return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var conteudo = String((ev && ev.target && ev.target.result) || '');
            estadoMapa.textoBackupDraft = conteudo;
            var el = document.getElementById('mmTextareaBackupJson');
            if (el) el.value = conteudo;
        };
        reader.readAsText(arq, 'UTF-8');
    }

    function preVisualizarBackupMapasIaUI() {
        try {
            var bruto = valorEl('mmTextareaBackupJson') || estadoMapa.textoBackupDraft;
            estadoMapa.textoBackupDraft = bruto;
            estadoMapa.previaBackup = analisarBackupMapasLocais(bruto);
            atualizarPainelIa();
        } catch (err) {
            estadoMapa.previaBackup = null;
            alert(err.message);
        }
    }

    function confirmarRestauracaoBackupMapasIaUI(modo) {
        try {
            garantirEstadoSessaoMapa();
            exigirPermissaoEdicaoMapa('aplicar restauração de backup');
            var previa = estadoMapa.previaBackup;
            if (!previa || previa.formato !== FORMATO_BACKUP_MAPA || !Array.isArray(previa.mapasValidados)) {
                throw new Error('Prévia de backup inválida. Analise o arquivo novamente.');
            }
            if (previa.geracaoSessaoId !== estadoMapa.geracaoSessaoId || previa.identidadeChave !== estadoMapa.identidadeChave) {
                throw new Error('A sessão mudou após a pré-visualização. Analise o backup novamente.');
            }
            var opcoes = { modo: modo === 'substituir' ? 'substituir' : 'mesclar' };
            if (opcoes.modo === 'mesclar') {
                opcoes.politicaConflito = valorEl('mmBackupPoliticaConflito');
            } else if (estadoMapa.mapas.length > 0) {
                if (typeof confirm === 'function' && !confirm('Substituir os mapas atuais? Será baixada antes uma cópia de segurança dos mapas existentes.')) {
                    return null;
                }
                var copia = gerarBackupMapasLocais();
                var baixou = baixarJsonMapaLocal('copia-seguranca-' + copia.nomeArquivo, copia.json);
                if (!baixou) {
                    alert('Substituição cancelada: falha ao baixar a cópia de segurança prévia.');
                    return null;
                }
                opcoes.backupPrevioConfirmado = true;
            }
            var res = aplicarRestauracaoBackupMapas(previa, opcoes);
            estadoMapa.previaBackup = null;
            estadoMapa.textoBackupDraft = '';
            atualizarPainelIa();
            return res;
        } catch (err) {
            alert(err.message);
            return null;
        }
    }

    function cancelarPreviaBackupMapasIaUI() {
        garantirEstadoSessaoMapa();
        estadoMapa.previaBackup = null;
        atualizarPainelIa();
    }

    function imprimirMapaMentalIaUI() {
        try {
            imprimirMapaMentalIa(estadoMapa.mapaSelecionadoId);
        } catch (err) {
            alert(err.message);
        }
    }

    function obterEstadoMapaMentalIa() {
        garantirEstadoSessaoMapa();
        return clonarProfundo({
            identidadeChave: estadoMapa.identidadeChave,
            geracaoSessaoId: estadoMapa.geracaoSessaoId,
            modoVisao: estadoMapa.modoVisao,
            mapaSelecionadoId: estadoMapa.mapaSelecionadoId,
            etapaFocoId: estadoMapa.etapaFocoId,
            funcaoFocoId: estadoMapa.funcaoFocoId,
            perigoFocoId: estadoMapa.perigoFocoId,
            ramosRecolhidos: estadoMapa.ramosRecolhidos,
            textoImportCriticaDraft: estadoMapa.textoImportCriticaDraft,
            textoBackupDraft: estadoMapa.textoBackupDraft,
            filtroTabelaFuncaoId: estadoMapa.filtroTabelaFuncaoId,
            filtroTabelaStatus: estadoMapa.filtroTabelaStatus,
            ultimoBackupEm: estadoMapa.ultimoBackupEm,
            alteracoesAposBackup: estadoMapa.alteracoesAposBackup,
            mapas: estadoMapa.mapas
        });
    }

    // Exportações públicas na janela global
    window.renderizarAbaMapaMentalIa = renderizarAbaMapaMentalIa;
    window.obterEstadoMapaMentalIa = obterEstadoMapaMentalIa;
    window.obterPapelMapaMentalIa = obterPapelMapa;
    window.obterCatalogoGheSomenteLeitura = obterCatalogoGheSomenteLeitura;
    window.buscarReferenciaGhePorFuncao = buscarReferenciaGhePorFuncao;
    window.criarOuAtualizarMapaMental = criarOuAtualizarMapaMental;
    window.excluirMapaMental = excluirMapaMental;
    window.selecionarMapaMentalIa = selecionarMapaMentalIa;
    window.salvarFuncaoMapa = salvarFuncaoMapa;
    window.salvarFerramentaMapa = salvarFerramentaMapa;
    window.salvarEtapaMapa = salvarEtapaMapa;
    window.reordenarEtapaMapa = reordenarEtapaMapa;
    window.salvarEpiMapa = salvarEpiMapa;
    window.salvarPerigoMapa = salvarPerigoMapa;
    window.alterarStatusItemMapa = alterarStatusItemMapa;
    window.removerItemMapa = removerItemMapa;
    window.registrarRecomendacaoMapa = registrarRecomendacaoMapa;
    window.atualizarEscopoAlvoRecomendacaoMapa = atualizarEscopoAlvoRecomendacaoMapa;
    window.decidirRecomendacaoMapa = decidirRecomendacaoMapa;
    window.executarRevisaoLocalMapa = executarRevisaoLocalMapa;
    window.gerarPacoteCriticaExternaMapa = gerarPacoteCriticaExternaMapa;
    window.analisarRetornoCriticaExternaMapa = analisarRetornoCriticaExternaMapa;
    window.confirmarImportacaoCriticaExternaMapa = confirmarImportacaoCriticaExternaMapa;
    window.gerarBackupMapasLocais = gerarBackupMapasLocais;
    window.registrarBackupMapaExportado = registrarBackupMapaExportado;
    window.analisarBackupMapasLocais = analisarBackupMapasLocais;
    window.aplicarRestauracaoBackupMapas = aplicarRestauracaoBackupMapas;
    window.imprimirMapaMentalIa = imprimirMapaMentalIa;

    // Handlers UI
    window.alternarModoVisaoMapaIaUI = alternarModoVisaoMapaIaUI;
    window.selecionarMapaMentalIaUI = selecionarMapaMentalIaUI;
    window.filtrarMapaPorEtapaUI = filtrarMapaPorEtapaUI;
    window.filtrarMapaPorFuncaoUI = filtrarMapaPorFuncaoUI;
    window.focarPerigoMapaIaUI = focarPerigoMapaIaUI;
    window.alternarRamoMapaIaUI = alternarRamoMapaIaUI;
    window.filtrarTabelaMapaFuncaoUI = filtrarTabelaMapaFuncaoUI;
    window.filtrarTabelaMapaStatusUI = filtrarTabelaMapaStatusUI;
    window.abrirFormMapaMentalIaUI = abrirFormMapaMentalIaUI;
    window.fecharFormMapaMentalIaUI = fecharFormMapaMentalIaUI;
    window.salvarFormMapaMentalIaUI = salvarFormMapaMentalIaUI;
    window.excluirMapaMentalIaUI = excluirMapaMentalIaUI;
    window.abrirFormRamoMapaIaUI = abrirFormRamoMapaIaUI;
    window.fecharFormRamoMapaIaUI = fecharFormRamoMapaIaUI;
    window.salvarFormRamoMapaIaUI = salvarFormRamoMapaIaUI;
    window.reordenarEtapaMapaIaUI = reordenarEtapaMapaIaUI;
    window.alterarStatusItemMapaIaUI = alterarStatusItemMapaIaUI;
    window.alterarCondicaoEpiMapaIaUI = alterarCondicaoEpiMapaIaUI;
    window.removerItemMapaIaUI = removerItemMapaIaUI;
    window.abrirFormRecomendacaoMapaIaUI = abrirFormRecomendacaoMapaIaUI;
    window.atualizarRamoFormRecomendacaoMapaIaUI = atualizarRamoFormRecomendacaoMapaIaUI;
    window.fecharFormRecomendacaoMapaIaUI = fecharFormRecomendacaoMapaIaUI;
    window.salvarFormRecomendacaoMapaIaUI = salvarFormRecomendacaoMapaIaUI;
    window.executarRevisaoLocalMapaIaUI = executarRevisaoLocalMapaIaUI;
    window.abrirEditorDecisaoRecMapaIaUI = abrirEditorDecisaoRecMapaIaUI;
    window.cancelarEditorDecisaoRecMapaIaUI = cancelarEditorDecisaoRecMapaIaUI;
    window.confirmarEditorDecisaoRecMapaIaUI = confirmarEditorDecisaoRecMapaIaUI;
    window.decidirRecomendacaoMapaIaUI = decidirRecomendacaoMapaIaUI;
    window.copiarPacoteCriticaMapaIaUI = copiarPacoteCriticaMapaIaUI;
    window.atualizarRascunhoImportCriticaMapaIaUI = atualizarRascunhoImportCriticaMapaIaUI;
    window.preVisualizarImportacaoCriticaMapaIaUI = preVisualizarImportacaoCriticaMapaIaUI;
    window.confirmarImportacaoCriticaMapaIaUI = confirmarImportacaoCriticaMapaIaUI;
    window.cancelarImportacaoCriticaMapaIaUI = cancelarImportacaoCriticaMapaIaUI;
    window.alternarBoxBackupMapaIaUI = alternarBoxBackupMapaIaUI;
    window.exportarBackupMapasIaUI = exportarBackupMapasIaUI;
    window.atualizarRascunhoBackupMapaIaUI = atualizarRascunhoBackupMapaIaUI;
    window.lerArquivoBackupMapaIaUI = lerArquivoBackupMapaIaUI;
    window.preVisualizarBackupMapasIaUI = preVisualizarBackupMapasIaUI;
    window.confirmarRestauracaoBackupMapasIaUI = confirmarRestauracaoBackupMapasIaUI;
    window.cancelarPreviaBackupMapasIaUI = cancelarPreviaBackupMapasIaUI;
    window.imprimirMapaMentalIaUI = imprimirMapaMentalIaUI;

})(window);
