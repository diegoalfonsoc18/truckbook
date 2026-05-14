// ─── Colores específicos de la pantalla Home ──────────────────────────────────
// Estos colores son propios de los componentes de Home y no forman parte del
// design system global. Para cambiar el aspecto de un elemento, edita aquí.

export const HOME_COLORS = {
  // Vehicle Card — fondo
  vehicleCardBg: "#C00707",
  vehicleCardBgDark: "#1C1C1E",

  // Vehicle Card — texto
  vehicleCardText: "#FFFFFF", // nombre del tipo de camión
  vehicleCardTextMuted: "#94A3B8", // conductor, hint
  vehicleCardChevronBg: "rgba(255,255,255,0.12)", // fondo del chevron

  // Vehicle Card — icono
  vehicleIconSize: 100,

  // Hero Cards — fondo (cada card independiente)
  heroCard1Bg: "#FFFFFF", // fondo card 1 (izquierda)
  heroCard2Bg: "#FFFFFF", // fondo card 2 (derecha)

  // List Rows — fondo
  listRowBg: "#FFFFFF", // fondo de los items de la lista

  // Hero Cards — texto
  heroCardText: "#111827", // nombre del item
  heroCardTextSub: "#6B6B6B", // subtítulo del item

  // Hero Cards — icono (tamaño por defecto y por item)
  heroIconSize: 64, // fallback si el item no tiene tamaño definido
  heroIconSizes: {
    tecnicomecanica: 90, // hero card 1
    soat: 100, // hero card 2
    multas: 72,
    mantenimiento: 72,
    licencia: 72,
  },

  // Tipos de camión — color de acento por tipo
  trucks: {
    estacas: "#00D9A5",
    volqueta: "#FFB800",
    furgon: "#6C5CE7",
    grua: "#E94560",
    cisterna: "#74B9FF",
    planchon: "#FDCB6E",
    portacontenedor: "#00CEC9",
  },
};
