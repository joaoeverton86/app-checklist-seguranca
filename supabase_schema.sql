-- ============================================================
-- SCHEMA DDL - SUPABASE (POSTGRESQL) PARA APP CHECKLIST DE SEGURANÇA
--
-- Regenerado a partir do estado REAL do projeto Supabase (segtrab /
-- qqtcwxvbjmybyzubocgd) em 2026-07-29. As versões anteriores deste
-- arquivo tinham ficado desatualizadas: várias correções de segurança e
-- funcionalidades foram aplicadas direto no SQL Editor do Supabase ao
-- longo de duas sessões e nunca foram trazidas de volta pra cá.
--
-- Cole este script no SQL Editor do seu projeto Supabase e clique em RUN
-- para recriar esta configuração do zero em um projeto novo. Rodar de
-- novo num projeto que já tem os dados é seguro (idempotente) - as
-- tabelas e policies são recriadas com IF NOT EXISTS / DROP+CREATE, sem
-- apagar linhas existentes.
-- ============================================================

-- 1. Tabela de Cadastros (Equipamentos / Veículos / Ativos)
CREATE TABLE IF NOT EXISTS public.cadastros (
    id TEXT PRIMARY KEY,
    tipo TEXT,
    categoria TEXT,
    nome TEXT,
    patrimonio TEXT,
    empresa TEXT,
    placa TEXT,           -- Renomeada de "setor": nunca guardou setor de equipamento,
                           -- sempre foi usada para a placa do veículo (não existe setor
                           -- real para equipamento nesta versão do app).
    obs TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Colaboradores (Usuários / Operadores / Técnicos)
-- ATENÇÃO: as colunas "senha" e "nivel_acesso" são protegidas por privilégios de
-- coluna (ver seção de GRANTs abaixo) - a policy de RLS abaixo continua permissiva,
-- mas o anon key NÃO consegue ler "senha" nem gravar em "senha"/"nivel_acesso"
-- diretamente. Login e alteração de nível passam pelas funções RPC no final deste
-- arquivo (SECURITY DEFINER, rodam com privilégio de dono, ignoram essa restrição
-- de coluna de forma controlada).
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
    responsavel TEXT,       -- nome do Encarregado/Responsável que assina o checklist
                            -- (texto livre, não precisa ter login no app)
    sst TEXT,               -- nome do TST/Engenheiro que assina o checklist
                            -- (texto livre, não precisa ter login no app)
    status_checklist TEXT DEFAULT 'liberado',
    prazo_adequacao TEXT,
    conformes INTEGER DEFAULT 0,
    nao_conformes INTEGER DEFAULT 0,
    na INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    equipment JSONB,
    items JSONB,           -- Cada item pode ter fotoUrl (Supabase Storage, bucket
                            -- nc-fotos) e/ou fotoLocalId (referência só local, nunca
                            -- sincronizada) como evidência de não conformidade.
    signature TEXT,             -- assinatura do Resp. SST, PNG base64 (data URL)
    signature_responsavel TEXT, -- assinatura do Encarregado/Responsável, PNG base64
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

-- 7. Tabela de "Lápides" (Tombstones) - propaga exclusões definitivas entre aparelhos.
-- Sem isso, um aparelho que ainda tem um registro em cache local (nunca soube que foi
-- excluído em outro aparelho) acaba reenviando-o de volta ao Supabase sozinho.
CREATE TABLE IF NOT EXISTS public.deleted_records (
    id BIGSERIAL PRIMARY KEY,
    record_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deleted_records_table_record
    ON public.deleted_records(table_name, record_id);

-- 8. Log de Auditoria - quem criou/editou/excluiu equipamentos, colaboradores e
-- checklists. Ver seção de GRANTs: propositalmente SEM policy de UPDATE/DELETE,
-- então um registro não pode ser alterado ou apagado via API depois de gravado.
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    actor_matricula TEXT,
    actor_nome TEXT,
    action TEXT NOT NULL,        -- 'create' | 'update' | 'delete'
    table_name TEXT NOT NULL,
    record_id TEXT,
    record_label TEXT,
    details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- cadastros, checklists, relatos: policies separadas por comando (leitura/inserção/
-- atualização/exclusão), todas permissivas. As três primeiras existiam desde o início;
-- a de EXCLUSÃO foi adicionada depois - faltava, e isso fazia DELETE pela API
-- responder "sucesso" sem apagar nada (bug real, já corrigido).
DROP POLICY IF EXISTS "Leitura pública cadastros" ON public.cadastros;
DROP POLICY IF EXISTS "Inserção pública cadastros" ON public.cadastros;
DROP POLICY IF EXISTS "Atualização pública cadastros" ON public.cadastros;
DROP POLICY IF EXISTS "Exclusão pública cadastros" ON public.cadastros;
CREATE POLICY "Leitura pública cadastros" ON public.cadastros FOR SELECT USING (true);
CREATE POLICY "Inserção pública cadastros" ON public.cadastros FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública cadastros" ON public.cadastros FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública cadastros" ON public.cadastros FOR DELETE USING (true);

DROP POLICY IF EXISTS "Leitura pública checklists" ON public.checklists;
DROP POLICY IF EXISTS "Inserção pública checklists" ON public.checklists;
DROP POLICY IF EXISTS "Atualização pública checklists" ON public.checklists;
DROP POLICY IF EXISTS "Exclusão pública checklists" ON public.checklists;
CREATE POLICY "Leitura pública checklists" ON public.checklists FOR SELECT USING (true);
CREATE POLICY "Inserção pública checklists" ON public.checklists FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública checklists" ON public.checklists FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública checklists" ON public.checklists FOR DELETE USING (true);

DROP POLICY IF EXISTS "Leitura pública relatos" ON public.relatos;
DROP POLICY IF EXISTS "Inserção pública relatos" ON public.relatos;
DROP POLICY IF EXISTS "Atualização pública relatos" ON public.relatos;
DROP POLICY IF EXISTS "Exclusão pública relatos" ON public.relatos;
CREATE POLICY "Leitura pública relatos" ON public.relatos FOR SELECT USING (true);
CREATE POLICY "Inserção pública relatos" ON public.relatos FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública relatos" ON public.relatos FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública relatos" ON public.relatos FOR DELETE USING (true);

-- colaboradores_checklist, nao_conformidades, checklist_items: mantêm a policy única
-- "acesso total" original (cobre SELECT/INSERT/UPDATE/DELETE de uma vez). Para
-- colaboradores_checklist, a proteção real de senha/nivel_acesso vem dos GRANTs de
-- coluna abaixo, não desta policy.
DROP POLICY IF EXISTS "Acesso total aos colaboradores" ON public.colaboradores_checklist;
CREATE POLICY "Acesso total aos colaboradores" ON public.colaboradores_checklist FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total às não conformidades" ON public.nao_conformidades;
CREATE POLICY "Acesso total às não conformidades" ON public.nao_conformidades FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total aos itens de checklist" ON public.checklist_items;
CREATE POLICY "Acesso total aos itens de checklist" ON public.checklist_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total aos registros excluidos" ON public.deleted_records;
CREATE POLICY "Acesso total aos registros excluidos" ON public.deleted_records FOR ALL USING (true) WITH CHECK (true);

-- audit_log: só leitura e inserção. Sem policy de UPDATE/DELETE = ninguém consegue
-- alterar ou apagar um registro já gravado via API, mesmo tendo a anon key.
DROP POLICY IF EXISTS "Leitura publica audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Insercao publica audit_log" ON public.audit_log;
CREATE POLICY "Leitura publica audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Insercao publica audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- PERMISSÕES (GRANTs) PARA A API REST ANON
-- ============================================================

-- Acesso amplo de tabela para a maioria das tabelas (a policy de RLS acima é quem
-- realmente controla o acesso linha a linha).
GRANT ALL ON public.cadastros, public.checklists, public.relatos,
    public.nao_conformidades, public.checklist_items, public.deleted_records
    TO anon;
GRANT SELECT, INSERT ON public.audit_log TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- colaboradores_checklist: acesso restrito por COLUNA (não pela policy de RLS, que
-- continua permissiva). "senha" nunca é exposta para leitura nem gravação direta;
-- "nivel_acesso" pode ser lida (já aparece na interface) mas só gravada pela função
-- alterar_nivel_acesso() abaixo, que reconfirma credenciais de um Admin antes de agir.
REVOKE ALL ON public.colaboradores_checklist FROM anon;

GRANT SELECT (id, nome, funcao, setor, empresa, matricula, validade_aso, ativo, nivel_acesso, email, created_at)
    ON public.colaboradores_checklist TO anon;

GRANT INSERT (id, nome, funcao, setor, empresa, matricula, validade_aso, ativo, email)
    ON public.colaboradores_checklist TO anon;

-- IMPORTANTE: "id" precisa estar na lista de UPDATE mesmo sem seu valor mudar - o
-- Postgres exige privilégio de UPDATE na coluna usada como alvo do ON CONFLICT em
-- upserts (INSERT ... ON CONFLICT DO UPDATE). Sem isso, todo upsert de colaborador
-- falha com "permission denied" (bug real que já aconteceu aqui).
GRANT UPDATE (id, nome, funcao, setor, empresa, matricula, validade_aso, ativo, email)
    ON public.colaboradores_checklist TO anon;

GRANT DELETE ON public.colaboradores_checklist TO anon;

-- ============================================================
-- FUNÇÕES RPC (SECURITY DEFINER)
-- Rodam com o privilégio do dono da função, então conseguem ler/gravar "senha" e
-- "nivel_acesso" internamente mesmo com os GRANTs de coluna acima bloqueando o
-- acesso direto via API para o anon key.
-- ============================================================

-- Login: confere matrícula/e-mail + senha no servidor (bcrypt, via pgcrypto - schema
-- "extensions" no Supabase, por isso o search_path inclui os dois). Recebe a senha em
-- TEXTO PURO (protegida pelo HTTPS da chamada, não por um hash pré-calculado no
-- cliente) porque bcrypt precisa da senha original pra extrair o sal já embutido no
-- hash salvo e comparar de novo - não dá pra comparar dois hashes bcrypt diretamente
-- como se fazia com SHA-256.
--
-- Migração "preguiçosa" do hash antigo: aceita também o formato legado (SHA-256 sem
-- sal, de antes desta função existir) - se a senha bater nesse formato, regrava o hash
-- em bcrypt na mesma chamada, então cada colaborador migra sozinho no próximo login
-- online, sem precisar redefinir senha manualmente. Devolve a coluna "senha" (o hash)
-- de propósito - quem chamou já provou que sabe a senha correta pra chegar até aqui, e
-- o app de campo cacheia esse valor localmente pra permitir login offline depois.
CREATE OR REPLACE FUNCTION public.verificar_login(p_login text, p_senha text)
 RETURNS TABLE(id text, nome text, funcao text, setor text, empresa text, matricula text, validade_aso text, ativo boolean, nivel_acesso text, email text, senha text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_row colaboradores_checklist%ROWTYPE;
    v_ok boolean := false;
BEGIN
    SELECT * INTO v_row FROM colaboradores_checklist c
    WHERE (upper(c.matricula) = upper(p_login) OR lower(c.email) = lower(p_login))
    LIMIT 1;

    IF NOT FOUND OR v_row.senha IS NULL OR v_row.senha = '' OR p_senha IS NULL OR p_senha = '' THEN
        RETURN;
    END IF;

    IF v_row.senha LIKE '$2%' THEN
        v_ok := (crypt(p_senha, v_row.senha) = v_row.senha);
    ELSE
        v_ok := (v_row.senha = encode(digest(p_senha, 'sha256'), 'hex'));
        IF v_ok THEN
            v_row.senha := crypt(p_senha, gen_salt('bf', 10));
            UPDATE colaboradores_checklist c SET senha = v_row.senha WHERE c.id = v_row.id;
        END IF;
    END IF;

    IF NOT v_ok THEN
        RETURN;
    END IF;

    RETURN QUERY SELECT v_row.id, v_row.nome, v_row.funcao, v_row.setor, v_row.empresa,
        v_row.matricula, v_row.validade_aso, v_row.ativo, v_row.nivel_acesso, v_row.email, v_row.senha;
END;
$function$;

-- Cadastro de conta (signup): cria ou ativa um colaborador com senha, sem nunca deixar
-- o cliente gravar "senha" direto na tabela. Nunca deixa o próprio cadastro definir
-- nivel_acesso diferente de 'Tecnico' (promoção a Admin exige a função abaixo).
-- p_senha aceita tanto texto puro (cadastro comum online, hasheado aqui com bcrypt)
-- quanto um hash bcrypt já pronto (prefixo "$2") vindo de uma conta criada OFFLINE no
-- app - nesse caso o hash precisa ser calculado no aparelho (sem round-trip pro
-- servidor) pra já permitir login offline imediato, e é gravado como veio, sem
-- recalcular por cima.
CREATE OR REPLACE FUNCTION public.cadastrar_conta(
    p_nome text,
    p_email text,
    p_matricula text,
    p_funcao text,
    p_setor text,
    p_senha text
)
 RETURNS TABLE(id text, nome text, funcao text, setor text, empresa text, matricula text, validade_aso text, ativo boolean, nivel_acesso text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_id text := upper(trim(p_matricula));
    v_existing colaboradores_checklist%ROWTYPE;
    v_senha_final text;
BEGIN
    IF v_id = '' OR p_senha IS NULL OR p_senha = '' THEN
        RAISE EXCEPTION 'Matrícula e senha são obrigatórias';
    END IF;

    v_senha_final := CASE WHEN p_senha LIKE '$2%' THEN p_senha ELSE crypt(p_senha, gen_salt('bf', 10)) END;

    SELECT * INTO v_existing FROM colaboradores_checklist c WHERE c.id = v_id;

    IF FOUND THEN
        IF v_existing.senha IS NOT NULL AND v_existing.senha <> '' AND v_existing.ativo IS NOT FALSE THEN
            RAISE EXCEPTION 'Já existe um colaborador ativo com esta matrícula';
        END IF;
        UPDATE colaboradores_checklist c
        SET nome = p_nome,
            email = lower(p_email),
            funcao = p_funcao,
            setor = p_setor,
            senha = v_senha_final,
            ativo = true
        WHERE c.id = v_id;
    ELSE
        INSERT INTO colaboradores_checklist(id, nome, funcao, setor, matricula, email, senha, ativo, nivel_acesso)
        VALUES (v_id, p_nome, p_funcao, p_setor, v_id, lower(p_email), v_senha_final, true, 'Tecnico');
    END IF;

    RETURN QUERY
    SELECT c.id, c.nome, c.funcao, c.setor, c.empresa, c.matricula, c.validade_aso, c.ativo, c.nivel_acesso, c.email
    FROM colaboradores_checklist c WHERE c.id = v_id;
END;
$function$;

-- Usada só pela Edge Function confirmar-recuperacao-senha (via service_role, depois de
-- já ter validado o código OTP de recuperação) - NÃO é liberada pro anon/authenticated
-- de propósito, já que recebe o id direto sem nenhuma verificação de senha atual.
CREATE OR REPLACE FUNCTION public.definir_senha_colaborador(p_colaborador_id text, p_senha text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_hash text;
BEGIN
    IF p_senha IS NULL OR p_senha = '' THEN
        RAISE EXCEPTION 'Senha não pode ser vazia';
    END IF;
    v_hash := crypt(p_senha, gen_salt('bf', 10));
    UPDATE colaboradores_checklist SET senha = v_hash WHERE id = p_colaborador_id;
    RETURN v_hash;
END;
$function$;

-- Promover/rebaixar nível de acesso: exige matrícula + hash de senha de um Admin ATIVO
-- já existente, reconfirmados no servidor. Sem isso, qualquer pessoa com a anon key
-- poderia se autopromover a Admin direto pela API (era exatamente esse o bug original).
CREATE OR REPLACE FUNCTION public.alterar_nivel_acesso(
    p_admin_matricula text,
    p_admin_senha_hash text,
    p_target_id text,
    p_novo_nivel text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_admin_ok boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM colaboradores_checklist c
        WHERE upper(c.matricula) = upper(p_admin_matricula)
          AND c.senha = p_admin_senha_hash
          AND c.nivel_acesso ILIKE 'admin%'
          AND c.ativo IS NOT FALSE
    ) INTO v_admin_ok;

    IF NOT v_admin_ok THEN
        RAISE EXCEPTION 'Não autorizado: credenciais de administrador inválidas';
    END IF;

    UPDATE colaboradores_checklist
    SET nivel_acesso = p_novo_nivel
    WHERE id = upper(trim(p_target_id));

    RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verificar_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cadastrar_conta(text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.alterar_nivel_acesso(text, text, text, text) TO anon;

REVOKE ALL ON FUNCTION public.definir_senha_colaborador(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.definir_senha_colaborador(text, text) TO service_role;

-- ============================================================
-- SUPABASE STORAGE - fotos de evidência de não conformidade
-- ============================================================

-- Bucket público: leitura de foto não exige autenticação (facilita exibir <img src=
-- direto no app e no PDF exportado); upload/edição/exclusão exigem a anon key via
-- policy, igual às tabelas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('nc-fotos', 'nc-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Leitura publica de fotos nc" ON storage.objects;
CREATE POLICY "Leitura publica de fotos nc" ON storage.objects
    FOR SELECT USING (bucket_id = 'nc-fotos');

DROP POLICY IF EXISTS "Upload de fotos nc via anon" ON storage.objects;
CREATE POLICY "Upload de fotos nc via anon" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'nc-fotos');

DROP POLICY IF EXISTS "Atualizacao de fotos nc via anon" ON storage.objects;
CREATE POLICY "Atualizacao de fotos nc via anon" ON storage.objects
    FOR UPDATE USING (bucket_id = 'nc-fotos') WITH CHECK (bucket_id = 'nc-fotos');

DROP POLICY IF EXISTS "Exclusao de fotos nc via anon" ON storage.objects;
CREATE POLICY "Exclusao de fotos nc via anon" ON storage.objects
    FOR DELETE USING (bucket_id = 'nc-fotos');

-- ============================================================
-- RECUPERAÇÃO DE SENHA (OTP por e-mail)
-- ============================================================

-- Códigos de recuperação de senha (OTP de 6 dígitos). Sem policy de RLS para
-- anon/authenticated: só as Edge Functions abaixo (com a service_role key) leem/
-- escrevem aqui, então nem precisa de policy permissiva - RLS habilitado sem
-- nenhuma policy já bloqueia o anon key por completo.
CREATE TABLE IF NOT EXISTS public.password_resets (
    id BIGSERIAL PRIMARY KEY,
    colaborador_id TEXT NOT NULL REFERENCES public.colaboradores_checklist(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_colaborador ON public.password_resets(colaborador_id, created_at DESC);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.password_resets FROM anon, authenticated;

-- Duas Edge Functions (código em supabase/functions/, deployadas via painel/CLI do
-- Supabase - não são SQL, por isso só documentadas aqui):
--   - solicitar-recuperacao-senha: recebe { login } (matrícula ou e-mail), gera um
--     OTP de 6 dígitos, guarda o hash SHA-256 em password_resets (expira em 10 min,
--     limite de 1 pedido/min por colaborador) e envia por e-mail via Resend. Sempre
--     responde a mesma mensagem genérica de sucesso, exista ou não a conta, pra não
--     vazar quais matrículas/e-mails estão cadastrados.
--   - confirmar-recuperacao-senha: recebe { login, otp, nova_senha } (senha em texto
--     puro, protegida pelo HTTPS da chamada), valida o código mais recente não usado
--     (máx. 5 tentativas, expira em 10 min) e, se bater, chama a RPC
--     definir_senha_colaborador (que faz o hash bcrypt de verdade no Postgres) e
--     devolve o novo hash na resposta pro app cachear localmente.
-- Ambas rodam com a service_role key (bypassa RLS e os GRANTs de coluna de
-- "senha"), então precisam do secret RESEND_API_KEY configurado no projeto
-- (Project Settings > Edge Functions > Secrets) para o envio de e-mail funcionar.

-- ============================================================
-- MÓDULO DE EXTINTORES (Fase 1 - cadastro; sem relação com cadastros/checklists
-- de equipamento, por pedido explícito de manter esse domínio isolado)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.extintores (
    id TEXT PRIMARY KEY,                  -- ID/tag único, normalizado UPPERCASE (payload do QR Code)
    tipo TEXT,                            -- PQS / CO2 / Água / Espuma / etc.
    capacidade TEXT,                      -- ex: "6 kg", "10 L"
    setor TEXT,
    localizacao TEXT,                     -- descrição livre do ponto de fixação
    fabricacao TEXT,
    ultima_recarga TEXT,
    proxima_recarga TEXT,                 -- "vencimento" usado nos alertas (Fase 3) - auto: ultima_recarga + 1 ano (painel)
    ultimo_teste_hidrostatico TEXT,       -- data em que o teste foi de fato realizado
    proximo_teste_hidrostatico TEXT,      -- ciclo de 5 anos (NBR 12962) - auto: ultimo_teste_hidrostatico (ou fabricacao) + 5 anos (painel)
    ativo BOOLEAN DEFAULT true,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.extintores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos extintores" ON public.extintores;
CREATE POLICY "Acesso total aos extintores" ON public.extintores FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.extintores TO anon;

-- Fase 2: inspeção mensal (registro de cada inspeção visual feita via QR Code).
CREATE TABLE IF NOT EXISTS public.inspecoes_extintores (
    id TEXT PRIMARY KEY,                  -- Date.now().toString(), igual ao padrão de checklists.id
    extintor_id TEXT REFERENCES public.extintores(id) ON DELETE CASCADE,
    date TEXT,
    inspetor TEXT,
    status_geral TEXT DEFAULT 'conforme', -- conforme | nao_conforme
    conformes INTEGER DEFAULT 0,
    nao_conformes INTEGER DEFAULT 0,
    na INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    items JSONB,                          -- mesmo formato de checklists.items: {itemId: {status, observation}}
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspecoes_extintores_extintor_id ON public.inspecoes_extintores(extintor_id);

ALTER TABLE public.inspecoes_extintores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total às inspeções de extintores" ON public.inspecoes_extintores;
CREATE POLICY "Acesso total às inspeções de extintores" ON public.inspecoes_extintores FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.inspecoes_extintores TO anon;

-- Fase 3 (painel de vencimento) ainda não implementada.

-- ============================================================
-- MÓDULO DE TREINAMENTOS (verificação de validade de treinamento/DDS por
-- colaborador - inclui TODOS os temas, não só NRs formais, porque a contagem
-- de DDS entra no índice HHT/Efetivo exigido pelo cliente)
-- ============================================================

-- Catálogo oficial de treinamentos (fonte: CADASTRO_TREINAMENTOS.xlsx do cliente).
CREATE TABLE IF NOT EXISTS public.treinamentos_catalogo (
    id TEXT PRIMARY KEY,                  -- código oficial ("Nº" da planilha)
    nome TEXT NOT NULL,
    carga_horaria NUMERIC,                -- horas
    meses_validade INTEGER,               -- NULL = sem validade/não recicla (ex: DDS pontual)
    -- Alimentam o Registro de Treinamento (FOR.001.R00, ver treinamentos_realizados
    -- abaixo) - mudam só por TEMA, valem pra toda sessão desse treinamento.
    objetivo TEXT,
    conteudo_programatico TEXT,           -- texto livre multi-linha, um tópico por linha
    metodo_avaliacao TEXT DEFAULT 'Entendimento Participante',
    -- Alimentam os documentos individuais de admissão/integração gerados na aba Registro
    -- (Certificado, Declaração de Integração FORM.SMS.001, Termo de Conhecimento -
    -- Direito de Recusa FORM.SMS.002). Ficam editáveis aqui de propósito: citações de
    -- NR não são verificáveis com segurança por IA, então quem corrige é o responsável
    -- técnico, direto no cadastro, sem precisar de alteração de código.
    certificado_base_legal TEXT,
    integracao_base_legal TEXT,
    integracao_obrigacoes_empresa TEXT,     -- uma obrigação por linha
    integracao_obrigacoes_empregado TEXT,   -- uma obrigação por linha
    integracao_programa TEXT,               -- grade de tópicos do treinamento de integração, um por linha
    recusa_base_legal TEXT,
    -- Banco de questões da prova de eficácia (opcional) - [{pergunta, alternativas:[a,b,c,d], correta:0-3}].
    -- Só treinamentos com pelo menos 1 questão aqui ganham os botões de gerar
    -- prova/gabarito na aba Registro (gerarProvaTurma/gerarGabaritoProva) - sem banco
    -- cadastrado, sem prova fabricada.
    questoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.treinamentos_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total ao catálogo de treinamentos" ON public.treinamentos_catalogo;
CREATE POLICY "Acesso total ao catálogo de treinamentos" ON public.treinamentos_catalogo FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.treinamentos_catalogo TO anon;

-- Histórico completo de sessões realizadas (importado da planilha mensal de campo -
-- listas de presença assinadas em papel, lançadas depois pela web). id determinístico
-- (matrícula_código_data) + upsert por on_conflict torna a reimportação idempotente.
CREATE TABLE IF NOT EXISTS public.treinamentos_realizados (
    id TEXT PRIMARY KEY,
    matricula TEXT NOT NULL,
    nome TEXT,
    funcao TEXT,
    setor TEXT,
    status_colaborador TEXT,
    treinamento_cod TEXT,                 -- FK "solta" pra treinamentos_catalogo.id (sem FK real por causa de códigos sintéticos residuais)
    treinamento_nome TEXT,
    carga_horaria NUMERIC,
    data_treinamento DATE,
    meses_validade INTEGER,               -- copiado do catálogo no momento da importação
    data_proxima_reciclagem DATE,         -- data_treinamento + meses_validade, calculado na importação
    observacoes TEXT,
    -- Campos por SESSÃO (mesma código+data) pro Registro de Treinamento (FOR.001.R00) -
    -- duplicados por colaborador na mesma linha, mesmo padrão já usado acima pra
    -- nome/função/setor, em vez de uma tabela "sessões" separada só pra isso.
    numero_turma TEXT,
    hora_inicio TEXT,                     -- "HH:MM"
    hora_termino TEXT,
    local_realizacao TEXT,
    encarregado_responsavel TEXT,
    instrutor_nome TEXT DEFAULT 'MARIA GESSICA DA SILVA ROQUE',
    instrutor_qualificacao TEXT DEFAULT 'TEC. SEG. TRABALHO',
    instrutor_registro TEXT DEFAULT 'MTE: 15760/PE',              -- exigido no Certificado Individual (segurança jurídica)
    responsavel_tecnico_nome TEXT DEFAULT 'JOÃO EVERTON DE SOUZA LIMEIRA',
    responsavel_tecnico_qualificacao TEXT DEFAULT 'ENG. SEG. TRABALHO',
    responsavel_tecnico_registro TEXT DEFAULT 'CREA: 0522078320', -- exigido no Certificado Individual (segurança jurídica)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.treinamentos_realizados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos treinamentos realizados" ON public.treinamentos_realizados;
CREATE POLICY "Acesso total aos treinamentos realizados" ON public.treinamentos_realizados FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.treinamentos_realizados TO anon;

-- View de "status atual": última sessão de cada (matrícula, treinamento), usada pelo
-- app de campo (sincronização incremental, nunca a tabela cheia) e pelo painel.
CREATE OR REPLACE VIEW public.treinamentos_status AS
SELECT DISTINCT ON (matricula, treinamento_cod)
    matricula || '_' || treinamento_cod AS id,
    matricula, nome, funcao, setor, status_colaborador,
    treinamento_cod, treinamento_nome, carga_horaria,
    data_treinamento, meses_validade, data_proxima_reciclagem, created_at
FROM public.treinamentos_realizados
WHERE treinamento_cod IS NOT NULL
ORDER BY matricula, treinamento_cod, data_treinamento DESC NULLS LAST, created_at DESC;

-- Efetivo (cadastro de RH - fonte: TREINAMENTOS_EFETIVO.xlsx, aba EFETIVO_COP_RAMAL_DO_AGRESTE).
-- Inclui CPF e data de nascimento por decisão explícita do cliente, ciente de que o
-- acesso é via chave pública (anon), sem autenticação real no banco.
CREATE TABLE IF NOT EXISTS public.colaboradores_efetivo (
    id TEXT PRIMARY KEY,                  -- matrícula
    status TEXT,
    cpf TEXT,
    rg TEXT,   -- usado na Ordem de Serviço (Kit de Integração) - em branco até ser preenchido, não obrigatório pro resto do sistema
    nome TEXT,
    funcao TEXT,
    setor TEXT,
    responsavel TEXT,
    dt_admissao DATE,
    dt_demissao DATE,
    dt_nascimento DATE,
    cidade TEXT,
    estado TEXT,
    estabilidade TEXT,
    ghe TEXT,
    calca TEXT,
    camisa TEXT,
    bota TEXT,
    sexo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.colaboradores_efetivo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total ao efetivo" ON public.colaboradores_efetivo;
CREATE POLICY "Acesso total ao efetivo" ON public.colaboradores_efetivo FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.colaboradores_efetivo TO anon;

CREATE TABLE IF NOT EXISTS public.acidentes (
    id TEXT PRIMARY KEY,
    data_acidente DATE NOT NULL,
    matricula TEXT,
    nome_colaborador TEXT,
    funcao TEXT,
    setor TEXT,
    tipo_acidente TEXT,
    com_afastamento BOOLEAN DEFAULT false,
    dias_perdidos INTEGER DEFAULT 0,
    dias_debitados INTEGER DEFAULT 0,
    parte_corpo TEXT,
    agente_causador TEXT,
    local TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.acidentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos acidentes" ON public.acidentes;
CREATE POLICY "Acesso total aos acidentes" ON public.acidentes FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.acidentes TO anon;

CREATE INDEX IF NOT EXISTS idx_acidentes_data ON public.acidentes(data_acidente);
CREATE INDEX IF NOT EXISTS idx_acidentes_com_afastamento ON public.acidentes(com_afastamento);

CREATE TABLE IF NOT EXISTS public.hht_dias_trabalhados (
    id TEXT PRIMARY KEY,               -- 'YYYY-MM'
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dias_trabalhados INTEGER,
    horas_por_dia INTEGER DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hht_dias_trabalhados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total ao hht dias trabalhados" ON public.hht_dias_trabalhados;
CREATE POLICY "Acesso total ao hht dias trabalhados" ON public.hht_dias_trabalhados FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.hht_dias_trabalhados TO anon;

-- ============================================================
-- SAÚDE OCUPACIONAL (NR-07 / PCMSO)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.aso_exames (
    id TEXT PRIMARY KEY,
    matricula TEXT,
    nome_colaborador TEXT,
    funcao TEXT,
    setor TEXT,
    tipo_aso TEXT,                        -- admissional | periodico | demissional | retorno_trabalho | mudanca_risco
    data_exame DATE NOT NULL,
    data_vencimento DATE,                 -- validade deste exame / próximo exame devido - preenchido manualmente
                                           -- (periodicidade da NR-07 varia por grau de risco/GHE, não é um intervalo fixo)
    resultado TEXT,                       -- apto | apto_restricao | inapto
    medico_responsavel TEXT,
    obs TEXT,
    exames_detalhe JSONB,                 -- array de {nome, periodicidade, data_vencimento} - um
                                           -- item por exame do GHE efetivamente marcado como feito
                                           -- nesta consulta, cada um com seu próprio vencimento.
                                           -- Permite à Previsão de Exames calcular quando CADA exame
                                           -- vence de verdade, em vez de assumir que todos os exames
                                           -- do GHE vencem junto com o ciclo geral do ASO.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.aso_exames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos exames ASO" ON public.aso_exames;
CREATE POLICY "Acesso total aos exames ASO" ON public.aso_exames FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.aso_exames TO anon;

CREATE INDEX IF NOT EXISTS idx_aso_matricula ON public.aso_exames(matricula);
CREATE INDEX IF NOT EXISTS idx_aso_data_exame ON public.aso_exames(data_exame);

CREATE TABLE IF NOT EXISTS public.atestados_ocupacionais (
    id TEXT PRIMARY KEY,
    matricula TEXT,
    nome_colaborador TEXT,
    funcao TEXT,
    setor TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_afastamento INTEGER DEFAULT 0,
    motivo TEXT,                          -- descrição curta da doença ocupacional (sem CID)
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.atestados_ocupacionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos atestados ocupacionais" ON public.atestados_ocupacionais;
CREATE POLICY "Acesso total aos atestados ocupacionais" ON public.atestados_ocupacionais FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.atestados_ocupacionais TO anon;

CREATE INDEX IF NOT EXISTS idx_atest_matricula ON public.atestados_ocupacionais(matricula);
CREATE INDEX IF NOT EXISTS idx_atest_data_inicio ON public.atestados_ocupacionais(data_inicio);

-- ============================================================
-- GERENCIAMENTO DE ITENS DE CHECKLIST POR TIPO DE EQUIPAMENTO
-- ============================================================
-- Antes desta tabela, a tela "Gerenciar Itens" do app.js gravava só no localStorage
-- do dispositivo (custom_type_settings) - uma alteração feita no celular de um técnico
-- não aparecia em nenhum outro aparelho, nem no site. Esta tabela vira a fonte de
-- verdade compartilhada: uma linha por tipo de equipamento (id = EQUIPMENT_TYPES[...].id
-- em data.js), sincronizada tanto pelo painel quanto pelo app de campo.
CREATE TABLE IF NOT EXISTS public.checklist_item_settings (
    id TEXT PRIMARY KEY,                        -- id do tipo de equipamento (ex: 'trator_esteira')
    categoria TEXT NOT NULL,                    -- 'maquinas' | 'veiculos' | 'ferramentas'
    disabled_items JSONB DEFAULT '[]'::jsonb,   -- array de ids de itens base desativados
    custom_items JSONB DEFAULT '[]'::jsonb,     -- array de {id, text, nr, risk}
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checklist_item_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total a checklist item settings" ON public.checklist_item_settings;
CREATE POLICY "Acesso total a checklist item settings" ON public.checklist_item_settings FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.checklist_item_settings TO anon;

-- ============================================================
-- MÓDULO DE EPI (NR-06) - Cadastro, Estoque, Entregas
-- Fonte histórica: TB_LACAMENTO.csv (export SharePoint, 6.520 entregas
-- desde 2024-07-12). id de epi_catalogo = ID_EPI do CSV quando consistente;
-- pros ~8 códigos que o SharePoint reusou pra itens com CA diferente ao
-- longo do tempo, sufixo -2/-3 (CA é o que importa pra compliance, não o
-- código interno antigo).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.epi_catalogo (
    id TEXT PRIMARY KEY,
    tipo_protecao TEXT,                   -- maos | pes | cabeca | olhos | rosto | respiratorio | corpo | altura | audicao | outro
    descricao TEXT NOT NULL,
    marca TEXT,
    tamanho TEXT,
    ca TEXT,                              -- Certificado de Aprovação (NR-06)
    ca_validade DATE,                     -- vencimento do CA - alimenta o alerta vencidos/vencendo (30 dias) na Visão Geral de EPI
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.epi_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao catálogo de EPI" ON public.epi_catalogo;
CREATE POLICY "Acesso total ao catálogo de EPI" ON public.epi_catalogo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.epi_catalogo TO anon;

-- Saldo de estoque: 1 linha por item de catálogo. O CSV de entregas (log de saída)
-- não tem contagem de estoque, mas a lista oficial "Cadastro de EPI" do SharePoint
-- (cad_epi.csv) tem uma coluna ESTOQ real - seedado de lá em 2026-08-07. Itens sem
-- correspondência nessa lista continuam sem controle até uma Entrada manual.
CREATE TABLE IF NOT EXISTS public.epi_estoque (
    epi_catalogo_id TEXT PRIMARY KEY REFERENCES public.epi_catalogo(id) ON DELETE CASCADE,
    quantidade_atual INTEGER NOT NULL DEFAULT 0,
    quantidade_minima INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.epi_estoque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao estoque de EPI" ON public.epi_estoque;
CREATE POLICY "Acesso total ao estoque de EPI" ON public.epi_estoque FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.epi_estoque TO anon;

-- Log de entregas - linha central do módulo, mesmo papel de inspecoes_extintores/
-- treinamentos_realizados. Entregas históricas importadas do CSV usam
-- id = 'LEGACY_' || ID (chave determinística da própria planilha, upsert por
-- on_conflict torna a reimportação idempotente) e entregue_por/assinatura NULL,
-- já que o SharePoint não guardava quem de fato entregou.
CREATE TABLE IF NOT EXISTS public.epi_entregas (
    id TEXT PRIMARY KEY,
    matricula TEXT NOT NULL,
    nome TEXT,
    funcao TEXT,
    setor TEXT,
    epi_catalogo_id TEXT REFERENCES public.epi_catalogo(id),
    quantidade INTEGER NOT NULL DEFAULT 1,
    data_entrega DATE NOT NULL,
    tipo_entrega TEXT,                    -- inicial | reposicao | troca
    motivo_reposicao TEXT,                -- perda | dano | desgaste | troca_tamanho | vencimento (só lançamentos novos)
    entregue_por TEXT,                    -- matrícula/nome do técnico que lançou (NULL no histórico importado)
    assinatura TEXT,                      -- PNG base64, mesmo padrão de checklists.signature
    observacoes TEXT,
    origem TEXT DEFAULT 'APP',            -- 'IMPORT_HISTORICO' | 'APP'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.epi_entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total às entregas de EPI" ON public.epi_entregas;
CREATE POLICY "Acesso total às entregas de EPI" ON public.epi_entregas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.epi_entregas TO anon;

CREATE INDEX IF NOT EXISTS idx_epi_entregas_matricula ON public.epi_entregas(matricula);
CREATE INDEX IF NOT EXISTS idx_epi_entregas_catalogo ON public.epi_entregas(epi_catalogo_id);
CREATE INDEX IF NOT EXISTS idx_epi_entregas_data ON public.epi_entregas(data_entrega);

-- ============================================================
-- MÓDULO DE GHE (Grupo Homogêneo de Exposição)
-- Catálogo oficial importado do "Quadro Funcional" exportado do sistema de GHE da
-- empresa (.xls/.xlsx real, parseado no navegador via SheetJS - ver
-- importarQuadroFuncionalXLS em dashboard.js). id = número do grupo com 2 dígitos
-- ("01".."27"), mesma convenção já usada em colaboradores_efetivo.ghe (campo texto
-- livre pré-existente). Uma linha por grupo, cargos guardados como jsonb em vez de
-- tabela filha - nunca são consultados/filtrados individualmente fora da tela de
-- detalhe do próprio grupo. Independente do GHE usado no PCMSO
-- (PCMSO_SETOR_FUNCAO_GHE, hardcoded em dashboard.js), que resolve por setor+função
-- e não lê este campo/tabela - são duas classificações de origem diferente.
-- ============================================================

-- riscos: reconhecimento oficial de exposições ambientais por GHE, extraído do Mapa de
-- Riscos (laudo da Clínica ENGMED, PGR/NR-01) - [{tipo_agente, agente, gravidade,
-- gravidade_label, fontes_geradoras, tipo_tempo_exposicao, descricao, danos_saude,
-- sugestoes, epis_recomendados, epcs_recomendados, situacao_controle}]. NÃO é o mesmo
-- dado da matriz P×S da APR (apr_registros.riscos): este é reconhecimento por
-- função/setor pra fins de PCMSO/GFIP/compliance, a APR é avaliação por tarefa/equipe
-- pontual válida 15 dias. A maioria dos GHEs administrativos legitimamente tem
-- riscos=[] - reflete o próprio laudo ("Não foram identificados riscos
-- significativos"), não é campo vazio por falta de dado.
-- conclusoes: {gfip_codigo, gfip_descricao, periculosidade, insalubridade} - conclusão
-- legal do laudo por GHE (compliance, não muda por colaborador). Ambos riscos e
-- conclusoes são editáveis pelo Painel Gerencial (aba Efetivo > GHE > Editar), não só
-- importados - o laudo original só tinha exposições reais pro Grupo 27; os demais 26
-- grupos concluíram "sem riscos significativos" e ficam riscos=[] até um laudo futuro
-- (ou preenchimento manual) trazer dado novo.
CREATE TABLE IF NOT EXISTS public.ghe_catalogo (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cargos JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{cargo, funcao, cbo, quantidade, descricao_atividade, agentes:{fisico,quimico,biologico,ergonomico,acidentes}, epis_necessarios:[], epcs_necessarios:[]}] - descricao_atividade extraída do texto oficial do CBO no Mapa de Riscos; agentes/epis/epcs alimentam a Ordem de Serviço (Kit de Integração), editáveis por cargo no Painel Gerencial
    quantidade_oficial INTEGER NOT NULL DEFAULT 0,
    riscos JSONB NOT NULL DEFAULT '[]'::jsonb,
    conclusoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ghe_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao catálogo de GHE" ON public.ghe_catalogo;
CREATE POLICY "Acesso total ao catálogo de GHE" ON public.ghe_catalogo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ghe_catalogo TO anon;

-- ============================================================
-- MÓDULO DE GESTÃO AMBIENTAL (Fase 1: Gestão de Resíduos)
-- Gatilho real: cliente (Ministério da Integração) pediu a relação de todos os resíduos
-- gerados pela empresa, que nunca foi catalogada. Licenças/Condicionantes/Compromissos/
-- Relatórios Gerenciais ficam pra uma fase futura (precisa de dado real do usuário pra
-- basear, não fabricar uma estrutura de licenciamento ambiental genérica).
-- ============================================================

-- Estimativa mensal de resíduo de refeições (isopor de quentinha + copo descartável) -
-- peso NÃO fica guardado aqui, é calculado ao vivo no dashboard a partir de constantes
-- documentadas na planilha original do usuário (isopor limpo 8,9g + contaminação
-- orgânica 15g = 23,9g/quentinha; copo PP 200ml = 1,8g/unidade). id = 'YYYY-MM', mesma
-- convenção de hht_dias_trabalhados.
CREATE TABLE IF NOT EXISTS public.residuos_refeicoes (
    id TEXT PRIMARY KEY,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    quentinhas_qtd INTEGER,
    copos_qtd INTEGER,
    observacoes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.residuos_refeicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a resíduos de refeições" ON public.residuos_refeicoes;
CREATE POLICY "Acesso total a resíduos de refeições" ON public.residuos_refeicoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.residuos_refeicoes TO anon;

-- Log unificado de manutenção veicular terceirizada (preventivas + trocas de óleo -
-- mesma estrutura nos dois relatórios da terceira, só o `tipo` muda). `litros_oleo` só
-- é relevante pra tipo='troca_oleo' e fica NULL em todo o histórico importado (a
-- terceira nunca informou volume até agora) - captura nova pedida pelo usuário pra ser
-- preenchida manualmente a partir de agora, a cada troca lançada pelo painel.
CREATE TABLE IF NOT EXISTS public.manutencao_veicular (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,                   -- 'preventiva' | 'troca_oleo'
    ativo TEXT,
    modelo TEXT,
    equipamento TEXT,
    empresa TEXT,                         -- empresa terceira (ex: ARTEC, AR LOCAÇÕES)
    descricao_servico TEXT,
    data_servico DATE,
    litros_oleo NUMERIC,
    observacoes TEXT,
    origem TEXT DEFAULT 'APP',            -- 'IMPORT_HISTORICO' | 'APP'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manutencao_veicular ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total à manutenção veicular" ON public.manutencao_veicular;
CREATE POLICY "Acesso total à manutenção veicular" ON public.manutencao_veicular FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.manutencao_veicular TO anon;

-- ============================================================
-- CIPA (Comissão Interna de Prevenção de Acidentes) - Fase 1: Reuniões e Atas
-- ============================================================

-- Roster atual da CIPA. gestao é o texto livre da gestão em curso (ex: '2026/2027').
CREATE TABLE IF NOT EXISTS public.cipa_membros (
    id TEXT PRIMARY KEY,
    matricula TEXT,
    nome TEXT NOT NULL,
    funcao TEXT,
    setor TEXT,
    cargo TEXT,          -- 'titular_empregado' | 'suplente_empregado' | 'titular_empregador' | 'suplente_empregador'
    papel TEXT,          -- 'presidente' | 'vice_presidente' | 'secretario' | NULL - usado pra montar a ata (presença agrupada + bloco de assinaturas)
    gestao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cipa_membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos membros da CIPA" ON public.cipa_membros;
CREATE POLICY "Acesso total aos membros da CIPA" ON public.cipa_membros FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_membros TO anon;

-- Uma linha por reunião (agendada ou já realizada). participantes fica jsonb (não
-- tabela filha) por só ser consultado dentro do próprio registro da reunião, mesmo
-- padrão já usado em ghe_catalogo.cargos.
CREATE TABLE IF NOT EXISTS public.cipa_reunioes (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,   -- 'posse' | 'ordinaria' | 'extraordinaria'
    numero_ordinaria INTEGER,
    data_reuniao DATE NOT NULL,
    horario TEXT,
    hora_termino TEXT,
    local TEXT,
    modalidade TEXT DEFAULT 'presencial',  -- 'presencial' | 'videoconferencia'
    cidade_uf TEXT,                        -- ex: 'Sertânia - PE' - usado no fecho de assinatura da ata
    descricao TEXT,
    pauta JSONB DEFAULT '[]'::jsonb,              -- [{texto}] - itemizado, mesmo modelo da ata em papel (FOR.016.SMS)
    assuntos_tratados JSONB DEFAULT '[]'::jsonb,  -- [{texto, resposta, responsavel}] - itemizado
    -- Estatísticas de acidentes da seção 4.1 da ata: CPT/SPT são calculados ao vivo a
    -- partir da tabela `acidentes` (não guardados aqui). Quase-acidente e trajeto ficam
    -- manuais porque a tabela `acidentes` não distingue esses dois casos hoje.
    quase_acidentes_qtd INTEGER,
    acidentes_trajeto_qtd INTEGER,
    detalhamento_acidentes TEXT,
    acoes_assedio TEXT,      -- seção 4.2 da ata
    relato_inspecoes TEXT,   -- seção 4.3 da ata
    status TEXT DEFAULT 'agendada',  -- 'agendada' | 'realizada' | 'cancelada'
    participantes JSONB DEFAULT '[]'::jsonb,  -- [{matricula, nome, funcao, presente, justificativa}]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cipa_reunioes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total às reuniões da CIPA" ON public.cipa_reunioes;
CREATE POLICY "Acesso total às reuniões da CIPA" ON public.cipa_reunioes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_reunioes TO anon;

-- Pendências geradas nas reuniões. reuniao_id é FK solta pra cipa_reunioes.id (mesmo
-- padrão sem constraint real já usado por treinamento_cod).
CREATE TABLE IF NOT EXISTS public.cipa_plano_acao (
    id TEXT PRIMARY KEY,
    reuniao_id TEXT,
    descricao TEXT NOT NULL,
    responsavel TEXT,
    prazo DATE,
    status TEXT DEFAULT 'pendente',  -- 'pendente' | 'em_andamento' | 'concluido'
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cipa_plano_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao plano de ação da CIPA" ON public.cipa_plano_acao;
CREATE POLICY "Acesso total ao plano de ação da CIPA" ON public.cipa_plano_acao FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.cipa_plano_acao TO anon;

-- ============================================================
-- CONTROLE DE DOCUMENTOS - codificação padronizada, matriz de revisões e log de
-- emissões pros documentos gerados pelo sistema (Registro de Treinamento, Ficha de EPI,
-- Declaração de Integração, Termo de Recusa, Ata da CIPA, Certificado Individual, e
-- outros tipos ainda sem gerador implementado como a APR).
-- ============================================================

-- Lista mestra: 1 linha por TIPO de documento. `codigo`/`revisao_atual` viram a fonte
-- real lida pelos geradores (dashboard.js) na hora de montar o cabeçalho do PDF - mudar
-- aqui reflete automaticamente no próximo documento gerado, sem editar código.
CREATE TABLE IF NOT EXISTS public.documentos_controle (
    id TEXT PRIMARY KEY,             -- slug: 'registro_treinamento', 'ficha_epi', 'apr'...
    nome TEXT NOT NULL,
    codigo TEXT,                     -- ex: 'FOR.001' - NULL quando o documento ainda não tem código formal (não inventado)
    revisao_atual TEXT,              -- ex: 'R00'
    data_revisao_atual DATE,
    elaborado_por TEXT,
    aprovado_por TEXT,
    motivo_revisao_atual TEXT,
    status TEXT DEFAULT 'vigente',   -- 'vigente' | 'obsoleto' | 'em_elaboracao'
    modulo_relacionado TEXT,         -- texto livre: 'Treinamentos' | 'EPI' | 'CIPA' | ...
    gerador_vinculado TEXT,          -- chave interna que os geradores JS usam pra se identificar
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos_controle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao controle de documentos" ON public.documentos_controle;
CREATE POLICY "Acesso total ao controle de documentos" ON public.documentos_controle FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.documentos_controle TO anon;

-- Matriz de histórico: registro append-only de cada revisão já aplicada a um documento
-- (mesmo padrão "child append-only + snapshot no pai" já usado por cipa_plano_acao).
CREATE TABLE IF NOT EXISTS public.documentos_revisoes (
    id TEXT PRIMARY KEY,
    documento_id TEXT,               -- FK solta pra documentos_controle.id
    revisao TEXT NOT NULL,
    data DATE,
    descricao_alteracao TEXT,
    responsavel TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos_revisoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total às revisões de documentos" ON public.documentos_revisoes;
CREATE POLICY "Acesso total às revisões de documentos" ON public.documentos_revisoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.documentos_revisoes TO anon;

-- Log de emissão: toda vez que um dos geradores realmente produz um PDF, grava aqui
-- (automaticamente, sem ação manual) qual revisão estava vigente naquele momento -
-- permite detectar depois se algum documento foi emitido com revisão já superada.
CREATE TABLE IF NOT EXISTS public.documentos_emissoes (
    id TEXT PRIMARY KEY,
    documento_id TEXT,               -- FK solta pra documentos_controle.id
    revisao_no_momento TEXT,
    referencia TEXT,                 -- texto livre: nome do colaborador, "Ata Reunião nº7", etc.
    gerado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documentos_emissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total às emissões de documentos" ON public.documentos_emissoes;
CREATE POLICY "Acesso total às emissões de documentos" ON public.documentos_emissoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.documentos_emissoes TO anon;

-- Cronograma de treinamentos: mesa de planejamento do que já foi realizado ou vai
-- acontecer (mesmo modelo do "Plano Mensal de Treinamentos de SMS" em planilha que a
-- equipe já usa: Código, Treinamento, Data, Horário, Local, Responsável). É só uma
-- tabela de acompanhamento - não guarda quem participa nem gera documento nenhum
-- (isso é tudo responsabilidade da aba Registro, ver "Nova Sessão" e
-- gerarListasCronogramaMes em dashboard.js). Não duplica treinamento_nome de propósito
-- - resolve o nome ao vivo via treinamentos_catalogo (evita nome desatualizado se o
-- catálogo for editado/mesclado depois). status 'planejado'|'lancado' (sem CHECK, mesmo
-- padrão do resto do projeto) reflete só se a presença já foi lançada em
-- treinamentos_realizados a partir deste item; lancado_em é preenchido nesse momento
-- (ver salvarLancamentoTreinamento em dashboard.js). `local` e `responsavel` são texto
-- livre (sem lista fixa) - o segundo pode ser tanto uma frente de serviço real
-- (usada pra pré-carregar equipe no Registro/Lançar Treinamento) quanto só a área de
-- SMS dona do tema (ex: "Segurança", "Saúde"), como no plano em papel.
CREATE TABLE IF NOT EXISTS public.treinamentos_cronograma (
    id TEXT PRIMARY KEY,
    data_prevista DATE NOT NULL,
    treinamento_cod TEXT NOT NULL,   -- FK solta pra treinamentos_catalogo.id
    horario TEXT,
    local TEXT,
    responsavel TEXT,
    status TEXT DEFAULT 'planejado',
    observacoes TEXT,
    lancado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data_realizada DATE,             -- preenchido quando lançado - pode divergir de data_prevista
    realizado_no_prazo BOOLEAN       -- data_realizada = data_prevista, usado no KPI "Cumprimento do Cronograma"
);

ALTER TABLE public.treinamentos_cronograma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total ao cronograma de treinamentos" ON public.treinamentos_cronograma;
CREATE POLICY "Acesso total ao cronograma de treinamentos" ON public.treinamentos_cronograma FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.treinamentos_cronograma TO anon;

-- Lista completa de quem foi convocado pra cada sessão (presentes + ausentes), separada
-- de treinamentos_realizados (que continua sendo só o registro oficial de presença/
-- certificado). Existe só pra dar base ao KPI "Taxa de Presença" - preenchida a partir
-- de 2026-08-24, não tem histórico anterior (ausências nunca foram registradas antes).
CREATE TABLE IF NOT EXISTS public.treinamentos_convocados (
    id TEXT PRIMARY KEY,
    matricula TEXT,
    nome TEXT,
    funcao TEXT,
    setor TEXT,
    treinamento_cod TEXT,
    treinamento_nome TEXT,
    data_treinamento DATE NOT NULL,
    presente BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.treinamentos_convocados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a treinamentos convocados" ON public.treinamentos_convocados;
CREATE POLICY "Acesso total a treinamentos convocados" ON public.treinamentos_convocados FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.treinamentos_convocados TO anon;

-- Módulo de Compras: uma linha por Requisição Interna de Compras (RM), mesmo
-- formulário de papel já usado pela empresa (COP - Consórcio Operador do PISF Ramal do
-- Agreste). id = número da RM (texto, ex: "003", "058"). itens fica jsonb (mesmo padrão
-- de ghe_catalogo.cargos/cipa_reunioes.participantes) - só é consultado dentro do
-- próprio registro da requisição, não precisa ser tabela filha. Nenhum PDF real
-- histórico tem data_recebimento preenchida (o campo existe no papel mas nunca foi
-- digitado), então essa coluna é uma capacidade nova do sistema, não herdada de dado
-- existente - fica NULL/status='pendente' até alguém dar baixa manualmente.
CREATE TABLE IF NOT EXISTS public.compras_requisicoes (
    id TEXT PRIMARY KEY,
    data_emissao DATE NOT NULL,
    data_solicitada DATE,          -- "data que o requisitante solicita atendimento" no papel
    prioridade TEXT DEFAULT 'media',  -- 'baixa' | 'media' | 'alta' | 'urgente'
    empresa TEXT,
    depto_obra_local TEXT,
    setor_solicitante TEXT,
    eng_responsavel TEXT,
    aplicacao TEXT,                -- justificativa
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{qtd, unid, cor, tam, codigo, descricao, referencia, observacao}]
    status TEXT NOT NULL DEFAULT 'pendente',   -- 'pendente' | 'recebido'
    data_recebimento DATE,         -- preenchida ao dar baixa - junto com data_emissao dá o tempo de entrega
    observacoes TEXT,
    arquivo_origem TEXT,           -- nome do PDF original, quando importado do histórico em papel
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.compras_requisicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a requisições de compra" ON public.compras_requisicoes;
CREATE POLICY "Acesso total a requisições de compra" ON public.compras_requisicoes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.compras_requisicoes TO anon;

-- Módulo APR (Análise Preliminar de Risco): último módulo antes de produção real.
-- id = número sequencial da APR (texto, ex: "001"). validade_ate = data_emissao +
-- validade_dias, recalculado no cliente sempre que qualquer um dos dois muda, mas fica
-- salvo (não é uma view) porque o campo continua editável manualmente se precisar de
-- uma exceção à regra padrão de 15 dias em campo. riscos é jsonb (mesmo padrão de
-- compras_requisicoes.itens) - cada elemento é uma linha da matriz de risco 5x5
-- (Probabilidade x Severidade): {passo_tarefa, perigo_fonte, evento_risco,
-- danos_provaveis, p_puro, s_puro, medidas_prevencao, p_residual, s_residual,
-- responsavel}. A classificação (Aceitável/Baixo, Tolerável/Médio, Substancial/Alto,
-- Crítico/Muito Alto, Intolerável) é calculada no cliente a partir de p*s
-- (nivelRiscoApr em dashboard.js), não fica salva. atividades_criticas, epis_basicos e
-- epis_especificos são arrays de texto (checkboxes marcados). A equipe/frente que
-- assina a APR não é salva num campo próprio - é resolvida ao vivo a partir de
-- responsavel via colaboradores_efetivo.responsavel (mesma técnica de Ficha de EPI e
-- Registro de Treinamento), então uma troca de equipe entre emissão e impressão já
-- reflete automaticamente.
CREATE TABLE IF NOT EXISTS public.apr_registros (
    id TEXT PRIMARY KEY,
    data_emissao DATE NOT NULL,
    validade_dias INTEGER NOT NULL DEFAULT 15,
    validade_ate DATE,
    empresa_contratada TEXT,
    setor_unidade TEXT,
    local_especifico TEXT,
    pt_numero TEXT,
    titulo TEXT,                    -- identificação curta da atividade (ex: "LIMPEZA E ROÇAGEM DE VEGETAÇÃO"), usada nas listas/impressão - distinta de descricao_atividade, que é o texto longo
    descricao_atividade TEXT,
    atividades_criticas JSONB DEFAULT '[]'::jsonb,
    riscos JSONB NOT NULL DEFAULT '[]'::jsonb,
    epis_basicos JSONB DEFAULT '[]'::jsonb,
    epi_luva_tipo TEXT,
    epis_especificos JSONB DEFAULT '[]'::jsonb,
    epi_extintor_tipo TEXT,
    rota_fuga_desobstruida TEXT,
    ponto_encontro TEXT,
    kit_primeiros_socorros BOOLEAN DEFAULT true,
    socorrista_brigadista TEXT,
    contato_ambulatorio TEXT,
    contato_bombeiros TEXT,
    responsavel TEXT,               -- frente/encarregado, resolve a equipe via colaboradores_efetivo
    elaborador_sesmt TEXT,
    supervisor_tarefa TEXT,
    responsavel_area TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.apr_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a registros de APR" ON public.apr_registros;
CREATE POLICY "Acesso total a registros de APR" ON public.apr_registros FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.apr_registros TO anon;

-- ============================================================
-- AVALIAÇÃO PSICOSSOCIAL (NR-01 / COPSOQ II)
-- ============================================================
-- Dado agregado e anônimo por natureza (é assim que o COPSOQ funciona - não existe
-- resposta individual rastreável por colaborador), por isso não tem nenhum vínculo com
-- colaboradores_efetivo. Organizado por "aplicação" (uma rodada do questionário, com
-- período de início/fim) para suportar rodadas futuras.

CREATE TABLE IF NOT EXISTS public.avaliacoes_psicossociais (
    id TEXT PRIMARY KEY,              -- ex: '2026-06' (ano-mês de início do período)
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    taxa_participacao NUMERIC,        -- % (ex: 96.9)
    resumo_analise TEXT,              -- discussão/recomendações em texto livre, editável
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.avaliacoes_psicossociais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais" ON public.avaliacoes_psicossociais;
CREATE POLICY "Acesso total a avaliacoes psicossociais" ON public.avaliacoes_psicossociais FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais TO anon;

CREATE TABLE IF NOT EXISTS public.avaliacoes_psicossociais_escalas (
    id TEXT PRIMARY KEY,              -- '<aplicacao_id>_<slug da escala>'
    aplicacao_id TEXT REFERENCES public.avaliacoes_psicossociais(id) ON DELETE CASCADE,
    escala TEXT NOT NULL,
    pct_favoravel NUMERIC,
    pct_intermediario NUMERIC,
    pct_risco NUMERIC
);

ALTER TABLE public.avaliacoes_psicossociais_escalas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais escalas" ON public.avaliacoes_psicossociais_escalas;
CREATE POLICY "Acesso total a avaliacoes psicossociais escalas" ON public.avaliacoes_psicossociais_escalas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais_escalas TO anon;

CREATE TABLE IF NOT EXISTS public.avaliacoes_psicossociais_perguntas (
    id TEXT PRIMARY KEY,              -- '<aplicacao_id>_q<numero>'
    aplicacao_id TEXT REFERENCES public.avaliacoes_psicossociais(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    pergunta TEXT NOT NULL,
    opcoes JSONB NOT NULL             -- {"Nunca/Quase nunca": 77.6, "Raramente": 12.8, ...}
);

ALTER TABLE public.avaliacoes_psicossociais_perguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total a avaliacoes psicossociais perguntas" ON public.avaliacoes_psicossociais_perguntas;
CREATE POLICY "Acesso total a avaliacoes psicossociais perguntas" ON public.avaliacoes_psicossociais_perguntas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.avaliacoes_psicossociais_perguntas TO anon;

-- ============================================================
-- RISCOS RESIDUAIS CONHECIDOS (documentados, não corrigidos nesta versão)
-- ============================================================
-- 1. cadastros, checklists, relatos, checklist_items e nao_conformidades continuam
--    com policies totalmente permissivas para INSERT/UPDATE/DELETE. Como o app não
--    tem autenticação real por sessão no Supabase (só valida no cliente), a anon key
--    sozinha não deixa distinguir um usuário legítimo de um desconhecido para essas
--    tabelas. Corrigir isso de verdade exigiria implementar Supabase Auth (ou um
--    esquema de token assinado verificado nas policies), uma mudança bem maior.
-- 2. A senha do colaborador usa bcrypt (salgado, custo adaptativo, via pgcrypto -
--    verificar_login/cadastrar_conta) desde 2026-08-18. Contas migradas antes disso e
--    que nunca fizeram login online de novo ainda podem ter um hash SHA-256 legado
--    cacheado localmente no celular - verificar_login() aceita os dois formatos e faz
--    upgrade automático pro bcrypt no primeiro login online bem-sucedido de cada conta.
-- ============================================================
