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
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { CamionT800 } from "../../assets/img/img";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
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
      const redirectTo = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
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

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    inputBg: { backgroundColor: isDark ? "#252540" : "#F5F5F7" },
  };

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* IMAGEN */}
              <View style={styles.imageContainer}>
                <Image
                  source={CamionT800}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>

              {/* FORMULARIO */}
              <View
                style={[styles.formCard, ds.cardBg, getShadow(isDark, "lg")]}>
                <Text style={[styles.title, ds.text]}>Iniciar Sesión</Text>

                {/* EMAIL */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>
                    Email
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      ds.inputBg,
                      { borderColor: colors.border },
                    ]}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      style={[styles.input, ds.text]}
                      placeholder="tu@correo.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      onChangeText={setEmail}
                      value={email}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* PASSWORD */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>
                    Contraseña
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      ds.inputBg,
                      { borderColor: colors.border },
                    ]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[styles.input, ds.text]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      onChangeText={setPassword}
                      value={password}
                      editable={!loading}
                    />
                  </View>
                </View>

                {/* FORGOT PASSWORD */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => {
                    Keyboard.dismiss();
                    navigation.navigate("ForgotPassword");
                  }}
                  disabled={loading}>
                  <Text
                    style={[
                      styles.forgotPasswordText,
                      { color: colors.accent },
                    ]}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>

                {/* LOGIN BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { backgroundColor: colors.accent },
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Continuar</Text>
                  )}
                </TouchableOpacity>

                {/* DIVIDER */}
                <View style={styles.divider}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <Text style={[styles.dividerText, ds.textMuted]}>
                    o continúa con
                  </Text>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>

                {/* SOCIAL BUTTONS */}
                <View style={styles.socialButtons}>
                  <TouchableOpacity
                    style={[
                      styles.socialButton,
                      ds.cardBg,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => handleSocialLogin("google")}
                    disabled={loading}
                    activeOpacity={0.8}>
                    <Image
                      source={require("../../assets/img/google.png")}
                      style={styles.socialIcon}
                    />
                    <Text style={[styles.socialButtonText, ds.text]}>
                      Google
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.socialButton,
                      { backgroundColor: "#1877F2", borderColor: "#1877F2" },
                    ]}
                    onPress={() => handleSocialLogin("facebook")}
                    disabled={loading}
                    activeOpacity={0.8}>
                    <Image
                      source={require("../../assets/img/facebook.png")}
                      style={styles.socialIcon}
                    />
                    <Text style={[styles.socialButtonText, { color: "#FFF" }]}>
                      Facebook
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FOOTER */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, ds.textSecondary]}>
                  ¿No tienes cuenta?{" "}
                  <Text
                    style={{ color: colors.accent, fontWeight: "600" }}
                    onPress={() => {
                      Keyboard.dismiss();
                      navigation.navigate("Register");
                    }}>
                    Regístrate
                  </Text>
                </Text>

                <Text style={[styles.policyText, ds.textMuted]}>
                  Al crear una cuenta, aceptas nuestra{"\n"}
                  <Text style={{ textDecorationLine: "underline" }}>
                    Política de Privacidad
                  </Text>{" "}
                  y{" "}
                  <Text style={{ textDecorationLine: "underline" }}>
                    Términos de Servicio
                  </Text>
                </Text>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  // IMAGE
  imageContainer: { alignItems: "center", paddingVertical: 20 },
  image: { width: width * 0.6, height: height * 0.18 },

  // FORM CARD
  formCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },

  // INPUTS
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },

  // FORGOT PASSWORD
  forgotPassword: { alignSelf: "flex-end", marginBottom: 20 },
  forgotPasswordText: { fontSize: 13, fontWeight: "500" },

  // LOGIN BUTTON
  loginButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // DIVIDER
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },

  // SOCIAL BUTTONS
  socialButtons: { flexDirection: "row", gap: 12 },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: { width: 20, height: 20 },
  socialButtonText: { fontSize: 14, fontWeight: "600" },

  // FOOTER
  footer: { paddingVertical: 24, alignItems: "center" },
  footerText: { fontSize: 14, marginBottom: 16 },
  policyText: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
