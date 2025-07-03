import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  Dimensions,
  View,
  Button,
  ScrollView,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useGastosStore } from "../../store/CurrencyStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { styles } from "./StylesFinanzas";
import FilterCalendar from "../../components/Reportes/FilterCalendar";

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

// Formatea las etiquetas del eje X
function formatLabel(fecha: string) {
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const [anio, mes, dia] = fecha.split("-");
  if (!anio || !mes || !dia) return fecha;
  return `${dia} ${meses[parseInt(mes, 10) - 1]}`;
}

// Formatea los valores del eje Y (K/M)
function abreviarNumero(valor: number | string) {
  const num = Number(valor);
  if (isNaN(num)) return valor;
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString("es-CO");
}

export default function FinanzasGenerales() {
  const [view, setView] = useState<"dias" | "meses" | "años">("meses");
  const [rango, setRango] = useState<{ inicio: string; fin: string }>(() => {
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

  const gastosFiltrados = filtrarPorRango(gastos, rango.inicio, rango.fin);
  const ingresosFiltrados = filtrarPorRango(ingresos, rango.inicio, rango.fin);

  let groupedGastos: Record<string, number> = {};
  let groupedIngresos: Record<string, number> = {};

  if (view === "dias") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha);
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha);
  } else if (view === "meses") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 7));
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 7));
  } else if (view === "años") {
    groupedGastos = groupBy(gastosFiltrados, (g) => g.fecha?.slice(0, 4));
    groupedIngresos = groupBy(ingresosFiltrados, (i) => i.fecha?.slice(0, 4));
  }

  const allKeys = Array.from(
    new Set([...Object.keys(groupedGastos), ...Object.keys(groupedIngresos)])
  ).sort();

  const gastosData = allKeys.map((k) => {
    const val = Number(groupedGastos[k]);
    return isFinite(val) ? val : 0;
  });
  const ingresosData = allKeys.map((k) => {
    const val = Number(groupedIngresos[k]);
    return isFinite(val) ? val : 0;
  });

  const balanceData = allKeys.map((k, idx) => {
    const ingreso = ingresosData[idx] || 0;
    const gasto = gastosData[idx] || 0;
    return ingreso - gasto;
  });

  const totalGastos = gastosData.reduce((a, b) => a + b, 0);
  const totalIngresos = ingresosData.reduce((a, b) => a + b, 0);
  const rentabilidad =
    totalIngresos === 0
      ? 0
      : (((totalIngresos - totalGastos) / totalIngresos) * 100).toFixed(2);

  // Calcula el ancho del gráfico para scroll horizontal si hay muchos datos
  const chartWidth = Math.max(
    Dimensions.get("window").width - 40,
    allKeys.length * 60
  );

  // Formatea las etiquetas del eje X
  const formattedLabels = view === "dias" ? allKeys.map(formatLabel) : allKeys;

  return (
    <SafeAreaView style={styles.container}>
      <FilterCalendar onChangeRango={setRango} />
      <View style={styles.containerGraph}>
        <View style={styles.buttonContainer}>
          <Button title="Días" onPress={() => setView("dias")} />
          <Button title="Meses" onPress={() => setView("meses")} />
          <Button title="Años" onPress={() => setView("años")} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels:
                formattedLabels.length > 0 ? formattedLabels : ["Sin datos"],
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
                  color: () => "#1e90ff",
                  strokeWidth: 2,
                },
              ],
              legend: ["Gastos", "Ingresos", "Balance"],
            }}
            width={chartWidth}
            height={300}
            yAxisLabel="$"
            yAxisInterval={1}
            fromZero={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            formatYLabel={abreviarNumero}
            chartConfig={{
              backgroundColor: "#929abd",
              backgroundGradientFrom: "#0D1282",
              backgroundGradientTo: "#ffa726",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 10 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16,
              paddingHorizontal: 8,
            }}
          />
        </ScrollView>
      </View>
      <View style={styles.resumenContainer}>
        <Text style={styles.resumenTitle}>Resumen</Text>
        <Text style={styles.resumenText}>
          Total Gastos:{" "}
          <Text style={{ fontWeight: "bold" }}>
            ${totalGastos.toLocaleString("es-CO")}
          </Text>
        </Text>
        <Text style={styles.resumenText}>
          Total Ingresos:{" "}
          <Text style={{ fontWeight: "bold" }}>
            ${totalIngresos.toLocaleString("es-CO")}
          </Text>
        </Text>
        <Text style={styles.resumenText}>
          Balance:{" "}
          <Text style={{ fontWeight: "bold" }}>
            ${(totalIngresos - totalGastos).toLocaleString("es-CO")}
          </Text>
        </Text>
        <Text style={styles.resumenText}>
          % Rentabilidad:{" "}
          <Text style={{ fontWeight: "bold" }}>{rentabilidad}%</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
