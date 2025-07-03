import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FinanzasGenerales from "../Screens/FinanzasGeneral/FinanzasGenerales";

const Tab = createBottomTabNavigator();

export default function FinanzasNavigation() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="FinanzasGenerales"
        component={FinanzasGenerales}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
