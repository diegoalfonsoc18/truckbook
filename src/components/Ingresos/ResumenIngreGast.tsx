import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "../../constants/colors";
import { styles } from "../../Screens/Gastos/GastosStyles";

interface IngresGastProps {
  selectedDate: string;
  itemsFiltrados: Array<{
    id: string | number;
    name: string;
    value: string | number;
  }>;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  totalLabel?: string;
  title: string;
}

export default function IngresGast({
  selectedDate,
  itemsFiltrados,
  onEdit,
  onDelete,
  totalLabel = "Total",
  title,
}: IngresGastProps) {
  const total = itemsFiltrados.reduce(
    (sum, item) => sum + parseFloat(String(item.value)),
    0
  );

  const formatCurrency = (value: number) =>
    value.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <View style={styles.resumenContainer}>
      <Text style={styles.resumenTitle}>
        {title} ({selectedDate})
      </Text>

      <View style={styles.listContainer}>
        <FlatList
          data={itemsFiltrados}
          renderItem={({ item, index }) => (
            <View style={styles.resumenItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resumenText}>
                  {index + 1}. {item.name}
                </Text>
                <Text style={styles.resumenValue}>
                  {formatCurrency(parseFloat(String(item.value)))}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => onEdit(item.id)}>
                  <MaterialIcons name="edit" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.id)}>
                  <MaterialIcons
                    name="delete"
                    size={24}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          initialNumToRender={5}
          style={styles.flatList}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        />
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          {totalLabel}: {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
}
