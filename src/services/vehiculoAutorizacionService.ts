import supabase from "../config/SupaBaseConfig";

export type EstadoAutorizacion = "pendiente" | "autorizado" | "rechazado";
export type RolVehiculo = "propietario" | "conductor";

export interface VehiculoConductor {
  id: string;
  vehiculo_placa: string;
  conductor_id: string;
  rol: RolVehiculo;
  estado: EstadoAutorizacion;
  autorizado_por: string | null;
  autorizado_at: string | null;
  created_at: string;
}

export interface VehiculoConEstado {
  placa: string;
  tipo_camion: string;
  rol: RolVehiculo;
  estado: EstadoAutorizacion;
  relacion_id: string;
}

export interface SolicitudPendiente {
  id: string;
  vehiculo_placa: string;
  conductor_id: string;
  conductor_email?: string;
  conductor_nombre?: string;
  created_at: string;
}

/**
 * Cargar vehiculos del usuario con su estado de autorizacion
 */
export async function cargarVehiculosConEstado(
  userId: string
): Promise<{ data: VehiculoConEstado[] | null; error: any }> {
  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, rol, estado")
    .eq("conductor_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };

  // Para los autorizados, cargar info del vehiculo
  const vehiculos: VehiculoConEstado[] = [];
  for (const rel of data || []) {
    // Intentar cargar tipo_camion del vehiculo
    const { data: vehiculo } = await supabase
      .from("vehiculos")
      .select("tipo_camion")
      .eq("placa", rel.vehiculo_placa)
      .maybeSingle();

    vehiculos.push({
      placa: rel.vehiculo_placa,
      tipo_camion: vehiculo?.tipo_camion || "estacas",
      rol: rel.rol,
      estado: rel.estado,
      relacion_id: rel.id,
    });
  }

  return { data: vehiculos, error: null };
}

/**
 * Registrar vehiculo como propietario (auto-autorizado)
 */
export async function registrarVehiculoPropietario(
  userId: string,
  placa: string,
  tipoCamion: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Verificar si ya existe relacion
  const { data: existente } = await supabase
    .from("vehiculo_conductores")
    .select("id")
    .eq("vehiculo_placa", placa)
    .eq("conductor_id", userId)
    .maybeSingle();

  if (existente) {
    return { success: false, error: "Ya tienes este vehiculo registrado" };
  }

  // 2. Verificar si ya tiene propietario
  const { data: propietarioExistente } = await supabase
    .from("vehiculo_conductores")
    .select("id")
    .eq("vehiculo_placa", placa)
    .eq("rol", "propietario")
    .maybeSingle();

  if (propietarioExistente) {
    return {
      success: false,
      error: "Este vehiculo ya tiene un propietario registrado",
    };
  }

  // 3. Insertar vehiculo si no existe
  const { data: vehiculoExiste } = await supabase
    .from("vehiculos")
    .select("placa")
    .eq("placa", placa)
    .maybeSingle();

  if (!vehiculoExiste) {
    const { error: insertError } = await supabase
      .from("vehiculos")
      .insert([{ placa, tipo_camion: tipoCamion, conductor_id: userId }]);

    if (insertError) {
      return { success: false, error: "Error al registrar vehiculo" };
    }
  }

  // 4. Crear relacion como propietario autorizado
  const { error } = await supabase.from("vehiculo_conductores").insert([
    {
      vehiculo_placa: placa,
      conductor_id: userId,
      rol: "propietario",
      estado: "autorizado",
    },
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Solicitar acceso a un vehiculo como conductor (queda pendiente)
 */
export async function solicitarAccesoVehiculo(
  userId: string,
  placa: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Verificar si el vehiculo existe
  const { data: vehiculoExiste } = await supabase
    .from("vehiculos")
    .select("placa")
    .eq("placa", placa)
    .maybeSingle();

  if (!vehiculoExiste) {
    return {
      success: false,
      error: "Este vehiculo no esta registrado. Pide al propietario que lo registre primero.",
    };
  }

  // 2. Verificar si ya tiene relacion
  const { data: existente } = await supabase
    .from("vehiculo_conductores")
    .select("id, estado")
    .eq("vehiculo_placa", placa)
    .eq("conductor_id", userId)
    .maybeSingle();

  if (existente) {
    if (existente.estado === "pendiente") {
      return { success: false, error: "Ya tienes una solicitud pendiente para este vehiculo" };
    }
    if (existente.estado === "autorizado") {
      return { success: false, error: "Ya tienes acceso a este vehiculo" };
    }
    if (existente.estado === "rechazado") {
      // Permitir re-solicitar actualizando a pendiente
      const { error } = await supabase
        .from("vehiculo_conductores")
        .update({ estado: "pendiente", autorizado_por: null, autorizado_at: null })
        .eq("id", existente.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  }

  // 3. Crear solicitud pendiente
  const { error } = await supabase.from("vehiculo_conductores").insert([
    {
      vehiculo_placa: placa,
      conductor_id: userId,
      rol: "conductor",
      estado: "pendiente",
    },
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Cargar solicitudes pendientes para vehiculos del propietario
 */
export async function cargarSolicitudesPendientes(
  userId: string
): Promise<{ data: SolicitudPendiente[] | null; error: any }> {
  // 1. Obtener placas donde soy propietario
  const { data: misVehiculos, error: vehiculosError } = await supabase
    .from("vehiculo_conductores")
    .select("vehiculo_placa")
    .eq("conductor_id", userId)
    .eq("rol", "propietario");

  if (vehiculosError || !misVehiculos?.length) {
    return { data: [], error: vehiculosError };
  }

  const placas = misVehiculos.map((v) => v.vehiculo_placa);

  // 2. Buscar solicitudes pendientes en esas placas
  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, conductor_id, created_at")
    .in("vehiculo_placa", placas)
    .eq("estado", "pendiente")
    .eq("rol", "conductor")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

/**
 * Aprobar solicitud de acceso
 */
export async function aprobarSolicitud(
  solicitudId: string,
  propietarioId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: "autorizado",
      autorizado_por: propietarioId,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", solicitudId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Rechazar solicitud de acceso
 */
export async function rechazarSolicitud(
  solicitudId: string,
  propietarioId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: "rechazado",
      autorizado_por: propietarioId,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", solicitudId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface ConductorAsignado {
  relacion_id: string;
  conductor_id: string;
  nombre: string;
  cedula: string;
  estado: EstadoAutorizacion;
}

/**
 * Buscar conductor por cedula/DNI
 */
export async function buscarConductorPorCedula(
  cedula: string
): Promise<{ data: { user_id: string; nombre: string; cedula: string } | null; error?: string }> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("user_id, nombre, cedula")
    .eq("cedula", cedula.trim())
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "No se encontró un usuario con esa cédula/DNI" };
  return { data };
}

/**
 * Agregar conductor a un vehiculo (por propietario/admin)
 */
export async function agregarConductorAVehiculo(
  placa: string,
  conductorId: string,
  autorizadoPor: string
): Promise<{ success: boolean; error?: string }> {
  // Verificar si ya existe relacion
  const { data: existente } = await supabase
    .from("vehiculo_conductores")
    .select("id, estado")
    .eq("vehiculo_placa", placa)
    .eq("conductor_id", conductorId)
    .maybeSingle();

  if (existente) {
    if (existente.estado === "autorizado") {
      return { success: false, error: "Este conductor ya tiene acceso a este vehículo" };
    }
    // Si esta pendiente o rechazado, actualizar a autorizado
    const { error } = await supabase
      .from("vehiculo_conductores")
      .update({
        estado: "autorizado",
        autorizado_por: autorizadoPor,
        autorizado_at: new Date().toISOString(),
      })
      .eq("id", existente.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Crear nueva relacion autorizada
  const { error } = await supabase.from("vehiculo_conductores").insert([
    {
      vehiculo_placa: placa,
      conductor_id: conductorId,
      rol: "conductor",
      estado: "autorizado",
      autorizado_por: autorizadoPor,
      autorizado_at: new Date().toISOString(),
    },
  ]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Cargar conductores asignados a un vehiculo
 */
export async function cargarConductoresDeVehiculo(
  placa: string
): Promise<{ data: ConductorAsignado[] | null; error: any }> {
  const { data: relaciones, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, conductor_id, estado")
    .eq("vehiculo_placa", placa)
    .eq("rol", "conductor")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };
  if (!relaciones?.length) return { data: [], error: null };

  const conductores: ConductorAsignado[] = [];
  for (const rel of relaciones) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre, cedula")
      .eq("user_id", rel.conductor_id)
      .maybeSingle();

    conductores.push({
      relacion_id: rel.id,
      conductor_id: rel.conductor_id,
      nombre: usuario?.nombre || "Sin nombre",
      cedula: usuario?.cedula || "Sin cédula",
      estado: rel.estado,
    });
  }

  return { data: conductores, error: null };
}

/**
 * Remover conductor de un vehiculo
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
