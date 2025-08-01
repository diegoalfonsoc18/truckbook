import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors"; // Adjust the import path as necessary
// Define COLORS object or import it from your constants/theme file

export const styles = StyleSheet.create({
  container: {
    width: "100%", // Ancho completo de la pantalla
    //backgroundColor: "#FF0B55", // Fondo principal de la pantalla
    alignItems: "center",
    justifyContent: "space-between", // Espacio entre los elementos
    padding: 10, // Espaciado interno
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
  },
  containerHeader: {
    flex: 0.4,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "98%",
    borderRadius: 20,
    backgroundColor: COLORS.surface, // Fondo del contenedor del header
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerText: {
    fontSize: 24,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  iconHome: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  containerScroll: {
    flex: 6, // Permite que el contenedor ocupe todo el espacio disponible
    width: "98%",
    alignItems: "center", // Centra los elementos horizontalmente
    backgroundColor: "transparent", // Fondo del contenedor de scroll
    marginBottom: 80,
    marginTop: 10,
    borderRadius: 20, // Bordes redondeados
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  containerAlert: {
    flex: 0, // O elimina flex si usas height/minHeight
    width: "100%",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    height: 150, // <-- Más alto
  },

  itemsContainer: {
    flex: 3, // Ocupa todo el espacio vertical disponible
    flexWrap: "wrap", // Permite que los elementos se ajusten en varias líneas
    flexDirection: "row", // Alinea los elementos en filas
    justifyContent: "space-evenly", // Espacio entre los elementos
    alignItems: "stretch", // Alinea los elementos para que ocupen el mismo alto// Ancho del contenedor de los elementos
    width: "100%",
    borderRadius: 10,
    //marginBottom: 80,
    //backgroundColor: "#CFFFE2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  itemBox: {
    flexDirection: "row",
    justifyContent: "center", // Centra verticalmente
    alignItems: "center", // Centra horizontalmente
    width: "43%", // Ancho del contenedor de cada elemento
    margin: "1%",
    resizeMode: "cover",
    height: 100, // Ajusta la altura según lo que necesites
    marginVertical: 10,
    padding: 6,

    borderRadius: 20,
    backgroundColor: COLORS.surface, // Fondo del contenedor de la fecha
    //backgroundColor: "#A0153E", // Fondo del contenedor de la fecha
    // Sombra para iOS

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Sombra Android
    elevation: 5,
  },
  iconContainer: {
    height: "100%", // Altura completa del contenedor del icono
    width: "100%", // Ancho completo del contenedor del icono
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    justifyContent: "center", // Centra verticalmente
    alignItems: "center", // Centra horizontalmente
    //backgroundColor: "#FF9D23",
  },
  iconItemBox: {
    width: 68,
    height: 68,
  },

  textContainer: {
    height: "100%", // Altura completa del contenedor del texto
    flex: 1.4, // Permite que el contenedor ocupe todo el espacio disponible
    justifyContent: "center", // Centra verticalmente
    alignItems: "flex-end", // Alinea el texto al inicio horizontalmente
    paddingLeft: 10, // Espacio entre el icono y el texto
    //backgroundColor: "#16C47F", // Fondo del icono
    width: "100%", // Ancho completo del contenedor del texto
  },
  textTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textTertiary, // Color del texto
  },
  textSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary, // Color del texto
    justifyContent: "center", // Centra verticalmente
    alignItems: "center", // Alinea el texto al inicio horizontalmente
    textAlign: "center", // Centra el texto horizontalmente
  },
  textAlert: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textTertiary, // Color del texto
  },
});
