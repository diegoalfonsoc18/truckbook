import React from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Button,
} from "react-native";
import { styles } from "../constants/GastosStyles";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
type HeaderCalendarProps = { title: string };

export default function HeaderCalendar({ title }: HeaderCalendarProps) {
  // Aquí puedes definir tus estados y funciones
  // Ejemplo de estados ficticios para que compile:
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [showCalendar, setShowCalendar] = React.useState(false);
  const gastosIngresados: { fecha: string }[] = []; // Ajusta el tipo según tu modelo

  // Guardar edición
  const handleSaveEdit = () => {
    if (editId) {
      // editGasto debe estar definido/importado
      // editGasto(editId, editValue, selectedDate);
      setModalVisible(false);
      setEditId(null);
      setEditValue("");
    }
  };

  // Eliminar gasto
  const handleDeleteGasto = (id: string) => {
    // deleteGasto debe estar definido/importado
    // deleteGasto(id, selectedDate);
  };

  // Mostrar/ocultar calendario
  const toggleCalendar = () => {
    setShowCalendar((prev) => !prev);
  };

  // Filtra los gastos por la fecha seleccionada
  const gastosFiltrados = gastosIngresados.filter(
    (g) => g.fecha === selectedDate
  );

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
