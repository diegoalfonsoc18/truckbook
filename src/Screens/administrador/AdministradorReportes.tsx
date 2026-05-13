import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SectionList,
  RefreshControl,
  ScrollView,
  Animated,
  Pressable,
} from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
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

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

// ─── Animated registro card ───────────────────────────────────────────────────
function RegistroCard({ item, isDark, cardStyle, c, formatCurrency }: {
  item: any; isDark: boolean; cardStyle: object;
  c: any; formatCurrency: (v: number) => string;
}) {
  const opacity = useSharedValue(0);
  const transY  = useSharedValue(8);
  const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300, easing: easeOut });
    transY.value  = withTiming(0, { duration: 340, easing: easeOut });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: transY.value }],
  }));

  const isIngreso   = item.tipo === "ingreso";
  const tipoColor   = isIngreso ? c.income : c.expense;
  const estadoColor = item.estado === "aprobado" || item.estado === "confirmado"
    ? c.income : item.estado === "rechazado" ? c.expense : c.textMuted;

  return (
    <Reanimated.View style={[cardStyle, { marginBottom: 8 }, animStyle]}>
      <View style={s.registroHeader}>
        <View style={s.registroHeaderLeft}>
          <View style={[s.tipoBadge, { backgroundColor: tipoColor + (isDark ? "25" : "15") }]}>
            <View style={[s.tipoDot, { backgroundColor: tipoColor }]} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: tipoColor }}>
              {isIngreso ? "INGRESO" : "GASTO"}
            </Text>
          </View>
          <View style={[s.miniPlaca, { backgroundColor: c.plateYellow }]}>
            <Text style={[s.miniPlacaText, { color: c.plateText }]}>{item.placa}</Text>
          </View>
        </View>
        <Text style={[s.registroMonto, { color: tipoColor }]}>
          {isIngreso ? "+" : "-"}{formatCurrency(item.monto)}
        </Text>
      </View>
      <Text style={[s.registroTipo, { color: c.text }]}>{item.tipo_movimiento}</Text>
      {item.descripcion ? (
        <Text style={[s.registroDesc, { color: c.textSecondary }]}>{item.descripcion}</Text>
      ) : null}
      <View style={s.registroFooter}>
        <Text style={[s.registroConductor, { color: c.textMuted }]}>{item.conductor_nombre}</Text>
        <View style={[s.estadoBadge, { backgroundColor: estadoColor + (isDark ? "25" : "15") }]}>
          <View style={[s.estadoDot, { backgroundColor: estadoColor }]} />
          <Text style={{ fontSize: 10, fontWeight: "700", color: estadoColor }}>
            {item.estado?.toUpperCase()}
          </Text>
        </View>
      </View>
    </Reanimated.View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
  const c = colors;
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
      setPlacasSeleccionadas(new Set(placas));
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

      setTotalGastos(registros.filter((r) => r.tipo === "gasto").reduce((s, r) => s + r.monto, 0));
      setTotalIngresos(registros.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + r.monto, 0));

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

  const cardBorder = isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {};
  const shadow = getShadow(isDark, "md");

  // Entrance animations
  const headerY        = useRef(new Animated.Value(-10)).current;
  const headerFade     = useRef(new Animated.Value(0)).current;
  const resumenScale   = useSharedValue(0.96);
  const resumenOpacity = useSharedValue(0);
  const resumenStyle   = useAnimatedStyle(() => ({
    opacity: resumenOpacity.value,
    transform: [{ scale: resumenScale.value }],
  }));
  const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(headerY,    { toValue: 0, duration: 400, easing: (t: number) => 1 - Math.pow(1 - t, 3), useNativeDriver: true }),
    ]).start();
    resumenOpacity.value = withDelay(120, withTiming(1,    { duration: 320, easing: easeOut }));
    resumenScale.value   = withDelay(120, withTiming(1,    { duration: 360, easing: easeOut }));
  }, []);

  if (loading && placasDisponibles.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={c.income} />
            <Text style={[s.loadingText, { color: c.textSecondary }]}>
              Cargando reportes…
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const balance = totalIngresos - totalGastos;

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        {/* HEADER */}
        <Animated.View style={[s.headerFixed, { opacity: headerFade, transform: [{ translateY: headerY }] }]}>
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[s.backButton, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.cardBg }, cardBorder]}>
              <Text style={{ fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.headerTitle, { color: c.text }]}>Reportes</Text>
              <Text style={[s.headerSubtitle, { color: c.textSecondary }]}>
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
            contentContainerStyle={s.filtroContent}>
            <TouchableOpacity
              style={[
                s.filtroChip,
                todasSeleccionadas
                  ? { backgroundColor: c.accent }
                  : { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                cardBorder,
              ]}
              onPress={seleccionarTodas}>
              <Text
                style={[
                  s.filtroChipText,
                  { color: todasSeleccionadas ? c.accentText : c.text },
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
                    s.filtroChip,
                    selected && !todasSeleccionadas
                      ? { backgroundColor: c.accent }
                      : { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                    cardBorder,
                  ]}
                  onPress={() => togglePlaca(placa)}>
                  <Text
                    style={[
                      s.filtroChipText,
                      {
                        color:
                          selected && !todasSeleccionadas
                            ? c.accentText
                            : c.text,
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
            <Reanimated.View style={[
              s.resumenGeneral,
              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
              cardBorder,
              shadow,
              resumenStyle,
            ]}>
              <View style={s.resumenItem}>
                <Text style={[s.resumenLabel, { color: c.textMuted }]}>Ingresos</Text>
                <Text style={[s.resumenMonto, { color: c.income }]}>
                  +{formatCurrency(totalIngresos)}
                </Text>
              </View>
              <View style={[s.resumenDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} />
              <View style={s.resumenItem}>
                <Text style={[s.resumenLabel, { color: c.textMuted }]}>Gastos</Text>
                <Text style={[s.resumenMonto, { color: c.expense }]}>
                  -{formatCurrency(totalGastos)}
                </Text>
              </View>
              <View style={[s.resumenDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : c.border }]} />
              <View style={s.resumenItem}>
                <Text style={[s.resumenLabel, { color: c.textMuted }]}>Balance</Text>
                <Text
                  style={[
                    s.resumenMonto,
                    { color: balance >= 0 ? c.income : c.expense },
                  ]}>
                  {formatCurrency(balance)}
                </Text>
              </View>
            </Reanimated.View>
          )}
        </Animated.View>

        {/* LISTA POR FECHA */}
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={c.income} />
          </View>
        ) : (
          <SectionList
            sections={secciones}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={c.income}
              />
            }
            contentContainerStyle={s.listContent}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>📭</Text>
                <Text style={[s.emptyTitle, { color: c.text }]}>Sin registros</Text>
                <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
                  No hay gastos ni ingresos para los vehículos seleccionados
                </Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View
                style={[
                  s.sectionHeader,
                  { backgroundColor: isDark ? "rgba(0,217,165,0.06)" : c.cardBg },
                  isDark ? { borderWidth: 1, borderColor: "rgba(0,217,165,0.15)" } : {},
                  shadow,
                ]}>
                <Text style={[s.sectionDate, { color: c.text }]}>{section.title}</Text>

                <View style={s.conductoresRow}>
                  <Text style={[s.conductoresLabel, { color: c.textMuted }]}>
                    Conductor(es):
                  </Text>
                  {section.conductores.map((nombre, idx) => (
                    <View
                      key={idx}
                      style={[
                        s.conductorChip,
                        { backgroundColor: isDark ? "rgba(255,229,0,0.15)" : c.accentLight },
                      ]}>
                      <Text
                        style={[
                          s.conductorChipText,
                          { color: isDark ? c.accent : "#8B7A00" },
                        ]}>
                        {nombre}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={s.resumenRow}>
                  {section.totalIngresos > 0 && (
                    <View style={[s.resumenPill, { backgroundColor: isDark ? "rgba(0,217,165,0.15)" : c.incomeLight }]}>
                      <Text style={[s.resumenIngreso, { color: c.income }]}>
                        +{formatCurrency(section.totalIngresos)}
                      </Text>
                    </View>
                  )}
                  {section.totalGastos > 0 && (
                    <View style={[s.resumenPill, { backgroundColor: isDark ? "rgba(233,69,96,0.15)" : c.expenseLight }]}>
                      <Text style={[s.resumenGasto, { color: c.expense }]}>
                        -{formatCurrency(section.totalGastos)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <RegistroCard
                item={item}
                isDark={isDark}
                cardStyle={[
                  s.registroCard,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg },
                  cardBorder,
                  getShadow(isDark, "sm"),
                ]}
                c={c}
                formatCurrency={formatCurrency}
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER
  headerFixed: { paddingHorizontal: 20, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2, fontWeight: "500" },

  // FILTRO PLACAS
  filtroContent: { gap: 8, paddingVertical: 8 },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  filtroChipText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },

  // RESUMEN GENERAL
  resumenGeneral: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    alignItems: "center",
  },
  resumenItem: { flex: 1, alignItems: "center" },
  resumenLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  resumenMonto: { fontSize: 14, fontWeight: "800" },
  resumenDivider: { width: 1, height: 30 },

  // LIST
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // SECTION HEADER
  sectionHeader: {
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDate: { fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  conductoresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  conductoresLabel: { fontSize: 12, fontWeight: "500" },
  conductorChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conductorChipText: { fontSize: 12, fontWeight: "600" },
  resumenRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  resumenPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resumenIngreso: { fontSize: 13, fontWeight: "700" },
  resumenGasto: { fontSize: 13, fontWeight: "700" },

  // REGISTRO CARD
  registroCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  registroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  registroHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  tipoDot: { width: 5, height: 5, borderRadius: 3 },
  miniPlaca: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  miniPlacaText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  registroMonto: { fontSize: 16, fontWeight: "800" },
  registroTipo: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  registroDesc: { fontSize: 12, marginBottom: 6 },
  registroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  registroConductor: { fontSize: 12, fontWeight: "500" },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  estadoDot: { width: 5, height: 5, borderRadius: 3 },

  // EMPTY & LOADING
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});
