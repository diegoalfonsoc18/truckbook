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
    "Estación de gasolina"
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

        // 3. Overpass API — estaciones de gasolina en radio de 5 km
        const query = `[out:json][timeout:10];node["amenity"="fuel"](around:5000,${lat},${lon});out body 10;`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

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
        const estaciones: Gasolinera[] = elementos
          .map((el) => ({
            id: String(el.id),
            nombre: nombreEstacion(el.tags || {}),
            distanciaKm: haversine(lat, lon, el.lat, el.lon),
            lat: el.lat,
            lon: el.lon,
          }))
          .sort((a, b) => a.distanciaKm - b.distanciaKm)
          .slice(0, 10);

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
