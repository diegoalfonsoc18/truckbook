// src/screens/Multas/multasStyle.ts (COMPLETO CON TODOS LOS ESTILOS)

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },

  backText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
  },

  headerPlaceholder: {
    width: 40,
  },

  // Resumen
  resumenContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },

  resumenCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  resumenLabel: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
    fontWeight: "500",
  },

  resumenValor: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
  },

  resumenPendiente: {
    color: "#FF6B6B",
  },

  resumenMonto: {
    color: "#E74C3C",
  },

  // Loader
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  loaderText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },

  // Error Container
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
  },

  errorSubtitle: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },

  retryButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Lista
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Multa Card
  multaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B6B",
  },

  multaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  multaNumberContainer: {
    flex: 1,
  },

  multaNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 4,
  },

  multaDate: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
  },

  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },

  estadoPagada: {
    backgroundColor: "#E8F5E9",
  },

  estadoPendiente: {
    backgroundColor: "#FFEBEE",
  },

  estadoText: {
    fontSize: 11,
    fontWeight: "700",
  },

  textPagada: {
    color: "#4CAF50",
  },

  textPendiente: {
    color: "#FF6B6B",
  },

  multaContent: {
    marginBottom: 12,
    gap: 10,
  },

  conceptoContainer: {
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

  conceptoLabel: {
    fontSize: 11,
    color: "#999999",
    fontWeight: "600",
    marginBottom: 2,
  },

  conceptoText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },

  valorContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

  valorLabel: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "600",
  },

  valorText: {
    fontSize: 18,
    fontWeight: "700",
  },

  valorPendiente: {
    color: "#E74C3C",
  },

  valorPagada: {
    color: "#4CAF50",
    textDecorationLine: "line-through",
  },

  // Organismo Container
  organismoContainer: {
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },

  organismoLabel: {
    fontSize: 10,
    color: "#2196F3",
    fontWeight: "600",
    marginBottom: 2,
  },

  organismoText: {
    fontSize: 12,
    color: "#333333",
    fontWeight: "500",
  },

  pagarButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },

  pagarButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
  },

  // Botón Pagar Todo
  pagarTodoButton: {
    flexDirection: "row",
    backgroundColor: "#E74C3C",
    marginHorizontal: 12,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#E74C3C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  pagarTodoText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
