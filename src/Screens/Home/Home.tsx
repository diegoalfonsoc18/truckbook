import React, { useState, ComponentType, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import supabase from "../../config/SupaBaseConfig";
import {
  VolquetaIcon,
  EstacasIcon,
  FurgonIcon,
  GruaIcon,
} from "../../assets/icons/icons";
import {
  cargarVehiculosConEstado,
  registrarVehiculoPropietario,
  solicitarAccesoVehiculo,
  type EstadoAutorizacion,
} from "../../services/vehiculoAutorizacionService";

const { width } = Dimensions.get("window");

const COLORS = {
  bg: "#111111",
  card: "#1E1E1E",
  cardActive: "#252525",
  input: "#252525",
  accent: "#FFE500",
  accentText: "#000000",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  textMuted: "#3A3A3C",
  border: "#2C2C2C",
  overlay: "rgba(0,0,0,0.75)",
  danger: "#E94560",
  warning: "#FFB800",
  success: "#00D9A5",
};

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

import type { Item } from "./Items";
export type { Item } from "./Items";

interface HomeBaseAdaptedProps {
  items: Item[];
  showCamionHeader?: boolean;
  renderBadge?: (item: Item) => React.ReactNode;
  onItemPress?: (item: Item) => void;
}

interface Vehiculo {
  id: string;
  placa: string;
  tipo_camion: TipoCamion;
  estado?: EstadoAutorizacion;
  rol?: string;
  conductorNombre?: string;
}

const ICON_MAP: Record<TipoCamion, ComponentType<IconProps>> = {
  estacas: EstacasIcon,
  volqueta: VolquetaIcon,
  furgon: FurgonIcon,
  grua: GruaIcon,
};

const TIPOS_CAMION = [
  { id: "estacas" as TipoCamion, label: "Estacas", icon: EstacasIcon, color: "#00D9A5" },
  { id: "volqueta" as TipoCamion, label: "Volqueta", icon: VolquetaIcon, color: "#FFB800" },
  { id: "furgon" as TipoCamion, label: "Furgón", icon: FurgonIcon, color: "#6C5CE7" },
  { id: "grua" as TipoCamion, label: "Grúa", icon: GruaIcon, color: "#E94560" },
];

export default function HomeBaseAdapted({
  items,
  showCamionHeader = true,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
  const navigation = useNavigation<any>();
  const { placa: placaActual, tipoCamion, setPlaca, setTipoCamion } = useVehiculoStore();
  const { user } = useAuth();
  const role = useRoleStore((state) => state.role);

  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [modalPlacaVisible, setModalPlacaVisible] = useState(false);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [conductorActual, setConductorActual] = useState<string | undefined>();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) cargarVehiculos();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [user?.id]);

  const cargarVehiculos = async () => {
    if (!user?.id) return;
    setCargando(true);
    try {
      const { data, error } = await cargarVehiculosConEstado(user.id);
      if (error) throw error;

      const vehiculosConConductor = await Promise.all(
        (data || []).map(async (v) => {
          let conductorNombre: string | undefined;
          const { data: relaciones } = await supabase
            .from("vehiculo_conductores")
            .select("conductor_id")
            .eq("vehiculo_placa", v.placa)
            .eq("rol", "conductor")
            .eq("estado", "autorizado")
            .limit(1);

          if (relaciones?.length > 0) {
            const { data: usuario } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("user_id", relaciones[0].conductor_id)
              .maybeSingle();
            conductorNombre = usuario?.nombre;
          }

          return {
            id: v.relacion_id,
            placa: v.placa,
            tipo_camion: v.tipo_camion as TipoCamion,
            estado: v.estado,
            rol: v.rol,
            conductorNombre,
          };
        }),
      );

      setVehiculos(vehiculosConConductor);
      if (placaActual) {
        const actual = vehiculosConConductor.find((v) => v.placa === placaActual);
        if (actual) setConductorActual(actual.conductorNombre);
      }
    } catch (err) {
      console.error("Error cargando vehículos:", err);
    } finally {
      setCargando(false);
    }
  };

  const getTipoCamionData = (tipo: TipoCamion | null) =>
    TIPOS_CAMION.find((t) => t.id === tipo);

  const handleSeleccionarVehiculo = (vehiculo: Vehiculo) => {
    if (vehiculo.estado === "pendiente") {
      Alert.alert("Esperando autorización", "El propietario aún no ha autorizado tu acceso.");
      return;
    }
    if (vehiculo.estado === "rechazado") {
      Alert.alert("Acceso denegado", "El propietario rechazó tu solicitud.");
      return;
    }
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
    setConductorActual(vehiculo.conductorNombre);
    setModalVehiculosVisible(false);
  };

  const handleSeleccionarTipo = (tipo: TipoCamion) => {
    setTipoCamion(tipo);
    setModalTipoVisible(false);
    setModalPlacaVisible(true);
  };

  const handleGuardarPlaca = async () => {
    const placaLimpia = placaTemporal.trim().toUpperCase();
    if (!placaLimpia || placaLimpia.length < 3) {
      Alert.alert("Error", "La placa debe tener al menos 3 caracteres");
      return;
    }
    if (!user?.id || !tipoCamion) {
      Alert.alert("Error", "Datos incompletos");
      return;
    }
    try {
      setCargando(true);
      if (role === "propietario") {
        const resultado = await registrarVehiculoPropietario(user.id, placaLimpia, tipoCamion);
        if (!resultado.success) { Alert.alert("Error", resultado.error || "No se pudo registrar"); return; }
        Alert.alert("Éxito", `Vehículo ${placaLimpia} registrado`);
        await cargarVehiculos();
        setPlaca(placaLimpia);
      } else {
        const resultado = await solicitarAccesoVehiculo(user.id, placaLimpia);
        if (!resultado.success) { Alert.alert("Error", resultado.error || "No se pudo solicitar"); return; }
        Alert.alert("Solicitud enviada", `Se envió la solicitud al vehículo ${placaLimpia}.`);
        await cargarVehiculos();
      }
      setModalPlacaVisible(false);
      setPlacaTemporal("");
    } catch {
      Alert.alert("Error", "No se pudo procesar la solicitud");
    } finally {
      setCargando(false);
    }
  };

  const tipoCamionData = getTipoCamionData(tipoCamion);
  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userName = user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.greeting}>
                <Text style={styles.greetingSmall}>Bienvenido de vuelta</Text>
                <Text style={styles.greetingName} numberOfLines={1}>{userName}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => navigation.navigate("Cuenta")}
              activeOpacity={0.8}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* VEHICLE CARD */}
          {showCamionHeader && (
            <TouchableOpacity
              style={styles.vehicleCard}
              onPress={() => setModalVehiculosVisible(true)}
              activeOpacity={0.85}>
              <View style={styles.vehicleCardLeft}>
                <View style={[styles.vehicleIconBg, { backgroundColor: (tipoCamionData?.color || COLORS.accent) + "20" }]}>
                  <CamionIconDinamico
                    width={30}
                    height={30}
                    color={tipoCamionData?.color || COLORS.accent}
                  />
                </View>
                <View style={styles.vehicleCardInfo}>
                  <Text style={styles.vehicleCardType}>
                    {tipoCamionData?.label || "Seleccionar vehículo"}
                  </Text>
                  {placaActual ? (
                    <View style={styles.placaBadge}>
                      <Text style={styles.placaText}>{placaActual}</Text>
                    </View>
                  ) : (
                    <Text style={styles.vehicleCardHint}>Toca para seleccionar</Text>
                  )}
                </View>
              </View>
              <View style={styles.changeChip}>
                <Text style={styles.changeChipText}>Cambiar</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ITEMS GRID */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}>
            <View style={styles.grid}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridCard}
                  onPress={() => onItemPress?.(item)}
                  activeOpacity={0.75}>
                  <View style={[styles.gridIconBg, { backgroundColor: (item.color || COLORS.accent) + "22" }]}>
                    <Ionicons
                      name={(item.icon || "ellipse") as any}
                      size={26}
                      color={item.color || COLORS.accent}
                    />
                  </View>
                  <Text style={styles.gridCardName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.gridCardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  {renderBadge?.(item)}
                  <View style={styles.gridArrow}>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* MODAL: LISTA DE VEHÍCULOS */}
      <Modal
        visible={modalVehiculosVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVehiculosVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVehiculosVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Mis Vehículos</Text>
                <Text style={styles.modalSubtitle}>Selecciona o agrega un vehículo</Text>

                {cargando ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                  </View>
                ) : vehiculos.length > 0 ? (
                  <ScrollView style={styles.vehicleList}>
                    {vehiculos.map((v) => {
                      const tipo = getTipoCamionData(v.tipo_camion);
                      const isActive = placaActual === v.placa;
                      const IconComponent = tipo?.icon || VolquetaIcon;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.vehicleOption, isActive && styles.vehicleOptionActive]}
                          onPress={() => handleSeleccionarVehiculo(v)}>
                          <View style={[styles.vehicleOptionIcon, { backgroundColor: (tipo?.color || COLORS.accent) + "20" }]}>
                            <IconComponent width={24} height={24} color={tipo?.color || COLORS.accent} />
                          </View>
                          <View style={styles.vehicleOptionInfo}>
                            <Text style={styles.vehicleOptionType}>{tipo?.label || "Vehículo"}</Text>
                            <Text style={styles.vehicleOptionPlaca}>{v.placa}</Text>
                            {v.conductorNombre && (
                              <Text style={styles.vehicleOptionConductor}>👤 {v.conductorNombre}</Text>
                            )}
                          </View>
                          {v.estado === "pendiente" ? (
                            <View style={[styles.statusBadge, { backgroundColor: COLORS.warning }]}>
                              <Text style={styles.statusText}>⏳</Text>
                            </View>
                          ) : v.estado === "rechazado" ? (
                            <View style={[styles.statusBadge, { backgroundColor: COLORS.danger }]}>
                              <Text style={styles.statusText}>✕</Text>
                            </View>
                          ) : isActive ? (
                            <View style={[styles.statusBadge, { backgroundColor: COLORS.accent }]}>
                              <Text style={[styles.statusText, { color: COLORS.accentText }]}>✓</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>🚛</Text>
                    <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setModalVehiculosVisible(false);
                    role === "conductor" ? setModalPlacaVisible(true) : setModalTipoVisible(true);
                  }}>
                  <Text style={styles.addButtonText}>
                    + {role === "conductor" ? "Solicitar acceso a vehículo" : "Agregar nuevo vehículo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVehiculosVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: TIPO DE VEHÍCULO */}
      <Modal
        visible={modalTipoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalTipoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalTipoVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Tipo de Vehículo</Text>
                <Text style={styles.modalSubtitle}>¿Qué tipo de camión vas a registrar?</Text>
                <View style={styles.tiposGrid}>
                  {TIPOS_CAMION.map((tipo) => {
                    const IconComponent = tipo.icon;
                    return (
                      <TouchableOpacity
                        key={tipo.id}
                        style={styles.tipoCard}
                        onPress={() => handleSeleccionarTipo(tipo.id)}>
                        <View style={[styles.tipoIconBg, { backgroundColor: tipo.color + "20" }]}>
                          <IconComponent width={36} height={36} color={tipo.color} />
                        </View>
                        <Text style={styles.tipoLabel}>{tipo.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalTipoVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL: INGRESAR PLACA */}
      <Modal
        visible={modalPlacaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalPlacaVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>
                    {role === "conductor" ? "Solicitar acceso" : "Placa del Vehículo"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {role === "conductor"
                      ? "Ingresa la placa del vehículo al que deseas acceder"
                      : `Ingresa la placa de tu ${tipoCamionData?.label}`}
                  </Text>

                  <TextInput
                    style={styles.placaInput}
                    placeholder="ABC123"
                    placeholderTextColor={COLORS.textMuted}
                    value={placaTemporal}
                    onChangeText={(t) => setPlacaTemporal(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={7}
                    autoFocus
                  />

                  <View style={styles.modalBtns}>
                    <TouchableOpacity
                      style={styles.modalBtnSecondary}
                      onPress={() => {
                        setModalPlacaVisible(false);
                        if (role !== "conductor") setModalTipoVisible(true);
                      }}>
                      <Text style={styles.modalBtnSecondaryText}>
                        {role === "conductor" ? "Cancelar" : "Atrás"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtnPrimary, (!placaTemporal.trim() || cargando) && { opacity: 0.5 }]}
                      onPress={handleGuardarPlaca}
                      disabled={!placaTemporal.trim() || cargando}>
                      {cargando ? (
                        <ActivityIndicator color={COLORS.accentText} />
                      ) : (
                        <Text style={styles.modalBtnPrimaryText}>
                          {role === "conductor" ? "Enviar solicitud" : "Guardar"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 20,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  greeting: {},
  greetingSmall: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  avatarButton: {},
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.accentText,
  },

  // VEHICLE CARD
  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  vehicleCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  vehicleIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  vehicleCardInfo: { flex: 1 },
  vehicleCardType: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 5,
  },
  vehicleCardHint: { fontSize: 13, color: COLORS.textSecondary },
  placaBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  placaText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.accentText,
    letterSpacing: 1.5,
  },
  changeChip: {
    backgroundColor: COLORS.accent + "20",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  changeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
  },

  // GRID
  gridContainer: { paddingBottom: 100 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    width: (width - 52) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
  },
  gridIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  gridCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  gridCardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  gridArrow: {
    marginTop: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlay,
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: "82%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  loadingBox: { padding: 40, alignItems: "center" },

  // Vehicle List
  vehicleList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.input,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  vehicleOptionActive: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  vehicleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleOptionInfo: { flex: 1 },
  vehicleOptionType: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  vehicleOptionPlaca: { fontSize: 13, color: COLORS.textSecondary },
  vehicleOptionConductor: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 14, fontWeight: "700", color: "#FFF" },

  // Empty
  emptyBox: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },

  // Tipos Grid
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  tipoCard: {
    width: (width - 72) / 2,
    backgroundColor: COLORS.input,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  tipoIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tipoLabel: { fontSize: 15, fontWeight: "600", color: COLORS.text },

  // Placa Input
  placaInput: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    padding: 18,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: 5,
    marginBottom: 24,
  },

  // Buttons
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.accentText,
  },
  cancelBtn: { alignItems: "center", padding: 14 },
  cancelBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.textSecondary },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: "600", color: COLORS.textSecondary },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: "700", color: COLORS.accentText },
});
