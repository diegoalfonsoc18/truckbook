// Presentación compartida de "movimientos" (gastos + ingresos unificados).
//
// La usan el panel de Actividad reciente del Home y la pantalla de Movimientos.
// Vive en un solo lugar para que las dos no se desincronicen en íconos,
// formato de plata o etiquetas de fecha.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { getTruckIconName, getMercanciaIcon } from "../../../utils/iconosCamion";
import type { TipoCamion } from "../../../store/VehiculoStore";
import type { Gasto } from "../../../store/GastosStore";
import type { Ingreso } from "../../../store/IngresosStore";

export const MOV_COLORS = {
  ink: "#111827",
  muted: "#6B7280",
  // Mismos verde/rojo que usa ResumenSemanal para no tener dos criterios de
  // "entra plata / sale plata" en la misma app.
  ingreso: "#16A34A",
  gasto: "#EF4444",
};

/** tipo (nombre guardado) → ícono + color. Fuente: Gastos.tsx / Ingresos.tsx */
export const CATEGORIA_META: Record<string, { icon: IconName; color: string }> =
  {
    // Gastos
    Combustible: { icon: "fuel", color: "#FFB800" },
    Peajes: { icon: "toll", color: "#00D9A5" },
    Comida: { icon: "food", color: "#F97316" },
    Hospedaje: { icon: "hotel", color: "#6C5CE7" },
    Taller: { icon: "tool", color: "#74B9FF" },
    Parqueo: { icon: "parking", color: "#FD79A8" },
    Reparación: { icon: "repair", color: "#74B9FF" },
    Llantas: { icon: "tire", color: "#A29BFE" },
    Lavado: { icon: "wash", color: "#00CEC9" },
    Aceite: { icon: "oil", color: "#FDCB6E" },
    // Ingresos
    Flete: { icon: "freight", color: "#00D9A5" },
    Mercancía: { icon: "mercancia_box", color: "#FFA500" },
    Anticipo: { icon: "advance", color: "#74B9FF" },
    Reembolso: { icon: "refund", color: "#FD79A8" },
    Cobro: { icon: "factura", color: "#E17055" },
    Otros: { icon: "otros", color: "#636E72" },
    Otro: { icon: "otros", color: "#6C5CE7" },
  };

/**
 * Flete y Mercancía no tienen un ícono fijo: dependen del camión de la placa
 * activa (una volqueta carga grava, una cisterna combustible). Misma regla que
 * usa la pantalla de Ingresos, compartida desde utils/iconosCamion.
 */
export function metaDe(
  tipo: string | null | undefined,
  tipoCamion: TipoCamion | null,
) {
  const base = (tipo && CATEGORIA_META[tipo]) || {
    icon: "otros" as IconName,
    color: "#636E72",
  };
  if (tipo === "Flete") return { ...base, icon: getTruckIconName(tipoCamion) };
  if (tipo === "Mercancía")
    return { ...base, icon: getMercanciaIcon(tipoCamion) };
  return base;
}

/** "$250.000" — COP con separador de miles */
export function fmtPesos(n: number): string {
  return (
    "$" +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/** Limpia la descripción (quita tags [TEL:...]) */
export function limpiarDesc(desc?: string | null): string {
  return (desc ?? "").replace(/\[TEL:[^\]]*\]/g, "").trim();
}

/**
 * Al registrar un gasto sin descripción se guarda el nombre de la categoría
 * como relleno, así que la fila mostraría "Combustible" arriba y "Combustible"
 * otra vez debajo en gris. Ese eco no aporta nada: se descarta.
 */
export function descripcionUtil(desc: string, tipo: string): string {
  return desc.toLowerCase() === tipo.toLowerCase() ? "" : desc;
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export const MESES_LARGOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/**
 * Etiqueta de fecha basada en la FECHA de la transacción (no en cuándo se
 * registró). "Hoy 7:45 a. m." / "Ayer" / "10 jul". La hora solo se muestra
 * cuando la transacción es de hoy (tomada de created_at).
 */
export function fechaLabel(
  fecha?: string | null,
  createdAt?: string | null,
): string {
  // Día relativo según la fecha de la transacción; si falta, cae a created_at.
  const base = fecha && fecha.length >= 10 ? fecha : createdAt;
  if (!base) return "";
  const d = new Date(base.length === 10 ? base + "T00:00:00" : base);
  if (isNaN(d.getTime())) return "";

  const hoy = new Date();
  const dDia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((hDia.getTime() - dDia.getTime()) / 86_400_000);

  const dia =
    dias === 0
      ? "Hoy"
      : dias === 1
        ? "Ayer"
        : `${d.getDate()} ${MESES[d.getMonth()]}`;

  // Hora solo para movimientos de hoy (de created_at, cuándo se registró)
  if (dias === 0 && createdAt) {
    const t = new Date(createdAt);
    if (!isNaN(t.getTime())) {
      let h = t.getHours();
      const ampm = h < 12 ? "a. m." : "p. m.";
      h = h % 12 || 12;
      return `${dia} ${h}:${String(t.getMinutes()).padStart(2, "0")} ${ampm}`;
    }
  }
  return dia;
}

export interface Mov {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
  esIngreso: boolean; // define el signo y el color del monto
  fecha: string; // fecha de la transacción (para la etiqueta)
  ts: string; // created_at (para ordenar por lo más reciente agregado)
}

// Formas mínimas: sirven tanto para las filas del store como para las que
// devuelve reporteService, que son la misma tabla pero con tipos distintos.
type GastoMin = Pick<
  Gasto,
  "id" | "tipo_gasto" | "descripcion" | "monto" | "fecha" | "created_at"
>;
type IngresoMin = Pick<
  Ingreso,
  "id" | "tipo_ingreso" | "descripcion" | "monto" | "fecha" | "created_at"
> & { cantidad?: number | null };

/** Gastos + ingresos unificados y ordenados: lo más reciente primero. */
export function construirMovimientos(
  gastos: GastoMin[],
  ingresos: IngresoMin[],
): Mov[] {
  const gs: Mov[] = gastos.map((g) => {
    const tipo = g.tipo_gasto ?? "Otros";
    return {
      id: `g-${g.id}`,
      tipo,
      descripcion: descripcionUtil(limpiarDesc(g.descripcion), tipo),
      monto: g.monto ?? 0,
      esIngreso: false,
      fecha: g.fecha ?? "",
      ts: g.created_at ?? g.fecha ?? "",
    };
  });
  const is: Mov[] = ingresos.map((i) => {
    const tipo = i.tipo_ingreso ?? "Otro";
    return {
      id: `i-${i.id}`,
      tipo,
      descripcion: descripcionUtil(limpiarDesc(i.descripcion), tipo),
      monto: (i.monto ?? 0) * (i.cantidad ?? 1),
      esIngreso: true,
      fecha: i.fecha ?? "",
      ts: i.created_at ?? i.fecha ?? "",
    };
  });
  return [...gs, ...is].sort((a, b) => {
    // 1º por fecha de la transacción (más reciente arriba)
    const fa = a.fecha || a.ts.slice(0, 10);
    const fb = b.fecha || b.ts.slice(0, 10);
    if (fa !== fb) return fa > fb ? -1 : 1;
    // 2º desempate: por hora en que se agregó (created_at)
    return a.ts > b.ts ? -1 : 1;
  });
}

/** Fila de un movimiento: ícono, tipo + descripción, monto con signo y fecha. */
export function MovimientoRow({
  mov,
  tipoCamion,
}: {
  mov: Mov;
  tipoCamion: TipoCamion | null;
}) {
  const meta = metaDe(mov.tipo, tipoCamion);
  return (
    <View style={s.movRow}>
      <View style={[s.movIcon, { backgroundColor: meta.color + "22" }]}>
        <ItemIcon name={meta.icon} size={22} />
      </View>
      <View style={s.movMid}>
        <Text style={s.movTipo} numberOfLines={1}>
          {mov.tipo}
        </Text>
        {!!mov.descripcion && (
          <Text style={s.movDesc} numberOfLines={1}>
            {mov.descripcion}
          </Text>
        )}
      </View>
      <View style={s.movRight}>
        {/* La lista mezcla ingresos y gastos: sin signo ni color, un monto
            suelto no dice si la plata entró o salió. */}
        <Text
          style={[
            s.movMonto,
            { color: mov.esIngreso ? MOV_COLORS.ingreso : MOV_COLORS.gasto },
          ]}
          numberOfLines={1}>
          {mov.esIngreso ? "+" : "−"}
          {fmtPesos(mov.monto)}
        </Text>
        <Text style={s.movFecha} numberOfLines={1}>
          {fechaLabel(mov.fecha, mov.ts)}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  movRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  movIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  movMid: { flex: 1 },
  movTipo: {
    fontSize: 14,
    fontWeight: "700",
    color: MOV_COLORS.ink,
    letterSpacing: -0.2,
  },
  movDesc: {
    fontSize: 12,
    color: MOV_COLORS.muted,
    marginTop: 1,
  },
  movRight: { alignItems: "flex-end" },
  movMonto: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  movFecha: {
    fontSize: 11,
    color: MOV_COLORS.muted,
    marginTop: 1,
  },
});
