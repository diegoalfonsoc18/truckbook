// src/hooks/useRTM.ts

import { useState, useEffect, useCallback } from "react";
import rtmService from "../services/rtmService";
import type {
  RespuestaTecnicomecanica,
  RTM,
} from "../assets/types/tecnicomecanica.types";
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

  const consultarRTM = useCallback(async () => {
    if (!placa || !habilitado) return;

    setCargando(true);
    setError(null);

    try {
      logger.log(`🔧 Consultando RTM para placa: ${placa}`);

      const respuesta = await rtmService.consultarRTMporPlaca(placa);

      if (respuesta.exito) {
        setRTM(respuesta);
        logger.log("✅ RTM consultado exitosamente:", respuesta);
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
  }, [placa, habilitado]);

  useEffect(() => {
    consultarRTM();
  }, [placa, habilitado, consultarRTM]);

  // Métodos de instancia
  const esRTMVigente = rtmService.isRTMVigente(rtm?.rtm?.fechaVigente);
  const diasParaVencerRTM = rtmService.diasParaVencer(rtm?.rtm?.fechaVigente);

  return {
    rtm,
    cargando,
    error,
    recargar: consultarRTM,
    esRTMVigente,
    diasParaVencerRTM,
  };
}
