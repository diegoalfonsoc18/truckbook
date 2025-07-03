import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 0,
    backgroundColor: "#fff",
    width: "100%",
  },
  filterContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  buttonContainer: {
    flex: 3,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  containerGraph: {
    flex: 3,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    //backgroundColor: "#f9f9",
    padding: 0,
  },
  resumenContainer: {
    flex: 1,
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    width: "90%", // Aquí sí puedes dejarlo para el resumen
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  resumenTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 8,
  },
  resumenText: {
    fontSize: 16,
    marginBottom: 4,
  },
});
