// src/constants/layout.ts
// Anchos y márgenes de contenido, iguales en iOS y Android.
//
// Las dos guías coinciden en el margen de móvil: iOS HIG usa 16pt como
// `layoutMargin` por defecto y Material 3 usa 16dp en la clase compact. En
// pantallas anchas ambas piden lo mismo —no estirar el contenido de borde a
// borde— así que el margen sube y el bloque se topa a un ancho máximo.
//
// Los cortes son los de Material 3, que se solapan con las size classes de
// iOS: compact < 600 (teléfonos), medium 600–839 (tablet chica, split view),
// expanded ≥ 840 (iPad completo).
import { useWindowDimensions } from "react-native";

export const BREAKPOINT_MEDIUM = 600;
export const BREAKPOINT_EXPANDED = 840;

/** Márgenes laterales por clase de tamaño. */
export const H_PAD_COMPACT = 16;
export const H_PAD_MEDIUM = 24;
export const H_PAD_EXPANDED = 32;

/**
 * Tope del bloque de contenido. Sin esto, en un iPad una tarjeta de resumen
 * mide 1000px de ancho y queda ilegible: la vista recorre demasiado.
 */
export const CONTENT_MAX_WIDTH = 840;

export interface ContentLayout {
  /** Margen lateral que corresponde al ancho actual. */
  hPad: number;
  /** Ancho máximo del bloque; se centra si la pantalla da más. */
  maxWidth: number;
  /** true en tablet o split view ancho. */
  esAncho: boolean;
}

/**
 * Layout del contenido para el ancho actual.
 *
 * Usa `useWindowDimensions` y no `Dimensions.get()` a propósito: el segundo
 * lee una sola vez y no se entera de que el usuario rotó el teléfono o
 * cambió el tamaño del split view en iPad.
 */
export function useContentLayout(): ContentLayout {
  const { width } = useWindowDimensions();
  const hPad =
    width >= BREAKPOINT_EXPANDED
      ? H_PAD_EXPANDED
      : width >= BREAKPOINT_MEDIUM
        ? H_PAD_MEDIUM
        : H_PAD_COMPACT;

  return {
    hPad,
    maxWidth: CONTENT_MAX_WIDTH,
    esAncho: width >= BREAKPOINT_MEDIUM,
  };
}
