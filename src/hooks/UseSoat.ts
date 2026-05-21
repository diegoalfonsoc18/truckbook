// src/hooks/UseSoat.ts

import { useState, useEffect, useCallback } from "react";
import soatService from "../services/Soatservice";
import { useDocumentosVigenciaStore } from "../store/DocumentosVigenciaStore";
import type { RespuestaSOAT, VehiculoSOAT } from "../assets/types/Soat.types";
import logger from "../utils/logger";

interface UseSOATReturn {
  soat: RespuestaSOAT | null;
  vehiculo: VehiculoSOAT | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  esSOATVigente: boolean;
  diasParaVencerSOAT: number;
}

export function useSOAT(
  placa: string | null,
  habilitado: boolean = true
): UseSOATReturn {
  const [soat, setSOAT] = useState<RespuestaSOAT | null>(null);
  const [vehiculo, setVehiculo] = useState<VehiculoSOAT | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { necesitaFetchSOAT, guardarSOAT, getSOAT } =
    useDocumentosVigenciaStore();

  // Inicializar desde cache al montar (sin spinner)
  useEffect(() => {
    if (!placa || !habilitado) return;
    const cache = getSOAT(placa);
    if (cache && !necesitaFetchSOAT(placa)) {
      logger.log(`📋 SOAT desde cache para ${placa}:`, cache.fechaVencimiento);
      setSOAT({
        exito: true,
        soat: { fechaVencimiento: cache.fechaVencimiento } as any,
        timestamp: cache.fetchedAt,
      } as RespuestaSOAT);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const consultarSOAT = useCallback(
    async (forzar: boolean = false) => {
      if (!placa || !habilitado) return;

      // ── Usar cache si es válido ────────────────────────────────────────
      if (!forzar && !necesitaFetchSOAT(placa)) {
        const cache = getSOAT(placa);
        if (cache) {
          logger.log(`📋 SOAT cache válido para ${placa}, sin fetch`);
          setSOAT({
            exito: true,
            soat: { fechaVencimiento: cache.fechaVencimiento } as any,
            timestamp: cache.fetchedAt,
          } as RespuestaSOAT);
          setError(null);
          return;
        }
      }

      // ── Llamar a la API ────────────────────────────────────────────────
      setCargando(true);
      setError(null);

      try {
        logger.log(`📋 Consultando SOAT API para placa: ${placa}`);

        const respuesta = await soatService.consultarSOATporPlaca(placa);

        if (respuesta.exito) {
          setSOAT(respuesta);
          setVehiculo(respuesta.vehiculo || null);

          const fechaVenc = respuesta.soat?.fechaVencimiento;
          if (fechaVenc) {
            guardarSOAT(placa, fechaVenc);
            logger.log(`✅ SOAT cacheado para ${placa}:`, fechaVenc);
          }
        } else {
          setError(respuesta.error || "Error desconocido");
          logger.error("❌ Error en consulta SOAT:", respuesta.error);
        }
      } catch (err: any) {
        const errorMsg = err?.message || "Error al consultar SOAT";
        setError(errorMsg);
        logger.error("❌ Error en useSOAT:", err);
      } finally {
        setCargando(false);
      }
    },
    [placa, habilitado, necesitaFetchSOAT, guardarSOAT, getSOAT]
  );

  useEffect(() => {
    consultarSOAT(false);
  }, [placa, habilitado]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(async () => {
    await consultarSOAT(true);
  }, [consultarSOAT]);

  const esSOATVigente = soatService.isSOATVigente(soat?.soat?.fechaVencimiento);
  const diasParaVencerSOAT = soatService.diasParaVencer(soat?.soat?.fechaVencimiento);

  return {
    soat,
    vehiculo,
    cargando,
    error,
    recargar,
    esSOATVigente,
    diasParaVencerSOAT,
  };
}
