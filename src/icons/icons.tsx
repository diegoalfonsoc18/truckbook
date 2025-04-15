import React from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";

// Define el tipo de retorno para las funciones de íconos
type IconRenderer = () => React.ReactNode;

export const renderGastos = (color: string, size: number) => (
  <MaterialCommunityIcons
    name="gas-station-outline"
    size={size}
    color={color}
  />
);

export const renderIngresos = (color: string, size: number) => (
  <Fontisto name="dollar" size={size} color={color} />
);

export const renderHome = (color: string, size: number) => (
  <MaterialCommunityIcons name="car-brake-parking" size={size} color={color} />
);

export const renderFinanzas = (color: string, size: number) => (
  <SimpleLineIcons name="graph" size={size} color={color} />
);

export const renderAccount = (color: string, size: number) => (
  <FontAwesome name="drivers-license-o" size={size} color={color} />
);
