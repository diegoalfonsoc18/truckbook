import React, { useState, ComponentType } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../Home/HomeStyles";
import ScrollContent from "../../components/Scrollcontent";
import { Item } from "../Home/Items";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
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

// ✅ Mapeo de iconos
const ICON_MAP: Record<TipoCamion, ComponentType<IconProps>> = {
  estacas: EstacasIcon,
  volqueta: VolquetaIcon,
  furgon: FurgonIcon,
  grua: GruaIcon,
};

// ✅ Definición de tipos de camión
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

  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [modalPlacaVisible, setModalPlacaVisible] = useState(false);

  const handleAbrirModalTipo = () => {
    setModalTipoVisible(true);
  };

  const handleSeleccionarTipo = (tipo: TipoCamion) => {
    setTipoCamion(tipo);
    setModalTipoVisible(false);
    setModalPlacaVisible(true);
  };

  const handleGuardarPlaca = () => {
    const placaLimpia = placaTemporal.trim().toUpperCase();

    if (!placaLimpia) {
      Alert.alert("Error", "Por favor ingresa una placa válida");
      return;
    }

    if (placaLimpia.length < 3) {
      Alert.alert("Error", "La placa debe tener al menos 3 caracteres");
      return;
    }

    setPlaca(placaLimpia);
    setModalPlacaVisible(false);
    setPlacaTemporal("");
  };

  const getTipoCamionLabel = (tipo: TipoCamion | null) => {
    return TIPOS_CAMION.find((t) => t.id === tipo)?.label || "";
  };

  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* ✅ HEADER CON CAMIÓN */}
      {showCamionHeader && (
        <TouchableOpacity
          style={styles.containerHeader}
          onPress={handleAbrirModalTipo}>
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
                onPress={() => setModalTipoVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
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
                autoFocus
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalPlacaVisible(false);
                    setModalTipoVisible(true);
                  }}>
                  <Text style={styles.cancelButtonText}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.guardarButton}
                  onPress={handleGuardarPlaca}>
                  <Text style={styles.guardarButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
