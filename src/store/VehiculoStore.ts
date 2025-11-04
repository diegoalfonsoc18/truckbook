// src/store/VehiculoStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";

export type TipoCamion = "estacas" | "volqueta" | "furgon" | "grua";

interface VehiculoStore {
  placa: string | null;
  tipoCamion: TipoCamion | null;
  setPlaca: (placa: string) => Promise<void>;
  setTipoCamion: (tipo: TipoCamion) => void;
  clearVehiculo: () => void;
}

export const useVehiculoStore = create<VehiculoStore>()(
  persist(
    (set) => ({
      placa: null,
      tipoCamion: null,

      setPlaca: async (placa: string) => {
        try {
          console.log("🔍 Insertando placa:", placa);

          // 1️⃣ Verificar si ya existe
          const { data: existe, error: checkError } = await supabase
            .from("vehiculos")
            .select("placa")
            .eq("placa", placa)
            .maybeSingle();

          if (checkError) {
            console.error("❌ Error al verificar placa:", checkError);
          }

          // 2️⃣ Si NO existe, insertar
          if (!existe) {
            console.log("📝 Placa no existe, insertando...");
            const { data, error } = await supabase
              .from("vehiculos")
              .insert([{ placa }])
              .select();

            if (error) {
              console.error("❌ Error al insertar placa:", error);
              throw error;
            }

            console.log("✅ Placa insertada:", data);
          } else {
            console.log("ℹ️ Placa ya existe");
          }

          // 3️⃣ Guardar en el store
          set({ placa });
          console.log("✅ Placa guardada en store:", placa);
        } catch (err: any) {
          console.error("❌ Error en setPlaca:", err);
          throw err;
        }
      },

      setTipoCamion: (tipoCamion: TipoCamion) => set({ tipoCamion }),
      clearVehiculo: () => set({ placa: null, tipoCamion: null }),
    }),
    {
      name: "vehiculo-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
