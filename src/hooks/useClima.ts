import { useState, useEffect } from "react";

export interface ClimaData {
  temperatura: number;
  condicion: string;
  emoji: string;
  ciudad: string;
  cargando: boolean;
  error: boolean;
}

const WMO: Record<number, { condicion: string; emoji: string }> = {
  0:  { condicion: "Despejado",               emoji: "☀️" },
  1:  { condicion: "Mayormente despejado",     emoji: "🌤" },
  2:  { condicion: "Parcialmente nublado",     emoji: "⛅" },
  3:  { condicion: "Nublado",                  emoji: "☁️" },
  45: { condicion: "Neblina",                  emoji: "🌫" },
  48: { condicion: "Neblina helada",           emoji: "🌫" },
  51: { condicion: "Llovizna leve",            emoji: "🌦" },
  53: { condicion: "Llovizna moderada",        emoji: "🌦" },
  55: { condicion: "Llovizna intensa",         emoji: "🌧" },
  61: { condicion: "Lluvia leve",              emoji: "🌧" },
  63: { condicion: "Lluvia moderada",          emoji: "🌧" },
  65: { condicion: "Lluvia intensa",           emoji: "🌧" },
  71: { condicion: "Nieve leve",               emoji: "❄️" },
  73: { condicion: "Nieve moderada",           emoji: "❄️" },
  75: { condicion: "Nieve intensa",            emoji: "❄️" },
  80: { condicion: "Chubascos leves",          emoji: "🌦" },
  81: { condicion: "Chubascos moderados",      emoji: "🌧" },
  82: { condicion: "Chubascos intensos",       emoji: "⛈" },
  95: { condicion: "Tormenta",                 emoji: "⛈" },
  96: { condicion: "Tormenta con granizo",     emoji: "⛈" },
  99: { condicion: "Tormenta con granizo",     emoji: "⛈" },
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
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // IP-based geolocation — sin permisos de dispositivo
        const geoRes = await fetch("https://ip-api.com/json/?lang=es&fields=status,city,lat,lon", {
          signal: AbortSignal.timeout(6000),
        });
        const geo = await geoRes.json();
        if (cancelled) return;
        if (geo.status !== "success") throw new Error("geo");

        const { lat, lon, city } = geo as { lat: number; lon: number; city: string; status: string };

        // Open-Meteo — gratis, sin API key
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
          { signal: AbortSignal.timeout(6000) },
        );
        const weather = await weatherRes.json();
        if (cancelled) return;

        const temp  = Math.round(weather.current.temperature_2m as number);
        const wmo   = getWMO(weather.current.weather_code as number);

        setData({
          temperatura: temp,
          condicion:   wmo.condicion,
          emoji:       wmo.emoji,
          ciudad:      city || "Mi ciudad",
          cargando:    false,
          error:       false,
        });
      } catch {
        if (!cancelled) setData((p) => ({ ...p, cargando: false, error: true }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return data;
}
