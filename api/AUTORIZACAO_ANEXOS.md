# Autorização de anexos — entrega local

Atualização de 12/11/2026: ativação autorizada por João em andamento. Concessões do responsável e de Saúde foram provisionadas, preservando as demais contas. Saúde mantém convite pendente, sem senha definida: nenhuma confirmação administrativa ou troca de senha foi realizada. Referência de fotos configurada na Vercel; ver `PREPARACAO_ATIVACAO_ANEXOS.md` para estado atual. As seções seguintes descrevem as etapas históricas da implementação local.

12/11/2026, branch `fix/seguranca-urls-anexos`, base `dcca1e9`. Implementação local concluída e testada com serviços simulados. **Não publicada nem habilitada em contas operacionais.** A etapa anterior de diagnóstico está em `REVISAO_SEGURANCA_ANEXOS.md`; suas pendências de autorização foram tratadas neste incremento.

Preparação posterior: 16 cenários adicionais passaram com Auth/PostgreSQL/PostgREST reais locais e Drive simulado. Contas/configurações operacionais foram apenas consultadas, sem concessões. E-mail de Saúde ainda pendente; acesso geral da pasta de Saúde observado como Restrito. Ver `PREPARACAO_ATIVACAO_ANEXOS.md` para o plano concreto e limites.

## Regra de Saúde aprovada por João

Anexos de Saúde permanecem restritos, sem compartilhamento público automático. O servidor recusa essa concessão inclusive quando solicitada por administrador ou chamada direta. Antes do envio, confere as permissões das pastas: acesso `anyone`, inclusive herdado, bloqueia a operação. O painel não apresenta a pergunta de publicação para Saúde.

Isso não altera permissões de arquivos ou pastas já existentes. A abertura de PDFs privados pelo link do Drive continua dependendo das permissões corporativas de leitura dessas pastas; login no painel não concede automaticamente acesso na conta Google. Essa compatibilidade precisa ser conferida com as contas reais antes da ativação. Alterações posteriores feitas diretamente no Drive não são controladas por estas APIs.

## Fonte de autorização

Os cinco endpoints verificam o Bearer Token no serviço Auth, exigem e-mail confirmado e recusam usuário anônimo. Em seguida exigem uma concessão administrativa versionada em `user.app_metadata.anexos`, obtida do Auth por `/auth/v1/user`. A concessão não vem do corpo, do navegador ou de `user_metadata`.

Isso é necessário porque tabelas legadas possuem permissões amplas. Uma linha que declare matrícula 76 ou nível Admin não pode, sozinha, promover uma conta para acessar o Drive. Os vínculos e perfis existentes ainda são consultados para restrição/desativação, mas não podem ampliar o teto definido no Auth. Referências em `anexos_sms` também não autorizam, sozinhas, leitura de um arquivo privado: exigem classificação registrada pelo servidor no Drive ou descendência da raiz editorial de fotos autorizada.

Exemplos de concessões, para revisão antes de qualquer provisionamento (não aplicar automaticamente a usuários):

| Uso | Valor de app_metadata.anexos |
| --- | --- |
| Responsável com acesso administrativo | `{"versao":1,"admin":true}` |
| Saúde | `{"versao":1,"saude":true}` |
| Leitura geral | `{"versao":1,"ver_todos":true}` |
| Editor de treinamentos | `{"versao":1,"modulos":["treinamentos"],"modulos_edicao":["treinamentos"]}` |

`interno:true` preserva a regra ampla de técnico interno somente quando esse poder for concedido administrativamente; não é deduzido automaticamente da presença no cadastro. Perfis continuam limitando edição/leitura conforme seu escopo. A restrição de Saúde também é mantida quando identificada no vínculo legado, sem conceder poderes ausentes no teto.

Ampliar permissões exige atualizar a concessão por Auth Admin, além do perfil quando aplicável. Para revogação efetiva, remover/restringir a concessão no Auth; não depender apenas de tabelas legadas eventualmente alteráveis. Cada pedido consulta o usuário no servidor, portanto não basta reapresentar um JWT antigo contendo a autorização anterior. Não foram modificados RLS, grants, contas ou metadados de produção.

## Fluxo implementado

- Iniciar: valida usuário, edição no módulo, campos e destino. Não administrador só usa pastas verificadas de seu módulo. `infoOnly` consulta sem criar pastas. Metadados privados do arquivo recebem UID, tabela e nonce definidos pelo servidor.
- Sessão: HMAC com chave derivada por domínio de `ANEXOS_SESSION_SECRET` ou do segredo OAuth já existente, nunca enviado ao navegador. Ticket de uma hora vincula UID, finalidade, URL, pasta e nonce. Recomenda-se segredo dedicado aleatório de pelo menos 32 bytes ao preparar a ativação. Rotação invalida tickets anteriores.
- Pedaços: assinatura, usuário e permissão são conferidos novamente antes de enviar bytes. Outra conta, URL trocada, sessão forjada/expirada ou concessão revogada não enviam conteúdo ao Google.
- Finalizar: exige confirmação explícita e verifica arquivo, pasta, UID, tabela e nonce. Nunca permite Saúde. Nos outros módulos, o painel pergunta antes de conceder link público; cancelar mantém privado. A concessão, quando autorizada, usa `allowFileDiscovery:false`.
- Imagens/listagem: Auth e escopo de leitura; conteúdo credenciado tem cache privado e não segue redirects com Bearer. Arquivos privados legados sem classificação/raiz verificável são recusados, mesmo se houver referência gravável no banco. Não são reclassificados automaticamente.
- Painel: `fetchApiAnexos` leva Auth/tickets, mantém estado apenas em memória por UID e descarta resposta atrasada após logout/troca de conta. Falha não repete upload nem desvia para Apps Script. SMS exige o caminho autorizado em pedaços e só marca acesso público após confirmação real, inclusive respeitando cancelamento.

O fallback legado de Apps Script não foi reescrito nem auditado como serviço externo; recusas/falhas desta API não acionam automaticamente esse caminho protegido. `cronograma-pastas` permanece fora desta alteração funcional. Os limites de URL/tamanho, incluindo imagem de 20 MB e pedaço de 3 MB, estão no relatório anterior; não constituem rate limiting, antivírus nem controle global das cotas do provedor.

## Evidências e limites

| Verificação | Resultado |
| --- | --- |
| Destinos, redirects, imagens, chunks e erros | 14 testes aprovados |
| Auth, teto administrativo, Saúde, sessão, vínculo, revogação, pastas e referência forjada | 18 testes aprovados |
| Cliente, logout, resposta atrasada, troca de conta e bloqueio de fallback | 9 testes aprovados |
| Regressões SMS, incluindo cancelamento e erro de compartilhamento sem repetir envio | 21 testes da suíte SMS aprovados |
| Agregado check:local | Sintaxe 70/70; 18/18 arquivos de testes; lint legado e 19 módulos aprovados |
| Lint adicional de handlers/helpers/testes | 11 arquivos, zero ocorrências |
| Painel completo → HTTP local → handlers reais | 7 cenários aprovados; Auth/banco/Drive simulados |
| Recarga sem recuperar ticket antigo | Aprovada |
| Regressão do painel e recarga | 9 + 4 cenários aprovados |

A captura do shell foi inspecionada visualmente. Na recusa proposital do leitor, o painel registra um erro esperado; não houve erro inesperado de bootstrap nem destino não simulado. Cenários anteriores de Auth/PostgreSQL reais pertencem a outra entrega e não são usados como prova desta autorização nova.

Na primeira etapa, Auth/banco/Drive foram simulados. A continuação documentada em `PREPARACAO_ATIVACAO_ANEXOS.md` acrescentou Auth e banco reais locais, incluindo testes de metadados protegidos e revogação com JWT anterior; gravações no Drive permaneceram simuladas. Metadados de pastas reais foram apenas consultados. Referências da plataforma: [RLS e metadados](https://supabase.com/docs/guides/database/postgres/row-level-security) e [API administrativa de usuário](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid). Esses testes não equivalem à homologação operacional ou de produção.

Evidências ignoradas pelo Git: `scratch/governanca/seguranca-apis/`, especialmente `check-local-auth.log`, `auth-testes.log`, `cliente-testes.log`, `sms-com-auth.log`, `painel-anexos.json`, `recarga-anexos.json`, `regressao-painel.json`, `regressao-recarga.json` e `painel-validado.png`. O servidor local usa a fixture da suíte e bloqueia chamadas não previstas; não carrega `.env`. Sua preparação e verificador também estão nessa pasta para reprodução local.

## Ativação futura em uma entrega agrupada

Antes de publicar: revisar os acessos concretos e provisionar somente as concessões aprovadas no Auth, preservando os demais metadados; validar Auth real e leitura de arquivos privados com as contas adequadas; confirmar configuração OAuth/segredo e compatibilidade das pastas legadas. Sem concessão, o acesso aos anexos será recusado — não publicar apenas o frontend nem habilitar todos os usuários por inferência das tabelas amplas.

Após autorização de publicação, agrupar código, testes e documentos numa única entrega; registrar as evidências posteriores na ponte, evitando PR/deploy extra apenas de documentação. Nenhum build remoto, PR, push, deploy, nova infraestrutura hospedada ou mudança de cobrança foi realizado nesta etapa. Docker não foi iniciado. O PWA e o Service Worker permanecem preservados.
