import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Button,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { gastosData } from "../data/data";
import GastoItem from "../components/Gastos/GastoItem";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../components/Gastos/GastosStyles"; // Asegúrate de que la ruta sea correcta
import { useGastosStore } from "../store/CurrencyStore";

export default function Gastos() {
  const [gastosIngresados, setGastosIngresados] = useState<
    { id: string; name: string; value: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id);

  const handleAddGasto = useCallback((id: string, value: string) => {
    const gasto = gastosData.find((g) => g.id === id);
    if (!gasto) {
      console.error("Gasto no encontrado");
      return;
    }
    setGastosIngresados((prevGastos) => [
      ...prevGastos,
      { id: gasto.id, name: gasto.name, value },
    ]);
  }, []);

  const toggleCalendar = () => {
    setShowCalendar((prev) => !prev);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const handleEditGasto = (id: string) => {
    const gasto = gastosIngresados.find((g) => g.id === id);
    if (gasto) {
      setEditValue(gasto.value);
      setEditId(id);
      setModalVisible(true);
    }
  };

  const handleSaveEdit = () => {
    if (editId) {
      setGastosIngresados((prevGastos) =>
        prevGastos.map((g) =>
          g.id === editId ? { ...g, value: editValue } : g
        )
      );
      setModalVisible(false);
      setEditId(null);
      setEditValue("");
    }
  };

  const handleDeleteGasto = (id: string) => {
    setGastosIngresados((prevGastos) => prevGastos.filter((g) => g.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Título del componente */}
      <View style={styles.headerContainer}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.black} />
        <Text style={styles.headerTitle}>Gastos</Text>
        <MaterialIcons
          name="notifications-active"
          size={24}
          color={COLORS.black}
        />
      </View>

      {/* Fecha seleccionada y botón para mostrar el calendario */}
      <TouchableOpacity onPress={toggleCalendar} style={styles.dateContainer}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name="calendar-month"
            size={60}
            color={COLORS.secondary}
          />
        </View>
        <Text style={styles.dateText}>{selectedDate}</Text>
      </TouchableOpacity>

      {/* Mostrar el calendario */}
      {showCalendar && (
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View style={styles.calendarOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarContainer}>
                <CustomCalendar
                  selectedDate={selectedDate}
                  onDateChange={(date) => setSelectedDate(date)}
                  onClose={() => setShowCalendar(false)}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
      {/* Contenedor combinado */}

      <View style={styles.combinedContainer}>
        {/* Selector de gastos */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Selecciona un gasto:</Text>
          <Picker
            selectedValue={selectedGasto}
            onValueChange={(itemValue) => setSelectedGasto(itemValue)}
            style={styles.picker}>
            {gastosData.map((gasto) => (
              <Picker.Item key={gasto.id} label={gasto.name} value={gasto.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.selectedListContainer}>
          {/* Lista de gastos seleccionados */}

          <FlatList
            data={gastosData.filter((gasto) => gasto.id === selectedGasto)}
            renderItem={({ item }) => (
              <GastoItem
                item={item}
                onSend={(id, value) => handleAddGasto(id, value)}
              />
            )}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} // Centra el contenido verticalmente
          />
        </View>
      </View>

      {/* Componente de resumen de gastos ingresados */}
      <View style={styles.resumenContainer}>
        <Text style={styles.resumenTitle}>Resumen de Gastos</Text>
        <View style={styles.listContainer}>
          <FlatList
            data={gastosIngresados} // Todos los elementos estarán disponibles
            renderItem={({ item, index }) => (
              <View style={styles.resumenItem}>
                <Text style={styles.resumenText}>
                  {index + 1}. {item.name}
                </Text>
                <Text style={styles.resumenValue}>
                  {parseFloat(item.value).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Text>
                <View style={styles.actionButtons}>
                  {/* Botón para editar */}
                  <TouchableOpacity onPress={() => handleEditGasto(item.id)}>
                    <MaterialIcons
                      name="edit"
                      size={24}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>

                  {/* Botón para eliminar */}
                  <TouchableOpacity onPress={() => handleDeleteGasto(item.id)}>
                    <MaterialIcons
                      name="delete"
                      size={24}
                      color={COLORS.primary} // Replace with an existing valid color property
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            initialNumToRender={5} // Renderiza inicialmente solo los primeros 5 elementos
            style={styles.flatList}
            contentContainerStyle={{ paddingBottom: 20 }} // Espaciado interno para evitar cortes
            showsVerticalScrollIndicator={false} // Oculta la barra de desplazamiento vertical
          />
        </View>
        {/* Mostrar la suma total de los gastos */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>
            Total: {""}
            {gastosIngresados
              .reduce((sum, gasto) => sum + parseFloat(gasto.value), 0)
              .toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
          </Text>
        </View>
      </View>
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
            <Text>Editar valor del gasto:</Text>
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
    </SafeAreaView>
  );
}
