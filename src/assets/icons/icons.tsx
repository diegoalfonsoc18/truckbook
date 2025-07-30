import React from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";

// Gastos: outline y filled
export const renderGastos = (color: string, size: number, focused: boolean) => (
  <MaterialCommunityIcons
    name={focused ? "gas-station" : "gas-station-outline"}
    size={size}
    color={color}
  />
);

// Ingresos: Fontisto no tiene "filled", puedes usar otro icono si quieres
export const renderIngresos = (
  color: string,
  size: number,
  focused: boolean
) => (
  <Fontisto
    name="dollar"
    size={size}
    color={color}
    // Puedes cambiar de librería si quieres un efecto filled
  />
);

// Home: outline y filled
export const renderHome = (color: string, size: number, focused: boolean) => (
  <MaterialCommunityIcons
    name={focused ? "home" : "home-outline"}
    size={size}
    color={color}
  />
);

// Finanzas: SimpleLineIcons no tiene "filled", puedes buscar otro icono si quieres
export const renderFinanzas = (
  color: string,
  size: number,
  focused: boolean
) => <SimpleLineIcons name="graph" size={size} color={color} />;

// Account: FontAwesome ejemplo con dos iconos distintos
export const renderAccount = (
  color: string,
  size: number,
  focused: boolean
) => (
  <FontAwesome name={focused ? "user" : "user-o"} size={size} color={color} />
);
