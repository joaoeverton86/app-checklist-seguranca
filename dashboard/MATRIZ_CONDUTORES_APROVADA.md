# Matriz interna SST — Condutores CNH

Aprovada expressamente por João na sessão de 09/11/2026. Versão: MATRIZ-SST-JOAO-20261109-v1.

| Atividade | Categorias aceitas | Treinamentos internos cadastrados |
| --- | --- | --- |
| Veículo leve / caminhonete / pick-up | B, C, D, E e combinações AB, AC, AD, AE | Direção Defensiva |
| Van / micro-ônibus / ônibus | D, E, AD, AE | Direção Defensiva; Transporte Coletivo |
| Basculante / pipa / carroceria | C, D, E, AC, AD, AE | Direção Defensiva; Operação Segura de Basculamento e Carga |
| Caminhão comboio | C, D, E, AC, AD, AE | Direção Defensiva; MOPP; NR-20 Operacional |
| Caminhão guindauto | C, D, E, AC, AD, AE | Operação Segura de Guindauto; Direção Defensiva |
| Linha amarela / terraplenagem | C, D, E, AC, AD, AE | Operação Segura de Máquinas Pesadas; Direção Defensiva |
| Empilhadeira / manipulador telescópico | B, C, D, E, AB, AC, AD, AE | Operação Segura de Empilhadeira |

Direção Defensiva e NR-11/NR-12: reciclagem interna de 24 meses. Outros prazos permanecem INDEFINIDO, para avaliação específica; não foi inventada periodicidade automática. É regra interna aprovada para este projeto, não uma declaração de exigência legal universal para todos os equipamentos/contextos.

## Uso e proteção

No cadastro/edição, selecionar o modelo em “Modelo da matriz SST” e clicar em “Aplicar modelo”. A operação adiciona uma avaliação, sem substituir avaliações existentes ou seus históricos. A atividade pode continuar pendente por falta de evidência individual, mesmo com requisitos aprovados.

O cliente envia regra_aprovada=false; o servidor compara a assinatura completa dos requisitos com a matriz canônica e atribui versão/autoria somente em caso de correspondência. Requer vínculo único auth_user_id de João, matrícula 76; não é criado UUID fictício de aprovador. Antes da aplicação remota deve-se confirmar esse vínculo.

Alterar requisitos para fora do catálogo arquiva a regra anterior e deixa a nova regra pendente. Alterar evidências sem mudar requisitos preserva aprovação. Não são criadas datas de treinamento, comprovantes ou conferências automaticamente. Para cursos com reciclagem de 24 meses, a data de validade não pode ultrapassar realização + 24 meses.

## Banco e publicação

Aplicar em ordem a migração base 20261109_modulo_gestao_condutores_cnh.sql e depois 20261110021911_matriz_sst_condutores_aprovada.sql. Migração adicional altera somente helpers deste módulo, sem atualizar registros antigos, modificar políticas RLS ou criar regras em outros módulos.

Implementação local v301.2; sem aplicação remota/publicação nesta etapa. A aprovação da matriz não autoriza inferir que os vínculos do banco operacional já estejam válidos.

## Validação

- Suite existente: 16 blocos aprovados.
- PGlite: 15 cenários (13 originais + M1/M2), cobrindo os sete modelos, requisitos alterados com histórico, forja de aprovação e limite de 24 meses.
- Chrome + GoTrue/PostgREST/PostgreSQL reais locais: oito verificações, incluindo modelo escolhido no DOM, aprovação atribuída pelo servidor, gravação, recarga, cancelar, editar, comunicar e inativar.
- Sintaxe/lint/diff aprovados. As limitações de login/roteamento do dashboard completo e compatibilidade do ambiente operacional continuam separadas.

Atualização final: login e navegação do dashboard completo foram exercitados com backend local real (10 verificações aprovadas). Corrigida a sessão do login por email para preservar UID/email do Auth. Compatibilidade operacional conferida por consultas somente leitura: vínculo matrícula 76 no painel ausente; script específico preparado e testado, sem execução remota. Ver CNH_ENTREGA_FINAL.md.
