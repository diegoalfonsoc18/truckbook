import React, { useState } from "react";
import { View, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";

type PickerItemProps = {
  data: Array<Record<string, any>>;
  label?: string;
  pickerLabelKey?: string;
  pickerValueKey?: string;
  onSelect?: (value: any) => void;
  pickerStyle?: object;
  containerStyle?: object;
};

export default function PickerItem({
  data,
  label = "Selecciona un ingreso:",
  pickerLabelKey = "name",
  pickerValueKey = "id",
  onSelect,
  pickerStyle,
  containerStyle,
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
    </View>
  );
}
