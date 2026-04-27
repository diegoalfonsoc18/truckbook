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
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  SelectRole: undefined;
  Home: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type ValidationErrors = {
  nombre?: string;
  cedula?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

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
  danger: "#E94560",
  success: "#00D9A5",
};

export default function Register({ navigation }: Props) {
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const validateEmail = (emailInput: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);

  const validatePasswordStrength = (pwd: string) => {
    const requirements = {
      hasMinLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
    const isStrong = Object.values(requirements).filter(Boolean).length >= 4;
    return { isStrong, requirements };
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!cedula.trim()) newErrors.cedula = "La cédula/DNI es requerida";
    else if (cedula.trim().length < 5) newErrors.cedula = "Cédula/DNI inválida";
    if (!email.trim()) newErrors.email = "El email es requerido";
    else if (!validateEmail(email)) newErrors.email = "Email inválido";
    if (!password.trim()) newErrors.password = "La contraseña es requerida";
    else if (!validatePasswordStrength(password).isStrong) newErrors.password = "Contraseña muy débil";
    if (!confirmPassword.trim()) newErrors.confirmPassword = "Confirma tu contraseña";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const register = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { nombre: nombre.trim(), cedula: cedula.trim() } },
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
            : error.message
        );
        return;
      }

      if (data.user) {
        const { error: insertError } = await supabase.from("usuarios").upsert(
          [{ user_id: data.user.id, nombre: nombre.trim(), cedula: cedula.trim(), email: email.toLowerCase().trim() }],
          { onConflict: "user_id" }
        );
        if (insertError) {
          await supabase.from("usuarios").upsert(
            [{ user_id: data.user.id, nombre: nombre.trim(), email: email.toLowerCase().trim() }],
            { onConflict: "user_id" }
          );
        }
      }

      if (data.session) {
        navigation.replace("SelectRole");
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

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const redirectTo = Linking.createURL("/");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) { Alert.alert("Error", error.message); return; }
      if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    } catch {
      Alert.alert("Error", "No se pudo completar el registro social.");
    } finally {
      setLoading(false);
    }
  };

  const { isStrong, requirements } = validatePasswordStrength(password);
  const strengthPercent = `${(Object.values(requirements).filter(Boolean).length / 5) * 100}%`;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.content}>

                {/* HEADER */}
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate("Login")}
                    disabled={loading}>
                    <Text style={styles.backIcon}>←</Text>
                  </TouchableOpacity>
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>TruckBook</Text>
                  </View>
                </View>

                <Text style={styles.title}>Crear cuenta</Text>
                <Text style={styles.subtitle}>Únete y gestiona tu flota</Text>

                {/* FIELDS */}
                <View style={styles.fieldsContainer}>

                  <Field
                    label="Nombre completo"
                    placeholder="Tu nombre completo"
                    value={nombre}
                    onChangeText={(t) => { setNombre(t); if (errors.nombre) setErrors({ ...errors, nombre: undefined }); }}
                    error={errors.nombre}
                    autoCapitalize="words"
                    editable={!loading}
                  />

                  <Field
                    label="Cédula / DNI"
                    placeholder="Número de documento"
                    value={cedula}
                    onChangeText={(t) => { setCedula(t); if (errors.cedula) setErrors({ ...errors, cedula: undefined }); }}
                    error={errors.cedula}
                    keyboardType="numeric"
                    editable={!loading}
                  />

                  <Field
                    label="Correo electrónico"
                    placeholder="tu@correo.com"
                    value={email}
                    onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                    error={errors.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />

                  {/* PASSWORD */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Contraseña</Text>
                    <TextInput
                      style={[styles.input, errors.password && styles.inputError]}
                      placeholder="Mín. 8 caracteres"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                        if (t.length > 0) setShowPasswordRequirements(true);
                      }}
                      editable={!loading}
                    />
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                    {showPasswordRequirements && password.length > 0 && (
                      <View style={styles.strengthContainer}>
                        <View style={styles.strengthBarBg}>
                          <View
                            style={[
                              styles.strengthBarFill,
                              {
                                width: strengthPercent as any,
                                backgroundColor: isStrong ? COLORS.success : "#FF9500",
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.strengthLabel, { color: isStrong ? COLORS.success : "#FF9500" }]}>
                          {isStrong ? "✓ Contraseña fuerte" : "Contraseña débil"}
                        </Text>
                        <View style={styles.reqList}>
                          {[
                            { met: requirements.hasMinLength, label: "8+ caracteres" },
                            { met: requirements.hasUpperCase, label: "Mayúscula (A-Z)" },
                            { met: requirements.hasLowerCase, label: "Minúscula (a-z)" },
                            { met: requirements.hasNumber, label: "Número (0-9)" },
                            { met: requirements.hasSpecialChar, label: "Especial (!@#$)" },
                          ].map(({ met, label }) => (
                            <Text
                              key={label}
                              style={[styles.reqItem, { color: met ? COLORS.success : COLORS.textMuted }]}>
                              {met ? "✓" : "○"} {label}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  <Field
                    label="Confirmar contraseña"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                    error={errors.confirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <Text style={styles.privacyText}>
                  Al registrarte aceptas nuestra{" "}
                  <Text style={styles.privacyLink}>Política de Privacidad</Text>
                </Text>

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.ctaButton, loading && styles.ctaDisabled]}
                  onPress={register}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.accentText} size="small" />
                  ) : (
                    <Text style={styles.ctaText}>Crear cuenta</Text>
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
                    <Image source={require("../../assets/img/google.png")} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialButton, styles.facebookButton]}
                    onPress={() => handleSocialLogin("facebook")}
                    disabled={loading}
                    activeOpacity={0.8}>
                    <Image source={require("../../assets/img/facebook.png")} style={styles.socialIcon} />
                    <Text style={[styles.socialText, { color: "#FFF" }]}>Facebook</Text>
                  </TouchableOpacity>
                </View>

                {/* FOOTER */}
                <TouchableOpacity
                  style={styles.footer}
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}>
                  <Text style={styles.footerText}>
                    ¿Ya tienes cuenta?{" "}
                    <Text style={styles.footerLink}>Inicia sesión</Text>
                  </Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label, placeholder, value, onChangeText, error,
  secureTextEntry, autoCapitalize, keyboardType, editable,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: any;
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: COLORS.text },
  headerBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accentText,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 28,
  },

  // FIELDS
  fieldsContainer: { gap: 14, marginBottom: 16 },
  fieldGroup: {},
  fieldLabel: {
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
  inputError: {
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 5,
    marginLeft: 4,
  },

  // STRENGTH
  strengthContainer: { marginTop: 10 },
  strengthBarBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthBarFill: { height: "100%", borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: "600", marginTop: 5 },
  reqList: { marginTop: 6, gap: 2 },
  reqItem: { fontSize: 11 },

  // PRIVACY
  privacyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  privacyLink: { color: COLORS.accent },

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
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: COLORS.textMuted },

  // SOCIAL
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
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
  facebookButton: { backgroundColor: "#1877F2" },
  socialIcon: { width: 20, height: 20 },
  socialText: { fontSize: 14, fontWeight: "600", color: COLORS.text },

  // FOOTER
  footer: { alignItems: "center" },
  footerText: { fontSize: 14, color: COLORS.textSecondary },
  footerLink: { color: COLORS.accent, fontWeight: "700" },
});
