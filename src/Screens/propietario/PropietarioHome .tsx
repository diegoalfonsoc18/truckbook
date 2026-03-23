import React from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { Item } from "../Home/Items";

type PropietarioNavigationProp = NativeStackNavigationProp<
  any,
  "PropietarioHome"
>;

export default function PropietarioHome() {
  const navigation = useNavigation<PropietarioNavigationProp>();

  const propietarioItems: Item[] = [
    {
      id: "solicitudes",
      name: "Solicitudes",
      subtitle: "Autorizar conductores",
      icon: "📋",
      backgroundColor: "#FFF8E1",
    },
    {
      id: "rentabilidad",
      name: "Rentabilidad",
      subtitle: "Analisis financiero",
      icon: "💰",
      backgroundColor: "#E3F2FD",
    },
    {
      id: "flota",
      name: "Flota",
      subtitle: "Gestionar vehiculos",
      icon: "🚛",
      backgroundColor: "#FFF3E0",
    },
    {
      id: "conductores",
      name: "Conductores",
      subtitle: "Gestionar equipo",
      icon: "👥",
      backgroundColor: "#FCE4EC",
    },
    {
      id: "reportes",
      name: "Reportes",
      subtitle: "Estadisticas",
      icon: "📊",
      backgroundColor: "#F3E5F5",
    },
  ];

  const handleItemPress = (item: Item) => {
    switch (item.id) {
      case "solicitudes":
        navigation.navigate("SolicitudesVehiculo");
        break;
      case "rentabilidad":
        Alert.alert("En desarrollo", "Rentabilidad proximamente");
        break;
      case "flota":
        Alert.alert("En desarrollo", "Gestion de flota proximamente");
        break;
      case "conductores":
        navigation.navigate("GestionConductores");
        break;
      case "reportes":
        Alert.alert("En desarrollo", "Reportes proximamente");
        break;
      default:
        break;
    }
  };

  return (
    <HomeBaseAdapted
      items={propietarioItems}
      showCamionHeader={true}
      onItemPress={handleItemPress}
    />
  );
}
