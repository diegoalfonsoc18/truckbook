import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

interface SummaryProps {
  values: Record<string, string>;
}

const Summary: React.FC<SummaryProps> = ({ values }) => {
  // Calcular la suma total de los valores ingresados
  const totalSum = Object.values(values).reduce((sum, value) => {
    const numericValue = parseFloat(value);
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Resumen de Gastos</Text>
      <FlatList
        data={Object.entries(values)}
        keyExtractor={([id]) => id}
        renderItem={({ item: [id, value] }) => (
          <Text style={styles.summaryItem}>
            {id}: ${parseFloat(value).toFixed(2)}
          </Text>
        )}
      />
      <Text style={styles.totalText}>Total: ${totalSum.toFixed(2)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 10,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 5,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.title,
    marginTop: 10,
  },
});

export default Summary;
