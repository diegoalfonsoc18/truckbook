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
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

// ✅ Colores del tema - Estilo industrial/trucking premium
const COLORS = {
  primary: "#1A1A2E",
  secondary: "#16213E",
  accent: "#E94560",
  accentLight: "#FF6B6B",
  surface: "#0F0F1A",
  surfaceLight: "#1F1F35",
  text: "#FFFFFF",
  textSecondary: "#8A8A9A",
  textMuted: "#5A5A6A",
  border: "#2A2A40",
  success: "#00D9A5",
  warning: "#FFB800",
  cardBg: "rgba(31, 31, 53, 0.8)",
};

const ROLES_DISPONIBLES = [
  {
    id: "conductor",
    icon: "🚛",
    label: "Conductor",
    description: "Registra gastos, viajes y kilometraje",
    color: "#00D9A5",
    gradient: ["#00D9A5", "#00B894"],
  },
  {
    id: "administrador",
    icon: "📊",
    label: "Administrador",
    description: "Gestiona conductores y flotas",
    color: "#FFB800",
    gradient: ["#FFB800", "#FF9500"],
  },
  {
    id: "propietario",
    icon: "👑",
    label: "Propietario",
    description: "Dashboard financiero completo",
    color: "#E94560",
    gradient: ["#E94560", "#FF6B6B"],
  },
] as const;

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
    color: "#FF6B6B",
  },
  {
    id: "help",
    icon: "💬",
    title: "Ayuda",
    subtitle: "Soporte y FAQ",
    color: "#74B9FF",
  },
  {
    id: "privacy",
    icon: "📋",
    title: "Privacidad",
    subtitle: "Términos y políticas",
    color: "#A29BFE",
  },
];

export default function Account({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalRolesVisible, setModalRolesVisible] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  useEffect(() => {
    cargarUsuario();
    // Animación de entrada
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

  const handleCambiarRol = async (nuevoRol: string) => {
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

  const handleMenuPress = (optionId: string) => {
    Alert.alert(
      "En desarrollo",
      `La sección "${optionId}" estará disponible pronto.`,
    );
  };

  const currentRole = ROLES_DISPONIBLES.find((r) => r.id === role);
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.surface, COLORS.primary]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.ScrollView
          style={[styles.scrollView, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {/* ✅ HEADER CON AVATAR */}
          <Animated.View
            style={[
              styles.headerSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={
                  currentRole?.gradient || [COLORS.accent, COLORS.accentLight]
                }
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </LinearGradient>
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>
                  {currentRole?.icon || "👤"}
                </Text>
              </View>
            </View>

            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{user?.email || "Cargando..."}</Text>

            {/* Rol Badge */}
            <TouchableOpacity
              style={styles.roleBadge}
              onPress={() => setModalRolesVisible(true)}
              activeOpacity={0.8}>
              <LinearGradient
                colors={
                  currentRole?.gradient || [COLORS.accent, COLORS.accentLight]
                }
                style={styles.roleBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text style={styles.roleBadgeIcon}>
                  {currentRole?.icon || "👤"}
                </Text>
                <Text style={styles.roleBadgeText}>
                  {currentRole?.label || "Sin rol"}
                </Text>
                <Text style={styles.roleBadgeArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ✅ ESTADÍSTICAS RÁPIDAS */}
          <Animated.View
            style={[
              styles.statsContainer,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Viajes</Text>
            </View>
            <View style={[styles.statCard, styles.statCardMiddle]}>
              <Text style={styles.statValue}>2.4K</Text>
              <Text style={styles.statLabel}>Km</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>$1.2M</Text>
              <Text style={styles.statLabel}>Mes</Text>
            </View>
          </Animated.View>

          {/* ✅ MENÚ DE OPCIONES */}
          <Animated.View
            style={[
              styles.menuSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <Text style={styles.sectionTitle}>Configuración</Text>

            <View style={styles.menuCard}>
              {MENU_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.menuItem,
                    index < MENU_OPTIONS.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleMenuPress(option.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.menuIconContainer,
                      { backgroundColor: `${option.color}20` },
                    ]}>
                    <Text style={styles.menuIcon}>{option.icon}</Text>
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>{option.title}</Text>
                    <Text style={styles.menuSubtitle}>{option.subtitle}</Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ✅ BOTÓN LOGOUT */}
          <Animated.View
            style={[
              styles.logoutSection,
              { transform: [{ translateY: slideAnim }] },
            ]}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <>
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={styles.logoutText}>Cerrar Sesión</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.versionText}>TruckBook v1.0.0</Text>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* ✅ MODAL CAMBIAR ROL */}
      <Modal
        visible={modalRolesVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalRolesVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalRolesVisible(false)}>
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
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
              <LinearGradient
                colors={[COLORS.surfaceLight, COLORS.surface]}
                style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Cambiar Rol</Text>
                  <Text style={styles.modalSubtitle}>
                    Selecciona cómo quieres usar TruckBook
                  </Text>
                </View>

                {/* Roles */}
                <View style={styles.rolesContainer}>
                  {ROLES_DISPONIBLES.map((rol) => (
                    <TouchableOpacity
                      key={rol.id}
                      style={[
                        styles.roleOption,
                        role === rol.id && styles.roleOptionActive,
                      ]}
                      onPress={() => handleCambiarRol(rol.id)}
                      disabled={loading}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={
                          role === rol.id
                            ? rol.gradient
                            : ["transparent", "transparent"]
                        }
                        style={[
                          styles.roleOptionGradient,
                          role === rol.id && styles.roleOptionGradientActive,
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}>
                        <View
                          style={[
                            styles.roleIconContainer,
                            { backgroundColor: `${rol.color}20` },
                          ]}>
                          <Text style={styles.roleIcon}>{rol.icon}</Text>
                        </View>
                        <View style={styles.roleTextContainer}>
                          <Text
                            style={[
                              styles.roleLabel,
                              role === rol.id && styles.roleLabelActive,
                            ]}>
                            {rol.label}
                          </Text>
                          <Text
                            style={[
                              styles.roleDescription,
                              role === rol.id && styles.roleDescriptionActive,
                            ]}>
                            {rol.description}
                          </Text>
                        </View>
                        {role === rol.id && (
                          <View style={styles.roleCheck}>
                            <Text style={styles.roleCheckText}>✓</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalRolesVisible(false)}
                  disabled={loading}
                  activeOpacity={0.8}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ✅ HEADER
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
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: COLORS.text,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarBadgeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  roleBadge: {
    borderRadius: 20,
    overflow: "hidden",
  },
  roleBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  roleBadgeIcon: {
    fontSize: 16,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  roleBadgeArrow: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    opacity: 0.7,
  },

  // ✅ STATS
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ✅ MENU
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  menuArrow: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: "300",
  },

  // ✅ LOGOUT
  logoutSection: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + "40",
    gap: 10,
    width: "100%",
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.accent,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 20,
  },

  // ✅ MODAL
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
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rolesContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  roleOption: {
    borderRadius: 16,
    overflow: "hidden",
  },
  roleOptionActive: {},
  roleOptionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleOptionGradientActive: {
    borderColor: "transparent",
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
    color: COLORS.text,
    marginBottom: 2,
  },
  roleLabelActive: {
    color: COLORS.text,
  },
  roleDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  roleDescriptionActive: {
    color: "rgba(255,255,255,0.8)",
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
    color: COLORS.text,
  },
  modalCancelButton: {
    alignItems: "center",
    padding: 18,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
