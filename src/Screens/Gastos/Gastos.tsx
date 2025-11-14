import React, { useState, useCallback, useEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { gastosData } from "../../data/data";
import HeaderCalendar from "../../components/Gastos/HeaderCalendar";
import GastoItem from "../../components/Gastos/GastoItem";
import { styles } from "./GastosStyles";
import PickerItem from "../../components/PickerItem";
import IngresGast from "../../components/Ingresos/ResumenIngreGast";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";

export default function Gastos() {
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  // ✅ OPTIMIZACIÓN 1: Obtener datos directamente del store (con Realtime)
  const gastos = useGastosStore(useShallow((state) => state.gastos));

  // Usar el hook solo para las funciones CRUD
  const { agregarGasto, actualizarGasto, eliminarGasto } =
    useGastosConductor(placaActual);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id);
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ OPTIMIZACIÓN 2: Cargar UNA SOLA VEZ al montar
  // Realtime mantiene los datos actualizados después
  useEffect(() => {
    if (placaActual) {
      useGastosStore.getState().cargarGastosDelDB(placaActual);
    }
  }, [placaActual]);

  const handleAddGasto = useCallback(
    async (id: string, value: string) => {
      if (!placaActual) {
        Alert.alert("Error", "Por favor selecciona una placa primero");
        return;
      }

      if (!user?.id) {
        Alert.alert("Error", "Usuario no identificado");
        return;
      }

      const gasto = gastosData.find((g) => g.id === id);
      if (!gasto) {
        console.error("Gasto no encontrado");
        return;
      }

      setLoading(true);
      try {
        const resultado = await agregarGasto({
          placa: placaActual,
          conductor_id: user.id,
          tipo_gasto: gasto.name,
          descripcion: gasto.name,
          monto: parseFloat(value),
          fecha: selectedDate,
          estado: "pendiente",
        });

        if (resultado.success) {
          // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
          // Realtime actualiza automáticamente
          Keyboard.dismiss();
          Alert.alert("Éxito", "Gasto agregado correctamente");
        } else {
          Alert.alert(
            "Error",
            resultado.error || "No se pudo agregar el gasto"
          );
        }
      } catch (err) {
        console.error("Error al agregar gasto:", err);
        Alert.alert("Error", "Error al agregar el gasto");
      } finally {
        setLoading(false);
      }
    },
    [agregarGasto, placaActual, selectedDate, user?.id]
  );

  const handleEditGasto = (id: string | number) => {
    const gasto = gastos.find((g) => g.id === String(id));
    if (gasto) {
      setEditValue(String(gasto.monto));
      setEditId(String(id));
      setEditDate(gasto.fecha);
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
      const resultado = await actualizarGasto(editId, {
        monto: parseFloat(editValue),
        fecha: editDate,
      });

      if (resultado.success) {
        // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
        // Realtime actualiza automáticamente
        setModalVisible(false);
        setEditId(null);
        setEditValue("");
        Alert.alert("Éxito", "Gasto actualizado correctamente");
      } else {
        Alert.alert(
          "Error",
          resultado.error || "No se pudo actualizar el gasto"
        );
      }
    } catch (err) {
      console.error("Error al actualizar gasto:", err);
      Alert.alert("Error", "Error al actualizar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGasto = async (id: string | number) => {
    Alert.alert(
      "Eliminar",
      "¿Estás seguro de que deseas eliminar este gasto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: async () => {
            setLoading(true);
            try {
              const resultado = await eliminarGasto(String(id));
              if (resultado.success) {
                // ✅ OPTIMIZACIÓN 3: Sin recargas manuales
                // Realtime actualiza automáticamente
                Alert.alert("Éxito", "Gasto eliminado correctamente");
              } else {
                Alert.alert(
                  "Error",
                  resultado.error || "No se pudo eliminar el gasto"
                );
              }
            } catch (err) {
              console.error("Error al eliminar gasto:", err);
              Alert.alert("Error", "Error al eliminar el gasto");
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
  const gastosFiltrados = gastos
    .filter((g) => g.placa === placaActual)
    .filter((g) => g.fecha === selectedDate)
    .map((g) => ({
      id: g.id,
      name: g.tipo_gasto || g.descripcion,
      value: g.monto,
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
          title="Gastos"
          data={gastos.filter((g) => g.placa === placaActual)}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          placa={placaActual}
        />

        <View style={styles.combinedContainer}>
          <Text style={styles.titlePicker}>Seleccione un gasto:</Text>
          <PickerItem
            data={gastosData}
            pickerLabelKey="name"
            pickerValueKey="id"
            onSelect={setSelectedGasto}
            pickerStyle={styles.picker}
            renderSelectedItem={(item) => (
              <GastoItem item={item} onSend={handleAddGasto} />
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
                backgroundColor: "#c64c4c",
                borderRadius: 10,
                padding: 20,
                width: "80%",
                alignItems: "center",
              }}>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
                Editar valor del gasto
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
          itemsFiltrados={gastosFiltrados}
          handleEdit={handleEditGasto}
          handleDelete={handleDeleteGasto}
          totalLabel="Total"
          title="Resumen"
          modalLabel="Editar valor del gasto"
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
