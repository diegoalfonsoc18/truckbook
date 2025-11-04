import React, { useState } from "react";
import { Text, Dimensions, View, TouchableOpacity } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { styles } from "./StylesFinanzas";
import FilterCalendar from "../../components/Reportes/FilterCalendar";
import { COLORS } from "../../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useIngresosConductor } from "../../hooks/UseingresosConductor";

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

function abreviarNumero(valor: number | string): string {
  const num = Number(valor);
  if (isNaN(num)) return String(valor);
  if (Math.abs(num) >= 1_000_000) return Math.round(num / 1_000_000) + "M";
  if (Math.abs(num) >= 1_000) return Math.round(num / 1_000) + "K";
  return num.toLocaleString("es-CO");
}

export default function FinanzasGenerales() {
  const { placa: placaActual } = useVehiculoStore();

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

  // ✅ OBTENER DATOS DE LOS HOOKS
  const { gastos: gastosRaw } = useGastosConductor(placaActual);
  const { ingresos: ingresosRaw } = useIngresosConductor(placaActual);

  // ✅ TRANSFORMAR AL FORMATO ESPERADO
  const gastos = gastosRaw.map((g) => ({
    fecha: g.fecha,
    value: g.monto,
  }));

  const ingresos = ingresosRaw.map((i) => ({
    fecha: i.fecha,
    value: i.monto,
  }));

  // ✅ FILTRAR POR RANGO
  const gastosFiltrados = filtrarPorRango(gastos, rango.inicio, rango.fin);
  const ingresosFiltrados = filtrarPorRango(ingresos, rango.inicio, rango.fin);

  // ✅ AGRUPAR SEGÚN VISTA
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

  const chartGastosData = allKeys.map((k) => {
    const val = Number(groupedGastos[k]);
    return isFinite(val) ? val : 0;
  });

  const chartIngresosData = allKeys.map((k) => {
    const val = Number(groupedIngresos[k]);
    return isFinite(val) ? val : 0;
  });

  const totalGastos = chartGastosData.reduce((a, b) => a + b, 0);
  const totalIngresos = chartIngresosData.reduce((a, b) => a + b, 0);
  const rentabilidad =
    totalIngresos === 0
      ? 0
      : (((totalIngresos - totalGastos) / totalIngresos) * 100).toFixed(2);

  const formattedLabels = view === "dias" ? allKeys.map(formatLabel) : allKeys;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FilterCalendar onChangeRango={setRango} placa={placaActual} />
      <View style={styles.graphicContainer}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => setView("dias")}
            style={[
              styles.button,
              view === "dias" && {
                backgroundColor: COLORS.primary,
                borderRadius: 8,
              },
            ]}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: view === "dias" ? "#fff" : COLORS.backgroundDark,
              }}>
              Días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView("meses")}
            style={[
              styles.button,
              view === "meses" && {
                backgroundColor: COLORS.primary,
                borderRadius: 8,
              },
            ]}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: view === "meses" ? "#fff" : COLORS.backgroundDark,
              }}>
              Meses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView("años")}
            style={[
              styles.button,
              view === "años" && {
                backgroundColor: COLORS.primary,
                borderRadius: 8,
              },
            ]}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: view === "años" ? "#fff" : COLORS.backgroundDark,
              }}>
              Años
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.containerGraph}>
          <LineChart
            data={{
              labels:
                formattedLabels.length > 0 ? formattedLabels : ["Sin datos"],
              datasets: [
                {
                  data: chartGastosData.length > 0 ? chartGastosData : [0],
                  color: () => "#DA1212",
                  strokeWidth: 2,
                },
                {
                  data: chartIngresosData.length > 0 ? chartIngresosData : [0],
                  color: () => "#19b11e",
                  strokeWidth: 2,
                },
              ],
              legend: ["Gastos", "Ingresos"],
            }}
            width={Dimensions.get("window").width * 0.9}
            height={310}
            yAxisLabel="$"
            yAxisInterval={1}
            fromZero={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            formatYLabel={abreviarNumero}
            chartConfig={{
              backgroundColor: "#e8f0fe",
              backgroundGradientFrom: "#2998ff",
              backgroundGradientTo: "#56ccf2",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#ffffff" },
            }}
            bezier
            style={{
              borderRadius: 16,
            }}
          />
        </View>
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
