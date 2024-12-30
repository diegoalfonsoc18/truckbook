import { View, Text } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import GastosNavigation from "../Screens/Gastos";

const Stack = createStackNavigator();

export default function MainNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Gastos" component={GastosNavigation} />
    </Stack.Navigator>
  );
}
