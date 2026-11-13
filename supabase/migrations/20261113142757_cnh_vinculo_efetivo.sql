-- Aplicar antes do frontend CNH301.8. Nenhum legado é vinculado automaticamente.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.gestao_de_condutores_cnh
  ADD COLUMN efetivo_id text REFERENCES public.colaboradores_efetivo(id) ON DELETE RESTRICT,
  ADD CONSTRAINT cnh_vinculo_somente_proprio CHECK (efetivo_id IS NULL OR vinculo = 'PROPRIO');
CREATE UNIQUE INDEX cnh_efetivo_unico ON public.gestao_de_condutores_cnh(efetivo_id) WHERE efetivo_id IS NOT NULL;

CREATE FUNCTION public.vincular_condutor_efetivo(p_condutor_id uuid, p_versao_esperada integer, p_efetivo_id text)
RETURNS public.gestao_de_condutores_cnh
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, app_private
AS $$
DECLARE
  v_ident record;
  v_atual public.gestao_de_condutores_cnh%ROWTYPE;
  v_pessoa public.colaboradores_efetivo%ROWTYPE;
  v_id text := nullif(btrim(p_efetivo_id), '');
BEGIN
  SELECT * INTO v_ident FROM app_private.resolver_identidade_condutores_cnh() LIMIT 1;
  IF v_ident.autorizado_escrita IS NOT TRUE THEN
    RAISE EXCEPTION 'ACESSO_NEGADO' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_atual FROM public.gestao_de_condutores_cnh WHERE id = p_condutor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condutor não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF p_versao_esperada IS NULL OR p_versao_esperada <> v_atual.versao THEN
    RAISE EXCEPTION 'CONFLITO_CONCORRENCIA: recarregue o cadastro' USING ERRCODE = '40001';
  END IF;
  IF v_atual.vinculo <> 'PROPRIO' THEN
    RAISE EXCEPTION 'Somente próprios podem ter vínculo com o Efetivo' USING ERRCODE = '22023';
  END IF;
  IF v_id IS NOT NULL THEN
    SELECT * INTO v_pessoa FROM public.colaboradores_efetivo WHERE id = v_id FOR SHARE;
    IF NOT FOUND OR upper(btrim(coalesce(v_pessoa.status,''))) <> 'ATIVO' OR v_pessoa.dt_demissao IS NOT NULL THEN
      RAISE EXCEPTION 'Selecione uma pessoa ativa do Efetivo' USING ERRCODE = '22023';
    END IF;
  END IF;
  UPDATE public.gestao_de_condutores_cnh SET
    efetivo_id = v_id,
    versao = versao + 1,
    updated_at = now(), updated_by_uid = v_ident.usuario_uid, updated_by_nome = v_ident.usuario_nome,
    historico_eventos = historico_eventos || jsonb_build_array(jsonb_build_object(
      'evento_id', gen_random_uuid()::text, 'tipo', 'VINCULO_EFETIVO',
      'em', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'responsavel_uid', v_ident.usuario_uid::text, 'responsavel_nome', v_ident.usuario_nome,
      'efetivo_id_anterior', v_atual.efetivo_id, 'efetivo_id', v_id))
  WHERE id = p_condutor_id RETURNING * INTO v_atual;
  RETURN v_atual;
END;
$$;
REVOKE ALL ON FUNCTION public.vincular_condutor_efetivo(uuid,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_condutor_efetivo(uuid,integer,text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
