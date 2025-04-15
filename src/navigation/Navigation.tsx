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
      screenOptions={{
        headerShown: false, // Oculta el encabezado
        tabBarStyle: styles.tabBar, // Aplica estilos centralizados
      }}>
      <Tab.Screen
        name="Gastos"
        component={GastosNavigation}
        options={screenOptions(renderGastos)}
      />
      <Tab.Screen
        name="Ingresos"
        component={IngresosNavigation}
        options={screenOptions(renderIngresos)}
      />
      <Tab.Screen
        name="Home"
        component={Home}
        options={screenOptions(renderHome)}
      />
      <Tab.Screen
        name="Finanzas"
        component={FinanzasNavigation}
        options={screenOptions(renderFinanzas)}
      />
      <Tab.Screen
        name="Account"
        component={Account}
        options={screenOptions(renderAccount)}
      />
    </Tab.Navigator>
  );
}

// Estilos centralizados
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    backgroundColor: "#393E46",
    borderTopWidth: 0,
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
  },
});
