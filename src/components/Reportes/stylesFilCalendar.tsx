import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    width: "90%",
    justifyContent: "flex-start", // Esto alinea el contenido arriba
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  containerTitle: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: COLORS.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between",
    flex: 0,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.primary, // Color del texto del título
  },

  containerFilter: {
    //flex: 1,
    width: "100%",
    minHeight: 120,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor de filtro
  },
  titleCalendar: {
    width: "80%",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: COLORS.text,
  },
  dateSelect: {
    width: "80%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    //backgroundColor: "#ce2d2d",
  },

  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
});
