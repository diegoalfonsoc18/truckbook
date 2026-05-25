// src/Screens/Home/widgets/WidgetResumen.tsx
import React from "react";
import { View, Dimensions } from "react-native";
import Svg, {
  Path, Circle, Line, Defs,
  LinearGradient as SvgGradient, Stop,
  Text as SvgText, Rect,
} from "react-native-svg";
import { useGastosStore } from "../../../store/GastosStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import { fechaLocalHoy, WProps } from "../homeUtils";

const { width } = Dimensions.get("window");
const H_PAD = 20;
const WIDGET_SIZE   = Math.floor((width - H_PAD * 2 - 16) / 2);
const WIDGET_HEIGHT = 160;

// ─── GaugeBalance ─────────────────────────────────────────────────────────────
function GaugeBalance({
  ratio, isDark, balance, totalI, totalG, balSem,
}: {
  ratio: number; isDark: boolean; balance: number;
  balColor: string; totalI: number; totalG: number; balSem: number;
}) {
  const W  = WIDGET_SIZE;
  const H  = WIDGET_HEIGHT;
  const CX = W / 2;
  const R  = 62;
  const CY = 87;
  const START = 160;
  const SPAN  = 220;
  const FILL_W = 8;

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

  const clamp = (v: number) => Math.max(0.005, Math.min(0.995, v));
  const filled     = clamp(ratio) * SPAN;
  const fillEndDeg = START + filled;
  const dotPt      = pt(fillEndDeg);
  const gradLX     = pt(START).x;
  const gradRX     = pt(START + SPAN).x;

  const dotColor    = ratio < 0.38 ? "#EF4444" : ratio < 0.62 ? "#FFB800" : "#22C55E";
  const statusLabel = ratio < 0.38 ? "Negativo"  : ratio < 0.62 ? "Equilibrio" : "Positivo";
  const statusColor = ratio < 0.38 ? "#F87171"   : ratio < 0.62 ? "#FBBF24"    : "#4ADE80";

  const ticks: Array<{ o: { x: number; y: number }; i: { x: number; y: number }; major: boolean }> = [];
  for (let i = 0; i <= SPAN; i += 5) {
    const deg    = START + i;
    const major  = i % 20 === 0;
    const outerR = R + 3;
    const innerR = major ? outerR - 9 : outerR - 5;
    ticks.push({ o: pt(deg, outerR), i: pt(deg, innerR), major });
  }

  const fmt = (n: number) => {
    const abs = Math.abs(n), sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${Math.round(abs / 1_000)}K`;
    return `${sign}${abs}`;
  };

  const cardBg      = balance >= 0 ? (isDark ? "#0D2E1A" : "#EDFAF3") : (isDark ? "#2E0D0D" : "#FAEAEA");
  const balTextColor = isDark ? "#FFFFFF" : balance >= 0 ? "#059669" : "#DC2626";
  const mutedClr     = isDark ? "#4B5268" : "#6B7280";
  const ingClr       = isDark ? "#4ADE80" : "#059669";
  const gasClr       = isDark ? "#F87171" : "#DC2626";
  const tickClr      = isDark ? "#1A3826" : balance >= 0 ? "#C5DDD0" : "#DEC5C5";
  const tickMajClr   = isDark ? "#2A4A38" : balance >= 0 ? "#A3C4B0" : "#C4A3A3";

  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <SvgGradient id="gfill" x1={gradLX} y1={0} x2={gradRX} y2={0} gradientUnits="userSpaceOnUse">
          <Stop offset="0"    stopColor="#EF4444" />
          <Stop offset="0.42" stopColor="#FFB800" />
          <Stop offset="1"    stopColor="#22C55E" />
        </SvgGradient>
      </Defs>
      <Rect width={W} height={H} fill={cardBg} rx={16} />
      {ticks.map((t, idx) => (
        <Line key={idx} x1={t.o.x} y1={t.o.y} x2={t.i.x} y2={t.i.y}
          stroke={t.major ? tickMajClr : tickClr}
          strokeWidth={t.major ? 1.6 : 0.9} strokeLinecap="round" />
      ))}
      <Path d={arcPath(START, filled)} stroke="url(#gfill)" strokeWidth={FILL_W} fill="none" strokeLinecap="round" />
      <Circle cx={dotPt.x} cy={dotPt.y} r={13} fill={dotColor} opacity={0.15} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={7}  fill={dotColor} opacity={0.4} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={4}  fill={dotColor} />
      <Circle cx={dotPt.x} cy={dotPt.y} r={2}  fill="#FFFFFF" opacity={0.9} />
      <SvgText x={CX} y={CY + 8}  fontSize={26} fontWeight="800" fill={balTextColor} textAnchor="middle" letterSpacing={-1}>{fmt(balance)}</SvgText>
      <SvgText x={CX} y={CY + 23} fontSize={10} fontWeight="700" fill={statusColor}  textAnchor="middle">{statusLabel}</SvgText>
      <SvgText x={14}     y={H - 28} fontSize={9} fontWeight="600" fill={ingClr}  textAnchor="start">{`↑ ${fmt(totalI)}`}</SvgText>
      <SvgText x={W - 14} y={H - 28} fontSize={9} fontWeight="600" fill={gasClr}  textAnchor="end">{`↓ ${fmt(totalG)}`}</SvgText>
      <SvgText x={CX}     y={H - 14} fontSize={8} fontWeight="500" fill={mutedClr} textAnchor="middle">{`Semana ${fmt(balSem)}`}</SvgText>
    </Svg>
  );
}

// ─── WidgetResumen ─────────────────────────────────────────────────────────────
export default function WidgetResumen({ isDark }: WProps) {
  const gastos   = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  const hoy      = fechaLocalHoy();

  const gastosHoy   = gastos.filter((g) => (g.fecha ?? g.created_at ?? "").startsWith(hoy));
  const ingresosHoy = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "").startsWith(hoy));
  const totalG      = gastosHoy.reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalI      = ingresosHoy.reduce((a, i) => a + (i.monto ?? 0), 0);
  const balance     = totalI - totalG;

  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 6);
  const hace7Str = `${hace7.getFullYear()}-${String(hace7.getMonth() + 1).padStart(2, "0")}-${String(hace7.getDate()).padStart(2, "0")}`;
  const totalGSem = gastos.filter((g)  => (g.fecha ?? g.created_at ?? "") >= hace7Str).reduce((a, g) => a + (g.monto ?? 0), 0);
  const totalISem = ingresos.filter((i) => (i.fecha ?? i.created_at ?? "") >= hace7Str).reduce((a, i) => a + (i.monto ?? 0), 0);
  const balSem    = totalISem - totalGSem;
  const total     = totalI + totalG;
  const ratioI    = total > 0 ? totalI / total : 0.5;

  return (
    <View style={{ width: WIDGET_SIZE, height: WIDGET_HEIGHT, borderRadius: 16, padding: 0, overflow: "hidden" }}>
      <GaugeBalance
        ratio={ratioI} isDark={isDark} balance={balance}
        balColor="" totalI={totalI} totalG={totalG} balSem={balSem}
      />
    </View>
  );
}
