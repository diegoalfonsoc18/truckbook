// src/Screens/Home/components/ModalVehiculos.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useVehiculoStore, TipoCamion } from "../../../store/VehiculoStore";
import { useVehiculosListStore } from "../../../store/VehiculosListStore";
import { useAuth } from "../../../hooks/useAuth";
import supabase from "../../../config/SupaBaseConfig";
import {
  registrarVehiculoPropietario,
  removerConductorDeVehiculo,
} from "../../../services/vehiculoAutorizacionService";
import {
  useTheme,
  TYPOGRAPHY,
  getShadow,
} from "../../../constants/Themecontext";
import ItemIcon, { IconName } from "../../../components/ItemIcon";
import { validarPlaca } from "../../../utils/validacion";
import logger from "../../../utils/logger";
import {
  Vehiculo,
  ICON_MAP,
  TIPOS_CAMION,
  normalizarTipo,
} from "../vehicleConstants";

interface ModalVehiculosProps {
  visible: boolean;
  onClose: () => void;
  /** Called whenever the active vehicle's conductor name is resolved */
  onConductorChange: (nombre: string | undefined) => void;
}

export default function ModalVehiculos({
  visible,
  onClose,
  onConductorChange,
}: ModalVehiculosProps) {
  const { colors: c, isDark } = useTheme();
  const { placa: placaActual, setPlaca, setTipoCamion } = useVehiculoStore();
  const { user } = useAuth();

  const {
    vehiculos: vehiculosStore,
    cargando,
    cargar: cargarVehiculos,
  } = useVehiculosListStore();
  const [placaInput, setPlacaInput] = useState("");
  const [tipoCamionInput, setTipoCamionInput] = useState<TipoCamion | null>(
    null,
  );
  const [guardando, setGuardando] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(
    null,
  );
  const [placaEditInput, setPlacaEditInput] = useState("");
  const [tipoCamionEditInput, setTipoCamionEditInput] =
    useState<TipoCamion | null>(null);

  // Refrescar al abrir modal (el store ya tiene datos pre-cargados desde DataProvider)
  useEffect(() => {
    if (visible && user?.id) cargarVehiculos(user.id);
  }, [visible]);

  const vehiculos: Vehiculo[] = vehiculosStore.map((v) => ({
    id: v.id,
    placa: v.placa,
    tipo_camion: normalizarTipo(v.tipo_camion),
  }));

  const recargar = () => {
    if (user?.id) cargarVehiculos(user.id);
  };

  const getTipoCamionData = (tipo: TipoCamion | null) =>
    TIPOS_CAMION.find((t) => t.id === tipo);

  const handleSeleccionarVehiculo = (vehiculo: Vehiculo) => {
    if (placaActual === vehiculo.placa) {
      useVehiculoStore.getState().clearVehiculo();
      onConductorChange(undefined);
      return;
    }
    setPlaca(vehiculo.placa);
    setTipoCamion(vehiculo.tipo_camion);
    onConductorChange(undefined);
  };

  const cerrarModal = () => {
    onClose();
    setPlacaInput("");
    setTipoCamionInput(null);
    setVehiculoEditando(null);
    setPlacaEditInput("");
    setTipoCamionEditInput(null);
  };

  const abrirEdicion = (v: Vehiculo) => {
    setVehiculoEditando(v);
    setPlacaEditInput(v.placa);
    setTipoCamionEditInput(v.tipo_camion);
  };

  const handleGuardarEdicion = async () => {
    if (!vehiculoEditando || !placaEditInput.trim() || !tipoCamionEditInput)
      return;
    const placaResult = validarPlaca(placaEditInput);
    if (!placaResult.valido) {
      Alert.alert("Placa inválida", placaResult.error);
      return;
    }
    setGuardando(true);
    const placaNueva = placaEditInput
      .trim()
      .toUpperCase()
      .replace(/[-\s]/g, "");
    try {
      await supabase
        .from("vehiculo_conductores")
        .update({ tipo_camion: tipoCamionEditInput })
        .eq("id", vehiculoEditando.id);

      if (placaNueva !== vehiculoEditando.placa) {
        const { data: existeNueva } = await supabase
          .from("vehiculos")
          .select("placa")
          .eq("placa", placaNueva)
          .maybeSingle();
        if (!existeNueva) {
          await supabase.from("vehiculos").insert([{ placa: placaNueva }]);
        }
        await supabase
          .from("vehiculo_conductores")
          .update({ vehiculo_placa: placaNueva })
          .eq("vehiculo_placa", vehiculoEditando.placa);
        if (placaActual === vehiculoEditando.placa) {
          setPlaca(placaNueva);
          setTipoCamion(tipoCamionEditInput);
        }
      } else if (
        tipoCamionEditInput !== vehiculoEditando.tipo_camion &&
        placaActual === vehiculoEditando.placa
      ) {
        setTipoCamion(tipoCamionEditInput);
      }

      setVehiculoEditando(null);
      setPlacaEditInput("");
      setTipoCamionEditInput(null);
      recargar();
    } catch {
      Alert.alert("Error", "No se pudo actualizar el vehículo");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarVehiculo = (v: Vehiculo) => {
    Alert.alert("Quitar vehículo", `¿Quitar ${v.placa} de tu lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Quitar",
        style: "destructive",
        onPress: async () => {
          const result = await removerConductorDeVehiculo(v.id);
          if (!result.success) {
            Alert.alert(
              "Error",
              result.error || "No se pudo quitar el vehículo",
            );
            return;
          }
          if (placaActual === v.placa) setPlaca("");
          recargar();
        },
      },
    ]);
  };

  const handleAgregarVehiculo = async () => {
    if (!user?.id || !placaInput.trim() || !tipoCamionInput) return;
    const placaResult = validarPlaca(placaInput);
    if (!placaResult.valido) {
      Alert.alert("Placa inválida", placaResult.error);
      return;
    }
    setGuardando(true);
    const placa = placaInput.trim().toUpperCase().replace(/[-\s]/g, "");
    const result = await registrarVehiculoPropietario(
      user.id,
      placa,
      tipoCamionInput,
    );
    if (!result.success) {
      setGuardando(false);
      Alert.alert("Error", result.error || "No se pudo registrar el vehículo");
      return;
    }
    setGuardando(false);
    recargar();
    setPlacaInput("");
    setTipoCamionInput(null);
  };

  const sheet = {
    backgroundColor: isDark ? c.surface : "#FFFFFF",
  };

  const chipCard = {
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : c.cardBg,
    ...(isDark
      ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }
      : Platform.OS === "android"
        ? { borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" }
        : getShadow(false, "sm")),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={cerrarModal}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={cerrarModal}>
          <View style={[s.overlay, { backgroundColor: c.overlay }]}>
            <TouchableWithoutFeedback>
              <View style={[s.sheetBase, sheet]}>
                <View style={[s.handle, { backgroundColor: c.border }]} />

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}>
                  {/* ── Título ── */}
                  <Text
                    style={[s.sheetTitle, { color: c.text, marginBottom: 20 }]}>
                    Mis Vehículos
                  </Text>

                  {/* ── Lista de vehículos ── */}
                  {cargando && vehiculosStore.length === 0 ? (
                    <View style={s.loadingBox}>
                      <ActivityIndicator size="large" color={c.accent} />
                    </View>
                  ) : vehiculos.length > 0 ? (
                    <>
                      {vehiculos.map((v) => {
                        const tipo = getTipoCamionData(v.tipo_camion);
                        const isActive = placaActual === v.placa;
                        const vIconName: IconName = tipo
                          ? ICON_MAP[tipo.id]
                          : "conductor";
                        return (
                          <Swipeable
                            key={v.id}
                            overshootRight={false}
                            renderRightActions={() => (
                              <View style={s.swipeActions}>
                                <TouchableOpacity
                                  style={[
                                    s.swipeActionBtn,
                                    { backgroundColor: "#3B82F6" },
                                  ]}
                                  onPress={() => abrirEdicion(v)}>
                                  <Ionicons
                                    name="pencil-outline"
                                    size={20}
                                    color="#fff"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    s.swipeActionBtn,
                                    { backgroundColor: "#EF4444" },
                                  ]}
                                  onPress={() => handleEliminarVehiculo(v)}>
                                  <Ionicons
                                    name="trash-outline"
                                    size={20}
                                    color="#fff"
                                  />
                                </TouchableOpacity>
                              </View>
                            )}>
                            <TouchableOpacity
                              style={[
                                s.vehicleOption,
                                {
                                  backgroundColor: isDark
                                    ? "#1C1C1E"
                                    : "#F2F2F7",
                                },
                                isActive && {
                                  borderWidth: 2,
                                  borderColor: c.accent,
                                },
                              ]}
                              onPress={() => handleSeleccionarVehiculo(v)}
                              activeOpacity={0.7}>
                              <View style={s.vehicleOptionIcon}>
                                <ItemIcon
                                  name={vIconName}
                                  size={Platform.OS === "ios" ? 48 : 48}
                                />
                              </View>
                              <View
                                style={{
                                  flex: 1,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}>
                                <Text
                                  style={[
                                    s.vehicleOptionType,
                                    { color: c.textSecondary },
                                  ]}>
                                  {tipo?.label || "Vehículo"}
                                </Text>
                                <View style={s.placaBadge}>
                                  <Text style={s.placaText}>{v.placa}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          </Swipeable>
                        );
                      })}
                    </>
                  ) : null}

                  {/* ── Formulario edición ── */}
                  {vehiculoEditando && (
                    <View style={[s.addSection, { borderTopColor: c.divider }]}>
                      <View style={s.editSectionHeader}>
                        <Text
                          style={[
                            s.selectorLabel,
                            { color: c.text, marginBottom: 0 },
                          ]}>
                          Editar — {vehiculoEditando.placa}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setVehiculoEditando(null)}>
                          <Ionicons
                            name="close"
                            size={20}
                            color={c.textMuted}
                          />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={[
                          s.placaInputField,
                          {
                            backgroundColor: c.surface,
                            color: c.text,
                            borderColor: c.accent,
                            marginTop: 12,
                          },
                        ]}
                        placeholder="Placa"
                        placeholderTextColor={c.textMuted}
                        value={placaEditInput}
                        onChangeText={(t) => setPlacaEditInput(t.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={7}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={s.tipoScroll}>
                        {TIPOS_CAMION.map((tipo) => {
                          const selected = tipoCamionEditInput === tipo.id;
                          return (
                            <TouchableOpacity
                              key={tipo.id}
                              style={[
                                s.tipoChip,
                                chipCard,
                                selected && {
                                  borderWidth: 1.5,
                                  borderColor: c.accent,
                                  shadowOpacity: 0,
                                  elevation: 0,
                                },
                              ]}
                              onPress={() => setTipoCamionEditInput(tipo.id)}>
                              <ItemIcon
                                name={tipo.iconName}
                                size={Platform.OS === "ios" ? 52 : 52}
                              />
                              <Text
                                style={[
                                  s.tipoChipLabel,
                                  {
                                    color: selected
                                      ? tipo.color
                                      : c.textSecondary,
                                  },
                                ]}>
                                {tipo.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <TouchableOpacity
                        style={[
                          s.confirmBtn,
                          { backgroundColor: "#3B82F6" },
                          (!placaEditInput.trim() || !tipoCamionEditInput) && {
                            opacity: 0.4,
                          },
                        ]}
                        onPress={handleGuardarEdicion}
                        disabled={
                          !placaEditInput.trim() ||
                          !tipoCamionEditInput ||
                          guardando
                        }>
                        {guardando ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[s.confirmBtnText, { color: "#fff" }]}>
                            Guardar cambios
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ── Separador + sección agregar ── */}
                  <View style={[s.addSection, { borderTopColor: c.divider }]}>
                    <Text
                      style={[
                        s.selectorLabel,
                        { color: c.textSecondary, marginBottom: 12 },
                      ]}>
                      Agregar vehículo
                    </Text>

                    <TextInput
                      style={[
                        s.placaInputField,
                        {
                          backgroundColor: c.surface,
                          color: c.text,
                          borderColor: c.border,
                        },
                      ]}
                      placeholder="Placa — Ej: EKA854"
                      placeholderTextColor={c.textMuted}
                      value={placaInput}
                      onChangeText={(t) => setPlacaInput(t.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={7}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      style={s.tipoScroll}>
                      {TIPOS_CAMION.map((tipo) => {
                        const selected = tipoCamionInput === tipo.id;
                        return (
                          <TouchableOpacity
                            key={tipo.id}
                            style={[
                              s.tipoChip,
                              chipCard,
                              selected && {
                                borderWidth: 1.5,
                                borderColor: c.accent,
                                shadowOpacity: 0,
                                elevation: 0,
                              },
                            ]}
                            onPress={() => setTipoCamionInput(tipo.id)}>
                            <ItemIcon
                              name={tipo.iconName}
                              size={Platform.OS === "ios" ? 52 : 52}
                            />
                            <Text
                              style={[
                                s.tipoChipLabel,
                                { color: c.textSecondary },
                              ]}>
                              {tipo.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity
                      style={[
                        s.confirmBtn,
                        { backgroundColor: c.accent },
                        (!placaInput.trim() || !tipoCamionInput) && {
                          opacity: 0.4,
                        },
                      ]}
                      onPress={handleAgregarVehiculo}
                      disabled={
                        !placaInput.trim() || !tipoCamionInput || guardando
                      }>
                      {guardando ? (
                        <ActivityIndicator size="small" color={c.accentText} />
                      ) : (
                        <Text
                          style={[s.confirmBtnText, { color: c.accentText }]}>
                          Registrar vehículo
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={s.cancelTouchable}
                    onPress={cerrarModal}>
                    <Text style={[s.cancelText, { color: c.textSecondary }]}>
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheetBase: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: "84%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 22,
  },
  sheetTitle: {
    ...TYPOGRAPHY.subtitle,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  loadingBox: { padding: 40, alignItems: "center" },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    position: "relative" as const,
  },
  vehicleOptionIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleOptionType: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  placaBadge: {
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  placaText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#000",
    letterSpacing: 1,
  },
  swipeActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingLeft: 6,
    marginBottom: 8,
  },
  swipeActionBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  editSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addSection: {
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 20,
  },
  placaInputField: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 20,
  },
  selectorLabel: { ...TYPOGRAPHY.captionBold, marginBottom: 10 },
  tipoScroll: { marginBottom: 24 },
  tipoChip: {
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    minWidth: 72,
  },
  tipoChipLabel: {
    ...TYPOGRAPHY.small,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 8,
  },
  confirmBtnText: { ...TYPOGRAPHY.bodyBold },
  cancelTouchable: { alignItems: "center", padding: 12 },
  cancelText: { ...TYPOGRAPHY.body },
});
