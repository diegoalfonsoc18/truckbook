import create from "zustand";

export default FinanzasControl = create((set) => ({
  gastos: {},
  setGasto: (id, value) =>
    set((state) => ({
      gastos: {
        ...state.gastos,
        [id]: value,
      },
    })),



    
}));
