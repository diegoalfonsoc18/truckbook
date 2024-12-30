import { View, Text } from "react-native";
import { Image } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StyleSheet } from "react-native";
import React from "react";

import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";

const Tab = createMaterialTopTabNavigator();

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
    </Tab.Navigator>
  );
}

function renderGastos() {
  return (
    <Image
      source={require("../assets/gastosIcon.png")}
      style={{ width: 55, height: 55, top: 55 }}
    />
  );
}

function renderIngresos() {
  return (
    <Image
      source={require("../assets/ingresoIcon.png")}
      style={{ width: 55, height: 55, top: 55 }}
    />
  );
}

function renderFinanzas() {
  return (
    <Image
      source={require("../assets/finanzasIcon.png")}
      style={{ width: 55, height: 55, top: 55 }}
    />
  );
}
