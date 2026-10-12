// Exo 2 en toda la app.
// Las fuentes de Google no sintetizan negrita: cada peso es una familia aparte,
// así que se traduce `fontWeight` a la familia correspondiente al renderizar.
import { StyleSheet, Text, TextInput } from "react-native";
import {
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
  Exo2_800ExtraBold,
} from "@expo-google-fonts/exo-2";

export const FUENTES_APP = {
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
  Exo2_800ExtraBold,
};

const familiaPorPeso = (peso: unknown): string => {
  switch (String(peso ?? "400")) {
    case "500":
      return "Exo2_500Medium";
    case "600":
      return "Exo2_600SemiBold";
    case "700":
    case "bold":
      return "Exo2_700Bold";
    case "800":
    case "900":
      return "Exo2_800ExtraBold";
    default:
      return "Exo2_400Regular";
  }
};

let aplicada = false;

export function aplicarFuenteGlobal() {
  if (aplicada) return;
  aplicada = true;
  for (const Comp of [Text, TextInput] as any[]) {
    const original = Comp.render;
    if (typeof original !== "function") continue;
    Comp.render = function (props: any, ref: any) {
      const plano = StyleSheet.flatten(props.style) ?? {};
      // Si la pantalla ya fija una familia (iconos, monoespaciada), se respeta.
      if (plano.fontFamily) return original.call(this, props, ref);
      const { fontWeight, ...resto } = plano as any;
      return original.call(
        this,
        { ...props, style: { ...resto, fontFamily: familiaPorPeso(fontWeight) } },
        ref,
      );
    };
  }
}
