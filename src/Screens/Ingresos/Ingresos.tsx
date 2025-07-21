import React, { useCallback, useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { styles } from "../../constants/GastosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../components/HeaderCalendar";
import IngresosItem from "../../components/IngresosItem";
import { useIngresosStore } from "../../store/IngresosStore"; // Asegúrate de importar tu store
import IngresGast from "../../components/ResumenIngreGast";

export default function Ingresos() {
  // Zustand store
  const ingresos = useIngresosStore((state) => state.ingresos);
  const addIngreso = useIngresosStore((state) => state.addIngreso);
  const editIngreso = useIngresosStore((state) => state.editIngreso);
  const deleteIngreso = useIngresosStore((state) => state.deleteIngreso);

  // Estados locales
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedIngreso, setSelectedIngreso] = useState<string>(
    ingresosData[0].id
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Agregar ingreso usando Zustand
  const handleAddIngreso = useCallback(
    (id: string, value: string) => {
      const ingreso = ingresosData.find((i) => i.id === id);
      if (!ingreso) {
        console.error("Ingreso no encontrado");
        return;
      }
      addIngreso({ name: ingreso.name, value, fecha: selectedDate });
    },
    [addIngreso, selectedDate]
  );
  // Editar gasto (abrir modal)
  const handleEditGasto = (id: string | number) => {
    const ingreso = ingresos.find((g) => g.id === String(id));
    if (ingreso) {
      setEditValue(ingreso.value);
      setEditId(String(id));
      setModalVisible(true);
    }
  };
  // Guardar edición
  const handleSaveEdit = () => {
    if (editId) {
      editIngreso(editId, editValue);
      setModalVisible(false);
      setEditId(null);
      setEditValue("");
    }
  };

  // Eliminar ingreso
  const handleDeleteIngreso = (id: string | number) => {
    deleteIngreso(String(id));
  };

  // Mostrar/ocultar calendario
  const toggleCalendar = () => {
    setShowCalendar((prev) => !prev);
  };

  // Filtra los ingresos por la fecha seleccionada
  const IngresosFiltrados = ingresos.filter((g) => g.fecha === selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderCalendar
        title="Ingresos"
        data={ingresos}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Selector y lista de gastos */}
      <View style={styles.combinedContainer}>
        <Text style={styles.titlePicker}>Seleccione un ingreso:</Text>
        <PickerItem
          data={ingresosData}
          //label="Selecciona un ingreso:"
          pickerLabelKey="name"
          pickerValueKey="id"
          onSelect={setSelectedIngreso}
          pickerStyle={styles.picker}
          renderSelectedItem={(item) => (
            <IngresosItem item={item} onSend={handleAddIngreso} />
          )}
        />
      </View>

      {/* Resumen de gastos ingresados para la fecha seleccionada */}
      <IngresGast
        selectedDate={selectedDate}
        itemsFiltrados={IngresosFiltrados}
        handleEdit={handleEditGasto}
        handleDelete={handleDeleteIngreso}
        totalLabel="Total"
        title="Resumen de Ingresos"
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
