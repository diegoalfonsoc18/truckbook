// ─── Colores específicos de la pantalla Home ──────────────────────────────────
// Estos colores son propios de los componentes de Home y no forman parte del
// design system global. Para cambiar el aspecto de un elemento, edita aquí.

export const HOME_COLORS = {
  // Vehicle Card — fondo
  vehicleCardBg: "#222831", // borde exterior (double-bezel)
  vehicleCardBgDark: "#1C1C1E",
  vehicleCardInnerBg: "#2D3440", // relleno interior (ligeramente más claro)

  // Vehicle Card — texto
  vehicleCardText: "#FFFFFF",
  vehicleCardTextMuted: "#94A3B8",
  vehicleCardChevronBg: "rgba(255,255,255,0.10)",

  // Vehicle Card — icono
  vehicleIconSize: 90,

  // Hero Cards — fondo (cada card independiente)
  heroCard1Bg: "#FFFFFF", // fondo card 1 (izquierda)
  heroCard2Bg: "#FFFFFF", // fondo card 2 (derecha)

  // List Rows — fondo
  listRowBg: "#FFFFFF", // fondo de los items de la lista

  // Hero Cards — texto (color)
  heroCardText: "#111827", // nombre del item
  heroCardTextSub: "#6B6B6B", // subtítulo del item

  // Hero Cards — tipografía
  heroCardNameSize: 15, // fontSize del nombre
  heroCardNameWeight: "400" as const,
  heroCardNameLetterSpacing: -0.3,
  heroCardSubSize: 11, // fontSize del subtítulo
  heroCardSubLineHeight: 15,

  // List Rows — tipografía
  listRowLabelSize: 16,
  listRowLabelWeight: "400" as const,
  listRowLabelLetterSpacing: -0.2,

  // Vehicle Card — tipografía
  vehicleLabelSize: 12,
  vehicleLabelWeight: "500" as const,
  vehicleLabelLetterSpacing: 0.1,
  vehicleTypeSize: 26,
  vehicleTypeWeight: "700" as const,
  vehicleHintSize: 13,
  vehicleConductorSize: 12,
  vehiclePlateSize: 16,
  vehiclePlateWeight: "800" as const,
  vehiclePlateLetterSpacing: 1.5,

  // Vehicle Card — placa badge
  vehicleBadgeBorderRadius: 8,
  vehicleBadgePaddingH: 10,
  vehicleBadgePaddingV: 4,

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
