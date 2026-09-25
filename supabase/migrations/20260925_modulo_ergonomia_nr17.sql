-- ============================================================
-- MÓDULO DE ERGONOMIA (NR-17) - AEP E PLANO DE AÇÃO DE MELHORIAS
-- Data: 2026-09-25
--
-- Atende aos requisitos da NR-17 atualizada (Portaria MTP nº 423/2021)
-- e integração com o PGR (NR-01):
-- 1. Avaliações Ergonômicas Preliminares (AEP) dos postos e funções;
-- 2. Matriz dos 5 fatores de risco (Cargas, Posturas/Repetitividade,
--    Mobiliário, Condições Ambientais, Organização do Trabalho);
-- 3. Identificação de necessidade de AET (Análise Ergonômica do Trabalho);
-- 4. Plano de Ação de Melhorias de Postos de Trabalho (5W2H).
-- ============================================================

-- 1. Tabela de Avaliações Ergonômicas Preliminares (AEP)
CREATE TABLE IF NOT EXISTS public.ergonomia_aep (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    data_avaliacao DATE NOT NULL,
    setor TEXT NOT NULL,
    posto_trabalho TEXT NOT NULL,
    funcao_avaliada TEXT NOT NULL,
    ghe TEXT,
    num_trabalhadores INTEGER DEFAULT 1,
    avaliador_nome TEXT,
    avaliador_registro TEXT,
    
    -- Fatores de Risco NR-17 (baixo, medio, alto) + observações detalhadas
    fator_levantamento_carga TEXT DEFAULT 'baixo',
    obs_levantamento_carga TEXT,
    fator_posturas_repetitividade TEXT DEFAULT 'baixo',
    obs_posturas_repetitividade TEXT,
    fator_mobiliario_equipamentos TEXT DEFAULT 'baixo',
    obs_mobiliario_equipamentos TEXT,
    fator_condicoes_ambientais TEXT DEFAULT 'baixo',
    obs_condicoes_ambientais TEXT,
    fator_organizacao_trabalho TEXT DEFAULT 'baixo',
    obs_organizacao_trabalho TEXT,

    nivel_risco_global TEXT NOT NULL DEFAULT 'baixo', -- 'baixo' | 'medio' | 'alto'
    necessidade_aet BOOLEAN DEFAULT false,
    parecer_conclusivo TEXT,
    status TEXT DEFAULT 'concluida', -- 'em_andamento' | 'concluida' | 'revisao'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para busca ágil
CREATE INDEX IF NOT EXISTS idx_ergonomia_aep_setor ON public.ergonomia_aep(setor);
CREATE INDEX IF NOT EXISTS idx_ergonomia_aep_risco ON public.ergonomia_aep(nivel_risco_global);
CREATE INDEX IF NOT EXISTS idx_ergonomia_aep_data ON public.ergonomia_aep(data_avaliacao DESC);

-- RLS e Permissões para ergonomia_aep
ALTER TABLE public.ergonomia_aep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes ergonomicas aep" ON public.ergonomia_aep;
CREATE POLICY "Acesso total a avaliacoes ergonomicas aep" ON public.ergonomia_aep
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.ergonomia_aep TO anon, authenticated;

-- 2. Tabela do Plano de Ação de Melhorias Ergonômicas (5W2H)
CREATE TABLE IF NOT EXISTS public.ergonomia_plano_acao (
    id TEXT PRIMARY KEY,
    aep_id TEXT REFERENCES public.ergonomia_aep(id) ON DELETE CASCADE,
    posto_trabalho TEXT NOT NULL,
    fator_ergonomico TEXT NOT NULL, -- 'Levantamento de Cargas' | 'Postura e Repetitividade' | 'Mobiliário e Ferramentas' | 'Condições Ambientais' | 'Organização do Trabalho'
    acao_proposta TEXT NOT NULL,
    tipo_medida TEXT DEFAULT 'administrativa', -- 'engenharia' | 'organizacional' | 'administrativa' | 'equipamento'
    responsavel TEXT NOT NULL,
    prazo DATE NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'
    custo_estimado NUMERIC DEFAULT 0,
    evidencia_conclusao TEXT,
    data_conclusao DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para plano de ação
CREATE INDEX IF NOT EXISTS idx_ergonomia_plano_aep ON public.ergonomia_plano_acao(aep_id);
CREATE INDEX IF NOT EXISTS idx_ergonomia_plano_status ON public.ergonomia_plano_acao(status);
CREATE INDEX IF NOT EXISTS idx_ergonomia_plano_prazo ON public.ergonomia_plano_acao(prazo);

-- RLS e Permissões para ergonomia_plano_acao
ALTER TABLE public.ergonomia_plano_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao plano de acao de ergonomia" ON public.ergonomia_plano_acao;
CREATE POLICY "Acesso total ao plano de acao de ergonomia" ON public.ergonomia_plano_acao
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.ergonomia_plano_acao TO anon, authenticated;

-- 3. Carga Inicial de Dados Práticos de Canteiro e Operações (Exemplos Reais para Inicialização)
INSERT INTO public.ergonomia_aep (
    id, codigo, data_avaliacao, setor, posto_trabalho, funcao_avaliada, ghe, num_trabalhadores,
    avaliador_nome, avaliador_registro,
    fator_levantamento_carga, obs_levantamento_carga,
    fator_posturas_repetitividade, obs_posturas_repetitividade,
    fator_mobiliario_equipamentos, obs_mobiliario_equipamentos,
    fator_condicoes_ambientais, obs_condicoes_ambientais,
    fator_organizacao_trabalho, obs_organizacao_trabalho,
    nivel_risco_global, necessidade_aet, parecer_conclusivo, status
) VALUES
(
    'AEP_2026_001',
    'AEP-2026-001',
    '2026-08-15',
    'Almoxarifado Central',
    'Recepção e Armazenamento de Sacaria de Cimento / Argamassa',
    'Auxiliar de Almoxarifado / Almoxarife',
    'GHE 04 - Apoio Operacional',
    4,
    'Eng. João Everton',
    'CREA/MTE Ativo',
    'alto',
    'Manuseio manual frequente de sacos de 25 kg e 50 kg da carroceria do caminhão para paletes com pega desfavorável e flexão acentuada de tronco.',
    'medio',
    'Flexão de tronco superior a 45º durante a montagem das primeiras camadas de paletes.',
    'medio',
    'Ausência de paletizadora ou esteira transportadora inclinada; uso de carrinho manual de duas rodas com sobrecarga em piso irregular.',
    'baixo',
    'Ventilação natural adequada e iluminação em conformidade.',
    'medio',
    'Picos intensos de descarga de carretas sem revezamento sistemático ou pausas regulares.',
    'alto',
    true,
    'Identificada sobrecarga biomecânica crítica na coluna lombar durante a descarga manual de sacarias. Recomendada automação de transporte com paleteira hidráulica e solicitação de cargas preferencialmente paletizadas pelos fornecedores. Indicada realização de AET específica se o revezamento não reduzir a queixa.',
    'concluida'
),
(
    'AEP_2026_002',
    'AEP-2026-002',
    '2026-08-20',
    'Administrativo / Engenharia',
    'Estação de Trabalho Informatizada (Planejamento e CAD)',
    'Assistente Administrativo / Engenheiro de Produção',
    'GHE ADM - Escritório Central',
    6,
    'Eng. João Everton',
    'CREA/MTE Ativo',
    'baixo',
    'Não há levantamento de cargas (apenas pastas e documentos esporádicos).',
    'medio',
    'Manutenção prolongada da postura sentada (mais de 6 horas diárias) com desvio ulnar ocasional no teclado/mouse.',
    'medio',
    'Monitores de notebooks abaixo da linha de visão do colaborador; carência de apoios para os pés para pessoas de estatura menor.',
    'baixo',
    'Ambiente climatizado (23ºC) com níveis de ruído abaixo de 55 dB(A) e boa iluminação natural.',
    'baixo',
    'Autonomia de pausas e distribuição regular de tarefas ao longo do expediente.',
    'medio',
    false,
    'Posto com bom padrão geral de conforto, necessitando apenas de adequações ergonômicas de mobiliário: suporte regulável de elevação para telas de notebook, mousepad ergonômico e apoios de pés.',
    'concluida'
),
(
    'AEP_2026_003',
    'AEP-2026-003',
    '2026-09-02',
    'Central de Armação',
    'Bancada de Corte e Dobra Manual de Vergalhão de Aço',
    'Armador de Ferragens / Ajudante Prático',
    'GHE 02 - Estruturas e Armação',
    8,
    'Eng. João Everton',
    'CREA/MTE Ativo',
    'medio',
    'Arrasto e içamento de barras de aço CA-50 em feixes de até 30 kg divididos em duplas.',
    'medio',
    'Flexão de tronco contínua sobre a bancada e movimentos repetitivos de punho e antebraço na chave de dobrar vergalhão.',
    'medio',
    'Bancada de madeira fixa com altura de 85 cm, necessitando de regulagem ou tablado ergonômico para adequação à estatura dos armadores.',
    'medio',
    'Exposição ao calor ambiente sob cobertura de telha galvanizada nas horas de maior insolação (11h às 14h).',
    'baixo',
    'Pausas para hidratação já implantadas conforme NR-18 e NR-17.',
    'medio',
    false,
    'Risco moderado controlado por revezamento entre ajudantes e armadores. Ação imediata: instalar tablados de compensado antiderrapante para correção de altura da bancada e incentivar exercícios de alongamento na ginástica laboral do DDS.',
    'concluida'
)
ON CONFLICT (id) DO NOTHING;

-- Ações no Plano de Melhorias Ergonômicas vinculadas aos exemplos
INSERT INTO public.ergonomia_plano_acao (
    id, aep_id, posto_trabalho, fator_ergonomico, acao_proposta, tipo_medida,
    responsavel, prazo, status, custo_estimado, evidencia_conclusao, data_conclusao
) VALUES
(
    'ACAO_ERG_001',
    'AEP_2026_001',
    'Recepção e Armazenamento de Sacaria de Cimento / Argamassa',
    'Levantamento de Cargas',
    'Aquisição e fornecimento de 01 paleteira manual hidráulica com capacidade para 2.000 kg para transporte de sacarias paletizadas no almoxarifado.',
    'equipamento',
    'Compras / Suprimentos (Carlos Alberto)',
    '2026-10-15',
    'em_andamento',
    2850.00,
    'Cotações solicitadas com fornecedores de equipamentos de movimentação de carga.',
    NULL
),
(
    'ACAO_ERG_002',
    'AEP_2026_001',
    'Recepção e Armazenamento de Sacaria de Cimento / Argamassa',
    'Organização do Trabalho',
    'Instituir procedimento operacional padrão (POP) de revezamento de tarefas na descarga: limite de 30 minutos contínuos por colaborador.',
    'organizacional',
    'Almoxarife Chefe / Encarregado',
    '2026-09-01',
    'concluido',
    0.00,
    'POP de descarga implantado e assinado pela equipe do almoxarifado no DDS.',
    '2026-09-01'
),
(
    'ACAO_ERG_003',
    'AEP_2026_002',
    'Estação de Trabalho Informatizada (Planejamento e CAD)',
    'Mobiliário e Ferramentas',
    'Fornecimento de 06 suportes articulados com regulagem de altura para notebooks e 04 apoios ergonômicos reguláveis para pés.',
    'equipamento',
    'SESMT / Compras',
    '2026-09-30',
    'em_andamento',
    680.00,
    'Pedido aprovado pela coordenação da obra.',
    NULL
),
(
    'ACAO_ERG_004',
    'AEP_2026_003',
    'Bancada de Corte e Dobra Manual de Vergalhão de Aço',
    'Mobiliário e Ferramentas',
    'Confecção de estrados/tablados de madeira antiderrapante com 10 cm e 15 cm de altura para nivelamento da postura de trabalho dos armadores.',
    'engenharia',
    'Carpintaria da Obra / Encarregado',
    '2026-09-10',
    'concluido',
    150.00,
    'Estrados confeccionados e posicionados na frente de corte da armação.',
    '2026-09-09'
)
ON CONFLICT (id) DO NOTHING;
