// Banner oscuro del Home con el combustible del mes (galones y barra roja
// contra el mes pico). Lleva a Gastos.
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ItemIcon from "../../../components/ItemIcon";
import { useCombustible } from "../useCombustible";

export default function BannerCombustible() {
  const navigation = useNavigation<any>();
  const fuel = useCombustible();

  return (
    <View style={s.banner}>
      <View style={s.textCol}>
        <Text style={s.titulo}>Combustible del mes</Text>
        <Text style={s.valor}>{fuel.galones} gal</Text>
        <View style={s.track}>
          <View style={[s.fill, { width: `${fuel.pct}%` }]} />
        </View>
        <Text style={s.nota}>{fuel.pct}% del mes pico</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Gastos")}
          style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Text style={s.btnTexto}>Ver gastos</Text>
        </Pressable>
      </View>
      <ItemIcon name="fuel" size={84} />
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0B0B0C",
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 20,
  },
  textCol: { flex: 1 },
  titulo: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.65)" },
  valor: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: "#FFFFFF",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    marginTop: 10,
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#E31937" },
  nota: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 6 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 12,
  },
  btnTexto: { fontSize: 12, fontWeight: "600", color: "#111111" },
});
