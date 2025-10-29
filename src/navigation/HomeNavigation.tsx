// src/navigation/HomeNavigation.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../Screens/Home/Home";
import Multas from "../Screens/itemsPage/Multas";

export type HomeStackParamList = {
  HomeScreen: undefined;
  Multas: { placa: string }; // ← AGREGAR parámetro placa
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}>
      <Stack.Screen name="HomeScreen" component={Home} />
      <Stack.Screen name="Multas" component={Multas} />
    </Stack.Navigator>
  );
}
