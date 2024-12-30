import { View, Text } from "react-native";
import React from "react";
import GastosScreen from "../Screens/Gastos";

export default function GastosNavigation() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Gastos"
        component={GastosScreen}
        /* options={{ headerShown: false }} */
      />
    </Tab.Navigator>
  );
}
