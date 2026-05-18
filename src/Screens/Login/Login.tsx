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
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  useTheme,
  getShadow,
  getInputStyles,
} from "../../constants/Themecontext";

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");
const COMPACT = height < 680;

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "sm");
  const inputSty = getInputStyles(isDark, c);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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
    } catch {
      Alert.alert("Error", "No se pudo completar el inicio de sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={s.kav}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}>
            {/* HERO */}
            <View style={s.hero}>
              <Image
                source={require("../../assets/icons/parrilla.webp")}
                style={s.heroImg}
                resizeMode="contain"
              />

              <Text style={[s.heroTitle, { color: c.text }]}>
                Gestiona tu camión
              </Text>
              {!COMPACT && (
                <Text style={[s.heroSub, { color: c.textSecondary }]}>
                  Control total de gastos, ingresos{"\n"}y documentos de tu
                  camión.
                </Text>
              )}
            </View>

            {/* FORM */}
            <View style={s.form}>
              {/* EMAIL */}
              <Text style={[inputSty.label, { color: c.textSecondary }]}>
                Correo electrónico
              </Text>
              <View style={[inputSty.wrap, shadow]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={c.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  keyboardAppearance="light"
                  style={[inputSty.text, { color: c.text }]}
                  placeholder="tu@correo.com"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  onChangeText={setEmail}
                  value={email}
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              {/* PASSWORD */}
              <Text
                style={[
                  inputSty.label,
                  { color: c.textSecondary, marginTop: 14 },
                ]}>
                Contraseña
              </Text>
              <View style={[inputSty.wrap, shadow]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={c.textMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  keyboardAppearance="light"
                  style={[inputSty.text, { color: c.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={c.textMuted}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  value={password}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPwd(!showPwd)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={showPwd ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={c.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* FORGOT */}
              <TouchableOpacity
                style={s.forgot}
                onPress={() => {
                  Keyboard.dismiss();
                  navigation.navigate("ForgotPassword");
                }}
                disabled={loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[s.forgotText, { color: c.accent }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {/* CTA */}
              <TouchableOpacity
                style={[
                  s.cta,
                  { backgroundColor: c.accent },
                  loading && s.ctaOff,
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color={c.accentText} size="small" />
                ) : (
                  <Text style={[s.ctaText, { color: c.accentText }]}>
                    Iniciar sesión
                  </Text>
                )}
              </TouchableOpacity>

              {/* DIVIDER */}
              <View style={s.divRow}>
                <View style={[s.divLine, { backgroundColor: c.border }]} />
                <Text style={[s.divText, { color: c.textMuted }]}>
                  o continúa con
                </Text>
                <View style={[s.divLine, { backgroundColor: c.border }]} />
              </View>

              {/* SOCIAL */}
              <View style={s.socialRow}>
                <TouchableOpacity
                  style={[
                    s.socialBtn,
                    { backgroundColor: c.cardBg, borderColor: c.border },
                    shadow,
                  ]}
                  onPress={() => handleSocialLogin("google")}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Image
                    source={require("../../assets/img/google.png")}
                    style={s.socialIcon}
                  />
                  <Text style={[s.socialText, { color: c.text }]}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.socialBtn,
                    { backgroundColor: c.cardBg, borderColor: c.border },
                    shadow,
                  ]}
                  onPress={() => handleSocialLogin("facebook")}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Image
                    source={require("../../assets/img/facebook.png")}
                    style={s.socialIcon}
                  />
                  <Text style={[s.socialText, { color: c.text }]}>
                    Facebook
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={[s.footer, { borderTopColor: c.border }]}>
            <Text style={[s.footerText, { color: c.textSecondary }]}>
              ¿No tienes cuenta?{" "}
              <Text
                style={[s.footerLink, { color: c.accent }]}
                onPress={() => {
                  Keyboard.dismiss();
                  navigation.navigate("Register");
                }}>
                Regístrate
              </Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const IMG_H = Math.min(height * 0.2, 420);

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  // HERO
  hero: {
    alignItems: "center",
    paddingTop: COMPACT ? 12 : 20,
    paddingBottom: COMPACT ? 12 : 20,
    paddingHorizontal: 24,
  },
  heroImg: { width: width * 0.8, height: IMG_H, marginBottom: 30 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: COMPACT ? 24 : 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: COMPACT ? 30 : 36,
    letterSpacing: -0.5,
  },
  heroSub: { fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 8 },

  // FORM
  form: { paddingHorizontal: 24, paddingBottom: 4 },
  inputIcon: { marginRight: 10 },

  forgot: {
    alignSelf: "flex-end",
    marginTop: 10,
    marginBottom: COMPACT ? 16 : 20,
  },
  forgotText: { fontSize: 13, fontWeight: "600" },

  cta: {
    borderRadius: 14,
    paddingVertical: COMPACT ? 14 : 17,
    alignItems: "center",
    marginBottom: COMPACT ? 18 : 24,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  divRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: COMPACT ? 14 : 18,
  },
  divLine: { flex: 1, height: 1 },
  divText: { marginHorizontal: 10, fontSize: 12 },

  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: COMPACT ? 11 : 13,
    gap: 8,
  },
  socialIcon: { width: 19, height: 19 },
  socialText: { fontSize: 14, fontWeight: "600" },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: "700" },
});
