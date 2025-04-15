import React from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";

// Define el tipo de retorno para las funciones de íconos
type IconRenderer = () => React.ReactNode;

export const renderGastos: IconRenderer = () => (
  <MaterialCommunityIcons name="gas-station-outline" size={32} color="#fff" />
);

export const renderIngresos: IconRenderer = () => (
  <Fontisto name="dollar" size={25} color="#fff" />
);

export const renderHome: IconRenderer = () => (
  <MaterialCommunityIcons name="car-brake-parking" size={30} color="#fff" />
);

export const renderFinanzas: IconRenderer = () => (
  <SimpleLineIcons name="graph" size={30} color="#fff" />
);

export const renderAccount: IconRenderer = () => (
  <FontAwesome name="drivers-license-o" size={26} color="#fff" />
);
