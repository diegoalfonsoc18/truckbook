import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import supabase from "../../config/SupaBaseConfig"; // Asegúrate que este archivo exporta la instancia correctamente
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// Define tu stack de rutas
type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  Home: undefined; // <-- Agrega esta línea
  // otras rutas...
};

// Usa las props tipadas
type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function Register({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    if (!email || !password) {
      Alert.alert(
        "Campos incompletos",
        "Por favor ingresa correo y contraseña."
      );
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    if (data.session) {
      // Usuario registrado y logueado automáticamente
      Alert.alert("¡Bienvenido!", "Registro exitoso.");
      // No navegues manualmente, el cambio de sesión mostrará AppStack
    } else {
      // Si tu proyecto requiere confirmación de correo
      Alert.alert(
        "Registro exitoso",
        "Revisa tu correo para confirmar tu cuenta."
      );
      navigation.navigate("Login");
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
    <View style={styles.containerRegister}>
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/img/camion.png")}
          style={styles.imageLogin}
        />
      </View>
      <View style={styles.registerSingContainer}>
        <Text style={styles.loginTitle}>Sing up</Text>
        <TextInput
          placeholder="Correo"
          onChangeText={setEmail}
          value={email}
          style={styles.inputLogin}
        />
        <TextInput
          placeholder="Contraseña"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          style={styles.inputLogin}
        />
        <TextInput
          placeholder="Confirmar Contraseña"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          style={styles.inputLogin}
        />
        <Text style={styles.textLogin}>
          I have read and accept the Privacy Policy
        </Text>
        <TouchableOpacity style={styles.button} onPress={register}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>
        <Text style={styles.textLogin}>I'm already registered, </Text>
      </View>
    </View>
  );
}
