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
      id: "conductores",
      name: "Conductores",
      subtitle: "Gestionar equipo",
      icon: "👥",
      backgroundColor: "#E3F2FD",
    },
    {
      id: "flota",
      name: "Vehiculos",
      subtitle: "Gestionar flota",
      icon: "🚛",
      backgroundColor: "#FFF3E0",
    },
    {
      id: "solicitudes",
      name: "Solicitudes",
      subtitle: "Autorizar conductores",
      icon: "📋",
      backgroundColor: "#FFF8E1",
    },
    {
      id: "gastos",
      name: "Aprobar Gastos",
      subtitle: "Revisar solicitudes",
      icon: "💸",
      backgroundColor: "#FCE4EC",
    },
    {
      id: "reportes",
      name: "Reportes",
      subtitle: "Ver actividad",
      icon: "📊",
      backgroundColor: "#F3E5F5",
    },
    {
      id: "rentabilidad",
      name: "Rentabilidad",
      subtitle: "Analisis financiero",
      icon: "💰",
      backgroundColor: "#E8F5E9",
    },
  ];

  const handleItemPress = (item: Item) => {
    switch (item.id) {
      case "solicitudes":
        navigation.navigate("SolicitudesVehiculo");
        break;
      case "rentabilidad":
        navigation.navigate("PropietarioRendimiento");
        break;
      case "flota":
        navigation.navigate("PropietarioVehiculos");
        break;
      case "conductores":
        navigation.navigate("GestionConductores");
        break;
      case "reportes":
        navigation.navigate("PropietarioReportes");
        break;
      case "gastos":
        Alert.alert("En desarrollo", "Aprobacion de gastos proximamente");
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
