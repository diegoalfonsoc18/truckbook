import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConductorHome from "../Screens/conductor/ConductorHome";
import Invitaciones from "../Screens/conductor/Invitaciones";
import Cuenta from "../Screens/Cuenta/Cuenta";

export type ConductorStackParamList = {
  ConductorHome: undefined;
  Invitaciones: undefined;
  Cuenta: undefined;
};

const Stack = createNativeStackNavigator<ConductorStackParamList>();

export default function ConductorNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConductorHome" component={ConductorHome} />
      <Stack.Screen name="Invitaciones" component={Invitaciones} />
      <Stack.Screen name="Cuenta" component={Cuenta} options={{ presentation: "card" }} />
    </Stack.Navigator>
  );
}
