import React, { useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import { styles } from "./IngresosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../navigation/HeaderCalendar";

export default function Ingresos() {
  const [selectedIngreso, setSelectedIngreso] = useState(ingresosData[0]?.id);

  // Puedes mostrar detalles o un formulario según el ingreso seleccionado
  const ingresoSeleccionado = ingresosData.find(
    (i) => i.id === selectedIngreso
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderCalendar title="Ingresos" />
      <PickerItem
        data={ingresosData}
        label="Selecciona un ingreso:"
        pickerLabelKey="name"
        pickerValueKey="id"
        onSelect={setSelectedIngreso}
        pickerStyle={{}} // Añade el estilo que desees aquí
        containerStyle={{ margin: 20 }}
      />
      <View style={{ margin: 20 }}>
        <Text style={{ fontSize: 18 }}>
          Seleccionado: {ingresoSeleccionado?.name}
        </Text>
        {/* Aquí puedes mostrar un formulario, input o lo que necesites */}
      </View>
    </SafeAreaView>
  );
}
