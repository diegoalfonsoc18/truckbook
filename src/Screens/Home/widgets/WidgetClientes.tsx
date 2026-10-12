// src/Screens/Home/widgets/WidgetClientes.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { normalizarMercancias } from "../../../services/mercanciaService";
import { formatCOP, WProps } from "../homeUtils";
import { useClientType } from "../../../hooks/useClientType";
import ItemIcon from "../../../components/ItemIcon";

const PANEL = {
  bg: "#ECECEE",
  cardBg: "#ECECEE",
  ink: "#111827",
  muted: "#6B7280",
  divider: "#EEF0F2",
};

export default function WidgetClientes(_props: WProps) {
  const ingresos    = useIngresosStore((s) => s.ingresos);
  const { placa, tipoCamion } = useVehiculoStore();

  const [topCarga, setTopCarga] = useState<Array<[string, number]>>([]);

  // ── Paso 1: extracción sync — ordenar por total de ganancias ──────────────
  const { clienteData, rawMercancias } = React.useMemo(() => {
    const clienteMap = new Map<string, { viajes: number; total: number; ultimaFecha: string; cargas: Map<string, number> }>();
    const rawList: string[] = [];

    for (const ing of ingresos) {
      // El store puede tener filas de varias placas en caché — solo la activa
      if (ing.placa !== placa) continue;
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
  }, [ingresos, placa]);

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

  // ── Estilos: mismo panel que Resumen semanal / Actividad reciente ─────────
  // Panel gris claro con título pequeño y las filas directo encima.
  const ink    = PANEL.ink;
  const muted  = PANEL.muted;
  const divClr = PANEL.divider;

  const clientNames = React.useMemo(() => clienteData.map(([nombre]) => nombre), [clienteData]);
  const clientTypes = useClientType(clientNames);

  // ── Estado vacío ──────────────────────────────────────────────────────────
  if (clienteData.length === 0) {
    return (
      <View style={s.wrap}>
        <Text style={s.sectionLabel}>Top clientes</Text>
        <View style={[s.listCard, s.emptyBox]}>
          <ItemIcon name="conductor" size={56} />
          <Text style={[s.emptyText, { color: muted }]}>
            Registra fletes para ver tus clientes frecuentes
          </Text>
        </View>
      </View>
    );
  }

  // ── Widget principal ──────────────────────────────────────────────────────
  return (
    <View style={s.wrap}>
      <View style={s.tituloRow}>
        <ItemIcon name="cup" size={36} />
        <Text style={[s.sectionLabel, { marginBottom: 0, marginLeft: 0 }]}>
          Top clientes
        </Text>
      </View>

      <View style={s.listCard}>
        {/* ── Encabezados de columna ── */}
        <View style={s.colHead}>
          <View style={{ flex: 1 }} />
          <Text style={[s.colTexto, { width: 52 }]}>Viajes</Text>
          <Text style={[s.colTexto, { width: 92 }]}>Total</Text>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: divClr }} />

        {clienteData.map(([nombre, info], idx) => {
          const primero = idx === 0;
          const topCargaCliente = info.cargas.size > 0
            ? [...info.cargas.entries()].sort((a, b) => b[1] - a[1])[0][0]
            : null;

          return (
            <View key={nombre}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}>
                {/* Avatar */}
                <View style={[s.avatar, { backgroundColor: primero ? "#111111" : "#FFFFFF" }]}>
                  {idx < 3 ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: primero ? "#FFFFFF" : ink }}>{idx + 1}</Text>
                  ) : (
                    <Feather name={clientTypes[nombre] === "empresa" ? "briefcase" : "user"} size={15} color={ink} />
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
                <Text style={{ width: 52, fontSize: 14, fontWeight: "700", color: ink, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                  {info.viajes}
                </Text>

                {/* Total */}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ width: 92, fontSize: 13, fontWeight: "700", color: ink, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                  {formatCOP(info.total)}
                </Text>
              </View>
              {idx < clienteData.length - 1 && (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: divClr, marginLeft: 48 }} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Panel idéntico al de Resumen semanal
  wrap: {
    backgroundColor: PANEL.bg,
    borderRadius: 28,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: PANEL.ink,
    marginBottom: 12,
    marginLeft: 2,
  },
  // Las filas van directo sobre el panel gris, como en Actividad reciente
  // (sin tarjeta blanca interna).
  tituloRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginLeft: 2 },
  listCard: {},
  emptyBox:    { alignItems: "center", paddingVertical: 14, gap: 7 },
  emptyText:   { fontSize: 12, textAlign: "center", lineHeight: 17 },

  row:    { flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colHead: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  colTexto: { fontSize: 10, fontWeight: "600", color: PANEL.muted, textAlign: "right", letterSpacing: 0.6 },
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
