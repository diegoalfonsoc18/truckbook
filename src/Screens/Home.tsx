import { View, Text, SafeAreaView, StyleSheet } from "react-native";
import React from "react";

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Cual es tu camión?</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
