// Reemplaza esta API key con la tuya generada en https://aistudio.google.com/apikey
// Para producción mover a variables de entorno seguras.
export const GEMINI_API_KEY = "AIzaSyCScqpJ7kEnx8Tr9uMKWnYh73Cstk-BEJM";

export const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Alternativas gratuitas (cambiar GEMINI_MODEL arriba):
// "gemini-2.0-flash"              — estable, gratis, buena calidad
// "gemini-2.0-flash-lite"         — más rápido, menor costo
// "gemini-3.1-flash-lite-preview" — último preview, gratis
