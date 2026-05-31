import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useOfflineQueueStore } from "../store/OfflineQueueStore";
import { useGastosStore } from "../store/GastosStore";
import { useIngresosStore } from "../store/IngresosStore";
import logger from "../utils/logger";

/**
 * Procesa la cola offline cuando vuelve la conexión a internet.
 * Montar una sola vez en App.tsx o DataProvider.
 */
export function useSyncManager() {
  const { queue, dequeue, setIsSyncing } = useOfflineQueueStore();
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isConnected = state.isConnected && state.isInternetReachable;
      if (!isConnected) return;

      const pending = queueRef.current;
      if (pending.length === 0) return;

      setIsSyncing(true);
      logger.log(`🔄 Sincronizando ${pending.length} operación(es) offline...`);

      for (const op of pending) {
        try {
          if (op.action === "insert") {
            // Insertar en Supabase sin el ID temporal
            const { id: _tempId, ...dataToInsert } = op.data;
            const { data, error } = await supabase
              .from(op.table)
              .insert([dataToInsert])
              .select()
              .maybeSingle();

            if (error) {
              logger.error(`❌ Error sincronizando insert en ${op.table}:`, error.message);
              continue;
            }

            if (data) {
              // Reemplazar registro temporal con el real en el store
              if (op.table === "conductor_gastos") {
                useGastosStore.getState().editarGasto(op.recordId, { id: data.id });
                // Eliminar el temp y agregar el real
                useGastosStore.getState().eliminarGasto(op.recordId);
                useGastosStore.getState().agregarGasto(data);
              } else {
                useIngresosStore.getState().editarIngreso(op.recordId, { id: data.id });
                useIngresosStore.getState().eliminarIngreso(op.recordId);
                useIngresosStore.getState().agregarIngreso(data);
              }
            }

          } else if (op.action === "update") {
            const { error } = await supabase
              .from(op.table)
              .update(op.data)
              .eq("id", op.recordId);

            if (error) {
              logger.error(`❌ Error sincronizando update en ${op.table}:`, error.message);
              continue;
            }

          } else if (op.action === "delete") {
            const { error } = await supabase
              .from(op.table)
              .delete()
              .eq("id", op.recordId);

            if (error) {
              logger.error(`❌ Error sincronizando delete en ${op.table}:`, error.message);
              continue;
            }
          }

          dequeue(op.id);
          logger.log(`✅ Operación sincronizada: ${op.action} en ${op.table}`);

        } catch (err: any) {
          logger.error(`❌ Error procesando operación offline:`, err?.message ?? err);
        }
      }

      setIsSyncing(false);
      logger.log("✅ Sincronización offline completada");
    });

    return () => unsubscribe();
  }, []);
}
