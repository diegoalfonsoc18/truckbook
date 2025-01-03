import { View, Text } from "react-native";
import React from "react";
import IngresosScreen from "../Screens/Ingresos";

export default function IngresosNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Ingresos"
        component={IngresosScreen}
        /* options={{ headerShown: false }} */
      />
    </Stack.Navigator>
  );
}
