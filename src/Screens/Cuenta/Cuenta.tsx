import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../../config/SupaBaseConfig";
import { useTheme } from "../../constants/Themecontext";
import logger from "../../utils/logger";

const CONDUCTOR_COLOR = "#00D9A5";
const H_PAD = 20;

const MENU_ITEMS = [
  {
    id: "profile",
    icon: "person-outline" as const,
    label: "Mi Perfil",
    subtitle: "Nombre y datos personales",
  },
  {
    id: "security",
    icon: "lock-closed-outline" as const,
    label: "Seguridad",
    subtitle: "Cambiar contraseña",
  },
  {
    id: "help",
    icon: "chatbubble-outline" as const,
    label: "Ayuda",
    subtitle: "Soporte y contacto",
  },
];

export default function Cuenta() {
  const { colors: c } = useTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(currentUser);
    } catch (error) {
      logger.error("Error:", error);
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
            // Borrar push_token antes de cerrar sesión
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("usuarios")
                .update({ push_token: null })
                .eq("id", user.id);
            }
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

  const handleItemPress = (id: string) => {
    Alert.alert("En desarrollo", "Disponible próximamente.");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName =
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        {/* HEADER */}
        <View style={s.header}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: c.surface }]}
              onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={c.text} />
            </TouchableOpacity>
          )}
          <Text style={[s.headerTitle, { color: c.text }]}>Cuenta</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}>

          {/* AVATAR */}
          <View style={s.profileSection}>
            <View style={[s.avatar, { backgroundColor: CONDUCTOR_COLOR }]}>
              <Text style={s.avatarText}>{userInitial}</Text>
            </View>
            <Text style={[s.userName, { color: c.text }]}>{userName}</Text>
            <Text style={[s.userEmail, { color: c.textSecondary }]}>
              {user?.email || ""}
            </Text>
            <View style={[s.roleBadge, { backgroundColor: CONDUCTOR_COLOR + "20" }]}>
              <Text style={[s.roleBadgeText, { color: CONDUCTOR_COLOR }]}>🚛 Conductor</Text>
            </View>
          </View>

          {/* CONFIGURACIÓN */}
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>Configuración</Text>
          <View style={[s.listCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            {MENU_ITEMS.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={s.listRow}
                  onPress={() => handleItemPress(item.id)}
                  activeOpacity={0.6}>
                  <View style={[s.listIcon, { backgroundColor: c.surface }]}>
                    <Ionicons name={item.icon} size={18} color={c.textSecondary} />
                  </View>
                  <View style={s.listInfo}>
                    <Text style={[s.listLabel, { color: c.text }]}>{item.label}</Text>
                    <Text style={[s.listSub, { color: c.textMuted }]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
                {index < MENU_ITEMS.length - 1 && (
                  <View style={[s.divider, { backgroundColor: c.divider }]} />
                )}
              </View>
            ))}
          </View>

          {/* LOGOUT */}
          <TouchableOpacity
            style={[s.logoutBtn, { backgroundColor: c.cardBg, borderColor: c.danger + "30" }]}
            onPress={handleLogout}
            disabled={loading}
            activeOpacity={0.7}>
            {loading ? (
              <ActivityIndicator color={c.danger} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={c.danger} />
                <Text style={[s.logoutText, { color: c.danger }]}>Cerrar Sesión</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[s.version, { color: c.textMuted }]}>TruckBook v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: H_PAD, paddingBottom: 48 },

  // PROFILE
  profileSection: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#fff" },
  userName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  userEmail: { fontSize: 13, marginBottom: 12 },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },

  // LIST
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: { flex: 1 },
  listLabel: { fontSize: 15, fontWeight: "500" },
  listSub: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },

  // LOGOUT
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  logoutText: { fontSize: 15, fontWeight: "600" },

  version: { fontSize: 11, textAlign: "center" },
});
