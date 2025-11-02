import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// ✅ Agregar SelectRole a las rutas
type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  SelectRole: undefined; // ✅ NUEVO
  Home: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function Register({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(
        "Campos incompletos",
        "Por favor ingresa correo y contraseña."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // ✅ Usuario registrado automáticamente
        Alert.alert("¡Bienvenido!", "Registro exitoso.");
        // ✅ Navega a SelectRole
        navigation.replace("SelectRole");
      } else {
        // Si requiere confirmación de correo
        Alert.alert(
          "Registro exitoso",
          "Revisa tu correo para confirmar tu cuenta."
        );
        navigation.navigate("Login");
      }
    } finally {
      setLoading(false);
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
        <Text style={styles.loginTitle}>Sign up</Text>

        <TextInput
          placeholder="Correo"
          onChangeText={setEmail}
          value={email}
          style={styles.inputRegister}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          placeholder="Contraseña"
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          style={styles.inputRegister}
          editable={!loading}
        />

        <TextInput
          placeholder="Confirmar Contraseña"
          onChangeText={setConfirmPassword}
          value={confirmPassword}
          secureTextEntry
          style={styles.inputRegister}
          editable={!loading}
        />

        <Text style={styles.textFooter}>
          He leído y acepto la Política de Privacidad
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={register}
          disabled={loading}>
          <Text style={styles.buttonTextContinue}>
            {loading ? "Registrando..." : "Registrarse"}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginLinkContainer}>
          <Text style={styles.textLogin}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            disabled={loading}>
            <Text style={styles.textLoginLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
