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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
import {
  VolquetaIcon,
  EstacasIcon,
  FurgonIcon,
  GruaIcon,
} from "../../assets/icons/icons";

const { width } = Dimensions.get("window");

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export interface Item {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  route?: string;
}

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
}

const ICON_MAP: Record<TipoCamion, ComponentType<IconProps>> = {
  estacas: EstacasIcon,
  volqueta: VolquetaIcon,
  furgon: FurgonIcon,
  grua: GruaIcon,
};

const TIPOS_CAMION = [
  {
    id: "estacas" as TipoCamion,
    label: "Estacas",
    icon: EstacasIcon,
    color: "#00D9A5",
    emoji: "🚚",
  },
  {
    id: "volqueta" as TipoCamion,
    label: "Volqueta",
    icon: VolquetaIcon,
    color: "#FFB800",
    emoji: "🚛",
  },
  {
    id: "furgon" as TipoCamion,
    label: "Furgón",
    icon: FurgonIcon,
    color: "#6C5CE7",
    emoji: "📦",
  },
  {
    id: "grua" as TipoCamion,
    label: "Grúa",
    icon: GruaIcon,
    color: "#E94560",
    emoji: "🏗️",
  },
];

export default function HomeBaseAdapted({
  items,
  showCamionHeader = true,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
  const { colors, isDark } = useTheme();
  const {
    placa: placaActual,
    tipoCamion,
    setPlaca,
    setTipoCamion,
  } = useVehiculoStore();
  const { user } = useAuth();

  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [modalPlacaVisible, setModalPlacaVisible] = useState(false);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (user?.id) cargarVehiculos();
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
  }, [user?.id]);

  const cargarVehiculos = async () => {
    if (!user?.id) return;
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("id, placa, tipo_camion")
        .eq("conductor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVehiculos(data || []);
    } catch (err) {
      console.error("Error cargando vehículos:", err);
    } finally {
      setCargando(false);
    }
  };

  const getTipoCamionData = (tipo: TipoCamion | null) =>
    TIPOS_CAMION.find((t) => t.id === tipo);

  const handleSeleccionarVehiculo = (vehiculo: Vehiculo) => {
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
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
      const { error } = await supabase.from("vehiculos").insert([
        {
          conductor_id: user.id,
          placa: placaLimpia,
          tipo_camion: tipoCamion,
        },
      ]);
      if (error) throw error;
      Alert.alert("✅ Éxito", `Vehículo ${placaLimpia} registrado`);
      await cargarVehiculos();
      setPlaca(placaLimpia);
      setModalPlacaVisible(false);
      setPlacaTemporal("");
    } catch (err) {
      Alert.alert("Error", "No se pudo registrar el vehículo");
    } finally {
      setCargando(false);
    }
  };

  const tipoCamionData = getTipoCamionData(tipoCamion);
  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;

  // Estilos dinámicos basados en el tema
  const ds = {
    container: { flex: 1, backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
    modalBg: { backgroundColor: colors.modalBg },
    inputBg: { backgroundColor: isDark ? "#252540" : "#F0F0F5" },
  };

  return (
    <View style={ds.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* HEADER CON VEHÍCULO */}
          {showCamionHeader && (
            <TouchableOpacity
              style={[styles.vehicleHeader, ds.cardBg, getShadow(isDark, "md")]}
              onPress={() => setModalVehiculosVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.vehicleHeaderLeft}>
                <View
                  style={[
                    styles.vehicleIconContainer,
                    {
                      backgroundColor:
                        (tipoCamionData?.color || colors.accent) + "20",
                    },
                  ]}>
                  <CamionIconDinamico
                    width={32}
                    height={32}
                    color={tipoCamionData?.color || colors.accent}
                  />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={[styles.vehicleType, ds.text]}>
                    {tipoCamionData?.label || "Seleccionar vehículo"}
                  </Text>
                  {placaActual ? (
                    <View style={styles.placaBadge}>
                      <Text style={styles.placaText}>{placaActual}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.vehicleSubtitle, ds.textSecondary]}>
                      Toca para seleccionar
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.vehicleHeaderRight}>
                <Text style={[styles.changeText, { color: colors.accent }]}>
                  Cambiar
                </Text>
                <Text style={[styles.chevron, { color: colors.accent }]}>
                  ›
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* GRID DE ITEMS */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.itemsContainer}>
            <View style={styles.itemsGrid}>
              {items.map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    ds.cardBg,
                    getShadow(isDark, "sm"),
                    { transform: [{ translateY: slideAnim }] },
                  ]}>
                  <TouchableOpacity
                    style={styles.itemTouchable}
                    onPress={() => onItemPress?.(item)}
                    activeOpacity={0.7}>
                    <View
                      style={[
                        styles.itemIconContainer,
                        {
                          backgroundColor: (item.color || colors.accent) + "20",
                        },
                      ]}>
                      <item.icon
                        size={28}
                        color={item.color || colors.accent}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text style={[styles.itemName, ds.text]}>{item.name}</Text>
                    {item.description && (
                      <Text style={[styles.itemDescription, ds.textSecondary]}>
                        {item.description}
                      </Text>
                    )}
                    {renderBadge?.(item)}
                  </TouchableOpacity>
                </Animated.View>
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
        <TouchableWithoutFeedback
          onPress={() => setModalVehiculosVisible(false)}>
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
                <Text style={[styles.modalTitle, ds.text]}>Mis Vehículos</Text>
                <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                  Selecciona o agrega un vehículo
                </Text>

                {cargando ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                ) : vehiculos.length > 0 ? (
                  <ScrollView style={styles.vehiclesList}>
                    {vehiculos.map((v) => {
                      const tipo = getTipoCamionData(v.tipo_camion);
                      const isActive = placaActual === v.placa;
                      const IconComponent = tipo?.icon || VolquetaIcon;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            styles.vehicleOption,
                            ds.cardBg,
                            isActive && {
                              borderColor: colors.accent,
                              backgroundColor: colors.accentLight,
                            },
                          ]}
                          onPress={() => handleSeleccionarVehiculo(v)}>
                          <View
                            style={[
                              styles.vehicleOptionIcon,
                              {
                                backgroundColor:
                                  (tipo?.color || colors.accent) + "20",
                              },
                            ]}>
                            <IconComponent
                              width={24}
                              height={24}
                              color={tipo?.color || colors.accent}
                            />
                          </View>
                          <View style={styles.vehicleOptionInfo}>
                            <Text style={[styles.vehicleOptionType, ds.text]}>
                              {tipo?.label || "Vehículo"}
                            </Text>
                            <Text
                              style={[
                                styles.vehicleOptionPlaca,
                                ds.textSecondary,
                              ]}>
                              {v.placa}
                            </Text>
                          </View>
                          {isActive && (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: colors.accent },
                              ]}>
                              <Text style={styles.checkText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyVehicles}>
                    <Text style={styles.emptyIcon}>🚛</Text>
                    <Text style={[styles.emptyText, ds.textSecondary]}>
                      No tienes vehículos registrados
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    setModalVehiculosVisible(false);
                    setModalTipoVisible(true);
                  }}>
                  <Text style={styles.addButtonIcon}>+</Text>
                  <Text style={styles.addButtonText}>
                    Agregar nuevo vehículo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVehiculosVisible(false)}>
                  <Text style={[styles.cancelButtonText, ds.textSecondary]}>
                    Cancelar
                  </Text>
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
                  Tipo de Vehículo
                </Text>
                <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                  ¿Qué tipo de camión vas a registrar?
                </Text>

                <View style={styles.tiposGrid}>
                  {TIPOS_CAMION.map((tipo) => {
                    const IconComponent = tipo.icon;
                    return (
                      <TouchableOpacity
                        key={tipo.id}
                        style={[styles.tipoCard, ds.cardBg]}
                        onPress={() => handleSeleccionarTipo(tipo.id)}>
                        <View
                          style={[
                            styles.tipoIconContainer,
                            { backgroundColor: tipo.color + "20" },
                          ]}>
                          <IconComponent
                            width={36}
                            height={36}
                            color={tipo.color}
                          />
                        </View>
                        <Text style={[styles.tipoLabel, ds.text]}>
                          {tipo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalTipoVisible(false)}>
                  <Text style={[styles.cancelButtonText, ds.textSecondary]}>
                    Cancelar
                  </Text>
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
                  Placa del Vehículo
                </Text>
                <Text style={[styles.modalSubtitle, ds.textSecondary]}>
                  Ingresa la placa de tu {tipoCamionData?.label}
                </Text>

                <View style={styles.placaInputContainer}>
                  <TextInput
                    style={[
                      styles.placaInput,
                      ds.inputBg,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="ABC123"
                    placeholderTextColor={colors.textMuted}
                    value={placaTemporal}
                    onChangeText={(t) => setPlacaTemporal(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={7}
                    autoFocus
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.backButton, ds.cardBg]}
                    onPress={() => {
                      setModalPlacaVisible(false);
                      setModalTipoVisible(true);
                    }}>
                    <Text style={[styles.backButtonText, ds.textSecondary]}>
                      Atrás
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: colors.accent },
                      (!placaTemporal.trim() || cargando) &&
                        styles.saveButtonDisabled,
                    ]}
                    onPress={handleGuardarPlaca}
                    disabled={!placaTemporal.trim() || cargando}>
                    {cargando ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },

  // Vehicle Header
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  vehicleHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  vehicleInfo: { flex: 1 },
  vehicleType: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  vehicleSubtitle: { fontSize: 13 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#000",
    alignSelf: "flex-start",
  },
  placaText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 1,
  },
  vehicleHeaderRight: { flexDirection: "row", alignItems: "center" },
  changeText: { fontSize: 14, fontWeight: "600", marginRight: 4 },
  chevron: { fontSize: 22, fontWeight: "600" },

  // Items Grid
  itemsContainer: { paddingBottom: 100 },
  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  itemCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemTouchable: { padding: 16, alignItems: "center" },
  itemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  itemIcon: { fontSize: 28 },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  itemDescription: { fontSize: 12, textAlign: "center" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  loadingContainer: { padding: 40, alignItems: "center" },

  // Vehicles List
  vehiclesList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  vehicleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleOptionInfo: { flex: 1 },
  vehicleOptionType: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  vehicleOptionPlaca: { fontSize: 13 },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: { fontSize: 14, fontWeight: "700", color: "#FFF" },

  // Empty
  emptyVehicles: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14 },

  // Tipos Grid
  tiposGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  tipoCard: {
    width: (width - 72) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  tipoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  tipoLabel: { fontSize: 15, fontWeight: "600" },

  // Placa Input
  placaInputContainer: { marginBottom: 24 },
  placaInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    borderWidth: 1,
  },

  // Buttons
  modalButtons: { flexDirection: "row", gap: 12 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  addButtonIcon: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  addButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  cancelButton: { alignItems: "center", padding: 16 },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  backButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  backButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 16,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
