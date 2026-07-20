// src/Screens/Home/components/ActividadReciente.tsx
// Panel de últimos movimientos (gastos + ingresos) de la placa activa.
// (El combustible ya se muestra en la VehicleCard — aquí no se duplica.)
// La presentación de cada fila vive en ./movimientos, compartida con la
// pantalla de Movimientos que abre "Ver todas".
import React from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import {
  MovimientoRow,
  construirMovimientos,
  MOV_COLORS,
} from "./movimientos";

const COLORS = {
  muted: MOV_COLORS.muted,
  panelBg: "#F4F5F7",
  link: "#F5A623",
};

interface Props {
  isDark: boolean;
  /** Override del destino de "Ver todas"; por defecto abre Movimientos. */
  onVerTodas?: () => void;
}

export default function ActividadReciente({ onVerTodas }: Props) {
  const navigation = useNavigation<any>();
  const placa = useVehiculoStore((s) => s.placa);
  const tipoCamion = useVehiculoStore((s) => s.tipoCamion);
  const gastos = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);

  const recientes = React.useMemo(
    () =>
      construirMovimientos(
        gastos.filter((g) => g.placa === placa),
        ingresos.filter((i) => i.placa === placa),
      ).slice(0, 5),
    [gastos, ingresos, placa],
  );

  const verTodas = onVerTodas ?? (() => navigation.navigate("Movimientos"));

  return (
    <View style={s.wrap}>
      <View style={s.panel}>
        <View style={s.panelHeader}>
          <Text style={s.panelLabel} numberOfLines={1}>
            Actividad reciente
          </Text>
          <Pressable onPress={verTodas} hitSlop={8}>
            <Text style={s.verTodas}>Ver todas</Text>
          </Pressable>
        </View>

        {recientes.length === 0 ? (
          <Text style={s.vacio}>Sin movimientos aún</Text>
        ) : (
          recientes.map((m) => (
            <MovimientoRow key={m.id} mov={m} tipoCamion={tipoCamion} />
          ))
        )}
      </View>
    </View>
  );
}

const panelShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 2 },
});

const s = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  panel: {
    backgroundColor: COLORS.panelBg,
    borderRadius: 20,
    padding: 14,
    ...panelShadow,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: COLORS.muted,
    flexShrink: 1,
  },
  verTodas: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.link,
  },
  vacio: {
    fontSize: 13,
    color: COLORS.muted,
    paddingVertical: 8,
  },
});
