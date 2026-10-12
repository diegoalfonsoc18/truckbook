// Inter en toda la app.
// Las fuentes de Google no sintetizan negrita: cada peso es una familia aparte,
// así que se traduce `fontWeight` a la familia correspondiente al renderizar.
import { StyleSheet, Text, TextInput } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

export const FUENTES_APP = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

const familiaPorPeso = (peso: unknown): string => {
  switch (String(peso ?? "400")) {
    case "500":
      return "Inter_500Medium";
    case "600":
      return "Inter_600SemiBold";
    case "700":
    case "bold":
      return "Inter_700Bold";
    case "800":
    case "900":
      return "Inter_800ExtraBold";
    default:
      return "Inter_400Regular";
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
