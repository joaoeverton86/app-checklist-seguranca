# MAPA OFICIAL DE MÓDULOS — DASHBOARD GERENCIAL SST
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
