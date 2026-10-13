// Eliminación REAL de la cuenta (derecho de supresión, Ley 1581 / política 5.1.1(v)
// de App Store). Borra los datos del usuario y su cuenta de Auth. El id sale del
// JWT, nunca del cuerpo. Si cualquier paso falla no se borra la cuenta de Auth,
// para poder reintentar.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const uid = user.id;

    // Orden por llaves foráneas: movimientos → vínculos → vehículos → perfil.
    const pasos: Array<[string, string]> = [
      ["conductor_gastos", "conductor_id"],
      ["conductor_ingresos", "conductor_id"],
      ["vehiculo_conductores", "conductor_id"],
      ["vehiculos", "conductor_id"],
      ["usuarios", "user_id"],
    ];
    for (const [tabla, col] of pasos) {
      const { error } = await admin.from(tabla).delete().eq(col, uid);
      if (error) {
        console.error("delete-account", tabla, error.code);
        return json({ error: "Internal error" }, 500);
      }
    }

    // Fotos de vehículos (carpeta {uid}/ del bucket privado). Mejor esfuerzo.
    try {
      const { data: archivos } = await admin.storage.from("vehiculos-fotos").list(uid);
      if (archivos?.length) {
        await admin.storage
          .from("vehiculos-fotos")
          .remove(archivos.map((a) => `${uid}/${a.name}`));
      }
    } catch (e) {
      console.error("delete-account storage", (e as Error)?.message);
    }

    const { error: delError } = await admin.auth.admin.deleteUser(uid);
    if (delError) {
      console.error("delete-account auth", delError.message);
      return json({ error: "Internal error" }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal error" }, 500);
  }
});
