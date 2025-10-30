// src/services/licenciaService.ts

import type { RespuestaLicencia } from "../assets/types/licencia.types";

class LicenciaService {
  private apiUrl = "tu_url_api"; // Reemplaza con tu URL

  async consultarLicenciaPorDocumento(
    documento: string
  ): Promise<RespuestaLicencia> {
    try {
      const response = await fetch(`${this.apiUrl}/licencia/${documento}`);
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  isLicenciaVigente(fechaVencimiento?: string): boolean {
    if (!fechaVencimiento) return false;
    return new Date(fechaVencimiento) > new Date();
  }

  diasParaVencer(fechaVencimiento?: string): number {
    if (!fechaVencimiento) return 0;
    const vencimiento = new Date(fechaVencimiento);
    const hoy = new Date();
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }
}

export default new LicenciaService();
