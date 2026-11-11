# PLANO — Modernização Avaliação Psicossocial (COPSOQ II / NR-01)

**Data:** 2026-10-31  
**Origem:** Demanda prioritária do João (scratch/ponte/para-todos/2026-10-31-1215-demanda-joao-avaliacao-psicossocial-nr01.md)  
**Autonomia:** Total para todos os agentes (copilot, opencode, codex, antigravity)

---

## 🎯 OBJETIVO PRINCIPAL

Transformar a página atual (engessada, só leitura + edição oculta) em um módulo **moderno, editável inline, integrado ao GHE/NR-01 GRO**, com:
- Edição direta na tela (sem formulário oculto)
- Vinculação por GHE/Setor/Cargo
- Gestão integrada de controles, planos de ação e monitoramento periódico
- Impressão de relatório oficial NR-01

---

## 🔍 DIAGNÓSTICO ATUAL (problemas confirmados)

| Problema | Localização | Impacto |
|----------|-------------|---------|
| **Página engessada** - só KPIs, gráficos, listas | `documentos_brigada.js` linhas 347-391 | SST não consegue editar/parametrizar |
| **Edição oculta e rígida** - 26 escalas + 41 perguntas em inputs soltos | `documentos_brigada.js` linhas 486-614 | Difícil descobrir, preencher, manter |
| **Desconexão GHE/Setor** - banner convida mas módulo é global | `ghe_os.js` linha 376 | Frustração: clica e não edita aquele grupo |
| **Sem NR-01 GRO integrado** - sem controles, planos, monitoramento | - | Não atende exigência legal de gestão contínua |

---

## 🏗️ ARQUITETURA PROPOSTA

### 1. Novo Módulo Dedicado
```
dashboard/modules/psicossocial.js
```
- Isola toda a lógica psicossocial (atualmente em `documentos_brigada.js`)
- Segue padrão dos outros módulos (`ghe_os.js`, `epi_estoque.js`, etc.)

### 2. Estrutura de Dados Nova (estende existente, não quebra)
```sql
-- Nova tabela: vincula aplicação psicossocial a GHE/Setor
CREATE TABLE avaliacoes_psicossociais_ghe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aplicacao_id TEXT REFERENCES avaliacoes_psicossociais(id) ON DELETE CASCADE,
    ghe_id TEXT NOT NULL,           -- ex: '12'
    setor TEXT,                     -- ex: 'Manutenção Elétrica'
    cargo TEXT,                     -- ex: 'Eletricista'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(aplicacao_id, ghe_id)
);

-- Nova tabela: fatores de risco psicossocial/ergonômico por GHE (para NR-01 GRO)
CREATE TABLE ghe_fatores_psicossociais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghe_id TEXT NOT NULL,
    setor TEXT,
    cargo TEXT,
    fator TEXT NOT NULL,            -- ex: 'Exigências quantitativas', 'Ritmo de trabalho'
    tipo TEXT CHECK (tipo IN ('psicossocial', 'ergonomico')),
    escala_copsog TEXT,             -- qual escala COPSOQ mapeia
    pct_risco NUMERIC,              -- % risco desta escala para este GHE
    controle_existente TEXT,        -- medida de controle atual
    plano_acao_id UUID REFERENCES plano_acao_5w2h(id), -- link plano ação
    responsavel TEXT,
    prazo DATE,
    status TEXT CHECK (status IN ('pendente','em_andamento','concluido','monitorando')) DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nova tabela: histórico de monitoramento periódico
CREATE TABLE ghe_monitoramento_psicossocial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghe_id TEXT NOT NULL,
    fator_id UUID REFERENCES ghe_fatores_psicossociais(id) ON DELETE CASCADE,
    data_monitoramento DATE NOT NULL,
    pct_risco_atual NUMERIC,
    observacao TEXT,
    responsavel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Interface com 3 Abas (sub-tabs)
```
📊 Visão Geral & Dashboard      → KPIs, gráficos, escalas críticas/favoráveis (melhorado: editável inline)
⚙️ Gerenciar Aplicações         → CRUD aplicações + escalas + perguntas (simplificado, com templates)
🔗 Gestão por GHE / NR-01       → NOVO: Vincula aplicação a GHE, gerencia fatores, controles, planos, monitoramento
```

---

## 📋 INCREMENTO 1 — Escopo Imediato (Esta Semana)

### 1.1 Modularização
- [ ] Criar `dashboard/modules/psicossocial.js` com toda lógica de `documentos_brigada.js` (linhas 268-660)
- [ ] Remover duplicatas de `documentos_brigada.js` (manter só imports)
- [ ] Atualizar `dashboard/index.html` para carregar novo módulo

### 1.2 Modernização UI - Aba "Visão Geral"
- [ ] **Edição inline das escalas**: clicar no card → vira input com % (favorável/intermediário/risco) → salvar no banco
- [ ] **Filtro por GHE/Setor** no topo (select com GHEs do catálogo)
- [ ] **Botão "Editar Análise"** no resumo (textarea inline)
- [ ] **Tooltip nas escalas** com definição COPSOQ
- [ ] **Botão "Imprimir Relatório NR-01"** (gera HTML oficial)

### 1.3 Simplificação - Aba "Gerenciar Aplicações"
- [ ] **Template visual**: cards de escalas com inputs alinhados (já quase lá)
- [ ] **Duplicar aplicação**: botão "Copiar última rodada" pré-preenche escalas/perguntas
- [ ] **Importar CSV/Excel** de resultados (para quem tem planilha do COPSOQ)
- [ ] **Validação**: soma das 3 colunas = 100% por escala

### 1.4 NOVA Aba "Gestão por GHE / NR-01"
- [ ] Select GHE → lista fatores de risco psicossocial/ergonômico daquele grupo
- [ ] Cada fator: escala COPSOQ mapeada, % risco, controle, plano ação, responsável, prazo, status
- [ ] Botão "➕ Adicionar Fator" → seleciona escala COPSOQ ou fator ergonômico
- [ ] Integração com `plano_acao_5w2h` (já existe no sistema)
- [ ] Botão "📅 Agendar Monitoramento" → abre calendário, registra nova medição

---

## 📦 INCREMENTO 2 — Gestão Integrada NR-01 (Próxima)

- [ ] **Matriz de Riscos Psicossociais** integrada à aba "Avaliação de Riscos (AIHA)"
- [ ] **Relatório Oficial NR-01** timbrado (impressão)
- [ ] **Dashboard executivo** por setor/GHE (heatmap de escalas críticas)
- [ ] **Alertas automáticos**: escala > 40% risco → notifica SST + liderança
- [ ] **Integração PCMSO**: exames complementares vinculados a fatores de risco

---

## 🔧 REGRAS TÉCNICAS (Inegociáveis)

| Regra | Detalhe |
|-------|---------|
| **Módulo próprio** | Toda lógica em `dashboard/modules/psicossocial.js` |
| **Zero diff em dashboard.js** | Não tocar no monólito |
| **Dados históricos** | Preservar `avaliacoes_psicossociais*` intactas |
| **Impressão** | Usar `abrirDocumentoHtmlParaImpressao` |
| **RLS** | Não alterar políticas sem mapear papéis campo/painel |
| **Lint** | `node --check` + `npm run lint` passam |

---

## 📁 ARQUIVOS A CRIAR/ALTERAR

| Arquivo | Ação |
|---------|------|
| `dashboard/modules/psicossocial.js` | **CRIAR** - módulo completo |
| `dashboard/index.html` | Adicionar `<script src="modules/psicossocial.js">` |
| `dashboard/modules/documentos_brigada.js` | Remover linhas 268-660 (psicossocial) |
| `supabase_schema.sql` | Adicionar 3 novas tabelas (ver seção 2) |
| `dashboard/MAPA_MODULOS.md` | Atualizar com novo módulo |

---

## ✅ CRITÉRIOS DE ACEITAÇÃO (Incremento 1)

1. **Aba Visão Geral**: SST clica em escala → edita % inline → salva no banco sem sair da tela
2. **Filtro GHE**: Seleciona GHE → dashboard mostra só escalas daquele grupo (se vinculado)
3. **Nova Aba GHE/NR-01**: Acessível, permite adicionar fatores, vincular plano ação, agendar monitoramento
4. **Botão Imprimir**: Gera relatório NR-01 timbrado com escalas, análise, controles, plano ação
5. **Dados preservados**: Aplicação 2026-06 continua lá com 26 escalas + 41 perguntas intactas
6. **Performance**: `node --check` passa, `npm run lint` não piora

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Criar `psicossocial.js`** copiando e refatorando de `documentos_brigada.js`
2. **Criar migrações SQL** para 3 novas tabelas
3. **Implementar Aba "Visão Geral" moderna** (edição inline + filtro GHE)
4. **Implementar Aba "Gestão GHE/NR-01"** (nova)
5. **Testar em produção** (https://app-checklist-seguranca.vercel.app/dashboard/)

---

**Responsável desta sessão:** codex (implementação)  
**Revisão:** antigravity / copilot  
**Validação operacional:** João (teste autenticado em produção)