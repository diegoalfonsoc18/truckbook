import React, { useState, useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Constants from "expo-constants";
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

const IS_IOS = Platform.OS === "ios";
// react-native-bottom-tabs es nativo → NO existe en Expo Go. Ahí caemos al
// tab bar JS. El Liquid Glass nativo se ve solo en dev/prod build.
const IN_EXPO_GO = Constants.executionEnvironment === "storeClient";
const USE_NATIVE_TABS = IS_IOS && !IN_EXPO_GO;

// PNG (template) generados desde los mismos SVG originales — el tab bar nativo
// los tinta con el color activo/inactivo. focused = filled, inactivo = outline.
const TAB_ICONS: Record<string, { on: number; off: number }> = {
  Home: {
    on: require("../assets/icons/tabbar/home-active.png"),
    off: require("../assets/icons/tabbar/home.png"),
  },
  Gastos: {
    on: require("../assets/icons/tabbar/gastos-active.png"),
    off: require("../assets/icons/tabbar/gastos.png"),
  },
  Ingresos: {
    on: require("../assets/icons/tabbar/ingresos-active.png"),
    off: require("../assets/icons/tabbar/ingresos.png"),
  },
  Reportes: {
    on: require("../assets/icons/tabbar/reportes-active.png"),
    off: require("../assets/icons/tabbar/reportes.png"),
  },
  Cuenta: {
    on: require("../assets/icons/tabbar/cuenta-active.png"),
    off: require("../assets/icons/tabbar/cuenta.png"),
  },
};

// require() condicional: la librería nativa (react-native-bottom-tabs) hace
// registro nativo eager al importarse y reventaría en Expo Go. Solo se carga
// en dev/prod build.
const NativeTab: any = USE_NATIVE_TABS
  ? require("@bottom-tabs/react-navigation").createNativeBottomTabNavigator()
  : null;
const JsTab = createBottomTabNavigator();

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

  // ── iOS (dev/prod build): UITabBar nativa → Liquid Glass automático
  //    (iOS 26). No fijar backgroundColor para que el sistema aplique el
  //    material de vidrio. ──
  if (USE_NATIVE_TABS) {
    return (
      <View style={styles.root}>
        <NativeTab.Navigator
          initialRouteName="Home"
          translucent
          tabBarActiveTintColor={colors.accent}
          tabBarInactiveTintColor={colors.textSecondary}
          hapticFeedbackEnabled
          screenOptions={({ route }: { route: { name: string } }) => ({
            tabBarIcon: ({ focused }: { focused: boolean }) =>
              focused ? TAB_ICONS[route.name].on : TAB_ICONS[route.name].off,
          })}>
          <NativeTab.Screen
            name="Home"
            component={ConductorNavigation}
            options={{ title: "Home" }}
          />
          <NativeTab.Screen
            name="Gastos"
            component={GastosNavigation}
            options={{ title: "Gastos" }}
          />
          <NativeTab.Screen
            name="Ingresos"
            component={IngresosNavigation}
            options={{ title: "Ingresos" }}
          />
          <NativeTab.Screen
            name="Reportes"
            component={FinanzasNavigation}
            options={{ title: "Reportes" }}
          />
          <NativeTab.Screen
            name="Cuenta"
            component={Account}
            options={{ title: "Cuenta" }}
          />
        </NativeTab.Navigator>
      </View>
    );
  }

  // ── Android: barra JS sólida clásica con los íconos SVG originales ──
  const tabBarStyle = {
    ...styles.tabBarAndroid,
    backgroundColor: colors.cardBg,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: isDark ? 0.4 : 0.12,
    height: 60 + insets.bottom,
    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
  };

  return (
    <View style={styles.root}>
      <JsTab.Navigator
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
        <JsTab.Screen name="Home"     component={ConductorNavigation} />
        <JsTab.Screen name="Gastos"   component={GastosNavigation} />
        <JsTab.Screen name="Ingresos" component={IngresosNavigation} />
        <JsTab.Screen name="Reportes" component={FinanzasNavigation} />
        <JsTab.Screen name="Cuenta"   component={Account} />
      </JsTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBarAndroid: {
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
