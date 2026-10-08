import { callGemini } from "../config/aiConfig";
import logger from "../utils/logger";

export type TipoTransaccion = "gasto" | "ingreso";

export interface DatosFactura {
  monto: number | null;
  fecha: string | null;
  proveedor: string | null;
  categoria: string | null;
  descripcion: string | null;
  // Campos opcionales detectados por la IA según contexto
  detalles?: {
    // Combustible
    galones?: number;
    tipo_combustible?: string; // ACPM, Gasolina, GNV
    precio_galon?: number;
    estacion?: string;
    // Peajes
    nombre_peaje?: string;
    // Materiales
    material?: string;
    cantidad?: number;
    unidad?: string;
    // Cliente (ingresos)
    cliente?: string;
    nit?: string;
  };
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
  const detallesGasto = `
Si la categoría detectada es "Combustible", incluye en "detalles":
  - tipo_combustible: "ACPM" | "Gasolina" | "GNV" | "Diesel"
  - galones: número de galones tanqueados (puede tener decimales, ej: 25.5)
  - precio_galon: precio por galón en pesos (ej: 10500)
  - estacion: nombre de la EDS / estación (ej: "Esso", "Terpel", "Texaco")

Si la categoría detectada es "Peajes", incluye en "detalles":
  - nombre_peaje: nombre del peaje o caseta (ej: "Peaje La Variante", "Caseta Andes")

Si la categoría detectada es "Mantenimiento" y la factura es de materiales de construcción/obra (arena, recebo, bloque, cemento, ladrillo, varilla, grava), incluye en "detalles":
  - material: tipo de material (ej: "Arena", "Recebo", "Bloque", "Cemento")
  - cantidad: cantidad numérica
  - unidad: unidad de medida ("m³", "tonelada", "saco", "unidad", "viaje")`;

  const detallesIngreso = `
Si es un flete o cuenta de cobro, incluye en "detalles":
  - cliente: nombre del cliente o empresa pagadora
  - nit: NIT o cédula del cliente si aparece (solo dígitos)`;

  return `Eres un asistente experto en facturas y recibos del sector transporte colombiano. Analiza el siguiente texto extraído de una factura/recibo por OCR y extrae los datos en JSON estricto.

Devuelve SOLO un objeto JSON (sin markdown, sin texto antes o después) con esta estructura:
{
  "monto": <entero, total pagado en pesos sin puntos ni comas>,
  "fecha": "<YYYY-MM-DD>",
  "proveedor": "<nombre del establecimiento o empresa emisora>",
  "categoria": "<una de: ${cats.join(", ")}>",
  "descripcion": "<resumen breve, máximo 60 caracteres>",
  "detalles": { ... } | null
}

Reglas generales:
- Si no puedes determinar un campo, usa null.
- El monto debe ser el TOTAL final pagado, sin puntos ni comas (ej: 45000 no 45.000).
- La fecha en formato ISO (YYYY-MM-DD). Si no aparece año, asume el actual.

Categorización:
- Combustible/ACPM/Gasolina/Diesel/EDS/estación de servicio → "Combustible"
- Peajes/casetas/concesiones viales → "Peajes"
- Restaurantes/comida/desayuno/almuerzo → "Comida"
- Hoteles/hospedaje/posada → "Hospedaje"
- Talleres/reparaciones/llantas/aceite/lavado/repuestos/materiales obra → "Mantenimiento"
- Parqueaderos → "Parqueadero"
- Fletes / cuentas de cobro / pagos de transporte → "Flete"
- Si no encaja → "Otros"
${tipo === "gasto" ? detallesGasto : detallesIngreso}

IMPORTANTE: incluye el objeto "detalles" solo si detectaste campos específicos, si no usa null.`;
}

function extractJson(text: string): DatosFactura | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    // La salida del LLM es no confiable: validar tipo/rango antes de que llegue a la DB.
    const montoOk =
      typeof parsed.monto === "number" &&
      Number.isFinite(parsed.monto) &&
      parsed.monto > 0 &&
      parsed.monto <= 999_999_999;
    const fechaOk =
      typeof parsed.fecha === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha) &&
      !isNaN(new Date(parsed.fecha + "T00:00:00").getTime());
    const txt = (v: unknown, max: number) =>
      typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, max) : null;
    return {
      monto: montoOk ? parsed.monto : null,
      fecha: fechaOk ? parsed.fecha : null,
      proveedor: txt(parsed.proveedor, 100),
      categoria: typeof parsed.categoria === "string" ? parsed.categoria : null,
      descripcion: txt(parsed.descripcion, 100),
      detalles: parsed.detalles && typeof parsed.detalles === "object" ? parsed.detalles : undefined,
      raw: text,
    };
  } catch (err) {
    logger.error("Error parsing Gemini JSON:", err);
    return null;
  }
}

/** Compone una descripción rica a partir de los detalles extraídos */
export function componerDescripcion(data: DatosFactura): string {
  const d = data.detalles;
  const cat = data.categoria;

  if (!d) {
    return data.descripcion ?? data.proveedor ?? cat ?? "";
  }

  // Combustible: "ACPM 25gal @$10,500 · Esso"
  if (cat === "Combustible") {
    const partes: string[] = [];
    if (d.tipo_combustible) partes.push(d.tipo_combustible);
    if (d.galones) partes.push(`${d.galones}gal`);
    if (d.precio_galon) partes.push(`@$${d.precio_galon.toLocaleString("es-CO")}`);
    const left = partes.join(" ");
    const right = d.estacion ?? data.proveedor;
    return right ? `${left} · ${right}` : left || data.descripcion || "Combustible";
  }

  // Peajes: "Peaje La Variante"
  if (cat === "Peajes") {
    return d.nombre_peaje ?? data.proveedor ?? data.descripcion ?? "Peaje";
  }

  // Mantenimiento con material: "Arena 3 m³ · Distribuidora X"
  if (cat === "Mantenimiento" && d.material) {
    const partes: string[] = [d.material];
    if (d.cantidad) {
      partes.push(`${d.cantidad}${d.unidad ? " " + d.unidad : ""}`);
    }
    const left = partes.join(" ");
    return data.proveedor ? `${left} · ${data.proveedor}` : left;
  }

  // Ingreso (Flete): "ClienteName · NIT"
  if (cat === "Flete" && d.cliente) {
    return d.nit ? `${d.cliente} · NIT ${d.nit}` : d.cliente;
  }

  return data.descripcion ?? data.proveedor ?? cat ?? "";
}

const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 2_000;
const TIMEOUT_MS = 30_000;

/** Evita que una llamada colgada deje la UI en "procesando" para siempre. */
function conTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function callGeminiWithRetry(
  prompt: string,
  generationConfig: { temperature: number; maxOutputTokens: number },
  retries = MAX_RETRIES,
): Promise<{ text?: string; error?: string }> {
  let result: { text?: string; error?: string };
  try {
    result = await conTimeout(callGemini(prompt, generationConfig), TIMEOUT_MS);
  } catch (e: any) {
    result = { error: e?.message ?? "Error desconocido" };
  }
  if (result.error && retries > 0) {
    const delay = INITIAL_DELAY_MS * (MAX_RETRIES - retries + 1);
    logger.warn(`Gemini error — reintentando en ${delay / 1000}s (${retries} intentos restantes)`);
    await new Promise((r) => setTimeout(r, delay));
    return callGeminiWithRetry(prompt, generationConfig, retries - 1);
  }
  return result;
}

export async function analizarFactura(
  textoOCR: string,
  tipo: TipoTransaccion,
): Promise<{ data?: DatosFactura; error?: string }> {
  try {
    const ocrSafe = textoOCR.replace(/[`${}\\]/g, "").slice(0, 2000);
    const prompt = buildPrompt(tipo) + "\n\n--- TEXTO OCR ---\n" + ocrSafe;

    const { text, error } = await callGeminiWithRetry(prompt, {
      temperature: 0.1,
      maxOutputTokens: 800,
    });

    if (error) {
      logger.error("Gemini API error:", error);
      return { error: `Error de Gemini: ${error}` };
    }

    if (!text) {
      return { error: "Gemini no devolvió texto" };
    }

    const data = extractJson(text);
    if (!data) {
      return { error: "No se pudo interpretar la respuesta de Gemini" };
    }

    // Validar categoria contra allowlist para prevenir prompt injection
    const allowlist = tipo === "gasto" ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
    if (data.categoria && !allowlist.includes(data.categoria)) {
      data.categoria = "Otros";
    }

    return { data };
  } catch (err: any) {
    logger.error("Error llamando Gemini:", err);
    return { error: err?.message ?? "Error desconocido" };
  }
}
