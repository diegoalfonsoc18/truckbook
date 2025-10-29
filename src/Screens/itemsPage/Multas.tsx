// src/screens/Multas/Multas.tsx (COMPLETO Y FUNCIONAL)

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
import { useNavigation, useRoute } from "@react-navigation/native"; // ✅ IMPORTAR useRoute
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { styles } from "./multasStyle";
import { useMultas } from "../../hooks/useMultas";
import type { Multa } from "../../assets/types/simit.types";
import { HomeStackParamList } from "../../navigation/HomeNavigation";

// ✅ TIPOS CORRECTOS
type Props = NativeStackScreenProps<HomeStackParamList, "Multas">;

export default function Multas({ route }: Props) {
  const navigation = useNavigation();
  const [refrescando, setRefrescando] = useState(false);

  // ✅ RECIBIR placa del parámetro
  const placaActual = route?.params?.placa || "bzo523";

  console.log("🚗 Placa recibida en Multas:", placaActual);

  // ✅ USAR la placa recibida
  const {
    multas: respuestaMultas,
    cargando,
    error,
    recargar,
    tieneMultasPendientes,
    cantidadPendientes,
  } = useMultas(placaActual, true);

  // ✅ EXTRAE LAS MULTAS DE LA RESPUESTA
  const multas: Multa[] = respuestaMultas?.multas || [];

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  };

  const formatCurrency = (valor: any): string => {
    const numero = typeof valor === "string" ? parseFloat(valor) : valor;
    if (isNaN(numero)) return "$0";

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(numero);
  };

  const formatDate = (fecha: string | undefined): string => {
    if (!fecha) return "N/A";
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString("es-CO");
    } catch {
      return fecha;
    }
  };

  const isPagada = (estado: string | undefined): boolean => {
    if (!estado) return false;
    return (
      estado.toLowerCase() === "pagada" ||
      estado.toLowerCase() === "pago" ||
      estado.toLowerCase() === "pagado"
    );
  };

  const renderMultaItem = ({ item }: { item: Multa }) => {
    const pagada = isPagada(item.estado);
    const numeroComparendo =
      item.numero_comparendo || `Multa ${item.infraccion || "N/A"}`;
    const concepto =
      item.descripcion_infraccion || item.infraccion || "Sin concepto";
    const valor = item.valor || 0;
    const fecha = item.fecha_infraccion || "N/A";

    return (
      <View style={styles.multaCard}>
        <View style={styles.multaHeader}>
          <View style={styles.multaNumberContainer}>
            <Text style={styles.multaNumber}>
              Comparendo #{numeroComparendo}
            </Text>
            <Text style={styles.multaDate}>{formatDate(fecha)}</Text>
          </View>

          <View
            style={[
              styles.estadoBadge,
              pagada ? styles.estadoPagada : styles.estadoPendiente,
            ]}>
            <Text
              style={[
                styles.estadoText,
                pagada ? styles.textPagada : styles.textPendiente,
              ]}>
              {pagada ? "✓ Pagada" : "⏱ Pendiente"}
            </Text>
          </View>
        </View>

        <View style={styles.multaContent}>
          <View style={styles.conceptoContainer}>
            <Text style={styles.conceptoLabel}>Infracción</Text>
            <Text style={styles.conceptoText}>{concepto}</Text>
          </View>

          <View style={styles.valorContainer}>
            <Text style={styles.valorLabel}>Valor</Text>
            <Text
              style={[
                styles.valorText,
                pagada ? styles.valorPagada : styles.valorPendiente,
              ]}>
              {formatCurrency(valor)}
            </Text>
          </View>

          {item.organismo_transito && (
            <View style={styles.organismoContainer}>
              <Text style={styles.organismoLabel}>Organismo</Text>
              <Text style={styles.organismoText}>
                {item.organismo_transito}
              </Text>
            </View>
          )}
        </View>

        {!pagada && (
          <TouchableOpacity style={styles.pagarButton}>
            <FontAwesome name="credit-card" size={16} color="white" />
            <Text style={styles.pagarButtonText}>Pagar multa</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const totalPendiente = multas
    .filter((m) => !isPagada(m.estado))
    .reduce((sum, m) => {
      const valor =
        typeof m.valor === "string" ? parseFloat(m.valor) : m.valor || 0;
      return sum + valor;
    }, 0);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome name="check-circle" size={64} color="#4CAF50" />
      <Text style={styles.emptyTitle}>¡Sin multas pendientes!</Text>
      <Text style={styles.emptySubtitle}>Tu vehículo está al día</Text>
    </View>
  );

  // ✅ ERROR STATE
  if (error && !refrescando) {
    return (
      <SafeAreaView style={styles.container}>
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

        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error al cargar multas</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ LOADING STATE
  if (cargando && multas.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
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

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Cargando multas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ MAIN RENDER
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

      {/* Placa Info */}
      <View style={styles.placaInfoContainer}>
        <FontAwesome name="car" size={16} color="#2196F3" />
        <Text style={styles.placaInfoText}>{placaActual}</Text>
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
          keyExtractor={(item, index) =>
            item.numero_comparendo || `multa-${index}`
          }
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
