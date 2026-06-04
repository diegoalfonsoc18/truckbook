import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGemini } from "../config/aiConfig";
import logger from "../utils/logger";

const CACHE_KEY = "@truckbook_precio_diesel";
const CACHE_TTL = 15 * 24 * 60 * 60 * 1000; // 15 días
const FALLBACK_PRECIO = 11_000;

interface CachedPrecio {
  precio: number;
  timestamp: number;
}

/**
 * Precio promedio del galón de ACPM en Colombia.
 * Se actualiza cada 15 días vía Gemini, cacheado en AsyncStorage.
 */
export function usePrecioDiesel(): { precio: number; cargando: boolean } {
  const [precio, setPrecio] = useState(FALLBACK_PRECIO);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Cache válido → usar
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: CachedPrecio = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_TTL) {
            if (!cancelled) { setPrecio(data.precio); setCargando(false); }
            return;
          }
        }

        // 2. Consultar Gemini
        const { text, error } = await callGemini(
          "Precio promedio actual del galón de ACPM (diésel) en Colombia en pesos colombianos. " +
            "Responde SOLO el número entero sin puntos ni comas ni símbolos. Ejemplo: 11200",
          { temperature: 0, maxOutputTokens: 20 },
        );

        if (!cancelled && !error && text) {
          const parsed = parseInt(text.trim().replace(/[^0-9]/g, ""), 10);
          if (parsed >= 5000 && parsed <= 25000) {
            setPrecio(parsed);
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ precio: parsed, timestamp: Date.now() }));
          }
        }
      } catch {
        logger.error("Error obteniendo precio diésel de Gemini");
      } finally {
        if (!cancelled) setCargando(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { precio, cargando };
}
