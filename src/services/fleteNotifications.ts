/**
 * Notificaciones locales programadas para fletes pendientes de cobro.
 * Usa expo-notifications (local scheduling, sin servidor).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Ingreso } from "../store/IngresosStore";

const CHANNEL_ID = "fletes-pendientes";
const NOTIF_ID_KEY = "flete-daily-reminder"; // identificador único para cancelar/reemplazar

/** Configura el canal Android (idempotente, seguro llamar varias veces) */
async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Fletes pendientes",
      description: "Recordatorio diario de fletes sin cobrar",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }
}

/** Solicita permiso de notificaciones si aún no fue otorgado. Retorna true si tiene permiso. */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Programa (o reemplaza) el recordatorio diario de fletes pendientes.
 * - Si `pendingCount` > 0: programa notificación diaria a las 9 AM.
 * - Si `pendingCount` === 0: cancela cualquier recordatorio existente.
 */
export async function actualizarRecordatorioFletes(pendingCount: number): Promise<void> {
  try {
    await cancelarRecordatorioFletes();
    if (pendingCount === 0) return;

    const tienePermiso = await pedirPermisoNotificaciones();
    if (!tienePermiso) return;

    await ensureChannel();

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_KEY,
      content: {
        title: "💰 Fletes pendientes de cobro",
        body:
          pendingCount === 1
            ? "Tienes 1 flete sin cobrar. ¡No olvides registrar el pago!"
            : `Tienes ${pendingCount} fletes sin cobrar. Revisa tus ingresos.`,
        sound: "default",
        data: { type: "flete-pendiente" },
        ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });
  } catch (err) {
    // No bloqueamos el flujo principal si las notificaciones fallan
    console.warn("[fleteNotifications] Error al programar recordatorio:", err);
  }
}

/** Cancela el recordatorio diario si existe. */
export async function cancelarRecordatorioFletes(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_KEY);
  } catch {
    // Puede lanzar si el identificador no existe — ignorar
  }
}

/** Filtra los ingresos que son fletes con estado "pendiente". */
export function fletesPendientes(ingresos: Ingreso[]): Ingreso[] {
  return ingresos.filter(
    (i) => i.tipo_ingreso === "Flete" && i.estado === "pendiente",
  );
}
