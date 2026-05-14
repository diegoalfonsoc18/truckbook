import { useState, useEffect } from "react";
import * as Location from "expo-location";

export interface ClimaData {
  temperatura: number;
  condicion: string;
  emoji: string;
  ciudad: string;
  cargando: boolean;
  error: boolean;
  sinPermiso: boolean;
}

const WMO: Record<number, { condicion: string; emoji: string }> = {
  0:  { condicion: "Despejado",            emoji: "☀️" },
  1:  { condicion: "Mayormente despejado", emoji: "🌤" },
  2:  { condicion: "Parcialmente nublado", emoji: "⛅" },
  3:  { condicion: "Nublado",              emoji: "☁️" },
  45: { condicion: "Neblina",              emoji: "🌫" },
  48: { condicion: "Neblina helada",       emoji: "🌫" },
  51: { condicion: "Llovizna leve",        emoji: "🌦" },
  53: { condicion: "Llovizna",             emoji: "🌦" },
  55: { condicion: "Llovizna intensa",     emoji: "🌧" },
  61: { condicion: "Lluvia leve",          emoji: "🌧" },
  63: { condicion: "Lluvia",               emoji: "🌧" },
  65: { condicion: "Lluvia intensa",       emoji: "🌧" },
  71: { condicion: "Nieve leve",           emoji: "❄️" },
  73: { condicion: "Nieve",                emoji: "❄️" },
  75: { condicion: "Nieve intensa",        emoji: "❄️" },
  80: { condicion: "Chubascos leves",      emoji: "🌦" },
  81: { condicion: "Chubascos",            emoji: "🌧" },
  82: { condicion: "Chubascos intensos",   emoji: "⛈" },
  95: { condicion: "Tormenta",             emoji: "⛈" },
  96: { condicion: "Tormenta con granizo", emoji: "⛈" },
  99: { condicion: "Tormenta con granizo", emoji: "⛈" },
};

function getWMO(code: number) {
  return WMO[code] ?? { condicion: "Variable", emoji: "🌡" };
}

export function useClima(): ClimaData {
  const [data, setData] = useState<ClimaData>({
    temperatura: 0,
    condicion: "",
    emoji: "🌡",
    ciudad: "",
    cargando: true,
    error: false,
    sinPermiso: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Solicitar permiso de ubicación
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== "granted") {
          setData((p) => ({ ...p, cargando: false, sinPermiso: true }));
          return;
        }

        // 2. Obtener coordenadas del dispositivo
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { latitude: lat, longitude: lon } = loc.coords;

        // 3. Nombre de ciudad via geocodificación inversa (sin API externa)
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const ciudad = place?.city ?? place?.subregion ?? place?.region ?? "Mi ubicación";
        if (cancelled) return;

        // 4. Clima desde Open-Meteo (gratis, sin API key)
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
          { signal: AbortSignal.timeout(8000) },
        );
        const json = await res.json();
        if (cancelled) return;

        const temp = Math.round(json.current.temperature_2m as number);
        const wmo  = getWMO(json.current.weather_code as number);

        setData({
          temperatura: temp,
          condicion:   wmo.condicion,
          emoji:       wmo.emoji,
          ciudad,
          cargando:    false,
          error:       false,
          sinPermiso:  false,
        });
      } catch {
        if (!cancelled) setData((p) => ({ ...p, cargando: false, error: true }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return data;
}
