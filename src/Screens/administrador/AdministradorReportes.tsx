import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SectionList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useRoleStore } from "../../store/RoleStore";
import { useTheme, getShadow } from "../../constants/Themecontext";
import supabase from "../../config/SupaBaseConfig";
import {
  cargarTodosVehiculosConConductores,
  cargarVehiculosPropietarioConConductores,
} from "../../services/vehiculoAutorizacionService";

interface RegistroActividad {
  id: string;
  tipo: "gasto" | "ingreso";
  placa: string;
  conductor_id: string;
  conductor_nombre: string;
  tipo_movimiento: string;
  descripcion: string;
  monto: number;
  fecha: string;
  estado: string;
}

interface SeccionPorFecha {
  title: string;
  fecha: string;
  conductores: string[];
  totalGastos: number;
  totalIngresos: number;
  data: RegistroActividad[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatFechaHeader(fecha: string) {
  const date = new Date(fecha + "T12:00:00");
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AdministradorReportes() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const role = useRoleStore((s) => s.role);

  const [placasDisponibles, setPlacasDisponibles] = useState<string[]>([]);
  const [placasSeleccionadas, setPlacasSeleccionadas] = useState<Set<string>>(new Set());
  const [secciones, setSecciones] = useState<SeccionPorFecha[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalGastos, setTotalGastos] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);

  // Cargar placas disponibles
  useEffect(() => {
    const cargarPlacas = async () => {
      if (!user?.id) return;

      const { data } =
        role === "administrador"
          ? await cargarTodosVehiculosConConductores()
          : await cargarVehiculosPropietarioConConductores(user.id);

      const placas = data.map((v) => v.placa);
      setPlacasDisponibles(placas);
      setPlacasSeleccionadas(new Set(placas)); // Todas seleccionadas por defecto
    };
    cargarPlacas();
  }, [user?.id, role]);

  const cargarDatos = useCallback(async () => {
    if (placasSeleccionadas.size === 0) {
      setSecciones([]);
      setTotalGastos(0);
      setTotalIngresos(0);
      return;
    }

    const placasArray = Array.from(placasSeleccionadas);

    try {
      // Cargar gastos e ingresos de todas las placas seleccionadas
      const [gastosRes, ingresosRes] = await Promise.all([
        supabase
          .from("conductor_gastos")
          .select("*")
          .in("placa", placasArray)
          .order("fecha", { ascending: false }),
        supabase
          .from("conductor_ingresos")
          .select("*")
          .in("placa", placasArray)
          .order("fecha", { ascending: false }),
      ]);

      const gastos = gastosRes.data || [];
      const ingresos = ingresosRes.data || [];

      // Buscar nombres de conductores
      const conductorIds = new Set<string>();
      gastos.forEach((g) => conductorIds.add(g.conductor_id));
      ingresos.forEach((i) => conductorIds.add(i.conductor_id));

      const nombresMap: Record<string, string> = {};
      for (const id of conductorIds) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("user_id", id)
          .maybeSingle();
        nombresMap[id] = usuario?.nombre || "Desconocido";
      }

      // Combinar registros
      const registros: RegistroActividad[] = [
        ...gastos.map((g) => ({
          id: g.id,
          tipo: "gasto" as const,
          placa: g.placa,
          conductor_id: g.conductor_id,
          conductor_nombre: nombresMap[g.conductor_id] || "Desconocido",
          tipo_movimiento: g.tipo_gasto,
          descripcion: g.descripcion,
          monto: g.monto,
          fecha: g.fecha,
          estado: g.estado,
        })),
        ...ingresos.map((i) => ({
          id: i.id,
          tipo: "ingreso" as const,
          placa: i.placa,
          conductor_id: i.conductor_id,
          conductor_nombre: nombresMap[i.conductor_id] || "Desconocido",
          tipo_movimiento: i.tipo_ingreso,
          descripcion: i.descripcion,
          monto: i.monto,
          fecha: i.fecha,
          estado: i.estado,
        })),
      ];

      // Totales generales
      setTotalGastos(registros.filter((r) => r.tipo === "gasto").reduce((s, r) => s + r.monto, 0));
      setTotalIngresos(registros.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + r.monto, 0));

      // Agrupar por fecha
      const porFecha: Record<string, RegistroActividad[]> = {};
      for (const reg of registros) {
        if (!porFecha[reg.fecha]) porFecha[reg.fecha] = [];
        porFecha[reg.fecha].push(reg);
      }

      const seccionesData: SeccionPorFecha[] = Object.keys(porFecha)
        .sort((a, b) => b.localeCompare(a))
        .map((fecha) => {
          const items = porFecha[fecha];
          const conductoresUnicos = [
            ...new Set(items.map((i) => i.conductor_nombre)),
          ];
          const tGastos = items
            .filter((i) => i.tipo === "gasto")
            .reduce((sum, i) => sum + i.monto, 0);
          const tIngresos = items
            .filter((i) => i.tipo === "ingreso")
            .reduce((sum, i) => sum + i.monto, 0);

          return {
            title: formatFechaHeader(fecha),
            fecha,
            conductores: conductoresUnicos,
            totalGastos: tGastos,
            totalIngresos: tIngresos,
            data: items,
          };
        });

      setSecciones(seccionesData);
    } catch (err) {
      console.error("Error cargando reportes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [placasSeleccionadas]);

  useEffect(() => {
    if (placasSeleccionadas.size > 0) {
      setLoading(true);
      cargarDatos();
    }
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const togglePlaca = (placa: string) => {
    setPlacasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(placa)) {
        next.delete(placa);
      } else {
        next.add(placa);
      }
      return next;
    });
  };

  const seleccionarTodas = () => {
    setPlacasSeleccionadas(new Set(placasDisponibles));
  };

  const todasSeleccionadas = placasSeleccionadas.size === placasDisponibles.length;

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  if (loading && placasDisponibles.length === 0) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, ds.textSecondary]}>
              Cargando reportes...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, ds.container]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerFixed}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.headerTitle, ds.text]}>Reportes</Text>
              <Text style={[styles.headerSubtitle, ds.textSecondary]}>
                {todasSeleccionadas
                  ? "Toda la flota"
                  : `${placasSeleccionadas.size} vehículo${placasSeleccionadas.size !== 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>

          {/* FILTRO DE PLACAS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtroContent}>
            <TouchableOpacity
              style={[
                styles.filtroChip,
                todasSeleccionadas
                  ? { backgroundColor: colors.accent }
                  : ds.cardBg,
              ]}
              onPress={seleccionarTodas}>
              <Text
                style={[
                  styles.filtroChipText,
                  { color: todasSeleccionadas ? "#FFF" : colors.text },
                ]}>
                Todos
              </Text>
            </TouchableOpacity>
            {placasDisponibles.map((placa) => {
              const selected = placasSeleccionadas.has(placa);
              return (
                <TouchableOpacity
                  key={placa}
                  style={[
                    styles.filtroChip,
                    selected && !todasSeleccionadas
                      ? { backgroundColor: colors.accent }
                      : ds.cardBg,
                  ]}
                  onPress={() => togglePlaca(placa)}>
                  <Text
                    style={[
                      styles.filtroChipText,
                      {
                        color:
                          selected && !todasSeleccionadas
                            ? "#FFF"
                            : colors.text,
                      },
                    ]}>
                    {placa}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* RESUMEN GENERAL */}
          {(totalIngresos > 0 || totalGastos > 0) && (
            <View style={[styles.resumenGeneral, ds.cardBg, getShadow(isDark, "sm")]}>
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenLabel, ds.textMuted]}>Ingresos</Text>
                <Text style={[styles.resumenMonto, { color: colors.income }]}>
                  +{formatCurrency(totalIngresos)}
                </Text>
              </View>
              <View style={[styles.resumenDivider, { backgroundColor: colors.border }]} />
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenLabel, ds.textMuted]}>Gastos</Text>
                <Text style={[styles.resumenMonto, { color: colors.expense }]}>
                  -{formatCurrency(totalGastos)}
                </Text>
              </View>
              <View style={[styles.resumenDivider, { backgroundColor: colors.border }]} />
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenLabel, ds.textMuted]}>Balance</Text>
                <Text
                  style={[
                    styles.resumenMonto,
                    {
                      color:
                        totalIngresos - totalGastos >= 0
                          ? colors.income
                          : colors.expense,
                    },
                  ]}>
                  {formatCurrency(totalIngresos - totalGastos)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* LISTA POR FECHA */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <SectionList
            sections={secciones}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={[styles.emptyTitle, ds.text]}>Sin registros</Text>
                <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                  No hay gastos ni ingresos para los vehículos seleccionados
                </Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View
                style={[
                  styles.sectionHeader,
                  ds.cardBg,
                  getShadow(isDark, "sm"),
                ]}>
                <Text style={[styles.sectionDate, ds.text]}>{section.title}</Text>

                <View style={styles.conductoresRow}>
                  <Text style={[styles.conductoresLabel, ds.textMuted]}>
                    Conductor(es):
                  </Text>
                  {section.conductores.map((nombre, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.conductorChip,
                        { backgroundColor: colors.accent + "20" },
                      ]}>
                      <Text
                        style={[
                          styles.conductorChipText,
                          { color: colors.accent },
                        ]}>
                        {nombre}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.resumenRow}>
                  {section.totalIngresos > 0 && (
                    <Text style={[styles.resumenIngreso, { color: colors.income }]}>
                      +{formatCurrency(section.totalIngresos)}
                    </Text>
                  )}
                  {section.totalGastos > 0 && (
                    <Text style={[styles.resumenGasto, { color: colors.expense }]}>
                      -{formatCurrency(section.totalGastos)}
                    </Text>
                  )}
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.registroCard,
                  ds.cardBg,
                  getShadow(isDark, "sm"),
                ]}>
                <View style={styles.registroHeader}>
                  <View style={styles.registroHeaderLeft}>
                    <View
                      style={[
                        styles.tipoBadge,
                        {
                          backgroundColor:
                            item.tipo === "ingreso"
                              ? colors.income + "20"
                              : colors.expense + "20",
                        },
                      ]}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color:
                            item.tipo === "ingreso"
                              ? colors.income
                              : colors.expense,
                        }}>
                        {item.tipo === "ingreso" ? "INGRESO" : "GASTO"}
                      </Text>
                    </View>
                    {/* Mostrar placa del registro */}
                    <View style={styles.miniPlaca}>
                      <Text style={styles.miniPlacaText}>{item.placa}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.registroMonto,
                      {
                        color:
                          item.tipo === "ingreso"
                            ? colors.income
                            : colors.expense,
                      },
                    ]}>
                    {item.tipo === "ingreso" ? "+" : "-"}
                    {formatCurrency(item.monto)}
                  </Text>
                </View>

                <Text style={[styles.registroTipo, ds.text]}>
                  {item.tipo_movimiento}
                </Text>
                {item.descripcion ? (
                  <Text style={[styles.registroDesc, ds.textSecondary]}>
                    {item.descripcion}
                  </Text>
                ) : null}

                <View style={styles.registroFooter}>
                  <Text style={[styles.registroConductor, ds.textMuted]}>
                    {item.conductor_nombre}
                  </Text>
                  <View
                    style={[
                      styles.estadoBadge,
                      {
                        backgroundColor:
                          item.estado === "aprobado"
                            ? colors.income + "20"
                            : item.estado === "rechazado"
                            ? colors.expense + "20"
                            : colors.textMuted + "20",
                      },
                    ]}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color:
                          item.estado === "aprobado"
                            ? colors.income
                            : item.estado === "rechazado"
                            ? colors.expense
                            : colors.textMuted,
                      }}>
                      {item.estado?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER
  headerFixed: { paddingHorizontal: 16, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  // FILTRO PLACAS
  filtroContent: { gap: 8, paddingVertical: 8 },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filtroChipText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },

  // RESUMEN GENERAL
  resumenGeneral: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  resumenItem: { flex: 1, alignItems: "center" },
  resumenLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4, textTransform: "uppercase" },
  resumenMonto: { fontSize: 14, fontWeight: "700" },
  resumenDivider: { width: 1, height: 30 },

  // LIST
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // SECTION HEADER
  sectionHeader: {
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  sectionDate: { fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  conductoresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  conductoresLabel: { fontSize: 12 },
  conductorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conductorChipText: { fontSize: 12, fontWeight: "600" },
  resumenRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  resumenIngreso: { fontSize: 14, fontWeight: "700" },
  resumenGasto: { fontSize: 14, fontWeight: "700" },

  // REGISTRO CARD
  registroCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  registroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  registroHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniPlaca: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#000",
  },
  miniPlacaText: { fontSize: 10, fontWeight: "800", color: "#000", letterSpacing: 0.5 },
  registroMonto: { fontSize: 16, fontWeight: "700" },
  registroTipo: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  registroDesc: { fontSize: 12, marginBottom: 6 },
  registroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  registroConductor: { fontSize: 12 },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // EMPTY & LOADING
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});
