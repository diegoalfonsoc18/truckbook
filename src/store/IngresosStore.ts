import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

type Ingreso = { id: string; name: string; value: string; fecha: string };

interface IngresosState {
  ingresos: Ingreso[];
  addIngreso: (ingreso: Omit<Ingreso, "id">) => void;
  editIngreso: (id: string, value: string) => void;
  deleteIngreso: (id: string) => void;
}

export const useIngresosStore = create<IngresosState>((set) => ({
  ingresos: [],
  addIngreso: (ingreso) =>
    set((state) => ({
      ingresos: [...state.ingresos, { ...ingreso, id: uuidv4() }],
    })),
  editIngreso: (id, value) =>
    set((state) => ({
      ingresos: state.ingresos.map((i) => (i.id === id ? { ...i, value } : i)),
    })),
  deleteIngreso: (id) =>
    set((state) => ({
      ingresos: state.ingresos.filter((i) => i.id !== id),
    })),
}));
