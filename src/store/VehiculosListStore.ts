import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

export interface VehiculoItem {
  id: string;
  placa: string;
  tipo_camion: string;
}

interface VehiculosListState {
  vehiculos: VehiculoItem[];
  cargando: boolean;
  setVehiculos: (vehiculos: VehiculoItem[]) => void;
  cargar: (userId: string) => Promise<void>;
  agregarVehiculo: (v: VehiculoItem) => void;
  actualizarVehiculo: (id: string, updates: Partial<VehiculoItem>) => void;
  eliminarVehiculo: (id: string) => void;
  limpiar: () => void;
}

export const useVehiculosListStore = create<VehiculosListState>()(
  persist(
    (set, get) => ({
      vehiculos: [],
      cargando: false,

      setVehiculos: (vehiculos) => set({ vehiculos }),

      cargar: async (userId: string) => {
        set({ cargando: true });
        try {
          // Vehículos del usuario con tipo_camion desde vehiculos
          const { data, error } = await supabase
            .from("vehiculo_conductores")
            .select("id, vehiculo_placa, vehiculos!fk_vc_placa(tipo_camion)")
            .eq("conductor_id", userId)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const vehiculos: VehiculoItem[] = (data || []).map((rel) => ({
            id: rel.id,
            placa: rel.vehiculo_placa,
            tipo_camion: (rel.vehiculos as any)?.tipo_camion || "estacas",
          }));

          set({ vehiculos });
        } catch (err) {
          logger.error("Error cargando vehículos:", err);
        } finally {
          set({ cargando: false });
        }
      },

      agregarVehiculo: (v) =>
        set((state) => {
          if (state.vehiculos.some((x) => x.id === v.id)) return state;
          return { vehiculos: [v, ...state.vehiculos] };
        }),

      actualizarVehiculo: (id, updates) =>
        set((state) => ({
          vehiculos: state.vehiculos.map((v) =>
            v.id === id ? { ...v, ...updates } : v,
          ),
        })),

      eliminarVehiculo: (id) =>
        set((state) => ({
          vehiculos: state.vehiculos.filter((v) => v.id !== id),
        })),

      limpiar: () => set({ vehiculos: [], cargando: false }),
    }),
    {
      name: "vehiculos-list-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ vehiculos: state.vehiculos }),
    },
  ),
);
