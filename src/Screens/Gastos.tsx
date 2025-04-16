import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { Calendar } from "react-native-calendars";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { gastosData } from "../data/data"; // Datos de ejemplo
import GastoItem from "../components/GastoItem"; // Componente separado
import { formatDate, getCurrentDay } from "../utils/dataUtils"; // Funciones utilitarias
import { COLORS } from "../constants/colors";
// Define la interfaz para los datos de gastos
interface Gasto {
  id: string;
  title: string;
}

// Define las propiedades del componente GastoItem
interface GastoItemProps {
  item: Gasto;
  value: string;
  onChange: (id: string, value: string) => void;
}

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

  const formatDate = (date: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(date).toLocaleDateString("es-ES", options);
  };

  const getCurrentDay = (): string => {
    const today = new Date();
    return today.getDate().toString(); // Obtiene el día actual como string
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fecha seleccionada y botón para mostrar el calendario */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={toggleCalendar}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="calendar"
              size={40}
              color={COLORS.text}
            />
            <Text style={styles.dayText}>{getCurrentDay()}</Text>
          </View>
        </TouchableOpacity>
      </View>
      {showCalendar && (
        <Calendar
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setShowCalendar(false); // Oculta el calendario después de seleccionar una fecha
          }}
          maxDate={new Date().toISOString().split("T")[0]} // Permite solo fechas anteriores o actuales
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: COLORS.title },
          }}
          theme={{
            selectedDayBackgroundColor: COLORS.title,
            todayTextColor: COLORS.title,
            arrowColor: COLORS.title,
          }}
        />
      )}
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
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    color: COLORS.title,
  },
  input: {
    height: 40,
    backgroundColor: "#474b51",
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    color: COLORS.text,
  },
  dateText: {
    fontSize: 18,
    color: COLORS.text,
  },
  calendarButton: {
    fontSize: 24,
    color: COLORS.title,
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    position: "absolute",
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "bold",
    top: 8,
  },
});
