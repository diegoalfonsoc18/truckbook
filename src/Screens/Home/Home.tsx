import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  Image,
  Pressable,
  Linking,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useTheme, TYPOGRAPHY, getShadow } from "../../constants/Themecontext";
import ItemIcon, { IconName } from "../../components/ItemIcon";
import { MotorIcon, LicenciaIcon, SoatIcon } from "../../assets/icons/icons";
import { HOME_COLORS } from "./HomeConstants";
import { ICON_MAP, TIPOS_CAMION } from "./vehicleConstants";
import WidgetResumen from "./widgets/WidgetResumen";
import WidgetInsightIA from "./widgets/WidgetInsightIA";
import WidgetClientes from "./widgets/WidgetClientes";
import DashboardControlPanel from "./components/DashboardControlPanel";
import ModalVehiculos from "./components/ModalVehiculos";
import VehicleCard from "./components/VehicleCard";

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

// ─── Sizes ────────────────────────────────────────────────────────────────────
const ICON_BG = Platform.OS === "android" ? 62 : 70;
const ICON_CORE = Platform.OS === "android" ? 46 : 52;
const ICON_MAX = Platform.OS === "android" ? 46 : 52;

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
        {item.id === "tecnicomecanica" ? (
          <MotorIcon
            width={Platform.OS === "android" ? 40 : 54}
            height={Platform.OS === "android" ? 40 : 54}
            color={accent}
          />
        ) : item.id === "licencia" ? (
          <LicenciaIcon
            width={Platform.OS === "android" ? 40 : 54}
            height={Platform.OS === "android" ? 40 : 54}
            color={accent}
          />
        ) : item.id === "soat" ? (
          <SoatIcon
            width={Platform.OS === "android" ? 40 : 54}
            height={Platform.OS === "android" ? 40 : 54}
            color={accent}
          />
        ) : item.iconName ? (
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
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [conductorActual, setConductorActual] = useState<string | undefined>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
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
  }, []);

  const tipoCamionData = TIPOS_CAMION.find((t) => t.id === tipoCamion);
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

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={
              Platform.OS === "ios" ? { marginHorizontal: -H_PAD } : undefined
            }
            contentContainerStyle={[
              s.gridContainer,
              {
                paddingBottom: insets.bottom + 100,
                paddingHorizontal: Platform.OS === "ios" ? H_PAD : 0,
              },
            ]}>
            {/* VEHICLE CARD */}
            {showCamionHeader && (
              <VehicleCard
                vehicleCardTitle={vehicleCardTitle}
                onPress={() => setModalVehiculosVisible(true)}
              />
            )}

            {/* WIDGETS — fila de dos columnas */}
            <View style={s.widgetRow}>
              <WidgetResumen isDark={isDark} />
              <WidgetInsightIA isDark={isDark} />
            </View>

            {!placaActual ? (
              /* ONBOARDING — sin vehículo */
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setModalVehiculosVisible(true)}
                style={[
                  s.onboardingCard,
                  {
                    backgroundColor: isDark ? `${c.accent}14` : c.cardBg,
                    borderWidth: 1.5,
                    borderColor: isDark ? `${c.accent}40` : `${c.accent}30`,
                    borderStyle: "dashed",
                  },
                ]}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🚛</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: c.text,
                    marginBottom: 6,
                    letterSpacing: -0.3,
                  }}>
                  Vincula tu vehículo
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.45)",
                    textAlign: "center",
                    lineHeight: 19,
                    paddingHorizontal: 16,
                  }}>
                  Para registrar gastos, ingresos y ver tu actividad semanal,
                  primero selecciona un vehículo.
                </Text>
                <View
                  style={[
                    s.onboardingBtn,
                    { backgroundColor: c.accent, marginTop: 18 },
                  ]}>
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    Seleccionar vehículo
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <>
                {/* PANEL DE CONTROL — tablero de testigos */}
                {items.length > 0 && (
                  <>
                    <View style={s.sectionHeader}>
                      <Text style={[s.sectionLabel, { color: c.text }]}>
                        Actividad semanal
                      </Text>
                    </View>
                    <DashboardControlPanel
                      items={items}
                      onItemPress={onItemPress ?? (() => {})}
                      isDark={isDark}
                      colors={c}
                      renderBadge={renderBadge}
                    />
                  </>
                )}

                {/* CLIENTES FRECUENTES */}
                <WidgetClientes isDark={isDark} />
              </>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* MODAL: LISTA DE VEHÍCULOS */}
      <ModalVehiculos
        visible={modalVehiculosVisible}
        onClose={() => setModalVehiculosVisible(false)}
        onConductorChange={setConductorActual}
      />
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
    borderRadius: 28,
    padding: 12,
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heroSquareIcon: {
    width: 68,
    height: 68,
    borderRadius: 28,
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
    paddingVertical: 14,
    paddingHorizontal: 18,
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
    marginBottom: 4,
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
  vcTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  vcMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
  },
  vcBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
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
  gridContainer: { paddingTop: 8, paddingBottom: 0 },

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
    borderRadius: 28,
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
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: { padding: 40, alignItems: "center" },

  // Vehicle List
  vehicleList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
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
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  placaInput: {
    borderRadius: 28,
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
    borderRadius: 28,
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

  onboardingCard: {
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  onboardingBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 99,
  },

  widgetRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 6,
    marginBottom: 12,
    gap: 16,
    zIndex: 1,
  },

  wCircle: {
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    borderRadius: 28,
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
    borderRadius: 28,
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
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
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
    gap: 7,
    marginBottom: 10,
  },
  clientesTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  clientesEmpty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  clientesEmptyText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  clienteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    gap: 10,
  },
  clienteAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  clienteAvatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  clienteDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  clientesDividerH: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
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
    gap: 2,
  },
  clienteNombre: {
    fontSize: 13,
    fontWeight: "700",
  },
  clienteMeta: {
    fontSize: 11,
  },
  clienteMonto: {
    fontSize: 13,
    fontWeight: "800",
  },
  cargaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cargaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  cargaChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cargaChipBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cargaChipCount: {
    fontSize: 11,
    fontWeight: "700",
  },
});
