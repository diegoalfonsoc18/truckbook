import React from "react";
import { Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import supabase from "../../config/SupaBaseConfig"; // Asegúrate de importar tu instancia
import { SafeAreaView } from "react-native-safe-area-context";
export default function Account({ navigation }: any) {
  // const { currency, setCurrency } = useCurrencyStore();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      navigation.replace("Login"); // O la pantalla de inicio de sesión de tu stack
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Selecciona tu moneda:</Text>
      {/* ...tu Picker aquí... */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#393E46",
  },
  title: {
    fontSize: 18,
    color: "#FAFF00",
    marginBottom: 20,
  },
  picker: {
    width: 200,
    color: "#EEEEEE",
    backgroundColor: "#222831",
  },
  selectedCurrency: {
    marginTop: 20,
    fontSize: 16,
    color: "#EEEEEE",
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: "#db4437",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
