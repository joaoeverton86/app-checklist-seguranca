-- Texto opcional escrito à mão pelo responsável da frente.
-- Fica no mesmo registro da APR. Não entra na lista oficial de riscos.
-- Pode ficar vazio. Não altera política de acesso (RLS) nem concessões.
ALTER TABLE public.apr_registros
    ADD COLUMN IF NOT EXISTS risco_novo_identificado TEXT;
