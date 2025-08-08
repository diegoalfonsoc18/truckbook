import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    //backgroundColor: "#cc0", // Fondo principal de la pantalla
    alignItems: "center",
    justifyContent: "center", // Alinea los elementos al inicio
    padding: 10, // Espaciado interno
    flex: 0.88, // Permite que el contenedor ocupe todo el espacio disponible
  },
  graphicContainer: {
    flex: 1.6, // Ocupa todo el espacio disponible
    justifyContent: "center", // Centra el contenido verticalmente
    alignItems: "center", // Centra el contenido horizontalmente
    width: "100%",
    //backgroundColor: COLORS.background, // Fondo del contenedor del gráfico
    //backgroundColor: "#d45714ff",
    borderRadius: 20,
    marginBottom: 20,
    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Sombra para Android
    elevation: 5,
  },
  buttonContainer: {
    flex: 1, // Espacio proporcional para los botones
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    fontSize: 16,
    //backgroundColor: "#a80e65ff",
    //marginBottom: 20,
  },
  containerGraph: {
    flex: 6, // Más espacio para el gráfico
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    //backgroundColor: "#13e716ff",
  },

  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resumenContainer: {
    flex: 0.3, // Espacio proporcional para el resumen
    width: "90%",
    backgroundColor: COLORS.surface,

    padding: 30,
    borderRadius: 20,
    justifyContent: "center",
    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Sombra para Android
    elevation: 5,
    //marginBottom: 50,
  },
  resumenTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
  },
  resumenText: {
    fontSize: 16,
    marginBottom: 4,
    color: COLORS.textTertiary,
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
