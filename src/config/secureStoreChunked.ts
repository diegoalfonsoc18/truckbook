import * as SecureStore from "expo-secure-store";
import logger from "../utils/logger";

/**
 * Adaptador de SecureStore que parte los valores grandes en varias entradas.
 *
 * expo-secure-store avisa (y en Android puede fallar de verdad) cuando un valor
 * supera los 2048 bytes. La sesión de Supabase los pasa: lleva access token,
 * refresh token y el `user_metadata` completo. Si la escritura falla, al
 * reabrir la app `getSession()` devuelve null y el usuario aparece deslogueado
 * sin haber hecho nada.
 *
 * Formato en disco:
 *   - Valor chico  → se guarda tal cual bajo `K` (idéntico al formato viejo).
 *   - Valor grande → `K` contiene el marcador `__chunks__:<n>` y los pedazos
 *     viven en `K.0`, `K.1`, … `K.<n-1>`.
 *
 * Leer un valor guardado por la versión anterior sigue funcionando: no tiene el
 * marcador, así que se devuelve tal cual. Es decir, actualizar la app NO
 * desloguea a nadie.
 */

// Conservador a propósito: los tokens son ASCII (base64url), pero el
// user_metadata puede traer tildes y ahí un carácter ocupa 2 bytes. Con 1536
// caracteres el peor caso realista sigue holgadamente por debajo de 2048.
const TAMANO_CHUNK = 1536;
const MARCADOR = "__chunks__:";
// SecureStore solo acepta [A-Za-z0-9._-] en las claves; el punto es válido.
const claveChunk = (key: string, i: number) => `${key}.${i}`;

async function borrarChunks(key: string, desde: number, hasta: number) {
  for (let i = desde; i < hasta; i++) {
    try {
      await SecureStore.deleteItemAsync(claveChunk(key, i));
    } catch {
      // Si un pedazo ya no existe no hay nada que limpiar.
    }
  }
}

/** Cuántos chunks hay guardados hoy bajo `key` (0 si no está en modo chunked). */
async function contarChunksExistentes(key: string): Promise<number> {
  try {
    const cabecera = await SecureStore.getItemAsync(key);
    if (cabecera?.startsWith(MARCADOR)) {
      const n = parseInt(cabecera.slice(MARCADOR.length), 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }
  } catch {
    // Ilegible: se trata como si no hubiera chunks previos.
  }
  return 0;
}

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const cabecera = await SecureStore.getItemAsync(key);
    if (cabecera === null) return null;
    if (!cabecera.startsWith(MARCADOR)) return cabecera; // valor chico o legacy

    const n = parseInt(cabecera.slice(MARCADOR.length), 10);
    if (!Number.isFinite(n) || n <= 0) return null;

    const partes: string[] = [];
    for (let i = 0; i < n; i++) {
      const parte = await SecureStore.getItemAsync(claveChunk(key, i));
      if (parte === null) {
        // Un pedazo faltante deja el valor irrecuperable (escritura a medias o
        // borrado parcial). Devolver algo truncado sería peor: Supabase
        // intentaría parsear una sesión corrupta.
        logger.error(`❌ SecureStore: falta el chunk ${i}/${n} de ${key}`);
        return null;
      }
      partes.push(parte);
    }
    return partes.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunksPrevios = await contarChunksExistentes(key);

    if (value.length <= TAMANO_CHUNK) {
      await SecureStore.setItemAsync(key, value);
      await borrarChunks(key, 0, chunksPrevios);
      return;
    }

    const partes: string[] = [];
    for (let i = 0; i < value.length; i += TAMANO_CHUNK) {
      partes.push(value.slice(i, i + TAMANO_CHUNK));
    }

    // Los pedazos primero: si algo falla a mitad, la cabecera vieja sigue
    // apuntando a datos completos en vez de a una escritura incompleta.
    for (let i = 0; i < partes.length; i++) {
      await SecureStore.setItemAsync(claveChunk(key, i), partes[i]);
    }
    await SecureStore.setItemAsync(key, `${MARCADOR}${partes.length}`);

    // Sobrantes de una sesión anterior más larga.
    if (chunksPrevios > partes.length) {
      await borrarChunks(key, partes.length, chunksPrevios);
    }
  },

  async removeItem(key: string): Promise<void> {
    const chunksPrevios = await contarChunksExistentes(key);
    await SecureStore.deleteItemAsync(key);
    await borrarChunks(key, 0, chunksPrevios);
  },
};
