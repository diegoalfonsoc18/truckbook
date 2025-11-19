import {
  IconGas,
  IconRepair,
  IconPeaje,
  IconViaticos,
  IconLavado,
} from "../assets/icons/icons";

export interface GastoOption {
  id: string;
  name: string;
  icon: React.ComponentType<{
    width?: number;
    height?: number;
    color?: string;
  }>;
}

export const gastosData: GastoOption[] = [
  { id: "1", name: "Combustible", icon: IconGas },
  { id: "2", name: "Reparación", icon: IconRepair },
  { id: "3", name: "Peajes", icon: IconPeaje },
  { id: "4", name: "Imprevistos", icon: IconGas },
  { id: "5", name: "Viaticos", icon: IconViaticos },
  { id: "6", name: "Lavado", icon: IconLavado },
  { id: "7", name: "Parqueadero", icon: IconGas },
];

export const ingresosData: GastoOption[] = [
  { id: "1", name: "Flete", icon: IconGas },
  { id: "2", name: "Facturas", icon: IconGas },
  { id: "3", name: "Clientes", icon: IconGas },
  { id: "4", name: "Otros Ingresos", icon: IconGas },
];

export const gastosAdmin: GastoOption[] = [
  { id: "1", name: "SOAT", icon: IconGas },
  { id: "2", name: "Seguros", icon: IconGas },
  { id: "3", name: "Salario", icon: IconGas },
];
