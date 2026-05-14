import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoleStore } from "../store/RoleStore";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "./IngresosNavigation";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import ConductorNavigation from "./ConductorNavigation";
import Account from "../Screens/Cuenta/Cuenta";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../constants/Themecontext";

const Tab = createBottomTabNavigator();

export default function AppStack() {
  const { colors, isDark } = useTheme();
  const role = useRoleStore((state) => state.role);
  const insets = useSafeAreaInsets();

  const getInitialRouteName = (): "Home" | "Cuenta" => {
    if (!role) return "Cuenta";
    return "Home";
  };

  // Estilos dinámicos para el tab bar — respeta el nav bar de Android
  const tabBarStyle = {
    ...styles.tabBar,
    backgroundColor: colors.cardBg,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: isDark ? 0.4 : 0.12,
    height: 60 + insets.bottom,
    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
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
      {/* CONDUCTOR (único rol activo por ahora) */}
      {role && (
        <>
          <Tab.Screen name="Home" component={ConductorNavigation} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Ingresos" component={IngresosNavigation} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
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
    paddingTop: 8,
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
