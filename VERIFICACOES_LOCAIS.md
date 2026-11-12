# Verificações locais e governança

Primeira etapa aplicada em 11/11/2026 na branch `chore/governanca-testes-locais`, base `c5ee81d`. Não inclui publicação ou alteração de dados/serviços.

## Evidência do alinhamento com Antigravity

Foram lidos a resposta `2026-11-11-2120-de-acordo-parecer-configuracoes-orca-codex.md` e o topo de `C:/Projetos/app-checklist-seguranca/scratch/ponte/ESTADO.md`. O estado registra explicitamente a correção sobre dados `[TESTE]` e a diferença entre chat Codex e terminal Copilot. Esses registros comprovam que o consenso foi documentado; não comprovam uma nova auditoria técnica nem controles implementados por Antigravity. Não foram encontrados novos artefatos de execução para esse alinhamento. Isso não exclui trabalho não registrado.

## Comandos

| Comando | Cobertura e limites |
| --- | --- |
| `npm test` | 15 arquivos revisados de simulações/asserções estáticas; cada arquivo roda em processo próprio com rede, escrita e subprocessos não autorizados. |
| `npm test -- --list` | Lista a seleção sem executar os testes. Novos arquivos não entram automaticamente. |
| `npm run check:syntax` | `node --check` em JS/CJS da raiz, dashboard, api e scripts; sem executar código. Não cobre scripts inline do HTML. |
| `npm run lint` | Mantém o lint legado de app.js, data.js e dashboard/dashboard.js. |
| `npm run lint:modules` | Adiciona os 19 módulos: `no-undef`, ambiente navegador, declarações de topo e atribuições explícitas `window.nome = ...` dos scripts locais de index.html. Retorna erro se houver ocorrências. |
| `npm run check:local` | Encadeia sintaxe, lint legado, testes e lint dos módulos. Para na primeira etapa que falhar; não significa homologação do app. |
| `npm run preview:dashboard` | Prévia estática em http://localhost:3000/dashboard/. Não simula APIs nem isola serviços. |
| `npm run preview:isolated` | Painel completo em http://127.0.0.1:32408/dashboard/ com autenticação, bibliotecas externas e dados simulados; conexões externas bloqueadas. Não é teste de Auth/RLS reais. |

`npm test` exige Node.js 26 ou superior por utilizar as permissões de rede dessa versão. A máquina analisada tem v26.3.1. Não há execução alternativa sem restrições em versões antigas. Um preflight verifica negação real de TCP, escrita e subprocessos antes da suíte; credenciais e `NODE_OPTIONS` do terminal não são herdados. A leitura do repositório é permitida: isso não é uma sandbox completa contra código malicioso nem impede a leitura de arquivos privados dentro da pasta. Não carregar `.env` nos testes.

Os testes podem trocar `fetch` por mocks em memória. As restrições continuam aplicadas às conexões reais do processo. Não liberar rede para contornar teste falhando; corrigir o mock ou planejar teste separado em ambiente isolado.

## Cobertura ainda separada

Quatro arquivos dependem de Playwright e ficam fora do runner: `cronograma_pastas.test.cjs`, `relatorio_sms_fotos.test.cjs`, `relsms_fotos_manuais.test.cjs` e `relsms_importacao_segura.test.cjs`. Precisam de revisão de interceptações, dependências e efeitos no navegador antes de uma execução agregada. Esta etapa não instala Playwright nem executa esses arquivos. O bloqueio do Node não protege um navegador lançado em outro processo.

O lint ampliado não executa scripts, não verifica ordem de inicialização nem interpreta HTML inline. Reconhecer uma exportação `window` não prova que ela foi inicializada no momento da chamada. Não adicionar globais arbitrárias para silenciar achados.

## Resultados da primeira etapa (antes das correções)

- Antes das mudanças: lint legado aprovado.
- Após a implementação: 12/12 arquivos da suíte local aprovados; preflight das permissões aprovado.
- Sintaxe: 57/57 arquivos aprovados. Lint legado, lint dos quatro scripts novos e `git diff --check` aprovados.
- Lint dos módulos: 14 ocorrências em código de produto não alterado nesta etapa. Não são 14 defeitos confirmados: há referências que exigem investigação e branches de compatibilidade Node (`require`/`Buffer`). Não foi criada baseline que silencie erros.
- O lint ampliado retorna código 1, portanto a verificação agregada permanece reprovada até triagem/correção desses achados.
- Evidência local (ignorada pelo Git): `scratch/governanca/check-local.log`, execução agregada com código 1 na etapa dos módulos. Nenhuma alteração nos módulos, PWA, API ou tags de scripts foi necessária.

| Arquivo em dashboard/modules | Referências apontadas |
| --- | --- |
| treinamentos_ddsma.js | rebuildTreinamentosStatusInMemory; dossieColaboradorAtual (2) |
| efetivo_ferias.js | formatarDataBr (3) |
| ghe_os.js | navegarParaAvaliacaoPsicossocialDoGhe |
| relatorio_sms_nc.js | require; supabaseUser (3) |
| relatorio_sms_fotos.js | Buffer (2) |
| epi_estoque.js | matricula |

## Regras operacionais

- Branch própria por melhoria; um responsável pela edição de cada arquivo; revisão sem concorrência de escrita.
- Mocks locais ou banco isolado por padrão. Dados `[TESTE]` em produção afetam relatórios e sincronizações; exigem autorização expressa e escopo delimitado.
- Banco isolado requer também integrações externas isoladas. Abrir o painel local não é autorização para gravar no serviço configurado.
- Push/deploy/alterações remotas dependem da autorização correspondente de João. Esta etapa não modifica configurações globais de permissões/modelo do Orca nem cria infraestrutura.
- A ponte é local e ignorada pelo Git. Nesta máquina está em `C:/Projetos/app-checklist-seguranca/scratch/ponte`; verificar sua existência em outras sessões. `avisar-copilot.ps1` procura terminal Copilot, não um chat Codex. Registrar arquivo salvo, aviso aceito e leitura confirmada separadamente; não prometer acionamento automático do chat.
- A skill global antiga não foi alterada: o repositório passa a explicitar que suas instruções para ambiente sem shell não se aplicam ao trabalho local autorizado.

Próxima etapa técnica: investigar os achados do lint por fluxo, com teste específico antes de corrigir funções de negócio. Validação funcional em navegador, autenticada e de produção permanece separada desta revisão estática/simulada.

Investigação realizada em 11/11/2026: ver `dashboard/LINT_MODULOS_INVESTIGACAO.md`. As 14 ocorrências foram classificadas e 10 cenários diagnósticos reproduzidos localmente. Confirmadas falhas na sincronização de status, nas datas de terceiros e no botão Fatores NR-01 sem hook; demais grupos incluem autoria genérica, global implícita e compatibilidades protegidas. Nenhuma correção de produto aplicada nessa investigação.

## Correções locais posteriores, autorizadas em 11/11/2026

João autorizou iniciar as correções e escolheu explicitamente o destino Psicossocial global para o botão do PGR. Corrigidos o id da sincronização, aviso de alteração parcial, datas de terceiros, destino/texto do botão e autoria SMS. Estado do dossiê declarado; compatibilidades usam propriedades explícitas do host. Sete recursos alterados receberam cache-buster 303, sem aumento global de versão.

`npm run check:local`: código 0; sintaxe 58/58, testes 13/13 arquivos, lint legado e 19 módulos sem ocorrências. A suíte nova contém nove testes de regressão; antes das correções, cinco dos sete primeiros falharam, além da ausência do helper de autoria. Lint da suíte nova e `git diff --check` aprovados. Log: `scratch/governanca/correcoes-check-local.log`.

Interação no navegador Orca com fixture local, funções reais extraídas e serviços simulados: três cliques conferiram data exportada, sincronização do id 100 e destino psicossocial/visao; nenhum erro JS registrado. Evidência: `scratch/governanca/correcoes-browser.json`. CSP da fixture bloqueia conexões. A captura de tela falhou duas vezes (`Screenshot timed out — the browser page did not draw a frame`), inclusive após ativar a aba. Portanto não houve inspeção visual concluída, nem validação do painel completo, autenticada ou de produção.

Limitações: gravações independentes de Checklist/Efetivo continuam não atômicas; falha é explicitamente informada, sem rollback automático. Autoria SMS usa `getUser` do cliente existente; indisponibilidade deixa `Autoria não verificada`, sem bloquear o fluxo legado. Nenhuma migração, login, permissão ou dado de produção foi alterado. Ver a atualização ao fim de `dashboard/LINT_MODULOS_INVESTIGACAO.md` para pendências fora das 14 referências.

## Continuação: atalho GHE, indicadores de Kits e captura local

Corrigido também o handler inline do cartão GHE, com destino e texto Psicossocial global. Após salvar presença de Kits, o painel invalida caches e renova os status pela fonte existente, sem recalcular regras SST. Falha posterior à gravação é diferenciada de falha ao salvar, para evitar repetir o lançamento. Cobertura adicional: cinco cenários nas duas declarações de salvamento. A suíte de regressão passa a 11 testes; o total continua em 13 arquivos.

Verificação agregada novamente aprovada, código 0: 58 arquivos com sintaxe válida, 13 arquivos de testes, lint legado e 19 módulos sem ocorrências. Log `scratch/governanca/continuacao-check-local.log`.

Foi possível concluir a inspeção visual da fixture pelo endereço HTTP local, sem as falhas da tentativa anterior com data URL. A captura longa apresentou repetição; a evidência final é a captura de janela 1200×1200, conferida em `scratch/governanca/continuacao-janela.png`. Servidor temporário expôs somente o HTML de teste e foi encerrado. Isso não valida o painel completo nem substitui teste autenticado em ambiente isolado. Playwright não está instalado nesta worktree e não foi instalado nesta etapa. Sem push/deploy ou dados reais.

## Painel completo em simulação local

Agora existe uma prévia reutilizável: `npm run preview:isolated`, com servidor em `scripts/preview-dashboard-isolado.cjs` e mocks/verificadores em `dashboard/tests/isolado/`. Usa o HTML, CSS, scripts locais e handlers reais do painel; substitui autenticação, dados e bibliotecas de CDN. Imports de fontes externas são removidos apenas da resposta de CSS dessa prévia. CSP impede conexões externas, frames, workers e submissões de formulário. Servidor com lista explícita de arquivos permitidos, bind em loopback e encerramento automático em 15 minutos. Acesso a arquivo fora da lista foi recusado com 404.

Os mocks e verificadores recusam origem diferente de http://127.0.0.1:32408 antes de acessar o armazenamento/DOM; os verificadores exigem também o contexto da fixture. O HTML de produção não carrega o mock. Pasta e servidor local foram adicionados ao `.vercelignore`, sem executar publicação. Há dois testes de regressão dessas condições em `dashboard/tests/preview_isolado.test.cjs`.

Navegador Orca: 9/9 cenários de inicialização, terceiros, exportação simulada, cancelamento, status duplo, GHE/Psicossocial, retorno de navegação, Kits e identidade simulada; mais 4/4 após recarga (bootstrap, persistência de status/terceiros, presença única e troca de editar para novo cadastro). Nenhum erro JS/unhandled rejection, console.error ou endpoint fora do mock nos resultados finais. Checagem de recursos: zero scripts CDN, zero imports CSS externos e zero recursos fora da origem local. Persistência é do mock, não de PostgreSQL real.

Na preparação inicial, dados fictícios de PJ usavam campos não reconhecidos; a fixture foi corrigida e o cache dessa origem de teste foi invalidado. Essa primeira execução foi preservada separadamente; não houve alteração de código de produto para contornar a preparação do teste.

Artefatos locais: `scratch/governanca/painel-completo-resultados.json`, `painel-completo-recarga.json`, `painel-completo-isolamento.json`, `painel-completo-check-local.log` e captura `painel-completo-terceiros.png`, conferida visualmente. Servidor encerrado após os testes. Instruções de repetição em `dashboard/tests/isolado/README.md`.

Verificação agregada final: código 0, sintaxe 63/63 arquivos, testes 14/14 arquivos, lint legado e 19 módulos sem ocorrências. Verificação de sintaxe e lint do servidor de prévia e testes novos aprovados. Nenhuma nova alteração funcional de produto nesta etapa; não há incremento de cache do painel por causa da ferramenta local.

Limites: sem Auth, PostgreSQL, RLS, concorrência, Drive, gráficos Chart reais ou arquivos Word/Excel reais. Não houve login operacional nem instalação de dependências. Teste autenticado com backend isolado real e atomicidade de status continuam pendentes. Não publicar a fixture como sistema operacional. Sem commit/push/deploy ou dados reais.

## Avanço posterior: Auth/PostgreSQL reais locais

Concluídos 15 cenários com backend real local, documentados em `dashboard/HOMOLOGACAO_BACKEND_LOCAL.md`: quatro de Auth/permissões da fixture, seis de navegador com persistência SQL, dois de falhas controladas, dois de recarga e um de bloqueio de edição pelo perfil leitor. GoTrue/PostgREST/PostgreSQL reais; apenas dados fictícios. Bibliotecas e módulos auxiliares permaneceram simulados. A fixture deriva do esquema local e foi complementada pelo contrato atual; não é réplica homologada de produção.

As negações reais de permissão comprovaram os avisos de alteração parcial e presença salva com indicadores não atualizados. Recarga preservou sessão real, status nas duas tabelas e a view da última realização. Captura autenticada conferida; evidências locais em `scratch/governanca/backend-real/consolidado.json` e arquivos relacionados.

Instância exclusiva, servidor e aba encerrados, volumes preservados e Docker Desktop devolvido ao estado desligado após confirmar ausência de outros contêineres. Sem instalação npm, login operacional, push/deploy ou operações em serviços de produção. Nenhuma alteração funcional de produto nesta etapa. Compatibilidade operacional, integrações externas, concorrência e atomicidade continuam separadas do que foi demonstrado.

## Status conjunto — etapa posterior local

A implementação transacional substitui o aviso de gravação parcial no comando interno de acesso. Ver dashboard/STATUS_COLABORADOR_ATOMICO.md: 20 cenários reais locais, 13 simulados, oito testes específicos e agregado aprovado (64 arquivos de sintaxe, 15 de testes, 19 módulos). SQL apenas proposto/testado localmente; produção recebeu somente consultas de leitura de metadados. Não publicar frontend antes do banco. Outros fluxos de status permanecem fora desse incremento.


## Publicação autorizada em 12/11/2026

João autorizou a continuidade e publicação do conjunto. A migração 20261112085020_status_colaborador_atomico foi aplicada primeiro no projeto segtrab; metadados e negação HTTP anônima conferidos, sem gravação de dados operacionais. O corpo coincide com o validado localmente; a migração acrescenta recarga do schema. Painel publicado pela PR nº 2, commit e9ea39a, deployment READY. Doze recursos conferidos por SHA-256/HTTP200 e artefatos internos inacessíveis. Navegador operacional aprovou shell, Efetivo/Terceiros e consulta de indicadores em leitura; confirmação de Auth falhou por sessão legada sem AuthSession. Não houve teste de gravação em produção; o comando de status exige login por e-mail da conta responsável. Rastreio na ponte e scratch/governanca/publicacao. As menções anteriores a ausência de autorização/publicação são históricas.
