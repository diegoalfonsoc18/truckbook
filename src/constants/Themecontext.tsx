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
  // Fondos — blanco puro con superficies muy sutilmente cálidas
  primary: "#F8FAFC",
  secondary: "#EFEFED",
  surface: "#EDEDEB",
  cardBg: "#FFFFFF",
  modalBg: "#FFFFFF",

  // Texto — máximo contraste y jerarquía clara
  text: "#111827",
  textSecondary: "#6B6B6B",
  textMuted: "#AFAFAF",
  textInverse: "#FFFFFF",

  // Bordes — muy sutiles
  border: "#E4E4E2",
  divider: "#EBEBEB",

  // Acento — verde premium
  accent: "#0F172A",
  accentLight: "rgba(15, 23, 42, 0.10)",
  accentText: "#FFFFFF",
  accentGradient: ["#1E293B", "#020617"] as [string, string],

  // Semánticos
  success: "#22C55E",
  successLight: "rgba(34, 197, 94, 0.10)",
  successDark: "#16A34A",
  danger: "#EF4444",
  dangerLight: "rgba(239, 68, 68, 0.10)",
  dangerDark: "#DC2626",
  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.10)",
  info: "#6C5CE7",
  infoLight: "rgba(108, 92, 231, 0.10)",

  // TruckBook
  income: "#10B981",
  incomeLight: "rgba(16, 185, 129, 0.10)",
  expense: "#EF4444",
  expenseLight: "rgba(239, 68, 68, 0.10)",
  analytics: "#6C5CE7",
  analyticsLight: "rgba(108, 92, 231, 0.10)",

  // Placa
  plateYellow: "#FFE500",
  plateText: "#000000",
  plateBorder: "transparent",

  // Categorías
  catCombustible: "#F59E0B",
  catPeajes: "#10B981",
  catComida: "#F87171",
  catHospedaje: "#6C5CE7",
  catMantenimiento: "#60A5FA",
  catLlantas: "#A78BFA",
  catLavado: "#22D3EE",
  catParqueadero: "#F472B6",
  catOtros: "#9CA3AF",

  // Vehículos
  vehicleEstacas: "#10B981",
  vehicleVolqueta: "#F59E0B",
  vehicleFurgon: "#6C5CE7",
  vehicleGrua: "#EF4444",

  // Estados
  active: "#10B981",
  inactive: "#AFAFAF",

  // Sombras
  shadowColor: "#000000",
  shadowOpacity: 0.06,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.45)",
  overlayLight: "rgba(0, 0, 0, 0.2)",
};

export const DARK_COLORS = {
  // Fondos — negro puro con capas de profundidad
  primary: "#0A0A0A",
  secondary: "#141414",
  surface: "#1E1E1E",
  cardBg: "#161616",
  modalBg: "#1A1A1A",

  // Texto
  text: "#F5F5F5",
  textSecondary: "#8A8A8E",
  textMuted: "#4A4A4E",
  textInverse: "#000000",

  // Bordes — sutiles pero presentes
  border: "#2A2A2A",
  divider: "#222222",

  // Acento — verde premium
  accent: "#2ECC71",
  accentLight: "rgba(46, 204, 113, 0.14)",
  accentText: "#000000",
  accentGradient: ["#4ADE80", "#16A34A"] as [string, string],

  // Semánticos
  success: "#30D158",
  successLight: "rgba(48, 209, 88, 0.12)",
  successDark: "#25A244",
  danger: "#FF453A",
  dangerLight: "rgba(255, 69, 58, 0.12)",
  dangerDark: "#D63030",
  warning: "#FFD60A",
  warningLight: "rgba(255, 214, 10, 0.12)",
  info: "#7C6FF0",
  infoLight: "rgba(124, 111, 240, 0.12)",

  // TruckBook
  income: "#30D158",
  incomeLight: "rgba(48, 209, 88, 0.12)",
  expense: "#FF453A",
  expenseLight: "rgba(255, 69, 58, 0.12)",
  analytics: "#7C6FF0",
  analyticsLight: "rgba(124, 111, 240, 0.12)",

  // Placa
  plateYellow: "#FFD60A",
  plateText: "#000000",
  plateBorder: "transparent",

  // Categorías
  catCombustible: "#FFD60A",
  catPeajes: "#30D158",
  catComida: "#FF6B6B",
  catHospedaje: "#7C6FF0",
  catMantenimiento: "#5AC8FA",
  catLlantas: "#BF5AF2",
  catLavado: "#32D2D9",
  catParqueadero: "#FF375F",
  catOtros: "#636E72",

  // Vehículos
  vehicleEstacas: "#30D158",
  vehicleVolqueta: "#FFD60A",
  vehicleFurgon: "#7C6FF0",
  vehicleGrua: "#FF453A",

  // Estados
  active: "#30D158",
  inactive: "#4A4A4E",

  // Sombras
  shadowColor: "#000000",
  shadowOpacity: 0.5,

  // Overlays
  overlay: "rgba(0, 0, 0, 0.80)",
  overlayLight: "rgba(0, 0, 0, 0.55)",
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

  // LIGHT ONLY — dark mode desactivado hasta v2
  const isDark = false;
  const colors = LIGHT_COLORS;

  // Toggle desactivado temporalmente (dark mode v2)
  const toggleTheme = () => {};

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
