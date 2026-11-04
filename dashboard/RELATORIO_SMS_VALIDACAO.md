# Relatório Mensal SMS — incremento local v288 (Saneamento dos Bloqueios de Fechamento/Arquivamento)

Base: f8352d9. Incremento refinado em 04/11/2026 após auditoria rigorosa multiagente (Copilot & Antigravity), atendendo a todas as diretrizes de João e saneando os 5 bloqueios identificados na reauditoria v287 (`scratch/ponte/para-antigravity/2026-11-04-1519-reauditoria-sms-v287-copilot.md`).

## Resolução dos 5 Bloqueios de Homologação e Arquivamento

1. **Bloqueio 1 — Sigilo da Cópia no Drive e Permissões Restritas:**
   - Em `dashboard/index.html`, o checkbox `relSmsFiscalizacao` passa a vir marcado por padrão (`checked`), sob a denominação "Relatório Executivo Oficial (Ocultar notas e pendências internas)".
   - Na homologação (`relSmsHomologarEFecharCompetencia`), a confirmação exige ciência explícita do perfil selecionado (Executivo Oficial vs Dossiê Interno) e documenta que a cópia oficial arquivada no Drive corporativo omite notas internas para resguardar o sigilo do cliente.
   - A função `relSmsArquivarNoAcervo` adota `tornarPublico: false` por padrão: **NÃO** chama `/api/anexo-finalizar`, mantendo o arquivo restrito ao ambiente corporativo do Google Workspace da obra. A concessão pública só ocorre se autorizada explicitamente (`tornarPublico: true`), com verificação obrigatória de `response.ok` (lançando exceção em caso de falha HTTP).
   - O upload valida o retorno de ID válido pelo Drive antes de retornar metadados.

2. **Bloqueio 2 — Congelamento Integral do Snapshot (Imutabilidade Absoluta):**
   - No fechamento (`relSmsHomologarEFecharCompetencia`), o snapshot captura integralmente todas as seções: `dadosCompletos` (HHT, Efetivo, Treinamentos, Inspeções, Indicadores, Destaques), `dadosSecao1`, `dadosSecoes23`, `dadosMeioAmbiente`, `dadosFase4`, `fotos` (selecionadas e preparadas) e `anexos`.
   - Em `montarDocRelSms`, `construirHtmlDossieOficialRelSms` e `imprimirRelatorioMensalSms`, quando a competência está fechada (`status === 'fechado'`), todas as seções e fotos são extraídas estritamente do snapshot congelado, eliminando qualquer re-consulta remota ao vivo.

3. **Bloqueio 3 — Diferenciação entre Competência Aberta e Falha de Conexão/Permissão:**
   - `relSmsObterSnapshotFechamento` retorna `null` **apenas** quando o banco responde normalmente e não há registro (mês legitimamente em aberto).
   - Em caso de falha de conexão, erro HTTP 5xx, timeout ou permissão negada, `relSmsObterSnapshotFechamento` lança exceção explícita (`throw erroConexao`).
   - O painel (`carregarEVisualizarRelatorioSmsPainel`), a impressão (`imprimirRelatorioMensalSms`) e a exportação em Word (`gerarRelatorioMensalSms`) capturam esse erro e interrompem a operação com alerta vermelho na tela, **bloqueando categoricamente qualquer recálculo dinâmico ao vivo de meses fechados**.

4. **Bloqueio 4 — Hash Canônico Recursivo e Identificação Criptográfica:**
   - Substituído o filtro simples de chaves pela função `relSmsCanonicalStringify(val)`, que serializa recursivamente objetos aninhados ordenando chaves alfabeticamente em qualquer profundidade e preservando todas as propriedades filhas.
   - `relSmsCalcularHash` gera SHA-256 canônico via Web Crypto (browser) ou Node `crypto` (testes/CLI), e retorna `{ hash, tipo: 'sha256' }`.
   - Em caso de ausência de suporte criptográfico, aciona fallback determinístico FNV-1a 64 bits explicitamente identificado como `{ hash: 'fnv1a64_...', tipo: 'fnv1a_64_fallback' }`, sem falsas alegações de garantia criptográfica forte.

5. **Bloqueio 5 — Preservação de Histórico de Revisões e Confirmação de Persistência:**
   - Em `relSmsSalvarSnapshotFechamento`, cada revisão é persistida em chave imutável dedicada: `rel_sms_fechamento_${ano}_${mes}_rev${rev}`.
   - A chave principal da competência `rel_sms_fechamento_${ano}_${mes}` é atualizada com o snapshot da revisão mais recente e mantém o array cumulativo `historico_revisoes: [{ revisao, status, fechado_em, fechado_por, hash, hash_tipo, chave_revisao, arquivo_acervo }]`.
   - Implementada confirmação de persistência pós-gravação: se a leitura de confirmação falhar, o sistema lança exceção crítica impedindo que a interface declare falso sucesso.

---

## Verificação e Testes Automatizados

Comando de teste: `node --test dashboard/tests/relatorio_sms.test.cjs dashboard/tests/relatorio_sms_fotos.test.cjs`.

Dezesseis testes aprovados (16/16):
1. Mês vazio não presume conformidade, inspeção ou HHT atual;
2. Resultados ASO: exames sem resultado mantidos separados de aptos;
3. Atestados: recorte estrito da competência, bissexto, duração e sobreposição;
4. HHT: efetivo × 220h padronizado, zero explícito e estimativa operacional aprovada por João;
5. HTML completo: sigilo psicossocial, ausência de acidentes e atrasos ocultos na saída executiva;
6. Prévia do painel: sem inspeções não declara 100% Conforme (selo neutro);
7. Sigilo e privacidade médica: CIDs, diagnósticos e nomes de atestados não vazam para o relatório;
8. SMS-06: carregamento resiliente por fonte permite retry em falhas e compartilha promessa em voo;
9. SMS-07: extração de dados de EPI em memória não depende de renderEpiPanel nem altera filtros;
10. SMS-03/04/12 (Bloqueio 4): chave de fechamento, hash canônico recursivo sobre objetos aninhados e identificação do algoritmo;
11. SMS-03 (Bloqueio 3): `relSmsObterSnapshotFechamento` diferencia mês aberto de falha de conexão/permissão, bloqueando recálculo dinâmico;
12. SMS-03/12 (Bloqueio 5): preservação de revisões múltiplas em chaves dedicadas (`_rev1`, `_rev2`), histórico de revisões e confirmação pós-gravação;
13. SMS-11/12 (Bloqueio 1): arquivamento no Drive restrito corporativamente por padrão (`tornarPublico: false`) e validação de `response.ok`;
14. SMS-03: renderização de competência fechada preserva snapshot imutável e exibe badge de homologação;
15. SMS-03 (Bloqueio 2): congelamento integral do snapshot em `montarDocRelSms` elimina consultas ao vivo de seções e fotos;
16. Cronograma de fotos SMS: data realizada, reprogramação, escolha explícita e progresso.

Conferência estática:
- `node --check dashboard/modules/relatorio_sms_nc.js` (código 0)
- `git diff --check` (código 0)
- `npm run lint` (código 0)
- Cache-busters atualizados para `v288` em `dashboard/index.html`.

---

## Saneamento dos 7 Bloqueios da Reauditoria v288 (Parecer Copilot)

Em resposta à reauditoria v288 (`scratch/ponte/para-antigravity/2026-11-04-1540-reauditoria-sms-v288-copilot.md`), todos os 7 pontos de bloqueio foram integralmente sanados no código e respaldados por testes automatizados dedicados:

1. **Reabertura não sobrescreve a revisão imutável (Ponto 1):**
   - Em `relSmsSalvarSnapshotFechamento`, o upsert na chave dedicada `..._revN` só ocorre se `snapshot.status === 'fechado'`.
   - Quando a competência é reaberta (`status: 'aberto'`), o salvamento atualiza exclusivamente a chave principal de estado (`..._${ano}_${mes}`), mantendo a chave dedicada da revisão fechada 100% intocada e preservada arquivisticamente. Um fechamento subsequente incrementará a revisão gerando `_rev2`.
   - Validado no teste `SMS-03 e SMS-12 (Bloqueio 5)`: fechamento Rev. 1 -> reabertura de competência -> verificação de que a chave `..._rev1` continua fechada e com dados originais -> fechamento da Rev. 2 gerando `..._rev2`.

2. **Hash canônico cobre todo o snapshot (Ponto 2):**
   - O payload do hash em `relSmsCalcularHash` e `relSmsCanonicalStringify` agora inclui: `dados`, `dadosSecao1`, `dadosSecoes23`, `dadosMeioAmbiente`, `dadosFase4`, `fotos`, `anexos`, `fiscalizacao`, `perfil_emissao`, `mes`, `ano`, `revisao`, `fechado_em`, `fechado_por`.
   - Validado no teste `SMS v288 (Ponto 2)`: a alteração de fotos ou da modalidade (`fiscalizacao: true` vs `false`) altera obrigatoriamente o hash gerado.

3. **Modalidade respeitada nas reemissões de competências fechadas (Ponto 3):**
   - Em `montarDocRelSms`, `gerarRelatorioMensalSms` e `imprimirRelatorioMensalSms`, se a competência estiver com `status === 'fechado'`, a opção `fiscalizacao` é forçada para `Boolean(snapshot.fiscalizacao)`. A interface é sincronizada (`chkFiscal.checked = snapshot.fiscalizacao; chkFiscal.disabled = true`), bloqueando emissão divergente da versão homologada sem que haja reabertura formal.
   - Validado no teste `SMS v288 (Pontos 3 e 5)`.

4. **Falha de carregamento bloqueia homologação (Ponto 4):**
   - `garantirDadosCompletosRelatorioMensalSms` aceita o parâmetro `{ exigirSucesso: true }`, disparado exclusivamente durante a homologação e fechamento. Se qualquer das fontes falhar (ex: rede, erro do banco, acidentes, EPIs, etc.), a operação é abortada imediatamente com exceção explícita contendo o nome de cada fonte faltante.
   - Fotos não usam mais catch silencioso quando chamadas no fechamento, propagando erros de preparação fotográfica.
   - Validado no teste `SMS v288 (Ponto 4)`.

5. **Snapshots fechados incompletos bloqueiam exportação sem fallback ao vivo (Ponto 5):**
   - Em `montarDocRelSms`, se a competência for fechada e faltar qualquer seção obrigatória (`dadosSecao1`, `dadosSecoes23`, `dadosMeioAmbiente`, `dadosFase4` ou `anexos`), o sistema lança exceção com erro crítico, impedindo que partes ao vivo sejam mescladas a um snapshot oficial homologado.
   - `relSmsObterSnapshotFechamento` lança erro se `supabaseFetch` não estiver disponível.
   - Validado no teste `SMS v288 (Pontos 3 e 5)`.

6. **Falha na leitura do histórico aborta salvamento e pós-gravação valida payload (Ponto 6):**
   - Em `relSmsSalvarSnapshotFechamento`, qualquer erro em `supabaseFetch` na leitura prévia do histórico aborta a operação com `throw new Error(...)`, impedindo a perda de histórico prévio por falhas transitórias.
   - A confirmação pós-gravação consulta e valida `id`, `status`, `revisao` e `hash` diretamente no banco persistido.
   - Validado no teste `SMS v288 (Ponto 6)`.

7. **Falha de arquivamento no Drive bloqueia o fechamento (Ponto 7):**
   - Em `relSmsHomologarEFecharCompetencia`, se o arquivamento automático da cópia no Google Drive falhar (`relSmsArquivarNoAcervo`), a homologação é cancelada com lançamento de exceção e aviso de retenção, impedindo a declaração de falso sucesso com arquivo pendente.

---

## Bateria de Testes Unificada (30/30 Testes Aprovados)

Comando:
`node --test api/tests/cronograma-pastas.test.cjs dashboard/tests/cronograma_pastas.test.cjs dashboard/tests/relatorio_sms_fotos.test.cjs dashboard/tests/relatorio_sms.test.cjs`

Resultados (100% de aprovação):
- 7 testes de API e segurança em `api/tests/cronograma-pastas.test.cjs`
- 1 teste de interface e ciclo de vida em `dashboard/tests/cronograma_pastas.test.cjs`
- 2 testes de galeria fotográfica e separação em `dashboard/tests/relatorio_sms_fotos.test.cjs`
- 20 testes de regras de negócio, dados, sigilo, integridade e fechamento em `dashboard/tests/relatorio_sms.test.cjs`
- Total: 30 testes passando, 0 falhas, 0 pendências.

---

## Estado de Entrega

- Sem commit, push, deploy na Vercel/GitHub ou alterações em produção.
- Código pronto e validado no working tree para reauditoria final do Copilot e validação operacional de João.
