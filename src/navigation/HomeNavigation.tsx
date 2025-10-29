// src/navigation/HomeNavigation.tsx (O donde lo tengas)

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../Screens/Home/Home";
import Multas from "../Screens/itemsPage/Multas";

export type HomeStackParamList = {
  HomeScreen: undefined;
  Multas: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}>
      <Stack.Screen
        name="HomeScreen"
        component={Home}
        options={{
          title: "Home",
        }}
      />
      <Stack.Screen
        name="Multas"
        component={Multas}
        options={{
          title: "Mis Multas",
        }}
      />
    </Stack.Navigator>
  );
}
