// src/Screens/conductor/ConductorHome.tsx
import React, { useEffect, useMemo } from "react";
import HomeBaseAdapted from "../Home/Home";
import { items as baseItems, Item } from "../Home/Items";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore, Gasto } from "../../store/GastosStore";
import { useIngresosStore, Ingreso } from "../../store/IngresosStore";
import { registrarPushToken } from "../../services/NotificationService";
import {
  fmtI,
  fechaLocalHoy,
  inicioSemana,
  diasDesde,
  labelDias,
} from "../Home/homeUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** "Hoy" / "Ayer" / "Hace N días" a partir de una fecha ISO o YYYY-MM-DD */
const hace = (f?: string | null) =>
  f ? labelDias(diasDesde(f.slice(0, 10))) : undefined;

/** % de cambio vs periodo anterior; null si no hay base de comparación */
function pctCambio(actual: number, anterior: number): number | null {
  if (anterior > 0) return Math.round(((actual - anterior) / anterior) * 100);
  return actual > 0 ? null : 0;
}

// ─── Cálculo de stats ──────────────────────────────────────────────────────────
function useGastosStats(gastosAll: Gasto[], ingresosAll: Ingreso[], placa: string | null) {
  return useMemo(() => {
    // El store puede tener filas de varias placas en caché — solo contar la activa
    const gastos   = placa ? gastosAll.filter((g) => g.placa === placa) : [];
    const ingresos = placa ? ingresosAll.filter((i) => i.placa === placa) : [];

    const hace7  = inicioSemana();  // lunes de la semana actual
    const hace14 = inicioSemana(1); // lunes de la semana anterior
    const mesStr = fechaLocalHoy().slice(0, 7) + "-01"; // primer día del mes

    const fechaGasto = (g: Gasto) => (g.fecha ?? g.created_at ?? "").slice(0, 10);

    const sumByTipo = (tipos: string[], desde: string, hasta?: string) =>
      gastos
        .filter((g) => {
          const f = fechaGasto(g);
          return tipos.includes(g.tipo_gasto) && f >= desde && (!hasta || f < hasta);
        })
        .reduce((acc, g) => acc + (g.monto ?? 0), 0);

    const countByTipo = (tipos: string[], desde: string) =>
      gastos.filter((g) => tipos.includes(g.tipo_gasto) && fechaGasto(g) >= desde).length;

    const lastOf = (tipos: string[]) =>
      gastos
        .filter((g) => tipos.includes(g.tipo_gasto))
        .sort((a, b) => fechaGasto(b).localeCompare(fechaGasto(a)))[0];

    // ── Combustible ────────────────────────────────────────────────────────────
    const combSem  = sumByTipo(["Combustible"], hace7);
    const combAnt  = sumByTipo(["Combustible"], hace14, hace7);
    const combTrend = pctCambio(combSem, combAnt);
    const lastComb  = lastOf(["Combustible"]);

    // ── Peajes ─────────────────────────────────────────────────────────────────
    const peajesSem   = sumByTipo(["Peajes"], hace7);
    const peajesAnt   = sumByTipo(["Peajes"], hace14, hace7);
    const peajesTrend = pctCambio(peajesSem, peajesAnt);
    const peajesCount = countByTipo(["Peajes"], hace7);
    const lastPeaje   = lastOf(["Peajes"]);

    // ── Mantenimiento ──────────────────────────────────────────────────────────
    const mantTipos = ["Reparación", "Llantas", "Aceite", "Taller", "Lavado"];
    const mantMes   = sumByTipo(mantTipos, mesStr);
    const lastMant  = lastOf(mantTipos);

    // ── Viajes (fletes desde IngresosStore) ────────────────────────────────────
    const fechaIng = (i: Ingreso) => (i.fecha ?? i.created_at ?? "").slice(0, 10);
    const fletes = ingresos.filter((i) => i.tipo_ingreso === "Flete");
    const fletesSem = fletes.filter((i) => fechaIng(i) >= hace7);
    const fletesAnt = fletes.filter((i) => fechaIng(i) >= hace14 && fechaIng(i) < hace7);
    const viajesSem   = fletesSem.reduce((a, i) => a + (i.cantidad ?? 1), 0);
    const viajesAnt   = fletesAnt.reduce((a, i) => a + (i.cantidad ?? 1), 0);
    const totalFleteSem = fletesSem.reduce((a, i) => a + (i.monto ?? 0) * (i.cantidad ?? 1), 0);
    const promFlete = viajesSem > 0 ? Math.round(totalFleteSem / viajesSem) : 0;
    const viajesTrend = pctCambio(viajesSem, viajesAnt);
    const lastViaje = [...fletes].sort((a, b) => fechaIng(b).localeCompare(fechaIng(a)))[0];

    // ── Comida ─────────────────────────────────────────────────────────────────
    const comidaSem  = sumByTipo(["Comida"], hace7);
    const comidaAnt  = sumByTipo(["Comida"], hace14, hace7);
    const comidaTrend = pctCambio(comidaSem, comidaAnt);
    const lastComida  = lastOf(["Comida"]);

    return { combSem, combTrend, lastComb, peajesSem, peajesTrend, peajesCount, lastPeaje, mantMes, lastMant, viajesSem, viajesTrend, promFlete, lastViaje, comidaSem, comidaTrend, lastComida };
  }, [gastosAll, ingresosAll, placa]);
}

// ─── Formateo de trend ────────────────────────────────────────────────────────
function trendLabel(pct: number | null, cero: string): string {
  if (pct === null) return "Sem. ant. sin registros";
  if (pct === 0) return cero;
  const arrow = pct > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct)}% vs sem. ant.`;
}

// ─── Score de gasto semanal (más gasto = peor score) ─────────────────────────
function spendScore(trend: number | null): number {
  return Math.max(5, Math.min(100, 100 - (trend ?? 0) * 1.5));
}

// ─── ConductorHome ────────────────────────────────────────────────────────────
export default function ConductorHome() {
  const { user } = useAuth();
  const placa    = useVehiculoStore((s) => s.placa);
  const gastos   = useGastosStore((s) => s.gastos);
  const ingresos = useIngresosStore((s) => s.ingresos);

  const { combSem, combTrend, lastComb, peajesSem, peajesTrend, peajesCount, lastPeaje, mantMes, lastMant, viajesSem, viajesTrend, promFlete, lastViaje, comidaSem, comidaTrend, lastComida } =
    useGastosStats(gastos, ingresos, placa);

  useEffect(() => {
    if (!user?.id) return;
    registrarPushToken(user.id);
  }, [user?.id]);

  // ─── Items con datos dinámicos de GastosStore ─────────────────────────────
  const conductorItems: Item[] = baseItems.map((item) => {
    switch (item.id) {
      case "combustible":
        return {
          ...item,
          sublabel:        fmtI(combSem),
          trend:           trendLabel(combTrend, "Sin cambio"),
          trendPositive:   combTrend !== null && combTrend <= 0,
          secondarylabel:  lastComb ? `Últ: ${fmtI(lastComb.monto)}` : "Sin registros",
          tertiaryLabel:   lastComb ? hace(lastComb.fecha ?? lastComb.created_at) : undefined,
          score:           combSem > 0 ? spendScore(combTrend) : 50,
          _relevance:      combSem,
        };

      case "peajes":
        return {
          ...item,
          sublabel:        fmtI(peajesSem),
          trend:           peajesCount > 0
            ? `${peajesCount} pago${peajesCount !== 1 ? "s" : ""} esta sem.`
            : "Sin peajes esta sem.",
          trendPositive:   peajesTrend !== null && peajesTrend <= 0,
          secondarylabel:  lastPeaje ? `Últ: ${fmtI(lastPeaje.monto)}` : "Sin registros",
          tertiaryLabel:   lastPeaje ? hace(lastPeaje.fecha ?? lastPeaje.created_at) : undefined,
          score:           peajesSem > 0 ? spendScore(peajesTrend) : 80,
          _relevance:      peajesSem,
        };

      case "mantenimiento":
        return {
          ...item,
          sublabel:        fmtI(mantMes),
          trend:           mantMes === 0 ? "Todo en orden ✓" : "Este mes",
          trendPositive:   mantMes === 0,
          secondarylabel:  lastMant ? `Últ: ${lastMant.tipo_gasto}` : "Sin registros",
          tertiaryLabel:   lastMant ? hace(lastMant.fecha ?? lastMant.created_at) : undefined,
          score:           mantMes === 0 ? 100 : Math.max(20, 100 - Math.round((mantMes / 2_000_000) * 80)),
          _relevance:      mantMes,
        };

      case "viajes":
        return {
          ...item,
          sublabel:       `${viajesSem} viaje${viajesSem !== 1 ? "s" : ""}`,
          trend:          trendLabel(viajesTrend, "Sin cambio"),
          trendPositive:  viajesTrend === null || viajesTrend >= 0,
          secondarylabel: promFlete > 0 ? `Prom: ${fmtI(promFlete)}` : "Sin fletes",
          tertiaryLabel:  lastViaje ? hace(lastViaje.fecha ?? lastViaje.created_at) : undefined,
          score:          viajesSem > 0 ? Math.min(100, 30 + viajesSem * 10) : 5,
          _relevance:     viajesSem * 50_000, // equipara escala con gastos en pesos
        };

      case "comida":
        return {
          ...item,
          sublabel:        fmtI(comidaSem),
          trend:           trendLabel(comidaTrend, "Sin cambio"),
          trendPositive:   comidaTrend !== null && comidaTrend <= 0,
          secondarylabel:  lastComida ? `Últ: ${fmtI(lastComida.monto)}` : "Sin registros",
          tertiaryLabel:   lastComida ? hace(lastComida.fecha ?? lastComida.created_at) : undefined,
          score:           comidaSem > 0 ? spendScore(comidaTrend) : 50,
          _relevance:      comidaSem,
        };

      default:
        return item;
    }
  }).sort((a, b) => (b._relevance ?? 0) - (a._relevance ?? 0));

  return (
    <HomeBaseAdapted
      items={conductorItems}
      showCamionHeader={true}
      onItemPress={() => {}} // cards son solo informativos por ahora
    />
  );
}
