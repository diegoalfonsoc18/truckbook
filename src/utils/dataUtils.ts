/**
 * Devuelve la fecha local del dispositivo como "YYYY-MM-DD".
 * Usar en lugar de `new Date().toISOString().split("T")[0]`, que usa UTC
 * y puede mostrar el día siguiente en zonas UTC− (ej. Colombia UTC-5).
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const formatDate = (date: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(date).toLocaleDateString("es-ES", options);
};

export const getCurrentDay = (): string => {
  const today = new Date();
  return today.getDate().toString();
};
