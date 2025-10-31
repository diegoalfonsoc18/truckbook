// src/store/VehiculoStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TipoCamion = "estacas" | "volqueta" | "furgon" | "grua";

interface VehiculoStore {
  placa: string | null;
  tipoCamion: TipoCamion | null;
  setPlaca: (placa: string) => void;
  setTipoCamion: (tipo: TipoCamion) => void;
  clearVehiculo: () => void;
}

export const useVehiculoStore = create<VehiculoStore>()(
  persist(
    (set) => ({
      placa: null,
      tipoCamion: null,
      setPlaca: (placa: string) => set({ placa }),
      setTipoCamion: (tipoCamion: TipoCamion) => set({ tipoCamion }),
      clearVehiculo: () => set({ placa: null, tipoCamion: null }),
    }),
    {
      name: "vehiculo-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
