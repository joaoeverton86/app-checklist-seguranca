-- ============================================================
-- SCHEMA DDL - SUPABASE (POSTGRESQL) PARA APP CHECKLIST DE SEGURANÇA
-- Cole este script no SQL Editor do seu projeto Supabase e clique em RUN
-- ============================================================

-- 1. Tabela de Cadastros (Equipamentos / Veículos / Ativos)
CREATE TABLE IF NOT EXISTS public.cadastros (
    id TEXT PRIMARY KEY,
    tipo TEXT,
    categoria TEXT,
    nome TEXT,
    patrimonio TEXT,
    empresa TEXT,
    setor TEXT,
    obs TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Colaboradores (Usuários / Operadores / Técnicos)
CREATE TABLE IF NOT EXISTS public.colaboradores_checklist (
    id TEXT PRIMARY KEY,
    nome TEXT,
    funcao TEXT,
    setor TEXT,
    empresa TEXT,
    matricula TEXT,
    validade_aso TEXT,
    ativo BOOLEAN DEFAULT true,
    senha TEXT,
    nivel_acesso TEXT DEFAULT 'Técnico',
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela Principal de Checklists
CREATE TABLE IF NOT EXISTS public.checklists (
    id TEXT PRIMARY KEY,
    date TEXT,
    patrimonio TEXT,
    nome TEXT,
    empresa TEXT,
    operador TEXT,
    observacoes TEXT,
    status_checklist TEXT DEFAULT 'liberado',
    prazo_adequacao TEXT,
    conformes INTEGER DEFAULT 0,
    nao_conformes INTEGER DEFAULT 0,
    na INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    equipment JSONB,
    items JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela Relacional de Não Conformidades (Relacionada diretamente ao Checklist)
CREATE TABLE IF NOT EXISTS public.nao_conformidades (
    id BIGSERIAL PRIMARY KEY,
    checklist_id TEXT REFERENCES public.checklists(id) ON DELETE CASCADE,
    date TEXT,
    patrimonio TEXT,
    item_text TEXT,
    nr TEXT,
    risco TEXT DEFAULT 'high',
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Relatos de Problemas / Ocorrências
CREATE TABLE IF NOT EXISTS public.relatos (
    id TEXT PRIMARY KEY,
    date TEXT,
    tipo TEXT,
    identificacao TEXT,
    description TEXT,
    reporter TEXT,
    role TEXT,
    status TEXT DEFAULT 'aberto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Itens Personalizados de Checklist por Equipamento
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id TEXT PRIMARY KEY,
    id_equipamento TEXT,
    nome_equipamento TEXT,
    icone_equipamento TEXT,
    categoria_equipamento TEXT,
    texto_item TEXT,
    nr TEXT,
    risco TEXT DEFAULT 'medium',
    secao TEXT,
    ordem INTEGER,
    ativo TEXT DEFAULT 'Sim',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) permissivo para o App (Leitura/Escrita via Anon API Key)
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos cadastros" ON public.cadastros;
DROP POLICY IF EXISTS "Acesso total aos colaboradores" ON public.colaboradores_checklist;
DROP POLICY IF EXISTS "Acesso total aos checklists" ON public.checklists;
DROP POLICY IF EXISTS "Acesso total às não conformidades" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Acesso total aos relatos" ON public.relatos;
DROP POLICY IF EXISTS "Acesso total aos itens de checklist" ON public.checklist_items;

CREATE POLICY "Acesso total aos cadastros" ON public.cadastros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total aos colaboradores" ON public.colaboradores_checklist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total aos checklists" ON public.checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total às não conformidades" ON public.nao_conformidades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total aos relatos" ON public.relatos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total aos itens de checklist" ON public.checklist_items FOR ALL USING (true) WITH CHECK (true);

-- Permissões públicas para a API REST anon
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
