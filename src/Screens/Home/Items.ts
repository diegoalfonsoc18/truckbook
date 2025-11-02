// src/screens/Home/Items.ts

import { MultasIcon } from "../../assets/icons/icons";
import { SoatIcon } from "../../assets/icons/icons";
import { MantenimientoIcon } from "../../assets/icons/icons";
import { LicenciaIcon } from "../../assets/icons/icons";
import { tecnoIcon } from "../../assets/icons/icons";

// Definir el tipo Item
export interface Item {
  id: string; // ✅ ID único para cada item
  icon: any; // Puede ser componente o require()
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  mostrarBadge?: boolean; // ✅ Para saber si mostrar badge de estado
}

export const items: Item[] = [
  {
    id: "multas",
    icon: MultasIcon, // ✅ Usar el componente importado
    title: "Multas",
    subtitle: "Consultar multas",
    backgroundColor: "#f5f5f5",
    mostrarBadge: true, // 👈 Este mostrará el badge de pendiente/al día
  },
  {
    id: "soat",
    icon: SoatIcon,
    title: "SOAT",
    subtitle: "Verificar SOAT",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "tecnicomecanica",
    icon: tecnoIcon,
    title: "Tecnicomecánica",
    subtitle: "Estado",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "mantenimiento",
    icon: MantenimientoIcon,
    title: "Mantenimiento",
    subtitle: "Próximo",
    backgroundColor: "#f5f5f5",
  },
  {
    id: "licencia",
    icon: LicenciaIcon,
    title: "Licencia",
    subtitle: "Vencimiento",
    backgroundColor: "#f5f5f5",
  },
  // Agrega más items según necesites
];
