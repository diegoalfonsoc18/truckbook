import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { CamionIcon } from "../../assets/icons/icons";

export default function GastoItem({
  item,
  onSend,
}: {
  item: { id: string; name: string };
  onSend: (id: string, value: string) => void;
}) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleSend = () => {
    if (inputValue.trim() !== "" && !isNaN(Number(inputValue))) {
      onSend(item.id, inputValue);
      setInputValue("");
      Keyboard.dismiss();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <CamionIcon width={36} height={36} />
        </View>

        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="¿Cuánto fue el gasto?"
          keyboardType="numeric"
        />
        <Button title="Enviar" onPress={handleSend} />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
  },
  input: {
    width: "60%",
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "#fff",
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
    marginRight: 8,
  },
  calendarIcon: {
    width: 50,
    height: 50,
  },
});
