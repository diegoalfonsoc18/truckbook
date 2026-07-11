// src/Screens/Home/homeUtils.ts
// Utilidades compartidas entre los componentes del Home

import { localDateStr } from "../../utils/dataUtils";

export interface WProps {
  isDark: boolean;
}

export const WBG  = (d: boolean) => (d ? "#1C1C1E" : "#f7f7f7");
export const MUTED = (d: boolean) => (d ? "#94A3B8" : "#6B7280");
export const INK   = (d: boolean) => (d ? "#FFFFFF" : "#111827");

/** Fecha local YYYY-MM-DD (no UTC) */
export function fechaLocalHoy(): string {
  return localDateStr();
}

/** Lunes de la semana actual (offsetSemanas hacia atrás), local YYYY-MM-DD */
export function inicioSemana(offsetSemanas = 0): string {
  const d = new Date();
  const day = d.getDay(); // 0=Dom, 1=Lun, ...
  const diff = (day === 0 ? 6 : day - 1) + offsetSemanas * 7;
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

/** Formateador compacto COP */
export function formatCOP(amount: number): string {
  const abs  = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 999_500) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)   return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Formateador compacto COP (sin signo negativo) */
export function fmtI(n: number): string {
  const a = Math.abs(n);
  if (a >= 999_500) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)   return `$${Math.round(a / 1_000)}K`;
  return `$${a.toFixed(0)}`;
}

/** Saludo por hora del día */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Cuántos días han pasado desde una fecha YYYY-MM-DD (mínimo 0) */
export function diasDesde(fecha: string): number {
  const d   = new Date(fecha + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoy.getTime() - d.getTime()) / 86_400_000));
}

export function labelDias(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7)  return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem.`;
  return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
}

const AVATAR_COLORS = [
  "#6366F1", "#0EA5E9", "#16A34A", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
];
export const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

export function initials(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
}

// Helpers de teléfono movidos a src/utils/telefono.ts (compartidos con servicios).
// Se re-exportan aquí para no romper los imports existentes (ModalPendientes).
export { extraerTelDesc, formatearTel } from "../../utils/telefono";

// El mensaje de cobro por WhatsApp ahora es la cuenta de cobro resumida
// (src/utils/cuentaCobro.ts), compartida con CentroPendientes.
