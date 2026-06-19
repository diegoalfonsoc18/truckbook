import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useTheme, getShadow, getInputStyles } from "../../constants/Themecontext";

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    GoogleSignin = mod.GoogleSignin;
    isSuccessResponse = mod.isSuccessResponse;
    const extra = Constants.expoConfig?.extra;
    // androidClientId no es un parámetro válido para el módulo nativo en iOS
    GoogleSignin.configure({
      webClientId: extra?.googleWebClientId ?? "",
      ...(Platform.OS === "ios"
        ? { iosClientId: extra?.googleIosClientId ?? "" }
        : { androidClientId: extra?.googleAndroidClientId ?? "" }),
    });
  } catch {}
}

WebBrowser.maybeCompleteAuthSession();

const SUCCESS = "#00D9A5";
const DANGER  = "#E94560";

type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
};
type Props = NativeStackScreenProps<AuthStackParamList, "Register">;
type ValidationErrors = {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function Register({ navigation }: Props) {
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "sm");
  const inputSty = getInputStyles(isDark, c);

  const [nombre,          setNombre]          = useState("");
  const [apellido,        setApellido]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [registerAttempts, setRegisterAttempts] = useState(0);
  const [lockedUntil,      setLockedUntil]      = useState(0);
  const [errors,          setErrors]          = useState<ValidationErrors>({});
  const [showStrength,    setShowStrength]    = useState(false);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validatePasswordStrength = (pwd: string) => {
    const r = {
      hasMinLength:   pwd.length >= 8,
      hasUpperCase:   /[A-Z]/.test(pwd),
      hasLowerCase:   /[a-z]/.test(pwd),
      hasNumber:      /\d/.test(pwd),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
    return { isStrong: Object.values(r).filter(Boolean).length >= 4, requirements: r };
  };

  const validateForm = (): boolean => {
    const e: ValidationErrors = {};
    if (!nombre.trim())           e.nombre   = "El nombre es requerido";
    if (!apellido.trim())         e.apellido = "El apellido es requerido";
    if (!email.trim())            e.email = "El email es requerido";
    else if (!validateEmail(email)) e.email = "Email inválido";
    if (!password.trim())         e.password = "La contraseña es requerida";
    else if (!validatePasswordStrength(password).isStrong) e.password = "Contraseña muy débil";
    if (!confirmPassword.trim())  e.confirmPassword = "Confirma tu contraseña";
    else if (password !== confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const register = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    const now = Date.now();
    if (lockedUntil > now) {
      const secsLeft = Math.ceil((lockedUntil - now) / 1000);
      Alert.alert("Demasiados intentos", `Espera ${secsLeft} segundos antes de intentar de nuevo.`);
      return;
    }
    const attempts = registerAttempts + 1;
    setRegisterAttempts(attempts);
    if (attempts > 5) {
      setLockedUntil(Date.now() + 60000);
      setRegisterAttempts(0);
      Alert.alert("Demasiados intentos", "Espera 60 segundos antes de intentar de nuevo.");
      return;
    }
    setLoading(true);
    try {
      const clean = (s: string) => s.replace(/[<>{}]/g, "").trim().slice(0, 100);
      const nombreSafe = clean(nombre);
      const apellidoSafe = clean(apellido);
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { nombre: nombreSafe, apellido: apellidoSafe } },
      });

      if (error?.message.includes("compromised")) {
        Alert.alert("Contraseña débil", "Esta contraseña ha sido comprometida. Elige una diferente.");
        return;
      }
      if (error) {
        Alert.alert(
          error.message.includes("already registered") ? "Email existente" : "Error",
          error.message.includes("already registered")
            ? "Este email ya está registrado."
            : error.message,
        );
        return;
      }

      if (data.user) {
        await supabase.from("usuarios").upsert(
          [{
            user_id: data.user.id,
            nombre: [nombreSafe, apellidoSafe].filter(Boolean).join(" "),
            email:    email.toLowerCase().trim(),
          }],
          { onConflict: "user_id" },
        );
      }

      if (data.session) {
        // La sesión activa en App.tsx detecta automáticamente el login y muestra AppStack
      } else {
        Alert.alert("Registro exitoso", "Revisa tu correo para confirmar tu cuenta.");
        navigation.navigate("Login");
      }
    } catch {
      Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert("Error", "No se recibió token de Apple.");
        return;
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        Alert.alert("Error", error.message);
      } else if (data.user && credential.fullName) {
        const nombre = credential.fullName.givenName ?? "";
        const apellido = credential.fullName.familyName ?? "";
        if (nombre || apellido) {
          await supabase.from("usuarios").upsert(
            [{
              user_id: data.user.id,
              nombre: [nombre, apellido].filter(Boolean).join(" "),
              email: data.user.email ?? "",
            }],
            { onConflict: "user_id" },
          );
          await supabase.auth.updateUser({
            data: { nombre, apellido },
          });
        }
      }
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", "No se pudo completar el registro con Apple.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Keyboard.dismiss();
    setLoading(true);

    if (GoogleSignin) {
      try {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (isSuccessResponse(response)) {
          const idToken = response.data?.idToken;
          if (!idToken) {
            Alert.alert("Error", "No se recibió token de Google.");
            return;
          }
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
          });
          if (error) Alert.alert("Error", error.message);
        }
      } catch (e: any) {
        if (e?.code === "SIGN_IN_CANCELLED") return;
        Alert.alert("Error", e?.message ?? "No se pudo registrar con Google.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback Expo Go
    try {
      const redirectTo = Linking.createURL("auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        Alert.alert("Error", error?.message ?? "No se obtuvo URL de autenticación");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        const codeMatch = result.url.match(/[?&#]code=([^&#]+)/);
        if (codeMatch) {
          const { error: ex } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
          if (ex) Alert.alert("Error", ex.message);
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo registrar con Google.");
    } finally {
      setLoading(false);
    }
  };

  const { isStrong, requirements } = validatePasswordStrength(password);
  const strengthPct = `${(Object.values(requirements).filter(Boolean).length / 5) * 100}%`;

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.flex}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            <View style={s.content}>

              {/* HEADER */}
              <View style={s.header}>
                <TouchableOpacity
                  style={[s.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}>
                  <Ionicons name="chevron-back" size={20} color={c.text} />
                </TouchableOpacity>
              </View>

              <Text style={[s.title, { color: c.text }]}>Crear cuenta</Text>
              <Text style={[s.subtitle, { color: c.textSecondary }]}>Únete y gestiona tu flota</Text>

              {/* FIELDS */}
              <View style={s.fields}>

                {/* NOMBRE + APELLIDO en fila */}
                <View style={s.nameRow}>
                  <View style={s.nameCol}>
                    <Field
                      label="Nombre" placeholder="Juan"
                      value={nombre} onChangeText={(t) => { setNombre(t); if (errors.nombre) setErrors({ ...errors, nombre: undefined }); }}
                      error={errors.nombre} autoCapitalize="words" editable={!loading}
                      icon="person-outline" c={c} shadow={shadow} inputSty={inputSty}
                    />
                  </View>
                  <View style={s.nameCol}>
                    <Field
                      label="Apellido" placeholder="Rodríguez"
                      value={apellido} onChangeText={(t) => { setApellido(t); if (errors.apellido) setErrors({ ...errors, apellido: undefined }); }}
                      error={errors.apellido} autoCapitalize="words" editable={!loading}
                      icon="person-outline" c={c} shadow={shadow} inputSty={inputSty}
                    />
                  </View>
                </View>


<Field
                  label="Correo electrónico" placeholder="tu@correo.com"
                  value={email} onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                  error={errors.email} autoCapitalize="none" keyboardType="email-address" editable={!loading}
                  icon="mail-outline" c={c} shadow={shadow} inputSty={inputSty}
                />

                {/* PASSWORD */}
                <View>
                  <Text style={[inputSty.label, { color: c.textSecondary }]}>Contraseña</Text>
                  <View style={[inputSty.wrap, shadow, errors.password && s.inputError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} style={s.icon} />
                    <TextInput
                  keyboardAppearance="light"
                      style={[inputSty.text, { color: c.text }]}
                      placeholder="Mín. 8 caracteres"
                      placeholderTextColor={c.textMuted}
                      secureTextEntry={!showPwd}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                        if (t.length > 0) setShowStrength(true);
                      }}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={s.errorText}>{errors.password}</Text>}

                  {showStrength && password.length > 0 && (
                    <View style={s.strengthBox}>
                      <View style={[s.strengthBg, { backgroundColor: c.border }]}>
                        <View style={[s.strengthFill, { width: strengthPct as any, backgroundColor: isStrong ? SUCCESS : "#FF9500" }]} />
                      </View>
                      <Text style={[s.strengthLabel, { color: isStrong ? SUCCESS : "#FF9500" }]}>
                        {isStrong ? "✓ Contraseña fuerte" : "Contraseña débil"}
                      </Text>
                      <View style={s.reqList}>
                        {[
                          { met: requirements.hasMinLength,   label: "8+ caracteres" },
                          { met: requirements.hasUpperCase,   label: "Mayúscula (A-Z)" },
                          { met: requirements.hasLowerCase,   label: "Minúscula (a-z)" },
                          { met: requirements.hasNumber,      label: "Número (0-9)" },
                          { met: requirements.hasSpecialChar, label: "Especial (!@#$)" },
                        ].map(({ met, label }) => (
                          <Text key={label} style={[s.reqItem, { color: met ? SUCCESS : c.textMuted }]}>
                            {met ? "✓" : "○"} {label}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* CONFIRM PASSWORD */}
                <View>
                  <Text style={[inputSty.label, { color: c.textSecondary }]}>Confirmar contraseña</Text>
                  <View style={[inputSty.wrap, shadow, errors.confirmPassword && s.inputError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} style={s.icon} />
                    <TextInput
                  keyboardAppearance="light"
                      style={[inputSty.text, { color: c.text }]}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={c.textMuted}
                      secureTextEntry={!showConfirmPwd}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword}</Text>}
                </View>

              </View>

              {/* PRIVACY */}
              <Text style={[s.privacy, { color: c.textMuted }]}>
                Al registrarte aceptas nuestra{" "}
                <Text
                  style={{ color: c.accent, fontWeight: "600" }}
                  onPress={() => Linking.openURL("https://diegoalfonsoc18.github.io/truckbook/privacy-policy.html")}>
                  Política de Privacidad
                </Text>
              </Text>

              {/* CTA */}
              <TouchableOpacity
                style={[s.cta, { backgroundColor: c.accent }, loading && s.ctaOff]}
                onPress={register}
                disabled={loading}
                activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color={c.accentText} size="small" />
                  : <Text style={[s.ctaText, { color: c.accentText }]}>Crear cuenta</Text>}
              </TouchableOpacity>

              {/* DIVIDER */}
              <View style={s.divRow}>
                <View style={[s.divLine, { backgroundColor: c.border }]} />
                <Text style={[s.divText, { color: c.textMuted }]}>o continúa con</Text>
                <View style={[s.divLine, { backgroundColor: c.border }]} />
              </View>

              {/* SOCIAL */}
              <View style={s.socialRow}>
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[s.socialBtn, { backgroundColor: c.cardBg, borderColor: c.border }, shadow]}
                    onPress={handleAppleLogin}
                    disabled={loading} activeOpacity={0.8}>
                    <Ionicons name="logo-apple" size={19} color={c.text} />
                    <Text style={[s.socialText, { color: c.text }]}>Apple</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.socialBtn, { backgroundColor: c.cardBg, borderColor: c.border }, shadow]}
                  onPress={handleGoogleLogin}
                  disabled={loading} activeOpacity={0.8}>
                  <Image source={require("../../assets/img/google.png")} style={s.socialIcon} />
                  <Text style={[s.socialText, { color: c.text }]}>Google</Text>
                </TouchableOpacity>
              </View>

              {/* FOOTER */}
              <TouchableOpacity style={s.footer} onPress={() => navigation.navigate("Login")} disabled={loading}>
                <Text style={[s.footerText, { color: c.textSecondary }]}>
                  ¿Ya tienes cuenta?{" "}
                  <Text style={{ color: c.accent, fontWeight: "700" }}>Inicia sesión</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Field component ─────────────────────────────────────────────────────────

function Field({
  label, placeholder, value, onChangeText, error,
  secureTextEntry, autoCapitalize, keyboardType, editable, icon, c, shadow, inputSty,
}: {
  label: string; placeholder: string; value: string;
  onChangeText: (t: string) => void; error?: string;
  secureTextEntry?: boolean; autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: any; editable?: boolean; icon: any; c: any; shadow: any; inputSty: any;
}) {
  return (
    <View>
      <Text style={[inputSty.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={[inputSty.wrap, shadow, error && s.inputError]}>
        <Ionicons name={icon} size={18} color={c.textMuted} style={s.icon} />
        <TextInput
                  keyboardAppearance="light"
          style={[inputSty.text, { color: c.text }]}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={editable}
        />
      </View>
      {error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea:  { flex: 1 },
  flex:      { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 48 },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 28,
  },
  backBtn: {
    width: 42, height: 42,
    borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  badge:     { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },

  title:    { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },

  // FIELDS
  fields:     { gap: 16, marginBottom: 16 },
  icon:       { marginRight: 10 },
  inputError: { borderColor: DANGER },
  errorText:  { fontSize: 12, color: DANGER, marginTop: 5, marginLeft: 4 },

  // STRENGTH
  strengthBox:   { marginTop: 10 },
  strengthBg:    { height: 4, borderRadius: 2, overflow: "hidden" },
  strengthFill:  { height: "100%", borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: "600", marginTop: 5 },
  reqList:       { marginTop: 6, gap: 2 },
  reqItem:       { fontSize: 11 },

  // PRIVACY
  privacy: { fontSize: 12, textAlign: "center", marginBottom: 20 },

  // CTA
  cta: {
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 28,
  },
  ctaOff:  { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  // DIVIDER
  divRow:  { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  divLine: { flex: 1, height: 1 },
  divText: { marginHorizontal: 12, fontSize: 12 },

  // SOCIAL
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 8,
  },
  socialIcon: { width: 20, height: 20 },
  socialText: { fontSize: 14, fontWeight: "600" },

  // FOOTER
  footer:     { alignItems: "center" },
  footerText: { fontSize: 14 },

  // NAME ROW
  nameRow: { flexDirection: "row", gap: 10 },
  nameCol: { flex: 1 },
});
