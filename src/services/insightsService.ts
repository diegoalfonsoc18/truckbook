// src/services/insightsService.ts
import { callGemini } from "../config/aiConfig";
import { ResumenPendientes, formatCOP } from "./pendientesService";

export interface InsightsPendientes {
  resumen: string;
  alerta: string;
  mensajeCobro: string | null;
}

export async function generarInsights(
  resumen: ResumenPendientes
): Promise<InsightsPendientes | null> {

  const {
    countPorCobrar,
    totalPorCobrar,
    countVencidosCobro,
    clienteMasAntiguo: rawCliente,
    diasMasAntiguo,
    montoVencidosCobro,
    countVencidosPago,
    countProximosPago,
    totalPorPagar,
  } = resumen;

  const clienteMasAntiguo = rawCliente?.replace(/[`${}\\<>]/g, "").slice(0, 50);

  // Si no hay nada pendiente, no llamar a la IA
  if (countPorCobrar === 0 && countVencidosPago === 0 && countProximosPago === 0) {
    return {
      resumen: "Todo al día. Sin pendientes urgentes.",
      alerta: "",
      mensajeCobro: null,
    };
  }

  const prompt = `Eres un asistente financiero para un transportador colombiano. Analiza y responde en JSON:

Por cobrar: ${countPorCobrar} cuentas pendientes (${formatCOP(totalPorCobrar)})
Vencidos cobro: ${countVencidosCobro}${clienteMasAntiguo ? `, el más antiguo "${clienteMasAntiguo}" lleva ${diasMasAntiguo} días sin pagar (${formatCOP(montoVencidosCobro)})` : ""}
Por pagar: ${countVencidosPago} vencidos, ${countProximosPago} próximos a vencer (${formatCOP(totalPorPagar)})

Responde SOLO JSON sin markdown:
{
  "resumen": "<resumen en 1-2 frases cortas y directas en español, máximo 90 caracteres>",
  "alerta": "<la situación más urgente en máximo 60 caracteres, vacío string si todo está bien>",
  "mensajeCobro": "<mensaje WhatsApp cordial y profesional para cobrar al cliente más antiguo, o null si no hay vencidos>"
}`;

  try {
    const { text, error } = await callGemini(prompt, { temperature: 0.4, maxOutputTokens: 350 });
    if (error || !text) return null;

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]) as InsightsPendientes;
  } catch {
    return null;
  }
}
