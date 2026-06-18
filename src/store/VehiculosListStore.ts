import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

export interface VehiculoItem {
  id: string;             // relacion_id en vehiculo_conductores
  placa: string;
  tipo_camion: string;
  rol: string;
  estado: string;
  conductorNombre?: string;
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
          // Query principal: vehículos del usuario con tipo_camion desde vehiculos
          const { data, error } = await supabase
            .from("vehiculo_conductores")
            .select("id, vehiculo_placa, rol, estado, vehiculos(tipo_camion)")
            .eq("conductor_id", userId)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const placas = (data || []).map((v) => v.vehiculo_placa);

          // Conductores autorizados de esos vehículos (1 query)
          let conductorMap = new Map<string, string>();
          if (placas.length > 0) {
            const { data: rels } = await supabase
              .from("vehiculo_conductores")
              .select("vehiculo_placa, conductor_id")
              .in("vehiculo_placa", placas)
              .eq("rol", "conductor")
              .eq("estado", "autorizado");

            const ids = [...new Set((rels || []).map((r) => r.conductor_id))];
            if (ids.length > 0) {
              const { data: usuarios } = await supabase
                .from("usuarios")
                .select("user_id, nombre")
                .in("user_id", ids);

              for (const rel of rels || []) {
                const usr = (usuarios || []).find((u) => u.user_id === rel.conductor_id);
                if (usr?.nombre) conductorMap.set(rel.vehiculo_placa, usr.nombre);
              }
            }
          }

          const vehiculos: VehiculoItem[] = (data || []).map((rel) => ({
            id: rel.id,
            placa: rel.vehiculo_placa,
            tipo_camion: (rel.vehiculos as any)?.tipo_camion || "estacas",
            rol: rel.rol,
            estado: rel.estado,
            conductorNombre: conductorMap.get(rel.vehiculo_placa),
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
