// LoginScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Alert, Image } from "react-native";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { styles } from "../../constants/GastosStyles";

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
// Define tus rutas
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined;
  Register: undefined;
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
      Alert.alert("¡Bienvenido!", "Inicio de sesión exitoso.");
      // No navegues manualmente, el cambio de sesión mostrará AppStack
    }
  };

  // NUEVO: función para registrar usuario
  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Registro exitoso",
        "Revisa tu correo para confirmar tu cuenta."
      );
      // Puedes navegar a Home si quieres:
      // navigation.replace("Home");
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    const redirectTo = Linking.createURL("/");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    if (data?.url) {
      await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    }
  };

  return (
    <View style={styles.containerLogin}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/img/camion.png")}
          style={styles.imageLogin}
        />
      </View>
      <View style={styles.mailPasswordContainer}>
        <TextInput
          placeholder="Correo"
          style={styles.inputLogin}
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
        />
        <TextInput
          placeholder="Contraseña"
          secureTextEntry={true}
          style={styles.inputLogin}
          autoCapitalize="none"
          onChangeText={setPassword}
          value={password}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>
        {/* BOTÓN DE REGISTRO */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#28a745", marginTop: 10 }]}
          onPress={() => navigation.navigate("Register")}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
          <Text
            style={{ color: "#007bff", marginTop: 16, textAlign: "center" }}>
            ¿Olvidaste tu contraseña?
          </Text>
        </TouchableOpacity>
        <View style={styles.socialLoginContainer}>
          <TouchableOpacity
            style={[styles.iconSocialGoogle]}
            onPress={() => handleSocialLogin("google")}>
            <MaterialCommunityIcons
              name="google-plus"
              size={24}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconSocialFacebook]}
            onPress={() => handleSocialLogin("facebook")}>
            <FontAwesome name="facebook-f" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
