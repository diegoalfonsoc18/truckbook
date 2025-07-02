import React, { useState } from "react";
import { View, Text, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../constants/GastosStyles";

type PickerItemProps = {
  data: Array<Record<string, any>>;
  label?: string;
  pickerLabelKey?: string;
  pickerValueKey?: string;
  onSelect?: (value: any) => void;
  pickerStyle?: object;
  containerStyle?: object;
  renderSelectedItem: (item: any) => React.ReactNode; // Nuevo prop requerido
};

export default function PickerItem({
  data,
  label = "Selecciona un ingreso:",
  pickerLabelKey = "name",
  pickerValueKey = "id",
  onSelect,
  pickerStyle,
  containerStyle,
  renderSelectedItem,
}: PickerItemProps) {
  const [selected, setSelected] = useState(data[0]?.[pickerValueKey] || "");

  const handleChange = (value: any) => {
    setSelected(value);
    if (onSelect) onSelect(value);
  };

  return (
    <View style={containerStyle}>
      <Text>{label}</Text>
      <Picker
        selectedValue={selected}
        onValueChange={handleChange}
        style={pickerStyle}>
        {data.map((item) => (
          <Picker.Item
            key={item[pickerValueKey]}
            label={item[pickerLabelKey]}
            value={item[pickerValueKey]}
          />
        ))}
      </Picker>

      <View style={styles.selectedListContainer}>
        <FlatList
          data={data.filter((item) => item[pickerValueKey] === selected)}
          renderItem={({ item }) => {
            const rendered = renderSelectedItem(item);
            return React.isValidElement(rendered) ? rendered : null;
          }}
          keyExtractor={(item) => item[pickerValueKey]}
          style={styles.flatList}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        />
      </View>
    </View>
  );
}
