export const vehiculos = [
  {
    marca: "Volvo",
    modelos: ["FH", "FM", "FMX"],
  },
  {
    marca: "Scania",
    modelos: ["R Series", "S Series", "P Series"],
  },
  // ...más marcas y modelos
];
export type Vehiculo = {
  marca: string;
  modelos: string[];
};
