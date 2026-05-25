// src/Screens/conductor/ConductorHome.tsx
import React, { useEffect, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import HomeBaseAdapted from "../Home/Home";
import { items as baseItems, Item } from "../Home/Items";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore, Gasto } from "../../store/GastosStore";
import { registrarPushToken } from "../../services/NotificationService";

// ─── Helpers de formato ────────────────────────────────────────────────────────
function fmtCOP(amount: number): string {
  if (amount === 0) return "$0";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}

function diasAtras(fecha: string): string {
  const partes = fecha.slice(0, 10).split("-").map(Number);
  const d = new Date(partes[0], partes[1] - 1, partes[2]);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((hoy.getTime() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return `Hace ${diff} días`;
}

function dateStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

// ─── Cálculo de stats de gastos ────────────────────────────────────────────────
function useGastosStats(gastos: Gasto[]) {
  return useMemo(() => {
    const hace7  = dateStr(6);   // últimos 7 días (incluye hoy)
    const hace14 = dateStr(13);  // 7 días anteriores
    const mesStr = dateStr(0).slice(0, 7) + "-01"; // primer día del mes

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
    const combTrend = combAnt > 0 ? Math.round(((combSem - combAnt) / combAnt) * 100) : 0;
    const lastComb  = lastOf(["Combustible"]);

    // ── Peajes ─────────────────────────────────────────────────────────────────
    const peajesSem   = sumByTipo(["Peajes"], hace7);
    const peajesAnt   = sumByTipo(["Peajes"], hace14, hace7);
    const peajesTrend = peajesAnt > 0 ? Math.round(((peajesSem - peajesAnt) / peajesAnt) * 100) : 0;
    const peajesCount = countByTipo(["Peajes"], hace7);
    const lastPeaje   = lastOf(["Peajes"]);

    // ── Mantenimiento ──────────────────────────────────────────────────────────
    const mantTipos = ["Reparación", "Llantas", "Aceite", "Taller"];
    const mantMes   = sumByTipo(mantTipos, mesStr);
    const lastMant  = lastOf(mantTipos);

    return { combSem, combTrend, lastComb, peajesSem, peajesTrend, peajesCount, lastPeaje, mantMes, lastMant };
  }, [gastos]);
}

// ─── Formateo de trend ────────────────────────────────────────────────────────
function trendLabel(pct: number, cero: string): string {
  if (pct === 0) return cero;
  const arrow = pct > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct)}% vs sem. ant.`;
}

// ─── Score de gasto semanal (más gasto = peor score) ─────────────────────────
function spendScore(trend: number): number {
  return Math.max(5, Math.min(100, 100 - trend * 1.5));
}

// ─── ConductorHome ────────────────────────────────────────────────────────────
export default function ConductorHome() {
  const navigation = useNavigation<any>();
  const { placa: placaActual, validarPlacaParaUsuario } = useVehiculoStore();
  const { user } = useAuth();
  const gastos = useGastosStore((s) => s.gastos);

  const { combSem, combTrend, lastComb, peajesSem, peajesTrend, peajesCount, lastPeaje, mantMes, lastMant } =
    useGastosStats(gastos);

  useEffect(() => {
    if (!user?.id) return;
    registrarPushToken(user.id);
    validarPlacaParaUsuario(user.id);
  }, [user?.id]);

  // ─── Items con datos dinámicos de GastosStore ─────────────────────────────
  const conductorItems: Item[] = baseItems.map((item) => {
    switch (item.id) {
      case "combustible":
        return {
          ...item,
          sublabel:        fmtCOP(combSem),
          trend:           trendLabel(combTrend, "Sin cambio"),
          trendPositive:   combTrend <= 0,
          secondarylabel:  lastComb ? `Últ: ${fmtCOP(lastComb.monto)}` : "Sin registros",
          tertiaryLabel:   lastComb ? diasAtras(lastComb.fecha ?? lastComb.created_at) : undefined,
          score:           combSem > 0 ? spendScore(combTrend) : 50,
        };

      case "peajes":
        return {
          ...item,
          sublabel:        fmtCOP(peajesSem),
          trend:           peajesCount > 0
            ? `${peajesCount} pago${peajesCount !== 1 ? "s" : ""} esta sem.`
            : "Sin peajes esta sem.",
          trendPositive:   peajesTrend <= 0,
          secondarylabel:  lastPeaje ? `Últ: ${fmtCOP(lastPeaje.monto)}` : "Sin registros",
          tertiaryLabel:   lastPeaje ? diasAtras(lastPeaje.fecha ?? lastPeaje.created_at) : undefined,
          score:           peajesSem > 0 ? spendScore(peajesTrend) : 80,
        };

      case "mantenimiento":
        return {
          ...item,
          sublabel:        fmtCOP(mantMes),
          trend:           mantMes === 0 ? "Todo en orden ✓" : "Este mes",
          trendPositive:   mantMes === 0,
          secondarylabel:  lastMant ? `Últ: ${lastMant.tipo_gasto}` : "Sin registros",
          tertiaryLabel:   lastMant ? diasAtras(lastMant.fecha ?? lastMant.created_at) : undefined,
          score:           mantMes === 0 ? 100 : Math.max(20, 100 - Math.round((mantMes / 2_000_000) * 80)),
        };

      default:
        return item;
    }
  });

  return (
    <HomeBaseAdapted
      items={conductorItems}
      showCamionHeader={true}
      onItemPress={() => {}} // cards son solo informativos por ahora
    />
  );
}
