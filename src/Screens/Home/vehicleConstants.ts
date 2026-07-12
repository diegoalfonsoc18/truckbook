// src/Screens/Home/vehicleConstants.ts
// Shared vehicle constants used by Home and ModalVehiculos
import type { ImageSourcePropType } from "react-native";
import type { IconName } from "../../components/ItemIcon";
import type { TipoCamion } from "../../store/VehiculoStore";
import { HOME_COLORS } from "./HomeConstants";

/**
 * Fotos reales del camión por tipo (fondo transparente), usadas en la
 * VehicleCard del Home. Solo los tipos con foto disponible aparecen aquí;
 * el resto cae al ícono vectorial (ICON_MAP) automáticamente.
 */
export const VEHICLE_PHOTOS: Partial<Record<TipoCamion, ImageSourcePropType>> = {
  volqueta: require("../../assets/img/volqueta.webp"),
};

export interface Vehiculo {
  id: string;
  placa: string;
  tipo_camion: TipoCamion;
}

export const ICON_MAP: Record<TipoCamion, IconName> = {
  estacas: "estacas",
  volqueta: "volqueta2",
  furgon: "furgon",
  grua: "grua",
  cisterna: "cisterna",
  planchon: "planchon",
  portacontenedor: "portaContenedor",
};

const VALID_TIPOS = new Set<string>(Object.keys(ICON_MAP));

/** Normaliza el valor que llega del DB a un TipoCamion válido */
export function normalizarTipo(raw: string | null | undefined): TipoCamion {
  if (!raw) return "estacas";
  const lower = raw.toLowerCase().trim();
  return VALID_TIPOS.has(lower) ? (lower as TipoCamion) : "estacas";
}

export const TIPOS_CAMION: Array<{
  id: TipoCamion;
  label: string;
  iconName: IconName;
  color: string;
}> = [
  { id: "estacas", label: "Estacas", iconName: "estacas", color: HOME_COLORS.trucks.estacas },
  { id: "volqueta", label: "Volqueta", iconName: "volqueta2", color: HOME_COLORS.trucks.volqueta },
  { id: "furgon", label: "Furgón", iconName: "furgon", color: HOME_COLORS.trucks.furgon },
  { id: "grua", label: "Grúa", iconName: "grua", color: HOME_COLORS.trucks.grua },
  { id: "cisterna", label: "Cisterna", iconName: "cisterna", color: HOME_COLORS.trucks.cisterna },
  { id: "planchon", label: "Planchón", iconName: "planchon", color: HOME_COLORS.trucks.planchon },
  { id: "portacontenedor", label: "Porta cont.", iconName: "portaContenedor", color: HOME_COLORS.trucks.portacontenedor },
];
