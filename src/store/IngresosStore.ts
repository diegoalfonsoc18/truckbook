import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";
import { encryptedStorage } from "../utils/encryptedStorage";

export interface Ingreso {
  id: string;
  placa: string;
  conductor_id: string;
  tipo_ingreso: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: "pendiente" | "confirmado" | "pagado" | "vencido" | "parcial";
  created_at: string;
  cantidad?: number; // Fletes múltiples: x2, x3, etc. Default 1
  // Campos para Centro de Pendientes
  fecha_vencimiento?: string | null;
  monto_pagado?: number | null;
  cliente?: string | null;
}

interface IngresosState {
  ingresos: Ingreso[];
  setIngresos: (ingresos: Ingreso[]) => void;
  setIngresosPorPlaca: (placa: string, ingresos: Ingreso[]) => void;
  agregarIngreso: (ingreso: Ingreso) => void;
  editarIngreso: (id: string, updates: Partial<Ingreso>) => void;
  eliminarIngreso: (id: string) => void;
  limpiarIngresos: () => void;
  cargarIngresosDelDB: (placaActual?: string | null, conductorId?: string | null) => Promise<void>;
}

export const useIngresosStore = create<IngresosState>()(
  persist(
    (set) => ({
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
        set((state) => {
          // Evita duplicados si el realtime y el insert local llegan al mismo tiempo
          if (state.ingresos.some((i) => i.id === ingreso.id)) return state;
          return { ingresos: [ingreso, ...state.ingresos] };
        }),

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

      cargarIngresosDelDB: async (placaActual?: string | null, conductorId?: string | null) => {
        try {
          let query = supabase
            .from("conductor_ingresos")
            .select("*")
            .order("created_at", { ascending: false });

          if (placaActual) {
            query = query.eq("placa", placaActual);
          }
          if (conductorId) {
            query = query.eq("conductor_id", conductorId);
          }

          const { data, error } = await query;
          if (error) throw error;
          set({ ingresos: data || [] });
        } catch (err) {
          logger.error("Error loading ingresos:", err);
        }
      },
    }),
    {
      name: "ingresos-storage",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
