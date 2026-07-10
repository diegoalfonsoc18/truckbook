// src/Screens/Home/widgets/WidgetConsejIA.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { callGemini } from "../../../config/aiConfig";
import { useGastosStore } from "../../../store/GastosStore";
import { useVehiculoStore } from "../../../store/VehiculoStore";
import { fechaLocalHoy, inicioSemana, WProps } from "../homeUtils";
import { readAICache, writeAICache } from "../../../utils/aiCache";

const CACHE_KEY = "@truckbook_consejo_ia_v3";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas con los mismos datos
const MIN_INTERVAL = 60 * 60 * 1000; // máx. 1 llamada IA por hora aunque cambien

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCOP(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ─── WidgetConsejIA ────────────────────────────────────────────────────────────
export default function WidgetConsejIA({ isDark }: WProps) {
  const placa = useVehiculoStore((s) => s.placa);
  const gastosAll = useGastosStore((s) => s.gastos);
  const [consejo, setConsejo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  // ── Calcular stats de la semana (lunes a hoy, hora local — igual que el Home) ──
  const stats = useMemo(() => {
    // El store puede tener filas de varias placas en caché — solo contar la activa
    const gastos = placa ? gastosAll.filter((g) => g.placa === placa) : [];
    const hace7  = inicioSemana();
    const hace14 = inicioSemana(1);
    const mesStr = fechaLocalHoy().slice(0, 7) + "-01";

    const fecha = (g: typeof gastos[0]) => (g.fecha ?? g.created_at ?? "").slice(0, 10);

    const sum = (tipos: string[], desde: string, hasta?: string) =>
      gastos
        .filter((g) => {
          const f = fecha(g);
          return tipos.includes(g.tipo_gasto) && f >= desde && (!hasta || f < hasta);
        })
        .reduce((a, g) => a + (g.monto ?? 0), 0);

    const mantTipos = ["Reparación", "Llantas", "Aceite", "Taller", "Lavado"];

    const combSem    = sum(["Combustible"], hace7);
    const combAnt    = sum(["Combustible"], hace14, hace7);
    const combTrend  = combAnt > 0 ? Math.round(((combSem - combAnt) / combAnt) * 100) : 0;
    const peajesSem  = sum(["Peajes"], hace7);
    const peajesCount = gastos.filter((g) => g.tipo_gasto === "Peajes" && fecha(g) >= hace7).length;
    const mantMes    = sum(mantTipos, mesStr);

    return { combSem, combTrend, peajesSem, peajesCount, mantMes };
  }, [gastosAll, placa]);

  const fingerprint = `${placa}|${stats.combSem}|${stats.combTrend}|${stats.peajesSem}|${stats.mantMes}`;

  const buildPrompt = () => {
    const lineas = [
      `- Combustible esta semana: ${fmtCOP(stats.combSem)}${stats.combTrend !== 0 ? ` (${stats.combTrend > 0 ? "↑" : "↓"}${Math.abs(stats.combTrend)}% vs sem. ant.)` : ""}`,
      `- Peajes esta semana: ${fmtCOP(stats.peajesSem)} (${stats.peajesCount} pago${stats.peajesCount !== 1 ? "s" : ""})`,
      `- Mantenimiento este mes: ${fmtCOP(stats.mantMes)}`,
    ].join("\n");

    return (
      "Eres un asistente financiero para camioneros colombianos. " +
      "Analiza estos gastos de la semana y da UN consejo práctico y concreto en máximo 2 oraciones cortas. " +
      "Usa español colombiano informal. No saludes, ve directo al consejo:\n\n" +
      lineas
    );
  };

  const fetchConsejo = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = await readAICache<string>(CACHE_KEY);
        if (cached) {
          const age = Date.now() - cached.ts;
          // Vigente: mismos datos y dentro del TTL
          if (age < CACHE_TTL && cached.fp === fingerprint) {
            setConsejo(cached.value);
            return;
          }
          // Throttle: los datos cambiaron pero la última llamada fue hace <1h —
          // mostrar el consejo anterior en vez de llamar a Gemini por cada gasto
          if (age < MIN_INTERVAL) {
            setConsejo(cached.value);
            return;
          }
        }
      }

      setCargando(true);
      setError(false);
      try {
        const { text } = await callGemini(buildPrompt(), {
          maxOutputTokens: 150,
          temperature: 0.7,
        });
        if (text) {
          setConsejo(text.trim());
          await writeAICache(CACHE_KEY, text.trim(), fingerprint);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setCargando(false);
      }
    },
    [fingerprint],
  );

  useEffect(() => {
    const hayDatos = stats.combSem > 0 || stats.peajesSem > 0 || stats.mantMes > 0;
    if (!hayDatos) return;
    // Diferir hasta después de las animaciones de entrada del Home
    const task = InteractionManager.runAfterInteractions(() => fetchConsejo());
    return () => task.cancel();
  }, [fetchConsejo]);

  // ── Estilos ────────────────────────────────────────────────────────────────
  const cardBg = isDark ? "rgba(46,204,113,0.07)" : "#F0FDF4";
  const border = isDark ? "rgba(46,204,113,0.20)" : "rgba(34,197,94,0.22)";
  const ink    = isDark ? "#E2E8F0" : "#111827";
  const muted  = isDark ? "#64748B" : "#6B7280";
  const GREEN  = "#16A34A";

  // El widget siempre se muestra; si la Edge Function no está disponible, mostrará el error inline

  return (
    <View
      style={{
        width: "100%",
        borderRadius: 28,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: cardBg,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
      }}>
      {/* ── Header ── */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Ionicons name="sparkles" size={15} color={GREEN} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: ink, letterSpacing: 0.1 }}>
            Análisis IA
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => fetchConsejo(true)}
          disabled={cargando}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={16} color={cargando ? muted : GREEN} />
        </TouchableOpacity>
      </View>

      {/* ── Contenido ── */}
      {cargando ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
          <ActivityIndicator size="small" color={GREEN} />
          <Text style={{ color: muted, fontSize: 12 }}>Analizando tus gastos…</Text>
        </View>
      ) : error ? (
        <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>
          No se pudo generar el análisis. Toca ↺ para reintentar.
        </Text>
      ) : consejo ? (
        <Text style={{ color: ink, fontSize: 13, lineHeight: 20, fontWeight: "500" }}>
          {consejo}
        </Text>
      ) : (
        <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>
          Registra gastos de combustible, peajes o mantenimiento para ver tu análisis semanal.
        </Text>
      )}
    </View>
  );
}
