import { StyleSheet, Image } from "react-native";
import React from "react";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Foundation from "@expo/vector-icons/Foundation";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import GastosNavigation from "../Screens/Gastos";
import IngresosNavigation from "../Screens/Ingresos";
import FinanzasNavigation from "../Screens/FinanzasGenerales";

import Home from "../Screens/Home";
import Account from "../Screens/Account";

const Tab = createBottomTabNavigator();

export default function MainNavigation() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#393E46",
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
      }}>
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
    <MaterialCommunityIcons name="gas-station-outline" size={30} color="#fff" />
  );
}

function renderIngresos() {
  return <Fontisto name="dollar" size={24} color="#fff" />;
}

function renderHome() {
  return (
    <MaterialCommunityIcons name="car-brake-parking" size={24} color="#fff" />
  );
}

function renderFinanzas() {
  return <SimpleLineIcons name="graph" size={24} color="#fff" />;
}

function renderAccount() {
  return <FontAwesome name="drivers-license-o" size={24} color="#fff" />;
}
