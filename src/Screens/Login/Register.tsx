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
import { useTheme, getShadow } from "../../constants/Themecontext";

type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  SelectRole: undefined;
  Home: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function Register({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

  const validateEmail = (emailInput: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailInput);
  };

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

    if (!email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!validateEmail(email)) {
      newErrors.email = "Email inválido";
    }

    if (!password.trim()) {
      newErrors.password = "La contraseña es requerida";
    } else {
      const { isStrong } = validatePasswordStrength(password);
      if (!isStrong) {
        newErrors.password = "Contraseña muy débil";
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

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
      });

      if (error?.message.includes("compromised")) {
        Alert.alert(
          "Contraseña débil",
          "Esta contraseña ha sido comprometida. Elige una diferente.",
        );
        return;
      }

      if (error) {
        if (error.message.includes("already registered")) {
          Alert.alert(
            "Email existente",
            "Este email ya está registrado. ¿Deseas iniciar sesión?",
          );
        } else {
          Alert.alert("Error", error.message);
        }
        return;
      }

      if (data.session) {
        Alert.alert("¡Bienvenido!", "Registro exitoso.");
        navigation.replace("SelectRole");
      } else {
        Alert.alert(
          "Registro exitoso",
          "Revisa tu correo para confirmar tu cuenta.",
        );
        navigation.navigate("Login");
      }
    } catch (err) {
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

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo completar el registro social.");
    } finally {
      setLoading(false);
    }
  };

  const { isStrong, requirements } = validatePasswordStrength(password);

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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.content}>
                {/* LOGO */}
                <View style={styles.logoSection}>
                  <View
                    style={[
                      styles.logoContainer,
                      { backgroundColor: colors.accent + "15" },
                    ]}>
                    <Text style={styles.logoEmoji}>🚛</Text>
                  </View>
                  <Text style={[styles.title, ds.text]}>Crear cuenta</Text>
                  <Text style={[styles.subtitle, ds.textSecondary]}>
                    Únete a TruckBook
                  </Text>
                </View>

                {/* FORM */}
                <View
                  style={[styles.formCard, ds.cardBg, getShadow(isDark, "md")]}>
                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, ds.textSecondary]}>
                      Correo electrónico
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        ds.inputBg,
                        {
                          borderColor: errors.email
                            ? colors.danger
                            : colors.border,
                        },
                      ]}>
                      <Text style={styles.inputIcon}>✉️</Text>
                      <TextInput
                        placeholder="tu@correo.com"
                        placeholderTextColor={colors.textMuted}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (errors.email)
                            setErrors({ ...errors, email: undefined });
                        }}
                        value={email}
                        style={[styles.input, ds.text]}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                      />
                    </View>
                    {errors.email && (
                      <Text
                        style={[styles.errorText, { color: colors.danger }]}>
                        {errors.email}
                      </Text>
                    )}
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, ds.textSecondary]}>
                      Contraseña
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        ds.inputBg,
                        {
                          borderColor: errors.password
                            ? colors.danger
                            : colors.border,
                        },
                      ]}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        placeholder="Mín. 8 caracteres"
                        placeholderTextColor={colors.textMuted}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (errors.password)
                            setErrors({ ...errors, password: undefined });
                          if (text.length > 0)
                            setShowPasswordRequirements(true);
                        }}
                        value={password}
                        secureTextEntry
                        style={[styles.input, ds.text]}
                        editable={!loading}
                      />
                    </View>
                    {errors.password && (
                      <Text
                        style={[styles.errorText, { color: colors.danger }]}>
                        {errors.password}
                      </Text>
                    )}

                    {/* Password Strength */}
                    {showPasswordRequirements && password.length > 0 && (
                      <View style={styles.strengthSection}>
                        <View
                          style={[
                            styles.strengthBar,
                            { backgroundColor: colors.border },
                          ]}>
                          <View
                            style={[
                              styles.strengthFill,
                              {
                                width: `${(Object.values(requirements).filter(Boolean).length / 5) * 100}%`,
                                backgroundColor: isStrong
                                  ? colors.income
                                  : "#FF9500",
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.strengthText,
                            { color: isStrong ? colors.income : "#FF9500" },
                          ]}>
                          {isStrong
                            ? "✓ Contraseña fuerte"
                            : "Contraseña débil"}
                        </Text>
                        <View style={styles.requirementsList}>
                          <RequirementItem
                            met={requirements.hasMinLength}
                            label="8+ caracteres"
                            colors={colors}
                          />
                          <RequirementItem
                            met={requirements.hasUpperCase}
                            label="Mayúscula (A-Z)"
                            colors={colors}
                          />
                          <RequirementItem
                            met={requirements.hasLowerCase}
                            label="Minúscula (a-z)"
                            colors={colors}
                          />
                          <RequirementItem
                            met={requirements.hasNumber}
                            label="Número (0-9)"
                            colors={colors}
                          />
                          <RequirementItem
                            met={requirements.hasSpecialChar}
                            label="Especial (!@#$)"
                            colors={colors}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, ds.textSecondary]}>
                      Confirmar contraseña
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        ds.inputBg,
                        {
                          borderColor: errors.confirmPassword
                            ? colors.danger
                            : colors.border,
                        },
                      ]}>
                      <Text style={styles.inputIcon}>🔐</Text>
                      <TextInput
                        placeholder="Repite tu contraseña"
                        placeholderTextColor={colors.textMuted}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (errors.confirmPassword)
                            setErrors({
                              ...errors,
                              confirmPassword: undefined,
                            });
                        }}
                        value={confirmPassword}
                        secureTextEntry
                        style={[styles.input, ds.text]}
                        editable={!loading}
                      />
                    </View>
                    {errors.confirmPassword && (
                      <Text
                        style={[styles.errorText, { color: colors.danger }]}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  {/* Privacy */}
                  <Text style={[styles.privacyText, ds.textMuted]}>
                    Al registrarte aceptas nuestra Política de Privacidad
                  </Text>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { backgroundColor: colors.accent },
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={register}
                    disabled={loading}
                    activeOpacity={0.8}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>Crear cuenta</Text>
                    )}
                  </TouchableOpacity>
                </View>

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
                      getShadow(isDark, "sm"),
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
                      { backgroundColor: "#1877F2" },
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

                {/* LOGIN LINK */}
                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}>
                  <Text style={[styles.loginLinkText, ds.textSecondary]}>
                    ¿Ya tienes cuenta?{" "}
                    <Text style={{ color: colors.accent, fontWeight: "600" }}>
                      Inicia sesión
                    </Text>
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

function RequirementItem({
  met,
  label,
  colors,
}: {
  met: boolean;
  label: string;
  colors: any;
}) {
  return (
    <Text
      style={[
        styles.requirementText,
        { color: met ? colors.income : colors.textMuted },
      ]}>
      {met ? "✓" : "○"} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },

  // LOGO
  logoSection: { alignItems: "center", paddingVertical: 24 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 15 },

  // FORM
  formCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
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
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  errorText: { fontSize: 12, marginTop: 4 },

  // PASSWORD STRENGTH
  strengthSection: { marginTop: 10 },
  strengthBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthText: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  requirementsList: { marginTop: 6 },
  requirementText: { fontSize: 11, marginVertical: 1 },

  // PRIVACY
  privacyText: { fontSize: 12, textAlign: "center", marginBottom: 16 },

  // SUBMIT
  submitButton: { borderRadius: 14, padding: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // DIVIDER
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 12, fontSize: 13 },

  // SOCIAL
  socialButtons: { flexDirection: "row", gap: 12 },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  socialIcon: { width: 20, height: 20 },
  socialButtonText: { fontSize: 14, fontWeight: "600" },

  // LOGIN LINK
  loginLink: { paddingVertical: 20, alignItems: "center" },
  loginLinkText: { fontSize: 14 },
});
