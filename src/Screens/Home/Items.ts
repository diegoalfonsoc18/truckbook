import {
  TriangleAlert,
  ShieldCheck,
  Settings2,
  Wrench,
  CreditCard,
} from "lucide-react-native";

export interface Item {
  id: string;
  icon: any;
  color: string;
  name: string;
  description?: string;
  mostrarBadge?: boolean;
}

export const items: Item[] = [
  {
    id: "multas",
    icon: TriangleAlert,
    color: "#E94560",
    name: "Multas",
    description: "Consultar multas",
    mostrarBadge: true,
  },
  {
    id: "soat",
    icon: ShieldCheck,
    color: "#00D9A5",
    name: "SOAT",
    description: "Verificar SOAT",
  },
  {
    id: "tecnicomecanica",
    icon: Settings2,
    color: "#74B9FF",
    name: "Tecnicomecánica",
    description: "Estado",
  },
  {
    id: "mantenimiento",
    icon: Wrench,
    color: "#FFB800",
    name: "Mantenimiento",
    description: "Próximo",
  },
  {
    id: "licencia",
    icon: CreditCard,
    color: "#6C5CE7",
    name: "Licencia",
    description: "Vigente",
  },
];
