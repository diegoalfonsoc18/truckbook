import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  cargarSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
  type SolicitudPendiente,
} from "../../services/vehiculoAutorizacionService";
import supabase from "../../config/SupaBaseConfig";

export default function SolicitudesVehiculo() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [emailsMap, setEmailsMap] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await cargarSolicitudesPendientes(user.id);
    setSolicitudes(data || []);

    // Cargar emails de conductores
    if (data?.length) {
      const ids = [...new Set(data.map((s) => s.conductor_id))];
      const emails: Record<string, string> = {};
      for (const id of ids) {
        const { data: profile } = await supabase
          .from("vehiculo_conductores")
          .select("conductor_id")
          .eq("conductor_id", id)
          .limit(1)
          .maybeSingle();
        // Try to get user info from auth (not directly accessible, use conductor_id as fallback)
        emails[id] = id.slice(0, 8) + "...";
      }
      setEmailsMap(emails);
    }
  }, [user?.id]);

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

  const handleAprobar = async (solicitud: SolicitudPendiente) => {
    Alert.alert(
      "Aprobar acceso",
      `¿Autorizar acceso al vehículo ${solicitud.vehiculo_placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aprobar",
          onPress: async () => {
            setProcesando(solicitud.id);
            const resultado = await aprobarSolicitud(solicitud.id, user!.id);
            if (resultado.success) {
              Alert.alert("Aprobado", "El conductor ya puede acceder al vehículo");
              await cargar();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo aprobar");
            }
            setProcesando(null);
          },
        },
      ]
    );
  };

  const handleRechazar = async (solicitud: SolicitudPendiente) => {
    Alert.alert(
      "Rechazar acceso",
      `¿Rechazar acceso al vehículo ${solicitud.vehiculo_placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rechazar",
          style: "destructive",
          onPress: async () => {
            setProcesando(solicitud.id);
            const resultado = await rechazarSolicitud(solicitud.id, user!.id);
            if (resultado.success) {
              Alert.alert("Rechazado", "La solicitud fue rechazada");
              await cargar();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo rechazar");
            }
            setProcesando(null);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <View style={styles.header}>
          <Text style={[styles.headerTitle, ds.text]}>Solicitudes</Text>
          <Text style={[styles.headerSubtitle, ds.textSecondary]}>
            Conductores que quieren acceder a tus vehículos
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {solicitudes.length === 0 ? (
              <View style={[styles.emptyState, ds.cardBg]}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={[styles.emptyTitle, ds.text]}>
                  Sin solicitudes pendientes
                </Text>
                <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                  Cuando un conductor solicite acceso a uno de tus vehículos,
                  aparecerá aquí
                </Text>
              </View>
            ) : (
              solicitudes.map((solicitud) => (
                <View
                  key={solicitud.id}
                  style={[
                    styles.solicitudCard,
                    ds.cardBg,
                    getShadow(isDark, "sm"),
                  ]}>
                  <View style={styles.solicitudHeader}>
                    <View style={styles.placaBadge}>
                      <Text style={styles.placaText}>
                        {solicitud.vehiculo_placa}
                      </Text>
                    </View>
                    <Text style={[styles.solicitudDate, ds.textMuted]}>
                      {formatDate(solicitud.created_at)}
                    </Text>
                  </View>

                  <View style={styles.solicitudInfo}>
                    <Text style={[styles.conductorLabel, ds.textSecondary]}>
                      Conductor
                    </Text>
                    <Text style={[styles.conductorId, ds.text]}>
                      {emailsMap[solicitud.conductor_id] ||
                        solicitud.conductor_id.slice(0, 8) + "..."}
                    </Text>
                  </View>

                  {procesando === solicitud.id ? (
                    <ActivityIndicator
                      color={colors.accent}
                      style={styles.procesando}
                    />
                  ) : (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, ds.cardBg]}
                        onPress={() => handleRechazar(solicitud)}>
                        <Text style={[styles.rejectBtnText, { color: "#E94560" }]}>
                          Rechazar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.approveBtn,
                          { backgroundColor: "#00D9A5" },
                        ]}
                        onPress={() => handleAprobar(solicitud)}>
                        <Text style={styles.approveBtnText}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  solicitudCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  solicitudHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "800", color: "#000", letterSpacing: 1 },
  solicitudDate: { fontSize: 12 },

  solicitudInfo: { marginBottom: 14 },
  conductorLabel: { fontSize: 11, textTransform: "uppercase", marginBottom: 2 },
  conductorId: { fontSize: 15, fontWeight: "600" },

  procesando: { paddingVertical: 14 },

  actions: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  rejectBtnText: { fontSize: 15, fontWeight: "600" },
  approveBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  approveBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
