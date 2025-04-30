import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  StyleSheet,
  Dimensions,
  View,
  Button,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { COLORS } from "../constants/colors";

export default function FinanzasGenerales() {
  const [view, setView] = useState("meses"); // Estado para controlar la vista actual

  // Datos de ejemplo para días, meses y años
  const dataPorDias = {
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        data: [120, 150, 80, 200, 170, 90, 100],
      },
    ],
  };

  const dataPorMeses = {
    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
    datasets: [
      {
        data: [5000, 7000, 8000, 6000, 7500, 9000],
      },
    ],
  };

  const dataPorAños = {
    labels: ["2020", "2021", "2022", "2023", "2024"],
    datasets: [
      {
        data: [60000, 70000, 80000, 75000, 90000],
      },
    ],
  };

  // Seleccionar los datos según la vista actual
  const getData = () => {
    if (view === "dias") return dataPorDias;
    if (view === "meses") return dataPorMeses;
    if (view === "años") return dataPorAños;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.chartTitle}>Gráfico de Finanzas</Text>

      {/* Botones para cambiar la vista */}
      <View style={styles.buttonContainer}>
        <Button title="Días" onPress={() => setView("dias")} />
        <Button title="Meses" onPress={() => setView("meses")} />
        <Button title="Años" onPress={() => setView("años")} />
      </View>

      {/* Gráfico dinámico */}
      <View>
        <LineChart
          data={getData()} // Datos dinámicos según la vista seleccionada
          width={Dimensions.get("window").width - 40} // Ancho dinámico
          height={220}
          yAxisLabel="$"
          yAxisSuffix="k"
          yAxisInterval={1} // Intervalo opcional
          chartConfig={{
            backgroundColor: "#e26a00",
            backgroundGradientFrom: "#fb8c00",
            backgroundGradientTo: "#ffa726",
            decimalPlaces: 2, // Número de decimales
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#ffa726",
            },
          }}
          bezier // Hace que el gráfico sea curvo
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Fondo principal de la pantalla
    alignItems: "center",
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    padding: 20,
    color: COLORS.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.primary, // Color del texto del título
  },
  dateContainer: {
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
    //marginVertical: 10,
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
    //backgroundColor: "#00cc29", // Fondo del contenedor del FlatList
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    flexDirection: "column",
    width: "90%",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.surface, // Fondo del picker
    padding: 10,
    borderRadius: 10,
    marginBottom: 40, // Aumenta el espacio entre el picker y otros elementos

    //position: "relative", // Asegura que el contenedor no se superponga
    zIndex: 10, // Asegura que el Picker esté por encima de otros componentes
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

  selectedListContainer: {
    width: "90%",
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    borderRadius: 10,
    backgroundColor: COLORS.primary, // Fondo del contenedor del FlatList seleccionado
    justifyContent: "center", // Centra el contenido verticalmente
    alignItems: "center", // Centra el contenido horizontalmente
  },
  flatList: {
    flex: 1, // Permite que el FlatList ocupe el espacio restante
    width: "100%",
  },
});
