// Estado vacío compartido: ícono 3D, título, texto de apoyo y, opcionalmente,
// un botón con la acción para salir del vacío. `compact` es para usarlo dentro
// de una tarjeta; sin él ocupa el centro de la pantalla.
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import ItemIcon, { IconName } from "./ItemIcon";

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
  style,
}: Props) {
  return (
    <View
      accessible
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[compact ? s.boxCompact : s.box, style]}>
      <ItemIcon name={icon} size={compact ? 64 : 96} />
      <Text style={[s.title, compact && s.titleCompact]}>{title}</Text>
      {!!subtitle && (
        <Text style={[s.subtitle, compact && s.subtitleCompact]}>
          {subtitle}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
          <Text style={s.btnTexto}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 36,
    gap: 6,
  },
  boxCompact: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
    marginTop: 4,
  },
  titleCompact: { fontSize: 15 },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },
  subtitleCompact: { fontSize: 12, lineHeight: 17 },
  btn: {
    marginTop: 12,
    backgroundColor: "#111111",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btnTexto: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
