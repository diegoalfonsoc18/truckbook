import React from "react";
import { Calendar } from "react-native-calendars";
import { useTheme } from "../constants/Themecontext";
import * as Localization from "expo-localization"; // Importa expo-localization
import { localDateStr } from "../utils/dataUtils";

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
  const { colors } = useTheme();
  // Obtén el idioma del dispositivo
  const deviceLocale = Localization.locale; // Ejemplo: "es-ES" o "en-US"

  return (
    <Calendar
      locale={deviceLocale} // Configura el idioma del calendario
      onDayPress={(day) => {
        onDateChange(day.dateString);
        onClose(); // Oculta el calendario después de seleccionar una fecha
      }}
      maxDate={localDateStr()} // Permite solo fechas anteriores o actuales
      markedDates={{
        [selectedDate]: { selected: true, selectedColor: colors.accent },
      }}
      theme={{
        // Fondo del día seleccionado
        selectedDayBackgroundColor: colors.accent,
        selectedDayTextColor: colors.accentText, // Texto del día seleccionado

        // Texto del día actual
        todayTextColor: colors.info,

        // Color de las flechas del calendario
        arrowColor: colors.textSecondary,

        // Fondo del mes
        backgroundColor: colors.primary,

        // Texto de los días del mes
        dayTextColor: colors.textSecondary,

        // Texto de los días inactivos (fuera del mes actual)
        textDisabledColor: "#000",

        // Texto de los encabezados (días de la semana)
        textSectionTitleColor: colors.accent,

        // Fondo de los encabezados (días de la semana)
        textSectionTitleDisabledColor: colors.textSecondary,

        // Color de las líneas divisorias
        borderColor: "#27ff10df",

        // Texto de los meses
        monthTextColor: colors.textSecondary,
        textMonthFontWeight: "bold",
        textMonthFontSize: 18,
      }}
    />
  );
};

export default CustomCalendar;
