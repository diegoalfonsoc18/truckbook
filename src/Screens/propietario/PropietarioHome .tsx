import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import styles from "./PropietarioStyles ";

export default function PropietarioHome() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Propietario</Text>
          <Text style={styles.subtitle}>Dashboard financiero y de flota</Text>
        </View>

        {/* RESUMEN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>

          <View style={styles.resumenCard}>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Ingresos Totales</Text>
              <Text style={styles.resumenValue}>$0.00</Text>
            </View>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Gastos Totales</Text>
              <Text style={styles.resumenValue}>$0.00</Text>
            </View>
          </View>
        </View>

        {/* ACCIONES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestión</Text>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionTitle}>Rentabilidad</Text>
            <Text style={styles.actionSubtitle}>Análisis financiero</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🚛</Text>
            <Text style={styles.actionTitle}>Flota</Text>
            <Text style={styles.actionSubtitle}>Gestionar vehículos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTitle}>Conductores</Text>
            <Text style={styles.actionSubtitle}>Gestionar equipo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>Reportes</Text>
            <Text style={styles.actionSubtitle}>Estadísticas generales</Text>
          </TouchableOpacity>
        </View>

        {/* PERFIL */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.perfilCard}
            onPress={() => navigation.navigate("Account")}>
            <Text style={styles.perfilIcon}>👤</Text>
            <View style={styles.perfilContent}>
              <Text style={styles.perfilTitle}>Mi Perfil</Text>
              <Text style={styles.perfilSubtitle}>
                Ver y editar información
              </Text>
            </View>
            <Text style={styles.perfilArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
