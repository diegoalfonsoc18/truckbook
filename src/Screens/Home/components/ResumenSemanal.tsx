// src/Screens/Home/components/ResumenSemanal.tsx
// Panel "RESUMEN SEMANAL" — 4 tarjetas (Ingresos, Gastos, Viajes, Clientes)
// comparando esta semana vs. la anterior, más la card "Por cobrar" (total de
// ingresos pendientes). Lee los stores igual que WidgetResumen / WidgetInsightIA.
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import { inicioSemana, fmtI } from "../homeUtils";
import { HOME_COLORS } from "../HomeConstants";
import { ModalPendientes } from "./ModalPendientes";
import ItemIcon from "../../../components/ItemIcon";

const COLORS = {
  green: "#16A34A",
  red: "#EF4444",
  blue: "#3B82F6",
  orange: "#F59E0B",
  ink: "#111827",
  muted: "#6B7280",
  cardBg: "#FFFFFF",
  panelBg: "#F4F5F7",
  panelLabel: "#6B7280",
};

/** "$1.250.000" — formato COP con separador de miles (punto) */
function fmtPesos(n: number): string {
  return (
    "$" +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/** Nombre de cliente a partir de la descripción del flete */
function clienteDeDesc(desc?: string | null): string | null {
  if (!desc) return null;
  const nombre = desc
    .replace(/\[TEL:[^\]]*\]/g, "")
    .split(" · ")[0]
    ?.trim();
  return nombre && nombre !== "Flete" ? nombre : null;
}

/** Nombre de cliente de un pendiente (fallback a tipo) */
function clientePend(desc?: string | null, tipo?: string | null): string {
  return (desc ?? tipo ?? "Flete")
    .replace(/\[TEL:[^\]]*\]/g, "")
    .split(" · ")[0]
    .trim();
}

interface Delta {
  arrow: "up" | "down" | "flat";
  text: string;
  color: string;
}

/** Delta porcentual (Ingresos/Gastos) — higherIsBetter define el color */
function pctDelta(
  actual: number,
  anterior: number,
  higherIsBetter: boolean,
): Delta {
  if (anterior <= 0) {
    if (actual <= 0) return { arrow: "flat", text: "0%", color: COLORS.muted };
    return {
      arrow: "up",
      text: "Nuevo",
      color: higherIsBetter ? COLORS.green : COLORS.red,
    };
  }
  const pct = ((actual - anterior) / anterior) * 100;
  const arrow = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const good = pct > 0 === higherIsBetter;
  const color = pct === 0 ? COLORS.muted : good ? COLORS.green : COLORS.red;
  return { arrow, text: `${Math.abs(pct).toFixed(0)}%`, color };
}

/** Delta absoluto (Viajes/Clientes) */
function countDelta(actual: number, anterior: number): Delta {
  const diff = actual - anterior;
  const arrow = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const color =
    diff === 0 ? COLORS.muted : diff > 0 ? COLORS.green : COLORS.red;
  return { arrow, text: `${Math.abs(diff)}`, color };
}

interface CardData {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  value: string;
  delta: Delta;
}

interface Props {
  isDark: boolean;
}

export default function ResumenSemanal({ isDark }: Props) {
  const placa = useVehiculoStore((s) => s.placa);
  const gastos = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  const [modalVisible, setModalVisible] = useState(false);

  const cards = React.useMemo<CardData[]>(() => {
    const iniEsta = inicioSemana(0); // lunes de esta semana
    const iniAnt = inicioSemana(1); // lunes de la semana anterior

    const gs = gastos.filter((g) => g.placa === placa);
    const is = ingresos.filter((i) => i.placa === placa);

    const fecha = (r: { fecha?: string | null; created_at?: string | null }) =>
      r.fecha ?? r.created_at ?? "";
    const estaSemana = <
      T extends { fecha?: string | null; created_at?: string | null },
    >(
      arr: T[],
    ) => arr.filter((r) => fecha(r) >= iniEsta);
    const semanaAnterior = <
      T extends { fecha?: string | null; created_at?: string | null },
    >(
      arr: T[],
    ) => arr.filter((r) => fecha(r) >= iniAnt && fecha(r) < iniEsta);

    const gAct = estaSemana(gs);
    const gAnt = semanaAnterior(gs);
    const iAct = estaSemana(is);
    const iAnt = semanaAnterior(is);

    const sumG = (arr: typeof gs) =>
      arr.reduce((a, g) => a + (g.monto ?? 0), 0);
    const sumI = (arr: typeof is) =>
      arr.reduce((a, i) => a + (i.monto ?? 0) * (i.cantidad ?? 1), 0);

    const fletes = (arr: typeof is) =>
      arr.filter((i) => i.tipo_ingreso === "Flete");
    const clientes = (arr: typeof is) => {
      const set = new Set<string>();
      for (const i of fletes(arr)) {
        const n = clienteDeDesc(i.descripcion);
        if (n) set.add(n);
      }
      return set.size;
    };

    return [
      {
        key: "ingresos",
        label: "Ingresos",
        icon: "trending-up",
        iconBg: COLORS.green,
        value: fmtI(sumI(iAct)),
        delta: pctDelta(sumI(iAct), sumI(iAnt), true),
      },
      {
        key: "gastos",
        label: "Gastos",
        icon: "trending-down",
        iconBg: COLORS.red,
        value: fmtI(sumG(gAct)),
        delta: pctDelta(sumG(gAct), sumG(gAnt), false),
      },
      {
        key: "viajes",
        label: "Viajes",
        icon: "clipboard",
        iconBg: COLORS.blue,
        value: String(fletes(iAct).length),
        delta: countDelta(fletes(iAct).length, fletes(iAnt).length),
      },
      {
        key: "clientes",
        label: "Clientes",
        icon: "people",
        iconBg: COLORS.orange,
        value: String(clientes(iAct)),
        delta: countDelta(clientes(iAct), clientes(iAnt)),
      },
    ];
  }, [placa, gastos, ingresos]);

  // ── Por cobrar (ingresos pendientes de la placa activa) ──
  const pendientes = React.useMemo(
    () =>
      ingresos
        .filter((i) => i.placa === placa && i.estado === "pendiente")
        .sort((a, b) => ((a.fecha ?? "") > (b.fecha ?? "") ? 1 : -1)),
    [ingresos, placa],
  );
  const totalPend = pendientes.reduce(
    (a, i) => a + (i.monto ?? 0) * (i.cantidad ?? 1),
    0,
  );
  const numClientes = React.useMemo(() => {
    const set = new Set<string>();
    for (const i of pendientes)
      set.add(clientePend(i.descripcion, i.tipo_ingreso));
    return set.size;
  }, [pendientes]);
  const hayPendientes = pendientes.length > 0;

  const arrowIcon = (a: Delta["arrow"]) =>
    a === "up" ? "arrow-up" : a === "down" ? "arrow-down" : "remove";

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

  return (
    <View style={s.wrap}>
      <Text style={s.sectionLabel}>RESUMEN SEMANAL</Text>

      <View style={s.cardsRow}>
        {cards.map((card) => (
          <View key={card.key} style={s.card}>
            <View style={[s.iconSquare, { backgroundColor: card.iconBg }]}>
              <Ionicons name={card.icon} size={17} color="#FFFFFF" />
            </View>
            <Text style={s.cardLabel}>{card.label}</Text>
            <Text style={s.cardValue} numberOfLines={1}>
              {card.value}
            </Text>
            <View style={s.deltaRow}>
              <Ionicons
                name={arrowIcon(card.delta.arrow)}
                size={12}
                color={card.delta.color}
              />
              <Text
                style={[s.deltaText, { color: card.delta.color }]}
                numberOfLines={1}>
                {card.delta.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Por cobrar */}
      <Pressable
        style={({ pressed }) => [
          s.porCobrar,
          pressed && hayPendientes && { opacity: 0.9 },
        ]}
        onPress={() => hayPendientes && setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Por cobrar: ${fmtPesos(totalPend)}, ${numClientes} clientes`}>
        <View style={s.pcTextCol}>
          <Text style={s.pcLabel}>Por cobrar</Text>
          <Text style={s.pcValue} numberOfLines={1} adjustsFontSizeToFit>
            {hayPendientes ? fmtPesos(totalPend) : "Al día ✓"}
          </Text>
          <Text style={s.pcSub}>
            {hayPendientes
              ? `${numClientes} ${numClientes === 1 ? "cliente" : "clientes"}`
              : "Sin cuentas por cobrar"}
          </Text>
        </View>

        <ItemIcon name="advance" size={56} />

        {hayPendientes && (
          <View style={s.chevronBtn}>
            <SFIcon
              name="chevron.right"
              fallback="chevron-forward"
              size={18}
              color={HOME_COLORS.vehicleCardText}
            />
          </View>
        )}
      </Pressable>

      <ModalPendientes
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        pendientes={pendientes}
        isDark={isDark}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: COLORS.panelLabel,
    marginBottom: 12,
    marginLeft: 2,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 9,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },
  iconSquare: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.muted,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.ink,
    marginBottom: 4,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Por cobrar
  porCobrar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
    }),
  },
  pcTextCol: {
    flex: 1,
  },
  pcLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: COLORS.muted,
    marginBottom: 2,
  },
  pcValue: {
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.ink,
    marginBottom: 1,
  },
  pcSub: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.muted,
  },
  chevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.panelBg,
    alignItems: "center",
    justifyContent: "center",
  },
});
