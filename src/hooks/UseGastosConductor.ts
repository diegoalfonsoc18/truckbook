import { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";
import { useGastosStore, type Gasto } from "../store/GastosStore";

let isSubscribed = false; // ✅ Control global para evitar múltiples suscripciones

export const useGastosConductor = (placa?: string | null) => {
  const {
    gastos,
    setGastosPorPlaca,
    agregarGasto,
    editarGasto,
    eliminarGasto,
  } = useGastosStore();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ CARGAR DATOS UNA SOLA VEZ
  useEffect(() => {
    if (!placa) {
      setCargando(false);
      return;
    }

    cargarGastos();
  }, [placa]);

  // ✅ SUSCRIBIRSE UNA SOLA VEZ
  useEffect(() => {
    if (!placa || isSubscribed) return;

    isSubscribed = true;

    const subscription = supabase
      .channel(`gastos-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_gastos",
          filter: `placa=eq.${placa}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            agregarGasto(payload.new as Gasto);
          } else if (payload.eventType === "UPDATE") {
            editarGasto(payload.new.id, payload.new);
          } else if (payload.eventType === "DELETE") {
            eliminarGasto(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      isSubscribed = false;
    };
  }, [placa]);

  const cargarGastos = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("conductor_gastos")
        .select("*")
        .eq("placa", placa)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setGastosPorPlaca(placa || "", data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const agregarGastoAsync = async (
    gasto: Omit<Gasto, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error: err } = await supabase
        .from("conductor_gastos")
        .insert([gasto])
        .select();

      if (err) throw err;

      if (data && data[0]) {
        agregarGasto(data[0] as Gasto);
      }

      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const editarGastoAsync = async (
    id: string,
    updates: Partial<Gasto>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_gastos")
        .update(updates)
        .eq("id", id);

      if (err) throw err;

      editarGasto(id, updates);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const eliminarGastoAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_gastos")
        .delete()
        .eq("id", id);

      if (err) throw err;

      eliminarGasto(id);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
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
