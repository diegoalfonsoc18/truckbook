// src/Screens/Home/widgets/WidgetClientes.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import { normalizarMercancias } from "../../../services/mercanciaService";
import { formatCOP, WProps } from "../homeUtils";

export default function WidgetClientes({ isDark }: WProps) {
  const ingresos    = useIngresosStore((s) => s.ingresos);
  const { tipoCamion } = useVehiculoStore();
  const { colors: c } = useTheme();

  const [topCarga, setTopCarga] = useState<Array<[string, number]>>([]);

  // ── Paso 1: extracción sync — ordenar por total de ganancias ──────────────
  const { clienteData, rawMercancias } = React.useMemo(() => {
    const clienteMap = new Map<string, { viajes: number; total: number; ultimaFecha: string }>();
    const rawList: string[] = [];

    for (const ing of ingresos) {
      if (ing.tipo_ingreso !== "Flete" || !ing.descripcion) continue;
      const partes = ing.descripcion.split(" · ");
      const nombre = partes[0]?.trim();
      if (!nombre || nombre === "Flete") continue;

      const prev = clienteMap.get(nombre) ?? { viajes: 0, total: 0, ultimaFecha: "" };
      prev.viajes += 1;
      prev.total  += ing.monto ?? 0;
      const fecha = ing.fecha ?? ing.created_at ?? "";
      if (fecha > prev.ultimaFecha) prev.ultimaFecha = fecha;
      clienteMap.set(nombre, prev);

      const mercancia =
        partes.length >= 3
          ? partes[partes.length - 1]?.trim()
          : partes.length === 2
            ? partes[1]?.trim()
            : null;
      if (mercancia && !mercancia.includes("→")) rawList.push(mercancia);
    }

    // Ordenar por total de ganancias (mayor primero)
    const clientes = [...clienteMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3);

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
        setTopCarga([...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3));
      } catch {
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) cargaMap.set(raw, (cargaMap.get(raw) ?? 0) + 1);
        if (!cancelled) setTopCarga([...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFingerprint]);

  // ── Estilos compartidos ────────────────────────────────────────────────────
  const cardShadow = getShadow(isDark, "md");
  const cardStyle  = [
    s.card,
    isDark
      ? { backgroundColor: `${c.accent}14`, borderWidth: 1, borderColor: `${c.accent}33` }
      : { backgroundColor: c.cardBg, ...cardShadow },
  ];
  const ink    = isDark ? "#FFFFFF" : c.text;
  const muted  = isDark ? "rgba(255,255,255,0.45)" : "#6B7280";
  const divClr = isDark ? `${c.accent}20` : "#E5E7EB";

  const MEDAL       = ["#FFB800", "#94A3B8", "#CD7F32"];
  const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];

  // ── Estado vacío ──────────────────────────────────────────────────────────
  if (clienteData.length === 0) {
    return (
      <View style={[cardStyle, { height: 110 }]}>
        <View style={s.header}>
          <Ionicons name="people-outline" size={15} color={c.accent} />
          <Text style={[s.headerTitle, { color: ink }]}>Top Clientes</Text>
        </View>
        <View style={s.emptyBox}>
          <Ionicons name="person-add-outline" size={24} color={c.accent} />
          <Text style={[s.emptyText, { color: muted }]}>
            Registra fletes para ver tus clientes frecuentes
          </Text>
        </View>
      </View>
    );
  }

  // ── Widget principal ──────────────────────────────────────────────────────
  return (
    <View style={cardStyle}>
      {/* ── Top Clientes ── */}
      <View style={s.header}>
        <Ionicons name="people-outline" size={15} color={c.accent} />
        <Text style={[s.headerTitle, { color: ink }]}>Top Clientes</Text>
        <Text style={[s.headerSub, { color: muted }]}>por ganancias</Text>
      </View>

      {clienteData.map(([nombre, info], idx) => {
        const medalColor = MEDAL[idx] ?? c.accent;
        const ini  = nombre.trim().split(/\s+/);
        const av   = ini.length >= 2
          ? (ini[0][0] + ini[1][0]).toUpperCase()
          : nombre.substring(0, 2).toUpperCase();
        const isLast = idx === clienteData.length - 1;

        return (
          <View key={nombre}>
            <View style={s.row}>
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: medalColor + "22", borderColor: medalColor + "55" }]}>
                <Text style={[s.avatarText, { color: medalColor }]}>{av}</Text>
              </View>

              {/* Info */}
              <View style={s.info}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 10 }}>{MEDAL_EMOJI[idx]}</Text>
                  <Text style={[s.nombre, { color: ink }]} numberOfLines={1}>{nombre}</Text>
                </View>
                <Text style={[s.meta, { color: muted }]}>
                  {info.viajes} viaje{info.viajes !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Monto */}
              <Text style={[s.monto, { color: medalColor }]}>
                {formatCOP(info.total)}
              </Text>
            </View>
            {!isLast && <View style={[s.divider, { backgroundColor: divClr }]} />}
          </View>
        );
      })}

      {/* ── Carga frecuente ── */}
      {topCarga.length > 0 && (
        <>
          <View style={[s.sectionDivider, { backgroundColor: divClr }]} />

          <View style={[s.header, { marginBottom: 8 }]}>
            <Ionicons name="cube-outline" size={15} color={c.accent} />
            <Text style={[s.headerTitle, { color: ink }]}>Carga frecuente</Text>
          </View>

          <View style={s.chipRow}>
            {topCarga.map(([tipo, count], idx) => {
              const chipColor = [c.accent, "#10B981", "#F59E0B"][idx % 3];
              return (
                <View
                  key={tipo}
                  style={[s.chip, { backgroundColor: chipColor + "18", borderColor: chipColor + "40" }]}>
                  <Text style={[s.chipText, { color: chipColor }]} numberOfLines={1}>{tipo}</Text>
                  <View style={[s.chipBadge, { backgroundColor: chipColor + "30" }]}>
                    <Text style={[s.chipCount, { color: chipColor }]}>{count}x</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },
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
