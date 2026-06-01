// src/Screens/itemsPage/Licencia.tsx

import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLicencia } from "../../hooks/useLicencia";
import { useTheme, getShadow } from "../../constants/Themecontext";

const COLOR_OK      = "#2EC98D";
const COLOR_WARNING = "#FBBF24";
const COLOR_DANGER  = "#EF4444";
const COLOR_UNKNOWN = "#6B7280";

function statusColor(vigente: boolean, dias: number, sinDatos: boolean): string {
  if (sinDatos) return COLOR_UNKNOWN;
  if (!vigente) return COLOR_DANGER;
  if (dias <= 30) return COLOR_WARNING;
  return COLOR_OK;
}

function statusIcon(vigente: boolean, dias: number, sinDatos: boolean): keyof typeof Ionicons.glyphMap {
  if (sinDatos) return "help-circle";
  if (!vigente) return "close-circle";
  if (dias <= 30) return "warning";
  return "card";
}

function statusLabel(vigente: boolean, dias: number, sinDatos: boolean): string {
  if (sinDatos) return "Sin datos";
  if (!vigente) return "Vencida";
  if (dias <= 30) return `Vence en ${dias} días`;
  return "Vigente";
}

export default function Licencia({ route }: any) {
  const navigation = useNavigation();
  const { colors: c, isDark } = useTheme();
  const [refrescando, setRefrescando] = useState(false);

  const documento = route?.params?.documento || "";

  const {
    licencia: respuestaLicencia,
    cargando,
    error,
    recargar,
    esLicenciaVigente,
    diasParaVencerLicencia,
  } = useLicencia(documento, !!documento);

  const handleRefresh = async () => {
    setRefrescando(true);
    try { await recargar(); } finally { setRefrescando(false); }
  };

  const formatDate = (fecha?: string): string => {
    if (!fecha) return "N/A";
    try { return new Date(fecha).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return fecha; }
  };

  const shadow = getShadow(isDark, "md");
  const cardBorder = isDark ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" } : {};

  const sinDatos = !respuestaLicencia?.licencia;
  const color = statusColor(esLicenciaVigente, diasParaVencerLicencia, sinDatos);

  const ultimaActualizacion = respuestaLicencia?.timestamp
    ? new Date(respuestaLicencia.timestamp).toLocaleDateString("es-CO", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  // ─── Header ──────────────────────────────────────────────────────────────
  const Header = () => (
    <View style={s.header}>
      <TouchableOpacity
        style={[s.backBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : c.surface }]}
        onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={22} color={c.text} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: c.text }]}>Licencia</Text>
      {/* Badge con número de documento en lugar de placa */}
      <View style={[s.docBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : c.surface }]}>
        <Ionicons name="id-card-outline" size={14} color={c.textSecondary} />
        <Text style={[s.docText, { color: c.textSecondary }]} numberOfLines={1}>
          {documento || "—"}
        </Text>
      </View>
    </View>
  );

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (cargando && !respuestaLicencia) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <Header />
          <View style={s.centered}>
            <ActivityIndicator size="large" color={COLOR_OK} />
            <Text style={[s.loadingText, { color: c.textSecondary }]}>Consultando licencia…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (error && !respuestaLicencia) {
    return (
      <View style={[s.container, { backgroundColor: c.primary }]}>
        <SafeAreaView style={s.safeArea} edges={["top"]}>
          <Header />
          <View style={s.centered}>
            <Ionicons name="warning" size={52} color={c.expense} />
            <Text style={[s.emptyTitle, { color: c.text }]}>Error al consultar</Text>
            <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.expense }]} onPress={handleRefresh}>
              <Text style={s.actionBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        <Header />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={handleRefresh} tintColor={COLOR_OK} />
          }>

          {/* ── Hero de estado ─────────────────────────────────────────── */}
          <View style={[s.heroCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : c.cardBg }, shadow]}>
            <View style={[s.heroIcon, { backgroundColor: color + "22" }]}>
              <Ionicons name={statusIcon(esLicenciaVigente, diasParaVencerLicencia, sinDatos)} size={40} color={color} />
            </View>
            <Text style={[s.heroLabel, { color }]}>{statusLabel(esLicenciaVigente, diasParaVencerLicencia, sinDatos)}</Text>
            {respuestaLicencia?.licencia?.fechaVencimiento && (
              <Text style={[s.heroDate, { color: c.textSecondary }]}>
                Vence el {formatDate(respuestaLicencia.licencia.fechaVencimiento)}
              </Text>
            )}
            {!sinDatos && (
              <View style={[s.diasBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.surface }]}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={[s.diasText, { color }]}>
                  {esLicenciaVigente
                    ? `${diasParaVencerLicencia} días restantes`
                    : "Licencia vencida"}
                </Text>
              </View>
            )}
          </View>

          {/* ── Barra actualizar ───────────────────────────────────────── */}
          <View style={s.updateRow}>
            <View style={s.updateInfo}>
              <Ionicons name="time-outline" size={13} color={c.textMuted} />
              <Text style={[s.updateText, { color: c.textMuted }]}>{ultimaActualizacion || "—"}</Text>
            </View>
            <TouchableOpacity
              style={[s.updateBtn, { backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#DCFCE7" }]}
              onPress={handleRefresh}
              disabled={refrescando}>
              {refrescando
                ? <ActivityIndicator size="small" color={COLOR_OK} />
                : <>
                    <Ionicons name="refresh" size={15} color={COLOR_OK} />
                    <Text style={[s.updateBtnText, { color: COLOR_OK }]}>Actualizar</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* ── Detalle licencia ───────────────────────────────────────── */}
          {respuestaLicencia?.licencia ? (
            <View style={[s.detailCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : c.cardBg }, cardBorder, shadow]}>
              <Text style={[s.detailTitle, { color: c.text }]}>Detalle de la licencia</Text>

              {[
                { label: "N° Licencia",        value: respuestaLicencia.licencia.numeroLicencia },
                { label: "Tipo",               value: respuestaLicencia.licencia.tipoLicencia },
                { label: "Categorías",         value: respuestaLicencia.licencia.categoriasPermitidas },
                { label: "Estado",             value: respuestaLicencia.licencia.estado },
                { label: "Fecha expedición",   value: formatDate(respuestaLicencia.licencia.fechaExpedicion) },
                { label: "Fecha vencimiento",  value: formatDate(respuestaLicencia.licencia.fechaVencimiento), highlight: color },
              ].map((row, i, arr) => (
                <View key={i} style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border + "55" }]}>
                  <Text style={[s.infoLabel, { color: c.textSecondary }]}>{row.label}</Text>
                  <Text style={[s.infoValue, { color: row.highlight || c.text }]}>{row.value || "N/A"}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.centered}>
              <Ionicons name="id-card-outline" size={60} color={c.textMuted} />
              <Text style={[s.emptyTitle, { color: c.text }]}>Sin información</Text>
              <Text style={[s.emptySubtitle, { color: c.textSecondary }]}>
                No se encontró licencia para este documento
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  docBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, maxWidth: 130 },
  docText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "500" },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

  listContent: { paddingBottom: 100, paddingTop: 4 },

  heroCard: {
    borderRadius: 22, padding: 24, marginHorizontal: 20, marginBottom: 12,
    alignItems: "center", gap: 8,
  },
  heroIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  heroLabel: { fontSize: 22, fontWeight: "800" },
  heroDate: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  diasBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 6,
  },
  diasText: { fontSize: 13, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3 },

  updateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  updateInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  updateText: { fontSize: 11, fontWeight: "500" },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  updateBtnText: { fontSize: 13, fontWeight: "700" },

  detailCard: { borderRadius: 28, padding: 18, marginHorizontal: 20, marginBottom: 12 },
  detailTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12, opacity: 0.6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  infoLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
  infoValue: { fontSize: 14, fontWeight: "700", flex: 1, textAlign: "right" },
});
