// src/screens/Home/Home.tsx

import React, { useState } from "react";
import {
  Text,
  Image,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl, // ← AGREGAR
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "./HomeStyles";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { items } from "./Items";
import { CamionIcon } from "../../assets/icons/icons";
import llantas from "../../assets/img/llantas.webp";
import { useMultas } from "../../hooks/useMultas";

export default function Home() {
  const [placaActual] = useState<string | null>("eka854");

  // Estado para el pull-to-refresh
  const [refrescando, setRefrescando] = useState(false);

  const {
    tieneMultasPendientes,
    cantidadPendientes,
    cargando,
    recargar, // ← Usar la función recargar del hook
  } = useMultas(placaActual, true);

  // Función para manejar el pull-to-refresh
  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await recargar(); // Forzar recarga sin cache
    } finally {
      setRefrescando(false);
    }
  };

  const renderBadge = (item: (typeof items)[0]) => {
    if (item.id !== "multas" || !item.mostrarBadge) {
      return null;
    }

    if (cargando || refrescando) {
      return (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>...</Text>
        </View>
      );
    }

    if (tieneMultasPendientes) {
      return (
        <View style={[styles.badge, styles.badgePendiente]}>
          <Text style={styles.badgeText}>
            {cantidadPendientes} Pendiente{cantidadPendientes > 1 ? "s" : ""}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.badgeOk]}>
        <Text style={[styles.badgeText, styles.badgeTextOk]}>✓ Al día</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.containerHeader}>
        <CamionIcon />
        <Text>Agrega tu camión</Text>
        <FontAwesome name="drivers-license" size={24} color="black" />
      </View>

      <View style={styles.containerScroll}>
        <ScrollView
          style={{ width: "100%", flex: 1 }}
          contentContainerStyle={{
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 10,
          }}
          showsVerticalScrollIndicator={false}
          // ← AGREGAR PULL-TO-REFRESH
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={handleRefresh}
              tintColor="#2196F3" // Color del spinner (iOS)
              colors={["#2196F3"]} // Color del spinner (Android)
              title="Actualizando multas..." // Texto (iOS)
            />
          }>
          <View style={styles.containerAlert}>
            <Image source={llantas} style={styles.imageAlert} />
          </View>

          <View style={styles.itemsContainer}>
            {items.map((item, idx) => {
              const isComponent = typeof item.icon === "function";
              const Icon = item.icon;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemBox,
                    { backgroundColor: item.backgroundColor || "#FFFFFF" },
                  ]}
                  key={item.id || idx}
                  activeOpacity={0.7}>
                  {renderBadge(item)}

                  <View style={styles.iconContainer}>
                    {isComponent ? (
                      <Icon width={40} height={40} />
                    ) : (
                      <Image source={item.icon} style={styles.iconItemBox} />
                    )}
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={styles.textTitle}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={styles.textSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
