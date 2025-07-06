import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text } from "react-native";

export default function GastoItem({
  item,
  onSend,
}: {
  item: { id: string; name: string }; // Asegúrate de que `item` tenga una estructura válida
  onSend: (id: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleSend = () => {
    if (inputValue.trim() !== "") {
      onSend(item.id, inputValue);
      setInputValue("");
    }
  };

  return (
    <View style={styles.container}>
      {/* Asegúrate de que item.name sea una cadena de texto */}
      <Text style={styles.label}></Text>
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Ingresa un valor"
        keyboardType="numeric"
      />
      <Button title="Enviar" onPress={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#d9d92499",
    padding: 10,
    width: "100%",
    //minHeight: 60, // Agrega altura mínima
  },
  label: {
    fontSize: 16,
    alignContent: "center",
    justifyContent: "center",
  },
  input: {
    justifyContent: "center",
    alignItems: "center",
    //flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    backgroundColor: "#fff",
  },
});
