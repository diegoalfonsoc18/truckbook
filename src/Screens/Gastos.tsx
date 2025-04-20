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
import Summary from "../components/Summary";

export default function Gastos() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const handleChange = useCallback((id: string, value: string) => {
    setValues((prevValues) => ({
      ...prevValues,
      [id]: value,
    }));
  }, []);

  const handleSend = useCallback((id: string, value: string) => {
    console.log(`Valor enviado para el gasto ${id}: ${value}`);
    setValues((prevValues) => ({
      ...prevValues,
      [id]: "", // Limpia el valor después de enviarlo
    }));
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
              color={COLORS.title}
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

      {/* Componente de resumen */}
      <Summary values={values} />

      {/* Lista de gastos */}
      <FlatList
        data={gastosData}
        renderItem={({ item }) => (
          <GastoItem
            item={item}
            value={values[item.id] || ""} // Asegura que siempre haya un valor predeterminado
            onChange={handleChange}
            onSend={handleSend}
          />
        )}
        keyExtractor={(item) => item.id} // Asegura que cada elemento tenga un id único
        extraData={values}
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
});
