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
import { useRoleStore } from "../../store/RoleStore";
import { useAuth } from "../../hooks/useAuth";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  cargarTodosVehiculosConConductores,
  cargarVehiculosPropietarioConConductores,
} from "../../services/vehiculoAutorizacionService";

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
  const c = colors;
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const role = useRoleStore((s) => s.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("meses");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectingDate, setSelectingDate] = useState<"inicio" | "fin">(
    "inicio",
  );

  const [placasDisponibles, setPlacasDisponibles] = useState<string[]>([]);
  const [placasSeleccionadas, setPlacasSeleccionadas] = useState<Set<string>>(new Set());
  const esMultiVehiculo = role === "administrador" || role === "propietario";

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

  // Cargar placas disponibles para admin/propietario
  useEffect(() => {
    if (!esMultiVehiculo || !user?.id) return;
    const cargarPlacas = async () => {
      const { data } =
        role === "administrador"
          ? await cargarTodosVehiculosConConductores()
          : await cargarVehiculosPropietarioConConductores(user.id);
      const placas = data.map((v) => v.placa);
      setPlacasDisponibles(placas);
      setPlacasSeleccionadas(new Set(placas));
    };
    cargarPlacas();
  }, [user?.id, role, esMultiVehiculo]);

  const togglePlaca = (placa: string) => {
    setPlacasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(placa)) {
        next.delete(placa);
      } else {
        next.add(placa);
      }
      return next;
    });
  };

  const toggleTodas = () => {
    if (placasSeleccionadas.size === placasDisponibles.length) {
      setPlacasSeleccionadas(new Set());
    } else {
      setPlacasSeleccionadas(new Set(placasDisponibles));
    }
  };

  // Determinar placas activas para filtrado
  const placasActivas = esMultiVehiculo
    ? Array.from(placasSeleccionadas)
    : placaActual ? [placaActual] : [];

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        if (esMultiVehiculo) {
          // Cargar datos de todas las placas disponibles
          await Promise.all([
            useGastosStore.getState().cargarGastosDelDB(),
            useIngresosStore.getState().cargarIngresosDelDB(),
          ]);
        } else {
          await Promise.all([
            useGastosStore.getState().cargarGastosDelDB(placaActual),
            useIngresosStore.getState().cargarIngresosDelDB(placaActual),
          ]);
        }
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
    if (esMultiVehiculo || placaActual) cargarDatos();
  }, [placaActual, esMultiVehiculo]);

  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  const placasSet = new Set(placasActivas);
  const gastosPorPlaca = gastos.filter((g) => placasSet.has(g.placa));
  const ingresosPorPlaca = ingresos.filter((i) => placasSet.has(i.placa));

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

  const shadow = getShadow(isDark, "sm");

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>
              Cargando...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: c.danger }]}>
              {error}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!esMultiVehiculo && !placaActual) {
    return (
      <View style={[styles.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              Sin vehículo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
              Selecciona una placa para ver las finanzas
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER FIJO */}
        <View style={styles.headerFixed}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: c.text }]}>Finanzas</Text>
              <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                Análisis financiero
              </Text>
            </View>
            {!esMultiVehiculo && (
              <View style={[styles.placaBadge, { backgroundColor: c.accent }, shadow]}>
                <Text style={[styles.placaText, { color: c.accentText }]}>{placaActual}</Text>
              </View>
            )}
          </View>

          {/* FILTRO MULTI-VEHÍCULO */}
          {esMultiVehiculo && placasDisponibles.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: placasSeleccionadas.size === placasDisponibles.length ? c.accent : c.cardBg, borderColor: placasSeleccionadas.size === placasDisponibles.length ? c.accent : c.border },
                ]}
                onPress={toggleTodas}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: placasSeleccionadas.size === placasDisponibles.length ? c.accentText : c.textSecondary },
                  ]}>
                  Todos ({placasDisponibles.length})
                </Text>
              </TouchableOpacity>
              {placasDisponibles.map((placa) => (
                <TouchableOpacity
                  key={placa}
                  style={[
                    styles.filterChip,
                    { backgroundColor: placasSeleccionadas.has(placa) ? c.accent : c.cardBg, borderColor: placasSeleccionadas.has(placa) ? c.accent : c.border },
                  ]}
                  onPress={() => togglePlaca(placa)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: placasSeleccionadas.has(placa) ? c.accentText : c.textSecondary },
                    ]}>
                    {placa}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "sm"),
              ]}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openCalendar("inicio")}
                activeOpacity={0.8}>
                <Text style={[styles.dateButtonLabel, { color: c.textMuted }]}>
                  Desde
                </Text>
                <Text style={[styles.dateButtonValue, { color: c.text }]}>
                  {formatDateShort(rango.inicio)}
                </Text>
              </TouchableOpacity>
              <View style={styles.rangeDivider}>
                <Text style={[styles.rangeDividerText, { color: c.textMuted }]}>→</Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => openCalendar("fin")}
                activeOpacity={0.8}>
                <Text style={[styles.dateButtonLabel, { color: c.textMuted }]}>
                  Hasta
                </Text>
                <Text style={[styles.dateButtonValue, { color: c.text }]}>
                  {formatDateShort(rango.fin)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* CARDS DE RESUMEN - GRID 2 COLUMNAS */}
            <View style={styles.summaryGrid}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: c.cardBg, borderColor: c.border },
                  { borderColor: c.income + "40" },
                  getShadow(isDark, "sm"),
                ]}>
                <Text style={[styles.summaryCardLabel, { color: c.textSecondary }]}>
                  Ingresos
                </Text>
                <Text
                  style={[styles.summaryCardValue, { color: c.income }]}>
                  {formatCurrency(totalIngresos)}
                </Text>
                <Text style={styles.cardIcon}>📈</Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: c.cardBg, borderColor: c.border },
                  { borderColor: c.expense + "40" },
                  getShadow(isDark, "sm"),
                ]}>
                <Text style={[styles.summaryCardLabel, { color: c.textSecondary }]}>
                  Gastos
                </Text>
                <Text
                  style={[styles.summaryCardValue, { color: c.expense }]}>
                  {formatCurrency(totalGastos)}
                </Text>
                <Text style={styles.cardIcon}>📉</Text>
              </View>
            </View>

            {/* BALANCE CARD */}
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: c.cardBg, borderColor: c.border },
                { borderColor: balance >= 0 ? c.income : c.expense },
                getShadow(isDark, "md"),
              ]}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: c.textSecondary }]}>
                  Balance Neto
                </Text>
                <View
                  style={[
                    styles.rentabilidadBadge,
                    {
                      backgroundColor:
                        Number(rentabilidad) >= 0
                          ? c.income + "20"
                          : c.expense + "20",
                    },
                  ]}>
                  <Text
                    style={[
                      styles.rentabilidadText,
                      {
                        color:
                          Number(rentabilidad) >= 0
                            ? c.income
                            : c.expense,
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
                  { color: balance >= 0 ? c.income : c.expense },
                ]}>
                {formatCurrency(balance)}
              </Text>
              <Text style={[styles.balanceSubtext, { color: c.textMuted }]}>
                {balance >= 0
                  ? "Ganancia en el período"
                  : "Pérdida en el período"}
              </Text>
            </View>

            {/* TABS DE VISTA */}
            <View style={[styles.viewTabs, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {(["dias", "meses", "años"] as ViewType[]).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.viewTab,
                    view === v && { backgroundColor: c.accent },
                  ]}
                  onPress={() => setView(v)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.viewTabText,
                      { color: c.textSecondary },
                      view === v && { color: c.accentText },
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
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "sm"),
              ]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: c.text }]}>Comparativa</Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: c.income },
                      ]}
                    />
                    <Text style={[styles.legendText, { color: c.textSecondary }]}>
                      Ingresos
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: c.expense },
                      ]}
                    />
                    <Text style={[styles.legendText, { color: c.textSecondary }]}>
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
                      color: () => c.income,
                      strokeWidth: 3,
                    },
                    {
                      data: chartGastosData.length > 0 ? chartGastosData : [0],
                      color: () => c.expense,
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
                  backgroundGradientFrom: c.cardBg,
                  backgroundGradientTo: c.cardBg,
                  decimalPlaces: 0,
                  color: (opacity = 1) =>
                    `rgba(${isDark ? "255,255,255" : "0,0,0"},${opacity * 0.3})`,
                  labelColor: () => c.textSecondary,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: c.cardBg,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "",
                    stroke: c.border,
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
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "sm"),
              ]}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                Detalles del período
              </Text>

              <View
                style={[
                  styles.detailRow,
                  { borderBottomColor: c.border },
                ]}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>
                  Transacciones
                </Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {gastosFiltrados.length + ingresosFiltrados.length}
                </Text>
              </View>

              <View
                style={[
                  styles.detailRow,
                  { borderBottomColor: c.border },
                ]}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>
                  Promedio ingresos
                </Text>
                <Text style={[styles.detailValue, { color: c.income }]}>
                  {formatCurrency(
                    ingresosFiltrados.length > 0
                      ? totalIngresos / Math.max(allKeys.length, 1)
                      : 0,
                  )}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>
                  Promedio gastos
                </Text>
                <Text style={[styles.detailValue, { color: c.expense }]}>
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
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={[styles.calendarModal, { backgroundColor: c.modalBg }]}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: c.textMuted },
              ]}
            />
            <Text style={[styles.modalTitle, { color: c.text }]}>
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
                  selectedColor: c.accent,
                },
                [rango.fin]: {
                  selected: selectingDate === "fin",
                  selectedColor: c.accent,
                },
              }}
              theme={{
                backgroundColor: c.modalBg,
                calendarBackground: c.modalBg,
                textSectionTitleColor: c.textSecondary,
                selectedDayBackgroundColor: c.accent,
                selectedDayTextColor: c.accentText,
                todayTextColor: c.accent,
                dayTextColor: c.text,
                textDisabledColor: c.textMuted,
                monthTextColor: c.text,
                arrowColor: c.accent,
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
  placaBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },

  // FILTER CHIPS
  filterScroll: { marginBottom: 4 },
  filterContent: { gap: 8, paddingVertical: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {},

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
