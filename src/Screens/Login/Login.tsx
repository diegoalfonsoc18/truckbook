import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { COLORS } from "../../constants/colors";
import camionImage from "../../assets/img/T880.webp";

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    Keyboard.dismiss(); // ✅ Ocultar teclado

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("¡Bienvenido!", "Inicio de sesión exitoso.");
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    Keyboard.dismiss(); // ✅ Ocultar teclado

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.containerLogin}>
        <View style={styles.imageContainer}>
          <Image source={camionImage} style={styles.imageLogin} />
        </View>

        <View style={styles.LoginSingContainer}>
          <View style={styles.loginPasswordContainer}>
            <Text style={styles.loginTitle}>Login</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.inputLogin}
              autoCapitalize="none"
              onChangeText={setEmail}
              value={email}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={true}
              style={styles.inputLogin}
              autoCapitalize="none"
              onChangeText={setPassword}
              value={password}
            />
            <TouchableOpacity
              style={styles.containerTextPassword}
              onPress={() => {
                Keyboard.dismiss(); // ✅ Ocultar al navegar
                navigation.navigate("ForgotPassword");
              }}>
              <Text style={styles.textPassword}>Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonTextContinue}>Continue</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.containerSingUp}>
            <Text style={styles.textLogin}>O, continue con</Text>
            <TouchableOpacity
              style={[styles.iconSocialGoogle]}
              onPress={() => handleSocialLogin("google")}>
              <Image
                source={require("../../assets/img/google.png")}
                style={styles.imageSocials}
              />
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconSocialFacebook]}
              onPress={() => handleSocialLogin("facebook")}>
              <Image
                source={require("../../assets/img/facebook.png")}
                style={styles.imageSocials}
              />
              <Text style={styles.buttonText}>Sign in with Facebook</Text>
            </TouchableOpacity>

            <Text style={styles.textLinkRegister}>
              Don't have an account?{" "}
              <Text
                style={[styles.textLogin, { color: COLORS.primary }]}
                onPress={() => {
                  Keyboard.dismiss(); // ✅ Ocultar al navegar
                  navigation.navigate("Register");
                }}>
                Sign up
              </Text>
            </Text>
            <Text style={styles.textFooter}>
              By creating this account, you agree to our
            </Text>
            <Text style={styles.textFooter}>
              Privacy Policy and Cookie Policy
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
