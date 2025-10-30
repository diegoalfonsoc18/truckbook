import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../Screens/Home/Home";
import Multas from "../Screens/itemsPage/Multas";
import SOAT from "../Screens/itemsPage/Soat";
import RTM from "../Screens/itemsPage/Rtm";
import Licencia from "../Screens/itemsPage/Licencia";

export type HomeStackParamList = {
  HomeScreen: undefined;
  Multas: { placa: string };
  SOAT: { placa: string };
  RTM: { placa: string };
  Licencia: { documento: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "default",
      }}>
      <Stack.Screen name="HomeScreen" component={Home} />
      <Stack.Screen name="Multas" component={Multas} />
      <Stack.Screen name="SOAT" component={SOAT} />
      <Stack.Screen name="RTM" component={RTM} />
      <Stack.Screen name="Licencia" component={Licencia} />
    </Stack.Navigator>
  );
}
