import React from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos/Gastos";
import IngresosNavigation from "../Screens/Ingresos/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGeneral/FinanzasGenerales";
import Home from "../Screens/Home/Home";
import Account from "../Screens/Account/Account"; // Asegúrate de que la ruta sea correcta
// Asegúrate de que la ruta sea correcta y que el archivo exista
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

// Función para configurar las opciones de cada pantalla
const screenOptions = (icon: () => React.ReactNode) => ({
  tabBarLabel: "", // Oculta el texto del tab
  tabBarIcon: () => icon(), // Llama a la función para renderizar el ícono
});

// Componente principal de navegación
export default function AppStack() {
  //const insets = useSafeAreaInsets(); // Obtener los insets de la pantalla
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false, // Oculta el encabezado
        tabBarStyle: styles.tabBar, // Aplica estilos al tabBar
        tabBarActiveTintColor: COLORS.primary, // Color del ícono activo
        tabBarInactiveTintColor: COLORS.textTertiary,

        tabBarIcon: ({ focused, color, size }) => {
          // Renderiza el ícono correspondiente según la pestaña
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
      <Tab.Screen name="Home" component={Home} />
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

    // ✅ Sombra más visible
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,

    elevation: 16, // Android

    overflow: "visible",
  },
});
