// src/Screens/Home/components/DashboardControlPanel.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform, Image } from "react-native";
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../../../constants/Themecontext";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import ItemIcon from "../../../components/ItemIcon";
import {
  MotorIcon, LicenciaIcon, MultasIcon, SoatIcon,
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
    ? (Platform.OS === "android" ? 18 : 20)
    : (Platform.OS === "android" ? 30 : 34);

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
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ alignItems: "center", paddingVertical: 2 }}>
      {renderIcon()}
      <Text numberOfLines={2} style={{ color: accent, fontSize: 8, fontWeight: "600", marginTop: 3, textAlign: "center", opacity: 0.9 }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── LateralDial ──────────────────────────────────────────────────────────────
export function LateralDial({
  ratio, value, label, side, height = 220, colors: c, isDark,
}: {
  ratio: number;
  value: string;
  label: string;
  side: "left" | "right";
  height?: number;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  const isLeft = side === "left";
  const H  = height;
  const R  = H / 2 - 4;
  const W  = R + 44;
  const CY = H / 2;
  const CX = isLeft ? 0 : W;

  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r = R) => ({
    x: CX + r * Math.cos(deg2rad(deg)),
    y: CY + r * Math.sin(deg2rad(deg)),
  });

  const arcPathFull = (): string => {
    const top = pt(270);
    const bot = pt(90);
    return `M ${top.x.toFixed(2)} ${top.y.toFixed(2)} A ${R} ${R} 0 1 ${isLeft ? 1 : 0} ${bot.x.toFixed(2)} ${bot.y.toFixed(2)}`;
  };

  const clamp = (v: number) => Math.max(0.005, Math.min(0.995, v));
  const rC = clamp(ratio);
  const needleDeg = isLeft ? 90 - rC * 180 : 90 + rC * 180;
  const needlePt  = pt(needleDeg);

  const arcPathActive = (): string => {
    const bot   = pt(90);
    const end   = needlePt;
    const sweep = rC * 180;
    if (sweep < 0.5) return "";
    const large = sweep > 180 ? 1 : 0;
    return isLeft
      ? `M ${bot.x.toFixed(2)} ${bot.y.toFixed(2)} A ${R} ${R} 0 ${large} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
      : `M ${bot.x.toFixed(2)} ${bot.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  const ZONE_WARN = 0.33;
  const ZONE_OK   = 0.66;
  const zoneColor =
    ratio < ZONE_WARN ? "#FF453A" :
    ratio < ZONE_OK   ? "#FFB800" :
                        "#2ECC71";

  const DFRAC = 0.25;
  const dangerEnd = pt(isLeft ? 90 - DFRAC * 180 : 90 + DFRAC * 180);
  const arcPathDanger = (): string => {
    const bot = pt(90);
    return isLeft
      ? `M ${bot.x.toFixed(2)} ${bot.y.toFixed(2)} A ${R} ${R} 0 0 0 ${dangerEnd.x.toFixed(2)} ${dangerEnd.y.toFixed(2)}`
      : `M ${bot.x.toFixed(2)} ${bot.y.toFixed(2)} A ${R} ${R} 0 0 1 ${dangerEnd.x.toFixed(2)} ${dangerEnd.y.toFixed(2)}`;
  };

  const trackColor  = "rgba(255,255,255,0.09)";
  const tickMinor   = "rgba(255,255,255,0.18)";
  const tickMajor   = "rgba(255,255,255,0.50)";
  const needleColor = zoneColor;
  const pivotBg     = "rgba(10,12,20,0.85)";
  const mutedColor  = "rgba(255,255,255,0.38)";

  const TICK_N = 9;
  const ticks = Array.from({ length: TICK_N }, (_, i) => {
    const frac  = i / (TICK_N - 1);
    const deg   = isLeft ? 270 + frac * 180 : 270 - frac * 180;
    const major = i % 2 === 0;
    const outerR = R + 2;
    const innerR = major ? outerR - 10 : outerR - 6;
    return { o: pt(deg, outerR), i: pt(deg, innerR), major, danger: frac > 0.75 };
  });

  const textX      = isLeft ? W - 6 : 6;
  const textAnchor = isLeft ? "end" : "start";

  return (
    <Svg width={W} height={H}>
      <Path d={arcPathFull()} stroke={trackColor} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d={arcPathDanger()} stroke="rgba(255,69,58,0.22)" strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d={arcPathActive()} stroke={`${zoneColor}30`} strokeWidth={22} fill="none" strokeLinecap="round" />
      <Path d={arcPathActive()} stroke={zoneColor} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.95} />
      {ticks.map((t, idx) => (
        <Line key={idx}
          x1={t.o.x} y1={t.o.y} x2={t.i.x} y2={t.i.y}
          stroke={t.danger ? "#FF453A" : t.major ? tickMajor : tickMinor}
          strokeWidth={t.major ? 2.5 : 1.2}
          strokeLinecap="round"
          opacity={t.danger ? 0.8 : 1}
        />
      ))}
      <Line x1={CX} y1={CY} x2={needlePt.x} y2={needlePt.y} stroke={needleColor} strokeWidth={2.8} strokeLinecap="round" />
      <Circle cx={CX} cy={CY} r={9}   fill={needleColor} opacity={0.12} />
      <Circle cx={CX} cy={CY} r={5}   fill={pivotBg} />
      <Circle cx={CX} cy={CY} r={3}   fill={needleColor} />
      <Circle cx={CX} cy={CY} r={1.2} fill="#FFFFFF" opacity={0.6} />
      <SvgText x={textX} y={CY - 5} fontSize={9} fontWeight="700" fill={needleColor} textAnchor={textAnchor}>{value}</SvgText>
      <SvgText x={textX} y={CY + 8} fontSize={6.5} fontWeight="500" fill={mutedColor} textAnchor={textAnchor}>{label}</SvgText>
    </Svg>
  );
}

// ─── MiniGaugeDial ────────────────────────────────────────────────────────────
export function MiniGaugeDial({
  ratio, label, value, dangerOnRight,
}: {
  ratio: number;
  label: string;
  value: string;
  dangerOnRight: boolean;
}) {
  const W = 68, H = 66;
  const CX = W / 2;
  const CY = 56;
  const R = 30;
  const START = 160;
  const SPAN = 220;
  const DANGER_FRAC = 0.22;

  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number, r = R) => ({
    x: CX + r * Math.cos(deg2rad(deg)),
    y: CY + r * Math.sin(deg2rad(deg)),
  });

  const arcPath = (fromDeg: number, sweep: number, r = R): string => {
    if (sweep < 0.5) return "";
    const s = pt(fromDeg, r);
    const e = pt(fromDeg + sweep, r);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const clamp = (v: number) => Math.max(0.01, Math.min(0.99, v));
  const filled = clamp(ratio) * SPAN;
  const needleDeg = START + filled;
  const dotPt = pt(needleDeg);

  const dangerDeg = dangerOnRight ? START + (1 - DANGER_FRAC) * SPAN : START;
  const dangerSweep = DANGER_FRAC * SPAN;

  const inDanger = dangerOnRight ? ratio > 1 - DANGER_FRAC : ratio < DANGER_FRAC;
  const needleColor = inDanger ? "#FF5252" : "#4FC3F7";
  const glowColor = inDanger ? "rgba(255,82,82,0.35)" : "rgba(0,188,212,0.35)";

  const TICK_N = 11;
  const ticks = Array.from({ length: TICK_N }, (_, i) => {
    const frac = i / (TICK_N - 1);
    const deg = START + frac * SPAN;
    const major = i % 2 === 0;
    const outerR = R + 3;
    const innerR = major ? R + 3 - 8 : R + 3 - 5;
    const isDanger = dangerOnRight ? frac > 1 - DANGER_FRAC - 0.02 : frac < DANGER_FRAC + 0.02;
    return { o: pt(deg, outerR), i: pt(deg, innerR), major, isDanger };
  });

  return (
    <Svg width={W} height={H}>
      <Rect width={W} height={H} fill="#080C14" rx={10} />
      <Path d={arcPath(START, SPAN)} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d={arcPath(dangerDeg, dangerSweep)} stroke="rgba(255,82,82,0.18)" strokeWidth={6} fill="none" strokeLinecap="round" />
      {filled > 1 && (
        <Path d={arcPath(START, filled)} stroke={glowColor} strokeWidth={10} fill="none" strokeLinecap="round" />
      )}
      {filled > 1 && (
        <Path d={arcPath(START, filled)} stroke={needleColor} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.9} />
      )}
      {ticks.map((t, idx) => (
        <Line key={idx} x1={t.o.x} y1={t.o.y} x2={t.i.x} y2={t.i.y}
          stroke={t.isDanger ? "#FF5252" : t.major ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)"}
          strokeWidth={t.major ? 1.4 : 0.8} strokeLinecap="round" />
      ))}
      <Line x1={CX} y1={CY} x2={dotPt.x} y2={dotPt.y} stroke={needleColor} strokeWidth={1.6} strokeLinecap="round" opacity={0.92} />
      <Circle cx={CX} cy={CY} r={7} fill={needleColor} opacity={0.12} />
      <Circle cx={CX} cy={CY} r={4} fill="#1A2035" />
      <Circle cx={CX} cy={CY} r={2.5} fill={needleColor} />
      <Circle cx={CX} cy={CY} r={1} fill="#FFFFFF" opacity={0.9} />
      <SvgText x={CX} y={CY - 10} fontSize={9} fontWeight="700" fill={needleColor} textAnchor="middle">{value}</SvgText>
      <SvgText x={CX} y={H - 4} fontSize={6} fontWeight="600" fill="rgba(255,255,255,0.4)" textAnchor="middle">{label}</SvgText>
    </Svg>
  );
}

// ─── DialBalanceMensual ───────────────────────────────────────────────────────
export function DialBalanceMensual({ height, colors: c, isDark }: { height?: number; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean }) {
  const gastos   = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  const hoy      = new Date();
  const mesStr   = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const totalG = gastos.filter((g) => (g.fecha ?? g.created_at ?? "").startsWith(mesStr)).reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalI = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "").startsWith(mesStr)).reduce((a, i) => a + (i.monto ?? 0), 0);
  const balance = totalI - totalG;
  const total   = totalI + totalG;
  const ratio   = total > 0 ? Math.max(0.01, Math.min(0.99, totalI / total)) : 0.5;

  const fmt = (n: number) => {
    const abs = Math.abs(n), sign = n < 0 ? "-" : "+";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${Math.round(abs / 1_000)}K`;
    return `${sign}${abs}`;
  };

  return <LateralDial ratio={ratio} value={fmt(balance)} label="MES" side="left" height={height} colors={c} isDark={isDark} />;
}

// ─── DialCombustible ──────────────────────────────────────────────────────────
export function DialCombustible({ height, colors: c, isDark }: { height?: number; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean }) {
  const gastos = useGastosStore((s) => s.gastos);
  const hoy    = new Date();
  const mesStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const gasMes      = gastos.filter((g) => (g.fecha ?? g.created_at ?? "").startsWith(mesStr));
  const totalMes    = gasMes.reduce((a, g) => a + (g.monto ?? 0), 0);
  const combustible = gasMes.filter((g) => g.tipo_gasto?.toLowerCase().includes("combustible")).reduce((a, g) => a + (g.monto ?? 0), 0);
  const rawRatio    = totalMes > 0 ? combustible / totalMes : 0;
  const ratio       = Math.max(0.01, Math.min(0.99, 1 - rawRatio));
  const pct         = Math.round(rawRatio * 100);

  return <LateralDial ratio={ratio} value={`${pct}%`} label="COMB." side="right" height={height} colors={c} isDark={isDark} />;
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
  const cardBg   = isDark ? c.cardBg : "#FFFFFF";
  const textMain = isDark ? "#FFFFFF" : c.text;
  const trackBg  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";

  const ICON_MAP_WEBP: Record<string, any> = {
    tecnicomecanica: require("../../../assets/icons/motor.webp"),
    soat:            require("../../../assets/icons/shield.webp"),
    multas:          require("../../../assets/icons/comparendo.webp"),
    licencia:        require("../../../assets/icons/licencia.webp"),
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 10, paddingVertical: 2 }}
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
            style={{
              width: 110,
              backgroundColor: cardBg,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
              alignItems: "center",
            }}>
            <View style={{ width: 58, height: 58, borderRadius: 16, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              {iconSrc ? (
                <Image source={iconSrc} style={{ width: 38, height: 38 }} resizeMode="contain" />
              ) : (
                <DashboardControlItem item={item} onPress={() => onItemPress(item)} isDark={isDark} iconOnly />
              )}
            </View>
            <Text style={{ color: textMain, fontSize: 12, fontWeight: "700", marginBottom: 2, textAlign: "center" }}>
              {item.name}
            </Text>
            <Text style={{ color, fontSize: 11, fontWeight: "600", marginBottom: 10, textAlign: "center" }}>
              {item.sublabel ?? "—"}
            </Text>
            <View style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: trackBg, overflow: "hidden" }}>
              <View style={{ width: `${score}%`, height: "100%", borderRadius: 2, backgroundColor: color }} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
