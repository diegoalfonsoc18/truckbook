import React from "react";
import { Text, Image, View, TouchableOpacity, ScrollView } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { styles } from "./HomeStyles";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.containerHeader}>
        <Image
          source={require("../../assets/icons/camionIcon.png")}
          style={styles.iconHome}
        />
        <Text>Agrega tu camión</Text>
        <FontAwesome name="drivers-license" size={24} color="black" />
      </View>
      <View style={styles.containerScroll}>
        <ScrollView
          style={{ width: "100%", flex: 1 }}
          contentContainerStyle={{
            justifyContent: "center", // Centra verticalmente si hay espacio
            alignItems: "center",
            paddingBottom: 10,
          }}
          showsVerticalScrollIndicator={false}>
          <View style={styles.containerAlert}>
            <Text>Avisos</Text>
          </View>
          <View style={styles.itemsContainer}>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Multas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Pago SOAT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Licencia conducción</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Técnico Mecánica</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Mantenimiento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemBox}>
              <Text>Seguro todo riesgo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
