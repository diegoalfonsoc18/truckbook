import { callVision } from "../config/aiConfig";
import logger from "../utils/logger";

export async function extraerTextoOCR(
  imageBase64: string,
): Promise<{ texto?: string; error?: string }> {
  try {
    const result = await callVision(imageBase64);
    if (result.error) {
      logger.error("Vision API error:", result.error);
    }
    return result;
  } catch (err: any) {
    logger.error("Error llamando Vision proxy:", err);
    return { error: err?.message ?? "Error desconocido en OCR" };
  }
}
