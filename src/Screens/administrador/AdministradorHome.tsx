import React, { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { Item } from "../Home/Items";
import { AdministradorStackParamList } from "../../navigation/AdministradorNavigation";
import { useAuth } from "../../hooks/useAuth";
import { cargarTodasSolicitudesPendientes } from "../../services/vehiculoAutorizacionService";
import { registrarPushToken } from "../../services/NotificationService";

type AdminNavProp = NativeStackNavigationProp<
  AdministradorStackParamList,
  "AdminHome"
>;

export default function AdministradorHome() {
  const navigation = useNavigation<AdminNavProp>();
  const { user } = useAuth();
  const [solicitudesCount, setSolicitudesCount] = useState(0);

  useEffect(() => {
    if (user?.id) registrarPushToken(user.id);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        const { data } = await cargarTodasSolicitudesPendientes();
        setSolicitudesCount(data.length);
      };
      cargar();
    }, [])
  );

  const adminItems: Item[] = [
    {
      id: "conductores",
      name: "Conductores",
      subtitle: "Gestionar lista",
      iconName: "conductor",
      iconSize: 56,
      color: "#74B9FF",
    },
    {
      id: "vehiculos",
      name: "Vehiculos",
      subtitle: "Gestionar flota",
      iconName: "truck",
      iconSize: 66,
      color: "#FFB800",
    },
    {
      id: "solicitudes",
      name: "Solicitudes",
      subtitle: solicitudesCount > 0
        ? `${solicitudesCount} pendiente${solicitudesCount > 1 ? "s" : ""}`
        : "Accesos pendientes",
      iconName: "check",
      iconSize: 66,
      color: "#00CEC9",
      badgeCount: solicitudesCount,
    },
    {
      id: "gastos",
      name: "Aprobar Gastos",
      subtitle: "Revisar solicitudes",
      iconName: "factura",
      iconSize: 66,
      color: "#E94560",
    },
    {
      id: "reportes",
      name: "Reportes",
      subtitle: "Ver actividad",
      iconName: "report",
      iconSize: 66,
      color: "#00D9A5",
    },

    {
      id: "soat",
      name: "SOAT",
      subtitle: "Seguro obligatorio",
      iconName: "shield",
      iconSize: 66,
      color: "#A29BFE",
    },
    {
      id: "tecnomecanica",
      name: "Tecnomecánica",
      subtitle: "Revisión técnica",
      iconName: "tool",
      iconSize: 66,
      color: "#FDCB6E",
    },
    {
      id: "comparendos",
      name: "Comparendos",
      subtitle: "Multas de tránsito",
      iconName: "comparendo",
      iconSize: 66,
      color: "#FD79A8",
    },
  ];

  const handleItemPress = (item: Item) => {
    switch (item.id) {
      case "reportes":
        navigation.navigate("AdminReportes");
        break;
      case "solicitudes":
        navigation.navigate("AdminSolicitudes");
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
