# Pastas antecipadas pelo cronograma

Implementação local v288 (extensão de acesso a fotos), 04/11/2026. Regra confirmada por João: preparar antes da realização, usando a data prevista e o tema cadastrado. A função não altera o cronograma nem a seleção mensal de fotos.

## Uso

Use **Criar pastas de fotos de treinamentos** no Cronograma, **Criar pastas de fotos DDSMA** no Calendário de Temas ou **Criar pastas de fotos** no Acervo. Também permanece disponível em Fotos do Relatório. Ano/mês vêm da tela de origem e podem ser ajustados. Em seguida, escolher Treinamentos ou DDSMA e informar o link da pasta mensal da categoria correspondente no acervo oficial. Exemplo: `10_OUTUBRO_2026`. Conferir a prévia e confirmar a criação. O destino é lembrado neste navegador por competência e categoria.

O usuário escolhe a pasta mensal para preservar a hierarquia que já organizou no Drive. A função cria somente as subpastas de data/tema; não cria ano/mês automaticamente nem move, renomeia ou exclui conteúdo existente. Treinamentos usam `treinamentos_cronograma.data_prevista` e o nome do catálogo; DDSMA usa `dds_temas_cronograma.data` e `tema`. Eventos cancelados são ignorados; turmas de mesmo tema/data compartilham uma pasta. Limite: 200 eventos por competência e 1.000 itens do catálogo.

Nomes gerados: `06.10.2026 — IgE - Abelhas`. Pastas existentes com diferenças de caixa, espaços ou separadores hífen/travessão são reaproveitadas. Duplicidade prévia bloqueia a operação para conferência. Reprogramar ou mudar um tema exige nova prévia e pode gerar uma nova pasta: pastas antigas são preservadas, sem afirmar que uma renomeação aconteceu. O nome de uma pasta não comprova realização.

## Integração e autorização

- Novo endpoint `POST /api/cronograma-pastas`; chamadas de prévia não gravam no banco/Drive. O servidor relê o calendário e exige a assinatura da prévia na confirmação.
- Exige sessão real de Supabase Auth validada no servidor, e perfil de edição ou administrador interno ativo. Conta rápida TESTE/estado em localStorage não serve como autenticação. Perfis desativados ou restritos à saúde não podem executar a operação.
- Supabase: URL do projeto atual como padrão, `SUPABASE_URL` opcional. Chave pública por `SUPABASE_ANON_KEY` ou cabeçalho `apikey` enviado pelo painel. Todas as consultas/gravações usam o JWT do usuário, sem service role. A conta precisa das políticas existentes para ler cronograma/catálogo, identificar seu perfil e ler/inserir `configuracoes_sistema`. Nenhuma política foi alterada.
- Drive: variáveis existentes `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, com permissão de escrita. Raiz por `GOOGLE_DRIVE_FOTOS_ROOT_ID` ou busca inequívoca de `SST - Fotos & Evidências`. Destino precisa ser pasta mensal da competência, dentro dessa raiz; não recebe um destino arbitrário nem altera compartilhamento.
- Reserva leve `configuracoes_sistema.id = drivepasta_<hash>` guarda ID pré-gerado pelo Drive, pasta pai e nome. O identificador único no banco resolve concorrência entre instâncias; conflito no Drive confirma o mesmo ID. Não armazena imagens, senhas ou tokens. Sem mudança de esquema.
- Operação por lote não é transação entre Drive/banco. Em falha/timeout, algumas pastas podem existir; consultar novamente permite retomar. Renomeações/criações manuais simultâneas fora do aplicativo exigem conferência humana.

## Verificação local

`node --test api/tests/cronograma-pastas.test.cjs dashboard/tests/cronograma_pastas.test.cjs dashboard/tests/relatorio_sms_fotos.test.cjs`

Nove testes aprovados com banco e Drive simulados: prévia sem gravação, repetição, concorrência, retomada de falha, permissões, raiz, competência, duplicidade, agrupamento, cronograma alterado, reutilização de nome legado; tela com consulta/cancelamento/confirmação/troca de destino/erro; regressão do seletor de aplicações realizadas. Prévia conferida visualmente em `scratch/sms-melhorias/cronograma-pastas-previa.png`. Sintaxe e lint padrão aprovados; lint padrão não inclui os módulos novos.

Sem criação de pastas reais, gravações de teste em produção, commit, push ou deploy desta função. Pendente teste autenticado real com as permissões existentes e OAuth de escrita. Alterações concorrentes do relatório SMS em `relatorio_sms_nc.js`, testes e documento de validação foram preservadas; em `index.html`, a integração deste incremento é a tag do novo módulo e versão de `relatorio_sms_fotos.js`.

Referências: [criação de pastas no Drive](https://developers.google.com/workspace/drive/api/guides/folder), [busca de arquivos](https://developers.google.com/workspace/drive/api/guides/search-files), [validação de usuário Supabase](https://supabase.com/docs/reference/javascript/auth-getuser).

## Separação de escaneados e fotos — v288

Os botões existentes `sincronizarPastasDriveCronograma()` continuam com o mesmo comportamento e agora exibem explicitamente “escaneados”. Seu Apps Script e suas raízes não foram alterados. O fluxo de fotos usa a API autenticada, com destino dentro da raiz de Fotos & Evidências, sem reaproveitar o destino de escaneados. Há 11 testes locais aprovados no conjunto de pastas/fotos, incluindo acesso a partir de DDSMA, alteração de período, destinos isolados por categoria e presença dos botões separados. Não houve teste autenticado ou criação real de pastas de fotos nesta extensão.
