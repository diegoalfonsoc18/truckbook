import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================
// DEFINICIÓN DE COLORES
// ============================================

export const LIGHT_COLORS = {
  // Fondos
  primary: "#F5F5F7",
  secondary: "#FFFFFF",
  surface: "#FFFFFF",
  cardBg: "#FFFFFF",
  modalBg: "#FFFFFF",

  // Texto
  text: "#1A1A2E",
  textSecondary: "#6B6B7B",
  textMuted: "#9A9AAA",
  textInverse: "#FFFFFF",

  // Bordes y divisores
  border: "#E5E5EA",
  divider: "#E5E5EA",

  // Acentos principales
  accent: "#007AFF",
  accentLight: "#007AFF20",

  // Colores semánticos
  success: "#00D9A5",
  successLight: "#00D9A520",
  successDark: "#00B894",

  danger: "#E94560",
  dangerLight: "#E9456020",
  dangerDark: "#D63851",

  warning: "#FFB800",
  warningLight: "#FFB80020",

  info: "#6C5CE7",
  infoLight: "#6C5CE720",

  // Colores específicos de TruckBook
  income: "#00D9A5",
  incomeLight: "#00D9A520",
  expense: "#E94560",
  expenseLight: "#E9456020",
  analytics: "#6C5CE7",
  analyticsLight: "#6C5CE720",

  // Placa colombiana
  plateYellow: "#FFE415",
  plateText: "#000000",
  plateBorder: "#000000",

  // Categorías de gastos
  catCombustible: "#FFB800",
  catPeajes: "#00D9A5",
  catComida: "#FF6B6B",
  catHospedaje: "#6C5CE7",
  catMantenimiento: "#74B9FF",
  catLlantas: "#A29BFE",
  catLavado: "#00CEC9",
  catParqueadero: "#FD79A8",
  catOtros: "#636E72",

  // Tipos de vehículo
  vehicleEstacas: "#00D9A5",
  vehicleVolqueta: "#FFB800",
  vehicleFurgon: "#6C5CE7",
  vehicleGrua: "#E94560",

  // Estados
  active: "#00D9A5",
  inactive: "#9A9AAA",

  // Sombras
  shadowColor: "#000000",
  shadowOpacity: 0.08,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayLight: "rgba(0, 0, 0, 0.3)",
};

export const DARK_COLORS = {
  // Fondos
  primary: "#0A0A12",
  secondary: "#12121C",
  surface: "#0F0F1A",
  cardBg: "#1A1A28",
  modalBg: "#1A1A28",

  // Texto
  text: "#FFFFFF",
  textSecondary: "#8A8A9A",
  textMuted: "#5A5A6A",
  textInverse: "#1A1A2E",

  // Bordes y divisores
  border: "#2A2A3A",
  divider: "#2A2A3A",

  // Acentos principales
  accent: "#0A84FF",
  accentLight: "#0A84FF25",

  // Colores semánticos
  success: "#00D9A5",
  successLight: "#00D9A520",
  successDark: "#00B894",

  danger: "#E94560",
  dangerLight: "#E9456020",
  dangerDark: "#D63851",

  warning: "#FFB800",
  warningLight: "#FFB80020",

  info: "#6C5CE7",
  infoLight: "#6C5CE720",

  // Colores específicos de TruckBook
  income: "#00D9A5",
  incomeLight: "#00D9A525",
  expense: "#E94560",
  expenseLight: "#E9456025",
  analytics: "#6C5CE7",
  analyticsLight: "#6C5CE725",

  // Placa colombiana
  plateYellow: "#FFE415",
  plateText: "#000000",
  plateBorder: "#000000",

  // Categorías de gastos
  catCombustible: "#FFB800",
  catPeajes: "#00D9A5",
  catComida: "#FF6B6B",
  catHospedaje: "#6C5CE7",
  catMantenimiento: "#74B9FF",
  catLlantas: "#A29BFE",
  catLavado: "#00CEC9",
  catParqueadero: "#FD79A8",
  catOtros: "#636E72",

  // Tipos de vehículo
  vehicleEstacas: "#00D9A5",
  vehicleVolqueta: "#FFB800",
  vehicleFurgon: "#6C5CE7",
  vehicleGrua: "#E94560",

  // Estados
  active: "#00D9A5",
  inactive: "#5A5A6A",

  // Sombras
  shadowColor: "#000000",
  shadowOpacity: 0.4,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.75)",
  overlayLight: "rgba(0, 0, 0, 0.5)",
};

// ============================================
// TIPOS
// ============================================

export type ThemeMode = "light" | "dark" | "system";
export type Colors = typeof LIGHT_COLORS;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ============================================
// CONTEXTO
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@truckbook_theme_mode";

// ============================================
// PROVIDER
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar preferencia guardada
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.log("Error loading theme preference:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemePreference();
  }, []);

  // Guardar preferencia cuando cambie
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.log("Error saving theme preference:", error);
    }
  };

  // Determinar si es modo oscuro
  const isDark =
    mode === "system" ? systemColorScheme === "dark" : mode === "dark";

  // Obtener colores según el tema
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Toggle entre claro y oscuro
  const toggleTheme = () => {
    const newMode = isDark ? "light" : "dark";
    setMode(newMode);
  };

  // No renderizar hasta que se cargue la preferencia
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{ mode, isDark, colors, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// ============================================
// UTILIDADES
// ============================================

// Función helper para crear estilos con colores
export const createThemedStyles = <T extends Record<string, any>>(
  styleFactory: (colors: Colors, isDark: boolean) => T,
) => {
  return (colors: Colors, isDark: boolean): T => styleFactory(colors, isDark);
};

// Constantes de espaciado
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Constantes de bordes
export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

// Constantes de tipografía
export const TYPOGRAPHY = {
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
};

// Sombras por tema
export const getShadow = (
  isDark: boolean,
  elevation: "sm" | "md" | "lg" = "md",
) => {
  const opacity = isDark ? 0.4 : 0.08;
  const shadows = {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: opacity,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 8,
      elevation: 8,
    },
  };
  return shadows[elevation];
};
