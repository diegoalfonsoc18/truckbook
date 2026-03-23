import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PropietarioHome from "../Screens/propietario/PropietarioHome ";
import SolicitudesVehiculo from "../Screens/propietario/SolicitudesVehiculo";
import GestionConductores from "../Screens/propietario/GestionConductores";
import GestionVehiculos from "../Screens/shared/GestionVehiculos";
import AdministradorReportes from "../Screens/administrador/AdministradorReportes";

export type PropietarioStackParamList = {
  PropietarioHome: undefined;
  SolicitudesVehiculo: undefined;
  GestionConductores: undefined;
  PropietarioVehiculos: undefined;
  PropietarioReportes: undefined;
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
      <Stack.Screen
        name="PropietarioVehiculos"
        component={GestionVehiculos}
      />
      <Stack.Screen
        name="PropietarioReportes"
        component={AdministradorReportes}
      />
    </Stack.Navigator>
  );
}
