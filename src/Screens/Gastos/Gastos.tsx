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
import { useTheme } from "../../constants/Themecontext";
import { verificarAutorizacion } from "../../services/vehiculoAutorizacionService";
import { Ionicons } from "@expo/vector-icons";
import ItemIcon, { IconName } from "../../components/ItemIcon";

const { width } = Dimensions.get("window");
const H_PAD = 20;

const MANTENIMIENTO_SUBCATEGORIAS = [
  { id: "reparacion", name: "Reparación", iconName: "repair" as IconName, color: "#74B9FF" },
  { id: "llantas",   name: "Llantas",    iconName: "tire"   as IconName, color: "#A29BFE" },
  { id: "lavado",    name: "Lavado",     iconName: "wash"   as IconName, color: "#00CEC9" },
  { id: "aceite",    name: "Aceite",     iconName: "oil"    as IconName, color: "#FDCB6E" },
];

const GASTOS_CATEGORIAS = [
  { id: "combustible",  name: "Combustible", iconName: "fuel"    as IconName, color: "#FFB800" },
  { id: "peajes",       name: "Peajes",      iconName: "toll"    as IconName, color: "#00D9A5" },
  { id: "comida",       name: "Comida",      iconName: "food"    as IconName, color: "#FF6B6B" },
  { id: "hospedaje",    name: "Hospedaje",   iconName: "hotel"   as IconName, color: "#6C5CE7" },
  { id: "mantenimiento",name: "Manteni.",    iconName: "tool"    as IconName, color: "#74B9FF" },
  { id: "parqueadero",  name: "Parqueo",     iconName: "parking" as IconName, color: "#FD79A8" },
  { id: "otros",        name: "Otros",       iconName: "otros"   as IconName, color: "#636E72" },
];

const ALL_CATEGORIAS = [...GASTOS_CATEGORIAS, ...MANTENIMIENTO_SUBCATEGORIAS];

export default function Gastos() {
  const { colors: c, isDark } = useTheme();
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
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [placaActual]);

  const handleAddGasto = useCallback(
    async (id: string, value: string) => {
      if (!placaActual || !user?.id) {
        Alert.alert(
          "Error",
          !placaActual ? "Selecciona una placa primero" : "Usuario no identificado",
        );
        return;
      }

      const { autorizado } = await verificarAutorizacion(user.id, placaActual);
      if (!autorizado) {
        Alert.alert(
          "Sin autorización",
          "No tienes autorización para registrar datos en este vehículo.",
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

      const descripcion = id === "otros" ? customDescription.trim() : gasto.name;

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
    [agregarGasto, placaActual, editDate, user?.id, customDescription],
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

  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + (g.monto || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
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

  const getStatusColor = (estado?: string) =>
    estado === "aprobado" ? c.success : c.expense;

  const getStatusLabel = (estado?: string) =>
    estado === "aprobado" ? "Aprobado" : "Pendiente";

  // Shared card style — clean, no glassmorphism
  const card = {
    backgroundColor: c.cardBg,
    borderRadius: 16,
    ...(isDark ? { borderWidth: 1, borderColor: c.border } : {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    }),
  };

  if (!placaActual) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.emptyState}>
            <View style={[s.emptyIconWrap, { backgroundColor: c.expenseLight }]}>
              <Ionicons name="wallet-outline" size={40} color={c.expense} />
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
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: c.text }]}>Gastos</Text>
            <TouchableOpacity
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
              style={[s.dateBtn, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <Ionicons name="calendar-outline" size={14} color={c.textSecondary} />
              <Text style={[s.dateBtnText, { color: c.textSecondary }]}>
                {formatDateFriendly(selectedDate)}
              </Text>
              <Ionicons name="chevron-down" size={13} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={[s.placaBadge, { backgroundColor: c.accent }]}>
            <Text style={[s.placaText, { color: c.accentText }]}>{placaActual}</Text>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* RESUMEN */}
            <View style={[s.summaryCard, card]}>
              <View style={s.summaryRow}>
                <View>
                  <Text style={[s.summaryLabel, { color: c.textSecondary }]}>Total del día</Text>
                  <Text style={[s.summaryTotal, { color: c.text }]}>{formatCurrency(totalGastos)}</Text>
                </View>
                <View style={[s.countCircle, { backgroundColor: c.expenseLight }]}>
                  <Text style={[s.countNum, { color: c.expense }]}>{gastosFiltrados.length}</Text>
                </View>
              </View>
              <View style={[s.divider, { backgroundColor: c.border }]} />
              <View style={s.summaryFooter}>
                <Ionicons name="trending-down" size={14} color={c.expense} />
                <Text style={[s.summaryFooterText, { color: c.textSecondary }]}>
                  {gastosFiltrados.length === 0
                    ? "Sin gastos registrados hoy"
                    : `${gastosFiltrados.length} gasto${gastosFiltrados.length > 1 ? "s" : ""} registrado${gastosFiltrados.length > 1 ? "s" : ""}`}
                </Text>
              </View>
            </View>

            {/* CATEGORÍAS */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Categorías</Text>
            <View style={s.catGrid}>
              {GASTOS_CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catCard, card]}
                  onPress={() => openAddModal(cat.id)}
                  activeOpacity={0.7}>
                  <View style={[s.catCircle, { backgroundColor: cat.color + "18" }]}>
                    <ItemIcon name={cat.iconName} size={32} />
                  </View>
                  <Text style={[s.catLabel, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LISTA */}
            <View style={s.listHeader}>
              <Text style={[s.listTitle, { color: c.text }]}>Registros</Text>
              <View style={[s.listBadge, { backgroundColor: c.surface }]}>
                <Text style={[s.listBadgeText, { color: c.textSecondary }]}>
                  {gastosFiltrados.length}
                </Text>
              </View>
            </View>

            {gastosFiltrados.length === 0 ? (
              <View style={[s.emptyList, card]}>
                <View style={[s.emptyListIcon, { backgroundColor: c.surface }]}>
                  <Ionicons name="receipt-outline" size={28} color={c.textMuted} />
                </View>
                <Text style={[s.emptyListTitle, { color: c.text }]}>Sin gastos</Text>
                <Text style={[s.emptyListText, { color: c.textSecondary }]}>
                  No hay gastos registrados este día
                </Text>
              </View>
            ) : (
              gastosFiltrados.map((item, index) => {
                const categoria = ALL_CATEGORIAS.find(
                  (cat) => cat.name.toLowerCase() === item.tipo_gasto?.toLowerCase(),
                );
                const statusColor = getStatusColor(item.estado);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[s.gastoRow, card, { marginBottom: 10 }]}
                    activeOpacity={0.75}
                    onPress={() => handleEditClick(item.id)}
                    onLongPress={() => handleDeleteClick(item.id)}>
                    <View style={[s.gastoIconWrap, { backgroundColor: (categoria?.color || c.expense) + "18" }]}>
                      {categoria?.iconName
                        ? <ItemIcon name={categoria.iconName} size={26} />
                        : <Ionicons name="cube" size={20} color={c.expense} />
                      }
                    </View>
                    <View style={s.gastoInfo}>
                      <Text style={[s.gastoName, { color: c.text }]} numberOfLines={1}>
                        {item.descripcion || item.tipo_gasto}
                      </Text>
                      <View style={s.gastoMeta}>
                        <Text style={[s.gastoDate, { color: c.textMuted }]}>
                          {formatDate(item.fecha)}
                        </Text>
                        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[s.statusLabel, { color: statusColor }]}>
                          {getStatusLabel(item.estado)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.gastoAmount, { color: c.text }]}>
                      {formatCurrency(item.monto)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            <View style={{ height: 20 }} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL CALENDARIO */}
      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          style={[s.overlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderColor: c.border, borderWidth: 1 } : {}]}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.sheetTitle, { color: c.text }]}>Seleccionar fecha</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: c.expense } }}
              theme={{
                backgroundColor: c.modalBg,
                calendarBackground: c.modalBg,
                textSectionTitleColor: c.textSecondary,
                selectedDayBackgroundColor: c.expense,
                selectedDayTextColor: "#FFF",
                todayTextColor: c.expense,
                dayTextColor: c.text,
                textDisabledColor: c.textMuted,
                monthTextColor: c.text,
                arrowColor: c.expense,
              }}
              style={{ borderRadius: 12 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL MANTENIMIENTO */}
      <Modal
        visible={mantenimientoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMantenimientoVisible(false)}>
        <TouchableOpacity
          style={[s.overlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setMantenimientoVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderColor: c.border, borderWidth: 1 } : {}]}>
              <View style={[s.handle, { backgroundColor: c.border }]} />
              <Text style={[s.sheetTitle, { color: c.text }]}>Mantenimiento</Text>
              <View style={s.subGrid}>
                {MANTENIMIENTO_SUBCATEGORIAS.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => {
                      setMantenimientoVisible(false);
                      setTimeout(() => openAddModal(sub.id), 300);
                    }}
                    activeOpacity={0.7}
                    style={s.subItem}>
                    <View style={[s.subCircle, { backgroundColor: sub.color + "18" }]}>
                      <ItemIcon name={sub.iconName} size={36} />
                    </View>
                    <Text style={[s.subName, { color: c.text }]}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* MODAL AGREGAR / EDITAR */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[s.overlay, { backgroundColor: c.overlay }]}
            activeOpacity={1}
            onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderColor: c.border, borderWidth: 1 } : {}]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>
                  {isEditing ? "Editar gasto" : "Nuevo gasto"}
                </Text>

                {selectedGasto && (() => {
                  const cat = ALL_CATEGORIAS.find((x) => x.id === selectedGasto);
                  return (
                    <View style={s.selectedCat}>
                      <View style={[s.selectedCatCircle, { backgroundColor: (cat?.color || c.expense) + "18" }]}>
                        {cat?.iconName
                          ? <ItemIcon name={cat.iconName} size={32} />
                          : <Ionicons name="cube" size={26} color={cat?.color || c.expense} />
                        }
                      </View>
                      <Text style={[s.selectedCatName, { color: c.text }]}>
                        {cat?.name || selectedGasto}
                      </Text>
                    </View>
                  );
                })()}

                {selectedGasto === "otros" && !isEditing && (
                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: c.textSecondary }]}>Descripción</Text>
                    <View style={[s.inputRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <TextInput
                        style={[s.textInput, { color: c.text }]}
                        placeholder="Ej: Multa, Seguro..."
                        placeholderTextColor={c.textMuted}
                        value={customDescription}
                        onChangeText={setCustomDescription}
                        autoFocus
                      />
                    </View>
                  </View>
                )}

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Monto</Text>
                  <View style={[s.inputRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[s.inputPrefix, { color: c.textMuted }]}>$</Text>
                    <TextInput
                      style={[s.textInput, s.textInputLg, { color: c.text }]}
                      placeholder="0"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus={selectedGasto !== "otros"}
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Fecha</Text>
                  <TouchableOpacity
                    style={[s.inputRow, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setCalendarVisible(true), 300);
                    }}>
                    <Ionicons name="calendar-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
                    <Text style={[s.textInput, { color: c.text, paddingLeft: 0 }]}>{formatDate(editDate)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.modalBtns}>
                  <TouchableOpacity
                    style={[s.cancelBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={closeModal}>
                    <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.saveBtn,
                      { backgroundColor: c.text },
                      (!editValue || loading || (selectedGasto === "otros" && !isEditing && !customDescription.trim())) && { opacity: 0.35 },
                    ]}
                    onPress={() => {
                      isEditing ? handleSaveEdit() : selectedGasto && handleAddGasto(selectedGasto, editValue);
                    }}
                    disabled={!editValue || loading || (selectedGasto === "otros" && !isEditing && !customDescription.trim())}>
                    {loading
                      ? <ActivityIndicator color={c.primary} size="small" />
                      : <Text style={[s.saveBtnText, { color: c.primary }]}>{isEditing ? "Actualizar" : "Guardar"}</Text>
                    }
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
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginBottom: 8 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start" as const,
  },
  dateBtnText: { fontSize: 13, fontWeight: "500" },
  placaBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },

  // SCROLL
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingBottom: 32 },

  // SUMMARY
  summaryCard: { padding: 20, marginBottom: 24 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  summaryLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  summaryTotal: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  countCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  countNum: { fontSize: 18, fontWeight: "800" },
  divider: { height: 1, marginVertical: 16 },
  summaryFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryFooterText: { fontSize: 13, fontWeight: "500" },

  // SECTION
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // CATEGORIES
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  catCard: {
    width: (width - H_PAD * 2 - 10 * 3) / 4,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  catCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  catLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  // LIST HEADER
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  listTitle: { fontSize: 17, fontWeight: "700" },
  listBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listBadgeText: { fontSize: 12, fontWeight: "700" },

  // GASTO ROW
  gastoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  gastoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  gastoInfo: { flex: 1 },
  gastoName: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  gastoMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  gastoDate: { fontSize: 12 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  gastoAmount: { fontSize: 15, fontWeight: "800" },

  // EMPTY STATES
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyList: { padding: 32, alignItems: "center" },
  emptyListIcon: {
    width: 60, height: 60, borderRadius: 18,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  emptyListTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  emptyListText: { fontSize: 13, textAlign: "center" },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 20 },

  // MANTENIMIENTO SUB
  subGrid: { flexDirection: "row", justifyContent: "center", gap: 20, paddingBottom: 8 },
  subItem: { alignItems: "center" as const },
  subCircle: {
    width: 68, height: 68, borderRadius: 20,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  subName: { fontSize: 13, fontWeight: "600" },

  // SELECTED CATEGORY
  selectedCat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  selectedCatCircle: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  selectedCatName: { fontSize: 17, fontWeight: "700" },

  // INPUTS
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputPrefix: { fontSize: 18, fontWeight: "700", marginRight: 4 },
  textInput: { flex: 1, fontSize: 16, fontWeight: "500", paddingVertical: 12 },
  textInputLg: { fontSize: 22, fontWeight: "700" },

  // MODAL BUTTONS
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1, borderRadius: 14, padding: 16,
    alignItems: "center", borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700" },
});
