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
}

export const items: Item[] = [
  {
    id: "multas",
    iconName: "comparendo",
    iconSize: 36,
    name: "Multas",
    subtitle: "Consultar multas",
    color: "#E94560",
    mostrarBadge: true,
  },
  {
    id: "soat",
    iconName: "shield",
    iconSize: 36,
    name: "SOAT",
    subtitle: "Verificar SOAT",
    color: "#00D9A5",
  },
  {
    id: "tecnicomecanica",
    iconName: "tool",
    iconSize: 36,
    name: "Tecnicomecánica",
    subtitle: "Estado",
    color: "#6C5CE7",
  },
  {
    id: "mantenimiento",
    iconName: "repair",
    iconSize: 36,
    name: "Mantenimiento",
    subtitle: "Próximo",
    color: "#74B9FF",
  },
  {
    id: "licencia",
    iconName: "licencia",
    iconSize: 36,
    name: "Licencia",
    subtitle: "Vigente",
    color: "#FFB800",
  },
];
