# MAPA OFICIAL DE MÓDULOS — DASHBOARD GERENCIAL SST

12/11/2026 — Integração de pastas migrada para API autenticada e envelope assinado ao Apps Script. Importação SMS, pasta operacional e sincronização Treinamentos usam pastas-drive, incluindo versões homônimas no núcleo. Teste de conexão não faz ping legado nem cria pastas. Script recusa pedido sem assinatura, validade/replay/raízes inválidas; não solicita compartilhamento público nem cai na raiz geral. Segredo só servidor/propriedades, sem JWT ao Web App. Ativação exige troca coordenada da implantação existente e painel/API. Ver ../api/PASTAS_DRIVE_ASSINADAS.md. Cache núcleo/Treinamentos/Acervo303.6, importador296; demais recursos preservados.

12/11/2026 — Apresentação do relatório para o destinatário: Word e impressão deixam de exibir mensagens técnicas de homologação/snapshot, hash e conta interna; minutas mantêm identificação simples para revisão. Código de controle, responsável técnico, data e informações SST preservados. Rastreabilidade e fechamento continuam no painel/banco, sem alterar snapshots nem arquivos existentes. Cache apenas móduloSMS303.5. Exportar nova cópia usa a competência já fechada, sem nova homologação.

12/11/2026 — Correção de diagramação do DOCX SMS: cabeçalho/rodapé passam a declarar grade, células e largura total em DXA, com layout fixo e soma igual à área útil A4. Antes, a grade gerada tinha colunas de apenas100 DXA; importadores podiam comprimir o texto verticalmente. Quatro amostras reais do gerador (com/sem logo, minuta/snapshot) conferidas em XML; duas renderizadas no Word e inspecionadas visualmente. Google Docs ainda depende da conferência da nova cópia. Cache somente relatorio_sms_nc303.4. Dados/snapshot e arquivos homologados no Drive preservados; exportar novamente o Word usa o snapshot existente, sem nova homologação.

12/11/2026 — Correção pontual da importação de fotos SMS: consulta e revisão SweetAlert passam a abrir dentro do diálogo nativo do organizador, permitindo foco, digitação e cliques. Reprodução local confirmou o campo inerte antes; depois, entrada do link, cancelamento sem gravação, revisão, salvamento simulado de duas fotos e fechamento/reabertura passaram. Cache somente do importador em 295.1. Não altera Apps Script, API, autenticação, fotos reais ou regras de homologação.

12/11/2026 — Ativação dos anexos autorizada por João: concessões do responsável e de Saúde provisionadas; referência de fotos cadastrada em Production/Preview. Saúde ainda precisa concluir o convite e definir senha. Publicação e verificações operacionais em andamento; registros seguintes são históricos. Ver ../api/PREPARACAO_ATIVACAO_ANEXOS.md.

12/11/2026 — Preparação de ativação dos anexos, ainda SEM publicação: 16 cenários adicionais com Auth/PostgreSQL reais locais e Drive simulado aprovados. Planejamento de contas sem aplicação; Saúde aguarda confirmação de e-mail; pasta de Saúde observada como Restrita; referência de fotos do painel localizada, ajuste de configuração proposto e ainda não aplicado. Agregado72/72 sintaxe,19/19 arquivos, lint19 módulos. Ver ../api/PREPARACAO_ATIVACAO_ANEXOS.md. Nenhum build remoto ou mudança de contas/configuração operacional.

12/11/2026 — Incremento somente LOCAL de autorização de anexos: núcleo, Saúde, Acervo/ambiental, SMS e fotos usam fetchApiAnexos, Auth/tickets em memória por UID, descarte após logout/troca de conta e confirmação antes de tornar público; Saúde não compartilha. Núcleo/módulos alterados em cache303.3, sem publicação. APIs exigem concessão administrativa no Auth; ativação ainda não provisionada. Testes simulados aprovados: sintaxe70/70, arquivos18/18, módulos19; painel integrado7+recarga1 e regressão13. Ver ../api/AUTORIZACAO_ANEXOS.md. Sem novos PRs/deploys; preservar cotas.

12/11/2026 — Conjunto publicado com autorização de João: migração 20261112085020_status_colaborador_atomico no projeto segtrab antes do painel, PR nº 2 integrada em e9ea39a, deployment READY. Oito recursos do painel e quatro do campo conferidos por SHA-256/HTTP200; fixture e SQL inacessíveis. Navegador operacional: shell, Efetivo/Terceiros e leitura de indicadores aprovados; sessão legada sem Supabase Auth, portanto gravação autenticada em produção não homologada. Sem dados fictícios ou alteração de cadastros para teste. Ver STATUS_COLABORADOR_ATOMICO.md e registro final na ponte. Relatos anteriores de ausência da RPC/publicação descrevem etapas históricas.

Status de acesso conjunto implementado LOCALMENTE (núcleo/EPI 303.2): RPC transacional, conflito de estado, rollback e resposta incerta tratados. 20 cenários com backend/Auth locais reais e 13 simulados aprovados; sintaxe 64/64, testes 15/15 arquivos e lint 19 módulos aprovados. Proposta SQL fora de migrations e ausente de produção: NÃO publicar o frontend antes da ativação coordenada do banco. Ver STATUS_COLABORADOR_ATOMICO.md. As descrições anteriores abaixo são históricas.

Homologação local posterior em 11/11/2026: 15 cenários com GoTrue/PostgREST/PostgreSQL reais aprovados nos fluxos de login, colaboradores, treinamentos, autoria, recarga, perfil leitor e falhas parciais. Esquema e RLS de fixture exclusiva, não réplica operacional; módulos auxiliares/bibliotecas permanecem simulados. Instâncias encerradas e volumes preservados. Sem alterações de produto/publicação. Ver `HOMOLOGACAO_BACKEND_LOCAL.md` para evidências e limites.

Validação local ampliada em 11/11/2026: `npm run preview:isolated` carrega a estrutura completa do painel com autenticação, dados e bibliotecas externas simulados, origem restrita e CSP sem conexões externas. Nove cenários de fluxos e quatro de recarga aprovados; captura visual do painel conferida. Sintaxe 63/63, testes 14/14 arquivos e lint 19 módulos sem ocorrências. Ferramentas em `dashboard/tests/isolado/` e `scripts/preview-dashboard-isolado.cjs`, excluídas no `.vercelignore`. Não equivale a backend/Auth/RLS reais; sem publicação. Detalhes em `../VERIFICACOES_LOCAIS.md`.

Continuação local (cache 303.1 apenas em núcleo/treinamentos/GHE): segundo atalho GHE abre o Psicossocial global; presença em Kits invalida caches e recarrega status pela fonte existente, distinguindo gravação concluída de falha posterior de atualização. Onze testes na suíte de regressão; agregado com 58/58 arquivos de sintaxe, 13/13 arquivos de testes e 19 módulos sem ocorrências. Fixture HTTP local conferida visualmente em captura 1200×1200; não equivale a painel completo/autenticado. Ver atualização ao fim de `LINT_MODULOS_INVESTIGACAO.md`. Sem publicação.

Correções locais de 11/11/2026 (cache-buster 303 somente nos sete recursos alterados): sincronização de status Checklist/Efetivo com aviso de falha parcial; datas de terceiros com utilitário do núcleo; botão do Documento-Base PGR direcionado ao Psicossocial global por escolha de João; autoria SMS verificada por Auth ou marcada como não verificada; estado do dossiê e propriedades de compatibilidade explícitos. Sintaxe 58/58, testes locais 13/13 e lint de 19 módulos sem ocorrências. Validação em fixture/DOM; captura visual do Orca falhou; painel completo autenticado e produção não homologados. Ver `LINT_MODULOS_INVESTIGACAO.md`. Sem publicação.

Incremento local v301.6 (12/11/2026): `modules/gestao_de_condutores_cnh.js` organiza a interface em subabas estruturadas ("Cadastro de Condutores" e "Frentes de Serviço & Prontidão") para eliminar a rolagem vertical excessiva. Inclui busca rápida de frentes (`buscaFrenteProntidao`), contadores dinâmicos de registros visíveis, atalho para ver condutores filtrados por frente no cadastro e preservação estrita de foco durante digitação. Suíte de 18 blocos aprovada sem regressões.

Incremento local v301 (09/11/2026): `modules/gestao_de_condutores_cnh.js` (2.862 linhas, 165,1 KB) implementa o módulo independente de Gestão de Condutores – CNH (Próprios, Terceiros e PJ), expondo exclusivamente o ponto de entrada `window.renderGestaoDeCondutoresPanel` (rota `gestao_de_condutores`, container `page-gestao_de_condutores`) e operando apenas sobre `public.gestao_de_condutores_cnh` com ciclos UUID de CNH, avaliação individual por atividade/equipamento, proteção de regras/histórico e comunicações imutáveis. Minuta SQL (`supabase/migrations/20261109_modulo_gestao_condutores_cnh.sql`), políticas RLS/vínculo Auth real e validação visual em navegador permanecem bloqueadas/pendentes de ambiente isolado e homologação.

Ativação oficial v298 (06/11/2026): `modules/gerador_prompts.js` integra a ferramenta interna de engenharia de prompts especialista em SST, arquitetura do App Checklist Segurança e regras inegociáveis de conformidade para agentes de IA.

Correção local v292: `modules/relsms_importacao_segura.js` assume a importação de fotos com categoria, vínculo exato e prévia; carrega após relatorio_sms_fotos.js. Contratos, testes e dependência do Apps Script em `RELSMS_IMPORTACAO_SEGURA.md`. Word manual permanece independente.

Prioridade de emissão v289: `modules/relsms_fotos_manuais.js` gera a seção de fotos editável no Word a partir dos cronogramas, com dois campos por tema, sem Drive. Integra por opção de `montarDocRelSms`/`gerarRelatorioMensalSms`, preservando o fluxo automático. Guia em `RELSMS_WORD_MANUAL.md`.

Incremento local v288: entradas de fotos no Cronograma, Calendário DDSMA e Acervo; botões de escaneados preservados. `modules/cronograma_pastas.js` prepara pastas antecipadas pela data prevista, após `relatorio_sms_fotos.js`. API responsável: `api/cronograma-pastas.js`, com autenticação e reserva de IDs. Uso, permissões e limites em `CRONOGRAMA_PASTAS.md`.

Incremento local v285 (04/11/2026): relatório SMS preserva ocultações executivas, distingue ausência de evidência, recorta atestados por competência e mantém HHT zero; fotos permitem escolher aplicação realizada do cronograma. Escopo, testes e itens estruturais pendentes em `RELATORIO_SMS_VALIDACAO.md`.

Atualização pontual de 03/11/2026: `modules/relatorio_sms_fotos.js` mantém a seleção editorial mensal de fotos no Drive (metadados leves por competência), com fechamento e incorporação no Word/impressão. Carrega após `relatorio_sms_nc.js`, que mantém os pontos de entrada do relatório. Ver `RELATORIO_SMS_FOTOS.md`.

Atualização pontual de 03/11/2026: `modules/saude_prestadores.js` concentra o cadastro administrativo de estabelecimentos parceiros e médicos examinadores, com seleção para a prévia do ASO. Carrega após `saude_psicossocial.js` e `pcmso.js`; reutiliza `configuracoes_sistema` e preserva a separação entre coordenador e examinador. Detalhes em `ASO_MODELO.md`. As contagens históricas abaixo devem ser confirmadas no código atual.
*Arquitetura Modular de Alta Performance (Versão v198)*

**Correção de leitura em 11/11/2026:** a descrição v198 é histórica e não comprova a estrutura atual. O núcleo ainda tem mais de 52 mil linhas não vazias e há 19 arquivos JavaScript em `dashboard/modules/` nesta revisão. Existem responsabilidades sobrepostas entre núcleo e módulos. Antes de editar, localizar todas as declarações homônimas e conferir a ordem dos scripts em `index.html`. As contagens da tabela abaixo são históricas; não usar como endereços atuais.

---

## 1. Módulos Desacoplados (`dashboard/modules/*.js`)

| # | Arquivo Modular | Linhas | Tamanho | Responsabilidade Técnica & Módulos de SST |
| :-: | :--- | :---: | :---: | :--- |
| **1** | **`dashboard/modules/treinamentos_ddsma.js`** | **7.423** | 444,9 KB | **Treinamentos NR & DDS/DDSMA**: Treinamentos obrigatórios, catálogo de cursos, matriz de treinamentos, lançamento em lote, cronograma operacional, registro FOR.001.R00, DDS diário e presenças em campo. |
| **2** | **`dashboard/modules/efetivo_ferias.js`** | **1.239** | 67,2 KB | **Efetivo, Férias CLT & Mão de Obra Local**: Admissões, demissões, headcount, cálculo de 24 meses de férias (Art. 130 e 134 CLT), relatórios configuráveis de gestão de pessoas, quadros 1 e 2 do RSA (Mão de Obra Local/ADA) e gestão de setores. |
| **3** | **`dashboard/modules/ghe_os.js`** | **3.124** | 194,7 KB | **GHE, Riscos & Ordens de Serviço**: Catálogo de GHE, Matriz de Risco AIHA (seção 16 do PGR), Matriz NR-06 de EPIs, histórico de troca de função e emissão/rastreabilidade de Ordens de Serviço (OS NR-01). |
| **4** | **`dashboard/modules/relatorio_sms_nc.js`** | **5.074** | 303,9 KB | **Relatório Mensal SMS & Não Conformidades**: Gerador do Relatório Mensal de SMS (.docx), gráficos de barras HHT em SVG, inspeções de segurança em campo, gestão e tratativas de Não Conformidades (NC) e aniversariantes. |
| **5** | **`dashboard/modules/saude_psicossocial.js`** | **5.369** | 309,1 KB | **Saúde Ocupacional, ASOs, Acidentes & Psicossocial**: Acidentabilidade (NR-01 / NBR 14280 / TF / TG), PCMSO (NR-07), exames por GHE, previsão de exames, relatórios para líderes, régua legal de ASOs (12 e 24 meses), baixa pós-mutirão, parametrização psicossocial e atestados. |
| **6** | **`dashboard/modules/epi_estoque.js`** | **4.016** | 381,2 KB | **EPIs, Estoque & Controle de Acesso**: Catálogo de EPIs (NR-06), controle de estoque (entradas/saídas), lançamentos de entregas, relatório semanal de comprovantes de EPI, inteligência de consumo e perfis de acesso / RBAC do painel. |
| **7** | **`dashboard/modules/ambiental_compras_hht.js`** | **3.196** | 178,0 KB | **Meio Ambiente, Fotos Drive & HHT**: Navegação e upload no Acervo Google Drive (fotos de DDSMA/Treinamentos), Calendário Operacional de HHT (Arcoverde/PE), manifesto de resíduos sólidos e requisições de compras SST. |
| **8** | **`dashboard/modules/apr_cipa.js`** | **6.807** | 456,1 KB | **APR (5x5), Templates & CIPA**: Motor Técnico de Inferência SST para APR (Matriz 5x5 COP Ramal), banco de templates `MODELOS_APR_SEED`, gestão de reuniões/atas da CIPA e assistente de cronograma eleitoral NR-05. |
| **9** | **`dashboard/modules/documentos_brigada.js`** | **1.411** | 85,7 KB | **Controle Documental & Brigada de Incêndio**: Lista mestra de documentos e revisões oficiais, dimensionamento da Brigada de Incêndio, organograma e programação de reciclagem de brigadistas. |
| **10** | **`dashboard/modules/ergonomia_periculosidade_pgr.js`** | **5.530** | 314,7 KB | **Ergonomia, Periculosidade, PGR & Alertas**: Avaliação Ergonômica Preliminar - AEP (NR-17), Laudos de Periculosidade (NR-16), Plano de Ação PGR (NR-01), Campanhas Sazonais de SST e Central de Alertas Inteligentes SST / Pendências do Dia. |
| **11** | **`dashboard/modules/gerador_prompts.js`** | **2.310** | 152,0 KB | **Gerador de Prompts Especialista em SST & Engenharia de Contexto**: Geração automatizada de instruções de alta precisão para agentes de IA (Antigravity, Cursor, Claude Code, Gemini), validação de regras de ouro SST/arquiteturais, árvore de conhecimento dos módulos e histórico de prompts. |
| **12** | **`dashboard/modules/gestao_de_condutores_cnh.js`** | **2.862** | 165,1 KB | **Gestão de Condutores – CNH**: Ponto de entrada único `window.renderGestaoDeCondutoresPanel` (rota `gestao_de_condutores`, tabela exclusiva `public.gestao_de_condutores_cnh`). Controle de condutores e operadores (Próprios, Terceiros e PJ), ciclos de validade de CNH (`America/Sao_Paulo`), aptidão por atividade/equipamento (`Inativo > Inapto > Pendente > Apto`), treinamentos com conferência e histórico imutável de comunicações. *(Minuta SQL/RLS, Auth real e validação visual bloqueados/pendentes de ambiente isolado)*. |
| **—** | **`dashboard/placar_lideres.js`** | **~1.200** | ~75 KB | **Gamificação SST**: Placar de líderes, ranking de segurança e engajamento das frentes operacionais. |

---

## 2. Estrutura histórica do Núcleo Principal (v198; posições desatualizadas)

O mapa v198 atribuía ao núcleo as funções abaixo. Atualmente o arquivo também contém funções de negócio presentes nos módulos; localizar por nome no código real, sem presumir exclusividade:
- **Linhas 1 – 243**: Constantes de versão (`v198`), configuração do Supabase e Blindagem IDB de Cache Egress.
- **Linhas 244 – 1.095**: Sistema de Login, autenticação com biometria/senha e auditoria de acessos.
- **Linhas 1.096 – 3.753**: Roteamento principal (`renderAll`, `showDbPage`), Checklists operacionais, validações e importador de PDFs legados.
- **Linhas 3.754 – 4.233**: Inspeção e gestão de Extintores de Incêndio (sincronizada com o app mobile).
- **Fechamento**: Inicialização de janelas, event listeners e controle de ciclo de vida (`renderizarVersaoDashboard`, auto-refresh e cache flush).

---

## 3. Diretrizes Estritas para o Agente Antigravity

1. **PROIBIDO LER O ARQUIVO COMPLETO**: Nunca execute `view_file` sem passar `StartLine` e `EndLine`. Limite cada chamada a blocos de até 150 linhas.
2. **EDIÇÃO DIRETA NO MÓDULO ALVO**: Qualquer manutenção deve ser feita diretamente no arquivo correspondente dentro de `dashboard/modules/` conforme a tabela acima.
3. **ESCOPO GLOBAL COMPARTILHADO**: Os scripts clássicos são carregados por tags `<script>` em `dashboard/index.html`. Ordem de carregamento, exportações `window` e declarações duplicadas precisam ser conferidas; essa organização não garante compatibilidade. `npm run lint:modules` verifica referências nos 19 módulos considerando declarações e exportações dos scripts locais carregados, sem executar o painel.

Incremento local CNH v301.2: matriz interna aprovada por João; sete modelos, validação canônica de requisitos no servidor por migração adicional e reciclagem interna de 24 meses para Direção Defensiva e NR-11/NR-12. Ver MATRIZ_CONDUTORES_APROVADA.md. Teste local não equivale a publicação ou validação do schema operacional.

Incremento local CNH v301.4 (2026-11-10): o cadastro de condutor passou a oferecer busca na base do Efetivo (`colaboradores_efetivo`, somente leitura) para preencher nome, função e setor automaticamente, com aviso quando já existe condutor com o mesmo nome. Nenhuma escrita/sincronização na base do Efetivo; o cadastro manual (Terceiros/PJ) continua livre e a tela degrada sem bloquear caso a base esteja indisponível.

Incremento local CNH v301.5 (2026-11-12): painel de Prontidão Operacional de Condutores por Frente/Equipe, permitindo visualizar quem e quantos colaboradores estão autorizados a dirigir em cada frente de serviço, cruzamento de cobertura com efetivo da obra, alertas de CNH a vencer e filtro de seleção por Setor/Frente. Suíte CNH expandida para 18 blocos aprovados.
