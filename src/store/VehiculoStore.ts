// src/store/VehiculoStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

export type TipoCamion = "estacas" | "volqueta" | "furgon" | "grua" | "cisterna" | "planchon" | "portacontenedor";

interface VehiculoStore {
  placa: string | null;
  tipoCamion: TipoCamion | null;
  setPlaca: (placa: string) => Promise<void>;
  setTipoCamion: (tipo: TipoCamion) => void;
  clearVehiculo: () => void;
  /** Verifica que la placa guardada pertenezca al usuario actual.
   *  Si no existe ninguna asignación activa la limpia automáticamente. */
  validarPlacaParaUsuario: (userId: string) => Promise<void>;
}

export const useVehiculoStore = create<VehiculoStore>()(
  persist(
    (set, get) => ({
      placa: null,
      tipoCamion: null,

      setPlaca: async (placa: string) => {
        try {
          logger.log("🔍 Insertando placa:", placa);

          // 1️⃣ Verificar si ya existe
          const { data: existe, error: checkError } = await supabase
            .from("vehiculos")
            .select("placa")
            .eq("placa", placa)
            .maybeSingle();

          if (checkError) {
            logger.error("❌ Error al verificar placa:", checkError);
          }

          // 2️⃣ Si NO existe, insertar
          if (!existe) {
            logger.log("📝 Placa no existe, insertando...");
            const { data, error } = await supabase
              .from("vehiculos")
              .insert([{ placa }])
              .select();

            if (error) {
              logger.error("❌ Error al insertar placa:", error);
              throw error;
            }

            logger.log("✅ Placa insertada:", data);
          } else {
            logger.log("ℹ️ Placa ya existe");
          }

          // 3️⃣ Guardar en el store
          set({ placa });
          logger.log("✅ Placa guardada en store:", placa);
        } catch (err: any) {
          logger.error("❌ Error en setPlaca:", err);
          throw err;
        }
      },

      setTipoCamion: (tipoCamion: TipoCamion) => set({ tipoCamion }),
      clearVehiculo: () => set({ placa: null, tipoCamion: null }),

      validarPlacaParaUsuario: async (userId: string) => {
        const placa = get().placa;
        if (!placa) return; // nada que validar

        try {
          // Comprueba si el usuario tiene una asignación activa en ese vehículo
          const { data, error } = await supabase
            .from("vehiculo_conductores")
            .select("vehiculo_placa")
            .eq("conductor_id", userId)
            .eq("vehiculo_placa", placa)
            .maybeSingle();

          // Si hay error de red o timeout → conservar placa, reintentar en próxima apertura
          if (error) {
            logger.warn("⚠️ validarPlaca: sin conexión, conservando placa en caché:", error.message);
            return;
          }

          // Solo limpiar si la consulta fue exitosa y no hay relación válida
          if (!data) {
            logger.log("🚫 Placa no autorizada para este usuario → limpiando");
            set({ placa: null, tipoCamion: null });
          }
        } catch (err: any) {
          // Error inesperado → conservar placa, no crashear
          logger.warn("⚠️ validarPlaca: error inesperado, conservando placa:", err?.message ?? err);
        }
      },
    }),
    {
      name: "vehiculo-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
