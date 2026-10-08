import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useGastosStore, type Gasto } from "../store/GastosStore";
import { useOfflineQueueStore } from "../store/OfflineQueueStore";
import logger from "../utils/logger";

/**
 * Mutaciones de gastos con soporte offline (insert/update/delete).
 * La carga inicial y el realtime viven en DataProvider — única fuente de datos.
 */
export const useGastosConductor = (conductorId?: string | null) => {
  // Selectores por acción (referencias estables): evita que el componente que
  // usa este hook se re-renderice en cada cambio del store de gastos.
  const agregarGasto = useGastosStore((s) => s.agregarGasto);
  const editarGasto = useGastosStore((s) => s.editarGasto);
  const eliminarGasto = useGastosStore((s) => s.eliminarGasto);
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const removerPorRecordId = useOfflineQueueStore((s) => s.removerPorRecordId);
  const actualizarInsertPendiente = useOfflineQueueStore((s) => s.actualizarInsertPendiente);

  const agregarGastoAsync = async (
    gasto: Omit<Gasto, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      // Online: guardar directo en Supabase
      try {
        const { data, error: err } = await supabase
          .from("conductor_gastos")
          .insert([gasto])
          .select();

        if (err) throw err;
        if (data && data[0]) agregarGasto(data[0] as Gasto);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      // Offline: guardar localmente con ID temporal y encolar
      const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const gastoLocal: Gasto = {
        ...gasto,
        id: tempId,
        created_at: new Date().toISOString(),
      };
      agregarGasto(gastoLocal);
      enqueue({
        table: "conductor_gastos",
        action: "insert",
        recordId: tempId,
        data: gastoLocal,
      });
      logger.log("📥 Gasto guardado offline, se sincronizará al reconectarse");
      return { success: true };
    }
  };

  const editarGastoAsync = async (
    id: string,
    updates: Partial<Gasto>
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    // Si es un ID temporal (offline), solo actualizar localmente
    if (id.startsWith("offline_")) {
      editarGasto(id, updates);
      // Reflejar la edición en el insert encolado; si no, al sincronizar se
      // subirían los datos viejos.
      actualizarInsertPendiente(id, updates);
      return { success: true };
    }

    if (isOnline) {
      try {
        let query = supabase
          .from("conductor_gastos")
          .update(updates)
          .eq("id", id);
        // Doble filtro: id + conductor_id para prevenir modificar datos de otros
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        editarGasto(id, updates);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      editarGasto(id, updates);
      enqueue({
        table: "conductor_gastos",
        action: "update",
        recordId: id,
        data: updates,
      });
      return { success: true };
    }
  };

  const eliminarGastoAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (id.startsWith("offline_")) {
      eliminarGasto(id);
      // Cancelar el insert encolado; si no, el registro borrado "resucita" al sincronizar.
      removerPorRecordId(id);
      return { success: true };
    }

    if (isOnline) {
      try {
        let query = supabase
          .from("conductor_gastos")
          .delete()
          .eq("id", id);
        // Doble filtro: id + conductor_id
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        eliminarGasto(id);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    } else {
      eliminarGasto(id);
      enqueue({
        table: "conductor_gastos",
        action: "delete",
        recordId: id,
      });
      return { success: true };
    }
  };

  return {
    agregarGasto: agregarGastoAsync,
    actualizarGasto: editarGastoAsync,
    eliminarGasto: eliminarGastoAsync,
  };
};
