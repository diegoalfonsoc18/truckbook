import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../Screens/Login/Login";
import ForgotPasswordScreen from "../Screens/Login/ForgotPassword";
import Register from "../Screens/Login/Register";
import SelectRoleScreen from "../Screens/Login/SelectRole";

type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  SelectRole: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="SelectRole" component={SelectRoleScreen} />
    </Stack.Navigator>
  );
}
