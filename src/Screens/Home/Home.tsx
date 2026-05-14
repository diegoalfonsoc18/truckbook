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
} from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
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
import { useTheme } from "../../constants/Themecontext";
import ItemIcon, { IconName } from "../../components/ItemIcon";
import { HOME_COLORS } from "./HomeConstants";
import { useClima } from "../../hooks/useClima";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const { width } = Dimensions.get("window");
const H_PAD = 20;

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
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Widget base props ────────────────────────────────────────────────────────
interface WProps { card: object; isDark: boolean }

const WBG = (isDark: boolean) => isDark ? "#1C1C1E" : "#FFFFFF";
const MUTED = (isDark: boolean) => isDark ? "#94A3B8" : "#6B7280";
const INK   = (isDark: boolean) => isDark ? "#FFFFFF"  : "#111827";

// ─── Widget: Clima ────────────────────────────────────────────────────────────
function WidgetClima({ card, isDark }: WProps) {
  const { temperatura, condicion, emoji, ciudad, cargando, error, sinPermiso } = useClima();
  const { colors: c } = useTheme();

  return (
    <View style={[s.widgetBase, card, { backgroundColor: WBG(isDark) }]}>
      {cargando ? (
        <ActivityIndicator size="small" color={c.accent} />
      ) : sinPermiso ? (
        <>
          <Text style={s.wEmoji}>📍</Text>
          <Text style={[s.wTitle, { color: INK(isDark) }]}>Clima</Text>
          <Text style={[s.wLabel, { color: MUTED(isDark) }]}>Sin permiso de ubicación</Text>
        </>
      ) : error ? (
        <>
          <Text style={s.wEmoji}>🌡</Text>
          <Text style={[s.wLabel, { color: MUTED(isDark) }]}>Sin señal</Text>
        </>
      ) : (
        <>
          <Text style={s.wEmoji}>{emoji}</Text>
          <Text style={[s.wBigNum, { color: INK(isDark) }]}>{temperatura}°</Text>
          <Text style={[s.wTitle, { color: INK(isDark) }]} numberOfLines={1}>{ciudad}</Text>
          <Text style={[s.wLabel, { color: MUTED(isDark) }]} numberOfLines={1}>{condicion}</Text>
        </>
      )}
    </View>
  );
}

// ─── Widget: Resumen del día ──────────────────────────────────────────────────
function WidgetResumen({ card, isDark }: WProps) {
  const gastos   = useGastosStore((state) => state.gastos);
  const ingresos = useIngresosStore((state) => state.ingresos);
  const hoy = fechaLocalHoy();
  const totalG = gastos.filter((g) => (g.fecha ?? g.created_at ?? "").startsWith(hoy))
                       .reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalI = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "").startsWith(hoy))
                         .reduce((a, i) => a + (i.monto ?? 0), 0);
  const balance = totalI - totalG;
  const balanceColor = balance >= 0
    ? (isDark ? "#34D399" : "#059669")
    : (isDark ? "#F87171" : "#DC2626");

  return (
    <View style={[s.widgetBase, card, { backgroundColor: WBG(isDark) }]}>
      <Text style={[s.wLabel, { color: MUTED(isDark) }]}>Resumen</Text>
      <Text style={[s.wBigNum, { color: balanceColor }]}>{formatCOP(balance)}</Text>
      <View style={[s.wDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }]} />
      <Text style={[s.wSmallRow, { color: isDark ? "#34D399" : "#059669" }]}>↑ {formatCOP(totalI)}</Text>
      <Text style={[s.wSmallRow, { color: isDark ? "#F87171" : "#DC2626" }]}>↓ {formatCOP(totalG)}</Text>
    </View>
  );
}

// ─── Widget: Combustible hoy ─────────────────────────────────────────────────
function WidgetCombustible({ card, isDark }: WProps) {
  const gastos = useGastosStore((state) => state.gastos);
  const hoy = fechaLocalHoy();
  const total = gastos
    .filter((g) => g.tipo_gasto === "combustible" && (g.fecha ?? g.created_at ?? "").startsWith(hoy))
    .reduce((a, g) => a + (g.monto ?? 0), 0);
  const cargas = gastos.filter(
    (g) => g.tipo_gasto === "combustible" && (g.fecha ?? g.created_at ?? "").startsWith(hoy),
  ).length;

  return (
    <View style={[s.widgetBase, card, { backgroundColor: WBG(isDark) }]}>
      <Text style={s.wEmoji}>⛽</Text>
      <Text style={[s.wBigNum, { color: INK(isDark) }]}>{formatCOP(total)}</Text>
      <Text style={[s.wTitle, { color: INK(isDark) }]}>Combustible</Text>
      <Text style={[s.wLabel, { color: MUTED(isDark) }]}>
        {cargas === 0 ? "Sin cargas hoy" : `${cargas} carga${cargas > 1 ? "s" : ""}`}
      </Text>
    </View>
  );
}

// ─── Widget: Viajes hoy ───────────────────────────────────────────────────────
function WidgetViajes({ card, isDark }: WProps) {
  const ingresos = useIngresosStore((state) => state.ingresos);
  const hoy = fechaLocalHoy();
  const viajes = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "").startsWith(hoy));
  const count = viajes.length;
  const totalKm = 0; // placeholder — no hay campo km en el store aún

  return (
    <View style={[s.widgetBase, card, { backgroundColor: WBG(isDark) }]}>
      <Text style={s.wEmoji}>🚛</Text>
      <Text style={[s.wBigNum, { color: INK(isDark) }]}>{count}</Text>
      <Text style={[s.wTitle, { color: INK(isDark) }]}>Viajes</Text>
      <Text style={[s.wLabel, { color: MUTED(isDark) }]}>
        {count === 0 ? "Sin viajes hoy" : `hoy`}
      </Text>
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
          <ItemIcon name={item.iconName} size={HOME_COLORS.heroIconSizes[item.id as keyof typeof HOME_COLORS.heroIconSizes] ?? HOME_COLORS.heroIconSize} />
        ) : (
          <Ionicons
            name={(item.icon || "grid-outline") as any}
            size={(HOME_COLORS.heroIconSizes[item.id as keyof typeof HOME_COLORS.heroIconSizes] ?? HOME_COLORS.heroIconSize) - 8}
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
      {/* Icono — capa exterior con sombra, interior con fondo semitransparente */}
      <View
        style={[
          s.listRowIconShadow,
          {
            shadowColor: accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 6,
            elevation: 6,
          },
        ]}>
        <View style={s.listRowIcon}>
          {item.iconName ? (
            <ItemIcon name={item.iconName} size={36} />
          ) : (
            <Ionicons
              name={(item.icon || "grid-outline") as any}
              size={32}
              color={accent}
            />
          )}
        </View>
      </View>

      {/* Label */}
      <Text style={[s.listRowLabel, { color: c.text }]} numberOfLines={1}>
        {item.name}
      </Text>

      {renderBadge?.(item)}

      {/* Right side */}
      {hasBadge ? (
        <View style={[s.listBadgePill, { backgroundColor: c.expense }]}>
          <Text style={s.listBadgeText}>
            {item.badgeCount! > 99 ? "99+" : item.badgeCount}
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
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
  const [tipoCamionInput, setTipoCamionInput] = useState<TipoCamion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(null);
  const [placaEditInput, setPlacaEditInput] = useState("");
  const [tipoCamionEditInput, setTipoCamionEditInput] = useState<TipoCamion | null>(null);

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
            tipo_camion: v.tipo_camion as TipoCamion,
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
      console.error("Error cargando vehículos:", err);
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
      setPlaca("");
      setTipoCamion(null);
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
    if (!vehiculoEditando || !placaEditInput.trim() || !tipoCamionEditInput) return;
    setGuardando(true);
    const placaNueva = placaEditInput.trim().toUpperCase();
    try {
      // Actualizar tipo de camión
      await supabase
        .from("vehiculos")
        .update({ tipo_camion: tipoCamionEditInput })
        .eq("placa", vehiculoEditando.placa);

      // Si cambió la placa, renombrar el registro
      if (placaNueva !== vehiculoEditando.placa) {
        await supabase.from("vehiculos").insert([{ placa: placaNueva, tipo_camion: tipoCamionEditInput }]);
        await supabase.from("vehiculo_conductores").update({ vehiculo_placa: placaNueva }).eq("vehiculo_placa", vehiculoEditando.placa);
        await supabase.from("vehiculos").delete().eq("placa", vehiculoEditando.placa);
        if (placaActual === vehiculoEditando.placa) {
          setPlaca(placaNueva);
          setTipoCamion(tipoCamionEditInput);
        }
      } else if (tipoCamionEditInput !== vehiculoEditando.tipo_camion && placaActual === vehiculoEditando.placa) {
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
    Alert.alert(
      "Quitar vehículo",
      `¿Quitar ${v.placa} de tu lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            const result = await removerConductorDeVehiculo(v.id);
            if (!result.success) {
              Alert.alert("Error", result.error || "No se pudo quitar el vehículo");
              return;
            }
            if (placaActual === v.placa) setPlaca("");
            await cargarVehiculos();
          },
        },
      ],
    );
  };

  const handleAgregarVehiculo = async () => {
    if (!user?.id || !placaInput.trim() || !tipoCamionInput) return;
    setGuardando(true);
    const placa = placaInput.trim().toUpperCase();
    const result = await registrarVehiculoPropietario(user.id, placa, tipoCamionInput);
    setGuardando(false);
    if (!result.success) {
      Alert.alert("Error", result.error || "No se pudo registrar el vehículo");
      return;
    }
    await cargarVehiculos();
    setPlacaInput("");
    setTipoCamionInput(null);
  };

  const tipoCamionData = getTipoCamionData(tipoCamion);
  const camionIconName: IconName = tipoCamion
    ? ICON_MAP[tipoCamion]
    : "conductor";
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userName =
    (user?.user_metadata as any)?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();

  // Shared card style — Apple: blanco puro / dark elevated
  // Estilo base compartido (sombra/borde)
  const cardBase = {
    borderRadius: 20,
    ...(isDark
      ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.09,
          shadowRadius: 14,
          elevation: 4,
        }),
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
          {/* HEADER */}
          <Animated.View
            style={[s.header, { transform: [{ translateY: headerY }] }]}>
            <View style={{ flex: 1 }}>
              <View style={s.rolePill}>
                <View style={[s.roleDot, { backgroundColor: c.accent }]} />
                <Text style={[s.roleText, { color: c.textMuted }]}>
                  {getGreeting()} · Conductor
                </Text>
              </View>
              <Text
                style={[s.greetingName, { color: c.text }]}
                numberOfLines={1}>
                {userName.split(" ")[0]}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Cuenta")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Mi cuenta"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View
                style={[
                  s.avatarRing,
                  {
                    borderColor: isDark
                      ? c.accent + "70"
                      : "rgba(255,255,255,0.95)",
                    shadowColor: c.accent,
                    shadowOpacity: isDark ? 0.35 : 0.2,
                  },
                ]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={s.avatar} />
                ) : (
                  <View
                    style={[s.avatarFallback, { backgroundColor: c.accent }]}>
                    <Text style={[s.avatarText, { color: c.accentText }]}>
                      {userInitials}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* VEHICLE CARD */}
          {showCamionHeader && (
            <AnimatedPressable
              style={[
                s.vehicleCard,
                {
                  backgroundColor: isDark
                    ? HOME_COLORS.vehicleCardBgDark
                    : HOME_COLORS.vehicleCardBg,
                },
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
                        <Text style={[s.vehicleLabel, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                          Vehículo activo
                        </Text>
                        <Text style={[s.vehicleType, { color: HOME_COLORS.vehicleCardText }]}>
                          {vehicleCardTitle || tipoCamionData?.label || ""}
                        </Text>
                        <View style={[s.placaBadge, { backgroundColor: c.plateYellow, borderColor: c.plateBorder, borderWidth: 1 }]}>
                          <Text style={[s.placaText, { color: c.plateText }]}>
                            {placaActual}
                          </Text>
                        </View>
                        {conductorActual && (
                          <Text style={[s.vehicleConductor, { color: HOME_COLORS.vehicleCardTextMuted }]} numberOfLines={1}>
                            {conductorActual}
                          </Text>
                        )}
                      </View>
                      <ItemIcon name={camionIconName} size={HOME_COLORS.vehicleIconSize} />
                    </>
                  ) : (
                    <>
                      {/* Sin vehículo — estado vacío */}
                      <View style={s.vehicleInfo}>
                        <Text style={[s.vehicleType, { color: HOME_COLORS.vehicleCardText }]}>
                          Sin vehículo
                        </Text>
                        <Text style={[s.vehicleHint, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                          Toca para seleccionar un camión
                        </Text>
                      </View>
                      <ItemIcon name="conductor" size={HOME_COLORS.vehicleIconSize} />
                    </>
                  )}
                </View>
            </AnimatedPressable>
          )}

          {/* GRID */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.gridContainer}>
            {/* WIDGETS — fila horizontal con scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.widgetScroll}
              style={s.widgetScrollWrap}>
              <WidgetClima      card={cardBase} isDark={isDark} />
              <WidgetResumen    card={cardBase} isDark={isDark} />
              <WidgetCombustible card={cardBase} isDark={isDark} />
              <WidgetViajes     card={cardBase} isDark={isDark} />
            </ScrollView>

            {/* HERO — dos cards cuadradas lado a lado */}
            {items.length > 0 && (
              <View style={s.heroRow}>
                <HeroSquareCard
                  item={items[0]}
                  card={{
                    ...card,
                    backgroundColor: isDark
                      ? "#1C1C1E"
                      : HOME_COLORS.heroCard1Bg,
                  }}
                  colors={c}
                  onPress={onItemPress ?? (() => {})}
                  renderBadge={renderBadge}
                />
                {items.length > 1 && (
                  <HeroSquareCard
                    item={items[1]}
                    card={{
                      ...card,
                      backgroundColor: isDark
                        ? "#1C1C1E"
                        : HOME_COLORS.heroCard2Bg,
                    }}
                    colors={c}
                    onPress={onItemPress ?? (() => {})}
                    renderBadge={renderBadge}
                  />
                )}
              </View>
            )}

            {/* LIST ROWS — resto de items, estilo Apple Support */}
            {items.length > 2 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionLabel, { color: c.text }]}>
                    Herramientas
                  </Text>
                </View>
                <View style={s.listSection}>
                  {items.slice(2).map((item, index) => (
                    <ListRow
                      key={item.id}
                      item={item}
                      index={index + 1}
                      card={card}
                      colors={c}
                      onPress={onItemPress ?? (() => {})}
                      renderBadge={renderBadge}
                    />
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
                    <Text style={[s.sheetTitle, { color: c.text, marginBottom: 20 }]}>
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
                          const vIconName: IconName = tipo ? ICON_MAP[tipo.id] : "conductor";
                          return (
                            <Swipeable
                              key={v.id}
                              overshootRight={false}
                              renderRightActions={() => (
                                <View style={s.swipeActions}>
                                  <TouchableOpacity
                                    style={[s.swipeActionBtn, { backgroundColor: "#3B82F6" }]}
                                    onPress={() => abrirEdicion(v)}>
                                    <Ionicons name="pencil-outline" size={20} color="#fff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[s.swipeActionBtn, { backgroundColor: "#EF4444" }]}
                                    onPress={() => handleEliminarVehiculo(v)}>
                                    <Ionicons name="trash-outline" size={20} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              )}>
                              <TouchableOpacity
                                style={[
                                  s.vehicleOption,
                                  { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
                                  isActive && { borderWidth: 1.5, borderColor: c.accent },
                                ]}
                                onPress={() => handleSeleccionarVehiculo(v)}
                                activeOpacity={0.7}>
                                <View style={[s.vehicleOptionIcon, { backgroundColor: tipo?.color || c.accent }]}>
                                  <ItemIcon name={vIconName} size={28} />
                                </View>
                                <View style={s.vehicleOptionInfo}>
                                  <Text style={[s.vehicleOptionPlaca, { color: c.text }]}>
                                    {v.placa}
                                  </Text>
                                  <Text style={[s.vehicleOptionType, { color: c.textSecondary }]}>
                                    {tipo?.label || "Vehículo"}
                                  </Text>
                                </View>
                                {isActive && (
                                  <View style={[s.statusBadge, { backgroundColor: c.accent }]}>
                                    <Ionicons name="checkmark" size={14} color={c.accentText} />
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
                      <View style={[s.addSection, { borderTopColor: c.divider }]}>
                        <View style={s.editSectionHeader}>
                          <Text style={[s.selectorLabel, { color: c.text, marginBottom: 0 }]}>
                            Editar — {vehiculoEditando.placa}
                          </Text>
                          <TouchableOpacity onPress={() => setVehiculoEditando(null)}>
                            <Ionicons name="close" size={20} color={c.textMuted} />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={[s.placaInputField, { backgroundColor: c.surface, color: c.text, borderColor: c.accent, marginTop: 12 }]}
                          placeholder="Placa"
                          placeholderTextColor={c.textMuted}
                          value={placaEditInput}
                          onChangeText={(t) => setPlacaEditInput(t.toUpperCase())}
                          autoCapitalize="characters"
                          maxLength={7}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={s.tipoScroll}>
                          {TIPOS_CAMION.map((tipo) => {
                            const selected = tipoCamionEditInput === tipo.id;
                            return (
                              <TouchableOpacity
                                key={tipo.id}
                                style={[
                                  s.tipoChip,
                                  { backgroundColor: c.surface, borderColor: c.border },
                                  selected && { backgroundColor: tipo.color + "22", borderColor: tipo.color },
                                ]}
                                onPress={() => setTipoCamionEditInput(tipo.id)}>
                                <ItemIcon name={tipo.iconName} size={32} />
                                <Text style={[s.tipoChipLabel, { color: selected ? tipo.color : c.textSecondary }]}>
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
                            (!placaEditInput.trim() || !tipoCamionEditInput) && { opacity: 0.4 },
                          ]}
                          onPress={handleGuardarEdicion}
                          disabled={!placaEditInput.trim() || !tipoCamionEditInput || guardando}>
                          {guardando ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={[s.confirmBtnText, { color: "#fff" }]}>Guardar cambios</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ── Separador + sección agregar ── */}
                    <View style={[s.addSection, { borderTopColor: c.divider }]}>
                      <Text style={[s.selectorLabel, { color: c.textSecondary, marginBottom: 12 }]}>
                        Agregar vehículo
                      </Text>

                      <TextInput
                        style={[s.placaInputField, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
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
                                { backgroundColor: c.surface, borderColor: c.border },
                                selected && { backgroundColor: tipo.color + "22", borderColor: tipo.color },
                              ]}
                              onPress={() => setTipoCamionInput(tipo.id)}>
                              <ItemIcon name={tipo.iconName} size={32} />
                              <Text style={[s.tipoChipLabel, { color: selected ? tipo.color : c.textSecondary }]}>
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
                          (!placaInput.trim() || !tipoCamionInput) && { opacity: 0.4 },
                        ]}
                        onPress={handleAgregarVehiculo}
                        disabled={!placaInput.trim() || !tipoCamionInput || guardando}>
                        {guardando ? (
                          <ActivityIndicator size="small" color={c.accentText} />
                        ) : (
                          <Text style={[s.confirmBtnText, { color: c.accentText }]}>
                            Registrar vehículo
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={s.cancelTouchable} onPress={cerrarModal}>
                      <Text style={[s.cancelText, { color: c.textSecondary }]}>Cerrar</Text>
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
  },
  heroSquare: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 148,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  heroSquareIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
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

  // VEHICLE CARD — double-bezel
  vehicleCard: {
    borderRadius: 20,
    overflow: "hidden",
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
    gap: 5,
  },
  vehicleLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  vehicleType: { fontSize: HOME_COLORS.vehicleTypeSize, fontWeight: HOME_COLORS.vehicleTypeWeight, letterSpacing: -0.3 },
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
  vehicleConductor: { fontSize: HOME_COLORS.vehicleConductorSize, marginTop: 3 },
  placaBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    marginBottom: 14,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  gridContainer: { paddingBottom: 100 },

  // Apple Support — lista vertical de filas
  listSection: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 14,
    borderRadius: 16,
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  vehicleOptionType: {
    fontSize: 13,
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
  selectorLabel: { fontSize: 13, fontWeight: "600", marginBottom: 10 },
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
  tipoChipLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmBtnText: { fontSize: 16, fontWeight: "700" },

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
  cancelText: { fontSize: 15, fontWeight: "500" },

  // ─── WIDGETS ────────────────────────────────────────────────────────────────
  widgetScrollWrap: {
    marginBottom: 10,
  },
  widgetScroll: {
    gap: 10,
    paddingRight: 4,
  },
  widgetBase: {
    width: 126,
    borderRadius: 24,
    padding: 14,
    justifyContent: "flex-end",
    gap: 2,
  },

  // Shared widget typography
  wEmoji:    { fontSize: 26, lineHeight: 32, marginBottom: 4 },
  wBigNum:   { fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  wTitle:    { fontSize: 12, fontWeight: "600", letterSpacing: -0.1 },
  wLabel:    { fontSize: 11 },
  wDivider:  { height: 1, marginVertical: 6 },
  wSmallRow: { fontSize: 12, fontWeight: "600" },
});
