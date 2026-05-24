// src/Screens/Home/components/DashboardControlPanel.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import ItemIcon from "../../../components/ItemIcon";
import {
  MotorIcon,
  LicenciaIcon,
  MultasIcon,
  SoatIcon,
} from "../../../assets/icons/icons";
import type { Item } from "../Items";

// ─── DashboardControlItem ─────────────────────────────────────────────────────
export function DashboardControlItem({
  item,
  onPress,
  isDark,
  iconOnly = false,
}: {
  item: Item;
  onPress: () => void;
  isDark: boolean;
  iconOnly?: boolean;
}) {
  const accent = item.color || "#6B7280";
  const base = iconOnly
    ? Platform.OS === "android"
      ? 18
      : 20
    : Platform.OS === "android"
      ? 30
      : 34;

  const ICON_SIZES: Record<string, { w: number; h: number }> = {
    tecnicomecanica: { w: base * 1, h: base * 0.85 },
    licencia: { w: base * 1.4, h: base * 0.85 },
    soat: { w: base * 0.8, h: base * 0.8 },
    multas: { w: base * 1.4, h: base * 0.85 },
  };

  const sz = ICON_SIZES[item.id] ?? { w: base, h: base };

  const renderIcon = () => {
    if (item.id === "tecnicomecanica" || item.id === "tecnomecanica")
      return <MotorIcon width={sz.w} height={sz.h} color={accent} />;
    if (item.id === "soat")
      return <SoatIcon width={sz.w} height={sz.h} color={accent} />;
    if (item.id === "multas" || item.id === "comparendos")
      return <MultasIcon width={sz.w} height={sz.h} color={accent} />;
    if (item.id === "licencia")
      return <LicenciaIcon width={sz.w} height={sz.h} color={accent} />;
    if (item.iconName) return <ItemIcon name={item.iconName} size={base} />;
    return null;
  };

  if (iconOnly) return <>{renderIcon()}</>;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ alignItems: "center", paddingVertical: 2 }}>
      {renderIcon()}
      <Text
        numberOfLines={2}
        style={{
          color: accent,
          fontSize: 8,
          fontWeight: "600",
          marginTop: 3,
          textAlign: "center",
          opacity: 0.9,
        }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── DashboardControlPanel ────────────────────────────────────────────────────
export default function DashboardControlPanel({
  items,
  onItemPress,
  isDark,
  colors: c,
}: {
  items: Item[];
  onItemPress: (item: Item) => void;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  renderBadge?: (item: Item) => React.ReactNode;
}) {
  const cardBg = isDark ? `${c.accent}14` : c.cardBg;
  const textMain = isDark ? "#FFFFFF" : c.text;
  const trackBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const cardShadow = getShadow(isDark, "md");

  const ICON_MAP_WEBP: Record<string, any> = {
    tecnicomecanica: require("../../../assets/icons/motor.webp"),
    soat: require("../../../assets/icons/shield.webp"),
    multas: require("../../../assets/icons/comparendo.webp"),
    licencia: require("../../../assets/icons/licencia.webp"),
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 4,
        gap: 10,
        paddingVertical: 2,
      }}
      style={{ marginBottom: 12 }}>
      {items.map((item) => {
        const color = item.color ?? "#6B7280";
        const score = item.score ?? 0;
        const iconSrc = ICON_MAP_WEBP[item.id];

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemPress(item)}
            activeOpacity={0.75}
            style={[
              {
                width: 110,
                backgroundColor: cardBg,
                borderRadius: 22,
                padding: 14,
                alignItems: "center",
              },
              isDark
                ? { borderWidth: 1, borderColor: `${c.accent}33` }
                : cardShadow,
            ]}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                //backgroundColor: `${color}18`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}>
              {iconSrc ? (
                <Image
                  source={iconSrc}
                  style={{ width: 58, height: 58 }}
                  resizeMode="contain"
                />
              ) : (
                <DashboardControlItem
                  item={item}
                  onPress={() => onItemPress(item)}
                  isDark={isDark}
                  iconOnly
                />
              )}
            </View>
            <Text
              style={{
                color: textMain,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 2,
                textAlign: "center",
              }}>
              {item.name}
            </Text>
            <Text
              style={{
                color,
                fontSize: 11,
                fontWeight: "600",
                marginBottom: 10,
                textAlign: "center",
              }}>
              {item.sublabel ?? "—"}
            </Text>
            <View
              style={{
                width: "100%",
                height: 4,
                borderRadius: 2,
                backgroundColor: trackBg,
                overflow: "hidden",
              }}>
              <View
                style={{
                  width: `${score}%`,
                  height: "100%",
                  borderRadius: 2,
                  backgroundColor: color,
                }}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
