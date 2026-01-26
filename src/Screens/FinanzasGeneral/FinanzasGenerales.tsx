import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  Dimensions,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import { useTheme, getShadow } from "../../constants/Themecontext";

const { width } = Dimensions.get("window");

// ✅ Utilidades
function groupBy<T extends { fecha: string; value: number | string }>(
  items: T[],
  keyFn: (item: T) => string,
) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + Number(item.value);
    return acc;
  }, {});
}

function filtrarPorRango<T extends { fecha: string }>(
  items: T[],
  inicio: string,
  fin: string,
) {
  if (!inicio && !fin) return items;
  return items.filter((item) => {
    if (inicio && item.fecha < inicio) return false;
    if (fin && item.fecha > fin) return false;
    return true;
  });
}

function formatLabel(fecha: string, view: string) {
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  if (view === "dias") {
    const [, mes, dia] = fecha.split("-");
    return `${dia}/${mes}`;
  }
  if (view === "meses") {
    const [anio, mes] = fecha.split("-");
    return `${meses[parseInt(mes, 10) - 1]} ${anio?.slice(2)}`;
  }
  return fecha;
}

function abreviarNumero(valor: number | string): string {
  const num = Number(valor);
  if (isNaN(num)) return String(valor);
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString("es-CO");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

type ViewType = "dias" | "meses" | "años";

export default function FinanzasGenerales() {
  const { colors, isDark } = useTheme();
  const { placa: placaActual } = useVehiculoStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("meses");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectingDate, setSelectingDate] = useState<"inicio" | "fin">(
    "inicio",
  );

  const [rango, setRango] = useState<{ inicio: string; fin: string }>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const first = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const last = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
    return { inicio: first, fin: last };
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([
          useGastosStore.getState().cargarGastosDelDB(placaActual),
          useIngresosStore.getState().cargarIngresosDelDB(placaActual),
        ]);
      } catch (err) {
        console.error("Error cargando datos financieros:", err);
        setError("Error al cargar datos. Intenta de nuevo.");
      } finally {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
    if (placaActual) cargarDatos();
  }, [placaActual]);

  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  const gastosPorPlaca = gastos.filter((g) => g.placa === placaActual);
  const ingresosPorPlaca = ingresos.filter((i) => i.placa === placaActual);

  const gastosTransformados = gastosPorPlaca.map((g) => ({
    fecha: g.fecha,
    value: g.monto,
  }));
  const ingresosTransformados = ingresosPorPlaca.map((i) => ({
    fecha: i.fecha,
    value: i.monto,
  }));

  const gastosFiltrados = filtrarPorRango(
    gastosTransformados,
    rango.inicio,
    rango.fin,
  );
  const ingresosFiltrados = filtrarPorRango(
    ingresosTransformados,
    rango.inicio,
    rango.fin,
  );

  let groupedGastos: Record<string, number> = {};
  let groupedIngresos: Record<string, number> = {};

  if (view === "dias") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha);
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha);
  } else if (view === "meses") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 7));
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 7));
  } else if (view === "años") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 4));
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 4));
  }

  const allKeys = Array.from(
    new Set([...Object.keys(groupedGastos), ...Object.keys(groupedIngresos)]),
  ).sort();
  const chartGastosData = allKeys.map((k) => {
    const val = Number(groupedGastos[k]);
    return isFinite(val) ? val : 0;
  });
  const chartIngresosData = allKeys.map((k) => {
    const val = Number(groupedIngresos[k]);
    return isFinite(val) ? val : 0;
  });

  const totalGastos = chartGastosData.reduce((a, b) => a + b, 0);
  const totalIngresos = chartIngresosData.reduce((a, b) => a + b, 0);
  const balance = totalIngresos - totalGastos;
  const rentabilidad =
    totalIngresos === 0 ? 0 : ((balance / totalIngresos) * 100).toFixed(1);

  const formattedLabels =
    allKeys.length > 0
      ? allKeys.map((k) => formatLabel(k, view))
      : ["Sin datos"];

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  };

  const openCalendar = (type: "inicio" | "fin") => {
    setSelectingDate(type);
    setCalendarVisible(true);
  };

  // Estilos dinámicos
  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    modalBg: { backgroundColor: colors.modalBg },
  };

  // ✅ LOADING
  if (loading) {
    return (
      <View style={[styles.container, ds.container]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, ds.textSecondary]}>
            Cargando datos...
          </Text>
        </View>
      </View>
    );
  }

  // ✅ ERROR
  if (error) {
    return (
      <View style={[styles.container, ds.container]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  // ✅ SIN PLACA
  if (!placaActual) {
    return (
      <View style={[styles.container, ds.container]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, ds.text]}>
            Sin vehículo seleccionado
          </Text>
          <Text style={[styles.emptySubtitle, ds.textSecondary]}>
            Selecciona una placa para ver las finanzas
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.ScrollView
          style={[styles.scrollView, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* ✅ HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, ds.text]}>Finanzas</Text>
              <Text style={[styles.headerSubtitle, ds.textSecondary]}>
                Análisis financiero
              </Text>
            </View>
            <View style={styles.placaBadge}>
              <Text style={styles.placaText}>{placaActual}</Text>
            </View>
          </View>

          {/* ✅ SELECTOR DE RANGO */}
          <View
            style={[styles.rangeSelector, ds.cardBg, getShadow(isDark, "sm")]}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openCalendar("inicio")}
              activeOpacity={0.8}>
              <Text style={[styles.dateButtonLabel, ds.textMuted]}>Desde</Text>
              <Text style={[styles.dateButtonValue, ds.text]}>
                {formatDateShort(rango.inicio)}
              </Text>
            </TouchableOpacity>
            <View style={styles.rangeDivider}>
              <Text style={[styles.rangeDividerText, ds.textMuted]}>→</Text>
            </View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openCalendar("fin")}
              activeOpacity={0.8}>
              <Text style={[styles.dateButtonLabel, ds.textMuted]}>Hasta</Text>
              <Text style={[styles.dateButtonValue, ds.text]}>
                {formatDateShort(rango.fin)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ✅ CARDS DE RESUMEN */}
          <View style={styles.summaryCards}>
            <View
              style={[
                styles.summaryCard,
                ds.cardBg,
                { borderColor: colors.income + "40" },
                getShadow(isDark, "sm"),
              ]}>
              <Text style={[styles.summaryCardLabel, ds.textSecondary]}>
                Ingresos
              </Text>
              <Text style={[styles.summaryCardValue, { color: colors.income }]}>
                {formatCurrency(totalIngresos)}
              </Text>
              <View style={styles.summaryCardIcon}>
                <Text style={styles.cardIconText}>📈</Text>
              </View>
            </View>

            <View
              style={[
                styles.summaryCard,
                ds.cardBg,
                { borderColor: colors.expense + "40" },
                getShadow(isDark, "sm"),
              ]}>
              <Text style={[styles.summaryCardLabel, ds.textSecondary]}>
                Gastos
              </Text>
              <Text
                style={[styles.summaryCardValue, { color: colors.expense }]}>
                {formatCurrency(totalGastos)}
              </Text>
              <View style={styles.summaryCardIcon}>
                <Text style={styles.cardIconText}>📉</Text>
              </View>
            </View>
          </View>

          {/* ✅ BALANCE CARD */}
          <View
            style={[
              styles.balanceCard,
              ds.cardBg,
              { borderColor: balance >= 0 ? colors.income : colors.expense },
              getShadow(isDark, "md"),
            ]}>
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceLabel, ds.textSecondary]}>
                Balance Neto
              </Text>
              <View
                style={[
                  styles.rentabilidadBadge,
                  {
                    backgroundColor:
                      Number(rentabilidad) >= 0
                        ? colors.income + "20"
                        : colors.expense + "20",
                  },
                ]}>
                <Text
                  style={[
                    styles.rentabilidadText,
                    {
                      color:
                        Number(rentabilidad) >= 0
                          ? colors.income
                          : colors.expense,
                    },
                  ]}>
                  {Number(rentabilidad) >= 0 ? "+" : ""}
                  {rentabilidad}%
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.balanceValue,
                { color: balance >= 0 ? colors.income : colors.expense },
              ]}>
              {formatCurrency(balance)}
            </Text>
            <Text style={[styles.balanceSubtext, ds.textMuted]}>
              {balance >= 0
                ? "Ganancia en el período"
                : "Pérdida en el período"}
            </Text>
          </View>

          {/* ✅ TABS DE VISTA */}
          <View style={[styles.viewTabs, ds.cardBg]}>
            {(["dias", "meses", "años"] as ViewType[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.viewTab,
                  view === v && { backgroundColor: colors.accent },
                ]}
                onPress={() => setView(v)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.viewTabText,
                    ds.textSecondary,
                    view === v && { color: "#FFFFFF" },
                  ]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ✅ GRÁFICO */}
          <View
            style={[styles.chartContainer, ds.cardBg, getShadow(isDark, "sm")]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, ds.text]}>Comparativa</Text>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.income },
                    ]}
                  />
                  <Text style={[styles.legendText, ds.textSecondary]}>
                    Ingresos
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.expense },
                    ]}
                  />
                  <Text style={[styles.legendText, ds.textSecondary]}>
                    Gastos
                  </Text>
                </View>
              </View>
            </View>

            <LineChart
              data={{
                labels: formattedLabels.slice(0, 6),
                datasets: [
                  {
                    data:
                      chartIngresosData.length > 0 ? chartIngresosData : [0],
                    color: () => colors.income,
                    strokeWidth: 3,
                  },
                  {
                    data: chartGastosData.length > 0 ? chartGastosData : [0],
                    color: () => colors.expense,
                    strokeWidth: 3,
                  },
                ],
              }}
              width={width - 40}
              height={220}
              yAxisLabel="$"
              yAxisInterval={1}
              fromZero={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              formatYLabel={abreviarNumero}
              chartConfig={{
                backgroundColor: "transparent",
                backgroundGradientFrom: colors.cardBg,
                backgroundGradientTo: colors.cardBg,
                decimalPlaces: 0,
                color: (opacity = 1) =>
                  `rgba(${isDark ? "255,255,255" : "0,0,0"},${opacity * 0.3})`,
                labelColor: () => colors.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: colors.cardBg,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: colors.border,
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* ✅ DETALLES */}
          <View
            style={[styles.detailsSection, ds.cardBg, getShadow(isDark, "sm")]}>
            <Text style={[styles.sectionTitle, ds.textSecondary]}>
              Detalles del período
            </Text>

            <View
              style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, ds.textSecondary]}>
                Transacciones totales
              </Text>
              <Text style={[styles.detailValue, ds.text]}>
                {gastosFiltrados.length + ingresosFiltrados.length}
              </Text>
            </View>

            <View
              style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, ds.textSecondary]}>
                Promedio ingresos/día
              </Text>
              <Text style={[styles.detailValue, { color: colors.income }]}>
                {formatCurrency(
                  ingresosFiltrados.length > 0
                    ? totalIngresos / Math.max(allKeys.length, 1)
                    : 0,
                )}
              </Text>
            </View>

            <View
              style={[styles.detailRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, ds.textSecondary]}>
                Promedio gastos/día
              </Text>
              <Text style={[styles.detailValue, { color: colors.expense }]}>
                {formatCurrency(
                  gastosFiltrados.length > 0
                    ? totalGastos / Math.max(allKeys.length, 1)
                    : 0,
                )}
              </Text>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* ✅ MODAL CALENDARIO */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={[styles.calendarModal, ds.modalBg]}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: colors.textMuted },
              ]}
            />
            <Text style={[styles.modalTitle, ds.text]}>
              Seleccionar fecha{" "}
              {selectingDate === "inicio" ? "inicial" : "final"}
            </Text>
            <Calendar
              current={selectingDate === "inicio" ? rango.inicio : rango.fin}
              onDayPress={(day: any) => {
                setRango((prev) => ({
                  ...prev,
                  [selectingDate]: day.dateString,
                }));
                setCalendarVisible(false);
              }}
              markedDates={{
                [rango.inicio]: {
                  selected: selectingDate === "inicio",
                  selectedColor: colors.accent,
                  startingDay: true,
                  color: colors.accent + "40",
                },
                [rango.fin]: {
                  selected: selectingDate === "fin",
                  selectedColor: colors.accent,
                  endingDay: true,
                  color: colors.accent + "40",
                },
              }}
              theme={{
                backgroundColor: colors.modalBg,
                calendarBackground: colors.modalBg,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: colors.text,
                todayTextColor: colors.accent,
                dayTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                monthTextColor: colors.text,
                arrowColor: colors.accent,
              }}
              style={styles.calendar}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // LOADING & ERROR
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, textAlign: "center" },

  // EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 16, fontWeight: "700", color: "#000" },

  // RANGE SELECTOR
  rangeSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  dateButton: { flex: 1, alignItems: "center", padding: 8 },
  dateButtonLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateButtonValue: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  rangeDivider: { paddingHorizontal: 12 },
  rangeDividerText: { fontSize: 18 },

  // SUMMARY CARDS
  summaryCards: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  summaryCardLabel: { fontSize: 12, marginBottom: 4 },
  summaryCardValue: { fontSize: 18, fontWeight: "700" },
  summaryCardIcon: { position: "absolute", right: 12, top: 12, opacity: 0.3 },
  cardIconText: { fontSize: 24 },

  // BALANCE CARD
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: { fontSize: 14 },
  rentabilidadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rentabilidadText: { fontSize: 13, fontWeight: "700" },
  balanceValue: { fontSize: 36, fontWeight: "700", letterSpacing: -1 },
  balanceSubtext: { fontSize: 12, marginTop: 4 },

  // VIEW TABS
  viewTabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  viewTabText: { fontSize: 14, fontWeight: "600" },

  // CHART
  chartContainer: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: "600" },
  chartLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  chart: { borderRadius: 16, marginLeft: -16 },

  // DETAILS
  detailsSection: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 15, fontWeight: "600" },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  calendarModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  calendar: { borderRadius: 16, overflow: "hidden" },
});
