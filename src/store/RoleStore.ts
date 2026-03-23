import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../config/SupaBaseConfig";

export type UserRole = "conductor" | "administrador" | "propietario";

interface RoleState {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
  cargarRolDesdeDB: (userId: string) => Promise<void>;
  guardarRolEnDB: (userId: string, role: UserRole) => Promise<void>;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,

      setRole: (role: UserRole) => set({ role }),

      clearRole: () => set({ role: null }),

      cargarRolDesdeDB: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from("usuarios")
            .select("rol")
            .eq("user_id", userId)
            .maybeSingle();

          if (!error && data?.rol) {
            set({ role: data.rol as UserRole });
          }
        } catch (err) {
          console.error("Error cargando rol:", err);
        }
      },

      guardarRolEnDB: async (userId: string, role: UserRole) => {
        try {
          const { error } = await supabase
            .from("usuarios")
            .update({ rol: role })
            .eq("user_id", userId);

          if (!error) {
            set({ role });
          }
        } catch (err) {
          console.error("Error guardando rol:", err);
        }
      },
    }),
    {
      name: "role-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
