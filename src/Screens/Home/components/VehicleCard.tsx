import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { HOME_COLORS } from "../HomeConstants";
import { ICON_MAP, TIPOS_CAMION, VEHICLE_PHOTOS } from "../vehicleConstants";
import { usePrecioDiesel } from "../../../hooks/usePrecioDiesel";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const FUEL_BAR_COLOR = "#F5A623";

interface VehicleCardProps {
  vehicleCardTitle?: string;
  onPress: () => void;
}

export default function VehicleCard({
  vehicleCardTitle,
  onPress,
}: VehicleCardProps) {
  const { colors: c, isDark } = useTheme();
  const vcShadow = getShadow(isDark, "md");
  const { placa: placaActual, tipoCamion } = useVehiculoStore();
  const gastos = useGastosStore((s) => s.gastos);
  const { precio: precioGalon } = usePrecioDiesel();

  const vcScale = useSharedValue(1);
  const vcAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vcScale.value }],
  }));

  // Ancho real de la fila → foto responsiva que nunca tapa el texto.
  const [rowW, setRowW] = React.useState(0);
  const BLEED = 12; // cuánto sangra la foto por el borde derecho (recortada por overflow)
  const photoW = rowW ? Math.round(rowW * 0.55) : 162;
  const photoH = Math.round((photoW * 156) / 260);
  const photoReserve = rowW ? Math.max(96, photoW - BLEED + 6) : 150;

  const tipoCamionData = TIPOS_CAMION.find((t) => t.id === tipoCamion);
  const camionIconName: IconName = tipoCamion
    ? ICON_MAP[tipoCamion]
    : "conductor";
  const foto = tipoCamion ? VEHICLE_PHOTOS[tipoCamion] : undefined;
  const subtitulo = vehicleCardTitle || tipoCamionData?.label || "";

  // ── Combustible ──
  const fuel = React.useMemo(() => {
    // Gasto combustible por mes → galones del mes actual y ratio vs. mes pico
    const porMes = new Map<string, number>();
    for (const g of gastos) {
      if (g.tipo_gasto !== "Combustible") continue;
      const mes = (g.fecha ?? g.created_at ?? "").slice(0, 7);
      if (mes) porMes.set(mes, (porMes.get(mes) ?? 0) + (g.monto ?? 0));
    }

    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const gastoMes = porMes.get(mesActual) ?? 0;
    const gastoPico = Math.max(0, ...porMes.values());

    const galones = precioGalon > 0 ? Math.round(gastoMes / precioGalon) : 0;
    const ratio = gastoPico > 0 ? gastoMes / gastoPico : 0;

    return { galones, ratio };
  }, [gastos, precioGalon]);

  // ── SF Symbol helper ──
  const SFIcon = ({
    name,
    fallback,
    size,
    color,
  }: {
    name: SFSymbol;
    fallback: string;
    size: number;
    color: string;
  }) =>
    Platform.OS === "ios" ? (
      <SymbolView name={name} size={size} tintColor={color} weight="semibold" />
    ) : (
      <Ionicons name={fallback as any} size={size} color={color} />
    );

  return (
    <AnimatedPressable
      style={[
        s.card,
        { backgroundColor: isDark ? `${c.accent}14` : "#F4F5F7" },
        isDark ? { borderWidth: 1, borderColor: `${c.accent}33` } : vcShadow,
        vcAnimStyle,
      ]}
      onPressIn={() => {
        vcScale.value = withTiming(0.98, { duration: 100 });
      }}
      onPressOut={() => {
        vcScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        placaActual
          ? `Vehículo activo: ${placaActual}, ${tipoCamionData?.label || ""}`
          : "Seleccionar vehículo"
      }
      accessibilityHint="Toca para cambiar de vehículo">
      {/* Botón circular con chevron (arriba a la derecha) */}
      <View
        style={[
          s.chevronBtn,
          { borderColor: HOME_COLORS.vehicleCardBorderColor },
        ]}>
        <SFIcon
          name="chevron.right"
          fallback="chevron-forward"
          size={18}
          color={HOME_COLORS.vehicleCardText}
        />
      </View>

      <View style={s.content}>
        {placaActual ? (
          <View
            style={s.row}
            onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
            {/* Columna de texto */}
            <View style={[s.textCol, foto ? { marginRight: photoReserve } : null]}>
              <Text
                style={[s.label, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                VEHÍCULO ACTIVO
              </Text>

              <Text
                style={[s.placa, { color: HOME_COLORS.vehicleCardText }]}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {placaActual}
              </Text>

              {!!subtitulo && (
                <Text
                  style={[
                    s.subtitulo,
                    { color: HOME_COLORS.vehicleCardSubtitle },
                  ]}>
                  {subtitulo}
                </Text>
              )}

              {/* Chip de combustible */}
              <View style={s.fuelChip}>
                <View style={s.fuelRow}>
                  <SFIcon
                    name="fuelpump.fill"
                    fallback="flame"
                    size={16}
                    color={HOME_COLORS.vehicleCardText}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.fuelValue,
                        { color: HOME_COLORS.vehicleCardText },
                      ]}
                      numberOfLines={1}>
                      {fuel.galones} gal
                    </Text>
                    <Text
                      style={[
                        s.fuelLabel,
                        { color: HOME_COLORS.vehicleCardTextMuted },
                      ]}
                      numberOfLines={1}>
                      Combustible
                    </Text>
                  </View>
                </View>
                <View style={s.fuelTrack}>
                  <View
                    style={[
                      s.fuelFill,
                      {
                        width: `${Math.round(Math.max(0, Math.min(1, fuel.ratio)) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Foto real del camión (con fallback al ícono vectorial) */}
            {foto ? (
              <View
                style={[s.photoWrap, { width: photoW, right: -BLEED }]}
                pointerEvents="none">
                <Image
                  source={foto}
                  style={{ width: photoW, height: photoH }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={s.iconCol}>
                <ItemIcon
                  name={camionIconName}
                  size={HOME_COLORS.vehicleIconSize}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={s.row}>
            <View style={s.textCol}>
              <Text
                style={[s.placaEmpty, { color: HOME_COLORS.vehicleCardText }]}>
                Sin vehículo
              </Text>
              <Text
                style={[s.hint, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                Toca para seleccionar un camión
              </Text>
            </View>
            <View style={s.iconCol}>
              <ItemIcon name="conductor" size={HOME_COLORS.vehicleIconSize} />
            </View>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 22,
    marginBottom: 20,
    overflow: "hidden",
  },
  content: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textCol: {
    flex: 1,
  },
  textColWithPhoto: {
    marginRight: 178,
  },
  iconCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoWrap: {
    position: "absolute",
    right: -14,
    top: 0,
    bottom: 0,
    width: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: 260,
    height: 156,
  },
  chevronBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  placa: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  placaEmpty: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: HOME_COLORS.vehicleHintSize,
  },
  fuelChip: {
    marginTop: 14,
    alignSelf: "flex-start",
    minWidth: 104,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fuelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  fuelValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  fuelLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  fuelTrack: {
    marginTop: 7,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fuelFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: FUEL_BAR_COLOR,
  },
});
