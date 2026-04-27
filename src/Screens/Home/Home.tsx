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
  ConductorIcon,
} from "../../assets/icons/icons";
import {
  cargarVehiculosConEstado,
  registrarVehiculoPropietario,
  solicitarAccesoVehiculo,
  type EstadoAutorizacion,
} from "../../services/vehiculoAutorizacionService";
import { useTheme } from "../../constants/Themecontext";
import ItemIcon from "../../components/ItemIcon";

const { width } = Dimensions.get("window");
const H_PAD = 20;

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
  },
  {
    id: "volqueta" as TipoCamion,
    label: "Volqueta",
    icon: VolquetaIcon,
    color: "#0d141a",
  },
  {
    id: "furgon" as TipoCamion,
    label: "Furgón",
    icon: FurgonIcon,
    color: "#6C5CE7",
  },
  { id: "grua" as TipoCamion, label: "Grúa", icon: GruaIcon, color: "#E94560" },
];

export default function HomeBaseAdapted({
  items,
  showCamionHeader = true,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
  const navigation = useNavigation<any>();
  const { colors: c, isDark } = useTheme();
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

  useEffect(() => {
    if (user?.id) cargarVehiculos();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
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
        "El propietario aún no ha autorizado tu acceso.",
      );
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
        const resultado = await registrarVehiculoPropietario(
          user.id,
          placaLimpia,
          tipoCamion,
        );
        if (!resultado.success) {
          Alert.alert("Error", resultado.error || "No se pudo registrar");
          return;
        }
        Alert.alert("Éxito", `Vehículo ${placaLimpia} registrado`);
        await cargarVehiculos();
        setPlaca(placaLimpia);
      } else {
        const resultado = await solicitarAccesoVehiculo(user.id, placaLimpia);
        if (!resultado.success) {
          Alert.alert("Error", resultado.error || "No se pudo solicitar");
          return;
        }
        Alert.alert(
          "Solicitud enviada",
          `Se envió la solicitud al vehículo ${placaLimpia}.`,
        );
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
  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : ConductorIcon;
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const userName =
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const userInitials = userName.slice(0, 2).toUpperCase();

  // Shared card style
  const card = {
    backgroundColor: c.cardBg,
    borderRadius: 18,
    ...(isDark
      ? { borderWidth: 1, borderColor: c.border }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
        }),
  };

  const sheet = {
    backgroundColor: c.modalBg,
    ...(isDark ? { borderWidth: 1, borderColor: c.border } : {}),
  };

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          {/* HEADER */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={[s.greetingSmall, { color: c.textSecondary }]}>
                Bienvenido de vuelta
              </Text>
              <Text
                style={[s.greetingName, { color: c.text }]}
                numberOfLines={1}>
                {userName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Cuenta")}
              activeOpacity={0.8}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[s.avatar, { borderColor: c.accent }]}
                />
              ) : (
                <View style={[s.avatarFallback, { backgroundColor: c.accent }]}>
                  <Text style={[s.avatarText, { color: c.accentText }]}>
                    {userInitials}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* VEHICLE CARD */}
          {showCamionHeader && (
            <TouchableOpacity
              style={[s.vehicleCard, card]}
              onPress={() => setModalVehiculosVisible(true)}
              activeOpacity={0.82}>
              <View
                style={[
                  s.vehicleIconBg,
                  {
                    backgroundColor: (tipoCamionData?.color || c.accent) + "18",
                  },
                ]}>
                <CamionIconDinamico
                  width={68}
                  height={68}
                  color={tipoCamionData?.color || c.accent}
                />
              </View>
              <View style={s.vehicleInfo}>
                <Text style={[s.vehicleType, { color: c.text }]}>
                  {tipoCamionData?.label || "Seleccionar vehículo"}
                </Text>
                {placaActual ? (
                  <View style={[s.placaBadge, { backgroundColor: c.accent }]}>
                    <Text style={[s.placaText, { color: c.accentText }]}>
                      {placaActual}
                    </Text>
                  </View>
                ) : (
                  <Text style={[s.vehicleHint, { color: c.textSecondary }]}>
                    Toca para seleccionar
                  </Text>
                )}
              </View>
              <View style={[s.changeChip, { backgroundColor: c.accentLight }]}>
                <Text
                  style={[
                    s.changeChipText,
                    { color: isDark ? c.accent : c.accentText },
                  ]}>
                  Cambiar
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* GRID */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.gridContainer}>
            <View style={s.grid}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.gridCard, card]}
                  onPress={() => onItemPress?.(item)}
                  activeOpacity={0.75}>
                  <View
                    style={[
                      s.gridIconBg,
                      { backgroundColor: (item.color || c.accent) + "18" },
                    ]}>
                    {item.iconName
                      ? <ItemIcon name={item.iconName} size={item.iconSize ?? 30} />
                      : <Ionicons name={(item.icon || "ellipse") as any} size={item.iconSize ?? 26} color={item.color || c.accent} />
                    }
                  </View>
                  <Text style={[s.gridCardName, { color: c.text }]}>
                    {item.name}
                  </Text>
                  {item.subtitle && (
                    <Text
                      style={[s.gridCardSub, { color: c.textSecondary }]}
                      numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                  {renderBadge?.(item)}
                  <View
                    style={[s.gridArrow, { backgroundColor: c.accentLight }]}>
                    <Ionicons name="arrow-forward" size={13} color={c.accent} />
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
        <TouchableWithoutFeedback
          onPress={() => setModalVehiculosVisible(false)}>
          <View style={[s.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View style={[s.sheetBase, sheet]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>
                  Mis Vehículos
                </Text>
                <Text style={[s.sheetSubtitle, { color: c.textSecondary }]}>
                  Selecciona o agrega un vehículo
                </Text>

                {cargando ? (
                  <View style={s.loadingBox}>
                    <ActivityIndicator size="large" color={c.accent} />
                  </View>
                ) : vehiculos.length > 0 ? (
                  <ScrollView
                    style={s.vehicleList}
                    showsVerticalScrollIndicator={false}>
                    {vehiculos.map((v) => {
                      const tipo = getTipoCamionData(v.tipo_camion);
                      const isActive = placaActual === v.placa;
                      const IconComponent = tipo?.icon || VolquetaIcon;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            s.vehicleOption,
                            { backgroundColor: c.surface },
                            isActive && {
                              borderWidth: 1.5,
                              borderColor: c.accent,
                            },
                          ]}
                          onPress={() => handleSeleccionarVehiculo(v)}>
                          <View
                            style={[
                              s.vehicleOptionIcon,
                              {
                                backgroundColor:
                                  (tipo?.color || c.accent) + "18",
                              },
                            ]}>
                            <IconComponent
                              width={24}
                              height={24}
                              color={tipo?.color || c.accent}
                            />
                          </View>
                          <View style={s.vehicleOptionInfo}>
                            <Text
                              style={[s.vehicleOptionType, { color: c.text }]}>
                              {tipo?.label || "Vehículo"}
                            </Text>
                            <Text
                              style={[
                                s.vehicleOptionPlaca,
                                { color: c.textSecondary },
                              ]}>
                              {v.placa}
                            </Text>
                            {v.conductorNombre && (
                              <Text
                                style={[
                                  s.vehicleOptionConductor,
                                  { color: c.textMuted },
                                ]}>
                                {v.conductorNombre}
                              </Text>
                            )}
                          </View>
                          {v.estado === "pendiente" ? (
                            <View
                              style={[
                                s.statusBadge,
                                { backgroundColor: "#FFB800" },
                              ]}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color="#000"
                              />
                            </View>
                          ) : v.estado === "rechazado" ? (
                            <View
                              style={[
                                s.statusBadge,
                                { backgroundColor: c.danger },
                              ]}>
                              <Ionicons name="close" size={14} color="#FFF" />
                            </View>
                          ) : isActive ? (
                            <View
                              style={[
                                s.statusBadge,
                                { backgroundColor: c.accent },
                              ]}>
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color={c.accentText}
                              />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={s.emptyBox}>
                    <View
                      style={[s.emptyIconWrap, { backgroundColor: c.surface }]}>
                      <Ionicons
                        name="truck-outline"
                        size={36}
                        color={c.textMuted}
                      />
                    </View>
                    <Text style={[s.emptyText, { color: c.textSecondary }]}>
                      No tienes vehículos registrados
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.addButton, { backgroundColor: c.text }]}
                  onPress={() => {
                    setModalVehiculosVisible(false);
                    role === "conductor"
                      ? setModalPlacaVisible(true)
                      : setModalTipoVisible(true);
                  }}>
                  <Text style={[s.addButtonText, { color: c.primary }]}>
                    {role === "conductor"
                      ? "Solicitar acceso a vehículo"
                      : "Agregar nuevo vehículo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.cancelTouchable}
                  onPress={() => setModalVehiculosVisible(false)}>
                  <Text style={[s.cancelText, { color: c.textSecondary }]}>
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
          <View style={[s.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View style={[s.sheetBase, sheet]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />
                <Text style={[s.sheetTitle, { color: c.text }]}>
                  Tipo de Vehículo
                </Text>
                <Text style={[s.sheetSubtitle, { color: c.textSecondary }]}>
                  ¿Qué tipo de camión vas a registrar?
                </Text>
                <View style={s.tiposGrid}>
                  {TIPOS_CAMION.map((tipo) => {
                    const IconComponent = tipo.icon;
                    return (
                      <TouchableOpacity
                        key={tipo.id}
                        style={[s.tipoCard, { backgroundColor: c.surface }]}
                        onPress={() => handleSeleccionarTipo(tipo.id)}>
                        <View
                          style={[
                            s.tipoIconBg,
                            { backgroundColor: tipo.color + "18" },
                          ]}>
                          <IconComponent
                            width={34}
                            height={34}
                            color={tipo.color}
                          />
                        </View>
                        <Text style={[s.tipoLabel, { color: c.text }]}>
                          {tipo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={s.cancelTouchable}
                  onPress={() => setModalTipoVisible(false)}>
                  <Text style={[s.cancelText, { color: c.textSecondary }]}>
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
            <View style={[s.overlay, { backgroundColor: c.overlay }]}>
              <TouchableWithoutFeedback>
                <View style={[s.sheetBase, sheet]}>
                  <View style={[s.handle, { backgroundColor: c.border }]} />
                  <Text style={[s.sheetTitle, { color: c.text }]}>
                    {role === "conductor"
                      ? "Solicitar acceso"
                      : "Placa del Vehículo"}
                  </Text>
                  <Text style={[s.sheetSubtitle, { color: c.textSecondary }]}>
                    {role === "conductor"
                      ? "Ingresa la placa del vehículo al que deseas acceder"
                      : `Ingresa la placa de tu ${tipoCamionData?.label}`}
                  </Text>

                  <TextInput
                    style={[
                      s.placaInput,
                      {
                        backgroundColor: c.surface,
                        color: c.text,
                        borderColor: c.accent,
                      },
                    ]}
                    placeholder="ABC123"
                    placeholderTextColor={c.textMuted}
                    value={placaTemporal}
                    onChangeText={(t) => setPlacaTemporal(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={7}
                    autoFocus
                  />

                  <View style={s.modalBtns}>
                    <TouchableOpacity
                      style={[s.btnSecondary, { backgroundColor: c.surface }]}
                      onPress={() => {
                        setModalPlacaVisible(false);
                        if (role !== "conductor") setModalTipoVisible(true);
                      }}>
                      <Text
                        style={[
                          s.btnSecondaryText,
                          { color: c.textSecondary },
                        ]}>
                        {role === "conductor" ? "Cancelar" : "Atrás"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.btnPrimary,
                        { backgroundColor: c.text },
                        (!placaTemporal.trim() || cargando) && { opacity: 0.4 },
                      ]}
                      onPress={handleGuardarPlaca}
                      disabled={!placaTemporal.trim() || cargando}>
                      {cargando ? (
                        <ActivityIndicator color={c.primary} />
                      ) : (
                        <Text style={[s.btnPrimaryText, { color: c.primary }]}>
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

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: H_PAD },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  greetingSmall: { fontSize: 13, marginBottom: 3 },
  greetingName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800" },

  // VEHICLE CARD
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  vehicleIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: { flex: 1 },
  vehicleType: { fontSize: 15, fontWeight: "700", marginBottom: 5 },
  vehicleHint: { fontSize: 13 },
  placaBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  placaText: { fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  changeChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  changeChipText: { fontSize: 13, fontWeight: "700" },

  // GRID
  gridContainer: { paddingBottom: 100 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCard: {
    width: (width - H_PAD * 2 - 12) / 2,
    padding: 18,
  },
  gridIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  gridCardName: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  gridCardSub: { fontSize: 12, marginBottom: 2 },
  gridArrow: {
    marginTop: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // MODALS
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheetBase: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: "84%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingBox: { padding: 40, alignItems: "center" },

  // Vehicle List
  vehicleList: { marginBottom: 16 },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
  vehicleOptionType: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  vehicleOptionPlaca: { fontSize: 13 },
  vehicleOptionConductor: { fontSize: 11, marginTop: 2 },
  statusBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty
  emptyBox: { alignItems: "center", padding: 32 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
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
  },
  tipoIconBg: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tipoLabel: { fontSize: 15, fontWeight: "600" },

  // Placa Input
  placaInput: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 5,
    marginBottom: 24,
  },

  // Buttons
  addButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  addButtonText: { fontSize: 15, fontWeight: "700" },
  cancelTouchable: { alignItems: "center", padding: 12 },
  cancelText: { fontSize: 15, fontWeight: "600" },
  modalBtns: { flexDirection: "row", gap: 12 },
  btnSecondary: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "600" },
  btnPrimary: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "700" },
});
