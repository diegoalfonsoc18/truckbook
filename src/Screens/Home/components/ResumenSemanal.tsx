// src/Screens/Home/components/ResumenMensual.tsx
// Panel "Último mes" — 4 tarjetas (Ingresos, Gastos, Viajes, Clientes)
// comparando los últimos 30 días vs. los 30 anteriores, más la card "Por cobrar" (total de
// ingresos pendientes). Lee los stores igual que WidgetResumen / WidgetInsightIA.
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import { haceDias, fmtI } from "../homeUtils";
import { ModalPendientes } from "./ModalPendientes";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { programarRecordatorioIACobros } from "../../../services/pendientesNotificacionService";

const COLORS = {
  green: "#16A34A",
  red: "#EF4444",
  brand: "#E31937",
  ink: "#111827",
  muted: "#6B7280",
  cardBg: "#F6F6F6",
  panelBg: "#F6F6F6",
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
function clienteDeIngreso(i: {
  cliente?: string | null;
  descripcion?: string | null;
  tipo_ingreso?: string | null;
}): string | null {
  // Los registros nuevos guardan el cliente en su propia columna; los viejos
  // (y las facturas escaneadas) solo lo tienen al inicio de la descripción.
  const directo = (i.cliente ?? "").trim();
  if (directo) return directo;

  const nombre = (i.descripcion ?? "")
    .replace(/\[TEL:[^\]]*\]/g, "")
    .split(" · ")[0]
    ?.trim();
  if (!nombre) return null;

  // Cuando no se carga cliente se guarda el nombre de la categoría como
  // relleno ("Flete", "Mercancía"…). Ese eco no es un cliente.
  const tipo = (i.tipo_ingreso ?? "").trim();
  return nombre.toLowerCase() === tipo.toLowerCase() ? null : nombre;
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
  // Viajes y clientes no son estados financieros: sin verde/rojo.
  return { arrow, text: `${Math.abs(diff)}`, color: COLORS.muted };
}

interface CardData {
  key: string;
  label: string;
  icon: IconName;
  iconBg: string;
  value: string;
  /** Valor numérico crudo (para el balance). */
  raw: number;
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
  const [oculto, setOculto] = useState(false);
  const navigation = useNavigation<any>();

  const cards = React.useMemo<CardData[]>(() => {
    // Ventana móvil: últimos 30 días vs. los 30 anteriores. Así el panel nunca
    // arranca en blanco (como pasaba el lunes con la semana en curso).
    const iniEsta = haceDias(29);
    const iniAnt = haceDias(59);

    const gs = gastos.filter((g) => g.placa === placa);
    const is = ingresos.filter((i) => i.placa === placa);

    const fecha = (r: { fecha?: string | null; created_at?: string | null }) =>
      r.fecha ?? r.created_at ?? "";
    const ultimoMes = <
      T extends { fecha?: string | null; created_at?: string | null },
    >(
      arr: T[],
    ) => arr.filter((r) => fecha(r) >= iniEsta);
    const mesAnterior = <
      T extends { fecha?: string | null; created_at?: string | null },
    >(
      arr: T[],
    ) => arr.filter((r) => fecha(r) >= iniAnt && fecha(r) < iniEsta);

    const gAct = ultimoMes(gs);
    const gAnt = mesAnterior(gs);
    const iAct = ultimoMes(is);
    const iAnt = mesAnterior(is);

    const sumG = (arr: typeof gs) =>
      arr.reduce((a, g) => a + (g.monto ?? 0), 0);
    const sumI = (arr: typeof is) =>
      arr.reduce((a, i) => a + (i.monto ?? 0) * (i.cantidad ?? 1), 0);

    const fletes = (arr: typeof is) =>
      arr.filter((i) => i.tipo_ingreso === "Flete");
    // Viajes = suma de cantidad de los fletes (un flete puede ser x2, x3…)
    const viajes = (arr: typeof is) =>
      fletes(arr).reduce((a, i) => a + (i.cantidad ?? 1), 0);
    // Clientes: cualquier ingreso con cliente cargado, no solo fletes. Una
    // venta de mercancía (o un anticipo, un cobro) también es un cliente y
    // antes no se contaba. Se comparan en minúsculas para no duplicar el
    // mismo cliente escrito distinto.
    const clientes = (arr: typeof is) => {
      const set = new Set<string>();
      for (const i of arr) {
        const n = clienteDeIngreso(i);
        if (n) set.add(n.toLowerCase());
      }
      return set.size;
    };

    return [
      {
        key: "ingresos",
        label: "Ingresos",
        icon: "freight",
        iconBg: COLORS.ink,
        value: fmtI(sumI(iAct)),
        raw: sumI(iAct),
        delta: pctDelta(sumI(iAct), sumI(iAnt), true),
      },
      {
        key: "gastos",
        label: "Gastos",
        icon: "toll",
        iconBg: COLORS.ink,
        value: fmtI(sumG(gAct)),
        raw: sumG(gAct),
        delta: pctDelta(sumG(gAct), sumG(gAnt), false),
      },
      {
        key: "viajes",
        label: "Viajes",
        icon: "trip",
        iconBg: COLORS.ink,
        value: String(viajes(iAct)),
        raw: viajes(iAct),
        delta: countDelta(viajes(iAct), viajes(iAnt)),
      },
      {
        key: "clientes",
        label: "Clientes",
        icon: "conductor",
        iconBg: COLORS.ink,
        value: String(clientes(iAct)),
        raw: clientes(iAct),
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

  // Recordatorio IA de cobros: se reprograma cuando cambian los pendientes
  // (antes vivía en WidgetInsightIA, ya retirado del Home).
  useEffect(() => {
    programarRecordatorioIACobros(pendientes).catch(() => {});
  }, [pendientes]);

  const arrowIcon = (a: Delta["arrow"]) =>
    a === "up" ? "arrow-up" : a === "down" ? "arrow-down" : "remove";

  const ingresos30 = cards.find((c) => c.key === "ingresos")?.raw ?? 0;
  const gastos30 = cards.find((c) => c.key === "gastos")?.raw ?? 0;
  const viajes30 = cards.find((c) => c.key === "viajes")?.raw ?? 0;
  const clientes30 = cards.find((c) => c.key === "clientes")?.raw ?? 0;
  const balance = ingresos30 - gastos30;
  const ocultar = (v: string) => (oculto ? "••••••" : v);

  return (
    <View style={s.wrap}>
      {/* TARJETA NEGRA — balance de los últimos 30 días */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.heroLabel}>Balance del último mes</Text>
          <View style={s.heroPill}>
            <Text style={s.heroPillTexto}>30 días</Text>
          </View>
        </View>
        <View style={s.heroMonto}>
          <Text style={s.heroValor} numberOfLines={1} adjustsFontSizeToFit>
            {ocultar(`${balance < 0 ? "−" : ""}${fmtPesos(Math.abs(balance))}`)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={oculto ? "Mostrar montos" : "Ocultar montos"}
            hitSlop={10}
            onPress={() => setOculto((v) => !v)}>
            <Ionicons
              name={oculto ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="rgba(255,255,255,0.7)"
            />
          </Pressable>
        </View>
        <Text style={s.heroSub}>
          {viajes30} {viajes30 === 1 ? "viaje" : "viajes"} · {clientes30}{" "}
          {clientes30 === 1 ? "cliente" : "clientes"}
        </Text>
        <View style={s.heroBtns}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Ingresos")}
            style={({ pressed }) => [s.heroBtn, s.heroBtnBlanco, pressed && { opacity: 0.85 }]}>
            <Ionicons name="add" size={18} color="#111111" />
            <Text style={[s.heroBtnTexto, { color: "#111111" }]}>Ingreso</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Gastos")}
            style={({ pressed }) => [s.heroBtn, s.heroBtnGris, pressed && { opacity: 0.85 }]}>
            <Ionicons name="remove" size={18} color="#FFFFFF" />
            <Text style={[s.heroBtnTexto, { color: "#FFFFFF" }]}>Gasto</Text>
          </Pressable>
        </View>
      </View>

      {/* CUENTAS — tres tarjetas pequeñas */}
      <View style={s.seccionHead}>
        <Text style={s.seccionTitulo}>Resumen</Text>
        <Text style={s.seccionLink}>Últimos 30 días</Text>
      </View>
      <View style={s.mini}>
        <View style={s.miniCard}>
          <ItemIcon name="freight" size={30} />
          <Text style={s.miniLabel}>Ingresos</Text>
          <Text style={s.miniValor} numberOfLines={1} adjustsFontSizeToFit>
            {ocultar(fmtPesos(ingresos30))}
          </Text>
        </View>
        <View style={s.miniCard}>
          <ItemIcon name="toll" size={30} />
          <Text style={s.miniLabel}>Gastos</Text>
          <Text style={s.miniValor} numberOfLines={1} adjustsFontSizeToFit>
            {ocultar(fmtPesos(gastos30))}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Por cobrar: ${fmtPesos(totalPend)}, ${numClientes} clientes`}
          onPress={() => hayPendientes && setModalVisible(true)}
          style={({ pressed }) => [s.miniCard, pressed && hayPendientes && { opacity: 0.7 }]}>
          <ItemIcon name="advance" size={30} />
          <Text style={s.miniLabel}>Por cobrar</Text>
          <Text style={s.miniValor} numberOfLines={1} adjustsFontSizeToFit>
            {hayPendientes ? ocultar(fmtPesos(totalPend)) : "Al día"}
          </Text>
        </Pressable>
      </View>

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
  wrap: { marginBottom: 6 },
  hero: {
    backgroundColor: "#0B0B0C",
    borderRadius: 28,
    borderCurve: "continuous",
    padding: 18,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.65)" },
  heroPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroPillTexto: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  heroMonto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  heroValor: {
    flexShrink: 1,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 },
  heroBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  heroBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroBtnBlanco: { backgroundColor: "#FFFFFF" },
  heroBtnGris: { backgroundColor: "rgba(255,255,255,0.16)" },
  heroBtnTexto: { fontSize: 14, fontWeight: "600" },
  seccionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  seccionTitulo: { fontSize: 15, fontWeight: "600", color: COLORS.ink },
  seccionLink: { fontSize: 12, fontWeight: "500", color: COLORS.muted },
  mini: { flexDirection: "row", gap: 10 },
  miniCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 12,
    gap: 4,
  },
  miniLabel: { fontSize: 11, fontWeight: "500", color: COLORS.muted, marginTop: 4 },
  miniValor: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: COLORS.ink,
    fontVariant: ["tabular-nums"],
  },
});
