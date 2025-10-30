// src/hooks/useSOAT.ts

import { useState, useEffect, useCallback } from "react";
import soatService from "../services/Soatservice";
import type {
  RespuestaSOAT,
  VehiculoSOAT,
  SOAT,
} from "../assets/types/Soat.types";

interface UseSOATReturn {
  soat: RespuestaSOAT | null;
  vehiculo: VehiculoSOAT | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  esSOATVigente: boolean;
  esRTMVigente: boolean;
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

  const consultarSOAT = useCallback(async () => {
    if (!placa || !habilitado) return;

    setCargando(true);
    setError(null);

    try {
      console.log(`📋 Consultando SOAT para placa: ${placa}`);

      const respuesta = await soatService.consultarSOATporPlaca(placa);

      if (respuesta.exito) {
        setSOAT(respuesta);
        setVehiculo(respuesta.vehiculo || null);
        console.log("✅ SOAT consultado exitosamente:", respuesta);
      } else {
        setError(respuesta.error || "Error desconocido");
        console.error("❌ Error en consulta SOAT:", respuesta.error);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Error al consultar SOAT";
      setError(errorMsg);
      console.error("❌ Error en useSOAT:", err);
    } finally {
      setCargando(false);
    }
  }, [placa, habilitado]);

  useEffect(() => {
    consultarSOAT();
  }, [placa, habilitado, consultarSOAT]);

  const esSOATVigente = soatService.isSOATVigente(soat?.soat?.fechaVencimiento);
  const diasParaVencerSOAT = soatService.diasParaVencer(
    soat?.soat?.fechaVencimiento
  );

  const esRTMVigente = soat?.rtm?.esVigente || false;

  return {
    soat,
    vehiculo,
    cargando,
    error,
    recargar: consultarSOAT,
    esSOATVigente,
    esRTMVigente,
    diasParaVencerSOAT,
  };
}
