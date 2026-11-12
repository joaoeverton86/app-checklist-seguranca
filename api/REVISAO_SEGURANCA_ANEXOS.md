# Revisão local das APIs de anexos e Drive

Continuação local concluída: ver `AUTORIZACAO_ANEXOS.md`. Inclui autorização administrativa no Auth, tickets, adaptação do painel e a regra de Saúde escolhida por João. A descrição abaixo preserva o diagnóstico anterior; suas pendências não representam sozinhas o estado final. Nenhum incremento desta branch foi publicado.

12/11/2026 — branch `fix/seguranca-urls-anexos`, base `dcca1e9`. Revisão do código atual e execução com respostas simuladas. Nenhuma chamada às APIs operacionais, conta Google, banco, publicação ou mudança de permissão nesta etapa. A entrega anterior já publicada permanece separada.

## Resultado e escopo

Foram reproduzidas duas falhas de destino remoto: o proxy buscava URLs arbitrárias e a API de pedaços enviava bytes para endereços arbitrários. Os dois testes de segurança falharam antes da correção (HTTP 200 onde deveria haver recusa), com `fetch` simulado e permissão de rede do Node negada. Agora passam.

As correções abaixo estão apenas na branch local. **Esta revisão não aprova a segurança integral das APIs:** persistem falhas de autorização independentes das URLs. Não interpretar os testes aprovados como homologação de acesso a documentos privados ou publicação autorizada deste incremento.

| API | Constatação | Situação local |
| --- | --- | --- |
| proxy-imagem | URL arbitrária, redirects automáticos, download sem limite, conteúdo arbitrário servido pela origem do app; fallback usa credenciais Google sem verificar usuário | Destinos, redirects, conteúdo e limites corrigidos; autorização do fallback pendente |
| anexo-enviar-pedaco | PUT para URL arbitrária, intervalos/base64 sem validação, erro remoto devolvido ao cliente | URL, tamanho, intervalo, base64, redirects e erros corrigidos; vínculo entre usuário e sessão de upload pendente |
| anexo-iniciar | Não verifica identidade/perfil antes de renovar OAuth, criar pastas e iniciar uploads; aceita raiz/pasta escolhida pelo cliente | Diagnóstico reproduzido com provider simulado; correção de autorização e destino por módulo pendente |
| anexo-finalizar | Não verifica identidade nem vínculo com arquivo antes de conceder visualização pública por link | Diagnóstico reproduzido com provider simulado; correção de autorização/vínculo e revisão do compartilhamento pendentes |
| anexos-drive-listar | Tem verificação de descendência de pastas, mas não autentica usuário do painel antes do OAuth/listagem | Diagnóstico reproduzido com provider simulado; autorização por categoria pendente |
| cronograma-pastas | Verifica Auth e perfil antes do Drive; já possui suíte local específica | Preservada; não foi declarada uma auditoria integral desse endpoint |

## Implementação dos destinos

`lib/urls-remotas.js` centraliza regras compartilhadas pelos dois handlers. Fica fora de `api/` para não criar uma função HTTP auxiliar. O verificador de sintaxe passou a incluir `lib/`; nenhuma dependência foi instalada.

- Imagens: somente HTTPS, sem usuário/senha, porta alternativa ou fragmento. Hosts Google exatos `lh3` a `lh6.googleusercontent.com`, `drive.google.com` e `drive.usercontent.google.com`; Storage público/assinado apenas do projeto atual, nos caminhos de objeto/renderização. Não há permissão genérica para CDN, outros projetos Supabase ou subdomínios por sufixo.
- Links web do Drive são normalizados pelo parser URL; parâmetro repetido/array e identificador divergente são recusados. Cada salto de redirect é validado antes da próxima conexão; no máximo três saltos. Nunca enviar credencial OAuth ao destino de um redirect.
- Imagens: MIME e assinatura inicial compatíveis, sem HTML/SVG; limite de 20 MB conferido também no stream, mesmo com tamanho anunciado falso. `nosniff` e erro sem cache. Conteúdo obtido pelo fallback credenciado recebe `private, no-store`; isso não substitui autorização.
- Upload: somente sessão retomável nos hosts exatos `www.googleapis.com`/`content.googleapis.com`, caminho `/upload/drive/v3/files`, `uploadType=resumable` e `upload_id` único não vazio. Não é prova de que a sessão pertence ao usuário: isso permanece pendente.
- Pedaço até 3 MB, base64 canônico, posições/totais inteiros seguros, sem ultrapassar o intervalo. Preservado o pedaço de 2,5 MB do painel. `308` sem Location continua indicando pedaço recebido; `308` com Location não é seguido nem confirmado como sucesso.
- Tempo limite de 15 segundos. Erros de rede/provedor não devolvem URL de sessão, token ou corpo remoto ao cliente.

MIME/assinatura inicial não equivalem a análise antimalware ou decodificação completa. O limite por resposta não é rate limiting global. O envio e a leitura ainda dependem de autorização e vínculo com o documento, além dessas validações.

## Evidências

`api/tests/urls-remotas.test.cjs`: 14 testes aprovados, cobrindo bloqueio antes de conexão, destinos legítimos, parâmetros inválidos, redirects externos/relativos/cíclicos, HTML/SVG/MIME, limite anunciado e streaming, fallback OAuth sem vazamento no redirect, chunks inválidos, pedaço real de 2,5 MB, 308/201 e erros sanitizados.

`npm run check:local`: aprovado; sintaxe 66/66 arquivos, 16/16 arquivos de testes, lint legado e 19 módulos sem ocorrências. Lint adicional dos dois handlers, helper e teste: zero `no-undef`. `git diff --check` aprovado. Node informa o aviso de detecção ESM em um pacote sem `type`; não foi alterado o formato global do projeto para ocultá-lo.

Evidências locais ignoradas: `scratch/governanca/seguranca-apis/antes.log`, `depois.log`, `check-local.log`, `autorizacao.log` e `sonda-autorizacao.cjs`. Na sonda sem Authorization, iniciar/finalizar/listar retornaram HTTP 200 com OAuth simulado; finalizar chegou ao POST de permissões simulado. Não houve rede ou arquivo Google real. A sonda demonstra o comportamento dos handlers, não uma exploração na produção.

## Próxima implementação de autorização

1. Autenticar no servidor com Supabase Auth real e ler identidade/perfil do banco; não aceitar `active_session`, nome, matrícula, CORS/Origin ou uma API key pública como prova de usuário. A sessão legada sem Auth observada na entrega anterior não é suficiente.
2. Mapear os módulos/categorias e reproduzir a matriz de leitura/edição existente, incluindo Saúde. Adaptar os chamadores do núcleo e dos módulos; os pedidos atuais não enviam Authorization. Não trocar RLS nem regras SST como atalho.
3. Vincular sessão de upload, usuário e finalidade; verificar o arquivo antes de finalizar. O servidor não deve usar `driveFileId`/`pastaDestinoId` arbitrários como autorização. `infoOnly` deve ser separado de criação de pastas: no código atual o teste de conexão pode criar pastas antes de retornar as informações.
4. Tratar o compartilhamento público como ação explícita por finalidade; o fluxo de SMS já possui padrão restrito, enquanto outros chamadores finalizam automaticamente. Não generalizar uma nova política para documentos de saúde sem delimitar sua regra com João.
5. Validar a matriz com Auth/banco isolados e Drive simulado antes de qualquer publicação. Nenhuma credencial operacional ou registro fictício em produção é necessário para essa validação.

Chamadores encontrados exclusivamente no painel: `dashboard.js`, `saude_psicossocial.js`, `ambiental_compras_hht.js`, `relatorio_sms_nc.js` e `relatorio_sms_fotos.js`. Não foram encontradas chamadas desses endpoints em `app.js`. Há declarações duplicadas no núcleo e módulos; ambas precisam ser coordenadas na etapa de autenticação. O PWA e seus arquivos não foram alterados.

Referências: [upload retomável do Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [prevenção de SSRF — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) e [fetch do Node](https://nodejs.org/api/globals.html#fetch).
