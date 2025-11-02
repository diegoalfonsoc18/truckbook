// src/screens/Auth/SelectRoleStyles.ts
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  headerContainer: {
    marginBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    lineHeight: 22,
  },

  rolesContainer: {
    flex: 1,
    justifyContent: "center",
    marginBottom: 40,
  },

  roleCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    position: "relative",

    // Sombra sutil
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  roleCardSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    borderWidth: 2,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  iconContainerSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },

  roleLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },

  roleLabelSelected: {
    color: "#FFFFFF",
  },

  roleDescription: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontWeight: "500",
  },

  roleDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.9)",
  },

  checkmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  checkmarkText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontWeight: "400",
    marginTop: 20,
  },
});
