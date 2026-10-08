// Ganancia de las compras de mercancía ligadas a sus ingresos de reventa.
//
// Una compra se liga a VARIOS ingresos (p. ej. el de Mercancía y el de Flete) y
// un ingreso puede estar en VARIAS compras. Para no contar dos veces un ingreso
// compartido, la ganancia se calcula por GRUPO: cada componente conexo del grafo
// compras↔ingresos. Función pura, sin React ni stores.

export interface CompraGanancia {
  id: string;
  monto: number;
  ingreso_ids?: string[] | null;
}

export interface IngresoGanancia {
  id: string;
  monto: number;
  cantidad?: number | null;
  tipo_ingreso: string;
  estado?: string | null;
  fecha?: string;
  flete_monto?: number | null;
}

export interface GrupoGanancia {
  compraIds: string[];
  ingresoIds: string[];
  /** Fechas de los ingresos del grupo (para ubicarlo en un período). */
  fechas: string[];
  /** Ingresos cobrados del grupo. */
  cobrados: number;
  totalIngresos: number;
  flete: number;
  compras: number;
  /** total_ingresos − compras */
  gananciaCon: number;
  /** total_ingresos − flete − compras */
  gananciaSin: number;
  /** Ingresos del grupo aún por cobrar: NO suman a la ganancia. */
  porCobrar: number;
}

export interface ResultadoGanancia {
  grupos: GrupoGanancia[];
  porCompra: Record<string, GrupoGanancia>;
  porIngreso: Record<string, GrupoGanancia>;
}

const totalIngreso = (i: IngresoGanancia) =>
  (Number(i.monto) || 0) * (i.cantidad ?? 1);

// Criterio de caja del reporte: "pendiente" = por cobrar; el resto está cobrado.
const esPorCobrar = (i: IngresoGanancia) => i.estado === "pendiente";

export function calcularGanancias(
  compras: CompraGanancia[],
  ingresos: IngresoGanancia[],
): ResultadoGanancia {
  const ingPorId = new Map(ingresos.map((i) => [i.id, i]));

  // Union-find sobre nodos "g:<id>" (compra) e "i:<id>" (ingreso)
  const padre = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (padre.get(r) !== r) r = padre.get(r)!;
    padre.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    if (!padre.has(a)) padre.set(a, a);
    if (!padre.has(b)) padre.set(b, b);
    padre.set(find(a), find(b));
  };

  const comprasLigadas: CompraGanancia[] = [];
  for (const g of compras) {
    // Ignora ids de ingresos que ya no existen (borrados)
    const vivos = (g.ingreso_ids ?? []).filter((id) => ingPorId.has(id));
    if (vivos.length === 0) continue;
    comprasLigadas.push(g);
    for (const id of vivos) union(`g:${g.id}`, `i:${id}`);
  }

  const comps = new Map<string, { compras: CompraGanancia[]; ingresos: Set<string> }>();
  const entrada = (raiz: string) => {
    let e = comps.get(raiz);
    if (!e) comps.set(raiz, (e = { compras: [], ingresos: new Set() }));
    return e;
  };
  for (const g of comprasLigadas) {
    const e = entrada(find(`g:${g.id}`));
    e.compras.push(g);
    for (const id of g.ingreso_ids ?? [])
      if (ingPorId.has(id)) e.ingresos.add(id);
  }

  const grupos: GrupoGanancia[] = [];
  const porCompra: Record<string, GrupoGanancia> = {};
  const porIngreso: Record<string, GrupoGanancia> = {};
  for (const e of comps.values()) {
    let totalIngresos = 0;
    let flete = 0;
    let porCobrar = 0;
    let cobrados = 0;
    const fechas: string[] = [];
    for (const id of e.ingresos) {
      const i = ingPorId.get(id)!;
      if (i.fecha) fechas.push(i.fecha);
      const t = totalIngreso(i);
      if (esPorCobrar(i)) {
        porCobrar += t;
        continue;
      }
      cobrados += 1;
      totalIngresos += t;
      flete +=
        i.tipo_ingreso === "Flete"
          ? t
          : Math.min(Math.max(Number(i.flete_monto) || 0, 0), t);
    }
    const sumaCompras = e.compras.reduce((a, g) => a + (Number(g.monto) || 0), 0);
    const grupo: GrupoGanancia = {
      compraIds: e.compras.map((g) => g.id),
      ingresoIds: [...e.ingresos],
      fechas,
      cobrados,
      totalIngresos,
      flete,
      compras: sumaCompras,
      gananciaCon: totalIngresos - sumaCompras,
      gananciaSin: totalIngresos - flete - sumaCompras,
      porCobrar,
    };
    grupos.push(grupo);
    for (const id of grupo.compraIds) porCompra[id] = grupo;
    for (const id of grupo.ingresoIds) porIngreso[id] = grupo;
  }
  return { grupos, porCompra, porIngreso };
}

/** Suma de las ganancias de varios grupos (solo los que ya tienen algo cobrado). */
export function sumarGanancias(grupos: GrupoGanancia[]) {
  const cobrados = grupos.filter((g) => g.cobrados > 0);
  return {
    cantidad: cobrados.length,
    gananciaCon: cobrados.reduce((a, g) => a + g.gananciaCon, 0),
    gananciaSin: cobrados.reduce((a, g) => a + g.gananciaSin, 0),
    porCobrar: grupos.reduce((a, g) => a + g.porCobrar, 0),
    hayLigadas: grupos.length > 0,
  };
}
