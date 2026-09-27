-- ==============================================================================
-- MIGRAÇÃO: MÓDULO OFICIAL DE PLANO DE AÇÃO 5W2H DO PGR (NR-01)
-- Centraliza e unifica não conformidades de checklists, extintores, relatos de campo,
-- ergonomia (NR-17), CIPA (NR-05), acidentes e auditorias do canteiro Ramal do Agreste.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pgr_plano_acao (
    id TEXT PRIMARY KEY,
    origem_tipo TEXT NOT NULL DEFAULT 'manual', -- 'checklist' | 'extintor' | 'relato' | 'ergonomia' | 'cipa' | 'acidente' | 'auditoria' | 'manual'
    origem_id TEXT,                         -- ID do registro original
    origem_rotulo TEXT,                     -- Descrição legível da origem
    
    -- Metodologia 5W2H (NR-01)
    what_acao TEXT NOT NULL,                -- O que será feito
    why_motivo TEXT,                        -- Por que será feito (Perigo/Risco/Não Conformidade)
    where_local TEXT,                       -- Onde será feito (Setor/Frente/Equipamento)
    who_responsavel TEXT NOT NULL,          -- Quem executará
    when_prazo DATE NOT NULL,               -- Prazo limite
    how_metodo TEXT,                        -- Como será executado
    how_much_custo NUMERIC(12,2) DEFAULT 0, -- Custo estimado (R$)
    
    -- Gestão, Severidade e Eficácia (NR-01 item 1.5.5.2)
    grau_prioridade TEXT DEFAULT 'media',   -- 'baixa' | 'media' | 'alta' | 'critica'
    status TEXT DEFAULT 'aberta',           -- 'aberta' | 'em_andamento' | 'validacao' | 'concluida' | 'cancelada'
    data_conclusao DATE,
    evidencia_conclusao TEXT,
    afericao_eficacia TEXT DEFAULT 'pendente', -- 'pendente' | 'eficaz' | 'parcial' | 'ineficaz'
    obs_eficacia TEXT,
    
    -- Auditoria
    criado_por_matricula TEXT,
    criado_por_nome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas ultrarrápidas no Dashboard
CREATE INDEX IF NOT EXISTS idx_pgr_plano_acao_status ON public.pgr_plano_acao(status);
CREATE INDEX IF NOT EXISTS idx_pgr_plano_acao_prazo ON public.pgr_plano_acao(when_prazo);
CREATE INDEX IF NOT EXISTS idx_pgr_plano_acao_origem ON public.pgr_plano_acao(origem_tipo);

-- Permissões e RLS
ALTER TABLE public.pgr_plano_acao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total pgr_plano_acao" ON public.pgr_plano_acao;
CREATE POLICY "Acesso total pgr_plano_acao" ON public.pgr_plano_acao
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.pgr_plano_acao TO anon, authenticated;
