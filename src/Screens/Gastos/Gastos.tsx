import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Modal,
  Text,
  TextInput,
  Button,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { gastosData } from "../../data/data";
import HeaderCalendar from "../../components/HeaderCalendar";
import GastoItem from "../../components/GastoItem";
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
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      setEditDate(gasto.fecha); // Usar la fecha original del gasto
      setModalVisible(true);
    }
  };

  // Guardar edición
  const handleSaveEdit = () => {
    if (editId) {
      editGasto(editId, editValue, editDate);
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

  // Filtra los gastos por el mes seleccionado
  const gastosFiltrados = gastosIngresados.filter(
    (g) => g.fecha === selectedDate
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <HeaderCalendar
        title="Gastos"
        data={gastosIngresados}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
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

      {/* Modal para editar gasto */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 20,
              width: "80%",
              alignItems: "center",
            }}>
            <Text
              style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
              Editar valor del gasto
            </Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 5,
                padding: 10,
                width: "100%",
                marginBottom: 10,
              }}
            />
            <Button
              title={`Fecha: ${editDate}`}
              onPress={() => setShowDatePicker(true)}
            />
            {showDatePicker && (
              <DateTimePicker
                value={new Date(editDate)}
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setEditDate(date.toISOString().split("T")[0]);
                }}
              />
            )}
            <View style={{ flexDirection: "row", marginTop: 20 }}>
              <Button title="Guardar" onPress={handleSaveEdit} />
              <View style={{ width: 10 }} />
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

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
