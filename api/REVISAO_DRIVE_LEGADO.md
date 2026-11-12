# Revisão local — criação de pastas e Apps Script

12/11/2026. João confirmou o ajuste de apresentação do relatório. Esse aceite não foi tratado como validação de todos os fluxos Drive nem como confirmação da conta Saúde.

## API de pastas do cronograma

Na base publicada `8d77555`, `cronograma-pastas` verificava Auth, mas a autorização podia vir apenas do nível Admin de uma tabela legada. A reprodução com a fixture anterior, serviços inteiramente simulados e sem concessão protegida retornou prévia200 e criou uma pasta simulada. Não foi realizado ataque, escrita ou teste de exploração operacional.

Correção deste incremento: reutilizar `autenticarAnexos`/`exigirModulo`, com e-mail confirmado e teto de autorização em `app_metadata.anexos`. Mantido o acesso de edição em Relatório SMS ou no calendário solicitado; Saúde é recusada. Vínculos legados servem para restringir, sem promover a conta. Consultas credenciadas recusam redirecionamentos.

Não alterados: prévia sem gravação, agrupamento do cronograma, raiz oficial, confirmação, reservas, retomada após falha e proteção contra duplicidade. Não houve provisionamento de novas contas. A conta responsável já provisionada para anexos é compatível com a regra proposta; não habilitar outras contas por inferência de Admin legado.

14 testes locais: sete regressões anteriores e sete verificações de autorização, incluindo Admin forjado/user_metadata, e-mail pendente, anônimo, Saúde, leitor, inatividade/ambiguidade, revogação após prévia e editor limitado ao calendário. Mocks também exigem `redirect:error` em cada chamada. Isso não equivale a teste autenticado operacional.

## Apps Script: risco separado

O arquivo local `google-apps-script-pastas.js` anuncia `somenteLeitura:true` no GET, mas o POST também encaminha ações de criação. O caminho padrão permite criar estrutura, cai na raiz geral do Drive se a pasta indicada falhar e chama `setSharing(ANYONE_WITH_LINK,VIEW)`. Na simulação, um POST sem prova de identidade criou quatro pastas e solicitou um compartilhamento público.

A ação específica `listarFotosSubpastas`, utilizada pelo importador com prévia, valida descendência da raiz e não altera compartilhamento. O anúncio de leitura não garante que as demais ações do mesmo script sejam somente leitura.

Uma consulta GET ao Web App configurado retornou HTTP200, protocolo `fotos-leitura-v292`, `somenteLeitura:true` e `raizConfigurada:true`. Isso confere o anúncio do serviço, sem comprovar o código das ações POST. A versão de código e a configuração de execução/acesso do Web App ainda não foram conferidas. A possibilidade de um terceiro acionar isso remotamente depende dessas configurações; não afirmar exploração ou exposição operacional comprovada. Nenhuma chamada de criação foi feita ao Apps Script real.

Dependências mapeadas: importação SMS (`relsms_importacao_segura.js`), criação por cronograma em `treinamentos_ddsma.js` e abertura de pasta operacional em `ambiental_compras_hht.js`, com declarações legadas no núcleo. Não remover ações nem alterar a implantação às cegas. A correção dessa superfície requer conferir a versão implantada, preservar os fluxos dependentes e migrar/validar as escritas sob autorização de servidor, sem permissão pública automática ou fallback silencioso para a raiz geral.

## Evidências e estado

`scratch/governanca/auditoria-drive-legado/resultado.json` e `sonda.cjs` reproduzem a base anterior fixada por commit; criação/reservas/compartilhamento são mocks. `cronograma-depois.log` registra14/14 após a correção. O agregado está em `check-local.log`.

João autorizou continuar a correção e sua publicação em uma entrega agrupada. Os comprovantes posteriores à integração ficam na ponte/scratch para evitar PR adicional de documentação. A implantação do Apps Script permanece fora desta alteração da API; não houve modificação de contas, dados, pastas, permissões, RLS ou relatórios homologados. A aprovação operacional do relatório permanece registrada separadamente.
