// Combustible del mes de la placa activa: galones (gasto del mes / precio del
// galón) y variación contra el mes anterior, para el banner del Home.
import React from "react";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { usePrecioDiesel } from "../../hooks/usePrecioDiesel";

export function useCombustible() {
  const placa = useVehiculoStore((s) => s.placa);
  const gastos = useGastosStore((s) => s.gastos);
  const { precio: precioGalon } = usePrecioDiesel();

  return React.useMemo(() => {
    // Gasto de combustible por mes → galones del mes actual y variación vs. mes anterior
    const porMes = new Map<string, number>();
    for (const g of gastos) {
      if (g.placa !== placa) continue;
      if (g.tipo_gasto !== "Combustible") continue;
      const mes = (g.fecha ?? g.created_at ?? "").slice(0, 7);
      if (mes) porMes.set(mes, (porMes.get(mes) ?? 0) + (g.monto ?? 0));
    }

    const now = new Date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const gastoMes = porMes.get(mesActual) ?? 0;
    const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnterior = `${ant.getFullYear()}-${String(ant.getMonth() + 1).padStart(2, "0")}`;
    const gastoAnterior = porMes.get(mesAnterior) ?? 0;

    const galones = precioGalon > 0 ? Math.round(gastoMes / precioGalon) : 0;
    // Variación en % contra el mes anterior (null si ese mes no tiene gasto)
    const delta =
      gastoAnterior > 0
        ? Math.round(((gastoMes - gastoAnterior) / gastoAnterior) * 100)
        : null;
    // Barra: este mes frente al mayor de los dos (llena si no baja)
    const mayor = Math.max(gastoMes, gastoAnterior);
    const pct = mayor > 0 ? Math.round((gastoMes / mayor) * 100) : 0;

    return { galones, delta, pct };
  }, [gastos, precioGalon, placa]);
}
