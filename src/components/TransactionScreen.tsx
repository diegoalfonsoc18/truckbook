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
import { Ionicons } from "@expo/vector-icons";
import ItemIcon, { IconName } from "./ItemIcon";
import { useTheme, getShadow } from "../constants/Themecontext";

const { width } = Dimensions.get("window");
const H_PAD = 20;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Categoria {
  id: string;
  name: string;
  iconName: IconName;
  color: string;
  size: number;
}

export interface Transaction {
  id: string;
  placa: string;
  tipo: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: string;
}

export interface TransactionScreenProps {
  title: string;
  placaActual: string | null;
  categorias: Categoria[];
  subcategorias?: Categoria[];          // ej: mantenimiento en Gastos
  transactions: Transaction[];
  accentColor: string;
  accentColorLight: string;
  emptyIcon?: string;                   // emoji fallback
  hasCustomDescription?: boolean;       // "otros" en Gastos
  onAdd: (
    categoriaId: string,
    monto: string,
    fecha: string,
    descripcion?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (
    id: string,
    monto: string,
    fecha: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  getStatusColor: (estado?: string) => string;
  getStatusLabel: (estado?: string) => string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TransactionScreen({
  title,
  placaActual,
  categorias,
  subcategorias,
  transactions,
  accentColor,
  accentColorLight,
  emptyIcon = "💸",
  hasCustomDescription = false,
  onAdd,
  onUpdate,
  onDelete,
  getStatusColor,
  getStatusLabel,
}: TransactionScreenProps) {
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "md");

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState(selectedDate);
  const [customDescription, setCustomDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isEditing = editId !== null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  const allCategorias = subcategorias
    ? [...categorias, ...subcategorias]
    : categorias;

  const filtered = transactions
    .filter((t) => t.placa === placaActual && t.fecha === selectedDate)
    .filter((t, i, self) => i === self.findIndex((x) => x.id === t.id));

  const total = filtered.reduce((sum, t) => sum + (t.monto || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(v);

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });

  const formatDateFriendly = (d: string) => {
    const f = new Date(d + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditId(null);
    setEditValue("");
    setSelectedCat(null);
    setEditDate(selectedDate);
    setCustomDescription("");
  };

  const openAdd = (catId: string) => {
    if (subcategorias && catId === "mantenimiento") {
      setSubModalVisible(true);
      return;
    }
    setSelectedCat(catId);
    setEditId(null);
    setEditValue("");
    setEditDate(selectedDate);
    setModalVisible(true);
  };

  const openEdit = (id: string) => {
    const t = transactions.find((x) => x.id === id);
    if (!t) return;
    setEditValue(String(t.monto));
    setEditId(id);
    setEditDate(t.fecha);
    setSelectedCat(t.tipo?.toLowerCase() || null);
    setModalVisible(true);
  };

  const handleSave = useCallback(async () => {
    if (!editValue) return Alert.alert("Error", "Ingresa un monto");
    setLoading(true);
    try {
      const result = isEditing
        ? await onUpdate(editId!, editValue, editDate)
        : selectedCat
          ? await onAdd(selectedCat, editValue, editDate, customDescription)
          : { success: false, error: "Sin categoría" };

      if (result.success) {
        Keyboard.dismiss();
        closeModal();
        Alert.alert("Éxito", isEditing ? "Actualizado" : "Registrado");
      } else {
        Alert.alert("Error", result.error || "No se pudo guardar");
      }
    } catch {
      Alert.alert("Error", "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  }, [editValue, editId, editDate, selectedCat, customDescription, isEditing]);

  const handleDelete = (id: string) => {
    Alert.alert("Eliminar", "¿Eliminar este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const result = await onDelete(id);
          if (!result.success)
            Alert.alert("Error", result.error || "No se pudo eliminar");
          setLoading(false);
        },
      },
    ]);
  };

  // ─── Card style ────────────────────────────────────────────────────────────
  const card = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg,
    borderRadius: 20,
    ...(isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {}),
    ...shadow,
  };

  const inputStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : c.border,
  };

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (!placaActual) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.emptyState}>
            <View style={[s.emptyIconWrap, { backgroundColor: accentColorLight }]}>
              <Text style={{ fontSize: 40 }}>🚛</Text>
            </View>
            <Text style={[s.emptyTitle, { color: c.text }]}>
              Sin vehículo seleccionado
            </Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
              Selecciona una placa para registrar {title.toLowerCase()}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>

        {/* HEADER */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: c.text }]}>{title}</Text>
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
          <View style={[s.placaBadge, { backgroundColor: accentColor }]}>
            <Text style={[s.placaText, { color: "#fff" }]}>{placaActual}</Text>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* SUMMARY CARD */}
            <View
              style={[
                s.summaryCard,
                {
                  backgroundColor: isDark
                    ? `${accentColor}14`
                    : c.cardBg,
                },
                isDark
                  ? { borderWidth: 1, borderColor: `${accentColor}33` }
                  : shadow,
              ]}>
              <View style={s.summaryTop}>
                <View>
                  <Text style={[s.summaryLabel, { color: c.textSecondary }]}>
                    Total del día
                  </Text>
                  <Text style={[s.summaryTotal, { color: c.text }]}>
                    {formatCurrency(total)}
                  </Text>
                </View>
                <View style={[s.countBadge, { backgroundColor: `${accentColor}20` }]}>
                  <Text style={[s.countText, { color: accentColor }]}>
                    {filtered.length}
                  </Text>
                </View>
              </View>
              <View style={s.summaryBar}>
                <View
                  style={[
                    s.summaryBarFill,
                    {
                      backgroundColor: accentColor,
                      width: filtered.length > 0 ? "100%" : "0%",
                    },
                  ]}
                />
              </View>
            </View>

            {/* CATEGORIES */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>
              Categorías
            </Text>
            <View style={s.catGrid}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catCard, card]}
                  onPress={() => openAdd(cat.id)}
                  activeOpacity={0.75}>
                  <View
                    style={[
                      s.catCircle,
                      { backgroundColor: `${cat.color}${isDark ? "25" : "15"}` },
                    ]}>
                    <ItemIcon name={cat.iconName} size={cat.size} />
                  </View>
                  <Text style={[s.catLabel, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* LIST */}
            <View style={s.listHeader}>
              <Text style={[s.listTitle, { color: c.text }]}>Registros</Text>
              <View style={[s.listBadge, { backgroundColor: c.surface }]}>
                <Text style={[s.listBadgeText, { color: c.textSecondary }]}>
                  {filtered.length}
                </Text>
              </View>
            </View>

            {filtered.length === 0 ? (
              <View style={[s.emptyList, card, { padding: 36 }]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>{emptyIcon}</Text>
                <Text style={[s.emptyListTitle, { color: c.text }]}>
                  Sin registros
                </Text>
                <Text style={[s.emptyListText, { color: c.textSecondary }]}>
                  No hay {title.toLowerCase()} registrados hoy
                </Text>
              </View>
            ) : (
              filtered.map((item, index) => {
                const cat = allCategorias.find(
                  (x) => x.name.toLowerCase() === item.tipo?.toLowerCase(),
                );
                const statusColor = getStatusColor(item.estado);
                return (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    style={[s.row, card, { marginBottom: 10 }]}
                    activeOpacity={0.8}
                    onPress={() => openEdit(item.id)}
                    onLongPress={() => handleDelete(item.id)}>
                    <View
                      style={[
                        s.rowIconWrap,
                        { backgroundColor: `${cat?.color || accentColor}${isDark ? "25" : "15"}` },
                      ]}>
                      {cat?.iconName ? (
                        <ItemIcon name={cat.iconName} size={cat.size ?? 26} />
                      ) : (
                        <Ionicons name="cash" size={22} color={accentColor} />
                      )}
                    </View>
                    <View style={s.rowInfo}>
                      <Text style={[s.rowName, { color: c.text }]} numberOfLines={1}>
                        {item.descripcion || item.tipo}
                      </Text>
                      <View style={s.rowMeta}>
                        <View style={[s.datePill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                          <Text style={[s.datePillText, { color: c.textMuted }]}>
                            {formatDate(item.fecha)}
                          </Text>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: `${statusColor}${isDark ? "25" : "15"}` }]}>
                          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[s.statusText, { color: statusColor }]}>
                            {getStatusLabel(item.estado)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[s.rowAmount, { color: c.text }]}>
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

      {/* ── MODAL CALENDARIO ─────────────────────────────────────────────── */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}>
        <TouchableOpacity
          style={[s.overlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}>
          <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.sheetTitle, { color: c.text }]}>Seleccionar fecha</Text>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: accentColor } }}
              theme={{
                backgroundColor: c.modalBg,
                calendarBackground: c.modalBg,
                textSectionTitleColor: c.textSecondary,
                selectedDayBackgroundColor: accentColor,
                selectedDayTextColor: "#FFF",
                todayTextColor: accentColor,
                dayTextColor: c.text,
                textDisabledColor: c.textMuted,
                monthTextColor: c.text,
                arrowColor: accentColor,
              }}
              style={{ borderRadius: 14 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL SUBCATEGORÍAS (ej: mantenimiento) ──────────────────────── */}
      {subcategorias && (
        <Modal
          visible={subModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSubModalVisible(false)}>
          <TouchableOpacity
            style={[s.overlay, { backgroundColor: c.overlay }]}
            activeOpacity={1}
            onPress={() => setSubModalVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>Mantenimiento</Text>
                <View style={s.subGrid}>
                  {subcategorias.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => {
                        setSubModalVisible(false);
                        setTimeout(() => openAdd(sub.id), 300);
                      }}
                      activeOpacity={0.75}
                      style={s.subItem}>
                      <View style={[s.subCircle, { backgroundColor: `${sub.color}${isDark ? "25" : "15"}` }]}>
                        <ItemIcon name={sub.iconName} size={sub.size} />
                      </View>
                      <Text style={[s.subName, { color: c.text }]}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── MODAL AGREGAR / EDITAR ────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableOpacity
            style={[s.overlay, { backgroundColor: c.overlay }]}
            activeOpacity={1}
            onPress={closeModal}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { backgroundColor: c.modalBg }, isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {}]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>
                  {isEditing ? `Editar ${title.slice(0, -1).toLowerCase()}` : `Nuevo ${title.slice(0, -1).toLowerCase()}`}
                </Text>

                {/* Categoría seleccionada */}
                {selectedCat && (() => {
                  const cat = allCategorias.find((x) => x.id === selectedCat);
                  return (
                    <View style={s.selectedCat}>
                      <View style={[s.selectedCatCircle, { backgroundColor: `${cat?.color || accentColor}${isDark ? "25" : "15"}` }]}>
                        {cat?.iconName
                          ? <ItemIcon name={cat.iconName} size={cat.size ?? 32} />
                          : <Ionicons name="cash" size={28} color={accentColor} />}
                      </View>
                      <Text style={[s.selectedCatName, { color: c.text }]}>
                        {cat?.name || selectedCat}
                      </Text>
                    </View>
                  );
                })()}

                {/* Descripción personalizada (ej: "otros") */}
                {hasCustomDescription && selectedCat === "otros" && !isEditing && (
                  <View style={s.inputGroup}>
                    <Text style={[s.inputLabel, { color: c.textSecondary }]}>Descripción</Text>
                    <View style={[s.inputRow, inputStyle]}>
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

                {/* Monto */}
                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Monto</Text>
                  <View style={[s.inputRow, inputStyle]}>
                    <Text style={[s.inputPrefix, { color: c.textMuted }]}>$</Text>
                    <TextInput
                      style={[s.textInput, s.textInputLg, { color: c.text }]}
                      placeholder="0"
                      placeholderTextColor={c.textMuted}
                      keyboardType="numeric"
                      value={editValue}
                      onChangeText={setEditValue}
                      autoFocus={!(hasCustomDescription && selectedCat === "otros")}
                    />
                  </View>
                </View>

                {/* Fecha */}
                <View style={s.inputGroup}>
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Fecha</Text>
                  <TouchableOpacity
                    style={[s.inputRow, inputStyle]}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setCalendarVisible(true), 300);
                    }}>
                    <Ionicons name="calendar-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
                    <Text style={[s.textInput, { color: c.text, paddingLeft: 0 }]}>
                      {formatDate(editDate)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Botones */}
                <View style={s.modalBtns}>
                  <TouchableOpacity
                    style={[s.cancelBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={closeModal}>
                    <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      s.saveBtn,
                      { backgroundColor: accentColor },
                      (!editValue || loading || (hasCustomDescription && selectedCat === "otros" && !isEditing && !customDescription.trim())) && { opacity: 0.35 },
                    ]}
                    onPress={handleSave}
                    disabled={!editValue || loading || (hasCustomDescription && selectedCat === "otros" && !isEditing && !customDescription.trim())}>
                    {loading
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <Text style={s.saveBtnText}>{isEditing ? "Actualizar" : "Guardar"}</Text>}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  scrollContent: { paddingHorizontal: H_PAD, paddingBottom: 110 },

  // SUMMARY
  summaryCard: { borderRadius: 22, padding: 20, marginBottom: 24 },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  summaryTotal: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  countBadge: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  countText: { fontSize: 16, fontWeight: "800" },
  summaryBar: { height: 4, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.15)", overflow: "hidden" },
  summaryBarFill: { height: 4, borderRadius: 2 },

  // SECTION
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // CATEGORIES
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  catCard: {
    width: (width - H_PAD * 2 - 10 * 3) / 4,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  catCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  catLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  // LIST
  listHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  listTitle: { fontSize: 17, fontWeight: "700" },
  listBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  listBadgeText: { fontSize: 12, fontWeight: "700" },

  // ROW
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "600", marginBottom: 5 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  datePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  datePillText: { fontSize: 10, fontWeight: "600" },
  rowAmount: { fontSize: 15, fontWeight: "800" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  // EMPTY
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  emptyList: { alignItems: "center" },
  emptyListTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptyListText: { fontSize: 13, textAlign: "center" },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingBottom: 36, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 20 },

  // SUB MODAL
  subGrid: { flexDirection: "row", justifyContent: "center", gap: 20, paddingBottom: 8 },
  subItem: { alignItems: "center" as const },
  subCircle: { width: 68, height: 68, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  subName: { fontSize: 13, fontWeight: "600" },

  // SELECTED CATEGORY
  selectedCat: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 },
  selectedCatCircle: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  selectedCatName: { fontSize: 17, fontWeight: "700" },

  // INPUTS
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, minHeight: 50 },
  inputPrefix: { fontSize: 18, fontWeight: "700", marginRight: 4 },
  textInput: { flex: 1, fontSize: 16, fontWeight: "500", paddingVertical: 12 },
  textInputLg: { fontSize: 22, fontWeight: "700" },

  // BUTTONS
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});
