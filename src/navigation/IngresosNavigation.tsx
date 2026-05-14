import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import IngresosScreen from "../Screens/Ingresos/Ingresos";
import CuentaCobro from "../Screens/Ingresos/CuentaCobro";

export type IngresosStackParamList = {
  Ingresos: undefined;
  CuentaCobro: undefined;
};

const Stack = createNativeStackNavigator<IngresosStackParamList>();

export default function IngresosNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Ingresos" component={IngresosScreen} />
      <Stack.Screen name="CuentaCobro" component={CuentaCobro} />
    </Stack.Navigator>
  );
}
