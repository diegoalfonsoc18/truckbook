import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVehiculoStore } from "../store/VehiculoStore";
import { useAuth } from "../hooks/useAuth";
import { useGastosStore } from "../store/GastosStore";
import { useIngresosStore } from "../store/IngresosStore";
import supabase from "../config/SupaBaseConfig";
import {
  analizarFactura,
  componerDescripcion,
  TipoTransaccion,
  DatosFactura,
} from "../services/geminiService";
import logger from "../utils/logger";

export function useEscanearFactura() {
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const [procesando, setProcesando] = useState(false);

  const escanear = async (
    tipo: TipoTransaccion,
    fuente: "camara" | "galeria",
  ) => {
    if (!placaActual) {
      Alert.alert("Sin vehículo", "Selecciona un vehículo activo primero.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Sin sesión", "No se pudo identificar al usuario.");
      return;
    }

    try {
      let result: ImagePicker.ImagePickerResult;
      if (fuente === "camara") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permiso denegado",
            "Activa el acceso a la cámara en Configuración.",
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.3,
          base64: true,
        });
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permiso denegado",
            "Activa el acceso a fotos en Configuración.",
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.3,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Error", "No se pudo leer la imagen.");
        return;
      }

      setProcesando(true);
      const mime = asset.mimeType ?? "image/jpeg";
      const { data, error } = await analizarFactura(asset.base64, mime, tipo);

      if (error || !data) {
        Alert.alert("Error de IA", error ?? "No se pudieron extraer los datos.");
        return;
      }

      await guardarTransaccion(tipo, data);
    } catch (err: any) {
      logger.error("Error en flujo de escaneo:", err);
      Alert.alert("Error", err?.message ?? "Algo salió mal");
    } finally {
      setProcesando(false);
    }
  };

  const guardarTransaccion = async (
    tipo: TipoTransaccion,
    data: DatosFactura,
  ) => {
    if (!data.monto || data.monto <= 0) {
      Alert.alert(
        "Datos incompletos",
        "No se detectó un monto válido en la factura. Revisa la foto.",
      );
      return;
    }

    const hoy = new Date();
    const fechaDefault = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    const fecha = data.fecha ?? fechaDefault;
    const categoria = data.categoria ?? (tipo === "gasto" ? "Otros" : "Otro");
    const descripcion = componerDescripcion(data) || categoria;

    if (tipo === "gasto") {
      const { error } = await supabase.from("conductor_gastos").insert([
        {
          placa: placaActual,
          conductor_id: user!.id,
          tipo_gasto: categoria,
          descripcion,
          monto: data.monto,
          fecha,
          estado: "aprobado",
        },
      ]);
      if (error) {
        Alert.alert("Error guardando", error.message);
        return;
      }
      useGastosStore.getState().cargarGastosDelDB(placaActual!);
      Alert.alert(
        "✓ Gasto registrado",
        `${categoria} · $${data.monto.toLocaleString("es-CO")}\n${descripcion}`,
      );
    } else {
      const { error } = await supabase.from("conductor_ingresos").insert([
        {
          placa: placaActual,
          conductor_id: user!.id,
          tipo_ingreso: categoria,
          descripcion,
          monto: data.monto,
          fecha,
          estado: "pagado",
        },
      ]);
      if (error) {
        Alert.alert("Error guardando", error.message);
        return;
      }
      useIngresosStore.getState().cargarIngresosDelDB(placaActual!);
      Alert.alert(
        "✓ Ingreso registrado",
        `${categoria} · $${data.monto.toLocaleString("es-CO")}\n${descripcion}`,
      );
    }
  };

  return { escanear, procesando };
}
