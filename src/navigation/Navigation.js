import { StyleSheet, Image } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGenerales";
import Home from "../Screens/Home";
import Account from "../Screens/Account";

const Tab = createBottomTabNavigator();

export default function MainNavigation() {
  return (
    <Tab.Navigator initialRouteName="Home">
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
        name="Home"
        component={Home}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => renderHome(),
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

function renderGastos() {
  return (
    <Image
      source={require("../assets/gastosIcon.png")}
      style={{ width: 30, height: 30 }}
    />
  );
}

function renderIngresos() {
  return (
    <Image
      source={require("../assets/ingresoIcon.png")}
      style={{ width: 30, height: 30 }}
    />
  );
}

function renderHome() {
  return (
    <Image
      source={require("../assets/homeIcon.png")}
      style={{ width: 30, height: 30 }}
    />
  );
}

function renderFinanzas() {
  return (
    <Image
      source={require("../assets/finanzasIcon.png")}
      style={{ width: 35, height: 35 }}
    />
  );
}

function renderAccount() {
  return (
    <Image
      source={require("../assets/accountIcon.png")}
      style={{ width: 30, height: 30 }}
    />
  );
}
