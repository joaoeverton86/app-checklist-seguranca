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

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const INVALID = json({ success: false, error: "Código inválido ou expirado." }, 400);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const { login, otp, nova_senha_hash } = await req.json();
    if (!login || !otp || !nova_senha_hash) {
      return json({ success: false, error: "Dados incompletos." }, 400);
    }

    const loginTrim = String(login).trim();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let colaborador = null;
    const { data: byMat } = await supabase
      .from("colaboradores_checklist")
      .select("id, ativo")
      .ilike("matricula", loginTrim)
      .maybeSingle();
    colaborador = byMat;

    if (!colaborador) {
      const { data: byEmail } = await supabase
        .from("colaboradores_checklist")
        .select("id, ativo")
        .ilike("email", loginTrim)
        .maybeSingle();
      colaborador = byEmail;
    }

    if (!colaborador || colaborador.ativo === false) return INVALID;

    const { data: resetRow } = await supabase
      .from("password_resets")
      .select("*")
      .eq("colaborador_id", colaborador.id)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resetRow) return INVALID;
    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return json({ success: false, error: "Código expirado. Solicite um novo." }, 400);
    }
    if (resetRow.attempts >= 5) {
      return json({ success: false, error: "Número máximo de tentativas excedido. Solicite um novo código." }, 400);
    }

    const otpHash = await hashOtp(String(otp).trim());

    if (otpHash !== resetRow.otp_hash) {
      await supabase.from("password_resets").update({ attempts: resetRow.attempts + 1 }).eq("id", resetRow.id);
      return INVALID;
    }

    await supabase.from("colaboradores_checklist").update({ senha: nova_senha_hash }).eq("id", colaborador.id);
    await supabase.from("password_resets").update({ used: true }).eq("id", resetRow.id);

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
