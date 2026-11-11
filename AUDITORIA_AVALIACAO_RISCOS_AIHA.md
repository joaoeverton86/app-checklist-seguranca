# AUDITORIA — Avaliação de Riscos (AIHA/PGR)
**Data:** 2026-10-30  
**Arquivos auditados:** `dashboard/dashboard.js`, `dashboard/index.html`  
**Status:** Implementação inicial feita pelo Antigravity — **requer correções críticas antes de ir para produção**

---

## ✅ O QUE JÁ ESTÁ BOM (Pontos Positivos)

1. **Renomeação correta**: "Matriz de Risco (GHE)" → "Avaliação de Riscos (AIHA)" — terminologia alinhada ao PGR/NR-01
2. **Dual-tab structure**:
   - `geral` → Visão Geral & Matriz de Calor (KPIs, gráficos, lista riscos altos)
   - `setor` → Avaliação por Setor/GHE (nova tela detalhada)
3. **Chip-based navigation**: Riscos como chips clicáveis com badge de gravidade colorida (padrão SGG modernizado)
4. **Matriz AIHA instantânea**: Probabilidade × Severidade → Gravidade calculada em tempo real
5. **Campo código eSocial (Tabela 24)**: Preparado para integração futura com eSocial
6. **Inventário PGR oficial**: Gera HTML printável timbrado com assinaturas (Eng. Segurança + COP)
7. **Fim do redirect**: Clicar em risco alto na aba geral agora abre a aba `setor` no mesmo módulo (não vai mais para Efetivo > GHE)
8. **Header executivo**: Dados do GHE, efetivo ativo, cargos, datas de elaboração/validade
9. **Alerta NR-01 GRO**: Link direto para painel Psicossocial

---

## 🔴 CORREÇÕES CRÍTICAS (Bloqueiam produção)

### 1. PERFORMANCE/FLICKERING — `selecionarChipRiscoGhe()` reconstrói tudo
**Localização:** `dashboard.js` ~linha 17390
```javascript
// ATUAL (PROBLEMA):
function selecionarChipRiscoGhe(idx) {
    matrizRiscoSelecionadoIdx = idx;
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;
    const riscos = Array.isArray(g.riscos) ? g.riscos : [];
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container) {
        container.innerHTML = renderRiscoAtivoDetalhesHtml(g, riscos[idx], idx);
    }
    // Re-renderiza para atualizar classes dos chips  ← REMOVER ESTA LINHA
    renderMatrizViewSetor();  // ← ISSO CAUSA FLICKER E PERDE FOCO DOS INPUTS
}
```

**CORREÇÃO:** Atualizar **apenas** o container de detalhes + classes CSS dos chips:
```javascript
function selecionarChipRiscoGhe(idx) {
    matrizRiscoSelecionadoIdx = idx;
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;
    const riscos = Array.isArray(g.riscos) ? g.riscos : [];
    const container = document.getElementById('matrizRiscoDetalhesContainer');
    if (container) container.innerHTML = renderRiscoAtivoDetalhesHtml(g, riscos[idx], idx);
    
    // Atualiza SÓ a aparência dos chips (sem re-renderizar)
    document.querySelectorAll('#matrizSetorConteudo button[onclick^="selecionarChipRiscoGhe"]').forEach((btn, i) => {
        const ativo = i === idx;
        btn.style.border = ativo ? '1px solid var(--primary)' : '1px solid var(--border)';
        btn.style.background = ativo ? 'var(--primary)' : 'var(--bg)';
        btn.style.color = ativo ? '#fff' : 'var(--text)';
        const badge = btn.querySelector('span[style*="border-radius:10px"]');
        if (badge) {
            const grav = NIVEIS_RISCO_COR[riscos[i]?.gravidade_label] || '#888888';
            badge.style.background = ativo ? 'rgba(255,255,255,0.25)' : grav + '22';
            badge.style.color = ativo ? '#fff' : grav;
        }
    });
}
```

---

### 2. ESTADO INCONSISTENTE AO ALTERNAR ABAS
**Problema:** Variáveis globais `matrizGheSelecionadoId` / `matrizRiscoSelecionadoIdx` não são resetadas ao voltar para aba `geral`. Se usuário:
- Seleciona GHE "001" na aba `setor`
- Clica em "Voltar à Matriz Geral"
- Depois volta para aba `setor` → mantém GHE "001" selecionado (ok)
- Mas se seleciona outro GHE no select da aba `geral` → estado fica inconsistente

**Correção:** Em `showMatrizSubtab('geral')`, resetar `matrizGheSelecionadoId = null; matrizRiscoSelecionadoIdx = 0;`

```javascript
function showMatrizSubtab(tab) {
    matrizSubtabAtiva = tab;
    const btnGeral = document.getElementById('matrizSubtabBtn-geral');
    const btnSetor = document.getElementById('matrizSubtabBtn-setor');
    const viewGeral = document.getElementById('matrizViewGeral');
    const viewSetor = document.getElementById('matrizViewSetor');

    if (btnGeral) btnGeral.classList.toggle('active', tab === 'geral');
    if (btnSetor) btnSetor.classList.toggle('active', tab === 'setor');

    if (tab === 'geral') {
        // RESETAR ESTADO AO VOLTAR PARA VISÃO GERAL
        matrizGheSelecionadoId = null;
        matrizRiscoSelecionadoIdx = 0;
        if (viewGeral) viewGeral.style.display = 'block';
        if (viewSetor) viewSetor.style.display = 'none';
        renderMatrizRiscoPanel();
    } else {
        if (viewGeral) viewGeral.style.display = 'none';
        if (viewSetor) viewSetor.style.display = 'block';
        if (!matrizGheSelecionadoId && allGheCatalogo.length > 0) {
            matrizGheSelecionadoId = allGheCatalogo[0].id;
        }
        const select = document.getElementById('matrizRiscoGheSelect');
        if (select && matrizGheSelecionadoId) select.value = matrizGheSelecionadoId;
        renderMatrizViewSetor();
    }
}
```

---

### 3. VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ANTES DE SALVAR
**Localização:** `salvarRiscoGheEmEdicao()` ~linha 17750

**Atual:** Salva sem validar nada.

**Correção:** Adicionar validação no início da função:
```javascript
async function salvarRiscoGheEmEdicao(idx) {
    const statusEl = document.getElementById('matrizRiscoSaveStatus');
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g) return;

    // VALIDAÇÃO OBRIGATÓRIA
    const r = g.riscos[idx];
    const erros = [];
    if (!r.agente?.trim()) erros.push('Nome do Agente/Fator de Risco');
    if (!r.tipo_agente?.trim()) erros.push('Tipo de Agente');
    if (!r.probabilidade) erros.push('Probabilidade (1-5)');
    if (!r.severidade) erros.push('Severidade (1-5)');
    
    if (erros.length > 0) {
        if (statusEl) { 
            statusEl.textContent = '❌ Preencha: ' + erros.join(', '); 
            statusEl.style.color = 'var(--danger)'; 
        }
        return;
    }
    // ... resto da função
}
```

---

### 4. BOTÃO "CANCELAR" EDIÇÃO
**Problema:** Usuário modifica campos, mas só tem "💾 Salvar". Sem como descartar alterações não salvas.

**Correção:** Em `renderRiscoAtivoDetalhesHtml()`, no header do painel de edição, adicionar botão cancelar que restaura valores originais:
```javascript
// No header do painel de edição (linha ~17570), adicionar:
<button class="db-clear-btn" onclick="cancelarEdicaoRiscoGhe(${idx})" style="font-size:12px; padding:6px 12px;">✕ Cancelar</button>

// Nova função:
function cancelarEdicaoRiscoGhe(idx) {
    const g = allGheCatalogo.find(x => String(x.id) === String(matrizGheSelecionadoId));
    if (!g || !Array.isArray(g.riscos) || !g.riscos[idx]) return;
    // Recarrega do banco (força refresh dos dados originais)
    loadMatrizEpiData(); // ou supabaseFetch('ghe_catalogo', '?id=eq.'+g.id).then(...)
    // Ou mais simples: re-renderiza a view setor (que lê de g.riscos que ainda tem valores originais se não salvou)
    renderMatrizViewSetor();
}
```
*Nota: Como `atualizarCampoRiscoEmEdicao` modifica `g.riscos[idx]` diretamente em memória, o "Cancelar" precisa recarregar do Supabase ou manter cópia original.*

**Melhor abordagem:** Manter `matrizEditForm` (cópia de trabalho) igual ao padrão da aba EPI > Matriz NR-6, e só aplicar no `g.riscos` no `salvarRiscoGheEmEdicao`.

---

### 5. BUG NO BOTÃO REMOVER DO CHIP
**Localização:** Chip template em `renderMatrizViewSetor()` ~linha 17330
```html
<!-- ATUAL (PROBLEMA): -->
<button onclick="selecionarChipRiscoGhe(${idx})" ...>
    <span>...</span>
    <span onclick="event.stopPropagation(); removerRiscoGhePeloChip(${idx})">✕</span>
</button>
```
**Problema:** `<span onclick>` dentro de `<button onclick>` — `stopPropagation()` pode falhar em alguns navegadores; clique no ✕ também dispara seleção do chip.

**Correção:** Usar `<div>` para o chip + botão remover separado (fora do click handler do chip):
```javascript
// No map dos chips, trocar por:
const chipId = `chipRisco-${idx}`;
return `
    <div id="${chipId}" class="matriz-risco-chip" onclick="selecionarChipRiscoGhe(${idx})" style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; border:1px solid ${ativo ? 'var(--primary)' : 'var(--border)'}; background:${ativo ? 'var(--primary)' : 'var(--bg)'}; color:${ativo ? '#fff' : 'var(--text)'}; transition:all 0.2s ease;">
        <span>${tipoIcone} ${escapeHTML(r.agente || 'Risco ' + (idx + 1))}</span>
        <span style="font-size:10px; padding:2px 6px; border-radius:10px; background:${ativo ? 'rgba(255,255,255,0.25)' : grav + '22'}; color:${ativo ? '#fff' : grav}; font-weight:700;">
            ${escapeHTML(r.gravidade_label || 'P×S ' + (r.gravidade || '—'))}
        </span>
    </div>
    <button type="button" onclick="removerRiscoGhePeloChip(${idx})" title="Remover Risco" style="margin-left:4px; padding:4px 8px; font-size:11px; border-radius:12px; border:1px solid var(--danger); background:transparent; color:var(--danger); cursor:pointer;">✕</button>
`;
// Envolver cada par chip+botão em <div style="display:flex; align-items:center;"> ou usar container flex
```
*Ou mais simples: manter `<button>` para o chip mas mover o ✕ para fora (irmão, não filho).*

---

## 🟡 MELHORIAS IMPORTANTES (Conforme Plano Original)

### 6. SUB-ABAS TÉCNICAS FALTANDO
O plano previa sub-abas dentro da avaliação por setor:
- **Avaliação** (Qualitativa AIHA + Quantitativa com limites NR-15/NR-09)
- **EPIs** (com CA, eficácia, validade)
- **EPCs**
- **Medidas de Controle** (Hierarquia: Eliminação → Substituição → Engenharia → Administrativo → EPI)
- **Conclusões de Laudos** (Laudos periciais, monitoramentos)
- **Danos à Saúde** (CID-10, nexo ocupacional)

**Implementação sugerida:** Adicionar linha de sub-tabs abaixo dos chips de riscos:
```html
<div style="display:flex; gap:4px; margin:12px 0; border-bottom:1px solid var(--border); padding-bottom:8px;">
    <button class="matriz-subtab-btn active" onclick="showMatrizRiscoSubtab('avaliacao')">📐 Avaliação</button>
    <button class="matriz-subtab-btn" onclick="showMatrizRiscoSubtab('epi')">🛡️ EPIs</button>
    <button class="matriz-subtab-btn" onclick="showMatrizRiscoSubtab('epc')">🏭 EPCs</button>
    <button class="matriz-subtab-btn" onclick="showMatrizRiscoSubtab('controle')">⚙️ Controles</button>
    <button class="matriz-subtab-btn" onclick="showMatrizRiscoSubtab('laudos')">📋 Laudos</button>
    <button class="matriz-subtab-btn" onclick="showMatrizRiscoSubtab('danos')">🏥 Danos à Saúde</button>
</div>
<div id="matrizRiscoSubtabContent"></div>
```

---

### 7. AVALIAÇÃO QUANTITATIVA (NR-15, NR-09, NR-17)
Falta aba/campos para:
- Valor medido + Unidade + Limite de Tolerância (TLV/NR-15)
- Tipo de medição (Pessoal / Ambiental / Biológica)
- Laboratório / Responsável técnico / Data
- Resultado: Abaixo / Acima do limite → define ação

---

### 8. CATÁLOGO ESOCIAL INTELIGENTE (Tabela 24)
Campo `esocial_codigo` é `input text` livre. Deveria:
- Ter `datalist` com códigos da Tabela 24 filtrados por `tipo_agente`
- Ex: se `tipo_agente === 'Físico'` → mostrar códigos 01.01.xxx (Ruído), 01.02.xxx (Vibração), etc.
- Autocomplete ao digitar

```javascript
// Exemplo de estrutura de sugestões por tipo:
const ESOCIAL_TABELA24_POR_TIPO = {
    'Físico': ['01.01.001 - Ruído contínuo', '01.01.002 - Ruído de impacto', '01.02.001 - Vibração de mão/braço', ...],
    'Químico': ['02.01.001 - Benzeno', '02.01.002 - Chumbo', ...],
    'Biológico': ['03.01.001 - Bactérias', ...],
    'Ergonômico': ['04.01.001 - Esforço físico intenso', ...],
    'Acidentes': ['05.01.001 - Queda de nível', ...]
};
```

---

### 9. INVENTÁRIO PDF — FALLBACK HARDCODED
**Localização:** `gerarHtmlInventarioRiscosGhe()` ~linha 17920
```javascript
// ATUAL:
<td>${escapeHTML(r.esocial_codigo || '09.01.001')}</td>

// CORREÇÃO:
<td>${escapeHTML(r.esocial_codigo || '—')}</td>
```
Não assumir código padrão — deixar vazio se não preenchido.

---

### 10. CONSISTÊNCIA COM ABA EPI > MATRIZ NR-6
A aba **EPI > Matriz NR-6** usa padrão `matrizEditForm` + `matrizEditId` (cópia de trabalho). A nova aba **Avaliação de Riscos** modifica `g.riscos[]` direto.

**Opções:**
- **Unificar:** Usar `matrizEditForm` também na nova tela (recomendado — permite Cancelar real)
- **Documentar:** Comentar no código que são padrões diferentes intencionalmente

---

### 11. LOADING STATE NO BOTÃO SALVAR
**Em `salvarRiscoGheEmEdicao()`:** Desabilitar botão + mostrar spinner durante `await supabaseUpsert`:
```javascript
const btnSalvar = document.querySelector('button[onclick^="salvarRiscoGheEmEdicao"]');
if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.innerHTML = '⏳ Salvando...'; }
try { ... } finally { if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.innerHTML = '💾 Salvar Alterações no GHE'; } }
```

---

### 12. TECLAS DE ATALHO (UX)
- `Enter` no input `riscoEdit_agente` → foca próximo campo (`riscoEdit_esocial`)
- `Escape` no painel de edição → chama `cancelarEdicaoRiscoGhe(idx)`
- `Ctrl+S` no painel → chama `salvarRiscoGheEmEdicao(idx)`

---

## 🟢 SUGESTÕES DE UX (Nice to have)

| Item | Descrição |
|------|-----------|
| Badge no chip com código eSocial | Se `r.esocial_codigo` preenchido, mostrar `🔵 Ruído 01.01.001` |
| Tooltip no chip | Hover mostra `fontes_geradoras` + `tipo_tempo_exposicao` |
| Ordenação chips | Por gravidade (Muito Alto → Trivial) ou data de cadastro |
| Confirmação "Salvo ✓" auto-hide | Já existe — OK |
| Contador de riscos por gravidade | No header da seção: `🟢 3 · 🟡 5 · 🟠 2 · 🔴 1` |
| Duplicar risco | Botão "📋 Duplicar" ao lado de "➕ Novo Risco" |

---

## 📋 CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÕES

Antes de considerar pronto para deploy:

- [ ] Fix 1: `selecionarChipRiscoGhe` não chama mais `renderMatrizViewSetor()`
- [ ] Fix 2: `showMatrizSubtab('geral')` reseta `matrizGheSelecionadoId` e `matrizRiscoSelecionadoIdx`
- [ ] Fix 3: `salvarRiscoGheEmEdicao` valida campos obrigatórios
- [ ] Fix 4: Botão "✕ Cancelar" funciona e restaura valores originais
- [ ] Fix 5: Botão remover (✕) fora do chip, sem conflito de click
- [ ] Teste: Alternar abas geral ↔ setor múltiplas vezes sem erro
- [ ] Teste: Editar risco, cancelar, verificar se valores originais voltaram
- [ ] Teste: Editar risco, salvar, verificar no Supabase e no painel geral
- [ ] Teste: Imprimir Inventário PGR — visualizar PDF gerado
- [ ] Teste: Recalcular AIHA (botão 🔄) — atualiza badges corretamente
- [ ] Lint: `node --check dashboard/dashboard.js` passa sem erros

---

## 📝 NOTAS TÉCNICAS

- **Arquivo principal:** `dashboard/dashboard.js` (linhas ~16987–18000 + HTML em `index.html` ~linha 4741)
- **Funções novas:** `showMatrizSubtab`, `renderMatrizViewSetor`, `selecionarChipRiscoGhe`, `renderRiscoAtivoDetalhesHtml`, `salvarRiscoGheEmEdicao`, `gerarHtmlInventarioRiscosGhe`, `imprimirInventarioRiscosGheAtual`
- **Variáveis globais novas:** `matrizSubtabAtiva`, `matrizGheSelecionadoId`, `matrizRiscoSelecionadoIdx`
- **CSS version bump:** `dashboard.css?v=233`, `dashboard.js?v=233`, `data.js?v=232` (manter)

---

**Próximo passo:** Aplicar correções 🔴 (1–5) → testar → depois implementar 🟡 (6–12) conforme prioridade do João.