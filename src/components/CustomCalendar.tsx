import React from "react";
import { Calendar } from "react-native-calendars";
import { COLORS } from "../constants/colors";
import * as Localization from "expo-localization"; // Importa expo-localization

interface CustomCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onClose: () => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  selectedDate,
  onDateChange,
  onClose,
}) => {
  // Obtén el idioma del dispositivo
  const deviceLocale = Localization.locale; // Ejemplo: "es-ES" o "en-US"

  return (
    <Calendar
      locale={deviceLocale} // Configura el idioma del calendario
      onDayPress={(day) => {
        onDateChange(day.dateString);
        onClose(); // Oculta el calendario después de seleccionar una fecha
      }}
      maxDate={new Date().toISOString().split("T")[0]} // Permite solo fechas anteriores o actuales
      markedDates={{
        [selectedDate]: { selected: true, selectedColor: COLORS.primary },
      }}
      theme={{
        // Fondo del día seleccionado
        selectedDayBackgroundColor: COLORS.title,
        selectedDayTextColor: COLORS.background, // Texto del día seleccionado

        // Texto del día actual
        todayTextColor: COLORS.secondary,

        // Color de las flechas del calendario
        arrowColor: COLORS.textSecondary,

        // Fondo del mes
        backgroundColor: COLORS.background,

        // Texto de los días del mes
        dayTextColor: COLORS.textSecondary,

        // Texto de los días inactivos (fuera del mes actual)
        textDisabledColor: "#000",

        // Texto de los encabezados (días de la semana)
        textSectionTitleColor: COLORS.primary,

        // Fondo de los encabezados (días de la semana)
        textSectionTitleDisabledColor: COLORS.textSecondary,

        // Color de las líneas divisorias
        borderColor: "#27ff10df",

        // Texto de los meses
        monthTextColor: COLORS.textSecondary,
        textMonthFontWeight: "bold",
        textMonthFontSize: 18,
      }}
    />
  );
};

export default CustomCalendar;
