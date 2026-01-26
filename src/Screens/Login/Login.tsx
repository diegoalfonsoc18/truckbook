import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { COLORS } from "../../constants/colors";
import { CamionT800 } from "../../assets/img/img";

// ✅ Importante para cerrar el browser después del OAuth
WebBrowser.maybeCompleteAuthSession();

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
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("¡Bienvenido!", "Inicio de sesión exitoso.");
      }
    } catch (e) {
      console.error("Login error:", e);
      Alert.alert(
        "Error",
        "No se pudo conectar. Verifica tu conexión a internet.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      // ✅ Usar el scheme de tu app
      const redirectTo = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true, // ✅ Importante para Expo
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );

        if (result.type === "success" && result.url) {
          // ✅ Extraer tokens de la URL
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (e) {
      console.error("Social login error:", e);
      Alert.alert("Error", "No se pudo completar el inicio de sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.containerLogin}>
        <View style={styles.imageContainer}>
          <Image source={CamionT800} style={styles.imageLogin} />
        </View>

        <View style={styles.LoginSingContainer}>
          <View style={styles.loginPasswordContainer}>
            <Text style={styles.loginTitle}>Login</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.inputLogin}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onChangeText={setEmail}
              value={email}
              editable={!loading}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry
              style={styles.inputLogin}
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              value={password}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.containerTextPassword}
              onPress={() => {
                Keyboard.dismiss();
                navigation.navigate("ForgotPassword");
              }}
              disabled={loading}>
              <Text style={styles.textPassword}>Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonTextContinue}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.containerSingUp}>
            <Text style={styles.textLogin}>O, continue con</Text>
            <TouchableOpacity
              style={styles.iconSocialGoogle}
              onPress={() => handleSocialLogin("google")}
              disabled={loading}>
              <Image
                source={require("../../assets/img/google.png")}
                style={styles.imageSocials}
              />
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconSocialFacebook}
              onPress={() => handleSocialLogin("facebook")}
              disabled={loading}>
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
                  Keyboard.dismiss();
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
