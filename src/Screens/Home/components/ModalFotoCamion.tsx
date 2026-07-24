// src/Screens/Home/components/ModalFotoCamion.tsx
// Captura de la foto del camión del usuario.
//
// Antes de abrir la cámara se muestra el ángulo que se busca, usando la foto
// del catálogo del mismo tipo de camión como ejemplo. Guiar el encuadre en la
// captura sale mejor —y más barato— que intentar corregir el ángulo después:
// rotar un camión con un modelo generativo obliga a inventar los lados que la
// foto no vio, empezando por la placa.
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../../constants/Themecontext";
import type { TipoCamion } from "../../../store/VehiculoStore";
import { VEHICLE_PHOTOS } from "../vehicleConstants";
import { subirFotoCamion, FOTO_ANCHO, FOTO_ALTO } from "../../../services/fotoVehiculoService";

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  placa: string;
  tipoCamion: TipoCamion | null;
  /** Se llama con el path guardado cuando la subida sale bien. */
  onGuardada: (path: string) => void;
  /**
   * Renderizar como capa absoluta en vez de <Modal>. Necesario cuando ya se
   * está dentro de otro modal: iOS no monta un Modal encima de otro.
   */
  comoOverlay?: boolean;
}

export default function ModalFotoCamion({
  visible,
  onClose,
  userId,
  placa,
  tipoCamion,
  onGuardada,
  comoOverlay = false,
}: Props) {
  const { colors: c } = useTheme();
  const [subiendo, setSubiendo] = useState(false);

  const ejemplo = tipoCamion ? VEHICLE_PHOTOS[tipoCamion] : undefined;

  const procesar = async (uri: string) => {
    setSubiendo(true);
    const res = await subirFotoCamion(userId, placa, uri);
    setSubiendo(false);

    if (res.error) {
      Alert.alert("No se pudo guardar", res.error);
      return;
    }
    if (res.sinRecorte) {
      // Pasa en simulador de iOS y si el recortador no encuentra el sujeto.
      Alert.alert(
        "Foto guardada, pero con fondo",
        "No se pudo separar el camión del fondo. Se ve mejor con luz de día y el camión completo dentro del encuadre.",
      );
    }
    if (res.path) onGuardada(res.path);
    onClose();
  };

  const desdeCamara = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        "Sin permiso de cámara",
        "Actívalo en los ajustes del teléfono para tomar la foto.",
      );
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [5, 3], // mismas proporciones que 1000x600
      quality: 1,
    });
    if (!r.canceled && r.assets?.[0]?.uri) procesar(r.assets[0].uri);
  };

  const desdeGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [5, 3],
      quality: 1,
    });
    if (!r.canceled && r.assets?.[0]?.uri) procesar(r.assets[0].uri);
  };

  const contenido = (
    <View style={[st.overlay, { backgroundColor: c.overlay }]}>
        <View style={[st.hoja, { backgroundColor: c.modalBg }]}>
          <View style={st.handleWrap}>
            <View style={[st.handle, { backgroundColor: c.border }]} />
          </View>

          <View style={st.header}>
            <Text style={[st.titulo, { color: c.text }]}>Foto de tu camión</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </Pressable>
          </View>

          {subiendo ? (
            <View style={st.cargando}>
              <ActivityIndicator size="large" color={c.accent} />
              <Text style={[st.cargandoTexto, { color: c.textSecondary }]}>
                Quitando el fondo…
              </Text>
              <Text style={[st.cargandoNota, { color: c.textMuted }]}>
                Se hace en tu teléfono; la foto no se manda a ningún servicio.
              </Text>
            </View>
          ) : (
            <>
              {/* Ejemplo del ángulo buscado */}
              {ejemplo && (
                <View style={[st.ejemploCaja, { backgroundColor: c.surface }]}>
                  <Image
                    source={ejemplo}
                    style={st.ejemploImg}
                    resizeMode="contain"
                  />
                  <View style={[st.ejemploBadge, { backgroundColor: c.accent }]}>
                    <Text style={[st.ejemploBadgeTexto, { color: c.accentText }]}>
                      Así se ve mejor
                    </Text>
                  </View>
                </View>
              )}

              <Text style={[st.ayuda, { color: c.textSecondary }]}>
                Toma la foto <Text style={{ fontWeight: "700" }}>de lado y un
                poco de frente</Text>, con el camión completo y luz de día. El
                fondo se quita solo.
              </Text>

              <View style={st.botones}>
                <Pressable
                  onPress={desdeCamara}
                  style={[st.btn, { backgroundColor: c.accent }]}>
                  <Ionicons name="camera-outline" size={18} color={c.accentText} />
                  <Text style={[st.btnTexto, { color: c.accentText }]}>
                    Tomar foto
                  </Text>
                </Pressable>
                <Pressable
                  onPress={desdeGaleria}
                  style={[
                    st.btn,
                    { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.border },
                  ]}>
                  <Ionicons name="images-outline" size={18} color={c.text} />
                  <Text style={[st.btnTexto, { color: c.text }]}>Galería</Text>
                </Pressable>
              </View>

              <Text style={[st.privacidad, { color: c.textMuted }]}>
                La foto queda guardada solo en tu cuenta.
              </Text>
            </>
          )}
        </View>
      </View>
  );

  if (!visible) return null;

  if (comoOverlay) {
    return <View style={StyleSheet.absoluteFill}>{contenido}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      {contenido}
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  hoja: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
  },
  titulo: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },

  ejemploCaja: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  ejemploImg: { width: "80%", aspectRatio: FOTO_ANCHO / FOTO_ALTO },
  ejemploBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ejemploBadgeTexto: { fontSize: 10.5, fontWeight: "700" },

  ayuda: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  botones: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    paddingVertical: 13,
  },
  btnTexto: { fontSize: 14.5, fontWeight: "700" },
  privacidad: { fontSize: 11.5, textAlign: "center", marginTop: 12 },

  cargando: { alignItems: "center", paddingVertical: 44 },
  cargandoTexto: { fontSize: 14, fontWeight: "600", marginTop: 14 },
  cargandoNota: {
    fontSize: 11.5,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 16,
  },
});
