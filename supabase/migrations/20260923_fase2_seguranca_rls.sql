-- ============================================================
-- MIGRAÇÃO FASE 2: SEGURANÇA, GESTÃO DE SENHAS, RLS E PROTEÇÃO LGPD
-- Consórcio Operador do PISF — Ramal do Agreste
-- Data: 2026-09-23
-- ============================================================

-- 1. FUNÇÃO RPC: Redefinição de Senha por Administrador
-- Permite que um Administrador ativo redefina a senha de qualquer colaborador
-- diretamente pelo Painel Gerencial (sem depender de e-mail OTP do Resend).
-- Valida credenciais do chamador (p_admin_senha aceita hash bcrypt ou texto puro).
CREATE OR REPLACE FUNCTION public.redefinir_senha_por_admin(
    p_admin_matricula text,
    p_admin_senha text,
    p_target_id text,
    p_nova_senha text
)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_admin_row colaboradores_checklist%ROWTYPE;
    v_admin_ok boolean := false;
    v_nova_hash text;
BEGIN
    SELECT * INTO v_admin_row FROM colaboradores_checklist c
    WHERE upper(c.matricula) = upper(p_admin_matricula)
      AND c.nivel_acesso ILIKE 'admin%'
      AND c.ativo IS NOT FALSE
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não autorizado: administrador não encontrado ou inativo';
    END IF;

    IF p_admin_senha LIKE '$2%' THEN
        v_admin_ok := (v_admin_row.senha = p_admin_senha);
    ELSE
        v_admin_ok := (crypt(p_admin_senha, v_admin_row.senha) = v_admin_row.senha);
    END IF;

    IF NOT v_admin_ok THEN
        RAISE EXCEPTION 'Não autorizado: senha do administrador incorreta';
    END IF;

    IF p_nova_senha IS NULL OR trim(p_nova_senha) = '' THEN
        RAISE EXCEPTION 'A nova senha não pode ser vazia';
    END IF;

    v_nova_hash := crypt(p_nova_senha, gen_salt('bf', 10));

    UPDATE colaboradores_checklist
    SET senha = v_nova_hash
    WHERE id = upper(trim(p_target_id)) OR matricula = trim(p_target_id);

    RETURN v_nova_hash;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.redefinir_senha_por_admin(text, text, text, text) TO anon, authenticated;

-- 2. PROTEÇÃO DE DADOS PESSOAIS DO EFETIVO (LGPD)
-- O App de campo (celular) só precisa de id, nome, funcao, setor, status.
-- Colunas sensíveis (CPF, RG, Data de Nascimento, tamanhos) ficam protegidas para o papel authenticated.
REVOKE ALL ON public.colaboradores_efetivo FROM anon;
GRANT SELECT (id, nome, funcao, setor, status) ON public.colaboradores_efetivo TO anon;
GRANT ALL ON public.colaboradores_efetivo TO authenticated;
GRANT ALL ON public.colaboradores_efetivo TO service_role;

-- 3. BLINDAGEM DE RLS NAS TABELAS GERENCIAIS DO DASHBOARD

-- Atestados Ocupacionais (Saúde / PCMSO)
ALTER TABLE public.atestados_ocupacionais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos atestados ocupacionais" ON public.atestados_ocupacionais;
DROP POLICY IF EXISTS "Acesso restrito autenticados atestados" ON public.atestados_ocupacionais;
CREATE POLICY "Acesso restrito autenticados atestados" ON public.atestados_ocupacionais
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Avaliações Psicossociais (NR-01 / COPSOQ II)
ALTER TABLE public.avaliacoes_psicossociais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais" ON public.avaliacoes_psicossociais;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial" ON public.avaliacoes_psicossociais;
CREATE POLICY "Acesso restrito autenticados psicossocial" ON public.avaliacoes_psicossociais
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.avaliacoes_psicossociais_escalas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais escalas" ON public.avaliacoes_psicossociais_escalas;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial escalas" ON public.avaliacoes_psicossociais_escalas;
CREATE POLICY "Acesso restrito autenticados psicossocial escalas" ON public.avaliacoes_psicossociais_escalas
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.avaliacoes_psicossociais_perguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais perguntas" ON public.avaliacoes_psicossociais_perguntas;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial perguntas" ON public.avaliacoes_psicossociais_perguntas;
CREATE POLICY "Acesso restrito autenticados psicossocial perguntas" ON public.avaliacoes_psicossociais_perguntas
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- CIPA (Comissão Interna de Prevenção de Acidentes)
ALTER TABLE public.cipa_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos membros da CIPA" ON public.cipa_membros;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa membros" ON public.cipa_membros;
CREATE POLICY "Acesso restrito autenticados cipa membros" ON public.cipa_membros
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.cipa_reunioes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total às reuniões da CIPA" ON public.cipa_reunioes;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa reunioes" ON public.cipa_reunioes;
CREATE POLICY "Acesso restrito autenticados cipa reunioes" ON public.cipa_reunioes
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.cipa_plano_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao plano de ação da CIPA" ON public.cipa_plano_acao;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa plano" ON public.cipa_plano_acao;
CREATE POLICY "Acesso restrito autenticados cipa plano" ON public.cipa_plano_acao
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Brigada de Incêndio
ALTER TABLE public.brigada_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a brigada_membros" ON public.brigada_membros;
DROP POLICY IF EXISTS "Acesso restrito autenticados brigada" ON public.brigada_membros;
CREATE POLICY "Acesso restrito autenticados brigada" ON public.brigada_membros
    FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Log de Auditoria
-- Leitura apenas para usuários autenticados; Inserção liberada para anon e authenticated para manter registros de campo
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Leitura pública audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Inserção pública audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Inserção audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Leitura autenticada audit log" ON public.audit_log;

CREATE POLICY "Inserção audit log" ON public.audit_log
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Leitura autenticada audit log" ON public.audit_log
    FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
