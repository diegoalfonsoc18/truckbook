// src/types/soat.types.ts

export interface SOAT {
  // Información del SOAT para vehículos nacionales
  cdaExpide?: string;
  entidadExpideSoat?: string;
  estado?: string;
  fechaExpedicion?: string;
  fechaVencimiento?: string;
  fechaVigencia?: string;
  numeroPóliza?: string;

  // Campos adicionales
  vigente?: boolean;
  diasParaVencer?: number;
  [key: string]: any;
}

export interface RTM {
  // Información de RTM (Revisión Técnico Mecánica)
  cdaExpide?: string;
  fechaExpedicion?: string;
  fechaVigente?: string;
  tipoRevision?: string;
  esVigente?: boolean;
  [key: string]: any;
}

export interface VehiculoSOAT {
  // Información general
  numeroPlaca?: string;
  marca?: string;
  modelo?: string;
  año?: string;
  clase?: string;

  // SOAT
  soat?: SOAT | null;

  // RTM
  rtm?: RTM | null;

  // Estado general
  estado?: string;
  [key: string]: any;
}

export interface RespuestaSOAT {
  exito: boolean;
  placa?: string;
  vehiculo?: VehiculoSOAT;
  soat?: SOAT | null;
  rtm?: RTM | null;
  error?: string;
  timestamp: string;
}
