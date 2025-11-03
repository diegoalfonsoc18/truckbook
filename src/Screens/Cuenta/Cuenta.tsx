import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoleStore } from "../../store/RoleStore";
import styles from "./CuentaStyles";

const ROLES_DISPONIBLES = [
  {
    id: "conductor",
    label: "👨‍✈️ Conductor",
    description: "Registra gastos y viajes",
  },
  {
    id: "administrador",
    label: "👔 Administrador",
    description: "Gestiona conductores",
  },
  {
    id: "propietario",
    label: "🚛 Propietario",
    description: "Dashboard financiero",
  },
] as const;

export default function Account({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalRolesVisible, setModalRolesVisible] = useState(false);

  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      setUser(currentUser);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCambiarRol = async (nuevoRol: any) => {
    try {
      setLoading(true);

      if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado");
        return;
      }

      // Intentar actualizar
      const { error } = await supabase
        .from("usuarios")
        .update({ rol: nuevoRol })
        .eq("user_id", user.id);

      // Si no existe el registro, insertarlo
      if (error && error.code === "PGRST116") {
        const { error: insertError } = await supabase.from("usuarios").insert([
          {
            user_id: user.id,
            rol: nuevoRol,
            nombre: user.user_metadata?.nombre,
            email: user.email,
          },
        ]);

        if (insertError) throw insertError;
      } else if (error) {
        throw error;
      }

      setRole(nuevoRol);
      setModalRolesVisible(false);

      Alert.alert(
        "Éxito",
        `Has cambiado a rol: ${ROLES_DISPONIBLES.find((r) => r.id === nuevoRol)?.label}`
      );
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "No se pudo cambiar el rol");
    } finally {
      setLoading(false);
    }
  };

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

  const getRoleLabel = (roleId: string | null) => {
    return ROLES_DISPONIBLES.find((r) => r.id === roleId)?.label || "Sin rol";
  };

  const getRoleDescription = (roleId: string | null) => {
    return (
      ROLES_DISPONIBLES.find((r) => r.id === roleId)?.description ||
      "Selecciona un rol"
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Mi Cuenta</Text>
          <Text style={styles.subtitle}>
            Gestiona tu perfil y configuración
          </Text>
        </View>

        {/* MI ROL ACTUAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Rol</Text>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => setModalRolesVisible(true)}
            disabled={loading}>
            <View style={styles.roleCardLeft}>
              <Text style={styles.roleLabel}>{getRoleLabel(role)}</Text>
              <Text style={styles.roleDescription}>
                {getRoleDescription(role)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeRoleButton}
              onPress={() => setModalRolesVisible(true)}
              disabled={loading}>
              <Text style={styles.changeRoleText}>Cambiar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* OPCIONES DE CONFIGURACIÓN */}
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

        {/* BOTÓN LOGOUT */}
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

      {/* ✅ MODAL CAMBIAR ROL */}
      <Modal
        visible={modalRolesVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRolesVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalRolesVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Cambiar Rol</Text>

                {ROLES_DISPONIBLES.map((rol) => (
                  <TouchableOpacity
                    key={rol.id}
                    style={[
                      styles.rolOption,
                      role === rol.id && styles.rolOptionActive,
                    ]}
                    onPress={() => handleCambiarRol(rol.id)}
                    disabled={loading}>
                    <View style={styles.rolOptionContent}>
                      <Text style={styles.rolOptionLabel}>{rol.label}</Text>
                      <Text style={styles.rolOptionDescription}>
                        {rol.description}
                      </Text>
                    </View>
                    {role === rol.id && (
                      <Text style={styles.rolOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalRolesVisible(false)}
                  disabled={loading}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
