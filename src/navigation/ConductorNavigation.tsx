import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConductorHome from "../Screens/conductor/ConductorHome";
import Cuenta from "../Screens/Cuenta/Cuenta";
import Movimientos from "../Screens/Movimientos/Movimientos";

export type ConductorStackParamList = {
  ConductorHome: undefined;
  Cuenta: undefined;
  Movimientos: undefined;
};

const Stack = createNativeStackNavigator<ConductorStackParamList>();

export default function ConductorNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConductorHome" component={ConductorHome} />
      <Stack.Screen name="Cuenta" component={Cuenta} options={{ presentation: "card" }} />
      <Stack.Screen name="Movimientos" component={Movimientos} />
    </Stack.Navigator>
  );
}
