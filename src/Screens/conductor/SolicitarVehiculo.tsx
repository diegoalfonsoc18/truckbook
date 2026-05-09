import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { solicitarAccesoVehiculo } from "../../services/vehiculoAutorizacionService";
import supabase from "../../config/SupaBaseConfig";

const DELETE_WIDTH = 80;

function DeleteAction({ prog }: { prog: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: DELETE_WIDTH * (1 - prog.value) }],
  }));
  return (
    <Reanimated.View style={[styles.deleteAction, style]}>
      <Ionicons name="trash-outline" size={22} color="#FFF" />
      <Text style={styles.deleteText}>Borrar</Text>
    </Reanimated.View>
  );
}

interface MiSolicitud {
  id: string;
  vehiculo_placa: string;
  tipo_camion: string;
  estado: "pendiente" | "autorizado" | "rechazado";
  created_at: string;
}

export default function SolicitarVehiculo() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { placa: placaActual, setPlaca: setPlacaStore, setTipoCamion, clearVehiculo } = useVehiculoStore();

  const [placa, setPlaca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudes, setSolicitudes] = useState<MiSolicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    inputBg: { backgroundColor: isDark ? "#252540" : "#F0F0F5" },
  };

  // Ref para detectar cambios: estado + placa de cada relación conocida
  const estadosPrevios = useRef<Record<string, { estado: string; placa: string }>>({});
  // Ref para que el polling no use placa stale en closure
  const placaActualRef = useRef(placaActual);
  useEffect(() => { placaActualRef.current = placaActual; }, [placaActual]);

  const cargarSolicitudes = useCallback(async (silencioso = false) => {
    if (!user?.id) return;

    // Cargar mis relaciones como conductor (excluyendo propietario)
    const { data: relaciones, error } = await supabase
      .from("vehiculo_conductores")
      .select("id, vehiculo_placa, estado, created_at")
      .eq("conductor_id", user.id)
      .eq("rol", "conductor")
      .order("created_at", { ascending: false });

    if (error || !relaciones?.length) {
      // Si es polling silencioso, verificar si el activo fue eliminado
      if (silencioso) {
        const placaActiva = placaActualRef.current;
        if (placaActiva) {
          const prevActivo = Object.values(estadosPrevios.current)
            .find((p) => p.placa === placaActiva && p.estado === "autorizado");
          if (prevActivo) {
            clearVehiculo();
            Alert.alert(
              "Acceso eliminado",
              `Tu acceso a ${placaActiva} fue eliminado por el administrador.`,
              [{ text: "OK" }]
            );
          }
        }
      }
      estadosPrevios.current = {};
      setSolicitudes([]);
      return;
    }

    // Cargar tipo_camion de los vehículos en batch
    const placas = relaciones.map((r) => r.vehiculo_placa);
    const { data: vehiculos } = await supabase
      .from("vehiculos")
      .select("placa, tipo_camion")
      .in("placa", placas);

    const vehiculosMap: Record<string, string> = {};
    for (const v of vehiculos || []) {
      vehiculosMap[v.placa] = v.tipo_camion || "estacas";
    }

    const nuevasSolicitudes: MiSolicitud[] = relaciones.map((r) => ({
      id: r.id,
      vehiculo_placa: r.vehiculo_placa,
      tipo_camion: vehiculosMap[r.vehiculo_placa] || "estacas",
      estado: r.estado,
      created_at: r.created_at,
    }));

    setSolicitudes(nuevasSolicitudes);

    if (silencioso) {
      const placaActiva = placaActualRef.current;
      const nuevosIds = new Set(nuevasSolicitudes.map((s) => s.id));

      // 1) Detectar relaciones eliminadas (id desapareció)
      for (const [id, prev] of Object.entries(estadosPrevios.current)) {
        if (!nuevosIds.has(id) && prev.estado === "autorizado" && placaActiva === prev.placa) {
          clearVehiculo();
          Alert.alert(
            "Acceso eliminado",
            `Tu acceso a ${prev.placa} fue eliminado por el administrador.`,
            [{ text: "OK" }]
          );
        }
      }

      // 2) Detectar cambios de estado
      for (const sol of nuevasSolicitudes) {
        const prev = estadosPrevios.current[sol.id];
        if (!prev) continue;

        if (prev.estado === "pendiente" && sol.estado === "autorizado") {
          // Auto-activar el vehículo
          await setPlacaStore(sol.vehiculo_placa);
          setTipoCamion(sol.tipo_camion as TipoCamion);
          Alert.alert(
            "¡Acceso aprobado! ✓",
            `${sol.vehiculo_placa} fue autorizado y está listo para usar.`,
            [{ text: "OK" }]
          );
        } else if (prev.estado === "autorizado" && sol.estado === "rechazado" && placaActiva === sol.vehiculo_placa) {
          // El vehículo activo fue revocado
          clearVehiculo();
          Alert.alert(
            "Acceso revocado",
            `Tu acceso a ${sol.vehiculo_placa} fue revocado por el administrador.`,
            [{ text: "OK" }]
          );
        }
      }
    }

    // Actualizar estados previos
    const nuevosEstados: Record<string, { estado: string; placa: string }> = {};
    for (const sol of nuevasSolicitudes) {
      nuevosEstados[sol.id] = { estado: sol.estado, placa: sol.vehiculo_placa };
    }
    estadosPrevios.current = nuevosEstados;
  }, [user?.id, setPlacaStore, setTipoCamion, clearVehiculo]);

  // Carga inicial
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarSolicitudes(false);
      setLoading(false);
    };
    init();
  }, [cargarSolicitudes]);

  // Polling automático cada 8 segundos mientras la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      const intervalo = setInterval(() => {
        cargarSolicitudes(true);
      }, 8000);

      return () => clearInterval(intervalo);
    }, [cargarSolicitudes])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarSolicitudes();
    setRefreshing(false);
  };

  const handleActivar = async (item: MiSolicitud) => {
    await setPlacaStore(item.vehiculo_placa);
    setTipoCamion(item.tipo_camion as TipoCamion);
    Alert.alert(
      "Vehículo activado ✓",
      `${item.vehiculo_placa} es ahora tu vehículo activo.`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

  const handleEliminar = (item: MiSolicitud) => {
    Alert.alert(
      "Eliminar solicitud",
      `¿Eliminar la solicitud para ${item.vehiculo_placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("vehiculo_conductores")
              .delete()
              .eq("id", item.id);
            if (!error) {
              setSolicitudes((prev) => prev.filter((s) => s.id !== item.id));
            } else {
              Alert.alert("Error", "No se pudo eliminar la solicitud");
            }
          },
        },
      ]
    );
  };

  const handleSolicitar = async () => {
    const placaLimpia = placa.trim().toUpperCase().replace(/\s/g, "");
    if (!placaLimpia) {
      Alert.alert("Placa requerida", "Ingresa la placa del vehículo");
      return;
    }
    if (!user?.id) return;

    Keyboard.dismiss();
    setEnviando(true);

    const resultado = await solicitarAccesoVehiculo(user.id, placaLimpia);

    setEnviando(false);

    if (resultado.success) {
      setPlaca("");
      Alert.alert(
        "Solicitud enviada ✓",
        `Tu solicitud para el vehículo ${placaLimpia} fue enviada. El propietario o administrador debe aprobarla.`,
        [{ text: "Entendido" }]
      );
      await cargarSolicitudes();
    } else {
      Alert.alert("No se pudo enviar", resultado.error || "Intenta de nuevo");
    }
  };

  const estadoConfig = (estado: string) => {
    switch (estado) {
      case "autorizado":
        return { color: "#00D9A5", bg: "#00D9A515", label: "Autorizado", icon: "checkmark-circle" as const };
      case "pendiente":
        return { color: "#FFB800", bg: "#FFB80015", label: "Pendiente", icon: "time" as const };
      case "rechazado":
        return { color: "#E94560", bg: "#E9456015", label: "Rechazado", icon: "close-circle" as const };
      default:
        return { color: "#888", bg: "#88881510", label: estado, icon: "help-circle" as const };
    }
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  };

  const renderSolicitud = ({ item }: { item: MiSolicitud }) => {
    const cfg = estadoConfig(item.estado);
    const esActivo = placaActual === item.vehiculo_placa;
    const esAutorizado = item.estado === "autorizado";

    return (
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={40}
        renderRightActions={(prog) => <DeleteAction prog={prog} />}
        onSwipeableOpen={() => handleEliminar(item)}
      >
        <View
          style={[
            styles.card,
            ds.cardBg,
            getShadow(isDark, "sm"),
            esActivo && { borderColor: "#00D9A5", borderWidth: 2 },
          ]}
        >
          <View style={styles.cardLeft}>
            <View style={styles.placaBadge}>
              <Text style={styles.placaText}>{item.vehiculo_placa}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={[styles.tipoCamion, ds.textMuted]}>
                {item.tipo_camion.charAt(0).toUpperCase() + item.tipo_camion.slice(1)}
              </Text>
              <Text style={[styles.fecha, ds.textMuted]}>{formatFecha(item.created_at)}</Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            {esAutorizado && !esActivo && (
              <TouchableOpacity
                style={styles.activarBtn}
                onPress={() => handleActivar(item)}>
                <Text style={styles.activarText}>Usar</Text>
              </TouchableOpacity>
            )}
            {esActivo && (
              <View style={styles.activoIndicator}>
                <Ionicons name="radio-button-on" size={14} color="#00D9A5" />
                <Text style={styles.activoText}>Activo</Text>
              </View>
            )}
            {!esAutorizado && (
              <View style={[styles.estadoBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                <Text style={[styles.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            )}
          </View>
        </View>
      </ReanimatedSwipeable>
    );
  };

  const ListHeader = (
    <View>
      {/* FORM */}
      <View style={[styles.formCard, ds.cardBg, getShadow(isDark, "sm")]}>
        <Text style={[styles.formTitle, ds.text]}>Solicitar acceso</Text>
        <Text style={[styles.formSubtitle, ds.textSecondary]}>
          Ingresa la placa del vehículo al que deseas acceder. El propietario recibirá tu solicitud.
        </Text>

        <View style={[styles.inputRow, ds.inputBg, { borderColor: colors.border }]}>
          <Ionicons name="car-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.textInput, ds.text]}
            placeholder="Ej: ABC123"
            placeholderTextColor={colors.textMuted}
            value={placa}
            onChangeText={(t) => setPlaca(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={7}
            returnKeyType="send"
            onSubmitEditing={handleSolicitar}
          />
          {placa.length > 0 && (
            <TouchableOpacity onPress={() => setPlaca("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.accent },
            (enviando || !placa.trim()) && { opacity: 0.5 },
          ]}
          onPress={handleSolicitar}
          disabled={enviando || !placa.trim()}>
          {enviando ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#000" />
              <Text style={styles.sendBtnText}>Enviar solicitud</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* TÍTULO MIS SOLICITUDES */}
      {solicitudes.length > 0 && (
        <Text style={[styles.sectionTitle, ds.text]}>Mis solicitudes</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Mis vehículos</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              Solicita acceso a un vehículo
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={solicitudes}
              keyExtractor={(item) => item.id}
              renderItem={renderSolicitud}
              ListHeaderComponent={ListHeader}
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
                  <Ionicons name="car-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, ds.textMuted]}>
                    Aún no has enviado solicitudes
                  </Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
            />
          )}
        </KeyboardAvoidingView>
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
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#8882",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 1 },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // FORM CARD
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  formTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  formSubtitle: { fontSize: 13, lineHeight: 18, marginBottom: 18 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 3,
    paddingVertical: 14,
  },

  sendBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sendBtnText: { fontSize: 15, fontWeight: "700", color: "#000" },

  // SECTION
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // SOLICITUD CARD
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flex: 1 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
    alignSelf: "flex-start",
  },
  placaText: { fontSize: 14, fontWeight: "800", color: "#000", letterSpacing: 1 },
  tipoCamion: { fontSize: 12, marginBottom: 2 },
  fecha: { fontSize: 11 },

  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  estadoText: { fontSize: 12, fontWeight: "700" },

  activarBtn: {
    backgroundColor: "#FFD600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activarText: { fontSize: 13, fontWeight: "700", color: "#000" },

  activoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#00D9A515",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  activoText: { fontSize: 12, fontWeight: "700", color: "#00D9A5" },

  // DELETE ACTION
  deleteAction: {
    width: DELETE_WIDTH,
    backgroundColor: "#E94560",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 10,
    gap: 4,
  },
  deleteText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  // EMPTY
  emptyWrap: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyText: { fontSize: 14 },
});
