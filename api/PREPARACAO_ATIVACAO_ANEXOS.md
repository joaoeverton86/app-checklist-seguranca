# Preparação da ativação — anexos

## Ativação autorizada em andamento — 12/11/2026

Após autorização de João para prosseguir, os vínculos foram reconferidos com nome, e-mail correspondente e atividade. Foram aplicadas somente duas concessões em `app_metadata.anexos`: administração para o responsável e Saúde restrita para a conta do perfil Saúde. A atualização foi transacional, preservando os demais metadados. Nenhum outro usuário foi habilitado.

A conta Saúde ainda não definiu senha: é um convite pendente. Por isso, não foi confirmado seu e-mail administrativamente nem substituída a senha. A concessão está preparada, mas não permite login sem concluir o acesso. A publicação pode avançar para uso do responsável sem tratar Saúde como homologada.

A referência já escolhida no painel foi cadastrada como `GOOGLE_DRIVE_FOTOS_ROOT_ID` em Production e Preview. As verificações locais anteriores continuam aprovadas; a validação OAuth da raiz, o teste autenticado operacional do responsável e o acesso aos PDFs pela conta Google de Saúde permanecem pendentes. As configurações locais antigas não autenticaram nos provedores e não foram alteradas; não equivalem às credenciais sensíveis vigentes da Vercel. A descrição abaixo registra a preparação anterior à autorização.

12/11/2026, branch local `fix/seguranca-urls-anexos`. Complementa `AUTORIZACAO_ANEXOS.md`. **Não é publicação nem autorização para aplicar concessões.** Foram realizadas consultas operacionais somente de leitura e testes com Auth/PostgreSQL reais locais; o Drive dos testes de gravação permaneceu simulado.

## Situação das contas

Foram encontrados cinco usuários Auth vinculados ao painel/cadastro; nenhum possui ainda `app_metadata.anexos`. Identificadores completos ficam somente nos artefatos locais ignorados, para conferência antes de aplicar qualquer mudança.

| Referência | Conferência | Plano preparado |
| --- | --- | --- |
| Responsável — matrícula 76 | E-mail confirmado, cadastro ativo, perfil ativo | Proposta administrativa elegível para revisão; ainda não aplicada/aprovada |
| Perfil Saúde | Perfil ativo; e-mail ainda não confirmado | Proposta restrita de Saúde bloqueada até confirmação |
| Matrícula 181 | Cadastro inativo | Sem proposta de habilitação |
| Visualizador EPI/Treinamentos | Perfil inativo e e-mail não confirmado | Sem proposta de habilitação |
| Matrícula 999 | Cadastro técnico ativo; finalidade não confirmada nesta revisão | Sem proposta; não presumir aprovação ou conceder acesso interno amplo |

João informou que pedirá ao usuário de Saúde que confirme o convite. Isso não foi tratado como confirmação concluída. Não foram enviados convites operacionais, confirmados e-mails administrativamente ou alterados usuários. A identidade da conta responsável deve ser conferida pelo Auth antes de qualquer concessão; uma referência de matrícula na tabela legada não é autorização automática.

`scripts/planejar-acessos-anexos.cjs` gera um plano local a partir de uma fotografia e propostas explícitas. Não usa rede, não possui modo `--apply` e não altera contas. Não infere poderes de linhas Admin; marca todas as propostas como não aprovadas e bloqueia pendências, perfis inativos, duplicidades, contas desconhecidas e concessões atuais divergentes. O arquivo de saída usa criação exclusiva para não sobrescrever um plano anterior silenciosamente.

Exemplo para reproduzir o plano, escolhendo um nome novo para a saída:

```powershell
node scripts/planejar-acessos-anexos.cjs --fotografia scratch/governanca/ativacao-anexos/fotografia-contas.json --propostas scratch/governanca/ativacao-anexos/propostas-contas.json --saida scratch/governanca/ativacao-anexos/plano-contas-revisao2.json
```

A fotografia é datada e não deve ser usada como estado definitivo. Antes de uma execução aprovada, consultar novamente identidade, confirmação de e-mail, atividade e concessão atual; preservar os demais metadados Auth. Cinco testes locais do planejador aprovados.

## Conferência do ambiente e Drive

Na Vercel foram consultados somente nomes, ambientes e tipos das variáveis, sem exportar valores para arquivos ou para o relatório. Produção possui `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` e chave de leitura do Drive. A chave dedicada de sessão não está configurada; a implementação suporta a derivação pelo segredo OAuth existente. URL/chave pública Supabase não aparecem como variáveis de servidor: os caminhos de compatibilidade existentes usam o projeto fixo e a chave pública transportada pelo painel.

`GOOGLE_DRIVE_FOTOS_ROOT_ID` não está configurada. A consulta da categoria `fotos` no endpoint operacional retornou erro de pasta não localizada/configurada. Ao consultar a configuração já salva do painel, foi encontrada uma referência de pasta; a interface autenticada do Google Drive confirmou seu título **SST - Fotos & Evidências**. O ID correspondente está somente no plano local. A proposta é fixar essa referência já escolhida por João, sem inventar ou selecionar outra pasta. O acesso do OAuth do servidor a ela ainda precisa ser validado por leitura; o acesso pela conta do navegador não comprova esse acesso do aplicativo.

A pasta **Saude_Ocupacional** foi localizada sob SMS_COP por consulta de metadados. No diálogo de compartilhamento do Drive, o acesso geral observado foi **Restrito**. Nenhuma opção de permissão foi modificada, nenhum destinatário foi adicionado e nenhum arquivo clínico foi aberto. Essa observação é da pasta naquele momento: não audita todas as pessoas com acesso, arquivos ou subpastas, nem comprova que arquivos antigos não tenham compartilhamentos próprios. Não remover permissões legadas automaticamente.

## Teste com Auth e banco reais locais

Instância exclusiva com imagens Docker já presentes, sem projeto hospedado novo e sem instalar pacotes. SDK 2.115.0 já obtido no laboratório anterior, conferido por SHA-256. GoTrue/PostgreSQL/PostgREST reais; seis contas fictícias com credenciais geradas apenas em memória. A configuração de e-mail confirmado foi exigida no laboratório, e o envio ao Drive foi inteiramente simulado.

16 cenários aprovados:

- Cinco logins confirmados e bloqueio real da conta com e-mail pendente.
- Leitor e conta sem concessão recusados antes do Drive.
- Alteração real de `user_metadata` e tentativa de PUT em `app_metadata` pelo próprio usuário não promoveram a conta.
- Escrita real em uma política RLS propositalmente ampla reproduziu forja de vínculo Admin, sem conceder acesso à API; o vínculo fictício foi restaurado.
- Saúde iniciou sessão restrita e não conseguiu compartilhar publicamente com ticket válido.
- Editor só escreveu no módulo concedido; outra conta não reutilizou o ticket; desativação no banco restringiu a conta.
- Concessão por Auth Admin foi observada pelo endpoint real.
- Transferência/finalização com metadados vinculados funcionou contra o Drive simulado.
- Revogação por Auth Admin bloqueou o mesmo JWT e ticket anteriores, antes de qualquer nova chamada ao Drive.

O esquema local contém apenas as estruturas necessárias ao contrato, com políticas específicas de fixture. Não é réplica nem aprovação da segurança global do banco operacional. Não foi realizado upload, compartilhamento ou teste de senha em contas operacionais. O teste não comprova a leitura dos PDFs privados com a conta Google do usuário de Saúde.

Após o teste, a instância foi encerrada com volumes preservados e o Docker Desktop voltou ao estado desligado. As abas próprias de consulta também foram fechadas.

## Evidências e sequência restante

Evidências ignoradas em `scratch/governanca/ativacao-anexos/`: `auth-local/resultado.json` (16/16, sem erros, encerrado), código do laboratório/cenários, fotografia/propostas/plano de contas, metadados de pastas, trecho de acessibilidade do acesso Restrito e `check-local.log`. Agregado atual aprovado: sintaxe 72/72, testes 19/19 arquivos e lint legado/19 módulos. Lint adicional do planejador e testes: zero ocorrências.

Para concluir a ativação: aguardar e conferir a confirmação do e-mail de Saúde; revisar as duas contas propostas e seu acesso corporativo aos arquivos privados; aprovar as concessões e a referência de fotos; conferir o OAuth dessa raiz; então habilitar e publicar o conjunto de forma coordenada. Sem novas inferências de identidade, sem ampliar Saúde e sem confirmar e-mail por atalho.

Nesta preparação não houve push, PR, build/deploy remoto, alteração de plano/cobrança, concessão ou mudança de variável operacional. A futura publicação deve continuar agrupada, evitando uma PR adicional apenas para registrar o resultado.

## Avanço após autorização de João — 12/11/2026

João autorizou avançar apesar da indisponibilidade da pessoa de Saúde. A confirmação de e-mail não foi contornada e nenhuma conta foi alterada. A referência de fotos já escolhida no painel foi cadastrada como GOOGLE_DRIVE_FOTOS_ROOT_ID nos ambientes Production e Preview da Vercel. Cadastro confirmado por nova consulta de metadados. Isso configura as próximas versões; não houve build/deploy e não comprova ainda acesso OAuth à pasta. Permanecem pendentes a estratégia de ativação de Saúde e a validação autenticada dos arquivos privados. Comprovante em scratch/governanca/ativacao-anexos/raiz-configurada.json.
