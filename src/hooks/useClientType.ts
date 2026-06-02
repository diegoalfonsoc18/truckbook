import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGemini } from "../config/aiConfig";

const CACHE_KEY = "@truckbook_client_type_v1";
type ClientType = "persona" | "empresa";
type ClientTypeMap = Record<string, ClientType>;

let memoryCache: ClientTypeMap = {};

async function loadCache(): Promise<ClientTypeMap> {
  if (Object.keys(memoryCache).length > 0) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) memoryCache = JSON.parse(raw);
  } catch {}
  return memoryCache;
}

async function saveCache(map: ClientTypeMap) {
  memoryCache = map;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {}
}

export function useClientType(nombres: string[]): ClientTypeMap {
  const [types, setTypes] = useState<ClientTypeMap>(memoryCache);

  useEffect(() => {
    if (nombres.length === 0) return;
    let cancelled = false;

    (async () => {
      const cached = await loadCache();
      const missing = nombres.filter((n) => !cached[n]);

      if (missing.length === 0) {
        if (!cancelled) setTypes(cached);
        return;
      }

      // Sanitizar nombres para evitar prompt injection
      const sanitize = (s: string) => s.replace(/[`${}\\]/g, "").slice(0, 60);
      const prompt =
        `Clasifica cada nombre como "persona" o "empresa". Responde SOLO un JSON objeto donde las keys son los nombres exactos y los values son "persona" o "empresa". Sin explicación.\n\nNombres:\n` +
        missing.map((n) => `- ${sanitize(n)}`).join("\n");

      try {
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
        await saveCache(updated);
        if (!cancelled) setTypes(updated);
      } catch {
        if (!cancelled) setTypes(cached);
      }
    })();

    return () => { cancelled = true; };
  }, [nombres.join(",")]);

  return types;
}
