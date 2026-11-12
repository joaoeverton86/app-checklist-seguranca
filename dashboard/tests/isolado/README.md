# Painel completo com serviços simulados

`npm run preview:isolated` serve http://127.0.0.1:32408/dashboard/ por até 15 minutos. É uma prévia de homologação local: usa o HTML, CSS, scripts clássicos e handlers do painel atual, com autenticação, dados, Chart, XLSX e demais bibliotecas externas simulados. Gráficos e arquivos Word/Excel reais não são homologados por esta prévia.

O servidor permite apenas os scripts locais encontrados no HTML, CSS do painel e o mock. Bloqueia outros arquivos e métodos. A resposta HTML remove scripts/estilos de CDN, inclui o mock antes do produto e aplica CSP com `connect-src 'none'`, `worker-src 'none'`, `frame-src 'none'` e `form-action 'none'`. Imports HTTP de fontes no CSS também são removidos da resposta local, sem editar o CSS original. O fetch do mock mantém dados fictícios somente no localStorage dessa origem. Não lê .env, não usa credenciais reais nem faz conexões a Supabase/Drive. Cabeçalhos de autenticação enviados pelo app são ignorados pelo mock.

O banner identifica a simulação. Nenhuma sessão real é validada e nenhuma RLS é exercitada. `mocks.js` nunca deve ser incluído em `dashboard/index.html`. A pasta e o servidor de prévia estão excluídos pelo `.vercelignore`; esse arquivo ainda precisa ser respeitado pelo processo efetivo de publicação. Não publicar esta prévia como app operacional.

## Repetir a verificação com um agente no Orca

1. Ler a skill orca-cli e sua referência de navegador; iniciar o comando em um terminal próprio.
2. Abrir a URL local em uma aba de teste. Usar o id dessa aba em todos os comandos; não reutilizar uma aba operacional.
3. Executar o conteúdo de `verificar-fluxos.js` com `orca eval --page <id> --expression <conteúdo> --json`. O script retorna JSON com nove cenários. Não chama login real; prepara estado de Kits com dados fictícios e executa as funções reais no painel completo.
4. Salvar o resultado, recarregar a página e executar `verificar-recarga.js`: quatro cenários adicionais de recarga, persistência simulada e troca entre edição e novo cadastro.
5. Capturar e conferir visualmente o painel. Encerrar o servidor com POST em http://127.0.0.1:32408/__teste/encerrar ou Ctrl+C no terminal criado para ele.

Os scripts não entram automaticamente em `npm test`, pois dependem de um navegador e de uma origem específica. Eles pressupõem esta fixture, não devem ser executados em uma página de produção. Os bancos simulados persistem após recarga; as gravações usam ids determinísticos para não duplicar a presença. `verificar-fluxos.js` limpa apenas os caches de dados dessa origem antes da execução; não chama serviços reais.

## Evidências em 11/11/2026

Nove cenários de fluxos e quatro de recarga aprovados em navegador Orca, sem erros JS/unhandled rejection, console.error ou endpoints não previstos. Captura em `scratch/governanca/painel-completo-terceiros.png`; resultados em `painel-completo-resultados.json` e `painel-completo-recarga.json` na mesma pasta local, ignorada pelo Git.

Na preparação inicial, a fixture usava um campo PJ não reconhecido pelo app; foi corrigida para `estabilidade: 'PJ'` e `empresa`, com limpeza do cache dessa origem antes de repetir. A primeira saída foi preservada em `painel-completo-primeira-execucao.json`. Isso foi correção de teste, não defeito do produto.

Limites: sem backend PostgreSQL real, Auth real, RLS, concorrência entre clientes, Drive ou renderização de bibliotecas externas. A persistência verificada é a do mock. Teste autenticado em ambiente isolado permanece pendente.
