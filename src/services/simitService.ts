// src/services/simitService.ts

import type {
  RespuestaMultas,
  Multa,
  ApitudeResponse,
  ApitudeResolucion,
} from "../assets/types/simit.types";

// ⚠️ Colocar tu API key de Apitude aquí
const APITUDE_API_KEY = ""; // TODO: agregar API key

class SimitService {
  // Apitude SIMIT-CO (datos en tiempo real)
  private readonly APITUDE_URL =
    "https://apitude.co/api/v1.0/requests/simit-co/";

  // datos.gov.co (fallback histórico)
  private readonly DATOS_GOV_URL =
    "https://www.datos.gov.co/resource/72nf-y4v3.json";

  private cache: Map<string, { data: RespuestaMultas; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

  private obtenerDesdeCache(key: string): RespuestaMultas | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) this.cache.delete(key);
    return null;
  }

  private guardarEnCache(key: string, data: RespuestaMultas): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private parseValor(valor: any): number {
    if (!valor) return 0;
    const numero =
      typeof valor === "string"
        ? parseFloat(valor.replace(/[^0-9.-]/g, ""))
        : Number(valor);
    return isNaN(numero) ? 0 : numero;
  }

  // ============================
  // APITUDE (TIEMPO REAL)
  // ============================

  async consultarPorCedula(
    cedula: string,
    usarCache: boolean = true
  ): Promise<RespuestaMultas> {
    const cedulaLimpia = cedula.trim();
    const cacheKey = `apitude_${cedulaLimpia}`;

    if (usarCache) {
      const cached = this.obtenerDesdeCache(cacheKey);
      if (cached) return cached;
    }

    // Si no hay API key, ir directo a fallback
    if (!APITUDE_API_KEY) {
      return {
        exito: false,
        cedula: cedulaLimpia,
        cantidad: 0,
        multas: [],
        multasPendientes: 0,
        multasPagadas: 0,
        valorTotal: 0,
        valorPendiente: 0,
        error: "API key de Apitude no configurada",
        timestamp: new Date().toISOString(),
        fuente: "apitude",
      };
    }

    try {
      // 1. Crear solicitud
      const postResponse = await fetch(this.APITUDE_URL, {
        method: "POST",
        headers: {
          "x-api-key": APITUDE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_type: "cedula",
          document_number: cedulaLimpia,
        }),
      });

      if (!postResponse.ok) {
        throw new Error(`Error al crear solicitud: ${postResponse.status}`);
      }

      const postData = await postResponse.json();
      const requestId = postData.request_id;

      if (!requestId) {
        throw new Error("No se recibió request_id");
      }

      // 2. Poll para obtener resultado (max 30 segundos)
      let resultado: ApitudeResponse | null = null;
      const maxIntentos = 15;
      for (let i = 0; i < maxIntentos; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const getResponse = await fetch(`${this.APITUDE_URL}${requestId}/`, {
          method: "GET",
          headers: {
            "x-api-key": APITUDE_API_KEY,
            "Content-Type": "application/json",
          },
        });

        if (getResponse.ok) {
          const getData: ApitudeResponse = await getResponse.json();
          if (getData.result?.status === 200 || getData.result?.status === 404) {
            resultado = getData;
            break;
          }
          // Si status es otro, seguir esperando
          if (getData.result?.data) {
            resultado = getData;
            break;
          }
        }
      }

      if (!resultado) {
        throw new Error("Tiempo de espera agotado");
      }

      if (resultado.result?.status === 404) {
        const res: RespuestaMultas = {
          exito: true,
          cedula: cedulaLimpia,
          cantidad: 0,
          multas: [],
          multasPendientes: 0,
          multasPagadas: 0,
          valorTotal: 0,
          valorPendiente: 0,
          esDeudor: false,
          timestamp: new Date().toISOString(),
          fuente: "apitude",
        };
        this.guardarEnCache(cacheKey, res);
        return res;
      }

      // 3. Parsear resoluciones
      const resoluciones =
        resultado.result?.data?.tables?.resoluciones || [];
      const esDeudor = resultado.result?.data?.debtor || false;

      const multas: Multa[] = resoluciones.map(
        (r: ApitudeResolucion) => ({
          comparendo: r.comparendo,
          infraccion: r.infraccion,
          valor: this.parseValor(r.valor_multa),
          interesMora: this.parseValor(r.interes_mora),
          valorAdicional: this.parseValor(r.valor_adicional),
          fechaComparendo: r.fecha_comparendo,
          fechaResolucion: r.fecha_resolucion,
          estado: r.estado,
          secretaria: r.secretaria,
          nombreInfractor: r.nombre_infractor,
          resolucion: r.resolucion,
          fuente: "apitude" as const,
        })
      );

      let multasPendientes = 0;
      let multasPagadas = 0;
      let valorTotal = 0;
      let valorPendiente = 0;

      multas.forEach((m) => {
        const val = (m.valor || 0) + (m.interesMora || 0) + (m.valorAdicional || 0);
        valorTotal += val;
        const estadoUpper = (m.estado || "").toUpperCase();
        if (
          estadoUpper.includes("PAGAD") ||
          estadoUpper.includes("CANCELAD")
        ) {
          multasPagadas++;
        } else {
          multasPendientes++;
          valorPendiente += val;
        }
      });

      const res: RespuestaMultas = {
        exito: true,
        cedula: cedulaLimpia,
        cantidad: multas.length,
        multas,
        multasPendientes,
        multasPagadas,
        valorTotal,
        valorPendiente,
        esDeudor,
        timestamp: new Date().toISOString(),
        fuente: "apitude",
      };

      this.guardarEnCache(cacheKey, res);
      return res;
    } catch (error) {
      return {
        exito: false,
        cedula: cedulaLimpia,
        cantidad: 0,
        multas: [],
        multasPendientes: 0,
        multasPagadas: 0,
        valorTotal: 0,
        valorPendiente: 0,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
        fuente: "apitude",
      };
    }
  }

  // ============================
  // DATOS.GOV.CO (FALLBACK)
  // ============================

  async consultarPorPlaca(
    placa: string,
    usarCache: boolean = true
  ): Promise<RespuestaMultas> {
    const placaNormalizada = placa.trim().toUpperCase().replace(/\s+/g, "");
    const cacheKey = `datosgovco_${placaNormalizada}`;

    if (!placa || placa.trim().length === 0) {
      return {
        exito: false,
        cantidad: 0,
        multas: [],
        multasPendientes: 0,
        multasPagadas: 0,
        valorTotal: 0,
        valorPendiente: 0,
        error: "La placa es requerida",
        timestamp: new Date().toISOString(),
        fuente: "datosgovco",
      };
    }

    if (usarCache) {
      const cached = this.obtenerDesdeCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const url = `${this.DATOS_GOV_URL}?placa=${placaNormalizada}&$limit=500`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const rawMultas: any[] = await response.json();

      let multasPendientes = 0;
      let multasPagadas = 0;
      let valorTotal = 0;
      let valorPendiente = 0;

      const multas: Multa[] = rawMultas.map((m) => {
        const valor = this.parseValor(m.valor_multa);
        valorTotal += valor;
        const pagada =
          (m.pagado_si_no || "").toUpperCase().trim() === "SI" ||
          (m.pagado_si_no || "").toUpperCase().trim() === "SÍ";

        if (pagada) {
          multasPagadas++;
        } else {
          multasPendientes++;
          valorPendiente += valor;
        }

        return {
          fechaComparendo: m.fecha_multa,
          valor,
          estado: pagada ? "PAGADA" : "PENDIENTE",
          ciudad: m.ciudad,
          departamento: m.departamento,
          placa: m.placa,
          vigencia: m.vigencia,
          pagadoSiNo: m.pagado_si_no,
          fuente: "datosgovco" as const,
        };
      });

      const resultado: RespuestaMultas = {
        exito: true,
        placa: placaNormalizada,
        cantidad: multas.length,
        multas,
        multasPendientes,
        multasPagadas,
        valorTotal,
        valorPendiente,
        timestamp: new Date().toISOString(),
        fuente: "datosgovco",
      };

      this.guardarEnCache(cacheKey, resultado);
      return resultado;
    } catch (error) {
      return {
        exito: false,
        placa: placaNormalizada,
        cantidad: 0,
        multas: [],
        multasPendientes: 0,
        multasPagadas: 0,
        valorTotal: 0,
        valorPendiente: 0,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
        fuente: "datosgovco",
      };
    }
  }

  // ============================
  // CONSULTA INTELIGENTE
  // Usa Apitude si hay API key + cédula, sino datos.gov.co por placa
  // ============================

  async consultar(
    params: { cedula?: string; placa?: string },
    usarCache: boolean = true
  ): Promise<RespuestaMultas> {
    // Intentar Apitude primero si hay cédula y API key
    if (params.cedula && APITUDE_API_KEY) {
      const resultado = await this.consultarPorCedula(
        params.cedula,
        usarCache
      );
      if (resultado.exito) return resultado;
    }

    // Fallback a datos.gov.co por placa
    if (params.placa) {
      return this.consultarPorPlaca(params.placa, usarCache);
    }

    return {
      exito: false,
      cantidad: 0,
      multas: [],
      multasPendientes: 0,
      multasPagadas: 0,
      valorTotal: 0,
      valorPendiente: 0,
      error: "Se requiere cédula o placa para consultar",
      timestamp: new Date().toISOString(),
    };
  }

  limpiarCache(): void {
    this.cache.clear();
  }

  tieneApiKey(): boolean {
    return !!APITUDE_API_KEY;
  }
}

export const simitService = new SimitService();
