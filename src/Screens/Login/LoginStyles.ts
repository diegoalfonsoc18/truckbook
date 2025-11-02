import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  input: {
    width: "85%",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
    fontSize: 16,
    fontWeight: "500",
  },

  // ✅ ESTILO APPLE - LOGIN
  containerLogin: {
    width: "100%",
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },

  imageContainer: {
    flex: 0.5,
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    //backgroundColor: "#cc0",
  },

  imageLogin: {
    width: 400,
    height: 400,
    resizeMode: "contain",
  },

  LoginSingContainer: {
    flex: 0.7,
    width: "100%",
    justifyContent: "space-between", // ✅ Volver a space-between
    paddingBottom: 8, // ✅ Agregar esto
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  loginPasswordContainer: {
    width: "100%",
  },

  inputLogin: {
    width: "100%",
    height: 44,
    color: "#000",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "500",
    backgroundColor: "#F9F9F9",
  },

  containerTextPassword: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },

  textPassword: {
    color: COLORS.primary || "#2196F3",
    fontSize: 13,
    fontWeight: "600",
  },

  button: {
    width: "100%",
    height: 44,
    backgroundColor: COLORS.primary || "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 2,
    shadowColor: COLORS.primary || "#2196F3",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  buttonTextContinue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  buttonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },

  containerSingUp: {
    width: "100%",
    alignItems: "center",
    flex: 1, // ✅ AGREGAR ESTO
    justifyContent: "center", // ✅ AGREGAR ESTO
  },

  textLogin: {
    fontWeight: "500",
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6, // ✅ Aumentar de 4 a 6
  },

  iconSocialGoogle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 44,
    borderRadius: 10,
    marginBottom: 10, // ✅ Aumentar de 8 a 10
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
  },

  imageSocials: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    marginRight: 8,
  },

  iconSocialFacebook: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 44,
    borderRadius: 10,
    marginBottom: 14, // ✅ Aumentar de 12 a 14
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
  },

  textLinkRegister: {
    fontWeight: "500",
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 6,
  },

  textFooter: {
    fontWeight: "400",
    color: "#999",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 0, // ✅ Cambiar a 0
  },

  // ✅ ESTILO APPLE - REGISTER
  containerRegister: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: "center",
  },

  registerSingContainer: {
    width: "100%",
    justifyContent: "flex-start",
  },

  inputRegister: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },

  // ✅ Styles Role

  buttonDisabled: {
    opacity: 0.6,
  },

  loginLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },

  textLoginLink: {
    color: COLORS.primary || "#2196F3",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
