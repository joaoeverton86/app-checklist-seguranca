# Integração de pastas autenticada e assinada

Substitui chamadas diretas do navegador ao Apps Script por `POST /api/pastas-drive`, preservando consulta/importação de fotos, pastas operacionais e sincronização de pastas de treinamentos. Também migra as declarações homônimas do núcleo; núcleo e módulos usam o mesmo caminho autorizado.

## Contrato e autorização

O servidor valida Supabase Auth, e-mail confirmado, concessão protegida de anexos e perfil atual. Para editar, exige o módulo correspondente ou Relatório SMS; Saúde não escreve nesta integração. Leitura de fotos e diagnóstico seguem a permissão de leitura de Relatório SMS. Autorizações não vêm de `user_metadata`, Admin legado, parâmetros do navegador ou do anúncio do Web App.

O destino é exclusivamente `GOOGLE_APPS_SCRIPT_PASTAS_URL` configurado no servidor. A URL editável em configuração legada não recebe JWT nem passa a controlar esse destino. A chave `DRIVE_PASTAS_SIGNING_SECRET`, dedicada e aleatória, fica somente nas variáveis sensíveis do servidor e nas propriedades do Apps Script. Não registrar seu valor em código, logs ou relatórios.

A API primeiro consulta o protocolo `pastas-assinadas-v1`, assinatura obrigatória/configurada e hash da raiz esperada. Não envia POST a uma versão antiga: seu roteamento padrão poderia criar pastas. Depois envia um envelope HMAC-SHA256 com usuário, ação, dados normalizados, raízes autorizadas, nonce e validade de60 segundos. Nenhum JWT Supabase vai para o Apps Script. A resposta redirecionada do ContentService só é obtida por GET no host/caminho Google aprovado, sem reapresentar o envelope. JSON recebido tem teto de2MB.

O Apps Script verifica a assinatura antes de DriveApp, recusa expiração/reutilização/ação desconhecida e serializa a execução com ScriptLock. O cache de nonce é temporário e não é banco durável de idempotência; a retomada reutiliza as pastas por nome. Pedidos não assinados, inclusive ping e ações antigas sem envelope, são recusados. Não há fallback para a raiz geral quando o destino falha. Não são solicitadas novas permissões públicas automaticamente. Permissões antigas e herdadas permanecem como estavam — isso não comprova que todas as pastas/arquivos existentes sejam privados.

O pacote externo também contém uma ação de consulta com ID propositalmente inválido. Se alcançar uma réplica antiga durante a troca de versão, seu roteamento de compatibilidade termina em erro de leitura antes de DriveApp, em vez de cair na criação padrão. A ação efetiva existe somente dentro do envelope assinado.

Temas diferentes na mesma data não podem reutilizar a pasta um do outro. Correspondências legadas aceitam variação de separador da data com o nome completo, recusando ambiguidade. IDs de eventos são preservados como metadados de cache, nunca usados como prova de autorização.

## Ativação coordenada

Variáveis de servidor em Production/Preview e propriedade `DRIVE_PASTAS_SIGNING_SECRET` devem conter a mesma chave. Preservar `FOTOS_ROOT_ID` e os demais valores existentes. A raiz de fotos deve coincidir com `GOOGLE_DRIVE_FOTOS_ROOT_ID`. Raízes de escaneados reutilizam os IDs já aprovados para Treinamentos e DDSMA. Não conceder novas contas automaticamente.

Preparar fonte/backup e testar antes de atualizar a implantação existente do Apps Script; preservar URL e ID da implantação. Verificar GET do novo protocolo e diagnóstico assinado somente leitura, além da recusa de envelope ausente. Publicar painel/API juntos e confirmar a rota, cache e recusas Auth. Durante a troca, uma versão incompatível deve informar ativação pendente, sem criar pastas ou tentar o caminho antigo. Atualizar abas antigas com Ctrl+F5.

O diagnóstico assinado verifica a chave dos dois lados sem acessar/criar pastas; usa apenas o cache temporário de nonce. Não o apresentar como teste de criação autenticada ou de permissões corporativas dos arquivos. Se houver resposta incerta de criação, consultar o Drive antes de repetir; não ocultar a falha com outra tentativa automática.

## Verificações e limites

- API com serviços totalmente simulados: login/concessão, protocolo antigo, assinatura ausente/adulterada/expirada/reutilizada, raízes/datas/categorias, Saúde/leitor, redirects, diagnóstico, retomada e temas distintos na mesma data.
- Cliente: chamadas do núcleo e módulos para pastas operacionais, treinamentos e diagnóstico passam pela API fixa; URL externa é recusada sem transmitir token.
- Navegador local com interfaces reais e integrações simuladas: campo/previsão/revisão/confirmar e salvamento de duas fotos aprovados. Não é acesso real ao Google Drive.
- Os testes Playwright anteriores permanecem fora de npm test. Seus mocks foram adaptados ao novo endpoint e bloqueiam destinos não simulados, mas não foram incluídos no runner nem executados nesta etapa.
- Não se alteram RLS, usuários, dados SST, fotos, revisões homologadas, PWA ou compartilhamentos históricos. A proteção não representa rate limiting global, auditoria de todo o banco ou garantia de disponibilidade dos provedores.

Referências do provedor: [HMAC de Utilities](https://developers.google.com/apps-script/reference/utilities/utilities) e [redirecionamentos do ContentService](https://developers.google.com/apps-script/guides/content). Comprovantes de publicação ficam somente em scratch/ponte, sem PR adicional de documentação.
