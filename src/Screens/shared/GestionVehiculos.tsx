import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { TipoCamion } from "../../store/VehiculoStore";
import supabase from "../../config/SupaBaseConfig";
import ItemIcon, { IconName } from "../../components/ItemIcon";
import {
  cargarTodosVehiculosConConductores,
  cargarVehiculosPropietarioConConductores,
} from "../../services/vehiculoAutorizacionService";

const { width } = Dimensions.get("window");

interface VehiculoInfo {
  placa: string;
  tipo_camion: string;
  conductoresCount: number;
  conductores: { nombre: string; estado: string }[];
}

const TIPOS_CAMION: {
  id: TipoCamion;
  label: string;
  iconName: IconName;
  color: string;
}[] = [
  { id: "estacas",  label: "Estacas",  iconName: "estacas",  color: "#00D9A5" },
  { id: "volqueta", label: "Volqueta", iconName: "volqueta2", color: "#FFB800" },
  { id: "furgon",   label: "Furgón",   iconName: "furgon",   color: "#6C5CE7" },
  { id: "grua",     label: "Grúa",     iconName: "grua",     color: "#E94560" },
  { id: "cisterna", label: "Cisterna", iconName: "cisterna", color: "#74B9FF" },
  { id: "planchon", label: "Planchón", iconName: "planchon", color: "#FDCB6E" },
];

function getTipoInfo(tipo: string) {
  return TIPOS_CAMION.find((t) => t.id === tipo) ?? TIPOS_CAMION[0];
}

function EstadoBadge({ estado }: { estado: string }) {
  const color =
    estado === "autorizado" ? "#00D9A5" :
    estado === "pendiente"  ? "#FFB800" : "#E94560";
  const label =
    estado === "autorizado" ? "Activo" :
    estado === "pendiente"  ? "Pendiente" : "Revocado";
  return (
    <View style={[eb.badge, { backgroundColor: color + "20" }]}>
      <View style={[eb.dot, { backgroundColor: color }]} />
      <Text style={[eb.text, { color }]}>{label}</Text>
    </View>
  );
}
const eb = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: "700" },
});

// ─── Main component ──────────────────────────────────────────────────────────

export default function GestionVehiculos() {
  const { colors: c, isDark } = useTheme();
  const shadow = getShadow(isDark, "md");
  const { user } = useAuth();
  const navigation = useNavigation();
  const role = useRoleStore((s) => s.role);

  const [vehiculos, setVehiculos] = useState<VehiculoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add modal
  const [addVisible, setAddVisible] = useState(false);
  const [nuevaPlaca, setNuevaPlaca] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TipoCamion>("estacas");
  const [guardando, setGuardando] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoInfo | null>(null);
  const [editTipo, setEditTipo] = useState<TipoCamion>("estacas");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─── Data loading ──────────────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    if (!user?.id) return;
    const { data } =
      role === "administrador"
        ? await cargarTodosVehiculosConConductores()
        : await cargarVehiculosPropietarioConConductores(user.id);

    setVehiculos(
      data.map((v) => ({
        placa: v.placa,
        tipo_camion: v.tipo_camion,
        conductoresCount: v.conductores.length,
        conductores: v.conductores.map((cc) => ({
          nombre: cc.nombre,
          estado: cc.estado,
        })),
      })),
    );
  }, [user?.id, role]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await cargarDatos();
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    };
    init();
  }, [cargarDatos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleAgregar = async () => {
    const placa = nuevaPlaca.trim().toUpperCase();
    if (placa.length < 3) {
      Alert.alert("Error", "La placa debe tener al menos 3 caracteres");
      return;
    }
    if (!user?.id) return;
    setGuardando(true);

    const { data: existe } = await supabase
      .from("vehiculos")
      .select("placa")
      .eq("placa", placa)
      .maybeSingle();

    if (existe) {
      Alert.alert("Error", "Este vehículo ya está registrado");
      setGuardando(false);
      return;
    }

    const { error: vError } = await supabase
      .from("vehiculos")
      .insert([{ placa, tipo_camion: nuevoTipo }]);

    if (vError) {
      Alert.alert("Error", "No se pudo registrar el vehículo");
      setGuardando(false);
      return;
    }

    await supabase.from("vehiculo_conductores").insert([{
      vehiculo_placa: placa,
      conductor_id: user.id,
      rol: "propietario",
      estado: "autorizado",
    }]);

    Alert.alert("✓ Registrado", `${placa} agregado a tu flota`);
    setAddVisible(false);
    setNuevaPlaca("");
    setNuevoTipo("estacas");
    setGuardando(false);
    await cargarDatos();
  };

  const handleGuardarEdicion = async () => {
    if (!vehiculoEditando) return;
    setGuardando(true);
    const { error } = await supabase
      .from("vehiculos")
      .update({ tipo_camion: editTipo })
      .eq("placa", vehiculoEditando.placa);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar");
    } else {
      setEditVisible(false);
      setVehiculoEditando(null);
      await cargarDatos();
    }
    setGuardando(false);
  };

  const handleEliminar = (v: VehiculoInfo) => {
    Alert.alert(
      "Eliminar vehículo",
      `¿Eliminar ${v.placa} y todas sus asignaciones?\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("vehiculo_conductores")
              .delete()
              .eq("vehiculo_placa", v.placa);
            const { error } = await supabase
              .from("vehiculos")
              .delete()
              .eq("placa", v.placa);
            if (error) Alert.alert("Error", "No se pudo eliminar");
            else await cargarDatos();
          },
        },
      ],
    );
  };

  // ─── Swipe delete action ───────────────────────────────────────────────────

  const renderRightActions = (
    prog: SharedValue<number>,
    drag: SharedValue<number>,
    v: VehiculoInfo,
  ) => {
    const animStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: drag.value + 80 }],
    }));
    return (
      <Reanimated.View style={[s.swipeDelete, animStyle]}>
        <TouchableOpacity
          style={s.swipeDeleteInner}
          onPress={() => handleEliminar(v)}>
          <Ionicons name="trash-outline" size={22} color="#FFF" />
          <Text style={s.swipeDeleteText}>Eliminar</Text>
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  // ─── Vehicle card ──────────────────────────────────────────────────────────

  const renderVehiculo = ({ item: v }: { item: VehiculoInfo }) => {
    const tipo = getTipoInfo(v.tipo_camion);
    const card = {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg,
      ...(isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : shadow),
    };
    const cardContent = (
      <View style={[s.card, card]}>
        {/* Card header */}
        <View style={s.cardHead}>
          <View style={[s.iconWrap, { backgroundColor: `${tipo.color}${isDark ? "25" : "15"}` }]}>
            <ItemIcon name={tipo.iconName} size={36} />
          </View>

          <View style={s.cardHeadInfo}>
            {/* Colombian plate */}
            <View style={s.plateOuter}>
              <Text style={s.plateText}>{v.placa}</Text>
            </View>
            <View style={[s.tipoChip, { backgroundColor: `${tipo.color}${isDark ? "25" : "15"}` }]}>
              <Text style={[s.tipoChipText, { color: tipo.color }]}>{tipo.label}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: c.accent + "15" }]}
            onPress={() => {
              setVehiculoEditando(v);
              setEditTipo(v.tipo_camion as TipoCamion);
              setEditVisible(true);
            }}>
            <Ionicons name="pencil-outline" size={15} color={c.accent} />
          </TouchableOpacity>
        </View>

        {/* Conductores */}
        {v.conductores.length > 0 ? (
          <View style={[s.conductoresSect, { borderTopColor: isDark ? "rgba(255,255,255,0.07)" : c.border }]}>
            <Text style={[s.conductoresLabel, { color: c.textMuted }]}>
              CONDUCTORES · {v.conductoresCount}
            </Text>
            {v.conductores.map((cc, i) => (
              <View key={i} style={s.conductorRow}>
                <View style={s.conductorAvatar}>
                  <Text style={s.conductorInitial}>{cc.nombre.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[s.conductorName, { color: c.text }]} numberOfLines={1}>
                  {cc.nombre}
                </Text>
                <EstadoBadge estado={cc.estado} />
              </View>
            ))}
          </View>
        ) : (
          <View style={[s.noConductores, { borderTopColor: isDark ? "rgba(255,255,255,0.07)" : c.border }]}>
            <Ionicons name="person-add-outline" size={14} color={c.textMuted} />
            <Text style={[s.noConductoresText, { color: c.textMuted }]}>
              Sin conductores asignados
            </Text>
          </View>
        )}
      </View>
    );

    return (
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={60}
        renderRightActions={(prog, drag) => renderRightActions(prog, drag, v)}
        overshootRight={false}
        containerStyle={s.swipeableContainer}>
        {cardContent}
      </ReanimatedSwipeable>
    );
  };

  // ─── Type selector (shared by add + edit modals) ───────────────────────────

  const TipoSelector = ({
    selected,
    onChange,
  }: {
    selected: TipoCamion;
    onChange: (t: TipoCamion) => void;
  }) => (
    <View style={s.tiposGrid}>
      {TIPOS_CAMION.map((t) => {
        const active = selected === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[
              s.tipoOption,
              {
                backgroundColor: active
                  ? `${t.color}${isDark ? "30" : "15"}`
                  : isDark ? "rgba(255,255,255,0.05)" : c.surface,
                borderColor: active ? t.color : c.border,
              },
            ]}
            onPress={() => onChange(t.id)}
            activeOpacity={0.75}>
            <View style={[s.tipoIconWrap, { backgroundColor: `${t.color}${isDark ? "20" : "12"}` }]}>
              <ItemIcon name={t.iconName} size={32} />
            </View>
            <Text style={[s.tipoLabel, { color: active ? t.color : c.text, fontWeight: active ? "700" : "500" }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.centered} edges={["top"]}>
          <ActivityIndicator size="large" color={c.accent} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>

        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : c.surface }]}
            onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.headerTitle, { color: c.text }]}>Mis Vehículos</Text>
            <Text style={[s.headerSub, { color: c.textSecondary }]}>
              {vehiculos.length} {vehiculos.length === 1 ? "vehículo registrado" : "vehículos registrados"}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: c.accent }]}
            onPress={() => setAddVisible(true)}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={s.addBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={vehiculos}
            keyExtractor={(item) => item.placa}
            renderItem={renderVehiculo}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
            }
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <View style={[s.emptyIconWrap, { backgroundColor: c.accentLight }]}>
                  <ItemIcon name="truck" size={52} />
                </View>
                <Text style={[s.emptyTitle, { color: c.text }]}>Sin vehículos</Text>
                <Text style={[s.emptySub, { color: c.textSecondary }]}>
                  Registra tu primer vehículo{"\n"}para comenzar a gestionar tu flota
                </Text>
                <TouchableOpacity
                  style={[s.emptyAction, { backgroundColor: c.accent }]}
                  onPress={() => setAddVisible(true)}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={s.emptyActionText}>Agregar vehículo</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </Animated.View>
      </SafeAreaView>

      {/* ── MODAL AGREGAR ──────────────────────────────────────────────────── */}
      <Modal
        visible={addVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[s.overlay, { backgroundColor: c.overlay }]}>
              <TouchableWithoutFeedback>
                <View
                  style={[
                    s.sheet,
                    { backgroundColor: c.modalBg },
                    isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {},
                  ]}>
                  <View style={[s.handle, { backgroundColor: c.border }]} />
                  <Text style={[s.sheetTitle, { color: c.text }]}>Nuevo vehículo</Text>
                  <Text style={[s.sheetSub, { color: c.textSecondary }]}>
                    Ingresa los datos de tu vehículo
                  </Text>

                  {/* Plate input */}
                  <Text style={[s.inputLabel, { color: c.textSecondary }]}>Placa</Text>
                  <View style={s.plateInputWrap}>
                    <TextInput
                      style={s.plateInput}
                      placeholder="ABC 123"
                      placeholderTextColor="#88888888"
                      value={nuevaPlaca}
                      onChangeText={(t) => setNuevaPlaca(t.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={7}
                      autoFocus
                    />
                  </View>

                  {/* Type selector */}
                  <Text style={[s.inputLabel, { color: c.textSecondary, marginTop: 20 }]}>
                    Tipo de vehículo
                  </Text>
                  <TipoSelector selected={nuevoTipo} onChange={setNuevoTipo} />

                  <TouchableOpacity
                    style={[
                      s.saveBtn,
                      { backgroundColor: c.accent },
                      (!nuevaPlaca.trim() || guardando) && { opacity: 0.4 },
                    ]}
                    onPress={handleAgregar}
                    disabled={!nuevaPlaca.trim() || guardando}>
                    {guardando
                      ? <ActivityIndicator color="#FFF" />
                      : <Text style={s.saveBtnText}>Registrar vehículo</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => { setAddVisible(false); setNuevaPlaca(""); }}>
                    <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL EDITAR ───────────────────────────────────────────────────── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[s.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  s.sheet,
                  { backgroundColor: c.modalBg },
                  isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" } : {},
                ]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>Editar vehículo</Text>

                {/* Plate display */}
                {vehiculoEditando && (
                  <View style={s.editPlateRow}>
                    <View style={s.plateOuter}>
                      <Text style={s.plateText}>{vehiculoEditando.placa}</Text>
                    </View>
                  </View>
                )}

                <Text style={[s.inputLabel, { color: c.textSecondary, marginTop: 16 }]}>
                  Tipo de vehículo
                </Text>
                <TipoSelector selected={editTipo} onChange={setEditTipo} />

                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    { backgroundColor: c.accent },
                    guardando && { opacity: 0.4 },
                  ]}
                  onPress={handleGuardarEdicion}
                  disabled={guardando}>
                  {guardando
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={s.saveBtnText}>Guardar cambios</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { setEditVisible(false); setVehiculoEditando(null); }}>
                  <Text style={[s.cancelBtnText, { color: c.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 0,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // LIST
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },

  // SWIPEABLE
  swipeableContainer: { marginBottom: 14 },
  swipeDelete: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
  swipeDeleteInner: {
    flex: 1,
    width: 80,
    backgroundColor: "#E94560",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  swipeDeleteText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  // CARD
  card: { borderRadius: 20, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  iconWrap: { width: 58, height: 58, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  cardHeadInfo: { flex: 1, gap: 6 },
  plateOuter: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
    alignSelf: "flex-start",
  },
  plateText: { fontSize: 15, fontWeight: "800", color: "#000", letterSpacing: 2 },
  tipoChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  tipoChipText: { fontSize: 12, fontWeight: "700" },
  actionBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },

  // CONDUCTORES
  conductoresSect: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  conductoresLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 2 },
  conductorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  conductorAvatar: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#6C5CE720", justifyContent: "center", alignItems: "center" },
  conductorInitial: { fontSize: 12, fontWeight: "700", color: "#6C5CE7" },
  conductorName: { flex: 1, fontSize: 13, fontWeight: "500" },
  noConductores: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  noConductoresText: { fontSize: 12 },

  // EMPTY
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 96, height: 96, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  emptyAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 14 },
  emptyActionText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 4, letterSpacing: -0.3 },
  sheetSub: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  editPlateRow: { alignItems: "center", marginBottom: 8 },

  // PLATE INPUT (Colombian style)
  inputLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 10 },
  plateInputWrap: {
    backgroundColor: "#FFE415",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#000",
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  plateInput: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 8,
    textAlign: "center",
    paddingVertical: 12,
    width: "100%",
  },

  // TIPO SELECTOR
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  tipoOption: {
    width: (width - 48 - 10) / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tipoIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  tipoLabel: { fontSize: 14 },

  // BUTTONS
  saveBtn: { borderRadius: 16, padding: 17, alignItems: "center", marginBottom: 10 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
