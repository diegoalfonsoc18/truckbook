import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    flex: 1,
    backgroundColor: "#F2F2F7", // ✅ Fondo estilo Apple
  },

  containerHeader: {
    flex: 0.4,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "98%",
    borderRadius: 16, // ✅ Menos redondeado
    backgroundColor: "#FFFFFF", // ✅ Blanco puro
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",

    // ✅ Sin sombras
    shadowOpacity: 0,
    elevation: 0,
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
    flex: 6,
    width: "98%",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 80,
    marginTop: 10,
    borderRadius: 20,

    // ✅ Sin sombras
    shadowOpacity: 0,
    elevation: 0,
  },

  containerAlert: {
    flex: 0,
    width: "100%",
    padding: 20,
    borderRadius: 16, // ✅ Menos redondeado
    marginBottom: 20,
    backgroundColor: "#FFFFFF", // ✅ Blanco puro
    height: 150,

    // ✅ Sin sombras
    shadowOpacity: 0,
    elevation: 0,
  },

  itemsContainer: {
    flex: 3,
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "stretch",
    width: "100%",
    borderRadius: 10,

    // ✅ Sin sombras del contenedor
    shadowOpacity: 0,
    elevation: 0,
  },

  itemBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "43%",
    margin: "1%",
    resizeMode: "cover",
    height: 100,
    marginVertical: 10,
    padding: 6,
    borderRadius: 16, // ✅ Menos redondeado
    backgroundColor: "#A0153E", // Tu color personalizado

    // ✅ SIN SOMBRAS - Esto elimina la sombra del ícono
    shadowOpacity: 0,
    elevation: 0,
  },

  iconContainer: {
    height: "100%",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",

    // ✅ Sin sombras en el contenedor del ícono
    shadowOpacity: 0,
    elevation: 0,
  },

  iconItemBox: {
    width: 68,
    height: 68,

    // ✅ Sin sombras
    shadowOpacity: 0,
    elevation: 0,
  },

  textContainer: {
    height: "100%",
    flex: 1.4,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingLeft: 10,
    width: "100%",
  },

  textTitle: {
    fontSize: 16,
    fontWeight: "600", // ✅ Semibold
    color: COLORS.textTertiary,
  },

  textSubtitle: {
    fontSize: 12,
    fontWeight: "400", // ✅ Regular
    color: COLORS.textTertiary,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  textAlert: {
    fontSize: 20, // ✅ Más grande
    fontWeight: "700", // ✅ Bold
    color: "#000000", // ✅ Negro puro
    letterSpacing: -0.4,
  },
});
