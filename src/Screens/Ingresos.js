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
  { id: "1", title: "Flete" },
  { id: "2", title: "Facturas" },
  { id: "3", title: "Clientes" },
];

export default function Ingresos() {
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
    <SafeAreaView>
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
    borderColor: "#cc0000",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: "#cc0",
  },
});
