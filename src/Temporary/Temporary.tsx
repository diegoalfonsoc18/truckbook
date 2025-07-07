import React from "react";
import { View, Button, Alert } from "react-native";
import { db } from "../config/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

const datosCamiones = [
  { Marca: "Chevrolet", Modelos: ["NHR", "NKR", "FRR", "FTR", "Luv D-Max"] },
  { Marca: "Ford", Modelos: ["F-150", "F-250", "F-350", "F-750", "Cargo"] },
  { Marca: "Toyota", Modelos: ["Hilux", "Tundra", "Tacoma"] },
  { Marca: "Mitsubishi", Modelos: ["Canter", "Fuso", "L200"] },
  { Marca: "Nissan", Modelos: ["Frontier", "NP300", "Cabstar"] },
  { Marca: "Hino", Modelos: ["300", "500", "700"] },
  { Marca: "International", Modelos: ["4700", "4900", "Durastar", "ProStar"] },
  { Marca: "Kenworth", Modelos: ["T270", "T370", "T680", "W900"] },
  { Marca: "Freightliner", Modelos: ["M2", "Cascadia", "Columbia", "FLD"] },
  { Marca: "Volvo", Modelos: ["FH", "FM", "VNL", "VNR"] },
  { Marca: "Mack", Modelos: ["Anthem", "Granite", "Pinnacle"] },
  {
    Marca: "Scania",
    Modelos: ["P-series", "G-series", "R-series", "S-series"],
  },
  { Marca: "Mercedes-Benz", Modelos: ["Actros", "Atego", "Axor"] },
  { Marca: "Isuzu", Modelos: ["NPR", "NQR", "FRR", "FVR", "Giga"] },
];

export default function InsertarCamiones() {
  const insertarDatos = async () => {
    try {
      for (const camion of datosCamiones) {
        const docRef = doc(db, "camiones", camion.Marca); // ✅ CORRECTO
        await setDoc(docRef, camion);
      }
      Alert.alert("Éxito", "Camiones agregados o actualizados correctamente");
    } catch (error) {
      console.error("Error agregando camiones:", error);
      Alert.alert("Error", "No se pudieron agregar los camiones");
    }
  };

  return (
    <View style={{ padding: 40 }}>
      <Button title="Agregar camiones a Firestore" onPress={insertarDatos} />
    </View>
  );
}
