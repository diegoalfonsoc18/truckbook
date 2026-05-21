import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useMultas } from "../../hooks/useMultas";
import { useTheme, getShadow } from "../../constants/Themecontext";
import type { Multa } from "../../assets/types/simit.types";

const SIMIT_URL = "https://consulta.simit.org.co/Simit/indexA.jsp";

export default function Multas({ route }: any) {
  const navigation = useNavigation();
  const { colors: c, isDark } = useTheme();
  const [refrescando, setRefrescando] = useState(false);

  const placaActual = route?.params?.placa || "";

  const {
    multas: respuestaMultas,
    cargando,
    error,
    recargar,
    cantidadPendientes,
  } = useMultas(placaActual, false);

  const multas: Multa[] = respuestaMultas?.multas || [];
  const cardBorder = isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {};
  const shadow = getShadow(isDark, "md");

  const handleRefresh = async () => {
    setRefrescando(true);
    try { await recargar(); } finally { setRefrescando(false); }
  };

  const formatCurrency = (valor: any): string => {
    const n = typeof valor === "string" ? parseFloat(valor.replace(/[^0-9.-]/g, "")) : Number(valor);
    if (isNaN(n)) return "$0";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
  };

  const formatDate = (fecha?: string): string => {
    if (!fecha) return "N/A";
    if (fecha.includes("/")) return fecha;
    try { return new Date(fecha).toLocaleDateString("es-CO"); } catch { return fecha; }
  };

  const isPagada = (m: Multa): boolean => {
    const estado = (m.estado || "").toUpperCase();
    if (estado.includes("PAGAD") || estado.includes("CANCELAD")) return true;
    const p = (m.pagadoSiNo || "").toUpperCase().trim();
    return p === "SI" || p === "SÍ";
  };

  const totalPendiente = respuestaMultas?.valorPendiente || 0;
  const ultimaActualizacion = respuestaMultas?.timestamp
    ? new Date(respuestaMultas.timestamp).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  // ─── Header común ────────────────────────────────────────────────────────────
  const Header = () => (
    <View style={s.header}>
      <TouchableOpacity
        style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}
        onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: c.text }]}>Multas</Text>
      <View style={[s.placaBadge, { backgroundColor: c.plateYellow }]}>
        <Text style={[s.placaText, { color: c.plateText }]}>{placaActual}</Text>
      </View>
    </View>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (cargando && multas.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <Header />
          <View style={s.centered}>
            <ActivityIndicator size="large" color={c.expense} />
            <Text style={[s.loadingText, { color: c.textSecondary }]}>Consultando SIMIT…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (error && !refrescando) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <Header />
          <View style={s.centered}>
            <Ionicons name="warning" size={52} color={c.expense} />
            <Text style={[s.emptyTitle, { color: c.text }]}>Error al consultar</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.expense }]} onPress={handleRefresh}>
              <Text style={s.actionBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Sin datos (primera vez) ──────────────────────────────────────────────────
  if (!respuestaMultas && !cargando) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <Header />
          <View style={s.centered}>
            <Ionicons name="shield-checkmark-outline" size={60} color={c.textMuted} />
            <Text style={[s.emptyTitle, { color: c.text }]}>Sin consultar</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
              Presiona el botón para cargar el historial de multas
            </Text>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.expense }]} onPress={handleRefresh}>
              <Ionicons name="search" size={16} color="#FFF" />
              <Text style={s.actionBtnText}>Consultar multas</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Render multa ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Multa }) => {
    const pagada = isPagada(item);
    const color = pagada ? c.income : c.expense;
    return (
      <View style={[s.card, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg }, cardBorder, shadow]}>
        <View style={s.cardRow}>
          <View style={[s.cardIcon, { backgroundColor: color + "22" }]}>
            <Ionicons name={pagada ? "checkmark-circle" : "time"} size={22} color={color} />
          </View>
          <View style={s.cardInfo}>
            <View style={s.cardTopRow}>
              <Text style={[s.cardCity, { color: c.text }]} numberOfLines={1}>
                {item.ciudad || item.departamento || "Colombia"}
              </Text>
              <Text style={[s.cardAmount, { color }]}>{formatCurrency(item.valor)}</Text>
            </View>
            <View style={s.cardMeta}>
              <View style={[s.pill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                <Text style={[s.pillText, { color: c.textMuted }]}>{formatDate(item.fechaComparendo)}</Text>
              </View>
              {item.vigencia && (
                <View style={[s.pill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                  <Text style={[s.pillText, { color: c.textMuted }]}>Año {item.vigencia}</Text>
                </View>
              )}
              <View style={[s.pill, { backgroundColor: color + "22" }]}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={[s.pillText, { color }]}>{pagada ? "Pagada" : "Pendiente"}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── Main ────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        <Header />

        <FlatList
          data={multas}
          renderItem={renderItem}
          keyExtractor={(_, i) => `multa-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={handleRefresh} tintColor={c.expense} />}
          ListHeaderComponent={
            <>
              {/* RESUMEN */}
              <View style={[s.summaryCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : c.cardBg }, shadow]}>
                <View style={s.summaryRow}>
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Total</Text>
                    <Text style={[s.summaryValue, { color: c.text }]}>{multas.length}</Text>
                  </View>
                  <View style={[s.divider, { backgroundColor: c.border }]} />
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Pendientes</Text>
                    <Text style={[s.summaryValue, { color: cantidadPendientes > 0 ? c.expense : c.income }]}>{cantidadPendientes}</Text>
                  </View>
                  <View style={[s.divider, { backgroundColor: c.border }]} />
                  <View style={s.summaryItem}>
                    <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Pagadas</Text>
                    <Text style={[s.summaryValue, { color: c.income }]}>{respuestaMultas?.multasPagadas || 0}</Text>
                  </View>
                </View>
                {totalPendiente > 0 && (
                  <View style={[s.totalBar, { backgroundColor: c.expense + "18" }]}>
                    <Text style={[s.totalLabel, { color: c.expense }]}>Deuda total</Text>
                    <Text style={[s.totalValue, { color: c.expense }]}>{formatCurrency(totalPendiente)}</Text>
                  </View>
                )}
              </View>

              {/* AVISO datos históricos */}
              <TouchableOpacity
                style={[s.disclaimer, { backgroundColor: isDark ? "rgba(251,191,36,0.1)" : "#FFFBEB", borderColor: "#FBBF24" }]}
                onPress={() => Linking.openURL(SIMIT_URL)}
                activeOpacity={0.8}>
                <Ionicons name="information-circle-outline" size={16} color="#D97706" />
                <Text style={[s.disclaimerText, { color: "#D97706" }]}>
                  Datos históricos · puede no reflejar el estado actual.{" "}
                  <Text style={{ fontWeight: "800", textDecorationLine: "underline" }}>Verificar en SIMIT oficial</Text>
                </Text>
              </TouchableOpacity>

              {/* BARRA ACTUALIZAR */}
              <View style={s.updateRow}>
                <View style={s.updateInfo}>
                  <Ionicons name="time-outline" size={13} color={c.textMuted} />
                  <Text style={[s.updateText, { color: c.textMuted }]}>{ultimaActualizacion || "—"}</Text>
                </View>
                <TouchableOpacity
                  style={[s.updateBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}
                  onPress={handleRefresh}
                  disabled={refrescando}>
                  {refrescando
                    ? <ActivityIndicator size="small" color={c.expense} />
                    : <>
                        <Ionicons name="refresh" size={15} color={c.expense} />
                        <Text style={[s.updateBtnText, { color: c.expense }]}>Actualizar</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Ionicons name="checkmark-circle" size={60} color={c.income} />
              <Text style={[s.emptyTitle, { color: c.text }]}>¡Sin multas!</Text>
              <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>Tu vehículo está al día</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  placaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  placaText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

  summaryCard: { borderRadius: 22, padding: 20, marginHorizontal: 20, marginBottom: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 24, fontWeight: "800" },
  divider: { width: 1, height: 36 },
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  totalLabel: { fontSize: 13, fontWeight: "600" },
  totalValue: { fontSize: 16, fontWeight: "800" },

  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17 },

  updateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  updateInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  updateText: { fontSize: 11, fontWeight: "500" },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  updateBtnText: { fontSize: 13, fontWeight: "700" },

  card: { borderRadius: 16, padding: 14, marginBottom: 10, marginHorizontal: 20 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardCity: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  cardAmount: { fontSize: 16, fontWeight: "800" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  pillText: { fontSize: 10, fontWeight: "600" },
  dot: { width: 5, height: 5, borderRadius: 3 },

  listContent: { paddingBottom: 100 },
});
