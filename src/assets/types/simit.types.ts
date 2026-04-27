// src/types/simit.types.ts

// Respuesta de Apitude SIMIT-CO API
export interface ApitudeResolucion {
  estado?: string;
  comparendo?: string;
  infraccion?: string;
  resolucion?: string;
  secretaria?: string;
  valor_multa?: string | number;
  interes_mora?: string | number;
  valor_adicional?: string | number;
  fecha_comparendo?: string;
  fecha_resolucion?: string;
  nombre_infractor?: string;
}

export interface ApitudeData {
  debtor?: boolean;
  record?: string;
  tables?: {
    resoluciones?: ApitudeResolucion[];
  };
}

export interface ApitudeResponse {
  result?: {
    data?: ApitudeData;
    error?: string;
    status?: number;
    message?: string;
    end_at?: string;
    queried_by?: string;
    service_name?: string;
  };
}

// Tipo unificado para la app
export interface Multa {
  comparendo?: string;
  infraccion?: string;
  descripcion?: string;
  valor?: number;
  interesMora?: number;
  valorAdicional?: number;
  fechaComparendo?: string;
  fechaResolucion?: string;
  estado?: string;
  secretaria?: string;
  nombreInfractor?: string;
  resolucion?: string;
  // Campos de datos.gov.co (fallback)
  placa?: string;
  ciudad?: string;
  departamento?: string;
  vigencia?: string;
  pagadoSiNo?: string;
  fuente?: "apitude" | "datosgovco";
}

export interface RespuestaMultas {
  exito: boolean;
  placa?: string;
  cedula?: string;
  cantidad: number;
  multas: Multa[];
  multasPendientes: number;
  multasPagadas: number;
  valorTotal: number;
  valorPendiente: number;
  esDeudor?: boolean;
  error?: string;
  timestamp: string;
  fuente?: "apitude" | "datosgovco";
}
