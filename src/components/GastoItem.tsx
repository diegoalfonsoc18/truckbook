import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet } from "react-native";

export default function GastoItem({
  item,
  onSend,
}: {
  item: any;
  onSend: (id: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState<string>(""); // Estado local para el valor ingresado

  const handleSend = () => {
    if (inputValue.trim() !== "") {
      onSend(item.id, inputValue); // Llamar a la función de envío con el valor ingresado
      setInputValue(""); // Limpiar el input después de enviar
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue} // Actualizar el estado local
        placeholder="Ingresa un valor"
        keyboardType="numeric"
      />
      <Button title="Enviar" onPress={handleSend} />{" "}
      {/* Botón para enviar el dato */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
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
