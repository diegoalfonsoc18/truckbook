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
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  cargarInvitacionesPendientes,
  responderInvitacion,
  type InvitacionPendiente,
} from "../../services/vehiculoAutorizacionService";

export default function Invitaciones() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  const cargarDatos = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await cargarInvitacionesPendientes(user.id);
    setInvitaciones(data);
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarDatos();
      setLoading(false);
    };
    init();
  }, [cargarDatos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const handleResponder = async (inv: InvitacionPendiente, aceptar: boolean) => {
    const accion = aceptar ? "Aceptar" : "Rechazar";

    Alert.alert(
      `${accion} invitación`,
      `¿${accion} acceso al vehículo ${inv.placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: accion,
          style: aceptar ? "default" : "destructive",
          onPress: async () => {
            setRespondiendo(inv.relacion_id);
            const resultado = await responderInvitacion(inv.relacion_id, aceptar);
            if (resultado.success) {
              Alert.alert(
                aceptar ? "Aceptada" : "Rechazada",
                aceptar
                  ? `Ahora tienes acceso al vehículo ${inv.placa}`
                  : `Has rechazado el acceso al vehículo ${inv.placa}`
              );
              await cargarDatos();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo procesar");
            }
            setRespondiendo(null);
          },
        },
      ]
    );
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderInvitacion = ({ item: inv }: { item: InvitacionPendiente }) => {
    const isRespondiendo = respondiendo === inv.relacion_id;

    return (
      <View style={[styles.invitacionCard, ds.cardBg, getShadow(isDark, "sm")]}>
        {/* Info vehiculo */}
        <View style={styles.cardTop}>
          <View style={styles.placaBadge}>
            <Text style={styles.placaText}>{inv.placa}</Text>
          </View>
          <Text style={[styles.tipoCamion, ds.textMuted]}>{inv.tipo_camion}</Text>
        </View>

        {/* Detalle */}
        <View style={styles.detalle}>
          <Text style={[styles.invitadoPor, ds.textSecondary]}>
            Invitado por: <Text style={[ds.text, { fontWeight: "600" }]}>{inv.invitado_por_nombre}</Text>
          </Text>
          <Text style={[styles.fecha, ds.textMuted]}>{formatFecha(inv.fecha)}</Text>
        </View>

        {/* Botones */}
        <View style={styles.botonesRow}>
          <TouchableOpacity
            style={[styles.btnRechazar, isRespondiendo && { opacity: 0.5 }]}
            onPress={() => handleResponder(inv, false)}
            disabled={isRespondiendo}>
            <Text style={styles.btnRechazarText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnAceptar, isRespondiendo && { opacity: 0.5 }]}
            onPress={() => handleResponder(inv, true)}
            disabled={isRespondiendo}>
            {isRespondiendo ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.btnAceptarText}>Aceptar</Text>
            )}
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Invitaciones</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              Solicitudes de acceso a vehículos
            </Text>
          </View>
        </View>

        <FlatList
          data={invitaciones}
          keyExtractor={(item) => item.relacion_id}
          renderItem={renderInvitacion}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyGlobal}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyTitle, ds.text]}>Sin invitaciones</Text>
              <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                No tienes invitaciones pendientes
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
  headerTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // CARD
  invitacionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "800", color: "#000", letterSpacing: 1 },
  tipoCamion: { fontSize: 13, textTransform: "capitalize" },

  detalle: { marginBottom: 14 },
  invitadoPor: { fontSize: 13, marginBottom: 4 },
  fecha: { fontSize: 11 },

  // BOTONES
  botonesRow: { flexDirection: "row", gap: 10 },
  btnRechazar: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#E9456015",
  },
  btnRechazarText: { color: "#E94560", fontSize: 14, fontWeight: "600" },
  btnAceptar: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#00D9A5",
  },
  btnAceptarText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  // EMPTY
  emptyGlobal: { alignItems: "center", padding: 40, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});
