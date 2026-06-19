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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme, getShadow } from "../../constants/Themecontext";
import logger from "../../utils/logger";

type AuthStackParamList = {
  ResetPassword: undefined;
  Login: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

export default function ResetPassword({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirm) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logger.error("ResetPassword error:", error.message);
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("✅ Éxito", "Tu contraseña ha sido actualizada.", [
          {
            text: "Iniciar sesión",
            onPress: async () => {
              await supabase.auth.signOut();
              navigation.navigate("Login");
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
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
              <View style={styles.titleSection}>
                <Image
                  source={require("../../../assets/TruckBook/grilleBlack.png")}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
                <Text style={[styles.title, ds.text]}>Nueva contraseña</Text>
                <Text style={[styles.subtitle, ds.textSecondary]}>
                  Ingresa tu nueva contraseña para continuar
                </Text>
              </View>

              <View style={[styles.formCard, ds.cardBg, getShadow(isDark, "md")]}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>Nueva contraseña</Text>
                  <View style={[styles.inputWrapper, ds.inputBg, { borderColor: colors.border }]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[styles.input, ds.text]}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={(t) => setPassword(t.slice(0, 72))}
                      secureTextEntry
                      autoCapitalize="none"
                      keyboardAppearance="light"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>Confirmar contraseña</Text>
                  <View style={[styles.inputWrapper, ds.inputBg, { borderColor: colors.border }]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[styles.input, ds.text]}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={colors.textMuted}
                      value={confirm}
                      onChangeText={(t) => setConfirm(t.slice(0, 72))}
                      secureTextEntry
                      autoCapitalize="none"
                      keyboardAppearance="light"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.8}>
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Actualizar contraseña</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  titleSection: { alignItems: "center", paddingBottom: 32 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 36 },
  iconImage: { width: 120, height: 120 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  formCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
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
  submitButton: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
