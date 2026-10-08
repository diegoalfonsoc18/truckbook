import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../constants/Themecontext";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { formatCurrency } from "../FinanzasGeneral/finanzasUtils";

interface Props {
  gastoId: string;
  placa: string | null;
  conductorId?: string | null;
  /** Actualización de gastos existente (offline-aware). */
  onActualizar: (
    id: string,
    updates: { ingreso_ids: string[]; recuperado: boolean },
  ) => Promise<{ success: boolean; error?: string }>;
}

const limpiar = (d: string) =>
  (d || "").replace(/\[TEL:[^\]]*\]/g, "").trim();

/**
 * "Ligar a ingresos" dentro de la edición de una Compra: selección múltiple de
 * los ingresos ya sincronizados de la placa activa. Cada toque escribe el
 * enlace de inmediato. Ligar marca recuperado=true; quitar el último vuelve a
 * recuperado=false (no distingue si antes se había recuperado por cuenta de
 * cobro; decisión documentada en la migración).
 */
export default function LigarIngresos({ gastoId, placa, conductorId, onActualizar }: Props) {
  const { colors: c } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const gasto = useGastosStore((s) => s.gastos.find((g) => g.id === gastoId));
  const ingresos = useIngresosStore((s) => s.ingresos);

  const ligados = gasto?.ingreso_ids ?? [];
  const compraSinSync = gastoId.startsWith("offline_");

  const { lista, hayPendientesSync } = useMemo(() => {
    const propios = ingresos
      .filter((i) => i.placa === placa && (!conductorId || i.conductor_id === conductorId));
    const sync = propios.filter((i) => !i.id.startsWith("offline_"));
    return {
      lista: [...sync]
        .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 20),
      hayPendientesSync: sync.length !== propios.length,
    };
  }, [ingresos, placa, conductorId]);

  const alternar = async (ingresoId: string) => {
    if (guardando) return;
    const next = ligados.includes(ingresoId)
      ? ligados.filter((x) => x !== ingresoId)
      : [...ligados, ingresoId];
    setGuardando(true);
    const r = await onActualizar(gastoId, { ingreso_ids: next, recuperado: next.length > 0 });
    setGuardando(false);
    if (!r.success) Alert.alert("Error", r.error || "No se pudo guardar el enlace");
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <TouchableOpacity accessibilityRole="button"
        accessibilityLabel="Ligar a ingresos"
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((v) => !v)}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
        <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: "600" }}>
          {ligados.length > 0 ? `Ligar a ingresos (${ligados.length})` : "Ligar a ingresos"}
        </Text>
        <Ionicons name={abierto ? "chevron-up" : "chevron-down"} size={16} color={c.textMuted} />
      </TouchableOpacity>

      {abierto && (
        <View>
          {compraSinSync ? (
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              Esta compra aún no se ha sincronizado. Espera a que se sincronice para ligarla a ingresos.
            </Text>
          ) : lista.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              No hay ingresos sincronizados en esta placa para ligar.
            </Text>
          ) : (
            <>
              {lista.map((i) => {
                const activo = ligados.includes(i.id);
                const total = i.monto * (i.cantidad ?? 1);
                return (
                  <TouchableOpacity accessibilityRole="checkbox"
                    key={i.id}
                    accessibilityLabel={`${limpiar(i.descripcion) || i.tipo_ingreso}, ${i.tipo_ingreso}, ${formatCurrency(total)}, ${i.fecha}`}
                    accessibilityState={{ checked: activo, disabled: guardando }}
                    onPress={() => alternar(i.id)}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Ionicons name={activo ? "checkbox" : "square-outline"} size={20} color={activo ? c.accent : c.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: c.text, fontSize: 13, fontWeight: "600" }}>
                        {limpiar(i.descripcion) || i.tipo_ingreso}
                      </Text>
                      <Text numberOfLines={1} style={{ color: c.textMuted, fontSize: 11, marginTop: 1 }}>
                        {i.tipo_ingreso} · {formatCurrency(total)} · {i.fecha}
                        {i.estado === "pendiente" ? " · por cobrar" : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {hayPendientesSync && (
                <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 6 }}>
                  Algunos ingresos aún no se han sincronizado y no aparecen; espera a que se sincronicen para ligarlos.
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
