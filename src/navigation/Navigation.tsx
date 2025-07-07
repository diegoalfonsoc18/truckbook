import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "../Screens/Ingresos/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import Home from "../Screens/Home/Home";
import Account from "../Screens/Account/Account";
import InsertarCamiones from "../Temporary/Temporary"; // <- Aquí está la pantalla de carga

import {
  renderGastos,
  renderIngresos,
  renderHome,
  renderFinanzas,
  renderAccount,
} from "../assets/icons/icons";

import { COLORS } from "../constants/colors";

// Crear el Tab Navigator
const Tab = createBottomTabNavigator();

export default function MainNavigation() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.accent,
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case "Gastos":
              return renderGastos(color, size);
            case "Ingresos":
              return renderIngresos(color, size);
            case "Home":
              return renderHome(color, size);
            case "Reportes":
              return renderFinanzas(color, size);
            case "Account":
              return renderAccount(color, size);
            default:
              return null; // 🔒 InsertarCamiones no tiene ícono
          }
        },
      })}>
      <Tab.Screen name="Gastos" component={GastosNavigation} />
      <Tab.Screen name="Ingresos" component={IngresosNavigation} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Reportes" component={FinanzasNavigation} />
      <Tab.Screen name="Account" component={Account} />

      {/* 🔒 Pantalla oculta, no aparece en el TabBar */}
      <Tab.Screen
        name="InsertarCamiones"
        component={InsertarCamiones}
        options={{
          tabBarButton: () => null, // ❌ Oculta del tab bar
          headerShown: true, // ✅ Muestra encabezado si navegas a ella
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
});
