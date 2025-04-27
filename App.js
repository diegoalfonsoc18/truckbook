import React from "react";
import { StyleSheet, View } from "react-native";
import "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Navigation from "./src/navigation/Navigation";
import { COLORS } from "./src/constants/colors"; // Importar los colores

// Definir un tema global para la navegación
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background, // Fondo global
    text: COLORS.text, // Color del texto global
  },
};

export default function App() {
  return (
    <View style={styles.globalContainer}>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <NavigationContainer theme={AppTheme}>
        <Navigation />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  globalContainer: {
    flex: 1,
    backgroundColor: COLORS.background, // Usar el color de fondo definido en COLORS
  },
});