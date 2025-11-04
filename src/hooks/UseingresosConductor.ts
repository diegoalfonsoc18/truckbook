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

// ✅ Acepta string | null | undefined
export const useIngresosConductor = (
  placa?: string | null
): UseIngresosConductorReturn => {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Valida que placa sea válida
    if (!placa) {
      setCargando(false);
      setIngresos([]);
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

      if (data && data.length > 0) {
        setIngresos([data[0], ...ingresos]);
      }
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

      setIngresos(
        ingresos.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
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

      setIngresos(ingresos.filter((i) => i.id !== id));
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
