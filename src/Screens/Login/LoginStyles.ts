import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    //backgroundColor: COLORS.background,
  },
  input: {
    width: "80%",
    height: 50,
    //borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },

  containerLogin: {
    width: "100%", // Asegura que el contenedor ocupe todo el ancho de la pantalla
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    alignItems: "center", // Centra los elementos horizontalmente
    justifyContent: "space-between", // Centra los elementos verticalmente
    padding: 20, // Espaciado interno del contenedor
    //backgroundColor: "#FFCB61", // Fondo oscuro
  },
  imageContainer: {
    flex: 2, // Permite que el contenedor ocupe todo el espacio disponible
    //backgroundColor: "#0A400C",
    width: "90%",
    alignItems: "center",
    justifyContent: "center", // Centra la imagen vertical y horizontalmente
    marginBottom: 20,
    padding: 30, // Espaciado interno del contenedor de la imagen
  },
  imageLogin: {
    width: 220,
    height: 220,
    resizeMode: "contain",
  },
  LoginSingContainer: {
    width: "90%", // Asegura que el contenedor ocupe todo el ancho del contenedor padre
    flex: 3, // Permite que el contenedor ocupe todo el espacio disponible
    justifyContent: "center", // Centra los elementos verticalmente
    alignItems: "center", // Centra los elementos horizontalmente
    //backgroundColor: "#56DFCF",
  },
  loginTitle: {
    width: "100%", // Asegura que el título ocupe todo el ancho del contenedor
    alignItems: "center", // Centra el título horizontalmente
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textTertiary,
    marginBottom: 10, // Espaciado inferior del título
  },
  loginPasswordContainer: {
    //flexGrow: 1, // Permite que el contenedor ocupe todo el espacio disponible
    //flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    width: "100%", // Asegura que el contenedor ocupe todo el ancho del contenedor padre
    alignItems: "center", // Centra los elementos horizontalmente
    justifyContent: "space-between", // Centra los elementos verticalmente
    //backgroundColor: "#06923E", // Fondo transparente para el contenedor de contraseña
  },
  inputLogin: {
    width: "100%", // Asegura que el input ocupe todo el ancho del contenedor
    height: 50, // Altura del input
    color: COLORS.textTertiary, // Color del texto del input
    borderRadius: 10, // Bordes redondeados del input
    paddingHorizontal: 15, // Espaciado interno horizontal
    borderWidth: 1.8,
    borderColor: COLORS.inputBorder, // Color del borde del input
    marginBottom: 10, // Espaciado inferior del input
    fontSize: 16, // Tamaño de fuente del input
  },

  containerTextPassword: {
    width: "100%",
    alignItems: "flex-end", // Centra el texto horizontalmente
    justifyContent: "center", // Centra el texto verticalmente
    //backgroundColor: "#cc0", // Fondo transparente para el enlace de contraseña
    color: COLORS.primary, // Color del texto del enlace de contraseña
    fontSize: 36, // Tamaño de fuente del enlace de contraseña
    textAlign: "center", // Centra el texto horizontalmente
    marginBottom: 10, // Espaciado inferior del enlace de contraseña
  },

  textPassword: {
    color: COLORS.primary, // Color del texto del enlace de contraseña
    fontSize: 14, // Tamaño de fuente del enlace de contraseña
    textDecorationLine: "underline", // Color de la decoración del texto
  },

  button: {
    width: "100%",
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 100,
    marginBottom: 20, // Espaciado inferior del enlace de contraseña
  },
  buttonTextContinue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  buttonText: {
    color: COLORS.textTertiary,
    fontSize: 16,
    fontWeight: "bold",
  },
  containerSingUp: {
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    width: "100%", // Asegura que el contenedor ocupe todo el ancho del contenedor padre
    alignItems: "center", // Centra los elementos horizontalmente
    //backgroundColor: "#E6521F", // Fondo oscuro
  },
  textLogin: {
    fontWeight: "bold", // Negrita el texto
    color: COLORS.textTertiary, // Color del texto secundario
    fontSize: 16, // Tamaño de fuente del texto secundario
    textAlign: "center", // Centra el texto horizontalmente
    marginBottom: 20, // Espaciado inferior del texto
  },

  iconSocialGoogle: {
    justifyContent: "center",
    alignItems: "center", // Centra el ícono dentro del botón
    flexDirection: "row", // Alinea el ícono y el texto horizontalmente
    width: "100%",
    height: 50,
    borderRadius: 25,
    //backgroundColor: "#db4437", // Fondo del botón de Google
    marginBottom: 10,
    borderWidth: 2,
  },
  imageSocials: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    marginRight: 5, // Espaciado entre el ícono y el texto
  },
  iconSocialFacebook: {
    flexDirection: "row", // Alinea el ícono y el texto horizontalmente
    width: "100%",
    height: 50,
    borderRadius: 25,
    //backgroundColor: "#4267B2", // Fondo del botón de Facebook
    justifyContent: "center",
    alignItems: "center", // Centra el ícono dentro del botón
    borderWidth: 2,
    marginBottom: 10,
  },
  textLinkRegister: {
    fontWeight: "bold", // Negrita el texto
    color: COLORS.textTertiary, // Color del texto secundario
    fontSize: 16, // Tamaño de fuente del texto secundario
    textAlign: "center", // Centra el texto horizontalmente
    //marginTop: 20, // Espaciado superior del texto
    marginBottom: 20, // Espaciado inferior del texto
  },
  textFooter: {
    fontWeight: "bold", // Negrita el texto
    color: COLORS.textTertiary, // Color del texto secundario
    fontSize: 12, // Tamaño de fuente del texto secundario
    textAlign: "center", // Centra el texto horizontalmente
    //marginTop: 20, // Espaciado superior del texto
    marginBottom: 3, // Espaciado inferior del texto
  },
});
