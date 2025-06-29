import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    //backgroundColor: "#cc0", // Fondo principal de la pantalla
    alignItems: "center",
    justifyContent: "center", // Alinea los elementos al inicio
    padding: 20, // Espaciado interno
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    paddingHorizontal: 20,
    color: COLORS.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between",
    flex: 0, // Permite que el encabezado ocupe todo el espacio disponible
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.primary, // Color del texto del título
  },

  dateContainer: {
    flex: 0,
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor de la fecha
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto de la fecha
    textAlign: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor del ícono
    borderRadius: 5,
  },
  calendarOverlay: {
    position: "absolute", // Superpone el calendario sobre el resto de los componentes
    top: 0, // Posición desde la parte superior
    left: 0, // Posición desde la parte izquierda
    right: 0, // Posición desde la parte derecha
    bottom: 0, // Posición desde la parte inferior
    justifyContent: "center", // Centra el calendario verticalmente
    alignItems: "center", // Centra el calendario horizontalmente
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo semitransparente para resaltar el calendario
    zIndex: 100, // Asegura que el calendario esté por encima de otros componentes
  },
  calendarContainer: {
    width: "80%", // Ocupa el 80% del ancho del contenedor padre
    backgroundColor: COLORS.surface, // Fondo del calendario
    borderRadius: 10, // Bordes redondeados
    overflow: "hidden", // Asegura que el contenido no se desborde
  },
  resumenContainer: {
    width: "90%",
    height: 200,
    backgroundColor: COLORS.surface, // Fondo del contenedor del resumen
    borderRadius: 10,
    padding: 20,

    flex: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  resumenTitle: {
    width: "100%",
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text, // Color del título del resumen
    //marginVertical: 10, // Solo margen vertical
    textAlign: "left", // Alinea el texto a la izquierda
    alignSelf: "flex-start",
  },
  listContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    width: "100%",
    height: "60%",
    justifyContent: "center",
    alignItems: "center",
  },
  combinedContainer: {
    height: 30, // Altura del contenedor combinado
    flex: 2, // Permite que el contenedor ocupe el espacio restante
    width: "90%", // Asegura que el contenedor combinado ocupe el 90% del ancho
    //backgroundColor: "#cc0", // Fondo del contenedor combinado
    borderRadius: 10, // Bordes redondeados
    justifyContent: "space-between", // Distribuye los elementos verticalmente
    alignItems: "center", // Centra los elementos horizontalmente
  },
  pickerContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    flexDirection: "column",
    width: "100%",
    marginHorizontal: 20,
    marginVertical: 10,
    //backgroundColor: "#cc0", // Fondo del picker
    padding: 10,
    borderRadius: 10,
    marginBottom: 10, // Aumenta el espacio entre el picker y otros elementos
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto del picker label
    marginBottom: 10,
  },
  picker: {
    color: COLORS.text, // Color del texto del picker
    //backgroundColor: "#cc0000", // Fondo del picker
  },
  selectedListContainer: {
    flex: 0.5, // Permite que la lista ocupe el espacio restante
    width: "100%", // Ocupa todo el ancho del contenedor combinado
    borderRadius: 10,
    //backgroundColor: "#36cc00", // Fondo del contenedor del FlatList seleccionado
    alignItems: "flex-start", // Centra los elementos horizontalmente
  },
  resumenItem: {
    // Permite que el elemento ocupe el espacio restante
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder, // Color del borde inferior
    //backgroundColor: "#cc0", // Fondo del resumen de cada gasto
  },
  resumenValue: {
    fontWeight: "bold",
    color: COLORS.text, // Color del valor del resumen
    textAlign: "right",
  },
  resumenText: {
    fontSize: 16,
    color: COLORS.text, // Color del texto del resumen
    textAlign: "left",
  },
  totalContainer: {
    marginTop: 10, // Espaciado superior
    alignItems: "flex-end", // Alinea el texto a la derecha
    width: "100%", // Asegura que ocupe todo el ancho del contenedor
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto del total
  },
  actionButtons: {
    flexDirection: "row", // Alinea los botones en fila
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 10, // Espaciado entre el texto y los botones
  },

  inputContainer: {
    width: "100%", // Asegura que el input ocupe todo el ancho del contenedor
    marginTop: 20, // Espaciado superior
  },
  input: {
    width: "100%", // Asegura que el input ocupe todo el ancho disponible
    height: 40, // Altura del input
    borderWidth: 1, // Borde del input
    borderColor: COLORS.inputBorder, // Color del borde
    borderRadius: 5, // Bordes redondeados
    paddingHorizontal: 10, // Espaciado interno horizontal
    backgroundColor: COLORS.surface, // Fondo del input
  },
  flatList: {
    flex: 1, // Permite que el FlatList ocupe el espacio restante
    width: "100%",
  },
});
