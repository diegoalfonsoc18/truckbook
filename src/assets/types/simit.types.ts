// src/types/simit.types.ts

export interface Multa {
  placa?: string;
  documento?: string;
  nombre?: string;
  infraccion?: string;
  descripcion_infraccion?: string;
  valor?: string | number;
  fecha_infraccion?: string;
  estado?: string;
  organismo_transito?: string;
  numero_comparendo?: string;
  [key: string]: any;
}

export interface RespuestaMultas {
  exito: boolean;
  placa?: string;
  cantidad: number;
  multas: Multa[];
  multasPendientes: number;
  valorTotal: number;
  error?: string;
  timestamp: string;
}
