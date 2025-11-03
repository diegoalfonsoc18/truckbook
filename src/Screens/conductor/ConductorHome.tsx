import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home"; // ✅ Importar desde ubicación correcta
import llantas from "../../assets/img/llantas.webp";
import { items, Item } from "../Home/Items";
import { useMultas } from "../../hooks/useMultas";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { styles as homeStyles } from "../Home/HomeStyles";

type ConductorNavigationProp = NativeStackNavigationProp<any, "ConductorHome">;

export default function ConductorHome() {
  const navigation = useNavigation<ConductorNavigationProp>();
  const { placa: placaActual } = useVehiculoStore();
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

  // ✅ Manejar la navegación según el item
  const handleItemPress = (item: Item) => {
    if (!placaActual) {
      Alert.alert("Error", "Por favor selecciona una placa primero");
      return;
    }

    switch (item.id) {
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
      case "mantenimiento":
        Alert.alert("Mantenimiento", "Funcionalidad en desarrollo");
        break;
      default:
        break;
    }
  };

  // ✅ Renderizar badge personalizado (igual al Home original)
  const renderBadgeConductor = (item: Item) => {
    if (item.id !== "multas" || !item.mostrarBadge) {
      return null;
    }

    if (cargando || refrescando) {
      return (
        <View style={homeStyles.badge}>
          <Text style={homeStyles.badgeText}>...</Text>
        </View>
      );
    }

    if (tieneMultasPendientes) {
      return (
        <View style={[homeStyles.badge, homeStyles.badgePendiente]}>
          <Text style={homeStyles.badgeText}>
            {cantidadPendientes} Pendiente{cantidadPendientes > 1 ? "s" : ""}
          </Text>
        </View>
      );
    }

    return (
      <View style={[homeStyles.badge, homeStyles.badgeOk]}>
        <Text style={[homeStyles.badgeText, homeStyles.badgeTextOk]}>
          ✓ Al día
        </Text>
      </View>
    );
  };

  return (
    <HomeBaseAdapted
      items={items} // ✅ Usar items del Home original
      imageSource={llantas}
      onRefresh={handleRefresh}
      refreshing={refrescando}
      showCamionHeader={true}
      renderBadge={renderBadgeConductor}
      onItemPress={handleItemPress} // ✅ Manejar navegación
    />
  );
}
