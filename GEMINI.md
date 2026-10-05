# Diretrizes do Projeto — App Checklist Segurança

## Idioma e Comunicação
- **Idioma Obrigatório**: Toda a comunicação com o usuário, explicações, planos de implementação, walkthroughs e comentários devem ser estritamente em **Português do Brasil (pt-BR)**.
- **Perfil do Usuário**: O usuário é Engenheiro de Segurança do Trabalho e gestor do projeto, com perfil leigo em programação técnica avançada. Explicações devem ser claras, práticas, didáticas e orientadas ao negócio, evitando jargões desnecessários.

## Integrações e Serviços
- **GitHub**: Repositório vinculado a `https://github.com/joaoeverton86/app-checklist-seguranca.git` (autenticado via `gh`).
- **Vercel**: Projeto vinculado a `app-checklist-v2` com domínio oficial de produção `https://app-checklist-seguranca.vercel.app`. Deploys ocorrem automaticamente no push da branch `main` ou via Vercel CLI.
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

### 1. Padrão de Impressão e Relatórios (Imunidade a Bloqueador de Popups na Vercel)
- **NUNCA usar `window.open('', '_blank')` ou manipulações síncronas de popup direto** para imprimir fichas, relatórios ou convocações.
- Navegadores modernos (Chrome, Safari, Edge) bloqueiam `window.open` em conexões HTTPS de produção (Vercel) e no mobile.
- **Obrigatório**: Utilizar sempre a função padronizada do projeto:
  `abrirDocumentoHtmlParaImpressao(html, titulo)`
  ou criar um `Blob` (`new Blob([html], { type: 'text/html;charset=utf-8' })`), gerar a URL via `URL.createObjectURL(blob)` e disparar o carregamento seguro com script embutido `window.onload = function() { setTimeout(function() { window.print(); }, 400); };`.

### 2. Flexibilidade e Parametrização por Padrão (Sem Travar Dados no Código)
- Nenhum dado operacional ou de SST deve ser gravado de forma estática/rígida ("hardcoded"):
  - **GHEs e Grupos de Risco**: Sempre permitir configuração/seleção dinâmica pelo usuário (ex: modais de marcação com checklist de GHEs ativos).
  - **Datas de Eventos / Mutirões / Vencimentos**: Devem sempre possuir botão/recurso de reprogramação na interface com persistência.
  - **Prazos e Normas**: Carregar valores padrão inteligentes do PCMSO/PGR/NR, mas permitir ajuste operacional.

### 3. Integridade do Código e Arquivos Extensos
- `dashboard/dashboard.js` e `dashboard/index.html` são arquivos extensos e centrais. Qualquer alteração deve ser cirúrgica, focada no elemento específico, sem substituir funções intactas nem quebrar a compatibilidade de outras subabas ou páginas.
- Manter cache-buster atualizado (`dashboard.js?v=...`) sempre que houver modificações que exijam atualização imediata nos navegadores dos usuários em campo e na gestão.
