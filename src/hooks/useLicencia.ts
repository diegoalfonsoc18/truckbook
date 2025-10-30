// src/hooks/useLicencia.ts

import { useState, useEffect, useCallback } from "react";
import licenciaService from "../services/licenciaService";
import type { RespuestaLicencia } from "../assets/types/licencia.types";

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

  const consultarLicencia = useCallback(async () => {
    if (!documento || !habilitado) return;

    setCargando(true);
    setError(null);

    try {
      console.log(`📋 Consultando licencia para documento: ${documento}`);

      const respuesta =
        await licenciaService.consultarLicenciaPorDocumento(documento);

      if (respuesta.exito) {
        setLicencia(respuesta);
        console.log("✅ Licencia consultada exitosamente:", respuesta);
      } else {
        setError(respuesta.error || "Error desconocido");
        console.error("❌ Error en consulta licencia:", respuesta.error);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Error al consultar licencia";
      setError(errorMsg);
      console.error("❌ Error en useLicencia:", err);
    } finally {
      setCargando(false);
    }
  }, [documento, habilitado]);

  useEffect(() => {
    consultarLicencia();
  }, [documento, habilitado, consultarLicencia]);

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
    recargar: consultarLicencia,
    esLicenciaVigente,
    diasParaVencerLicencia,
  };
}
