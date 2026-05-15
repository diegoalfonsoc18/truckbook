import { useState, useEffect } from "react";
import * as Location from "expo-location";

export interface Gasolinera {
  id: string;
  nombre: string;
  distanciaKm: number;
  lat: number;
  lon: number;
}

export interface Coordenadas {
  lat: number;
  lon: number;
}

export interface GasolinerasData {
  cercanas: Gasolinera[];
  ubicacion: Coordenadas | null;
  cargando: boolean;
  error: boolean;
  sinPermiso: boolean;
}

/** Distancia en km entre dos coordenadas (Haversine) */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nombreEstacion(tags: Record<string, string>): string {
  return (
    tags["brand"] ||
    tags["name"] ||
    tags["operator"] ||
    "EDS"
  );
}

export function useGasolineras(): GasolinerasData {
  const [data, setData] = useState<GasolinerasData>({
    cercanas: [],
    ubicacion: null,
    cargando: true,
    error: false,
    sinPermiso: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Permiso de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setData((p) => ({ ...p, cargando: false, sinPermiso: true }));
          return;
        }

        // 2. Coordenadas del dispositivo
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { latitude: lat, longitude: lon } = loc.coords;

        // 3. Overpass API — EDS en radio de 10 km (amenity=fuel + shop=fuel)
        const r = 10000;
        const query = `[out:json][timeout:20];(node["amenity"="fuel"](around:${r},${lat},${lon});way["amenity"="fuel"](around:${r},${lat},${lon});relation["amenity"="fuel"](around:${r},${lat},${lon});node["shop"="fuel"](around:${r},${lat},${lon});way["shop"="fuel"](around:${r},${lat},${lon}););out center 50;`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);

        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (cancelled) return;

        const json = await res.json();
        const elementos: any[] = json.elements || [];

        // 4. Calcular distancia y ordenar
        // Los way/relation usan el.center.lat/lon; los node usan el.lat/lon
        const estaciones: Gasolinera[] = elementos
          .map((el) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (elLat == null || elLon == null) return null;
            return {
              id: String(el.id),
              nombre: nombreEstacion(el.tags || {}),
              distanciaKm: haversine(lat, lon, elLat, elLon),
              lat: elLat,
              lon: elLon,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a!.distanciaKm - b!.distanciaKm)
          .slice(0, 30) as Gasolinera[];

        if (!cancelled) {
          setData({
            cercanas: estaciones,
            ubicacion: { lat, lon },
            cargando: false,
            error: false,
            sinPermiso: false,
          });
        }
      } catch {
        if (!cancelled) setData((p) => ({ ...p, cargando: false, error: true }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return data;
}
