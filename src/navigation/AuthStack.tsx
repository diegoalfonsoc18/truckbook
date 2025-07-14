import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../Screens/Login/Login";
import ForgotPasswordScreen from "../Screens/Login/ForgotPassword"; // Ajusta la ruta si es diferente
import Register from "../Screens/Login/Register"; // Asegúrate de que esta pantalla exista
type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  // otras rutas...
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Register" component={Register} />
      {/* otras pantallas */}
    </Stack.Navigator>
  );
}
