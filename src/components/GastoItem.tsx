import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/colors";

interface GastoItemProps {
  item: {
    id: string;
    name: string; // Cambiado de 'title' a 'name'
  };
  value: string;
  onChange: (id: string, value: string) => void;
  onSend: (id: string, value: string) => void;
}

export default function GastoItem({
  item,
  value,
  onChange,
  onSend,
}: GastoItemProps) {
  const [inputValue, setInputValue] = useState(value);

  // Función para formatear números con puntos de mil
  const formatNumber = (num: string) => {
    if (!num) return ""; // Si el número está vacío, retorna una cadena vacía
    return parseInt(num, 10).toLocaleString("es-ES"); // Formatea el número según el idioma español
  };

  const handleSend = () => {
    if (inputValue.trim() !== "") {
      onSend(item.id, inputValue); // Llama a la función de envío
      setInputValue(""); // Limpia el campo después de enviarlo
    }
  };

  return (
    <View style={styles.container}>
      {/* Mostrar el nombre del gasto */}
      <Text style={styles.name}>{item.name}</Text>
      <TextInput
        style={styles.input}
        value={formatNumber(inputValue)} // Formatea el valor al mostrarlo
        onChangeText={(text) => {
          const rawValue = text.replace(/\./g, ""); // Elimina los puntos para mantener el valor "crudo"
          if (!isNaN(Number(rawValue))) {
            setInputValue(rawValue); // Actualiza el estado solo si es un número válido
            onChange(item.id, rawValue); // Actualiza el estado en el componente padre
          }
        }}
        placeholder="Ingresa un valor"
        keyboardType="numeric" // Asegura que el teclado sea numérico
      />
      <Button title="Enviar" onPress={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column", // Apila los elementos verticalmente
    alignItems: "center", // Alinea los elementos al centro horizontalmente
    marginVertical: 10,
    backgroundColor: COLORS.inputBackground,
    padding: 10, // Agrega un poco de espacio interno
    borderRadius: 5, // Opcional: bordes redondeados para el contenedor
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: COLORS.text,
    textAlign: "center", // Centra el texto del nombre
  },
  input: {
    width: "80%", // Ajusta el ancho del input
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    textAlign: "center", // Centra el texto dentro del input
    color: COLORS.text,
  },
});
