import { View, Text } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MainNavigation from "./MainNavigation";

const Tab = createBottomTabNavigator();

export default function Navigation() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Navigation.js"
        component={MainNavigation}
        /* options={{ headerShown: false }} */
      />
    </Tab.Navigator>
  );
}
