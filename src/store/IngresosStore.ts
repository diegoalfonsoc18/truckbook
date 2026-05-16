import { create } from "zustand";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

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

interface IngresosState {
  ingresos: Ingreso[];
  setIngresos: (ingresos: Ingreso[]) => void;
  setIngresosPorPlaca: (placa: string, ingresos: Ingreso[]) => void;
  agregarIngreso: (ingreso: Ingreso) => void;
  editarIngreso: (id: string, updates: Partial<Ingreso>) => void;
  eliminarIngreso: (id: string) => void;
  limpiarIngresos: () => void;
  cargarIngresosDelDB: (placaActual?: string | null) => Promise<void>;
}

export const useIngresosStore = create<IngresosState>((set) => ({
  ingresos: [],

  setIngresos: (ingresos) => set({ ingresos }),

  setIngresosPorPlaca: (placa, ingresosNuevos) =>
    set((state) => ({
      ingresos: [
        ...state.ingresos.filter((i) => i.placa !== placa),
        ...ingresosNuevos,
      ],
    })),

  agregarIngreso: (ingreso) =>
    set((state) => ({
      ingresos: [ingreso, ...state.ingresos],
    })),

  editarIngreso: (id, updates) =>
    set((state) => ({
      ingresos: state.ingresos.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    })),

  eliminarIngreso: (id) =>
    set((state) => ({
      ingresos: state.ingresos.filter((i) => i.id !== id),
    })),

  limpiarIngresos: () => set({ ingresos: [] }),

  cargarIngresosDelDB: async (placaActual?: string | null) => {
    try {
      let query = supabase
        .from("conductor_ingresos")
        .select("*")
        .order("created_at", { ascending: false });

      if (placaActual) {
        query = query.eq("placa", placaActual);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ ingresos: data || [] });
    } catch (err) {
      logger.error("Error loading ingresos:", err);
    }
  },
}));
