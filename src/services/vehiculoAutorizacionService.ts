import supabase from "../config/SupaBaseConfig";
import { enviarPushNotificacion, getPushTokenDeUsuario } from "./NotificationService";

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
  // tipo_camion ahora es por usuario en vehiculo_conductores
  const { data, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, rol, estado, tipo_camion")
    .eq("conductor_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };

  const vehiculos: VehiculoConEstado[] = (data || []).map((rel) => ({
    placa: rel.vehiculo_placa,
    tipo_camion: rel.tipo_camion || "estacas",
    rol: rel.rol,
    estado: rel.estado,
    relacion_id: rel.id,
  }));

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

  // 3. Insertar vehiculo en tabla global si no existe (solo guarda la placa)
  const { data: vehiculoExiste } = await supabase
    .from("vehiculos")
    .select("placa")
    .eq("placa", placa)
    .maybeSingle();

  if (!vehiculoExiste) {
    const { error: insertError } = await supabase
      .from("vehiculos")
      .insert([{ placa }]);
    if (insertError) return { success: false, error: "Error al registrar vehiculo" };
  }

  // 4. Crear relacion con tipo_camion propio del usuario
  const { error } = await supabase.from("vehiculo_conductores").insert([
    { vehiculo_placa: placa, conductor_id: userId, rol: "propietario", estado: "autorizado", tipo_camion: tipoCamion },
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

  // 4. Notificar al propietario y admins vía push
  try {
    // Nombre del conductor que solicita
    const { data: conductorData } = await supabase
      .from("usuarios")
      .select("nombre")
      .eq("user_id", userId)
      .maybeSingle();
    const conductorNombre = conductorData?.nombre || "Un conductor";

    // Propietario del vehículo
    const { data: propietarios } = await supabase
      .from("vehiculo_conductores")
      .select("conductor_id")
      .eq("vehiculo_placa", placa)
      .eq("rol", "propietario");

    // Admins
    const { data: admins } = await supabase
      .from("usuarios")
      .select("user_id")
      .eq("rol", "administrador");

    const destinatarios = [
      ...(propietarios || []).map((p) => p.conductor_id),
      ...(admins || []).map((a) => a.user_id),
    ];

    for (const destinatarioId of [...new Set(destinatarios)]) {
      const token = await getPushTokenDeUsuario(destinatarioId);
      if (token) {
        await enviarPushNotificacion(
          token,
          "Nueva solicitud de acceso",
          `${conductorNombre} solicita acceso al vehículo ${placa}`,
          { placa, tipo: "solicitud" }
        );
      }
    }
  } catch (e) {
    // No falla el flujo principal si la notificación falla
    console.warn("Error enviando push:", e);
  }

  return { success: true };
}

/**
 * Cargar solicitudes pendientes para vehiculos del propietario
 */
export async function cargarSolicitudesPendientes(
  userId: string
): Promise<{ data: SolicitudConNombre[]; error: any }> {
  // 1. Placas donde soy propietario
  const { data: misVehiculos, error: vehiculosError } = await supabase
    .from("vehiculo_conductores")
    .select("vehiculo_placa")
    .eq("conductor_id", userId)
    .eq("rol", "propietario");

  if (vehiculosError || !misVehiculos?.length) {
    return { data: [], error: vehiculosError };
  }

  const placas = misVehiculos.map((v) => v.vehiculo_placa);

  // 2. Solicitudes pendientes en esas placas
  const { data: relaciones, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, conductor_id, created_at")
    .in("vehiculo_placa", placas)
    .eq("estado", "pendiente")
    .eq("rol", "conductor")
    .order("created_at", { ascending: false });

  if (error || !relaciones?.length) return { data: [], error };

  // 3. Batch: info de conductores
  const conductorIds = [...new Set(relaciones.map((r) => r.conductor_id))];
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("user_id, nombre, cedula")
    .in("user_id", conductorIds);

  const uMap: Record<string, { nombre: string; cedula: string }> = {};
  for (const u of usuarios || []) uMap[u.user_id] = { nombre: u.nombre, cedula: u.cedula };

  // 4. Batch: tipo_camion de los vehículos
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("placa, tipo_camion")
    .in("placa", placas);

  const vMap: Record<string, string> = {};
  for (const v of vehiculos || []) vMap[v.placa] = v.tipo_camion || "estacas";

  return {
    data: relaciones.map((r) => ({
      id: r.id,
      vehiculo_placa: r.vehiculo_placa,
      conductor_id: r.conductor_id,
      created_at: r.created_at,
      conductor_nombre: uMap[r.conductor_id]?.nombre || "Sin nombre",
      conductor_cedula: uMap[r.conductor_id]?.cedula || "",
      tipo_camion: vMap[r.vehiculo_placa] || "estacas",
    })),
    error: null,
  };
}

/**
 * Aprobar solicitud de acceso
 */
export async function aprobarSolicitud(
  solicitudId: string,
  propietarioId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: rel, error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: "autorizado",
      autorizado_por: propietarioId,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select("conductor_id, vehiculo_placa")
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // Notificar al conductor
  try {
    if (rel?.conductor_id) {
      const token = await getPushTokenDeUsuario(rel.conductor_id);
      if (token) {
        await enviarPushNotificacion(
          token,
          "Acceso aprobado ✓",
          `Tu solicitud para el vehículo ${rel.vehiculo_placa} fue aprobada. Ya puedes usarlo.`,
          { placa: rel.vehiculo_placa, tipo: "aprobado" }
        );
      }
    }
  } catch (e) {
    console.warn("Error enviando push aprobación:", e);
  }

  return { success: true };
}

/**
 * Rechazar solicitud de acceso
 */
export async function rechazarSolicitud(
  solicitudId: string,
  propietarioId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: rel, error } = await supabase
    .from("vehiculo_conductores")
    .update({
      estado: "rechazado",
      autorizado_por: propietarioId,
      autorizado_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select("conductor_id, vehiculo_placa")
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // Notificar al conductor
  try {
    if (rel?.conductor_id) {
      const token = await getPushTokenDeUsuario(rel.conductor_id);
      if (token) {
        await enviarPushNotificacion(
          token,
          "Solicitud rechazada",
          `Tu solicitud para el vehículo ${rel.vehiculo_placa} fue rechazada.`,
          { placa: rel.vehiculo_placa, tipo: "rechazado" }
        );
      }
    }
  } catch (e) {
    console.warn("Error enviando push rechazo:", e);
  }

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
 * Cargar todos los vehiculos con sus conductores asignados (batch, sin N+1)
 */
export async function cargarTodosVehiculosConConductores(): Promise<{
  data: VehiculoConConductores[];
  error: any;
}> {
  // 1. Todos los vehículos
  const { data: vehiculos, error: vError } = await supabase
    .from("vehiculos")
    .select("placa, tipo_camion")
    .order("placa", { ascending: true });

  if (vError) {
    console.error("❌ Error cargando vehiculos:", vError);
    return { data: [], error: vError };
  }

  if (!vehiculos?.length) return { data: [], error: null };

  const placas = vehiculos.map((v) => v.placa);

  // 2. Todas las relaciones conductor (rol=conductor) de esos vehículos en una sola query
  const { data: relaciones, error: rError } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, conductor_id, estado")
    .in("vehiculo_placa", placas)
    .eq("rol", "conductor")
    .order("created_at", { ascending: false });

  if (rError) {
    console.error("❌ Error cargando relaciones:", rError);
  }

  const rels = relaciones || [];

  // 3. Info de usuarios en una sola query
  const conductorIds = [...new Set(rels.map((r) => r.conductor_id))];
  let usuariosMap: Record<string, { nombre: string; cedula: string }> = {};

  if (conductorIds.length > 0) {
    const { data: usuarios, error: uError } = await supabase
      .from("usuarios")
      .select("user_id, nombre, cedula")
      .in("user_id", conductorIds);

    if (uError) {
      console.error("❌ Error cargando usuarios:", uError);
    }

    for (const u of usuarios || []) {
      usuariosMap[u.user_id] = { nombre: u.nombre, cedula: u.cedula };
    }
  }

  // 4. Armar resultado en memoria
  const resultado: VehiculoConConductores[] = vehiculos.map((v) => {
    const conductores: ConductorAsignado[] = rels
      .filter((r) => r.vehiculo_placa === v.placa)
      .map((r) => ({
        relacion_id: r.id,
        conductor_id: r.conductor_id,
        nombre: usuariosMap[r.conductor_id]?.nombre || "Sin nombre",
        cedula: usuariosMap[r.conductor_id]?.cedula || "Sin cédula",
        estado: r.estado,
      }));

    return {
      placa: v.placa,
      tipo_camion: v.tipo_camion || "estacas",
      conductores,
    };
  });

  return { data: resultado, error: null };
}

/**
 * Cargar vehiculos de un propietario con sus conductores (batch)
 */
export async function cargarVehiculosPropietarioConConductores(
  userId: string
): Promise<{ data: VehiculoConConductores[]; error: any }> {
  // 1. Placas donde soy propietario
  const { data: misVehiculos, error: vError } = await supabase
    .from("vehiculo_conductores")
    .select("vehiculo_placa")
    .eq("conductor_id", userId)
    .eq("rol", "propietario")
    .eq("estado", "autorizado");

  if (vError) return { data: [], error: vError };
  if (!misVehiculos?.length) return { data: [], error: null };

  const placas = misVehiculos.map((v) => v.vehiculo_placa);

  // 2. Info de los vehículos
  const { data: vehiculosInfo } = await supabase
    .from("vehiculos")
    .select("placa, tipo_camion")
    .in("placa", placas);

  const vehiculosMap: Record<string, string> = {};
  for (const v of vehiculosInfo || []) {
    vehiculosMap[v.placa] = v.tipo_camion || "estacas";
  }

  // 3. Relaciones conductor en batch
  const { data: relaciones } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, conductor_id, estado")
    .in("vehiculo_placa", placas)
    .eq("rol", "conductor")
    .order("created_at", { ascending: false });

  const rels = relaciones || [];

  // 4. Usuarios en batch
  const conductorIds = [...new Set(rels.map((r) => r.conductor_id))];
  let usuariosMap: Record<string, { nombre: string; cedula: string }> = {};

  if (conductorIds.length > 0) {
    const { data: usuarios } = await supabase
      .from("usuarios")
      .select("user_id, nombre, cedula")
      .in("user_id", conductorIds);

    for (const u of usuarios || []) {
      usuariosMap[u.user_id] = { nombre: u.nombre, cedula: u.cedula };
    }
  }

  // 5. Armar resultado
  const resultado: VehiculoConConductores[] = placas.map((placa) => {
    const conductores: ConductorAsignado[] = rels
      .filter((r) => r.vehiculo_placa === placa)
      .map((r) => ({
        relacion_id: r.id,
        conductor_id: r.conductor_id,
        nombre: usuariosMap[r.conductor_id]?.nombre || "Sin nombre",
        cedula: usuariosMap[r.conductor_id]?.cedula || "Sin cédula",
        estado: r.estado,
      }));

    return {
      placa,
      tipo_camion: vehiculosMap[placa] || "estacas",
      conductores,
    };
  });

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
 * Cargar TODAS las solicitudes pendientes (para admin — sin filtro de propietario)
 */
export interface SolicitudConNombre extends SolicitudPendiente {
  conductor_nombre: string;
  conductor_cedula: string;
  tipo_camion: string;
}

export async function cargarTodasSolicitudesPendientes(): Promise<{
  data: SolicitudConNombre[];
  error: any;
}> {
  const { data: relaciones, error } = await supabase
    .from("vehiculo_conductores")
    .select("id, vehiculo_placa, conductor_id, created_at")
    .eq("rol", "conductor")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };
  if (!relaciones?.length) return { data: [], error: null };

  // Batch: info de vehículos
  const placas = [...new Set(relaciones.map((r) => r.vehiculo_placa))];
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("placa, tipo_camion")
    .in("placa", placas);

  const vehiculosMap: Record<string, string> = {};
  for (const v of vehiculos || []) vehiculosMap[v.placa] = v.tipo_camion || "estacas";

  // Batch: info de conductores
  const conductorIds = [...new Set(relaciones.map((r) => r.conductor_id))];
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("user_id, nombre, cedula")
    .in("user_id", conductorIds);

  const usuariosMap: Record<string, { nombre: string; cedula: string }> = {};
  for (const u of usuarios || []) usuariosMap[u.user_id] = { nombre: u.nombre, cedula: u.cedula };

  return {
    data: relaciones.map((r) => ({
      id: r.id,
      vehiculo_placa: r.vehiculo_placa,
      conductor_id: r.conductor_id,
      created_at: r.created_at,
      conductor_nombre: usuariosMap[r.conductor_id]?.nombre || "Sin nombre",
      conductor_cedula: usuariosMap[r.conductor_id]?.cedula || "",
      tipo_camion: vehiculosMap[r.vehiculo_placa] || "estacas",
    })),
    error: null,
  };
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
