// src/screens/Home/Items.ts

// Definir el tipo Item
export interface Item {
  id: string;
  name: string;
  icon?: string;
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
    icon: "🚨",
    name: "Multas",
    subtitle: "Consultar multas",
    backgroundColor: "#f5f5f5",
    mostrarBadge: true,
  },
  {
    id: "soat",
    icon: "🛡️",
    name: "SOAT",
    subtitle: "Verificar SOAT",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "tecnicomecanica",
    icon: "🔍",
    name: "Tecnicomecánica",
    subtitle: "Estado",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "mantenimiento",
    icon: "🔧",
    name: "Mantenimiento",
    subtitle: "Próximo",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "licencia",
    icon: "🪪",
    name: "Licencia",
    subtitle: "Vigente",
    backgroundColor: "#f5f5f5",
  },
];
