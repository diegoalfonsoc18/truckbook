import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Linking,
} from "react-native";
import Svg, { Path, Circle, Line, G, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText, Rect } from "react-native-svg";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import supabase from "../../config/SupaBaseConfig";
import {
  cargarVehiculosConEstado,
  registrarVehiculoPropietario,
  removerConductorDeVehiculo,
  type EstadoAutorizacion,
} from "../../services/vehiculoAutorizacionService";
import { useTheme, TYPOGRAPHY, getShadow } from "../../constants/Themecontext";
import ItemIcon, { IconName } from "../../components/ItemIcon";
import { HOME_COLORS } from "./HomeConstants";
import { useClima } from "../../hooks/useClima";
import { ClimaIconMap, TermometroIcon } from "../../assets/icons/icons";
import { usePicoYPlaca } from "../../hooks/usePicoYPlaca";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import logger from "../../utils/logger";
import {
  calcularPorCobrar,
  calcularPorPagar,
  resumirPendientes,
  formatCOP as formatCOPPendientes,
  COLORES_ESTADO_COBRO,
  COLORES_ESTADO_PAGO,
  LABELS_COBRO,
  LABELS_PAGO,
  PorCobrar,
  PorPagar,
} from "../../services/pendientesService";
import {
  generarInsights,
  InsightsPendientes,
} from "../../services/insightsService";
import { programarRecordatoriosPendientes } from "../../services/pendientesNotificacionService";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const { width } = Dimensions.get("window");
const H_PAD = 20;
// Tamaño responsivo: 2 widgets + 1 gap de 16 + padding horizontal
const WIDGET_SIZE = Math.floor((width - H_PAD * 2 - 16) / 2);
const WIDGET_HEIGHT = 160;

import type { Item } from "./Items";
export type { Item } from "./Items";

interface HomeBaseAdaptedProps {
  items: Item[];
  showCamionHeader?: boolean;
  vehicleCardTitle?: string;
  renderBadge?: (item: Item) => React.ReactNode;
  onItemPress?: (item: Item) => void;
}

interface Vehiculo {
  id: string;
  placa: string;
  tipo_camion: TipoCamion;
  estado?: EstadoAutorizacion;
  rol?: string;
  conductorNombre?: string;
}

const ICON_MAP: Record<TipoCamion, IconName> = {
  estacas: "estacas",
  volqueta: "volqueta2",
  furgon: "furgon",
  grua: "grua",
  cisterna: "cisterna",
  planchon: "planchon",
  portacontenedor: "portaContenedor",
};

const VALID_TIPOS = new Set<string>(Object.keys(ICON_MAP));

/** Normaliza el valor que llega del DB a un TipoCamion válido */
function normalizarTipo(raw: string | null | undefined): TipoCamion {
  if (!raw) return "estacas";
  const lower = raw.toLowerCase().trim();
  return VALID_TIPOS.has(lower) ? (lower as TipoCamion) : "estacas";
}

const TIPOS_CAMION = [
  {
    id: "estacas" as TipoCamion,
    label: "Estacas",
    iconName: "estacas" as IconName,
    color: HOME_COLORS.trucks.estacas,
  },
  {
    id: "volqueta" as TipoCamion,
    label: "Volqueta",
    iconName: "volqueta2" as IconName,
    color: HOME_COLORS.trucks.volqueta,
  },
  {
    id: "furgon" as TipoCamion,
    label: "Furgón",
    iconName: "furgon" as IconName,
    color: HOME_COLORS.trucks.furgon,
  },
  {
    id: "grua" as TipoCamion,
    label: "Grúa",
    iconName: "grua" as IconName,
    color: HOME_COLORS.trucks.grua,
  },
  {
    id: "cisterna" as TipoCamion,
    label: "Cisterna",
    iconName: "cisterna" as IconName,
    color: HOME_COLORS.trucks.cisterna,
  },
  {
    id: "planchon" as TipoCamion,
    label: "Planchón",
    iconName: "planchon" as IconName,
    color: HOME_COLORS.trucks.planchon,
  },
  {
    id: "portacontenedor" as TipoCamion,
    label: "Porta cont.",
    iconName: "portaContenedor" as IconName,
    color: HOME_COLORS.trucks.portacontenedor,
  },
];

// ─── Sizes ────────────────────────────────────────────────────────────────────
const ICON_BG = Platform.OS === "android" ? 62 : 70;
const ICON_CORE = Platform.OS === "android" ? 46 : 52;
const ICON_MAX = Platform.OS === "android" ? 46 : 52;

// ─── Fecha local YYYY-MM-DD (no UTC) ─────────────────────────────────────────
function fechaLocalHoy(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Currency formatter (pesos colombianos) ───────────────────────────────────
function formatCOP(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Widget helpers ───────────────────────────────────────────────────────────
interface WProps {
  isDark: boolean;
}

const WBG = (d: boolean) => (d ? "#1C1C1E" : "#f7f7f7");
const MUTED = (d: boolean) => (d ? "#94A3B8" : "#6B7280");
const INK = (d: boolean) => (d ? "#FFFFFF" : "#111827");

const CLIMA_BG: Record<string, { light: string; dark: string }> = {
  soleado: { light: "#FFF3C4", dark: "#3D2E00" },
  nubeYSol: { light: "#FFF9E6", dark: "#2E2A1A" },
  nube: { light: "#E8EDF2", dark: "#1E2530" },
  lluvioso: { light: "#DCE9F7", dark: "#0D1E33" },
  tormenta: { light: "#DDD8F0", dark: "#1A1530" },
  copoDeNieve: { light: "#E8F4FB", dark: "#0D1E2E" },
  termometro: { light: "#F2F2F2", dark: "#1C1C1E" },
};

function getClimaBg(icono: string, isDark: boolean): string {
  const entry = CLIMA_BG[icono] ?? CLIMA_BG["termometro"];
  return isDark ? entry.dark : entry.light;
}

// ─── Widget: Clima ────────────────────────────────────────────────────────────
function WidgetClima({ isDark }: WProps) {
  const {
    temperatura,
    icono,
    condicion,
    ciudad,
    manana,
    tarde,
    noche,
    cargando,
    error,
    sinPermiso,
  } = useClima();
  const { colors: c } = useTheme();

  const bg =
    sinPermiso || error || cargando ? WBG(isDark) : getClimaBg(icono, isDark);

  return (
    <View style={[s.wCard, { backgroundColor: bg }]}>
      {cargando ? (
        <ActivityIndicator size="small" color={c.accent} />
      ) : sinPermiso || error ? (
        <>
          {sinPermiso ? (
            <Ionicons name="location-outline" size={32} color={INK(isDark)} />
          ) : (
            <TermometroIcon width={32} height={32} color={INK(isDark)} />
          )}
          <Text style={[s.wCardSub, { color: MUTED(isDark) }]}>
            {sinPermiso ? "Ubicación\ndenegada" : "Sin señal"}
          </Text>
        </>
      ) : (
        <>
          <View style={s.wCardTopRow}>
            <Text style={[s.wCardTempBig, { color: INK(isDark) }]}>
              {temperatura}°
            </Text>
            {React.createElement(ClimaIconMap[icono], {
              width: 44,
              height: 44,
              color: INK(isDark),
            })}
          </View>

          {/* Condición */}
          <Text
            style={[s.wCardCondicion, { color: INK(isDark) }]}
            numberOfLines={1}>
            {condicion}
          </Text>

          {/* Ciudad */}
          <Text
            style={[s.wCardLabel, { color: MUTED(isDark) }]}
            numberOfLines={1}>
            {ciudad}
          </Text>

          {/* Pronóstico mañana / tarde / noche */}
          <View style={s.wCardForecastRow}>
            {[
              { label: "Mañana", periodo: manana },
              { label: "Tarde", periodo: tarde },
              { label: "Noche", periodo: noche },
            ].map(({ label, periodo }) => (
              <View key={label} style={s.wCardForecastItem}>
                <Text style={[s.wCardForecastLabel, { color: MUTED(isDark) }]}>
                  {label}
                </Text>
                {React.createElement(ClimaIconMap[periodo.icono], {
                  width: 14,
                  height: 14,
                  color: INK(isDark),
                })}
                <Text style={[s.wCardForecastTemp, { color: INK(isDark) }]}>
                  {periodo.temp}°
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Gauge estilo "Threat Level" ─────────────────────────────────────────────
// Arco amplio ~220°, gradiente rojo→amarillo→verde, ticks, dot brillante.
// Fondo siempre oscuro (dashboard feel).
function GaugeBalance({
  ratio,
  isDark,
  balance,
  totalI,
  totalG,
  balSem,
}: {
  ratio: number;
  isDark: boolean;
  balance: number;
  balColor: string;
  totalI: number;
  totalG: number;
  balSem: number;
}) {
  const W  = WIDGET_SIZE;
  const H  = WIDGET_HEIGHT;
  const CX = W / 2;

  // Geometría: R calibrado para que el arco vaya de borde a borde,
  // pico en y≈22, extremos en y≈108.
  const R   = 62;
  const CY  = 87;   // pico en y = CY - R = 25 ✓; extremos en y ≈ CY + R*sin(20°) = 108 ✓

  const START = 160; // grado inicio (izq-abajo)
  const SPAN  = 220; // barrido total clockwise → fin en 380°=20° (der-abajo)
  const FILL_W = 8;  // grosor arco gradiente

  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r = R) => ({
    x: CX + r * Math.cos(deg2rad(deg)),
    y: CY + r * Math.sin(deg2rad(deg)),
  });

  // Path de arco clockwise
  const arcPath = (fromDeg: number, sweep: number, r = R): string => {
    if (sweep < 0.5) return "";
    const s = pt(fromDeg, r);
    const e = pt(fromDeg + sweep, r);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const clamp = (v: number) => Math.max(0.005, Math.min(0.995, v));
  const filled    = clamp(ratio) * SPAN;
  const fillEndDeg = START + filled;
  const dotPt     = pt(fillEndDeg);

  // Gradiente: extremo izquierdo → extremo derecho del arco
  const gradLX = pt(START).x;
  const gradRX = pt(START + SPAN).x;

  // Color del dot según zona
  const dotColor =
    ratio < 0.38 ? "#EF4444"
    : ratio < 0.62 ? "#FFB800"
    : "#22C55E";

  // Estado del balance
  const statusLabel =
    ratio < 0.38 ? "Negativo"
    : ratio < 0.62 ? "Equilibrio"
    : "Positivo";
  const statusColor =
    ratio < 0.38 ? "#F87171"
    : ratio < 0.62 ? "#FBBF24"
    : "#4ADE80";

  // Ticks a lo largo del arco completo (fuera del arco, más cortos)
  const ticks: Array<{ o: {x:number;y:number}; i: {x:number;y:number}; major: boolean }> = [];
  for (let i = 0; i <= SPAN; i += 5) {
    const deg    = START + i;
    const major  = i % 20 === 0;
    const outerR = R + 3;
    const innerR = major ? R + 3 - 9 : R + 3 - 5;
    ticks.push({ o: pt(deg, outerR), i: pt(deg, innerR), major });
  }

  // Formato compacto
  const fmt = (n: number) => {
    const abs  = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${Math.round(abs / 1_000)}K`;
    return `${sign}${abs}`;
  };

  // Posiciones de las etiquetas de extremo del arco
  const leftLbl  = pt(START, R + 18);
  const rightLbl = pt(START + SPAN, R + 18);

  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        {/* Gradiente horizontal — el arco va de izq (rojo) a der (verde) */}
        <SvgGradient id="gfill" x1={gradLX} y1={0} x2={gradRX} y2={0} gradientUnits="userSpaceOnUse">
          <Stop offset="0"    stopColor="#EF4444" />
          <Stop offset="0.42" stopColor="#FFB800" />
          <Stop offset="1"    stopColor="#22C55E" />
        </SvgGradient>
      </Defs>

      {/* ── Fondo oscuro ── */}
      <Rect width={W} height={H} fill="#111318" rx={16} />

      {/* ── Ticks del arco completo ── */}
      {ticks.map((t, idx) => (
        <Line key={idx}
          x1={t.o.x} y1={t.o.y} x2={t.i.x} y2={t.i.y}
          stroke={t.major ? "#3D4258" : "#272B3A"}
          strokeWidth={t.major ? 1.6 : 0.9}
          strokeLinecap="round"
        />
      ))}

      {/* ── Arco con gradiente (porción activa) ── */}
      <Path
        d={arcPath(START, filled)}
        stroke="url(#gfill)"
        strokeWidth={FILL_W}
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Dot brillante en la punta del arco ── */}
      <Circle cx={dotPt.x} cy={dotPt.y} r={13} fill={dotColor} opacity={0.12} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={7}  fill={dotColor} opacity={0.35} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={4}  fill={dotColor} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={2}  fill="#FFFFFF"  opacity={0.85} />

      {/* ── Balance — número grande en el centro del dial ── */}
      <SvgText
        x={CX} y={CY + 8}
        fontSize={26} fontWeight="800"
        fill="#FFFFFF" textAnchor="middle" letterSpacing={-1}>
        {fmt(balance)}
      </SvgText>

      {/* ── Estado (Positivo / Equilibrio / Negativo) ── */}
      <SvgText
        x={CX} y={CY + 23}
        fontSize={10} fontWeight="700"
        fill={statusColor} textAnchor="middle">
        {statusLabel}
      </SvgText>

      {/* ── Zona debajo del arco: Ingresos (izq) y Gastos (der) ── */}
      <SvgText
        x={14} y={H - 28}
        fontSize={9} fontWeight="600"
        fill="#4ADE80" textAnchor="start">
        {`↑ ${fmt(totalI)}`}
      </SvgText>
      <SvgText
        x={W - 14} y={H - 28}
        fontSize={9} fontWeight="600"
        fill="#F87171" textAnchor="end">
        {`↓ ${fmt(totalG)}`}
      </SvgText>

      {/* ── Semana — centrado en la base ── */}
      <SvgText
        x={CX} y={H - 14}
        fontSize={8} fontWeight="500"
        fill="#4B5268" textAnchor="middle">
        {`Sem. ${fmt(balSem)}`}
      </SvgText>
    </Svg>
  );
}

// ─── Widget: Resumen del día ──────────────────────────────────────────────────
function WidgetResumen({ isDark }: WProps) {
  const gastos   = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  const hoy = fechaLocalHoy();

  const gastosHoy   = gastos.filter((g) => (g.fecha ?? g.created_at ?? "").startsWith(hoy));
  const ingresosHoy = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "").startsWith(hoy));
  const totalG = gastosHoy.reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalI = ingresosHoy.reduce((a, i) => a + (i.monto ?? 0), 0);
  const balance = totalI - totalG;

  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 6);
  const hace7Str = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, "0")}-${String(hace7.getDate()).padStart(2, "0")}`;
  const totalGSem = gastos.filter((g) => (g.fecha ?? g.created_at ?? "") >= hace7Str).reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalISem = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "") >= hace7Str).reduce((a, i) => a + (i.monto ?? 0), 0);
  const balSem = totalISem - totalGSem;

  const total  = totalI + totalG;
  const ratioI = total > 0 ? totalI / total : 0.5;

  return (
    <View style={[s.wCard, { padding: 0, overflow: "hidden" }]}>
      <GaugeBalance
        ratio={ratioI}
        isDark={isDark}
        balance={balance}
        balColor=""
        totalI={totalI}
        totalG={totalG}
        balSem={balSem}
      />
    </View>
  );
}

// ─── Widget: Clientes frecuentes ─────────────────────────────────────────────
function WidgetClientes({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const { colors: c } = useTheme();

  const { clienteData, topCarga } = React.useMemo(() => {
    const clienteMap = new Map<
      string,
      { viajes: number; total: number; ultimaFecha: string }
    >();
    const cargaMap = new Map<string, number>();

    for (const ing of ingresos) {
      if (ing.tipo_ingreso !== "Flete" || !ing.descripcion) continue;
      const partes = ing.descripcion.split(" · ");
      const nombre = partes[0]?.trim();
      if (!nombre || nombre === "Flete") continue;

      const prev = clienteMap.get(nombre) ?? {
        viajes: 0,
        total: 0,
        ultimaFecha: "",
      };
      prev.viajes += 1;
      prev.total += ing.monto ?? 0;
      const fecha = ing.fecha ?? ing.created_at ?? "";
      if (fecha > prev.ultimaFecha) prev.ultimaFecha = fecha;
      clienteMap.set(nombre, prev);

      // Mercancía: último segmento (si hay ruta con →, mercancía es el 3ro; si no, el 2do)
      const mercancia =
        partes.length >= 3
          ? partes[partes.length - 1]?.trim()
          : partes.length === 2
            ? partes[1]?.trim()
            : null;
      if (mercancia && !mercancia.includes("→")) {
        cargaMap.set(mercancia, (cargaMap.get(mercancia) ?? 0) + 1);
      }
    }

    const clientes = [...clienteMap.entries()]
      .sort((a, b) => b[1].viajes - a[1].viajes)
      .slice(0, 3);

    const cargas = [...cargaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { clienteData: clientes, topCarga: cargas };
  }, [ingresos]);

  if (clienteData.length === 0) {
    return (
      <View style={[s.clientesCard, { backgroundColor: WBG(isDark) }]}>
        <View style={s.clientesHeader}>
          <Ionicons name="people-outline" size={18} color={c.accent} />
          <Text style={[s.clientesTitle, { color: INK(isDark) }]}>
            Clientes
          </Text>
        </View>
        <View style={s.clientesEmpty}>
          <Ionicons name="person-add-outline" size={28} color={c.accent} />
          <Text style={[s.clientesEmptyText, { color: MUTED(isDark) }]}>
            Registra fletes para ver{"\n"}tus clientes frecuentes
          </Text>
        </View>
      </View>
    );
  }

  const medalColors = ["#FFB800", "#94A3B8", "#CD7F32"];

  return (
    <View style={[s.clientesCard, { backgroundColor: WBG(isDark) }]}>
      <View style={s.clientesColumns}>
        {/* Columna izquierda — Top clientes */}
        <View style={s.clientesCol}>
          <View style={s.clientesColHeader}>
            <Ionicons name="people-outline" size={16} color={c.accent} />
            <Text style={[s.clientesTitle, { color: INK(isDark) }]}>
              Top clientes
            </Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            style={s.clientesScroll}>
            {clienteData.map(([nombre, info], idx) => (
              <View
                key={nombre}
                style={[
                  s.clienteRow,
                  idx < clienteData.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isDark ? "#333" : "#E5E7EB",
                  },
                ]}>
                <View
                  style={[
                    s.clienteRank,
                    { backgroundColor: (medalColors[idx] ?? c.accent) + "22" },
                  ]}>
                  <Text
                    style={[
                      s.clienteRankText,
                      { color: medalColors[idx] ?? c.accent },
                    ]}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={s.clienteInfo}>
                  <Text
                    style={[s.clienteNombre, { color: INK(isDark) }]}
                    numberOfLines={1}>
                    {nombre}
                  </Text>
                  <Text style={[s.clienteMeta, { color: MUTED(isDark) }]}>
                    {info.viajes} viaje{info.viajes !== 1 ? "s" : ""} ·{" "}
                    {formatCOP(info.total)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Separador vertical */}
        <View
          style={[
            s.clientesVDivider,
            { backgroundColor: isDark ? "#333" : "#E5E7EB" },
          ]}
        />

        {/* Columna derecha — Carga frecuente */}
        <View style={s.clientesCol}>
          <View style={s.clientesColHeader}>
            <Ionicons name="cube-outline" size={16} color={c.accent} />
            <Text style={[s.clientesTitle, { color: INK(isDark) }]}>Carga</Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            style={s.clientesScroll}>
            {topCarga.length > 0 ? (
              topCarga.map(([tipo, count]) => (
                <View
                  key={tipo}
                  style={[
                    s.cargaChip,
                    { backgroundColor: isDark ? "#2A2A2E" : "#F0F0F5" },
                  ]}>
                  <Text
                    style={[s.cargaChipText, { color: INK(isDark) }]}
                    numberOfLines={1}>
                    {tipo}
                  </Text>
                  <Text style={[s.cargaChipCount, { color: MUTED(isDark) }]}>
                    {count}x
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[s.clientesEmptyText, { color: MUTED(isDark) }]}>
                Sin datos
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ─── Widget: Pico y Placa ─────────────────────────────────────────────────────
function WidgetPicoYPlaca({ isDark }: WProps) {
  const {
    restringido,
    ultimoDigito,
    ciudad,
    hastaHora,
    cargando,
    sinPlaca,
    sinCobertura,
  } = usePicoYPlaca();
  const { colors: c } = useTheme();

  const libre = isDark ? "#34D399" : "#059669";
  const bloq = isDark ? "#F87171" : "#DC2626";

  return (
    <View style={[s.wCircle, { backgroundColor: WBG(isDark) }]}>
      {cargando ? (
        <ActivityIndicator size="small" color={c.accent} />
      ) : sinPlaca ? (
        <>
          <Ionicons name="car-outline" size={30} color={INK(isDark)} />
          <Text style={[s.wCircleSub, { color: MUTED(isDark) }]}>
            Sin{"\n"}vehículo
          </Text>
        </>
      ) : sinCobertura ? (
        <>
          <Ionicons name="car-outline" size={30} color={INK(isDark)} />
          <Text style={[s.wCircleLabel, { color: MUTED(isDark) }]}>
            Pico y placa
          </Text>
          <Text style={[s.wCircleSub, { color: MUTED(isDark) }]}>
            {ciudad ? `Sin datos\n${ciudad}` : "Ubic.\nno disponible"}
          </Text>
        </>
      ) : (
        <>
          <Ionicons
            name="car-outline"
            size={30}
            color={restringido ? bloq : libre}
          />
          <Text
            style={[
              s.wCircleBig,
              {
                color: restringido ? bloq : libre,
                fontSize: 13,
                fontWeight: "700",
              },
            ]}>
            {restringido ? "Restringido" : "Puede\ncircular"}
          </Text>
          {restringido && hastaHora && (
            <Text style={[s.wCircleSub, { color: MUTED(isDark) }]}>
              hasta {hastaHora}
            </Text>
          )}
          <Text style={[s.wCircleLabel, { color: MUTED(isDark) }]}>
            Placa …{ultimoDigito}
          </Text>
        </>
      )}
    </View>
  );
}

// ─── Widget: Centro de Pendientes ─────────────────────────────────────────────
type PendientesTab = "cobrar" | "pagar";

function WidgetCentroPendientes({
  isDark,
  colors: c,
}: WProps & { colors: ReturnType<typeof useTheme>["colors"] }) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const gastos = useGastosStore((s) => s.gastos);

  const [modalVisible, setModalVisible] = useState(false);
  const [tab, setTab] = useState<PendientesTab>("cobrar");
  const [insights, setInsights] = useState<InsightsPendientes | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);

  // ── Actualizar pago ──
  const [registrandoId, setRegistrandoId] = useState<string | null>(null);
  const [montoInput, setMontoInput] = useState("");
  const [actualizando, setActualizando] = useState(false);

  const porCobrar = React.useMemo(() => calcularPorCobrar(ingresos), [ingresos]);
  const porPagar = React.useMemo(() => calcularPorPagar(gastos), [gastos]);
  const resumen = React.useMemo(
    () => resumirPendientes(porCobrar, porPagar),
    [porCobrar, porPagar]
  );

  // Programa notificaciones cuando el resumen cambia
  React.useEffect(() => {
    programarRecordatoriosPendientes(resumen);
  }, [
    resumen.countVencidosCobro,
    resumen.countVencidosPago,
    resumen.countProximosPago,
  ]);

  const tieneUrgentes =
    resumen.countVencidosCobro > 0 || resumen.countVencidosPago > 0;
  const totalUrgentes = resumen.countVencidosCobro + resumen.countVencidosPago;

  // ── Registrar pago de un ingreso (cobro) ──
  const abrirRegistroPago = (item: PorCobrar) => {
    setRegistrandoId(item.id);
    setMontoInput(String(item.montoRestante));
  };

  const confirmarPago = async (item: PorCobrar) => {
    const monto = parseFloat(montoInput.replace(/[^\d]/g, ""));
    if (isNaN(monto) || monto <= 0) {
      Alert.alert("Monto inválido", "Ingresa un monto mayor a cero.");
      return;
    }
    setActualizando(true);
    const nuevoMontoPagado = Math.min(
      (item.montoPagado ?? 0) + monto,
      item.monto
    );
    const nuevoEstado =
      nuevoMontoPagado >= item.monto ? "pagado" : "parcial";
    const { error } = await supabase
      .from("conductor_ingresos")
      .update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado })
      .eq("id", item.id);
    setActualizando(false);
    if (error) {
      Alert.alert("Error", "No se pudo actualizar el pago.");
    } else {
      setRegistrandoId(null);
      setMontoInput("");
    }
  };

  // ── Marcar gasto como pagado ──
  const marcarGastoPagado = (id: string, descripcion: string) => {
    Alert.alert(
      "¿Marcar como pagado?",
      `Se registrará "${descripcion}" como pagado.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            const { error } = await supabase
              .from("conductor_gastos")
              .update({ estado: "pagado" })
              .eq("id", id);
            if (error) Alert.alert("Error", "No se pudo actualizar.");
          },
        },
      ]
    );
  };

  const mostrarMensajeCobro = (item: PorCobrar) => {
    const msg =
      insights?.mensajeCobro ??
      `Hola! Le recordamos que tiene una cuenta pendiente por ${formatCOPPendientes(item.montoRestante)}. Por favor comuníquese con nosotros. Gracias.`;
    Alert.alert(`Cobrar a ${item.cliente}`, msg, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "WhatsApp",
        onPress: () => {
          Linking.openURL(
            `https://wa.me/?text=${encodeURIComponent(msg)}`
          ).catch(() => Alert.alert("Error", "No se pudo abrir WhatsApp"));
        },
      },
    ]);
  };

  return (
    <>
      {/* ── WIDGET COMPACTO ── */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setModalVisible(true);
        }}
        style={[wp.card, { backgroundColor: WBG(isDark) }]}>
        {/* Totales */}
        <View style={wp.totalesRow}>
          <View style={wp.totalCol}>
            <Text style={[wp.totalLabel, { color: MUTED(isDark) }]}>
              Por cobrar
            </Text>
            <Text style={[wp.totalMonto, { color: "#EF4444" }]}>
              {formatCOPPendientes(resumen.totalPorCobrar)}
            </Text>
            <Text style={[wp.totalSub, { color: MUTED(isDark) }]}>
              {resumen.countPorCobrar} cuenta
              {resumen.countPorCobrar !== 1 ? "s" : ""}
            </Text>
          </View>

          <View style={[wp.divider, { backgroundColor: isDark ? "#333" : "#E5E7EB" }]} />

          <View style={wp.totalCol}>
            <Text style={[wp.totalLabel, { color: MUTED(isDark) }]}>
              Por pagar
            </Text>
            <Text style={[wp.totalMonto, { color: "#F59E0B" }]}>
              {formatCOPPendientes(resumen.totalPorPagar)}
            </Text>
            <Text style={[wp.totalSub, { color: MUTED(isDark) }]}>
              {porPagar.length} pendiente{porPagar.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Alerta urgente */}
        {tieneUrgentes && (
          <View style={wp.alertaRow}>
            <Ionicons name="warning-outline" size={13} color="#F59E0B" />
            <Text style={wp.alertaText}>
              {resumen.countVencidosCobro > 0
                ? `${resumen.countVencidosCobro} cobro${resumen.countVencidosCobro !== 1 ? "s" : ""} vencido${resumen.countVencidosCobro !== 1 ? "s" : ""}`
                : ""}
              {resumen.countVencidosCobro > 0 && resumen.countVencidosPago > 0
                ? " · "
                : ""}
              {resumen.countVencidosPago > 0
                ? `${resumen.countVencidosPago} pago${resumen.countVencidosPago !== 1 ? "s" : ""} vencido${resumen.countVencidosPago !== 1 ? "s" : ""}`
                : ""}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── MODAL DETALLE ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={[wp.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  wp.sheet,
                  {
                    backgroundColor: c.modalBg,
                    ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
                  },
                ]}>
                <View style={[wp.handle, { backgroundColor: c.border }]} />

                {/* Sheet Header */}
                <View style={wp.sheetHeader}>
                  <Text style={[wp.sheetTitle, { color: c.text }]}>
                    Centro de Pagos
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={22} color={c.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={wp.sheetScroll}>

                  {/* Tabs */}
                  <View style={wp.tabs}>
                    {(["cobrar", "pagar"] as PendientesTab[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          wp.tabBtn,
                          tab === t
                            ? { backgroundColor: c.accent, borderColor: c.accent }
                            : { borderColor: c.border },
                        ]}
                        onPress={() => setTab(t)}
                        activeOpacity={0.8}>
                        <Text
                          style={[
                            wp.tabText,
                            {
                              color:
                                tab === t ? c.accentText : c.textSecondary,
                            },
                          ]}>
                          {t === "cobrar"
                            ? `Por cobrar (${porCobrar.length})`
                            : `Por pagar (${porPagar.length})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Lista */}
                  {tab === "cobrar" && (
                    <>
                      {porCobrar.length === 0 ? (
                        <View
                          style={[
                            wp.emptyCard,
                            { backgroundColor: isDark ? "#1C1C1E" : "#F7F7F7" },
                          ]}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={36}
                            color="#22C55E"
                          />
                          <Text style={[wp.emptyText, { color: MUTED(isDark) }]}>
                            Sin cuentas pendientes por cobrar
                          </Text>
                        </View>
                      ) : (
                        porCobrar.map((item) => {
                          const color = COLORES_ESTADO_COBRO[item.estado];
                          const label = LABELS_COBRO[item.estado];
                          return (
                            <View
                              key={item.id}
                              style={[
                                wp.itemCard,
                                {
                                  backgroundColor:
                                    isDark ? "#1C1C1E" : "#F7F7F7",
                                },
                              ]}>
                              <View style={wp.itemBody}>
                                <View style={wp.itemRow}>
                                  <Text
                                    style={[
                                      wp.itemCliente,
                                      { color: INK(isDark) },
                                    ]}
                                    numberOfLines={1}>
                                    {item.cliente}
                                  </Text>
                                  <View
                                    style={[
                                      wp.itemBadge,
                                      { backgroundColor: color + "20" },
                                    ]}>
                                    <Text
                                      style={[
                                        wp.itemBadgeText,
                                        { color },
                                      ]}>
                                      {label}
                                    </Text>
                                  </View>
                                </View>
                                <View style={wp.itemMontoRow}>
                                  <Text
                                    style={[
                                      wp.itemMonto,
                                      { color: INK(isDark) },
                                    ]}>
                                    {formatCOPPendientes(item.montoRestante)}
                                  </Text>
                                  {item.diasVencido > 0 && (
                                    <Text
                                      style={[
                                        wp.itemDias,
                                        { color: "#EF4444" },
                                      ]}>
                                      {item.diasVencido}d vencido
                                    </Text>
                                  )}
                                </View>
                                {/* Acciones: Cobrar + Registrar pago */}
                                <View style={wp.accionesRow}>
                                  <TouchableOpacity
                                    style={[
                                      wp.cobrarBtn,
                                      { borderColor: c.accent + "60", flex: 1 },
                                    ]}
                                    onPress={() => mostrarMensajeCobro(item)}
                                    activeOpacity={0.7}>
                                    <Ionicons
                                      name="chatbubble-outline"
                                      size={13}
                                      color={c.accent}
                                    />
                                    <Text
                                      style={[
                                        wp.cobrarBtnText,
                                        { color: c.accent },
                                      ]}>
                                      Cobrar
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      wp.cobrarBtn,
                                      {
                                        borderColor: "#22C55E60",
                                        flex: 1,
                                        backgroundColor:
                                          registrandoId === item.id
                                            ? "#22C55E15"
                                            : "transparent",
                                      },
                                    ]}
                                    onPress={() => {
                                      if (registrandoId === item.id) {
                                        setRegistrandoId(null);
                                      } else {
                                        abrirRegistroPago(item);
                                      }
                                    }}
                                    activeOpacity={0.7}>
                                    <Ionicons
                                      name="checkmark-circle-outline"
                                      size={13}
                                      color="#22C55E"
                                    />
                                    <Text
                                      style={[
                                        wp.cobrarBtnText,
                                        { color: "#22C55E" },
                                      ]}>
                                      Registrar pago
                                    </Text>
                                  </TouchableOpacity>
                                </View>

                                {/* Mini-formulario de pago */}
                                {registrandoId === item.id && (
                                  <View
                                    style={[
                                      wp.pagoForm,
                                      {
                                        backgroundColor: isDark
                                          ? "#111"
                                          : "#F0FDF4",
                                        borderColor: "#22C55E40",
                                      },
                                    ]}>
                                    <Text
                                      style={[
                                        wp.pagoFormLabel,
                                        { color: MUTED(isDark) },
                                      ]}>
                                      Monto a registrar
                                    </Text>
                                    <View style={wp.pagoInputRow}>
                                      <TextInput
                                        style={[
                                          wp.pagoInput,
                                          {
                                            color: INK(isDark),
                                            backgroundColor: isDark
                                              ? "#1C1C1E"
                                              : "#fff",
                                            borderColor: "#22C55E60",
                                          },
                                        ]}
                                        value={montoInput}
                                        onChangeText={setMontoInput}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={MUTED(isDark)}
                                      />
                                      <TouchableOpacity
                                        style={wp.pagoCompletoBtn}
                                        onPress={() =>
                                          setMontoInput(
                                            String(item.montoRestante)
                                          )
                                        }>
                                        <Text style={wp.pagoCompletoBtnText}>
                                          Total
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                      style={[
                                        wp.pagoConfirmarBtn,
                                        actualizando && { opacity: 0.6 },
                                      ]}
                                      onPress={() => confirmarPago(item)}
                                      disabled={actualizando}>
                                      {actualizando ? (
                                        <ActivityIndicator
                                          size="small"
                                          color="#fff"
                                        />
                                      ) : (
                                        <Text style={wp.pagoConfirmarBtnText}>
                                          Confirmar pago
                                        </Text>
                                      )}
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </>
                  )}

                  {tab === "pagar" && (
                    <>
                      {porPagar.length === 0 ? (
                        <View
                          style={[
                            wp.emptyCard,
                            { backgroundColor: isDark ? "#1C1C1E" : "#F7F7F7" },
                          ]}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={36}
                            color="#22C55E"
                          />
                          <Text style={[wp.emptyText, { color: MUTED(isDark) }]}>
                            Sin gastos pendientes de pago
                          </Text>
                        </View>
                      ) : (
                        porPagar.map((item) => {
                          const color = COLORES_ESTADO_PAGO[item.estado];
                          const label = LABELS_PAGO[item.estado];
                          return (
                            <View
                              key={item.id}
                              style={[
                                wp.itemCard,
                                {
                                  backgroundColor:
                                    isDark ? "#1C1C1E" : "#F7F7F7",
                                },
                              ]}>
                              <View style={wp.itemBody}>
                                <View style={wp.itemRow}>
                                  <Text
                                    style={[
                                      wp.itemCliente,
                                      { color: INK(isDark) },
                                    ]}
                                    numberOfLines={1}>
                                    {item.descripcion}
                                  </Text>
                                  <View
                                    style={[
                                      wp.itemBadge,
                                      { backgroundColor: color + "20" },
                                    ]}>
                                    <Text
                                      style={[wp.itemBadgeText, { color }]}>
                                      {label}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={[
                                    wp.itemDesc,
                                    { color: MUTED(isDark) },
                                  ]}>
                                  {item.tipoGasto}
                                </Text>
                                <View style={wp.itemMontoRow}>
                                  <Text
                                    style={[
                                      wp.itemMonto,
                                      { color: INK(isDark) },
                                    ]}>
                                    {formatCOPPendientes(item.monto)}
                                  </Text>
                                  {item.diasParaVencer <= 7 && (
                                    <Text
                                      style={[
                                        wp.itemDias,
                                        {
                                          color:
                                            item.diasParaVencer <= 0
                                              ? "#EF4444"
                                              : "#F59E0B",
                                        },
                                      ]}>
                                      {item.diasParaVencer <= 0
                                        ? `Vencido hace ${Math.abs(item.diasParaVencer)}d`
                                        : `Vence en ${item.diasParaVencer}d`}
                                    </Text>
                                  )}
                                </View>
                                <TouchableOpacity
                                  style={[
                                    wp.cobrarBtn,
                                    { borderColor: "#22C55E60" },
                                  ]}
                                  onPress={() =>
                                    marcarGastoPagado(
                                      item.id,
                                      item.descripcion
                                    )
                                  }
                                  activeOpacity={0.7}>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={13}
                                    color="#22C55E"
                                  />
                                  <Text
                                    style={[
                                      wp.cobrarBtnText,
                                      { color: "#22C55E" },
                                    ]}>
                                    Marcar pagado
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

// ─── Estilos widget pendientes ─────────────────────────────────────────────────
const wp = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  title: { fontSize: 13, fontWeight: "700" },
  urgentBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: 4,
  },
  urgentBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  totalesRow: { flexDirection: "row", alignItems: "center" },
  totalCol: { flex: 1, gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 44, marginHorizontal: 14 },
  totalLabel: { fontSize: 10, fontWeight: "500" },
  totalMonto: { fontSize: 16, fontWeight: "700", letterSpacing: -0.5 },
  totalSub: { fontSize: 10 },
  alertaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F59E0B15",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  alertaText: { fontSize: 12, color: "#F59E0B", fontWeight: "500" },

  // Modal — mismo estilo que el resto de la app
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: "84%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 22,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  sheetScroll: { gap: 10, paddingBottom: 20 },

  // Tabs
  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tabText: { fontSize: 12, fontWeight: "600" },

  // Items
  itemCard: {
    borderRadius: 12,
    flexDirection: "row",
    overflow: "hidden",
  },
  itemBody: { flex: 1, padding: 12, gap: 5 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCliente: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  itemDesc: { fontSize: 11 },
  itemBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  itemBadgeText: { fontSize: 10, fontWeight: "600" },
  itemMontoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemMonto: { fontSize: 16, fontWeight: "700" },
  itemDias: { fontSize: 11, fontWeight: "600" },
  cobrarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  cobrarBtnText: { fontSize: 12, fontWeight: "600" },
  accionesRow: {
    flexDirection: "row",
    gap: 6,
  },
  // Mini-formulario registrar pago
  pagoForm: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    marginTop: 2,
  },
  pagoFormLabel: { fontSize: 11, fontWeight: "500" },
  pagoInputRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  pagoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: "600",
  },
  pagoCompletoBtn: {
    backgroundColor: "#22C55E20",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pagoCompletoBtnText: { fontSize: 12, fontWeight: "600", color: "#22C55E" },
  pagoConfirmarBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  pagoConfirmarBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  emptyCard: {
    borderRadius: 12,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
});

// ─── Publicidad ───────────────────────────────────────────────────────────────
interface Ad {
  id: string;
  categoria: "taller" | "repuestos" | "eds";
  nombre: string;
  descripcion: string;
  emoji: string;
  color: string;
  cta: string;
}

const ADS: Ad[] = [
  {
    id: "1",
    categoria: "taller",
    nombre: "Taller El Camionero",
    descripcion:
      "Frenos, suspensión y motor. Servicio 24h para vehículos de carga.",
    emoji: "🔧",
    color: "#3B82F6",
    cta: "Ver taller",
  },
  {
    id: "2",
    categoria: "repuestos",
    nombre: "Repuestos La Vía",
    descripcion:
      "Filtros, llantas y repuestos originales para todas las marcas.",
    emoji: "⚙️",
    color: "#F59E0B",
    cta: "Ver catálogo",
  },
  {
    id: "3",
    categoria: "eds",
    nombre: "EDS Ruta Norte",
    descripcion: "ACPM, GNV y lubricantes. Parqueadero para tractomulas.",
    emoji: "⛽",
    color: "#10B981",
    cta: "Ver ubicación",
  },
  {
    id: "4",
    categoria: "taller",
    nombre: "Tecni-Diesel Centro",
    descripcion: "Especialistas en motores diésel y sistemas eléctricos.",
    emoji: "🛠️",
    color: "#8B5CF6",
    cta: "Llamar ahora",
  },
];

function AdCarousel({ isDark }: WProps) {
  const bg = isDark ? "#1C1C1E" : "#FFFFFF";
  return (
    <View style={s.adWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.adScroll}
        decelerationRate="fast"
        snapToInterval={width - H_PAD * 2 + 12}
        snapToAlignment="start">
        {ADS.map((ad) => (
          <View key={ad.id} style={[s.adCard, { backgroundColor: bg }]}>
            <View
              style={[s.adIconCircle, { backgroundColor: ad.color + "22" }]}>
              <Text style={s.adEmoji}>{ad.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.adCategoria, { color: ad.color }]}>
                {ad.categoria === "taller"
                  ? "TALLER"
                  : ad.categoria === "repuestos"
                    ? "REPUESTOS"
                    : "EDS"}
              </Text>
              <Text
                style={[s.adNombre, { color: isDark ? "#FFFFFF" : "#111827" }]}
                numberOfLines={1}>
                {ad.nombre}
              </Text>
              <Text
                style={[s.adDesc, { color: isDark ? "#94A3B8" : "#6B7280" }]}
                numberOfLines={2}>
                {ad.descripcion}
              </Text>
            </View>
            <TouchableOpacity style={[s.adCta, { backgroundColor: ad.color }]}>
              <Text style={s.adCtaText}>{ad.cta}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Hero square card (dos lado a lado en el hero) ───────────────────────────
function HeroSquareCard({
  item,
  card,
  colors: c,
  onPress,
  renderBadge,
}: {
  item: Item;
  card: object;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: (item: Item) => void;
  renderBadge?: (item: Item) => React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const transY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    if (reduceMotion) return;
    const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
    opacity.value = withDelay(
      40,
      withTiming(1, { duration: 300, easing: easeOut }),
    );
    transY.value = withDelay(
      40,
      withTiming(0, { duration: 340, easing: easeOut }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }, { scale: scale.value }],
  }));

  const accent = item.color || c.accent;

  return (
    <AnimatedPressable
      style={[s.heroSquare, card, animStyle]}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint={item.subtitle || undefined}>
      {/* Badge absoluto (multas pendientes, etc.) */}
      {renderBadge?.(item)}

      {/* Icono con sombra proyectada */}
      <View
        style={[
          s.heroSquareIcon,
          {
            shadowColor: accent,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 10,
          },
        ]}>
        {item.iconName ? (
          <ItemIcon
            name={item.iconName}
            size={
              HOME_COLORS.heroIconSizes[
                item.id as keyof typeof HOME_COLORS.heroIconSizes
              ] ?? HOME_COLORS.heroIconSize
            }
          />
        ) : (
          <Ionicons
            name={(item.icon || "grid-outline") as any}
            size={
              (HOME_COLORS.heroIconSizes[
                item.id as keyof typeof HOME_COLORS.heroIconSizes
              ] ?? HOME_COLORS.heroIconSize) - 8
            }
            color={accent}
          />
        )}
      </View>

      {/* Texto */}
      <Text
        style={[s.heroSquareName, { color: HOME_COLORS.heroCardText }]}
        numberOfLines={1}>
        {item.name}
      </Text>
      {false && item.subtitle && (
        <Text
          style={[s.heroSquareSub, { color: HOME_COLORS.heroCardTextSub }]}
          numberOfLines={1}>
          {item.subtitle}
        </Text>
      )}
    </AnimatedPressable>
  );
}

// ─── Apple-style list row (full width, icon + label + chevron) ───────────────
function ListRow({
  item,
  index,
  card,
  colors: c,
  onPress,
  renderBadge,
}: {
  item: Item;
  index: number;
  card: object;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: (item: Item) => void;
  renderBadge?: (item: Item) => React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const transY = useSharedValue(reduceMotion ? 0 : 10);

  useEffect(() => {
    if (reduceMotion) return;
    const delay = Math.min(index * 45, 300);
    const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 260, easing: easeOut }),
    );
    transY.value = withDelay(
      delay,
      withTiming(0, { duration: 300, easing: easeOut }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }, { scale: scale.value }],
  }));

  const accent = item.color || c.accent;
  const hasBadge = !!item.badgeCount && item.badgeCount > 0;

  return (
    <AnimatedPressable
      style={[s.listRow, card, animStyle]}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityHint={item.subtitle || undefined}>
      {/* Icono — sin fondo */}
      <View style={s.listRowIcon}>
        {item.iconName ? (
          <ItemIcon
            name={item.iconName}
            size={Platform.OS === "android" ? 40 : 54}
          />
        ) : (
          <Ionicons
            name={(item.icon || "grid-outline") as any}
            size={Platform.OS === "android" ? 26 : 32}
            color={accent}
          />
        )}
      </View>

      {/* Label */}
      <Text style={[s.listRowLabel, { color: c.text }]} numberOfLines={2}>
        {item.name}
      </Text>

      {renderBadge?.(item)}

      {/* Right side */}
      {hasBadge && (
        <View style={[s.listBadgePill, { backgroundColor: c.expense }]}>
          <Text style={s.listBadgeText}>
            {item.badgeCount! > 99 ? "99+" : item.badgeCount}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeBaseAdapted({
  items,
  showCamionHeader = true,
  vehicleCardTitle,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
  const navigation = useNavigation<any>();
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const vcShadow = getShadow(isDark, "md");
  const {
    placa: placaActual,
    tipoCamion,
    setPlaca,
    setTipoCamion,
  } = useVehiculoStore();
  const { user } = useAuth();

  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [conductorActual, setConductorActual] = useState<string | undefined>();
  const [placaInput, setPlacaInput] = useState("");
  const [tipoCamionInput, setTipoCamionInput] = useState<TipoCamion | null>(
    null,
  );
  const [guardando, setGuardando] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(
    null,
  );
  const [placaEditInput, setPlacaEditInput] = useState("");
  const [tipoCamionEditInput, setTipoCamionEditInput] =
    useState<TipoCamion | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-8)).current;

  // Vehicle card press animation
  const vcScale = useSharedValue(1);
  const vcAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vcScale.value }],
  }));

  useEffect(() => {
    if (user?.id) cargarVehiculos();
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
  }, [user?.id]);

  const cargarVehiculos = async () => {
    if (!user?.id) return;
    setCargando(true);
    try {
      const { data, error } = await cargarVehiculosConEstado(user.id);
      if (error) throw error;

      const vehiculosConConductor = await Promise.all(
        (data || []).map(async (v) => {
          let conductorNombre: string | undefined;
          const { data: relaciones } = await supabase
            .from("vehiculo_conductores")
            .select("conductor_id")
            .eq("vehiculo_placa", v.placa)
            .eq("rol", "conductor")
            .eq("estado", "autorizado")
            .limit(1);

          if (relaciones && relaciones.length > 0) {
            const { data: usuario } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("user_id", relaciones[0].conductor_id)
              .maybeSingle();
            conductorNombre = usuario?.nombre;
          }

          return {
            id: v.relacion_id,
            placa: v.placa,
            tipo_camion: normalizarTipo(v.tipo_camion),
            estado: v.estado,
            rol: v.rol,
            conductorNombre,
          };
        }),
      );

      setVehiculos(vehiculosConConductor);
      if (placaActual) {
        const actual = vehiculosConConductor.find(
          (v) => v.placa === placaActual,
        );
        if (actual) setConductorActual(actual.conductorNombre);
      }
    } catch (err) {
      logger.error("Error cargando vehículos:", err);
    } finally {
      setCargando(false);
    }
  };

  const getTipoCamionData = (tipo: TipoCamion | null) =>
    TIPOS_CAMION.find((t) => t.id === tipo);

  const handleSeleccionarVehiculo = (vehiculo: Vehiculo) => {
    if (vehiculo.estado === "pendiente") {
      Alert.alert(
        "Esperando autorización",
        "El propietario aún no ha autorizado tu acceso.",
      );
      return;
    }
    if (vehiculo.estado === "rechazado") {
      Alert.alert("Acceso denegado", "El propietario rechazó tu solicitud.");
      return;
    }
    // Si ya está activo, deseleccionar
    if (placaActual === vehiculo.placa) {
      useVehiculoStore.getState().clearVehiculo();
      setConductorActual(undefined);
      return;
    }
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
    setConductorActual(vehiculo.conductorNombre);
  };

  const cerrarModal = () => {
    setModalVehiculosVisible(false);
    setPlacaInput("");
    setTipoCamionInput(null);
    setVehiculoEditando(null);
    setPlacaEditInput("");
    setTipoCamionEditInput(null);
  };

  const abrirEdicion = (v: Vehiculo) => {
    setVehiculoEditando(v);
    setPlacaEditInput(v.placa);
    setTipoCamionEditInput(v.tipo_camion);
  };

  const handleGuardarEdicion = async () => {
    if (!vehiculoEditando || !placaEditInput.trim() || !tipoCamionEditInput)
      return;
    setGuardando(true);
    const placaNueva = placaEditInput.trim().toUpperCase();
    try {
      // Actualizar tipo_camion en la relación del usuario (no en vehiculos global)
      await supabase
        .from("vehiculo_conductores")
        .update({ tipo_camion: tipoCamionEditInput })
        .eq("id", vehiculoEditando.id);

      // Si cambió la placa, renombrar el registro
      if (placaNueva !== vehiculoEditando.placa) {
        // Asegurar que exista el vehiculo con la nueva placa
        const { data: existeNueva } = await supabase
          .from("vehiculos")
          .select("placa")
          .eq("placa", placaNueva)
          .maybeSingle();
        if (!existeNueva) {
          await supabase.from("vehiculos").insert([{ placa: placaNueva }]);
        }
        await supabase
          .from("vehiculo_conductores")
          .update({ vehiculo_placa: placaNueva })
          .eq("vehiculo_placa", vehiculoEditando.placa);
        if (placaActual === vehiculoEditando.placa) {
          setPlaca(placaNueva);
          setTipoCamion(tipoCamionEditInput);
        }
      } else if (
        tipoCamionEditInput !== vehiculoEditando.tipo_camion &&
        placaActual === vehiculoEditando.placa
      ) {
        setTipoCamion(tipoCamionEditInput);
      }

      setVehiculoEditando(null);
      setPlacaEditInput("");
      setTipoCamionEditInput(null);
      await cargarVehiculos();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el vehículo");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarVehiculo = (v: Vehiculo) => {
    Alert.alert("Quitar vehículo", `¿Quitar ${v.placa} de tu lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          const result = await removerConductorDeVehiculo(v.id);
          if (!result.success) {
            Alert.alert(
              "Error",
              result.error || "No se pudo quitar el vehículo",
            );
            return;
          }
          if (placaActual === v.placa) setPlaca("");
          await cargarVehiculos();
        },
      },
    ]);
  };

  const handleAgregarVehiculo = async () => {
    if (!user?.id || !placaInput.trim() || !tipoCamionInput) return;
    setGuardando(true);
    const placa = placaInput.trim().toUpperCase();
    const result = await registrarVehiculoPropietario(
      user.id,
      placa,
      tipoCamionInput,
    );
    if (!result.success) {
      setGuardando(false);
      Alert.alert("Error", result.error || "No se pudo registrar el vehículo");
      return;
    }
    setGuardando(false);
    await cargarVehiculos();
    setPlacaInput("");
    setTipoCamionInput(null);
  };

  const tipoCamionData = getTipoCamionData(tipoCamion);
  const camionIconName: IconName = tipoCamion
    ? ICON_MAP[tipoCamion]
    : "conductor";
  // Shared card style — Apple: blanco puro / dark elevated
  // Estilo base compartido (sombra/borde)
  const cardBase = {
    borderRadius: 20,
  };

  // Card para list rows — personalizable desde HomeConstants
  const card = {
    ...cardBase,
    backgroundColor: isDark ? "#1C1C1E" : HOME_COLORS.listRowBg,
  };

  const sheet = {
    backgroundColor: c.modalBg,
    ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
  };

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          {/* VEHICLE CARD */}
          {showCamionHeader && (
            <AnimatedPressable
              style={[
                s.vehicleCard,
                {
                  backgroundColor: isDark ? `${c.accent}14` : c.cardBg,
                },
                isDark
                  ? { borderWidth: 1, borderColor: `${c.accent}33` }
                  : vcShadow,
                vcAnimStyle,
              ]}
              onPressIn={() => {
                vcScale.value = withTiming(0.98, { duration: 100 });
              }}
              onPressOut={() => {
                vcScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              }}
              onPress={() => setModalVehiculosVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={
                placaActual
                  ? `Vehículo activo: ${placaActual}, ${tipoCamionData?.label || ""}`
                  : "Seleccionar vehículo"
              }
              accessibilityHint="Toca para cambiar de vehículo">
              <View style={s.vehicleCardContent}>
                {placaActual ? (
                  <>
                    {/* Con vehículo — info apilada */}
                    <View style={s.vehicleInfo}>
                      <Text
                        style={[
                          s.vehicleLabel,
                          { color: HOME_COLORS.vehicleCardTextMuted },
                        ]}>
                        vehículo activo
                      </Text>
                      <Text
                        style={[
                          s.vehicleType,
                          { color: HOME_COLORS.vehicleCardText },
                        ]}>
                        {vehicleCardTitle || tipoCamionData?.label || ""}
                      </Text>
                      <View
                        style={[
                          s.placaBadge,
                          {
                            backgroundColor: c.plateYellow,
                            borderColor: c.plateBorder,
                            borderWidth: 1,
                          },
                        ]}>
                        <Text style={[s.placaText, { color: c.plateText }]}>
                          {placaActual}
                        </Text>
                      </View>
                      {conductorActual && (
                        <Text
                          style={[
                            s.vehicleConductor,
                            { color: HOME_COLORS.vehicleCardTextMuted },
                          ]}
                          numberOfLines={1}>
                          {conductorActual}
                        </Text>
                      )}
                    </View>
                    <ItemIcon
                      name={camionIconName}
                      size={HOME_COLORS.vehicleIconSize}
                    />
                  </>
                ) : (
                  <>
                    {/* Sin vehículo — estado vacío */}
                    <View style={s.vehicleInfo}>
                      <Text
                        style={[
                          s.vehicleType,
                          { color: HOME_COLORS.vehicleCardText },
                        ]}>
                        Sin vehículo
                      </Text>
                      <Text
                        style={[
                          s.vehicleHint,
                          { color: HOME_COLORS.vehicleCardTextMuted },
                        ]}>
                        Toca para seleccionar un camión
                      </Text>
                    </View>
                    <ItemIcon
                      name="conductor"
                      size={HOME_COLORS.vehicleIconSize}
                    />
                  </>
                )}
              </View>
            </AnimatedPressable>
          )}

          {/* GRID */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.gridContainer, { paddingBottom: insets.bottom + 100 }]}>
            {/* WIDGETS — fila centrada a ancho completo, sin scroll */}
            <View style={s.widgetRow}>
              <WidgetClima isDark={isDark} />
              <WidgetResumen isDark={isDark} />
            </View>

            {/* CLIENTES FRECUENTES */}
            <WidgetClientes isDark={isDark} />

            {/* CENTRO DE PENDIENTES */}
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: c.text }]}>
                Pendientes
              </Text>
            </View>
            <WidgetCentroPendientes isDark={isDark} colors={c} />

            {/* PUBLICIDAD — carrusel horizontal (próxima actualización) */}
            {/* <AdCarousel isDark={isDark} /> */}

            {/* PANEL DE CONTROL — todos los items en grid 2 columnas */}
            {items.length > 0 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionLabel, { color: c.text }]}>
                    Control
                  </Text>
                </View>
                <View style={s.listSection}>
                  {items
                    .reduce<Item[][]>((rows, item, i) => {
                      if (i % 2 === 0) rows.push([item]);
                      else rows[rows.length - 1].push(item);
                      return rows;
                    }, [])
                    .map((row, rowIdx) => (
                      <View key={rowIdx} style={s.listGridRow}>
                        {row.map((item, colIdx) => (
                          <View key={item.id} style={s.listGridCell}>
                            <ListRow
                              item={item}
                              index={rowIdx * 2 + colIdx + 1}
                              card={card}
                              colors={c}
                              onPress={onItemPress ?? (() => {})}
                              renderBadge={renderBadge}
                            />
                          </View>
                        ))}
                        {row.length === 1 && <View style={s.listGridCell} />}
                      </View>
                    ))}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* MODAL: LISTA DE VEHÍCULOS */}
      <Modal
        visible={modalVehiculosVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={cerrarModal}>
            <View style={[s.overlay, { backgroundColor: c.overlay }]}>
              <TouchableWithoutFeedback>
                <View style={[s.sheetBase, sheet]}>
                  <View style={[s.handle, { backgroundColor: c.border }]} />

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 8 }}>
                    {/* ── Título ── */}
                    <Text
                      style={[
                        s.sheetTitle,
                        { color: c.text, marginBottom: 20 },
                      ]}>
                      Mis Vehículos
                    </Text>

                    {/* ── Lista de vehículos ── */}
                    {cargando ? (
                      <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color={c.accent} />
                      </View>
                    ) : vehiculos.length > 0 ? (
                      <>
                        {vehiculos.map((v) => {
                          const tipo = getTipoCamionData(v.tipo_camion);
                          const isActive = placaActual === v.placa;
                          const vIconName: IconName = tipo
                            ? ICON_MAP[tipo.id]
                            : "conductor";
                          return (
                            <Swipeable
                              key={v.id}
                              overshootRight={false}
                              renderRightActions={() => (
                                <View style={s.swipeActions}>
                                  <TouchableOpacity
                                    style={[
                                      s.swipeActionBtn,
                                      { backgroundColor: "#3B82F6" },
                                    ]}
                                    onPress={() => abrirEdicion(v)}>
                                    <Ionicons
                                      name="pencil-outline"
                                      size={20}
                                      color="#fff"
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      s.swipeActionBtn,
                                      { backgroundColor: "#EF4444" },
                                    ]}
                                    onPress={() => handleEliminarVehiculo(v)}>
                                    <Ionicons
                                      name="trash-outline"
                                      size={20}
                                      color="#fff"
                                    />
                                  </TouchableOpacity>
                                </View>
                              )}>
                              <TouchableOpacity
                                style={[
                                  s.vehicleOption,
                                  {
                                    backgroundColor: isDark
                                      ? "#1C1C1E"
                                      : "#F2F2F7",
                                  },
                                  isActive && {
                                    borderWidth: 1.5,
                                    borderColor: c.accent,
                                  },
                                ]}
                                onPress={() => handleSeleccionarVehiculo(v)}
                                activeOpacity={0.7}>
                                <View
                                  style={[
                                    s.vehicleOptionIcon,
                                    {
                                      backgroundColor: tipo?.color || c.accent,
                                    },
                                  ]}>
                                  <ItemIcon name={vIconName} size={28} />
                                </View>
                                <View style={s.vehicleOptionInfo}>
                                  <Text
                                    style={[
                                      s.vehicleOptionPlaca,
                                      { color: c.text },
                                    ]}>
                                    {v.placa}
                                  </Text>
                                  <Text
                                    style={[
                                      s.vehicleOptionType,
                                      { color: c.textSecondary },
                                    ]}>
                                    {tipo?.label || "Vehículo"}
                                  </Text>
                                </View>
                                {isActive && (
                                  <View
                                    style={[
                                      s.statusBadge,
                                      { backgroundColor: c.accent },
                                    ]}>
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color={c.accentText}
                                    />
                                  </View>
                                )}
                              </TouchableOpacity>
                            </Swipeable>
                          );
                        })}
                      </>
                    ) : null}

                    {/* ── Formulario edición ── */}
                    {vehiculoEditando && (
                      <View
                        style={[s.addSection, { borderTopColor: c.divider }]}>
                        <View style={s.editSectionHeader}>
                          <Text
                            style={[
                              s.selectorLabel,
                              { color: c.text, marginBottom: 0 },
                            ]}>
                            Editar — {vehiculoEditando.placa}
                          </Text>
                          <TouchableOpacity
                            onPress={() => setVehiculoEditando(null)}>
                            <Ionicons
                              name="close"
                              size={20}
                              color={c.textMuted}
                            />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={[
                            s.placaInputField,
                            {
                              backgroundColor: c.surface,
                              color: c.text,
                              borderColor: c.accent,
                              marginTop: 12,
                            },
                          ]}
                          placeholder="Placa"
                          placeholderTextColor={c.textMuted}
                          value={placaEditInput}
                          onChangeText={(t) =>
                            setPlacaEditInput(t.toUpperCase())
                          }
                          autoCapitalize="characters"
                          maxLength={7}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          keyboardShouldPersistTaps="handled"
                          style={s.tipoScroll}>
                          {TIPOS_CAMION.map((tipo) => {
                            const selected = tipoCamionEditInput === tipo.id;
                            return (
                              <TouchableOpacity
                                key={tipo.id}
                                style={[
                                  s.tipoChip,
                                  {
                                    backgroundColor: c.surface,
                                    borderColor: c.border,
                                  },
                                  selected && {
                                    backgroundColor: tipo.color + "22",
                                    borderColor: tipo.color,
                                  },
                                ]}
                                onPress={() => setTipoCamionEditInput(tipo.id)}>
                                <ItemIcon name={tipo.iconName} size={32} />
                                <Text
                                  style={[
                                    s.tipoChipLabel,
                                    {
                                      color: selected
                                        ? tipo.color
                                        : c.textSecondary,
                                    },
                                  ]}>
                                  {tipo.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        <TouchableOpacity
                          style={[
                            s.confirmBtn,
                            { backgroundColor: "#3B82F6" },
                            (!placaEditInput.trim() ||
                              !tipoCamionEditInput) && { opacity: 0.4 },
                          ]}
                          onPress={handleGuardarEdicion}
                          disabled={
                            !placaEditInput.trim() ||
                            !tipoCamionEditInput ||
                            guardando
                          }>
                          {guardando ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={[s.confirmBtnText, { color: "#fff" }]}>
                              Guardar cambios
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ── Separador + sección agregar ── */}
                    <View style={[s.addSection, { borderTopColor: c.divider }]}>
                      <Text
                        style={[
                          s.selectorLabel,
                          { color: c.textSecondary, marginBottom: 12 },
                        ]}>
                        Agregar vehículo
                      </Text>

                      <TextInput
                        style={[
                          s.placaInputField,
                          {
                            backgroundColor: c.surface,
                            color: c.text,
                            borderColor: c.border,
                          },
                        ]}
                        placeholder="Placa — Ej: EKA854"
                        placeholderTextColor={c.textMuted}
                        value={placaInput}
                        onChangeText={(t) => setPlacaInput(t.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={7}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={s.tipoScroll}>
                        {TIPOS_CAMION.map((tipo) => {
                          const selected = tipoCamionInput === tipo.id;
                          return (
                            <TouchableOpacity
                              key={tipo.id}
                              style={[
                                s.tipoChip,
                                {
                                  backgroundColor: c.surface,
                                  borderColor: c.border,
                                },
                                selected && {
                                  backgroundColor: tipo.color + "22",
                                  borderColor: tipo.color,
                                },
                              ]}
                              onPress={() => setTipoCamionInput(tipo.id)}>
                              <ItemIcon name={tipo.iconName} size={32} />
                              <Text
                                style={[
                                  s.tipoChipLabel,
                                  {
                                    color: selected
                                      ? tipo.color
                                      : c.textSecondary,
                                  },
                                ]}>
                                {tipo.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <TouchableOpacity
                        style={[
                          s.confirmBtn,
                          { backgroundColor: c.accent },
                          (!placaInput.trim() || !tipoCamionInput) && {
                            opacity: 0.4,
                          },
                        ]}
                        onPress={handleAgregarVehiculo}
                        disabled={
                          !placaInput.trim() || !tipoCamionInput || guardando
                        }>
                        {guardando ? (
                          <ActivityIndicator
                            size="small"
                            color={c.accentText}
                          />
                        ) : (
                          <Text
                            style={[s.confirmBtnText, { color: c.accentText }]}>
                            Registrar vehículo
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={s.cancelTouchable}
                      onPress={cerrarModal}>
                      <Text style={[s.cancelText, { color: c.textSecondary }]}>
                        Cerrar
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: H_PAD },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: { fontSize: 12, fontWeight: "500", letterSpacing: 0.1 },
  greetingName: { fontSize: 34, fontWeight: "800", letterSpacing: -0.8 },

  // Avatar — white-border ring + accent shadow
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800" },

  // HERO ROW — dos cards cuadradas lado a lado
  heroRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  heroSquare: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroSquareIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSquareName: {
    fontSize: HOME_COLORS.heroCardNameSize,
    fontWeight: HOME_COLORS.heroCardNameWeight,
    letterSpacing: HOME_COLORS.heroCardNameLetterSpacing,
    textAlign: "center",
  },
  heroSquareSub: {
    fontSize: HOME_COLORS.heroCardSubSize,
    lineHeight: HOME_COLORS.heroCardSubLineHeight,
    textAlign: "center",
  },

  // VEHICLE STATUS
  vehicleStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  activoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activoDot: { width: 5, height: 5, borderRadius: 99 },
  activoText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  // VEHICLE CARD
  vehicleCard: {
    borderRadius: 22,
    marginBottom: 20,
  },
  vehicleCardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  // Circular icon — double-ring matching grid cards
  vehicleIconBg: {
    width: 68,
    height: 68,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleIconCore: {
    width: 54,
    height: 54,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleLabel: {
    fontSize: HOME_COLORS.vehicleLabelSize,
    fontWeight: HOME_COLORS.vehicleLabelWeight,
    letterSpacing: HOME_COLORS.vehicleLabelLetterSpacing,
    marginBottom: 1,
  },
  vehicleType: {
    fontSize: HOME_COLORS.vehicleTypeSize,
    fontWeight: HOME_COLORS.vehicleTypeWeight,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  vehicleHint: { fontSize: HOME_COLORS.vehicleHintSize },
  vehicleCtaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vehicleCtaText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.1 },
  vehicleConductor: {
    fontSize: HOME_COLORS.vehicleConductorSize,
  },
  placaBadge: {
    borderRadius: HOME_COLORS.vehicleBadgeBorderRadius,
    paddingHorizontal: HOME_COLORS.vehicleBadgePaddingH,
    paddingVertical: HOME_COLORS.vehicleBadgePaddingV,
    alignSelf: "flex-start",
  },
  placaText: {
    fontSize: HOME_COLORS.vehiclePlateSize,
    fontWeight: HOME_COLORS.vehiclePlateWeight,
    letterSpacing: HOME_COLORS.vehiclePlateLetterSpacing,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  // GRID
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
    paddingRight: 4,
  },
  sectionLabel: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: Platform.OS === "android" ? 0 : -0.4,
  },
  gridContainer: { paddingBottom: 0 },

  // Apple Support — lista vertical de filas
  listSection: {
    gap: 10,
    paddingHorizontal: 2,
  },
  listGridRow: {
    flexDirection: "row",
    gap: 10,
  },
  listGridCell: {
    flex: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: Platform.OS === "android" ? 14 : 18,
    borderRadius: 16,
    width: "100%",
  },
  listRowIconShadow: {
    borderRadius: 11,
    backgroundColor: "transparent",
  },
  listRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowLabel: {
    flex: 1,
    fontSize: HOME_COLORS.listRowLabelSize,
    fontWeight: HOME_COLORS.listRowLabelWeight,
    letterSpacing: HOME_COLORS.listRowLabelLetterSpacing,
  },
  listBadgePill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  listBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeCount: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeCountText: { fontSize: 10, fontWeight: "800" },

  gridArrow: {
    marginTop: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheetBase: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: "84%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 22,
  },
  sheetTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    ...TYPOGRAPHY.caption,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: { padding: 40, alignItems: "center" },

  // Vehicle List
  vehicleList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  vehicleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  vehicleOptionInfo: { flex: 1 },
  vehicleOptionPlaca: {
    ...TYPOGRAPHY.bodyBold,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  vehicleOptionType: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  statusBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingLeft: 6,
    marginBottom: 8,
  },
  swipeActionBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  editSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 32 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  emptySubText: { fontSize: 12, textAlign: "center" },

  // Sección agregar (integrada en el mismo modal)
  addSection: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 20,
  },
  placaInputField: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 20,
  },
  selectorLabel: { ...TYPOGRAPHY.captionBold, marginBottom: 10 },
  tipoScroll: { marginBottom: 24 },
  tipoChip: {
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginRight: 10,
    minWidth: 72,
  },
  tipoChipLabel: {
    ...TYPOGRAPHY.small,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmBtnText: { ...TYPOGRAPHY.bodyBold },

  // Placa Input
  placaIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  placaInput: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 20,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },

  // Sheet CTA — botón principal del modal (full-width, pill)
  sheetCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 99,
    paddingVertical: 16,
    marginBottom: 8,
  },
  sheetCtaText: { fontSize: 16, fontWeight: "700" },

  cancelTouchable: { alignItems: "center", padding: 12 },
  cancelText: { ...TYPOGRAPHY.body },

  // ─── WIDGETS ────────────────────────────────────────────────────────────────
  // ─── AD CAROUSEL ──────────────────────────────────────────────────────────
  adWrap: { marginBottom: 12 },
  adScroll: { paddingHorizontal: H_PAD, gap: 12 },
  adCard: {
    width: width - H_PAD * 2,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  adIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  adEmoji: { fontSize: 26 },
  adCategoria: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  adNombre: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  adDesc: { fontSize: 12, lineHeight: 16 },
  adCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "center",
  },
  adCtaText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  widgetRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    gap: 16,
  },

  wCircle: {
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    overflow: "hidden",
  },
  wCircleEmoji: { fontSize: 24, lineHeight: 28 },
  wCircleBig: {
    fontSize: Platform.OS === "android" ? 22 : 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  wCircleLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  wCircleSub: { fontSize: 10, textAlign: "center" },

  // ─── Nuevos estilos de widgets card ──────────────────────────────────────────
  wCard: {
    width: WIDGET_SIZE,
    height: WIDGET_HEIGHT,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 5,
    overflow: "hidden",
  },
  wCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wCardTemp: {
    fontSize: Platform.OS === "android" ? 26 : 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  wCardTempBig: {
    fontSize: Platform.OS === "android" ? 36 : 42,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: Platform.OS === "android" ? 40 : 46,
  },
  wCardForecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto" as any,
  },
  wCardForecastItem: {
    alignItems: "center",
    gap: 2,
  },
  wCardForecastLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  wCardForecastTemp: {
    fontSize: 11,
    fontWeight: "700",
  },
  wCardCondicion: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  wCardSub: {
    fontSize: 11,
  },
  wCardLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  wCardRowInline: {
    flexDirection: "row",
    gap: 10,
  },
  wBarBg: {
    flexDirection: "row",
    height: 4,
    borderRadius: 99,
    overflow: "hidden",
    marginTop: 2,
    marginBottom: 2,
  },
  wBarFill: {
    height: 4,
  },

  // ─── CLIENTES WIDGET ────────────────────────────────────────────────────────
  clientesCard: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  clientesColumns: {
    flexDirection: "row",
    flex: 1,
  },
  clientesCol: {
    flex: 1,
  },
  clientesColHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  clientesScroll: {
    flex: 1,
  },
  clientesVDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  clientesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  clientesTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  clientesEmpty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  clientesEmptyText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  clienteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 8,
  },
  clienteRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clienteRankText: {
    fontSize: 11,
    fontWeight: "800",
  },
  clienteInfo: {
    flex: 1,
    gap: 1,
  },
  clienteNombre: {
    fontSize: 12,
    fontWeight: "600",
  },
  clienteMeta: {
    fontSize: 10,
  },
  cargaChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  cargaChipText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  cargaChipCount: {
    fontSize: 11,
    fontWeight: "700",
  },
});
