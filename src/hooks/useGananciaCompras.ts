import { useMemo } from "react";
import { useGastosStore } from "../store/GastosStore";
import { useIngresosStore } from "../store/IngresosStore";
import { esCompra } from "../Screens/FinanzasGeneral/finanzasUtils";
import { calcularGanancias, type ResultadoGanancia } from "../utils/comprasGanancia";

/**
 * Ganancia por grupo de compras↔ingresos ligados, calculada sobre los stores
 * en vivo (ya aislados por conductor_id). Ignora ids de ingresos inexistentes.
 */
export function useGananciaCompras(conductorId?: string | null): ResultadoGanancia {
  const gastos = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);
  return useMemo(
    () =>
      calcularGanancias(
        gastos.filter(
          (g) =>
            esCompra(g) &&
            (!conductorId || g.conductor_id === conductorId) &&
            (g.ingreso_ids?.length ?? 0) > 0,
        ),
        ingresos.filter((i) => !conductorId || i.conductor_id === conductorId),
      ),
    [gastos, ingresos, conductorId],
  );
}
