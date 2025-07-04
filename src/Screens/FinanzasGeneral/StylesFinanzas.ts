import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    flex: 0.9, // Ocupa todo el espacio disponible

    alignItems: "center",
    justifyContent: "flex-start", // Para que los hijos se apilen desde arriba
    padding: 0,
    width: "100%",
  },
  containerGraph: {
    flex: 3, // Ocupa más espacio para el gráfico
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    flex: 0.5, // Ocupa menos espacio para los botones
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  resumenContainer: {
    flex: 1.2, // Espacio proporcional para el resumen
    width: "90%",
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    padding: 30,
    //alignItems: "center",
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
  titleContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: COLORS.primary,
    alignItems: "center",
    justifyContent: "space-between",
  },
});
