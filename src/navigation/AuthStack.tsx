import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../Screens/Login";
import ForgotPasswordScreen from "../Screens/Login/ForgotPassword"; // Ajusta la ruta si es diferente

type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  // otras rutas...
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      {/* otras pantallas */}
    </Stack.Navigator>
  );
}
