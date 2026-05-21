// src/services/mercanciaService.ts
//
// Normaliza mercancías de texto libre (escritas por conductores) a nombres
// canónicos en español usando Gemini. Usa caché incremental en AsyncStorage:
//   · Las cadenas ya vistas NO vuelven a enviarse a la API.
//   · Solo las cadenas nuevas generan una llamada.
//   · TTL de 30 días por entrada (el nombre canónico de "arena" no cambia).
//
// Uso:
//   const normalizado = await normalizarMercancias(["arena de río", "CEMENTO saco"]);
//   normalizado.get("arena de río") // → "Arena"
//   normalizado.get("CEMENTO saco") // → "Cemento"
//
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GEMINI_API_KEY, GEMINI_ENDPOINT } from "../config/aiConfig";

const CACHE_KEY = "@truckbook_mercancias_norm_v2";
const TTL_MS    = 30 * 24 * 3_600_000; // 30 días por entrada

interface CacheEntry {
  canonical: string;
  ts:        number; // timestamp de cuando se normalizó
}

type CacheMap = Record<string, CacheEntry>;

// ─── Caché en memoria (evita lecturas repetidas de AsyncStorage) ─────────────
let memCache: CacheMap | null = null;

async function loadCache(): Promise<CacheMap> {
  if (memCache) return memCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memCache  = raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    memCache = {};
  }
  return memCache!;
}

async function saveCache(cache: CacheMap): Promise<void> {
  memCache = cache;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ─── Limpieza de entradas expiradas ─────────────────────────────────────────
function purgeExpired(cache: CacheMap): CacheMap {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(cache).filter(([, v]) => now - v.ts < TTL_MS)
  );
}

// ─── Llamada a Gemini para un lote de strings nuevos ─────────────────────────
async function geminiNormalize(brutos: string[]): Promise<Record<string, string>> {
  if (!GEMINI_API_KEY || brutos.length === 0) return {};

  const prompt =
    `Eres asistente de una app de camiones colombianos. ` +
    `Los conductores registran la mercancía que transportan en texto libre (puede haber errores ortográficos, abreviaciones, variaciones de mayúsculas o descripciones largas).\n\n` +
    `Tu tarea: normalizar cada cadena a un nombre canónico en español, corto (1-4 palabras), con mayúscula inicial. Agrupa las equivalentes bajo el mismo nombre.\n\n` +
    `Ejemplos de normalización:\n` +
    `"arena de río" → "Arena"\n` +
    `"Arenas" → "Arena"\n` +
    `"CEMENTO saco" → "Cemento"\n` +
    `"Bolsas de cemento" → "Cemento"\n` +
    `"electrodomesticos" → "Electrodomésticos"\n` +
    `"neveras y lavadoras" → "Electrodomésticos"\n` +
    `"papa criolla" → "Papa"\n` +
    `"pollos vivos" → "Aves de corral"\n` +
    `"madera rolliza" → "Madera"\n` +
    `"acpm" → "ACPM"\n` +
    `"ganado vacuno" → "Ganado"\n\n` +
    `Responde SOLO JSON válido, sin markdown, sin comentarios:\n` +
    `{ "cadena_original": "Nombre Canónico", ... }\n\n` +
    `Mercancías a normalizar:\n${JSON.stringify(brutos)}`;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:         [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    });

    if (!res.ok) return {};

    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extraer el objeto JSON de la respuesta (puede venir con backticks)
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};

    const parsed = JSON.parse(match[0]) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Normaliza una lista de mercancías en texto libre a nombres canónicos.
 *
 * @param brutos - strings tal como los escribió el conductor
 * @returns Map<bruto, canonico> — si Gemini no pudo normalizar alguno,
 *          devuelve el string original con la primera letra en mayúscula.
 */
export async function normalizarMercancias(
  brutos: string[]
): Promise<Map<string, string>> {
  const unicos = [...new Set(brutos.map((s) => s.trim()).filter(Boolean))];
  if (unicos.length === 0) return new Map();

  // Cargar y limpiar caché
  let cache = purgeExpired(await loadCache());

  // Separar los que ya están en caché de los nuevos
  const nuevos = unicos.filter((s) => !cache[s]);

  // Llamar a Gemini solo para los nuevos
  if (nuevos.length > 0) {
    const resultado = await geminiNormalize(nuevos);
    const now       = Date.now();

    for (const raw of nuevos) {
      const canonical = resultado[raw]?.trim() || capitalize(raw);
      cache[raw]      = { canonical, ts: now };
    }

    await saveCache(cache);
  }

  // Construir el mapa de salida
  const out = new Map<string, string>();
  for (const raw of brutos) {
    const key = raw.trim();
    out.set(raw, cache[key]?.canonical ?? capitalize(raw));
  }
  return out;
}

/**
 * Normaliza una sola cadena (wrapper conveniente).
 */
export async function normalizarMercancia(bruto: string): Promise<string> {
  const m = await normalizarMercancias([bruto]);
  return m.get(bruto) ?? capitalize(bruto);
}

/**
 * Invalida el caché en memoria (útil en tests o tras un cambio de vehículo).
 */
export function invalidarCacheMercancias(): void {
  memCache = null;
}

// ─── Utilidad interna ─────────────────────────────────────────────────────────
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
