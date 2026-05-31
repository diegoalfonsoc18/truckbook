import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APITUDE_URL = "https://apitude.co/api/v1.0/requests/simit-co/";

// Rate limiting: 5 consultas por minuto por usuario
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS  = 60_000;

function checkRateLimit(userId: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verificar autenticación ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Validar input ──────────────────────────────────────────────────────
    const { cedula } = await req.json();
    if (!cedula || typeof cedula !== "string" || !/^\d{5,12}$/.test(cedula)) {
      return new Response(JSON.stringify({ error: "Cédula inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("APITUDE_API_KEY") ?? "";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SIMIT no configurado" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Crear solicitud en Apitude ─────────────────────────────────────────
    const postRes = await fetch(APITUDE_URL, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ document_type: "cedula", document_number: cedula }),
    });

    if (!postRes.ok) {
      return new Response(JSON.stringify({ error: `Apitude error: ${postRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id } = await postRes.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "Sin request_id" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Poll hasta obtener resultado (max 30s) ─────────────────────────────
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const getRes = await fetch(`${APITUDE_URL}${request_id}/`, {
        method: "GET",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      });

      if (!getRes.ok) continue;

      const data = await getRes.json();
      const status = data?.result?.status;

      if (status === 200 || status === 404) {
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Timeout consultando SIMIT" }), {
      status: 504,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
