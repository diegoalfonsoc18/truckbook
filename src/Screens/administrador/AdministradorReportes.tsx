import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SectionList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useTheme, getShadow } from "../../constants/Themecontext";
import supabase from "../../config/SupaBaseConfig";

interface RegistroActividad {
  id: string;
  tipo: "gasto" | "ingreso";
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
  const placa = useVehiculoStore((s) => s.placa);

  const [secciones, setSecciones] = useState<SeccionPorFecha[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!placa) return;

    try {
      // Cargar gastos e ingresos en paralelo
      const [gastosRes, ingresosRes] = await Promise.all([
        supabase
          .from("conductor_gastos")
          .select("*")
          .eq("placa", placa)
          .order("fecha", { ascending: false }),
        supabase
          .from("conductor_ingresos")
          .select("*")
          .eq("placa", placa)
          .order("fecha", { ascending: false }),
      ]);

      const gastos = gastosRes.data || [];
      const ingresos = ingresosRes.data || [];

      // Recopilar conductor_ids unicos
      const conductorIds = new Set<string>();
      gastos.forEach((g) => conductorIds.add(g.conductor_id));
      ingresos.forEach((i) => conductorIds.add(i.conductor_id));

      // Buscar nombres de conductores
      const nombresMap: Record<string, string> = {};
      for (const id of conductorIds) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("user_id", id)
          .maybeSingle();
        nombresMap[id] = usuario?.nombre || "Desconocido";
      }

      // Combinar y agrupar por fecha
      const registros: RegistroActividad[] = [
        ...gastos.map((g) => ({
          id: g.id,
          tipo: "gasto" as const,
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
          conductor_id: i.conductor_id,
          conductor_nombre: nombresMap[i.conductor_id] || "Desconocido",
          tipo_movimiento: i.tipo_ingreso,
          descripcion: i.descripcion,
          monto: i.monto,
          fecha: i.fecha,
          estado: i.estado,
        })),
      ];

      // Agrupar por fecha
      const porFecha: Record<string, RegistroActividad[]> = {};
      for (const reg of registros) {
        if (!porFecha[reg.fecha]) porFecha[reg.fecha] = [];
        porFecha[reg.fecha].push(reg);
      }

      // Crear secciones ordenadas por fecha descendente
      const seccionesData: SeccionPorFecha[] = Object.keys(porFecha)
        .sort((a, b) => b.localeCompare(a))
        .map((fecha) => {
          const items = porFecha[fecha];
          const conductoresUnicos = [
            ...new Set(items.map((i) => i.conductor_nombre)),
          ];
          const totalGastos = items
            .filter((i) => i.tipo === "gasto")
            .reduce((sum, i) => sum + i.monto, 0);
          const totalIngresos = items
            .filter((i) => i.tipo === "ingreso")
            .reduce((sum, i) => sum + i.monto, 0);

          return {
            title: formatFechaHeader(fecha),
            fecha,
            conductores: conductoresUnicos,
            totalGastos,
            totalIngresos,
            data: items,
          };
        });

      setSecciones(seccionesData);
    } catch (err) {
      console.error("Error cargando reportes admin:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [placa]);

  useEffect(() => {
    setLoading(true);
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  if (!placa) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚛</Text>
            <Text style={[styles.emptyTitle, ds.text]}>
              Sin vehiculo seleccionado
            </Text>
            <Text style={[styles.emptySubtitle, ds.textSecondary]}>
              Selecciona un vehiculo en Home para ver sus reportes
            </Text>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.accent }]}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Volver a Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (loading) {
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
                Actividad del vehiculo
              </Text>
            </View>
            <View style={styles.placaBadge}>
              <Text style={styles.placaText}>{placa}</Text>
            </View>
          </View>
        </View>

        {/* LISTA POR FECHA */}
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
                No hay gastos ni ingresos para este vehiculo
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

              {/* Conductores del dia */}
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
                    <Text style={[styles.conductorChipText, { color: colors.accent }]}>
                      {nombre}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Resumen del dia */}
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
                        item.tipo === "ingreso" ? colors.income : colors.expense,
                    }}>
                    {item.tipo === "ingreso" ? "INGRESO" : "GASTO"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.registroMonto,
                    {
                      color:
                        item.tipo === "ingreso" ? colors.income : colors.expense,
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER
  headerFixed: { paddingHorizontal: 20, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#000",
  },
  placaText: { fontSize: 14, fontWeight: "700", color: "#000" },

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
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
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
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
