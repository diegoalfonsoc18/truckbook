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
import supabase from "../../config/SupaBaseConfig";
import {
  cargarTodosVehiculosConConductores,
  cargarVehiculosPropietarioConConductores,
} from "../../services/vehiculoAutorizacionService";

interface VehiculoTecno {
  placa: string;
  tipo_camion: string;
  tecnomecanica_vencimiento: string | null;
}

function getEstado(fecha: string | null) {
  if (!fecha) return { label: "Sin registrar", color: "#888", bg: "#8881" };
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fecha + "T00:00:00");
  const diff = Math.ceil((venc.getTime() - hoy.getTime()) / 86400000);
  if (diff < 0) return { label: `Vencida hace ${Math.abs(diff)} días`, color: "#E94560", bg: "#E9456015" };
  if (diff <= 30) return { label: `Vence en ${diff} días`, color: "#FFB800", bg: "#FFB80015" };
  return { label: `Vigente (${diff} días)`, color: "#00D9A5", bg: "#00D9A515" };
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "No registrada";
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export default function TecnomecanicaVehiculos() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const role = useRoleStore((s) => s.role);

  const [vehiculos, setVehiculos] = useState<VehiculoTecno[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editPlaca, setEditPlaca] = useState("");
  const [editFecha, setEditFecha] = useState("");

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
    const { data } = role === "administrador"
      ? await cargarTodosVehiculosConConductores()
      : await cargarVehiculosPropietarioConConductores(user.id);

    const placas = data.map((v) => v.placa);
    if (placas.length === 0) { setVehiculos([]); return; }

    const { data: db } = await supabase
      .from("vehiculos")
      .select("placa, tipo_camion, tecnomecanica_vencimiento")
      .in("placa", placas);

    const resultado = (db || []).map((v) => ({
      placa: v.placa,
      tipo_camion: v.tipo_camion || "estacas",
      tecnomecanica_vencimiento: v.tecnomecanica_vencimiento || null,
    }));

    resultado.sort((a, b) => {
      const ea = getEstado(a.tecnomecanica_vencimiento);
      const eb = getEstado(b.tecnomecanica_vencimiento);
      const prio = (c: string) => c === "#E94560" ? 3 : c === "#FFB800" ? 2 : c === "#888" ? 1 : 0;
      return prio(eb.color) - prio(ea.color);
    });

    setVehiculos(resultado);
  }, [user?.id, role]);

  useEffect(() => { setLoading(true); cargarDatos().finally(() => setLoading(false)); }, [cargarDatos]);

  const onRefresh = async () => { setRefreshing(true); await cargarDatos(); setRefreshing(false); };

  const abrirEditar = (v: VehiculoTecno) => {
    setEditPlaca(v.placa);
    setEditFecha(v.tecnomecanica_vencimiento || "");
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    if (editFecha && !/^\d{4}-\d{2}-\d{2}$/.test(editFecha)) {
      Alert.alert("Error", "Formato inválido. Usa AAAA-MM-DD");
      setGuardando(false);
      return;
    }
    const { error } = await supabase
      .from("vehiculos")
      .update({ tecnomecanica_vencimiento: editFecha || null })
      .eq("placa", editPlaca);

    if (error) Alert.alert("Error", "No se pudo guardar");
    else { setModalVisible(false); await cargarDatos(); }
    setGuardando(false);
  };

  const vencidos = vehiculos.filter((v) => getEstado(v.tecnomecanica_vencimiento).color === "#E94560").length;
  const porVencer = vehiculos.filter((v) => getEstado(v.tecnomecanica_vencimiento).color === "#FFB800").length;

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
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.headerTitle, ds.text]}>Tecnomecánica</Text>
              <Text style={[styles.headerSubtitle, ds.textSecondary]}>
                Revisión técnico-mecánica
              </Text>
            </View>
          </View>
          <View style={styles.resumenRow}>
            {vencidos > 0 && (
              <View style={[styles.chip, { backgroundColor: "#E9456015", borderColor: "#E9456040" }]}>
                <Text style={[styles.chipText, { color: "#E94560" }]}>{vencidos} vencida{vencidos > 1 ? "s" : ""}</Text>
              </View>
            )}
            {porVencer > 0 && (
              <View style={[styles.chip, { backgroundColor: "#FFB80015", borderColor: "#FFB80040" }]}>
                <Text style={[styles.chipText, { color: "#FFB800" }]}>{porVencer} por vencer</Text>
              </View>
            )}
            {vencidos === 0 && porVencer === 0 && (
              <View style={[styles.chip, { backgroundColor: "#00D9A515", borderColor: "#00D9A540" }]}>
                <Text style={[styles.chipText, { color: "#00D9A5" }]}>Todo al día</Text>
              </View>
            )}
          </View>
        </View>

        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.placa}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}><Text style={styles.emptyIcon}>📄</Text><Text style={[styles.emptyTitle, ds.text]}>Sin vehículos</Text></View>
          }
          renderItem={({ item }) => {
            const estado = getEstado(item.tecnomecanica_vencimiento);
            return (
              <TouchableOpacity style={[styles.card, ds.cardBg, getShadow(isDark, "sm")]} onPress={() => abrirEditar(item)} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <View style={styles.placaBadge}><Text style={styles.placaText}>{item.placa}</Text></View>
                  <Text style={[styles.tipoText, ds.textMuted]}>{item.tipo_camion}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.editHint, ds.textMuted]}>Editar</Text>
                </View>
                <View style={[styles.estadoRow, { backgroundColor: estado.bg }]}>
                  <View>
                    <Text style={[styles.estadoLabel, { color: estado.color }]}>{estado.label}</Text>
                    <Text style={[styles.fechaText, ds.textMuted]}>Vence: {formatFecha(item.tecnomecanica_vencimiento)}</Text>
                  </View>
                  <View style={[styles.estadoDot, { backgroundColor: estado.color }]} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, ds.modalBg]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
                  <Text style={[styles.modalTitle, ds.text]}>Tecnomecánica</Text>
                  <View style={{ alignSelf: "center", marginBottom: 20 }}>
                    <View style={styles.placaBadge}><Text style={styles.placaText}>{editPlaca}</Text></View>
                  </View>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>Fecha de vencimiento</Text>
                  <TextInput
                    style={[styles.input, ds.inputBg, { color: colors.text, borderColor: colors.border }]}
                    placeholder="AAAA-MM-DD (ej: 2026-06-15)"
                    placeholderTextColor={colors.textMuted}
                    value={editFecha}
                    onChangeText={setEditFecha}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.accent, marginTop: 20 }, guardando && { opacity: 0.5 }]}
                    onPress={handleGuardar} disabled={guardando}>
                    {guardando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={[styles.cancelBtnText, ds.textSecondary]}>Cancelar</Text>
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
  headerSection: { paddingHorizontal: 16, paddingBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  resumenRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  placaBadge: { backgroundColor: "#FFE415", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 2, borderColor: "#000" },
  placaText: { fontSize: 14, fontWeight: "800", color: "#000", letterSpacing: 1 },
  tipoText: { fontSize: 13, textTransform: "capitalize" },
  editHint: { fontSize: 12 },
  estadoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10 },
  estadoLabel: { fontSize: 13, fontWeight: "700" },
  fechaText: { fontSize: 11, marginTop: 2 },
  estadoDot: { width: 12, height: 12, borderRadius: 6 },
  empty: { alignItems: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 40, paddingHorizontal: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 10 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
});
