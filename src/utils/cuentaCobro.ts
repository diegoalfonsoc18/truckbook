// src/utils/cuentaCobro.ts
// Mensaje de cobro tipo "cuenta de cobro resumida" para WhatsApp/copiar:
// una línea por flete pendiente (fecha, detalle, cantidad, monto) + total.
// Compartido por CentroPendientes y ModalPendientes (Home).

export interface LineaCobro {
  fecha?: string | null; // YYYY-MM-DD
  detalle?: string | null; // descripción sin cliente ni [TEL:...]
  cantidad?: number | null; // fletes múltiples (x2, x3…)
  monto: number; // monto pendiente de la línea (ya multiplicado por cantidad)
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);

/** dd/mm desde YYYY-MM-DD sin pasar por Date (evita saltos de día por UTC) */
const fechaCorta = (f?: string | null) =>
  f && f.length >= 10 ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : "";

export function mensajeCuentaCobro(
  cliente: string,
  lineas: LineaCobro[],
): string {
  const total = lineas.reduce((a, l) => a + l.monto, 0);

  const items = lineas.map((l) => {
    const cant = l.cantidad ?? 1;
    const partes = [
      fechaCorta(l.fecha),
      (l.detalle?.trim() || "Flete") + (cant > 1 ? ` (x${cant})` : ""),
    ].filter(Boolean);
    return `• ${partes.join(" — ")}: ${fmt(l.monto)}`;
  });

  const saludo =
    lineas.length > 1
      ? `Hola ${cliente}, buen día. Le comparto el resumen de los pagos pendientes:`
      : `Hola ${cliente}, buen día. Le recuerdo el pago pendiente:`;
  const totalLinea =
    lineas.length > 1 ? `\n\nTotal pendiente: ${fmt(total)}` : "";

  return `${saludo}\n\n${items.join("\n")}${totalLinea}\n\n¿Cuándo podemos cuadrar el pago? ¡Gracias!`;
}
