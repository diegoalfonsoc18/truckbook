// src/services/fotoVehiculoService.ts
// Foto del camión subida por el usuario: normaliza y sube.
//
// NO se recorta el fondo dentro de la app. El recorte automático on-device
// (Vision/ML Kit vía react-native-background-remover) devolvía la imagen casi
// vacía con fotos de camión — se comía el camión entero. En su lugar, el
// usuario recorta en su galería (en iOS: mantener presionado el camión →
// "levantar sujeto", que es el mismo Vision pero GUIADO y sale perfecto; en
// Android: "Copiar objeto"/recortar de Google Fotos o Samsung) y elige aquí el
// PNG ya transparente. La app lo sube tal cual, conservando el alfa. Si elige
// una foto normal, se sube con fondo — también sirve.
//
// Ventaja de fondo: sin módulo nativo, todo esto corre incluso en Expo Go.
import * as ImageManipulator from "expo-image-manipulator";
import {
  uploadAsync,
  getInfoAsync,
  FileSystemUploadType,
} from "expo-file-system/legacy";
import supabase, {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "../config/SupaBaseConfig";
import logger from "../utils/logger";

const BUCKET = "vehiculos-fotos";

/** Proporciones de las fotos por tipo que ya trae la app (para el ejemplo). */
export const FOTO_ANCHO = 1000;
export const FOTO_ALTO = 600;

/**
 * Lado mayor de la imagen que se guarda.
 *
 * La VehicleCard la pinta a ~180 pt, así que 720 px cubre de sobra hasta una
 * pantalla @3x. El PNG con alfa es sin pérdida y no se puede comprimir con
 * calidad, así que el peso depende solo de los píxeles.
 */
const LADO_MAX = 720;

/** Debe coincidir con `file_size_limit` del bucket (ver foto_vehiculo.sql). */
const LIMITE_BYTES = 6 * 1024 * 1024;

/** Las URLs firmadas caducan; se piden cuando se necesitan. */
const TTL_URL_FIRMADA = 60 * 60 * 24; // 24 h

export interface ResultadoFoto {
  path?: string;
  error?: string;
}

/**
 * Escala para que el lado MAYOR quede en LADO_MAX y guarda como PNG.
 *
 * PNG siempre: conserva el canal alfa si el usuario trajo un recorte
 * transparente. JPEG lo aplanaría y le pondría fondo negro.
 */
async function normalizar(uri: string): Promise<string> {
  const original = await ImageManipulator.ImageManipulator.manipulate(
    uri,
  ).renderAsync();

  const { width, height } = original;
  const ladoMayor = Math.max(width, height);

  // Nunca agrandar: si ya es chica se deja como está.
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
  if (ladoMayor > LADO_MAX) {
    ctx.resize(width >= height ? { width: LADO_MAX } : { height: LADO_MAX });
  }

  const imagen = await ctx.renderAsync();
  const salida = await imagen.saveAsync({
    format: ImageManipulator.SaveFormat.PNG,
  });
  return salida.uri;
}

/**
 * Procesa y sube la foto del camión.
 * Ruta `{userId}/{placa}.png` — el userId de primera carpeta es lo que usan
 * las políticas del bucket para aislar a cada usuario.
 */
export async function subirFotoCamion(
  userId: string,
  placa: string,
  uriOriginal: string,
): Promise<ResultadoFoto> {
  try {
    const uriFinal = await normalizar(uriOriginal);

    // Comprobar el tamaño antes de subir.
    const info = await getInfoAsync(uriFinal);
    const size = info.exists ? (info.size ?? 0) : 0;
    if (size === 0) {
      return { error: "La foto quedó vacía al procesarla. Intenta de nuevo." };
    }
    if (size > LIMITE_BYTES) {
      return {
        error: `La foto quedó muy pesada (${(size / 1_048_576).toFixed(1)} MB). Intenta con una foto menos grande.`,
      };
    }

    // Subir con uploadAsync (nativo), NO con supabase.storage.upload: el fetch
    // de React Native no manda bien un body binario grande y falla con
    // "Network request failed". uploadAsync POSTea el archivo directo al
    // endpoint REST de Storage.
    const path = `${userId}/${placa}.png`;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { error: "Tu sesión expiró. Vuelve a entrar e intenta de nuevo." };
    }

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
    const res = await uploadAsync(uploadUrl, uriFinal, {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "image/png",
        // Reemplaza la foto anterior de esa placa en vez de chocar con 409
        "x-upsert": "true",
      },
    });
    logger.log("📸 subida foto:", res.status, `(${size} bytes)`);
    if (res.status !== 200) {
      logger.error("Upload storage falló:", res.status, res.body?.slice(0, 200));
      return { error: `No se pudo subir la foto (código ${res.status}).` };
    }

    // Guardar el path en el vínculo del usuario con esa placa
    const { error: errDB } = await supabase
      .from("vehiculo_conductores")
      .update({ foto_path: path })
      .eq("conductor_id", userId)
      .eq("vehiculo_placa", placa);
    if (errDB) return { error: errDB.message };

    return { path };
  } catch (err: any) {
    logger.error("Error subiendo foto del camión:", err);
    return { error: err?.message ?? "No se pudo guardar la foto." };
  }
}

/** URL temporal para mostrar la foto. El bucket es privado. */
export async function urlFotoCamion(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, TTL_URL_FIRMADA);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Borra la foto y limpia la referencia. */
export async function borrarFotoCamion(
  userId: string,
  placa: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const path = `${userId}/${placa}.png`;
    await supabase.storage.from(BUCKET).remove([path]);

    const { error } = await supabase
      .from("vehiculo_conductores")
      .update({ foto_path: null })
      .eq("conductor_id", userId)
      .eq("vehiculo_placa", placa);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "No se pudo borrar." };
  }
}
