import React, { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
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
import logger from "../../utils/logger";
import { localDateStr } from "../../utils/dataUtils";

interface VehiculoRendimiento {
  placa: string;
  tipo: string;
  ingresos: number;
  gastos: number;
  balance: number;
  rentabilidad: number;
  totalViajes: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function RendimientoVehiculos() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const role = useRoleStore((s) => s.role);

  const [vehiculos, setVehiculos] = useState<VehiculoRendimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordenar, setOrdenar] = useState<"mayor" | "menor">("mayor");
  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "anio">("mes");

  const getRangoFechas = useCallback(() => {
    const now = new Date();
    let inicio: string;
    const fin = localDateStr(now);

    if (periodo === "mes") {
      inicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (periodo === "trimestre") {
      const mesInicio = now.getMonth() - 2;
      const fecha = new Date(now.getFullYear(), mesInicio, 1);
      inicio = localDateStr(fecha);
    } else {
      inicio = `${now.getFullYear()}-01-01`;
    }
    return { inicio, fin };
  }, [periodo]);

  const cargarDatos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: vehiculosData } =
        role === "administrador"
          ? await cargarTodosVehiculosConConductores()
          : await cargarVehiculosPropietarioConConductores(user.id);

      if (!vehiculosData || vehiculosData.length === 0) {
        setVehiculos([]);
        return;
      }

      const placas = vehiculosData.map((v) => v.placa);
      const { inicio, fin } = getRangoFechas();

      const [gastosRes, ingresosRes] = await Promise.all([
        supabase
          .from("conductor_gastos")
          .select("placa, monto")
          .in("placa", placas)
          .gte("fecha", inicio)
          .lte("fecha", fin),
        supabase
          .from("conductor_ingresos")
          .select("placa, monto")
          .in("placa", placas)
          .gte("fecha", inicio)
          .lte("fecha", fin),
      ]);

      const gastos = gastosRes.data || [];
      const ingresos = ingresosRes.data || [];

      // Agrupar por placa
      const gastosPorPlaca: Record<string, number> = {};
      const ingresosPorPlaca: Record<string, number> = {};
      const viajesPorPlaca: Record<string, number> = {};

      gastos.forEach((g) => {
        gastosPorPlaca[g.placa] = (gastosPorPlaca[g.placa] || 0) + g.monto;
      });
      ingresos.forEach((i) => {
        ingresosPorPlaca[i.placa] = (ingresosPorPlaca[i.placa] || 0) + i.monto;
        viajesPorPlaca[i.placa] = (viajesPorPlaca[i.placa] || 0) + 1;
      });

      const resultado: VehiculoRendimiento[] = vehiculosData.map((v) => {
        const ing = ingresosPorPlaca[v.placa] || 0;
        const gas = gastosPorPlaca[v.placa] || 0;
        const bal = ing - gas;
        const rent = ing === 0 ? 0 : (bal / ing) * 100;
        return {
          placa: v.placa,
          tipo: v.tipo || "Camión",
          ingresos: ing,
          gastos: gas,
          balance: bal,
          rentabilidad: rent,
          totalViajes: viajesPorPlaca[v.placa] || 0,
        };
      });

      // Ordenar
      resultado.sort((a, b) =>
        ordenar === "mayor" ? b.balance - a.balance : a.balance - b.balance
      );

      setVehiculos(resultado);
    } catch (err) {
      logger.error("Error cargando rendimiento:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, role, getRangoFechas, ordenar]);

  useEffect(() => {
    setLoading(true);
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const mejorVehiculo = vehiculos.length > 0 ? vehiculos[0] : null;
  const peorVehiculo = vehiculos.length > 0 ? vehiculos[vehiculos.length - 1] : null;
  const totalFlota = vehiculos.reduce((sum, v) => sum + v.balance, 0);

  const getPeriodoLabel = () => {
    if (periodo === "mes") return "Este mes";
    if (periodo === "trimestre") return "Últimos 3 meses";
    return "Este año";
  };

  const getPositionLabel = (index: number) => {
    return `#${index + 1}`;
  };

  const getBarWidth = (balance: number) => {
    if (vehiculos.length === 0) return 0;
    const maxAbs = Math.max(...vehiculos.map((v) => Math.abs(v.balance)), 1);
    return (Math.abs(balance) / maxAbs) * 100;
  };

  const ds = {
    container: { backgroundColor: colors.primary },
    cardBg: { backgroundColor: colors.cardBg, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textMuted: { color: colors.textMuted },
  };

  if (loading) {
    return (
      <View style={[styles.container, ds.container]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, ds.textSecondary]}>
              Analizando rendimiento…
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
              <Text style={[styles.headerTitle, ds.text]}>Rendimiento</Text>
              <Text style={[styles.headerSubtitle, ds.textSecondary]}>
                {getPeriodoLabel()} · {vehiculos.length} vehículos
              </Text>
            </View>
          </View>

          {/* PERIODO SELECTOR */}
          <View style={[styles.periodoRow, ds.cardBg]}>
            {(["mes", "trimestre", "anio"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodoTab,
                  periodo === p && { backgroundColor: colors.accent },
                ]}
                onPress={() => setPeriodo(p)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.periodoTabText,
                    ds.textSecondary,
                    periodo === p && { color: "#FFF" },
                  ]}>
                  {p === "mes" ? "Mes" : p === "trimestre" ? "3 Meses" : "Año"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RESUMEN FLOTA */}
          {vehiculos.length > 0 && (
            <View style={[styles.resumenFlota, ds.cardBg, getShadow(isDark, "sm")]}>
              <View style={styles.resumenRow}>
                <View style={styles.resumenItem}>
                  <Text style={[styles.resumenLabel, ds.textMuted]}>Balance Flota</Text>
                  <Text
                    style={[
                      styles.resumenValue,
                      { color: totalFlota >= 0 ? colors.income : colors.expense },
                    ]}>
                    {formatCurrency(totalFlota)}
                  </Text>
                </View>
              </View>
              {mejorVehiculo && peorVehiculo && vehiculos.length > 1 && (
                <View style={[styles.resumenRow, { marginTop: 10 }]}>
                  <View style={styles.resumenItem}>
                    <Text style={[styles.resumenLabel, ds.textMuted]}>Mejor</Text>
                    <View style={styles.miniPlaca}>
                      <Text style={styles.miniPlacaText}>{mejorVehiculo.placa}</Text>
                    </View>
                  </View>
                  <View style={styles.resumenItem}>
                    <Text style={[styles.resumenLabel, ds.textMuted]}>Menor</Text>
                    <View style={[styles.miniPlaca, { backgroundColor: "#FFD6D6", borderColor: "#C00" }]}>
                      <Text style={[styles.miniPlacaText, { color: "#C00" }]}>
                        {peorVehiculo.placa}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ORDEN TOGGLE */}
          <View style={styles.ordenRow}>
            <TouchableOpacity
              style={[
                styles.ordenBtn,
                ds.cardBg,
                ordenar === "mayor" && { backgroundColor: colors.accent },
              ]}
              onPress={() => setOrdenar("mayor")}>
              <Text
                style={[
                  styles.ordenBtnText,
                  ds.textSecondary,
                  ordenar === "mayor" && { color: "#FFF" },
                ]}>
                Mayor a menor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.ordenBtn,
                ds.cardBg,
                ordenar === "menor" && { backgroundColor: colors.accent },
              ]}
              onPress={() => setOrdenar("menor")}>
              <Text
                style={[
                  styles.ordenBtnText,
                  ds.textSecondary,
                  ordenar === "menor" && { color: "#FFF" },
                ]}>
                Menor a mayor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LISTA DE VEHÍCULOS */}
        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.placa}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚛</Text>
              <Text style={[styles.emptyTitle, ds.text]}>Sin vehículos</Text>
              <Text style={[styles.emptySubtitle, ds.textSecondary]}>
                No hay vehículos registrados para analizar
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.vehiculoCard, ds.cardBg, getShadow(isDark, "sm")]}>
              {/* Header: posición + placa + tipo */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.positionText}>{getPositionLabel(index)}</Text>
                  <View style={styles.placaBadge}>
                    <Text style={styles.placaBadgeText}>{item.placa}</Text>
                  </View>
                  <Text style={[styles.tipoText, ds.textMuted]}>{item.tipo}</Text>
                </View>
                <Text
                  style={[
                    styles.balanceText,
                    { color: item.balance >= 0 ? colors.income : colors.expense },
                  ]}>
                  {formatCurrency(item.balance)}
                </Text>
              </View>

              {/* Barra de rendimiento */}
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${getBarWidth(item.balance)}%`,
                      backgroundColor:
                        item.balance >= 0 ? colors.income : colors.expense,
                    },
                  ]}
                />
              </View>

              {/* Detalles */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, ds.textMuted]}>Ingresos</Text>
                  <Text style={[styles.detailValue, { color: colors.income }]}>
                    {formatCurrency(item.ingresos)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, ds.textMuted]}>Gastos</Text>
                  <Text style={[styles.detailValue, { color: colors.expense }]}>
                    {formatCurrency(item.gastos)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, ds.textMuted]}>Rentab.</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color:
                          item.rentabilidad >= 0 ? colors.income : colors.expense,
                      },
                    ]}>
                    {item.rentabilidad.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, ds.textMuted]}>Viajes</Text>
                  <Text style={[styles.detailValue, ds.text]}>
                    {item.totalViajes}
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
  headerFixed: { paddingHorizontal: 16, paddingBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  // PERIODO
  periodoRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  periodoTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  periodoTabText: { fontSize: 13, fontWeight: "600" },

  // RESUMEN FLOTA
  resumenFlota: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  resumenRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  resumenItem: { alignItems: "center" },
  resumenLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  resumenValue: { fontSize: 20, fontWeight: "700" },
  miniPlaca: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  miniPlacaText: { fontSize: 12, fontWeight: "800", color: "#000" },

  // ORDEN
  ordenRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  ordenBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  ordenBtnText: { fontSize: 12, fontWeight: "600" },

  // LIST
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // VEHICLE CARD
  vehiculoCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  positionText: { fontSize: 18, fontWeight: "700", minWidth: 28 },
  placaBadge: {
    backgroundColor: "#FFE415",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  placaBadgeText: { fontSize: 12, fontWeight: "800", color: "#000", letterSpacing: 0.5 },
  tipoText: { fontSize: 12 },
  balanceText: { fontSize: 16, fontWeight: "700" },

  // BAR
  barContainer: {
    height: 6,
    backgroundColor: "#E8E8ED",
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 3,
    minWidth: 4,
  },

  // DETAILS
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: { alignItems: "center", flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "700" },

  // EMPTY & LOADING
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});
