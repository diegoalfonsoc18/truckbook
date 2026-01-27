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
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import { useTheme, getShadow } from "../../constants/Themecontext";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;

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
        setError("Error al cargar datos");
      } finally {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
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

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    modalBg: { backgroundColor: colors.modalBg },
  };

  if (loading) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, ds.textSecondary]}>
              Cargando...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!placaActual) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyTitle, ds.text]}>
              Sin vehículo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, ds.textSecondary]}>
              Selecciona una placa para ver las finanzas
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER FIJO */}
        <View style={styles.headerFixed}>
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
        </View>

        {/* CONTENIDO SCROLLEABLE */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* SELECTOR DE RANGO */}
            <View
              style={[
                styles.rangeSelector,
                ds.cardBg,
                getShadow(isDark, "sm"),
              ]}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openCalendar("inicio")}
                activeOpacity={0.8}>
                <Text style={[styles.dateButtonLabel, ds.textMuted]}>
                  Desde
                </Text>
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
                <Text style={[styles.dateButtonLabel, ds.textMuted]}>
                  Hasta
                </Text>
                <Text style={[styles.dateButtonValue, ds.text]}>
                  {formatDateShort(rango.fin)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* CARDS DE RESUMEN - GRID 2 COLUMNAS */}
            <View style={styles.summaryGrid}>
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
                <Text
                  style={[styles.summaryCardValue, { color: colors.income }]}>
                  {formatCurrency(totalIngresos)}
                </Text>
                <Text style={styles.cardIcon}>📈</Text>
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
                <Text style={styles.cardIcon}>📉</Text>
              </View>
            </View>

            {/* BALANCE CARD */}
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

            {/* TABS DE VISTA */}
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
                      view === v && { color: "#FFF" },
                    ]}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* GRÁFICO */}
            <View
              style={[
                styles.chartContainer,
                ds.cardBg,
                getShadow(isDark, "sm"),
              ]}>
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
                height={200}
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
                    r: "4",
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

            {/* DETALLES */}
            <View
              style={[
                styles.detailsSection,
                ds.cardBg,
                getShadow(isDark, "sm"),
              ]}>
              <Text style={[styles.sectionTitle, ds.textSecondary]}>
                Detalles del período
              </Text>

              <View
                style={[
                  styles.detailRow,
                  { borderBottomColor: colors.border },
                ]}>
                <Text style={[styles.detailLabel, ds.textSecondary]}>
                  Transacciones
                </Text>
                <Text style={[styles.detailValue, ds.text]}>
                  {gastosFiltrados.length + ingresosFiltrados.length}
                </Text>
              </View>

              <View
                style={[
                  styles.detailRow,
                  { borderBottomColor: colors.border },
                ]}>
                <Text style={[styles.detailLabel, ds.textSecondary]}>
                  Promedio ingresos
                </Text>
                <Text style={[styles.detailValue, { color: colors.income }]}>
                  {formatCurrency(
                    ingresosFiltrados.length > 0
                      ? totalIngresos / Math.max(allKeys.length, 1)
                      : 0,
                  )}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, ds.textSecondary]}>
                  Promedio gastos
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
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL CALENDARIO */}
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
              Fecha {selectingDate === "inicio" ? "inicial" : "final"}
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
                },
                [rango.fin]: {
                  selected: selectingDate === "fin",
                  selectedColor: colors.accent,
                },
              }}
              theme={{
                backgroundColor: colors.modalBg,
                calendarBackground: colors.modalBg,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: "#FFF",
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

  // HEADER FIJO
  headerFixed: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "700", color: "#000" },

  // SCROLL
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 40 },

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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },

  // RANGE SELECTOR
  rangeSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  dateButton: { flex: 1, alignItems: "center", padding: 6 },
  dateButtonLabel: { fontSize: 10, textTransform: "uppercase" },
  dateButtonValue: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  rangeDivider: { paddingHorizontal: 10 },
  rangeDividerText: { fontSize: 16 },

  // SUMMARY GRID
  summaryGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    position: "relative",
  },
  summaryCardLabel: { fontSize: 12, marginBottom: 4 },
  summaryCardValue: { fontSize: 18, fontWeight: "700" },
  cardIcon: {
    position: "absolute",
    right: 10,
    top: 10,
    fontSize: 20,
    opacity: 0.3,
  },

  // BALANCE CARD
  balanceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  balanceLabel: { fontSize: 13 },
  rentabilidadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rentabilidadText: { fontSize: 12, fontWeight: "700" },
  balanceValue: { fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  balanceSubtext: { fontSize: 11, marginTop: 4 },

  // VIEW TABS
  viewTabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  viewTabText: { fontSize: 13, fontWeight: "600" },

  // CHART
  chartContainer: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: { fontSize: 15, fontWeight: "600" },
  chartLegend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  chart: { borderRadius: 12, marginLeft: -14 },

  // DETAILS
  detailsSection: { borderRadius: 14, padding: 14, borderWidth: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: "600" },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  calendarModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  calendar: { borderRadius: 12 },
});
