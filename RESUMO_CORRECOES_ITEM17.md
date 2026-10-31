# RESUMO DE CORREÇÕES — Item 17 (Avaliação Psicossocial COPSOQ II / NR-01)

**Data:** 2026-10-31  
**Status:** Implementado e validado sintaticamente

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 17.1 — Avaliação Psicossocial (COPSOQ II)

| Issue | Correção Implementada | Arquivo/Linha |
|-------|----------------------|---------------|
| **ID probabilístico** | `gerarIdPsicossocial()` usa `crypto.randomUUID()` (collision-resistant) | `documentos_brigada.js:590` |
| **Handler guard (duplo clique)** | `form.dataset.salvandoSessionId` + `writeGen` para superseding out-of-order | `documentos_brigada.js:725, 895` |
| **Post-save reload failure ≠ success** | Retorna `false` se `loadPsicossocialData()` falha; botão "Atualizar Visualização" | `documentos_brigada.js:933` |
| **Question text fallback** | `form.dataset.perguntasSnapshot` capturado na abertura + snapshot fiel | `documentos_brigada.js:699, 840` |
| **Chart null handling** | `data: null` em datasets + tooltip "Não informado" + labels "(Sem dados)" | `documentos_brigada.js:509, 537, 495` |
| **Labels follow thresholds** | KPI labels dinâmicos: `≥${limiarCritico}%`, `20–${limiarCritico}%`, `≥${limiarForte}%` | `documentos_brigada.js:445-447` |
| **Load failure recoverable** | `psicossocialLoaded` só setado em sucesso; `epi_estoque.js` não seta antes | `documentos_brigada.js:320`, `epi_estoque.js:4383`, `dashboard.js:21651` |
| **Draft discard protection** | Snapshot JSON do formulário comparado antes de reabrir; `confirm()` se dirty | `documentos_brigada.js:643, 707, 747` |

### 17.2 — Fatores Psicossociais/Ergonômicos por GHE (NR-01 GRO)

| Issue | Correção Implementada | Arquivo/Linha |
|-------|----------------------|---------------|
| **Upsert envia cache inteiro** | `supabasePatch` seletivo: só `id`, `conclusoes`, `updated_at` (sem `riscos`, `cargos`, `nome`) | `documentos_brigada.js:1348` |
| **Compare-And-Swap (CAS)** | Fetch remoto antes do save + filtro `updated_at=eq...` + validação `updated_at` + `conclusoes` | `documentos_brigada.js:1340, 1370` |
| **Concorrência GHE** | Guarda por `psicoGheSalvandoGheId` + `psicoGheSalvandoSessionId` | `documentos_brigada.js:1213` |
| **Versão base verificada** | Captura `updated_at`, `conclusoes`, `riscos` na abertura do draft; bloqueia se divergiu | `documentos_brigada.js:1058, 1235` |
| **Form replacement discards draft** | Proteção de dirty state no `abrirFormAplicacaoPsicossocial` + snapshot JSON | `documentos_brigada.js:643` |

---

## 📁 ARQUIVOS MODIFICADOS

| Arquivo | Mudanças Principais |
|---------|---------------------|
| `dashboard/modules/documentos_brigada.js` | **Core** — todas as correções 17.1 + 17.2 |
| `dashboard/modules/epi_estoque.js` | `psicossocialLoaded` não setado antes do load |
| `dashboard/dashboard.js` | 2x `psicossocialLoaded` não setado antes do load |
| `dashboard/modules/relatorio_sms_nc.js` | 2x `psicossocialLoaded` não setado antes do load |
| `dashboard/index.html` | Cache buster v257+ |

---

## 🧪 VALIDAÇÃO EXECUTADA

```bash
node --check dashboard/dashboard.js                    ✅
node --check dashboard/modules/documentos_brigada.js  ✅
node --check dashboard/modules/epi_estoque.js          ✅
node --check dashboard/modules/relatorio_sms_nc.js     ✅
```

---

## 🎯 PRÓXIMOS PASSOS (Para homologação)

1. **Deploy em staging** (push → Vercel)
2. **Teste autenticado** em produção:
   - Criar 2 aplicações mesmo mês → IDs distintos
   - Editar aplicação → mantém ID
   - Campo vazio não vira zero
   - Percentuais inválidos / taxa 150 / datas invertidas → bloqueados
   - Soma escalas = 100% ±1%
   - Falha em etapa → sem mensagem de sucesso
   - Load fail → retry button funciona
   - Cancelar/trocar aplicação → não contamina draft
   - Rótulos seguem limiares configurados
   - Resultado global NÃO filtrado como GHE
   - 17.2: Concorrência GHE bloqueia / CAS funciona / form dirty avisa
3. **Aprovação João** (validação operacional)

---

## ⚠️ LIMITAÇÕES CONHECIDAS (Não resolvidas neste recorte)

- **Atomicidade real**: aplicação/escalas/perguntas ainda em chamadas separadas (sem transação backend)
- **Concorrência multi-aba/usuário**: guarda local não substitui controle de versão no backend
- **Grupos pequenos COPSOQ**: tratamento de anonimato em recortes detalhados não implementado

---

**Responsável:** codex (implementação) | **Revisão:** antigravity/copilot | **Aprovação:** João (teste autenticado)