# MAPA OFICIAL DE MÓDULOS — DASHBOARD GERENCIAL SST

Incremento local v301 (09/11/2026): `modules/gestao_de_condutores_cnh.js` (2.862 linhas, 165,1 KB) implementa o módulo independente de Gestão de Condutores – CNH (Próprios, Terceiros e PJ), expondo exclusivamente o ponto de entrada `window.renderGestaoDeCondutoresPanel` (rota `gestao_de_condutores`, container `page-gestao_de_condutores`) e operando apenas sobre `public.gestao_de_condutores_cnh` com ciclos UUID de CNH, avaliação individual por atividade/equipamento, proteção de regras/histórico e comunicações imutáveis. Minuta SQL (`supabase/migrations/20261109_modulo_gestao_condutores_cnh.sql`), políticas RLS/vínculo Auth real e validação visual em navegador permanecem bloqueadas/pendentes de ambiente isolado e homologação.

Ativação oficial v298 (06/11/2026): `modules/gerador_prompts.js` integra a ferramenta interna de engenharia de prompts especialista em SST, arquitetura do App Checklist Segurança e regras inegociáveis de conformidade para agentes de IA.

Correção local v292: `modules/relsms_importacao_segura.js` assume a importação de fotos com categoria, vínculo exato e prévia; carrega após relatorio_sms_fotos.js. Contratos, testes e dependência do Apps Script em `RELSMS_IMPORTACAO_SEGURA.md`. Word manual permanece independente.

Prioridade de emissão v289: `modules/relsms_fotos_manuais.js` gera a seção de fotos editável no Word a partir dos cronogramas, com dois campos por tema, sem Drive. Integra por opção de `montarDocRelSms`/`gerarRelatorioMensalSms`, preservando o fluxo automático. Guia em `RELSMS_WORD_MANUAL.md`.

Incremento local v288: entradas de fotos no Cronograma, Calendário DDSMA e Acervo; botões de escaneados preservados. `modules/cronograma_pastas.js` prepara pastas antecipadas pela data prevista, após `relatorio_sms_fotos.js`. API responsável: `api/cronograma-pastas.js`, com autenticação e reserva de IDs. Uso, permissões e limites em `CRONOGRAMA_PASTAS.md`.

Incremento local v285 (04/11/2026): relatório SMS preserva ocultações executivas, distingue ausência de evidência, recorta atestados por competência e mantém HHT zero; fotos permitem escolher aplicação realizada do cronograma. Escopo, testes e itens estruturais pendentes em `RELATORIO_SMS_VALIDACAO.md`.

Atualização pontual de 03/11/2026: `modules/relatorio_sms_fotos.js` mantém a seleção editorial mensal de fotos no Drive (metadados leves por competência), com fechamento e incorporação no Word/impressão. Carrega após `relatorio_sms_nc.js`, que mantém os pontos de entrada do relatório. Ver `RELATORIO_SMS_FOTOS.md`.

Atualização pontual de 03/11/2026: `modules/saude_prestadores.js` concentra o cadastro administrativo de estabelecimentos parceiros e médicos examinadores, com seleção para a prévia do ASO. Carrega após `saude_psicossocial.js` e `pcmso.js`; reutiliza `configuracoes_sistema` e preserva a separação entre coordenador e examinador. Detalhes em `ASO_MODELO.md`. As contagens históricas abaixo devem ser confirmadas no código atual.
*Arquitetura Modular de Alta Performance (Versão v198)*

O monólito original de 52.062 linhas foi integralmente refatorado e desacoplado em **10 módulos independentes** dentro de `dashboard/modules/`, mantendo no `dashboard/dashboard.js` apenas o Núcleo/Core do sistema (4.233 linhas).

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

## 2. Estrutura do Núcleo Principal (`dashboard/dashboard.js` — 4.233 Linhas)

O arquivo central agora atua estritamente como **Core do Dashboard**:
- **Linhas 1 – 243**: Constantes de versão (`v198`), configuração do Supabase e Blindagem IDB de Cache Egress.
- **Linhas 244 – 1.095**: Sistema de Login, autenticação com biometria/senha e auditoria de acessos.
- **Linhas 1.096 – 3.753**: Roteamento principal (`renderAll`, `showDbPage`), Checklists operacionais, validações e importador de PDFs legados.
- **Linhas 3.754 – 4.233**: Inspeção e gestão de Extintores de Incêndio (sincronizada com o app mobile).
- **Fechamento**: Inicialização de janelas, event listeners e controle de ciclo de vida (`renderizarVersaoDashboard`, auto-refresh e cache flush).

---

## 3. Diretrizes Estritas para o Agente Antigravity

1. **PROIBIDO LER O ARQUIVO COMPLETO**: Nunca execute `view_file` sem passar `StartLine` e `EndLine`. Limite cada chamada a blocos de até 150 linhas.
2. **EDIÇÃO DIRETA NO MÓDULO ALVO**: Qualquer manutenção deve ser feita diretamente no arquivo correspondente dentro de `dashboard/modules/` conforme a tabela acima.
3. **COMPATIBILIDADE GARANTIDA**: Todos os arquivos compartilham o escopo global nativo do navegador via tags `<script>` no [dashboard/index.html](file:///c:/Projetos/app-checklist-seguranca/dashboard/index.html), sem necessidade de `import/export` ou compiladores.

Incremento local CNH v301.2: matriz interna aprovada por João; sete modelos, validação canônica de requisitos no servidor por migração adicional e reciclagem interna de 24 meses para Direção Defensiva e NR-11/NR-12. Ver MATRIZ_CONDUTORES_APROVADA.md. Teste local não equivale a publicação ou validação do schema operacional.
