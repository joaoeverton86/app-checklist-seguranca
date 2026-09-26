-- ================================================================
-- MÓDULO DE PERICULOSIDADE (NR-16) - LAUDO PERICIAL (LP)
-- Consórcio Operador Ramal do Agreste - Mapeamento Oficial de 129 Trabalhadores
-- Enquadramento rigoroso conforme Anexo 2 (Inflamáveis) e Anexo 4 (SEP/Eletricidade)
-- ================================================================

-- 1. Tabela de Laudos Periciais de Periculosidade
CREATE TABLE IF NOT EXISTS public.periculosidade_laudos (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    empresa TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    responsavel_tecnico TEXT NOT NULL,
    registro_profissional TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.periculosidade_laudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos laudos de periculosidade" ON public.periculosidade_laudos;
CREATE POLICY "Acesso total aos laudos de periculosidade" ON public.periculosidade_laudos
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.periculosidade_laudos TO anon, authenticated;

-- 2. Tabela de Análise de Cargos e Funções no Laudo de Periculosidade
CREATE TABLE IF NOT EXISTS public.periculosidade_analises (
    id TEXT PRIMARY KEY,
    laudo_id TEXT REFERENCES public.periculosidade_laudos(id) ON DELETE CASCADE,
    grupo_numero INTEGER,
    setor TEXT NOT NULL,
    posto_trabalho TEXT NOT NULL,
    cargo_funcao TEXT NOT NULL,
    cbo TEXT,
    ghe TEXT,
    num_trabalhadores INTEGER DEFAULT 1,
    anexo_nr16 TEXT NOT NULL,
    atividade_descrita TEXT NOT NULL,
    agente_periculoso TEXT NOT NULL,
    delimitacao_area_risco TEXT NOT NULL,
    tempo_exposicao TEXT NOT NULL,
    caracterizacao BOOLEAN NOT NULL DEFAULT FALSE,
    percentual_adicional NUMERIC DEFAULT 0,
    salario_base_medio NUMERIC DEFAULT 0,
    fundamentacao_legal TEXT NOT NULL,
    parecer_conclusivo TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.periculosidade_analises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total as analises de periculosidade" ON public.periculosidade_analises;
CREATE POLICY "Acesso total as analises de periculosidade" ON public.periculosidade_analises
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.periculosidade_analises TO anon, authenticated;

-- 3. Carga do Laudo Pericial Oficial 2026/2027
INSERT INTO public.periculosidade_laudos (
    id, codigo, empresa, cnpj, data_inicio, data_fim, responsavel_tecnico, registro_profissional, status, observacoes
) VALUES (
    'LP_2026_2027', 'LP-2026/2027', 'CONSORCIO OPERADOR RAMAL DO AGRESTE', '55.623.017/0001-97',
    '2026-07-20', '2027-07-20', 'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'ativo', 'Laudo Técnico Pericial de Periculosidade elaborado nos termos do Art. 193 e 195 da CLT e Norma Regulamentadora nº 16 (NR-16).'
) ON CONFLICT (id) DO UPDATE SET
    codigo = EXCLUDED.codigo,
    empresa = EXCLUDED.empresa,
    cnpj = EXCLUDED.cnpj,
    data_inicio = EXCLUDED.data_inicio,
    data_fim = EXCLUDED.data_fim,
    responsavel_tecnico = EXCLUDED.responsavel_tecnico,
    registro_profissional = EXCLUDED.registro_profissional,
    status = EXCLUDED.status,
    observacoes = EXCLUDED.observacoes;

-- 4. Carga das Análises Periciais dos 27 Grupos (129 Trabalhadores)
INSERT INTO public.periculosidade_analises (
    id, laudo_id, grupo_numero, setor, posto_trabalho, cargo_funcao, cbo, ghe, num_trabalhadores,
    anexo_nr16, atividade_descrita, agente_periculoso, delimitacao_area_risco, tempo_exposicao,
    caracterizacao, percentual_adicional, salario_base_medio, fundamentacao_legal, parecer_conclusivo
) VALUES
-- GRUPO 05: MANUTENÇÃO ELÉTRICA (8 colaboradores - ⚡ PERICULOSO 30%)
(
    'PERIC_G05', 'LP_2026_2027', 5,
    'Manutenção Elétrica (Grupo 05)', 'Galpões de Bombeamento, Cubículos e Painéis Elétricos',
    'Técnico de Manutenção Elétrica / Assistente de Campo', '3131-20', 'GHE 05 - Eletromecânica', 8,
    'Anexo 4 - Energia Elétrica',
    'Execução de manutenções preventivas, corretivas e preditivas em circuitos de força energizados ou passíveis de energização acidental, cubículos de média tensão (13.8kV/69kV), barramentos e transformadores das Estações de Bombeamento do Ramal do Agreste.',
    'Energia Elétrica em Alta Tensão / SEP e Sistema Elétrico de Consumo Equivalente',
    'Zonas de Risco e Controladas delimitadas no entorno de condutores e partes elétricas desabrigadas conforme Tabela da NR-10 e Anexo 4 da NR-16.',
    'Habitual e Intermitente com Risco Potencial Permanente',
    TRUE, 30.00, 3850.00,
    'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014), Item 1: Atividades ou operações que exponham o trabalhador aos riscos decorrentes do emprego de energia elétrica em instalações ou equipamentos elétricos integrantes do Sistema Elétrico de Potência (SEP) e em condições de risco equivalente em circuitos de consumo. Súmula 364 do TST.',
    'CARACTERIZADA A PERICULOSIDADE. Os 8 profissionais fazem jus à percepção do adicional de 30% incidente sobre o salário-base.'
),

-- GRUPO 25: OPERADOR DE SUBESTAÇÃO (6 colaboradores - ⚡ PERICULOSO 30%)
(
    'PERIC_G25', 'LP_2026_2027', 25,
    'Operação de Subestação (Grupo 25)', 'Pátio de Subestações de Alta Tensão e Salas de Comando',
    'Operador de Subestação', '8612-05', 'GHE 25 - Operação de Subestação', 6,
    'Anexo 4 - Energia Elétrica',
    'Operação de instalações de sistemas elétricos de alta tensão (SEP), manobra de seccionadoras, disjuntores de potência, inspeções visuais no pátio de transformadores energizados e controle de grandezas eletromecânicas.',
    'Energia Elétrica de Alta Tensão / Sistema Elétrico de Potência (SEP)',
    'Pátio de subestações transformadoras e salas de controle com painéis de manobra de alta e média tensão (SEP).',
    'Habitual e Permanente',
    TRUE, 30.00, 4200.00,
    'Anexo 4 da NR-16, Item 1, alínea "b" e Item 2: Operação e inspeção de instalações integrantes do Sistema Elétrico de Potência (SEP). Súmula 364 do TST.',
    'CARACTERIZADA A PERICULOSIDADE. Os 6 operadores de subestação têm direito líquido ao adicional de 30% sobre o salário-base.'
),

-- GRUPO 15: MOTORISTA DE CAMINHÃO COMBOIO (1 colaborador - ⚡ PERICULOSO 30%)
(
    'PERIC_G15', 'LP_2026_2027', 15,
    'Logística e Abastecimento (Grupo 15)', 'Caminhão Comboio Abastecedor / Frentes de Serviço',
    'Motorista de Caminhão (Comboio)', '7825-10', 'GHE 15 - Transporte e Abastecimento', 1,
    'Anexo 2 - Inflamáveis',
    'Condução e operação de caminhão comboio equipado com tanque de óleo diesel (capacidade superior a 200 litros) e bombas de abastecimento, realizando abastecimento diário de escavadeiras, tratores, caminhões e geradores de energia nas frentes de obra ao longo do canal.',
    'Líquidos Inflamáveis / Óleo Diesel (Volume > 200L)',
    'Raio de 7,5 metros com centro nas bocas de carga e bicos de descarga de combustível, além da área do tanque do veículo abastecedor (Quadro 3 do Anexo 2 da NR-16).',
    'Habitual e Intermitente',
    TRUE, 30.00, 3500.00,
    'Anexo 2 da NR-16, Item 1, alínea "j" (transporte de inflamáveis líquidos em tanques) e Item 3, alíneas "q" e "s" (abastecimento de inflamáveis líquidos com vasilhames/tanques acima de 200 litros). Súmula 364 do TST.',
    'CARACTERIZADA A PERICULOSIDADE. O motorista do caminhão comboio tem direito formal ao adicional de 30% sobre o salário-base.'
),

-- GRUPO 04: ANALISTA ELÉTRICO DE MANUTENÇÃO (1 colaborador - ⚡ PERICULOSO 30%)
(
    'PERIC_G04_ELET', 'LP_2026_2027', 4,
    'Engenharia de Manutenção (Grupo 04)', 'Subestações e Painéis Elétricos de Campo',
    'Analista de Planejamento de Manutenção Elétrica', '3911-45', 'GHE 04 - Engenharia de Manutenção', 1,
    'Anexo 4 - Energia Elétrica',
    'Planejamento e testes de comissionamento em campo diretamente nos painéis elétricos energizados das Estações de Bombeamento e Subestações.',
    'Eletricidade em Média e Alta Tensão',
    'Zona de risco no interior das salas de painéis de acionamento das motobombas.',
    'Intermitente com Risco Potencial',
    TRUE, 30.00, 5200.00,
    'Anexo 4 da NR-16 (Portaria 1.078/2014) e Súmula 364 do TST.',
    'CARACTERIZADA A PERICULOSIDADE. O profissional faz jus ao adicional de 30% em razão das intervenções operacionais nos sistemas energizados.'
),

-- GRUPO 04: ENGENHEIROS MECÂNICOS (2 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G04_MEC', 'LP_2026_2027', 4,
    'Engenharia de Manutenção (Grupo 04)', 'Escritório de Planejamento e Oficinas',
    'Engenheiro Mecânico', '2144-05', 'GHE 04 - Engenharia de Manutenção', 2,
    'Nenhum / Não Aplicável',
    'Atividades administrativas de planejamento, emissão de relatórios, acompanhamento de contratos e vistorias visuais em equipamentos mecânicos.',
    'Não Aplicável',
    'Não há penetração em área de risco de forma habitual ou permanente.',
    'Inexistente / Eventual sem contato',
    FALSE, 0.00, 8500.00,
    'Item 16.2 da NR-16 e Art. 193 da CLT.',
    'DESCARACTERIZADA A PERICULOSIDADE. Funções técnico-administrativas sem exposição a fatores periculosos.'
),

-- GRUPO 06: MANUTENÇÃO MECÂNICA (5 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G06', 'LP_2026_2027', 6,
    'Manutenção Mecânica (Grupo 06)', 'Poço de Bombas, Tubulações e Oficina Mecânica',
    'Técnico em Manutenção Mecânica / Encarregado / Assistente de Campo', '3141-10', 'GHE 06 - Mecânica Pesada', 5,
    'Nenhum / Não Aplicável',
    'Montagem, desmontagem, alinhamento a laser e reparos de rotores, carcaças de bombas d''água e válvulas mecânicas. Todas as intervenções ocorrem com o conjunto motobomba totalmente desenergizado, bloqueado e etiquetado (LOTO) pela equipe elétrica responsável.',
    'Instalações Mecânicas Desenergizadas',
    'Área operacional das bombas com circuito elétrico previamente desenergizado e bloqueado com cadeados de segurança.',
    'Não exposto a risco elétrico',
    FALSE, 0.00, 3700.00,
    'Item 2, alínea "d" do Anexo 4 da NR-16: Não é devida a periculosidade nas atividades em instalações elétricas desenergizadas e liberadas para o trabalho, sem possibilidade de energização acidental (conforme NR-10).',
    'DESCARACTERIZADA A PERICULOSIDADE. Não há trabalho em eletricidade; a equipe mecânica atua exclusivamente sob regime formal de LOTO.'
),

-- GRUPO 01: VIGILÂNCIA PATRIMONIAL (4 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G01', 'LP_2026_2027', 1,
    'Segurança Patrimonial (Grupo 01)', 'Portarias e Guaritas de Controle de Acesso',
    'Vigia', '5174-20', 'GHE 01 - Vigilância', 4,
    'Anexo 3 - Segurança Pessoal ou Patrimonial',
    'Fiscalização de entrada e saída de veículos, colaboradores e visitantes no canteiro de obras e alojamento. Atividade desarmada de controle de portaria sem uso de arma de fogo.',
    'Violência Física / Roubo (Não enquadrado)',
    'Área da portaria e acessos de pedestres.',
    'Permanente desarmada',
    FALSE, 0.00, 1800.00,
    'O Anexo 3 da NR-16 (Portaria MTE nº 1.885/2013) exige enquadramento estrito na Lei Federal nº 7.102/83 (Vigilantes com curso de formação credenciado pela Polícia Federal). Jurisprudência consolidada do TST (Tema Repetitivo nº 16) não estende periculosidade a Vigias civis desarmados.',
    'DESCARACTERIZADA A PERICULOSIDADE. A função de Vigia não atende aos requisitos taxativos da Lei 7.102/83 e Anexo 3 da NR-16.'
),

-- GRUPO 07: MANUTENÇÃO CIVIL (48 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G07', 'LP_2026_2027', 7,
    'Manutenção Civil (Grupo 07)', 'Taludes, Calhas de Drenagem e Juntas de Canais',
    'Servente, Pedreiro, Encarregado de Campo e de Obras', '7170-20', 'GHE 07 - Obras Civis', 48,
    'Nenhum / Não Aplicável',
    'Atividades de alvenaria, armação, concretagem, escavação manual de canaletas e recuperação de taludes de concreto do canal.',
    'Não Aplicável',
    'Áreas a céu aberto ao longo das estruturas civis da obra.',
    'Inexistente',
    FALSE, 0.00, 1950.00,
    'Art. 193 da CLT e Anexos 1 a 5 da NR-16.',
    'DESCARACTERIZADA A PERICULOSIDADE. Serviços de construção civil sem manuseio de inflamáveis, explosivos ou redes elétricas de alta potência.'
),

-- GRUPO 08: MOTOSSERRAS E ROÇADEIRAS (1 colaborador - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G08', 'LP_2026_2027', 8,
    'Supressão Vegetal (Grupo 08)', 'Margens dos Canais e Reservatórios',
    'Operador de Motosserra / Roçadeira', '6321-20', 'GHE 08 - Roçagem', 1,
    'Anexo 2 - Inflamáveis',
    'Roçagem de vegetação rasteira com roçadeira costal a combustão. Abastecimento eventual do tanque do motor com reservatório portátil homologado de 5 litros.',
    'Gasolina/Óleo 2T em Pequena Quantidade (< 5 Litros)',
    'Ponto de reabastecimento pontual da roçadeira.',
    'Eventual e com volume insignificante',
    FALSE, 0.00, 2200.00,
    'Item 4 do Anexo 2 da NR-16: Não caracterizam periculosidade o manuseio, transporte e armazenamento de inflamáveis em embalagens certificadas de até 5 litros ou volume total inferior a 200 litros.',
    'DESCARACTERIZADA A PERICULOSIDADE. Volume diminuto desconsiderado pela legislação de inflamáveis.'
),

-- GRUPO 10: OPERAÇÃO DE SISTEMAS HÍDRICOS (6 colaboradores - ⚡ PERICULOSO 30%)
(
    'PERIC_G10', 'LP_2026_2027', 10,
    'Operação Hídrica (Grupo 10)', 'Galpão Operacional da Estação de Bombeamento (EB)',
    'Operador de Estação de Bombeamento / Encarregado de Operações', '8621-40', 'GHE 10 - Operação de Sistemas Hídricos', 6,
    'Anexo 4 - Energia Elétrica',
    'Coordenação e operação dos sistemas hídricos com permanência diária no interior da Estação de Bombeamento em área adjacente e com circulação próxima aos painéis de comando e subestações.',
    'Energia Elétrica / Proximidade com Painéis de Força e Subestações em Estação de Bombeamento',
    'Área interna da Estação de Bombeamento (EB) e adjacências imediatas aos cubículos e painéis elétricos de acionamento.',
    'Habitual e Intermitente',
    TRUE, 30.00, 3600.00,
    'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014), Item 1, alínea "c", c/c Súmula 364 do TST e Política Corporativa do Consórcio. Os operadores de sistemas hídricos e encarregados permanecem nas Estações de Bombeamento em proximidade aos painéis elétricos de média e alta potência. Visando à proteção e segurança jurídica, a diretoria do Consórcio deliberou expressamente pelo pagamento do adicional a todos os integrantes deste grupo.',
    'CARACTERIZADA A PERICULOSIDADE (Adicional de 30% sobre o salário-base), com base na permanência no galpão operacional da Estação de Bombeamento próximo aos sistemas de controle elétrico e determinação da empresa.'
),

-- GRUPO 25: OPERAÇÃO DE SUBESTAÇÃO (6 colaboradores - ⚡ PERICULOSO 30%)
(
    'PERIC_G25', 'LP_2026_2027', 25,
    'Operação de Subestações (Grupo 25)', 'Pátio de Subestações e Salas Elétricas das EBs',
    'Operador de Subestação', '8621-50', 'GHE 25 - Operação de Subestações', 6,
    'Anexo 4 - Energia Elétrica',
    'Manobras operacionais de chaves seccionadoras, disjuntores de média e alta tensão, acompanhamento de telemetria e inspeções visuais em transformadores e barramentos energizados das subestações das Estações de Bombeamento.',
    'Energia Elétrica em Alta Tensão / SEP',
    'Pátio da Subestação e salas de painéis de distribuição (Zonas de Risco e Controladas da NR-10 e Anexo 4 da NR-16).',
    'Habitual e Permanente',
    TRUE, 30.00, 3800.00,
    'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014) e Decreto nº 93.412/86. Atividades de operação e manobra em instalações elétricas do Sistema Elétrico de Potência (SEP).',
    'CARACTERIZADA A PERICULOSIDADE (Adicional de 30% sobre o salário-base).'
),

-- GRUPO 11, 12: MÁQUINAS PESADAS E MOTORISTAS (13 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_G11_G12', 'LP_2026_2027', 12,
    'Transporte e Terraplenagem (Grupos 11 e 12)', 'Cabine de Caminhões e Máquinas Pesadas',
    'Operador de Máquinas, Carreteiro e Motorista de Caminhão', '7151-15', 'GHE 12 - Operadores de Equipamentos Móveis', 13,
    'Nenhum / Não Aplicável',
    'Condução e manobra de caminhões basculantes e máquinas de terraplenagem para transporte de terra, agregados e materiais. Abastecimento realizado pelo operador do caminhão comboio ou em posto credenciado.',
    'Não Aplicável',
    'Cabine de condução do veículo.',
    'Inexistente',
    FALSE, 0.00, 2900.00,
    'Art. 193 da CLT e Anexo 2 da NR-16. Os motoristas convencionais não realizam abastecimento de inflamáveis em tanques a granel.',
    'DESCARACTERIZADA A PERICULOSIDADE.'
),

-- DEMAIS GRUPOS: ESCRITÓRIOS, APOIO, TOPOGRAFIA, LIMPEZA E SAÚDE (31 colaboradores - 🛡️ NÃO PERICULOSO)
(
    'PERIC_ADMIN_APOIO', 'LP_2026_2027', 3,
    'Administrativo, Engenharia e Apoio (Grupos 02, 03, 13, 14, 16, 20, 21, 22, 23, 24, 26, 27)', 'Canteiro Central, Escritórios, Topografia, Limpeza e Apoio',
    'Engenheiros, Técnicos, Auxiliares Administrativos, Topógrafos, Aux. Limpeza e Técnico Enfermagem', '4110-05', 'GHE ADM/APOIO - Suporte Geral', 31,
    'Nenhum / Não Aplicável',
    'Atividades de escritório, almoxarifado, desenho de projetos, medições topográficas a laser, limpeza predial e atendimento ambulatorial.',
    'Não Aplicável',
    'Instalações prediais administrativas e áreas de apoio.',
    'Inexistente',
    FALSE, 0.00, 3100.00,
    'Art. 193 da CLT e NR-16.',
    'DESCARACTERIZADA A PERICULOSIDADE para todas as funções administrativas e de apoio.'
)
ON CONFLICT (id) DO UPDATE SET
    laudo_id = EXCLUDED.laudo_id,
    grupo_numero = EXCLUDED.grupo_numero,
    setor = EXCLUDED.setor,
    posto_trabalho = EXCLUDED.posto_trabalho,
    cargo_funcao = EXCLUDED.cargo_funcao,
    cbo = EXCLUDED.cbo,
    ghe = EXCLUDED.ghe,
    num_trabalhadores = EXCLUDED.num_trabalhadores,
    anexo_nr16 = EXCLUDED.anexo_nr16,
    atividade_descrita = EXCLUDED.atividade_descrita,
    agente_periculoso = EXCLUDED.agente_periculoso,
    delimitacao_area_risco = EXCLUDED.delimitacao_area_risco,
    tempo_exposicao = EXCLUDED.tempo_exposicao,
    caracterizacao = EXCLUDED.caracterizacao,
    percentual_adicional = EXCLUDED.percentual_adicional,
    salario_base_medio = EXCLUDED.salario_base_medio,
    fundamentacao_legal = EXCLUDED.fundamentacao_legal,
    parecer_conclusivo = EXCLUDED.parecer_conclusivo;
