# Status conjunto de acesso — entrega local

Implementado na branch `chore/governanca-testes-locais`, em 11/11/2026 (evidências em UTC de 12/11). João autorizou a publicação na conversa e pediu continuidade. **Função ativada no banco em 12/11/2026, migração `20261112085020_status_colaborador_atomico.sql`; integração/publicação do painel em andamento.**

## Comportamento

O comando `alternarAtivoColaborador`, nas duas declarações do núcleo/EPI, usa uma única RPC para alterar Checklist e, se houver cadastro correspondente, Efetivo. Uma falha cancela a transação inteira. Não há retorno às duas gravações independentes quando a RPC está indisponível.

A proposta histórica `../supabase/propostas/status_colaborador_atomico.sql` originou a migração formal acima, com o mesmo corpo validado e notificação de recarga do schema. Exige Auth e o predicado existente `usuario_e_super_admin()`, executa com `SECURITY INVOKER` e não altera políticas RLS nem permissões das tabelas. Bloqueia Checklist antes de Efetivo, compara o estado esperado e recusa comandos desatualizados. Não cria Efetivo ausente nem altera datas; preserva a regra existente de ATIVO/INATIVO/DEMITIDO deste fluxo de acesso.

O cliente só modifica caches após validar a resposta completa. Uma perda de conexão pode ocorrer depois do commit: nesse caso solicita recarga e não repete automaticamente a escrita. Falha de atualização da tela após confirmação recebe aviso distinto. A auditoria permanece posterior, fora da transação dos dois cadastros.

## Evidências

| Verificação | Resultado | Arquivos em scratch/governanca/status-atomico |
| --- | --- | --- |
| PostgreSQL, GoTrue e PostgREST reais em instância exclusiva | 15 cenários aprovados | resultado.json |
| Painel com login real e persistência conferida por SQL | 5 cenários aprovados | browser.json |
| Duas conexões físicas: espera por bloqueio, COMMIT e ROLLBACK | Ambos aprovados, incluídos nos 15 acima | concorrencia.json |
| Painel com serviços simulados, navegação e recarga | 9 + 4 cenários aprovados | mock-fluxos.json, mock-recarga.json |
| Suíte agregada | Sintaxe 64/64; testes 15/15 arquivos; lint legado e 19 módulos aprovados | check-local.log |

Oito testes específicos em `tests/status_colaborador_atomico.test.cjs` cobrem ambas as declarações, cancelamento, cache ausente, demissão, permissões/conflito/RPC ausente, resposta inválida, falha de rede e atualização da tela. A captura `painel.png` foi conferida visualmente; mostra shell autenticado e dados fictícios, não comprova sozinha a atomicidade.

As falhas reais incluem exceção no segundo UPDATE e RLS permitindo leitura mas negando sua atualização: nenhum caso confirmou Checklist sozinho. A concorrência foi observada em `pg_stat_activity` com espera por Lock. Usuários e dados fictícios, credenciais efêmeras em memória. Políticas e módulos auxiliares de fixture, não réplica operacional.

## Mapeamento remoto somente de leitura

Foram consultados metadados, políticas, permissões, vínculos agregados e o predicado existente. O responsável reconhecido atualmente é a matrícula 76 vinculada ao Auth. Há cadastros legados sem vínculo Auth. As tabelas possuem políticas amplas; este trabalho não corrige nem homologa sua segurança global. Não foram encontrados triggers não internos nas duas tabelas na consulta realizada.

Antes da autorização, o ambiente operacional recebeu somente consultas de leitura. Após autorização, foi criada exclusivamente a função e sua permissão de execução (authenticated, sem PUBLIC/anon); políticas e permissões das tabelas permaneceram intactas. Não foram criados usuários ou dados fictícios em produção. A fixture reutiliza o critério de identidade do predicado, mas não reproduz integralmente sua implementação e todas as políticas de produção.

## Ativação e limites

**Não publicar o frontend isoladamente:** a ausência da RPC bloqueia o comando com aviso explícito. A sequência autorizada é banco primeiro, conferir disponibilidade da RPC e autorização, depois publicar o painel. Banco e exposição HTTP já conferidos: `SECURITY INVOKER`, search_path fixo, sem EXECUTE para anon e chamada anônima recusada com HTTP 401/código 42501, sem gravar registros. Cache-buster 303.2 apenas no núcleo e EPI. Resultado final da publicação, commit e hashes serão registrados na ponte e em `scratch/governanca/publicacao/`.

Reversão do frontend: deployment anterior `dpl_5nhmj4VXgPLk1JYgoT9exMHuLCb2`, commit `c5ee81d48cb919784199fc7edf0df8745491e447`. A função é adicional e pode permanecer sem uso durante uma reversão; não há necessidade de apagar dados ou remover tabelas. Rever a situação da branch de produção ao reverter para evitar republicação automática da versão defeituosa.

O escopo é o comando de acesso interno. Edição de cadastros, status de Terceiros, app de campo e outras escritas diretas não passaram a usar esta RPC. Não há garantia global de consistência entre todos os fluxos. A comparação booleana detecta estado divergente, mas não é contador de versões: duas alterações intermediárias que retornem ao mesmo valor não são detectadas. Leitura completa do Efetivo pelo responsável é pré-condição para distinguir ausência de invisibilidade por RLS.

Compatibilidade operacional, integrações externas e validação de João em produção permanecem separadas. Referências: [funções Supabase](https://supabase.com/docs/guides/database/functions) e [transações PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html).

Laboratório encerrado às 02:37 UTC de 12/11/2026, com volumes preservados. Abas e servidores próprios fechados; ausência de outros contêineres conferida antes de solicitar o desligamento do Docker Desktop. Consolidado: scratch/governanca/status-atomico/consolidado.json.
