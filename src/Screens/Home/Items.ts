// src/screens/Home/Items.ts

// Definir el tipo Item
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
}

export const items: Item[] = [
  // ── Hero cards (índice 0 y 1) ──────────────────────────────────────────────
  {
    id: "tecnicomecanica",
    iconName: "tool",
    iconSize: 80,
    name: "Tecnicomecánica",
    subtitle: "Estado",
    color: "#6C5CE7",
  },
  {
    id: "soat",
    iconName: "shield",
    iconSize: 80,
    name: "SOAT",
    subtitle: "Verificar SOAT",
    color: "#0c0c0c",
  },
  // ── List rows (índice 2 en adelante) ──────────────────────────────────────
  {
    id: "multas",
    iconName: "factura",
    iconSize: 80,
    name: "Multas",
    subtitle: "Consultar multas",
    color: "#E94560",
    mostrarBadge: true,
  },
  {
    id: "mantenimiento",
    iconName: "mechanic",
    iconSize: 80,
    name: "Mantenimiento",
    subtitle: "Próximo",
    color: "#74B9FF",
  },
  {
    id: "licencia",
    iconName: "licencia",
    iconSize: 80,
    name: "Licencia",
    subtitle: "Vigente",
    color: "#FFB800",
  },
];
