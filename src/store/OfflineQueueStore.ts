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
}

interface OfflineQueueState {
  queue: OfflineOperation[];
  isSyncing: boolean;
  enqueue: (op: Omit<OfflineOperation, "id" | "timestamp">) => void;
  dequeue: (opId: string) => void;
  clearQueue: () => void;
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

      setIsSyncing: (val) => set({ isSyncing: val }),
    }),
    {
      name: "offline-queue-storage",
      storage: createJSONStorage(() => encryptedStorage),
    }
  )
);
