import React from "react";
import { useNavigation } from "@react-navigation/native";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

// Replace this with your actual param list type
type RootStackParamList = {
  InsertarCamiones: undefined;
  // add other routes here if needed
};

export default function Account() {
  const navigation =
    useNavigation<
      import("@react-navigation/native-stack").NativeStackNavigationProp<RootStackParamList>
    >();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => navigation.navigate("InsertarCamiones")}>
        <Text style={styles.devButtonText}>
          Cargar camiones a Firebase (solo dev)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  devButton: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  devButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
