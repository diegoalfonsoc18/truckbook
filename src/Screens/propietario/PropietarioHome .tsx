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
      imageSource: require("../../assets/icons/conductor.webp"),
      color: "#74B9FF",
    },
    {
      id: "flota",
      name: "Vehiculos",
      subtitle: "Gestionar flota",
      icon: "bus",
      color: "#FFB800",
    },
    {
      id: "solicitudes",
      name: "Solicitudes",
      subtitle: "Autorizar conductores",
      icon: "clipboard",
      color: "#00CEC9",
    },
    {
      id: "gastos",
      name: "Aprobar Gastos",
      subtitle: "Revisar solicitudes",
      icon: "wallet",
      color: "#E94560",
    },
    {
      id: "reportes",
      name: "Reportes",
      subtitle: "Ver actividad",
      icon: "bar-chart",
      color: "#6C5CE7",
    },
    {
      id: "rentabilidad",
      name: "Rentabilidad",
      subtitle: "Analisis financiero",
      icon: "cash",
      color: "#00D9A5",
    },
    {
      id: "soat",
      name: "SOAT",
      subtitle: "Seguro obligatorio",
      icon: "shield-checkmark",
      color: "#A29BFE",
    },
    {
      id: "tecnomecanica",
      name: "Tecnomecánica",
      subtitle: "Revisión técnica",
      icon: "construct",
      color: "#FDCB6E",
    },
    {
      id: "comparendos",
      name: "Comparendos",
      subtitle: "Multas de tránsito",
      icon: "document-text",
      color: "#FD79A8",
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
      case "soat":
        navigation.navigate("PropietarioSoat");
        break;
      case "tecnomecanica":
        navigation.navigate("PropietarioTecnomecanica");
        break;
      case "comparendos":
        navigation.navigate("PropietarioComparendos");
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
