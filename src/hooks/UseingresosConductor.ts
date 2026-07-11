import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useIngresosStore, type Ingreso } from "../store/IngresosStore";
import { useOfflineQueueStore } from "../store/OfflineQueueStore";
import logger from "../utils/logger";

/**
 * Mutaciones de ingresos con soporte offline (insert/update/delete).
 * La carga inicial y el realtime viven en DataProvider — única fuente de datos.
 */
export const useIngresosConductor = (conductorId?: string | null) => {
  const { agregarIngreso, editarIngreso, eliminarIngreso } = useIngresosStore();
  const { enqueue } = useOfflineQueueStore();

  const agregarIngresoAsync = async (
    ingreso: Omit<Ingreso, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      // Online: guardar directo en Supabase
      try {
        const { data, error: err } = await supabase
          .from("conductor_ingresos")
          .insert([ingreso])
          .select();

        if (err) throw err;
        if (data && data[0]) agregarIngreso(data[0] as Ingreso);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      // Offline: guardar localmente con ID temporal y encolar
      const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const ingresoLocal: Ingreso = {
        ...ingreso,
        id: tempId,
        created_at: new Date().toISOString(),
      };
      agregarIngreso(ingresoLocal);
      enqueue({
        table: "conductor_ingresos",
        action: "insert",
        recordId: tempId,
        data: ingresoLocal,
      });
      logger.log("📥 Ingreso guardado offline, se sincronizará al reconectarse");
      return { success: true };
    }
  };

  const actualizarIngresoAsync = async (
    id: string,
    updates: Partial<Ingreso>
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    // Si es un ID temporal (offline), solo actualizar localmente
    if (id.startsWith("offline_")) {
      editarIngreso(id, updates);
      return { success: true };
    }

    if (isOnline) {
      try {
        let query = supabase
          .from("conductor_ingresos")
          .update(updates)
          .eq("id", id);
        // Doble filtro: id + conductor_id para prevenir modificar datos de otros
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        editarIngreso(id, updates);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      editarIngreso(id, updates);
      enqueue({
        table: "conductor_ingresos",
        action: "update",
        recordId: id,
        data: updates,
      });
      return { success: true };
    }
  };

  const eliminarIngresoAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (id.startsWith("offline_")) {
      eliminarIngreso(id);
      return { success: true };
    }

    if (isOnline) {
      try {
        let query = supabase
          .from("conductor_ingresos")
          .delete()
          .eq("id", id);
        // Doble filtro: id + conductor_id
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        eliminarIngreso(id);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      eliminarIngreso(id);
      enqueue({
        table: "conductor_ingresos",
        action: "delete",
        recordId: id,
      });
      return { success: true };
    }
  };

  return {
    agregarIngreso: agregarIngresoAsync,
    actualizarIngreso: actualizarIngresoAsync,
    eliminarIngreso: eliminarIngresoAsync,
  };
};
