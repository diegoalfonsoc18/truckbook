import { create } from "zustand";

type Currency = "COP" | "USD" | "EUR"; // Define los tipos de moneda

interface CurrencyState {
  currency: Currency; // Moneda seleccionada
  setCurrency: (currency: Currency) => void; // Función para actualizar la moneda
}

// Crea el store de Zustand
export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: "COP", // Moneda por defecto
  setCurrency: (currency) => set({ currency }), // Actualiza la moneda
}));
