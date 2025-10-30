// src/services/RTMservice.ts

import type {
  RespuestaTecnicomecanica,
  RTM,
} from "../assets/types/tecnicomecanica.types";
class RTMService {
  private apiUrl = "tu_url_api"; // Reemplaza con tu URL

  async consultarRTMporPlaca(placa: string): Promise<RespuestaTecnicomecanica> {
    try {
      const response = await fetch(`${this.apiUrl}/rtm/${placa}`);
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  isRTMVigente(fechaVigente?: string): boolean {
    if (!fechaVigente) return false;
    return new Date(fechaVigente) > new Date();
  }

  diasParaVencer(fechaVigente?: string): number {
    if (!fechaVigente) return 0;
    const vencimiento = new Date(fechaVigente);
    const hoy = new Date();
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }
}

export default new RTMService();
