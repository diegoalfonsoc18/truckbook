// src/Screens/Home/widgets/WidgetInsightIA.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import { programarRecordatorioIACobros } from "../../../services/pendientesNotificacionService";
import { fmtI, diasDesde, labelDias, WProps } from "../homeUtils";
import { ModalPendientes } from "../components/ModalPendientes";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import { useClientType } from "../../../hooks/useClientType";

const { width } = Dimensions.get("window");
const H_PAD = 20;
const WIDGET_SIZE = Math.floor((width - H_PAD * 2 - 16) / 2);
const WIDGET_HEIGHT = 180;

export default function WidgetInsightIA({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const [modalVisible, setModalVisible] = useState(false);

  const pendientes = React.useMemo(
    () =>
      ingresos
        .filter((i) => i.estado === "pendiente")
        .sort((a, b) => ((a.fecha ?? "") > (b.fecha ?? "") ? 1 : -1)),
    [ingresos],
  );

  // Recordatorio IA: se reprograma cada vez que cambia la lista de pendientes
  useEffect(() => {
    programarRecordatorioIACobros(pendientes).catch(() => {});
  }, [pendientes.length]);

  const totalPend = pendientes.reduce((a, i) => a + (i.monto ?? 0), 0);
  const mostrados = pendientes.slice(0, 3);
  const resto = pendientes.length - 3;

  const clientNames = useMemo(
    () =>
      mostrados.map((item) =>
        (item.descripcion ?? item.tipo_ingreso ?? "Flete")
          .split(" · ")[0]
          .trim(),
      ),
    [mostrados],
  );
  const clientTypes = useClientType(clientNames);

  // Días del pendiente más viejo (para la barra de urgencia)
  const diasMax =
    pendientes.length > 0 && pendientes[0].fecha
      ? diasDesde(pendientes[0].fecha)
      : 0;
  // Normalizar: 0 días = 0%, 30+ días = 100%
  const urgencia = Math.min(diasMax / 30, 1);
  const urgenciaColor = urgencia < 0.5 ? "#7e1d1a" : "#EF4444";

  const { colors: c } = useTheme();
  const shadow = getShadow(isDark, "md");
  const wText = isDark ? "#FFFFFF" : "#691714";
  const wMuted = isDark ? "rgba(255,255,255,0.55)" : "#8B5E3C";
  const wSubtle = isDark ? "rgba(255,255,255,0.15)" : "rgba(139,94,60,0.12)";
  const lightShadow =
    Platform.OS === "android"
      ? { borderWidth: 1, borderColor: c.border, ...shadow }
      : shadow;
  const cardBorder = isDark
    ? { borderWidth: 1, borderColor: c.border }
    : lightShadow;

  return (
    <>
      <View
        style={{
          width: WIDGET_SIZE,
          height: WIDGET_HEIGHT,
          borderRadius: 28,
          ...cardBorder,
        }}>
        <LinearGradient
          colors={isDark ? [c.cardBg, c.cardBg] : ["#FFF7F4", "#FFEDE8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: 28 }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => pendientes.length > 0 && setModalVisible(true)}
            style={{
              flex: 1,
              borderRadius: 28,
              paddingHorizontal: 13,
              paddingVertical: 10,
              overflow: "hidden",
              justifyContent: "space-between",
            }}>
            {/* Header con badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: wText,
                  letterSpacing: 0.5,
                }}>
                Por cobrar
              </Text>
            </View>

            {/* Total */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {pendientes.length > 0 && (
                <Feather name="alert-circle" size={26} color={c.text} />
              )}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: pendientes.length > 0 ? urgenciaColor : wText,
                  letterSpacing: -0.8,
                  lineHeight: 26,
                }}>
                {pendientes.length > 0 ? fmtI(totalPend) : "Al día ✓"}
              </Text>
            </View>

            {/* Lista mini o vacío */}
            {pendientes.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ fontSize: 22, marginBottom: 2 }}>🎉</Text>
                <Text
                  style={{ fontSize: 10, color: wMuted, textAlign: "center" }}>
                  Sin pendientes
                </Text>
              </View>
            ) : (
              <View style={{ gap: 1 }}>
                {mostrados.map((item, i) => {
                  const cliente = (
                    item.descripcion ??
                    item.tipo_ingreso ??
                    "Flete"
                  )
                    .split(" · ")[0]
                    .trim();
                  const dias = item.fecha ? diasDesde(item.fecha) : 0;
                  const itemColor =
                    dias >= 15 ? "#EF4444" : dias >= 7 ? "#F59E0B" : "#2EC98D";
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 3,
                        gap: 6,
                      }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: itemColor + "15",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                        <Feather
                          name={
                            clientTypes[cliente] === "empresa"
                              ? "briefcase"
                              : "user"
                          }
                          size={18}
                          color={itemColor}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontSize: 10,
                          fontWeight: "500",
                          color: c.text,
                        }}>
                        {cliente}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: c.text,
                        }}>
                        {fmtI(item.monto ?? 0)}
                      </Text>
                    </View>
                  );
                })}
                {resto > 0 && (
                  <Text
                    style={{
                      fontSize: 8.5,
                      color: wMuted,
                      textAlign: "center",
                      fontWeight: "600",
                      marginTop: 2,
                    }}>
                    +{resto} más
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Modal detalle */}
      <ModalPendientes
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        pendientes={pendientes}
        isDark={isDark}
      />
    </>
  );
}
