// Verificación de edad del registro. La app es solo para mayores de 18: no se
// permiten cuentas de menores. La fecha de nacimiento NO se guarda en ningún
// lado; solo se usa para validar en el momento y se registra `mayor_de_edad`.
export const EDAD_MINIMA = 18;

/** Deja solo dígitos y los muestra como DD/MM/AAAA mientras se escribe. */
export function formatearNacimiento(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Edad en años cumplidos, o null si la fecha está incompleta o no existe. */
export function calcularEdad(texto: string, hoy: Date = new Date()): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  const f = new Date(anio, mes - 1, dia);
  // Rechaza fechas que JS "corrige" (31/02 → 03/03) y años imposibles
  if (
    f.getFullYear() !== anio ||
    f.getMonth() !== mes - 1 ||
    f.getDate() !== dia ||
    anio < 1900 ||
    f > hoy
  )
    return null;
  let edad = hoy.getFullYear() - anio;
  const cumplio =
    hoy.getMonth() > mes - 1 || (hoy.getMonth() === mes - 1 && hoy.getDate() >= dia);
  if (!cumplio) edad -= 1;
  return edad;
}

/** Mensaje de error de la fecha de nacimiento, o undefined si es válida y mayor de edad. */
export function errorNacimiento(texto: string): string | undefined {
  if (!texto.trim()) return "La fecha de nacimiento es requerida";
  const edad = calcularEdad(texto);
  if (edad === null) return "Ingresa una fecha válida (DD/MM/AAAA)";
  if (edad < EDAD_MINIMA)
    return `Debes tener al menos ${EDAD_MINIMA} años para crear una cuenta en TruckBook.`;
  return undefined;
}
