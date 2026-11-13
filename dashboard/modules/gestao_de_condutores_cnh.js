/**
 * dashboard/modules/gestao_de_condutores_cnh.js
 * =============================================================================
 * MÓDULO INDEPENDENTE: GESTÃO DE CONDUTORES — CNH (PISF Ramal do Agreste)
 * =============================================================================
 * - Escopo: Condutores de veículos e operadores de equipamentos (Próprios,
 *   Terceiros e PJ).
 * - Isolamento: todas as leituras/gravações de CONDUTORES operam
 *   exclusivamente sobre `public.gestao_de_condutores_cnh` e suas RPCs.
 *   Única exceção, apenas de LEITURA: consulta a `colaboradores_efetivo`
 *   (base do módulo Efetivo) para sugerir nome/função/setor no formulário.
 *   NENHUMA escrita ou sincronização em `colaboradores_efetivo` ou
 *   `colaboradores_checklist`. Não altera RSA/ADA/HHT.
 * - Privacidade inicial: Não coleta número de CNH nem CPF/RG. Sem anexos,
 *   disparos automáticos, ASO ou impressão nesta primeira entrega.
 * - Arquitetura: IIFE estrita, mantendo todo estado, eventos, modais e regras
 *   encapsulados. Expõe no escopo global do produto SOMENTE
 *   `window.renderGestaoDeCondutoresPanel`.
 */
(function (window) {
    'use strict';
    const MODULO_KEY = 'gestao_de_condutores';
    const TABELA_CONDUTORES = 'gestao_de_condutores_cnh';
    const CONTAINER_ID = 'page-gestao_de_condutores';
    const TAMANHO_PAGINA_POSTGREST = 1000;
    const CATEGORIAS_CNH_VALIDAS = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
    // Matriz interna aprovada por João nesta sessão; evidências individuais continuam obrigatórias.
    const MATRIZ_SST_APROVADA = [
    {
        "atividade_codigo": "VEIC_LEVE_UTILITARIO",
        "atividade_nome": "Veículo Leve / Caminhonete / Pick-up",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "B",
            "C",
            "D",
            "E",
            "AB",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            }
        ]
    },
    {
        "atividade_codigo": "TRANSP_COLETIVO_EQUIPES",
        "atividade_nome": "Van / Micro-ônibus / Ônibus",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "D",
            "E",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            },
            {
                "codigo": "TRANSP_COLETIVO",
                "nome": "Transporte Coletivo de Passageiros",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "INDEFINIDO"
            }
        ]
    },
    {
        "atividade_codigo": "CAMINHAO_APOIO_OBRA",
        "atividade_nome": "Caminhão Basculante / Pipa / Carroceria",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "C",
            "D",
            "E",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            },
            {
                "codigo": "NR11_BASCULANTE",
                "nome": "Operação Segura de Basculamento e Carga",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            }
        ]
    },
    {
        "atividade_codigo": "CAMINHAO_COMBOIO_ABAST",
        "atividade_nome": "Caminhão Comboio (Abastecimento / Lubrificação)",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "C",
            "D",
            "E",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            },
            {
                "codigo": "MOPP",
                "nome": "Transporte de Produtos Perigosos",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "INDEFINIDO"
            },
            {
                "codigo": "NR20_OPERACIONAL",
                "nome": "NR-20 Operacional",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "INDEFINIDO"
            }
        ]
    },
    {
        "atividade_codigo": "CAMINHAO_GUINDAUTO_MUNCK",
        "atividade_nome": "Caminhão Guindauto (Munck)",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "C",
            "D",
            "E",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "NR11_GUINDAUTO",
                "nome": "Operação Segura de Guindauto",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            },
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            }
        ]
    },
    {
        "atividade_codigo": "LINHA_AMARELA_TERRAPLENAGEM",
        "atividade_nome": "Linha Amarela / Terraplenagem",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "C",
            "D",
            "E",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "NR11_NR12_LINHA_AMARELA",
                "nome": "Operação Segura de Máquinas Pesadas",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            },
            {
                "codigo": "DIR_DEFENSIVA",
                "nome": "Direção Defensiva / Preventiva em Obras",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            }
        ]
    },
    {
        "atividade_codigo": "MOV_CARGA_EMPILHADEIRA",
        "atividade_nome": "Empilhadeira / Manipulador Telescópico",
        "exige_cnh": "SIM",
        "categorias_aceitas": [
            "B",
            "C",
            "D",
            "E",
            "AB",
            "AC",
            "AD",
            "AE"
        ],
        "treinamentos": [
            {
                "codigo": "NR11_EMPILHADEIRA",
                "nome": "Operação Segura de Empilhadeira",
                "status_aplicabilidade": "OBRIGATORIO",
                "exige_validade": "SIM"
            }
        ]
    }
];
    const VINCULOS_VALIDOS = ['PROPRIO', 'TERCEIRO', 'PJ'];
    const CANAIS_COMUNICACAO = [
        { codigo: 'WHATSAPP', label: 'WhatsApp Corporativo' },
        { codigo: 'DDS_PRESENCIAL', label: 'Orientação em DDS / Presencial' },
        { codigo: 'EMAIL', label: 'E-mail Institucional' },
        { codigo: 'OFICIO_FORMAL', label: 'Comunicado / Ofício Formal' },
        { codigo: 'TELEFONE', label: 'Contato Telefônico' }
    ];
    // Estado interno estritamente privado à IIFE (nunca exposto no produto)
    const state = {
        carregando: false,
        carregadoUmaVez: false,
        erroCarregamento: null,
        chaveIdentidadeAtiva: null,
        geracaoSessao: 0,
        seqCarregamento: 0,
        seqVerificacaoCapacidade: 0,
        ultimoResultadoDescartadoSessaoAnterior: null,
        ultimaDataCivilSpRenderizada: null,
        capacidadeBancoCache: {
            chaveIdentidade: null,
            geracaoSessao: -1,
            verificado: false,
            podeLer: false,
            podeEscrever: false
        },
        statusAuth: {
            verificando: false,
            autenticadoJwt: false,
            autorizadoLeitura: false,
            autorizadoEscrita: false,
            divergenciaIdentidade: false,
            motivoBloqueio: '',
            uid: null,
            emailJwt: '',
            nomeSessao: '',
            matriculaSessao: ''
        },
        antecedenciaPadraoDias: 30,
        condutores: [],
        filtros: {
            buscaNome: '',
            setorFrente: 'TODOS',
            empresa: 'TODAS',
            vinculo: 'TODOS',
            atividade: 'TODAS',
            aptidao: 'TODAS',
            vencimento: 'TODOS',
            incluirInativos: true
        },
        abaAtiva: 'CONDUTORES', // 'CONDUTORES' | 'PRONTIDAO_EQUIPES'
        buscaFrenteProntidao: '',
        prontidaoEquipesAberta: true,
        fontesResumo: { efetivo: [], catalogo: [], status: 'NAO_CARREGADA', falhas: [] },
        requisicaoResumo: 0,
        modalAtivo: null, // 'CADASTRO' | 'INATIVAR' | 'COMUNICACAO' | 'HISTORICO' | null
        modalDados: null,
        erroModal: '',
        salvandoModal: false,
        // Base do Efetivo (somente leitura) usada para autocompletar o cadastro.
        // 'NAO_CARREGADA' | 'CARREGANDO' | 'PRONTA' | 'INDISPONIVEL'
        baseColaboradores: [],
        baseColaboradoresStatus: 'NAO_CARREGADA',
        baseColaboradoresErro: '',
        buscaBaseColaborador: '',
        sugestoesBaseAbertas: false,
        sugestoesBaseAtuais: [],
        avisoBaseColaborador: '',
        ultimoTextoCopiado: '',
        avisoToastInterno: ''
    };
    // =========================================================================
    // 1. UTILITÁRIOS DE ESCAPE XSS, UUID E DATAS CIVIS (America/Sao_Paulo)
    // =========================================================================
    function escaparHtml(valor) {
        if (valor === null || valor === undefined) return '';
        return String(valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function gerarUuidV4Fallback() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    function validarDataIsoEstrita(dataStr) {
        if (typeof dataStr !== 'string') return false;
        const limpa = dataStr.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(limpa)) return false;
        const [ano, mes, dia] = limpa.split('-').map(Number);
        if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
        const dt = new Date(Date.UTC(ano, mes - 1, dia));
        return (
            dt.getUTCFullYear() === ano &&
            dt.getUTCMonth() === mes - 1 &&
            dt.getUTCDate() === dia
        );
    }
    /**
     * Retorna sempre a data civil corrente em `America/Sao_Paulo` (YYYY-MM-DD),
     * sem aceitar data simulada injetada no produto.
     */
    function obterDataCivilSaoPauloHoje(dateInput) {
        const ref = dateInput instanceof Date ? dateInput : new Date();
        try {
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).formatToParts(ref);
            const y = parts.find(p => p.type === 'year')?.value;
            const m = parts.find(p => p.type === 'month')?.value;
            const d = parts.find(p => p.type === 'day')?.value;
            if (y && m && d) return `${y}-${m}-${d}`;
        } catch (_) {
            // Fallback UTC-3
        }
        const spMs = ref.getTime() - 3 * 60 * 60 * 1000;
        const dSp = new Date(spMs);
        const y = dSp.getUTCFullYear();
        const m = String(dSp.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dSp.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    function calcularDiferencaDiasCivis(dataAlvoIso, dataRefIso) {
        if (!validarDataIsoEstrita(dataAlvoIso) || !validarDataIsoEstrita(dataRefIso)) {
            return null;
        }
        const [yA, mA, dA] = dataAlvoIso.split('-').map(Number);
        const [yR, mR, dR] = dataRefIso.split('-').map(Number);
        const utcAlvo = Date.UTC(yA, mA - 1, dA);
        const utcRef = Date.UTC(yR, mR - 1, dR);
        return Math.round((utcAlvo - utcRef) / (1000 * 60 * 60 * 24));
    }
    function formatarDataBr(dataIso) {
        if (!validarDataIsoEstrita(dataIso)) return '—';
        const [y, m, d] = dataIso.split('-');
        return `${d}/${m}/${y}`;
    }
    function extrairPrimeiroNome(nomeCompleto) {
        const limpo = String(nomeCompleto || '').trim();
        if (!limpo) return 'Condutor(a)';
        return limpo.split(/\s+/)[0];
    }
    // =========================================================================
    // 2. MOTOR DE CÁLCULO DE VENCIMENTO DE CNH, TREINAMENTOS E APTIDÃO
    // =========================================================================
    /**
     * Calcula a situação civil da CNH com referência em America/Sao_Paulo:
     * - Validade == hoje -> VIGENTE com aviso `VENCE_HOJE` (incluída em "A vencer (inclui hoje)").
     * - Validade < hoje  -> `VENCIDA` (apenas no dia seguinte ao vencimento).
     * - 1 <= dias <= antecedencia -> `A_VENCER` (vigente, dentro da janela de alerta).
     * - dias > antecedencia -> `FORA_DA_JANELA` (vigente, fora da janela de alerta).
     */
    function calcularSituacaoCnh(condutor, dataRefIso) {
        const ref = validarDataIsoEstrita(dataRefIso) ? dataRefIso : obterDataCivilSaoPauloHoje();
        const cat = String(condutor?.cnh_categoria || '').trim().toUpperCase();
        const val = condutor?.cnh_validade ? String(condutor.cnh_validade).trim() : '';
        const antecedenciaRaw = Number(condutor?.antecedencia_alerta_dias || state.antecedenciaPadraoDias || 30);
        const antecedencia = Number.isFinite(antecedenciaRaw)
            ? Math.min(180, Math.max(1, Math.trunc(antecedenciaRaw)))
            : 30;
        if (!cat || cat === 'NAO_POSSUI') {
            return {
                possuiCnh: false,
                categoria: cat || 'AUSENTE',
                validade: null,
                cnhCicloId: null,
                diasRestantes: null,
                antecedenciaDias: antecedencia,
                vigente: false,
                vencida: false,
                venceHoje: false,
                aVencer: false,
                statusCodigo: 'AUSENTE',
                statusTexto: cat === 'NAO_POSSUI' ? 'Não possui CNH declarada' : 'Categoria/validade de CNH ausente'
            };
        }
        if (!validarDataIsoEstrita(val)) {
            return {
                possuiCnh: false,
                categoria: cat,
                validade: null,
                cnhCicloId: condutor?.cnh_ciclo_id || null,
                diasRestantes: null,
                antecedenciaDias: antecedencia,
                vigente: false,
                vencida: false,
                venceHoje: false,
                aVencer: false,
                statusCodigo: 'VALIDADE_AUSENTE',
                statusTexto: `CNH Cat. ${cat} sem data de validade informada`
            };
        }
        const diff = calcularDiferencaDiasCivis(val, ref);
        if (diff < 0) {
            const diasVenc = Math.abs(diff);
            return {
                possuiCnh: true,
                categoria: cat,
                validade: val,
                cnhCicloId: condutor?.cnh_ciclo_id || null,
                diasRestantes: diff,
                antecedenciaDias: antecedencia,
                vigente: false,
                vencida: true,
                venceHoje: false,
                aVencer: false,
                statusCodigo: 'VENCIDA',
                statusTexto: `CNH Vencida há ${diasVenc} dia(s) (${formatarDataBr(val)})`
            };
        }
        if (diff === 0) {
            return {
                possuiCnh: true,
                categoria: cat,
                validade: val,
                cnhCicloId: condutor?.cnh_ciclo_id || null,
                diasRestantes: 0,
                antecedenciaDias: antecedencia,
                vigente: true,
                vencida: false,
                venceHoje: true,
                aVencer: true,
                statusCodigo: 'VENCE_HOJE',
                statusTexto: `Vigente — Vence hoje (${formatarDataBr(val)})`
            };
        }
        if (diff <= antecedencia) {
            return {
                possuiCnh: true,
                categoria: cat,
                validade: val,
                cnhCicloId: condutor?.cnh_ciclo_id || null,
                diasRestantes: diff,
                antecedenciaDias: antecedencia,
                vigente: true,
                vencida: false,
                venceHoje: false,
                aVencer: true,
                statusCodigo: 'A_VENCER',
                statusTexto: `Vigente — A vencer em ${diff} dia(s) (${formatarDataBr(val)})`
            };
        }
        return {
            possuiCnh: true,
            categoria: cat,
            validade: val,
            cnhCicloId: condutor?.cnh_ciclo_id || null,
            diasRestantes: diff,
            antecedenciaDias: antecedencia,
            vigente: true,
            vencida: false,
            venceHoje: false,
            aVencer: false,
            statusCodigo: 'FORA_DA_JANELA',
            statusTexto: `Vigente — Vence em ${diff} dia(s) (${formatarDataBr(val)})`
        };
    }
    function dtValidadeConferenciaIso(valor) {
        if (!valor) return '';
        return String(valor).trim().slice(0, 10);
    }
    /**
     * Avalia um treinamento individual dentro de uma avaliação de atividade:
     * - status_aplicabilidade === 'NAO_APLICAVEL' -> explícito, não bloqueia.
     * - status_aplicabilidade vazio ou 'PENDENTE_REGRA' -> PENDENTE.
     * - status_aplicabilidade === 'OBRIGATORIO':
     *   - Se validade preenchida e vencida (< hoje) -> INAPTO (vencimento conhecido prevalece).
     *   - Se exige_validade === 'INDEFINIDO' ou vazio -> PENDENTE.
     *   - Se exige_validade === 'SIM' e sem validade válida -> PENDENTE.
     *   - Se sem data_realizacao válida ou se data_realizacao for futura (> hoje) -> PENDENTE.
     *   - Se sem comprovacao_ref ou sem conferido_por/conferido_em ou conferido_em futuro -> PENDENTE.
     *   - Caso contrário -> APTO (sinalizando janela de vencimento quando aplicável).
     */
    function avaliarTreinamentoAtividade(trein, dataRefIso, antecedenciaDias) {
        const ref = validarDataIsoEstrita(dataRefIso) ? dataRefIso : obterDataCivilSaoPauloHoje();
        const codigo = String(trein?.codigo || '').trim();
        const nome = String(trein?.nome || codigo || 'Treinamento').trim();
        const aplic = String(trein?.status_aplicabilidade || '').trim().toUpperCase();
        const exigeVal = String(trein?.exige_validade || '').trim().toUpperCase();
        const dtRealizacao = trein?.data_realizacao ? String(trein.data_realizacao).trim() : '';
        const dtValidade = trein?.validade ? String(trein.validade).trim() : '';
        const comprovacaoRef = String(trein?.comprovacao_ref || '').trim();
        const conferidoPor = String(trein?.conferido_por || '').trim();
        const conferidoEmIso = dtValidadeConferenciaIso(trein?.conferido_em);
        if (aplic === 'NAO_APLICAVEL') {
            return {
                codigo,
                nome,
                situacao: 'NAO_APLICAVEL',
                motivo: `${nome}: Não aplicável (registrado explicitamente)`
            };
        }
        if (!aplic || aplic === 'PENDENTE_REGRA') {
            return {
                codigo,
                nome,
                situacao: 'PENDENTE',
                motivo: `${nome}: Aplicabilidade do treinamento não definida/pendente`
            };
        }
        // Mesmo que haja lacunas de regra/conferência, se há uma validade conhecida e já vencida -> INAPTO prevalece!
        if (validarDataIsoEstrita(dtValidade)) {
            const diffVal = calcularDiferencaDiasCivis(dtValidade, ref);
            if (diffVal < 0) {
                return {
                    codigo,
                    nome,
                    situacao: 'INAPTO',
                    motivo: `${nome}: Treinamento obrigatório vencido em ${formatarDataBr(dtValidade)} (há ${Math.abs(diffVal)} dia(s))`
                };
            }
        }
        const pendenciasTrein = [];
        if (!exigeVal || exigeVal === 'INDEFINIDO') {
            pendenciasTrein.push('exigência de validade indefinida na regra');
        } else if (exigeVal === 'SIM' && !validarDataIsoEstrita(dtValidade)) {
            pendenciasTrein.push('data de validade não informada');
        }
        if (!validarDataIsoEstrita(dtRealizacao)) {
            pendenciasTrein.push('data de realização ausente');
        } else if (calcularDiferencaDiasCivis(dtRealizacao, ref) > 0) {
            pendenciasTrein.push(`data de realização futura (${formatarDataBr(dtRealizacao)}) não comprova treinamento realizado`);
        }
        if (!comprovacaoRef) {
            pendenciasTrein.push('referência de comprovação documental ausente');
        }
        if (!conferidoPor || !validarDataIsoEstrita(conferidoEmIso)) {
            pendenciasTrein.push('conferência de comprovação (quem/quando) pendente');
        } else if (calcularDiferencaDiasCivis(conferidoEmIso, ref) > 0) {
            pendenciasTrein.push(`data de conferência futura (${formatarDataBr(conferidoEmIso)}) inválida`);
        }
        if (pendenciasTrein.length > 0) {
            return {
                codigo,
                nome,
                situacao: 'PENDENTE',
                motivo: `${nome}: Pendente (${pendenciasTrein.join('; ')})`
            };
        }
        if (exigeVal === 'SIM' && validarDataIsoEstrita(dtValidade)) {
            const diffVal = calcularDiferencaDiasCivis(dtValidade, ref);
            const avisoJanela = diffVal === 0
                ? ` — Vence hoje (${formatarDataBr(dtValidade)})`
                : (diffVal <= (antecedenciaDias || 30) ? ` — A vencer em ${diffVal} dia(s) (${formatarDataBr(dtValidade)})` : ` — válido até ${formatarDataBr(dtValidade)}`);
            return {
                codigo,
                nome,
                situacao: 'APTO',
                motivo: `${nome}: Vigente e conferido${avisoJanela}`
            };
        }
        return {
            codigo,
            nome,
            situacao: 'APTO',
            motivo: `${nome}: Realizado em ${formatarDataBr(dtRealizacao)} (sem vencimento periódico exigido pela regra aprovada)`
        };
    }
    /**
     * Avalia uma atividade/equipamento do condutor seguindo estritamente a prioridade:
     * Inativo > Inapto > Pendente > Apto nos requisitos cadastrados.
     * - Requisito vencido conhecido ou categoria comprovadamente incompatível (em regra aprovada)
     *   prevalece como Inapto mesmo se a regra ainda tiver pendências coexistentes.
     * - Lista de categorias em regra não aprovada NÃO impõe incompatibilidade definitiva (fica Pendente).
     */
    function avaliarAtividadeCondutor(condutor, avaliacao, situacaoCnh, dataRefIso) {
        const ref = validarDataIsoEstrita(dataRefIso) ? dataRefIso : obterDataCivilSaoPauloHoje();
        const cnh = situacaoCnh || calcularSituacaoCnh(condutor, ref);
        const motivosInapto = [];
        const motivosPendente = [];
        const motivosInformativos = [];
        const atividadeCodigo = String(avaliacao?.atividade_codigo || '').trim();
        const atividadeNome = String(avaliacao?.atividade_nome || atividadeCodigo || 'Atividade não especificada').trim();
        const exigeCnh = String(avaliacao?.exige_cnh || '').trim().toUpperCase();
        const categoriasAceitas = Array.isArray(avaliacao?.categorias_aceitas)
            ? avaliacao.categorias_aceitas.map(c => String(c || '').trim().toUpperCase()).filter(c => CATEGORIAS_CNH_VALIDAS.includes(c))
            : [];
        // Verifica se a regra da atividade possui aprovação formal rastreável
        const regraFormalmenteAprovada = Boolean(
            avaliacao?.regra_aprovada === true &&
            String(avaliacao?.regra_versao || '').trim().length > 0 &&
            String(avaliacao?.regra_aprovada_por_uid || '').trim().length >= 8 &&
            String(avaliacao?.regra_aprovada_por_nome || '').trim().length >= 2 &&
            validarDataIsoEstrita(String(avaliacao?.regra_aprovada_em || '').trim().slice(0, 10))
        );
        if (!regraFormalmenteAprovada) {
            motivosPendente.push('Regra da atividade/equipamento ainda não aprovada formalmente na matriz SST');
        }
        // 1. Verificação de CNH para a atividade
        if (exigeCnh === 'NAO') {
            motivosInformativos.push('CNH: Não aplicável para esta atividade (declarado explicitamente)');
        } else if (exigeCnh === 'SIM') {
            if (cnh.vencida) {
                motivosInapto.push(`CNH exigida está vencida (${formatarDataBr(cnh.validade)})`);
            } else if (!cnh.possuiCnh) {
                motivosPendente.push(`CNH obrigatória para a atividade não informada/comprovada (${cnh.statusTexto})`);
            }
            if (categoriasAceitas.length === 0) {
                motivosPendente.push('Categorias de CNH compatíveis não definidas na regra da atividade');
            } else if (cnh.possuiCnh || (cnh.categoria && CATEGORIAS_CNH_VALIDAS.includes(cnh.categoria))) {
                if (!categoriasAceitas.includes(cnh.categoria)) {
                    if (regraFormalmenteAprovada) {
                        motivosInapto.push(`Categoria de CNH (${cnh.categoria}) comprovadamente incompatível com as exigidas pela matriz aprovada (${categoriasAceitas.join(', ')})`);
                    } else {
                        motivosPendente.push(`Compatibilidade da categoria de CNH (${cnh.categoria}) com a lista (${categoriasAceitas.join(', ')}) depende de aprovação formal da regra na matriz SST`);
                    }
                } else if (cnh.vigente) {
                    motivosInformativos.push(`CNH Cat. ${cnh.categoria} compatível (${cnh.statusTexto})`);
                }
            }
        } else {
            motivosPendente.push('Exigência de CNH indefinida para esta atividade');
        }
        // 2. Verificação de Treinamentos da atividade
        const treinamentos = Array.isArray(avaliacao?.treinamentos) ? avaliacao.treinamentos : [];
        if (treinamentos.length === 0) {
            motivosPendente.push('Requisitos de treinamento não definidos para esta atividade (registre Não Aplicável explicitamente quando não houver exigência)');
        } else {
            for (let i = 0; i < treinamentos.length; i++) {
                const resT = avaliarTreinamentoAtividade(treinamentos[i], ref, cnh.antecedenciaDias);
                if (resT.situacao === 'INAPTO') {
                    motivosInapto.push(resT.motivo);
                } else if (resT.situacao === 'PENDENTE') {
                    motivosPendente.push(resT.motivo);
                } else {
                    motivosInformativos.push(resT.motivo);
                }
            }
        }
        // 3. Prioridade estrita: Inativo > Inapto > Pendente > Apto nos requisitos cadastrados
        let statusPrioritario = 'APTO';
        let statusLabel = 'Apto nos requisitos cadastrados';
        if (condutor?.ativo === false) {
            statusPrioritario = 'INATIVO';
            statusLabel = 'Inativo';
        } else if (motivosInapto.length > 0) {
            statusPrioritario = 'INAPTO';
            statusLabel = 'Inapto';
        } else if (motivosPendente.length > 0) {
            statusPrioritario = 'PENDENTE';
            statusLabel = 'Pendente';
        }
        return {
            avaliacaoId: avaliacao?.avaliacao_id || '',
            atividadeCodigo,
            atividadeNome,
            statusPrioritario,
            statusLabel,
            regraFormalmenteAprovada,
            regraVersao: avaliacao?.regra_versao || null,
            motivosInapto,
            motivosPendente,
            motivosInformativos,
            todosMotivosVisiveis: [
                ...motivosInapto.map(m => ({ tipo: 'INAPTO', texto: m })),
                ...motivosPendente.map(m => ({ tipo: 'PENDENTE', texto: m })),
                ...motivosInformativos.map(m => ({ tipo: 'INFO', texto: m }))
            ]
        };
    }
    /**
     * Avalia o estado de alertas e comunicações de CNH do condutor:
     * - Alertas somente para condutores ATIVOS.
     * - Para dar baixa na pendência de comunicação da validade atual, exige-se
     *   correspondência TANTO do ciclo (`cnh_ciclo_id`) QUANTO da data de validade
     *   atual (`vencimento_comunicado === cnh.validade`). Assim, se a data de validade
     *   for corrigida mantendo o mesmo ciclo (`CORRECAO_DATA`), a comunicação referente
     *   à data antiga é preservada no histórico e NÃO baixa silenciosamente a nova pendência.
     */
    function avaliarAlertaEComunicacaoCondutor(condutor, situacaoCnh) {
        const cnh = situacaoCnh || calcularSituacaoCnh(condutor);
        const comunicacoes = Array.isArray(condutor?.comunicacoes) ? condutor.comunicacoes : [];
        const ciclosHistorico = Array.isArray(condutor?.ciclos_cnh_historico) ? condutor.ciclos_cnh_historico : [];
        const cicloAtualId = cnh.cnhCicloId ? String(cnh.cnhCicloId) : null;
        const comunicacoesCicloAtual = cicloAtualId
            ? comunicacoes.filter(c => String(c?.cnh_ciclo_id || '') === cicloAtualId)
            : [];
        const comunicacoesValidadeAtual = cnh.validade
            ? comunicacoesCicloAtual.filter(c => String(c?.vencimento_comunicado || '') === String(cnh.validade))
            : [];
        const ativo = condutor?.ativo !== false;
        const exigeAlertaAtivo = Boolean(ativo && cnh.possuiCnh && (cnh.vencida || cnh.venceHoje || cnh.aVencer));
        let comunicacaoPendente = false;
        const decisaoPendenteReavisoVencida = false; // Regra de reaviso aprovada por João em 09/11/2026.
        let resumoComunicacaoCiclo = 'Sem alerta ativo';
        if (!ativo) {
            resumoComunicacaoCiclo = 'Condutor inativo — alertas desativados';
        } else if (!exigeAlertaAtivo) {
            resumoComunicacaoCiclo = cnh.possuiCnh
                ? 'CNH fora da janela de alerta'
                : 'Sem validade de CNH ativa para alerta';
        } else if (!cicloAtualId) {
            comunicacaoPendente = true;
            resumoComunicacaoCiclo = 'Ciclo de validade pendente de geração';
        } else if (comunicacoesValidadeAtual.length === 0) {
            comunicacaoPendente = true;
            if (comunicacoesCicloAtual.length > 0) {
                const ultimaDataAntiga = comunicacoesCicloAtual[comunicacoesCicloAtual.length - 1]?.vencimento_comunicado;
                resumoComunicacaoCiclo = `Comunicação pendente para a validade corrigida (${formatarDataBr(cnh.validade)}) — aviso anterior (${formatarDataBr(ultimaDataAntiga)}) preservado no histórico`;
            } else {
                resumoComunicacaoCiclo = `Comunicação pendente para a validade atual (${formatarDataBr(cnh.validade)})`;
            }
        } else {
            const comunicouComoVencida = comunicacoesValidadeAtual.some(c => c.estagio_no_momento === 'VENCIDA');
            const ultima = comunicacoesValidadeAtual[comunicacoesValidadeAtual.length - 1];
            if (cnh.vencida && !comunicouComoVencida) {
                comunicacaoPendente = true;
                resumoComunicacaoCiclo = 'Novo aviso pendente após o vencimento — comunicação anterior preservada no histórico';
            } else {
                comunicacaoPendente = false;
                resumoComunicacaoCiclo = `Comunicação registrada (${ultima.canal} em ${formatarDataBr(String(ultima.registrado_em || '').slice(0, 10))})`;
            }
        }
        return {
            ativo,
            exigeAlertaAtivo,
            cnhCicloIdAtual: cicloAtualId,
            comunicacaoPendente,
            decisaoPendenteReavisoVencida,
            resumoComunicacaoCiclo,
            comunicacoesCicloAtual,
            comunicacoesValidadeAtual,
            totalComunicacoesHistoricas: comunicacoes.length,
            ciclosHistorico
        };
    }
    /**
     * Avalia integralmente um condutor (CNH + todas as atividades + alertas/comunicações).
     * Se não houver nenhuma atividade cadastrada, permanece PENDENTE por falta de avaliação
     * (mesmo se a CNH estiver vencida, pois ainda não se sabe se a atividade exige CNH;
     * o alerta documental da CNH permanece visível separadamente).
     */
    function avaliarCondutorCompleto(condutor, dataRefIso) {
        const ref = validarDataIsoEstrita(dataRefIso) ? dataRefIso : obterDataCivilSaoPauloHoje();
        const situacaoCnh = calcularSituacaoCnh(condutor, ref);
        const avaliacoesBrutas = Array.isArray(condutor?.avaliacoes) ? condutor.avaliacoes : [];
        let avaliacoesCalculadas;
        if (avaliacoesBrutas.length === 0) {
            const motivosInfoSemAtiv = situacaoCnh.vencida
                ? [`Alerta documental: CNH cadastrada encontra-se vencida (${formatarDataBr(situacaoCnh.validade)}), aguardando vínculo de atividade para definir exigência`]
                : [];
            avaliacoesCalculadas = [
                {
                    avaliacaoId: 'SEM_ATIVIDADE',
                    atividadeCodigo: 'NAO_VINCULADA',
                    atividadeNome: 'Sem atividade/equipamento cadastrado',
                    statusPrioritario: condutor?.ativo === false ? 'INATIVO' : 'PENDENTE',
                    statusLabel: condutor?.ativo === false ? 'Inativo' : 'Pendente',
                    regraFormalmenteAprovada: false,
                    regraVersao: null,
                    motivosInapto: [],
                    motivosPendente: ['Condutor ainda não possui avaliação de veículo, equipamento ou atividade vinculada (exigência de CNH e treinamentos não definida)'],
                    motivosInformativos: motivosInfoSemAtiv,
                    todosMotivosVisiveis: [
                        { tipo: 'PENDENTE', texto: 'Condutor ainda não possui avaliação de veículo, equipamento ou atividade vinculada (exigência de CNH e treinamentos não definida)' },
                        ...motivosInfoSemAtiv.map(m => ({ tipo: 'INFO', texto: m }))
                    ]
                }
            ];
        } else {
            avaliacoesCalculadas = avaliacoesBrutas.map(av =>
                avaliarAtividadeCondutor(condutor, av, situacaoCnh, ref)
            );
        }
        const alertaCom = avaliarAlertaEComunicacaoCondutor(condutor, situacaoCnh);
        return {
            condutor,
            situacaoCnh,
            avaliacoesCalculadas,
            alertaCom
        };
    }
    /**
     * Gera texto em pt-BR para cópia rápida de alerta (exclusivo para condutores ativos),
     * contendo apenas o primeiro nome, validade da CNH e orientação de procurar o SST,
     * sem documento pessoal e sem inventar bloqueio operacional geral não definido.
     */
    function gerarTextoComunicacaoPtBr(condutor, situacaoCnh) {
        if (!condutor || condutor.ativo === false) {
            throw new Error('Alertas e mensagens de comunicação são gerados apenas para condutores ativos.');
        }
        const cnh = situacaoCnh || calcularSituacaoCnh(condutor);
        const primeiroNome = extrairPrimeiroNome(condutor.nome);
        const validadeBr = cnh.validade ? formatarDataBr(cnh.validade) : 'não informada';
        if (cnh.vencida) {
            return `Olá, ${primeiroNome}. Identificamos no acompanhamento de SST do Ramal do Agreste que a validade da sua CNH registrada no sistema é ${validadeBr} (vencida). Por favor, procure o setor de SST para atualizar seu cadastro e alinhar os procedimentos formais aplicáveis à sua atividade.`;
        }
        if (cnh.venceHoje) {
            return `Olá, ${primeiroNome}. Lembramos que a validade da sua CNH registrada no acompanhamento de SST do Ramal do Agreste vence hoje (${validadeBr}). Por favor, procure o setor de SST para informar a renovação e atualizar seu cadastro.`;
        }
        return `Olá, ${primeiroNome}. Acompanhamento preventivo de SST do Ramal do Agreste: a validade da sua CNH é ${validadeBr}. Por favor, procure o setor de SST para informar o andamento da renovação e manter seu cadastro atualizado.`;
    }
    // =========================================================================
    // 3. AUTENTICAÇÃO E AUTORIZAÇÃO VERIFICÁVEL (COM SEGREGAÇÃO DE SESSÃO/CACHE)
    // =========================================================================
    function limparDadosEModaisPorPerdaDeAcesso() {
        state.requisicaoResumo += 1;
        state.fontesResumo = { efetivo: [], catalogo: [], status: 'NAO_CARREGADA', falhas: [] };
        state.carregando = false;
        state.condutores = [];
        state.carregadoUmaVez = false;
        state.erroCarregamento = null;
        state.modalAtivo = null;
        state.modalDados = null;
        state.erroModal = '';
        state.salvandoModal = false;
        state.ultimoTextoCopiado = '';
        state.avisoToastInterno = '';
        // Base do Efetivo (leitura) também é descartada ao trocar/perder sessão.
        state.baseColaboradores = [];
        state.baseColaboradoresStatus = 'NAO_CARREGADA';
        state.baseColaboradoresErro = '';
        state.buscaBaseColaborador = '';
        state.sugestoesBaseAbertas = false;
        state.sugestoesBaseAtuais = [];
        state.avisoBaseColaborador = '';
    }
    function invalidarCacheDadosSessao() {
        state.geracaoSessao += 1;
        limparDadosEModaisPorPerdaDeAcesso();
        state.capacidadeBancoCache = {
            chaveIdentidade: null,
            geracaoSessao: -1,
            verificado: false,
            podeLer: false,
            podeEscrever: false
        };
    }
    function sincronizarVinculoCacheIdentidade(novaChaveIdentidade) {
        if (state.chaveIdentidadeAtiva !== novaChaveIdentidade) {
            invalidarCacheDadosSessao();
            state.chaveIdentidadeAtiva = novaChaveIdentidade;
        }
    }
    function lerSnapshotSessaoVisualSincrono() {
        const s = typeof window.sessaoDashboardAtual === 'function'
            ? window.sessaoDashboardAtual()
            : null;
        if (!s || typeof s !== 'object') {
            return {
                presente: false,
                matricula: '',
                matriculaUpper: '',
                uidVisual: '',
                emailVisual: '',
                nome: '',
                raw: null
            };
        }
        const mat = String(s.matricula || '').trim();
        return {
            presente: true,
            matricula: mat,
            matriculaUpper: mat.toUpperCase(),
            uidVisual: String(s.auth_user_id || s.uid || '').trim(),
            emailVisual: String(s.email || '').trim().toLowerCase(),
            nome: String(s.nome || '').trim(),
            raw: s
        };
    }
    function mesmaSessaoVisualSincrona(snapA, snapB) {
        if (!snapA || !snapB) return false;
        if (snapA.presente !== snapB.presente) return false;
        if (!snapA.presente) return true;
        return (
            snapA.matriculaUpper === snapB.matriculaUpper &&
            snapA.uidVisual === snapB.uidVisual &&
            snapA.emailVisual === snapB.emailVisual
        );
    }
    function criarResultadoAuthCanceladoPorTrocaSessao() {
        return {
            verificando: false,
            autenticadoJwt: false,
            autorizadoLeitura: false,
            autorizadoEscrita: false,
            divergenciaIdentidade: false,
            canceladaPorTrocaSessao: true,
            motivoBloqueio: 'OPERACAO_CANCELADA_TROCA_SESSAO',
            uid: null,
            accessToken: null,
            chaveIdentidade: null,
            geracaoSessao: -1,
            emailJwt: '',
            nomeSessao: '',
            matriculaSessao: ''
        };
    }
    function contextoAuthAindaAtivo(auth, snapVisualInicial) {
        if (!auth || auth.canceladaPorTrocaSessao || !auth.autenticadoJwt || !auth.uid || !auth.chaveIdentidade) {
            return false;
        }
        if (state.chaveIdentidadeAtiva !== auth.chaveIdentidade) return false;
        if (state.geracaoSessao !== auth.geracaoSessao) return false;
        if (!state.statusAuth || state.statusAuth.uid !== auth.uid || !state.statusAuth.autorizadoLeitura) {
            return false;
        }
        const snapAtual = lerSnapshotSessaoVisualSincrono();
        if (!snapAtual.presente || snapAtual.matriculaUpper === 'TESTE') return false;
        if (snapVisualInicial && !mesmaSessaoVisualSincrona(snapVisualInicial, snapAtual)) {
            return false;
        }
        const chaveVisualAtual = `${auth.uid}|${snapAtual.emailVisual || auth.emailJwt}|${snapAtual.matriculaUpper}`;
        return chaveVisualAtual === auth.chaveIdentidade;
    }
    /**
     * Valida capacidade booleana no servidor em modo estrito (fail-closed):
     * Aceita SOMENTE boolean explícito (`true`/`false`), `{ [nomeRpc]: boolean }`
     * ou `[{ [nomeRpc]: boolean }]`. Qualquer outro formato (`{}`, `[]`, `'false'`, `null`, etc.)
     * falha fechado (`contratoValido: false, valor: false`).
     */
    async function chamarRpcBooleanaAutorizacao(nomeRpc, accessToken) {
        const baseUrl = window.SUPABASE_URL || '';
        const apiKey = window.SUPABASE_KEY || '';
        let res;
        try {
            res = await fetch(`${baseUrl}/rest/v1/rpc/${nomeRpc}`, {
                method: 'POST',
                headers: {
                    apikey: apiKey,
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
        } catch (_) {
            return { okHttp: false, status: 0, contratoValido: false, valor: false, erroRede: true };
        }
        if (!res || !res.ok) {
            return {
                okHttp: false,
                status: res ? Number(res.status || 0) : 0,
                contratoValido: false,
                valor: false,
                erroRede: false
            };
        }
        let txt;
        try {
            txt = await res.text();
        } catch (_) {
            return { okHttp: false, status: res.status, contratoValido: false, valor: false, erroRede: true };
        }
        if (typeof txt !== 'string' || !txt.trim()) {
            return { okHttp: true, status: res.status, contratoValido: false, valor: false, erroRede: false };
        }
        let parsed;
        try {
            parsed = JSON.parse(txt);
        } catch (_) {
            return { okHttp: true, status: res.status, contratoValido: false, valor: false, erroRede: false };
        }
        if (typeof parsed === 'boolean') {
            return { okHttp: true, status: res.status, contratoValido: true, valor: parsed, erroRede: false };
        }
        if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            Object.keys(parsed).length === 1 &&
            typeof parsed[nomeRpc] === 'boolean'
        ) {
            return { okHttp: true, status: res.status, contratoValido: true, valor: parsed[nomeRpc], erroRede: false };
        }
        if (
            Array.isArray(parsed) &&
            parsed.length === 1 &&
            parsed[0] !== null &&
            typeof parsed[0] === 'object' &&
            !Array.isArray(parsed[0]) &&
            Object.keys(parsed[0]).length === 1 &&
            typeof parsed[0][nomeRpc] === 'boolean'
        ) {
            return { okHttp: true, status: res.status, contratoValido: true, valor: parsed[0][nomeRpc], erroRede: false };
        }
        return { okHttp: true, status: res.status, contratoValido: false, valor: false, erroRede: false };
    }
    async function verificarSessaoEAutorizacaoModulo(opcoes) {
        const opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const geracaoAntesAwait = state.geracaoSessao;
        const chaveAntesAwait = state.chaveIdentidadeAtiva;
        state.statusAuth.verificando = true;
        if (!snapVisualInicial.presente) {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: false,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: 'SESSAO_VISUAL_AUSENTE',
                uid: null,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt: '',
                nomeSessao: '',
                matriculaSessao: ''
            };
            return state.statusAuth;
        }
        const matVisual = snapVisualInicial.matricula;
        const matVisualUpper = snapVisualInicial.matriculaUpper;
        // 1. Bloqueio incondicional da Conta Teste ANTES de ler JWT residual no navegador!
        if (matVisualUpper === 'TESTE') {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: false,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: 'CONTA_TESTE_SEM_JWT_AUTH',
                uid: null,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt: '',
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        const permitidoMenu = typeof window.moduloPermitidoPainel === 'function'
            ? window.moduloPermitidoPainel(MODULO_KEY)
            : true;
        if (!permitidoMenu) {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: false,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: 'PERFIL_SEM_PERMISSAO_MODULO',
                uid: null,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt: '',
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        // 2. Verifica sessão real no Supabase Auth (sbAuth) — proibido fallback anon
        let sessionJwt = null;
        try {
            if (window.sbAuth && window.sbAuth.auth && typeof window.sbAuth.auth.getSession === 'function') {
                const { data, error } = await window.sbAuth.auth.getSession();
                if (!error && data && data.session) {
                    sessionJwt = data.session;
                }
            }
        } catch (_) {
            sessionJwt = null;
        }
        // Se a sessão visual ou geração mudou durante o await de getSession, cancela esta operação antiga sem retornar o statusAuth do novo usuário!
        if (
            !mesmaSessaoVisualSincrona(snapVisualInicial, lerSnapshotSessaoVisualSincrono()) ||
            (chaveAntesAwait !== null && state.geracaoSessao !== geracaoAntesAwait)
        ) {
            return criarResultadoAuthCanceladoPorTrocaSessao();
        }
        if (!sessionJwt || !sessionJwt.access_token || !sessionJwt.user || !sessionJwt.user.id) {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: false,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: 'SESSAO_SUPABASE_AUTH_AUSENTE_OU_CARREGANDO',
                uid: null,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt: '',
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        // 3. Verifica expiração do token
        const agoraSeg = Math.floor(Date.now() / 1000);
        if (sessionJwt.expires_at && Number(sessionJwt.expires_at) <= agoraSeg) {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: false,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: 'SESSAO_SUPABASE_AUTH_EXPIRADA',
                uid: sessionJwt.user.id,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt: sessionJwt.user.email || '',
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        // 4. Exige correspondência inequívoca e verificável entre sessão visual e sessão Auth (sem e-mail sintético inferido)
        const uidJwt = String(sessionJwt.user.id || '').trim();
        const emailJwt = String(sessionJwt.user.email || '').trim().toLowerCase();
        const uidVisual = snapVisualInicial.uidVisual;
        const emailVisual = snapVisualInicial.emailVisual;
        const temVinculoVisualVerificavel = Boolean(uidVisual || emailVisual);
        const uidDivergente = Boolean(uidVisual && uidVisual !== uidJwt);
        const emailDivergente = Boolean(emailVisual && (!emailJwt || emailVisual !== emailJwt));
        if (!temVinculoVisualVerificavel || uidDivergente || emailDivergente) {
            sincronizarVinculoCacheIdentidade(null);
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: true,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: true,
                motivoBloqueio: 'DIVERGENCIA_IDENTIDADE_AUTH_VS_PAINEL',
                uid: uidJwt,
                chaveIdentidade: null,
                geracaoSessao: state.geracaoSessao,
                emailJwt,
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        // 5. Atrela o estado em memória à chave única de identidade autenticada
        const chaveIdentidade = `${uidJwt}|${emailJwt}|${matVisualUpper}`;
        sincronizarVinculoCacheIdentidade(chaveIdentidade);
        const geracaoNoInicio = state.geracaoSessao;
        const podeEscreverFront = typeof window.usuarioPodeGravarModulo === 'function'
            ? Boolean(window.usuarioPodeGravarModulo(MODULO_KEY))
            : false;
        // 6. Confirma capacidades diretamente no banco (evita confundir negação RLS com lista vazia e falha fechado em contrato inválido)
        const precisaConsultarCapacidade = Boolean(
            opts.revalidarCapacidadeBanco ||
            !state.capacidadeBancoCache.verificado ||
            state.capacidadeBancoCache.chaveIdentidade !== chaveIdentidade ||
            state.capacidadeBancoCache.geracaoSessao !== geracaoNoInicio
        );
        let podeLerBanco = state.capacidadeBancoCache.podeLer;
        let podeEscreverBanco = state.capacidadeBancoCache.podeEscrever;
        let motivoFalhaCapacidade = 'PERMISSAO_NEGADA_PELO_BANCO';
        if (precisaConsultarCapacidade) {
            const seqCap = ++state.seqVerificacaoCapacidade;
            const [resLeitura, resEscrita] = await Promise.all([
                chamarRpcBooleanaAutorizacao('condutores_cnh_usuario_pode_ler', sessionJwt.access_token),
                chamarRpcBooleanaAutorizacao('condutores_cnh_usuario_pode_escrever', sessionJwt.access_token)
            ]);
            // Se a sessão mudou enquanto aguardava as RPCs, NUNCA retorna o statusAuth da nova sessão para a chamada antiga!
            if (
                state.geracaoSessao !== geracaoNoInicio ||
                state.chaveIdentidadeAtiva !== chaveIdentidade ||
                !mesmaSessaoVisualSincrona(snapVisualInicial, lerSnapshotSessaoVisualSincrono())
            ) {
                return criarResultadoAuthCanceladoPorTrocaSessao();
            }
            if (
                resLeitura.status === 401 ||
                resLeitura.status === 403 ||
                resEscrita.status === 401 ||
                resEscrita.status === 403
            ) {
                podeLerBanco = false;
                podeEscreverBanco = false;
                motivoFalhaCapacidade = 'PERMISSAO_NEGADA_PELO_BANCO';
                if (seqCap === state.seqVerificacaoCapacidade) {
                    state.capacidadeBancoCache = {
                        chaveIdentidade,
                        geracaoSessao: geracaoNoInicio,
                        verificado: true,
                        podeLer: false,
                        podeEscrever: false
                    };
                }
            } else if (!resLeitura.okHttp || !resEscrita.okHttp) {
                podeLerBanco = false;
                podeEscreverBanco = false;
                motivoFalhaCapacidade = 'ERRO_VERIFICACAO_CAPACIDADE_REDE';
                if (seqCap === state.seqVerificacaoCapacidade) {
                    state.capacidadeBancoCache = {
                        chaveIdentidade,
                        geracaoSessao: geracaoNoInicio,
                        verificado: false,
                        podeLer: false,
                        podeEscrever: false
                    };
                }
            } else if (!resLeitura.contratoValido || !resEscrita.contratoValido) {
                podeLerBanco = false;
                podeEscreverBanco = false;
                motivoFalhaCapacidade = 'RESPOSTA_CAPACIDADE_CONTRATO_INVALIDO';
                if (seqCap === state.seqVerificacaoCapacidade) {
                    state.capacidadeBancoCache = {
                        chaveIdentidade,
                        geracaoSessao: geracaoNoInicio,
                        verificado: false,
                        podeLer: false,
                        podeEscrever: false
                    };
                }
            } else {
                podeLerBanco = resLeitura.valor === true;
                podeEscreverBanco = resEscrita.valor === true;
                motivoFalhaCapacidade = 'PERMISSAO_NEGADA_PELO_BANCO';
                if (seqCap === state.seqVerificacaoCapacidade) {
                    state.capacidadeBancoCache = {
                        chaveIdentidade,
                        geracaoSessao: geracaoNoInicio,
                        verificado: true,
                        podeLer: podeLerBanco,
                        podeEscrever: podeEscreverBanco
                    };
                }
            }
        }
        // Permissão de escrita NUNCA substitui verificação de leitura!
        if (!podeLerBanco) {
            limparDadosEModaisPorPerdaDeAcesso();
            state.statusAuth = {
                verificando: false,
                autenticadoJwt: true,
                autorizadoLeitura: false,
                autorizadoEscrita: false,
                divergenciaIdentidade: false,
                motivoBloqueio: motivoFalhaCapacidade,
                uid: uidJwt,
                chaveIdentidade,
                geracaoSessao: geracaoNoInicio,
                emailJwt,
                nomeSessao: snapVisualInicial.nome,
                matriculaSessao: matVisual
            };
            return state.statusAuth;
        }
        const escritaAutorizada = Boolean(podeLerBanco && podeEscreverFront && podeEscreverBanco);
        if (!escritaAutorizada && !state.salvandoModal && state.modalAtivo && state.modalAtivo !== 'HISTORICO') {
            state.modalAtivo = null;
            state.modalDados = null;
            state.erroModal = '';
            state.salvandoModal = false;
        }
        state.statusAuth = {
            verificando: false,
            autenticadoJwt: true,
            autorizadoLeitura: true,
            autorizadoEscrita: escritaAutorizada,
            divergenciaIdentidade: false,
            motivoBloqueio: '',
            uid: uidJwt,
            accessToken: sessionJwt.access_token,
            chaveIdentidade,
            geracaoSessao: geracaoNoInicio,
            emailJwt,
            nomeSessao: snapVisualInicial.nome,
            matriculaSessao: matVisual
        };
        return state.statusAuth;
    }
    // =========================================================================
    // 4. CAMADA DE PERSISTÊNCIA E COMUNICAÇÃO COM O BANCO (EXCLUSIVA)
    // =========================================================================
    async function requisitarBancoCondutores(caminhoRestOuRpc, opcoes = {}) {
        const snapVisualInicial = opcoes.snapVisualInicial || lerSnapshotSessaoVisualSincrono();
        const auth = opcoes.authConfirmada || (await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: Boolean(opcoes.exigirEscrita) }));
        if (!auth || auth.canceladaPorTrocaSessao || !contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            const err = new Error(obterMensagemBloqueioAuth(auth?.motivoBloqueio || 'OPERACAO_CANCELADA_TROCA_SESSAO'));
            err.codigoAuth = auth?.motivoBloqueio || 'OPERACAO_CANCELADA_TROCA_SESSAO';
            err.canceladaPorTrocaSessao = true;
            throw err;
        }
        if (!auth.autenticadoJwt || !auth.autorizadoLeitura || !auth.accessToken) {
            const err = new Error(obterMensagemBloqueioAuth(auth.motivoBloqueio));
            err.codigoAuth = auth.motivoBloqueio || 'NAO_AUTENTICADO';
            throw err;
        }
        if (opcoes.exigirEscrita && !auth.autorizadoEscrita) {
            const err = new Error('Seu usuário não possui permissão de escrita confirmada pelo servidor para gravar em Gestão de Condutores.');
            err.codigoAuth = 'ESCRITA_NAO_AUTORIZADA';
            throw err;
        }
        const baseUrl = window.SUPABASE_URL || '';
        const apiKey = window.SUPABASE_KEY || '';
        const metodo = opcoes.method || 'GET';
        const headers = Object.assign(
            {
                apikey: apiKey,
                Authorization: `Bearer ${auth.accessToken}`,
                'Content-Type': 'application/json'
            },
            opcoes.headers || {}
        );
        const res = await fetch(`${baseUrl}${caminhoRestOuRpc}`, {
            method: metodo,
            headers,
            body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
        });
        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            let detalhe = txt;
            try {
                const j = JSON.parse(txt);
                detalhe = j.message || j.error || j.details || txt;
            } catch (_) {
                // mantém texto
            }
            const erroHttp = new Error(`HTTP ${res.status}: ${detalhe || 'Erro na operação com o banco'}`);
            erroHttp.status = res.status;
            throw erroHttp;
        }
        const textoResp = await res.text();
        if (!textoResp) return null;
        try {
            return JSON.parse(textoResp);
        } catch (_) {
            return textoResp;
        }
    }
    function obterMensagemBloqueioAuth(codigo) {
        switch (codigo) {
            case 'SESSAO_VISUAL_AUSENTE':
                return 'Sessão não iniciada. Faça login no Painel Gerencial para acessar a Gestão de Condutores.';
            case 'PERFIL_SEM_PERMISSAO_MODULO':
                return 'Falta de permissão: seu perfil de acesso não inclui o módulo Gestão de Condutores – CNH.';
            case 'CONTA_TESTE_SEM_JWT_AUTH':
                return 'Acesso bloqueado para Conta Teste: este módulo exige login nominal autenticado com usuário e senha corporativos.';
            case 'SESSAO_SUPABASE_AUTH_AUSENTE_OU_CARREGANDO':
                return 'Credencial autenticada ausente ou sincronizando em segundo plano. Aguarde alguns segundos e clique em "Verificar sessão e tentar novamente" ou refaça o login.';
            case 'SESSAO_SUPABASE_AUTH_EXPIRADA':
                return 'Sua sessão autenticada expirou. Saia do painel e entre novamente para renovar o acesso.';
            case 'DIVERGENCIA_IDENTIDADE_AUTH_VS_PAINEL':
                return 'Bloqueio de segurança: a sessão ativa no navegador não possui correspondência verificada com o usuário autenticado. Faça logout e entre novamente.';
            case 'PERMISSAO_NEGADA_PELO_BANCO':
                return 'Acesso negado pelo controle de segurança do banco de dados: seu usuário não possui permissão ativa para consultar registros de condutores.';
            case 'ERRO_VERIFICACAO_CAPACIDADE_REDE':
                return 'Não foi possível confirmar suas permissões de acesso devido a uma falha de comunicação com o servidor. Verifique sua conexão e tente novamente.';
            case 'RESPOSTA_CAPACIDADE_CONTRATO_INVALIDO':
                return 'Bloqueio preventivo de segurança: o servidor retornou uma resposta em formato inesperado ao validar suas permissões de acesso.';
            case 'OPERACAO_CANCELADA_TROCA_SESSAO':
                return 'A operação foi cancelada porque a sessão do usuário foi alterada ou encerrada durante a verificação.';
            default:
                return 'Acesso não autorizado ao módulo Gestão de Condutores – CNH.';
        }
    }
    /**
     * Carrega todos os registros de condutores com paginação PostgREST (blocos de 1.000),
     * protegendo contra respostas atrasadas de sessão anterior.
     */
    async function carregarCondutoresDoBanco() {
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const seqReq = ++state.seqCarregamento;
        state.carregando = true;
        state.erroCarregamento = null;
        renderizarInterfaceNoContainer();
        let geracaoReq = state.geracaoSessao;
        try {
            const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
            if (auth && auth.canceladaPorTrocaSessao) return;
            geracaoReq = state.geracaoSessao;
            const uidReq = auth.uid;
            // Se outra requisição mais nova já iniciou, descarta esta
            if (seqReq !== state.seqCarregamento) return;
            if (!auth.autenticadoJwt || !auth.autorizadoLeitura) {
                limparDadosEModaisPorPerdaDeAcesso();
                renderizarInterfaceNoContainer();
                return;
            }
            const acumulados = [];
            let offset = 0;
            while (true) {
                const lote = await requisitarBancoCondutores(
                    `/rest/v1/${TABELA_CONDUTORES}?select=*&order=nome.asc,id.asc&limit=${TAMANHO_PAGINA_POSTGREST}&offset=${offset}`,
                    {
                        method: 'GET',
                        authConfirmada: auth,
                        snapVisualInicial,
                        headers: {
                            Prefer: 'count=exact',
                            'Range-Unit': 'items',
                            Range: `${offset}-${offset + TAMANHO_PAGINA_POSTGREST - 1}`
                        }
                    }
                );
                // Se a sessão/usuário ou geração mudou durante o await, descarta a resposta atrasada imediatamente!
                if (
                    seqReq !== state.seqCarregamento ||
                    geracaoReq !== state.geracaoSessao ||
                    state.statusAuth.uid !== uidReq ||
                    !contextoAuthAindaAtivo(auth, snapVisualInicial)
                ) {
                    return;
                }
                if (!Array.isArray(lote)) {
                    throw new Error('Formato de resposta inválido ao consultar o cadastro de condutores.');
                }
                for (let i = 0; i < lote.length; i++) {
                    acumulados.push(lote[i]);
                }
                if (lote.length < TAMANHO_PAGINA_POSTGREST) {
                    break;
                }
                offset += TAMANHO_PAGINA_POSTGREST;
            }
            state.condutores = acumulados;
            state.carregadoUmaVez = true;
            state.erroCarregamento = null;
        } catch (err) {
            if (err && err.canceladaPorTrocaSessao) return;
            if (seqReq !== state.seqCarregamento || geracaoReq !== state.geracaoSessao) return;
            state.erroCarregamento = err && err.message ? err.message : 'Falha desconhecida ao consultar condutores.';
        } finally {
            if (seqReq === state.seqCarregamento && geracaoReq === state.geracaoSessao) {
                state.carregando = false;
                renderizarInterfaceNoContainer();
            }
        }
    }
    /**
     * Calcula a assinatura canônica dos requisitos de uma avaliação (atividade_codigo,
     * exige_cnh, categorias_aceitas e requisitos dos treinamentos: codigo, status_aplicabilidade,
     * exige_validade), ignorando evidências individuais (data_realizacao, validade, comprovacao_ref, conferido_por/em).
     */
    function obterAssinaturaRequisitosAvaliacao(av) {
        const codigoAtiv = String(av?.atividade_codigo || '').trim().toUpperCase();
        const exigeCnh = ['SIM', 'NAO', 'INDEFINIDO'].includes(String(av?.exige_cnh || '').trim().toUpperCase())
            ? String(av.exige_cnh).trim().toUpperCase()
            : 'INDEFINIDO';
        const cats = Array.from(
            new Set(
                (Array.isArray(av?.categorias_aceitas) ? av.categorias_aceitas : [])
                    .map(c => String(c || '').trim().toUpperCase())
                    .filter(c => CATEGORIAS_CNH_VALIDAS.includes(c))
            )
        ).sort();
        const reqsTrein = (Array.isArray(av?.treinamentos) ? av.treinamentos : [])
            .map(t => ({
                codigo: String(t?.codigo || '').trim().toUpperCase(),
                status_aplicabilidade: ['OBRIGATORIO', 'NAO_APLICAVEL', 'PENDENTE_REGRA'].includes(String(t?.status_aplicabilidade || '').trim().toUpperCase())
                    ? String(t.status_aplicabilidade).trim().toUpperCase()
                    : 'PENDENTE_REGRA',
                exige_validade: ['SIM', 'NAO', 'INDEFINIDO'].includes(String(t?.exige_validade || '').trim().toUpperCase())
                    ? String(t.exige_validade).trim().toUpperCase()
                    : 'INDEFINIDO'
            }))
            .sort((a, b) => a.codigo.localeCompare(b.codigo));
        return JSON.stringify({
            atividade_codigo: codigoAtiv,
            exige_cnh: exigeCnh,
            categorias_aceitas: cats,
            requisitos_treinamentos: reqsTrein
        });
    }
    function normalizarAvaliacoesParaPersistencia(avaliacoesInput, condutorId) {
        const hojeSp = obterDataCivilSaoPauloHoje();
        const condutorAntigo = condutorId
            ? state.condutores.find(c => String(c.id) === String(condutorId))
            : null;
        const avaliacoesAntigas = Array.isArray(condutorAntigo?.avaliacoes) ? condutorAntigo.avaliacoes : [];
        return (Array.isArray(avaliacoesInput) ? avaliacoesInput : []).map(av => {
            const avaliacaoId = String(av.avaliacao_id || '').trim() || `AV_${gerarUuidV4Fallback()}`;
            const antiga = avaliacoesAntigas.find(x => String(x.avaliacao_id) === avaliacaoId);
            const atividadeCodigo = String(av.atividade_codigo || '').trim().toUpperCase();
            const atividadeNome = String(av.atividade_nome || '').trim();
            if (!atividadeCodigo || !atividadeNome) {
                throw new Error('Toda avaliação deve possuir código e nome da atividade/veículo/equipamento.');
            }
            const exigeCnh = ['SIM', 'NAO', 'INDEFINIDO'].includes(String(av.exige_cnh || '').toUpperCase())
                ? String(av.exige_cnh).toUpperCase()
                : 'INDEFINIDO';
            const categoriasAceitas = Array.from(
                new Set(
                    (Array.isArray(av.categorias_aceitas) ? av.categorias_aceitas : [])
                        .map(c => String(c || '').trim().toUpperCase())
                        .filter(c => CATEGORIAS_CNH_VALIDAS.includes(c))
                )
            );
            const treinamentosNorm = (Array.isArray(av.treinamentos) ? av.treinamentos : []).map(t => {
                const codigo = String(t.codigo || '').trim().toUpperCase();
                const nome = String(t.nome || '').trim();
                if (!codigo || !nome) {
                    throw new Error(`Treinamento na atividade "${atividadeNome}" está sem código ou nome.`);
                }
                const aplic = ['OBRIGATORIO', 'NAO_APLICAVEL', 'PENDENTE_REGRA'].includes(String(t.status_aplicabilidade || '').toUpperCase())
                    ? String(t.status_aplicabilidade).toUpperCase()
                    : 'PENDENTE_REGRA';
                const exigeVal = ['SIM', 'NAO', 'INDEFINIDO'].includes(String(t.exige_validade || '').toUpperCase())
                    ? String(t.exige_validade).toUpperCase()
                    : 'INDEFINIDO';
                const dtReal = String(t.data_realizacao || '').trim() || null;
                const dtVal = String(t.validade || '').trim() || null;
                const compRef = String(t.comprovacao_ref || '').trim() || null;
                const confPor = String(t.conferido_por || '').trim() || null;
                const confEm = String(t.conferido_em || '').trim() || null;
                if (dtReal) {
                    if (!validarDataIsoEstrita(dtReal)) {
                        throw new Error(`Data de realização inválida no treinamento "${nome}".`);
                    }
                    if (calcularDiferencaDiasCivis(dtReal, hojeSp) > 0) {
                        throw new Error(`A data de realização (${formatarDataBr(dtReal)}) do treinamento "${nome}" não pode ser futura.`);
                    }
                }
                if (dtVal && !validarDataIsoEstrita(dtVal)) {
                    throw new Error(`Data de validade inválida no treinamento "${nome}".`);
                }
                if (confEm) {
                    const confEmIso = confEm.slice(0, 10);
                    if (!validarDataIsoEstrita(confEmIso)) {
                        throw new Error(`Data de conferência inválida no treinamento "${nome}".`);
                    }
                    if (calcularDiferencaDiasCivis(confEmIso, hojeSp) > 0) {
                        throw new Error(`A data de conferência (${formatarDataBr(confEmIso)}) do treinamento "${nome}" não pode ser futura.`);
                    }
                    if (!confPor || !compRef) {
                        throw new Error(`Para informar data de conferência no treinamento "${nome}", preencha também a referência de comprovação e o responsável pela conferência.`);
                    }
                }
                return {
                    codigo,
                    nome,
                    status_aplicabilidade: aplic,
                    exige_validade: exigeVal,
                    data_realizacao: dtReal,
                    validade: dtVal,
                    comprovacao_ref: compRef,
                    conferido_por: confPor,
                    conferido_em: confEm
                };
            });
            const avCandidata = {
                avaliacao_id: avaliacaoId,
                atividade_codigo: atividadeCodigo,
                atividade_nome: atividadeNome,
                exige_cnh: exigeCnh,
                categorias_aceitas: categoriasAceitas,
                treinamentos: treinamentosNorm
            };
            const regrasHistorico = Array.isArray(antiga?.regras_historico)
                ? JSON.parse(JSON.stringify(antiga.regras_historico))
                : [];
            // Se a avaliação já existia e os requisitos (incluindo treinamentos) não mudaram,
            // preserva a aprovação e versão já registradas (alterar evidência individual não revoga regra).
            if (antiga) {
                const assinaturaIgual =
                    obterAssinaturaRequisitosAvaliacao(avCandidata) === obterAssinaturaRequisitosAvaliacao(antiga);
                if (assinaturaIgual) {
                    return {
                        ...avCandidata,
                        regra_aprovada: Boolean(antiga.regra_aprovada === true),
                        regra_versao: antiga.regra_versao || null,
                        regra_aprovada_por_uid: antiga.regra_aprovada_por_uid || null,
                        regra_aprovada_por_nome: antiga.regra_aprovada_por_nome || null,
                        regra_aprovada_em: antiga.regra_aprovada_em || null,
                        regras_historico: regrasHistorico
                    };
                }
                // Se os requisitos mudaram, arquiva os requisitos anteriores no histórico e marca a nova regra como pendente
                regrasHistorico.push({
                    regra_versao: antiga.regra_versao || 'NAO_APROVADA',
                    regra_aprovada: Boolean(antiga.regra_aprovada === true),
                    regra_aprovada_por_uid: antiga.regra_aprovada_por_uid || null,
                    regra_aprovada_por_nome: antiga.regra_aprovada_por_nome || null,
                    regra_aprovada_em: antiga.regra_aprovada_em || null,
                    exige_cnh: antiga.exige_cnh || 'INDEFINIDO',
                    categorias_aceitas: Array.isArray(antiga.categorias_aceitas) ? antiga.categorias_aceitas : [],
                    arquivada_em: new Date().toISOString()
                });
            }
            // O servidor reconhece os modelos oficiais; o cliente nunca aprova regras por conta própria.
            return {
                ...avCandidata,
                regra_aprovada: false,
                regra_versao: null,
                regra_aprovada_por_uid: null,
                regra_aprovada_por_nome: null,
                regra_aprovada_em: null,
                regras_historico: regrasHistorico
            };
        });
    }
    function registrarDescarteResultadoSessaoAnterior(operacao, linhaSalva, auth) {
        const orientacao = 'Gravação confirmada no servidor para a sessão anterior; aplicação local descartada porque a sessão mudou. Recarregue o módulo na sessão adequada.';
        state.ultimoResultadoDescartadoSessaoAnterior = {
            operacao,
            id: linhaSalva && linhaSalva.id ? linhaSalva.id : null,
            uidOrigem: auth && auth.uid ? auth.uid : null,
            chaveIdentidadeOrigem: auth && auth.chaveIdentidade ? auth.chaveIdentidade : null,
            descartadoEm: new Date().toISOString(),
            orientacao
        };
        if (linhaSalva && typeof linhaSalva === 'object') {
            Object.defineProperty(linhaSalva, '__descartadoPorTrocaSessao', {
                value: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(linhaSalva, '__orientacaoSessao', {
                value: orientacao,
                enumerable: false,
                configurable: true
            });
        }
        return linhaSalva;
    }
    async function persistirCadastroOuEdicaoCondutor(payloadModal) {
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
        if (auth && auth.canceladaPorTrocaSessao) {
            const errCancel = new Error(obterMensagemBloqueioAuth('OPERACAO_CANCELADA_TROCA_SESSAO'));
            errCancel.canceladaPorTrocaSessao = true;
            throw errCancel;
        }
        if (!auth.autenticadoJwt || !auth.autorizadoEscrita || !contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            throw new Error('Seu usuário não possui permissão de escrita verificada para gravar em Gestão de Condutores.');
        }
        const nome = String(payloadModal.nome || '').trim();
        const vinculo = String(payloadModal.vinculo || '').trim().toUpperCase();
        if (payloadModal.efetivo_id && vinculo !== 'PROPRIO') throw new Error('Remova o vínculo confirmado com o Efetivo antes de mudar para Terceiro/PJ.');
        const empresa = String(payloadModal.empresa || '').trim();
        const funcao = String(payloadModal.funcao || '').trim();
        const setorFrente = String(payloadModal.setor_frente || '').trim();
        const observacoes = String(payloadModal.observacoes || '').trim();
        const cnhCategoria = String(payloadModal.cnh_categoria || '').trim().toUpperCase() || null;
        const cnhValidade = cnhCategoria && cnhCategoria !== 'NAO_POSSUI'
            ? (String(payloadModal.cnh_validade || '').trim() || null)
            : null;
        const modoAlteracaoCnh = String(payloadModal.modo_alteracao_cnh || 'MANTIDO').trim().toUpperCase();
        const justificativaAlteracaoCnh = String(payloadModal.justificativa_alteracao_cnh || '').trim();
        const antecedenciaDias = Number(payloadModal.antecedencia_alerta_dias || 30);
        if (nome.length < 3) throw new Error('Informe o nome completo do condutor (mínimo 3 caracteres).');
        if (!VINCULOS_VALIDOS.includes(vinculo)) throw new Error('Selecione um vínculo válido (Próprio, Terceiro ou PJ).');
        if (!empresa) throw new Error('Informe a empresa do condutor.');
        if (!funcao) throw new Error('Informe a função/cargo do condutor.');
        if (!setorFrente) throw new Error('Informe o setor ou frente de serviço.');
        if (!Number.isInteger(antecedenciaDias) || antecedenciaDias < 1 || antecedenciaDias > 180) {
            throw new Error('A antecedência de alerta deve ser um número inteiro entre 1 e 180 dias.');
        }
        if (cnhCategoria && cnhCategoria !== 'NAO_POSSUI' && !CATEGORIAS_CNH_VALIDAS.includes(cnhCategoria)) {
            throw new Error('Categoria de CNH inválida.');
        }
        if (cnhValidade && !validarDataIsoEstrita(cnhValidade)) {
            throw new Error('Data de validade da CNH inválida. Use o formato YYYY-MM-DD.');
        }
        if (cnhValidade && (!cnhCategoria || cnhCategoria === 'NAO_POSSUI')) {
            throw new Error('Para informar data de validade da CNH, selecione uma categoria válida.');
        }
        if (payloadModal.id) {
            const registroAnterior = state.condutores.find(c => String(c.id) === String(payloadModal.id));
            const valAnterior = registroAnterior?.cnh_validade || null;
            if (valAnterior && cnhValidade && valAnterior !== cnhValidade) {
                if (modoAlteracaoCnh !== 'RENOVACAO' && modoAlteracaoCnh !== 'CORRECAO_DATA') {
                    throw new Error('Ao alterar a data de validade da CNH existente, selecione explicitamente se é uma RENOVAÇÃO (novo ciclo) ou CORREÇÃO DE DATA.');
                }
                if (modoAlteracaoCnh === 'CORRECAO_DATA' && justificativaAlteracaoCnh.length < 3) {
                    throw new Error('Para corrigir a data de validade mantendo o ciclo atual, informe a justificativa da correção.');
                }
            }
        }
        const avaliacoesNormalizadas = normalizarAvaliacoesParaPersistencia(
            payloadModal.avaliacoes || [],
            payloadModal.id
        );
        const rpcBody = {
            p_id: payloadModal.id || null,
            p_versao_esperada: payloadModal.id ? Number(payloadModal.versao_esperada) : null,
            p_nome: nome,
            p_vinculo: vinculo,
            p_empresa: empresa,
            p_funcao: funcao,
            p_setor_frente: setorFrente,
            p_observacoes: observacoes || null,
            p_cnh_categoria: cnhCategoria,
            p_cnh_validade: cnhValidade,
            p_modo_alteracao_cnh: modoAlteracaoCnh,
            p_justificativa_alteracao_cnh: justificativaAlteracaoCnh || null,
            p_antecedencia_alerta_dias: antecedenciaDias,
            p_avaliacoes: avaliacoesNormalizadas
        };
        const salvo = await requisitarBancoCondutores('/rest/v1/rpc/salvar_condutor_cnh_atomico', {
            method: 'POST',
            authConfirmada: auth,
            snapVisualInicial,
            exigirEscrita: true,
            body: rpcBody
        });
        const linhaSalva = Array.isArray(salvo) ? salvo[0] : salvo;
        if (!linhaSalva || !linhaSalva.id) {
            throw new Error('O banco não confirmou o registro salvo.');
        }
        if (!contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            return registrarDescarteResultadoSessaoAnterior('CADASTRO_EDICAO', linhaSalva, auth);
        }
        atualizarRegistroEmMemoria(linhaSalva, auth, snapVisualInicial);
        return linhaSalva;
    }
    async function persistirAlteracaoStatusCondutor(condutorId, versaoEsperada, novoAtivo, motivo) {
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
        if (auth && auth.canceladaPorTrocaSessao) {
            const errCancel = new Error(obterMensagemBloqueioAuth('OPERACAO_CANCELADA_TROCA_SESSAO'));
            errCancel.canceladaPorTrocaSessao = true;
            throw errCancel;
        }
        if (!auth.autenticadoJwt || !auth.autorizadoEscrita || !contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            throw new Error('Seu usuário não possui permissão de escrita verificada para alterar status de condutores.');
        }
        const motivoLimpo = String(motivo || '').trim();
        if (!novoAtivo && motivoLimpo.length < 3) {
            throw new Error('Informe o motivo da inativação (mínimo 3 caracteres).');
        }
        const salvo = await requisitarBancoCondutores('/rest/v1/rpc/alterar_status_condutor_cnh_atomico', {
            method: 'POST',
            authConfirmada: auth,
            snapVisualInicial,
            exigirEscrita: true,
            body: {
                p_condutor_id: condutorId,
                p_versao_esperada: Number(versaoEsperada),
                p_novo_ativo: Boolean(novoAtivo),
                p_motivo: motivoLimpo || null
            }
        });
        const linhaSalva = Array.isArray(salvo) ? salvo[0] : salvo;
        if (!linhaSalva || !linhaSalva.id) {
            throw new Error('O banco não confirmou a alteração de status do condutor.');
        }
        if (!contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            return registrarDescarteResultadoSessaoAnterior('ALTERACAO_STATUS', linhaSalva, auth);
        }
        atualizarRegistroEmMemoria(linhaSalva, auth, snapVisualInicial);
        return linhaSalva;
    }
    async function persistirComunicacaoExplicita(dadosCom) {
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
        if (auth && auth.canceladaPorTrocaSessao) {
            const errCancel = new Error(obterMensagemBloqueioAuth('OPERACAO_CANCELADA_TROCA_SESSAO'));
            errCancel.canceladaPorTrocaSessao = true;
            throw errCancel;
        }
        if (!auth.autenticadoJwt || !auth.autorizadoEscrita || !contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            throw new Error('Seu usuário não possui permissão de escrita verificada para registrar comunicações.');
        }
        const canal = String(dadosCom.canal || '').trim().toUpperCase();
        const motivo = String(dadosCom.motivo || '').trim();
        const cicloId = String(dadosCom.cnh_ciclo_id_esperado || '').trim();
        const vencimentoData = String(dadosCom.vencimento_comunicado || '').trim();
        const permitirHistorico = Boolean(dadosCom.permitir_ciclo_historico);
        if (!CANAIS_COMUNICACAO.some(c => c.codigo === canal)) {
            throw new Error('Selecione um canal de comunicação válido.');
        }
        if (motivo.length < 3) {
            throw new Error('Descreva o motivo/orientação registrada (mínimo 3 caracteres).');
        }
        if (!cicloId || !validarDataIsoEstrita(vencimentoData)) {
            throw new Error('Ciclo de validade da CNH ou data de vencimento inválidos.');
        }
        const salvo = await requisitarBancoCondutores('/rest/v1/rpc/registrar_comunicacao_cnh_atomica', {
            method: 'POST',
            authConfirmada: auth,
            snapVisualInicial,
            exigirEscrita: true,
            body: {
                p_condutor_id: dadosCom.condutor_id,
                p_cnh_ciclo_id_esperado: cicloId,
                p_vencimento_comunicado: vencimentoData,
                p_canal: canal,
                p_motivo: motivo,
                p_permitir_ciclo_historico: permitirHistorico
            }
        });
        const linhaSalva = Array.isArray(salvo) ? salvo[0] : salvo;
        if (!linhaSalva || !linhaSalva.id) {
            throw new Error('O banco não confirmou o registro da comunicação.');
        }
        if (!contextoAuthAindaAtivo(auth, snapVisualInicial)) {
            return registrarDescarteResultadoSessaoAnterior('REGISTRO_COMUNICACAO', linhaSalva, auth);
        }
        atualizarRegistroEmMemoria(linhaSalva, auth, snapVisualInicial);
        return linhaSalva;
    }
    function atualizarRegistroEmMemoria(linhaSalva, authContext, snapVisualInicial) {
        if (!contextoAuthAindaAtivo(authContext, snapVisualInicial)) {
            return false;
        }
        const idx = state.condutores.findIndex(c => String(c.id) === String(linhaSalva.id));
        if (idx >= 0) {
            state.condutores[idx] = linhaSalva;
        } else {
            state.condutores.push(linhaSalva);
        }
        state.condutores.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
        return true;
    }
    // =========================================================================
    // 5. CÁLCULO DE INDICADORES (KPIS) E FILTROS
    // =========================================================================
    function calcularIndicadoresGerais(avaliadosCompletos) {
        const idsAtivosDistintos = new Set();
        let cnhsAVencerIncluiHoje = 0;
        let cnhsVencidas = 0;
        let comunicacoesPendentes = 0;
        let decisoesReavisoPendentes = 0;
        for (let i = 0; i < avaliadosCompletos.length; i++) {
            const item = avaliadosCompletos[i];
            const c = item.condutor;
            if (!c || c.ativo === false) continue;
            const chaveDistinta = String(c.id || c.nome || '').trim();
            if (chaveDistinta) idsAtivosDistintos.add(chaveDistinta);
            if (item.situacaoCnh.vencida) {
                cnhsVencidas++;
            } else if (item.situacaoCnh.venceHoje || item.situacaoCnh.aVencer) {
                cnhsAVencerIncluiHoje++;
            }
            if (item.alertaCom.comunicacaoPendente) {
                comunicacoesPendentes++;
            }
            if (item.alertaCom.decisaoPendenteReavisoVencida) {
                decisoesReavisoPendentes++;
            }
        }
        return {
            condutoresDistintosAtivos: idsAtivosDistintos.size,
            cnhsAVencerIncluiHoje,
            cnhsVencidas,
            comunicacoesPendentes,
            decisoesReavisoPendentes
        };
    }
    async function carregarFontesResumo() {
        const requisicao = ++state.requisicaoResumo;
        const geracao = state.geracaoSessao;
        const identidade = state.chaveIdentidadeAtiva;
        const sessaoVisual = lerSnapshotSessaoVisualSincrono();
        state.fontesResumo = { efetivo: [], catalogo: [], status: 'CARREGANDO', falhas: [] };
        const consultar = async (tabela, consulta) => {
            if (typeof window.supabaseFetch !== 'function') throw new Error('Leitor indisponível');
            const dados = await window.supabaseFetch(tabela, consulta);
            if (!Array.isArray(dados)) throw new Error('Resposta inválida');
            return dados;
        };
        const resultados = await Promise.allSettled([
            consultar('colaboradores_efetivo', '?select=id,nome,funcao,setor,responsavel,status,dt_admissao,dt_demissao&order=nome.asc'),
            consultar('configuracoes_sistema', '?id=eq.efetivo_frentes_catalogo&select=valor&limit=1').then(dados => {
                if (!dados.length) return [];
                if (!Array.isArray(dados[0].valor)) throw new Error('Catálogo inválido');
                return dados[0].valor;
            })
        ]);
        if (requisicao !== state.requisicaoResumo || geracao !== state.geracaoSessao || identidade !== state.chaveIdentidadeAtiva ||
            !mesmaSessaoVisualSincrona(sessaoVisual, lerSnapshotSessaoVisualSincrono())) return false;
        const falhas = [];
        if (resultados[0].status === 'rejected') falhas.push('Efetivo');
        if (resultados[1].status === 'rejected') falhas.push('catálogo de frentes');
        state.fontesResumo = {
            efetivo: resultados[0].status === 'fulfilled' ? resultados[0].value : [],
            catalogo: resultados[1].status === 'fulfilled' ? resultados[1].value : [],
            status: falhas.length ? 'INCOMPLETA' : 'PRONTA',
            falhas
        };
        return true;
    }
    function obterVinculoEfetivo(c) {
        if (c.vinculo !== 'PROPRIO' || !c.efetivo_id) return null;
        return state.fontesResumo.efetivo.find(p => String(p.id) === String(c.efetivo_id)) || null;
    }
    function obterFrenteCondutor(c) {
        if (c.vinculo !== 'PROPRIO' || !c.efetivo_id) return String(c.setor_frente || 'Não informado').trim();
        const pessoa = obterVinculoEfetivo(c);
        if (!pessoa || !colaboradorDaBaseEstaAtivo(pessoa)) return 'Vínculo com Efetivo pendente de revisão';
        return String(pessoa.responsavel || pessoa.setor || 'Frente não informada no Efetivo').trim();
    }
    function calcularProntidaoPorFrente(avaliadosCompletos) {
        const mapaFrentes = new Map();

        function obterOuCriarFrente(nomeFrenteRaw) {
            const nomeFrente = String(nomeFrenteRaw || '').trim();
            if (!nomeFrente) return null;
            const chaveFrente = nomeFrente.toUpperCase();
            if (!mapaFrentes.has(chaveFrente)) {
                mapaFrentes.set(chaveFrente, {
                    chave: chaveFrente,
                    nome: nomeFrente,
                    totalCondutores: 0,
                    condutoresAtivos: 0,
                    condutoresAptos: 0,
                    condutoresAptosProprios: 0,
                    condutoresAptosTerceiros: 0,
                    cnhsVencendo: 0,
                    cnhsVencidas: 0,
                    condutoresPendentesOuInaptos: 0,
                    condutoresAptosLista: [],
                    todosCondutoresLista: [],
                    totalEfetivoObra: null,
                    percentualCobertura: null
                });
            }
            return mapaFrentes.get(chaveFrente);
        }

        // 1. Catálogo consultado pelo módulo, inclusive frentes sem condutores.
        if (Array.isArray(state.fontesResumo.catalogo)) {
            for (let cIdx = 0; cIdx < state.fontesResumo.catalogo.length; cIdx++) {
                const fCat = state.fontesResumo.catalogo[cIdx];
                if (!fCat || fCat.excluida === true || fCat.ativo === false) continue;
                const nomeCat = typeof fCat === 'string' ? fCat : (fCat.nome || '');
                obterOuCriarFrente(nomeCat);
            }
        }

        // 2. Efetivo consultado pelo módulo (responsavel como frente de trabalho).
        const efetivoPorFrente = {};
        if (Array.isArray(state.fontesResumo.efetivo)) {
            for (let j = 0; j < state.fontesResumo.efetivo.length; j++) {
                const colab = state.fontesResumo.efetivo[j];
                const ehAtivo = typeof window.colaboradorEstaAtivo === 'function'
                    ? window.colaboradorEstaAtivo(colab)
                    : (String(colab.status || '').toUpperCase() === 'ATIVO' && !colab.dt_demissao);
                if (!ehAtivo) continue;
                const fColab = String(colab.responsavel || colab.setor || '').trim();
                if (fColab) {
                    obterOuCriarFrente(fColab);
                    const chaveF = fColab.toUpperCase();
                    efetivoPorFrente[chaveF] = (efetivoPorFrente[chaveF] || 0) + 1;
                }
            }
        }

        // 3. Mapeia condutores cadastrados para suas frentes
        const listaAvaliados = Array.isArray(avaliadosCompletos) ? avaliadosCompletos : [];
        for (let i = 0; i < listaAvaliados.length; i++) {
            const item = listaAvaliados[i];
            const c = item.condutor;
            if (!c) continue;
            const nomeFrente = obterFrenteCondutor(c);
            const frente = obterOuCriarFrente(nomeFrente);
            if (!frente) continue;

            frente.totalCondutores++;
            const ativo = c.ativo !== false;
            if (ativo) {
                frente.condutoresAtivos++;
                const cnhVencida = Boolean(item.situacaoCnh && item.situacaoCnh.vencida);
                const cnhAlerta = Boolean(item.situacaoCnh && (item.situacaoCnh.venceHoje || item.situacaoCnh.aVencer));
                if (cnhVencida) {
                    frente.cnhsVencidas++;
                } else if (cnhAlerta) {
                    frente.cnhsVencendo++;
                }

                const atividadesAptas = Array.isArray(item.avaliacoesCalculadas)
                    ? item.avaliacoesCalculadas
                        .filter(av => av.statusPrioritario === 'APTO')
                        .map(av => av.atividadeNome)
                    : [];
                const pessoaVinculada = obterVinculoEfetivo(c);
                const vinculoRegular = !c.efetivo_id || (pessoaVinculada && colaboradorDaBaseEstaAtivo(pessoaVinculada));
                const ehApto = Boolean(vinculoRegular && !cnhVencida && atividadesAptas.length > 0);

                const vinculoUpper = String(c.vinculo || 'PROPRIO').toUpperCase();
                if (ehApto) {
                    frente.condutoresAptos++;
                    if (vinculoUpper === 'PROPRIO') {
                        frente.condutoresAptosProprios++;
                    } else {
                        frente.condutoresAptosTerceiros++;
                    }
                } else {
                    frente.condutoresPendentesOuInaptos++;
                }

                const infoCondutor = {
                    id: c.id,
                    nome: c.nome,
                    funcao: c.funcao,
                    empresa: c.empresa,
                    vinculo: c.vinculo,
                    cnhCategoria: c.cnh_categoria || 'N/D',
                    cnhValidade: c.cnh_validade,
                    ehApto,
                    cnhAlerta,
                    cnhVencida,
                    statusCnh: (item.situacaoCnh && item.situacaoCnh.statusLabel) || '',
                    atividadesAptas
                };
                if (ehApto) {
                    frente.condutoresAptosLista.push(infoCondutor);
                }
                frente.todosCondutoresLista.push(infoCondutor);
            }
        }

        // 4. Contagem separada do Efetivo, sem inferir vínculo individual.
        const lista = Array.from(mapaFrentes.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        for (let k = 0; k < lista.length; k++) {
            const f = lista[k];
            f.totalEfetivoObra = typeof efetivoPorFrente[f.chave] === 'number' ? efetivoPorFrente[f.chave] : null;
            // Sem vínculo individual confirmado, as contagens não formam um percentual.
            f.percentualCobertura = null;
        }
        return lista;
    }
    function filtrarAvaliados(avaliadosCompletos) {
        const f = state.filtros;
        const termo = String(f.buscaNome || '').trim().toLowerCase();
        return avaliadosCompletos.filter(item => {
            const c = item.condutor;
            if (!f.incluirInativos && c.ativo === false) return false;
            if (termo && !String(c.nome || '').toLowerCase().includes(termo)) {
                return false;
            }
            if (f.setorFrente && f.setorFrente !== 'TODOS') {
                const sf = obterFrenteCondutor(c).toUpperCase();
                if (sf !== f.setorFrente.toUpperCase()) return false;
            }
            if (f.empresa !== 'TODAS' && String(c.empresa || '').toUpperCase() !== f.empresa.toUpperCase()) {
                return false;
            }
            if (f.vinculo !== 'TODOS' && String(c.vinculo || '').toUpperCase() !== f.vinculo.toUpperCase()) {
                return false;
            }
            // Casamento estrito: quando atividade E aptidão são filtradas, a MESMA avaliação deve atender ambos os critérios!
            if (f.atividade !== 'TODAS' && f.aptidao !== 'TODAS') {
                const temCasado = item.avaliacoesCalculadas.some(
                    av =>
                        (av.atividadeCodigo.toUpperCase() === f.atividade.toUpperCase() ||
                         av.atividadeNome.toUpperCase() === f.atividade.toUpperCase()) &&
                        av.statusPrioritario === f.aptidao
                );
                if (!temCasado) return false;
            } else if (f.atividade !== 'TODAS') {
                const temAtiv = item.avaliacoesCalculadas.some(
                    av =>
                        av.atividadeCodigo.toUpperCase() === f.atividade.toUpperCase() ||
                        av.atividadeNome.toUpperCase() === f.atividade.toUpperCase()
                );
                if (!temAtiv) return false;
            } else if (f.aptidao !== 'TODAS') {
                const temApt = item.avaliacoesCalculadas.some(av => av.statusPrioritario === f.aptidao);
                if (!temApt) return false;
            }
            if (f.vencimento !== 'TODOS') {
                const stCnh = item.situacaoCnh.statusCodigo;
                if (f.vencimento === 'VENCIDA' && !item.situacaoCnh.vencida) return false;
                if (f.vencimento === 'VENCE_HOJE' && !item.situacaoCnh.venceHoje) return false;
                if (f.vencimento === 'A_VENCER_INCLUI_HOJE' && !(item.situacaoCnh.aVencer || item.situacaoCnh.venceHoje)) return false;
                if (f.vencimento === 'FORA_DA_JANELA' && stCnh !== 'FORA_DA_JANELA') return false;
                if (f.vencimento === 'AUSENTE' && stCnh !== 'AUSENTE' && stCnh !== 'VALIDADE_AUSENTE') return false;
                if (f.vencimento === 'COMUNICACAO_PENDENTE' && !item.alertaCom.comunicacaoPendente) return false;
            }
            return true;
        });
    }
    // =========================================================================
    // 6. RENDERIZAÇÃO DOM E MODAIS (COM ATUALIZAÇÃO LOCALIZADA QUE PRESERVA FOCO)
    // =========================================================================
    function obterContainerModulo() {
        if (typeof document === 'undefined') return null;
        return document.getElementById(CONTAINER_ID);
    }
    function renderizarBadgeStatusAtividade(statusPrioritario, statusLabel) {
        let corBorda = 'var(--border)';
        let corTexto = 'var(--text)';
        let icone = 'ℹ️';
        if (statusPrioritario === 'INATIVO') {
            corBorda = 'var(--text-light)';
            corTexto = 'var(--text-light)';
            icone = '⏸️';
        } else if (statusPrioritario === 'INAPTO') {
            corBorda = 'var(--danger)';
            corTexto = 'var(--danger)';
            icone = '⛔';
        } else if (statusPrioritario === 'PENDENTE') {
            corBorda = 'var(--warning)';
            corTexto = 'var(--warning)';
            icone = '⚠️';
        } else if (statusPrioritario === 'APTO') {
            corBorda = 'var(--success)';
            corTexto = 'var(--success)';
            icone = '✅';
        }
        return `<span class="cond-badge-status" data-status="${escaparHtml(statusPrioritario)}" style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; font-size:11.5px; font-weight:700; border:1.5px solid ${corBorda}; color:${corTexto}; background:var(--bg);">${icone} <span>Status: ${escaparHtml(statusLabel)}</span></span>`;
    }
    function renderizarBannerDecisaoPendenteHtml() {
        return '<div style="margin-bottom:12px; padding:12px 14px; border-radius:12px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:12px;">Ao vencer a CNH, é necessário registrar um novo aviso ao condutor. O aviso anterior permanece no histórico.</div>';
    }

    /**
     * Atualiza apenas a lista de condutores e os KPIs sem recriar os campos de filtro,
     * preservando integralmente o foco e a seleção de cursor durante a digitação.
     */
    function atualizarCardsProntidaoNoDom() {
        const container = obterContainerModulo();
        if (!container) return;
        const cardsEl = typeof container.querySelector === 'function'
            ? container.querySelector('#condProntidaoCardsLista')
            : (typeof document !== 'undefined' ? document.getElementById('condProntidaoCardsLista') : null);
        if (!cardsEl) return;
        const refHoje = state.ultimaDataCivilSpRenderizada || obterDataCivilSaoPauloHoje();
        const avaliadosCompletos = state.condutores.map(c => avaliarCondutorCompleto(c, refHoje));
        const prontidaoLista = calcularProntidaoPorFrente(avaliadosCompletos);
        const termoBusca = String(state.buscaFrenteProntidao || '').trim().toLowerCase();
        const listaExibicao = termoBusca
            ? prontidaoLista.filter(f => f.nome.toLowerCase().includes(termoBusca) || (f.condutoresAptosLista && f.condutoresAptosLista.some(c => c.nome.toLowerCase().includes(termoBusca))))
            : prontidaoLista;
        cardsEl.innerHTML = renderizarCardsProntidaoListaHtml(listaExibicao, state.filtros.setorFrente, termoBusca);
        const countEl = typeof container.querySelector === 'function'
            ? container.querySelector('#condProntidaoCountLabel')
            : (typeof document !== 'undefined' ? document.getElementById('condProntidaoCountLabel') : null);
        if (countEl) {
            countEl.innerHTML = `Mostrando <strong>${listaExibicao.length}</strong> de <strong>${prontidaoLista.length}</strong> frentes da obra`;
        }
    }
    function atualizarListaEKpisParcialNoDom() {
        const container = obterContainerModulo();
        if (!container) return;
        const listaEl = typeof container.querySelector === 'function'
            ? container.querySelector('#condutoresListaContainer')
            : (typeof document !== 'undefined' ? document.getElementById('condutoresListaContainer') : null);
        if (!listaEl) {
            renderizarInterfaceNoContainer();
            return;
        }
        const refHoje = obterDataCivilSaoPauloHoje();
        state.ultimaDataCivilSpRenderizada = refHoje;
        const auth = state.statusAuth;
        const avaliadosCompletos = state.condutores.map(c => avaliarCondutorCompleto(c, refHoje));
        const kpis = calcularIndicadoresGerais(avaliadosCompletos);
        const filtrados = filtrarAvaliados(avaliadosCompletos);
        listaEl.innerHTML = renderizarListaCondutoresHtml(filtrados, auth.autorizadoEscrita);
        const buscarEl = function (id) {
            if (typeof container.querySelector === 'function') {
                const achado = container.querySelector(`#${id}`);
                if (achado) return achado;
            }
            return typeof document !== 'undefined' ? document.getElementById(id) : null;
        };
        const elAtivos = buscarEl('kpiCondutoresAtivosDistintos');
        if (elAtivos) elAtivos.textContent = String(kpis.condutoresDistintosAtivos);
        const elAVencer = buscarEl('kpiCnhsAVencer');
        if (elAVencer) elAVencer.textContent = String(kpis.cnhsAVencerIncluiHoje);
        const elVencidas = buscarEl('kpiCnhsVencidas');
        if (elVencidas) elVencidas.textContent = String(kpis.cnhsVencidas);
        const elComPend = buscarEl('kpiComunicacoesPendentes');
        if (elComPend) {
            elComPend.textContent = String(kpis.comunicacoesPendentes);
            elComPend.style.color = kpis.comunicacoesPendentes > 0 ? 'var(--danger)' : 'var(--success)';
        }
        const elSlotDecisao = buscarEl('condSlotBannerDecisaoJoao');
        if (elSlotDecisao) {
            elSlotDecisao.innerHTML = renderizarBannerDecisaoPendenteHtml(kpis.decisoesReavisoPendentes);
        }
        const elCountCond = buscarEl('condListagemCountLabel');
        if (elCountCond) {
            elCountCond.innerHTML = `Mostrando <strong>${filtrados.length}</strong> de <strong>${state.condutores.length}</strong> condutores cadastrados`;
        }
        const elSlotProntidao = buscarEl('condSlotProntidaoEquipes');
        if (elSlotProntidao) {
            atualizarCardsProntidaoNoDom();
        }
        const elDataRef = buscarEl('condDataRefLabel');
        if (elDataRef) {
            elDataRef.textContent = `${formatarDataBr(refHoje)} (${refHoje})`;
        }
    }
    function renderizarCardsProntidaoListaHtml(listaExibicao, frenteFiltradaAtual, termoBusca) {
        if (!listaExibicao || listaExibicao.length === 0) {
            return `<div style="padding:24px; text-align:center; color:var(--text-light); font-size:13px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                ${termoBusca ? `Nenhuma frente encontrada para a busca "<strong>${escaparHtml(termoBusca)}</strong>".` : 'Nenhuma frente cadastrada.'}
            </div>`;
        }
        return listaExibicao.map(f => {
            const estaSelecionada = frenteFiltradaAtual && frenteFiltradaAtual !== 'TODOS' && frenteFiltradaAtual.toUpperCase() === f.chave;
            const bordaCard = estaSelecionada ? '2px solid var(--primary, #0288d1)' : '1px solid var(--border)';
            const fundoCard = estaSelecionada ? 'rgba(2, 136, 209, 0.05)' : 'var(--bg)';

            let statusBadge = '';
            if (f.condutoresAptos === 0) {
                statusBadge = `<span style="font-size:11px; font-weight:700; color:var(--danger); background:rgba(211,47,47,0.12); padding:3px 7px; border-radius:6px;">⛔ Sem Condutor Apto</span>`;
            } else if (f.cnhsVencendo > 0) {
                statusBadge = `<span style="font-size:11px; font-weight:700; color:var(--warning); background:rgba(237,108,2,0.12); padding:3px 7px; border-radius:6px;">⚠️ ${f.condutoresAptos} Apto(s) · ${f.cnhsVencendo} vencendo</span>`;
            } else {
                statusBadge = `<span style="font-size:11px; font-weight:700; color:var(--success); background:rgba(46,125,50,0.12); padding:3px 7px; border-radius:6px;">✅ ${f.condutoresAptos} Apto(s)</span>`;
            }

            const nomesAptosHtml = f.condutoresAptosLista.length > 0
                ? f.condutoresAptosLista.map(c => {
                    const alertaCnhTag = c.cnhAlerta ? ' ⚠️' : '';
                    const ativTooltip = c.atividadesAptas.length > 0 ? ` (${c.atividadesAptas.join(', ')})` : '';
                    return `<span title="CNH Cat. ${escaparHtml(c.cnhCategoria)} · Validade: ${escaparHtml(formatarDataBr(c.cnhValidade))}${escaparHtml(ativTooltip)}" style="display:inline-block; font-size:11.5px; padding:3px 8px; margin:2px; border-radius:6px; background:var(--card); border:1px solid var(--border); color:var(--text);">
                        👤 <strong>${escaparHtml(c.nome)}</strong> <span style="font-size:10.5px; color:var(--text-light); font-weight:600;">[Cat. ${escaparHtml(c.cnhCategoria)}${alertaCnhTag}]</span>
                    </span>`;
                }).join(' ')
                : `<span style="font-size:11.5px; color:var(--text-light); font-style:italic;">Nenhum condutor com requisitos documentais em dia nesta frente.</span>`;

            // Detalhe de composição (próprios vs terceiros) e efetivo próprio sem misturar populações
            let composicaoDet = `Condutores cadastrados: <strong>${f.condutoresAtivos}</strong>`;
            if (f.condutoresAptos > 0) {
                const partesComp = [];
                if (f.condutoresAptosProprios > 0) partesComp.push(`${f.condutoresAptosProprios} próprio(s)`);
                if (f.condutoresAptosTerceiros > 0) partesComp.push(`${f.condutoresAptosTerceiros} terceiro(s)`);
                composicaoDet += ` · Aptos: <strong>${f.condutoresAptos}</strong> (${partesComp.join(', ')})`;
            }
            if (f.totalEfetivoObra !== null) {
                composicaoDet += ` · Efetivo COP: <strong>${f.totalEfetivoObra}</strong>`;
            }

            return `
                <div style="background:${fundoCard}; border:${bordaCard}; border-radius:8px; padding:12px; margin-bottom:10px;">
                    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                        <div>
                            <strong style="font-size:13.5px; color:var(--text);">📍 ${escaparHtml(f.nome)}</strong>
                            <span style="font-size:11.5px; color:var(--text-light); margin-left:6px;">
                                (${composicaoDet})
                            </span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${statusBadge}
                            ${estaSelecionada
                                ? `<button type="button" class="db-clear-btn" data-cond-action="limpar-filtro-frente" style="padding:4px 9px; font-size:11.5px;">✕ Limpar Filtro</button>`
                                : `<button type="button" class="db-apply-btn" data-cond-action="filtrar-frente" data-cond-frente="${escaparHtml(f.nome)}" style="padding:4px 10px; font-size:11.5px;">🔍 Ver Condutores no Cadastro</button>`
                            }
                        </div>
                    </div>
                    <div style="margin-top:4px;">
                        <div style="font-size:11px; font-weight:600; color:var(--text-light); margin-bottom:4px;">Condutores com requisitos documentais em dia (Aptos):</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                            ${nomesAptosHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    function renderizarBlocoProntidaoEquipesHtml(prontidaoLista, frenteFiltradaAtual) {
        const fontes = state.fontesResumo;
        const aviso = fontes.status === 'PRONTA' ? '' : `<p role="status" style="font-size:12.5px; color:var(--text-light);">${
            fontes.status === 'CARREGANDO' ? 'Carregando Efetivo e catálogo de frentes…' :
            fontes.status === 'NAO_CARREGADA' ? 'Efetivo e catálogo de frentes ainda não consultados. Resumo incompleto.' :
            `Resumo incompleto: não foi possível carregar ${escaparHtml(fontes.falhas.join(' e '))}. Tente atualizar o módulo.`
        }</p>`;
        if (!prontidaoLista || prontidaoLista.length === 0) {
            return `
                <div class="db-chart-card" id="condSlotProntidaoEquipes" style="margin-bottom:14px; padding:24px; text-align:center; background:var(--card); border:1px solid var(--border);">
                    <div style="font-size:14px; font-weight:700; margin-bottom:6px;">🚩 ${fontes.status === 'PRONTA' ? 'Nenhuma frente de serviço identificada' : 'Conferência de frentes incompleta'}</div>
                    ${aviso || '<p style="font-size:12.5px; color:var(--text-light);">Não foram encontradas frentes nas fontes consultadas.</p>'}
                </div>
            `;
        }
        const totalFrentes = prontidaoLista.length;
        const frentesComAptos = prontidaoLista.filter(f => f.condutoresAptos > 0).length;
        const frentesSemAptos = totalFrentes - frentesComAptos;
        const frentesComAlerta = prontidaoLista.filter(f => f.cnhsVencendo > 0).length;

        let resumoBadges = `<span style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; background:rgba(46,125,50,0.12); color:var(--success); border:1px solid rgba(46,125,50,0.3);">✅ ${frentesComAptos} equipes com condutor apto</span>`;
        if (frentesSemAptos > 0) {
            resumoBadges += ` <span style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; background:rgba(211,47,47,0.12); color:var(--danger); border:1px solid rgba(211,47,47,0.3);">⛔ ${frentesSemAptos} sem condutor apto</span>`;
        }
        if (frentesComAlerta > 0) {
            resumoBadges += ` <span style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:999px; background:rgba(237,108,2,0.12); color:var(--warning); border:1px solid rgba(237,108,2,0.3);">⚠️ ${frentesComAlerta} com CNH a vencer</span>`;
        }

        const termoBusca = String(state.buscaFrenteProntidao || '').trim().toLowerCase();
        const listaExibicao = termoBusca
            ? prontidaoLista.filter(f => f.nome.toLowerCase().includes(termoBusca) || (f.condutoresAptosLista && f.condutoresAptosLista.some(c => c.nome.toLowerCase().includes(termoBusca))))
            : prontidaoLista;

        const cardsHtml = renderizarCardsProntidaoListaHtml(listaExibicao, frenteFiltradaAtual, termoBusca);

        return `
            <div class="db-chart-card" id="condSlotProntidaoEquipes" style="margin-bottom:14px; padding:16px 18px; background:var(--card); border:1px solid var(--border);">
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:12px;">
                    <div>
                        ${aviso}
                        <div style="font-size:15px; font-weight:700; color:var(--text);">🚩 Prontidão de Condutores por Frente / Equipe</div>
                        <div style="font-size:12px; color:var(--text-light); margin-top:2px;">
                            Conferência de condutores com requisitos documentais em dia (CNH e Treinamentos SST) e capacidade logística por frente de serviço.
                            Próprios sem vínculo confirmado usam a frente informada no CNH; confirme os legados para acompanhar transferências no Efetivo.
                        </div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
                        ${resumoBadges}
                    </div>
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px;">
                    <div id="condProntidaoCountLabel" style="font-size:12px; color:var(--text-light);">
                        Mostrando <strong>${listaExibicao.length}</strong> de <strong>${totalFrentes}</strong> frentes da obra
                    </div>
                    <div style="min-width:220px; max-width:320px; width:100%;">
                        <input type="search" id="condBuscaFrenteProntidao" value="${escaparHtml(state.buscaFrenteProntidao || '')}" placeholder="🔍 Buscar frente/equipe..." data-cond-filter="buscaFrenteProntidao" style="width:100%; padding:6px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12px;">
                    </div>
                </div>
                <div id="condProntidaoCardsLista">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }
    function renderizarEstiloResponsivoInternoHtml() {
        return `
            <style id="condutoresCnhEstiloInterno">
                #page-gestao_de_condutores {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                #page-gestao_de_condutores *,
                #page-gestao_de_condutores *::before,
                #page-gestao_de_condutores *::after {
                    box-sizing: border-box;
                    min-width: 0;
                }
                #page-gestao_de_condutores .db-chart-card,
                #page-gestao_de_condutores .db-kpi-card,
                #page-gestao_de_condutores .cond-card-item,
                #page-gestao_de_condutores .cond-avaliacao-item,
                #page-gestao_de_condutores #condutoresListaContainer {
                    width: 100%;
                    max-width: 100%;
                    overflow-wrap: anywhere;
                    word-break: break-word;
                }
                #page-gestao_de_condutores input,
                #page-gestao_de_condutores select,
                #page-gestao_de_condutores textarea,
                #page-gestao_de_condutores button {
                    max-width: 100%;
                }
                #page-gestao_de_condutores .db-modal {
                    box-sizing: border-box;
                    overflow-x: hidden;
                    overflow-y: auto;
                }
                #page-gestao_de_condutores .db-modal-card {
                    box-sizing: border-box;
                    max-width: 100%;
                    overflow-x: hidden;
                    overflow-wrap: anywhere;
                    word-break: break-word;
                }
                @media (max-width: 480px) {
                    #page-gestao_de_condutores .db-chart-card,
                    #page-gestao_de_condutores .db-kpi-card,
                    #page-gestao_de_condutores .cond-card-item {
                        padding: 10px 12px !important;
                    }
                    #page-gestao_de_condutores .db-kpis,
                    #page-gestao_de_condutores .cond-filtros-grid,
                    #page-gestao_de_condutores .cond-cnh-status-grid,
                    #page-gestao_de_condutores .cond-modal-form-grid,
                    #page-gestao_de_condutores .cond-av-form-grid,
                    #page-gestao_de_condutores .cond-tr-form-grid,
                    #page-gestao_de_condutores .cond-alteracao-cnh-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                    }
                    #page-gestao_de_condutores .db-modal {
                        padding: 8px !important;
                        align-items: flex-start !important;
                    }
                    #page-gestao_de_condutores .db-modal-card {
                        width: 100% !important;
                        max-width: calc(100vw - 16px) !important;
                        max-height: calc(100vh - 16px) !important;
                        padding: 12px !important;
                        margin: 0 auto !important;
                    }
                    #page-gestao_de_condutores .cond-modal-header {
                        flex-wrap: wrap !important;
                        gap: 6px !important;
                    }
                    #page-gestao_de_condutores .cond-modal-actions {
                        flex-wrap: wrap !important;
                        justify-content: stretch !important;
                    }
                    #page-gestao_de_condutores .cond-modal-actions > button {
                        flex: 1 1 auto;
                        text-align: center;
                        justify-content: center;
                    }
                }
            </style>
        `;
    }
    function renderizarBlocoAlteracaoValidadeCnhHtml(d) {
        if (!d || !d.id) return '';
        const cnhOriginal = d.cnh_validade_original || '';
        const cnhAtual = d.cnh_validade || '';
        const alterouValidadeExistente = Boolean(cnhOriginal && cnhAtual && cnhOriginal !== cnhAtual);
        if (!alterouValidadeExistente) return '';
        return `
            <div style="padding:10px 12px; border:1px solid var(--warning); border-radius:8px; background:var(--bg); margin-bottom:12px;">
                <div style="font-size:12.5px; font-weight:700; color:var(--warning); margin-bottom:6px;">
                    ⚠️ Alteração de Validade da CNH Detectada (${escaparHtml(formatarDataBr(cnhOriginal))} → ${escaparHtml(formatarDataBr(cnhAtual))})
                </div>
                <div class="cond-alteracao-cnh-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:8px;">
                    <div>
                        <label style="font-size:11.5px; font-weight:600; display:block; margin-bottom:3px;">Tipo de Alteração da Validade *</label>
                        <select id="condFormModoAlteracaoCnh" data-cond-form="modo_alteracao_cnh" style="width:100%; padding:7px 9px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                            <option value="">Selecione...</option>
                            <option value="RENOVACAO" ${d.modo_alteracao_cnh === 'RENOVACAO' ? 'selected' : ''}>Renovação de CNH (inicia novo ciclo de validade e arquiva o anterior como substituído)</option>
                            <option value="CORRECAO_DATA" ${d.modo_alteracao_cnh === 'CORRECAO_DATA' ? 'selected' : ''}>Correção de Erro Material de Digitação (mantém o ciclo atual com registro na auditoria)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:11.5px; font-weight:600; display:block; margin-bottom:3px;">Justificativa / Observação da Alteração *</label>
                        <input type="text" id="condFormJustificativaCnh" value="${escaparHtml(d.justificativa_alteracao_cnh || '')}" data-cond-form="justificativa_alteracao_cnh" placeholder="Ex: CNH renovada / Correção de digitação" style="width:100%; padding:7px 9px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                    </div>
                </div>
            </div>
        `;
    }
    function atualizarBlocoAlteracaoCnhModalNoDom() {
        const container = obterContainerModulo();
        if (!container || state.modalAtivo !== 'CADASTRO' || !state.modalDados) return;
        const slot = typeof container.querySelector === 'function'
            ? container.querySelector('#condSlotAlteracaoValidadeCnh')
            : (typeof document !== 'undefined' ? document.getElementById('condSlotAlteracaoValidadeCnh') : null);
        if (slot) {
            slot.innerHTML = renderizarBlocoAlteracaoValidadeCnhHtml(state.modalDados);
        }
    }
    function renderizarInterfaceNoContainer() {
        const container = obterContainerModulo();
        if (!container) return;
        vincularDelegacaoEventosContainer(container);
        const refHoje = obterDataCivilSaoPauloHoje();
        state.ultimaDataCivilSpRenderizada = refHoje;
        const auth = state.statusAuth;
        const estiloInterno = renderizarEstiloResponsivoInternoHtml();
        // Banner fixo de distinção legal/operacional obrigatória (sem inventar requisitos extras não definidos)
        const bannerDistincaoLegal = `
            ${estiloInterno}
            <div class="db-chart-card" style="margin-bottom:14px; border-left:4px solid var(--warning); background:var(--card); color:var(--text); padding:12px 16px;">
                <div style="font-size:13px; font-weight:700; margin-bottom:4px;">⚠️ Distinção Operacional Obrigatória — Controle Interno de SST</div>
                <div style="font-size:12px; color:var(--text-light); line-height:1.45;">
                    A situação <strong>"Apto nos requisitos cadastrados"</strong> reflete exclusivamente a conferência interna dos itens registrados neste painel e <strong>NÃO equivale nem substitui a autorização formal para conduzir veículos ou operar equipamentos</strong>.
                    Neste escopo inicial não são coletados números de CNH ou documentos pessoais.
                </div>
            </div>
        `;
        // 1. Estado de Falta de Permissão / Sessão Auth não verificada
        if (!state.carregando && (!auth.autenticadoJwt || !auth.autorizadoLeitura)) {
            container.innerHTML = `
                ${bannerDistincaoLegal}
                <div class="db-chart-card" id="condutoresEstadoSemPermissao" style="padding:24px; border:1px solid var(--danger); background:var(--card); color:var(--text);">
                    <div style="font-size:15px; font-weight:700; color:var(--danger); margin-bottom:8px;">🔒 Acesso Restrito — Permissão ou Autenticação Necessária</div>
                    <p style="font-size:13px; color:var(--text); margin-bottom:12px; line-height:1.5;">
                        ${escaparHtml(obterMensagemBloqueioAuth(auth.motivoBloqueio))}
                    </p>
                    <div style="font-size:12px; color:var(--text-light); margin-bottom:14px;">
                        Diagnóstico: <code>${escaparHtml(auth.motivoBloqueio || 'NAO_AUTENTICADO')}</code>
                        ${auth.nomeSessao ? ` · Usuário no painel: <strong>${escaparHtml(auth.nomeSessao)}</strong>` : ''}
                    </div>
                    <button type="button" class="db-apply-btn" data-cond-action="recarregar" style="padding:8px 14px; font-size:12.5px;">🔄 Verificar sessão e tentar novamente</button>
                </div>
            `;
            return;
        }
        // 2. Estado de Carregamento
        if (state.carregando) {
            container.innerHTML = `
                ${bannerDistincaoLegal}
                <div class="db-chart-card" id="condutoresEstadoCarregando" style="padding:28px; text-align:center; background:var(--card); color:var(--text);">
                    <div style="font-size:14px; font-weight:600; margin-bottom:6px;">⏳ Carregando Gestão de Condutores – CNH...</div>
                    <div style="font-size:12px; color:var(--text-light);">Consultando cadastros e avaliações de condutores...</div>
                </div>
            `;
            return;
        }
        // 3. Estado de Erro de Consulta (com Retry, nunca mascarado como lista vazia!)
        if (state.erroCarregamento) {
            container.innerHTML = `
                ${bannerDistincaoLegal}
                <div class="db-chart-card" id="condutoresEstadoErro" style="padding:24px; border:1px solid var(--danger); background:var(--card); color:var(--text);">
                    <div style="font-size:15px; font-weight:700; color:var(--danger); margin-bottom:8px;">❌ Falha ao consultar registros de condutores</div>
                    <p style="font-size:13px; color:var(--text); margin-bottom:14px;">
                        ${escaparHtml(state.erroCarregamento)}
                    </p>
                    <button type="button" class="db-apply-btn" data-cond-action="recarregar" style="padding:8px 14px; font-size:12.5px;">🔄 Tentar novamente</button>
                </div>
            `;
            return;
        }
        const avaliadosCompletos = state.condutores.map(c => avaliarCondutorCompleto(c, refHoje));
        const kpis = calcularIndicadoresGerais(avaliadosCompletos);
        const prontidaoLista = calcularProntidaoPorFrente(avaliadosCompletos);
        const filtrados = filtrarAvaliados(avaliadosCompletos);
        // Coleta opções dinâmicas para filtros de Empresa, Atividade e Setor/Frente
        const empresasUnicas = Array.from(
            new Set(state.condutores.map(c => String(c.empresa || '').trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const setoresFrentesUnicos = Array.from(
            new Set(state.condutores.map(c => obterFrenteCondutor(c)).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const atividadesUnicas = [];
        const setAtiv = new Set();
        avaliadosCompletos.forEach(item => {
            item.avaliacoesCalculadas.forEach(av => {
                if (av.atividadeCodigo && av.atividadeCodigo !== 'NAO_VINCULADA' && !setAtiv.has(av.atividadeCodigo)) {
                    setAtiv.add(av.atividadeCodigo);
                    atividadesUnicas.push({ codigo: av.atividadeCodigo, nome: av.atividadeNome });
                }
            });
        });
        const bannerSomenteLeitura = !auth.autorizadoEscrita
            ? `<div class="db-chart-card" id="condutoresBannerSomenteLeitura" style="margin-bottom:12px; padding:10px 14px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:12.5px;">
                👁️ <strong>Modo Somente Leitura:</strong> Seu perfil possui permissão verificada para consulta, mas novos cadastros, edições, inativações e registros de comunicação estão bloqueados.
               </div>`
            : '';
        const bannerToast = state.avisoToastInterno
            ? `<div class="db-chart-card" id="condutoresToastInterno" style="margin-bottom:12px; padding:10px 14px; border-left:4px solid var(--success); background:var(--card); color:var(--text); font-size:12.5px; display:flex; justify-content:space-between; align-items:center;">
                <span>${escaparHtml(state.avisoToastInterno)}</span>
                <button type="button" class="db-clear-btn" data-cond-action="fechar-toast" style="padding:3px 8px; font-size:11px;">Fechar</button>
               </div>`
            : '';
        container.innerHTML = `
            ${bannerDistincaoLegal}
            ${bannerSomenteLeitura}
            ${bannerToast}
            <div id="condSlotBannerDecisaoJoao">${renderizarBannerDecisaoPendenteHtml(kpis.decisoesReavisoPendentes)}</div>
            <!-- Barra Superior de Ações e Data Civil de Referência -->
            <div class="db-chart-card" style="margin-bottom:14px; padding:14px 16px; background:var(--card); color:var(--text); border:1px solid var(--border);">
                <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
                    <div>
                        <div style="font-size:15px; font-weight:700; color:var(--text);">🪪 Gestão de Condutores e Operadores — Controle de CNH e Requisitos</div>
                        <div style="font-size:12px; color:var(--text-light);">
                            Data de referência (Horário de Brasília): <strong id="condDataRefLabel">${escaparHtml(formatarDataBr(refHoje))} (${escaparHtml(refHoje)})</strong>
                            · Antecedência padrão de alerta: <strong>${escaparHtml(String(state.antecedenciaPadraoDias))} dias</strong>
                        </div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                        <button type="button" class="db-clear-btn" data-cond-action="recarregar" style="padding:7px 11px; font-size:12px;">🔄 Recarregar</button>
                        ${auth.autorizadoEscrita ? `<button type="button" class="db-apply-btn" id="btnNovoCondutorCnh" data-cond-action="abrir-novo" style="padding:7px 13px; font-size:12.5px;">+ Novo Condutor</button>` : ''}
                    </div>
                </div>
            </div>
            <!-- Navegação por Subabas (Evita rolagem infinita e organiza visão de Condutores vs Frentes) -->
            <div class="db-filters" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; padding:8px 12px; background:var(--card); border:1px solid var(--border); border-radius:10px;">
                <button type="button" id="condSubtabBtnCondutores" class="db-filter-btn ${state.abaAtiva === 'CONDUTORES' ? 'active' : ''}" data-cond-action="trocar-aba" data-cond-aba="CONDUTORES" style="padding:8px 16px; font-size:13px; font-weight:600; border-radius:6px; cursor:pointer;">
                    🪪 Cadastro de Condutores (${state.condutores.length})
                </button>
                <button type="button" id="condSubtabBtnProntidao" class="db-filter-btn ${state.abaAtiva === 'PRONTIDAO_EQUIPES' ? 'active' : ''}" data-cond-action="trocar-aba" data-cond-aba="PRONTIDAO_EQUIPES" style="padding:8px 16px; font-size:13px; font-weight:600; border-radius:6px; cursor:pointer;">
                    🚩 Frentes de Serviço & Prontidão (${prontidaoLista.length})
                </button>
            </div>

            <!-- SUBABA 1: CADASTRO E LISTA DE CONDUTORES -->
            <div id="condSubtabConteudoCondutores" style="display:${state.abaAtiva === 'CONDUTORES' ? 'block' : 'none'};">
                <!-- 4 Indicadores Principais (KPIs) -->
                <div class="db-kpis" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap:12px; margin-bottom:14px;">
                    <div class="db-kpi-card" style="background:var(--card); border:1px solid var(--border); padding:14px; border-radius:10px;">
                        <div class="db-kpi-value" id="kpiCondutoresAtivosDistintos" style="font-size:24px; font-weight:700; color:var(--text);">${kpis.condutoresDistintosAtivos}</div>
                        <div class="db-kpi-label" style="font-size:12px; color:var(--text-light);">Condutores Distintos Ativos</div>
                    </div>
                    <div class="db-kpi-card" style="background:var(--card); border:1px solid var(--border); padding:14px; border-radius:10px;">
                        <div class="db-kpi-value" id="kpiCnhsAVencer" style="font-size:24px; font-weight:700; color:var(--warning);">${kpis.cnhsAVencerIncluiHoje}</div>
                        <div class="db-kpi-label" style="font-size:12px; color:var(--text-light);">CNHs a Vencer (inclui Vence Hoje)</div>
                    </div>
                    <div class="db-kpi-card" style="background:var(--card); border:1px solid var(--border); padding:14px; border-radius:10px;">
                        <div class="db-kpi-value" id="kpiCnhsVencidas" style="font-size:24px; font-weight:700; color:var(--danger);">${kpis.cnhsVencidas}</div>
                        <div class="db-kpi-label" style="font-size:12px; color:var(--text-light);">CNHs Vencidas (Ativos)</div>
                    </div>
                    <div class="db-kpi-card" style="background:var(--card); border:1px solid var(--border); padding:14px; border-radius:10px;">
                        <div class="db-kpi-value" id="kpiComunicacoesPendentes" style="font-size:24px; font-weight:700; color:${kpis.comunicacoesPendentes > 0 ? 'var(--danger)' : 'var(--success)'};">${kpis.comunicacoesPendentes}</div>
                        <div class="db-kpi-label" style="font-size:12px; color:var(--text-light);">Comunicações Pendentes (Validade Atual)</div>
                    </div>
                </div>

                <!-- Filtros e Busca -->
                <div class="db-chart-card" style="margin-bottom:14px; padding:14px 16px; background:var(--card); border:1px solid var(--border);">
                    <div class="cond-filtros-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 165px), 1fr)); gap:10px; align-items:end;">
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Buscar por nome</label>
                            <input type="search" id="condFiltroBuscaNome" value="${escaparHtml(state.filtros.buscaNome)}" placeholder="Digite o nome..." data-cond-filter="buscaNome" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Setor / Frente</label>
                            <select id="condFiltroSetorFrente" data-cond-filter="setorFrente" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODOS" ${state.filtros.setorFrente === 'TODOS' ? 'selected' : ''}>Todas as frentes/setores</option>
                                ${setoresFrentesUnicos.map(sf => `<option value="${escaparHtml(sf)}" ${state.filtros.setorFrente.toUpperCase() === sf.toUpperCase() ? 'selected' : ''}>${escaparHtml(sf)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Empresa</label>
                            <select id="condFiltroEmpresa" data-cond-filter="empresa" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODAS">Todas as empresas</option>
                                ${empresasUnicas.map(emp => `<option value="${escaparHtml(emp)}" ${state.filtros.empresa.toUpperCase() === emp.toUpperCase() ? 'selected' : ''}>${escaparHtml(emp)}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Vínculo</label>
                            <select id="condFiltroVinculo" data-cond-filter="vinculo" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODOS" ${state.filtros.vinculo === 'TODOS' ? 'selected' : ''}>Todos os vínculos</option>
                                <option value="PROPRIO" ${state.filtros.vinculo === 'PROPRIO' ? 'selected' : ''}>Próprio</option>
                                <option value="TERCEIRO" ${state.filtros.vinculo === 'TERCEIRO' ? 'selected' : ''}>Terceiro</option>
                                <option value="PJ" ${state.filtros.vinculo === 'PJ' ? 'selected' : ''}>PJ</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Atividade / Equipamento</label>
                            <select id="condFiltroAtividade" data-cond-filter="atividade" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODAS">Todas as atividades</option>
                                ${atividadesUnicas.map(at => `<option value="${escaparHtml(at.codigo)}" ${state.filtros.atividade.toUpperCase() === at.codigo.toUpperCase() ? 'selected' : ''}>${escaparHtml(at.nome)} (${escaparHtml(at.codigo)})</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Aptidão por Atividade</label>
                            <select id="condFiltroAptidao" data-cond-filter="aptidao" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODAS" ${state.filtros.aptidao === 'TODAS' ? 'selected' : ''}>Todas as situações</option>
                                <option value="INAPTO" ${state.filtros.aptidao === 'INAPTO' ? 'selected' : ''}>⛔ Inapto</option>
                                <option value="PENDENTE" ${state.filtros.aptidao === 'PENDENTE' ? 'selected' : ''}>⚠️ Pendente</option>
                                <option value="APTO" ${state.filtros.aptidao === 'APTO' ? 'selected' : ''}>✅ Apto nos requisitos cadastrados</option>
                                <option value="INATIVO" ${state.filtros.aptidao === 'INATIVO' ? 'selected' : ''}>⏸️ Inativo</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11.5px; font-weight:600; color:var(--text-light); display:block; margin-bottom:4px;">Vencimento CNH / Alerta</label>
                            <select id="condFiltroVencimento" data-cond-filter="vencimento" style="width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text); font-size:12.5px;">
                                <option value="TODOS" ${state.filtros.vencimento === 'TODOS' ? 'selected' : ''}>Todos os prazos</option>
                                <option value="VENCIDA" ${state.filtros.vencimento === 'VENCIDA' ? 'selected' : ''}>CNH Vencida</option>
                                <option value="VENCE_HOJE" ${state.filtros.vencimento === 'VENCE_HOJE' ? 'selected' : ''}>Vence Hoje</option>
                                <option value="A_VENCER_INCLUI_HOJE" ${state.filtros.vencimento === 'A_VENCER_INCLUI_HOJE' ? 'selected' : ''}>A Vencer (inclui hoje)</option>
                                <option value="FORA_DA_JANELA" ${state.filtros.vencimento === 'FORA_DA_JANELA' ? 'selected' : ''}>Vigente fora da janela</option>
                                <option value="AUSENTE" ${state.filtros.vencimento === 'AUSENTE' ? 'selected' : ''}>Sem CNH / Sem validade</option>
                                <option value="COMUNICACAO_PENDENTE" ${state.filtros.vencimento === 'COMUNICACAO_PENDENTE' ? 'selected' : ''}>Comunicação Pendente</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Barra de status da listagem (Exibe quantidade visível vs total) -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:12px; color:var(--text-light);">
                    <span id="condListagemCountLabel">Mostrando <strong>${filtrados.length}</strong> de <strong>${state.condutores.length}</strong> condutores cadastrados</span>
                    ${(state.filtros.buscaNome || state.filtros.setorFrente !== 'TODOS' || state.filtros.empresa !== 'TODAS' || state.filtros.vinculo !== 'TODOS' || state.filtros.atividade !== 'TODAS' || state.filtros.aptidao !== 'TODAS' || state.filtros.vencimento !== 'TODOS')
                        ? `<button type="button" class="db-clear-btn" data-cond-action="limpar-filtros" style="padding:3px 8px; font-size:11px;">✕ Limpar Filtros</button>`
                        : ''}
                </div>

                <!-- Lista de Condutores e Avaliações por Atividade (Sem selo geral enganoso) -->
                <div id="condutoresListaContainer">
                    ${renderizarListaCondutoresHtml(filtrados, auth.autorizadoEscrita)}
                </div>
            </div>

            <!-- SUBABA 2: FRENTES DE SERVIÇO & PRONTIDÃO -->
            <div id="condSubtabConteudoProntidao" style="display:${state.abaAtiva === 'PRONTIDAO_EQUIPES' ? 'block' : 'none'};">
                ${renderizarBlocoProntidaoEquipesHtml(prontidaoLista, state.filtros.setorFrente)}
            </div>

            <!-- Área de Modal Interno -->
            ${renderizarModalAtivoHtml(auth.autorizadoEscrita)}
        `;
    }
    function renderizarListaCondutoresHtml(filtrados, podeEscrever) {
        if (state.condutores.length === 0) {
            return `
                <div class="db-chart-card" id="condutoresEstadoVazio" style="padding:28px; text-align:center; background:var(--card); color:var(--text); border:1px solid var(--border);">
                    <div style="font-size:15px; font-weight:700; margin-bottom:6px;">📭 Nenhum condutor ou operador cadastrado</div>
                    <p style="font-size:12.5px; color:var(--text-light); margin-bottom:14px;">
                        Ainda não há condutores registrados na base de Gestão de Condutores.
                    </p>
                    ${podeEscrever ? `<button type="button" class="db-apply-btn" data-cond-action="abrir-novo" style="padding:8px 14px; font-size:12.5px;">+ Cadastrar Primeiro Condutor</button>` : ''}
                </div>
            `;
        }
        if (filtrados.length === 0) {
            return `
                <div class="db-chart-card" id="condutoresFiltroVazio" style="padding:24px; text-align:center; background:var(--card); color:var(--text); border:1px solid var(--border);">
                    <div style="font-size:14px; font-weight:700; margin-bottom:6px;">🔍 Nenhum condutor corresponde aos filtros selecionados</div>
                    <button type="button" class="db-clear-btn" data-cond-action="limpar-filtros" style="padding:6px 12px; font-size:12px;">Limpar filtros</button>
                </div>
            `;
        }
        return filtrados.map(item => {
            const c = item.condutor;
            const cnh = item.situacaoCnh;
            const com = item.alertaCom;
            const idEsc = escaparHtml(c.id);
            const inativo = c.ativo === false;
            const avaliacoesHtml = item.avaliacoesCalculadas.map(av => {
                const motivosHtml = av.todosMotivosVisiveis.map(m => {
                    const corM = m.tipo === 'INAPTO'
                        ? 'var(--danger)'
                        : (m.tipo === 'PENDENTE' ? 'var(--warning)' : 'var(--text-light)');
                    const prefixo = m.tipo === 'INAPTO'
                        ? '[Inapto]'
                        : (m.tipo === 'PENDENTE' ? '[Pendente]' : '[Info]');
                    return `<li style="font-size:12px; color:${corM}; margin-bottom:3px;"><strong>${prefixo}</strong> ${escaparHtml(m.texto)}</li>`;
                }).join('');
                return `
                    <div class="cond-avaliacao-item" data-atividade="${escaparHtml(av.atividadeCodigo)}" style="padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); margin-bottom:8px;">
                        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
                            <div style="font-size:13px; font-weight:700; color:var(--text);">
                                🚜 ${escaparHtml(av.atividadeNome)} <span style="font-size:11.5px; font-weight:500; color:var(--text-light);">(${escaparHtml(av.atividadeCodigo)})</span>
                            </div>
                            ${renderizarBadgeStatusAtividade(av.statusPrioritario, av.statusLabel)}
                        </div>
                        <ul style="margin:0; padding-left:18px;">
                            ${motivosHtml}
                        </ul>
                    </div>
                `;
            }).join('');
            const botoesAlertaAtivo = !inativo && (cnh.vencida || cnh.venceHoje || cnh.aVencer)
                ? `
                    <button type="button" class="db-clear-btn" data-cond-action="copiar-mensagem" data-cond-id="${idEsc}" style="padding:5px 10px; font-size:11.5px;">📋 Copiar Mensagem SST</button>
                    ${podeEscrever ? `<button type="button" class="db-apply-btn" data-cond-action="abrir-comunicacao" data-cond-id="${idEsc}" style="padding:5px 10px; font-size:11.5px;">📨 Registrar Comunicação</button>` : ''}
                  `
                : '';
            return `
                <div class="db-chart-card cond-card-item" data-condutor-id="${idEsc}" style="margin-bottom:12px; padding:14px 16px; background:var(--card); color:var(--text); border:1px solid var(--border); opacity:${inativo ? '0.78' : '1'};">
                    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--border);">
                        <div>
                            <div style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <span>${escaparHtml(c.nome)}</span>
                                <span style="font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid var(--border); background:var(--bg); color:var(--text);">Vínculo: ${escaparHtml(c.vinculo)}</span>
                                <span style="font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid ${inativo ? 'var(--text-light)' : 'var(--success)'}; color:${inativo ? 'var(--text-light)' : 'var(--success)'};">Cadastro: ${inativo ? 'Inativo' : 'Ativo'}</span>
                            </div>
                            <div style="font-size:12px; color:var(--text-light); margin-top:4px;">
                                Empresa: <strong>${escaparHtml(c.empresa)}</strong> · Função: <strong>${escaparHtml(c.funcao)}</strong> · Setor/Frente: <strong>${escaparHtml(obterFrenteCondutor(c))}</strong>
                            </div>
                            ${c.observacoes ? `<div style="font-size:11.5px; color:var(--text-light); margin-top:3px;">Obs.: ${escaparHtml(c.observacoes)}</div>` : ''}
                            ${inativo && c.inativado_motivo ? `<div style="font-size:11.5px; color:var(--warning); margin-top:3px;">Motivo da inativação: ${escaparHtml(c.inativado_motivo)}</div>` : ''}
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${botoesAlertaAtivo}
                            <button type="button" class="db-clear-btn" data-cond-action="abrir-historico" data-cond-id="${idEsc}" style="padding:5px 10px; font-size:11.5px;">📜 Histórico (${com.totalComunicacoesHistoricas})</button>
                            ${podeEscrever ? `<button type="button" class="db-clear-btn" data-cond-action="abrir-edicao" data-cond-id="${idEsc}" style="padding:5px 10px; font-size:11.5px;">✏️ Editar</button>` : ''}
                            ${podeEscrever ? `<button type="button" class="db-clear-btn" data-cond-action="abrir-status" data-cond-id="${idEsc}" style="padding:5px 10px; font-size:11.5px;">${inativo ? '✅ Reativar' : '⏸️ Inativar'}</button>` : ''}
                        </div>
                    </div>
                    <!-- Bloco de Situação da CNH e Comunicações -->
                    <div class="cond-cnh-status-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap:10px; margin-bottom:10px; padding:9px 12px; border-radius:8px; background:var(--bg); border:1px solid var(--border); font-size:12px;">
                        <div>
                            <strong>Situação da CNH:</strong>
                            <span style="font-weight:700; color:${cnh.vencida ? 'var(--danger)' : (cnh.venceHoje || cnh.aVencer ? 'var(--warning)' : 'var(--text)')};">
                                ${escaparHtml(cnh.statusTexto)}
                            </span>
                            ${cnh.categoria && cnh.categoria !== 'AUSENTE' ? ` · Cat.: <strong>${escaparHtml(cnh.categoria)}</strong>` : ''}
                        </div>
                        <div>
                            <strong>Comunicação:</strong>
                            <span style="font-weight:700; color:${com.comunicacaoPendente ? 'var(--danger)' : (com.decisaoPendenteReavisoVencida ? 'var(--warning)' : 'var(--text)')};">
                                ${escaparHtml(com.resumoComunicacaoCiclo)}
                            </span>
                        </div>
                    </div>
                    <!-- Avaliações por Atividade/Equipamento (sem selo geral que esconda divergências) -->
                    <div>
                        <div style="font-size:11.5px; font-weight:700; color:var(--text-light); text-transform:uppercase; margin-bottom:6px;">
                            Avaliações Individuais por Veículo / Equipamento / Atividade (${item.avaliacoesCalculadas.length})
                        </div>
                        ${avaliacoesHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    function renderizarModalAtivoHtml(podeEscrever) {
        if (!state.modalAtivo || !state.modalDados) return '';
        const erroHtml = state.erroModal
            ? `<div id="condModalErroMsg" style="margin-bottom:12px; padding:10px 12px; border-radius:6px; border:1px solid var(--danger); color:var(--danger); background:var(--bg); font-size:12.5px; font-weight:600;">❌ ${escaparHtml(state.erroModal)}</div>`
            : '';
        if (state.modalAtivo === 'CADASTRO') {
            const d = state.modalDados;
            const ehEdicao = Boolean(d.id);
            const avaliacoesFormHtml = (Array.isArray(d.avaliacoes) ? d.avaliacoes : []).map((av, idxAv) => {
                const cats = Array.isArray(av.categorias_aceitas) ? av.categorias_aceitas : [];
                const treinsHtml = (Array.isArray(av.treinamentos) ? av.treinamentos : []).map((tr, idxTr) => `
                    <div style="padding:8px; border:1px dashed var(--border); border-radius:6px; margin-top:6px; background:var(--card);">
                        <div class="cond-tr-form-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 130px), 1fr)); gap:6px;">
                            <input type="text" placeholder="Código (ex: NR-11)" value="${escaparHtml(tr.codigo || '')}" data-cond-tr-field="codigo" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <input type="text" placeholder="Nome do Treinamento" value="${escaparHtml(tr.nome || '')}" data-cond-tr-field="nome" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <select data-cond-tr-field="status_aplicabilidade" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                                <option value="PENDENTE_REGRA" ${tr.status_aplicabilidade === 'PENDENTE_REGRA' ? 'selected' : ''}>Aplicabilidade Pendente</option>
                                <option value="OBRIGATORIO" ${tr.status_aplicabilidade === 'OBRIGATORIO' ? 'selected' : ''}>Obrigatório</option>
                                <option value="NAO_APLICAVEL" ${tr.status_aplicabilidade === 'NAO_APLICAVEL' ? 'selected' : ''}>Não Aplicável (Explícito)</option>
                            </select>
                            <select data-cond-tr-field="exige_validade" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                                <option value="INDEFINIDO" ${tr.exige_validade === 'INDEFINIDO' ? 'selected' : ''}>Exige Validade: Indefinido</option>
                                <option value="SIM" ${tr.exige_validade === 'SIM' ? 'selected' : ''}>Exige Validade: Sim</option>
                                <option value="NAO" ${tr.exige_validade === 'NAO' ? 'selected' : ''}>Exige Validade: Não</option>
                            </select>
                            <input type="date" title="Data de realização" value="${escaparHtml(tr.data_realizacao || '')}" data-cond-tr-field="data_realizacao" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <input type="date" title="Validade do treinamento" value="${escaparHtml(tr.validade || '')}" data-cond-tr-field="validade" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <input type="text" placeholder="Ref. Comprovação (ex: Lista FOR.001)" value="${escaparHtml(tr.comprovacao_ref || '')}" data-cond-tr-field="comprovacao_ref" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <input type="text" placeholder="Conferido por" value="${escaparHtml(tr.conferido_por || '')}" data-cond-tr-field="conferido_por" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                            <input type="date" title="Conferido em" value="${escaparHtml(String(tr.conferido_em || '').slice(0, 10))}" data-cond-tr-field="conferido_em" data-av-idx="${idxAv}" data-tr-idx="${idxTr}" style="padding:5px 7px; border:1px solid var(--border); border-radius:5px; background:var(--bg); color:var(--text); font-size:11.5px;">
                        </div>
                    </div>
                `).join('');
                return `
                    <div style="padding:10px; border:1px solid var(--border); border-radius:8px; margin-bottom:10px; background:var(--bg);">
                        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <strong style="font-size:12.5px;">Atividade / Equipamento #${idxAv + 1} ${av.regra_aprovada ? '<span style="color:var(--success); font-size:11px;">(Regra aprovada preservada)</span>' : '<span style="color:var(--warning); font-size:11px;">(Regra pendente de matriz SST)</span>'}</strong>
                            <button type="button" class="db-clear-btn" data-cond-action="remover-avaliacao" data-av-idx="${idxAv}" style="padding:3px 8px; font-size:11px; color:var(--danger);">Remover Atividade</button>
                        </div>
                        <div class="cond-av-form-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap:8px; margin-bottom:8px;">
                            <input type="text" placeholder="Código (ex: CAMINHAO_MUNCK)" value="${escaparHtml(av.atividade_codigo || '')}" data-cond-av-field="atividade_codigo" data-av-idx="${idxAv}" style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                            <input type="text" placeholder="Nome da Atividade / Equipamento" value="${escaparHtml(av.atividade_nome || '')}" data-cond-av-field="atividade_nome" data-av-idx="${idxAv}" style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                            <select data-cond-av-field="exige_cnh" data-av-idx="${idxAv}" style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                                <option value="INDEFINIDO" ${av.exige_cnh === 'INDEFINIDO' ? 'selected' : ''}>Exige CNH: Indefinido (Pendente)</option>
                                <option value="SIM" ${av.exige_cnh === 'SIM' ? 'selected' : ''}>Exige CNH: Sim</option>
                                <option value="NAO" ${av.exige_cnh === 'NAO' ? 'selected' : ''}>Exige CNH: Não Aplicável (Explícito)</option>
                            </select>
                            <input type="text" placeholder="Categorias aceitas (ex: C,D,E)" value="${escaparHtml(cats.join(','))}" data-cond-av-field="categorias_aceitas" data-av-idx="${idxAv}" style="padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-size:12px;">
                        </div>
                        <div>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center;">
                                <span style="font-size:11.5px; font-weight:600; color:var(--text-light);">Treinamentos vinculados à atividade</span>
                                <button type="button" class="db-clear-btn" data-cond-action="adicionar-treinamento" data-av-idx="${idxAv}" style="padding:3px 8px; font-size:11px;">+ Adicionar Treinamento</button>
                            </div>
                            ${treinsHtml}
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="db-modal" id="modalCondutorCadastro" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:9999; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
                    <div class="db-modal-card" style="background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:12px; width:100%; max-width:780px; max-height:90vh; overflow-y:auto; overflow-x:hidden; padding:20px; box-sizing:border-box;">
                        <div class="cond-modal-header" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border);">
                            <h3 style="font-size:16px; font-weight:700; margin:0;">${ehEdicao ? '✏️ Editar Condutor / Operador' : '+ Novo Condutor / Operador'}</h3>
                            <button type="button" class="db-clear-btn" data-cond-action="cancelar-modal" style="padding:4px 10px;">✕</button>
                        </div>
                        ${erroHtml}
                        <div id="condBlocoBuscaBaseColaborador" style="margin-bottom:12px; padding:10px; border:1px solid var(--border); border-radius:8px; background:var(--bg);">
                            <label for="condFormBuscaBase" style="font-size:12px; font-weight:700; display:block; margin-bottom:4px;">🔎 Buscar colaborador na base do Efetivo</label>
                            <div style="position:relative;">
                                <input type="text" id="condFormBuscaBase" autocomplete="off" value="${escaparHtml(state.buscaBaseColaborador || '')}" placeholder="Digite parte do nome, a matrícula ou a função..." data-cond-base-busca="1" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); box-sizing:border-box;">
                                <div id="condListaSugestoesColaborador" role="listbox" aria-label="Colaboradores ativos da base do Efetivo" style="display:none; position:absolute; z-index:40; left:0; right:0; top:calc(100% + 4px); max-height:240px; overflow-y:auto; background:var(--card); border:1px solid var(--border); border-radius:8px; box-shadow:0 10px 24px rgba(0,0,0,0.28);"></div>
                            </div>
                            <div id="condBaseColaboradorStatus" style="font-size:11.5px; color:var(--text-light); margin-top:5px; line-height:1.4;">${escaparHtml(textoStatusBaseColaborador())}</div>
                            ${state.avisoBaseColaborador ? `<div style="margin-top:6px; padding:8px 10px; border:1px solid var(--warning); border-radius:6px; background:var(--card); color:var(--warning); font-size:11.5px; font-weight:600; line-height:1.4;">${escaparHtml(state.avisoBaseColaborador)}</div>` : ''}
                        </div>
                        ${d.vinculo === 'PROPRIO' ? `<div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px; font-size:12.5px; line-height:1.5;">
                            <strong>Vínculo confirmado com o Efetivo:</strong> ${escaparHtml(d.efetivo_id || 'Ainda não confirmado')}
                            <p>A frente acompanha o Efetivo após a confirmação. A busca acima apenas preenche o formulário.</p>
                            ${d.id ? `<label>Selecione a pessoa e confira a matrícula:
                                <select aria-label="Pessoa do Efetivo para vínculo confirmado" data-cond-form="efetivo_id_selecionado" style="display:block; width:100%; padding:8px; margin:6px 0; background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:6px;"><option value="">Selecione para confirmar</option>${state.fontesResumo.efetivo.filter(colaboradorDaBaseEstaAtivo).map(p => `<option value="${escaparHtml(p.id)}" ${String(d.efetivo_id_selecionado || '') === String(p.id) ? 'selected' : ''}>${escaparHtml(p.nome)} — ${escaparHtml(p.id)} — ${escaparHtml(p.responsavel || p.setor || '')}</option>`).join('')}</select></label>
                                <button type="button" class="db-apply-btn" data-cond-action="confirmar-vinculo-efetivo" ${state.salvandoModal ? 'disabled' : ''}>Confirmar pessoa selecionada</button>
                                ${d.efetivo_id ? `<button type="button" class="db-clear-btn" data-cond-action="remover-vinculo-efetivo" ${state.salvandoModal ? 'disabled' : ''}>Remover vínculo confirmado</button>` : ''}
                                <p>Esta ação salva somente o vínculo. Salve ou cancele as demais alterações antes de confirmar.</p>` : '<p>Salve o cadastro primeiro; depois abra Editar para confirmar o vínculo.</p>'}
                        </div>` : ''}
                        <div class="cond-modal-form-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap:10px; margin-bottom:12px;">
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Nome Completo *</label>
                                <input type="text" id="condFormNome" value="${escaparHtml(d.nome || '')}" data-cond-form="nome" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Vínculo *</label>
                                <select id="condFormVinculo" data-cond-form="vinculo" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                                    <option value="PROPRIO" ${d.vinculo === 'PROPRIO' ? 'selected' : ''}>Próprio (COP)</option>
                                    <option value="TERCEIRO" ${d.vinculo === 'TERCEIRO' ? 'selected' : ''}>Terceiro</option>
                                    <option value="PJ" ${d.vinculo === 'PJ' ? 'selected' : ''}>PJ</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Empresa *</label>
                                <input type="text" id="condFormEmpresa" value="${escaparHtml(d.empresa || '')}" data-cond-form="empresa" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Função / Cargo *</label>
                                <input type="text" id="condFormFuncao" value="${escaparHtml(d.funcao || '')}" data-cond-form="funcao" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Setor / Frente *</label>
                                <input type="text" id="condFormSetorFrente" value="${escaparHtml(d.efetivo_id ? obterFrenteCondutor(d) : (d.setor_frente || ''))}" ${d.efetivo_id ? 'readonly title="Frente atual do Efetivo; a frente anterior do CNH permanece preservada."' : 'data-cond-form="setor_frente"'} style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">CNH Categoria (sem nº doc.)</label>
                                <select id="condFormCnhCategoria" data-cond-form="cnh_categoria" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                                    <option value="" ${!d.cnh_categoria ? 'selected' : ''}>Não informada (Pendente)</option>
                                    <option value="NAO_POSSUI" ${d.cnh_categoria === 'NAO_POSSUI' ? 'selected' : ''}>Não possui CNH</option>
                                    ${CATEGORIAS_CNH_VALIDAS.map(cat => `<option value="${cat}" ${d.cnh_categoria === cat ? 'selected' : ''}>Categoria ${cat}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Validade da CNH</label>
                                <input type="date" id="condFormCnhValidade" value="${escaparHtml(d.cnh_validade || '')}" data-cond-form="cnh_validade" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                            <div>
                                <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Antecedência Alerta (dias)</label>
                                <input type="number" min="1" max="180" id="condFormAntecedencia" value="${escaparHtml(String(d.antecedencia_alerta_dias || 30))}" data-cond-form="antecedencia_alerta_dias" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                            </div>
                        </div>
                        <div id="condSlotAlteracaoValidadeCnh">${renderizarBlocoAlteracaoValidadeCnhHtml(d)}</div>
                        <div style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Observações Operacionais (não inserir nº de CNH ou CPF)</label>
                            <textarea id="condFormObservacoes" rows="2" data-cond-form="observacoes" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">${escaparHtml(d.observacoes || '')}</textarea>
                        </div>
                        <div style="margin-bottom:14px;">
                            <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-size:13px; font-weight:700;">Avaliações por Veículo / Equipamento / Atividade</span>
                                <select id="condModeloMatriz" aria-label="Modelo da matriz SST" style="max-width:100%;"><option value="">Selecionar atividade da matriz aprovada</option>${MATRIZ_SST_APROVADA.map(m => `<option value="${escaparHtml(m.atividade_codigo)}">${escaparHtml(m.atividade_nome)}</option>`).join('')}</select><button type="button" class="db-clear-btn" data-cond-action="aplicar-matriz">+ Aplicar modelo</button><button type="button" class="db-clear-btn" data-cond-action="adicionar-avaliacao" style="padding:5px 10px; font-size:12px;">+ Adicionar Atividade</button>
                            </div>
                            <p style="font-size:12px;">Matriz interna aprovada por João. Direção Defensiva e NR-11/NR-12: reciclagem de 24 meses. Preencha as datas e evidências reais; demais validades exigem avaliação específica.</p>
                            ${avaliacoesFormHtml}
                        </div>
                        <div class="cond-modal-actions" style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; padding-top:10px; border-top:1px solid var(--border);">
                            <button type="button" class="db-clear-btn" data-cond-action="cancelar-modal" style="padding:8px 14px;">Cancelar</button>
                            ${podeEscrever ? `<button type="button" class="db-apply-btn" id="btnSalvarCondutorModal" data-cond-action="salvar-cadastro" ${state.salvandoModal ? 'disabled' : ''} style="padding:8px 16px;">${state.salvandoModal ? 'Salvando...' : '💾 Salvar'}</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        if (state.modalAtivo === 'INATIVAR') {
            const d = state.modalDados;
            return `
                <div class="db-modal" id="modalCondutorStatus" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:9999; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
                    <div class="db-modal-card" style="background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:12px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; overflow-x:hidden; padding:20px; box-sizing:border-box;">
                        <h3 style="font-size:16px; font-weight:700; margin:0 0 10px;">${d.novo_ativo ? '✅ Reativar Condutor' : '⏸️ Inativar Condutor (Preserva Histórico)'}</h3>
                        ${erroHtml}
                        <p style="font-size:12.5px; color:var(--text-light); margin-bottom:10px;">
                            Condutor: <strong>${escaparHtml(d.nome)}</strong>. A inativação desativa alertas futuros e classifica a situação como Inativo, sem excluir o registro nem seu histórico.
                        </p>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Motivo ${d.novo_ativo ? '(opcional)' : '(obrigatório *)'}</label>
                            <textarea id="condStatusMotivo" rows="3" data-cond-form="motivo" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">${escaparHtml(d.motivo || '')}</textarea>
                        </div>
                        <div class="cond-modal-actions" style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px;">
                            <button type="button" class="db-clear-btn" data-cond-action="cancelar-modal" style="padding:8px 14px;">Cancelar</button>
                            <button type="button" class="db-apply-btn" id="btnConfirmarStatusCondutor" data-cond-action="salvar-status" style="padding:8px 16px;">Confirmar</button>
                        </div>
                    </div>
                </div>
            `;
        }
        if (state.modalAtivo === 'COMUNICACAO') {
            const d = state.modalDados;
            return `
                <div class="db-modal" id="modalCondutorComunicacao" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:9999; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
                    <div class="db-modal-card" style="background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:12px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; overflow-x:hidden; padding:20px; box-sizing:border-box;">
                        <h3 style="font-size:16px; font-weight:700; margin:0 0 10px;">📨 Registrar Comunicação Explícita de CNH</h3>
                        ${erroHtml}
                        <div style="font-size:12.5px; color:var(--text-light); margin-bottom:12px;">
                            Condutor: <strong>${escaparHtml(d.nome)}</strong><br>
                            Validade Comunicada: <strong>${escaparHtml(formatarDataBr(d.vencimento_comunicado))}</strong> (${escaparHtml(d.estagio_no_momento)})
                        </div>
                        <div style="margin-bottom:10px;">
                            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Canal Utilizado *</label>
                            <select id="condComCanal" data-cond-form="canal" style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">
                                ${CANAIS_COMUNICACAO.map(c => `<option value="${c.codigo}" ${d.canal === c.codigo ? 'selected' : ''}>${escaparHtml(c.label)}</option>`).join('')}
                            </select>
                        </div>
                        <div style="margin-bottom:14px;">
                            <label style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Motivo / Resumo da Orientação Registrada *</label>
                            <textarea id="condComMotivo" rows="3" data-cond-form="motivo" placeholder="Descreva a ciência do condutor/encarregado sobre o vencimento..." style="width:100%; padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); color:var(--text);">${escaparHtml(d.motivo || '')}</textarea>
                        </div>
                        <div class="cond-modal-actions" style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px;">
                            <button type="button" class="db-clear-btn" data-cond-action="cancelar-modal" style="padding:8px 14px;">Cancelar</button>
                            <button type="button" class="db-apply-btn" id="btnSalvarComunicacaoModal" data-cond-action="salvar-comunicacao" style="padding:8px 16px;">Registrar Comunicação</button>
                        </div>
                    </div>
                </div>
            `;
        }
        if (state.modalAtivo === 'HISTORICO') {
            const d = state.modalDados;
            const c = state.condutores.find(x => String(x.id) === String(d.condutor_id));
            const comunicacoes = Array.isArray(c?.comunicacoes) ? c.comunicacoes : [];
            const ciclosHist = Array.isArray(c?.ciclos_cnh_historico) ? c.ciclos_cnh_historico : [];
            const eventos = Array.isArray(c?.historico_eventos) ? c.historico_eventos : [];
            return `
                <div class="db-modal" id="modalCondutorHistorico" style="display:flex; position:fixed; inset:0; background:rgba(15,23,42,0.65); z-index:9999; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
                    <div class="db-modal-card" style="background:var(--card); color:var(--text); border:1px solid var(--border); border-radius:12px; width:100%; max-width:720px; max-height:88vh; overflow-y:auto; overflow-x:hidden; padding:20px; box-sizing:border-box;">
                        <div class="cond-modal-header" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border);">
                            <h3 style="font-size:16px; font-weight:700; margin:0;">📜 Histórico de Comunicações e Alterações — ${escaparHtml(c?.nome || '')}</h3>
                            <button type="button" class="db-clear-btn" data-cond-action="cancelar-modal" style="padding:4px 10px;">Fechar</button>
                        </div>
                        <div style="margin-bottom:14px;">
                            <h4 style="font-size:13px; font-weight:700; margin:0 0 6px;">1. Comunicações Registradas (${comunicacoes.length}) — Registro Permanente</h4>
                            ${comunicacoes.length === 0
                                ? '<div style="font-size:12px; color:var(--text-light);">Nenhuma comunicação registrada até o momento.</div>'
                                : comunicacoes.map(cm => `
                                    <div style="padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); margin-bottom:6px; font-size:12px; overflow-wrap:anywhere;">
                                        <div><strong>Canal:</strong> ${escaparHtml(cm.canal)} · <strong>Situação da CNH no ato:</strong> ${escaparHtml(cm.estagio_no_momento)} · <strong>Status:</strong> ${escaparHtml(cm.status_registro || 'REGISTRADA')}</div>
                                        <div><strong>Validade comunicada:</strong> ${escaparHtml(formatarDataBr(cm.vencimento_comunicado))}</div>
                                        <div><strong>Responsável:</strong> ${escaparHtml(cm.responsavel_nome)} · <strong>Data/Hora:</strong> ${escaparHtml(cm.registrado_em)}</div>
                                        <div><strong>Orientação / Motivo:</strong> ${escaparHtml(cm.motivo)}</div>
                                    </div>
                                `).join('')}
                        </div>
                        <div style="margin-bottom:14px;">
                            <h4 style="font-size:13px; font-weight:700; margin:0 0 6px;">2. Validades Anteriores de CNH Substituídas/Encerradas (${ciclosHist.length})</h4>
                            ${ciclosHist.length === 0
                                ? '<div style="font-size:12px; color:var(--text-light);">Nenhum ciclo anterior substituído por renovação.</div>'
                                : ciclosHist.map(ch => `
                                    <div style="padding:8px 10px; border:1px solid var(--border); border-radius:6px; background:var(--bg); margin-bottom:6px; font-size:12px; overflow-wrap:anywhere;">
                                        <div><strong>Validade Anterior:</strong> ${escaparHtml(formatarDataBr(ch.cnh_validade))} · <strong>Situação do Ciclo Anterior:</strong> ${escaparHtml(ch.status_ciclo)}</div>
                                        <div><strong>Encerrado em:</strong> ${escaparHtml(ch.encerrado_em)} · <strong>Por:</strong> ${escaparHtml(ch.encerrado_por_nome || '—')}</div>
                                    </div>
                                `).join('')}
                        </div>
                        <div>
                            <h4 style="font-size:13px; font-weight:700; margin:0 0 6px;">3. Trilha de Auditoria de Eventos (${eventos.length})</h4>
                            ${eventos.map(ev => `
                                <div style="padding:6px 10px; border-bottom:1px solid var(--border); font-size:11.5px; overflow-wrap:anywhere;">
                                    <strong>${escaparHtml(ev.tipo)}</strong> em ${escaparHtml(ev.em)} por <strong>${escaparHtml(ev.responsavel_nome || '—')}</strong>
                                    ${ev.justificativa ? ` — <em>${escaparHtml(ev.justificativa)}</em>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }
    // =========================================================================
    // 6.0 BASE DO EFETIVO (SOMENTE LEITURA) — AUTOCOMPLETAR O CADASTRO
    // =========================================================================
    // Consulta apenas leitura em `colaboradores_efetivo` para sugerir
    // nome/função/setor de colaboradores ativos no formulário de condutor.
    // A busca não grava nem confirma vínculo. A confirmação por ID é uma ação
    // explícita e separada, restrita aos próprios, com RPC e histórico próprios.
    const LIMITE_SUGESTOES_BASE_COLABORADOR = 30;
    function normalizarBuscaBaseColaborador(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
    function colaboradorDaBaseEstaAtivo(item) {
        if (!item) return false;
        if (item.dt_demissao) return false;
        const status = String(item.status || '').trim().toUpperCase();
        if (status !== 'ATIVO') return false;
        return status === 'ATIVO' || Boolean(item.dt_admissao);
    }
    function textoStatusBaseColaborador() {
        if (state.baseColaboradoresStatus === 'CARREGANDO') {
            return '⏳ Carregando a base de colaboradores do Efetivo...';
        }
        if (state.baseColaboradoresStatus === 'PRONTA') {
            const qtd = state.baseColaboradores.length;
            if (qtd === 0) {
                return '⚠️ Nenhum colaborador ativo encontrado na base do Efetivo. Preencha o nome manualmente.';
            }
            return `✅ ${qtd} colaboradores ativos na base do Efetivo. Selecione para preencher nome, função e setor automaticamente (pode editar depois).`;
        }
        if (state.baseColaboradoresStatus === 'INDISPONIVEL') {
            const detalhe = String(state.baseColaboradoresErro || '').slice(0, 140);
            return `⚠️ Base do Efetivo indisponível agora${detalhe ? ` (${detalhe})` : ''}. Preencha o nome manualmente — o cadastro não fica bloqueado.`;
        }
        return 'Digite parte do nome, a matrícula ou a função para localizar o colaborador na base do Efetivo (ou preencha o nome manualmente).';
    }
    async function carregarBaseColaboradoresDoEfetivo() {
        if (state.baseColaboradoresStatus === 'CARREGANDO' || state.baseColaboradoresStatus === 'PRONTA') return;
        const snapChaveAntes = state.chaveIdentidadeAtiva;
        const geracaoAntes = state.geracaoSessao;
        state.baseColaboradoresStatus = 'CARREGANDO';
        state.baseColaboradoresErro = '';
        atualizarStatusBaseColaboradorNoDom();
        try {
            let lista = Array.isArray(window.allEfetivo) ? window.allEfetivo : [];
            if (lista.length === 0) {
                const consulta = '?select=id,nome,funcao,setor,responsavel,status,dt_admissao,dt_demissao&order=nome.asc';
                const buscarCacheado = typeof window.supabaseFetchCacheado === 'function' ? window.supabaseFetchCacheado : null;
                const buscarSimples = typeof window.supabaseFetch === 'function' ? window.supabaseFetch : null;
                if (buscarCacheado) {
                    try {
                        lista = await buscarCacheado('colaboradores_efetivo', consulta);
                    } catch (_) {
                        // Cache/IndexedDB indisponível no navegador: tenta a consulta direta antes de desistir.
                        lista = buscarSimples ? await buscarSimples('colaboradores_efetivo', consulta) : [];
                    }
                } else if (buscarSimples) {
                    lista = await buscarSimples('colaboradores_efetivo', consulta);
                } else {
                    throw new Error('Leitor de dados do painel não disponível nesta tela.');
                }
            }
            // Se a sessão mudou ou foi limpa durante o await, descarta a resposta atrasada imediatamente!
            if (
                state.baseColaboradoresStatus === 'NAO_CARREGADA' ||
                state.geracaoSessao !== geracaoAntes ||
                state.chaveIdentidadeAtiva !== snapChaveAntes
            ) {
                return;
            }
            state.baseColaboradores = (Array.isArray(lista) ? lista : [])
                .filter(colaboradorDaBaseEstaAtivo)
                .map(item => ({
                    id: String(item && item.id !== undefined && item.id !== null ? item.id : '').trim(),
                    nome: String(item && item.nome ? item.nome : '').trim(),
                    funcao: String(item && item.funcao ? item.funcao : '').trim(),
                    setor: String(item && item.setor ? item.setor : '').trim(),
                    responsavel: String(item && item.responsavel ? item.responsavel : '').trim()
                }))
                .filter(item => item.nome.length >= 3)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            state.baseColaboradoresStatus = 'PRONTA';
        } catch (err) {
            if (
                state.baseColaboradoresStatus === 'NAO_CARREGADA' ||
                state.geracaoSessao !== geracaoAntes ||
                state.chaveIdentidadeAtiva !== snapChaveAntes
            ) {
                return;
            }
            state.baseColaboradores = [];
            state.baseColaboradoresStatus = 'INDISPONIVEL';
            state.baseColaboradoresErro = err && err.message ? err.message : 'Falha ao consultar a base do Efetivo.';
        } finally {
            if (state.baseColaboradoresStatus !== 'NAO_CARREGADA') {
                atualizarStatusBaseColaboradorNoDom();
                if (state.sugestoesBaseAbertas) atualizarSugestoesBaseColaboradorNoDom();
            }
        }
    }
    function obterSugestoesBaseColaborador(termo) {
        const alvo = normalizarBuscaBaseColaborador(termo);
        const lista = Array.isArray(state.baseColaboradores) ? state.baseColaboradores : [];
        if (!alvo) return lista.slice(0, LIMITE_SUGESTOES_BASE_COLABORADOR);
        const exatos = [];
        const comecam = [];
        const contem = [];
        for (let i = 0; i < lista.length; i++) {
            const c = lista[i];
            const nomeNorm = normalizarBuscaBaseColaborador(c.nome);
            if (nomeNorm === alvo) {
                exatos.push(c);
                continue;
            }
            if (nomeNorm.startsWith(alvo)) {
                comecam.push(c);
                continue;
            }
            const chave = `${nomeNorm} ${normalizarBuscaBaseColaborador(c.id)} ${normalizarBuscaBaseColaborador(c.funcao)}`;
            if (chave.includes(alvo)) contem.push(c);
        }
        return exatos.concat(comecam, contem).slice(0, LIMITE_SUGESTOES_BASE_COLABORADOR);
    }
    function renderizarSugestoesBaseColaboradorHtml() {
        if (state.baseColaboradoresStatus === 'CARREGANDO') {
            return '<div style="padding:10px; font-size:12px; color:var(--text-light);">Carregando base do Efetivo...</div>';
        }
        if (state.baseColaboradoresStatus === 'INDISPONIVEL') {
            return '<div style="padding:10px; font-size:12px; color:var(--warning);">Base do Efetivo indisponível. Preencha o nome manualmente.</div>';
        }
        const sugestoes = Array.isArray(state.sugestoesBaseAtuais) ? state.sugestoesBaseAtuais : [];
        if (sugestoes.length === 0) {
            return '<div style="padding:10px; font-size:12px; color:var(--text-light);">Nenhum colaborador ativo encontrado com esse termo.</div>';
        }
        return sugestoes.map((c, idx) => {
            const detalhes = [
                c.id ? `Mat. ${escaparHtml(c.id)}` : '',
                c.funcao ? escaparHtml(c.funcao) : '',
                (c.responsavel || c.setor) ? escaparHtml(c.responsavel || c.setor) : ''
            ].filter(Boolean).join(' · ');
            return `<button type="button" role="option" data-cond-base-idx="${idx}" style="display:block; width:100%; text-align:left; padding:7px 10px; border:0; border-bottom:1px solid var(--border); background:transparent; color:var(--text); cursor:pointer; font-size:12px; line-height:1.35;">
                <strong>${escaparHtml(c.nome)}</strong>
                ${detalhes ? `<span style="display:block; color:var(--text-light); font-size:11px;">${detalhes}</span>` : ''}
            </button>`;
        }).join('');
    }
    function atualizarStatusBaseColaboradorNoDom() {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
        const el = document.getElementById('condBaseColaboradorStatus');
        if (el) el.textContent = textoStatusBaseColaborador();
    }
    function atualizarSugestoesBaseColaboradorNoDom() {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
        const caixa = document.getElementById('condListaSugestoesColaborador');
        if (!caixa) return;
        state.sugestoesBaseAtuais = obterSugestoesBaseColaborador(state.buscaBaseColaborador);
        if (!state.sugestoesBaseAbertas) {
            caixa.style.display = 'none';
            caixa.innerHTML = '';
            return;
        }
        caixa.innerHTML = renderizarSugestoesBaseColaboradorHtml();
        caixa.style.display = 'block';
    }
    function fecharSugestoesBaseColaboradorComAtraso() {
        if (typeof setTimeout !== 'function') return;
        setTimeout(function () {
            if (!state.sugestoesBaseAbertas) return;
            // Se o foco continua na busca (ex.: setas do teclado), mantém aberto.
            if (typeof document !== 'undefined' && typeof document.activeElement !== 'undefined') {
                const ativo = document.activeElement;
                if (ativo && typeof ativo.getAttribute === 'function' && ativo.getAttribute('data-cond-base-busca') === '1') return;
            }
            state.sugestoesBaseAbertas = false;
            atualizarSugestoesBaseColaboradorNoDom();
        }, 140);
    }
    function obterAvisoCondutorDuplicado(nome, idAtual) {
        const alvo = normalizarBuscaBaseColaborador(nome);
        if (!alvo) return '';
        const existente = (Array.isArray(state.condutores) ? state.condutores : []).find(
            c => normalizarBuscaBaseColaborador(c.nome) === alvo && String(c.id) !== String(idAtual || '')
        );
        if (!existente) return '';
        const situacao = existente.ativo === false ? 'inativo' : 'ativo';
        const empresa = existente.empresa ? ` · ${existente.empresa}` : '';
        return `⚠️ Já existe um condutor ${situacao} com este nome na Gestão de Condutores${empresa}. Prefira abrir o registro existente (✏️ Editar) em vez de criar um novo.`;
    }
    function selecionarColaboradorDaBase(indice) {
        const lista = Array.isArray(state.sugestoesBaseAtuais) ? state.sugestoesBaseAtuais : [];
        const c = lista[indice];
        if (!c || !state.modalDados) return;
        const d = state.modalDados;
        d.nome = c.nome;
        if (c.funcao) d.funcao = c.funcao;
        const frenteSugerida = String(c.responsavel || c.setor || '').trim();
        if (frenteSugerida) d.setor_frente = frenteSugerida;
        if (!String(d.empresa || '').trim()) d.empresa = 'COP';
        if (!String(d.vinculo || '').trim()) d.vinculo = 'PROPRIO';
        state.buscaBaseColaborador = '';
        state.sugestoesBaseAbertas = false;
        state.sugestoesBaseAtuais = [];
        state.avisoBaseColaborador = obterAvisoCondutorDuplicado(d.nome, d.id);
        renderizarInterfaceNoContainer();
    }
    function selecionarPrimeiraSugestaoBaseColaborador() {
        const lista = Array.isArray(state.sugestoesBaseAtuais) ? state.sugestoesBaseAtuais : [];
        if (lista.length === 0) return false;
        selecionarColaboradorDaBase(0);
        return true;
    }
    // =========================================================================
    // 7. DELEGAÇÃO DE EVENTOS INTERNA E REVALIDAÇÃO NA VIRADA DO DIA
    // =========================================================================
    function verificarViradaDeDiaSp() {
        const hojeSp = obterDataCivilSaoPauloHoje();
        if (state.ultimaDataCivilSpRenderizada && state.ultimaDataCivilSpRenderizada !== hojeSp) {
            atualizarListaEKpisParcialNoDom();
        }
    }
    async function revalidarAoRetomarFocoOuVisibilidade() {
        verificarViradaDeDiaSp();
        const container = obterContainerModulo();
        if (!container) return;
        if (container.classList && typeof container.classList.contains === 'function') {
            if (!container.classList.contains('active') && !state.carregadoUmaVez && !state.chaveIdentidadeAtiva) {
                return;
            }
        }
        const tinhaLeitura = Boolean(state.statusAuth.autorizadoLeitura);
        const tinhaEscrita = Boolean(state.statusAuth.autorizadoEscrita);
        const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
        if (auth && auth.canceladaPorTrocaSessao) return;
        if (!auth.autenticadoJwt || !auth.autorizadoLeitura || tinhaLeitura !== auth.autorizadoLeitura || tinhaEscrita !== auth.autorizadoEscrita) {
            renderizarInterfaceNoContainer();
        }
    }
    function vincularDelegacaoEventosContainer(container) {
        if (!container || container.dataset.condListenersBound === 'true') return;
        container.dataset.condListenersBound = 'true';
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && !window.__condDayTurnoverBound) {
            window.__condDayTurnoverBound = true;
            window.addEventListener('focus', function () {
                Promise.resolve().then(() => revalidarAoRetomarFocoOuVisibilidade()).catch(() => {});
            });
            if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                document.addEventListener('visibilitychange', function () {
                    if (document.visibilityState === 'visible') {
                        Promise.resolve().then(() => revalidarAoRetomarFocoOuVisibilidade()).catch(() => {});
                    }
                });
            }
        }
        container.addEventListener('click', async function (ev) {
            const sugestaoBase = ev.target && typeof ev.target.closest === 'function'
                ? ev.target.closest('[data-cond-base-idx]')
                : null;
            if (sugestaoBase) {
                selecionarColaboradorDaBase(Number(sugestaoBase.getAttribute('data-cond-base-idx')));
                return;
            }
            const target = ev.target && typeof ev.target.closest === 'function'
                ? ev.target.closest('[data-cond-action]')
                : null;
            if (!target) return;
            const action = target.getAttribute('data-cond-action');
            const condId = target.getAttribute('data-cond-id');
            const avIdx = Number(target.getAttribute('data-av-idx'));
            if (action === 'recarregar') {
                await renderGestaoDeCondutoresPanel({ forcarRecarregamento: true });
                return;
            }
            if (action === 'fechar-toast') {
                state.avisoToastInterno = '';
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'limpar-filtros') {
                state.filtros = {
                    buscaNome: '',
                    setorFrente: 'TODOS',
                    empresa: 'TODAS',
                    vinculo: 'TODOS',
                    atividade: 'TODAS',
                    aptidao: 'TODAS',
                    vencimento: 'TODOS',
                    incluirInativos: true
                };
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'trocar-aba') {
                const aba = target.getAttribute('data-cond-aba');
                if (aba && (aba === 'CONDUTORES' || aba === 'PRONTIDAO_EQUIPES')) {
                    state.abaAtiva = aba;
                    renderizarInterfaceNoContainer();
                }
                return;
            }
            if (action === 'alternar-prontidao-equipes') {
                state.prontidaoEquipesAberta = !state.prontidaoEquipesAberta;
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'filtrar-frente') {
                const fAlvo = target.getAttribute('data-cond-frente') || 'TODOS';
                state.filtros.setorFrente = fAlvo;
                state.abaAtiva = 'CONDUTORES';
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'limpar-filtro-frente') {
                state.filtros.setorFrente = 'TODOS';
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'abrir-novo') {
                abrirModalCadastroCondutor(null);
                return;
            }
            if (action === 'abrir-edicao' && condId) {
                abrirModalCadastroCondutor(condId);
                return;
            }
            if (action === 'abrir-status' && condId) {
                abrirModalStatusCondutor(condId);
                return;
            }
            if (action === 'abrir-comunicacao' && condId) {
                abrirModalComunicacaoCondutor(condId);
                return;
            }
            if (action === 'abrir-historico' && condId) {
                state.modalAtivo = 'HISTORICO';
                state.modalDados = { condutor_id: condId };
                state.erroModal = '';
                renderizarInterfaceNoContainer();
                return;
            }
            if (action === 'copiar-mensagem' && condId) {
                await executarCopiaMensagemAlerta(condId);
                return;
            }
            if (action === 'cancelar-modal') {
                fecharModalAtivo();
                return;
            }
            if (action === 'aplicar-matriz') {
                const codigo = document.getElementById('condModeloMatriz')?.value;
                const modelo = MATRIZ_SST_APROVADA.find(m => m.atividade_codigo === codigo);
                if (modelo && state.modalDados) {
                    state.modalDados.avaliacoes.push({ ...JSON.parse(JSON.stringify(modelo)), avaliacao_id: 'AV_' + gerarUuidV4Fallback(), regra_aprovada: false });
                    renderizarInterfaceNoContainer();
                }
                return;
            }
            if (action === 'adicionar-avaliacao') {
                if (state.modalDados && Array.isArray(state.modalDados.avaliacoes)) {
                    state.modalDados.avaliacoes.push({
                        avaliacao_id: `AV_${gerarUuidV4Fallback()}`,
                        atividade_codigo: '',
                        atividade_nome: '',
                        exige_cnh: 'INDEFINIDO',
                        categorias_aceitas: [],
                        regra_aprovada: false,
                        treinamentos: []
                    });
                    renderizarInterfaceNoContainer();
                }
                return;
            }
            if (action === 'remover-avaliacao' && Number.isInteger(avIdx)) {
                if (state.modalDados && Array.isArray(state.modalDados.avaliacoes)) {
                    state.modalDados.avaliacoes.splice(avIdx, 1);
                    renderizarInterfaceNoContainer();
                }
                return;
            }
            if (action === 'adicionar-treinamento' && Number.isInteger(avIdx)) {
                const av = state.modalDados?.avaliacoes?.[avIdx];
                if (av) {
                    if (!Array.isArray(av.treinamentos)) av.treinamentos = [];
                    av.treinamentos.push({
                        codigo: '',
                        nome: '',
                        status_aplicabilidade: 'PENDENTE_REGRA',
                        exige_validade: 'INDEFINIDO',
                        data_realizacao: '',
                        validade: '',
                        comprovacao_ref: '',
                        conferido_por: '',
                        conferido_em: ''
                    });
                    renderizarInterfaceNoContainer();
                }
                return;
            }
            if (action === 'salvar-cadastro') {
                await submeterModalCadastro();
                return;
            }
            if (action === 'confirmar-vinculo-efetivo' || action === 'remover-vinculo-efetivo') {
                await confirmarVinculoEfetivo(action === 'remover-vinculo-efetivo');
                return;
            }
            if (action === 'salvar-status') {
                await submeterModalStatus();
                return;
            }
            if (action === 'salvar-comunicacao') {
                await submeterModalComunicacao();
            }
        });
        const atualizarCampo = function (el) {
            if (!el) return;
            if (el.getAttribute('data-cond-base-busca') === '1') {
                state.buscaBaseColaborador = el.value;
                state.sugestoesBaseAbertas = true;
                if (state.baseColaboradoresStatus === 'NAO_CARREGADA') {
                    Promise.resolve().then(() => carregarBaseColaboradoresDoEfetivo()).catch(() => {});
                }
                atualizarSugestoesBaseColaboradorNoDom();
                return;
            }
            if (el.id === 'condBuscaFrenteProntidao' || el.getAttribute('data-cond-filter') === 'buscaFrenteProntidao') {
                state.buscaFrenteProntidao = el.value;
                atualizarCardsProntidaoNoDom();
                return;
            }
            const filterKey = el.getAttribute('data-cond-filter');
            if (filterKey) {
                state.filtros[filterKey] = el.value;
                // Atualiza SOMENTE a lista e os KPIs, mantendo o input/select intacto e com foco!
                atualizarListaEKpisParcialNoDom();
                return;
            }
            const formField = el.getAttribute('data-cond-form');
            if (formField && state.modalDados) {
                state.modalDados[formField] = el.value;
                if (formField === 'nome') state.avisoBaseColaborador = '';
                if (formField === 'cnh_validade' && state.modalDados.id) {
                    // Atualiza apenas o bloco de justificativa de alteração da CNH sem recriar o modal!
                    atualizarBlocoAlteracaoCnhModalNoDom();
                }
                return;
            }
            const avField = el.getAttribute('data-cond-av-field');
            if (avField && state.modalDados) {
                const idx = Number(el.getAttribute('data-av-idx'));
                const av = state.modalDados.avaliacoes?.[idx];
                if (av) {
                    if (avField === 'categorias_aceitas') {
                        av.categorias_aceitas = String(el.value || '')
                            .split(',')
                            .map(s => s.trim().toUpperCase())
                            .filter(Boolean);
                    } else {
                        av[avField] = el.value;
                    }
                }
                return;
            }
            const trField = el.getAttribute('data-cond-tr-field');
            if (trField && state.modalDados) {
                const idxAv = Number(el.getAttribute('data-av-idx'));
                const idxTr = Number(el.getAttribute('data-tr-idx'));
                const tr = state.modalDados.avaliacoes?.[idxAv]?.treinamentos?.[idxTr];
                if (tr) {
                    tr[trField] = el.value;
                }
            }
        };
        container.addEventListener('input', function (ev) {
            atualizarCampo(ev.target);
        });
        container.addEventListener('change', function (ev) {
            atualizarCampo(ev.target);
        });
        // Combobox de busca na base do Efetivo (somente leitura): abre ao focar,
        // filtra ao digitar, seleciona com clique ou Enter e fecha com Escape/blur.
        container.addEventListener('focusin', function (ev) {
            const alvo = ev.target;
            if (!alvo || typeof alvo.getAttribute !== 'function') return;
            if (alvo.getAttribute('data-cond-base-busca') !== '1') return;
            state.sugestoesBaseAbertas = true;
            if (state.baseColaboradoresStatus === 'NAO_CARREGADA') {
                Promise.resolve().then(() => carregarBaseColaboradoresDoEfetivo()).catch(() => {});
            }
            atualizarSugestoesBaseColaboradorNoDom();
        });
        container.addEventListener('focusout', function (ev) {
            const alvo = ev.target;
            if (!alvo || typeof alvo.getAttribute !== 'function') return;
            if (alvo.getAttribute('data-cond-base-busca') !== '1') return;
            fecharSugestoesBaseColaboradorComAtraso();
        });
        container.addEventListener('keydown', function (ev) {
            const alvo = ev.target;
            if (!alvo || typeof alvo.getAttribute !== 'function') return;
            if (alvo.getAttribute('data-cond-base-busca') !== '1') return;
            if (ev.key === 'Escape') {
                state.sugestoesBaseAbertas = false;
                atualizarSugestoesBaseColaboradorNoDom();
                return;
            }
            if (ev.key === 'Enter') {
                if (state.sugestoesBaseAbertas && selecionarPrimeiraSugestaoBaseColaborador()) {
                    ev.preventDefault();
                }
            }
        });
    }
    function abrirModalCadastroCondutor(condutorId) {
        state.erroModal = '';
        state.buscaBaseColaborador = '';
        state.sugestoesBaseAbertas = false;
        state.sugestoesBaseAtuais = [];
        state.avisoBaseColaborador = '';
        // Pré-carrega a base do Efetivo (somente leitura) para sugerir nome/função/setor.
        Promise.resolve().then(() => carregarBaseColaboradoresDoEfetivo()).catch(() => {});
        if (!condutorId) {
            state.modalAtivo = 'CADASTRO';
            state.modalDados = {
                id: null,
                versao_esperada: null,
                nome: '',
                vinculo: 'PROPRIO',
                empresa: 'COP',
                funcao: '',
                setor_frente: '',
                observacoes: '',
                cnh_categoria: '',
                cnh_validade: '',
                cnh_validade_original: '',
                modo_alteracao_cnh: 'PRIMEIRO_CADASTRO',
                justificativa_alteracao_cnh: '',
                antecedencia_alerta_dias: state.antecedenciaPadraoDias,
                avaliacoes: []
            };
            renderizarInterfaceNoContainer();
            return;
        }
        const c = state.condutores.find(x => String(x.id) === String(condutorId));
        if (!c) return;
        // Clona dados sem referenciar o objeto original (cancelar descarta alterações!)
        state.modalAtivo = 'CADASTRO';
        state.modalDados = {
            id: c.id,
            versao_esperada: c.versao,
            efetivo_id: c.efetivo_id || null,
            efetivo_id_selecionado: '',
            nome: c.nome || '',
            vinculo: c.vinculo || 'PROPRIO',
            empresa: c.empresa || '',
            funcao: c.funcao || '',
            setor_frente: c.setor_frente || '',
            observacoes: c.observacoes || '',
            cnh_categoria: c.cnh_categoria || '',
            cnh_validade: c.cnh_validade || '',
            cnh_validade_original: c.cnh_validade || '',
            modo_alteracao_cnh: 'MANTIDO',
            justificativa_alteracao_cnh: '',
            antecedencia_alerta_dias: c.antecedencia_alerta_dias || 30,
            avaliacoes: JSON.parse(JSON.stringify(Array.isArray(c.avaliacoes) ? c.avaliacoes : []))
        };
        renderizarInterfaceNoContainer();
    }
    function abrirModalStatusCondutor(condutorId) {
        const c = state.condutores.find(x => String(x.id) === String(condutorId));
        if (!c) return;
        state.erroModal = '';
        state.modalAtivo = 'INATIVAR';
        state.modalDados = {
            condutor_id: c.id,
            nome: c.nome,
            versao_esperada: c.versao,
            novo_ativo: c.ativo === false,
            motivo: ''
        };
        renderizarInterfaceNoContainer();
    }
    function abrirModalComunicacaoCondutor(condutorId) {
        const c = state.condutores.find(x => String(x.id) === String(condutorId));
        if (!c) return;
        const cnh = calcularSituacaoCnh(c);
        state.erroModal = '';
        state.modalAtivo = 'COMUNICACAO';
        state.modalDados = {
            condutor_id: c.id,
            nome: c.nome,
            cnh_ciclo_id_esperado: cnh.cnhCicloId || '',
            vencimento_comunicado: cnh.validade || '',
            estagio_no_momento: cnh.vencida ? 'VENCIDA' : (cnh.venceHoje ? 'VENCE_HOJE' : 'A_VENCER'),
            canal: 'WHATSAPP',
            motivo: '',
            permitir_ciclo_historico: false
        };
        renderizarInterfaceNoContainer();
    }
    function fecharModalAtivo() {
        state.modalAtivo = null;
        state.modalDados = null;
        state.erroModal = '';
        state.salvandoModal = false;
        state.buscaBaseColaborador = '';
        state.sugestoesBaseAbertas = false;
        state.sugestoesBaseAtuais = [];
        state.avisoBaseColaborador = '';
        renderizarInterfaceNoContainer();
    }
    async function executarCopiaMensagemAlerta(condutorId) {
        const c = state.condutores.find(x => String(x.id) === String(condutorId));
        if (!c) return;
        const snapVisualInicial = lerSnapshotSessaoVisualSincrono();
        const geracaoNoInicio = state.geracaoSessao;
        const chaveNoInicio = state.chaveIdentidadeAtiva;
        const txt = gerarTextoComunicacaoPtBr(c);
        state.ultimoTextoCopiado = txt;
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(txt);
            }
        } catch (_) {
            // Mantém em ultimoTextoCopiado
        }
        if (
            state.geracaoSessao !== geracaoNoInicio ||
            state.chaveIdentidadeAtiva !== chaveNoInicio ||
            !mesmaSessaoVisualSincrona(snapVisualInicial, lerSnapshotSessaoVisualSincrono())
        ) {
            return;
        }
        // Copiar NUNCA registra comunicação nem altera contadores!
        state.avisoToastInterno = `📋 Texto copiado para ${extrairPrimeiroNome(c.nome)} (Atenção: copiar o texto NÃO baixa a pendência de comunicação; registre formalmente após comunicar).`;
        renderizarInterfaceNoContainer();
    }
    function capturarContextoSubmissaoModal() {
        return {
            snapVisualInicial: lerSnapshotSessaoVisualSincrono(),
            chaveInicial: state.chaveIdentidadeAtiva,
            geracaoInicial: state.geracaoSessao,
            uidInicial: state.statusAuth ? state.statusAuth.uid : null,
            modalTipoInicial: state.modalAtivo,
            modalDadosRef: state.modalDados
        };
    }
    function operacaoModalAindaPertenceASessaoEModal(ctx) {
        if (!ctx) return false;
        return (
            mesmaSessaoVisualSincrona(ctx.snapVisualInicial, lerSnapshotSessaoVisualSincrono()) &&
            state.chaveIdentidadeAtiva === ctx.chaveInicial &&
            state.geracaoSessao === ctx.geracaoInicial &&
            state.statusAuth.uid === ctx.uidInicial &&
            state.modalAtivo === ctx.modalTipoInicial &&
            state.modalDados === ctx.modalDadosRef
        );
    }
    async function confirmarVinculoEfetivo(remover) {
        if (state.salvandoModal || state.modalAtivo !== 'CADASTRO' || !state.modalDados?.id) return;
        const ctx = capturarContextoSubmissaoModal();
        const d = ctx.modalDadosRef;
        const idEfetivo = remover ? null : String(d.efetivo_id_selecionado || '').trim();
        state.erroModal = '';
        state.salvandoModal = true;
        try {
            if (d.vinculo !== 'PROPRIO' || (!remover && !idEfetivo)) throw new Error('Selecione explicitamente uma pessoa do Efetivo para confirmar o vínculo.');
            const auth = await verificarSessaoEAutorizacaoModulo({ revalidarCapacidadeBanco: true });
            if (!operacaoModalAindaPertenceASessaoEModal(ctx)) return;
            if (!auth.autorizadoEscrita || !contextoAuthAindaAtivo(auth, ctx.snapVisualInicial)) throw new Error('Sem permissão de escrita verificada.');
            const resposta = await requisitarBancoCondutores('/rest/v1/rpc/vincular_condutor_efetivo', {
                method: 'POST', authConfirmada: auth, snapVisualInicial: ctx.snapVisualInicial, exigirEscrita: true,
                body: { p_condutor_id: d.id, p_versao_esperada: d.versao_esperada, p_efetivo_id: idEfetivo }
            });
            if (!operacaoModalAindaPertenceASessaoEModal(ctx)) return;
            const salvo = Array.isArray(resposta) ? resposta[0] : resposta;
            if (!salvo?.id) throw new Error('O banco não confirmou o vínculo. Recarregue antes de tentar novamente.');
            atualizarRegistroEmMemoria(salvo, auth, ctx.snapVisualInicial);
            d.versao_esperada = salvo.versao;
            d.efetivo_id = salvo.efetivo_id || null;
            d.efetivo_id_selecionado = '';
        } catch (err) {
            if (operacaoModalAindaPertenceASessaoEModal(ctx)) state.erroModal = err.message || 'Falha ao confirmar vínculo. Recarregue para conferir.';
        } finally {
            if (operacaoModalAindaPertenceASessaoEModal(ctx)) {
                state.salvandoModal = false;
                renderizarInterfaceNoContainer();
            }
        }
    }
    async function submeterModalCadastro() {
        if (!state.modalDados || state.salvandoModal) return;
        const ctxModal = capturarContextoSubmissaoModal();
        const payload = state.modalDados;
        state.salvandoModal = true;
        state.erroModal = '';
        renderizarInterfaceNoContainer();
        try {
            const salvo = await persistirCadastroOuEdicaoCondutor(payload);
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal) || (salvo && salvo.__descartadoPorTrocaSessao)) {
                return;
            }
            state.salvandoModal = false;
            state.modalAtivo = null;
            state.modalDados = null;
            state.avisoToastInterno = '✅ Cadastro do condutor salvo com sucesso.';
            renderizarInterfaceNoContainer();
        } catch (err) {
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal)) {
                return;
            }
            state.salvandoModal = false;
            state.erroModal = err && err.message ? err.message : 'Erro ao salvar condutor.';
            renderizarInterfaceNoContainer();
        }
    }
    async function submeterModalStatus() {
        if (!state.modalDados || state.salvandoModal) return;
        const ctxModal = capturarContextoSubmissaoModal();
        const d = state.modalDados;
        state.salvandoModal = true;
        state.erroModal = '';
        renderizarInterfaceNoContainer();
        try {
            const salvo = await persistirAlteracaoStatusCondutor(d.condutor_id, d.versao_esperada, d.novo_ativo, d.motivo);
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal) || (salvo && salvo.__descartadoPorTrocaSessao)) {
                return;
            }
            state.salvandoModal = false;
            state.modalAtivo = null;
            state.modalDados = null;
            state.avisoToastInterno = d.novo_ativo
                ? '✅ Condutor reativado com sucesso.'
                : '⏸️ Condutor inativado com sucesso (histórico preservado).';
            renderizarInterfaceNoContainer();
        } catch (err) {
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal)) {
                return;
            }
            state.salvandoModal = false;
            state.erroModal = err && err.message ? err.message : 'Erro ao alterar status.';
            renderizarInterfaceNoContainer();
        }
    }
    async function submeterModalComunicacao() {
        if (!state.modalDados || state.salvandoModal) return;
        const ctxModal = capturarContextoSubmissaoModal();
        const payload = state.modalDados;
        state.salvandoModal = true;
        state.erroModal = '';
        renderizarInterfaceNoContainer();
        try {
            const salvo = await persistirComunicacaoExplicita(payload);
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal) || (salvo && salvo.__descartadoPorTrocaSessao)) {
                return;
            }
            state.salvandoModal = false;
            state.modalAtivo = null;
            state.modalDados = null;
            state.avisoToastInterno = '📨 Comunicação registrada com sucesso.';
            renderizarInterfaceNoContainer();
        } catch (err) {
            if (!operacaoModalAindaPertenceASessaoEModal(ctxModal)) {
                return;
            }
            state.salvandoModal = false;
            state.erroModal = err && err.message ? err.message : 'Erro ao registrar comunicação.';
            renderizarInterfaceNoContainer();
        }
    }
    // =========================================================================
    // 8. PONTO DE ENTRADA ÚNICO EXPOSTO NO PRODUTO (SEM ESCAPE DE HARNESS)
    // =========================================================================
    async function renderGestaoDeCondutoresPanel(opcoes) {
        const opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        // Sempre revalida sessão, vínculo de identidade e capacidades no banco ao entrar/retornar ao módulo
        const auth = await verificarSessaoEAutorizacaoModulo({
            revalidarCapacidadeBanco: true
        });
        if (auth && auth.canceladaPorTrocaSessao) {
            return;
        }
        if (!auth.autenticadoJwt || !auth.autorizadoLeitura) {
            renderizarInterfaceNoContainer();
            return;
        }
        const fontesPendentes = carregarFontesResumo();
        renderizarInterfaceNoContainer();
        if (!await fontesPendentes) return;
        if (opts.forcarRecarregamento || !state.carregadoUmaVez) {
            await carregarCondutoresDoBanco();
        } else {
            renderizarInterfaceNoContainer();
        }
        // Base do Efetivo: leitura opcional em segundo plano, nunca bloqueia o módulo.
        Promise.resolve().then(() => carregarBaseColaboradoresDoEfetivo()).catch(() => {});
    }
    // Exportação única permitida no escopo global
    window.renderGestaoDeCondutoresPanel = renderGestaoDeCondutoresPanel;
})(window);
