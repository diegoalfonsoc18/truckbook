// src/types/soat.types.ts

export interface SOAT {
  cdaExpide?: string;
  entidadExpideSoat?: string;
  estado?: string;
  fechaExpedicion?: string;
  fechaVencimiento?: string;
  fechaVigencia?: string;
  numeroPóliza?: string;
  vigente?: boolean;
  diasParaVencer?: number;
  [key: string]: any;
}

export interface VehiculoSOAT {
  numeroPlaca?: string;
  marca?: string;
  modelo?: string;
  año?: string;
  clase?: string;
  soat?: SOAT | null;
  estado?: string;
  [key: string]: any;
}

export interface RespuestaSOAT {
  exito: boolean;
  placa?: string;
  vehiculo?: VehiculoSOAT;
  soat?: SOAT | null;
  error?: string;
  timestamp: string;
}
