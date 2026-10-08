// src/store/VehiculoStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";
import logger from "../utils/logger";

// Carrocería base. La VARIANTE que se guarda por vehículo (p. ej.
// "estacasTresEjes") es un string; ver vehicleConstants (normalizarTipo,
// carroceriaBase).
export type TipoCamion = "estacas" | "volqueta" | "furgon" | "grua" | "cisterna" | "planchon" | "tractocamion";

interface VehiculoStore {
  placa: string | null;
  /** Variante del camión (id de TIPOS_CAMION), no solo la carrocería. */
  tipoCamion: string | null;
  setPlaca: (placa: string) => Promise<void>;
  setTipoCamion: (tipo: string) => void;
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
          placa = placa.trim().toUpperCase();
          logger.log("🔍 Insertando placa:", placa);

          const { data: sess } = await supabase.auth.getSession();
          const userId = sess.session?.user.id;
          if (!userId) throw new Error("Sin sesión");

          // 1️⃣ Verificar si ya existe (la placa es por usuario)
          const { data: existe, error: checkError } = await supabase
            .from("vehiculos")
            .select("placa")
            .eq("placa", placa)
            .eq("conductor_id", userId)
            .maybeSingle();

          if (checkError) {
            logger.error("❌ Error al verificar placa:", checkError);
          }

          // 2️⃣ Si NO existe, insertar
          if (!existe) {
            logger.log("📝 Placa no existe, insertando...");
            const { data, error } = await supabase
              .from("vehiculos")
              .insert([{ placa, conductor_id: userId }])
              .select();

            // 23505 = otro cliente la creó entre el SELECT y el INSERT: es válido
            if (error && error.code !== "23505") {
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

      setTipoCamion: (tipoCamion: string) => set({ tipoCamion }),
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
