// src/Screens/Home/components/ModalPendientes.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import supabase from "../../../config/SupaBaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGemini } from "../../../config/aiConfig";
import {
  fmtI,
  diasDesde,
  extraerTelDesc,
  mensajeCobroWA,
  formatearTel,
} from "../homeUtils";
import { useTheme } from "../../../constants/Themecontext";
import { useClientType } from "../../../hooks/useClientType";

const CACHE_PEND_IA = "@truckbook_pend_modal_ia_v1";

export function ModalPendientes({
  visible,
  onClose,
  pendientes,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  pendientes: ReturnType<typeof useIngresosStore.getState>["ingresos"];
  isDark: boolean;
}) {
  const { colors: c } = useTheme();
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null);
  const [loadingGem, setLoadingGem] = useState(false);
  const [cobrando, setCobrando] = useState<string | null>(null);

  const AMBER = c.warning;

  const clientNames = useMemo(
    () => pendientes.map((p) => {
      const { desc } = extraerTelDesc(p.descripcion ?? "");
      return (desc || p.tipo_ingreso || "Flete").split(" · ")[0].trim();
    }),
    [pendientes],
  );
  const clientTypes = useClientType(clientNames);

  // ── Gemini: consejo al abrir el modal ──────────────────────────────────────
  useEffect(() => {
    if (!visible || pendientes.length === 0) {
      setGeminiMsg(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_PEND_IA);
        if (raw) {
          const { ts, msg } = JSON.parse(raw);
          if (Date.now() - ts < 6 * 3_600_000 && msg) {
            if (!cancelled) setGeminiMsg(msg);
            return;
          }
        }
      } catch {}
      if (!cancelled) setLoadingGem(true);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      // Sanitizar datos de usuario para evitar prompt injection
      const sanitize = (s: string) => s.replace(/[`${}\\]/g, "").slice(0, 50);
      const lines = pendientes
        .slice(0, 4)
        .map((p) => {
          const cl = sanitize((p.descripcion ?? "Flete").split(" · ")[0].trim());
          const dias = p.fecha
            ? Math.floor(
                (hoy.getTime() - new Date(p.fecha + "T00:00:00").getTime()) /
                  86_400_000,
              )
            : 0;
          return `${cl}: ${fmtI((p.monto ?? 0) * (p.cantidad ?? 1))} (hace ${dias}d)`;
        })
        .join(", ");
      const total = pendientes.reduce((a, p) => a + (p.monto ?? 0) * (p.cantidad ?? 1), 0);
      const prompt =
        `Eres asistente de un camionero colombiano. Tiene ${pendientes.length} cuenta(s) por cobrar: ${lines}. Total: ${fmtI(total)}.\n` +
        `Genera UN consejo corto (máximo 80 caracteres) para motivarlo a cobrar hoy. Español colombiano informal. Sin emojis. Solo el texto.`;
      try {
        const { text } = await callGemini(prompt, { maxOutputTokens: 60 });
        const msg = (text ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
        if (!cancelled && msg) {
          setGeminiMsg(msg);
          try {
            await AsyncStorage.setItem(
              CACHE_PEND_IA,
              JSON.stringify({ ts: Date.now(), msg }),
            );
          } catch {}
        }
      } catch {}
      if (!cancelled) setLoadingGem(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, pendientes.length]);

  // ── Marcar como cobrado ────────────────────────────────────────────────────
  const confirmarCobro = (id: string, cliente: string, monto: number) => {
    Alert.alert(
      "¿Confirmar cobro?",
      `¿Marcar el flete de ${cliente} por ${fmtI(monto)} como pagado?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, cobrado",
          style: "default",
          onPress: async () => {
            setCobrando(id);
            const {
              data: { session },
            } = await supabase.auth.getSession();
            let query = supabase
              .from("conductor_ingresos")
              .update({ estado: "pagado" })
              .eq("id", id);
            // Doble filtro: id + conductor_id para prevenir modificar datos de otros
            if (session?.user?.id) query = query.eq("conductor_id", session.user.id);
            const { error } = await query;
            if (!error) {
              // Actualiza el caché local directo; el realtime confirma después
              useIngresosStore.getState().editarIngreso(id, { estado: "pagado" });
            }
            setCobrando(null);
          },
        },
      ],
    );
  };

  const totalPend = pendientes.reduce((a, p) => a + (p.monto ?? 0) * (p.cantidad ?? 1), 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#00000088",
        }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        {/* ── Bottom sheet principal ── */}
        <View
          style={{
            backgroundColor: c.modalBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "82%",
          }}>
          {/* Handle */}
          <View
            style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 4,
            }}>
            <View>
              <Text style={{ fontSize: 19, fontWeight: "700", color: c.text }}>
                Por cobrar
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: AMBER,
                  fontWeight: "600",
                  marginTop: 1,
                }}>
                {fmtI(totalPend)} · {pendientes.length} flete
                {pendientes.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Gemini card */}
          {(loadingGem || geminiMsg) && (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 10,
                marginBottom: 2,
                backgroundColor: c.warningLight,
                borderRadius: 12,
                borderLeftWidth: 3,
                borderLeftColor: AMBER,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}>
              {loadingGem ? (
                <ActivityIndicator size="small" color={AMBER} />
              ) : (
                <Text style={{ fontSize: 14 }}>✨</Text>
              )}
              <Text
                style={{ flex: 1, fontSize: 12.5, color: c.text, lineHeight: 18 }}>
                {loadingGem ? "Analizando tus pendientes..." : geminiMsg}
              </Text>
            </View>
          )}

          {/* Lista de pendientes */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 32,
            }}>
            {pendientes.map((item, i) => {
              const { desc: descLimpia, tel: telContacto } = extraerTelDesc(
                item.descripcion ?? "",
              );
              const rawDesc = descLimpia || item.tipo_ingreso || "Flete";
              const cliente = rawDesc.split(" · ")[0].trim();
              const partes = rawDesc.split(" · ");
              const subtitulo =
                partes.length > 1 ? partes.slice(1).join(" · ") : null;
              const dias = item.fecha ? diasDesde(item.fecha) : 0;
              const fechaLabel = item.fecha
                ? new Date(item.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                : "";
              const avatarBg = dias >= 15 ? "#EF4444" : dias >= 7 ? "#F59E0B" : "#16A34A";
              const cargando = cobrando === item.id;

              return (
                <View key={item.id}>
                  <View style={{ paddingVertical: 13 }}>
                    {/* Fila principal: avatar + info + monto */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                      }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: avatarBg + "18",
                          borderWidth: 1.5,
                          borderColor: avatarBg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                        <Feather name={clientTypes[cliente] === "empresa" ? "briefcase" : "user"} size={18} color={avatarBg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: c.text,
                          }}>
                          {cliente}
                        </Text>
                        {subtitulo && (
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              color: c.textSecondary,
                              marginTop: 1,
                            }}>
                            {subtitulo}
                          </Text>
                        )}
                        <Text
                          style={{ fontSize: 11, color: c.textSecondary, marginTop: 1 }}>
                          {fechaLabel}{(item.cantidad ?? 1) > 1 ? ` · ${item.cantidad} fletes` : ""}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: c.textSecondary,
                        }}>
                        {fmtI((item.monto ?? 0) * (item.cantidad ?? 1))}
                      </Text>
                    </View>

                    {/* Fila de acciones */}
                    <View
                      style={{ flexDirection: "row", gap: 8, marginLeft: 54 }}>
                      {/* Llamar */}
                      <TouchableOpacity
                        onPress={() => {
                          const tel = telContacto
                            ? formatearTel(telContacto)
                            : "";
                          if (!tel) {
                            Alert.alert("Sin teléfono", "No hay un número de teléfono válido registrado para este cliente.");
                            return;
                          }
                          Linking.openURL(`tel:${tel}`).catch(() =>
                            Alert.alert(
                              "Error",
                              "No se pudo abrir el marcador telefónico.",
                            ),
                          );
                        }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          backgroundColor: "#3B82F6" + "14",
                          borderWidth: 1,
                          borderColor: "#3B82F6" + "30",
                          borderRadius: 10,
                          paddingVertical: 7,
                        }}>
                        <Feather name="phone" size={13} color="#3B82F6" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#3B82F6",
                          }}>
                          Llamar
                        </Text>
                      </TouchableOpacity>

                      {/* WhatsApp */}
                      <TouchableOpacity
                        onPress={() => {
                          const msg = encodeURIComponent(
                            mensajeCobroWA(cliente, (item.monto ?? 0) * (item.cantidad ?? 1), dias),
                          );
                          const tel = telContacto
                            ? formatearTel(telContacto)
                            : "";
                          const url = tel
                            ? `https://wa.me/${tel}?text=${msg}`
                            : `https://wa.me/?text=${msg}`;
                          Linking.openURL(url).catch(() =>
                            Alert.alert("Error", "No se pudo abrir WhatsApp."),
                          );
                        }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          backgroundColor: "#25D366" + "14",
                          borderWidth: 1,
                          borderColor: "#25D366" + "30",
                          borderRadius: 10,
                          paddingVertical: 7,
                        }}>
                        <MaterialCommunityIcons
                          name="whatsapp"
                          size={14}
                          color="#25D366"
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#25D366",
                          }}>
                          WhatsApp
                        </Text>
                      </TouchableOpacity>

                      {/* Cobrado */}
                      <TouchableOpacity
                        onPress={() =>
                          confirmarCobro(item.id, cliente, (item.monto ?? 0) * (item.cantidad ?? 1))
                        }
                        disabled={!!cobrando}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          backgroundColor: "#16A34A" + "14",
                          borderWidth: 1,
                          borderColor: "#16A34A" + "30",
                          borderRadius: 10,
                          paddingVertical: 7,
                        }}>
                        {cargando ? (
                          <ActivityIndicator
                            size="small"
                            color="#16A34A"
                            style={{ width: 13, height: 13 }}
                          />
                        ) : (
                          <Feather name="check" size={13} color="#16A34A" />
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#16A34A",
                          }}>
                          Cobrado
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {i < pendientes.length - 1 && (
                    <View style={{ height: 0.5, backgroundColor: c.divider }} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
