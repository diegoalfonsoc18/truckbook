// Todas las llamadas a Gemini van por una Edge Function (proxy).
// Las API keys NUNCA se exponen en el bundle del cliente.
export const GEMINI_MODEL = "gemini-2.0-flash";

import supabase from "./SupaBaseConfig";

const GEMINI_TIMEOUT_MS = 20_000;

export async function callGemini(
  prompt: string,
  generationConfig?: { temperature?: number; maxOutputTokens?: number }
): Promise<{ text?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const { data, error } = await supabase.functions.invoke("gemini-proxy", {
      body: { prompt, generationConfig },
      signal: controller.signal,
    });
    if (error) return { error: error.message };
    return { text: data?.text ?? "" };
  } catch (err: any) {
    if (controller.signal.aborted) return { error: "Tiempo de espera agotado" };
    return { error: err?.message ?? "Error desconocido" };
  } finally {
    clearTimeout(timer);
  }
}
