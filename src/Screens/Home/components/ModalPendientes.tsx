// src/Screens/Home/components/ModalPendientes.tsx
//
// Cuentas por cobrar, agrupadas por cliente.
//
// La agrupación no es cosmética: la cuenta de cobro de WhatsApp siempre se
// arma con TODOS los fletes pendientes del cliente, así que una lista plana
// repetía el mismo botón —y el mismo mensaje— en cada fila del mismo cliente.
// Llamar y cobrar por WhatsApp son acciones del cliente; marcar cobrado es de
// cada flete. La jerarquía visual sigue esa división.
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
  StyleSheet,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIngresosStore } from "../../../store/IngresosStore";
import supabase from "../../../config/SupaBaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGemini } from "../../../config/aiConfig";
import { fmtI, diasDesde, extraerTelDesc, formatearTel } from "../homeUtils";
import { mensajeCuentaCobro } from "../../../utils/cuentaCobro";
import { useTheme, getShadow } from "../../../constants/Themecontext";
import { useClientType } from "../../../hooks/useClientType";

const CACHE_PEND_IA = "@truckbook_pend_modal_ia_v1";

const WHATSAPP = "#25D366";
const TEL_AZUL = "#3B82F6";

/** Umbrales de antigüedad de una deuda, en días. */
const DIAS_VENCIDO = 15;
const DIAS_ALERTA = 7;

type Ingreso = ReturnType<typeof useIngresosStore.getState>["ingresos"][number];

interface Grupo {
  cliente: string;
  items: Ingreso[];
  total: number;
  /** Días del flete más viejo — es lo que define la urgencia del grupo. */
  diasMax: number;
  /** Primer teléfono encontrado entre los fletes del cliente. */
  tel: string;
}

/** Monto real de un ingreso: un registro puede ser el mismo flete repetido. */
const montoTotal = (i: Ingreso) => (i.monto ?? 0) * (i.cantidad ?? 1);

/** Nombre del cliente: columna `cliente` o el primer segmento de la descripción. */
function nombreCliente(i: Ingreso): string {
  const { desc } = extraerTelDesc(i.descripcion ?? "");
  return (desc || i.tipo_ingreso || "Flete").split(" · ")[0].trim();
}

/** Detalle del flete, sin el nombre del cliente que ya va en la cabecera. */
function detalleFlete(i: Ingreso): string | null {
  const { desc } = extraerTelDesc(i.descripcion ?? "");
  const partes = (desc || i.tipo_ingreso || "Flete").split(" · ");
  return partes.length > 1 ? partes.slice(1).join(" · ") : null;
}

export function ModalPendientes({
  visible,
  onClose,
  pendientes,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  pendientes: Ingreso[];
  isDark: boolean;
}) {
  const { colors: c } = useTheme();
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null);
  const [loadingGem, setLoadingGem] = useState(false);
  const [cobrando, setCobrando] = useState<string | null>(null);

  const AMBER = c.warning;

  /** Color según qué tan vieja es la deuda. */
  const colorPorDias = (d: number) =>
    d >= DIAS_VENCIDO ? c.danger : d >= DIAS_ALERTA ? AMBER : c.success;

  // ── Agrupar por cliente, lo más viejo primero ─────────────────────────────
  // Ordenar por antigüedad y no por monto: lo que hace falta cobrar primero es
  // lo que lleva más tiempo sin pagarse.
  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const item of pendientes) {
      const cliente = nombreCliente(item);
      const { tel } = extraerTelDesc(item.descripcion ?? "");
      const dias = item.fecha ? diasDesde(item.fecha) : 0;

      const g = mapa.get(cliente);
      if (g) {
        g.items.push(item);
        g.total += montoTotal(item);
        g.diasMax = Math.max(g.diasMax, dias);
        if (!g.tel && tel) g.tel = tel;
      } else {
        mapa.set(cliente, {
          cliente,
          items: [item],
          total: montoTotal(item),
          diasMax: dias,
          tel: tel || "",
        });
      }
    }
    const lista = Array.from(mapa.values());
    for (const g of lista) {
      g.items.sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
    }
    return lista.sort((a, b) => b.diasMax - a.diasMax);
  }, [pendientes]);

  const clientNames = useMemo(() => grupos.map((g) => g.cliente), [grupos]);
  const clientTypes = useClientType(clientNames);

  const totalPend = useMemo(
    () => pendientes.reduce((a, p) => a + montoTotal(p), 0),
    [pendientes],
  );
  const nVencidos = useMemo(
    () => grupos.filter((g) => g.diasMax >= DIAS_VENCIDO).length,
    [grupos],
  );

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
      // Sanitizar datos de usuario para evitar prompt injection
      const sanitize = (s: string) => s.replace(/[`${}\\]/g, "").slice(0, 50);
      const lines = grupos
        .slice(0, 4)
        .map(
          (g) =>
            `${sanitize(g.cliente)}: ${fmtI(g.total)} (hace ${g.diasMax}d)`,
        )
        .join(", ");
      const prompt =
        `Eres asistente de un camionero colombiano. Tiene ${pendientes.length} cuenta(s) por cobrar: ${lines}. Total: ${fmtI(totalPend)}.\n` +
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
            if (session?.user?.id)
              query = query.eq("conductor_id", session.user.id);
            const { error } = await query;
            if (!error) {
              // Actualiza el caché local directo; el realtime confirma después
              useIngresosStore
                .getState()
                .editarIngreso(id, { estado: "pagado" });
            }
            setCobrando(null);
          },
        },
      ],
    );
  };

  const llamar = (tel: string) => {
    const num = tel ? formatearTel(tel) : "";
    if (!num) {
      Alert.alert(
        "Sin teléfono",
        "No hay un número de teléfono válido registrado para este cliente.",
      );
      return;
    }
    Linking.openURL(`tel:${num}`).catch(() =>
      Alert.alert("Error", "No se pudo abrir el marcador telefónico."),
    );
  };

  const enviarWhatsApp = (g: Grupo) => {
    // Cuenta de cobro con todos los fletes pendientes del cliente
    // Antes había que filtrar estas líneas por cliente, porque la lista era
    // plana y traía las de todos; ahora el grupo ya son solo las suyas.
    const lineas = g.items.map((p) => ({
      fecha: p.fecha,
      detalle: detalleFlete(p) ?? "",
      cantidad: p.cantidad,
      monto: montoTotal(p),
    }));
    const msg = encodeURIComponent(mensajeCuentaCobro(g.cliente, lineas));
    const num = g.tel ? formatearTel(g.tel) : "";
    const url = num
      ? `https://wa.me/${num}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "No se pudo abrir WhatsApp."),
    );
  };

  const fechaCorta = (f?: string | null) =>
    f
      ? new Date(f + "T00:00:00").toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
        })
      : "";

  const etiquetaDias = (d: number) =>
    d === 0 ? "hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[st.overlay, { backgroundColor: c.overlay }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={st.flex} />
        </TouchableWithoutFeedback>

        {/* ── Bottom sheet ── */}
        <View style={[st.hoja, { backgroundColor: c.modalBg }]}>
          <View style={st.handleWrap}>
            <View style={[st.handle, { backgroundColor: c.border }]} />
          </View>

          {/* Header */}
          <View style={st.header}>
            <View style={st.flex}>
              <Text style={[st.titulo, { color: c.text }]}>Por cobrar</Text>
              <View style={st.subtituloRow}>
                <Text style={[st.total, { color: AMBER }]}>
                  {fmtI(totalPend)}
                </Text>
                <Text style={[st.subtitulo, { color: c.textSecondary }]}>
                  {pendientes.length} flete{pendientes.length !== 1 ? "s" : ""}
                  {grupos.length !== pendientes.length
                    ? ` · ${grupos.length} cliente${grupos.length !== 1 ? "s" : ""}`
                    : ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[st.cerrar, { backgroundColor: c.surface }]}>
              <Feather name="x" size={18} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Aviso de vencidas — lo que exige acción hoy */}
          {nVencidos > 0 && (
            <View
              style={[
                st.avisoVencidas,
                { backgroundColor: c.dangerLight, borderColor: c.danger + "40" },
              ]}>
              <Feather name="alert-circle" size={13} color={c.danger} />
              <Text style={[st.avisoVencidasTexto, { color: c.danger }]}>
                {nVencidos} cliente{nVencidos !== 1 ? "s" : ""} lleva
                {nVencidos !== 1 ? "n" : ""} más de {DIAS_VENCIDO} días sin
                pagar
              </Text>
            </View>
          )}

          {/* Consejo de Gemini */}
          {(loadingGem || geminiMsg) && (
            <View
              style={[
                st.gemini,
                { backgroundColor: c.warningLight, borderLeftColor: AMBER },
              ]}>
              {loadingGem ? (
                <ActivityIndicator size="small" color={AMBER} />
              ) : (
                <Text style={st.geminiIcono}>✨</Text>
              )}
              <Text style={[st.geminiTexto, { color: c.text }]}>
                {loadingGem ? "Analizando tus pendientes..." : geminiMsg}
              </Text>
            </View>
          )}

          {/* Lista agrupada por cliente */}
          {grupos.length === 0 ? (
            <View style={st.vacio}>
              <View
                style={[
                  st.vacioIcono,
                  { backgroundColor: c.successLight },
                ]}>
                <Feather name="check" size={26} color={c.success} />
              </View>
              <Text style={[st.vacioTitulo, { color: c.text }]}>
                Todo cobrado
              </Text>
              <Text style={[st.vacioTexto, { color: c.textSecondary }]}>
                No tienes cuentas pendientes por cobrar.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={st.lista}>
              {grupos.map((g) => {
                const color = colorPorDias(g.diasMax);
                const varios = g.items.length > 1;
                const esEmpresa = clientTypes[g.cliente] === "empresa";

                return (
                  <View
                    key={g.cliente}
                    style={[
                      st.card,
                      { backgroundColor: c.cardBg, borderColor: c.border },
                      getShadow(isDark, "sm"),
                    ]}>
                    {/* Cabecera del cliente */}
                    <View style={st.cardHeader}>
                      <View
                        style={[
                          st.avatar,
                          {
                            backgroundColor: color + "18",
                            borderColor: color,
                          },
                        ]}>
                        <Feather
                          name={esEmpresa ? "briefcase" : "user"}
                          size={17}
                          color={color}
                        />
                      </View>

                      <View style={st.flex}>
                        <Text
                          numberOfLines={1}
                          style={[st.cliente, { color: c.text }]}>
                          {g.cliente}
                        </Text>
                        <View style={st.metaRow}>
                          <View
                            style={[
                              st.diasBadge,
                              { backgroundColor: color + "18" },
                            ]}>
                            <Text style={[st.diasTexto, { color }]}>
                              {etiquetaDias(g.diasMax)}
                            </Text>
                          </View>
                          {varios && (
                            <Text
                              style={[st.meta, { color: c.textSecondary }]}>
                              {g.items.length} fletes
                            </Text>
                          )}
                        </View>
                      </View>

                      <Text style={[st.monto, { color: c.text }]}>
                        {fmtI(g.total)}
                      </Text>
                    </View>

                    {/* Fletes del cliente. Con uno solo la fila sobra: sus
                        datos ya están en la cabecera. */}
                    {varios && (
                      <View
                        style={[st.items, { borderTopColor: c.divider }]}>
                        {g.items.map((item) => {
                          const dias = item.fecha ? diasDesde(item.fecha) : 0;
                          const detalle = detalleFlete(item);
                          const cargando = cobrando === item.id;
                          return (
                            <View key={item.id} style={st.itemRow}>
                              <View
                                style={[
                                  st.itemPunto,
                                  { backgroundColor: colorPorDias(dias) },
                                ]}
                              />
                              <View style={st.flex}>
                                <Text
                                  numberOfLines={1}
                                  style={[st.itemTexto, { color: c.text }]}>
                                  {detalle || item.tipo_ingreso || "Flete"}
                                  {(item.cantidad ?? 1) > 1
                                    ? ` ×${item.cantidad}`
                                    : ""}
                                </Text>
                                <Text
                                  style={[
                                    st.itemFecha,
                                    { color: c.textMuted },
                                  ]}>
                                  {fechaCorta(item.fecha)}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  st.itemMonto,
                                  { color: c.textSecondary },
                                ]}>
                                {fmtI(montoTotal(item))}
                              </Text>
                              <TouchableOpacity
                                onPress={() =>
                                  confirmarCobro(
                                    item.id,
                                    g.cliente,
                                    montoTotal(item),
                                  )
                                }
                                disabled={!!cobrando}
                                hitSlop={8}
                                style={[
                                  st.itemCheck,
                                  {
                                    borderColor: c.success + "40",
                                    backgroundColor: c.successLight,
                                  },
                                ]}>
                                {cargando ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={c.success}
                                  />
                                ) : (
                                  <Feather
                                    name="check"
                                    size={14}
                                    color={c.success}
                                  />
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Acciones. Llamar y la cuenta de cobro son del cliente;
                        con un solo flete, "Cobrado" cabe aquí también. */}
                    <View style={[st.acciones, { borderTopColor: c.divider }]}>
                      <TouchableOpacity
                        onPress={() => llamar(g.tel)}
                        style={[
                          st.btn,
                          {
                            backgroundColor: TEL_AZUL + "14",
                            borderColor: TEL_AZUL + "30",
                          },
                        ]}>
                        <Feather name="phone" size={13} color={TEL_AZUL} />
                        <Text style={[st.btnTexto, { color: TEL_AZUL }]}>
                          Llamar
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => enviarWhatsApp(g)}
                        style={[
                          st.btn,
                          {
                            backgroundColor: WHATSAPP + "14",
                            borderColor: WHATSAPP + "30",
                          },
                        ]}>
                        <MaterialCommunityIcons
                          name="whatsapp"
                          size={14}
                          color={WHATSAPP}
                        />
                        <Text style={[st.btnTexto, { color: WHATSAPP }]}>
                          {varios ? "Cuenta de cobro" : "WhatsApp"}
                        </Text>
                      </TouchableOpacity>

                      {!varios && (
                        <TouchableOpacity
                          onPress={() =>
                            confirmarCobro(
                              g.items[0].id,
                              g.cliente,
                              montoTotal(g.items[0]),
                            )
                          }
                          disabled={!!cobrando}
                          style={[
                            st.btn,
                            {
                              backgroundColor: c.successLight,
                              borderColor: c.success + "30",
                            },
                          ]}>
                          {cobrando === g.items[0].id ? (
                            <ActivityIndicator
                              size="small"
                              color={c.success}
                            />
                          ) : (
                            <Feather
                              name="check"
                              size={13}
                              color={c.success}
                            />
                          )}
                          <Text style={[st.btnTexto, { color: c.success }]}>
                            Cobrado
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end" },
  hoja: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 12,
  },
  titulo: { fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  subtituloRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 2,
  },
  total: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  subtitulo: { fontSize: 12.5 },
  cerrar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  avisoVencidas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  avisoVencidasTexto: { fontSize: 12, fontWeight: "600", flex: 1 },

  gemini: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  geminiIcono: { fontSize: 14 },
  geminiTexto: { flex: 1, fontSize: 12.5, lineHeight: 18 },

  lista: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cliente: { fontSize: 14.5, fontWeight: "700", letterSpacing: -0.2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  diasBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diasTexto: { fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 11.5 },
  monto: { fontSize: 16, fontWeight: "800", letterSpacing: -0.4 },

  items: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 2 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 8,
    paddingLeft: 15,
    paddingRight: 13,
  },
  itemPunto: { width: 6, height: 6, borderRadius: 3 },
  itemTexto: { fontSize: 12.5, fontWeight: "500" },
  itemFecha: { fontSize: 11, marginTop: 1 },
  itemMonto: { fontSize: 12.5, fontWeight: "700" },
  itemCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  acciones: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  btnTexto: { fontSize: 12, fontWeight: "600" },

  vacio: { alignItems: "center", paddingVertical: 44, paddingHorizontal: 32 },
  vacioIcono: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  vacioTitulo: { fontSize: 16, fontWeight: "700", marginBottom: 5 },
  vacioTexto: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
