import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    //backgroundColor: "#cc0", // Fondo principal de la pantalla
    alignItems: "center",
    justifyContent: "center", // Alinea los elementos al inicio
    padding: 20, // Espaciado interno
    flex: 0.9, // Permite que el contenedor ocupe todo el espacio disponible
  },
  titleContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: COLORS.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between",
    flex: 0, // Fondo del contenedor del título
  },
  chartTitle: {
    flex: 1,
    width: "90%",
    marginVertical: 8,
    borderRadius: 16,
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    backgroundColor: "#cc0",
  },
  filterContainer: {
    flex: 1.8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  buttonContainer: {
    flex: 1,
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
