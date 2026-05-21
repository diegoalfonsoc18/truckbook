// src/services/mercanciaService.ts
//
// Normaliza mercancías de texto libre (escritas por conductores) a nombres
// canónicos en español usando Gemini. Usa caché incremental en AsyncStorage:
//   · Las cadenas ya vistas NO vuelven a enviarse a la API.
//   · Solo las cadenas nuevas generan una llamada.
//   · TTL de 30 días por entrada.
//   · La clave de caché incluye el tipo de camión para que el contexto
//     específico de cada vehículo mejore la normalización con el tiempo.
//
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GEMINI_API_KEY, GEMINI_ENDPOINT } from "../config/aiConfig";

const CACHE_KEY = "@truckbook_mercancias_norm_v3"; // v3: incluye tipoCamion en clave
const TTL_MS    = 30 * 24 * 3_600_000; // 30 días por entrada

interface CacheEntry {
  canonical: string;
  ts:        number;
}

type CacheMap = Record<string, CacheEntry>;

// ─── Contexto por tipo de camión ─────────────────────────────────────────────
const CONTEXTO_CAMION: Record<string, { descripcion: string; ejemplos: string }> = {
  volqueta: {
    descripcion: "Volqueta (transporte de materiales de construcción y minería)",
    ejemplos:
      `"arena de río" → "Arena"\n` +
      `"arenilla" → "Arena"\n` +
      `"arenan" → "Arena"\n` +
      `"cascajito" → "Cascajo"\n` +
      `"cascajo" → "Cascajo"\n` +
      `"triturado" → "Triturado"\n` +
      `"base granular" → "Base granular"\n` +
      `"recebo" → "Recebo"\n` +
      `"tierra negra" → "Tierra negra"\n` +
      `"relleno" → "Material de relleno"\n` +
      `"escombros" → "Escombros"\n` +
      `"CEMENTO saco" → "Cemento"\n` +
      `"grava" → "Grava"\n` +
      `"piedra raja" → "Piedra raja"\n` +
      `"concreto" → "Concreto"`,
  },
  furgon: {
    descripcion: "Furgón (transporte de mercancía general, alimentos, electrónicos)",
    ejemplos:
      `"nevera y lavadora" → "Electrodomésticos"\n` +
      `"electrodomesticos" → "Electrodomésticos"\n` +
      `"papas y cebollas" → "Alimentos"\n` +
      `"alimentos" → "Alimentos"\n` +
      `"ropa" → "Ropa"\n` +
      `"telas" → "Textiles"\n` +
      `"cajas" → "Mercancía general"\n` +
      `"medicamentos" → "Medicamentos"\n` +
      `"muebles" → "Muebles"\n` +
      `"computadores" → "Electrónicos"\n` +
      `"carton" → "Cartón"\n` +
      `"plastico" → "Plástico"`,
  },
  cisterna: {
    descripcion: "Cisterna (transporte de líquidos a granel)",
    ejemplos:
      `"gasolina corriente" → "Gasolina"\n` +
      `"diesel" → "ACPM"\n` +
      `"acpm" → "ACPM"\n` +
      `"agua potable" → "Agua potable"\n` +
      `"aceite de palma" → "Aceite"\n` +
      `"leche" → "Leche"\n` +
      `"quimicos" → "Químicos"\n` +
      `"jet a1" → "Combustible de aviación"\n` +
      `"asfalto" → "Asfalto"\n` +
      `"melaza" → "Melaza"`,
  },
  estacas: {
    descripcion: "Camión de estacas (transporte de carga voluminosa variada)",
    ejemplos:
      `"ganado vacuno" → "Ganado"\n` +
      `"novillos" → "Ganado"\n` +
      `"madera rolliza" → "Madera"\n` +
      `"tablas" → "Madera"\n` +
      `"costalados" → "Carga en costales"\n` +
      `"papa criolla" → "Papa"\n` +
      `"platano" → "Plátano"\n` +
      `"caña de azucar" → "Caña de azúcar"\n` +
      `"guadua" → "Guadua"\n` +
      `"maquinaria" → "Maquinaria"`,
  },
  grua: {
    descripcion: "Grúa (transporte y maniobra de carga pesada, vehículos)",
    ejemplos:
      `"carro varado" → "Rescate vehicular"\n` +
      `"maquinaria pesada" → "Maquinaria pesada"\n` +
      `"retroexcavadora" → "Maquinaria pesada"\n` +
      `"contenedor" → "Contenedor"\n` +
      `"estructura metalica" → "Estructura metálica"`,
  },
  portacontenedor: {
    descripcion: "Portacontenedor (transporte de contenedores de carga)",
    ejemplos:
      `"contenedor 20 pies" → "Contenedor 20'"\n` +
      `"contenedor 40" → "Contenedor 40'"\n` +
      `"dry" → "Contenedor Dry"\n` +
      `"refrigerado" → "Contenedor Refrigerado"\n` +
      `"exportacion" → "Exportación"\n` +
      `"importacion" → "Importación"`,
  },
  planchon: {
    descripcion: "Planchón (transporte de carga extradimensional o pesada)",
    ejemplos:
      `"vigas" → "Vigas de acero"\n` +
      `"acero" → "Acero"\n` +
      `"maquinaria" → "Maquinaria"\n` +
      `"transformador" → "Transformador"\n` +
      `"tubería" → "Tubería"\n` +
      `"prefabricados" → "Prefabricados"`,
  },
};

const DEFAULT_CONTEXTO = {
  descripcion: "Camión de carga (Colombia)",
  ejemplos:
    `"arena de río" → "Arena"\n` +
    `"CEMENTO saco" → "Cemento"\n` +
    `"electrodomesticos" → "Electrodomésticos"\n` +
    `"papa criolla" → "Papa"\n` +
    `"pollos vivos" → "Aves de corral"\n` +
    `"madera rolliza" → "Madera"\n` +
    `"acpm" → "ACPM"\n` +
    `"ganado vacuno" → "Ganado"`,
};

// ─── Clave de caché: tipoCamion::rawString ────────────────────────────────────
function cacheKey(tipoCamion: string, raw: string): string {
  return `${tipoCamion}::${raw.trim()}`;
}

// ─── Caché en memoria ─────────────────────────────────────────────────────────
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

// ─── Llamada a Gemini ─────────────────────────────────────────────────────────
async function geminiNormalize(
  brutos: string[],
  tipoCamion: string,
): Promise<Record<string, string>> {
  if (!GEMINI_API_KEY || brutos.length === 0) return {};

  // Si el tipo de camión tiene contexto predefinido lo usa; si no, construye
  // un fallback dinámico que al menos incluye el nombre del tipo de camión
  // para que Gemini pueda inferir qué cargas son típicas para ese vehículo.
  const ctx = CONTEXTO_CAMION[tipoCamion];
  const descripcion = ctx?.descripcion
    ?? `Camión tipo "${tipoCamion}" (Colombia) — tipo de vehículo no catalogado aún`;
  const ejemplosSection = ctx
    ? `Ejemplos para este tipo de camión:\n${ctx.ejemplos}\n\n`
    : `No hay ejemplos predefinidos para este tipo de camión. ` +
      `Usa tu conocimiento general sobre transporte de carga colombiano ` +
      `y el tipo de vehículo indicado para inferir los nombres canónicos correctos.\n\n`;

  const prompt =
    `Eres asistente de una app colombiana de transporte de carga.\n` +
    `Tipo de camión: ${descripcion}.\n\n` +
    `Los conductores registran la mercancía en texto libre con errores ortográficos, ` +
    `abreviaciones y variaciones. Tu tarea: normalizar cada cadena al nombre canónico ` +
    `más apropiado para este tipo de camión. El nombre debe ser corto (1-4 palabras), ` +
    `en español, con mayúscula inicial. Agrupa variantes bajo el mismo nombre.\n\n` +
    ejemplosSection +
    `IMPORTANTE: Normaliza siempre al nombre más cercano posible aunque el texto ` +
    `tenga errores. Nunca dejes un campo vacío.\n\n` +
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

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};

    return JSON.parse(match[0]) as Record<string, string>;
  } catch {
    return {};
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Normaliza una lista de mercancías en texto libre a nombres canónicos.
 *
 * @param brutos     - strings tal como los escribió el conductor
 * @param tipoCamion - tipo de camión activo (contexto para Gemini y clave de caché)
 * @returns Map<bruto, canonico>
 */
export async function normalizarMercancias(
  brutos: string[],
  tipoCamion: string = "general",
): Promise<Map<string, string>> {
  const unicos = [...new Set(brutos.map((s) => s.trim()).filter(Boolean))];
  if (unicos.length === 0) return new Map();

  let cache = purgeExpired(await loadCache());

  // Solo enviar a Gemini los que no están en caché para este tipo de camión
  const nuevos = unicos.filter((s) => !cache[cacheKey(tipoCamion, s)]);

  if (nuevos.length > 0) {
    const resultado = await geminiNormalize(nuevos, tipoCamion);
    const now       = Date.now();

    for (const raw of nuevos) {
      const canonical = resultado[raw]?.trim() || capitalize(raw);
      cache[cacheKey(tipoCamion, raw)] = { canonical, ts: now };
    }

    await saveCache(cache);
  }

  const out = new Map<string, string>();
  for (const raw of brutos) {
    const key = cacheKey(tipoCamion, raw.trim());
    out.set(raw, cache[key]?.canonical ?? capitalize(raw));
  }
  return out;
}

/**
 * Normaliza una sola cadena.
 */
export async function normalizarMercancia(
  bruto: string,
  tipoCamion: string = "general",
): Promise<string> {
  const m = await normalizarMercancias([bruto], tipoCamion);
  return m.get(bruto) ?? capitalize(bruto);
}

/**
 * Invalida el caché en memoria (útil tras un cambio de vehículo).
 */
export function invalidarCacheMercancias(): void {
  memCache = null;
}

// ─── Utilidad interna ─────────────────────────────────────────────────────────
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
