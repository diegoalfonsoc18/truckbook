import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoleStore } from "../../store/RoleStore";
import styles from "./CuentaStyles";

export default function Account({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const role = useRoleStore((state) => state.role);

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      {
        text: "Cancelar",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Cerrar sesión",
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              navigation.replace("Login");
            }
          } finally {
            setLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Mi Cuenta</Text>
          <Text style={styles.subtitle}>
            Gestiona tu perfil y configuración
          </Text>
        </View>

        {/* Información de Rol */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Rol</Text>
          <View style={styles.roleCard}>
            <Text style={styles.roleLabel}>
              {role === "conductor" && "👨‍✈️ Conductor"}
              {role === "administrador" && "👔 Administrador"}
              {role === "dueño" && "🚛 Dueño del Camión"}
            </Text>
            <TouchableOpacity
              style={styles.changeRoleButton}
              onPress={() => {
                // Implementar cambio de rol si es necesario
                Alert.alert("Cambiar rol", "Función en desarrollo");
              }}>
              <Text style={styles.changeRoleText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Opciones de Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Alert.alert("Perfil", "Gestionar perfil en desarrollo");
            }}>
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>👤</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Mi Perfil</Text>
                <Text style={styles.optionSubtitle}>
                  Ver y editar información
                </Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Alert.alert("Seguridad", "Cambiar contraseña en desarrollo");
            }}>
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>🔒</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Seguridad</Text>
                <Text style={styles.optionSubtitle}>Cambiar contraseña</Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Alert.alert("Privacidad", "Política de privacidad en desarrollo");
            }}>
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>📋</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Privacidad</Text>
                <Text style={styles.optionSubtitle}>Política y términos</Text>
              </View>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Botón Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              loading && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
            disabled={loading}>
            <Text style={styles.logoutText}>
              {loading ? "Cerrando sesión..." : "Cerrar sesión"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
