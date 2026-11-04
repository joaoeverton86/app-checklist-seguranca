# Relatório Mensal SMS — incremento local v285

Base: c52ac71. Implementação iniciada em 04/11/2026 a pedido de João, a partir da revisão de 12 itens em scratch/revisoes/2026-11-03-relatorio-mensal-sms-melhorias-futuras.md.

## Regra de apresentação confirmada

João mantém informações para resolução interna e escolhe o que expor ao cliente. Preservar o modo executivo e suas ocultações. Informação omitida não recebe valor zero nem declaração automática de conformidade. No resumo de atrasos do PGR, a versão executiva omite a linha na impressão e indica não apresentado no painel.

## Implementado neste incremento

- SMS-01/02: sem checklist, inspeção ou aferição não há 100% presumido. Removidos os 37 extintores fictícios e a substituição de inspeção por validade cadastral. ASO ausente/desconhecido separado de aptos. Textos de EPI, brigada, resíduos e manutenção limitados à evidência; eficácia parcial não contada como comprovada.
- SMS-03 (parcial): removido fallback de efetivo histórico zero para efetivo ativo atual. Word/impressão explicam que posições atuais não constituem retrato histórico fechado.
- SMS-04: regra expressamente confirmada por João: dias corridos por atestado na competência, mantendo sobreposições. Usa data final ou duração inclusiva; sem intervalo válido não soma e informa quantidade. Não deduplica por colaborador. Conversão em horas é aproximação pela jornada configurada, sem retirar folgas.
- SMS-05: HHT zero configurado é mantido; mensal e acumulado usam a mesma regra, com identificação de estimativa. Taxas sem HHT positivo ficam sem base de cálculo.
- SMS-07 (parcial): Word recebe o mesmo objeto consolidado para checklists e saúde/atestados; extração dessas duas seções não altera filtros nem renderiza as respectivas telas.
- SMS-09 (parcial): testes versionados sem banco real em dashboard/tests. O lint padrão permanece com cobertura restrita; análise adicional de no-undef dos dois módulos foi executada com catálogo de declarações globais do projeto.
- SMS-10/11 (parcial): cronograma consulta datas previstas OU realizadas, inclui reprogramados de outro mês, oferece botões com tema/data real e prevista, exige escolha explícita e guarda cronogramaId auxiliar. Mostra quantidade de aplicações realizadas sem par de fotos. Consulta limitada a 500 registros, não é prova de cobertura integral. Não seleciona fotos automaticamente.

## Verificação

Comando reprodutível: `node --test dashboard/tests/relatorio_sms.test.cjs dashboard/tests/relatorio_sms_fotos.test.cjs`.

Seis testes aprovados: base vazia; resultados ASO; atestados entre meses/anos/bissexto/sobrepostos; HHT; HTML executivo completo com atrasos ocultos; navegador com cronograma e aplicação explícita. Sintaxe dos dois módulos, npm run lint e git diff --check aprovados.

Teste de regressão fotográfica local aprovado com banco/Drive simulados: salvar, fechar/reabrir, concorrência, troca de competência, perfil consulta, downloads limitados, mídia embutida e falha de foto bloqueante. Fixture adaptada em scratch/sms-melhorias/testar-fotos.cjs para o novo objeto HHT. DOCX de seção executiva renderizado e conferido; HTML completo vazio renderizado em 12 contêineres A4, sumário conferido visualmente. Evidências em scratch/sms-melhorias/. Isto não equivale à abertura do relatório completo atualizado no Microsoft Word nem à conferência de todas as páginas.

## Ainda pendente da revisão de 12 itens

- SMS-03: snapshot histórico/reemissão imutável (não implementado).
- SMS-06: carregamento por fonte, propagação das falhas hoje absorvidas pelos loaders e medição de rede. Não é seguro declarar esse item resolvido só envolvendo as funções atuais em Promise.all.
- SMS-07: demais seções ainda têm caminhos distintos e alguns renderizadores temporários de EPI/acidentabilidade. Não foi consolidado todo o relatório.
- SMS-08: duplicações no núcleo preservadas; módulo prevalece pela ordem atual de scripts. Sem remoção em massa.
- SMS-09: lint permanente dos módulos e testes de todas as saídas ainda incompletos.
- SMS-11: marcação formal de homologação, revisão humana no fechamento e miniaturas sob demanda.
- SMS-12: revisão/hash do conjunto emitido e arquivo final no acervo, com política de retenção; nenhum schema/storage novo foi criado.
- Validação autenticada com registros reais, conferência completa Word/impressão e validação operacional de João.

Sem commit, push, deploy, mudança de banco/RLS ou gravação de teste em produção. Este incremento não encerra os 12 itens da revisão.
