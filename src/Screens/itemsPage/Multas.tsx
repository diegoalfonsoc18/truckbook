// src/screens/Multas/Multas.tsx

import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { styles } from "./multasStyle";
import { useMultas } from "../../hooks/useMultas";

interface Multa {
  id: string;
  numero: string;
  valor: number;
  fecha: string;
  concepto: string;
  estado: "pagada" | "pendiente";
  placa: string;
}

export default function Multas() {
  const navigation = useNavigation();
  const [placaActual] = useState<string | null>("eka854");
  const [refrescando, setRefrescando] = useState(false);

  const { tieneMultasPendientes, cantidadPendientes, cargando, recargar } =
    useMultas(placaActual, true);

  // Datos de ejemplo (en un caso real, vendrían del hook useMultas o una API)
  const [multas] = useState<Multa[]>([
    {
      id: "1",
      numero: "2024-001",
      valor: 450000,
      fecha: "2024-10-15",
      concepto: "Exceso de velocidad",
      estado: "pendiente",
      placa: "eka854",
    },
    {
      id: "2",
      numero: "2024-002",
      valor: 320000,
      fecha: "2024-09-20",
      concepto: "Estacionamiento prohibido",
      estado: "pendiente",
      placa: "eka854",
    },
    {
      id: "3",
      numero: "2024-003",
      valor: 580000,
      fecha: "2024-08-10",
      concepto: "No llevar documentos",
      estado: "pagada",
      placa: "eka854",
    },
    {
      id: "4",
      numero: "2024-004",
      valor: 240000,
      fecha: "2024-07-05",
      concepto: "Placa ilegible",
      estado: "pagada",
      placa: "eka854",
    },
  ]);

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  };

  const formatCurrency = (valor: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor);
  };

  const formatDate = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-CO");
  };

  const renderMultaItem = ({ item }: { item: Multa }) => {
    const isPagada = item.estado === "pagada";

    return (
      <View style={styles.multaCard}>
        <View style={styles.multaHeader}>
          <View style={styles.multaNumberContainer}>
            <Text style={styles.multaNumber}>Multa #{item.numero}</Text>
            <Text style={styles.multaDate}>{formatDate(item.fecha)}</Text>
          </View>

          <View
            style={[
              styles.estadoBadge,
              isPagada ? styles.estadoPagada : styles.estadoPendiente,
            ]}>
            <Text
              style={[
                styles.estadoText,
                isPagada ? styles.textPagada : styles.textPendiente,
              ]}>
              {isPagada ? "✓ Pagada" : "⏱ Pendiente"}
            </Text>
          </View>
        </View>

        <View style={styles.multaContent}>
          <View style={styles.conceptoContainer}>
            <Text style={styles.conceptoLabel}>Concepto</Text>
            <Text style={styles.conceptoText}>{item.concepto}</Text>
          </View>

          <View style={styles.valorContainer}>
            <Text style={styles.valorLabel}>Valor</Text>
            <Text
              style={[
                styles.valorText,
                isPagada ? styles.valorPagada : styles.valorPendiente,
              ]}>
              {formatCurrency(item.valor)}
            </Text>
          </View>
        </View>

        {item.estado === "pendiente" && (
          <TouchableOpacity style={styles.pagarButton}>
            <FontAwesome name="credit-card" size={16} color="white" />
            <Text style={styles.pagarButtonText}>Pagar multa</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const totalPendiente = multas
    .filter((m) => m.estado === "pendiente")
    .reduce((sum, m) => sum + m.valor, 0);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome name="check-circle" size={64} color="#4CAF50" />
      <Text style={styles.emptyTitle}>¡Sin multas pendientes!</Text>
      <Text style={styles.emptySubtitle}>Tu vehículo está al día</Text>
    </View>
  );

  if (cargando && !refrescando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Cargando multas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <FontAwesome name="chevron-left" size={20} color="#333" />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Multas</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Resumen */}
      <View style={styles.resumenContainer}>
        <View style={styles.resumenCard}>
          <Text style={styles.resumenLabel}>Total multas</Text>
          <Text style={styles.resumenValor}>{multas.length}</Text>
        </View>
        <View style={styles.resumenCard}>
          <Text style={styles.resumenLabel}>Pendientes</Text>
          <Text style={[styles.resumenValor, styles.resumenPendiente]}>
            {cantidadPendientes}
          </Text>
        </View>
        <View style={styles.resumenCard}>
          <Text style={styles.resumenLabel}>Total a pagar</Text>
          <Text style={[styles.resumenValor, styles.resumenMonto]}>
            {formatCurrency(totalPendiente)}
          </Text>
        </View>
      </View>

      {/* Lista de multas */}
      {multas.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={multas}
          renderItem={renderMultaItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={handleRefresh}
              tintColor="#2196F3"
              colors={["#2196F3"]}
              title="Actualizando multas..."
            />
          }
        />
      )}

      {/* Botón de pago total */}
      {totalPendiente > 0 && (
        <TouchableOpacity style={styles.pagarTodoButton}>
          <FontAwesome name="credit-card" size={18} color="white" />
          <Text style={styles.pagarTodoText}>
            Pagar todo ({formatCurrency(totalPendiente)})
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
