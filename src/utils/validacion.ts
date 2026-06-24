/**
 * Validaciones de inputs antes de insertar datos en Supabase.
 * Capa de defensa en el cliente — la DB tiene restricciones propias,
 * pero validar aquí da feedback inmediato al usuario y evita round-trips.
 */

export interface ResultadoValidacion {
  valido: boolean;
  error?: string;
}

// ─── Monto ────────────────────────────────────────────────────────────────────

const MONTO_MAX = 999_999_999; // ~$1 000 M COP

export function validarMonto(valor: string): ResultadoValidacion {
  if (!valor || valor.trim() === "") {
    return { valido: false, error: "Ingresa un monto" };
  }

  // Quitar puntos de miles y permitir coma decimal (ej. "1.500.000" → 1500000, "1,5" → 1.5)
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const numero = parseFloat(normalizado);

  if (isNaN(numero)) {
    return { valido: false, error: "El monto debe ser un número válido" };
  }
  if (numero <= 0) {
    return { valido: false, error: "El monto debe ser mayor a cero" };
  }
  if (!isFinite(numero)) {
    return { valido: false, error: "El monto no es válido" };
  }
  if (numero > MONTO_MAX) {
    return {
      valido: false,
      error: `El monto no puede superar $${MONTO_MAX.toLocaleString("es-CO")}`,
    };
  }

  return { valido: true };
}

// ─── Fecha ────────────────────────────────────────────────────────────────────

const AÑOS_MAX_PASADO = 5;

export function validarFecha(fecha: string): ResultadoValidacion {
  if (!fecha || fecha.trim() === "") {
    return { valido: false, error: "Selecciona una fecha" };
  }

  // Formato esperado: YYYY-MM-DD
  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexFecha.test(fecha)) {
    return { valido: false, error: "Formato de fecha inválido" };
  }

  const fechaObj = new Date(fecha + "T00:00:00");
  if (isNaN(fechaObj.getTime())) {
    return { valido: false, error: "La fecha no es válida" };
  }

  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  if (fechaObj > hoy) {
    return { valido: false, error: "La fecha no puede ser futura" };
  }

  const limiteAnterior = new Date();
  limiteAnterior.setFullYear(limiteAnterior.getFullYear() - AÑOS_MAX_PASADO);
  if (fechaObj < limiteAnterior) {
    return {
      valido: false,
      error: `La fecha no puede ser anterior a ${AÑOS_MAX_PASADO} años`,
    };
  }

  return { valido: true };
}

// ─── Placa / matrícula (LATAM) ───────────────────────────────────────────────
// Acepta los formatos de la región: 5-10 caracteres alfanuméricos.
// Ejemplos: EKA854 (CO), ABC1234 (BR), AB123CD (AR), ABCD12 (CL), ABC1D23 (BR Mercosur)
// sanitizePlaca (sanitize.ts) debe aplicarse antes de llamar a esta función.

const REGEX_PLACA = /^[A-Z0-9]{4,10}$/;

export function validarPlaca(placa: string): ResultadoValidacion {
  if (!placa || placa.trim() === "") {
    return { valido: false, error: "Ingresa la placa del vehículo" };
  }

  const normalizada = placa.trim().toUpperCase().replace(/[-\s]/g, "");

  if (!REGEX_PLACA.test(normalizada)) {
    return {
      valido: false,
      error: "Ingresa una placa válida (ej. EKA854, ABC1234, AB123CD)",
    };
  }

  return { valido: true };
}

// ─── Descripción libre ────────────────────────────────────────────────────────

const DESC_MAX = 200;

export function validarDescripcion(texto: string): ResultadoValidacion {
  if (!texto || texto.trim() === "") {
    return { valido: false, error: "Ingresa una descripción" };
  }
  if (texto.trim().length > DESC_MAX) {
    return {
      valido: false,
      error: `La descripción no puede superar ${DESC_MAX} caracteres`,
    };
  }
  return { valido: true };
}

// ─── Helper: parsear monto seguro ────────────────────────────────────────────

/** Parsea un string de monto ya validado. Devuelve 0 si falla (nunca debería). */
export function parsearMonto(valor: string): number {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalizado);
  return isFinite(n) && n > 0 ? n : 0;
}
