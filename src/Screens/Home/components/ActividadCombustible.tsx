// src/Screens/Home/components/ActividadCombustible.tsx
// Fila de dos paneles debajo de RESUMEN SEMANAL:
//  · ACTIVIDAD RECIENTE — últimos movimientos (gastos + ingresos)
//  · COMBUSTIBLE — gauge de galones del mes vs. capacidad estimada
import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Svg, { Path } from "react-native-svg";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import { usePrecioDiesel } from "../../../hooks/usePrecioDiesel";
import ItemIcon, { IconName } from "../../../components/ItemIcon";

// Capacidad de tanque estimada (placeholder — no hay campo en BD todavía).
const CAPACIDAD_GAL = 100;

const COLORS = {
  ink: "#111827",
  muted: "#6B7280",
  panelBg: "#F4F5F7",
  amber: "#F5A623",
  track: "#E3E5E9",
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
const metaDe = (tipo?: string | null) =>
  (tipo && CATEGORIA_META[tipo]) || { icon: "otros" as IconName, color: "#636E72" };

/** "$250.000" — COP con separador de miles */
function fmtPesos(n: number): string {
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Limpia la descripción (quita tags [TEL:...]) */
function limpiarDesc(desc?: string | null): string {
  return (desc ?? "").replace(/\[TEL:[^\]]*\]/g, "").trim();
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "Hoy 7:45 a. m." / "Ayer 4:30 p. m." / "10 jul 3:00 p. m." */
function fechaHora(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";

  const hoy = new Date();
  const dDia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((hDia.getTime() - dDia.getTime()) / 86_400_000);

  let h = d.getHours();
  const ampm = h < 12 ? "a. m." : "p. m.";
  h = h % 12 || 12;
  const hora = `${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;

  const dia =
    dias === 0
      ? "Hoy"
      : dias === 1
        ? "Ayer"
        : `${d.getDate()} ${MESES[d.getMonth()]}`;
  return `${dia} ${hora}`;
}

interface Mov {
  id: string;
  tipo: string;
  descripcion: string;
  monto: number;
  ts: string;
}

interface Props {
  isDark: boolean;
  onVerTodas?: () => void;
}

const SFIcon = ({
  name,
  fallback,
  size,
  color,
}: {
  name: SFSymbol;
  fallback: string;
  size: number;
  color: string;
}) =>
  Platform.OS === "ios" ? (
    <SymbolView name={name} size={size} tintColor={color} weight="semibold" />
  ) : (
    <Ionicons name={fallback as any} size={size} color={color} />
  );

// ─── Gauge de combustible ───────────────────────────────────────────────
function FuelGauge({ ratio }: { ratio: number }) {
  const CX = 60,
    CY = 60,
    R = 46,
    SW = 12;
  const START = 160,
    SPAN = 220;
  const pt = (deg: number) => ({
    x: CX + R * Math.cos((deg * Math.PI) / 180),
    y: CY + R * Math.sin((deg * Math.PI) / 180),
  });
  const arc = (from: number, sweep: number) => {
    if (sweep <= 0.1) return "";
    const s = pt(from);
    const e = pt(from + sweep);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  const fill = Math.max(0, Math.min(1, ratio)) * SPAN;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 84">
      <Path d={arc(START, SPAN)} stroke={COLORS.track} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <Path d={arc(START, fill)} stroke={COLORS.amber} strokeWidth={SW} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function ActividadCombustible({ isDark, onVerTodas }: Props) {
  const placa = useVehiculoStore((s) => s.placa);
  const gastos = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  const { precio: precioGalon } = usePrecioDiesel();

  // ── Movimientos recientes (gastos + ingresos) ──
  const recientes = React.useMemo<Mov[]>(() => {
    const gs: Mov[] = gastos
      .filter((g) => g.placa === placa)
      .map((g) => ({
        id: `g-${g.id}`,
        tipo: g.tipo_gasto ?? "Otros",
        descripcion: limpiarDesc(g.descripcion),
        monto: g.monto ?? 0,
        ts: g.created_at ?? g.fecha ?? "",
      }));
    const is: Mov[] = ingresos
      .filter((i) => i.placa === placa)
      .map((i) => ({
        id: `i-${i.id}`,
        tipo: i.tipo_ingreso ?? "Otro",
        descripcion: limpiarDesc(i.descripcion),
        monto: (i.monto ?? 0) * (i.cantidad ?? 1),
        ts: i.created_at ?? i.fecha ?? "",
      }));
    return [...gs, ...is]
      .sort((a, b) => (a.ts > b.ts ? -1 : 1))
      .slice(0, 3);
  }, [gastos, ingresos, placa]);

  // ── Galones del mes actual ──
  const galones = React.useMemo(() => {
    const now = new Date();
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const gasto = gastos
      .filter(
        (g) =>
          g.placa === placa &&
          g.tipo_gasto === "Combustible" &&
          (g.fecha ?? g.created_at ?? "").startsWith(mes),
      )
      .reduce((a, g) => a + (g.monto ?? 0), 0);
    return precioGalon > 0 ? Math.round(gasto / precioGalon) : 0;
  }, [gastos, placa, precioGalon]);

  return (
    <View style={s.wrap}>
      {/* ACTIVIDAD RECIENTE — full width */}
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelLabel} numberOfLines={1}>
            ACTIVIDAD RECIENTE
          </Text>
          <Pressable onPress={onVerTodas} hitSlop={8}>
            <Text style={s.verTodas}>Ver todas</Text>
          </Pressable>
        </View>

        {recientes.length === 0 ? (
          <Text style={s.vacio}>Sin movimientos aún</Text>
        ) : (
          recientes.map((m) => {
            const meta = metaDe(m.tipo);
            return (
              <View key={m.id} style={s.movRow}>
                <View style={[s.movIcon, { backgroundColor: meta.color + "22" }]}>
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
                    {fechaHora(m.ts)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* COMBUSTIBLE — full width, horizontal (gauge + info) */}
      <View style={[s.panel, s.panelFuel]}>
        <View style={s.gaugeWrap}>
          <FuelGauge ratio={galones / CAPACIDAD_GAL} />
          <View style={s.gaugeCenter} pointerEvents="none">
            <SFIcon name="fuelpump.fill" fallback="flame" size={17} color={COLORS.ink} />
            <Text style={s.gaugeValue}>{galones}</Text>
            <Text style={s.gaugeUnit}>galones</Text>
          </View>
        </View>
        <View style={s.fuelInfo}>
          <Text style={s.panelLabel}>COMBUSTIBLE</Text>
          <Text style={s.fuelBig}>
            {galones}
            <Text style={s.fuelBigUnit}> gal este mes</Text>
          </Text>
          <Text style={s.capacidad}>Capacidad estimada: {CAPACIDAD_GAL} gal</Text>
        </View>
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
    gap: 12,
    marginBottom: 12,
  },
  panel: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    padding: 14,
    ...panelShadow,
  },
  panelFuel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  gaugeWrap: {
    width: 116,
    aspectRatio: 120 / 84,
  },
  fuelInfo: {
    flex: 1,
    paddingLeft: 4,
  },
  fuelBig: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  fuelBigUnit: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    letterSpacing: 0,
  },
  gaugeCenter: {
    position: "absolute",
    top: "26%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  gaugeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  gaugeUnit: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: -1,
  },
  capacidad: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
});
