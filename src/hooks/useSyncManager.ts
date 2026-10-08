import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import supabase from "../config/SupaBaseConfig";
import { useOfflineQueueStore, type OfflineOperation } from "../store/OfflineQueueStore";
import { useGastosStore } from "../store/GastosStore";
import { useIngresosStore } from "../store/IngresosStore";
import logger from "../utils/logger";

// Tras este número de fallos "permanentes" la operación se descarta para no
// reintentarla eternamente en cada reconexión.
const MAX_INTENTOS = 5;

// Candado a nivel de módulo: NetInfo dispara varios eventos seguidos (y el
// fetch inicial) y cada uno llamaba a procesarCola en paralelo, duplicando
// inserts. Solo una sincronización a la vez.
let sincronizando = false;

/** Errores de red/transitorios: no cuentan como intento y cortan la corrida. */
function esErrorTransitorio(error: { code?: string; message?: string; status?: number } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  // Códigos de Postgres (22xxx datos, 23xxx integridad, 42xxx permisos/sintaxis) y PostgREST (PGRSTxxx)
  // son respuestas definitivas del servidor, no problemas de conexión.
  if (/^(22|23|42|PGRST)/.test(code)) return false;
  return true;
}

function descartarLocal(op: OfflineOperation) {
  // Un insert descartado deja un registro temporal fantasma en la UI.
  if (op.action !== "insert") return;
  if (op.table === "conductor_gastos") useGastosStore.getState().eliminarGasto(op.recordId);
  else useIngresosStore.getState().eliminarIngreso(op.recordId);
}

async function procesarCola() {
  if (sincronizando) return;
  sincronizando = true;
  const { dequeue, setIsSyncing, registrarFallo } = useOfflineQueueStore.getState();

  try {
    // Usuario actual (sesión local, sin red). Sin sesión no se sincroniza nada.
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;
    if (!userId) return;

    const pending = [...useOfflineQueueStore.getState().queue];
    if (pending.length === 0) return;

    setIsSyncing(true);
    logger.log(`🔄 Sincronizando ${pending.length} operación(es) offline...`);

    for (const op of pending) {
      // Si la operación ya no está en la cola (borrada/cancelada mientras corríamos), saltar.
      if (!useOfflineQueueStore.getState().queue.some((q) => q.id === op.id)) continue;

      // Aislamiento entre cuentas: una op encolada por otro usuario nunca se
      // ejecuta bajo la sesión actual.
      if (op.data?.conductor_id && op.data.conductor_id !== userId) {
        logger.warn("⚠️ Operación offline de otra cuenta descartada");
        dequeue(op.id);
        descartarLocal(op);
        continue;
      }

      try {
        let error: { code?: string; message?: string } | null = null;

        if (op.action === "insert") {
          const { id: _tempId, ...dataToInsert } = op.data ?? {};
          let { data, error: err } = await supabase
            .from(op.table)
            .insert([{ ...dataToInsert, conductor_id: userId }])
            .select()
            .maybeSingle();

          // Idempotencia: 23505 = el insert anterior sí llegó al servidor pero
          // se perdió la respuesta. Se trata como éxito buscando la fila real
          // por client_id (sin upsert/ON CONFLICT: falla 42501 con RLS).
          if (err?.code === "23505" && dataToInsert.client_id) {
            const { data: existente, error: errBusqueda } = await supabase
              .from(op.table)
              .select("*")
              .eq("conductor_id", userId)
              .eq("client_id", dataToInsert.client_id)
              .maybeSingle();
            if (existente) {
              data = existente;
              err = null;
              logger.log("♻️ Insert offline ya existía en el servidor (idempotente)");
            } else if (errBusqueda) {
              // No se pudo confirmar (p. ej. red caída): se propaga ese error
              // para reintentar luego en vez de contar un fallo definitivo.
              logger.warn("⚠️ No se pudo verificar duplicado:", errBusqueda.message);
              err = errBusqueda;
            }
          }
          error = err;

          if (!err && data) {
            // Eliminar el registro temporal y agregar el real
            if (op.table === "conductor_gastos") {
              useGastosStore.getState().eliminarGasto(op.recordId);
              useGastosStore.getState().agregarGasto(data);
            } else {
              useIngresosStore.getState().eliminarIngreso(op.recordId);
              useIngresosStore.getState().agregarIngreso(data);
            }
          }
        } else if (op.action === "update") {
          const res = await supabase
            .from(op.table)
            .update(op.data)
            .eq("id", op.recordId)
            .eq("conductor_id", userId);
          error = res.error;
        } else if (op.action === "delete") {
          const res = await supabase
            .from(op.table)
            .delete()
            .eq("id", op.recordId)
            .eq("conductor_id", userId);
          error = res.error;
        }

        if (error) {
          logger.error(`❌ Error sincronizando ${op.action} en ${op.table}:`, error.message);
          if (esErrorTransitorio(error)) break; // sin red: reintentar en la próxima reconexión
          if ((op.intentos ?? 0) + 1 >= MAX_INTENTOS) {
            dequeue(op.id);
            descartarLocal(op);
          } else {
            registrarFallo(op.id);
          }
          continue;
        }

        dequeue(op.id);
        logger.log(`✅ Operación sincronizada: ${op.action} en ${op.table}`);
      } catch (err: any) {
        // Excepción de red (fetch rechazado): cortar y reintentar luego
        logger.error(`❌ Error procesando operación offline:`, err?.message ?? err);
        break;
      }
    }

    logger.log("✅ Sincronización offline completada");
  } catch (err: any) {
    logger.error("❌ Error en sincronización offline:", err?.message ?? err);
  } finally {
    useOfflineQueueStore.getState().setIsSyncing(false);
    sincronizando = false;
  }
}

/**
 * Procesa la cola offline cuando vuelve la conexión a internet.
 * Montar una sola vez en App.tsx o DataProvider.
 */
export function useSyncManager() {
  useEffect(() => {
    // Procesar cola al montar si ya hay conexión (evita perder ops si la app
    // se abre directamente con internet sin que la red "cambie")
    NetInfo.fetch()
      .then((state) => {
        if (state.isConnected && state.isInternetReachable) procesarCola();
      })
      .catch(() => {});

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) procesarCola();
    });

    return () => unsubscribe();
  }, []);
}
