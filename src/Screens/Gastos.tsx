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
import React, { useState } from "react";
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

export default function Gastos() {
  // Tipar los estados
  const [values, setValues] = useState<Record<string, string>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [show, setShow] = useState<boolean>(false);

  // Tipar la función handleChange
  const handleChange = (id: string, value: string) => {
    if (!isNaN(Number(value))) {
      setValues({
        ...values,
        [id]: value,
      });
    }
  };

  // Tipar la función onChange
  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShow(true);
  };

  // Tipar la función formatDate
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Componente GastoItem con tipos
  const GastoItem: React.FC<GastoItemProps> = ({ item, value, onChange }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.title}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ingrese valor"
        value={value}
        onChangeText={(text) => onChange(item.id, text)}
      />
    </View>
  );

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
    //borderWidth: 1,
    backgroundColor: "#474b51",
    //borderColor: COLORS.inputBorder,
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
