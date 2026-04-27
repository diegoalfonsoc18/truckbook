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
import { CamionT800 } from "../../assets/img/img";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

const COLORS = {
  bg: "#111111",
  card: "#1E1E1E",
  input: "#252525",
  accent: "#FFE500",
  accentText: "#000000",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  textMuted: "#4A4A4A",
  border: "#2C2C2C",
};

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
      }
    } catch {
      Alert.alert("Error", "No se pudo conectar. Verifica tu conexión.");
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
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
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
    } catch {
      Alert.alert("Error", "No se pudo completar el inicio de sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">

              {/* HERO */}
              <View style={styles.heroContainer}>
                <Image
                  source={CamionT800}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>TruckBook</Text>
                </View>
                <Text style={styles.heroTitle}>Gestiona tu{"\n"}flota fácilmente</Text>
                <Text style={styles.heroSubtitle}>
                  Control total de gastos, ingresos y documentos de tu camión.
                </Text>
              </View>

              {/* FORM */}
              <View style={styles.formContainer}>

                {/* EMAIL */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Correo electrónico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="tu@correo.com"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    onChangeText={setEmail}
                    value={email}
                    editable={!loading}
                  />
                </View>

                {/* PASSWORD */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    onChangeText={setPassword}
                    value={password}
                    editable={!loading}
                  />
                </View>

                {/* FORGOT */}
                <TouchableOpacity
                  style={styles.forgotRow}
                  onPress={() => { Keyboard.dismiss(); navigation.navigate("ForgotPassword"); }}
                  disabled={loading}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.ctaButton, loading && styles.ctaDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.accentText} size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Iniciar Sesión</Text>
                  )}
                </TouchableOpacity>

                {/* DIVIDER */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o continúa con</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* SOCIAL */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialLogin("google")}
                    disabled={loading}
                    activeOpacity={0.8}>
                    <Image
                      source={require("../../assets/img/google.png")}
                      style={styles.socialIcon}
                    />
                    <Text style={styles.socialText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialButton, styles.facebookButton]}
                    onPress={() => handleSocialLogin("facebook")}
                    disabled={loading}
                    activeOpacity={0.8}>
                    <Image
                      source={require("../../assets/img/facebook.png")}
                      style={styles.socialIcon}
                    />
                    <Text style={[styles.socialText, { color: "#FFF" }]}>Facebook</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FOOTER */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  ¿No tienes cuenta?{" "}
                  <Text
                    style={styles.footerLink}
                    onPress={() => { Keyboard.dismiss(); navigation.navigate("Register"); }}>
                    Regístrate
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  // HERO
  heroContainer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  heroImage: {
    width: width * 0.75,
    height: height * 0.2,
    marginBottom: 16,
  },
  heroBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentText,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // FORM
  formContainer: {
    paddingHorizontal: 24,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },

  // FORGOT
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.accent,
  },

  // CTA
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 28,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.accentText,
    letterSpacing: 0.3,
  },

  // DIVIDER
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // SOCIAL
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  facebookButton: {
    backgroundColor: "#1877F2",
  },
  socialIcon: { width: 20, height: 20 },
  socialText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  // FOOTER
  footer: {
    paddingTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.accent,
    fontWeight: "700",
  },
});
