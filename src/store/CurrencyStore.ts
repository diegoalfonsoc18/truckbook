import { create } from "zustand";

type Gasto = { id: string; name: string; value: string };

interface GastosState {
  gastos: Gasto[];
  addGasto: (gasto: Gasto) => void;
  editGasto: (id: string, value: string) => void;
  deleteGasto: (id: string) => void;
}

export const useGastosStore = create<GastosState>((set) => ({
  gastos: [],
  addGasto: (gasto) => set((state) => ({ gastos: [...state.gastos, gasto] })),
  editGasto: (id, value) =>
    set((state) => ({
      gastos: state.gastos.map((g) => (g.id === id ? { ...g, value } : g)),
    })),
  deleteGasto: (id) =>
    set((state) => ({
      gastos: state.gastos.filter((g) => g.id !== id),
    })),
}));
