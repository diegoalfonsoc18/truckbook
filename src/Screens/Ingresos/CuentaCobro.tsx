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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../constants/Themecontext";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { sanitizeText, sanitizePhone } from "../../utils/sanitize";

const H_PAD = 20;

interface Servicio {
  id: string;
  descripcion: string;
  precioUnitario: string;
  cantidad: string;
}

interface Cliente {
  nombre: string;
  empresa: string;
  nit: string;
  direccion: string;
  ciudad: string;
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

function numeroALetras(num: number): string {
  const uni = ["", "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve",
    "Diez", "Once", "Doce", "Trece", "Catorce", "Quince", "Dieciséis", "Diecisiete", "Dieciocho", "Diecinueve"];
  const dec = ["", "", "Veinte", "Treinta", "Cuarenta", "Cincuenta", "Sesenta", "Setenta", "Ochenta", "Noventa"];
  const cen = ["", "Cien", "Doscientos", "Trescientos", "Cuatrocientos", "Quinientos",
    "Seiscientos", "Setecientos", "Ochocientos", "Novecientos"];
  function conv(n: number): string {
    if (n === 0) return "";
    if (n < 20) return uni[n];
    if (n < 30) return n === 20 ? "Veinte" : "Veinti" + uni[n - 20].toLowerCase();
    if (n < 100) { const r = n % 10; return r ? dec[Math.floor(n/10)] + " y " + uni[r] : dec[Math.floor(n/10)]; }
    if (n === 100) return "Cien";
    if (n < 1000) { const r = n % 100; return (n < 200 ? "Ciento" : cen[Math.floor(n/100)]) + (r ? " " + conv(r) : ""); }
    if (n < 1000000) { const m = Math.floor(n/1000); const r = n % 1000; return (m === 1 ? "Mil" : conv(m) + " Mil") + (r ? " " + conv(r) : ""); }
    const m = Math.floor(n/1000000); const r = n % 1000000;
    return (m === 1 ? "Un Millón" : conv(m) + " Millones") + (r ? " " + conv(r) : "");
  }
  const entero = Math.floor(Math.abs(num));
  return (conv(entero) || "Cero") + " de 00/100";
}

function generarHTML(
  numero: string,
  fecha: string,
  cliente: Cliente,
  conductor: string,
  nitConductor: string,
  ciudadConductor: string,
  placa: string,
  servicios: Servicio[],
  nota: string,
  banco: string,
  numeroCuenta: string,
  total: number,
) {
  const filas = servicios
    .filter((s) => s.descripcion.trim() && parseFloat(s.precioUnitario || "0") > 0)
    .map((s) => {
      const precio = parseFloat(s.precioUnitario) || 0;
      const cant = parseFloat(s.cantidad) || 1;
      const subtotal = precio * cant;
      return `
      <tr>
        <td style="padding:9px 10px;border-bottom:1px solid #EBEBEB;font-size:13px;color:#333;">${s.descripcion}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #EBEBEB;font-size:13px;color:#333;text-align:center;">${formatCOP(precio)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #EBEBEB;font-size:13px;color:#333;text-align:center;">${cant % 1 === 0 ? cant.toFixed(0) : cant.toFixed(1)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #EBEBEB;font-size:13px;color:#333;text-align:right;font-weight:600;">${formatCOP(subtotal)}</td>
      </tr>`;
    })
    .join("");

  const letras = numeroALetras(total);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f2f2f2; padding: 20px; }
    .page { background: #fff; max-width: 620px; margin: 0 auto; padding: 28px 32px; }

    /* TÍTULO */
    .doc-title { text-align: center; font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #1a1a2e; border-bottom: 3px solid #1a1a2e; padding-bottom: 8px; margin-bottom: 18px; }

    /* ENCABEZADO DOS COLUMNAS */
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .emisor-name { font-size: 14px; font-weight: 700; color: #111; }
    .emisor-detail { font-size: 12px; color: #555; margin-top: 3px; }
    .doc-meta { text-align: right; font-size: 12px; color: #333; }
    .doc-meta .label { font-weight: 600; color: #1a1a2e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-meta .num { font-size: 20px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }

    /* BANNER */
    .banner { background: #1a1a2e; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px; margin-bottom: 14px; }

    /* CLIENTE */
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ddd; margin-bottom: 16px; }
    .client-cell { padding: 7px 12px; border-bottom: 1px solid #eee; font-size: 12px; color: #333; }
    .client-cell:nth-child(odd) { border-right: 1px solid #ddd; }
    .client-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
    .client-value { font-size: 13px; font-weight: 600; color: #111; margin-top: 1px; }

    /* SUMA */
    .suma-row { display: flex; align-items: center; gap: 0; border: 1px solid #ddd; margin-bottom: 16px; }
    .suma-label { background: #888; color: #fff; font-size: 11px; font-weight: 700; padding: 8px 12px; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.5px; }
    .suma-value { background: #f5a623; color: #fff; font-size: 14px; font-weight: 800; padding: 8px 14px; white-space: nowrap; }
    .suma-letras { font-size: 12px; color: #333; padding: 8px 12px; flex: 1; font-style: italic; }

    /* TABLA */
    .concepto-label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #e8e8e8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #444; padding: 8px 10px; text-align: left; border: 1px solid #ddd; }
    th.center { text-align: center; }
    th.right { text-align: right; }
    td { font-size: 12px; color: #333; padding: 8px 10px; border: 1px solid #eee; vertical-align: middle; }
    td.center { text-align: center; }
    td.right { text-align: right; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    .total-row td { background: #e8e8e8; font-size: 13px; font-weight: 800; color: #111; border-top: 2px solid #ccc; }
    .total-row td.right { color: #1a1a2e; }

    /* PIE */
    .footer-section { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 14px; }
    .firma-line { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #333; }
    .firma-blank { flex: 1; border-bottom: 1px solid #333; min-width: 160px; }
    .bank-info { font-size: 12px; color: #333; margin-top: 10px; line-height: 1.8; }
    .bank-info span { font-weight: 600; color: #111; }
    .nota-box { background: #fffbea; border-left: 3px solid #f5a623; padding: 8px 12px; margin-top: 12px; font-size: 12px; color: #555; font-style: italic; }
    .watermark { text-align: center; font-size: 10px; color: #ccc; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="page">

    <div class="doc-title">CUENTA DE COBRO</div>

    <!-- ENCABEZADO: emisor izq / número der -->
    <div class="top">
      <div>
        <div class="emisor-name">${conductor}${placa ? ` · ${placa}` : ""}</div>
        ${nitConductor ? `<div class="emisor-detail">NIT / CC: ${nitConductor}</div>` : ""}
        <div class="emisor-detail">Régimen Simplificado</div>
        ${ciudadConductor ? `<div class="emisor-detail">${ciudadConductor}</div>` : ""}
      </div>
      <div class="doc-meta">
        <div class="label">Cuenta de Cobro</div>
        <div class="num">${numero}</div>
        <div style="margin-top:4px;">Ciudad: ${ciudadConductor || "—"}</div>
        <div>Fecha: ${fecha}</div>
      </div>
    </div>

    <div class="banner">Cuenta de Cobro</div>

    <!-- CLIENTE -->
    <div class="client-grid">
      <div class="client-cell">
        <div class="client-label">Nombre / Pagador</div>
        <div class="client-value">${cliente.nombre || "—"}</div>
      </div>
      <div class="client-cell">
        <div class="client-label">Empresa</div>
        <div class="client-value">${cliente.empresa || "—"}</div>
      </div>
      <div class="client-cell">
        <div class="client-label">NIT / Documento</div>
        <div class="client-value">${cliente.nit || "—"}</div>
      </div>
      <div class="client-cell">
        <div class="client-label">Teléfono</div>
        <div class="client-value">${cliente.telefono || "—"}</div>
      </div>
      ${cliente.direccion ? `
      <div class="client-cell">
        <div class="client-label">Dirección</div>
        <div class="client-value">${cliente.direccion}</div>
      </div>
      <div class="client-cell">
        <div class="client-label">Ciudad</div>
        <div class="client-value">${cliente.ciudad || "—"}</div>
      </div>` : ""}
    </div>

    <!-- SUMA EN LETRAS -->
    <div class="suma-row">
      <div class="suma-label">Pagar la Suma de:</div>
      <div class="suma-value">${formatCOP(total)}</div>
      <div class="suma-letras">${letras}</div>
    </div>

    <!-- TABLA DE SERVICIOS -->
    <div class="concepto-label">Por concepto de:</div>
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="center">Precio Unitario</th>
          <th class="center">Cantidad</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td class="right">${formatCOP(total)}</td>
        </tr>
      </tbody>
    </table>

    ${nota.trim() ? `<div class="nota-box">${nota}</div>` : ""}

    <!-- PIE -->
    <div class="footer-section">
      <div class="firma-line">
        Firma (x) <div class="firma-blank"></div>
      </div>
      <div style="font-size:12px;color:#555;margin-top:4px;">Cordialmente,</div>
      ${(banco || numeroCuenta) ? `
      <div class="bank-info">
        Por favor consignar a la cuenta de ahorros: <span>${numeroCuenta || "—"}</span><br/>
        Entidad Bancaria: <span>${banco || "—"}</span>
      </div>` : ""}
    </div>

    <div class="watermark">Generado con TruckBook · ${new Date().toLocaleDateString("es-CO")}</div>
  </div>
</body>
</html>`;
}

export default function CuentaCobro() {
  const navigation = useNavigation<any>();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = c.accent;
  const { placa: placaActual } = useVehiculoStore();
  const { user } = useAuth();

  const conductor =
    (user?.user_metadata as any)?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Conductor";

  const formatFecha = (d: Date) =>
    d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  const [numero] = useState(() => generarNumero());
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cliente, setCliente] = useState<Cliente>({ nombre: "", empresa: "", nit: "", direccion: "", ciudad: "", telefono: "" });
  const [servicios, setServicios] = useState<Servicio[]>([
    { id: "1", descripcion: "", precioUnitario: "", cantidad: "1" },
  ]);
  const [nota, setNota] = useState("");
  const [ciudadConductor, setCiudadConductor] = useState("");
  const [nitConductor, setNitConductor] = useState("");
  const [banco, setBanco] = useState("");
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [cargando, setCargando] = useState(false);

  // Modal de contactos
  const [contactosModal, setContactosModal] = useState(false);
  const [todosContactos, setTodosContactos] = useState<Contacts.Contact[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const total = servicios.reduce((acc, s) => {
    const precio = parseFloat(s.precioUnitario) || 0;
    const cant = parseFloat(s.cantidad) || 1;
    return acc + precio * cant;
  }, 0);

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
    setCliente((prev) => ({
      ...prev,
      nombre: contacto.name!,
      telefono: contacto.phoneNumbers![0].number?.replace(/\s/g, "") || "",
    }));
    setContactosModal(false);
  };

  // ── Servicios ──────────────────────────────────────────────────────────────
  const agregarServicio = () => {
    setServicios((prev) => [
      ...prev,
      { id: Date.now().toString(), descripcion: "", precioUnitario: "", cantidad: "1" },
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
      (s) => s.descripcion.trim() && parseFloat(s.precioUnitario || "0") > 0,
    );
    if (!validos.length) {
      Alert.alert("Sin servicios", "Agrega al menos un servicio con precio.");
      return;
    }
    if (!cliente.nombre.trim()) {
      Alert.alert("Sin cliente", "Agrega el nombre del cliente.");
      return;
    }

    setCargando(true);
    try {
      const html = generarHTML(
        numero,
        formatFecha(fecha),
        cliente,
        conductor,
        nitConductor,
        ciudadConductor,
        placaActual || "",
        servicios,
        nota,
        banco,
        numeroCuenta,
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
            style={[s.backBtn, { backgroundColor: c.cardBg, borderColor: c.border }]}
            onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: c.text }]}>Cuenta de Cobro</Text>
            <Text style={[s.headerSub, { color: c.textMuted }]}>{numero}</Text>
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
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 80 }]}
            keyboardShouldPersistTaps="handled">

            {/* FECHA */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Fecha del documento</Text>
            <TouchableOpacity
              style={[s.card, s.fechaRow, { backgroundColor: c.cardBg, borderColor: c.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={ACCENT} />
              <Text style={[s.fechaText, { color: c.text }]}>{formatFecha(fecha)}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={fecha}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_e, selected) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (selected) setFecha(selected);
                }}
                maximumDate={new Date(2100, 11, 31)}
              />
            )}

            {/* CLIENTE */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Cliente</Text>
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
                  placeholder="Nombre de quien paga"
                  placeholderTextColor={c.textMuted}
                  value={cliente.nombre}
                  onChangeText={(v) => setCliente((p) => ({ ...p, nombre: sanitizeText(v) }))}
                />
              </View>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="business-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Empresa (opcional)"
                  placeholderTextColor={c.textMuted}
                  value={cliente.empresa}
                  onChangeText={(v) => setCliente((p) => ({ ...p, empresa: sanitizeText(v) }))}
                />
              </View>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="card-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="NIT o documento"
                  placeholderTextColor={c.textMuted}
                  value={cliente.nit}
                  onChangeText={(v) => setCliente((p) => ({ ...p, nit: sanitizeText(v, 30) }))}
                  keyboardType="numbers-and-punctuation"
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
                  onChangeText={(v) => setCliente((p) => ({ ...p, telefono: sanitizePhone(v) }))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="location-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Dirección (opcional)"
                  placeholderTextColor={c.textMuted}
                  value={cliente.direccion}
                  onChangeText={(v) => setCliente((p) => ({ ...p, direccion: sanitizeText(v, 200) }))}
                />
              </View>

              <View style={[s.divider, { backgroundColor: c.divider }]} />

              <View style={s.inputRow}>
                <Ionicons name="map-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Ciudad (opcional)"
                  placeholderTextColor={c.textMuted}
                  value={cliente.ciudad}
                  onChangeText={(v) => setCliente((p) => ({ ...p, ciudad: sanitizeText(v) }))}
                />
              </View>
            </View>

            {/* MIS DATOS */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Mis datos</Text>
            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={s.inputRow}>
                <Ionicons name="card-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Mi NIT o cédula"
                  placeholderTextColor={c.textMuted}
                  value={nitConductor}
                  onChangeText={(t) => setNitConductor(sanitizeText(t, 30))}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[s.divider, { backgroundColor: c.divider }]} />
              <View style={s.inputRow}>
                <Ionicons name="map-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Mi ciudad"
                  placeholderTextColor={c.textMuted}
                  value={ciudadConductor}
                  onChangeText={(t) => setCiudadConductor(sanitizeText(t))}
                />
              </View>
            </View>

            {/* SERVICIOS */}
            <View style={s.sectionRow}>
              <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Servicios</Text>
              <TouchableOpacity onPress={agregarServicio} style={s.addBtn}>
                <Ionicons name="add" size={16} color={ACCENT} />
                <Text style={[s.addBtnText, { color: ACCENT }]}>Agregar</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {servicios.map((item, index) => (
                <View key={item.id}>
                  {/* Cabecera del servicio */}
                  <View style={s.servicioHeader}>
                    <Text style={[s.servicioNumero, { color: c.textSecondary }]}>
                      Servicio {index + 1}
                    </Text>
                    {servicios.length > 1 && (
                      <TouchableOpacity
                        onPress={() => eliminarServicio(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={c.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Descripción */}
                  <View style={s.inputRow}>
                    <Ionicons name="document-text-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                    <TextInput
                      style={[s.input, { color: c.text }]}
                      placeholder="Descripción (ej. Flete Bogotá–Medellín)"
                      placeholderTextColor={c.textMuted}
                      value={item.descripcion}
                      onChangeText={(v) => actualizarServicio(item.id, "descripcion", sanitizeText(v, 200))}
                    />
                  </View>

                  <View style={[s.divider, { backgroundColor: c.divider }]} />

                  {/* Precio unitario + Cantidad en fila */}
                  <View style={s.servicioMontoRow}>
                    <View style={[s.servicioMontoCol, { borderRightWidth: 1, borderRightColor: c.divider }]}>
                      <Text style={[s.servicioMontoLabel, { color: c.textMuted }]}>Precio unitario</Text>
                      <View style={s.servicioMontoInput}>
                        <Text style={[s.currencySign, { color: c.textMuted, fontSize: 14 }]}>$</Text>
                        <TextInput
                          style={[s.input, { color: c.text, fontWeight: "600", flex: 1 }]}
                          placeholder="0"
                          placeholderTextColor={c.textMuted}
                          value={item.precioUnitario}
                          onChangeText={(v) => actualizarServicio(item.id, "precioUnitario", v.replace(/[^0-9]/g, ""))}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={s.servicioMontoCol}>
                      <Text style={[s.servicioMontoLabel, { color: c.textMuted }]}>Cantidad</Text>
                      <View style={s.servicioMontoInput}>
                        <TextInput
                          style={[s.input, { color: c.text, flex: 1 }]}
                          placeholder="1"
                          placeholderTextColor={c.textMuted}
                          value={item.cantidad}
                          onChangeText={(v) => actualizarServicio(item.id, "cantidad", v.replace(/[^0-9.]/g, ""))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  {index < servicios.length - 1 && (
                    <View style={[s.divider, { height: 6, backgroundColor: c.secondary }]} />
                  )}
                </View>
              ))}

              {/* Total */}
              <View style={[s.totalRow, { borderTopColor: c.border }]}>
                <Text style={[s.totalLabel, { color: c.text }]}>Total</Text>
                <Text style={[s.totalValue, { color: ACCENT }]}>{formatCOP(total)}</Text>
              </View>
            </View>

            {/* DATOS DE PAGO */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Datos de consignación</Text>
            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={s.inputRow}>
                <Ionicons name="business-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Entidad bancaria (opcional)"
                  placeholderTextColor={c.textMuted}
                  value={banco}
                  onChangeText={(t) => setBanco(sanitizeText(t))}
                />
              </View>
              <View style={[s.divider, { backgroundColor: c.divider }]} />
              <View style={s.inputRow}>
                <Ionicons name="wallet-outline" size={16} color={c.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: c.text }]}
                  placeholder="Número de cuenta (opcional)"
                  placeholderTextColor={c.textMuted}
                  value={numeroCuenta}
                  onChangeText={(t) => setNumeroCuenta(sanitizeText(t, 30))}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* NOTA */}
            <Text style={[s.sectionLabel, { color: c.textSecondary }]}>Nota (opcional)</Text>
            <View style={[s.card, { backgroundColor: c.cardBg, borderColor: c.border, padding: 14 }]}>
              <TextInput
                style={[s.notaInput, { color: c.text }]}
                placeholder="Ej. Pago contra entrega, transferencia a cuenta..."
                placeholderTextColor={c.textMuted}
                value={nota}
                onChangeText={(t) => setNota(sanitizeText(t, 500))}
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
            keyExtractor={(item) => (item as any).id ?? item.name ?? Math.random().toString()}
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
    borderWidth: 1,
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

  scroll: { paddingHorizontal: H_PAD },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
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
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Fecha
  fechaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  fechaText: { flex: 1, fontSize: 15, fontWeight: "500" },

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
  servicioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  servicioNumero: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  currencySign: { fontSize: 16, fontWeight: "600" },
  servicioMontoRow: {
    flexDirection: "row",
  },
  servicioMontoCol: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  servicioMontoLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  servicioMontoInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
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
    borderRadius: 28,
    paddingVertical: 16,
    marginTop: 24,
  },
  shareBtnBottomText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal contactos
  contactModal: { flex: 1, paddingTop: 8 },
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
