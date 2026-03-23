import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdministradorHome from "../Screens/administrador/AdministradorHome";
import AdministradorReportes from "../Screens/administrador/AdministradorReportes";
import AdminGestionConductores from "../Screens/administrador/AdminGestionConductores";

export type AdministradorStackParamList = {
  AdminHome: undefined;
  AdminReportes: undefined;
  AdminConductores: undefined;
};

const Stack = createNativeStackNavigator<AdministradorStackParamList>();

export default function AdministradorNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdministradorHome} />
      <Stack.Screen name="AdminReportes" component={AdministradorReportes} />
      <Stack.Screen name="AdminConductores" component={AdminGestionConductores} />
    </Stack.Navigator>
  );
}
