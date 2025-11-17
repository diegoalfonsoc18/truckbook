import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "../Gastos/GastosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../components/Gastos/HeaderCalendar";
import IngresosItem from "../../components/Ingresos/IngresosItem";
import IngresGast from "../../components/Ingresos/ResumenIngreGast";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import supabase from "../../config/SupaBaseConfig";

export default function Ingresos() {
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedIngreso, setSelectedIngreso] = useState<string>(
    ingresosData[0].id
  );

  // Modal para editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal label para saber si es agregar o editar
  const isEditing = editId !== null;

  useEffect(() => {
    console.log("📍 useEffect - placaActual:", placaActual);
    if (placaActual) {
      console.log("📍 Llamando cargarIngresosDelDB...");
      useIngresosStore.getState().cargarIngresosDelDB(placaActual);
    } else {
      console.log("📍 placaActual está vacío");
    }
  }, [placaActual]);

  const handleAddIngreso = useCallback(
    async (id: string, value: string) => {
      if (!placaActual) {
        Alert.alert("Error", "Por favor selecciona una placa primero");
        return;
      }

      if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado");
        return;
      }

      const ingreso = ingresosData.find((i) => i.id === id);
      if (!ingreso) return;

      setLoading(true);
      try {
        const { error } = await supabase.from("conductor_ingresos").insert([
          {
            placa: placaActual,
            conductor_id: user.id,
            tipo_ingreso: ingreso.name,
            descripcion: ingreso.name,
            monto: parseFloat(value),
            fecha: selectedDate,
            estado: "confirmado",
          },
        ]);

        if (error) throw error;

        Keyboard.dismiss();
        Alert.alert("Éxito", "Ingreso agregado correctamente");
      } catch (err) {
        Alert.alert("Error", "Error al agregar el ingreso");
      } finally {
        setLoading(false);
      }
    },
    [placaActual, selectedDate, user?.id]
  );

  const handleEditClick = (id: string | number) => {
    const ingreso = ingresos.find((g) => g.id === String(id));
    if (ingreso) {
      setEditValue(String(ingreso.monto));
      setEditId(String(id));
      setEditDate(ingreso.fecha);
      setModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editValue) {
      Alert.alert("Error", "Todos los campos son requeridos");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("conductor_ingresos")
        .update({
          monto: parseFloat(editValue),
          fecha: editDate,
        })
        .eq("id", editId);

      if (error) throw error;

      closeModal();
      Alert.alert("Éxito", "Ingreso actualizado correctamente");
    } catch (err) {
      Alert.alert("Error", "Error al actualizar el ingreso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string | number) => {
    Alert.alert(
      "Eliminar",
      "¿Estás seguro de que deseas eliminar este ingreso?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from("conductor_ingresos")
                .delete()
                .eq("id", String(id));

              if (error) throw error;

              Alert.alert("Éxito", "Ingreso eliminado correctamente");
            } catch (err) {
              Alert.alert("Error", "Error al eliminar el ingreso");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditId(null);
    setEditValue("");
    setEditDate(selectedDate);
    setShowDatePicker(false);
  };

  const IngresosFiltrados = ingresos
    .filter((i) => i.placa === placaActual)
    .filter((g) => g.fecha === selectedDate)
    .map((i) => ({
      id: i.id,
      name: i.tipo_ingreso || i.descripcion,
      value: i.monto,
    }));

  if (!placaActual) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#999" }}>
            Por favor selecciona una placa
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        {/* Header */}
        <HeaderCalendar
          title="Ingresos"
          data={ingresos.filter((i) => i.placa === placaActual)}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          placa={placaActual}
        />

        {/* Agregar Ingreso */}
        <View style={styles.combinedContainer}>
          <Text style={styles.titlePicker}>Seleccione un ingreso:</Text>
          <PickerItem
            data={ingresosData}
            pickerLabelKey="name"
            pickerValueKey="id"
            onSelect={setSelectedIngreso}
            pickerStyle={styles.picker}
            renderSelectedItem={(item) => (
              <IngresosItem item={item} onSend={handleAddIngreso} />
            )}
          />
        </View>

        {/* Modal para editar */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}>
            <View
              style={{
                backgroundColor: "#4CAF50",
                borderRadius: 10,
                padding: 20,
                width: "80%",
                alignItems: "center",
              }}>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
                {isEditing ? "Editar" : "Agregar"} ingreso
              </Text>

              {loading && (
                <ActivityIndicator
                  size="large"
                  color="#FFF"
                  style={{ marginBottom: 10 }}
                />
              )}

              <TextInput
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                editable={!loading}
                placeholder="Ingrese el monto"
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 5,
                  padding: 10,
                  width: "100%",
                  marginBottom: 10,
                }}
              />

              <Button
                title={`Fecha: ${editDate}`}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              />

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(editDate)}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setEditDate(date.toISOString().split("T")[0]);
                    }
                  }}
                />
              )}

              <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
                <Button
                  title="Guardar"
                  onPress={handleSaveEdit}
                  disabled={loading}
                />
                <Button
                  title="Cancelar"
                  onPress={closeModal}
                  disabled={loading}
                  color="red"
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Resumen */}
        <IngresGast
          selectedDate={selectedDate}
          itemsFiltrados={IngresosFiltrados}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          totalLabel="Total Ingresos"
          title="Resumen"
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
