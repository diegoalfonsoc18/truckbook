import React from "react";
import { SafeAreaView, Text } from "react-native";
import { styles } from "./HomeStyles"; // Asegúrate de que la ruta sea correcta

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Cual es tu camión?</Text>
    </SafeAreaView>
  );
}
