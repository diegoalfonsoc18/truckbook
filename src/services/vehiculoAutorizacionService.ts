import supabase from "../config/SupaBaseConfig";

export type EstadoAutorizacion = "pendiente" | "autorizado" | "rechazado";

/**
 * Verificar si un usuario esta autorizado para operar un vehiculo
 */
export async function verificarAutorizacion(
  userId: string,
  placa: string
): Promise<{ autorizado: boolean; estado?: EstadoAutorizacion; rol?: string }> {
  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .select("estado, rol")
    .eq("conductor_id", userId)
    .eq("vehiculo_placa", placa)
    .eq("estado", "autorizado")
    .maybeSingle();

  if (error || !data) {
    return { autorizado: false };
  }

  return { autorizado: true, estado: data.estado, rol: data.rol };
}
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
  if (existente) return { success: false, error: "Ya tienes este vehiculo registrado" };

  // 2. Verificar si ya tiene propietario
  const { data: propietarioExistente } = await supabase
    .from("vehiculo_conductores")
    .select("id")
    .eq("vehiculo_placa", placa)
    .eq("rol", "propietario")
    .maybeSingle();
  if (propietarioExistente) return { success: false, error: "Este vehiculo ya tiene un propietario registrado" };

  // 3. Insertar vehiculo si no existe
  const { data: vehiculoExiste } = await supabase
    .from("vehiculos")
    .select("placa")
    .eq("placa", placa)
    .maybeSingle();

  if (!vehiculoExiste) {
    const { error: insertError } = await supabase
      .from("vehiculos")
      .insert([{ placa, tipo_camion: tipoCamion }]);
    if (insertError) return { success: false, error: "Error al registrar vehiculo" };
  }

  // 4. Crear relacion como propietario autorizado
  const { error } = await supabase.from("vehiculo_conductores").insert([
    { vehiculo_placa: placa, conductor_id: userId, rol: "propietario", estado: "autorizado" },
  ]);
  if (error) return { success: false, error: error.message };

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
 * Buscar conductor por correo electronico
 */
export async function buscarConductorPorEmail(
  email: string
): Promise<{ data: { user_id: string; nombre: string; email: string; cedula: string } | null; error?: string }> {
  const emailLimpio = email.toLowerCase().trim();
  console.log("🔍 Buscando conductor por email:", emailLimpio);

  // Primero intentar buscar por email en la tabla usuarios
  const { data, error } = await supabase
    .from("usuarios")
    .select("user_id, nombre, email, cedula")
    .ilike("email", emailLimpio)
    .maybeSingle();

  console.log("📦 Resultado busqueda:", JSON.stringify({ data, error }));

  if (error) {
    console.error("❌ Error buscando conductor:", error);
    // Si el error es que la columna email no existe, informar
    if (error.message.includes("column") || error.code === "42703") {
      return { data: null, error: "La columna 'email' no existe en la tabla usuarios. Agregala en Supabase." };
    }
    return { data: null, error: error.message };
  }

  // Si no lo encontro por email, puede que el registro no tenga email guardado
  // Intentar buscar todos los usuarios y ver si alguno coincide
  if (!data) {
    console.log("⚠️ No encontrado por email directo, buscando todos los usuarios...");
    const { data: todos, error: errorTodos } = await supabase
      .from("usuarios")
      .select("user_id, nombre, email, cedula");

    console.log("📦 Todos los usuarios:", JSON.stringify(todos?.map(u => ({ nombre: u.nombre, email: u.email }))));

    if (!errorTodos && todos) {
      // Buscar match manual (por si el email tiene espacios o diferencias)
      const encontrado = todos.find(
        (u) => u.email?.toLowerCase()?.trim() === emailLimpio
      );
      if (encontrado) {
        return { data: encontrado };
      }
    }

    return { data: null, error: "No se encontro un usuario con ese correo. Verifica que el usuario este registrado en la app." };
  }

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
    if (existente.estado === "pendiente") {
      return { success: false, error: "Ya hay una invitación pendiente para este conductor" };
    }
    // Si esta rechazado, reenviar invitacion como pendiente
    const { error } = await supabase
      .from("vehiculo_conductores")
      .update({
        estado: "pendiente",
        autorizado_por: autorizadoPor,
        autorizado_at: null,
      })
      .eq("id", existente.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // Crear nueva relacion como invitacion pendiente
  const { error } = await supabase.from("vehiculo_conductores").insert([
    {
      vehiculo_placa: placa,
      conductor_id: conductorId,
      rol: "conductor",
      estado: "pendiente",
      autorizado_por: autorizadoPor,
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

/**
 * Cambiar estado de autorizacion de un conductor
 */
export async function cambiarAutorizacionConductor(
  relacionId: string,
  nuevoEstado: EstadoAutorizacion,
  autorizadoPor: string
): Promise<{ success: boolean; error?: string }> {
  console.log("🔄 Cambiando autorizacion:", { relacionId, nuevoEstado, autorizadoPor });

  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: nuevoEstado,
      autorizado_por: autorizadoPor,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", relacionId)
    .select();

  console.log("📦 Resultado update:", JSON.stringify({ data, error }));

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "No se pudo actualizar. Verifica permisos en Supabase (RLS)." };
  }
  return { success: true };
}

export interface VehiculoConConductores {
  placa: string;
  tipo_camion: string;
  conductores: ConductorAsignado[];
}

/**
 * Cargar todos los vehiculos con sus conductores asignados
 */
export async function cargarTodosVehiculosConConductores(): Promise<{
  data: VehiculoConConductores[];
  error: any;
}> {
  // Cargar todos los vehiculos
  const { data: vehiculos, error: vError } = await supabase
    .from("vehiculos")
    .select("placa, tipo_camion")
    .order("placa", { ascending: true });

  if (vError) return { data: [], error: vError };

  const resultado: VehiculoConConductores[] = [];

  for (const v of vehiculos || []) {
    const { data: conductores } = await cargarConductoresDeVehiculo(v.placa);
    resultado.push({
      placa: v.placa,
      tipo_camion: v.tipo_camion || "estacas",
      conductores: conductores || [],
    });
  }

  return { data: resultado, error: null };
}

/**
 * Cargar vehiculos de un propietario con sus conductores
 */
export async function cargarVehiculosPropietarioConConductores(
  userId: string
): Promise<{ data: VehiculoConConductores[]; error: any }> {
  // Obtener placas donde soy propietario
  const { data: misVehiculos, error: vError } = await supabase
    .from("vehiculo_conductores")
    .select("vehiculo_placa")
    .eq("conductor_id", userId)
    .eq("rol", "propietario")
    .eq("estado", "autorizado");

  if (vError) return { data: [], error: vError };

  const resultado: VehiculoConConductores[] = [];

  for (const v of misVehiculos || []) {
    const { data: vehiculo } = await supabase
      .from("vehiculos")
      .select("tipo_camion")
      .eq("placa", v.vehiculo_placa)
      .maybeSingle();

    const { data: conductores } = await cargarConductoresDeVehiculo(v.vehiculo_placa);
    resultado.push({
      placa: v.vehiculo_placa,
      tipo_camion: vehiculo?.tipo_camion || "estacas",
      conductores: conductores || [],
    });
  }

  return { data: resultado, error: null };
}

/**
 * Invitaciones pendientes para un conductor
 */
export interface InvitacionPendiente {
  relacion_id: string;
  placa: string;
  tipo_camion: string;
  invitado_por_nombre: string;
  fecha: string;
}

export async function cargarInvitacionesPendientes(
  userId: string
): Promise<{ data: InvitacionPendiente[]; error: any }> {
  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, autorizado_por, created_at")
    .eq("conductor_id", userId)
    .eq("rol", "conductor")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };

  const invitaciones: InvitacionPendiente[] = [];

  for (const rel of data || []) {
    const { data: vehiculo } = await supabase
      .from("vehiculos")
      .select("tipo_camion")
      .eq("placa", rel.vehiculo_placa)
      .maybeSingle();

    let invitadoPorNombre = "Administrador";
    if (rel.autorizado_por) {
      const { data: usr } = await supabase
        .from("usuarios")
        .select("nombre")
        .eq("user_id", rel.autorizado_por)
        .maybeSingle();
      invitadoPorNombre = usr?.nombre || "Administrador";
    }

    invitaciones.push({
      relacion_id: rel.id,
      placa: rel.vehiculo_placa,
      tipo_camion: vehiculo?.tipo_camion || "estacas",
      invitado_por_nombre: invitadoPorNombre,
      fecha: rel.created_at,
    });
  }

  return { data: invitaciones, error: null };
}

/**
 * Conductor responde a invitacion (aceptar o rechazar)
 */
export async function responderInvitacion(
  relacionId: string,
  aceptar: boolean
): Promise<{ success: boolean; error?: string }> {
  const nuevoEstado = aceptar ? "autorizado" : "rechazado";

  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: nuevoEstado,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", relacionId)
    .select();

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "No se pudo actualizar. Verifica permisos en Supabase." };
  }
  return { success: true };
}
