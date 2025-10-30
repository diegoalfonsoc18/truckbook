// src/services/soatService.ts (CORREGIDO)

import axios from "axios";
import type { RespuestaSOAT, VehiculoSOAT } from "../assets/types/Soat.types";

const API_BASE_URL = "https://tu-api.com/api"; // ✅ REEMPLAZAR CON TU API

class SOATService {
  /**
   * Consultar SOAT de un vehículo por placa
   */
  async consultarSOATporPlaca(placa: string): Promise<RespuestaSOAT> {
    try {
      const response = await axios.get<RespuestaSOAT>(
        `${API_BASE_URL}/soat/placa`,
        {
          params: { placa: placa.toUpperCase() },
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Error consultando SOAT:", error);

      return {
        exito: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Error al consultar SOAT",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Consultar SOAT por VIN
   */
  async consultarSOATporVin(vin: string): Promise<RespuestaSOAT> {
    try {
      const response = await axios.get<RespuestaSOAT>(
        `${API_BASE_URL}/soat/vin`,
        {
          params: { vin },
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Error consultando SOAT por VIN:", error);

      return {
        exito: false,
        error:
          error?.response?.data?.error ||
          error?.message ||
          "Error al consultar SOAT",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validar si SOAT está vigente
   * ✅ MÉTODO DE INSTANCIA (no estático)
   */
  isSOATVigente(fechaVencimiento: string | undefined): boolean {
    if (!fechaVencimiento) return false;

    try {
      const vencimiento = new Date(fechaVencimiento);
      const hoy = new Date();
      return vencimiento > hoy;
    } catch {
      return false;
    }
  }

  /**
   * Calcular días para vencer
   * ✅ MÉTODO DE INSTANCIA (no estático)
   */
  diasParaVencer(fechaVencimiento: string | undefined): number {
    if (!fechaVencimiento) return -1;

    try {
      const vencimiento = new Date(fechaVencimiento);
      const hoy = new Date();
      const diferencia = vencimiento.getTime() - hoy.getTime();
      const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
      return dias;
    } catch {
      return -1;
    }
  }

  /**
   * Obtener estado de alerta del SOAT
   * ✅ MÉTODO DE INSTANCIA (no estático)
   */
  getStatusSOAT(
    fechaVencimiento: string | undefined
  ): "vigente" | "proximo_a_vencer" | "vencido" {
    const dias = this.diasParaVencer(fechaVencimiento);

    if (dias < 0) return "vencido";
    if (dias <= 30) return "proximo_a_vencer";
    return "vigente";
  }
}

// ✅ EXPORTAR INSTANCIA
export default new SOATService();
