import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Image } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "../constants/colors";

export default function GastoItem({
  item,
  onSend,
}: {
  item: { id: string; name: string }; // Asegúrate de que `item` tenga una estructura válida
  onSend: (id: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleSend = () => {
    // Verifica que el valor no esté vacío y sea un número válido
    if (inputValue.trim() !== "" && !isNaN(Number(inputValue))) {
      onSend(item.id, inputValue);
      setInputValue("");
    }
  };

  return (
    <View style={styles.container}>
      {/* Asegúrate de que item.name sea una cadena de texto */}
      <View style={styles.iconContainer}>
        <Image
          source={require("../../assets/icons1/moneyigas3d.png")}
          style={styles.calendarIcon}
        />
      </View>

      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="¿Cuanto fue el gasto?"
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
    justifyContent: "center",
    // /backgroundColor: "#d9d92499",
    padding: 10,
    width: "100%",
    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Sombra Android
    elevation: 5,
  },
  label: {
    fontSize: 16,
    //alignContent: "center",
    //justifyContent: "center",
  },
  input: {
    width: "60%",
    //justifyContent: "space-between",
    //alignItems: "center",
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#fff",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white", // mejora contraste
    alignItems: "center",
    justifyContent: "center",

    // iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,

    // Android
    elevation: 3,
    marginRight: 8,
  },
  calendarIcon: {
    width: 50,
    height: 50,
  },
});
