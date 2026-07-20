// Íconos que cambian según el tipo de camión de la placa activa.
//
// Un "Flete" y una "Mercancía" no se ven igual en una volqueta que en una
// cisterna, así que el ícono sigue al vehículo. Vivían duplicados dentro de
// Ingresos.tsx; ahora son una sola fuente para que Ingresos y el panel de
// Actividad reciente del Home no se desincronicen.

import { TipoCamion } from "../store/VehiculoStore";
import { IconName } from "../components/ItemIcon";

/** Ícono de la categoría "Flete" según el camión. */
export function getTruckIconName(tipoCamion: TipoCamion | null): IconName {
  switch (tipoCamion) {
    case "estacas":
      return "estacaFlete" as IconName;
    case "volqueta":
      return "volquetaFlete" as IconName;
    case "furgon":
      return "furgon" as IconName;
    case "grua":
      return "gruaFlete" as IconName;
    case "cisterna":
      return "cisterna" as IconName;
    case "planchon":
      return "planchosFlete" as IconName;
    // No hay un "tractocamionFlete"; se usa el mismo ícono que en ICON_MAP.
    case "tractocamion":
      return "truck" as IconName;
    default:
      return "freight" as IconName;
  }
}

/** Ícono de la categoría "Mercancía" según lo que carga ese camión. */
export function getMercanciaIcon(tipoCamion: TipoCamion | null): IconName {
  switch (tipoCamion) {
    case "volqueta":
      return "mercancia_gravel" as IconName;
    case "grua":
    case "planchon":
      return "mercancia_carGrua" as IconName;
    case "cisterna":
      return "mercancia_gasStation" as IconName;
    // Estacas, furgón y tractocamión mueven carga general.
    case "estacas":
    case "furgon":
    case "tractocamion":
      return "mercancia_box" as IconName;
    default:
      return "mercancia_box" as IconName;
  }
}
