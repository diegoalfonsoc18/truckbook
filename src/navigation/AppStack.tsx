import React from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "../Screens/Ingresos/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import HomeNavigation from "../navigation/HomeNavigation"; // ✅ CAMBIO 1: Importar HomeNavigation
import Account from "../Screens/Account/Account";
import {
  renderGastos,
  renderIngresos,
  renderHome,
  renderFinanzas,
  renderAccount,
} from "../assets/icons/icons";
import { COLORS } from "../constants/colors";

const Tab = createBottomTabNavigator();

export default function AppStack() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,

        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case "Gastos":
              return renderGastos(color, size, focused);
            case "Ingresos":
              return renderIngresos(color, size, focused);
            case "Home":
              return renderHome(color, size, focused);
            case "Reportes":
              return renderFinanzas(color, size, focused);
            case "Account":
              return renderAccount(color, size, focused);
            default:
              return null;
          }
        },
      })}>
      <Tab.Screen name="Gastos" component={GastosNavigation} />
      <Tab.Screen name="Ingresos" component={IngresosNavigation} />

      {/* ✅ CAMBIO 2: Usar HomeNavigation en lugar de Home */}
      <Tab.Screen name="Home" component={HomeNavigation} />

      <Tab.Screen name="Reportes" component={FinanzasNavigation} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    width: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 0,
    height: 94,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
    overflow: "visible",
  },
});
