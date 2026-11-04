# Seleção mensal de fotos — Relatório SMS (organizador v281, relatório v283)

## Fluxo para o colaborador

1. Enviar as fotos recebidas no WhatsApp para a pasta do tema no Drive, usando o fluxo de upload já existente no Drive. Esta funcionalidade não acessa o WhatsApp nem duplica fotos no Supabase.
2. No **Relatório Mensal SMS**, escolher mês/ano e abrir **Organizar fotos do mês**.
3. Adicionar categoria, tema e data real de aplicação. O cronograma pode fornecer sugestões de temas; previsão não é usada como comprovação de execução.
4. Escolher os arquivos navegando no Drive ou colando os links das fotos. Selecionar duas fotos por tema/data de treinamento; para DDSMA, escolher manualmente uma amostra de um ou dois arquivos por bloco. Não há coleta automática de fotos de todos os encarregados.
5. Ajustar a ordem e usar **Salvar progresso**. A seleção é compartilhada e pode ser retomada em outro dia/computador. Alterações ainda não salvas são sinalizadas; fechar/recarregar exige confirmação de descarte.
6. Ao terminar, usar **Fechar seleção para o relatório** e gerar o Word ou a impressão. As fotos e legendas entram na seção 9. A seleção pode ser reaberta para ajustes, preservando as referências; deve ser fechada novamente antes da próxima geração.

A ordem é respeitada dentro de cada categoria: treinamentos na seção 9.1 e DDSMA na 9.2. Tema e data ficam abaixo das fotos. A seleção de DDSMA é editorial/manual, não uma amostragem estatística. A listagem usa nomes; o link **Ver no Drive** permite conferir a foto sem carregar o acervo no painel.

## Armazenamento e desempenho

- Reutiliza `configuracoes_sistema`: uma linha `relsms_fotos_AAAA-MM`, com JSON versão 1, competência, status, limite de DDSMA e blocos ordenados de tema/data/IDs de arquivos. Sem nova tabela, Storage ou migration. Não grava pixels, miniaturas, base64 ou URLs temporárias.
- Limites preventivos: até 40 blocos, 80 fotos no mês e 64 KiB de JSON; DDSMA tem teto padrão de 12 fotos, ajustável pelo gestor entre 2 e 24. Treinamentos têm no máximo duas fotos por bloco, obrigatoriamente duas no fechamento.
- Não há consulta, polling, varredura ou download ao carregar o script. Abrir o organizador lê somente a linha da competência; salvar é explícito. O cronograma é consultado apenas ao clicar, com projeção de campos e limites.
- Navegação Drive: 30 arquivos/pastas por página, consulta de uma pasta por vez, sem busca recursiva do acervo. Validação de ascendência limitada a seis níveis. A checagem desta categoria não usa o fallback antigo de varrer descendentes.
- Fechamento: até duas transferências simultâneas; solicita uma versão reduzida ao provedor, limita o recebimento no navegador a 8 MiB por arquivo e gera JPEG de até 1000 × 700 px (proporção preservada). Limite de 600 KB por imagem otimizada e 16 MiB do conjunto. Não existe cache global dos binários; cada geração usa seu próprio snapshot.
- Uma foto indisponível, formato inválido ou limite excedido interrompe a geração com aviso. Não é emitido sucesso omitindo uma foto selecionada. Imagens removidas/substituídas no Drive podem afetar gerações futuras; o documento gerado deve ser guardado como versão final pelo processo existente.
- Não foram criados serviços, filas, jobs, assinaturas ou dependências pagas. O consumo continua contando nas cotas das ferramentas existentes, inclusive o tráfego do proxy de imagens. Gerar várias vezes baixa novamente as imagens (sujeito ao cache HTTP já existente).

## Concorrência e permissões

A edição compara `atualizado_em` no PATCH, impedindo sobrescrever silenciosamente a seleção alterada por outra sessão. Novo mês usa INSERT, não upsert destrutivo. Gravação precisa ser confirmada por leitura. Se houver conflito, o trabalho local é mantido e o operador deve consultar a versão salva.

Usa a permissão existente `usuarioPodeGravarModulo('relatoriosms')`. Perfis de consulta não recebem ações de edição. As políticas atuais de `configuracoes_sistema` foram consultadas somente para leitura; são amplas (`public`, ALL, true). Esta entrega não restringe nem amplia RLS e não deve ser apresentada como endurecimento de segurança. O fluxo de campo não usa os novos IDs.

## Integração Drive e compatibilidade

`api/anexos-drive-listar.js` passa a aceitar categoria `fotos`, resolvendo a raiz por `GOOGLE_DRIVE_FOTOS_ROOT_ID` quando configurada ou por busca exata de `SST - Fotos & Evidências` nas pastas acessíveis ao OAuth existente. Mais de uma pasta com esse nome exige identificação explícita; não escolhe a primeira silenciosamente. O título da pasta atualmente configurada no painel foi confirmado em consulta pública somente de leitura. O acesso OAuth ao conteúdo ainda precisa do teste integrado autenticado. Caso a raiz seja movida/renomeada ou não esteja acessível à integração, a interface informa o erro e oferece seleção pelo link do arquivo.

O processamento de imagens reutiliza `/api/proxy-imagem` com IDs validados e URL Google construída pelo código. Esse proxy preexistente tem escopo próprio de segurança; não foi modificado nesta tarefa. Não foram alterados OAuth, segredos ou permissões do Drive. Não se fazem uploads, exclusões ou compartilhamentos novos por esta funcionalidade.

Quando existe seleção mensal em rascunho, o relatório pede seu fechamento. Quando não existe seleção, mantém o caminho anterior do relatório, preservando dados legados. A prévia resumida do dossiê no painel continua leve; as imagens são incorporadas nas saídas Word e impressão. O organizador apresenta os blocos selecionados sem baixar as imagens.

## Arquivos e verificação

- `modules/relatorio_sms_fotos.js`: organização, persistência mensal, seleção Drive, orçamento das imagens e construção das seções fotográficas.
- `modules/relatorio_sms_nc.js`: pontos de integração no Word e na impressão. As demais seções não foram reescritas.
- `index.html`: botão, organizador v281 e relatório v283 (correção de compatibilidade de imagens no Microsoft Word). O módulo novo carrega após o relatório; não redefine funções homônimas do núcleo legado.
- `api/anexos-drive-listar.js`: somente extensão da categoria e limites; demais categorias mantêm comportamento anterior.

Verificações locais de 03/11/2026:

- `node --check` nos três JavaScripts alterados e `git diff --check`: aprovados.
- `npm run lint`: aprovado sem erros na conferência após a base c5b380c; o comando atual não cobre os módulos novos. A referência anterior aos 30 erros foi superada pela correção v282.
- `scratch/relsms-fotos/testar.cjs`: Playwright com Supabase e Drive simulados, JSONB com chaves reordenadas, criação/salvamento/reabertura, conflito entre sessões, fechamento, isolamento de mês, modo consulta, processamento real de imagens fictícias, limite observado de duas transferências simultâneas e falha de foto bloqueando geração. Também exercita os pontos reais `montarDocRelSms` e `imprimirRelatorioMensalSms`, com as demais seções/dados simulados.
- DOCX gerado pela biblioteca 9.6.1 usada no painel, XML válido com três desenhos e legendas; renderização com docx-preview e inspeção visual. Impressão HTML renderizada no Chromium, sem dependência de imagens externas após o fechamento. A renderização de DOCX no navegador não substitui a conferência final da paginação no Word.
- `scratch/relsms-fotos/testar-api.cjs`: teste do handler com Drive simulado, raiz, página de 30, filtro de imagens, paginação e recusa de pasta externa sem varrer a árvore.
- Na etapa inicial simulada, o banco real foi somente consultado; tamanho medido de aproximadamente 34 MB. A etapa real abaixo gravou a seleção de homologação. A medição não audita todas as cotas de uso.

Evidências com dados fictícios: `scratch/relsms-fotos/selecao-fechada.png`, `previa-impressao.html`, `previa-impressao.png`, `amostra-fotografica.docx`, `word-renderizado.png` e `relatorio-integracao.docx`.

### Teste local autenticado com fotos reais — 03/11/2026

- Painel local com handlers reais, Conta Teste pelo botão de acesso rápido existente, sem alterar login/permissões. Sessão Admin, `usuarioPodeGravarModulo('relatoriosms')` verdadeiro. O cadastro de Natan Laurindo da Silva (matrícula 174) também indica Admin; essa consulta não equivale a login como Natan.
- Competência outubro/2026: data 06/10/2026 associada ao tema **IgE - Abelhas**, conforme cronograma real. Duas fotos fornecidas por João adicionadas pelos links do Drive. A pasta DDSMA estava vazia; um terceiro arquivo foi usado em bloco explicitamente marcado **TESTE DE HOMOLOGAÇÃO**, sem comprovar DDSMA real.
- Salvar progresso, fechar janela, recarregar, reabrir e fechar seleção passaram pela interface. Leitura independente confirmou grupos, ordem, datas e IDs persistidos. JSON medido com 636 bytes, sem binários.
- **Estado deixado no banco conectado:** `configuracoes_sistema.id=relsms_fotos_2026-10`, seleção fechada contendo o bloco DDSMA de teste. Precisa ser reaberta e ajustada antes de emissão oficial. Não houve exclusão de dados nem publicação de código.
- A listagem OAuth local não passou: a configuração local não conseguiu acessar a categoria de fotos. A pasta foi conferida no Drive com sessão já aberta; a alternativa de links e o proxy real de imagens funcionaram. Nenhuma credencial ou permissão foi alterada.
- Exportação completa com fotos reais detectou corrupção no Microsoft Word: logo/gráfico eram incluídos sem `type` pela biblioteca docx, produzindo arquivos `.undefined`. Corrigidos os tipos PNG do logo/gráfico e identificação por assinatura nas fotos legadas. O DOCX completo regenerado abriu no Microsoft Word em somente leitura; cinco desenhos no corpo (logo, gráfico e três fotos), sem mídias `.undefined`.
- A leitura pelo Word localizou as três fotos na página 14, cada uma com aproximadamente 189,75 × 142,5 pontos. Após reinício do Orca, a conferência visual foi concluída no Microsoft Word: duas fotos lado a lado, tema/data abaixo e amostra DDSMA explicitamente marcada como teste, sem cortes aparentes. Captura: `scratch/homologacao-real-sms/word-real-pagina14.png`. A exportação PDF que travava foi dispensada; não se afirma validação de impressora física.
- A abertura não apareceu no navegador integrado. Teste posterior com Chromium separado, autenticação pelo botão Conta Teste, navegação pelo grupo Relatórios e clique real em Visualizar / Imprimir confirmou popup real com o documento completo. Três fotos na seção 9 carregadas, tema/data preservados, páginas de treinamento e DDSMA conferidas visualmente com mídia print e viewport 794 × 1123 (A4 a 96 dpi), sem cortes aparentes. Evidências: `resultado-impressao.json`, `impressao-real-treinamento.png` e `impressao-real-ddsma.png` na mesma pasta. Script `verificar-impressao-real.cjs` usa banco/proxy reais e não salva nem altera a seleção.
- Reexecutados: testes simulados do organizador e API, sintaxe dos três scripts, lint e diff. A regressão DOCX agora inclui logo real na integração e recusa mídias `.undefined`.

Evidências locais reais: `scratch/homologacao-real-sms/Relatorio_SMS_Outubro_Homologacao.docx`, `selecao-real-fechada.png` e `Corrompido_Antes_Correcao.docx` (comparação da falha). Os artefatos de teste não são versão oficial do relatório. Sem commit, push ou deploy.

## Referências de limites

Consultadas em 03/11/2026: [Supabase Free — banco e franquias](https://supabase.com/pricing), [cotas da API Drive](https://developers.google.com/workspace/drive/api/guides/limits) e [Vercel Hobby](https://vercel.com/docs/plans/hobby). O Free do Supabase informa 500 MB de banco; o orçamento de JSON desta funcionalidade fica limitado a 768 KiB por ano, antes do overhead do banco. As cotas são compartilhadas com o restante do sistema. Elegibilidade do plano e regras comerciais dos provedores continuam aplicáveis; a implementação não altera planos nem garante gratuidade de qualquer volume de uso.
