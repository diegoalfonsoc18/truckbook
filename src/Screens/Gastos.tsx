import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { gastosData } from "../data/data";
import GastoItem from "../components/GastoItem";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";

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
            <MaterialCommunityIcons
              name="calendar"
              size={40}
              color={COLORS.text}
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

      {/* Lista de gastos */}
      <FlatList
        data={gastosData}
        renderItem={({ item }) => (
          <GastoItem
            item={item}
            value={values[item.id] || ""}
            onChange={handleChange}
          />
        )}
        keyExtractor={(item) => item.id}
        extraData={values} // Asegura que los cambios en el estado actualicen la lista
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
