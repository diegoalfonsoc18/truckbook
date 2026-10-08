import React, { useCallback } from "react";
import { validarMonto, validarFecha, parsearMonto } from "../../utils/validacion";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useTheme } from "../../constants/Themecontext";
import TransactionScreen, { Categoria } from "../../components/TransactionScreen";
import { IconName } from "../../components/ItemIcon";
import { getMercanciaIcon } from "../../utils/iconosCamion";
import { TIPO_COMPRAS, formatCurrency } from "../FinanzasGeneral/finanzasUtils";
import { useGananciaCompras } from "../../hooks/useGananciaCompras";
import LigarIngresos from "./LigarIngresos";

const MANTENIMIENTO_SUBCATEGORIAS: Categoria[] = [
  { id: "reparacion", name: "Reparación", iconName: "repair" as IconName, color: "#74B9FF", size: 60 },
  { id: "llantas",    name: "Llantas",    iconName: "tire"   as IconName, color: "#A29BFE", size: 60 },
  { id: "lavado",     name: "Lavado",     iconName: "wash"   as IconName, color: "#00CEC9", size: 60 },
  { id: "aceite",     name: "Aceite",     iconName: "oil"    as IconName, color: "#FDCB6E", size: 60 },
];

const GASTOS_CATEGORIAS: Categoria[] = [
  { id: "combustible",   name: "Combustible", iconName: "fuel"    as IconName, color: "#FFB800", size: 60 },
  { id: "peajes",        name: "Peajes",      iconName: "toll"    as IconName, color: "#00D9A5", size: 60 },
  { id: "comida",        name: "Comida",      iconName: "food"    as IconName, color: "#F97316", size: 60 },
  { id: "hospedaje",     name: "Hospedaje",   iconName: "hotel"   as IconName, color: "#6C5CE7", size: 60 },
  { id: "mantenimiento", name: "Taller",      iconName: "tool"    as IconName, color: "#74B9FF", size: 60 },
  { id: "parqueadero",   name: "Parqueo",     iconName: "parking" as IconName, color: "#FD79A8", size: 60 },
  // El icono se ajusta al tipo de camión (ver `categoriasConIconoDinamico`)
  { id: "compras",       name: TIPO_COMPRAS, iconName: "mercancia_box" as IconName, color: "#FFA500", size: 60 },
  { id: "otros",         name: "Otros",       iconName: "otros"   as IconName, color: "#636E72", size: 60 },
];

// Compras de mercancía: dinero propio puesto en mercancía para revender; se
// recupera incluyéndola en una cuenta de cobro. `proveedor` vive en su propia
// columna (fueraDeDescripcion) pero también va en el texto de la descripción.
// Su key NO es "cliente", así que no dispara las sugerencias de contactos.
const COMPRAS_CAMPOS = [
  { key: "que",         label: "Qué compraste", placeholder: "Arena, cemento, grava, etc." },
  { key: "proveedor",   label: "Proveedor",     placeholder: "A quién se la compraste (opcional)", fueraDeDescripcion: true },
  { key: "descripcion", label: "Detalle",       placeholder: "Cantidad, notas (opcional)" },
];

// Texto plano: sin etiquetas/llaves y sin el separador " · " con que se arma
// (y se vuelve a leer) la descripción al editar.
const limpiarTexto = (texto: string, max: number): string =>
  texto
    .replace(/[<>{}[\]]/g, "")
    .replace(/\s·\s/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const componerDescripcionCompra = (que: string, proveedor: string, detalle: string) =>
  [que, proveedor, detalle].filter(Boolean).join(" · ").slice(0, 200);

const ALL_CATEGORIAS = [...GASTOS_CATEGORIAS, ...MANTENIMIENTO_SUBCATEGORIAS];

export default function Gastos() {
  const { colors: c } = useTheme();
  const { placa: placaActual, tipoCamion } = useVehiculoStore();
  const { user } = useAuth();
  const gastos = useGastosStore(useShallow((state) => state.gastos));
  // La carga y el realtime viven en DataProvider (única fuente); aquí solo mutaciones
  const { agregarGasto, actualizarGasto, eliminarGasto } =
    useGastosConductor(user?.id);

  const categoriasConIconoDinamico = GASTOS_CATEGORIAS.map((cat) =>
    cat.id === "compras"
      ? { ...cat, iconName: getMercanciaIcon(tipoCamion) }
      : cat,
  );

  const { porCompra } = useGananciaCompras(user?.id);

  // Línea bajo cada Compra: ganancia (si está ligada a ingresos cobrados) o
  // su estado de recuperación. Sin inventar: sin ingresos cobrados no hay cifra.
  const infoCompra = (g: (typeof gastos)[number]): string | null => {
    if (g.tipo_gasto !== TIPO_COMPRAS) return null;
    const grupo = porCompra[g.id];
    if (grupo) {
      if (grupo.cobrados === 0)
        return `Ligada a ingresos por cobrar (${formatCurrency(grupo.porCobrar)})`;
      return (
        `Ganancia sin flete ${formatCurrency(grupo.gananciaSin)} · con flete ${formatCurrency(grupo.gananciaCon)}` +
        (grupo.porCobrar > 0 ? ` · incluye ${formatCurrency(grupo.porCobrar)} por cobrar` : "")
      );
    }
    return g.recuperado ? "Recuperada" : "Por recuperar";
  };

  // Normalise to the shared Transaction shape
  const transactions = gastos.map((g) => ({
    id: g.id,
    placa: g.placa,
    tipo: g.tipo_gasto,
    descripcion: g.descripcion,
    monto: g.monto,
    fecha: g.fecha,
    estado: g.estado,
    proveedor: g.proveedor ?? null,
    extraInfo: infoCompra(g),
  }));

  const onAdd = useCallback(
    async (catId: string, monto: string, fecha: string, descripcion?: string, extras?: Record<string, string>, estado?: string) => {
      if (!placaActual || !user?.id) {
        return {
          success: false,
          error: !placaActual ? "Selecciona una placa primero" : "Usuario no identificado",
        };
      }

      const cat = ALL_CATEGORIAS.find((x) => x.id === catId);
      if (!cat) return { success: false, error: "Categoría no encontrada" };

      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      // conductor_gastos solo permite: "pendiente" | "aprobado" | "rechazado"
      // "pagado" del modal se mapea a "aprobado"
      const estadoDB = (estado === "pendiente" ? "pendiente" : "aprobado") as "pendiente" | "aprobado";

      // Compras de mercancía: descripción = qué compraste · proveedor · detalle;
      // el proveedor (opcional) además va a su columna.
      if (catId === "compras") {
        const que = limpiarTexto(extras?.que ?? "", 100);
        if (!que) return { success: false, error: "Ingresa qué compraste" };
        const detalle = limpiarTexto(extras?.descripcion ?? "", 100);
        const proveedor = limpiarTexto(extras?.proveedor ?? "", 100);
        return agregarGasto({
          placa: placaActual,
          conductor_id: user.id,
          tipo_gasto: cat.name,
          descripcion: componerDescripcionCompra(que, proveedor, detalle),
          monto: parsearMonto(monto),
          fecha,
          estado: estadoDB,
          proveedor: proveedor || null,
          recuperado: false,
        });
      }

      const descSafe = (descripcion?.trim() || cat.name)
        .replace(/[<>{}]/g, "")
        .slice(0, 200);

      return agregarGasto({
        placa: placaActual,
        conductor_id: user.id,
        tipo_gasto: cat.name,
        descripcion: descSafe,
        monto: parsearMonto(monto),
        fecha,
        estado: estadoDB,
      });
    },
    [placaActual, user?.id, agregarGasto],
  );

  const onUpdate = useCallback(
    async (id: string, monto: string, fecha: string, descripcion?: string, extras?: Record<string, string>) => {
      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      const payload: Record<string, any> = { monto: parsearMonto(monto), fecha };

      const esCompraEditada =
        useGastosStore.getState().gastos.find((g) => g.id === id)?.tipo_gasto ===
        TIPO_COMPRAS;
      if (esCompraEditada) {
        // Misma regla que al crear: "qué compraste" es obligatorio
        const que = limpiarTexto(extras?.que ?? "", 100);
        if (!que) return { success: false, error: "Ingresa qué compraste" };
        const detalle = limpiarTexto(extras?.descripcion ?? "", 100);
        const proveedor = limpiarTexto(extras?.proveedor ?? "", 100);
        payload.descripcion = componerDescripcionCompra(que, proveedor, detalle);
        payload.proveedor = proveedor || null;
      } else if (descripcion !== undefined) {
        payload.descripcion = descripcion.replace(/[<>{}]/g, "").slice(0, 200);
      }

      return actualizarGasto(id, payload);
    },
    [actualizarGasto],
  );

  const onDelete = useCallback(
    async (id: string) => eliminarGasto(id),
    [eliminarGasto],
  );

  const onToggleEstado = useCallback(
    async (id: string, estadoActual: string) => {
      const nuevoEstado = estadoActual === "pendiente" ? "aprobado" : "pendiente";
      return actualizarGasto(id, { estado: nuevoEstado });
    },
    [actualizarGasto],
  );

  const getStatusColor = (estado?: string) =>
    estado === "pendiente" ? c.expense : c.success; // pendiente=rojo, pagado/aprobado=verde

  const getStatusLabel = (estado?: string) =>
    estado === "pendiente" ? "Pendiente" : "Pagado"; // aprobado (legacy) → Pagado

  return (
    <TransactionScreen
      title="Gastos"
      placaActual={placaActual}
      categorias={categoriasConIconoDinamico}
      camposExtra={{ compras: COMPRAS_CAMPOS }}
      renderEditExtra={(editId, catKey) =>
        catKey === "compras" ? (
          <LigarIngresos
            gastoId={editId}
            placa={placaActual}
            conductorId={user?.id}
            onActualizar={actualizarGasto}
          />
        ) : null
      }
      subcategorias={MANTENIMIENTO_SUBCATEGORIAS}
      transactions={transactions}
      accentColor={c.expense}
      accentColorLight={c.expenseLight}
      emptyIcon="🧾"
      hasCustomDescription={true}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onToggleEstado={onToggleEstado}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      tipoTransaccion="gasto"
    />
  );
}
