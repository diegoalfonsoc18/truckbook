import { useState, useEffect } from "react";
import * as Location from "expo-location";

export type ClimaIconName =
  | "sunny-outline"
  | "partly-sunny-outline"
  | "cloudy-outline"
  | "cloud-outline"
  | "rainy-outline"
  | "thunderstorm-outline"
  | "snow-outline"
  | "thermometer-outline";

export interface ClimaPeriodo {
  icono: ClimaIconName;
  temp: number;
}

export interface ClimaData {
  temperatura: number;
  condicion: string;
  icono: ClimaIconName;
  ciudad: string;
  manana: ClimaPeriodo;
  tarde: ClimaPeriodo;
  noche: ClimaPeriodo;
  cargando: boolean;
  error: boolean;
  sinPermiso: boolean;
}

const WMO: Record<number, { condicion: string; icono: ClimaIconName }> = {
  0:  { condicion: "Despejado",            icono: "sunny-outline"        },
  1:  { condicion: "Mayormente despejado", icono: "partly-sunny-outline" },
  2:  { condicion: "Parcialmente nublado", icono: "partly-sunny-outline" },
  3:  { condicion: "Nublado",              icono: "cloudy-outline"       },
  45: { condicion: "Neblina",              icono: "cloud-outline"        },
  48: { condicion: "Neblina helada",       icono: "cloud-outline"        },
  51: { condicion: "Llovizna leve",        icono: "rainy-outline"        },
  53: { condicion: "Llovizna",             icono: "rainy-outline"        },
  55: { condicion: "Llovizna intensa",     icono: "rainy-outline"        },
  61: { condicion: "Lluvia leve",          icono: "rainy-outline"        },
  63: { condicion: "Lluvia",               icono: "rainy-outline"        },
  65: { condicion: "Lluvia intensa",       icono: "rainy-outline"        },
  71: { condicion: "Nieve leve",           icono: "snow-outline"         },
  73: { condicion: "Nieve",                icono: "snow-outline"         },
  75: { condicion: "Nieve intensa",        icono: "snow-outline"         },
  80: { condicion: "Chubascos leves",      icono: "rainy-outline"        },
  81: { condicion: "Chubascos",            icono: "rainy-outline"        },
  82: { condicion: "Chubascos intensos",   icono: "thunderstorm-outline" },
  95: { condicion: "Tormenta",             icono: "thunderstorm-outline" },
  96: { condicion: "Tormenta con granizo", icono: "thunderstorm-outline" },
  99: { condicion: "Tormenta con granizo", icono: "thunderstorm-outline" },
};

function getWMO(code: number) {
  return WMO[code] ?? { condicion: "Variable", icono: "thermometer-outline" as ClimaIconName };
}

const DEFAULT_PERIODO: ClimaPeriodo = { icono: "thermometer-outline", temp: 0 };

export function useClima(): ClimaData {
  const [data, setData] = useState<ClimaData>({
    temperatura: 0,
    condicion: "",
    icono: "thermometer-outline",
    ciudad: "",
    manana: DEFAULT_PERIODO,
    tarde:  DEFAULT_PERIODO,
    noche:  DEFAULT_PERIODO,
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

        // 4. Clima desde Open-Meteo — current + hourly para mañana/tarde/noche
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code` +
          `&hourly=temperature_2m,weather_code` +
          `&timezone=auto&forecast_days=1`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        const json = await res.json();
        if (cancelled) return;

        const temp = Math.round(json.current.temperature_2m as number);
        const wmo  = getWMO(json.current.weather_code as number);

        // Hourly: índice 9 = 9am (mañana), 15 = 3pm (tarde), 21 = 9pm (noche)
        const temps: number[]   = json.hourly.temperature_2m;
        const codes: number[]   = json.hourly.weather_code;

        const manana: ClimaPeriodo = { temp: Math.round(temps[9]),  icono: getWMO(codes[9]).icono  };
        const tarde:  ClimaPeriodo = { temp: Math.round(temps[15]), icono: getWMO(codes[15]).icono };
        const noche:  ClimaPeriodo = { temp: Math.round(temps[21]), icono: getWMO(codes[21]).icono };

        setData({
          temperatura: temp,
          condicion:   wmo.condicion,
          icono:       wmo.icono,
          ciudad,
          manana,
          tarde,
          noche,
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
