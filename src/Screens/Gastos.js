import {
  SafeAreaView,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  View,
  Button,
  Platform,
} from "react-native";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

const data = [
  { id: "1", title: "Combustible" },
  { id: "2", title: "Mantenimiento" },
  { id: "3", title: "Peajes-Permisos" },
  { id: "4", title: "SOAT" },
  { id: "5", title: "Seguros" },
  { id: "6", title: "Salario" },
  { id: "7", title: "Imprevistos" },
];

export default function Gastos() {
  const [values, setValues] = useState({});
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);

  const handleChange = (id, value) => {
    setValues({
      ...values,
      [id]: value,
    });
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ingrese valor"
        value={values[item.id] || ""}
        onChangeText={(value) => handleChange(item.id, value)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={showDatepicker} title="Fecha" />
      <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          display="default"
          onChange={onChange}
        />
      )}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: "#2E4156",
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    color: "#fff", // Cambia el color del texto para que sea visible sobre el fondo oscuro
  },
  input: {
    height: 40,
    borderColor: "#cc0000",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: "#cc0",
    borderRadius: 5, // Agrega esta línea para redondear los bordes del input
  },
  dateText: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 10,
  },
});
