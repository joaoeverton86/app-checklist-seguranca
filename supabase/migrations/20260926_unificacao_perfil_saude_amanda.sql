-- ================================================================
-- UNIFICAÇÃO DE CADASTRO E PERMISSIBILIDADE GRANULAR (PERFIL SAÚDE)
-- Garante matrícula 98 vinculada ao perfil de Saúde (Amanda Freire),
-- com visualização completa de todos os módulos e edição restrita à Saúde.
-- ================================================================

-- 1. Suporte a matrícula na gestão de usuários do painel
ALTER TABLE public.painel_usuarios 
ADD COLUMN IF NOT EXISTS matricula TEXT;

-- 2. Suporte a permissão granular em perfis (ver todos + restringir edição)
ALTER TABLE public.painel_perfis 
ADD COLUMN IF NOT EXISTS ver_todos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS modulos_edicao TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Atualização do perfil 'modulo_saude' para Ver Todos + Editar apenas Saúde
UPDATE public.painel_perfis 
SET ver_todos = true,
    modulos_edicao = ARRAY['saude']::TEXT[],
    descricao = 'Visualiza todos os módulos do painel, com permissão de edição restrita exclusivamente a Saúde Ocupacional'
WHERE id = 'modulo_saude';

-- 4. Vínculo da Matrícula 98 ao usuário Amanda no painel
UPDATE public.painel_usuarios 
SET matricula = '98',
    email = 'amanda.freire@coppisf.com.br'
WHERE email ILIKE '%amanda%' OR auth_user_id = '6ec401d0-8f00-480e-83ec-33ec3b0ec3e2';

-- 5. Atualização cadastral da Amanda em colaboradores_checklist
UPDATE public.colaboradores_checklist
SET email = 'amanda.freire@coppisf.com.br',
    funcao = 'TEC. ENFERMEIRO DO TRABALHO',
    setor = 'SESMT'
WHERE id = '98' OR matricula = '98';
