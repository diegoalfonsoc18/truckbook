import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  cargarTodosVehiculosConConductores,
  buscarConductorPorEmail,
  agregarConductorAVehiculo,
  removerConductorDeVehiculo,
  cambiarAutorizacionConductor,
  type VehiculoConConductores,
  type ConductorAsignado,
} from "../../services/vehiculoAutorizacionService";

export default function AdminGestionConductores() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [vehiculos, setVehiculos] = useState<VehiculoConConductores[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal agregar conductor
  const [modalVisible, setModalVisible] = useState(false);
  const [placaParaAgregar, setPlacaParaAgregar] = useState<string | null>(null);
  const [emailBuscar, setEmailBuscar] = useState("");
  const [conductorEncontrado, setConductorEncontrado] = useState<{
    user_id: string;
    nombre: string;
    email: string;
    cedula: string;
  } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [agregando, setAgregando] = useState(false);

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    modalBg: { backgroundColor: colors.modalBg },
    inputBg: { backgroundColor: isDark ? "#252540" : "#F0F0F5" },
  };

  const cargarDatos = useCallback(async () => {
    const { data } = await cargarTodosVehiculosConConductores();
    setVehiculos(data);
  }, []);

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

  const handleBuscar = async () => {
    if (!emailBuscar.trim()) return;
    Keyboard.dismiss();
    setBuscando(true);
    setConductorEncontrado(null);
    const { data, error } = await buscarConductorPorEmail(emailBuscar);
    if (error) {
      Alert.alert("No encontrado", error);
    } else if (data) {
      setConductorEncontrado(data);
    }
    setBuscando(false);
  };

  const handleAgregar = async () => {
    if (!conductorEncontrado || !placaParaAgregar || !user?.id) return;
    setAgregando(true);
    const resultado = await agregarConductorAVehiculo(
      placaParaAgregar,
      conductorEncontrado.user_id,
      user.id
    );
    if (resultado.success) {
      Alert.alert(
        "Invitación enviada",
        `Se envió invitación a ${conductorEncontrado.nombre} para el vehículo ${placaParaAgregar}. Debe aceptarla desde su app.`
      );
      cerrarModal();
      await cargarDatos();
    } else {
      Alert.alert("Error", resultado.error || "No se pudo agregar");
    }
    setAgregando(false);
  };

  const handleToggleAutorizacion = (conductor: ConductorAsignado, placa: string) => {
    const esAutorizado = conductor.estado === "autorizado";
    const accion = esAutorizado ? "Revocar" : "Autorizar";

    Alert.alert(
      `${accion} acceso`,
      `${accion} acceso de ${conductor.nombre} al vehiculo ${placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: accion,
          style: esAutorizado ? "destructive" : "default",
          onPress: async () => {
            if (!user?.id) return;
            const nuevoEstado = esAutorizado ? "rechazado" : "autorizado";
            const resultado = await cambiarAutorizacionConductor(
              conductor.relacion_id,
              nuevoEstado,
              user.id
            );
            if (resultado.success) {
              await cargarDatos();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo cambiar");
            }
          },
        },
      ]
    );
  };

  const handleRemover = (conductor: ConductorAsignado, placa: string) => {
    Alert.alert(
      "Eliminar conductor",
      `Eliminar a ${conductor.nombre} del vehiculo ${placa}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const resultado = await removerConductorDeVehiculo(conductor.relacion_id);
            if (resultado.success) {
              await cargarDatos();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo eliminar");
            }
          },
        },
      ]
    );
  };

  const abrirModalAgregar = (placa: string) => {
    setPlacaParaAgregar(placa);
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEmailBuscar("");
    setConductorEncontrado(null);
    setPlacaParaAgregar(null);
  };

  const renderVehiculoCard = ({ item: v }: { item: VehiculoConConductores }) => (
    <View style={[styles.vehiculoCard, ds.cardBg, getShadow(isDark, "sm")]}>
      {/* Fila superior: placa + tipo + boton agregar */}
      <View style={styles.cardHeader}>
        <View style={styles.placaBadge}>
          <Text style={styles.placaText}>{v.placa}</Text>
        </View>
        <Text style={[styles.tipoCamion, ds.textMuted]}>{v.tipo_camion}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => abrirModalAgregar(v.placa)}>
          <Text style={styles.addBtnText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Conductores */}
      {v.conductores.length === 0 ? (
        <View style={styles.sinConductor}>
          <Text style={[styles.sinConductorText, ds.textMuted]}>
            Sin conductor asignado
          </Text>
        </View>
      ) : (
        v.conductores.map((c) => (
          <View key={c.relacion_id} style={styles.conductorRow}>
            <View style={styles.conductorAvatar}>
              <Text style={styles.conductorInitial}>
                {c.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.conductorInfo}>
              <Text style={[styles.conductorNombre, ds.text]}>{c.nombre}</Text>
              <Text style={[styles.conductorCedula, ds.textSecondary]}>
                CC: {c.cedula}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.estadoBtn,
                {
                  backgroundColor:
                    c.estado === "autorizado"
                      ? "#00D9A520"
                      : c.estado === "pendiente"
                      ? "#FFB80020"
                      : "#E9456020",
                },
              ]}
              onPress={() => handleToggleAutorizacion(c, v.placa)}>
              <Text
                style={[
                  styles.estadoText,
                  {
                    color:
                      c.estado === "autorizado"
                        ? "#00D9A5"
                        : c.estado === "pendiente"
                        ? "#FFB800"
                        : "#E94560",
                  },
                ]}>
                {c.estado === "autorizado"
                  ? "Autorizado"
                  : c.estado === "pendiente"
                  ? "Pendiente"
                  : "Revocado"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemover(c, v.placa)}>
              <Text style={{ color: "#E94560", fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Conductores</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              Vehiculos y sus conductores asignados
            </Text>
          </View>
        </View>

        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.placa}
          renderItem={renderVehiculoCard}
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
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={[styles.emptyTitle, ds.text]}>Sin vehiculos</Text>
              <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                No hay vehiculos registrados
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Modal agregar conductor */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, ds.modalBg]}>
                  <View
                    style={[
                      styles.modalHandle,
                      { backgroundColor: colors.textMuted },
                    ]}
                  />
                  <Text style={[styles.modalTitle, ds.text]}>
                    Agregar conductor
                  </Text>
                  <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                    Busca por correo para asignar a{" "}
                    <Text style={{ fontWeight: "700" }}>{placaParaAgregar}</Text>
                  </Text>

                  <View style={styles.searchRow}>
                    <View
                      style={[
                        styles.searchInput,
                        ds.inputBg,
                        { borderColor: colors.border },
                      ]}>
                      <Text style={{ fontSize: 16 }}>✉️</Text>
                      <TextInput
                        style={[styles.searchTextInput, ds.text]}
                        placeholder="correo@ejemplo.com"
                        placeholderTextColor={colors.textMuted}
                        value={emailBuscar}
                        onChangeText={setEmailBuscar}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.searchBtn,
                        { backgroundColor: colors.accent },
                        (!emailBuscar.trim() || buscando) && { opacity: 0.5 },
                      ]}
                      onPress={handleBuscar}
                      disabled={!emailBuscar.trim() || buscando}>
                      {buscando ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.searchBtnText}>Buscar</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {conductorEncontrado && (
                    <View
                      style={[
                        styles.resultCard,
                        ds.cardBg,
                        getShadow(isDark, "sm"),
                      ]}>
                      <View style={styles.resultInfo}>
                        <View style={styles.resultAvatar}>
                          <Text style={styles.resultInitial}>
                            {conductorEncontrado.nombre.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.resultNombre, ds.text]}>
                            {conductorEncontrado.nombre}
                          </Text>
                          <Text style={[styles.resultEmail, ds.textSecondary]}>
                            {conductorEncontrado.email}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.agregarBtn,
                          { backgroundColor: "#00D9A5" },
                          agregando && { opacity: 0.5 },
                        ]}
                        onPress={handleAgregar}
                        disabled={agregando}>
                        {agregando ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.agregarBtnText}>
                            Autorizar acceso
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity style={styles.cancelBtn} onPress={cerrarModal}>
                    <Text style={[styles.cancelBtnText, ds.textSecondary]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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

  // VEHICULO CARD
  vehiculoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
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
  tipoCamion: { flex: 1, fontSize: 13, textTransform: "capitalize" },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  // SIN CONDUCTOR
  sinConductor: {
    paddingVertical: 10,
    alignItems: "center",
  },
  sinConductorText: { fontSize: 13 },

  // CONDUCTOR ROW
  conductorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#8882",
    gap: 8,
  },
  conductorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#6C5CE720",
    justifyContent: "center",
    alignItems: "center",
  },
  conductorInitial: { fontSize: 15, fontWeight: "700", color: "#6C5CE7" },
  conductorInfo: { flex: 1 },
  conductorNombre: { fontSize: 14, fontWeight: "600", marginBottom: 1 },
  conductorCedula: { fontSize: 11 },

  // ESTADO
  estadoBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  estadoText: { fontSize: 11, fontWeight: "700" },

  // REMOVE
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E9456015",
  },

  // EMPTY
  emptyGlobal: { alignItems: "center", padding: 40, marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },

  // MODAL
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchTextInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  searchBtn: { borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
  searchBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  resultCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  resultInfo: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#00D9A520",
    justifyContent: "center",
    alignItems: "center",
  },
  resultInitial: { fontSize: 20, fontWeight: "700", color: "#00D9A5" },
  resultNombre: { fontSize: 17, fontWeight: "600" },
  resultEmail: { fontSize: 13, marginTop: 2 },
  agregarBtn: { borderRadius: 12, padding: 14, alignItems: "center" },
  agregarBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  cancelBtn: { alignItems: "center", padding: 16 },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
});
