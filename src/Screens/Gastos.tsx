import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  View,
  Button,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { gastosData } from "../data/data";

// Define la interfaz para los datos de gastos
interface Gasto {
  id: string;
  title: string;
}

// Define las propiedades del componente GastoItem
interface GastoItemProps {
  item: Gasto;
  value: string;
  onChange: (id: string, value: string) => void;
}

// Componente GastoItem con React.memo para evitar renderizados innecesarios
const GastoItem: React.FC<GastoItemProps> = React.memo(
  ({ item, value, onChange }) => {
    return (
      <View style={styles.item}>
        <Text style={styles.title}>{item.title}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ingrese valor"
          placeholderTextColor="#B0B0B0"
          value={value}
          onChangeText={(text) => onChange(item.id, text)}
        />
      </View>
    );
  }
);

export default function Gastos() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [show, setShow] = useState<boolean>(false);

  const handleChange = useCallback((id: string, value: string) => {
    setValues((prevValues) => ({
      ...prevValues,
      [id]: value,
    }));
  }, []);

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button onPress={showDatepicker} title="Seleccionar Fecha" />
      <Text style={styles.dateText}>
        Fecha seleccionada: {formatDate(date)}
      </Text>
      <FlatList
        data={gastosData}
        renderItem={({ item }) => (
          <GastoItem
            item={item}
            value={values[item.id] || ""}
            onChange={handleChange}
          />
        )}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const COLORS = {
  background: "#393E46",
  text: "#fff",
  inputBorder: "#EBECF1",
  title: "#FAFF00",
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    color: COLORS.title,
  },
  input: {
    height: 40,
    backgroundColor: "#474b51",
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    color: COLORS.text,
  },
  dateText: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 10,
    color: COLORS.text,
  },
});
