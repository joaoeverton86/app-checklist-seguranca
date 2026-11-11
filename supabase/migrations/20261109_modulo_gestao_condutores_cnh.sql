-- =============================================================================
-- MIGRAÇÃO (MINUTA REVISÁVEL - ETAPA 2): MÓDULO GESTÃO DE CONDUTORES - CNH
-- Arquivo: supabase/migrations/20261109_modulo_gestao_condutores_cnh.sql
-- Status: MINUTA REVISÁVEL — BLOQUEADA PARA APLICAÇÃO EM PRODUÇÃO OU BANCO
--         REMOTO ATÉ VERIFICAÇÃO DE SCHEMA E TESTES EM POSTGRESQL ISOLADO.
-- =============================================================================
--
-- OBJETIVO E ESCOPO DESTA MIGRAÇÃO:
-- 1. Criar a tabela exclusiva `public.gestao_de_condutores_cnh` para controle
--    operacional de condutores de veículos e operadores de equipamentos
--    (Próprios, Terceiros e PJ), sem tocar em `colaboradores_efetivo` nem
--    `colaboradores_checklist` e sem coletar número de CNH ou CPF/RG.
-- 2. Garantir ciclo de vencimento de CNH por UUID gerado no banco
--    (`cnh_ciclo_id`), distinguindo explicitamente RENOVACAO (gera novo
--    `cnh_ciclo_id` e arquiva o ciclo anterior em `ciclos_cnh_historico` como
--    `SUBSTITUIDO_POR_RENOVACAO`) de CORRECAO_DATA (mantém o `cnh_ciclo_id` e
--    registra a correção na trilha de auditoria).
-- 3. Garantir imutabilidade das comunicações registradas (`comunicacoes` é
--    append-only: nunca altera um item `REGISTRADA` para outro status) e
--    calcular `estagio_no_momento` no próprio servidor PostgreSQL com base na
--    data civil atual em `America/Sao_Paulo`, sem confiar no estágio enviado
--    pelo navegador.
-- 4. Validar de forma estrita os contratos estruturais JSONB (`avaliacoes`,
--    `comunicacoes`, `ciclos_cnh_historico`, `historico_eventos`), sem usar
--    `STRICT` (para que `NULL` retorne `false` e nunca `NULL`), sem ambiguidade
--    de `NULL` em comparações `jsonb_typeof` e sem usar `now()` em funções
--    `IMMUTABLE`. As validações temporais (como bloqueio de treinamentos com
--    data futura e proteção de aprovação/histórico de regras) ocorrem nas RPCs
--    transacionais do servidor.
-- 5. Proteger no servidor a aprovação e o histórico das regras de avaliação:
--    como não há matriz SST aprovada identificada neste escopo, o banco rejeita
--    qualquer tentativa do cliente de criar/alterar requisitos com
--    `regra_aprovada = true`, preserva no servidor aprovações e históricos já
--    existentes quando os requisitos (incluindo código/aplicabilidade/exigência
--    de validade dos treinamentos) não mudam, e arquiva avaliações removidas
--    em `historico_eventos`.
-- 6. LACUNA EXPLÍCITA DE SCHEMA E MODELO DE ACESSO (BLOQUEIO DOCUMENTADO):
--    O arquivo base versionado `supabase_schema.sql` não contém o DDL da coluna
--    `auth_user_id` nem constraint `UNIQUE` em `painel_usuarios` ou
--    `colaboradores_checklist`. Por isso:
--    - Esta migração NÃO altera privilégios globais de schemas compartilhados
--      e NÃO inventa colunas em tabelas existentes;
--    - `app_private.resolver_identidade_condutores_cnh()` opera em modo estrito
--      **negar por padrão (deny-by-default)**: nega imediatamente se não houver
--      vínculo único (`COUNT(*) = 1`) para `auth.uid()` em `painel_usuarios` +
--      `painel_perfis`, sem usar `LIMIT 1` arbitrário e sem conceder acesso por
--      `nivel_acesso ILIKE 'tecnico%'` ou `LIKE` de cargo.
-- =============================================================================
BEGIN;
-- Schema privado para helpers internos (sem REVOKE ALL no schema compartilhado para não afetar outros módulos)
CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;
-- =============================================================================
-- 1. FUNÇÕES DE VALIDAÇÃO ESTRUTURAL ESTRITA (IMMUTABLE, SEM STRICT, SEM NOW())
-- =============================================================================
-- Valida data ISO YYYY-MM-DD real (CALLED ON NULL INPUT: retorna sempre boolean NOT NULL, nunca NULL)
CREATE OR REPLACE FUNCTION public.condutores_cnh_is_iso_date(p_val text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_date date;
BEGIN
    IF p_val IS NULL OR p_val !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RETURN false;
    END IF;
    v_date := p_val::date;
    RETURN to_char(v_date, 'YYYY-MM-DD') = p_val;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_is_iso_date(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_is_iso_date(text) TO authenticated, service_role;
-- Validação estrutural estrita do JSONB `avaliacoes` (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.condutores_cnh_validar_avaliacoes(p_avaliacoes jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item jsonb;
    v_trein jsonb;
    v_cat jsonb;
    v_hist jsonb;
    v_ids text[] := ARRAY[]::text[];
    v_trein_cods text[];
    v_cats_vistas text[];
    v_id text;
    v_cat_txt text;
    v_t_cod text;
    v_exige_cnh text;
    v_aprovada boolean;
    v_t_aplic text;
    v_t_exige_val text;
    v_tem_conf_em boolean;
BEGIN
    IF p_avaliacoes IS NULL OR COALESCE(jsonb_typeof(p_avaliacoes), 'missing') <> 'array' THEN
        RETURN false;
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_avaliacoes)
    LOOP
        IF v_item IS NULL OR COALESCE(jsonb_typeof(v_item), 'missing') <> 'object' THEN
            RETURN false;
        END IF;
        -- Campos obrigatórios de identificação da avaliação (COALESCE evita NULL em chave ausente)
        IF COALESCE(jsonb_typeof(v_item->'avaliacao_id'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'avaliacao_id', ''))) < 3
           OR COALESCE(jsonb_typeof(v_item->'atividade_codigo'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'atividade_codigo', ''))) < 2
           OR COALESCE(jsonb_typeof(v_item->'atividade_nome'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'atividade_nome', ''))) < 2 THEN
            RETURN false;
        END IF;
        v_id := btrim(v_item->>'avaliacao_id');
        IF v_id = ANY(v_ids) THEN
            RETURN false; -- Proibido ID de avaliação duplicado
        END IF;
        v_ids := array_append(v_ids, v_id);
        -- Exigência de CNH: deve ser string em ('SIM', 'NAO', 'INDEFINIDO')
        IF COALESCE(jsonb_typeof(v_item->'exige_cnh'), 'missing') <> 'string' THEN
            RETURN false;
        END IF;
        v_exige_cnh := COALESCE(v_item->>'exige_cnh', '');
        IF v_exige_cnh NOT IN ('SIM', 'NAO', 'INDEFINIDO') THEN
            RETURN false;
        END IF;
        -- Categorias aceitas: deve ser array de strings sem duplicatas dentro do domínio de CNH
        IF COALESCE(jsonb_typeof(v_item->'categorias_aceitas'), 'missing') <> 'array' THEN
            RETURN false;
        END IF;
        v_cats_vistas := ARRAY[]::text[];
        FOR v_cat IN SELECT value FROM jsonb_array_elements(v_item->'categorias_aceitas')
        LOOP
            IF v_cat IS NULL OR COALESCE(jsonb_typeof(v_cat), 'missing') <> 'string' THEN
                RETURN false;
            END IF;
            v_cat_txt := COALESCE(v_cat#>>'{}', '');
            IF v_cat_txt NOT IN ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE')
               OR v_cat_txt = ANY(v_cats_vistas) THEN
                RETURN false;
            END IF;
            v_cats_vistas := array_append(v_cats_vistas, v_cat_txt);
        END LOOP;
        -- Flag explícita de regra aprovada na matriz SST
        IF COALESCE(jsonb_typeof(v_item->'regra_aprovada'), 'missing') <> 'boolean' THEN
            RETURN false;
        END IF;
        v_aprovada := (v_item->>'regra_aprovada')::boolean;
        IF v_aprovada IS TRUE THEN
            -- Se marcada como aprovada, exige versão, responsável autenticado e data ISO válida
            IF COALESCE(jsonb_typeof(v_item->'regra_versao'), 'missing') <> 'string'
               OR char_length(btrim(COALESCE(v_item->>'regra_versao', ''))) < 1
               OR COALESCE(jsonb_typeof(v_item->'regra_aprovada_por_uid'), 'missing') <> 'string'
               OR char_length(btrim(COALESCE(v_item->>'regra_aprovada_por_uid', ''))) < 8
               OR COALESCE(jsonb_typeof(v_item->'regra_aprovada_por_nome'), 'missing') <> 'string'
               OR char_length(btrim(COALESCE(v_item->>'regra_aprovada_por_nome', ''))) < 2
               OR COALESCE(jsonb_typeof(v_item->'regra_aprovada_em'), 'missing') <> 'string'
               OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_item->>'regra_aprovada_em', ''), 10)) THEN
                RETURN false;
            END IF;
        END IF;
        -- Histórico de regras anteriores da avaliação (sobrevive à edição)
        IF v_item ? 'regras_historico' THEN
            IF COALESCE(jsonb_typeof(v_item->'regras_historico'), 'missing') <> 'array' THEN
                RETURN false;
            END IF;
            FOR v_hist IN SELECT value FROM jsonb_array_elements(v_item->'regras_historico')
            LOOP
                IF v_hist IS NULL
                   OR COALESCE(jsonb_typeof(v_hist), 'missing') <> 'object'
                   OR COALESCE(jsonb_typeof(v_hist->'regra_aprovada'), 'missing') <> 'boolean'
                   OR COALESCE(jsonb_typeof(v_hist->'exige_cnh'), 'missing') <> 'string'
                   OR COALESCE(v_hist->>'exige_cnh', '') NOT IN ('SIM', 'NAO', 'INDEFINIDO')
                   OR COALESCE(jsonb_typeof(v_hist->'categorias_aceitas'), 'missing') <> 'array'
                   OR COALESCE(jsonb_typeof(v_hist->'arquivada_em'), 'missing') <> 'string'
                   OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_hist->>'arquivada_em', ''), 10)) THEN
                    RETURN false;
                END IF;
            END LOOP;
        END IF;
        -- Treinamentos da atividade
        IF COALESCE(jsonb_typeof(v_item->'treinamentos'), 'missing') <> 'array' THEN
            RETURN false;
        END IF;
        v_trein_cods := ARRAY[]::text[];
        FOR v_trein IN SELECT value FROM jsonb_array_elements(v_item->'treinamentos')
        LOOP
            IF v_trein IS NULL OR COALESCE(jsonb_typeof(v_trein), 'missing') <> 'object' THEN
                RETURN false;
            END IF;
            IF COALESCE(jsonb_typeof(v_trein->'codigo'), 'missing') <> 'string'
               OR char_length(btrim(COALESCE(v_trein->>'codigo', ''))) < 1
               OR COALESCE(jsonb_typeof(v_trein->'nome'), 'missing') <> 'string'
               OR char_length(btrim(COALESCE(v_trein->>'nome', ''))) < 2
               OR COALESCE(jsonb_typeof(v_trein->'status_aplicabilidade'), 'missing') <> 'string'
               OR COALESCE(jsonb_typeof(v_trein->'exige_validade'), 'missing') <> 'string' THEN
                RETURN false;
            END IF;
            v_t_cod := upper(btrim(v_trein->>'codigo'));
            IF v_t_cod = ANY(v_trein_cods) THEN
                RETURN false; -- Proibido código de treinamento repetido na mesma atividade
            END IF;
            v_trein_cods := array_append(v_trein_cods, v_t_cod);
            v_t_aplic := COALESCE(v_trein->>'status_aplicabilidade', '');
            IF v_t_aplic NOT IN ('OBRIGATORIO', 'NAO_APLICAVEL', 'PENDENTE_REGRA') THEN
                RETURN false;
            END IF;
            v_t_exige_val := COALESCE(v_trein->>'exige_validade', '');
            IF v_t_exige_val NOT IN ('SIM', 'NAO', 'INDEFINIDO') THEN
                RETURN false;
            END IF;
            -- Datas opcionais/obrigatórias se preenchidas devem ser strings ISO válidas
            IF (v_trein ? 'data_realizacao') AND COALESCE(jsonb_typeof(v_trein->'data_realizacao'), 'null') <> 'null' THEN
                IF COALESCE(jsonb_typeof(v_trein->'data_realizacao'), 'missing') <> 'string'
                   OR NOT public.condutores_cnh_is_iso_date(v_trein->>'data_realizacao') THEN
                    RETURN false;
                END IF;
            END IF;
            IF (v_trein ? 'validade') AND COALESCE(jsonb_typeof(v_trein->'validade'), 'null') <> 'null' THEN
                IF COALESCE(jsonb_typeof(v_trein->'validade'), 'missing') <> 'string'
                   OR NOT public.condutores_cnh_is_iso_date(v_trein->>'validade') THEN
                    RETURN false;
                END IF;
            END IF;
            -- Contrato de comprovação e conferência (comprovacao_ref, conferido_por, conferido_em)
            IF (v_trein ? 'comprovacao_ref') AND COALESCE(jsonb_typeof(v_trein->'comprovacao_ref'), 'null') <> 'null' THEN
                IF COALESCE(jsonb_typeof(v_trein->'comprovacao_ref'), 'missing') <> 'string'
                   OR char_length(btrim(COALESCE(v_trein->>'comprovacao_ref', ''))) < 2 THEN
                    RETURN false;
                END IF;
            END IF;
            IF (v_trein ? 'conferido_por') AND COALESCE(jsonb_typeof(v_trein->'conferido_por'), 'null') <> 'null' THEN
                IF COALESCE(jsonb_typeof(v_trein->'conferido_por'), 'missing') <> 'string'
                   OR char_length(btrim(COALESCE(v_trein->>'conferido_por', ''))) < 2 THEN
                    RETURN false;
                END IF;
            END IF;
            v_tem_conf_em := (v_trein ? 'conferido_em') AND COALESCE(jsonb_typeof(v_trein->'conferido_em'), 'null') <> 'null';
            IF v_tem_conf_em THEN
                IF COALESCE(jsonb_typeof(v_trein->'conferido_em'), 'missing') <> 'string'
                   OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_trein->>'conferido_em', ''), 10))
                   OR COALESCE(jsonb_typeof(v_trein->'conferido_por'), 'missing') <> 'string'
                   OR char_length(btrim(COALESCE(v_trein->>'conferido_por', ''))) < 2
                   OR COALESCE(jsonb_typeof(v_trein->'comprovacao_ref'), 'missing') <> 'string'
                   OR char_length(btrim(COALESCE(v_trein->>'comprovacao_ref', ''))) < 2 THEN
                    RETURN false;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_validar_avaliacoes(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_validar_avaliacoes(jsonb) TO authenticated, service_role;
-- Validação estrutural estrita do JSONB `comunicacoes` (append-only, imutável)
CREATE OR REPLACE FUNCTION public.condutores_cnh_validar_comunicacoes(p_comunicacoes jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item jsonb;
    v_ids text[] := ARRAY[]::text[];
    v_id text;
BEGIN
    IF p_comunicacoes IS NULL OR COALESCE(jsonb_typeof(p_comunicacoes), 'missing') <> 'array' THEN
        RETURN false;
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_comunicacoes)
    LOOP
        IF v_item IS NULL OR COALESCE(jsonb_typeof(v_item), 'missing') <> 'object' THEN
            RETURN false;
        END IF;
        IF COALESCE(jsonb_typeof(v_item->'comunicacao_id'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'comunicacao_id', ''))) < 6
           OR COALESCE(jsonb_typeof(v_item->'cnh_ciclo_id'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'cnh_ciclo_id', ''))) < 6
           OR COALESCE(jsonb_typeof(v_item->'vencimento_comunicado'), 'missing') <> 'string'
           OR NOT public.condutores_cnh_is_iso_date(v_item->>'vencimento_comunicado')
           OR COALESCE(jsonb_typeof(v_item->'estagio_no_momento'), 'missing') <> 'string'
           OR COALESCE(v_item->>'estagio_no_momento', '') NOT IN ('A_VENCER', 'VENCE_HOJE', 'VENCIDA')
           OR COALESCE(jsonb_typeof(v_item->'canal'), 'missing') <> 'string'
           OR COALESCE(v_item->>'canal', '') NOT IN ('WHATSAPP', 'EMAIL', 'DDS_PRESENCIAL', 'OFICIO_FORMAL', 'TELEFONE')
           OR COALESCE(jsonb_typeof(v_item->'motivo'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'motivo', ''))) < 3
           OR COALESCE(jsonb_typeof(v_item->'registrado_em'), 'missing') <> 'string'
           OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_item->>'registrado_em', ''), 10))
           OR COALESCE(jsonb_typeof(v_item->'responsavel_uid'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'responsavel_uid', ''))) < 8
           OR COALESCE(jsonb_typeof(v_item->'responsavel_nome'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'responsavel_nome', ''))) < 2 THEN
            RETURN false;
        END IF;
        -- Comunicações registradas NUNCA mudam para 'SUBSTITUIDA_POR_RENOVACAO'
        IF COALESCE(jsonb_typeof(v_item->'status_registro'), 'missing') <> 'string'
           OR COALESCE(v_item->>'status_registro', '') <> 'REGISTRADA' THEN
            RETURN false;
        END IF;
        v_id := btrim(v_item->>'comunicacao_id');
        IF v_id = ANY(v_ids) THEN
            RETURN false;
        END IF;
        v_ids := array_append(v_ids, v_id);
    END LOOP;
    RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_validar_comunicacoes(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_validar_comunicacoes(jsonb) TO authenticated, service_role;
-- Validação estrutural estrita do JSONB `ciclos_cnh_historico`
CREATE OR REPLACE FUNCTION public.condutores_cnh_validar_ciclos_historico(p_ciclos jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item jsonb;
    v_ids text[] := ARRAY[]::text[];
    v_id text;
BEGIN
    IF p_ciclos IS NULL OR COALESCE(jsonb_typeof(p_ciclos), 'missing') <> 'array' THEN
        RETURN false;
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_ciclos)
    LOOP
        IF v_item IS NULL OR COALESCE(jsonb_typeof(v_item), 'missing') <> 'object' THEN
            RETURN false;
        END IF;
        IF COALESCE(jsonb_typeof(v_item->'cnh_ciclo_id'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'cnh_ciclo_id', ''))) < 6
           OR COALESCE(jsonb_typeof(v_item->'cnh_validade'), 'missing') <> 'string'
           OR NOT public.condutores_cnh_is_iso_date(v_item->>'cnh_validade')
           OR COALESCE(jsonb_typeof(v_item->'status_ciclo'), 'missing') <> 'string'
           OR COALESCE(v_item->>'status_ciclo', '') NOT IN ('SUBSTITUIDO_POR_RENOVACAO', 'ENCERRADO_POR_REMOCAO_CNH')
           OR COALESCE(jsonb_typeof(v_item->'encerrado_em'), 'missing') <> 'string'
           OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_item->>'encerrado_em', ''), 10))
           OR COALESCE(jsonb_typeof(v_item->'encerrado_por_uid'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'encerrado_por_uid', ''))) < 8
           OR COALESCE(jsonb_typeof(v_item->'encerrado_por_nome'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'encerrado_por_nome', ''))) < 2 THEN
            RETURN false;
        END IF;
        v_id := btrim(v_item->>'cnh_ciclo_id');
        IF v_id = ANY(v_ids) THEN
            RETURN false;
        END IF;
        v_ids := array_append(v_ids, v_id);
    END LOOP;
    RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_validar_ciclos_historico(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_validar_ciclos_historico(jsonb) TO authenticated, service_role;
-- Validação estrutural estrita do JSONB `historico_eventos`
CREATE OR REPLACE FUNCTION public.condutores_cnh_validar_historico_eventos(p_eventos jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
CALLED ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item jsonb;
    v_ids text[] := ARRAY[]::text[];
    v_id text;
BEGIN
    IF p_eventos IS NULL OR COALESCE(jsonb_typeof(p_eventos), 'missing') <> 'array' THEN
        RETURN false;
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_eventos)
    LOOP
        IF v_item IS NULL OR COALESCE(jsonb_typeof(v_item), 'missing') <> 'object' THEN
            RETURN false;
        END IF;
        IF COALESCE(jsonb_typeof(v_item->'evento_id'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'evento_id', ''))) < 6
           OR COALESCE(jsonb_typeof(v_item->'tipo'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'tipo', ''))) < 3
           OR COALESCE(jsonb_typeof(v_item->'em'), 'missing') <> 'string'
           OR NOT public.condutores_cnh_is_iso_date(left(COALESCE(v_item->>'em', ''), 10))
           OR COALESCE(jsonb_typeof(v_item->'responsavel_uid'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'responsavel_uid', ''))) < 8
           OR COALESCE(jsonb_typeof(v_item->'responsavel_nome'), 'missing') <> 'string'
           OR char_length(btrim(COALESCE(v_item->>'responsavel_nome', ''))) < 2 THEN
            RETURN false;
        END IF;
        v_id := btrim(v_item->>'evento_id');
        IF v_id = ANY(v_ids) THEN
            RETURN false;
        END IF;
        v_ids := array_append(v_ids, v_id);
    END LOOP;
    RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_validar_historico_eventos(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_validar_historico_eventos(jsonb) TO authenticated, service_role;
-- =============================================================================
-- 2. TABELA PRINCIPAL: `public.gestao_de_condutores_cnh`
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gestao_de_condutores_cnh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL CHECK (char_length(btrim(nome)) >= 3),
    vinculo TEXT NOT NULL CHECK (vinculo IN ('PROPRIO', 'TERCEIRO', 'PJ')),
    empresa TEXT NOT NULL CHECK (char_length(btrim(empresa)) >= 1),
    funcao TEXT NOT NULL CHECK (char_length(btrim(funcao)) >= 1),
    setor_frente TEXT NOT NULL CHECK (char_length(btrim(setor_frente)) >= 1),
    ativo BOOLEAN NOT NULL DEFAULT true,
    inativado_em TIMESTAMPTZ,
    inativado_motivo TEXT,
    inativado_por_uid UUID,
    inativado_por_nome TEXT,
    observacoes TEXT,
    -- Dados de CNH (sem número de CNH ou documento pessoal neste escopo)
    cnh_categoria TEXT CHECK (
        cnh_categoria IS NULL
        OR cnh_categoria IN ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE', 'NAO_POSSUI')
    ),
    cnh_validade DATE,
    cnh_ciclo_id UUID,
    -- Antecedência configurável por registro (proposta técnica: 1..180 dias, padrão 30)
    antecedencia_alerta_dias INTEGER NOT NULL DEFAULT 30 CHECK (antecedencia_alerta_dias BETWEEN 1 AND 180),
    -- Estruturas JSONB com validação estrita NOT NULL
    avaliacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    comunicacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ciclos_cnh_historico JSONB NOT NULL DEFAULT '[]'::jsonb,
    historico_eventos JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Controle de concorrência otimista e auditoria verificada no servidor
    versao INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_uid UUID NOT NULL,
    created_by_nome TEXT NOT NULL CHECK (char_length(btrim(created_by_nome)) >= 2),
    updated_by_uid UUID NOT NULL,
    updated_by_nome TEXT NOT NULL CHECK (char_length(btrim(updated_by_nome)) >= 2),
    -- Constraints de integridade entre colunas
    CONSTRAINT ck_condutores_cnh_inativacao CHECK (
        (ativo = true AND inativado_em IS NULL AND inativado_motivo IS NULL)
        OR (ativo = false AND inativado_em IS NOT NULL AND char_length(btrim(COALESCE(inativado_motivo, ''))) >= 3)
    ),
    CONSTRAINT ck_condutores_cnh_ciclo_consistente CHECK (
        (cnh_validade IS NULL AND cnh_ciclo_id IS NULL)
        OR (cnh_validade IS NOT NULL AND cnh_ciclo_id IS NOT NULL AND cnh_categoria IS NOT NULL AND cnh_categoria <> 'NAO_POSSUI')
    ),
    CONSTRAINT ck_condutores_cnh_avaliacoes_validas CHECK (
        public.condutores_cnh_validar_avaliacoes(avaliacoes) IS TRUE
    ),
    CONSTRAINT ck_condutores_cnh_comunicacoes_validas CHECK (
        public.condutores_cnh_validar_comunicacoes(comunicacoes) IS TRUE
    ),
    CONSTRAINT ck_condutores_cnh_ciclos_hist_validos CHECK (
        public.condutores_cnh_validar_ciclos_historico(ciclos_cnh_historico) IS TRUE
    ),
    CONSTRAINT ck_condutores_cnh_historico_eventos_validos CHECK (
        public.condutores_cnh_validar_historico_eventos(historico_eventos) IS TRUE
    )
);
CREATE INDEX IF NOT EXISTS idx_gestao_condutores_cnh_ativo_validade
    ON public.gestao_de_condutores_cnh (ativo, cnh_validade);
CREATE INDEX IF NOT EXISTS idx_gestao_condutores_cnh_vinculo_empresa
    ON public.gestao_de_condutores_cnh (vinculo, empresa);
CREATE INDEX IF NOT EXISTS idx_gestao_condutores_cnh_nome_lower
    ON public.gestao_de_condutores_cnh (lower(nome));
-- =============================================================================
-- 3. FUNÇÃO DE AUTORIZAÇÃO ESTRITA (DENY-BY-DEFAULT, SEM AMBIGUIDADE LIMIT 1)
-- =============================================================================
-- Nota de Auditoria:
-- - Nega imediatamente se `auth.uid() IS NULL`.
-- - Conta os registros vinculados a `auth.uid()` em `public.painel_usuarios`
--   (via `to_jsonb(pu)->>'auth_user_id' = v_uid::text`): se `v_count_pu <> 1`
--   (zero ou múltiplos vínculos ambíguos), NEGA POR PADRÃO (sem `LIMIT 1`
--   arbitrário e sem conceder permissão por `nivel_acesso ILIKE 'tecnico%'`
--   ou `LIKE` de função em `colaboradores_checklist`).
-- - Verifica também se há registro associado em `public.colaboradores_checklist`:
--   se houver múltiplos vínculos (`v_count_colab > 1`) ou se o colaborador
--   estiver inativo (`ativo IS FALSE`), NEGA imediatamente.
CREATE OR REPLACE FUNCTION app_private.resolver_identidade_condutores_cnh()
RETURNS TABLE (
    autorizado_leitura boolean,
    autorizado_escrita boolean,
    usuario_uid uuid,
    usuario_nome text,
    usuario_matricula text,
    motivo_decisao text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_count_pu integer := 0;
    v_count_colab integer := 0;
    v_pu record;
    v_colab record;
    v_eh_saude_restrita boolean := false;
    v_leitura boolean := false;
    v_escrita boolean := false;
    v_nome text := '';
    v_mat text := '';
    v_motivo text := 'NEGADO_PADRAO';
BEGIN
    -- 1. Sem JWT válido do Supabase Auth -> Negado imediatamente
    IF v_uid IS NULL THEN
        RETURN QUERY SELECT false, false, NULL::uuid, ''::text, ''::text, 'SEM_SESSAO_AUTH_JWT'::text;
        RETURN;
    END IF;
    -- 2. Verifica unicidade estrita de vínculo em painel_usuarios (sem LIMIT 1 arbitrário)
    SELECT COUNT(*)
      INTO v_count_pu
      FROM public.painel_usuarios pu
     WHERE (to_jsonb(pu)->>'auth_user_id') = v_uid::text;
    IF v_count_pu > 1 THEN
        RETURN QUERY SELECT false, false, v_uid, ''::text, ''::text, 'VINCULO_PAINEL_USUARIOS_AMBIGUO'::text;
        RETURN;
    END IF;
    IF v_count_pu = 0 THEN
        -- Sem vínculo explícito e único em painel_usuarios -> Negado por padrão (sem ramo permissivo por cargo/Técnico)
        RETURN QUERY SELECT false, false, v_uid, ''::text, ''::text, 'SEM_VINCULO_EXPLICITO_PAINEL_USUARIOS'::text;
        RETURN;
    END IF;
    SELECT pu.id,
           pu.nome,
           pu.matricula,
           pu.ativo AS usuario_ativo,
           pu.perfil_id,
           pp.id AS perfil_existe,
           pp.ativo AS perfil_ativo,
           pp.ver_todos,
           COALESCE(pp.modulos, ARRAY[]::text[]) AS modulos,
           COALESCE(pp.modulos_edicao, ARRAY[]::text[]) AS modulos_edicao
      INTO v_pu
      FROM public.painel_usuarios pu
      LEFT JOIN public.painel_perfis pp ON pp.id = pu.perfil_id
     WHERE (to_jsonb(pu)->>'auth_user_id') = v_uid::text;
    IF v_pu.usuario_ativo IS FALSE OR v_pu.perfil_existe IS NULL OR v_pu.perfil_ativo IS FALSE THEN
        RETURN QUERY SELECT false, false, v_uid, COALESCE(v_pu.nome, ''), COALESCE(v_pu.matricula, ''), 'PERFIL_OU_USUARIO_PAINEL_INATIVO'::text;
        RETURN;
    END IF;
    -- 3. Verifica se existe colaborador correspondente em colaboradores_checklist e exige ausência de ambiguidade/inatividade
    SELECT COUNT(*)
      INTO v_count_colab
      FROM public.colaboradores_checklist c
     WHERE (to_jsonb(c)->>'auth_user_id') = v_uid::text
        OR (v_pu.matricula IS NOT NULL AND btrim(v_pu.matricula) <> '' AND upper(btrim(COALESCE(c.matricula, c.id, ''))) = upper(btrim(v_pu.matricula)));
    IF v_count_colab > 1 THEN
        RETURN QUERY SELECT false, false, v_uid, COALESCE(v_pu.nome, ''), COALESCE(v_pu.matricula, ''), 'VINCULO_COLABORADOR_AMBIGUO'::text;
        RETURN;
    END IF;
    IF v_count_colab = 1 THEN
        SELECT c.id, c.nome, c.matricula, c.ativo
          INTO v_colab
          FROM public.colaboradores_checklist c
         WHERE (to_jsonb(c)->>'auth_user_id') = v_uid::text
            OR (v_pu.matricula IS NOT NULL AND btrim(v_pu.matricula) <> '' AND upper(btrim(COALESCE(c.matricula, c.id, ''))) = upper(btrim(v_pu.matricula)));
        IF v_colab.ativo IS FALSE THEN
            RETURN QUERY SELECT false, false, v_uid, COALESCE(v_pu.nome, v_colab.nome, ''), COALESCE(v_pu.matricula, v_colab.matricula, ''), 'COLABORADOR_INATIVO'::text;
            RETURN;
        END IF;
    END IF;
    -- 4. Restrição explícita do perfil Saúde (modulo_saude / matrícula 98): nunca recebe escrita
    IF v_pu.perfil_id = 'modulo_saude' OR btrim(COALESCE(v_pu.matricula, '')) = '98' THEN
        v_eh_saude_restrita := true;
    END IF;
    v_nome := btrim(COALESCE(v_pu.nome, ''));
    v_mat := btrim(COALESCE(v_pu.matricula, ''));
    IF char_length(v_nome) < 2 THEN
        RETURN QUERY SELECT false, false, v_uid, v_nome, v_mat, 'IDENTIDADE_SEM_NOME_VALIDO'::text;
        RETURN;
    END IF;
    IF v_pu.ver_todos IS TRUE OR ('gestao_de_condutores' = ANY(v_pu.modulos)) THEN
        v_leitura := true;
    END IF;
    IF v_leitura IS TRUE AND NOT v_eh_saude_restrita AND ('gestao_de_condutores' = ANY(v_pu.modulos_edicao)) THEN
        v_escrita := true;
    END IF;
    v_motivo := CASE
        WHEN v_escrita THEN 'AUTORIZADO_PERFIL_EDICAO'
        WHEN v_leitura AND v_eh_saude_restrita THEN 'LEITURA_SAUDE_RESTRITA'
        WHEN v_leitura THEN 'LEITURA_PERFIL_PAINEL'
        ELSE 'NEGADO_MODULO_NAO_INCLUIDO_NO_PERFIL'
    END;
    RETURN QUERY SELECT v_leitura, v_escrita, v_uid, v_nome, v_mat, v_motivo;
END;
$$;
REVOKE ALL ON FUNCTION app_private.resolver_identidade_condutores_cnh() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.resolver_identidade_condutores_cnh() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.condutores_cnh_usuario_pode_ler()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
    SELECT COALESCE((SELECT r.autorizado_leitura FROM app_private.resolver_identidade_condutores_cnh() r LIMIT 1), false);
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_usuario_pode_ler() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_usuario_pode_ler() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.condutores_cnh_usuario_pode_escrever()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
    SELECT COALESCE((SELECT r.autorizado_escrita FROM app_private.resolver_identidade_condutores_cnh() r LIMIT 1), false);
$$;
REVOKE ALL ON FUNCTION public.condutores_cnh_usuario_pode_escrever() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.condutores_cnh_usuario_pode_escrever() TO authenticated, service_role;
-- =============================================================================
-- 4. HELPERS PRIVADOS DE PROTEÇÃO DE REGRAS, HISTÓRICO E VALIDAÇÃO TEMPORAL
-- =============================================================================
-- Extrai a assinatura canônica dos requisitos de uma avaliação (incluindo requisitos de treinamentos,
-- mas ignorando evidências individuais como data_realizacao, validade, comprovacao_ref e conferido_por/em).
CREATE OR REPLACE FUNCTION app_private.assinatura_requisitos_avaliacao(p_av jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
    SELECT jsonb_build_object(
        'atividade_codigo', upper(btrim(COALESCE(p_av->>'atividade_codigo', ''))),
        'exige_cnh', upper(btrim(COALESCE(p_av->>'exige_cnh', 'INDEFINIDO'))),
        'categorias_aceitas', COALESCE(
            (
                SELECT jsonb_agg(upper(btrim(c.val)) ORDER BY upper(btrim(c.val)))
                  FROM jsonb_array_elements_text(
                      CASE WHEN COALESCE(jsonb_typeof(p_av->'categorias_aceitas'), 'missing') = 'array'
                           THEN p_av->'categorias_aceitas'
                           ELSE '[]'::jsonb
                      END
                  ) AS c(val)
            ),
            '[]'::jsonb
        ),
        'requisitos_treinamentos', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'codigo', upper(btrim(COALESCE(t.item->>'codigo', ''))),
                        'status_aplicabilidade', upper(btrim(COALESCE(t.item->>'status_aplicabilidade', 'PENDENTE_REGRA'))),
                        'exige_validade', upper(btrim(COALESCE(t.item->>'exige_validade', 'INDEFINIDO')))
                    )
                    ORDER BY upper(btrim(COALESCE(t.item->>'codigo', '')))
                )
                  FROM jsonb_array_elements(
                      CASE WHEN COALESCE(jsonb_typeof(p_av->'treinamentos'), 'missing') = 'array'
                           THEN p_av->'treinamentos'
                           ELSE '[]'::jsonb
                      END
                  ) AS t(item)
            ),
            '[]'::jsonb
        )
    );
$$;
REVOKE ALL ON FUNCTION app_private.assinatura_requisitos_avaliacao(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.assinatura_requisitos_avaliacao(jsonb) TO authenticated, service_role;
-- Valida datas temporais de treinamentos (proibindo datas futuras em relação a America/Sao_Paulo)
-- e protege no servidor a aprovação e o histórico de regras contra falsificação/apagamento pelo cliente.
CREATE OR REPLACE FUNCTION app_private.proteger_e_mesclar_avaliacoes_condutor(
    p_avaliacoes_novas jsonb,
    p_avaliacoes_atuais jsonb,
    p_hoje_sp date,
    p_agora_iso text,
    OUT avaliacoes_finais jsonb,
    OUT avaliacoes_removidas jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
    v_av jsonb;
    v_antiga jsonb;
    v_trein jsonb;
    v_id text;
    v_ids_novos text[] := ARRAY[]::text[];
    v_hist_antigo jsonb;
    v_snapshot_regra jsonb;
    v_av_protegida jsonb;
BEGIN
    IF NOT public.condutores_cnh_validar_avaliacoes(p_avaliacoes_novas) THEN
        RAISE EXCEPTION 'VALIDACAO_AVALIACOES: Estrutura JSONB de avaliações inválida.'
            USING ERRCODE = '22023';
    END IF;
    avaliacoes_finais := '[]'::jsonb;
    avaliacoes_removidas := '[]'::jsonb;
    FOR v_av IN SELECT value FROM jsonb_array_elements(p_avaliacoes_novas)
    LOOP
        v_id := btrim(v_av->>'avaliacao_id');
        v_ids_novos := array_append(v_ids_novos, v_id);
        -- 1. Validação temporal nos treinamentos (proibido data_realizacao ou conferido_em no futuro)
        FOR v_trein IN SELECT value FROM jsonb_array_elements(v_av->'treinamentos')
        LOOP
            IF (v_trein ? 'data_realizacao')
               AND COALESCE(jsonb_typeof(v_trein->'data_realizacao'), 'null') = 'string'
               AND (v_trein->>'data_realizacao')::date > p_hoje_sp THEN
                RAISE EXCEPTION 'TREINAMENTO_DATA_FUTURA: A data de realização (%) do treinamento "%" não pode ser futura em relação a hoje em São Paulo (%).',
                    v_trein->>'data_realizacao', v_trein->>'nome', to_char(p_hoje_sp, 'YYYY-MM-DD')
                    USING ERRCODE = '22023';
            END IF;
            IF (v_trein ? 'conferido_em')
               AND COALESCE(jsonb_typeof(v_trein->'conferido_em'), 'null') = 'string'
               AND left(v_trein->>'conferido_em', 10)::date > p_hoje_sp THEN
                RAISE EXCEPTION 'CONFERENCIA_DATA_FUTURA: A data de conferência (%) do treinamento "%" não pode ser futura em relação a hoje em São Paulo (%).',
                    left(v_trein->>'conferido_em', 10), v_trein->>'nome', to_char(p_hoje_sp, 'YYYY-MM-DD')
                    USING ERRCODE = '22023';
            END IF;
        END LOOP;
        -- 2. Localiza avaliação anterior pelo avaliacao_id no registro atual do banco
        SELECT item INTO v_antiga
          FROM jsonb_array_elements(COALESCE(p_avaliacoes_atuais, '[]'::jsonb)) AS item
         WHERE btrim(COALESCE(item->>'avaliacao_id', '')) = v_id
         LIMIT 1;
        IF v_antiga IS NULL THEN
            -- Nova avaliação: como não há fonte oficial de matriz SST aprovada neste escopo,
            -- rejeita qualquer tentativa do cliente de injetar regra_aprovada = true ou histórico falso.
            IF (v_av->>'regra_aprovada')::boolean IS TRUE THEN
                RAISE EXCEPTION 'APROVACAO_REGRA_NAO_AUTORIZADA: Não há matriz SST aprovada ativa para aprovar regras diretamente pelo cliente.'
                    USING ERRCODE = '42501';
            END IF;
            v_av_protegida := v_av || jsonb_build_object(
                'regra_aprovada', false,
                'regra_versao', NULL,
                'regra_aprovada_por_uid', NULL,
                'regra_aprovada_por_nome', NULL,
                'regra_aprovada_em', NULL,
                'regras_historico', '[]'::jsonb
            );
        ELSE
            v_hist_antigo := CASE
                WHEN COALESCE(jsonb_typeof(v_antiga->'regras_historico'), 'missing') = 'array'
                THEN v_antiga->'regras_historico'
                ELSE '[]'::jsonb
            END;
            IF app_private.assinatura_requisitos_avaliacao(v_av) = app_private.assinatura_requisitos_avaliacao(v_antiga) THEN
                -- Requisitos da regra (incluindo treinamentos exigidos) NÃO mudaram:
                -- Rejeita tentativa de promover regra pendente para aprovada pelo cliente
                IF (v_av->>'regra_aprovada')::boolean IS TRUE
                   AND COALESCE((v_antiga->>'regra_aprovada')::boolean, false) IS FALSE THEN
                    RAISE EXCEPTION 'APROVACAO_REGRA_NAO_AUTORIZADA: Proibido forjar aprovação de regra pendente.'
                        USING ERRCODE = '42501';
                END IF;
                -- Preserva integralmente a aprovação e o histórico de regras gravados no banco!
                v_av_protegida := v_av || jsonb_build_object(
                    'regra_aprovada', COALESCE((v_antiga->>'regra_aprovada')::boolean, false),
                    'regra_versao', v_antiga->'regra_versao',
                    'regra_aprovada_por_uid', v_antiga->'regra_aprovada_por_uid',
                    'regra_aprovada_por_nome', v_antiga->'regra_aprovada_por_nome',
                    'regra_aprovada_em', v_antiga->'regra_aprovada_em',
                    'regras_historico', v_hist_antigo
                );
            ELSE
                -- Requisitos da regra mudaram: rejeita tentativa de aprovar a nova regra pelo cliente,
                -- arquiva os requisitos anteriores em regras_historico no servidor e marca a regra atual como pendente.
                IF (v_av->>'regra_aprovada')::boolean IS TRUE THEN
                    RAISE EXCEPTION 'APROVACAO_REGRA_NAO_AUTORIZADA: Alteração de requisitos da atividade exige aprovação formal na matriz SST; proibido aprovar pelo cliente.'
                        USING ERRCODE = '42501';
                END IF;
                v_snapshot_regra := jsonb_build_object(
                    'regra_versao', COALESCE(v_antiga->>'regra_versao', 'NAO_APROVADA'),
                    'regra_aprovada', COALESCE((v_antiga->>'regra_aprovada')::boolean, false),
                    'regra_aprovada_por_uid', v_antiga->'regra_aprovada_por_uid',
                    'regra_aprovada_por_nome', v_antiga->'regra_aprovada_por_nome',
                    'regra_aprovada_em', v_antiga->'regra_aprovada_em',
                    'exige_cnh', v_antiga->'exige_cnh',
                    'categorias_aceitas', COALESCE(v_antiga->'categorias_aceitas', '[]'::jsonb),
                    'requisitos_treinamentos', (app_private.assinatura_requisitos_avaliacao(v_antiga))->'requisitos_treinamentos',
                    'arquivada_em', p_agora_iso
                );
                v_av_protegida := v_av || jsonb_build_object(
                    'regra_aprovada', false,
                    'regra_versao', NULL,
                    'regra_aprovada_por_uid', NULL,
                    'regra_aprovada_por_nome', NULL,
                    'regra_aprovada_em', NULL,
                    'regras_historico', v_hist_antigo || jsonb_build_array(v_snapshot_regra)
                );
            END IF;
        END IF;
        avaliacoes_finais := avaliacoes_finais || jsonb_build_array(v_av_protegida);
    END LOOP;
    -- 3. Identifica avaliações anteriores que foram removidas pelo cliente para arquivamento no servidor
    FOR v_antiga IN SELECT value FROM jsonb_array_elements(COALESCE(p_avaliacoes_atuais, '[]'::jsonb))
    LOOP
        IF NOT (btrim(COALESCE(v_antiga->>'avaliacao_id', '')) = ANY(v_ids_novos)) THEN
            avaliacoes_removidas := avaliacoes_removidas || jsonb_build_array(v_antiga);
        END IF;
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION app_private.proteger_e_mesclar_avaliacoes_condutor(jsonb, jsonb, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.proteger_e_mesclar_avaliacoes_condutor(jsonb, jsonb, date, text) TO authenticated, service_role;
-- =============================================================================
-- 5. PRIVILÉGIOS DE TABELA E POLÍTICAS RLS (ESCRITA SOMENTE VIA RPC)
-- =============================================================================
ALTER TABLE public.gestao_de_condutores_cnh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestao_de_condutores_cnh FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.gestao_de_condutores_cnh FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gestao_de_condutores_cnh TO authenticated;
GRANT ALL ON public.gestao_de_condutores_cnh TO service_role;
DROP POLICY IF EXISTS policy_condutores_cnh_select ON public.gestao_de_condutores_cnh;
CREATE POLICY policy_condutores_cnh_select
    ON public.gestao_de_condutores_cnh
    FOR SELECT
    TO authenticated
    USING (public.condutores_cnh_usuario_pode_ler() IS TRUE);
-- =============================================================================
-- 6. RPCS ATÔMICAS DE ESCRITA (CADASTRO/EDIÇÃO, INATIVAÇÃO E COMUNICAÇÃO)
-- =============================================================================
-- 6.1 RPC: Salvar Condutor (Criação ou Edição com Controle de Concorrência, Ciclo UUID e Proteção de Regras)
CREATE OR REPLACE FUNCTION public.salvar_condutor_cnh_atomico(
    p_id uuid DEFAULT NULL,
    p_versao_esperada integer DEFAULT NULL,
    p_nome text DEFAULT NULL,
    p_vinculo text DEFAULT NULL,
    p_empresa text DEFAULT NULL,
    p_funcao text DEFAULT NULL,
    p_setor_frente text DEFAULT NULL,
    p_observacoes text DEFAULT NULL,
    p_cnh_categoria text DEFAULT NULL,
    p_cnh_validade date DEFAULT NULL,
    p_modo_alteracao_cnh text DEFAULT 'MANTIDO', -- 'MANTIDO' | 'RENOVACAO' | 'CORRECAO_DATA' | 'PRIMEIRO_CADASTRO' | 'REMOCAO'
    p_justificativa_alteracao_cnh text DEFAULT NULL,
    p_antecedencia_alerta_dias integer DEFAULT 30,
    p_avaliacoes jsonb DEFAULT '[]'::jsonb
)
RETURNS public.gestao_de_condutores_cnh
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
    v_ident record;
    v_atual public.gestao_de_condutores_cnh%ROWTYPE;
    v_retorno public.gestao_de_condutores_cnh%ROWTYPE;
    v_novo_ciclo_id uuid;
    v_ciclos_hist jsonb;
    v_hist_eventos jsonb;
    v_avaliacoes_protegidas jsonb;
    v_avaliacoes_removidas jsonb;
    v_agora timestamptz := now();
    v_agora_iso text := to_char(v_agora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    v_hoje_sp date := (v_agora AT TIME ZONE 'America/Sao_Paulo')::date;
    v_modo text := COALESCE(upper(btrim(p_modo_alteracao_cnh)), 'MANTIDO');
    v_cat text := NULLIF(upper(btrim(COALESCE(p_cnh_categoria, ''))), '');
BEGIN
    SELECT * INTO v_ident FROM app_private.resolver_identidade_condutores_cnh() LIMIT 1;
    IF v_ident.autorizado_escrita IS NOT TRUE THEN
        RAISE EXCEPTION 'ACESSO_NEGADO: %', COALESCE(v_ident.motivo_decisao, 'Sem permissão de escrita em Gestão de Condutores')
            USING ERRCODE = '42501';
    END IF;
    IF v_cat = 'NAO_POSSUI' OR v_cat IS NULL THEN
        p_cnh_validade := NULL;
    END IF;
    IF p_id IS NULL THEN
        -- Valida e protege avaliações para novo cadastro (proíbe regra_aprovada=true e datas futuras)
        SELECT pm.avaliacoes_finais, pm.avaliacoes_removidas
          INTO v_avaliacoes_protegidas, v_avaliacoes_removidas
          FROM app_private.proteger_e_mesclar_avaliacoes_condutor(
              COALESCE(p_avaliacoes, '[]'::jsonb),
              '[]'::jsonb,
              v_hoje_sp,
              v_agora_iso
          ) pm;
        v_novo_ciclo_id := CASE WHEN p_cnh_validade IS NOT NULL THEN gen_random_uuid() ELSE NULL END;
        v_hist_eventos := jsonb_build_array(
            jsonb_build_object(
                'evento_id', gen_random_uuid()::text,
                'tipo', 'CADASTRO_INICIAL',
                'em', v_agora_iso,
                'responsavel_uid', v_ident.usuario_uid::text,
                'responsavel_nome', v_ident.usuario_nome,
                'cnh_ciclo_id', v_novo_ciclo_id::text,
                'cnh_validade', CASE WHEN p_cnh_validade IS NOT NULL THEN to_char(p_cnh_validade, 'YYYY-MM-DD') ELSE NULL END
            )
        );
        INSERT INTO public.gestao_de_condutores_cnh (
            nome, vinculo, empresa, funcao, setor_frente, ativo, observacoes,
            cnh_categoria, cnh_validade, cnh_ciclo_id, antecedencia_alerta_dias,
            avaliacoes, comunicacoes, ciclos_cnh_historico, historico_eventos,
            versao, created_at, updated_at, created_by_uid, created_by_nome, updated_by_uid, updated_by_nome
        ) VALUES (
            btrim(p_nome), upper(btrim(p_vinculo)), btrim(p_empresa), btrim(p_funcao), btrim(p_setor_frente),
            true, NULLIF(btrim(COALESCE(p_observacoes, '')), ''),
            v_cat, p_cnh_validade, v_novo_ciclo_id, COALESCE(p_antecedencia_alerta_dias, 30),
            v_avaliacoes_protegidas, '[]'::jsonb, '[]'::jsonb, v_hist_eventos,
            1, v_agora, v_agora, v_ident.usuario_uid, v_ident.usuario_nome, v_ident.usuario_uid, v_ident.usuario_nome
        )
        RETURNING * INTO v_retorno;
        RETURN v_retorno;
    END IF;
    -- Edição com lock pessimista na linha + verificação de versão otimista
    SELECT * INTO v_atual
      FROM public.gestao_de_condutores_cnh
     WHERE id = p_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NAO_ENCONTRADO: Condutor % não localizado.', p_id USING ERRCODE = 'P0002';
    END IF;
    IF p_versao_esperada IS NULL OR v_atual.versao <> p_versao_esperada THEN
        RAISE EXCEPTION 'CONFLITO_CONCORRENCIA: O registro foi modificado por outro usuário (versão atual: %, versão enviada: %). Recarregue antes de salvar.',
            v_atual.versao, COALESCE(p_versao_esperada, -1)
            USING ERRCODE = '40001';
    END IF;
    -- Valida e mescla avaliações preservando aprovações e históricos existentes no servidor
    SELECT pm.avaliacoes_finais, pm.avaliacoes_removidas
      INTO v_avaliacoes_protegidas, v_avaliacoes_removidas
      FROM app_private.proteger_e_mesclar_avaliacoes_condutor(
          COALESCE(p_avaliacoes, v_atual.avaliacoes),
          v_atual.avaliacoes,
          v_hoje_sp,
          v_agora_iso
      ) pm;
    v_novo_ciclo_id := v_atual.cnh_ciclo_id;
    v_ciclos_hist := v_atual.ciclos_cnh_historico;
    v_hist_eventos := v_atual.historico_eventos;
    -- Tratamento de ciclo de CNH (Renovação vs Correção vs Primeiro Cadastro vs Remoção)
    IF v_atual.cnh_validade IS DISTINCT FROM p_cnh_validade THEN
        IF v_atual.cnh_validade IS NULL AND p_cnh_validade IS NOT NULL THEN
            v_novo_ciclo_id := gen_random_uuid();
            v_modo := 'PRIMEIRO_CADASTRO';
        ELSIF v_atual.cnh_validade IS NOT NULL AND p_cnh_validade IS NULL THEN
            v_ciclos_hist := v_ciclos_hist || jsonb_build_array(
                jsonb_build_object(
                    'cnh_ciclo_id', v_atual.cnh_ciclo_id::text,
                    'cnh_validade', to_char(v_atual.cnh_validade, 'YYYY-MM-DD'),
                    'cnh_categoria', v_atual.cnh_categoria,
                    'status_ciclo', 'ENCERRADO_POR_REMOCAO_CNH',
                    'encerrado_em', v_agora_iso,
                    'encerrado_por_uid', v_ident.usuario_uid::text,
                    'encerrado_por_nome', v_ident.usuario_nome,
                    'justificativa', COALESCE(NULLIF(btrim(p_justificativa_alteracao_cnh), ''), 'Remoção de validade de CNH')
                )
            );
            v_novo_ciclo_id := NULL;
            v_modo := 'REMOCAO';
        ELSIF v_modo = 'RENOVACAO' THEN
            v_novo_ciclo_id := gen_random_uuid();
            v_ciclos_hist := v_ciclos_hist || jsonb_build_array(
                jsonb_build_object(
                    'cnh_ciclo_id', v_atual.cnh_ciclo_id::text,
                    'cnh_validade', to_char(v_atual.cnh_validade, 'YYYY-MM-DD'),
                    'cnh_categoria', v_atual.cnh_categoria,
                    'status_ciclo', 'SUBSTITUIDO_POR_RENOVACAO',
                    'substituido_por_ciclo_id', v_novo_ciclo_id::text,
                    'nova_validade', to_char(p_cnh_validade, 'YYYY-MM-DD'),
                    'encerrado_em', v_agora_iso,
                    'encerrado_por_uid', v_ident.usuario_uid::text,
                    'encerrado_por_nome', v_ident.usuario_nome,
                    'justificativa', COALESCE(NULLIF(btrim(p_justificativa_alteracao_cnh), ''), 'Renovação de CNH')
                )
            );
        ELSIF v_modo = 'CORRECAO_DATA' THEN
            IF char_length(btrim(COALESCE(p_justificativa_alteracao_cnh, ''))) < 3 THEN
                RAISE EXCEPTION 'VALIDACAO_CNH: Correção de data de CNH exige justificativa explícita.' USING ERRCODE = '22023';
            END IF;
        ELSE
            RAISE EXCEPTION 'VALIDACAO_CNH: Ao alterar a validade da CNH, informe explicitamente p_modo_alteracao_cnh como RENOVACAO ou CORRECAO_DATA.'
                USING ERRCODE = '22023';
        END IF;
    END IF;
    -- Se alguma avaliação existente foi removida pelo cliente, preserva snapshot integral em historico_eventos
    IF jsonb_array_length(v_avaliacoes_removidas) > 0 THEN
        v_hist_eventos := v_hist_eventos || jsonb_build_array(
            jsonb_build_object(
                'evento_id', gen_random_uuid()::text,
                'tipo', 'AVALIACOES_ARQUIVADAS_POR_REMOCAO',
                'em', v_agora_iso,
                'responsavel_uid', v_ident.usuario_uid::text,
                'responsavel_nome', v_ident.usuario_nome,
                'avaliacoes_removidas', v_avaliacoes_removidas
            )
        );
    END IF;
    v_hist_eventos := v_hist_eventos || jsonb_build_array(
        jsonb_build_object(
            'evento_id', gen_random_uuid()::text,
            'tipo', CASE
                WHEN v_atual.cnh_validade IS DISTINCT FROM p_cnh_validade THEN 'ALTERACAO_CNH_' || v_modo
                ELSE 'EDICAO_CADASTRAL'
            END,
            'em', v_agora_iso,
            'responsavel_uid', v_ident.usuario_uid::text,
            'responsavel_nome', v_ident.usuario_nome,
            'cnh_ciclo_id_anterior', v_atual.cnh_ciclo_id::text,
            'cnh_validade_anterior', CASE WHEN v_atual.cnh_validade IS NOT NULL THEN to_char(v_atual.cnh_validade, 'YYYY-MM-DD') ELSE NULL END,
            'cnh_ciclo_id_novo', v_novo_ciclo_id::text,
            'cnh_validade_nova', CASE WHEN p_cnh_validade IS NOT NULL THEN to_char(p_cnh_validade, 'YYYY-MM-DD') ELSE NULL END,
            'justificativa', NULLIF(btrim(COALESCE(p_justificativa_alteracao_cnh, '')), '')
        )
    );
    -- Nota: `comunicacoes` NUNCA é sobrescrita por payload vindo do cliente e `avaliacoes` usa apenas `v_avaliacoes_protegidas`!
    UPDATE public.gestao_de_condutores_cnh
       SET nome = btrim(p_nome),
           vinculo = upper(btrim(p_vinculo)),
           empresa = btrim(p_empresa),
           funcao = btrim(p_funcao),
           setor_frente = btrim(p_setor_frente),
           observacoes = NULLIF(btrim(COALESCE(p_observacoes, '')), ''),
           cnh_categoria = v_cat,
           cnh_validade = p_cnh_validade,
           cnh_ciclo_id = v_novo_ciclo_id,
           antecedencia_alerta_dias = COALESCE(p_antecedencia_alerta_dias, v_atual.antecedencia_alerta_dias, 30),
           avaliacoes = v_avaliacoes_protegidas,
           ciclos_cnh_historico = v_ciclos_hist,
           historico_eventos = v_hist_eventos,
           versao = v_atual.versao + 1,
           updated_at = v_agora,
           updated_by_uid = v_ident.usuario_uid,
           updated_by_nome = v_ident.usuario_nome
     WHERE id = p_id
     RETURNING * INTO v_retorno;
    RETURN v_retorno;
END;
$$;
REVOKE ALL ON FUNCTION public.salvar_condutor_cnh_atomico(uuid, integer, text, text, text, text, text, text, text, date, text, text, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_condutor_cnh_atomico(uuid, integer, text, text, text, text, text, text, text, date, text, text, integer, jsonb) TO authenticated, service_role;
-- 6.2 RPC: Alterar Status Ativo / Inativo (Inativação não exclui registro)
CREATE OR REPLACE FUNCTION public.alterar_status_condutor_cnh_atomico(
    p_condutor_id uuid,
    p_versao_esperada integer,
    p_novo_ativo boolean,
    p_motivo text DEFAULT NULL
)
RETURNS public.gestao_de_condutores_cnh
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
    v_ident record;
    v_atual public.gestao_de_condutores_cnh%ROWTYPE;
    v_retorno public.gestao_de_condutores_cnh%ROWTYPE;
    v_agora timestamptz := now();
BEGIN
    SELECT * INTO v_ident FROM app_private.resolver_identidade_condutores_cnh() LIMIT 1;
    IF v_ident.autorizado_escrita IS NOT TRUE THEN
        RAISE EXCEPTION 'ACESSO_NEGADO: %', COALESCE(v_ident.motivo_decisao, 'Sem permissão de escrita')
            USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_atual
      FROM public.gestao_de_condutores_cnh
     WHERE id = p_condutor_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NAO_ENCONTRADO: Condutor % não localizado.', p_condutor_id USING ERRCODE = 'P0002';
    END IF;
    IF p_versao_esperada IS NULL OR v_atual.versao <> p_versao_esperada THEN
        RAISE EXCEPTION 'CONFLITO_CONCORRENCIA: O registro foi alterado por outro usuário (versão atual: %).', v_atual.versao
            USING ERRCODE = '40001';
    END IF;
    IF p_novo_ativo IS FALSE AND char_length(btrim(COALESCE(p_motivo, ''))) < 3 THEN
        RAISE EXCEPTION 'VALIDACAO_INATIVACAO: Informe um motivo válido (mínimo 3 caracteres) para inativar o condutor.'
            USING ERRCODE = '22023';
    END IF;
    UPDATE public.gestao_de_condutores_cnh
       SET ativo = p_novo_ativo,
           inativado_em = CASE WHEN p_novo_ativo IS FALSE THEN v_agora ELSE NULL END,
           inativado_motivo = CASE WHEN p_novo_ativo IS FALSE THEN btrim(p_motivo) ELSE NULL END,
           inativado_por_uid = CASE WHEN p_novo_ativo IS FALSE THEN v_ident.usuario_uid ELSE NULL END,
           inativado_por_nome = CASE WHEN p_novo_ativo IS FALSE THEN v_ident.usuario_nome ELSE NULL END,
           historico_eventos = v_atual.historico_eventos || jsonb_build_array(
               jsonb_build_object(
                   'evento_id', gen_random_uuid()::text,
                   'tipo', CASE WHEN p_novo_ativo IS FALSE THEN 'INATIVACAO' ELSE 'REATIVACAO' END,
                   'em', to_char(v_agora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                   'responsavel_uid', v_ident.usuario_uid::text,
                   'responsavel_nome', v_ident.usuario_nome,
                   'motivo', NULLIF(btrim(COALESCE(p_motivo, '')), '')
               )
           ),
           versao = v_atual.versao + 1,
           updated_at = v_agora,
           updated_by_uid = v_ident.usuario_uid,
           updated_by_nome = v_ident.usuario_nome
     WHERE id = p_condutor_id
     RETURNING * INTO v_retorno;
    RETURN v_retorno;
END;
$$;
REVOKE ALL ON FUNCTION public.alterar_status_condutor_cnh_atomico(uuid, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_status_condutor_cnh_atomico(uuid, integer, boolean, text) TO authenticated, service_role;
-- 6.3 RPC: Registrar Comunicação Explícita (Append Atômico Imutável + Cálculo de Estágio no Servidor SP)
CREATE OR REPLACE FUNCTION public.registrar_comunicacao_cnh_atomica(
    p_condutor_id uuid,
    p_cnh_ciclo_id_esperado uuid,
    p_vencimento_comunicado date,
    p_canal text,
    p_motivo text,
    p_permitir_ciclo_historico boolean DEFAULT false
)
RETURNS public.gestao_de_condutores_cnh
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
    v_ident record;
    v_atual public.gestao_de_condutores_cnh%ROWTYPE;
    v_retorno public.gestao_de_condutores_cnh%ROWTYPE;
    v_agora timestamptz := now();
    v_hoje_sp date := (v_agora AT TIME ZONE 'America/Sao_Paulo')::date;
    v_diff_dias integer;
    v_estagio_calculado text;
    v_ciclo_historico_existe boolean := false;
    v_nova_comunicacao jsonb;
BEGIN
    SELECT * INTO v_ident FROM app_private.resolver_identidade_condutores_cnh() LIMIT 1;
    IF v_ident.autorizado_escrita IS NOT TRUE THEN
        RAISE EXCEPTION 'ACESSO_NEGADO: %', COALESCE(v_ident.motivo_decisao, 'Sem permissão de escrita')
            USING ERRCODE = '42501';
    END IF;
    IF p_cnh_ciclo_id_esperado IS NULL OR p_vencimento_comunicado IS NULL THEN
        RAISE EXCEPTION 'VALIDACAO_COMUNICACAO: Ciclo e data de vencimento da CNH são obrigatórios.'
            USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_atual
      FROM public.gestao_de_condutores_cnh
     WHERE id = p_condutor_id
     FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'NAO_ENCONTRADO: Condutor % não localizado.', p_condutor_id USING ERRCODE = 'P0002';
    END IF;
    IF v_atual.ativo IS FALSE THEN
        RAISE EXCEPTION 'CONDUTOR_INATIVO: Alertas e comunicações de CNH aplicam-se somente a condutores ativos.'
            USING ERRCODE = '22023';
    END IF;
    -- Verifica sob lock se o ciclo esperado e a validade esperada ainda são os ativos atuais
    IF v_atual.cnh_ciclo_id IS DISTINCT FROM p_cnh_ciclo_id_esperado
       OR v_atual.cnh_validade IS DISTINCT FROM p_vencimento_comunicado THEN
        IF p_permitir_ciclo_historico IS NOT TRUE THEN
            RAISE EXCEPTION 'CICLO_CNH_ALTERADO: O ciclo/validade da CNH mudou entre a abertura do modal e o salvamento (ciclo atual: %, enviado: %). Comunicação bloqueada para não vincular ao ciclo errado.',
                COALESCE(v_atual.cnh_ciclo_id::text, 'NULL'), p_cnh_ciclo_id_esperado::text
                USING ERRCODE = '40001';
        END IF;
        -- Se o chamador selecionou explicitamente um ciclo histórico, comprova referência inequívoca
        SELECT EXISTS (
            SELECT 1
              FROM jsonb_array_elements(v_atual.ciclos_cnh_historico) ch
             WHERE (ch->>'cnh_ciclo_id') = p_cnh_ciclo_id_esperado::text
               AND (ch->>'cnh_validade') = to_char(p_vencimento_comunicado, 'YYYY-MM-DD')
        ) INTO v_ciclo_historico_existe;
        IF NOT v_ciclo_historico_existe THEN
            RAISE EXCEPTION 'CICLO_HISTORICO_INVALIDO: O ciclo histórico % com validade % não existe neste condutor.',
                p_cnh_ciclo_id_esperado::text, to_char(p_vencimento_comunicado, 'YYYY-MM-DD')
                USING ERRCODE = '22023';
        END IF;
    END IF;
    -- Calcula o estágio no momento diretamente no servidor pela data civil de America/Sao_Paulo (sem confiar no cliente)
    v_diff_dias := (p_vencimento_comunicado - v_hoje_sp);
    IF v_diff_dias < 0 THEN
        v_estagio_calculado := 'VENCIDA';
    ELSIF v_diff_dias = 0 THEN
        v_estagio_calculado := 'VENCE_HOJE';
    ELSIF v_diff_dias <= COALESCE(v_atual.antecedencia_alerta_dias, 30) THEN
        v_estagio_calculado := 'A_VENCER';
    ELSE
        RAISE EXCEPTION 'COMUNICACAO_FORA_DA_JANELA: A CNH com validade % está fora da janela de alerta (% dias) na data civil de São Paulo (%).',
            to_char(p_vencimento_comunicado, 'YYYY-MM-DD'), COALESCE(v_atual.antecedencia_alerta_dias, 30), to_char(v_hoje_sp, 'YYYY-MM-DD')
            USING ERRCODE = '22023';
    END IF;
    v_nova_comunicacao := jsonb_build_object(
        'comunicacao_id', gen_random_uuid()::text,
        'cnh_ciclo_id', p_cnh_ciclo_id_esperado::text,
        'vencimento_comunicado', to_char(p_vencimento_comunicado, 'YYYY-MM-DD'),
        'estagio_no_momento', v_estagio_calculado,
        'canal', upper(btrim(p_canal)),
        'motivo', btrim(p_motivo),
        'registrado_em', to_char(v_agora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'responsavel_uid', v_ident.usuario_uid::text,
        'responsavel_matricula', v_ident.usuario_matricula,
        'responsavel_nome', v_ident.usuario_nome,
        'referencia_ciclo_historico', (p_permitir_ciclo_historico IS TRUE AND v_atual.cnh_ciclo_id IS DISTINCT FROM p_cnh_ciclo_id_esperado),
        'status_registro', 'REGISTRADA'
    );
    -- Append atômico: duas chamadas simultâneas aguardam o lock FOR UPDATE e concatenam ambas sem perda!
    UPDATE public.gestao_de_condutores_cnh
       SET comunicacoes = v_atual.comunicacoes || jsonb_build_array(v_nova_comunicacao),
           historico_eventos = v_atual.historico_eventos || jsonb_build_array(
               jsonb_build_object(
                   'evento_id', gen_random_uuid()::text,
                   'tipo', 'COMUNICACAO_REGISTRADA',
                   'em', to_char(v_agora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                   'responsavel_uid', v_ident.usuario_uid::text,
                   'responsavel_nome', v_ident.usuario_nome,
                   'cnh_ciclo_id', p_cnh_ciclo_id_esperado::text,
                   'vencimento_comunicado', to_char(p_vencimento_comunicado, 'YYYY-MM-DD'),
                   'estagio_no_momento', v_estagio_calculado,
                   'canal', upper(btrim(p_canal))
               )
           ),
           updated_at = v_agora,
           updated_by_uid = v_ident.usuario_uid,
           updated_by_nome = v_ident.usuario_nome
     WHERE id = p_condutor_id
     RETURNING * INTO v_retorno;
    RETURN v_retorno;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_comunicacao_cnh_atomica(uuid, uuid, date, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_comunicacao_cnh_atomica(uuid, uuid, date, text, text, boolean) TO authenticated, service_role;
COMMIT;
