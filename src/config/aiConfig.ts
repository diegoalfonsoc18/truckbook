import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// Gemini — las llamadas van por Edge Function (gemini-proxy) para no exponer la key en el cliente.
// GEMINI_API_KEY se mantiene solo para el escáner de facturas (visionService / geminiService)
// que aún llama directo. El resto usa callGemini().
export const GEMINI_API_KEY: string = extra.geminiApiKey ?? "";
export const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Cloud Vision API (Google Cloud Console) — OCR
export const VISION_API_KEY: string = extra.visionApiKey ?? "";
export const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

// ─── Proxy seguro: llama a Gemini a través de la Edge Function ───────────────
import supabase from "./SupaBaseConfig";

export async function callGemini(
  prompt: string,
  generationConfig?: { temperature?: number; maxOutputTokens?: number }
): Promise<{ text?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
      body: { prompt, generationConfig },
    });
    if (error) return { error: error.message };
    return { text: data?.text ?? "" };
  } catch (err: any) {
    return { error: err?.message ?? "Error desconocido" };
  }
}
