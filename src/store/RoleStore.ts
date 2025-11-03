import { create } from "zustand";

export type UserRole = "conductor" | "administrador" | "propietario";

interface RoleState {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  role: null,
  setRole: (role: UserRole) => set({ role }),
  clearRole: () => set({ role: null }),
}));
