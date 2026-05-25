import React, { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { Item } from "../Home/Items";
import { useAuth } from "../../hooks/useAuth";
import { cargarSolicitudesPendientes } from "../../services/vehiculoAutorizacionService";
import { registrarPushToken } from "../../services/NotificationService";

type PropietarioNavigationProp = NativeStackNavigationProp<any, "PropietarioHome">;

export default function PropietarioHome() {
  const navigation = useNavigation<PropietarioNavigationProp>();
  const { user } = useAuth();
  const [solicitudesCount, setSolicitudesCount] = useState(0);

  useEffect(() => {
    if (user?.id) registrarPushToken(user.id);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        if (!user?.id) return;
        const { data } = await cargarSolicitudesPendientes(user.id);
        setSolicitudesCount(data.length);
      };
      cargar();
    }, [user?.id])
  );

  const propietarioItems: Item[] = [
    {
      id: "conductores",
      name: "Conductores",
      subtitle: "Gestionar equipo",
      iconName: "conductor",
      iconSize: 80,
      color: "#74B9FF",
    },
    {
      id: "flota",
      name: "Vehiculos",
      subtitle: "Gestionar flota",
      iconName: "truck",
      iconSize: 80,
      color: "#FFB800",
    },
    {
      id: "solicitudes",
      name: "Solicitudes",
      subtitle:
        solicitudesCount > 0
          ? `${solicitudesCount} pendiente${solicitudesCount > 1 ? "s" : ""}`
          : "Autorizar conductores",
      iconName: "check",
      iconSize: 80,
      color: "#00CEC9",
      badgeCount: solicitudesCount,
    },
    {
      id: "gastos",
      name: "Aprobar Gastos",
      subtitle: "Revisar solicitudes",
      iconName: "factura",
      iconSize: 80,
      color: "#E94560",
    },
    {
      id: "reportes",
      name: "Reportes",
      subtitle: "Ver actividad",
      iconName: "report",
      iconSize: 80,
      color: "#6C5CE7",
    },
    {
      id: "rentabilidad",
      name: "Rentabilidad",
      subtitle: "Analisis financiero",
      iconName: "freight",
      iconSize: 80,
      color: "#00D9A5",
    },
    {
      id: "soat",
      name: "SOAT",
      subtitle: "Próximamente",
      iconName: "shield",
      iconSize: 80,
      color: "#6B7280",
    },
    {
      id: "tecnomecanica",
      name: "Tecnomecánica",
      subtitle: "Próximamente",
      iconName: "tool",
      iconSize: 80,
      color: "#6B7280",
    },
    {
      id: "comparendos",
      name: "Comparendos",
      subtitle: "Próximamente",
      iconName: "comparendo",
      iconSize: 80,
      color: "#6B7280",
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
      vehicleCardTitle="Mis vehículos"
      onItemPress={handleItemPress}
    />
  );
}
