// src/Screens/Movimientos/Movimientos.tsx
// Todos los movimientos (gastos + ingresos) de la placa activa, mes a mes.
// Es el destino de "Ver todas" en el panel de Actividad reciente del Home.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, getShadow } from "../../constants/Themecontext";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useGastosStore } from "../../store/GastosStore";
import { useIngresosStore } from "../../store/IngresosStore";
import { useAuth } from "../../hooks/useAuth";
import { fetchTransaccionesRango } from "../../services/reporteService";
import {
  MovimientoRow,
  construirMovimientos,
  fmtPesos,
  MESES_LARGOS,
  MOV_COLORS,
  type Mov,
} from "../Home/components/movimientos";

type Filtro = "todos" | "ingresos" | "gastos";

const FILTROS: Array<{ key: Filtro; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "ingresos", label: "Ingresos" },
  { key: "gastos", label: "Gastos" },
];

/** "2026-07-01" — primer día del mes, en hora local (no UTC). */
const primerDia = (anio: number, mes: number) =>
  `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

/** "2026-07-31" — último día del mes. El día 0 del siguiente mes. */
const ultimoDia = (anio: number, mes: number) => {
  const d = new Date(anio, mes + 1, 0);
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export default function Movimientos() {
  const navigation = useNavigation<any>();
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const placa = useVehiculoStore((s) => s.placa);
  const tipoCamion = useVehiculoStore((s) => s.tipoCamion);
  const { user } = useAuth();

  const hoy = new Date();
  // Mes que se está viendo. Arranca en el actual, como pidió el usuario.
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [cargando, setCargando] = useState(false);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [desdeCache, setDesdeCache] = useState(false);

  // No dejar navegar al futuro: no hay nada que ver ahí.
  const esMesActual =
    anio === hoy.getFullYear() && mes === hoy.getMonth();

  const cargar = useCallback(async () => {
    if (!placa || !user?.id) {
      setMovs([]);
      return;
    }
    setCargando(true);
    const inicio = primerDia(anio, mes);
    const fin = ultimoDia(anio, mes);

    const res = await fetchTransaccionesRango(placa, user.id, inicio, fin);

    if (res.error) {
      // Sin conexión: mostrar lo que haya en el store. Está topado en 200 filas
      // por placa, así que un mes viejo puede quedar corto — por eso se avisa.
      const enRango = (f?: string | null) => !!f && f >= inicio && f <= fin;
      const gs = useGastosStore
        .getState()
        .gastos.filter((g) => g.placa === placa && enRango(g.fecha));
      const is = useIngresosStore
        .getState()
        .ingresos.filter((i) => i.placa === placa && enRango(i.fecha));
      setMovs(construirMovimientos(gs, is));
      setDesdeCache(true);
    } else {
      setMovs(construirMovimientos(res.gastos, res.ingresos));
      setDesdeCache(false);
    }
    setCargando(false);
  }, [placa, user?.id, anio, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(
    () =>
      movs.filter((m) =>
        filtro === "todos"
          ? true
          : filtro === "ingresos"
            ? m.esIngreso
            : !m.esIngreso,
      ),
    [movs, filtro],
  );

  const { totalIngresos, totalGastos } = useMemo(() => {
    let ing = 0;
    let gas = 0;
    for (const m of movs) {
      if (m.esIngreso) ing += m.monto;
      else gas += m.monto;
    }
    return { totalIngresos: ing, totalGastos: gas };
  }, [movs]);

  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  };

  return (
    <View style={[st.root, { backgroundColor: c.surface }]}>
      {/* HEADER */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={st.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={[st.title, { color: c.text }]}>Movimientos</Text>
        {/* Espaciador del mismo ancho que el botón para centrar el título */}
        <View style={st.backBtn} />
      </View>

      {/* SELECTOR DE MES */}
      <View style={st.mesRow}>
        <Pressable
          onPress={() => cambiarMes(-1)}
          hitSlop={10}
          style={[st.mesBtn, { backgroundColor: c.cardBg }]}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>
        <Text style={[st.mesLabel, { color: c.text }]}>
          {MESES_LARGOS[mes]} {anio}
        </Text>
        <Pressable
          onPress={() => !esMesActual && cambiarMes(1)}
          hitSlop={10}
          disabled={esMesActual}
          style={[
            st.mesBtn,
            { backgroundColor: c.cardBg },
            esMesActual && { opacity: 0.3 },
          ]}>
          <Ionicons name="chevron-forward" size={20} color={c.text} />
        </Pressable>
      </View>

      {/* RESUMEN DEL MES */}
      <View style={st.resumenRow}>
        <View
          style={[
            st.resumenCard,
            { backgroundColor: c.cardBg, borderColor: MOV_COLORS.ingreso + "40" },
            getShadow(isDark, "sm"),
          ]}>
          <Text style={[st.resumenLabel, { color: c.textSecondary }]}>
            Ingresos
          </Text>
          <Text style={[st.resumenValor, { color: MOV_COLORS.ingreso }]}>
            {fmtPesos(totalIngresos)}
          </Text>
        </View>
        <View
          style={[
            st.resumenCard,
            { backgroundColor: c.cardBg, borderColor: MOV_COLORS.gasto + "40" },
            getShadow(isDark, "sm"),
          ]}>
          <Text style={[st.resumenLabel, { color: c.textSecondary }]}>
            Gastos
          </Text>
          <Text style={[st.resumenValor, { color: MOV_COLORS.gasto }]}>
            {fmtPesos(totalGastos)}
          </Text>
        </View>
      </View>

      {/* FILTRO */}
      <View style={st.filtroRow}>
        {FILTROS.map((f) => {
          const activo = filtro === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFiltro(f.key)}
              style={[
                st.filtroChip,
                {
                  backgroundColor: activo ? c.accent : c.cardBg,
                  borderColor: activo ? c.accent : c.border,
                },
              ]}>
              <Text
                style={[
                  st.filtroTexto,
                  { color: activo ? c.accentText : c.textSecondary },
                ]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {desdeCache && (
        <Text style={[st.avisoCache, { color: c.textMuted }]}>
          Sin conexión — mostrando lo guardado en el teléfono, pueden faltar
          movimientos.
        </Text>
      )}

      {/* LISTA */}
      {cargando ? (
        <View style={st.centro}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : visibles.length === 0 ? (
        <View style={st.centro}>
          <Text style={[st.vacio, { color: c.textMuted }]}>
            {!placa
              ? "Selecciona un vehículo para ver sus movimientos."
              : `Sin movimientos en ${MESES_LARGOS[mes].toLowerCase()}.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            st.lista,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={[st.listaPanel, { backgroundColor: c.cardBg }]}>
            {visibles.map((m) => (
              <MovimientoRow key={m.id} mov={m} tipoCamion={tipoCamion} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const H_PAD = 16;

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  backBtn: { width: 32, alignItems: "flex-start" },
  title: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  mesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    marginTop: 4,
    marginBottom: 12,
  },
  mesBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  mesLabel: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  resumenRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  resumenCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  resumenLabel: { fontSize: 11, fontWeight: "600", marginBottom: 3 },
  resumenValor: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },
  filtroRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: H_PAD,
    marginBottom: 10,
  },
  filtroChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filtroTexto: { fontSize: 13, fontWeight: "600" },
  avisoCache: {
    fontSize: 11.5,
    paddingHorizontal: H_PAD,
    marginBottom: 8,
    lineHeight: 16,
  },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  vacio: { fontSize: 14, textAlign: "center" },
  lista: { paddingHorizontal: H_PAD },
  listaPanel: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
});
