import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTheme } from "../../constants/Themecontext";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";

const H_PAD = 20;
const ACCENT = "#00D9A5";

interface Servicio {
  id: string;
  descripcion: string;
  valor: string;
}

interface Cliente {
  nombre: string;
  telefono: string;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

function generarNumero() {
  const now = new Date();
  return `CC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generarHTML(
  numero: string,
  fecha: string,
  cliente: Cliente,
  conductor: string,
  placa: string,
  servicios: Servicio[],
  nota: string,
  total: number,
) {
  const filas = servicios
    .filter((s) => s.descripcion.trim() && parseFloat(s.valor || "0") > 0)
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:14px;color:#333;">${s.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:14px;color:#333;text-align:right;font-weight:600;">${formatCOP(parseFloat(s.valor))}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #F7F7F5; padding: 24px; }
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .brand { font-size: 22px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
    .brand span { color: #00D9A5; }
    .numero { font-size: 12px; color: #999; margin-top: 4px; }
    .badge { background: #00D9A51A; color: #00D9A5; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #AFAFAF; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-box { background: #F7F7F5; border-radius: 10px; padding: 12px; }
    .info-label { font-size: 10px; color: #AFAFAF; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 14px; font-weight: 600; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #AFAFAF; padding: 8px 12px; text-align: left; border-bottom: 2px solid #F0F0F0; }
    th:last-child { text-align: right; }
    .total-row { background: #F7F7F5; }
    .total-row td { padding: 14px 12px; font-size: 16px; font-weight: 800; color: #111; }
    .total-row td:last-child { color: #00D9A5; text-align: right; }
    .nota { background: #FFFBEA; border-left: 3px solid #FFB800; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 13px; color: #555; }
    .footer { text-align: center; font-size: 11px; color: #CFCFCF; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">Truck<span>Book</span></div>
        <div class="numero">${numero}</div>
      </div>
      <div class="badge">Cuenta de Cobro</div>
    </div>

    <div class="section">
      <div class="section-title">Información</div>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-label">Conductor</div>
          <div class="info-value">${conductor}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Placa</div>
          <div class="info-value">${placa || "—"}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Cliente</div>
          <div class="info-value">${cliente.nombre || "—"}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Teléfono</div>
          <div class="info-value">${cliente.telefono || "—"}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Fecha</div>
          <div class="info-value">${fecha}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Servicios</div>
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${filas}
          <tr class="total-row">
            <td>Total</td>
            <td>${formatCOP(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${nota.trim() ? `<div class="section"><div class="section-title">Nota</div><div class="nota">${nota}</div></div>` : ""}

    <div class="footer">Generado con TruckBook · ${new Date().toLocaleDateString("es-CO")}</div>
  </div>
</body>
</html>`;
}

export default function CuentaCobro() {
  const navigation = useNavigation<any>();
  const { colors: c } = useTheme();
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  const conductor =
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Conductor";

  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const [cliente, setCliente] = useState<Cliente>({ nombre: "", telefono: "" });
  const [servicios, setServicios] = useState<Servicio[]>([
    { id: "1", descripcion: "", valor: "" },
  ]);
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);

  // Modal de contactos
  const [contactosModal, setContactosModal] = useState(false);
  const [todosContactos, setTodosContactos] = useState<Contacts.Contact[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const total = servicios.reduce(
    (acc, s) => acc + (parseFloat(s.valor) || 0),
    0,
  );

  // ── Contactos ──────────────────────────────────────────────────────────────
  const contactosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return todosContactos;
    const q = busqueda.toLowerCase();
    return todosContactos.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phoneNumbers?.some((p) => p.number?.includes(q)),
    );
  }, [busqueda, todosContactos]);

  const abrirContactos = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Activa el acceso a contactos en Ajustes.");
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const conTelefono = data.filter((c) => c.name && c.phoneNumbers?.length);
    setTodosContactos(conTelefono);
    setBusqueda("");
    setContactosModal(true);
  };

  const seleccionarContacto = (contacto: Contacts.Contact) => {
    setCliente({
      nombre: contacto.name!,
      telefono: contacto.phoneNumbers![0].number?.replace(/\s/g, "") || "",
    });
    setContactosModal(false);
  };

  // ── Servicios ──────────────────────────────────────────────────────────────
  const agregarServicio = () => {
    setServicios((prev) => [
      ...prev,
      { id: Date.now().toString(), descripcion: "", valor: "" },
    ]);
  };

  const actualizarServicio = (id: string, field: keyof Servicio, value: string) => {
    setServicios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };

  const eliminarServicio = (id: string) => {
    if (servicios.length === 1) return;
    setServicios((prev) => prev.filter((s) => s.id !== id));
  };

  // ── Compartir ──────────────────────────────────────────────────────────────
  const compartir = async () => {
    const validos = servicios.filter(
      (s) => s.descripcion.trim() && parseFloat(s.valor || "0") > 0,
    );
    if (!validos.length) {
      Alert.alert("Sin servicios", "Agrega al menos un servicio con valor.");
      return;
    }
    if (!cliente.nombre.trim()) {
      Alert.alert("Sin cliente", "Agrega el nombre del cliente.");
      return;
    }

    setCargando(true);
    try {
      const numero = generarNumero();
      const html = generarHTML(
        numero,
        hoy,
        cliente,
        conductor,
        placaActual || "",
        servicios,
        nota,
        total,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir cuenta de cobro",
        UTI: "com.adobe.pdf",
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo generar el documento.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: c.primary }]}>
      <SafeAreaView style={s.safe} edges={["top"]}>
        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: c.surface }]}
            onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: c.text }]}>Cuenta de Cobro</Text>
            <Text style={[s.headerSub, { color: c.textMuted }]}>{hoy}</Text>
          </View>
          <TouchableOpacity
            style={[s.shareBtn, { backgroundColor: ACCENT }]}
            onPress={compartir}
            disabled={cargando}
            activeOpacity={0.8}>
            {cargando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={17} color="#fff" />
                <Text style={s.shareBtnText}>Compartir</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled">

            {/* CLIENTE */}
            <Text style={[s.sectionLabel, { color: c.textMuted }]}>Cliente</Text>
            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <TouchableOpacity
                style={[s.contactBtn, { borderColor: ACCENT + "40", backgroundColor: ACCENT + "0D" }]}
                onPress={abrirContactos}
                activeOpacity={0.7}>
                <Ionicons name="person-add-outline" size={16} color={ACCENT} />
                <Text style={[s.contactBtnText, { color: ACCENT }]}>
                  Buscar en contactos
                </Text>
              </TouchableOpacity>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Nombre del cliente"
                  placeholderTextColor={c.textMuted}
                  value={cliente.nombre}
                  onChangeText={(v) => setCliente((p) => ({ ...p, nombre: v }))}
                />
              </View>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="call-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Teléfono"
                  placeholderTextColor={c.textMuted}
                  value={cliente.telefono}
                  onChangeText={(v) => setCliente((p) => ({ ...p, telefono: v }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* SERVICIOS */}
            <View style={s.sectionRow}>
              <Text style={[s.sectionLabel, { color: c.textMuted }]}>Servicios</Text>
              <TouchableOpacity onPress={agregarServicio} style={s.addBtn}>
                <Ionicons name="add" size={16} color={ACCENT} />
                <Text style={[s.addBtnText, { color: ACCENT }]}>Agregar</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {servicios.map((item, index) => (
                <View key={item.id}>
                  <View style={s.servicioRow}>
                    <TextInput
                      style={[s.servicioDesc, { color: c.text }]}
                      placeholder="Descripción (ej. Flete Bogotá–Medellín)"
                      placeholderTextColor={c.textMuted}
                      value={item.descripcion}
                      onChangeText={(v) => actualizarServicio(item.id, "descripcion", v)}
                    />
                    <View style={s.servicioValorWrap}>
                      <Text style={[s.servicioSign, { color: c.textMuted }]}>$</Text>
                      <TextInput
                        style={[s.servicioValor, { color: c.text }]}
                        placeholder="0"
                        placeholderTextColor={c.textMuted}
                        value={item.valor}
                        onChangeText={(v) => actualizarServicio(item.id, "valor", v.replace(/[^0-9]/g, ""))}
                        keyboardType="numeric"
                      />
                    </View>
                    {servicios.length > 1 && (
                      <TouchableOpacity
                        onPress={() => eliminarServicio(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={20} color={c.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {index < servicios.length - 1 && (
                    <View style={[s.divider, { backgroundColor: c.divider }]} />
                  )}
                </View>
              ))}

              {/* Total */}
              <View style={[s.totalRow, { borderTopColor: c.border }]}>
                <Text style={[s.totalLabel, { color: c.text }]}>Total</Text>
                <Text style={[s.totalValue, { color: ACCENT }]}>{formatCOP(total)}</Text>
              </View>
            </View>

            {/* NOTA */}
            <Text style={[s.sectionLabel, { color: c.textMuted }]}>Nota (opcional)</Text>
            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border, padding: 14 }]}>
              <TextInput
                style={[s.notaInput, { color: c.text }]}
                placeholder="Ej. Pago contra entrega, transferencia a cuenta..."
                placeholderTextColor={c.textMuted}
                value={nota}
                onChangeText={setNota}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* BOTÓN COMPARTIR (bottom) */}
            <TouchableOpacity
              style={[s.shareBtnBottom, { backgroundColor: ACCENT }]}
              onPress={compartir}
              disabled={cargando}
              activeOpacity={0.8}>
              {cargando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={20} color="#fff" />
                  <Text style={s.shareBtnBottomText}>Generar y compartir</Text>
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* MODAL CONTACTOS */}
      <Modal
        visible={contactosModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setContactosModal(false)}>
        <View style={[s.contactModal, { backgroundColor: c.primary }]}>
          {/* Header modal */}
          <View style={[s.contactModalHeader, { borderBottomColor: c.border }]}>
            <Text style={[s.contactModalTitle, { color: c.text }]}>Contactos</Text>
            <TouchableOpacity onPress={() => setContactosModal(false)}>
              <Ionicons name="close" size={24} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Búsqueda */}
          <View style={[s.searchBox, { backgroundColor: c.surface }]}>
            <Ionicons name="search-outline" size={16} color={c.textMuted} />
            <TextInput
              style={[s.searchInput, { color: c.text }]}
              placeholder="Buscar contacto..."
              placeholderTextColor={c.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>

          {/* Lista */}
          <FlatList
            data={contactosFiltrados}
            keyExtractor={(item) => item.id ?? item.name ?? Math.random().toString()}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
            ItemSeparatorComponent={() => (
              <View style={[s.contactSep, { backgroundColor: c.divider }]} />
            )}
            renderItem={({ item }) => {
              const inicial = item.name?.charAt(0).toUpperCase() || "?";
              const telefono = item.phoneNumbers?.[0]?.number || "";
              return (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={() => seleccionarContacto(item)}
                  activeOpacity={0.6}>
                  <View style={[s.contactAvatar, { backgroundColor: ACCENT + "22" }]}>
                    <Text style={[s.contactAvatarText, { color: ACCENT }]}>{inicial}</Text>
                  </View>
                  <View style={s.contactInfo}>
                    <Text style={[s.contactName, { color: c.text }]}>{item.name}</Text>
                    <Text style={[s.contactPhone, { color: c.textMuted }]}>{telefono}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyContacts}>
                <Text style={[s.emptyContactsText, { color: c.textMuted }]}>
                  {busqueda ? "Sin resultados" : "No hay contactos con número"}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, marginTop: 1 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  shareBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  scroll: { paddingHorizontal: H_PAD, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 14, fontWeight: "600" },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Cliente
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  contactBtnText: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },

  // Servicios
  servicioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  servicioDesc: { flex: 1, fontSize: 14 },
  servicioValorWrap: { flexDirection: "row", alignItems: "center" },
  servicioSign: { fontSize: 14, marginRight: 2 },
  servicioValor: { fontSize: 14, fontWeight: "600", width: 80, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 18, fontWeight: "800" },

  // Nota
  notaInput: { fontSize: 14, lineHeight: 22, minHeight: 70 },

  // Share bottom
  shareBtnBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
  },
  shareBtnBottomText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal contactos
  contactModal: { flex: 1 },
  contactModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  contactModalTitle: { fontSize: 18, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: H_PAD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: { fontSize: 16, fontWeight: "700" },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "500" },
  contactPhone: { fontSize: 13, marginTop: 1 },
  contactSep: { height: 1, marginLeft: 72 },
  emptyContacts: { padding: 40, alignItems: "center" },
  emptyContactsText: { fontSize: 14 },
});
