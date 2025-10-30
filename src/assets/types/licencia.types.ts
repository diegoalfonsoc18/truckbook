// src/types/licencia.types.ts

export interface Licencia {
  numeroLicencia?: string;
  tipoLicencia?: string;
  estado?: string;
  fechaExpedicion?: string;
  fechaVencimiento?: string;
  categoriasPermitidas?: string;
  vigente?: boolean;
  diasParaVencer?: number;
  [key: string]: any;
}

export interface RespuestaLicencia {
  exito: boolean;
  numeroDocumento?: string;
  licencia?: Licencia | null;
  error?: string;
  timestamp: string;
}
