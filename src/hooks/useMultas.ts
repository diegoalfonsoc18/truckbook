// src/hooks/useMultas.ts
//
// autoCargar:
//   - true  → consulta automática (solo si nunca se ha consultado esta placa)
//   - false → no hace nada al montar; la pantalla llama recargar() manualmente

import { useState, useEffect, useCallback } from "react";
import { simitService } from "../services/simitService";
import { useDocumentosVigenciaStore } from "../store/DocumentosVigenciaStore";
import type { RespuestaMultas } from "../assets/types/simit.types";

interface UseMultasReturn {
  multas: RespuestaMultas | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  tieneMultasPendientes: boolean;
  cantidadPendientes: number;
}

export function useMultas(
  placa: string | null,
  autoCargar: boolean = false
): UseMultasReturn {
  const [multas, setMultas] = useState<RespuestaMultas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { necesitaFetchMultas, registrarFetchMultas } =
    useDocumentosVigenciaStore();

  const cargarMultas = useCallback(
    async (forzarRecarga: boolean = false) => {
      if (!placa || placa.trim().length === 0) {
        setMultas(null);
        setError(null);
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const resultado = await simitService.consultarPorPlaca(
          placa,
          !forzarRecarga
        );

        if (resultado.exito) {
          setMultas(resultado);
          setError(null);
          // Registrar que ya se hizo al menos una consulta para esta placa
          registrarFetchMultas(placa);
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
    },
    [placa, registrarFetchMultas]
  );

  useEffect(() => {
    // Solo auto-carga si está habilitado Y es la primera vez (nunca se ha consultado)
    if (autoCargar && placa && necesitaFetchMultas(placa)) {
      cargarMultas(false);
    }
  }, [placa, autoCargar]); // eslint-disable-line react-hooks/exhaustive-deps

  const recargar = useCallback(async () => {
    await cargarMultas(true);
  }, [cargarMultas]);

  return {
    multas,
    cargando,
    error,
    recargar,
    tieneMultasPendientes: (multas?.multasPendientes || 0) > 0,
    cantidadPendientes: multas?.multasPendientes || 0,
  };
}
