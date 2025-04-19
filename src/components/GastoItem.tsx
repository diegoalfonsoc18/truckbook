import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useCurrencyStore } from "../store/CurrencyStore"; // Estado global
import { COLORS } from "../constants/colors"; // Colores centralizados
import { Calendar } from "../components/CustomCalendar";
interface Gasto {
  id: string;
  title: string;
}

interface GastoItemProps {
  item: Gasto;
  value: string;
  onChange: (id: string, value: string) => void;
}

const GastoItem: React.FC<GastoItemProps> = React.memo(
  ({ item, value, onChange }) => {
    const { currency } = useCurrencyStore(); // Obtén la moneda seleccionada

    return (
      <View style={styles.item}>
        <Text style={styles.title}>{item.title}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder={`Ingrese valor (${currency})`} // Muestra la moneda seleccionada
          placeholderTextColor="#B0B0B0"
          value={value}
          onChangeText={(text) => onChange(item.id, text)}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    // backgroundColor: COLORS.itemBackground,
  },
  title: {
    fontSize: 18,
    color: COLORS.title,
  },
  input: {
    height: 40,
    backgroundColor: COLORS.inputBackground,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    color: COLORS.text,
  },
});

export default GastoItem;
