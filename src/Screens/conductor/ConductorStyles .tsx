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

  // ✅ HEADER
  containerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  placaLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 2,
  },

  placaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  seleccionarCamionText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "600",
  },

  // ✅ SCROLL CONTAINER
  containerScroll: {
    flex: 1,
    width: "100%",
  },

  // ✅ IMAGES & ALERTS
  containerAlert: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },

  imageAlert: {
    width: 180,
    height: 180,
    resizeMode: "contain",
  },

  // ✅ ITEMS CONTAINER
  itemsContainer: {
    width: "90%",
    paddingHorizontal: 12,
  },

  itemBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // ✅ BADGE
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF3E0",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  badgePendiente: {
    backgroundColor: "#FFEBEE",
  },

  badgeOk: {
    backgroundColor: "#E8F5E9",
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF9500",
  },

  badgeTextOk: {
    color: "#4CAF50",
  },

  // ✅ ICON & TEXT
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  iconItemBox: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },

  textContainer: {
    flex: 1,
  },

  textTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },

  textSubtitle: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  // ✅ MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    maxWidth: "90%",
    maxHeight: "80%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
  },

  tipoButton: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  tipoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginLeft: 10,
  },

  cancelButton: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  cancelButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },

  guardarButton: {
    backgroundColor: COLORS.primary || "#2196F3",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flex: 1,
    shadowColor: COLORS.primary || "#2196F3",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  guardarButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  placaInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
  },
});
