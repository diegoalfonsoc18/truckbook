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
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { gastosData } from "../../data/data";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";

const { width } = Dimensions.get("window");

// ✅ Tema Premium Oscuro - Consistente con Account
const COLORS = {
  primary: "#1A1A2E",
  secondary: "#16213E",
  accent: "#E94560",
  accentLight: "#FF6B6B",
  surface: "#0F0F1A",
  surfaceLight: "#1F1F35",
  text: "#FFFFFF",
  textSecondary: "#8A8A9A",
  textMuted: "#5A5A6A",
  border: "#2A2A40",
  success: "#00D9A5",
  warning: "#FFB800",
  danger: "#FF4757",
  cardBg: "rgba(31, 31, 53, 0.8)",
  inputBg: "#252540",
};

// ✅ Categorías de gastos con colores
const GASTOS_CATEGORIAS = [
  { id: "combustible", name: "Combustible", icon: "⛽", color: "#FFB800" },
  { id: "peajes", name: "Peajes", icon: "🛣️", color: "#00D9A5" },
  { id: "comida", name: "Comida", icon: "🍔", color: "#FF6B6B" },
  { id: "hospedaje", name: "Hospedaje", icon: "🏨", color: "#6C5CE7" },
  { id: "mantenimiento", name: "Mantenimiento", icon: "🔧", color: "#74B9FF" },
  { id: "llantas", name: "Llantas", icon: "🛞", color: "#A29BFE" },
  { id: "lavado", name: "Lavado", icon: "🧼", color: "#00CEC9" },
  { id: "parqueadero", name: "Parqueadero", icon: "🅿️", color: "#FD79A8" },
  { id: "otros", name: "Otros", icon: "📦", color: "#636E72" },
];

export default function Gastos() {
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

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;

  const isEditing = editId !== null;

  useEffect(() => {
    if (placaActual) {
      useGastosStore.getState().cargarGastosDelDB(placaActual);
    }
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [placaActual]);

  const handleAddGasto = useCallback(
    async (id: string, value: string) => {
      if (!placaActual) {
        Alert.alert("Error", "Por favor selecciona una placa primero");
        return;
      }
      if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado");
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
          Alert.alert("✅ Éxito", "Gasto registrado correctamente");
        } else {
          Alert.alert(
            "Error",
            resultado.error || "No se pudo agregar el gasto",
          );
        }
      } catch (err) {
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
    if (!editId || !editValue) {
      Alert.alert("Error", "Todos los campos son requeridos");
      return;
    }

    setLoading(true);
    try {
      const resultado = await actualizarGasto(editId, {
        monto: parseFloat(editValue),
        fecha: editDate,
      });

      if (resultado.success) {
        closeModal();
        Alert.alert("✅ Éxito", "Gasto actualizado correctamente");
      } else {
        Alert.alert("Error", resultado.error || "No se pudo actualizar");
      }
    } catch (err) {
      Alert.alert("Error", "Error al actualizar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string | number) => {
    Alert.alert(
      "🗑️ Eliminar Gasto",
      "¿Estás seguro de que deseas eliminar este gasto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: async () => {
            setLoading(true);
            try {
              const resultado = await eliminarGasto(String(id));
              if (resultado.success) {
                Alert.alert("✅ Éxito", "Gasto eliminado");
              } else {
                Alert.alert("Error", resultado.error || "No se pudo eliminar");
              }
            } catch (err) {
              Alert.alert("Error", "Error al eliminar");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ],
    );
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
    .filter((g) => g.placa === placaActual)
    .filter((g) => g.fecha === selectedDate);

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + (g.monto || 0),
    0,
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // ✅ Pantalla sin placa
  if (!placaActual) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🚛</Text>
          <Text style={styles.emptyTitle}>Sin vehículo seleccionado</Text>
          <Text style={styles.emptySubtitle}>
            Selecciona una placa para ver y registrar gastos
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* ✅ HEADER */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Gastos</Text>
                <Text style={styles.headerSubtitle}>Control de egresos</Text>
              </View>
              <View style={styles.placaBadge}>
                <Text style={styles.placaText}>{placaActual}</Text>
              </View>
            </View>

            {/* ✅ SELECTOR DE FECHA */}
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.dateSelectorLeft}>
                <Text style={styles.dateIcon}>📅</Text>
                <View>
                  <Text style={styles.dateLabel}>Fecha seleccionada</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(selectedDate)}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateArrow}>›</Text>
            </TouchableOpacity>

            {/* ✅ RESUMEN DEL DÍA */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>Resumen del día</Text>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>
                    {gastosFiltrados.length} gastos
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryTotal}>
                {formatCurrency(totalGastos)}
              </Text>
            </View>

            {/* ✅ CATEGORÍAS DE GASTOS */}
            <Text style={styles.sectionTitle}>Registrar gasto</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}>
              {GASTOS_CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => openAddModal(cat.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${cat.color}20` },
                    ]}>
                    <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ✅ LISTA DE GASTOS DEL DÍA */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Gastos registrados</Text>

              {gastosFiltrados.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListIcon}>📭</Text>
                  <Text style={styles.emptyListText}>
                    No hay gastos registrados este día
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={gastosFiltrados}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const categoria = GASTOS_CATEGORIAS.find(
                      (c) =>
                        c.name.toLowerCase() === item.tipo_gasto?.toLowerCase(),
                    );
                    return (
                      <View style={styles.gastoItem}>
                        <View
                          style={[
                            styles.gastoIcon,
                            {
                              backgroundColor: `${categoria?.color || COLORS.accent}20`,
                            },
                          ]}>
                          <Text style={styles.gastoEmoji}>
                            {categoria?.icon || "📦"}
                          </Text>
                        </View>
                        <View style={styles.gastoInfo}>
                          <Text style={styles.gastoName}>
                            {item.tipo_gasto || item.descripcion}
                          </Text>
                          <Text style={styles.gastoDate}>
                            {formatDate(item.fecha)}
                          </Text>
                        </View>
                        <Text style={styles.gastoMonto}>
                          {formatCurrency(item.monto)}
                        </Text>
                        <View style={styles.gastoActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditClick(item.id)}>
                            <Text style={styles.actionIcon}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteClick(item.id)}>
                            <Text style={styles.actionIcon}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </Animated.View>
        </SafeAreaView>

        {/* ✅ MODAL CALENDARIO */}
        <Modal
          visible={calendarVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCalendarVisible(false)}>
            <View style={styles.calendarModal}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Seleccionar fecha</Text>
              <Calendar
                current={selectedDate}
                onDayPress={(day: any) => {
                  setSelectedDate(day.dateString);
                  setCalendarVisible(false);
                }}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    selectedColor: COLORS.accent,
                  },
                }}
                theme={{
                  backgroundColor: COLORS.surfaceLight,
                  calendarBackground: COLORS.surfaceLight,
                  textSectionTitleColor: COLORS.textSecondary,
                  selectedDayBackgroundColor: COLORS.accent,
                  selectedDayTextColor: COLORS.text,
                  todayTextColor: COLORS.accent,
                  dayTextColor: COLORS.text,
                  textDisabledColor: COLORS.textMuted,
                  monthTextColor: COLORS.text,
                  arrowColor: COLORS.accent,
                }}
                style={styles.calendar}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ✅ MODAL AGREGAR/EDITAR GASTO */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={styles.addModal}>
                <View style={styles.modalHandle} />

                <Text style={styles.modalTitle}>
                  {isEditing ? "Editar gasto" : "Nuevo gasto"}
                </Text>

                {/* Categoría seleccionada */}
                {selectedGasto && (
                  <View style={styles.selectedCategory}>
                    <Text style={styles.selectedCategoryIcon}>
                      {GASTOS_CATEGORIAS.find((c) => c.id === selectedGasto)
                        ?.icon || "📦"}
                    </Text>
                    <Text style={styles.selectedCategoryName}>
                      {GASTOS_CATEGORIAS.find((c) => c.id === selectedGasto)
                        ?.name || selectedGasto}
                    </Text>
                  </View>
                )}

                {/* Input monto */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monto</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefix}>$</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Selector de fecha */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Fecha</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setCalendarVisible(true), 300);
                    }}>
                    <Text style={styles.dateInputText}>
                      {formatDate(editDate)}
                    </Text>
                    <Text style={styles.dateInputIcon}>📅</Text>
                  </TouchableOpacity>
                </View>

                {/* Botones */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeModal}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!editValue || loading) && styles.saveButtonDisabled,
                    ]}
                    onPress={() => {
                      if (isEditing) {
                        handleSaveEdit();
                      } else if (selectedGasto) {
                        handleAddGasto(selectedGasto, editValue);
                      }
                    }}
                    disabled={!editValue || loading}>
                    {loading ? (
                      <ActivityIndicator color={COLORS.text} size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {isEditing ? "Actualizar" : "Guardar"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // ✅ HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  // ✅ DATE SELECTOR
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateIcon: {
    fontSize: 24,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  dateArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
  },

  // ✅ SUMMARY CARD
  summaryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryBadge: {
    backgroundColor: COLORS.accent + "30",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "600",
  },
  summaryTotal: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -1,
  },

  // ✅ SECTION TITLE
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // ✅ CATEGORIES
  categoriesScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    alignItems: "center",
    width: 80,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ✅ LIST SECTION
  listSection: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyListIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyListText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  // ✅ GASTO ITEM
  gastoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gastoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gastoEmoji: {
    fontSize: 20,
  },
  gastoInfo: {
    flex: 1,
  },
  gastoName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  gastoDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  gastoMonto: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger,
    marginRight: 8,
  },
  gastoActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 16,
  },

  // ✅ EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ✅ MODAL OVERLAY
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },

  // ✅ CALENDAR MODAL
  calendarModal: {
    backgroundColor: COLORS.surfaceLight,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  calendar: {
    borderRadius: 16,
    overflow: "hidden",
  },

  // ✅ ADD/EDIT MODAL
  addModal: {
    backgroundColor: COLORS.surfaceLight,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },

  // ✅ SELECTED CATEGORY
  selectedCategory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  selectedCategoryIcon: {
    fontSize: 32,
  },
  selectedCategoryName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },

  // ✅ INPUT GROUP
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputPrefix: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textSecondary,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.text,
    padding: 16,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInputText: {
    fontSize: 16,
    color: COLORS.text,
    textTransform: "capitalize",
  },
  dateInputIcon: {
    fontSize: 20,
  },

  // ✅ MODAL BUTTONS
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});
