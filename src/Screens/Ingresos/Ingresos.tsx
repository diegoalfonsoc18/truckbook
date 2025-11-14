import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Button,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "../Gastos/GastosStyles";
import PickerItem from "../../components/PickerItem";
import { ingresosData } from "../../data/data";
import HeaderCalendar from "../../components/Gastos/HeaderCalendar";
import IngresosItem from "../../components/Ingresos/IngresosItem";
import IngresGast from "../../components/Ingresos/ResumenIngreGast";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIngresosConductor } from "../../hooks/UseingresosConductor";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";

export default function Ingresos() {
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  // ✅ OPTIMIZACIÓN 1: Obtener datos directamente del store (con Realtime)
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  // Usar el hook solo para las funciones CRUD
  const { agregarIngreso, actualizarIngreso, eliminarIngreso } =
    useIngresosConductor(placaActual);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedIngreso, setSelectedIngreso] = useState<string>(
    ingresosData[0].id
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ OPTIMIZACIÓN 2: Cargar UNA SOLA VEZ al montar
  // Realtime mantiene los datos actualizados después
  useEffect(() => {
    if (placaActual) {
      useIngresosStore.getState().cargarIngresosDelDB(placaActual);
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
      if (!ingreso) {
        console.error("Ingreso no encontrado");
        return;
      }

      setLoading(true);
      try {
        const resultado = await agregarIngreso({
          placa: placaActual,
          conductor_id: user.id,
          tipo_ingreso: ingreso.name,
          descripcion: ingreso.name,
          monto: parseFloat(value),
          fecha: selectedDate,
          estado: "confirmado",
        });

        if (resultado.success) {
          // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
          // Realtime actualiza automáticamente
          Keyboard.dismiss();
          Alert.alert("Éxito", "Ingreso agregado correctamente");
        } else {
          Alert.alert(
            "Error",
            resultado.error || "No se pudo agregar el ingreso"
          );
        }
      } catch (err) {
        console.error("Error al agregar ingreso:", err);
        Alert.alert("Error", "Error al agregar el ingreso");
      } finally {
        setLoading(false);
      }
    },
    [agregarIngreso, placaActual, selectedDate, user?.id]
  );

  const handleEditGasto = (id: string | number) => {
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
      const resultado = await actualizarIngreso(editId, {
        monto: parseFloat(editValue),
        fecha: editDate,
      });

      if (resultado.success) {
        // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
        // Realtime actualiza automáticamente
        setModalVisible(false);
        setEditId(null);
        setEditValue("");
        Alert.alert("Éxito", "Ingreso actualizado correctamente");
      } else {
        Alert.alert(
          "Error",
          resultado.error || "No se pudo actualizar el ingreso"
        );
      }
    } catch (err) {
      console.error("Error al actualizar ingreso:", err);
      Alert.alert("Error", "Error al actualizar el ingreso");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngreso = async (id: string | number) => {
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
              const resultado = await eliminarIngreso(String(id));
              if (resultado.success) {
                // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
                // Realtime actualiza automáticamente
                Alert.alert("Éxito", "Ingreso eliminado correctamente");
              } else {
                Alert.alert(
                  "Error",
                  resultado.error || "No se pudo eliminar el ingreso"
                );
              }
            } catch (err) {
              console.error("Error al eliminar ingreso:", err);
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

  // ✅ OPTIMIZACIÓN 4: Filtrar por placa actual y fecha
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
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}>
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
        <HeaderCalendar
          title="Ingresos"
          data={ingresos.filter((i) => i.placa === placaActual)}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          placa={placaActual}
        />

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
                Editar valor del ingreso
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
                  onPress={() => {
                    if (!loading) {
                      setModalVisible(false);
                      setEditId(null);
                      setEditValue("");
                    }
                  }}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        </Modal>

        <IngresGast
          selectedDate={selectedDate}
          itemsFiltrados={IngresosFiltrados}
          handleEdit={handleEditGasto}
          handleDelete={handleDeleteIngreso}
          totalLabel="Total"
          title="Resumen"
          modalLabel="Editar valor del ingreso"
          editValue={editValue}
          setEditValue={setEditValue}
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          handleSaveEdit={handleSaveEdit}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
