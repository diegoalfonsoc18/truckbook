import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { useRoleStore } from "../../store/RoleStore";
import logger from "../../utils/logger";

const H_PAD = 20;

const ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  conductor:     { label: "Conductor",     color: "#111827", icon: "🚛" },
  propietario:   { label: "Propietario",   color: "#FFB800", icon: "🏢" },
  administrador: { label: "Administrador", color: "#74B9FF", icon: "⚙️" },
};

const MENU_ITEMS = [
  {
    id: "profile",
    icon: "person-outline" as const,
    label: "Mi perfil",
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
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "md");
  const role = useRoleStore((s) => s.role);

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ─── Profile data ────────────────────────────────────────────────────────
  const [profileVisible, setProfileVisible] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ─── Password change ─────────────────────────────────────────────────────
  const [securityVisible, setSecurityVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // ─── Animations ──────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-10)).current;

  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.97);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(headerY, {
        toValue: 0,
        duration: 420,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        useNativeDriver: true,
      }),
    ]).start();
    cardOpacity.value = withDelay(80, withTiming(1, { duration: 320, easing: easeOut }));
    cardScale.value   = withDelay(80, withTiming(1, { duration: 360, easing: easeOut }));
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);

      // select("*") evita errores si apellido/telefono aún no existen en la tabla
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const dbNombre   = perfil?.nombre   ?? session.user.user_metadata?.nombre ?? "";
      const dbApellido = perfil?.apellido ?? "";

      // Si apellido ya tiene valor en DB úsalo directamente.
      // Si no, el registro guardó nombre+apellido juntos en el campo nombre → dividirlos.
      if (dbApellido) {
        setNombre(dbNombre);
        setApellido(dbApellido);
      } else if (dbNombre.trim().includes(" ")) {
        const parts = dbNombre.trim().split(/\s+/);
        setNombre(parts[0]);
        setApellido(parts.slice(1).join(" "));
      } else {
        setNombre(dbNombre);
        setApellido("");
      }
      setTelefono(perfil?.telefono ?? "");
    } catch (error) {
      logger.error("Error cargando usuario:", error);
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await supabase
                .from("usuarios")
                .update({ push_token: null })
                .eq("user_id", session.user.id);
            }
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert("Error", error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ─── Profile modal ────────────────────────────────────────────────────────
  const openProfile = () => setProfileVisible(true);

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      Alert.alert("Campo requerido", "El nombre no puede estar vacío.");
      return;
    }
    setSavingProfile(true);
    try {
      // Construir el objeto de actualización solo con los campos que tienen valor
      // (apellido y telefono requieren que existan esas columnas en la tabla usuarios)
      const updatePayload: Record<string, string> = { nombre: nombre.trim() };
      if (apellido.trim())  updatePayload.apellido  = apellido.trim();
      if (telefono.trim())  updatePayload.telefono  = telefono.trim();

      const { error: dbErr } = await supabase
        .from("usuarios")
        .update(updatePayload)
        .eq("user_id", user.id);

      if (dbErr) throw dbErr;

      // Keep user_metadata in sync
      await supabase.auth.updateUser({
        data: { nombre: nombre.trim(), apellido: apellido.trim() },
      });

      setProfileVisible(false);
      Alert.alert("Listo", "Tu perfil fue actualizado.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Security modal ───────────────────────────────────────────────────────
  const openSecurity = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setSecurityVisible(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Campo requerido", "Ingresa tu contraseña actual.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Contraseña muy corta", "La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("No coinciden", "La nueva contraseña y la confirmación no son iguales.");
      return;
    }
    setSavingPassword(true);
    try {
      // Step 1: verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        Alert.alert("Contraseña incorrecta", "La contraseña actual que ingresaste no es correcta.");
        return;
      }

      // Step 2: update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setSecurityVisible(false);
        Alert.alert("Listo", "Tu contraseña fue actualizada correctamente.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo actualizar.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleItemPress = (id: string) => {
    if (id === "profile")  return openProfile();
    if (id === "security") return openSecurity();
    Alert.alert("En desarrollo", "Disponible próximamente.");
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const roleMeta = ROLE_META[role ?? "conductor"] ?? ROLE_META.conductor;
  const displayName = [nombre, apellido].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] || "Usuario";
  const userInitial = nombre
    ? nombre.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? "U");

  const card = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg,
    borderRadius: 20,
    ...(isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {}),
    ...shadow,
  };

  const inputBg = isDark ? "rgba(255,255,255,0.06)" : c.surface;

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        {/* HEADER */}
        <Animated.View style={[s.header, { transform: [{ translateY: headerY }] }]}>
          <Text style={[s.headerTitle, { color: c.text }]}>Cuenta</Text>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* PROFILE CARD */}
            <Reanimated.View
              style={[
                s.profileCard,
                cardStyle,
                { backgroundColor: isDark ? `${roleMeta.color}14` : c.cardBg },
                isDark ? { borderWidth: 1, borderColor: `${roleMeta.color}33` } : shadow,
              ]}>
              <View style={[s.avatarRing, { borderColor: `${roleMeta.color}40` }]}>
                <View style={[s.avatar, { backgroundColor: roleMeta.color }]}>
                  <Text style={s.avatarText}>{userInitial}</Text>
                </View>
              </View>
              <Text style={[s.userName, { color: c.text }]}>{displayName}</Text>
              <Text style={[s.userEmail, { color: c.textSecondary }]}>{user?.email || ""}</Text>
            </Reanimated.View>

            {/* CONFIGURACIÓN */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Configuración</Text>

            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, card]}
                onPress={() => handleItemPress(item.id)}
                activeOpacity={0.7}>
                <View style={[s.menuIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}>
                  <Ionicons name={item.icon} size={18} color={c.textSecondary} />
                </View>
                <View style={s.menuInfo}>
                  <Text style={[s.menuLabel, { color: c.text }]}>{item.label}</Text>
                  <Text style={[s.menuSub, { color: c.textMuted }]}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              </TouchableOpacity>
            ))}

            {/* LOGOUT */}
            <TouchableOpacity
              style={[s.logoutBtn, card, { borderColor: `${c.danger}30`, borderWidth: 1 }]}
              onPress={handleLogout}
              disabled={loading}
              activeOpacity={0.7}>
              {loading ? (
                <ActivityIndicator color={c.danger} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color={c.danger} />
                  <Text style={[s.logoutText, { color: c.danger }]}>Cerrar sesión</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[s.version, { color: c.textMuted }]}>TruckBook v1.0.0</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* ═══════════════════════════════════════════════════════
          MI PERFIL MODAL
      ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={profileVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProfileVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setProfileVisible(false)} />
          <View style={[s.modalSheet, { backgroundColor: c.cardBg, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />

            <View style={s.modalHeader}>
              <View style={[s.modalIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}>
                <Ionicons name="person-outline" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: c.text }]}>Mi perfil</Text>
                <Text style={[s.modalSubtitle, { color: c.textMuted }]}>Datos personales</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileVisible(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Email — solo lectura */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Correo electrónico</Text>
            <View style={[s.inputRow, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6", borderColor: c.border, opacity: 0.7 }]}>
              <Ionicons name="mail-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
              <Text style={[s.input, { color: c.textMuted, paddingVertical: 2 }]} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
              <Ionicons name="lock-closed" size={14} color={c.textMuted} />
            </View>

            {/* Nombre */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Nombre</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Tu nombre"
                placeholderTextColor={c.textMuted}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
            </View>

            {/* Apellido */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Apellido</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Tu apellido"
                placeholderTextColor={c.textMuted}
                value={apellido}
                onChangeText={setApellido}
                autoCapitalize="words"
              />
            </View>

            {/* Teléfono */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Teléfono</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Número de teléfono"
                placeholderTextColor={c.textMuted}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: c.accent, opacity: savingProfile ? 0.7 : 1 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.8}>
              {savingProfile ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.saveBtnText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          SEGURIDAD MODAL
      ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={securityVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSecurityVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setSecurityVisible(false)} />
          <View style={[s.modalSheet, { backgroundColor: c.cardBg, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />

            <View style={s.modalHeader}>
              <View style={[s.modalIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}>
                <Ionicons name="lock-closed-outline" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: c.text }]}>Cambiar contraseña</Text>
                <Text style={[s.modalSubtitle, { color: c.textMuted }]}>Mínimo 8 caracteres</Text>
              </View>
              <TouchableOpacity onPress={() => setSecurityVisible(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Contraseña actual */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Contraseña actual</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={10}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Separador visual */}
            <View style={[s.divider, { backgroundColor: c.border }]} />

            {/* Nueva contraseña */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Nueva contraseña</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={10}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Confirmar contraseña */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>Confirmar contraseña</Text>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: c.border }]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: c.accent, opacity: savingPassword ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={savingPassword}
              activeOpacity={0.8}>
              {savingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.saveBtnText}>Actualizar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },

  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 6,
    paddingBottom: 110,
  },

  // PROFILE CARD
  profileCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  userName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginBottom: 4 },
  userEmail: { fontSize: 13, fontWeight: "400", marginBottom: 14 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "700" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 12,
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  menuSub: { fontSize: 12 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginBottom: 20,
    marginHorizontal: 2,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  version: { fontSize: 11, textAlign: "center" },

  // ── MODAL SHARED ──
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 12, marginTop: 2 },

  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, letterSpacing: 0.2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  input: { flex: 1, fontSize: 15 },

  divider: { height: 1, marginBottom: 16 },

  saveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
