# Word com campos manuais de fotos — v289

Prioridade definida por João: concluir o relatório mensal sem aguardar a automação do Drive. Base bcdfd74. Botão novo: **Word com campos de fotos (2 por tema)** na seção Relatório Mensal SMS, usando a competência selecionada e a opção de ocultar informações internas já existente.

## Comportamento

Gera o relatório Word com a seção 9 dividida em Treinamentos e DDSMA, dois campos lado a lado por tema, descrição do tema, data prevista e data da aplicação. Treinamentos usam o nome do catálogo e datas do cronograma; incluem reprogramação realizada na competência e excluem cancelados. DDSMA usa o calendário de temas do mês. Mesmas turmas com tema/data idênticos são agrupadas. Ausência de registro de execução deixa a data da aplicação em branco; não transforma previsão em comprovação de realização. Cada tema DDSMA recebe dois campos, sem o limite da amostra fotográfica automática.

No Word, substituir os textos INSERIR FOTO 1/2 pelas imagens, conferir as datas, retirar temas não realizados e concluir a revisão antes de enviar ao cliente. O arquivo tem sufixo `_CompletarFotos.docx` e indicação de edição. A consulta e geração dos espaços não baixa fotos nem exige seleção fechada, pasta do Drive ou arquivamento automático. Não efetua homologação no banco, não reabre nem grava snapshot. Não muda os critérios de ocultação do relatório oficial.

## Correções para a emissão

- Emissão manual pode usar dados históricos sem `snapshot.fotos`, preservando a exigência de dados numéricos/seções existentes. Os calendários são consultados para a edição e a cópia gerada não é rotulada como arquivo homologado imutável.
- Anexos textuais fixos são reconstruídos como elementos docx, evitando a perda de texto ao reutilizar objetos serializados em JSON.
- Wrapper de fontes solicita propagação de erro; loader real de acidentes propaga a falha quando chamado pelo relatório. No modo manual aberto, acidentes são recarregados com propagação e é exigido sucesso no agregador de fontes. Os demais contratos antigos de loaders e a concorrência/serialização do fechamento automático continuam sob investigação; esta correção não declara resolvida toda a automação.

## Arquivos

Novo módulo `dashboard/modules/relsms_fotos_manuais.js`; opção `fotosManuais` em `relatorio_sms_nc.js`; contrato opcional `propagarErro` em `saude_psicossocial.js`; botão e scripts em index.html. Cache-busters v289 somente para esses recursos. Nada no PWA, APIs, banco, RLS ou Drive foi alterado.

## Verificação

`node --test dashboard/tests/relsms_fotos_manuais.test.cjs`

Quatro testes próprios: cronogramas/datas/reprogramação/cancelamento/agrupamento/erro; loader real falhando; DOCX real com 2 campos por tema/legendas/anexos e renderização; exportação integrada manual a partir de snapshot JSON sem fotos, com dependências do Drive proibidas no teste, texto dos anexos presente e download do Word confirmado.

Suíte anterior de 30 testes, sintaxe, npm run lint e git diff --check aprovados. O teste integrado usa indicadores/seções de amostra e não é homologação do relatório completo com dados da obra. DOCX de amostra fictícia e renderização em `scratch/relsms-manual/`; conferidos visualmente. Falta teste autenticado na competência real e conferir o Word final com fotos inseridas pelo usuário. Nenhum dado operacional nem credencial foi copiado para a amostra.

Publicação desta correção autorizada por João em 04/11/2026; evidência de implantação registrada na ponte após conferência do painel. A automação de Drive e fechamento histórico permanece separada e não foi homologada por esta entrega.
