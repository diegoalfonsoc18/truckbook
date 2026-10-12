// Combustible del mes de la placa activa: galones (gasto del mes / precio del
// galón) y ratio contra el mes pico, para la barra del Home.
import React from "react";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { usePrecioDiesel } from "../../hooks/usePrecioDiesel";

export function useCombustible() {
  const placa = useVehiculoStore((s) => s.placa);
  const gastos = useGastosStore((s) => s.gastos);
  const { precio: precioGalon } = usePrecioDiesel();

  return React.useMemo(() => {
    // Gasto de combustible por mes → galones del mes actual y ratio vs. mes pico
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
    const gastoPico = Math.max(0, ...porMes.values());

    const galones = precioGalon > 0 ? Math.round(gastoMes / precioGalon) : 0;
    const ratio = gastoPico > 0 ? gastoMes / gastoPico : 0;

    return { galones, ratio, pct: Math.round(Math.max(0, Math.min(1, ratio)) * 100) };
  }, [gastos, precioGalon, placa]);
}
