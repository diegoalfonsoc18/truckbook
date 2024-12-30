import { View, Text } from "react-native";
import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { NavigationContainer } from "@react-navigation/native";
import GastosScreen from "../Screens/Gastos";

const Tab = createMaterialTopTabNavigator();

export default function GastosNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="Gastos"
          component={GastosScreen}
          /* options={{ headerShown: false }} */
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
