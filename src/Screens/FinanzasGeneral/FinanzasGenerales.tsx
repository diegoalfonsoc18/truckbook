import React, { useState } from "react";
import { SafeAreaView, Text, Dimensions, View, Button } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useGastosStore } from "../../store/CurrencyStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { styles } from "./StylesFinanzas";
import FilterCalendar from "../../components/Reportes/FilterCalendar";

// Función para agrupar por clave (día, mes o año)
function groupBy<T extends { fecha: string; value: number | string }>(
  items: T[],
  keyFn: (item: T) => string
) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + Number(item.value);
    return acc;
  }, {});
}

// Función para filtrar por rango de fechas
function filtrarPorRango<T extends { fecha: string }>(
  items: T[],
  inicio: string,
  fin: string
) {
  if (!inicio && !fin) return items;
  return items.filter((item) => {
    if (inicio && item.fecha < inicio) return false;
    if (fin && item.fecha > fin) return false;
    return true;
  });
}

export default function FinanzasGenerales() {
  const [view, setView] = useState<"dias" | "meses" | "años">("meses");
  // const [fechaInicio, setFechaInicio] = useState<string>("");
  // const [fechaFin, setFechaFin] = useState<string>("");

  const [rango, setRango] = useState<{ inicio: string; fin: string }>(() => {
    // Inicializa con el mes actual
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const first = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const last = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
    return { inicio: first, fin: last };
  });

  const gastos = useGastosStore((state) => state.gastos);
  const ingresos = useIngresosStore((state) => state.ingresos);

  // Y usa rango.inicio y rango.fin para filtrar:
  const gastosFiltrados = filtrarPorRango(gastos, rango.inicio, rango.fin);
  const ingresosFiltrados = filtrarPorRango(ingresos, rango.inicio, rango.fin);

  // Agrupa según la vista seleccionada
  let groupedGastos: Record<string, number> = {};
  let groupedIngresos: Record<string, number> = {};

  if (view === "dias") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha); // YYYY-MM-DD
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha);
  } else if (view === "meses") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 7)); // YYYY-MM
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 7));
  } else if (view === "años") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 4)); // YYYY
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 4));
  }

  // Unifica las etiquetas
  const allKeys = Array.from(
    new Set([...Object.keys(groupedGastos), ...Object.keys(groupedIngresos)])
  ).sort();

  // Asegura que los datos sean válidos (no NaN, no Infinity)
  const gastosData = allKeys.map((k) => {
    const val = Number(groupedGastos[k]);
    return isFinite(val) ? val : 0;
  });
  const ingresosData = allKeys.map((k) => {
    const val = Number(groupedIngresos[k]);
    return isFinite(val) ? val : 0;
  });

  // Calcula el balance (ingresos - gastos) para cada clave
  const balanceData = allKeys.map((k, idx) => {
    const ingreso = ingresosData[idx] || 0;
    const gasto = gastosData[idx] || 0;
    return ingreso - gasto;
  });

  // Cálculo de totales y rentabilidad
  const totalGastos = gastosData.reduce((a, b) => a + b, 0);
  const totalIngresos = ingresosData.reduce((a, b) => a + b, 0);
  const rentabilidad =
    totalIngresos === 0
      ? 0
      : (((totalIngresos - totalGastos) / totalIngresos) * 100).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.chartTitle}>Reportes</Text>
      <FilterCalendar onChangeRango={setRango} />
      <View style={styles.buttonContainer}>
        <Button title="Días" onPress={() => setView("dias")} />
        <Button title="Meses" onPress={() => setView("meses")} />
        <Button title="Años" onPress={() => setView("años")} />
      </View>
      <View>
        <LineChart
          data={{
            labels: allKeys.length > 0 ? allKeys : ["Sin datos"],
            datasets: [
              {
                data: gastosData.length > 0 ? gastosData : [0],
                color: () => "#DA1212",
                strokeWidth: 2,
              },
              {
                data: ingresosData.length > 0 ? ingresosData : [0],
                color: () => "#19b11e",
                strokeWidth: 2,
              },
              {
                data: balanceData.length > 0 ? balanceData : [0],
                color: () => "#1e90ff", // Azul para balance
                strokeWidth: 2,
              },
            ],
            legend: ["Gastos", "Ingresos", "Balance"],
          }}
          width={Dimensions.get("window").width - 40}
          height={220}
          yAxisLabel="$"
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: "#929abd",
            backgroundGradientFrom: "#0D1282",
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

        <View
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: "#fff",
            borderRadius: 10,
          }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
            Resumen numérico
          </Text>
          <Text>Total Gastos: ${totalGastos.toLocaleString("es-CO")}</Text>
          <Text>Total Ingresos: ${totalIngresos.toLocaleString("es-CO")}</Text>
          <Text>
            Balance: ${(totalIngresos - totalGastos).toLocaleString("es-CO")}
          </Text>
          <Text>% Rentabilidad: {rentabilidad}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
