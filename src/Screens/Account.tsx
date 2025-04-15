import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker"; // Importa el Picker desde el paquete correcto
import { useCurrencyStore } from "../store/CurrencyStore"; // Importa el store de Zustand

export default function Account() {
  const { currency, setCurrency } = useCurrencyStore(); // Accede al estado global

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Selecciona tu moneda:</Text>
      <Picker
        selectedValue={currency}
        onValueChange={(value) => setCurrency(value)} // Actualiza la moneda seleccionada
        style={styles.picker}>
        <Picker.Item label="Pesos Colombianos (COP)" value="COP" />
        <Picker.Item label="Dólares (USD)" value="USD" />
        <Picker.Item label="Euros (EUR)" value="EUR" />
      </Picker>
      {/* Muestra la moneda seleccionada */}
      <Text style={styles.selectedCurrency}>
        Moneda seleccionada: {currency}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#393E46",
  },
  title: {
    fontSize: 18,
    color: "#FAFF00",
    marginBottom: 20,
  },
  picker: {
    width: 200,
    color: "#EEEEEE",
    backgroundColor: "#222831",
  },
  selectedCurrency: {
    marginTop: 20,
    fontSize: 16,
    color: "#EEEEEE",
  },
});
