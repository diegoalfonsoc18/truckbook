import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVehiculoStore } from "../store/VehiculoStore";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "./IngresosNavigation";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import ConductorNavigation from "./ConductorNavigation";
import Account from "../Screens/Cuenta/Cuenta";
import { useTheme } from "../constants/Themecontext";
import {
  renderHome,
  renderGastos,
  renderIngresos,
  renderFinanzas,
  renderCuenta,
} from "../assets/icons/icons";

const Tab = createBottomTabNavigator();

export default function AppStack() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Esperar a que Zustand rehidrate VehiculoStore desde AsyncStorage
  const vehiculoHydrated = useVehiculoStore.persist.hasHydrated();
  const [hydrated, setHydrated] = useState(() => vehiculoHydrated);

  useEffect(() => {
    if (hydrated) return;
    const unsub = useVehiculoStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return () => unsub?.();
  }, []);

  if (!hydrated) return null;

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
    <View style={styles.root}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: tabBarStyle,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused, color, size }) => {
            switch (route.name) {
              case "Home":    return renderHome({ color, size, focused });
              case "Gastos":  return renderGastos({ color, size, focused });
              case "Ingresos": return renderIngresos({ color, size, focused });
              case "Reportes": return renderFinanzas({ color, size, focused });
              case "Cuenta":  return renderCuenta({ color, size, focused });
              default: return null;
            }
          },
        })}>
        <Tab.Screen name="Home"     component={ConductorNavigation} />
        <Tab.Screen name="Gastos"   component={GastosNavigation} />
        <Tab.Screen name="Ingresos" component={IngresosNavigation} />
        <Tab.Screen name="Reportes" component={FinanzasNavigation} />
        <Tab.Screen name="Cuenta"   component={Account} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
