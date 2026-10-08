import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGemini } from "../config/aiConfig";
import supabase from "../config/SupaBaseConfig";
import { encryptedStorage } from "../utils/encryptedStorage";

// Clave global antigua (sin cifrar, compartida entre cuentas): solo se borra.
const LEGACY_CACHE_KEY = "@truckbook_client_type_v1";
const CACHE_PREFIX = "@truckbook_client_type_v2_";
type ClientType = "persona" | "empresa";
type ClientTypeMap = Record<string, ClientType>;

let memoryCache: ClientTypeMap = {};
let memoryUserId: string | null = null;

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function loadCache(userId: string): Promise<ClientTypeMap> {
  if (memoryUserId === userId) return memoryCache;
  memoryCache = {};
  memoryUserId = userId;
  try {
    AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch(() => {});
    const raw = await encryptedStorage.getItem(CACHE_PREFIX + userId);
    if (raw) memoryCache = JSON.parse(raw);
  } catch {}
  return memoryCache;
}

async function saveCache(userId: string, map: ClientTypeMap) {
  if (memoryUserId === userId) memoryCache = map;
  try {
    await encryptedStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(map));
  } catch {}
}

/**
 * Borra la caché de nombres de clientes (clave global antigua y las de cada
 * usuario) y la memoria. Llamar al cerrar sesión.
 */
export async function limpiarCacheClientes(): Promise<void> {
  memoryCache = {};
  memoryUserId = null;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mias = keys.filter((k) => k === LEGACY_CACHE_KEY || k.startsWith(CACHE_PREFIX));
    if (mias.length > 0) await AsyncStorage.multiRemove(mias);
  } catch {}
}

export function useClientType(nombres: string[]): ClientTypeMap {
  const [types, setTypes] = useState<ClientTypeMap>({});

  useEffect(() => {
    if (nombres.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const userId = await getUserId();
        if (!userId) return;
        const cached = await loadCache(userId);
        const missing = nombres.filter((n) => !cached[n]);

        if (missing.length === 0) {
          if (!cancelled) setTypes(cached);
          return;
        }
        if (!cancelled) setTypes(cached);

        // Sanitizar nombres para evitar prompt injection
        const sanitize = (s: string) => s.replace(/[`${}\\]/g, "").slice(0, 60);
        const prompt =
          `Clasifica cada nombre como "persona" o "empresa". Responde SOLO un JSON objeto donde las keys son los nombres exactos y los values son "persona" o "empresa". Sin explicación.\n\nNombres:\n` +
          missing.map((n) => `- ${sanitize(n)}`).join("\n");

        // callGemini ya aplica timeout (20 s) y nunca lanza
        const { text } = await callGemini(prompt, { maxOutputTokens: 200 });
        if (cancelled || !text) return;
        const clean = text.replace(/```json?\n?|```/g, "").trim();
        const parsed: Record<string, string> = JSON.parse(clean);
        const updated = { ...cached };
        for (const [name, type] of Object.entries(parsed)) {
          if (type === "persona" || type === "empresa") {
            updated[name] = type;
          }
        }
        await saveCache(userId, updated);
        if (!cancelled) setTypes(updated);
      } catch {
        // Fallo de red/parseo: la UI sigue con lo que tenga en caché
      }
    })();

    return () => { cancelled = true; };
  }, [nombres.join(",")]);

  return types;
}
