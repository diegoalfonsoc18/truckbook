import React, { useState, ComponentType, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../Home/HomeStyles";
import ScrollContent from "../../components/Scrollcontent";
import { Item } from "../Home/Items";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import supabase from "../../config/SupaBaseConfig";
import {
  VolquetaIcon,
  EstacasIcon,
  FurgonIcon,
  GruaIcon,
} from "../../assets/icons/icons";

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

interface HomeBaseAdaptedProps {
  items: Item[];
  imageSource?: any;
  onRefresh?: () => void;
  refreshing?: boolean;
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

const TIPOS_CAMION: {
  id: TipoCamion;
  label: string;
  icon: ComponentType<IconProps>;
}[] = [
  { id: "estacas", label: "Estacas", icon: EstacasIcon },
  { id: "volqueta", label: "Volqueta", icon: VolquetaIcon },
  { id: "furgon", label: "Furgón", icon: FurgonIcon },
  { id: "grua", label: "Grúa", icon: GruaIcon },
];

export default function HomeBaseAdapted({
  items,
  imageSource,
  onRefresh,
  refreshing = false,
  showCamionHeader = true,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
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

  // ✅ Cargar vehículos del conductor
  useEffect(() => {
    if (user?.id) {
      cargarVehiculos();
    }
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
      console.log("✅ Vehículos cargados:", data?.length || 0);
    } catch (err) {
      console.error("Error cargando vehículos:", err);
      Alert.alert("Error", "No se pudieron cargar los vehículos");
    } finally {
      setCargando(false);
    }
  };

  const getTipoCamionLabel = (tipo: TipoCamion | null) => {
    return TIPOS_CAMION.find((t) => t.id === tipo)?.label || "";
  };

  // ✅ Al hacer click en header, mostrar lista de vehículos
  const handleAbrirListaVehiculos = () => {
    setModalVehiculosVisible(true);
  };

  // ✅ Seleccionar un vehículo de la lista
  const handleSeleccionarVehiculo = (vehiculo: Vehiculo) => {
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
    setModalVehiculosVisible(false);
  };

  // ✅ Agregar nuevo vehículo
  const handleAgregarNuevoVehiculo = () => {
    setModalVehiculosVisible(false);
    setModalTipoVisible(true);
  };

  const handleSeleccionarTipo = (tipo: TipoCamion) => {
    setTipoCamion(tipo);
    setModalTipoVisible(false);
    setModalPlacaVisible(true);
  };

  const handleGuardarPlaca = async () => {
    const placaLimpia = placaTemporal.trim().toUpperCase();

    if (!placaLimpia) {
      Alert.alert("Error", "Por favor ingresa una placa válida");
      return;
    }

    if (placaLimpia.length < 3) {
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

      console.log("✅ Vehículo guardado:", placaLimpia);
      Alert.alert("Éxito", `Placa ${placaLimpia} registrada correctamente`);

      // Recargar lista de vehículos
      await cargarVehiculos();

      // Seleccionar el nuevo vehículo
      setPlaca(placaLimpia);

      setModalPlacaVisible(false);
      setPlacaTemporal("");
    } catch (err) {
      console.error("❌ Error:", err);
      Alert.alert("Error", "No se pudo registrar la placa");
    } finally {
      setCargando(false);
    }
  };

  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* ✅ HEADER CON CAMIÓN - Click para cambiar vehículo */}
      {showCamionHeader && (
        <TouchableOpacity
          style={styles.containerHeader}
          onPress={handleAbrirListaVehiculos}>
          <CamionIconDinamico width={32} height={32} color="#000" />
          <View style={styles.headerTextContainer}>
            {placaActual ? (
              <>
                <Text style={styles.placaLabel}>
                  {getTipoCamionLabel(tipoCamion)}
                </Text>
                <Text style={styles.placaText}>{placaActual}</Text>
              </>
            ) : (
              <Text style={styles.seleccionarCamionText}>
                Selecciona tu camión
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ✅ SCROLL CONTENT REUTILIZABLE */}
      <ScrollContent
        items={items}
        imageSource={imageSource}
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderBadge={renderBadge}
        onItemPress={onItemPress}
      />

      {/* ✅ MODAL LISTA DE VEHÍCULOS */}
      <Modal
        visible={modalVehiculosVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVehiculosVisible(false)}>
        <TouchableWithoutFeedback
          onPress={() => setModalVehiculosVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Selecciona tu camión</Text>

              {cargando ? (
                <ActivityIndicator size="large" color="#2196F3" />
              ) : vehiculos.length > 0 ? (
                <>
                  <FlatList
                    data={vehiculos}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                      const IconComponent =
                        ICON_MAP[item.tipo_camion] || VolquetaIcon;
                      const esActual = item.placa === placaActual;

                      return (
                        <TouchableOpacity
                          style={[
                            styles.tipoButton,
                            esActual && { backgroundColor: "#E3F2FD" },
                          ]}
                          onPress={() => handleSeleccionarVehiculo(item)}>
                          <IconComponent
                            width={24}
                            height={24}
                            color={esActual ? "#1976D2" : "#2196F3"}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.tipoButtonText,
                                esActual && {
                                  color: "#1976D2",
                                  fontWeight: "bold",
                                },
                              ]}>
                              {getTipoCamionLabel(item.tipo_camion)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: esActual ? "#1976D2" : "#666",
                              }}>
                              {item.placa}
                            </Text>
                          </View>
                          {esActual && (
                            <Text
                              style={{ color: "#1976D2", fontWeight: "bold" }}>
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />

                  <TouchableOpacity
                    style={[styles.guardarButton, { marginTop: 10 }]}
                    onPress={handleAgregarNuevoVehiculo}>
                    <Text style={styles.guardarButtonText}>
                      + Agregar nuevo camión
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ marginBottom: 20 }}>
                    No tienes camiones registrados
                  </Text>
                  <TouchableOpacity
                    style={styles.guardarButton}
                    onPress={handleAgregarNuevoVehiculo}>
                    <Text style={styles.guardarButtonText}>
                      Agregar primer camión
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVehiculosVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ✅ MODAL SELECCIONAR TIPO CAMIÓN */}
      <Modal
        visible={modalTipoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTipoVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalTipoVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                Selecciona el tipo de camión
              </Text>

              <FlatList
                data={TIPOS_CAMION}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      style={styles.tipoButton}
                      onPress={() => handleSeleccionarTipo(item.id)}>
                      <IconComponent width={24} height={24} color="#2196F3" />
                      <Text style={styles.tipoButtonText}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalTipoVisible(false);
                  setModalVehiculosVisible(true);
                }}>
                <Text style={styles.cancelButtonText}>Atrás</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ✅ MODAL INGRESAR PLACA */}
      <Modal
        visible={modalPlacaVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPlacaVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalPlacaVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                Ingresa la placa de tu {getTipoCamionLabel(tipoCamion)}
              </Text>

              <TextInput
                style={styles.placaInput}
                placeholder="Ej: BZO523"
                placeholderTextColor="#999"
                value={placaTemporal}
                onChangeText={setPlacaTemporal}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                editable={!cargando}
                autoFocus
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalPlacaVisible(false);
                    setModalTipoVisible(true);
                  }}
                  disabled={cargando}>
                  <Text style={styles.cancelButtonText}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.guardarButton}
                  onPress={handleGuardarPlaca}
                  disabled={cargando}>
                  <Text style={styles.guardarButtonText}>
                    {cargando ? "Guardando..." : "Guardar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
