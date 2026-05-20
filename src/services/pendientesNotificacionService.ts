// src/services/pendientesNotificacionService.ts
import * as Notifications from "expo-notifications";
import { ResumenPendientes, formatCOP } from "./pendientesService";

const ID_COBRO = "pendientes_cobro_diario";
const ID_PAGO = "pendientes_pago_proximo";

async function pedirPermiso(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: s2 } = await Notifications.requestPermissionsAsync();
  return s2 === "granted";
}

/**
 * Programa (o reprograma) los recordatorios de pendientes.
 * - Cobros vencidos → diario a las 9:00 am
 * - Pagos próximos  → diario a las 8:00 am
 * Cancela los anteriores antes de reprogramar para evitar duplicados.
 */
export async function programarRecordatoriosPendientes(
  resumen: ResumenPendientes
): Promise<void> {
  try {
    // Cancelar anteriores
    await Notifications.cancelScheduledNotificationAsync(ID_COBRO).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(ID_PAGO).catch(() => {});

    const tieneAlgo =
      resumen.countVencidosCobro > 0 ||
      resumen.countProximosPago > 0 ||
      resumen.countVencidosPago > 0;

    if (!tieneAlgo) return;

    const ok = await pedirPermiso();
    if (!ok) return;

    // Recordatorio cobros vencidos — diario 9am
    if (resumen.countVencidosCobro > 0) {
      const n = resumen.countVencidosCobro;
      await Notifications.scheduleNotificationAsync({
        identifier: ID_COBRO,
        content: {
          title: "💰 Cobros vencidos",
          body: `${n} cobro${n !== 1 ? "s" : ""} por cobrar — ${formatCOP(
            resumen.montoVencidosCobro
          )} llevan más de un día sin pago.`,
          sound: true,
          data: { type: "pendientes_cobro" },
        },
        trigger: {
          hour: 9,
          minute: 0,
          repeats: true,
        } as any,
      });
    }

    // Recordatorio pagos próximos/vencidos — diario 8am
    const urgentes = resumen.countProximosPago + resumen.countVencidosPago;
    if (urgentes > 0) {
      await Notifications.scheduleNotificationAsync({
        identifier: ID_PAGO,
        content: {
          title: "⚠️ Pagos pendientes",
          body: `${urgentes} pago${urgentes !== 1 ? "s" : ""} ${
            resumen.countVencidosPago > 0 ? "vencidos o " : ""
          }próximos a vencer. Total: ${formatCOP(resumen.totalPorPagar)}.`,
          sound: true,
          data: { type: "pendientes_pago" },
        },
        trigger: {
          hour: 8,
          minute: 0,
          repeats: true,
        } as any,
      });
    }
  } catch {
    // Silencioso — no bloquear UI si falla la programación
  }
}

/** Cancela todos los recordatorios de pendientes. */
export async function cancelarRecordatoriosPendientes(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_COBRO).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(ID_PAGO).catch(() => {});
}
