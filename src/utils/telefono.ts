// src/utils/telefono.ts
// Helpers puros para el teléfono de contacto que se guarda incrustado en la
// descripción de un ingreso como sufijo [TEL:...]. Compartidos por pantallas
// (Home, CentroPendientes) y servicios (pendientesService).

/** Extrae el teléfono incrustado en la descripción ([TEL:...]) y la deja limpia. */
export function extraerTelDesc(desc: string): { desc: string; tel: string | null } {
  const match = desc.match(/\[TEL:([^\]]+)\]$/);
  if (!match) return { desc, tel: null };
  return { desc: desc.replace(/\[TEL:[^\]]+\]$/, ""), tel: match[1] };
}

/** Limpia y formatea un número colombiano para wa.me / tel:
 *  Retorna string vacío si el formato no es válido. */
export function formatearTel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Celular colombiano: 10 dígitos empezando por 3
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  // Ya con código de país 57
  if (digits.length === 12 && digits.startsWith("57")) return digits;
  // Fijo colombiano: 7 dígitos (sin indicativo)
  if (digits.length === 7) return "57" + digits;
  // Fijo con indicativo: 10 dígitos empezando por 60
  if (digits.length === 10 && digits.startsWith("60")) return "57" + digits;
  // Formato no reconocido — no generar URL
  return "";
}
