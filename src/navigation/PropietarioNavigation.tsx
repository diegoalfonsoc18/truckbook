import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PropietarioHome from "../Screens/propietario/PropietarioHome ";
import SolicitudesVehiculo from "../Screens/propietario/SolicitudesVehiculo";
import GestionConductores from "../Screens/propietario/GestionConductores";

export type PropietarioStackParamList = {
  PropietarioHome: undefined;
  SolicitudesVehiculo: undefined;
  GestionConductores: undefined;
};

const Stack = createNativeStackNavigator<PropietarioStackParamList>();

export default function PropietarioNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "default",
      }}>
      <Stack.Screen name="PropietarioHome" component={PropietarioHome} />
      <Stack.Screen
        name="SolicitudesVehiculo"
        component={SolicitudesVehiculo}
      />
      <Stack.Screen
        name="GestionConductores"
        component={GestionConductores}
      />
    </Stack.Navigator>
  );
}
