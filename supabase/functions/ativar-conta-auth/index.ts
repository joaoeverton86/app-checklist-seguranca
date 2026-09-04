import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mesma mensagem genérica de sempre (login/senha incorretos) pra não revelar mais
// informação do que o login normal já revela.
const INVALID = json({ success: false, error: "Matrícula ou senha incorretos." }, 401);

// Fase 3 do roteiro de login/auditoria (ver scratch/roteiro_apr_login_auditoria.txt) -
// ativa uma conta real no Supabase Auth pra um colaborador que já provou identidade pela
// matrícula/senha de sempre (RPC verificar_login, bcrypt), usando a MESMA senha que a
// pessoa acabou de digitar - ninguém precisa lembrar de uma senha nova nem confirmar
// e-mail (email_confirm:true), já que a identidade já foi verificada no passo 1. Chamada
// só pelo painel, quando o signInWithPassword do Supabase Auth ainda falha (primeira vez
// que essa pessoa loga depois do deploy da Fase 3, ou auth_user_id nunca foi criado).
// Idempotente: se auth_user_id já existir, só confirma e não faz nada de novo.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const { login, senha } = await req.json();
    if (!login || !senha || typeof login !== "string" || typeof senha !== "string") {
      return json({ success: false, error: "Dados incompletos." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Reaproveita a verificação de senha já existente (bcrypt, com migração preguiçosa do
    // hash antigo em sha256) em vez de duplicar essa lógica aqui.
    const { data: loginData, error: loginErr } = await supabase.rpc("verificar_login", {
      p_login: login.trim(),
      p_senha: senha,
    });
    if (loginErr) {
      console.error("Erro ao chamar verificar_login:", loginErr);
      return json({ success: false, error: "Erro interno" }, 500);
    }

    const colaborador = Array.isArray(loginData) && loginData.length > 0 ? loginData[0] : null;
    if (!colaborador || colaborador.ativo === false) return INVALID;

    const { data: colabRow, error: colabErr } = await supabase
      .from("colaboradores_checklist")
      .select("id, email, auth_user_id")
      .eq("id", colaborador.id)
      .maybeSingle();
    if (colabErr || !colabRow) {
      console.error("Erro ao buscar colaborador:", colabErr);
      return json({ success: false, error: "Erro interno" }, 500);
    }

    if (colabRow.auth_user_id) {
      return json({ success: true, already_active: true });
    }

    if (!colabRow.email) {
      return json({ success: false, error: "Este colaborador não tem e-mail cadastrado - fale com o administrador do sistema pra completar o cadastro antes de ativar o acesso protegido." }, 400);
    }

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: colabRow.email,
      password: senha,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      // "already registered" pode acontecer se uma ativação anterior criou o usuário no Auth
      // mas falhou antes de gravar auth_user_id de volta (ex: queda de rede) - busca o usuário
      // existente por e-mail e linka em vez de tratar como erro.
      if (String(createErr?.message || "").toLowerCase().includes("already registered")) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existente = listData?.users?.find((u) => (u.email || "").toLowerCase() === colabRow.email.toLowerCase());
        if (existente) {
          await supabase.from("colaboradores_checklist").update({ auth_user_id: existente.id }).eq("id", colabRow.id);
          return json({ success: true });
        }
      }
      console.error("Erro ao criar usuário no Supabase Auth:", createErr);
      return json({ success: false, error: "Falha ao ativar conta protegida: " + (createErr?.message || "erro desconhecido") }, 500);
    }

    await supabase.from("colaboradores_checklist").update({ auth_user_id: created.user.id }).eq("id", colabRow.id);

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
