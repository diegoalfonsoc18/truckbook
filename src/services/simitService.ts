// src/services/simitService.ts

import type { RespuestaMultas, Multa } from "../assets/types/simit.types";

class SimitService {
  // Dataset que funciona correctamente
  private readonly BASE_URL =
    "https://www.datos.gov.co/resource/72nf-y4v3.json";

  private cache: Map<string, { data: RespuestaMultas; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hora

  private normalizarPlaca(placa: string): string {
    return placa.trim().toUpperCase().replace(/\s+/g, "");
  }

  private obtenerDesdeCache(placa: string): RespuestaMultas | null {
    const cacheKey = this.normalizarPlaca(placa);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const ahora = Date.now();
      if (ahora - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }
    return null;
  }

  private guardarEnCache(placa: string, data: RespuestaMultas): void {
    const cacheKey = this.normalizarPlaca(placa);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  async consultarPorPlaca(
    placa: string,
    usarCache: boolean = true
  ): Promise<RespuestaMultas> {
    try {
      if (!placa || placa.trim().length === 0) {
        return {
          exito: false,
          cantidad: 0,
          multas: [],
          multasPendientes: 0,
          valorTotal: 0,
          error: "La placa es requerida",
          timestamp: new Date().toISOString(),
        };
      }

      const placaNormalizada = this.normalizarPlaca(placa);

      // Verificar cache
      if (usarCache) {
        const datosCacheados = this.obtenerDesdeCache(placaNormalizada);
        if (datosCacheados) {
          return datosCacheados;
        }
      }

      // Consultar API con SoQL
      const whereClause = `placa='${placaNormalizada}'`;
      const url = `${this.BASE_URL}?$where=${encodeURIComponent(whereClause)}&$limit=500`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const multas: Multa[] = await response.json();

      // Calcular estadisticas
      let multasPendientes = 0;
      let valorTotal = 0;

      multas.forEach((multa) => {
        const estado = multa.estado?.toUpperCase() || "";

        // Considerar pendiente si el estado contiene estas palabras
        if (
          estado.includes("PENDIENTE") ||
          estado.includes("VIGENTE") ||
          estado.includes("NOTIFICADO") ||
          estado === ""
        ) {
          multasPendientes++;
        }

        // Calcular valor total
        try {
          const valor =
            typeof multa.valor === "string"
              ? parseFloat(multa.valor.replace(/[^0-9.-]/g, ""))
              : Number(multa.valor);

          if (!isNaN(valor) && valor > 0) {
            valorTotal += valor;
          }
        } catch (e) {
          // Ignorar errores de parseo
        }
      });

      const resultado: RespuestaMultas = {
        exito: true,
        placa: placaNormalizada,
        cantidad: multas.length,
        multas,
        multasPendientes,
        valorTotal,
        timestamp: new Date().toISOString(),
      };

      // Guardar en cache
      this.guardarEnCache(placaNormalizada, resultado);

      return resultado;
    } catch (error) {
      return {
        exito: false,
        placa: this.normalizarPlaca(placa),
        cantidad: 0,
        multas: [],
        multasPendientes: 0,
        valorTotal: 0,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      };
    }
  }

  limpiarCache(): void {
    this.cache.clear();
  }
}

export const simitService = new SimitService();
