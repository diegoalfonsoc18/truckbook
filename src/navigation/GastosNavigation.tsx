import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"; // Importa el creador de navegadores de pestañas
import { View, Text } from "react-native";
import React from "react";
import GastosScreen from "../Screens/Gastos/Gastos";

const Tab = createBottomTabNavigator();

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
