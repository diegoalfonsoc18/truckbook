// src/utils/aiCache.ts
// Caché unificado para respuestas de IA y datos externos costosos.
//
// Estrategia de caché de la app (ver también cada consumidor):
//   - TTL: cuánto tiempo es válida una respuesta aunque no cambien los datos.
//   - Fingerprint (fp): huella de los datos de entrada; si cambia, la entrada
//     deja de ser válida aunque el TTL no haya vencido.
//   - Throttle: aun con fp inválido, se puede reusar el valor stale para no
//     disparar llamadas de red por cada cambio pequeño (ver minIntervalMs).
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AICacheEntry<T> {
  ts: number;
  fp?: string;
  value: T;
}

/** Lee la entrada cruda (con timestamp) — para lógica de throttle del caller. */
export async function readAICache<T>(key: string): Promise<AICacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as AICacheEntry<T>;
  } catch {
    return null;
  }
}

export async function writeAICache<T>(key: string, value: T, fp?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), fp, value }));
  } catch {
    /* best-effort */
  }
}

/**
 * Devuelve el valor cacheado si sigue vigente.
 * - Vigente = dentro del TTL y (si se pasa fp) con el mismo fingerprint.
 * - `minIntervalMs`: si se pasa, el valor stale también se reusa cuando la
 *   última escritura fue hace menos de ese intervalo — limita la frecuencia
 *   máxima de llamadas aunque los datos cambien seguido.
 */
export async function getAICache<T>(
  key: string,
  ttlMs: number,
  fp?: string,
  minIntervalMs?: number,
): Promise<T | null> {
  const entry = await readAICache<T>(key);
  if (!entry) return null;
  const age = Date.now() - entry.ts;
  if (age < ttlMs && (fp === undefined || entry.fp === fp)) return entry.value;
  if (minIntervalMs !== undefined && age < minIntervalMs) return entry.value;
  return null;
}
