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
      <Text style={styles.label}>{item.name || "Sin nombre"}</Text>
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
    marginVertical: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 5,
    marginRight: 10,
  },
});
