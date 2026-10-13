import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// El modelo se puede cambiar con el secreto GEMINI_MODEL (sin redesplegar), por si
// Google retira uno.
const GEMINI_MODEL    = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Rate limiting in-memory (por usuario, por minuto) ─────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT   = 10; // máx llamadas por minuto por usuario
const WINDOW_MS    = 60_000;

function checkRateLimit(userId: string): boolean {
  const now  = Date.now();
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
    // ── 1. Verificar sesión ────────────────────────────────────────────────────
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

    // ── 3. Leer payload del cliente ────────────────────────────────────────────
    // Tope de tamaño ANTES de parsear: evita que un cuerpo enorme consuma memoria.
    if (Number(req.headers.get("content-length") ?? 0) > 100_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { prompt, generationConfig } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.length > 20_000) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Llamar a Gemini con la key del servidor ─────────────────────────────
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Gemini not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // El cliente solo puede ajustar temperatura y tokens, y dentro de un rango:
    // reenviar generationConfig tal cual permitía pedir respuestas enormes (costo)
    // o activar opciones arbitrarias del modelo.
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
    const gc = (generationConfig && typeof generationConfig === "object") ? generationConfig : {};
    const cfg = {
      temperature: clamp(Number(gc.temperature ?? 0.7) || 0, 0, 1),
      maxOutputTokens: clamp(Math.floor(Number(gc.maxOutputTokens ?? 800)) || 800, 1, 1024),
    };

    const geminiRes = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: cfg,
      }),
    });

    if (!geminiRes.ok) {
      // No reenviar el cuerpo del error de Google al cliente.
      // Status + mensaje de error de Google (p. ej. "model not found", "API key not
      // valid"). No se registra el prompt ni la respuesta, solo error.message.
      let motivo = "";
      try {
        motivo = String((await geminiRes.json())?.error?.message ?? "").slice(0, 160);
      } catch { /* sin cuerpo JSON */ }
      console.error("Gemini error", geminiRes.status, GEMINI_MODEL, motivo);
      return new Response(JSON.stringify({ error: `Gemini error ${geminiRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // Diagnóstico sin contenido: largo de la respuesta y motivo de fin / bloqueo.
    console.log(
      "Gemini ok",
      GEMINI_MODEL,
      "len=" + text.length,
      "finish=" + (geminiData?.candidates?.[0]?.finishReason ?? "none"),
      "block=" + (geminiData?.promptFeedback?.blockReason ?? "none"),
    );

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
