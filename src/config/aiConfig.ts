import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// Todas las llamadas a Gemini y Vision van por Edge Functions (proxies) para
// no exponer las API keys en el cliente. No usar estas variables directamente.
/** @deprecated Usar callGemini() en su lugar */
export const GEMINI_API_KEY: string = extra.geminiApiKey ?? "";
export const GEMINI_MODEL = "gemini-2.0-flash";
/** @deprecated Usar callGemini() en su lugar */
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** @deprecated Usar callVision() en su lugar */
export const VISION_API_KEY: string = extra.visionApiKey ?? "";
/** @deprecated Usar callVision() en su lugar */
export const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

// ─── Proxy seguro: llama a Gemini a través de la Edge Function ───────────────
import supabase from "./SupaBaseConfig";

export async function callVision(
  imageBase64: string
): Promise<{ texto?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("vision-proxy", {
      body: { imageBase64 },
    });
    if (error) return { error: error.message };
    if (!data?.texto) return { error: "No se detectó texto en la imagen" };
    return { texto: data.texto };
  } catch (err: any) {
    return { error: err?.message ?? "Error desconocido en OCR" };
  }
}

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
