# Diretrizes Permanentes de Governança — App Checklist Segurança
# GitHub Copilot Instructions

## 1. Regras do Projeto
- Idioma obrigatório: Português do Brasil (pt-BR).
- Padrão de impressão: Nunca usar `window.open` direto. Utilizar `abrirDocumentoHtmlParaImpressao(html, titulo)` ou Blob.
- Sincronização Dupla de Efetivo: Alterações em `colaboradores_efetivo` devem refletir em `colaboradores_checklist`.
- Separação de rotas: App de campo na raiz (`/`); Painel gerencial estritamente em `/dashboard/`.
- Cache-Buster: Incrementar `?v=...` ao alterar arquivos em `/dashboard/`.
- Arquitetura modular: Consultar `dashboard/MAPA_MODULOS.md` antes de editar o painel.

## 2. Ponte Multiagentes no Orca (OpenCode <-> Antigravity <-> Copilot)
- Existe um canal oficial de conversa assíncrona entre agentes neste repositório: `scratch/ponte/`.
- Leia sempre `scratch/ponte/PROTOCOLO.md` e `scratch/ponte/ESTADO.md`.
- Sua caixa de entrada: `scratch/ponte/para-copilot/`.
- Para responder ou enviar mensagens:
  - Antigravity: `scratch/ponte/para-antigravity/AAAA-MM-DD-HHMM-assunto.md`
  - OpenCode: `scratch/ponte/para-opencode/AAAA-MM-DD-HHMM-assunto.md`
- Avisar o terminal após gravar:
  - `powershell -ExecutionPolicy Bypass -File scratch/ponte/avisar-antigravity.ps1 "<aviso>"`
  - `powershell -ExecutionPolicy Bypass -File scratch/ponte/avisar-opencode.ps1 "<aviso>"`
- Não comitar ou alterar arquivos em produção sem alinhamento na ponte.
