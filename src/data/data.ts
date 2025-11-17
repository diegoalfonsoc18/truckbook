// gastos-ingresos.ts
import { IconGas } from "../assets/icons/icons";

export interface GastoOption {
  id: string;
  name: string;
  icon: React.ComponentType<{
    width?: number;
    height?: number;
    color?: string;
  }>;
  color: string;
}

export const gastosData: GastoOption[] = [
  { id: "1", name: "Combustible", icon: IconGas, color: "#F59E0B" },
  { id: "2", name: "Mantenimiento", icon: IconGas, color: "#EF4444" },
  { id: "3", name: "Peajes-Permisos", icon: IconGas, color: "#06B6D4" },
  { id: "4", name: "SOAT", icon: IconGas, color: "#10B981" },
  { id: "5", name: "Seguros", icon: IconGas, color: "#6366F1" },
  { id: "6", name: "Salario", icon: IconGas, color: "#EC4899" },
  { id: "7", name: "Imprevistos", icon: IconGas, color: "#8B5CF6" },
];

export const ingresosData: GastoOption[] = [
  { id: "1", name: "Flete", icon: IconGas, color: "#3B82F6" },
  { id: "2", name: "Facturas", icon: IconGas, color: "#10B981" },
  { id: "3", name: "Clientes", icon: IconGas, color: "#F59E0B" },
  { id: "4", name: "Otros Ingresos", icon: IconGas, color: "#8B5CF6" },
];
