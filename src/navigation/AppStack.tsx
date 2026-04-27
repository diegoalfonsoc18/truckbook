import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRoleStore, UserRole } from "../store/RoleStore";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "../Screens/Ingresos/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import ConductorNavigation from "./ConductorNavigation";
import AdministradorNavigation from "./AdministradorNavigation";
import PropietarioNavigation from "./PropietarioNavigation";
import Account from "../Screens/Cuenta/Cuenta";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../constants/Themecontext";

const Tab = createBottomTabNavigator();

export default function AppStack() {
  const { colors, isDark } = useTheme();
  const role = useRoleStore((state) => state.role) as UserRole | null;

  const getInitialRouteName = (): "Home" | "Cuenta" => {
    if (!role) return "Cuenta";
    return "Home";
  };

  // Estilos dinámicos para el tab bar
  const tabBarStyle = {
    ...styles.tabBar,
    backgroundColor: colors.cardBg,
    borderTopColor: colors.border,
    shadowColor: isDark ? "#000" : "#000",
    shadowOpacity: isDark ? 0.4 : 0.12,
  };

  return (
    <Tab.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          const iconSize = 24;
          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Gastos":
              iconName = focused ? "wallet" : "wallet-outline";
              break;
            case "Ingresos":
              iconName = focused ? "trending-up" : "trending-up-outline";
              break;
            case "Reportes":
              iconName = focused ? "bar-chart" : "bar-chart-outline";
              break;
            default:
              iconName = "ellipse-outline";
          }
          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}>
      {/* CONDUCTOR */}
      {role === "conductor" && (
        <>
          <Tab.Screen name="Home" component={ConductorNavigation} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Ingresos" component={IngresosNavigation} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
        </>
      )}

      {/* ADMINISTRADOR */}
      {role === "administrador" && (
        <>
          <Tab.Screen name="Home" component={AdministradorNavigation} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
        </>
      )}

      {/* PROPIETARIO */}
      {role === "propietario" && (
        <>
          <Tab.Screen name="Home" component={PropietarioNavigation} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Ingresos" component={IngresosNavigation} />
        </>
      )}

      {/* SIN ROL */}
      {!role && <Tab.Screen name="Cuenta" component={Account} />}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 16,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
