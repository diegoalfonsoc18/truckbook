import React, { useCallback, useEffect } from "react";
import { validarMonto, validarFecha, parsearMonto } from "../../utils/validacion";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { useTheme } from "../../constants/Themecontext";
import { verificarAutorizacion } from "../../services/vehiculoAutorizacionService";
import supabase from "../../config/SupaBaseConfig";
import TransactionScreen, { Categoria } from "../../components/TransactionScreen";
import { IconName } from "../../components/ItemIcon";
import { useNavigation } from "@react-navigation/native";

const FLETE_CAMPOS = [
  { key: "cliente",   label: "Cliente",    placeholder: "Nombre del cliente o empresa" },
  { key: "mercancia", label: "Mercancía",  placeholder: "Ej: Cemento, Electrodomésticos" },
  { key: "origen",    label: "Origen",     placeholder: "Ciudad de carga" },
  { key: "destino",   label: "Destino",    placeholder: "Ciudad de entrega" },
];

const INGRESOS_CATEGORIAS: Categoria[] = [
  { id: "flete",        name: "Flete",          iconName: "freight"  as IconName, color: "#00D9A5", size: 60 },
  { id: "viaje",        name: "Viaje",          iconName: "trip"     as IconName, color: "#00B894", size: 60 },
  { id: "bonificacion", name: "Bono",           iconName: "bonus"    as IconName, color: "#FFB800", size: 60 },
  { id: "anticipo",     name: "Anticipo",       iconName: "advance"  as IconName, color: "#74B9FF", size: 60 },
  { id: "reembolso",    name: "Reembolso",      iconName: "refund"   as IconName, color: "#FD79A8", size: 60 },
  { id: "otro",         name: "Otro",           iconName: "otros"    as IconName, color: "#6C5CE7", size: 60 },
  { id: "cuenta_cobro", name: "Cta. de Cobro", iconName: "factura"  as IconName, color: "#E17055", size: 60 },
];

export default function Ingresos() {
  const navigation = useNavigation<any>();
  const { colors: c } = useTheme();
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));

  useEffect(() => {
    if (placaActual) {
      useIngresosStore.getState().cargarIngresosDelDB(placaActual);
    }
  }, [placaActual]);

  // Normalise to the shared Transaction shape
  const transactions = ingresos.map((i) => ({
    id: i.id,
    placa: i.placa,
    tipo: i.tipo_ingreso,
    descripcion: i.descripcion,
    monto: i.monto,
    fecha: i.fecha,
    estado: i.estado,
  }));

  const onAdd = useCallback(
    async (catId: string, monto: string, fecha: string, _descripcion?: string, extras?: Record<string, string>) => {
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

      const cat = INGRESOS_CATEGORIAS.find((x) => x.id === catId);
      if (!cat) return { success: false, error: "Categoría no encontrada" };

      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      // Build descripcion — for flete, compose a rich summary from extra fields
      let desc = cat.name;
      if (catId === "flete" && extras) {
        const partes: string[] = [];
        if (extras.cliente) partes.push(extras.cliente);
        if (extras.origen && extras.destino) partes.push(`${extras.origen} → ${extras.destino}`);
        else if (extras.origen) partes.push(extras.origen);
        else if (extras.destino) partes.push(extras.destino);
        if (extras.mercancia) partes.push(extras.mercancia);
        if (partes.length > 0) desc = partes.join(" · ");
      }

      const { error } = await supabase.from("conductor_ingresos").insert([{
        placa: placaActual,
        conductor_id: user.id,
        tipo_ingreso: cat.name,
        descripcion: desc,
        monto: parsearMonto(monto),
        fecha,
        estado: "confirmado",
      }]);

      if (error) return { success: false, error: error.message };
      useIngresosStore.getState().cargarIngresosDelDB(placaActual);
      return { success: true };
    },
    [placaActual, user?.id],
  );

  const onUpdate = useCallback(
    async (id: string, monto: string, fecha: string) => {
      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      const { error } = await supabase
        .from("conductor_ingresos")
        .update({ monto: parsearMonto(monto), fecha })
        .eq("id", id);
      if (error) return { success: false, error: error.message };
      useIngresosStore.getState().cargarIngresosDelDB(placaActual!);
      return { success: true };
    },
    [placaActual],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("conductor_ingresos")
        .delete()
        .eq("id", id);
      if (error) return { success: false, error: error.message };
      useIngresosStore.getState().cargarIngresosDelDB(placaActual!);
      return { success: true };
    },
    [placaActual],
  );

  const getStatusColor = (estado?: string) =>
    estado === "confirmado" ? c.success : c.accent;

  const getStatusLabel = (estado?: string) =>
    estado === "confirmado" ? "Confirmado" : "Pendiente";

  return (
    <TransactionScreen
      title="Ingresos"
      placaActual={placaActual}
      categorias={INGRESOS_CATEGORIAS}
      transactions={transactions}
      accentColor={c.income}
      accentColorLight={c.incomeLight}
      emptyIcon="💸"
      camposExtra={{ flete: FLETE_CAMPOS }}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      onCategoryAction={(catId) => {
        if (catId === "cuenta_cobro") {
          navigation.navigate("CuentaCobro");
          return true;
        }
        return false;
      }}
    />
  );
}
