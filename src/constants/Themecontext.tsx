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
  primary: "#F4F3EF",
  secondary: "#F0EFEB",
  surface: "#F0EFEB",
  cardBg: "#FFFFFF",
  modalBg: "#FFFFFF",

  // Texto
  text: "#1A1A1A",
  textSecondary: "#7A7A7A",
  textMuted: "#ABABAB",
  textInverse: "#FFFFFF",

  // Bordes
  border: "#E8E7E3",
  divider: "#E8E7E3",

  // Acentos
  accent: "#FFE500",
  accentLight: "#FFF9D6",
  accentText: "#000000",

  // Semánticos
  success: "#34C759",
  successLight: "#E6FBF5",
  successDark: "#00B894",
  danger: "#E94560",
  dangerLight: "#FDE8EC",
  dangerDark: "#D63851",
  warning: "#FFB800",
  warningLight: "#FFF5D6",
  info: "#6C5CE7",
  infoLight: "#EEECFB",

  // TruckBook
  income: "#00D9A5",
  incomeLight: "#E6FBF5",
  expense: "#E94560",
  expenseLight: "#FDE8EC",
  analytics: "#6C5CE7",
  analyticsLight: "#EEECFB",

  // Placa
  plateYellow: "#FFE500",
  plateText: "#000000",
  plateBorder: "transparent",

  // Categorías
  catCombustible: "#FFB800",
  catPeajes: "#00D9A5",
  catComida: "#FF6B6B",
  catHospedaje: "#6C5CE7",
  catMantenimiento: "#74B9FF",
  catLlantas: "#A29BFE",
  catLavado: "#00CEC9",
  catParqueadero: "#FD79A8",
  catOtros: "#636E72",

  // Vehículos
  vehicleEstacas: "#00D9A5",
  vehicleVolqueta: "#FFB800",
  vehicleFurgon: "#6C5CE7",
  vehicleGrua: "#E94560",

  // Estados
  active: "#00D9A5",
  inactive: "#ABABAB",

  // Sombras
  shadowColor: "#000000",
  shadowOpacity: 0.06,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.4)",
  overlayLight: "rgba(0, 0, 0, 0.2)",
};

export const DARK_COLORS = {
  // Fondos
  primary: "#000000",
  secondary: "#1C1C1E",
  surface: "#2C2C2E",
  cardBg: "#1C1C1E",
  modalBg: "#1C1C1E",

  // Texto
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  textMuted: "#5A5A5C",
  textInverse: "#000000",

  // Bordes
  border: "#3A3A3C",
  divider: "#3A3A3C",

  // Acentos
  accent: "#FFE500",
  accentLight: "rgba(255, 229, 0, 0.15)",
  accentText: "#000000",

  // Semánticos
  success: "#34C759",
  successLight: "rgba(52, 199, 89, 0.15)",
  successDark: "#00B894",
  danger: "#E94560",
  dangerLight: "rgba(233, 69, 96, 0.15)",
  dangerDark: "#D63851",
  warning: "#FFB800",
  warningLight: "rgba(255, 184, 0, 0.15)",
  info: "#6C5CE7",
  infoLight: "rgba(108, 92, 231, 0.15)",

  // TruckBook
  income: "#00D9A5",
  incomeLight: "rgba(0, 217, 165, 0.15)",
  expense: "#E94560",
  expenseLight: "rgba(233, 69, 96, 0.15)",
  analytics: "#6C5CE7",
  analyticsLight: "rgba(108, 92, 231, 0.15)",

  // Placa
  plateYellow: "#FFE500",
  plateText: "#000000",
  plateBorder: "transparent",

  // Categorías
  catCombustible: "#FFB800",
  catPeajes: "#00D9A5",
  catComida: "#FF6B6B",
  catHospedaje: "#6C5CE7",
  catMantenimiento: "#74B9FF",
  catLlantas: "#A29BFE",
  catLavado: "#00CEC9",
  catParqueadero: "#FD79A8",
  catOtros: "#636E72",

  // Vehículos
  vehicleEstacas: "#00D9A5",
  vehicleVolqueta: "#FFB800",
  vehicleFurgon: "#6C5CE7",
  vehicleGrua: "#E94560",

  // Estados
  active: "#00D9A5",
  inactive: "#5A5A5C",

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
