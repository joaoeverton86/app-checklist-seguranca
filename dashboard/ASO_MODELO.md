# Modelo próprio de ASO — Saúde Ocupacional

Implementado em `modules/saude_psicossocial.js`, funções `gerarHtmlModeloAsoCop` e `abrirModeloAsoCop`. Os botões estão na aba ASOs e no formulário de exame em `index.html`; o módulo carrega depois do núcleo, sem redefinir funções legadas homônimas.

## Uso e limites

- **Modelo ASO em branco**: preenche somente a identificação da organização configurada no painel.
- **Modelo ASO deste colaborador**: acrescenta nome, CPF, matrícula, função, setor e modalidade selecionada no formulário. Conferir esses dados antes de emitir.
- A prévia permite editar os campos e marcar as opções antes da impressão. As alterações existem somente nessa aba; não há gravação, histórico ou assinatura eletrônica nesse recurso. Pode-se também preencher o papel.
- Riscos, inexistência de riscos sujeitos a controle, exames realizados e datas, conclusão, aptidões específicas e identificação médica não são inferidos nem copiados de previsões. O médico deve preencher, conferir e assinar.
- Exames complementares isolados, sem exame clínico, exigem recibo de resultados; este modelo não deve ser usado para emitir ASO nessa situação.
- O modelo padrão cabe em A4 com margens de 10 mm. Textos extensos podem acrescentar páginas; conferir a prévia de impressão e identificar/assinar eventuais continuações.
- Não há atualização de validade de ASO, status, banco, anexos ou dados do campo. O ASO preenchido e assinado pode ser anexado pelo fluxo já existente.

## Referências oficiais consultadas em 03/11/2026

- [NR-07 — texto disponibilizado pelo MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-07-atualizada-2022.pdf): itens 7.5.19 a 7.5.19.3. Campos da organização, trabalhador, riscos sujeitos a controle médico ou sua inexistência, exames e datas, aptidão, responsável pelo PCMSO se houver, examinador e assinatura; disponibilização comprovada ao trabalhador e aptidões específicas.
- [Resolução CFM 2.381/2024, texto do CFM](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2024/2381_2024.pdf): identificação médica e do paciente, CRM/UF, RQE quando houver, data, contato, endereço e assinatura adequada ao suporte.
- [NR-35 — página oficial](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-35-nr-35): aptidão específica para trabalho em altura.
- [NR-33 — texto oficial retificado](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/arquivos/normas-regulamentadoras/nr-33-atualizada-2022-_retificada.pdf/@@download/file): item 33.5.19.2, aptidão específica para espaço confinado.

A presença dos campos não comprova conformidade de um ASO individual: depende do PGR/PCMSO aplicável, exame clínico, preenchimento e emissão médica. Não se trata de validação ou homologação médica automática.

## Verificação desta entrega

- `node --check dashboard/modules/saude_psicossocial.js` e `git diff --check`: aprovados.
- Teste local E2E (`scratch/aso-modelo/teste-local-e2e.cjs`): aprovado via Playwright/Chromium em 6 cenários (modelo em branco com dados da empresa; bloqueio amigável de seleção vazia; modelo por colaborador com dados e modalidade; troca de colaborador sem resíduos; edição na prévia; e altura de impressão A4 em 1023.8 px, abaixo do limite de 1046 px úteis).
- Teste de servidor local (`scratch/aso-modelo/teste-integrado-servidor.cjs`): aprovado em servidor HTTP local acessando `/dashboard/`, confirmando a presença física dos botões no DOM e a disponibilidade das funções de geração.
- `npm run lint`: mantidos os mesmos 30 erros preexistentes no núcleo antes e depois (não cobre este módulo).
- **Ressalvas e Limitações**: Testes locais e de servidor local com dados fictícios não constituem teste autenticado em produção. O recurso utiliza o helper padronizado `abrirDocumentoHtmlParaImpressao` para envio à impressão. A homologação clínica, o preenchimento dos exames e a assinatura do ASO permanecem sob estrita responsabilidade do médico do trabalho examinador/coordenador.
