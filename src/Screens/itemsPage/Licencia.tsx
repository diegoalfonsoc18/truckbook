// src/screens/Licencia/Licencia.tsx

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
import { styles } from "./LicenciaStyles";
import { useLicencia } from "../../hooks/useLicencia";
import type { HomeStackParamList } from "../../navigation/HomeNavigation";

type Props = NativeStackScreenProps<HomeStackParamList, "Licencia">;

export default function Licencia({ route }: Props) {
  const navigation = useNavigation();
  const [refrescando, setRefrescando] = useState(false);

  const documento = route?.params?.documento || "1234567890";

  const {
    licencia: respuestaLicencia,
    cargando,
    error,
    recargar,
    esLicenciaVigente,
    diasParaVencerLicencia,
  } = useLicencia(documento, true);

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
    if (!vigente) return "#E74C3C";
    if (diasParaVencer <= 30) return "#F39C12";
    return "#27AE60";
  };

  const getStatusText = (vigente: boolean, diasParaVencer: number): string => {
    if (!vigente) return "❌ Vencida";
    if (diasParaVencer <= 30) return `⚠️ Vence en ${diasParaVencer} días`;
    return "✅ Vigente";
  };

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
          <Text style={styles.headerTitle}>Licencia</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error al cargar licencia</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (cargando && !respuestaLicencia) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <FontAwesome name="chevron-left" size={20} color="#333" />
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Licencia</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loaderText}>Cargando licencia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <FontAwesome name="chevron-left" size={20} color="#333" />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Licencia</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.documentoInfoContainer}>
        <FontAwesome name="id-card" size={16} color="#2196F3" />
        <Text style={styles.documentoInfoText}>{documento}</Text>
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
            title="Actualizando licencia..."
          />
        }>
        {respuestaLicencia?.licencia && (
          <View
            style={[
              styles.licenciaCard,
              {
                borderLeftColor: getStatusColor(
                  esLicenciaVigente,
                  diasParaVencerLicencia
                ),
              },
            ]}>
            <View style={styles.licenciaHeader}>
              <Text style={styles.cardTitle}>🆔 Licencia de Conducción</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(
                      esLicenciaVigente,
                      diasParaVencerLicencia
                    ),
                  },
                ]}>
                <Text style={styles.statusText}>
                  {getStatusText(esLicenciaVigente, diasParaVencerLicencia)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Número Licencia:</Text>
              <Text style={styles.infoValue}>
                {respuestaLicencia.licencia.numeroLicencia || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo Licencia:</Text>
              <Text style={styles.infoValue}>
                {respuestaLicencia.licencia.tipoLicencia || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Categorías:</Text>
              <Text style={styles.infoValue}>
                {respuestaLicencia.licencia.categoriasPermitidas || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Expedición:</Text>
              <Text style={styles.infoValue}>
                {formatDate(respuestaLicencia.licencia.fechaExpedicion)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Vencimiento:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color: getStatusColor(
                      esLicenciaVigente,
                      diasParaVencerLicencia
                    ),
                    fontWeight: "700",
                  },
                ]}>
                {formatDate(respuestaLicencia.licencia.fechaVencimiento)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={styles.infoValue}>
                {respuestaLicencia.licencia.estado || "N/A"}
              </Text>
            </View>
          </View>
        )}

        {!respuestaLicencia?.licencia && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="info-circle" size={64} color="#99999" />
            <Text style={styles.emptyTitle}>Sin información</Text>
            <Text style={styles.emptySubtitle}>
              No se encontró información de licencia para este documento
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
