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
import { verificarAutorizacion } from "../../services/vehiculoAutorizacionService";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;

const MANTENIMIENTO_SUBCATEGORIAS = [
  { id: "reparacion", name: "Reparación", emoji: "🔧", color: "#74B9FF" },
  { id: "llantas", name: "Llantas", emoji: "🛞", color: "#A29BFE" },
  { id: "lavado", name: "Lavado", emoji: "🧼", color: "#00CEC9" },
  { id: "aceite", name: "Aceite", emoji: "🛢️", color: "#FDCB6E" },
];

const GASTOS_CATEGORIAS = [
  { id: "combustible", name: "Combustible", emoji: "⛽", color: "#FFB800" },
  { id: "peajes", name: "Peajes", emoji: "🛣️", color: "#00D9A5" },
  { id: "comida", name: "Comida", emoji: "🍽️", color: "#FF6B6B" },
  { id: "hospedaje", name: "Hospedaje", emoji: "🏨", color: "#6C5CE7" },
  { id: "mantenimiento", name: "Manteni...", emoji: "🔧", color: "#74B9FF" },
  { id: "parqueadero", name: "Parqueo", emoji: "🅿️", color: "#FD79A8" },
  { id: "otros", name: "Otros", emoji: "📦", color: "#636E72" },
];

const ALL_CATEGORIAS = [...GASTOS_CATEGORIAS, ...MANTENIMIENTO_SUBCATEGORIAS];

export default function Gastos() {
  const { colors, isDark } = useTheme();
  const c = colors;
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
  const [mantenimientoVisible, setMantenimientoVisible] = useState(false);
  const [customDescription, setCustomDescription] = useState("");

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

      const { autorizado } = await verificarAutorizacion(user.id, placaActual);
      if (!autorizado) {
        Alert.alert(
          "Sin autorizacion",
          "No tienes autorizacion para registrar datos en este vehiculo. El propietario o administrador debe autorizarte primero."
        );
        return;
      }

      const gasto =
        ALL_CATEGORIAS.find((g) => g.id === id) ||
        gastosData.find((g) => g.id === id);
      if (!gasto) return;

      if (id === "otros" && !customDescription.trim()) {
        Alert.alert("Error", "Ingresa una descripción para el gasto");
        return;
      }

      const descripcion =
        id === "otros" ? customDescription.trim() : gasto.name;

      setLoading(true);
      try {
        const resultado = await agregarGasto({
          placa: placaActual,
          conductor_id: user.id,
          tipo_gasto: gasto.name,
          descripcion,
          monto: parseFloat(value),
          fecha: editDate,
          estado: "pendiente",
        });
        if (resultado.success) {
          Keyboard.dismiss();
          closeModal();
          Alert.alert("Éxito", "Gasto registrado");
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
        Alert.alert("Éxito", "Gasto actualizado");
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
    Alert.alert("Eliminar", "¿Eliminar este gasto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const resultado = await eliminarGasto(String(id));
            if (resultado.success) Alert.alert("Listo", "Eliminado");
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
    setCustomDescription("");
  };

  const openAddModal = (categoriaId: string) => {
    if (categoriaId === "mantenimiento") {
      setMantenimientoVisible(true);
      return;
    }
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
      day: "numeric",
      month: "short",
    });
  };

  const formatDateFriendly = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    const formatted = date.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getStatusColor = (estado?: string) => {
    if (estado === "aprobado") return c.success;
    return c.accent;
  };

  const getStatusLabel = (estado?: string) => {
    if (estado === "aprobado") return "Aprobado";
    return "Pendiente";
  };

  // Card border for dark mode glassmorphism effect
  const cardBorder = isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {};
  const shadow = getShadow(isDark, "md");

  if (!placaActual) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.emptyState}>
            <View style={[s.emptyIconContainer, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.accentLight }]}>
              <Text style={{ fontSize: 48 }}>🚛</Text>
            </View>
            <Text style={[s.emptyTitle, { color: c.text }]}>Sin vehículo seleccionado</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
              Selecciona una placa para registrar gastos
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerTitle, { color: c.text }]}>Gastos</Text>
            <TouchableOpacity
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
              style={[s.dateButton, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.cardBg, borderColor: isDark ? "rgba(255,255,255,0.12)" : c.border }]}>
              <Text style={s.dateButtonIcon}>📅</Text>
              <Text style={[s.headerDate, { color: c.text }]}>{formatDateFriendly(selectedDate)}</Text>
              <Text style={[s.dateArrow, { color: c.textMuted }]}>▾</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.placaBadge, { backgroundColor: c.accent }, shadow]}>
            <Text style={[s.placaText, { color: c.accentText }]}>{placaActual}</Text>
          </View>
        </View>

        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* RESUMEN CARD */}
            <View style={[
              s.summaryCard,
              { backgroundColor: isDark ? "rgba(0,217,165,0.08)" : c.cardBg },
              isDark ? { borderWidth: 1, borderColor: "rgba(0,217,165,0.2)" } : {},
              shadow,
            ]}>
              <View style={s.summaryTop}>
                <View>
                  <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Total del día</Text>
                  <Text style={[s.summaryTotal, { color: c.text }]}>{formatCurrency(totalGastos)}</Text>
                </View>
                <View style={[s.countBadge, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.incomeLight }]}>
                  <Text style={[s.countText, { color: c.income }]}>{gastosFiltrados.length}</Text>
                </View>
              </View>
              <View style={s.summaryBar}>
                <View style={[s.summaryBarFill, { backgroundColor: c.income, width: gastosFiltrados.length > 0 ? "100%" : "0%" }]} />
              </View>
            </View>

            {/* CATEGORÍAS */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Categorías</Text>
            <View style={s.categoriesGrid}>
              {GASTOS_CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.categoryCard,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                    cardBorder,
                    shadow,
                  ]}
                  onPress={() => openAddModal(cat.id)}
                  activeOpacity={0.7}>
                  <View style={[s.categoryCircle, { backgroundColor: `${cat.color}${isDark ? "25" : "15"}` }]}>
                    <Text style={{ fontSize: 28 }}>{cat.emoji}</Text>
                  </View>
                  <Text style={[s.categoryLabel, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LISTA DE GASTOS */}
            <View style={s.listHeader}>
              <Text style={[s.listTitle, { color: c.text }]}>Registrados</Text>
              <View style={[s.listCountBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}>
                <Text style={[s.listCountText, { color: c.textSecondary }]}>{gastosFiltrados.length}</Text>
              </View>
            </View>

            {gastosFiltrados.length === 0 ? (
              <View style={[s.emptyList, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : c.cardBg }, cardBorder, shadow]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>📭</Text>
                <Text style={[s.emptyListTitle, { color: c.text }]}>Sin gastos</Text>
                <Text style={[s.emptyListText, { color: c.textSecondary }]}>No hay gastos registrados este día</Text>
              </View>
            ) : (
              gastosFiltrados.map((item, index) => {
                const categoria = ALL_CATEGORIAS.find(
                  (cat) => cat.name.toLowerCase() === item.tipo_gasto?.toLowerCase(),
                );
                const statusColor = getStatusColor(item.estado);
                const statusLabel = getStatusLabel(item.estado);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[
                      s.gastoCard,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                      cardBorder,
                      shadow,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleEditClick(item.id)}
                    onLongPress={() => handleDeleteClick(item.id)}>
                    <View style={[s.gastoIconCircle, { backgroundColor: `${categoria?.color || c.accent}${isDark ? "25" : "15"}` }]}>
                      <Text style={{ fontSize: 24 }}>{categoria?.emoji || "📦"}</Text>
                    </View>
                    <View style={s.gastoInfo}>
                      <Text style={[s.gastoName, { color: c.text }]}>
                        {item.tipo_gasto || item.descripcion}
                      </Text>
                      <View style={s.gastoMeta}>
                        <View style={[s.gastoDatePill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                          <Text style={[s.gastoDateText, { color: c.textMuted }]}>{formatDate(item.fecha)}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: statusColor + (isDark ? "25" : "15") }]}>
                          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[s.gastoAmount, { color: c.text }]}>
                      {formatCurrency(item.monto)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL CALENDARIO */}
      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity style={[s.modalOverlay, { backgroundColor: c.overlay }]} activeOpacity={1} onPress={() => setCalendarVisible(false)}>
          <View style={[s.bottomModal, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
            <View style={[s.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : c.border }]} />
            <Text style={[s.modalTitle, { color: c.text }]}>Seleccionar fecha</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => { setSelectedDate(day.dateString); setCalendarVisible(false); }}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: c.income } }}
              theme={{
                backgroundColor: c.modalBg, calendarBackground: c.modalBg,
                textSectionTitleColor: c.textSecondary, selectedDayBackgroundColor: c.income,
                selectedDayTextColor: "#FFF", todayTextColor: c.income,
                dayTextColor: c.text, textDisabledColor: c.textMuted,
                monthTextColor: c.text, arrowColor: c.income,
              }}
              style={{ borderRadius: 14 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL MANTENIMIENTO */}
      <Modal visible={mantenimientoVisible} transparent animationType="slide" onRequestClose={() => setMantenimientoVisible(false)}>
        <TouchableOpacity style={[s.modalOverlay, { backgroundColor: c.overlay }]} activeOpacity={1} onPress={() => setMantenimientoVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[s.bottomModal, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
              <View style={[s.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : c.border }]} />
              <Text style={[s.modalTitle, { color: c.text }]}>Mantenimiento</Text>
              <View style={s.subCategoriesGrid}>
                {MANTENIMIENTO_SUBCATEGORIAS.map((sub) => (
                  <TouchableOpacity key={sub.id} onPress={() => { setMantenimientoVisible(false); setTimeout(() => openAddModal(sub.id), 300); }} activeOpacity={0.7} style={s.subCategoryItem}>
                    <View style={[s.subCategoryIcon, { backgroundColor: `${sub.color}${isDark ? "25" : "15"}` }]}>
                      <Text style={{ fontSize: 32 }}>{sub.emoji}</Text>
                    </View>
                    <Text style={[s.subCategoryName, { color: c.text }]}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL AGREGAR/EDITAR */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={[s.modalOverlay, { backgroundColor: c.overlay }]} activeOpacity={1} onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={[s.bottomModal, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
                <View style={[s.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : c.border }]} />
                <Text style={[s.modalTitle, { color: c.text }]}>{isEditing ? "Editar gasto" : "Nuevo gasto"}</Text>

                {selectedGasto && (() => {
                  const cat = ALL_CATEGORIAS.find((x) => x.id === selectedGasto);
                  return (
                    <View style={s.selectedCat}>
                      <View style={[s.selectedCatCircle, { backgroundColor: `${cat?.color || c.accent}${isDark ? "25" : "15"}` }]}>
                        <Text style={{ fontSize: 30 }}>{cat?.emoji || "📦"}</Text>
                      </View>
                      <Text style={[s.selectedCatName, { color: c.text }]}>{cat?.name || selectedGasto}</Text>
                    </View>
                  );
                })()}

                {selectedGasto === "otros" && !isEditing && (
                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: c.textSecondary }]}>Descripción</Text>
                    <View style={[s.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}>
                      <TextInput style={[s.customInput, { color: c.text }]} placeholder="Ej: Multa, Seguro, Perito..." placeholderTextColor={c.textMuted} value={customDescription} onChangeText={setCustomDescription} autoFocus />
                    </View>
                  </View>
                )}

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Monto</Text>
                  <View style={[s.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}>
                    <Text style={[s.inputPrefix, { color: c.text }]}>$</Text>
                    <TextInput style={[s.input, { color: c.text }]} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric" value={editValue} onChangeText={setEditValue} autoFocus={selectedGasto !== "otros"} />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Fecha</Text>
                  <TouchableOpacity style={[s.dateInput, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} onPress={() => { setModalVisible(false); setTimeout(() => setCalendarVisible(true), 300); }}>
                    <Text style={[s.dateInputText, { color: c.text }]}>{formatDate(editDate)}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 16 }}>📅</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.modalBtns}>
                  <TouchableOpacity style={[s.cancelBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} onPress={closeModal}>
                    <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: c.income }, (!editValue || loading || (selectedGasto === "otros" && !isEditing && !customDescription.trim())) && s.saveBtnDisabled]}
                    onPress={() => { isEditing ? handleSaveEdit() : selectedGasto && handleAddGasto(selectedGasto, editValue); }}
                    disabled={!editValue || loading || (selectedGasto === "otros" && !isEditing && !customDescription.trim())}>
                    {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.saveBtnText}>{isEditing ? "Actualizar" : "Guardar"}</Text>}
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

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    alignSelf: "flex-start" as const,
  },
  dateButtonIcon: { fontSize: 14 },
  headerDate: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" as const },
  dateArrow: { fontSize: 11 },
  placaBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },

  // SCROLL
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: HORIZONTAL_PADDING, paddingBottom: 40 },

  // SUMMARY
  summaryCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  summaryTotal: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  countBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  countText: { fontSize: 16, fontWeight: "800" },
  summaryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.15)",
    overflow: "hidden",
  },
  summaryBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // SECTION LABEL
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
  },

  // CATEGORIES
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  categoryCard: {
    width: (width - HORIZONTAL_PADDING * 2 - 10 * 3) / 4,
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryLabel: { fontSize: 10, textAlign: "center", fontWeight: "600" },

  // LIST HEADER
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  listTitle: { fontSize: 18, fontWeight: "700" },
  listCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  listCountText: { fontSize: 12, fontWeight: "700" },

  // GASTO CARD
  gastoCard: {
    borderRadius: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  gastoIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gastoInfo: { flex: 1 },
  gastoName: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  gastoMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  gastoDatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gastoDateText: { fontSize: 10, fontWeight: "600" },
  gastoAmount: { fontSize: 16, fontWeight: "800" },

  // STATUS
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  // EMPTY STATES
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIconContainer: { width: 88, height: 88, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  emptyList: { padding: 40, borderRadius: 22, alignItems: "center" },
  emptyListTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyListText: { fontSize: 13 },

  // MODALS
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  bottomModal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: 30, paddingHorizontal: 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  subCategoriesGrid: { flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 20 },
  subCategoryItem: { alignItems: "center" as const },
  subCategoryIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  subCategoryName: { fontSize: 13, fontWeight: "600" },
  selectedCat: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 },
  selectedCatCircle: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  selectedCatName: { fontSize: 17, fontWeight: "700" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1 },
  inputPrefix: { fontSize: 20, fontWeight: "700", paddingLeft: 14 },
  input: { flex: 1, fontSize: 22, fontWeight: "700", padding: 14 },
  customInput: { flex: 1, fontSize: 16, padding: 14 },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 14, borderWidth: 1 },
  dateInputText: { fontSize: 15, fontWeight: "500" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
