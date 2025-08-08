import React, { createContext, useState, useContext } from "react";

// Define el tipo de datos para ingresos y gastos
interface FinanzasContextType {
  ingresos: number[];
  gastos: number[];
  setIngresos: (data: number[]) => void;
  setGastos: (data: number[]) => void;
}

// Crea el contexto
const FinanzasContext = createContext<FinanzasContextType | undefined>(
  undefined
);

// Proveedor del contexto
export const FinanzasProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ingresos, setIngresos] = useState<number[]>([
    5000, 7000, 8000, 6000, 7500, 9000,
  ]);
  const [gastos, setGastos] = useState<number[]>([
    3000, 4000, 3500, 4500, 5000, 5500,
  ]);

  return (
    <FinanzasContext.Provider
      value={{ ingresos, gastos, setIngresos, setGastos }}>
      {children}
    </FinanzasContext.Provider>
  );
};

// Hook para usar el contexto
export const useFinanzas = () => {
  const context = useContext(FinanzasContext);
  if (!context) {
    throw new Error("useFinanzas debe usarse dentro de un FinanzasProvider");
  }
  return context;
};
