// src/Screens/Home/homeUtils.ts
// Utilidades compartidas entre los componentes del Home

export interface WProps {
  isDark: boolean;
}

export const WBG  = (d: boolean) => (d ? "#1C1C1E" : "#f7f7f7");
export const MUTED = (d: boolean) => (d ? "#94A3B8" : "#6B7280");
export const INK   = (d: boolean) => (d ? "#FFFFFF" : "#111827");

/** Fecha local YYYY-MM-DD (no UTC) */
export function fechaLocalHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formateador compacto COP */
export function formatCOP(amount: number): string {
  const abs  = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Formateador compacto COP (sin signo negativo) */
export function fmtI(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(a / 1_000).toFixed(0)}K`;
  return `$${a.toFixed(0)}`;
}

/** Saludo por hora del día */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Cuántos días han pasado desde una fecha YYYY-MM-DD */
export function diasDesde(fecha: string): number {
  const d   = new Date(fecha + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - d.getTime()) / 86_400_000);
}

export function labelDias(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7)  return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem.`;
  return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
}

const AVATAR_COLORS = [
  "#6366F1", "#0EA5E9", "#2EC98D", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
];
export const avatarColor = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

export function initials(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
}

/** Extrae el teléfono incrustado en la descripción ([TEL:...]) */
export function extraerTelDesc(desc: string): { desc: string; tel: string | null } {
  const match = desc.match(/\[TEL:([^\]]+)\]$/);
  if (!match) return { desc, tel: null };
  return { desc: desc.replace(/\[TEL:[^\]]+\]$/, ""), tel: match[1] };
}

/** Mensaje de cobro por WhatsApp */
export function mensajeCobroWA(cliente: string, monto: number, dias: number): string {
  const m = fmtI(monto);
  if (dias === 0) return `Hola ${cliente}, buen día. Quedó pendiente el pago del flete por ${m} de hoy. ¿Podría confirmarlo? ¡Gracias!`;
  if (dias === 1) return `Hola ${cliente}, le saludo. Le recuerdo que ayer quedó pendiente el flete por ${m}. ¿Cuándo lo cuadramos? ¡Gracias!`;
  return `Hola ${cliente}, le saludo. Quería recordarle el flete por ${m} registrado hace ${dias} días que quedó pendiente de pago. ¿Cuándo podemos cuadrar? ¡Gracias!`;
}

/** Limpia y formatea un número colombiano para wa.me / tel: */
export function formatearTel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  return digits;
}
