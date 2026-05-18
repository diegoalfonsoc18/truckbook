import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { ClimaIconType } from "../assets/icons/icons";

export interface ClimaPeriodo {
  icono: ClimaIconType;
  temp: number;
}

export interface ClimaData {
  temperatura: number;
  condicion: string;
  icono: ClimaIconType;
  ciudad: string;
  manana: ClimaPeriodo;
  tarde: ClimaPeriodo;
  noche: ClimaPeriodo;
  cargando: boolean;
  error: boolean;
  sinPermiso: boolean;
}

const WMO: Record<number, { condicion: string; icono: ClimaIconType }> = {
  0: { condicion: "Despejado", icono: "soleado" },
  1: { condicion: "Mayormente despejado", icono: "nubeYSol" },
  2: { condicion: "Parcialmente nublado", icono: "nubeYSol" },
  3: { condicion: "Nublado", icono: "nube" },
  45: { condicion: "Neblina", icono: "nube" },
  48: { condicion: "Neblina helada", icono: "nube" },
  51: { condicion: "Llovizna leve", icono: "lluvioso" },
  53: { condicion: "Llovizna", icono: "lluvioso" },
  55: { condicion: "Llovizna intensa", icono: "lluvioso" },
  61: { condicion: "Lluvia leve", icono: "lluvioso" },
  63: { condicion: "Lluvia", icono: "lluvioso" },
  65: { condicion: "Lluvia intensa", icono: "lluvioso" },
  71: { condicion: "Nieve leve", icono: "copoDeNieve" },
  73: { condicion: "Nieve", icono: "copoDeNieve" },
  75: { condicion: "Nieve intensa", icono: "copoDeNieve" },
  80: { condicion: "Chubascos leves", icono: "lluvioso" },
  81: { condicion: "Chubascos", icono: "lluvioso" },
  82: { condicion: "Chubascos intensos", icono: "tormenta" },
  95: { condicion: "Tormenta", icono: "tormenta" },
  96: { condicion: "Tormenta con granizo", icono: "tormenta" },
  99: { condicion: "Tormenta con granizo", icono: "tormenta" },
};

function getWMO(code: number) {
  return (
    WMO[code] ?? {
      condicion: "Variable",
      icono: "termometro" as ClimaIconType,
    }
  );
}

const DEFAULT_PERIODO: ClimaPeriodo = { icono: "termometro", temp: 0 };

export function useClima(): ClimaData {
  const [data, setData] = useState<ClimaData>({
    temperatura: 0,
    condicion: "",
    icono: "termometro",
    ciudad: "",
    manana: DEFAULT_PERIODO,
    tarde: DEFAULT_PERIODO,
    noche: DEFAULT_PERIODO,
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
        const [place] = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });
        const ciudad =
          place?.city ?? place?.subregion ?? place?.region ?? "Mi ubicación";
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
        const wmo = getWMO(json.current.weather_code as number);

        // Hourly: índice 9 = 9am (mañana), 15 = 3pm (tarde), 21 = 9pm (noche)
        const temps: number[] = json.hourly.temperature_2m;
        const codes: number[] = json.hourly.weather_code;

        const manana: ClimaPeriodo = {
          temp: Math.round(temps[9]),
          icono: getWMO(codes[9]).icono,
        };
        const tarde: ClimaPeriodo = {
          temp: Math.round(temps[15]),
          icono: getWMO(codes[15]).icono,
        };
        const noche: ClimaPeriodo = {
          temp: Math.round(temps[21]),
          icono: getWMO(codes[21]).icono,
        };

        setData({
          temperatura: temp,
          condicion: wmo.condicion,
          icono: wmo.icono,
          ciudad,
          manana,
          tarde,
          noche,
          cargando: false,
          error: false,
          sinPermiso: false,
        });
      } catch {
        if (!cancelled)
          setData((p) => ({ ...p, cargando: false, error: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
