import { View, Text } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeNavigation from "../Screens/Home";

const Tab = createBottomTabNavigator();

export default function Navigation() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Navigation.js"
        component={HomeNavigation}
        /* options={{ headerShown: false }} */
      />
    </Tab.Navigator>
  );
}
