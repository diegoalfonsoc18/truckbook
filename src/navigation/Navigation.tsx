import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGenerales";
import Home from "../Screens/Home";
import Account from "../Screens/Account";
import {
  renderGastos,
  renderIngresos,
  renderHome,
  renderFinanzas,
  renderAccount,
} from "../icons/icons"; // Centralizamos los íconos en un archivo separado

// Crear el Tab Navigator
const Tab = createBottomTabNavigator();

// Función para configurar las opciones de cada pantalla
const screenOptions = (icon: () => React.ReactNode) => ({
  tabBarLabel: "", // Oculta el texto del tab
  tabBarIcon: () => icon(), // Llama a la función para renderizar el ícono
});

// Componente principal de navegación
export default function MainNavigation() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false, // Oculta el encabezado
        tabBarStyle: styles.tabBar, // Aplica estilos centralizados
        tabBarActiveTintColor: "#FAFF00", // Color del ícono activo
        tabBarInactiveTintColor: "#EEEEEE", // Color del ícono inactivo
        tabBarShowLabel: false, // Oculta las etiquetas de texto
        tabBarIcon: ({ focused, color, size }) => {
          // Renderiza el ícono correspondiente según la pestaña
          switch (route.name) {
            case "Gastos":
              return renderGastos(color, size);
            case "Ingresos":
              return renderIngresos(color, size);
            case "Home":
              return renderHome(color, size);
            case "Finanzas":
              return renderFinanzas(color, size);
            case "Account":
              return renderAccount(color, size);
            default:
              return null;
          }
        },
      })}>
      <Tab.Screen name="Gastos" component={GastosNavigation} />
      <Tab.Screen name="Ingresos" component={IngresosNavigation} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Finanzas" component={FinanzasNavigation} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
}

// Estilos centralizados
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    //backgroundColor: "#393E46",
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
});
