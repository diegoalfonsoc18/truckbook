// src/screens/SOAT/SOAT.tsx

import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { styles } from "./soatStyles";
import { useSOAT } from "../../hooks/UseSoat";
import type { HomeStackParamList } from "../../navigation/HomeNavigation";

type Props = NativeStackScreenProps<HomeStackParamList, "SOAT">;

export default function SOAT({ route }: Props) {
  const navigation = useNavigation();
  const [refrescando, setRefrescando] = useState(false);

  // ✅ RECIBIR placa del parámetro
  const placaActual = route?.params?.placa || "bzo523";

  // ✅ USAR hook para consultar SOAT
  const {
    soat: respuestaSOAT,
    vehiculo,
    cargando,
    error,
    recargar,
    esSOATVigente,
    esRTMVigente,
    diasParaVencerSOAT,
  } = useSOAT(placaActual, true);

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
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

  const getStatusColor = (vigente: boolean, diasParaVencer: number): string => {
    if (!vigente) return "#E74C3C"; // Rojo - Vencido
    if (diasParaVencer <= 30) return "#F39C12"; // Naranja - Por vencer
    return "#27AE60"; // Verde - Vigente
  };

  const getStatusText = (vigente: boolean, diasParaVencer: number): string => {
    if (!vigente) return "❌ Vencido";
    if (diasParaVencer <= 30) return `⚠️ Vence en ${diasParaVencer} días`;
    return "✅ Vigente";
  };

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
          <Text style={styles.headerTitle}>SOAT y RTM</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error al cargar SOAT</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ LOADING STATE
  if (cargando && !respuestaSOAT) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <FontAwesome name="chevron-left" size={20} color="#333" />
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SOAT y RTM</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Cargando SOAT...</Text>
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
        <Text style={styles.headerTitle}>SOAT y RTM</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Placa Info */}
      <View style={styles.placaInfoContainer}>
        <FontAwesome name="car" size={16} color="#2196F3" />
        <Text style={styles.placaInfoText}>{placaActual}</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefresh}
            tintColor="#2196F3"
            colors={["#2196F3"]}
            title="Actualizando SOAT..."
          />
        }>
        {/* Información del vehículo */}
        {vehiculo && (
          <View style={styles.vehiculoCard}>
            <Text style={styles.cardTitle}>📋 Información del Vehículo</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Marca:</Text>
              <Text style={styles.infoValue}>{vehiculo.marca || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modelo:</Text>
              <Text style={styles.infoValue}>{vehiculo.modelo || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Clase:</Text>
              <Text style={styles.infoValue}>{vehiculo.clase || "N/A"}</Text>
            </View>
          </View>
        )}

        {/* SOAT */}
        {respuestaSOAT?.soat && (
          <View
            style={[
              styles.soatCard,
              {
                borderLeftColor: getStatusColor(
                  esSOATVigente,
                  diasParaVencerSOAT
                ),
              },
            ]}>
            <View style={styles.soatHeader}>
              <Text style={styles.cardTitle}>🛡️ SOAT</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(
                      esSOATVigente,
                      diasParaVencerSOAT
                    ),
                  },
                ]}>
                <Text style={styles.statusText}>
                  {getStatusText(esSOATVigente, diasParaVencerSOAT)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Número Póliza:</Text>
              <Text style={styles.infoValue}>
                {respuestaSOAT.soat.numeroPóliza || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expedido por:</Text>
              <Text style={styles.infoValue}>
                {respuestaSOAT.soat.entidadExpideSoat || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Expedición:</Text>
              <Text style={styles.infoValue}>
                {formatDate(respuestaSOAT.soat.fechaExpedicion)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Vencimiento:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color: getStatusColor(esSOATVigente, diasParaVencerSOAT),
                    fontWeight: "700",
                  },
                ]}>
                {formatDate(respuestaSOAT.soat.fechaVencimiento)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={styles.infoValue}>
                {respuestaSOAT.soat.estado || "N/A"}
              </Text>
            </View>
          </View>
        )}

        {/* RTM */}
        {respuestaSOAT?.rtm && (
          <View
            style={[
              styles.rtmCard,
              {
                borderLeftColor: esRTMVigente ? "#27AE60" : "#E74C3C",
              },
            ]}>
            <View style={styles.soatHeader}>
              <Text style={styles.cardTitle}>
                🔧 RTM (Revisión Técnico Mecánica)
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: esRTMVigente ? "#27AE60" : "#E74C3C",
                  },
                ]}>
                <Text style={styles.statusText}>
                  {esRTMVigente ? "✅ Vigente" : "❌ Vencida"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo Revisión:</Text>
              <Text style={styles.infoValue}>
                {respuestaSOAT.rtm.tipoRevision || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Expedición:</Text>
              <Text style={styles.infoValue}>
                {formatDate(respuestaSOAT.rtm.fechaExpedicion)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Vigente:</Text>
              <Text style={styles.infoValue}>
                {formatDate(respuestaSOAT.rtm.fechaVigente)}
              </Text>
            </View>
          </View>
        )}

        {/* Sin datos */}
        {!respuestaSOAT?.soat && !respuestaSOAT?.rtm && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="info-circle" size={64} color="#99999" />
            <Text style={styles.emptyTitle}>Sin información</Text>
            <Text style={styles.emptySubtitle}>
              No se encontró información de SOAT o RTM para esta placa
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
