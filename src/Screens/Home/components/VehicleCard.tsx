// Héroe del Home (estilo app de control de vehículo): placa y estado arriba, y
// la foto del camión activo grande y centrada. Tocarlo abre el selector.
import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import {
  ICON_MAP,
  VEHICLE_PHOTOS,
  carroceriaBase,
  infoTipo,
  normalizarTipo,
} from "../vehicleConstants";

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

interface VehicleCardProps {
  vehicleCardTitle?: string;
  onPress: () => void;
}

export default function VehicleCard({ vehicleCardTitle, onPress }: VehicleCardProps) {
  const { placa: placaActual, tipoCamion } = useVehiculoStore();

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // El valor persistido puede ser una variante vieja ("estacas") o nueva
  // ("estacasTresEjes"); normalizarTipo la lleva a una válida.
  const variante = tipoCamion ? normalizarTipo(tipoCamion) : null;
  const tipoData = infoTipo(variante);
  const iconName: IconName = variante
    ? ICON_MAP[carroceriaBase(variante)]
    : "conductor";
  const foto = variante ? VEHICLE_PHOTOS[variante] : undefined;
  const subtitulo = vehicleCardTitle || tipoData?.label || "";

  return (
    <AnimatedPressable
      style={[s.hero, animStyle]}
      onPressIn={() => {
        scale.value = withTiming(0.985, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        placaActual
          ? `Vehículo activo: ${placaActual}, ${tipoData?.label || ""}`
          : "Seleccionar vehículo"
      }
      accessibilityHint="Toca para cambiar de vehículo">
      <View style={s.titulo}>
        <View style={s.tituloRow}>
          <Text style={s.placa} numberOfLines={1}>
            {placaActual || "Selecciona un vehículo"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#111111" />
        </View>
        {!!placaActual && (
          <View style={s.estadoRow}>
            {!!subtitulo && (
              <Text style={s.estado} numberOfLines={1}>
                {subtitulo}
              </Text>
            )}
            <View style={s.punto} />
            <Text style={s.estado}>Activo</Text>
          </View>
        )}
      </View>

      {placaActual ? (
        foto ? (
          <Image source={foto} style={s.foto} resizeMode="contain" />
        ) : (
          <View style={s.fotoVacia}>
            <ItemIcon name={iconName} size={150} />
          </View>
        )
      ) : (
        <View style={s.fotoVacia}>
          <ItemIcon name="conductor" size={100} />
          <Text style={s.hint}>Toca para seleccionar un camión</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  hero: { marginBottom: 16 },
  titulo: { paddingHorizontal: 2 },
  tituloRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  placa: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: "#111111",
  },
  estadoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  estado: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E31937" },
  foto: { width: "100%", height: 176, marginTop: 4 },
  fotoVacia: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  hint: { fontSize: 13, color: "#6B7280", marginTop: 4 },
});
