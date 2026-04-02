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
import { ingresosData } from "../../data/data";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { verificarAutorizacion } from "../../services/vehiculoAutorizacionService";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;

const INGRESOS_CATEGORIAS = [
  { id: "flete", name: "Flete", icon: "📦", color: "#00D9A5" },
  { id: "viaje", name: "Viaje", icon: "🚛", color: "#00B894" },
  { id: "bonificacion", name: "Bono", icon: "🎁", color: "#FFB800" },
  { id: "anticipo", name: "Anticipo", icon: "💵", color: "#74B9FF" },
  { id: "liquidacion", name: "Liquidac.", icon: "📋", color: "#A29BFE" },
  { id: "reembolso", name: "Reembolso", icon: "🔄", color: "#FD79A8" },
  { id: "otro", name: "Otro", icon: "💰", color: "#6C5CE7" },
];

export default function Ingresos() {
  const { colors, isDark } = useTheme();
  const c = colors;
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [selectedIngreso, setSelectedIngreso] = useState<string | null>(null);
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
      useIngresosStore.getState().cargarIngresosDelDB(placaActual);
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [placaActual]);

  const handleAddIngreso = useCallback(
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

      const ingreso =
        INGRESOS_CATEGORIAS.find((i) => i.id === id) ||
        ingresosData.find((i) => i.id === id);
      if (!ingreso) return;

      setLoading(true);
      try {
        const { error } = await supabase.from("conductor_ingresos").insert([
          {
            placa: placaActual,
            conductor_id: user.id,
            tipo_ingreso: ingreso.name,
            descripcion: ingreso.name,
            monto: parseFloat(value),
            fecha: editDate,
            estado: "confirmado",
          },
        ]);
        if (error) throw error;
        Keyboard.dismiss();
        closeModal();
        useIngresosStore.getState().cargarIngresosDelDB(placaActual);
        Alert.alert("Éxito", "Ingreso registrado");
      } catch {
        Alert.alert("Error", "Error al agregar el ingreso");
      } finally {
        setLoading(false);
      }
    },
    [placaActual, editDate, user?.id],
  );

  const handleEditClick = (id: string | number) => {
    const ingreso = ingresos.find((i) => i.id === String(id));
    if (ingreso) {
      setEditValue(String(ingreso.monto));
      setEditId(String(id));
      setEditDate(ingreso.fecha);
      setSelectedIngreso(ingreso.tipo_ingreso?.toLowerCase() || null);
      setModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editValue) return Alert.alert("Error", "Campos requeridos");
    setLoading(true);
    try {
      const { error } = await supabase
        .from("conductor_ingresos")
        .update({ monto: parseFloat(editValue), fecha: editDate })
        .eq("id", editId);
      if (error) throw error;
      closeModal();
      useIngresosStore.getState().cargarIngresosDelDB(placaActual!);
      Alert.alert("Éxito", "Ingreso actualizado");
    } catch {
      Alert.alert("Error", "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string | number) => {
    Alert.alert("Eliminar", "¿Eliminar este ingreso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase
              .from("conductor_ingresos")
              .delete()
              .eq("id", String(id));
            if (error) throw error;
            useIngresosStore.getState().cargarIngresosDelDB(placaActual!);
            Alert.alert("Listo", "Eliminado");
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
    setSelectedIngreso(null);
    setEditDate(selectedDate);
  };

  const openAddModal = (categoriaId: string) => {
    setSelectedIngreso(categoriaId);
    setEditId(null);
    setEditValue("");
    setEditDate(selectedDate);
    setModalVisible(true);
  };

  const ingresosFiltrados = ingresos
    .filter((i) => i.placa === placaActual && i.fecha === selectedDate)
    .filter((i, idx, self) => idx === self.findIndex((t) => t.id === i.id));

  const totalIngresos = ingresosFiltrados.reduce(
    (sum, i) => sum + (i.monto || 0),
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
    if (estado === "confirmado") return c.success;
    return c.accent;
  };

  const getStatusLabel = (estado?: string) => {
    if (estado === "confirmado") return "Confirmado";
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
            <View style={[s.emptyIconContainer, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.incomeLight }]}>
              <Text style={{ fontSize: 48 }}>🚛</Text>
            </View>
            <Text style={[s.emptyTitle, { color: c.text }]}>Sin vehículo seleccionado</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
              Selecciona una placa para registrar ingresos
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
            <Text style={[s.headerTitle, { color: c.text }]}>Ingresos</Text>
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
                  <Text style={[s.summaryTotal, { color: c.text }]}>{formatCurrency(totalIngresos)}</Text>
                </View>
                <View style={[s.countBadge, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.incomeLight }]}>
                  <Text style={[s.countText, { color: c.income }]}>{ingresosFiltrados.length}</Text>
                </View>
              </View>
              <View style={s.summaryBar}>
                <View style={[s.summaryBarFill, { backgroundColor: c.income, width: ingresosFiltrados.length > 0 ? "100%" : "0%" }]} />
              </View>
            </View>

            {/* CATEGORÍAS */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Categorías</Text>
            <View style={s.categoriesGrid}>
              {INGRESOS_CATEGORIAS.map((cat) => (
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
                    <Text style={{ fontSize: 28 }}>{cat.icon}</Text>
                  </View>
                  <Text style={[s.categoryLabel, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LISTA DE INGRESOS */}
            <View style={s.listHeader}>
              <Text style={[s.listTitle, { color: c.text }]}>Registrados</Text>
              <View style={[s.listCountBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}>
                <Text style={[s.listCountText, { color: c.textSecondary }]}>{ingresosFiltrados.length}</Text>
              </View>
            </View>

            {ingresosFiltrados.length === 0 ? (
              <View style={[s.emptyList, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : c.cardBg }, cardBorder, shadow]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>💸</Text>
                <Text style={[s.emptyListTitle, { color: c.text }]}>Sin ingresos</Text>
                <Text style={[s.emptyListText, { color: c.textSecondary }]}>No hay ingresos registrados este día</Text>
              </View>
            ) : (
              ingresosFiltrados.map((item, index) => {
                const categoria = INGRESOS_CATEGORIAS.find(
                  (cat) =>
                    cat.name.toLowerCase() === item.tipo_ingreso?.toLowerCase(),
                );
                const statusColor = getStatusColor(item.estado);
                const statusLabel = getStatusLabel(item.estado);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[
                      s.ingresoCard,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                      cardBorder,
                      shadow,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleEditClick(item.id)}
                    onLongPress={() => handleDeleteClick(item.id)}>
                    <View style={[s.ingresoIconCircle, { backgroundColor: `${categoria?.color || c.income}${isDark ? "25" : "15"}` }]}>
                      <Text style={{ fontSize: 24 }}>{categoria?.icon || "💰"}</Text>
                    </View>
                    <View style={s.ingresoInfo}>
                      <Text style={[s.ingresoName, { color: c.text }]}>
                        {item.tipo_ingreso || item.descripcion}
                      </Text>
                      <View style={s.ingresoMeta}>
                        <View style={[s.ingresoDatePill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                          <Text style={[s.ingresoDateText, { color: c.textMuted }]}>{formatDate(item.fecha)}</Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: statusColor + (isDark ? "25" : "15") }]}>
                          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[s.ingresoAmount, { color: c.text }]}>
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
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: c.income },
              }}
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

      {/* MODAL AGREGAR/EDITAR */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={[s.modalOverlay, { backgroundColor: c.overlay }]} activeOpacity={1} onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={[s.bottomModal, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
                <View style={[s.modalHandle, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : c.border }]} />
                <Text style={[s.modalTitle, { color: c.text }]}>
                  {isEditing ? "Editar ingreso" : "Nuevo ingreso"}
                </Text>

                {selectedIngreso && (() => {
                  const cat = INGRESOS_CATEGORIAS.find((cat) => cat.id === selectedIngreso);
                  return (
                    <View style={s.selectedCat}>
                      <View style={[s.selectedCatCircle, { backgroundColor: `${cat?.color || c.income}${isDark ? "25" : "15"}` }]}>
                        <Text style={{ fontSize: 30 }}>{cat?.icon || "💰"}</Text>
                      </View>
                      <Text style={[s.selectedCatName, { color: c.text }]}>
                        {cat?.name || selectedIngreso}
                      </Text>
                    </View>
                  );
                })()}

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Monto</Text>
                  <View style={[s.inputWrapper, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}>
                    <Text style={[s.inputPrefix, { color: c.text }]}>$</Text>
                    <TextInput
                      style={[s.input, { color: c.text }]}
                      placeholder="0"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Fecha</Text>
                  <TouchableOpacity
                    style={[s.dateInput, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setCalendarVisible(true), 300);
                    }}>
                    <Text style={[s.dateInputText, { color: c.text }]}>{formatDate(editDate)}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 16 }}>📅</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.modalBtns}>
                  <TouchableOpacity style={[s.cancelBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface, borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} onPress={closeModal}>
                    <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.saveBtn, { backgroundColor: c.income }, (!editValue || loading) && s.saveBtnDisabled]}
                    onPress={() => {
                      isEditing
                        ? handleSaveEdit()
                        : selectedIngreso &&
                          handleAddIngreso(selectedIngreso, editValue);
                    }}
                    disabled={!editValue || loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={s.saveBtnText}>
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

  // INGRESO CARD
  ingresoCard: {
    borderRadius: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  ingresoIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ingresoInfo: { flex: 1 },
  ingresoName: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  ingresoMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  ingresoDatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ingresoDateText: { fontSize: 10, fontWeight: "600" },
  ingresoAmount: { fontSize: 16, fontWeight: "800" },

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
  selectedCat: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 },
  selectedCatCircle: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  selectedCatName: { fontSize: 17, fontWeight: "700" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1 },
  inputPrefix: { fontSize: 20, fontWeight: "700", paddingLeft: 14 },
  input: { flex: 1, fontSize: 22, fontWeight: "700", padding: 14 },
  dateInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 14, borderWidth: 1 },
  dateInputText: { fontSize: 15, fontWeight: "500" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
