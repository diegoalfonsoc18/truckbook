import React, { useState } from "react";
import { View, TextInput, Text, Alert, TouchableOpacity } from "react-native";
import supabase from "../../config/SupaBaseConfig"; // Asegúrate que este archivo exporta la instancia correctamente
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";

// Define tu stack de rutas
type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
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
      navigation.navigate("Login");
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Correo"
        onChangeText={setEmail}
        value={email}
        style={styles.input}
      />
      <TextInput
        placeholder="Contraseña"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={register}>
        <Text style={styles.buttonText}>Registrarse</Text>
      </TouchableOpacity>
    </View>
  );
}
