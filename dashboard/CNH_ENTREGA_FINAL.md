# Entrega final local — Gestão de Condutores CNH

Implementação e homologação local concluídas em 09/11/2026. Publicação autorizada expressamente por João. Duas migrações CNH e habilitação da matrícula 76 aplicadas ao banco operacional em 10/11/2026 (UTC). Leitura/escrita do usuário, RLS/FORCE RLS, bloqueio de anon/escrita direta, sete modelos e tabela inicialmente vazia conferidos. Código preparado para publicação v301.3.

## Comportamento entregue

Módulo independente com sete modelos da matriz aprovada por João, requisitos aprovados apenas pelo catálogo do servidor, evidências individuais neutras, histórico preservado, categorias e treinamentos por atividade, novo aviso ao vencer CNH, conflitos de versão e bloqueio de perfis sem permissão. Correção adicional no login por email: guarda auth_user_id e email verificado na sessão visual; não remove checagem de identidade.

## Evidências finais

- 16 blocos da suite comportamental e testes de consistência da matriz e identidade de login aprovados.
- Sete sondas de regressão e POST atrasado aprovados.
- 15 cenários SQL da matriz no PGlite; nove cenários GoTrue/PostgREST/concorrência TCP real local.
- Dez verificações finais com dashboard/index.html e scripts reais servidos localmente, alterando apenas URL/chave pública em memória: habilitação idempotente em transação revertida, login GoTrue, formulário de login por email do dashboard, navegação CNH, aplicação do modelo pelo DOM e reconhecimento no banco, cadastro, recarga, cancelar, edição, comunicação e inativação.
- Captura dashboard-completo.png conferida. Saída em scratch/auditoria-cnh/stack-codex/resultado-dashboard-completo.json (exit 0).
- Sintaxe, lint e diff-check aprovados. Stack parada, volumes preservados.

O ambiente local não possui os dados/tabelas de todos os demais módulos: o indicador global de carregamento apresenta erro por esse motivo. O fluxo CNH descrito foi testado com backend real; isso não homologa todos os módulos existentes nem o login por matrícula baseado na RPC legada verificar_login.

## Compatibilidade operacional conferida por somente leitura

Consultas agregadas no Supabase operacional confirmaram schema necessário, com painel_usuarios.id UUID, auth_user_id e matrícula. Conta matrícula 76: um colaborador ativo, uma conta Auth existente, email coincidente; zero registros desse UID/matrícula em painel_usuarios. Os perfis existentes não concedem escrita CNH. Tabela gestao_de_condutores_cnh ainda não existe.

Isso impediria o uso se apenas os arquivos fossem publicados. Correção de preparação: supabase/operacoes/habilitar_joao_condutores_cnh.sql. Cria um perfil específico com leitura/escrita somente para CNH e um registro do usuário, aproveitando Auth já existente. Não altera outras contas, perfis existentes, senhas, RLS ou dados de campo. Recusa conflitos em vez de sobrescrever. Testada localmente a criação e repetição; transação revertida.

## Sequência de aplicação autorizada

1. Aplicar supabase/migrations/20261109_modulo_gestao_condutores_cnh.sql (nova tabela e RPCs/RLS exclusivas CNH).
2. Aplicar supabase/migrations/20261110021911_matriz_sst_condutores_aprovada.sql (catálogo e proteção da matriz aprovada).
3. Executar supabase/operacoes/habilitar_joao_condutores_cnh.sql (vínculo explícito e perfil CNH da matrícula 76).
4. Conferir capacidades por papel, ausência de escrita anon, constraints e vínculo de aprovador. Não criar condutores reais automaticamente.
5. Commit apenas dos arquivos CNH e integração revisados; publicar via fluxo Git/Vercel autorizado e conferir arquivos/cache-busters no domínio oficial. Tags: núcleo 301.3; módulo CNH 301.2.
6. João valida login com a própria conta e primeiro registro operacional. Nenhum teste local substitui essa conferência operacional.

Autorização de publicação recebida na conversa. Itens 1–4 executados e conferidos; publicação dos arquivos segue por Git/Vercel. Auditoria operacional com a conta real de João continua separada dos testes locais. Registro final da publicação e commit disponível na ponte local.
