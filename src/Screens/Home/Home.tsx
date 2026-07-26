import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useTheme } from "../../constants/Themecontext";
import { useContentLayout } from "../../constants/layout";

import WidgetClientes from "./widgets/WidgetClientes";
import ModalVehiculos from "./components/ModalVehiculos";
import VehicleCard from "./components/VehicleCard";
import ResumenSemanal from "./components/ResumenSemanal";
import ActividadReciente from "./components/ActividadReciente";

import type { Item } from "./Items";
export type { Item } from "./Items";

interface HomeBaseAdaptedProps {
  items: Item[];
  showCamionHeader?: boolean;
  vehicleCardTitle?: string;
  renderBadge?: (item: Item) => React.ReactNode;
  onItemPress?: (item: Item) => void;
}

export default function HomeBaseAdapted({
  items,
  showCamionHeader = true,
  vehicleCardTitle,
  renderBadge,
  onItemPress,
}: HomeBaseAdaptedProps) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { hPad, maxWidth } = useContentLayout();
  const { placa: placaActual } = useVehiculoStore();
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.gridContainer,
              {
                paddingBottom: insets.bottom + 100,
                // Todo el margen vive AQUÍ, dentro del ScrollView. Cuando el
                // padding estaba en el contenedor de afuera, las tarjetas
                // tocaban el borde del scroll y la sombra se recortaba: iOS lo
                // tapaba con un margen negativo y Android con un relleno extra
                // por bloque. Metiéndolo adentro, esos mismos píxeles son el
                // aire de la sombra, sin hacks ni ramas por plataforma.
                paddingHorizontal: hPad,
                // En tablet el contenido se topa y se centra en vez de
                // estirarse de borde a borde.
                maxWidth,
                width: "100%",
                alignSelf: "center",
              },
            ]}>
            {/* VEHICLE CARD */}
            {showCamionHeader && (
              <View
                style={
                  Platform.OS === "android"
                    ? { paddingVertical: 2 }
                    : undefined
                }>
                <VehicleCard
                  vehicleCardTitle={vehicleCardTitle}
                  onPress={() => setModalVehiculosVisible(true)}
                />
              </View>
            )}

            {/* RESUMEN SEMANAL — Ingresos / Gastos / Viajes / Clientes */}
            {placaActual && (
              <View>
                <ResumenSemanal isDark={isDark} />
                <ActividadReciente isDark={isDark} />
              </View>
            )}

            {!placaActual ? (
              /* ONBOARDING — sin vehículo */
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setModalVehiculosVisible(true)}
                style={[
                  s.onboardingCard,
                  {
                    backgroundColor: isDark ? `${c.accent}14` : c.cardBg,
                    borderWidth: 1.5,
                    borderColor: isDark ? `${c.accent}40` : `${c.accent}30`,
                    borderStyle: "dashed",
                  },
                ]}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🚛</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: c.text,
                    marginBottom: 6,
                    letterSpacing: -0.3,
                  }}>
                  Vincula tu vehículo
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(0,0,0,0.45)",
                    textAlign: "center",
                    lineHeight: 19,
                    paddingHorizontal: 16,
                  }}>
                  Para registrar gastos, ingresos y ver tu actividad semanal,
                  primero selecciona un vehículo.
                </Text>
                <View
                  style={[
                    s.onboardingBtn,
                    { backgroundColor: c.accent, marginTop: 18 },
                  ]}>
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    Seleccionar vehículo
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* CLIENTES FRECUENTES */
              <WidgetClientes isDark={isDark} />
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>

      {/* MODAL: LISTA DE VEHÍCULOS */}
      <ModalVehiculos
        visible={modalVehiculosVisible}
        onClose={() => setModalVehiculosVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  // Sin padding horizontal: el margen lo pone el contentContainer del
  // ScrollView, para que la sombra de las tarjetas no quede contra el borde.
  content: { flex: 1 },

  gridContainer: { paddingTop: 8, paddingBottom: 0 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
    paddingRight: 4,
  },
  sectionLabel: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: Platform.OS === "android" ? 0 : -0.4,
  },

  onboardingCard: {
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  onboardingBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 99,
  },
});
