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

    if (!targetUserId || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verificar que emisor y destinatario comparten al menos un vehículo.
    // Esto evita que cualquier usuario autenticado pueda enviar push a cualquier otro.
    const { data: placasEmisor } = await supabaseAdmin
      .from("vehiculo_conductores")
      .select("vehiculo_placa")
      .eq("conductor_id", user.id);

    const placas = (placasEmisor || []).map((r: any) => r.vehiculo_placa);

    if (placas.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: relacionCompartida } = await supabaseAdmin
      .from("vehiculo_conductores")
      .select("vehiculo_placa")
      .eq("conductor_id", targetUserId)
      .in("vehiculo_placa", placas)
      .limit(1);

    if (!relacionCompartida || relacionCompartida.length === 0) {
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
