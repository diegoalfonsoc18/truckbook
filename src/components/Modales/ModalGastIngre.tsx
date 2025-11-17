// components/ModalGastIngre.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { styles } from "../Modales/ModalsStyles";

interface ModalGastIngreProps {
  visible: boolean;
  onClose: () => void;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  editDate: string;
  setEditDate: (date: string) => void;
  loading: boolean;
  selectedItem: { id: string; name: string; color?: string; icon?: any } | null;
  onSave: () => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  type?: "gasto" | "ingreso"; // Para diferenciar si es gasto o ingreso
}

export function ModalGastIngre({
  visible,
  onClose,
  isEditing,
  editValue,
  setEditValue,
  editDate,
  setEditDate,
  loading,
  selectedItem,
  onSave,
  showDatePicker,
  setShowDatePicker,
  type = "gasto",
}: ModalGastIngreProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <ScrollView
              scrollEnabled={true}
              contentContainerStyle={styles.scrollViewContainer}
              keyboardShouldPersistTaps="handled">
              <View style={styles.modalContent}>
                {/* Título */}
                <Text style={styles.modalTitle}>
                  {isEditing
                    ? `Editar ${type === "gasto" ? "Gasto" : "Ingreso"}`
                    : `Ingresar ${type === "gasto" ? "Gasto" : "Ingreso"}`}
                </Text>

                {/* Categoría seleccionada */}
                {!isEditing && selectedItem && (
                  <Text style={styles.modalCategory}>{selectedItem.name}</Text>
                )}

                {/* Icono de la categoría (solo para nuevo gasto/ingreso) */}
                {!isEditing &&
                  selectedItem &&
                  selectedItem.icon &&
                  (() => {
                    const Icon = selectedItem.icon;
                    return (
                      <View
                        style={[
                          styles.modalIconContainer,
                          { backgroundColor: selectedItem.color || "#3B82F6" },
                        ]}>
                        <Icon width={40} height={40} color="#FFFFFF" />
                      </View>
                    );
                  })()}

                {/* Input de monto */}
                <View style={styles.modalInputContainer}>
                  <Text style={styles.inputLabel}>Monto (COP)</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#D1D5DB"
                      editable={!loading}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* Resumen */}
                {editValue && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Total a registrar</Text>
                    <Text style={styles.summaryAmount}>
                      ${parseFloat(editValue).toLocaleString("es-CO")}
                    </Text>
                  </View>
                )}

                {/* Selector de fecha (solo para edición) */}
                {isEditing && (
                  <View style={styles.modalDateContainer}>
                    <Text style={styles.inputLabel}>Fecha</Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      disabled={loading}
                      style={styles.dateButton}>
                      <Text style={styles.dateText}>{editDate}</Text>
                      <Text style={styles.dateIcon}>📅</Text>
                    </Pressable>
                  </View>
                )}

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

                {/* Loading */}
                {loading && (
                  <ActivityIndicator
                    size="large"
                    color="#c64c4c"
                    style={styles.loadingContainer}
                  />
                )}

                {/* Botones */}
                <View style={styles.buttonRow}>
                  <Pressable
                    onPress={onClose}
                    disabled={loading}
                    style={[
                      styles.cancelButton,
                      loading && styles.cancelButtonDisabled,
                    ]}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (!editValue) {
                        Alert.alert("Error", "Por favor ingresa un monto");
                        return;
                      }
                      onSave();
                    }}
                    disabled={loading || !editValue}
                    style={[
                      styles.saveButton,
                      (loading || !editValue) && styles.saveButtonDisabled,
                    ]}>
                    <Text style={styles.saveButtonText}>
                      {isEditing ? "Actualizar" : "Guardar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
