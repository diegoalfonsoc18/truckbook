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

type PropietarioNavigationProp = NativeStackNavigationProp<
  any,
  "PropietarioHome"
>;

export default function PropietarioHome() {
  const navigation = useNavigation<PropietarioNavigationProp>();
  const [refrescando, setRefrescando] = useState(false);

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setRefrescando(false);
    }
  };

  // ✅ Items específicos del PROPIETARIO
  const propietarioItems: Item[] = [
    {
      id: "rentabilidad",
      title: "Rentabilidad",
      subtitle: "Análisis financiero",
      icon: EstacasIcon,
      backgroundColor: "#E3F2FD",
    },
    {
      id: "flota",
      title: "Flota",
      subtitle: "Gestionar vehículos",
      icon: VolquetaIcon,
      backgroundColor: "#FFF3E0",
    },
    {
      id: "conductores",
      title: "Conductores",
      subtitle: "Gestionar equipo",
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
      case "rentabilidad":
        Alert.alert("En desarrollo", "Rentabilidad próximamente");
        break;
      case "flota":
        Alert.alert("En desarrollo", "Gestión de flota próximamente");
        break;
      case "conductores":
        Alert.alert("En desarrollo", "Gestión de conductores próximamente");
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
      items={propietarioItems}
      onRefresh={handleRefresh}
      refreshing={refrescando}
      showCamionHeader={false} // ✅ Sin header de camión
      onItemPress={handleItemPress}
    />
  );
}
