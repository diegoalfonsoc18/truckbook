import React, { useState, useCallback } from "react";
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { gastosData } from "../../data/data";
import GastoItem from "../../components/GastoItem";
import { COLORS } from "../../constants/colors";
import CustomCalendar from "../../components/CustomCalendar";
import { styles } from "../../constants/GastosStyles";
import { useGastosStore } from "../../store/CurrencyStore";
import PickerItem from "../../components/PickerItem";
import IngresGast from "../../components/ResumenIngreGast";

export default function Gastos() {
  // Zustand store
  const gastosIngresados = useGastosStore((state) => state.gastos);
  const addGasto = useGastosStore((state) => state.addGasto);
  const editGasto = useGastosStore((state) => state.editGasto);
  const deleteGasto = useGastosStore((state) => state.deleteGasto);

  // Estados locales
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id);
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // Agregar gasto usando Zustand
  const handleAddGasto = useCallback(
    (id: string, value: string) => {
      const gasto = gastosData.find((g) => g.id === id);
      if (!gasto) {
        console.error("Gasto no encontrado");
        return;
      }
      addGasto({ name: gasto.name, value, fecha: selectedDate });
    },
    [addGasto, selectedDate]
  );

  // Editar gasto (abrir modal)
  const handleEditGasto = (id: string | number) => {
    const gasto = gastosIngresados.find((g) => g.id === String(id));
    if (gasto) {
      setEditValue(gasto.value);
      setEditId(String(id));
      setModalVisible(true);
    }
  };

  // Guardar edición
  const handleSaveEdit = () => {
    if (editId) {
      editGasto(editId, editValue, selectedDate);
      setModalVisible(false);
      setEditId(null);
      setEditValue("");
    }
  };

  // Eliminar gasto
  const handleDeleteGasto = (id: string | number) => {
    deleteGasto(String(id), selectedDate);
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.black} />
        <Text style={styles.headerTitle}>Gastos</Text>
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

      {/* Selector y lista de gastos */}
      <View style={styles.combinedContainer}>
        <PickerItem
          data={gastosData}
          label="Selecciona un gasto:"
          pickerLabelKey="name"
          pickerValueKey="id"
          onSelect={setSelectedGasto}
          pickerStyle={styles.picker}
          containerStyle={styles.pickerContainer}
          renderSelectedItem={(item) => (
            <GastoItem item={item} onSend={handleAddGasto} />
          )}
        />
      </View>

      {/* Resumen de gastos ingresados para la fecha seleccionada */}
      <IngresGast
        selectedDate={selectedDate}
        itemsFiltrados={gastosFiltrados}
        handleEdit={handleEditGasto}
        handleDelete={handleDeleteGasto}
        totalLabel="Total"
        title="Resumen de Gastos"
        modalLabel="Editar valor del gasto"
        editValue={editValue}
        setEditValue={setEditValue}
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        handleSaveEdit={handleSaveEdit}
      />
    </SafeAreaView>
  );
}
