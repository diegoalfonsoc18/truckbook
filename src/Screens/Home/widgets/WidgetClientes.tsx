// src/Screens/Home/widgets/WidgetClientes.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import { normalizarMercancias } from "../../../services/mercanciaService";
import { formatCOP, WProps } from "../homeUtils";
import { useClientType } from "../../../hooks/useClientType";

export default function WidgetClientes({ isDark }: WProps) {
  const ingresos    = useIngresosStore((s) => s.ingresos);
  const { tipoCamion } = useVehiculoStore();
  const { colors: c } = useTheme();

  const [topCarga, setTopCarga] = useState<Array<[string, number]>>([]);

  // ── Paso 1: extracción sync — ordenar por total de ganancias ──────────────
  const { clienteData, rawMercancias } = React.useMemo(() => {
    const clienteMap = new Map<string, { viajes: number; total: number; ultimaFecha: string; cargas: Map<string, number> }>();
    const rawList: string[] = [];

    for (const ing of ingresos) {
      if (ing.tipo_ingreso !== "Flete" || !ing.descripcion) continue;
      // Limpiar [TEL:xxx] antes de parsear
      const descLimpia = ing.descripcion.replace(/\[TEL:[^\]]*\]/g, "").trim();
      const partes = descLimpia.split(" · ");
      const nombre = partes[0]?.trim();
      if (!nombre || nombre === "Flete") continue;

      const prev = clienteMap.get(nombre) ?? { viajes: 0, total: 0, ultimaFecha: "", cargas: new Map() };
      prev.viajes += (ing.cantidad ?? 1);
      prev.total  += (ing.monto ?? 0) * (ing.cantidad ?? 1);
      const fecha = ing.fecha ?? ing.created_at ?? "";
      if (fecha > prev.ultimaFecha) prev.ultimaFecha = fecha;

      const rawMercancia =
        partes.length >= 3
          ? partes[partes.length - 1]?.trim()
          : partes.length === 2
            ? partes[1]?.trim()
            : null;
      const mercancia = rawMercancia?.trim() || null;
      if (mercancia && !mercancia.includes("→")) {
        rawList.push(mercancia);
        prev.cargas.set(mercancia, (prev.cargas.get(mercancia) ?? 0) + 1);
      }

      clienteMap.set(nombre, prev);
    }

    // Ordenar por total de ganancias (mayor primero)
    const clientes = [...clienteMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 7);

    return { clienteData: clientes, rawMercancias: rawList };
  }, [ingresos]);

  // ── Paso 2: normalización async de mercancías con Gemini ──────────────────
  const tipoCamionKey  = tipoCamion ?? "general";
  const rawFingerprint = `${tipoCamionKey}::${rawMercancias.join("|")}`;

  useEffect(() => {
    if (rawMercancias.length === 0) { setTopCarga([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const normMap = await normalizarMercancias(rawMercancias, tipoCamionKey);
        if (cancelled) return;
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) {
          const canonical = normMap.get(raw) ?? raw;
          cargaMap.set(canonical, (cargaMap.get(canonical) ?? 0) + 1);
        }
        setTopCarga([...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7));
      } catch {
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) cargaMap.set(raw, (cargaMap.get(raw) ?? 0) + 1);
        if (!cancelled) setTopCarga([...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFingerprint]);

  // ── Estilos compartidos ────────────────────────────────────────────────────
  const cardShadow = getShadow(isDark, "md");
  const lightStyle = Platform.OS === "android"
    ? { borderWidth: 1, borderColor: c.border, ...cardShadow }
    : cardShadow;
  const gradColors: [string, string] = isDark ? [`${c.accent}14`, `${c.accent}14`] : ["#111111", "#0A0A0A"];
  const cardBorderStyle = isDark
    ? { borderWidth: 1, borderColor: `${c.accent}33` }
    : lightStyle;
  const ink    = "#FFFFFF";
  const muted  = "rgba(255,255,255,0.50)";
  const divClr = "rgba(255,255,255,0.10)";

  const MEDAL = ["#FFB800", "#94A3B8", "#CD7F32"];
  const clientNames = React.useMemo(() => clienteData.map(([nombre]) => nombre), [clienteData]);
  const clientTypes = useClientType(clientNames);

  // ── Estado vacío ──────────────────────────────────────────────────────────
  if (clienteData.length === 0) {
    return (
      <View style={[s.card, cardBorderStyle, { height: 110, paddingHorizontal: 0, paddingVertical: 0 }]}>
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={s.header}>
            <Ionicons name="people-outline" size={15} color="#FFFFFF" />
            <Text style={[s.headerTitle, { color: ink }]}>Top Clientes</Text>
          </View>
          <View style={s.emptyBox}>
            <Ionicons name="person-add-outline" size={24} color="#FFFFFF" />
            <Text style={[s.emptyText, { color: muted }]}>
              Registra fletes para ver tus clientes frecuentes
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ── Widget principal ──────────────────────────────────────────────────────
  return (
    <View style={[s.card, cardBorderStyle, { overflow: "hidden", paddingHorizontal: 0, paddingVertical: 0 }]}>
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14 }}>

      {/* ── Título ── */}
      <View style={s.header}>
        <Ionicons name="people-outline" size={15} color="#FFFFFF" />
        <Text style={[s.headerTitle, { color: ink }]}>Top Clientes</Text>
      </View>

      {/* ── Column headers ── */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 10, fontWeight: "700", color: muted, letterSpacing: 0.8 }}>
          Cliente
        </Text>
        <Text style={{ width: 55, fontSize: 10, fontWeight: "700", color: muted, textAlign: "right", letterSpacing: 0.8 }}>
          Viajes
        </Text>
        <Text style={{ width: 75, fontSize: 10, fontWeight: "700", color: muted, textAlign: "right", letterSpacing: 0.8 }}>
          Total
        </Text>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: divClr, marginBottom: 4 }} />

      {clienteData.map(([nombre, info], idx) => {
        const medalColor = MEDAL[idx] ?? "#FFFFFF";
        const topCargaCliente = info.cargas.size > 0
          ? [...info.cargas.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : null;

        return (
          <View key={nombre}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}>
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: medalColor + "18", borderColor: medalColor + "40" }]}>
                {idx < 3 ? (
                  <Text style={{ fontSize: 15, fontWeight: "900", color: medalColor }}>{idx + 1}</Text>
                ) : (
                  <Feather name={clientTypes[nombre] === "empresa" ? "briefcase" : "user"} size={15} color={medalColor} />
                )}
              </View>

              {/* Name + cargo */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: ink }} numberOfLines={1}>{nombre}</Text>
                {topCargaCliente && (
                  <Text style={{ fontSize: 10, color: muted, marginTop: 1 }} numberOfLines={1}>{topCargaCliente}</Text>
                )}
              </View>

              {/* Viajes */}
              <Text style={{ width: 55, fontSize: 15, fontWeight: "800", color: ink, textAlign: "right" }}>
                {info.viajes}
              </Text>

              {/* Total */}
              <Text style={{ width: 75, fontSize: 13, fontWeight: "800", color: medalColor, textAlign: "right" }}>
                {formatCOP(info.total)}
              </Text>
            </View>
            {idx < clienteData.length - 1 && (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: divClr, marginLeft: 48 }} />
            )}
          </View>
        );
      })}

      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  headerSub:   { fontSize: 11, fontWeight: "500", marginLeft: 2 },
  emptyBox:    { alignItems: "center", paddingVertical: 14, gap: 7 },
  emptyText:   { fontSize: 12, textAlign: "center", lineHeight: 17 },

  row:    { flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "800" },
  info:   { flex: 1, gap: 2 },
  nombre: { fontSize: 13, fontWeight: "700" },
  meta:   { fontSize: 11 },
  monto:  { fontSize: 13, fontWeight: "800" },

  divider:        { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  sectionDivider: { height: StyleSheet.hairlineWidth, width: "100%", marginVertical: 12 },

  chipRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 },
  chipText:  { fontSize: 12, fontWeight: "600" },
  chipBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  chipCount: { fontSize: 11, fontWeight: "700" },
});
