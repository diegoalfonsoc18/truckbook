// src/Screens/CentroPendientes/CentroPendientes.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../constants/Themecontext";
import { useIngresosStore } from "../../store/IngresosStore";
import { useGastosStore } from "../../store/GastosStore";
import {
  calcularPorCobrar,
  calcularPorPagar,
  resumirPendientes,
  formatCOP,
  COLORES_ESTADO_COBRO,
  COLORES_ESTADO_PAGO,
  LABELS_COBRO,
  LABELS_PAGO,
  PorCobrar,
  PorPagar,
} from "../../services/pendientesService";
import {
  generarInsights,
  InsightsPendientes,
} from "../../services/insightsService";
import { getAICache, writeAICache } from "../../utils/aiCache";

type Tab = "cobrar" | "pagar";

const CACHE_INSIGHTS = "@truckbook_centro_insights_v1";
const TTL_INSIGHTS = 6 * 3_600_000; // 6 horas

export default function CentroPendientes() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const c = colors;

  const ingresos = useIngresosStore((s) => s.ingresos);
  const gastos = useGastosStore((s) => s.gastos);

  const [tab, setTab] = useState<Tab>("cobrar");
  const [insights, setInsights] = useState<InsightsPendientes | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [mensajeVisible, setMensajeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const porCobrar = useMemo(() => calcularPorCobrar(ingresos), [ingresos]);
  const porPagar = useMemo(() => calcularPorPagar(gastos), [gastos]);
  const resumen = useMemo(
    () => resumirPendientes(porCobrar, porPagar),
    [porCobrar, porPagar]
  );

  // Huella del resumen: si los pendientes no cambiaron, el insight cacheado sigue válido
  const fpResumen = `${resumen.countPorCobrar}|${resumen.totalPorCobrar}|${resumen.countVencidosCobro}|${resumen.countVencidosPago}|${resumen.countProximosPago}|${resumen.totalPorPagar}`;

  const cargarInsights = useCallback(async (force = false) => {
    if (!force) {
      const cached = await getAICache<InsightsPendientes>(
        CACHE_INSIGHTS,
        TTL_INSIGHTS,
        fpResumen,
      );
      if (cached) {
        setInsights(cached);
        return;
      }
    }
    setLoadingIA(true);
    const result = await generarInsights(resumen);
    if (result) await writeAICache(CACHE_INSIGHTS, result, fpResumen);
    setInsights(result);
    setLoadingIA(false);
  }, [resumen, fpResumen]);

  useEffect(() => {
    cargarInsights();
  }, []); // Solo al montar

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarInsights(true);
    setRefreshing(false);
  }, [cargarInsights]);

  const enviarWhatsApp = (telefono: string, mensaje: string) => {
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir WhatsApp")
    );
  };

  const mostrarMensajeCobro = (item: PorCobrar) => {
    const msg =
      insights?.mensajeCobro ??
      `Hola! Te recordamos que tienes una cuenta pendiente de pago por ${formatCOP(item.montoRestante)}. Por favor comunícate con nosotros. Gracias.`;
    Alert.alert(
      `Cobrar a ${item.cliente}`,
      msg,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar por WhatsApp",
          onPress: () => enviarWhatsApp("", msg),
        },
        {
          text: "Copiar",
          onPress: () => {
            Alert.alert("Copiado", "Mensaje copiado al portapapeles");
          },
        },
      ]
    );
  };

  const styles = makeStyles(c, isDark);

  const tieneUrgentes =
    resumen.countVencidosCobro > 0 || resumen.countVencidosPago > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Centro de Pagos</Text>
        <View style={styles.headerBadges}>
          {resumen.countVencidosCobro > 0 && (
            <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.badgeText}>{resumen.countVencidosCobro}</Text>
            </View>
          )}
          {resumen.countProximosPago > 0 && (
            <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
              <Text style={styles.badgeText}>{resumen.countProximosPago}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
          />
        }
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}>

        {/* IA Card */}
        <View style={styles.iaCard}>
          <View style={styles.iaHeader}>
            <View style={styles.iaLeft}>
              <Ionicons name="sparkles" size={16} color={c.accent} />
              <Text style={[styles.iaLabel, { color: c.accent }]}>
                Resumen IA
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => cargarInsights(true)}
              disabled={loadingIA}
              style={styles.iaRefresh}>
              {loadingIA ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={c.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>

          {insights ? (
            <>
              <Text style={styles.iaResumen}>{insights.resumen}</Text>
              {!!insights.alerta && (
                <View style={styles.iaAlerta}>
                  <Ionicons
                    name="warning-outline"
                    size={14}
                    color="#F59E0B"
                  />
                  <Text style={styles.iaAlertaText}>{insights.alerta}</Text>
                </View>
              )}
              {insights.mensajeCobro && (
                <TouchableOpacity
                  style={[
                    styles.iaMensajeBtn,
                    { borderColor: c.accent + "40" },
                  ]}
                  onPress={() => setMensajeVisible(!mensajeVisible)}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={13}
                    color={c.accent}
                  />
                  <Text style={[styles.iaMensajeBtnText, { color: c.accent }]}>
                    Ver mensaje de cobro
                  </Text>
                  <Ionicons
                    name={mensajeVisible ? "chevron-up" : "chevron-down"}
                    size={13}
                    color={c.accent}
                  />
                </TouchableOpacity>
              )}
              {mensajeVisible && insights.mensajeCobro && (
                <Text style={styles.iaMensaje}>{insights.mensajeCobro}</Text>
              )}
            </>
          ) : (
            <Text style={styles.iaSinDatos}>
              {loadingIA
                ? "Analizando tus finanzas..."
                : "Toca actualizar para obtener el resumen"}
            </Text>
          )}
        </View>

        {/* Resumen de totales */}
        <View style={styles.totalesRow}>
          <View
            style={[
              styles.totalCard,
              { backgroundColor: tieneUrgentes ? "#EF444415" : c.cardBg },
            ]}>
            <Text style={styles.totalLabel}>Por cobrar</Text>
            <Text style={[styles.totalMonto, { color: "#EF4444" }]}>
              {formatCOP(resumen.totalPorCobrar)}
            </Text>
            <Text style={styles.totalSub}>
              {resumen.countPorCobrar} cuenta
              {resumen.countPorCobrar !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={[styles.totalCard, { backgroundColor: c.cardBg }]}>
            <Text style={styles.totalLabel}>Por pagar</Text>
            <Text style={[styles.totalMonto, { color: "#F59E0B" }]}>
              {formatCOP(resumen.totalPorPagar)}
            </Text>
            <Text style={styles.totalSub}>
              {porPagar.length} pendiente{porPagar.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["cobrar", "pagar"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tabBtn,
                tab === t && {
                  backgroundColor: c.accent,
                  borderColor: c.accent,
                },
                tab !== t && { borderColor: c.border },
              ]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.tabText,
                  { color: tab === t ? c.accentText : c.textSecondary },
                ]}>
                {t === "cobrar"
                  ? `Por cobrar (${porCobrar.length})`
                  : `Por pagar (${porPagar.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista por cobrar */}
        {tab === "cobrar" && (
          <>
            {porCobrar.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                texto="Sin cuentas pendientes por cobrar"
                color="#16A34A"
                cardBg={c.cardBg}
                textSecondary={c.textSecondary}
              />
            ) : (
              porCobrar.map((item) => (
                <CardCobro
                  key={item.id}
                  item={item}
                  c={c}
                  onCobrar={() => mostrarMensajeCobro(item)}
                />
              ))
            )}
          </>
        )}

        {/* Lista por pagar */}
        {tab === "pagar" && (
          <>
            {porPagar.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                texto="Sin gastos pendientes de pago"
                color="#16A34A"
                cardBg={c.cardBg}
                textSecondary={c.textSecondary}
              />
            ) : (
              porPagar.map((item) => (
                <CardPago key={item.id} item={item} c={c} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CardCobro({
  item,
  c,
  onCobrar,
}: {
  item: PorCobrar;
  c: any;
  onCobrar: () => void;
}) {
  const color = COLORES_ESTADO_COBRO[item.estado];
  const label = LABELS_COBRO[item.estado];

  return (
    <View style={[cardStyles.card, { backgroundColor: c.cardBg }]}>
      <View style={[cardStyles.indicador, { backgroundColor: color }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.row}>
          <Text style={[cardStyles.cliente, { color: c.text }]} numberOfLines={1}>
            {item.cliente}
          </Text>
          <View style={[cardStyles.badge, { backgroundColor: color + "20" }]}>
            <Text style={[cardStyles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>

        {item.descripcion !== item.cliente && (
          <Text
            style={[cardStyles.desc, { color: c.textSecondary }]}
            numberOfLines={1}>
            {item.descripcion}
          </Text>
        )}

        <View style={cardStyles.montoRow}>
          <View>
            <Text style={[cardStyles.monto, { color: c.text }]}>
              {formatCOP(item.montoRestante)}
            </Text>
            {item.montoPagado > 0 && (
              <Text style={[cardStyles.montoPagado, { color: c.textSecondary }]}>
                Pagado: {formatCOP(item.montoPagado)} de{" "}
                {formatCOP(item.monto)}
              </Text>
            )}
          </View>
          <View style={cardStyles.metaCol}>
            {item.diasVencido > 0 && (
              <Text style={[cardStyles.dias, { color: "#EF4444" }]}>
                {item.diasVencido}d vencido
              </Text>
            )}
            {item.fechaVencimiento && item.diasVencido === 0 && (
              <Text style={[cardStyles.dias, { color: c.textSecondary }]}>
                Vence:{" "}
                {item.fechaVencimiento.toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "short",
                })}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[cardStyles.accionBtn, { borderColor: c.accent + "60" }]}
          onPress={onCobrar}
          activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
          <Text style={[cardStyles.accionText, { color: c.accent }]}>
            Cobrar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CardPago({ item, c }: { item: PorPagar; c: any }) {
  const color = COLORES_ESTADO_PAGO[item.estado];
  const label = LABELS_PAGO[item.estado];

  return (
    <View style={[cardStyles.card, { backgroundColor: c.cardBg }]}>
      <View style={[cardStyles.indicador, { backgroundColor: color }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.row}>
          <Text style={[cardStyles.cliente, { color: c.text }]} numberOfLines={1}>
            {item.descripcion}
          </Text>
          <View style={[cardStyles.badge, { backgroundColor: color + "20" }]}>
            <Text style={[cardStyles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>

        <Text style={[cardStyles.desc, { color: c.textSecondary }]}>
          {item.tipoGasto}
        </Text>

        <View style={cardStyles.montoRow}>
          <Text style={[cardStyles.monto, { color: c.text }]}>
            {formatCOP(item.monto)}
          </Text>
          <View style={cardStyles.metaCol}>
            {item.diasParaVencer <= 0 ? (
              <Text style={[cardStyles.dias, { color: "#EF4444" }]}>
                Vencido hace {Math.abs(item.diasParaVencer)}d
              </Text>
            ) : item.fechaVencimiento ? (
              <Text
                style={[
                  cardStyles.dias,
                  { color: item.diasParaVencer <= 3 ? "#EF4444" : "#F59E0B" },
                ]}>
                Vence en {item.diasParaVencer}d
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  texto,
  color,
  cardBg,
  textSecondary,
}: {
  icon: any;
  texto: string;
  color: string;
  cardBg: string;
  textSecondary: string;
}) {
  return (
    <View style={[emptyStyles.container, { backgroundColor: cardBg }]}>
      <Ionicons name={icon} size={40} color={color} />
      <Text style={[emptyStyles.texto, { color: textSecondary }]}>{texto}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.5,
    },
    headerBadges: { flexDirection: "row", gap: 6 },
    badge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
    scroll: { paddingHorizontal: 16, gap: 12 },

    // IA Card
    iaCard: {
      backgroundColor: c.cardBg,
      borderRadius: 28,
      padding: 16,
      borderWidth: 1,
      borderColor: c.accent + "30",
    },
    iaHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    iaLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    iaLabel: { fontSize: 13, fontWeight: "600" },
    iaRefresh: { padding: 4 },
    iaResumen: {
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
      marginBottom: 8,
    },
    iaAlerta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#F59E0B15",
      borderRadius: 8,
      padding: 8,
      marginBottom: 8,
    },
    iaAlertaText: { fontSize: 13, color: "#F59E0B", flex: 1 },
    iaMensajeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      marginTop: 4,
    },
    iaMensajeBtnText: { fontSize: 13, fontWeight: "500", flex: 1 },
    iaMensaje: {
      marginTop: 8,
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
      fontStyle: "italic",
    },
    iaSinDatos: { fontSize: 13, color: c.textSecondary, textAlign: "center" },

    // Totales
    totalesRow: { flexDirection: "row", gap: 10 },
    totalCard: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
    },
    totalLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
    totalMonto: { fontSize: 18, fontWeight: "700", letterSpacing: -0.5 },
    totalSub: { fontSize: 11, color: "#888", marginTop: 2 },

    // Tabs
    tabs: { flexDirection: "row", gap: 8 },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
    },
    tabText: { fontSize: 13, fontWeight: "600" },
  });

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 2,
  },
  indicador: { width: 4 },
  body: { flex: 1, padding: 14, gap: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cliente: { fontSize: 15, fontWeight: "600", flex: 1, marginRight: 8 },
  desc: { fontSize: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  montoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  monto: { fontSize: 17, fontWeight: "700" },
  montoPagado: { fontSize: 11, marginTop: 2 },
  metaCol: { alignItems: "flex-end" },
  dias: { fontSize: 12, fontWeight: "600" },
  accionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  accionText: { fontSize: 13, fontWeight: "600" },
});

const emptyStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  texto: { fontSize: 14, textAlign: "center" },
});
