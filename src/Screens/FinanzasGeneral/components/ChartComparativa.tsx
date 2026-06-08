import React, { memo, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { LineChart } from "react-native-chart-kit";
import { useTheme, getShadow } from "../../../constants/Themecontext";

/** Puntos que caben cómodamente sin scroll */
const POINTS_PER_SCREEN = 7;
/** Ancho mínimo por punto de dato para legibilidad */
const MIN_POINT_WIDTH = 52;

function abreviarNumero(valor: number | string): string {
  const num = Number(valor);
  if (isNaN(num)) return String(valor);
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString("es-CO");
}

interface ChartComparativaProps {
  labels: string[];
  ingresosData: number[];
  gastosData: number[];
  animatedStyle?: {
    opacity: SharedValue<number>;
    translateY: SharedValue<number>;
  };
}

function ChartComparativa({
  labels,
  ingresosData,
  gastosData,
  animatedStyle,
}: ChartComparativaProps) {
  const { colors: c, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const chartAnimStyle = useAnimatedStyle(() => ({
    opacity: animatedStyle?.opacity.value ?? 1,
    transform: [{ translateY: animatedStyle?.translateY.value ?? 0 }],
  }));

  const totalPoints = labels.length;
  const needsScroll = totalPoints > POINTS_PER_SCREEN;

  // Calcular ancho del gráfico: si hay muchos datos, se expande para scroll
  const chartWidth = useMemo(() => {
    if (containerWidth === 0) return 300;
    if (!needsScroll) return containerWidth - 10;
    // Ancho proporcional al número de puntos
    return Math.max(containerWidth - 10, totalPoints * MIN_POINT_WIDTH);
  }, [containerWidth, totalPoints, needsScroll]);

  const chartContent = containerWidth > 0 && (
    <LineChart
      data={{
        labels,
        datasets: [
          {
            data: ingresosData.length > 0 ? ingresosData : [0],
            color: () => c.income,
            strokeWidth: 3,
          },
          {
            data: gastosData.length > 0 ? gastosData : [0],
            color: () => c.expense,
            strokeWidth: 3,
          },
        ],
      }}
      width={chartWidth}
      height={200}
      yAxisLabel="$"
      yAxisInterval={1}
      fromZero
      withVerticalLines={false}
      withHorizontalLines
      formatYLabel={abreviarNumero}
      chartConfig={{
        backgroundColor: "transparent",
        backgroundGradientFrom: c.cardBg,
        backgroundGradientTo: c.cardBg,
        decimalPlaces: 0,
        color: (opacity = 1) =>
          `rgba(${isDark ? "255,255,255" : "0,0,0"},${opacity * 0.3})`,
        labelColor: () => c.textSecondary,
        style: { borderRadius: 28 },
        propsForDots: {
          r: "4",
          strokeWidth: "2",
          stroke: c.cardBg,
        },
        propsForBackgroundLines: {
          strokeDasharray: "",
          stroke: c.border,
          strokeWidth: 1,
        },
      }}
      bezier
      style={styles.chart}
    />
  );

  return (
    <Reanimated.View
      style={[
        styles.chartContainer,
        { backgroundColor: c.cardBg, borderColor: c.border },
        getShadow(isDark, "sm"),
        chartAnimStyle,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: c.text }]}>Comparativa</Text>
        <View style={styles.chartLegendRow}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.income }]} />
              <Text style={[styles.legendText, { color: c.textSecondary }]}>
                ingresos
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.expense }]} />
              <Text style={[styles.legendText, { color: c.textSecondary }]}>
                gastos
              </Text>
            </View>
          </View>
        </View>
      </View>

      {needsScroll ? (
        <View style={styles.chartWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {chartContent}
          </ScrollView>
          <Text style={[styles.scrollHint, { color: c.textMuted }]}>
            ← desliza para ver más →
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrapper}>
          {chartContent}
        </View>
      )}
    </Reanimated.View>
  );
}

export default memo(ChartComparativa);

const styles = StyleSheet.create({
  chartContainer: {
    borderRadius: 28,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: { fontSize: 15, fontWeight: "600" },
  chartLegendRow: { flexDirection: "row", alignItems: "center" },
  chartLegend: { flexDirection: "row", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  chartWrapper: {
    overflow: "hidden",
    borderRadius: 12,
    marginHorizontal: -4,
  },
  scrollContent: {
    paddingRight: 14,
  },
  scrollHint: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },
  chart: { borderRadius: 12, marginLeft: -14 },
});
