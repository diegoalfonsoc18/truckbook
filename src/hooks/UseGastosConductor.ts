import { useEffect, useState } from "react";
import supabase from "../config/SupaBaseConfig";

export interface Gasto {
  id: string;
  placa: string;
  conductor_id: string;
  tipo_gasto: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  created_at: string;
}

interface UseGastosConductorReturn {
  gastos: Gasto[];
  cargando: boolean;
  error: string | null;
  agregarGasto: (
    gasto: Omit<Gasto, "id" | "created_at">
  ) => Promise<{ success: boolean; error?: string }>;
  actualizarGasto: (
    id: string,
    updates: Partial<Gasto>
  ) => Promise<{ success: boolean; error?: string }>;
  eliminarGasto: (id: string) => Promise<{ success: boolean; error?: string }>;
  recargar: () => Promise<void>;
}

// ✅ Acepta string | null | undefined
export const useGastosConductor = (
  placa?: string | null
): UseGastosConductorReturn => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Valida que placa sea válida
    if (!placa) {
      setCargando(false);
      setGastos([]);
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
        .order("created_at", { ascending: false });

      if (err) throw err;

      setGastos(data || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar gastos");
      setGastos([]);
    } finally {
      setCargando(false);
    }
  };

  const agregarGasto = async (
    gasto: Omit<Gasto, "id" | "created_at">
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error: err } = await supabase
        .from("conductor_gastos")
        .insert([gasto])
        .select();

      if (err) throw err;

      if (data && data.length > 0) {
        setGastos([data[0], ...gastos]);
      }
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al agregar gasto";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const actualizarGasto = async (
    id: string,
    updates: Partial<Gasto>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_gastos")
        .update(updates)
        .eq("id", id);

      if (err) throw err;

      setGastos(gastos.map((g) => (g.id === id ? { ...g, ...updates } : g)));
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al actualizar gasto";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const eliminarGasto = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: err } = await supabase
        .from("conductor_gastos")
        .delete()
        .eq("id", id);

      if (err) throw err;

      setGastos(gastos.filter((g) => g.id !== id));
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || "Error al eliminar gasto";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return {
    gastos,
    cargando,
    error,
    agregarGasto,
    actualizarGasto,
    eliminarGasto,
    recargar: cargarGastos,
  };
};
