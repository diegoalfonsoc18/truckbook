import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useTheme } from "../../constants/Themecontext";
import { useContentLayout } from "../../constants/layout";

import WidgetClientes from "./widgets/WidgetClientes";
import ModalVehiculos from "./components/ModalVehiculos";
import VehicleCard from "./components/VehicleCard";
import ResumenSemanal from "./components/ResumenSemanal";
import ActividadReciente from "./components/ActividadReciente";
import EmptyState from "../../components/EmptyState";
import BannerCombustible from "./components/BannerCombustible";
import { infoTipo, normalizarTipo } from "./vehicleConstants";

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
  const { placa: placaActual, tipoCamion } = useVehiculoStore();
  const tipoLabel = tipoCamion ? infoTipo(normalizarTipo(tipoCamion))?.label : "";
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
    <View style={[s.container, { backgroundColor: FONDO_BLANCO }]}>
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
            {/* VEHÍCULO ACTIVO — protagonista */}
            {showCamionHeader && (
              <Reanimated.View entering={FadeInDown.duration(480)}>
                <VehicleCard
                  vehicleCardTitle={vehicleCardTitle}
                  onPress={() => setModalVehiculosVisible(true)}
                />
              </Reanimated.View>
            )}

            {/* BALANCE (tarjeta negra) + RESUMEN */}
            {placaActual && (
              <Reanimated.View entering={FadeInDown.delay(90).duration(480)}>
                <ResumenSemanal isDark={isDark} />
              </Reanimated.View>
            )}

            {placaActual && (
              <Reanimated.View entering={FadeInDown.delay(140).duration(480)}>
                {/* COMBUSTIBLE */}
                <BannerCombustible />

                {/* MOVIMIENTOS RECIENTES */}
                <ActividadReciente isDark={isDark} />
              </Reanimated.View>
            )}

            {!placaActual ? (
              /* ONBOARDING — sin vehículo */
              <EmptyState
                icon="truck"
                title="Vincula tu vehículo"
                subtitle="Para registrar gastos, ingresos y ver tu actividad, primero selecciona un vehículo."
                actionLabel="Seleccionar vehículo"
                onAction={() => setModalVehiculosVisible(true)}
              />
            ) : (
              /* CLIENTES FRECUENTES */
              <Reanimated.View entering={FadeInDown.delay(180).duration(480)}>
                <WidgetClientes isDark={isDark} />
              </Reanimated.View>
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

const FONDO_BLANCO = "#FFFFFF";

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
    borderCurve: "continuous",
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  onboardingBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 99,
    borderCurve: "continuous",
  },
});
