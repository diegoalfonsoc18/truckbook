import { MultasIcon } from "../../assets/icons/icons";
import { SoatIcon } from "../../assets/icons/icons";
import { MantenimientoIcon } from "../../assets/icons/icons";
import { LicenciaIcon } from "../../assets/icons/icons";
import { tecnoIcon } from "../../assets/icons/icons";

export const items = [
  {
    icon: MultasIcon,
    title: "Pendiente",
    subtitle: "Multas",
    backgroundColor: "#FFF7D1", // ✅ Rojo pastel
  },
  {
    icon: SoatIcon,
    title: "Soat",
    subtitle: "Historial",
    backgroundColor: "#c0c5d1ff", // ✅ Azul pastel
  },
  {
    icon: MantenimientoIcon,
    title: "Mantenimiento",
    subtitle: "Vencimiento",
    backgroundColor: "#b3b9cfff", // ✅ Verde pastel
  },
  {
    icon: LicenciaIcon,
    title: "Licencia",
    subtitle: "Vencimiento",
    backgroundColor: "#d1f0ff", // ✅ Amarillo pastel
  },
  {
    icon: tecnoIcon,
    title: "Tecnomecánica",
    subtitle: "Vencimiento",
    backgroundColor: "#ffd1f0", // ✅ Morado pastel
  },
];
