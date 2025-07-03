import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between", // Alinea los elementos al inicio
    padding: 20,
  },
  containerGraph: {
    // Permite que el contenedor ocupe todo el espacio disponible
    alignItems: "center",
    justifyContent: "center",

    width: "100%",
    padding: 0,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center", //
  },
  resumenContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 50,
    minHeight: 120, //
  },
  resumenTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  // ...existing code...
});
