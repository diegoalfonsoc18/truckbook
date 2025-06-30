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
import { useGastosStore } from "../store/CurrencyStore";

// Función para agrupar gastos por clave (día, mes o año)
function groupBy<T>(gastos: T[], keyFn: (gasto: T) => string) {
  return gastos.reduce<Record<string, number>>((acc, gasto) => {
    const key = keyFn(gasto);
    acc[key] = (acc[key] || 0) + Number((gasto as any).value);
    return acc;
  }, {});
}

export default function FinanzasGenerales() {
  const [view, setView] = useState<"dias" | "meses" | "años">("meses");
  const gastos = useGastosStore((state) => state.gastos);

  // Agrupa según la vista seleccionada
  let grouped = {};
  type Gasto = { fecha: string; value: number | string };

  if (view === "dias") {
    grouped = groupBy(gastos, (g: Gasto) => g.fecha); // YYYY-MM-DD
  } else if (view === "meses") {
    grouped = groupBy(gastos, (g: Gasto) => g.fecha?.slice(0, 7)); // YYYY-MM
  } else if (view === "años") {
    grouped = groupBy(gastos, (g: Gasto) => g.fecha?.slice(0, 4)); // YYYY
  }
  const labels =
    Object.keys(grouped).length > 0 ? Object.keys(grouped) : ["Sin datos"];
  const data: number[] =
    Object.keys(grouped).length > 0 ? Object.values(grouped).map(Number) : [0];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.chartTitle}>Gráfico de Finanzas</Text>
      <View style={styles.buttonContainer}>
        <Button title="Días" onPress={() => setView("dias")} />
        <Button title="Meses" onPress={() => setView("meses")} />
        <Button title="Años" onPress={() => setView("años")} />
      </View>
      <View>
        <LineChart
          data={{
            labels,
            datasets: [{ data }],
          }}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisLabel="$"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#e26a00",
            backgroundGradientFrom: "#fb8c00",
            backgroundGradientTo: "#ffa726",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" },
          }}
          bezier
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
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  chartTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
});
