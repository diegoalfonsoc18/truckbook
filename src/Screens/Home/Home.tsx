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
import { usePicoYPlaca } from "../../hooks/usePicoYPlaca";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import logger from "../../utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GEMINI_API_KEY, GEMINI_ENDPOINT } from "../../config/aiConfig";
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
import {
  programarRecordatoriosPendientes,
  programarRecordatorioIACobros,
} from "../../services/pendientesNotificacionService";
import { normalizarMercancias } from "../../services/mercanciaService";

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
  // pico en y≈25, extremos en y≈108.
  const R   = 62;
  const CY  = 87;

  const START  = 160;
  const SPAN   = 220;
  const FILL_W = 8;

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

  // Fondo adaptivo — igual que el card financiero anterior
  const cardBg =
    balance >= 0
      ? isDark ? "#0D2E1A" : "#EDFAF3"
      : isDark ? "#2E0D0D" : "#FAEAEA";

  // Textos: blanco sobre fondo oscuro, colores fuertes sobre fondo claro
  const balTextColor = isDark ? "#FFFFFF" : (balance >= 0 ? "#059669" : "#DC2626");
  const mutedClr     = isDark ? "#4B5268" : "#6B7280";
  const ingClr       = isDark ? "#4ADE80" : "#059669";
  const gasClr       = isDark ? "#F87171" : "#DC2626";
  const tickClr      = isDark ? "#1A3826" : (balance >= 0 ? "#C5DDD0" : "#DEC5C5");
  const tickMajClr   = isDark ? "#2A4A38" : (balance >= 0 ? "#A3C4B0" : "#C4A3A3");

  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <SvgGradient id="gfill" x1={gradLX} y1={0} x2={gradRX} y2={0} gradientUnits="userSpaceOnUse">
          <Stop offset="0"    stopColor="#EF4444" />
          <Stop offset="0.42" stopColor="#FFB800" />
          <Stop offset="1"    stopColor="#22C55E" />
        </SvgGradient>
      </Defs>

      {/* ── Fondo adaptivo ── */}
      <Rect width={W} height={H} fill={cardBg} rx={16} />

      {/* ── Ticks del arco completo ── */}
      {ticks.map((t, idx) => (
        <Line key={idx}
          x1={t.o.x} y1={t.o.y} x2={t.i.x} y2={t.i.y}
          stroke={t.major ? tickMajClr : tickClr}
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

      {/* ── Dot brillante en la punta ── */}
      <Circle cx={dotPt.x} cy={dotPt.y} r={13} fill={dotColor} opacity={0.15} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={7}  fill={dotColor} opacity={0.40} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={4}  fill={dotColor} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={2}  fill="#FFFFFF"  opacity={0.9} />

      {/* ── Balance — número grande ── */}
      <SvgText
        x={CX} y={CY + 8}
        fontSize={26} fontWeight="800"
        fill={balTextColor} textAnchor="middle" letterSpacing={-1}>
        {fmt(balance)}
      </SvgText>

      {/* ── Estado ── */}
      <SvgText
        x={CX} y={CY + 23}
        fontSize={10} fontWeight="700"
        fill={statusColor} textAnchor="middle">
        {statusLabel}
      </SvgText>

      {/* ── Ingresos (izq) y Gastos (der) ── */}
      <SvgText x={14} y={H - 28} fontSize={9} fontWeight="600"
        fill={ingClr} textAnchor="start">
        {`↑ ${fmt(totalI)}`}
      </SvgText>
      <SvgText x={W - 14} y={H - 28} fontSize={9} fontWeight="600"
        fill={gasClr} textAnchor="end">
        {`↓ ${fmt(totalG)}`}
      </SvgText>

      {/* ── Semana ── */}
      <SvgText x={CX} y={H - 14} fontSize={8} fontWeight="500"
        fill={mutedClr} textAnchor="middle">
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

// ─── Widget: Insight IA ───────────────────────────────────────────────────────
// ─── Widget: Pendientes por cobrar ───────────────────────────────────────────
//
//  ● Pendientes · Por cobrar
//  $1.2M                          ← total pendiente
//  ─────────────────────────────
//  [AR] Arena           $450K     ← avatar + cliente + monto
//  [CO] Construmart     $180K
//  [+2 más…]                      ← overflow si hay más de 3
//

/** Formateador compacto COP */
function fmtI(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(a / 1_000).toFixed(0)}K`;
  return `$${a.toFixed(0)}`;
}

/** Cuántos días han pasado desde una fecha YYYY-MM-DD */
function diasDesde(fecha: string): number {
  const d    = new Date(fecha + "T00:00:00");
  const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.floor((hoy.getTime() - d.getTime()) / 86_400_000);
}

function labelDias(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7)   return `Hace ${dias} días`;
  if (dias < 30)  return `Hace ${Math.floor(dias / 7)} sem.`;
  return `Hace ${Math.floor(dias / 30)} mes${Math.floor(dias / 30) > 1 ? "es" : ""}`;
}

// Paleta de avatares — determinista por índice
const AVATAR_COLORS = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6"];

function avatarColor(i: number) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

function initials(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
}

// ─── Modal detalle de pendientes ─────────────────────────────────────────────
const CACHE_PEND_IA = "@truckbook_pend_modal_ia_v1";

interface ContactTarget {
  id:      string;
  cliente: string;
  monto:   number;
  dias:    number;
}

/** Mensaje de cobro por WhatsApp — plantilla sin IA para respuesta instantánea */
function mensajeCobroWA(cliente: string, monto: number, dias: number): string {
  const m = fmtI(monto);
  if (dias === 0) return `Hola ${cliente}, le saludo. Quedó pendiente el pago del flete por ${m} de hoy. ¿Podría confirmarlo? ¡Gracias!`;
  if (dias === 1) return `Hola ${cliente}, le saludo. Le recuerdo que ayer quedó pendiente el flete por ${m}. ¿Cuándo lo cuadramos? ¡Gracias!`;
  return `Hola ${cliente}, le saludo. Quería recordarle el flete por ${m} registrado hace ${dias} días que quedó pendiente de pago. ¿Cuándo podemos cuadrar? ¡Gracias!`;
}

/** Limpia y formatea un número colombiano para wa.me / tel: */
function formatearTel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  return digits;
}

function ModalPendientes({
  visible, onClose, pendientes, isDark,
}: {
  visible:    boolean;
  onClose:    () => void;
  pendientes: ReturnType<typeof useIngresosStore.getState>["ingresos"];
  isDark:     boolean;
}) {
  const { placa } = useVehiculoStore();
  const [geminiMsg, setGeminiMsg]       = useState<string | null>(null);
  const [loadingGem, setLoadingGem]     = useState(false);
  const [cobrando, setCobrando]         = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<ContactTarget | null>(null);
  const [phoneInput, setPhoneInput]     = useState("");

  const AMBER    = "#FBBF24";
  const GREEN    = "#22C55E";
  const WA_GREEN = "#25D366";
  const ink      = isDark ? "#F1F5F9" : "#111827";
  const muted    = isDark ? "#64748B" : "#9CA3AF";
  const divClr   = isDark ? "#2A1800" : "#F0E6CC";
  const modalBg  = isDark ? "#160E00" : "#FFFBF0";
  const cardBg   = isDark ? "#2A1800" : "#FFF8E7";
  const inputBg  = isDark ? "#1E1200" : "#FFF3DC";
  const inputBdr = isDark ? "#3D2600" : "#E8C97A";
  const panelBg  = isDark ? "#1A0F00" : "#FFFAEE";

  // ── Cerrar el panel de contacto al cerrar el modal ─────────────────────────
  useEffect(() => {
    if (!visible) { setContactTarget(null); setPhoneInput(""); }
  }, [visible]);

  // ── Gemini: consejo al abrir el modal ──────────────────────────────────────
  useEffect(() => {
    if (!visible || pendientes.length === 0) { setGeminiMsg(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_PEND_IA);
        if (raw) {
          const { ts, msg } = JSON.parse(raw);
          if (Date.now() - ts < 6 * 3_600_000 && msg) { if (!cancelled) setGeminiMsg(msg); return; }
        }
      } catch {}
      if (!GEMINI_API_KEY) return;
      if (!cancelled) setLoadingGem(true);
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const lines = pendientes.slice(0, 4).map((p) => {
        const cl   = (p.descripcion ?? "Flete").split(" · ")[0].trim();
        const dias = p.fecha ? Math.floor((hoy.getTime() - new Date(p.fecha + "T00:00:00").getTime()) / 86_400_000) : 0;
        return `${cl}: ${fmtI(p.monto ?? 0)} (hace ${dias}d)`;
      }).join(", ");
      const total = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);
      const prompt =
        `Eres asistente de un camionero colombiano. Tiene ${pendientes.length} cuenta(s) por cobrar: ${lines}. Total: ${fmtI(total)}.\n` +
        `Genera UN consejo corto (máximo 80 caracteres) para motivarlo a cobrar hoy. Español colombiano informal. Sin emojis. Solo el texto.`;
      try {
        const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 60 } }),
        });
        if (res.ok) {
          const json = await res.json();
          const msg  = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
          if (!cancelled && msg) {
            setGeminiMsg(msg);
            try { await AsyncStorage.setItem(CACHE_PEND_IA, JSON.stringify({ ts: Date.now(), msg })); } catch {}
          }
        }
      } catch {}
      if (!cancelled) setLoadingGem(false);
    })();
    return () => { cancelled = true; };
  }, [visible, pendientes.length]);

  // ── Marcar como cobrado (con confirmación previa vía Alert) ────────────────
  const confirmarCobro = (id: string, cliente: string, monto: number) => {
    Alert.alert(
      "¿Confirmar cobro?",
      `¿Marcar el flete de ${cliente} por ${fmtI(monto)} como pagado?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cobrado",
          style: "default",
          onPress: async () => {
            setCobrando(id);
            const { error } = await supabase
              .from("conductor_ingresos")
              .update({ estado: "pagado" })
              .eq("id", id);
            if (!error && placa) useIngresosStore.getState().cargarIngresosDelDB(placa);
            setCobrando(null);
          },
        },
      ]
    );
  };

  // ── Acciones de contacto ───────────────────────────────────────────────────
  const handleLlamar = () => {
    if (!contactTarget) return;
    const tel = formatearTel(phoneInput);
    if (!tel) {
      Alert.alert("Número requerido", "Ingresa el número del cliente para llamar.");
      return;
    }
    Linking.openURL(`tel:${tel}`).catch(() =>
      Alert.alert("Error", "No se pudo abrir el marcador telefónico.")
    );
  };

  const handleWhatsApp = () => {
    if (!contactTarget) return;
    const msg  = encodeURIComponent(mensajeCobroWA(contactTarget.cliente, contactTarget.monto, contactTarget.dias));
    const tel  = formatearTel(phoneInput);
    const url  = tel ? `https://wa.me/${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir WhatsApp.")
    );
  };

  const cerrarPanel = () => { setContactTarget(null); setPhoneInput(""); };

  const totalPend = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        {/* ── Bottom sheet principal ── */}
        <View style={{ backgroundColor: modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "82%" }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "#3A2800" : "#E0C98A" }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
            <View>
              <Text style={{ fontSize: 19, fontWeight: "700", color: ink }}>Por cobrar</Text>
              <Text style={{ fontSize: 13, color: AMBER, fontWeight: "600", marginTop: 1 }}>
                {fmtI(totalPend)} · {pendientes.length} flete{pendientes.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={muted} />
            </TouchableOpacity>
          </View>

          {/* Gemini card */}
          {(loadingGem || geminiMsg) && (
            <View style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 2, backgroundColor: cardBg, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: AMBER, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              {loadingGem
                ? <ActivityIndicator size="small" color={AMBER} />
                : <Text style={{ fontSize: 14 }}>✨</Text>
              }
              <Text style={{ flex: 1, fontSize: 12.5, color: ink, lineHeight: 18 }}>
                {loadingGem ? "Analizando tus pendientes..." : geminiMsg}
              </Text>
            </View>
          )}

          {/* Lista de pendientes */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 }}>
            {pendientes.map((item, i) => {
              const cliente   = (item.descripcion ?? item.tipo_ingreso ?? "Flete").split(" · ")[0].trim();
              const partes    = (item.descripcion ?? "").split(" · ");
              const subtitulo = partes.length > 1 ? partes.slice(1).join(" · ") : null;
              const dias      = item.fecha ? diasDesde(item.fecha) : 0;
              const color     = avatarColor(i);
              const cargando  = cobrando === item.id;

              return (
                <View key={item.id}>
                  <View style={{ paddingVertical: 13 }}>
                    {/* Fila principal: avatar + info + monto */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      {/* Avatar */}
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color + "25", borderWidth: 1.5, borderColor: color + "55", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color }}>{initials(cliente)}</Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: ink }}>{cliente}</Text>
                        {subtitulo && <Text numberOfLines={1} style={{ fontSize: 11, color: muted, marginTop: 1 }}>{subtitulo}</Text>}
                        <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>{labelDias(dias)}</Text>
                      </View>

                      {/* Monto */}
                      <Text style={{ fontSize: 15, fontWeight: "700", color: AMBER }}>{fmtI(item.monto ?? 0)}</Text>
                    </View>

                    {/* Fila de acciones */}
                    <View style={{ flexDirection: "row", gap: 8, marginLeft: 54 }}>
                      {/* Llamar — abre panel para ingresar número */}
                      <TouchableOpacity
                        onPress={() => { setContactTarget({ id: item.id, cliente, monto: item.monto ?? 0, dias }); setPhoneInput(""); }}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: isDark ? "#0D2E1A" : "#E8FFF1", borderWidth: 1, borderColor: GREEN + "55", borderRadius: 10, paddingVertical: 7 }}>
                        <Feather name="phone" size={13} color={GREEN} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN }}>Llamar</Text>
                      </TouchableOpacity>

                      {/* WhatsApp — abre directo, sin panel (número opcional en wa.me) */}
                      <TouchableOpacity
                        onPress={() => {
                          const msg = encodeURIComponent(mensajeCobroWA(cliente, item.monto ?? 0, dias));
                          Linking.openURL(`https://wa.me/?text=${msg}`).catch(() =>
                            Alert.alert("Error", "No se pudo abrir WhatsApp.")
                          );
                        }}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: isDark ? "#052E16" : "#E8FFF4", borderWidth: 1, borderColor: WA_GREEN + "55", borderRadius: 10, paddingVertical: 7 }}>
                        <MaterialCommunityIcons name="whatsapp" size={14} color={WA_GREEN} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: WA_GREEN }}>WhatsApp</Text>
                      </TouchableOpacity>

                      {/* Cobrado — pide confirmación */}
                      <TouchableOpacity
                        onPress={() => confirmarCobro(item.id, cliente, item.monto ?? 0)}
                        disabled={!!cobrando}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#22C55E1A", borderWidth: 1, borderColor: "#22C55E55", borderRadius: 10, paddingVertical: 7 }}>
                        {cargando
                          ? <ActivityIndicator size="small" color={GREEN} style={{ width: 13, height: 13 }} />
                          : <Feather name="check" size={13} color={GREEN} />
                        }
                        <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>Cobrado</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {i < pendientes.length - 1 && <View style={{ height: 0.5, backgroundColor: divClr }} />}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Panel de contacto (overlay sobre el bottom sheet) ── */}
        {contactTarget && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {/* Dim tap-to-close */}
            <TouchableWithoutFeedback onPress={cerrarPanel}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            {/* Panel card */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ backgroundColor: panelBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 20 }}>
                {/* Handle + close */}
                <View style={{ alignItems: "center", marginBottom: 14 }}>
                  <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: inputBdr }} />
                </View>

                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: ink }}>Contactar cliente</Text>
                    <Text style={{ fontSize: 13, color: AMBER, fontWeight: "600", marginTop: 2 }}>
                      {contactTarget.cliente} · {fmtI(contactTarget.monto)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={cerrarPanel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={20} color={muted} />
                  </TouchableOpacity>
                </View>

                {/* Phone input */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: inputBg, borderWidth: 1, borderColor: inputBdr, borderRadius: 12, paddingHorizontal: 14, height: 48, marginTop: 14, marginBottom: 14 }}>
                  <Feather name="phone" size={16} color={muted} />
                  <TextInput
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    keyboardType="phone-pad"
                    placeholder="Número del cliente (opcional)"
                    placeholderTextColor={muted}
                    style={{ flex: 1, fontSize: 15, color: ink }}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {phoneInput.length > 0 && (
                    <TouchableOpacity onPress={() => setPhoneInput("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="x-circle" size={16} color={muted} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={{ fontSize: 11, color: muted, marginBottom: 16, lineHeight: 15 }}>
                  Si no ingresas número, WhatsApp te pedirá elegir el contacto. Para llamar el número es obligatorio.
                </Text>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleLlamar}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GREEN + "18", borderWidth: 1.5, borderColor: GREEN + "55", borderRadius: 14, paddingVertical: 14 }}>
                    <Feather name="phone-call" size={18} color={GREEN} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: GREEN }}>Llamar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleWhatsApp}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: WA_GREEN + "18", borderWidth: 1.5, borderColor: WA_GREEN + "55", borderRadius: 14, paddingVertical: 14 }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={WA_GREEN} />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: WA_GREEN }}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Widget: Pendientes (miniatura) ──────────────────────────────────────────
function WidgetInsightIA({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const [modalVisible, setModalVisible] = useState(false);

  const pendientes = React.useMemo(() =>
    ingresos.filter((i) => i.estado === "pendiente").sort((a, b) => ((b.fecha ?? "") > (a.fecha ?? "") ? 1 : -1)),
    [ingresos],
  );

  // Recordatorio IA: se reprograma cada vez que cambia la lista de pendientes
  useEffect(() => {
    programarRecordatorioIACobros(pendientes).catch(() => {});
  }, [pendientes.length]);

  const totalPend = pendientes.reduce((a, i) => a + (i.monto ?? 0), 0);
  const mostrados = pendientes.slice(0, 3);
  const resto     = pendientes.length - 3;

  const AMBER  = "#FBBF24";
  const cardBg = isDark ? "#2A1500" : "#FFF3E0";
  const ink    = isDark ? "#F1F5F9" : "#111827";
  const muted  = isDark ? "#3D536E" : "#9CA3AF";
  const divClr = isDark ? "#3A1F00" : "#F5E6CC";

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => pendientes.length > 0 && setModalVisible(true)}
        style={[s.wCard, { backgroundColor: cardBg, paddingHorizontal: 13, paddingVertical: 12, gap: 0 }]}>

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER }} />
          <Text style={{ fontSize: 8.5, fontWeight: "600", color: muted }}>Pendientes · Por cobrar</Text>
        </View>

        {/* Total */}
        <Text style={{ fontSize: 22, fontWeight: "700", color: pendientes.length > 0 ? AMBER : "#22C55E", letterSpacing: -0.6, lineHeight: 28, marginBottom: 8 }}>
          {pendientes.length > 0 ? fmtI(totalPend) : "Al día ✓"}
        </Text>

        {/* Lista mini o vacío */}
        {pendientes.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>🎉</Text>
            <Text style={{ fontSize: 10, color: muted, textAlign: "center" }}>Sin cuentas pendientes</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {mostrados.map((item, i) => {
              const cliente = (item.descripcion ?? item.tipo_ingreso ?? "Flete").split(" · ")[0].trim();
              const dias    = item.fecha ? diasDesde(item.fecha) : 0;
              const color   = avatarColor(i);
              const isLast  = i === mostrados.length - 1 && resto <= 0;
              return (
                <View key={item.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color + "30", borderWidth: 1, borderColor: color + "60", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 8.5, fontWeight: "700", color }}>{initials(cliente)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: ink }}>{cliente}</Text>
                      <Text style={{ fontSize: 8, color: muted, marginTop: 0.5 }}>{labelDias(dias)}</Text>
                    </View>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: AMBER }}>{fmtI(item.monto ?? 0)}</Text>
                  </View>
                  {!isLast && <View style={{ height: 0.5, backgroundColor: divClr, marginLeft: 34 }} />}
                </View>
              );
            })}
            {resto > 0 && (
              <Text style={{ fontSize: 9, color: AMBER, marginTop: 4, textAlign: "center", fontWeight: "600" }}>
                +{resto} más → ver todos
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Modal detalle */}
      <ModalPendientes
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        pendientes={pendientes}
        isDark={isDark}
      />
    </>
  );
}

// ─── Widget: Clientes frecuentes ─────────────────────────────────────────────
function WidgetClientes({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const { colors: c } = useTheme();

  // Estado normalizado (asíncrono vía Gemini)
  const [topCarga, setTopCarga] = useState<Array<[string, number]>>([]);

  // ── Paso 1: extracción sync de clientes y mercancías brutas ──────────────
  const { clienteData, rawMercancias } = React.useMemo(() => {
    const clienteMap = new Map<
      string,
      { viajes: number; total: number; ultimaFecha: string }
    >();
    const rawList: string[] = [];

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

      // Mercancía: último segmento (si hay ruta con →, es el penúltimo; si no, el 2do)
      const mercancia =
        partes.length >= 3
          ? partes[partes.length - 1]?.trim()
          : partes.length === 2
            ? partes[1]?.trim()
            : null;
      if (mercancia && !mercancia.includes("→")) {
        rawList.push(mercancia);
      }
    }

    const clientes = [...clienteMap.entries()]
      .sort((a, b) => b[1].viajes - a[1].viajes)
      .slice(0, 3);

    return { clienteData: clientes, rawMercancias: rawList };
  }, [ingresos]);

  // ── Paso 2: normalización async y re-agrupación por nombre canónico ──────
  // Se dispara solo cuando cambia la lista de mercancías brutas
  const rawFingerprint = rawMercancias.join("|");
  useEffect(() => {
    if (rawMercancias.length === 0) { setTopCarga([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const normMap = await normalizarMercancias(rawMercancias);
        if (cancelled) return;

        // Re-agrupar por nombre canónico (fusiona variantes)
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) {
          const canonical = normMap.get(raw) ?? raw;
          cargaMap.set(canonical, (cargaMap.get(canonical) ?? 0) + 1);
        }

        const sorted = [...cargaMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        setTopCarga(sorted);
      } catch {
        // Fallback: usar nombres raw si Gemini falla
        const cargaMap = new Map<string, number>();
        for (const raw of rawMercancias) {
          cargaMap.set(raw, (cargaMap.get(raw) ?? 0) + 1);
        }
        if (!cancelled) {
          setTopCarga(
            [...cargaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
          );
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFingerprint]);

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
            {/* WIDGETS — fila de dos columnas */}
            <View style={s.widgetRow}>
              <WidgetResumen isDark={isDark} />
              <WidgetInsightIA isDark={isDark} />
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
