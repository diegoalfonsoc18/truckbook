// src/screens/Home/Items.ts
import { IconName } from "../../components/ItemIcon";

export interface Item {
  id: string;
  name: string;
  icon?: string;
  iconName?: IconName;
  iconSize?: number;
  color?: string;
  description?: string;
  route?: string;
  subtitle?: string;
  backgroundColor?: string;
  mostrarBadge?: boolean;
  badgeCount?: number;
  // Estado numérico (0-100) para la barra de progreso
  score?: number;
  // Línea principal de datos: "$420K", "3 pagos", etc.
  sublabel?: string;
  // Tendencia: "↑ 8% vs sem. ant.", "Todo en orden ✓"
  trend?: string;
  // true = verde (buena señal), false = rojo/ámbar
  trendPositive?: boolean;
  // Línea secundaria: "Últ: $180K", "Últ: Reparación"
  secondarylabel?: string;
  // Tercera línea: "Hace 2 días", "Hoy"
  tertiaryLabel?: string;
}

// ─── Items base del panel de control del conductor ────────────────────────────
// Los campos dinámicos (score, sublabel, trend, secondarylabel, tertiaryLabel)
// se calculan en ConductorHome.tsx a partir de GastosStore.
export const items: Item[] = [
  {
    id: "combustible",
    name: "Combustible",
    iconName: "fuel",
    color: "#FFB800",
  },
  {
    id: "peajes",
    name: "Peajes",
    iconName: "toll",
    color: "#00D9A5",
  },
  {
    id: "mantenimiento",
    name: "Manten.",
    iconName: "tool",
    color: "#74B9FF",
  },
  {
    id: "viajes",
    name: "Viajes",
    iconName: "freight",
    color: "#6C5CE7",
  },
];
