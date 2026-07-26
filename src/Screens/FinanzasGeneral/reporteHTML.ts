// src/Screens/FinanzasGeneral/reporteHTML.ts
// Generador del informe PDF (HTML que expo-print convierte en documento).
//
// Vive aparte de la pantalla porque es una función pura y larga: no toca
// estado, hooks ni React, solo recibe datos y devuelve el HTML. Todo lo que
// se interpole aquí viene del usuario, así que pasa por `esc()`.
import { contarServicios, formatCurrency, type EstadoFiltro, type ViewType } from "./finanzasUtils";

// ─── Generación del informe PDF ───────────────────────────────────────────────
export function generarReporteHTML(params: {
  placas: string[];
  rangoInicio: string;
  rangoFin: string;
  totalIngresos: number;
  totalGastos: number;
  periodos: string[]; // allKeys
  ingresosPorPeriodo: number[];
  gastosPorPeriodo: number[];
  gastosDetalle: Array<{
    fecha: string;
    tipo_gasto: string;
    descripcion: string;
    monto: number;
  }>;
  ingresosDetalle: Array<{
    fecha: string;
    tipo_ingreso: string;
    descripcion: string;
    monto: number;
    cliente?: string | null;
    cantidad?: number | null;
    estado?: string | null;
  }>;
  clienteFiltro?: string | null;
  categoriaFiltro?: string | null;
  categoriaEsGasto?: boolean;
  /** Filtro de estado aplicado a los ingresos: null = por cobrar + pagados. */
  estadoFiltro?: EstadoFiltro;
  /** Generado sin conexión desde el caché del teléfono: puede faltar data. */
  desdeCache?: boolean;
  view: ViewType;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(n);

  // Escapar datos del usuario interpolados en el HTML del PDF
  const esc = (s: unknown) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fmtFecha = (s: string) => {
    const d = new Date(s + "T12:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Fecha compacta dd/mm/aa para las filas de detalle (ahorra espacio en la
  // tabla); directo del string YYYY-MM-DD, sin pasar por Date (sin saltos UTC)
  const fmtFechaCorta = (s: string) =>
    s?.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(2, 4)}` : s;

  const labelPeriodo = (key: string) => {
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    if (params.view === "dias") {
      const [, m, d] = key.split("-");
      return `${d}/${m}`;
    }
    if (params.view === "meses") {
      const [a, m] = key.split("-");
      return `${meses[parseInt(m) - 1]} ${a}`;
    }
    return key;
  };

  // ── Criterio de caja ────────────────────────────────────────────────────
  // En el informe general, balance y rentabilidad se calculan sobre lo
  // efectivamente RECIBIDO; lo pendiente se muestra aparte como "Por cobrar".
  const totalPorCobrar = params.ingresosDetalle
    .filter((i) => i.estado === "pendiente")
    .reduce((a, i) => a + i.monto * (i.cantidad ?? 1), 0);
  const totalRecibido = params.totalIngresos - totalPorCobrar;
  const balanceReal = totalRecibido - params.totalGastos;
  const rentReal =
    totalRecibido === 0 ? 0 : (balanceReal / totalRecibido) * 100;

  // Pendiente agrupado por período (misma clave fecha.slice que la serie)
  const sliceLen =
    params.view === "dias" ? 10 : params.view === "meses" ? 7 : 4;
  const pendPorPeriodo = new Map<string, number>();
  for (const i of params.ingresosDetalle) {
    if (i.estado !== "pendiente") continue;
    const k = i.fecha?.slice(0, sliceLen);
    if (k)
      pendPorPeriodo.set(
        k,
        (pendPorPeriodo.get(k) ?? 0) + i.monto * (i.cantidad ?? 1),
      );
  }

  const periodoRows = params.periodos
    .map((k, i) => {
      const ing =
        (params.ingresosPorPeriodo[i] || 0) - (pendPorPeriodo.get(k) ?? 0);
      const gas = params.gastosPorPeriodo[i] || 0;
      const bal = ing - gas;
      const balColor = bal >= 0 ? "#16A34A" : "#EF4444";
      return `<tr>
      <td>${labelPeriodo(k)}</td>
      <td class="right green">${fmt(ing)}</td>
      <td class="right red">${fmt(gas)}</td>
      <td class="right" style="color:${balColor};font-weight:700">${fmt(bal)}</td>
    </tr>`;
    })
    .join("");

  const cleanDesc = (d: string) =>
    (d || "").replace(/\[TEL:[^\]]*\]/g, "").trim();

  // Detalle cronológico completo (antes: solo top 15 por monto)
  const MAX_FILAS = 100;

  const esCuentaCliente = !!params.clienteFiltro;

  // Servicios prestados = suma de cantidades. Un registro "x3" son 3 viajes,
  // así que el conteo por filas de la tabla mentía sobre el trabajo hecho.
  const totalServicios = contarServicios(params.ingresosDetalle);

  const ingresosOrdenados = [...params.ingresosDetalle].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );
  const filasIngresos = ingresosOrdenados
    .slice(0, MAX_FILAS)
    .map((i) => {
      const cant = i.cantidad ?? 1;
      const total = i.monto * cant;
      const desc = cleanDesc(i.descripcion);
      const clienteLabel =
        i.cliente ||
        (desc.split(" · ")[0].trim().length > 1
          ? desc.split(" · ")[0].trim()
          : "—");
      // La descripción suele empezar con el cliente — no repetirlo en la tabla
      const partes = desc.split(" · ");
      const detalle =
        partes[0]?.trim() === clienteLabel
          ? partes.slice(1).join(" · ").trim()
          : desc;
      const pendiente = i.estado === "pendiente";
      return `<tr>
      <td>${fmtFechaCorta(i.fecha)}</td>
      <td>${esc(i.tipo_ingreso)}</td>
      ${esCuentaCliente ? "" : `<td>${esc(clienteLabel)}</td>`}
      <td>${esc(detalle) || "—"}</td>
      <td><span class="badge ${pendiente ? "b-pend" : "b-pag"}">${pendiente ? "Por cobrar" : "Pagado"}</span></td>
      <td class="center">${cant}</td>
      <td class="right">${fmt(i.monto)}</td>
      <td class="right green">${fmt(total)}</td>
    </tr>`;
    })
    .join("");

  const filasGastos = [...params.gastosDetalle]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, MAX_FILAS)
    .map(
      (g) => `<tr>
      <td>${fmtFechaCorta(g.fecha)}</td>
      <td>${esc(g.tipo_gasto)}</td>
      <td>${esc(cleanDesc(g.descripcion)) || "—"}</td>
      <td class="right red">${fmt(g.monto)}</td>
    </tr>`,
    )
    .join("");

  const balColor = balanceReal >= 0 ? "#16A34A" : "#EF4444";
  const esCategoria = !!params.categoriaFiltro;
  // Total y cantidad del rubro filtrado (según sea gasto o ingreso)
  const catTotal = params.categoriaEsGasto
    ? params.totalGastos
    : params.totalIngresos;
  // Los ingresos se cuentan por servicios (sumando `cantidad`), no por filas:
  // un flete registrado "x3" son 3 viajes. Los gastos no tienen cantidad.
  const catCount = params.categoriaEsGasto
    ? params.gastosDetalle.length
    : contarServicios(params.ingresosDetalle);
  const tituloDoc = esCuentaCliente
    ? "Estado de cuenta"
    : esCategoria
      ? `Informe — ${params.categoriaFiltro}`
      : "Informe de Finanzas";

  // Nota al pie del resumen cuando se exportó solo una parte de las cuentas.
  // Va en el documento, no solo en la app: estos informes se le mandan a
  // clientes, y quien lo recibe tiene que ver que está filtrado.
  const notaEstado = params.estadoFiltro
    ? ` · Solo cuentas ${params.estadoFiltro === "pendiente" ? "por cobrar" : "pagadas"}`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; background: #F5F5F5; padding: 24px; color: #000; }
    .page { background: #fff; max-width: 680px; margin: 0 auto; padding: 32px; border-radius: 8px; }

    /* HEADER */
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #000; padding-bottom: 16px; }
    .brand { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -0.5px; }
    .brand span { color: #000; }
    .doc-info { text-align: right; font-size: 12px; color: #000; }
    .doc-info strong { color: #000; display: block; font-size: 16px; font-weight: 700; margin-bottom: 4px; }

    /* META */
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; gap: 32px; font-size: 12px; color: #000; }
    .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #000; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #000; }

    /* Aviso de informe generado offline (datos posiblemente incompletos) */
    .aviso-cache { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; line-height: 1.5; color: #78350F; }

    /* SUMMARY GRID */
    .summary { display: grid; grid-template-columns: repeat(${esCuentaCliente ? 3 : 4}, 1fr); gap: 12px; margin-bottom: 8px; }
    .s-card { border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; text-align: center; }
    .s-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #000; margin-bottom: 6px; }
    .s-value { font-size: 15px; font-weight: 800; color: #000; }
    .green { color: #16A34A; }
    .red { color: #EF4444; }
    .amber { color: #B45309; }
    .summary-note { font-size: 10px; color: #92400E; text-align: right; margin-bottom: 20px; }

    /* BADGES DE ESTADO */
    .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 8px; white-space: nowrap; }
    .b-pend { background: #FEF3C7; color: #92400E; }
    .b-pag { background: #DCFCE7; color: #166534; }

    /* SECTION */
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #000; margin: 24px 0 10px; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #000; color: #fff; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    td { padding: 8px 10px; border-bottom: 1px solid #F1F5F9; color: #000; vertical-align: middle; }
    td.right { text-align: right; white-space: nowrap; }
    td.center { text-align: center; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #F8FAFC; }
    .total-tr td { background: #F1F5F9; font-weight: 700; font-size: 13px; border-top: 2px solid #CBD5E1; color: #000; }

    /* FOOTER */
    .footer { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 16px; }
    .stores { display: flex; gap: 16px; justify-content: center; align-items: center; margin-top: 8px; }
    .store-badge { display: inline-flex; align-items: center; gap: 5px; color: #94A3B8; }
    .store-badge svg { width: 13px; height: 13px; flex-shrink: 0; fill: #94A3B8; }
    .store-badge span { font-size: 9px; font-weight: 600; letter-spacing: 0.2px; }
  </style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand">Truck<span>Book</span></div>
      <div style="font-size:13px;color:#666;margin-top:4px;">${tituloDoc}</div>
    </div>
    <div class="doc-info">
      <strong>${esCuentaCliente ? `Estado de cuenta — ${esc(params.clienteFiltro)}` : esCategoria ? `Informe — ${esc(params.categoriaFiltro)}` : "Informe de Finanzas"}</strong>
      Generado: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
    </div>
  </div>

  ${
    params.desdeCache
      ? `<div class="aviso-cache">Informe generado sin conexión, con los datos guardados en el teléfono. Pueden faltar movimientos — verifícalo con internet antes de usarlo como soporte.</div>`
      : ""
  }

  <div class="meta-box">
    <div class="meta-item">
      <strong>Período</strong>
      <span>${fmtFecha(params.rangoInicio)} — ${fmtFecha(params.rangoFin)}</span>
    </div>
    <div class="meta-item">
      <strong>Vehículo(s)</strong>
      <span>${params.placas.length > 0 ? esc(params.placas.join(", ")) : "Todos"}</span>
    </div>
    ${params.clienteFiltro ? `<div class="meta-item"><strong>Cliente</strong><span>${esc(params.clienteFiltro)}</span></div>` : ""}
    ${esCategoria ? `<div class="meta-item"><strong>Categoría</strong><span>${esc(params.categoriaFiltro)}</span></div>` : ""}
    ${params.estadoFiltro ? `<div class="meta-item"><strong>Estado</strong><span>${params.estadoFiltro === "pendiente" ? "Solo por cobrar" : "Solo pagadas"}</span></div>` : ""}
  </div>

  <!-- RESUMEN -->
  ${
    esCategoria
      ? `
  <div class="summary">
    <div class="s-card" style="border-color:${params.categoriaEsGasto ? "#EF444440" : "#16A34A40"}">
      <div class="s-label">Total ${esc(params.categoriaFiltro)}</div>
      <div class="s-value ${params.categoriaEsGasto ? "red" : "green"}">${fmt(catTotal)}</div>
    </div>
    <div class="s-card" style="border-color:#E2E8F0">
      <div class="s-label">${params.categoriaEsGasto ? "Movimientos" : "Servicios"}</div>
      <div class="s-value">${catCount}</div>
    </div>
  </div>
  <div class="summary-note">Informe filtrado por categoría: ${esc(params.categoriaFiltro)}${notaEstado}</div>`
      : esCuentaCliente
        ? `
  <div class="summary">
    <div class="s-card" style="border-color:#E2E8F0">
      <div class="s-label">Total facturado</div>
      <div class="s-value">${fmt(params.totalIngresos)}</div>
    </div>
    <div class="s-card" style="border-color:#16A34A40">
      <div class="s-label">Recibido</div>
      <div class="s-value green">${fmt(totalRecibido)}</div>
    </div>
    <div class="s-card" style="border-color:#F59E0B40">
      <div class="s-label">Por cobrar</div>
      <div class="s-value amber">${fmt(totalPorCobrar)}</div>
    </div>
  </div>
  <div class="summary-note">${notaEstado ? notaEstado.replace(/^ · /, "") : "&nbsp;"}</div>`
      : `
  <div class="summary">
    <div class="s-card" style="border-color:#16A34A40">
      <div class="s-label">Ingresos recibidos</div>
      <div class="s-value green">${fmt(totalRecibido)}</div>
    </div>
    <div class="s-card" style="border-color:#F59E0B40">
      <div class="s-label">Por cobrar</div>
      <div class="s-value amber">${fmt(totalPorCobrar)}</div>
    </div>
    <div class="s-card" style="border-color:#EF444440">
      <div class="s-label">Gastos</div>
      <div class="s-value red">${fmt(params.totalGastos)}</div>
    </div>
    <div class="s-card" style="border-color:${balColor}40">
      <div class="s-label">Balance</div>
      <div class="s-value" style="color:${balColor}">${fmt(balanceReal)}</div>
    </div>
  </div>
  <div class="summary-note">Rentabilidad: ${rentReal >= 0 ? "+" : ""}${rentReal.toFixed(1)}% · Balance de caja: solo ingresos recibidos${totalPorCobrar > 0 ? ` (no incluye ${fmt(totalPorCobrar)} por cobrar)` : ""}${notaEstado}</div>`
  }

  <!-- POR PERÍODO (solo informe general — sin sentido en estado de cuenta
       ni en informe filtrado por una sola categoría) -->
  ${
    !esCuentaCliente && !esCategoria && params.periodos.length > 0
      ? `
  <div class="section-title">Resumen por período</div>
  <table>
    <thead><tr>
      <th>Período</th>
      <th class="right">Ingresos recibidos</th>
      <th class="right">Gastos</th>
      <th class="right">Balance</th>
    </tr></thead>
    <tbody>
      ${periodoRows}
      <tr class="total-tr">
        <td>Total</td>
        <td class="right green">${fmt(totalRecibido)}</td>
        <td class="right red">${fmt(params.totalGastos)}</td>
        <td class="right" style="color:${balColor}">${fmt(balanceReal)}</td>
      </tr>
    </tbody>
  </table>`
      : ""
  }

  <!-- INGRESOS DETALLE -->
  ${
    params.ingresosDetalle.length > 0
      ? `
  <div class="section-title">${esCuentaCliente ? "Detalle de servicios" : "Ingresos del período"} (${totalServicios}${totalServicios !== params.ingresosDetalle.length ? ` en ${params.ingresosDetalle.length} registro${params.ingresosDetalle.length !== 1 ? "s" : ""}` : ""})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th>${esCuentaCliente ? "" : "<th>Cliente</th>"}<th>Descripción</th><th>Estado</th><th class="center">Cant.</th><th class="right">Vr. unitario</th><th class="right">Total</th>
    </tr></thead>
    <tbody>
      ${filasIngresos}
      <tr class="total-tr">
        <td colspan="${esCuentaCliente ? 6 : 7}">Total facturado</td>
        <td class="right green">${fmt(params.totalIngresos)}</td>
      </tr>
    </tbody>
  </table>
  ${params.ingresosDetalle.length > MAX_FILAS ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando los primeros ${MAX_FILAS} de ${params.ingresosDetalle.length} registros</div>` : ""}
  `
      : ""
  }

  <!-- GASTOS DETALLE -->
  ${
    params.gastosDetalle.length > 0
      ? `
  <div class="section-title">Gastos del período (${params.gastosDetalle.length})</div>
  <table>
    <thead><tr>
      <th>Fecha</th><th>Tipo</th><th>Descripción</th><th class="right">Monto</th>
    </tr></thead>
    <tbody>
      ${filasGastos}
      <tr class="total-tr">
        <td colspan="3">Total</td>
        <td class="right red">${fmt(params.totalGastos)}</td>
      </tr>
    </tbody>
  </table>
  ${params.gastosDetalle.length > MAX_FILAS ? `<div style="font-size:10px;color:#999;margin-top:4px;text-align:right">Mostrando los primeros ${MAX_FILAS} de ${params.gastosDetalle.length} registros</div>` : ""}
  `
      : ""
  }

  <div class="footer">
    Generado con <strong>TruckBook</strong>
    <div class="stores">
      <span class="store-badge">
        <svg viewBox="0 0 24 24"><path d="M17.05 12.04c-.03-2.86 2.33-4.23 2.44-4.3-1.33-1.95-3.4-2.22-4.14-2.25-1.76-.18-3.44 1.04-4.33 1.04-.89 0-2.27-1.02-3.73-.99-1.92.03-3.69 1.12-4.68 2.84-2 3.46-.51 8.58 1.43 11.39.95 1.37 2.08 2.91 3.56 2.86 1.43-.06 1.97-.92 3.7-.92 1.72 0 2.21.92 3.72.89 1.54-.03 2.51-1.4 3.45-2.78 1.09-1.59 1.54-3.13 1.56-3.21-.03-.02-2.99-1.15-3.02-4.56zM14.28 4.16c.79-.96 1.32-2.29 1.18-3.62-1.14.05-2.52.76-3.33 1.72-.73.85-1.37 2.21-1.2 3.51 1.27.1 2.57-.65 3.35-1.61z"/></svg>
        <span>App Store</span>
      </span>
      <span class="store-badge">
        <svg viewBox="0 0 24 24"><path d="M3.6 2.3c-.2.2-.3.5-.3.9v17.6c0 .4.1.7.3.9l.1.1 9.9-9.9v-.2zM17 15.3l-3.4-3.4L17 8.5l3.9 2.2c1.1.6 1.1 1.7 0 2.3zM17.1 15.2 13.6 11.9 3.7 21.8c.4.4 1 .4 1.6.1zM17.1 8.6 5.3 2C4.7 1.6 4.1 1.7 3.7 2.1l9.9 9.8z"/></svg>
        <span>Google Play</span>
      </span>
    </div>
  </div>
</div>
</body>
</html>`;
}
