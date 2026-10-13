// Placeholders de carga: bloques grises que respiran (opacidad) mientras llegan
// los datos. `SkeletonFilas` imita una lista de movimientos (círculo + dos
// líneas + monto) para que el contenido no salte al cargar.
import React, { useEffect } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const GRIS = "#E5E7EB";

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Reanimated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: GRIS },
        anim,
        style,
      ]}
    />
  );
}

/** Lista de filas fantasma (movimientos, vehículos, registros). */
export function SkeletonFilas({
  filas = 5,
  conIcono = true,
  style,
}: {
  filas?: number;
  conIcono?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      style={style}>
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} style={s.fila}>
          {conIcono && <Skeleton width={38} height={38} radius={19} />}
          <View style={s.centro}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="35%" height={10} />
          </View>
          <Skeleton width={64} height={13} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  centro: { flex: 1, gap: 6 },
});
