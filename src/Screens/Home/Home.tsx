import React from "react";
import { SafeAreaView, Text, Image, View } from "react-native";
import { styles } from "./HomeStyles"; // Asegúrate de que la ruta sea correcta
import FontAwesome from "@expo/vector-icons/FontAwesome";
export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.containerHeader}>
        <Image
          source={require("../../assets/icons/camionIcon.png")}
          style={styles.iconHome}
        />
        <Text>Agrega tu camión</Text>
        <FontAwesome name="drivers-license" size={24} color="black" />
      </View>
      <View style={styles.containerAlert}>
        <Text>Alertas</Text>
      </View>
    </SafeAreaView>
  );
}
