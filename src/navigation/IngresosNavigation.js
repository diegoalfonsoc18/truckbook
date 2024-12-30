import { View, Text } from "react-native";
import React from "react";
import Ingresos from "../Screens/Ingresos";

export default function IngresosNavigation() {
  return (
    <tab.Navigator>
      name="Ingresos" component={Ingresos}
      /* options={{ headerShown: false }} */
    </tab.Navigator>
  );
}
