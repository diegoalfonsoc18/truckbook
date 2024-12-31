import {
  SafeAreaView,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  View,
} from "react-native";
import React, { useState } from "react";

const data = [
  { id: "1", title: "Combustible" },
  { id: "2", title: "Mantenimiento" },
  { id: "3", title: "Peajes-Permiso" },
  { id: "4", title: "SOAT" },
  { id: "5", title: "Seguros" },
  { id: "6", title: "Salario" },
  { id: "7", title: "Imprevistos" },
];

export default function Gastos() {
  const [values, setValues] = useState({});

  const handleChange = (id, value) => {
    setValues({
      ...values,
      [id]: value,
    });
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
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
});
