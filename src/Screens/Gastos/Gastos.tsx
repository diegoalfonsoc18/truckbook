import React, { useCallback, useEffect } from "react";
import { validarMonto, validarFecha, parsearMonto } from "../../utils/validacion";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useGastosStore } from "../../store/GastosStore";
import { useShallow } from "zustand/react/shallow";
import { useGastosConductor } from "../../hooks/UseGastosConductor";
import { useTheme } from "../../constants/Themecontext";
import { verificarAutorizacion } from "../../services/vehiculoAutorizacionService";
import TransactionScreen, { Categoria } from "../../components/TransactionScreen";
import { IconName } from "../../components/ItemIcon";
import supabase from "../../config/SupaBaseConfig";

const MANTENIMIENTO_SUBCATEGORIAS: Categoria[] = [
  { id: "reparacion", name: "Reparación", iconName: "repair" as IconName, color: "#74B9FF", size: 60 },
  { id: "llantas",    name: "Llantas",    iconName: "tire"   as IconName, color: "#A29BFE", size: 60 },
  { id: "lavado",     name: "Lavado",     iconName: "wash"   as IconName, color: "#00CEC9", size: 60 },
  { id: "aceite",     name: "Aceite",     iconName: "oil"    as IconName, color: "#FDCB6E", size: 60 },
];

const GASTOS_CATEGORIAS: Categoria[] = [
  { id: "combustible",   name: "Combustible", iconName: "fuel"    as IconName, color: "#FFB800", size: 60 },
  { id: "peajes",        name: "Peajes",      iconName: "toll"    as IconName, color: "#00D9A5", size: 60 },
  { id: "comida",        name: "Comida",      iconName: "food"    as IconName, color: "#FF6B6B", size: 60 },
  { id: "hospedaje",     name: "Hospedaje",   iconName: "hotel"   as IconName, color: "#6C5CE7", size: 60 },
  { id: "mantenimiento", name: "Manteni.",    iconName: "tool"    as IconName, color: "#74B9FF", size: 60 },
  { id: "parqueadero",   name: "Parqueo",     iconName: "parking" as IconName, color: "#FD79A8", size: 60 },
  { id: "otros",         name: "Otros",       iconName: "otros"   as IconName, color: "#636E72", size: 60 },
];

const ALL_CATEGORIAS = [...GASTOS_CATEGORIAS, ...MANTENIMIENTO_SUBCATEGORIAS];

export default function Gastos() {
  const { colors: c } = useTheme();
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const gastos = useGastosStore(useShallow((state) => state.gastos));
  const { agregarGasto, actualizarGasto, eliminarGasto } =
    useGastosConductor(placaActual);

  useEffect(() => {
    if (placaActual) {
      useGastosStore.getState().cargarGastosDelDB(placaActual);
    }
  }, [placaActual]);

  // Normalise to the shared Transaction shape
  const transactions = gastos.map((g) => ({
    id: g.id,
    placa: g.placa,
    tipo: g.tipo_gasto,
    descripcion: g.descripcion,
    monto: g.monto,
    fecha: g.fecha,
    estado: g.estado,
  }));

  const onAdd = useCallback(
    async (catId: string, monto: string, fecha: string, descripcion?: string) => {
      if (!placaActual || !user?.id) {
        return {
          success: false,
          error: !placaActual ? "Selecciona una placa primero" : "Usuario no identificado",
        };
      }

      const { autorizado } = await verificarAutorizacion(user.id, placaActual);
      if (!autorizado) {
        return {
          success: false,
          error: "No tienes autorización para registrar datos en este vehículo",
        };
      }

      const cat = ALL_CATEGORIAS.find((x) => x.id === catId);
      if (!cat) return { success: false, error: "Categoría no encontrada" };

      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      return agregarGasto({
        placa: placaActual,
        conductor_id: user.id,
        tipo_gasto: cat.name,
        descripcion: descripcion?.trim() || cat.name,
        monto: parsearMonto(monto),
        fecha,
        estado: "pendiente",
      });
    },
    [placaActual, user?.id, agregarGasto],
  );

  const onUpdate = useCallback(
    async (id: string, monto: string, fecha: string) => {
      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      return actualizarGasto(id, { monto: parsearMonto(monto), fecha });
    },
    [actualizarGasto],
  );

  const onDelete = useCallback(
    async (id: string) => eliminarGasto(id),
    [eliminarGasto],
  );

  const onToggleEstado = useCallback(
    async (id: string, estadoActual: string) => {
      const nuevoEstado = estadoActual === "pendiente" ? "pagado" : "pendiente";
      const { error } = await supabase
        .from("conductor_gastos")
        .update({ estado: nuevoEstado })
        .eq("id", id);
      if (error) return { success: false, error: error.message };
      useGastosStore.getState().cargarGastosDelDB(placaActual!);
      return { success: true };
    },
    [placaActual],
  );

  const getStatusColor = (estado?: string) => {
    if (estado === "pagado")   return c.success;
    if (estado === "aprobado") return c.success;
    return c.expense; // pendiente
  };

  const getStatusLabel = (estado?: string) => {
    if (estado === "pagado")   return "Pagado";
    if (estado === "aprobado") return "Aprobado";
    return "Pendiente";
  };

  return (
    <TransactionScreen
      title="Gastos"
      placaActual={placaActual}
      categorias={GASTOS_CATEGORIAS}
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
    />
  );
}
