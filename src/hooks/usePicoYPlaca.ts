import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { useVehiculoStore } from "../store/VehiculoStore";

export interface PicoYPlacaData {
  restringido: boolean;
  ultimoDigito: number | null;
  ciudad: string | null;
  hastaHora: string | null;
  cargando: boolean;
  sinPlaca: boolean;
  sinCobertura: boolean;
}

// Reglas de pico y placa para VEHÍCULOS DE CARGA (camiones)
// Día de semana: 1=lun, 2=mar, 3=mié, 4=jue, 5=vie (getDay() devuelve 0=dom)
type Reglas = Record<number, number[]>;
type Horario = { inicio: number; fin: number }; // minutos desde medianoche

interface ReglaCiudad {
  reglas: Reglas;
  horarios: Horario[];
}

// Bogotá — Decreto 190/2022 + restricción carga pesada
// Lun-Vie, último dígito, franjas: 6:00-9:00 y 17:00-21:00
const BOGOTA: ReglaCiudad = {
  reglas: { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 0] },
  horarios: [
    { inicio: 6 * 60, fin: 9 * 60 },
    { inicio: 17 * 60, fin: 21 * 60 },
  ],
};

// Medellín — Restricción carga Lun-Vie
// Franjas: 7:00-9:00 y 17:00-20:00
const MEDELLIN: ReglaCiudad = {
  reglas: { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 0] },
  horarios: [
    { inicio: 7 * 60, fin: 9 * 60 },
    { inicio: 17 * 60, fin: 20 * 60 },
  ],
};

// Cali — Restricción carga Lun-Vie
// Franjas: 7:00-9:00 y 16:00-19:00
const CALI: ReglaCiudad = {
  reglas: { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 0] },
  horarios: [
    { inicio: 7 * 60, fin: 9 * 60 },
    { inicio: 16 * 60, fin: 19 * 60 },
  ],
};

// Bucaramanga — Restricción carga Lun-Vie
const BUCARAMANGA: ReglaCiudad = {
  reglas: { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 0] },
  horarios: [
    { inicio: 7 * 60, fin: 9 * 60 },
    { inicio: 17 * 60, fin: 19 * 60 },
  ],
};

// Barranquilla — sin pico y placa para carga en vías principales
// (se incluye pero con sinCobertura=true para que el widget lo informe)

const CIUDADES: Record<string, ReglaCiudad> = {
  bogota: BOGOTA,
  bogotá: BOGOTA,
  medellin: MEDELLIN,
  medellín: MEDELLIN,
  cali: CALI,
  bucaramanga: BUCARAMANGA,
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function minutosAhora(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function horarioActivo(horarios: Horario[], minutos: number): Horario | null {
  return horarios.find((h) => minutos >= h.inicio && minutos < h.fin) ?? null;
}

function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

export function usePicoYPlaca(): PicoYPlacaData {
  const placa = useVehiculoStore((s) => s.placa);

  const [data, setData] = useState<PicoYPlacaData>({
    restringido: false,
    ultimoDigito: null,
    ciudad: null,
    hastaHora: null,
    cargando: true,
    sinPlaca: false,
    sinCobertura: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!placa) {
        setData((p) => ({ ...p, cargando: false, sinPlaca: true }));
        return;
      }

      const ultimoDigito = parseInt(placa.slice(-1), 10);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== "granted") {
          setData({ restringido: false, ultimoDigito, ciudad: null, hastaHora: null, cargando: false, sinPlaca: false, sinCobertura: true });
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (cancelled) return;

        const ciudadRaw = place?.city ?? place?.subregion ?? "";
        const ciudadKey = normalizar(ciudadRaw);
        const reglasCiudad = CIUDADES[ciudadKey];

        if (!reglasCiudad) {
          // Ciudad sin datos de pico y placa para carga
          setData({ restringido: false, ultimoDigito, ciudad: ciudadRaw || null, hastaHora: null, cargando: false, sinPlaca: false, sinCobertura: true });
          return;
        }

        // getDay(): 0=dom, 1=lun … 6=sab — fin de semana sin restricción
        const diaSemana = new Date().getDay();
        const digitosRestringidos = reglasCiudad.reglas[diaSemana] ?? [];
        const estaRestringido = digitosRestringidos.includes(isNaN(ultimoDigito) ? -1 : ultimoDigito);

        let hastaHora: string | null = null;
        if (estaRestringido) {
          const horario = horarioActivo(reglasCiudad.horarios, minutosAhora());
          hastaHora = horario ? formatHora(horario.fin) : null;
        }

        if (!cancelled) {
          setData({
            restringido: estaRestringido && hastaHora !== null,
            ultimoDigito,
            ciudad: ciudadRaw,
            hastaHora,
            cargando: false,
            sinPlaca: false,
            sinCobertura: false,
          });
        }
      } catch {
        if (!cancelled) setData((p) => ({ ...p, cargando: false, sinCobertura: true }));
      }
    })();

    return () => { cancelled = true; };
  }, [placa]);

  return data;
}
