-- Ativação autorizada por João em 11/11/2026; corpo validado no laboratório local.
-- Requer a função existente public.usuario_e_super_admin() e RLS/grants atuais.
-- Não altera RLS, grants das tabelas, login, app offline ou outros fluxos de status.
CREATE FUNCTION public.alterar_status_colaborador_atomico(
    p_id text,
    p_ativo_esperado boolean,
    p_ativo_novo boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $func$
DECLARE
    v_atual boolean;
    v_tem_efetivo boolean;
    v_demissao date;
    v_status text;
    v_linhas integer;
BEGIN
    IF auth.uid() IS NULL OR public.usuario_e_super_admin() IS NOT TRUE THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Esta alteração exige o responsável autorizado do painel.';
    END IF;
    IF p_id IS NULL OR btrim(p_id) = ''
       OR p_ativo_esperado IS NULL OR p_ativo_novo IS NULL
       OR p_ativo_novo = p_ativo_esperado THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Parâmetros de alteração de status inválidos.';
    END IF;

    -- Ordem única de bloqueio neste RPC: Checklist, depois Efetivo.
    SELECT c.ativo INTO v_atual
      FROM public.colaboradores_checklist c WHERE c.id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Colaborador não encontrado ou indisponível para alteração.';
    END IF;
    -- A UI considera ativo todo cadastro cujo ativo não seja false (inclusive legado NULL).
    IF coalesce(v_atual, true) IS DISTINCT FROM p_ativo_esperado THEN
        RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='O status mudou em outra operação. Recarregue antes de continuar.';
    END IF;

    -- Separar existência visível de bloqueio: RLS de UPDATE não pode ser confundida
    -- com ausência no Efetivo. A publicação exige leitura completa das duas tabelas
    -- para este responsável, conforme o mapeamento de permissões.
    SELECT EXISTS(SELECT 1 FROM public.colaboradores_efetivo e WHERE e.id=p_id) INTO v_tem_efetivo;
    IF v_tem_efetivo THEN
        SELECT e.dt_demissao INTO v_demissao
          FROM public.colaboradores_efetivo e WHERE e.id=p_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Não foi possível bloquear o Efetivo para sincronização.';
        END IF;
        -- Preservar a regra atual do fluxo de acesso; não alterar datas de demissão.
        v_status := CASE WHEN p_ativo_novo THEN 'ATIVO'
                         WHEN v_demissao IS NOT NULL THEN 'DEMITIDO' ELSE 'INATIVO' END;
    END IF;

    UPDATE public.colaboradores_checklist SET ativo=p_ativo_novo WHERE id=p_id;
    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    IF v_linhas <> 1 THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Checklist não atualizado; operação cancelada.';
    END IF;
    IF v_tem_efetivo THEN
        UPDATE public.colaboradores_efetivo SET status=v_status WHERE id=p_id;
        GET DIAGNOSTICS v_linhas = ROW_COUNT;
        IF v_linhas <> 1 THEN
            RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Efetivo não atualizado; operação cancelada.';
        END IF;
    END IF;
    RETURN jsonb_build_object('id',p_id,'ativo',p_ativo_novo,
        'efetivo_presente',v_tem_efetivo,'efetivo_status',v_status);
END;
$func$;

REVOKE ALL ON FUNCTION public.alterar_status_colaborador_atomico(text,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_status_colaborador_atomico(text,boolean,boolean) TO authenticated;
-- A exceção aborta a transação do pedido inteiro; não capturar e ocultar falhas aqui.

NOTIFY pgrst, 'reload schema';
