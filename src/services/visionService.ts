import { callVision } from "../config/aiConfig";
import logger from "../utils/logger";

export async function extraerTextoOCR(
  imageBase64: string,
): Promise<{ texto?: string; error?: string }> {
  try {
    // Timeout: sin él, un proxy colgado deja el escaneo en "procesando" indefinidamente
    const result = await Promise.race([
      callVision(imageBase64),
      new Promise<{ error: string }>((resolve) =>
        setTimeout(() => resolve({ error: "Tiempo de espera agotado en OCR" }), 30_000),
      ),
    ]);
    if (result.error) {
      logger.error("Vision API error:", result.error);
    }
    return result;
  } catch (err: any) {
    logger.error("Error llamando Vision proxy:", err);
    return { error: err?.message ?? "Error desconocido en OCR" };
  }
}
