-- ==============================================================================
-- MIGRAÇÃO: CONTROLE E RASTREABILIDADE DE ORDENS DE SERVIÇO (NR-01)
-- Rastreia o status de entrega e assinatura das OSs por função para cada colaborador
-- do quadro de efetivo do Consórcio COP Ramal do Agreste.
-- ==============================================================================

-- 1. Adicionar colunas de controle direto em colaboradores_efetivo
ALTER TABLE public.colaboradores_efetivo
    ADD COLUMN IF NOT EXISTS os_status TEXT DEFAULT 'pendente',
    ADD COLUMN IF NOT EXISTS os_data_entrega DATE,
    ADD COLUMN IF NOT EXISTS os_versao TEXT DEFAULT 'Rev. 00',
    ADD COLUMN IF NOT EXISTS os_anexo_url TEXT,
    ADD COLUMN IF NOT EXISTS os_obs TEXT;

-- 2. Tabela de histórico e controle de entregas de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico_entregas (
    id TEXT PRIMARY KEY,
    matricula TEXT NOT NULL,
    nome_colaborador TEXT NOT NULL,
    funcao TEXT,
    setor TEXT,
    ghe TEXT,
    data_emissao DATE NOT NULL,
    data_assinatura DATE,
    status TEXT DEFAULT 'pendente', -- 'entregue' | 'pendente'
    tipo_emissao TEXT DEFAULT 'admissional', -- 'admissional' | 'troca_funcao' | 'periodica' | 'atualizacao_pgr'
    versao_os TEXT DEFAULT 'Rev. 00',
    anexo_url TEXT,
    observacoes TEXT,
    entregue_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_entregas_matricula ON public.ordens_servico_entregas(matricula);
CREATE INDEX IF NOT EXISTS idx_os_entregas_status ON public.ordens_servico_entregas(status);
CREATE INDEX IF NOT EXISTS idx_colab_os_status ON public.colaboradores_efetivo(os_status);

-- 3. Permissões e RLS
ALTER TABLE public.ordens_servico_entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ordens_servico_entregas" ON public.ordens_servico_entregas;
CREATE POLICY "Acesso total ordens_servico_entregas" ON public.ordens_servico_entregas
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.ordens_servico_entregas TO anon, authenticated;
