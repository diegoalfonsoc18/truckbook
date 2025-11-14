import { create } from "zustand";
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

interface GastosState {
  gastos: Gasto[];
  subscription: any; // Guardar suscripción activa
  setGastos: (gastos: Gasto[]) => void;
  setGastosPorPlaca: (placa: string, gastos: Gasto[]) => void;
  agregarGasto: (gasto: Gasto) => void;
  editarGasto: (id: string, updates: Partial<Gasto>) => void;
  eliminarGasto: (id: string) => void;
  limpiarGastos: () => void;
  cargarGastosDelDB: (placaActual?: string | null) => Promise<void>;
  desuscribir: () => void;
}

export const useGastosStore = create<GastosState>((set, get) => ({
  gastos: [],
  subscription: null,

  setGastos: (gastos) => set({ gastos }),

  setGastosPorPlaca: (placa, gastosNuevos) =>
    set((state) => ({
      gastos: [
        ...state.gastos.filter((g) => g.placa !== placa),
        ...gastosNuevos,
      ],
    })),

  agregarGasto: (gasto) =>
    set((state) => ({
      gastos: [gasto, ...state.gastos],
    })),

  editarGasto: (id, updates) =>
    set((state) => ({
      gastos: state.gastos.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  eliminarGasto: (id) =>
    set((state) => ({
      gastos: state.gastos.filter((g) => g.id !== id),
    })),

  limpiarGastos: () => set({ gastos: [] }),

  // ✅ DESUSCRIBIR DE REALTIME ANTERIOR
  desuscribir: () => {
    const currentSubscription = get().subscription;
    if (currentSubscription) {
      supabase.removeChannel(currentSubscription);
      set({ subscription: null });
      console.log("🔌 Desuscrito de Realtime (Gastos)");
    }
  },

  // ✅ CARGAR CON REALTIME (CORRECTO)
  cargarGastosDelDB: async (placaActual?: string | null) => {
    try {
      // Desuscribir de suscripción anterior
      get().desuscribir();

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
      console.log("✅ Gastos cargados:", data?.length || 0);

      // ✅ CREAR NUEVA SUSCRIPCIÓN REALTIME
      const channel = supabase.channel(`conductor_gastos:${placaActual}`).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conductor_gastos",
          filter: placaActual ? `placa=eq.${placaActual}` : undefined,
        },
        (payload) => {
          console.log(
            "📡 Cambio en gastos detectado:",
            payload.eventType,
            payload.new || payload.old
          );

          set((state) => {
            if (payload.eventType === "INSERT") {
              console.log("➕ INSERT detectado");
              return {
                gastos: [payload.new as Gasto, ...state.gastos],
              };
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ UPDATE detectado");
              return {
                gastos: state.gastos.map((g) =>
                  g.id === payload.new.id ? (payload.new as Gasto) : g
                ),
              };
            } else if (payload.eventType === "DELETE") {
              console.log("🗑️ DELETE detectado");
              return {
                gastos: state.gastos.filter((g) => g.id !== payload.old.id),
              };
            }
            return state;
          });
        }
      );

      // ✅ SUBSCRIBE Y ESPERAR
      const subscription = await channel.subscribe();
      set({ subscription });
      console.log("🔌 Suscrito a Realtime (Gastos)");
    } catch (err) {
      console.error("Error cargando gastos:", err);
    }
  },
}));
