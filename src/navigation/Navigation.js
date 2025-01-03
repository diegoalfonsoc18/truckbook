import { View, Text } from "react-native";
import { Image } from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { StyleSheet } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGenerales";
import Home from "../Screens/Home";
import Account from "../Screens/account";

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
        name="Parking"
        component={Home}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderHome(),
        }}
        r
      />
      <Tab.Screen
        name="Finanzas"
        component={FinanzasNavigation}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderFinanzas(),
        }}
      />

      <Tab.Screen
        name="Account"
        component={Account}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderAccount(),
        }}
      />
    </Tab.Navigator>
  );
}

function renderHome() {
  return (
    <Image
      source={require("../assets/homeIcon.png")}
      style={{ width: 40, height: 40, top: 15 }}
    />
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
      style={{ width: 50, height: 50, top: 15 }}
    />
  );
}

function renderAccount() {
  return (
    <Image
      source={require("../assets/accountIcon.png")}
      style={{ width: 40, height: 40, top: 15 }}
    />
  );
}
