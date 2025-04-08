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
import { gastosData } from "../data";

export default function Gastos() {
  const [values, setValues] = useState({});
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);

  const handleChange = (id, value) => {
    if (!isNaN(value)) {
      setValues({
        ...values,
        [id]: value,
      });
    }
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const GastoItem = ({ item, value, onChange }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ingrese valor"
        value={value}
        onChangeText={(text) => onChange(item.id, text)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={showDatepicker} title="Seleccionar Fecha" />
      <Text style={styles.dateText}>
        Fecha seleccionada: {formatDate(date)}
      </Text>
      <FlatList
        data={gastosData}
        renderItem={({ item }) => (
          <GastoItem
            item={item}
            value={values[item.id] || ""}
            onChange={handleChange}
          />
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#fff",
  text: "#000",
  inputBorder: "#EBECF1",
  title: "#2E4156",
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    color: COLORS.title,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  dateText: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 10,
  },
});
