import {
  SafeAreaView,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  View,
} from "react-native";
import React, { useState } from "react";
import { styles } from "./IngresosStyles"; // Importa los estilos desde el archivo correspondiente

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
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}
