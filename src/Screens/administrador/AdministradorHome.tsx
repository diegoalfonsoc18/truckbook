import React from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { Item } from "../Home/Items";
import { AdministradorStackParamList } from "../../navigation/AdministradorNavigation";

type AdminNavProp = NativeStackNavigationProp<AdministradorStackParamList, "AdminHome">;

export default function AdministradorHome() {
  const navigation = useNavigation<AdminNavProp>();

  const adminItems: Item[] = [
    {
      id: "conductores",
      name: "Conductores",
      subtitle: "Gestionar lista",
      icon: "👥",
      backgroundColor: "#E3F2FD",
    },
    {
      id: "vehiculos",
      name: "Vehiculos",
      subtitle: "Gestionar flota",
      icon: "🚛",
      backgroundColor: "#FFF3E0",
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
      id: "rendimiento",
      name: "Rendimiento",
      subtitle: "Comparar vehículos",
      icon: "🏆",
      backgroundColor: "#E8F5E9",
    },
    {
      id: "soat",
      name: "SOAT",
      subtitle: "Seguro obligatorio",
      icon: "🛡️",
      backgroundColor: "#E8EAF6",
    },
    {
      id: "tecnomecanica",
      name: "Tecnomecánica",
      subtitle: "Revisión técnica",
      icon: "🔧",
      backgroundColor: "#FFF8E1",
    },
    {
      id: "comparendos",
      name: "Comparendos",
      subtitle: "Multas de tránsito",
      icon: "📝",
      backgroundColor: "#FFEBEE",
    },
  ];

  const handleItemPress = (item: Item) => {
    switch (item.id) {
      case "reportes":
        navigation.navigate("AdminReportes");
        break;
      case "conductores":
        navigation.navigate("AdminConductores");
        break;
      case "vehiculos":
        navigation.navigate("AdminVehiculos");
        break;
      case "gastos":
        Alert.alert("En desarrollo", "Aprobacion de gastos proximamente");
        break;
      case "rendimiento":
        navigation.navigate("AdminRendimiento");
        break;
      case "soat":
        navigation.navigate("AdminSoat");
        break;
      case "tecnomecanica":
        navigation.navigate("AdminTecnomecanica");
        break;
      case "comparendos":
        navigation.navigate("AdminComparendos");
        break;
      default:
        break;
    }
  };

  return (
    <HomeBaseAdapted
      items={adminItems}
      showCamionHeader={true}
      onItemPress={handleItemPress}
    />
  );
}
