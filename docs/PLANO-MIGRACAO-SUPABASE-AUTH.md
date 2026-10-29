# Plano de migração — Supabase Auth do Painel Gerencial

## Escopo desta branch
- Adiciona um gate de autenticação apenas ao painel em `dashboard/`; não altera o login do app de campo.
- Login por e-mail/senha via Supabase Auth, sessão persistente e solicitação de redefinição de senha.
- Exige `app_metadata.dashboard_access === true` ou `app_metadata.role === "admin"`. Essas claims devem ser atribuídas exclusivamente em ambiente confiável usando Admin API, nunca em `user_metadata`.
- Nenhuma tabela, RPC, política RLS ou conta existente é modificada nesta etapa.

## Antes de habilitar usuários reais
1. Inventariar contas legadas e mapear matrícula, nome, e-mail verificado, nível de acesso e status.
2. Não importar hashes de senha legados como se fossem credenciais Supabase nem pedir senhas atuais. Para contas sem credencial Auth, usar convite ou fluxo de definição/redefinição de senha.
3. Vincular identidades por identificador estável e revisão administrativa; resolver e-mails duplicados antes de conceder acesso.
4. Atribuir `app_metadata.dashboard_access=true` somente para usuários aprovados, via Admin API em ambiente confiável.
5. Configurar URLs de redirecionamento do Auth para produção, preview e desenvolvimento, além de SMTP e templates de e-mail.
6. Testar administrador autorizado, usuário sem permissão, sessão expirada, logout e redefinição antes de promover a alteração.

## Limite de segurança
O gate bloqueia a interface, mas não é uma fronteira de autorização para os dados do banco. Acesso à API requer políticas RLS específicas por tabela e validação de funções RPC. A auditoria existente identificou permissões públicas que precisam de revisão separada, tabela por tabela; não aplicar RLS genérica nem revogar funções em lote.

## Testes de aceite
- Sem sessão ou com credenciais inválidas: gate visível.
- Sessão sem claim de painel: acesso negado.
- Sessão com claim administrativa concedida no servidor: painel liberado.
- Logout e expiração: painel volta a ser bloqueado.
- App de campo, IndexedDB, sincronização offline e RPCs existentes permanecem sem alterações nesta branch.
