-- Matriz interna aprovada por João. Não equivale a declaração de exigência legal universal.
BEGIN;
CREATE OR REPLACE FUNCTION app_private.matriz_sst_condutores_aprovada() RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $matriz$ SELECT $json$[{"atividade_codigo":"VEIC_LEVE_UTILITARIO","atividade_nome":"Veículo Leve / Caminhonete / Pick-up","exige_cnh":"SIM","categorias_aceitas":["B","C","D","E","AB","AC","AD","AE"],"treinamentos":[{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"}]},{"atividade_codigo":"TRANSP_COLETIVO_EQUIPES","atividade_nome":"Van / Micro-ônibus / Ônibus","exige_cnh":"SIM","categorias_aceitas":["D","E","AD","AE"],"treinamentos":[{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"},{"codigo":"TRANSP_COLETIVO","nome":"Transporte Coletivo de Passageiros","status_aplicabilidade":"OBRIGATORIO","exige_validade":"INDEFINIDO"}]},{"atividade_codigo":"CAMINHAO_APOIO_OBRA","atividade_nome":"Caminhão Basculante / Pipa / Carroceria","exige_cnh":"SIM","categorias_aceitas":["C","D","E","AC","AD","AE"],"treinamentos":[{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"},{"codigo":"NR11_BASCULANTE","nome":"Operação Segura de Basculamento e Carga","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"}]},{"atividade_codigo":"CAMINHAO_COMBOIO_ABAST","atividade_nome":"Caminhão Comboio (Abastecimento / Lubrificação)","exige_cnh":"SIM","categorias_aceitas":["C","D","E","AC","AD","AE"],"treinamentos":[{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"},{"codigo":"MOPP","nome":"Transporte de Produtos Perigosos","status_aplicabilidade":"OBRIGATORIO","exige_validade":"INDEFINIDO"},{"codigo":"NR20_OPERACIONAL","nome":"NR-20 Operacional","status_aplicabilidade":"OBRIGATORIO","exige_validade":"INDEFINIDO"}]},{"atividade_codigo":"CAMINHAO_GUINDAUTO_MUNCK","atividade_nome":"Caminhão Guindauto (Munck)","exige_cnh":"SIM","categorias_aceitas":["C","D","E","AC","AD","AE"],"treinamentos":[{"codigo":"NR11_GUINDAUTO","nome":"Operação Segura de Guindauto","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"},{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"}]},{"atividade_codigo":"LINHA_AMARELA_TERRAPLENAGEM","atividade_nome":"Linha Amarela / Terraplenagem","exige_cnh":"SIM","categorias_aceitas":["C","D","E","AC","AD","AE"],"treinamentos":[{"codigo":"NR11_NR12_LINHA_AMARELA","nome":"Operação Segura de Máquinas Pesadas","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"},{"codigo":"DIR_DEFENSIVA","nome":"Direção Defensiva / Preventiva em Obras","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"}]},{"atividade_codigo":"MOV_CARGA_EMPILHADEIRA","atividade_nome":"Empilhadeira / Manipulador Telescópico","exige_cnh":"SIM","categorias_aceitas":["B","C","D","E","AB","AC","AD","AE"],"treinamentos":[{"codigo":"NR11_EMPILHADEIRA","nome":"Operação Segura de Empilhadeira","status_aplicabilidade":"OBRIGATORIO","exige_validade":"SIM"}]}]$json$::jsonb $matriz$;
REVOKE ALL ON FUNCTION app_private.matriz_sst_condutores_aprovada() FROM PUBLIC, anon, authenticated;
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
    v_modelo jsonb;
    v_aprovador_uid text;
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
            -- Nova avaliação: a aprovação será reconhecida somente pelo catálogo canônico do servidor;
            -- rejeita qualquer tentativa do cliente de injetar regra_aprovada = true ou histórico falso.
            IF (v_av->>'regra_aprovada')::boolean IS TRUE THEN
                RAISE EXCEPTION 'APROVACAO_REGRA_NAO_AUTORIZADA: A aprovação é atribuída pelo servidor; não pode ser enviada pelo cliente.'
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
        SELECT value INTO v_modelo FROM jsonb_array_elements(app_private.matriz_sst_condutores_aprovada())
          WHERE app_private.assinatura_requisitos_avaliacao(value) = app_private.assinatura_requisitos_avaliacao(v_av_protegida);
        IF v_modelo IS NOT NULL THEN
            -- Reciclagem INTERNA de 24 meses aprovada para Direção Defensiva e NR-11/NR-12.
            -- Outros cursos conservam validade indefinida para avaliação técnica específica.
            FOR v_trein IN SELECT value FROM jsonb_array_elements(v_av_protegida->'treinamentos') LOOP
                IF (v_trein->>'codigo' = 'DIR_DEFENSIVA' OR v_trein->>'codigo' LIKE 'NR11%')
                   AND NULLIF(v_trein->>'data_realizacao','') IS NOT NULL
                   AND NULLIF(v_trein->>'validade','') IS NOT NULL
                   AND (v_trein->>'validade')::date > ((v_trein->>'data_realizacao')::date + interval '24 months')::date THEN
                    RAISE EXCEPTION 'MATRIZ_SST: Validade supera a reciclagem interna aprovada de 24 meses.' USING ERRCODE='22023';
                END IF;
            END LOOP;
            SELECT min(to_jsonb(pu)->>'auth_user_id') INTO v_aprovador_uid FROM public.painel_usuarios pu
              WHERE btrim(pu.matricula) = '76'
              HAVING count(*) = 1;
            IF NULLIF(v_aprovador_uid, '') IS NULL THEN
                RAISE EXCEPTION 'MATRIZ_SST: Vínculo único do aprovador João (matrícula 76) não confirmado.' USING ERRCODE='22023';
            END IF;
            v_av_protegida := v_av_protegida || jsonb_build_object(
                'regra_aprovada', true, 'regra_versao', 'MATRIZ-SST-JOAO-20261109-v1',
                'regra_aprovada_por_uid', v_aprovador_uid, 'regra_aprovada_por_nome', 'João Everton',
                'regra_aprovada_em', '2026-11-09', 'regra_aprovacao_ref', 'Aprovação expressa de João na sessão CNH');
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

COMMIT;
