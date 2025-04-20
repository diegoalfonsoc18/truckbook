import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { gastosData } from "../data/data";
import GastoItem from "../components/GastoItem";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
import { Picker } from "@react-native-picker/picker"; // Importar Picker

export default function Gastos() {
  const [gastosIngresados, setGastosIngresados] = useState<
    { id: string; name: string; value: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id); // Gasto seleccionado

  const handleAddGasto = useCallback((id: string, value: string) => {
    const gasto = gastosData.find((g) => g.id === id);
    if (gasto) {
      setGastosIngresados((prevGastos) => [
        ...prevGastos,
        { id: gasto.id, name: gasto.name, value },
      ]);
    }
  }, []);

  const toggleCalendar = () => {
    setShowCalendar((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fecha seleccionada y botón para mostrar el calendario */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{selectedDate}</Text>
        <TouchableOpacity onPress={toggleCalendar}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name="calendar-month"
              size={60}
              color={COLORS.main}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Mostrar el calendario */}
      {showCalendar && (
        <CustomCalendar
          selectedDate={selectedDate}
          onDateChange={(date) => setSelectedDate(date)}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Componente de resumen de gastos ingresados */}
      <Text style={styles.resumenTitle}>Resumen de Gastos</Text>
      <FlatList
        data={gastosIngresados} // Mostrar todos los gastos ingresados
        renderItem={({ item, index }) => (
          <View style={styles.resumenItem}>
            <Text style={styles.resumenText}>
              {index + 1}. {item.name}
            </Text>
            <Text style={styles.resumenValue}>${item.value}</Text>
          </View>
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`} // Asegura que cada elemento tenga un id único
      />

      {/* Selector de gastos */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Selecciona un gasto:</Text>
        <Picker
          selectedValue={selectedGasto}
          onValueChange={(itemValue) => setSelectedGasto(itemValue)}
          style={styles.picker}>
          {gastosData.map((gasto) => (
            <Picker.Item key={gasto.id} label={gasto.name} value={gasto.id} />
          ))}
        </Picker>
      </View>

      {/* Mostrar el gasto seleccionado */}
      <FlatList
        data={gastosData.filter((gasto) => gasto.id === selectedGasto)} // Filtrar por el gasto seleccionado
        renderItem={({ item }) => (
          <GastoItem
            item={item}
            onSend={(id, value) => handleAddGasto(id, value)} // Llamar a handleAddGasto solo al enviar
          />
        )}
        keyExtractor={(item) => item.id} // Asegura que cada elemento tenga un id único
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  dateText: {
    fontSize: 18,
    color: COLORS.text,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  pickerContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 5,
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  resumenItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  resumenText: {
    fontSize: 16,
    color: COLORS.text,
  },
  resumenValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.main,
  },
});
