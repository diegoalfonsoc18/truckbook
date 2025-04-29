import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { gastosData } from "../data/data";
import GastoItem from "../components/GastoItem";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
import { Picker } from "@react-native-picker/picker";

export default function Gastos() {
  const [gastosIngresados, setGastosIngresados] = useState<
    { id: string; name: string; value: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id);

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
              color={COLORS.secondary}
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
      <View style={styles.listContainer}>
        <FlatList
          data={gastosIngresados} // Todos los elementos estarán disponibles
          renderItem={({ item, index }) => (
            <View style={styles.resumenItem}>
              <Text style={styles.resumenText}>
                {index + 1}. {item.name}
              </Text>
              <Text style={styles.resumenValue}>${item.value}</Text>
            </View>
          )}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          initialNumToRender={5} // Renderiza inicialmente solo los primeros 5 elementos
          style={styles.flatList}
        />
      </View>

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
      <View style={styles.selectedListContainer}>
        <FlatList
          data={gastosData.filter((gasto) => gasto.id === selectedGasto)}
          renderItem={({ item }) => (
            <GastoItem
              item={item}
              onSend={(id, value) => handleAddGasto(id, value)}
            />
          )}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Fondo principal de la pantalla
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor de la fecha
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto de la fecha
    textAlign: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor del ícono
    borderRadius: 5,
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text, // Color del título del resumen
    marginHorizontal: 20,
    marginVertical: 10,
    //backgroundColor: "#11cc00", // Fondo del título
  },
  listContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    //backgroundColor: "#00cc29", // Fondo del contenedor del FlatList
    marginHorizontal: 10,
    marginBottom: 20, // Espacio inferior
  },
  resumenItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder, // Color del borde inferior
    backgroundColor: COLORS.surface, // Fondo del resumen de cada gasto
  },
  resumenValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del valor del resumen
    textAlign: "right",
  },
  resumenText: {
    fontSize: 16,
    color: COLORS.text, // Color del texto del resumen
    textAlign: "left",
  },
  pickerContainer: {
    flexDirection: "column",
    marginHorizontal: 20,
    marginVertical: 10,
    //backgroundColor: "#4a1414", // Fondo del picker
    padding: 10,
    borderRadius: 5,
    marginBottom: 40, // Aumenta el espacio entre el picker y otros elementos
    position: "relative", // Asegura que el contenedor no se superponga
    zIndex: 10, // Asegura que el Picker esté por encima de otros componentes
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto del picker label
    marginBottom: 10,
  },
  picker: {
    color: COLORS.text, // Color del texto del picker
    //backgroundColor: "#cc0000", // Fondo del picker
  },
  selectedListContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    //backgroundColor: "#dd0cbd", // Fondo del contenedor del FlatList seleccionado
    marginHorizontal: 10,
    marginBottom: 20, // Espacio inferior
  },
  flatList: {
    flex: 1, // Permite que el FlatList ocupe el espacio restante
    //backgroundColor: "#2259e4", // Fondo del FlatList
  },
});
