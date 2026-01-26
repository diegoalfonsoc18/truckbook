// Archivo de compatibilidad - exporta colores del tema
// Para nuevos componentes, usa useTheme() en su lugar

import { LIGHT_COLORS, DARK_COLORS } from "./Themecontext";

// Exportar colores claros como default para compatibilidad
// Los componentes que usen esto NO tendrán tema dinámico
// Para tema dinámico, usar useTheme() hook
export const COLORS = {
  // Colores principales
  primary: LIGHT_COLORS.primary,
  secondary: LIGHT_COLORS.secondary,
  background: LIGHT_COLORS.primary,
  surface: LIGHT_COLORS.surface,

  // Texto
  text: LIGHT_COLORS.text,
  textSecondary: LIGHT_COLORS.textSecondary,
  textMuted: LIGHT_COLORS.textMuted,

  // Acentos
  accent: LIGHT_COLORS.accent,
  success: LIGHT_COLORS.success,
  danger: LIGHT_COLORS.danger,
  warning: LIGHT_COLORS.warning,
  info: LIGHT_COLORS.info,

  // Bordes
  border: LIGHT_COLORS.border,
  divider: LIGHT_COLORS.divider,

  // Cards
  cardBg: LIGHT_COLORS.cardBg,

  // Específicos de TruckBook
  income: LIGHT_COLORS.income,
  expense: LIGHT_COLORS.expense,

  // Placa colombiana
  plateYellow: LIGHT_COLORS.plateYellow,
  plateText: LIGHT_COLORS.plateText,
};

// También exportar las paletas completas por si se necesitan
export { LIGHT_COLORS, DARK_COLORS };
