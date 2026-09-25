-- ================================================================
-- CARGA OFICIAL DE AEPs (NR-17) E PLANO DE AÇÃO 5W2H
-- Baseada na estrutura real do canteiro do Consórcio Ramal do Agreste
-- Total: 129 trabalhadores / 27 setores mapeados com diagnósticos técnicos reais
-- ================================================================

-- Inserção / Atualização das AEPs Oficiais do Canteiro
INSERT INTO ergonomia_aep (
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
    'AEP_2026_G01', 'AEP-2026-004', '2026-07-20',
    'Segurança Patrimonial (Grupo 01)', 'Guarita de Vigilância e Portaria Central',
    'Vigia (CBO 5174-20)', 'GHE 01 - Vigilância', 4,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'baixo', 'Sem movimentação constante de peso excessivo.',
    'medio', 'Permanência prolongada em postura ortostática ou sentada estática.',
    'medio', 'Assento atual incompatível com a altura do balcão de atendimento da portaria.',
    'alto', 'Espaço físico reduzido (< 2 m²), telha de fibrocimento com pé-direito de 2,5m e forte radiação solar diurna.',
    'baixo', 'Escala de revezamento 12x36 regular.',
    'medio', FALSE,
    'Posto com desconforto térmico significativo no período vespertino e assento sem apoio regulável de pés. Recomendada aplicação de isolamento térmico na cobertura, ventilador oscilante e cadeira ergonômica alta tipo caixa com aro para apoio dos pés.',
    'concluida'
),
(
    'AEP_2026_G05', 'AEP-2026-005', '2026-07-20',
    'Manutenção Elétrica (Grupo 05)', 'Galpão de Operação e Painéis das Estações de Bombeamento',
    'Técnico de Manutenção Elétrica / Assistente de Campo', 'GHE 05 - Eletromecânica', 8,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'baixo', 'Cargas manuais leves a moderadas durante transporte de instrumentos de teste e cabos.',
    'medio', 'Acesso a bandejamentos e barramentos aéreos exige trabalho com braços elevados acima da linha dos ombros.',
    'medio', 'Plataformas de acesso com guarda-corpo fixo exigem inclinação lateral do tronco em intervenções em caixas altas.',
    'medio', 'Ruído intermitente e calor radiante gerado pelas motobombas e transformadores no galpão operacional.',
    'baixo', 'Atividades sob PT e APR com pausas regulares entre intervenções.',
    'medio', FALSE,
    'Acesso a painéis em alturas diversas gera sobrecarga escapuloumeral por elevação dos membros superiores. Solução viável via escada-plataforma móvel com rodízios traváveis e protetor tipo concha acoplado ao capacete.',
    'concluida'
),
(
    'AEP_2026_G06', 'AEP-2026-006', '2026-07-20',
    'Manutenção Mecânica (Grupo 06)', 'Poço de Sucção e Desmontagem de Conjuntos Motobombas',
    'Técnico de Manutenção Mecânica / Assistente de Campo', 'GHE 06 - Mecânica Pesada', 5,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'alto', 'Manuseio de chaves pesadas, flanges e parafusos de grande diâmetro com alto torque manual e esforço de compressão.',
    'alto', 'Posturas críticas frequentes: agachado, ajoelhado sobre piso gradeado metálico e tronco inclinado.',
    'medio', 'Bancadas de oficina com altura fixa e ausência de dispositivos de giro para componentes cilíndricos.',
    'medio', 'Ambiente interno do galpão das bombas sem climatização, com ventilação natural.',
    'medio', 'Demandas pontuais de emergência em casos de interrupção no bombeamento.',
    'alto', TRUE,
    'Atividade de alto risco ergonômico e biomecânico para coluna lombar e joelhos. Enquadra-se no subitem 17.3.2 da NR-17 como indicação formal de AET para estudo aprofundado de parafusadeiras pneumáticas/multiplicadores de torque e sistemas de talhas giratórias.',
    'concluida'
),
(
    'AEP_2026_G07', 'AEP-2026-007', '2026-07-20',
    'Manutenção Civil (Grupo 07)', 'Recuperação de Taludes, Juntas de Canais e Concretagem',
    'Servente (CBO 7170-20) e Pedreiro (CBO 7152-10)', 'GHE 07 - Obras Civis e Manutenção Hídrica', 48,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'alto', 'Levantamento e transporte manual frequente de sacos, masseiras, carrinhos de mão pesados em terreno declivoso.',
    'alto', 'Trabalho contínuo em inclinação nos taludes dos canais, postura agachada e flexão extrema de coluna.',
    'baixo', 'Ferramentas manuais convencionais (pás, enxadas, desempenadeiras, colheres de pedreiro).',
    'alto', 'Trabalho a céu aberto sob forte incidência solar direta, temperatura elevada e baixa umidade do semiárido.',
    'medio', 'Meta de avanço linear diário nas juntas de dilatação e calhas de drenagem.',
    'alto', TRUE,
    'Grupo com o maior número de trabalhadores expostos do empreendimento. Apresenta sobrecarga lombar severa e sobrecarga térmica. Indicação de AET com foco biomecânico e implantação imediata de pausas térmicas em tendas móveis climatizadas por aspersão e carrinhos ergonômicos balanceados.',
    'concluida'
),
(
    'AEP_2026_G08', 'AEP-2026-008', '2026-07-20',
    'Supressão Vegetal e Roçadeiras (Grupo 08)', 'Roçagem e Limpeza de Vegetação em Margens e Barragens',
    'Operador de Motosserra / Roçadeira (CBO 6321-20)', 'GHE 08 - Roçagem e Motosserras', 1,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'medio', 'Sustentação contínua de equipamento pesado (~8 a 10 kg) através de cinturão durante a ceifa.',
    'alto', 'Movimento pendular repetitivo do tronco em terreno irregular e declivoso com tensão muscular isométrica nos ombros.',
    'baixo', 'Equipamento motorizado com cabo regulável.',
    'alto', 'Vibração contínua transmitida às mãos e braços (VMB), ruído de motor 2 tempos e sol direto.',
    'medio', 'Trabalho isolado ao longo das bermas do canal.',
    'alto', TRUE,
    'Risco ergonômico elevado decorrente da combinação de peso sustentado, movimento rotacional de coluna e vibração de membros superiores. Indicação de AET e substituição obrigatória do arnês simples por colete ergonômico duplo almofadado com suporte lombar.',
    'concluida'
),
(
    'AEP_2026_G10', 'AEP-2026-009', '2026-07-20',
    'Operação de Sistemas Hídricos (Grupos 10 e 25)', 'Sala de Controle Operacional (CCO) e Painéis Supervisórios',
    'Operador de Estação de Bombeamento e Operador de Subestação', 'GHE 10 - Operação de Sistemas Hídricos', 12,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'baixo', 'Atividades sem levantamento manual de cargas.',
    'medio', 'Postura sentada prolongada durante plantões de monitoramento com atenção visual concentrada.',
    'medio', 'Mesa de comando necessita de ajustes de profundidade e suportes de elevação para os monitores.',
    'baixo', 'Ambiente climatizado, silencioso e com iluminação artificial adequada.',
    'medio', 'Regime de revezamento de turnos com necessidade de vigilância constante das vazões.',
    'medio', FALSE,
    'Posto informatizado com alta carga de atenção. Exige conformidade estrita com o subitem 17.6 (Mobiliário) da NR-17, com cadeiras giratórias certificadas para uso contínuo 24/7, apoio de braços ajustável e suporte articulado para monitores.',
    'concluida'
),
(
    'AEP_2026_G12', 'AEP-2026-010', '2026-07-20',
    'Transporte Pesado e Máquinas (Grupos 11, 12 e 15)', 'Cabine de Caminhões Traçados, Comboio e Máquinas Pesadas',
    'Motorista de Caminhão, Carreteiro e Operador de Máquinas', 'GHE 12 - Operadores de Equipamentos Móveis', 14,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'baixo', 'Esforço muscular concentrado na condução e acionamento de alavancas/pedais hidráulicos.',
    'medio', 'Postura sentada estática prolongada sob vibração contínua ao trafegar em estradas vicinais da obra.',
    'medio', 'Bancos com suspensão a ar requerem calibração de acordo com o peso corporal do operador.',
    'medio', 'Vibração de Corpo Inteiro (VCI) e temperatura atenuada pelo ar condicionado de cabine.',
    'baixo', 'Cumprimento de pausas obrigatórias da Lei do Motorista.',
    'medio', FALSE,
    'Vibração de corpo inteiro e postura estática amortecidas pela suspensão do banco pneumático. Necessário assegurar calibração regular da bolsa de ar do assento e incentivar pausas ativas de alongamento a cada 2 horas de direção.',
    'concluida'
),
(
    'AEP_2026_G03', 'AEP-2026-011', '2026-07-20',
    'Engenharia, Planejamento e Apoio (Grupos 03, 04, 20, 21, 22, 23, 24)', 'Estações de Trabalho Informatizadas (Escritório Central)',
    'Engenheiro Civil, Analista de Planejamento, Assistente de Campo, Aux. Administrativo', 'GHE 03 - Administrativo e Engenharia', 23,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'baixo', 'Sem levantamento manual de cargas.',
    'medio', 'Uso contínuo de teclado e mouse com digitação prolongada em softwares de CAD e planilhas.',
    'medio', 'Alguns colaboradores utilizavam notebook diretamente sobre a mesa sem suporte de elevação.',
    'baixo', 'Ambiente climatizado com excelente conforto térmico e iluminação difusa.',
    'baixo', 'Jornada administrativa com flexibilidade e intervalos livres.',
    'baixo', FALSE,
    'Posto de trabalho com baixo risco geral. As inadequações observadas foram corrigidas mediante implantação de suportes articulados para notebooks, mousepads ergonômicos e apoios ajustáveis para os pés.',
    'concluida'
),
(
    'AEP_2026_G14', 'AEP-2026-012', '2026-07-20',
    'Serviços Gerais, Limpeza e Apoio (Grupos 14, 16, 26, 27)', 'Higienização de Ambientes, Canteiro e Coleta de Resíduos',
    'Auxiliar de Limpeza (CBO 5143-20) e Apoio Operacional', 'GHE 14 - Serviços Gerais e Apoio', 12,
    'Eng. João Everton de Souza Limeira', 'CREA: 0522078320-BA',
    'medio', 'Transporte manual de sacos de lixo e baldes d''água durante limpeza das instalações.',
    'medio', 'Posturas de inclinação do tronco e movimentos repetitivos de membros superiores na esfregação de pisos.',
    'baixo', 'Equipamentos manuais de limpeza doméstica.',
    'baixo', 'Locais cobertos e ventilados na maior parte do expediente.',
    'baixo', 'Ritmo autogerenciado sem pressão temporal abusiva.',
    'baixo', FALSE,
    'Atividade com risco ergonômico baixo e controlado. Padronização de cabos compridos na altura do queixo e baldes com espremedor mecânico eliminaram o esforço de torção manual e reduziram a flexão de coluna.',
    'concluida'
)
ON CONFLICT (id) DO UPDATE SET
    codigo = EXCLUDED.codigo,
    data_avaliacao = EXCLUDED.data_avaliacao,
    setor = EXCLUDED.setor,
    posto_trabalho = EXCLUDED.posto_trabalho,
    funcao_avaliada = EXCLUDED.funcao_avaliada,
    ghe = EXCLUDED.ghe,
    num_trabalhadores = EXCLUDED.num_trabalhadores,
    avaliador_nome = EXCLUDED.avaliador_nome,
    avaliador_registro = EXCLUDED.avaliador_registro,
    fator_levantamento_carga = EXCLUDED.fator_levantamento_carga,
    obs_levantamento_carga = EXCLUDED.obs_levantamento_carga,
    fator_posturas_repetitividade = EXCLUDED.fator_posturas_repetitividade,
    obs_posturas_repetitividade = EXCLUDED.obs_posturas_repetitividade,
    fator_mobiliario_equipamentos = EXCLUDED.fator_mobiliario_equipamentos,
    obs_mobiliario_equipamentos = EXCLUDED.obs_mobiliario_equipamentos,
    fator_condicoes_ambientais = EXCLUDED.fator_condicoes_ambientais,
    obs_condicoes_ambientais = EXCLUDED.obs_condicoes_ambientais,
    fator_organizacao_trabalho = EXCLUDED.fator_organizacao_trabalho,
    obs_organizacao_trabalho = EXCLUDED.obs_organizacao_trabalho,
    nivel_risco_global = EXCLUDED.nivel_risco_global,
    necessidade_aet = EXCLUDED.necessidade_aet,
    parecer_conclusivo = EXCLUDED.parecer_conclusivo,
    status = EXCLUDED.status;

-- Inserção / Atualização do Plano de Ação 5W2H Vinculado
INSERT INTO ergonomia_plano_acao (
    id, aep_id, posto_trabalho, fator_ergonomico, acao_proposta, tipo_medida,
    responsavel, prazo, custo_estimado, status, evidencia_conclusao, data_conclusao
) VALUES
(
    'ACAO_ERG_G01', 'AEP_2026_G01', 'Guarita de Vigilância e Portaria Central', 'Condições Ambientais',
    'Instalar isolamento térmico na cobertura da guarita, ventilador oscilante de parede e substituir assento por cadeira ergonômica alta com aro regulável de pés.',
    'equipamento', 'Engenharia / Suprimentos', '2026-10-25', 1850.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G05', 'AEP_2026_G05', 'Galpão de Operação e Painéis das Estações de Bombeamento', 'Postura e Repetitividade',
    'Disponibilizar escada-plataforma móvel com degraus largos e guarda-corpo para intervenções em barramentos e caixas aéreas, evitando trabalho com braços suspensos.',
    'equipamento', 'SESMT / Manutenção Elétrica', '2026-10-30', 3200.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G06', 'AEP_2026_G06', 'Poço de Sucção e Desmontagem de Conjuntos Motobombas', 'Levantamento de Cargas',
    'Aquisição de multiplicador mecânico de torque/chave pneumática e fornecimento de joelheiras de proteção anatômicas em gel para intervenções no piso das bombas.',
    'engenharia', 'Coordenação de Manutenção Mecânica', '2026-10-20', 6500.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G07', 'AEP_2026_G07', 'Recuperação de Taludes, Juntas de Canais e Concretagem', 'Organização do Trabalho',
    'Implantar protocolo de pausas de 10 min a cada 50 min de esforço em talude, com tenda móvel com assentos e reposição hidroeletrolítica nos trechos do canal.',
    'organizacional', 'SESMT / Encarregados de Obras Civis', '2026-10-10', 2400.00, 'em_andamento', NULL, NULL
),
(
    'ACAO_ERG_G08', 'AEP_2026_G08', 'Roçagem e Limpeza de Vegetação em Margens e Barragens', 'Postura e Repetitividade',
    'Substituir o cinturão simples por Colete/Arnês Ergonômico Profissional Duplo Almofadado com engate rápido e placa de proteção lombar.',
    'equipamento', 'SESMT / Compras', '2026-10-15', 480.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G10', 'AEP_2026_G10', 'Sala de Controle Operacional (CCO) e Painéis Supervisórios', 'Mobiliário e Ferramentas',
    'Ajuste da disposição dos monitores em suporte multi-telas na altura dos olhos e fornecimento de apoio ergonômico para pés em cada estação do CCO.',
    'equipamento', 'TI / SESMT', '2026-10-25', 1400.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G12', 'AEP_2026_G12', 'Cabine de Caminhões Traçados, Comboio e Máquinas Pesadas', 'Condições Ambientais',
    'Incluir no plano de manutenção preventiva da frota a verificação e calibração periódica da suspensão pneumática dos bancos dos motoristas e operadores.',
    'administrativa', 'Oficina Mecânica / Manutenção de Frota', '2026-10-31', 900.00, 'pendente', NULL, NULL
),
(
    'ACAO_ERG_G03', 'AEP_2026_G03', 'Estações de Trabalho Informatizadas (Escritório Central)', 'Mobiliário e Ferramentas',
    'Fornecer suportes reguláveis para notebook com kit de teclado e mouse USB dedicados para todos os colaboradores de escritório e PCM.',
    'equipamento', 'TI / Suprimentos', '2026-09-20', 1750.00, 'concluido', 'Kits de suportes articulados e teclados distribuídos e ajustados conforme protocolo NR-17.', '2026-09-20'
),
(
    'ACAO_ERG_G14', 'AEP_2026_G14', 'Higienização de Ambientes, Canteiro e Coleta de Resíduos', 'Mobiliário e Ferramentas',
    'Padronização de cabos de vassouras/mops longos anatômicos e baldes com sistema mecânico de centrifugação/espremedor para a equipe de limpeza.',
    'equipamento', 'SESMT / Almoxarifado', '2026-09-15', 650.00, 'concluido', 'Carrinhos multifuncionais de limpeza com balde espremedor entregues e em uso regular.', '2026-09-15'
)
ON CONFLICT (id) DO UPDATE SET
    aep_id = EXCLUDED.aep_id,
    posto_trabalho = EXCLUDED.posto_trabalho,
    fator_ergonomico = EXCLUDED.fator_ergonomico,
    acao_proposta = EXCLUDED.acao_proposta,
    tipo_medida = EXCLUDED.tipo_medida,
    responsavel = EXCLUDED.responsavel,
    prazo = EXCLUDED.prazo,
    custo_estimado = EXCLUDED.custo_estimado,
    status = EXCLUDED.status,
    evidencia_conclusao = EXCLUDED.evidencia_conclusao,
    data_conclusao = EXCLUDED.data_conclusao;
