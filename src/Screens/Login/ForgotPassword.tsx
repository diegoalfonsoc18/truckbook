import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme, getShadow } from "../../constants/Themecontext";

type AuthStackParamList = {
  ForgotPassword: undefined;
  Login: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export default function ForgotPassword({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu correo.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://tudominio.com/update-password",
      });

      if (error) {
        console.error(error);
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(
          "✅ Éxito",
          "Hemos enviado un enlace para restablecer tu contraseña.",
        );
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", "Ocurrió un error inesperado");
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
            <View style={styles.content}>
              {/* HEADER */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={[styles.backButton, ds.cardBg]}
                  onPress={() => navigation.goBack()}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
              </View>

              {/* ICON & TITLE */}
              <View style={styles.titleSection}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.accent + "20" },
                  ]}>
                  <Text style={styles.icon}>🔐</Text>
                </View>
                <Text style={[styles.title, ds.text]}>
                  Recuperar contraseña
                </Text>
                <Text style={[styles.subtitle, ds.textSecondary]}>
                  Ingresa tu correo y te enviaremos un enlace para restablecer
                  tu contraseña
                </Text>
              </View>

              {/* FORM */}
              <View
                style={[styles.formCard, ds.cardBg, getShadow(isDark, "md")]}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>
                    Correo electrónico
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
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.accent },
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handlePasswordReset}
                  disabled={loading}
                  activeOpacity={0.8}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Enviar enlace</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* FOOTER */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.goBack()}>
                <Text style={[styles.loginLinkText, ds.textSecondary]}>
                  ¿Recordaste tu contraseña?{" "}
                  <Text style={{ color: colors.accent, fontWeight: "600" }}>
                    Inicia sesión
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
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
  content: { flex: 1, paddingHorizontal: 24 },

  // HEADER
  header: { paddingVertical: 12 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  backButtonText: { fontSize: 20 },

  // TITLE SECTION
  titleSection: { alignItems: "center", paddingVertical: 32 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // FORM
  formCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  inputGroup: { marginBottom: 20 },
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

  submitButton: { borderRadius: 14, padding: 16, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // FOOTER
  loginLink: { paddingVertical: 24, alignItems: "center" },
  loginLinkText: { fontSize: 14 },
});
