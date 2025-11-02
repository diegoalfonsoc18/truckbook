import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    flex: 1,
    //backgroundColor: "#F2F2F7", // ✅ Fondo estilo Apple
  },

  containerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "95%",
    borderRadius: 12,
    backgroundColor: "#f5f5f5", // Gris claro como Apple
    paddingHorizontal: 16,
    paddingVertical: 12, // Más compacto
    marginTop: 16,
    marginBottom: 16,

    // Sombra sutil como Apple
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  headerTextContainer: {
    flex: 0,
    justifyContent: "center",
    alignItems: "flex-end", // Alinea el texto a la derecha
    marginHorizontal: 12,
  },

  // ✅ NUEVO: Texto "Selecciona tu camión"
  seleccionarCamionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a3abb2ff",
  },

  // ✅ NUEVO: Label "Vehículo seleccionado"
  placaLabel: {
    fontSize: 12,
    color: "#f10b0bff",
    fontWeight: "500",
    marginBottom: 2,
    justifyContent: "center",
  },

  // ✅ NUEVO: Texto con la placa
  placaText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    letterSpacing: 1,
  },

  headerText: {
    fontSize: 24,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  iconHome: {
    width: 50,
    height: 50,
    marginRight: 10,
  },

  containerScroll: {
    flex: 6,
    width: "98%",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 80,
    marginTop: 10,
    borderRadius: 20,
    shadowOpacity: 0,
    elevation: 0,
  },

  containerAlert: {
    flex: 0,
    width: "100%",
    height: 250,
    aspectRatio: 10 / 6.4,
    borderRadius: 16,
    marginBottom: 20,

    shadowOpacity: 0,
    elevation: 0,
    overflow: "hidden",
  },

  imageAlert: {
    width: "100%",
    height: "100%",
    resizeMode: "stretch",
  },

  itemsContainer: {
    flex: 3,
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "stretch",
    width: "100%",
    borderRadius: 10,
    shadowOpacity: 0,
    elevation: 0,
    //backgroundColor: "#FF5252",
  },

  itemBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "46%",
    margin: "1%",
    resizeMode: "cover",
    height: 100,
    marginVertical: 10,
    padding: 6,
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },

  iconContainer: {
    height: "100%",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0,
    elevation: 0,

    //backgroundColor: "rgba(0, 116, 204, 1)",
  },

  iconItemBox: {
    width: 68,
    height: 68,
    shadowOpacity: 0,
    elevation: 0,
  },

  textContainer: {
    height: "100%",
    flex: 1.4,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingLeft: 10,
    width: "100%",
    //backgroundColor: "#cc0",
  },

  textTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },

  textSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textTertiary,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  textAlert: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: -0.4,
  },

  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  badgePendiente: {
    backgroundColor: "#FF5252",
  },

  badgeOk: {
    backgroundColor: "#4CAF50",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  badgeTextOk: {
    color: "#FFFFFF",
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
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 20,
    textAlign: "center",
  },

  placaInput: {
    borderWidth: 2,
    borderColor: "#ece630ff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 1,
  },

  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#EEEEEE",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
  },

  guardarButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  guardarButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tipoButton: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  tipoButtonText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
