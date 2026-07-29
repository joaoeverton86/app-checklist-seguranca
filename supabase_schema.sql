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

-- Login: confere matrícula/e-mail + hash da senha no servidor. Nunca devolve a senha.
CREATE OR REPLACE FUNCTION public.verificar_login(p_login text, p_senha_hash text)
 RETURNS TABLE(id text, nome text, funcao text, setor text, empresa text, matricula text, validade_aso text, ativo boolean, nivel_acesso text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT c.id, c.nome, c.funcao, c.setor, c.empresa, c.matricula,
           c.validade_aso, c.ativo, c.nivel_acesso, c.email
    FROM colaboradores_checklist c
    WHERE (upper(c.matricula) = upper(p_login) OR lower(c.email) = lower(p_login))
      AND c.senha = p_senha_hash
    LIMIT 1;
END;
$function$;

-- Cadastro de conta (signup): cria ou ativa um colaborador com senha, sem nunca deixar
-- o cliente gravar "senha" direto na tabela. Nunca deixa o próprio cadastro definir
-- nivel_acesso diferente de 'Tecnico' (promoção a Admin exige a função abaixo).
CREATE OR REPLACE FUNCTION public.cadastrar_conta(
    p_nome text,
    p_email text,
    p_matricula text,
    p_funcao text,
    p_setor text,
    p_senha_hash text
)
 RETURNS TABLE(id text, nome text, funcao text, setor text, empresa text, matricula text, validade_aso text, ativo boolean, nivel_acesso text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id text := upper(trim(p_matricula));
    v_existing colaboradores_checklist%ROWTYPE;
BEGIN
    IF v_id = '' OR p_senha_hash IS NULL OR p_senha_hash = '' THEN
        RAISE EXCEPTION 'Matrícula e senha são obrigatórias';
    END IF;

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
            senha = p_senha_hash,
            ativo = true
        WHERE c.id = v_id;
    ELSE
        INSERT INTO colaboradores_checklist(id, nome, funcao, setor, matricula, email, senha, ativo, nivel_acesso)
        VALUES (v_id, p_nome, p_funcao, p_setor, v_id, lower(p_email), p_senha_hash, true, 'Tecnico');
    END IF;

    RETURN QUERY
    SELECT c.id, c.nome, c.funcao, c.setor, c.empresa, c.matricula, c.validade_aso, c.ativo, c.nivel_acesso, c.email
    FROM colaboradores_checklist c WHERE c.id = v_id;
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
-- RISCOS RESIDUAIS CONHECIDOS (documentados, não corrigidos nesta versão)
-- ============================================================
-- 1. cadastros, checklists, relatos, checklist_items e nao_conformidades continuam
--    com policies totalmente permissivas para INSERT/UPDATE/DELETE. Como o app não
--    tem autenticação real por sessão no Supabase (só valida no cliente), a anon key
--    sozinha não deixa distinguir um usuário legítimo de um desconhecido para essas
--    tabelas. Corrigir isso de verdade exigiria implementar Supabase Auth (ou um
--    esquema de token assinado verificado nas policies), uma mudança bem maior.
-- 2. A senha do colaborador continua sendo SHA-256 de uma rodada só, sem salt
--    (mitigado: não pode mais ser lida em massa via API, mas o algoritmo em si
--    continua fraco contra quem já tiver o hash de outra forma).
-- ============================================================
