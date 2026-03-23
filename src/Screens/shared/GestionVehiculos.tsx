import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
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
import { useRoleStore } from "../../store/RoleStore";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { TipoCamion } from "../../store/VehiculoStore";
import supabase from "../../config/SupaBaseConfig";

interface VehiculoInfo {
  placa: string;
  tipo_camion: string;
  conductoresCount: number;
  conductores: { nombre: string; estado: string }[];
}

const TIPOS_CAMION: { id: TipoCamion; label: string; emoji: string }[] = [
  { id: "estacas", label: "Estacas", emoji: "🚚" },
  { id: "volqueta", label: "Volqueta", emoji: "🚛" },
  { id: "furgon", label: "Furgón", emoji: "📦" },
  { id: "grua", label: "Grúa", emoji: "🏗️" },
];

export default function GestionVehiculos() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const role = useRoleStore((s) => s.role);

  const [vehiculos, setVehiculos] = useState<VehiculoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal agregar vehiculo
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [nuevaPlaca, setNuevaPlaca] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoCamion>("estacas");
  const [guardando, setGuardando] = useState(false);

  // Modal editar vehiculo
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoInfo | null>(null);
  const [editTipo, setEditTipo] = useState<TipoCamion>("estacas");

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
    if (!user?.id) return;

    let placas: string[] = [];

    if (role === "administrador") {
      // Admin ve todos los vehiculos
      const { data } = await supabase
        .from("vehiculos")
        .select("placa")
        .order("placa");
      placas = (data || []).map((v) => v.placa);
    } else {
      // Propietario ve solo los suyos
      const { data } = await supabase
        .from("vehiculo_conductores")
        .select("vehiculo_placa")
        .eq("conductor_id", user.id)
        .eq("rol", "propietario")
        .eq("estado", "autorizado");
      placas = (data || []).map((v) => v.vehiculo_placa);
    }

    const resultado: VehiculoInfo[] = [];

    for (const placa of placas) {
      const { data: vehiculo } = await supabase
        .from("vehiculos")
        .select("tipo_camion")
        .eq("placa", placa)
        .maybeSingle();

      // Cargar conductores asignados
      const { data: relaciones } = await supabase
        .from("vehiculo_conductores")
        .select("conductor_id, estado")
        .eq("vehiculo_placa", placa)
        .eq("rol", "conductor");

      const conductores: { nombre: string; estado: string }[] = [];
      for (const rel of relaciones || []) {
        const { data: usr } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("user_id", rel.conductor_id)
          .maybeSingle();
        conductores.push({
          nombre: usr?.nombre || "Sin nombre",
          estado: rel.estado,
        });
      }

      resultado.push({
        placa,
        tipo_camion: vehiculo?.tipo_camion || "estacas",
        conductoresCount: conductores.length,
        conductores,
      });
    }

    setVehiculos(resultado);
  }, [user?.id, role]);

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

  const handleAgregarVehiculo = async () => {
    const placaLimpia = nuevaPlaca.trim().toUpperCase();
    if (!placaLimpia || placaLimpia.length < 3) {
      Alert.alert("Error", "La placa debe tener al menos 3 caracteres");
      return;
    }
    if (!user?.id) return;
    setGuardando(true);

    // Verificar si ya existe
    const { data: existe } = await supabase
      .from("vehiculos")
      .select("placa")
      .eq("placa", placaLimpia)
      .maybeSingle();

    if (existe) {
      Alert.alert("Error", "Este vehículo ya está registrado");
      setGuardando(false);
      return;
    }

    // Crear vehiculo
    const { error: vError } = await supabase
      .from("vehiculos")
      .insert([{ placa: placaLimpia, tipo_camion: nuevoTipo, conductor_id: user.id }]);

    if (vError) {
      Alert.alert("Error", "No se pudo registrar el vehículo");
      setGuardando(false);
      return;
    }

    // Crear relacion como propietario
    await supabase.from("vehiculo_conductores").insert([
      {
        vehiculo_placa: placaLimpia,
        conductor_id: user.id,
        rol: "propietario",
        estado: "autorizado",
      },
    ]);

    Alert.alert("Vehículo registrado", `${placaLimpia} agregado correctamente`);
    setModalAgregarVisible(false);
    setNuevaPlaca("");
    setNuevoTipo("estacas");
    setGuardando(false);
    await cargarDatos();
  };

  const abrirEditar = (v: VehiculoInfo) => {
    setVehiculoEditando(v);
    setEditTipo(v.tipo_camion as TipoCamion);
    setModalEditarVisible(true);
  };

  const handleGuardarEdicion = async () => {
    if (!vehiculoEditando) return;
    setGuardando(true);

    const { error } = await supabase
      .from("vehiculos")
      .update({ tipo_camion: editTipo })
      .eq("placa", vehiculoEditando.placa);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar el vehículo");
    } else {
      Alert.alert("Actualizado", `${vehiculoEditando.placa} actualizado`);
      setModalEditarVisible(false);
      setVehiculoEditando(null);
      await cargarDatos();
    }
    setGuardando(false);
  };

  const handleEliminarVehiculo = (v: VehiculoInfo) => {
    Alert.alert(
      "Eliminar vehículo",
      `¿Eliminar ${v.placa} y todas sus asignaciones? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            // Eliminar relaciones primero
            await supabase
              .from("vehiculo_conductores")
              .delete()
              .eq("vehiculo_placa", v.placa);

            // Eliminar vehiculo
            const { error } = await supabase
              .from("vehiculos")
              .delete()
              .eq("placa", v.placa);

            if (error) {
              Alert.alert("Error", "No se pudo eliminar");
            } else {
              await cargarDatos();
            }
          },
        },
      ]
    );
  };

  const getTipoInfo = (tipo: string) =>
    TIPOS_CAMION.find((t) => t.id === tipo) || TIPOS_CAMION[0];

  const renderVehiculo = ({ item: v }: { item: VehiculoInfo }) => {
    const tipoInfo = getTipoInfo(v.tipo_camion);
    return (
      <View style={[styles.vehiculoCard, ds.cardBg, getShadow(isDark, "sm")]}>
        <View style={styles.cardTop}>
          <View style={styles.placaBadge}>
            <Text style={styles.placaText}>{v.placa}</Text>
          </View>
          <View style={styles.tipoChip}>
            <Text style={styles.tipoEmoji}>{tipoInfo.emoji}</Text>
            <Text style={[styles.tipoLabel, ds.text]}>{tipoInfo.label}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.accent + "20" }]}
            onPress={() => abrirEditar(v)}>
            <Text style={[styles.editBtnText, { color: colors.accent }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleEliminarVehiculo(v)}>
            <Text style={{ color: "#E94560", fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Conductores asignados */}
        {v.conductores.length > 0 ? (
          <View style={styles.conductoresList}>
            <Text style={[styles.conductoresLabel, ds.textMuted]}>
              Conductores ({v.conductoresCount})
            </Text>
            {v.conductores.map((c, i) => (
              <View key={i} style={styles.conductorChipRow}>
                <View style={styles.conductorDot}>
                  <Text style={styles.conductorDotInitial}>
                    {c.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.conductorChipName, ds.text]}>
                  {c.nombre}
                </Text>
                <View
                  style={[
                    styles.miniEstado,
                    {
                      backgroundColor:
                        c.estado === "autorizado"
                          ? "#00D9A520"
                          : c.estado === "pendiente"
                          ? "#FFB80020"
                          : "#E9456020",
                    },
                  ]}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color:
                        c.estado === "autorizado"
                          ? "#00D9A5"
                          : c.estado === "pendiente"
                          ? "#FFB800"
                          : "#E94560",
                    }}>
                    {c.estado === "autorizado"
                      ? "Activo"
                      : c.estado === "pendiente"
                      ? "Pendiente"
                      : "Revocado"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.sinConductores, ds.textMuted]}>
            Sin conductores asignados
          </Text>
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
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, ds.text]}>Vehículos</Text>
            <Text style={[styles.headerSubtitle, ds.textSecondary]}>
              {role === "administrador"
                ? "Todos los vehículos registrados"
                : "Tus vehículos registrados"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addHeaderBtn, { backgroundColor: colors.accent }]}
            onPress={() => setModalAgregarVisible(true)}>
            <Text style={styles.addHeaderBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.placa}
          renderItem={renderVehiculo}
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
              <Text style={[styles.emptyTitle, ds.text]}>Sin vehículos</Text>
              <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                Registra tu primer vehículo
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* MODAL: AGREGAR VEHICULO */}
      <Modal
        visible={modalAgregarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAgregarVisible(false)}>
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
                    Nuevo vehículo
                  </Text>
                  <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                    Registra un nuevo vehículo a tu flota
                  </Text>

                  {/* Placa */}
                  <Text style={[styles.inputLabel, ds.textSecondary]}>Placa</Text>
                  <TextInput
                    style={[
                      styles.placaInput,
                      ds.inputBg,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="ABC123"
                    placeholderTextColor={colors.textMuted}
                    value={nuevaPlaca}
                    onChangeText={(t) => setNuevaPlaca(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={7}
                    autoFocus
                  />

                  {/* Tipo */}
                  <Text style={[styles.inputLabel, ds.textSecondary, { marginTop: 16 }]}>
                    Tipo de vehículo
                  </Text>
                  <View style={styles.tiposRow}>
                    {TIPOS_CAMION.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.tipoOption,
                          ds.cardBg,
                          nuevoTipo === t.id && {
                            borderColor: colors.accent,
                            backgroundColor: colors.accent + "15",
                          },
                        ]}
                        onPress={() => setNuevoTipo(t.id)}>
                        <Text style={styles.tipoOptionEmoji}>{t.emoji}</Text>
                        <Text
                          style={[
                            styles.tipoOptionLabel,
                            nuevoTipo === t.id
                              ? { color: colors.accent, fontWeight: "700" }
                              : ds.text,
                          ]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { backgroundColor: colors.accent },
                      (!nuevaPlaca.trim() || guardando) && { opacity: 0.5 },
                    ]}
                    onPress={handleAgregarVehiculo}
                    disabled={!nuevaPlaca.trim() || guardando}>
                    {guardando ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Registrar vehículo</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setModalAgregarVisible(false);
                      setNuevaPlaca("");
                    }}>
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

      {/* MODAL: EDITAR VEHICULO */}
      <Modal
        visible={modalEditarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEditarVisible(false)}>
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
                  Editar vehículo
                </Text>
                {vehiculoEditando && (
                  <View style={[styles.editPlacaDisplay, { alignSelf: "center", marginBottom: 20 }]}>
                    <View style={styles.placaBadge}>
                      <Text style={styles.placaText}>{vehiculoEditando.placa}</Text>
                    </View>
                  </View>
                )}

                <Text style={[styles.inputLabel, ds.textSecondary]}>
                  Tipo de vehículo
                </Text>
                <View style={styles.tiposRow}>
                  {TIPOS_CAMION.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.tipoOption,
                        ds.cardBg,
                        editTipo === t.id && {
                          borderColor: colors.accent,
                          backgroundColor: colors.accent + "15",
                        },
                      ]}
                      onPress={() => setEditTipo(t.id)}>
                      <Text style={styles.tipoOptionEmoji}>{t.emoji}</Text>
                      <Text
                        style={[
                          styles.tipoOptionLabel,
                          editTipo === t.id
                            ? { color: colors.accent, fontWeight: "700" }
                            : ds.text,
                        ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.accent },
                    guardando && { opacity: 0.5 },
                  ]}
                  onPress={handleGuardarEdicion}
                  disabled={guardando}>
                  {guardando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalEditarVisible(false);
                    setVehiculoEditando(null);
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
  addHeaderBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addHeaderBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // VEHICULO CARD
  vehiculoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
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
  tipoChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  tipoEmoji: { fontSize: 16 },
  tipoLabel: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  editBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontWeight: "600" },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E9456015",
  },

  // CONDUCTORES
  conductoresList: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#8882", paddingTop: 10 },
  conductoresLabel: { fontSize: 11, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  conductorChipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  conductorDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#6C5CE720",
    justifyContent: "center",
    alignItems: "center",
  },
  conductorDotInitial: { fontSize: 11, fontWeight: "700", color: "#6C5CE7" },
  conductorChipName: { flex: 1, fontSize: 13 },
  miniEstado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sinConductores: { fontSize: 12, marginTop: 10 },

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
  modalTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },

  // INPUTS
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  placaInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    borderWidth: 1,
  },
  tiposRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  tipoOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  tipoOptionEmoji: { fontSize: 18 },
  tipoOptionLabel: { fontSize: 13 },
  editPlacaDisplay: {},

  // BUTTONS
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
});
