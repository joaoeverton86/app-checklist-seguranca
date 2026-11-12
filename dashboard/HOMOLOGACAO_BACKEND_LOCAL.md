# Homologação dos fluxos corrigidos com backend local real

Execução em 11/11/2026, encerrada às 01:47 UTC de 12/11/2026. Branch `chore/governanca-testes-locais`. Nenhuma alteração funcional adicional de produto nesta etapa; nenhuma operação em serviços de produção.

## Resultado

15 cenários aprovados, com GoTrue, PostgreSQL e PostgREST reais em uma instância Docker exclusiva:

| Grupo | Cenários | Evidência local em scratch/governanca/backend-real |
| --- | ---: | --- |
| Autenticação de dois usuários, leitura do editor, bloqueio de inserção do leitor e bloqueio anônimo | 4 | resultado.json |
| Login do painel, datas de terceiros, cancelar/trocar formulário, status duplo, presença/view SQL, autoria SMS | 6 | browser-resultados.json |
| Falha do Efetivo após gravar Checklist; falha de leitura de status após salvar presença | 2 | falha-parcial-status.json e falha-leitura-kits.json |
| Persistência da sessão e dados/view após recarregar | 2 | recarga.json |
| Login real do leitor bloqueia salvamento pela interface; editor restaurado | 1 | leitor-ui.json |

Consolidado: `scratch/governanca/backend-real/consolidado.json`. Captura do painel autenticado: `painel-autenticado.png`, conferida visualmente. Sem erros inesperados de JavaScript nas execuções normais. Os cenários de negação de permissões provocam erros HTTP/avisos esperados e foram registrados separadamente.

## Escopo real e simulado

O painel foi servido com seu HTML, CSS e scripts reais. Somente a resposta local do núcleo recebeu URL/chave pública da instância local, em memória; os valores do produto não foram alterados. O SDK do Supabase é o mesmo pacote/versão 2.115.0 já referenciado no HTML, obtido para o laboratório e servido localmente. SHA-256: `F387E5935730A6D9599A281986A176EAFCE5EBBE7514446222D21AA029E31DD5`.

Login pelo formulário externo do painel, validação de usuário e persistência da sessão usaram o serviço Auth real. Foram criadas duas contas fictícias com credenciais efêmeras geradas em memória; nenhum login operacional ou credencial de João foi utilizado. O fluxo segue as interfaces documentadas de [criação de usuário local pelo administrador](https://supabase.com/docs/reference/javascript/auth-admin-createuser) e [login por senha](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

Dados de colaboradores, catálogo/realizações de treinamentos, view de status, perfis/usuários do painel e auditoria passaram pelo PostgREST e PostgreSQL reais. O servidor conferiu o resultado das ações com consultas SQL independentes, sem usar o cache do navegador como prova de persistência.

Bibliotecas de gráficos/documentos/Excel e leituras de módulos auxiliares fora do escopo permaneceram simuladas. A lista de leituras auxiliares está no resultado do navegador. Drive, armazenamento externo, geração real de documentos e dados operacionais não foram exercitados. A prévia bloqueou destinos externos e permitiu somente a origem do laboratório e a API local; nenhuma chamada foi direcionada à produção.

## Esquema e permissões da fixture

Este laboratório NÃO é uma réplica homologada de produção. As quatro tabelas de colaboradores/treinamentos foram derivadas das declarações locais em `supabase_schema.sql`, preservando tipos e padrões estruturais, sem copiar políticas permissivas do arquivo legado. Defaults pessoais de instrutores/responsáveis e senha legada foram retirados da fixture.

O arquivo legado não contém a coluna `aproveitamento` enviada pelo fluxo atual de Kits; a fixture foi complementada com essa coluna. Isso demonstra divergência entre arquivo local e contrato do cliente, não prova que a coluna esteja ausente do banco operacional.

A view de status usa o critério local de última realização por matrícula/curso e foi criada com `security_invoker=true`. Perfis/usuários e uma tabela de permissões de homologação foram criados exclusivamente na instância inédita.

Papéis mapeados para o teste:

- Editor autenticado: lê as linhas fictícias e pode inserir/atualizar no conjunto de tabelas da fixture.
- Leitor autenticado: lê as mesmas linhas fictícias; não pode inserir. A interface recebe lista vazia de módulos de edição e também bloqueia salvamento.
- Anônimo: sem acesso de leitura às tabelas protegidas da fixture.
- Administrador de preparação: usado somente pelo runner local para provisionar contas e conferir dados; nenhuma chave administrativa foi entregue ao painel.

As políticas RLS testadas são de homologação, não as políticas operacionais. Não declarar auditoria ou aprovação da RLS de produção a partir deste resultado.

## Falhas controladas e limite de atomicidade

Foi revogada temporariamente, apenas na fixture, a permissão de inserir/atualizar o Efetivo. A função real salvou o Checklist, recebeu recusa no Efetivo e exibiu o aviso de alteração parcial. SQL confirmou `ativo=false` no Checklist e `status=ATIVO` no Efetivo. A permissão foi restaurada em bloco finally, e o fluxo normal reativou os dois cadastros.

Depois, a leitura da view `treinamentos_status` foi recusada temporariamente. A presença foi persistida uma única vez, mas o painel informou que os indicadores não foram atualizados e orientou a não repetir o lançamento. Após restaurar a permissão, a recarga mostrou duas realizações de datas diferentes e uma linha de status com a realização mais recente, conforme a view SQL.

Esses testes comprovam os avisos e os resultados parciais. A sincronização Checklist/Efetivo continua sendo duas operações independentes: não foi criada transação única, rollback ou RPC nova. Resolver atomicidade exige desenho próprio e avaliação dos fluxos de campo/painel antes de qualquer alteração operacional.

## Ambiente e encerramento

- Supabase CLI 3.1.0 já instalado no ambiente de homologação anterior; nenhuma dependência npm foi adicionada.
- Docker Desktop estava desligado e foi iniciado para o teste. Contexto verificado por named pipe local; overrides remotos recusados.
- Instância bem-sucedida: `governanca-85893f44ca`; API local 56431, banco 56432 e painel 32409. Nome inédito e ausência de contêineres/volumes com esse nome foram conferidos antes da criação.
- Duas preparações anteriores falharam antes dos testes: sanitização incorreta de default SQL e carregamento do bundle de navegador como CommonJS. Causas identificadas e preparo corrigido; saídas preservadas em `resultado-primeira-preparacao.json` e `resultado-segunda-preparacao.json`. Não foram defeitos do produto.
- As três instâncias foram encerradas preservando volumes, sem `--all`, `--no-backup`, DROP ou reset. O consolidado registra o volume da instância bem-sucedida preservado.
- Aba do laboratório e servidor encerrados; nenhum contêiner permaneceu ativo. Docker Desktop foi desligado para restaurar seu estado inicial, após verificar ausência de outros contêineres.
- Scripts e configurações do laboratório permanecem somente em `scratch/`, ignorado por Git/Vercel. Não transportar credenciais ou reutilizar o laboratório como ambiente operacional.

## Próximas verificações

A autenticação e a persistência locais reais deixaram de ser pendência nos fluxos descritos. Permanecem: compatibilidade com esquema/políticas operacionais atuais, integrações reais de anexos/Drive/documentos, concorrência e atomicidade de status. Nenhuma validação ou publicação em produção foi feita. Os resultados anteriores de sintaxe/lint/testes locais continuam sendo evidências separadas, não garantias absolutas de integridade.

## Etapa posterior

Este relatório preserva o teste histórico das gravações independentes. A correção posterior e seus novos testes estão em STATUS_COLABORADOR_ATOMICO.md; o comando interno de acesso passou a usar uma transação na branch local. Não publicado.
