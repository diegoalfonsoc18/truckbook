import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
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
import { useIngresosStore } from "../../../store/IngresosStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import { formatCOP } from "../homeUtils";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { HOME_COLORS } from "../HomeConstants";
import { ICON_MAP, TIPOS_CAMION } from "../vehicleConstants";
import { usePrecioDiesel } from "../../../hooks/usePrecioDiesel";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

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
  const ingresos = useIngresosStore((s) => s.ingresos);
  const gastos = useGastosStore((s) => s.gastos);
  const { precio: precioGalon } = usePrecioDiesel();

  const vcScale = useSharedValue(1);
  const vcAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vcScale.value }],
  }));

  const tipoCamionData = TIPOS_CAMION.find((t) => t.id === tipoCamion);
  const camionIconName: IconName = tipoCamion
    ? ICON_MAP[tipoCamion]
    : "conductor";

  // ── Stats ──
  const vehicleStats = React.useMemo(() => {
    const fletes = ingresos.filter((i) => i.tipo_ingreso === "Flete");
    const totalViajes = fletes.length;
    const totalIngresos = fletes.reduce((sum, i) => sum + (i.monto ?? 0) * (i.cantidad ?? 1), 0);
    const clientesSet = new Set<string>();
    for (const ing of fletes) {
      if (ing.descripcion) {
        const nombre = ing.descripcion.replace(/\[TEL:[^\]]*\]/g, "").split(" · ")[0]?.trim();
        if (nombre && nombre !== "Flete") clientesSet.add(nombre);
      }
    }

    // Galones estimados del MES ACTUAL: gasto combustible / precio ACPM (Gemini)
    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const gastoCombustible = gastos
      .filter(
        (g) =>
          g.tipo_gasto === "Combustible" &&
          (g.fecha ?? g.created_at ?? "").startsWith(mesActual),
      )
      .reduce((sum, g) => sum + (g.monto ?? 0), 0);
    const galones =
      precioGalon > 0 ? Math.round(gastoCombustible / precioGalon) : 0;

    return {
      viajes: totalViajes,
      clientes: clientesSet.size,
      ingresos: totalIngresos,
      galones,
    };
  }, [ingresos, gastos, precioGalon]);

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
        { backgroundColor: isDark ? `${c.accent}14` : "#FFFFFF" },
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
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        placaActual
          ? `Vehículo activo: ${placaActual}, ${tipoCamionData?.label || ""}`
          : "Seleccionar vehículo"
      }
      accessibilityHint="Toca para cambiar de vehículo">
      <View style={s.content}>
        {placaActual ? (
          <View style={{ flex: 1 }}>
            {/* Fila 1: vehículo activo ... ubicación */}
            <View style={s.topRow}>
              <Text
                style={[s.label, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                vehículo activo
              </Text>
              <View style={s.statItem}>
                <SFIcon
                  name="fuelpump"
                  fallback="flame-outline"
                  size={15}
                  color={HOME_COLORS.vehicleCardTextMuted}
                />
                <Text
                  style={[
                    s.statText,
                    { color: HOME_COLORS.vehicleCardTextMuted },
                  ]}
                  numberOfLines={1}>
                  {vehicleStats.galones > 0
                    ? `${vehicleStats.galones} gal`
                    : "0 gal"}
                </Text>
              </View>
            </View>

            {/* Fila 2: Nombre + placa ... camión */}
            <View style={s.middleRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[s.typeName, { color: HOME_COLORS.vehicleCardText }]}>
                  {vehicleCardTitle || tipoCamionData?.label || ""}
                </Text>
                <View
                  style={[
                    s.placaBadge,
                    {
                      backgroundColor: c.plateYellow,
                      borderColor: c.plateBorder,
                      borderWidth: 1,
                      alignSelf: "flex-start",
                    },
                  ]}>
                  <Text style={[s.placaText, { color: c.plateText }]}>
                    {placaActual}
                  </Text>
                </View>
              </View>
              <ItemIcon
                name={camionIconName}
                size={HOME_COLORS.vehicleIconSize}
              />
            </View>

            {/* Fila 3: viajes + clientes ... ingresos */}
            <View style={s.bottomRow}>
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <SFIcon
                    name="shippingbox"
                    fallback="cube-outline"
                    size={16}
                    color={HOME_COLORS.vehicleCardTextMuted}
                  />
                  <Text
                    style={[
                      s.statText,
                      { color: HOME_COLORS.vehicleCardTextMuted },
                    ]}>
                    {vehicleStats.viajes} viajes
                  </Text>
                </View>
                <View style={s.statItem}>
                  <SFIcon
                    name="person.2"
                    fallback="people-outline"
                    size={16}
                    color={HOME_COLORS.vehicleCardTextMuted}
                  />
                  <Text
                    style={[
                      s.statText,
                      { color: HOME_COLORS.vehicleCardTextMuted },
                    ]}>
                    {vehicleStats.clientes} clientes
                  </Text>
                </View>
              </View>
              <View style={s.statItem}>
                <Text
                  style={[s.statText, { color: c.accent, fontWeight: "700" }]}>
                  Esta semana: {formatCOP(vehicleStats.ingresos)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={[s.typeName, { color: HOME_COLORS.vehicleCardText }]}>
                Sin vehículo
              </Text>
              <Text
                style={[s.hint, { color: HOME_COLORS.vehicleCardTextMuted }]}>
                Toca para seleccionar un camión
              </Text>
            </View>
            <ItemIcon name="conductor" size={HOME_COLORS.vehicleIconSize} />
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
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  label: {
    fontSize: HOME_COLORS.vehicleLabelSize,
    fontWeight: HOME_COLORS.vehicleLabelWeight,
    letterSpacing: HOME_COLORS.vehicleLabelLetterSpacing,
    marginBottom: 1,
  },
  typeName: {
    fontSize: HOME_COLORS.vehicleTypeSize,
    fontWeight: HOME_COLORS.vehicleTypeWeight,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  hint: {
    fontSize: HOME_COLORS.vehicleHintSize,
  },
  placaBadge: {
    borderRadius: HOME_COLORS.vehicleBadgeBorderRadius,
    paddingHorizontal: HOME_COLORS.vehicleBadgePaddingH,
    paddingVertical: HOME_COLORS.vehicleBadgePaddingV,
  },
  placaText: {
    fontSize: HOME_COLORS.vehiclePlateSize,
    fontWeight: HOME_COLORS.vehiclePlateWeight,
    letterSpacing: HOME_COLORS.vehiclePlateLetterSpacing,
  },
});
