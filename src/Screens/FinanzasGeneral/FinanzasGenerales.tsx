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
  Pressable,
  Alert,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);
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
import { Ionicons } from "@expo/vector-icons";

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

// ─── Generación del informe PDF ───────────────────────────────────────────────
function generarReporteHTML(params: {
  placas: string[];
  rangoInicio: string;
  rangoFin: string;
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  rentabilidad: string;
  periodos: string[];        // allKeys
  ingresosPorPeriodo: number[];
  gastosPorPeriodo: number[];
  gastosDetalle: Array<{ fecha: string; tipo_gasto: string; descripcion: string; monto: number }>;
  ingresosDetalle: Array<{ fecha: string; tipo_ingreso: string; descripcion: string; monto: number }>;
  view: ViewType;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

  const fmtFecha = (s: string) => {
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const labelPeriodo = (key: string) => {
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    if (params.view === "dias") { const [,m,d] = key.split("-"); return `${d}/${m}`; }
    if (params.view === "meses") { const [a,m] = key.split("-"); return `${meses[parseInt(m)-1]} ${a}`; }
    return key;
  };

  const periodoRows = params.periodos.map((k, i) => {
    const ing = params.ingresosPorPeriodo[i] || 0;
    const gas = params.gastosPorPeriodo[i] || 0;
    const bal = ing - gas;
    const balColor = bal >= 0 ? "#10B981" : "#EF4444";
    return `<tr>
      <td>${labelPeriodo(k)}</td>
      <td class="right green">${fmt(ing)}</td>
      <td class="right red">${fmt(gas)}</td>
      <td class="right" style="color:${balColor};font-weight:700">${fmt(bal)}</td>
    </tr>`;
  }).join("");

  const top10Ingresos = [...params.ingresosDetalle]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 15)
    .map(i => `<tr>
      <td>${fmtFecha(i.fecha)}</td>
      <td>${i.tipo_ingreso}</td>
      <td>${i.descripcion || "—"}</td>
      <td class="right green">${fmt(i.monto)}</td>
    </tr>`).join("");

  const top10Gastos = [...params.gastosDetalle]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 15)
    .map(g => `<tr>
      <td>${fmtFecha(g.fecha)}</td>
      <td>${g.tipo_gasto}</td>
      <td>${g.descripcion || "—"}</td>
      <td class="right red">${fmt(g.monto)}</td>
    </tr>`).join("");

  const rentNum = Number(params.rentabilidad);
  const balColor = params.balance >= 0 ? "#10B981" : "#EF4444";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #F5F5F5; padding: 24px; color: #222; }
    .page { background: #fff; max-width: 680px; margin: 0 auto; padding: 32px; border-radius: 8px; }

    /* HEADER */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #0F172A; padding-bottom: 16px; }
    .brand { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; }
    .brand span { color: #10B981; }
    .doc-info { text-align: right; font-size: 12px; color: #666; }
    .doc-info strong { color: #0F172A; display: block; font-size: 16px; font-weight: 700; margin-bottom: 4px; }

    /* META */
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; gap: 32px; font-size: 12px; color: #555; }
    .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #0F172A; }

    /* SUMMARY GRID */
    .summary { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 28px; }
    .s-card { border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; text-align: center; }
    .s-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; margin-bottom: 6px; }
    .s-value { font-size: 15px; font-weight: 800; }
    .green { color: #10B981; }
    .red { color: #EF4444; }

    /* SECTION */
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #888; margin: 24px 0 10px; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0F172A; color: #fff; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
    th.right { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; color: #333; vertical-align: middle; }
    td.right { text-align: right; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #F8FAFC; }
    .total-tr td { background: #F1F5F9; font-weight: 700; font-size: 13px; border-top: 2px solid #CBD5E1; }

    /* FOOTER */
    .footer { text-align: center; font-size: 10px; color: #BBB; margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 14px; }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand">Truck<span>Book</span></div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Informe Financiero</div>
    </div>
    <div class="doc-info">
      <strong>Informe de Finanzas</strong>
      Generado: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <strong>Período</strong>
      <span>${fmtFecha(params.rangoInicio)} — ${fmtFecha(params.rangoFin)}</span>
    </div>
    <div class="meta-item">
      <strong>Vehículo(s)</strong>
      <span>${params.placas.length > 0 ? params.placas.join(", ") : "Todos"}</span>
    </div>
    <div class="meta-item">
      <strong>Transacciones</strong>
      <span>${params.gastosDetalle.length + params.ingresosDetalle.length}</span>
    </div>
  </div>

  <!-- RESUMEN -->
  <div class="summary">
    <div class="s-card" style="border-color:#10B98140">
      <div class="s-label">Ingresos</div>
      <div class="s-value green">${fmt(params.totalIngresos)}</div>
    </div>
    <div class="s-card" style="border-color:#EF444440">
      <div class="s-label">Gastos</div>
      <div class="s-value red">${fmt(params.totalGastos)}</div>
    </div>
    <div class="s-card" style="border-color:${balColor}40">
      <div class="s-label">Balance</div>
      <div class="s-value" style="color:${balColor}">${fmt(params.balance)}</div>
    </div>
    <div class="s-card" style="border-color:${rentNum >= 0 ? "#10B98140" : "#EF444440"}">
      <div class="s-label">Rentabilidad</div>
      <div class="s-value" style="color:${rentNum >= 0 ? "#10B981" : "#EF4444"}">${rentNum >= 0 ? "+" : ""}${params.rentabilidad}%</div>
    </div>
  </div>

  <!-- POR PERÍODO -->
  ${params.periodos.length > 0 ? `
  <div class="section-title">Resumen por período</div>
  <table>
    <thead><tr>
      <th>Período</th>
      <th class="right">Ingresos</th>
      <th class="right">Gastos</th>
      <th class="right">Balance</th>
    </tr></thead>
    <tbody>
      ${periodoRows}
      <tr class="total-tr">
        <td>Total</td>
        <td class="right green">${fmt(params.totalIngresos)}</td>
        <td class="right red">${fmt(params.totalGastos)}</td>
        <td class="right" style="color:${balColor}">${fmt(params.balance)}</td>
      </tr>
    </tbody>
  </table>` : ""}

  <!-- INGRESOS DETALLE -->
  ${params.ingresosDetalle.length > 0 ? `
  <div class="section-title">Ingresos del período (${params.ingresosDetalle.length})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Descripción</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>${top10Ingresos}</tbody>
  </table>
  ${params.ingresosDetalle.length > 15 ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando 15 de ${params.ingresosDetalle.length} registros</div>` : ""}
  ` : ""}

  <!-- GASTOS DETALLE -->
  ${params.gastosDetalle.length > 0 ? `
  <div class="section-title">Gastos del período (${params.gastosDetalle.length})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Descripción</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>${top10Gastos}</tbody>
  </table>
  ${params.gastosDetalle.length > 15 ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando 15 de ${params.gastosDetalle.length} registros</div>` : ""}
  ` : ""}

  <div class="footer">Generado con TruckBook · ${new Date().toLocaleString("es-CO")}</div>
</div>
</body>
</html>`;
}

export default function FinanzasGenerales() {
  const { colors, isDark } = useTheme();
  const c = colors;
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const role = useRoleStore((s) => s.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [view, setView] = useState<ViewType>("meses");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectingDate, setSelectingDate] = useState<"inicio" | "fin">(
    "inicio",
  );

  const [placasDisponibles, setPlacasDisponibles] = useState<string[]>([]);
  const [placasSeleccionadas, setPlacasSeleccionadas] = useState<Set<string>>(
    new Set(),
  );
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
  const headerY = useRef(new Animated.Value(-10)).current;
  const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

  // Summary cards staggered entrance
  const card1Opacity = useSharedValue(0);
  const card1Scale = useSharedValue(0.95);
  const card2Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0.95);
  const balOpacity = useSharedValue(0);
  const balScale = useSharedValue(0.96);
  const chartOpacity = useSharedValue(0);
  const chartTransY = useSharedValue(12);

  const card1Style = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ scale: card1Scale.value }],
  }));
  const card2Style = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ scale: card2Scale.value }],
  }));
  const balStyle = useAnimatedStyle(() => ({
    opacity: balOpacity.value,
    transform: [{ scale: balScale.value }],
  }));
  const chartStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
    transform: [{ translateY: chartTransY.value }],
  }));

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
    : placaActual
      ? [placaActual]
      : [];

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
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.timing(headerY, {
            toValue: 0,
            duration: 420,
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
            useNativeDriver: true,
          }),
        ]).start();
        // Stagger cards
        card1Opacity.value = withDelay(
          60,
          withTiming(1, { duration: 300, easing: easeOut }),
        );
        card1Scale.value = withDelay(
          60,
          withTiming(1, { duration: 340, easing: easeOut }),
        );
        card2Opacity.value = withDelay(
          130,
          withTiming(1, { duration: 300, easing: easeOut }),
        );
        card2Scale.value = withDelay(
          130,
          withTiming(1, { duration: 340, easing: easeOut }),
        );
        balOpacity.value = withDelay(
          200,
          withTiming(1, { duration: 320, easing: easeOut }),
        );
        balScale.value = withDelay(
          200,
          withTiming(1, { duration: 360, easing: easeOut }),
        );
        chartOpacity.value = withDelay(
          280,
          withTiming(1, { duration: 320, easing: easeOut }),
        );
        chartTransY.value = withDelay(
          280,
          withTiming(0, { duration: 360, easing: easeOut }),
        );
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

  const exportar = async () => {
    if (exportando) return;
    const gastosDetalle = gastosPorPlaca.filter(
      (g) => (!rango.inicio || g.fecha >= rango.inicio) && (!rango.fin || g.fecha <= rango.fin),
    );
    const ingresosDetalle = ingresosPorPlaca.filter(
      (i) => (!rango.inicio || i.fecha >= rango.inicio) && (!rango.fin || i.fecha <= rango.fin),
    );
    if (gastosDetalle.length === 0 && ingresosDetalle.length === 0) {
      Alert.alert("Sin datos", "No hay transacciones en el período seleccionado.");
      return;
    }
    setExportando(true);
    try {
      const html = generarReporteHTML({
        placas: placasActivas,
        rangoInicio: rango.inicio,
        rangoFin: rango.fin,
        totalIngresos,
        totalGastos,
        balance,
        rentabilidad: String(rentabilidad),
        periodos: allKeys,
        ingresosPorPeriodo: chartIngresosData,
        gastosPorPeriodo: chartGastosData,
        gastosDetalle,
        ingresosDetalle,
        view,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir informe financiero",
        UTI: "com.adobe.pdf",
      });
    } catch {
      Alert.alert("Error", "No se pudo generar el informe.");
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>
              cargando…
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
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={c.danger}
              style={{ marginBottom: 16 }}
            />
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
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
            <View
              style={[
                styles.emptyIconWrap,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : c.surface,
                },
              ]}>
              <Ionicons
                name="bar-chart-outline"
                size={48}
                color={c.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              sin vehículo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
              selecciona una placa para ver las finanzas
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
        <Animated.View
          style={[
            styles.headerFixed,
            { opacity: fadeAnim, transform: [{ translateY: headerY }] },
          ]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: c.text }]}>
                finanzas
              </Text>
              <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                Análisis financiero
              </Text>
            </View>
            <View style={styles.headerRight}>
              {!esMultiVehiculo && (
                <View
                  style={[
                    styles.placaBadge,
                    {
                      backgroundColor: c.plateYellow,
                      borderColor: c.plateBorder,
                      borderWidth: 1,
                    },
                  ]}>
                  <Text style={[styles.placaText, { color: c.plateText }]}>
                    {placaActual}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: c.cardBg, borderColor: c.border }]}
                onPress={exportar}
                disabled={exportando}
                activeOpacity={0.7}>
                {exportando
                  ? <ActivityIndicator size="small" color={c.textSecondary} />
                  : <Ionicons name="share-outline" size={18} color={c.text} />
                }
              </TouchableOpacity>
            </View>
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
                  {
                    backgroundColor:
                      placasSeleccionadas.size === placasDisponibles.length
                        ? c.accent
                        : c.cardBg,
                    borderColor:
                      placasSeleccionadas.size === placasDisponibles.length
                        ? c.accent
                        : c.border,
                  },
                ]}
                onPress={toggleTodas}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        placasSeleccionadas.size === placasDisponibles.length
                          ? c.accentText
                          : c.textSecondary,
                    },
                  ]}>
                  todos ({placasDisponibles.length})
                </Text>
              </TouchableOpacity>
              {placasDisponibles.map((placa) => (
                <TouchableOpacity
                  key={placa}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: placasSeleccionadas.has(placa)
                        ? c.accent
                        : c.cardBg,
                      borderColor: placasSeleccionadas.has(placa)
                        ? c.accent
                        : c.border,
                    },
                  ]}
                  onPress={() => togglePlaca(placa)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: placasSeleccionadas.has(placa)
                          ? c.accentText
                          : c.textSecondary,
                      },
                    ]}>
                    {placa}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* CONTENIDO SCROLLEABLE */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View>
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
                <Ionicons name="arrow-forward" size={16} color={c.textMuted} />
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
              <Reanimated.View
                style={[
                  styles.summaryCard,
                  { backgroundColor: c.cardBg, borderColor: c.income + "40" },
                  getShadow(isDark, "sm"),
                  card1Style,
                ]}>
                <Text
                  style={[styles.summaryCardLabel, { color: c.textSecondary }]}>
                  Ingresos
                </Text>
                <Text style={[styles.summaryCardValue, { color: c.income }]}>
                  {formatCurrency(totalIngresos)}
                </Text>
                <Ionicons
                  name="trending-up-outline"
                  size={22}
                  color={c.income}
                  style={styles.cardIcon}
                />
              </Reanimated.View>
              <Reanimated.View
                style={[
                  styles.summaryCard,
                  { backgroundColor: c.cardBg, borderColor: c.expense + "40" },
                  getShadow(isDark, "sm"),
                  card2Style,
                ]}>
                <Text
                  style={[styles.summaryCardLabel, { color: c.textSecondary }]}>
                  Gastos
                </Text>
                <Text style={[styles.summaryCardValue, { color: c.expense }]}>
                  {formatCurrency(totalGastos)}
                </Text>
                <Ionicons
                  name="trending-down-outline"
                  size={22}
                  color={c.expense}
                  style={styles.cardIcon}
                />
              </Reanimated.View>
            </View>

            {/* BALANCE CARD */}
            <Reanimated.View
              style={[
                styles.balanceCard,
                {
                  backgroundColor: c.cardBg,
                  borderColor: balance >= 0 ? c.income : c.expense,
                },
                getShadow(isDark, "md"),
                balStyle,
              ]}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: c.textSecondary }]}>
                  Balance neto
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
                        color: Number(rentabilidad) >= 0 ? c.income : c.expense,
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
                  ? "ganancia en el período"
                  : "pérdida en el período"}
              </Text>
            </Reanimated.View>

            {/* TABS DE VISTA */}
            <View
              style={[
                styles.viewTabs,
                { backgroundColor: c.cardBg, borderColor: c.border },
              ]}>
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
            <Reanimated.View
              style={[
                styles.chartContainer,
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "sm"),
                chartStyle,
              ]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: c.text }]}>
                  Comparativa
                </Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: c.income }]}
                    />
                    <Text
                      style={[styles.legendText, { color: c.textSecondary }]}>
                      ingresos
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: c.expense }]}
                    />
                    <Text
                      style={[styles.legendText, { color: c.textSecondary }]}>
                      gastos
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
            </Reanimated.View>

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

              <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>
                  Transacciones
                </Text>
                <Text style={[styles.detailValue, { color: c.text }]}>
                  {gastosFiltrados.length + ingresosFiltrados.length}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
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
          </View>
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
              style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
            />
            <Text style={[styles.modalTitle, { color: c.text }]}>
              fecha {selectingDate === "inicio" ? "inicial" : "final"}
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
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  placaBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  exportBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

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
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 110 },

  // LOADING & ERROR
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: { fontSize: 16, textAlign: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
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
  dateButtonLabel: { fontSize: 10 },
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
  summaryCardValue: { fontSize: 18, fontWeight: "800" },
  cardIcon: {
    position: "absolute",
    right: 10,
    top: 10,
    opacity: 0.4,
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
  balanceValue: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
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
