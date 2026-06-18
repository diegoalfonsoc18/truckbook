import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConductorHome from "../Screens/conductor/ConductorHome";
import Cuenta from "../Screens/Cuenta/Cuenta";

export type ConductorStackParamList = {
  ConductorHome: undefined;
  Cuenta: undefined;
};

const Stack = createNativeStackNavigator<ConductorStackParamList>();

export default function ConductorNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConductorHome" component={ConductorHome} />
      <Stack.Screen name="Cuenta" component={Cuenta} options={{ presentation: "card" }} />
    </Stack.Navigator>
  );
}
