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
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import { Modal } from "react-native";

const { width } = Dimensions.get("window");

// ✅ Tema Premium Oscuro
const COLORS = {
  primary: "#1A1A2E",
  secondary: "#16213E",
  accent: "#6C5CE7",
  accentLight: "#A29BFE",
  surface: "#0F0F1A",
  surfaceLight: "#1F1F35",
  text: "#FFFFFF",
  textSecondary: "#8A8A9A",
  textMuted: "#5A5A6A",
  border: "#2A2A40",
  success: "#00D9A5",
  danger: "#E94560",
  warning: "#FFB800",
  cardBg: "rgba(31, 31, 53, 0.8)",
  chartGradientFrom: "#1F1F35",
  chartGradientTo: "#2A2A45",
};

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

  // Animaciones
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

    if (placaActual) {
      cargarDatos();
    }
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
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  };

  const openCalendar = (type: "inicio" | "fin") => {
    setSelectingDate(type);
    setCalendarVisible(true);
  };

  // ✅ LOADING
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  // ✅ ERROR
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // ✅ SIN PLACA
  if (!placaActual) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Sin vehículo seleccionado</Text>
          <Text style={styles.emptySubtitle}>
            Selecciona una placa para ver las finanzas
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.ScrollView
          style={[styles.scrollView, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* ✅ HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Finanzas</Text>
              <Text style={styles.headerSubtitle}>Análisis financiero</Text>
            </View>
            <View style={styles.placaBadge}>
              <Text style={styles.placaText}>{placaActual}</Text>
            </View>
          </View>

          {/* ✅ SELECTOR DE RANGO */}
          <View style={styles.rangeSelector}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openCalendar("inicio")}
              activeOpacity={0.8}>
              <Text style={styles.dateButtonLabel}>Desde</Text>
              <Text style={styles.dateButtonValue}>
                {formatDateShort(rango.inicio)}
              </Text>
            </TouchableOpacity>
            <View style={styles.rangeDivider}>
              <Text style={styles.rangeDividerText}>→</Text>
            </View>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openCalendar("fin")}
              activeOpacity={0.8}>
              <Text style={styles.dateButtonLabel}>Hasta</Text>
              <Text style={styles.dateButtonValue}>
                {formatDateShort(rango.fin)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ✅ CARDS DE RESUMEN */}
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, styles.incomeCard]}>
              <Text style={styles.summaryCardLabel}>Ingresos</Text>
              <Text
                style={[styles.summaryCardValue, { color: COLORS.success }]}>
                {formatCurrency(totalIngresos)}
              </Text>
              <View style={styles.summaryCardIcon}>
                <Text style={styles.cardIconText}>📈</Text>
              </View>
            </View>

            <View style={[styles.summaryCard, styles.expenseCard]}>
              <Text style={styles.summaryCardLabel}>Gastos</Text>
              <Text style={[styles.summaryCardValue, { color: COLORS.danger }]}>
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
              { borderColor: balance >= 0 ? COLORS.success : COLORS.danger },
            ]}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Balance Neto</Text>
              <View
                style={[
                  styles.rentabilidadBadge,
                  {
                    backgroundColor:
                      Number(rentabilidad) >= 0
                        ? COLORS.success + "20"
                        : COLORS.danger + "20",
                  },
                ]}>
                <Text
                  style={[
                    styles.rentabilidadText,
                    {
                      color:
                        Number(rentabilidad) >= 0
                          ? COLORS.success
                          : COLORS.danger,
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
                { color: balance >= 0 ? COLORS.success : COLORS.danger },
              ]}>
              {formatCurrency(balance)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {balance >= 0
                ? "Ganancia en el período"
                : "Pérdida en el período"}
            </Text>
          </View>

          {/* ✅ TABS DE VISTA */}
          <View style={styles.viewTabs}>
            {(["dias", "meses", "años"] as ViewType[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.viewTab, view === v && styles.viewTabActive]}
                onPress={() => setView(v)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.viewTabText,
                    view === v && styles.viewTabTextActive,
                  ]}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ✅ GRÁFICO */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Comparativa</Text>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: COLORS.success },
                    ]}
                  />
                  <Text style={styles.legendText}>Ingresos</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: COLORS.danger },
                    ]}
                  />
                  <Text style={styles.legendText}>Gastos</Text>
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
                    color: () => COLORS.success,
                    strokeWidth: 3,
                  },
                  {
                    data: chartGastosData.length > 0 ? chartGastosData : [0],
                    color: () => COLORS.danger,
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
                backgroundGradientFrom: COLORS.surfaceLight,
                backgroundGradientTo: COLORS.surfaceLight,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255,255,255,${opacity * 0.3})`,
                labelColor: () => COLORS.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: COLORS.surfaceLight,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: COLORS.border,
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* ✅ DETALLES */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Detalles del período</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transacciones totales</Text>
              <Text style={styles.detailValue}>
                {gastosFiltrados.length + ingresosFiltrados.length}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Promedio ingresos/día</Text>
              <Text style={[styles.detailValue, { color: COLORS.success }]}>
                {formatCurrency(
                  ingresosFiltrados.length > 0
                    ? totalIngresos / Math.max(allKeys.length, 1)
                    : 0,
                )}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Promedio gastos/día</Text>
              <Text style={[styles.detailValue, { color: COLORS.danger }]}>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
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
                  selectedColor: COLORS.accent,
                  startingDay: true,
                  color: COLORS.accent + "40",
                },
                [rango.fin]: {
                  selected: selectingDate === "fin",
                  selectedColor: COLORS.accent,
                  endingDay: true,
                  color: COLORS.accent + "40",
                },
              }}
              theme={{
                backgroundColor: COLORS.surfaceLight,
                calendarBackground: COLORS.surfaceLight,
                textSectionTitleColor: COLORS.textSecondary,
                selectedDayBackgroundColor: COLORS.accent,
                selectedDayTextColor: COLORS.text,
                todayTextColor: COLORS.accent,
                dayTextColor: COLORS.text,
                textDisabledColor: COLORS.textMuted,
                monthTextColor: COLORS.text,
                arrowColor: COLORS.accent,
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
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ✅ LOADING & ERROR
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: "center",
  },

  // ✅ EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ✅ HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  // ✅ RANGE SELECTOR
  rangeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButton: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  dateButtonLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateButtonValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 4,
  },
  rangeDivider: {
    paddingHorizontal: 12,
  },
  rangeDividerText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },

  // ✅ SUMMARY CARDS
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "hidden",
  },
  incomeCard: {
    borderColor: COLORS.success + "40",
  },
  expenseCard: {
    borderColor: COLORS.danger + "40",
  },
  summaryCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryCardIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    opacity: 0.3,
  },
  cardIconText: {
    fontSize: 24,
  },

  // ✅ BALANCE CARD
  balanceCard: {
    backgroundColor: COLORS.cardBg,
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
  balanceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rentabilidadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rentabilidadText: {
    fontSize: 13,
    fontWeight: "700",
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  balanceSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ✅ VIEW TABS
  viewTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
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
  viewTabActive: {
    backgroundColor: COLORS.accent,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  viewTabTextActive: {
    color: COLORS.text,
  },

  // ✅ CHART
  chartContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },

  // ✅ DETAILS
  detailsSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },

  // ✅ MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  calendarModal: {
    backgroundColor: COLORS.surfaceLight,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
  },
});
