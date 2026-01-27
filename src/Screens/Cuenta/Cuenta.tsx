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
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../../config/SupaBaseConfig";
import { useRoleStore } from "../../store/RoleStore";
import { useTheme, getShadow } from "../../constants/Themecontext";
import ThemeSelector from "../../constants/ThemeSelector";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;
const COLUMN_COUNT = 3;
const GRID_GAP = 12;
const ITEM_WIDTH =
  (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) /
  COLUMN_COUNT;

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
    description: "Registra gastos y viajes",
    color: "#00D9A5",
  },
  {
    id: "administrador",
    icon: "📊",
    label: "Admin",
    description: "Gestiona flotas",
    color: "#FFB800",
  },
  {
    id: "propietario",
    icon: "👑",
    label: "Propietario",
    description: "Dashboard completo",
    color: "#E94560",
  },
];

const MENU_OPTIONS = [
  {
    id: "profile",
    icon: "👤",
    title: "Mi Perfil",
    subtitle: "Info personal",
    color: "#6C5CE7",
  },
  {
    id: "vehicles",
    icon: "🚚",
    title: "Vehículos",
    subtitle: "Gestionar flota",
    color: "#00D9A5",
  },
  {
    id: "theme",
    icon: "🎨",
    title: "Apariencia",
    subtitle: "Tema claro/oscuro",
    color: "#FF6B6B",
    action: "theme",
  },
  {
    id: "security",
    icon: "🔐",
    title: "Seguridad",
    subtitle: "Contraseña",
    color: "#FFB800",
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "Alertas",
    subtitle: "Notificaciones",
    color: "#74B9FF",
  },
  {
    id: "help",
    icon: "💬",
    title: "Ayuda",
    subtitle: "Soporte",
    color: "#A29BFE",
  },
];

export default function Account({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [modalRolesVisible, setModalRolesVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  useEffect(() => {
    cargarUsuario();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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
      if (!user?.id) return Alert.alert("Error", "Usuario no identificado");

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
      Alert.alert("Error", "No se pudo cambiar el rol");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar Sesión", "¿Salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert("Error", error.message);
            else navigation.replace("Login");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleMenuPress = (option: (typeof MENU_OPTIONS)[0]) => {
    if (option.action === "theme") {
      setThemeModalVisible(true);
    } else {
      Alert.alert("En desarrollo", `"${option.title}" disponible pronto.`);
    }
  };

  const currentRole = ROLES_DISPONIBLES.find((r) => r.id === role);
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER FIJO */}
        <View style={styles.headerFixed}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, ds.text]}>Cuenta</Text>
          </View>
        </View>

        {/* CONTENIDO SCROLLEABLE */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* PERFIL */}
            <View style={styles.profileSection}>
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: currentRole?.color || colors.accent },
                  getShadow(isDark, "lg"),
                ]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
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

              <Text style={[styles.userName, ds.text]}>{userName}</Text>
              <Text style={[styles.userEmail, ds.textSecondary]}>
                {user?.email || "Cargando..."}
              </Text>

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
            </View>

            {/* ESTADÍSTICAS - GRID 3 COLUMNAS */}
            <View
              style={[
                styles.statsContainer,
                ds.cardBg,
                getShadow(isDark, "md"),
              ]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, ds.text]}>12</Text>
                <Text style={[styles.statLabel, ds.textSecondary]}>Viajes</Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  styles.statItemBorder,
                  { borderColor: colors.border },
                ]}>
                <Text style={[styles.statValue, ds.text]}>2.4K</Text>
                <Text style={[styles.statLabel, ds.textSecondary]}>Km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, ds.text]}>$1.2M</Text>
                <Text style={[styles.statLabel, ds.textSecondary]}>Mes</Text>
              </View>
            </View>

            {/* MENÚ - GRID 3 COLUMNAS */}
            <Text style={[styles.sectionTitle, ds.textSecondary]}>
              Configuración
            </Text>
            <View style={styles.menuGrid}>
              {MENU_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.menuItem, ds.cardBg, getShadow(isDark, "sm")]}
                  onPress={() => handleMenuPress(option)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.menuIconContainer,
                      { backgroundColor: `${option.color}20` },
                    ]}>
                    <Text style={styles.menuIcon}>{option.icon}</Text>
                  </View>
                  <Text style={[styles.menuTitle, ds.text]} numberOfLines={1}>
                    {option.title}
                  </Text>
                  <Text
                    style={[styles.menuSubtitle, ds.textMuted]}
                    numberOfLines={1}>
                    {option.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LOGOUT */}
            <TouchableOpacity
              style={[
                styles.logoutButton,
                ds.cardBg,
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

            <Text style={[styles.versionText, ds.textMuted]}>
              TruckBook v1.0.0
            </Text>
          </Animated.View>
        </ScrollView>
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
                <View
                  style={[
                    styles.modalHandle,
                    { backgroundColor: colors.textMuted },
                  ]}
                />
                <Text style={[styles.modalTitle, ds.text]}>Cambiar Rol</Text>
                <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                  ¿Cómo usarás TruckBook?
                </Text>

                <View style={styles.rolesContainer}>
                  {ROLES_DISPONIBLES.map((rol) => {
                    const isActive = role === rol.id;
                    return (
                      <TouchableOpacity
                        key={rol.id}
                        style={[
                          styles.roleOption,
                          {
                            backgroundColor: isActive
                              ? rol.color
                              : colors.cardBg,
                            borderColor: isActive ? rol.color : colors.border,
                          },
                        ]}
                        onPress={() => handleCambiarRol(rol.id)}
                        disabled={loading}
                        activeOpacity={0.8}>
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
                              { color: isActive ? "#FFF" : colors.text },
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
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalCancelButton,
                    { backgroundColor: colors.cardBg },
                  ]}
                  onPress={() => setModalRolesVisible(false)}
                  disabled={loading}>
                  <Text style={[styles.modalCancelText, ds.textSecondary]}>
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
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER FIJO
  headerFixed: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 8 },
  header: { paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },

  // SCROLL
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 40 },

  // PROFILE
  profileSection: { alignItems: "center", paddingVertical: 16 },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: "700", color: "#FFF" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
  },
  avatarBadgeText: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 12 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 6,
  },
  roleBadgeIcon: { fontSize: 14 },
  roleBadgeText: { fontSize: 13, fontWeight: "600", color: "#FFF" },
  roleBadgeArrow: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    opacity: 0.7,
  },

  // STATS
  statsContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center" },
  statItemBorder: { borderLeftWidth: 1, borderRightWidth: 1 },
  statValue: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: 11, textTransform: "uppercase" },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // MENU GRID
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginBottom: 24,
  },
  menuItem: {
    width: ITEM_WIDTH,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  menuIcon: { fontSize: 20 },
  menuTitle: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  menuSubtitle: { fontSize: 10 },

  // LOGOUT
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  logoutIcon: { fontSize: 16 },
  logoutText: { fontSize: 15, fontWeight: "600" },
  versionText: { fontSize: 11, textAlign: "center" },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContainer: { marginHorizontal: 16, marginBottom: 30 },
  modalContent: { borderRadius: 24, padding: 16, borderWidth: 1 },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 13, textAlign: "center", marginBottom: 16 },

  rolesContainer: { gap: 10, marginBottom: 12 },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roleIcon: { fontSize: 22 },
  roleTextContainer: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  roleDescription: { fontSize: 12 },
  roleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  roleCheckText: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  modalCancelButton: { alignItems: "center", padding: 14, borderRadius: 12 },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
});
