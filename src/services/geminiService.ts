import { GEMINI_API_KEY, GEMINI_ENDPOINT } from "../config/aiConfig";
import logger from "../utils/logger";

export type TipoTransaccion = "gasto" | "ingreso";

export interface DatosFactura {
  monto: number | null;
  fecha: string | null;
  proveedor: string | null;
  categoria: string | null;
  descripcion: string | null;
  raw?: string;
}

const CATEGORIAS_GASTO = [
  "Combustible",
  "Peajes",
  "Comida",
  "Hospedaje",
  "Mantenimiento",
  "Parqueadero",
  "Otros",
];

const CATEGORIAS_INGRESO = ["Flete", "Otros"];

function buildPrompt(tipo: TipoTransaccion): string {
  const cats = tipo === "gasto" ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
  return `Eres un asistente que extrae información de facturas y recibos colombianos. Analiza esta imagen y extrae los datos en formato JSON estricto.

Devuelve SOLO un objeto JSON con esta estructura exacta (sin markdown, sin texto antes o después):
{
  "monto": <número entero sin puntos ni comas, en pesos colombianos>,
  "fecha": "<YYYY-MM-DD>",
  "proveedor": "<nombre del establecimiento o empresa>",
  "categoria": "<una de: ${cats.join(", ")}>",
  "descripcion": "<resumen breve, máximo 60 caracteres>"
}

Reglas:
- Si no puedes determinar un valor, usa null.
- El monto debe ser el TOTAL final pagado, sin puntos ni comas (ej: 45000 no 45.000).
- La fecha en formato ISO (YYYY-MM-DD). Si no aparece año, asume el actual.
- Selecciona la categoría más apropiada según el contexto del comprobante.
- Para combustible/gasolina/ACPM usa "Combustible".
- Para peajes/casetas usa "Peajes".
- Para restaurantes/comida usa "Comida".
- Para hoteles/hospedaje usa "Hospedaje".
- Para reparaciones/llantas/aceite/lavado/talleres usa "Mantenimiento".
- Para parqueaderos usa "Parqueadero".
- Si no encaja en ninguna, usa "Otros".`;
}

function extractJson(text: string): DatosFactura | null {
  // Gemini a veces envuelve en ```json ... ``` o devuelve texto extra
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    return {
      monto: typeof parsed.monto === "number" ? parsed.monto : null,
      fecha: typeof parsed.fecha === "string" ? parsed.fecha : null,
      proveedor: typeof parsed.proveedor === "string" ? parsed.proveedor : null,
      categoria: typeof parsed.categoria === "string" ? parsed.categoria : null,
      descripcion: typeof parsed.descripcion === "string" ? parsed.descripcion : null,
      raw: text,
    };
  } catch (err) {
    logger.error("Error parsing Gemini JSON:", err);
    return null;
  }
}

export async function analizarFactura(
  imageBase64: string,
  mimeType: string,
  tipo: TipoTransaccion,
): Promise<{ data?: DatosFactura; error?: string }> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "TU_API_KEY_AQUI") {
    return {
      error:
        "API key de Gemini no configurada. Edita src/config/aiConfig.ts",
    };
  }

  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: buildPrompt(tipo) },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          },
        }),
      },
    );

    if (!response.ok) {
      const txt = await response.text();
      logger.error("Gemini API error:", response.status, txt);
      return { error: `Error de Gemini (${response.status})` };
    }

    const json = await response.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { error: "Gemini no devolvió texto" };
    }

    const data = extractJson(text);
    if (!data) {
      return { error: "No se pudo interpretar la respuesta de Gemini" };
    }

    return { data };
  } catch (err: any) {
    logger.error("Error llamando Gemini:", err);
    return { error: err?.message ?? "Error desconocido" };
  }
}
