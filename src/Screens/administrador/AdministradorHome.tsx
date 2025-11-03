import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import styles from "./AdministradorStyles";

export default function AdministradorHome() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Administrador</Text>
          <Text style={styles.subtitle}>Gestiona conductores y vehículos</Text>
        </View>

        {/* ACCIONES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTitle}>Conductores</Text>
            <Text style={styles.actionSubtitle}>Gestionar lista</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🚛</Text>
            <Text style={styles.actionTitle}>Vehículos</Text>
            <Text style={styles.actionSubtitle}>Gestionar flota</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>Reportes</Text>
            <Text style={styles.actionSubtitle}>Ver estadísticas</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>✓</Text>
            <Text style={styles.actionTitle}>Aprobar Gastos</Text>
            <Text style={styles.actionSubtitle}>Revisión de gastos</Text>
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
