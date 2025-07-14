import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// Define el tipo de rutas (ajusta si tu stack tiene otro nombre)
type AuthStackParamList = {
  ForgotPassword: undefined;
  // otras rutas...
};

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPassword({ navigation }: Props) {
  const [email, setEmail] = useState("");

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu correo.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://tudominio.com/update-password", // puedes usar tu deep link aquí
    });

    if (error) {
      console.error(error);
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Éxito",
        "Hemos enviado un enlace para restablecer tu contraseña."
      );
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>

      <TextInput
        style={styles.input}
        placeholder="Ingresa tu correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handlePasswordReset}>
        <Text style={styles.buttonText}>Enviar enlace</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  backText: {
    color: "#007bff",
    textAlign: "center",
  },
});
