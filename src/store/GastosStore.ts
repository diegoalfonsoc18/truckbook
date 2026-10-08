import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "../utils/encryptedStorage";

export interface Gasto {
  id: string;
  placa: string;
  conductor_id: string;
  tipo_gasto: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "proximo" | "vencido" | "pagado";
  created_at: string;
  /** Clave de idempotencia del insert (uuid generado en el cliente). */
  client_id?: string | null;
  // Campos para Centro de Pendientes
  fecha_vencimiento?: string | null;
}

interface GastosState {
  gastos: Gasto[];
  setGastos: (gastos: Gasto[]) => void;
  setGastosPorPlaca: (placa: string, gastos: Gasto[]) => void;
  agregarGasto: (gasto: Gasto) => void;
  editarGasto: (id: string, updates: Partial<Gasto>) => void;
  eliminarGasto: (id: string) => void;
  limpiarGastos: () => void;
}

export const useGastosStore = create<GastosState>()(
  persist(
    (set) => ({
      gastos: [],

      setGastos: (gastos) => set({ gastos }),

      setGastosPorPlaca: (placa, gastosNuevos) =>
        set((state) => ({
          gastos: [
            ...state.gastos.filter((g) => g.placa !== placa),
            // Conservar los gastos creados offline que aún no se sincronizaron
            // (ids "offline_*"); si no, el refetch los borra de la UI aunque
            // sigan en la cola.
            // Salvo que el servidor ya trajo la fila real (mismo client_id):
            // el insert llegó pero se perdió la respuesta; evita verla doble.
            ...state.gastos.filter(
              (g) =>
                g.placa === placa &&
                g.id.startsWith("offline_") &&
                !(g.client_id && gastosNuevos.some((n) => n.client_id === g.client_id)),
            ),
            ...gastosNuevos,
          ],
        })),

      agregarGasto: (gasto) =>
        set((state) => {
          // Evita duplicados si el realtime y el insert local llegan al mismo tiempo
          if (state.gastos.some((g) => g.id === gasto.id)) return state;
          // Si llega la fila real de un insert offline (mismo client_id), reemplaza el temporal.
          const base = gasto.client_id
            ? state.gastos.filter(
                (g) => !(g.id.startsWith("offline_") && g.client_id === gasto.client_id),
              )
            : state.gastos;
          return { gastos: [gasto, ...base] };
        }),

      editarGasto: (id, updates) =>
        set((state) => ({
          gastos: state.gastos.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      eliminarGasto: (id) =>
        set((state) => ({ gastos: state.gastos.filter((g) => g.id !== id) })),

      limpiarGastos: () => set({ gastos: [] }),
    }),
    {
      name: "gastos-storage",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
