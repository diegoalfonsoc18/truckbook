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
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import styles from "./LoginStyles";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { COLORS } from "../../constants/colors";

// ✅ Agregar SelectRole a las rutas
type AuthStackParamList = {
  Register: undefined;
  Login: undefined;
  SelectRole: undefined; // ✅ NUEVO
  Home: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function Register({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

  // Validar formato de email
  const validateEmail = (emailInput: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailInput);
  };

  // Validar fortaleza de contraseña
  const validatePasswordStrength = (
    pwd: string
  ): {
    isStrong: boolean;
    requirements: {
      hasMinLength: boolean;
      hasUpperCase: boolean;
      hasLowerCase: boolean;
      hasNumber: boolean;
      hasSpecialChar: boolean;
    };
  } => {
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

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validar email
    if (!email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!validateEmail(email)) {
      newErrors.email = "Email inválido";
    }

    // Validar contraseña
    if (!password.trim()) {
      newErrors.password = "La contraseña es requerida";
    } else {
      const { isStrong } = validatePasswordStrength(password);
      if (!isStrong) {
        newErrors.password =
          "Contraseña muy débil. Requiere mayúsculas, minúsculas, números y caracteres especiales";
      }
    }

    // Validar coincidencia de contraseñas
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

    // Validar formulario primero
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      // ✅ VALIDAR CONTRASEÑA COMPROMETIDA
      if (error?.message.includes("compromised")) {
        Alert.alert(
          "Contraseña débil",
          "Esta contraseña ha sido comprometida en brechas de datos conocidas. Por favor, elige una contraseña diferente y más fuerte.",
          [{ text: "Entendido", onPress: () => setLoading(false) }]
        );
        return;
      }

      // Otros errores
      if (error) {
        // Capturar errores específicos
        if (error.message.includes("already registered")) {
          Alert.alert(
            "Email existente",
            "Este email ya está registrado. ¿Deseas iniciar sesión?"
          );
        } else if (error.message.includes("invalid_grant")) {
          Alert.alert(
            "Error",
            "Los datos proporcionados son inválidos. Intenta nuevamente."
          );
        } else {
          Alert.alert("Error de registro", error.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // ✅ Usuario registrado automáticamente
        Alert.alert("¡Bienvenido!", "Registro exitoso.");
        // ✅ Navega a SelectRole
        navigation.replace("SelectRole");
      } else {
        // Si requiere confirmación de correo
        Alert.alert(
          "Registro exitoso",
          "Revisa tu correo para confirmar tu cuenta."
        );
        navigation.navigate("Login");
      }
    } catch (err) {
      console.error("Registration error:", err);
      Alert.alert(
        "Error",
        "Ocurrió un error inesperado durante el registro. Intenta de nuevo."
      );
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
      console.error("Social registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const { isStrong, requirements } = validatePasswordStrength(password);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.containerRegister}>
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/img/camion.png")}
            style={styles.imageLogin}
          />
        </View>

        <View style={styles.registerSingContainer}>
          <Text style={styles.loginTitle}>Registrarse</Text>

          {/* Email Input */}
          <View style={{ marginBottom: 12 }}>
            <TextInput
              placeholder="Correo electrónico"
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              value={email}
              style={[
                styles.inputRegister,
                errors.email && { borderColor: "red", borderWidth: 1 },
              ]}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 12 }}>
            <TextInput
              placeholder="Contraseña (mín. 8 caracteres)"
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password)
                  setErrors({ ...errors, password: undefined });
                if (text.length > 0) setShowPasswordRequirements(true);
              }}
              value={password}
              secureTextEntry
              style={[
                styles.inputRegister,
                errors.password && { borderColor: "red", borderWidth: 1 },
              ]}
              editable={!loading}
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}

            {/* Indicador de fortaleza de contraseña */}
            {showPasswordRequirements && password.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.passwordStrengthContainer}>
                  <View
                    style={[
                      styles.passwordStrengthBar,
                      {
                        width: `${(Object.values(requirements).filter(Boolean).length / 5) * 100}%`,
                        backgroundColor: isStrong ? "#34C759" : "#FF9500",
                      },
                    ]}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: isStrong ? "#34C759" : "#FF9500",
                    marginTop: 4,
                  }}>
                  {isStrong ? "✓ Contraseña fuerte" : "✗ Contraseña débil"}
                </Text>

                {/* Requisitos */}
                <View style={{ marginTop: 6 }}>
                  <RequirementItem
                    met={requirements.hasMinLength}
                    label="8+ caracteres"
                  />
                  <RequirementItem
                    met={requirements.hasUpperCase}
                    label="Mayúscula (A-Z)"
                  />
                  <RequirementItem
                    met={requirements.hasLowerCase}
                    label="Minúscula (a-z)"
                  />
                  <RequirementItem
                    met={requirements.hasNumber}
                    label="Número (0-9)"
                  />
                  <RequirementItem
                    met={requirements.hasSpecialChar}
                    label="Carácter especial (!@#$%)"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={{ marginBottom: 12 }}>
            <TextInput
              placeholder="Confirmar Contraseña"
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: undefined });
              }}
              value={confirmPassword}
              secureTextEntry
              style={[
                styles.inputRegister,
                errors.confirmPassword && {
                  borderColor: "red",
                  borderWidth: 1,
                },
              ]}
              editable={!loading}
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          <Text style={styles.textFooter}>
            He leído y acepto la Política de Privacidad
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || !validateForm()) && styles.buttonDisabled,
            ]}
            onPress={register}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonTextContinue}>Registrarse</Text>
            )}
          </TouchableOpacity>

          {/* Social Login */}
          <View style={{ marginVertical: 16 }}>
            <Text style={styles.textLogin}>O continúa con</Text>

            <TouchableOpacity
              style={[styles.iconSocialGoogle, loading && { opacity: 0.6 }]}
              onPress={() => handleSocialLogin("google")}
              disabled={loading}>
              <Image
                source={require("../../assets/img/google.png")}
                style={styles.imageSocials}
              />
              <Text style={styles.buttonText}>Sign up with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconSocialFacebook, loading && { opacity: 0.6 }]}
              onPress={() => handleSocialLogin("facebook")}
              disabled={loading}>
              <Image
                source={require("../../assets/img/facebook.png")}
                style={styles.imageSocials}
              />
              <Text style={styles.buttonText}>Sign up with Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginLinkContainer}>
            <Text style={styles.textLogin}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                navigation.navigate("Login");
              }}
              disabled={loading}>
              <Text style={styles.textLoginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// Componente auxiliar para mostrar requisitos
function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        color: met ? "#34C759" : "#999",
        marginVertical: 2,
      }}>
      {met ? "✓" : "○"} {label}
    </Text>
  );
}
