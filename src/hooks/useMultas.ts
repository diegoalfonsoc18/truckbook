// src/hooks/useMultas.ts

import { useState, useEffect } from "react";
import { simitService } from "../services/simitService";
import type { RespuestaMultas } from "../assets/types/simit.types";

interface UseMultasReturn {
  multas: RespuestaMultas | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  tieneMultasPendientes: boolean;
  cantidadPendientes: number;
}

/**
 * Hook para consultar multas de un vehículo
 */
export function useMultas(
  placa: string | null,
  autoCargar: boolean = false
): UseMultasReturn {
  const [multas, setMultas] = useState<RespuestaMultas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarMultas = async () => {
    if (!placa || placa.trim().length === 0) {
      setMultas(null);
      setError(null);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const resultado = await simitService.consultarPorPlaca(placa);

      if (resultado.exito) {
        setMultas(resultado);
        setError(null);
      } else {
        setMultas(null);
        setError(resultado.error || "Error al consultar");
      }
    } catch (err) {
      setMultas(null);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (autoCargar && placa) {
      cargarMultas();
    }
  }, [placa, autoCargar]);

  return {
    multas,
    cargando,
    error,
    recargar: cargarMultas,
    tieneMultasPendientes: (multas?.multasPendientes || 0) > 0,
    cantidadPendientes: multas?.multasPendientes || 0,
  };
}
