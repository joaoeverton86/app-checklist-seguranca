-- ============================================================
-- MIGRAÇÃO: Módulo EPI - Custos, Tabela de Entradas e Inteligência de Estoque
-- Data: 2026-09-25
-- ============================================================

-- 1. Campos adicionais no catálogo de EPI
ALTER TABLE public.epi_catalogo ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10,2);
ALTER TABLE public.epi_catalogo ADD COLUMN IF NOT EXISTS modelo_base TEXT;

-- 2. Tabela de histórico de compras / entradas no almoxarifado
CREATE TABLE IF NOT EXISTS public.epi_entradas (
    id TEXT PRIMARY KEY,
    epi_catalogo_id TEXT REFERENCES public.epi_catalogo(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL,
    data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
    nota_fiscal TEXT,
    fornecedor TEXT,
    custo_unitario NUMERIC(10,2),
    valor_total NUMERIC(10,2),
    observacoes TEXT,
    registrado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS e permissões para epi_entradas
ALTER TABLE public.epi_entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a epi_entradas" ON public.epi_entradas;
CREATE POLICY "Acesso total a epi_entradas" ON public.epi_entradas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.epi_entradas TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_epi_entradas_catalogo ON public.epi_entradas(epi_catalogo_id);
CREATE INDEX IF NOT EXISTS idx_epi_entradas_data ON public.epi_entradas(data_entrada);

-- 3. Atualizar custos unitários com base na cotação oficial Neobetel (10/08/2026)
UPDATE public.epi_catalogo SET custo_unitario = 118.80 WHERE ca = '42330';
UPDATE public.epi_catalogo SET custo_unitario = 73.70 WHERE ca = '52380';
UPDATE public.epi_catalogo SET custo_unitario = 13.80 WHERE ca = '16475';
UPDATE public.epi_catalogo SET custo_unitario = 2.79 WHERE ca = '29014';
UPDATE public.epi_catalogo SET custo_unitario = 2.40 WHERE ca = '37931';
UPDATE public.epi_catalogo SET custo_unitario = 8.97 WHERE ca = '25313';
UPDATE public.epi_catalogo SET custo_unitario = 19.90 WHERE ca = '10258';
UPDATE public.epi_catalogo SET custo_unitario = 3.95 WHERE ca = '9722';
UPDATE public.epi_catalogo SET custo_unitario = 18.45 WHERE id = '93';
UPDATE public.epi_catalogo SET custo_unitario = 118.80 WHERE ca = '48413' AND custo_unitario IS NULL;

-- 4. Registrar as entradas do pedido aprovado em 10/08/2026 (Orçamento Neobetel 17.0131260-A)
INSERT INTO public.epi_entradas (id, epi_catalogo_id, quantidade, data_entrada, nota_fiscal, fornecedor, custo_unitario, valor_total, observacoes, registrado_por)
VALUES
    ('ENT_NEOBETEL_20260810_144', '144', 140, '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 13.80, 1932.00, 'Luva Mista Vaqueta Valcan VM300 M', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_81',  '81',  20,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 2.79,  55.80,   'Luva Nylon PU Flextactil Danny G', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_82',  '82',  15,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 2.40,  36.00,   'Luva Malha Pigmentada Omega', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_104', '104', 20,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 8.97,  179.40,  'Luva Nitrílica Nitrasolv Danny G', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_93',  '93',  30,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 18.45, 553.50,  'Protetor Solar Nutriex 120ml FPS 60', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_89',  '89',  40,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 19.90, 796.00,  'Perneira Bidim 3 Talas Indart', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_118', '118', 50,  '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 3.95,  197.50,  'Óculos Cinza Danny Fênix', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_12',  '12',  6,   '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 118.80, 712.80, 'Botina Fujiwara Bico Comp. Nº 40', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_13',  '13',  6,   '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 118.80, 712.80, 'Botina Fujiwara Bico Comp. Nº 41', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_14',  '14',  8,   '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 118.80, 950.40, 'Botina Fujiwara Bico Comp. Nº 42', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_15',  '15',  8,   '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 118.80, 950.40, 'Botina Fujiwara Bico Comp. Nº 43', 'Carlos Alberto (Compras)'),
    ('ENT_NEOBETEL_20260810_169', '169', 2,   '2026-08-10', 'ORC-17.0131260-A', 'NEOBETEL EPI', 73.70, 147.40,  'Sapato EVA Moov Flex Bracol Nº 37', 'Carlos Alberto (Compras)')
ON CONFLICT (id) DO UPDATE SET
    quantidade = EXCLUDED.quantidade,
    custo_unitario = EXCLUDED.custo_unitario,
    valor_total = EXCLUDED.valor_total;
