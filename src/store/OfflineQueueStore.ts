import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { encryptedStorage } from "../utils/encryptedStorage";

export type OfflineAction = "insert" | "update" | "delete";
export type OfflineTable = "conductor_gastos" | "conductor_ingresos";

export interface OfflineOperation {
  id: string;           // ID único de la operación (no el ID del registro)
  table: OfflineTable;
  action: OfflineAction;
  recordId: string;     // ID del registro (temp para inserts, real para update/delete)
  data?: any;           // Datos a insertar/actualizar
  timestamp: number;
  /** Intentos fallidos de sincronización (para descartar ops que nunca van a pasar). */
  intentos?: number;
}

interface OfflineQueueState {
  queue: OfflineOperation[];
  isSyncing: boolean;
  enqueue: (op: Omit<OfflineOperation, "id" | "timestamp">) => void;
  dequeue: (opId: string) => void;
  clearQueue: () => void;
  /** Suma un intento fallido a la operación. */
  registrarFallo: (opId: string) => void;
  /** Quita todas las operaciones pendientes de un registro (p. ej. borrado de un registro aún no sincronizado). */
  removerPorRecordId: (recordId: string) => void;
  /** Actualiza los datos del insert pendiente de un registro offline (edición antes de sincronizar). */
  actualizarInsertPendiente: (recordId: string, updates: Record<string, any>) => void;
  setIsSyncing: (val: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      queue: [],
      isSyncing: false,

      enqueue: (op) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...op,
              id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              timestamp: Date.now(),
            },
          ],
        })),

      dequeue: (opId) =>
        set((state) => ({
          queue: state.queue.filter((op) => op.id !== opId),
        })),

      clearQueue: () => set({ queue: [] }),

      registrarFallo: (opId) =>
        set((state) => ({
          queue: state.queue.map((op) =>
            op.id === opId ? { ...op, intentos: (op.intentos ?? 0) + 1 } : op,
          ),
        })),

      removerPorRecordId: (recordId) =>
        set((state) => ({
          queue: state.queue.filter((op) => op.recordId !== recordId),
        })),

      actualizarInsertPendiente: (recordId, updates) =>
        set((state) => ({
          queue: state.queue.map((op) =>
            op.recordId === recordId && op.action === "insert"
              ? { ...op, data: { ...op.data, ...updates } }
              : op,
          ),
        })),

      setIsSyncing: (val) => set({ isSyncing: val }),
    }),
    {
      name: "offline-queue-storage",
      storage: createJSONStorage(() => encryptedStorage),
      // isSyncing no debe persistirse: si la app muere sincronizando quedaría en true.
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);
