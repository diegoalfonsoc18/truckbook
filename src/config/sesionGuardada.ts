import Constants from "expo-constants";
import type { Session } from "@supabase/supabase-js";
import { SecureStoreAdapter } from "./secureStoreChunked";

/**
 * Lee la sesión persistida por Supabase directamente del almacenamiento seguro.
 *
 * `getSession()` devuelve null cuando el access token ya venció (dura 1 h) y la
 * renovación falla por falta de red, aunque la sesión sigue guardada. Sin esto
 * la app mostraba el login a quien abría la app sin internet. Se usa SOLO como
 * respaldo offline: no instala la sesión en el cliente, que la renueva solo al
 * volver la conexión.
 */
export async function leerSesionGuardada(): Promise<Session | null> {
  try {
    const url: string = Constants.expoConfig?.extra?.supabaseUrl ?? "";
    const ref = new URL(url).hostname.split(".")[0];
    const raw = await SecureStoreAdapter.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.access_token || !s?.refresh_token || !s?.user?.id) return null;
    return s as Session;
  } catch {
    return null;
  }
}
