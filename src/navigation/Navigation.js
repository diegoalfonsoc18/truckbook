import { View, Text } from "react-native";
import { Image } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StyleSheet } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGenerales";

const Tab = createBottomTabNavigator();

export default function MainNavigation() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Gastos"
        component={GastosNavigation}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderGastos(),
        }}
      />
      <Tab.Screen
        name="Ingresos"
        component={IngresosNavigation}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderIngresos(),
        }}
      />
      <Tab.Screen
        name="Finanzas"
        component={FinanzasNavigation}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderFinanzas(),
        }}
      />
    </Tab.Navigator>
  );
}

function renderGastos() {
  return (
    <Image
      source={require("../assets/gastosIcon.png")}
      style={{ width: 40, height: 40, top: 15 }}
    />
  );
}

function renderIngresos() {
  return (
    <Image
      source={require("../assets/ingresoIcon.png")}
      style={{ width: 40, height: 40, top: 15 }}
    />
  );
}

function renderFinanzas() {
  return (
    <Image
      source={require("../assets/finanzasIcon.png")}
      style={{ width: 55, height: 55, top: 15 }}
    />
  );
}
