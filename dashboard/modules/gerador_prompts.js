/**
 * dashboard/modules/gerador_prompts.js
 * =============================================================================
 * GERADOR DE PROMPTS ESPECIALISTA EM SST & ARQUITETURA DO APP CHECKLIST SEGURANÇA
 * =============================================================================
 * Ferramenta interna de engenharia projetada para o Engenheiro de Segurança João
 * Everton, visando maximizar a assertividade dos agentes de IA (Antigravity,
 * Cursor, Claude Code, Gemini, Orca, etc.), economizar tokens e evitar regressões
 * nas regras inegociáveis de SST e integridade de código do sistema.
 *
 * Suporta tanto a manutenção de módulos existentes quanto a CRIAÇÃO DE NOVOS
 * MÓDULOS INDEPENDENTES E DESACOPLADOS (ex: Gestão de Terceiros, PJ, etc.).
 */

(function(window) {
    'use strict';

    // Chave de persistência local para novos conhecimentos aprendidos
    const STORAGE_KEY_CONHECIMENTO = 'sst_gerador_prompts_conhecimento_v1';
    const STORAGE_KEY_HISTORICO = 'sst_gerador_prompts_historico_v1';

    // =========================================================================
    // 1. BASE DE CONHECIMENTO OFICIAL DA ARQUITETURA SST DO SISTEMA
    // =========================================================================
    const BASE_CONHECIMENTO_SST_PADRAO = {
        versao: '2.6.0',
        ultimaAtualizacao: '2026-11-05',
        regrasOuroGlobais: [
            'NUNCA usar window.open() ou manipulação direta de popup. Utilizar sempre abrirDocumentoHtmlParaImpressao(html, titulo) ou Blob com URL.createObjectURL.',
            'Sincronização Dupla Obrigatória: qualquer alteração de status (Ativo/Inativo/Demitido) ou validade de ASO de colaborador próprio da COP deve refletir SIMULTANEAMENTE em public.colaboradores_efetivo e public.colaboradores_checklist.',
            'Isolamento de Efetivo de Terceiros/PJ: Mecânicos de empresas parceiras (ex: ARTEC), terceiros e pessoas contratadas como PJ NUNCA devem ser inseridos em public.colaboradores_efetivo para não inflar o headcount CLT da COP, cálculos de HHT próprio e relatórios de Mão de Obra Local (RSA Quadros 1 e 2). Terceiros devem ter tabela própria.',
            'Preservação do App Mobile PWA de Campo: demandas do painel gerencial ficam estritamente em dashboard/ e api/; nunca alterar app.js, index.html ou sw.js da raiz sem autorização expressa.',
            'Leitura Cirúrgica: arquivos como dashboard.js e módulos possuem milhares de linhas. Proibido ler arquivo completo; use buscas direcionadas e leia até 150 linhas por vez.',
            'Roteamento Duplo em Novos Módulos: ao criar nova rota no painel, registrar showDbPage, navMap e DB_PAGE_TITLES tanto em dashboard/dashboard.js quanto em dashboard/modules/epi_estoque.js (devido à declaração homônima existente no projeto) para evitar tela em branco.',
            'Atualização de Cache-Buster: sempre atualizar ?v=... nos scripts e links modificados para invalidar cache em produção (Vercel).',
            'Zero Preguiça e Causa-Raiz: proibido silenciar erros apagando código ou removendo validações úteis. Investigar e corrigir a causa-raiz.',
            'Suporte a Dark Mode (NR-17): todo elemento visual criado deve respeitar as variáveis de tema (--bg, --card, --text, --border).'
        ],
        modulos: [
            {
                id: 'treinamentos_ddsma',
                nome: 'TREINAMENTOS & DDSMA',
                icone: '🎓',
                arquivoPrincipal: 'dashboard/modules/treinamentos_ddsma.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html', 'dashboard/modules/cronograma_pastas.js', 'api/cronograma-pastas.js'],
                descricao: 'Gestão de treinamentos regulamentares (NRs), matriz de capacitação, catálogo de cursos, lançamento em lote, cronograma mensal e DDSMA diário.',
                submodulos: [
                    {
                        id: 'catalogo',
                        nome: 'Catálogo de Cursos & NRs',
                        descricao: 'Cadastro e parametrização de cursos, normas regulamentadoras (NR-10, NR-12, NR-33, NR-35, etc.), validade em meses e carga horária.',
                        funcoesChave: ['renderTreinamentosPanel', 'abrirModalTreinamento', 'salvarTreinamentoCatalogo', 'excluirCursoCatalogo', 'filtrarCatalogoTreinamentos'],
                        tabelasSupabase: ['treinamentos_catalogo'],
                        regrasNegocio: 'Carga horária e periodicidade devem respeitar a NR respectiva. Exclusão deve verificar se há turmas históricas vinculadas.'
                    },
                    {
                        id: 'matriz_geral',
                        nome: 'Matriz de Treinamentos por GHE',
                        descricao: 'Cruzamento entre GHEs/Cargos e os treinamentos obrigatórios exigidos pelo PGR/PCMSO.',
                        funcoesChave: ['renderMatrizTreinamentos', 'carregarMatrizTreinamentos', 'salvarAssociacaoGheTreinamento'],
                        tabelasSupabase: ['treinamentos_catalogo', 'ghe_catalogo', 'colaboradores_efetivo'],
                        regrasNegocio: 'Ao admitir ou trocar colaborador de GHE, a matriz deve apontar pendências de treinamento automaticamente.'
                    },
                    {
                        id: 'turmas_realizadas',
                        nome: 'Turmas & Lançamento em Lote',
                        descricao: 'Registro de turmas executadas com instrutor, data, lista de participantes e status de conclusão (Aprovado/Reprovado).',
                        funcoesChave: ['abrirModalNovaTurma', 'salvarTurmaTreinamento', 'renderHistoricoTurmas', 'adicionarParticipanteTurma'],
                        tabelasSupabase: ['treinamentos_realizados', 'colaboradores_checklist', 'colaboradores_efetivo'],
                        regrasNegocio: 'Atualiza o histórico individual de cada colaborador e recalcula o vencimento com base na validade do curso.'
                    },
                    {
                        id: 'cronograma_mensal',
                        nome: 'Cronograma Mensal & Calendário',
                        descricao: 'Planejamento das datas previstas para realização de treinamentos por mês/ano.',
                        funcoesChave: ['renderCronogramaTreinamentos', 'salvarItemCronogramaTreinamento', 'prepararPastasCronograma'],
                        tabelasSupabase: ['treinamentos_cronograma', 'configuracoes_sistema'],
                        regrasNegocio: 'Permite preparar pastas antecipadas no Google Drive para fotos e listas escaneadas.'
                    },
                    {
                        id: 'ddsma_diario',
                        nome: 'DDSMA Diário (Diálogo de Segurança)',
                        descricao: 'Registro diário de temas de SMS abordados com as frentes operacionais e listas de presença.',
                        funcoesChave: ['renderDdsPanel', 'salvarDdsRealizado', 'carregarConfiguracoesDdsDoSupabase', 'abrirModalNovoDds'],
                        tabelasSupabase: ['dds_realizados', 'dds_temas_cronograma'],
                        regrasNegocio: 'Temas alinhados às atividades de risco do dia (conforme APR ativa).'
                    },
                    {
                        id: 'certificados_listas',
                        nome: 'Certificados & Listas de Presença',
                        descricao: 'Emissão formatada de certificados de treinamento e listas de presença (FOR.001.R00) para impressão e auditoria.',
                        funcoesChave: ['gerarCertificadoTreinamento', 'gerarListaPresencaTreinamento', 'abrirDocumentoHtmlParaImpressao'],
                        tabelasSupabase: ['treinamentos_realizados', 'treinamentos_catalogo'],
                        regrasNegocio: 'Usar sempre abrirDocumentoHtmlParaImpressao. Incluir dados do instrutor, registro profissional e conteúdo programático.'
                    }
                ]
            },
            {
                id: 'efetivo_ferias',
                nome: 'EFETIVO, FÉRIAS & SETORES',
                icone: '👷',
                arquivoPrincipal: 'dashboard/modules/efetivo_ferias.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Quadro geral de colaboradores próprios da COP, admissões, demissões, cálculo da regra de 24 meses de férias (Art. 130/134 CLT) e mão de obra local (RSA/ADA).',
                submodulos: [
                    {
                        id: 'gestao_colaboradores',
                        nome: 'Cadastro de Colaboradores & Admissão',
                        descricao: 'Ficha completa do colaborador com matrícula, CPF, função, GHE, setor, data de admissão e situação.',
                        funcoesChave: ['renderEfetivoPanel', 'abrirModalNovoColaborador', 'salvarColaboradorEfetivo', 'alternarStatusColaborador'],
                        tabelasSupabase: ['colaboradores_efetivo', 'colaboradores_checklist'],
                        regrasNegocio: 'REGRA DUPLA: Qualquer inclusão ou alteração de status deve refletir simultaneamente em colaboradores_efetivo e colaboradores_checklist.'
                    },
                    {
                        id: 'ferias_clt',
                        nome: 'Férias CLT & Período Concessivo (24 Meses)',
                        descricao: 'Alerta preventivo e cálculo do dobro de férias conforme Art. 130, 134 e 137 da CLT.',
                        funcoesChave: ['renderFeriasPanel', 'calcularPeriodoAquisitivoFerias', 'programarFeriasColaborador'],
                        tabelasSupabase: ['colaboradores_efetivo', 'colaboradores_ferias'],
                        regrasNegocio: 'Sinalizar em vermelho períodos que ultrapassarem 22 meses desde a data de admissão/período aquisitivo.'
                    },
                    {
                        id: 'mao_de_obra_local',
                        nome: 'Mão de Obra Local & Relatório RSA (ADA)',
                        descricao: 'Classificação por município de origem (Arcoverde, Pesqueira, Sertânia, etc.) para atendimento aos quadros 1 e 2 do RSA.',
                        funcoesChave: ['renderMaoDeObraLocalPainel', 'gerarQuadroRsaMaoDeObra'],
                        tabelasSupabase: ['colaboradores_efetivo'],
                        regrasNegocio: 'Distinção entre residentes na Área Diretamente Afetada (ADA) e mão de obra externa.'
                    },
                    {
                        id: 'setores_frentes',
                        nome: 'Padronização de Setores & Frentes',
                        descricao: 'Gestão dos locais de trabalho, oficinas, canteiros e frentes do Ramal do Agreste.',
                        funcoesChave: ['renderSetoresPanel', 'salvarSetorPadronizado'],
                        tabelasSupabase: ['setores_catalogo', 'colaboradores_efetivo'],
                        regrasNegocio: 'Manter compatibilidade com os filtros do PWA de campo.'
                    }
                ]
            },
            {
                id: 'ghe_os',
                nome: 'GHE, RISCOS (AIHA) & ORDENS DE SERVIÇO',
                icone: '🛡️',
                arquivoPrincipal: 'dashboard/modules/ghe_os.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Catálogo de GHEs, inventário de riscos ocupacionais (AIHA / PGR Seção 16), matriz NR-06 de EPIs e emissão de Ordens de Serviço (NR-01).',
                submodulos: [
                    {
                        id: 'catalogo_ghe',
                        nome: 'Catálogo de GHE (Grupos Homogêneos)',
                        descricao: 'Cadastro dos GHEs da obra com descrição das atividades, ambientes e cargos vinculados.',
                        funcoesChave: ['renderGhePanel', 'abrirModalGhe', 'salvarGheCatalogo', 'listarCargosPorGhe'],
                        tabelasSupabase: ['ghe_catalogo', 'funcoes_catalogo'],
                        regrasNegocio: 'Cada GHE deve conter delimitação ambiental e descrição detalhada para laudos do PGR e PCMSO.'
                    },
                    {
                        id: 'matriz_risco_aiha',
                        nome: 'Avaliação de Riscos AIHA (Matriz Probabilidade x Severidade)',
                        descricao: 'Inventário de riscos físicos, químicos, biológicos, ergonômicos e de acidentes com graduação de risco conforme AIHA/PGR.',
                        funcoesChave: ['renderMatrizRiscoPanel', 'salvarAvaliacaoRiscoGhe', 'calcularGraduacaoRiscoAiha', 'filtrarRiscosPorGhe'],
                        tabelasSupabase: ['ghe_riscos_aiha', 'ghe_catalogo'],
                        regrasNegocio: 'Graduação calculada pela multiplicação ou matriz matricial de severidade x probabilidade (níveis de 1 a 5).'
                    },
                    {
                        id: 'ordem_servico_nr01',
                        nome: 'Ordens de Serviço (OS NR-01) & Rastreabilidade',
                        descricao: 'Geração da OS oficial por colaborador/GHE com riscos, medidas preventivas, EPIs obrigatórios e campo de assinatura.',
                        funcoesChave: ['gerarOrdemServicoHtml', 'registrarEntregaOrdemServico', 'abrirDocumentoHtmlParaImpressao'],
                        tabelasSupabase: ['ordens_servico', 'ordens_servico_entregas', 'colaboradores_efetivo'],
                        regrasNegocio: 'Ao mudar de função ou GHE, deve ser emitida nova OS com rastreabilidade da entrega.'
                    },
                    {
                        id: 'matriz_epi_ghe',
                        nome: 'Matriz de EPIs por GHE (NR-06)',
                        descricao: 'Associação dos EPIs de uso obrigatório para cada GHE.',
                        funcoesChave: ['renderMatrizEpiGhe', 'salvarEpiPorGhe', 'filterMatrizEpi'],
                        tabelasSupabase: ['ghe_catalogo', 'epi_catalogo', 'ghe_epis'],
                        regrasNegocio: 'EPIs selecionados devem constar automaticamente na Ordem de Serviço e na ficha de entrega.'
                    }
                ]
            },
            {
                id: 'relatorio_sms_nc',
                nome: 'RELATÓRIO MENSAL SMS & NÃO CONFORMIDADES',
                icone: '📊',
                arquivoPrincipal: 'dashboard/modules/relatorio_sms_nc.js',
                arquivosRelacionados: ['dashboard/modules/relatorio_sms_fotos.js', 'dashboard/modules/relsms_importacao_segura.js', 'dashboard/modules/relsms_fotos_manuais.js', 'api/proxy-imagem.js'],
                descricao: 'Compilação executiva mensal de SMS em formato .docx (Word), gráficos de HHT em SVG, inspeções e gestão de Não Conformidades (NC).',
                submodulos: [
                    {
                        id: 'gerador_word_docx',
                        nome: 'Emissor do Relatório Mensal (.docx)',
                        descricao: 'Geração automatizada do documento Word com estatísticas, indicadores proativos e reativos, gráficos e anexos.',
                        funcoesChave: ['gerarRelatorioMensalSms', 'montarDocRelSms', 'baixarDocxRelSms'],
                        tabelasSupabase: ['relatorios_mensais', 'hht_lancamentos', 'acidentes_registros', 'treinamentos_realizados'],
                        regrasNegocio: 'Preservar formatação institucional da COP Ramal. Tratar HHT zero ou ausência de dados sem quebrar a geração.'
                    },
                    {
                        id: 'fotos_evidencias',
                        nome: 'Fotos & Evidências do Google Drive',
                        descricao: 'Seleção editorial de fotos por tema de DDSMA/Treinamentos para incorporação nas tabelas do relatório.',
                        funcoesChave: ['renderRelSmsFotosSeletor', 'carregarFotosDriveCompetencia', 'inserirFotoNoRelatorioDocx'],
                        tabelasSupabase: ['configuracoes_sistema'],
                        regrasNegocio: 'Usa api/proxy-imagem.js para contornar restrições de CORS e download seguro de imagens externas.'
                    },
                    {
                        id: 'nao_conformidades',
                        nome: 'Gestão de Não Conformidades (NC) & Inspeções',
                        descricao: 'Registro de desvios identificados em campo, prazo para adequação, responsável e evidência de fechamento.',
                        funcoesChave: ['renderNcPanel', 'abrirModalNovaNc', 'salvarNaoConformidade', 'concluirTratativaNc'],
                        tabelasSupabase: ['nao_conformidades', 'inspecoes_campo'],
                        regrasNegocio: 'Status: Aberta, Em Tratativa, Concluída ou Atrasada com cálculo automático de dias.'
                    },
                    {
                        id: 'word_manual',
                        nome: 'Modo Word Manual (Sem Drive)',
                        descricao: 'Alternativa offline que gera a seção de fotos editável com placeholders no Word para montagem manual.',
                        funcoesChave: ['gerarSecaoFotosWordManual', 'obterTemasCronogramaParaWordManual'],
                        tabelasSupabase: ['dds_temas_cronograma', 'treinamentos_cronograma'],
                        regrasNegocio: 'Não depende de credenciais de Google Drive; garante emissão do documento mesmo sem rede.'
                    }
                ]
            },
            {
                id: 'saude_psicossocial',
                nome: 'SAÚDE OCUPACIONAL, PCMSO & PSICOSSOCIAL',
                icone: '🩺',
                arquivoPrincipal: 'dashboard/modules/saude_psicossocial.js',
                arquivosRelacionados: ['dashboard/modules/pcmso.js', 'dashboard/modules/saude_prestadores.js', 'dashboard/dashboard.js'],
                descricao: 'Vigilância da saúde ocupacional (NR-07), régua legal de ASOs (12 e 24 meses), exames por GHE, mutirões, atestados e fatores psicossociais (NR-01).',
                submodulos: [
                    {
                        id: 'regua_asos',
                        nome: 'Régua Legal de ASOs (Vencimentos 12/24 Meses)',
                        descricao: 'Painel de controle com status dos ASOs: Em Dia, A Vencer (30 dias) e Vencidos.',
                        funcoesChave: ['renderSaudePanel', 'carregarDadosSaudeOcupacional', 'calcularStatusAso', 'filtrarAsosPorVencimento'],
                        tabelasSupabase: ['colaboradores_efetivo', 'colaboradores_checklist', 'aso_exames'],
                        regrasNegocio: 'Conforme NR-07: colaboradores expostos a riscos específicos ou >50 anos têm periodicidade anual (12 meses); demais bienal (24 meses).'
                    },
                    {
                        id: 'cadernos_pcmso',
                        nome: 'Cadernos do PCMSO (Cadernos 1 a 5)',
                        descricao: 'Emissão dos cadernos operacionais do PCMSO (Geral, Cronograma, Matriz de Exames, Ficha por GHE e Relatório Analítico Anual).',
                        funcoesChave: ['abrirModalCadernosPcmso', 'executarEmissaoCadernoPcmsoSelecionado', 'emitirCadernoPcmsoMatrizGeral'],
                        tabelasSupabase: ['pcmso_matriz_exames', 'ghe_catalogo', 'configuracoes_sistema'],
                        regrasNegocio: 'Uso de abrirDocumentoHtmlParaImpressao. O Relatório Analítico Anual atende NR-07 item 7.6.2.'
                    },
                    {
                        id: 'baixa_mutirao',
                        nome: 'Baixa de Exames Pós-Mutirão',
                        descricao: 'Rotina em lote para registrar realização de exames clínicos e complementares após mutirões com a clínica.',
                        funcoesChave: ['abrirModalBaixaMutiraoAso', 'processarBaixaEmLoteAsos', 'sincronizarAsoEfetivoEChecklist'],
                        tabelasSupabase: ['colaboradores_efetivo', 'colaboradores_checklist', 'aso_exames'],
                        regrasNegocio: 'REGRA DUPLA: Ao dar baixa na nova validade do ASO, atualizar simultaneamente ambas as tabelas de colaboradores.'
                    },
                    {
                        id: 'prestadores_saude',
                        nome: 'Clínicas & Médicos Examinadores',
                        descricao: 'Cadastro do médico coordenador do PCMSO, médicos examinadores autorizados e clínicas credenciadas.',
                        funcoesChave: ['renderPrestadoresSaude', 'salvarPrestadorSaude', 'obterMedicoCoordenadorPcmso'],
                        tabelasSupabase: ['saude_prestadores', 'configuracoes_sistema'],
                        regrasNegocio: 'Separar claramente Médico Coordenador (responsável técnico do PCMSO) de Médicos Examinadores locais.'
                    },
                    {
                        id: 'psicossocial_nr01',
                        nome: 'Fatores de Risco Psicossocial (NR-01)',
                        descricao: 'Mapeamento e acompanhamento dos riscos psicossociais no trabalho, estresse ocupacional e canais de apoio.',
                        funcoesChave: ['renderPsicossocialPanel', 'salvarDiagnosticoPsicossocial', 'calcularIndicadoresPsicossociais'],
                        tabelasSupabase: ['saude_psicossocial_avaliacoes'],
                        regrasNegocio: 'Atendimento às diretrizes atualizadas da NR-01 para gestão integrada de riscos psicossociais.'
                    }
                ]
            },
            {
                id: 'epi_estoque',
                nome: 'EPIS, ESTOQUE & ACESSO',
                icone: '🦺',
                arquivoPrincipal: 'dashboard/modules/epi_estoque.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Catálogo de Equipamentos de Proteção Individual (NR-06), Certificado de Aprovação (CA), ficha de entrega, estoque e controle RBAC.',
                submodulos: [
                    {
                        id: 'catalogo_epi',
                        nome: 'Catálogo de EPIs & Consulta de CA',
                        descricao: 'Cadastro de EPIs com número de CA do Ministério do Trabalho, validade, fabricante e especificação técnica.',
                        funcoesChave: ['renderEpiPanel', 'abrirModalEpi', 'salvarEpiCatalogo', 'validarNumeroCaMte'],
                        tabelasSupabase: ['epi_catalogo'],
                        regrasNegocio: 'EPIs sem CA válido não devem permitir novas compras ou entregas como equipamento certificado.'
                    },
                    {
                        id: 'estoque_movimentacoes',
                        nome: 'Controle de Estoque (Entradas, Saídas e Custo Médio)',
                        descricao: 'Lançamento de notas fiscais de entrada, custos unitários, saídas e cálculo de estoque mínimo de segurança.',
                        funcoesChave: ['registrarEntradaEstoqueEpi', 'calcularCustoMedioEpi', 'verificarAlertaEstoqueMinimo'],
                        tabelasSupabase: ['epi_catalogo', 'epi_movimentacoes', 'epi_compras'],
                        regrasNegocio: 'Estoque atualizado em tempo real. Disparar alerta visual na Central de Pendências quando estoque < mínimo.'
                    },
                    {
                        id: 'ficha_entrega_epi',
                        nome: 'Ficha de Entrega de EPI & Assinatura Digital',
                        descricao: 'Registro das entregas individuais aos funcionários, termos de responsabilidade e histórico de substituições.',
                        funcoesChave: ['abrirModalEntregaEpi', 'salvarEntregaEpiColaborador', 'gerarFichaEpiIndividualHtml'],
                        tabelasSupabase: ['epi_entregas', 'colaboradores_efetivo'],
                        regrasNegocio: 'Conforme NR-06: entrega deve conter data, descrição do EPI, número do CA e comprovação de recebimento.'
                    },
                    {
                        id: 'rbac_perfis',
                        nome: 'Perfis de Acesso do Painel (RBAC)',
                        descricao: 'Configuração de permissões e módulos visíveis/editáveis para usuários administrativos e visualizadores.',
                        funcoesChave: ['renderPainelPerfisLista', 'salvarPerfilPainel', 'moduloPermitidoPainel'],
                        tabelasSupabase: ['painel_perfis', 'painel_usuarios'],
                        regrasNegocio: 'Não enfraquecer o RLS no Supabase. O controle de tela no front é apenas UX; a segurança real é no banco.'
                    }
                ]
            },
            {
                id: 'apr_cipa',
                nome: 'APR (5x5) & CIPA',
                icone: '⚠️',
                arquivoPrincipal: 'dashboard/modules/apr_cipa.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Motor de inferência técnica para Análise Preliminar de Risco (Matriz 5x5 COP Ramal), templates pré-carregados e gestão de CIPA (NR-05).',
                submodulos: [
                    {
                        id: 'emissao_apr',
                        nome: 'Elaboração e Emissão de APR (Matriz 5x5)',
                        descricao: 'Definição da atividade, passos da tarefa, perigos, possíveis lesões, medidas preventivas e cálculo de risco puro vs residual.',
                        funcoesChave: ['renderAprPanel', 'abrirModalNovaApr', 'salvarAprRegistro', 'calcularGrauRiscoMatriz5x5'],
                        tabelasSupabase: ['apr_registros', 'apr_passos'],
                        regrasNegocio: 'Atividades críticas (Trabalho em Altura, Espaço Confinado, Eletricidade) exigem PT (Permissão de Trabalho) acoplada.'
                    },
                    {
                        id: 'templates_apr',
                        nome: 'Banco de Modelos (MODELOS_APR_SEED)',
                        descricao: 'Biblioteca de APRs padrão para escavação, formas, armação, concretagem, solda e montagem eletromecânica.',
                        funcoesChave: ['carregarModelosAprSeed', 'aplicarModeloAprParaNovaAtividade'],
                        tabelasSupabase: ['configuracoes_sistema'],
                        regrasNegocio: 'Templates servem como base técnica mas devem permitir adaptação às condições reais do campo.'
                    },
                    {
                        id: 'reunioes_cipa',
                        nome: 'Gestão da CIPA & Atas de Reunião (NR-05)',
                        descricao: 'Controle de reuniões ordinárias mensais e extraordinárias, registro de pautas e atas assinadas.',
                        funcoesChave: ['renderCipaPanel', 'abrirModalReuniaoCipa', 'salvarReuniaoCipa', 'gerarAtaCipaHtml'],
                        tabelasSupabase: ['cipa_reunioes', 'cipa_membros'],
                        regrasNegocio: 'Reuniões mensais obrigatórias com registro em ata e acompanhamento das ações propostas.'
                    },
                    {
                        id: 'processo_eleitoral_cipa',
                        nome: 'Assistente de Processo Eleitoral CIPA',
                        descricao: 'Cronograma automatizado de prazos da eleição da CIPA (Edital, Inscrição, Votação, Apuração e Posse).',
                        funcoesChave: ['iniciarProcessoEleitoralCipa', 'calcularPrazosEleicaoCipa', 'gerarEditalConvocacaoCipa'],
                        tabelasSupabase: ['cipa_processos_eleitorais'],
                        regrasNegocio: 'Prazos calculados rigorosamente de acordo com os dias contados previstos na NR-05.'
                    }
                ]
            },
            {
                id: 'ergonomia_periculosidade_pgr',
                nome: 'ERGONOMIA (NR-17), PERICULOSIDADE (NR-16) & PGR',
                icone: '🧘',
                arquivoPrincipal: 'dashboard/modules/ergonomia_periculosidade_pgr.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Avaliação Ergonômica Preliminar (AEP), Laudo de Periculosidade, Plano de Ação 5W2H do PGR (NR-01) e Central de Pendências SST.',
                submodulos: [
                    {
                        id: 'aep_nr17',
                        nome: 'Avaliação Ergonômica Preliminar - AEP (NR-17)',
                        descricao: 'Levantamento de exigências posturais, movimentação de cargas, repetitividade e mobiliário com checklist ergonômico.',
                        funcoesChave: ['renderErgonomiaPanel', 'salvarAvaliacaoErgonomica', 'gerarRelatorioAepHtml'],
                        tabelasSupabase: ['ergonomia_avaliacoes', 'ghe_catalogo'],
                        regrasNegocio: 'Identifica necessidade de AET (Análise Ergonômica do Trabalho) aprofundada conforme critérios da NR-17.'
                    },
                    {
                        id: 'periculosidade_nr16',
                        nome: 'Laudos de Periculosidade (NR-16)',
                        descricao: 'Enquadramento de atividades com inflamáveis, explosivos, eletricidade ou faixa de servidão de linhas de alta tensão.',
                        funcoesChave: ['renderPericulosidadePanel', 'salvarLaudoPericulosidade', 'verificarEnquadramentoNr16'],
                        tabelasSupabase: ['periculosidade_laudos', 'ghe_catalogo'],
                        regrasNegocio: 'Gera parecer técnico com embasamento no anexo aplicável da NR-16.'
                    },
                    {
                        id: 'plano_acao_5w2h',
                        nome: 'Plano de Ação 5W2H do PGR (NR-01)',
                        descricao: 'Gestão contínua de melhorias: O quê (What), Por quê (Why), Onde (Where), Quem (Who), Quando (When), Como (How), Quanto (How much).',
                        funcoesChave: ['renderPlanoAcaoPanel', 'abrirModalNovoPlanoAcao', 'salvarPlanoAcao5w2h', 'atualizarStatusItem5w2h'],
                        tabelasSupabase: ['pgr_plano_acao'],
                        regrasNegocio: 'Prazos devem conter data de conclusão e alerta visual de atraso integrado à Central de Pendências.'
                    },
                    {
                        id: 'central_alertas',
                        nome: 'Central Inteligente de Pendências & Alertas SST',
                        descricao: 'Varredura automática diária que consolida ASOs a vencer, EPIs em falta, treinamentos vencendo e NCs atrasadas.',
                        funcoesChave: ['atualizarBadgeCentralAlertas', 'renderListaCentralAlertas', 'abrirItemPendenteDireto'],
                        tabelasSupabase: ['colaboradores_efetivo', 'treinamentos_realizados', 'nao_conformidades', 'epi_catalogo'],
                        regrasNegocio: 'Alimenta o sininho de notificações no topo do painel gerencial em tempo real.'
                    }
                ]
            },
            {
                id: 'ambiental_compras_hht',
                nome: 'MEIO AMBIENTE, RESÍDUOS & HHT',
                icone: '🌱',
                arquivoPrincipal: 'dashboard/modules/ambiental_compras_hht.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Homens-Hora Trabalhadas (HHT), taxas de frequência e gravidade, manifestos de resíduos (MTR) e compras de segurança.',
                submodulos: [
                    {
                        id: 'hht_mensal',
                        nome: 'Homens-Hora Trabalhadas (HHT) & Calendário',
                        descricao: 'Lançamento de efetivo diário e horas trabalhadas para apuração estatística de exposição ao risco.',
                        funcoesChave: ['renderAmbientalPanel', 'salvarHhtMensal', 'calcularTotaisHhtPeriodo'],
                        tabelasSupabase: ['hht_lancamentos'],
                        regrasNegocio: 'Base de cálculo para taxas de acidentabilidade (NBR 14280 / TF e TG).'
                    },
                    {
                        id: 'residuos_mtr',
                        nome: 'Manifesto de Resíduos Sólidos (MTR)',
                        descricao: 'Controle de destinação final de resíduos perigosos (Classe I) e não perigosos (Classe II).',
                        funcoesChave: ['salvarManifestoResiduo', 'renderResiduosPanel'],
                        tabelasSupabase: ['residuos_manifestos'],
                        regrasNegocio: 'Registro de transportador, nota fiscal e certificado de destinação final.'
                    },
                    {
                        id: 'compras_sst',
                        nome: 'Requisições de Compras SST',
                        descricao: 'Gestão de solicitações de aquisição de EPIs, EPCs, extintores e insumos de segurança.',
                        funcoesChave: ['renderComprasPanel', 'salvarRequisicaoCompraSst'],
                        tabelasSupabase: ['compras_requisicoes'],
                        regrasNegocio: 'Fluxo: Solicitado -> Em Cotação -> Aprovado -> Entregue no Canteiro.'
                    }
                ]
            },
            {
                id: 'documentos_brigada',
                nome: 'CONTROLE DOCUMENTAL & BRIGADA',
                icone: '📄',
                arquivoPrincipal: 'dashboard/modules/documentos_brigada.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Lista mestra de documentos SST, controle de revisões, dimensionamento da Brigada de Incêndio e simulados.',
                submodulos: [
                    {
                        id: 'lista_mestra',
                        nome: 'Lista Mestra de Documentos & Revisões',
                        descricao: 'Catálogo de procedimentos, programas (PGR, PCMSO, PCA) e formulários com número de revisão vigente.',
                        funcoesChave: ['renderDocumentosPanel', 'salvarDocumentoListaMestra'],
                        tabelasSupabase: ['documentos_lista_mestra'],
                        regrasNegocio: 'Documentos obsoletos devem ser marcados sem exclusão para rastreabilidade de auditoria.'
                    },
                    {
                        id: 'brigada_incendio',
                        nome: 'Brigada de Incêndio & Simulados',
                        descricao: 'Dimensionamento conforme NBR 14276, membros da brigada, organograma e registro de treinamentos práticos.',
                        funcoesChave: ['renderBrigadaPanel', 'salvarMembroBrigada', 'registrarSimuladoEvacuacao'],
                        tabelasSupabase: ['brigada_membros', 'brigada_treinados'],
                        regrasNegocio: 'Controle de validade anual do treinamento de combate a incêndio e primeiros socorros.'
                    }
                ]
            },
            {
                id: 'extintores_relatos',
                nome: 'EXTINTORES & RELATOS DE PROBLEMAS',
                icone: '🧯',
                arquivoPrincipal: 'dashboard/dashboard.js',
                arquivosRelacionados: ['dashboard/index.html', 'app.js'],
                descricao: 'Inspeção mensal de extintores, controle de vencimentos de carga e teste hidrostático e relatos de desvios em campo.',
                submodulos: [
                    {
                        id: 'inspecao_extintores',
                        nome: 'Inspeção Mensal de Extintores (NR-23)',
                        descricao: 'Status da mangueira, manômetro, lacre, sinalização, acesso desobstruído e validade da recarga.',
                        funcoesChave: ['renderExtintorPanel', 'salvarInspecaoExtintor', 'carregarExtintoresDoBanco'],
                        tabelasSupabase: ['extintores_catalogo', 'extintores_inspecoes'],
                        regrasNegocio: 'Sincronizado diretamente com os checklists realizados no PWA de campo pelos técnicos.'
                    },
                    {
                        id: 'relatos_campo',
                        nome: 'Relatos de Problemas & Quase-Acidentes',
                        descricao: 'Comunicações rápidas de perigos feitas via celular com fotos e geolocalização.',
                        funcoesChave: ['renderRelatosPanel', 'renderRelatosGestaoLista', 'tratarRelatoProblema'],
                        tabelasSupabase: ['relatos_problemas'],
                        regrasNegocio: 'Classificação por severidade com envio imediato de alerta para a gestão.'
                    }
                ]
            },
            {
                id: 'placar_lideres',
                nome: 'PLACAR DE LÍDERES & GAMIFICAÇÃO',
                icone: '🏆',
                arquivoPrincipal: 'dashboard/placar_lideres.js',
                arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html'],
                descricao: 'Ranking de segurança do trabalho, engajamento das frentes operacionais e premiações preventivas.',
                submodulos: [
                    {
                        id: 'ranking_seguranca',
                        nome: 'Ranking Mensal de Frentes & Mestres',
                        descricao: 'Pontuação baseada em checklists realizados, DDS cumpridos, participação em treinamentos e zero acidentes.',
                        funcoesChave: ['abrirPaginaPlacarLideres', 'calcularPontuacaoLideres', 'renderPodioSeguranca'],
                        tabelasSupabase: ['checklists', 'dds_realizados', 'acidentes_registros'],
                        regrasNegocio: 'Pesos ponderados transparentes para motivar comportamento seguro na obra.'
                    }
                ]
            },
            {
                id: 'pwa_campo',
                nome: 'APP MOBILE PWA DE CAMPO (OFFLINE-FIRST)',
                icone: '📱',
                arquivoPrincipal: 'app.js',
                arquivosRelacionados: ['index.html', 'data.js', 'sw.js', 'manifest.json', 'index.css'],
                descricao: 'Aplicação mobile para uso em canteiro e frentes sem sinal de internet: checklists de máquinas, veículos e EPIs.',
                submodulos: [
                    {
                        id: 'checklists_campo',
                        nome: 'Checklists de Inspeção Operacional',
                        descricao: 'Formulários dinâmicos por categoria de equipamento (Escavadeira, Caminhão, Betoneira, Gerador, etc.).',
                        funcoesChave: ['iniciarChecklist', 'salvarChecklistLocal', 'enviarChecklistSupabase', 'renderPerguntas'],
                        tabelasSupabase: ['checklists', 'equipamentos_catalogo'],
                        regrasNegocio: 'Itens não conformes impedem liberação do equipamento até correção (NC gerada automaticamente).'
                    },
                    {
                        id: 'offline_sync',
                        nome: 'Armazenamento Offline & Sincronização Automática',
                        descricao: 'Persistência no IndexedDB/LocalStorage e fila de envio em segundo plano via Service Worker.',
                        funcoesChave: ['sincronizarDadosPendentes', 'salvarNoArmazenamentoLocal', 'verificarConexaoInternet'],
                        tabelasSupabase: ['checklists', 'colaboradores_checklist'],
                        regrasNegocio: 'Nunca perder dados de campo. Se o operador estiver sem sinal, salvar localmente e sincronizar ao detectar rede.'
                    }
                ]
            },
            {
                id: 'api_backend',
                nome: 'APIS BACKEND & INTEGRAÇÃO GOOGLE DRIVE',
                icone: '🌐',
                arquivoPrincipal: 'server.js',
                arquivosRelacionados: ['api/anexo-iniciar.js', 'api/anexo-enviar-pedaco.js', 'api/anexo-finalizar.js', 'api/proxy-imagem.js', 'api/cronograma-pastas.js', 'api/anexos-drive-listar.js'],
                descricao: 'Endpoints serverless e middleware para envio de anexos pesados ao Google Drive, bypass de CORS e sincronização.',
                submodulos: [
                    {
                        id: 'upload_drive_chunks',
                        nome: 'Upload Resumable em Pedaços (Drive API)',
                        descricao: 'Envio em fatias (chunks base64) para contornar o limite de 4.5MB da Vercel e evitar bloqueio de CORS.',
                        funcoesChave: ['anexo-iniciar', 'anexo-enviar-pedaco', 'anexo-finalizar'],
                        tabelasSupabase: ['configuracoes_sistema'],
                        regrasNegocio: 'Token OAuth renovado via refresh_token. Estrutura de pastas automática: SMS_COP / {subpasta} / {ano} / {mes}.'
                    },
                    {
                        id: 'proxy_imagem',
                        nome: 'Proxy Seguro de Imagens (CORS Bypass)',
                        descricao: 'Download seguro de imagens do Google Drive e Supabase Storage para embutir diretamente no Word (.docx) e no painel.',
                        funcoesChave: ['proxy-imagem'],
                        tabelasSupabase: [],
                        regrasNegocio: 'Converte links do Drive para visualização direta lh3 com fallback para API v3 com chave de leitura.'
                    }
                ]
            }
        ]
    };

    // =========================================================================
    // 2. TIPOS DE INTENÇÃO DISPONÍVEIS
    // =========================================================================
    const INTENCOES_DISPONIVEIS = [
        {
            id: 'novo_modulo_completo',
            label: '🚀 Criar um NOVO MÓDULO independente (arquivo separado em dashboard/modules/)',
            prefixo: 'CRIAÇÃO DE NOVO MÓDULO INDEPENDENTE',
            descricao: 'Criar um módulo totalmente novo e desacoplado em dashboard/modules/, com tabela dedicada, tela, menu lateral e roteamento sem misturar com módulos existentes.'
        },
        {
            id: 'inclusao_funcao',
            label: '➕ Inclusão de uma nova função / tela em módulo existente',
            prefixo: 'INCLUSÃO DE NOVA FUNCIONALIDADE',
            descricao: 'Criar uma nova rotina, campo, modal, cálculo ou tela mantendo o padrão arquitetural do projeto.'
        },
        {
            id: 'correcao_funcao',
            label: '🐛 Correção de uma função existente',
            prefixo: 'CORREÇÃO CIRÚRGICA DE BUG',
            descricao: 'Identificar causa-raiz, corrigir comportamento inesperado ou erro de console sem quebrar outras rotinas.'
        },
        {
            id: 'regra_sst',
            label: '⚖️ Ajuste de Regra de Negócio SST / Normas (NR-01, NR-06, NR-07, NR-16, NR-17)',
            prefixo: 'ADEQUAÇÃO NORMATIVA SST',
            descricao: 'Modificar prazos legais, limites de exposição, fórmulas de dimensionamento ou regras de validade.'
        },
        {
            id: 'banco_sync',
            label: '🗄️ Ajuste de Banco de Dados / Supabase / Sincronização Dupla',
            prefixo: 'OPERAÇÃO DE BANCO E SINCRONIZAÇÃO',
            descricao: 'Alterar queries, RPCs, colunas ou sincronizar colaboradores_efetivo e colaboradores_checklist.'
        },
        {
            id: 'impressao_relatorio',
            label: '🖨️ Emissão de Relatório / Impressão / Documento Word',
            prefixo: 'EMISSÃO DOCUMENTAL E IMPRESSÃO',
            descricao: 'Gerar fichas, certificados, relatórios mensais .docx ou documentos imprimíveis via abrirDocumentoHtmlParaImpressao.'
        },
        {
            id: 'performance_ux',
            label: '⚡ Performance, Cache Egress ou Dark Mode (NR-17)',
            prefixo: 'OTIMIZAÇÃO DE PERFORMANCE E ERGONOMIA VISUAL',
            descricao: 'Otimizar chamadas ao Supabase, melhorar carregamento ou ajustar contraste e acessibilidade.'
        }
    ];

    // =========================================================================
    // 3. GERENCIADOR DE CONHECIMENTO & APRENDIZAGEM (PERSISTÊNCIA)
    // =========================================================================
    class GerenciadorConhecimentoSST {
        constructor() {
            this.dados = this.carregar();
        }

        carregar() {
            try {
                const salvo = localStorage.getItem(STORAGE_KEY_CONHECIMENTO);
                if (salvo) {
                    const parsed = JSON.parse(salvo);
                    return this.mesclarComPadrao(parsed);
                }
            } catch (e) {
                console.warn('Erro ao carregar conhecimento salvo do localStorage:', e);
            }
            return JSON.parse(JSON.stringify(BASE_CONHECIMENTO_SST_PADRAO));
        }

        mesclarComPadrao(custom) {
            const padrao = JSON.parse(JSON.stringify(BASE_CONHECIMENTO_SST_PADRAO));
            if (!custom || !custom.modulos) return padrao;

            const modulosMesclados = [...padrao.modulos];

            custom.modulos.forEach(modCustom => {
                const indexExistente = modulosMesclados.findIndex(m => m.id === modCustom.id);
                if (indexExistente >= 0) {
                    const modExistente = modulosMesclados[indexExistente];
                    (modCustom.submodulos || []).forEach(subCustom => {
                        const subIndex = modExistente.submodulos.findIndex(s => s.id === subCustom.id);
                        if (subIndex >= 0) {
                            modExistente.submodulos[subIndex] = { ...modExistente.submodulos[subIndex], ...subCustom };
                        } else {
                            modExistente.submodulos.push(subCustom);
                        }
                    });
                } else {
                    modulosMesclados.push(modCustom);
                }
            });

            return {
                ...padrao,
                ...custom,
                modulos: modulosMesclados
            };
        }

        salvar() {
            try {
                localStorage.setItem(STORAGE_KEY_CONHECIMENTO, JSON.stringify(this.dados));
                return true;
            } catch (e) {
                console.error('Falha ao salvar conhecimento SST no localStorage:', e);
                return false;
            }
        }

        restaurarPadroes() {
            this.dados = JSON.parse(JSON.stringify(BASE_CONHECIMENTO_SST_PADRAO));
            this.salvar();
        }

        adicionarConhecimento(moduloId, submoduloDados) {
            let mod = this.dados.modulos.find(m => m.id === moduloId);
            if (!mod) {
                throw new Error('Módulo não encontrado para vínculo: ' + moduloId);
            }
            const subExistenteIndex = mod.submodulos.findIndex(s => s.id === submoduloDados.id);
            if (subExistenteIndex >= 0) {
                mod.submodulos[subExistenteIndex] = { ...mod.submodulos[subExistenteIndex], ...submoduloDados };
            } else {
                mod.submodulos.push(submoduloDados);
            }
            this.salvar();
        }

        adicionarModuloInteiro(novoModuloObj) {
            const index = this.dados.modulos.findIndex(m => m.id === novoModuloObj.id);
            if (index >= 0) {
                this.dados.modulos[index] = { ...this.dados.modulos[index], ...novoModuloObj };
            } else {
                this.dados.modulos.push(novoModuloObj);
            }
            this.salvar();
        }

        adicionarRegraOuro(novaRegra) {
            if (!novaRegra || typeof novaRegra !== 'string') return;
            const limpa = novaRegra.trim();
            if (!this.dados.regrasOuroGlobais.includes(limpa)) {
                this.dados.regrasOuroGlobais.push(limpa);
                this.salvar();
            }
        }

        exportarJson() {
            return JSON.stringify(this.dados, null, 2);
        }

        importarJson(jsonString) {
            try {
                const importado = JSON.parse(jsonString);
                if (!importado.modulos || !Array.isArray(importado.modulos)) {
                    throw new Error('Formato de JSON inválido: não contém a lista de módulos.');
                }
                this.dados = this.mesclarComPadrao(importado);
                this.salvar();
                return { ok: true, mensagem: 'Conhecimento importado e mesclado com sucesso!' };
            } catch (e) {
                return { ok: false, mensagem: 'Erro na importação: ' + (e.message || e) };
            }
        }
    }

    const gerenciadorConhecimento = new GerenciadorConhecimentoSST();

    function gerarSlug(texto) {
        return String(texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'modulo';
    }

    function capitalizarCamel(texto) {
        return String(texto || '').replace(/(?:^|_)([a-z0-9])/g, (_, g) => g.toUpperCase());
    }

    // =========================================================================
    // 4. MOTOR GERADOR DE PROMPTS (MODO MÓDULO EXISTENTE & NOVO MÓDULO)
    // =========================================================================
    function construirPromptCompleto({
        intencaoId,
        moduloId,
        submoduloId,
        descricaoUsuario
    }) {
        const intencao = INTENCOES_DISPONIVEIS.find(i => i.id === intencaoId) || INTENCOES_DISPONIVEIS[0];
        const ehNovoModulo = (intencaoId === 'novo_modulo_completo') || (moduloId === '__novo_modulo__');

        if (ehNovoModulo) {
            return construirPromptNovoModulo({
                intencao,
                descricaoUsuario
            });
        }

        const modulo = gerenciadorConhecimento.dados.modulos.find(m => m.id === moduloId) || gerenciadorConhecimento.dados.modulos[0];
        const submodulo = (modulo.submodulos || []).find(s => s.id === submoduloId) || (modulo.submodulos && modulo.submodulos[0]) || {
            id: 'geral',
            nome: 'Geral do Módulo',
            descricao: modulo.descricao,
            funcoesChave: [],
            tabelasSupabase: []
        };

        const descricaoTratada = (descricaoUsuario || '').trim();

        let prompt = '';
        prompt += `# TAREFA SST: ${intencao.prefixo} — [${modulo.nome} > ${submodulo.nome.toUpperCase()}]\n\n`;

        prompt += `## 1. Contexto do Projeto & Engenharia Responsável\n`;
        prompt += `- **Aplicação**: App Checklist Segurança & Painel Gerencial SST (PISF Ramal do Agreste).\n`;
        prompt += `- **Gestor do Projeto**: João Everton (Engenheiro de Segurança do Trabalho e autor das regras).\n`;
        prompt += `- **Idioma Mandatório**: Toda comunicação, explicações, comentários de código e relatórios devem ser estritamente em **Português do Brasil (pt-BR)**.\n`;
        prompt += `- **Perfil de Comunicação**: Prático, didático, claro e orientado a regras de SST/ESG e negócio da obra.\n\n`;

        prompt += `## 2. Mapa Arquitetural & Arquivos Alvo\n`;
        prompt += `- **Arquivo Principal a Modificar**: \`${modulo.arquivoPrincipal}\`\n`;
        if (modulo.arquivosRelacionados && modulo.arquivosRelacionados.length > 0) {
            prompt += `- **Arquivos Relacionados / Interface**: \`${modulo.arquivosRelacionados.join('`, `')}\`\n`;
        }
        prompt += `- **DIRETRIZ DE LEITURA CIRÚRGICA**: Os arquivos do painel são extensos. NUNCA tente ler o arquivo completo de uma vez! Realize buscas direcionadas com \`grep\` para localizar as funções âncora e leia apenas blocos de até 150 linhas em torno da alteração.\n`;
        
        if (modulo.id !== 'pwa_campo') {
            prompt += `- **BLINDAGEM DO PWA DE CAMPO**: Esta demanda pertence exclusivamente ao Painel Gerencial (\`dashboard/\` e \`api/\`). É terminantemente PROIBIDO alterar arquivos da raiz (\`app.js\`, \`index.html\`, \`sw.js\`), preservando a integridade da operação offline dos técnicos em campo.\n`;
        }
        prompt += `\n`;

        prompt += `## 3. Demanda Específica a Executar\n`;
        prompt += `**Tipo de Solicitação**: ${intencao.label}\n`;
        prompt += `**Módulo/Submódulo**: ${modulo.nome} -> ${submodulo.nome}\n\n`;
        prompt += `**Instrução Detalhada do Engenheiro:**\n`;
        prompt += `"""\n${descricaoTratada || 'Implementar melhoria/correção na rotina selecionada conforme regras de negócio de SST.'}\n"""\n\n`;

        if (submodulo.funcoesChave && submodulo.funcoesChave.length > 0) {
            prompt += `## 4. Funções e Componentes Existentes a REUTILIZAR (Não Reinventar a Roda)\n`;
            prompt += `O sistema já possui estruturas prontas para este submódulo. O agente DEVE reaproveitá-las em vez de criar funções concorrentes ou duplicadas:\n`;
            submodulo.funcoesChave.forEach(fn => {
                prompt += `- \`${fn}\`\n`;
            });
            prompt += `\n`;
        }

        if (submodulo.tabelasSupabase && submodulo.tabelasSupabase.length > 0) {
            prompt += `## 5. Estrutura de Dados & Tabelas Supabase\n`;
            prompt += `Tabelas envolvidas neste fluxo:\n`;
            submodulo.tabelasSupabase.forEach(tb => {
                prompt += `- \`public.${tb}\`\n`;
            });
            prompt += `\n`;
        }

        if (submodulo.regrasNegocio) {
            prompt += `## 6. Regra de Negócio SST do Módulo\n`;
            prompt += `> ${submodulo.regrasNegocio}\n\n`;
        }

        prompt += `## 7. Regras de Ouro Técnicas e de SST Inegociáveis\n`;
        const regrasGlobais = gerenciadorConhecimento.dados.regrasOuroGlobais || [];
        regrasGlobais.forEach((regra, idx) => {
            prompt += `${idx + 1}. **${regra}**\n`;
        });
        prompt += `\n`;

        prompt += `## 8. Critérios de Aceite e Checklist de Entrega para o Agente\n`;
        prompt += `- [ ] Localização precisa da rotina no arquivo \`${modulo.arquivoPrincipal}\` antes de editar.\n`;
        prompt += `- [ ] Edição cirúrgica sem apagar código existente nem comentar trechos úteis.\n`;
        prompt += `- [ ] Execução de validação de sintaxe (\`node --check [arquivo]\`).\n`;
        prompt += `- [ ] Atualização do cache-buster (?v=...) no arquivo modificado.\n`;
        prompt += `- [ ] Teste da interface e verificação no console para garantir zero erros de runtime.\n`;
        prompt += `- [ ] Resumo didático e conciso entregue em Português (pt-BR) informando exatamente o que foi alterado e como João pode testar no painel (\`https://app-checklist-seguranca.vercel.app/dashboard/\`).\n`;

        return prompt;
    }

    function construirPromptNovoModulo({ intencao, descricaoUsuario }) {
        const nomeModulo = document.getElementById('novoModuloNome')?.value.trim() || 'Gestão de Terceiros, PJ & Temporários';
        const arquivoModular = document.getElementById('novoModuloArquivo')?.value.trim() || 'dashboard/modules/terceiros_prestadores.js';
        const chaveRota = document.getElementById('novoModuloChave')?.value.trim() || 'terceiros';
        const grupoMenu = document.getElementById('novoModuloGrupo')?.value || 'pessoas';
        const tabelaSupabase = document.getElementById('novoModuloTabela')?.value.trim() || 'terceiros_prestadores';
        const descricaoTratada = (descricaoUsuario || '').trim();

        const nomeArquivoApenas = arquivoModular.split('/').pop() || 'novo_modulo.js';
        const idCapitalizado = capitalizarCamel(chaveRota);

        let prompt = '';
        prompt += `# TAREFA SST: CRIAÇÃO DE NOVO MÓDULO INDEPENDENTE — [${nomeModulo.toUpperCase()}]\n\n`;

        prompt += `## 1. Contexto do Projeto & Engenharia Responsável\n`;
        prompt += `- **Aplicação**: App Checklist Segurança & Painel Gerencial SST (PISF Ramal do Agreste).\n`;
        prompt += `- **Gestor do Projeto**: João Everton (Engenheiro de Segurança do Trabalho e autor das regras).\n`;
        prompt += `- **Idioma Mandatório**: Toda comunicação, explicações, comentários de código e relatórios devem ser estritamente em **Português do Brasil (pt-BR)**.\n`;
        prompt += `- **Perfil de Comunicação**: Prático, didático, claro e orientado a regras de SST/ESG e negócio da obra.\n\n`;

        prompt += `## 2. Padrão Arquitetural de Desacoplamento (Obrigatório)\n`;
        prompt += `O sistema segue rigorosa arquitetura modular em \`dashboard/modules/\`. Este novo módulo DEVE ser criado em arquivo próprio e desacoplado, sem inflar o núcleo (\`dashboard.js\`):\n`;
        prompt += `- **Novo Arquivo a Criar**: \`${arquivoModular}\`\n`;
        prompt += `- **Padrão de Código**: Encapsular 100% da lógica em uma IIFE:\n`;
        prompt += `  \`\`\`javascript\n`;
        prompt += `  (function(window) {\n`;
        prompt += `      'use strict';\n`;
        prompt += `      // Estados locais do módulo\n`;
        prompt += `      // Renderizadores do painel (ex: render${idCapitalizado}Panel)\n`;
        prompt += `      // Modais e chamadas Supabase\n`;
        prompt += `      // Exportações para window (para integração com showDbPage)\n`;
        prompt += `  })(window);\n`;
        prompt += `  \`\`\`\n`;
        prompt += `- **ID do Container da Página**: \`page-${chaveRota}\`\n`;
        prompt += `- **ID do Botão no Menu**: \`nav${idCapitalizado}\`\n`;
        prompt += `- **Grupo do Menu Lateral**: Grupo \`${grupoMenu}\` em \`dashboard/index.html\`\n\n`;

        prompt += `## 3. Demanda e Especificação do Novo Módulo\n`;
        prompt += `**Nome do Módulo**: ${nomeModulo}\n`;
        prompt += `**Tabela Própria Supabase**: \`public.${tabelaSupabase}\`\n\n`;
        prompt += `**Instrução Detalhada do Engenheiro:**\n`;
        prompt += `"""\n${descricaoTratada || 'Criar módulo completo de ' + nomeModulo + ' com formulários, listagem e persistência no Supabase.'}\n"""\n\n`;

        prompt += `## 4. REGRA DE OURO CRÍTICA: NÃO CONTAMINAÇÃO DO HEADCOUNT CLT DA OBRA\n`;
        prompt += `⚠️ **ATENÇÃO MÁXIMA**: Terceiros, mecânicos terceirizados (ex: empresa ARTEC) e prestadores pessoa jurídica (PJ) **NUNCA DEVEM SER MISTURADOS COM A TABELA OFICIAL \`public.colaboradores_efetivo\`**!\n`;
        prompt += `- A tabela \`colaboradores_efetivo\` alimenta relatórios contratuais de Mão de Obra Local (RSA - Quadros 1 e 2 - ADA) e taxas de HHT de funcionários próprios.\n`;
        prompt += `- Este novo módulo DEVE utilizar estritamente sua própria tabela dedicada: \`public.${tabelaSupabase}\`, garantindo controle rigoroso de segurança (ASOs, integrações, NRs) sem distorcer o headcount CLT da COP.\n\n`;

        prompt += `## 5. Roteiro Passo a Passo de Integração na Interface (Sem Tela em Branco)\n`;
        prompt += `Para que o novo módulo apareça no painel e funcione perfeitamente sem ficar em branco, o agente DEVE executar os seguintes passos:\n\n`;
        prompt += `1. **Criar o Arquivo Modular (\`${arquivoModular}\`)**:\n`;
        prompt += `   - Implementar a função principal \`render${idCapitalizado}Panel()\` e modais de cadastro/edição.\n`;
        prompt += `   - Exportar \`window.render${idCapitalizado}Panel = render${idCapitalizado}Panel;\`.\n`;
        prompt += `2. **Adicionar o Script em \`dashboard/index.html\`**:\n`;
        prompt += `   - Inserir a tag \`<script src="modules/${nomeArquivoApenas}?v=296"></script>\` logo após os demais módulos.\n`;
        prompt += `3. **Adicionar o Botão no Menu Lateral (\`dashboard/index.html\`)**:\n`;
        prompt += `   - Inserir dentro do grupo \`#navGroupItems-${grupoMenu}\`:\n`;
        prompt += `     \`<button class="db-nav-item" id="nav${idCapitalizado}" onclick="showDbPage('${chaveRota}')"><span class="db-nav-icon">🚀</span> ${nomeModulo}</button>\`\n`;
        prompt += `4. **Adicionar o Container da Página (\`dashboard/index.html\`)**:\n`;
        prompt += `   - Inserir \`<section class="db-page" id="page-${chaveRota}"></section>\` dentro de \`<main class="db-main">\` antes do footer.\n`;
        prompt += `5. **Roteamento Duplo e Sincronizado (REGRA DE PREVENÇÃO DE TELA EM BRANCO)**:\n`;
        prompt += `   - Em \`dashboard/dashboard.js\` E TAMBÉM em \`dashboard/modules/epi_estoque.js\` (que possui declaração homônima de \`showDbPage\` e \`DB_PAGE_TITLES\`):\n`;
        prompt += `     - Adicionar \`${chaveRota}: 'nav${idCapitalizado}'\` no objeto \`navMap\`.\n`;
        prompt += `     - Adicionar \`${chaveRota}: '${nomeModulo}'\` em \`DB_PAGE_TITLES\`.\n`;
        prompt += `     - Adicionar no \`showDbPage\`: \`if (pageId === '${chaveRota}') { if (typeof window.render${idCapitalizado}Panel === 'function') window.render${idCapitalizado}Panel(); }\`.\n`;
        prompt += `6. **Atualizar a Documentação em \`dashboard/MAPA_MODULOS.md\`**:\n`;
        prompt += `   - Incluir a linha do novo módulo na tabela de módulos desacoplados com seu arquivo e responsabilidade técnica.\n\n`;

        prompt += `## 6. Proposta de Estrutura de Banco de Dados (Supabase DDL / SQL)\n`;
        prompt += `O agente deve fornecer o comando SQL completo para criação da tabela no Supabase:\n`;
        prompt += `\`\`\`sql\n`;
        prompt += `-- Criação da tabela dedicada para o novo módulo ${nomeModulo}\n`;
        prompt += `CREATE TABLE IF NOT EXISTS public.${tabelaSupabase} (\n`;
        prompt += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
        prompt += `    nome TEXT NOT NULL,\n`;
        prompt += `    cpf_ou_documento TEXT,\n`;
        prompt += `    empresa_parceira TEXT NOT NULL, -- Ex: ARTEC, PJ Individual, etc.\n`;
        prompt += `    tipo_vinculo TEXT DEFAULT 'Terceiro_PJ', -- 'Mecanico', 'PJ', 'Temporario', 'Prestador'\n`;
        prompt += `    funcao TEXT NOT NULL,\n`;
        prompt += `    setor_frente TEXT,\n`;
        prompt += `    data_integracao DATE DEFAULT CURRENT_DATE,\n`;
        prompt += `    aso_validade DATE,\n`;
        prompt += `    treinamentos_obrigatorios JSONB DEFAULT '[]'::jsonb,\n`;
        prompt += `    ativo BOOLEAN DEFAULT TRUE,\n`;
        prompt += `    observacoes TEXT,\n`;
        prompt += `    criado_em TIMESTAMPTZ DEFAULT NOW(),\n`;
        prompt += `    atualizado_em TIMESTAMPTZ DEFAULT NOW()\n`;
        prompt += `);\n\n`;
        prompt += `-- Índice para consultas rápidas\n`;
        prompt += `CREATE INDEX IF NOT EXISTS idx_${tabelaSupabase}_empresa ON public.${tabelaSupabase}(empresa_parceira);\n`;
        prompt += `CREATE INDEX IF NOT EXISTS idx_${tabelaSupabase}_ativo ON public.${tabelaSupabase}(ativo);\n`;
        prompt += `\`\`\`\n\n`;

        prompt += `## 7. Regras de Ouro Técnicas e de SST Inegociáveis\n`;
        prompt += `1. **NUNCA usar window.open()**. Usar sempre abrirDocumentoHtmlParaImpressao(html, titulo) ou Blob com URL.createObjectURL.\n`;
        prompt += `2. **Suporte a Dark Mode (NR-17)**: todo elemento deve respeitar --bg, --card, --text, --border.\n`;
        prompt += `3. **Preservação do App Mobile PWA de Campo**: não alterar app.js, index.html ou sw.js da raiz.\n`;
        prompt += `4. **Leitura cirúrgica**: ler blocos de até 150 linhas em torno dos pontos de inserção nos arquivos existentes.\n`;
        prompt += `5. **Atualização de Cache-Buster (?v=296)** em todas as tags e scripts modificados.\n\n`;

        prompt += `## 8. Critérios de Aceite e Checklist de Entrega\n`;
        prompt += `- [ ] Arquivo modular \`${arquivoModular}\` criado com código limpo e responsivo.\n`;
        prompt += `- [ ] Botão do menu funcionando no grupo \`${grupoMenu}\` e abrindo a tela sem erros.\n`;
        prompt += `- [ ] Rota configurada nos dois arquivos centrais (\`dashboard.js\` e \`epi_estoque.js\`) para garantir exibição sem tela em branco.\n`;
        prompt += `- [ ] Script SQL fornecido para execução segura no Supabase.\n`;
        prompt += `- [ ] \`node --check\` e \`npm run lint\` executados e aprovados com 0 erros.\n`;
        prompt += `- [ ] Resumo didático e passo a passo de teste entregue em Português (pt-BR).\n`;

        return prompt;
    }

    // =========================================================================
    // 5. RENDERIZAÇÃO DA INTERFACE DO GERADOR DE PROMPTS
    // =========================================================================
    function inicializarGeradorPrompts() {
        const container = document.getElementById('page-geradorprompts');
        if (!container) return;

        if (!container.dataset.inicializado) {
            container.dataset.inicializado = 'true';
            renderizarEstruturaCompleta(container);
            popularSelectIntencoes();
            popularSelectModulos();
            selecionarModoOperacao('novo_modulo');
            renderizarListaConhecimentos();
        }
    }

    function renderizarEstruturaCompleta(container) {
        container.innerHTML = `
            <div style="max-width:1200px; margin:0 auto; padding:10px 0 40px 0;">
                
                <!-- Banner de Cabeçalho -->
                <div style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); border-radius:14px; padding:24px 28px; color:#fff; margin-bottom:20px; box-shadow:0 10px 25px -5px rgba(37,99,235,0.25); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                            <span style="font-size:28px;">💡</span>
                            <h2 style="margin:0; font-size:22px; font-weight:700; letter-spacing:-0.02em;">Gerador de Prompts Especialista em SST</h2>
                            <span style="background:rgba(255,255,255,0.2); font-size:11px; padding:3px 8px; border-radius:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">IA Booster</span>
                        </div>
                        <p style="margin:0; font-size:13px; opacity:0.9; max-width:680px; line-height:1.45;">
                            Gere prompts técnicos cirúrgicos e blindados contra alucinações para colar direto no agente de IA (Antigravity, Cursor, Claude Code, Gemini). Suporta manutenção em módulos existentes e a <strong>criação de novos módulos desacoplados</strong>.
                        </p>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" class="db-apply-btn" onclick="alternarAbaGerador('gerador')" id="btnTabGerador" style="background:#fff; color:#1e3a8a; font-weight:700; padding:10px 14px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                            ⚡ Gerar Prompt
                        </button>
                        <button type="button" class="db-clear-btn" onclick="alternarAbaGerador('conhecimento')" id="btnTabConhecimento" style="background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3); font-weight:600; padding:10px 14px; border-radius:8px; cursor:pointer;">
                            🧠 Base de Aprendizagem (<span id="qtdModulosCadastrados">0</span>)
                        </button>
                        <button type="button" class="db-clear-btn" onclick="baixarArquivoGeradorPrompts()" id="btnBaixarModuloHeader" style="background:rgba(255,255,255,0.18); color:#fff; border:1px solid rgba(255,255,255,0.35); font-weight:700; padding:10px 14px; border-radius:8px; cursor:pointer;" title="Baixar o arquivo gerador_prompts.js direto para seu computador">
                            📥 Baixar .js
                        </button>
                        <button type="button" class="db-clear-btn" onclick="abrirModalInstalacaoAntigravity()" id="btnInstalarAntigravityHeader" style="background:#10b981; color:#fff; border:none; font-weight:700; padding:10px 14px; border-radius:8px; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.3);" title="Como instalar este módulo no seu Antigravity local">
                            🚀 Instalar no Antigravity
                        </button>
                    </div>
                </div>

                <!-- ABA 1: GERADOR DE PROMPTS -->
                <div id="secaoGeradorPromptPrincipal">
                    <div style="display:grid; grid-template-columns:1.1fr 0.9fr; gap:20px; align-items:start;">
                        
                        <!-- Coluna Esquerda: Formulário de Seleção e Entrada -->
                        <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:12px; padding:22px; box-shadow:var(--shadow);">
                            
                            <div style="font-size:15px; font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:8px; color:var(--text);">
                                <span>🎯</span> O que você deseja solicitar ao Agente?
                            </div>

                            <!-- SELETOR DE MODO PRINCIPAL: NOVO MÓDULO SEPARADO vs. MÓDULO EXISTENTE -->
                            <div style="background:var(--bg); border:1.5px solid var(--border); border-radius:10px; padding:6px; margin-bottom:18px; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                                <button type="button" id="btnModoNovoModulo" onclick="selecionarModoOperacao('novo_modulo')" style="padding:10px 12px; border-radius:8px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; transition:all 0.2s; background:#2563eb; color:#fff; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                                    <span>🚀 1. Criar NOVO MÓDULO Separado</span>
                                    <span style="font-size:10px; font-weight:500; opacity:0.85;">Fora dos existentes (Terceiros, PJ, etc.)</span>
                                </button>
                                <button type="button" id="btnModoModuloExistente" onclick="selecionarModoOperacao('modulo_existente')" style="padding:10px 12px; border-radius:8px; font-size:12.5px; font-weight:600; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; transition:all 0.2s; background:transparent; color:var(--text-light);">
                                    <span>🛠️ 2. Alterar Módulo Existente</span>
                                    <span style="font-size:10px; font-weight:500; opacity:0.75;">Treinamentos, Efetivo, GHE, SMS...</span>
                                </button>
                            </div>

                            <!-- ========================================================= -->
                            <!-- BLOCO A: MODO NOVO MÓDULO SEPARADO (FORA DOS EXISTENTES) -->
                            <!-- ========================================================= -->
                            <div id="blocoModoNovoModulo" style="display:block;">
                                
                                <div style="background:rgba(2,132,199,0.08); border:1.5px solid #38bdf8; border-radius:10px; padding:14px; margin-bottom:16px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                        <span style="font-size:13px; font-weight:700; color:#0284c7; display:flex; align-items:center; gap:6px;">
                                            <span>✨</span> Novo Módulo Independente &amp; Desacoplado
                                        </span>
                                        <span style="font-size:10px; background:#0284c7; color:#fff; padding:2px 8px; border-radius:12px; font-weight:700; text-transform:uppercase;">
                                            Fora dos Existentes
                                        </span>
                                    </div>
                                    <p style="margin:0; font-size:12px; color:var(--text); line-height:1.45;">
                                        Será gerada a arquitetura completa em um novo arquivo em <code>dashboard/modules/</code>, rota própria, botão no menu lateral e tabela dedicada no Supabase, <strong>sem inchar os arquivos existentes nem misturar cadastros</strong>.
                                    </p>
                                </div>

                                <!-- Modelos Prontos em 1 Clique -->
                                <div style="margin-bottom:14px;">
                                    <label style="display:block; font-size:11.5px; font-weight:700; color:var(--text); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">
                                        Modelos Rápidos (Clique para Carregar):
                                    </label>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                                        <button type="button" class="db-clear-btn" onclick="aplicarModeloNovoModulo('terceiros_artec')" style="padding:8px 10px; font-size:11px; font-weight:700; background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8; border-radius:6px; text-align:left; cursor:pointer;">
                                            🏢 Terceiros, PJ &amp; Mecânicos ARTEC
                                        </button>
                                        <button type="button" class="db-clear-btn" onclick="aplicarModeloNovoModulo('portaria_visitantes')" style="padding:8px 10px; font-size:11px; font-weight:600; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:6px; text-align:left; cursor:pointer;">
                                            🚪 Portaria &amp; Visitantes da Obra
                                        </button>
                                        <button type="button" class="db-clear-btn" onclick="aplicarModeloNovoModulo('higiene_ocupacional')" style="padding:8px 10px; font-size:11px; font-weight:600; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:6px; text-align:left; cursor:pointer;">
                                            🔊 Higiene Ocupacional (Ruído/Calor)
                                        </button>
                                        <button type="button" class="db-clear-btn" onclick="aplicarModeloNovoModulo('espaco_confinado')" style="padding:8px 10px; font-size:11px; font-weight:600; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:6px; text-align:left; cursor:pointer;">
                                            🕳️ Espaço Confinado &amp; PET (NR-33)
                                        </button>
                                    </div>
                                </div>

                                <!-- Campos de Especificação do Novo Módulo -->
                                <div style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:14px;">
                                    <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:10px; margin-bottom:10px;">
                                        <div>
                                            <label style="display:block; font-size:11.5px; font-weight:700; color:var(--text); margin-bottom:3px;">
                                                Nome do Novo Módulo *
                                            </label>
                                            <input type="text" id="novoModuloNome" value="Gestão de Terceiros, PJ &amp; Temporários" style="width:100%; padding:8px 10px; font-size:12.5px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text); font-weight:600;" oninput="aoDigitarNomeNovoModulo()">
                                        </div>
                                        <div>
                                            <label style="display:block; font-size:11.5px; font-weight:700; color:var(--text); margin-bottom:3px;">
                                                Grupo no Menu Lateral
                                            </label>
                                            <select id="novoModuloGrupo" style="width:100%; padding:8px 10px; font-size:12px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text); font-weight:600;" onchange="aoMudarParametrosPrompt()">
                                                <option value="pessoas">👥 Gestão de Pessoas</option>
                                                <option value="seguranca">🛡️ Segurança do Trabalho</option>
                                                <option value="gestao">📋 Gestão &amp; Administração</option>
                                                <option value="saude">🩺 Saúde Ocupacional</option>
                                                <option value="ambiente">🌱 Meio Ambiente</option>
                                                <option value="relatorios">📊 Relatórios</option>
                                                <option value="standalone">⚡ Barra Lateral Isolada</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                                        <div>
                                            <label style="display:block; font-size:11px; font-weight:700; color:var(--primary); margin-bottom:3px;">
                                                Novo Arquivo (Desacoplado)
                                            </label>
                                            <input type="text" id="novoModuloArquivo" value="dashboard/modules/terceiros_prestadores.js" style="width:100%; padding:6px 8px; font-size:11.5px; font-family:monospace; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);" oninput="aoMudarParametrosPrompt()">
                                        </div>
                                        <div>
                                            <label style="display:block; font-size:11px; font-weight:700; color:var(--primary); margin-bottom:3px;">
                                                Tabela Dedicada Supabase
                                            </label>
                                            <input type="text" id="novoModuloTabela" value="terceiros_prestadores" style="width:100%; padding:6px 8px; font-size:11.5px; font-family:monospace; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);" oninput="aoMudarParametrosPrompt()">
                                        </div>
                                    </div>

                                    <input type="hidden" id="novoModuloChave" value="terceiros">

                                    <!-- Alerta Crítico de Isolamento de Headcount CLT -->
                                    <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:6px; padding:10px 12px; font-size:11px; color:#92400e; line-height:1.45; display:flex; gap:8px;">
                                        <span style="font-size:16px;">⚠️</span>
                                        <div>
                                            <strong>Regra de Ouro da Obra (Headcount):</strong> Terceiros, mecânicos parceiros (ex: ARTEC) e prestadores PJ <strong>NUNCA</strong> devem ser gravados em <code>public.colaboradores_efetivo</code>. A tabela do efetivo próprio CLT da COP e os relatórios do RSA (Quadros 1 e 2 - ADA) permanecem 100% blindados.
                                        </div>
                                    </div>

                                    <div style="margin-top:8px; display:flex; justify-content:flex-end;">
                                        <button type="button" class="db-clear-btn" onclick="salvarNovoModuloDiretoNaBase()" style="padding:5px 10px; font-size:11px; font-weight:700; background:var(--card); color:var(--primary); border:1px solid var(--primary); border-radius:6px; cursor:pointer;" title="Registrar este módulo permanentemente na base de conhecimento">
                                            💾 Salvar este Módulo na Base de Aprendizagem
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- ========================================================= -->
                            <!-- BLOCO B: MODO MÓDULO EXISTENTE                            -->
                            <!-- ========================================================= -->
                            <div id="blocoModoModuloExistente" style="display:none;">
                                
                                <!-- 1. Intenção do Usuário -->
                                <div style="margin-bottom:14px;">
                                    <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">
                                        Ação no Módulo Existente:
                                    </label>
                                    <select id="promptSelectIntencao" class="db-select" style="width:100%; padding:9px 12px; font-size:13px; border-radius:8px; border:1.5px solid var(--border); background:var(--card); color:var(--text); font-weight:600;" onchange="aoMudarParametrosPrompt()">
                                    </select>
                                </div>

                                <!-- 2. Seleção de Módulo e Submódulo em Grid -->
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;" id="gridModuloESubmodulo">
                                    <div>
                                        <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">
                                            Módulo do Sistema:
                                        </label>
                                        <select id="promptSelectModulo" class="db-select" style="width:100%; padding:9px 12px; font-size:13px; border-radius:8px; border:1.5px solid var(--border); background:var(--card); color:var(--text); font-weight:600;" onchange="aoMudarModuloPrompt()">
                                        </select>
                                    </div>
                                    <div id="wrapSubmoduloSelecao">
                                        <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">
                                            Submódulo / Seção:
                                        </label>
                                        <select id="promptSelectSubmodulo" class="db-select" style="width:100%; padding:9px 12px; font-size:13px; border-radius:8px; border:1.5px solid var(--border); background:var(--card); color:var(--text); font-weight:600;" onchange="aoMudarParametrosPrompt()">
                                        </select>
                                    </div>
                                </div>

                                <!-- Cartão de Contexto do Módulo Selecionado -->
                                <div id="promptCardContextoModulo" style="background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 14px; margin-bottom:14px; font-size:12px; line-height:1.45;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                        <span style="font-weight:700; color:var(--primary);" id="ctxModuloArquivo">dashboard/modules/...</span>
                                        <span style="color:var(--text-light);" id="ctxModuloTabelas">Tabelas: ...</span>
                                    </div>
                                    <div style="color:var(--text);" id="ctxModuloDescricao">Descrição do submódulo...</div>
                                </div>
                            </div>

                            <!-- BANNER DE DETECÇÃO INTELIGENTE (se estiver em módulo existente e digitar sobre novo módulo/terceiros) -->
                            <div id="alertaDeteccaoNovoModulo" style="display:none; background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:10px 12px; margin-bottom:12px; align-items:center; justify-content:space-between; gap:10px;">
                                <div style="font-size:11.5px; color:#166534; line-height:1.4;">
                                    💡 <strong>Sugestão do Especialista:</strong> Sua descrição menciona <em>terceiros / PJ / novo módulo separado</em>. Deseja alternar para o <strong>Modo Novo Módulo Desacoplado</strong>?
                                </div>
                                <button type="button" class="db-apply-btn" onclick="selecionarModoOperacao('novo_modulo')" style="padding:6px 12px; font-size:11px; font-weight:700; white-space:nowrap;">
                                    🚀 Sim, Mudar
                                </button>
                            </div>

                            <!-- 3. Campo de Texto da Demanda -->
                            <div style="margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <label style="font-size:12px; font-weight:700; color:var(--text); text-transform:uppercase; letter-spacing:0.5px;" id="labelPromptDescricao">
                                        Instruções Detalhadas para o Agente de IA:
                                    </label>
                                    <button type="button" class="db-clear-btn" onclick="limparDescricaoPrompt()" style="padding:2px 8px; font-size:11px; font-weight:600;">
                                        Limpar
                                    </button>
                                </div>
                                <textarea id="promptDescricaoTexto" rows="6" placeholder="Explique com suas palavras o que precisa ser feito..." style="width:100%; padding:12px; font-size:13px; border-radius:8px; border:1.5px solid var(--border); background:var(--card); color:var(--text); font-family:inherit; resize:vertical; box-sizing:border-box; line-height:1.45;" oninput="aoDigitarDescricaoPrompt()"></textarea>
                            </div>

                            <!-- Botões de Exemplo Rápido / Atalhos -->
                            <div style="margin-bottom:16px;">
                                <div style="font-size:11px; font-weight:700; color:var(--text-light); text-transform:uppercase; margin-bottom:6px;" id="lblSugestoesContextuais">
                                    Sugestões Prontas para esta Demanda:
                                </div>
                                <div id="promptContainerExemplosRapidos" style="display:flex; flex-wrap:wrap; gap:6px;">
                                    <!-- Preenchido via JS -->
                                </div>
                            </div>

                            <!-- Botão de Disparo Principal -->
                            <div style="display:flex; gap:10px;">
                                <button type="button" class="db-apply-btn" onclick="executarGeracaoPrompt()" style="flex:1; padding:13px; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px;">
                                    <span>⚡</span> Gerar Prompt Especialista
                                </button>
                                <button type="button" class="db-clear-btn" onclick="preencherExemploDemonstracao()" title="Preencher com o caso de Terceiros e Mecânicos da ARTEC" style="padding:13px 16px; font-size:13px; font-weight:600;">
                                    🧪 Exemplo ARTEC
                                </button>
                            </div>
                        </div>

                        <!-- Coluna Direita: Prompt Gerado Pronto para Copiar -->
                        <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:12px; padding:22px; box-shadow:var(--shadow); display:flex; flex-direction:column; min-height:560px;">
                            
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                                <div style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
                                    <span>📋</span> Prompt Pronto para Colar no Agente
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span id="badgeTamanhoPrompt" style="font-size:11px; background:var(--bg); border:1px solid var(--border); padding:3px 8px; border-radius:6px; color:var(--text-light); font-weight:600;">0 palavras</span>
                                    <button type="button" class="db-apply-btn" id="btnCopiarPrompt" onclick="copiarPromptGerado()" style="padding:7px 14px; font-size:12.5px; font-weight:700; display:inline-flex; align-items:center; gap:6px; background:#10b981;">
                                        <i class="fas fa-copy"></i> Copiar Prompt
                                    </button>
                                </div>
                            </div>

                            <!-- Visualizador de Prompt Formatado -->
                            <div style="position:relative; flex:1; display:flex; flex-direction:column;">
                                <textarea id="promptResultadoGerado" readonly style="flex:1; width:100%; min-height:440px; padding:14px; font-size:12.5px; font-family:'Fira Code', 'Courier New', monospace; line-height:1.55; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); resize:none; box-sizing:border-box; white-space:pre-wrap;"></textarea>
                                
                                <!-- Toast de Notificação de Cópia -->
                                <div id="toastCopiadoSucesso" style="display:none; position:absolute; bottom:20px; right:20px; background:#065f46; color:#fff; padding:10px 18px; border-radius:8px; font-size:13px; font-weight:700; box-shadow:0 8px 20px rgba(0,0,0,0.25); align-items:center; gap:8px; z-index:10;">
                                    <span>✅</span> Prompt copiado! Cole no chat do Agente de IA.
                                </div>
                            </div>

                            <div style="margin-top:12px; font-size:11.5px; color:var(--text-light); display:flex; justify-content:space-between; align-items:center;">
                                <span>🔒 Blindado com regras de ouro, caminhos de arquivo e NRs aplicáveis.</span>
                                <span style="font-weight:600; color:var(--primary);">PISF Ramal do Agreste</span>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- ABA 2: BASE DE CONHECIMENTO & APRENDIZAGEM -->
                <div id="secaoBaseConhecimento" style="display:none;">
                    <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:12px; padding:24px; box-shadow:var(--shadow);">
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
                            <div>
                                <h3 style="margin:0; font-size:17px; font-weight:700; color:var(--text);">🧠 Base de Conhecimento Arquitetural do Sistema</h3>
                                <p style="margin:3px 0 0 0; font-size:12px; color:var(--text-light);">
                                    O gerador utiliza este mapeamento para alimentar o agente com os nomes exatos de arquivos, funções âncora e tabelas.
                                </p>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button type="button" class="db-apply-btn" onclick="abrirModalEnsinarConhecimento()" style="padding:8px 14px; font-size:12.5px; font-weight:700;">
                                    ➕ Ensinar Novo Conhecimento
                                </button>
                                <button type="button" class="db-clear-btn" onclick="exportarBaseConhecimento()" style="padding:8px 12px; font-size:12px; font-weight:600;">
                                    💾 Exportar JSON
                                </button>
                                <button type="button" class="db-clear-btn" onclick="abrirModalImportarBase()" style="padding:8px 12px; font-size:12px; font-weight:600;">
                                    📥 Importar JSON
                                </button>
                                <button type="button" class="db-clear-btn" onclick="restaurarPadroesConhecimento()" style="padding:8px 12px; font-size:12px; color:var(--danger); border-color:var(--danger); font-weight:600;">
                                    🔄 Restaurar Padrões
                                </button>
                            </div>
                        </div>

                        <!-- Filtro de Módulos da Base -->
                        <div style="margin-bottom:18px;">
                            <input type="text" id="filtroConhecimentoInput" placeholder="Buscar por módulo, função, tabela Supabase ou NR..." style="width:100%; padding:10px 14px; font-size:13px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text);" oninput="filtrarListaConhecimentos()">
                        </div>

                        <!-- Lista de Módulos Renderizados -->
                        <div id="containerCardsConhecimento" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:16px;">
                            <!-- Preenchido via JS -->
                        </div>

                    </div>
                </div>

            </div>

            <!-- MODAL: ENSINAR NOVO CONHECIMENTO AO SISTEMA -->
            <div id="modalEnsinarConhecimento" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:10000; align-items:center; justify-content:center; padding:16px;">
                <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:14px; width:100%; max-width:540px; padding:24px; box-shadow:0 12px 35px rgba(0,0,0,0.3); box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px;">
                        <div style="font-size:16px; font-weight:700; color:var(--text);">🧠 Ensinar Novo Conhecimento / Submódulo</div>
                        <button class="db-clear-btn" onclick="fecharModalEnsinarConhecimento()" style="padding:4px 8px;">✕</button>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:4px;">Módulo Alvo *</label>
                            <select id="ensinarSelectModulo" class="db-select" style="width:100%; padding:8px 10px; font-size:13px; border:1px solid var(--border); border-radius:6px; background:var(--card); color:var(--text);">
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:4px;">Nome do Novo Submódulo ou Rotina *</label>
                            <input type="text" id="ensinarNomeSubmodulo" placeholder="Ex: Matriz de Calor e IBUTG (NR-09/NR-15)" style="width:100%; padding:8px 10px; font-size:13px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:4px;">Descrição e Regra de Negócio SST *</label>
                            <textarea id="ensinarDescricaoRegra" rows="3" placeholder="Explique como essa rotina funciona e qual a regra normativa aplicável..." style="width:100%; padding:8px 10px; font-size:13px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);"></textarea>
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:4px;">Funções Existentes no Código (separadas por vírgula)</label>
                            <input type="text" id="ensinarFuncoesChave" placeholder="Ex: calcularIbutgLocal, renderTermometroEstresse" style="width:100%; padding:8px 10px; font-size:13px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; font-weight:700; color:var(--text); margin-bottom:4px;">Tabelas Supabase Relacionadas (separadas por vírgula)</label>
                            <input type="text" id="ensinarTabelasSupabase" placeholder="Ex: medicao_calor_ibutg, ghe_catalogo" style="width:100%; padding:8px 10px; font-size:13px; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text);">
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; border-top:1px solid var(--border); padding-top:12px;">
                            <button type="button" class="db-clear-btn" onclick="fecharModalEnsinarConhecimento()" style="padding:9px 14px;">Cancelar</button>
                            <button type="button" class="db-apply-btn" onclick="salvarNovoConhecimentoEnsinado()" style="padding:9px 18px; font-weight:700;">💾 Salvar Aprendizado</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL: IMPORTAR BASE JSON -->
            <div id="modalImportarBaseConhecimento" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:10000; align-items:center; justify-content:center; padding:16px;">
                <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:14px; width:100%; max-width:500px; padding:24px; box-shadow:0 12px 35px rgba(0,0,0,0.3); box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px;">
                        <div style="font-size:16px; font-weight:700; color:var(--text);">📥 Importar Base de Conhecimento</div>
                        <button class="db-clear-btn" onclick="fecharModalImportarBase()" style="padding:4px 8px;">✕</button>
                    </div>
                    <p style="font-size:12.5px; color:var(--text-light); margin-bottom:12px; line-height:1.4;">
                        Cole abaixo o conteúdo JSON exportado anteriormente para sincronizar ou restaurar novos conhecimentos aprendidos.
                    </p>
                    <textarea id="importarBaseJsonTexto" rows="8" placeholder="Cole o JSON da base aqui..." style="width:100%; padding:10px; font-size:12px; font-family:monospace; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--bg); color:var(--text);"></textarea>
                    
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                        <button type="button" class="db-clear-btn" onclick="fecharModalImportarBase()" style="padding:8px 14px;">Cancelar</button>
                        <button type="button" class="db-apply-btn" onclick="processarImportacaoBaseJson()" style="padding:8px 16px; font-weight:700;">Importar e Mesclar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL: COMO INSTALAR NO ANTIGRAVITY -->
            <div id="modalInstalacaoAntigravity" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:10000; align-items:center; justify-content:center; padding:16px;">
                <div style="background:var(--card, #fff); border:1px solid var(--border); border-radius:14px; width:100%; max-width:620px; padding:24px; box-shadow:0 12px 40px rgba(0,0,0,0.35); box-sizing:border-box;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px;">
                        <div style="font-size:16px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px;">
                            <span>🚀</span> Como Instalar no seu Antigravity Local
                        </div>
                        <button class="db-clear-btn" onclick="fecharModalInstalacaoAntigravity()" style="padding:4px 8px;">✕</button>
                    </div>
                    
                    <p style="font-size:12.5px; color:var(--text); line-height:1.5; margin:0 0 14px 0;">
                        Para levar este <strong>Gerador de Prompts Especialista</strong> para o seu repositório local com o Antigravity, execute apenas estes <strong>2 passos simples</strong>:
                    </p>

                    <!-- Passo 1 -->
                    <div style="background:var(--bg); border:1.5px solid var(--border); border-radius:8px; padding:12px; margin-bottom:12px;">
                        <div style="font-weight:700; font-size:12.5px; color:#2563eb; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                            <span>1️⃣</span> Passo 1: Baixar o arquivo do módulo
                        </div>
                        <div style="font-size:11.5px; color:var(--text-light); margin-bottom:8px; line-height:1.4;">
                            Clique no botão abaixo para baixar o arquivo <code>gerador_prompts.js</code> e salve-o na pasta <code>dashboard/modules/</code> do seu projeto:
                        </div>
                        <button type="button" class="db-apply-btn" onclick="baixarArquivoGeradorPrompts()" style="padding:8px 14px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
                            <span>📥</span> Baixar gerador_prompts.js
                        </button>
                    </div>

                    <!-- Passo 2 -->
                    <div style="background:var(--bg); border:1.5px solid var(--border); border-radius:8px; padding:12px; margin-bottom:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <div style="font-weight:700; font-size:12.5px; color:#2563eb; display:flex; align-items:center; gap:6px;">
                                <span>2️⃣</span> Passo 2: Copiar a instrução para o Antigravity
                            </div>
                            <button type="button" class="db-apply-btn" onclick="copiarInstrucaoAntigravity()" id="btnCopiarInstrucaoAntigravityModal" style="padding:4px 10px; font-size:11px; font-weight:700; background:#10b981;">
                                📋 Copiar Instrução
                            </button>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-light); margin-bottom:8px; line-height:1.4;">
                            Cole a instrução abaixo no chat do Antigravity para ele registrar o menu, o script e a rota dupla sem tela em branco:
                        </div>
                        <textarea id="textoInstrucaoAntigravityModal" readonly rows="7" style="width:100%; padding:8px 10px; font-size:11px; font-family:monospace; border:1px solid var(--border); border-radius:6px; box-sizing:border-box; background:var(--card); color:var(--text); line-height:1.4; resize:none;"></textarea>
                    </div>

                    <div style="display:flex; justify-content:flex-end;">
                        <button type="button" class="db-clear-btn" onclick="fecharModalInstalacaoAntigravity()" style="padding:8px 16px; font-weight:600;">Fechar</button>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 6. CONTROLADORES DE EVENTO & POPULAÇÃO DE CAMPOS
    // =========================================================================
    function popularSelectIntencoes() {
        const sel = document.getElementById('promptSelectIntencao');
        if (!sel) return;
        sel.innerHTML = INTENCOES_DISPONIVEIS.map(i => `
            <option value="${i.id}">${i.label}</option>
        `).join('');
    }

    function popularSelectModulos() {
        const sel = document.getElementById('promptSelectModulo');
        if (!sel) return;
        const modulos = gerenciadorConhecimento.dados.modulos || [];
        
        let html = `<option value="__novo_modulo__" style="font-weight:700; color:#2563eb; background:#eff6ff;">✨ [+ CRIAR NOVO MÓDULO INDEPENDENTE]</option>`;
        html += modulos.map(m => `
            <option value="${m.id}">${m.icone} ${m.nome}</option>
        `).join('');
        
        sel.innerHTML = html;

        const qtdSpan = document.getElementById('qtdModulosCadastrados');
        if (qtdSpan) qtdSpan.textContent = String(modulos.length);
    }

    function atualizarSelectSubmodulos() {
        const selIntencao = document.getElementById('promptSelectIntencao');
        const selModulo = document.getElementById('promptSelectModulo');
        const selSub = document.getElementById('promptSelectSubmodulo');
        const wrapSub = document.getElementById('wrapSubmoduloSelecao');
        const blocoNovo = document.getElementById('blocoNovoModuloConfig');
        if (!selModulo || !selSub) return;

        const modId = selModulo.value;
        const intencaoId = selIntencao ? selIntencao.value : '';
        const ehNovoModulo = (intencaoId === 'novo_modulo_completo') || (modId === '__novo_modulo__');

        if (ehNovoModulo) {
            if (blocoNovo) blocoNovo.style.display = 'block';
            if (wrapSub) wrapSub.style.display = 'none';

            // Garante que o input de nome tenha sugestão inicial se vazio
            const inputNome = document.getElementById('novoModuloNome');
            if (inputNome && !inputNome.value) {
                inputNome.value = 'Gestão de Terceiros, PJ & Temporários';
                aoDigitarNomeNovoModulo();
            }
            atualizarContextoModulo();
            return;
        }

        if (blocoNovo) blocoNovo.style.display = 'none';
        if (wrapSub) wrapSub.style.display = 'block';

        const mod = gerenciadorConhecimento.dados.modulos.find(m => m.id === modId);
        if (!mod || !mod.submodulos || mod.submodulos.length === 0) {
            selSub.innerHTML = `<option value="geral">Geral do Módulo</option>`;
            atualizarContextoModulo();
            return;
        }

        selSub.innerHTML = mod.submodulos.map(s => `
            <option value="${s.id}">${s.nome}</option>
        `).join('');

        atualizarContextoModulo();
    }

    function atualizarContextoModulo() {
        const selIntencao = document.getElementById('promptSelectIntencao');
        const selModulo = document.getElementById('promptSelectModulo');
        const selSub = document.getElementById('promptSelectSubmodulo');
        const lblDesc = document.getElementById('labelPromptDescricao');
        const ctxArquivo = document.getElementById('ctxModuloArquivo');
        const ctxTabelas = document.getElementById('ctxModuloTabelas');
        const ctxDesc = document.getElementById('ctxModuloDescricao');
        if (!selModulo) return;

        const modId = selModulo.value;
        const intencaoId = selIntencao ? selIntencao.value : '';
        const ehNovoModulo = (intencaoId === 'novo_modulo_completo') || (modId === '__novo_modulo__');

        if (ehNovoModulo) {
            const nomeNovo = document.getElementById('novoModuloNome')?.value.trim() || 'Gestão de Terceiros';
            const arqNovo = document.getElementById('novoModuloArquivo')?.value.trim() || 'dashboard/modules/terceiros_prestadores.js';
            const tabNovo = document.getElementById('novoModuloTabela')?.value.trim() || 'terceiros_prestadores';
            const grpNovo = document.getElementById('novoModuloGrupo')?.value || 'pessoas';

            if (ctxArquivo) ctxArquivo.textContent = `📁 Novo Arquivo: ${arqNovo}`;
            if (ctxTabelas) ctxTabelas.textContent = `Tabela Própria: public.${tabNovo} (isolada)`;
            if (ctxDesc) ctxDesc.textContent = `Módulo independente e desacoplado no menu "${grpNovo}". Não interfere na contagem de colaboradores_efetivo da COP.`;
            if (lblDesc) lblDesc.textContent = `4. O que você pretende implementar no NOVO MÓDULO "${nomeNovo}":`;
            return;
        }

        const mod = gerenciadorConhecimento.dados.modulos.find(m => m.id === modId);
        if (!mod) return;

        const sub = (mod.submodulos || []).find(s => s.id === (selSub ? selSub.value : '')) || {
            nome: 'Geral',
            descricao: mod.descricao,
            tabelasSupabase: []
        };

        if (ctxArquivo) ctxArquivo.textContent = `📁 ${mod.arquivoPrincipal}`;
        if (ctxTabelas) {
            const tabs = (sub.tabelasSupabase || []).join(', ') || 'Nenhuma';
            ctxTabelas.textContent = `Tabelas: ${tabs}`;
        }
        if (ctxDesc) {
            ctxDesc.textContent = sub.descricao || mod.descricao;
        }

        if (lblDesc) {
            lblDesc.textContent = `4. O que você pretende alterar ou incluir em: ${mod.nome}, ${sub.nome}`;
        }
    }

    function atualizarExemplosSugeridos() {
        const container = document.getElementById('promptContainerExemplosRapidos');
        const selIntencao = document.getElementById('promptSelectIntencao');
        const selModulo = document.getElementById('promptSelectModulo');
        const lblSugestoes = document.getElementById('lblSugestoesContextuais');
        if (!container || !selModulo) return;

        const modId = selModulo.value;
        const intencaoId = selIntencao ? selIntencao.value : '';
        const ehNovoModulo = (intencaoId === 'novo_modulo_completo') || (modId === '__novo_modulo__');

        const sugestoes = [];

        if (ehNovoModulo) {
            if (lblSugestoes) lblSugestoes.textContent = 'Modelos de Novos Módulos Prontos para Gerar:';
            sugestoes.push({
                rotulo: '🏢 Gestão de Terceiros, PJ & Mecânicos (ARTEC)',
                nome: 'Gestão de Terceiros, PJ & Temporários',
                arquivo: 'dashboard/modules/terceiros_prestadores.js',
                tabela: 'terceiros_prestadores',
                grupo: 'pessoas',
                texto: 'Implementar um módulo de Gestão de Terceiros e PJ. Na obra temos 02 mecânicos da empresa ARTEC que realizam manutenção de máquinas e veículos, além de 02 profissionais contratados como PJ. Não podemos contabilizá-los em colaboradores_efetivo da COP para não alterar o número oficial de colaboradores e relatórios do RSA. O módulo precisa cadastrar essas empresas parceiras, os profissionais terceiros com identificação de empresa, função, data de integração e controle de validade de ASO e treinamentos específicos.'
            });
            sugestoes.push({
                rotulo: '🚪 Portaria, Acesso & Visitantes da Obra',
                nome: 'Portaria & Visitantes',
                arquivo: 'dashboard/modules/portaria_visitantes.js',
                tabela: 'portaria_acessos',
                grupo: 'seguranca',
                texto: 'Criar módulo para controle de entrada e saída de visitantes, fiscais e prestadores temporários na portaria do canteiro de Arcoverde, com termo de integração de segurança assinado e registro de horário.'
            });
            sugestoes.push({
                rotulo: '🔊 Higiene Ocupacional & Dosimetria (NHO-01)',
                nome: 'Higiene Ocupacional & Medições',
                arquivo: 'dashboard/modules/higiene_ocupacional.js',
                tabela: 'higiene_medicoes',
                grupo: 'seguranca',
                texto: 'Criar módulo de registros de dosimetrias de ruído, calor (IBUTG) e poeiras minerais por frente e GHE com laudo técnico para compor o inventário do PGR.'
            });
            sugestoes.push({
                rotulo: '🕳️ Espaço Confinado & Emissão de PET (NR-33)',
                nome: 'Espaço Confinado & PET (NR-33)',
                arquivo: 'dashboard/modules/espaco_confinado_nr33.js',
                tabela: 'espaco_confinado_pet',
                grupo: 'seguranca',
                texto: 'Módulo para emissão e encerramento de Permissões de Entrada e Trabalho (PET) em tubulações e caixas d\'água do Ramal do Agreste com equipe de resgate e vigia designados.'
            });
        } else {
            if (lblSugestoes) lblSugestoes.textContent = 'Sugestões Prontas para este Módulo:';
            if (modId === 'treinamentos_ddsma') {
                sugestoes.push({ rotulo: '➕ Adicionar campo Carga Horária Prática/Teórica no Catálogo', texto: 'Incluir distinção de carga horária teórica e prática no modal de cadastro do curso em treinamentos_catalogo e exibir na listagem.' });
                sugestoes.push({ rotulo: '🐛 Corrigir soma de horas no histórico do colaborador', texto: 'Identificar por que a somatória total de horas de treinamento concluídas no perfil do colaborador não está considerando treinamentos com status Concluído.' });
                sugestoes.push({ rotulo: '🖨️ Ajustar layout de impressão do certificado FOR.001.R00', texto: 'Ajustar o cabeçalho e posicionamento das assinaturas do instrutor e colaborador na emissão do certificado via abrirDocumentoHtmlParaImpressao.' });
            } else if (modId === 'efetivo_ferias') {
                sugestoes.push({ rotulo: '🔄 Sincronizar desligamento em efetivo e checklist', texto: 'Garantir que ao marcar colaborador como Demitido em colaboradores_efetivo, o registro seja atualizado simultaneamente em colaboradores_checklist com ativo=false.' });
                sugestoes.push({ rotulo: '⚠️ Alerta de dobro de férias (22 meses CLT)', texto: 'Destacar em alerta vermelho colaboradores com mais de 22 meses trabalhados sem concessão de férias no painel de gestão de pessoas.' });
            } else if (modId === 'ghe_os') {
                sugestoes.push({ rotulo: '📄 Adicionar campo de Matrícula e CPF na OS impressa', texto: 'Garantir que na emissão da Ordem de Serviço (NR-01) o cabeçalho inclua a matrícula, CPF, data de admissão e setor do colaborador.' });
                sugestoes.push({ rotulo: '🛡️ Ajustar cálculo de risco AIHA (Severidade x Probabilidade)', texto: 'Revisar a matriz matricial 5x5 de AIHA para que risco crítico (nível 5) obrigue preenchimento de medidas de engenharia na seção 16.' });
            } else if (modId === 'saude_psicossocial') {
                sugestoes.push({ rotulo: '🩺 Baixa de ASO em lote com nova validade', texto: 'Criar rotina no modal de mutirão para dar baixa em múltiplos colaboradores selecionados, recalculando a próxima validade (12 ou 24 meses conforme NR-07).' });
                sugestoes.push({ rotulo: '📊 Relatório Analítico Anual do PCMSO (NR-07 7.6.2)', texto: 'Emitir minuta do relatório anual estatístico de exames clínicos por GHE e parecer conclusivo do médico coordenador.' });
            } else {
                sugestoes.push({ rotulo: '➕ Adicionar novo filtro na listagem', texto: 'Adicionar filtro por status e data de competência na visualização dos registros com atualização automática do grid.' });
                sugestoes.push({ rotulo: '🐛 Tratar erro de retorno nulo do Supabase', texto: 'Adicionar verificação defensiva para evitar erro de console caso a consulta retorne array vazio ou erro de rede.' });
            }
        }

        container.innerHTML = sugestoes.map((s, idx) => `
            <button type="button" class="db-clear-btn" onclick="aplicarExemploSugerido(${idx})" style="font-size:11.5px; padding:5px 10px; border-radius:6px; background:var(--bg); border:1px solid var(--border); text-align:left; cursor:pointer;" title="${s.texto}">
                ${s.rotulo}
            </button>
        `).join('');

        window._sstSugestoesAtuais = sugestoes;
    }

    // =========================================================================
    // 7. AÇÕES DO USUÁRIO & MANIPULAÇÃO DINÂMICA
    // =========================================================================
    window._modoOperacaoGerador = 'novo_modulo';

    function selecionarModoOperacao(modo) {
        window._modoOperacaoGerador = modo;

        const btnNovo = document.getElementById('btnModoNovoModulo');
        const btnExistente = document.getElementById('btnModoModuloExistente');
        const blocoNovo = document.getElementById('blocoModoNovoModulo');
        const blocoExistente = document.getElementById('blocoModoModuloExistente');
        const lblDesc = document.getElementById('labelPromptDescricao');
        const alertaDetect = document.getElementById('alertaDeteccaoNovoModulo');

        if (alertaDetect) alertaDetect.style.display = 'none';

        if (modo === 'novo_modulo') {
            if (btnNovo) {
                btnNovo.style.background = '#2563eb';
                btnNovo.style.color = '#fff';
                btnNovo.style.boxShadow = '0 2px 6px rgba(37,99,235,0.3)';
            }
            if (btnExistente) {
                btnExistente.style.background = 'transparent';
                btnExistente.style.color = 'var(--text-light)';
                btnExistente.style.boxShadow = 'none';
            }
            if (blocoNovo) blocoNovo.style.display = 'block';
            if (blocoExistente) blocoExistente.style.display = 'none';

            if (lblDesc) {
                lblDesc.textContent = 'Instruções Detalhadas para o Novo Módulo:';
            }

            // Garante que os inputs do novo módulo tenham valores válidos
            const inputNome = document.getElementById('novoModuloNome');
            if (inputNome && !inputNome.value) {
                inputNome.value = 'Gestão de Terceiros, PJ & Temporários';
            }
            aoDigitarNomeNovoModulo();

            // Sugestões para novo módulo
            atualizarExemplosSugeridos();
        } else {
            if (btnExistente) {
                btnExistente.style.background = '#2563eb';
                btnExistente.style.color = '#fff';
                btnExistente.style.boxShadow = '0 2px 6px rgba(37,99,235,0.3)';
            }
            if (btnNovo) {
                btnNovo.style.background = 'transparent';
                btnNovo.style.color = 'var(--text-light)';
                btnNovo.style.boxShadow = 'none';
            }
            if (blocoNovo) blocoNovo.style.display = 'none';
            if (blocoExistente) blocoExistente.style.display = 'block';

            if (lblDesc) {
                lblDesc.textContent = 'Instruções para Alterar ou Incluir no Módulo:';
            }

            atualizarSelectSubmodulos();
            atualizarExemplosSugeridos();
        }

        executarGeracaoPrompt();
    };

    function aplicarModeloNovoModulo(tipo) {
        selecionarModoOperacao('novo_modulo');

        const inputNome = document.getElementById('novoModuloNome');
        const arqInput = document.getElementById('novoModuloArquivo');
        const tabInput = document.getElementById('novoModuloTabela');
        const grpInput = document.getElementById('novoModuloGrupo');
        const txt = document.getElementById('promptDescricaoTexto');

        if (tipo === 'terceiros_artec') {
            if (inputNome) inputNome.value = 'Gestão de Terceiros, PJ & Temporários';
            if (arqInput) arqInput.value = 'dashboard/modules/terceiros_prestadores.js';
            if (tabInput) tabInput.value = 'terceiros_prestadores';
            if (grpInput) grpInput.value = 'pessoas';
            if (txt) {
                txt.value = 'Implementar um módulo de Gestão de Terceiros e PJ.\n\n' +
                    'Atualmente na obra temos 02 mecânicos da empresa parceira ARTEC (que fornece máquinas e veículos e realiza as manutenções preventivas e corretivas) e mais 02 prestadores na modalidade de PJ (pessoa jurídica).\n\n' +
                    'Hoje não contabilizamos nenhum desses prestadores no sistema porque qualquer inclusão em colaboradores_efetivo altera o headcount CLT da COP, as estatísticas de HHT e os relatórios de Mão de Obra Local (RSA - Quadros 1 e 2 - ADA).\n\n' +
                    'A criação deste módulo separado é essencial para termos controle de segurança na obra sem distorcer o efetivo próprio:\n' +
                    '1. Cadastro de empresas parceiras (ex: ARTEC) e prestadores PJ.\n' +
                    '2. Ficha do terceiro com identificação explícita de empresa parceira, tipo de vínculo (Mecânico, PJ, Temporário), função e frente de trabalho.\n' +
                    '3. Controle rigoroso de integração de segurança inicial, validade de ASO e treinamentos obrigatórios (ex: NR-12 para mecânicos, NR-35 se aplicável).\n' +
                    '4. Emissão de crachá / ficha de integração via abrirDocumentoHtmlParaImpressao.\n' +
                    '5. Alertas visuais de ASO ou integração a vencer em 30 dias.';
            }
        } else if (tipo === 'portaria_visitantes') {
            if (inputNome) inputNome.value = 'Portaria & Visitantes da Obra';
            if (arqInput) arqInput.value = 'dashboard/modules/portaria_visitantes.js';
            if (tabInput) tabInput.value = 'portaria_acessos';
            if (grpInput) grpInput.value = 'seguranca';
            if (txt) {
                txt.value = 'Criar módulo para controle de entrada e saída de visitantes, fiscais e prestadores temporários na portaria do canteiro de Arcoverde, com termo de integração de segurança assinado, crachá provisório e registro de horários.';
            }
        } else if (tipo === 'higiene_ocupacional') {
            if (inputNome) inputNome.value = 'Higiene Ocupacional & Medições';
            if (arqInput) arqInput.value = 'dashboard/modules/higiene_ocupacional.js';
            if (tabInput) tabInput.value = 'higiene_medicoes';
            if (grpInput) grpInput.value = 'seguranca';
            if (txt) {
                txt.value = 'Criar módulo de registros de dosimetrias de ruído (NHO-01), calor (IBUTG - NHO-06) e poeiras minerais por frente e GHE com laudo técnico para compor o inventário do PGR.';
            }
        } else if (tipo === 'espaco_confinado') {
            if (inputNome) inputNome.value = 'Espaço Confinado & PET (NR-33)';
            if (arqInput) arqInput.value = 'dashboard/modules/espaco_confinado_nr33.js';
            if (tabInput) tabInput.value = 'espaco_confinado_pet';
            if (grpInput) grpInput.value = 'seguranca';
            if (txt) {
                txt.value = 'Módulo para emissão e encerramento de Permissões de Entrada e Trabalho (PET) em tubulações e caixas d\'água do Ramal do Agreste com equipe de resgate e vigia designados conforme NR-33.';
            }
        }

        aoDigitarNomeNovoModulo();
        aoDigitarDescricaoPrompt();
        executarGeracaoPrompt();
    };

    function aoMudarParametrosPrompt() {
        const selInt = document.getElementById('promptSelectIntencao');
        const selMod = document.getElementById('promptSelectModulo');

        if (selInt && selInt.value === 'novo_modulo_completo') {
            selecionarModoOperacao('novo_modulo');
            return;
        }

        atualizarSelectSubmodulos();
        atualizarExemplosSugeridos();
        executarGeracaoPrompt();
    };

    function aoMudarModuloPrompt() {
        const selMod = document.getElementById('promptSelectModulo');

        if (selMod && selMod.value === '__novo_modulo__') {
            selecionarModoOperacao('novo_modulo');
            return;
        }

        atualizarSelectSubmodulos();
        atualizarExemplosSugeridos();
        executarGeracaoPrompt();
    };

    function aoDigitarNomeNovoModulo() {
        const inputNome = document.getElementById('novoModuloNome');
        if (!inputNome) return;
        const nome = inputNome.value.trim();
        const slug = gerarSlug(nome);

        const arqInput = document.getElementById('novoModuloArquivo');
        const tabInput = document.getElementById('novoModuloTabela');
        const chvInput = document.getElementById('novoModuloChave');

        if (arqInput) arqInput.value = `dashboard/modules/${slug}.js`;
        if (tabInput) tabInput.value = slug;
        if (chvInput) chvInput.value = slug.slice(0, 20);

        atualizarContextoModulo();
    };

    function aoDigitarDescricaoPrompt() {
        const txt = document.getElementById('promptDescricaoTexto')?.value || '';
        const badge = document.getElementById('badgeTamanhoPrompt');
        if (badge) {
            const palavras = txt.trim().split(/\s+/).filter(Boolean).length;
            badge.textContent = `${palavras} palavras na demanda`;
        }

        // Detecção inteligente: se o usuário estiver em "módulo existente" mas digitando sobre novo módulo / terceiros / PJ
        const alerta = document.getElementById('alertaDeteccaoNovoModulo');
        if (alerta) {
            const modoAtual = window._modoOperacaoGerador || 'novo_modulo';
            const textoBaixo = txt.toLowerCase();
            const termosNovoModulo = ['novo modulo', 'novo módulo', 'terceir', 'pj ', 'pessoa juridica', 'pessoa jurídica', 'fora dos existente', 'modulo separado', 'módulo separado', 'artec'];
            const temTermo = termosNovoModulo.some(t => textoBaixo.includes(t));

            if (modoAtual === 'modulo_existente' && temTermo) {
                alerta.style.display = 'flex';
            } else {
                alerta.style.display = 'none';
            }
        }
    };

    function limparDescricaoPrompt() {
        const textarea = document.getElementById('promptDescricaoTexto');
        if (textarea) {
            textarea.value = '';
            textarea.focus();
            aoDigitarDescricaoPrompt();
            executarGeracaoPrompt();
        }
    };

    function aplicarExemploSugerido(idx) {
        if (!window._sstSugestoesAtuais || !window._sstSugestoesAtuais[idx]) return;
        const item = window._sstSugestoesAtuais[idx];

        if (item.nome) {
            const inputNome = document.getElementById('novoModuloNome');
            const arqInput = document.getElementById('novoModuloArquivo');
            const tabInput = document.getElementById('novoModuloTabela');
            const grpInput = document.getElementById('novoModuloGrupo');
            if (inputNome) inputNome.value = item.nome;
            if (arqInput && item.arquivo) arqInput.value = item.arquivo;
            if (tabInput && item.tabela) tabInput.value = item.tabela;
            if (grpInput && item.grupo) grpInput.value = item.grupo;
            aoDigitarNomeNovoModulo();
        }

        const textarea = document.getElementById('promptDescricaoTexto');
        if (textarea) {
            textarea.value = item.texto;
            textarea.focus();
            aoDigitarDescricaoPrompt();
            executarGeracaoPrompt();
        }
    };

    function preencherExemploDemonstracao() {
        aplicarModeloNovoModulo('terceiros_artec');
    };

    function executarGeracaoPrompt() {
        const selInt = document.getElementById('promptSelectIntencao');
        const selMod = document.getElementById('promptSelectModulo');
        const selSub = document.getElementById('promptSelectSubmodulo');
        const txt = document.getElementById('promptDescricaoTexto');
        const resultadoTextarea = document.getElementById('promptResultadoGerado');
        const badge = document.getElementById('badgeTamanhoPrompt');

        if (!resultadoTextarea) return;

        const modo = window._modoOperacaoGerador || 'novo_modulo';
        const intencaoId = (modo === 'novo_modulo') ? 'novo_modulo_completo' : (selInt ? selInt.value : 'inclusao_funcao');
        const moduloId = (modo === 'novo_modulo') ? '__novo_modulo__' : (selMod ? selMod.value : '__novo_modulo__');
        const submoduloId = selSub ? selSub.value : '';
        const descricaoUsuario = txt ? txt.value : '';

        const promptFinal = construirPromptCompleto({
            intencaoId,
            moduloId,
            submoduloId,
            descricaoUsuario
        });

        resultadoTextarea.value = promptFinal;

        const palavrasTotais = promptFinal.split(/\s+/).filter(Boolean).length;
        const tokensAprox = Math.round(palavrasTotais * 1.35);
        if (badge) {
            badge.textContent = `~${tokensAprox} tokens (${palavrasTotais} palavras)`;
        }

        salvarNoHistoricoPrompts({
            dataHora: new Date().toISOString(),
            intencaoId,
            moduloId,
            submoduloId,
            resumo: descricaoUsuario.slice(0, 80)
        });
    };

    function copiarPromptGerado() {
        const resultadoTextarea = document.getElementById('promptResultadoGerado');
        const toast = document.getElementById('toastCopiadoSucesso');
        const btn = document.getElementById('btnCopiarPrompt');

        if (!resultadoTextarea || !resultadoTextarea.value.trim()) {
            executarGeracaoPrompt();
        }

        const texto = resultadoTextarea ? resultadoTextarea.value : '';
        if (!texto) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(exibirFeedback).catch(fallbackCopiar);
        } else {
            fallbackCopiar();
        }

        function fallbackCopiar() {
            resultadoTextarea.select();
            document.execCommand('copy');
            exibirFeedback();
        }

        function exibirFeedback() {
            if (btn) {
                const htmlAntigo = btn.innerHTML;
                btn.innerHTML = '<span>✅</span> Copiado!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.innerHTML = htmlAntigo;
                    btn.style.background = '#10b981';
                }, 2500);
            }
            if (toast) {
                toast.style.display = 'flex';
                setTimeout(() => {
                    toast.style.display = 'none';
                }, 3000);
            }
        }
    };

    function salvarNovoModuloDiretoNaBase() {
        const nome = document.getElementById('novoModuloNome')?.value.trim();
        if (!nome) {
            alert('Por favor, informe o Nome do Novo Módulo antes de salvar.');
            return;
        }
        const arquivo = document.getElementById('novoModuloArquivo')?.value.trim() || 'dashboard/modules/novo_modulo.js';
        const tabela = document.getElementById('novoModuloTabela')?.value.trim() || 'terceiros_prestadores';
        const chave = document.getElementById('novoModuloChave')?.value.trim() || gerarSlug(nome);

        const novoMod = {
            id: chave,
            nome: nome.toUpperCase(),
            icone: '🚀',
            arquivoPrincipal: arquivo,
            arquivosRelacionados: ['dashboard/dashboard.js', 'dashboard/index.html', 'dashboard/modules/epi_estoque.js', 'dashboard/MAPA_MODULOS.md'],
            descricao: `Módulo independente de ${nome} com tabela dedicada public.${tabela}.`,
            submodulos: [
                {
                    id: chave + '_cadastro',
                    nome: 'Cadastro e Listagem Geral',
                    descricao: `Gestão e cadastro de registros de ${nome}.`,
                    funcoesChave: [`render${capitalizarCamel(chave)}Panel`, `salvar${capitalizarCamel(chave)}`],
                    tabelasSupabase: [tabela],
                    regrasNegocio: 'Isolamento estrito do headcount de colaboradores_efetivo da COP.'
                }
            ]
        };

        gerenciadorConhecimento.adicionarModuloInteiro(novoMod);
        popularSelectModulos();
        document.getElementById('promptSelectModulo').value = chave;
        aoMudarModuloPrompt();

        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Módulo Aprendido!',
                text: `O módulo "${nome}" foi registrado na Base de Aprendizagem e agora faz parte dos módulos do sistema.`,
                timer: 2500,
                showConfirmButton: false
            });
        } else {
            alert(`O módulo "${nome}" foi registrado com sucesso na Base de Aprendizagem!`);
        }
    };

    function salvarNoHistoricoPrompts(registro) {
        try {
            const hist = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORICO) || '[]');
            hist.unshift(registro);
            localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(hist.slice(0, 30)));
        } catch (_) {}
    }

    // =========================================================================
    // 8. ABA DA BASE DE CONHECIMENTO & APRENDIZAGEM
    // =========================================================================
    function alternarAbaGerador(aba) {
        const secGerador = document.getElementById('secaoGeradorPromptPrincipal');
        const secConhecimento = document.getElementById('secaoBaseConhecimento');
        const btnGerador = document.getElementById('btnTabGerador');
        const btnConhecimento = document.getElementById('btnTabConhecimento');

        if (aba === 'gerador') {
            if (secGerador) secGerador.style.display = 'block';
            if (secConhecimento) secConhecimento.style.display = 'none';
            if (btnGerador) {
                btnGerador.style.background = '#fff';
                btnGerador.style.color = '#1e3a8a';
            }
            if (btnConhecimento) {
                btnConhecimento.style.background = 'rgba(255,255,255,0.15)';
                btnConhecimento.style.color = '#fff';
            }
        } else {
            if (secGerador) secGerador.style.display = 'none';
            if (secConhecimento) secConhecimento.style.display = 'block';
            if (btnGerador) {
                btnGerador.style.background = 'rgba(255,255,255,0.15)';
                btnGerador.style.color = '#fff';
            }
            if (btnConhecimento) {
                btnConhecimento.style.background = '#fff';
                btnConhecimento.style.color = '#1e3a8a';
            }
            renderizarListaConhecimentos();
        }
    };

    function renderizarListaConhecimentos() {
        const container = document.getElementById('containerCardsConhecimento');
        if (!container) return;

        const modulos = gerenciadorConhecimento.dados.modulos || [];
        const termoFiltro = (document.getElementById('filtroConhecimentoInput')?.value || '').toLowerCase().trim();

        const filtrados = modulos.filter(m => {
            if (!termoFiltro) return true;
            const textoCompleto = [
                m.nome,
                m.descricao,
                m.arquivoPrincipal,
                ...(m.submodulos || []).map(s => `${s.nome} ${s.descricao} ${(s.funcoesChave || []).join(' ')} ${(s.tabelasSupabase || []).join(' ')}`)
            ].join(' ').toLowerCase();
            return textoCompleto.includes(termoFiltro);
        });

        if (filtrados.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-light); font-size:13.5px;">
                    Nenhum módulo ou rotina encontrada para a busca "${termoFiltro}".
                </div>
            `;
            return;
        }

        container.innerHTML = filtrados.map(m => `
            <div style="background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow);">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:22px;">${m.icone}</span>
                            <span style="font-size:14px; font-weight:700; color:var(--text);">${m.nome}</span>
                        </div>
                        <span style="font-size:10px; background:rgba(37,99,235,0.1); color:var(--primary); font-weight:700; padding:2px 6px; border-radius:4px;">
                            ${(m.submodulos || []).length} submódulos
                        </span>
                    </div>

                    <div style="font-size:11.5px; color:var(--text-light); margin-bottom:10px; line-height:1.4;">
                        ${m.descricao}
                    </div>

                    <div style="font-size:11px; font-family:monospace; color:var(--primary); background:var(--card); padding:4px 8px; border-radius:4px; border:1px solid var(--border); margin-bottom:12px; word-break:break-all;">
                        📁 ${m.arquivoPrincipal}
                    </div>

                    <div style="font-size:11.5px; font-weight:700; color:var(--text); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">
                        Submódulos Mapeados:
                    </div>
                    <ul style="margin:0 0 12px 18px; padding:0; font-size:12px; color:var(--text); line-height:1.45;">
                        ${(m.submodulos || []).map(s => `
                            <li style="margin-bottom:3px;">
                                <strong>${s.nome}</strong>: ${(s.funcoesChave || []).slice(0, 2).map(f => `<code>${f}</code>`).join(', ') || 'Rotina mapeada'}
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div style="border-top:1px solid var(--border); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <button type="button" class="db-apply-btn" onclick="selecionarModuloDiretoNoGerador('${m.id}')" style="padding:6px 12px; font-size:11.5px; font-weight:600;">
                        ⚡ Usar no Gerador
                    </button>
                    <button type="button" class="db-clear-btn" onclick="abrirModalEnsinarConhecimento('${m.id}')" style="padding:6px 10px; font-size:11px;">
                        ➕ Adicionar Rotina
                    </button>
                </div>
            </div>
        `).join('');
    }

    function filtrarListaConhecimentos() {
        renderizarListaConhecimentos();
    };

    function selecionarModuloDiretoNoGerador(modId) {
        alternarAbaGerador('gerador');
        const selMod = document.getElementById('promptSelectModulo');
        if (selMod) {
            selMod.value = modId;
            aoMudarModuloPrompt();
        }
    };

    // =========================================================================
    // 9. MODAL DE ENSINAR NOVO CONHECIMENTO
    // =========================================================================
    function abrirModalEnsinarConhecimento(modIdPadrao) {
        const modal = document.getElementById('modalEnsinarConhecimento');
        const sel = document.getElementById('ensinarSelectModulo');
        if (!modal || !sel) return;

        const modulos = gerenciadorConhecimento.dados.modulos || [];
        sel.innerHTML = modulos.map(m => `
            <option value="${m.id}" ${modIdPadrao && modIdPadrao === m.id ? 'selected' : ''}>${m.icone} ${m.nome}</option>
        `).join('');

        document.getElementById('ensinarNomeSubmodulo').value = '';
        document.getElementById('ensinarDescricaoRegra').value = '';
        document.getElementById('ensinarFuncoesChave').value = '';
        document.getElementById('ensinarTabelasSupabase').value = '';

        modal.style.display = 'flex';
    };

    function fecharModalEnsinarConhecimento() {
        const modal = document.getElementById('modalEnsinarConhecimento');
        if (modal) modal.style.display = 'none';
    };

    function salvarNovoConhecimentoEnsinado() {
        const modId = document.getElementById('ensinarSelectModulo')?.value;
        const nome = document.getElementById('ensinarNomeSubmodulo')?.value.trim();
        const desc = document.getElementById('ensinarDescricaoRegra')?.value.trim();
        const funcoesStr = document.getElementById('ensinarFuncoesChave')?.value.trim();
        const tabelasStr = document.getElementById('ensinarTabelasSupabase')?.value.trim();

        if (!nome || !desc) {
            alert('Por favor, informe ao menos o Nome e a Descrição/Regra da nova rotina.');
            return;
        }

        const subId = 'custom_' + gerarSlug(nome).slice(0, 30);
        const funcoesChave = funcoesStr ? funcoesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const tabelasSupabase = tabelasStr ? tabelasStr.split(',').map(s => s.trim()).filter(Boolean) : [];

        try {
            gerenciadorConhecimento.adicionarConhecimento(modId, {
                id: subId,
                nome: nome,
                descricao: desc,
                regrasNegocio: desc,
                funcoesChave: funcoesChave,
                tabelasSupabase: tabelasSupabase
            });

            fecharModalEnsinarConhecimento();
            popularSelectModulos();
            atualizarSelectSubmodulos();
            renderizarListaConhecimentos();

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Aprendizado Salvo!',
                    text: `A rotina "${nome}" foi registrada na base de conhecimento e já está disponível no Gerador de Prompts.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                alert(`A rotina "${nome}" foi aprendida e salva com sucesso!`);
            }
        } catch (e) {
            alert('Erro ao salvar aprendizado: ' + e.message);
        }
    };

    // =========================================================================
    // 10. IMPORTAÇÃO E EXPORTAÇÃO DE CONHECIMENTO
    // =========================================================================
    function exportarBaseConhecimento() {
        const json = gerenciadorConhecimento.exportarJson();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sst_conhecimento_arquitetura_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    function abrirModalImportarBase() {
        const m = document.getElementById('modalImportarBaseConhecimento');
        if (m) m.style.display = 'flex';
    };

    function fecharModalImportarBase() {
        const m = document.getElementById('modalImportarBaseConhecimento');
        if (m) m.style.display = 'none';
    };

    function processarImportacaoBaseJson() {
        const txt = document.getElementById('importarBaseJsonTexto')?.value.trim();
        if (!txt) {
            alert('Cole o JSON para importar.');
            return;
        }

        const res = gerenciadorConhecimento.importarJson(txt);
        if (res.ok) {
            fecharModalImportarBase();
            popularSelectModulos();
            atualizarSelectSubmodulos();
            renderizarListaConhecimentos();
            alert('Base de conhecimento importada e mesclada com sucesso!');
        } else {
            alert(res.mensagem);
        }
    };

    function restaurarPadroesConhecimento() {
        if (!confirm('Deseja realmente restaurar os padrões oficiais de conhecimento da engenharia SST? Seus registros adicionais serão mesclados com a versão de fábrica.')) return;
        gerenciadorConhecimento.restaurarPadroes();
        popularSelectModulos();
        atualizarSelectSubmodulos();
        renderizarListaConhecimentos();
        alert('Padrões restaurados com sucesso!');
    };

    // =========================================================================
    // 11. DOWNLOAD E INSTALAÇÃO NO ANTIGRAVITY LOCAL
    // =========================================================================
    const INSTRUCAO_ANTIGRAVITY_TEXTO = 
`Por favor, ative o novo módulo "Gerador de Prompts Especialista em SST" que salvei em dashboard/modules/gerador_prompts.js:

1. Em dashboard/index.html:
   - Adicionar o botão no menu lateral em #navGroupItems-standalone:
     <button class="db-nav-item" id="navGeradorPrompts" onclick="showDbPage('geradorprompts')"><span class="db-nav-icon">💡</span> Gerador de Prompts IA</button>
   - Adicionar o container antes do rodapé de <main class="db-main">:
     <section class="db-page" id="page-geradorprompts"></section>
   - Adicionar a tag de script após os módulos:
     <script src="modules/gerador_prompts.js?v=297"></script>

2. Em dashboard/dashboard.js E TAMBÉM em dashboard/modules/epi_estoque.js:
   - Adicionar 'geradorprompts' no navMap: geradorprompts: 'navGeradorPrompts'
   - Adicionar 'geradorprompts' em DB_PAGE_TITLES: geradorprompts: 'Gerador de Prompts IA'
   - Adicionar no showDbPage:
     if (pageId === 'geradorprompts') { if (typeof window.inicializarGeradorPrompts === 'function') window.inicializarGeradorPrompts(); }

3. Atualizar dashboard/MAPA_MODULOS.md registrando o módulo #11 (gerador_prompts.js).`;

    function baixarArquivoGeradorPrompts() {
        fetch('modules/gerador_prompts.js?v=297')
            .then(res => {
                if (!res.ok) throw new Error('Não foi possível carregar o arquivo (HTTP ' + res.status + ')');
                return res.text();
            })
            .then(conteudo => {
                const blob = new Blob([conteudo], { type: 'application/javascript;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'gerador_prompts.js';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(err => {
                alert('Erro ao baixar o módulo gerador_prompts.js: ' + err.message);
            });
    };

    function abrirModalInstalacaoAntigravity() {
        const m = document.getElementById('modalInstalacaoAntigravity');
        const txt = document.getElementById('textoInstrucaoAntigravityModal');
        if (txt) txt.value = INSTRUCAO_ANTIGRAVITY_TEXTO;
        if (m) m.style.display = 'flex';
    };

    function fecharModalInstalacaoAntigravity() {
        const m = document.getElementById('modalInstalacaoAntigravity');
        if (m) m.style.display = 'none';
    };

    function copiarInstrucaoAntigravity() {
        const txt = document.getElementById('textoInstrucaoAntigravityModal');
        const btn = document.getElementById('btnCopiarInstrucaoAntigravityModal');
        if (!txt) return;

        txt.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt.value).then(sucesso).catch(() => {
                document.execCommand('copy');
                sucesso();
            });
        } else {
            document.execCommand('copy');
            sucesso();
        }

        function sucesso() {
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = '<span>✅</span> Copiado!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.innerHTML = original;
                    btn.style.background = '#10b981';
                }, 2000);
            }
        }
    };

    // Auto-inicialização imediata e no carregamento da página
    function verificarEInicializar() {
        const page = document.getElementById('page-geradorprompts');
        if (page && !page.dataset.inicializado) {
            inicializarGeradorPrompts();
        }
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', verificarEInicializar);
        } else {
            setTimeout(verificarEInicializar, 50);
        }
    }

    // Exportação global
    window.inicializarGeradorPrompts = inicializarGeradorPrompts;
    window.selecionarModoOperacao = selecionarModoOperacao;
    window.aplicarModeloNovoModulo = aplicarModeloNovoModulo;
    window.aoMudarParametrosPrompt = aoMudarParametrosPrompt;
    window.aoMudarModuloPrompt = aoMudarModuloPrompt;
    window.aoDigitarNomeNovoModulo = aoDigitarNomeNovoModulo;
    window.aoDigitarDescricaoPrompt = aoDigitarDescricaoPrompt;
    window.limparDescricaoPrompt = limparDescricaoPrompt;
    window.aplicarExemploSugerido = aplicarExemploSugerido;
    window.preencherExemploDemonstracao = preencherExemploDemonstracao;
    window.executarGeracaoPrompt = executarGeracaoPrompt;
    window.copiarPromptGerado = copiarPromptGerado;
    window.salvarNovoModuloDiretoNaBase = salvarNovoModuloDiretoNaBase;
    window.alternarAbaGerador = alternarAbaGerador;
    window.filtrarListaConhecimentos = filtrarListaConhecimentos;
    window.selecionarModuloDiretoNoGerador = selecionarModuloDiretoNoGerador;
    window.abrirModalEnsinarConhecimento = abrirModalEnsinarConhecimento;
    window.fecharModalEnsinarConhecimento = fecharModalEnsinarConhecimento;
    window.salvarNovoConhecimentoEnsinado = salvarNovoConhecimentoEnsinado;
    window.exportarBaseConhecimento = exportarBaseConhecimento;
    window.abrirModalImportarBase = abrirModalImportarBase;
    window.fecharModalImportarBase = fecharModalImportarBase;
    window.processarImportacaoBaseJson = processarImportacaoBaseJson;
    window.restaurarPadroesConhecimento = restaurarPadroesConhecimento;
    window.baixarArquivoGeradorPrompts = baixarArquivoGeradorPrompts;
    window.abrirModalInstalacaoAntigravity = abrirModalInstalacaoAntigravity;
    window.fecharModalInstalacaoAntigravity = fecharModalInstalacaoAntigravity;
    window.copiarInstrucaoAntigravity = copiarInstrucaoAntigravity;
    window.gerenciadorConhecimentoSST = gerenciadorConhecimento;

})(window);
