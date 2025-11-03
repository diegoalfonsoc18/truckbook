import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home"; // ✅ Importar desde ubicación correcta
import { Item } from "../Home/Items";
import {
  VolquetaIcon,
  EstacasIcon,
  FurgonIcon,
  GruaIcon,
} from "../../assets/icons/icons";

type AdministradorNavigationProp = NativeStackNavigationProp<
  any,
  "AdministradorHome"
>;

export default function AdministradorHome() {
  const navigation = useNavigation<AdministradorNavigationProp>();
  const [refrescando, setRefrescando] = useState(false);

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setRefrescando(false);
    }
  };

  // ✅ Items específicos del ADMINISTRADOR
  const adminItems: Item[] = [
    {
      id: "conductores",
      title: "Conductores",
      subtitle: "Gestionar lista",
      icon: EstacasIcon,
      backgroundColor: "#E3F2FD",
    },
    {
      id: "vehiculos",
      title: "Vehículos",
      subtitle: "Gestionar flota",
      icon: VolquetaIcon,
      backgroundColor: "#FFF3E0",
    },
    {
      id: "gastos",
      title: "Aprobar Gastos",
      subtitle: "Revisar solicitudes",
      icon: FurgonIcon,
      backgroundColor: "#FCE4EC",
    },
    {
      id: "reportes",
      title: "Reportes",
      subtitle: "Estadísticas",
      icon: GruaIcon,
      backgroundColor: "#F3E5F5",
    },
  ];

  const handleItemPress = (item: Item) => {
    switch (item.id) {
      case "conductores":
        Alert.alert("En desarrollo", "Gestión de conductores próximamente");
        break;
      case "vehiculos":
        Alert.alert("En desarrollo", "Gestión de vehículos próximamente");
        break;
      case "gastos":
        Alert.alert("En desarrollo", "Aprobación de gastos próximamente");
        break;
      case "reportes":
        Alert.alert("En desarrollo", "Reportes próximamente");
        break;
      default:
        break;
    }
  };

  return (
    <HomeBaseAdapted
      items={adminItems}
      onRefresh={handleRefresh}
      refreshing={refrescando}
      showCamionHeader={false} // ✅ Sin header de camión
      onItemPress={handleItemPress}
    />
  );
}
