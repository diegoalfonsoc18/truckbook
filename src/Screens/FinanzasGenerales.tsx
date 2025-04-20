import React from "react";
import { SafeAreaView, Text, StyleSheet, Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

export default function FinanzasGenerales() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.chartTitle}>Gráfico de Finanzas</Text>
      <View>
        <LineChart
          data={{
            labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
            datasets: [
              {
                data: [
                  Math.random() * 100,
                  Math.random() * 100,
                  Math.random() * 100,
                  Math.random() * 100,
                  Math.random() * 100,
                  Math.random() * 100,
                ],
              },
            ],
          }}
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
    backgroundColor: "#f5f5f5",
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
});
