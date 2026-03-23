import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { items as baseItems, Item } from "../Home/Items";
import { useMultas } from "../../hooks/useMultas";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { styles as homeStyles } from "../Home/HomeStyles";
import { cargarInvitacionesPendientes } from "../../services/vehiculoAutorizacionService";
import { ConductorStackParamList } from "../../navigation/ConductorNavigation";

type ConductorNavProp = NativeStackNavigationProp<ConductorStackParamList, "ConductorHome">;

export default function ConductorHome() {
  const navigation = useNavigation<ConductorNavProp>();
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const [refrescando, setRefrescando] = useState(false);
  const [invitacionesCount, setInvitacionesCount] = useState(0);

  const { tieneMultasPendientes, cantidadPendientes, cargando, recargar } =
    useMultas(placaActual, !!placaActual);

  // Cargar cantidad de invitaciones pendientes
  useEffect(() => {
    const cargar = async () => {
      if (!user?.id) return;
      const { data } = await cargarInvitacionesPendientes(user.id);
      setInvitacionesCount(data.length);
    };
    cargar();
  }, [user?.id]);

  // Items del conductor con invitaciones
  const conductorItems: Item[] = [
    {
      id: "invitaciones",
      icon: "📩",
      name: "Invitaciones",
      subtitle: invitacionesCount > 0 ? `${invitacionesCount} pendiente${invitacionesCount > 1 ? "s" : ""}` : "Sin pendientes",
      backgroundColor: "#FFF8E1",
    },
    ...baseItems,
  ];

  const handleItemPress = (item: Item) => {
    if (item.id === "invitaciones") {
      navigation.navigate("Invitaciones");
      return;
    }

    if (!placaActual) {
      Alert.alert("Error", "Por favor selecciona una placa primero");
      return;
    }

    switch (item.id) {
      case "multas":
        navigation.navigate("Multas" as any, { placa: placaActual });
        break;
      case "soat":
        navigation.navigate("SOAT" as any, { placa: placaActual });
        break;
      case "tecnicomecanica":
        navigation.navigate("RTM" as any, { placa: placaActual });
        break;
      case "licencia":
        navigation.navigate("Licencia" as any, { documento: "1234567890" });
        break;
      case "mantenimiento":
        Alert.alert("Mantenimiento", "Funcionalidad en desarrollo");
        break;
      default:
        break;
    }
  };

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
      items={conductorItems}
      showCamionHeader={true}
      renderBadge={renderBadgeConductor}
      onItemPress={handleItemPress}
    />
  );
}
