// src/Screens/Home/widgets/WidgetInsightIA.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import { useIngresosStore } from "../../../store/IngresosStore";
import { programarRecordatorioIACobros } from "../../../services/pendientesNotificacionService";
import { fmtI, diasDesde, labelDias, avatarColor, initials, WProps } from "../homeUtils";
import { ModalPendientes } from "../components/ModalPendientes";
import { useTheme, getShadow } from "../../../constants/Themecontext";

const { width } = Dimensions.get("window");
const H_PAD = 20;
const WIDGET_SIZE = Math.floor((width - H_PAD * 2 - 16) / 2);
const WIDGET_HEIGHT = 160;

export default function WidgetInsightIA({ isDark }: WProps) {
  const ingresos = useIngresosStore((s) => s.ingresos);
  const [modalVisible, setModalVisible] = useState(false);

  const pendientes = React.useMemo(
    () =>
      ingresos
        .filter((i) => i.estado === "pendiente")
        .sort((a, b) => ((b.fecha ?? "") > (a.fecha ?? "") ? 1 : -1)),
    [ingresos],
  );

  // Recordatorio IA: se reprograma cada vez que cambia la lista de pendientes
  useEffect(() => {
    programarRecordatorioIACobros(pendientes).catch(() => {});
  }, [pendientes.length]);

  const totalPend = pendientes.reduce((a, i) => a + (i.monto ?? 0), 0);
  const mostrados = pendientes.slice(0, 3);
  const resto = pendientes.length - 3;

  const { colors: c } = useTheme();
  const shadow = getShadow(isDark, "md");
  const AMBER = "#FBBF24";
  const FOOD_COLOR = "#F97316";
  const cardBg = isDark ? `${FOOD_COLOR}18` : `${FOOD_COLOR}12`;
  const cardBorder = Platform.OS === "ios" && !isDark ? { ...shadow } : {};
  const ink = isDark ? "#F1F5F9" : "#111827";
  const muted = isDark ? "#3D536E" : "#9CA3AF";
  const divClr = isDark ? `${FOOD_COLOR}30` : `${FOOD_COLOR}20`;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => pendientes.length > 0 && setModalVisible(true)}
        style={{
          width: WIDGET_SIZE,
          height: WIDGET_HEIGHT,
          borderRadius: 16,
          paddingHorizontal: 13,
          paddingVertical: 12,
          backgroundColor: cardBg,
          gap: 0,
          overflow: "hidden",
          ...cardBorder,
        }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER }} />
          <Text style={{ fontSize: 8.5, fontWeight: "600", color: muted }}>Pendientes · Por cobrar</Text>
        </View>

        {/* Total */}
        <Text style={{ fontSize: 22, fontWeight: "700", color: pendientes.length > 0 ? AMBER : "#22C55E", letterSpacing: -0.6, lineHeight: 28, marginBottom: 8 }}>
          {pendientes.length > 0 ? fmtI(totalPend) : "Al día ✓"}
        </Text>

        {/* Lista mini o vacío */}
        {pendientes.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>🎉</Text>
            <Text style={{ fontSize: 10, color: muted, textAlign: "center" }}>Sin cuentas pendientes</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {mostrados.map((item, i) => {
              const cliente = (item.descripcion ?? item.tipo_ingreso ?? "Flete").split(" · ")[0].trim();
              const dias = item.fecha ? diasDesde(item.fecha) : 0;
              const color = avatarColor(i);
              const isLast = i === mostrados.length - 1 && resto <= 0;
              return (
                <View key={item.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, gap: 8 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color + "30", borderWidth: 1, borderColor: color + "60", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 8.5, fontWeight: "700", color }}>{initials(cliente)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: "600", color: ink }}>{cliente}</Text>
                      <Text style={{ fontSize: 8, color: muted, marginTop: 0.5 }}>{labelDias(dias)}</Text>
                    </View>
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: AMBER }}>{fmtI(item.monto ?? 0)}</Text>
                  </View>
                  {!isLast && (
                    <View style={{ height: 0.5, backgroundColor: divClr, marginLeft: 34 }} />
                  )}
                </View>
              );
            })}
            {resto > 0 && (
              <Text style={{ fontSize: 9, color: AMBER, marginTop: 4, textAlign: "center", fontWeight: "600" }}>
                +{resto} más → ver todos
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

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
