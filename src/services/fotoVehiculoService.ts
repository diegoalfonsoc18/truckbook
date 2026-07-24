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

/** Mismas proporciones que las fotos por tipo que ya trae la app. */
export const FOTO_ANCHO = 1000;
export const FOTO_ALTO = 600;

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
 * Normaliza a las proporciones de las fotos del catálogo.
 * PNG siempre: JPEG no tiene canal alfa y se comería la transparencia.
 */
async function normalizar(uri: string): Promise<string> {
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
  ctx.resize({ width: FOTO_ANCHO });
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
