-- Aplicado com autorização expressa de João na publicação CNH de 10/11/2026 (UTC).
-- Reexecução idempotente não sobrescreve vínculos existentes.
-- Impacto: um perfil exclusivo CNH e um vínculo de João no painel, sem alterar
-- perfis existentes, outras contas, Auth, políticas RLS ou dados do campo.
BEGIN;
DO $vinculo$
DECLARE
    v_colab public.colaboradores_checklist%ROWTYPE;
    v_perfil text := 'admin_condutores_cnh';
    v_n integer;
BEGIN
    SELECT count(*) INTO v_n FROM public.colaboradores_checklist
      WHERE matricula='76' OR id='76';
    IF v_n <> 1 THEN RAISE EXCEPTION 'Vínculo 76 ausente ou ambíguo'; END IF;
    SELECT * INTO STRICT v_colab FROM public.colaboradores_checklist
      WHERE matricula='76' OR id='76';
    IF v_colab.ativo IS NOT TRUE OR v_colab.auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Conta ativa e Auth explícito são obrigatórios';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=v_colab.auth_user_id
        AND lower(u.email)=lower(v_colab.email)) THEN
        RAISE EXCEPTION 'Auth e email não correspondem ao cadastro de João';
    END IF;
    SELECT count(*) INTO v_n FROM public.painel_usuarios pu
      WHERE pu.auth_user_id=v_colab.auth_user_id OR pu.matricula='76'
         OR lower(pu.email)=lower(v_colab.email);
    IF v_n > 0 THEN
        IF v_n=1 AND EXISTS(SELECT 1 FROM public.painel_usuarios pu
             JOIN public.painel_perfis pp ON pp.id=pu.perfil_id
             WHERE pu.auth_user_id=v_colab.auth_user_id AND pu.matricula='76'
               AND pu.ativo IS TRUE AND pp.ativo IS TRUE
               AND 'gestao_de_condutores'=ANY(pp.modulos_edicao)
               AND (pp.ver_todos IS TRUE OR 'gestao_de_condutores'=ANY(pp.modulos))) THEN
            RETURN; -- Já habilitado; não alterar dados existentes.
        END IF;
        RAISE EXCEPTION 'Registro existente requer revisão; nenhuma sobrescrita automática';
    END IF;
    IF EXISTS(SELECT 1 FROM public.painel_perfis WHERE id=v_perfil) THEN
        RAISE EXCEPTION 'Perfil de destino já existe; revisar antes de continuar';
    END IF;
    INSERT INTO public.painel_perfis(id,nome,ativo,ver_todos,modulos,modulos_edicao)
      VALUES(v_perfil,'Admin',true,false,ARRAY['gestao_de_condutores'],ARRAY['gestao_de_condutores']);
    INSERT INTO public.painel_usuarios(id,auth_user_id,nome,email,perfil_id,ativo,matricula)
      VALUES(gen_random_uuid(),v_colab.auth_user_id,v_colab.nome,v_colab.email,v_perfil,true,'76');
END;
$vinculo$;
COMMIT;
