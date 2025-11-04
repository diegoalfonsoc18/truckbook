import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
} from "react-native";
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
  handleEdit: (id: string | number) => void;
  handleDelete: (id: string | number) => void;
  totalLabel?: string;
  title: string;
  modalLabel?: string;
  editValue: string;
  setEditValue: (v: string) => void;
  modalVisible: boolean;
  setModalVisible: (v: boolean) => void;
  handleSaveEdit: () => void;
}

export default function IngresGast({
  selectedDate,
  itemsFiltrados,
  handleEdit,
  handleDelete,
  totalLabel = "Total",
  title,
  modalLabel = "Editar valor",
  editValue,
  setEditValue,
  modalVisible,
  setModalVisible,
  handleSaveEdit,
}: IngresGastProps) {
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
              <Text style={styles.resumenText}>
                {index + 1}. {item.name}
              </Text>
              <Text style={styles.resumenValue}>
                {parseFloat(String(item.value)).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => handleEdit(item.id)}>
                  <MaterialIcons name="edit" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
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
        />
      </View>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          {totalLabel}:{" "}
          {itemsFiltrados
            .reduce((sum, item) => sum + parseFloat(String(item.value)), 0)
            .toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
        </Text>
      </View>
      {/* Modal para editar */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}>
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 10,
              width: "80%",
            }}>
            <Text>{modalLabel}:</Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 5,
                padding: 10,
                marginVertical: 10,
              }}
            />
            <Button title="Guardar" onPress={handleSaveEdit} />
            <Button
              title="Cancelar"
              onPress={() => setModalVisible(false)}
              color="red"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
