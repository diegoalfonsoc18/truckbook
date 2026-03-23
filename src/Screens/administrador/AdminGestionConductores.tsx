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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useTheme, getShadow } from "../../constants/Themecontext";
import supabase from "../../config/SupaBaseConfig";
import {
  cargarConductoresDeVehiculo,
  buscarConductorPorCedula,
  agregarConductorAVehiculo,
  removerConductorDeVehiculo,
  type ConductorAsignado,
} from "../../services/vehiculoAutorizacionService";

interface VehiculoSimple {
  placa: string;
  tipo_camion: string;
}

export default function AdminGestionConductores() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [vehiculos, setVehiculos] = useState<VehiculoSimple[]>([]);
  const [selectedPlaca, setSelectedPlaca] = useState<string | null>(null);
  const [conductores, setConductores] = useState<ConductorAsignado[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConductores, setLoadingConductores] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal agregar conductor
  const [modalVisible, setModalVisible] = useState(false);
  const [cedulaBuscar, setCedulaBuscar] = useState("");
  const [conductorEncontrado, setConductorEncontrado] = useState<{
    user_id: string;
    nombre: string;
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

  // Cargar TODOS los vehiculos del sistema
  const cargarTodosVehiculos = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehiculos")
      .select("placa, tipo_camion")
      .order("placa", { ascending: true });

    if (error) {
      console.error("Error cargando vehiculos:", error);
      return;
    }

    const lista = data || [];
    setVehiculos(lista);
    if (lista.length > 0 && !selectedPlaca) {
      setSelectedPlaca(lista[0].placa);
    }
  }, []);

  // Cargar conductores del vehiculo seleccionado
  const cargarConductores = useCallback(async () => {
    if (!selectedPlaca) return;
    setLoadingConductores(true);
    const { data } = await cargarConductoresDeVehiculo(selectedPlaca);
    setConductores(data || []);
    setLoadingConductores(false);
  }, [selectedPlaca]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarTodosVehiculos();
      setLoading(false);
    };
    init();
  }, [cargarTodosVehiculos]);

  useEffect(() => {
    if (selectedPlaca) cargarConductores();
  }, [selectedPlaca, cargarConductores]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarConductores();
    setRefreshing(false);
  };

  // Buscar conductor por cedula
  const handleBuscar = async () => {
    if (!cedulaBuscar.trim()) return;
    Keyboard.dismiss();
    setBuscando(true);
    setConductorEncontrado(null);
    const { data, error } = await buscarConductorPorCedula(cedulaBuscar);
    if (error) {
      Alert.alert("No encontrado", error);
    } else if (data) {
      setConductorEncontrado(data);
    }
    setBuscando(false);
  };

  // Agregar conductor al vehiculo
  const handleAgregar = async () => {
    if (!conductorEncontrado || !selectedPlaca || !user?.id) return;
    setAgregando(true);
    const resultado = await agregarConductorAVehiculo(
      selectedPlaca,
      conductorEncontrado.user_id,
      user.id
    );
    if (resultado.success) {
      Alert.alert(
        "Conductor autorizado",
        `${conductorEncontrado.nombre} ahora puede acceder al vehiculo ${selectedPlaca}`
      );
      setModalVisible(false);
      setCedulaBuscar("");
      setConductorEncontrado(null);
      await cargarConductores();
    } else {
      Alert.alert("Error", resultado.error || "No se pudo agregar");
    }
    setAgregando(false);
  };

  // Remover conductor
  const handleRemover = (conductor: ConductorAsignado) => {
    Alert.alert(
      "Remover conductor",
      `Remover a ${conductor.nombre} (${conductor.cedula}) del vehiculo ${selectedPlaca}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const resultado = await removerConductorDeVehiculo(
              conductor.relacion_id
            );
            if (resultado.success) {
              Alert.alert("Removido", "El conductor ya no tiene acceso");
              await cargarConductores();
            } else {
              Alert.alert("Error", resultado.error || "No se pudo remover");
            }
          },
        },
      ]
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Conductores</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              Gestiona conductores por vehiculo
            </Text>
          </View>
        </View>

        {/* Selector de vehiculo */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.vehiculoSelector}
          contentContainerStyle={styles.vehiculoSelectorContent}>
          {vehiculos.map((v) => (
            <TouchableOpacity
              key={v.placa}
              style={[
                styles.vehiculoChip,
                selectedPlaca === v.placa
                  ? { backgroundColor: colors.accent }
                  : ds.cardBg,
              ]}
              onPress={() => setSelectedPlaca(v.placa)}>
              <Text
                style={[
                  styles.vehiculoChipText,
                  {
                    color:
                      selectedPlaca === v.placa ? "#FFF" : colors.text,
                  },
                ]}>
                {v.placa}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {vehiculos.length === 0 ? (
          <View style={[styles.emptyState, ds.cardBg, { marginHorizontal: 20 }]}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={[styles.emptyTitle, ds.text]}>
              Sin vehiculos registrados
            </Text>
            <Text style={[styles.emptySubtitle, ds.textSecondary]}>
              No hay vehiculos en el sistema
            </Text>
          </View>
        ) : (
          <>
            {/* Placa seleccionada + boton agregar */}
            <View style={styles.placaHeader}>
              <View style={styles.placaBadge}>
                <Text style={styles.placaText}>{selectedPlaca}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.accent }]}
                onPress={() => setModalVisible(true)}>
                <Text style={styles.addBtnText}>+ Agregar conductor</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de conductores */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.accent}
                />
              }>
              {loadingConductores ? (
                <ActivityIndicator
                  color={colors.accent}
                  style={{ paddingVertical: 40 }}
                />
              ) : conductores.length === 0 ? (
                <View style={[styles.emptyState, ds.cardBg]}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={[styles.emptyTitle, ds.text]}>
                    Sin conductores asignados
                  </Text>
                  <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                    Agrega conductores por su cedula
                  </Text>
                </View>
              ) : (
                conductores.map((c) => (
                  <View
                    key={c.relacion_id}
                    style={[
                      styles.conductorCard,
                      ds.cardBg,
                      getShadow(isDark, "sm"),
                    ]}>
                    <View style={styles.conductorAvatar}>
                      <Text style={styles.conductorInitial}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.conductorInfo}>
                      <Text style={[styles.conductorNombre, ds.text]}>
                        {c.nombre}
                      </Text>
                      <Text style={[styles.conductorCedula, ds.textSecondary]}>
                        CC: {c.cedula}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.estadoBadge,
                        {
                          backgroundColor:
                            c.estado === "autorizado"
                              ? "#00D9A520"
                              : "#FFB80020",
                        },
                      ]}>
                      <Text
                        style={[
                          styles.estadoText,
                          {
                            color:
                              c.estado === "autorizado"
                                ? "#00D9A5"
                                : "#FFB800",
                          },
                        ]}>
                        {c.estado === "autorizado" ? "Activo" : "Pendiente"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemover(c)}>
                      <Text style={{ color: "#E94560", fontSize: 14 }}>
                        Remover
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      {/* Modal agregar conductor */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
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
                  Busca al conductor por su cedula para asignarlo a{" "}
                  <Text style={{ fontWeight: "700" }}>{selectedPlaca}</Text>
                </Text>

                {/* Input cedula */}
                <View style={styles.searchRow}>
                  <View
                    style={[
                      styles.searchInput,
                      ds.inputBg,
                      { borderColor: colors.border },
                    ]}>
                    <Text style={{ fontSize: 16 }}>🪪</Text>
                    <TextInput
                      style={[styles.searchTextInput, ds.text]}
                      placeholder="Numero de cedula"
                      placeholderTextColor={colors.textMuted}
                      value={cedulaBuscar}
                      onChangeText={setCedulaBuscar}
                      keyboardType="numeric"
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.searchBtn,
                      { backgroundColor: colors.accent },
                      (!cedulaBuscar.trim() || buscando) && { opacity: 0.5 },
                    ]}
                    onPress={handleBuscar}
                    disabled={!cedulaBuscar.trim() || buscando}>
                    {buscando ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.searchBtnText}>Buscar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Resultado */}
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
                        <Text style={[styles.resultCedula, ds.textSecondary]}>
                          CC: {conductorEncontrado.cedula}
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

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalVisible(false);
                    setCedulaBuscar("");
                    setConductorEncontrado(null);
                  }}>
                  <Text style={[styles.cancelBtnText, ds.textSecondary]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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

  // Vehiculo selector
  vehiculoSelector: { maxHeight: 50, marginBottom: 12 },
  vehiculoSelectorContent: { paddingHorizontal: 20, gap: 8 },
  vehiculoChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  vehiculoChipText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },

  // Placa header
  placaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 1,
  },
  addBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Empty
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

  // Conductor card
  conductorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexWrap: "wrap",
    gap: 8,
  },
  conductorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#6C5CE720",
    justifyContent: "center",
    alignItems: "center",
  },
  conductorInitial: { fontSize: 18, fontWeight: "700", color: "#6C5CE7" },
  conductorInfo: { flex: 1, marginLeft: 4 },
  conductorNombre: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  conductorCedula: { fontSize: 12 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  estadoText: { fontSize: 11, fontWeight: "600" },
  removeBtn: { padding: 6 },

  // Modal
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

  // Search
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

  // Result
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
  resultCedula: { fontSize: 13, marginTop: 2 },
  agregarBtn: { borderRadius: 12, padding: 14, alignItems: "center" },
  agregarBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  // Cancel
  cancelBtn: { alignItems: "center", padding: 16 },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
});
