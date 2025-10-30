// src/screens/RTM/RTM.tsx

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
import { styles } from "./rtmStyles";
import { useRTM } from "../../hooks/usesRtm";
import type { HomeStackParamList } from "../../navigation/HomeNavigation";

type Props = NativeStackScreenProps<HomeStackParamList, "RTM">;

export default function RTM({ route }: Props) {
  const navigation = useNavigation();
  const [refrescando, setRefrescando] = useState(false);

  const placaActual = route?.params?.placa || "bzo523";

  const {
    rtm: respuestaRTM,
    cargando,
    error,
    recargar,
    esRTMVigente,
    diasParaVencerRTM,
  } = useRTM(placaActual, true);

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
          <Text style={styles.headerTitle}>RTM</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error al cargar RTM</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ LOADING STATE
  if (cargando && !respuestaRTM) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <FontAwesome name="chevron-left" size={20} color="#333" />
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RTM</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Cargando RTM...</Text>
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
        <Text style={styles.headerTitle}>RTM</Text>
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
            title="Actualizando RTM..."
          />
        }>
        {/* RTM */}
        {respuestaRTM?.rtm && (
          <View
            style={[
              styles.rtmCard,
              {
                borderLeftColor: esRTMVigente ? "#27AE60" : "#E74C3C",
              },
            ]}>
            <View style={styles.rtmHeader}>
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
              <Text style={styles.infoLabel}>ID Técnico Mecánica:</Text>
              <Text style={styles.infoValue}>
                {respuestaRTM.rtm.id_tecnicomecanica || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo Revisión:</Text>
              <Text style={styles.infoValue}>
                {respuestaRTM.rtm.tipoRevision || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Expedición:</Text>
              <Text style={styles.infoValue}>
                {formatDate(respuestaRTM.rtm.fechaExpedicion)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Vigente:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color: esRTMVigente ? "#27AE60" : "#E74C3C",
                    fontWeight: "700",
                  },
                ]}>
                {formatDate(respuestaRTM.rtm.fechaVigente)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CDA Expide:</Text>
              <Text style={styles.infoValue}>
                {respuestaRTM.rtm.cdaExpide || "N/A"}
              </Text>
            </View>
          </View>
        )}

        {/* Sin datos */}
        {!respuestaRTM?.rtm && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="info-circle" size={64} color="#99999" />
            <Text style={styles.emptyTitle}>Sin información</Text>
            <Text style={styles.emptySubtitle}>
              No se encontró información de RTM para esta placa
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
