// src/Screens/FinanzasGeneral/components/ModalExportar.tsx
// Hoja de opciones para exportar el informe: período, cliente, estado de las
// cuentas y categoría.
//
// Solo maneja la selección; generar el PDF sigue siendo del padre, que es
// quien tiene los datos y el acceso a la red. El calendario se renderiza como
// overlay interno (`slotCalendario`) y no como un segundo <Modal>, porque iOS
// no monta un modal encima de otro.
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../constants/Themecontext";
import ChipsCategoria from "./ChipsCategoria";
import {
  ESTADOS_EXPORT,
  HORIZONTAL_PADDING,
  type EstadoFiltro,
} from "../finanzasUtils";

export type PeriodoRapido =
  | "semana"
  | "mes"
  | "mes_anterior"
  | "trimestre"
  | "año"
  | "personalizado";

const PERIODOS: Array<{ key: PeriodoRapido; label: string }> = [
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mes" },
  { key: "mes_anterior", label: "Mes anterior" },
  { key: "trimestre", label: "Trimestre" },
  { key: "año", label: "Este año" },
  { key: "personalizado", label: "Personalizado" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Período */
  periodoRapido: PeriodoRapido;
  onPeriodo: (p: PeriodoRapido) => void;
  rango: { inicio: string; fin: string };
  onAbrirCalendario: (campo: "inicio" | "fin") => void;
  /** Cliente */
  cliente: string | null;
  onCliente: (c: string | null) => void;
  clientesDisponibles: string[];
  /** Estado de las cuentas */
  estado: EstadoFiltro;
  onEstado: (e: EstadoFiltro) => void;
  /** Categoría */
  categoria: string | null;
  onCategoria: (c: string | null) => void;
  onGenerar: () => void;
  /** Calendario, como overlay interno (ver nota de arriba). */
  slotCalendario?: React.ReactNode;
}

export default function ModalExportar({
  visible,
  onClose,
  periodoRapido,
  onPeriodo,
  rango,
  onAbrirCalendario,
  cliente,
  onCliente,
  clientesDisponibles,
  estado,
  onEstado,
  categoria,
  onCategoria,
  onGenerar,
  slotCalendario,
}: Props) {
  const { colors: c } = useTheme();
  const [clienteInputFocused, setClienteInputFocused] = React.useState(false);

  const fechaLarga = (f: string) =>
    new Date(f + "T12:00:00").toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const texto = cliente ?? "";
  const sugerencias =
    clienteInputFocused && texto.length >= 2
      ? clientesDisponibles.filter((cli) =>
          cli.toLowerCase().includes(texto.toLowerCase()),
        )
      : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: c.overlay }]}
          activeOpacity={1}
          onPress={onClose}>
          <TouchableOpacity activeOpacity={1}>
            <View
              style={[styles.exportModalSheet, { backgroundColor: c.modalBg }]}>
              <View
                style={[styles.modalHandle, { backgroundColor: c.textMuted }]}
              />
              <View style={styles.exportModalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Exportar informe
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={22} color={c.textMuted} />
                </TouchableOpacity>
              </View>

              {/* PERÍODO */}
              <Text
                style={[
                  styles.exportSectionLabel,
                  { color: c.textMuted, textTransform: "none" },
                ]}>
                Período
              </Text>
              <View style={styles.periodosGrid}>
                {PERIODOS.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.periodoChip,
                      { borderColor: c.border, backgroundColor: c.cardBg },
                      periodoRapido === key && {
                        backgroundColor: c.accent,
                        borderColor: c.accent,
                      },
                    ]}
                    onPress={() => onPeriodo(key)}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.periodoChipText,
                        { color: c.textSecondary },
                        periodoRapido === key && { color: c.accentText },
                      ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* RANGO PERSONALIZADO */}
              <View
                style={[
                  styles.exportRangeRow,
                  { backgroundColor: c.cardBg, borderColor: c.border },
                ]}>
                <TouchableOpacity
                  style={styles.exportDateBtn}
                  onPress={() => onAbrirCalendario("inicio")}
                  activeOpacity={0.7}>
                  <Text style={[styles.exportDateLabel, { color: c.textMuted }]}>
                    Desde
                  </Text>
                  <Text style={[styles.exportDateValue, { color: c.text }]}>
                    {fechaLarga(rango.inicio)}
                  </Text>
                </TouchableOpacity>
                <Ionicons name="arrow-forward" size={16} color={c.textMuted} />
                <TouchableOpacity
                  style={styles.exportDateBtn}
                  onPress={() => onAbrirCalendario("fin")}
                  activeOpacity={0.7}>
                  <Text style={[styles.exportDateLabel, { color: c.textMuted }]}>
                    Hasta
                  </Text>
                  <Text style={[styles.exportDateValue, { color: c.text }]}>
                    {fechaLarga(rango.fin)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* FILTRO CLIENTE */}
              <Text
                style={[
                  styles.exportSectionLabel,
                  { color: c.textMuted, marginTop: 14, textTransform: "none" },
                ]}>
                Filtrar por cliente (opcional)
              </Text>
              <TextInput
                style={[
                  styles.exportClienteInput,
                  {
                    backgroundColor: c.cardBg,
                    borderColor: cliente ? c.accent : c.border,
                    color: c.text,
                  },
                ]}
                placeholder="Escribe el nombre del cliente..."
                placeholderTextColor={c.textMuted}
                value={texto}
                onChangeText={(t) => {
                  // Misma sanitización que al guardar el cliente
                  // (sanitizarInput en Ingresos): solo se quitan < > { } [ ].
                  // Nombres como "H&H" o "López & Cía" deben poder buscarse;
                  // el PDF escapa estos caracteres al renderizar.
                  const limpio = t.replace(/[<>{}[\]]/g, "").slice(0, 80);
                  onCliente(limpio.length > 0 ? limpio : null);
                }}
                onFocus={() => setClienteInputFocused(true)}
                onBlur={() => setTimeout(() => setClienteInputFocused(false), 150)}
                returnKeyType="done"
              />
              {sugerencias.length > 0 && (
                <View
                  style={[
                    styles.exportSugerencias,
                    { backgroundColor: c.cardBg, borderColor: c.border },
                  ]}>
                  {sugerencias.slice(0, 5).map((cli) => (
                    <TouchableOpacity
                      key={cli}
                      style={[
                        styles.exportSugerenciaItem,
                        { borderBottomColor: c.border },
                      ]}
                      onPress={() => {
                        onCliente(cli);
                        setClienteInputFocused(false);
                      }}
                      activeOpacity={0.7}>
                      <Text style={{ color: c.text, fontSize: 14 }}>{cli}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ESTADO DE LAS CUENTAS */}
              <Text style={[styles.exportSectionLabel, { color: c.text }]}>
                Estado de las cuentas
              </Text>
              <View style={styles.estadoRow}>
                {ESTADOS_EXPORT.map(({ key, label }) => {
                  const selected = estado === key;
                  return (
                    <TouchableOpacity
                      key={key ?? "__ambas"}
                      style={[
                        styles.estadoChip,
                        {
                          backgroundColor: selected ? c.accent : c.cardBg,
                          borderColor: selected ? c.accent : c.border,
                        },
                      ]}
                      onPress={() => onEstado(key)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.estadoChipText,
                          { color: selected ? c.accentText : c.textSecondary },
                        ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* FILTRO CATEGORÍA */}
              <Text style={[styles.exportSectionLabel, { color: c.text }]}>
                Filtrar por categoría (opcional)
              </Text>
              <ChipsCategoria
                value={categoria}
                onChange={onCategoria}
                variante="export"
              />

              {/* GENERAR */}
              <TouchableOpacity
                style={[styles.exportGenerarBtn, { backgroundColor: c.accent }]}
                onPress={onGenerar}
                activeOpacity={0.85}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={c.accentText}
                />
                <Text style={[styles.exportGenerarText, { color: c.accentText }]}>
                  Generar PDF
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Calendario como overlay DENTRO del modal, pero FUERA del
          KeyboardAvoidingView para que el teclado no lo desplace */}
      {slotCalendario && (
        <View style={StyleSheet.absoluteFill}>{slotCalendario}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  estadoChip: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
  },
  estadoChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  estadoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  exportClienteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    letterSpacing: 0, // iOS: evita el tracking raro del placeholder
    marginBottom: 20,
  },
  exportDateBtn: { flex: 1, alignItems: "center" },
  exportDateLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  exportDateValue: { fontSize: 14, fontWeight: "600" },
  exportGenerarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  exportGenerarText: { fontSize: 16, fontWeight: "700" },
  exportModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exportModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  exportRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 8,
  },
  exportSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  exportSugerenciaItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exportSugerencias: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  periodoChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodoChipText: { fontSize: 13, fontWeight: "600" },
  periodosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
});
