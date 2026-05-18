import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../constants/Themecontext";
import { TipoTransaccion } from "../services/geminiService";
import { useEscanearFactura } from "../hooks/useEscanearFactura";

const TAB_BAR_HEIGHT = 60;
const FAB_SIZE = 64;

// Colores AI
const AI_CORE = "#1A1A1A";
const AI_ACCENT = "#FFFFFF";

export default function FabEscanear() {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { escanear, procesando } = useEscanearFactura();

  const [selectorVisible, setSelectorVisible] = useState(false);
  const [fuenteVisible, setFuenteVisible] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<TipoTransaccion | null>(null);

  const abrirSelector = () => setSelectorVisible(true);
  const cerrarTodo = () => {
    setSelectorVisible(false);
    setFuenteVisible(false);
  };

  const elegirTipo = (tipo: TipoTransaccion) => {
    setTipoSeleccionado(tipo);
    setSelectorVisible(false);
    setFuenteVisible(true);
  };

  const pendingRef = useRef<{ tipo: TipoTransaccion; fuente: "camara" | "galeria" } | null>(null);

  const elegirFoto = (fuente: "camara" | "galeria") => {
    const tipo = tipoSeleccionado;
    if (!tipo) return;
    pendingRef.current = { tipo, fuente };
    setFuenteVisible(false);
    if (Platform.OS === "android") {
      setTimeout(onFuenteDismiss, 300);
    }
  };

  const onFuenteDismiss = async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    await escanear(pending.tipo, pending.fuente);
    setTipoSeleccionado(null);
  };

  const bottomOffset =
    (insets.bottom > 0 ? insets.bottom : 12) + TAB_BAR_HEIGHT + 12;

  return (
    <>
      <View
        style={[s.fabContainer, { bottom: bottomOffset }]}
        pointerEvents="box-none">
        <TouchableOpacity
          style={s.fab}
          onPress={abrirSelector}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Registrar gastos o ingresos automáticamente con IA"
          disabled={procesando}>
          <View style={[s.fabInner, { backgroundColor: AI_CORE }]}>
            {procesando ? (
              <ActivityIndicator color={AI_ACCENT} />
            ) : (
              <Ionicons name="sparkles" size={24} color={AI_ACCENT} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal: Selector Gasto/Ingreso */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarTodo}>
        <Pressable
          style={[s.overlay, { backgroundColor: c.overlay }]}
          onPress={cerrarTodo}>
          <Pressable
            style={[
              s.sheet,
              {
                backgroundColor: c.modalBg,
                paddingBottom: insets.bottom + 20,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.title, { color: c.text }]}>Escanear factura</Text>
            <Text style={[s.subtitle, { color: c.textSecondary }]}>
              ¿Qué tipo de transacción es?
            </Text>

            <View style={s.tipoRow}>
              <TouchableOpacity
                style={[
                  s.tipoCard,
                  {
                    backgroundColor: isDark ? "#2A0E10" : "#FEE8EA",
                    borderColor: c.expense,
                  },
                ]}
                onPress={() => elegirTipo("gasto")}
                activeOpacity={0.85}>
                <View
                  style={[s.tipoIcon, { backgroundColor: c.expense + "33" }]}>
                  <Ionicons name="arrow-down" size={26} color={c.expense} />
                </View>
                <Text style={[s.tipoLabel, { color: c.expense }]}>Gasto</Text>
                <Text style={[s.tipoHint, { color: c.textMuted }]}>
                  Factura de compra
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.tipoCard,
                  {
                    backgroundColor: isDark ? "#0D2E1A" : "#E6F8EE",
                    borderColor: c.income,
                  },
                ]}
                onPress={() => elegirTipo("ingreso")}
                activeOpacity={0.85}>
                <View
                  style={[s.tipoIcon, { backgroundColor: c.income + "33" }]}>
                  <Ionicons name="arrow-up" size={26} color={c.income} />
                </View>
                <Text style={[s.tipoLabel, { color: c.income }]}>Ingreso</Text>
                <Text style={[s.tipoHint, { color: c.textMuted }]}>
                  Cta. cobro o flete
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.cancelBtn} onPress={cerrarTodo}>
              <Text style={[s.cancelText, { color: c.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: Cámara o galería */}
      <Modal
        visible={fuenteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFuenteVisible(false)}
        onDismiss={Platform.OS === "ios" ? onFuenteDismiss : undefined}>
        <Pressable
          style={[s.overlay, { backgroundColor: c.overlay }]}
          onPress={() => setFuenteVisible(false)}>
          <Pressable
            style={[
              s.sheet,
              {
                backgroundColor: c.modalBg,
                paddingBottom: insets.bottom + 20,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={[s.handle, { backgroundColor: c.border }]} />
            <Text style={[s.title, { color: c.text }]}>
              {tipoSeleccionado === "gasto"
                ? "Foto del gasto"
                : "Foto del ingreso"}
            </Text>

            <TouchableOpacity
              style={[
                s.fuenteRow,
                { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
              ]}
              onPress={() => elegirFoto("camara")}>
              <Ionicons name="camera-outline" size={24} color={c.accent} />
              <Text style={[s.fuenteLabel, { color: c.text }]}>Tomar foto</Text>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.fuenteRow,
                { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
              ]}
              onPress={() => elegirFoto("galeria")}>
              <Ionicons name="image-outline" size={24} color={c.accent} />
              <Text style={[s.fuenteLabel, { color: c.text }]}>
                Elegir de galería
              </Text>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setFuenteVisible(false)}>
              <Text style={[s.cancelText, { color: c.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fabInner: {
    width: FAB_SIZE - 6,
    height: FAB_SIZE - 6,
    borderRadius: (FAB_SIZE - 6) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 18,
  },
  tipoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  tipoCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  tipoIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tipoLabel: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  tipoHint: {
    fontSize: 11,
    textAlign: "center",
  },
  fuenteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  fuenteLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    padding: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
