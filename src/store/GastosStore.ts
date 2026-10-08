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
  /** Compras de mercancía: a quién se le compró (null/ausente = no indicado). */
  proveedor?: string | null;
  /** Compras de mercancía: ya incluida en una cuenta de cobro a un cliente. */
  recuperado?: boolean;
  /** Compras de mercancía: ingresos de reventa con los que está ligada. */
  ingreso_ids?: string[] | null;
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
  /** Un ingreso se borró: se quita de las compras ligadas (espejo del trigger en BD); si quedan sin ingresos vuelven a "por recuperar". */
  desligarIngreso: (ingresoId: string) => void;
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

      desligarIngreso: (ingresoId) =>
        set((state) =>
          state.gastos.some((g) => g.ingreso_ids?.includes(ingresoId))
            ? {
                gastos: state.gastos.map((g) => {
                  if (!g.ingreso_ids?.includes(ingresoId)) return g;
                  const resto = g.ingreso_ids.filter((x) => x !== ingresoId);
                  return {
                    ...g,
                    ingreso_ids: resto,
                    recuperado: resto.length === 0 ? false : g.recuperado,
                  };
                }),
              }
            : state,
        ),

      limpiarGastos: () => set({ gastos: [] }),
    }),
    {
      name: "gastos-storage",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
