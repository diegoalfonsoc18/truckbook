import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { gastosData } from "../data/data";
import GastoItem from "../components/GastoItem";
import { COLORS } from "../constants/colors";
import CustomCalendar from "../components/CustomCalendar";
import { Picker } from "@react-native-picker/picker";

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

  const handleEditGasto = (id: string) => {
    const gasto = gastosIngresados.find((g) => g.id === id);
    if (gasto) {
      const newValue = prompt("Editar valor del gasto:", gasto.value); // Puedes usar un modal en lugar de prompt
      if (newValue) {
        setGastosIngresados((prevGastos) =>
          prevGastos.map((g) => (g.id === id ? { ...g, value: newValue } : g))
        );
      }
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

        {/* Mostrar el gasto seleccionado */}
        <View style={styles.selectedListContainer}>
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
                <Text style={styles.resumenValue}>${item.value}</Text>
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
                      color={COLORS.accent} // Replace with an existing valid color property
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
            Total: $
            {gastosIngresados
              .reduce((sum, gasto) => sum + parseFloat(gasto.value), 0)
              .toFixed(2)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Fondo principal de la pantalla
    alignItems: "center",
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    padding: 20,
    color: COLORS.primary, // Fondo del encabezado
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.primary, // Color del texto del título
  },
  dateContainer: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor de la fecha
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto de la fecha
    textAlign: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.surface, // Fondo del contenedor del ícono
    borderRadius: 5,
  },
  calendarOverlay: {
    position: "absolute", // Superpone el calendario sobre el resto de los componentes
    top: 0, // Posición desde la parte superior
    left: 0, // Posición desde la parte izquierda
    right: 0, // Posición desde la parte derecha
    bottom: 0, // Posición desde la parte inferior
    justifyContent: "center", // Centra el calendario verticalmente
    alignItems: "center", // Centra el calendario horizontalmente
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo semitransparente para resaltar el calendario
    zIndex: 100, // Asegura que el calendario esté por encima de otros componentes
  },
  calendarContainer: {
    width: "80%", // Ocupa el 80% del ancho del contenedor padre
    backgroundColor: COLORS.surface, // Fondo del calendario
    borderRadius: 10, // Bordes redondeados
    overflow: "hidden", // Asegura que el contenido no se desborde
  },
  resumenContainer: {
    width: "90%",
    height: 200,
    backgroundColor: COLORS.surface, // Fondo del contenedor del resumen
    borderRadius: 10,
    padding: 20,
    //marginVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  resumenTitle: {
    width: "100%",
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text, // Color del título del resumen
    //marginVertical: 10, // Solo margen vertical
    textAlign: "left", // Alinea el texto a la izquierda
    alignSelf: "flex-start",
  },
  listContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    width: "100%",
    height: "60%",
    //backgroundColor: "#00cc29", // Fondo del contenedor del FlatList
    justifyContent: "center",
    alignItems: "center",
  },
  combinedContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    width: "90%", // Asegura que el contenedor combinado ocupe el 90% del ancho
    backgroundColor: COLORS.surface, // Fondo del contenedor combinado
    borderRadius: 10, // Bordes redondeados
    // padding: 10, // Espaciado interno
    //marginVertical: 10, // Espaciado vertical externo
    //justifyContent: "space-between", // Distribuye los elementos verticalmente
    alignItems: "center", // Centra los elementos horizontalmente
  },
  pickerContainer: {
    flex: 1, // Permite que el contenedor ocupe el espacio restante
    flexDirection: "column",
    width: "100%",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: COLORS.surface, // Fondo del picker
    padding: 10,
    borderRadius: 10,
    marginBottom: 10, // Aumenta el espacio entre el picker y otros elementos
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto del picker label
    marginBottom: 10,
  },
  picker: {
    color: COLORS.text, // Color del texto del picker
    //backgroundColor: "#cc0000", // Fondo del picker
  },
  resumenItem: {
    // Permite que el elemento ocupe el espacio restante
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder, // Color del borde inferior
    //backgroundColor: "#cc0", // Fondo del resumen de cada gasto
  },
  resumenValue: {
    fontWeight: "bold",
    color: COLORS.text, // Color del valor del resumen
    textAlign: "right",
  },
  resumenText: {
    fontSize: 16,
    color: COLORS.text, // Color del texto del resumen
    textAlign: "left",
  },
  totalContainer: {
    marginTop: 10, // Espaciado superior
    alignItems: "flex-end", // Alinea el texto a la derecha
    width: "100%", // Asegura que ocupe todo el ancho del contenedor
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text, // Color del texto del total
  },
  actionButtons: {
    flexDirection: "row", // Alinea los botones en fila
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 10, // Espaciado entre el texto y los botones
  },

  selectedListContainer: {
    flex: 1, // Permite que la lista ocupe el espacio restante
    width: "100%", // Ocupa todo el ancho del contenedor combinado
    borderRadius: 10,
    backgroundColor: COLORS.primary, // Fondo del contenedor del FlatList seleccionado
    justifyContent: "flex-end", // Alinea los elementos al inicio
    alignItems: "center",
  },
  flatList: {
    flex: 1, // Permite que el FlatList ocupe el espacio restante
    width: "100%",
  },
});
