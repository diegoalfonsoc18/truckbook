import React, { useState } from "react";
import { View, TextInput, Button, Alert, Text } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

// 1. Define los tipos de tus rutas (ajusta según tu estructura real)
type RootStackParamList = {
  Login: undefined;
  Registro: undefined;
  // ...otras rutas
};

// 2. Usa el tipo en useNavigation
export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Bienvenido");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Correo" onChangeText={setEmail} value={email} />
      <TextInput
        placeholder="Contraseña"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />
      <Button title="Iniciar sesión" onPress={login} />
      <Text onPress={() => navigation.navigate("Registro")}>
        ¿No tienes cuenta? Regístrate
      </Text>
    </View>
  );
}
