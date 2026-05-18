// Para producción mover a variables de entorno seguras.

// Gemini (AI Studio) — clasificación de texto
export const GEMINI_API_KEY = "AIzaSyCScqpJ7kEnx8Tr9uMKWnYh73Cstk-BEJM";
export const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Cloud Vision API (Google Cloud Console) — OCR
export const VISION_API_KEY = "AIzaSyCBUjAPcSEOoK5k6kTVdvpBdUc_8IFxv1Y";
export const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
