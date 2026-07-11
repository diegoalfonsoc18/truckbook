// src/services/reporteService.ts
// Consulta puntual por rango de fechas para Reportes/Exportar informe.
//
// A diferencia del store en vivo (DataProvider, tope 200 registros recientes por
// placa para no inflar el caché cifrado), esto trae TODAS las transacciones del
// rango pedido directo de Supabase — sin cachear. Así los informes anuales o de
// rangos amplios no se quedan cortos. Requiere conexión (exportar ya la requiere).
import supabase from "../config/SupaBaseConfig";
import type { Gasto } from "../store/GastosStore";
import type { Ingreso } from "../store/IngresosStore";
import logger from "../utils/logger";

// Tope de seguridad muy por encima del uso real de un solo camión en un rango;
// evita traer una cantidad patológica de filas por un rango mal formado.
const MAX_ROWS = 5000;

export interface RangoTransacciones {
  gastos: Gasto[];
  ingresos: Ingreso[];
  error: boolean; // true si falló la consulta (p. ej. sin conexión)
}

/**
 * Trae gastos e ingresos de una placa+conductor en el rango [inicio, fin]
 * (fechas YYYY-MM-DD, inclusivas). Ordenados por fecha descendente.
 */
export async function fetchTransaccionesRango(
  placa: string,
  conductorId: string,
  inicio: string,
  fin: string,
): Promise<RangoTransacciones> {
  try {
    const [g, i] = await Promise.all([
      supabase
        .from("conductor_gastos")
        .select("*")
        .eq("placa", placa)
        .eq("conductor_id", conductorId)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false })
        .limit(MAX_ROWS),
      supabase
        .from("conductor_ingresos")
        .select("*")
        .eq("placa", placa)
        .eq("conductor_id", conductorId)
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order("fecha", { ascending: false })
        .limit(MAX_ROWS),
    ]);

    if (g.error || i.error) {
      logger.warn(
        "⚠️ fetchTransaccionesRango:",
        g.error?.message ?? i.error?.message,
      );
      return { gastos: [], ingresos: [], error: true };
    }
    return {
      gastos: (g.data ?? []) as Gasto[],
      ingresos: (i.data ?? []) as Ingreso[],
      error: false,
    };
  } catch (err: any) {
    logger.warn("⚠️ fetchTransaccionesRango catch:", err?.message ?? err);
    return { gastos: [], ingresos: [], error: true };
  }
}
