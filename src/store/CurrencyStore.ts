import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

type Gasto = { id: string; name: string; value: string; fecha: string };

interface GastosState {
  gastos: Gasto[];
  addGasto: (gasto: Omit<Gasto, "id">) => void;
  editGasto: (id: string, value: string, fecha: string) => void;
  deleteGasto: (id: string, fecha: string) => void;
}

export const useGastosStore = create<GastosState>((set) => ({
  gastos: [],
  addGasto: (gasto) =>
    set((state) => ({
      gastos: [...state.gastos, { ...gasto, id: uuidv4() }],
    })),
  editGasto: (id, value) =>
    set((state) => ({
      gastos: state.gastos.map((g) => (g.id === id ? { ...g, value } : g)),
    })),
  deleteGasto: (id) =>
    set((state) => ({
      gastos: state.gastos.filter((g) => g.id !== id),
    })),
}));
