// src/screens/SOAT/soatStyles.ts

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

  // Placa Info
  placaInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },

  placaInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
    letterSpacing: 1,
  },

  scrollContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },

  // Tarjeta de Vehículo
  vehiculoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Tarjeta de SOAT
  soatCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
  },

  // Tarjeta de RTM
  rtmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
  },

  // Títulos
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 12,
  },

  soatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  infoLabel: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "600",
    flex: 1,
  },

  infoValue: {
    fontSize: 13,
    color: "#333333",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingHorizontal: 20,
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
});
