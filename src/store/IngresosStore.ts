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
      supabase.removeChannel(currentSubscription);
      set({ subscription: null });
      console.log("🔌 Desuscrito de Realtime (Ingresos)");
    }
  },

  cargarIngresosDelDB: async (placaActual?: string | null) => {
    try {
      // Desuscribir de suscripción anterior
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
      console.log("✅ Ingresos cargados:", data?.length || 0);

      // ✅ CREAR NUEVA SUSCRIPCIÓN REALTIME (SIN FILTRO)
      const channel = supabase.channel(`conductor_ingresos:${placaActual}`).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_ingresos",
          filter: undefined, // ✅ Sin filtro (el componente filtra por placa)
        },
        (payload) => {
          console.log(
            "📡 Cambio en ingresos detectado:",
            payload.eventType,
            payload.new || payload.old
          );

          set((state) => {
            if (payload.eventType === "INSERT") {
              console.log("➕ INSERT detectado");
              return {
                ingresos: [payload.new as Ingreso, ...state.ingresos],
              };
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ UPDATE detectado");
              return {
                ingresos: state.ingresos.map((i) =>
                  i.id === payload.new.id ? (payload.new as Ingreso) : i
                ),
              };
            } else if (payload.eventType === "DELETE") {
              console.log("🗑️ DELETE detectado");
              return {
                ingresos: state.ingresos.filter((i) => i.id !== payload.old.id),
              };
            }
            return state;
          });
        }
      );

      // ✅ SUBSCRIBE Y ESPERAR
      const subscription = await channel.subscribe();
      set({ subscription });
      console.log("🔌 Suscrito a Realtime (Ingresos)");
    } catch (err) {
      console.error("Error cargando ingresos:", err);
    }
  },
}));
