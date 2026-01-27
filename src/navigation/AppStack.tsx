import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRoleStore, UserRole } from "../store/RoleStore";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "../Screens/Ingresos/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import ConductorHome from "../Screens/conductor/ConductorHome";
import AdministradorHome from "../Screens/administrador/AdministradorHome";
import PropietarioHome from "../Screens/propietario/PropietarioHome ";
import Account from "../Screens/Cuenta/Cuenta";
import {
  renderGastos,
  renderIngresos,
  renderHome,
  renderFinanzas,
  renderCuenta,
} from "../assets/icons/icons";
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
          switch (route.name) {
            case "Gastos":
              return renderGastos(color, size, focused);
            case "Ingresos":
              return renderIngresos(color, size, focused);
            case "Home":
              return renderHome(color, size, focused);
            case "Reportes":
              return renderFinanzas(color, size, focused);
            case "Cuenta":
              return renderCuenta(color, size, focused);
            default:
              return null;
          }
        },
      })}>
      {/* CONDUCTOR */}
      {role === "conductor" && (
        <>
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Ingresos" component={IngresosNavigation} />
          <Tab.Screen name="Home" component={ConductorHome} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
          <Tab.Screen name="Cuenta" component={Account} />
        </>
      )}

      {/* ADMINISTRADOR */}
      {role === "administrador" && (
        <>
          <Tab.Screen name="Home" component={AdministradorHome} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
          <Tab.Screen name="Cuenta" component={Account} />
        </>
      )}

      {/* PROPIETARIO */}
      {role === "propietario" && (
        <>
          <Tab.Screen name="Home" component={PropietarioHome} />
          <Tab.Screen name="Reportes" component={FinanzasNavigation} />
          <Tab.Screen name="Gastos" component={GastosNavigation} />
          <Tab.Screen name="Ingresos" component={IngresosNavigation} />
          <Tab.Screen name="Cuenta" component={Account} />
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
