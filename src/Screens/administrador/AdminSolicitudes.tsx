import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  cargarTodasSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
  type SolicitudConNombre,
} from "../../services/vehiculoAutorizacionService";

export default function AdminSolicitudes() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [solicitudes, setSolicitudes] = useState<SolicitudConNombre[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  const cargar = useCallback(async () => {
    const { data } = await cargarTodasSolicitudesPendientes();
    setSolicitudes(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargar();
      setLoading(false);
    };
    init();
  }, [cargar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const handleAprobar = (sol: SolicitudConNombre) => {
    Alert.alert(
      "Aprobar acceso",
      `¿Autorizar a ${sol.conductor_nombre} en el vehículo ${sol.vehiculo_placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            setProcesando(sol.id);
            const res = await aprobarSolicitud(sol.id, user!.id);
            if (res.success) {
              Alert.alert("Aprobado", `${sol.conductor_nombre} ya puede acceder al vehículo`);
              await cargar();
            } else {
              Alert.alert("Error", res.error || "No se pudo aprobar");
            }
            setProcesando(null);
          },
        },
      ]
    );
  };

  const handleRechazar = (sol: SolicitudConNombre) => {
    Alert.alert(
      "Rechazar acceso",
      `¿Rechazar la solicitud de ${sol.conductor_nombre} para ${sol.vehiculo_placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            setProcesando(sol.id);
            const res = await rechazarSolicitud(sol.id, user!.id);
            if (res.success) {
              Alert.alert("Rechazado", "La solicitud fue rechazada");
              await cargar();
            } else {
              Alert.alert("Error", res.error || "No se pudo rechazar");
            }
            setProcesando(null);
          },
        },
      ]
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderItem = ({ item: sol }: { item: SolicitudConNombre }) => {
    const isProc = procesando === sol.id;
    return (
      <View style={[styles.card, ds.cardBg, getShadow(isDark, "sm")]}>
        <View style={styles.cardTop}>
          <View style={styles.placaBadge}>
            <Text style={styles.placaText}>{sol.vehiculo_placa}</Text>
          </View>
          <Text style={[styles.tipoCamion, ds.textMuted]}>
            {sol.tipo_camion.charAt(0).toUpperCase() + sol.tipo_camion.slice(1)}
          </Text>
          <Text style={[styles.fecha, ds.textMuted]}>{formatDate(sol.created_at)}</Text>
        </View>

        <View style={styles.conductorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {sol.conductor_nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.conductorNombre, ds.text]}>{sol.conductor_nombre}</Text>
            {!!sol.conductor_cedula && (
              <Text style={[styles.conductorCedula, ds.textSecondary]}>
                CC: {sol.conductor_cedula}
              </Text>
            )}
          </View>
        </View>

        {isProc ? (
          <ActivityIndicator color={colors.accent} style={{ paddingVertical: 14 }} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnRechazar}
              onPress={() => handleRechazar(sol)}>
              <Ionicons name="close" size={16} color="#E94560" />
              <Text style={styles.btnRechazarText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnAprobar}
              onPress={() => handleAprobar(sol)}>
              <Ionicons name="checkmark" size={16} color="#000" />
              <Text style={styles.btnAprobarText}>Aprobar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.centered} edges={["top"]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Solicitudes</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              {solicitudes.length > 0
                ? `${solicitudes.length} solicitud${solicitudes.length > 1 ? "es" : ""} pendiente${solicitudes.length > 1 ? "s" : ""}`
                : "Accesos de conductor pendientes"}
            </Text>
          </View>
        </View>

        <FlatList
          data={solicitudes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, ds.text]}>Sin solicitudes</Text>
              <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                No hay solicitudes de acceso pendientes
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#8882",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  card: {
    borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 2, borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "800", color: "#000", letterSpacing: 1 },
  tipoCamion: { flex: 1, fontSize: 12 },
  fecha: { fontSize: 11 },

  conductorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#74B9FF20",
    justifyContent: "center", alignItems: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: "#74B9FF" },
  conductorNombre: { fontSize: 15, fontWeight: "600" },
  conductorCedula: { fontSize: 12, marginTop: 2 },

  actions: { flexDirection: "row", gap: 10 },
  btnRechazar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    borderRadius: 12, padding: 12,
    backgroundColor: "#E9456015",
  },
  btnRechazarText: { color: "#E94560", fontSize: 14, fontWeight: "600" },
  btnAprobar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    borderRadius: 12, padding: 12,
    backgroundColor: "#FFD600",
  },
  btnAprobarText: { fontSize: 14, fontWeight: "700", color: "#000" },

  emptyWrap: { alignItems: "center", padding: 40, marginTop: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
