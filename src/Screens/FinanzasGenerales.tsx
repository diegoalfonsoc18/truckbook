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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 20,
  },
});
