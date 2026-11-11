# Importação de fotos com prévia — correção local v292

Atualização em 04/11/2026: com autorização explícita de João, Codex aplicou diretamente o código no Apps Script e atualizou a implantação existente para a versão 4. FOTOS_ROOT_ID configurada com a raiz SST - Fotos & Evidências. GET confirmou o protocolo e POST real de outubro retornou 10 subpastas/14 fotos. Código remoto relido e igual ao local. Evidências locais: scratch/gas-v292/publicacao.md. As referências abaixo à implantação pendente descrevem a situação anterior; a publicação do painel v292 e a validação integrada continuam pendentes.

Objetivo: corrigir as falhas reproduzidas em v290 e impedir fechamento implícito com fotos ausentes. João pediu que Codex assumisse as correções e enviasse o resultado ao Antigravity. Word manual continua prioridade e não foi modificado.

## Contrato do fluxo

1. Operador escolhe Treinamentos ou DDSMA e informa a pasta mensal.
2. Painel consulta o GET do Apps Script. Somente `protocolo: fotos-leitura-v292`, `somenteLeitura: true` e `raizConfigurada: true` habilitam o POST. Versão antiga não recebe a chamada de listagem que alterava permissões.
3. Calendário é lido diretamente de `treinamentos_cronograma`/catálogo ou `dds_temas_cronograma`; não depende de variáveis opcionais carregadas por outra tela.
4. Parser reconhece datas ISO e brasileiras completas; DD/MM usa a competência explicitamente selecionada. Data inválida, ausente ou de outro mês vira pendência. Nunca atribui dia 01 por falta de informação.
5. Vínculo exige categoria + tema completo normalizado + data. Em treinamentos, prevalece data realizada quando cadastrada. Previsão não é comprovação de aplicação; isso fica na prévia. Turmas repetidas não confundem a identificação do mesmo tema/data. Ambiguidades/pastas duplicadas não são importadas.
6. Importação pede exatamente duas fotos por tema e aceita JPEG/PNG/WebP. Mais fotos exigem escolha manual, sem tomar as duas primeiras. Seleções já existentes não são substituídas. Fotos repetidas são rejeitadas.
7. Operador confere a prévia e confirma. Cancelar mantém a seleção anterior; só os itens elegíveis conferidos são salvos. Falha no salvamento mantém o trabalho visível e não apresenta confirmação falsa de importação persistida.
8. Exportar/preparar fotos não fecha rascunho nem grava alterações de seleção. Treinamento continua exigindo duas fotos para fechamento explícito. Imagem indisponível gera erro, sem substituição automática por imagem de aviso.

## Apps Script

`google-apps-script-pastas.js` precisa ser revisado e implantado na versão corrigida antes da importação real. Configurar, nas Propriedades do script, `FOTOS_ROOT_ID` com o ID da raiz oficial Fotos & Evidências. Esse ID é metadado, não credencial. Não usar a pasta mensal como raiz se o objetivo é permitir outras competências. Não copiar credenciais para a ponte.

A ação de listagem agora verifica a ascendência da pasta até a raiz, limita a 200 subpastas/200 fotos por pasta, devolve tipo MIME e não executa setSharing. Apenas metadados são listados, não binários. O fluxo de escaneados foi preservado. Não houve revogação de permissões existentes; o código não desfaz compartilhamentos antigos. O acesso público ao Web App não equivale à autenticação do painel; a delimitação por raiz não constitui autorização individual completa e isso não foi anunciado como resolvido.

## Arquivos e autoria

Novo `modules/relsms_importacao_segura.js`; função antiga `relSmsFotosImportarDaPastaAutomatico` delega ao fluxo com prévia. `relSmsFotosSalvar` passa a retornar true/false após confirmação de gravação. Regra de duas fotos por treinamento mantida. `relSmsFotosImagem` e `relSmsFotosPreparar` voltaram aos contratos estritos anteriores ao commit concorrente 66f6aec (sem placeholders/auto-fechamento). Foram substituídas somente essas funções, não o arquivo inteiro. Artefatos anteriores preservados em scratch/correcao-importacao-v291/.

Index: módulo de fotos e novo helper em v292; Word manual v289 preservado. Testes ajustados para verificar fechamento explícito em vez de aceitar a alteração automática do estado.

## Verificação

`node --test api/tests/cronograma-pastas.test.cjs dashboard/tests/cronograma_pastas.test.cjs dashboard/tests/relatorio_sms_fotos.test.cjs dashboard/tests/relsms_fotos_manuais.test.cjs dashboard/tests/relsms_importacao_segura.test.cjs dashboard/tests/relatorio_sms.test.cjs`

43 testes aprovados, incluindo importação no navegador com cancelamento, confirmação, erro de gravação, Apps Script antigo sem POST, datas ISO, múltiplos temas no mesmo dia, duplicidade, preservação de seleção, DDSMA e consulta sem alterar ACL simulado. Sintaxe dos módulos/Apps Script, lint padrão e diff-check aprovados. O lint padrão não cobre os módulos novos integralmente.

Não houve consulta pelo Apps Script real, alteração de fotos/permissões reais, gravação operacional, commit, push ou deploy por Codex nesta correção. Antes de publicar: revisar diff, conferir nova implantação e FOTOS_ROOT_ID, testar com pasta real delimitada e validar o resultado das associações. Não validar a automação usando somente a presença do botão ou testes de extração de link.

## Pendências separadas

Fechamento histórico ainda precisa da correção de serialização de imagens, armazenamento de objetos Word e concorrência de revisões, conforme pareceres anteriores. A importação corrigida não promete solucionar essas rotinas. Para emitir o mês agora, usar Word com campos de fotos (2 por tema).
