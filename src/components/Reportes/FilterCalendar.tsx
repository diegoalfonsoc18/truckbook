import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "../../constants/colors";
import { styles } from "./stylesFilCalendar";

type FilterCalendarProps = {
  onChangeRango: (rango: { inicio: string; fin: string }) => void;
};

function getFirstDayOfMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}
function getLastDayOfMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(
    2,
    "0"
  )}`;
}

export default function FilterCalendar({ onChangeRango }: FilterCalendarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);

  // Estados internos para las fechas
  const [fechaInicio, setFechaInicio] = useState(getFirstDayOfMonth());
  const [fechaFin, setFechaFin] = useState(getLastDayOfMonth());

  // Actualiza el padre cuando cambian las fechas
  useEffect(() => {
    onChangeRango({ inicio: fechaInicio, fin: fechaFin });
  }, [fechaInicio, fechaFin]);

  const periodoLabel = `${fechaInicio} - ${fechaFin}`;

  const onChangeInicio = (_: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFechaInicio(getFirstDayOfMonth(selectedDate));
    }
    setShowInicio(false);
  };

  const onChangeFin = (_: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFechaFin(getLastDayOfMonth(selectedDate));
    }
    setShowFin(false);
  };

  return (
    <>
      <View style={styles.headerContainer}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.black} />
        <Text style={styles.headerTitle}>Reportes</Text>
        <MaterialIcons
          name="notifications-active"
          size={24}
          color={COLORS.black}
        />
      </View>
      <View style={styles.container}>
        <View style={styles.containerFilter}>
          <Text style={styles.titleCalendar}>Periodo</Text>
          <TouchableOpacity
            style={styles.dateSelect}
            onPress={() => setModalVisible(true)}>
            <Text style={{ marginLeft: 8, fontSize: 16 }}>{periodoLabel}</Text>
            <MaterialIcons
              name="calendar-today"
              size={24}
              color={COLORS.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Modal para seleccionar meses */}
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
              backgroundColor: "rgba(0,0,0,0.3)",
            }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 10,
                padding: 20,
                width: "90%",
                alignItems: "center",
              }}>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}>
                Selecciona el periodo
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text>Desde</Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: "#ccc",
                      borderRadius: 5,
                      padding: 10,
                      marginVertical: 8,
                      minWidth: 100,
                      alignItems: "center",
                    }}
                    onPress={() => setShowInicio(true)}>
                    <Text>{fechaInicio || "Fecha inicial"}</Text>
                  </TouchableOpacity>
                  {showInicio && (
                    <DateTimePicker
                      value={fechaInicio ? new Date(fechaInicio) : new Date()}
                      mode="date"
                      display="default"
                      onChange={onChangeInicio}
                    />
                  )}
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text>Hasta</Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: "#ccc",
                      borderRadius: 5,
                      padding: 10,
                      marginVertical: 8,
                      minWidth: 100,
                      alignItems: "center",
                    }}
                    onPress={() => setShowFin(true)}>
                    <Text>{fechaFin || "Fecha final"}</Text>
                  </TouchableOpacity>
                  {showFin && (
                    <DateTimePicker
                      value={fechaFin ? new Date(fechaFin) : new Date()}
                      mode="date"
                      display="default"
                      onChange={onChangeFin}
                    />
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={{
                  marginTop: 20,
                  backgroundColor: COLORS.secondary,
                  padding: 10,
                  borderRadius: 5,
                  width: "60%",
                  alignItems: "center",
                }}
                onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Aplicar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
