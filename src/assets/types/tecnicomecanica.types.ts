// src/types/tecnicomecanica.types.ts

export interface RTM {
  // Identificador único
  id_tecnicomecanica?: string;

  // Información de RTM (Revisión Técnico Mecánica)
  cdaExpide?: string;
  fechaExpedicion?: string;
  fechaVigente?: string;
  tipoRevision?: string;
  esVigente?: boolean;
  [key: string]: any;
}

export interface RespuestaTecnicomecanica {
  exito: boolean;
  placa?: string;
  rtm?: RTM | null;
  error?: string;
  timestamp: string;
}
