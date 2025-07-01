import { View, Text } from "react-native";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import IngresosScreen from "../Screens/Ingresos/Ingresos";

const Stack = createNativeStackNavigator();

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
