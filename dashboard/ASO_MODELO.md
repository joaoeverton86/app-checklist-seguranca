# Modelo próprio de ASO — Saúde Ocupacional

Implementado em `modules/saude_psicossocial.js`, funções `gerarHtmlModeloAsoCop` e `abrirModeloAsoCop`. Os botões estão na aba ASOs e no formulário de exame em `index.html`; o módulo carrega depois do núcleo, sem redefinir funções legadas homônimas.

## Uso e limites

### Clínicas parceiras e médicos examinadores (v280, implementação local)

- Na aba ASOs, **Clínicas e médicos parceiros** abre o cadastro administrativo compartilhado. Permite criar/editar estabelecimentos (nome, CNPJ opcional, cidade, endereço e contato) e médicos (nome, CRM/UF, RQE opcional, endereço, contato e vínculos com vários estabelecimentos). Inativar mantém o cadastro, retirando-o de novas seleções.
- No formulário do colaborador, **ASO com clínica / examinador** permite escolher primeiro a clínica e depois um médico ativo vinculado. Trocar a clínica limpa o examinador. Não existe escolha automática de examinador.
- O responsável pelo PCMSO é lido do Documento-Base salvo (`pcmso_documento_base`), sem usar rascunho não salvo. Quando não existe registro remoto, usa os parâmetros iniciais já existentes no módulo PCMSO (Cícero Henrique Pereira de Menezes). Dados de registro profissional são os já cadastrados no PCMSO; devem ser conferidos na emissão.
- Coordenador e examinador aparecem em campos distintos no ASO; o estabelecimento de atendimento não substitui a organização empregadora. A seleção de prestador preenche **somente a prévia**: não é gravada no histórico de exames. Nenhum ASO antigo é reescrito. Os botões de modelo sem prestador continuam disponíveis.
- Persistência do cadastro: uma linha por entidade em `configuracoes_sistema`, com ID `saude_prestador_<UUID>` e `valor` JSON. Reutiliza os helpers e permissões existentes, sem migration, nova tabela ou mudança de RLS. Sem prontuários, diagnósticos ou dados de trabalhadores nesse cadastro.
- Edições usam comparação de `atualizado_em` para detectar alterações concorrentes. A leitura após a gravação precisa confirmar o conteúdo antes de exibir sucesso. Somente perfis com `usuarioPodeGravarModulo('saude')` têm ações de edição; a autorização efetiva continua dependendo das políticas existentes no banco.
- Implementação: `modules/saude_prestadores.js`, carregado após Saúde e PCMSO. Não modifica nem sobrescreve o Documento-Base.

Testes desta extensão: `node --check` nos dois módulos; `git diff --check`; testes locais anteriores do modelo; teste de servidor local; e `scratch/aso-modelo/teste-prestadores.cjs` com Playwright e persistência simulada. Cenários: criação, edição, leitura após salvar e reabertura, vários vínculos, cancelar, conflito, inativação, filtro/reset do médico, perfil de consulta, falha de rede e modelo com coordenador separado do examinador. Conferência visual do modelo parceiro em A4 (aproximadamente 1034 px úteis de 1046 px disponíveis). Lint geral mantém os 30 erros anteriores e não cobre os módulos.

**Pendente nesta extensão:** teste de gravação/leitura no banco real com sessão autenticada e validação operacional. As políticas reais não foram auditadas ou alteradas. Testes simulados não confirmam autorização de banco nem publicação. Evidências locais: `scratch/aso-modelo/cadastro-parceiros.png`, `aso-parceiro.png` e `aso-parceiro.html` (somente dados fictícios).

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

- `node --check` em `dashboard/modules/saude_psicossocial.js` e `dashboard/modules/saude_prestadores.js`: aprovados.
- `git diff --check`: aprovado.
- Teste local E2E (`scratch/aso-modelo/teste-local-e2e.cjs`): aprovado via Playwright/Chromium em 6 cenários (modelo em branco com dados da empresa; bloqueio amigável de seleção vazia; modelo por colaborador com dados e modalidade; troca de colaborador sem resíduos; edição na prévia; e altura de impressão A4 padrão em 1003.8 px).
- Teste de prestadores parceiros (`scratch/aso-modelo/teste-prestadores.cjs`): aprovado em testes E2E com persistência simulada (criação, edição, CAS por `atualizado_em`, vínculos múltiplos, cancelamento, inativação lógica, filtro dinâmico de examinadores, coordenador separado e modelo parceiro em A4 medindo 1033.8 px <= 1046 px útil).
- Teste de servidor local (`scratch/aso-modelo/teste-integrado-servidor.cjs`): aprovado em servidor HTTP local acessando `/dashboard/`, confirmando a presença física dos botões no DOM e a disponibilidade das funções de geração com prestador parceiro (v280).
- `npm run lint`: mantidos os mesmos 30 erros preexistentes no núcleo antes e depois (não cobre estes módulos).
- **Ressalvas e Limitações**: Testes locais e de servidor local com dados fictícios não constituem teste autenticado em produção. O recurso utiliza o helper padronizado `abrirDocumentoHtmlParaImpressao` para envio à impressão. A homologação clínica, o preenchimento dos exames e a assinatura do ASO permanecem sob estrita responsabilidade do médico do trabalho examinador/coordenador.
