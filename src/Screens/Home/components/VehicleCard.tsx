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
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { HOME_COLORS } from "../HomeConstants";
import {
  ICON_MAP,
  VEHICLE_PHOTOS,
  carroceriaBase,
  infoTipo,
  normalizarTipo,
} from "../vehicleConstants";
import { usePrecioDiesel } from "../../../hooks/usePrecioDiesel";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

const FUEL_BAR_COLOR = "#22C55E";

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
  const BLEED = 0; // cuánto sangra la foto por el borde derecho (recortada por overflow)
  // En iOS el camión se muestra ~10% más grande (pantalla más ancha)
  const PHOTO_FRAC = Platform.OS === "ios" ? 0.64 : 0.6;
  const photoW = rowW
    ? Math.round(rowW * PHOTO_FRAC)
    : Platform.OS === "ios"
      ? 190
      : 175;
  const photoH = Math.round((photoW * 156) / 260);

  // Normalizar: el valor persistido puede ser una variante nueva
  // ("estacasTresEjes") o un valor viejo ("estacas") de antes de este cambio;
  // normalizarTipo lo lleva a una variante válida para no perder la foto.
  const variante = tipoCamion ? normalizarTipo(tipoCamion) : null;
  const tipoCamionData = infoTipo(variante);
  const camionIconName: IconName = variante
    ? ICON_MAP[carroceriaBase(variante)]
    : "conductor";
  // Foto de la variante; si no hay, cae al ícono vectorial.
  const foto = variante ? VEHICLE_PHOTOS[variante] : undefined;
  const subtitulo = vehicleCardTitle || tipoCamionData?.label || "";

  // ── Combustible ──
  const fuel = React.useMemo(() => {
    // Gasto combustible por mes → galones del mes actual y ratio vs. mes pico
    const porMes = new Map<string, number>();
    for (const g of gastos) {
      if (g.placa !== placaActual) continue;
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
  }, [gastos, precioGalon, placaActual]);

  const fuelPct = Math.round(Math.max(0, Math.min(1, fuel.ratio)) * 100);

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
        s.cardGlass,
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
      {/* Fondo grafito translúcido, casi uniforme, con un leve brillo arriba */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(58,58,62,0.90)", "rgba(34,34,37,0.92)", "rgba(24,24,27,0.94)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.content}>
        {placaActual ? (
          <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
            {/* Encabezado: placa + chip de combustible */}
            <View style={s.topRow}>
              <Text
                style={s.placa}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {placaActual}
              </Text>
              {/* Botón: ir a cambiar de camión */}
              <View style={s.swapBtn}>
                <SFIcon
                  name="arrow.left.arrow.right"
                  fallback="swap-horizontal"
                  size={15}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {/* Porcentaje grande + foto del camión */}
            <View style={s.midRow}>
              <View style={s.fuelBlock}>
                <View style={s.fuelIcon}>
                  <SFIcon
                    name="fuelpump.fill"
                    fallback="flame"
                    size={20}
                    color={FUEL_BAR_COLOR}
                  />
                </View>
                <Text style={s.pct} numberOfLines={1} adjustsFontSizeToFit>
                  {fuel.galones}
                  <Text style={s.pctSign}> gal</Text>
                </Text>
              </View>
              {foto ? (
                <View
                  style={{ width: photoW, marginRight: 8, marginVertical: -10 }}
                  pointerEvents="none">
                  <Image
                    source={foto}
                    style={{ width: photoW, height: photoH }}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <ItemIcon
                  name={camionIconName}
                  size={HOME_COLORS.vehicleIconSize}
                />
              )}
            </View>

            {/* Barra de combustible */}
            <View style={s.fuelTrack}>
              <LinearGradient
                colors={[FUEL_BAR_COLOR, "#A3E635"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.fuelFill, { width: `${fuelPct}%` }]}
              />
            </View>

            <View style={s.footRow}>
              <Text style={s.footText} numberOfLines={1}>
                {subtitulo}
              </Text>
              <Text style={s.footText} numberOfLines={1}>
                Combustible · {fuelPct}% del mes pico
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.row}>
            <View style={s.textCol}>
              <Text
                style={[s.placaEmpty, { color: "#FFFFFF" }]}>
                Sin vehículo
              </Text>
              <Text
                style={[s.hint, { color: "rgba(255,255,255,0.6)" }]}>
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
    borderRadius: 28,
    borderCurve: "continuous",
    marginBottom: 20,
    overflow: "hidden",
  },
  cardGlass: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  content: {
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  placa: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
  swapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  midRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
  },
  fuelBlock: {
    flexShrink: 1,
    gap: 6,
  },
  fuelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "rgba(34,197,94,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  pct: {
    flexShrink: 1,
    fontSize: 54,
    fontWeight: "600",
    letterSpacing: -1.5,
    color: "#FFFFFF",
  },
  pctSign: {
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0,
    color: "rgba(255,255,255,0.6)",
  },
  fuelTrack: {
    marginTop: 2,
    height: 8,
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  fuelFill: {
    height: "100%",
    borderRadius: 4,
    borderCurve: "continuous",
  },
  footRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 6,
  },
  footText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },
  placaEmpty: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  hint: {
    fontSize: HOME_COLORS.vehicleHintSize,
  },
});
