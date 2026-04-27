import React from "react";
import { Image, ImageStyle } from "react-native";

const ICONS = {
  conductor:  require("../assets/icons/conductor.webp"),
  truck:      require("../assets/icons/truck.webp"),
  volqueta:   require("../assets/icons/volqueta.webp"),
  factura:    require("../assets/icons/factura.webp"),
  report:     require("../assets/icons/report.webp"),
  shield:     require("../assets/icons/shield.webp"),
  tool:       require("../assets/icons/tool.webp"),
  comparendo: require("../assets/icons/comparendo.webp"),
  // Gastos
  fuel:       require("../assets/icons/fuel.webp"),
  toll:       require("../assets/icons/toll.webp"),
  food:       require("../assets/icons/food.webp"),
  hotel:      require("../assets/icons/hotel.webp"),
  parking:    require("../assets/icons/parking.webp"),
  otros:      require("../assets/icons/otros.webp"),
  repair:     require("../assets/icons/repair.webp"),
  tire:       require("../assets/icons/tire.webp"),
  wash:       require("../assets/icons/wash.webp"),
  oil:        require("../assets/icons/oil.webp"),
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
