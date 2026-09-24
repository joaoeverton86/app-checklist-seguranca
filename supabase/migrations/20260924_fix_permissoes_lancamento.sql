-- ============================================================
-- CORREÇÃO EMERGENCIAL DE PERMISSÕES — APP CHECKLIST SEGURANÇA
-- Data: 2026-09-24
-- Objetivo: Restaurar permissão de lançamento e leitura para colaboradores
-- internos (Natan, Amanda, etc.) que usam login por Matrícula/Senha (anon key),
-- sem comprometer a segurança de senhas de colaboradores_checklist.
-- ============================================================

-- 1. Restaurar acesso total à tabela colaboradores_efetivo (usada em todos os módulos para buscar nomes, equipes e cargos)
GRANT ALL ON public.colaboradores_efetivo TO anon, authenticated;
ALTER TABLE public.colaboradores_efetivo DISABLE ROW LEVEL SECURITY;

-- 2. Restaurar acesso às tabelas operacionais bloqueadas pelo RLS
-- Atestados Ocupacionais
ALTER TABLE public.atestados_ocupacionais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados atestados" ON public.atestados_ocupacionais;
DROP POLICY IF EXISTS "Acesso total aos atestados ocupacionais" ON public.atestados_ocupacionais;
CREATE POLICY "Acesso total aos atestados ocupacionais" ON public.atestados_ocupacionais
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.atestados_ocupacionais TO anon, authenticated;

-- Avaliações Psicossociais
ALTER TABLE public.avaliacoes_psicossociais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial" ON public.avaliacoes_psicossociais;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais" ON public.avaliacoes_psicossociais;
CREATE POLICY "Acesso total a avaliacoes psicossociais" ON public.avaliacoes_psicossociais
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais TO anon, authenticated;

ALTER TABLE public.avaliacoes_psicossociais_escalas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial escalas" ON public.avaliacoes_psicossociais_escalas;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais escalas" ON public.avaliacoes_psicossociais_escalas;
CREATE POLICY "Acesso total a avaliacoes psicossociais escalas" ON public.avaliacoes_psicossociais_escalas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais_escalas TO anon, authenticated;

ALTER TABLE public.avaliacoes_psicossociais_perguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados psicossocial perguntas" ON public.avaliacoes_psicossociais_perguntas;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais perguntas" ON public.avaliacoes_psicossociais_perguntas;
CREATE POLICY "Acesso total a avaliacoes psicossociais perguntas" ON public.avaliacoes_psicossociais_perguntas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais_perguntas TO anon, authenticated;

-- CIPA (Comissão Interna de Prevenção de Acidentes)
ALTER TABLE public.cipa_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa membros" ON public.cipa_membros;
DROP POLICY IF EXISTS "Acesso total aos membros da CIPA" ON public.cipa_membros;
CREATE POLICY "Acesso total aos membros da CIPA" ON public.cipa_membros
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_membros TO anon, authenticated;

ALTER TABLE public.cipa_reunioes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa reunioes" ON public.cipa_reunioes;
DROP POLICY IF EXISTS "Acesso total às reuniões da CIPA" ON public.cipa_reunioes;
CREATE POLICY "Acesso total às reuniões da CIPA" ON public.cipa_reunioes
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_reunioes TO anon, authenticated;

ALTER TABLE public.cipa_plano_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados cipa plano" ON public.cipa_plano_acao;
DROP POLICY IF EXISTS "Acesso total ao plano de ação da CIPA" ON public.cipa_plano_acao;
CREATE POLICY "Acesso total ao plano de ação da CIPA" ON public.cipa_plano_acao
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_plano_acao TO anon, authenticated;

-- Brigada de Incêndio
ALTER TABLE public.brigada_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados brigada" ON public.brigada_membros;
DROP POLICY IF EXISTS "Acesso total a brigada_membros" ON public.brigada_membros;
CREATE POLICY "Acesso total a brigada_membros" ON public.brigada_membros
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.brigada_membros TO anon, authenticated;

-- APR (Análise Preliminar de Risco)
ALTER TABLE public.apr_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso restrito autenticados apr" ON public.apr_registros;
DROP POLICY IF EXISTS "Acesso total a registros de APR" ON public.apr_registros;
CREATE POLICY "Acesso total a registros de APR" ON public.apr_registros
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.apr_registros TO anon, authenticated;

-- GHE / Matriz de Risco
ALTER TABLE public.ghe_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao catálogo de GHE" ON public.ghe_catalogo;
CREATE POLICY "Acesso total ao catálogo de GHE" ON public.ghe_catalogo
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.ghe_catalogo TO anon, authenticated;

-- Acidentes
ALTER TABLE public.acidentes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos acidentes" ON public.acidentes;
CREATE POLICY "Acesso total aos acidentes" ON public.acidentes
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.acidentes TO anon, authenticated;

-- ASO Exames
ALTER TABLE public.aso_exames ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos exames ASO" ON public.aso_exames;
CREATE POLICY "Acesso total aos exames ASO" ON public.aso_exames
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.aso_exames TO anon, authenticated;
