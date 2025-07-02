import React, { useCallback, useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { styles } from "../../constants/GastosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../navigation/HeaderCalendar";
import IngresosItem from "../../components/IngresosItem";
import { useIngresosStore } from "../../store/IngresosStore"; // Asegúrate de importar tu store

export default function Ingresos() {
  const [selectedIngreso, setSelectedIngreso] = useState(ingresosData[0]?.id);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const addIngreso = useIngresosStore((state) => state.addIngreso);

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

  // ...

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
    </SafeAreaView>
  );
}
