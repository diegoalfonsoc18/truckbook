// src/Screens/FinanzasGeneral/finanzasUtils.ts
// Constantes, tipos y helpers puros del módulo de Finanzas.
// Sin JSX ni hooks: los comparten la pantalla, el modal de exportar y el
// generador del PDF (reporteHTML.ts).
import type { IconName } from "../../components/ItemIcon";

export const HORIZONTAL_PADDING = 20;


/**
 * Filtro de estado de los ingresos al exportar.
 * `null` = ambos (por defecto): un informe general debe mostrar la foto
 * completa, lo cobrado y lo que falta por cobrar.
 */
export type EstadoFiltro = "pendiente" | "pagado" | null;

export const ESTADOS_EXPORT: Array<{ key: EstadoFiltro; label: string }> = [
  { key: null, label: "Ambas" },
  { key: "pendiente", label: "Por cobrar" },
  { key: "pagado", label: "Pagadas" },
];

/** Un ingreso está pendiente de cobro cuando su estado es "pendiente". */
export const esPendiente = (i: { estado?: string | null }) => i.estado === "pendiente";

/**
 * Viajes/servicios que representa un ingreso. Un registro puede ser el mismo
 * flete repetido varias veces (campo `cantidad`), así que contar registros
 * subestima el trabajo hecho: 1 fila "x3" son 3 viajes, no 1.
 */
export const contarServicios = (lista: Array<{ cantidad?: number | null }>) =>
  lista.reduce((a, i) => a + (i.cantidad ?? 1), 0);

// Categorías para el filtro del informe (tipo_gasto / tipo_ingreso guardados)
export const CATEGORIAS_EXPORT: Array<{
  tipo: string;
  icon: IconName;
  grupo: "gasto" | "ingreso";
}> = [
  { tipo: "Combustible", icon: "fuel", grupo: "gasto" },
  { tipo: "Peajes", icon: "toll", grupo: "gasto" },
  { tipo: "Comida", icon: "food", grupo: "gasto" },
  { tipo: "Hospedaje", icon: "hotel", grupo: "gasto" },
  { tipo: "Taller", icon: "tool", grupo: "gasto" },
  { tipo: "Parqueo", icon: "parking", grupo: "gasto" },
  { tipo: "Reparación", icon: "repair", grupo: "gasto" },
  { tipo: "Llantas", icon: "tire", grupo: "gasto" },
  { tipo: "Lavado", icon: "wash", grupo: "gasto" },
  { tipo: "Aceite", icon: "oil", grupo: "gasto" },
  { tipo: "Flete", icon: "freight", grupo: "ingreso" },
  { tipo: "Mercancía", icon: "mercancia_box", grupo: "ingreso" },
  { tipo: "Anticipo", icon: "advance", grupo: "ingreso" },
  { tipo: "Reembolso", icon: "refund", grupo: "ingreso" },
  { tipo: "Cobro", icon: "factura", grupo: "ingreso" },
];

export function groupBy<T extends { fecha: string; value: number | string }>(
  items: T[],
  keyFn: (item: T) => string,
) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + Number(item.value);
    return acc;
  }, {});
}

export function filtrarPorRango<T extends { fecha: string }>(
  items: T[],
  inicio: string,
  fin: string,
) {
  if (!inicio && !fin) return items;
  return items.filter((item) => {
    if (inicio && item.fecha < inicio) return false;
    if (fin && item.fecha > fin) return false;
    return true;
  });
}

export function formatLabel(fecha: string, view: string) {
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  if (view === "dias") {
    const [, mes, dia] = fecha.split("-");
    return `${dia}/${mes}`;
  }
  if (view === "meses") {
    const [anio, mes] = fecha.split("-");
    return `${meses[parseInt(mes, 10) - 1]} ${anio?.slice(2)}`;
  }
  return fecha;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export type ViewType = "dias" | "meses" | "años";
