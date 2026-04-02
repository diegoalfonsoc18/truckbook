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
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import supabase from "../../config/SupaBaseConfig";
import { useTheme, getShadow } from "../../constants/Themecontext";
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
  type VehiculoConEstado,
  type EstadoAutorizacion,
} from "../../services/vehiculoAutorizacionService";

const { width } = Dimensions.get("window");

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
  const c = colors;
  const navigation = useNavigation<any>();
  const {
    placa: placaActual,
    tipoCamion,
    setPlaca,
    setTipoCamion,
  } = useVehiculoStore();
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
      const { data, error } = await cargarVehiculosConEstado(user.id);
      if (error) throw error;

      const vehiculosConConductor = await Promise.all(
        (data || []).map(async (v) => {
          // Buscar conductor activo asignado a este vehiculo
          let conductorNombre: string | undefined;
          const { data: relaciones } = await supabase
            .from("vehiculo_conductores")
            .select("conductor_id")
            .eq("vehiculo_placa", v.placa)
            .eq("rol", "conductor")
            .eq("estado", "autorizado")
            .limit(1);

          if (relaciones && relaciones.length > 0) {
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

      // Actualizar conductor del vehiculo seleccionado
      if (placaActual) {
        const actual = vehiculosConConductor.find(
          (v) => v.placa === placaActual,
        );
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
      Alert.alert(
        "Esperando autorización",
        "El propietario aún no ha autorizado tu acceso a este vehículo.",
      );
      return;
    }
    if (vehiculo.estado === "rechazado") {
      Alert.alert(
        "Acceso denegado",
        "El propietario rechazó tu solicitud. Contacta al propietario.",
      );
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
        // Propietario: registra vehiculo y queda autorizado
        const resultado = await registrarVehiculoPropietario(
          user.id,
          placaLimpia,
          tipoCamion,
        );
        if (!resultado.success) {
          Alert.alert("Error", resultado.error || "No se pudo registrar");
          return;
        }
        Alert.alert("✅ Éxito", `Vehículo ${placaLimpia} registrado`);
        await cargarVehiculos();
        setPlaca(placaLimpia);
      } else {
        // Conductor/Admin: solicita acceso (queda pendiente)
        const resultado = await solicitarAccesoVehiculo(user.id, placaLimpia);
        if (!resultado.success) {
          Alert.alert("Error", resultado.error || "No se pudo solicitar");
          return;
        }
        Alert.alert(
          "Solicitud enviada",
          `Se envió la solicitud de acceso al vehículo ${placaLimpia}. El propietario debe autorizarla.`,
        );
        await cargarVehiculos();
      }

      setModalPlacaVisible(false);
      setPlacaTemporal("");
    } catch (err) {
      Alert.alert("Error", "No se pudo procesar la solicitud");
    } finally {
      setCargando(false);
    }
  };

  const tipoCamionData = getTipoCamionData(tipoCamion);
  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;

  const userEmail = user?.email || "";
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userInitials = userEmail.split("@")[0].slice(0, 2).toUpperCase() || "?";

  return (
    <View style={{ flex: 1, backgroundColor: c.primary }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* USER AVATAR + EMAIL + SETTINGS */}
          <View style={styles.userHeader}>
            <TouchableOpacity
              style={styles.userHeaderLeft}
              onPress={() => navigation.navigate("Cuenta")}
              activeOpacity={0.7}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: isDark
                        ? "rgba(0,217,165,0.15)"
                        : c.incomeLight,
                    },
                  ]}>
                  <Text style={[styles.avatarText, { color: c.income }]}>
                    {userInitials}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text
                  style={[styles.userEmail, { color: c.text }]}
                  numberOfLines={1}>
                  {userEmail}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}
              onPress={() => navigation.navigate("Cuenta")}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* HEADER CON VEHÍCULO */}
          {showCamionHeader && (
            <TouchableOpacity
              style={[
                styles.vehicleHeader,
                { backgroundColor: c.cardBg, borderColor: c.border },
                getShadow(isDark, "md"),
              ]}
              onPress={() => setModalVehiculosVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.vehicleHeaderLeft}>
                <View
                  style={[
                    styles.vehicleIconContainer,
                    {
                      backgroundColor:
                        (tipoCamionData?.color || c.accent) + "20",
                    },
                  ]}>
                  <CamionIconDinamico
                    width={32}
                    height={32}
                    color={tipoCamionData?.color || c.accent}
                  />
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={[styles.vehicleType, { color: c.text }]}>
                    {tipoCamionData?.label || "Seleccionar vehículo"}
                  </Text>
                  {placaActual ? (
                    <>
                      <View
                        style={[
                          styles.placaBadge,
                          { backgroundColor: c.plateYellow },
                        ]}>
                        <Text
                          style={[styles.placaText, { color: c.plateText }]}>
                          {placaActual}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.vehicleSubtitle,
                        { color: c.textSecondary },
                      ]}>
                      Toca para seleccionar
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.vehicleHeaderRight}>
                <Text style={[styles.changeText, { color: c.accent }]}>
                  Cambiar
                </Text>
                <Text style={[styles.chevron, { color: c.accent }]}>›</Text>
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
                    { backgroundColor: c.cardBg, borderColor: c.border },
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
                          backgroundColor: (item.color || c.accent) + "20",
                        },
                      ]}>
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.itemName, { color: c.text }]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text
                        style={[
                          styles.itemDescription,
                          { color: c.textSecondary },
                        ]}>
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
          <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalContent, { backgroundColor: c.modalBg }]}>
                <View
                  style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
                />
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Mis Vehículos
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: c.textSecondary }]}>
                  Selecciona o agrega un vehículo
                </Text>

                {cargando ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={c.accent} />
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
                            {
                              backgroundColor: c.cardBg,
                              borderColor: c.border,
                            },
                            isActive && {
                              borderColor: c.accent,
                              backgroundColor: c.accentLight,
                            },
                          ]}
                          onPress={() => handleSeleccionarVehiculo(v)}>
                          <View
                            style={[
                              styles.vehicleOptionIcon,
                              {
                                backgroundColor:
                                  (tipo?.color || c.accent) + "20",
                              },
                            ]}>
                            <IconComponent
                              width={24}
                              height={24}
                              color={tipo?.color || c.accent}
                            />
                          </View>
                          <View style={styles.vehicleOptionInfo}>
                            <Text
                              style={[
                                styles.vehicleOptionType,
                                { color: c.text },
                              ]}>
                              {tipo?.label || "Vehículo"}
                            </Text>
                            <Text
                              style={[
                                styles.vehicleOptionPlaca,
                                { color: c.textSecondary },
                              ]}>
                              {v.placa}
                            </Text>
                            {v.conductorNombre && (
                              <Text
                                style={[
                                  styles.vehicleOptionConductor,
                                  { color: c.textMuted },
                                ]}>
                                👤 {v.conductorNombre}
                              </Text>
                            )}
                          </View>
                          {v.estado === "pendiente" ? (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: "#FFB800" },
                              ]}>
                              <Text style={styles.checkText}>⏳</Text>
                            </View>
                          ) : v.estado === "rechazado" ? (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: "#E94560" },
                              ]}>
                              <Text style={styles.checkText}>✕</Text>
                            </View>
                          ) : isActive ? (
                            <View
                              style={[
                                styles.checkBadge,
                                { backgroundColor: c.accent },
                              ]}>
                              <Text style={styles.checkText}>✓</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyVehicles}>
                    <Text style={styles.emptyIcon}>🚛</Text>
                    <Text
                      style={[styles.emptyText, { color: c.textSecondary }]}>
                      No tienes vehículos registrados
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: c.accent }]}
                  onPress={() => {
                    setModalVehiculosVisible(false);
                    if (role === "conductor") {
                      // Conductor solo ingresa placa para solicitar acceso
                      setModalPlacaVisible(true);
                    } else {
                      // Propietario/Admin selecciona tipo primero
                      setModalTipoVisible(true);
                    }
                  }}>
                  <Text style={[styles.addButtonIcon, { color: c.accentText }]}>
                    +
                  </Text>
                  <Text style={[styles.addButtonText, { color: c.accentText }]}>
                    {role === "conductor"
                      ? "Solicitar acceso a vehículo"
                      : "Agregar nuevo vehículo"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVehiculosVisible(false)}>
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: c.textSecondary },
                    ]}>
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
          <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalContent, { backgroundColor: c.modalBg }]}>
                <View
                  style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
                />
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Tipo de Vehículo
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: c.textSecondary }]}>
                  ¿Qué tipo de camión vas a registrar?
                </Text>

                <View style={styles.tiposGrid}>
                  {TIPOS_CAMION.map((tipo) => {
                    const IconComponent = tipo.icon;
                    return (
                      <TouchableOpacity
                        key={tipo.id}
                        style={[
                          styles.tipoCard,
                          { backgroundColor: c.cardBg, borderColor: c.border },
                        ]}
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
                        <Text style={[styles.tipoLabel, { color: c.text }]}>
                          {tipo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalTipoVisible(false)}>
                  <Text
                    style={[
                      styles.cancelButtonText,
                      { color: c.textSecondary },
                    ]}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
              <TouchableWithoutFeedback>
                <View
                  style={[styles.modalContent, { backgroundColor: c.modalBg }]}>
                  <View
                    style={[
                      styles.modalHandle,
                      { backgroundColor: c.textMuted },
                    ]}
                  />
                  <Text style={[styles.modalTitle, { color: c.text }]}>
                    {role === "conductor"
                      ? "Solicitar acceso"
                      : "Placa del Vehículo"}
                  </Text>
                  <Text
                    style={[styles.modalSubtitle, { color: c.textSecondary }]}>
                    {role === "conductor"
                      ? "Ingresa la placa del vehículo al que deseas acceder"
                      : `Ingresa la placa de tu ${tipoCamionData?.label}`}
                  </Text>

                  <View style={styles.placaInputContainer}>
                    <TextInput
                      style={[
                        styles.placaInput,
                        { backgroundColor: c.surface },
                        { color: c.text, borderColor: c.border },
                      ]}
                      placeholder="ABC123"
                      placeholderTextColor={c.textMuted}
                      value={placaTemporal}
                      onChangeText={(t) => setPlacaTemporal(t.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={7}
                      autoFocus
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[
                        styles.backButton,
                        { backgroundColor: c.cardBg, borderColor: c.border },
                      ]}
                      onPress={() => {
                        setModalPlacaVisible(false);
                        if (role !== "conductor") {
                          setModalTipoVisible(true);
                        }
                      }}>
                      <Text
                        style={[
                          styles.backButtonText,
                          { color: c.textSecondary },
                        ]}>
                        {role === "conductor" ? "Cancelar" : "Atrás"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        { backgroundColor: c.accent },
                        (!placaTemporal.trim() || cargando) &&
                          styles.saveButtonDisabled,
                      ]}
                      onPress={handleGuardarPlaca}
                      disabled={!placaTemporal.trim() || cargando}>
                      {cargando ? (
                        <ActivityIndicator color={c.accentText} />
                      ) : (
                        <Text
                          style={[
                            styles.saveButtonText,
                            { color: c.accentText },
                          ]}>
                          {role === "conductor"
                            ? "Enviar solicitud"
                            : "Guardar"}
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
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },

  // User Header
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 4,
  },
  userHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { fontSize: 15, fontWeight: "800" },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 14, fontWeight: "600" },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  placaText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  conductorLabel: { fontSize: 12, marginTop: 4 },
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
  vehicleOptionConductor: { fontSize: 11, marginTop: 2 },
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
  addButtonIcon: { fontSize: 20, fontWeight: "700" },
  addButtonText: { fontSize: 16, fontWeight: "600" },
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
  saveButtonText: { fontSize: 16, fontWeight: "600" },
});
