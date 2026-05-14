import { StyleSheet } from "react-native";
import { Colors } from "../../constants/Themecontext";

export const createStyles = (colors: Colors) => StyleSheet.create({
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: colors.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between", // Color del borde del encabezado
    flex: 0,
    paddingBottom: 10, // Espacio debajo del encabezado
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.primary, // Color del texto del título
  },
  containerMain: {
    width: "90%",
    alignItems: "center",
    justifyContent: "center", // Alinea los elementos al inicio
  },

  containerFilter: {
    //flex: 1,

    width: "100%",
    minHeight: 120,
    padding: 10,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: colors.surface, // Fondo del contenedor de filtro
    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Sombra Android
    elevation: 5,
  },
  titleCalendar: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textMuted,
    marginBottom: 8,
  },

  dateSelect: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodoText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
