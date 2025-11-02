// src/store/RoleStore.ts
import { create } from "zustand";

export type UserRole = "conductor" | "administrador" | "dueño";

interface RoleStore {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
}

export const useRoleStore = create<RoleStore>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
}));
