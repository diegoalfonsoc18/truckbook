import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { gastosData } from "../../data/data";
import HeaderCalendar from "../../components/Gastos/HeaderCalendar";
import GastoItem from "../../components/Gastos/GastoItem";
import { styles } from "./GastosStyles";
import { CategorySelector } from "../../components/CategorySelector"; // ← NUEVO
import IngresGast from "../../components/Ingresos/ResumenIngreGast";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";
import { ModalGastIngre } from "../../components/Modales/ModalGastIngre";

export default function Gastos() {
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const { agregarGasto, actualizarGasto, eliminarGasto } =
    useGastosConductor(placaActual);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedGasto, setSelectedGasto] = useState<string>(gastosData[0].id);

  // Modal para agregar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(selectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal label para saber si es agregar o editar
  const isEditing = editId !== null;

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
      if (!gasto) return;

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
          Keyboard.dismiss();
          Alert.alert("Éxito", "Gasto agregado correctamente");
        } else {
          Alert.alert(
            "Error",
            resultado.error || "No se pudo agregar el gasto"
          );
        }
      } catch (err) {
        Alert.alert("Error", "Error al agregar el gasto");
      } finally {
        setLoading(false);
      }
    },
    [agregarGasto, placaActual, selectedDate, user?.id]
  );

  const handleEditClick = (id: string | number) => {
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
        closeModal();
        Alert.alert("Éxito", "Gasto actualizado correctamente");
      } else {
        Alert.alert(
          "Error",
          resultado.error || "No se pudo actualizar el gasto"
        );
      }
    } catch (err) {
      Alert.alert("Error", "Error al actualizar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string | number) => {
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
                Alert.alert("Éxito", "Gasto eliminado correctamente");
              } else {
                Alert.alert(
                  "Error",
                  resultado.error || "No se pudo eliminar el gasto"
                );
              }
            } catch (err) {
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

  const closeModal = () => {
    setModalVisible(false);
    setEditId(null);
    setEditValue("");
    setEditDate(selectedDate);
    setShowDatePicker(false);
  };

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
          title="Gastos"
          data={gastos.filter((g) => g.placa === placaActual)}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          placa={placaActual}
        />

        {/* Agregar Gasto */}
        <View style={styles.combinedContainer}>
          <CategorySelector
            options={gastosData}
            value={selectedGasto}
            onSelect={(id) => {
              setSelectedGasto(id);
              setEditValue(""); // Limpiar valor anterior
              setEditId(null); // No es edición, es nuevo gasto
              setEditDate(selectedDate);
              setModalVisible(true); // Abrir modal
            }}
            title="Selecciona un gasto:"
          />
        </View>

        {/* Modal para ingresar/editar gasto */}
        <ModalGastIngre
          visible={modalVisible}
          onClose={closeModal}
          isEditing={isEditing}
          editValue={editValue}
          setEditValue={setEditValue}
          editDate={editDate}
          setEditDate={setEditDate}
          loading={loading}
          selectedItem={
            selectedGasto
              ? gastosData.find((g) => g.id === selectedGasto) || null
              : null
          }
          onSave={() => {
            if (isEditing) {
              handleSaveEdit();
            } else {
              handleAddGasto(selectedGasto, editValue);
              closeModal();
            }
          }}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          type="gasto"
        />
        {/* Resumen */}
        <IngresGast
          selectedDate={selectedDate}
          itemsFiltrados={gastosFiltrados}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          totalLabel="Total Gastos"
          title="Resumen"
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
