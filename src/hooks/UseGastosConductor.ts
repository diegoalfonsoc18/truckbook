import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useGastosStore, type Gasto } from "../store/GastosStore";
import { useOfflineQueueStore } from "../store/OfflineQueueStore";
import logger from "../utils/logger";

export const useGastosConductor = (placa?: string | null, conductorId?: string | null) => {
  const {
    gastos,
    setGastosPorPlaca,
    agregarGasto,
    editarGasto,
    eliminarGasto,
  } = useGastosStore();
  const { enqueue } = useOfflineQueueStore();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placa) {
      setCargando(false);
      return;
    }
    cargarGastos();
  }, [placa]);

  const cargarGastos = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("conductor_gastos")
        .select("*")
        .eq("placa", placa)
        .order("created_at", { ascending: false })
        .limit(200);

      if (err) throw err;
      setGastosPorPlaca(placa || "", data || []);
    } catch (err: any) {
      // Sin conexión — usar caché del store
      logger.warn("⚠️ Sin conexión, usando caché de gastos:", err.message);
    } finally {
      setCargando(false);
    }
  };

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
        setError(err.message);
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
        setError(err.message);
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
        setError(err.message);
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
    gastos: gastos.filter((g) => g.placa === placa),
    cargando,
    error,
    agregarGasto: agregarGastoAsync,
    actualizarGasto: editarGastoAsync,
    eliminarGasto: eliminarGastoAsync,
    recargar: cargarGastos,
  };
};
