import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "../constants/colors";
type FilterCalendarProps = {
  fechaInicio: string;
  setFechaInicio: (date: string) => void;
  fechaFin: string;
  setFechaFin: (date: string) => void;
};

export default function FilterCalendar({
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
}: FilterCalendarProps) {
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);

  const onChangeInicio = (_: any, selectedDate?: Date) => {
    setShowInicio(Platform.OS === "ios");
    if (selectedDate) {
      setFechaInicio(selectedDate.toISOString().slice(0, 10));
    }
  };

  const onChangeFin = (_: any, selectedDate?: Date) => {
    setShowFin(Platform.OS === "ios");
    if (selectedDate) {
      setFechaFin(selectedDate.toISOString().slice(0, 10));
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
      <View style={{ flex: 1, marginRight: 5 }}>
        <MaterialIcons
          name="calendar-today"
          size={60}
          color={COLORS.secondary}
        />
        <Text>Desde:</Text>
        <TouchableOpacity
          onPress={() => setShowInicio(true)}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 5,
            padding: 10,
            backgroundColor: "#fff",
          }}>
          <Text>{fechaInicio || "Selecciona una fecha"}</Text>
        </TouchableOpacity>
        {showInicio && (
          <DateTimePicker
            value={fechaInicio ? new Date(fechaInicio) : new Date()}
            mode="date"
            display="default"
            onChange={onChangeInicio}
          />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 5 }}>
        <Text>Hasta:</Text>
        <MaterialIcons
          name="calendar-today"
          size={60}
          color={COLORS.secondary}
        />
        <TouchableOpacity
          onPress={() => setShowFin(true)}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 5,
            padding: 10,
            backgroundColor: "#fff",
          }}>
          <Text>{fechaFin || "Selecciona una fecha"}</Text>
        </TouchableOpacity>
        {showFin && (
          <DateTimePicker
            value={fechaFin ? new Date(fechaFin) : new Date()}
            mode="date"
            display="default"
            onChange={onChangeFin}
          />
        )}
      </View>
    </View>
  );
}
