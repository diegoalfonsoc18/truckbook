import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeBaseAdapted from "../Home/Home";
import { items as baseItems, Item } from "../Home/Items";
import { useMultas } from "../../hooks/useMultas";
import { useSOAT } from "../../hooks/UseSoat";
import { useRTM } from "../../hooks/usesRtm";
import { useLicencia } from "../../hooks/useLicencia";
import { useVehiculoStore } from "../../store/VehiculoStore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../constants/Themecontext";
import { registrarPushToken } from "../../services/NotificationService";
import { ConductorStackParamList } from "../../navigation/ConductorNavigation";

type ConductorNavProp = NativeStackNavigationProp<
  ConductorStackParamList,
  "ConductorHome"
>;

// ─── Colores de estado ────────────────────────────────────────────────────────
const COLOR_OK      = "#22C55E"; // verde  — vigente y >30 días
const COLOR_WARNING = "#FBBF24"; // ámbar  — próximo a vencer (≤30 días)
const COLOR_DANGER  = "#EF4444"; // rojo   — vencido o con multas
const COLOR_UNKNOWN = "#6B7280"; // gris   — sin datos aún

function statusColor(vigente: boolean, dias: number, sinDatos: boolean): string {
  if (sinDatos) return COLOR_UNKNOWN;
  if (!vigente) return COLOR_DANGER;
  if (dias <= 30) return COLOR_WARNING;
  return COLOR_OK;
}

export default function ConductorHome() {
  const navigation = useNavigation<ConductorNavProp>();
  const { colors: c } = useTheme();
  const { placa: placaActual, validarPlacaParaUsuario } = useVehiculoStore();
  const { user } = useAuth();
  const [refrescando, setRefrescando] = useState(false);

  // ─── Hooks de estado ──────────────────────────────────────────────────────
  const { tieneMultasPendientes, cantidadPendientes, cargando: cargandoMultas, recargar } =
    useMultas(placaActual, !!placaActual);

  const { esSOATVigente, diasParaVencerSOAT, cargando: cargandoSOAT } =
    useSOAT(placaActual, !!placaActual);

  const { esRTMVigente, diasParaVencerRTM, cargando: cargandoRTM } =
    useRTM(placaActual, !!placaActual);

  // Documento del conductor — pendiente de conectar con perfil de usuario
  const documentoConductor = (user as any)?.user_metadata?.documento ?? null;
  const { esLicenciaVigente, diasParaVencerLicencia, cargando: cargandoLicencia } =
    useLicencia(documentoConductor, !!documentoConductor);

  // Registrar push token y validar acceso al vehículo
  useEffect(() => {
    if (!user?.id) return;
    registrarPushToken(user.id);
    validarPlacaParaUsuario(user.id);
  }, [user?.id]);

  // ─── Helpers de score y sublabel ─────────────────────────────────────────
  const scoreFromDias = (vigente: boolean, dias: number, sinDatos: boolean): number => {
    if (sinDatos) return 0;
    if (!vigente) return 0;
    return Math.min(100, Math.round((dias / 365) * 100));
  };
  const sublabelFromDias = (vigente: boolean, dias: number, sinDatos: boolean): string => {
    if (sinDatos) return "Consultando...";
    if (!vigente) return "Vencido";
    if (dias === 0) return "Vence hoy";
    return `${dias} día${dias === 1 ? "" : "s"}`;
  };

  // ─── Items con colores dinámicos de estado ────────────────────────────────
  const conductorItems: Item[] = baseItems.map((item) => {
    switch (item.id) {
      case "tecnicomecanica": {
        const sinDatos = cargandoRTM || !placaActual;
        return {
          ...item,
          color:    statusColor(esRTMVigente, diasParaVencerRTM, sinDatos),
          score:    scoreFromDias(esRTMVigente, diasParaVencerRTM, sinDatos),
          sublabel: sublabelFromDias(esRTMVigente, diasParaVencerRTM, sinDatos),
        };
      }
      case "soat": {
        const sinDatos = cargandoSOAT || !placaActual;
        return {
          ...item,
          color:    statusColor(esSOATVigente, diasParaVencerSOAT, sinDatos),
          score:    scoreFromDias(esSOATVigente, diasParaVencerSOAT, sinDatos),
          sublabel: sublabelFromDias(esSOATVigente, diasParaVencerSOAT, sinDatos),
        };
      }
      case "multas": {
        const sinDatos = !placaActual || cargandoMultas;
        const score    = sinDatos ? 0 : tieneMultasPendientes ? Math.max(5, 100 - cantidadPendientes * 25) : 100;
        return {
          ...item,
          color:    sinDatos ? COLOR_UNKNOWN : tieneMultasPendientes ? COLOR_DANGER : COLOR_OK,
          score,
          sublabel: sinDatos ? "Consultando..." : cantidadPendientes === 0 ? "Sin multas" : `${cantidadPendientes} multa${cantidadPendientes === 1 ? "" : "s"}`,
        };
      }
      case "licencia": {
        const sinDatos = cargandoLicencia || !documentoConductor;
        return {
          ...item,
          color:    statusColor(esLicenciaVigente, diasParaVencerLicencia, sinDatos),
          score:    scoreFromDias(esLicenciaVigente, diasParaVencerLicencia, sinDatos),
          sublabel: sublabelFromDias(esLicenciaVigente, diasParaVencerLicencia, sinDatos),
        };
      }
      default:
        return item;
    }
  });

  const handleItemPress = (item: Item) => {
    if (!placaActual) {
      Alert.alert("Error", "Por favor selecciona una placa primero");
      return;
    }

    switch (item.id) {
      case "multas":
        navigation.navigate("Multas" as any, { placa: placaActual });
        break;
      case "soat":
        navigation.navigate("SOAT" as any, { placa: placaActual });
        break;
      case "tecnicomecanica":
        navigation.navigate("RTM" as any, { placa: placaActual });
        break;
      case "licencia":
        navigation.navigate("Licencia" as any, { documento: documentoConductor ?? "1234567890" });
        break;
      case "mantenimiento":
        Alert.alert("Mantenimiento", "Funcionalidad en desarrollo");
        break;
      default:
        break;
    }
  };

  const renderBadgeConductor = (item: Item) => {
    if (item.id !== "multas" || !item.mostrarBadge) return null;

    const badge: any = {
      position: "absolute", top: 8, right: 8,
      paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 10, zIndex: 10,
    };

    if (cargandoMultas || refrescando) {
      return (
        <View style={[badge, { backgroundColor: c.surface }]}>
          <Text style={{ color: c.textSecondary, fontSize: 10, fontWeight: "700" }}>…</Text>
        </View>
      );
    }

    if (tieneMultasPendientes) {
      return (
        <View style={[badge, { backgroundColor: c.danger }]}>
          <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>
            {cantidadPendientes} Pendiente{cantidadPendientes > 1 ? "s" : ""}
          </Text>
        </View>
      );
    }

    return (
      <View style={[badge, { backgroundColor: c.success }]}>
        <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>Al día</Text>
      </View>
    );
  };

  return (
    <HomeBaseAdapted
      items={conductorItems}
      showCamionHeader={true}
      renderBadge={renderBadgeConductor}
      onItemPress={handleItemPress}
    />
  );
}
