import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../Screens/Home/Home";
import Multas from "../Screens/itemsPage/Multas";
import SOAT from "../Screens/itemsPage/Soat";

export type HomeStackParamList = {
  HomeScreen: undefined;
  Multas: { placa: string };
  SOAT: { placa: string };
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
      <Stack.Screen name="SOAT" component={SOAT} />
    </Stack.Navigator>
  );
}
