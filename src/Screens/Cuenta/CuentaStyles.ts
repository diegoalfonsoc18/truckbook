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

  // ✅ HEADER
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

  // ✅ SECCIONES
  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },

  // ✅ ROLE CARD
  roleCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  roleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },

  changeRoleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E8F4FF",
    borderRadius: 8,
  },

  changeRoleText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary || "#2196F3",
  },

  // ✅ OPCIONES
  optionButton: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  optionTextContainer: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },

  optionSubtitle: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
  },

  optionArrow: {
    fontSize: 18,
    color: "#CCC",
    marginLeft: 12,
  },

  // ✅ LOGOUT
  logoutSection: {
    marginTop: 20,
  },

  logoutButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#FF5252",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#FF5252",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  logoutButtonDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
