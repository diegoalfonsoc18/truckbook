import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ConductorHome from "../Screens/conductor/ConductorHome";
import Cuenta from "../Screens/Cuenta/Cuenta";
import Multas from "../Screens/itemsPage/Multas";
import SOAT from "../Screens/itemsPage/Soat";
import RTM from "../Screens/itemsPage/Rtm";
import Licencia from "../Screens/itemsPage/Licencia";

export type ConductorStackParamList = {
  ConductorHome: undefined;
  Cuenta: undefined;
  Multas: { placa: string };
  SOAT: { placa: string };
  RTM: { placa: string };
  Licencia: { documento: string };
};

const Stack = createNativeStackNavigator<ConductorStackParamList>();

export default function ConductorNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConductorHome" component={ConductorHome} />
      <Stack.Screen name="Cuenta" component={Cuenta} options={{ presentation: "card" }} />
      <Stack.Screen name="Multas" component={Multas} />
      <Stack.Screen name="SOAT" component={SOAT} />
      <Stack.Screen name="RTM" component={RTM} />
      <Stack.Screen name="Licencia" component={Licencia} />
    </Stack.Navigator>
  );
}
