// src/Screens/Home/components/DashboardControlPanel.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import ItemIcon from "../../../components/ItemIcon";
import type { Item } from "../Items";

// ─── Icon map — webp assets for known categories ──────────────────────────────
const ICON_MAP_WEBP: Record<string, any> = {
  combustible:   require("../../../assets/icons/fuel.webp"),
  peajes:        require("../../../assets/icons/toll.webp"),
  mantenimiento: require("../../../assets/icons/tool.webp"),
  viajes:        require("../../../assets/icons/trip.webp"),
  // legacy
  tecnicomecanica: require("../../../assets/icons/motor.webp"),
  soat:            require("../../../assets/icons/shield.webp"),
  multas:          require("../../../assets/icons/comparendo.webp"),
  licencia:        require("../../../assets/icons/licencia.webp"),
};

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
  const cardBg     = isDark ? `${c.accent}14` : c.cardBg;
  const textMain   = isDark ? "#FFFFFF" : c.text;
  const mutedClr   = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const trackBg    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  const cardShadow = getShadow(isDark, "md");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 10, paddingVertical: 2 }}
      style={{ marginBottom: 12 }}>

      {items.map((item) => {
        const color   = item.color ?? "#6B7280";
        const iconSrc = ICON_MAP_WEBP[item.id];

        // Trend color: positive = green, negative/spending = amber/red
        const trendColor = item.trendPositive === false
          ? "#F87171"
          : item.trendPositive === true
          ? "#4ADE80"
          : mutedClr;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemPress(item)}
            activeOpacity={0.75}
            style={[
              {
                width: 160,
                backgroundColor: cardBg,
                borderRadius: 22,
                paddingHorizontal: 14,
                paddingVertical: 10,
              },
              isDark
                ? { borderWidth: 1, borderColor: `${c.accent}33` }
                : cardShadow,
            ]}>

            {/* ── Icon + name row ── */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                {iconSrc ? (
                  <Image source={iconSrc} style={{ width: 34, height: 34 }} resizeMode="contain" />
                ) : item.iconName ? (
                  <ItemIcon name={item.iconName} size={30} />
                ) : null}
              </View>
              <Text
                style={{ color: textMain, fontSize: 12, fontWeight: "700", flex: 1 }}
                numberOfLines={1}>
                {item.name}
              </Text>
            </View>

            {/* ── Main amount / sublabel ── */}
            <Text
              style={{ color, fontSize: 19, fontWeight: "800", letterSpacing: -0.5, marginBottom: 1 }}
              numberOfLines={1}>
              {item.sublabel ?? "—"}
            </Text>

            {/* ── Trend line ── */}
            {item.trend ? (
              <Text
                style={{ color: trendColor, fontSize: 10, fontWeight: "600", marginBottom: 5 }}
                numberOfLines={1}>
                {item.trend}
              </Text>
            ) : (
              <View style={{ height: 15, marginBottom: 5 }} />
            )}

            {/* ── Divider ── */}
            <View style={{ height: 0.5, backgroundColor: trackBg, marginBottom: 5 }} />

            {/* ── Secondary info ── */}
            <Text style={{ color: mutedClr, fontSize: 10, fontWeight: "500" }} numberOfLines={1}>
              {item.secondarylabel ?? ""}
            </Text>
            <Text style={{ color: mutedClr, fontSize: 9, marginTop: 1 }} numberOfLines={1}>
              {item.tertiaryLabel ?? ""}
            </Text>

          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
