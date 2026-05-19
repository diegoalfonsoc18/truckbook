import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

// Gemini (AI Studio) — clasificación de texto
export const GEMINI_API_KEY: string = extra.geminiApiKey ?? "";
export const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Cloud Vision API (Google Cloud Console) — OCR
export const VISION_API_KEY: string = extra.visionApiKey ?? "";
export const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
