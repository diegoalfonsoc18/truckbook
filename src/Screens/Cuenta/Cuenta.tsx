import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import supabase from "../../config/SupaBaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoleStore } from "../../store/RoleStore";
import {
  useTheme,
  SPACING,
  BORDER_RADIUS,
  getShadow,
} from "../../constants/Themecontext";
import ThemeSelector from "../../constants/ThemeSelector";

const { width } = Dimensions.get("window");

type UserRole = "conductor" | "administrador" | "propietario";

const ROLES_DISPONIBLES: {
  id: UserRole;
  icon: string;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    id: "conductor",
    icon: "🚛",
    label: "Conductor",
    description: "Registra gastos, viajes y kilometraje",
    color: "#00D9A5",
  },
  {
    id: "administrador",
    icon: "📊",
    label: "Administrador",
    description: "Gestiona conductores y flotas",
    color: "#FFB800",
  },
  {
    id: "propietario",
    icon: "👑",
    label: "Propietario",
    description: "Dashboard financiero completo",
    color: "#E94560",
  },
];

const MENU_OPTIONS = [
  {
    id: "profile",
    icon: "👤",
    title: "Mi Perfil",
    subtitle: "Información personal",
    color: "#6C5CE7",
  },
  {
    id: "vehicles",
    icon: "🚚",
    title: "Mis Vehículos",
    subtitle: "Gestionar flota",
    color: "#00D9A5",
  },
  {
    id: "theme",
    icon: "🎨",
    title: "Apariencia",
    subtitle: "Tema claro u oscuro",
    color: "#FF6B6B",
    action: "theme",
  },
  {
    id: "security",
    icon: "🔐",
    title: "Seguridad",
    subtitle: "Contraseña y acceso",
    color: "#FFB800",
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "Notificaciones",
    subtitle: "Alertas y avisos",
    color: "#74B9FF",
  },
  {
    id: "help",
    icon: "💬",
    title: "Ayuda",
    subtitle: "Soporte y FAQ",
    color: "#A29BFE",
  },
];

export default function Account({ navigation }: any) {
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalRolesVisible, setModalRolesVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  useEffect(() => {
    cargarUsuario();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (modalRolesVisible) {
      Animated.parallel([
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalScaleAnim.setValue(0.9);
      modalOpacityAnim.setValue(0);
    }
  }, [modalRolesVisible]);

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

  const handleCambiarRol = async (nuevoRol: UserRole) => {
    try {
      setLoading(true);
      if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado");
        return;
      }

      const { error } = await supabase
        .from("usuarios")
        .update({ rol: nuevoRol })
        .eq("user_id", user.id);

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
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "No se pudo cambiar el rol");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que deseas salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
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
        },
      ],
    );
  };

  const handleMenuPress = (option: (typeof MENU_OPTIONS)[0]) => {
    if (option.action === "theme") {
      setThemeModalVisible(true);
    } else {
      Alert.alert(
        "En desarrollo",
        `La sección "${option.title}" estará disponible pronto.`,
      );
    }
  };

  const currentRole = ROLES_DISPONIBLES.find((r) => r.id === role);
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";

  // Estilos dinámicos
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    cardBg: {
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    text: {
      color: colors.text,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    textMuted: {
      color: colors.textMuted,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.ScrollView
          style={[styles.scrollView, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* HEADER CON AVATAR */}
          <Animated.View
            style={[
              styles.headerSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarGradient,
                  { backgroundColor: currentRole?.color || colors.accent },
                  getShadow(isDark, "lg"),
                ]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View
                style={[
                  styles.avatarBadge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                  },
                ]}>
                <Text style={styles.avatarBadgeText}>
                  {currentRole?.icon || "👤"}
                </Text>
              </View>
            </View>

            <Text style={[styles.userName, dynamicStyles.text]}>
              {userName}
            </Text>
            <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>
              {user?.email || "Cargando..."}
            </Text>

            {/* Rol Badge */}
            <TouchableOpacity
              style={[
                styles.roleBadge,
                { backgroundColor: currentRole?.color || colors.accent },
              ]}
              onPress={() => setModalRolesVisible(true)}
              activeOpacity={0.8}>
              <Text style={styles.roleBadgeIcon}>
                {currentRole?.icon || "👤"}
              </Text>
              <Text style={styles.roleBadgeText}>
                {currentRole?.label || "Sin rol"}
              </Text>
              <Text style={styles.roleBadgeArrow}>›</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <Animated.View
            style={[
              styles.statsContainer,
              dynamicStyles.cardBg,
              { transform: [{ translateY: slideAnim }] },
              getShadow(isDark, "md"),
            ]}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, dynamicStyles.text]}>12</Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                Viajes
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                styles.statCardMiddle,
                { borderColor: colors.border },
              ]}>
              <Text style={[styles.statValue, dynamicStyles.text]}>2.4K</Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                Km
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, dynamicStyles.text]}>$1.2M</Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
                Mes
              </Text>
            </View>
          </Animated.View>

          {/* MENÚ DE OPCIONES */}
          <Animated.View
            style={[
              styles.menuSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
              Configuración
            </Text>

            <View
              style={[
                styles.menuCard,
                dynamicStyles.cardBg,
                getShadow(isDark, "sm"),
              ]}>
              {MENU_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.menuItem,
                    index < MENU_OPTIONS.length - 1 && [
                      styles.menuItemBorder,
                      { borderBottomColor: colors.border },
                    ],
                  ]}
                  onPress={() => handleMenuPress(option)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.menuIconContainer,
                      { backgroundColor: `${option.color}20` },
                    ]}>
                    <Text style={styles.menuIcon}>{option.icon}</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuTitle, dynamicStyles.text]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.menuSubtitle,
                        dynamicStyles.textSecondary,
                      ]}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.menuArrow, dynamicStyles.textMuted]}>
                    ›
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* BOTÓN LOGOUT */}
          <Animated.View
            style={[
              styles.logoutSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                dynamicStyles.cardBg,
                { borderColor: colors.danger + "40" },
                getShadow(isDark, "sm"),
              ]}
              onPress={handleLogout}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <>
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={[styles.logoutText, { color: colors.danger }]}>
                    Cerrar Sesión
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.versionText, dynamicStyles.textMuted]}>
              TruckBook v1.0.0
            </Text>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* MODAL CAMBIAR ROL */}
      <Modal
        visible={modalRolesVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalRolesVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalRolesVisible(false)}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.overlay },
            ]}
          />

          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacityAnim,
                transform: [{ scale: modalScaleAnim }],
              },
            ]}>
            <TouchableOpacity activeOpacity={1}>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.modalBg,
                    borderColor: colors.border,
                  },
                ]}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalHandle,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                  <Text style={[styles.modalTitle, dynamicStyles.text]}>
                    Cambiar Rol
                  </Text>
                  <Text
                    style={[styles.modalSubtitle, dynamicStyles.textSecondary]}>
                    Selecciona cómo quieres usar TruckBook
                  </Text>
                </View>

                {/* Roles */}
                <View style={styles.rolesContainer}>
                  {ROLES_DISPONIBLES.map((rol) => {
                    const isActive = role === rol.id;
                    return (
                      <TouchableOpacity
                        key={rol.id}
                        style={styles.roleOption}
                        onPress={() => handleCambiarRol(rol.id)}
                        disabled={loading}
                        activeOpacity={0.8}>
                        <View
                          style={[
                            styles.roleOptionGradient,
                            {
                              backgroundColor: isActive
                                ? rol.color
                                : colors.cardBg,
                              borderColor: isActive ? rol.color : colors.border,
                            },
                          ]}>
                          <View
                            style={[
                              styles.roleIconContainer,
                              {
                                backgroundColor: isActive
                                  ? "rgba(255,255,255,0.2)"
                                  : `${rol.color}20`,
                              },
                            ]}>
                            <Text style={styles.roleIcon}>{rol.icon}</Text>
                          </View>
                          <View style={styles.roleTextContainer}>
                            <Text
                              style={[
                                styles.roleLabel,
                                { color: isActive ? "#FFFFFF" : colors.text },
                              ]}>
                              {rol.label}
                            </Text>
                            <Text
                              style={[
                                styles.roleDescription,
                                {
                                  color: isActive
                                    ? "rgba(255,255,255,0.8)"
                                    : colors.textSecondary,
                                },
                              ]}>
                              {rol.description}
                            </Text>
                          </View>
                          {isActive && (
                            <View style={styles.roleCheck}>
                              <Text style={styles.roleCheckText}>✓</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={[
                    styles.modalCancelButton,
                    { backgroundColor: colors.cardBg },
                  ]}
                  onPress={() => setModalRolesVisible(false)}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.modalCancelText,
                      dynamicStyles.textSecondary,
                    ]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL SELECTOR DE TEMA */}
      <ThemeSelector
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // HEADER
  headerSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  avatarBadgeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  roleBadgeIcon: {
    fontSize: 16,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  roleBadgeArrow: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.7,
  },

  // STATS
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // MENU
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  menuArrow: {
    fontSize: 22,
    fontWeight: "300",
  },

  // LOGOUT
  logoutSection: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    width: "100%",
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 12,
    marginTop: 20,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    marginHorizontal: 16,
    marginBottom: 40,
  },
  modalContent: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  rolesContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  roleOption: {
    borderRadius: 16,
    overflow: "hidden",
  },
  roleOptionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 13,
  },
  roleCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  roleCheckText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCancelButton: {
    alignItems: "center",
    padding: 18,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
