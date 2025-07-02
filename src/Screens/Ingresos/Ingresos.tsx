import React, { useCallback, useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { styles } from "../../constants/GastosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../navigation/HeaderCalendar";
import IngresosItem from "../../components/IngresosItem";
import { useIngresosStore } from "../../store/IngresosStore"; // Asegúrate de importar tu store
import IngresGast from "../../components/ResumenIngreGast";

export default function Ingresos() {
  const [selectedIngreso, setSelectedIngreso] = useState(ingresosData[0]?.id);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [editValue, setEditValue] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const addIngreso = useIngresosStore((state) => state.addIngreso);
  const IngresosIngresados = useIngresosStore((state) => state.ingresos); // Asegúrate de que 'ingresos' es el nombre correcto en tu store

  // ...

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
    const ingreso = IngresosFiltrados.find((g) => g.id === String(id));
    if (ingreso) {
      setEditValue(ingreso.value);
      setEditId(String(id));
      setModalVisible(true);
    }
  };

  // Eliminar gasto (debe implementar la lógica según tu store)
  const handleDeleteGasto = (id: string | number) => {
    // Aquí deberías llamar a la función de tu store para eliminar el ingreso/gasto
    // Por ejemplo: removeIngreso(id);
    console.log("Eliminar gasto con id:", id);
  };

  // Guardar edición del gasto/ingreso
  const handleSaveEdit = () => {
    // Aquí deberías implementar la lógica para guardar la edición usando tu store
    // Por ejemplo: updateIngreso(editId, editValue);
    setModalVisible(false);
    setEditId(null);
    setEditValue("");
  };

  // Filtra los gastos por la fecha seleccionada
  const IngresosFiltrados = IngresosIngresados.filter(
    (g) => g.fecha === selectedDate
  );
  return (
    <SafeAreaView style={styles.container}>
      <HeaderCalendar title="Ingresos" />
      {/* Selector y lista de gastos */}
      <View style={styles.combinedContainer}>
        <PickerItem
          data={ingresosData}
          label="Selecciona un ingreso:"
          pickerLabelKey="name"
          pickerValueKey="id"
          onSelect={setSelectedIngreso}
          pickerStyle={styles.picker}
          containerStyle={styles.pickerContainer}
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
