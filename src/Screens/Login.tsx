// LoginScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Alert, Image } from "react-native";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

import supabase from "../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { styles } from "../constants/GastosStyles";

// Define tus rutas
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined; // <-- Agrega esta línea
  // otras rutas...
};

// Tipa las props del componente
type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      navigation.replace("Home"); // O navega a tu stack principal
    }
  };

  return (
    <View style={styles.containerLogin}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../assets/images/camion.png")}
          style={styles.imageLogin}
        />
      </View>
      <View style={styles.mailPasswordContainer}>
        <TextInput
          placeholder="Correo"
          //placeholderTextColor="#999"
          style={styles.inputLogin}
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          placeholder="Contraseña"
          secureTextEntry={true}
          //placeholderTextColor="#999"
          style={styles.inputLogin}
          autoCapitalize="none"
          onChangeText={setPassword}
          value={password}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")} // Asegúrate de tener esta ruta en tu stack
        >
          <Text
            style={{ color: "#007bff", marginTop: 16, textAlign: "center" }}>
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
