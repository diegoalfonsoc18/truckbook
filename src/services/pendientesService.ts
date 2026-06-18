// src/services/pendientesService.ts
import { Ingreso } from "../store/IngresosStore";
import { Gasto } from "../store/GastosStore";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoCobro = "pendiente" | "parcial" | "pagado" | "vencido";
export type EstadoPago = "pendiente" | "proximo" | "vencido";

export interface PorCobrar {
  id: string;
  cliente: string;
  descripcion: string;
  monto: number;
  montoPagado: number;
  montoRestante: number;
  fechaVencimiento?: Date;
  estado: EstadoCobro;
  diasVencido: number;
  fecha: string;
}

export interface PorPagar {
  id: string;
  descripcion: string;
  tipoGasto: string;
  monto: number;
  fechaVencimiento?: Date;
  estado: EstadoPago;
  diasParaVencer: number;
  fecha: string;
}

export interface ResumenPendientes {
  totalPorCobrar: number;
  totalPorPagar: number;
  countPorCobrar: number;
  countVencidosCobro: number;
  countParciales: number;
  countVencidosPago: number;
  countProximosPago: number;
  diasMasAntiguo: number;
  clienteMasAntiguo: string | null;
  montoVencidosCobro: number;
}

// ─── Lógica ────────────────────────────────────────────────────────────────────

const hoyInicio = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function calcularPorCobrar(ingresos: Ingreso[]): PorCobrar[] {
  const hoy = hoyInicio();

  return ingresos
    .filter((i) => {
      // Incluir si no está completamente pagado
      const montoTotal = i.monto * (i.cantidad ?? 1);
      const montoPagado = i.monto_pagado ?? 0;
      return i.estado !== "pagado" || montoPagado < montoTotal;
    })
    .map((i) => {
      const montoTotal = i.monto * (i.cantidad ?? 1);
      const montoPagado = i.monto_pagado ?? 0;
      const montoRestante = Math.max(0, montoTotal - montoPagado);
      const fechaVenc = i.fecha_vencimiento
        ? new Date(i.fecha_vencimiento)
        : undefined;

      let estado: EstadoCobro;
      let diasVencido = 0;

      if (montoPagado >= montoTotal) {
        estado = "pagado";
      } else if (montoPagado > 0) {
        estado = "parcial";
      } else if (fechaVenc && fechaVenc < hoy) {
        estado = "vencido";
        diasVencido = Math.floor(
          (hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24)
        );
      } else {
        estado = "pendiente";
      }

      return {
        id: i.id,
        cliente: i.cliente ?? i.descripcion,
        descripcion: i.descripcion,
        monto: montoTotal,
        montoPagado,
        montoRestante,
        fechaVencimiento: fechaVenc,
        estado,
        diasVencido,
        fecha: i.fecha,
      };
    })
    .filter((i) => i.estado !== "pagado")
    .sort((a, b) => {
      // Vencidos primero, luego por días vencido
      const prioridad = { vencido: 0, parcial: 1, pendiente: 2, pagado: 3 };
      const pa = prioridad[a.estado];
      const pb = prioridad[b.estado];
      if (pa !== pb) return pa - pb;
      return b.diasVencido - a.diasVencido;
    });
}

export function calcularPorPagar(gastos: Gasto[]): PorPagar[] {
  const hoy = hoyInicio();

  return gastos
    .filter((g) => g.estado === "pendiente" && g.fecha_vencimiento)
    .map((g) => {
      const fechaVenc = g.fecha_vencimiento
        ? new Date(g.fecha_vencimiento)
        : undefined;

      const diasParaVencer = fechaVenc
        ? Math.ceil(
            (fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      let estado: EstadoPago;
      if (diasParaVencer <= 0) {
        estado = "vencido";
      } else if (diasParaVencer <= 7) {
        estado = "proximo";
      } else {
        estado = "pendiente";
      }

      return {
        id: g.id,
        descripcion: g.descripcion,
        tipoGasto: g.tipo_gasto,
        monto: g.monto,
        fechaVencimiento: fechaVenc,
        estado,
        diasParaVencer,
        fecha: g.fecha,
      };
    })
    .sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

export function resumirPendientes(
  porCobrar: PorCobrar[],
  porPagar: PorPagar[]
): ResumenPendientes {
  const totalPorCobrar = porCobrar.reduce((s, i) => s + i.montoRestante, 0);
  const totalPorPagar = porPagar.reduce((s, g) => s + g.monto, 0);
  const vencidosCobro = porCobrar.filter((i) => i.estado === "vencido");
  const montoVencidosCobro = vencidosCobro.reduce(
    (s, i) => s + i.montoRestante,
    0
  );
  const masAntiguo = vencidosCobro.reduce(
    (max, i) => (i.diasVencido > max ? i.diasVencido : max),
    0
  );

  return {
    totalPorCobrar,
    totalPorPagar,
    countPorCobrar: porCobrar.length,
    countVencidosCobro: vencidosCobro.length,
    countParciales: porCobrar.filter((i) => i.estado === "parcial").length,
    countVencidosPago: porPagar.filter((g) => g.estado === "vencido").length,
    countProximosPago: porPagar.filter((g) => g.estado === "proximo").length,
    diasMasAntiguo: masAntiguo,
    clienteMasAntiguo:
      vencidosCobro.find((i) => i.diasVencido === masAntiguo)?.cliente ?? null,
    montoVencidosCobro,
  };
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export const COLORES_ESTADO_COBRO: Record<EstadoCobro, string> = {
  vencido: "#EF4444",
  parcial: "#F59E0B",
  pendiente: "#FFB800",
  pagado: "#16A34A",
};

export const COLORES_ESTADO_PAGO: Record<EstadoPago, string> = {
  vencido: "#EF4444",
  proximo: "#F59E0B",
  pendiente: "#3B82F6",
};

export const LABELS_COBRO: Record<EstadoCobro, string> = {
  vencido: "Vencido",
  parcial: "Parcial",
  pendiente: "Pendiente",
  pagado: "Pagado",
};

export const LABELS_PAGO: Record<EstadoPago, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  pendiente: "Pendiente",
};

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
