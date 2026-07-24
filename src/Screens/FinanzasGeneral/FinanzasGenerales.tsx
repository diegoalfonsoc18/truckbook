import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Keyboard,
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
import { useFocusEffect } from "@react-navigation/native";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore, type Gasto } from "../../store/GastosStore";
import { useIngresosStore, type Ingreso } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { useAuth } from "../../hooks/useAuth";
import { fetchTransaccionesRango } from "../../services/reporteService";
import { Calendar } from "react-native-calendars";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { Ionicons } from "@expo/vector-icons";
import ChartComparativa from "./components/ChartComparativa";
import ChipsCategoria from "./components/ChipsCategoria";
import ModalExportar, { type PeriodoRapido } from "./components/ModalExportar";
import { generarReporteHTML } from "./reporteHTML";
import {
  CATEGORIAS_EXPORT,
  HORIZONTAL_PADDING,
  esPendiente,
  filtrarPorRango,
  formatCurrency,
  formatLabel,
  groupBy,
  type EstadoFiltro,
  type ViewType,
} from "./finanzasUtils";

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

  // Estado del modal de exportación (el tipo vive en ModalExportar)
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>("mes");
  const [exportCliente, setExportCliente] = useState<string | null>(null);
  // Filtro por categoría (tipo_gasto o tipo_ingreso) — null = todas
  const [exportCategoria, setExportCategoria] = useState<string | null>(null);
  // Estado de las cuentas a exportar. null = ambas (por cobrar + pagadas).
  const [exportEstado, setExportEstado] = useState<EstadoFiltro>(null);
  // Filtro de categoría de la PANTALLA (independiente del que usa el export).
  // null = todas.
  const [catPantalla, setCatPantalla] = useState<string | null>(null);
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

  const { user } = useAuth();
  // Store en vivo (tope 200 recientes) — solo para fallback offline y sugerencias
  const gastosStore = useGastosStore(useShallow((state) => state.gastos));
  const ingresosStore = useIngresosStore(useShallow((state) => state.ingresos));

  // Sugerencias de cliente para el modal de exportar. Salen del store en vivo
  // (clientes recientes) y no del rango en pantalla, así aparecen aunque el
  // rango sea corto.
  const clientesDisponibles = useMemo(() => {
    const nombre = (i: (typeof ingresosStore)[number]): string | null => {
      if (i.cliente) return i.cliente;
      const parte = (i.descripcion || "")
        .replace(/\[TEL:[^\]]*\]/g, "")
        .split(" · ")[0]
        .trim();
      return parte.length > 1 ? parte : null;
    };
    return Array.from(
      new Set(
        ingresosStore
          .filter((i) => i.placa === placaActual)
          .map(nombre)
          .filter((v): v is string => !!v),
      ),
    ).sort();
  }, [ingresosStore, placaActual]);

  // Datos del rango consultados directo a Supabase (sin tope de 200). El informe
  // se calcula sobre estos; si la consulta falla (offline), cae al store.
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargandoRango, setCargandoRango] = useState(false);

  const cargarRango = useCallback(async () => {
    if (!placaActual || !user?.id) return;
    setCargandoRango(true);
    const res = await fetchTransaccionesRango(
      placaActual,
      user.id,
      rango.inicio,
      rango.fin,
    );
    if (res.error) {
      // Sin conexión: usar el caché del store (recorta a 200, pero muestra algo)
      setGastos(useGastosStore.getState().gastos);
      setIngresos(useIngresosStore.getState().ingresos);
    } else {
      setGastos(res.gastos);
      setIngresos(res.ingresos);
    }
    setCargandoRango(false);
  }, [placaActual, user?.id, rango.inicio, rango.fin]);

  // Recargar al enfocar la pantalla y cuando cambian placa/rango (así refleja
  // registros nuevos al volver a Reportes, sin depender del realtime del store)
  useFocusEffect(
    useCallback(() => {
      cargarRango();
    }, [cargarRango]),
  );

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
    totalPorCobrar,
    balance,
    rentabilidad,
    formattedLabels,
  } = React.useMemo(() => {
    const placasSet = new Set(placasActivas);
    // Filtro por categoría: una categoría de gasto vacía los ingresos y
    // viceversa, igual que hace el export (así las tarjetas y el gráfico
    // quedan enfocados en ese único rubro).
    const catMetaPantalla = catPantalla
      ? CATEGORIAS_EXPORT.find((cc) => cc.tipo === catPantalla)
      : null;
    const gPorPlaca = gastos
      .filter((g) => placasSet.has(g.placa))
      .filter(
        (g) =>
          !catPantalla ||
          (catMetaPantalla?.grupo === "gasto" && g.tipo_gasto === catPantalla),
      );
    const iPorPlaca = ingresos
      .filter((i) => placasSet.has(i.placa))
      .filter(
        (i) =>
          !catPantalla ||
          (catMetaPantalla?.grupo === "ingreso" &&
            i.tipo_ingreso === catPantalla),
      );

    const gTransf = gPorPlaca.map((g) => ({ fecha: g.fecha, value: g.monto }));
    const iTransf = iPorPlaca.map((i) => ({
      fecha: i.fecha,
      value: i.monto * ((i as any).cantidad ?? 1),
      pendiente: i.estado === "pendiente",
    }));

    const gFilt = filtrarPorRango(gTransf, rango.inicio, rango.fin);
    const iFilt = filtrarPorRango(iTransf, rango.inicio, rango.fin);

    // Criterio de caja: totales, balance y gráfico usan solo lo RECIBIDO;
    // lo pendiente se reporta aparte como "por cobrar".
    const iRecibidos = iFilt.filter((x) => !x.pendiente);
    const porCobrar = iFilt.reduce(
      (a, x) => a + (x.pendiente ? x.value : 0),
      0,
    );

    const sliceLen = view === "dias" ? 10 : view === "meses" ? 7 : 4;
    const keyFn = (item: { fecha: string }) => item.fecha?.slice(0, sliceLen);

    const groupedG = groupBy(gFilt, keyFn);
    const groupedI = groupBy(iRecibidos, keyFn);

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
      totalPorCobrar: porCobrar,
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
    catPantalla,
  ]);

  // Categoría seleccionada en pantalla: define si el resumen se muestra en
  // modo "enfocado" (un solo rubro) o el general de ingresos/gastos/balance.
  const catMetaSel = catPantalla
    ? (CATEGORIAS_EXPORT.find((cc) => cc.tipo === catPantalla) ?? null)
    : null;
  const catEsIngreso = catMetaSel?.grupo === "ingreso";
  const totalCategoria = catEsIngreso ? totalIngresos : totalGastos;
  const movimientosCategoria = catEsIngreso
    ? ingresosFiltrados.length
    : gastosFiltrados.length;

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  };

  const openCalendar = (
    type: "inicio" | "fin",
    target: "main" | "export" = "main",
  ) => {
    // Si el teclado está abierto (input de cliente), cerrarlo — si no, el
    // calendario queda empujado/tapado por el teclado
    Keyboard.dismiss();
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
          <View
            style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
          />
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
    if (!placaActual || !user?.id) return;
    // Normalizar rango invertido (Desde > Hasta filtraba a vacío → "Sin datos")
    const r =
      exportRango.inicio <= exportRango.fin
        ? exportRango
        : { inicio: exportRango.fin, fin: exportRango.inicio };

    setExportando(true);
    // Consulta puntual del rango de export (sin tope de 200): un informe anual
    // o de rango amplio ya no se queda corto por el caché del store.
    let datos = await fetchTransaccionesRango(
      placaActual,
      user.id,
      r.inicio,
      r.fin,
    );

    // Sin conexión: el PDF se arma en el dispositivo (expo-print no necesita
    // internet), lo único que falta son los datos. Caemos al caché local igual
    // que hace la pantalla — pero avisando, porque el caché está topado en 200
    // filas por placa y un informe incompleto puede terminar donde un cliente.
    let desdeCache = false;
    if (datos.error) {
      const enRango = (f?: string | null) =>
        !!f && f >= r.inicio && f <= r.fin;
      const gCache = useGastosStore
        .getState()
        .gastos.filter(
          (g) =>
            g.placa === placaActual &&
            g.conductor_id === user.id &&
            enRango(g.fecha),
        );
      const iCache = useIngresosStore
        .getState()
        .ingresos.filter(
          (i) =>
            i.placa === placaActual &&
            i.conductor_id === user.id &&
            enRango(i.fecha),
        );

      if (gCache.length === 0 && iCache.length === 0) {
        setExportando(false);
        Alert.alert(
          "Sin conexión",
          "No hay datos guardados en el teléfono para ese período. Conéctate a internet para generar el informe.",
        );
        return;
      }

      const seguir = await new Promise<boolean>((resolve) =>
        Alert.alert(
          "Sin conexión",
          `Puedo generar el informe con los ${gCache.length + iCache.length} movimientos guardados en el teléfono, pero pueden faltar registros. Revísalo antes de enviárselo a alguien.`,
          [
            { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
            { text: "Generar igual", onPress: () => resolve(true) },
          ],
          { cancelable: false },
        ),
      );
      if (!seguir) {
        setExportando(false);
        return;
      }

      datos = { gastos: gCache, ingresos: iCache, error: false };
      desdeCache = true;
    }

    // La consulta ya restringe a placa+conductor y al rango [inicio, fin]
    // Filtro por categoría: si es una categoría de gasto, no incluir ingresos
    // (y viceversa) — así el informe queda enfocado en ese único tipo.
    const catMeta = exportCategoria
      ? CATEGORIAS_EXPORT.find((cc) => cc.tipo === exportCategoria)
      : null;
    const filtrarCat = (tipo: string | null | undefined) =>
      !exportCategoria || tipo === exportCategoria;
    // Filtrar por estado es filtrar la cartera de ingresos, así que los gastos
    // salen del informe — mismo criterio que ya se aplica al elegir una
    // categoría de ingreso. Con "solo por cobrar" además sería engañoso:
    // el balance saldría negativo contra una cartera a medias.
    const gastosDetalle =
      exportCliente || catMeta?.grupo === "ingreso" || exportEstado !== null
        ? []
        : datos.gastos.filter((g) => filtrarCat(g.tipo_gasto));
    const getClienteIngreso = (i: any): string | null => {
      if (i.cliente) return i.cliente;
      const desc: string = i.descripcion || "";
      const parte = desc
        .replace(/\[TEL:[^\]]*\]/g, "")
        .split(" · ")[0]
        .trim();
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
    // Filtro de estado: solo aplica a ingresos (un gasto no se "cobra").
    // Con "solo por cobrar" o "solo pagadas" se excluyen además los gastos:
    // mezclarlos daría un balance sin sentido contra media cartera.
    const filtrarEstado = (i: { estado?: string | null }) =>
      exportEstado === null ||
      (exportEstado === "pendiente" ? esPendiente(i) : !esPendiente(i));
    const ingresosDetalle =
      catMeta?.grupo === "gasto"
        ? []
        : datos.ingresos
            .filter(coincideCliente)
            .filter((i) => filtrarCat(i.tipo_ingreso))
            .filter(filtrarEstado);
    // Nombre real del cliente (con sus mayúsculas) para el PDF
    const clienteReal = exportCliente
      ? ingresosDetalle.length > 0
        ? getClienteIngreso(ingresosDetalle[0])
        : exportCliente
      : null;
    if (gastosDetalle.length === 0 && ingresosDetalle.length === 0) {
      setExportando(false);
      Alert.alert(
        "Sin datos",
        exportEstado
          ? `No hay cuentas ${exportEstado === "pendiente" ? "por cobrar" : "pagadas"} en el período seleccionado.`
          : exportCliente
            ? `No hay ingresos de "${exportCliente}" en el período seleccionado.`
            : exportCategoria
              ? `No hay movimientos de "${exportCategoria}" en el período seleccionado.`
              : "No hay transacciones en el período seleccionado.",
      );
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setExportando(false);
      Alert.alert(
        "No disponible",
        "Tu dispositivo no soporta compartir archivos.",
      );
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

    setExportModal(false);
    try {
      const html = generarReporteHTML({
        placas: placasActivas,
        rangoInicio: r.inicio,
        rangoFin: r.fin,
        totalIngresos: totIng,
        totalGastos: totGas,
        periodos: keys,
        ingresosPorPeriodo: ingPeriodo,
        gastosPorPeriodo: gasPeriodo,
        gastosDetalle,
        ingresosDetalle,
        view: diasRango <= 31 ? "dias" : "meses",
        clienteFiltro: clienteReal,
        categoriaFiltro: exportCategoria,
        categoriaEsGasto: catMeta?.grupo === "gasto",
        estadoFiltro: exportEstado,
        desdeCache,
      });

      await new Promise((res) => setTimeout(res, 600));

      const { uri } = await Promise.race([
        // iOS aplica márgenes de impresión por defecto (~1") que encogen el
        // contenido y lo dejan menos legible que en Android (que no los mete).
        // Ponerlos en 0 iguala iOS a Android; `margins` es no-op en Android.
        Print.printToFileAsync({
          html,
          base64: false,
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
        }),
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
      const msg =
        err?.message === "timeout"
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
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}>
              <Text style={[styles.headerTitle, { color: c.text }]}>
                Finanzas
              </Text>
              {cargandoRango && (
                <ActivityIndicator size="small" color={c.textMuted} />
              )}
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

            {/* FILTRO POR CATEGORÍA */}
            <ChipsCategoria value={catPantalla} onChange={setCatPantalla} />

            {/* CARDS DE RESUMEN - GRID 2 COLUMNAS */}
            {/* Con una categoría activa el resumen se enfoca en ese rubro:
                mostrar "Ingresos $0" y un balance negativo sería engañoso. */}
            {catPantalla ? (
              <View style={styles.summaryGrid}>
                <Reanimated.View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: c.cardBg,
                      borderColor: (catEsIngreso ? c.income : c.expense) + "40",
                    },
                    getShadow(isDark, "sm"),
                    card1Style,
                  ]}>
                  <Text
                    style={[
                      styles.summaryCardLabel,
                      { color: c.textSecondary },
                    ]}
                    numberOfLines={1}>
                    Total {catPantalla}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCardValue,
                      { color: catEsIngreso ? c.income : c.expense },
                    ]}>
                    {formatCurrency(totalCategoria)}
                  </Text>
                  {catEsIngreso && totalPorCobrar > 0 && (
                    <Text style={styles.porCobrarNote} numberOfLines={1}>
                      + {formatCurrency(totalPorCobrar)} por cobrar
                    </Text>
                  )}
                  <Ionicons
                    name={
                      catEsIngreso
                        ? "trending-up-outline"
                        : "trending-down-outline"
                    }
                    size={22}
                    color={catEsIngreso ? c.income : c.expense}
                    style={styles.cardIcon}
                  />
                </Reanimated.View>
                <Reanimated.View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: c.cardBg, borderColor: c.border },
                    getShadow(isDark, "sm"),
                    card2Style,
                  ]}>
                  <Text
                    style={[
                      styles.summaryCardLabel,
                      { color: c.textSecondary },
                    ]}>
                    Movimientos
                  </Text>
                  <Text style={[styles.summaryCardValue, { color: c.text }]}>
                    {movimientosCategoria}
                  </Text>
                  <Ionicons
                    name="receipt-outline"
                    size={22}
                    color={c.textMuted}
                    style={styles.cardIcon}
                  />
                </Reanimated.View>
              </View>
            ) : (
              <View style={styles.summaryGrid}>
                <Reanimated.View
                  style={[
                    styles.summaryCard,
                    { backgroundColor: c.cardBg, borderColor: c.income + "40" },
                    getShadow(isDark, "sm"),
                    card1Style,
                  ]}>
                  <Text
                    style={[
                      styles.summaryCardLabel,
                      { color: c.textSecondary },
                    ]}>
                    Ingresos recibidos
                  </Text>
                  <Text style={[styles.summaryCardValue, { color: c.income }]}>
                    {formatCurrency(totalIngresos)}
                  </Text>
                  {totalPorCobrar > 0 && (
                    <Text style={styles.porCobrarNote} numberOfLines={1}>
                      + {formatCurrency(totalPorCobrar)} por cobrar
                    </Text>
                  )}
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
                    {
                      backgroundColor: c.cardBg,
                      borderColor: c.expense + "40",
                    },
                    getShadow(isDark, "sm"),
                    card2Style,
                  ]}>
                  <Text
                    style={[
                      styles.summaryCardLabel,
                      { color: c.textSecondary },
                    ]}>
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
            )}

            {/* BALANCE CARD — solo sin filtro de categoría: un balance de un
                único rubro (gastos sin ingresos, o al revés) no significa nada */}
            {!catPantalla && (
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
                  <Text
                    style={[styles.balanceLabel, { color: c.textSecondary }]}>
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
                          color:
                            Number(rentabilidad) >= 0 ? c.income : c.expense,
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
              </Reanimated.View>
            )}

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
                setExportCategoria(null);
                setExportEstado(null);
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
      <ModalExportar
        visible={exportModal}
        onClose={() => setExportModal(false)}
        periodoRapido={periodoRapido}
        onPeriodo={seleccionarPeriodo}
        rango={exportRango}
        onAbrirCalendario={(campo) => openCalendar(campo, "export")}
        cliente={exportCliente}
        onCliente={setExportCliente}
        clientesDisponibles={clientesDisponibles}
        estado={exportEstado}
        onEstado={setExportEstado}
        categoria={exportCategoria}
        onCategoria={setExportCategoria}
        onGenerar={generarPDF}
        slotCalendario={
          calendarVisible && calendarTarget === "export"
            ? renderCalendarSheet()
            : null
        }
      />

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
  porCobrarNote: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F59E0B",
    marginTop: 2,
  },
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
  // Chips de estado de cuenta. Son 3 opciones fijas y excluyentes, así que van
  // en una fila que reparte el ancho, no en un scroll horizontal.
  // Chips de categoría de la pantalla (mismo look que los del export, algo
  // más compactos porque van sobre las tarjetas de resumen).
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
