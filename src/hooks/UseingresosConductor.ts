import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useIngresosStore, type Ingreso } from "../store/IngresosStore";
import { useOfflineQueueStore } from "../store/OfflineQueueStore";
import logger from "../utils/logger";

interface UseIngresosConductorReturn {
  ingresos: Ingreso[];
  cargando: boolean;
  error: string | null;
  agregarIngreso: (
    ingreso: Omit<Ingreso, "id" | "created_at">
  ) => Promise<{ success: boolean; error?: string }>;
  actualizarIngreso: (
    id: string,
    updates: Partial<Ingreso>
  ) => Promise<{ success: boolean; error?: string }>;
  eliminarIngreso: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  recargar: () => Promise<void>;
}

export const useIngresosConductor = (
  placa?: string | null,
  conductorId?: string | null
): UseIngresosConductorReturn => {
  const {
    ingresos,
    setIngresosPorPlaca,
    agregarIngreso,
    editarIngreso,
    eliminarIngreso,
  } = useIngresosStore();
  const { enqueue } = useOfflineQueueStore();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placa) {
      setCargando(false);
      return;
    }
    cargarIngresos();
  }, [placa]);

  const cargarIngresos = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("conductor_ingresos")
        .select("*")
        .eq("placa", placa)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setIngresosPorPlaca(placa || "", data || []);
    } catch (err: any) {
      logger.warn("⚠️ Sin conexión, usando caché de ingresos:", err.message);
    } finally {
      setCargando(false);
    }
  };

  const agregarIngresoAsync = async (
    ingreso: Omit<Ingreso, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      try {
        const { data, error: err } = await supabase
          .from("conductor_ingresos")
          .insert([ingreso])
          .select();

        if (err) throw err;
        if (data && data[0]) agregarIngreso(data[0] as Ingreso);
        return { success: true };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    } else {
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
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        editarIngreso(id, updates);
        return { success: true };
      } catch (err: any) {
        setError(err.message);
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
        if (conductorId) query = query.eq("conductor_id", conductorId);

        const { error: err } = await query;
        if (err) throw err;
        eliminarIngreso(id);
        return { success: true };
      } catch (err: any) {
        setError(err.message);
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
    ingresos: ingresos.filter((i) => i.placa === placa),
    cargando,
    error,
    agregarIngreso: agregarIngresoAsync,
    actualizarIngreso: actualizarIngresoAsync,
    eliminarIngreso: eliminarIngresoAsync,
    recargar: cargarIngresos,
  };
};
