import React from "react";
import { Image, ImageStyle } from "react-native";

const ICONS = {
  conductor: require("../assets/icons/conductor.webp"),
  truck: require("../assets/icons/truck.webp"),
  volqueta: require("../assets/icons/volqueta.webp"),
  factura: require("../assets/icons/factura.webp"),
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  style?: ImageStyle;
}

export default function ItemIcon({ name, size = 44, style }: Props) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
