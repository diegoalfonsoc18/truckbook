import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
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
  button: {
    width: "80%",
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  containerLogin: {
    width: "100%", // Asegura que el contenedor ocupe todo el ancho de la pantalla
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    alignItems: "center", // Centra los elementos horizontalmente
    justifyContent: "center", // Centra los elementos verticalmente
    padding: 20, // Espaciado interno del contenedor
    backgroundColor: COLORS.backgroundDark, // Fondo oscuro
  },
  imageContainer: {
    flex: 1, // Permite que el contenedor ocupe todo el espacio disponible
    backgroundColor: "#f00",
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
    flex: 2, // Permite que el contenedor ocupe todo el espacio disponible
    justifyContent: "center", // Centra los elementos verticalmente
    alignItems: "center", // Centra los elementos horizontalmente
    backgroundColor: "#f9f",
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

  textLogin: {
    color: COLORS.textSecondary, // Color del texto secundario
    fontSize: 16, // Tamaño de fuente del texto secundario
    textAlign: "center", // Centra el texto horizontalmente
    //marginVertical: 10, // Espaciado vertical del texto
  },

  containerTextPassword: {
    width: "100%",
    alignItems: "flex-end", // Centra el texto horizontalmente
    justifyContent: "center", // Centra el texto verticalmente
    backgroundColor: "#cc0", // Fondo transparente para el enlace de contraseña
    color: COLORS.primary, // Color del texto del enlace de contraseña
    fontSize: 36, // Tamaño de fuente del enlace de contraseña
    textAlign: "center", // Centra el texto horizontalmente
    marginTop: 16, // Espaciado superior del enlace de contraseña
  },

  textPassword: {
    color: COLORS.primary, // Color del texto del enlace de contraseña
    fontSize: 16, // Tamaño de fuente del enlace de contraseña
  },
  socialLoginContainer: {
    justifyContent: "space-around", // Distribuye los botones uniformemente
    width: "80%", // Asegura que ocupe todo el ancho del contenedor
  },
  iconSocialGoogle: {
    flexDirection: "row", // Alinea el ícono y el texto horizontalmente
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#db4437", // Fondo del botón de Google
    justifyContent: "center",
    alignItems: "center", // Centra el ícono dentro del botón
  },
  iconSocialFacebook: {
    flexDirection: "row", // Alinea el ícono y el texto horizontalmente
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4267B2", // Fondo del botón de Facebook
    justifyContent: "center",
    alignItems: "center", // Centra el ícono dentro del botón
  },
});
