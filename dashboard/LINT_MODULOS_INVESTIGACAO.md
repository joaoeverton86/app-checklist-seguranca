# Investigação das 14 ocorrências do lint dos módulos

11/11/2026 — branch `chore/governanca-testes-locais`, base `c5ee81d`. Investigação estática e 10 cenários diagnósticos em Node/VM com funções reais extraídas por AST e dependências simuladas. Nenhuma correção de produto aplicada nesta investigação; nenhuma conexão ou gravação em serviços reais.

Esta é a fotografia anterior às correções. A atualização de implementação e validação está ao fim deste arquivo; as linhas citadas abaixo pertencem à base investigada.

## Classificação completa

As linhas referem-se ao código da base investigada.

| Referência | Ocorrências | Resultado |
| --- | ---: | --- |
| epi_estoque.js:3822 — matricula | 1 | Defeito reproduzido: PATCH no Checklist ocorre, mas a sincronização do Efetivo falha e é capturada como aviso. |
| efetivo_ferias.js:2421,2802,2803 — formatarDataBr | 3 | Defeito reproduzido: lista de terceiros com data de admissão e exportação com data preenchida geram ReferenceError. |
| ghe_os.js:9560 — navegarParaAvaliacaoPsicossocialDoGhe | 1 | A chamada é protegida, mas o hook não foi localizado nos scripts atuais. O botão Fatores NR-01 fica sem ação no cenário reproduzido. |
| relatorio_sms_nc.js:4607,4676,4816 — supabaseUser | 3 | Sem ReferenceError por causa do typeof, porém o identificador não foi encontrado no app atual. As três expressões de autoria retornam Gestor SST quando ele não existe; não leem a sessão disponível no armazenamento. |
| treinamentos_ddsma.js:10720,10899 — dossieColaboradorAtual | 2 | Atribuição sem declaração. Na execução clássica atual cria uma global implícita; abrir e fechar funcionaram na VM. Dívida de escopo, não quebra imediata demonstrada. |
| relatorio_sms_nc.js:4333 — require | 1 | Compatibilidade Node protegida por typeof e try/catch. Hash sem require funciona pelo fallback explicitamente rotulado. Não há falha de referência no navegador demonstrada. |
| relatorio_sms_fotos.js:384,410 — Buffer | 2 | Compatibilidade Node protegida por typeof e curto-circuito. Hidratação sem Buffer e com Uint8Array funciona; ambas as ocorrências têm a mesma proteção. |
| treinamentos_ddsma.js:9426 — rebuildTreinamentosStatusInMemory | 1 | Hook opcional protegido por typeof. Não foi localizada implementação atual; ausência não gera ReferenceError. Possível efeito na atualização em memória precisa de investigação do fluxo completo, não foi confirmado. |

Total: 14 ocorrências, distribuídas em oito grupos. Os avisos de compatibilidade não devem ser confundidos com as falhas reproduzidas; tampouco devem ser ocultados por globais fictícias.

## 1. Status de colaboradores: prioridade alta

`alternarAtivoColaborador` aparece no núcleo (`dashboard.js:37376`) e no módulo de EPI (`epi_estoque.js:3798`). O núcleo compara o id do Efetivo com o parâmetro `id`; o módulo usa `matricula`, inexistente nesse escopo.

`dashboard/index.html` carrega o núcleo antes de `modules/epi_estoque.js`. Ambas são declarações globais de função; a segunda substitui a primeira. Portanto a correção existente no núcleo não cobre a implementação que fica disponível após o carregamento normal dos scripts.

Reprodução local: executar a declaração do núcleo sincroniza o Efetivo; carregar depois a declaração do módulo e repetir a mesma ação envia o PATCH do Checklist, mas não faz upsert do Efetivo. O erro `matricula is not defined` é capturado internamente e a lista é recarregada, deixando uma alteração parcial simulada.

Sonda adicional condicional: com uma global alheia `matricula = '200'`, a ação para id `100` altera o Checklist de `100`, mas escolhe `200` para o Efetivo. Isso demonstra o risco de resolução global; não demonstra que essa global exista em produção.

Correção indicada: usar o parâmetro correto na implementação efetiva; testar desativar, reativar, cancelamento, ausência no Efetivo e falha de sincronização. Preservar a semântica atual de demissão e a sincronização dupla. A forma de apresentar falha parcial também precisa ser revisada: operações HTTP independentes não são atomicamente revertidas só por corrigir a variável.

## 2. Datas de terceiros: prioridade alta para uso da tela

A lista chama `formatarDataBr` quando `dt_admissao` existe; a exportação chama a mesma função para admissão e desmobilização. A única declaração de função homônima localizada no produto está dentro do escopo fechado de CNH, sem exportação para esse uso.

As duas funções reais foram executadas em VM com um terceiro fictício e data de admissão: ambas falharam com `formatarDataBr is not defined`. A função global `formatSimpleDate` existe no núcleo e já trata datas civis sem deslocamento de fuso; é candidata a reaproveitamento após testes de datas e legados.

Lacuna de teste confirmada: `dashboard/tests/terceiros_gestao.test.cjs:43` fornece `formatarDataBr: (dt) => dt`. O mock satisfaz uma dependência que não está disponível no app e permite a suíte passar. A correção deve ajustar a cobertura para não inventar essa função, verificando também o formato exibido/exportado.

## 3. Botão Fatores NR-01: prioridade média

O botão é gerado em `ghe_os.js:9938` com a ação `abrir-psico-ghe`; o listener exige o hook ausente antes de executar qualquer navegação. Foi reproduzido o clique sem hook: nenhum erro e nenhuma ação. Ao fornecer um hook simulado, a chamada passa a ocorrer.

Não basta adicionar uma função vazia para zerar o lint. É necessário localizar a rota/tela de destino correta, preservar a confirmação de descarte de alterações do Documento-Base e testar navegação com o GHE selecionado. Nenhuma regra ou conclusão SST deve ser criada para preencher essa lacuna.

## 4. Autoria e demais referências

Os três usos de `supabaseUser` têm fallback para `Gestor SST`: arquivamento, fechamento e reabertura. Na sonda, mesmo com e-mail fictício na sessão de armazenamento, todas as expressões retornam o genérico porque não consultam aquela sessão. Não houve teste com login real nem inspeção do banco; não afirmar que todos os registros históricos têm autoria incorreta. A correção deve adotar a identidade verificada pelo fluxo atual, sem inventar aprovação ou autoria técnica.

`dossieColaboradorAtual` só é atribuída nas duas ocorrências localizadas; em script clássico sem strict cria propriedade global. A solução deve declarar/encapsular o estado de maneira compatível ou remover a atribuição somente após confirmar todos os consumidores. Não foi demonstrada uma falha operacional atual.

`require`, `Buffer` e os hooks com typeof exigem tratamento do contrato/configuração da análise, não alteração indiscriminada de comportamento. A ausência de um hook opcional pode ainda ter efeito funcional, mas precisa de um teste do fluxo antes de ser classificada como defeito.

## Evidências e limites

- Script diagnóstico local: `scratch/governanca/investigar-14.cjs`.
- Resultado: `scratch/governanca/diagnostico-14.json`, 10/10 cenários reproduzidos conforme suas asserções. São asserções diagnósticas do comportamento atual, inclusive defeitos; não são 10 funcionalidades homologadas.
- Execução: `node --permission --allow-fs-read=. scratch/governanca/investigar-14.cjs`, sem liberar rede, escrita ou subprocessos ao script. O shell salva a saída JSON fora do processo restrito.
- Extração das funções por AST, sem executar o bootstrap do painel ou carregar credenciais. Supabase, Drive, DOM, identidade e exportação são simulados.
- A ordem dos scripts foi conferida no HTML. Não foi carregado o painel completo em navegador nesta investigação.
- Sem alterações nos módulos, no núcleo ou em `dashboard/index.html`; não há cache-buster a atualizar nesta etapa.
- Nenhum commit, push, deploy, SQL ou teste autenticado/de produção.

Ordem proposta de correção: status duplo, datas de terceiros, navegação PGR, autoria; depois estado implícito e contratos dos hooks/compatibilidade. Cada fluxo deve ganhar uma regressão que falhe no código atual e passe após a correção, sem simular uma dependência inexistente no app.

## Correções implementadas após autorização de João

- Status: módulo efetivo usa `id`, assim como o núcleo. As duas declarações agora propagam falha da sincronização ao aviso de alteração parcial; não tratam como sucesso uma atualização incompleta. Cancelar, reativar/desativar, preservar demissão, pessoa ausente no Efetivo, PATCH recusado e falha de upsert têm regressão local.
- Terceiros: lista/exportação usam `formatSimpleDate`, existente no núcleo. O teste anterior deixou de inventar `formatarDataBr`; carrega o utilitário real. Cobertura nova verifica ISO, data/hora, formato legado e ausência de datas.
- PGR: por escolha expressa de João, botão passa a dizer `Psicossocial global` e abre a visão global existente, sem filtro, avaliação ou diagnóstico por GHE. Mantida a confirmação de descarte do draft; testes cobrem cancelar e confirmar.
- SMS: helper `relSmsIdentificarAutorAtual` consulta `sbAuth.auth.getUser`; só usa email/UID se não houver erro e o usuário retornado tiver id. Sem identidade verificável, grava `Autoria não verificada`; não usa identidade editável em localStorage. Aplicado em arquivamento, fechamento e reabertura. Segundo a [documentação do getUser](https://supabase.com/docs/reference/javascript/auth-getuser), a consulta valida o usuário no servidor de autenticação. Nenhuma política ou login foi alterado.
- Dossiê: estado declarado explicitamente em `var dossieColaboradorAtual`. Hook opcional de treinamentos passa a consultar `window`, como a versão já existente no núcleo; nenhuma reconstrução fictícia foi adicionada.
- Compatibilidade: referências a Buffer/require passaram a consultar propriedades explícitas `globalThis` do host. Testes verificam SHA-256 quando o host fornece require e fallback quando não fornece. Não foi adicionada lista de globais fictícias nem desativada a regra de lint.
- Cache-buster: somente núcleo e seis módulos modificados receberam `?v=303`; PWA, SW e demais tags preservados.

Resultados: `npm run check:local` código 0; 58/58 arquivos com sintaxe válida, 13/13 arquivos de testes aprovados (incluindo nove regressões novas), lint legado e lint de 19 módulos sem ocorrências. As primeiras sete regressões apresentavam cinco falhas antes dos patches. A regressão de autoria também foi executada antes da criação do helper e falhou como esperado. Não equiparar ausência de lint a ausência de defeitos no produto.

Navegador: fixture isolada com funções reais e mocks confirmou três interações no DOM; sem erro JS registrado. A captura visual do Orca falhou por timeout de desenho. Não foi validado o painel completo, nem telas autenticadas ou produção. Evidências locais em `scratch/governanca/correcoes-check-local.log`, `regressao-antes.log`, `autoria-antes.log`, `correcoes-browser.json` e `previa-correcoes.html`.

Pendências: atomicidade de status não foi implementada; a alteração parcial é informada. O hook opcional de reconstrução de treinamentos continua ausente e seu impacto funcional não foi demonstrado. Há um outro botão antigo no cartão de risco do GHE, com texto `Gerenciar Fatores NR-01 deste GHE`, que cita `abrirGestaoPsicossocialPorGhe` dentro de HTML gerado; essa função também não foi localizada. Ele não está nas 14 ocorrências do lint e não foi modificado como parte do botão do Documento-Base escolhido por João. Deve ser tratado em revisão específica de handlers inline, sem inventar uma tela por GHE.

Alterações permanecem locais e sem commit, push, deploy ou operações no banco.

## Continuação autorizada por João

- O segundo botão, no cartão do GHE, também foi corrigido: `Abrir Psicossocial global`, apontando para a visão corporativa já existente. Não há promessa de avaliação por GHE. Regressão executa o handler inline real para conferir rota e subaba.
- Confirmado que salvar presença em Kits atualizava `allTreinamentosRealizados`, mas deixava `allTreinamentosStatus` e `prontidaoDadosCalculadosCache` antigos. O primeiro alimenta os alertas de NR; o segundo pode ser reutilizado pelo dossiê/prontidão.
- Adicionado `atualizarStatusTreinamentosAposPresenca`, no módulo responsável: invalida caches de realizados/status e a prontidão; consulta a mesma fonte `treinamentos_status` já usada pelo painel; exige resposta em array e só então substitui a lista em memória. Não inventa cálculo de validade, classificação ou aptidão.
- As duas declarações de `salvarPresencaTurmaDiretoKits` foram alinhadas. Se a gravação ocorreu e a leitura posterior falhar, a mensagem informa que a presença está salva, os indicadores não foram atualizados e o lançamento não deve ser repetido. Falha na gravação e cancelamento não fazem a consulta posterior.
- O hook opcional externo de reconstrução permanece compatível, mas não é necessário para renovar os dados após salvar. O núcleo usa a propriedade `window` do helper do módulo; a ordem de scripts já carrega esse módulo antes da interação.
- Duas regressões adicionais, com cinco cenários de Kits em ambas as declarações (sucesso, leitura indisponível, resposta inválida, gravação recusada e cancelamento). As novas regressões falhavam antes; agora a suíte tem 11 testes e passa.
- Cache-buster 303.1 somente no núcleo, treinamentos e GHE nesta continuação; demais recursos mantêm os valores anteriores.

Validação: agregado `check:local` código 0, sintaxe 58/58, 13 arquivos de testes aprovados, lint legado e 19 módulos sem ocorrências; lint da suíte de regressão e diff-check aprovados. Log: `scratch/governanca/continuacao-check-local.log`; evidência anterior aos patches: `continuacao-antes.log`.

Captura visual resolvida para a fixture: servida por HTTP em loopback com servidor temporário que expõe somente o HTML de teste, mantendo CSP sem conexões externas. Três cliques no navegador Orca confirmaram datas, status duplo simulado e destino global. A captura de janela em 1200×1200 foi inspecionada visualmente: `scratch/governanca/continuacao-janela.png`. A captura longa teve artefato de repetição e não foi usada como evidência visual final. O servidor foi encerrado após o teste.

Isso não constitui validação do painel completo/autenticado. Playwright não está instalado nesta worktree; não houve instalação de dependências ou navegação no painel operacional. Permanecem as limitações de atomicidade de status e necessidade de validação autenticada em ambiente isolado antes de publicação. Sem publicação ou alterações em serviços reais.

## Ampliação: estrutura completa do painel com mocks

Concluída validação da estrutura completa (28 páginas e scripts reais) no navegador Orca, usando `npm run preview:isolated`. A ferramenta local, mocks e dois verificadores estão versionáveis no projeto, com bloqueio de origem nos scripts de simulação e exclusões específicas em `.vercelignore`. O código de negócio não foi modificado nesta etapa.

Nove cenários de fluxos e quatro após recarga aprovados, incluindo datas de terceiros, cancelamento de edição, sincronização de status, navegação GHE para a tela Psicossocial real, salvar presença em Kits e persistência simulada sem duplicação. Resultado final sem erros JS/console.error ou endpoints não previstos. Mock inicial de PJ foi corrigido para o contrato real (`estabilidade`/`empresa`) e cache exclusivamente dessa origem foi limpo; saída anterior preservada. Não confundir correção do teste com novo defeito de produto.

Captura do painel completo em `scratch/governanca/painel-completo-terceiros.png`, conferida visualmente. Resultados e recursos em `painel-completo-resultados.json`, `painel-completo-recarga.json` e `painel-completo-isolamento.json`. A verificação final registrou zero recursos fora da origem local, sem CDN ou imports de fontes externas. O servidor foi encerrado.

Agregado local: sintaxe 63/63, testes 14/14 arquivos e lint 19 módulos sem ocorrências. Guia em `dashboard/tests/isolado/README.md`. Auth, dados e bibliotecas externas foram simulados; não foram validados RLS, concorrência PostgreSQL, autenticação real, Drive nem geração real de documentos/gráficos. Sem publicação ou dados reais. A pendência agora é o backend isolado real e a homologação autenticada, não mais a montagem do painel no navegador.
