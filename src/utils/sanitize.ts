/** Strip HTML/injection chars from free-text inputs before storing in DB. */
export const sanitizeText = (value: string, maxLen = 100): string =>
  value.replace(/[<>{}[\]\\`'"%;]/g, "").slice(0, maxLen);

/** Limit password length (bcrypt max is 72 bytes). */
export const sanitizePassword = (value: string): string =>
  value.slice(0, 72);

/** Normalize email input: lowercase + strip injection chars + 254 char limit. */
export const sanitizeEmail = (value: string): string =>
  value.replace(/[<>{}[\]\\`'"%;]/g, "").toLowerCase().slice(0, 254);

/** Allow only digits, spaces, +, - for phone numbers. */
export const sanitizePhone = (value: string): string =>
  value.replace(/[^0-9+\-\s]/g, "").slice(0, 20);
