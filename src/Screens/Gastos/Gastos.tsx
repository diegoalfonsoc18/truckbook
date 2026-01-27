import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { gastosData } from "../../data/data";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";
import { useTheme, getShadow } from "../../constants/Themecontext";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 4;
const GRID_GAP = 12;
const HORIZONTAL_PADDING = 20;
const ITEM_WIDTH =
  (width - HORIZONTAL_PADDING * 2 - GRID_GAP * (COLUMN_COUNT - 1)) /
  COLUMN_COUNT;

const GASTOS_CATEGORIAS = [
  { id: "combustible", name: "Combustible", icon: "⛽", color: "#FFB800" },
  { id: "peajes", name: "Peajes", icon: "🛣️", color: "#00D9A5" },
  { id: "comida", name: "Comida", icon: "🍔", color: "#FF6B6B" },
  { id: "hospedaje", name: "Hospedaje", icon: "🏨", color: "#6C5CE7" },
  { id: "mantenimiento", name: "Manteni...", icon: "🔧", color: "#74B9FF" },
  { id: "llantas", name: "Llantas", icon: "🛞", color: "#A29BFE" },
  { id: "lavado", name: "Lavado", icon: "🧼", color: "#00CEC9" },
  { id: "parqueadero", name: "Parqueo", icon: "🅿️", color: "#FD79A8" },
  { id: "otros", name: "Otros", icon: "📦", color: "#636E72" },
];

export default function Gastos() {
  const { colors, isDark } = useTheme();
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const { agregarGasto, actualizarGasto, eliminarGasto } =
    useGastosConductor(placaActual);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedGasto, setSelectedGasto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isEditing = editId !== null;

  useEffect(() => {
    if (placaActual) {
      useGastosStore.getState().cargarGastosDelDB(placaActual);
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [placaActual]);

  const handleAddGasto = useCallback(
    async (id: string, value: string) => {
      if (!placaActual || !user?.id) {
        Alert.alert(
          "Error",
          !placaActual
            ? "Selecciona una placa primero"
            : "Usuario no identificado",
        );
        return;
      }
      const gasto =
        GASTOS_CATEGORIAS.find((g) => g.id === id) ||
        gastosData.find((g) => g.id === id);
      if (!gasto) return;

      setLoading(true);
      try {
        const resultado = await agregarGasto({
          placa: placaActual,
          conductor_id: user.id,
          tipo_gasto: gasto.name,
          descripcion: gasto.name,
          monto: parseFloat(value),
          fecha: editDate,
          estado: "pendiente",
        });
        if (resultado.success) {
          Keyboard.dismiss();
          closeModal();
          Alert.alert("✅ Éxito", "Gasto registrado");
        } else {
          Alert.alert("Error", resultado.error || "No se pudo agregar");
        }
      } catch {
        Alert.alert("Error", "Error al agregar el gasto");
      } finally {
        setLoading(false);
      }
    },
    [agregarGasto, placaActual, editDate, user?.id],
  );

  const handleEditClick = (id: string | number) => {
    const gasto = gastos.find((g) => g.id === String(id));
    if (gasto) {
      setEditValue(String(gasto.monto));
      setEditId(String(id));
      setEditDate(gasto.fecha);
      setSelectedGasto(gasto.tipo_gasto?.toLowerCase() || null);
      setModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editValue) return Alert.alert("Error", "Campos requeridos");
    setLoading(true);
    try {
      const resultado = await actualizarGasto(editId, {
        monto: parseFloat(editValue),
        fecha: editDate,
      });
      if (resultado.success) {
        closeModal();
        Alert.alert("✅ Éxito", "Gasto actualizado");
      } else {
        Alert.alert("Error", resultado.error || "No se pudo actualizar");
      }
    } catch {
      Alert.alert("Error", "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string | number) => {
    Alert.alert("🗑️ Eliminar", "¿Eliminar este gasto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const resultado = await eliminarGasto(String(id));
            if (resultado.success) Alert.alert("✅", "Eliminado");
            else Alert.alert("Error", resultado.error || "No se pudo eliminar");
          } catch {
            Alert.alert("Error", "Error al eliminar");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditId(null);
    setEditValue("");
    setSelectedGasto(null);
    setEditDate(selectedDate);
  };

  const openAddModal = (categoriaId: string) => {
    setSelectedGasto(categoriaId);
    setEditId(null);
    setEditValue("");
    setEditDate(selectedDate);
    setModalVisible(true);
  };

  const gastosFiltrados = gastos
    .filter((g) => g.placa === placaActual && g.fecha === selectedDate)
    .filter((g, i, self) => i === self.findIndex((t) => t.id === g.id));

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + (g.monto || 0),
    0,
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    inputBg: { backgroundColor: isDark ? "#252540" : "#F0F0F5" },
    modalBg: { backgroundColor: colors.modalBg },
    accent: colors.expense,
  };

  if (!placaActual) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={[styles.emptyTitle, ds.text]}>
              Sin vehículo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, ds.textSecondary]}>
              Selecciona una placa para registrar gastos
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER FIJO */}
        <View style={styles.headerFixed}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, ds.text]}>Gastos</Text>
              <Text style={[styles.headerSubtitle, ds.textSecondary]}>
                Control de egresos
              </Text>
            </View>
            <View style={styles.placaBadge}>
              <Text style={styles.placaText}>{placaActual}</Text>
            </View>
          </View>
        </View>

        {/* CONTENIDO SCROLLEABLE */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* SELECTOR DE FECHA */}
            <TouchableOpacity
              style={[styles.dateSelector, ds.cardBg, getShadow(isDark, "sm")]}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.dateSelectorLeft}>
                <Text style={styles.dateIcon}>📅</Text>
                <View>
                  <Text style={[styles.dateLabel, ds.textSecondary]}>
                    Fecha
                  </Text>
                  <Text style={[styles.dateValue, ds.text]}>
                    {formatDate(selectedDate)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.dateArrow, ds.textMuted]}>›</Text>
            </TouchableOpacity>

            {/* RESUMEN */}
            <View
              style={[
                styles.summaryCard,
                ds.cardBg,
                { borderColor: ds.accent + "40" },
                getShadow(isDark, "md"),
              ]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, ds.textSecondary]}>
                  Total del día
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: ds.accent + "20" },
                  ]}>
                  <Text style={[styles.countText, { color: ds.accent }]}>
                    {gastosFiltrados.length}
                  </Text>
                </View>
              </View>
              <Text style={[styles.summaryTotal, { color: ds.accent }]}>
                {formatCurrency(totalGastos)}
              </Text>
            </View>

            {/* GRID DE CATEGORÍAS */}
            <Text style={[styles.sectionTitle, ds.textSecondary]}>
              Registrar gasto
            </Text>
            <View style={styles.categoriesGrid}>
              {GASTOS_CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    ds.cardBg,
                    getShadow(isDark, "sm"),
                  ]}
                  onPress={() => openAddModal(cat.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${cat.color}20` },
                    ]}>
                    <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  </View>
                  <Text
                    style={[styles.categoryName, ds.textSecondary]}
                    numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LISTA DE GASTOS */}
            <Text style={[styles.sectionTitle, ds.textSecondary]}>
              Gastos registrados
            </Text>
            {gastosFiltrados.length === 0 ? (
              <View style={[styles.emptyList, ds.cardBg]}>
                <Text style={styles.emptyListIcon}>📭</Text>
                <Text style={[styles.emptyListText, ds.textMuted]}>
                  Sin gastos este día
                </Text>
              </View>
            ) : (
              gastosFiltrados.map((item, index) => {
                const categoria = GASTOS_CATEGORIAS.find(
                  (c) =>
                    c.name.toLowerCase() === item.tipo_gasto?.toLowerCase(),
                );
                return (
                  <View
                    key={`${item.id}-${index}`}
                    style={[
                      styles.gastoItem,
                      ds.cardBg,
                      getShadow(isDark, "sm"),
                    ]}>
                    <View
                      style={[
                        styles.gastoIcon,
                        {
                          backgroundColor: `${categoria?.color || ds.accent}20`,
                        },
                      ]}>
                      <Text style={styles.gastoEmoji}>
                        {categoria?.icon || "📦"}
                      </Text>
                    </View>
                    <View style={styles.gastoInfo}>
                      <Text style={[styles.gastoName, ds.text]}>
                        {item.tipo_gasto || item.descripcion}
                      </Text>
                      <Text style={[styles.gastoDate, ds.textSecondary]}>
                        {formatDate(item.fecha)}
                      </Text>
                    </View>
                    <Text style={[styles.gastoMonto, { color: ds.accent }]}>
                      {formatCurrency(item.monto)}
                    </Text>
                    <View style={styles.gastoActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleEditClick(item.id)}>
                        <Text>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteClick(item.id)}>
                        <Text>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL CALENDARIO */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={[styles.calendarModal, ds.modalBg]}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: colors.textMuted },
              ]}
            />
            <Text style={[styles.modalTitle, ds.text]}>Seleccionar fecha</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: ds.accent },
              }}
              theme={{
                backgroundColor: colors.modalBg,
                calendarBackground: colors.modalBg,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: ds.accent,
                selectedDayTextColor: "#FFF",
                todayTextColor: ds.accent,
                dayTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                monthTextColor: colors.text,
                arrowColor: ds.accent,
              }}
              style={styles.calendar}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL AGREGAR/EDITAR */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            activeOpacity={1}
            onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={[styles.addModal, ds.modalBg]}>
                <View
                  style={[
                    styles.modalHandle,
                    { backgroundColor: colors.textMuted },
                  ]}
                />
                <Text style={[styles.modalTitle, ds.text]}>
                  {isEditing ? "Editar gasto" : "Nuevo gasto"}
                </Text>

                {selectedGasto && (
                  <View style={styles.selectedCat}>
                    <Text style={styles.selectedCatIcon}>
                      {GASTOS_CATEGORIAS.find((c) => c.id === selectedGasto)
                        ?.icon || "📦"}
                    </Text>
                    <Text style={[styles.selectedCatName, ds.text]}>
                      {GASTOS_CATEGORIAS.find((c) => c.id === selectedGasto)
                        ?.name || selectedGasto}
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>
                    Monto
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      ds.inputBg,
                      { borderColor: colors.border },
                    ]}>
                    <Text style={[styles.inputPrefix, ds.textSecondary]}>
                      $
                    </Text>
                    <TextInput
                      style={[styles.input, ds.text]}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, ds.textSecondary]}>
                    Fecha
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInput,
                      ds.inputBg,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setCalendarVisible(true), 300);
                    }}>
                    <Text style={[styles.dateInputText, ds.text]}>
                      {formatDate(editDate)}
                    </Text>
                    <Text>📅</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, ds.cardBg]}
                    onPress={closeModal}>
                    <Text style={[styles.cancelBtnText, ds.textSecondary]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { backgroundColor: ds.accent },
                      (!editValue || loading) && styles.saveBtnDisabled,
                    ]}
                    onPress={() => {
                      isEditing
                        ? handleSaveEdit()
                        : selectedGasto &&
                          handleAddGasto(selectedGasto, editValue);
                    }}
                    disabled={!editValue || loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {isEditing ? "Actualizar" : "Guardar"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER FIJO
  headerFixed: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "700", color: "#000" },

  // SCROLL
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 40 },

  // DATE SELECTOR
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  dateSelectorLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateIcon: { fontSize: 22 },
  dateLabel: { fontSize: 11, textTransform: "uppercase" },
  dateValue: { fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
  dateArrow: { fontSize: 22 },

  // SUMMARY
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 13 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  countText: { fontSize: 12, fontWeight: "600" },
  summaryTotal: { fontSize: 32, fontWeight: "700", letterSpacing: -1 },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  // CATEGORIES GRID
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginBottom: 20,
  },
  categoryItem: {
    width: ITEM_WIDTH,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryEmoji: { fontSize: 22 },
  categoryName: { fontSize: 10, textAlign: "center", paddingHorizontal: 2 },

  // EMPTY LIST
  emptyList: {
    padding: 30,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyListIcon: { fontSize: 36, marginBottom: 8 },
  emptyListText: { fontSize: 13 },

  // GASTO ITEM
  gastoItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  gastoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  gastoEmoji: { fontSize: 18 },
  gastoInfo: { flex: 1 },
  gastoName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  gastoDate: { fontSize: 11, textTransform: "capitalize" },
  gastoMonto: { fontSize: 15, fontWeight: "700", marginRight: 6 },
  gastoActions: { flexDirection: "row", gap: 2 },
  actionBtn: { padding: 6 },

  // EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },

  // MODALS
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  calendarModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  calendar: { borderRadius: 14 },
  addModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },

  selectedCat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  selectedCatIcon: { fontSize: 28 },
  selectedCatName: { fontSize: 16, fontWeight: "600" },

  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  inputPrefix: { fontSize: 18, fontWeight: "600", paddingLeft: 14 },
  input: { flex: 1, fontSize: 22, fontWeight: "600", padding: 14 },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  dateInputText: { fontSize: 15, textTransform: "capitalize" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
