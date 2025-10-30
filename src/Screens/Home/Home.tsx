// src/screens/Home/Home.tsx (ACTUALIZADO CON SOAT)

import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { styles } from "./HomeStyles";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { items } from "./Items";
import { CamionIcon } from "../../assets/icons/icons";
import llantas from "../../assets/img/llantas.webp";
import { useMultas } from "../../hooks/useMultas";
import { HomeStackParamList } from "../../navigation/HomeNavigation";

type HomeNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "HomeScreen"
>;

export default function Home() {
  const navigation = useNavigation<HomeNavigationProp>();

  const [placaActual, setPlacaActual] = useState<string | null>(null);
  const [placaTemporal, setPlacaTemporal] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const { tieneMultasPendientes, cantidadPendientes, cargando, recargar } =
    useMultas(placaActual, !!placaActual);

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  };

  const handleAbrirModalPlaca = () => {
    setPlacaTemporal(placaActual || "");
    setModalVisible(true);
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

    setPlacaActual(placaLimpia);
    setModalVisible(false);
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
      case "tecnicomecanica": // ✅ AGREGAR ESTO
        navigation.navigate("RTM", { placa: placaActual });
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

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* ✅ HEADER CON BOTÓN "SELECCIONA TU CAMIÓN" */}
      <TouchableOpacity
        style={styles.containerHeader}
        onPress={handleAbrirModalPlaca}>
        <CamionIcon />
        <View style={styles.headerTextContainer}>
          {placaActual ? (
            <>
              <Text style={styles.placaLabel}>Vehículo seleccionado</Text>
              <Text style={styles.placaText}>{placaActual}</Text>
            </>
          ) : (
            <Text style={styles.seleccionarCamionText}>
              Selecciona tu camión
            </Text>
          )}
        </View>
        <FontAwesome name="drivers-license" size={24} color="black" />
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

      {/* ✅ MODAL PARA INGRESAR PLACA */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Ingresa la placa de tu vehículo
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
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
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
