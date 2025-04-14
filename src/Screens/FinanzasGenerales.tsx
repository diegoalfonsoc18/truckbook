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
  { id: "1", title: "Estados de Resultados" },
  { id: "2", title: "Créditos o Deudas" },
];

export default function FinanzasGenerales() {
  const [values, setValues] = useState<{ [key: string]: string }>({});

  const handleChange = (id: string, value: string) => {
    setValues({
      ...values,
      [id]: value,
    });
  };

  const renderItem = ({ item }: { item: { id: string; title: string } }) => (
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
    color: "#fff",
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
});
