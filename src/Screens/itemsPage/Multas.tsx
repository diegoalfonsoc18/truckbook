import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useMultas } from "../../hooks/useMultas";
import { useTheme, getShadow } from "../../constants/Themecontext";
import type { Multa } from "../../assets/types/simit.types";

const { width } = Dimensions.get("window");

export default function Multas({ route }: any) {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const c = colors;
  const [refrescando, setRefrescando] = useState(false);

  const placaActual = route?.params?.placa || "";

  const {
    multas: respuestaMultas,
    cargando,
    error,
    recargar,
    tieneMultasPendientes,
    cantidadPendientes,
  } = useMultas(placaActual, true);

  const multas: Multa[] = respuestaMultas?.multas || [];

  const cardBorder = isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {};
  const shadow = getShadow(isDark, "md");

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  };

  const formatCurrency = (valor: any): string => {
    const numero = typeof valor === "string" ? parseFloat(valor.replace(/[^0-9.-]/g, "")) : Number(valor);
    if (isNaN(numero)) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(numero);
  };

  const formatDate = (fecha: string | undefined): string => {
    if (!fecha) return "N/A";
    // El dataset usa formato DD/MM/YYYY
    if (fecha.includes("/")) return fecha;
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString("es-CO");
    } catch {
      return fecha;
    }
  };

  const isPagada = (multa: Multa): boolean => {
    const estado = (multa.estado || "").toUpperCase().trim();
    if (estado === "PAGADA" || estado.includes("PAGAD") || estado.includes("CANCELAD")) return true;
    // Fallback para datos.gov.co
    const pagado = (multa.pagadoSiNo || "").toUpperCase().trim();
    return pagado === "SI" || pagado === "SÍ";
  };

  const totalPendiente = respuestaMultas?.valorPendiente || 0;
  const ultimaActualizacion = respuestaMultas?.timestamp || null;

  const formatTimestamp = (ts: string | null): string => {
    if (!ts) return "Nunca";
    const date = new Date(ts);
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMultaItem = ({ item }: { item: Multa }) => {
    const pagada = isPagada(item);
    const statusColor = pagada ? c.income : c.expense;
    const statusLabel = pagada ? "Pagada" : "Pendiente";

    return (
      <View style={[s.multaCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg }, cardBorder, shadow]}>
        <View style={s.multaHeader}>
          <View style={[s.multaIconCircle, { backgroundColor: statusColor + (isDark ? "25" : "15") }]}>
            <Ionicons name={pagada ? "checkmark-circle" : "time"} size={22} color={statusColor} />
          </View>
          <View style={s.multaInfo}>
            <View style={s.multaTopRow}>
              <Text style={[s.multaCity, { color: c.text }]} numberOfLines={1}>
                {item.ciudad || item.departamento || "Colombia"}
              </Text>
              <Text style={[s.multaAmount, { color: statusColor }]}>
                {formatCurrency(item.valor)}
              </Text>
            </View>
            <View style={s.multaMeta}>
              <View style={[s.datePill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                <Text style={[s.dateText, { color: c.textMuted }]}>{formatDate(item.fechaComparendo)}</Text>
              </View>
              {item.vigencia && (
                <View style={[s.datePill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                  <Text style={[s.dateText, { color: c.textMuted }]}>Año {item.vigencia}</Text>
                </View>
              )}
              <View style={[s.statusBadge, { backgroundColor: statusColor + (isDark ? "25" : "15") }]}>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // LOADING
  if (cargando && multas.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.header}>
            <TouchableOpacity style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={c.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: c.text }]}>Multas</Text>
            <View style={s.headerRight} />
          </View>
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={c.income} />
            <Text style={[s.loadingText, { color: c.textSecondary }]}>Consultando SIMIT...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ERROR
  if (error && !refrescando) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.header}>
            <TouchableOpacity style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={c.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: c.text }]}>Multas</Text>
            <View style={s.headerRight} />
          </View>
          <View style={s.emptyState}>
            <Ionicons name="warning" size={56} color={c.expense} />
            <Text style={[s.emptyTitle, { color: c.text }]}>Error al consultar</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={[s.retryBtn, { backgroundColor: c.income }]} onPress={handleRefresh}>
              <Text style={s.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // MAIN
  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={c.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: c.text }]}>Multas</Text>
          <View style={[s.placaBadge, { backgroundColor: c.plateYellow }]}>
            <Text style={[s.placaText, { color: c.plateText }]}>{placaActual}</Text>
          </View>
        </View>

        {/* RESUMEN */}
        <View style={[
          s.summaryCard,
          { backgroundColor: isDark ? "rgba(0,217,165,0.08)" : c.cardBg },
          isDark ? { borderWidth: 1, borderColor: "rgba(0,217,165,0.2)" } : {},
          shadow,
        ]}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Total</Text>
              <Text style={[s.summaryValue, { color: c.text }]}>{multas.length}</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Pendientes</Text>
              <Text style={[s.summaryValue, { color: cantidadPendientes > 0 ? c.expense : c.income }]}>{cantidadPendientes}</Text>
            </View>
            <View style={[s.summaryDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Pagadas</Text>
              <Text style={[s.summaryValue, { color: c.income }]}>{respuestaMultas?.multasPagadas || 0}</Text>
            </View>
          </View>
          {totalPendiente > 0 && (
            <View style={[s.totalBar, { backgroundColor: isDark ? "rgba(233,69,96,0.1)" : "#FFF0F0" }]}>
              <Text style={[s.totalBarLabel, { color: c.expense }]}>Deuda total</Text>
              <Text style={[s.totalBarValue, { color: c.expense }]}>{formatCurrency(totalPendiente)}</Text>
            </View>
          )}
        </View>

        {/* ACTUALIZAR */}
        <View style={s.updateRow}>
          <View style={s.updateInfo}>
            <Ionicons name="time-outline" size={14} color={c.textMuted} />
            <Text style={[s.updateText, { color: c.textMuted }]}>
              {formatTimestamp(ultimaActualizacion)}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.updateBtn, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.incomeLight }]}
            onPress={handleRefresh}
            disabled={refrescando}
            activeOpacity={0.7}>
            {refrescando ? (
              <ActivityIndicator size="small" color={c.income} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={c.income} />
                <Text style={[s.updateBtnText, { color: c.income }]}>Actualizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* LISTA */}
        {multas.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={c.income} />
            <Text style={[s.emptyTitle, { color: c.text }]}>¡Sin multas!</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>Tu vehículo está al día</Text>
          </View>
        ) : (
          <FlatList
            data={multas}
            renderItem={renderMultaItem}
            keyExtractor={(_, index) => `multa-${index}`}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={handleRefresh}
                tintColor={c.income}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerRight: { width: 40 },
  placaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  placaText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },

  // SUMMARY
  summaryCard: {
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 24, fontWeight: "800" },
  summaryDivider: { width: 1, height: 36 },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  totalBarLabel: { fontSize: 13, fontWeight: "600" },
  totalBarValue: { fontSize: 16, fontWeight: "800" },

  // MULTA CARD
  multaCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  multaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  multaIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  multaInfo: { flex: 1 },
  multaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  multaCity: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  multaAmount: { fontSize: 16, fontWeight: "800" },
  multaMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  datePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: { fontSize: 10, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  // UPDATE ROW
  updateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  updateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  updateText: { fontSize: 11, fontWeight: "500" },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  updateBtnText: { fontSize: 13, fontWeight: "700" },

  // LIST
  listContent: { paddingBottom: 100 },

  // EMPTY / LOADING / ERROR
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  retryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
