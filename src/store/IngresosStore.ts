import { create } from "zustand";
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

interface IngresosState {
  ingresos: Ingreso[];
  subscription: any;
  setIngresos: (ingresos: Ingreso[]) => void;
  setIngresosPorPlaca: (placa: string, ingresos: Ingreso[]) => void;
  agregarIngreso: (ingreso: Ingreso) => void;
  editarIngreso: (id: string, updates: Partial<Ingreso>) => void;
  eliminarIngreso: (id: string) => void;
  limpiarIngresos: () => void;
  cargarIngresosDelDB: (placaActual?: string | null) => Promise<void>;
  desuscribir: () => void;
}

export const useIngresosStore = create<IngresosState>((set, get) => ({
  ingresos: [],
  subscription: null,

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

  desuscribir: () => {
    const currentSubscription = get().subscription;
    if (currentSubscription) {
      try {
        currentSubscription.unsubscribe?.();
      } catch (e) {
        // Silent error handling
      }

      try {
        supabase.removeChannel(currentSubscription);
      } catch (e) {
        // Silent error handling
      }

      set({ subscription: null });
    }
  },

  cargarIngresosDelDB: async (placaActual?: string | null) => {
    try {
      get().desuscribir();

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

      const channel = supabase.channel("conductor_ingresos_realtime").on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_ingresos",
        },
        (payload) => {
          set((state) => {
            if (payload.eventType === "INSERT") {
              const yaExiste = state.ingresos.some(
                (i) => i.id === payload.new.id
              );
              if (yaExiste) {
                return state;
              }

              return {
                ingresos: [payload.new as Ingreso, ...state.ingresos],
              };
            } else if (payload.eventType === "UPDATE") {
              return {
                ingresos: state.ingresos.map((i) =>
                  i.id === payload.new.id ? (payload.new as Ingreso) : i
                ),
              };
            } else if (payload.eventType === "DELETE") {
              return {
                ingresos: state.ingresos.filter((i) => i.id !== payload.old.id),
              };
            }
            return state;
          });
        }
      );

      const subscription = await channel.subscribe();
      set({ subscription });
    } catch (err) {
      console.error("Error loading ingresos:", err);
    }
  },
}));
