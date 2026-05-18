import { VISION_API_KEY, VISION_ENDPOINT } from "../config/aiConfig";
import logger from "../utils/logger";

export async function extraerTextoOCR(
  imageBase64: string,
): Promise<{ texto?: string; error?: string }> {
  if (!VISION_API_KEY || VISION_API_KEY === "TU_API_KEY_AQUI") {
    return { error: "API key no configurada. Edita src/config/aiConfig.ts" };
  }

  try {
    const body = JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        },
      ],
    });

    const response = await fetch(`${VISION_ENDPOINT}?key=${VISION_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      const txt = await response.text();
      logger.error("Vision API error:", response.status, txt);
      return { error: `Error de Vision API (${response.status})` };
    }

    const json = await response.json();
    const texto =
      json?.responses?.[0]?.fullTextAnnotation?.text ??
      json?.responses?.[0]?.textAnnotations?.[0]?.description;

    if (!texto) {
      return { error: "No se detectó texto en la imagen" };
    }

    return { texto };
  } catch (err: any) {
    logger.error("Error llamando Vision API:", err);
    return { error: err?.message ?? "Error desconocido en OCR" };
  }
}
