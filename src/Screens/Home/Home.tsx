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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import supabase from "../../config/SupaBaseConfig";
import {
  cargarVehiculosConEstado,
  solicitarAccesoVehiculo,
  type EstadoAutorizacion,
} from "../../services/vehiculoAutorizacionService";
import { useTheme } from "../../constants/Themecontext";
import ItemIcon, { IconName } from "../../components/ItemIcon";

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
    color: "#00D9A5",
  },
  {
    id: "volqueta" as TipoCamion,
    label: "Volqueta",
    iconName: "volqueta2" as IconName,
    color: "#FFB800",
  },
  {
    id: "furgon" as TipoCamion,
    label: "Furgón",
    iconName: "furgon" as IconName,
    color: "#6C5CE7",
  },
  {
    id: "grua" as TipoCamion,
    label: "Grúa",
    iconName: "grua" as IconName,
    color: "#E94560",
  },
  {
    id: "cisterna" as TipoCamion,
    label: "Cisterna",
    iconName: "cisterna" as IconName,
    color: "#74B9FF",
  },
  {
    id: "planchon" as TipoCamion,
    label: "Planchón",
    iconName: "planchon" as IconName,
    color: "#FDCB6E",
  },
  {
    id: "portacontenedor" as TipoCamion,
    label: "Porta cont.",
    iconName: "portaContenedor" as IconName,
    color: "#00CEC9",
  },
];

// ─── Sizes ────────────────────────────────────────────────────────────────────
const ICON_BG = Platform.OS === "android" ? 62 : 70;
const ICON_CORE = Platform.OS === "android" ? 46 : 52;
const ICON_MAX = Platform.OS === "android" ? 46 : 52;

// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Hero card (first item — full width, horizontal) ─────────────────────────
function HeroCard({
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
  const hasBadge = !!item.badgeCount && item.badgeCount > 0;

  return (
    <AnimatedPressable
      style={[s.heroCard, card, animStyle]}
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
      {/* App-icon — cuadrado redondeado con color sólido del item */}
      <View style={[s.heroIconApp, { backgroundColor: accent }]}>
        {item.iconName ? (
          <ItemIcon
            name={item.iconName}
            size={Math.min(item.iconSize ?? 42, 42)}
          />
        ) : (
          <Ionicons
            name={(item.icon || "grid-outline") as any}
            size={30}
            color="#fff"
          />
        )}
      </View>

      {/* Text */}
      <View style={s.heroInfo}>
        <Text style={[s.heroName, { color: c.text }]}>{item.name}</Text>
        {item.subtitle && (
          <Text
            style={[s.heroSub, { color: c.textSecondary }]}
            numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
        {renderBadge?.(item)}
      </View>

      {/* Right indicator */}
      {hasBadge ? (
        <View style={[s.heroBadgePill, { backgroundColor: c.expense }]}>
          <Text style={[s.heroBadgeText, { color: c.textInverse }]}>
            {item.badgeCount! > 99 ? "99+" : item.badgeCount}
          </Text>
        </View>
      ) : (
        <View style={[s.heroChevron, { backgroundColor: accent + "18" }]}>
          <Ionicons name="chevron-forward" size={15} color={accent} />
        </View>
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
      {/* App-icon */}
      <View style={[s.listRowIcon, { backgroundColor: accent }]}>
        {item.iconName ? (
          <ItemIcon name={item.iconName} size={26} />
        ) : (
          <Ionicons
            name={(item.icon || "grid-outline") as any}
            size={22}
            color="#fff"
          />
        )}
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

  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [modalPlacaVisible, setModalPlacaVisible] = useState(false);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [conductorActual, setConductorActual] = useState<string | undefined>();

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
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
    setConductorActual(vehiculo.conductorNombre);
    setModalVehiculosVisible(false);
  };

  const handleGuardarPlaca = async () => {
    const placaLimpia = placaTemporal.trim().toUpperCase();
    if (!placaLimpia || placaLimpia.length < 3) {
      Alert.alert("Error", "La placa debe tener al menos 3 caracteres");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "Datos incompletos");
      return;
    }
    try {
      setCargando(true);
      const resultado = await solicitarAccesoVehiculo(user.id, placaLimpia);
      if (!resultado.success) {
        Alert.alert("Error", resultado.error || "No se pudo solicitar");
        return;
      }
      Alert.alert(
        "Solicitud enviada",
        `Se envió la solicitud al vehículo ${placaLimpia}.`,
      );
      await cargarVehiculos();
      setModalPlacaVisible(false);
      setPlacaTemporal("");
    } catch {
      Alert.alert("Error", "No se pudo procesar la solicitud");
    } finally {
      setCargando(false);
    }
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
  const card = {
    backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
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
                s.vehicleCardOuter,
                {
                  backgroundColor: isDark
                    ? c.border
                    : (tipoCamionData?.color || c.accent) + "1A",
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
              {/* Inner core — double-bezel */}
              <View style={[s.vehicleCardInner, { backgroundColor: c.cardBg }]}>
                <View style={s.vehicleCardContent}>
                  {/* Circular icon bg — consistent with grid cards */}
                  <View
                    style={[
                      s.vehicleIconBg,
                      {
                        backgroundColor:
                          (tipoCamionData?.color || c.accent) + "1A",
                      },
                    ]}>
                    <View
                      style={[
                        s.vehicleIconCore,
                        {
                          backgroundColor:
                            (tipoCamionData?.color || c.accent) + "2E",
                        },
                      ]}>
                      <ItemIcon name={camionIconName} size={44} />
                    </View>
                  </View>
                  <View style={s.vehicleInfo}>
                    <View style={s.vehicleStatusRow}>
                      <Text style={[s.vehicleType, { color: c.text }]}>
                        {vehicleCardTitle ||
                          tipoCamionData?.label ||
                          "Sin vehículo"}
                      </Text>
                      {placaActual && (
                        <View
                          style={[
                            s.activoBadge,
                            { backgroundColor: c.accent + "20" },
                          ]}>
                          <View
                            style={[s.activoDot, { backgroundColor: c.accent }]}
                          />
                          <Text style={[s.activoText, { color: c.accent }]}>
                            Activo
                          </Text>
                        </View>
                      )}
                    </View>
                    {placaActual ? (
                      <View
                        style={[
                          s.placaBadge,
                          {
                            backgroundColor:
                              (tipoCamionData?.color || c.accent) + "22",
                            borderColor:
                              (tipoCamionData?.color || c.accent) + "55",
                            borderWidth: 1,
                          },
                        ]}>
                        <Text
                          style={[
                            s.placaText,
                            { color: tipoCamionData?.color || c.accent },
                          ]}>
                          {placaActual}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          s.vehicleCtaWrap,
                          {
                            backgroundColor: c.accent + "18",
                            borderColor: c.accent + "40",
                            borderWidth: 1,
                          },
                        ]}>
                        <Ionicons
                          name="add-circle-outline"
                          size={13}
                          color={c.accent}
                        />
                        <Text style={[s.vehicleCtaText, { color: c.accent }]}>
                          Seleccionar vehículo
                        </Text>
                      </View>
                    )}
                    {conductorActual && (
                      <Text
                        style={[s.vehicleConductor, { color: c.textMuted }]}
                        numberOfLines={1}>
                        {conductorActual}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      s.chevronWrap,
                      { backgroundColor: c.border + "80" },
                    ]}>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={c.textMuted}
                    />
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          )}

          {/* GRID */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.gridContainer}>
            {/* HERO — primer item, ancho completo */}
            {items.length > 0 && (
              <HeroCard
                item={items[0]}
                card={card}
                colors={c}
                onPress={onItemPress ?? (() => {})}
                renderBadge={renderBadge}
              />
            )}

            {/* LIST ROWS — resto de items, estilo Apple Support */}
            {items.length > 1 && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionLabel, { color: c.text }]}>
                    Herramientas
                  </Text>
                </View>
                <View style={s.listSection}>
                  {items.slice(1).map((item, index) => (
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
        onRequestClose={() => setModalVehiculosVisible(false)}>
        <TouchableWithoutFeedback
          onPress={() => setModalVehiculosVisible(false)}>
          <View style={[s.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View style={[s.sheetBase, sheet]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>
                  Mis Vehículos
                </Text>
                <Text style={[s.sheetSubtitle, { color: c.textSecondary }]}>
                  Selecciona o agrega un vehículo
                </Text>

                {cargando ? (
                  <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color={c.accent} />
                  </View>
                ) : vehiculos.length > 0 ? (
                  <ScrollView
                    style={s.vehicleList}
                    showsVerticalScrollIndicator={false}>
                    {vehiculos.map((v) => {
                      const tipo = getTipoCamionData(v.tipo_camion);
                      const isActive = placaActual === v.placa;
                      const vIconName: IconName = tipo
                        ? ICON_MAP[tipo.id]
                        : "truck";
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            s.vehicleOption,
                            { backgroundColor: c.surface },
                            isActive && {
                              borderWidth: 1.5,
                              borderColor: c.accent,
                            },
                          ]}
                          onPress={() => handleSeleccionarVehiculo(v)}>
                          <View
                            style={[
                              s.vehicleOptionIcon,
                              {
                                backgroundColor:
                                  (tipo?.color || c.accent) + "18",
                              },
                            ]}>
                            <ItemIcon name={vIconName} size={36} />
                          </View>
                          <View style={s.vehicleOptionInfo}>
                            <Text
                              style={[s.vehicleOptionType, { color: c.text }]}>
                              {tipo?.label || "Vehículo"}
                            </Text>
                            <Text
                              style={[
                                s.vehicleOptionPlaca,
                                { color: c.textSecondary },
                              ]}>
                              {v.placa}
                            </Text>
                            {v.conductorNombre && (
                              <Text
                                style={[
                                  s.vehicleOptionConductor,
                                  { color: c.textMuted },
                                ]}>
                                {v.conductorNombre}
                              </Text>
                            )}
                          </View>
                          {v.estado === "pendiente" ? (
                            <View
                              style={[
                                s.statusBadge,
                                { backgroundColor: "#FFB800" },
                              ]}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={c.textInverse}
                              />
                            </View>
                          ) : v.estado === "rechazado" ? (
                            <View
                              style={[
                                s.statusBadge,
                                { backgroundColor: c.danger },
                              ]}>
                              <Ionicons name="close" size={14} color="#FFF" />
                            </View>
                          ) : isActive ? (
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
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={s.emptyBox}>
                    <View
                      style={[s.emptyIconWrap, { backgroundColor: c.surface }]}>
                      <Ionicons
                        name="car-outline"
                        size={36}
                        color={c.textMuted}
                      />
                    </View>
                    <Text style={[s.emptyText, { color: c.textSecondary }]}>
                      No tienes vehículos registrados
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.addButton, { backgroundColor: c.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel="Solicitar acceso a vehículo"
                  onPress={() => {
                    setModalVehiculosVisible(false);
                    setModalPlacaVisible(true);
                  }}>
                  <Text style={[s.addButtonText, { color: c.accentText }]}>
                    Solicitar acceso a vehículo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelTouchable}
                  onPress={() => setModalVehiculosVisible(false)}>
                  <Text style={[s.cancelText, { color: c.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: INGRESAR PLACA */}
      <Modal
        visible={modalPlacaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalPlacaVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[s.overlay, { backgroundColor: c.overlay }]}>
              <TouchableWithoutFeedback>
                <View style={[s.sheetBase, sheet]}>
                  <View style={[s.handle, { backgroundColor: c.border }]} />
                  <Text style={[s.sheetTitle, { color: c.text }]}>
                    Solicitar acceso
                  </Text>
                  <Text style={[s.sheetSubtitle, { color: c.textSecondary }]}>
                    Ingresa la placa del vehículo al que deseas acceder
                  </Text>

                  <TextInput
                    style={[
                      s.placaInput,
                      {
                        backgroundColor: c.surface,
                        color: c.text,
                        borderColor: c.accent,
                      },
                    ]}
                    placeholder="ABC123"
                    placeholderTextColor={c.textMuted}
                    value={placaTemporal}
                    onChangeText={(t) => setPlacaTemporal(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={7}
                    autoFocus
                  />

                  <View style={s.modalBtns}>
                    <TouchableOpacity
                      style={[s.btnSecondary, { backgroundColor: c.surface }]}
                      onPress={() => setModalPlacaVisible(false)}>
                      <Text
                        style={[
                          s.btnSecondaryText,
                          { color: c.textSecondary },
                        ]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.btnPrimary,
                        { backgroundColor: c.accent },
                        (!placaTemporal.trim() || cargando) && { opacity: 0.4 },
                      ]}
                      onPress={handleGuardarPlaca}
                      accessibilityRole="button"
                      accessibilityLabel="Enviar solicitud"
                      disabled={!placaTemporal.trim() || cargando}>
                      {cargando ? (
                        <ActivityIndicator color={c.accentText} />
                      ) : (
                        <Text
                          style={[s.btnPrimaryText, { color: c.accentText }]}>
                          Enviar solicitud
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
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

  // HERO CARD — full width, horizontal
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
    marginBottom: 12,
    minHeight: 90,
    overflow: "hidden",
  },
  // Apple-style: app-icon cuadrado redondeado
  heroIconApp: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSub: { fontSize: 12, lineHeight: 17 },
  heroChevron: {
    width: 44,
    height: 44,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgePill: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "800" },

  // VEHICLE STATUS
  vehicleStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
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
  vehicleCardOuter: {
    borderRadius: 24,
    padding: 4,
    marginBottom: 20,
  },
  vehicleCardInner: {
    borderRadius: 21,
    overflow: "hidden",
  },
  vehicleCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
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
  vehicleInfo: { flex: 1 },
  vehicleType: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  vehicleHint: { fontSize: 13 },
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
  vehicleConductor: { fontSize: 11, marginTop: 3 },
  placaBadge: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  placaText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },
  chevronWrap: {
    width: 44,
    height: 44,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
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
  listRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
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
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingBox: { padding: 40, alignItems: "center" },

  // Vehicle List
  vehicleList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  vehicleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleOptionInfo: { flex: 1 },
  vehicleOptionType: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  vehicleOptionPlaca: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
    letterSpacing: 1,
  },
  vehicleOptionConductor: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty
  emptyBox: { alignItems: "center", padding: 32 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: { fontSize: 14 },

  // Tipos Grid
  tiposGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  tipoCard: {
    width: (width - 72) / 2,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  tipoIconBg: {
    width: 58,
    height: 58,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tipoLabel: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },

  // Placa Input
  placaInput: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 6,
    marginBottom: 24,
    fontFamily: Platform.select({ ios: "Courier New", android: "monospace" }),
  },

  // Buttons
  addButton: {
    borderRadius: 99,
    padding: 17,
    alignItems: "center",
    marginBottom: 10,
  },
  addButtonText: { fontSize: 15, fontWeight: "700" },
  cancelTouchable: { alignItems: "center", padding: 12 },
  cancelText: { fontSize: 15, fontWeight: "600" },
  modalBtns: { flexDirection: "row", gap: 12 },
  btnSecondary: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "600" },
  btnPrimary: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700" },
});
