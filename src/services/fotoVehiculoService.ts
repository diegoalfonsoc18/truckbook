// src/services/fotoVehiculoService.ts
// Foto del camión subida por el usuario: recorte, subida y lectura.
//
// El recorte de fondo corre EN EL DISPOSITIVO — Vision en iOS (15+), ML Kit en
// Android. No se usa un modelo generativo a propósito: los de imagen devuelven
// RGB plano sin canal alfa, y además reinventan detalles como la placa. Aquí la
// foto sigue siendo la del camión del usuario, solo sin fondo.
//
// Todo el trato con el recortador vive en `recortarFondo`, así que cambiar de
// motor (otro paquete, o un servicio propio tipo rembg) toca un solo sitio.
import { removeBackground } from "react-native-background-remover";
import * as ImageManipulator from "expo-image-manipulator";
import supabase from "../config/SupaBaseConfig";
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
 * calidad, así que el peso depende solo de los píxeles: a 1000 px una foto
 * vertical daba 1000x1333 y se pasaba del límite del bucket.
 */
const LADO_MAX = 720;

/** Debe coincidir con `file_size_limit` del bucket (ver foto_vehiculo.sql). */
const LIMITE_BYTES = 6 * 1024 * 1024;

/** Las URLs firmadas caducan; se piden cuando se necesitan. */
const TTL_URL_FIRMADA = 60 * 60 * 24; // 24 h

export interface ResultadoFoto {
  path?: string;
  error?: string;
  /** true si el fondo NO se pudo quitar y se subió la foto tal cual. */
  sinRecorte?: boolean;
}

/**
 * Quita el fondo. Si falla, devuelve la imagen original en vez de reventar:
 * más vale una foto con fondo que ninguna, y el llamador avisa al usuario.
 */
async function recortarFondo(
  uri: string,
): Promise<{ uri: string; recortada: boolean }> {
  try {
    const salida = await removeBackground(uri);
    // En simulador de iOS el paquete devuelve la misma URI sin tocar nada.
    return { uri: salida, recortada: salida !== uri };
  } catch (err: any) {
    logger.warn("No se pudo quitar el fondo:", err?.message ?? err);
    return { uri, recortada: false };
  }
}

/**
 * Escala para que el lado MAYOR quede en LADO_MAX.
 *
 * Fijar solo el ancho no basta: una foto vertical acaba más alta que ancha y
 * con más píxeles —y más peso— que una horizontal del mismo ancho. Se mira
 * cuál lado manda antes de escalar.
 *
 * PNG siempre: JPEG no tiene canal alfa y se comería la transparencia que
 * acabamos de conseguir. Al ser sin pérdida no admite `compress`, así que el
 * único modo de bajar el peso es bajar los píxeles.
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
    ctx.resize(
      width >= height ? { width: LADO_MAX } : { height: LADO_MAX },
    );
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
    const { uri: recortada, recortada: seRecorto } =
      await recortarFondo(uriOriginal);
    const uriFinal = await normalizar(recortada);

    // fetch() sobre un file:// local da el binario sin necesitar expo-file-system
    const respuesta = await fetch(uriFinal);
    const bytes = await respuesta.arrayBuffer();

    // El bucket rechaza lo que se pase de tamaño con un mensaje en inglés que
    // no le dice nada al conductor. Se comprueba antes para avisar en español.
    if (bytes.byteLength > LIMITE_BYTES) {
      return {
        error: `La foto quedó muy pesada (${(bytes.byteLength / 1_048_576).toFixed(1)} MB). Intenta con una foto menos grande.`,
      };
    }

    const path = `${userId}/${placa}.png`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/png",
      // La foto de una placa se reemplaza, no se acumula
      upsert: true,
    });
    if (error) return { error: error.message };

    // Guardar el path en el vínculo del usuario con esa placa
    const { error: errDB } = await supabase
      .from("vehiculo_conductores")
      .update({ foto_path: path })
      .eq("conductor_id", userId)
      .eq("vehiculo_placa", placa);
    if (errDB) return { error: errDB.message };

    return { path, sinRecorte: !seRecorto };
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
