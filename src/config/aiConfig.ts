// Todas las llamadas a Gemini y Vision van por Edge Functions (proxies).
// Las API keys NUNCA se exponen en el bundle del cliente.
export const GEMINI_MODEL = "gemini-2.0-flash";

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
