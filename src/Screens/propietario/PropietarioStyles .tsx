import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  headerSection: {
    marginBottom: 32,
  },

  mainTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },

  // ✅ RESUMEN
  resumenCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    gap: 16,
  },

  resumenItem: {
    flex: 1,
  },

  resumenLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 8,
  },

  resumenValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary || "#2196F3",
  },

  // ✅ ACTION CARDS
  actionCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  actionIcon: {
    fontSize: 28,
  },

  actionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  actionSubtitle: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  // ✅ PERFIL CARD
  perfilCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  perfilIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  perfilContent: {
    flex: 1,
  },

  perfilTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },

  perfilSubtitle: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
  },

  perfilArrow: {
    fontSize: 18,
    color: "#CCC",
    marginLeft: 12,
  },
});
