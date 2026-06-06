// src/services/pendientesNotificacionService.ts
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ResumenPendientes, formatCOP } from "./pendientesService";
import { callGemini } from "../config/aiConfig";

// ─── Tipos mínimos del ingreso que necesitamos aquí ─────────────────────────
interface PendienteResumido {
  id: string;
  descripcion?: string | null;
  monto?: number | null;
  fecha?: string | null;
}

const ID_IA_COBRO   = "pendientes_ia_cobro_diario";
const CACHE_IA_NOTIF = "@truckbook_pend_ia_notif_v1";
const TTL_IA_NOTIF   = 20 * 3_600_000; // 20 horas

/** Formatea un número como COP compacto (sin signo) */
function fmtCompact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(a / 1_000).toFixed(0)}K`;
  return `$${a.toFixed(0)}`;
}

/**
 * Genera (o recupera del caché) un mensaje personalizado vía Gemini
 * y programa una notificación diaria a las 10 am recordando los cobros pendientes.
 *
 * @param pendientes - lista de ingresos con estado "pendiente"
 */
export async function programarRecordatorioIACobros(
  pendientes: PendienteResumido[]
): Promise<void> {
  try {
    // Si no hay nada pendiente, cancelar y salir
    await Notifications.cancelScheduledNotificationAsync(ID_IA_COBRO).catch(() => {});
    if (pendientes.length === 0) return;

    const ok = await pedirPermiso();
    if (!ok) return;

    // ── 1. Intentar usar caché ──────────────────────────────────────────────
    let mensaje: string | null = null;
    try {
      const raw = await AsyncStorage.getItem(CACHE_IA_NOTIF);
      if (raw) {
        const { ts, msg } = JSON.parse(raw);
        if (Date.now() - ts < TTL_IA_NOTIF && msg) mensaje = msg as string;
      }
    } catch {}

    // ── 2. Si no hay caché válido, llamar a Gemini vía Edge Function ──────────
    if (!mensaje) {
      const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
      const total = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);
      const lines = pendientes.slice(0, 4).map((p) => {
        const cl   = (p.descripcion ?? "Flete").replace(/\[TEL:[^\]]*\]/g, "").split(" · ")[0].trim();
        const dias = p.fecha
          ? Math.floor((hoy.getTime() - new Date(p.fecha + "T00:00:00").getTime()) / 86_400_000)
          : 0;
        return `${cl}: ${fmtCompact(p.monto ?? 0)} (hace ${dias}d)`;
      }).join(", ");

      const prompt =
        `Eres asistente de un camionero colombiano. Tiene ${pendientes.length} flete(s) por cobrar: ${lines}. Total: ${fmtCompact(total)}.\n` +
        `Genera UNA frase corta (máx 90 caracteres) de recordatorio amistoso para cobrar hoy. ` +
        `Español colombiano, informal, sin emojis, sin comillas. Solo el texto.`;

      try {
        const { text } = await callGemini(prompt, { maxOutputTokens: 70 });
        const raw = (text ?? "").trim().replace(/^["'`«»]+|["'`«»]+$/g, "");
        if (raw) {
          mensaje = raw;
          await AsyncStorage.setItem(CACHE_IA_NOTIF, JSON.stringify({ ts: Date.now(), msg: raw })).catch(() => {});
        }
      } catch {}
    }

    // ── 3. Mensaje de respaldo si Gemini no respondió ──────────────────────
    if (!mensaje) {
      const total = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);
      mensaje = `Tienes ${pendientes.length} cobro${pendientes.length !== 1 ? "s" : ""} pendiente${pendientes.length !== 1 ? "s" : ""} — ${fmtCompact(total)} sin recibir.`;
    }

    // ── 4. Programar notificación diaria a las 10 am ───────────────────────
    await Notifications.scheduleNotificationAsync({
      identifier: ID_IA_COBRO,
      content: {
        title: "💰 Cobros pendientes",
        body:  mensaje,
        sound: true,
        data:  { type: "pendientes_cobro_ia" },
      },
      trigger: {
        hour:    10,
        minute:  0,
        repeats: true,
      } as any,
    });
  } catch {
    // Silencioso — no bloquear UI
  }
}

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
