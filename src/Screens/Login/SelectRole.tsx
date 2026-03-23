import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRoleStore, UserRole } from "../../store/RoleStore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";

const { width } = Dimensions.get("window");

type AuthStackParamList = {
  SelectRole: undefined;
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, "SelectRole">;

const ROLES: { id: UserRole; label: string; description: string; emoji: string }[] = [
  {
    id: "conductor",
    label: "Conductor",
    description: "Conduzco vehiculos",
    emoji: "🧑‍✈️",
  },
  {
    id: "administrador",
    label: "Administrador",
    description: "Gestiono la operacion",
    emoji: "📋",
  },
  {
    id: "propietario",
    label: "Propietario",
    description: "Soy dueño de vehiculos",
    emoji: "🚛",
  },
];

export default function SelectRoleScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { guardarRolEnDB } = useRoleStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  const handleSelectRole = async (role: UserRole) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      if (user?.id) {
        await guardarRolEnDB(user.id, role);
      } else {
        useRoleStore.getState().setRole(role);
      }
    } catch (err) {
      console.error("Error guardando rol:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.headerSection}>
            <Text style={styles.headerEmoji}>👋</Text>
            <Text style={[styles.title, ds.text]}>Cual es tu rol?</Text>
            <Text style={[styles.subtitle, ds.textSecondary]}>
              Puedes cambiarlo en cualquier momento. Un usuario puede tener
              todos los roles.
            </Text>
          </View>

          {/* ROLES */}
          <View style={styles.rolesContainer}>
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    ds.cardBg,
                    getShadow(isDark, "sm"),
                    isSelected && {
                      borderColor: colors.accent,
                      borderWidth: 2,
                      backgroundColor: colors.accent + "10",
                    },
                  ]}
                  onPress={() => handleSelectRole(role.id)}
                  activeOpacity={0.7}
                  disabled={loading}>
                  <View
                    style={[
                      styles.roleIconContainer,
                      {
                        backgroundColor: isSelected
                          ? colors.accent + "20"
                          : colors.primary,
                      },
                    ]}>
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleLabel, ds.text]}>
                      {role.label}
                    </Text>
                    <Text style={[styles.roleDescription, ds.textSecondary]}>
                      {role.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkBadge,
                        { backgroundColor: colors.accent },
                      ]}>
                      {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.checkText}>✓</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* FOOTER */}
          <Text style={[styles.footerText, ds.textMuted]}>
            Puedes cambiar tu rol desde la pantalla de Cuenta
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  // HEADER
  headerSection: { alignItems: "center", marginBottom: 32 },
  headerEmoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // ROLES
  rolesContainer: { gap: 12, marginBottom: 32 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  roleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  roleEmoji: { fontSize: 26 },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  roleDescription: { fontSize: 13 },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  // FOOTER
  footerText: { fontSize: 12, textAlign: "center" },
});
