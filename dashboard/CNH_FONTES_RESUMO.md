# Fontes do resumo CNH e decisão de vínculo

13/11/2026 — correção na branch `fix/cnh-fontes-resumo`, base `e24fe53`, cache somente CNH `301.8`. Ativação autorizada por João; banco ativado antes da publicação do painel.

## Comportamento

O módulo consulta o Efetivo e a configuração `efetivo_frentes_catalogo` ao entrar/retornar ou usar Recarregar, usando o leitor paginado existente `supabaseFetch`. As duas consultas são independentes, somente leitura e não dependem de abrir Efetivo antes. O resumo usa fontes próprias em memória, vinculadas à geração/identidade/sessão visual; limpeza de acesso descarta essas fontes e respostas antigas. Consultas sobrepostas não podem substituir resultado mais recente.

Frentes ativas do catálogo e frentes do Efetivo ativo aparecem mesmo sem cadastro CNH. Uma fonte indisponível permite mostrar os dados da outra e os condutores já carregados, com aviso de resumo incompleto. Falha não reutiliza dados antigos como atuais. Recarregar repete a consulta; catálogo ausente é distinto de erro de consulta/formato. A consulta respeita as permissões existentes; não foram ampliadas permissões para contornar falhas.

As contagens de condutores próprios/terceiros e do Efetivo permanecem separadas. O percentual de cobertura foi retirado: não há vínculo individual confirmado para sustentar população comum. `percentualCobertura` permanece nulo por compatibilidade interna.

## Regra operacional decidida por João

Em 13/11/2026 João escolheu **vínculo explícito; frente acompanha o Efetivo**:

- Próprio deve ter vínculo confirmado com uma pessoa específica do Efetivo.
- Depois de confirmado esse vínculo, a frente do Efetivo deverá valer no resumo e acompanhar transferências.
- Legados exigem confirmação manual, sem inferência automática por nome, setor ou semelhança de textos.
- Terceiros/PJ mantêm a frente informada no cadastro CNH.

Implementação local: `efetivo_id` referencia a matrícula textual do Efetivo, com unicidade (inclusive registros CNH inativos), exclusão restrita e vínculo permitido apenas para próprios. Nenhum legado é convertido automaticamente. No modal de edição, o usuário escolhe a pessoa pelo nome/matrícula/frente e aciona **Confirmar pessoa selecionada**. Essa ação salva apenas o vínculo; a busca de preenchimento e o botão Salvar cadastro não confirmam vínculo. Novos cadastros precisam ser salvos antes de vincular. É possível remover explicitamente o vínculo; a frente manual anterior permanece preservada. Para trocar para Terceiro/PJ, remover primeiro o vínculo.

A RPC `vincular_condutor_efetivo` reutiliza o resolvedor de identidade e a permissão de escrita CNH existentes, bloqueia a linha, exige versão atual, valida pessoa ativa e registra alteração/remoção com autoria no histórico. Não grava no Efetivo nem no Checklist. A consulta do resumo resolve a frente pelo ID confirmado, sem alterar o campo histórico `setor_frente`; filtros, lista e resumo usam essa mesma resolução. Inatividade, afastamento ou pessoa não consultável impedem contagem de aptidão no resumo e mostram grupo pendente de revisão. Cadastros sem vínculo mantêm frente manual, com aviso sobre confirmação dos legados.

## Ativação

Migração aplicada no projeto `segtrab` em 13/11/2026: `../supabase/migrations/20261113142757_cnh_vinculo_efetivo.sql` (nome/versionamento devolvidos pelo servidor). Estrutura operacional conferida: `colaboradores_efetivo.id` textual, RLS habilitada, apenas SELECT direto para authenticated na tabela CNH. Após a migração: 12 cadastros, zero vínculos; assinatura dos dados anteriores idêntica antes/depois. Execução anônima da RPC recusada por privilégio; authenticated autorizado. Cache de esquema PostgREST notificado. As demais RPCs são preservadas; o novo CHECK recusa converter vínculo próprio confirmado para Terceiro/PJ sem remover a associação. Não foram modificadas políticas RLS ou permissões de tabelas. Publicação do frontend301.8 ocorre depois do banco; validar Auth/RLS reais e perfis operacionais antes de homologar.

## Verificação

Regressões em `tests/gestao_de_condutores_cnh.test.cjs`: fontes independentes das listas globais; equipe sem condutor; falhas parcial/total e recuperação; descarte após perda de sessão; preservação de legados; percentual ausente; resolução por ID, transferência/afastamento; confirmação explícita, versão atualizada, erro preservando vínculo e cancelamento. Suíte passa de 18 para 21 blocos.

PostgreSQL17 local, contêiner exclusivo sem rede/portas publicadas: migração executada e 11 cenários aprovados (legados, persistência/auditoria, duplicidade, versão, terceiro, afastado, inexistente, tipo incompatível, exclusão restrita, permissão, remoção). Tabela CNH e validadores extraídos da migração original; Efetivo reduzido e resolvedor de identidade simulado. Não é teste de Auth/RLS operacional. Dados fictícios apenas no contêiner, encerrado após a verificação.

Navegador local, serviços simulados: seleção sem gravação, confirmação explícita, frente vinculada, cancelamento, transferência/recarga do módulo e remoção com restauração da frente manual aprovados, sem erros JS registrados. Este teste complementa o PostgreSQL separado; não conecta o navegador ao backend real.

Prévia isolada em navegador Orca: sete cenários aprovados, repetidos após recarga (entrada direta, frente vazia, subaba, busca/foco, atalho, falha visível e recuperação), sem erros de JavaScript registrados pela fixture. Captura do resumo inspecionada visualmente. Testes usam serviços/Auth simulados e tabelas fictícias somente em memória; não comprovam backend/RLS ou autenticação reais. Não houve gravação de cadastros, alteração de schema/RLS, push ou deploy.

Evidências adicionais, ignoradas pelo Git: `../scratch/governanca/auditoria-cnh-equipes/`, script `browser-fontes.js` e logs `check-local-correcao-fontes*.log`.
