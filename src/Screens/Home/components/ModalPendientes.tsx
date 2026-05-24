// src/Screens/Home/components/ModalPendientes.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator,
  ScrollView, Linking, TouchableWithoutFeedback,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { useIngresosStore } from "../../../store/IngresosStore";
import supabase from "../../../config/SupaBaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GEMINI_API_KEY, GEMINI_ENDPOINT } from "../../../config/aiConfig";
import {
  fmtI, diasDesde, labelDias, avatarColor, initials,
  extraerTelDesc, mensajeCobroWA, formatearTel,
} from "../homeUtils";

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
  const { placa } = useVehiculoStore();
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null);
  const [loadingGem, setLoadingGem] = useState(false);
  const [cobrando, setCobrando] = useState<string | null>(null);

  const AMBER = "#FBBF24";
  const GREEN = "#22C55E";
  const WA_GREEN = "#25D366";
  const ink = isDark ? "#F1F5F9" : "#111827";
  const muted = isDark ? "#64748B" : "#9CA3AF";
  const divClr = isDark ? "#2A1800" : "#F0E6CC";
  const modalBg = isDark ? "#160E00" : "#FFFBF0";
  const cardBg = isDark ? "#2A1800" : "#FFF8E7";

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
      if (!GEMINI_API_KEY) return;
      if (!cancelled) setLoadingGem(true);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const lines = pendientes
        .slice(0, 4)
        .map((p) => {
          const cl = (p.descripcion ?? "Flete").split(" · ")[0].trim();
          const dias = p.fecha
            ? Math.floor(
                (hoy.getTime() - new Date(p.fecha + "T00:00:00").getTime()) /
                  86_400_000,
              )
            : 0;
          return `${cl}: ${fmtI(p.monto ?? 0)} (hace ${dias}d)`;
        })
        .join(", ");
      const total = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);
      const prompt =
        `Eres asistente de un camionero colombiano. Tiene ${pendientes.length} cuenta(s) por cobrar: ${lines}. Total: ${fmtI(total)}.\n` +
        `Genera UN consejo corto (máximo 80 caracteres) para motivarlo a cobrar hoy. Español colombiano informal. Sin emojis. Solo el texto.`;
      try {
        const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 60 },
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const msg = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
            .trim()
            .replace(/^["'`]+|["'`]+$/g, "");
          if (!cancelled && msg) {
            setGeminiMsg(msg);
            try {
              await AsyncStorage.setItem(
                CACHE_PEND_IA,
                JSON.stringify({ ts: Date.now(), msg }),
              );
            } catch {}
          }
        }
      } catch {}
      if (!cancelled) setLoadingGem(false);
    })();
    return () => { cancelled = true; };
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
            const { error } = await supabase
              .from("conductor_ingresos")
              .update({ estado: "pagado" })
              .eq("id", id);
            if (!error && placa)
              useIngresosStore.getState().cargarIngresosDelDB(placa);
            setCobrando(null);
          },
        },
      ],
    );
  };

  const totalPend = pendientes.reduce((a, p) => a + (p.monto ?? 0), 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        {/* ── Bottom sheet principal ── */}
        <View style={{ backgroundColor: modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "82%" }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "#3A2800" : "#E0C98A" }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
            <View>
              <Text style={{ fontSize: 19, fontWeight: "700", color: ink }}>Por cobrar</Text>
              <Text style={{ fontSize: 13, color: AMBER, fontWeight: "600", marginTop: 1 }}>
                {fmtI(totalPend)} · {pendientes.length} flete{pendientes.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={muted} />
            </TouchableOpacity>
          </View>

          {/* Gemini card */}
          {(loadingGem || geminiMsg) && (
            <View style={{ marginHorizontal: 20, marginTop: 10, marginBottom: 2, backgroundColor: cardBg, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: AMBER, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              {loadingGem ? (
                <ActivityIndicator size="small" color={AMBER} />
              ) : (
                <Text style={{ fontSize: 14 }}>✨</Text>
              )}
              <Text style={{ flex: 1, fontSize: 12.5, color: ink, lineHeight: 18 }}>
                {loadingGem ? "Analizando tus pendientes..." : geminiMsg}
              </Text>
            </View>
          )}

          {/* Lista de pendientes */}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 }}>
            {pendientes.map((item, i) => {
              const { desc: descLimpia, tel: telContacto } = extraerTelDesc(item.descripcion ?? "");
              const rawDesc = descLimpia || item.tipo_ingreso || "Flete";
              const cliente = rawDesc.split(" · ")[0].trim();
              const partes = rawDesc.split(" · ");
              const subtitulo = partes.length > 1 ? partes.slice(1).join(" · ") : null;
              const dias = item.fecha ? diasDesde(item.fecha) : 0;
              const color = avatarColor(i);
              const cargando = cobrando === item.id;

              return (
                <View key={item.id}>
                  <View style={{ paddingVertical: 13 }}>
                    {/* Fila principal: avatar + info + monto */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color + "25", borderWidth: 1.5, borderColor: color + "55", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color }}>{initials(cliente)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: ink }}>{cliente}</Text>
                        {subtitulo && (
                          <Text numberOfLines={1} style={{ fontSize: 11, color: muted, marginTop: 1 }}>{subtitulo}</Text>
                        )}
                        <Text style={{ fontSize: 11, color: muted, marginTop: 1 }}>{labelDias(dias)}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: AMBER }}>{fmtI(item.monto ?? 0)}</Text>
                    </View>

                    {/* Fila de acciones */}
                    <View style={{ flexDirection: "row", gap: 8, marginLeft: 54 }}>
                      {/* Llamar */}
                      <TouchableOpacity
                        onPress={() => {
                          const tel = telContacto ? formatearTel(telContacto) : "";
                          Linking.openURL(`tel:${tel}`).catch(() => Alert.alert("Error", "No se pudo abrir el marcador telefónico."));
                        }}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: isDark ? "#0D2E1A" : "#E8FFF1", borderWidth: 1, borderColor: GREEN + "55", borderRadius: 10, paddingVertical: 7 }}>
                        <Feather name="phone" size={13} color={GREEN} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: GREEN }}>Llamar</Text>
                      </TouchableOpacity>

                      {/* WhatsApp */}
                      <TouchableOpacity
                        onPress={() => {
                          const msg = encodeURIComponent(mensajeCobroWA(cliente, item.monto ?? 0, dias));
                          const tel = telContacto ? formatearTel(telContacto) : "";
                          const url = tel ? `https://wa.me/${tel}?text=${msg}` : `https://wa.me/?text=${msg}`;
                          Linking.openURL(url).catch(() => Alert.alert("Error", "No se pudo abrir WhatsApp."));
                        }}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: isDark ? "#052E16" : "#E8FFF4", borderWidth: 1, borderColor: WA_GREEN + "55", borderRadius: 10, paddingVertical: 7 }}>
                        <MaterialCommunityIcons name="whatsapp" size={14} color={WA_GREEN} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: WA_GREEN }}>WhatsApp</Text>
                      </TouchableOpacity>

                      {/* Cobrado */}
                      <TouchableOpacity
                        onPress={() => confirmarCobro(item.id, cliente, item.monto ?? 0)}
                        disabled={!!cobrando}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#22C55E1A", borderWidth: 1, borderColor: "#22C55E55", borderRadius: 10, paddingVertical: 7 }}>
                        {cargando ? (
                          <ActivityIndicator size="small" color={GREEN} style={{ width: 13, height: 13 }} />
                        ) : (
                          <Feather name="check" size={13} color={GREEN} />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>Cobrado</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {i < pendientes.length - 1 && (
                    <View style={{ height: 0.5, backgroundColor: divClr }} />
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
