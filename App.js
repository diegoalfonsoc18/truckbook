// filepath: App.js
import React from "react";
import { StyleSheet, View } from "react-native";
import "react-native-gesture-handler";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import Navigation from "./src/navigation/Navigation";

// 🎨 Personaliza el tema oscuro
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#393E46", // fondo de toda la app
    card: "#222831", // color del header/tab bar
    text: "#EEEEEE", // color del texto
    primary: "#00ADB5", // color para botones activos o links
    border: "#393E46", // borde entre pantallas/tab bar
    notification: "#00ADB5", // color de notificaciones (si usás)
  },
};

export default function App() {
  return (
    <View style={styles.globalContainer}>
      <StatusBar style="light" backgroundColor="#393E46" />
      <NavigationContainer theme={CustomDarkTheme}>
        <Navigation />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  globalContainer: {
    flex: 1,
    backgroundColor: "#393E46",
  },
});
