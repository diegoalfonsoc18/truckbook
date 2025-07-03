import React, { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { styles } from "../constants/GastosStyles";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
type HeaderCalendarProps = {
  title: string;
  data: Array<{ fecha: string }>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

export default function HeaderCalendar({
  title,
  data,
  selectedDate,
  setSelectedDate,
}: HeaderCalendarProps) {
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  // Función reutilizable para filtrar por fecha
  const filtrarPorFecha = (items: Array<{ fecha: string }>, fecha: string) =>
    items.filter((item) => item.fecha === fecha);
  // Puedes usar filtrarPorFecha con cualquier data y fecha
  const filtrados = filtrarPorFecha(data, selectedDate);
  // Mostrar/ocultar calendario
  const toggleCalendar = () => {
    setShowCalendar((prev: boolean) => !prev);
  };

  return (
    <>
      {/* Header */}
      <View style={styles.headerContainer}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.black} />
        <Text style={styles.headerTitle}>{title}</Text>
        <MaterialIcons
          name="notifications-active"
          size={24}
          color={COLORS.black}
        />
      </View>

      {/* Fecha seleccionada y botón para mostrar el calendario */}
      <TouchableOpacity onPress={toggleCalendar} style={styles.dateContainer}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name="calendar-month"
            size={60}
            color={COLORS.secondary}
          />
        </View>
        <Text style={styles.dateText}>{selectedDate}</Text>
      </TouchableOpacity>

      {/* Mostrar el calendario */}
      {showCalendar && (
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View style={styles.calendarOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarContainer}>
                <CustomCalendar
                  selectedDate={selectedDate}
                  onDateChange={(date) => setSelectedDate(date)}
                  onClose={() => setShowCalendar(false)}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </>
  );
}
