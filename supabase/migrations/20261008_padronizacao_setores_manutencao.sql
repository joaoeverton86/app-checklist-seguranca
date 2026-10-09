-- ==============================================================================
-- Migração: Padronização de Setores de Manutenção (Civil, Mecânica, Elétrica)
-- Tabelas afetadas: public.colaboradores_efetivo e public.epi_entregas
-- Objetivo: Eliminar duplicidades sinônimas nos relatórios de EPI e almoxarifado
-- ==============================================================================

-- Padronização da Manutenção Civil
UPDATE public.colaboradores_efetivo 
SET setor = 'MANUTENÇÃO CIVIL' 
WHERE UPPER(TRIM(setor)) IN ('CIVIL', 'MANUTENCAO CIVIL');

UPDATE public.epi_entregas 
SET setor = 'MANUTENÇÃO CIVIL' 
WHERE UPPER(TRIM(setor)) IN ('CIVIL', 'MANUTENCAO CIVIL');

-- Padronização da Manutenção Mecânica
UPDATE public.colaboradores_efetivo 
SET setor = 'MANUTENÇÃO MECÂNICA' 
WHERE UPPER(TRIM(setor)) IN ('ELETROMECÂNICA', 'ELETROMECANICA', 'MANUTENCAO MECANICA', 'MECÂNICA', 'MECANICA');

UPDATE public.epi_entregas 
SET setor = 'MANUTENÇÃO MECÂNICA' 
WHERE UPPER(TRIM(setor)) IN ('ELETROMECÂNICA', 'ELETROMECANICA', 'MANUTENCAO MECANICA', 'MECÂNICA', 'MECANICA');

-- Padronização da Manutenção Elétrica
UPDATE public.colaboradores_efetivo 
SET setor = 'MANUTENÇÃO ELÉTRICA' 
WHERE UPPER(TRIM(setor)) IN ('ELÉTRICA', 'ELETRICA', 'MANUTENCAO ELETRICA');

UPDATE public.epi_entregas 
SET setor = 'MANUTENÇÃO ELÉTRICA' 
WHERE UPPER(TRIM(setor)) IN ('ELÉTRICA', 'ELETRICA', 'MANUTENCAO ELETRICA');
