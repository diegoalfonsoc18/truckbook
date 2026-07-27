// src/Screens/Home/vehicleConstants.ts
// Constantes de vehículos compartidas por Home y ModalVehiculos.
//
// Modelo: cada VARIANTE (carrocería + configuración de ejes) es un valor propio
// de `tipo_camion` que se guarda por vehículo — p. ej. "estacasTresEjes". La
// CARROCERÍA base ("estacas") se deriva de la variante y es la que usan los
// íconos y la mercancía, que no dependen de los ejes.
import type { ImageSourcePropType } from "react-native";
import type { IconName } from "../../components/ItemIcon";
import type { TipoCamion } from "../../store/VehiculoStore";
import { HOME_COLORS } from "./HomeConstants";

// ─── Fotos por variante ───────────────────────────────────────────────────────
// Todas las variantes tienen foto (fondo transparente). `require` necesita
// literales estáticos, por eso van una a una.
export const VEHICLE_PHOTOS: Record<string, ImageSourcePropType> = {
  furgonLiviano: require("../../assets/img/furgonLiviano.webp"),
  estacasLiviano: require("../../assets/img/estacasLiviano.webp"),
  cisternaLiviano: require("../../assets/img/cisternaLiviano.webp"),
  planchonLiviano: require("../../assets/img/planchonLiviano.webp"),
  estacasMediano: require("../../assets/img/estacasMediano.webp"),
  volquetaMediano: require("../../assets/img/volquetaMediano.webp"),
  gruaMediano: require("../../assets/img/gruaMediano.webp"),
  cisternaMediano: require("../../assets/img/cisternaMediano.webp"),
  estacasTresEjes: require("../../assets/img/estacasTresEjes.webp"),
  volquetaTresEjes: require("../../assets/img/volquetaTresEjes.webp"),
  cisternaTresEjes: require("../../assets/img/cisternaTresEjes.webp"),
  tractocamion: require("../../assets/img/tractocamion.webp"),
};

export interface Vehiculo {
  id: string;
  placa: string;
  /** Variante (p. ej. "estacasTresEjes"). Ver normalizarTipo. */
  tipo_camion: string;
}

// Ícono vectorial por CARROCERÍA base (respaldo si una variante no tuviera foto).
export const ICON_MAP: Record<TipoCamion, IconName> = {
  estacas: "estacas",
  volqueta: "volqueta2",
  furgon: "furgon",
  grua: "grua",
  cisterna: "cisterna",
  planchon: "planchon",
  tractocamion: "truck",
};

// ─── Grupos del selector, por configuración de ejes (Resolución 4100) ─────────
export type CategoriaEjes = "livianos" | "medianos" | "tres" | "tracto";

export const CATEGORIAS_EJES: Array<{ id: CategoriaEjes; label: string }> = [
  { id: "livianos", label: "2 ejes livianos" },
  { id: "medianos", label: "2 ejes medianos" },
  { id: "tres", label: "3 ejes" },
  { id: "tracto", label: "Tractocamión" },
];

export interface TipoCamionInfo {
  /** Id de la variante = valor guardado en tipo_camion y clave de VEHICLE_PHOTOS. */
  id: string;
  /** Carrocería base, para íconos y mercancía. */
  carroceria: TipoCamion;
  label: string;
  color: string;
  categoria: CategoriaEjes;
}

export const TIPOS_CAMION: TipoCamionInfo[] = [
  // 2 ejes livianos (2D)
  { id: "furgonLiviano", carroceria: "furgon", label: "Furgón", color: HOME_COLORS.trucks.furgon, categoria: "livianos" },
  { id: "estacasLiviano", carroceria: "estacas", label: "Estacas", color: HOME_COLORS.trucks.estacas, categoria: "livianos" },
  { id: "cisternaLiviano", carroceria: "cisterna", label: "Cisterna", color: HOME_COLORS.trucks.cisterna, categoria: "livianos" },
  { id: "planchonLiviano", carroceria: "planchon", label: "Planchón", color: HOME_COLORS.trucks.planchon, categoria: "livianos" },
  // 2 ejes medianos (2DA)
  { id: "estacasMediano", carroceria: "estacas", label: "Estacas", color: HOME_COLORS.trucks.estacas, categoria: "medianos" },
  { id: "volquetaMediano", carroceria: "volqueta", label: "Volqueta", color: HOME_COLORS.trucks.volqueta, categoria: "medianos" },
  { id: "gruaMediano", carroceria: "grua", label: "Grúa", color: HOME_COLORS.trucks.grua, categoria: "medianos" },
  { id: "cisternaMediano", carroceria: "cisterna", label: "Cisterna", color: HOME_COLORS.trucks.cisterna, categoria: "medianos" },
  // 3 ejes (3A)
  { id: "estacasTresEjes", carroceria: "estacas", label: "Estacas", color: HOME_COLORS.trucks.estacas, categoria: "tres" },
  { id: "volquetaTresEjes", carroceria: "volqueta", label: "Volqueta", color: HOME_COLORS.trucks.volqueta, categoria: "tres" },
  { id: "cisternaTresEjes", carroceria: "cisterna", label: "Cisterna", color: HOME_COLORS.trucks.cisterna, categoria: "tres" },
  // Tractocamión
  { id: "tractocamion", carroceria: "tractocamion", label: "Tractocamión", color: HOME_COLORS.trucks.tractocamion, categoria: "tracto" },
];

const POR_ID = new Map(TIPOS_CAMION.map((t) => [t.id, t]));

// Valores viejos (carrocería sola, sin variante) → variante por defecto. Los
// vehículos ya guardados usan estos, así que hay que mapearlos para que no
// pierdan foto. Volqueta y grúa no tienen variante liviana: caen a mediana.
const LEGADO: Record<string, string> = {
  furgon: "furgonLiviano",
  estacas: "estacasLiviano",
  cisterna: "cisternaLiviano",
  planchon: "planchonLiviano",
  volqueta: "volquetaMediano",
  grua: "gruaMediano",
  tractocamion: "tractocamion",
};

/** Normaliza el valor del DB a una VARIANTE válida (id de TIPOS_CAMION). */
export function normalizarTipo(raw: string | null | undefined): string {
  if (!raw) return "estacasLiviano";
  const v = raw.trim();
  if (POR_ID.has(v)) return v; // ya es una variante válida
  const legado = LEGADO[v.toLowerCase()];
  return legado ?? "estacasLiviano";
}

/** Carrocería base de una variante, para íconos y mercancía. */
export function carroceriaBase(tipo: string | null | undefined): TipoCamion {
  if (!tipo) return "estacas";
  return POR_ID.get(tipo)?.carroceria ?? LEGADO_CARROCERIA(tipo);
}

function LEGADO_CARROCERIA(tipo: string): TipoCamion {
  const base = tipo.toLowerCase();
  if (base in ICON_MAP) return base as TipoCamion;
  return "estacas";
}

/** Info de la variante (label, color, carrocería…) o undefined. */
export function infoTipo(tipo: string | null | undefined): TipoCamionInfo | undefined {
  return tipo ? POR_ID.get(tipo) : undefined;
}
