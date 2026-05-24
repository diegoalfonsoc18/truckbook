// src/Screens/Home/widgets/WidgetClientes.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useTheme } from "../../../constants/Themecontext";
import { normalizarMercancias } from "../../../services/mercanciaService";
import { formatCOP, WBG, MUTED, INK, WProps } from "../homeUtils";

export default function WidgetClientes({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const { tipoCamion } = useVehiculoStore();
  const { colors: c } = useTheme();

  const [topCarga, setTopCarga] = useState<Array<[string, number]>>([]);

  // ── Paso 1: extracción sync de clientes y mercancías brutas ──────────────
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
      prev.total += ing.monto ?? 0;
      const fecha = ing.fecha ?? ing.created_at ?? "";
      if (fecha > prev.ultimaFecha) prev.ultimaFecha = fecha;
      clienteMap.set(nombre, prev);

      const mercancia =
        partes.length >= 3
          ? partes[partes.length - 1]?.trim()
          : partes.length === 2
            ? partes[1]?.trim()
            : null;
      if (mercancia && !mercancia.includes("→")) {
        rawList.push(mercancia);
      }
    }

    const clientes = [...clienteMap.entries()]
      .sort((a, b) => b[1].viajes - a[1].viajes)
      .slice(0, 3);

    return { clienteData: clientes, rawMercancias: rawList };
  }, [ingresos]);

  // ── Paso 2: normalización async con Gemini contextualizado por tipo de camión
  const tipoCamionKey = tipoCamion ?? "general";
  const rawFingerprint = `${tipoCamionKey}::${rawMercancias.join("|")}`;
  useEffect(() => {
    if (rawMercancias.length === 0) {
      setTopCarga([]);
      return;
    }
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

        const sorted = [...cargaMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        setTopCarga(sorted);
      } catch {
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) {
          cargaMap.set(raw, (cargaMap.get(raw) ?? 0) + 1);
        }
        if (!cancelled) {
          setTopCarga([...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFingerprint]);

  const MEDAL = ["#FFB800", "#94A3B8", "#CD7F32"];
  const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];
  const cardBg = WBG(isDark);
  const ink = INK(isDark);
  const muted = MUTED(isDark);
  const divClr = isDark ? "#2C2C2E" : "#E5E7EB";

  // ── Estado vacío ──────────────────────────────────────────────────────────
  if (clienteData.length === 0) {
    return (
      <View style={[s.clientesCard, { backgroundColor: cardBg, height: 120 }]}>
        <View style={s.clientesHeader}>
          <Ionicons name="people-outline" size={16} color={c.accent} />
          <Text style={[s.clientesTitle, { color: ink }]}>Top Clientes</Text>
        </View>
        <View style={s.clientesEmpty}>
          <Ionicons name="person-add-outline" size={26} color={c.accent} />
          <Text style={[s.clientesEmptyText, { color: muted }]}>
            Registra fletes para ver tus clientes frecuentes
          </Text>
        </View>
      </View>
    );
  }

  // ── Widget principal ──────────────────────────────────────────────────────
  return (
    <View style={[s.clientesCard, { backgroundColor: cardBg, height: "auto" }]}>
      {/* ── Sección: Top Clientes ── */}
      <View style={s.clientesHeader}>
        <Ionicons name="people-outline" size={15} color={c.accent} />
        <Text style={[s.clientesTitle, { color: ink }]}>Top Clientes</Text>
      </View>

      {clienteData.map(([nombre, info], idx) => {
        const medalColor = MEDAL[idx] ?? c.accent;
        const ini = nombre.trim().split(/\s+/);
        const av =
          ini.length >= 2
            ? (ini[0][0] + ini[1][0]).toUpperCase()
            : nombre.substring(0, 2).toUpperCase();
        const isLast = idx === clienteData.length - 1;

        return (
          <View key={nombre}>
            <View style={s.clienteRow}>
              <View style={[s.clienteAvatar, { backgroundColor: medalColor + "22", borderColor: medalColor + "55" }]}>
                <Text style={[s.clienteAvatarText, { color: medalColor }]}>{av}</Text>
              </View>
              <View style={s.clienteInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={{ fontSize: 10 }}>{MEDAL_EMOJI[idx]}</Text>
                  <Text style={[s.clienteNombre, { color: ink }]} numberOfLines={1}>{nombre}</Text>
                </View>
                <Text style={[s.clienteMeta, { color: muted }]}>
                  {info.viajes} viaje{info.viajes !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={[s.clienteMonto, { color: medalColor }]}>{formatCOP(info.total)}</Text>
            </View>
            {!isLast && <View style={[s.clienteDivider, { backgroundColor: divClr }]} />}
          </View>
        );
      })}

      {/* ── Separador entre secciones ── */}
      {topCarga.length > 0 && (
        <>
          <View style={[s.clientesDividerH, { backgroundColor: divClr, marginVertical: 12 }]} />

          <View style={[s.clientesHeader, { marginBottom: 8 }]}>
            <Ionicons name="cube-outline" size={15} color={c.accent} />
            <Text style={[s.clientesTitle, { color: ink }]}>Carga frecuente</Text>
          </View>

          <View style={s.cargaRow}>
            {topCarga.map(([tipo, count], idx) => {
              const chipColor = [c.accent, "#10B981", "#F59E0B"][idx % 3];
              return (
                <View key={tipo} style={[s.cargaChip, { backgroundColor: chipColor + "18", borderColor: chipColor + "40" }]}>
                  <Text style={[s.cargaChipText, { color: chipColor }]} numberOfLines={1}>{tipo}</Text>
                  <View style={[s.cargaChipBadge, { backgroundColor: chipColor + "30" }]}>
                    <Text style={[s.cargaChipCount, { color: chipColor }]}>{count}x</Text>
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
  clientesCard: {
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  clientesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  clientesTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },
  clientesEmpty: { alignItems: "center", paddingVertical: 16, gap: 8 },
  clientesEmptyText: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  clienteRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, gap: 10 },
  clienteAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  clienteAvatarText: { fontSize: 12, fontWeight: "800" },
  clienteDivider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  clientesDividerH: { height: StyleSheet.hairlineWidth, width: "100%" },
  clienteInfo: { flex: 1, gap: 2 },
  clienteNombre: { fontSize: 13, fontWeight: "700" },
  clienteMeta: { fontSize: 11 },
  clienteMonto: { fontSize: 13, fontWeight: "800" },
  cargaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cargaChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 },
  cargaChipText: { fontSize: 12, fontWeight: "600" },
  cargaChipBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  cargaChipCount: { fontSize: 11, fontWeight: "700" },
});
