// src/hooks/useFotoCamion.ts
// Foto propia del camión, lista para pasarle a <Image>.
//
// El bucket es privado (la foto muestra la placa), así que hay que pedir una
// URL firmada. Por eso se guarda el path en la base y no la URL: las firmadas
// caducan y una guardada quedaría rota a las pocas horas.
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { useVehiculosListStore } from "../store/VehiculosListStore";
import { urlFotoCamion } from "../services/fotoVehiculoService";

/**
 * Devuelve el `source` de la foto que subió el usuario para esa placa, o
 * `undefined` si no hay — ahí el llamador cae a la foto del catálogo por tipo.
 */
export function useFotoCamion(
  placa: string | null,
): ImageSourcePropType | undefined {
  const vehiculos = useVehiculosListStore((s) => s.vehiculos);
  const path = placa
    ? (vehiculos.find((v) => v.placa === placa)?.foto_path ?? null)
    : null;

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelado = false;
    urlFotoCamion(path).then((u) => {
      if (!cancelado) setUrl(u);
    });
    return () => {
      cancelado = true;
    };
  }, [path]);

  return url ? { uri: url } : undefined;
}
