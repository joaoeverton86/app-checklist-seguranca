import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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

// Resposta sempre igual, exista ou nao a conta - evita que alguem descubra quais
// matriculas/e-mails estao cadastrados so testando esse endpoint.
const GENERIC_OK = json({
  success: true,
  message: "Se existir uma conta com esses dados, um código foi enviado para o e-mail cadastrado.",
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Método não permitido" }, 405);

  try {
    const { login } = await req.json();
    if (!login || typeof login !== "string" || !login.trim()) return GENERIC_OK;

    const loginTrim = login.trim();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let colaborador = null;
    const { data: byMat } = await supabase
      .from("colaboradores_checklist")
      .select("id, nome, email, ativo")
      .ilike("matricula", loginTrim)
      .maybeSingle();
    colaborador = byMat;

    if (!colaborador) {
      const { data: byEmail } = await supabase
        .from("colaboradores_checklist")
        .select("id, nome, email, ativo")
        .ilike("email", loginTrim)
        .maybeSingle();
      colaborador = byEmail;
    }

    if (!colaborador || !colaborador.email || colaborador.ativo === false) {
      return GENERIC_OK;
    }

    // Rate limit: no maximo 1 pedido de codigo por minuto por colaborador, pra
    // evitar que alguem spamme o e-mail de outra pessoa.
    const { data: recent } = await supabase
      .from("password_resets")
      .select("created_at")
      .eq("colaborador_id", colaborador.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return GENERIC_OK;
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    await supabase.from("password_resets").insert({
      colaborador_id: colaborador.id,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Checklist Segurança <onboarding@resend.dev>",
          to: [colaborador.email],
          subject: "Código de recuperação de senha",
          html: `<p>Olá, ${colaborador.nome || ""}</p>
<p>Seu código de recuperação de senha do Checklist Segurança - PISF Ramal do Agreste é:</p>
<h2 style="letter-spacing:4px;">${otp}</h2>
<p>Esse código expira em 10 minutos. Se você não pediu essa recuperação, ignore este e-mail.</p>`,
        }),
      });
    } else {
      console.error("RESEND_API_KEY não configurada - código não enviado por e-mail");
    }

    return GENERIC_OK;
  } catch (err) {
    console.error(err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
