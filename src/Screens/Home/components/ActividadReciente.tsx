// src/Screens/Home/components/ActividadReciente.tsx
// Panel de últimos movimientos (gastos + ingresos) de la placa activa.
// (El combustible ya se muestra en la VehicleCard — aquí no se duplica.)
import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import {
  getTruckIconName,
  getMercanciaIcon,
} from "../../../utils/iconosCamion";
import type { TipoCamion } from "../../../store/VehiculoStore";

const COLORS = {
  ink: "#111827",
  muted: "#6B7280",
  panelBg: "#F4F5F7",
  link: "#F5A623",
};

/** tipo (nombre guardado) → ícono + color. Fuente: Gastos.tsx / Ingresos.tsx */
const CATEGORIA_META: Record<string, { icon: IconName; color: string }> = {
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
const metaDe = (tipo: string | null | undefined, tipoCamion: TipoCamion | null) => {
  const base = (tipo && CATEGORIA_META[tipo]) || {
    icon: "otros" as IconName,
    color: "#636E72",
  };
  if (tipo === "Flete") return { ...base, icon: getTruckIconName(tipoCamion) };
  if (tipo === "Mercancía") return { ...base, icon: getMercanciaIcon(tipoCamion) };
  return base;
};

/** "$250.000" — COP con separador de miles */
function fmtPesos(n: number): string {
  return (
    "$" +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/** Limpia la descripción (quita tags [TEL:...]) */
function limpiarDesc(desc?: string | null): string {
  return (desc ?? "").replace(/\[TEL:[^\]]*\]/g, "").trim();
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

/**
 * Etiqueta de fecha basada en la FECHA de la transacción (no en cuándo se
 * registró). "Hoy 7:45 a. m." / "Ayer" / "10 jul". La hora solo se muestra
 * cuando la transacción es de hoy (tomada de created_at).
 */
function fechaLabel(fecha?: string | null, createdAt?: string | null): string {
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

interface Mov {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: string; // fecha de la transacción (para la etiqueta)
  ts: string; // created_at (para ordenar por lo más reciente agregado)
}

interface Props {
  isDark: boolean;
  onVerTodas?: () => void;
}

export default function ActividadReciente({ onVerTodas }: Props) {
  const placa = useVehiculoStore((s) => s.placa);
  const tipoCamion = useVehiculoStore((s) => s.tipoCamion);
  const gastos = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);

  const recientes = React.useMemo<Mov[]>(() => {
    const gs: Mov[] = gastos
      .filter((g) => g.placa === placa)
      .map((g) => ({
        id: `g-${g.id}`,
        tipo: g.tipo_gasto ?? "Otros",
        descripcion: limpiarDesc(g.descripcion),
        monto: g.monto ?? 0,
        fecha: g.fecha ?? "",
        ts: g.created_at ?? g.fecha ?? "",
      }));
    const is: Mov[] = ingresos
      .filter((i) => i.placa === placa)
      .map((i) => ({
        id: `i-${i.id}`,
        tipo: i.tipo_ingreso ?? "Otro",
        descripcion: limpiarDesc(i.descripcion),
        monto: (i.monto ?? 0) * (i.cantidad ?? 1),
        fecha: i.fecha ?? "",
        ts: i.created_at ?? i.fecha ?? "",
      }));
    return [...gs, ...is]
      .sort((a, b) => {
        // 1º por fecha de la transacción (más reciente arriba)
        const fa = a.fecha || a.ts.slice(0, 10);
        const fb = b.fecha || b.ts.slice(0, 10);
        if (fa !== fb) return fa > fb ? -1 : 1;
        // 2º desempate: por hora en que se agregó (created_at)
        return a.ts > b.ts ? -1 : 1;
      })
      .slice(0, 5);
  }, [gastos, ingresos, placa]);

  return (
    <View style={s.wrap}>
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelLabel} numberOfLines={1}>
            Actividad reciente
          </Text>
          <Pressable onPress={onVerTodas} hitSlop={8}>
            <Text style={s.verTodas}>Ver todas</Text>
          </Pressable>
        </View>

        {recientes.length === 0 ? (
          <Text style={s.vacio}>Sin movimientos aún</Text>
        ) : (
          recientes.map((m) => {
            const meta = metaDe(m.tipo, tipoCamion);
            return (
              <View key={m.id} style={s.movRow}>
                <View
                  style={[s.movIcon, { backgroundColor: meta.color + "22" }]}>
                  <ItemIcon name={meta.icon} size={22} />
                </View>
                <View style={s.movMid}>
                  <Text style={s.movTipo} numberOfLines={1}>
                    {m.tipo}
                  </Text>
                  {!!m.descripcion && (
                    <Text style={s.movDesc} numberOfLines={1}>
                      {m.descripcion}
                    </Text>
                  )}
                </View>
                <View style={s.movRight}>
                  <Text style={s.movMonto} numberOfLines={1}>
                    {fmtPesos(m.monto)}
                  </Text>
                  <Text style={s.movFecha} numberOfLines={1}>
                    {fechaLabel(m.fecha, m.ts)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const panelShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
});

const s = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  panel: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    padding: 14,
    ...panelShadow,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: COLORS.muted,
    flexShrink: 1,
  },
  verTodas: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.link,
  },
  vacio: {
    fontSize: 13,
    color: COLORS.muted,
    paddingVertical: 8,
  },
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
  movMid: {
    flex: 1,
  },
  movTipo: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  movDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  movRight: {
    alignItems: "flex-end",
  },
  movMonto: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  movFecha: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
});
