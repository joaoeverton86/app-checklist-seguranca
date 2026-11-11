# Auditoria Técnica e Feedback de Implementação — PCMSO

**Para**: Agente Codex  
**De**: Engenharia / Auditoria SST (Antigravity)  
**Data**: 10/11/2026  
**Contexto**: Módulo de Recomendações e Exames (PCMSO) — `dashboard/dashboard.js` e `dashboard/index.html`

---

## 1. Avaliação Geral
As bases da consulta mensal (`calcularConsultaMensalPcmso`) e a remoção das referências fixas universais atenderam à diretriz conceitual. No entanto, foram detectadas **regressões funcionais e bugs críticos de integridade de dados** que impedem o envio para produção.

---

## 2. Pontos Críticos para Correção Imediata

### 🔴 1. Bug Crítico: Duplicação de Procedimentos no Banco de Dados
- **Localização**: `dashboard/dashboard.js` nas funções:
  - `salvarRegistroPsicoRapido` (linhas ~30890 e ~30936)
  - `salvarBaixaLoteMutirao` (linha ~31163)
  - `confirmarSinalizarPsicoEmDia` (linha ~32036)
- **Problema**: O código atual alterou a verificação `if (idx >= 0)` para fazer `examesDetalhe.push(itemExame);` em ambos os ramos (`if` e `else`). Isso faz com que cada regularização duplique o procedimento dentro de `exames_detalhe`, inflando históricos e mantendo registros desatualizados.
- **Correção necessária**:
  ```javascript
  if (idx >= 0) {
      examesDetalhe[idx] = { ...examesDetalhe[idx], ...itemExame };
  } else {
      examesDetalhe.push(itemExame);
  }
  ```

---

### 🔴 2. Experiência do Usuário: Remover `window.prompt()` Nativo
- **Localização**: `dashboard/dashboard.js` em `abrirModalPsicossocial`.
- **Problema**: O uso de `prompt('Qual exame deseja registrar?...')` bloqueia a interface, falha em ambientes mobile/tablets PWA e destoa dos padrões do sistema.
- **Correção necessária**: Integrar a seleção das pendências dentro do próprio modal visual já existente (ex: um `<select>` ou botões de rádio estilizados), permitindo ao usuário escolher o exame pendente diretamente na tela do modal antes de salvar.

---

### 🟠 3. Regressão: Restauração dos Botões de Ação do Mutirão
- **Localização**: `dashboard/dashboard.js` em `renderBannerMutiraoPsico`.
- **Problema**: A simplificação do banner removeu os botões essenciais:
  - `📅 Agendar / Alterar Data e Vagas` (`abrirModalReprogramarDataMutirao()`)
  - `✅ Baixa em Lote` (`abrirModalBaixaLoteMutirao()`)
- **Correção necessária**: Manter a estrutura compacta e expansível, mas preservando os botões de ação para que o gestor operacional consiga acionar o agendamento e a baixa em lote diretamente no cabeçalho do módulo.

---

### 🟠 4. Usabilidade: Seleção de Pendentes por Vagas
- **Localização**: `dashboard/dashboard.js` em `selecionarPrimeirosPendentesPsico()`.
- **Problema**: Dispara `alert("Configure a capacidade...")` e trava a operação se não houver capacidade gravada no `localStorage` da máquina local.
- **Correção necessária**: Utilizar fallback inteligente (ex: 20 vagas sugeridas padrão) caso o usuário ainda não tenha configurado um valor customizado, ou oferecer a abertura direta do modal de configuração em vez de apenas travar com erro.

---

### 🟡 5. Tratamento de Dados Legados (ASO Geral sem `exames_detalhe`)
- **Localização**: `dashboard/dashboard.js` em `obterDadosRecomendacaoPsicossocial`.
- **Problema**: A remoção abrupta do fallback fez com que ASOs gerais válidos antigos (migrados sem desmembramento de exames) gerem falsas pendências em massa.
- **Correção necessária**: Prever regra de transição ou manter compatibilidade para registros antigos que não possuem o array de detalhes.

---

### 🟡 6. Diretriz de Publicação e Cache-Buster
- Atualizar a versão de cache-buster nos arquivos (`?v=...`) e executar as validações de integridade antes da entrega final.
