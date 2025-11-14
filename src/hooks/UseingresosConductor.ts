import { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";

export interface Ingreso {
  id: string;
  placa: string;
  conductor_id: string;
  tipo_ingreso: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: "pendiente" | "confirmado" | "pagado";
  created_at: string;
}

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
  placa?: string | null
): UseIngresosConductorReturn => {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placa) {
      setCargando(false);
      setIngresos([]);
      return;
    }

    cargarIngresos();

    // ✅ SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL
    const subscription = supabase
      .channel(`ingresos-${placa}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_ingresos",
          filter: `placa=eq.${placa}`,
        },
        (payload) => {
          console.log("📡 Cambio detectado en ingresos:", payload);

          if (payload.eventType === "INSERT") {
            setIngresos((prev) => [payload.new as Ingreso, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setIngresos((prev) =>
              prev.map((i) =>
                i.id === payload.new.id ? (payload.new as Ingreso) : i
              )
            );
          } else if (payload.eventType === "DELETE") {
            setIngresos((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
      setIngresos(data || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar ingresos");
      setIngresos([]);
    } finally {
      setCargando(false);
    }
  };

  const agregarIngreso = async (
    ingreso: Omit<Ingreso, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error: err } = await supabase
        .from("conductor_ingresos")
        .insert([ingreso])
        .select();

      if (err) throw err;
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al agregar ingreso";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const actualizarIngreso = async (
    id: string,
    updates: Partial<Ingreso>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_ingresos")
        .update(updates)
        .eq("id", id);

      if (err) throw err;
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al actualizar ingreso";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const eliminarIngreso = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_ingresos")
        .delete()
        .eq("id", id);

      if (err) throw err;
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al eliminar ingreso";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return {
    ingresos,
    cargando,
    error,
    agregarIngreso,
    actualizarIngreso,
    eliminarIngreso,
    recargar: cargarIngresos,
  };
};
