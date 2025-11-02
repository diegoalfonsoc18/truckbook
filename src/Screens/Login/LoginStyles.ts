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
    paddingTop: 16,
    paddingBottom: 32,
  },

  imageContainer: {
    flex: 0.4,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  imageLogin: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },

  LoginSingContainer: {
    flex: 0.6,
    width: "100%",
    justifyContent: "flex-start",
  },

  loginTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 28,
    letterSpacing: -0.5,
  },

  loginPasswordContainer: {
    width: "100%",
    marginBottom: 24,
  },

  inputLogin: {
    width: "100%",
    height: 48,
    color: "#000",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "500",
    backgroundColor: "#F9F9F9",
  },

  containerTextPassword: {
    width: "100%",
    alignItems: "flex-end",
    marginTop: 12,
    marginBottom: 28,
  },

  textPassword: {
    color: COLORS.primary || "#2196F3",
    fontSize: 13,
    fontWeight: "600",
  },

  button: {
    width: "100%",
    height: 48,
    backgroundColor: COLORS.primary || "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: COLORS.primary || "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonTextContinue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  buttonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },

  containerSingUp: {
    width: "100%",
    alignItems: "center",
  },

  textLogin: {
    fontWeight: "500",
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },

  iconSocialGoogle: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 48,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
  },

  imageSocials: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    marginRight: 10,
  },

  iconSocialFacebook: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: 48,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F9F9F9",
  },

  textLinkRegister: {
    fontWeight: "500",
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },

  textFooter: {
    fontWeight: "400",
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
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
});
