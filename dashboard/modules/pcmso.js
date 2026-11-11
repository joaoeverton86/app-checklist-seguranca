// ==============================================================================
// MODULO: PCMSO (PROGRAMA DE CONTROLE MEDICO DE SAUDE OCUPACIONAL — NR-07)
// Consorcio Operador Ramal do Agreste (PISF)
// Responsavel Tecnico: Dr. Cicero Henrique Pereira de Menezes (CRM 19464-PE / RQE 15606)
// Gestao SST: Joao Everton (Engenheiro de Seguranca do Trabalho)
// ==============================================================================

(function(window, document) {
    'use strict';

    // --------------------------------------------------------------------------
    // ESTADO DO DOCUMENTO-BASE DO PCMSO
    // --------------------------------------------------------------------------
    var pcmsoDocBaseDraft = null;
    var pcmsoDocBaseLoaded = false;
    var pcmsoDocBaseLoading = false;
    var pcmsoDocBaseSaving = false;
    var pcmsoDocBaseDirty = false;
    var pcmsoDocBaseLoadError = null;
    var pcmsoCatalogoLoading = null;
    var pcmsoCatalogoLoadError = null;

    // Controle de sessao e CAS (Compare-And-Swap)
    var pcmsoDocBaseSessionId = 0;
    var pcmsoDocBaseRemotoExiste = false;
    var pcmsoDocBaseBaseAtualizadoEm = null;
    var pcmsoDocBaseBaseValorJson = null;
    var pcmsoDocBaseSavedSnapshotJson = null;
    var pcmsoDocBaseBaselineDraftJson = null;
    var pcmsoDocBaseLatestGen = 0;

    // --------------------------------------------------------------------------
    // VALORES PADRAO OFICIAIS DO PCMSO (NR-07)
    // --------------------------------------------------------------------------
    function obterPcmsoDocBaseDefaults() {
        return {
            codigo_documento: 'PCMSO.SMS.001',
            titulo_oficial: 'PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL — PCMSO (NR-07)',
            revisao_atual: '00',
            data_emissao: '2026-07-20',
            vigencia_inicio: '2026-07-20',
            vigencia_fim: '2027-07-20',
            municipio_uf: 'Arcoverde - PE',
            enquadramento_normativo: 'NR-07 — Portaria SEPRT nº 6.734/2020, articulada com a NR-01 (GRO/PGR)',
            abrangencia_operacional: 'Obras de infraestrutura hídrica, operação de estações de bombeamento e manutenção do Ramal do Agreste Pernambucano (PISF)',
            razao_social: 'CONSORCIO OPERADOR RAMAL DO AGRESTE',
            cnpj: '55.623.017/0001-97',
            cnae_principal: '7112-0/00',
            atividade_principal: 'Serviços de engenharia',
            grau_risco: '1',

            // Medico do Trabalho Coordenador / Responsavel Tecnico
            medico_coordenador: {
                nome: 'Dr. Cícero Henrique Pereira de Menezes',
                crm: '19464-PE',
                rqe: '15606',
                cpf: '', // Preenchimento operacional pelo gestor
                titulacao: 'Médico do Trabalho RQE 15606',
                papel: 'Médico do Trabalho Coordenador do PCMSO',
                endereco: 'Arcoverde / Sertão de Pernambuco'
            },

            // Representantes Legais do Consorcio
            representantes_legais: [
                {
                    nome: 'Devair Osvaldo Pereira',
                    cpf: '', // Preenchimento operacional pelo gestor
                    cargo: 'Diretor de Contrato / Representante Legal',
                    papel: 'Representante Legal da Empresa'
                },
                {
                    nome: 'José Carlos Pereira Trigo Júnior',
                    cpf: '', // Preenchimento operacional pelo gestor
                    cargo: 'Gerente Operacional / Representante Legal',
                    papel: 'Representante Legal da Empresa'
                }
            ],

            // Medicos Examinadores Credenciados e Equipe de Apoio em Saude
            medicos_examinadores: [
                {
                    nome: 'Dr. Cícero Henrique Pereira de Menezes',
                    crm: '19464-PE',
                    cidade_uf: 'Arcoverde - PE',
                    papel: 'Médico Examinador e Coordenador'
                }
            ],

            // Historico de Revisoes Oficiais
            historico_revisoes: [
                {
                    revisao: '00',
                    data: '2026-07-20',
                    descricao: 'Elaboração e implantação inicial do PCMSO (NR-07) do Consórcio Ramal do Agreste, articulado com o Inventário de Riscos do PGR (NR-01).',
                    responsavel: 'Dr. Cícero Henrique Pereira de Menezes'
                }
            ],

            // Diretrizes Tecnicas e Procedimentos Clinicos (NR-07)
            diretrizes_clinicas: {
                criterio_admissional: 'O exame admissional deve ser realizado antes que o trabalhador assuma suas atividades, constando de anamnese ocupacional, exame físico e mental, e exames complementares específicos definidos para o GHE.',
                criterio_periodico: 'Avaliação clínica ocupacional anual (12 meses) para trabalhadores expostos a riscos ocupacionais identificados no PGR ou portadores de doenças crônicas, e bienal (24 meses) para atividades exclusivamente administrativas sem riscos físicos, químicos ou biológicos.',
                criterio_retorno_trabalho: 'Obrigatório no primeiro dia de retorno ao trabalho para colaborador ausente por período igual ou superior a 30 dias por doença ou acidente (ocupacional ou não) ou parto.',
                criterio_mudanca_risco: 'Obrigatório antes da data da mudança de função ou transferência de setor sempre que houver alteração na exposição aos fatores de risco ocupacionais.',
                criterio_demissional: 'Realizado obrigatoriamente até 135 dias após o último exame ocupacional para estabelecimentos de grau de risco 1 e 2, ou até 90 dias para graus de risco 3 e 4, observada a dispensação ou prorrogação conforme critérios da NR-07.',
                requisitos_minimos_aso: 'O Atestado de Saúde Ocupacional (ASO) é disponibilizado formalmente ao colaborador física ou eletronicamente mediante recibo ou confirmação de recebimento (NR-07 item 7.5.19), contendo identificação cadastral, perigos e fatores de risco do PGR ou sua ausência, indicação e datas dos exames complementares realizados, definição clara de APTO ou INAPTO para a função, identificação do médico examinador com CRM e data de emissão.',
                condutas_exames_alterados: 'Havendo suspeita ou confirmação de agravo à saúde relacionado ao trabalho: emitir CAT imediatamente; afastar o trabalhador da atividade ou risco; encaminhar à Previdência Social quando afastamento > 15 dias; notificar a Engenharia de Segurança para reavaliar os riscos no PGR e implementar medidas corretivas.'
            },

            // Programa de Imunizacao e Cuidados de Primeiros Socorros
            imunizacoes_primeiros_socorros: {
                vacina_antitetanica: 'Exigência de esquema vacinal completo e atualizado (Difteria e Tétano — dT a cada 10 anos, ou a cada 5 anos em caso de ferimentos profundos) para todo o efetivo de campo, manutenção civil, mecânica e conservação de faixa de servidão.',
                vacina_sazonal: 'Campanhas anuais de vacinação contra influenza (gripe) e estímulo à imunização conforme calendário nacional do Ministério da Saúde.',
                primeiros_socorros: 'Manutenção de caixas/kits de primeiros socorros padronizados nas frentes operacionais de campo, estações de bombeamento (EB) e sede administrativa, contendo soro fisiológico, gazes estéreis, ataduras, antissépticos, esparadrapo, luvas de procedimento descartáveis e bolsas térmicas.'
            },

            // Cronograma Anual de Acoes Preventivas de Saude (NR-07 item 7.5)
            cronograma_acoes_saude: [
                {
                    mes: 'Janeiro a Julho',
                    acao: 'Convocação e Realização dos Exames Periódicos e Audiometrias dos GHEs operacionais e de campo',
                    responsavel: 'SESMT / Medicina do Trabalho'
                },
                {
                    mes: 'Abril',
                    acao: 'Campanha de Imunização e Atualização do Cartão de Vacinas (Tétano, Gripe e Febre Amarela)',
                    responsavel: 'Enfermagem do Trabalho'
                },
                {
                    mes: 'Maio',
                    acao: 'Campanha de Combate à Hipertensão e Diabetes (Aferição de Pressão Arterial e Glicemia Capilar)',
                    responsavel: 'Medicina e Enfermagem do Trabalho'
                },
                {
                    mes: 'Junho',
                    acao: 'Mutirão de Saúde Mental e Avaliação Psicossocial (Trabalho em Altura NR-35 e Espaço Confinado NR-33)',
                    responsavel: 'Psicologia Ocupacional / SESMT'
                },
                {
                    mes: 'Agosto',
                    acao: 'Programa de Prevenção de Dores Osteomusculares, Ginástica Laboral e Pausas Ergonômicas (NR-17)',
                    responsavel: 'Fisioterapia / SESMT'
                },
                {
                    mes: 'Outubro e Novembro',
                    acao: 'Campanhas Outubro Rosa e Novembro Azul — Prevenção ao Câncer e Estilo de Vida Saudável',
                    responsavel: 'Comitê de Saúde / CIPA'
                }
            ],

            // ------------------------------------------------------------------
            // PROTOCOLOS MEDICOS ESPECIFICOS POR FATOR DE RISCO (ETAPA 3 - NR-07)
            // Minuta técnica para avaliação e homologação do Dr. Cícero Henrique
            // ------------------------------------------------------------------
            protocolos_especificos: {
                pca_ruido: {
                    titulo: 'Protocolo de Conservação Auditiva (PCA — NR-07 Anexo II)',
                    criterio_inclusao: 'Trabalhadores com exposição ocupacional a Níveis de Pressão Sonora elevados (acima do Nível de Ação > 80 dB(A) e Limite de Tolerância > 85 dB(A)), abrangendo mecânicos, operadores de motobomba, soldadores, britadores e ajudantes operacionais.',
                    repouso_acustico: 'Repouso auditivo obrigatório de no mínimo 14 horas sem exposição a ruído ocupacional antes do exame audiométrico ocupacional (NR-07 Anexo II, item 3.4).',
                    periodicidade: 'Mínimo regulamentar da NR-07 (Anexo II, item 4.1): Admissional, Periódico Anual e Demissional. Observação médica: O médico coordenador pode instituir acompanhamento semestral suplementar no primeiro ano como diretriz de vigilância preventiva.',
                    criterios_interpretacao: 'Avaliação das frequências aéreas regulamentadas de 500, 1000, 2000, 3000, 4000, 6000 e 8000 Hz, e via óssea nas frequências alteradas de 500 a 4000 Hz (NR-07 Anexo II, item 3.6). Diagnóstico diferencial de PAIR (entalhe neurosensorial em 3kHz, 4kHz ou 6kHz) versus perdas condutivas ou mistas.',
                    condutas_exames_alterados: 'Havendo desencadeamento ou agravamento de PAIR: 1) Repetir audiometria confirmatória; 2) Emitir CAT se estabelecido nexo causal com o trabalho; 3) Reavaliar atenuação do protetor auditivo (concha/plugue); 4) Notificar formalmente o SESMT para controle do ruído na fonte e atualização do PGR.'
                },
                monitoramento_respiratorio: {
                    titulo: 'Protocolo de Vigilância da Saúde Respiratória (NR-07 Anexo III e PGR)',
                    criterio_inclusao: 'Trabalhadores expostos a poeiras minerais contendo sílica livre cristalizada (escavação, britagem, desmonte de rocha e terraplanagem — NR-07 Anexo III, Quadro 1) e fumos metálicos de soldagem.',
                    metodologia_raiox: 'Telerradiografia de Tórax em Póstero-Anterior (PA) em filme 35x43cm ou sistema digital de alta resolução, interpretada obrigatoriamente segundo a Classificação Radiológica Internacional da OIT para Pneumoconioses (Padrão OIT) por leitor qualificado (NR-07 Anexo III).',
                    metodologia_espirometria: 'Prova de Função Pulmonar (Espirometria Ocupacional) com parâmetros de CVF, VEF1 e razão VEF1/CVF, adotando os critérios de aceitabilidade e reprodutibilidade da Sociedade Brasileira de Pneumologia e Tisiologia (SBPT).',
                    periodicidade: 'Conforme Anexo III da NR-07: Admissional e Periódica Bienal (2 em 2 anos) para poeiras com sílica, ou anual para frentes com exposição comprovada acima do nível de ação no PGR conforme juízo do médico coordenador.',
                    condutas_exames_alterados: 'Queda acentuada de parâmetros funcionais (VEF1) ou opacidades radiológicas: afastar cautelarmente da frente com poeira/fumo, encaminhar para avaliação pneumológica especializada e notificar o SESMT para revisão da exaustão e proteção PFF2/PFF3.'
                },
                atividades_criticas: {
                    titulo: 'Protocolo de Aptidão Clínica e Psicossocial para Atividades Críticas (NR-35, NR-33 e item 7.5.18 da NR-07)',
                    criterio_inclusao: 'Colaboradores designados para trabalho em altura (nível superior a 2,00m com risco de queda - NR-35) e espaços confinados (estações de bombeamento subterrâneas, poços de sucção e galerias - NR-33).',
                    exames_obrigatorios: 'Proposta de exames complementares específicos definidos e justificados pelo médico coordenador com base no item 7.5.18 da NR-07: Avaliação Clínica Completa + ECG + EEG + Glicemia em Jejum + Hemograma Completo + Avaliação Psicossocial.',
                    criterios_aptidao_clinica: 'Critérios clínicos estabelecidos pelo Médico do Trabalho: higidez cardiovascular (ausência de arritmias ou descompensação pressórica), neurológica (ausência de síncopes ou crises convulsivas recentes) e metabólica.',
                    avaliacao_psicossocial: 'Avaliação psicossocial estruturada rastreando acrofobia, claustrofobia, transtornos de pânico/ansiedade, desmaios, crises de vertigem e uso de medicamentos psicoativos com ação sedativa.',
                    validade_aptidao: 'Validade máxima recomendada de 1 (um) ano para o parecer de aptidão específica de altura/confinado no ASO. Ocorrência de mal súbito, acidente ou afastamento > 30 dias revoga a aptidão até nova avaliação clínica.'
                },
                alimentos_saneamento: {
                    titulo: 'Protocolo de Sanidade para Manipulação de Alimentos e Apoio Sanitário',
                    criterio_inclusao: 'Cozinheiros, ajudantes de cozinha, operadores de refeitório e equipes de manutenção predial e esgotamento sanitário.',
                    exames_obrigatorios: 'Exame Parasitológico de Fezes (EPF com 3 amostras) e Coprocultura para manipuladores de alimentos; perfil vacinal atualizado (Hepatite A e B, Tétano dT).',
                    periodicidade: 'Admissional e Periódica Semestral ou Anual conforme definição técnica do médico coordenador.',
                    condutas_exames_alterados: 'Resultado positivo para parasitas ou enteropatógenos: afastamento temporário imediato da manipulação de alimentos, tratamento medicamentoso específico prescrito pelo médico e retorno somente após novo EPF negativo.'
                }
            },

            // Validação e Homologação Clínica do Médico do Trabalho Coordenador

            validacao_medico_coordenador: {
                homologado: false, // Requer chancela formal do Dr. Cícero / CRM 19464-PE
                data_homologacao: '',
                parecer_tecnico: ''
            }
        };
    }

    // --------------------------------------------------------------------------
    // NORMALIZACAO E SANITIZACAO DE DADOS DO DOCUMENTO-BASE
    // --------------------------------------------------------------------------
    function normalizarPcmsoDocBase(raw) {
        var base = obterPcmsoDocBaseDefaults();
        if (!raw || typeof raw !== 'object') return base;

        var pick = function(val, fallback) {
            return (val !== undefined && val !== null) ? String(val).trim() : fallback;
        };

        var medRaw = (raw.medico_coordenador && typeof raw.medico_coordenador === 'object') ? raw.medico_coordenador : {};
        var dirRaw = (raw.diretrizes_clinicas && typeof raw.diretrizes_clinicas === 'object') ? raw.diretrizes_clinicas : {};
        var imuRaw = (raw.imunizacoes_primeiros_socorros && typeof raw.imunizacoes_primeiros_socorros === 'object') ? raw.imunizacoes_primeiros_socorros : {};
        var protRaw = (raw.protocolos_especificos && typeof raw.protocolos_especificos === 'object') ? raw.protocolos_especificos : {};
        var pcaRaw = (protRaw.pca_ruido && typeof protRaw.pca_ruido === 'object') ? protRaw.pca_ruido : {};
        var respRaw = (protRaw.monitoramento_respiratorio && typeof protRaw.monitoramento_respiratorio === 'object') ? protRaw.monitoramento_respiratorio : {};
        var critRaw = (protRaw.atividades_criticas && typeof protRaw.atividades_criticas === 'object') ? protRaw.atividades_criticas : {};
        var alimRaw = (protRaw.alimentos_saneamento && typeof protRaw.alimentos_saneamento === 'object') ? protRaw.alimentos_saneamento : {};

        var clean = {
            codigo_documento: pick(raw.codigo_documento, base.codigo_documento),
            titulo_oficial: pick(raw.titulo_oficial, base.titulo_oficial),
            revisao_atual: pick(raw.revisao_atual, base.revisao_atual),
            data_emissao: pick(raw.data_emissao, base.data_emissao),
            vigencia_inicio: pick(raw.vigencia_inicio, base.vigencia_inicio),
            vigencia_fim: pick(raw.vigencia_fim, base.vigencia_fim),
            municipio_uf: pick(raw.municipio_uf, base.municipio_uf),
            enquadramento_normativo: pick(raw.enquadramento_normativo, base.enquadramento_normativo),
            abrangencia_operacional: pick(raw.abrangencia_operacional, base.abrangencia_operacional),
            razao_social: pick(raw.razao_social, base.razao_social),
            cnpj: pick(raw.cnpj, base.cnpj),
            cnae_principal: pick(raw.cnae_principal, base.cnae_principal),
            atividade_principal: pick(raw.atividade_principal, base.atividade_principal),
            grau_risco: pick(raw.grau_risco, base.grau_risco),

            medico_coordenador: {
                nome: pick(medRaw.nome, base.medico_coordenador.nome),
                crm: pick(medRaw.crm, base.medico_coordenador.crm),
                rqe: pick(medRaw.rqe, base.medico_coordenador.rqe),
                cpf: pick(medRaw.cpf, base.medico_coordenador.cpf),
                titulacao: pick(medRaw.titulacao, base.medico_coordenador.titulacao),
                papel: pick(medRaw.papel, base.medico_coordenador.papel),
                endereco: pick(medRaw.endereco, base.medico_coordenador.endereco)
            },

            representantes_legais: Array.isArray(raw.representantes_legais) && raw.representantes_legais.length > 0
                ? raw.representantes_legais.map(function(rep) {
                    return {
                        nome: String(rep.nome || '').trim(),
                        cpf: String(rep.cpf || '').trim(),
                        cargo: String(rep.cargo || '').trim(),
                        papel: String(rep.papel || 'Representante Legal da Empresa').trim()
                    };
                }).filter(function(r) { return r.nome || r.cargo; })
                : base.representantes_legais,

            medicos_examinadores: Array.isArray(raw.medicos_examinadores) && raw.medicos_examinadores.length > 0
                ? raw.medicos_examinadores.map(function(m) {
                    return {
                        nome: String(m.nome || '').trim(),
                        crm: String(m.crm || '').trim(),
                        cidade_uf: String(m.cidade_uf || '').trim(),
                        papel: String(m.papel || 'Médico Examinador').trim()
                    };
                }).filter(function(m) { return m.nome || m.crm; })
                : base.medicos_examinadores,

            historico_revisoes: Array.isArray(raw.historico_revisoes) && raw.historico_revisoes.length > 0
                ? raw.historico_revisoes.map(function(rev) {
                    return {
                        revisao: String(rev.revisao || '').trim(),
                        data: String(rev.data || '').trim(),
                        descricao: String(rev.descricao || '').trim(),
                        responsavel: String(rev.responsavel || '').trim()
                    };
                }).filter(function(rev) { return rev.revisao || rev.descricao; })
                : base.historico_revisoes,

            diretrizes_clinicas: {
                criterio_admissional: pick(dirRaw.criterio_admissional, base.diretrizes_clinicas.criterio_admissional),
                criterio_periodico: pick(dirRaw.criterio_periodico, base.diretrizes_clinicas.criterio_periodico),
                criterio_retorno_trabalho: pick(dirRaw.criterio_retorno_trabalho, base.diretrizes_clinicas.criterio_retorno_trabalho),
                criterio_mudanca_risco: pick(dirRaw.criterio_mudanca_risco, base.diretrizes_clinicas.criterio_mudanca_risco),
                criterio_demissional: pick(dirRaw.criterio_demissional, base.diretrizes_clinicas.criterio_demissional),
                requisitos_minimos_aso: pick(dirRaw.requisitos_minimos_aso, base.diretrizes_clinicas.requisitos_minimos_aso),
                condutas_exames_alterados: pick(dirRaw.condutas_exames_alterados, base.diretrizes_clinicas.condutas_exames_alterados)
            },

            imunizacoes_primeiros_socorros: {
                vacina_antitetanica: pick(imuRaw.vacina_antitetanica, base.imunizacoes_primeiros_socorros.vacina_antitetanica),
                vacina_sazonal: pick(imuRaw.vacina_sazonal, base.imunizacoes_primeiros_socorros.vacina_sazonal),
                primeiros_socorros: pick(imuRaw.primeiros_socorros, base.imunizacoes_primeiros_socorros.primeiros_socorros)
            },

            cronograma_acoes_saude: Array.isArray(raw.cronograma_acoes_saude) && raw.cronograma_acoes_saude.length > 0
                ? raw.cronograma_acoes_saude.map(function(item) {
                    return {
                        mes: String(item.mes || '').trim(),
                        acao: String(item.acao || '').trim(),
                        responsavel: String(item.responsavel || '').trim()
                    };
                }).filter(function(i) { return i.mes || i.acao; })
                : base.cronograma_acoes_saude,

            protocolos_especificos: {
                pca_ruido: {
                    titulo: pick(pcaRaw.titulo, base.protocolos_especificos.pca_ruido.titulo),
                    criterio_inclusao: pick(pcaRaw.criterio_inclusao, base.protocolos_especificos.pca_ruido.criterio_inclusao),
                    repouso_acustico: pick(pcaRaw.repouso_acustico, base.protocolos_especificos.pca_ruido.repouso_acustico),
                    periodicidade: pick(pcaRaw.periodicidade, base.protocolos_especificos.pca_ruido.periodicidade),
                    criterios_interpretacao: pick(pcaRaw.criterios_interpretacao, base.protocolos_especificos.pca_ruido.criterios_interpretacao),
                    condutas_exames_alterados: pick(pcaRaw.condutas_exames_alterados, base.protocolos_especificos.pca_ruido.condutas_exames_alterados)
                },
                monitoramento_respiratorio: {
                    titulo: pick(respRaw.titulo, base.protocolos_especificos.monitoramento_respiratorio.titulo),
                    criterio_inclusao: pick(respRaw.criterio_inclusao, base.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao),
                    metodologia_raiox: pick(respRaw.metodologia_raiox, base.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox),
                    metodologia_espirometria: pick(respRaw.metodologia_espirometria, base.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria),
                    periodicidade: pick(respRaw.periodicidade, base.protocolos_especificos.monitoramento_respiratorio.periodicidade),
                    condutas_exames_alterados: pick(respRaw.condutas_exames_alterados, base.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados)
                },
                atividades_criticas: {
                    titulo: pick(critRaw.titulo, base.protocolos_especificos.atividades_criticas.titulo),
                    criterio_inclusao: pick(critRaw.criterio_inclusao, base.protocolos_especificos.atividades_criticas.criterio_inclusao),
                    exames_obrigatorios: pick(critRaw.exames_obrigatorios, base.protocolos_especificos.atividades_criticas.exames_obrigatorios),
                    criterios_aptidao_clinica: pick(critRaw.criterios_aptidao_clinica, base.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica),
                    avaliacao_psicossocial: pick(critRaw.avaliacao_psicossocial, base.protocolos_especificos.atividades_criticas.avaliacao_psicossocial),
                    validade_aptidao: pick(critRaw.validade_aptidao, base.protocolos_especificos.atividades_criticas.validade_aptidao)
                },
                alimentos_saneamento: {
                    titulo: pick(alimRaw.titulo, base.protocolos_especificos.alimentos_saneamento.titulo),
                    criterio_inclusao: pick(alimRaw.criterio_inclusao, base.protocolos_especificos.alimentos_saneamento.criterio_inclusao),
                    exames_obrigatorios: pick(alimRaw.exames_obrigatorios, base.protocolos_especificos.alimentos_saneamento.exames_obrigatorios),
                    periodicidade: pick(alimRaw.periodicidade, base.protocolos_especificos.alimentos_saneamento.periodicidade),
                    condutas_exames_alterados: pick(alimRaw.condutas_exames_alterados, base.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados)
                }
            },

            validacao_medico_coordenador: {
                homologado: !!raw.validacao_medico_coordenador && raw.validacao_medico_coordenador.homologado === true,
                data_homologacao: String((raw.validacao_medico_coordenador && raw.validacao_medico_coordenador.data_homologacao) || '').trim(),
                parecer_tecnico: String((raw.validacao_medico_coordenador && raw.validacao_medico_coordenador.parecer_tecnico) || '').trim()
            }
        };

        return clean;
    }

    // --------------------------------------------------------------------------
    // AVALIACAO DE PRONTIDAO PARA EMISSAO OFICIAL DO PCMSO
    // --------------------------------------------------------------------------
    function avaliarProntidaoEmissaoPcmsoDocBase(doc) {
        var pendencias = [];
        if (!doc) {
            return { pronto: false, status: 'RASCUNHO_INCOMPLETO', pendencias: ['Documento não instanciado'] };
        }

        if (!doc.codigo_documento) pendencias.push('Código documental do PCMSO');
        if (!doc.titulo_oficial) pendencias.push('Título oficial do PCMSO');
        if (doc.revisao_atual === undefined || doc.revisao_atual === null || doc.revisao_atual === '') pendencias.push('Número da Revisão Vigente');
        if (!doc.data_emissao) pendencias.push('Data de Emissão do PCMSO');
        if (!doc.vigencia_inicio || !doc.vigencia_fim) pendencias.push('Período de Vigência');

        // Medico Coordenador
        if (!doc.medico_coordenador || !doc.medico_coordenador.nome) pendencias.push('Nome do Médico do Trabalho Coordenador');
        if (!doc.medico_coordenador || !doc.medico_coordenador.crm) pendencias.push('CRM do Médico Coordenador');

        // Representantes Legais
        if (!Array.isArray(doc.representantes_legais) || doc.representantes_legais.length === 0 || !doc.representantes_legais[0].nome) {
            pendencias.push('Ao menos um Representante Legal da Empresa');
        }

        // Não autorizar prontidão de emissão se o documento nunca foi persistido/confirmado no banco
        if (!pcmsoDocBaseRemotoExiste && !pcmsoDocBaseSavedSnapshotJson) {
            pendencias.push('Confirmação e salvamento do Documento-Base no banco de dados');
        }

        // Exigência de Homologação Clínica Formal pelo Médico Coordenador
        if (!doc.validacao_medico_coordenador || doc.validacao_medico_coordenador.homologado !== true) {
            var medDesc = (doc.medico_coordenador && doc.medico_coordenador.nome)
                ? (doc.medico_coordenador.nome + (doc.medico_coordenador.crm ? ' / CRM ' + doc.medico_coordenador.crm : ''))
                : 'Médico Coordenador';
            pendencias.push('Homologação clínica formal pelo Médico do Trabalho Coordenador (' + medDesc + ')');
        }

        // O fluxo atual emite minutas. Uma flag legada não comprova aprovação
        // da versão vigente do inventário e dos exames pelo médico responsável.
        pendencias.push('Validação médica documentada da versão vigente dos riscos e da matriz de exames');

        var pronto = pendencias.length === 0;
        return {
            pronto: pronto,
            status: pronto ? 'PRONTO_PARA_EMISSAO_OFICIAL' : 'MINUTA_TECNICA_PRELIMINAR',
            pendencias: pendencias
        };
    }

    // --------------------------------------------------------------------------
    // CARREGAMENTO DO BANCO DE DADOS (CONFIGURACOES_SISTEMA)
    // --------------------------------------------------------------------------
    async function carregarPcmsoDocBase() {
        if (pcmsoDocBaseLoading) return false;
        pcmsoDocBaseLoading = true;
        pcmsoDocBaseLoadError = null;
        pcmsoDocBaseSessionId++;
        var currentSession = pcmsoDocBaseSessionId;

        if (typeof supabaseFetch !== 'function') {
            pcmsoDocBaseLoadError = 'Serviço de consulta (supabaseFetch) indisponível no cliente';
            pcmsoDocBaseLoaded = false;
            pcmsoDocBaseLoading = false;
            renderPcmsoDocBaseView();
            return false;
        }

        try {
            var rows = await supabaseFetch('configuracoes_sistema', '?select=id,valor,atualizado_em&id=eq.pcmso_documento_base&limit=1');

            if (pcmsoDocBaseSessionId !== currentSession) {
                pcmsoDocBaseLoading = false;
                return false;
            }

            if (rows === null || rows === undefined || !Array.isArray(rows)) {
                throw new Error('Resposta inválida do servidor ao consultar configuracoes_sistema');
            }

            if (rows.length > 0 && rows[0]) {
                pcmsoDocBaseRemotoExiste = true;
                pcmsoDocBaseBaseAtualizadoEm = rows[0].atualizado_em || null;
                var norm = normalizarPcmsoDocBase(rows[0].valor);
                var jsonStr = JSON.stringify(norm);
                pcmsoDocBaseBaseValorJson = jsonStr;
                pcmsoDocBaseSavedSnapshotJson = jsonStr;
                pcmsoDocBaseBaselineDraftJson = jsonStr;
                pcmsoDocBaseDraft = JSON.parse(jsonStr);
            } else {
                // Registro novo / inexistente no banco
                pcmsoDocBaseRemotoExiste = false;
                pcmsoDocBaseBaseAtualizadoEm = null;
                var defaults = normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
                pcmsoDocBaseBaseValorJson = null;
                pcmsoDocBaseSavedSnapshotJson = null;
                pcmsoDocBaseBaselineDraftJson = JSON.stringify(defaults);
                pcmsoDocBaseDraft = defaults;
            }

            pcmsoDocBaseLoaded = true;
            pcmsoDocBaseDirty = false;
            pcmsoDocBaseLoading = false;
            pcmsoDocBaseLoadError = null;
            window.pcmsoDocBase = pcmsoDocBaseDraft;
            renderPcmsoDocBaseView();
            return true;
        } catch (err) {
            console.error('Erro ao carregar pcmso_documento_base:', err);
            pcmsoDocBaseLoadError = err.message || 'Falha de comunicação com o servidor';
            pcmsoDocBaseLoaded = false;
            pcmsoDocBaseLoading = false;
            renderPcmsoDocBaseView();
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // SALVAMENTO COM COMPARE-AND-SWAP (CAS)
    // --------------------------------------------------------------------------
    async function salvarPcmsoDocBase() {
        var statusEl = document.getElementById('pcmsoDocBaseFormStatus');
        if (pcmsoDocBaseSaving) return false;
        if (!pcmsoDocBaseLoaded || pcmsoDocBaseLoading) {
            if (statusEl) {
                statusEl.textContent = 'Aguarde o carregamento inicial antes de salvar.';
                statusEl.style.color = 'var(--warning, #d97706)';
            }
            return false;
        }

        coletarFormularioPcmsoDocBase();
        var snapshotCongelado = normalizarPcmsoDocBase(pcmsoDocBaseDraft);
        var snapshotJson = JSON.stringify(snapshotCongelado);
        var prontidao = avaliarProntidaoEmissaoPcmsoDocBase(snapshotCongelado);

        pcmsoDocBaseSaving = true;
        var myGen = ++pcmsoDocBaseLatestGen;
        if (statusEl) {
            statusEl.textContent = 'Salvando Documento-Base do PCMSO no servidor...';
            statusEl.style.color = 'var(--text-light)';
        }

        try {
            var payload = {
                valor: {
                    ...snapshotCongelado,
                    status_prontidao: prontidao.status
                },
                descricao: 'Parâmetros oficiais e diretrizes médicas do Documento-Base do PCMSO (NR-07).'
            };

            var patchRes = null;
            var novoTimestampIso = new Date().toISOString();
            payload.atualizado_em = novoTimestampIso;

            if (pcmsoDocBaseRemotoExiste) {
                if (typeof supabasePatch !== 'function') {
                    throw new Error('Serviço de gravação (supabasePatch) indisponível no cliente');
                }
                var filter = pcmsoDocBaseBaseAtualizadoEm
                    ? 'id=eq.pcmso_documento_base&atualizado_em=eq.' + encodeURIComponent(pcmsoDocBaseBaseAtualizadoEm)
                    : 'id=eq.pcmso_documento_base&atualizado_em=is.null';
                patchRes = await supabasePatch('configuracoes_sistema', filter, payload);
                if (!Array.isArray(patchRes) || patchRes.length === 0) {
                    throw new Error('Conflito de concorrência ou registro não atualizado: o documento foi alterado por outro usuário ou sessão.');
                }
            } else {
                if (typeof supabaseInsert === 'function') {
                    patchRes = await supabaseInsert('configuracoes_sistema', [{
                        id: 'pcmso_documento_base',
                        ...payload
                    }]);
                } else if (typeof supabaseUpsert === 'function') {
                    patchRes = await supabaseUpsert('configuracoes_sistema', [{
                        id: 'pcmso_documento_base',
                        ...payload
                    }]);
                } else {
                    throw new Error('Serviço de gravação (supabaseInsert/supabaseUpsert) indisponível no cliente');
                }
                if (patchRes !== true && (!Array.isArray(patchRes) || patchRes.length === 0)) {
                    throw new Error('Falha ao inserir o registro de Documento-Base no banco de dados.');
                }
            }

            var novoAtualizadoEm = (Array.isArray(patchRes) && patchRes[0] && patchRes[0].atualizado_em)
                ? patchRes[0].atualizado_em
                : novoTimestampIso;

            pcmsoDocBaseRemotoExiste = true;
            pcmsoDocBaseBaseAtualizadoEm = novoAtualizadoEm;
            pcmsoDocBaseBaseValorJson = snapshotJson;
            pcmsoDocBaseSavedSnapshotJson = snapshotJson;
            pcmsoDocBaseBaselineDraftJson = snapshotJson;

            // Se o usuário continuou digitando no formulário durante o await, mantém dirty e sincroniza draft
            var houveEdicaoDuranteGravacao = (myGen !== pcmsoDocBaseLatestGen);
            if (houveEdicaoDuranteGravacao) {
                pcmsoDocBaseDirty = true;
                // Coleta os valores atuais dos inputs para não perder a digitação em voo no draft
                coletarFormularioPcmsoDocBase();
            } else {
                pcmsoDocBaseDirty = false;
                window.pcmsoDocBase = snapshotCongelado;
            }
            pcmsoDocBaseSaving = false;

            // Reavalia prontidão agora com o registro comprovadamente salvo
            var prontidaoFinal = avaliarProntidaoEmissaoPcmsoDocBase(snapshotCongelado);
            if (statusEl) {
                if (houveEdicaoDuranteGravacao) {
                    statusEl.textContent = '💾 Snapshot salvo no banco, mas há alterações recentes ainda não salvas.';
                    statusEl.style.color = 'var(--warning, #d97706)';
                } else {
                    statusEl.textContent = prontidaoFinal.pronto
                        ? '✅ Documento-Base do PCMSO salvo com sucesso! Homologado para emissão oficial.'
                        : '⚠️ Minuta Técnica do PCMSO salva no banco. Pendente de homologação clínica do Médico Coordenador.';
                    statusEl.style.color = prontidaoFinal.pronto ? 'var(--success, #16a34a)' : 'var(--primary, #0f766e)';
                }
            }

            // Se houve edição recente no DOM, NÃO recria innerHTML para não roubar foco nem apagar o texto digitado
            if (!houveEdicaoDuranteGravacao) {
                renderPcmsoDocBaseView();
            }
            return true;
        } catch (err) {
            console.error('Erro ao salvar pcmso_documento_base:', err);
            pcmsoDocBaseSaving = false;
            if (statusEl) {
                statusEl.textContent = '❌ Falha ao salvar: ' + (err.message || 'Erro desconhecido');
                statusEl.style.color = 'var(--danger, #dc2626)';
            }
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // COLETA DOS CAMPOS DA INTERFACE PARA O DRAFT
    // --------------------------------------------------------------------------
    function coletarFormularioPcmsoDocBase() {
        if (!pcmsoDocBaseDraft) pcmsoDocBaseDraft = normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var d = pcmsoDocBaseDraft;

        var getVal = function(id, fallback) {
            var el = document.getElementById(id);
            if (!el) return fallback;
            return el.value.trim();
        };

        d.codigo_documento = getVal('pcmsoDoc_codigo', d.codigo_documento);
        d.titulo_oficial = getVal('pcmsoDoc_titulo', d.titulo_oficial);
        d.revisao_atual = getVal('pcmsoDoc_revisao', d.revisao_atual);
        d.data_emissao = getVal('pcmsoDoc_dataEmissao', d.data_emissao);
        d.vigencia_inicio = getVal('pcmsoDoc_vigenciaInicio', d.vigencia_inicio);
        d.vigencia_fim = getVal('pcmsoDoc_vigenciaFim', d.vigencia_fim);
        d.municipio_uf = getVal('pcmsoDoc_municipio', d.municipio_uf);
        d.enquadramento_normativo = getVal('pcmsoDoc_enquadramento', d.enquadramento_normativo);
        d.abrangencia_operacional = getVal('pcmsoDoc_abrangencia', d.abrangencia_operacional);

        // Medico Coordenador
        d.medico_coordenador.nome = getVal('pcmsoDoc_medicoNome', d.medico_coordenador.nome);
        d.medico_coordenador.crm = getVal('pcmsoDoc_medicoCrm', d.medico_coordenador.crm);
        d.medico_coordenador.rqe = getVal('pcmsoDoc_medicoRqe', d.medico_coordenador.rqe);
        d.medico_coordenador.cpf = getVal('pcmsoDoc_medicoCpf', d.medico_coordenador.cpf);
        d.medico_coordenador.titulacao = getVal('pcmsoDoc_medicoTitulacao', d.medico_coordenador.titulacao);
        d.medico_coordenador.papel = getVal('pcmsoDoc_medicoPapel', d.medico_coordenador.papel);

        // Diretrizes Clinicas
        d.diretrizes_clinicas.criterio_admissional = getVal('pcmsoDoc_dirAdmissional', d.diretrizes_clinicas.criterio_admissional);
        d.diretrizes_clinicas.criterio_periodico = getVal('pcmsoDoc_dirPeriodico', d.diretrizes_clinicas.criterio_periodico);
        d.diretrizes_clinicas.criterio_retorno_trabalho = getVal('pcmsoDoc_dirRetorno', d.diretrizes_clinicas.criterio_retorno_trabalho);
        d.diretrizes_clinicas.criterio_mudanca_risco = getVal('pcmsoDoc_dirMudanca', d.diretrizes_clinicas.criterio_mudanca_risco);
        d.diretrizes_clinicas.criterio_demissional = getVal('pcmsoDoc_dirDemissional', d.diretrizes_clinicas.criterio_demissional);
        d.diretrizes_clinicas.requisitos_minimos_aso = getVal('pcmsoDoc_dirAso', d.diretrizes_clinicas.requisitos_minimos_aso);
        d.diretrizes_clinicas.condutas_exames_alterados = getVal('pcmsoDoc_dirAlterados', d.diretrizes_clinicas.condutas_exames_alterados);

        // Imunizacao e Primeiros Socorros
        d.imunizacoes_primeiros_socorros.vacina_antitetanica = getVal('pcmsoDoc_vacinaAntitetanica', d.imunizacoes_primeiros_socorros.vacina_antitetanica);
        d.imunizacoes_primeiros_socorros.vacina_sazonal = getVal('pcmsoDoc_vacinaSazonal', d.imunizacoes_primeiros_socorros.vacina_sazonal);
        d.imunizacoes_primeiros_socorros.primeiros_socorros = getVal('pcmsoDoc_primeirosSocorros', d.imunizacoes_primeiros_socorros.primeiros_socorros);

        // Coleta dos Protocolos Específicos (Etapa 3)
        if (!d.protocolos_especificos) d.protocolos_especificos = obterPcmsoDocBaseDefaults().protocolos_especificos;
        
        // PCA Ruído
        d.protocolos_especificos.pca_ruido.criterio_inclusao = getVal('pcmsoProt_pcaCriterio', d.protocolos_especificos.pca_ruido.criterio_inclusao);
        d.protocolos_especificos.pca_ruido.repouso_acustico = getVal('pcmsoProt_pcaRepouso', d.protocolos_especificos.pca_ruido.repouso_acustico);
        d.protocolos_especificos.pca_ruido.periodicidade = getVal('pcmsoProt_pcaPeriodicidade', d.protocolos_especificos.pca_ruido.periodicidade);
        d.protocolos_especificos.pca_ruido.condutas_exames_alterados = getVal('pcmsoProt_pcaCondutas', d.protocolos_especificos.pca_ruido.condutas_exames_alterados);

        // Respiratório
        d.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao = getVal('pcmsoProt_respCriterio', d.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao);
        d.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox = getVal('pcmsoProt_respRaiox', d.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox);
        d.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria = getVal('pcmsoProt_respEspiro', d.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria);
        d.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados = getVal('pcmsoProt_respCondutas', d.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados);

        // Atividades Críticas
        d.protocolos_especificos.atividades_criticas.criterio_inclusao = getVal('pcmsoProt_critCriterio', d.protocolos_especificos.atividades_criticas.criterio_inclusao);
        d.protocolos_especificos.atividades_criticas.exames_obrigatorios = getVal('pcmsoProt_critExames', d.protocolos_especificos.atividades_criticas.exames_obrigatorios);
        d.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica = getVal('pcmsoProt_critAptidao', d.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica);
        d.protocolos_especificos.atividades_criticas.avaliacao_psicossocial = getVal('pcmsoProt_critPsico', d.protocolos_especificos.atividades_criticas.avaliacao_psicossocial);

        // Alimentos e Saneamento (Campos editáveis pelo gestor/médico)
        d.protocolos_especificos.alimentos_saneamento.criterio_inclusao = getVal('pcmsoProt_alimCriterio', d.protocolos_especificos.alimentos_saneamento.criterio_inclusao);
        d.protocolos_especificos.alimentos_saneamento.exames_obrigatorios = getVal('pcmsoProt_alimExames', d.protocolos_especificos.alimentos_saneamento.exames_obrigatorios);
        d.protocolos_especificos.alimentos_saneamento.periodicidade = getVal('pcmsoProt_alimPeriodicidade', d.protocolos_especificos.alimentos_saneamento.periodicidade);
        d.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados = getVal('pcmsoProt_alimCondutas', d.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados);

        // Coleta de Representantes Legais
        var repCards = document.querySelectorAll('.pcmso-rep-item');
        if (repCards.length > 0) {
            d.representantes_legais = Array.from(repCards).map(function(item) {
                return {
                    nome: (item.querySelector('.pcmso-rep-nome')?.value || '').trim(),
                    cpf: (item.querySelector('.pcmso-rep-cpf')?.value || '').trim(),
                    cargo: (item.querySelector('.pcmso-rep-cargo')?.value || '').trim(),
                    papel: (item.querySelector('.pcmso-rep-papel')?.value || 'Representante Legal da Empresa').trim()
                };
            }).filter(function(r) { return r.nome || r.cargo; });
        }

        // Coleta de Medicos Examinadores
        var medCards = document.querySelectorAll('.pcmso-med-item');
        if (medCards.length > 0) {
            d.medicos_examinadores = Array.from(medCards).map(function(item) {
                return {
                    nome: (item.querySelector('.pcmso-med-nome')?.value || '').trim(),
                    crm: (item.querySelector('.pcmso-med-crm')?.value || '').trim(),
                    cidade_uf: (item.querySelector('.pcmso-med-cidade')?.value || '').trim(),
                    papel: (item.querySelector('.pcmso-med-papel')?.value || 'Médico Examinador').trim()
                };
            }).filter(function(m) { return m.nome || m.crm; });
        }

        // Coleta de Revisões
        var revCards = document.querySelectorAll('.pcmso-rev-item');
        if (revCards.length > 0) {
            d.historico_revisoes = Array.from(revCards).map(function(item) {
                return {
                    revisao: (item.querySelector('.pcmso-rev-numero')?.value || '').trim(),
                    data: (item.querySelector('.pcmso-rev-data')?.value || '').trim(),
                    descricao: (item.querySelector('.pcmso-rev-desc')?.value || '').trim(),
                    responsavel: (item.querySelector('.pcmso-rev-resp')?.value || '').trim()
                };
            }).filter(function(rev) { return rev.revisao || rev.descricao; });
        }

        // Coleta do Cronograma de Ações
        var cronCards = document.querySelectorAll('.pcmso-cron-item');
        if (cronCards.length > 0) {
            d.cronograma_acoes_saude = Array.from(cronCards).map(function(item) {
                return {
                    mes: (item.querySelector('.pcmso-cron-mes')?.value || '').trim(),
                    acao: (item.querySelector('.pcmso-cron-acao')?.value || '').trim(),
                    responsavel: (item.querySelector('.pcmso-cron-resp')?.value || '').trim()
                };
            }).filter(function(c) { return c.mes || c.acao; });
        }
    }

    // --------------------------------------------------------------------------
    // RENDERIZACAO DA INTERFACE DO DOCUMENTO-BASE DO PCMSO
    // --------------------------------------------------------------------------
    function renderPcmsoDocBaseView() {
        var wrap = document.getElementById('pcmsoDocBaseFormWrap');
        if (!wrap) return;

        if (pcmsoDocBaseLoading) {
            wrap.innerHTML = `
                <div class="db-chart-card" style="padding: 24px; text-align: center; color: var(--text-light);">
                    <div style="font-size: 15px; font-weight: 700;">🔄 Carregando Documento-Base do PCMSO...</div>
                    <div style="font-size: 12px; margin-top: 6px;">Consultando <code>configuracoes_sistema</code> (registro <code>pcmso_documento_base</code>).</div>
                </div>`;
            return;
        }

        if (pcmsoDocBaseLoadError) {
            wrap.innerHTML = `
                <div class="db-chart-card" style="padding: 20px; border-left: 4px solid var(--danger, #dc2626); margin-bottom: 16px;">
                    <div style="font-size: 14px; font-weight: 700; color: var(--danger, #dc2626);">❌ Falha ao carregar Documento-Base do PCMSO</div>
                    <div style="font-size: 12.5px; color: var(--text-light); margin: 6px 0 12px;">${escapeHtml(pcmsoDocBaseLoadError)}</div>
                    <button type="button" class="db-apply-btn" onclick="pcmsoCarregarDocBase()" style="font-size: 12px; padding: 6px 14px;">🔄 Tentar Novamente</button>
                </div>`;
            return;
        }

        var d = pcmsoDocBaseDraft || normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var prontidao = avaliarProntidaoEmissaoPcmsoDocBase(d);
        var inputStyle = 'width:100%; padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:12.5px; background:var(--bg); color:var(--text); box-sizing:border-box;';
        var labelStyle = 'display:block; font-size:11.5px; font-weight:700; color:var(--text-light); margin-bottom:4px;';

        var bannerProntidaoHtml = prontidao.pronto
            ? `<div style="margin-bottom:14px; padding:10px 14px; border-radius:8px; background:rgba(22,163,74,0.1); border:1px solid rgba(22,163,74,0.28); color:#15803d; font-size:12.5px; font-weight:600;">
                ✅ <b>Pronto para Emissão Oficial do PCMSO (NR-07):</b> Todos os parâmetros obrigatórios e corpo médico coordenador estão validados.
               </div>`
            : `<div style="margin-bottom:14px; padding:10px 14px; border-radius:8px; background:rgba(217,119,6,0.1); border:1px solid rgba(217,119,6,0.28); color:#b45309; font-size:12.5px;">
                ⚠️ <b>Rascunho em Preenchimento (Salvamento Permitido / Emissão Oficial Bloqueada):</b><br>
                Preencha os itens obrigatórios: <b>${prontidao.pendencias.join(', ')}</b>.
               </div>`;

        // Render Representantes Legais
        var repsHtml = d.representantes_legais.map(function(rep, idx) {
            return `
                <div class="pcmso-rep-item" style="display:grid; grid-template-columns: 2fr 1.5fr 1.5fr auto; gap:10px; align-items:center; margin-bottom:8px; padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
                    <div>
                        <label style="${labelStyle}">Nome Completo *</label>
                        <input type="text" class="pcmso-rep-nome" value="${escapeHtml(rep.nome)}" style="${inputStyle}" placeholder="Nome do representante">
                    </div>
                    <div>
                        <label style="${labelStyle}">Cargo Corporativo *</label>
                        <input type="text" class="pcmso-rep-cargo" value="${escapeHtml(rep.cargo)}" style="${inputStyle}" placeholder="Ex: Diretor de Contrato">
                    </div>
                    <div>
                        <label style="${labelStyle}">CPF *</label>
                        <input type="text" class="pcmso-rep-cpf" value="${escapeHtml(rep.cpf)}" style="${inputStyle}" placeholder="000.000.000-00">
                    </div>
                    <div style="padding-top:16px;">
                        <button type="button" onclick="pcmsoRemoverRepresentante(${idx})" title="Remover representante" style="background:none; border:none; cursor:pointer; color:var(--danger, #dc2626); font-size:15px;">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        // Render Medicos Examinadores
        var medsHtml = d.medicos_examinadores.map(function(med, idx) {
            return `
                <div class="pcmso-med-item" style="display:grid; grid-template-columns: 2fr 1fr 1.5fr auto; gap:10px; align-items:center; margin-bottom:8px; padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
                    <div>
                        <label style="${labelStyle}">Nome do Médico *</label>
                        <input type="text" class="pcmso-med-nome" value="${escapeHtml(med.nome)}" style="${inputStyle}" placeholder="Dr. Nome do Médico">
                    </div>
                    <div>
                        <label style="${labelStyle}">CRM / UF *</label>
                        <input type="text" class="pcmso-med-crm" value="${escapeHtml(med.crm)}" style="${inputStyle}" placeholder="00000-PE">
                    </div>
                    <div>
                        <label style="${labelStyle}">Cidade / Base</label>
                        <input type="text" class="pcmso-med-cidade" value="${escapeHtml(med.cidade_uf)}" style="${inputStyle}" placeholder="Arcoverde - PE">
                    </div>
                    <div style="padding-top:16px;">
                        <button type="button" onclick="pcmsoRemoverExaminador(${idx})" title="Remover médico" style="background:none; border:none; cursor:pointer; color:var(--danger, #dc2626); font-size:15px;">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        // Render Revisões
        var revsHtml = d.historico_revisoes.map(function(rev, idx) {
            return `
                <div class="pcmso-rev-item" style="display:grid; grid-template-columns: 80px 130px 2fr 1.5fr auto; gap:10px; align-items:center; margin-bottom:8px; padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
                    <div>
                        <label style="${labelStyle}">Revisão</label>
                        <input type="text" class="pcmso-rev-numero" value="${escapeHtml(rev.revisao)}" style="${inputStyle}" placeholder="00">
                    </div>
                    <div>
                        <label style="${labelStyle}">Data</label>
                        <input type="date" class="pcmso-rev-data" value="${escapeHtml(rev.data)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Descrição da Alteração / Finalidade *</label>
                        <input type="text" class="pcmso-rev-desc" value="${escapeHtml(rev.descricao)}" style="${inputStyle}" placeholder="Descrição resumida">
                    </div>
                    <div>
                        <label style="${labelStyle}">Responsável</label>
                        <input type="text" class="pcmso-rev-resp" value="${escapeHtml(rev.responsavel)}" style="${inputStyle}" placeholder="Responsável">
                    </div>
                    <div style="padding-top:16px;">
                        <button type="button" onclick="pcmsoRemoverRevisao(${idx})" title="Remover revisão" style="background:none; border:none; cursor:pointer; color:var(--danger, #dc2626); font-size:15px;">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        // Render Cronograma
        var cronHtml = d.cronograma_acoes_saude.map(function(c, idx) {
            return `
                <div class="pcmso-cron-item" style="display:grid; grid-template-columns: 160px 2.5fr 1.5fr auto; gap:10px; align-items:center; margin-bottom:8px; padding:8px 10px; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
                    <div>
                        <label style="${labelStyle}">Mês / Período *</label>
                        <input type="text" class="pcmso-cron-mes" value="${escapeHtml(c.mes)}" style="${inputStyle}" placeholder="Ex: Maio / Contínuo">
                    </div>
                    <div>
                        <label style="${labelStyle}">Ação / Campanha de Saúde Preventiva *</label>
                        <input type="text" class="pcmso-cron-acao" value="${escapeHtml(c.acao)}" style="${inputStyle}" placeholder="Descrição da ação de saúde">
                    </div>
                    <div>
                        <label style="${labelStyle}">Responsável / Execução</label>
                        <input type="text" class="pcmso-cron-resp" value="${escapeHtml(c.responsavel)}" style="${inputStyle}" placeholder="Ex: SESMT / Medicina">
                    </div>
                    <div style="padding-top:16px;">
                        <button type="button" onclick="pcmsoRemoverCronograma(${idx})" title="Remover ação" style="background:none; border:none; cursor:pointer; color:var(--danger, #dc2626); font-size:15px;">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        wrap.innerHTML = `
            ${bannerProntidaoHtml}

            <!-- 1. Identificação do Programa e Enquadramento -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e); margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
                    <span>📘 1. Identificação do Programa, Enquadramento Normativo e Vigência (NR-07)</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Código Documental *</label>
                        <input type="text" id="pcmsoDoc_codigo" value="${escapeHtml(d.codigo_documento)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Título Oficial na Capa *</label>
                        <input type="text" id="pcmsoDoc_titulo" value="${escapeHtml(d.titulo_oficial)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Revisão Vigente *</label>
                        <input type="text" id="pcmsoDoc_revisao" value="${escapeHtml(d.revisao_atual)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Data de Emissão *</label>
                        <input type="date" id="pcmsoDoc_dataEmissao" value="${escapeHtml(d.data_emissao)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Município / UF Base *</label>
                        <input type="text" id="pcmsoDoc_municipio" value="${escapeHtml(d.municipio_uf)}" style="${inputStyle}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 2fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Início da Vigência *</label>
                        <input type="date" id="pcmsoDoc_vigenciaInicio" value="${escapeHtml(d.vigencia_inicio)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Término da Vigência *</label>
                        <input type="date" id="pcmsoDoc_vigenciaFim" value="${escapeHtml(d.vigencia_fim)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Enquadramento Normativo Principal</label>
                        <input type="text" id="pcmsoDoc_enquadramento" value="${escapeHtml(d.enquadramento_normativo)}" style="${inputStyle}">
                    </div>
                </div>
                <div>
                    <label style="${labelStyle}">Abrangência Operacional do Estabelecimento</label>
                    <input type="text" id="pcmsoDoc_abrangencia" value="${escapeHtml(d.abrangencia_operacional)}" style="${inputStyle}">
                </div>
            </div>

            <!-- 2. Médico do Trabalho Coordenador -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e); margin-bottom: 12px;">
                    <span>👨‍⚕️ 2. Médico do Trabalho Coordenador / Responsável Técnico (NR-07 item 7.4)</span>
                </div>
                <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1.2fr; gap:12px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Nome Completo do Médico Coordenador *</label>
                        <input type="text" id="pcmsoDoc_medicoNome" value="${escapeHtml(d.medico_coordenador.nome)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">CRM / Conselho *</label>
                        <input type="text" id="pcmsoDoc_medicoCrm" value="${escapeHtml(d.medico_coordenador.crm)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">RQE (Especialidade)</label>
                        <input type="text" id="pcmsoDoc_medicoRqe" value="${escapeHtml(d.medico_coordenador.rqe)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">CPF</label>
                        <input type="text" id="pcmsoDoc_medicoCpf" value="${escapeHtml(d.medico_coordenador.cpf)}" style="${inputStyle}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1.5fr 2fr; gap:12px;">
                    <div>
                        <label style="${labelStyle}">Titulação Oficial</label>
                        <input type="text" id="pcmsoDoc_medicoTitulacao" value="${escapeHtml(d.medico_coordenador.titulacao)}" style="${inputStyle}">
                    </div>
                    <div>
                        <label style="${labelStyle}">Papel / Atribuição no PCMSO</label>
                        <input type="text" id="pcmsoDoc_medicoPapel" value="${escapeHtml(d.medico_coordenador.papel)}" style="${inputStyle}">
                    </div>
                </div>
            </div>

            <!-- 3. Representantes Legais da Empresa -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                    <span style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e);">🏢 3. Representantes Legais da Empresa (Assinatura Oficial)</span>
                    <button type="button" class="db-clear-btn" onclick="pcmsoAdicionarRepresentante()" style="font-size: 12px; padding: 4px 10px;">➕ Adicionar Representante</button>
                </div>
                <div id="pcmsoRepList">${repsHtml}</div>
            </div>

            <!-- 4. Médicos Examinadores Credenciados -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                    <span style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e);">🩺 4. Médicos Examinadores Credenciados e Equipe de Saúde</span>
                    <button type="button" class="db-clear-btn" onclick="pcmsoAdicionarExaminador()" style="font-size: 12px; padding: 4px 10px;">➕ Adicionar Médico</button>
                </div>
                <div id="pcmsoMedList">${medsHtml}</div>
            </div>

            <!-- 5. Histórico de Revisões -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                    <span style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e);">📅 5. Histórico de Revisões Oficiais do PCMSO</span>
                    <button type="button" class="db-clear-btn" onclick="pcmsoAdicionarRevisao()" style="font-size: 12px; padding: 4px 10px;">➕ Adicionar Revisão</button>
                </div>
                <div id="pcmsoRevList">${revsHtml}</div>
            </div>

            <!-- 6. Diretrizes Clínicas e Procedimentos Normativos (NR-07) -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e); margin-bottom: 12px;">
                    <span>📋 6. Diretrizes Técnicas e Procedimentos Clínicos Ocupacionais (NR-07)</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Exame Admissional (Critérios e Prazos)</label>
                        <textarea id="pcmsoDoc_dirAdmissional" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.criterio_admissional)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Exame Periódico (Regra de Periodicidade)</label>
                        <textarea id="pcmsoDoc_dirPeriodico" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.criterio_periodico)}</textarea>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Exame de Retorno ao Trabalho</label>
                        <textarea id="pcmsoDoc_dirRetorno" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.criterio_retorno_trabalho)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Exame de Mudança de Riscos</label>
                        <textarea id="pcmsoDoc_dirMudanca" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.criterio_mudanca_risco)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Exame Demissional (Prazos e Regras)</label>
                        <textarea id="pcmsoDoc_dirDemissional" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.criterio_demissional)}</textarea>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
                    <div>
                        <label style="${labelStyle}">Requisitos Mínimos e Vias do ASO</label>
                        <textarea id="pcmsoDoc_dirAso" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.requisitos_minimos_aso)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Condutas em Exames Alterados / CAT / INSS</label>
                        <textarea id="pcmsoDoc_dirAlterados" rows="3" style="${inputStyle}">${escapeHtml(d.diretrizes_clinicas.condutas_exames_alterados)}</textarea>
                    </div>
                </div>
            </div>

            <!-- 7. Imunização e Primeiros Socorros -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e); margin-bottom: 12px;">
                    <span>💉 7. Programa de Imunização e Kits de Primeiros Socorros</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:12px;">
                    <div>
                        <label style="${labelStyle}">Imunização Antitetânica (Trabalhadores Operacionais/Campo)</label>
                        <textarea id="pcmsoDoc_vacinaAntitetanica" rows="2" style="${inputStyle}">${escapeHtml(d.imunizacoes_primeiros_socorros.vacina_antitetanica)}</textarea>
                    </div>
                    <div>
                        <label style="${labelStyle}">Campanhas de Vacinação Sazonais (Gripe / Febre Amarela)</label>
                        <textarea id="pcmsoDoc_vacinaSazonal" rows="2" style="${inputStyle}">${escapeHtml(d.imunizacoes_primeiros_socorros.vacina_sazonal)}</textarea>
                    </div>
                </div>
                <div>
                    <label style="${labelStyle}">Padronização de Kits de Primeiros Socorros nas Frentes Operacionais</label>
                    <textarea id="pcmsoDoc_primeirosSocorros" rows="2" style="${inputStyle}">${escapeHtml(d.imunizacoes_primeiros_socorros.primeiros_socorros)}</textarea>
                </div>
            </div>

            <!-- 7-B. Protocolos Médicos Específicos por Fator de Risco (NR-07 Quadros I e II) -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e);">🩺 7-B. Protocolos Médicos Específicos por Fator de Risco Ocupacional</span>
                        <div style="font-size: 11.5px; color: var(--text-light); margin-top: 2px;">
                            Minuta técnica estruturada conforme NR-07 e PGR para parecer e validação do Dr. Cícero Henrique (CRM 19464-PE).
                        </div>
                    </div>
                    <button type="button" class="db-apply-btn" onclick="pcmsoImprimirProtocolosClinicos()" style="font-size: 12px; padding: 5px 12px; background: #0f766e;">
                        🖨️ Imprimir Caderno de Protocolos
                    </button>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;">
                    <!-- 1. PCA Ruído -->
                    <div style="padding:12px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                        <div style="font-weight:700; font-size:12.5px; color:var(--primary, #0f766e); margin-bottom:6px;">
                            🎧 1. Protocolo de Conservação Auditiva (PCA — NR-07 Anexo II)
                        </div>
                        <div style="margin-bottom:8px;">
                            <label style="${labelStyle}">Critério de Inclusão no PCA</label>
                            <textarea id="pcmsoProt_pcaCriterio" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.pca_ruido.criterio_inclusao)}</textarea>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="${labelStyle}">Repouso Auditivo Mínimo</label>
                                <input type="text" id="pcmsoProt_pcaRepouso" value="${escapeHtml(d.protocolos_especificos.pca_ruido.repouso_acustico)}" style="${inputStyle}">
                            </div>
                            <div>
                                <label style="${labelStyle}">Periodicidade do Exame</label>
                                <input type="text" id="pcmsoProt_pcaPeriodicidade" value="${escapeHtml(d.protocolos_especificos.pca_ruido.periodicidade)}" style="${inputStyle}">
                            </div>
                        </div>
                        <div>
                            <label style="${labelStyle}">Condutas em Audiometrias Alteradas / PAIR</label>
                            <textarea id="pcmsoProt_pcaCondutas" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.pca_ruido.condutas_exames_alterados)}</textarea>
                        </div>
                    </div>

                    <!-- 2. Respiratório -->
                    <div style="padding:12px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                        <div style="font-weight:700; font-size:12.5px; color:var(--primary, #0f766e); margin-bottom:6px;">
                            🫁 2. Protocolo Respiratório (Poeiras Minerais, Sílica e Fumos)
                        </div>
                        <div style="margin-bottom:8px;">
                            <label style="${labelStyle}">Critério de Inclusão (Frentes com Poeira/Fumo)</label>
                            <textarea id="pcmsoProt_respCriterio" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao)}</textarea>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="${labelStyle}">Metodologia Raio-X de Tórax</label>
                                <input type="text" id="pcmsoProt_respRaiox" value="${escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox)}" style="${inputStyle}">
                            </div>
                            <div>
                                <label style="${labelStyle}">Critérios da Espirometria</label>
                                <input type="text" id="pcmsoProt_respEspiro" value="${escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria)}" style="${inputStyle}">
                            </div>
                        </div>
                        <div>
                            <label style="${labelStyle}">Condutas em Exames Respiratórios Alterados</label>
                            <textarea id="pcmsoProt_respCondutas" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados)}</textarea>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:14px;">
                    <!-- 3. Atividades Críticas Altura e Confinado -->
                    <div style="padding:12px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                        <div style="font-weight:700; font-size:12.5px; color:var(--primary, #0f766e); margin-bottom:6px;">
                            🧗 3. Aptidão para Atividades Críticas (Altura NR-35 e Confinado NR-33)
                        </div>
                        <div style="margin-bottom:8px;">
                            <label style="${labelStyle}">Critério de Inclusão (Postos e Atividades)</label>
                            <input type="text" id="pcmsoProt_critCriterio" value="${escapeHtml(d.protocolos_especificos.atividades_criticas.criterio_inclusao)}" style="${inputStyle}">
                        </div>
                        <div style="margin-bottom:8px;">
                            <label style="${labelStyle}">Bateria Obrigatória de Exames Complementares</label>
                            <input type="text" id="pcmsoProt_critExames" value="${escapeHtml(d.protocolos_especificos.atividades_criticas.exames_obrigatorios)}" style="${inputStyle}">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                            <div>
                                <label style="${labelStyle}">Critérios Clínicos de Aptidão</label>
                                <textarea id="pcmsoProt_critAptidao" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica)}</textarea>
                            </div>
                            <div>
                                <label style="${labelStyle}">Avaliação Psicossocial Estruturada</label>
                                <textarea id="pcmsoProt_critPsico" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.atividades_criticas.avaliacao_psicossocial)}</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- 4. Manipulação de Alimentos e Sanitaristas (Editável) -->
                    <div style="padding:12px; background:var(--bg); border:1px solid var(--border); border-radius:8px;">
                        <div style="font-weight:700; font-size:12.5px; color:var(--primary, #0f766e); margin-bottom:6px;">
                            🍽️ 4. Sanidade em Alimentos e Saneamento
                        </div>
                        <div style="margin-bottom:8px;">
                            <label style="${labelStyle}">Público-Alvo do Protocolo</label>
                            <input type="text" id="pcmsoProt_alimCriterio" value="${escapeHtml(d.protocolos_especificos.alimentos_saneamento.criterio_inclusao)}" style="${inputStyle}">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                                <label style="${labelStyle}">Exames Exigidos</label>
                                <input type="text" id="pcmsoProt_alimExames" value="${escapeHtml(d.protocolos_especificos.alimentos_saneamento.exames_obrigatorios)}" style="${inputStyle}">
                            </div>
                            <div>
                                <label style="${labelStyle}">Periodicidade do Exame</label>
                                <input type="text" id="pcmsoProt_alimPeriodicidade" value="${escapeHtml(d.protocolos_especificos.alimentos_saneamento.periodicidade)}" style="${inputStyle}">
                            </div>
                        </div>
                        <div>
                            <label style="${labelStyle}">Condutas em Coprologia Positiva</label>
                            <textarea id="pcmsoProt_alimCondutas" rows="2" style="${inputStyle}">${escapeHtml(d.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados)}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 8. Cronograma Anual de Ações Preventivas de Saúde -->
            <div class="db-chart-card" style="padding: 18px 20px; margin-bottom: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                    <span style="font-size: 14px; font-weight: 800; color: var(--primary, #0f766e);">🗓️ 8. Cronograma Anual de Ações Preventivas de Saúde (NR-07 item 7.5)</span>
                    <button type="button" class="db-clear-btn" onclick="pcmsoAdicionarCronograma()" style="font-size: 12px; padding: 4px 10px;">➕ Adicionar Ação</button>
                </div>
                <div style="font-size: 11.5px; color: var(--text-light); margin-bottom: 10px;">
                    Substitui o plano vazio legado do SGG por campanhas ativas de promoção à saúde e prevenção de agravos ocupacionais.
                </div>
                <div id="pcmsoCronList">${cronHtml}</div>
            </div>

            <!-- 9. Matriz de Exames por GHE (NR-07 & PGR) -->
            <div id="pcmsoMatrizContainer">
                ${renderSecaoMatrizExamesPcmsoHtml()}
            </div>
        `;

        // Vincula listeners de alteração para controle de dirty e geração
        if (typeof wrap.querySelectorAll === 'function') {
            var formInputs = wrap.querySelectorAll('input, textarea, select');
            formInputs.forEach(function(input) {
                if (typeof input.addEventListener === 'function') {
                    input.addEventListener('input', function() {
                        pcmsoDocBaseDirty = true;
                        pcmsoDocBaseLatestGen++;
                    });
                    input.addEventListener('change', function() {
                        pcmsoDocBaseDirty = true;
                        pcmsoDocBaseLatestGen++;
                    });
                }
            });
        }
    }

    // --------------------------------------------------------------------------
    // AUXILIARES DE MANIPULACAO DINAMICA DE LISTAS
    // --------------------------------------------------------------------------
    function pcmsoAdicionarRepresentante() {
        coletarFormularioPcmsoDocBase();
        pcmsoDocBaseDraft.representantes_legais.push({
            nome: '',
            cargo: 'Representante Legal',
            cpf: '',
            papel: 'Representante Legal da Empresa'
        });
        renderPcmsoDocBaseView();
    }

    function pcmsoRemoverRepresentante(idx) {
        coletarFormularioPcmsoDocBase();
        if (pcmsoDocBaseDraft.representantes_legais.length <= 1) {
            alert('É obrigatório manter ao menos um Representante Legal cadastrado.');
            return;
        }
        pcmsoDocBaseDraft.representantes_legais.splice(idx, 1);
        renderPcmsoDocBaseView();
    }

    function pcmsoAdicionarExaminador() {
        coletarFormularioPcmsoDocBase();
        pcmsoDocBaseDraft.medicos_examinadores.push({
            nome: '',
            crm: '',
            cidade_uf: 'Arcoverde - PE',
            papel: 'Médico Examinador'
        });
        renderPcmsoDocBaseView();
    }

    function pcmsoRemoverExaminador(idx) {
        coletarFormularioPcmsoDocBase();
        if (pcmsoDocBaseDraft.medicos_examinadores.length <= 1) {
            alert('É recomendável manter ao menos um médico examinador na lista.');
            return;
        }
        pcmsoDocBaseDraft.medicos_examinadores.splice(idx, 1);
        renderPcmsoDocBaseView();
    }

    function pcmsoAdicionarRevisao() {
        coletarFormularioPcmsoDocBase();
        var proximaRev = String(pcmsoDocBaseDraft.historico_revisoes.length).padStart(2, '0');
        pcmsoDocBaseDraft.historico_revisoes.push({
            revisao: proximaRev,
            data: new Date().toISOString().split('T')[0],
            descricao: '',
            responsavel: pcmsoDocBaseDraft.medico_coordenador.nome || 'Médico do Trabalho Coordenador'
        });
        renderPcmsoDocBaseView();
    }

    function pcmsoRemoverRevisao(idx) {
        coletarFormularioPcmsoDocBase();
        if (pcmsoDocBaseDraft.historico_revisoes.length <= 1) {
            alert('É obrigatório manter ao menos a revisão inicial cadastrada.');
            return;
        }
        pcmsoDocBaseDraft.historico_revisoes.splice(idx, 1);
        renderPcmsoDocBaseView();
    }

    function pcmsoAdicionarCronograma() {
        coletarFormularioPcmsoDocBase();
        pcmsoDocBaseDraft.cronograma_acoes_saude.push({
            mes: '',
            acao: '',
            responsavel: 'SESMT / Medicina do Trabalho'
        });
        renderPcmsoDocBaseView();
    }

    function pcmsoRemoverCronograma(idx) {
        coletarFormularioPcmsoDocBase();
        pcmsoDocBaseDraft.cronograma_acoes_saude.splice(idx, 1);
        renderPcmsoDocBaseView();
    }

    function descartarRascunhoPcmsoDocBase() {
        if (!confirm('Descartar alterações do rascunho e recarregar a versão salva no servidor?')) return;
        if (pcmsoDocBaseSavedSnapshotJson) {
            pcmsoDocBaseDraft = JSON.parse(pcmsoDocBaseSavedSnapshotJson);
        } else {
            pcmsoDocBaseDraft = normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        }
        pcmsoDocBaseDirty = false;
        renderPcmsoDocBaseView();
        var statusEl = document.getElementById('pcmsoDocBaseFormStatus');
        if (statusEl) {
            statusEl.textContent = 'Rascunho revertido para a última versão salva.';
            statusEl.style.color = 'var(--text-light)';
        }
    }

    // --------------------------------------------------------------------------
    // GUARDIÃO DE INTEGRIDADE: BLOQUEIO DE EMISSÃO COM ALTERAÇÃO PENDENTE (DIRTY)
    // --------------------------------------------------------------------------
    function pcmsoVerificarBloqueioEdicaoPendente() {
        if (typeof pcmsoIsDocBaseDirty === 'function' && pcmsoIsDocBaseDirty()) {
            var msg = 'Emissão bloqueada: o formulário do Documento-Base possui alterações pendentes não salvas. Salve as alterações ("Salvar Documento-Base") ou descarte o rascunho antes de emitir.';
            if (typeof pcmsoEmitirPcmsoAviso === 'function') {
                pcmsoEmitirPcmsoAviso(msg, 'erro');
            } else if (typeof alert === 'function') {
                alert(msg);
            } else if (typeof console !== 'undefined' && console.warn) {
                console.warn(msg);
            }
            return true;
        }
        var catalogo = obterCatalogoPcmsoVigente();
        if (pcmsoCatalogoLoading || pcmsoCatalogoLoadError || !catalogo || catalogo.length === 0) {
            var aviso = pcmsoCatalogoLoading
                ? 'Aguarde o carregamento do catálogo de GHEs antes de emitir.'
                : pcmsoCatalogoLoadError
                    ? 'Não foi possível carregar o catálogo de GHEs. Reabra a aba Documento-Base para tentar novamente.'
                    : 'Carregue o catálogo vigente e cadastre ao menos um GHE antes de emitir o PCMSO.';
            pcmsoEmitirPcmsoAviso(aviso, 'erro');
            return true;
        }
        return false;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // --------------------------------------------------------------------------

    // ==========================================================================
    // ETAPA 2: MATRIZ DE EXAMES CLINICOS E COMPLEMENTARES POR GHE (NR-07 / PGR)
    // ==========================================================================

    var pcmsoMatrizFiltroGhe = ''; // '' = Todos os GHEs

    // Catalogo Canonico de Exames Ocupacionais Regulamentados (NR-07 / Portaria 6.734/2020)
    var CATALOGO_CANONICO_EXAMES_PCMSO = {
        clinico: {
            id: 'clinico',
            nome: 'Avaliação clínica ocupacional',
            descricao: 'Anamnese clínico-ocupacional e exame físico e mental detalhado.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 item 7.5.6 (Anexo I)',
            justificativa_padrao: 'Exame clínico geral obrigatório para todos os trabalhadores.'
        },
        audiometria: {
            id: 'audiometria',
            nome: 'Audiometria Tonal Ocupacional',
            descricao: 'Exame de acuidade auditiva por via aérea e via óssea com repouso acústico.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 Anexo II (Ruído)',
            justificativa_padrao: 'Vigilância epidemiológica da audição em trabalhadores expostos a ruído ocupacional acima do nível de ação.'
        },
        ecg: {
            id: 'ecg',
            nome: 'Eletrocardiograma (ECG)',
            descricao: 'Avaliação da atividade elétrica cardíaca e detecção de arritmias ou isquemias.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 / NR-35 / NR-10',
            justificativa_padrao: 'Rastreamento de risco cardiovascular para trabalho em altura, sistemas energizados ou espaço confinado.'
        },
        eeg: {
            id: 'eeg',
            nome: 'Eletroencefalograma (EEG)',
            descricao: 'Avaliação da atividade bioelétrica cerebral e rastreamento de síndromes epilépticas.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 / NR-35',
            justificativa_padrao: 'Prevenção de síncopes ou crises convulsivas durante execução de atividades críticas em altura ou máquinas pesadas.'
        },
        espirometria: {
            id: 'espirometria',
            nome: 'Espirometria',
            descricao: 'Prova de função pulmonar para diagnóstico de alterações ventilatórias obstrutivas ou restritivas.',
            periodicidade_padrao: 24,
            demissional_padrao: true,
            norma: 'NR-07 Anexo I (Poeiras e Fumos)',
            justificativa_padrao: 'Monitoramento da higidez respiratória frente a poeiras minerais, névoas, vapores e fumos metálicos.'
        },
        rx_torax: {
            id: 'rx_torax',
            nome: 'Raio X de Tórax (Padrão OIT)',
            descricao: 'Telerradiografia de tórax com leitura técnica de pneumoconioses pelo padrão internacional OIT.',
            periodicidade_padrao: 60,
            demissional_padrao: true,
            norma: 'NR-07 Anexo I (Poeiras Minerais)',
            justificativa_padrao: 'Vigilância radiológica contra pneumoconioses (sílica, poeira de concreto, escavação e britagem).'
        },
        glicose: {
            id: 'glicose',
            nome: 'Glicemia em Jejum',
            descricao: 'Dosagem sérica de glicose para controle de diabetes mellitus e prevenção de hipoglicemia súbita.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 / NR-35 / NR-10',
            justificativa_padrao: 'Prevenção de perda súbita de consciência em atividades de trabalho em altura, eletricidade e condução de veículos.'
        },
        hemograma: {
            id: 'hemograma',
            nome: 'Hemograma Completo',
            descricao: 'Avaliação qualitativa e quantitativa dos elementos figurados do sangue.',
            periodicidade_padrao: 12,
            demissional_padrao: true,
            norma: 'NR-07 Anexo I (Químicos)',
            justificativa_padrao: 'Monitoramento de mielotoxicidade e reações frente à manipulação de solventes, óleos minerais, combustíveis e graxas.'
        },
        acuidade: {
            id: 'acuidade',
            nome: 'Acuidade Visual',
            descricao: 'Teste de acuidade visual para perto e para longe (tabela de Snellen).',
            periodicidade_padrao: 12,
            demissional_padrao: false,
            norma: 'NR-07 / Resoluções CONTRAN',
            justificativa_padrao: 'Avaliação de nitidez visual e reflexos para condutores de veículos pesados, comboio, máquinas e operadores de subestação.'
        },
        rx_coluna: {
            id: 'rx_coluna',
            nome: 'Raio X da Coluna Lombo-Sacra',
            descricao: 'Exame radiológico da coluna lombar e sacra para identificação de discopatias ou espondilólises.',
            periodicidade_padrao: 24,
            demissional_padrao: true,
            norma: 'NR-07 / NR-17 (Ergonomia)',
            justificativa_padrao: 'Vigilância osteomuscular para trabalhadores sujeitos a levantamento manual de peso ou vibração de corpo inteiro (VCI).'
        },
        psicossocial: {
            id: 'psicossocial',
            nome: 'Avaliação Psicossocial',
            descricao: 'Avaliação clínica psicológica / psicossocial com emissão de parecer de aptidão.',
            periodicidade_padrao: 12,
            demissional_padrao: false,
            norma: 'NR-35.4.1.2 e NR-33.3.4.1',
            justificativa_padrao: 'Avaliação de aspectos comportamentais e aptidão psicológica para atividades com risco de queda em altura ou espaço confinado.'
        },
        ige_abelha: {
            id: 'ige_abelha',
            nome: 'IgE Específica - Abelha / Veneno Himenópteros',
            descricao: 'Dosagem imunoalérgica sérica para rastreamento de hipersensibilidade grave a picadas de abelhas e vespas.',
            periodicidade_padrao: null,
            demissional_padrao: false,
            norma: 'NR-07 / Procedimento Médico SMS',
            justificativa_padrao: 'Rastreamento prévio de choque anafilático para equipes de supressão vegetal, roçadeiras, topografia e campo florestal.'
        }
    };

    // Matriz Canônica dos 27 GHEs da Obra / Operação do Ramal do Agreste (Integrada ao PGR)
    var GHE_MATRIZ_BASE_INTEGRADA = [
        {
            id: '01',
            codigo: 'G01',
            nome: 'Vigilância Patrimonial',
            cargos: ['Vigia Diurno', 'Vigia Noturno', 'Fiscal de Vigilância'],
            riscos_pgr: ['Radiação Solar UV', 'Ruído Intermitente', 'Animais Peçonhentos', 'Acidente de Trânsito', 'Trabalho Noturno'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica geral obrigatória.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição a ruído em rondas e perímetros industriais.' }
            ]
        },
        {
            id: '02',
            codigo: 'G02',
            nome: 'Almoxarifado',
            cargos: ['Almoxarife', 'Auxiliar de Almoxarifado'],
            riscos_pgr: ['Poeira em Suspensão', 'Levantamento Manual de Cargas', 'Queda de Nível / Escadas'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' }
            ]
        },
        {
            id: '03',
            codigo: 'G03',
            nome: 'Administrativo',
            cargos: ['Administrador', 'Auxiliar Administrativo', 'Auxiliar de Informática', 'Comprador', 'Secretária'],
            riscos_pgr: ['Postura Sentada Prolongada', 'Exigência Cognitiva / Telas de Computador'],
            exames: [
                { exame_id: 'clinico', periodico: 24, demissional: true, just: 'Atividade sem riscos físicos ou químicos (NR-07 item 7.5.8).' }
            ]
        },
        {
            id: '04',
            codigo: 'G04',
            nome: 'Analista de Sistemas Mecânicos e Elétricos',
            cargos: ['Analista de Sistemas Mecânico', 'Analista de Sistemas Elétricos', 'Engenheiro Mecânico'],
            riscos_pgr: ['Ruído em Salas de Máquinas', 'Radiação Solar UV', 'Eletricidade (Baixa/Média Tensão)', 'Trabalho em Altura eventual'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Inspeção e acompanhamento em ambientes com ruído de bombas.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Contato com óleos e desengraxantes.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle metabólico para acesso a áreas industriais e altura.' }
            ]
        },
        {
            id: '05',
            codigo: 'G05',
            nome: 'Manutenção Elétrica',
            cargos: ['Eletricista', 'Eletricista de Manutenção', 'Eletrotécnico', 'Encarregado de Manutenção Elétrica', 'Técnico de Manutenção Elétrica'],
            riscos_pgr: ['Choque Elétrico / Arco Elétrico (SEP)', 'Trabalho em Altura > 2m', 'Ruído Contínuo', 'Campos Eletromagnéticos', 'Particulados'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual com foco neurológico e cardiovascular.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição a ruído de subestações e transformadores.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Trabalho com sistemas elétricos de potência (NR-10) e altura.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Exposição a poeiras minerais e partículas metálicas.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Rastreamento de risco de lipotimia em intervenções de alta tensão.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Manipulação de solventes dielétricos e óleos isolantes.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Obrigatório para intervenções em altura e espaço confinado (NR-35/NR-33).' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: false, just: 'Posturas desfavoráveis em subestações e eletrocalhas.' }
            ]
        },
        {
            id: '06',
            codigo: 'G06',
            nome: 'Manutenção Mecânica',
            cargos: ['Assistente de Campo', 'Eletromecânico', 'Encarregado de Manutenção Mecânica', 'Téc. Manutenção Mecânica I', 'Técnico Mecânico'],
            riscos_pgr: ['Ruído Excessivo de Bombas e Motores', 'Vibração Localizada', 'Óleos e Graxas Minerais', 'Trabalho em Altura > 2m', 'Queda de Peças Pesadas'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição direta a ruído mecânico contínuo.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Trabalho em altura nas estruturas das bombas e comportas.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Fumos de corte, esmerilhamento e poeiras.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle metabólico para trabalhos em altura e esforço pesado.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Contato dérmico crônico com lubrificantes e graxas minerais.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Aptidão comportamental para trabalho em altura (NR-35).' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: false, just: 'Levantamento de peso e manuseio de válvulas pesadas.' }
            ]
        },
        {
            id: '07',
            codigo: 'G07',
            nome: 'Manutenção Civil',
            cargos: ['Encarregado de Campo', 'Encarregado de Obras', 'Pedreiro', 'Servente', 'Técnico Junior'],
            riscos_pgr: ['Poeira Mineral de Cimento e Areia (Sílica)', 'Radiação Solar UV', 'Ruído de Betoneiras e Compactadores', 'Levantamento de Cargas', 'Trabalho em Altura'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído de ferramentas de impacto e betoneiras.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Trabalho em andaimes e taludes de canais em altura.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Exposição a poeiras minerais e cimento.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Risco de síncope em trabalho em altura ao sol.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico para serviços pesados.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Avaliação de trabalho em altura (NR-35).' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: false, just: 'Sobrecarga lombar em transporte de massas e materiais.' },
                { exame_id: 'ige_abelha', periodico: null, demissional: false, just: 'Rastreamento prévio de anafilaxia em obras em áreas abertas.' }
            ]
        },
        {
            id: '08',
            codigo: 'G08',
            nome: 'Motosserras e Roçadeiras',
            cargos: ['Operador de Motosserra', 'Operador de Roçadeira'],
            riscos_pgr: ['Ruído Elevado (> 100 dB(A))', 'Vibração Mãos e Braços (VMB)', 'Cortes e Projeção de Partículas', 'Picadas de Animais Peçonhentos', 'Vapores de Combustíveis'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação osteomuscular e vascular de mãos e punhos.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Nível de pressão sonora crítico gerado por motosserras a combustão.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Visão periférica e atenção contra acidentes com lâminas e correntes.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Sobrecarga cardiovascular em supressão em terreno íngreme.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Inalação de fumos de combustão de motor 2 tempos e serragem.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Prevenção de desmaios operando máquinas cortantes.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Abastecimento diário com gasolina e óleo 2 tempos.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Aptidão para operação de equipamento motomecanizado perigoso.' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: false, just: 'Vibração transmitida aos braços e postura encurvada.' },
                { exame_id: 'ige_abelha', periodico: null, demissional: false, just: 'Risco iminente de ataque de vespas/abelhas durante roçagem de mato.' }
            ]
        },
        {
            id: '09',
            codigo: 'G09',
            nome: 'Motorista de Veículos Leve',
            cargos: ['Motorista de Carro de Passeio', 'Motorista de Apoio Operacional'],
            riscos_pgr: ['Acidentes de Trânsito em Rodovias', 'Postura Sentada Prolongada', 'Vibração Moderada'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Exigência de visão para condução segura em estradas e acessos do canal.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle de glicemia para motoristas.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico regular.' }
            ]
        },
        {
            id: '10',
            codigo: 'G10',
            nome: 'Operador de Sistemas Hídricos',
            cargos: ['Encarregado de Operações', 'Operador de Estação de Bombeamento (EB)'],
            riscos_pgr: ['Ruído Contínuo das Bombas', 'Afogamento em Canais/Represas', 'Eletricidade', 'Trabalho em Altura nas Comportas', 'Trabalho em Turnos'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição contínua nas galerias de bombas da EB.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Monitoramento de painéis e instrumentos de telemetria.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Acesso a comportas, estruturas hidráulicas e altura.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Ambientes confinados e poeiras de arrefecimento.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Trabalho em turnos e prevenção de mal súbito perto da água.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle geral.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Trabalho em altura e confinamento em estações remotas.' }
            ]
        },
        {
            id: '11',
            codigo: 'G11',
            nome: 'Operador de Máquinas',
            cargos: ['Operador de Escavadeira', 'Operador de Retroescavadeira', 'Operador de Pá Carregadeira', 'Operador de Motoniveladora'],
            riscos_pgr: ['Ruído de Motor Diesel', 'Vibração de Corpo Inteiro (VCI)', 'Particulados / Poeira de Terra', 'Colisão e Tombamento'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual com foco em coluna e reflexos.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição a ruído de motor de máquina pesada.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Visão espacial e acuidade visual para operação pesada.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Inalação de poeira de terraplanagem.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle de sonolência diurna e hipoglicemia.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Exposição a combustíveis e calor.' },
                { exame_id: 'rx_coluna', periodico: null, demissional: false, just: 'Avaliação admissional de higidez lombar para VCI.' }
            ]
        },
        {
            id: '12',
            codigo: 'G12',
            nome: 'Motorista Pesado',
            cargos: ['Carreteiro (Caminhão-Carreta)', 'Motorista de Caminhão Basculante', 'Motorista de Caminhão Pipa'],
            riscos_pgr: ['Acidentes Graves de Trânsito', 'Vibração de Corpo Inteiro (VCI)', 'Ruído de Cabine', 'Postura Sentada por Longas Horas'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual para condutores de cargas pesadas.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído de tráfego e motor a diesel.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Obrigatório para condutores categoria C/D/E.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Poeira de estradas vicinais e acessos não pavimentados.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Prevenção de hipoglicemia na direção pesada.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle metabólico e nutricional.' },
                { exame_id: 'rx_coluna', periodico: null, demissional: false, just: 'Avaliação de coluna frente à vibração veicular.' }
            ]
        },
        {
            id: '13',
            codigo: 'G13',
            nome: 'Segurança do Trabalho',
            cargos: ['Engenheiro de Segurança do Trabalho', 'Técnico em Segurança do Trabalho', 'Assistente de Campo SMS'],
            riscos_pgr: ['Radiação Solar UV', 'Ruído Intermitente em Vistorias', 'Deslocamento em Estradas Vicinais', 'Animais Peçonhentos'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Acompanhamento em frentes industriais com ruído.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle clínico geral.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico regular.' }
            ]
        },
        {
            id: '14',
            codigo: 'G14',
            nome: 'Serviços Gerais',
            cargos: ['Auxiliar de Limpeza', 'Auxiliar de Serviços Gerais'],
            riscos_pgr: ['Agentes Biológicos em Sanitários', 'Produtos Domissanitários (Cloro, Detergentes)', 'Movimentos Repetitivos'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual com foco dermatológico e respiratório.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle clínico.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Manipulação de produtos de higienização.' }
            ]
        },
        {
            id: '15',
            codigo: 'G15',
            nome: 'Motorista de Caminhão Comboio',
            cargos: ['Motorista de Comboio de Abastecimento e Lubrificação'],
            riscos_pgr: ['Líquidos Inflamáveis (Óleo Diesel)', 'Vapores Orgânicos e Hidrocarbonetos', 'Incêndio e Explosão', 'Vibração de Corpo Inteiro', 'Ruído da Bomba do Comboio'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual rigorosa (exposição a combustíveis).' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Condução de caminhão com carga perigosa (inflamáveis).' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Rastreamento de risco cardiovascular no manuseio de inflamáveis.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Inalação de vapores de óleo diesel e hidrocarbonetos.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Segurança operacional na condução de carga perigosa.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Bioindicador de exposição a compostos de petróleo e solventes.' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: true, just: 'Manuseio pesado de mangueiras de pressão e carretéis.' }
            ]
        },
        {
            id: '16',
            codigo: 'G16',
            nome: 'Medicina do Trabalho',
            cargos: ['Médico do Trabalho', 'Técnico de Enfermagem do Trabalho'],
            riscos_pgr: ['Agentes Biológicos (Vírus e Bactérias em Atendimentos)', 'Postura Sentada'],
            exames: [
                { exame_id: 'clinico', periodico: 24, demissional: true, just: 'Avaliação clínica bienal para equipe de saúde ocupacional interna.' }
            ]
        },
        {
            id: '17',
            codigo: 'G17',
            nome: 'Lava Jato',
            cargos: ['Servente de Lava Jato', 'Lavador de Veículos'],
            riscos_pgr: ['Umidade Excessiva', 'Ruído de Lavadoras de Alta Pressão', 'Detergentes e Desengraxantes'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual com inspeção dermatológica.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído de hidrojateamento sob pressão.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle geral.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Contato com químicos desengordurantes.' }
            ]
        },
        {
            id: '18',
            codigo: 'G18',
            nome: 'Oficina de Pintura',
            cargos: ['Pintor Industrial', 'Servente de Pintura'],
            riscos_pgr: ['Vapores de Tintas e Solventes (Xileno, Tolueno)', 'Poeira de Lixamento', 'Ruído de Compressores'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual respiratória e dermatológica.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído pneumático de pistolas e compressores.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle clínico.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Exposição a solventes aromáticos e pigmentos metálicos.' }
            ]
        },
        {
            id: '19',
            codigo: 'G19',
            nome: 'Carpintaria',
            cargos: ['Carpinteiro', 'Auxiliar de Carpintaria'],
            riscos_pgr: ['Ruído de Serras Circulares', 'Poeiras de Madeira e Fibras', 'Trabalho em Altura em Fôrmas', 'Sobrecarga Lombar'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Exposição a ruído de alta frequência de serra circular.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Montagem de fôrmas em altura (NR-35).' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Poeira vegetal respirável e serragem.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Segurança em máquinas operatrizes e altura.' },
                { exame_id: 'rx_coluna', periodico: 12, demissional: true, just: 'Manuseio manual pesado de pranchas e painéis de madeira compensada.' },
                { exame_id: 'rx_torax', periodico: 60, demissional: true, just: 'Vigilância radiológica pulmonar por poeiras de corte e fôrmas.' }
            ]
        },
        {
            id: '20',
            codigo: 'G20',
            nome: 'Segurança de Barragem',
            cargos: ['Assistente Social', 'Auxiliar de Topografia', 'Engenheiro Civil de Barragens', 'Geógrafo', 'Leiturista'],
            riscos_pgr: ['Radiação Solar UV', 'Afogamento em Reservatórios', 'Deslocamento em Pistas de Acesso', 'Animais Peçonhentos'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Controle clínico.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico regular.' }
            ]
        },
        {
            id: '21',
            codigo: 'G21',
            nome: 'Topografia',
            cargos: ['Auxiliar de Topografia', 'Leiturista', 'Topógrafo'],
            riscos_pgr: ['Radiação Solar UV Contínua', 'Ruído Intermitente de Obra', 'Picadas de Animais Peçonhentos', 'Caminhadas Extensas em Terreno Irregular'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação dermatológica e osteomuscular anual.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Atuação em frentes com máquinas e tratores.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Inalação de poeira suspensa em terraplanagem.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Prevenção de desidratação e hipoglicemia no sol forte.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico regular.' }
            ]
        },
        {
            id: '22',
            codigo: 'G22',
            nome: 'PCM (Planejamento e Controle de Manutenção)',
            cargos: ['Analista de Sistemas Elétricos', 'Assistente de Campo PCM', 'Técnico de Planejamento'],
            riscos_pgr: ['Postura Sentada', 'Trabalho com Telas', 'Deslocamentos Ocasionais em Áreas Industriais'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' }
            ]
        },
        {
            id: '23',
            codigo: 'G23',
            nome: 'Planejamento Civil',
            cargos: ['Analista de Planejamento Junior', 'Engenheiro Civil', 'Técnico de Obras Civis'],
            riscos_pgr: ['Radiação Solar UV em Visitas', 'Ruído de Obras', 'Queda de Nível em Taludes'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' }
            ]
        },
        {
            id: '24',
            codigo: 'G24',
            nome: 'Sala Técnica',
            cargos: ['Técnico de Edificações', 'Desenhista Projetista', 'Técnico de Medições'],
            riscos_pgr: ['Exigência de Alto Nível de Concentração', 'Postura em Estações de Trabalho'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica ocupacional anual.' }
            ]
        },
        {
            id: '25',
            codigo: 'G25',
            nome: 'Operador de Subestação',
            cargos: ['Operador de Subestação Elétrica'],
            riscos_pgr: ['Alta Tensão / SEP (Risco Grave de Eletrocussão)', 'Ruído de Transformadores', 'Postura Sentada e Rondas', 'Estresse em Manobras'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual com foco em prontidão e reflexos.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Zumbido e ruído característico de 60Hz de subestação.' },
                { exame_id: 'acuidade', periodico: 12, demissional: false, just: 'Identificação visual precisa de barramentos, chaves e disjuntores.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Trabalho em ambientes de alta tensão (NR-10).' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Controle respiratório periódico.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Prevenção de síncope durante manobras de chaves seccionadoras.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle de rotina.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Avaliação de equilíbrio emocional em atividades de alto risco elétrico.' }
            ]
        },
        {
            id: '26',
            codigo: 'G26',
            nome: 'Conservação e Limpeza Subestação e Faixa de Servidão',
            cargos: ['Encarregado de Campo', 'Pedreiro', 'Servente de Limpeza de Faixa'],
            riscos_pgr: ['Proximidade com Linhas Energizadas', 'Radiação Solar UV', 'Picadas de Animais Peçonhentos', 'Levantamento de Peso', 'Ruído de Roçadeiras'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual ocupacional.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído de equipamentos mecânicos de capina e roçagem.' },
                { exame_id: 'ecg', periodico: 12, demissional: true, just: 'Trabalho no pátio de subestações e áreas energizadas.' },
                { exame_id: 'espirometria', periodico: 24, demissional: true, just: 'Poeiras de solo e queima de vegetação.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Segurança em atividades em áreas abertas e quentes.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle geral.' },
                { exame_id: 'psicossocial', periodico: 12, demissional: false, just: 'Trabalho próximo a faixas de alta tensão.' },
                { exame_id: 'rx_coluna', periodico: 24, demissional: true, just: 'Esforço de desmatamento, capina manual e remoção de entulhos.' }
            ]
        },
        {
            id: '27',
            codigo: 'G27',
            nome: 'Inspeção e Monitoramento de Estruturas',
            cargos: ['Servente de Monitoramento', 'Técnico de Monitoramento III'],
            riscos_pgr: ['Afogamento Próximo a Vertedouros e Canais', 'Queda de Nível em Estruturas de Concreto', 'Radiação Solar UV', 'Animais Peçonhentos'],
            exames: [
                { exame_id: 'clinico', periodico: 12, demissional: true, just: 'Avaliação clínica anual.' },
                { exame_id: 'audiometria', periodico: 12, demissional: true, just: 'Ruído de fluxo de água em galerias e condutos forçados.' },
                { exame_id: 'glicose', periodico: 12, demissional: true, just: 'Segurança contra vertigens em bordas de canais e comportas.' },
                { exame_id: 'hemograma', periodico: 12, demissional: true, just: 'Controle hematológico regular.' },
                { exame_id: 'ige_abelha', periodico: null, demissional: false, just: 'Inspeções externas em paredões rochosos e galerias com risco de enxames.' }
            ]
        }
    ];

    // --------------------------------------------------------------------------
    // UTILITÁRIOS PARA EXTRAÇÃO E FORMATACAO DE RISCOS DO CATALOGO / PGR
    // --------------------------------------------------------------------------
    function extrairNomeAgenteRisco(r) {
        if (!r) return '';
        if (typeof r === 'string') return r.trim();
        if (typeof r === 'object') {
            return String(r.agente || r.nome || r.descricao || r.fator_risco || '').trim();
        }
        return String(r).trim();
    }

    function formatarRiscoParaExibicao(r) {
        if (!r) return '';
        if (typeof r === 'string') return r.trim();
        if (typeof r === 'object') {
            var agente = extrairNomeAgenteRisco(r);
            var tipo = String(r.tipo_agente || r.tipo || '').trim();
            if (agente && tipo && !agente.toLowerCase().includes(tipo.toLowerCase())) {
                return agente + ' (' + tipo + ')';
            }
            return agente || tipo || 'Risco Ocupacional';
        }
        return String(r).trim();
    }

    function extrairTextoRiscoParaInferencia(r) {
        if (!r) return '';
        if (typeof r === 'string') return r.toLowerCase();
        if (typeof r === 'object') {
            var partes = [
                r.agente,
                r.tipo_agente,
                r.categoria_risco,
                r.descricao,
                r.fonte_geradora,
                r.danos_saude
            ].filter(Boolean);
            return partes.join(' ').toLowerCase();
        }
        return String(r).toLowerCase();
    }

    function obterCatalogoPcmsoVigente() {
        if (typeof allGheCatalogo !== 'undefined' && Array.isArray(allGheCatalogo)) return allGheCatalogo;
        return Array.isArray(window.allGheCatalogo) ? window.allGheCatalogo : null;
    }

    // Obtém a lista consolidada de GHEs articulada ao catálogo/PGR vigente
    function obterTodasMatrizesPcmsoIntegradas() {
        var catalogo = obterCatalogoPcmsoVigente();

        // Se houver catálogo ativo no sistema/painel, ele é a autoridade dos GHEs vigentes
        if (catalogo !== null) {
            // Catálogo explicitamente vazio ([]) não deve repor a base estática de 27 GHEs
            if (catalogo.length === 0) {
                return [];
            }

            return catalogo.map(function(item) {
                var rawId = String(item.id || '').trim();
                var idSemG = rawId.replace(/^G/i, '');
                var idPad2 = idSemG.padStart(2, '0');
                var codigo = item.codigo || ('G' + idPad2);
                var nome = item.nome || item.descricao || ('GHE ' + rawId);

                // Localiza eventual referência da base canônica
                var baseGhe = GHE_MATRIZ_BASE_INTEGRADA.find(function(b) {
                    var bId = String(b.id || '').trim();
                    return bId === rawId ||
                           bId === idSemG ||
                           bId === idPad2 ||
                           bId.replace(/^0+/, '') === idSemG.replace(/^0+/, '') ||
                           b.codigo === codigo ||
                           b.codigo === item.codigo;
                });

                // Cargos: prioridade para dados do catálogo vigente. Array vazio ([]) é respeitado.
                var cargos = [];
                if (Array.isArray(item.cargos)) {
                    cargos = item.cargos;
                } else if (typeof item.cargos === 'string' && item.cargos.trim()) {
                    cargos = item.cargos.split(/[,;\n]/).map(function(s) { return s.trim(); }).filter(Boolean);
                } else if (baseGhe && Array.isArray(baseGhe.cargos)) {
                    cargos = baseGhe.cargos;
                }

                // Riscos: respeita estritamente o catálogo vigente. Vazio explícito ([]) é preservado!
                var riscosBrutos = null;
                if (Array.isArray(item.riscos_pgr)) {
                    riscosBrutos = item.riscos_pgr;
                } else if (Array.isArray(item.riscos)) {
                    riscosBrutos = item.riscos;
                } else if (typeof item.riscos_pgr === 'string' && item.riscos_pgr.trim()) {
                    riscosBrutos = item.riscos_pgr.split(/[,;\n]/).map(function(s) { return s.trim(); }).filter(Boolean);
                } else if (typeof item.riscos === 'string' && item.riscos.trim()) {
                    riscosBrutos = item.riscos.split(/[,;\n]/).map(function(s) { return s.trim(); }).filter(Boolean);
                }

                var riscosOriginais = [];
                var riscosForamExplicitamenteDefinidos = (riscosBrutos !== null);
                if (riscosForamExplicitamenteDefinidos) {
                    riscosOriginais = riscosBrutos;
                }

                // Normaliza para array de strings limpas e seguras para qualquer renderização
                var riscosFormatadosStrings = riscosOriginais.map(formatarRiscoParaExibicao).filter(Boolean);

                // Texto unificado de busca para inferência clínica (suportando strings e objetos reais de risco)
                var textoCompletoRiscos = riscosOriginais.map(extrairTextoRiscoParaInferencia).join(' ');

                // Não existe neste módulo fluxo de aprovação médica vinculado à
                // versão dos riscos e exames. Flags legadas não o substituem.
                var statusHomologacao = 'PENDENTE_HOMOLOGACAO_MEDICA';
                var propostaPreliminar = true;
                var obs = 'Proposta técnica preliminar, pendente de validação médica documentada da versão vigente dos riscos e exames.';

                var examesEnriquecidos = [];

                {
                    // Proposta clínica preliminar baseada na realidade dos riscos do PGR
                    var metaClinico = CATALOGO_CANONICO_EXAMES_PCMSO.clinico;
                    examesEnriquecidos.push({
                        exame_id: 'clinico',
                        nome: metaClinico ? metaClinico.nome : 'Avaliação Clínica Ocupacional (Anamnese e Exame Físico)',
                        adm: true,
                        periodico: 12,
                        mudanca: true,
                        retorno: true,
                        demissional: true,
                        justificativa: 'Avaliação clínica ocupacional periódica e obrigatória a todos os trabalhadores (NR-07).',
                        norma: 'NR-07'
                    });

                    // Se não há riscos ocupacionais no GHE, apenas a avaliação clínica é devida
                    if (riscosOriginais.length > 0) {
                        if (textoCompletoRiscos.includes('ruído') || textoCompletoRiscos.includes('ruido')) {
                            var metaAud = CATALOGO_CANONICO_EXAMES_PCMSO.audiometria;
                            examesEnriquecidos.push({
                                exame_id: 'audiometria',
                                nome: metaAud ? metaAud.nome : 'Audiometria Tonal Ocupacional',
                                adm: true,
                                periodico: 12,
                                mudanca: true,
                                retorno: true,
                                demissional: true,
                                justificativa: 'Monitoramento auditivo ocupacional (PCA / Anexo II da NR-07).',
                                norma: 'NR-07 Anexo II'
                            });
                        }
                        if (textoCompletoRiscos.includes('altura') || textoCompletoRiscos.includes('eletric') || textoCompletoRiscos.includes('arco') || textoCompletoRiscos.includes('choque')) {
                            var metaEcg = CATALOGO_CANONICO_EXAMES_PCMSO.ecg;
                            examesEnriquecidos.push({
                                exame_id: 'ecg',
                                nome: metaEcg ? metaEcg.nome : 'Eletrocardiograma (ECG com Laudo)',
                                adm: true,
                                periodico: 12,
                                mudanca: true,
                                retorno: true,
                                demissional: true,
                                justificativa: 'Avaliação cardiovascular em atividades com risco crítico (NR-07 / NR-35 / NR-10).',
                                norma: 'NR-07 / NR-35'
                            });
                        }
                        if (textoCompletoRiscos.includes('poeira') || textoCompletoRiscos.includes('sílica') || textoCompletoRiscos.includes('silica') || textoCompletoRiscos.includes('respirat')) {
                            var metaEspiro = CATALOGO_CANONICO_EXAMES_PCMSO.espirometria;
                            examesEnriquecidos.push({
                                exame_id: 'espirometria',
                                nome: metaEspiro ? metaEspiro.nome : 'Espirometria Ocupacional',
                                adm: true,
                                periodico: 24,
                                mudanca: true,
                                retorno: true,
                                demissional: true,
                                justificativa: 'Vigilância respiratória ocupacional perante particulados e poeiras (NR-07).',
                                norma: 'NR-07'
                            });
                        }
                    }
                }

                return {
                    id: rawId,
                    codigo: codigo,
                    nome: nome,
                    cargos: cargos,
                    riscos_pgr: riscosFormatadosStrings,
                    riscos_detalhados: riscosOriginais,
                    exames: examesEnriquecidos,
                    proposta_preliminar: propostaPreliminar,
                    status_homologacao: statusHomologacao,
                    observacao: obs,
                    setor: item.setor || (baseGhe && baseGhe.setor) || 'Operações e Canteiro de Obras',
                    descricao_ambiente: item.descricao_ambiente || (baseGhe && baseGhe.descricao_ambiente) || 'Ambiente operacional e frentes de serviço.'
                };
            });
        }

        // Fallback quando catálogo dinâmico não está carregado: matriz canônica de referência
        return GHE_MATRIZ_BASE_INTEGRADA.map(function(item) {
            var examesEnriquecidos = item.exames.map(function(e) {
                var meta = CATALOGO_CANONICO_EXAMES_PCMSO[e.exame_id] || {
                    nome: e.exame_id,
                    norma: 'NR-07',
                    justificativa_padrao: ''
                };
                return {
                    exame_id: e.exame_id,
                    nome: meta.nome,
                    adm: true,
                    periodico: e.periodico,
                    mudanca: true,
                    retorno: true,
                    demissional: e.demissional,
                    justificativa: e.just || meta.justificativa_padrao,
                    norma: meta.norma
                };
            });

            return {
                id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                cargos: item.cargos,
                riscos_pgr: item.riscos_pgr,
                riscos_detalhados: item.riscos_pgr,
                exames: examesEnriquecidos,
                proposta_preliminar: true,
                status_homologacao: 'PENDENTE_HOMOLOGACAO_MEDICA',
                observacao: 'Referência técnica, sem confirmação do inventário vigente. Emissão bloqueada até carregar o catálogo de GHEs.',
                setor: item.setor || 'Operações e Canteiro de Obras',
                descricao_ambiente: item.descricao_ambiente || 'Ambiente operacional e frentes de serviço.'
            };
        });
    }

    // Filtra ou recupera um GHE específico
    function obterMatrizPcmsoGheIntegrada(gheId) {
        var todos = obterTodasMatrizesPcmsoIntegradas();
        if (!gheId) return todos;
        var rawId = String(gheId).trim();
        var idSemG = rawId.replace(/^G/i, '');
        var idPad2 = idSemG.padStart(2, '0');
        var idSemZeros = idSemG.replace(/^0+/, '') || '0';

        return todos.filter(function(g) {
            var gId = String(g.id || '').trim();
            var gIdSemG = gId.replace(/^G/i, '');
            var gCod = String(g.codigo || '').trim().toUpperCase();
            return gId === rawId ||
                   gId === idSemG ||
                   gId === idPad2 ||
                   gIdSemG.replace(/^0+/, '') === idSemZeros ||
                   gCod === rawId.toUpperCase() ||
                   gCod === ('G' + idPad2).toUpperCase();
        });
    }

    // Renderiza a Seção 9: Matriz de Exames Clínicos e Complementares por GHE
    function renderSecaoMatrizExamesPcmsoHtml() {
        var todasMatrizes = obterTodasMatrizesPcmsoIntegradas();
        var ghesFiltrados = pcmsoMatrizFiltroGhe
            ? obterMatrizPcmsoGheIntegrada(pcmsoMatrizFiltroGhe)
            : todasMatrizes;

        var totalGhes = todasMatrizes.length;
        var totalExamesRegulamentados = Object.keys(CATALOGO_CANONICO_EXAMES_PCMSO).length;

        // Monta as opções do seletor de GHE
        var opcoesSelect = '<option value="">🏢 Todos os ' + totalGhes + ' GHEs (Visão Geral da Empresa)</option>' +
            todasMatrizes.map(function(g) {
                var sel = pcmsoMatrizFiltroGhe === g.id ? ' selected' : '';
                return '<option value="' + g.id + '"' + sel + '>' + g.codigo + ' — ' + escapeHtml(g.nome) + '</option>';
            }).join('');

        // Monta os cards/tabelas de cada GHE
        var cardsHtml = ghesFiltrados.map(function(g) {
            var riscosBadges = (g.riscos_pgr || []).map(function(r) {
                var rNome = typeof r === 'string' ? r : formatarRiscoParaExibicao(r);
                var cor = 'var(--text-light)';
                var bg = 'rgba(100, 116, 139, 0.1)';
                var rLow = String(rNome || '').toLowerCase();
                if (rLow.includes('ruído') || rLow.includes('ruido')) { cor = '#b45309'; bg = '#fef3c7'; }
                else if (rLow.includes('eletricidade') || rLow.includes('choque') || rLow.includes('arco') || rLow.includes('tensão') || rLow.includes('tensao')) { cor = '#b91c1c'; bg = '#fee2e2'; }
                else if (rLow.includes('altura')) { cor = '#c2410c'; bg = '#ffedd5'; }
                else if (rLow.includes('óleo') || rLow.includes('oleo') || rLow.includes('químico') || rLow.includes('quimico') || rLow.includes('combustível') || rLow.includes('combustivel')) { cor = '#4338ca'; bg = '#e0e7ff'; }
                else if (rLow.includes('abelha') || rLow.includes('peçonhento') || rLow.includes('peconhento')) { cor = '#854d0e'; bg = '#fef9c3'; }
                else if (rLow.includes('poeira') || rLow.includes('sílica') || rLow.includes('silica')) { cor = '#475569'; bg = '#f1f5f9'; }

                return '<span style="display:inline-block; font-size:11px; padding:2px 7px; border-radius:12px; font-weight:600; color:' + cor + '; background:' + bg + '; margin-right:4px; margin-bottom:4px;">⚠️ ' + escapeHtml(rNome) + '</span>';
            }).join('');

            if (!riscosBadges) {
                riscosBadges = '<span style="display:inline-block; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; color:#92400e; background:#fef3c7;">Sem fatores de risco cadastrados neste GHE; confirmar avaliação no PGR.</span>';
            }

            var cargosBadges = g.cargos.map(function(c) {
                return '<span style="display:inline-block; font-size:11px; padding:2px 6px; border-radius:4px; background:var(--bg); border:1px solid var(--border); color:var(--text); margin-right:4px; margin-bottom:4px;">👤 ' + escapeHtml(c) + '</span>';
            }).join('');

            var examesRows = g.exames.map(function(e) {
                var periodicoTxt = e.periodico ? e.periodico + ' meses' : '—';
                var demissionalTxt = e.demissional ? '✅ Sim' : '❌ Não';

                var rowHtml = '<tr style="border-bottom: 1px solid var(--border);">' +
                    '<td style="padding: 8px 10px; font-weight: 700; color: var(--text);">' +
                        escapeHtml(e.nome) +
                        '<div style="font-size: 11px; font-weight: normal; color: var(--text-light); margin-top: 2px;">' +
                            '<span style="color: #0f766e; font-weight: 600;">' + escapeHtml(e.norma) + ':</span> ' + escapeHtml(e.justificativa) +
                        '</div>' +
                    '</td>' +
                    '<td style="padding: 8px 10px; text-align: center; color: #16a34a; font-weight: 700;">✅ Sim</td>' +
                    '<td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #0f766e;">' + periodicoTxt + '</td>' +
                    '<td style="padding: 8px 10px; text-align: center; color: #16a34a; font-weight: 700;">✅ Sim</td>' +
                    '<td style="padding: 8px 10px; text-align: center; color: #16a34a; font-weight: 700;">✅ Sim</td>' +
                    '<td style="padding: 8px 10px; text-align: center; font-weight: 600;">' + demissionalTxt + '</td>' +
                '</tr>';
                return rowHtml;
            }).join('');

            var cardHtml = '<div class="db-chart-card" style="padding: 16px 20px; margin-bottom: 16px; border-left: 4px solid #0f766e;">' +
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">' +
                    '<div>' +
                        '<div style="font-size: 14.5px; font-weight: 800; color: #0f766e; display: flex; align-items: center; gap: 8px;">' +
                            '<span style="background: #0f766e; color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 12px;">' + g.codigo + '</span>' +
                            '<span>' + escapeHtml(g.nome) + '</span>' +
                        '</div>' +
                        '<div style="margin-top: 8px;">' +
                            '<div style="font-size: 11.5px; font-weight: 700; color: var(--text-light); margin-bottom: 3px;">Cargos e Funções Mapeadas:</div>' +
                            '<div>' + cargosBadges + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align: right;">' +
                        '<span style="font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(15, 118, 110, 0.1); color: #0f766e;">' +
                            '🩺 ' + g.exames.length + ' exames propostos' +
                        '</span>' +
                    '</div>' +
                '</div>' +

                '<div style="margin-bottom: 12px; padding: 8px 12px; background: var(--bg); border-radius: 6px; border: 1px solid var(--border);">' +
                    '<div style="font-size: 11.5px; font-weight: 700; color: var(--text-light); margin-bottom: 4px;">Fatores de Risco Ocupacionais Avaliados no PGR (NR-01):</div>' +
                    '<div>' + riscosBadges + '</div>' +
                '</div>' +

                '<div style="overflow-x: auto;">' +
                    '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
                        '<thead>' +
                            '<tr style="background: var(--bg); border-bottom: 2px solid var(--border); text-align: left;">' +
                                '<th style="padding: 8px 10px; font-weight: 700; color: var(--text);">Exame Ocupacional (NR-07) & Justificativa Técnica</th>' +
                                '<th style="padding: 8px 10px; text-align: center; width: 85px; color: var(--text);">Admissional</th>' +
                                '<th style="padding: 8px 10px; text-align: center; width: 100px; color: var(--text);">Periódico</th>' +
                                '<th style="padding: 8px 10px; text-align: center; width: 90px; color: var(--text);">Mud. Risco</th>' +
                                '<th style="padding: 8px 10px; text-align: center; width: 90px; color: var(--text);">Retorno</th>' +
                                '<th style="padding: 8px 10px; text-align: center; width: 90px; color: var(--text);">Demissional</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                            examesRows +
                        '</tbody>' +
                    '</table>' +
                '</div>' +
            '</div>';

            return cardHtml;
        }).join('');

        var cardsHtmlContent = cardsHtml;
        if (!cardsHtmlContent) {
            cardsHtmlContent = '<div class="db-chart-card" style="padding: 24px; text-align: center; color: var(--text-light);"><div style="font-size: 14px; font-weight: 700;">Nenhum GHE localizado ou cadastrado no catálogo vigente.</div><div style="font-size: 12px; margin-top: 4px;">Cadastre GHEs no catálogo do sistema ou importe o inventário de riscos do PGR para estruturar a matriz do PCMSO.</div></div>';
        }

        var secaoHtml = '<div class="db-chart-card" style="padding: 20px; margin-bottom: 24px; border-top: 3px solid #0f766e;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">' +
                '<div>' +
                    '<div style="font-size: 15px; font-weight: 800; color: #0f766e; display:flex; align-items:center; gap:8px;">' +
                        '<span>🧬 9. Matriz de Exames Clínicos e Complementares por GHE (NR-07 & PGR)</span>' +
                    '</div>' +
                    '<div style="font-size: 12px; color: var(--text-light); margin-top: 3px;">' +
                        'Proposta de articulação entre o Inventário de Riscos do PGR e o controle médico ocupacional do PCMSO.' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
                    '<label style="font-size:12px; font-weight:700; color:var(--text);">Filtrar GHE:</label>' +
                    '<select id="pcmsoSelectFiltroGhe" onchange="pcmsoMudarFiltroGheMatriz(this.value)" style="padding:6px 10px; border:1px solid var(--border); border-radius:6px; font-size:12px; background:var(--bg); color:var(--text); font-weight:600;">' +
                        opcoesSelect +
                    '</select>' +
                    '<button type="button" class="db-apply-btn" style="background:#0f766e; font-size:12px; padding:6px 12px; font-weight:700;" onclick="pcmsoImprimirMatrizExames()" title="Imprimir matriz geral de exames do PCMSO em formato A4">' +
                        '🖨️ Imprimir Matriz de Exames' +
                    '</button>' +
                '</div>' +
            '</div>' +

            '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">' +
                '<div style="padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; text-align:center;">' +
                    '<div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase;">GHEs Cobertos</div>' +
                    '<div style="font-size:20px; font-weight:800; color:#0f766e; margin-top:2px;">' + totalGhes + ' Grupos</div>' +
                '</div>' +
                '<div style="padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; text-align:center;">' +
                    '<div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase;">Exames Regulamentados</div>' +
                    '<div style="font-size:20px; font-weight:800; color:#2563eb; margin-top:2px;">' + totalExamesRegulamentados + ' Tipos</div>' +
                '</div>' +
                '<div style="padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; text-align:center;">' +
                    '<div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase;">Exames Críticos Altura / Elétrica</div>' +
                    '<div style="font-size:20px; font-weight:800; color:#b91c1c; margin-top:2px;">ECG, EEG, Glicose, Psico</div>' +
                '</div>' +
                '<div style="padding:10px 14px; background:var(--bg); border:1px solid var(--border); border-radius:8px; text-align:center;">' +
                    '<div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase;">Critério Administrativo</div>' +
                    '<div style="font-size:20px; font-weight:800; color:#15803d; margin-top:2px;">Bienal (24m — NR-07)</div>' +
                '</div>' +
            '</div>' +

            '<div id="pcmsoMatrizCardsWrap">' +
                cardsHtmlContent +
            '</div>' +
        '</div>';

        var avisoCatalogo = pcmsoCatalogoLoading ? 'Carregando catálogo vigente de GHEs. Emissão temporariamente bloqueada.'
            : pcmsoCatalogoLoadError ? 'Falha ao carregar o catálogo vigente. Reabra esta aba para tentar novamente. Emissão bloqueada.'
                : !obterCatalogoPcmsoVigente() ? 'Referência técnica: catálogo vigente ainda não carregado. Emissão bloqueada.' : '';
        return '<div role="status" style="padding:12px; margin-bottom:12px; background:#fef3c7; color:#92400e;">' +
            'MINUTA TÉCNICA — exames propostos, pendentes de validação médica documentada da versão vigente dos riscos e exames.' +
            (avisoCatalogo ? '<br>' + avisoCatalogo : '') + '</div>' + secaoHtml;
    }

    function pcmsoMudarFiltroGheMatriz(novoGhe) {
        pcmsoMatrizFiltroGhe = novoGhe || '';
        var wrap = document.getElementById('pcmsoMatrizContainer');
        if (wrap) {
            wrap.innerHTML = renderSecaoMatrizExamesPcmsoHtml();
        }
    }

    // Impressão oficial padronizada da Matriz de Exames do PCMSO
    // --------------------------------------------------------------------------
    // EMISSAO E IMPRESSAO DO CADERNO DE PROTOCOLOS E DIRETRIZES CLINICAS (NR-07)
    // --------------------------------------------------------------------------
    function pcmsoImprimirProtocolosClinicos() {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var d = pcmsoDocBaseDraft || normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var dataAtual = new Date().toLocaleDateString('pt-BR');

        var html = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <title>Minuta de Diretrizes e Protocolos Clínicos — PCMSO (NR-07)</title>' +
'    <style>' +
'        @page { size: A4 portrait; margin: 12mm 14mm; }' +
'        body { font-family: Segoe UI, Arial, sans-serif; font-size: 9.5pt; color: #0f172a; line-height: 1.4; margin: 0; padding: 0; }' +
'        .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }' +
'        .empresa { font-size: 13pt; font-weight: 800; color: #0f766e; }' +
'        .sub { font-size: 9pt; color: #475569; margin-top: 2px; }' +
'        .aviso-minuta { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 8.5pt; font-weight: 600; margin-bottom: 14px; line-height: 1.35; }' +
'        .bloco { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }' +
'        .bloco-titulo { font-size: 10pt; font-weight: 800; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }' +
'        .campo-label { font-weight: 700; color: #334155; font-size: 8.5pt; margin-top: 4px; }' +
'        .campo-valor { font-size: 9pt; color: #0f172a; margin-bottom: 6px; text-align: justify; }' +
'        .footer { margin-top: 18px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b; }' +
'        .assinaturas { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; page-break-inside: avoid; }' +
'        .ass-linha { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 8.5pt; }' +
'    </style>' +
'</head>' +
'<body>' +
'    <div class="header">' +
'        <div>' +
'            <div class="empresa">' + escapeHtml(d.razao_social) + '</div>' +
'            <div class="sub">PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL — PCMSO (NR-07)</div>' +
'            <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">CNPJ: ' + escapeHtml(d.cnpj) + ' | Código: ' + escapeHtml(d.codigo_documento) + ' | Revisão: ' + escapeHtml(d.revisao_atual) + '</div>' +
'        </div>' +
'        <div style="text-align: right; font-size: 8pt;">' +
'            <div><b>Médico Coordenador:</b> ' + escapeHtml(d.medico_coordenador.nome) + '</div>' +
'            <div>CRM: ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE: ' + escapeHtml(d.medico_coordenador.rqe) + '</div>' +
'        </div>' +
'    </div>' +

'    <div class="aviso-minuta">' +
'        📋 <b>PROPOSTA TÉCNICA DE DIRETRIZES E PROTOCOLOS CLÍNICOS (MINUTA):</b> Proposta estruturada pela Engenharia de Segurança do Trabalho com base no Inventário de Riscos do PGR (NR-01) e diretrizes da NR-07 (Portaria SEPRT nº 6.734/2020), submetida à análise, adequação técnica e homologação formal pelo Médico do Trabalho Coordenador.' +
'    </div>' +

'    <div class="bloco">' +
'        <div class="bloco-titulo">1. DIRETRIZES TÉCNICAS E PROCEDIMENTOS CLÍNICOS OCUPACIONAIS (NR-07)</div>' +
'        <div class="campo-label">Exame Admissional:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.criterio_admissional) + '</div>' +
'        <div class="campo-label">Exame Periódico:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.criterio_periodico) + '</div>' +
'        <div class="campo-label">Retorno ao Trabalho (ausência ≥ 30 dias):</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.criterio_retorno_trabalho) + '</div>' +
'        <div class="campo-label">Mudança de Riscos Ocupacionais:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.criterio_mudanca_risco) + '</div>' +
'        <div class="campo-label">Exame Demissional:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.criterio_demissional) + '</div>' +
'        <div class="campo-label">Requisitos e Emissão do ASO:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.requisitos_minimos_aso) + '</div>' +
'        <div class="campo-label">Condutas em Exames Alterados e Notificação Previdenciária:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.diretrizes_clinicas.condutas_exames_alterados) + '</div>' +
'    </div>' +

'    <div class="bloco">' +
'        <div class="bloco-titulo">2. PROTOCOLO DE CONSERVAÇÃO AUDITIVA (PCA — NR-07 ANEXO II)</div>' +
'        <div class="campo-label">Critério de Inclusão:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.pca_ruido.criterio_inclusao) + '</div>' +
'        <div class="campo-label">Repouso Auditivo:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.pca_ruido.repouso_acustico) + '</div>' +
'        <div class="campo-label">Periodicidade:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.pca_ruido.periodicidade) + '</div>' +
'        <div class="campo-label">Critérios de Interpretação e Diagnóstico Diferencial de PAIR:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.pca_ruido.criterios_interpretacao) + '</div>' +
'        <div class="campo-label">Condutas em Desencadeamento / Agravamento de PAIR:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.pca_ruido.condutas_exames_alterados) + '</div>' +
'    </div>' +

'    <div class="bloco">' +
'        <div class="bloco-titulo">3. PROTOCOLO DE VIGILÂNCIA RESPIRATÓRIA (NR-07 ANEXO III E PGR)</div>' +
'        <div class="campo-label">Critério de Inclusão:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao) + '</div>' +
'        <div class="campo-label">Metodologia Radiológica (Padrão OIT):</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox) + '</div>' +
'        <div class="campo-label">Critérios de Espirometria Ocupacional (SBPT):</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria) + '</div>' +
'        <div class="campo-label">Periodicidade:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.periodicidade) + '</div>' +
'        <div class="campo-label">Condutas em Alterações Respiratórias:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados) + '</div>' +
'    </div>' +

'    <div class="bloco">' +
'        <div class="bloco-titulo">4. PROTOCOLO PARA ATIVIDADES CRÍTICAS (ALTURA NR-35, CONFINADO NR-33 E ITEM 7.5.18 DA NR-07)</div>' +
'        <div class="campo-label">Critério de Inclusão:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.atividades_criticas.criterio_inclusao) + '</div>' +
'        <div class="campo-label">Proposta de Exames Complementares Específicos:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.atividades_criticas.exames_obrigatorios) + '</div>' +
'        <div class="campo-label">Critérios Clínicos de Aptidão:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica) + '</div>' +
'        <div class="campo-label">Avaliação Psicossocial Estruturada:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.atividades_criticas.avaliacao_psicossocial) + '</div>' +
'        <div class="campo-label">Validade da Aptidão:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.atividades_criticas.validade_aptidao) + '</div>' +
'    </div>' +

'    <div class="bloco">' +
'        <div class="bloco-titulo">5. PROTOCOLO DE SANIDADE PARA MANIPULAÇÃO DE ALIMENTOS E APOIO SANITÁRIO</div>' +
'        <div class="campo-label">Público-Alvo do Protocolo:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.criterio_inclusao) + '</div>' +
'        <div class="campo-label">Exames Complementares:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.exames_obrigatorios) + '</div>' +
'        <div class="campo-label">Periodicidade:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.periodicidade) + '</div>' +
'        <div class="campo-label">Condutas em Coprologia Positiva / Enteropatógenos:</div>' +
'        <div class="campo-valor">' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados) + '</div>' +
'    </div>' +

'    <div class="assinaturas">' +
'        <div class="ass-linha">' +
'            <b>JOÃO EVERTON DE SOUZA LIMEIRA</b><br>' +
'            Engenheiro de Segurança do Trabalho<br>' +
'            Proposição Técnica e Articulação com PGR (NR-01)' +
'        </div>' +
'        <div class="ass-linha">' +
'            <b>' + escapeHtml(d.medico_coordenador.nome) + '</b><br>' +
'            CRM ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) + '<br>' +
'            Médico do Trabalho Coordenador — Homologação Clínica (NR-07)' +
'        </div>' +
'    </div>' +

'    <div class="footer">' +
'        <div>Caderno de Diretrizes e Protocolos Clínicos do PCMSO (NR-07) — Minuta Técnica Preliminar</div>' +
'        <div>Emissão: ' + dataAtual + '</div>' +
'    </div>' +
'</body>' +
'</html>';

        if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
            abrirDocumentoHtmlParaImpressao(html, 'Protocolos_Clinicos_PCMSO_NR07');
        } else {
            var frame = document.createElement('iframe');
            frame.style.position = 'fixed';
            frame.style.right = '0';
            frame.style.bottom = '0';
            frame.style.width = '0';
            frame.style.height = '0';
            frame.style.border = '0';
            document.body.appendChild(frame);
            frame.contentWindow.document.open();
            frame.contentWindow.document.write(html);
            frame.contentWindow.document.close();
            setTimeout(function() {
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                } catch (e) {
                    console.error('Falha ao imprimir protocolos:', e);
                } finally {
                    setTimeout(function() {
                        if (frame.parentNode) frame.parentNode.removeChild(frame);
                    }, 2000);
                }
            }, 500);
        }
    }

    window.pcmsoImprimirProtocolosClinicos = pcmsoImprimirProtocolosClinicos;
    
    function executarEmissaoCadernoPcmsoSelecionado() {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var radios = document.getElementsByName('cadernoPcmsoTipo');
        var tipo = 'completo';
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                tipo = radios[i].value;
                break;
            }
        }

        fecharModalCadernosPcmso();

        if (tipo === 'completo') {
            pcmsoEmitirDocumentoCompleto();
        } else if (tipo === 'protocolos') {
            pcmsoImprimirProtocolosClinicos();
        } else if (tipo === 'matriz') {
            pcmsoImprimirMatrizExames();
        } else if (tipo === 'individual_ghe') {
            var sel = document.getElementById('pcmsoCadernoSelectGhe');
            var codGhe = sel ? sel.value : '01';
            pcmsoEmitirCadernoIndividualGhe(codGhe);
        } else if (tipo === 'relatorio_anual') {
            pcmsoEmitirRelatorioAnaliticoAnual();
        }
    }

    window.executarEmissaoCadernoPcmsoSelecionado = executarEmissaoCadernoPcmsoSelecionado;
    window.abrirModalCadernosPcmso = abrirModalCadernosPcmso;
    window.fecharModalCadernosPcmso = fecharModalCadernosPcmso;
    window.pcmsoEmitirCadernoIndividualGhe = pcmsoEmitirCadernoIndividualGhe;
    window.pcmsoEmitirDocumentoCompleto = pcmsoEmitirDocumentoCompleto;
    window.pcmsoDispararImpressaoHtml = pcmsoDispararImpressaoHtml;
    window.pcmsoObterDadosRelatorioAnalitico = pcmsoObterDadosRelatorioAnalitico;
    window.pcmsoEmitirRelatorioAnaliticoAnual = pcmsoEmitirRelatorioAnaliticoAnual;


    
    function pcmsoImprimirMatrizExames() {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var ghes = pcmsoMatrizFiltroGhe
            ? obterMatrizPcmsoGheIntegrada(pcmsoMatrizFiltroGhe)
            : obterTodasMatrizesPcmsoIntegradas();

        var d = window.pcmsoDocBase || obterPcmsoDocBaseDefaults();
        var dataAtualFormatada = new Date().toLocaleDateString('pt-BR');

        var linhasTabelaHtml = ghes.map(function(g) {
            var examesLista = g.exames.map(function(e) {
                var per = e.periodico ? '(' + e.periodico + 'm)' : '';
                return '<b>' + escapeHtml(e.nome) + '</b> ' + per;
            }).join('; ');

            var riscosLista = g.riscos_pgr.map(escapeHtml).join(', ');

            return '<tr>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold; width:70px; text-align:center;">' + escapeHtml(g.codigo) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold; width:160px;">' + escapeHtml(g.nome) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-size:9pt; width:180px;">' + riscosLista + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-size:9pt;">' + examesLista + '</td>' +
            '</tr>';
        }).join('');

        var htmlDocumento = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <title>Matriz Geral de Exames Ocupacionais — PCMSO (NR-07)</title>' +
'    <style>' +
'        @page { size: A4 landscape; margin: 10mm; }' +
'        body { font-family: Segoe UI, Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 0; padding: 0; }' +
'        .cabecalho { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }' +
'        .titulo { font-size: 14pt; font-weight: 800; color: #0f766e; }' +
'        .subtitulo { font-size: 10pt; color: #475569; margin-top: 3px; }' +
'        .tabela { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
'        .tabela th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-size: 9.5pt; text-align: left; }' +
'        .tabela td { font-size: 9pt; }' +
'        .rodape { margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #64748b; }' +
'    </style>' +
'</head>' +
'<body>' +
'    <div class="cabecalho">' +
'        <div>' +
'            <div class="titulo">' + escapeHtml(d.razao_social) + '</div>' +
'            <div class="subtitulo">PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL — PCMSO (NR-07)</div>' +
'            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">CNPJ: ' + escapeHtml(d.cnpj) + ' | Código: ' + escapeHtml(d.codigo_documento) + ' | Vigência: ' + escapeHtml(d.vigencia_inicio) + ' a ' + escapeHtml(d.vigencia_fim) + '</div>' +
'        </div>' +
'        <div style="text-align: right; font-size: 8.5pt;">' +
'            <div><b>Médico Coordenador:</b> ' + escapeHtml(d.medico_coordenador.nome) + '</div>' +
'            <div>CRM: ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE: ' + escapeHtml(d.medico_coordenador.rqe) + '</div>' +
'        </div>' +
'    </div>' +
'    <div style="font-size: 11pt; font-weight: 700; color: #0f766e; margin-bottom: 6px;">' +
'        QUADRO GERAL DE EXAMES CLÍNICOS E COMPLEMENTARES POR GHE (ARTICULAÇÃO PGR / NR-07)' +
'    </div>' +
'    <div style="padding:8px; background:#fef3c7; color:#92400e;"><b>MINUTA TÉCNICA — exames propostos, pendentes de validação médica documentada da versão vigente dos riscos e exames.</b></div>' +
'    <table class="tabela">' +
'        <thead>' +
'            <tr>' +
'                <th style="text-align:center;">GHE</th>' +
'                <th>Grupo Homogêneo</th>' +
'                <th>Fatores de Risco Identificados (PGR)</th>' +
'                <th>Exames Médicos Ocupacionais Propostos & Periodicidade</th>' +
'            </tr>' +
'        </thead>' +
'        <tbody>' +
'            ' + linhasTabelaHtml +
'        </tbody>' +
'    </table>' +
'    <div class="rodape">' +
'        <div>Documento gerado pelo Módulo PCMSO (NR-07) — PISF Ramal do Agreste</div>' +
'        <div>Emissão: ' + dataAtualFormatada + ' | Página 1 de 1</div>' +
'    </div>' +
'</body>' +
'</html>';

        if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
            abrirDocumentoHtmlParaImpressao(htmlDocumento, 'Matriz_Exames_PCMSO_NR07');
        } else {
            var frame = document.createElement('iframe');
            frame.style.position = 'fixed';
            frame.style.right = '0';
            frame.style.bottom = '0';
            frame.style.width = '0';
            frame.style.height = '0';
            frame.style.border = '0';
            document.body.appendChild(frame);
            frame.contentWindow.document.open();
            frame.contentWindow.document.write(htmlDocumento);
            frame.contentWindow.document.close();
            setTimeout(function() {
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                } catch (e) {
                    console.error('Falha ao disparar impressão via iframe:', e);
                } finally {
                    setTimeout(function() {
                        if (frame.parentNode) frame.parentNode.removeChild(frame);
                    }, 2000);
                }
            }, 500);
        }
    }


    function pcmsoGarantirCatalogoCarregado() {
        if (pcmsoCatalogoLoading) return pcmsoCatalogoLoading;
        pcmsoCatalogoLoadError = null;
        // Consulta explícita ao abrir a aba: [] inicial não comprova consulta vazia.
        pcmsoCatalogoLoading = Promise.resolve().then(function() {
            if (typeof supabaseFetch !== 'function') throw new Error('Serviço de consulta indisponível');
            return supabaseFetch('ghe_catalogo', '?select=*');
        }).then(function(rows) {
            if (!Array.isArray(rows)) throw new Error('Resposta inválida ao consultar o catálogo de GHEs');
            window.allGheCatalogo = rows;
            // O núcleo declara var allGheCatalogo; também preserva eventual binding lexical.
            if (typeof allGheCatalogo !== 'undefined') allGheCatalogo = rows;
            return true;
        }).catch(function(err) {
            pcmsoCatalogoLoadError = err.message || 'Falha ao carregar o catálogo de GHEs';
            return false;
        }).then(function(ok) {
            pcmsoCatalogoLoading = null;
            // Atualiza apenas a matriz, preservando os campos em edição.
            var matrizWrap = document.getElementById('pcmsoMatrizContainer');
            if (matrizWrap) matrizWrap.innerHTML = renderSecaoMatrizExamesPcmsoHtml();
            return ok;
        });
        return pcmsoCatalogoLoading;
    }

    function pcmsoOnAbrirAbaDocBase() {
        var catalogoPromise = pcmsoGarantirCatalogoCarregado();
        var documentoPromise = Promise.resolve(true);
        if (!pcmsoDocBaseLoaded && !pcmsoDocBaseLoading) {
            documentoPromise = carregarPcmsoDocBase();
        } else if (pcmsoDocBaseLoaded) {
            renderPcmsoDocBaseView();
        }
        return Promise.all([catalogoPromise, documentoPromise]).then(function(resultados) {
            return resultados.every(function(ok) { return ok === true; });
        });
    }


    // ==========================================================================
    // ETAPA 4: MOTOR DE EMISSAO MODULAR DO PCMSO (NR-07)
    // ==========================================================================

    function abrirModalCadernosPcmso() {
        var modal = document.getElementById('modalCadernosPcmso');
        if (modal) {
            modal.style.display = 'flex';
            popularSelectGhesModalCadernoPcmso();
        }
    }

    function fecharModalCadernosPcmso() {
        var modal = document.getElementById('modalCadernosPcmso');
        if (modal) modal.style.display = 'none';
    }

    function popularSelectGhesModalCadernoPcmso() {
        var sel = document.getElementById('pcmsoCadernoSelectGhe');
        if (!sel) return;
        var ghes = typeof obterTodasMatrizesPcmsoIntegradas === 'function' ? obterTodasMatrizesPcmsoIntegradas() : [];
        sel.innerHTML = ghes.map(function(g) {
            return '<option value="' + g.codigo + '">GHE ' + g.codigo + ' — ' + escapeHtml(g.nome) + '</option>';
        }).join('');
    }

    // --------------------------------------------------------------------------
    // GERADOR DO CADERNO INDIVIDUAL DE SAÚDE POR GHE (A4)
    // --------------------------------------------------------------------------
    function pcmsoEmitirCadernoIndividualGhe(codigoGhe) {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var d = pcmsoDocBaseDraft || normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var codLimpo = String(codigoGhe || '').replace(/^G/i, '');
        var gheRaw = typeof obterMatrizPcmsoGheIntegrada === 'function' ? (obterMatrizPcmsoGheIntegrada(codigoGhe) || obterMatrizPcmsoGheIntegrada(codLimpo)) : null;
        var ghe = Array.isArray(gheRaw) ? gheRaw[0] : gheRaw;
        if (!ghe) {
            alert('GHE ' + codigoGhe + ' não localizado na base integrada do PGR/PCMSO.');
            return;
        }
        var cargosStr = Array.isArray(ghe.cargos) ? ghe.cargos.join('; ') : (ghe.cargos || 'Funções operacionais');
        var setorStr = ghe.setor || 'Operações e Canteiro de Obras';
        var descStr = ghe.descricao_ambiente || 'Ambiente operacional e frentes de serviço do PISF Ramal do Agreste.';

        var dataAtual = new Date().toLocaleDateString('pt-BR');

        var riscosHtml = Array.isArray(ghe.riscos_pgr)
            ? ghe.riscos_pgr.map(function(r) {
                return '<tr>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:600;" colspan="2">' + escapeHtml(r) + '</td>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1;" colspan="2">Identificado e classificado no Inventário de Riscos do PGR (NR-01)</td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="4" style="padding:6px;">Nenhum risco registrado.</td></tr>';

        var examesHtml = Array.isArray(ghe.exames)
            ? ghe.exames.map(function(e) {
                var periodicidadeTexto = e.periodico ? 'Periódico (' + e.periodico + ' meses)' : 'Admissional / Demissional';
                return '<tr>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:700; color:#0f766e;">' + escapeHtml(e.nome) + '</td>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1; font-size:8.5pt;">' + escapeHtml(e.norma) + '</td>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1; font-size:8.5pt;">' + escapeHtml(periodicidadeTexto) + '</td>' +
                    '<td style="padding:6px; border:1px solid #cbd5e1; font-size:8.5pt;">' + escapeHtml(e.justificativa) + '</td>' +
                '</tr>';
            }).join('')
            : '<tr><td colspan="4" style="padding:6px;">Nenhum exame registrado.</td></tr>';

        var html = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <title>Caderno de Saúde Ocupacional — GHE ' + ghe.codigo + ' — PCMSO (NR-07)</title>' +
'    <style>' +
'        @page { size: A4 portrait; margin: 12mm 14mm; }' +
'        body { font-family: Segoe UI, Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.35; margin: 0; padding: 0; }' +
'        .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }' +
'        .empresa { font-size: 12pt; font-weight: 800; color: #0f766e; }' +
'        .aviso-minuta { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 6px 10px; border-radius: 4px; font-size: 8pt; font-weight: 600; margin-bottom: 10px; }' +
'        .card-ghe { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; }' +
'        .titulo-ghe { font-size: 11pt; font-weight: 800; color: #0f766e; margin-bottom: 4px; }' +
'        .tabela { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; }' +
'        .tabela th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; font-size: 8.5pt; text-align: left; }' +
'        .tabela td { font-size: 8.5pt; }' +
'        .secao-titulo { font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-top: 10px; margin-bottom: 4px; }' +
'        .assinaturas { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; page-break-inside: avoid; }' +
'        .ass-linha { border-top: 1px solid #0f172a; text-align: center; padding-top: 5px; font-size: 8pt; }' +
'        .footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }' +
'    </style>' +
'</head>' +
'<body>' +
'    <div class="header">' +
'        <div>' +
'            <div class="empresa">' + escapeHtml(d.razao_social) + '</div>' +
'            <div style="font-size:8.5pt; color:#475569;">CADERNO ESPECÍFICO DE SAÚDE OCUPACIONAL — PCMSO (NR-07)</div>' +
'        </div>' +
'        <div style="text-align: right; font-size: 8pt;">' +
'            <div><b>Médico Coordenador:</b> ' + escapeHtml(d.medico_coordenador.nome) + '</div>' +
'            <div>CRM ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) + '</div>' +
'        </div>' +
'    </div>' +

'    <div class="aviso-minuta">' +
'        📋 <b>MINUTA TÉCNICA INDIVIDUAL POR GHE:</b> Ficha médica ocupacional estruturada conforme Inventário de Riscos do PGR (NR-01) para análise e parecer do Médico do Trabalho Coordenador.' +
'    </div>' +

'    <div class="card-ghe">' +
'        <div class="titulo-ghe">GHE ' + ghe.codigo + ' — ' + escapeHtml(ghe.nome) + '</div>' +
'        <div style="font-size: 8.5pt; margin-bottom: 3px;"><b>Setor Operacional:</b> ' + escapeHtml(setorStr) + '</div>' +
'        <div style="font-size: 8.5pt; margin-bottom: 3px;"><b>Cargos e Funções Abrangidos:</b> ' + escapeHtml(cargosStr) + '</div>' +
'        <div style="font-size: 8.5pt; color: #475569;"><b>Descrição Operacional:</b> ' + escapeHtml(descStr) + '</div>' +
'    </div>' +

'    <div class="secao-titulo">1. Fatores de Risco Ocupacionais Identificados no PGR</div>' +
'    <table class="tabela">' +
'        <thead><tr><th>Tipo</th><th>Fator de Risco / Agente</th><th>Fonte Geradora</th><th>Intensidade / Exposição</th></tr></thead>' +
'        <tbody>' + riscosHtml + '</tbody>' +
'    </table>' +

'    <div class="secao-titulo">2. Exames Médicos Ocupacionais Exigidos & Periodicidade (NR-07)</div>' +
'    <table class="tabela">' +
'        <thead><tr><th>Exame</th><th>Natureza do Procedimento</th><th>Periodicidade Mandatória</th><th>Critério Clínico / Diagnóstico</th></tr></thead>' +
'        <tbody>' + examesHtml + '</tbody>' +
'    </table>' +

'    <div class="assinaturas">' +
'        <div class="ass-linha"><b>JOÃO EVERTON DE SOUZA LIMEIRA</b><br>Engenheiro de Segurança do Trabalho<br>Gestão SST — PGR (NR-01)</div>' +
'        <div class="ass-linha"><b>' + escapeHtml(d.medico_coordenador.nome) + '</b><br>CRM ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) + '<br>Médico do Trabalho Coordenador (NR-07)</div>' +
'    </div>' +

'    <div class="footer">' +
'        <div>Caderno Individual de Saúde — GHE ' + ghe.codigo + ' — PISF Ramal do Agreste</div>' +
'        <div>Emissão: ' + dataAtual + '</div>' +
'    </div>' +
'</body>' +
'</html>';

        pcmsoDispararImpressaoHtml(html, 'Caderno_Saude_GHE_' + ghe.codigo);
    }

    // --------------------------------------------------------------------------
    // GERADOR DO PCMSO COMPLETO CONSOLIDADO (ESTRUTURA INTEGRAL NR-07 / PGR)
    // --------------------------------------------------------------------------
    function pcmsoEmitirDocumentoCompleto() {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var d = pcmsoDocBaseDraft || normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var dataAtual = new Date().toLocaleDateString('pt-BR');
        var ghes = typeof obterTodasMatrizesPcmsoIntegradas === 'function' ? obterTodasMatrizesPcmsoIntegradas() : [];

        // Linhas do Histórico de Revisões
        var revisoesHtml = (d.historico_revisoes || []).map(function(rev) {
            return '<tr>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; text-align:center; font-weight:700;">Rev ' + escapeHtml(rev.revisao) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">' + escapeHtml(rev.data) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1;">' + escapeHtml(rev.descricao) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1;">' + escapeHtml(rev.responsavel) + '</td>' +
            '</tr>';
        }).join('');

        // Médicos Examinadores Credenciados
        var examinadoresHtml = (d.medicos_examinadores || []).map(function(med) {
            return '• <b>' + escapeHtml(med.nome) + '</b> — CRM ' + escapeHtml(med.crm) + ' (' + escapeHtml(med.cidade_uf) + ') — ' + escapeHtml(med.papel) + '<br>';
        }).join('');

        // Representantes Legais da Empresa
        var repsHtml = (d.representantes_legais || []).map(function(r) {
            return '• <b>' + escapeHtml(r.nome) + '</b> — ' + escapeHtml(r.cargo) + '<br>';
        }).join('');

        // Monta tabela consolidada com todos os 27 GHEs da obra
        var linhasTabelaGhes = ghes.map(function(g) {
            var cargosStr = Array.isArray(g.cargos) ? g.cargos.join(', ') : '—';
            var riscosStr = Array.isArray(g.riscos_pgr)
                ? g.riscos_pgr.map(function(r) { return '• ' + escapeHtml(r); }).join('<br>')
                : '—';
            var examesStr = Array.isArray(g.exames)
                ? g.exames.map(function(e) { return '• <b>' + escapeHtml(e.nome) + ':</b> ' + (e.periodico ? e.periodico + 'm' : 'Adm/Dem'); }).join('<br>')
                : '—';
            return '<tr>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; text-align:center; font-weight:bold;">' + escapeHtml(g.codigo) + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-weight:bold;">' + escapeHtml(g.nome) + '<br><span style="font-size:7.5pt; color:#475569; font-weight:normal;"><b>Cargos:</b> ' + escapeHtml(cargosStr) + '</span></td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-size:8pt;">' + riscosStr + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-size:8pt;">' + examesStr + '</td>' +
            '</tr>';
        }).join('');

        // Cronograma Anual
        var cronHtml = (d.cronograma_acoes_saude || []).map(function(c) {
            return '<tr>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:bold;">' + escapeHtml(c.mes) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1;">' + escapeHtml(c.acao) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1;">' + escapeHtml(c.responsavel) + '</td>' +
            '</tr>';
        }).join('');

        var html = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <title>PCMSO Completo Consolidado — ' + escapeHtml(d.razao_social) + '</title>' +
'    <style>' +
'        @page { size: A4 portrait; margin: 12mm 14mm; }' +
'        body { font-family: Segoe UI, Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.45; margin: 0; padding: 0; }' +
'        .capa { min-height: 88vh; display: flex; flex-direction: column; justify-content: space-between; text-align: center; padding: 30px 20px; page-break-after: always; }' +
'        .capa-empresa { font-size: 16pt; font-weight: 800; color: #0f766e; }' +
'        .capa-titulo { font-size: 18pt; font-weight: 900; color: #0f172a; margin: 30px 0 10px; line-height: 1.25; }' +
'        .capa-sub { font-size: 10.5pt; color: #475569; max-width: 650px; margin: 0 auto; line-height: 1.4; }' +
'        .aviso-minuta { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 8.5pt; font-weight: 600; margin: 14px 0; line-height: 1.35; text-align: justify; }' +
'        .bloco { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }' +
'        .bloco-titulo { font-size: 10pt; font-weight: 800; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }' +
'        .subtitulo { font-size: 9pt; font-weight: 800; color: #1e293b; margin-top: 8px; margin-bottom: 4px; }' +
'        .paragrafo { font-size: 8.5pt; color: #334155; text-align: justify; margin-bottom: 6px; }' +
'        .tabela { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; }' +
'        .tabela th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; font-size: 8pt; text-align: left; }' +
'        .tabela td { font-size: 8pt; }' +
'        .quebra-pagina { page-break-before: always; }' +
'        .assinaturas { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; page-break-inside: avoid; }' +
'        .ass-linha { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 8pt; }' +
'        .footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }' +
'    </style>' +
'</head>' +
'<body>' +

'    <!-- CAPA DO PROGRAMA -->' +
'    <div class="capa">' +
'        <div>' +
'            <div class="capa-empresa">' + escapeHtml(d.razao_social) + '</div>' +
'            <div style="font-size:9pt; color:#64748b; margin-top:4px;">CNPJ: ' + escapeHtml(d.cnpj) + ' | CNAE ' + escapeHtml(d.cnae_principal) + ' (' + escapeHtml(d.atividade_principal) + ') — Grau de Risco ' + escapeHtml(d.grau_risco) + '</div>' +
'        </div>' +
'        <div>' +
'            <div class="capa-titulo">PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL — PCMSO</div>' +
'            <div class="capa-sub">Articulado ao Programa de Gerenciamento de Riscos (GRO/PGR — NR-01) e em estrita observância à NR-07 (Portaria SEPRT nº 6.734/2020)</div>' +
'            <div style="margin-top:20px; font-weight:700; color:#0f766e; font-size:11pt;">Revisão ' + escapeHtml(d.revisao_atual) + ' | Código: ' + escapeHtml(d.codigo_documento) + '</div>' +
'            <div style="font-size:9pt; color:#64748b; margin-top:4px;">Vigência: ' + escapeHtml(d.vigencia_inicio) + ' a ' + escapeHtml(d.vigencia_fim) + ' | ' + escapeHtml(d.municipio_uf) + '</div>' +
'        </div>' +
'        <div class="aviso-minuta">' +
'            📋 <b>DOCUMENTO TÉCNICO INTERNO (MINUTA PRELIMINAR):</b> Elaborado e estruturado pela Engenharia de Segurança do Trabalho em articulação com o Inventário de Riscos do PGR, para fundamentação, adequação técnica e homologação formal pelo Médico do Trabalho Coordenador ' + escapeHtml(d.medico_coordenador.nome) + (d.medico_coordenador.crm ? ' (CRM ' + escapeHtml(d.medico_coordenador.crm) + (d.medico_coordenador.rqe ? ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) : '') + ')' : '') + '.' +
'        </div>' +
'        <div style="text-align:center; font-size:8.5pt; color:#475569;">' +
'            <b>Representantes Legais do Consórcio:</b><br>' + repsHtml +
'        </div>' +
'    </div>' +

'    <!-- SUMÁRIO EXECUTIVO E CONTROLE DE REVISÕES -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">CONTROLE DE REVISÕES E HISTÓRICO DOCUMENTAL</div>' +
'        <table class="tabela">' +
'            <thead><tr><th style="width:50px; text-align:center;">Revisão</th><th style="width:85px; text-align:center;">Data</th><th>Descrição da Alteração / Finalidade</th><th style="width:170px;">Responsável Técnico</th></tr></thead>' +
'            <tbody>' + revisoesHtml + '</tbody>' +
'        </table>' +
'        <div style="margin-top:10px;">' +
'            <b>Médicos Examinadores Credenciados e Equipe Clínica:</b><br>' +
'            <div style="font-size:8.5pt; color:#334155; margin-top:4px;">' + examinadoresHtml + '</div>' +
'        </div>' +
'    </div>' +

'    <div class="bloco" id="sumario">' +
'        <div class="bloco-titulo">SUMÁRIO GERAL DO PROGRAMA</div>' +
'        <div style="font-size:8.5pt; color:#1e293b; line-height:1.7;">' +
'            <a href="#cap1" style="text-decoration:none; color:#0f766e; font-weight:700;">1. INTRODUÇÃO, OBJETIVOS E ARTICULAÇÃO COM O PGR (NR-01)</a><br>' +
'            <a href="#cap2" style="text-decoration:none; color:#0f766e; font-weight:700;">2. RESPONSABILIDADES LEGAIS E GOVERNANÇA MÉDICA OCUPACIONAL (NR-07 ITEM 7.4)</a><br>' +
'            <a href="#cap3" style="text-decoration:none; color:#0f766e; font-weight:700;">3. DESENVOLVIMENTO DO PCMSO E VIGILÂNCIA DE SAÚDE OCUPACIONAL</a><br>' +
'            <a href="#cap4" style="text-decoration:none; color:#0f766e; font-weight:700;">4. ATIVIDADES PRIMÁRIAS EM SAÚDE OCUPACIONAL E PROGRAMAS PREVENTIVOS</a><br>' +
'            <a href="#cap5" style="text-decoration:none; color:#0f766e; font-weight:700;">5. PROTOCOLOS CLÍNICOS OCUPACIONAIS DETALHADOS POR FATOR DE RISCO (NR-07)</a><br>' +
'            <a href="#cap6" style="text-decoration:none; color:#0f766e; font-weight:700;">6. CARACTERIZAÇÃO DOS AMBIENTES E QUADRO GERAL DE RISCOS E EXAMES POR GHE (NR-07 / PGR)</a><br>' +
'            <a href="#cap7" style="text-decoration:none; color:#0f766e; font-weight:700;">7. CRONOGRAMA ANUAL DE AÇÕES PREVENTIVAS DE SAÚDE (NR-07 ITEM 7.5)</a><br>' +
'            <a href="#cap8" style="text-decoration:none; color:#0f766e; font-weight:700;">8. DIRETRIZES DO RELATÓRIO ANALÍTICO ANUAL (NR-07 ITENS 7.6.2 E 7.6.4)</a><br>' +
'            <a href="#cap9" style="text-decoration:none; color:#0f766e; font-weight:700;">9. RECOMENDAÇÕES TÉCNICAS E GATILHOS DE REVISÃO DO PCMSO</a><br>' +
'            <a href="#cap10" style="text-decoration:none; color:#0f766e; font-weight:700;">10. CONSIDERAÇÕES FINAIS, TERMO DE ENCERRAMENTO E HOMOLOGAÇÃO</a>' +
'        </div>' +
'    </div>' +

'    <!-- 1. INTRODUÇÃO, OBJETIVOS E ARTICULAÇÃO COM O PGR -->' +
'    <div class="bloco quebra-pagina" id="cap1">' +
'        <div class="bloco-titulo">1. INTRODUÇÃO, OBJETIVOS E ARTICULAÇÃO COM O PGR (NR-01) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">1.1 Introdução e Finalidade Legal</div>' +
'        <div class="paragrafo">' +
'            A Saúde Ocupacional tem por finalidade precípua a preservação da higidez física e mental dos colaboradores, atuando de forma integrada na prevenção de agravos decorrentes das atividades laborais. A presente minuta técnica do Programa de Controle Médico de Saúde Ocupacional (PCMSO) foi estruturada pela Engenharia de Segurança do Trabalho em estrita observância à Norma Regulamentadora nº 07 (NR-07), aprovada pela Portaria SEPRT nº 6.734, de 09 de março de 2020, constituindo proposta técnica articulada ao GRO/PGR para avaliação, validação e homologação pelo Médico do Trabalho Coordenador.' +
'        </div>' +
'        <div class="subtitulo">1.2 Objetivos Gerais e Específicos</div>' +
'        <div class="paragrafo">' +
'            São objetivos do PCMSO no âmbito do Consórcio: a) Promover e preservar a saúde do conjunto dos trabalhadores; b) Rastrear e diagnosticar precocemente os agravos à saúde relacionados ao trabalho, com ênfase na exposição a ruído contínuo e intermitente, poeiras com sílica livre cristalizada e riscos inerentes a atividades críticas em altura e espaços confinados; c) Constatar a existência de casos de doenças ocupacionais ou danos irreversíveis à saúde dos trabalhadores; d) Definir a aptidão individual para cada função específica com base em critérios estritamente médicos e preventivos.' +
'        </div>' +
'        <div class="subtitulo">1.3 Abrangência Operacional</div>' +
'        <div class="paragrafo">' +
'            O programa contempla a abrangência operacional definida no Documento-Base (' + escapeHtml(d.abrangencia_operacional) + '), articulando as frentes de trabalho sob responsabilidade direta do Consórcio.' +
'        </div>' +
'        <div class="subtitulo">1.4 Articulação Obrigatória com o GRO/PGR (NR-01 e NR-07 itens 7.1.1, 7.3.1 e 7.5.1)</div>' +
'        <div class="paragrafo">' +
'            Conforme estabelecem a NR-01 e os itens 7.1.1, 7.3.1 e 7.5.1 da NR-07, o PCMSO é parte integrante do conjunto mais amplo de iniciativas da organização no campo da saúde dos trabalhadores, devendo estar estritamente articulado com o Programa de Gerenciamento de Riscos (PGR). As propostas de exames clínicos e complementares aqui delineadas fundamentam-se nos perigos e fatores de risco ocupacionais levantados no Inventário de Riscos do PGR, visando à rastreabilidade técnica contínua entre os programas e ao aperfeiçoamento preventivo.' +
'        </div>' +
'    </div>' +

'    <!-- 2. RESPONSABILIDADES E GOVERNANÇA MÉDICA OCUPACIONAL -->' +
'    <div class="bloco" id="cap2">' +
'        <div class="bloco-titulo">2. RESPONSABILIDADES LEGAIS E GOVERNANÇA MÉDICA OCUPACIONAL (NR-07 ITEM 7.4) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">2.1 Responsabilidades da Organização / Empregador (NR-07 item 7.4.1)</div>' +
'        <div class="paragrafo">' +
'            Compete ao Consórcio: a) Garantir a elaboração e efetiva implementação do PCMSO; b) Custear sem qualquer ônus para o trabalhador todos os procedimentos e exames médicos ocupacionais; c) Indicar médico do trabalho coordenador responsável pelo programa; d) Disponibilizar à equipe médica todas as informações sobre os fatores de risco inventariados no PGR; e) Assegurar a realização dos exames nos prazos regulamentares.' +
'        </div>' +
'        <div class="subtitulo">2.2 Responsabilidades do Médico do Trabalho Coordenador (NR-07 itens 7.5, 7.5.18, 7.5.19 e 7.6)</div>' +
'        <div class="paragrafo">' +
'            Compete ao Médico do Trabalho Coordenador ' + escapeHtml(d.medico_coordenador.nome) + (d.medico_coordenador.crm ? ' (CRM ' + escapeHtml(d.medico_coordenador.crm) + ')' : '') + ': a) Realizar os exames clínicos ocupacionais ou encarregar médicos examinadores qualificados (item 7.5); b) Definir e justificar a necessidade de exames complementares específicos conforme os riscos (item 7.5.18); c) Emitir o Atestado de Saúde Ocupacional — ASO (item 7.5.19); d) Manter atualizados os prontuários clínicos sob guarda confidencial por 20 anos (item 7.6.1); e) Elaborar o Relatório Analítico Anual do PCMSO (item 7.6.2); f) Notificar formalmente a Engenharia de Segurança quando da suspeita ou constatação de agravos com nexo causal.' +
'        </div>' +
'        <div class="subtitulo">2.3 Responsabilidades e Colaboração dos Trabalhadores (NR-01 item 1.4.2 e CLT art. 158)</div>' +
'        <div class="paragrafo">' +
'            Compete aos empregados, em conformidade com o art. 158 da CLT e item 1.4.2 da NR-01: a) Colaborar com a organização na aplicação das normas de segurança e medicina do trabalho; b) Submeter-se aos exames médicos ocupacionais previstos neste PCMSO; c) Informar imediatamente ao serviço médico e à liderança qualquer sintoma, mal-estar ou ocorrência que possa afetar sua saúde ou segurança.' +
'        </div>' +
'    </div>' +

'    <!-- 3. DESENVOLVIMENTO DO PCMSO E VIGILÂNCIA DE SAÚDE -->' +
'    <div class="bloco quebra-pagina" id="cap3">' +
'        <div class="bloco-titulo">3. DESENVOLVIMENTO DO PCMSO E VIGILÂNCIA DE SAÚDE OCUPACIONAL <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">3.1 Vigilância Ativa e Passiva da Saúde</div>' +
'        <div class="paragrafo">' +
'            A vigilância ativa é estruturada mediante convocações programadas para exames ocupacionais periódicos, acompanhamento das avaliações ambientais e busca ativa de sintomas clínicos em grupos expostos a ruído e poeiras. A vigilância passiva abrange o atendimento da demanda espontânea, registro de atestados médicos de afastamento, investigação de queixas clínicas em triagem de enfermagem e acompanhamento das notificações de acidentes de trabalho.' +
'        </div>' +
'        <div class="subtitulo">3.2 Diretrizes Clínicas dos Exames Ocupacionais</div>' +
'        <div class="paragrafo">' +
'            <b>Exame Admissional:</b> ' + escapeHtml(d.diretrizes_clinicas.criterio_admissional) + '<br>' +
'            <b>Exame Periódico:</b> ' + escapeHtml(d.diretrizes_clinicas.criterio_periodico) + '<br>' +
'            <b>Retorno ao Trabalho:</b> ' + escapeHtml(d.diretrizes_clinicas.criterio_retorno_trabalho) + '<br>' +
'            <b>Mudança de Riscos Ocupacionais:</b> ' + escapeHtml(d.diretrizes_clinicas.criterio_mudanca_risco) + '<br>' +
'            <b>Exame Demissional:</b> ' + escapeHtml(d.diretrizes_clinicas.criterio_demissional) +
'        </div>' +
'        <div class="subtitulo">3.3 Requisitos e Emissão do ASO (NR-07 item 7.5.19)</div>' +
'        <div class="paragrafo">' +
'            ' + escapeHtml(d.diretrizes_clinicas.requisitos_minimos_aso) +
'        </div>' +
'        <div class="subtitulo">3.4 Condutas em Exames Alterados e Suspeita de Doença Ocupacional</div>' +
'        <div class="paragrafo">' +
'            ' + escapeHtml(d.diretrizes_clinicas.condutas_exames_alterados) + ' Havendo confirmação de agravo com nexo causal, cabe à organização emitir a CAT, afastar o colaborador da exposição ao risco e encaminhar à Previdência Social quando o afastamento for superior a 15 dias, reavaliando os controles no PGR conjuntamente com a Engenharia de Segurança.' +
'        </div>' +
'        <div class="subtitulo">3.5 Prontuário Clínico Individual, Sigilo e Guarda por 20 Anos (NR-07 item 7.6.1)</div>' +
'        <div class="paragrafo">' +
'            Os dados dos exames médicos e resultados complementares são arquivados em prontuário individual físico ou eletrônico sob estrita responsabilidade ética do Médico Coordenador, mantidos sob guarda confidencial por no mínimo 20 (vinte) anos após o desligamento do colaborador, em conformidade com a NR-07 item 7.6.1.1 e o Código de Ética Médica (Resolução CFM nº 2.323/2022).' +
'        </div>' +
'    </div>' +

'    <!-- 4. ATIVIDADES PRIMÁRIAS EM SAÚDE OCUPACIONAL E PROGRAMAS PREVENTIVOS -->' +
'    <div class="bloco" id="cap4">' +
'        <div class="bloco-titulo">4. ATIVIDADES PRIMÁRIAS EM SAÚDE OCUPACIONAL E PROGRAMAS PREVENTIVOS <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">4.1 Programa de Imunização Ocupacional</div>' +
'        <div class="paragrafo">' +
'            ' + escapeHtml(d.imunizacoes_primeiros_socorros.vacina_antitetanica) + (d.imunizacoes_primeiros_socorros.vacina_sazonal ? '<br>' + escapeHtml(d.imunizacoes_primeiros_socorros.vacina_sazonal) : '') +
'        </div>' +
'        <div class="subtitulo">4.2 Diretrizes Preventivas de Hidratação e Pausas Térmicas no Semiárido</div>' +
'        <div class="paragrafo">' +
'            Em virtude das características climáticas da região operacional (temperaturas elevadas, baixa umidade relativa e radiação solar UV), estabelecem-se como diretrizes preventivas da saúde ocupacional: a disponibilização contínua de água potável fresca nas frentes de trabalho, a disponibilização de áreas de vivência para pausas térmicas nas atividades a céu aberto e a utilização de protetor solar com reposição periódica, conforme recomendações da Medicina do Trabalho e SESMT.' +
'        </div>' +
'        <div class="subtitulo">4.3 Suporte Básico de Primeiros Socorros e Emergências Operacionais</div>' +
'        <div class="paragrafo">' +
'            ' + escapeHtml(d.imunizacoes_primeiros_socorros.primeiros_socorros) + '<br><b>Diretriz de Capacitação:</b> Programação de treinamentos periódicos em suporte básico de primeiros socorros, fluxo de acionamento para resgate de emergência e condutas imediatas em acidentes com animais peçonhentos para lideranças e equipes operacionais de campo, articulada ao plano de atendimento a emergências do PGR.' +
'        </div>' +
'        <div class="subtitulo">4.4 Diretrizes de Utilização e Higienização de EPIs (NR-06)</div>' +
'        <div class="paragrafo">' +
'            A eficácia dos exames médicos pressupõe o uso adequado e rigoroso dos Equipamentos de Proteção Individual fornecidos pelo Consórcio. Recomenda-se a realização periódica de orientações e treinamentos sobre higienização, guarda e conservação de protetores auditivos (plugue/concha), respiradores PFF2/PFF3, óculos de segurança contra radiação UV e calçados com biqueira de proteção sob coordenação do SESMT.' +
'        </div>' +
'    </div>' +

'    <!-- 5. PROTOCOLOS CLÍNICOS OCUPACIONAIS DETALHADOS POR FATOR DE RISCO -->' +
'    <div class="bloco quebra-pagina" id="cap5">' +
'        <div class="bloco-titulo">5. PROTOCOLOS CLÍNICOS OCUPACIONAIS DETALHADOS POR FATOR DE RISCO (NR-07) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">5.1 Protocolo de Conservação Auditiva (PCA — NR-07 Anexo II)</div>' +
'        <div class="paragrafo">' +
'            <b>Critério de Inclusão:</b> ' + escapeHtml(d.protocolos_especificos.pca_ruido.criterio_inclusao) + '<br>' +
'            <b>Repouso Auditivo:</b> ' + escapeHtml(d.protocolos_especificos.pca_ruido.repouso_acustico) + '<br>' +
'            <b>Periodicidade:</b> ' + escapeHtml(d.protocolos_especificos.pca_ruido.periodicidade) + '<br>' +
'            <b>Metodologia Audiométrica e Frequências:</b> Avaliação das frequências aéreas obrigatórias de 500, 1000, 2000, 3000, 4000, 6000 e 8000 Hz, e via óssea nas frequências alteradas de 500 a 4000 Hz.<br>' +
'            <b>Critérios de Interpretação e Diagnóstico de PAIR:</b> ' + escapeHtml(d.protocolos_especificos.pca_ruido.criterios_interpretacao) + '<br>' +
'            <b>Condutas em Desencadeamento ou Agravamento:</b> ' + escapeHtml(d.protocolos_especificos.pca_ruido.condutas_exames_alterados) +
'        </div>' +
'        <div class="subtitulo">5.2 Protocolo de Vigilância da Saúde Respiratória (NR-07 Anexo III e PGR)</div>' +
'        <div class="paragrafo">' +
'            <b>Critério de Inclusão:</b> ' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.criterio_inclusao) + '<br>' +
'            <b>Metodologia Radiológica (Padrão OIT):</b> ' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_raiox) + '<br>' +
'            <b>Critérios de Espirometria Ocupacional (SBPT):</b> ' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.metodologia_espirometria) + '<br>' +
'            <b>Periodicidade:</b> ' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.periodicidade) + '<br>' +
'            <b>Condutas em Alterações Respiratórias:</b> ' + escapeHtml(d.protocolos_especificos.monitoramento_respiratorio.condutas_exames_alterados) +
'        </div>' +
'        <div class="subtitulo">5.3 Protocolo de Aptidão Clínica e Psicossocial para Atividades Críticas (NR-35, NR-33 e item 7.5.18)</div>' +
'        <div class="paragrafo">' +
'            <b>Critério de Inclusão:</b> ' + escapeHtml(d.protocolos_especificos.atividades_criticas.criterio_inclusao) + '<br>' +
'            <b>Exames Complementares Obrigatórios:</b> ' + escapeHtml(d.protocolos_especificos.atividades_criticas.exames_obrigatorios) + '<br>' +
'            <b>Critérios de Aptidão Médica:</b> ' + escapeHtml(d.protocolos_especificos.atividades_criticas.criterios_aptidao_clinica) + '<br>' +
'            <b>Avaliação Psicossocial Estruturada:</b> ' + escapeHtml(d.protocolos_especificos.atividades_criticas.avaliacao_psicossocial) + '<br>' +
'            <b>Validade da Aptidão:</b> ' + escapeHtml(d.protocolos_especificos.atividades_criticas.validade_aptidao) +
'        </div>' +
'        <div class="subtitulo">5.4 Protocolo de Sanidade para Manipulação de Alimentos e Apoio Sanitário</div>' +
'        <div class="paragrafo">' +
'            <b>Público-Alvo:</b> ' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.criterio_inclusao) + '<br>' +
'            <b>Exames Exigidos:</b> ' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.exames_obrigatorios) + '<br>' +
'            <b>Periodicidade:</b> ' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.periodicidade) + '<br>' +
'            <b>Condutas em Enteropatógenos:</b> ' + escapeHtml(d.protocolos_especificos.alimentos_saneamento.condutas_exames_alterados) +
'        </div>' +
'    </div>' +

'    <!-- 6. QUADRO GERAL DE RISCOS E EXAMES MÉDICOS POR GHE -->' +
'    <div class="bloco quebra-pagina" id="cap6">' +
'        <div class="bloco-titulo">6. QUADRO GERAL DE RISCOS E EXAMES MÉDICOS POR GHE (NR-07 / PGR) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="paragrafo">' +
'            A matriz abaixo consolida a integração dos Grupos Homogêneos de Exposição (GHEs) cadastrados no sistema e identificados no PGR do Ramal do Agreste, articulando os cargos operacionais, fatores de risco reconhecidos e a proposta de monitoramento clínico-ocupacional.' +
'        </div>' +
'        <table class="tabela">' +
'            <thead><tr><th style="width:38px; text-align:center;">GHE</th><th style="width:145px;">Grupo Homogêneo e Cargos</th><th>Fatores de Risco Identificados no PGR</th><th>Exames Médicos Ocupacionais & Periodicidade</th></tr></thead>' +
'            <tbody>' + linhasTabelaGhes + '</tbody>' +
'        </table>' +
'    </div>' +

'    <!-- 7. CRONOGRAMA ANUAL DE AÇÕES PREVENTIVAS DE SAÚDE -->' +
'    <div class="bloco quebra-pagina" id="cap7">' +
'        <div class="bloco-titulo">7. CRONOGRAMA ANUAL DE AÇÕES PREVENTIVAS DE SAÚDE (NR-07 ITEM 7.5) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="paragrafo">' +
'            O cronograma abaixo discrimina as atividades e campanhas de saúde preventiva programadas para execução ao longo do ciclo de vigência do PCMSO, sob coordenação compartilhada do SESMT e da Medicina do Trabalho.' +
'        </div>' +
'        <table class="tabela">' +
'            <thead><tr><th style="width:140px;">Mês / Período</th><th>Ação / Campanha Preventiva de Saúde</th><th style="width:160px;">Responsável Técnico</th></tr></thead>' +
'            <tbody>' + cronHtml + '</tbody>' +
'        </table>' +
'    </div>' +

'    <!-- 8. DIRETRIZES DO RELATÓRIO ANALÍTICO ANUAL -->' +
'    <div class="bloco" id="cap8">' +
'        <div class="bloco-titulo">8. DIRETRIZES DO RELATÓRIO ANALÍTICO ANUAL (NR-07 ITENS 7.6.2 E 7.6.4) <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="paragrafo">' +
'            Ao término do ciclo anual de vigência, o Médico do Trabalho Coordenador elaborará o Relatório Analítico Anual do PCMSO, contendo: a) Número de exames clínicos realizados; b) Número e tipos de exames complementares realizados; c) Estatística de resultados anormais dos exames complementares, categorizados por tipo do exame e por GHE; d) Estatística de achados com nexo causal com as condições de trabalho; e) Estatística de acidentes de trabalho com CAT emitida e afastamentos; f) Análise comparativa em relação ao relatório anterior e discussão sobre a eficácia das medidas de controle adotadas no PGR.' +
'        </div>' +
'        <div class="paragrafo">' +
'            <i>Nota sobre o Primeiro Ciclo (NR-07 item 7.6.4):</i> Tratando-se do ciclo de implantação do PCMSO próprio articulado ao PGR, a análise comparativa de tendências será inaugurada neste exercício e confrontada nas revisões subsequentes do programa.' +
'        </div>' +
'    </div>' +

'    <!-- 9. RECOMENDAÇÕES TÉCNICAS E GATILHOS DE REVISÃO DO PCMSO -->' +
'    <div class="bloco" id="cap9">' +
'        <div class="bloco-titulo">9. RECOMENDAÇÕES TÉCNICAS E GATILHOS DE REVISÃO DO PCMSO <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="subtitulo">9.1 Recomendações à Direção e Gerências de Obra</div>' +
'        <div class="paragrafo">' +
'            1. Manter rigor no cumprimento dos prazos dos exames periódicos e audiometrias de campo;<br>' +
'            2. Não permitir o início de atividades de colaboradores sem o respectivo ASO Admissional ou Mudança de Riscos com parecer de APTO;<br>' +
'            3. Assegurar a continuidade das medidas de proteção coletiva (EPC) nos pontos críticos de geração de ruído e poeiras de rocha;<br>' +
'            4. Promover a adesão integral aos treinamentos obrigatórios de segurança das NRs 35, 33, 10 e 12 antes da liberação de trabalhos de risco.' +
'        </div>' +
'        <div class="subtitulo">9.2 Gatilhos Obrigatórios para Revisão Extraordinária do PCMSO</div>' +
'        <div class="paragrafo">' +
'            O PCMSO deverá ser revisto extraordinariamente, a qualquer tempo, nas seguintes circunstâncias: a) Modificação nos processos de trabalho ou introdução de novas tecnologias/equipamentos não previstos; b) Criação ou extinção de GHEs no Inventário de Riscos do PGR; c) Constatação de agravos à saúde de trabalhadores com nexo causal confirmado (PAIR, pneumoconiose ou LER/DORT); d) Acidente de trabalho de gravidade grave ou fatal; e) Notificação formal dos órgãos de fiscalização do trabalho e sanitários.' +
'        </div>' +
'    </div>' +

'    <!-- 10. CONSIDERAÇÕES FINAIS, TERMO DE ENCERRAMENTO E HOMOLOGAÇÃO -->' +
'    <div class="bloco" id="cap10">' +
'        <div class="bloco-titulo">10. CONSIDERAÇÕES FINAIS, TERMO DE ENCERRAMENTO E HOMOLOGAÇÃO <a href="#sumario" style="float:right; font-size:7.5pt; color:#64748b; text-decoration:none; font-weight:normal;">[Sumário]</a></div>' +
'        <div class="paragrafo" style="margin-bottom:12px;">' +
'            O presente Programa de Controle Médico de Saúde Ocupacional (PCMSO) expressa o compromisso formal com a promoção e vigilância da integridade física e mental dos trabalhadores, articulado ao Gerenciamento de Riscos Ocupacionais (GRO/PGR — NR-01). As diretrizes e protocolos aqui discriminados têm vigência prevista de ' + escapeHtml(d.vigencia_inicio) + ' a ' + escapeHtml(d.vigencia_fim) + ' (' + escapeHtml(d.abrangencia_operacional) + '), constituindo minuta preliminar sujeita à homologação médica e cumprimento pelas lideranças e colaboradores.' +
'        </div>' +
'        <div class="assinaturas">' +
'            <div class="ass-linha">' +
'                <b>JOÃO EVERTON DE SOUZA LIMEIRA</b><br>' +
'                Engenheiro de Segurança do Trabalho<br>' +
'                Articulação com GRO/PGR (NR-01)' +
'            </div>' +
'            <div class="ass-linha">' +
'                <b>' + escapeHtml(d.medico_coordenador.nome) + '</b><br>' +
'                CRM ' + escapeHtml(d.medico_coordenador.crm) + (d.medico_coordenador.rqe ? ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) : '') + '<br>' +
'                Médico do Trabalho Coordenador (NR-07)' +
'            </div>' +
'        </div>' +
'    </div>' +

'    <div class="footer">' +
'        <div>PROGRAMA DE CONTROLE MÉDICO DE SAÚDE OCUPACIONAL — PCMSO (NR-07) — Consórcio Operador Ramal do Agreste</div>' +
'        <div>Emissão: ' + dataAtual + '</div>' +
'    </div>' +
'</body>' +
'</html>';

        pcmsoDispararImpressaoHtml(html, 'PCMSO_Completo_Consolidado');
    }

    // Função utilitária de disparo de impressão imune a popup
    function pcmsoDispararImpressaoHtml(html, titulo) {
        if (typeof abrirDocumentoHtmlParaImpressao === 'function') {
            abrirDocumentoHtmlParaImpressao(html, titulo);
        } else {
            var frame = document.createElement('iframe');
            frame.style.position = 'fixed';
            frame.style.right = '0';
            frame.style.bottom = '0';
            frame.style.width = '0';
            frame.style.height = '0';
            frame.style.border = '0';
            document.body.appendChild(frame);
            frame.contentWindow.document.open();
            frame.contentWindow.document.write(html);
            frame.contentWindow.document.close();
            setTimeout(function() {
                try {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                } catch (e) {
                    console.error('Falha ao imprimir:', e);
                } finally {
                    setTimeout(function() {
                        if (frame.parentNode) frame.parentNode.removeChild(frame);
                    }, 2000);
                }
            }, 500);
        }
    }


    // ==========================================================================
    // ETAPA 5: RELATÓRIO ANALÍTICO ANUAL DO PCMSO (NR-07 ITEM 7.6.2 / ITEM 7.6.4)
    // ==========================================================================

    function pcmsoObterDadosRelatorioAnalitico() {
        var dadosPainel = (typeof window !== 'undefined' && window.saudeReportData) ? window.saudeReportData : null;
        var totalAtivos = 0;
        var emDia = 0;
        var vencidos = 0;
        var vencendo = 0;
        var vencendo60 = 0;
        var semAso = 0;
        var taxaAbsenteismo = 'Não apurado no período';
        var tiposExames = [];
        var temEfetivoCarregado = false;
        var temConsultaExames = false;

        if (dadosPainel && Array.isArray(dadosPainel.kpis)) {
            dadosPainel.kpis.forEach(function(k) {
                if (k.key === 'asoEmDia') emDia = Number(k.value) || 0;
                if (k.key === 'asoVencidos') vencidos = Number(k.value) || 0;
                if (k.key === 'asoVencendo') vencendo = Number(k.value) || 0;
                if (k.key === 'asoVencendo60') vencendo60 = Number(k.value) || 0;
                if (k.key === 'asoSemRegistro') semAso = Number(k.value) || 0;
                if (k.key === 'absenteismo') taxaAbsenteismo = String(k.value || '—');
            });
            // Denominador estrito da NR-07: total de trabalhadores ativos cobertos (soma de todas as faixas sem duplicidade)
            totalAtivos = emDia + vencidos + vencendo + vencendo60 + semAso;
            if (totalAtivos > 0) {
                temEfetivoCarregado = true;
            }

            if (dadosPainel.graficos && dadosPainel.graficos.graficoExamesTipo) {
                var labels = dadosPainel.graficos.graficoExamesTipo.labels || [];
                var valores = dadosPainel.graficos.graficoExamesTipo.valores || [];
                if (labels.length > 0) {
                    temConsultaExames = true;
                    for (var i = 0; i < labels.length; i++) {
                        var valRaw = valores[i];
                        var numVal = null;
                        var foiApurado = false;
                        if (valRaw !== null && valRaw !== undefined && valRaw !== '' && !isNaN(Number(valRaw))) {
                            numVal = Number(valRaw);
                            foiApurado = true;
                        }
                        tiposExames.push({
                            tipo: labels[i],
                            total: numVal,
                            apurado: foiApurado,
                            obs: foiApurado ? 'Registro contabilizado no histórico ocupacional do sistema' : 'Dado não apurado na sessão (NR-07 item 7.6.4)'
                        });
                    }
                }
            }
        }

        // Se NÃO houve consulta/carregamento válido de exames, o valor de cada tipo NÃO é 0, é null (Não apurado)
        if (!temConsultaExames) {
            tiposExames = [
                { tipo: 'Admissional', total: null, apurado: false, obs: 'Dado não apurado na sessão (NR-07 item 7.6.4)' },
                { tipo: 'Periódico', total: null, apurado: false, obs: 'Dado não apurado na sessão (NR-07 item 7.6.4)' },
                { tipo: 'Retorno ao Trabalho', total: null, apurado: false, obs: 'Dado não apurado na sessão (NR-07 item 7.6.4)' },
                { tipo: 'Mudança de Riscos', total: null, apurado: false, obs: 'Dado não apurado na sessão (NR-07 item 7.6.4)' },
                { tipo: 'Demissional', total: null, apurado: false, obs: 'Dado não apurado na sessão (NR-07 item 7.6.4)' }
            ];
        }

        // Se não houver efetivo ativo consolidado na sessão, NUNCA inferir 100% de conformidade nem dados clínicos
        var taxaConformidade = totalAtivos > 0 ? ((emDia / totalAtivos) * 100).toFixed(1) + '%' : '— (Sem registros carregados no período)';
        var catsPeriodo = 'Em apuração / Consultar SESMT';

        return {
            fonte: temEfetivoCarregado ? 'Módulo de Saúde Ocupacional (Base Ativa do Sistema)' : 'Base Local em Apuração (NR-07 item 7.6.4)',
            periodo: (dadosPainel && dadosPainel.periodoLabel) ? dadosPainel.periodoLabel : 'Ano Vigente (Últimos 12 Meses — Competência em Consolidação)',
            recorte_temporal: temConsultaExames ? 'Acumulado Histórico Geral (Sem Filtro Anual de Competência)' : 'Não apurado na sessão',
            periodo_exames_rotulo: temConsultaExames ? 'Histórico Completo Acumulado no Sistema (Sem recorte anual por datas)' : 'Dados não consultados nesta sessão',
            total_efetivo_ativo: totalAtivos,
            aso_em_dia: emDia,
            aso_vencidos: vencidos,
            aso_vencendo_30d: vencendo,
            aso_vencendo_60d: vencendo60,
            aso_sem_registro: semAso,
            taxa_conformidade: taxaConformidade,
            taxa_absenteismo: taxaAbsenteismo,
            exames_por_tipo: tiposExames,
            tem_consulta_exames: temConsultaExames,
            total_ghes: (typeof obterTodasMatrizesPcmsoIntegradas === 'function') ? obterTodasMatrizesPcmsoIntegradas().length : 0,
            total_cats_periodo: catsPeriodo,
            anormais_ghe_status: 'Sob sigilo médico (NR-07 item 7.6.1 e 7.6.4)',
            tem_efetivo_carregado: temEfetivoCarregado,
            tem_dados_reais: temEfetivoCarregado && temConsultaExames
        };
    }

    function pcmsoEmitirRelatorioAnaliticoAnual() {
        if (pcmsoVerificarBloqueioEdicaoPendente()) return false;
        var d = pcmsoDocBaseDraft || normalizarPcmsoDocBase(obterPcmsoDocBaseDefaults());
        var dados = pcmsoObterDadosRelatorioAnalitico();
        var dataAtual = new Date().toLocaleDateString('pt-BR');
        var ghes = typeof obterTodasMatrizesPcmsoIntegradas === 'function' ? obterTodasMatrizesPcmsoIntegradas() : [];

        var linhasTiposHtml = dados.exames_por_tipo.map(function(t) {
            var valHtml = t.total !== null ? escapeHtml(t.total) : '<span style="color:#64748b; font-style:italic;">Não apurado</span>';
            return '<tr>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-weight:600;">' + escapeHtml(t.tipo) + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; text-align:center; font-weight:700;">' + valHtml + '</td>' +
                '<td style="padding:6px; border:1px solid #cbd5e1; font-size:8pt; color:#475569;">' + escapeHtml(t.obs) + '</td>' +
            '</tr>';
        }).join('');

        var linhasGheAnalitico = ghes.map(function(g) {
            var riscosStr = Array.isArray(g.riscos_pgr) ? g.riscos_pgr.join(', ') : '—';
            var examesStr = Array.isArray(g.exames) ? g.exames.map(function(e) { return e.nome; }).join(', ') : '—';
            return '<tr>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; text-align:center; font-weight:bold;">' + escapeHtml(g.codigo) + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-weight:600;">' + escapeHtml(g.nome) + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-size:8pt;">' + escapeHtml(riscosStr) + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; font-size:8pt;">' + escapeHtml(examesStr) + '</td>' +
                '<td style="padding:5px; border:1px solid #cbd5e1; text-align:center; font-size:7.5pt; color:#475569; font-weight:600;">' + escapeHtml(dados.anormais_ghe_status) + '</td>' +
            '</tr>';
        }).join('');

        var html = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <title>Relatório Analítico do PCMSO (Minuta Técnica em Estruturação — NR-07 itens 7.6.2 e 7.6.4) — ' + escapeHtml(d.razao_social) + '</title>' +
'    <style>' +
'        @page { size: A4 portrait; margin: 12mm 14mm; }' +
'        body { font-family: Segoe UI, Arial, sans-serif; font-size: 9pt; color: #0f172a; line-height: 1.4; margin: 0; padding: 0; }' +
'        .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }' +
'        .empresa { font-size: 13pt; font-weight: 800; color: #0f766e; }' +
'        .sub { font-size: 9pt; color: #475569; margin-top: 2px; }' +
'        .aviso-minuta { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 8px 12px; border-radius: 6px; font-size: 8.5pt; font-weight: 600; margin-bottom: 12px; line-height: 1.4; }' +
'        .bloco { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }' +
'        .bloco-titulo { font-size: 9.5pt; font-weight: 800; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }' +
'        .grid-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }' +
'        .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }' +
'        .kpi-val { font-size: 14pt; font-weight: 800; color: #0f766e; }' +
'        .kpi-lbl { font-size: 7.5pt; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }' +
'        .tabela { width: 100%; border-collapse: collapse; margin-top: 6px; }' +
'        .tabela th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; font-size: 8pt; text-align: left; }' +
'        .tabela td { font-size: 8pt; }' +
'        .campo-medico { background: #fafafa; border: 1px dashed #94a3b8; border-radius: 4px; padding: 10px; min-height: 70px; margin-top: 6px; font-size: 8pt; color: #475569; }' +
'        .assinaturas { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; page-break-inside: avoid; }' +
'        .ass-linha { border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 8pt; }' +
'        .footer { margin-top: 16px; border-top: 1px solid #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }' +
'    </style>' +
'</head>' +
'<body>' +
'    <div class="header">' +
'        <div>' +
'            <div class="empresa">' + escapeHtml(d.razao_social) + '</div>' +
'            <div class="sub">RELATÓRIO ANALÍTICO DO PCMSO (MINUTA TÉCNICA EM ESTRUTURAÇÃO — NR-07 ITENS 7.6.2 E 7.6.4)</div>' +
'            <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">CNPJ: ' + escapeHtml(d.cnpj) + ' | Período de Apuração: ' + escapeHtml(dados.periodo) + ' | Fonte: ' + escapeHtml(dados.fonte) + '</div>' +
'        </div>' +
'        <div style="text-align: right; font-size: 8pt;">' +
'            <div><b>Médico Coordenador:</b> ' + escapeHtml(d.medico_coordenador.nome) + '</div>' +
'            <div>CRM ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) + '</div>' +
'        </div>' +
'    </div>' +

'    <div class="aviso-minuta">' +
'        📋 <b>MINUTA TÉCNICA ESTATÍSTICA INCOMPLETA (NR-07 ITEM 7.6.2 / ITEM 7.6.4):</b> Este documento constitui minuta técnica preliminar para consolidação. Apresenta os indicadores administrativos disponíveis no sistema (efetivo ativo e validade de ASOs). Os indicadores clínicos de exames complementares realizados, resultados anormais e discussão epidemiológica encontram-se sob sigilo e em apuração pelo Serviço Médico Coordenador para conclusão do Relatório Analítico oficial.' +
'    </div>' +

'    <!-- 1. INDICADORES GERAIS DE CONFORMIDADE E EFETIVO -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">1. QUADRO GERAL DO EFETIVO E STATUS DE ATESTADOS DE SAÚDE OCUPACIONAL (ASO)</div>' +
'        <div class="grid-kpis">' +
'            <div class="kpi-box">' +
'                <div class="kpi-val">' + dados.total_efetivo_ativo + '</div>' +
'                <div class="kpi-lbl">Efetivo Ativo Total (Denominador)</div>' +
'            </div>' +
'            <div class="kpi-box">' +
'                <div class="kpi-val" style="color:#16a34a;">' + dados.aso_em_dia + '</div>' +
'                <div class="kpi-lbl">ASOs Válidos / Em Dia</div>' +
'            </div>' +
'            <div class="kpi-box">' +
'                <div class="kpi-val" style="color:' + (dados.aso_vencidos > 0 ? '#dc2626' : '#16a34a') + ';">' + dados.aso_vencidos + '</div>' +
'                <div class="kpi-lbl">ASOs Vencidos</div>' +
'            </div>' +
'            <div class="kpi-box">' +
'                <div class="kpi-val">' + dados.taxa_conformidade + '</div>' +
'                <div class="kpi-lbl">Taxa de Conformidade</div>' +
'            </div>' +
'        </div>' +
'        <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">' +
'            ASOs a vencer em até 30 dias: <b>' + dados.aso_vencendo_30d + '</b> | ASOs a vencer em 31 a 60 dias: <b>' + dados.aso_vencendo_60d + '</b> | Sem registro prévio no sistema: <b>' + dados.aso_sem_registro + '</b> | Taxa de Absenteísmo Ocupacional: <b>' + dados.taxa_absenteismo + '</b>.' +
'        </div>' +
'    </div>' +

'    <!-- 2. EXAMES CLÍNICOS REALIZADOS POR TIPO -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">2. QUADRO DE EXAMES CLÍNICOS OCUPACIONAIS — ACUMULADO HISTÓRICO GERAL (NR-07 ITEM 7.6.2 a)</div>' +
'        <div style="font-size: 8pt; color: #b45309; background:#fffbeb; border:1px solid #fde68a; padding:6px 8px; border-radius:4px; margin-bottom: 6px;">' +
'            ⚠️ <b>Atenção ao Recorte Temporal:</b> Os quantitativos abaixo refletem o total histórico acumulado de exames ocupacionais cadastrados no sistema (' + escapeHtml(dados.recorte_temporal) + '), sem filtragem por competência anual ou recorte entre datas de início e fim. Conforme a NR-07 item 7.6.4, o recorte estrito do período anual de vigência deve ser apurado e consolidado pelo Serviço Médico a partir dos prontuários ocupacionais.' +
'        </div>' +
'        <table class="tabela">' +
'            <thead><tr><th>Natureza do Exame Clínico</th><th style="width:130px; text-align:center;">Quantidade Registrada (Histórico Geral)</th><th>Observações sobre o Recorte Temporal</th></tr></thead>' +
'            <tbody>' + linhasTiposHtml + '</tbody>' +
'        </table>' +
'    </div>' +

'    <!-- 3. MONITORAMENTO DE RISCOS E EXAMES POR GHE -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">3. VIGILÂNCIA DE RESULTADOS POR GHE E EXAMES COMPLEMENTARES (' + ghes.length + (ghes.length === 1 ? ' GHE' : ' GHEs') + ' — NR-07 item 7.6.2 b/c)</div>' +
'        <table class="tabela">' +
'            <thead><tr><th style="width:35px; text-align:center;">GHE</th><th style="width:130px;">Grupo Homogêneo</th><th>Fatores de Risco (PGR)</th><th>Exames Biológicos Exigidos</th><th style="width:140px; text-align:center;">Resultados Anormais (NR-07 7.6.2 c)</th></tr></thead>' +
'            <tbody>' + linhasGheAnalitico + '</tbody>' +
'        </table>' +
'        <div style="font-size: 7.5pt; color: #64748b; margin-top: 6px; font-style: italic;">' +
'            * Conforme a NR-07 item 7.6.2 alínea "c", a discriminação quantitativa de resultados anormais e diagnósticos é apurada diretamente nos prontuários individuais dos trabalhadores sob estrito sigilo médico-ocupacional (NR-07 item 7.6.1 e Resolução CFM nº 2.323/2022).' +
'        </div>' +
'    </div>' +

'    <!-- 4. ACIDENTABILIDADE, CAT E AGRAVOS OCUPACIONAIS -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">4. ESTATÍSTICA DE ACIDENTABILIDADE E AGRAVOS À SAÚDE (NR-07 item 7.6.2 d/e)</div>' +
'        <div style="font-size:8.5pt; margin-bottom: 6px; line-height: 1.5;">' +
'            <b>Comunicações de Acidente de Trabalho (CAT emitidas no período — item 7.6.2 e):</b> ' + dados.total_cats_periodo + ' (Registro oficial administrado conjuntamente pelo SESMT e RH/Previdência).<br>' +
'            <b>Agravos Ocupacionais e Nexo Causal (PAIR, Pneumoconioses, LER/DORT — item 7.6.2 d):</b> A identificação de doenças relacionadas ao trabalho e a caracterização técnica de nexo causal dependem de avaliação clínica individual e notificação formal pelo Médico do Trabalho Coordenador. Nenhum agravo ou nexo causal é inferido ou descartado por automação sistêmica.<br>' +
'            <b>Eficácia das Medidas Preventivas:</b> O acompanhamento da eficácia das medidas de proteção coletiva (EPC) e equipamentos de proteção individual (EPI) é realizado continuamente em conjunto com a gestão do PGR (NR-01) e inspeções de campo.' +
'        </div>' +
'    </div>' +

'    <!-- 5. PARECER CONCLUSIVO DO MÉDICO DO TRABALHO COORDENADOR -->' +
'    <div class="bloco">' +
'        <div class="bloco-titulo">5. ANÁLISE COMPARATIVA E PARECER DO MÉDICO DO TRABALHO COORDENADOR (NR-07 item 7.6.2 f)</div>' +
'        <div style="font-size:8.5pt; text-align:justify; margin-bottom:6px;">' +
'            <b>Análise Comparativa Anual (NR-07 item 7.6.2 f):</b> Ausência de relatório analítico anterior registrado no sistema para o Consórcio Operador Ramal do Agreste (primeiro ciclo de implantação articulado ao PGR 2026/2027). A análise evolutiva e comparação de tendências serão aplicadas a partir das revisões subsequentes deste programa.<br><br>' +
'            <b>PARECER E DISCUSSÃO EPIDEMIOLÓGICA (NR-07 item 7.6.2 f):</b>' +
'        </div>' +
'        <div class="campo-medico">' +
'            [ Espaço reservado para parecer técnico conclusivo manuscrito ou digital, análise da evolução dos indicadores de saúde, discussão das variações na eficácia dos controles e validação das medidas preventivas pelo Médico do Trabalho Coordenador ' + escapeHtml(d.medico_coordenador.nome) + (d.medico_coordenador.crm ? ' - CRM ' + escapeHtml(d.medico_coordenador.crm) + (d.medico_coordenador.rqe ? ' / RQE ' + escapeHtml(d.medico_coordenador.rqe) : '') : '') + ' ]' +
'        </div>' +
'        <div class="assinaturas">' +
'            <div class="ass-linha">' +
'                <b>JOÃO EVERTON DE SOUZA LIMEIRA</b><br>' +
'                Engenheiro de Segurança do Trabalho<br>' +
'                Gestão SST — Consórcio Ramal do Agreste' +
'            </div>' +
'            <div class="ass-linha">' +
'                <b>' + escapeHtml(d.medico_coordenador.nome) + '</b><br>' +
'                CRM ' + escapeHtml(d.medico_coordenador.crm) + ' | RQE ' + escapeHtml(d.medico_coordenador.rqe) + '<br>' +
'                Médico do Trabalho Coordenador (NR-07)' +
'            </div>' +
'        </div>' +
'    </div>' +

'    <div class="footer">' +
'        <div>Relatório Analítico do PCMSO (Minuta Técnica — NR-07 item 7.6.2) — Consórcio Operador Ramal do Agreste</div>' +
'        <div>Emissão: ' + dataAtual + '</div>' +
'    </div>' +
'</body>' +
'</html>';

        pcmsoDispararImpressaoHtml(html, 'Relatorio_Analitico_Anual_PCMSO_NR07');
    }

    // EXPORTACAO PARA ESCOPO GLOBAL DO NAVEGADOR
    window.CATALOGO_CANONICO_EXAMES_PCMSO = CATALOGO_CANONICO_EXAMES_PCMSO;
    window.GHE_MATRIZ_BASE_INTEGRADA = GHE_MATRIZ_BASE_INTEGRADA;
    window.obterTodasMatrizesPcmsoIntegradas = obterTodasMatrizesPcmsoIntegradas;
    window.obterMatrizPcmsoGheIntegrada = obterMatrizPcmsoGheIntegrada;
    window.renderSecaoMatrizExamesPcmsoHtml = renderSecaoMatrizExamesPcmsoHtml;
    window.pcmsoMudarFiltroGheMatriz = pcmsoMudarFiltroGheMatriz;
    window.pcmsoImprimirMatrizExames = pcmsoImprimirMatrizExames;

    // --------------------------------------------------------------------------
    window.obterPcmsoDocBaseDefaults = obterPcmsoDocBaseDefaults;
    window.normalizarPcmsoDocBase = normalizarPcmsoDocBase;
    window.avaliarProntidaoEmissaoPcmsoDocBase = avaliarProntidaoEmissaoPcmsoDocBase;
    function pcmsoEmitirPcmsoAviso(msgCustom, tipo) {
        if (msgCustom) {
            if (typeof alert === 'function') alert(msgCustom);
            return;
        }
        var d = pcmsoDocBaseDraft;
        var prontidao = avaliarProntidaoEmissaoPcmsoDocBase(d);
        if (!pcmsoDocBaseRemotoExiste && !pcmsoDocBaseSavedSnapshotJson) {
            alert('O Documento-Base do PCMSO ainda não foi salvo no banco de dados. Preencha e salve os parâmetros antes de emitir.');
            return;
        }
        if (!prontidao.pronto) {
            alert('O Documento-Base possui pendências obrigatórias antes da emissão oficial:\n• ' + prontidao.pendencias.join('\n• '));
            return;
        }
        alert('Módulo de emissão oficial do PCMSO em preparação (Etapas 2 a 5). Os parâmetros do Documento-Base estão salvos e validados.');
    }

    window.pcmsoNotificarAlteracaoFormulario = function() {
        try { coletarFormularioPcmsoDocBase(); } catch (e) {}
        pcmsoDocBaseDirty = true;
        pcmsoDocBaseLatestGen++;
    };
    window.pcmsoIsDocBaseDirty = function() {
        return pcmsoDocBaseDirty;
    };
    window.pcmsoVerificarBloqueioEdicaoPendente = pcmsoVerificarBloqueioEdicaoPendente;
    window.pcmsoEmitirPcmsoAviso = pcmsoEmitirPcmsoAviso;
    window.pcmsoCarregarDocBase = carregarPcmsoDocBase;
    window.pcmsoOnAbrirAbaDocBase = pcmsoOnAbrirAbaDocBase;
    window.pcmsoSalvarDocBase = salvarPcmsoDocBase;
    window.pcmsoDescartarRascunho = descartarRascunhoPcmsoDocBase;
    window.pcmsoObterDraftAtual = function() { return pcmsoDocBaseDraft; };
    try {
        Object.defineProperty(window, 'pcmsoDocBaseDraft', {
            get: function() { return pcmsoDocBaseDraft; },
            set: function(v) { pcmsoDocBaseDraft = v; },
            configurable: true
        });
    } catch (e) {
        window.pcmsoDocBaseDraft = pcmsoDocBaseDraft;
    }
    window.pcmsoAdicionarRepresentante = pcmsoAdicionarRepresentante;
    window.pcmsoRemoverRepresentante = pcmsoRemoverRepresentante;
    window.pcmsoAdicionarExaminador = pcmsoAdicionarExaminador;
    window.pcmsoRemoverExaminador = pcmsoRemoverExaminador;
    window.pcmsoAdicionarRevisao = pcmsoAdicionarRevisao;
    window.pcmsoRemoverRevisao = pcmsoRemoverRevisao;
    window.pcmsoAdicionarCronograma = pcmsoAdicionarCronograma;
    window.pcmsoRemoverCronograma = pcmsoRemoverCronograma;
    window.renderPcmsoDocBaseView = renderPcmsoDocBaseView;

})(window, document);
