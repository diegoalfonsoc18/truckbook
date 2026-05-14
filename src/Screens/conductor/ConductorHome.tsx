import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { items as baseItems, Item } from "../Home/Items";
import { useMultas } from "../../hooks/useMultas";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../constants/Themecontext";
import { registrarPushToken } from "../../services/NotificationService";
import { ConductorStackParamList } from "../../navigation/ConductorNavigation";

type ConductorNavProp = NativeStackNavigationProp<
  ConductorStackParamList,
  "ConductorHome"
>;

export default function ConductorHome() {
  const navigation = useNavigation<ConductorNavProp>();
  const { colors: c } = useTheme();
  const { placa: placaActual, validarPlacaParaUsuario } = useVehiculoStore();
  const { user } = useAuth();
  const [refrescando, setRefrescando] = useState(false);

  const { tieneMultasPendientes, cantidadPendientes, cargando, recargar } =
    useMultas(placaActual, !!placaActual);

  // Registrar push token y validar acceso al vehículo
  useEffect(() => {
    if (!user?.id) return;
    registrarPushToken(user.id);
    // Si el vehículo fue desvinculado mientras la app estaba cerrada, limpiar el vehículo activo
    validarPlacaParaUsuario(user.id);
  }, [user?.id]);

  // Items del conductor con invitaciones
  const conductorItems: Item[] = [
    ...baseItems,
  ];

  const handleItemPress = (item: Item) => {
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
    if (item.id !== "multas" || !item.mostrarBadge) return null;

    const badge: any = {
      position: "absolute", top: 8, right: 8,
      paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 10, zIndex: 10,
    };

    if (cargando || refrescando) {
      return (
        <View style={[badge, { backgroundColor: c.surface }]}>
          <Text style={{ color: c.textSecondary, fontSize: 10, fontWeight: "700" }}>…</Text>
        </View>
      );
    }

    if (tieneMultasPendientes) {
      return (
        <View style={[badge, { backgroundColor: c.danger }]}>
          <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>
            {cantidadPendientes} Pendiente{cantidadPendientes > 1 ? "s" : ""}
          </Text>
        </View>
      );
    }

    return (
      <View style={[badge, { backgroundColor: c.success }]}>
        <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>Al día</Text>
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
