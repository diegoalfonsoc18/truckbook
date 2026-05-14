import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
import ThemeSelector from "../../constants/ThemeSelector";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;
const COLUMN_COUNT = 3;
const GRID_GAP = 12;
const ITEM_WIDTH =
  (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) /
  COLUMN_COUNT;

const CONDUCTOR_COLOR = "#00D9A5";

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

export default function Account() {
  const { colors, isDark } = useTheme();
  const c = colors;
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    cargarUsuario();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";

  return (
    <View style={[styles.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerFixed}>
          <View style={styles.header}>
            {navigation?.canGoBack() && (
              <TouchableOpacity
                style={[
                  styles.backBtn,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface },
                ]}
                onPress={() => navigation.goBack()}>
                <Text style={{ fontSize: 18 }}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.headerTitle, { color: c.text }]}>Cuenta</Text>
          </View>
        </View>

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
                  { backgroundColor: CONDUCTOR_COLOR },
                  getShadow(isDark, "lg"),
                ]}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>

              <Text style={[styles.userName, { color: c.text }]}>{userName}</Text>
              <Text style={[styles.userEmail, { color: c.textSecondary }]}>
                {user?.email || "Cargando…"}
              </Text>

              <View style={[styles.roleBadge, { backgroundColor: CONDUCTOR_COLOR }]}>
                <Text style={styles.roleBadgeIcon}>🚛</Text>
                <Text style={styles.roleBadgeText}>Conductor</Text>
              </View>
            </View>

            {/* ESTADÍSTICAS */}
            <View
              style={[
                styles.statsContainer,
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "md"),
              ]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.text }]}>12</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>Viajes</Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  styles.statItemBorder,
                  { borderColor: c.border },
                ]}>
                <Text style={[styles.statValue, { color: c.text }]}>2.4K</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>Km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.text }]}>$1.2M</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>Mes</Text>
              </View>
            </View>

            {/* MENÚ */}
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
              Configuración
            </Text>
            <View style={styles.menuGrid}>
              {MENU_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.menuItem,
                    { backgroundColor: c.cardBg, borderColor: c.border },
                    getShadow(isDark, "sm"),
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
                  <Text style={[styles.menuTitle, { color: c.text }]} numberOfLines={1}>
                    {option.title}
                  </Text>
                  <Text
                    style={[styles.menuSubtitle, { color: c.textMuted }]}
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
                { backgroundColor: c.cardBg, borderColor: c.danger + "40" },
                getShadow(isDark, "sm"),
              ]}
              onPress={handleLogout}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color={c.danger} />
              ) : (
                <>
                  <Text style={styles.logoutIcon}>🚪</Text>
                  <Text style={[styles.logoutText, { color: c.danger }]}>
                    Cerrar Sesión
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.versionText, { color: c.textMuted }]}>
              TruckBook v1.0.0
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

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

  headerFixed: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 8 },
  header: { paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 40 },

  profileSection: { alignItems: "center", paddingVertical: 16 },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36, fontWeight: "700", color: "#FFF" },
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

  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

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
});
