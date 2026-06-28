import supabase from "../config/SupaBaseConfig";

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
 * Upsert idempotente: si la placa ya existe actualiza el tipo de camión.
 */
export async function registrarVehiculoPropietario(
  userId: string,
  placa: string,
  tipoCamion: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Upsert del vehículo
  const { error: upsertError } = await supabase
    .from("vehiculos")
    .upsert([{ placa, tipo_camion: tipoCamion }], { onConflict: "placa" });
  if (upsertError) return { success: false, error: "Error al registrar el vehículo" };

  // 2. Vincular usuario ↔ vehículo
  const { error } = await supabase
    .from("vehiculo_conductores")
    .upsert([{ vehiculo_placa: placa, conductor_id: userId }], {
      onConflict: "vehiculo_placa,conductor_id",
    });
  if (error) return { success: false, error: error.message };

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
