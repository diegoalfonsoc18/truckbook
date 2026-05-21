// src/hooks/useLicencia.ts

import { useState, useEffect, useCallback } from "react";
import licenciaService from "../services/licenciaService";
import { useDocumentosVigenciaStore } from "../store/DocumentosVigenciaStore";
import type { RespuestaLicencia } from "../assets/types/licencia.types";
import logger from "../utils/logger";

interface UseLicenciaReturn {
  licencia: RespuestaLicencia | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  esLicenciaVigente: boolean;
  diasParaVencerLicencia: number;
}

export function useLicencia(
  documento: string | null,
  habilitado: boolean = true
): UseLicenciaReturn {
  const [licencia, setLicencia] = useState<RespuestaLicencia | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { necesitaFetchLicencia, guardarLicencia, getLicencia } =
    useDocumentosVigenciaStore();

  // Inicializar desde cache al montar (sin spinner)
  useEffect(() => {
    if (!documento || !habilitado) return;
    const cache = getLicencia(documento);
    if (cache && !necesitaFetchLicencia(documento)) {
      logger.log(`📋 Licencia desde cache para ${documento}:`, cache.fechaVencimiento);
      setLicencia({
        exito: true,
        licencia: { fechaVencimiento: cache.fechaVencimiento } as any,
        timestamp: cache.fetchedAt,
      } as RespuestaLicencia);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const consultarLicencia = useCallback(
    async (forzar: boolean = false) => {
      if (!documento || !habilitado) return;

      // ── Usar cache si es válido ────────────────────────────────────────
      if (!forzar && !necesitaFetchLicencia(documento)) {
        const cache = getLicencia(documento);
        if (cache) {
          logger.log(`📋 Licencia cache válida para ${documento}, sin fetch`);
          setLicencia({
            exito: true,
            licencia: { fechaVencimiento: cache.fechaVencimiento } as any,
            timestamp: cache.fetchedAt,
          } as RespuestaLicencia);
          setError(null);
          return;
        }
      }

      // ── Llamar a la API ────────────────────────────────────────────────
      setCargando(true);
      setError(null);

      try {
        logger.log(`📋 Consultando Licencia API para documento: ${documento}`);

        const respuesta =
          await licenciaService.consultarLicenciaPorDocumento(documento);

        if (respuesta.exito) {
          setLicencia(respuesta);

          const fechaVenc = respuesta.licencia?.fechaVencimiento;
          if (fechaVenc) {
            guardarLicencia(documento, fechaVenc);
            logger.log(`✅ Licencia cacheada para ${documento}:`, fechaVenc);
          }
        } else {
          setError(respuesta.error || "Error desconocido");
          logger.error("❌ Error en consulta licencia:", respuesta.error);
        }
      } catch (err: any) {
        const errorMsg = err?.message || "Error al consultar licencia";
        setError(errorMsg);
        logger.error("❌ Error en useLicencia:", err);
      } finally {
        setCargando(false);
      }
    },
    [documento, habilitado, necesitaFetchLicencia, guardarLicencia, getLicencia]
  );

  useEffect(() => {
    consultarLicencia(false);
  }, [documento, habilitado]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(async () => {
    await consultarLicencia(true);
  }, [consultarLicencia]);

  const esLicenciaVigente = licenciaService.isLicenciaVigente(
    licencia?.licencia?.fechaVencimiento
  );
  const diasParaVencerLicencia = licenciaService.diasParaVencer(
    licencia?.licencia?.fechaVencimiento
  );

  return {
    licencia,
    cargando,
    error,
    recargar,
    esLicenciaVigente,
    diasParaVencerLicencia,
  };
}
