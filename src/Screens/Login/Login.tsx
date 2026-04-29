import React, { useState } from "react";
import {
  View,
  TextInput,
  Alert,
  Image,
  Keyboard,
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
// Pantallas pequeñas (<680dp) → modo compacto
const COMPACT = height < 680;

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
      if (error) Alert.alert("Error", error.message);
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
      if (error) { Alert.alert("Error", error.message); return; }
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success" && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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
    <View style={s.root}>
      {/* edges bottom → respeta barra de gestos/navegación de Android */}
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>

        {/*
          KAV con behavior="padding" en ambas plataformas:
          empuja el contenido hacia arriba cuando el teclado aparece
          sin comprimir la altura total del layout.
        */}
        <KeyboardAvoidingView
          style={s.kav}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}>

          {/* ── SCROLLABLE CONTENT ────────────────────────────── */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}>

            {/* HERO — imagen + badge + título */}
            <View style={s.hero}>
              <Image
                source={CamionT800}
                style={s.heroImg}
                resizeMode="contain"
              />
              <View style={s.badge}>
                <Text style={s.badgeText}>TruckBook</Text>
              </View>
              <Text style={s.heroTitle}>Gestiona tu{"\n"}flota fácilmente</Text>
              {!COMPACT && (
                <Text style={s.heroSub}>
                  Control total de gastos, ingresos{"\n"}y documentos de tu camión.
                </Text>
              )}
            </View>

            {/* FORM */}
            <View style={s.form}>

              {/* EMAIL */}
              <Text style={s.label}>Correo electrónico</Text>
              <TextInput
                style={s.input}
                placeholder="tu@correo.com"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onChangeText={setEmail}
                value={email}
                editable={!loading}
                returnKeyType="next"
              />

              {/* PASSWORD */}
              <Text style={[s.label, { marginTop: 12 }]}>Contraseña</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                value={password}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              {/* FORGOT */}
              <TouchableOpacity
                style={s.forgot}
                onPress={() => { Keyboard.dismiss(); navigation.navigate("ForgotPassword"); }}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {/* CTA */}
              <TouchableOpacity
                style={[s.cta, loading && s.ctaOff]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color={COLORS.accentText} size="small" />
                  : <Text style={s.ctaText}>Iniciar Sesión</Text>}
              </TouchableOpacity>

              {/* DIVIDER */}
              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divText}>o continúa con</Text>
                <View style={s.divLine} />
              </View>

              {/* SOCIAL */}
              <View style={s.socialRow}>
                <TouchableOpacity
                  style={s.socialBtn}
                  onPress={() => handleSocialLogin("google")}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Image source={require("../../assets/img/google.png")} style={s.socialIcon} />
                  <Text style={s.socialText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.socialBtn, s.fbBtn]}
                  onPress={() => handleSocialLogin("facebook")}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Image source={require("../../assets/img/facebook.png")} style={s.socialIcon} />
                  <Text style={[s.socialText, { color: "#FFF" }]}>Facebook</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>

          {/* ── FOOTER — SIEMPRE VISIBLE, fuera del ScrollView ─ */}
          <View style={s.footer}>
            <Text style={s.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => { Keyboard.dismiss(); navigation.navigate("Register"); }}
              activeOpacity={0.7}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
              <Text style={s.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const IMG_H = Math.min(height * 0.16, 120); // máximo 120dp, escalado al 16% del alto

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  kav:  { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  // ── HERO ──────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingTop: COMPACT ? 12 : 20,
    paddingBottom: COMPACT ? 12 : 20,
    paddingHorizontal: 24,
  },
  heroImg: {
    width: width * 0.6,
    height: IMG_H,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accentText,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: COMPACT ? 24 : 28,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: COMPACT ? 30 : 36,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
  },

  // ── FORM ──────────────────────────────────────────────
  form: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: COMPACT ? 13 : 15,
    fontSize: 15,
    color: COLORS.text,
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: COMPACT ? 16 : 20,
  },
  forgotText: { fontSize: 13, fontWeight: "500", color: COLORS.accent },

  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: COMPACT ? 14 : 17,
    alignItems: "center",
    marginBottom: COMPACT ? 18 : 24,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: { fontSize: 15, fontWeight: "800", color: COLORS.accentText, letterSpacing: 0.3 },

  divRow: { flexDirection: "row", alignItems: "center", marginBottom: COMPACT ? 14 : 18 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { marginHorizontal: 10, fontSize: 12, color: COLORS.textMuted },

  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 13,
    paddingVertical: COMPACT ? 11 : 13,
    gap: 8,
  },
  fbBtn: { backgroundColor: "#1877F2" },
  socialIcon: { width: 19, height: 19 },
  socialText: { fontSize: 14, fontWeight: "600", color: COLORS.text },

  // ── FOOTER — fuera del ScrollView, siempre visible ───
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  footerLink: { fontSize: 14, color: COLORS.accent, fontWeight: "700" },
});
