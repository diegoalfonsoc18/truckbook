import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Servicio de vehículos.
//
// El sistema de roles/aprobación fue eliminado: `vehiculo_conductores` es ahora
// una relación pura usuario↔placa (columnas: id, vehiculo_placa, conductor_id,
// created_at). Todas las funciones de solicitud/aprobación/invitación se
// retiraron junto con sus columnas (rol, estado, autorizado_por, ...).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registrar un vehículo y vincular al usuario actual.
 *
 * INSERT plano (sin ON CONFLICT): con RLS, cualquier variante de ON CONFLICT
 * dispara chequeos de políticas adicionales (UPDATE/SELECT) que un usuario no
 * vinculado a la placa no puede pasar. El duplicado (23505) se trata como
 * caso esperado — la fila ya existe y no se toca su tipo.
 */
export async function registrarVehiculoPropietario(
  userId: string,
  placa: string,
  tipoCamion: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Crear el vehículo si no existe. INSERT plano (sin ON CONFLICT):
  //    el duplicado (23505) se tolera como "ya existe, no tocar su tipo".
  const { error: insertError } = await supabase
    .from("vehiculos")
    .insert([{ placa, tipo_camion: tipoCamion }]);
  if (insertError && insertError.code !== "23505") {
    logger.error("❌ insert vehiculos:", {
      placa,
      tipoCamion,
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });
    return {
      success: false,
      error: `No se pudo registrar el vehículo: ${insertError.message}`,
    };
  }

  // 2. Vincular usuario ↔ vehículo. INSERT plano: si el vínculo ya existe
  //    (23505), no hay nada que hacer.
  const { error } = await supabase
    .from("vehiculo_conductores")
    .insert([{ vehiculo_placa: placa, conductor_id: userId }]);
  if (error && error.code !== "23505") {
    logger.error("❌ insert vehiculo_conductores:", {
      placa,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Eliminar la relación usuario↔vehículo por su id.
 */
export async function removerConductorDeVehiculo(
  relacionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("vehiculo_conductores")
    .delete()
    .eq("id", relacionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
