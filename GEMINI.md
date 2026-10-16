# Diretrizes do Projeto — App Checklist Segurança

## Idioma e Comunicação
- **Idioma Obrigatório**: Toda a comunicação com o usuário, explicações, planos de implementação, walkthroughs e comentários devem ser estritamente em **Português do Brasil (pt-BR)**.
- **Perfil do Usuário**: O usuário é Engenheiro de Segurança do Trabalho e gestor do projeto, com perfil leigo em programação técnica avançada. Explicações devem ser claras, práticas, didáticas e orientadas ao negócio, evitando jargões desnecessários.

## Integrações e Serviços
- **GitHub**: Repositório vinculado a `https://github.com/joaoeverton86/app-checklist-seguranca.git` (autenticado via `gh`).
- **Vercel**: Projeto vinculado a `app-checklist-v2` com domínio oficial de produção `https://app-checklist-seguranca.vercel.app`. Deploys ocorrem automaticamente no push da branch `main` ou via Vercel CLI (`npx vercel`).
  - **Autenticação Vercel CLI & MCP**: A Vercel CLI local está autenticada com a conta corporativa (`joaoevertondesouzalimeira-4624`), armazenando as credenciais em `auth.json`. No `mcp_config.json`, o MCP Vercel remoto (`https://mcp.vercel.com`) recebe o token de autorização via header `Authorization: Bearer <TOKEN>` para evitar travamentos ou erro `Unauthorized` no Antigravity IDE. Para qualquer automação de deploy ou build, utilizar a Vercel CLI local (`npx vercel`) já vinculada e operacional.
- **Supabase**: Banco de dados central em `https://qqtcwxvbjmybyzubocgd.supabase.co`.

## Separação de Rotas e Domínios de Acesso
O projeto é dividido em duas frentes com finalidades e rotas distintas:
1. **App Mobile / PWA de Campo (Offline-First)**: Localizado na raiz (`/`, `index.html`, `app.js`, `sw.js`). Destinado à operação offline pelos técnicos e operadores em campo. **NÃO alterar** arquivos da raiz em demandas exclusivas do painel.
2. **Painel Gerencial de Gestão SST (Dashboard Web)**: Localizado estritamente no subdiretório `/dashboard/` (`dashboard/index.html`, `dashboard/dashboard.js`, `dashboard/placar_lideres.js`, `dashboard/dashboard.css`).
   - **URL Oficial de Produção do Dashboard**: `https://app-checklist-seguranca.vercel.app/dashboard/`
   - **Diretriz de Feedback e Validação**: Todo resumo de entrega, links de teste, prévias e validações visuais de módulos gerenciais (Placar de Líderes, Treinamentos, APR, etc.) devem apontar obrigatoriamente para a rota com sufixo `/dashboard/`.

## Contexto de Negócio e Sistemas Externos
- **SGG**: A empresa do usuário utiliza o software SGG como sistema de SST corporativo. Sempre que documentos, relatórios ou demandas forem extraídos do SGG, o objetivo é replicar suas funcionalidades de forma substancialmente melhorada, mais intuitiva e completa no nosso projeto.
- **Clínica Engmed**: É apenas a clínica prestadora cadastrada no SGG pela contratante e deve ser totalmente desconsiderada em qualquer menção ou escopo do projeto (a responsabilidade técnica e autoria no projeto é da Engenharia de Segurança interna).

## Regras de Ouro Técnicas e Boas Práticas

### 1. Autonomia Responsável e Resolução de Causa-Raiz (Zero Preguiça)
- O assistente possui total autonomia técnica para editar código, criar rotinas, otimizar consultas e ajustar o banco de dados.
- **PROIBIÇÃO EXPRESSA**: É TERMINANTEMENTE PROIBIDO resolver erros ou alertas apagando funcionalidades, removendo servidores MCP da configuração, comentando trechos de código úteis ou simplificando regras de negócio por conveniência para "esconder" mensagens de erro.
- Todo problema técnico deve ser investigado até sua **causa-raiz real**. Caso uma integração ou dependência exija intervenção externa (ex: autorização OAuth via navegador), isso deve ser diagnosticado com precisão e apresentado ao usuário com as opções corretas, mantendo o sistema íntegro.

### 2. Padrão de Impressão e Relatórios (Imunidade a Bloqueador de Popups na Vercel)
- **NUNCA usar `window.open('', '_blank')` ou manipulações síncronas de popup direto** para imprimir fichas, relatórios ou convocações.
- Navegadores modernos (Chrome, Safari, Edge) bloqueiam `window.open` em conexões HTTPS de produção (Vercel) e no mobile.
- **Obrigatório**: Utilizar sempre a função padronizada do projeto:
  `abrirDocumentoHtmlParaImpressao(html, titulo)`
  ou criar um `Blob` (`new Blob([html], { type: 'text/html;charset=utf-8' })`), gerar a URL via `URL.createObjectURL(blob)` e disparar o carregamento seguro com script embutido `window.onload = function() { setTimeout(function() { window.print(); }, 400); };`.

### 3. Flexibilidade e Parametrização por Padrão (Sem Travar Dados no Código)
- Nenhum dado operacional ou de SST deve ser gravado de forma estática/rígida ("hardcoded"):
  - **GHEs e Grupos de Risco**: Sempre permitir configuração/seleção dinâmica pelo usuário (ex: modais de marcação com checklist de GHEs ativos).
  - **Datas de Eventos / Mutirões / Vencimentos**: Devem sempre possuir botão/recurso de reprogramação na interface com persistência.
  - **Prazos e Normas**: Carregar valores padrão inteligentes do PCMSO/PGR/NR, mas permitir ajuste operacional.

### 4. Cache-Buster Obrigatório e Integridade de Código
- `dashboard/dashboard.js` e `dashboard/index.html` são arquivos extensos e centrais. Qualquer alteração deve ser cirúrgica, focada no elemento específico, sem substituir funções intactas nem quebrar a compatibilidade de outras subabas ou páginas.
- Manter cache-buster atualizado (`dashboard.js?v=...` e `dashboard.css?v=...`) sempre que houver modificações que exijam atualização imediata nos navegadores dos usuários em campo e na gestão.

### 5. Sincronização Dupla de Efetivo
- O sistema mantém duas tabelas operacionais sincronizadas para o quadro de funcionários:
  1. `public.colaboradores_efetivo` (gestão de efetivo, admissões, ASOs, treinamentos)
  2. `public.colaboradores_checklist` (base de seleção e validação do PWA de campo)
- **Regra de Ouro**: Qualquer alteração de status (`Ativo`, `Inativo`, `Demitido`, `Afastado`) ou validade de ASO de colaborador deve refletir **simultaneamente** em ambas as tabelas para evitar divergência cadastral entre a gestão e o campo.

