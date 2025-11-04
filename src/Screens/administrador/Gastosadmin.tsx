import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useGastosConductor } from "../..//hooks/UseGastosConductor";
import { StyleSheet } from "react-native";

interface GastosAdminProps {
  placa?: string; // ✅ Placa para filtrar
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEE",
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  filterButtonTextActive: {
    color: "#FFF",
  },
  totalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F5F5F5",
  },
  totalLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  gastoItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  gastoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gastoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  gastoMonto: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2196F3",
  },
  gastoSubtitle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  gastoDescripcion: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  estadoPendiente: {
    backgroundColor: "#FFF3CD",
  },
  estadoAprobado: {
    backgroundColor: "#D4EDDA",
  },
  estadoRechazado: {
    backgroundColor: "#F8D7DA",
  },
  estadoText: {
    fontSize: 10,
    fontWeight: "700",
  },
  estadoTextPendiente: {
    color: "#856404",
  },
  estadoTextAprobado: {
    color: "#155724",
  },
  estadoTextRechazado: {
    color: "#721C24",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  actionButtonAprobado: {
    backgroundColor: "#4CAF50",
  },
  actionButtonRechazado: {
    backgroundColor: "#FF5252",
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

type FiltroEstado = "todos" | "pendiente" | "aprobado" | "rechazado";

export default function GastosAdmin({ placa }: GastosAdminProps) {
  const { gastos, cargando, actualizarGasto } = useGastosConductor(placa);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");

  // ✅ Filtrar gastos por estado
  const gastosFiltrados =
    filtroEstado === "todos"
      ? gastos
      : gastos.filter((g) => g.estado === filtroEstado);

  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0);
  const pendientes = gastos.filter((g) => g.estado === "pendiente").length;

  const handleAprobarGasto = async (id: string) => {
    Alert.alert("Aprobar gasto", "¿Confirmas la aprobación de este gasto?", [
      {
        text: "Cancelar",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Aprobar",
        onPress: async () => {
          const resultado = await actualizarGasto(id, { estado: "aprobado" });
          if (resultado.success) {
            Alert.alert("Éxito", "Gasto aprobado correctamente");
          } else {
            Alert.alert(
              "Error",
              resultado.error || "No se pudo aprobar el gasto"
            );
          }
        },
      },
    ]);
  };

  const handleRechazarGasto = async (id: string) => {
    Alert.alert("Rechazar gasto", "¿Confirmas el rechazo de este gasto?", [
      {
        text: "Cancelar",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Rechazar",
        onPress: async () => {
          const resultado = await actualizarGasto(id, { estado: "rechazado" });
          if (resultado.success) {
            Alert.alert("Éxito", "Gasto rechazado correctamente");
          } else {
            Alert.alert(
              "Error",
              resultado.error || "No se pudo rechazar el gasto"
            );
          }
        },
      },
    ]);
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 12, color: "#999" }}>Cargando gastos...</Text>
      </View>
    );
  }

  if (!placa) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>
          Selecciona una placa para ver los gastos
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* FILTROS */}
      <View style={styles.filterContainer}>
        {(
          ["todos", "pendiente", "aprobado", "rechazado"] as FiltroEstado[]
        ).map((estado) => (
          <TouchableOpacity
            key={estado}
            style={[
              styles.filterButton,
              filtroEstado === estado && styles.filterButtonActive,
            ]}
            onPress={() => setFiltroEstado(estado)}>
            <Text
              style={[
                styles.filterButtonText,
                filtroEstado === estado && styles.filterButtonTextActive,
              ]}>
              {estado === "todos" && `Todos (${gastos.length})`}
              {estado === "pendiente" && `Pendientes (${pendientes})`}
              {estado === "aprobado" &&
                `Aprobados (${gastos.filter((g) => g.estado === "aprobado").length})`}
              {estado === "rechazado" &&
                `Rechazados (${gastos.filter((g) => g.estado === "rechazado").length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TOTAL */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>
          Total de gastos ({gastosFiltrados.length})
        </Text>
        <Text style={styles.totalValue}>
          ${totalGastos.toLocaleString("es-CO")}
        </Text>
      </View>

      {/* LISTA DE GASTOS */}
      <FlatList
        scrollEnabled={false}
        data={gastosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.gastoItem}>
            <View style={styles.gastoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.gastoTitle}>{item.tipo_gasto}</Text>
                <Text style={styles.gastoSubtitle}>Placa: {item.placa}</Text>
              </View>
              <Text style={styles.gastoMonto}>
                ${item.monto.toLocaleString("es-CO")}
              </Text>
            </View>

            <Text style={styles.gastoDescripcion}>{item.descripcion}</Text>

            {/* ESTADO BADGE */}
            <View
              style={[
                styles.estadoBadge,
                item.estado === "pendiente" && styles.estadoPendiente,
                item.estado === "aprobado" && styles.estadoAprobado,
                item.estado === "rechazado" && styles.estadoRechazado,
              ]}>
              <Text
                style={[
                  styles.estadoText,
                  item.estado === "pendiente" && styles.estadoTextPendiente,
                  item.estado === "aprobado" && styles.estadoTextAprobado,
                  item.estado === "rechazado" && styles.estadoTextRechazado,
                ]}>
                {item.estado.toUpperCase()}
              </Text>
            </View>

            {/* BOTONES DE ACCIÓN - Solo si está pendiente */}
            {item.estado === "pendiente" && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonAprobado]}
                  onPress={() => handleAprobarGasto(item.id)}>
                  <Text style={styles.actionButtonText}>✓ Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonRechazado]}
                  onPress={() => handleRechazarGasto(item.id)}>
                  <Text style={styles.actionButtonText}>✗ Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay gastos registrados</Text>
          </View>
        }
      />
    </ScrollView>
  );
}
