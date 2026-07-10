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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import logger from "../../utils/logger";
import { sanitizeText, sanitizePassword, sanitizePhone } from "../../utils/sanitize";

const H_PAD = 20;

const AVATAR_COLOR = "#111827";

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

const LEGAL_ITEMS = [
  {
    id: "terms",
    icon: "document-text-outline" as const,
    label: "Términos y condiciones",
    subtitle: "Condiciones de uso de la app",
  },
  {
    id: "privacy",
    icon: "shield-checkmark-outline" as const,
    label: "Política de privacidad",
    subtitle: "Tratamiento de tu información",
  },
  {
    id: "dataauth",
    icon: "finger-print-outline" as const,
    label: "Autorización de datos personales",
    subtitle: "Ley 1581 de 2012 — Habeas Data",
  },
];

type LegalDoc = "terms" | "privacy" | "dataauth";

const LEGAL_CONTENT: Record<LegalDoc, { title: string; body: string }> = {
  terms: {
    title: "Términos y condiciones",
    body: `TÉRMINOS Y CONDICIONES DE USO — TRUCKBOOK
Última actualización: mayo 2025

1. ACEPTACIÓN
Al descargar, instalar o usar la aplicación TruckBook, el usuario acepta quedar vinculado por los presentes Términos y Condiciones. Si no está de acuerdo, deberá abstenerse de usar la aplicación.

2. OBJETO
TruckBook es una plataforma móvil de gestión de flotas de transporte de carga que permite registrar vehículos, conductores, gastos, ingresos y reportes operativos.

3. REGISTRO Y CUENTA
El usuario debe proporcionar información veraz y actualizada al crear su cuenta. Es responsable de mantener la confidencialidad de sus credenciales de acceso.

4. USO PERMITIDO
El usuario se compromete a usar la aplicación únicamente para fines lícitos relacionados con la gestión de su actividad de transporte de carga, conforme a la normativa colombiana vigente.

5. PROPIEDAD INTELECTUAL
Todos los derechos de propiedad intelectual sobre TruckBook, incluyendo marca, software, diseño y contenidos, son propiedad exclusiva del desarrollador.

6. LIMITACIÓN DE RESPONSABILIDAD
TruckBook no se responsabiliza por decisiones operativas tomadas con base en la información registrada en la plataforma. Los datos ingresados son responsabilidad exclusiva del usuario.

7. MODIFICACIONES
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la aplicación.

8. LEY APLICABLE
Estos términos se rigen por las leyes de la República de Colombia. Para cualquier controversia, las partes se someten a los jueces y tribunales de la ciudad de Bogotá D.C.

Contacto: truckbookco@gmail.com`,
  },
  privacy: {
    title: "Política de privacidad",
    body: `POLÍTICA DE PRIVACIDAD — TRUCKBOOK
Última actualización: mayo 2025

1. RESPONSABLE DEL TRATAMIENTO
TruckBook, con domicilio en la República de Colombia, es el responsable del tratamiento de los datos personales recolectados a través de esta aplicación.

2. DATOS QUE RECOLECTAMOS
• Datos de identificación: nombre, apellido, cédula, correo electrónico.
• Datos de operación: vehículos, rutas, gastos e ingresos registrados.
• Datos técnicos: token de notificaciones push, información del dispositivo.

3. FINALIDAD DEL TRATAMIENTO
Los datos se utilizan para:
• Gestionar el acceso y funcionamiento de la cuenta del usuario.
• Enviar notificaciones relacionadas con la operación de la flota.
• Generar reportes internos de gestión.
• Mejorar la experiencia y funcionalidades de la aplicación.

4. BASE LEGAL
El tratamiento se realiza con base en el consentimiento del titular, de conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013.

5. DERECHOS DEL TITULAR
De acuerdo con la Ley Estatutaria 1581 de 2012, el titular tiene derecho a:
• Conocer, actualizar y rectificar sus datos personales.
• Solicitar prueba de la autorización otorgada.
• Ser informado sobre el uso de sus datos.
• Presentar quejas ante la Superintendencia de Industria y Comercio.
• Revocar la autorización y solicitar la supresión de sus datos.

6. SEGURIDAD
Implementamos medidas técnicas y administrativas para proteger los datos contra acceso no autorizado, pérdida o divulgación.

7. TRANSFERENCIA A TERCEROS
Los datos no serán vendidos ni compartidos con terceros, salvo obligación legal o cuando sea necesario para la prestación del servicio (ej. proveedor de infraestructura en la nube).

8. CONTACTO
Para ejercer sus derechos o consultas: truckbookco@gmail.com`,
  },
  dataauth: {
    title: "Autorización de datos personales",
    body: `AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES
Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013

Yo, el usuario titular, en calidad de persona natural, mediante la aceptación de esta autorización al momento del registro en TruckBook, manifiesto de manera libre, expresa, inequívoca e informada que:

AUTORIZO a TruckBook para recolectar, almacenar, usar, circular, suprimir, procesar y en general, tratar mis datos personales, de conformidad con la Política de Privacidad de la aplicación, para las siguientes finalidades:

1. Crear y gestionar mi cuenta de usuario en la plataforma.
2. Enviar notificaciones push relacionadas con la actividad de mi flota.
3. Generar reportes operativos de gastos, ingresos y gestión vehicular.
4. Mejorar los servicios y funcionalidades de la aplicación.
5. Cumplir con obligaciones legales aplicables.

DATOS AUTORIZADOS PARA TRATAMIENTO:
• Nombre completo y apellidos.
• Número de cédula de ciudadanía.
• Dirección de correo electrónico.
• Número de teléfono.
• Información de vehículos y actividad operativa.
• Token de notificaciones del dispositivo móvil.

DERECHOS QUE ME ASISTEN:
Como titular tengo derecho a conocer, actualizar, rectificar y suprimir mis datos, así como a revocar esta autorización en cualquier momento, enviando una solicitud a truckbookco@gmail.com.

Esta autorización fue otorgada al momento de crear mi cuenta en TruckBook y constituye mi consentimiento expreso conforme a la normativa colombiana de protección de datos personales.

Responsable del tratamiento: TruckBook
Contacto del responsable: truckbookco@gmail.com
Superintendencia de Industria y Comercio: www.sic.gov.co`,
  },
};

export default function Cuenta() {
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "md");
  const placa = useVehiculoStore((s) => s.placa);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ─── Profile data ────────────────────────────────────────────────────────
  const [profileVisible, setProfileVisible] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ─── Legal modal ─────────────────────────────────────────────────────────
  const [legalVisible, setLegalVisible] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc>("terms");

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
    cardOpacity.value = withDelay(
      80,
      withTiming(1, { duration: 320, easing: easeOut }),
    );
    cardScale.value = withDelay(
      80,
      withTiming(1, { duration: 360, easing: easeOut }),
    );
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUser(session.user);

      // select("*") evita errores si apellido/telefono aún no existen en la tabla
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const meta = session.user.user_metadata ?? {};
      const nombreDB = perfil?.nombre ?? meta.nombre ?? "";
      const apellidoMeta = meta.apellido ?? "";

      if (apellidoMeta) {
        setNombre(nombreDB);
        setApellido(apellidoMeta);
      } else if (nombreDB.trim().includes(" ")) {
        const partes = nombreDB.trim().split(/\s+/);
        setNombre(partes[0]);
        setApellido(partes.slice(1).join(" "));
      } else {
        setNombre(nombreDB);
        setApellido("");
      }
      // telefono vive en user_metadata — la tabla usuarios no tiene esa columna
      setTelefono(meta.telefono ?? "");
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
            const {
              data: { session },
            } = await supabase.auth.getSession();
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
    if (!user?.id) {
      Alert.alert("Error", "No se pudo identificar tu sesión. Intenta de nuevo.");
      return;
    }
    setSavingProfile(true);
    try {
      const sanitize = (s: string) => s.replace(/[<>{}]/g, "").trim().slice(0, 100);
      const nombreSafe = sanitize(nombre);
      const apellidoSafe = sanitize(apellido);
      const telSafe = telefono.replace(/[^0-9+\- ]/g, "").trim().slice(0, 20);

      // La tabla usuarios solo tiene nombre; apellido y telefono van en user_metadata
      const { error: dbErr } = await supabase
        .from("usuarios")
        .update({ nombre: nombreSafe })
        .eq("user_id", user.id);

      if (dbErr) throw dbErr;

      const { error: authErr } = await supabase.auth.updateUser({
        data: { nombre: nombreSafe, apellido: apellidoSafe, telefono: telSafe },
      });
      if (authErr) throw authErr;

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
      Alert.alert(
        "Contraseña muy corta",
        "La nueva contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        "No coinciden",
        "La nueva contraseña y la confirmación no son iguales.",
      );
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
        Alert.alert(
          "Contraseña incorrecta",
          "La contraseña actual que ingresaste no es correcta.",
        );
        return;
      }

      // Step 2: update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
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

  const openLegal = (doc: LegalDoc) => {
    setLegalDoc(doc);
    setLegalVisible(true);
  };

  const handleResetDatos = () => {
    if (!placa) {
      Alert.alert("Sin vehículo", "No hay un vehículo seleccionado.");
      return;
    }
    Alert.alert(
      "⚠️ Reiniciar mis datos del vehículo",
      `Se eliminarán TODOS tus registros de gastos e ingresos en el vehículo ${placa}.\n\nLos datos de otros conductores del mismo vehículo no serán afectados.\n\nEsta acción es permanente y no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "¿Estás seguro?",
              "Confirma que deseas borrar permanentemente todos los datos de este vehículo.",
              [
                { text: "No, cancelar", style: "cancel" },
                {
                  text: "Sí, borrar todo",
                  style: "destructive",
                  onPress: async () => {
                    setResetLoading(true);
                    try {
                      const userId = user?.id;
                      if (!userId) throw new Error("Sin sesión");
                      const [gastosRes, ingresosRes] = await Promise.all([
                        supabase
                          .from("conductor_gastos")
                          .delete()
                          .eq("placa", placa)
                          .eq("conductor_id", userId),
                        supabase
                          .from("conductor_ingresos")
                          .delete()
                          .eq("placa", placa)
                          .eq("conductor_id", userId),
                      ]);
                      if (gastosRes.error) throw gastosRes.error;
                      if (ingresosRes.error) throw ingresosRes.error;
                      // Limpiar del caché solo la placa borrada — no los demás vehículos
                      const { gastos, setGastos } = useGastosStore.getState();
                      setGastos(gastos.filter((g) => g.placa !== placa));
                      const { ingresos, setIngresos } = useIngresosStore.getState();
                      setIngresos(ingresos.filter((i) => i.placa !== placa));
                      Alert.alert(
                        "Listo",
                        `Todos los registros del vehículo ${placa} fueron eliminados.`,
                      );
                    } catch (e: any) {
                      logger.error("❌ Error al reiniciar datos:", e?.message ?? e);
                      Alert.alert(
                        "Error",
                        "No se pudieron eliminar los datos. Intenta de nuevo.",
                      );
                    } finally {
                      setResetLoading(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleEliminarCuenta = () => {
    Alert.alert(
      "⚠️ Eliminar cuenta",
      "Se anonimizarán de forma irreversible tu nombre, correo y datos personales. El historial de gastos e ingresos del vehículo se conserva para no afectar a otros conductores.\n\nEsta acción NO se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "¿Estás completamente seguro?",
              "Tus datos personales serán eliminados de forma permanente e irreversible.",
              [
                { text: "No, mantener mi cuenta", style: "cancel" },
                {
                  text: "Sí, eliminar mi cuenta",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const userId = user?.id;
                      if (!userId) throw new Error("Sin sesión");

                      // Anonimizar datos personales de forma irreversible.
                      // No se borran filas para no romper FKs en gastos/ingresos/vehículos.
                      // Solo columnas que existen en usuarios — incluir una inexistente
                      // (p. ej. telefono) hace fallar todo el update con 42703.
                      const { error: anonError } = await supabase
                        .from("usuarios")
                        .update({
                          nombre: "Usuario eliminado",
                          email: `deleted_${userId}@deleted.truckbook`,
                          push_token: null,
                          deleted: true,
                          deleted_at: new Date().toISOString(),
                        })
                        .eq("user_id", userId);

                      if (anonError) throw anonError;

                      // Limpiar también los datos personales de user_metadata
                      // (best-effort: la anonimización en DB ya quedó hecha)
                      await supabase.auth.updateUser({
                        data: { nombre: null, apellido: null, telefono: null },
                      });

                      await supabase.auth.signOut();
                    } catch (e: any) {
                      logger.error("❌ Error al eliminar cuenta:", e?.message ?? e);
                      Alert.alert("Error", "No se pudo eliminar la cuenta. Intenta de nuevo.");
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleItemPress = (id: string) => {
    if (id === "profile") return openProfile();
    if (id === "security") return openSecurity();
    if (id === "privacy") {
      // URL centralizada — cambiar aquí si se migra el dominio
      Linking.openURL("https://diegoalfonsoc18.github.io/truckbook/privacy-policy.html").catch(() =>
        openLegal("privacy")
      );
      return;
    }
    if (id === "terms" || id === "dataauth")
      return openLegal(id as LegalDoc);
    if (id === "help") {
      Linking.openURL("mailto:truckbookco@gmail.com?subject=Ayuda%20TruckBook").catch(() =>
        Alert.alert("Soporte", "Escríbenos a truckbookco@gmail.com")
      );
      return;
    }
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const displayName =
    [nombre, apellido].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const userInitial = nombre
    ? nombre.charAt(0).toUpperCase()
    : (user?.email?.charAt(0).toUpperCase() ?? "U");

  const card = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg,
    borderRadius: 20,
    ...(isDark
      ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }
      : {}),
    ...shadow,
  };

  const inputBg = isDark ? "rgba(255,255,255,0.06)" : c.surface;

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        {/* HEADER */}
        <Animated.View
          style={[s.header, { transform: [{ translateY: headerY }] }]}>
          <Text style={[s.headerTitle, { color: c.text }]}>Cuenta</Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* PROFILE CARD */}
            <Reanimated.View
              style={[
                s.profileCard,
                cardStyle,
                { backgroundColor: isDark ? `${AVATAR_COLOR}14` : c.cardBg },
                isDark
                  ? { borderWidth: 1, borderColor: `${AVATAR_COLOR}33` }
                  : shadow,
              ]}>
              <View
                style={[s.avatarRing, { borderColor: `${AVATAR_COLOR}40` }]}>
                <View style={[s.avatar, { backgroundColor: AVATAR_COLOR }]}>
                  <Text style={s.avatarText}>{userInitial}</Text>
                </View>
              </View>
              <Text style={[s.userName, { color: c.text }]}>{displayName}</Text>
              <Text style={[s.userEmail, { color: c.textSecondary }]}>
                {user?.email || ""}
              </Text>
            </Reanimated.View>

            {/* CONFIGURACIÓN */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>
              Configuración
            </Text>

            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, card]}
                onPress={() => handleItemPress(item.id)}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.menuIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : c.surface,
                    },
                  ]}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color="#0F172A"
                  />
                </View>
                <View style={s.menuInfo}>
                  <Text style={[s.menuLabel, { color: c.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.menuSub, { color: c.textMuted }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            ))}

            {/* LEGAL */}
            <Text
              style={[
                s.sectionLabel,
                { color: c.textSecondary, marginTop: 8 },
              ]}>
              Más información
            </Text>

            {LEGAL_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[s.menuRow, card]}
                onPress={() => handleItemPress(item.id)}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.menuIconWrap,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : c.surface,
                    },
                  ]}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color="#0F172A"
                  />
                </View>
                <View style={s.menuInfo}>
                  <Text style={[s.menuLabel, { color: c.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[s.menuSub, { color: c.textMuted }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            ))}

            {/* ZONA DE PELIGRO */}
            {placa ? (
              <>
                <Text
                  style={[
                    s.sectionLabel,
                    { color: c.textSecondary, marginTop: 8 },
                  ]}>
                  Zona de peligro
                </Text>
                <TouchableOpacity
                  style={[
                    s.menuRow,
                    card,
                    {
                      borderColor: `${c.danger}40`,
                      borderWidth: 1,
                      backgroundColor: isDark
                        ? `${c.danger}18`
                        : `${c.danger}10`,
                      // En Android, elevation crea superficie opaca que aplana el rojo
                      elevation: 0,
                      shadowOpacity: 0,
                    },
                  ]}
                  onPress={handleResetDatos}
                  disabled={resetLoading}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      s.menuIconWrap,
                      { backgroundColor: `${c.danger}18` },
                    ]}>
                    {resetLoading ? (
                      <ActivityIndicator size="small" color={c.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={c.danger} />
                    )}
                  </View>
                  <View style={s.menuInfo}>
                    <Text style={[s.menuLabel, { color: c.danger }]}>
                      Reiniciar datos del vehículo
                    </Text>
                    <Text style={[s.menuSub, { color: c.textMuted }]}>
                      Elimina todos los gastos e ingresos de {placa}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={`${c.danger}60`}
                  />
                </TouchableOpacity>
              </>
            ) : null}

            {/* ELIMINAR CUENTA */}
            {!placa ? (
              <Text style={[s.sectionLabel, { color: c.textSecondary, marginTop: 8 }]}>
                Zona de peligro
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                s.menuRow,
                card,
                {
                  borderColor: `${c.danger}40`,
                  borderWidth: 1,
                  backgroundColor: isDark ? `${c.danger}18` : `${c.danger}10`,
                  marginTop: 8,
                  elevation: 0,
                  shadowOpacity: 0,
                },
              ]}
              onPress={handleEliminarCuenta}
              activeOpacity={0.7}>
              <View style={[s.menuIconWrap, { backgroundColor: `${c.danger}18` }]}>
                <Ionicons name="person-remove-outline" size={18} color={c.danger} />
              </View>
              <View style={s.menuInfo}>
                <Text style={[s.menuLabel, { color: c.danger }]}>Eliminar cuenta</Text>
                <Text style={[s.menuSub, { color: c.textMuted }]}>
                  Borra permanentemente tu cuenta y todos tus datos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={`${c.danger}60`} />
            </TouchableOpacity>

            {/* LOGOUT */}
            <TouchableOpacity
              style={[
                s.logoutBtn,
                card,
                {
                  borderColor: `${c.danger}30`,
                  borderWidth: 1,
                  marginTop: 8,
                  elevation: 0,
                  shadowOpacity: 0,
                },
              ]}
              onPress={handleLogout}
              disabled={loading}
              activeOpacity={0.7}>
              {loading ? (
                <ActivityIndicator color={c.danger} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color={c.danger} />
                  <Text style={[s.logoutText, { color: c.danger }]}>
                    Cerrar sesión
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[s.version, { color: c.textMuted }]}>
              TruckBook v{Constants.expoConfig?.version ?? "1.0.2"}
            </Text>
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
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setProfileVisible(false)}
          />
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: c.cardBg,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border,
              },
            ]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />

            <View style={s.modalHeader}>
              <View
                style={[
                  s.modalIconWrap,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : c.surface,
                  },
                ]}>
                <Ionicons name="person-outline" size={20} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: c.text }]}>Mi perfil</Text>
                <Text style={[s.modalSubtitle, { color: c.textMuted }]}>
                  Datos personales
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProfileVisible(false)}
                hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Email — solo lectura */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Correo electrónico
            </Text>
            <View
              style={[
                s.inputRow,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "#f3f4f6",
                  borderColor: c.border,
                  opacity: 0.7,
                },
              ]}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={c.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[s.input, { color: c.textMuted, paddingVertical: 2 }]}
                numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
              <Ionicons name="lock-closed" size={14} color={c.textMuted} />
            </View>

            {/* Nombre */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Nombre
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Tu nombre"
                placeholderTextColor={c.textMuted}
                value={nombre}
                onChangeText={(t) => setNombre(sanitizeText(t))}
                autoCapitalize="words"
              />
            </View>

            {/* Apellido */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Apellido
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Tu apellido"
                placeholderTextColor={c.textMuted}
                value={apellido}
                onChangeText={(t) => setApellido(sanitizeText(t))}
                autoCapitalize="words"
              />
            </View>

            {/* Teléfono */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Teléfono
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Número de teléfono"
                placeholderTextColor={c.textMuted}
                value={telefono}
                onChangeText={(t) => setTelefono(sanitizePhone(t))}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[
                s.saveBtn,
                { backgroundColor: c.accent, opacity: savingProfile ? 0.7 : 1 },
              ]}
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
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setSecurityVisible(false)}
          />
          <View
            style={[
              s.modalSheet,
              {
                backgroundColor: c.cardBg,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border,
              },
            ]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />

            <View style={s.modalHeader}>
              <View
                style={[
                  s.modalIconWrap,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : c.surface,
                  },
                ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#0F172A"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: c.text }]}>
                  Cambiar contraseña
                </Text>
                <Text style={[s.modalSubtitle, { color: c.textMuted }]}>
                  Mínimo 8 caracteres
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSecurityVisible(false)}
                hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Contraseña actual */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Contraseña actual
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={(t) => setCurrentPassword(sanitizePassword(t))}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                hitSlop={10}>
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Separador visual */}
            <View style={[s.divider, { backgroundColor: c.border }]} />

            {/* Nueva contraseña */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Nueva contraseña
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(t) => setNewPassword(sanitizePassword(t))}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                hitSlop={10}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Confirmar contraseña */}
            <Text style={[s.inputLabel, { color: c.textSecondary }]}>
              Confirmar contraseña
            </Text>
            <View
              style={[
                s.inputRow,
                { backgroundColor: inputBg, borderColor: c.border },
              ]}>
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={(t) => setConfirmPassword(sanitizePassword(t))}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={10}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                s.saveBtn,
                {
                  backgroundColor: c.accent,
                  opacity: savingPassword ? 0.7 : 1,
                },
              ]}
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
      {/* ═══════════════════════════════════════════════════════
          LEGAL MODAL
      ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={legalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLegalVisible(false)}>
        <View style={s.modalOverlay}>
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setLegalVisible(false)}
          />
          <View
            style={[
              s.legalSheet,
              {
                backgroundColor: c.cardBg,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border,
              },
            ]}>
            <View style={[s.modalHandle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={s.legalHeader}>
              <Text
                style={[s.modalTitle, { color: c.text, flex: 1 }]}
                numberOfLines={2}>
                {LEGAL_CONTENT[legalDoc].title}
              </Text>
              <TouchableOpacity
                onPress={() => setLegalVisible(false)}
                hitSlop={12}>
                <Ionicons name="close-circle" size={24} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Contenido con scroll */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.legalBody}>
              <Text style={[s.legalText, { color: c.textSecondary }]}>
                {LEGAL_CONTENT[legalDoc].body}
              </Text>
            </ScrollView>
          </View>
        </View>
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
  userName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  userEmail: { fontSize: 13, fontWeight: "400", marginBottom: 14 },

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
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
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

  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
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

  saveBtn: {
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // LEGAL MODAL
  legalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  legalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  legalBody: {
    paddingBottom: 48,
  },
  legalText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
