import { create } from "zustand";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

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

interface GastosState {
  gastos: Gasto[];
  setGastos: (gastos: Gasto[]) => void;
  setGastosPorPlaca: (placa: string, gastos: Gasto[]) => void;
  agregarGasto: (gasto: Gasto) => void;
  editarGasto: (id: string, updates: Partial<Gasto>) => void;
  eliminarGasto: (id: string) => void;
  limpiarGastos: () => void;
  cargarGastosDelDB: (placaActual?: string | null) => Promise<void>;
}

export const useGastosStore = create<GastosState>((set) => ({
  gastos: [],

  setGastos: (gastos) => set({ gastos }),

  setGastosPorPlaca: (placa, gastosNuevos) =>
    set((state) => ({
      gastos: [
        ...state.gastos.filter((g) => g.placa !== placa),
        ...gastosNuevos,
      ],
    })),

  agregarGasto: (gasto) =>
    set((state) => {
      // Evita duplicados si el realtime y el insert local llegan al mismo tiempo
      if (state.gastos.some((g) => g.id === gasto.id)) return state;
      return { gastos: [gasto, ...state.gastos] };
    }),

  editarGasto: (id, updates) =>
    set((state) => ({
      gastos: state.gastos.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  eliminarGasto: (id) =>
    set((state) => ({ gastos: state.gastos.filter((g) => g.id !== id) })),

  limpiarGastos: () => set({ gastos: [] }),

  cargarGastosDelDB: async (placaActual?: string | null) => {
    try {
      let query = supabase
        .from("conductor_gastos")
        .select("*")
        .order("created_at", { ascending: false });

      if (placaActual) {
        query = query.eq("placa", placaActual);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ gastos: data || [] });
    } catch (err) {
      logger.error("Error cargando gastos:", err);
    }
  },
}));
