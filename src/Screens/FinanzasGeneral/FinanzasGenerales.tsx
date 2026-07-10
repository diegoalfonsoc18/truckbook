import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Animated,
  Modal,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { Ionicons } from "@expo/vector-icons";
import ChartComparativa from "./components/ChartComparativa";

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
  periodos: string[]; // allKeys
  ingresosPorPeriodo: number[];
  gastosPorPeriodo: number[];
  gastosDetalle: Array<{
    fecha: string;
    tipo_gasto: string;
    descripcion: string;
    monto: number;
  }>;
  ingresosDetalle: Array<{
    fecha: string;
    tipo_ingreso: string;
    descripcion: string;
    monto: number;
    cliente?: string | null;
    cantidad?: number | null;
    estado?: string | null;
  }>;
  clienteFiltro?: string | null;
  view: ViewType;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(n);

  // Escapar datos del usuario interpolados en el HTML del PDF
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fmtFecha = (s: string) => {
    const d = new Date(s + "T12:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const labelPeriodo = (key: string) => {
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
    if (params.view === "dias") {
      const [, m, d] = key.split("-");
      return `${d}/${m}`;
    }
    if (params.view === "meses") {
      const [a, m] = key.split("-");
      return `${meses[parseInt(m) - 1]} ${a}`;
    }
    return key;
  };

  const periodoRows = params.periodos
    .map((k, i) => {
      const ing = params.ingresosPorPeriodo[i] || 0;
      const gas = params.gastosPorPeriodo[i] || 0;
      const bal = ing - gas;
      const balColor = bal >= 0 ? "#16A34A" : "#EF4444";
      return `<tr>
      <td>${labelPeriodo(k)}</td>
      <td class="right green">${fmt(ing)}</td>
      <td class="right red">${fmt(gas)}</td>
      <td class="right" style="color:${balColor};font-weight:700">${fmt(bal)}</td>
    </tr>`;
    })
    .join("");

  const cleanDesc = (d: string) =>
    (d || "").replace(/\[TEL:[^\]]*\]/g, "").trim();

  // Detalle cronológico completo (antes: solo top 15 por monto)
  const MAX_FILAS = 100;

  const ingresosOrdenados = [...params.ingresosDetalle].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );
  const filasIngresos = ingresosOrdenados
    .slice(0, MAX_FILAS)
    .map((i) => {
      const cant = i.cantidad ?? 1;
      const total = i.monto * cant;
      const desc = cleanDesc(i.descripcion);
      const clienteLabel =
        i.cliente || (desc.split(" · ")[0].trim().length > 1 ? desc.split(" · ")[0].trim() : "—");
      // La descripción suele empezar con el cliente — no repetirlo en la tabla
      const partes = desc.split(" · ");
      const detalle =
        partes[0]?.trim() === clienteLabel
          ? partes.slice(1).join(" · ").trim()
          : desc;
      const pendiente = i.estado === "pendiente";
      return `<tr>
      <td>${fmtFecha(i.fecha)}</td>
      <td>${esc(i.tipo_ingreso)}${cant > 1 ? ` (x${cant})` : ""}</td>
      <td>${esc(clienteLabel)}</td>
      <td>${esc(detalle) || "—"}</td>
      <td><span class="badge ${pendiente ? "b-pend" : "b-pag"}">${pendiente ? "Por cobrar" : "Pagado"}</span></td>
      <td class="right green">${fmt(total)}</td>
    </tr>`;
    })
    .join("");

  const filasGastos = [...params.gastosDetalle]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, MAX_FILAS)
    .map(
      (g) => `<tr>
      <td>${fmtFecha(g.fecha)}</td>
      <td>${esc(g.tipo_gasto)}</td>
      <td>${esc(cleanDesc(g.descripcion)) || "—"}</td>
      <td class="right red">${fmt(g.monto)}</td>
    </tr>`,
    )
    .join("");

  // Desglose recibido vs. por cobrar
  const totalPorCobrar = params.ingresosDetalle
    .filter((i) => i.estado === "pendiente")
    .reduce((a, i) => a + i.monto * (i.cantidad ?? 1), 0);
  const totalRecibido = params.totalIngresos - totalPorCobrar;

  const esCuentaCliente = !!params.clienteFiltro;
  const rentNum = Number(params.rentabilidad);
  const balColor = params.balance >= 0 ? "#16A34A" : "#EF4444";
  const tituloDoc = esCuentaCliente ? "Estado de cuenta" : "Informe de Finanzas";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #F5F5F5; padding: 24px; color: #000; }
    .page { background: #fff; max-width: 680px; margin: 0 auto; padding: 32px; border-radius: 8px; }

    /* HEADER */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #000; padding-bottom: 16px; }
    .brand { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -0.5px; }
    .brand span { color: #000; }
    .doc-info { text-align: right; font-size: 12px; color: #000; }
    .doc-info strong { color: #000; display: block; font-size: 16px; font-weight: 700; margin-bottom: 4px; }

    /* META */
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; gap: 32px; font-size: 12px; color: #000; }
    .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #000; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #000; }

    /* SUMMARY GRID */
    .summary { display: grid; grid-template-columns: repeat(${esCuentaCliente ? 3 : 4}, 1fr); gap: 12px; margin-bottom: 8px; }
    .s-card { border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; text-align: center; }
    .s-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #000; margin-bottom: 6px; }
    .s-value { font-size: 15px; font-weight: 800; color: #000; }
    .green { color: #16A34A; }
    .red { color: #EF4444; }
    .amber { color: #B45309; }
    .summary-note { font-size: 10px; color: #92400E; text-align: right; margin-bottom: 20px; }

    /* BADGES DE ESTADO */
    .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 8px; white-space: nowrap; }
    .b-pend { background: #FEF3C7; color: #92400E; }
    .b-pag { background: #DCFCE7; color: #166534; }

    /* SECTION */
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #000; margin: 24px 0 10px; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #000; color: #fff; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
    th.right { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; color: #000; vertical-align: middle; }
    td.right { text-align: right; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #F8FAFC; }
    .total-tr td { background: #F1F5F9; font-weight: 700; font-size: 13px; border-top: 2px solid #CBD5E1; color: #000; }

    /* FOOTER */
    .footer { text-align: center; font-size: 10px; color: #000; margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 14px; }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand">Truck<span>Book</span></div>
      <div style="font-size:13px;color:#666;margin-top:4px;">${tituloDoc}</div>
    </div>
    <div class="doc-info">
      <strong>${esCuentaCliente ? `Estado de cuenta — ${esc(params.clienteFiltro)}` : "Informe de Finanzas"}</strong>
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
      <span>${params.placas.length > 0 ? esc(params.placas.join(", ")) : "Todos"}</span>
    </div>
    ${params.clienteFiltro ? `<div class="meta-item"><strong>Cliente</strong><span>${esc(params.clienteFiltro)}</span></div>` : ""}
    <div class="meta-item">
      <strong>Transacciones</strong>
      <span>${params.gastosDetalle.length + params.ingresosDetalle.length}</span>
    </div>
  </div>

  <!-- RESUMEN -->
  ${
    esCuentaCliente
      ? `
  <div class="summary">
    <div class="s-card" style="border-color:#E2E8F0">
      <div class="s-label">Total facturado</div>
      <div class="s-value">${fmt(params.totalIngresos)}</div>
    </div>
    <div class="s-card" style="border-color:#16A34A40">
      <div class="s-label">Recibido</div>
      <div class="s-value green">${fmt(totalRecibido)}</div>
    </div>
    <div class="s-card" style="border-color:#F59E0B40">
      <div class="s-label">Por cobrar</div>
      <div class="s-value amber">${fmt(totalPorCobrar)}</div>
    </div>
  </div>
  <div class="summary-note">&nbsp;</div>`
      : `
  <div class="summary">
    <div class="s-card" style="border-color:#16A34A40">
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
    <div class="s-card" style="border-color:${rentNum >= 0 ? "#16A34A40" : "#EF444440"}">
      <div class="s-label">Rentabilidad</div>
      <div class="s-value" style="color:${rentNum >= 0 ? "#16A34A" : "#EF4444"}">${rentNum >= 0 ? "+" : ""}${params.rentabilidad}%</div>
    </div>
  </div>
  <div class="summary-note">${totalPorCobrar > 0 ? `Los ingresos incluyen ${fmt(totalPorCobrar)} aún por cobrar` : "&nbsp;"}</div>`
  }

  <!-- POR PERÍODO (solo informe general — sin sentido en estado de cuenta) -->
  ${
    !esCuentaCliente && params.periodos.length > 0
      ? `
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
  </table>`
      : ""
  }

  <!-- INGRESOS DETALLE -->
  ${
    params.ingresosDetalle.length > 0
      ? `
  <div class="section-title">${esCuentaCliente ? "Detalle de servicios" : "Ingresos del período"} (${params.ingresosDetalle.length})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Cliente</th><th>Descripción</th><th>Estado</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>
      ${filasIngresos}
      <tr class="total-tr">
        <td colspan="5">Total</td>
        <td class="right green">${fmt(params.totalIngresos)}</td>
      </tr>
    </tbody>
  </table>
  ${params.ingresosDetalle.length > MAX_FILAS ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando los primeros ${MAX_FILAS} de ${params.ingresosDetalle.length} registros</div>` : ""}
  `
      : ""
  }

  <!-- GASTOS DETALLE -->
  ${
    params.gastosDetalle.length > 0
      ? `
  <div class="section-title">Gastos del período (${params.gastosDetalle.length})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Descripción</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>
      ${filasGastos}
      <tr class="total-tr">
        <td colspan="3">Total</td>
        <td class="right red">${fmt(params.totalGastos)}</td>
      </tr>
    </tbody>
  </table>
  ${params.gastosDetalle.length > MAX_FILAS ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando los primeros ${MAX_FILAS} de ${params.gastosDetalle.length} registros</div>` : ""}
  `
      : ""
  }

  <div class="footer">Generado con TruckBook</div>
</div>
</body>
</html>`;
}

export default function FinanzasGenerales() {
  const { colors, isDark } = useTheme();
  const c = colors;
  const { placa: placaActual } = useVehiculoStore();

  const [exportando, setExportando] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [view, setView] = useState<ViewType>("meses");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectingDate, setSelectingDate] = useState<"inicio" | "fin">(
    "inicio",
  );
  const [calendarTarget, setCalendarTarget] = useState<"main" | "export">(
    "main",
  );

  // Estado del modal de exportación
  type PeriodoRapido =
    | "semana"
    | "mes"
    | "mes_anterior"
    | "trimestre"
    | "año"
    | "personalizado";
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>("mes");
  const [exportCliente, setExportCliente] = useState<string | null>(null);
  const [clienteInputFocused, setClienteInputFocused] = useState(false);
  const [exportRango, setExportRango] = useState<{
    inicio: string;
    fin: string;
  }>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return {
      inicio: `${y}-${m}-01`,
      fin: `${y}-${m}-${String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
    };
  });

  const calcularRangoPeriodo = (
    p: PeriodoRapido,
  ): { inicio: string; fin: string } => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (p === "semana") {
      const lunes = new Date(now);
      lunes.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      return { inicio: iso(lunes), fin: iso(domingo) };
    }
    if (p === "mes") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { inicio: iso(first), fin: iso(last) };
    }
    if (p === "mes_anterior") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { inicio: iso(first), fin: iso(last) };
    }
    if (p === "trimestre") {
      const firstMonth = Math.floor(now.getMonth() / 3) * 3;
      const first = new Date(now.getFullYear(), firstMonth, 1);
      const last = new Date(now.getFullYear(), firstMonth + 3, 0);
      return { inicio: iso(first), fin: iso(last) };
    }
    if (p === "año") {
      return {
        inicio: `${now.getFullYear()}-01-01`,
        fin: `${now.getFullYear()}-12-31`,
      };
    }
    return exportRango; // personalizado — mantener lo que ya tiene
  };

  const seleccionarPeriodo = (p: PeriodoRapido) => {
    setPeriodoRapido(p);
    if (p !== "personalizado") setExportRango(calcularRangoPeriodo(p));
  };

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
  // Placas activas para filtrado
  const placasActivas = placaActual ? [placaActual] : [];

  // Los datos ya están en Zustand stores (cargados por DataProvider con realtime).
  // Solo animamos la entrada — no hay que esperar queries.
  useEffect(() => {
    if (!placaActual) return;
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
  }, [placaActual]);

  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  // ── Todos los cálculos memorizados — solo se recalculan cuando cambian los datos o filtros ──
  const {
    gastosPorPlaca,
    ingresosPorPlaca,
    gastosFiltrados,
    ingresosFiltrados,
    allKeys,
    chartGastosData,
    chartIngresosData,
    totalGastos,
    totalIngresos,
    balance,
    rentabilidad,
    formattedLabels,
  } = React.useMemo(() => {
    const placasSet = new Set(placasActivas);
    const gPorPlaca = gastos.filter((g) => placasSet.has(g.placa));
    const iPorPlaca = ingresos.filter((i) => placasSet.has(i.placa));

    const gTransf = gPorPlaca.map((g) => ({ fecha: g.fecha, value: g.monto }));
    const iTransf = iPorPlaca.map((i) => ({
      fecha: i.fecha,
      value: i.monto * ((i as any).cantidad ?? 1),
    }));

    const gFilt = filtrarPorRango(gTransf, rango.inicio, rango.fin);
    const iFilt = filtrarPorRango(iTransf, rango.inicio, rango.fin);

    const sliceLen = view === "dias" ? 10 : view === "meses" ? 7 : 4;
    const keyFn = (item: { fecha: string }) => item.fecha?.slice(0, sliceLen);

    const groupedG = groupBy(gFilt, keyFn);
    const groupedI = groupBy(iFilt, keyFn);

    const keys = Array.from(
      new Set([...Object.keys(groupedG), ...Object.keys(groupedI)]),
    ).sort();

    const chartG = keys.map((k) => {
      const v = Number(groupedG[k]);
      return isFinite(v) ? v : 0;
    });
    const chartI = keys.map((k) => {
      const v = Number(groupedI[k]);
      return isFinite(v) ? v : 0;
    });

    const totG = chartG.reduce((a, b) => a + b, 0);
    const totI = chartI.reduce((a, b) => a + b, 0);
    const bal = totI - totG;
    const rent = totI === 0 ? 0 : ((bal / totI) * 100).toFixed(1);

    const labels =
      keys.length > 0 ? keys.map((k) => formatLabel(k, view)) : ["Sin datos"];

    return {
      gastosPorPlaca: gPorPlaca,
      ingresosPorPlaca: iPorPlaca,
      gastosFiltrados: gFilt,
      ingresosFiltrados: iFilt,
      allKeys: keys,
      chartGastosData: chartG,
      chartIngresosData: chartI,
      totalGastos: totG,
      totalIngresos: totI,
      balance: bal,
      rentabilidad: rent,
      formattedLabels: labels,
    };
  }, [
    gastos,
    ingresos,
    placasActivas.join(","),
    rango.inicio,
    rango.fin,
    view,
  ]);

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  };

  const openCalendar = (
    type: "inicio" | "fin",
    target: "main" | "export" = "main",
  ) => {
    setSelectingDate(type);
    setCalendarTarget(target);
    setCalendarVisible(true);
  };

  // Contenido del calendario, reutilizado por el selector de la pantalla
  // principal (Modal propio) y por el modal de exportar (overlay interno —
  // en iOS no se puede montar un segundo Modal sobre el de exportar).
  const renderCalendarSheet = () => (
    <TouchableOpacity
      style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
      activeOpacity={1}
      onPress={() => setCalendarVisible(false)}>
      <TouchableOpacity activeOpacity={1}>
        <View style={[styles.calendarModal, { backgroundColor: c.modalBg }]}>
          <View style={[styles.modalHandle, { backgroundColor: c.textMuted }]} />
          <Text style={[styles.modalTitle, { color: c.text }]}>
            fecha {selectingDate === "inicio" ? "inicial" : "final"}
          </Text>
          <Calendar
            current={
              calendarTarget === "export"
                ? selectingDate === "inicio"
                  ? exportRango.inicio
                  : exportRango.fin
                : selectingDate === "inicio"
                  ? rango.inicio
                  : rango.fin
            }
            onDayPress={(day: any) => {
              if (calendarTarget === "export") {
                setExportRango((prev) => ({
                  ...prev,
                  [selectingDate]: day.dateString,
                }));
                setPeriodoRapido("personalizado");
              } else {
                setRango((prev) => ({
                  ...prev,
                  [selectingDate]: day.dateString,
                }));
              }
              setCalendarVisible(false);
            }}
            markedDates={
              calendarTarget === "export"
                ? {
                    [exportRango.inicio]: {
                      selected: selectingDate === "inicio",
                      selectedColor: c.accent,
                    },
                    [exportRango.fin]: {
                      selected: selectingDate === "fin",
                      selectedColor: c.accent,
                    },
                  }
                : {
                    [rango.inicio]: {
                      selected: selectingDate === "inicio",
                      selectedColor: c.accent,
                    },
                    [rango.fin]: {
                      selected: selectingDate === "fin",
                      selectedColor: c.accent,
                    },
                  }
            }
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
    </TouchableOpacity>
  );

  const generarPDF = async () => {
    if (exportando) return;
    // Normalizar rango invertido (Desde > Hasta filtraba a vacío → "Sin datos")
    const r =
      exportRango.inicio <= exportRango.fin
        ? exportRango
        : { inicio: exportRango.fin, fin: exportRango.inicio };
    const gastosDetalle = exportCliente
      ? []
      : gastosPorPlaca.filter((g) => g.fecha >= r.inicio && g.fecha <= r.fin);
    const getClienteIngreso = (i: any): string | null => {
      if (i.cliente) return i.cliente;
      const desc: string = i.descripcion || "";
      const parte = desc.replace(/\[TEL:[^\]]*\]/g, "").split(" · ")[0].trim();
      return parte.length > 1 ? parte : null;
    };
    // Comparación insensible a mayúsculas y espacios (también dobles/invisibles:
    // "h&h  ingenieros" encuentra "H&H Ingenieros")
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const clienteBuscado = exportCliente ? norm(exportCliente) : null;
    // Un mismo cliente puede estar guardado en el campo `cliente` (registros
    // nuevos) o solo al inicio de la descripción (facturas escaneadas, registros
    // viejos, cuentas de cobro). Cotejar AMBOS para no dejar ingresos fuera.
    const coincideCliente = (i: any): boolean => {
      if (clienteBuscado === null) return true;
      const cands: string[] = [];
      if (i.cliente) cands.push(norm(String(i.cliente)));
      const desc = String(i.descripcion || "").replace(/\[TEL:[^\]]*\]/g, "");
      const seg = desc.split(" · ")[0].trim();
      if (seg) cands.push(norm(seg));
      return cands.includes(clienteBuscado);
    };
    const ingresosDetalle = ingresosPorPlaca.filter(
      (i) => i.fecha >= r.inicio && i.fecha <= r.fin && coincideCliente(i),
    );
    // Nombre real del cliente (con sus mayúsculas) para el PDF
    const clienteReal = exportCliente
      ? ingresosDetalle.length > 0
        ? getClienteIngreso(ingresosDetalle[0])
        : exportCliente
      : null;
    if (gastosDetalle.length === 0 && ingresosDetalle.length === 0) {
      Alert.alert(
        "Sin datos",
        exportCliente
          ? `No hay ingresos de "${exportCliente}" en el período seleccionado.`
          : "No hay transacciones en el período seleccionado.",
      );
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("No disponible", "Tu dispositivo no soporta compartir archivos.");
      return;
    }

    const gFilt = gastosDetalle.map((g) => ({
      fecha: g.fecha,
      value: g.monto,
    }));
    const iFilt = ingresosDetalle.map((i) => ({
      fecha: i.fecha,
      value: i.monto * ((i as any).cantidad ?? 1),
    }));
    // Rangos cortos (≤31 días) se agrupan por día; antes siempre por mes,
    // así que exportar "Esta semana" daba una sola fila mensual
    const diasRango = Math.round(
      (new Date(r.fin + "T12:00:00").getTime() -
        new Date(r.inicio + "T12:00:00").getTime()) /
        86_400_000,
    );
    const keyLen = diasRango <= 31 ? 10 : 7;
    const gGrp = groupBy(gFilt, (g) => g.fecha.slice(0, keyLen));
    const iGrp = groupBy(iFilt, (i) => i.fecha.slice(0, keyLen));
    const keys = Array.from(
      new Set([...Object.keys(gGrp), ...Object.keys(iGrp)]),
    ).sort();
    const ingPeriodo = keys.map((k) => Number(iGrp[k]) || 0);
    const gasPeriodo = keys.map((k) => Number(gGrp[k]) || 0);
    const totIng = ingPeriodo.reduce((a, b) => a + b, 0);
    const totGas = gasPeriodo.reduce((a, b) => a + b, 0);
    const bal = totIng - totGas;
    const rent = totIng === 0 ? "0" : ((bal / totIng) * 100).toFixed(1);

    setExportando(true);
    setExportModal(false);
    try {
      const html = generarReporteHTML({
        placas: placasActivas,
        rangoInicio: r.inicio,
        rangoFin: r.fin,
        totalIngresos: totIng,
        totalGastos: totGas,
        balance: bal,
        rentabilidad: rent,
        periodos: keys,
        ingresosPorPeriodo: ingPeriodo,
        gastosPorPeriodo: gasPeriodo,
        gastosDetalle,
        ingresosDetalle,
        view: diasRango <= 31 ? "dias" : "meses",
        clienteFiltro: clienteReal,
      });

      await new Promise((res) => setTimeout(res, 600));

      const { uri } = await Promise.race([
        Print.printToFileAsync({ html, base64: false }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000),
        ),
      ]);

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: clienteReal
          ? `Estado de cuenta — ${clienteReal}`
          : "Compartir informe financiero",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      const msg = err?.message === "timeout"
        ? "La generación tardó demasiado. Intenta con un rango de fechas más corto."
        : `No se pudo generar el informe: ${err?.message ?? "error desconocido"}`;
      Alert.alert("Error al exportar", msg);
    } finally {
      setExportando(false);
    }
  };

  if (!placaActual) {
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
              <Image
                source={require("../../assets/icons/report.webp")}
                style={{ width: 64, height: 64 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              Sin vehículo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
              Ve a Cuenta y selecciona una placa para ver tus finanzas
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
                Finanzas
              </Text>
            </View>
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
          </View>
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
            <ChartComparativa
              labels={formattedLabels}
              ingresosData={chartIngresosData}
              gastosData={chartGastosData}
              animatedStyle={{ opacity: chartOpacity, translateY: chartTransY }}
            />

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

            {/* BOTÓN EXPORTAR */}
            <TouchableOpacity
              style={[styles.exportarBtn, { backgroundColor: c.accent }]}
              onPress={() => {
                seleccionarPeriodo("mes");
                setExportCliente(null);
                setExportModal(true);
              }}
              disabled={exportando}
              activeOpacity={0.8}>
              {exportando ? (
                <ActivityIndicator size="small" color={c.accentText} />
              ) : (
                <>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={c.accentText}
                  />
                  <Text
                    style={[styles.exportarBtnText, { color: c.accentText }]}>
                    Exportar informe
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL EXPORTAR */}
      <Modal
        visible={exportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
            activeOpacity={1}
            onPress={() => setExportModal(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View
                style={[styles.exportModalSheet, { backgroundColor: c.modalBg }]}>
              <View
                style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
              />
              <View style={styles.exportModalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Exportar informe
                </Text>
                <TouchableOpacity onPress={() => setExportModal(false)}>
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </TouchableOpacity>
              </View>

              {/* OPCIONES RÁPIDAS */}
              <Text style={[styles.exportSectionLabel, { color: c.textMuted, textTransform: "none" }]}>
                Período
              </Text>
              <View style={styles.periodosGrid}>
                {(
                  [
                    { key: "semana", label: "Esta semana" },
                    { key: "mes", label: "Este mes" },
                    { key: "mes_anterior", label: "Mes anterior" },
                    { key: "trimestre", label: "Trimestre" },
                    { key: "año", label: "Este año" },
                    { key: "personalizado", label: "Personalizado" },
                  ] as { key: PeriodoRapido; label: string }[]
                ).map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.periodoChip,
                      { borderColor: c.border, backgroundColor: c.cardBg },
                      periodoRapido === key && {
                        backgroundColor: c.accent,
                        borderColor: c.accent,
                      },
                    ]}
                    onPress={() => seleccionarPeriodo(key)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.periodoChipText,
                        { color: c.textSecondary },
                        periodoRapido === key && { color: c.accentText },
                      ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* RANGO PERSONALIZADO */}
              <View
                style={[
                  styles.exportRangeRow,
                  { backgroundColor: c.cardBg, borderColor: c.border },
                ]}>
                <TouchableOpacity
                  style={styles.exportDateBtn}
                  onPress={() => openCalendar("inicio", "export")}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.exportDateLabel, { color: c.textMuted }]}>
                    Desde
                  </Text>
                  <Text style={[styles.exportDateValue, { color: c.text }]}>
                    {new Date(
                      exportRango.inicio + "T12:00:00",
                    ).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color={c.textMuted} />
                <TouchableOpacity
                  style={styles.exportDateBtn}
                  onPress={() => openCalendar("fin", "export")}
                  activeOpacity={0.7}>
                  <Text
                    style={[styles.exportDateLabel, { color: c.textMuted }]}>
                    Hasta
                  </Text>
                  <Text style={[styles.exportDateValue, { color: c.text }]}>
                    {new Date(exportRango.fin + "T12:00:00").toLocaleDateString(
                      "es-CO",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* FILTRO CLIENTE */}
              {(() => {
                const getCliente = (i: any): string | null => {
                  if (i.cliente) return i.cliente;
                  const desc: string = i.descripcion || "";
                  const parte = desc.replace(/\[TEL:[^\]]*\]/g, "").split(" · ")[0].trim();
                  return parte.length > 1 ? parte : null;
                };
                const clientesDisponibles = Array.from(
                  new Set(
                    ingresosPorPlaca
                      .map(getCliente)
                      .filter((v): v is string => !!v),
                  ),
                ).sort();
                const texto = exportCliente ?? "";
                const sugerencias = clienteInputFocused && texto.length >= 2
                  ? clientesDisponibles.filter((cli) =>
                      cli.toLowerCase().includes(texto.toLowerCase()),
                    )
                  : [];
                return (
                  <>
                    <Text style={[styles.exportSectionLabel, { color: c.textMuted, marginTop: 14, textTransform: "none" }]}>
                      Filtrar por cliente (opcional)
                    </Text>
                    <TextInput
                      style={[
                        styles.exportClienteInput,
                        { backgroundColor: c.cardBg, borderColor: exportCliente ? c.accent : c.border, color: c.text },
                      ]}
                      placeholder="Escribe el nombre del cliente..."
                      placeholderTextColor={c.textMuted}
                      value={texto}
                      onChangeText={(t) => {
                        // Misma sanitización que al guardar el cliente
                        // (sanitizarInput en Ingresos): solo se quitan < > { } [ ].
                        // Nombres como "H&H" o "López & Cía" deben poder buscarse;
                        // el PDF escapa estos caracteres al renderizar.
                        const limpio = t.replace(/[<>{}[\]]/g, "").slice(0, 80);
                        setExportCliente(limpio.length > 0 ? limpio : null);
                      }}
                      onFocus={() => setClienteInputFocused(true)}
                      onBlur={() => setTimeout(() => setClienteInputFocused(false), 150)}
                      returnKeyType="done"
                    />
                    {sugerencias.length > 0 && (
                      <View style={[styles.exportSugerencias, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                        {sugerencias.slice(0, 5).map((cli) => (
                          <TouchableOpacity
                            key={cli}
                            style={[styles.exportSugerenciaItem, { borderBottomColor: c.border }]}
                            onPress={() => { setExportCliente(cli); setClienteInputFocused(false); }}
                            activeOpacity={0.7}>
                            <Text style={{ color: c.text, fontSize: 14 }}>{cli}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}

              {/* BOTÓN GENERAR */}
              <TouchableOpacity
                style={[styles.exportGenerarBtn, { backgroundColor: c.accent }]}
                onPress={generarPDF}
                activeOpacity={0.85}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={c.accentText}
                />
                <Text
                  style={[styles.exportGenerarText, { color: c.accentText }]}>
                  Generar PDF
                </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Calendario como overlay DENTRO del modal de exportar */}
          {calendarVisible && calendarTarget === "export" && (
            <View style={StyleSheet.absoluteFill}>{renderCalendarSheet()}</View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL CALENDARIO — solo para el selector de la pantalla principal.
          En el modal de exportar el calendario se renderiza como overlay
          interno (iOS no monta un segundo Modal sobre otro). */}
      <Modal
        visible={calendarVisible && calendarTarget === "main"}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        {renderCalendarSheet()}
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
  placaBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  exportarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  exportarBtnText: { fontSize: 15, fontWeight: "600" },

  // SCROLL
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 110 },

  // EMPTY STATE
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
    borderRadius: 28,
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

  // CHART — moved to ChartComparativa component

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

  // MODAL EXPORTAR
  exportModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  exportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exportSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  exportClienteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
  },
  exportSugerencias: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  exportSugerenciaItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  periodoChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodoChipText: { fontSize: 13, fontWeight: "600" },
  exportRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  exportDateBtn: { flex: 1, alignItems: "center" },
  exportDateLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  exportDateValue: { fontSize: 14, fontWeight: "600" },
  exportGenerarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  exportGenerarText: { fontSize: 16, fontWeight: "700" },

  // MODAL CALENDARIO
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
