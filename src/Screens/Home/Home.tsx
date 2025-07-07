import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
// Ajusta la ruta según la ubicación real de tu archivo firebaseConfig.ts
import { db } from "../../config/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function BuscarCamion() {
  const [marcas, setMarcas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<string[]>([]);

  useEffect(() => {
    const cargarMarcas = async () => {
      const querySnapshot = await getDocs(collection(db, "camiones"));
      const data = querySnapshot.docs.map((doc) => doc.data().marca);
      setMarcas(data);
    };

    cargarMarcas();
  }, []);

  useEffect(() => {
    const filtradas = marcas.filter((marca) =>
      marca.toLowerCase().includes(busqueda.toLowerCase())
    );
    setSugerencias(filtradas);
  }, [busqueda]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Marca del camión"
        value={busqueda}
        onChangeText={setBusqueda}
        style={styles.input}
      />
      {busqueda.length > 0 && (
        <FlatList
          data={sugerencias}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setBusqueda(item)}>
              <Text style={styles.sugerencia}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => item + index}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  sugerencia: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    marginVertical: 2,
    borderRadius: 5,
  },
});
