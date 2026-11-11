# PCMSO — análise e entrega local — 10/11/2026

Branch: melhoria/pcmso-consulta-mensal. Estado inicial do Git limpo. Sem publicação, migração ou gravação no banco.

## Evidências e alterações
- dashboard/dashboard.js: obterCapacidadeMutiraoPsico assumia 20; obterDataMutiraoPsico usava 2026-10-27 e compartilhava a referência psicossocial com outros exames. Removidos os padrões fictícios. Reutilizadas as configurações existentes.
- renderBannerMutiraoPsico inferia atendimento concluído apenas pela passagem da data. Substituído por referência de convocação expansível, sem comprovação de agenda ou realização.
- abrirModalPsicossocial e salvarRegistroPsicoRapido escolhiam psicossocial na matriz geral segundo GHE e ausência de psicossocial; o salvamento também inferia exame pelo nome do profissional. Título HTML era fixo. Agora a matriz oferece escolha numerada entre pendentes, vencidos e vencendo, identifica exame no título e conserva o objeto escolhido no modal até salvar.
- A pontuação de “Falta” foi simplificada, eliminando o parêntese delimitador.
- Removida inferência de realização de exame complementar específico apenas pela existência de ASO geral. Novas regularizações individuais acrescentam o procedimento preservando as entradas anteriores. Busca de procedimentos dentro do atendimento prioriza entradas recentes.
- Orientações/GHEs ficam em detalhes expansíveis. Indicadores operacionais existentes e ações permanecem acessíveis.
- dashboard/index.html: removida seleção fixa dos próximos 20; usa capacidade configurada.

## Consulta mensal
Funções pcmsoDataValida, calcularConsultaMensalPcmso e renderConsultaMensalPcmso, no dashboard.js. Filtros de mês/ano e nome de procedimento independentes dos filtros operacionais. Usa somente allAsoExames já carregado pelas permissões existentes; nenhuma consulta adicional ou novo acesso.
Pessoas distintas por matrícula; exames por procedimento detalhado com data válida. Não presume uma linha ASO como um exame. Duplicatas de matrícula + nome normalizado + data são consolidadas, incluindo cópia psicossocial no ASO geral. Dois procedimentos iguais no mesmo dia não podem ser distinguidos com segurança nessa estrutura.
Data efetiva: data_avaliacao, data_exame do procedimento, ou data do atendimento quando o procedimento contém resultado. Datas civis são preservadas; mês inicial usa America/Sao_Paulo. Cancelados, remarcados, agendados e previstos explicitamente marcados não entram como realizados. Histórico não filtra situação atual do colaborador.
A vencer usa validade explícita do último procedimento disponível por pessoa/exame. Não calcula retroativamente o estado histórico da previsão e não infere validade ausente. Agenda confirmada é informada como indisponível: não foi encontrada agenda individual neste fluxo. Data do mutirão nunca conta pessoas agendadas. Listagens expansíveis mostram nome, exame e data, sem resultados clínicos. Registros sem detalhamento/datas são informados.

## Verificações efetivas
- node --check dashboard/dashboard.js: passou.
- node tests/pcmso-mensal.cjs: passou. Dados fictícios: outubro anterior, novembro seguinte, múltiplos exames/pessoa, desligado, duplicata, exame específico/todos, cancelado/remarcado/agendado excluídos de realização, previsão sem agenda, datas inválidas/ausentes e período vazio.
- npm run lint: 30 erros. Comparação com arquivo original do HEAD também encontrou os mesmos 30 erros, sem nova referência indefinida.
- Vínculo da escolha e salvamento: revisão estática, sem simulação de gravação.
- Não executado: navegação visual em computador/celular, consulta autenticada, teste completo de modal ou baixa em lote. Não considerar esses fluxos homologados.

## Limitações e decisões
Não houve acesso ao registro real citado; causa confirmada no código, sem comprovar a composição do prontuário relatado. Ferramentas Project SMS_COP não disponíveis; não foi possível ler/atualizar os documentos remotos de contexto. Não havia AGENTS.md localizado no repositório. Nenhuma configuração, permissão ou migração foi adicionada.
Agenda individual confirmada exige definição futura de fonte/modelo e ciclo de cancelamento/remarcação. Sugestão fora desta entrega: identificadores próprios de procedimentos para distinguir duplicações de repetições legítimas no mesmo dia. Os fluxos de baixa em lote e históricos antigos continuam exigindo homologação; este relatório não certifica sua correção integral.

## Conferência local
1. Abrir Saúde Ocupacional > Recomendações e Exames na versão local desta branch.
2. Consultar outubro/2026 e novembro/2026, alternando Todos os exames e um exame específico; expandir os indicadores.
3. Expandir orientações e referência de convocação.
4. Na matriz geral, localizar um cadastro fictício com múltiplas pendências, clicar Registrar, escolher o número e conferir colaborador/exame no modal. Testar gravação somente em ambiente de testes.
5. Conferir a tela em computador e celular e homologar consulta, registro e baixa em lote antes de publicar.

## Correções após auditoria — 10/11/2026
Esta seção substitui as descrições anteriores sobre escolha numerada e acréscimo de procedimentos existentes.
- Corrigidos quatro blocos em salvarRegistroPsicoRapido (dois), salvarBaixaLoteMutirao e confirmarSinalizarPsicoEmDia: quando idx existe, atualiza por mesclagem; somente acrescenta quando não existe. Preserva os demais campos e exames. Não houve limpeza ou alteração de registros reais.
- Removido prompt nativo. O modal contém seletor visual de pendências, sem escolha automática; título, objeto de gravação e campos de profissional/observação acompanham a seleção. Abrir outro colaborador reinicializa as opções e a escolha. Sem escolha, salvar informa a necessidade no próprio modal.
- Restaurados Agendar/Reprogramar Data e Vagas e Baixa em Lote no banner, disponíveis inclusive sem data configurada; referência permanece expansível e não comprova agendamento/realização.
- Selecionar conforme capacidade, sem configuração, abre diretamente o modal de configuração e foca o campo de vagas. Não usa capacidade fictícia nem alerta bloqueante.
- Cache-buster do dashboard.js atualizado de 231 para 232.
- Testes: node --check dashboard/dashboard.js; node tests/pcmso-mensal.cjs; node tests/pcmso-auditoria.cjs passaram. O último executa os quatro blocos reais de atualização com dados fictícios (inclusive repetição), troca/remoção de seleção com DOM simulado, convite à configuração e renderização dos botões sem data. npm run lint mantém os 30 erros anteriormente identificados. git diff --check passou.
- Limites: testes com DOM simulado não equivalem à validação visual ou gravação integrada. Sem publicação e sem gravação em banco. Compatibilidade legada sem exames_detalhe, mencionada no item 5 da auditoria, permanece pendente de regra de transição; não se voltou a inferir exames específicos a partir de ASO geral.

## Correção da prévia local
Confirmada sobreposição de funções: dashboard/index.html carrega modules/saude_psicossocial.js depois de dashboard.js. O módulo ainda continha o banner e regras antigos e sobrescrevia as correções. Sincronizadas as funções PCMSO alteradas no módulo efetivamente carregado; cache-buster do módulo e identificação visual do painel atualizados para v232. Conferida igualdade de 11 funções de consulta/regularização/configuração entre os arquivos e resposta HTTP local do módulo com chamada da consulta mensal. Sintaxe dos dois scripts e os dois testes PCMSO passaram. Não foi realizada homologação visual autenticada. Nada publicado.

## Consulta mensal — compatibilidade com ASO e aba própria — 10/11/2026
- Confirmada por consulta SELECT restrita ao cadastro solicitado a existência de ASO periódico em outubro/2026 com quatro procedimentos detalhados, resultado no atendimento e nenhum campo de data/resultado individual. Não foram consultados resultados clínicos, nem alterados registros; esta nota não reproduz identificadores pessoais.
- Causa: calcularConsultaMensalPcmso aceitava data do atendimento somente quando item.resultado existia. salvarAso grava os procedimentos selecionados com nome, periodicidade e validade e mantém resultado/data no atendimento. Corrigido para aceitar a data do ASO se resultado do atendimento ou item estiver registrado, somente na ausência de data própria. Estados agendado/previsto/cancelado/remarcado continuam excluídos. Ausência de resultado e de data própria continua sem comprovação suficiente.
- Novos lançamentos pelo formulário ASO passam a incluir data_exame em cada procedimento. Nenhuma regravação/migração de histórico.
- Criada subaba Consulta mensal de exames com contêiner único, removida renderização das recomendações. showSaudeSubtab atualizado no principal e no módulo efetivo; atualização de dados de saúde também refaz a consulta quando a aba está ativa. Filtros permanecem no contêiner durante troca de abas.
- Versão visual/cache de dashboard.js e módulo: v233.
- Verificações: sintaxe dos dois scripts, testes pcmso-mensal.cjs e pcmso-auditoria.cjs aprovados; nova regressão do formato legado comprovou uma pessoa/quatro procedimentos em outubro, filtro específico, mês seguinte vazio, precedência da data individual e exclusão de agendamento/cancelamento/remarcação. pcmso-abas.cjs executou navegação entre consulta e recomendações com DOM simulado em ambos os arquivos, conferindo ocultação e contêiner único. Resposta HTTP da prévia contém nova aba. Lint mantém 30 erros preexistentes; diff --check passou. Não houve homologação visual autenticada, publicação ou escrita no banco.
- Conferência: recarregar prévia com Ctrl+Shift+R (v233), abrir Saúde Ocupacional > Consulta mensal de exames e selecionar outubro/2026 + Todos os exames; expandir a listagem de realizados.

## Vencimentos mensais — somente vínculos atuais — 10/11/2026
- Confirmado no código: calcularConsultaMensalPcmso montava a lista de vencimentos apenas pelos ASOs, sem cruzar situação atual do colaborador.
- Corrigido somente o indicador/listagem a vencer: renderConsultaMensalPcmso monta matrículas ativas a partir de allEfetivo com colaboradorEstaAtivo; o cálculo só inclui vencimentos dessas matrículas. O helper existente prioriza dt_demissao mesmo se o status estiver ATIVO; demitidos/inativos e pessoas sem vínculo ativo identificado não entram.
- Realizados preservam todos os registros históricos, incluindo desligados. A tela explica a diferença e o indicador passa a dizer Colaboradores ativos com exames a vencer. Não reconstrói o efetivo histórico do mês consultado: usa vínculos atuais, conforme explicitado na interface.
- Sem efetivo ativo disponível não presume pessoas ativas nem inclui vencimentos. Nenhuma consulta adicional, alteração em banco ou publicação.
- Versão visual e cache do principal: v234. Consulta mensal só existe no principal, sem função sobrescrita no módulo.
- Testes: sintaxe, pcmso-mensal.cjs (incluindo ativo com múltiplos exames, demitido ainda com status ATIVO, demitido por status, inativo, matrícula ausente e efetivo vazio), pcmso-auditoria.cjs e pcmso-abas.cjs aprovados. Histórico dos cinco cadastros fictícios permanece com cinco pessoas/dez exames; vencimentos ficam em uma pessoa/dois procedimentos. Lint mantém os 30 erros preexistentes. Sem validação visual autenticada.

## Separação de vencidos e a vencer — 10/11/2026
Falha confirmada: o cálculo filtrava a validade pelo mês, porém não comparava com hoje; o título a vencer era incorreto para meses passados. Corrigido calcularConsultaMensalPcmso: mantém duas listas disjuntas, vencidos (< hoje) e previstos (>= hoje), ambas restritas ao mês e às matrículas atualmente ativas. Hoje calculado no fuso America/Sao_Paulo e exibido na tela; vencimentos de hoje permanecem válidos no próprio dia, com rótulo explícito inclui hoje. Não reconstrói situação histórica no mês escolhido. Data de realização e vencimento têm cabeçalhos distintos.
Teste pcmso-mensal.cjs expandido com data fixa 10/11/2026: outubro passado aparece só em vencidos, ontem/hoje/amanhã separados, renovação posterior elimina validade antiga, HTML renderizado contém números/cabeçalhos corretos com DOM simulado. Demais testes de auditoria/abas e sintaxe dos scripts passaram. Sem conferência visual autenticada, escrita no banco ou publicação. Versão visual/cache v235.
