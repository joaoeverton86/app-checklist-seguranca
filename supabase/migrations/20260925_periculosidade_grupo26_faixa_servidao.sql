-- Migração: Enquadramento de Periculosidade para o Grupo 26 (Conservação e Limpeza de Subestação e Faixa de Servidão)
-- Base de conhecimento: NotebookLM / Base Técnica Ramal do Agreste
-- Data: 25/09/2026

INSERT INTO periculosidade_analises (
    id,
    laudo_id,
    grupo_numero,
    setor,
    posto_trabalho,
    cargo_funcao,
    cbo,
    ghe,
    num_trabalhadores,
    anexo_nr16,
    agente_periculoso,
    delimitacao_area_risco,
    tempo_exposicao,
    atividade_descrita,
    caracterizacao,
    percentual_adicional,
    salario_base_medio,
    fundamentacao_legal,
    parecer_conclusivo
) VALUES (
    'PERIC_ANALISE_G26',
    'LP_2026_2027',
    26,
    'Conservação e Limpeza (Grupo 26)',
    'Faixa de Servidão de Linhas de Transmissão (LT 69 kV) e Áreas Periféricas da Subestação',
    'Encarregado de Campo e Serventes de Limpeza e Conservação',
    '7170-20 / 7102-05',
    '26',
    5,
    'Anexo 4 - Energia Elétrica',
    'Energia Elétrica em Alta Tensão / SEP (Linha de Transmissão 69 kV e Subestação)',
    'Faixa de servidão sob condutores energizados de 69 kV e periferia imediata da Subestação (Zonas de Risco e Controlada da NR-10 e Anexo 4 da NR-16).',
    'Habitual e Intermitente com Risco Potencial Permanente',
    'Atividade de roço, poda e remoção manual/mecanizada de vegetação regenerada ao longo da Faixa de Servidão de Linhas de Transmissão de Alta Tensão (LT 69 kV) e áreas periféricas da Subestação. Visa manter a faixa de domínio desimpedida, garantindo a distância de segurança em relação aos condutores energizados e facilitando a inspeção visual das estruturas do Ramal do Agreste.',
    true,
    30.00,
    2280.00,
    'Anexo 4 da NR-16 (Portaria MTE nº 1.078/2014, Item 1, alíneas "b" e "c"), NR-10 e Súmula 364 do TST. Trabalhos de conservação e desimpedimento executados em proximidade ou dentro da zona de risco de sistemas elétricos de potência energizados (Linha de Transmissão de Alta Tensão 69 kV).',
    'CARACTERIZADA A PERICULOSIDADE com direito à percepção do adicional de 30% incidente sobre o salário-base. Riscos críticos de choque elétrico de alta tensão por aproximação ou indução magnética durante serviços de roço e poda na faixa de servidão energizada.'
) ON CONFLICT (id) DO UPDATE SET
    grupo_numero = EXCLUDED.grupo_numero,
    setor = EXCLUDED.setor,
    posto_trabalho = EXCLUDED.posto_trabalho,
    cargo_funcao = EXCLUDED.cargo_funcao,
    cbo = EXCLUDED.cbo,
    ghe = EXCLUDED.ghe,
    num_trabalhadores = EXCLUDED.num_trabalhadores,
    anexo_nr16 = EXCLUDED.anexo_nr16,
    agente_periculoso = EXCLUDED.agente_periculoso,
    delimitacao_area_risco = EXCLUDED.delimitacao_area_risco,
    tempo_exposicao = EXCLUDED.tempo_exposicao,
    atividade_descrita = EXCLUDED.atividade_descrita,
    caracterizacao = EXCLUDED.caracterizacao,
    percentual_adicional = EXCLUDED.percentual_adicional,
    salario_base_medio = EXCLUDED.salario_base_medio,
    fundamentacao_legal = EXCLUDED.fundamentacao_legal,
    parecer_conclusivo = EXCLUDED.parecer_conclusivo;

-- Atualizar G03 para desmembrar o Grupo 26
UPDATE periculosidade_analises
SET setor = 'Administrativo, Engenharia e Apoio (Grupos 02, 03, 13, 14, 16, 20, 21, 22, 23, 24, 27)',
    num_trabalhadores = 29
WHERE grupo_numero = 3;
