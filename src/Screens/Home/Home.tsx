// src/screens/Home/Home.tsx

import React, { useState, ComponentType } from "react"; // ✅ Agregar ComponentType
import {
  Text,
  Image,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { styles } from "./HomeStyles";
import { items } from "./Items";
import llantas from "../../assets/img/llantas.webp";
import { useMultas } from "../../hooks/useMultas";
import { HomeStackParamList } from "../../navigation/HomeNavigation";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import {
  VolquetaIcon,
  EstacasIcon,
  PlanchonIcon,
  CisternaIcon,
  FurgonIcon,
  GruaIcon,
} from "../../assets/icons/icons";

type HomeNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "HomeScreen"
>;

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

// ✅ Mapeo de iconos
const ICON_MAP: Record<TipoCamion, ComponentType<IconProps>> = {
  estacas: EstacasIcon,
  volqueta: VolquetaIcon,
  planchon: PlanchonIcon,
  cisterna: CisternaIcon,
  furgon: FurgonIcon,
  grua: GruaIcon,
};

// ✅ Definición de tipos de camión con componentes
const TIPOS_CAMION: {
  id: TipoCamion;
  label: string;
  icon: ComponentType<IconProps>;
}[] = [
  { id: "estacas", label: "Estacas", icon: EstacasIcon },
  { id: "volqueta", label: "Volqueta", icon: VolquetaIcon },
  { id: "planchon", label: "Planchón", icon: PlanchonIcon },
  { id: "cisterna", label: "Cisterna", icon: CisternaIcon },
  { id: "furgon", label: "Furgón", icon: FurgonIcon },
  { id: "grua", label: "Grúa", icon: GruaIcon },
];

export default function Home() {
  const navigation = useNavigation<HomeNavigationProp>();

  const {
    placa: placaActual,
    tipoCamion,
    setPlaca,
    setTipoCamion,
  } = useVehiculoStore();
  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalTipoVisible, setModalTipoVisible] = useState(false);
  const [modalPlacaVisible, setModalPlacaVisible] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const { tieneMultasPendientes, cantidadPendientes, cargando, recargar } =
    useMultas(placaActual, !!placaActual);

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

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  };

  const handleItemPress = (itemId: string) => {
    if (!placaActual) {
      Alert.alert("Error", "Por favor selecciona una placa primero");
      return;
    }

    switch (itemId) {
      case "multas":
        navigation.navigate("Multas", { placa: placaActual });
        break;
      case "soat":
        navigation.navigate("SOAT", { placa: placaActual });
        break;
      case "tecnicomecanica":
        navigation.navigate("RTM", { placa: placaActual });
        break;
      case "licencia":
        navigation.navigate("Licencia", { documento: "1234567890" });
        break;
      default:
        break;
    }
  };

  const renderBadge = (item: (typeof items)[0]) => {
    if (item.id !== "multas" || !item.mostrarBadge) {
      return null;
    }

    if (cargando || refrescando) {
      return (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>...</Text>
        </View>
      );
    }

    if (tieneMultasPendientes) {
      return (
        <View style={[styles.badge, styles.badgePendiente]}>
          <Text style={styles.badgeText}>
            {cantidadPendientes} Pendiente{cantidadPendientes > 1 ? "s" : ""}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.badgeOk]}>
        <Text style={[styles.badgeText, styles.badgeTextOk]}>✓ Al día</Text>
      </View>
    );
  };

  const getTipoCamionLabel = (tipo: TipoCamion | null) => {
    return TIPOS_CAMION.find((t) => t.id === tipo)?.label || "";
  };

  // ✅ Obtener el icono dinámico
  const CamionIconDinamico = tipoCamion ? ICON_MAP[tipoCamion] : VolquetaIcon;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <TouchableOpacity
        style={styles.containerHeader}
        onPress={handleAbrirModalTipo}>
        {/* ✅ Renderiza el icono dinámicamente */}
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

        {/* ✅ Icono de edición simple */}
        <View style={styles.editIconContainer}>
          <Text style={styles.editIcon}>✏️</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.containerScroll}>
        <ScrollView
          style={{ width: "100%", flex: 1 }}
          contentContainerStyle={{
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 10,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={handleRefresh}
              tintColor="#2196F3"
              colors={["#2196F3"]}
              title="Actualizando multas..."
            />
          }>
          <View style={styles.containerAlert}>
            <Image source={llantas} style={styles.imageAlert} />
          </View>

          <View style={styles.itemsContainer}>
            {items.map((item, idx) => {
              const isComponent = typeof item.icon === "function";
              const Icon = item.icon;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemBox,
                    { backgroundColor: item.backgroundColor || "#FFFFFF" },
                  ]}
                  key={item.id || idx}
                  activeOpacity={0.7}
                  onPress={() => handleItemPress(item.id)}>
                  {renderBadge(item)}

                  <View style={styles.iconContainer}>
                    {isComponent ? (
                      <Icon width={40} height={40} />
                    ) : (
                      <Image source={item.icon} style={styles.iconItemBox} />
                    )}
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={styles.textTitle}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={styles.textSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* MODAL SELECCIONAR TIPO CAMIÓN */}
      <Modal visible={modalTipoVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecciona el tipo de camión</Text>

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
                    {/* ✅ Renderizar componente de icono */}
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
          </View>
        </View>
      </Modal>

      {/* MODAL INGRESAR PLACA */}
      <Modal visible={modalPlacaVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
