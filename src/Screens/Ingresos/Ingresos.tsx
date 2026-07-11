import React, { useCallback, useEffect } from "react";
import { validarMonto, validarFecha, validarDescripcion, parsearMonto } from "../../utils/validacion";
import { useVehiculoStore, TipoCamion } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useIngresosStore } from "../../store/IngresosStore";
import { useShallow } from "zustand/react/shallow";
import { useIngresosConductor } from "../../hooks/UseingresosConductor";
import { useTheme } from "../../constants/Themecontext";
import TransactionScreen, { Categoria } from "../../components/TransactionScreen";
import { IconName } from "../../components/ItemIcon";
import { useNavigation } from "@react-navigation/native";
import {
  actualizarRecordatorioFletes,
  fletesPendientes,
} from "../../services/fleteNotifications";
import { extraerTelDesc } from "../../utils/telefono";

const FLETE_CAMPOS = [
  { key: "cliente",     label: "Cliente",     placeholder: "Nombre del cliente o empresa" },
  { key: "descripcion", label: "Descripción", placeholder: "Ruta, notas, detalles (opcional)" },
  { key: "cantidad",    label: "Cantidad de fletes", placeholder: "1", numeric: true },
];

const MERCANCIA_CAMPOS = [
  { key: "cliente",     label: "Cliente",           placeholder: "Nombre del cliente o empresa" },
  { key: "tipo",        label: "Tipo de mercancía", placeholder: "Cemento, Arena, Ganado, etc." },
  { key: "descripcion", label: "Descripción",       placeholder: "Detalles, peso, cantidad (opcional)" },
];

const ANTICIPO_CAMPOS = [
  { key: "cliente",     label: "Cliente",     placeholder: "Nombre del cliente o empresa" },
  { key: "descripcion", label: "Descripción", placeholder: "Motivo, detalles (opcional)" },
];

const REEMBOLSO_CAMPOS = [
  { key: "cliente",     label: "Cliente",     placeholder: "Nombre del cliente o empresa" },
  { key: "descripcion", label: "Descripción", placeholder: "Concepto, detalles (opcional)" },
];

const OTRO_CAMPOS = [
  { key: "cliente",     label: "Cliente",     placeholder: "Nombre del cliente o empresa" },
  { key: "descripcion", label: "Descripción", placeholder: "Detalle de ingreso (opcional)" },
];

const CUENTA_COBRO_CAMPOS = [
  { key: "cliente",     label: "Cliente",     placeholder: "Nombre del cliente o empresa" },
  { key: "descripcion", label: "Descripción", placeholder: "Servicio, detalles (opcional)" },
];

const sanitizarInput = (texto: string, maxLength: number = 500): string => {
  return texto
    .replace(/[<>{}[\]]/g, "")
    .trim()
    .slice(0, maxLength);
};

const getTruckIconName = (tipoCamion: TipoCamion | null): IconName => {
  switch (tipoCamion) {
    case "estacas": return "estacaFlete" as IconName;
    case "volqueta": return "volquetaFlete" as IconName;
    case "furgon": return "furgon" as IconName;
    case "grua": return "gruaFlete" as IconName;
    case "cisterna": return "cisterna" as IconName;
    case "planchon": return "planchosFlete" as IconName;
    case "portacontenedor": return "portaContenedor" as IconName;
    default: return "freight" as IconName;
  }
};

const getMercanciaIcon = (tipoCamion: TipoCamion | null): IconName => {
  switch (tipoCamion) {
    case "estacas": return "mercancia_box" as IconName;
    case "volqueta": return "mercancia_gravel" as IconName;
    case "furgon": return "mercancia_box" as IconName;
    case "grua": return "mercancia_carGrua" as IconName;
    case "cisterna": return "mercancia_gasStation" as IconName;
    case "planchon": return "mercancia_carGrua" as IconName;
    case "portacontenedor": return "mercancia_box" as IconName;
    default: return "mercancia_box" as IconName;
  }
};

const INGRESOS_CATEGORIAS: Categoria[] = [
  { id: "flete",        name: "Flete",          iconName: "freight"  as IconName, color: "#00D9A5", size: 60 },
  { id: "mercancia",    name: "Mercancía",      iconName: "mercancia_box" as IconName, color: "#FFA500", size: 60 },
  { id: "anticipo",     name: "Anticipo",       iconName: "advance"  as IconName, color: "#74B9FF", size: 60 },
  { id: "reembolso",    name: "Reembolso",      iconName: "refund"   as IconName, color: "#FD79A8", size: 60 },
  { id: "otro",         name: "Otro",           iconName: "otros"    as IconName, color: "#6C5CE7", size: 60 },
  { id: "cuenta_cobro", name: "Cobro",          iconName: "factura"  as IconName, color: "#E17055", size: 60 },
];

export default function Ingresos() {
  const navigation = useNavigation<any>();
  const { colors: c } = useTheme();
  const { placa: placaActual, tipoCamion } = useVehiculoStore();
  const { user } = useAuth();
  const ingresos = useIngresosStore(useShallow((state) => state.ingresos));
  // La carga y el realtime viven en DataProvider (única fuente); aquí solo mutaciones
  const { agregarIngreso, actualizarIngreso, eliminarIngreso } =
    useIngresosConductor(user?.id);

  const categoriasConIconoDinamico = INGRESOS_CATEGORIAS.map((cat) =>
    cat.id === "flete"
      ? { ...cat, iconName: getTruckIconName(tipoCamion) }
      : cat.id === "mercancia"
      ? { ...cat, iconName: getMercanciaIcon(tipoCamion) }
      : cat
  );

  // Sincroniza el recordatorio de fletes pendientes cada vez que cambian los ingresos
  useEffect(() => {
    const pendientes = fletesPendientes(ingresos);
    actualizarRecordatorioFletes(pendientes.length);
  }, [ingresos]);

  // Normalise to the shared Transaction shape
  const transactions = ingresos.map((i) => ({
    id: i.id,
    placa: i.placa,
    tipo: i.tipo_ingreso,
    descripcion: i.descripcion,
    monto: i.monto,
    fecha: i.fecha,
    estado: i.estado,
    cantidad: i.cantidad ?? 1,
  }));

  const onAdd = useCallback(
    async (catId: string, monto: string, fecha: string, _descripcion?: string, extras?: Record<string, string>, estado?: string) => {
      if (!placaActual || !user?.id) {
        return {
          success: false,
          error: !placaActual ? "Selecciona una placa primero" : "Usuario no identificado",
        };
      }

      const cat = INGRESOS_CATEGORIAS.find((x) => x.id === catId);
      if (!cat) return { success: false, error: "Categoría no encontrada" };

      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      // Build descripcion — compose from extra fields depending on category
      let desc = cat.name;
      if (catId === "mercancia" && extras) {
        // Validar mercancía tipo
        if (!extras.tipo || extras.tipo.trim() === "") {
          return { success: false, error: "Ingresa el tipo de mercancía" };
        }
        const tipoResult = validarDescripcion(extras.tipo);
        if (!tipoResult.valido) {
          return { success: false, error: "Tipo de mercancía: " + tipoResult.error };
        }
        // Construir descripción para mercancía — cliente primero
        desc = extras.cliente || cat.name;
        const detalles: string[] = [];
        if (extras.tipo)        detalles.push(extras.tipo);
        if (extras.descripcion) detalles.push(extras.descripcion);
        if (detalles.length > 0) desc = `${desc} · ${detalles.join(" · ")}`;
      } else if (catId === "flete" && extras) {
        const partes: string[] = [];
        if (extras.cliente)     partes.push(sanitizarInput(extras.cliente));
        if (extras.descripcion) partes.push(sanitizarInput(extras.descripcion));
        if (partes.length > 0) desc = partes.join(" · ");
      } else if (catId === "anticipo" && extras) {
        const partes: string[] = [];
        if (extras.cliente)     partes.push(sanitizarInput(extras.cliente));
        if (extras.descripcion) partes.push(sanitizarInput(extras.descripcion));
        if (partes.length > 0) desc = partes.join(" · ");
      } else if (catId === "reembolso" && extras) {
        const partes: string[] = [];
        if (extras.cliente)     partes.push(sanitizarInput(extras.cliente));
        if (extras.descripcion) partes.push(sanitizarInput(extras.descripcion));
        if (partes.length > 0) desc = partes.join(" · ");
      } else if (catId === "otro" && extras) {
        const partes: string[] = [];
        if (extras.cliente)     partes.push(sanitizarInput(extras.cliente));
        if (extras.descripcion) partes.push(sanitizarInput(extras.descripcion));
        if (partes.length > 0) desc = partes.join(" · ");
      } else if (catId === "cuenta_cobro" && extras) {
        const partes: string[] = [];
        if (extras.cliente)     partes.push(sanitizarInput(extras.cliente));
        if (extras.descripcion) partes.push(sanitizarInput(extras.descripcion));
        if (partes.length > 0) desc = partes.join(" · ");
      }

      // Adjuntar teléfono del contacto al final (parseable, invisible en display)
      if (extras?.telefono) desc = `${desc}[TEL:${extras.telefono}]`;

      // El estado lo elige el usuario en el modal; por defecto "pagado"
      const estadoInicial = (estado === "pendiente" ? "pendiente" : "pagado") as "pendiente" | "pagado";

      // Sanitizar descripción final — solo texto plano, sin scripts ni inyecciones
      desc = desc
        .replace(/\[TEL:[^\]]*\]/g, "") // no permitir inyectar tags TEL manualmente
        .trim()
        .slice(0, 500);               // max 500 caracteres
      // Re-adjuntar teléfono limpio después de sanitizar
      if (extras?.telefono) {
        const telLimpio = extras.telefono.replace(/[^0-9+\- ]/g, "").slice(0, 20);
        if (telLimpio) desc = `${desc}[TEL:${telLimpio}]`;
      }

      // Cantidad de fletes — 1 registro con campo cantidad (no N registros)
      const rawCantidad = parseInt(extras?.cantidad || "1", 10);
      if (isNaN(rawCantidad) || rawCantidad < 1) return { success: false, error: "Cantidad inválida" };
      const cantidad = Math.min(rawCantidad, 20);

      return agregarIngreso({
        placa: placaActual,
        conductor_id: user.id,
        tipo_ingreso: cat.name,
        descripcion: desc,
        monto: parsearMonto(monto),
        fecha,
        estado: estadoInicial,
        cantidad,
        cliente: extras?.cliente ? sanitizarInput(extras.cliente) : undefined,
      });
    },
    [placaActual, user?.id, agregarIngreso],
  );

  const onUpdate = useCallback(
    async (id: string, monto: string, fecha: string, descripcion?: string, extras?: Record<string, string>) => {
      const montoResult = validarMonto(monto);
      if (!montoResult.valido) return { success: false, error: montoResult.error };

      const fechaResult = validarFecha(fecha);
      if (!fechaResult.valido) return { success: false, error: fechaResult.error };

      const payload: Record<string, any> = { monto: parsearMonto(monto), fecha };
      if (descripcion !== undefined) {
        let desc = descripcion
          .replace(/\[TEL:[^\]]*\]/g, "")
          .replace(/[<>{}]/g, "")
          .slice(0, 500);
        // Teléfono: usar el del contacto recién elegido en la edición si lo
        // hay; si no, conservar el del registro original (el modal reconstruye
        // la descripción sin el tag [TEL:...] y antes lo perdía en silencio)
        const original = useIngresosStore
          .getState()
          .ingresos.find((i) => i.id === id);
        const { tel: telOriginal } = extraerTelDesc(original?.descripcion ?? "");
        const telNuevo = extras?.telefono
          ?.replace(/[^0-9+\- ]/g, "")
          .slice(0, 20);
        const tel = telNuevo || telOriginal;
        if (tel) desc = `${desc}[TEL:${tel}]`;
        payload.descripcion = desc;
      }
      if (extras?.cantidad) {
        const cant = parseInt(extras.cantidad, 10);
        if (!isNaN(cant) && cant >= 1 && cant <= 20) payload.cantidad = cant;
      }
      // Mantener el campo `cliente` sincronizado con la descripción editada
      // (antes solo cambiaba la descripción y el filtro por cliente en Reportes
      // dejaba de encontrar el ingreso).
      if (extras?.cliente && extras.cliente.trim()) {
        payload.cliente = sanitizarInput(extras.cliente);
      }

      return actualizarIngreso(id, payload);
    },
    [actualizarIngreso],
  );

  const onDelete = useCallback(
    async (id: string) => eliminarIngreso(id),
    [eliminarIngreso],
  );

  const onToggleEstado = useCallback(
    async (id: string, estadoActual: string) => {
      const nuevoEstado = estadoActual === "pendiente" ? "pagado" : "pendiente";
      return actualizarIngreso(id, { estado: nuevoEstado });
    },
    [actualizarIngreso],
  );

  const getStatusColor = (estado?: string) => {
    if (estado === "pendiente")  return "#FFB800"; // amarillo — aún no cobrado
    return c.success;                              // pagado / confirmado (legacy) → verde
  };

  const getStatusLabel = (estado?: string) => {
    if (estado === "pendiente") return "Por cobrar";
    return "Pagado";                               // pagado y confirmado (legacy)
  };

  return (
    <TransactionScreen
      title="Ingresos"
      placaActual={placaActual}
      categorias={categoriasConIconoDinamico}
      transactions={transactions}
      accentColor={c.income}
      accentColorLight={c.incomeLight}
      emptyIcon="💸"
      camposExtra={{
        flete: FLETE_CAMPOS,
        mercancia: MERCANCIA_CAMPOS,
        anticipo: ANTICIPO_CAMPOS,
        reembolso: REEMBOLSO_CAMPOS,
        otro: OTRO_CAMPOS,
        cuenta_cobro: CUENTA_COBRO_CAMPOS,
      }}
      tipoCamionActual={tipoCamion}
      getMercanciaIcon={getMercanciaIcon}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onToggleEstado={onToggleEstado}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      onCategoryAction={(catId) => {
        if (catId === "cuenta_cobro") {
          navigation.navigate("CuentaCobro");
          return true;
        }
        return false;
      }}
      tipoTransaccion="ingreso"
    />
  );
}
