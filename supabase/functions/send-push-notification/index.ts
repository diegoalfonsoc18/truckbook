import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar que el request viene de un usuario autenticado
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

    // Verificar sesión válida
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, title, body, data } = await req.json();

    if (
      typeof targetUserId !== "string" || typeof title !== "string" || typeof body !== "string" ||
      !targetUserId || !title || !body || title.length > 100 || body.length > 500
    ) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sin sistema de roles no existe relación entre usuarios: solo se permite
    // notificar al propio usuario autenticado (el id sale del JWT, no del body).
    if (targetUserId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("push_token")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!usuario?.push_token) {
      return new Response(JSON.stringify({ success: true, skipped: "no_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enviar notificación a Expo Push API
    const expoPushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: usuario.push_token,
        title,
        body,
        data: data ?? {},
        sound: "default",
      }),
    });

    const expoPushData = await expoPushRes.json();

    return new Response(JSON.stringify({ success: true, result: expoPushData }), {
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
