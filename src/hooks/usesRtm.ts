// src/hooks/usesRtm.ts

import { useState, useEffect, useCallback } from "react";
import rtmService from "../services/rtmService";
import { useDocumentosVigenciaStore } from "../store/DocumentosVigenciaStore";
import type { RespuestaTecnicomecanica } from "../assets/types/tecnicomecanica.types";
import logger from "../utils/logger";

interface UseRTMReturn {
  rtm: RespuestaTecnicomecanica | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  esRTMVigente: boolean;
  diasParaVencerRTM: number;
}

export function useRTM(
  placa: string | null,
  habilitado: boolean = true
): UseRTMReturn {
  const [rtm, setRTM] = useState<RespuestaTecnicomecanica | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { necesitaFetchRTM, guardarRTM, getRTM } =
    useDocumentosVigenciaStore();

  // Inicializar desde cache al montar (sin spinner)
  useEffect(() => {
    if (!placa || !habilitado) return;
    const cache = getRTM(placa);
    if (cache && !necesitaFetchRTM(placa)) {
      logger.log(`🔧 RTM desde cache para ${placa}:`, cache.fechaVencimiento);
      setRTM({
        exito: true,
        rtm: { fechaVigente: cache.fechaVencimiento } as any,
        timestamp: cache.fetchedAt,
      } as RespuestaTecnicomecanica);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const consultarRTM = useCallback(
    async (forzar: boolean = false) => {
      if (!placa || !habilitado) return;

      // ── Usar cache si es válido ────────────────────────────────────────
      if (!forzar && !necesitaFetchRTM(placa)) {
        const cache = getRTM(placa);
        if (cache) {
          logger.log(`🔧 RTM cache válido para ${placa}, sin fetch`);
          setRTM({
            exito: true,
            rtm: { fechaVigente: cache.fechaVencimiento } as any,
            timestamp: cache.fetchedAt,
          } as RespuestaTecnicomecanica);
          setError(null);
          return;
        }
      }

      // ── Llamar a la API ────────────────────────────────────────────────
      setCargando(true);
      setError(null);

      try {
        logger.log(`🔧 Consultando RTM API para placa: ${placa}`);

        const respuesta = await rtmService.consultarRTMporPlaca(placa);

        if (respuesta.exito) {
          setRTM(respuesta);

          const fechaVigente = respuesta.rtm?.fechaVigente;
          if (fechaVigente) {
            guardarRTM(placa, fechaVigente);
            logger.log(`✅ RTM cacheado para ${placa}:`, fechaVigente);
          }
        } else {
          setError(respuesta.error || "Error desconocido");
          logger.error("❌ Error en consulta RTM:", respuesta.error);
        }
      } catch (err: any) {
        const errorMsg = err?.message || "Error al consultar RTM";
        setError(errorMsg);
        logger.error("❌ Error en useRTM:", err);
      } finally {
        setCargando(false);
      }
    },
    [placa, habilitado, necesitaFetchRTM, guardarRTM, getRTM]
  );

  useEffect(() => {
    consultarRTM(false);
  }, [placa, habilitado]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(async () => {
    await consultarRTM(true);
  }, [consultarRTM]);

  const esRTMVigente = rtmService.isRTMVigente(rtm?.rtm?.fechaVigente);
  const diasParaVencerRTM = rtmService.diasParaVencer(rtm?.rtm?.fechaVigente);

  return {
    rtm,
    cargando,
    error,
    recargar,
    esRTMVigente,
    diasParaVencerRTM,
  };
}
